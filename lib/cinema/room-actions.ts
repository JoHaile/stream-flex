"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { auth, type Session } from "@/lib/auth";
import { generateInviteToken, generateRoomCode, hashInviteToken } from "@/lib/cinema/ids";
import {
  isAblyConfigured,
  getAblyRest,
  publishPlayback,
  publishChatMessage,
  publishReaction,
  roomCapabilities,
} from "@/lib/cinema/realtime";
import { isLiveKitConfigured, createLiveKitToken, livekitRoomName } from "@/lib/cinema/livekit";
import {
  CHAT_HISTORY_LIMIT,
  CHAT_MAX_LENGTH,
  INVITE_TOKEN_TTL_MS,
  MAX_CAPACITY,
  MIN_CAPACITY,
  PLAYBACK_ACTIONS,
  type ChatMessage,
  type PlaybackAction,
  type PlaybackState,
  type RoomCreatedResult,
  type RoomDetails,
  type RoomInvitePreview,
  type RoomMode,
  type RoomRole,
} from "@/lib/cinema/types";

// ---------------------------------------------------------------------------
// Results & helpers
// ---------------------------------------------------------------------------

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };

function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

function fail(message: string, code = "ERROR"): ActionResult<never> {
  return { ok: false, error: message, code };
}

/**
 * Lightweight per-process rate limiter for room mutations. On serverless
 * deployments this resets per warm instance (documented limitation — better
 * than nothing, tuned to be generous).
 */
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

function assertRateLimit(key: string, windowMs: number, max: number) {
  const now = Date.now();
  const bucket = rateLimitBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  if (bucket.count >= max) {
    throw new RateLimitError();
  }
  bucket.count += 1;
}

class RateLimitError extends Error {
  constructor() {
    super("Too many requests. Please try again later.");
    this.name = "RateLimitError";
  }
}

async function requireUser() {
  const session: Session | null = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) {
    throw new AuthRequiredError();
  }
  return session.user;
}

class AuthRequiredError extends Error {
  constructor() {
    super("You must be signed in to do that.");
    this.name = "AuthRequiredError";
  }
}

const ROOM_MODES: RoomMode[] = ["MOVIE_ONLY", "VOICE", "VOICE_VIDEO"];

function parseRoomMode(value: unknown): RoomMode | null {
  return typeof value === "string" && (ROOM_MODES as string[]).includes(value)
    ? (value as RoomMode)
    : null;
}

function parsePositiveInt(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.trunc(n);
}

function parsePosition(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 86400) return null;
  return Math.round(n * 100) / 100;
}

function serializeDate(d: Date) {
  return d.toISOString();
}

export type RoomMemberDto = { id: string; name: string; role: RoomRole };

function toPlaybackState(room: {
  isPlaying: boolean;
  positionSeconds: number;
  stateVersion: number;
  stateUpdatedAt: Date;
}): PlaybackState {
  return {
    isPlaying: room.isPlaying,
    positionSeconds: room.positionSeconds,
    stateVersion: room.stateVersion,
    stateUpdatedAt: serializeDate(room.stateUpdatedAt),
  };
}

// ---------------------------------------------------------------------------
// Room creation
// ---------------------------------------------------------------------------

export async function createRoom(input: {
  name?: string;
  capacity: unknown;
  mode: unknown;
  movieId: unknown;
  movieTitle: unknown;
}): Promise<ActionResult<RoomCreatedResult>> {
  try {
    const user = await requireUser();
    assertRateLimit(`create:${user.id}`, 60_000, 5);

    const capacity = parsePositiveInt(input.capacity);
    if (!capacity || capacity < MIN_CAPACITY || capacity > MAX_CAPACITY) {
      return fail(
        `Capacity must be between ${MIN_CAPACITY} and ${MAX_CAPACITY}.`,
        "INVALID_CAPACITY",
      );
    }
    const mode = parseRoomMode(input.mode);
    if (!mode) return fail("Invalid room mode.", "INVALID_MODE");

    const movieId = typeof input.movieId === "string" ? input.movieId.trim() : "";
    const movieTitle =
      typeof input.movieTitle === "string" ? input.movieTitle.trim() : "";
    if (!movieId) return fail("Please choose a movie.", "INVALID_MOVIE");

    const name =
      typeof input.name === "string" && input.name.trim()
        ? input.name.trim().slice(0, 80)
        : `${user.name ?? "Someone"}'s Cinema`;

    const inviteToken = generateInviteToken();
    const expiresAt = new Date(Date.now() + INVITE_TOKEN_TTL_MS);

    let createdRoom: { id: string; code: string } | null = null;
    // The code is random but collisions are still possible; retry a few times.
    for (let attempt = 0; attempt < 5 && !createdRoom; attempt++) {
      const candidate = generateRoomCode();
      try {
        createdRoom = await db.$transaction(async (tx) => {
          const room = await tx.cinemaRoom.create({
            data: {
              code: candidate,
              name,
              hostId: user.id,
              movieId,
              movieTitle,
              capacity,
              mode,
              memberships: {
                create: { userId: user.id, role: "HOST" },
              },
              invitations: {
                create: {
                  tokenHash: hashInviteToken(inviteToken),
                  expiresAt,
                },
              },
            },
            select: { id: true, code: true },
          });
          return room;
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          continue; // code collision — retry
        }
        throw error;
      }
    }

    if (!createdRoom) return fail("Could not create the room. Please try again.");

    return ok({
      code: createdRoom.code,
      inviteToken,
      inviteUrl: buildInviteUrl(createdRoom.code, inviteToken),
      roomId: createdRoom.id,
    });
  } catch (error) {
    return handleError(error);
  }
}

function buildInviteUrl(code: string, token: string) {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ??
    "http://localhost:3000";
  return `${base}/cinema/join/${encodeURIComponent(code)}?t=${encodeURIComponent(token)}`;
}

const REACTION_EMOJIS = ["\u{1F44D}", "\u{2764}", "\u{1F602}", "\u{1F62E}", "\u{1F525}"];

/**
 * Publish a watch-party reaction to the room's Ably channel. The client-side
 * token only allows subscribe/presence, so reactions are validated and
 * published server-side (no client publish rights on the room channel).
 */
export async function sendReaction(
  roomId: string,
  emoji: unknown,
): Promise<ActionResult<null>> {
  try {
    const user = await requireUser();
    assertRateLimit(`reaction:${user.id}`, 30_000, 20);
    if (!REACTION_EMOJIS.includes(emoji as string)) {
      return fail("Unknown reaction.", "INVALID_REACTION");
    }
    const membership = await db.roomMembership.findUnique({
      where: { roomId_userId: { roomId, userId: user.id } },
    });
    if (!membership) return fail("You are not part of this room.", "NOT_MEMBER");
    if (!isAblyConfigured()) return fail("Reactions need realtime.", "NOT_CONFIGURED");

    await publishReaction(roomId, {
      type: "reaction",
      emoji: emoji as string,
      name: user.name ?? "Guest",
      id: user.id,
      at: new Date().toISOString(),
    });
    return ok(null);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * Post a chat message to the room. Persisted in Postgres (late joiners and
 * polling-mode clients see history) and fanned out over Ably when available.
 */
export async function sendChatMessage(
  roomId: string,
  body: unknown,
): Promise<ActionResult<ChatMessage>> {
  try {
    const user = await requireUser();
    const text = typeof body === "string" ? body.trim() : "";
    if (!text) return fail("Write a message first.", "INVALID_MESSAGE");
    if (text.length > CHAT_MAX_LENGTH) {
      return fail(
        `Messages are limited to ${CHAT_MAX_LENGTH} characters.`,
        "INVALID_MESSAGE",
      );
    }
    assertRateLimit(`chat:${user.id}`, 10_000, 8);

    const membership = await db.roomMembership.findUnique({
      where: { roomId_userId: { roomId, userId: user.id } },
      include: { room: { select: { status: true } } },
    });
    if (!membership) return fail("You are not part of this room.", "NOT_MEMBER");
    if (membership.room.status !== "OPEN") {
      return fail("This room is closed.", "ROOM_CLOSED");
    }

    const saved = await db.roomMessage.create({
      data: { roomId, userId: user.id, body: text },
    });
    const message: ChatMessage = {
      id: saved.id,
      userId: user.id,
      name: user.name ?? "Guest",
      body: saved.body,
      at: saved.createdAt.toISOString(),
    };

    if (isAblyConfigured()) {
      await publishChatMessage(roomId, {
        type: "chat",
        ...message,
        roomId,
      }).catch(() => {});
    }

    return ok(message);
  } catch (error) {
    return handleError(error);
  }
}

/** Recent chat history — used by polling clients and manual catch-up. */
export async function getChatMessages(
  roomId: string,
  limit = 30,
): Promise<ActionResult<ChatMessage[]>> {
  try {
    const user = await requireUser();
    const membership = await db.roomMembership.findUnique({
      where: { roomId_userId: { roomId, userId: user.id } },
    });
    if (!membership) return fail("You are not part of this room.", "NOT_MEMBER");

    const take = Math.min(Math.max(limit, 1), CHAT_HISTORY_LIMIT);
    const rows = await db.roomMessage.findMany({
      where: { roomId },
      orderBy: { createdAt: "desc" },
      take,
      include: { user: { select: { name: true } } },
    });
    return ok(rows.reverse().map(toChatMessage));
  } catch (error) {
    return handleError(error);
  }
}

/**
 * Issue a fresh host-only invite link. Guests pick the code up from the room
 * header; only the host can mint revocable token links here.
 */
export async function createInviteLink(
  roomId: string,
): Promise<ActionResult<{ token: string; url: string }>> {
  try {
    const user = await requireUser();
    assertRateLimit(`invite:${user.id}`, 60_000, 10);
    const membership = await db.roomMembership.findUnique({
      where: { roomId_userId: { roomId, userId: user.id } },
      include: { room: { select: { code: true } } },
    });
    if (!membership) return fail("You are not part of this room.", "NOT_MEMBER");
    if (membership.role !== "HOST") {
      return fail("Only the host can create invite links.", "FORBIDDEN");
    }
    const token = generateInviteToken();
    await db.roomInvitation.create({
      data: {
        roomId,
        tokenHash: hashInviteToken(token),
        expiresAt: new Date(Date.now() + INVITE_TOKEN_TTL_MS),
      },
    });
    return ok({ token, url: buildInviteUrl(membership.room.code, token) });
  } catch (error) {
    return handleError(error);
  }
}

export async function getRoomByCode(
  code: string,
): Promise<ActionResult<RoomInvitePreview>> {
  try {
    const room = await db.cinemaRoom.findUnique({
      where: { code: code.trim().toUpperCase() },
      include: {
        host: { select: { name: true, image: true } },
        memberships: {
          orderBy: { joinedAt: "asc" },
          take: 6,
          select: {
            userId: true,
            role: true,
            user: { select: { name: true, image: true } },
          },
        },
        _count: { select: { memberships: true } },
      },
    });
    if (!room) return fail("That room does not exist.", "NOT_FOUND");

    return ok({
      code: room.code,
      name: room.name,
      movieId: room.movieId,
      movieTitle: room.movieTitle,
      mode: room.mode,
      status: room.status,
      capacity: room.capacity,
      members: room._count.memberships,
      hostName: room.host.name ?? "the host",
      hostImage: room.host.image ?? null,
      participants: room.memberships.map((m) => ({
        id: m.userId,
        name: m.user.name ?? "Guest",
        role: m.role,
        image: m.user.image ?? null,
      })),
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function joinRoom(input: {
  code: unknown;
  token: unknown;
}): Promise<ActionResult<{ roomId: string }>> {
  try {
    const user = await requireUser();
    assertRateLimit(`join:${user.id}`, 60_000, 15);

    const code = typeof input.code === "string" ? input.code.trim().toUpperCase() : "";
    const token = typeof input.token === "string" ? input.token.trim() : "";
    if (!code) {
      return fail("This invitation link is incomplete.", "INVALID_LINK");
    }

    const room = await db.cinemaRoom.findUnique({ where: { code } });
    if (!room) return fail("That room does not exist.", "NOT_FOUND");
    if (room.status !== "OPEN") {
      return fail("This cinema room is closed.", "ROOM_CLOSED");
    }

    // The invite token is a convenience (7-day expiry, revocable). It is
    // optional — sharing the room code alone also grants access, which keeps
    // the copyable-code flow simple. Raw tokens are never stored.
    let invitation = null;
    if (token) {
      invitation = await db.roomInvitation.findFirst({
        where: { roomId: room.id, tokenHash: hashInviteToken(token) },
      });
      if (!invitation || invitation.revokedAt) {
        return fail("This invitation is no longer valid.", "INVALID_INVITE");
      }
      if (invitation.expiresAt < new Date()) {
        return fail("This invitation has expired.", "INVITE_EXPIRED");
      }
    }

    const membership = await db.roomMembership.findUnique({
      where: { roomId_userId: { roomId: room.id, userId: user.id } },
    });
    if (membership) {
      // Already a member — idempotent re-join (e.g. after a reconnect).
      return ok({ roomId: room.id });
    }

    // Race-safe admission: lock the room row, recount seats, insert if free.
    try {
      await db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "cinema_room" WHERE id = ${room.id} FOR UPDATE`;
        const seats = await tx.roomMembership.count({ where: { roomId: room.id } });
        if (seats >= room.capacity) {
          throw new RoomFullError();
        }
        await tx.roomMembership.create({
          data: { roomId: room.id, userId: user.id, role: "GUEST" },
        });
      });
    } catch (error) {
      if (error instanceof RoomFullError) {
        return fail(
          "This room is full. Ask the host to free a seat.",
          "ROOM_FULL",
        );
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return ok({ roomId: room.id }); // lost a race with an identical join
      }
      throw error;
    }

    return ok({ roomId: room.id });
  } catch (error) {
    return handleError(error);
  }
}

class RoomFullError extends Error {
  constructor() {
    super("Room is full");
    this.name = "RoomFullError";
  }
}

export async function leaveRoom(roomId: string): Promise<ActionResult<null>> {
  try {
    const user = await requireUser();
    const membership = await db.roomMembership.findUnique({
      where: { roomId_userId: { roomId, userId: user.id } },
      include: { room: true },
    });
    if (!membership) return fail("You are not in this room.", "NOT_MEMBER");

    const { role } = membership;
    await db.$transaction(async (tx) => {
      await tx.roomMembership.delete({
        where: { roomId_userId: { roomId, userId: user.id } },
      });
      if (role === "HOST") {
        // No host, no room — close it so guests can't watch "alone".
        // Chat is ephemeral: drop the messages with the room.
        await tx.roomMessage.deleteMany({ where: { roomId } });
        await tx.cinemaRoom.update({
          where: { id: roomId },
          data: { status: "CLOSED" },
        });
      }
    });

    // Best-effort presence refresh for remaining members.
    const remaining = await db.roomMembership.count({ where: { roomId } });
    if (isAblyConfigured() && remaining > 0) {
      await publishPlayback(roomId, { type: "members", members: remaining }).catch(
        () => {},
      );
    }

    return ok(null);
  } catch (error) {
    return handleError(error);
  }
}

// ---------------------------------------------------------------------------
// Room page data (member-only)
// ---------------------------------------------------------------------------

type RoomMessageRow = {
  id: string;
  userId: string;
  body: string;
  createdAt: Date;
  user: { name: string | null };
};

function toChatMessage(row: RoomMessageRow): ChatMessage {
  return {
    id: row.id,
    userId: row.userId,
    name: row.user.name ?? "Guest",
    body: row.body,
    at: row.createdAt.toISOString(),
  };
}

/** Latest chat messages, oldest first (so the list renders top → bottom). */
async function recentMessages(roomId: string, limit = 30): Promise<ChatMessage[]> {
  const rows = await db.roomMessage.findMany({
    where: { roomId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { user: { select: { name: true } } },
  });
  return rows.reverse().map(toChatMessage);
}

async function getMembershipWithRoom(roomId: string, userId: string) {
  return db.roomMembership.findUnique({
    where: { roomId_userId: { roomId, userId } },
    include: {
      room: {
        include: {
          host: { select: { name: true } },
          memberships: { include: { user: { select: { name: true } } } },
          _count: { select: { memberships: true } },
        },
      },
    },
  });
}

export async function getRoomDetails(
  roomId: string,
): Promise<ActionResult<RoomDetails>> {
  try {
    const user = await requireUser();
    const membership = await getMembershipWithRoom(roomId, user.id);
    if (!membership) return fail("You are not part of this room.", "NOT_MEMBER");

    const room = membership.room;
    return ok({
      id: room.id,
      code: room.code,
      name: room.name,
      movieId: room.movieId,
      movieTitle: room.movieTitle,
      mode: room.mode,
      status: room.status,
      capacity: room.capacity,
      members: room._count.memberships,
      hostName: room.host.name ?? "the host",
      isHost: membership.role === "HOST",
      myRole: membership.role,
      playback: toPlaybackState(room),
      participants: room.memberships.map((m) => ({
        id: m.userId,
        name: m.user.name ?? "Guest",
        role: m.role,
      })),
      messages: await recentMessages(room.id),
      realtimeConfigured: isAblyConfigured(),
      livekitConfigured: isLiveKitConfigured(),
    });
  } catch (error) {
    return handleError(error);
  }
}

/**
 * Resolves an invite code to the caller's membership and returns full room
 * details. Unlike getRoomDetails (roomId based), this works from the share
 * code used in room URLs.
 */
export async function getRoomDetailsByCode(
  code: string,
): Promise<ActionResult<RoomDetails>> {
  try {
    const user = await requireUser();
    const roomCode = code.trim().toUpperCase();
    const room = await db.cinemaRoom.findUnique({
      where: { code: roomCode },
      select: {
        id: true,
        memberships: { where: { userId: user.id }, select: { role: true } },
      },
    });
    if (!room) return fail("This room does not exist.", "NOT_FOUND");
    if (room.memberships.length === 0) {
      return fail("Join this room first.", "NOT_MEMBER");
    }
    const membership = await getMembershipWithRoom(room.id, user.id);
    if (!membership) return fail("You are not part of this room.", "NOT_MEMBER");

    const r = membership.room;
    return ok({
      id: r.id,
      code: r.code,
      name: r.name,
      movieId: r.movieId,
      movieTitle: r.movieTitle,
      mode: r.mode,
      status: r.status,
      capacity: r.capacity,
      members: r._count.memberships,
      hostName: r.host.name ?? "the host",
      isHost: membership.role === "HOST",
      myRole: membership.role,
      playback: toPlaybackState(r),
      participants: r.memberships.map((m) => ({
        id: m.userId,
        name: m.user.name ?? "Guest",
        role: m.role,
      })),
      messages: await recentMessages(r.id),
      realtimeConfigured: isAblyConfigured(),
      livekitConfigured: isLiveKitConfigured(),
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function getPlaybackState(
  roomId: string,
): Promise<ActionResult<PlaybackState & { status: string }>> {
  try {
    const user = await requireUser();
    const membership = await db.roomMembership.findUnique({
      where: { roomId_userId: { roomId, userId: user.id } },
      include: { room: { select: { isPlaying: true, positionSeconds: true, stateVersion: true, stateUpdatedAt: true, status: true } } },
    });
    if (!membership) return fail("You are not part of this room.", "NOT_MEMBER");

    return ok({ ...toPlaybackState(membership.room), status: membership.room.status });
  } catch (error) {
    return handleError(error);
  }
}

// ---------------------------------------------------------------------------
// Host-only playback commands
// ---------------------------------------------------------------------------

export async function hostPlaybackCommand(
  roomId: string,
  input: { action: unknown; positionSeconds?: unknown },
): Promise<ActionResult<PlaybackState>> {
  try {
    const user = await requireUser();

    const action = input.action;
    if (!PLAYBACK_ACTIONS.includes(action as PlaybackAction)) {
      return fail("Unknown playback action.", "INVALID_ACTION");
    }

    let positionSeconds: number | null = null;
    if (input.positionSeconds !== undefined) {
      positionSeconds = parsePosition(input.positionSeconds);
      if (positionSeconds === null) {
        return fail("Invalid playback position.", "INVALID_POSITION");
      }
    }

    const membership = await db.roomMembership.findUnique({
      where: { roomId_userId: { roomId, userId: user.id } },
    });
    if (!membership) return fail("You are not part of this room.", "NOT_MEMBER");
    if (membership.role !== "HOST") {
      return fail("Only the host can control playback.", "FORBIDDEN");
    }

    const room = await db.cinemaRoom.findUnique({ where: { id: roomId } });
    if (!room || room.status !== "OPEN") {
      return fail("This room is closed.", "ROOM_CLOSED");
    }

    let isPlaying = room.isPlaying;
    let nextPosition = room.positionSeconds;
    if (action === "play") isPlaying = true;
    if (action === "pause") isPlaying = false;
    if (action === "seek" && positionSeconds !== null) nextPosition = positionSeconds;
    if ((action === "play" || action === "pause") && positionSeconds !== null) {
      nextPosition = positionSeconds;
    }

    const now = new Date();
    const updated = await db.cinemaRoom.update({
      where: { id: roomId },
      data: {
        isPlaying,
        positionSeconds: nextPosition,
        stateVersion: { increment: 1 },
        stateUpdatedAt: now,
      },
      select: {
        isPlaying: true,
        positionSeconds: true,
        stateVersion: true,
        stateUpdatedAt: true,
      },
    });

    const state = toPlaybackState(updated);
    // Publish to the room channel; if Ably is not configured the event is
    // simply not broadcast (clients fall back to polling this same state).
    if (isAblyConfigured()) {
      try {
        await publishPlayback(roomId, { type: "playback", ...state });
      } catch (error) {
        console.error("[cinema] playback publish failed", error);
      }
    }
    revalidatePath(`/cinema/room/${room.code ?? ""}`);

    return ok(state);
  } catch (error) {
    return handleError(error);
  }
}

// ---------------------------------------------------------------------------
// Realtime / media tokens (short-lived, scoped, member-checked)
// ---------------------------------------------------------------------------

export async function getAblyTokenRequest(
  roomId: string,
): Promise<ActionResult<{ tokenRequest: unknown; channel: string; capability: Record<string, string[]> }>> {
  try {
    const user = await requireUser();
    if (!isAblyConfigured()) return fail("Realtime is not configured.", "NOT_CONFIGURED");

    const membership = await db.roomMembership.findUnique({
      where: { roomId_userId: { roomId, userId: user.id } },
    });
    if (!membership) return fail("You are not part of this room.", "NOT_MEMBER");

    // Guest ability to control playback is enforced server-side regardless of
    // channel capabilities: nobody gets client publish rights on this channel.
    const capability = roomCapabilities(roomId);
    const ably = getAblyRest();
    if (!ably) return fail("Realtime is not configured.", "NOT_CONFIGURED");

    const tokenRequest = await ably.auth.createTokenRequest({
      clientId: user.id,
      capability: capability as never,
      ttl: 60 * 60 * 1000, // 1 hour
    });
    return ok({ tokenRequest, channel: `cinema:${roomId}`, capability });
  } catch (error) {
    return handleError(error);
  }
}

function livekitIdentity(userId: string) {
  return `sf-${userId}`;
}

export async function getLiveKitToken(
  roomId: string,
  opts: { wantAudio?: boolean; wantVideo?: boolean; wantMic?: boolean },
): Promise<
  ActionResult<{ token: string; url: string; room: string }>
> {
  try {
    const user = await requireUser();
    if (!isLiveKitConfigured()) {
      return fail("Voice/video is not configured yet.", "NOT_CONFIGURED");
    }

    const membership = await db.roomMembership.findUnique({
      where: { roomId_userId: { roomId, userId: user.id } },
      include: { room: { select: { mode: true } } },
    });
    if (!membership) return fail("You are not part of this room.", "NOT_MEMBER");
    if (membership.room.mode === "MOVIE_ONLY") {
      return fail("This room is movie-only.", "MOVIE_ONLY");
    }

    // Video is only ever negotiable in VOICE_VIDEO rooms. Audio is always
    // allowed as a ceiling so a muted joiner can unmute later.
    const wantVideo =
      Boolean(opts.wantVideo) && membership.room.mode === "VOICE_VIDEO";
    const wantAudio = opts.wantAudio !== false;

    const token = await createLiveKitToken({
      roomId,
      identity: livekitIdentity(user.id),
      name: user.name ?? "Guest",
      mode: membership.room.mode,
      wantAudio,
      wantVideo,
    });
    // The wss server URL is not a secret (the signed token is what grants
    // access); the client needs it to call Room.connect(url, token).
    const url = process.env.LIVEKIT_URL?.replace(/\/+$/, "");
    if (!url) return fail("Voice/video is not configured yet.", "NOT_CONFIGURED");
    return ok({ token, url, room: livekitRoomName(roomId) });
  } catch (error) {
    return handleError(error);
  }
}

// ---------------------------------------------------------------------------
// Error mapping (never leak internals to the client)
// ---------------------------------------------------------------------------

function handleError(error: unknown): ActionResult<never> {
  if (error instanceof AuthRequiredError) {
    return fail(
      "You must be signed in to do that.",
      "AUTH_REQUIRED",
    );
  }
  if (error instanceof RateLimitError) {
    return fail(error.message, "RATE_LIMITED");
  }
  if (error instanceof Error && error.name === "PrismaClientKnownRequestError") {
    return fail("Something went wrong on our side. Please try again.");
  }
  console.error("[cinema] unexpected error", error);
  return fail("Something went wrong. Please try again.");
}