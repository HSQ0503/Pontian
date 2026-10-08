"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowRight, Check, RotateCcw } from "lucide-react";
import styles from "./design-engineering.module.css";

type ExampleProps = {
  title: string;
  children: ReactNode;
  start: ReactNode;
  result: ReactNode;
  next: ReactNode;
  resultLabel?: string;
};

function Example({ title, children, start, result, next, resultLabel = "Result for review" }: ExampleProps) {
  return (
    <figure className={styles.example}>
      <figcaption className={styles.exampleBar}>
        <span className={styles.exampleTag}>Example workflow</span>
        <span className={styles.exampleTitle}>{title}</span>
        <span className={styles.exampleNote}>Illustration, not a client project</span>
      </figcaption>
      <div className={styles.exampleBody}>{children}</div>
      <ol className={styles.outcome}>
        <li data-role="start"><span className={styles.outcomeLabel}>Situation</span>{start}</li>
        <li data-role="result" aria-live="polite"><span className={styles.outcomeLabel}>{resultLabel}</span>{result}</li>
        <li data-role="next"><span className={styles.outcomeLabel}>Next step for your team</span>{next}</li>
      </ol>
    </figure>
  );
}

function Status({ tone, children }: { tone: "ok" | "open" | "quiet"; children: ReactNode }) {
  return <span className={styles.status} data-tone={tone}>{children}</span>;
}

function StageArrow() {
  return (
    <span className={styles.stageArrow} aria-hidden="true">
      <ArrowRight className={styles.arrowAcross} size={18} strokeWidth={1.4} />
      <ArrowDown className={styles.arrowDown} size={18} strokeWidth={1.4} />
    </span>
  );
}

type Point = [number, number];
const COS30 = Math.cos(Math.PI / 6);

function isometric(scale: number, originX: number, originY: number) {
  return (x: number, y: number, z: number): Point => [originX + (x - y) * COS30 * scale, originY + (x + y) * 0.5 * scale - z * scale];
}

function toPoints(list: Point[]) {
  return list.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
}

type Box = { x0: number; x1: number; y0: number; y1: number; z0: number; z1: number };

function boxFaces(project: ReturnType<typeof isometric>, { x0, x1, y0, y1, z0, z1 }: Box) {
  return {
    top: toPoints([project(x0, y0, z1), project(x1, y0, z1), project(x1, y1, z1), project(x0, y1, z1)]),
    south: toPoints([project(x0, y1, z0), project(x1, y1, z0), project(x1, y1, z1), project(x0, y1, z1)]),
    east: toPoints([project(x1, y0, z0), project(x1, y1, z0), project(x1, y1, z1), project(x1, y0, z1)]),
  };
}

/* 1. Create the first model */

type Wall = { id: string; name: string; length: string; thickness: string; x0: number; x1: number; y0: number; y1: number; tag: [number, number] };

const WALLS: Wall[] = [
  { id: "W1", name: "North exterior wall", length: "10.00 m", thickness: "300 mm", x0: 0, x1: 10, y0: 0, y1: 0.3, tag: [3, -0.55] },
  { id: "W4", name: "West exterior wall", length: "6.00 m", thickness: "300 mm", x0: 0, x1: 0.3, y0: 0.3, y1: 5.7, tag: [-0.75, 3] },
  { id: "W5", name: "Interior partition", length: "5.40 m", thickness: "100 mm", x0: 5.95, x1: 6.05, y0: 0.3, y1: 5.7, tag: [6, 1.4] },
  { id: "W2", name: "East exterior wall", length: "6.00 m", thickness: "300 mm", x0: 9.7, x1: 10, y0: 0.3, y1: 5.7, tag: [10.75, 3] },
  { id: "W3", name: "South exterior wall", length: "10.00 m", thickness: "300 mm", x0: 0, x1: 10, y0: 5.7, y1: 6, tag: [3, 6.5] },
];
const WALL_ORDER = ["W1", "W2", "W3", "W4", "W5"];
const WALL_HEIGHT = 3;
const PLAN_SCALE = 24;
const PLAN_X = 40;
const PLAN_Y = 34;
const px = (x: number) => PLAN_X + x * PLAN_SCALE;
const py = (y: number) => PLAN_Y + y * PLAN_SCALE;

function Dimension({ x1, y1, x2, y2, label, vertical = false }: { x1: number; y1: number; x2: number; y2: number; label: string; vertical?: boolean }) {
  const tick = 4;
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  return (
    <g className={styles.dimension}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      {vertical
        ? <><line x1={x1 - tick} y1={y1} x2={x1 + tick} y2={y1} /><line x1={x2 - tick} y1={y2} x2={x2 + tick} y2={y2} /></>
        : <><line x1={x1} y1={y1 - tick} x2={x1} y2={y1 + tick} /><line x1={x2} y1={y2 - tick} x2={x2} y2={y2 + tick} /></>}
      <text x={vertical ? midX - 6 : midX} y={vertical ? midY : midY - 5} textAnchor="middle" transform={vertical ? `rotate(-90 ${midX - 6} ${midY})` : undefined} className={styles.planText}>{label}</text>
    </g>
  );
}

function SourcePlan({ selected, onSelect }: { selected: string; onSelect: (id: string) => void }) {
  return (
    <svg viewBox="0 0 310 214" className={styles.drawing} role="img" aria-label="Floor plan of one floor with two rooms. Overall 10.00 by 6.00 metres. An interior wall divides it into a 6.00 metre room and a 4.00 metre room.">
      <rect x={px(0)} y={py(0)} width={10 * PLAN_SCALE} height={6 * PLAN_SCALE} fill="#fff" />
      {WALLS.map((wall) => (
        <rect key={wall.id} x={px(wall.x0)} y={py(wall.y0)} width={(wall.x1 - wall.x0) * PLAN_SCALE} height={(wall.y1 - wall.y0) * PLAN_SCALE}
          className={styles.pickable} fill={wall.id === selected ? "#fed603" : "#262829"} stroke={wall.id === selected ? "#17191a" : "none"} strokeWidth="1" onClick={() => onSelect(wall.id)} />
      ))}
      <text x={px(3.1)} y={py(3.1)} textAnchor="middle" className={styles.planTextStrong}>Room 1</text>
      <text x={px(7.9)} y={py(3.1)} textAnchor="middle" className={styles.planTextStrong}>Room 2</text>
      <Dimension x1={px(0)} y1={18} x2={px(10)} y2={18} label="10.00 m" />
      <Dimension x1={px(0)} y1={200} x2={px(6)} y2={200} label="6.00 m" />
      <Dimension x1={px(6)} y1={200} x2={px(10)} y2={200} label="4.00 m" />
      <Dimension x1={20} y1={py(0)} x2={20} y2={py(6)} label="6.00 m" vertical />
    </svg>
  );
}

function InterpretedPlan({ selected, onSelect }: { selected: string; onSelect: (id: string) => void }) {
  return (
    <svg viewBox="0 0 310 214" className={styles.drawing} role="img" aria-label="The same plan with the proposed floor outline and five proposed walls, W1 to W5, marked over the source drawing.">
      <rect x={px(0) - 5} y={py(0) - 5} width={10 * PLAN_SCALE + 10} height={6 * PLAN_SCALE + 10} fill="none" stroke="#007dfe" strokeWidth="1.2" strokeDasharray="5 4" />
      <rect x={px(0)} y={py(0)} width={10 * PLAN_SCALE} height={6 * PLAN_SCALE} fill="#eaf3ff" />
      {WALLS.map((wall) => {
        const active = wall.id === selected;
        return (
          <g key={wall.id} className={styles.pickable} onClick={() => onSelect(wall.id)}>
            <rect x={px(wall.x0)} y={py(wall.y0)} width={(wall.x1 - wall.x0) * PLAN_SCALE} height={(wall.y1 - wall.y0) * PLAN_SCALE}
              fill={active ? "#fed603" : "#007dfe"} stroke={active ? "#17191a" : "none"} strokeWidth="1" />
            <rect x={px(wall.tag[0]) - 11} y={py(wall.tag[1]) - 8} width="22" height="15" fill={active ? "#17191a" : "#fff"} stroke={active ? "#17191a" : "#007dfe"} />
            <text x={px(wall.tag[0])} y={py(wall.tag[1]) + 3} textAnchor="middle" className={styles.tagText} fill={active ? "#fff" : "#0054b8"}>{wall.id}</text>
          </g>
        );
      })}
      <text x={px(5)} y={211} textAnchor="middle" className={styles.planText}>Floor outline, dashed: 10.00 × 6.00 m</text>
    </svg>
  );
}

const MODEL = isometric(15, 94, 64);

function ModelView({ selected, confirmed, onSelect }: { selected: string; confirmed: boolean; onSelect: (id: string) => void }) {
  const slab = boxFaces(MODEL, { x0: 0, x1: 10, y0: 0, y1: 6, z0: -0.25, z1: 0 });
  const height = confirmed ? WALL_HEIGHT : 0;
  return (
    <svg viewBox="0 0 240 204" className={styles.drawing} role="img" aria-label={confirmed ? "Simple 3D view: the floor and the same five walls, created at the confirmed 3.00 metre height. No doors, roof, or materials are added." : "Simple 3D view: the floor outline with the five wall positions marked on it. The walls are not created yet because the wall height needs confirmation."}>
      <polygon points={slab.south} fill="#c9cac8" stroke="#262829" strokeWidth="0.8" />
      <polygon points={slab.east} fill="#b4b5b3" stroke="#262829" strokeWidth="0.8" />
      <polygon points={slab.top} fill="#f5f5f2" stroke="#262829" strokeWidth="0.8" />
      {WALLS.map((wall) => {
        const active = wall.id === selected;
        if (!confirmed) {
          const outline = boxFaces(MODEL, { ...wall, z0: 0, z1: 0 });
          return <polygon key={wall.id} points={outline.top} className={styles.pickable} fill={active ? "#fed603" : "#d6e8ff"} stroke={active ? "#17191a" : "#007dfe"} strokeWidth="1" strokeDasharray="3 2" onClick={() => onSelect(wall.id)} />;
        }
        const faces = boxFaces(MODEL, { ...wall, z0: 0, z1: height });
        return (
          <g key={wall.id} className={`${styles.pickable} ${styles.extrude}`} onClick={() => onSelect(wall.id)}>
            <polygon points={faces.south} fill={active ? "#f0c800" : "#d8d9d9"} stroke="#262829" strokeWidth="0.8" />
            <polygon points={faces.east} fill={active ? "#e0bb00" : "#c4c5c3"} stroke="#262829" strokeWidth="0.8" />
            <polygon points={faces.top} fill={active ? "#fed603" : "#fff"} stroke="#262829" strokeWidth="0.8" />
          </g>
        );
      })}
      {!confirmed && (
        <g>
          <line x1={MODEL(10, 6, 0)[0] + 8} y1={MODEL(10, 6, 0)[1]} x2={MODEL(10, 6, 0)[0] + 8} y2={MODEL(10, 6, WALL_HEIGHT)[1]} stroke="#17191a" strokeDasharray="3 3" />
          <rect x={MODEL(10, 6, 0)[0] - 4} y={MODEL(10, 6, 1.8)[1] - 9} width="24" height="17" fill="#fed603" stroke="#17191a" />
          <text x={MODEL(10, 6, 0)[0] + 8} y={MODEL(10, 6, 1.8)[1] + 3} textAnchor="middle" className={styles.planTextStrong}>?</text>
        </g>
      )}
    </svg>
  );
}

export function FirstModel() {
  const [selected, setSelected] = useState("W5");
  const [confirmed, setConfirmed] = useState(false);
  const wall = WALLS.find((item) => item.id === selected) ?? WALLS[0];
  return (
    <Example
      title="Ground floor plan, two rooms"
      start={<p>A dimensioned plan: <strong>one floor, two rooms, five walls</strong>, with the scale on the drawing.</p>}
      resultLabel={confirmed ? "Result for review" : "Finding for review"}
      result={confirmed
        ? <p><strong>Editable starting model.</strong> Five walls and one floor at the confirmed 3.00 m height. Nothing else is added.</p>
        : <p><strong>Wall height needs confirmation.</strong> The walls are not created until it is confirmed.</p>}
      next={<p>Engineer reviews the model and resolves remaining details.</p>}
    >
      <div className={styles.picker} role="group" aria-label="Select a wall to find it in each stage">
        <span className={styles.pickerLabel}>Select a wall to find it in each stage</span>
        {WALL_ORDER.map((id) => (
          <button key={id} type="button" className={styles.chip} aria-pressed={selected === id} onClick={() => setSelected(id)}>{id}</button>
        ))}
        <span className={styles.pickerDetail} aria-live="polite"><strong>{wall.id}</strong> {wall.name}, {wall.length}, {wall.thickness}</span>
      </div>
      <div className={styles.stages}>
        <div className={styles.sheet}>
          <p className={styles.stageLabel}><span>1</span>Source plan</p>
          <SourcePlan selected={selected} onSelect={setSelected} />
          <dl className={styles.inputs}>
            <div><dt>Overall size</dt><dd>10.00 × 6.00 m</dd></div>
            <div><dt>Rooms</dt><dd>Two, 6.00 m and 4.00 m wide</dd></div>
            <div><dt>Title block</dt><dd>Ground floor plan, scale 1:100</dd></div>
          </dl>
          <p className={styles.sheetMeta}>The drawing the team already has</p>
        </div>
        <StageArrow />
        <div className={styles.sheet}>
          <p className={styles.stageLabel}><span>2</span>Check the interpretation</p>
          <InterpretedPlan selected={selected} onSelect={setSelected} />
          <dl className={styles.inputs}>
            <div><dt>Drawing scale</dt><dd>1:100</dd><Status tone="ok">Found on drawing</Status></div>
            <div><dt>Wall type</dt><dd>Exterior 300 mm, interior 100 mm</dd><Status tone="ok">Project template</Status></div>
            <div data-open={!confirmed}><dt>Wall height</dt><dd>{confirmed ? "3.00 m" : "Not shown on the plan"}</dd>{confirmed ? <Status tone="ok">Confirmed</Status> : <Status tone="open">Needs confirmation</Status>}</div>
          </dl>
        </div>
        <StageArrow />
        <div className={styles.sheet}>
          <p className={styles.stageLabel}><span>3</span>First model</p>
          <ModelView selected={selected} confirmed={confirmed} onSelect={setSelected} />
          {confirmed ? (
            <div className={styles.modelResult}>
              <span className={styles.outputTag}><Check size={13} strokeWidth={2} aria-hidden="true" /> Editable starting model</span>
              <p>Five walls and one floor. No doors, roof, or materials are invented.</p>
              <button type="button" className={styles.textButton} onClick={() => setConfirmed(false)}><RotateCcw size={13} strokeWidth={1.6} aria-hidden="true" /> Reset example</button>
            </div>
          ) : (
            <div className={styles.waiting}>
              <p className={styles.waitingTitle}>Waiting for one input</p>
              <p>Wall height needs confirmation. The wall positions are placed, but the walls are not created yet.</p>
              <button type="button" className={styles.confirm} onClick={() => setConfirmed(true)}>Confirm 3.00 m wall height</button>
              <p className={styles.waitingNote}>The template suggests 3.00 m. The project engineer confirms it.</p>
            </div>
          )}
          <p className={styles.sheetMeta}>Illustration of the resulting model, not a downloadable file</p>
        </div>
      </div>
    </Example>
  );
}

/* 2. Check how designs fit */

const SECTION_SCALE = 50;
const SX = (x: number) => 20 + x * SECTION_SCALE;
const SY = (depth: number) => 34 + depth * SECTION_SCALE;
const BEAMS = [
  { id: "B-12", x0: 1.4, x1: 1.8, depth: 0.35 },
  { id: "B-13", x0: 4.2, x1: 4.6, depth: 0.8 },
];
const DUCT = { top: 0.5, height: 0.45 };
const REVISED_DUCT_TOP = 0.85;
const CEILING = 1.45;
const CLASH = { x0: 4.2, x1: 4.6, top: DUCT.top, bottom: 0.8 };

type Layers = { structural: boolean; ventilation: boolean; revised?: boolean; marked?: boolean; focus?: boolean; viewBox?: string };

function Section({ structural, ventilation, revised = false, marked = false, focus = false, viewBox = "0 0 340 122" }: Layers) {
  const patternId = `de-overlap-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const ductTop = revised ? REVISED_DUCT_TOP : DUCT.top;
  const overlap = structural && ventilation && !revised;
  return (
    <svg viewBox={viewBox} className={styles.drawing} aria-hidden="true">
      {overlap && (
        <defs>
          <pattern id={patternId} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="#fed603" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="#17191a" strokeWidth="1.6" />
          </pattern>
        </defs>
      )}
      <rect width="340" height="122" fill="#fff" />
      <line x1={SX(0)} y1={SY(CEILING)} x2={SX(6)} y2={SY(CEILING)} stroke="#9a9b9b" strokeDasharray="4 3" />
      <text x={SX(6)} y={SY(CEILING) + 11} textAnchor="end" className={styles.planText}>Ceiling, for reference</text>
      {structural && (
        <g>
          <rect x={SX(0)} y={SY(-0.24)} width={6 * SECTION_SCALE} height={0.24 * SECTION_SCALE} fill="#c9cac8" stroke="#262829" />
          <text x={SX(0) + 4} y={SY(-0.24) - 4} className={styles.planText}>Slab</text>
          {BEAMS.map((beam) => (
            <g key={beam.id}>
              <rect x={SX(beam.x0)} y={SY(0)} width={(beam.x1 - beam.x0) * SECTION_SCALE} height={beam.depth * SECTION_SCALE} fill="#c9cac8" stroke="#262829" strokeWidth={focus && beam.id === "B-13" ? 2.5 : 1} />
              <text x={SX((beam.x0 + beam.x1) / 2)} y={SY(-0.24) - 4} textAnchor="middle" className={focus && beam.id === "B-13" ? styles.planTextStrong : styles.planText}>Beam {beam.id}</text>
            </g>
          ))}
        </g>
      )}
      {ventilation && (
        <g>
          {revised && <rect x={SX(0)} y={SY(DUCT.top)} width={6 * SECTION_SCALE} height={DUCT.height * SECTION_SCALE} fill="none" stroke="#9a9b9b" strokeDasharray="2 3" />}
          <rect x={SX(0)} y={SY(ductTop)} width={6 * SECTION_SCALE} height={DUCT.height * SECTION_SCALE} fill="rgb(0 125 254 / 16%)" stroke="#007dfe" strokeWidth={focus ? 2.5 : 1.5} strokeDasharray={revised ? "6 3" : undefined} />
          <text x={SX(0.15)} y={SY(ductTop + DUCT.height / 2) + 4} className={styles.ductText}>Supply duct SD-04{revised ? ", lowered" : ""}</text>
        </g>
      )}
      {overlap && (
        <g>
          <rect x={SX(CLASH.x0)} y={SY(CLASH.top)} width={(CLASH.x1 - CLASH.x0) * SECTION_SCALE} height={(CLASH.bottom - CLASH.top) * SECTION_SCALE} fill={`url(#${patternId})`} stroke="#17191a" />
          {marked && <rect x={SX(CLASH.x0) - 7} y={SY(CLASH.top) - 7} width={(CLASH.x1 - CLASH.x0) * SECTION_SCALE + 14} height={(CLASH.bottom - CLASH.top) * SECTION_SCALE + 14} fill="none" stroke="#17191a" strokeWidth="1.5" strokeDasharray="4 3" />}
        </g>
      )}
    </svg>
  );
}

const CHECKS: { check: string; result: string; tone: "ok" | "open" | "quiet"; status: string }[] = [
  { check: "Do elements occupy the same space?", result: "Checked in this example. One overlap found.", tone: "open", status: "Checked" },
  { check: "Is there enough maintenance space around the duct?", result: "Needs a stated clearance requirement before it can be checked.", tone: "quiet", status: "Requirement needed" },
  { check: "Does the design meet code and project requirements?", result: "Not assessed by a geometry check.", tone: "quiet", status: "Not checked" },
];

export function DesignFit() {
  const [layers, setLayers] = useState({ structural: true, ventilation: true });
  const [focus, setFocus] = useState(false);
  const [revised, setRevised] = useState(false);
  const combined = layers.structural && layers.ventilation;
  const toggle = (key: "structural" | "ventilation") => setLayers((current) => ({ ...current, [key]: !current[key] }));
  const viewTitle = combined ? "Combined view" : layers.structural ? "Structural design only" : layers.ventilation ? "Ventilation design only" : "No discipline shown";
  return (
    <Example
      title="Corridor ceiling, level 3"
      start={<p>Two discipline models for the same corridor: <strong>structural</strong> and <strong>ventilation</strong>.</p>}
      resultLabel="Finding for review"
      result={<p><strong>Duct and beam overlap.</strong> These elements occupy the same space in the example model.</p>}
      next={<p>Review the duct route with the structural team.</p>}
    >
      <div className={styles.disciplines}>
        {(["structural", "ventilation"] as const).map((key) => (
          <button key={key} type="button" className={styles.discipline} aria-pressed={layers[key]} onClick={() => toggle(key)}>
            <span className={styles.disciplineHead}>
              <span className={styles.swatchKey} data-discipline={key} aria-hidden="true" />
              <span className={styles.sheetTitle}>{key === "structural" ? "Structural design" : "Ventilation design"}</span>
              <span className={styles.layerState}>{layers[key] ? "Shown in combined view" : "Hidden"}</span>
            </span>
            <Section structural={key === "structural"} ventilation={key === "ventilation"} />
            <span className={styles.sheetMeta}>{key === "structural" ? "Structural model: slab and beams B-12, B-13" : "Ventilation model: supply duct SD-04"}</span>
          </button>
        ))}
      </div>
      <div className={styles.combined}>
        <div className={styles.combinedHead}>
          <p className={styles.stageLabel}><span>=</span>{viewTitle}</p>
          {revised && combined
            ? <span className={styles.revisionTag}>Possible revision — requires review</span>
            : <span className={styles.sheetMeta}>Section along the corridor, same scale as the source models</span>}
        </div>
        <div className={styles.combinedGrid}>
        <div role="img" aria-label={combined ? (revised ? "Combined section with the duct lowered below beam B-13 as a possible revision. The original route is shown dotted." : "Combined section: supply duct SD-04 passes through the lower part of beam B-13. The overlapping area is hatched.") : `Section showing ${viewTitle.toLowerCase()}.`}>
          <Section structural={layers.structural} ventilation={layers.ventilation} revised={revised} marked={combined && !revised} focus={focus && combined} />
          {combined && !revised && (
            <div className={styles.closeUp}>
              <span className={styles.sheetMeta}>Close-up at beam B-13</span>
              <Section structural ventilation marked focus={focus} viewBox="190 8 110 92" />
            </div>
          )}
        </div>
        <div className={styles.combinedSide}>
        {!combined && <p className={styles.revisionNote}>Show both disciplines to combine them and check for overlaps.</p>}
        {combined && !revised && (
          <button type="button" className={styles.finding} aria-pressed={focus} onClick={() => setFocus(!focus)}>
            <span className={styles.findingText}><span className={styles.findingSwatch} aria-hidden="true" /><strong>Duct and beam overlap.</strong> These elements occupy the same space in the example model.</span>
            <span className={styles.findingAction}>{focus ? "Hide affected elements" : "Show affected elements"} <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" /></span>
          </button>
        )}
        {combined && !revised && focus && (
          <ul className={styles.affected} aria-label="Affected elements">
            <li><span className={styles.swatchKey} data-discipline="structural" aria-hidden="true" /><span><strong>Beam B-13</strong><span>Structural model, revision 04</span></span></li>
            <li><span className={styles.swatchKey} data-discipline="ventilation" aria-hidden="true" /><span><strong>Supply duct SD-04</strong><span>Ventilation model, revision 02</span></span></li>
          </ul>
        )}
        {combined && (
          <div className={styles.revisionToggle}>
            <button type="button" className={styles.textButton} aria-pressed={revised} onClick={() => { setRevised(!revised); setFocus(false); }}>
              {revised ? <><RotateCcw size={13} strokeWidth={1.6} aria-hidden="true" /> Back to the original route</> : <>Sketch a possible revision <ArrowRight size={13} strokeWidth={1.6} aria-hidden="true" /></>}
            </button>
            {revised && <p className={styles.revisionNote}>The overlap disappears in this sketch, but that does not make the route acceptable. Lowering the duct reduces the space above the ceiling. The ventilation and structural teams decide.</p>}
          </div>
        )}
        </div>
        </div>
      </div>
      <div className={styles.checks}>
        <p className={styles.sheetLabel}>What this check covers</p>
        <ul>
          {CHECKS.map((item) => (
            <li key={item.check}>
              <span className={styles.checkQuestion}>{item.check}</span>
              <span className={styles.checkResult}>{item.result}</span>
              <Status tone={item.tone}>{item.status}</Status>
            </li>
          ))}
        </ul>
      </div>
    </Example>
  );
}

/* 3. Understand revisions */

const ROOM_SCALE = 48;
const RX = (x: number) => 24 + x * ROOM_SCALE;
const RY = (y: number) => 24 + y * ROOM_SCALE;
const rect = (x0: number, y0: number, x1: number, y1: number) => ({ x: RX(x0), y: RY(y0), width: (x1 - x0) * ROOM_SCALE, height: (y1 - y0) * ROOM_SCALE });

type Focus = "space" | "connections" | "support";

const QUESTIONS: { id: Focus; area: string; question: string; part: string; reviewer: string; kind: string; source: string; lines: string[]; note: string }[] = [
  {
    id: "space",
    area: "Space",
    question: "Does the unit still fit with the required access?",
    part: "Access space around the equipment",
    reviewer: "Mechanical lead",
    kind: "Approved project requirement",
    source: "Plant room requirement R-03",
    lines: ["Keep a service access space in front of the unit", "The existing tank stays in place"],
    note: "The larger unit moves its access space closer to the existing tank. The mechanical lead checks whether the required access still fits.",
  },
  {
    id: "connections",
    area: "Connections",
    question: "Do the connection locations still match?",
    part: "Connection points",
    reviewer: "Mechanical designer",
    kind: "Revised supplier drawing",
    source: "Supplier drawing, replacement unit, revision 2",
    lines: ["Two pipe connections on the east side", "Positions differ from the approved unit"],
    note: "The designed pipe routes end at the previous connection positions. The mechanical designer confirms the new routes.",
  },
  {
    id: "support",
    area: "Supporting design",
    question: "Have the structural and electrical requirements changed?",
    part: "Supporting equipment requirements",
    reviewer: "Structural and electrical engineers",
    kind: "Previous design decision",
    source: "Design decision DD-07",
    lines: ["Equipment base designed for the approved unit", "Power supply point designed for the approved unit"],
    note: "The supplier's revised weight and power information must be checked by the structural and electrical engineers. No values are assumed here.",
  },
];

function PlantRoom({ focus }: { focus: Focus }) {
  const on = (part: Focus) => focus === part;
  return (
    <svg viewBox="0 0 290 216" className={styles.drawing} role="img" aria-label="Plant room plan. The previously approved unit, 1,200 by 800 millimetres, and the proposed replacement, 1,600 by 1,000 millimetres, drawn from the same corner. The access space in front, the pipe connections, the equipment base, and the power supply point are marked.">
      <defs>
        <pattern id="de-access" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke={on("space") ? "#0054b8" : "#9fc6f5"} strokeWidth="1.4" />
        </pattern>
      </defs>
      <rect {...rect(0, 0, 5, 3.4)} fill="#fff" stroke="#262829" strokeWidth="4" />
      <line x1={RX(3.8)} y1={RY(3.4)} x2={RX(4.7)} y2={RY(3.4)} stroke="#fff" strokeWidth="6" />
      <path d={`M ${RX(3.8)} ${RY(3.4)} L ${RX(3.8)} ${RY(2.5)} A ${0.9 * ROOM_SCALE} ${0.9 * ROOM_SCALE} 0 0 1 ${RX(4.7)} ${RY(3.4)}`} fill="none" stroke="#9a9b9b" />
      <rect {...rect(0.3, 2.55, 2.0, 3.2)} fill="#eeeeec" stroke={on("space") ? "#17191a" : "#9a9b9b"} strokeWidth={on("space") ? 1.5 : 1} />
      <text x={RX(1.15)} y={RY(2.95)} textAnchor="middle" className={styles.planText}>Existing tank</text>
      <rect {...rect(0.8, 1.5, 2.4, 2.3)} fill="url(#de-access)" stroke={on("space") ? "#0054b8" : "#9fc6f5"} strokeWidth={on("space") ? 1.5 : 1} strokeDasharray="4 3" />
      <text x={RX(2.5)} y={RY(2.0)} className={on("space") ? styles.planTextStrong : styles.planText}>Access space</text>
      <rect {...rect(0.7, 0.4, 2.1, 1.4)} fill="none" stroke={on("support") ? "#17191a" : "#9a9b9b"} strokeWidth={on("support") ? 1.8 : 1} strokeDasharray="8 3 2 3" />
      <rect {...rect(0.8, 0.5, 2.4, 1.5)} fill="#fed603" fillOpacity="0.55" stroke="#17191a" strokeWidth="1.2" strokeDasharray="5 3" />
      <rect {...rect(0.8, 0.5, 2.0, 1.3)} fill="#f5f5f2" stroke="#555758" strokeWidth="1.5" />
      {[0.75, 1.05].map((y) => <line key={y} x1={RX(2.0)} y1={RY(y)} x2={RX(5)} y2={RY(y)} stroke={on("connections") ? "#17191a" : "#9a9b9b"} strokeWidth={on("connections") ? 2 : 1.2} />)}
      {[0.75, 1.05].map((y) => <circle key={y} cx={RX(2.0)} cy={RY(y)} r="3.5" fill="#fff" stroke="#555758" strokeWidth="1.5" />)}
      {[0.8, 1.2].map((y) => <circle key={y} cx={RX(2.4)} cy={RY(y)} r={on("connections") ? 5 : 3.5} fill="#fed603" stroke="#17191a" strokeWidth="1.5" />)}
      <rect x={RX(1.4) - 7} y={RY(0) + 3} width="14" height="12" fill={on("support") ? "#17191a" : "#fff"} stroke="#17191a" />
      <text x={RX(1.4)} y={RY(0) + 12.5} textAnchor="middle" className={styles.tagText} fill={on("support") ? "#fff" : "#17191a"}>E</text>
      <text x={RX(1.4)} y={RY(0.92)} textAnchor="middle" className={styles.planTextStrong}>Unit</text>
      <text x={RX(3.7)} y={RY(0.62)} textAnchor="middle" className={styles.planText}>Designed pipe routes</text>
    </svg>
  );
}

export function RevisionScope() {
  const [selected, setSelected] = useState<Focus>("space");
  const question = QUESTIONS.find((item) => item.id === selected) ?? QUESTIONS[0];
  return (
    <Example
      title="Plant room, replacement unit"
      start={<p><strong>Supplier proposes a larger equipment unit</strong> for a room that was already designed around the approved one.</p>}
      resultLabel="Finding for review"
      result={<p><strong>A focused review for the affected disciplines.</strong> Three questions, each linked to its source. None is a confirmed problem yet.</p>}
      next={<p>Each discipline confirms what needs to change.</p>}
    >
      <div className={styles.event}>
        <p className={styles.sheetLabel}>Revision received</p>
        <p className={styles.eventTitle}>Supplier proposes a larger equipment unit.</p>
        <ul className={styles.legend}>
          <li><span className={styles.legendApproved} aria-hidden="true" />Previously approved <strong>1,200 × 800 mm</strong></li>
          <li><span className={styles.legendProposed} aria-hidden="true" />Proposed replacement <strong>1,600 × 1,000 mm</strong></li>
        </ul>
      </div>
      <div className={styles.revision}>
        <div className={`${styles.sheet} ${styles.stickyPlan}`}>
          <p className={styles.stageLabel}><span>A</span>Same room, both footprints</p>
          <PlantRoom focus={selected} />
          <p className={styles.sheetMeta}>Highlighted: {question.part.toLowerCase()}</p>
        </div>
        <div className={styles.questionsColumn}>
          <p className={styles.sheetLabel}>Questions for review</p>
          <div className={styles.questionList} role="group" aria-label="Review questions">
            {QUESTIONS.map((item) => (
              <button key={item.id} type="button" className={styles.question} aria-pressed={selected === item.id} onClick={() => setSelected(item.id)}>
                <span className={styles.questionArea}>{item.area}</span>
                <span className={styles.questionText}>{item.question}</span>
                <span className={styles.questionReviewer}>{item.reviewer}</span>
                <span className={styles.questionStatus}>Needs review</span>
              </button>
            ))}
          </div>
          <div className={styles.evidence} aria-live="polite">
            <p className={styles.sheetLabel}>Source · {question.kind}</p>
            <p className={styles.evidenceTitle}>{question.source}</p>
            <ul>{question.lines.map((line) => <li key={line}>{line}</li>)}</ul>
            <p className={styles.evidenceNote}>{question.note}</p>
          </div>
        </div>
      </div>
    </Example>
  );
}

/* 4. Prepare the deliverables */

type WindowMark = { mark: string; elevation: "South" | "East"; size: string; type: string; from: number; to: number; width: number };

const WINDOWS: WindowMark[] = [
  { mark: "W01", elevation: "South", size: "1200 × 1500", type: "Type A", from: 1.2, to: 2.4, width: 1.2 },
  { mark: "W02", elevation: "South", size: "1200 × 1500", type: "Type A", from: 4.6, to: 5.8, width: 1.2 },
  { mark: "W03", elevation: "East", size: "900 × 1500", type: "Type B", from: 1.0, to: 1.9, width: 0.9 },
  { mark: "W04", elevation: "East", size: "900 × 1500", type: "Type B", from: 3.0, to: 3.9, width: 0.9 },
];
const MISSING = "W03";
const BUILDING = { length: 8, depth: 5, height: 3.2, sill: 0.9, head: 2.4 };
const SMALL_MODEL = isometric(19, 102, 74);

function windowShape(item: WindowMark): Point[] {
  const { length, depth, sill, head } = BUILDING;
  if (item.elevation === "South") return [SMALL_MODEL(item.from, depth, sill), SMALL_MODEL(item.to, depth, sill), SMALL_MODEL(item.to, depth, head), SMALL_MODEL(item.from, depth, head)];
  return [SMALL_MODEL(length, item.from, sill), SMALL_MODEL(length, item.to, sill), SMALL_MODEL(length, item.to, head), SMALL_MODEL(length, item.from, head)];
}

function BuildingModel({ selected, flagged, onSelect }: { selected: string | null; flagged: boolean; onSelect: (mark: string) => void }) {
  const body = boxFaces(SMALL_MODEL, { x0: 0, x1: BUILDING.length, y0: 0, y1: BUILDING.depth, z0: 0, z1: BUILDING.height });
  return (
    <svg viewBox="0 0 260 214" className={styles.drawing} role="img" aria-label="Simple building model with four windows: W01 and W02 on the south side, W03 and W04 on the east side.">
      <polygon points={body.south} fill="#eeeeec" stroke="#262829" />
      <polygon points={body.east} fill="#d8d9d9" stroke="#262829" />
      <polygon points={body.top} fill="#f9f9f7" stroke="#262829" />
      {WINDOWS.map((item) => {
        const shape = windowShape(item);
        const active = selected === item.mark;
        const missing = flagged && item.mark === MISSING;
        const [labelX, labelY] = item.elevation === "South" ? SMALL_MODEL((item.from + item.to) / 2, BUILDING.depth, 0.45) : SMALL_MODEL(BUILDING.length, (item.from + item.to) / 2, 0.45);
        return (
          <g key={item.mark} className={styles.pickable} onClick={() => onSelect(item.mark)}>
            <polygon points={toPoints(shape)} fill={active ? "#fed603" : "#bcd8fb"} stroke="#17191a" strokeWidth={active || missing ? 2 : 1} strokeDasharray={missing && !active ? "3 2" : undefined} />
            <text x={labelX} y={labelY + 3} textAnchor="middle" className={active || missing ? styles.planTextStrong : styles.planText}>{item.mark}</text>
          </g>
        );
      })}
      {flagged && (() => {
        const [x, y] = SMALL_MODEL(BUILDING.length, 1.45, BUILDING.head + 0.55);
        return <g><rect x={x - 60} y={y - 10} width="86" height="15" fill="#fed603" stroke="#17191a" /><text x={x - 17} y={y + 1} textAnchor="middle" className={styles.tagText} fill="#17191a">Not in schedule</text></g>;
      })()}
    </svg>
  );
}

function Elevations() {
  const scale = 22;
  const base = 96;
  const facade = (x: number, length: number, side: "South" | "East") => (
    <g>
      <rect x={x} y={base - BUILDING.height * scale} width={length * scale} height={BUILDING.height * scale} fill="#fff" stroke="#262829" strokeWidth="1.5" />
      {WINDOWS.filter((item) => item.elevation === side).map((item) => (
        <g key={item.mark}>
          <rect x={x + item.from * scale} y={base - BUILDING.head * scale} width={item.width * scale} height={(BUILDING.head - BUILDING.sill) * scale} fill="#eaf3ff" stroke="#262829" />
          <text x={x + ((item.from + item.to) / 2) * scale} y={base + 13} textAnchor="middle" className={styles.planTextStrong}>{item.mark}</text>
        </g>
      ))}
      <text x={x} y={base - BUILDING.height * scale - 6} className={styles.planText}>{side} elevation</text>
    </g>
  );
  return (
    <svg viewBox="0 0 330 118" className={styles.drawing} role="img" aria-label="Draft elevation sheet: south elevation with windows W01 and W02, east elevation with windows W03 and W04.">
      {facade(8, BUILDING.length, "South")}
      {facade(206, BUILDING.depth, "East")}
      <line x1="0" y1={base} x2="330" y2={base} stroke="#9a9b9b" />
    </svg>
  );
}

type Tab = "schedule" | "sheet" | "notes";
const TABS: { id: Tab; label: string }[] = [
  { id: "sheet", label: "Drawing sheet" },
  { id: "schedule", label: "Window schedule" },
  { id: "notes", label: "Review notes" },
];
const PIPELINE = ["Reviewed inputs", "Draft documents", "Consistency checks", "Professional review"];

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
  const notes: { check: string; result: string; tone: "ok" | "open" | "quiet"; status: string }[] = [
    { check: "Window count", result: corrected ? "Model 4, schedule 4." : "Model 4, schedule 3.", tone: corrected ? "ok" : "open", status: corrected ? "Matches" : "Issue" },
    { check: "Missing entry", result: corrected ? "W03 added from the reviewed model." : "W03 is modeled on the east side but not listed in the schedule.", tone: corrected ? "ok" : "open", status: corrected ? "Resolved" : "Issue" },
    { check: "Drawing sheet A-201", result: "All four window tags match the model.", tone: "ok", status: "Matches" },
    { check: "Package status", result: corrected ? "Ready for review. Not approved or issued." : "Draft. One issue to resolve first.", tone: "quiet", status: corrected ? "Ready for review" : "Draft" },
  ];
  const stage = corrected ? 3 : 2;
  return (
    <Example
      title="Window schedule and elevation sheet"
      start={<p>A <strong>reviewed model with four windows</strong>, and the firm&apos;s schedule and sheet templates.</p>}
      resultLabel={corrected ? "Result for review" : "Finding for review"}
      result={corrected
        ? <p><strong>Window schedule, 4 entries.</strong> Ready for review, not approved or issued.</p>
        : <p><strong>One modeled window is missing from the schedule.</strong> The draft lists 3 entries.</p>}
      next={<p>Review and update the schedule.</p>}
    >
      <ol className={styles.pipeline} aria-label="Document workflow">
        {PIPELINE.map((step, stepIndex) => (
          <li key={step} data-state={stepIndex < stage ? "done" : stepIndex === stage ? "current" : "later"}>
            <span className={styles.pipelineIndex}>{stepIndex < stage ? <Check size={12} strokeWidth={2.2} aria-hidden="true" /> : String(stepIndex + 1).padStart(2, "0")}</span>
            <span>{step}</span>
            {stepIndex === 2 && <em>{corrected ? "No issues" : "1 issue"}</em>}
            {stepIndex === 3 && <em>{corrected ? "Next, by your team" : "Not started"}</em>}
          </li>
        ))}
      </ol>
      <div className={styles.documents}>
        <div ref={model} className={styles.sheet}>
          <p className={styles.stageLabel}><span>In</span>Reviewed model</p>
          <p className={styles.figure}><span>4</span> windows</p>
          <BuildingModel selected={selected} flagged={!corrected} onSelect={(mark) => setSelected(selected === mark ? null : mark)} />
          <p className={styles.sheetMeta}>Window information as reviewed by the project team</p>
        </div>
        <div className={styles.sheet}>
          <p className={styles.stageLabel}><span>Out</span>Draft documents</p>
          <div className={styles.tabs} role="group" aria-label="Choose a deliverable">
            {TABS.map((item) => <button key={item.id} type="button" className={styles.tab} aria-pressed={tab === item.id} onClick={() => setTab(item.id)}>{item.label}</button>)}
          </div>
          <div aria-live="polite">
            {tab === "schedule" && (
              <div className={styles.excerpt}>
                <div className={styles.excerptHead}>
                  <span><strong>Window schedule</strong> {corrected ? "Corrected draft" : "Draft"}</span>
                  <span className={styles.countTag} data-ok={corrected}>{rows.length} entries</span>
                </div>
                <div className={styles.schedule}>
                  <span className={styles.scheduleHead} aria-hidden="true"><span>Mark</span><span>Side</span><span>Size, mm</span><span>Type</span></span>
                  {WINDOWS.map((item) => {
                    const listed = corrected || item.mark !== MISSING;
                    return listed ? (
                      <button key={item.mark} type="button" className={styles.scheduleRow} aria-pressed={selected === item.mark} data-added={corrected && item.mark === MISSING} onClick={() => pick(item.mark)}>
                        <span>{item.mark}</span><span>{item.elevation}</span><span>{item.size}</span><span>{item.type}</span>
                      </button>
                    ) : (
                      <button key={item.mark} type="button" className={styles.missingRow} aria-pressed={selected === item.mark} onClick={() => pick(item.mark)}>
                        <span>No entry for {item.mark}. A modeled window is missing here.</span>
                        <span className={styles.findingAction}>{selected === item.mark ? "Shown in the model" : "Show in the model"} <ArrowRight size={13} strokeWidth={1.5} aria-hidden="true" /></span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {tab === "sheet" && (
              <div className={styles.excerpt}>
                <div className={styles.excerptHead}>
                  <span><strong>A-201 Elevations</strong> Draft</span>
                  <span className={styles.countTag} data-ok="true">4 window tags</span>
                </div>
                <Elevations />
                <p className={styles.titleBlock}><span>Sheet A-201</span><span>From the firm&apos;s sheet template</span><span>Draft for review</span></p>
              </div>
            )}
            {tab === "notes" && (
              <div className={styles.excerpt}>
                <div className={styles.excerptHead}>
                  <span><strong>Review notes</strong> Consistency checks against the model</span>
                </div>
                <ul className={styles.notes}>
                  {notes.map((note) => (
                    <li key={note.check}><span className={styles.checkQuestion}>{note.check}</span><span className={styles.checkResult}>{note.result}</span><Status tone={note.tone}>{note.status}</Status></li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className={`${styles.finding} ${styles.findingStatic}`} data-resolved={corrected}>
            <span className={styles.findingText}>
              <span className={styles.findingSwatch} aria-hidden="true" />
              {corrected ? <><strong>4 entries. Ready for review.</strong> The schedule now matches the reviewed model. Approval stays with your team.</> : <><strong>One modeled window is missing from the schedule.</strong> Review and update the schedule.</>}
            </span>
            <button type="button" className={styles.findingAction} onClick={() => { setCorrected(!corrected); setSelected(corrected ? null : MISSING); setTab("schedule"); }}>
              {corrected ? <><RotateCcw size={13} strokeWidth={1.6} aria-hidden="true" /> Back to the first draft</> : <>Show the corrected draft <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" /></>}
            </button>
          </div>
        </div>
      </div>
    </Example>
  );
}
