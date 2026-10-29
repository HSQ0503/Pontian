"use client";

import { Mic, MonitorSpeaker, Pause, Play, RotateCcw, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useCopy } from "@/lib/mf/copy";
import { bytes, clock } from "@/lib/mf/format";
import { Button, cx, Select } from "./ui";

export type Recording = { blob: Blob; duration: number; startedAt: Date };

type Phase = "idle" | "starting" | "recording" | "paused" | "done";

type Session = {
  recorder: MediaRecorder;
  streams: MediaStream[];
  context: AudioContext;
  analyser: AnalyserNode;
  chunks: Blob[];
  startedAt: Date;
  accumulated: number;
  resumedAt: number;
  timer: number;
  frame: number;
  wakeLock: WakeLockSentinel | null;
  levels: number[];
};

const MIME_TYPES = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4;codecs=mp4a.40.2", "audio/mp4", "audio/webm"];

const elapsedOf = (session: Session) =>
  session.accumulated + (session.recorder.state === "recording" ? performance.now() - session.resumedAt : 0);

function release(session: Session) {
  clearInterval(session.timer);
  cancelAnimationFrame(session.frame);
  session.streams.forEach((stream) => stream.getTracks().forEach((track) => track.stop()));
  session.context.close().catch(() => {});
  session.wakeLock?.release().catch(() => {});
}

export function Recorder({ onChange }: { onChange: (recording: Recording | null) => void }) {
  const { c } = useCopy();
  const [phase, setPhase] = useState<Phase>("idle");
  const [withSystem, setWithSystem] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [warning, setWarning] = useState("");
  const [result, setResult] = useState<{ url: string; size: number; duration: number } | null>(null);
  const session = useRef<Session | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const ref = session;
    return () => {
      if (ref.current) release(ref.current);
    };
  }, []);

  useEffect(() => {
    if (phase !== "recording" && phase !== "paused") return;
    const guard = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [phase]);

  function draw() {
    const current = session.current;
    const element = canvas.current;
    if (!current || !element) return;
    const data = new Uint8Array(current.analyser.fftSize);
    current.analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (const value of data) sum += ((value - 128) / 128) ** 2;
    const level = current.recorder.state === "recording" ? Math.min(1, Math.sqrt(sum / data.length) * 4.2) : 0;
    current.levels.push(level);
    if (current.levels.length > 160) current.levels.shift();

    const ratio = window.devicePixelRatio || 1;
    const width = element.clientWidth;
    const height = element.clientHeight;
    if (element.width !== width * ratio) {
      element.width = width * ratio;
      element.height = height * ratio;
    }
    const g = element.getContext("2d");
    if (!g) return;
    g.setTransform(ratio, 0, 0, ratio, 0, 0);
    g.clearRect(0, 0, width, height);
    const bar = 3;
    const gap = 3;
    const count = Math.floor(width / (bar + gap));
    const levels = current.levels.slice(-count);
    levels.forEach((value, index) => {
      const h = Math.max(2, value * (height - 6));
      const x = width - (levels.length - index) * (bar + gap);
      g.fillStyle = index > levels.length - 6 ? "#ffffff" : `rgba(255,255,255,${0.25 + (index / levels.length) * 0.55})`;
      g.beginPath();
      g.roundRect(x, (height - h) / 2, bar, h, 1.5);
      g.fill();
    });
    current.frame = requestAnimationFrame(draw);
  }

  async function start() {
    setWarning("");
    setPhase("starting");
    const streams: MediaStream[] = [];
    try {
      streams.push(
        await navigator.mediaDevices.getUserMedia({
          audio: { deviceId: deviceId ? { exact: deviceId } : undefined, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        }),
      );
    } catch {
      setWarning(c.source.noMic);
      setPhase("idle");
      return;
    }

    if (withSystem) {
      try {
        const display = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        display.getVideoTracks().forEach((track) => track.stop());
        if (display.getAudioTracks().length) streams.push(display);
        else setWarning(c.source.noSystemAudio);
      } catch {
        setWarning(c.source.noSystemAudio);
      }
    }

    const context = new AudioContext();
    const destination = context.createMediaStreamDestination();
    const analyser = context.createAnalyser();
    analyser.fftSize = 1024;
    // Mixing in an AudioContext puts the room (microphone) and the call (shared tab) in one track.
    for (const stream of streams) {
      const source = context.createMediaStreamSource(stream);
      source.connect(destination);
      source.connect(analyser);
    }
    const mimeType = MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
    const recorder = new MediaRecorder(destination.stream, { mimeType, audioBitsPerSecond: 64_000 });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    recorder.start(1000);

    const wakeLock = await navigator.wakeLock?.request("screen").catch(() => null);
    session.current = {
      recorder,
      streams,
      context,
      analyser,
      chunks,
      startedAt: new Date(),
      accumulated: 0,
      resumedAt: performance.now(),
      timer: window.setInterval(() => session.current && setElapsed(elapsedOf(session.current)), 250),
      frame: 0,
      wakeLock: wakeLock ?? null,
      levels: [],
    };
    session.current.frame = requestAnimationFrame(draw);
    setPhase("recording");
    navigator.mediaDevices
      .enumerateDevices()
      .then((list) => setDevices(list.filter((device) => device.kind === "audioinput" && device.deviceId)))
      .catch(() => {});
  }

  function pause() {
    const current = session.current;
    if (!current) return;
    if (current.recorder.state === "recording") {
      current.accumulated = elapsedOf(current);
      current.recorder.pause();
      setPhase("paused");
    } else {
      current.resumedAt = performance.now();
      current.recorder.resume();
      setPhase("recording");
    }
  }

  function stop() {
    const current = session.current;
    if (!current) return;
    const duration = elapsedOf(current) / 1000;
    current.recorder.onstop = () => {
      const blob = new Blob(current.chunks, { type: current.recorder.mimeType || "audio/webm" });
      release(current);
      session.current = null;
      setResult({ url: URL.createObjectURL(blob), size: blob.size, duration });
      setElapsed(duration * 1000);
      setPhase("done");
      onChange({ blob, duration, startedAt: current.startedAt });
    };
    current.recorder.stop();
  }

  function discard() {
    if (result) URL.revokeObjectURL(result.url);
    setResult(null);
    setElapsed(0);
    setPhase("idle");
    onChange(null);
  }

  const live = phase === "recording" || phase === "paused";

  if (phase === "done" && result) {
    return (
      <div className="mf-rise flex flex-col gap-5">
        <div className="flex items-center gap-4 rounded-none border border-mf-400 bg-mf-50 p-4">
          <span className="flex size-11 items-center justify-center rounded-none bg-white text-black">
            <Mic className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[13.5px] font-semibold text-white">{c.source.recorded}</div>
            <div className="mf-num mt-0.5 text-[12px] text-mf-700">
              {clock(result.duration)} · {bytes(result.size)}
            </div>
          </div>
          <Button size="sm" variant="ghost" icon={<RotateCcw className="size-3.5" />} onClick={discard}>
            {c.source.discard}
          </Button>
        </div>
        <audio src={result.url} controls className="w-full" style={{ colorScheme: "dark" }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {!live && (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-[12.5px] font-medium text-mf-700">{c.source.mic}</span>
            <Select value={deviceId} onChange={(event) => setDeviceId(event.target.value)}>
              <option value="">Padrão do sistema / System default</option>
              {devices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || device.deviceId.slice(0, 8)}
                </option>
              ))}
            </Select>
          </label>
          <button
            type="button"
            role="switch"
            aria-checked={withSystem}
            onClick={() => setWithSystem((value) => !value)}
            className={cx(
              "flex items-start gap-3 rounded-none border px-3.5 py-2.5 text-left transition-colors",
              withSystem ? "border-white bg-mf-200" : "border-mf-400 bg-mf-50 hover:border-mf-600",
            )}
          >
            <MonitorSpeaker className={cx("mt-0.5 size-4 shrink-0", withSystem ? "text-white" : "text-mf-700")} />
            <span className="flex-1">
              <span className="block text-[13px] font-semibold text-white">{c.source.system}</span>
              <span className="mt-0.5 block text-[11.5px] leading-snug text-mf-700">{c.source.systemHelp}</span>
            </span>
            <span className={cx("mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-none p-0.5 transition-colors", withSystem ? "bg-white" : "bg-mf-400")}>
              <span className={cx("size-4 rounded-none transition-transform", withSystem ? "translate-x-4 bg-black" : "bg-mf-800")} />
            </span>
          </button>
        </div>
      )}

      <div className="relative overflow-hidden rounded-none border border-mf-400 bg-mf-50">
        <div className="mf-grid-bg absolute inset-0 opacity-40" />
        <div className="relative flex flex-col items-center px-6 py-10">
          {live ? (
            <>
              <div className="flex items-center gap-2.5">
                <span className={cx("size-2.5 rounded-full", phase === "recording" ? "mf-blink bg-mf-rec" : "bg-mf-600")} />
                <span className="mf-eyebrow text-mf-800">{phase === "recording" ? c.source.recording : c.source.paused}</span>
              </div>
              <div className="mf-num mt-3 text-[52px] font-medium leading-none tracking-tight text-white">{clock(elapsed / 1000)}</div>
              <canvas ref={canvas} className="mt-7 h-16 w-full max-w-lg" />
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Button variant="secondary" icon={phase === "recording" ? <Pause className="size-4" /> : <Play className="size-4" />} onClick={pause}>
                  {phase === "recording" ? c.source.pause : c.source.resume}
                </Button>
                <Button variant="primary" icon={<Square className="size-3.5 fill-current" />} onClick={stop}>
                  {c.source.stop}
                </Button>
              </div>
              <p className="mt-5 text-[12px] text-mf-600">{c.source.keepOpen}</p>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={start}
                disabled={phase === "starting"}
                aria-label={c.source.start}
                className="group relative flex size-24 items-center justify-center rounded-full bg-white transition-transform duration-200 hover:scale-[1.04] disabled:opacity-60"
              >
                <span className="size-8 rounded-full bg-mf-rec transition-transform duration-200 group-hover:scale-110" />
              </button>
              <div className="mt-6 text-[15px] font-semibold text-white">{c.source.start}</div>
              <p className="mt-2 max-w-sm text-center text-[12.5px] leading-relaxed text-mf-700">{c.source.recordLead}</p>
            </>
          )}
        </div>
      </div>
      {warning && <p className="rounded-none border border-mf-warn/40 bg-mf-warn/10 px-3.5 py-2.5 text-[12.5px] text-mf-warn">{warning}</p>}
    </div>
  );
}
