import { randomBytes, randomInt, createHash } from "node:crypto";
import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from "@/lib/cinema/types";

/**
 * Unpredictable, shareable room code. Deliberately avoids ambiguous
 * characters (0/O, 1/I/L) so invite links are easy to read out loud.
 */
export function generateRoomCode(length = ROOM_CODE_LENGTH): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += ROOM_CODE_ALPHABET[randomInt(ROOM_CODE_ALPHABET.length)];
  }
  return code;
}

/**
 * Long-lived invitation secret. Sent to invitees (in the invite URL), never
 * stored — only its SHA-256 hash is persisted.
 */
export function generateInviteToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}