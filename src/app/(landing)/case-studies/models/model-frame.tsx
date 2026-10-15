"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react";
import { InteractionCue } from "../../industries/[industry]/interaction-cue";
import styles from "./model.module.css";

export { InteractionCue };

/* Environment: reduced motion, narrow screens, WebGL, viewport presence. */

function subscribeTo(query: string) {
  return (update: () => void) => {
    const media = window.matchMedia(query);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  };
}
const MOTION = "(prefers-reduced-motion: reduce)";
const NARROW = "(max-width: 700px)";
const subscribeToMotion = subscribeTo(MOTION);
const subscribeToNarrow = subscribeTo(NARROW);

export const useReducedMotion = () => useSyncExternalStore(subscribeToMotion, () => window.matchMedia(MOTION).matches, () => false);
export const useNarrow = () => useSyncExternalStore(subscribeToNarrow, () => window.matchMedia(NARROW).matches, () => false);

let webglSupport: boolean | null = null;
function hasWebGL() {
  if (webglSupport === null) {
    try {
      const canvas = document.createElement("canvas");
      webglSupport = Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
    } catch {
      webglSupport = false;
    }
  }
  return webglSupport;
}
const noSubscription = () => () => {};
export const useWebGL = () => useSyncExternalStore(noSubscription, hasWebGL, () => false);

// Mounts the 3D view once it nears the viewport, then pauses rendering while it is off screen.
export function useViewportPresence<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [near, setNear] = useState(false);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const nearObserver = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setNear(true); }, { rootMargin: "600px 0px" });
    const visibleObserver = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: "80px 0px" });
    nearObserver.observe(element);
    visibleObserver.observe(element);
    return () => { nearObserver.disconnect(); visibleObserver.disconnect(); };
  }, []);
  return { ref, near, visible };
}

/* Frame */

export function ModelFigure({ title, note = "Example data, not client records", children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <figure className={styles.figure}>
      <figcaption className={styles.bar}>
        <span className={styles.tag}>Example illustration</span>
        <span className={styles.title}>{title}</span>
        <span className={styles.note}>{note}</span>
      </figcaption>
      <div className={styles.body}>{children}</div>
    </figure>
  );
}

export type SceneRuntime = { active: boolean; instant: boolean; onReady: () => void };

type ViewportProps = {
  label: string;
  fallback: ReactNode;
  scene: (runtime: SceneRuntime) => ReactNode;
  shape?: "wide" | "square" | "tall";
  onModel?: (live: boolean) => void;
  children?: ReactNode;
};

// The drawing paints first and stays when WebGL is unavailable. With reduced
// motion the model still loads, but every change is instant.
export function ModelViewport({ label, fallback, scene, shape = "wide", onModel, children }: ViewportProps) {
  const webgl = useWebGL();
  const instant = useReducedMotion();
  const { ref, near, visible } = useViewportPresence<HTMLDivElement>();
  const [ready, setReady] = useState(false);
  const live = near && webgl;
  const showing = live && ready;
  const onReady = useCallback(() => setReady(true), []);
  useEffect(() => { onModel?.(showing); }, [showing, onModel]);
  return (
    <div ref={ref} className={styles.viewport} data-shape={shape} role="img" aria-label={label}>
      <div className={styles.fallback} data-hidden={showing || undefined}>{fallback}</div>
      {live && scene({ active: visible, instant, onReady })}
      {near && !webgl && <p className={styles.fallbackNote}>Drawing view. The 3D model needs WebGL.</p>}
      {children}
    </div>
  );
}

/* Controls */

export function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: readonly { value: T; label: string }[]; onChange: (value: T) => void }) {
  return (
    <div className={styles.segmented} role="group" aria-label={label}>
      {options.map((option) => (
        <button key={option.value} type="button" aria-pressed={value === option.value} onClick={() => onChange(option.value)}>{option.label}</button>
      ))}
    </div>
  );
}

export function StepRail({ label, steps, current, onChange }: { label: string; steps: readonly string[]; current: number; onChange: (index: number) => void }) {
  return (
    <ol className={styles.steps} aria-label={label} style={{ "--count": steps.length } as CSSProperties}>
      {steps.map((step, index) => (
        <li key={step}>
          <button type="button" aria-current={index === current ? "step" : undefined} data-done={index < current} onClick={() => onChange(index)}>
            <span className={styles.stepIndex}>{String(index + 1).padStart(2, "0")}</span>
            <span className={styles.stepLabel}>{step}</span>
          </button>
        </li>
      ))}
    </ol>
  );
}

// Previous / next, plus Play when motion is allowed. Play stops on the last step.
export function useStepPlayer(count: number, interval = 2600) {
  const reduced = useReducedMotion();
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing || reduced) return;
    const timer = window.setTimeout(() => {
      if (current >= count - 1) setPlaying(false);
      else setCurrent(current + 1);
    }, interval);
    return () => window.clearTimeout(timer);
  }, [playing, reduced, current, count, interval]);
  const go = useCallback((index: number) => { setPlaying(false); setCurrent(Math.max(0, Math.min(count - 1, index))); }, [count]);
  const toggle = useCallback(() => {
    if (playing) { setPlaying(false); return; }
    if (current >= count - 1) setCurrent(0);
    setPlaying(true);
  }, [playing, current, count]);
  return { current, go, playing: playing && !reduced, toggle, canPlay: !reduced };
}

export function StepPlayer({ current, count, go, playing, toggle, canPlay }: ReturnType<typeof useStepPlayer> & { count: number }) {
  return (
    <div className={styles.stepPlayer}>
      <button type="button" className={styles.textButton} disabled={current === 0} onClick={() => go(current - 1)}><ArrowLeft size={15} strokeWidth={1.5} aria-hidden="true" /> Previous</button>
      <button type="button" className={styles.textButton} disabled={current === count - 1} onClick={() => go(current + 1)}>Next <ArrowRight size={15} strokeWidth={1.5} aria-hidden="true" /></button>
      {canPlay && (
        <button type="button" className={styles.textButton} onClick={toggle}>
          {playing ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
          {playing ? "Pause" : "Play the example"}
        </button>
      )}
    </div>
  );
}

/* Readouts */

export function Caption({ children }: { children: ReactNode }) {
  return <p className={styles.caption} aria-live="polite">{children}</p>;
}

export type RowState = "ok" | "select" | "blocked" | "muted";

export function Panel({ heading, rows }: { heading: string; rows: { key: string; title: ReactNode; detail?: ReactNode; state?: RowState }[] }) {
  return (
    <div className={styles.panel}>
      <p className={styles.panelHead}>{heading}</p>
      {rows.map((row) => (
        <p key={row.key} className={styles.panelRow} data-state={row.state}>
          <strong>{row.title}</strong>
          {row.detail && <span>{row.detail}</span>}
        </p>
      ))}
    </div>
  );
}

const SWATCHES = {
  select: { label: "Selected", swatch: "#fed603", edge: "inset 0 0 0 1px #17191a" },
  ok: { label: "Ready or proposed", swatch: "#007dfe" },
  blocked: { label: "Needs attention", swatch: "#f51625" },
} as const;

export function Legend({ items, labels = {} }: { items: readonly (keyof typeof SWATCHES)[]; labels?: Partial<Record<keyof typeof SWATCHES, string>> }) {
  return (
    <ul className={styles.legend} aria-label="Colour key">
      {items.map((item) => {
        const swatch = SWATCHES[item];
        return <li key={item} style={{ "--swatch": swatch.swatch, "--edge": "edge" in swatch ? swatch.edge : "none" } as CSSProperties}>{labels[item] ?? swatch.label}</li>;
      })}
    </ul>
  );
}

export function PlanChip({ x, y, title, detail, state }: { x: number; y: number; title: string; detail?: string; state?: RowState }) {
  return (
    <span className={styles.planChip} data-state={state === "muted" ? undefined : state} style={{ left: `${x}%`, top: `${y}%` }}>
      <strong>{title}</strong>
      {detail && <span>{detail}</span>}
    </span>
  );
}

export const frame = styles;
