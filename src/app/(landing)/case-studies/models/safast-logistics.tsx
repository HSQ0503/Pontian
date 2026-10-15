"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { Pause, Play } from "lucide-react";
import { Caption, frame, InteractionCue, Legend, ModelFigure, ModelViewport, PlanChip, Segmented, useNarrow, useReducedMotion, type RowState } from "./model-frame";
import {
  BAY_LINES, BAY_Z, BENCHES, CAPTIONS, CHIPS, DEPOT_CHIP, everythingDetail, FOCUS, MINE_CHIP, GATE, HAUL, ITEMS, OFFICE, PAD, PLACES, ROAD, roadAt, roadEdges, ROWS, SCENE_SUMMARY, SHED, STACK,
  STOCKPILE, STRIP, TRUCK_MID_ROUTE, VIEWS, type ItemId, type Kind, type RoadPose, type ViewId, type XZ,
} from "./safast-logistics-data";
import styles from "./safast-logistics.module.css";

const Scene = dynamic(() => import("./safast-logistics-scene"), { ssr: false });

/* Plan drawing: ink linework on the grid, white fills, brand colours for state only. */

const INK = "#17191a";
const SELECT = "#fed603";
const OK = "#007dfe";
const BLOCKED = "#f51625";
const W = 1000;
const H = 420;
const S = 22;
const X = (x: number) => W / 2 + x * S;
const Y = (z: number) => H / 2 + z * S;
const rect = (x: XZ, z: XZ) => ({ x: X(x[0]), y: Y(z[0]), width: (x[1] - x[0]) * S, height: (z[1] - z[0]) * S });
const local = (x: XZ, z: XZ) => ({ x: x[0] * S, y: z[0] * S, width: (x[1] - x[0]) * S, height: (z[1] - z[0]) * S });
const pathOf = (points: XZ[]) => points.map(([x, z], index) => `${index ? "L" : "M"}${X(x).toFixed(1)} ${Y(z).toFixed(1)}`).join("");

const MID: RoadPose = roadAt(TRUCK_MID_ROUTE, { x: 0, z: 0, dx: 1, dz: 0 });
const MID_HEADING = Math.atan2(-MID.dz, MID.dx);
const EDGES = roadEdges();
const ROAD_OUTLINE = `${pathOf(EDGES.map((edge) => edge.left))}${pathOf([...EDGES].reverse().map((edge) => edge.right)).replace("M", "L")}Z`;
const ROAD_CENTRE = pathOf(ROAD);

type Look = "plain" | "focus" | "selected" | "ghost";
type Paint = { fill: string; stroke: string; strokeWidth: number; strokeOpacity?: number; strokeDasharray?: string };

function useLook(bold: boolean) {
  const scale = bold ? 2.1 : 1;
  return (look: Look): Paint => {
    if (look === "ghost") return { fill: "none", stroke: INK, strokeOpacity: 0.32, strokeWidth: scale, strokeDasharray: bold ? undefined : "4 3" };
    if (look === "selected") return { fill: SELECT, stroke: INK, strokeWidth: 1.6 * scale };
    if (look === "focus") return { fill: "#fff", stroke: INK, strokeWidth: 1.7 * scale };
    return { fill: "#fff", stroke: INK, strokeWidth: 1.1 * scale };
  };
}

const deg = (heading: number) => (-heading * 180) / Math.PI;

type LookOf = (id: ItemId, kind: Kind) => Look;

function lookFor(view: ViewId, selected: ItemId | null): LookOf {
  const focus = FOCUS[view];
  return (id, kind) => {
    if (id === selected) return "selected";
    if (focus === "equipment" && kind !== "equipment") return "ghost";
    if ((focus === "truck" || focus === "shipment") && kind === "equipment") return "ghost";
    return focus === kind ? "focus" : "plain";
  };
}

function PlanTruck({ x, z, heading, cargo, body, load, style }: { x: number; z: number; heading: number; cargo: "container" | "crates"; body: Look; load: Look; style: ReturnType<typeof useLook> }) {
  const cargoStyle = style(load);
  return (
    <g transform={`translate(${X(x).toFixed(1)} ${Y(z).toFixed(1)}) rotate(${deg(heading).toFixed(1)})`}>
      <rect {...local([-2.42, 0.92], [-0.63, 0.63])} {...style(body)} />
      <rect {...local([1.0, 2.22], [-0.62, 0.62])} {...style(body)} rx={3} />
      <line x1={2.0 * S} x2={2.0 * S} y1={-0.5 * S} y2={0.5 * S} stroke={INK} strokeOpacity={body === "ghost" ? 0.3 : 0.7} />
      {cargo === "container" ? (
        <>
          <rect {...local([-2.32, 0.76], [-0.61, 0.61])} {...cargoStyle} />
          {load !== "ghost" && <path d={`M${-2.32 * S} ${-0.61 * S}L${0.76 * S} ${0.61 * S}M${-2.32 * S} ${0.61 * S}L${0.76 * S} ${-0.61 * S}`} stroke={INK} strokeOpacity={0.35} strokeWidth={0.8} />}
        </>
      ) : (
        <>
          <rect {...local([-2.32, -1.32], [-0.56, 0.56])} {...cargoStyle} />
          <rect {...local([-1.18, -0.18], [-0.56, 0.56])} {...cargoStyle} />
        </>
      )}
    </g>
  );
}

function PlanEquipment({ id, look, style }: { id: "ex" | "wl" | "gs"; look: Look; style: ReturnType<typeof useLook> }) {
  const spot = PLACES[id];
  const s = style(look);
  const detail = { ...s, fill: look === "ghost" ? "none" : "#fff" };
  return (
    <g transform={`translate(${X(spot.x).toFixed(1)} ${Y(spot.z).toFixed(1)}) rotate(${deg(spot.heading).toFixed(1)})`}>
      {id === "ex" && (
        <>
          <rect {...local([-1.2, 1.2], [0.42, 0.88])} {...detail} rx={4} />
          <rect {...local([-1.2, 1.2], [-0.88, -0.42])} {...detail} rx={4} />
          <rect {...local([-1.42, 0.82], [-0.78, 0.78])} {...s} rx={3} />
          <rect {...local([-0.02, 0.82], [0.12, 0.76])} {...detail} />
          <rect {...local([0.45, 2.75], [-0.34, -0.02])} {...s} />
          <rect {...local([2.72, 3.3], [-0.58, 0.22])} {...detail} />
        </>
      )}
      {id === "wl" && (
        <>
          {[0.95, -0.95].flatMap((wx) => [0.66, -0.66].map((wz) => <rect key={`${wx}${wz}`} {...local([wx - 0.44, wx + 0.44], [wz - 0.17, wz + 0.17])} {...detail} />))}
          <rect {...local([-1.75, -0.25], [-0.52, 0.52])} {...s} rx={3} />
          <rect {...local([0.1, 1.35], [-0.38, 0.38])} {...s} />
          <rect {...local([-0.55, 0.2], [-0.48, 0.48])} {...detail} />
          <rect {...local([1.78, 2.52], [-0.84, 0.84])} {...s} />
        </>
      )}
      {id === "gs" && (
        <>
          <rect {...local([-1.12, 1.12], [-0.56, 0.56])} {...s} />
          <rect {...local([-0.9, 0.2], [-0.36, 0.36])} {...detail} />
          <circle cx={0.62 * S} cy={-0.18 * S} r={0.14 * S} {...detail} />
        </>
      )}
    </g>
  );
}

function Plan({ view, selected, bold = false }: { view: ViewId; selected: ItemId | null; bold?: boolean }) {
  const style = useLook(bold);
  const look = lookFor(view, selected);
  const line = { fill: "none", stroke: INK, strokeWidth: bold ? 2.2 : 1.1 };
  const thin = { fill: "none", stroke: INK, strokeWidth: bold ? 1.4 : 0.8, strokeOpacity: 0.4 };
  const route = view === "shipments" || view === "everything";
  const tickGap = bold ? 1.1 : 0.7;
  const zMid = (SHED.z[0] + SHED.z[1]) / 2;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <rect {...rect(STRIP.x, STRIP.z)} {...line} fill="#fff" />
      <g {...thin}>
        <ellipse cx={X(-2.4)} cy={Y(-5.4)} rx={2.6 * S} ry={1.5 * S} />
        <ellipse cx={X(-2.4)} cy={Y(-5.4)} rx={1.3 * S} ry={0.7 * S} />
        <ellipse cx={X(2.6)} cy={Y(6.1)} rx={2 * S} ry={0.9 * S} />
        {!bold && <ellipse cx={X(-1.2)} cy={Y(2)} rx={4 * S} ry={4.6 * S} strokeDasharray="5 5" />}
        {!bold && <ellipse cx={X(5.6)} cy={Y(-6.4)} rx={1.4 * S} ry={1.1 * S} />}
      </g>

      {/* Depot yard */}
      <rect {...rect(PAD.x, PAD.z)} {...line} fill="#fff" />
      <rect {...rect(SHED.x, SHED.z)} {...line} fill="#fff" />
      <line x1={X(SHED.x[0])} x2={X(SHED.x[1])} y1={Y(zMid)} y2={Y(zMid)} {...thin} strokeDasharray="6 4" />
      {[[-19.3, -17.1], [-16.2, -14]].map(([x0, x1]) => <line key={x0} x1={X(x0)} x2={X(x1)} y1={Y(SHED.z[1])} y2={Y(SHED.z[1])} stroke={INK} strokeWidth={bold ? 5 : 3.5} />)}
      {STACK.filter((box) => box.level === 0).map((box) => <rect key={box.z[0]} {...rect(box.x, box.z)} {...line} fill="#fff" />)}
      <rect {...rect(OFFICE.x, OFFICE.z)} {...line} fill="#fff" />
      {!bold && (
        <g {...thin} strokeOpacity={0.7}>
          {BAY_LINES.map((x) => <line key={x} x1={X(x)} x2={X(x)} y1={Y(BAY_Z[0])} y2={Y(BAY_Z[1])} />)}
          <line x1={X(BAY_LINES[0])} x2={X(BAY_LINES[BAY_LINES.length - 1])} y1={Y(BAY_Z[0])} y2={Y(BAY_Z[0])} />
          <path d={`${pathOf([[PAD.x[0], PAD.z[0]], [GATE.x, PAD.z[0]], [GATE.x, GATE.z[0]]])}${pathOf([[GATE.x, GATE.z[1]], [GATE.x, PAD.z[1]]])}`} strokeDasharray="2 4" strokeWidth={1.6} />
        </g>
      )}
      {GATE.z.map((z, index) => (
        <g key={z}>
          <line x1={X(GATE.x)} x2={X(GATE.x - 1.5)} y1={Y(z)} y2={Y(z + (index ? -0.12 : 0.12))} {...line} />
          <circle cx={X(GATE.x)} cy={Y(z)} r={bold ? 4 : 3} fill={INK} />
        </g>
      ))}

      {/* Road and shipment route */}
      <path d={ROAD_OUTLINE} {...line} fill="#fff" />
      {!route && <path d={ROAD_CENTRE} {...thin} strokeDasharray="8 6" />}
      {route && (
        <g fill="none" stroke={OK} strokeWidth={bold ? 5 : 3.5} strokeLinecap="round">
          <path d={ROAD_CENTRE} />
          <circle cx={X(ROAD[0][0])} cy={Y(ROAD[0][1])} r={bold ? 8 : 6} fill="#fff" />
          <circle cx={X(ROAD[ROAD.length - 1][0])} cy={Y(ROAD[ROAD.length - 1][1])} r={bold ? 8 : 6} fill="#fff" />
        </g>
      )}

      {/* Mine site: haul area, benches with slope ticks, stockpile */}
      <rect {...rect(HAUL.x, HAUL.z)} {...line} fill="#fff" />
      {BENCHES.map((bench, index) => (
        <g key={index}>
          <path d={pathOf([[bench.x[1], bench.z[1]], [bench.x[0], bench.z[1]], [bench.x[0], STRIP.z[0]]])} {...line} />
          {Array.from({ length: Math.floor((bench.x[1] - bench.x[0]) / tickGap) }, (_, tick) => {
            const tx = bench.x[0] + tickGap / 2 + tick * tickGap;
            return <line key={tick} x1={X(tx)} x2={X(tx)} y1={Y(bench.z[1])} y2={Y(bench.z[1] - (tick % 2 ? 0.3 : 0.6) * (bold ? 1.4 : 1))} {...thin} strokeOpacity={0.55} />;
          })}
        </g>
      ))}
      <circle cx={X(STOCKPILE.x)} cy={Y(STOCKPILE.z)} r={STOCKPILE.radius * S} {...line} fill="#fff" />
      {!bold && <circle cx={X(STOCKPILE.x)} cy={Y(STOCKPILE.z)} r={STOCKPILE.radius * S * 0.45} {...thin} />}

      {/* Trucks, loads and rental equipment */}
      <PlanTruck {...PLACES.t1} cargo="container" body={look("t1", "truck")} load={look("s1045", "shipment")} style={style} />
      <PlanTruck x={MID.x} z={MID.z} heading={MID_HEADING} cargo="container" body={look("t2", "truck")} load={look("s1042", "shipment")} style={style} />
      <PlanTruck {...PLACES.t3} cargo="crates" body={look("t3", "truck")} load={look("s1039", "shipment")} style={style} />
      <rect {...rect([PLACES.crate.x - 0.5, PLACES.crate.x + 0.5], [PLACES.crate.z - 0.56, PLACES.crate.z + 0.56])} {...style(look("s1039", "shipment"))} />
      <PlanEquipment id="ex" look={look("ex", "equipment")} style={style} />
      <PlanEquipment id="wl" look={look("wl", "equipment")} style={style} />
      <PlanEquipment id="gs" look={look("gs", "equipment")} style={style} />
      {bold && <rect x={X(PLACES.gs.x + 1.5)} y={Y(PLACES.gs.z - 1.6)} width={14} height={14} fill={BLOCKED} />}
    </svg>
  );
}

/* Drawing chips mirror the labels in the 3D view. */

type DrawingChip = { id: string; at: XZ; title: string; detail: string; state?: RowState };

const CHIP_AT: Record<ItemId, XZ> = {
  t1: [PLACES.t1.x, -1.2],
  t2: [MID.x + MID.dx * 1.4, MID.z - 0.9],
  t3: [PLACES.t3.x - 1.4, PLACES.t3.z - 0.8],
  s1045: [PLACES.t1.x, -1.2],
  s1042: [MID.x - MID.dx * 0.8, MID.z - 0.8],
  s1039: [PLACES.t3.x + 1.8, PLACES.t3.z - 0.8],
  ex: [PLACES.ex.x + 0.2, PLACES.ex.z - 1.8],
  wl: [PLACES.wl.x - 0.6, PLACES.wl.z - 1],
  gs: [PLACES.gs.x, PLACES.gs.z - 0.7],
};

function chipFor(id: ItemId, selected: ItemId | null): DrawingChip {
  const { title, detail, state } = CHIPS[id];
  return { id, at: CHIP_AT[id], title, detail, state: id === selected ? "select" : state };
}

function drawingChips(view: ViewId, selected: ItemId | null): DrawingChip[] {
  if (view !== "everything") return ROWS[view].map((id) => chipFor(id, selected));
  const chips: DrawingChip[] = [
    { id: "depot", at: [-14.5, STRIP.z[0] - 0.4], ...DEPOT_CHIP },
    chipFor("t2", selected),
    { id: "mine", at: [13.7, STRIP.z[0] - 0.4], ...MINE_CHIP },
  ];
  if (selected && selected !== "t2") chips.push(chipFor(selected, selected));
  return chips;
}

function Drawing({ view, selected }: { view: ViewId; selected: ItemId | null }) {
  const narrow = useNarrow();
  return (
    <div className={styles.plan}>
      <Plan view={view} selected={selected} />
      {drawingChips(view, selected).map((chip) => (
        <PlanChip key={chip.id} x={Math.min(narrow ? 76 : 92, Math.max(narrow ? 24 : 8, (X(chip.at[0]) / W) * 100))} y={(Y(chip.at[1]) / H) * 100} title={chip.title} detail={narrow ? undefined : chip.detail} state={chip.state} />
      ))}
    </div>
  );
}

/* Side list: each row selects and frames its item. */

const HEADINGS: Record<ViewId, string> = { fleet: "Fleet (example)", shipments: "Shipments (example)", rentals: "Equipment on rent (example)", everything: "Fleet and rentals (example)" };

function ItemList({ view, selected, onSelect }: { view: ViewId; selected: ItemId | null; onSelect: (id: ItemId) => void }) {
  return (
    <div className={frame.panel}>
      <p className={frame.panelHead}>{HEADINGS[view]}</p>
      {ROWS[view].map((id) => {
        const item = ITEMS[id];
        return (
          <button key={id} type="button" className={`${frame.panelRow} ${styles.row}`} data-state={item.state} aria-pressed={selected === id} onClick={() => onSelect(id)}>
            <strong>{item.name}</strong>
            <span>{view === "everything" ? everythingDetail(id) : `${item.status} · ${item.detail}`}</span>
          </button>
        );
      })}
    </div>
  );
}

const CLICK_STEP: Record<ViewId, string> = { fleet: "Click a truck", shipments: "Click a load", rentals: "Click a machine", everything: "Click a truck or machine" };
const VIEW_LABEL = Object.fromEntries(VIEWS.map((option) => [option.value, option.label])) as Record<ViewId, string>;

export default function SafastModel() {
  const [view, setView] = useState<ViewId>("everything");
  const [selected, setSelected] = useState<ItemId | null>(null);
  const [live, setLive] = useState(false);
  const [moving, setMoving] = useState(true);
  const reduced = useReducedMotion();
  const canPause = live && !reduced;

  const changeView = useCallback((next: ViewId) => { setView(next); setSelected(null); }, []);
  const toggle = useCallback((id: ItemId) => setSelected((current) => (current === id ? null : id)), []);

  const picked = selected ? ITEMS[selected] : null;
  const rows = ROWS[view].map((id) => `${ITEMS[id].name}, ${ITEMS[id].status.toLowerCase()}`).join("; ");
  const label = `Example 3D illustration of a trucking and equipment rental operation in East Africa. ${SCENE_SUMMARY} ${VIEW_LABEL[view]} view: ${rows}.${picked ? ` Selected: ${picked.name}.` : ""}`;
  const steps = [
    "Choose Fleet, Shipments, Rentals or Everything",
    ...(canPause ? ["Pause the moving truck"] : []),
    ...(live ? ["Drag to look around", CLICK_STEP[view]] : []),
    "Pick a row in the list to find it",
  ];

  return (
    <ModelFigure title="Fleet, shipments and rentals in one place">
      <div className={frame.controls}>
        <Segmented label="What to show" value={view} options={VIEWS} onChange={changeView} />
        {canPause && (
          <div className={styles.controlsEnd}>
            <button type="button" className={frame.textButton} onClick={() => setMoving((value) => !value)}>
              {moving ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
              {moving ? "Pause the truck" : "Resume the truck"}
            </button>
          </div>
        )}
      </div>
      <InteractionCue line="You can use this." steps={steps} />
      <div className={frame.split}>
        <div className={styles.layout}>
          <ModelViewport
            label={label}
            fallback={<Drawing view={view} selected={selected} />}
            scene={(runtime) => <Scene {...runtime} view={view} selected={selected} moving={moving} onPick={toggle} />}
            onModel={setLive}
          />
          <Caption>
            <strong>{VIEW_LABEL[view]}.</strong> {CAPTIONS[view]}
            {picked && <> Selected: <strong>{picked.name}</strong>, {picked.status.toLowerCase()}. {picked.detail}.</>}
          </Caption>
        </div>
        <ItemList view={view} selected={selected} onSelect={toggle} />
      </div>
      <Legend items={["select", "ok", "blocked"]} labels={{ ok: "On track or on rent", blocked: "Needs attention" }} />
    </ModelFigure>
  );
}

export function SafastPreview() {
  return <Plan view="everything" selected={null} bold />;
}
