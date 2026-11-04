import "server-only";

import Ably from "ably";

// Server-side Ably: used to publish authoritative playback events and room
// presence changes from server actions. The raw API key never leaves the
// server; clients authenticate with short-lived scoped tokens issued by
// /api/cinema/ably-token.

let rest: Ably.Rest | null = null;

export function isAblyConfigured() {
  return Boolean(process.env.ABLY_KEY);
}

export function getAblyRest(): Ably.Rest | null {
  if (!isAblyConfigured()) return null;
  if (!rest) {
    rest = new Ably.Rest({ key: process.env.ABLY_KEY });
  }
  return rest;
}

export function roomChannelName(roomId: string) {
  return `cinema:${roomId}`;
}

/** Shared playback event published to all participants of a room. */
export interface PlaybackEvent {
  type: "playback";
  isPlaying: boolean;
  positionSeconds: number;
  stateVersion: number;
  stateUpdatedAt: string;
}

/** Presence refresh event (member joined/left/closed). */
export interface RoomMetaEvent {
  type: "members";
  members: number;
}

/** A watch-party reaction (emoji burst). */
export interface ReactionEvent {
  type: "reaction";
  emoji: string;
  name: string;
  id: string;
  at: string;
}

/** A watch-party chat message. */
export interface ChatMessageEvent {
  type: "chat";
  id: string;
  roomId: string;
  userId: string;
  name: string;
  body: string;
  at: string;
}

export type RoomChannelEvent = PlaybackEvent | RoomMetaEvent;

export async function publishPlayback(roomId: string, event: RoomChannelEvent) {
  const ably = getAblyRest();
  if (!ably) return false;
  // Event name must match what clients subscribe to (PLAYBACK_EVENT).
  await ably.channels.get(roomChannelName(roomId)).publish("playback", event);
  return true;
}

export async function publishReaction(roomId: string, event: ReactionEvent) {
  const ably = getAblyRest();
  if (!ably) return false;
  await ably.channels.get(roomChannelName(roomId)).publish("reaction", event);
  return true;
}

/**
 * Publish a chat message to the room channel. Saves + publishes happen in
 * the caller (server action); this is the Ably-only fan-out step.
 */
export async function publishChatMessage(
  roomId: string,
  event: ChatMessageEvent,
) {
  const ably = getAblyRest();
  if (!ably) return false;
  await ably.channels.get(roomChannelName(roomId)).publish("chat", event);
  return true;
}

/** Generates a capability spec scoped to a single room channel. */
export function roomCapabilities(roomId: string): Record<string, string[]> {
  return {
    [roomChannelName(roomId)]: ["subscribe", "presence"],
  };
}