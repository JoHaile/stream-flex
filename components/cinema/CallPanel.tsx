"use client";

// CallPanel — the join-and-control surface for voice / voice+video cinema
// rooms. Replaces the old VoicePanel:
//
//  - Pre-join step where the joiner picks what they publish: audio only,
//    audio + video, or "just watching" (silent). No permission prompt is
//    fired until they actually connect.
//  - Joining never dies because of a denied mic: publish failures are
//    surfaced as a recoverable media error instead of aborting the call.
//  - Remote audio is actually attached and played (LiveKit does not autoplay
//    audio; the old panel only attached camera video, so nobody was audible).
//  - Live controls during the call: mute, camera on/off, device switching,
//    leave-call, speaking indicator and an elapsed timer.
//  - Token grants are a ceiling derived from the room mode, so a guest who
//    joined "audio only" can still turn their camera on mid-call.

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  Camera,
  CameraOff,
  Headphones,
  LoaderCircle,
  Mic,
  MicOff,
  PhoneOff,
  RefreshCw,
  Video,
  VideoOff,
} from "lucide-react";
import {
  Room,
  RoomEvent,
  Track,
  type Participant,
} from "livekit-client";
import { getLiveKitToken } from "@/lib/cinema/room-actions";
import type { RoomDetails } from "@/lib/cinema/types";

type JoinChoice = "audio" | "audio-video" | "silent";

const CHOICES: Array<{
  value: JoinChoice;
  label: string;
  hint: string;
  icon: typeof Mic;
}> = [
  { value: "audio", label: "Audio only", hint: "Talk, camera stays off", icon: Headphones },
  { value: "audio-video", label: "Audio + video", hint: "Camera on when you join", icon: Video },
  { value: "silent", label: "Just watching", hint: "No mic or camera", icon: VideoOff },
];

/** User-friendly message for a media (permission/device) error. */
function mediaErrorMessage(error: unknown): string {
  const name = error instanceof Error ? error.name : "";
  const message = error instanceof Error ? error.message : "";
  if (name === "NotAllowedError" || /permission|denied/i.test(message)) {
    return "Mic or camera access was blocked. Allow access in your browser, then try again.";
  }
  if (name === "NotFoundError" || /no device|not found/i.test(message)) {
    return "No microphone or camera found on this device. Pick a different input or join silent.";
  }
  if (
    name === "NotSupportedError" ||
    /not supported|doesn'?t seem to be supported|webrtc/i.test(message)
  ) {
    return "This browser can't make voice or video calls. Try Chrome, Edge, Firefox or Safari.";
  }
  return message || "Something went wrong with your mic or camera.";
}

/**
 * LiveKit needs WebRTC, which browsers only expose in a secure context and
 * only when the peer-connection API can send media. Checking up front gives
 * a clear message instead of LiveKit's raw "doesn't seem to be supported"
 * error after the user has already picked a device.
 */
const SUPPORTED_MESSAGE =
  "This browser can't make voice or video calls. Open the room in Chrome, Edge, Firefox or Safari over https:// and try again.";

function checkCallSupport(): { ok: boolean; reason?: string } {
  if (typeof window === "undefined") return SERVER_SUPPORT;
  // Test seam / emergency kill-switch: force the "calls unavailable" state.
  if ((window as { __CINEMA_DISABLE_WEBRTC?: boolean }).__CINEMA_DISABLE_WEBRTC) {
    return { ok: false, reason: SUPPORTED_MESSAGE };
  }
  if (!window.isSecureContext) {
    return {
      ok: false,
      reason:
        "Calls need a secure connection. Open this page over https:// (or on localhost) to use your mic and camera.",
    };
  }
  const PeerConnection = window.RTCPeerConnection;
  if (typeof PeerConnection === "undefined") {
    return { ok: false, reason: SUPPORTED_MESSAGE };
  }
  const proto = PeerConnection.prototype as RTCPeerConnection & {
    addTransceiver?: unknown;
    addTrack?: unknown;
  };
  if (!("addTransceiver" in proto) && !("addTrack" in proto)) {
    return { ok: false, reason: SUPPORTED_MESSAGE };
  }
  if (!navigator.mediaDevices) {
    return { ok: false, reason: SUPPORTED_MESSAGE };
  }
  return { ok: true };
}

// Cached so `useSyncExternalStore` sees a stable snapshot, with a separate
// server snapshot so the first (hydrating) render matches the HTML.
const SERVER_SUPPORT: { ok: boolean; reason?: string } = { ok: true };
let cachedSupport: { ok: boolean; reason?: string } | null = null;
function subscribeCallSupport() {
  return () => {};
}
function getCallSupport() {
  if (!cachedSupport) cachedSupport = checkCallSupport();
  return cachedSupport;
}
function getServerCallSupport() {
  return SERVER_SUPPORT;
}

export default function CallPanel({
  room,
  initialChoice,
  onInCallChange,
}: {
  room: RoomDetails;
  initialChoice?: JoinChoice;
  /** Reports livekit identities (`sf-<userId>`) currently in the call. */
  onInCallChange?: (identities: string[]) => void;
}) {
  const wantsVideo = room.mode === "VOICE_VIDEO";

  const [phase, setPhase] = useState<"setup" | "connecting" | "joined">("setup");
  const [choice, setChoice] = useState<JoinChoice>(() => {
    if (!initialChoice) return "audio";
    if (initialChoice === "audio-video" && !wantsVideo) return "audio";
    return initialChoice;
  });
  const [audioOn, setAudioOn] = useState(choice !== "silent");
  const [videoOn, setVideoOn] = useState(choice === "audio-video" && wantsVideo);
  const [micDevices, setMicDevices] = useState<MediaDeviceInfo[]>([]);
  const [camDevices, setCamDevices] = useState<MediaDeviceInfo[]>([]);
  const [micDeviceId, setMicDeviceId] = useState("");
  const [camDeviceId, setCamDeviceId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [peers, setPeers] = useState<Array<{ identity: string; name: string; speaking: boolean }>>([]);
  const [inCallSeconds, setInCallSeconds] = useState(0);
  // Assume supported during server render; the real answer needs a browser.
  const support = useSyncExternalStore(
    subscribeCallSupport,
    getCallSupport,
    getServerCallSupport,
  );

  const roomRef = useRef<Room | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const localVideoRef = useRef<HTMLDivElement | null>(null);
  const onInCallChangeRef = useRef(onInCallChange);
  useEffect(() => {
    onInCallChangeRef.current = onInCallChange;
  }, [onInCallChange]);
  const audioOnRef = useRef(audioOn);
  const videoOnRef = useRef(videoOn);
  const micDeviceRef = useRef(micDeviceId);
  const camDeviceRef = useRef(camDeviceId);

  // Mirror state into refs for async media callbacks (refs cannot be written
  // during render under the React 19 hook rules).
  useEffect(() => {
    audioOnRef.current = audioOn;
  }, [audioOn]);
  useEffect(() => {
    videoOnRef.current = videoOn;
  }, [videoOn]);
  useEffect(() => {
    micDeviceRef.current = micDeviceId;
  }, [micDeviceId]);
  useEffect(() => {
    camDeviceRef.current = camDeviceId;
  }, [camDeviceId]);

  // -------------------------------------------------------------------------
  // Media grid (imperative — mirrors the LiveKit room into the DOM because
  // media streams are not serializable and re-attaching on every render
  // causes flicker).
  // -------------------------------------------------------------------------

  const refreshPeers = useCallback((liveRoom: Room, speakers: Set<string>) => {
    const grid = gridRef.current;
    if (grid) grid.replaceChildren();
    const list: Array<{ identity: string; name: string; speaking: boolean }> = [];
    for (const participant of liveRoom.remoteParticipants.values()) {
      const identity = participant.identity;
      list.push({
        identity,
        name: participant.name || "Guest",
        speaking: speakers.has(identity),
      });
      if (!grid) continue;
      const tile = document.createElement("div");
      tile.dataset.participant = identity;
      tile.className =
        "relative flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-zinc-950 ring-1 ring-zinc-800";
      if (speakers.has(identity)) {
        tile.classList.add("ring-2", "ring-emerald-400/80");
      }
      // Remote camera video.
      const camera = participant.getTrackPublication(Track.Source.Camera);
      const video = document.createElement("video");
      video.autoplay = true;
      video.playsInline = true;
      video.className = "h-full w-full object-cover";
      const stream = camera?.videoTrack?.mediaStream;
      if (stream) {
        video.srcObject = stream;
        tile.appendChild(video);
      } else {
        tile.classList.add("!bg-zinc-900");
        const fallback = document.createElement("div");
        fallback.className =
          "absolute inset-0 flex items-center justify-center text-3xl font-black text-zinc-700";
        fallback.textContent = (participant.name || "?").slice(0, 1).toUpperCase();
        tile.appendChild(fallback);
      }
      const label = document.createElement("div");
      label.className =
        "absolute bottom-1.5 left-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white";
      label.textContent = participant.name || "Guest";
      tile.appendChild(label);
      grid.appendChild(tile);

      // Remote microphone audio — must be attached explicitly or silence.
      const mic = participant.getTrackPublication(Track.Source.Microphone);
      const micStream = mic?.audioTrack?.mediaStream;
      if (micStream) {
        const audio = document.createElement("audio");
        audio.autoplay = true;
        audio.style.display = "none";
        audio.srcObject = micStream;
        void audio.play().catch(() => {
          /* autoplay blocked — the user can unmute the tab and retry */
        });
        grid.appendChild(audio);
      }
    }
    setPeers(list);
  }, []);

  const renderLocal = useCallback((liveRoom: Room) => {
    const holder = localVideoRef.current;
    if (!holder) return;
    holder.replaceChildren();
    const pub = liveRoom.localParticipant.getTrackPublication(Track.Source.Camera);
    const stream = pub?.videoTrack?.mediaStream;
    if (stream) {
      const video = document.createElement("video");
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;
      video.className = "h-full w-full object-cover";
      video.srcObject = stream;
      holder.appendChild(video);
    }
  }, []);

  const reportInCall = useCallback((liveRoom: Room) => {
    onInCallChangeRef.current?.([
      liveRoom.localParticipant.identity,
      ...Array.from(liveRoom.remoteParticipants.values()).map((p) => p.identity),
    ]);
  }, []);

  const syncFromRoom = useCallback(
    (liveRoom: Room, speakers = new Set<string>()) => {
      reportInCall(liveRoom);
      if (typeof window !== "undefined" && (window as { __CINEMA_DEBUG?: boolean }).__CINEMA_DEBUG) {
        console.log(
          "[lk-debug]",
          "remote=", liveRoom.remoteParticipants.size,
          "localPubs=", liveRoom.localParticipant.trackPublications.size,
          "conn=", liveRoom.state,
        );
      }
      refreshPeers(liveRoom, speakers);
      renderLocal(liveRoom);
      const sp = Array.from(liveRoom.activeSpeakers ?? []).map((p) => p.identity);
      setPeers((prev) =>
        prev.map((p) => ({ ...p, speaking: sp.includes(p.identity) })),
      );
    },
    [refreshPeers, renderLocal, reportInCall],
  );

  // -------------------------------------------------------------------------
  // Leave / cleanup
  // -------------------------------------------------------------------------

  const cleanup = useCallback(() => {
    const lk = roomRef.current;
    if (lk) {
      try {
        lk.disconnect();
      } catch {
        /* already gone */
      }
      roomRef.current = null;
    }
    setPhase("setup");
    setError(null);
    setMediaError(null);
    setPeers([]);
    setInCallSeconds(0);
    onInCallChangeRef.current?.([]);
    if (gridRef.current) gridRef.current.replaceChildren();
    if (localVideoRef.current) localVideoRef.current.replaceChildren();
  }, []);

  // -------------------------------------------------------------------------
  // Join
  // -------------------------------------------------------------------------

  const join = useCallback(async () => {
    setError(null);
    setMediaError(null);
    const supportCheck = checkCallSupport();
    if (!supportCheck.ok) {
      setError(supportCheck.reason ?? SUPPORTED_MESSAGE);
      setPhase("setup");
      return;
    }
    setPhase("connecting");
    try {
      const result = await getLiveKitToken(room.id, {
        wantAudio: audioOnRef.current,
        wantVideo: wantsVideo && videoOnRef.current,
      });
      if (!result.ok) throw new Error(result.error);

      const liveRoom = new Room({
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: { resolution: { width: 640, height: 480 } },
      });
      roomRef.current = liveRoom;

      liveRoom.on(RoomEvent.Connected, () => {
        // Publish the user's chosen sources. Failed devices must NOT end the
        // call — surface it and let them pick another device or stay silent.
        setPhase("joined");
        liveRoom.localParticipant
          .setMicrophoneEnabled(audioOnRef.current, {
            deviceId: micDeviceRef.current || undefined,
          })
          .catch((e: unknown) => setMediaError(mediaErrorMessage(e)));
        if (wantsVideo) {
          liveRoom.localParticipant
            .setCameraEnabled(videoOnRef.current, {
              deviceId: camDeviceRef.current || undefined,
            })
            .catch((e: unknown) => setMediaError(mediaErrorMessage(e)));
        }
        syncFromRoom(liveRoom);
      });
      liveRoom.on(RoomEvent.TrackSubscribed, () => syncFromRoom(liveRoom));
      liveRoom.on(RoomEvent.TrackUnsubscribed, () => syncFromRoom(liveRoom));
      liveRoom.on(RoomEvent.LocalTrackPublished, () => syncFromRoom(liveRoom));
      liveRoom.on(RoomEvent.ParticipantConnected, () => syncFromRoom(liveRoom));
      liveRoom.on(RoomEvent.ParticipantDisconnected, () => syncFromRoom(liveRoom));
      liveRoom.on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) => {
        const sp = new Set(speakers.map((p) => p.identity));
        setPeers((prev) => prev.map((p) => ({ ...p, speaking: sp.has(p.identity) })));
        refreshPeers(liveRoom, sp);
      });
      liveRoom.on(RoomEvent.Disconnected, () => {
        setPhase("setup");
        setPeers([]);
        setInCallSeconds(0);
        onInCallChangeRef.current?.([]);
        if (gridRef.current) gridRef.current.replaceChildren();
        if (localVideoRef.current) localVideoRef.current.replaceChildren();
        roomRef.current = null;
      });
      liveRoom.on(RoomEvent.MediaDevicesError, (e: Error) =>
        setMediaError(mediaErrorMessage(e)),
      );

      await liveRoom.connect(result.data.url, result.data.token);
    } catch (e) {
      roomRef.current?.disconnect();
      roomRef.current = null;
      const message = e instanceof Error ? e.message : "";
      setError(
        /not supported|doesn'?t seem to be supported|webrtc/i.test(message)
          ? SUPPORTED_MESSAGE
          : message || "Could not connect to the call.",
      );
      setPhase("setup");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id, wantsVideo, syncFromRoom]);

  // Unmount safety.
  useEffect(() => () => cleanup(), [cleanup]);

  // -------------------------------------------------------------------------
  // Live toggles (during a call)
  // -------------------------------------------------------------------------

  const toggleMic = useCallback(() => {
    const next = !audioOnRef.current;
    setAudioOn(next);
    audioOnRef.current = next;
    roomRef.current?.localParticipant
      .setMicrophoneEnabled(next, { deviceId: micDeviceRef.current || undefined })
      .catch((e: unknown) => setMediaError(mediaErrorMessage(e)));
  }, []);

  const toggleCam = useCallback(() => {
    const next = !videoOnRef.current;
    setVideoOn(next);
    videoOnRef.current = next;
    roomRef.current?.localParticipant
      .setCameraEnabled(next, { deviceId: camDeviceRef.current || undefined })
      .catch((e: unknown) => setMediaError(mediaErrorMessage(e)));
  }, []);

  const switchDevice = useCallback(async (kind: MediaDeviceKind, deviceId: string) => {
    if (kind === "audioinput") setMicDeviceId(deviceId);
    if (kind === "videoinput") setCamDeviceId(deviceId);
    const lk = roomRef.current;
    if (!lk) return;
    try {
      const ok = await lk.switchActiveDevice(kind, deviceId);
      if (!ok) setMediaError("Could not switch devices. Pick another option and try again.");
    } catch (e) {
      setMediaError(mediaErrorMessage(e));
    }
  }, []);

  // -------------------------------------------------------------------------
  // Device enumeration (pre-join pickers)
  // -------------------------------------------------------------------------

  const refreshDevices = useCallback(async (kind: "audio" | "video") => {
    try {
      if (kind === "audio") {
        const devices = await Room.getLocalDevices("audioinput", true);
        setMicDevices(devices);
        if (devices.length && !micDeviceId) setMicDeviceId(devices[0].deviceId);
      } else {
        const devices = await Room.getLocalDevices("videoinput", true);
        setCamDevices(devices);
        if (devices.length && !camDeviceId) setCamDeviceId(devices[0].deviceId);
      }
    } catch (e) {
      setMediaError(mediaErrorMessage(e));
    }
  }, [micDeviceId, camDeviceId]);

  // -------------------------------------------------------------------------
  // Pre-join camera preview (only after the user explicitly switches it on)
  // -------------------------------------------------------------------------

  const previewRef = useRef<HTMLVideoElement | null>(null);
  const previewCleanupRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (phase !== "setup" || !wantsVideo || !videoOn) {
      previewCleanupRef.current?.();
      previewCleanupRef.current = null;
      return;
    }
    let cancelled = false;
    let stream: MediaStream | null = null;
    navigator.mediaDevices
      .getUserMedia({ video: camDeviceId ? { deviceId: { exact: camDeviceId } } : true })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        if (previewRef.current) previewRef.current.srcObject = s;
      })
      .catch((e: unknown) => setMediaError(mediaErrorMessage(e)));
    previewCleanupRef.current = () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
    return () => {
      previewCleanupRef.current?.();
      previewCleanupRef.current = null;
    };
  }, [phase, wantsVideo, videoOn, camDeviceId]);

  // -------------------------------------------------------------------------
  // Elapsed call timer
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (phase !== "joined") return;
    const id = setInterval(() => setInCallSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  // -------------------------------------------------------------------------
  // Setup phase
  // -------------------------------------------------------------------------

  if (phase === "setup") {
    const pickChoice = (value: JoinChoice) => {
      setChoice(value);
      setAudioOn(value !== "silent");
      setVideoOn(value === "audio-video");
      setError(null);
      setMediaError(null);
    };

    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5">
        <p className="mb-1 flex items-center gap-2 text-sm font-bold text-white">
          <Video className="h-4 w-4 text-red-400" />
          {wantsVideo ? "Voice & video" : "Voice call"}
        </p>
        <p className="mb-4 text-xs text-zinc-400">
          You&rsquo;re in control — pick what you share before joining, and change
          it any time during the call.
        </p>

        {!support.ok ? (
          <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
            <p className="font-bold">Calls aren&rsquo;t available in this browser</p>
            <p className="mt-1 leading-snug">{support.reason}</p>
            <p className="mt-2 text-amber-200/80">
              You can still watch the movie and use chat with everyone else in the room.
            </p>
          </div>
        ) : (
          <>
          {wantsVideo ? (
            <div className="mb-4 grid gap-2 sm:grid-cols-3">
              {CHOICES.map((c) => {
                const Icon = c.icon;
                const active = choice === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => pickChoice(c.value)}
                    aria-pressed={active}
                    className={`rounded-xl border p-3 text-left transition ${
                      active
                        ? "border-red-500 bg-red-500/10 ring-2 ring-red-500/30"
                        : "border-zinc-700 bg-zinc-950/40 hover:border-zinc-500"
                    }`}
                  >
                    <Icon className={`mb-2 h-4 w-4 ${active ? "text-red-400" : "text-zinc-400"}`} />
                    <p className="text-xs font-bold">{c.label}</p>
                    <p className="mt-0.5 text-[10px] leading-snug text-zinc-500">{c.hint}</p>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-zinc-800 bg-black/40 p-3 text-xs text-zinc-400">
              <Headphones className="h-4 w-4 text-red-400" />
              Voice room — you can talk or stay muted the whole time.
            </div>
          )}

          {/* Mic / camera toggles */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setAudioOn((v) => !v)}
              aria-pressed={audioOn}
              aria-label={audioOn ? "Start on mute" : "Start unmuted"}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                audioOn
                  ? "bg-zinc-200 text-black"
                  : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {audioOn ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
              {audioOn ? "Mic on" : "Mic muted"}
            </button>
            {wantsVideo ? (
              <button
                type="button"
                onClick={() => {
                  setVideoOn((v) => !v);
                  if (!videoOn) setChoice("audio-video");
                }}
                aria-pressed={videoOn}
                aria-label={videoOn ? "Join without camera" : "Join with camera"}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                  videoOn
                    ? "bg-zinc-200 text-black"
                    : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {videoOn ? <Camera className="h-3.5 w-3.5" /> : <CameraOff className="h-3.5 w-3.5" />}
                {videoOn ? "Camera on" : "Camera off"}
              </button>
            ) : null}
            {(error || mediaError) && phase === "setup" ? (
              <span className="ml-auto max-w-[220px] text-right text-[11px] leading-snug text-red-400">
                {error ?? mediaError}
              </span>
            ) : null}
          </div>

          {/* Pre-join camera preview */}
          {wantsVideo && videoOn ? (
            <div className="relative mb-4 aspect-video w-full overflow-hidden rounded-xl border border-zinc-800 bg-black">
              <video ref={previewRef} autoPlay playsInline muted className="h-full w-full object-cover" />
              <span className="absolute bottom-1.5 left-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                You
              </span>
            </div>
          ) : null}

          {/* Device pickers */}
          <div className="mb-4 grid gap-2 sm:grid-cols-2">
            <DeviceSelect
              label="Microphone"
              kind="audioinput"
              devices={micDevices}
              value={micDeviceId}
              onRefresh={() => void refreshDevices("audio")}
              onChange={(id) => void switchDevice("audioinput", id)}
            />
            {wantsVideo ? (
              <DeviceSelect
                label="Camera"
                kind="videoinput"
                devices={camDevices}
                value={camDeviceId}
                onRefresh={() => void refreshDevices("video")}
                onChange={(id) => void switchDevice("videoinput", id)}
              />
            ) : null}
          </div>

          <button
            onClick={() => void join()}
            className="w-full rounded-lg bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-500"
          >
            {choice === "silent"
              ? "Join silently"
              : choice === "audio-video" || (wantsVideo && videoOn)
                ? "Join with audio + video"
                : "Join call"}
          </button>
          <p className="mt-2 text-center text-[11px] text-zinc-600">
            Hosts control playback — this only connects your mic and camera.
          </p>
          </>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Connecting / joined phases
  // -------------------------------------------------------------------------

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-bold text-white">
          <Video className="h-4 w-4 text-red-400" />
          {phase === "connecting" ? "Connecting…" : `${wantsVideo ? "Voice & video" : "Voice call"}`}
        </p>
        {phase === "joined" ? (
          <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-300">
            {peers.length + 1} in call · {formatClock(inCallSeconds)}
          </span>
        ) : null}
      </div>

      {phase === "connecting" ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-zinc-400">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Connecting to the call…
        </div>
      ) : (
        <>
          {/* Local tile + remote tiles */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="relative aspect-video overflow-hidden rounded-lg bg-zinc-950 ring-1 ring-zinc-800">
              <div ref={localVideoRef} className="h-full w-full" />
              {!videoOn ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-zinc-600">
                  <CameraOff className="h-6 w-6" />
                  <span className="text-[10px] font-semibold">Camera off</span>
                </div>
              ) : null}
              <span className="absolute bottom-1.5 left-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                You
              </span>
            </div>
            <div ref={gridRef} className="contents" />
          </div>
          {peers.length === 0 ? (
            <p className="py-6 text-center text-xs text-zinc-500">
              No one else is in the call yet — you&rsquo;re the first one here.
            </p>
          ) : null}

          {mediaError ? (
            <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
              {mediaError}
            </p>
          ) : null}

          {/* Call controls */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <RoundButton
              onClick={toggleMic}
              active={audioOn}
              label={audioOn ? "Mute microphone" : "Unmute microphone"}
              title={audioOn ? "Mute" : "Unmute"}
            >
              {audioOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            </RoundButton>
            {wantsVideo ? (
              <RoundButton
                onClick={toggleCam}
                active={videoOn}
                label={videoOn ? "Turn camera off" : "Turn camera on"}
                title={videoOn ? "Camera off" : "Camera on"}
              >
                {videoOn ? <Camera className="h-4 w-4" /> : <CameraOff className="h-4 w-4" />}
              </RoundButton>
            ) : null}
            <RoundButton onClick={cleanup} active={false} label="Leave the call" title="Leave call" danger>
              <PhoneOff className="h-4 w-4" />
            </RoundButton>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <DeviceSelect
              label="Microphone"
              kind="audioinput"
              devices={micDevices}
              value={micDeviceId}
              onRefresh={() => void refreshDevices("audio")}
              onChange={(id) => void switchDevice("audioinput", id)}
            />
            {wantsVideo ? (
              <DeviceSelect
                label="Camera"
                kind="videoinput"
                devices={camDevices}
                value={camDeviceId}
                onRefresh={() => void refreshDevices("video")}
                onChange={(id) => void switchDevice("videoinput", id)}
              />
            ) : null}
          </div>
        </>
      )}

      {/* Mobile call bar — the controls travel with you while you watch. */}
      {phase === "joined" ? (
        <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-center gap-4 border-t border-zinc-800 bg-zinc-950/95 px-4 py-3 backdrop-blur lg:hidden">
          <RoundButton onClick={toggleMic} active={audioOn} label={audioOn ? "Mute microphone" : "Unmute microphone"} title="">
            {audioOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </RoundButton>
          {wantsVideo ? (
            <RoundButton onClick={toggleCam} active={videoOn} label={videoOn ? "Turn camera off" : "Turn camera on"} title="">
              {videoOn ? <Camera className="h-5 w-5" /> : <CameraOff className="h-5 w-5" />}
            </RoundButton>
          ) : null}
          <RoundButton onClick={cleanup} active={false} label="Leave the call" title="" danger>
            <PhoneOff className="h-5 w-5" />
          </RoundButton>
          <span className="text-[11px] font-semibold text-zinc-400">
            {peers.length + 1} in call
          </span>
        </div>
      ) : null}
    </div>
  );
}

function formatClock(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function RoundButton({
  onClick,
  active,
  label,
  title,
  danger,
  children,
}: {
  onClick: () => void;
  active: boolean;
  label: string;
  title: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={title}
      className={`flex h-10 w-10 items-center justify-center rounded-full transition ${
        danger
          ? "bg-red-600 text-white hover:bg-red-500"
          : active
            ? "bg-zinc-200 text-black"
            : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
      }`}
    >
      {children}
    </button>
  );
}

function DeviceSelect({
  label,
  devices,
  value,
  onRefresh,
  onChange,
}: {
  label: string;
  kind: MediaDeviceKind;
  devices: MediaDeviceInfo[];
  value: string;
  onRefresh: () => void;
  onChange: (deviceId: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-zinc-500">
        {label}
        <button
          type="button"
          onClick={onRefresh}
          aria-label={`Refresh ${label.toLowerCase()} list`}
          className="inline-flex h-5 w-5 items-center justify-center rounded text-zinc-600 hover:text-zinc-300 transition"
        >
          <RefreshCw className="h-3 w-3" />
        </button>
      </span>
      <div className="flex items-center gap-1.5">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs text-white outline-none transition focus:border-red-500"
        >
          {devices.length === 0 ? (
            <option value="">Default device</option>
          ) : null}
          {devices.map((d) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label || `Device ${d.deviceId.slice(0, 4)}`}
            </option>
          ))}
        </select>
      </div>
    </label>
  );
}