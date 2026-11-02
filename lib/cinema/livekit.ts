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
 * Permissions follow both the caller's explicit preference (wantVideo /
 * wantAudio) and the room's communication mode:
 * - MOVIE_ONLY   → no token (this function rejects).
 * - VOICE        → audio publish allowed, video denied.
 * - VOICE_VIDEO  → audio + video publish allowed.
 *
 * Hosts and guests are equal here: everyone can publish only what the room
 * mode allows and only their own tracks.
 */
export function createLiveKitToken({
  roomId,
  identity,
  name,
  mode,
  canVideo,
}: {
  roomId: string;
  identity: string;
  name: string;
  mode: RoomMode;
  canVideo: boolean;
}) {
  if (!isLiveKitConfigured()) {
    throw new Error("LiveKit is not configured");
  }
  if (mode === "MOVIE_ONLY") {
    throw new Error("This room does not enable voice or video");
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
  const publishSources: TrackSource[] = [TrackSource.MICROPHONE];
  if (mode === "VOICE_VIDEO" && canVideo) {
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