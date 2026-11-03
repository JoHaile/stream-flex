"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  CameraOff,
  LoaderCircle,
  Mic,
  MicOff,
  PhoneOff,
  Video,
} from "lucide-react";
import { Room, RoomEvent, Track, type Participant } from "livekit-client";
import { getLiveKitToken } from "@/lib/cinema/room-actions";
import type { RoomDetails } from "@/lib/cinema/types";

export default function VoicePanel({
  room,
  onLeave,
}: {
  room: RoomDetails;
  onLeave: () => void;
}) {
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(false);
  const [peers, setPeers] = useState<Array<{ identity: string; name: string; hasVideo: boolean }>>([]);

  const roomRef = useRef<Room | null>(null);
  const videoRef = useRef<HTMLDivElement | null>(null);

  const roomMode = room.mode;
  const wantsVideo = roomMode === "VOICE_VIDEO";

  const attachParticipant = useCallback((participant: Participant) => {
    if (!participant.isLocal && typeof window !== "undefined" && videoRef.current) {
      const existing = videoRef.current.querySelector<HTMLVideoElement>(
        `[data-participant="${participant.identity}"]`,
      );
      let video = existing;
      if (!video) {
        video = document.createElement("video");
        video.dataset.participant = participant.identity;
        video.autoplay = true;
        video.playsInline = true;
        video.controls = true;
        videoRef.current.appendChild(video);
      }
      video.srcObject = participant.getTrackPublication(Track.Source.Camera)?.videoTrack?.mediaStream ?? null;
    }
  }, []);

  const refreshPeers = useCallback(
    (liveRoom: Room) => {
      if (videoRef.current) videoRef.current.replaceChildren();
      const list = Array.from(liveRoom.remoteParticipants.values()).map((p) => ({
        identity: p.identity,
        name: p.name || "Guest",
        hasVideo: Boolean(p.getTrackPublication(Track.Source.Camera)?.isSubscribed),
      }));
      for (const p of liveRoom.remoteParticipants.values()) attachParticipant(p);
      setPeers(list);
    },
    [attachParticipant],
  );

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const result = await getLiveKitToken(room.id, { wantVideo: wantsVideo });
      if (!result.ok) {
        setError(
          result.code === "NOT_CONFIGURED"
            ? "Voice/video isn\u2019t configured on this server yet."
            : result.error,
        );
        setConnecting(false);
        return;
      }
      const liveRoom = new Room({
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: { resolution: { width: 640, height: 480 } },
      });
      roomRef.current = liveRoom;

      liveRoom.on(RoomEvent.TrackSubscribed, () => refreshPeers(liveRoom));
      liveRoom.on(RoomEvent.ParticipantConnected, () => refreshPeers(liveRoom));
      liveRoom.on(RoomEvent.ParticipantDisconnected, () => refreshPeers(liveRoom));
      liveRoom.on(RoomEvent.Connected, () => setConnected(true));
      liveRoom.on(RoomEvent.Disconnected, () => {
        setConnected(false);
        setPeers([]);
      });
      liveRoom.on(RoomEvent.ConnectionStateChanged, (state) => {
        setConnected(state === "connected");
      });
      liveRoom.on(RoomEvent.TrackUnsubscribed, () => refreshPeers(liveRoom));

      await liveRoom.connect(result.data.room, result.data.token);
      await liveRoom.localParticipant.setMicrophoneEnabled(micOn);
      if (wantsVideo && camOn) {
        await liveRoom.localParticipant.setCameraEnabled(true);
      }
      refreshPeers(liveRoom);
      setConnecting(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not connect to the call.");
      setConnecting(false);
    }
  }, [wantsVideo, micOn, camOn, refreshPeers, room.id]);

  const leave = useCallback(() => {
    const liveRoom = roomRef.current;
    if (liveRoom) {
      liveRoom.disconnect();
      roomRef.current = null;
    }
    setConnected(false);
    setPeers([]);
    onLeave();
  }, [onLeave]);

  useEffect(() => {
    if (!connected) return;
    const liveRoom = roomRef.current;
    if (!liveRoom) return;
    liveRoom.localParticipant.setMicrophoneEnabled(micOn).catch(() => {
      setError("Microphone permission denied.");
    });
    if (wantsVideo) {
      liveRoom.localParticipant.setCameraEnabled(camOn).catch(() => {
        setError("Camera permission denied.");
      });
    }
  }, [connected, micOn, camOn, wantsVideo]);

  useEffect(() => () => {
    roomRef.current?.disconnect();
  }, []);

  if (!connected && !connecting) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
        <p className="mb-1 flex items-center gap-2 text-sm font-bold text-white">
          <Video className="h-4 w-4 text-red-400" />
          {wantsVideo ? "Voice & video" : "Voice"}
        </p>
        <p className="mb-3 text-xs text-zinc-400">
          {wantsVideo
            ? "Join the call to see and hear everyone in the room."
            : "Join the call to talk while you watch."}
        </p>
        {error ? (
          <p className="mb-3 text-xs text-red-400">{error}</p>
        ) : null}
        <button
          onClick={connect}
          className="w-full rounded-lg bg-zinc-100 px-4 py-2 text-sm font-bold text-black hover:bg-white transition"
        >
          Join call
        </button>
      </div>
    );
  }

  if (connecting || !connected) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-sm text-zinc-400">
        <LoaderCircle className="h-4 w-4 animate-spin" />
        Connecting to the call…
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div ref={videoRef} className="grid grid-cols-2 gap-2" />
      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs font-medium text-zinc-400">
          {peers.length + 1} in call
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMicOn((v) => !v)}
            aria-label={micOn ? "Mute microphone" : "Unmute microphone"}
            className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
              micOn ? "bg-zinc-200 text-black" : "bg-zinc-800 text-zinc-400"
            }`}
          >
            {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
          </button>
          {wantsVideo ? (
            <button
              onClick={() => setCamOn((v) => !v)}
              aria-label={camOn ? "Turn camera off" : "Turn camera on"}
              className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
                camOn ? "bg-zinc-200 text-black" : "bg-zinc-800 text-zinc-400"
              }`}
            >
              {camOn ? <Camera className="h-4 w-4" /> : <CameraOff className="h-4 w-4" />}
            </button>
          ) : null}
          <button
            onClick={leave}
            aria-label="Leave the call"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-500 transition"
          >
            <PhoneOff className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}