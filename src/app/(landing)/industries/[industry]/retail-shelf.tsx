"use client";

import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import styles from "./retail.module.css";
import { HARBOR_HOUSE_BLEND, LOCATIONS, REORDER, TRANSFER, location, type LocationId, type ProductId, type StockOption } from "./retail-data";

/*
 * One shelf bay, in metres: x across the bay, y up, z towards the shopper.
 * The 3D scene and the static elevation both place products from these
 * slots, so the same bags sit in the same places in either view.
 */

export type Vec3 = [number, number, number];

export const BAG = { width: 0.112, depth: 0.072, body: 0.17, fold: 0.032 };
export const BAG_HEIGHT = BAG.body + BAG.fold;
export const BAY = { width: 1.34, depth: 0.4, height: 1.6, plinth: 0.106, shelf: 0.024, levels: [0.13, 0.47, 0.81, 1.15], slots: 10, pitch: 0.126, header: [1.44, 1.6] as const };
const FRONT_Z = BAY.depth / 2 - 0.055;
const BACK_Z = FRONT_Z - 0.1;

export const COLORS = {
  kraft: "#c4a477",
  kraftLabel: "#f4efe5",
  charcoal: "#35322f",
  charcoalLabel: "#ebe6dc",
  ceramic: "#f1f0ec",
  oak: "#d8c8a6",
  steel: "#3c3f41",
  panel: "#e8e8e5",
  card: "#cdb48b",
  ink: "#17191a",
  select: "#fed603",
  ok: "#007dfe",
  blocked: "#f51625",
};

const column = (index: number, count = BAY.slots) => (index - (count - 1) / 2) * BAY.pitch;

/* Maya's briefing: the Harbor Street coffee bay on 3 June. */

export type BriefingBag = { key: string; product: "house" | "reserve"; at: Vec3 };

export const BRIEFING_BAGS: BriefingBag[] = [
  ...Array.from({ length: HARBOR_HOUSE_BLEND }, (_, index): BriefingBag => ({
    key: `house-${index}`,
    product: "house",
    at: [column(index % 9, 9), BAY.levels[2], index < 9 ? FRONT_Z : BACK_Z],
  })),
  ...Array.from({ length: location("harbor").stock }, (_, index): BriefingBag => ({
    key: `reserve-${index}`,
    product: "reserve",
    at: [column(index), BAY.levels[1], FRONT_Z],
  })),
];

export const BREWER_AT: Vec3 = [-0.4, BAY.levels[3], 0.06];
export const BREWER_BOXES: Vec3[] = [-0.46, -0.26, -0.06].map((x): Vec3 => [x, BAY.levels[0], 0.02]);
export const TASTING_AT: Vec3 = [0.3, BAY.levels[3], 0.07];
export const TASTING_CUPS = [-0.13, -0.065, 0, 0.065, 0.13];

export const PRICE_TAGS: { product: ProductId; at: Vec3 }[] = [
  { product: "brewer", at: [-0.4, BAY.levels[3], 0] },
  { product: "tasting", at: [0.3, BAY.levels[3], 0] },
  { product: "house", at: [0, BAY.levels[2], 0] },
  { product: "reserve", at: [column(2.5), BAY.levels[1], 0] },
];

export const BRIEFING_ANCHORS: Record<ProductId, Vec3> = {
  brewer: [BREWER_AT[0] - 0.06, BREWER_AT[1] + 0.13, BREWER_AT[2] + 0.04],
  tasting: [TASTING_AT[0] + 0.17, TASTING_AT[1] + 0.06, TASTING_AT[2] + 0.04],
  house: [column(8, 9) + 0.04, BAY.levels[2] + BAG_HEIGHT - 0.03, FRONT_Z + BAG.depth / 2],
  reserve: [column(0) - 0.04, BAY.levels[1] + BAG_HEIGHT - 0.03, FRONT_Z + BAG.depth / 2],
};
export const BRIEFING_SIDES: Record<ProductId, "left" | "right"> = { brewer: "left", reserve: "left", tasting: "right", house: "right" };

/* Stock: the Reserve Blend bay at each of the three stores. Bags fill the top shelf first. */

export const STOCK_BAY_X: Record<LocationId, number> = { harbor: -1.95, market: 0, riverside: 1.95 };

export function stockSlot(store: LocationId, index: number): Vec3 {
  const level = BAY.levels.length - 1 - Math.floor(index / BAY.slots);
  return [STOCK_BAY_X[store] + column(index % BAY.slots), BAY.levels[level], FRONT_Z];
}

export type StockBag = { key: string; store: LocationId; index: number };
export const STOCK_BAGS: StockBag[] = LOCATIONS.flatMap((item) => Array.from({ length: item.stock }, (_, index) => ({ key: `${item.id}-${index}`, store: item.id, index })));

// The transfer moves Market Square's last bags into the slots Harbor Street's forecast needs.
const harborStock = location("harbor").stock;
const marketStock = location("market").stock;
export const TRANSFER_MOVES = Array.from({ length: TRANSFER }, (_, step) => ({
  key: `market-${marketStock - TRANSFER + step}`,
  from: stockSlot("market", marketStock - TRANSFER + step),
  to: stockSlot("harbor", harborStock + step),
  step,
}));
export const HARBOR_GAPS = Array.from({ length: TRANSFER }, (_, step) => stockSlot("harbor", harborStock + step));

export type Carton = { id: "incoming" | "reorder"; at: Vec3; size: Vec3; bags: number };
export const INCOMING_CARTON: Carton = { id: "incoming", at: [STOCK_BAY_X.riverside + 0.2, 0, 0.66], size: [0.46, 0.3, 0.34], bags: location("riverside").incoming };
export const REORDER_CARTON: Carton = { id: "reorder", at: [STOCK_BAY_X.harbor - 0.1, 0, 0.7], size: [0.62, 0.34, 0.42], bags: REORDER.quantity };

export const STOCK_ANCHOR_Y = BAY.height + 0.02;

/* Labels: HTML chips with an ink leader to a dot on the product. */

// `note` is the part of the detail dropped on narrow screens.
export type ShelfLabel = { id: string; at: Vec3; side: "left" | "right" | "top"; title: string; detail?: string; note?: string; state?: "ok" | "blocked" | "selected"; lead?: number };

export function LabelLayer({ labels, layer }: { labels: ShelfLabel[]; layer: RefObject<HTMLDivElement | null> }) {
  return (
    <div ref={layer} className={styles.labels} aria-hidden="true">
      <svg className={styles.leaders}>
        {labels.map((label) => <line key={label.id} data-line={label.id} />)}
      </svg>
      {labels.map((label) => (
        <span key={label.id} className={styles.leaderDot} data-dot={label.id} />
      ))}
      {labels.map((label) => (
        <span key={label.id} className={styles.chip} data-chip={label.id} data-state={label.state}>
          <strong>{label.title}</strong>
          {label.detail && <span>{label.detail}{label.note && <em> · {label.note}</em>}</span>}
        </span>
      ))}
    </div>
  );
}

const EDGE = 8;

// The dot stays on its anchor; the chip sits beside or above it and slides to stay in frame.
export function placeLabels(layer: HTMLDivElement | null, labels: ShelfLabel[], project: (at: Vec3) => { x: number; y: number; visible: boolean }) {
  if (!layer) return;
  const width = layer.clientWidth;
  const height = layer.clientHeight;
  for (const label of labels) {
    const chip = layer.querySelector<HTMLElement>(`[data-chip="${label.id}"]`);
    const dot = layer.querySelector<HTMLElement>(`[data-dot="${label.id}"]`);
    const line = layer.querySelector<SVGLineElement>(`[data-line="${label.id}"]`);
    if (!chip || !dot || !line) continue;
    const { x, y, visible } = project(label.at);
    const w = chip.offsetWidth;
    const h = chip.offsetHeight;
    const lead = label.lead ?? 28;
    let left = label.side === "left" ? x - lead - w : label.side === "right" ? x + lead : x - w / 2;
    let top = label.side === "top" ? y - lead - h : y - h / 2;
    left = Math.min(Math.max(left, EDGE), width - w - EDGE);
    top = Math.min(Math.max(top, EDGE), height - h - EDGE);
    const endX = label.side === "left" ? left + w : label.side === "right" ? left : Math.min(Math.max(x, left + 10), left + w - 10);
    const endY = label.side === "top" ? top + h : Math.min(Math.max(y, top + 8), top + h - 8);
    chip.style.transform = `translate(${left.toFixed(1)}px, ${top.toFixed(1)}px)`;
    dot.style.transform = `translate(${(x - 3.5).toFixed(1)}px, ${(y - 3.5).toFixed(1)}px)`;
    line.setAttribute("x1", x.toFixed(1));
    line.setAttribute("y1", y.toFixed(1));
    line.setAttribute("x2", endX.toFixed(1));
    line.setAttribute("y2", endY.toFixed(1));
    const opacity = visible ? "1" : "0";
    for (const element of [chip, dot, line as Element as HTMLElement]) element.style.opacity = opacity;
  }
}

/* Static elevation: the same bays drawn flat. It shows first, and stays when WebGL is off. */

type Bounds = { x: [number, number]; y: [number, number] };

function useBox<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return { ref, size };
}

function Elevation({ bounds, labels, children }: { bounds: Bounds; labels: ShelfLabel[]; children: ReactNode }) {
  const { ref, size } = useBox<HTMLDivElement>();
  const layer = useRef<HTMLDivElement>(null);
  const spanX = bounds.x[1] - bounds.x[0];
  const spanY = bounds.y[1] - bounds.y[0];
  useLayoutEffect(() => {
    if (!size.width) return;
    const scale = Math.min(size.width / spanX, size.height / spanY);
    const offsetX = (size.width - spanX * scale) / 2;
    const offsetY = (size.height - spanY * scale) / 2;
    placeLabels(layer.current, labels, ([x, y]) => ({ x: offsetX + (x - bounds.x[0]) * scale, y: offsetY + (bounds.y[1] - y) * scale, visible: true }));
  }, [size, labels, bounds, spanX, spanY]);
  return (
    <div ref={ref} className={styles.elevation}>
      <svg viewBox={`${bounds.x[0]} ${-bounds.y[1]} ${spanX} ${spanY}`} preserveAspectRatio="xMidYMid meet">
        <g transform="scale(1 -1)">{children}</g>
      </svg>
      <LabelLayer labels={labels} layer={layer} />
    </div>
  );
}

const STROKE = { stroke: COLORS.ink, strokeWidth: 1, vectorEffect: "non-scaling-stroke" as const, strokeLinejoin: "round" as const };

function BayDrawing({ x = 0 }: { x?: number }) {
  const half = BAY.width / 2;
  return (
    <g transform={`translate(${x} 0)`}>
      <rect x={-half} y={0} width={BAY.width} height={BAY.header[0]} fill={COLORS.panel} />
      <rect x={-half} y={BAY.header[0]} width={BAY.width} height={BAY.header[1] - BAY.header[0]} fill="#fff" {...STROKE} />
      <rect x={-half} y={0} width={BAY.width} height={BAY.plinth} fill={COLORS.steel} />
      {BAY.levels.map((level) => (
        <g key={level}>
          <rect x={-half + 0.03} y={level - BAY.shelf} width={BAY.width - 0.06} height={BAY.shelf} fill={COLORS.oak} {...STROKE} />
          <rect x={-half + 0.03} y={level - BAY.shelf - 0.03} width={BAY.width - 0.06} height={0.03} fill="#dcddda" {...STROKE} />
        </g>
      ))}
      <rect x={-half} y={0} width={0.03} height={BAY.height} fill={COLORS.steel} />
      <rect x={half - 0.03} y={0} width={0.03} height={BAY.height} fill={COLORS.steel} />
    </g>
  );
}

type BagTone = "none" | "selected" | "proposed" | "dim";

function BagDrawing({ at, product, tone = "none", onPick }: { at: Vec3; product: "house" | "reserve"; tone?: BagTone; onPick?: () => void }) {
  const [x, y] = at;
  const half = BAG.width / 2;
  const body = product === "house" ? COLORS.kraft : COLORS.charcoal;
  const fill = tone === "selected" ? mix(body, COLORS.select, 0.62) : tone === "proposed" ? mix(body, COLORS.ok, 0.45) : body;
  const label = product === "house" ? COLORS.kraftLabel : COLORS.charcoalLabel;
  return (
    <g transform={`translate(${x} ${y})`} onClick={onPick} className={onPick ? styles.pickable : undefined} opacity={tone === "dim" ? 0.35 : 1}>
      <path d={`M${-half} 0h${BAG.width}v${BAG.body}l-0.008 ${BAG.fold}h${-BAG.width + 0.016}l-0.008 ${-BAG.fold}z`} fill={fill} {...STROKE} strokeWidth={tone === "selected" ? 1.4 : 0.8} />
      <rect x={-half + 0.016} y={0.05} width={BAG.width - 0.032} height={0.07} fill={label} />
      <line x1={-half + 0.004} y1={BAG.body} x2={half - 0.004} y2={BAG.body} stroke={COLORS.ink} strokeOpacity={0.35} strokeWidth={0.6} vectorEffect="non-scaling-stroke" />
    </g>
  );
}

function mix(a: string, b: string, k: number) {
  const parse = (hex: string) => [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16));
  const [r1, g1, b1] = parse(a);
  const [r2, g2, b2] = parse(b);
  const channel = (from: number, to: number) => Math.round(from + (to - from) * k).toString(16).padStart(2, "0");
  return `#${channel(r1, r2)}${channel(g1, g2)}${channel(b1, b2)}`;
}

function BrewerDrawing({ at, tone }: { at: Vec3; tone: BagTone }) {
  const [x, y] = at;
  const fill = tone === "selected" ? mix(COLORS.ceramic, COLORS.select, 0.62) : COLORS.ceramic;
  return (
    <g transform={`translate(${x} ${y})`} opacity={tone === "dim" ? 0.45 : 1}>
      <rect x={-0.05} y={0} width={0.1} height={0.012} fill={fill} {...STROKE} strokeWidth={0.8} />
      <path d="M-0.024 0.012h0.048l0.044 0.1h-0.136z" fill={fill} {...STROKE} strokeWidth={tone === "selected" ? 1.4 : 0.8} />
      <path d="M0.062 0.09q0.04 -0.004 0.03 -0.04" fill="none" {...STROKE} strokeWidth={0.8} />
    </g>
  );
}

function TastingDrawing({ at, tone }: { at: Vec3; tone: BagTone }) {
  const [x, y] = at;
  const board = tone === "selected" ? mix(COLORS.oak, COLORS.select, 0.62) : "#bfa57a";
  const cup = tone === "selected" ? mix(COLORS.ceramic, COLORS.select, 0.5) : COLORS.ceramic;
  return (
    <g transform={`translate(${x} ${y})`} opacity={tone === "dim" ? 0.45 : 1}>
      <rect x={-0.17} y={0} width={0.34} height={0.018} fill={board} {...STROKE} strokeWidth={0.8} />
      {TASTING_CUPS.map((offset) => <path key={offset} d={`M${offset - 0.018} 0.018h0.036l0.006 0.042h-0.048z`} fill={cup} {...STROKE} strokeWidth={0.8} />)}
    </g>
  );
}

function BoxDrawing({ at }: { at: Vec3 }) {
  return <rect x={at[0] - 0.075} y={at[1]} width={0.15} height={0.15} fill={COLORS.card} {...STROKE} strokeWidth={0.8} />;
}

export type BriefingFocus = "house" | "reserve" | "tasting" | "owned";
export const FOCUS_PRODUCT: Record<BriefingFocus, ProductId> = { house: "house", reserve: "reserve", tasting: "tasting", owned: "brewer" };

export function BriefingElevation({ focus, labels, onPick }: { focus: BriefingFocus; labels: ShelfLabel[]; onPick: (focus: BriefingFocus) => void }) {
  const selected = FOCUS_PRODUCT[focus];
  const tone = (product: ProductId): BagTone => (product === selected ? "selected" : "none");
  return (
    <Elevation bounds={{ x: [-1.9, 1.9], y: [-0.08, 1.78] }} labels={labels}>
      <BayDrawing />
      {BREWER_BOXES.map((at) => <BoxDrawing key={at[0]} at={at} />)}
      <g onClick={() => onPick("owned")} className={styles.pickable}><BrewerDrawing at={BREWER_AT} tone={tone("brewer")} /></g>
      <g onClick={() => onPick("tasting")} className={styles.pickable}><TastingDrawing at={TASTING_AT} tone={tone("tasting")} /></g>
      {BRIEFING_BAGS.filter((bag) => bag.at[2] === FRONT_Z).map((bag) => <BagDrawing key={bag.key} at={bag.at} product={bag.product} tone={tone(bag.product)} onPick={() => onPick(bag.product)} />)}
    </Elevation>
  );
}

export function StockElevation({ option, labels }: { option: StockOption; labels: ShelfLabel[] }) {
  const moved = option === "transfer";
  const leaving = new Set(TRANSFER_MOVES.map((move) => move.key));
  return (
    <Elevation bounds={{ x: [-3.05, 3.05], y: [-0.1, 2.05] }} labels={labels}>
      {LOCATIONS.map((item) => <BayDrawing key={item.id} x={STOCK_BAY_X[item.id]} />)}
      {STOCK_BAGS.filter((bag) => !(moved && leaving.has(bag.key))).map((bag) => <BagDrawing key={bag.key} at={stockSlot(bag.store, bag.index)} product="reserve" />)}
      {moved
        ? TRANSFER_MOVES.map((move) => <BagDrawing key={move.key} at={move.to} product="reserve" tone="proposed" />)
        : HARBOR_GAPS.map((at, index) => <rect key={index} x={at[0] - BAG.width / 2} y={at[1] + 0.004} width={BAG.width} height={BAG_HEIGHT - 0.008} fill="none" stroke={COLORS.blocked} strokeWidth={1} strokeDasharray="3 2.5" vectorEffect="non-scaling-stroke" />)}
      {[INCOMING_CARTON, ...(moved ? [] : [REORDER_CARTON])].map((carton) => (
        <rect key={carton.id} x={carton.at[0] - carton.size[0] / 2} y={0} width={carton.size[0]} height={carton.size[1]} fill={carton.id === "reorder" ? "#e8f1fd" : "#f5f5f2"} stroke={carton.id === "reorder" ? COLORS.ok : COLORS.ink} strokeWidth={1} strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
      ))}
    </Elevation>
  );
}
