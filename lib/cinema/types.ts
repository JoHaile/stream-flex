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
}

/** Full authorized room payload for the room page. */
export interface RoomDetails extends RoomInvitePreview {
  id: string;
  isHost: boolean;
  myRole: RoomRole;
  playback: PlaybackState;
  participants: Array<{ id: string; name: string; role: RoomRole }>;
  realtimeConfigured: boolean;
  livekitConfigured: boolean;
}

export interface RoomCreatedResult {
  code: string;
  inviteToken: string;
  inviteUrl: string;
  roomId: string;
}

export const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const ROOM_CODE_LENGTH = 8;
export const INVITE_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days