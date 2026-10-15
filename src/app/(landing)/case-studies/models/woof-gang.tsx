"use client";

import dynamic from "next/dynamic";
import { useState, type CSSProperties, type ReactNode } from "react";
import { Caption, InteractionCue, ModelFigure, ModelViewport, Panel, PlanChip, Segmented, frame, useNarrow, type RowState } from "./model-frame";
import {
  BAR, COLUMN, DASHBOARD, FOLLOW_UP, FOLLOW_UP_STORE, GROOMERS, GROOMER_Z, MIX, MIX_SCALE, MIX_SIZE, PLINTH, RETURNING, REVENUE, REVENUE_SCALE, ROOF_Z, SCOPES, STORE, STORE_IDS, STORE_NAME, STORE_X, VIEWS,
  caption, columnX, description, groomerX, lineControls, returnPoint, scopeName, viewDetail, viewLabel, type Scope, type StoreId, type ViewId,
} from "./woof-gang-data";
import styles from "./woof-gang.module.css";

const Scene = dynamic(() => import("./woof-gang-scene"), { ssr: false });

const INK = "#17191a";
const SELECT = "#fed603";
const OK = "#007dfe";
const GRAPHITE = "#48494a";

/* Oblique technical drawing: x to the right, y up, depth recedes up and to the right. */

const S = 40;
const C = 0.36;
type ViewBox = { x: number; y: number; width: number; height: number };
const VIEW_BOX: ViewBox = { x: -8 * S, y: -5.3 * S, width: 15.8 * S, height: 7.7 * S };
// On phones a focused store gets its own 4:5 crop instead of a thin strip of all three.
const viewBoxFor = (scope: Scope, narrow: boolean): ViewBox => (narrow && scope !== "all" ? { x: (STORE_X[scope] - 3.4) * S, y: VIEW_BOX.y, width: 6.2 * S, height: VIEW_BOX.height } : VIEW_BOX);
type P3 = [number, number, number];
const project = ([x, y, z]: P3): [number, number] => [(x - z * C) * S, -(y - z * C) * S];
const pts = (points: P3[]) => points.map((point) => project(point).map((value) => value.toFixed(1)).join(",")).join(" ");
const toPercent = (point: P3, box: ViewBox) => {
  const [x, y] = project(point);
  return { x: ((x - box.x) / box.width) * 100, y: ((y - box.y) / box.height) * 100 };
};

const ROOF_Y = STORE.height + 0.05;
const PARAPET_TOP = STORE.height + STORE.parapet;

type Faces = { front?: string; top?: string; side?: string; opacity?: number };

function Box({ x, y, z, fill = {}, line = 1 }: { x: [number, number]; y: [number, number]; z: [number, number]; fill?: Faces; line?: number }) {
  const [x0, x1] = x;
  const [y0, y1] = y;
  const [z0, z1] = z;
  const common = { stroke: INK, strokeWidth: line, strokeLinejoin: "round" as const, fillOpacity: fill.opacity };
  return (
    <g>
      <polygon points={pts([[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]])} fill={fill.side ?? "#efeeeb"} {...common} />
      <polygon points={pts([[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]])} fill={fill.top ?? "#fff"} {...common} />
      <polygon points={pts([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]])} fill={fill.front ?? "#fff"} {...common} />
    </g>
  );
}

function Rect({ x, y, z, fill = "#fff", line = 1, opacity }: { x: [number, number]; y: [number, number]; z: number; fill?: string; line?: number; opacity?: number }) {
  return <polygon points={pts([[x[0], y[0], z], [x[1], y[0], z], [x[1], y[1], z], [x[0], y[1], z]])} fill={fill} fillOpacity={opacity} stroke={INK} strokeWidth={line} />;
}

function Storefront({ id, selected, line }: { id: StoreId; selected: boolean; line: number }) {
  const cx = STORE_X[id];
  const h = STORE.half;
  const awningTop = 1.25;
  const awningFront = 0.7;
  const awningLow = 0.99;
  const stripes = Array.from({ length: 8 }, (_, index) => cx - 1.28 + (2.56 / 9) * (index + 1));
  return (
    <g>
      <Box x={[cx - h - 0.2, cx + h + 0.2]} y={[0, 0.05]} z={[STORE.z[0] - 0.14, 0.66]} line={line * 0.7} />
      <Box x={[cx - h, cx + h]} y={[0.05, PARAPET_TOP]} z={STORE.z} line={line} fill={selected ? { front: SELECT, top: SELECT, side: SELECT, opacity: 0.4 } : {}} />
      <polygon points={pts([[cx - h + 0.11, PARAPET_TOP, -0.13], [cx + h - 0.11, PARAPET_TOP, -0.13], [cx + h - 0.11, PARAPET_TOP, STORE.z[0] + 0.11], [cx - h + 0.11, PARAPET_TOP, STORE.z[0] + 0.11]])} fill="#f2f1ee" stroke={INK} strokeWidth={line * 0.5} />
      <Rect x={[cx - 1.18, cx - 0.42]} y={[0.32, 1.08]} z={0} line={line * 0.8} fill="#f4f5f5" />
      <Rect x={[cx + 0.42, cx + 1.18]} y={[0.32, 1.08]} z={0} line={line * 0.8} fill="#f4f5f5" />
      <Rect x={[cx - 0.28, cx + 0.28]} y={[0.05, 1.12]} z={0} line={line * 0.8} fill="#f4f5f5" />
      {[cx - 0.8, cx + 0.8].map((x) => <polyline key={x} points={pts([[x, 0.32, 0], [x, 1.08, 0]])} stroke={INK} strokeWidth={line * 0.5} />)}
      <Rect x={[cx - 1.3, cx + 1.3]} y={[1.3, 1.52]} z={0.04} line={line * 0.8} />
      <polygon points={pts([[cx - 1.28, awningTop, 0], [cx + 1.28, awningTop, 0], [cx + 1.28, awningLow, awningFront], [cx - 1.28, awningLow, awningFront]])} fill="#fff" stroke={INK} strokeWidth={line * 0.8} />
      {stripes.map((x) => <polyline key={x} points={pts([[x, awningTop, 0], [x, awningLow, awningFront], [x, awningLow - 0.13, awningFront]])} fill="none" stroke={INK} strokeWidth={line * 0.4} />)}
      <Rect x={[cx - 1.28, cx + 1.28]} y={[awningLow - 0.13, awningLow]} z={awningFront} line={line * 0.8} />
    </g>
  );
}

function bezier(id: StoreId) {
  const [a, b, c] = lineControls(id).map(project);
  const mid = [0, 1].map((axis) => 0.25 * a[axis] + 0.5 * b[axis] + 0.25 * c[axis]);
  return { d: `M${a[0].toFixed(1)},${a[1].toFixed(1)} Q${b[0].toFixed(1)},${b[1].toFixed(1)} ${c[0].toFixed(1)},${c[1].toFixed(1)}`, mid };
}

function Token({ at, fill, line, r = 0.13 }: { at: P3; fill: string; line: number; r?: number }) {
  const [x, y] = project([at[0], at[1] + r * 2.4, at[2]]);
  const [bx, by] = project(at);
  return (
    <g>
      <ellipse cx={bx} cy={by} rx={r * S * 1.1} ry={r * S * 0.45} fill="#fff" stroke={INK} strokeWidth={line * 0.6} />
      <circle cx={x} cy={y} r={r * S} fill={fill} stroke={INK} strokeWidth={line} />
    </g>
  );
}

function Marks({ id, view, line }: { id: StoreId; view: ViewId; line: number }) {
  const cx = STORE_X[id];
  if (view === "revenue") {
    return (
      <g>
        {REVENUE[id].map((value, index) => {
          const x = cx + columnX(index);
          return <Box key={index} x={[x - COLUMN.width / 2, x + COLUMN.width / 2]} y={[PARAPET_TOP, ROOF_Y + value * REVENUE_SCALE]} z={[ROOF_Z - COLUMN.depth / 2, ROOF_Z + COLUMN.depth / 2]} line={line * 0.8} fill={{ side: "#e4e2dd" }} />;
        })}
      </g>
    );
  }
  if (view === "mix") {
    const { total, grooming } = MIX[id];
    const low = ROOF_Y + total * grooming * MIX_SCALE;
    const x: [number, number] = [cx - MIX_SIZE / 2, cx + MIX_SIZE / 2];
    const z: [number, number] = [ROOF_Z - MIX_SIZE / 2, ROOF_Z + MIX_SIZE / 2];
    return (
      <g>
        <Box x={x} y={[PARAPET_TOP, low]} z={z} line={line * 0.8} fill={{ front: OK, top: OK, side: "#0062c8" }} />
        <Box x={x} y={[low, ROOF_Y + total * MIX_SCALE]} z={z} line={line * 0.8} fill={{ front: GRAPHITE, top: "#5d5e5f", side: "#343536" }} />
      </g>
    );
  }
  if (view === "returns") {
    const count = RETURNING[id];
    const path = Array.from({ length: 24 }, (_, index) => { const [x, z] = returnPoint(index / 23); return [cx + x, 0.02, z] as P3; });
    return (
      <g>
        <polyline points={pts(path)} fill="none" stroke={INK} strokeWidth={line * 0.7} strokeDasharray="4 3" opacity={0.6} />
        {Array.from({ length: count }, (_, index) => {
          const [x, z] = returnPoint((index + 0.6) / count);
          return <Token key={index} at={[cx + x, 0.04, z]} fill="#fff" line={line * 0.8} />;
        })}
        {id === FOLLOW_UP_STORE && FOLLOW_UP.map(([x, z], index) => <Token key={`due-${index}`} at={[cx + x, 0.04, z]} fill={SELECT} line={line} />)}
      </g>
    );
  }
  const values = GROOMERS[id];
  return (
    <g>
      {values.map((value, index) => {
        const x = cx + groomerX(values.length, index);
        return (
          <g key={index}>
            <Box x={[x - BAR.width / 2, x + BAR.width / 2]} y={[0, BAR.height]} z={[BAR.start, BAR.start + value * BAR.scale]} line={line * 0.7} fill={{ side: "#e4e2dd" }} />
            <Token at={[x, 0.04, GROOMER_Z]} fill={GRAPHITE} line={line * 0.8} r={0.16} />
          </g>
        );
      })}
    </g>
  );
}

function Dashboard({ view, scope, line }: { view: ViewId; scope: Scope; line: number }) {
  const zc = (DASHBOARD.z[0] + DASHBOARD.z[1]) / 2;
  const tilt = 0.45;
  const screen = (u: number, v: number): P3 => [u, 0.5 + 0.03 * Math.cos(tilt) - v * Math.sin(tilt), zc + v * Math.cos(tilt) + 0.03 * Math.sin(tilt)];
  const quad = (u: [number, number], v: [number, number]) => pts([screen(u[0], v[0]), screen(u[1], v[0]), screen(u[1], v[1]), screen(u[0], v[1])]);
  return (
    <g>
      <Box x={DASHBOARD.x} y={[0, DASHBOARD.height]} z={DASHBOARD.z} line={line} />
      <polygon points={quad([-1.56, 1.56], [-0.44, 0.44])} fill={INK} stroke={INK} strokeWidth={line} />
      {VIEWS.map((option, index) => {
        const x = [-1.08, -0.36, 0.36, 1.08][index];
        return <polygon key={option.value} points={quad([x - 0.31, x + 0.31], [-0.34, 0.1])} fill={option.value === view ? SELECT : "#e6e4df"} />;
      })}
      {STORE_IDS.map((id) => {
        const x = { a: -0.42, b: 0, c: 0.42 }[id];
        return <polygon key={id} points={quad([x - 0.08, x + 0.08], [0.2, 0.34])} fill={scope === id ? SELECT : OK} />;
      })}
    </g>
  );
}

type Chip = { key: string; at: [number, number, number]; title: string; detail?: string; state?: RowState };

function drawingChips(view: ViewId, scope: Scope): Chip[] {
  const stores = scope === "all" ? STORE_IDS : [scope];
  const chips: Chip[] = stores.map((id) => {
    const top = view === "revenue" ? ROOF_Y + Math.max(...REVENUE[id]) * REVENUE_SCALE : view === "mix" ? ROOF_Y + MIX[id].total * MIX_SCALE : PARAPET_TOP;
    return { key: id, at: [STORE_X[id], top + 0.35, ROOF_Z], title: STORE_NAME[id], detail: view === "revenue" && (scope !== "all" || id === "a") ? "Example data, relative scale" : undefined, state: scope === id ? "select" : undefined };
  });
  if (view === "returns" && (scope === "all" || scope === FOLLOW_UP_STORE)) chips.push({ key: "due", at: [STORE_X[FOLLOW_UP_STORE] + 1.1, 0.9, 1.55], title: "May be due for follow-up", state: "select" });
  return chips;
}

function Drawing({ view, scope, preview = false, box = VIEW_BOX }: { view: ViewId; scope: Scope; preview?: boolean; box?: ViewBox }) {
  const line = preview ? 2.2 : 1.3;
  const order: StoreId[] = ["a", "b", "c"];
  const faded = (id: StoreId) => (scope !== "all" && scope !== id ? 0.28 : 1);
  return (
    <svg viewBox={`${box.x} ${box.y} ${box.width} ${box.height}`} aria-hidden="true">
      <Box x={PLINTH.x} y={[-PLINTH.height, 0]} z={PLINTH.z} line={line} fill={{ side: "#e9e8e4" }} />
      {order.map((id) => (
        <g key={id} opacity={faded(id)}>
          <Storefront id={id} selected={scope === id} line={line} />
          {(view === "revenue" || view === "mix") && <Marks id={id} view={view} line={line} />}
        </g>
      ))}
      {(view === "returns" || view === "groomers") && order.map((id) => <g key={id} opacity={faded(id)}><Marks id={id} view={view} line={line} /></g>)}
      {order.map((id) => {
        const { d, mid } = bezier(id);
        return (
          <g key={id} opacity={faded(id)}>
            <path d={d} fill="none" stroke={INK} strokeWidth={line * 1.4} strokeLinecap="round" />
            <circle cx={mid[0]} cy={mid[1]} r={preview ? 5 : 3.6} fill={OK} />
          </g>
        );
      })}
      <Dashboard view={view} scope={scope} line={line} />
    </svg>
  );
}

function DrawingView({ view, scope }: { view: ViewId; scope: Scope }) {
  const narrow = useNarrow();
  const box = viewBoxFor(scope, narrow);
  const chips = drawingChips(view, scope).filter((chip) => !narrow || chip.state === "select");
  return (
    <div className={styles.drawing} style={{ "--ratio": box.width / box.height } as CSSProperties}>
      <Drawing view={view} scope={scope} box={box} />
      {chips.map((chip) => {
        const { x, y } = toPercent(chip.at, box);
        return <PlanChip key={chip.key} x={x} y={y} title={chip.title} detail={narrow ? undefined : chip.detail} state={chip.state} />;
      })}
    </div>
  );
}

/* Readouts */

const LEGEND: Record<ViewId, { swatch: string; edge?: boolean; label: string }[]> = {
  revenue: [{ swatch: "#8e897f", label: "Monthly revenue, example data, relative scale" }, { swatch: OK, label: "Connected to point of sale" }],
  mix: [{ swatch: OK, label: "Grooming services" }, { swatch: GRAPHITE, label: "Retail sales" }],
  returns: [{ swatch: "#fff", edge: true, label: "Returning customers" }, { swatch: SELECT, edge: true, label: "May be due for follow-up" }],
  groomers: [{ swatch: "#5a5b5d", label: "Example groomer" }, { swatch: "#8e897f", label: "Recorded service activity" }],
};

function ViewLegend({ view, scope }: { view: ViewId; scope: Scope }) {
  const items = [...LEGEND[view], ...(scope === "all" ? [] : [{ swatch: SELECT, edge: true, label: "Store in focus" }])];
  return (
    <ul className={frame.legend} aria-label="Colour key">
      {items.map((item) => <li key={item.label} style={{ "--swatch": item.swatch, "--edge": item.edge ? `inset 0 0 0 1px ${INK}` : "none" } as CSSProperties}>{item.label}</li>)}
    </ul>
  );
}

function panelRows(view: ViewId, scope: Scope): { key: string; title: ReactNode; detail?: ReactNode; state?: RowState }[] {
  return [
    { key: "view", title: `${scopeName(scope)} · ${viewLabel(view)}`, detail: viewDetail(view, scope), state: "select" },
    { key: "source", title: "Point-of-sale connection", detail: "Sales and customer records come in from each store’s point-of-sale system.", state: "ok" },
    { key: "checks", title: "Deposits and gift cards", detail: "Handled separately, so dashboard figures match the source reports.", state: "ok" },
    scope === "all"
      ? { key: "next", title: "Drill in", detail: "Pick a store to see its own pattern, without building the comparison by hand.", state: "muted" }
      : { key: "next", title: "Compared with", detail: "The other two stores stay in view, faded, on the same scale.", state: "muted" },
  ];
}

export default function WoofGangModel() {
  const [view, setView] = useState<ViewId>("revenue");
  const [scope, setScope] = useState<Scope>("all");
  const [live, setLive] = useState(false);
  const narrow = useNarrow();
  const steps = ["Choose a view", "Pick a store to drill in", ...(live ? ["Drag to look around", "Click a store"] : [])];
  return (
    <ModelFigure title="Several stores in one view">
      <div className={styles.controls}>
        <Segmented label="Dashboard view" value={view} options={VIEWS} onChange={setView} />
        <Segmented label="Store" value={scope} options={SCOPES} onChange={setScope} />
      </div>
      <div className={frame.split}>
        <div className={styles.stack}>
          <InteractionCue line="You can use this." steps={steps} />
          <ModelViewport
            label={description(view, scope)}
            fallback={<DrawingView view={view} scope={scope} />}
            scene={(runtime) => <Scene {...runtime} view={view} scope={scope} narrow={narrow} onPick={setScope} />}
            onModel={setLive}
          />
          <Caption>{caption(view, scope)}</Caption>
          <ViewLegend view={view} scope={scope} />
        </div>
        <Panel heading="What this view shows" rows={panelRows(view, scope)} />
      </div>
    </ModelFigure>
  );
}

export function WoofGangPreview() {
  return <Drawing view="revenue" scope="all" preview />;
}
