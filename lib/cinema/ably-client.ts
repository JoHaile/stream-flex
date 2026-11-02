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
      const timer = setTimeout(() => resolve({ ok: true }), 4000);
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

  onPresenceJoin(callback: (member: PresenceMessage) => void) {
    if (!this.channel) return () => undefined;
    this.channel.presence.subscribe("enter", callback);
    return () => this.channel?.presence.unsubscribe("enter", callback);
  }

  async enterPresence(clientId: string) {
    await this.channel?.presence.enter(clientId);
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