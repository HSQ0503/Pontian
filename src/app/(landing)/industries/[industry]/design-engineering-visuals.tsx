"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { RotateCcw } from "lucide-react";
import {
  BEAMS, BUILDING, CEILING, CLASH, DUCT, HOUSE, MISSING_WINDOW, UNITS, WALL_HEIGHT, WALLS, WINDOWS,
  boxFaces, isometric, toPoints, wallById, type Point, type WindowMark,
} from "./design-engineering-model";
import type { PlantFocus, SceneProps } from "./design-engineering-scene";
import styles from "./design-engineering.module.css";
import { InteractionCue } from "./interaction-cue";

const DesignScene = dynamic(() => import("./design-engineering-scene"), { ssr: false });

function subscribeToMotion(update: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", update);
  return () => media.removeEventListener("change", update);
}
function useReducedMotion() {
  return useSyncExternalStore(subscribeToMotion, () => window.matchMedia("(prefers-reduced-motion: reduce)").matches, () => true);
}

let webglSupport: boolean | undefined;
function detectWebGL() {
  if (webglSupport === undefined) {
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

type SceneInput = SceneProps extends infer P ? (P extends unknown ? Omit<P, "onReady" | "active"> : never) : never;

// The drawing paints first and stays for reduced motion or no WebGL.
function SceneView({ scene, fallback, label, className = "" }: { scene: SceneInput; fallback: ReactNode; label: string; className?: string }) {
  const reduced = useReducedMotion();
  const webgl = useSyncExternalStore(noSubscription, detectWebGL, () => false);
  const { ref, near, visible } = useViewportPresence<HTMLDivElement>();
  const [ready, setReady] = useState(false);
  const live = near && webgl && !reduced;
  return (
    <div ref={ref} className={`${styles.viewport} ${className}`} role="img" aria-label={label}>
      {!(live && ready) && <div className={styles.fallback}>{fallback}</div>}
      {live && <DesignScene {...(scene as SceneProps)} active={visible} onReady={() => setReady(true)} />}
    </div>
  );
}

/* Shared anatomy ---------------------------------------------------------- */

type ExampleProps = { title: string; children: ReactNode; situation: ReactNode; result: ReactNode; next: ReactNode; resultLabel?: string };

function Example({ title, children, situation, result, next, resultLabel = "Finding for review" }: ExampleProps) {
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
        <li data-role="result" aria-live="polite"><span className={styles.outcomeLabel}>{resultLabel}</span>{result}</li>
        <li data-role="next"><span className={styles.outcomeLabel}>Next step for your team</span>{next}</li>
      </ol>
    </figure>
  );
}

function State({ tone, children }: { tone: "ok" | "blocked" | "neutral"; children: ReactNode }) {
  return <span className={styles.state} data-tone={tone}>{children}</span>;
}

type Box = [number, number];
const at = (x: number, y: number, box: Box): CSSProperties => ({ left: `${(x / box[0]) * 100}%`, top: `${(y / box[1]) * 100}%` });

type PinProps = { x: number; y: number; box: Box; title: string; detail?: string; state?: "ok" | "blocked"; place?: "above" | "below"; leader?: number };

function Pin({ x, y, box, title, detail, state, place = "above", leader = 30 }: PinProps) {
  return (
    <span className={styles.pin} data-state={state} data-place={place} style={{ ...at(x, y, box), "--leader": `${leader}px` } as CSSProperties}>
      <i className={styles.pinLeader} />
      <span className={styles.pinChip}><strong>{title}</strong>{detail && <span>{detail}</span>}</span>
    </span>
  );
}

function Note({ x, y, box, children, align = "center", tone, vertical }: { x: number; y: number; box: Box; children: ReactNode; align?: "center" | "start" | "end"; tone?: "strong" | "muted" | "blue"; vertical?: boolean }) {
  return <span className={styles.note} data-align={align} data-tone={tone} data-vertical={vertical} style={at(x, y, box)}>{children}</span>;
}

function Drawing({ box, children, overlay, className, viewBox }: { box: Box; children: ReactNode; overlay?: ReactNode; className?: string; viewBox?: string }) {
  return (
    <div className={`${styles.drawing} ${className ?? ""}`}>
      <svg viewBox={viewBox ?? `0 0 ${box[0]} ${box[1]}`} aria-hidden="true">{children}</svg>
      <div className={styles.overlay} aria-hidden="true">{overlay}</div>
    </div>
  );
}

function pressable(onActivate: () => void) {
  return {
    role: "button",
    tabIndex: 0,
    onClick: onActivate,
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onActivate();
      }
    },
  };
}

/* 1. Create the first model ---------------------------------------------- */

const PLAN_BOX: Box = [400, 272];
const PK = 30;
const px = (x: number) => 56 + x * PK;
const py = (y: number) => 40 + y * PK;
const WALL_TAGS: Record<string, [number, number, "center" | "start"]> = { W1: [150, 64, "center"], W2: [328, 108, "center"], W3: [150, 197, "center"], W4: [84, 108, "center"], W5: [246, 72, "start"] };

function PlanDrawing({ selected, onSelect }: { selected: string; onSelect: (id: string) => void }) {
  return (
    <div role="group" aria-label="Ground floor plan, 10.00 by 6.00 metres, with the five walls the tool read from it. Select a wall to find it in the model.">
      <Drawing
        box={PLAN_BOX}
        overlay={
          <>
            <Note x={206} y={11} box={PLAN_BOX}>10.00 m</Note>
            <Note x={146} y={258} box={PLAN_BOX}>6.00 m</Note>
            <Note x={296} y={258} box={PLAN_BOX}>4.00 m</Note>
            <Note x={13} y={130} box={PLAN_BOX} vertical>6.00 m</Note>
            {WALLS.map((wall) => {
              const [x, y, align] = WALL_TAGS[wall.id];
              return <Note key={wall.id} x={x} y={y} box={PLAN_BOX} align={align} tone={wall.id === selected ? "strong" : "blue"}>{wall.id}</Note>;
            })}
          </>
        }
      >
        <g className={styles.dimension}>
          <line x1={px(0)} y1={22} x2={px(10)} y2={22} />
          <line x1={px(0)} y1={17} x2={px(0)} y2={27} /><line x1={px(10)} y1={17} x2={px(10)} y2={27} />
          <line x1={px(0)} y1={242} x2={px(10)} y2={242} />
          {[0, 6, 10].map((x) => <line key={x} x1={px(x)} y1={237} x2={px(x)} y2={247} />)}
          <line x1={28} y1={py(0)} x2={28} y2={py(6)} />
          <line x1={23} y1={py(0)} x2={33} y2={py(0)} /><line x1={23} y1={py(6)} x2={33} y2={py(6)} />
        </g>
        <rect x={px(0)} y={py(0)} width={10 * PK} height={6 * PK} fill="#fff" />
        <rect x={px(0) - 7} y={py(0) - 7} width={10 * PK + 14} height={6 * PK + 14} className={styles.floorOutline} />
        {WALLS.map((wall) => {
          const active = wall.id === selected;
          const width = (wall.x1 - wall.x0) * PK;
          const height = (wall.y1 - wall.y0) * PK;
          return (
            <g key={wall.id} className={styles.pickable} aria-label={`${wall.id}, ${wall.name}`} aria-pressed={active} {...pressable(() => onSelect(wall.id))}>
              <rect x={px(wall.x0) - 6} y={py(wall.y0) - 6} width={width + 12} height={height + 12} fill="transparent" />
              {!active && <rect x={px(wall.x0) - 2.5} y={py(wall.y0) - 2.5} width={width + 5} height={height + 5} className={styles.proposedWall} />}
              <rect x={px(wall.x0)} y={py(wall.y0)} width={width} height={height} className={active ? styles.selectedWall : styles.sourceWall} />
            </g>
          );
        })}
      </Drawing>
    </div>
  );
}

const ISO_BOX: Box = [420, 300];
const ISO = isometric(20, 174, 92);

function ModelDrawing({ selected, confirmed }: { selected: string; confirmed: boolean }) {
  const slab = boxFaces(ISO, { x0: 0, x1: BUILDING.width, y0: 0, y1: BUILDING.depth, z0: -BUILDING.slab, z1: 0 });
  const order = ["W1", "W4", "W5", "W2", "W3"].map(wallById);
  const wall = wallById(selected);
  const top = ISO((wall.x0 + wall.x1) / 2, (wall.y0 + wall.y1) / 2, confirmed ? WALL_HEIGHT : 0);
  const corner = ISO(BUILDING.width - 0.15, BUILDING.depth - 0.15, 0);
  return (
    <Drawing
      box={ISO_BOX}
      className={styles.fallbackDrawing}
      overlay={
        <>
          <Pin x={top[0]} y={top[1]} box={ISO_BOX} title={`${wall.id} · ${wall.name}`} detail={confirmed ? `${wall.length}, 3.00 m high` : `${wall.length}, height not set`} />
          {!confirmed && <Pin x={corner[0]} y={corner[1]} box={ISO_BOX} state="blocked" place="below" title="Wall height" detail="Not on the drawing" />}
        </>
      }
    >
      <polygon points={slab.south} fill="#c4c5c1" stroke="#17191a" strokeWidth="0.75" />
      <polygon points={slab.east} fill="#b3b4b0" stroke="#17191a" strokeWidth="0.75" />
      <polygon points={slab.top} fill="#e2e2df" stroke="#17191a" strokeWidth="0.75" />
      {order.map((item) => {
        const active = item.id === selected;
        const faces = boxFaces(ISO, { ...item, z0: 0, z1: confirmed ? WALL_HEIGHT : 0.04 });
        if (!confirmed) return <polygon key={item.id} points={faces.top} fill={active ? "#fed603" : "#7fb9ff"} stroke={active ? "#17191a" : "#007dfe"} strokeWidth="0.75" />;
        return (
          <g key={item.id} stroke={active ? "#17191a" : "#4a4c4d"} strokeWidth={active ? 1 : 0.6} strokeLinejoin="round">
            <polygon points={faces.south} fill={active ? "#f2cb00" : "#dededb"} />
            <polygon points={faces.east} fill={active ? "#e3be00" : "#cdcdca"} />
            <polygon points={faces.top} fill={active ? "#fed603" : "#f7f7f5"} />
          </g>
        );
      })}
    </Drawing>
  );
}

export function FirstModel() {
  const [selected, setSelected] = useState("W5");
  const [confirmed, setConfirmed] = useState(false);
  const wall = wallById(selected);
  return (
    <Example
      title="Ground floor plan, two rooms"
      situation={<p>A clean 1:100 plan. Two rooms, five walls.</p>}
      resultLabel={confirmed ? "Result for review" : "Finding for review"}
      result={confirmed
        ? <p><strong>Editable starting model.</strong> Five walls and a floor at 3.00 m. Nothing invented.</p>
        : <p><strong>Wall height isn’t on the drawing.</strong> No walls get built until someone confirms it.</p>}
      next={<p>Your engineer checks it and carries on.</p>}
    >
      <InteractionCue line="You can use this." steps={["Click a wall", "Confirm the height"]} />
      <div className={styles.modelGrid}>
        <div className={styles.panel}>
          <p className={styles.panelTitle}>Source plan</p>
          <PlanDrawing selected={selected} onSelect={setSelected} />
          <div className={styles.readings}>
            <State tone="ok">Scale and wall types read</State>
          </div>
          {confirmed ? (
            <div className={styles.answer}>
              <State tone="ok">Wall height 3.00 m, confirmed</State>
              <button type="button" className={styles.textButton} onClick={() => setConfirmed(false)}><RotateCcw size={14} strokeWidth={1.6} aria-hidden="true" /> Reset</button>
            </div>
          ) : (
            <div className={styles.question} data-state="blocked">
              <p><strong>Wall height?</strong> The drawing doesn’t say.</p>
              <button type="button" className={styles.primaryButton} onClick={() => setConfirmed(true)}>Confirm 3.00 m</button>
            </div>
          )}
        </div>
        <SceneView
          className={styles.modelView}
          scene={{ kind: "model", selected, confirmed, onSelect: setSelected }}
          fallback={<ModelDrawing selected={selected} confirmed={confirmed} />}
          label={confirmed ? `3D model: five walls and a floor at 3.00 m. ${wall.id} is selected.` : `3D view: the floor with five proposed wall positions, waiting for a wall height. ${wall.id} is selected.`}
        />
      </div>
      <p className={styles.caption}>An illustration, not a downloadable model.</p>
    </Example>
  );
}

/* 2. Check how designs fit ----------------------------------------------- */

const SECTION_BOX: Box = [600, 220];
const SK = 90;
const sx = (x: number) => 30 + x * SK;
const sy = (depth: number) => 61.6 + depth * SK;

function SectionDrawing({ structure, ventilation, reroute }: { structure: boolean; ventilation: boolean; reroute: boolean }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const ductTop = reroute ? DUCT.loweredTop : DUCT.top;
  const overlap = structure && ventilation && !reroute;
  return (
    <Drawing
      box={SECTION_BOX}
      className={styles.fallbackDrawing}
      overlay={overlap
        ? <Pin x={sx((CLASH.x0 + CLASH.x1) / 2)} y={sy(CLASH.top)} box={SECTION_BOX} state="blocked" leader={36} title={`${DUCT.id} runs through B-13`} detail="Same space in both models" />
        : reroute && ventilation ? <Pin x={sx((CLASH.x0 + CLASH.x1) / 2)} y={sy(DUCT.loweredTop + DUCT.height)} box={SECTION_BOX} place="below" leader={16} title="Possible revision" detail="Needs both teams to review" /> : null}
    >
      <defs>
        <pattern id={`concrete-${id}`} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="7" height="7" fill="#e6e6e3" />
          <line x1="0" y1="0" x2="0" y2="7" stroke="#b9bab7" strokeWidth="0.75" />
        </pattern>
      </defs>
      <line x1={sx(0)} y1={sy(CEILING)} x2={sx(6)} y2={sy(CEILING)} className={styles.reference} />
      <g className={styles.concrete} fill={`url(#concrete-${id})`} opacity={structure ? 1 : 0.25}>
        <rect x={sx(0)} y={40} width={6 * SK} height={21.6} />
        {BEAMS.map((beam) => <rect key={beam.id} x={sx(beam.x0)} y={sy(0) - 0.75} width={(beam.x1 - beam.x0) * SK} height={beam.depth * SK + 0.75} />)}
      </g>
      <g opacity={ventilation ? 1 : 0.25}>
        {reroute && <rect x={sx(0)} y={sy(DUCT.top)} width={6 * SK} height={DUCT.height * SK} className={styles.ghost} />}
        <rect x={sx(0)} y={sy(ductTop)} width={6 * SK} height={DUCT.height * SK} className={styles.duct} strokeDasharray={reroute ? "8 4" : undefined} />
      </g>
      {overlap && <rect x={sx(CLASH.x0)} y={sy(CLASH.top)} width={(CLASH.x1 - CLASH.x0) * SK} height={(CLASH.bottom - CLASH.top) * SK} fill="#f51625" fillOpacity="0.6" stroke="#17191a" strokeWidth="1.25" />}
    </Drawing>
  );
}

export function DesignFit() {
  const [structure, setStructure] = useState(true);
  const [ventilation, setVentilation] = useState(true);
  const [reroute, setReroute] = useState(false);
  const clash = structure && ventilation && !reroute;
  return (
    <Example
      title="Corridor ceiling, level 3"
      situation={<p>Two teams, two models, one corridor.</p>}
      result={reroute
        ? <p><strong>A lower route clears the beam.</strong> Whether it works is the teams’ call.</p>
        : <p><strong>Duct SD-04 runs through beam B-13.</strong></p>}
      next={<p>The two leads agree a route.</p>}
    >
      <div className={styles.controls}>
        <div className={styles.toggles} role="group" aria-label="Show or hide each discipline">
          <button type="button" aria-pressed={structure} onClick={() => setStructure(!structure)}><span className={styles.swatch} data-discipline="structure" aria-hidden="true" />Structure</button>
          <button type="button" aria-pressed={ventilation} onClick={() => setVentilation(!ventilation)}><span className={styles.swatch} data-discipline="ventilation" aria-hidden="true" />Ventilation</button>
        </div>
        <button type="button" className={styles.textButton} aria-pressed={reroute} disabled={!ventilation} onClick={() => setReroute(!reroute)}>
          {reroute ? <><RotateCcw size={14} strokeWidth={1.6} aria-hidden="true" /> Original route</> : "Try a lower route"}
        </button>
      </div>
      <InteractionCue line="Switch the option." steps={["Switch a discipline", "Try a lower route"]} />
      <SceneView
        className={styles.wideView}
        scene={{ kind: "clash", structure, ventilation, reroute }}
        fallback={<SectionDrawing structure={structure} ventilation={ventilation} reroute={reroute} />}
        label={clash ? "Section through the corridor ceiling: supply duct SD-04 passes through the bottom of beam B-13. The overlap is marked in red." : `Section through the corridor ceiling showing ${structure && ventilation ? "a lowered duct route under beam B-13" : structure ? "the structure only" : ventilation ? "the ventilation only" : "neither discipline"}.`}
      />
      <p className={styles.caption}>Geometry only. Clearance and code checks need their own rules.</p>
    </Example>
  );
}

/* 3. Understand revisions ------------------------------------------------ */

const ROOM_BOX: Box = [520, 372];
const RK = 90;
const rx = (x: number) => 35 + x * RK;
const ry = (y: number) => 36 + y * RK;
const rect = (x0: number, y0: number, x1: number, y1: number) => ({ x: rx(x0), y: ry(y0), width: (x1 - x0) * RK, height: (y1 - y0) * RK });

const QUESTIONS: { id: PlantFocus; area: string; question: string; owner: string }[] = [
  { id: "space", area: "Space", question: "Is there still room to service it?", owner: "Mechanical lead · requirement R-03" },
  { id: "connections", area: "Connections", question: "Do the pipes still line up?", owner: "Mechanical designer · supplier drawing, rev 2" },
  { id: "support", area: "Supporting design", question: "Do the base and power supply still work?", owner: "Structural and electrical · decision DD-07" },
];

function PlantDrawing({ focus, unit }: { focus: PlantFocus; unit: "approved" | "proposed" }) {
  const on = (part: PlantFocus) => focus === part;
  const current = UNITS[unit];
  return (
    <Drawing
      box={ROOM_BOX}
      className={styles.fallbackDrawing}
      overlay={<Note x={rx(1.15)} y={ry(2.875)} box={ROOM_BOX} tone="muted">Existing tank</Note>}
    >
      <rect {...rect(0, 0, 5, 3.4)} fill="#fff" stroke="#17191a" strokeWidth="5" />
      <line x1={rx(3.8)} y1={ry(3.4)} x2={rx(4.7)} y2={ry(3.4)} stroke="#fff" strokeWidth="7" />
      <rect {...rect(0.3, 2.55, 2.0, 3.2)} fill="#efefed" stroke={on("space") ? "#17191a" : "#9a9b9b"} strokeWidth={on("space") ? 1.5 : 1} />
      <rect {...rect(current.x0, current.y1, current.x1, current.y1 + 0.8)} fill={on("space") ? "#fed603" : "#007dfe"} fillOpacity={on("space") ? 0.4 : 0.15} stroke={on("space") ? "#17191a" : "#007dfe"} strokeDasharray="5 3" />
      <rect {...rect(0.7, 0.4, 2.1, 1.4)} fill={on("support") ? "#fed603" : "none"} fillOpacity="0.4" stroke={on("support") ? "#17191a" : "#b9bab7"} strokeWidth={on("support") ? 1.75 : 1} strokeDasharray="9 3 2 3" />
      {unit === "proposed" && <rect {...rect(UNITS.approved.x0, UNITS.approved.y0, UNITS.approved.x1, UNITS.approved.y1)} fill="none" stroke="#9a9b9b" strokeDasharray="4 3" />}
      <rect {...rect(current.x0, current.y0, current.x1, current.y1)} fill="#e4e6e8" stroke="#17191a" strokeWidth="1.5" />
      {UNITS.approved.connections.map((y) => <line key={y} x1={rx(unit === "proposed" ? current.x1 + 0.24 : current.x1)} y1={ry(y)} x2={rx(5)} y2={ry(y)} stroke={on("connections") ? "#17191a" : "#a9aaa7"} strokeWidth={on("connections") ? 2.5 : 1.5} />)}
      {current.connections.map((y) => <circle key={y} cx={rx(current.x1 + 0.07)} cy={ry(y)} r="5" fill={on("connections") ? "#fed603" : "#fff"} stroke="#17191a" strokeWidth="1.5" />)}
    </Drawing>
  );
}

export function RevisionScope() {
  const [focus, setFocus] = useState<PlantFocus>("space");
  const [unit, setUnit] = useState<"approved" | "proposed">("proposed");
  return (
    <Example
      title="Plant room, replacement unit"
      situation={<p>The supplier swaps the {UNITS.approved.size} unit for a {UNITS.proposed.size} one.</p>}
      result={<p><strong>Three things to check.</strong> None confirmed as a problem.</p>}
      next={<p>Each discipline checks its part.</p>}
    >
      <InteractionCue line="You can use this." steps={["Switch the unit", "Click a check"]} />
      <div className={styles.revisionGrid}>
        <SceneView
          className={styles.plantView}
          scene={{ kind: "plant", focus, unit }}
          fallback={<PlantDrawing focus={focus} unit={unit} />}
          label={`Plant room with the ${unit} unit. ${unit === "proposed" ? "The larger unit overhangs its base, its pipe connections no longer meet the pipes, and its access space comes closer to the existing tank." : "The approved unit sits on its base and meets its pipes."}`}
        />
        <div className={styles.side}>
          <div className={styles.segment} role="group" aria-label="Which unit">
            <button type="button" aria-pressed={unit === "approved"} onClick={() => setUnit("approved")}>Approved unit</button>
            <button type="button" aria-pressed={unit === "proposed"} onClick={() => setUnit("proposed")}>Proposed unit</button>
          </div>
          <div className={styles.questions} role="group" aria-label="What to check">
            {QUESTIONS.map((item) => (
              <button key={item.id} type="button" className={styles.check} aria-pressed={focus === item.id} onClick={() => setFocus(item.id)}>
                <span className={styles.checkArea}>{item.area}</span>
                <span className={styles.checkQuestion}>{item.question}</span>
                <span className={styles.checkOwner}>{item.owner}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Example>
  );
}

/* 4. Prepare the deliverables -------------------------------------------- */

const HOUSE_BOX: Box = [440, 320];
const HOUSE_ISO = isometric(30, 180, 110);

function windowPoint(item: WindowMark, z: number): Point {
  const middle = (item.from + item.to) / 2;
  return item.side === "South" ? HOUSE_ISO(middle, HOUSE.depth, z) : HOUSE_ISO(HOUSE.length, middle, z);
}

function windowShape(item: WindowMark) {
  const { length, depth, sill, head } = HOUSE;
  const corners: Point[] = item.side === "South"
    ? [HOUSE_ISO(item.from, depth, sill), HOUSE_ISO(item.to, depth, sill), HOUSE_ISO(item.to, depth, head), HOUSE_ISO(item.from, depth, head)]
    : [HOUSE_ISO(length, item.from, sill), HOUSE_ISO(length, item.to, sill), HOUSE_ISO(length, item.to, head), HOUSE_ISO(length, item.from, head)];
  return toPoints(corners);
}

function HouseDrawing({ selected, corrected }: { selected: string | null; corrected: boolean }) {
  const body = boxFaces(HOUSE_ISO, { x0: 0, x1: HOUSE.length, y0: 0, y1: HOUSE.depth, z0: 0, z1: HOUSE.height });
  const missing = WINDOWS.find((item) => item.mark === MISSING_WINDOW) ?? WINDOWS[2];
  const [pinX, pinY] = windowPoint(missing, HOUSE.head);
  return (
    <Drawing
      box={HOUSE_BOX}
      className={styles.fallbackDrawing}
      overlay={<Pin x={pinX} y={pinY} box={HOUSE_BOX} state={corrected ? "ok" : "blocked"} leader={46} title={MISSING_WINDOW} detail={corrected ? "Now in the schedule" : "Not in the schedule"} />}
    >
      <polygon points={body.south} fill="#ececea" stroke="#17191a" strokeWidth="1" strokeLinejoin="round" />
      <polygon points={body.east} fill="#d9d9d6" stroke="#17191a" strokeWidth="1" strokeLinejoin="round" />
      <polygon points={body.top} fill="#f8f8f6" stroke="#17191a" strokeWidth="1" strokeLinejoin="round" />
      {WINDOWS.map((item) => (
        <polygon key={item.mark} points={windowShape(item)} fill={selected === item.mark ? "#fed603" : "#c9def8"} stroke="#17191a" strokeWidth={selected === item.mark ? 1.75 : 1} />
      ))}
    </Drawing>
  );
}

export function Deliverables() {
  const [corrected, setCorrected] = useState(false);
  const [selected, setSelected] = useState<string | null>(MISSING_WINDOW);
  const listed = corrected ? WINDOWS : WINDOWS.filter((item) => item.mark !== MISSING_WINDOW);
  return (
    <Example
      title="Window schedule, drafted from the model"
      situation={<p>A reviewed model with four windows.</p>}
      resultLabel={corrected ? "Result for review" : "Finding for review"}
      result={corrected
        ? <p><strong>Four of four.</strong> Ready for review, not approved.</p>
        : <p><strong>The draft schedule lists three.</strong></p>}
      next={<p>Your team reviews it before it goes out.</p>}
    >
      <InteractionCue line="Click the finding." steps={["Click a window", "Add it to the schedule"]} />
      <div className={styles.documentGrid}>
        <SceneView
          className={styles.windowsView}
          scene={{ kind: "windows", selected, corrected, onSelect: (mark) => setSelected(mark) }}
          fallback={<HouseDrawing selected={selected} corrected={corrected} />}
          label={`Building model with four windows: W01 and W02 on the south side, W03 and W04 on the east side.${corrected ? "" : " W03 is not in the draft schedule."}`}
        />
        <div className={styles.panel}>
          <div className={styles.scheduleHead}>
            <p className={styles.panelTitle}>Window schedule</p>
            <span className={styles.count} data-state={corrected ? "ok" : "blocked"}>{listed.length} of {WINDOWS.length}</span>
          </div>
          <div className={styles.schedule}>
            <span className={styles.scheduleRow} data-head aria-hidden="true"><span>Mark</span><span>Size, mm</span><span>Type</span></span>
            {WINDOWS.map((item) => (corrected || item.mark !== MISSING_WINDOW) ? (
              <button key={item.mark} type="button" className={styles.scheduleRow} aria-pressed={selected === item.mark} data-added={corrected && item.mark === MISSING_WINDOW} onClick={() => setSelected(item.mark)}>
                <span>{item.mark}</span><span>{item.size}</span><span>{item.type}</span>
              </button>
            ) : (
              <button key={item.mark} type="button" className={styles.missingRow} aria-pressed={selected === item.mark} onClick={() => setSelected(item.mark)}>
                <span>{item.mark} missing</span><span>{item.size}</span><span>{item.type}</span>
              </button>
            ))}
          </div>
          {corrected ? (
            <div className={styles.answer}>
              <State tone="ok">Ready for review</State>
              <button type="button" className={styles.textButton} onClick={() => { setCorrected(false); setSelected(MISSING_WINDOW); }}><RotateCcw size={14} strokeWidth={1.6} aria-hidden="true" /> Back to the draft</button>
            </div>
          ) : (
            <button type="button" className={styles.primaryButton} onClick={() => { setCorrected(true); setSelected(MISSING_WINDOW); }}>Add W03 from the model</button>
          )}
        </div>
      </div>
    </Example>
  );
}
