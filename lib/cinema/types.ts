export const ROOM_MODES = ["MOVIE_ONLY", "VOICE", "VOICE_VIDEO"] as const;
export type RoomMode = (typeof ROOM_MODES)[number];

export const ROOM_STATUSES = ["OPEN", "CLOSED"] as const;
export type RoomStatus = (typeof ROOM_STATUSES)[number];

export const ROOM_ROLES_VALUES = ["HOST", "GUEST"] as const;
export type RoomRole = (typeof ROOM_ROLES_VALUES)[number];

export const MAX_CAPACITY = 50;
export const MIN_CAPACITY = 2;

/** Actions the host can send through the authoritative playback endpoint. */
export const PLAYBACK_ACTIONS = ["play", "pause", "seek"] as const;
export type PlaybackAction = (typeof PLAYBACK_ACTIONS)[number];

export interface PlaybackState {
  isPlaying: boolean;
  positionSeconds: number;
  stateVersion: number;
  stateUpdatedAt: string; // ISO timestamp from server clock
}

/** A participant shown on the public join preview (name + avatar only). */
export interface RoomParticipantPreview {
  id: string;
  name: string;
  role: RoomRole;
  image: string | null;
}

/** Room summary shown to someone previewing an invite link (no secrets). */
export interface RoomInvitePreview {
  code: string;
  name: string;
  movieId: string;
  movieTitle: string;
  mode: RoomMode;
  status: RoomStatus;
  capacity: number;
  members: number;
  hostName: string;
  hostImage: string | null;
  /** Who is already in the room (name + role only, capped). */
  participants: RoomParticipantPreview[];
}

/** A chat message exchanged inside a cinema room. */
export interface ChatMessage {
  id: string;
  userId: string;
  name: string;
  body: string;
  at: string;
  /** "system" entries are presence-derived ("X joined") and never stored. */
  kind?: "user" | "system";
}

/** Full authorized room payload for the room page. */
export interface RoomDetails
  extends Omit<RoomInvitePreview, "participants" | "hostImage"> {
  id: string;
  isHost: boolean;
  myRole: RoomRole;
  playback: PlaybackState;
  participants: Array<{ id: string; name: string; role: RoomRole }>;
  /** Latest messages, oldest first (so the list renders top → bottom). */
  messages: ChatMessage[];
  realtimeConfigured: boolean;
  livekitConfigured: boolean;
}

export const CHAT_MAX_LENGTH = 500;
export const CHAT_HISTORY_LIMIT = 50;

export interface RoomCreatedResult {
  code: string;
  inviteToken: string;
  inviteUrl: string;
  roomId: string;
}

export const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const ROOM_CODE_LENGTH = 8;
export const INVITE_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days