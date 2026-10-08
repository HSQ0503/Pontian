"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore, type CSSProperties, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import dynamic from "next/dynamic";
import { ArrowRight, Check, RotateCcw } from "lucide-react";
import { BUILDING, WALL_HEIGHT, WALLS, boxFaces, isometric, toPoints, wallById, type Point } from "./design-engineering-model";
import styles from "./design-engineering.module.css";

const PlanModelScene = dynamic(() => import("./design-engineering-scene"), { ssr: false });

function subscribeToMotion(update: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", update);
  return () => media.removeEventListener("change", update);
}
function useReducedMotion() {
  return useSyncExternalStore(subscribeToMotion, () => window.matchMedia("(prefers-reduced-motion: reduce)").matches, () => false);
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
const subscribeToNothing = () => () => {};

function useNear(target: RefObject<HTMLElement | null>) {
  const [near, setNear] = useState(false);
  useEffect(() => {
    const element = target.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setNear(true);
        observer.disconnect();
      }
    }, { rootMargin: "600px 0px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, [target]);
  return near;
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

type StepState = "done" | "current" | "blocked" | "later";

function Steps({ label, steps }: { label: string; steps: { title: string; detail: string; state: StepState }[] }) {
  return (
    <ol className={styles.steps} aria-label={label}>
      {steps.map((step, index) => (
        <li key={step.title} data-state={step.state}>
          <span className={styles.stepIndex}>{step.state === "done" ? <Check size={13} strokeWidth={2.2} aria-hidden="true" /> : index + 1}</span>
          <span className={styles.stepText}><strong>{step.title}</strong><span>{step.detail}</span></span>
        </li>
      ))}
    </ol>
  );
}

function State({ tone, children }: { tone: "ok" | "blocked" | "neutral"; children: ReactNode }) {
  return <span className={styles.state} data-tone={tone}>{children}</span>;
}

type Box = [number, number];
const at = (x: number, y: number, box: Box): CSSProperties => ({ left: `${(x / box[0]) * 100}%`, top: `${(y / box[1]) * 100}%` });

type PinProps = { x: number; y: number; box: Box; title: string; detail?: string; state?: "selected" | "blocked" | "proposed" | "finding"; place?: "above" | "below"; align?: "center" | "start" | "end"; leader?: number };

function Pin({ x, y, box, title, detail, state, place = "above", align = "center", leader = 30 }: PinProps) {
  return (
    <span className={styles.pin} data-state={state} data-place={place} data-align={align} style={{ ...at(x, y, box), "--leader": `${leader}px` } as CSSProperties}>
      <i className={styles.pinDot} />
      <i className={styles.pinLeader} />
      <span className={styles.pinChip}><strong>{title}</strong>{detail && <span>{detail}</span>}</span>
    </span>
  );
}

function Note({ x, y, box, children, align = "center", tone, vertical, optional }: { x: number; y: number; box: Box; children: ReactNode; align?: "center" | "start" | "end"; tone?: "strong" | "muted" | "blue"; vertical?: boolean; optional?: boolean }) {
  return <span className={styles.note} data-align={align} data-tone={tone} data-vertical={vertical} data-optional={optional} style={at(x, y, box)}>{children}</span>;
}

function Drawing({ box, label, children, overlay, className }: { box: Box; label: string; children: ReactNode; overlay?: ReactNode; className?: string }) {
  return (
    <div className={`${styles.drawing} ${className ?? ""}`} role="img" aria-label={label}>
      <svg viewBox={`0 0 ${box[0]} ${box[1]}`} aria-hidden="true">{children}</svg>
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

function PlanDrawing({ selected, interpret, onSelect }: { selected: string; interpret: boolean; onSelect: (id: string) => void }) {
  return (
    <Drawing
      box={PLAN_BOX}
      label={`Ground floor plan, 10.00 by 6.00 metres, two rooms divided by an interior wall.${interpret ? " Proposed walls W1 to W5 and the floor outline are marked over the drawing." : ""}`}
      overlay={
        <>
          <Note x={206} y={11} box={PLAN_BOX}>10.00 m</Note>
          <Note x={146} y={258} box={PLAN_BOX}>6.00 m</Note>
          <Note x={296} y={258} box={PLAN_BOX}>4.00 m</Note>
          <Note x={13} y={130} box={PLAN_BOX} vertical>6.00 m</Note>
          <Note x={150} y={150} box={PLAN_BOX} tone="strong">Room 1</Note>
          <Note x={292} y={150} box={PLAN_BOX} tone="strong">Room 2</Note>
          {interpret && WALLS.map((wall) => {
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
      {interpret && <rect x={px(0) - 7} y={py(0) - 7} width={10 * PK + 14} height={6 * PK + 14} className={styles.floorOutline} />}
      {WALLS.map((wall) => {
        const active = wall.id === selected;
        const width = (wall.x1 - wall.x0) * PK;
        const height = (wall.y1 - wall.y0) * PK;
        return (
          <g key={wall.id} className={styles.pickable} aria-label={`${wall.id}, ${wall.name}`} aria-pressed={active} {...pressable(() => onSelect(wall.id))}>
            <rect x={px(wall.x0) - 6} y={py(wall.y0) - 6} width={width + 12} height={height + 12} fill="transparent" />
            {interpret && !active && <rect x={px(wall.x0) - 2.5} y={py(wall.y0) - 2.5} width={width + 5} height={height + 5} className={styles.proposedWall} />}
            <rect x={px(wall.x0)} y={py(wall.y0)} width={width} height={height} className={active ? styles.selectedWall : styles.sourceWall} />
          </g>
        );
      })}
    </Drawing>
  );
}

const ISO_BOX: Box = [420, 300];
const ISO = isometric(20, 174, 92);

function ModelFallback({ selected, confirmed }: { selected: string; confirmed: boolean }) {
  const slab = boxFaces(ISO, { x0: 0, x1: BUILDING.width, y0: 0, y1: BUILDING.depth, z0: -BUILDING.slab, z1: 0 });
  const order = ["W1", "W4", "W5", "W2", "W3"].map(wallById);
  const wall = wallById(selected);
  const top = ISO((wall.x0 + wall.x1) / 2, (wall.y0 + wall.y1) / 2, confirmed ? WALL_HEIGHT : 0);
  const corner = ISO(BUILDING.width - 0.15, BUILDING.depth - 0.15, 0);
  return (
    <Drawing
      box={ISO_BOX}
      className={styles.fallbackDrawing}
      label={confirmed ? "The floor and the same five walls, created at the confirmed 3.00 metre height." : "The floor with the five proposed wall positions. The walls are not created until the wall height is confirmed."}
      overlay={
        <>
          <Pin x={top[0]} y={top[1]} box={ISO_BOX} state="selected" title={`${wall.id} ${wall.name}`} detail={confirmed ? `${wall.length}, 3.00 m high` : `${wall.length}, height not set`} />
          {!confirmed && <Pin x={corner[0]} y={corner[1]} box={ISO_BOX} state="blocked" place="below" title="Wall height" detail="Needs confirmation" />}
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

function ModelViewer({ selected, confirmed, onSelect }: { selected: string; confirmed: boolean; onSelect: (id: string) => void }) {
  const frame = useRef<HTMLDivElement>(null);
  const near = useNear(frame);
  const webgl = useSyncExternalStore(subscribeToNothing, detectWebGL, () => false);
  const reduced = useReducedMotion();
  const [ready, setReady] = useState(false);
  return (
    <div ref={frame} className={styles.scene}>
      <div className={styles.sceneFallback} data-hidden={ready}><ModelFallback selected={selected} confirmed={confirmed} /></div>
      {near && webgl && (
        <div className={styles.sceneLayer} data-ready={ready} role="img" aria-label={confirmed ? "3D view: the floor and the same five walls at the confirmed 3.00 metre height. No doors, roof, or materials are added." : "3D view: the floor with the five proposed wall positions. The walls are not created until the wall height is confirmed."}>
          <PlanModelScene selected={selected} confirmed={confirmed} reduced={reduced} onSelect={onSelect} onReady={() => setReady(true)} />
        </div>
      )}
    </div>
  );
}

export function FirstModel() {
  const [selected, setSelected] = useState("W5");
  const [confirmed, setConfirmed] = useState(false);
  const [interpret, setInterpret] = useState(true);
  return (
    <Example
      title="Ground floor plan, two rooms"
      situation={<p>A dimensioned plan: <strong>one floor, two rooms, five walls</strong>, drawn at 1:100.</p>}
      resultLabel={confirmed ? "Result for review" : "Finding for review"}
      result={confirmed
        ? <p><strong>Editable starting model.</strong> Five walls and one floor at the confirmed 3.00 m height. Nothing else is added.</p>
        : <p><strong>Wall height needs confirmation.</strong> The walls aren’t created until it is confirmed.</p>}
      next={<p>Engineer reviews the model and resolves remaining details.</p>}
    >
      <Steps label="Workflow stages" steps={[
        { title: "Source plan", detail: "Dimensioned, scale 1:100", state: "done" },
        { title: "Check the interpretation", detail: confirmed ? "All inputs confirmed" : "Wall height needs confirmation", state: confirmed ? "done" : "blocked" },
        { title: "First model", detail: confirmed ? "Editable starting model" : "Waiting for one input", state: confirmed ? "current" : "later" },
      ]} />
      <div className={styles.modelGrid}>
        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <p className={styles.panelTitle}>{interpret ? "Plan with proposed walls" : "Source plan"}</p>
            <button type="button" className={styles.switch} aria-pressed={interpret} onClick={() => setInterpret(!interpret)}>
              <span className={styles.switchTrack} aria-hidden="true"><span /></span>Show interpretation
            </button>
          </div>
          <PlanDrawing selected={selected} interpret={interpret} onSelect={setSelected} />
          <dl className={styles.inputs}>
            <div><dt>Drawing scale</dt><dd>1:100</dd><State tone="ok">Found on drawing</State></div>
            <div><dt>Wall type</dt><dd>Exterior 300 mm, interior 100 mm</dd><State tone="ok">Project template</State></div>
            <div data-open={!confirmed}>
              <dt>Wall height</dt>
              <dd>{confirmed ? "3.00 m" : "Not shown on the plan"}</dd>
              {confirmed
                ? <State tone="ok">Confirmed</State>
                : <button type="button" className={styles.confirm} onClick={() => setConfirmed(true)}>Confirm 3.00 m</button>}
            </div>
          </dl>
          {!confirmed && <p className={styles.panelNote}>The template suggests 3.00 m. The project engineer confirms it.</p>}
        </div>
        <div className={styles.panel} data-focus="true">
          <div className={styles.panelHead}>
            <p className={styles.panelTitle}>First model</p>
            {confirmed ? <State tone="ok">Editable starting model</State> : <State tone="blocked">Waiting for wall height</State>}
          </div>
          <ModelViewer selected={selected} confirmed={confirmed} onSelect={setSelected} />
          <div className={styles.panelFoot}>
            <p>{confirmed ? "Five walls and one floor. No doors, roof, or materials are invented." : "Select a wall in the plan or the model to trace it across both."}</p>
            {confirmed && <button type="button" className={styles.textButton} onClick={() => setConfirmed(false)}><RotateCcw size={14} strokeWidth={1.6} aria-hidden="true" /> Reset example</button>}
          </div>
          <p className={styles.caption}>Illustration of the resulting model, not a downloadable file.</p>
        </div>
      </div>
    </Example>
  );
}

/* 2. Check how designs fit ----------------------------------------------- */

const SECTION_BOX: Box = [600, 220];
const SK = 90;
const sx = (x: number) => 30 + x * SK;
const sy = (depth: number) => 61.6 + depth * SK;
const BEAMS = [
  { id: "B-12", x0: 1.4, x1: 1.8, depth: 0.35 },
  { id: "B-13", x0: 4.2, x1: 4.6, depth: 0.8 },
];
const DUCT = { top: 0.5, height: 0.45, loweredTop: 0.85 };
const CEILING = 1.45;
const CLASH = { x0: 4.2, x1: 4.6, top: 0.5, bottom: 0.8 };

type SectionProps = { structural: boolean; ventilation: boolean; revised?: boolean; focus?: boolean; viewBox?: string; labels?: boolean };

function SectionGeometry({ structural, ventilation, revised = false, focus = false, viewBox }: SectionProps) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const ductTop = revised ? DUCT.loweredTop : DUCT.top;
  const overlap = structural && ventilation && !revised;
  return (
    <svg viewBox={viewBox ?? `0 0 ${SECTION_BOX[0]} ${SECTION_BOX[1]}`} aria-hidden="true">
      <defs>
        <pattern id={`concrete-${id}`} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="7" height="7" fill="#e6e6e3" />
          <line x1="0" y1="0" x2="0" y2="7" stroke="#b9bab7" strokeWidth="0.75" />
        </pattern>
        <pattern id={`overlap-${id}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" fill="#fed603" />
          <line x1="0" y1="0" x2="0" y2="6" stroke="#17191a" strokeWidth="1.4" />
        </pattern>
      </defs>
      <line x1={sx(0)} y1={sy(CEILING)} x2={sx(6)} y2={sy(CEILING)} className={styles.reference} />
      {structural && (
        <g className={styles.concrete} fill={`url(#concrete-${id})`}>
          <rect x={sx(0)} y={40} width={6 * SK} height={21.6} />
          {BEAMS.map((beam) => (
            <rect key={beam.id} x={sx(beam.x0)} y={sy(0) - 0.75} width={(beam.x1 - beam.x0) * SK} height={beam.depth * SK + 0.75} strokeWidth={focus && beam.id === "B-13" ? 2.5 : 1.25} />
          ))}
        </g>
      )}
      {ventilation && (
        <g>
          {revised && <rect x={sx(0)} y={sy(DUCT.top)} width={6 * SK} height={DUCT.height * SK} className={styles.ghost} />}
          <rect x={sx(0)} y={sy(ductTop)} width={6 * SK} height={DUCT.height * SK} className={styles.duct} strokeWidth={focus ? 2.5 : 1.5} strokeDasharray={revised ? "8 4" : undefined} />
        </g>
      )}
      {overlap && (
        <g>
          <rect x={sx(CLASH.x0)} y={sy(CLASH.top)} width={(CLASH.x1 - CLASH.x0) * SK} height={(CLASH.bottom - CLASH.top) * SK} fill={`url(#overlap-${id})`} stroke="#17191a" strokeWidth="1.25" />
          <rect x={sx(CLASH.x0) - 8} y={sy(CLASH.top) - 8} width={(CLASH.x1 - CLASH.x0) * SK + 16} height={(CLASH.bottom - CLASH.top) * SK + 16} fill="none" stroke="#17191a" strokeWidth="1.25" strokeDasharray="4 3" />
        </g>
      )}
    </svg>
  );
}

function CombinedSection({ structural, ventilation, revised, focus }: SectionProps) {
  const combined = structural && ventilation;
  const label = combined
    ? revised ? "Section with the duct lowered below beam B-13 as a possible revision. The original route is shown dotted." : "Section along the corridor: supply duct SD-04 passes through the lower part of beam B-13. The overlapping area is hatched."
    : `Section showing the ${structural ? "structural" : ventilation ? "ventilation" : "no"} design only.`;
  return (
    <div className={styles.drawing} role="img" aria-label={label}>
      <SectionGeometry structural={structural} ventilation={ventilation} revised={revised} focus={focus} />
      <div className={styles.overlay} aria-hidden="true">
        {structural && (
          <>
            <Note x={30} y={28} box={SECTION_BOX} align="start" tone="muted">Slab</Note>
            {BEAMS.map((beam) => <Note key={beam.id} x={sx((beam.x0 + beam.x1) / 2)} y={28} box={SECTION_BOX} tone={focus && beam.id === "B-13" ? "strong" : undefined}>Beam {beam.id}</Note>)}
          </>
        )}
        {ventilation && <Note x={44} y={sy((revised ? DUCT.loweredTop : DUCT.top) + DUCT.height / 2)} box={SECTION_BOX} align="start" tone="blue">Supply duct SD-04{revised ? ", lowered" : ""}</Note>}
        <Note x={570} y={sy(CEILING) + 14} box={SECTION_BOX} align="end" tone="muted">Ceiling</Note>
        {combined && !revised && <Pin x={sx((CLASH.x0 + CLASH.x1) / 2)} y={sy(0.65)} box={SECTION_BOX} state="finding" place="below" leader={44} title="Overlap" detail="Beam B-13 and duct SD-04" />}
      </div>
    </div>
  );
}

const COVERAGE = [
  { check: "Do elements occupy the same space?", answer: "Checked here. One overlap found." },
  { check: "Is there enough maintenance space?", answer: "Needs a stated clearance requirement first." },
  { check: "Does the design meet code and project requirements?", answer: "Not something a geometry check can assess." },
];

export function DesignFit() {
  const [layers, setLayers] = useState({ structural: true, ventilation: true });
  const [focus, setFocus] = useState(false);
  const [revised, setRevised] = useState(false);
  const combined = layers.structural && layers.ventilation;
  const toggle = (key: "structural" | "ventilation") => {
    setLayers((current) => ({ ...current, [key]: !current[key] }));
    setRevised(false);
    setFocus(false);
  };
  const viewTitle = combined ? "Combined view" : layers.structural ? "Structural design only" : layers.ventilation ? "Ventilation design only" : "No discipline shown";
  return (
    <Example
      title="Corridor ceiling, level 3"
      situation={<p>Two discipline models cover the same corridor: <strong>structural</strong> and <strong>ventilation</strong>.</p>}
      result={<p><strong>Duct and beam overlap.</strong> These elements occupy the same space in the example model.</p>}
      next={<p>Review the duct route with the structural team.</p>}
    >
      <div className={styles.fitGrid}>
        <div className={styles.sources}>
          {(["structural", "ventilation"] as const).map((key) => (
            <button key={key} type="button" className={styles.source} aria-pressed={layers[key]} onClick={() => toggle(key)}>
              <span className={styles.sourceHead}>
                <span className={styles.swatch} data-discipline={key} aria-hidden="true" />
                <strong>{key === "structural" ? "Structural design" : "Ventilation design"}</strong>
                <span className={styles.sourceState}>{layers[key] ? "Shown" : "Hidden"}</span>
              </span>
              <span className={styles.sourceDrawing}><SectionGeometry structural={key === "structural"} ventilation={key === "ventilation"} /></span>
              <span className={styles.sourceMeta}>{key === "structural" ? "Slab and beams B-12, B-13" : "Supply duct SD-04"}</span>
            </button>
          ))}
        </div>
        <div className={styles.panel} data-focus="true">
          <div className={styles.panelHead}>
            <p className={styles.panelTitle}>{viewTitle}</p>
            {revised && combined ? <span className={styles.revisionTag}>Possible revision — requires review</span> : <span className={styles.panelMeta}>Section along the corridor</span>}
          </div>
          <CombinedSection structural={layers.structural} ventilation={layers.ventilation} revised={revised} focus={focus && combined} />
          {combined && !revised && (
            <div className={styles.closeUp} aria-hidden="true">
              <span className={styles.panelMeta}>Close-up at beam B-13</span>
              <SectionGeometry structural ventilation focus={focus} viewBox="360 20 140 150" />
            </div>
          )}
          {!combined && <p className={styles.panelNote}>Show both disciplines to combine them and check for overlaps.</p>}
          {combined && !revised && (
            <div className={styles.findingBlock}>
              <button type="button" className={styles.finding} aria-pressed={focus} onClick={() => setFocus(!focus)}>
                <span><strong>Duct and beam overlap.</strong> Both elements occupy the same space.</span>
                <span className={styles.findingAction}>{focus ? "Hide affected elements" : "Show affected elements"} <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" /></span>
              </button>
              {focus && (
                <ul className={styles.affected} aria-label="Affected elements">
                  <li><span className={styles.swatch} data-discipline="structural" aria-hidden="true" /><strong>Beam B-13</strong><span>Structural model, revision 04</span></li>
                  <li><span className={styles.swatch} data-discipline="ventilation" aria-hidden="true" /><strong>Supply duct SD-04</strong><span>Ventilation model, revision 02</span></li>
                </ul>
              )}
            </div>
          )}
          {combined && (
            <div className={styles.panelFoot}>
              {revised
                ? <p>The overlap disappears in this sketch, but that doesn’t make the route acceptable. Lowering the duct reduces the space above the ceiling.</p>
                : <p>Moving the duct is a decision for the ventilation and structural teams.</p>}
              <button type="button" className={styles.textButton} aria-pressed={revised} onClick={() => { setRevised(!revised); setFocus(false); }}>
                {revised ? <><RotateCcw size={14} strokeWidth={1.6} aria-hidden="true" /> Original route</> : <>Sketch a possible revision <ArrowRight size={14} strokeWidth={1.6} aria-hidden="true" /></>}
              </button>
            </div>
          )}
        </div>
      </div>
      <div className={styles.coverage}>
        <p className={styles.sectionLabel}>What this check covers</p>
        <dl>
          {COVERAGE.map((item) => <div key={item.check}><dt>{item.check}</dt><dd>{item.answer}</dd></div>)}
        </dl>
      </div>
    </Example>
  );
}

/* 3. Understand revisions ------------------------------------------------ */

const ROOM_BOX: Box = [520, 372];
const RK = 90;
const rx = (x: number) => 35 + x * RK;
const ry = (y: number) => 36 + y * RK;
const rect = (x0: number, y0: number, x1: number, y1: number) => ({ x: rx(x0), y: ry(y0), width: (x1 - x0) * RK, height: (y1 - y0) * RK });

type Focus = "space" | "connections" | "support";

const QUESTIONS: { id: Focus; area: string; question: string; reviewer: string; kind: string; source: string; lines: string[]; note: string; pin: Omit<PinProps, "box"> }[] = [
  {
    id: "space",
    area: "Space",
    question: "Does the unit still fit with the required access?",
    reviewer: "Mechanical lead",
    kind: "Approved project requirement",
    source: "Plant room requirement R-03",
    lines: ["Keep a service access space in front of the unit", "The existing tank stays in place"],
    note: "The larger unit moves its access space closer to the tank. The mechanical lead checks that the required access still fits.",
    pin: { x: rx(2.4), y: ry(2.05), title: "Access space", detail: "Now closer to the tank", align: "start", place: "below", leader: 30 },
  },
  {
    id: "connections",
    area: "Connections",
    question: "Do the connection locations still match?",
    reviewer: "Mechanical designer",
    kind: "Revised supplier drawing",
    source: "Supplier drawing, replacement unit, revision 2",
    lines: ["Two pipe connections on the east side", "Positions differ from the approved unit"],
    note: "The designed pipe routes end at the previous positions. The mechanical designer confirms the new routes.",
    pin: { x: rx(2.4), y: ry(1.2), title: "Connections moved", detail: "Pipes end at the old positions", align: "start", place: "below", leader: 40 },
  },
  {
    id: "support",
    area: "Supporting design",
    question: "Have the structural and electrical requirements changed?",
    reviewer: "Structural and electrical engineers",
    kind: "Previous design decision",
    source: "Design decision DD-07",
    lines: ["Equipment base designed for the approved unit", "Power supply point designed for the approved unit"],
    note: "The engineers check the supplier’s revised weight and power information. No values are assumed here.",
    pin: { x: rx(2.1), y: ry(1.4), title: "Base and power point", detail: "Designed for the approved unit", align: "start", place: "below", leader: 30 },
  },
];

function PlantRoom({ focus }: { focus: Focus }) {
  const on = (part: Focus) => focus === part;
  const question = QUESTIONS.find((item) => item.id === focus) ?? QUESTIONS[0];
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  return (
    <Drawing
      box={ROOM_BOX}
      label="Plant room plan. The previously approved unit, 1,200 by 800 millimetres, and the proposed replacement, 1,600 by 1,000 millimetres, drawn from the same corner, with the access space, pipe connections, equipment base, and power supply point."
      overlay={
        <>
          <Note x={rx(1.4)} y={ry(0.9)} box={ROOM_BOX} tone="strong">Unit</Note>
          <Note x={rx(1.15)} y={ry(2.875)} box={ROOM_BOX} tone="muted">Existing tank</Note>
          <Note x={rx(3.7)} y={ry(0.6)} box={ROOM_BOX} tone="muted" optional>Designed pipe routes</Note>
          <Pin box={ROOM_BOX} state="selected" {...question.pin} />
        </>
      }
    >
      <defs>
        <pattern id={`access-${id}`} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="7" stroke={on("space") ? "#0068e8" : "#a9cdf7"} strokeWidth="1.25" />
        </pattern>
      </defs>
      <rect {...rect(0, 0, 5, 3.4)} fill="#fff" stroke="#17191a" strokeWidth="5" />
      <line x1={rx(3.8)} y1={ry(3.4)} x2={rx(4.7)} y2={ry(3.4)} stroke="#fff" strokeWidth="7" />
      <path d={`M ${rx(3.8)} ${ry(3.4)} L ${rx(3.8)} ${ry(2.5)} A ${0.9 * RK} ${0.9 * RK} 0 0 1 ${rx(4.7)} ${ry(3.4)}`} fill="none" stroke="#9a9b9b" strokeWidth="1" />
      <rect {...rect(0.3, 2.55, 2.0, 3.2)} fill="#efefed" stroke={on("space") ? "#17191a" : "#9a9b9b"} strokeWidth={on("space") ? 1.5 : 1} />
      <rect {...rect(0.8, 1.5, 2.4, 2.3)} fill={`url(#access-${id})`} stroke={on("space") ? "#0068e8" : "#a9cdf7"} strokeWidth={on("space") ? 1.5 : 1} strokeDasharray="5 3" />
      <rect {...rect(0.7, 0.4, 2.1, 1.4)} fill="none" stroke={on("support") ? "#17191a" : "#b9bab7"} strokeWidth={on("support") ? 1.75 : 1} strokeDasharray="9 3 2 3" />
      <rect {...rect(0.8, 0.5, 2.4, 1.5)} fill="#fed603" fillOpacity="0.5" stroke="#17191a" strokeWidth="1.25" strokeDasharray="6 3" />
      <rect {...rect(0.8, 0.5, 2.0, 1.3)} fill="#f5f5f2" stroke="#4a4c4d" strokeWidth="1.5" />
      {[0.75, 1.05].map((y) => <line key={y} x1={rx(2.0)} y1={ry(y)} x2={rx(5)} y2={ry(y)} stroke={on("connections") ? "#17191a" : "#a9aaa7"} strokeWidth={on("connections") ? 2 : 1.25} />)}
      {[0.75, 1.05].map((y) => <circle key={y} cx={rx(2.0)} cy={ry(y)} r="4.5" fill="#fff" stroke="#4a4c4d" strokeWidth="1.5" />)}
      {[0.8, 1.2].map((y) => <circle key={y} cx={rx(2.4)} cy={ry(y)} r={on("connections") ? 6.5 : 5} fill="#fed603" stroke="#17191a" strokeWidth="1.5" />)}
      <rect x={rx(1.4) - 9} y={ry(0) + 5} width="18" height="15" fill={on("support") ? "#17191a" : "#fff"} stroke="#17191a" strokeWidth="1.25" />
      <path d={`M ${rx(1.4) + 1.5} ${ry(0) + 8} l -4.5 5 h 4 l -3 4.5`} fill="none" stroke={on("support") ? "#fed603" : "#17191a"} strokeWidth="1.25" strokeLinejoin="round" />
    </Drawing>
  );
}

export function RevisionScope() {
  const [selected, setSelected] = useState<Focus>("space");
  const question = QUESTIONS.find((item) => item.id === selected) ?? QUESTIONS[0];
  return (
    <Example
      title="Plant room, replacement unit"
      situation={<p><strong>The supplier proposes a larger unit</strong> for a room designed around the approved one.</p>}
      result={<p><strong>A focused review for the affected disciplines.</strong> Three questions, each linked to its source. None is a confirmed problem yet.</p>}
      next={<p>Each discipline confirms what needs to change.</p>}
    >
      <div className={styles.event}>
        <p className={styles.sectionLabel}>Revision received</p>
        <p className={styles.eventTitle}>Supplier proposes a larger equipment unit.</p>
        <ul className={styles.legend}>
          <li><span className={styles.legendApproved} aria-hidden="true" />Previously approved <strong>1,200 × 800 mm</strong></li>
          <li><span className={styles.legendProposed} aria-hidden="true" />Proposed replacement <strong>1,600 × 1,000 mm</strong></li>
        </ul>
      </div>
      <div className={styles.revisionGrid}>
        <div className={`${styles.panel} ${styles.stickyPanel}`} data-focus="true">
          <div className={styles.panelHead}>
            <p className={styles.panelTitle}>Same room, both footprints</p>
            <span className={styles.panelMeta}>Plan, approved layout</span>
          </div>
          <PlantRoom focus={selected} />
        </div>
        <div className={styles.questionColumn}>
          <p className={styles.sectionLabel}>Three questions for review</p>
          <div className={styles.questions} role="group" aria-label="Review questions">
            {QUESTIONS.map((item) => (
              <button key={item.id} type="button" className={styles.question} aria-pressed={selected === item.id} onClick={() => setSelected(item.id)}>
                <span className={styles.questionArea}>{item.area}</span>
                <span className={styles.questionText}>{item.question}</span>
                <span className={styles.questionReviewer}>Checked by: {item.reviewer}</span>
              </button>
            ))}
          </div>
          <div className={styles.evidence} aria-live="polite">
            <p className={styles.evidenceKind}>{question.kind}</p>
            <p className={styles.evidenceTitle}>{question.source}</p>
            <ul>{question.lines.map((line) => <li key={line}>{line}</li>)}</ul>
            <p className={styles.evidenceNote}>{question.note}</p>
          </div>
        </div>
      </div>
    </Example>
  );
}

/* 4. Prepare the deliverables -------------------------------------------- */

type WindowMark = { mark: string; side: "South" | "East"; size: string; type: string; from: number; to: number };

const WINDOWS: WindowMark[] = [
  { mark: "W01", side: "South", size: "1200 × 1500", type: "Type A", from: 1.2, to: 2.4 },
  { mark: "W02", side: "South", size: "1200 × 1500", type: "Type A", from: 4.6, to: 5.8 },
  { mark: "W03", side: "East", size: "900 × 1500", type: "Type B", from: 1.0, to: 1.9 },
  { mark: "W04", side: "East", size: "900 × 1500", type: "Type B", from: 3.0, to: 3.9 },
];
const MISSING = "W03";
const HOUSE = { length: 8, depth: 5, height: 3.2, sill: 0.9, head: 2.4 };
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

function HouseModel({ selected, flagged, onSelect }: { selected: string | null; flagged: boolean; onSelect: (mark: string) => void }) {
  const body = boxFaces(HOUSE_ISO, { x0: 0, x1: HOUSE.length, y0: 0, y1: HOUSE.depth, z0: 0, z1: HOUSE.height });
  const missing = WINDOWS.find((item) => item.mark === MISSING) ?? WINDOWS[2];
  const [pinX, pinY] = windowPoint(missing, HOUSE.head);
  return (
    <Drawing
      box={HOUSE_BOX}
      label="Building model with four windows: W01 and W02 on the south side, W03 and W04 on the east side."
      overlay={
        <>
          {WINDOWS.map((item) => {
            const [x, y] = windowPoint(item, 0.42);
            return <Note key={item.mark} x={x} y={y} box={HOUSE_BOX} tone={selected === item.mark ? "strong" : "muted"}>{item.mark}</Note>;
          })}
          {flagged && <Pin x={pinX} y={pinY} box={HOUSE_BOX} state="finding" leader={46} title="W03" detail="Not in the draft schedule" />}
        </>
      }
    >
      <polygon points={body.south} fill="#ececea" stroke="#17191a" strokeWidth="1" strokeLinejoin="round" />
      <polygon points={body.east} fill="#d9d9d6" stroke="#17191a" strokeWidth="1" strokeLinejoin="round" />
      <polygon points={body.top} fill="#f8f8f6" stroke="#17191a" strokeWidth="1" strokeLinejoin="round" />
      {WINDOWS.map((item) => {
        const active = selected === item.mark;
        const flaggedWindow = flagged && item.mark === MISSING;
        return (
          <polygon key={item.mark} points={windowShape(item)} className={styles.pickable} aria-label={`Window ${item.mark}`} aria-pressed={active}
            fill={active || flaggedWindow ? "#fed603" : "#c9def8"} stroke="#17191a" strokeWidth={active ? 1.75 : 1} strokeDasharray={flaggedWindow && !active ? "4 2" : undefined}
            {...pressable(() => onSelect(item.mark))} />
        );
      })}
    </Drawing>
  );
}

const SHEET_BOX: Box = [440, 176];

function Elevations() {
  const scale = 26;
  const base = 142;
  const facade = (x: number, length: number, side: "South" | "East") => (
    <g key={side}>
      <rect x={x} y={base - HOUSE.height * scale} width={length * scale} height={HOUSE.height * scale} fill="#fff" stroke="#17191a" strokeWidth="1.25" />
      {WINDOWS.filter((item) => item.side === side).map((item) => (
        <rect key={item.mark} x={x + item.from * scale} y={base - HOUSE.head * scale} width={(item.to - item.from) * scale} height={(HOUSE.head - HOUSE.sill) * scale} fill="#eaf2fd" stroke="#17191a" strokeWidth="1" />
      ))}
    </g>
  );
  return (
    <Drawing
      box={SHEET_BOX}
      label="Draft elevation sheet: south elevation with windows W01 and W02, east elevation with windows W03 and W04."
      overlay={
        <>
          <Note x={12} y={40} box={SHEET_BOX} align="start" tone="muted">South elevation</Note>
          <Note x={270} y={40} box={SHEET_BOX} align="start" tone="muted">East elevation</Note>
          {WINDOWS.map((item) => <Note key={item.mark} x={(item.side === "South" ? 12 : 270) + ((item.from + item.to) / 2) * scale} y={160} box={SHEET_BOX} tone="strong">{item.mark}</Note>)}
        </>
      }
    >
      {facade(12, HOUSE.length, "South")}
      {facade(270, HOUSE.depth, "East")}
      <line x1="0" y1={base} x2="440" y2={base} stroke="#9a9b9b" strokeWidth="1" />
    </Drawing>
  );
}

type Tab = "sheet" | "schedule" | "notes";
const TABS: { id: Tab; prefix: string; label: string }[] = [
  { id: "sheet", prefix: "Drawing ", label: "sheet" },
  { id: "schedule", prefix: "Window ", label: "schedule" },
  { id: "notes", prefix: "Review ", label: "notes" },
];

export function Deliverables() {
  const [corrected, setCorrected] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("schedule");
  const model = useRef<HTMLDivElement>(null);
  const rows = corrected ? WINDOWS : WINDOWS.filter((item) => item.mark !== MISSING);
  // Stacked layouts put the model above the schedule, out of view.
  function pick(mark: string) {
    const next = selected === mark ? null : mark;
    setSelected(next);
    if (next && window.matchMedia("(max-width: 1100px)").matches) {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      model.current?.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
    }
  }
  const notes = [
    { check: "Window count", result: corrected ? "Model 4, schedule 4" : "Model 4, schedule 3", tone: corrected ? "ok" as const : "blocked" as const },
    { check: "Missing entry", result: corrected ? "W03 added from the reviewed model" : "W03 is modeled but not scheduled", tone: corrected ? "ok" as const : "blocked" as const },
    { check: "Sheet A-201", result: "All four window tags match the model", tone: "ok" as const },
    { check: "Package status", result: corrected ? "Ready for review. Not approved or issued." : "Draft. One issue to resolve.", tone: "neutral" as const },
  ];
  return (
    <Example
      title="Window schedule and elevation sheet"
      situation={<p>A <strong>reviewed model with four windows</strong>, plus the firm’s schedule and sheet templates.</p>}
      resultLabel={corrected ? "Result for review" : "Finding for review"}
      result={corrected
        ? <p><strong>Window schedule, 4 entries.</strong> Ready for review, not approved or issued.</p>
        : <p><strong>One modeled window is missing from the schedule.</strong> The draft lists 3 entries.</p>}
      next={<p>Review and update the schedule.</p>}
    >
      <Steps label="Document workflow" steps={[
        { title: "Reviewed inputs", detail: "Model and templates", state: "done" },
        { title: "Draft documents", detail: "Sheet and schedule", state: "done" },
        { title: "Consistency checks", detail: corrected ? "No issues" : "1 issue", state: corrected ? "done" : "blocked" },
        { title: "Professional review", detail: corrected ? "Next, by your team" : "Not started", state: corrected ? "current" : "later" },
      ]} />
      <div className={styles.documentGrid}>
        <div ref={model} className={styles.panel}>
          <div className={styles.panelHead}>
            <p className={styles.panelTitle}>Reviewed model</p>
            <span className={styles.panelMeta}>4 windows</span>
          </div>
          <HouseModel selected={selected} flagged={!corrected} onSelect={(mark) => setSelected(selected === mark ? null : mark)} />
        </div>
        <div className={styles.panel} data-focus="true">
          <div className={styles.panelHead}>
            <p className={styles.panelTitle}>Draft documents</p>
            <div className={styles.tabs} role="group" aria-label="Choose a deliverable">
              {TABS.map((item) => <button key={item.id} type="button" className={styles.tab} aria-pressed={tab === item.id} onClick={() => setTab(item.id)}><span className={styles.tabPrefix}>{item.prefix}</span>{item.label}</button>)}
            </div>
          </div>
          <div className={styles.excerpt} aria-live="polite">
            {tab === "schedule" && (
              <>
                <div className={styles.excerptHead}>
                  <strong>Window schedule</strong>
                  <span>{corrected ? "Corrected draft" : "Draft"}, {rows.length} entries</span>
                </div>
                <div className={styles.schedule}>
                  <span className={styles.scheduleHead} aria-hidden="true"><span>Mark</span><span>Side</span><span>Size, mm</span><span>Type</span></span>
                  {WINDOWS.map((item) => (corrected || item.mark !== MISSING) ? (
                    <button key={item.mark} type="button" className={styles.scheduleRow} aria-pressed={selected === item.mark} data-added={corrected && item.mark === MISSING} onClick={() => pick(item.mark)}>
                      <span>{item.mark}</span><span>{item.side}</span><span>{item.size}</span><span>{item.type}</span>
                    </button>
                  ) : (
                    <button key={item.mark} type="button" className={styles.missingRow} aria-pressed={selected === item.mark} onClick={() => pick(item.mark)}>
                      <span>No entry for W03</span>
                      <span className={styles.findingAction}>{selected === item.mark ? "Shown in the model" : "Show in the model"} <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" /></span>
                    </button>
                  ))}
                </div>
              </>
            )}
            {tab === "sheet" && (
              <>
                <div className={styles.excerptHead}><strong>A-201 Elevations</strong><span>Draft, 4 window tags</span></div>
                <Elevations />
                <p className={styles.titleBlock}><span>Sheet A-201</span><span>Firm’s sheet template</span><span>Draft for review</span></p>
              </>
            )}
            {tab === "notes" && (
              <>
                <div className={styles.excerptHead}><strong>Review notes</strong><span>Checked against the model</span></div>
                <dl className={styles.notes}>
                  {notes.map((note) => <div key={note.check}><dt>{note.check}</dt><dd><State tone={note.tone}>{note.result}</State></dd></div>)}
                </dl>
              </>
            )}
          </div>
          <div className={styles.findingBar} data-resolved={corrected}>
            <p>{corrected ? <><strong>4 entries, ready for review.</strong> Approval stays with your team.</> : <><strong>One modeled window is missing from the schedule.</strong></>}</p>
            <button type="button" className={styles.findingAction} onClick={() => { setCorrected(!corrected); setSelected(corrected ? null : MISSING); setTab("schedule"); }}>
              {corrected ? <><RotateCcw size={14} strokeWidth={1.6} aria-hidden="true" /> First draft</> : <>Show the corrected draft <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" /></>}
            </button>
          </div>
        </div>
      </div>
    </Example>
  );
}
