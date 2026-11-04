import { NextRequest, NextResponse } from "next/server";
import { leaveRoom } from "@/lib/cinema/room-actions";

/**
 * Exit point for unload beacons (pagehide / beforeunload). A plain
 * navigator.sendBeacon POST so a host who closes the tab still releases the
 * host seat and closes the room instead of leaving a zombie party. Server
 * actions cannot be called from a beacon, hence the route.
 */
export async function POST(request: NextRequest) {
  try {
    let roomId: string | null = null;
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const body = await request.json().catch(() => null);
      roomId = typeof body?.roomId === "string" ? body.roomId : null;
    } else {
      const text = await request.text();
      const raw = new URLSearchParams(text).get("roomId");
      roomId = raw || null;
    }
    if (!roomId) {
      return NextResponse.json({ ok: false, error: "missing roomId" }, { status: 400 });
    }
    const result = await leaveRoom(roomId);
    if (!result.ok) {
      // Idempotent: leaving when not a member is fine for beacons.
      return NextResponse.json({ ok: true }, { status: 200 });
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}