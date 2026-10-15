"use client";

import dynamic from "next/dynamic";
import { useCallback, useState, type ReactNode } from "react";
import { Caption, frame, InteractionCue, Legend, ModelFigure, ModelViewport, Segmented, useNarrow } from "./model-frame";
import {
  CARD_COUNT, CARD_Z, center, CRANE, DESTINATION, EMERGING, EXCLUDED, MODES, OLDER, OTHER_PLOTS, PADS, PARCELS, parcelById, PIN, PLAZA, PLINTH,
  ROAD_LINES, ROUTES, SIGN, SLAB, TRAY, TREES, type Mode, type OldBuilding, type Parcel, type ParcelId, type Rect,
} from "./skorman-data";
import styles from "./skorman.module.css";

const Scene = dynamic(() => import("./skorman-scene"), { ssr: false });

const INK = "#17191a";
const SELECT = "#fed603";
const OK = "#007dfe";
const BLOCKED = "#f51625";

/* Plan drawing: 18 px per plan unit, shared by the fallback and the index preview. */

const S = 18;
const X0 = -16.2;
const Z0 = -11.2;
const W = 680;
const H = 400;
const px = (x: number) => (x - X0) * S;
const pz = (z: number) => (z - Z0) * S;
const rect = (r: Rect) => ({ x: px(r.x[0]), y: pz(r.z[0]), width: (r.x[1] - r.x[0]) * S, height: (r.z[1] - r.z[0]) * S });
// On phones the plan turns a quarter so west is at the top and north on the right, as in the 3D phone views.
const at = (x: number, z: number, portrait = false) => (portrait ? { x: ((H - pz(z)) / H) * 100, y: (px(x) / W) * 100 } : { x: (px(x) / W) * 100, y: (pz(z) / H) * 100 });
const TURN = `matrix(0 1 -1 0 ${H} 0)`;
const PREVIEW_BOX = `${px(-20.7)} ${pz(-10.9)} ${41.4 * S} ${21.8 * S}`;

function Roof({ building, weight }: { building: OldBuilding; weight: number }) {
  if (building.roof === "flat") return <rect {...rect({ x: [building.x[0] + 0.15, building.x[1] - 0.15], z: [building.z[0] + 0.15, building.z[1] - 0.15] })} strokeWidth={0.5 * weight} />;
  const [cx, cz] = center(building);
  const along = building.x[1] - building.x[0] >= building.z[1] - building.z[0];
  return along
    ? <line x1={px(building.x[0])} y1={pz(cz)} x2={px(building.x[1])} y2={pz(cz)} strokeWidth={0.7 * weight} />
    : <line x1={px(cx)} y1={pz(building.z[0])} x2={px(cx)} y2={pz(building.z[1])} strokeWidth={0.7 * weight} />;
}

function Older({ building, fill = "#fff", weight }: { building: OldBuilding; fill?: string; weight: number }) {
  return (
    <g>
      <rect {...rect(building)} fill={fill} strokeWidth={1 * weight} />
      <Roof building={building} weight={weight} />
    </g>
  );
}

function linkPath(parcel: Parcel) {
  const [sx, sz] = parcel.stake;
  const ex = TRAY.x[0];
  const ez = CARD_Z(parcel.card);
  const lift = 2.6 + Math.hypot(ex - sx, ez - sz) * 0.08;
  return `M ${px(sx)} ${pz(sz)} C ${px(sx)} ${pz(sz - lift)}, ${px(ex - 1.6)} ${pz(ez - lift)}, ${px(ex)} ${pz(ez)}`;
}

function Plan({ mode, selected, preview = false, portrait = false, leaders }: { mode: Mode; selected: ParcelId; preview?: boolean; portrait?: boolean; leaders?: ReactNode }) {
  const weight = preview ? 1.9 : 1;
  const focus = mode === "visibility";
  const researched = mode !== "visibility";
  const records = mode === "records" && !preview;
  return (
    <svg viewBox={preview ? PREVIEW_BOX : portrait ? `0 0 ${H} ${W}` : `0 0 ${W} ${H}`} fill="none" stroke={INK} strokeLinejoin="round" aria-hidden="true">
      <g transform={portrait ? TURN : undefined}>
        <rect {...rect(SLAB)} rx={3} fill="#fbfbfa" strokeWidth={1.4 * weight} />
        {!preview && <rect {...rect(PLINTH)} rx={3} fill="#fbfbfa" strokeWidth={1.4 * weight} />}
        {ROAD_LINES.x.map((x) => <line key={`x${x}`} x1={px(x)} y1={pz(SLAB.z[0])} x2={px(x)} y2={pz(SLAB.z[1])} strokeWidth={0.6 * weight} strokeDasharray="6 6" opacity={0.35} />)}
        {ROAD_LINES.z.map((z) => <line key={`z${z}`} x1={px(SLAB.x[0])} y1={pz(z)} x2={px(SLAB.x[1])} y2={pz(z)} strokeWidth={0.6 * weight} strokeDasharray="6 6" opacity={0.35} />)}
        {PADS.map((pad, index) => <rect key={index} {...rect(pad)} rx={2} fill="#fff" strokeWidth={0.8 * weight} />)}

        {/* Plots: neutral, candidate, selected candidate and excluded. */}
        {OTHER_PLOTS.map((plot, index) => <rect key={index} {...rect(plot)} strokeWidth={0.9 * weight} strokeDasharray="4 3" />)}
        {PARCELS.map((parcel) => {
          const chosen = researched && parcel.id === selected;
          return (
            <g key={parcel.id}>
              <rect {...rect(parcel.plot)} fill={researched ? SELECT : "none"} fillOpacity={chosen ? 0.75 : 0.3} strokeWidth={(chosen ? 1.6 : 0.9) * weight} strokeDasharray={chosen ? undefined : "4 3"} />
              {parcel.building && <Older building={parcel.building} fill={chosen ? SELECT : "#fff"} weight={weight} />}
            </g>
          );
        })}
        <rect {...rect(EXCLUDED)} fill={researched ? BLOCKED : "none"} fillOpacity={0.14} stroke={researched ? BLOCKED : INK} strokeWidth={(researched ? 1.3 : 0.9) * weight} strokeDasharray="4 3" />

        {/* Destination district around the plaza. */}
        <rect {...rect(PLAZA)} strokeWidth={0.6 * weight} strokeDasharray="2 3" />
        {DESTINATION.map((building, index) => (
          <g key={index}>
            <rect {...rect(building)} fill={focus ? SELECT : "#fff"} strokeWidth={1.2 * weight} />
            {!preview && <rect {...rect({ x: [building.x[0] + 0.18, building.x[1] - 0.18], z: [building.z[0] + 0.18, building.z[1] - 0.18] })} strokeWidth={0.5} />}
          </g>
        ))}
        {TREES.map(([x, z]) => <circle key={`${x},${z}`} cx={px(x)} cy={pz(z)} r={0.34 * S} fill="#fff" strokeWidth={0.7 * weight} />)}

        {/* Emerging district: frames under construction and a crane. */}
        {EMERGING.map((item, index) => (
          <g key={index}>
            <rect {...rect(item)} strokeWidth={1 * weight} strokeDasharray="5 3" />
            {!preview && Array.from({ length: item.cols * item.rows }, (_, k) => {
              const col = k % item.cols;
              const row = Math.floor(k / item.cols);
              const cx = item.x[0] + 0.18 + ((item.x[1] - item.x[0] - 0.36) * col) / (item.cols - 1);
              const cz = item.z[0] + 0.18 + ((item.z[1] - item.z[0] - 0.36) * row) / (item.rows - 1);
              return <rect key={k} x={px(cx) - 1.5} y={pz(cz) - 1.5} width={3} height={3} fill={INK} stroke="none" />;
            })}
            {item.core && <rect {...rect(item.core)} fill="#fff" strokeWidth={1 * weight} />}
          </g>
        ))}
        <line x1={px(CRANE.mast[0] - CRANE.jib)} y1={pz(CRANE.mast[1])} x2={px(CRANE.mast[0] + CRANE.counter)} y2={pz(CRANE.mast[1])} strokeWidth={1.4 * weight} />
        <rect x={px(CRANE.mast[0]) - 4} y={pz(CRANE.mast[1]) - 4} width={8} height={8} fill="#fff" strokeWidth={1.2 * weight} />

        {OLDER.map((building, index) => <Older key={index} building={building} weight={weight} />)}

        {focus && (
          <g>
            {ROUTES.map((route, index) => (
              <g key={index}>
                <polyline points={route.map(([x, z]) => `${px(x)},${pz(z)}`).join(" ")} stroke={OK} strokeWidth={2.4 * weight} strokeDasharray={`${7 * weight} ${5 * weight}`} strokeLinecap="round" />
                <circle cx={px(route[route.length - 1][0])} cy={pz(route[route.length - 1][1])} r={3 * weight} fill={OK} stroke="none" />
              </g>
            ))}
            <path d={`M ${px(PIN[0])} ${pz(PIN[1])} l -7 -13 a 8 8 0 1 1 14 0 z`} fill={SELECT} strokeWidth={1.2 * weight} transform={`rotate(${portrait ? -90 : 0} ${px(PIN[0])} ${pz(PIN[1])}) translate(${px(PIN[0])} ${pz(PIN[1])}) scale(${preview ? 1.5 : 1}) translate(${-px(PIN[0])} ${-pz(PIN[1])})`} />
            {!preview && <rect x={px(SIGN[0]) - 6} y={pz(SIGN[1]) - 2} width={12} height={4} fill="#fff" strokeWidth={1} />}
          </g>
        )}

        {!preview && (
          <g>
            <rect {...rect(TRAY)} fill="#fff" strokeWidth={1.2} />
            {Array.from({ length: CARD_COUNT }, (_, index) => {
              const owner = PARCELS.find((parcel) => parcel.card === index);
              const chosen = records && owner?.id === selected;
              return <line key={index} x1={px(TRAY.x[0] + 0.18)} y1={pz(CARD_Z(index))} x2={px(TRAY.x[1] - 0.18)} y2={pz(CARD_Z(index))} strokeWidth={chosen ? 3 : owner ? 1.2 : 0.6} />;
            })}
          </g>
        )}
        {records && PARCELS.map((parcel) => {
          const chosen = parcel.id === selected;
          return (
            <g key={parcel.id}>
              <path d={linkPath(parcel)} strokeWidth={chosen ? 1.6 : 0.9} opacity={chosen ? 1 : 0.45} />
              <rect x={px(parcel.stake[0]) - 4.5} y={pz(parcel.stake[1]) - 4.5} width={9} height={9} fill={chosen ? SELECT : "#fff"} strokeWidth={1.2} />
            </g>
          );
        })}
        {leaders}
      </g>
    </svg>
  );
}

// A plan label: a chip at `chip`, with an ink leader to `at` when the two differ.
type Mark = { id: string; at: [number, number]; chip?: [number, number]; align?: "start" | "center" | "end"; below?: boolean; title: string; detail?: string; state?: "ok" | "select" | "blocked" };

function marksFor(mode: Mode, parcel: Parcel): Mark[] {
  if (mode === "visibility") {
    return [
      { id: "pin", at: [PIN[0], PIN[1] - 0.6], chip: [PIN[0], -3.3], title: "Destination information (example)", detail: "Useful details about the area", state: "select" },
      { id: "inquiries", at: SIGN, chip: [-4.4, 4.4], align: "end", title: "Visitor inquiries", detail: "Example contact point", state: "ok" },
      { id: "emerging", at: [10.4, -0.6], chip: [8.4, -3.3], align: "start", title: "Emerging area (example)", detail: "Structures under construction" },
    ];
  }
  if (mode === "research") {
    const [cx] = center(parcel.plot);
    const [ex] = center(EXCLUDED);
    return [
      { id: parcel.id, at: [cx, parcel.plot.z[0] + 0.5], title: `${parcel.name} (example)`, detail: "Candidate for review", state: "select" },
      { id: "excluded", at: [ex, EXCLUDED.z[0] + 0.5], title: "Excluded: example constraint", detail: "Not a candidate", state: "blocked" },
    ];
  }
  return [
    { id: "owner", at: parcel.stake, chip: [parcel.stake[0], parcel.stake[1] - 0.7], title: "Owner of record, from public records (example)", detail: `Linked to ${parcel.name} (example)`, state: "select" },
    { id: "records", at: [(TRAY.x[0] + TRAY.x[1]) / 2, TRAY.z[0]], chip: [TRAY.x[1], TRAY.z[0] - 0.7], align: "end", title: "Organized records (example)", detail: "Public property and ownership records", state: "ok" },
  ];
}

// Phone layout: up on screen is west. There is room for one chip, which drops below its anchor near the top.
function portraitMarks(mode: Mode, parcel: Parcel): Mark[] {
  if (mode === "visibility") return [{ id: "pin", at: [PIN[0] - 0.7, PIN[1]], chip: [-6, PIN[1]], title: "Destination information (example)", detail: "Useful details about the area", state: "select" }];
  if (mode === "research") {
    const [cx, cz] = center(parcel.plot);
    return [{ id: parcel.id, at: [cx, cz], title: `${parcel.name} (example)`, detail: "Candidate for review", state: "select" }];
  }
  const [sx, sz] = parcel.stake;
  const high = at(sx, sz, true).y < 30;
  return [{ id: "owner", at: parcel.stake, chip: [sx + (high ? 1.4 : -1.4), sz], below: high, title: "Owner of record, from public records (example)", detail: `Linked to ${parcel.name} (example)`, state: "select" }];
}

function Leaders({ marks }: { marks: Mark[] }) {
  return (
    <g>
      {marks.map(({ id, at: [x, z], chip }) => chip && (
        <g key={id}>
          <line x1={px(chip[0])} y1={pz(chip[1])} x2={px(x)} y2={pz(z)} strokeWidth={1} />
          <circle cx={px(x)} cy={pz(z)} r={3} fill={INK} stroke="#fff" strokeWidth={1.5} />
        </g>
      ))}
    </g>
  );
}

// Same look as the kit's PlanChip; chips near an edge grow inward so they stay on the sheet.
function Chip({ mark, portrait }: { mark: Mark; portrait: boolean }) {
  const [x, z] = mark.chip ?? mark.at;
  const spot = at(x, z, portrait);
  const align = mark.align ?? (spot.x < 30 ? "start" : spot.x > 70 ? "end" : "center");
  return (
    <span className={frame.planChip} data-state={mark.state} data-align={align} data-below={mark.below || (portrait && !mark.chip && spot.y < 30) || undefined} style={{ left: `${spot.x}%`, top: `${spot.y}%` }}>
      <strong>{mark.title}</strong>
      {mark.detail && <span>{mark.detail}</span>}
    </span>
  );
}

function Drawing({ mode, selected }: { mode: Mode; selected: ParcelId }) {
  const portrait = useNarrow();
  const parcel = parcelById(selected);
  const marks = portrait ? portraitMarks(mode, parcel) : marksFor(mode, parcel);
  return (
    <div className={styles.plan} data-portrait={portrait || undefined}>
      <Plan mode={mode} selected={selected} portrait={portrait} leaders={<Leaders marks={marks} />} />
      {marks.map((mark) => <Chip key={mark.id} mark={mark} portrait={portrait} />)}
    </div>
  );
}

/* Readouts */

const describe = (parcel: Parcel) => `${parcel.type}, ${parcel.size.toLowerCase()} size class`;

function viewLabel(mode: Mode, parcel: Parcel) {
  if (mode === "visibility") return "3D site plan, example data. A destination district of mixed-use buildings around a plaza is highlighted, with an information pin labelled Destination information (example) and three dashed blue routes leading visitors to it. A visitor inquiries point stands at the plaza. An emerging district with structures under construction sits to the east. Land parcels and older buildings are around the edges.";
  if (mode === "research") return `3D site plan after an example property research sweep. Parcels 1 to 4 (examples) are tinted yellow as candidates for review. ${parcel.name} (example) is selected: ${describe(parcel)}. One plot in the south-west is marked red: excluded, example constraint. Decisions about a site’s suitability and any purchase remain with Skorman and its advisers.`;
  return `3D site plan with owner-of-record markers on the four candidate parcels, each linked by a thin line to an organized tray of public records (example). The owner of record for ${parcel.name} (example) and its record card are highlighted.`;
}

function CaptionText({ mode, parcel }: { mode: Mode; parcel: Parcel }) {
  if (mode === "visibility") return <><strong>Development visibility.</strong> The destination district is in focus. An information pin gives people useful details about the area, and routes lead relevant visitors to it. Their questions arrive as visitor inquiries. The emerging district next door is a new area people can discover the same way.</>;
  if (mode === "research") return <><strong>Property research.</strong> A sweep gathers and organizes information on land and buildings across the site. Some parcels become candidates for review; one plot is excluded for an example constraint. {parcel.name} (example) is selected: {describe(parcel).toLowerCase()}. Decisions about a site’s suitability and any purchase remain with Skorman and its advisers.</>;
  return <><strong>Public records.</strong> Publicly available property and ownership records are collected and organized in one place. Each candidate links to its owner of record, which supports research and helps identify relevant parties for a potential transaction. {parcel.name} (example) is selected. Decisions remain with Skorman and its advisers.</>;
}

const LEGENDS = {
  visibility: { items: ["select", "ok"], labels: { select: "In focus", ok: "Visitor routes and inquiries" } },
  research: { items: ["select", "blocked"], labels: { select: "Candidate for review", blocked: "Excluded" } },
  records: { items: ["select", "ok"], labels: { select: "Selected candidate", ok: "Organized records" } },
} as const;

function ParcelList({ mode, selected, onChoose }: { mode: Mode; selected: ParcelId; onChoose: (id: ParcelId) => void }) {
  const researched = mode !== "visibility";
  return (
    <div className={`${frame.panel} ${styles.side}`}>
      <p className={frame.panelHead}>Example parcels</p>
      <ul className={styles.list} aria-label="Example parcels">
        {PARCELS.map((parcel) => (
          <li key={parcel.id}>
            <button type="button" className={styles.pick} aria-pressed={researched && parcel.id === selected} onClick={() => onChoose(parcel.id)}>
              <strong>{parcel.name} (example)</strong>
              <span>{describe(parcel)}</span>
              <span>{mode === "records" && parcel.id === selected ? "Candidate for review, owner of record linked" : "Candidate for review"}</span>
            </button>
          </li>
        ))}
        <li className={styles.excluded}>
          <strong>Other plot (example)</strong>
          <span>Land</span>
          <span>Excluded: example constraint</span>
        </li>
      </ul>
      <p className={styles.hint}>{researched ? "A candidate is for review, not a decision to buy." : "Choose a parcel to open property research."}</p>
    </div>
  );
}

export default function SkormanModel() {
  const [mode, setMode] = useState<Mode>("visibility");
  const [selected, setSelected] = useState<ParcelId>("p1");
  const [live, setLive] = useState(false);
  const choose = useCallback((id: ParcelId) => {
    setSelected(id);
    setMode((current) => (current === "visibility" ? "research" : current));
  }, []);
  const parcel = parcelById(selected);
  const legend = LEGENDS[mode];
  const steps = ["Choose an area", ...(live ? ["Drag to look around", "Click a parcel"] : []), "Pick a parcel in the list"];
  return (
    <ModelFigure title="From destination to research candidate">
      <div className={frame.controls}>
        <Segmented label="Area of the work" value={mode} options={MODES} onChange={setMode} />
        <Legend items={legend.items} labels={legend.labels} />
      </div>
      <InteractionCue line="You can use this." steps={steps} />
      <div className={frame.split}>
        <div className={styles.side}>
          <ModelViewport
            label={viewLabel(mode, parcel)}
            fallback={<Drawing mode={mode} selected={selected} />}
            scene={(runtime) => <Scene {...runtime} mode={mode} selected={selected} onPick={choose} />}
            onModel={setLive}
          />
          <Caption><CaptionText mode={mode} parcel={parcel} /></Caption>
        </div>
        <ParcelList mode={mode} selected={selected} onChoose={choose} />
      </div>
    </ModelFigure>
  );
}

export function SkormanPreview() {
  return <Plan mode="visibility" selected="p1" preview />;
}
