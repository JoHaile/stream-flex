import "server-only";

import { AccessToken, TrackSource } from "livekit-server-sdk";
import type { RoomMode } from "@/lib/cinema/types";

export function isLiveKitConfigured() {
  return Boolean(
    process.env.LIVEKIT_URL &&
      process.env.LIVEKIT_API_KEY &&
      process.env.LIVEKIT_API_SECRET,
  );
}

export function livekitRoomName(roomId: string) {
  return `cinema-${roomId}`;
}

/**
 * Issues a LiveKit access token for a participant of a cinema room.
 *
 * The token's publish sources are a *ceiling* derived from the room's
 * communication mode, not from the caller's pre-join preference:
 * - MOVIE_ONLY   → no token (this function rejects).
 * - VOICE        → microphone publish allowed, camera denied.
 * - VOICE_VIDEO  → microphone + camera publish allowed.
 *
 * This keeps the joiner in control *during* the call: a guest who joins as
 * audio-only (or even "just watching") can still flip their camera or mic on
 * later without asking for a new token. The room layer (CallPanel) decides
 * which sources are actually enabled at connect time and on every toggle.
 *
 * wantAudio / wantVideo are validated by the caller (getLiveKitToken) so a
 * VOICE room can never request camera, and MOVIE_ONLY is rejected here.
 * Hosts and guests are equal: everyone can publish only what the room mode
 * allows and only their own tracks.
 */
export function createLiveKitToken({
  roomId,
  identity,
  name,
  mode,
  wantAudio = true,
  wantVideo = false,
}: {
  roomId: string;
  identity: string;
  name: string;
  mode: RoomMode;
  wantAudio: boolean;
  wantVideo: boolean;
}) {
  if (!isLiveKitConfigured()) {
    throw new Error("LiveKit is not configured");
  }
  if (mode === "MOVIE_ONLY") {
    throw new Error("This room does not enable voice or video");
  }
  if (wantVideo && mode !== "VOICE_VIDEO") {
    throw new Error("This room does not allow video");
  }

  const at = new AccessToken(
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!,
    {
      identity,
      name,
      ttl: "6h",
    },
  );

  // Ceiling grants (see doc comment above). wantAudio/wantVideo are accepted
  // for validation but must not shrink the grant, or a guest who joined
  // audio-only could never unmute mid-call.
  const publishSources: TrackSource[] = [];
  if (wantAudio) {
    publishSources.push(TrackSource.MICROPHONE);
  }
  if (mode === "VOICE_VIDEO") {
    publishSources.push(TrackSource.CAMERA);
  }
  at.addGrant({
    room: livekitRoomName(roomId),
    roomJoin: true,
    canPublish: true,
    canPublishSources: publishSources,
    canPublishData: true,
    canSubscribe: true,
  });

  return at.toJwt();
}