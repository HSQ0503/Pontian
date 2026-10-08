"use client";

import { useId, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowRight, Check, Mic, RotateCcw } from "lucide-react";
import styles from "./property-services.module.css";

type Area = "driveway" | "patio" | "path" | "fence" | "gate";
type AreaTone = "scope" | "excluded" | "open" | "access";
type Tone = "proposed" | "accepted" | "excluded" | "open" | "neutral" | "done" | "needed" | "ready" | "reviewed";
type Point = readonly [number, number];
type Box = readonly [number, number, number, number];

const PROPERTY = "Alder Lane property";
const RECORD = ["Walkthrough and estimate", "Crew briefing", "Visit evidence", "Next visit"];
const AREA_TONE: Record<Area, AreaTone> = { driveway: "scope", patio: "scope", path: "open", fence: "excluded", gate: "access" };
const AREA_NAME: Record<Area, string> = { driveway: "Driveway", patio: "Rear patio", path: "Side path", fence: "Painted fence", gate: "Side gate" };
const ALL_AREAS: Area[] = ["driveway", "patio", "path", "fence", "gate"];

const svgId = (id: string) => id.replace(/[^a-zA-Z0-9]/g, "");
const place = (box: Box, [x, y]: Point): CSSProperties => ({ left: `${((x - box[0]) / box[2]) * 100}%`, top: `${((y - box[1]) / box[3]) * 100}%` });

function Status({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={styles.status} data-tone={tone}>{children}</span>;
}

type ExampleProps = {
  stage: number;
  title: string;
  children: ReactNode;
  situation: ReactNode;
  finding: ReactNode;
  next: ReactNode;
  findingLabel?: string;
  boundary: ReactNode;
};

function Example({ stage, title, children, situation, finding, next, findingLabel = "Finding for review", boundary }: ExampleProps) {
  return (
    <figure className={styles.example}>
      <figcaption className={styles.exampleBar}>
        <span className={styles.exampleTag}>Example workflow</span>
        <span className={styles.exampleTitle}>{title}</span>
        <span className={styles.exampleNote}>Fictional property. Illustrations, not site photographs or measured drawings.</span>
      </figcaption>
      <ol className={styles.record} aria-label="Property record">
        {RECORD.map((item, index) => (
          <li key={item} data-state={index < stage ? "done" : index === stage ? "current" : "later"}>
            <span aria-hidden="true">{index < stage ? <Check size={11} strokeWidth={2.4} /> : index + 1}</span>
            {item}
          </li>
        ))}
      </ol>
      <div className={styles.exampleBody}>{children}</div>
      <ol className={styles.outcome}>
        <li data-role="situation"><span className={styles.outcomeLabel}>Situation</span>{situation}</li>
        <li data-role="finding"><span className={styles.outcomeLabel}>{findingLabel}</span>{finding}</li>
        <li data-role="next"><span className={styles.outcomeLabel}>Next step for your team</span>{next}</li>
      </ol>
      <div className={styles.boundary}><span className={styles.outcomeLabel}>Keep in mind</span>{boundary}</div>
    </figure>
  );
}

const PLAN_VIEWS = { wide: [8, 4, 384, 296], close: [48, 10, 280, 240] } as const satisfies Record<string, Box>;
const PLAN_LABELS: Record<Area, { at: Point; close?: Point; anchor?: Point; start?: boolean }> = {
  driveway: { at: [182.5, 238] },
  patio: { at: [245, 66] },
  fence: { at: [90, 24], close: [104, 24] },
  gate: { at: [156, 106], anchor: [128, 118], start: true },
  path: { at: [156, 182], anchor: [130, 182], start: true },
};
const PLAN_NOTES: { text: string; at: Point }[] = [
  { text: "House", at: [262, 152] },
  { text: "Street", at: [356, 282] },
];
const FENCE_RUNS: Point[][] = [
  [[116, 118], [24, 118], [24, 24], [376, 24], [376, 118], [330, 118]],
  [[144, 118], [150, 118]],
];
const FENCE_POSTS = FENCE_RUNS.flatMap((run) => run.slice(1).flatMap((end, index) => {
  const start = run[index];
  const steps = Math.max(1, Math.round(Math.hypot(end[0] - start[0], end[1] - start[1]) / 23));
  return Array.from({ length: steps + 1 }, (_, step) => [start[0] + ((end[0] - start[0]) * step) / steps, start[1] + ((end[1] - start[1]) * step) / steps] as Point);
}));
const PATH_SLABS = Array.from({ length: 10 }, (_, index) => 66 + index * 13.4);
const HOUSE_OUTLINE = "150,90 330,90 330,176 215,176 215,200 150,200";

type PlanProps = {
  view: keyof typeof PLAN_VIEWS;
  label: string;
  marked?: Area[];
  labels?: Area[];
  selected?: Area | null;
  onSelect?: (area: Area) => void;
};

function PropertyPlan({ view, label, marked = ALL_AREAS, labels = ALL_AREAS, selected, onSelect }: PlanProps) {
  const uid = svgId(useId());
  const box = PLAN_VIEWS[view];
  const inView = ([x, y]: Point) => x >= box[0] && x <= box[0] + box[2] && y >= box[1] && y <= box[1] + box[3];
  const state = (area: Area) => (area === selected ? "selected" : marked.includes(area) ? "marked" : "plain");
  const labelAt = (area: Area) => (view === "close" && PLAN_LABELS[area].close) || PLAN_LABELS[area].at;
  const zone = (area: Area) => ({
    "data-tone": AREA_TONE[area],
    "data-state": state(area),
    className: `${styles.zone} ${onSelect ? styles.zoneLive : ""}`,
    onClick: onSelect ? () => onSelect(area) : undefined,
  });
  return (
    <div className={styles.planFrame}>
      <svg viewBox={box.join(" ")} className={styles.plan} role="img" aria-label={label}>
        <defs>
          <pattern id={`${uid}-lawn`} width="8" height="8" patternUnits="userSpaceOnUse">
            <rect width="8" height="8" fill="#efefeb" />
            <circle cx="2" cy="2" r=".55" fill="#dfe0da" />
            <circle cx="6" cy="6" r=".45" fill="#e4e5e0" />
          </pattern>
          <pattern id={`${uid}-pavers`} x="190" y="44" width="11" height="11.5" patternUnits="userSpaceOnUse">
            <rect width="11" height="11.5" fill="#f1f1ee" />
            <path d="M11 0V11.5M0 11.5H11" stroke="#d6d7d3" strokeWidth=".6" />
          </pattern>
          <filter id={`${uid}-shadow`} x="-10%" y="-10%" width="125%" height="130%">
            <feDropShadow dx="3" dy="4" stdDeviation="3.2" floodColor="#17191a" floodOpacity=".14" />
          </filter>
        </defs>

        <rect x="0" y="0" width="400" height="262" fill={`url(#${uid}-lawn)`} />
        <rect x="0" y="262" width="400" height="38" fill="#e0e1de" />
        <path d="M0 262.5H150M215 262.5H400" stroke="#b9bab6" strokeWidth="1.2" />
        <path d="M0 287H400" stroke="#f7f7f5" strokeWidth="1.2" strokeDasharray="12 9" />

        <g {...zone("patio")}>
          <rect x="190" y="44" width="110" height="46" fill={`url(#${uid}-pavers)`} />
          <rect x="190" y="44" width="110" height="46" className={styles.tint} />
        </g>
        <g {...zone("driveway")}>
          <rect x="150" y="200" width="65" height="62" fill="#ecece9" />
          <path d="M182.5 200V262M150 221H215M150 241.5H215" stroke="#d3d4d0" strokeWidth=".7" />
          <rect x="150" y="200" width="65" height="62" className={styles.tint} />
        </g>
        <g {...zone("path")}>
          <path d="M116 62H144V200H150V216H116Z" fill="#e7e7e3" />
          {PATH_SLABS.map((y) => <rect key={y} x="118.5" y={y} width="23" height="10.6" fill="#f7f7f4" stroke="#d3d4d0" strokeWidth=".6" />)}
          <rect x="118.5" y="200.5" width="30" height="13" fill="#f7f7f4" stroke="#d3d4d0" strokeWidth=".6" />
          <path d="M116 62H144V200H150V216H116Z" className={styles.tint} />
        </g>

        {[[350, 64, 18], [330, 228, 14]].map(([cx, cy, r]) => (
          <g key={cx}>
            <circle cx={cx + 3} cy={cy + 4} r={r} fill="#17191a" opacity=".07" />
            <circle cx={cx} cy={cy} r={r} fill="#e3e5df" stroke="#c4c6c0" strokeWidth=".8" />
            <circle cx={cx - r * .25} cy={cy - r * .25} r={r * .55} fill="#eaece6" />
          </g>
        ))}

        <polygon points={HOUSE_OUTLINE} fill="#fff" filter={`url(#${uid}-shadow)`} />
        <polygon points="150,90 330,90 287,133 193,133" fill="#f1f1ee" />
        <polygon points="150,176 330,176 287,133 193,133" fill="#fcfcfb" />
        <polygon points="150,90 193,133 150,176" fill="#e8e8e5" />
        <polygon points="330,90 287,133 330,176" fill="#f6f6f4" />
        <path d="M150 90 193 133H287L330 90M150 176 193 133M287 133 330 176" stroke="#b9bab6" strokeWidth=".8" fill="none" />
        <rect x="150" y="136" width="32.5" height="64" fill="#ebebe8" />
        <rect x="182.5" y="136" width="32.5" height="64" fill="#fafaf9" />
        <path d="M182.5 136V200M150 136H215" stroke="#b9bab6" strokeWidth=".8" />
        <polygon points={HOUSE_OUTLINE} fill="none" stroke="#262829" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M156 200H209" stroke="#555758" strokeWidth="3.2" />
        <rect x="238" y="84.5" width="20" height="5.5" fill="#dcdcd9" stroke="#8f908e" strokeWidth=".6" />

        <g {...zone("fence")}>
          {FENCE_RUNS.map((run) => <polyline key={run.join()} points={run.join(" ")} className={styles.fenceHalo} />)}
          {FENCE_RUNS.map((run) => <polyline key={run.join()} points={run.join(" ")} className={styles.fenceRail} />)}
          {FENCE_POSTS.map(([x, y]) => <rect key={`${x}-${y}`} x={x - 1.7} y={y - 1.7} width="3.4" height="3.4" className={styles.fencePost} />)}
          {FENCE_RUNS.map((run) => <polyline key={run.join()} points={run.join(" ")} className={styles.fenceHit} />)}
        </g>
        <g {...zone("gate")}>
          <rect x="108" y="88" width="44" height="38" className={styles.gateHit} />
          <path d="M144 118A28 28 0 0 0 116 90" className={styles.gateSwing} />
          <line x1="116" y1="118" x2="144" y2="118" className={styles.gateHalo} />
          <line x1="116" y1="118" x2="144" y2="118" className={styles.gateLeaf} />
          <circle cx="116" cy="118" r="2" className={styles.gateHinge} />
        </g>

        {labels.map((area) => {
          const { anchor } = PLAN_LABELS[area];
          const at = labelAt(area);
          return anchor && inView(anchor) ? (
            <g key={area} className={styles.leader} data-state={state(area)}>
              <line x1={anchor[0]} y1={anchor[1]} x2={at[0]} y2={at[1]} />
              <circle cx={anchor[0]} cy={anchor[1]} r="2.2" />
            </g>
          ) : null;
        })}
        {inView([30, 236]) && <path d="M30 222 35.5 238 30 234.5 24.5 238Z" fill="#555758" />}
      </svg>

      {labels.filter((area) => inView(labelAt(area))).map((area) => {
        const props = { className: styles.planChip, "data-tone": AREA_TONE[area], "data-state": state(area), "data-align": PLAN_LABELS[area].start ? "start" : undefined, style: place(box, labelAt(area)) };
        return onSelect
          ? <button key={area} type="button" {...props} aria-pressed={area === selected} onClick={() => onSelect(area)}>{AREA_NAME[area]}</button>
          : <span key={area} {...props}>{AREA_NAME[area]}</span>;
      })}
      {PLAN_NOTES.filter((note) => inView(note.at)).map((note) => (
        <span key={note.text} className={styles.planNote} style={place(box, note.at)} aria-hidden="true">{note.text}</span>
      ))}
      {inView([30, 236]) && <span className={styles.planNote} style={place(box, [30, 250])} aria-hidden="true">N</span>}
    </div>
  );
}

type Shot = "before" | "after";

function Vignette({ children, label }: { children: (uid: string) => ReactNode; label?: string }) {
  const uid = svgId(useId());
  return (
    <svg viewBox="0 0 320 200" className={styles.vignette} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <defs>
        <radialGradient id={`${uid}-stain`}>
          <stop offset="0" stopColor="#5d5e5b" stopOpacity=".42" />
          <stop offset="1" stopColor="#5d5e5b" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${uid}-frame`} cx=".5" cy=".42" r=".78">
          <stop offset=".62" stopColor="#17191a" stopOpacity="0" />
          <stop offset="1" stopColor="#17191a" stopOpacity=".09" />
        </radialGradient>
        <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ebecea" />
          <stop offset="1" stopColor="#f6f6f4" />
        </linearGradient>
      </defs>
      <rect width="320" height="200" fill={`url(#${uid}-sky)`} />
      {children(uid)}
      <rect width="320" height="200" fill={`url(#${uid}-frame)`} />
    </svg>
  );
}

function Stains({ uid, spots }: { uid: string; spots: [number, number, number, number][] }) {
  return <g>{spots.map(([cx, cy, rx, ry]) => <ellipse key={`${cx}-${cy}`} cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#${uid}-stain)`} />)}</g>;
}

function Pickets({ x, y, width, height, gap }: { x: number; y: number; width: number; height: number; gap: number }) {
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill="#fbfbfa" stroke="#a9aaa7" strokeWidth=".8" />
      {Array.from({ length: Math.floor(width / gap) }, (_, index) => <line key={index} x1={x + gap * (index + 1)} y1={y} x2={x + gap * (index + 1)} y2={y + height} stroke="#dcddd9" strokeWidth=".8" />)}
      <path d={`M${x} ${y + height * .18}H${x + width}M${x} ${y + height * .82}H${x + width}`} stroke="#c9cac6" strokeWidth=".8" />
    </g>
  );
}

function DrivewayView({ shot = "before", label }: { shot?: Shot; label?: string }) {
  const dirty = shot === "before";
  return (
    <Vignette label={label}>
      {(uid) => (
        <>
          <rect x="0" y="108" width="320" height="92" fill="#e4e5e0" />
          <Pickets x={0} y={70} width={56} height={40} gap={6} />
          <rect x="56" y="66" width="30" height="44" fill="#fff" stroke="#262829" strokeWidth="1.25" />
          <path d="M63.5 68V108M71 68V108M78.5 68V108" stroke="#c4c5c1" strokeWidth=".8" />
          <rect x="81" y="85" width="2.4" height="6" fill="#555758" />
          <polygon points="86,62 92,20 92,118 86,110" fill="#d4d4d1" />
          <polygon points="80,0 320,0 320,13 90,13" fill="#c9cac7" />
          <rect x="90" y="13" width="230" height="7" fill="#aeafab" />
          <rect x="92" y="20" width="228" height="98" fill="#e6e6e3" />
          <rect x="140" y="34" width="128" height="6" fill="#d3d4d0" />
          <rect x="146" y="40" width="116" height="78" fill="#f4f4f2" stroke="#8f908e" />
          {[55.5, 71, 86.5, 102].map((y) => <path key={y} d={`M146 ${y}H262`} stroke="#d6d7d3" strokeWidth=".9" />)}
          <rect x="281" y="46" width="28" height="38" fill="#d2d5d8" stroke="#8f908e" />
          <path d="M295 46V84M281 65H309" stroke="#f4f4f2" strokeWidth="1.2" />
          <polygon points="58,110 86,110 112,200 14,200" fill="#d6d7d3" />
          <path d="M49.2 128H91.2M38.4 150H97.6M25.7 176H105.1" stroke="#c4c5c1" strokeWidth=".8" />
          <polygon points="146,118 262,118 320,170 320,200 122,200" fill={dirty ? "#c5c6c2" : "#e1e1de"} />
          <path d="M204 118 221 200M139.6 140H286.5M131.4 168H317.8" stroke={dirty ? "#b1b2ae" : "#cfd0cc"} strokeWidth=".8" />
          {dirty && <Stains uid={uid} spots={[[192, 150, 42, 9], [252, 178, 36, 8], [160, 184, 22, 5], [228, 132, 20, 4]]} />}
          {dirty && <ellipse cx="214" cy="160" rx="10" ry="3" fill="#6f706d" opacity=".45" />}
          <rect x="0" y="192" width="320" height="8" fill="#cacbc7" />
          <path d="M0 192H320" stroke="#b4b5b1" />
        </>
      )}
    </Vignette>
  );
}

const PATIO_JOINTS = [-60, -10, 40, 90, 140, 180, 230, 280, 330, 380].map((bottom) => [160 + (bottom - 160) * 0.511, bottom]);

function PatioView({ shot = "before", label }: { shot?: Shot; label?: string }) {
  const dirty = shot === "before";
  const edge = (y: number) => [40 - (60 * (y - 112)) / 88, 280 + (60 * (y - 112)) / 88];
  return (
    <Vignette label={label}>
      {(uid) => (
        <>
          <Pickets x={0} y={40} width={320} height={46} gap={10} />
          {[0, 64, 128, 192, 256, 316].map((x) => <rect key={x} x={x} y="38" width="4" height="48" fill="#ededea" stroke="#b4b5b1" strokeWidth=".6" />)}
          <rect x="0" y="86" width="320" height="114" fill="#e4e5e0" />
          <ellipse cx="270" cy="100" rx="22" ry="4" fill="#17191a" opacity=".06" />
          <rect x="266" y="56" width="7" height="44" fill="#a9aaa7" />
          <circle cx="270" cy="38" r="36" fill="#dadcd6" />
          <circle cx="258" cy="28" r="20" fill="#e3e5df" />
          <polygon points="40,112 280,112 340,200 -20,200" fill={dirty ? "#c5c6c2" : "#e1e1de"} />
          <g stroke={dirty ? "#b1b2ae" : "#cfd0cc"} strokeWidth=".8">
            {PATIO_JOINTS.map(([top, bottom]) => <line key={bottom} x1={top} y1="112" x2={bottom} y2="200" />)}
            {[124, 140, 162, 188].map((y) => { const [left, right] = edge(y); return <line key={y} x1={left} y1={y} x2={right} y2={y} />; })}
          </g>
          {dirty && <Stains uid={uid} spots={[[112, 150, 44, 10], [212, 172, 48, 11], [248, 128, 26, 5], [72, 184, 32, 7]]} />}
          <rect x="0" y="191" width="320" height="9" fill="#a7a8a4" />
          <path d="M0 191H320" stroke="#c9cac6" />
        </>
      )}
    </Vignette>
  );
}

function SidePathView({ label }: { label?: string }) {
  const left = (y: number) => 150 - (110 * (y - 104)) / 96;
  const right = (y: number) => 184 + (84 * (y - 106)) / 94;
  return (
    <Vignette label={label}>
      {() => (
        <>
          <rect x="0" y="100" width="320" height="100" fill="#e4e5e0" />
          <Pickets x={0} y={66} width={150} height={36} gap={7} />
          <ellipse cx="58" cy="102" rx="30" ry="11" fill="#d7d9d3" />
          <rect x="150" y="62" width="34" height="42" fill="#fff" stroke="#262829" strokeWidth="1.25" />
          <path d="M158.5 64V102M167 64V102M175.5 64V102" stroke="#c4c5c1" strokeWidth=".8" />
          <rect x="179" y="80" width="2.4" height="6" fill="#555758" />
          <polygon points="184,50 320,-20 320,200 268,200 184,106" fill="#dededb" />
          {[1, 2, 3, 4].map((step) => <line key={step} x1="184" y1={50 + step * 11} x2="320" y2={-20 + step * 44} stroke="#d0d1cd" strokeWidth=".7" />)}
          <rect x="234" y="23" width="4" height="141" fill="#c6c7c3" />
          <polygon points="150,104 184,106 268,200 40,200" fill="#d6d7d3" />
          <g stroke="#c4c5c1" strokeWidth=".8">
            {[118, 136, 160, 190].map((y) => <line key={y} x1={left(y)} y1={y} x2={right(y)} y2={y} />)}
          </g>
        </>
      )}
    </Vignette>
  );
}

const PHOTOS = [
  { area: "driveway" as Area, caption: "Photo 1 · Driveway", View: DrivewayView },
  { area: "patio" as Area, caption: "Photo 2 · Rear patio and fence", View: PatioView },
  { area: "path" as Area, caption: "Photo 3 · Side path and gate", View: SidePathView },
];

type ScopeItem = { area: Area; label: string; status: [Tone, string]; photo: number; note: string; detail: ReactNode };

const SCOPE: ScopeItem[] = [
  { area: "driveway", label: "Driveway cleaning", status: ["proposed", "Proposed"], photo: 0, note: "\u201cDriveway and rear patio.\u201d", detail: "Proposed. The area is measured on site before it is priced." },
  { area: "patio", label: "Rear patio cleaning", status: ["proposed", "Proposed"], photo: 1, note: "\u201cDriveway and rear patio.\u201d", detail: "Proposed. The area is measured on site before it is priced." },
  { area: "fence", label: "Painted fence", status: ["excluded", "Excluded"], photo: 1, note: "\u201cLeave the painted fence alone.\u201d", detail: "Excluded on the owner\u2019s instruction. Appearing in a photo does not add it to the work." },
  { area: "path", label: "Side path", status: ["open", "Confirmation needed"], photo: 2, note: "\u201cConfirm the side path.\u201d", detail: <><strong>Not included in the accepted scope.</strong> It stays open unless a separate change is approved.</> },
];

const PRICING_INPUTS: [string, string][] = [
  ["Measured area", "Site measurement"],
  ["Selected service", "Your service catalog"],
  ["Approved pricing rule", "Your team"],
];

const ACCEPTED: [string, Tone, string][] = [
  ["Driveway cleaning", "accepted", "Accepted"],
  ["Rear patio cleaning", "accepted", "Accepted"],
  ["Painted fence", "excluded", "Excluded"],
  ["Side path", "neutral", "Not included"],
];

const SCOPE_STAGES = ["Walkthrough", "Draft scope", "Reviewed estimate"];

function StageHead({ index, title }: { index: number; title: string }) {
  return <p className={styles.stageHead}><span>{index + 1}</span>{title}</p>;
}

export function ScopeTheWork() {
  const [selected, setSelected] = useState(0);
  const [stage, setStage] = useState(0);
  const item = SCOPE[selected];
  const select = (area: Area) => {
    const index = SCOPE.findIndex((entry) => entry.area === area);
    if (index >= 0) setSelected(index);
  };
  const nextStage = (index: number) => (
    <button type="button" className={styles.continue} onClick={() => setStage(index)}>
      Continue to {SCOPE_STAGES[index].toLowerCase()} <ArrowRight size={15} strokeWidth={1.6} aria-hidden="true" />
    </button>
  );
  return (
    <Example
      stage={0}
      title={`${PROPERTY} · Walkthrough, 4 May`}
      situation={<p>The owner walks the property and records a spoken note and three photos.</p>}
      findingLabel="Result for review"
      finding={<p><strong>A reviewed scope with its reference photos.</strong> The side-path question stays outside it.</p>}
      next={<p>Your team checks measurements and pricing before the estimate goes out.</p>}
      boundary={<p>Ordinary photos do not establish dimensions, hidden conditions, or the right treatment method.</p>}
    >
      <div className={styles.scope}>
        <div className={styles.scopePlan}>
          <PropertyPlan view="wide" selected={item.area} onSelect={select} label={`Site plan of the fictional property: a house with a driveway to the street, a rear patio, a side path along the west wall, and a painted fence around the back garden with a side gate across the path. ${item.label} is highlighted.`} />
          <ul className={styles.legend}>
            <li><Status tone="proposed">Proposed work</Status></li>
            <li><Status tone="excluded">Excluded</Status></li>
            <li><Status tone="open">Confirmation needed</Status></li>
          </ul>
        </div>

        <div className={styles.stageNav} role="group" aria-label="Steps in this example">
          {SCOPE_STAGES.map((title, index) => (
            <button key={title} type="button" aria-pressed={stage === index} onClick={() => setStage(index)}><span>{index + 1}</span>{title}</button>
          ))}
        </div>

        <div className={styles.stage} data-stage="walkthrough" data-active={stage === 0}>
          <StageHead index={0} title="Walkthrough information" />
          <div className={styles.voiceNote}>
            <span className={styles.voiceIcon} aria-hidden="true"><Mic size={16} strokeWidth={1.6} /></span>
            <div>
              <p className={styles.sheetLabel}>Owner&rsquo;s spoken note</p>
              <p className={styles.quote}>&ldquo;Driveway and rear patio. Leave the painted fence alone. Confirm the side path.&rdquo;</p>
            </div>
          </div>
          <ul className={styles.photos} aria-label="Walkthrough photos, shown as illustrations">
            {PHOTOS.map((photo, index) => (
              <li key={photo.caption} data-active={item.photo === index}>
                <photo.View />
                <span>{photo.caption}</span>
              </li>
            ))}
          </ul>
          {nextStage(1)}
        </div>

        <div className={styles.stage} data-stage="draft" data-active={stage === 1}>
          <StageHead index={1} title="Structured scope" />
          <div className={styles.sheet}>
            <p className={styles.sheetLabel}>Draft for review</p>
            <div className={styles.choiceList}>
              {SCOPE.map((entry, index) => (
                <button key={entry.area} type="button" className={styles.choice} aria-pressed={selected === index} onClick={() => setSelected(index)}>
                  <span className={styles.choiceText}>{entry.label}</span>
                  <Status tone={entry.status[0]}>{entry.status[1]}</Status>
                </button>
              ))}
            </div>
            <div className={styles.detail} aria-live="polite">
              <p className={styles.detailSource}>{item.note}</p>
              <p className={styles.detailMeta}>Walkthrough note · {PHOTOS[item.photo].caption}</p>
              <p>{item.detail}</p>
            </div>
          </div>
          {nextStage(2)}
        </div>

        <div className={styles.stage} data-stage="estimate" data-active={stage === 2}>
          <StageHead index={2} title="Reviewed estimate" />
          <div className={styles.sheet}>
            <ol className={styles.reviewSteps}>
              <li>
                <strong>Review measurements and pricing</strong>
                <dl className={styles.inputs}>
                  {PRICING_INPUTS.map(([input, source]) => <div key={input}><dt>{input}</dt><dd>{source}</dd></div>)}
                </dl>
                <span>No price is set from an unscaled photo.</span>
              </li>
              <li>
                <strong>Prepare estimate</strong>
                <span>Driveway and rear patio cleaning, with the fence exclusion in writing.</span>
              </li>
              <li>
                <strong>Customer approves the stated work</strong>
                <span>Accepted 6 May.</span>
              </li>
            </ol>
            <div className={styles.accepted}>
              <p className={styles.sheetLabel}>Accepted scope</p>
              <ul className={styles.rows}>
                {ACCEPTED.map(([line, tone, status]) => <li key={line}><span>{line}</span><Status tone={tone}>{status}</Status></li>)}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Example>
  );
}

const AREA_BRIEF: Record<Area, { status: [Tone, string]; text: string }> = {
  driveway: { status: ["accepted", "Today\u2019s work"], text: "Driveway cleaning, from the accepted estimate." },
  patio: { status: ["accepted", "Today\u2019s work"], text: "Rear patio cleaning, from the accepted estimate." },
  fence: { status: ["excluded", "Excluded"], text: "\u201cLeave the painted fence alone.\u201d Recorded at the walkthrough and written into the estimate." },
  gate: { status: ["neutral", "Access"], text: "Use the side gate to reach the rear patio." },
  path: { status: ["open", "Not included"], text: "Not in the accepted estimate. Confirm additional work with the office." },
};

const BRIEFING: [string, string][] = [
  ["Today\u2019s work", "Driveway and rear patio"],
  ["Important instruction", "Painted fence excluded"],
  ["Access", "Use the side gate"],
  ["Reference", "Accepted estimate and walkthrough photos"],
];

type Excerpt = { title: string; lines: [string, Tone, string][]; note: string; highlight?: string };

const ESTIMATE_EXCERPT: Excerpt = { title: "Accepted estimate · 6 May", lines: ACCEPTED, note: "Side-path request remains unapproved.", highlight: "Side path" };

type CrewQuestion = { question: string; answer: string; status: [Tone, string]; sources: string[]; area: Area; excerpt: Excerpt };

const QUESTIONS: CrewQuestion[] = [
  {
    question: "Is the side path included?",
    answer: "The side path is not included in the accepted estimate. Confirm additional work with the office.",
    status: ["done", "From the record"],
    sources: ["Accepted estimate", "Side-path request remains unapproved"],
    area: "path",
    excerpt: ESTIMATE_EXCERPT,
  },
  {
    question: "What was done on the previous visit?",
    answer: "The last recorded visit, on 12 October last year, covered driveway cleaning only. Today\u2019s work comes from the accepted estimate.",
    status: ["done", "From the record"],
    sources: ["Service record · 12 October last year"],
    area: "driveway",
    excerpt: {
      title: "Service record · 12 October last year",
      lines: [["Driveway cleaning", "reviewed", "Completed"], ["Visit type", "neutral", "One-off"]],
      note: "A past visit does not change today\u2019s scope.",
    },
  },
  {
    question: "The customer asked for the side path too. Can we add it today?",
    answer: "Needs office confirmation. A request made on site does not change the accepted estimate, and no change has been approved.",
    status: ["open", "Needs office confirmation"],
    sources: ["Accepted estimate", "No approved change on record"],
    area: "path",
    excerpt: { ...ESTIMATE_EXCERPT, note: "No approved change on record. The office can prepare one for the customer to approve." },
  },
];

export function EquipTheCrew() {
  const [area, setArea] = useState<Area>("path");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [showSource, setShowSource] = useState(false);
  const question = QUESTIONS[questionIndex];
  const brief = AREA_BRIEF[area];
  const ask = (index: number) => {
    setQuestionIndex(index);
    setArea(QUESTIONS[index].area);
    setShowSource(false);
  };
  return (
    <Example
      stage={1}
      title={`${PROPERTY} · Day of service, 14 May`}
      situation={<p>The assigned crew sees the approved work, instructions, access, and the records behind them, and nothing else.</p>}
      findingLabel="Result for review"
      finding={<p><strong>Every answer shows its source,</strong> or says it needs office confirmation.</p>}
      next={<p>Questions without a supporting record go to the office.</p>}
      boundary={<p>Old notes, customer messages, and crew suggestions never override the accepted scope or authorize extra work.</p>}
    >
      <div className={styles.crewGrid}>
        <div className={styles.crewPlan}>
          <p className={styles.sheetLabel}>Closer view · Side of the house</p>
          <PropertyPlan view="close" selected={area} onSelect={setArea} label={`Closer view of the same property around the side gate, side path, rear patio, and the top of the driveway. ${AREA_NAME[area]} is highlighted.`} />
          <div className={styles.detail} aria-live="polite">
            <p className={styles.detailTitle}>{AREA_NAME[area]} <Status tone={brief.status[0]}>{brief.status[1]}</Status></p>
            <p>{brief.text}</p>
          </div>
        </div>

        <div className={styles.crewSide}>
          <div className={styles.sheet}>
            <p className={styles.sheetLabel}>Crew briefing · Thursday 14 May</p>
            <dl className={styles.briefing}>
              {BRIEFING.map(([term, value]) => <div key={term}><dt>{term}</dt><dd>{value}</dd></div>)}
            </dl>
          </div>
          <div className={styles.sheet}>
            <p className={styles.sheetLabel}>Questions from the crew</p>
            <div className={styles.choiceList}>
              {QUESTIONS.map((item, index) => (
                <button key={item.question} type="button" className={styles.choice} aria-pressed={questionIndex === index} onClick={() => ask(index)}>
                  <span className={styles.choiceText}>{item.question}</span>
                </button>
              ))}
            </div>
            <div className={styles.answer} aria-live="polite">
              <button type="button" className={styles.answerButton} aria-expanded={showSource} onClick={() => setShowSource(!showSource)}>
                <Status tone={question.status[0]}>{question.status[1]}</Status>
                <span className={styles.answerText}>{question.answer}</span>
                <span className={styles.sources}>Source: {question.sources.join(" · ")}</span>
                <span className={styles.findingAction}>{showSource ? "Hide the record" : "Show the record"} <ArrowRight size={14} strokeWidth={1.6} aria-hidden="true" /></span>
              </button>
              {showSource && (
                <div className={styles.excerpt}>
                  <p className={styles.sheetLabel}>{question.excerpt.title}</p>
                  <ul className={styles.rows}>
                    {question.excerpt.lines.map(([line, tone, status]) => (
                      <li key={line} data-marked={question.excerpt.highlight === line}><span>{line}</span><Status tone={tone}>{status}</Status></li>
                    ))}
                  </ul>
                  <p className={styles.smallNote}>{question.excerpt.note}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Example>
  );
}

type WorkId = "driveway" | "patio";

const REVIEW_STEPS = ["Check evidence against approved tasks", "Documentation ready for review", "Supervisor reviews", "Service summary prepared"];
const STEP_ACTIONS = ["Add the example patio photo", "Supervisor reviews", "Prepare the service summary", "Replay"];
const STEP_STATUS: [Tone, string][] = [
  ["needed", "Rear patio completion evidence is missing."],
  ["ready", "Documentation ready for review"],
  ["reviewed", "Supervisor reviewed the documentation"],
  ["reviewed", "Service summary prepared"],
];

export function ReviewTheResult() {
  const [work, setWork] = useState<WorkId>("patio");
  const [step, setStep] = useState(0);
  const patioComplete = step > 0;
  const items: { id: WorkId; label: string; evidence: [boolean, string][] }[] = [
    { id: "driveway", label: "Driveway cleaning", evidence: [[true, "Before photo received"], [true, "After photo received"]] },
    { id: "patio", label: "Rear patio cleaning", evidence: [[true, "Before photo received"], patioComplete ? [true, "Completion photo received"] : [false, "Completion photo needed"]] },
  ];
  const View = work === "driveway" ? DrivewayView : PatioView;
  const hasAfter = work === "driveway" || patioComplete;
  const advance = () => setStep(step === REVIEW_STEPS.length - 1 ? 0 : step + 1);
  const selectArea = (area: Area) => { if (area === "driveway" || area === "patio") setWork(area); };
  return (
    <Example
      stage={2}
      title={`${PROPERTY} · After the 14 May visit`}
      situation={<p>Completion photos and crew notes from 14 May, checked against the approved tasks.</p>}
      finding={<p><strong>Rear patio completion evidence is missing.</strong></p>}
      next={<p>Request the relevant photo or crew clarification.</p>}
      boundary={<p>Missing evidence does not prove missing work. A photo does not certify workmanship, safety, or hidden work.</p>}
    >
      <div className={styles.reviewGrid}>
        <div className={styles.workItems} style={{ gridArea: "items" }}>
          {items.map((item) => (
            <button key={item.id} type="button" className={styles.workItem} aria-pressed={work === item.id} onClick={() => setWork(item.id)}>
              <span className={styles.choiceText}>{item.label}</span>
              <span className={styles.evidenceList}>
                {item.evidence.map(([received, text]) => (
                  <span key={text} data-received={received}>{received ? <Check size={13} strokeWidth={2.2} aria-hidden="true" /> : <span className={styles.openMark} aria-hidden="true" />}{text}</span>
                ))}
              </span>
            </button>
          ))}
        </div>

        <div className={styles.sheet} style={{ gridArea: "pair" }}>
          <p className={styles.sheetLabel}>{work === "patio" ? "Rear patio" : "Driveway"} · Matched viewpoint</p>
          <div className={styles.pair} aria-live="polite">
            <div>
              <View shot="before" label={`Illustration of the ${work === "patio" ? "rear patio" : "driveway"} before cleaning`} />
              <p className={styles.photoMeta}><span className={styles.dotBefore} aria-hidden="true" />Before · 14 May, 9:10</p>
            </div>
            <div>
              {hasAfter ? <View shot="after" label={`Illustration of the ${work === "patio" ? "rear patio" : "driveway"} after cleaning, from the same viewpoint`} /> : <div className={styles.missing}><span>Completion photo needed</span></div>}
              <p className={styles.photoMeta}><span className={styles.dotAfter} aria-hidden="true" />{hasAfter ? `After · 14 May, ${work === "patio" ? "15:40" : "12:05"}` : "Nothing submitted for this task yet"}</p>
            </div>
          </div>
          <p className={styles.smallNote}>Same position and landmarks: {work === "patio" ? "the back step, the painted fence, and the tree" : "the garage door, the side path, and the gate"}.</p>
          {work === "patio" && patioComplete && (
            <p className={styles.crewNote}><span className={styles.sheetLabel}>Crew note · 15:40</span>Patio work completed; photo added for review.</p>
          )}
        </div>

        <div className={styles.reviewPlan} style={{ gridArea: "plan" }}>
          <PropertyPlan view="wide" marked={["driveway", "patio"]} labels={["driveway", "patio"]} selected={work} onSelect={selectArea} label={`The same property plan with the driveway and rear patio marked as approved work. ${work === "patio" ? "The rear patio" : "The driveway"} is highlighted.`} />
        </div>

        <div className={styles.sheet} style={{ gridArea: "status" }}>
          <div className={styles.stepperHead}>
            <p className={styles.sheetLabel}>Documentation status</p>
            <button type="button" className={styles.stepButton} onClick={advance}>
              {step === REVIEW_STEPS.length - 1 ? <RotateCcw size={15} strokeWidth={1.6} aria-hidden="true" /> : <ArrowRight size={15} strokeWidth={1.6} aria-hidden="true" />}
              {STEP_ACTIONS[step]}
            </button>
          </div>
          <p className={styles.statusLine} aria-live="polite"><Status tone={STEP_STATUS[step][0]}>{STEP_STATUS[step][1]}</Status></p>
          <ol className={styles.stepper}>
            {REVIEW_STEPS.map((label, index) => (
              <li key={label} data-state={index < step ? "done" : index === step ? "current" : "later"}>
                <span aria-hidden="true">{index < step ? <Check size={12} strokeWidth={2.2} /> : index + 1}</span>
                {label}
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className={styles.summary} data-ready={step === 3}>
        <div className={styles.summaryHead}>
          <p className={styles.sheetLabel}>Customer-facing service summary</p>
          <Status tone={step === 3 ? "reviewed" : "neutral"}>{step === 3 ? "Prepared after supervisor review" : "Prepared only after supervisor review"}</Status>
        </div>
        <dl className={styles.summaryGrid}>
          <div><dt>Approved services</dt><dd>Driveway cleaning<br />Rear patio cleaning</dd></div>
          <div><dt>Reviewed photographs</dt><dd>{step >= 2 ? <>Driveway, before and after<br />Rear patio, before and after</> : "Waiting for supervisor review"}</dd></div>
          <div><dt>Service notes</dt><dd>Painted fence excluded, as agreed.</dd></div>
          <div><dt>Unresolved item</dt><dd>Side path: requested on site, not included. The office will follow up.</dd></div>
        </dl>
        <p className={styles.smallNote}>Left out of the summary: internal pricing discussion and staff notes.</p>
      </div>
    </Example>
  );
}

type StopId = "birch" | "alder" | "cedar";
type Stop = {
  id: StopId; order: number; name: string; service: string; previous: string; access: string; duration: string;
  window: [number, number]; windowLabel: string; slot: [number, number]; slotLabel: string;
};

const STOPS: Stop[] = [
  { id: "birch", order: 1, name: "Birch Road property", service: "Exterior house wash, every 12 months by customer agreement", previous: "11 November last year: exterior house wash", access: "Front driveway. Outdoor tap on the left of the house.", duration: "About 2 hours", window: [8, 17], windowLabel: "Weekdays, 8:00\u201317:00", slot: [8, 10], slotLabel: "8:00\u201310:00" },
  { id: "alder", order: 2, name: "Alder Lane property", service: "Driveway and rear patio cleaning, every 6 months by customer agreement. Painted fence excluded.", previous: "14 May: driveway and rear patio cleaning, documentation reviewed", access: "Use the side gate.", duration: "About 3 hours", window: [8, 17], windowLabel: "Weekdays, 8:00\u201317:00", slot: [10.25, 13.25], slotLabel: "10:15\u201313:15" },
  { id: "cedar", order: 3, name: "Cedar Court property", service: "Patio cleaning, every 6 months by customer agreement", previous: "12 May: patio cleaning", access: "Afternoon access only. Park on Cedar Court.", duration: "About 1.5 hours", window: [13, 17], windowLabel: "Afternoons only, 13:00\u201317:00", slot: [13.5, 15], slotLabel: "13:30\u201315:00" },
];

const CHECKS: [string, Tone, string][] = [
  ["Already booked?", "done", "No visit on the calendar"],
  ["Plan paused or cancelled?", "done", "Agreement active"],
  ["Customer confirmation needed?", "needed", "Yes, before booking"],
];

const HISTORY: [string, string, string][] = [
  ["Previous service completed", "14 May", "Driveway and rear patio cleaning. Documentation reviewed."],
  ["Recurring service agreed", "20 May", "The customer chose a visit every 6 months: same scope, painted fence excluded."],
  ["Next visit approaching", "Due week of 9 November", "Same scope unless an approved change is recorded."],
];

const DAY_START = 8;
const DAY_HOURS = 9;
const TRAVEL: [number, number][] = [[10, 10.25], [13.25, 13.5]];
const span = ([start, end]: [number, number]): CSSProperties => ({ left: `${((start - DAY_START) / DAY_HOURS) * 100}%`, width: `${((end - start) / DAY_HOURS) * 100}%` });

const MAP_BOX: Box = [0, 0, 320, 190];
const MAP_POINTS: Record<StopId, Point> = { birch: [96, 86], alder: [170, 130], cedar: [280, 50] };
const MAP_NOTES: { text: string; at: Point }[] = [
  { text: "Birch Road", at: [52, 40] },
  { text: "Alder Lane", at: [282, 148] },
  { text: "Cedar Court", at: [290, 76] },
  { text: "Crew starts", at: [140, 16] },
];

const ALDER_MINI = HOUSE_OUTLINE.split(" ").map((pair) => {
  const [x, y] = pair.split(",").map(Number);
  return [160 + (x - 150) * .24, 90 + (y - 90) * .24] as Point;
});

function MiniHouse({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <g>
      <rect x={x + 2} y={y + 3} width={w} height={h} fill="#17191a" opacity=".08" />
      <rect x={x} y={y} width={w} height={h / 2} fill="#f1f1ee" />
      <rect x={x} y={y + h / 2} width={w} height={h / 2} fill="#fcfcfb" />
      <path d={`M${x} ${y + h / 2}H${x + w}`} stroke="#b9bab6" strokeWidth=".6" />
      <rect x={x} y={y} width={w} height={h} fill="none" stroke="#555758" strokeWidth=".9" />
    </g>
  );
}

function AreaMap({ selected, onSelect }: { selected: StopId; onSelect: (id: StopId) => void }) {
  const uid = svgId(useId());
  const outline = (id: StopId) => ({ className: styles.mapLot, "data-state": selected === id ? "selected" : "plain" });
  return (
    <div className={styles.planFrame}>
      <svg viewBox={MAP_BOX.join(" ")} className={styles.plan} role="img" aria-label="Simplified map of three nearby fictional properties. The proposed route runs south on Birch Road to stop 1, east along Alder Lane to stop 2, the Alder Lane property, then north to stop 3 on Cedar Court.">
        <defs>
          <pattern id={`${uid}-lawn`} width="8" height="8" patternUnits="userSpaceOnUse">
            <rect width="8" height="8" fill="#efefeb" />
            <circle cx="2" cy="2" r=".55" fill="#dfe0da" />
          </pattern>
        </defs>
        <rect width="320" height="190" fill={`url(#${uid}-lawn)`} />
        <g fill="#e0e1de" stroke="#c9cac6" strokeWidth=".8">
          <rect x="90" y="-2" width="12" height="194" />
          <rect x="90" y="124" width="232" height="12" />
          <rect x="224" y="44" width="12" height="92" />
          <rect x="224" y="44" width="98" height="12" />
        </g>
        <rect x="91" y="124.5" width="10" height="11" fill="#e0e1de" />
        <rect x="224.5" y="125" width="11" height="10" fill="#e0e1de" />
        <rect x="224.5" y="45" width="11" height="10" fill="#e0e1de" />

        <rect x="36" y="64" width="50" height="44" {...outline("birch")} />
        <rect x="80" y="82" width="10" height="9" fill="#ecece9" />
        <MiniHouse x={42} y={72} w={38} h={28} />

        <rect x="148" y="70" width="64" height="52" {...outline("alder")} />
        <rect x="169.6" y="79" width="26.4" height="11" fill="#f1f1ee" stroke="#b9bab6" strokeWidth=".5" />
        <rect x="160" y="116.4" width="15.6" height="7.6" fill="#e6e6e3" />
        <polygon points={ALDER_MINI.map(([x, y]) => `${x + 2},${y + 3}`).join(" ")} fill="#17191a" opacity=".08" />
        <polygon points={ALDER_MINI.join(" ")} fill="#fbfbfa" stroke="#555758" strokeWidth=".9" strokeLinejoin="round" />

        <rect x="256" y="6" width="52" height="36" {...outline("cedar")} />
        <rect x="274" y="36" width="10" height="8" fill="#ecece9" />
        <MiniHouse x={262} y={12} w={40} h={24} />

        <polyline points="96,6 96,130 230,130 230,50 280,50" className={styles.route} />
        <circle cx="96" cy="6" r="3.5" fill="#17191a" />
      </svg>
      {MAP_NOTES.map((note) => <span key={note.text} className={styles.planNote} style={place(MAP_BOX, note.at)} aria-hidden="true">{note.text}</span>)}
      {STOPS.map((stop) => (
        <button key={stop.id} type="button" className={styles.stopMarker} data-state={selected === stop.id ? "selected" : "plain"} style={place(MAP_BOX, MAP_POINTS[stop.id])} aria-pressed={selected === stop.id} aria-label={`Stop ${stop.order}, ${stop.name}`} onClick={() => onSelect(stop.id)}>{stop.order}</button>
      ))}
    </div>
  );
}

export function PlanTheNextVisit() {
  const [selected, setSelected] = useState<StopId>("alder");
  const stop = STOPS.find((item) => item.id === selected) ?? STOPS[1];
  return (
    <Example
      stage={3}
      title="Alder Lane and two nearby properties · Week of 9 November"
      situation={<p>The next Alder Lane visit is due the week of 9 November. Two nearby properties are due around the same time.</p>}
      findingLabel="Result for review"
      finding={<p><strong>A crew schedule and customer confirmations to review.</strong></p>}
      next={<p>Office approves the schedule before confirming visits.</p>}
      boundary={<p>Nothing is booked and no customer is contacted. Optimized grouping is a capability to validate with your team.</p>}
    >
      <div className={styles.planGrid}>
        <div className={styles.sheet}>
          <p className={styles.sheetLabel}>{PROPERTY} · Service history</p>
          <ol className={styles.history}>
            {HISTORY.map(([title, date, text]) => (
              <li key={title}>
                <strong>{title}</strong>
                <span className={styles.historyDate}>{date}</span>
                <span>{text}</span>
              </li>
            ))}
          </ol>
          <p className={styles.smallNote}>The interval comes from the customer agreement, not a recommendation.</p>
        </div>

        <div className={styles.sheet}>
          <p className={styles.question}>Can these visits fit into the same crew&rsquo;s day?</p>
          <p className={styles.detailMeta}>Proposed for Tuesday 10 November · Crew B available 8:00&ndash;16:30</p>
          <div className={styles.mapWrap}>
            <AreaMap selected={selected} onSelect={setSelected} />
          </div>
          <div className={styles.day}>
            <div className={styles.dayAxis} aria-hidden="true">
              {[0, 2, 4, 6, 8].map((hour) => <span key={hour} style={{ left: `${(hour / DAY_HOURS) * 100}%` }}>{DAY_START + hour}:00</span>)}
            </div>
            <div className={styles.dayRow}>
              <span className={styles.dayLabel}>Crew B, proposed</span>
              <span className={styles.dayTrack}>
                {TRAVEL.map((segment) => <span key={segment[0]} className={styles.travel} style={span(segment)} />)}
                {STOPS.map((item) => (
                  <button key={item.id} type="button" className={styles.slot} data-state={selected === item.id ? "selected" : "plain"} style={span(item.slot)} onClick={() => setSelected(item.id)} aria-label={`Stop ${item.order}, ${item.name}, ${item.slotLabel}`}>{item.order}</button>
                ))}
              </span>
            </div>
            {STOPS.map((item) => (
              <button key={item.id} type="button" className={styles.dayRow} data-state={selected === item.id ? "selected" : "plain"} aria-pressed={selected === item.id} onClick={() => setSelected(item.id)}>
                <span className={styles.dayLabel}>
                  <span className={styles.stopNumber}>{item.order}</span>{item.name}
                  <span className={styles.dayTimes}>Window {item.windowLabel.toLowerCase()} · Proposed {item.slotLabel}</span>
                </span>
                <span className={styles.dayTrack}>
                  <span className={styles.window} style={span(item.window)} />
                  <span className={styles.slotBar} style={span(item.slot)} />
                </span>
              </button>
            ))}
          </div>
          <p className={styles.smallNote}>Hatched: the agreed window. Solid: the proposed visit. Cedar Court stays inside its afternoon-only window.</p>
        </div>
      </div>

      <div className={styles.stopDetail} aria-live="polite">
        <div>
          <p className={styles.detailTitle}><span className={styles.stopNumber}>{stop.order}</span>{stop.name} <Status tone="proposed">Proposed, not booked</Status></p>
          <dl className={styles.briefing}>
            <div><dt>Agreed service</dt><dd>{stop.service}</dd></div>
            <div><dt>Previous visit</dt><dd>{stop.previous}</dd></div>
            <div><dt>Access instructions</dt><dd>{stop.access}</dd></div>
            <div><dt>Expected duration</dt><dd>{stop.duration}</dd></div>
          </dl>
        </div>
        <div>
          <p className={styles.sheetLabel}>Checked before proposing</p>
          <ul className={styles.rows}>
            {CHECKS.map(([check, tone, result]) => <li key={check}><span>{check}</span><Status tone={tone}>{result}</Status></li>)}
          </ul>
        </div>
      </div>
    </Example>
  );
}
