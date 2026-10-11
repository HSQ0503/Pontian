"use client";

import dynamic from "next/dynamic";
import { useEffect, useId, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { ArrowRight, RotateCcw } from "lucide-react";
import styles from "./property-services.module.css";
import { ANCHORS, PIN_ANCHORS, SIDE_FENCE, STOP_ANCHORS, type Area, type AreaState, type SceneInput, type SceneLabel, type StopId } from "./property-services-model";

const PropertyScene = dynamic(() => import("./property-services-scene"), { ssr: false });

type Tone = "scope" | "excluded" | "open" | "neutral" | "done" | "needed" | "ready";
type Point = readonly [number, number];
type Box = readonly [number, number, number, number];

const PROPERTY = "Alder Lane property";
const AREA_NAME: Record<Area, string> = { driveway: "Driveway", patio: "Rear patio", path: "Side path", fence: "Painted fence", gate: "Side gate" };

const svgId = (id: string) => id.replace(/[^a-zA-Z0-9]/g, "");
const place = (box: Box, [x, y]: Point): CSSProperties => ({ left: `${((x - box[0]) / box[2]) * 100}%`, top: `${((y - box[1]) / box[3]) * 100}%` });

function Status({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={styles.status} data-tone={tone}>{children}</span>;
}

type ExampleProps = {
  title: string;
  children: ReactNode;
  situation: ReactNode;
  finding: ReactNode;
  next: ReactNode;
  findingLabel?: string;
  note: ReactNode;
};

function Example({ title, children, situation, finding, next, findingLabel = "Finding for review", note }: ExampleProps) {
  return (
    <figure className={styles.example}>
      <figcaption className={styles.exampleBar}>
        <span className={styles.exampleTag}>Example workflow</span>
        <span className={styles.exampleTitle}>{title}</span>
      </figcaption>
      <div className={styles.exampleBody}>{children}</div>
      <ol className={styles.outcome}>
        <li data-role="situation"><span className={styles.outcomeLabel}>Situation</span>{situation}</li>
        <li data-role="finding"><span className={styles.outcomeLabel}>{findingLabel}</span>{finding}</li>
        <li data-role="next"><span className={styles.outcomeLabel}>Next step for your team</span>{next}</li>
      </ol>
      <p className={styles.boundary}>{note} Fictional property and customers.</p>
    </figure>
  );
}

/* Live 3D with a static fallback, following the Equipment Rental pattern:
   the scene loads near the viewport, renders only while visible, and the
   2D drawing stays for reduced motion and browsers without WebGL. */

function subscribeToMotion(update: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", update);
  return () => media.removeEventListener("change", update);
}
const noSubscription = () => () => {};
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

function PropertyView({ scene, fallback, label }: { scene: SceneInput; fallback: ReactNode; label: string }) {
  const reduced = useSyncExternalStore(subscribeToMotion, () => window.matchMedia("(prefers-reduced-motion: reduce)").matches, () => true);
  const webgl = useSyncExternalStore(noSubscription, hasWebGL, () => false);
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const nearObserver = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setNear(true); }, { rootMargin: "600px 0px" });
    const visibleObserver = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: "80px 0px" });
    nearObserver.observe(element);
    visibleObserver.observe(element);
    return () => { nearObserver.disconnect(); visibleObserver.disconnect(); };
  }, []);
  const live = near && webgl && !reduced;
  return (
    <div ref={ref} className={styles.viewport} role="img" aria-label={label}>
      <div className={styles.fallback} data-hidden={live && ready} aria-hidden="true">{fallback}</div>
      {live && <PropertyScene {...scene} active={visible} onReady={() => setReady(true)} />}
    </div>
  );
}

/* 2D plan: the fallback drawing, on the same layout as the 3D model. */

const PLAN_BOX: Box = [8, 4, 384, 296];
const PLAN_LABELS: Record<Area, { at: Point; anchor?: Point; start?: boolean }> = {
  driveway: { at: [182.5, 238] },
  patio: { at: [245, 66] },
  fence: { at: [90, 24] },
  gate: { at: [156, 106], anchor: [128, 118], start: true },
  path: { at: [156, 182], anchor: [130, 182], start: true },
};
const PLAN_FENCE: Point[][] = [
  [[116, 118], [24, 118], [24, 24], [376, 24], [376, 118], [330, 118]],
  [[144, 118], [150, 118]],
];
const PLAN_POSTS = PLAN_FENCE.flatMap((run) => run.slice(1).flatMap((end, index) => {
  const start = run[index];
  const steps = Math.max(1, Math.round(Math.hypot(end[0] - start[0], end[1] - start[1]) / 23));
  return Array.from({ length: steps + 1 }, (_, step) => [start[0] + ((end[0] - start[0]) * step) / steps, start[1] + ((end[1] - start[1]) * step) / steps] as Point);
}));
const PLAN_SLABS = Array.from({ length: 10 }, (_, index) => 66 + index * 13.4);
const HOUSE_OUTLINE = "150,90 330,90 330,176 215,176 215,200 150,200";

function PropertyPlan({ states, selected, labels }: { states: Partial<Record<Area, AreaState>>; selected: Area[]; labels: Area[] }) {
  const uid = svgId(useId());
  const zone = (area: Area) => ({ className: styles.zone, "data-tone": states[area] ?? "plain", "data-selected": selected.includes(area) || undefined });
  return (
    <div className={styles.planFrame}>
      <svg viewBox={PLAN_BOX.join(" ")} className={styles.plan} aria-hidden="true">
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
          {PLAN_SLABS.map((y) => <rect key={y} x="118.5" y={y} width="23" height="10.6" fill="#f7f7f4" stroke="#d3d4d0" strokeWidth=".6" />)}
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
          {PLAN_FENCE.map((run) => <polyline key={run.join()} points={run.join(" ")} className={styles.fenceHalo} />)}
          {PLAN_FENCE.map((run) => <polyline key={run.join()} points={run.join(" ")} className={styles.fenceRail} />)}
          {PLAN_POSTS.map(([x, y]) => <rect key={`${x}-${y}`} x={x - 1.7} y={y - 1.7} width="3.4" height="3.4" className={styles.fencePost} />)}
        </g>
        <g {...zone("gate")}>
          <path d="M144 118A28 28 0 0 0 116 90" className={styles.gateSwing} />
          <line x1="116" y1="118" x2="144" y2="118" className={styles.gateHalo} />
          <line x1="116" y1="118" x2="144" y2="118" className={styles.gateLeaf} />
          <circle cx="116" cy="118" r="2" className={styles.gateHinge} />
        </g>
        {labels.map((area) => {
          const { anchor, at } = PLAN_LABELS[area];
          return anchor ? (
            <g key={area} className={styles.leader}>
              <line x1={anchor[0]} y1={anchor[1]} x2={at[0]} y2={at[1]} />
              <circle cx={anchor[0]} cy={anchor[1]} r="2.2" />
            </g>
          ) : null;
        })}
      </svg>
      {labels.map((area) => (
        <span key={area} className={styles.planChip} data-tone={states[area] ?? "plain"} data-selected={selected.includes(area) || undefined} data-align={PLAN_LABELS[area].start ? "start" : undefined} style={place(PLAN_BOX, PLAN_LABELS[area].at)}>{AREA_NAME[area]}</span>
      ))}
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


/* 2D map: the fallback for the next-visit scene. */

const MAP_BOX: Box = [0, 0, 320, 190];
const MAP_POINTS: Record<StopId, Point> = { birch: [96, 86], alder: [170, 130], cedar: [280, 50] };
const MAP_NOTES: { text: string; at: Point }[] = [
  { text: "Birch Road", at: [52, 40] },
  { text: "Alder Lane", at: [282, 148] },
  { text: "Cedar Court", at: [290, 76] },
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

function AreaMap({ selected }: { selected: StopId | null }) {
  const uid = svgId(useId());
  const outline = (id: StopId) => ({ className: styles.mapLot, "data-state": selected === id ? "selected" : "plain" });
  return (
    <div className={styles.planFrame}>
      <svg viewBox={MAP_BOX.join(" ")} className={styles.plan} aria-hidden="true">
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
        <polyline points="96,86 96,130 230,130 230,50 280,50" className={styles.route} />
      </svg>
      {MAP_NOTES.map((note) => <span key={note.text} className={styles.planNote} style={place(MAP_BOX, note.at)}>{note.text}</span>)}
      {(Object.keys(MAP_POINTS) as StopId[]).map((id, index) => (
        <span key={id} className={styles.stopMarker} data-state={selected === id ? "selected" : "plain"} style={place(MAP_BOX, MAP_POINTS[id])}>{index + 1}</span>
      ))}
    </div>
  );
}

/* 1. Scope the work */

const NOTE: { text: string; areas: Area[] }[] = [
  { text: "Driveway and rear patio.", areas: ["driveway", "patio"] },
  { text: "Leave the painted fence alone.", areas: ["fence"] },
  { text: "Confirm the side path.", areas: ["path"] },
];
const PHOTO_FOR: Record<Area, { View: (props: { label?: string }) => ReactNode; caption: string }> = {
  driveway: { View: DrivewayView, caption: "Driveway, from the street" },
  patio: { View: PatioView, caption: "Rear patio, fence behind" },
  fence: { View: PatioView, caption: "Rear patio, fence behind" },
  path: { View: SidePathView, caption: "Side path, toward the gate" },
  gate: { View: SidePathView, caption: "Side path, toward the gate" },
};

export function ScopeTheWork() {
  const [sentence, setSentence] = useState(0);
  const [approved, setApproved] = useState(false);
  const areas = NOTE[sentence].areas;
  const photo = PHOTO_FOR[areas[0]];
  const states: Partial<Record<Area, AreaState>> = { driveway: "scope", patio: "scope", fence: "excluded", path: approved ? "plain" : "open" };
  const labels: SceneLabel[] = [
    { id: "driveway", at: ANCHORS.driveway, title: "Driveway", detail: approved ? "Approved" : "Proposed", state: "ok" },
    { id: "patio", at: ANCHORS.patio, title: "Rear patio", detail: approved ? "Approved" : "Proposed", state: "ok" },
    { id: "fence", at: ANCHORS.fence, title: "Painted fence", detail: approved ? "Excluded" : "Leave it alone", state: "blocked", lift: 26 },
    { id: "path", at: ANCHORS.path, title: "Side path", detail: approved ? "Not included" : "Ask the customer" },
  ];
  const pick = (area: Area) => {
    const index = NOTE.findIndex((entry) => entry.areas.includes(area));
    if (index >= 0) setSentence(index);
  };
  return (
    <Example
      title={`${PROPERTY} · Walkthrough, 4 May`}
      situation={<p>One spoken note and three photos.</p>}
      findingLabel="Result for review"
      finding={<p><strong>Driveway and patio proposed.</strong> The fence is out. The side path is still a question.</p>}
      next={<p>Your estimator measures and prices it before the customer sees it.</p>}
      note="Photos don’t give you measurements, hidden damage or the right cleaning method. Someone still has to look."
    >
      <div className={styles.stage}>
        <PropertyView
          label={`3D model of the fictional Alder Lane property. ${approved ? "Customer-approved scope" : "Draft scope"}: driveway and rear patio in, painted fence excluded, side path ${approved ? "not included" : "to confirm"}.`}
          scene={{ view: "wide", states, selected: areas, labels, onPick: pick }}
          fallback={<PropertyPlan states={states} selected={areas} labels={["driveway", "patio", "fence", "path"]} />}
        />
        <div className={styles.side}>
          <p className={styles.sideLabel}>Owner’s note</p>
          <blockquote className={styles.note}>
            {NOTE.map((entry, index) => (
              <button key={entry.text} type="button" aria-pressed={sentence === index} onClick={() => setSentence(index)}>{entry.text}</button>
            ))}
          </blockquote>
          <div className={styles.photo}>
            <photo.View label={`Illustration of the walkthrough photo: ${photo.caption.toLowerCase()}`} />
            <span>Walkthrough photo · {photo.caption}</span>
          </div>
          <div className={styles.toggle} role="group" aria-label="Scope">
            <button type="button" aria-pressed={!approved} onClick={() => setApproved(false)}>Draft</button>
            <button type="button" aria-pressed={approved} onClick={() => setApproved(true)}>Customer approved</button>
          </div>
          <p className={styles.sideNote}>{approved ? "The side path stays out unless the customer approves it separately." : "Priced from the measured area and your rates, never from a photo."}</p>
        </div>
      </div>
    </Example>
  );
}

/* 2. Equip the crew */

type CrewQuestion = { question: string; answer: string; status: [Tone, string]; source: string; focus: Area; view: SceneInput["view"]; chip: SceneLabel };

const QUESTIONS: CrewQuestion[] = [
  {
    question: "Is the side path included?",
    answer: "No. The side path isn’t in the approved estimate. Check with the office before doing extra work.",
    status: ["done", "From the record"],
    source: "Approved estimate, 6 May · side-path request still unapproved",
    focus: "path",
    view: "side",
    chip: { id: "answer", at: ANCHORS.path, title: "Side path", detail: "Not in today’s job", state: "blocked" },
  },
  {
    question: "What did we do last time?",
    answer: "Driveway only, on 12 October last year. Today’s job is the driveway and the rear patio.",
    status: ["done", "From the record"],
    source: "Service record, 12 October last year",
    focus: "driveway",
    view: "front",
    chip: { id: "answer", at: ANCHORS.driveway, title: "Last visit, 12 Oct", detail: "Driveway only" },
  },
  {
    question: "The customer wants the side path done too. Can we?",
    answer: "Needs office confirmation. A request on the day doesn’t change the approved job.",
    status: ["open", "Needs office confirmation"],
    source: "Approved estimate, 6 May · no approved change",
    focus: "path",
    view: "side",
    chip: { id: "answer", at: ANCHORS.path, title: "Side path", detail: "Needs office confirmation" },
  },
];

const BRIEFING: [string, string][] = [
  ["Today’s work", "Driveway and rear patio"],
  ["Important", "Leave the painted fence alone"],
  ["Access", "Side gate"],
];

export function EquipTheCrew() {
  const [index, setIndex] = useState(0);
  const question = QUESTIONS[index];
  const states: Partial<Record<Area, AreaState>> = { driveway: "scope", patio: "scope", fence: "excluded", path: "open" };
  const labels: SceneLabel[] = [
    question.chip,
    { id: "gate", at: ANCHORS.gate, title: "Side gate", detail: "Way in", lift: 22 },
    { id: "fence", at: SIDE_FENCE, title: "Painted fence", detail: "Leave it alone", state: "blocked", lift: 22 },
    ...(question.focus === "driveway" ? [] : [{ id: "patio", at: ANCHORS.patio, title: "Rear patio", detail: "Today", state: "ok" as const }]),
  ];
  return (
    <Example
      title={`${PROPERTY} · Day of service, 14 May`}
      situation={<p>Your crew is on site and has a question.</p>}
      findingLabel="Result for review"
      finding={<p><strong>Every answer shows where it came from.</strong> If the record doesn’t say, it goes to the office.</p>}
      next={<p>The office signs off any extra work.</p>}
      note="Old notes and requests made on the day never change the approved job."
    >
      <div className={styles.stage}>
        <PropertyView
          label={`3D view of the side of the fictional Alder Lane property, showing the side path, side gate and painted fence. ${question.answer}`}
          scene={{ view: question.view, states, selected: [question.focus], labels }}
          fallback={<PropertyPlan states={states} selected={[question.focus]} labels={["driveway", "patio", "fence", "gate", "path"]} />}
        />
        <div className={styles.side}>
          <dl className={styles.briefing}>
            {BRIEFING.map(([term, value]) => <div key={term}><dt>{term}</dt><dd>{value}</dd></div>)}
          </dl>
          <div className={styles.questions} role="group" aria-label="Crew questions">
            {QUESTIONS.map((item, itemIndex) => (
              <button key={item.question} type="button" aria-pressed={index === itemIndex} onClick={() => setIndex(itemIndex)}>{item.question}</button>
            ))}
          </div>
          <div className={styles.answer} aria-live="polite">
            <Status tone={question.status[0]}>{question.status[1]}</Status>
            <p>{question.answer}</p>
            <span className={styles.source}>{question.source}</span>
          </div>
        </div>
      </div>
    </Example>
  );
}

/* 3. Review the result */

const REVIEW: { status: [Tone, string]; action: string }[] = [
  { status: ["needed", "Rear patio: no after photo"], action: "Crew adds the photo" },
  { status: ["ready", "Ready for supervisor review"], action: "Supervisor reviews" },
  { status: ["done", "Reviewed. Summary ready for the customer."], action: "Replay" },
];

export function ReviewTheResult() {
  const [work, setWork] = useState<"driveway" | "patio">("patio");
  const [step, setStep] = useState(0);
  const patioDone = step > 0;
  const View = work === "driveway" ? DrivewayView : PatioView;
  const hasAfter = work === "driveway" || patioDone;
  const states: Partial<Record<Area, AreaState>> = { driveway: "scope", patio: "scope" };
  const labels: SceneLabel[] = [
    { id: "driveway", at: PIN_ANCHORS.driveway, title: "Driveway", detail: "Before and after", state: "ok", lift: 24 },
    { id: "patio", at: PIN_ANCHORS.patio, title: "Rear patio", detail: patioDone ? "Before and after" : "No after photo", state: patioDone ? "ok" : "blocked", lift: 24 },
  ];
  return (
    <Example
      title={`${PROPERTY} · After the visit, 14 May`}
      situation={<p>Photos and notes from the 14 May visit.</p>}
      finding={<p><strong>The patio has a before photo and no after photo.</strong></p>}
      next={<p>Ask the crew for the photo.</p>}
      note="A missing photo doesn’t mean missing work, and a photo doesn’t prove the work was done well."
    >
      <div className={styles.stage}>
        <PropertyView
          label={`3D view of the fictional Alder Lane property with the two photo positions. Driveway: before and after photos. Rear patio: ${patioDone ? "before and after photos" : "before photo only"}.`}
          scene={{ view: work === "driveway" ? "front" : "back", states, selected: [work], labels, pins: [{ id: "driveway", state: "ok" }, { id: "patio", state: patioDone ? "ok" : "blocked" }], onPick: (area) => { if (area === "driveway" || area === "patio") setWork(area); } }}
          fallback={<PropertyPlan states={states} selected={[work]} labels={["driveway", "patio"]} />}
        />
        <div className={styles.side}>
          <div className={styles.toggle} role="group" aria-label="Work item">
            <button type="button" aria-pressed={work === "driveway"} onClick={() => setWork("driveway")}>Driveway</button>
            <button type="button" aria-pressed={work === "patio"} onClick={() => setWork("patio")}>Rear patio</button>
          </div>
          <div className={styles.pair} aria-live="polite">
            <figure>
              <View shot="before" label={`Illustration of the ${work === "patio" ? "rear patio" : "driveway"} before cleaning`} />
              <figcaption>Before</figcaption>
            </figure>
            <figure>
              {hasAfter ? <View shot="after" label={`Illustration of the ${work === "patio" ? "rear patio" : "driveway"} after cleaning, from the same spot`} /> : <div className={styles.missing}><span>No after photo</span></div>}
              <figcaption>After</figcaption>
            </figure>
          </div>
          {work === "patio" && patioDone && <p className={styles.crewNote}>Crew note: &ldquo;Patio work completed; photo added for review.&rdquo;</p>}
          <div className={styles.reviewBar}>
            <p aria-live="polite"><Status tone={REVIEW[step].status[0]}>{REVIEW[step].status[1]}</Status></p>
            <button type="button" className={styles.action} onClick={() => { setStep((step + 1) % REVIEW.length); setWork("patio"); }}>
              {step === REVIEW.length - 1 ? <RotateCcw size={15} strokeWidth={1.6} aria-hidden="true" /> : <ArrowRight size={15} strokeWidth={1.6} aria-hidden="true" />}
              {REVIEW[step].action}
            </button>
          </div>
        </div>
      </div>
    </Example>
  );
}

/* 4. Plan the next visit */

type Stop = { id: StopId; order: number; name: string; service: string; previous: string; access: string; duration: string; window: [number, number]; windowLabel: string; slot: [number, number]; slotLabel: string };

const STOPS: Stop[] = [
  { id: "birch", order: 1, name: "Birch Road", service: "House wash, once a year", previous: "11 November last year", access: "Front driveway, tap on the left", duration: "About 2 hours", window: [8, 17], windowLabel: "Any time", slot: [8, 10], slotLabel: "8:00–10:00" },
  { id: "alder", order: 2, name: "Alder Lane", service: "Driveway and rear patio, every 6 months. Fence excluded.", previous: "14 May, reviewed", access: "Side gate", duration: "About 3 hours", window: [8, 17], windowLabel: "Any time", slot: [10.25, 13.25], slotLabel: "10:15–13:15" },
  { id: "cedar", order: 3, name: "Cedar Court", service: "Patio, every 6 months", previous: "12 May", access: "Afternoons only. Park on the street.", duration: "About 1.5 hours", window: [13, 17], windowLabel: "Afternoons only", slot: [13.5, 15], slotLabel: "13:30–15:00" },
];
const HISTORY: [string, string][] = [["14 May", "Driveway and patio done"], ["20 May", "Customer agrees to every 6 months"], ["Week of 9 Nov", "Next visit due"]];
const CHECKS: [string, Tone, string][] = [["Already booked?", "done", "No"], ["Plan paused or cancelled?", "done", "No"], ["Customer confirmation needed?", "needed", "Yes"]];

const DAY_START = 8;
const DAY_HOURS = 9;
const span = ([start, end]: [number, number]): CSSProperties => ({ left: `${((start - DAY_START) / DAY_HOURS) * 100}%`, width: `${((end - start) / DAY_HOURS) * 100}%` });

export function PlanTheNextVisit() {
  const [selected, setSelected] = useState<StopId | null>(null);
  const stop = STOPS.find((item) => item.id === (selected ?? "alder")) ?? STOPS[1];
  const choose = (id: StopId) => setSelected(selected === id ? null : id);
  const states: Partial<Record<Area, AreaState>> = { driveway: "scope", patio: "scope", fence: "excluded" };
  const labels: SceneLabel[] = STOPS.map((item) => ({ id: item.id, at: STOP_ANCHORS[item.id], title: `${item.order} · ${item.name}`, detail: item.id === "cedar" ? `${item.slotLabel}, afternoons only` : item.slotLabel, state: "ok" }));
  return (
    <Example
      title="Alder Lane and two nearby jobs · Week of 9 November"
      situation={<p>Alder Lane is due the week of 9 November.</p>}
      findingLabel="Result for review"
      finding={<p><strong>A draft day for one crew:</strong> three stops, with Cedar Court last.</p>}
      next={<p>The office approves it, then confirms with each customer.</p>}
      note="Nothing here books a visit or messages a customer. Grouping jobs this way is something we’d test with you."
    >
      <div className={styles.stage}>
        <PropertyView
          label="3D view of the fictional Alder Lane property and two nearby properties on side roads, with a draft route: Birch Road first, then Alder Lane, then Cedar Court."
          scene={{ view: selected ?? "street", states, selected: [], labels, neighbourhood: true, stop: selected, onPickStop: choose }}
          fallback={<AreaMap selected={selected} />}
        />
        <div className={styles.side}>
          <ol className={styles.history}>
            {HISTORY.map(([date, text]) => <li key={date}><span>{date}</span>{text}</li>)}
          </ol>
          <p className={styles.sideLabel}>Can these fit in one crew’s day?</p>
          <div className={styles.day} role="group" aria-label="Draft day">
            {STOPS.map((item) => (
              <button key={item.id} type="button" className={styles.dayRow} aria-pressed={selected === item.id} onClick={() => choose(item.id)}>
                <span className={styles.dayName}><span className={styles.stopNumber}>{item.order}</span>{item.name}<em>{item.slotLabel}</em></span>
                <span className={styles.dayTrack}>
                  <span className={styles.window} style={span(item.window)} />
                  <span className={styles.slotBar} style={span(item.slot)} />
                </span>
              </button>
            ))}
            <span className={styles.dayAxis} aria-hidden="true"><span>8:00</span><span>12:00</span><span>17:00</span></span>
          </div>
          <dl className={styles.briefing} aria-live="polite">
            <div><dt>Agreed service</dt><dd>{stop.service}</dd></div>
            <div><dt>Previous visit</dt><dd>{stop.previous}</dd></div>
            <div><dt>Access instructions</dt><dd>{stop.access}</dd></div>
            <div><dt>Expected duration</dt><dd>{stop.duration}</dd></div>
          </dl>
          <ul className={styles.checks}>
            {CHECKS.map(([check, tone, result]) => <li key={check}><span>{check}</span><Status tone={tone}>{result}</Status></li>)}
          </ul>
        </div>
      </div>
    </Example>
  );
}
