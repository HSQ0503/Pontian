"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import styles from "./construction.module.css";
import type { BidMode, SceneKind } from "./construction-scene";
import { BOARD_STACK, CORE_X, DOORS, LIFT, QUOTED, WALLS, doorById, leafTip, planPieces, type Door, type Range } from "./construction-floor";

const FloorScene = dynamic(() => import("./construction-scene"), { ssr: false });

const INK = "#17191a";
const SELECT = "#fed603";
const OK = "#007dfe";

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
const useReducedMotion = () => useSyncExternalStore(subscribeToMotion, () => window.matchMedia(MOTION).matches, () => false);
const useNarrow = () => useSyncExternalStore(subscribeToNarrow, () => window.matchMedia(NARROW).matches, () => false);

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

// Mounts the 3D view once it nears the viewport, then pauses rendering
// whenever it scrolls out of view.
function useViewportPresence<T extends HTMLElement>() {
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

// The plan drawing renders first and stays when WebGL is unavailable.
function FloorView({ scene, fallback, label, className = "", children }: { scene: SceneKind; fallback: ReactNode; label: string; className?: string; children?: ReactNode }) {
  const webgl = useSyncExternalStore(noSubscription, hasWebGL, () => false);
  const instant = useReducedMotion();
  const { ref, near, visible } = useViewportPresence<HTMLDivElement>();
  const [ready, setReady] = useState(false);
  const live = near && webgl;
  return (
    <div ref={ref} className={`${styles.viewport} ${className}`} role="img" aria-label={label}>
      <div className={styles.fallback} data-hidden={(live && ready) || undefined}>{fallback}</div>
      {live && <FloorScene {...scene} active={visible} instant={instant} onReady={() => setReady(true)} />}
      {near && !webgl && <p className={styles.fallbackNote}>Plan view. The 3D view needs WebGL.</p>}
      {children}
    </div>
  );
}

type ExampleProps = { title: string; children: ReactNode; situation: ReactNode; finding: ReactNode; next: ReactNode; findingLabel?: string };

function Example({ title, children, situation, finding, next, findingLabel = "Finding for review" }: ExampleProps) {
  return (
    <figure className={styles.example}>
      <figcaption className={styles.exampleBar}>
        <span className={styles.exampleTag}>Example workflow</span>
        <span className={styles.exampleTitle}>{title}</span>
        <span className={styles.exampleNote}>Illustration, not a client project</span>
      </figcaption>
      <div className={styles.exampleBody}>{children}</div>
      <ol className={styles.outcome}>
        <li data-role="situation"><span className={styles.outcomeLabel}>Situation</span>{situation}</li>
        <li data-role="finding"><span className={styles.outcomeLabel}>{findingLabel}</span>{finding}</li>
        <li data-role="next"><span className={styles.outcomeLabel}>Next step for your team</span>{next}</li>
      </ol>
    </figure>
  );
}

function Toggle<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (value: T) => void }) {
  return (
    <div className={styles.toggle} role="group" aria-label={label}>
      {options.map((option) => (
        <button key={option.value} type="button" aria-pressed={value === option.value} onClick={() => onChange(option.value)}>{option.label}</button>
      ))}
    </div>
  );
}

/* Plan fallbacks, drawn from the same layout as the model. */

type PlanDoor = "normal" | "ok" | "selected" | "ghost" | "none";
type PlanMark = { at: [number, number]; title: string; detail?: string; state?: "ok" | "finding" };

function swingPath(door: Door) {
  const open = door.open || Math.PI / 2;
  const points = Array.from({ length: 13 }, (_, index) => leafTip(door, (open * index) / 12));
  return points.map(([x, z]) => `${x.toFixed(3)},${z.toFixed(3)}`).join(" ");
}

function FloorPlan({ view, revised = false, doors = () => "normal", fills = [], marks = [], highlightOpening }: {
  view: [number, number, number, number];
  revised?: boolean;
  doors?: (door: Door) => PlanDoor;
  fills?: { x: Range; z: Range }[];
  marks?: PlanMark[];
  highlightOpening?: boolean;
}) {
  const [x0, z0, width, depth] = view;
  const walls = WALLS.filter((wall) => revised || wall.kind !== "added");
  return (
    <div className={styles.plan} style={{ "--ratio": width / depth } as CSSProperties}>
      <svg viewBox={`${x0} ${z0} ${width} ${depth}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <rect x={-0.3} y={-0.3} width={36.6} height={14.6} fill="#fff" />
        {fills.map((fill, index) => <rect key={index} x={fill.x[0]} y={fill.z[0]} width={fill.x[1] - fill.x[0]} height={fill.z[1] - fill.z[0]} fill={SELECT} opacity={0.45} />)}
        <rect x={LIFT.x[0]} y={LIFT.z[0]} width={LIFT.x[1] - LIFT.x[0]} height={LIFT.z[1] - LIFT.z[0]} fill="#e4e4e2" />
        {walls.flatMap((wall) => planPieces(wall).map((piece, index) => (
          <rect key={`${wall.kind}-${wall.axis}-${wall.at}-${wall.from}-${index}`} x={piece.x[0]} y={piece.z[0]} width={piece.x[1] - piece.x[0]} height={piece.z[1] - piece.z[0]} fill={wall.kind === "added" ? SELECT : INK} stroke={wall.kind === "added" ? INK : "none"} strokeWidth={1} vectorEffect="non-scaling-stroke" />
        )))}
        {WALLS.flatMap((wall) => wall.openings.filter((opening) => opening.sill !== undefined).map((opening) => {
          const along = [opening.from, opening.to];
          const [x1, x2, y1, y2] = wall.axis === "x" ? [along[0], along[1], wall.at, wall.at] : [wall.at, wall.at, along[0], along[1]];
          return <line key={`${wall.axis}-${wall.at}-${wall.kind}-${opening.from}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#9a9b9b" strokeWidth={1} vectorEffect="non-scaling-stroke" />;
        }))}
        {DOORS.filter((door) => door.kind !== "added" || revised).map((door) => {
          const state = doors(door);
          if (state === "none") return null;
          const tip = leafTip(door, door.open || Math.PI / 2);
          const color = state === "ok" ? OK : INK;
          return (
            <g key={door.id} opacity={state === "ghost" ? 0.6 : 1}>
              <line x1={door.hinge[0]} y1={door.hinge[1]} x2={tip[0]} y2={tip[1]} stroke={color} strokeWidth={state === "selected" ? 2.5 : 1.5} strokeDasharray={state === "ghost" ? "4 3" : undefined} vectorEffect="non-scaling-stroke" />
              <polyline points={swingPath(door)} fill="none" stroke="#9a9b9b" strokeWidth={1} strokeDasharray={state === "ghost" ? "4 3" : undefined} vectorEffect="non-scaling-stroke" />
            </g>
          );
        })}
        {highlightOpening && <rect x={CORE_X - 0.35} y={6.4} width={0.45} height={1.2} fill="none" stroke={INK} strokeDasharray="4 3" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />}
      </svg>
      {marks.map((mark) => (
        <span key={mark.title + (mark.detail ?? "")} className={styles.planMark} data-state={mark.state} style={{ left: `${((mark.at[0] - x0) / width) * 100}%`, top: `${((mark.at[1] - z0) / depth) * 100}%` }}>
          <strong>{mark.title}</strong>
          {mark.detail && <span>{mark.detail}</span>}
        </span>
      ))}
    </div>
  );
}

const roomOf = (id: string): { x: Range; z: Range } => {
  const door = doorById(id);
  const x = door.hinge[0] - 0.5;
  return door.swing === 1 ? { x: [x + 0.06, x + 3.94], z: [0, 5.94] } : { x: [x + 0.06, x + 3.94], z: [8.06, 14] };
};

/* 1. Check the bid */

export function BidCheck() {
  const [mode, setMode] = useState<BidMode>("quote");
  const doors = (door: Door): PlanDoor => {
    if (door.kind !== "fitout") return "normal";
    if (QUOTED.has(door.id)) return mode === "quote" ? "ok" : "normal";
    return mode === "quote" ? "ghost" : "selected";
  };
  return (
    <Example
      title="Level 2 fit-out bid"
      situation={<p>You’re pricing the Level 2 doors.</p>}
      finding={<p><strong>D11 and D12 may be missing from the quote.</strong> It could be deliberate. Your estimator decides.</p>}
      next={<p>Ask the sub to confirm the door count before the bid goes out.</p>}
    >
      <div className={styles.counts} role="group" aria-label="Compare the drawing with the quote">
        <button type="button" aria-pressed={mode === "drawing"} onClick={() => setMode("drawing")}>
          <span className={styles.countValue}>12</span>
          <span className={styles.countText}>doors on the drawing</span>
        </button>
        <button type="button" aria-pressed={mode === "quote"} onClick={() => setMode("quote")}>
          <span className={styles.countValue}>10</span>
          <span className={styles.countText}>doors in the quote</span>
        </button>
      </div>
      <FloorView
        scene={{ kind: "bid", mode }}
        label={mode === "quote"
          ? "3D model of the Level 2 floor. Doors D1 to D10 are marked as quoted. D11 and D12, in the two rooms nearest the stair core, are not in the quote."
          : "3D model of the Level 2 floor with all twelve doors from the drawing. D11 and D12 are highlighted."}
        fallback={<FloorPlan view={[-0.6, -0.6, 37.2, 15.2]} doors={doors} fills={mode === "quote" ? ["D11", "D12"].map(roomOf) : []} marks={[{ at: [27, 11.4], title: "D11 and D12", detail: mode === "quote" ? "Not in the quote" : "On the drawing", state: mode === "quote" ? "finding" : undefined }]} />}
      />
      <p className={styles.quoteLine}>
        <span className={styles.quoteSource}>Door sub’s quote, line 1</span>
        <span>Interior doors D1 to D10, supply and install</span>
        <strong>Qty 10</strong>
      </p>
    </Example>
  );
}

/* 2. Understand the change */

const CHANGE_MARKS: PlanMark[] = [
  { at: [6.3, 6], title: "New walls and doors", detail: "Not in quote Q-2047" },
  { at: [BOARD_STACK.x + 1.2, BOARD_STACK.z + 0.6], title: "Studs and boards", detail: "Not on order MO-112" },
  { at: [2, 2.6], title: "Electrical first fix", detail: "Booked for the current rooms" },
];

export function ChangeImpact() {
  const [revised, setRevised] = useState(true);
  return (
    <Example
      title="Client asks for two more rooms"
      situation={<p>The quote and the orders are already placed.</p>}
      finding={<p><strong>Three open questions for the change review.</strong> Nothing is approved.</p>}
      next={<p>Review the impact and send the client a change proposal.</p>}
    >
      <Toggle
        label="Plan version"
        value={revised ? "revised" : "current"}
        onChange={(value) => setRevised(value === "revised")}
        options={[{ value: "current", label: "Current plan" }, { value: "revised", label: "With two more rooms" }]}
      />
      <FloorView
        className={styles.changeView}
        scene={{ kind: "change", revised }}
        label={revised
          ? "3D model of the west end of Level 2. Two new rooms are added in the open area, highlighted. Three questions: the new walls and doors are not in quote Q-2047; their studs and boards are not on material order MO-112; electrical first fix is booked for the current rooms."
          : "3D model of the west end of Level 2, with the open area as currently planned."}
        fallback={<FloorPlan view={[-0.6, -0.6, 16.8, 15.2]} revised={revised} fills={revised ? ["A", "B"].map(roomOf) : []} marks={revised ? CHANGE_MARKS : []} />}
      />
    </Example>
  );
}

/* 3. Check what's built */

export function SiteCheck() {
  const [open, setOpen] = useState(false);
  const stacked = useNarrow();
  const corridorEnd: [number, number, number, number] = [25.6, 4.6, 10.9, 4.8];
  return (
    <Example
      title="Level 2 corridor, door C-14"
      situation={<p>The 14 May capture shows the same opening.</p>}
      finding={<p><strong>No door visible in this capture.</strong> That doesn’t mean it’s missing.</p>}
      next={<p>Ask the site team to check C-14.</p>}
    >
      <FloorView
        className={styles.splitView}
        scene={{ kind: "site", stacked }}
        label="Two matched views down the Level 2 corridor toward opening C-14. Left, the project model, with a door in C-14. Right, the 14 May site capture, where the opening has studs and no door."
        fallback={
          <div className={styles.sitePlans}>
            <div><FloorPlan view={corridorEnd} marks={[{ at: [CORE_X - 0.1, 6.5], title: "C-14", detail: "Door in the model", state: "ok" }]} /></div>
            <div><FloorPlan view={corridorEnd} doors={(door) => (door.id === "C-14" ? "none" : "normal")} highlightOpening marks={[{ at: [CORE_X - 0.1, 6.5], title: "C-14", detail: "No door visible", state: "finding" }]} /></div>
          </div>
        }
      >
        <div className={styles.splitTags} aria-hidden="true">
          <span>Model</span>
          <span>Site capture, 14 May, 10:20</span>
        </div>
      </FloorView>
      <div className={styles.siteFinding} data-open={open}>
        <button type="button" className={styles.siteFindingToggle} aria-expanded={open} onClick={() => setOpen(!open)}>
          <span>Is the door late, or just not in yet?</span>
          <span className={styles.findingAction}>{open ? "Hide the install schedule" : "Check the install schedule"} <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" /></span>
        </button>
        {open && (
          <p className={styles.siteContext}>
            <strong>Install update, 12 May:</strong> Level 2 core doors, C-14 included, go in on 16 May. That’s two days after this capture. The site team confirms what’s there now.
          </p>
        )}
      </div>
    </Example>
  );
}

/* 4. Find a way forward */

type Tone = "late" | "wait" | "moved" | "blocked" | "planned";
type Bar = { start: number; span: number; tone: Tone; text: string };
type Plan = "wait" | "move";
type Row = { activity: string; bars: Record<Plan, Bar[]>; from?: Bar };

const SLOTS = 7;
const ROWS: Row[] = [
  { activity: "Flooring delivery", bars: { wait: [{ start: 2, span: 1, tone: "late", text: "Late" }], move: [{ start: 2, span: 1, tone: "late", text: "Late" }] } },
  { activity: "Floor laying", bars: { wait: [{ start: 0, span: 2, tone: "wait", text: "Crew waits" }, { start: 3, span: 2, tone: "planned", text: "After delivery" }], move: [{ start: 3, span: 2, tone: "blocked", text: "Still after delivery" }] } },
  { activity: "Ceiling fixtures", bars: { wait: [{ start: 5, span: 1, tone: "planned", text: "After the floor" }], move: [{ start: 0, span: 1, tone: "moved", text: "Moved up" }] }, from: { start: 5, span: 1, tone: "planned", text: "" } },
  { activity: "Wall painting", bars: { wait: [{ start: 5, span: 1, tone: "planned", text: "After the floor" }], move: [{ start: 1, span: 1, tone: "moved", text: "Moved up" }] }, from: { start: 5, span: 1, tone: "planned", text: "" } },
  { activity: "Final clean", bars: { wait: [{ start: 6, span: 1, tone: "planned", text: "Last" }], move: [{ start: 6, span: 1, tone: "blocked", text: "Still last" }] } },
];

const barStyle = (bar: Bar) => ({ "--start": bar.start, "--span": bar.span, "--slots": SLOTS } as CSSProperties);

export function WayForward() {
  const [plan, setPlan] = useState<Plan>("move");
  return (
    <Example
      title="Flooring delivery is late"
      situation={<p>The finishes were queued behind it.</p>}
      findingLabel="Result for review"
      finding={<p><strong>A different order of work to review.</strong> It rests on assumptions the planner hasn’t checked.</p>}
      next={<p>The planner checks it before anything is rescheduled.</p>}
    >
      <div className={styles.board}>
        <div className={styles.boardHead}>
          <Toggle
            label="Sequence"
            value={plan}
            onChange={setPlan}
            options={[{ value: "wait", label: "Wait for the floor" }, { value: "move", label: "Do other work first" }]}
          />
          <span className={styles.boardAxis} aria-hidden="true">Earlier <ArrowRight size={13} strokeWidth={1.5} /> Later</span>
        </div>
        <ul className={styles.rows} aria-live="polite">
          {ROWS.map((row) => {
            const bars = row.bars[plan];
            return (
              <li key={row.activity}>
                <span className={styles.rowLabel}>
                  {row.activity}
                  <span className={styles.rowStatus}>{bars.map((bar) => bar.text).join(", then ")}</span>
                </span>
                <span className={styles.track}>
                  {row.from && plan === "move" && <span className={styles.ghostBar} style={barStyle(row.from)} />}
                  {bars.map((bar, index) => (
                    <span key={index === bars.length - 1 ? "main" : `extra-${index}`} className={styles.bar} data-tone={bar.tone} style={barStyle(bar)}>{bar.text}</span>
                  ))}
                </span>
              </li>
            );
          })}
        </ul>
        <p className={styles.tradeoff}>
          {plan === "wait"
            ? "The floor crew waits, then the finishes follow."
            : "Finished walls may need protecting while the floor goes in. Assumes the rooms, materials and crew are free."}
        </p>
      </div>
    </Example>
  );
}
