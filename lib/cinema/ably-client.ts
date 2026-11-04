"use client";

import * as Ably from "ably";
import type {
  Message,
  PresenceMessage,
  RealtimeChannel,
} from "ably";
import { getAblyTokenRequest } from "@/lib/cinema/room-actions";

/** Room channel naming shared with the server helper. */
export function cinemaChannelName(roomId: string) {
  return `cinema:${roomId}`;
}

export const PLAYBACK_EVENT = "playback" as const;
export const MEMBERS_EVENT = "members" as const;
export const REACTION_EVENT = "reaction" as const;
export const CHAT_EVENT = "chat" as const;

export class AblyRoomChannel {
  private ably: Ably.Realtime | null = null;
  private channel: RealtimeChannel | null = null;

  constructor(
    private readonly roomId: string,
    private readonly channelName: string,
  ) {}

  get configured() {
    return Boolean(this.ably);
  }

  async connect(): Promise<{ ok: boolean; reason?: string }> {
    const result = await getAblyTokenRequest(this.roomId);
    if (!result.ok) return { ok: false, reason: result.error };

    this.ably = new Ably.Realtime({
      authCallback: (_params, callback) => {
        callback(null, result.data.tokenRequest as Ably.TokenRequest);
      },
      // EchoMessages true so the host hears its own authoritative commands.
      echoMessages: true,
    });

    return new Promise((resolve) => {
      // If we are not actually attached within this window, report failure so
      // the room falls back to polling instead of silently missing events.
      const timer = setTimeout(
        () => resolve({ ok: false, reason: "connect timeout" }),
        8000,
      );
      this.ably!.connection.once("connected", () => {
        clearTimeout(timer);
        this.channel = this.ably!.channels.get(this.channelName);
        resolve({ ok: true });
      });
      this.ably!.connection.once("failed", (stateChange) => {
        clearTimeout(timer);
        resolve({ ok: false, reason: stateChange?.reason?.message ?? "connection failed" });
      });
    });
  }

  onPlayback(callback: (message: Message) => void) {
    if (!this.channel) return () => undefined;
    this.channel.subscribe(PLAYBACK_EVENT, callback);
    return () => this.channel?.unsubscribe(PLAYBACK_EVENT, callback);
  }

  onMembers(callback: (message: Message) => void) {
    if (!this.channel) return () => undefined;
    this.channel.subscribe(MEMBERS_EVENT, callback);
    return () => this.channel?.unsubscribe(MEMBERS_EVENT, callback);
  }

  onReaction(callback: (message: Message) => void) {
    if (!this.channel) return () => undefined;
    this.channel.subscribe(REACTION_EVENT, callback);
    return () => this.channel?.unsubscribe(REACTION_EVENT, callback);
  }

  onChat(callback: (message: Message) => void) {
    if (!this.channel) return () => undefined;
    this.channel.subscribe(CHAT_EVENT, callback);
    return () => this.channel?.unsubscribe(CHAT_EVENT, callback);
  }

  onPresenceJoin(callback: (member: PresenceMessage) => void) {
    if (!this.channel) return () => undefined;
    this.channel.presence.subscribe("enter", callback);
    return () => this.channel?.presence.unsubscribe("enter", callback);
  }

  onPresenceLeave(callback: (member: PresenceMessage) => void) {
    if (!this.channel) return () => undefined;
    this.channel.presence.subscribe("leave", callback);
    return () => this.channel?.presence.unsubscribe("leave", callback);
  }

  /** Snapshot of clients currently present in the room channel. */
  async listPresence(): Promise<PresenceMessage[]> {
    try {
      const members = await this.channel?.presence.get();
      return members ?? [];
    } catch {
      return [];
    }
  }

  async enterPresence(data?: Record<string, unknown>) {
    // The token already pins the clientId (the user's id); passing our own
    // string here would be treated as presence *data*, not a clientId. Any
    // extra data (e.g. display name for system messages) rides along.
    await this.channel?.presence.enter(data);
  }

  async leavePresence() {
    await this.channel?.presence.leave();
  }

  async close() {
    await this.leavePresence();
    this.channel?.unsubscribe();
    this.ably?.close();
    this.ably = null;
    this.channel = null;
  }
}