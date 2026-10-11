import { shipments } from "./logistics-data";
import { CARGO, PALLET_BASE, ROWS, arrangements, items, laneY, rowX, type Lane } from "./logistics-load-plan";
import styles from "./logistics.module.css";

type Vec3 = [number, number, number];
type Point = [number, number];
type Tone = { top: string; front: string; side: string; stroke: string; strokeOpacity: number };
type Shape = { points: Point[]; fill?: string; stroke?: string; strokeOpacity?: number; fillOpacity?: number; dash?: string; open?: boolean };

// Orthographic view of Vehicle B at the dock, in the 3D scene's metres: x from the
// bulkhead to the rear door, y up, z across the two pallet lanes. The near wall
// and roof are cut away, as in the 3D view.
const AZIMUTH = 0.42;
const ELEVATION = 0.54;
const SCALE = 40;
const VIEWER = { x: Math.cos(ELEVATION) * Math.sin(AZIMUTH), z: Math.cos(ELEVATION) * Math.cos(AZIMUTH) };
const project = ([x, y, z]: Vec3): Point => [
  (x * Math.cos(AZIMUTH) - z * Math.sin(AZIMUTH)) * SCALE,
  ((x * Math.sin(AZIMUTH) + z * Math.cos(AZIMUTH)) * Math.sin(ELEVATION) - y * Math.cos(ELEVATION)) * SCALE,
];

const { length: L, width: W, height: H } = CARGO;
const DECK = 1.25;
const FLOOR = DECK - 0.12;
const DOCK_END = L + 2.2;
const DOCK_SIDE = 0.45;
const FIRST = "KV-2041";

const STROKE = { stroke: "#eeeeec", strokeOpacity: 0.58 };
const BODY: Tone = { top: "#202020", front: "#151515", side: "#101010", ...STROKE };
const INSIDE: Tone = { top: "#1c1c1c", front: "#121212", side: "#0e0e0e", ...STROKE };
const PALLET: Tone = { top: "#242424", front: "#191919", side: "#131313", ...STROKE };
const LOAD: Tone = { top: "#333333", front: "#262626", side: "#1d1d1d", ...STROKE };
const SELECTED: Tone = { top: "#fed603", front: "#d9b702", side: "#b39702", stroke: "#17191a", strokeOpacity: 1 };
const DOCK: Tone = { top: "#1a1a1a", front: "#131313", side: "#0f0f0f", ...STROKE };

function box(shapes: Shape[], min: Vec3, max: Vec3, tone: Tone) {
  const [x0, y0, z0] = min;
  const [x1, y1, z1] = max;
  const edge = { stroke: tone.stroke, strokeOpacity: tone.strokeOpacity };
  shapes.push(
    { points: ([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]] as Vec3[]).map(project), fill: tone.top, ...edge },
    { points: ([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]] as Vec3[]).map(project), fill: tone.front, ...edge },
    { points: ([[x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]] as Vec3[]).map(project), fill: tone.side, ...edge },
  );
}

const floorRect = (x0: number, x1: number, z0: number, z1: number, y = DECK + 0.002): Point[] =>
  ([[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]] as Vec3[]).map(project);

const circle = (x: number, y: number, z: number, radius: number): Vec3[] =>
  Array.from({ length: 36 }, (_, index) => {
    const angle = (index / 36) * Math.PI * 2;
    return [x + Math.cos(angle) * radius, y + Math.sin(angle) * radius, z];
  });

function hull(points: Point[]) {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: Point, a: Point, b: Point) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (list: Point[]) => list.reduce<Point[]>((chain, point) => {
    while (chain.length >= 2 && cross(chain[chain.length - 2], chain[chain.length - 1], point) <= 0) chain.pop();
    chain.push(point);
    return chain;
  }, []);
  const lower = half(sorted);
  const upper = half([...sorted].reverse());
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

function wheel(shapes: Shape[], x: number, z: number) {
  const tyre = hull([...circle(x, 0.5, z - 0.14, 0.5), ...circle(x, 0.5, z + 0.14, 0.5)].map(project));
  shapes.push(
    { points: tyre, fill: "#0c0c0c", ...STROKE },
    { points: circle(x, 0.5, z + 0.14, 0.5).map(project), fill: "#141414", ...STROKE },
    { points: circle(x, 0.5, z + 0.145, 0.3).map(project), fill: "#222222", ...STROKE },
    { points: circle(x, 0.5, z + 0.15, 0.11).map(project), fill: "#151515", ...STROKE },
  );
}

function pallet(shapes: Shape[], key: string, x0: number, z0: number) {
  const item = items.find((entry) => entry.key === key);
  if (!item) return;
  const height = shipments[item.shipment].pallet.height;
  const tone = item.shipment === FIRST ? SELECTED : LOAD;
  const [x1, z1] = [x0 + 1.2, z0 + 1];
  box(shapes, [x0, DECK, z0], [x1, DECK + PALLET_BASE, z1], PALLET);
  for (const offset of [0.12, 0.8]) {
    shapes.push({ points: ([[x0 + offset, DECK + 0.03, z1], [x0 + offset + 0.28, DECK + 0.03, z1], [x0 + offset + 0.28, DECK + 0.1, z1], [x0 + offset, DECK + 0.1, z1]] as Vec3[]).map(project), fill: "#080808" });
  }
  for (const offset of [0.1, 0.62]) {
    shapes.push({ points: ([[x1, DECK + 0.03, z0 + offset], [x1, DECK + 0.03, z0 + offset + 0.28], [x1, DECK + 0.1, z0 + offset + 0.28], [x1, DECK + 0.1, z0 + offset]] as Vec3[]).map(project), fill: "#080808" });
  }
  box(shapes, [x0 + 0.02, DECK + PALLET_BASE, z0 + 0.02], [x1 - 0.02, DECK + height, z1 - 0.02], tone);
  const top = DECK + height;
  shapes.push({ points: ([[x1 - 0.02, top - 0.38, z0 + 0.36], [x1 - 0.02, top - 0.38, z0 + 0.64], [x1 - 0.02, top - 0.18, z0 + 0.64], [x1 - 0.02, top - 0.18, z0 + 0.36]] as Vec3[]).map(project), fill: "#eeeeec", fillOpacity: tone === SELECTED ? 1 : 0.62 });
}

function buildDrawing() {
  const shapes: Shape[] = [];
  const line = (from: Vec3, to: Vec3, stroke = "#eeeeec", strokeOpacity = 0.2, dash?: string) => shapes.push({ points: [project(from), project(to)], stroke, strokeOpacity, dash, open: true });

  for (const z of [-DOCK_SIDE, W + DOCK_SIDE]) line([-2.6, 0, z], [L + 0.12, 0, z]);

  for (const z of [0.16, 0.46]) for (const x of z === 0.46 ? [4.3] : [-1.45, 4.3]) wheel(shapes, x, z);
  for (const z of [0.82, W - 0.82]) box(shapes, [-2.12, 0.85, z - 0.05], [L - 0.4, FLOOR, z + 0.05], BODY);
  box(shapes, [L - 0.12, 0.45, 0.05], [L, 0.6, W - 0.05], BODY);

  const [cz0, cz1] = [-0.04, W + 0.04];
  const profile: [number, number][] = [[-2.25, 1.13], [-0.15, 1.13], [-0.15, 3.2], [-1.95, 3.2], [-2.25, 2.9]];
  shapes.push(
    { points: ([[-1.95, 3.2, cz0], [-0.15, 3.2, cz0], [-0.15, 3.2, cz1], [-1.95, 3.2, cz1]] as Vec3[]).map(project), fill: BODY.top, ...STROKE },
    { points: ([[-2.25, 2.9, cz0], [-1.95, 3.2, cz0], [-1.95, 3.2, cz1], [-2.25, 2.9, cz1]] as Vec3[]).map(project), fill: "#1a1a1a", ...STROKE },
    { points: profile.map(([x, y]) => project([x, y, cz1])), fill: BODY.front, ...STROKE },
    { points: ([[-2.02, 2.36, cz1], [-1.24, 2.36, cz1], [-1.24, 2.98, cz1], [-2.02, 2.98, cz1]] as Vec3[]).map(project), fill: "#0a0c0d", ...STROKE },
  );
  line([-0.98, 1.3, cz1], [-0.98, 3.0, cz1], "#eeeeec", 0.32);
  box(shapes, [-0.9, 0.62, W - 0.25], [-0.35, 1.13, W + 0.02], BODY);
  box(shapes, [-2.08, 2.72, W + 0.04], [-2.02, 2.76, W + 0.3], BODY);
  box(shapes, [-2.12, 2.5, W + 0.3], [-2.0, 2.95, W + 0.38], BODY);

  box(shapes, [0, DECK, -0.04], [L, DECK + H, 0], INSIDE);
  for (let panel = 1; panel < 5; panel++) line([(L / 5) * panel, DECK + 0.1, 0.002], [(L / 5) * panel, DECK + H - 0.1, 0.002], "#eeeeec", 0.14);
  box(shapes, [-0.06, DECK + H, -0.06], [L - 0.02, DECK + H + 0.08, 0.02], BODY);
  box(shapes, [L, FLOOR, -0.06], [L + 0.06, DECK + H, 0], BODY);
  box(shapes, [-0.06, DECK, -0.04], [0, DECK + H, W + 0.04], INSIDE);
  box(shapes, [-0.06, FLOOR, -0.04], [L + 0.06, DECK, W + 0.04], BODY);
  for (let row = 0; row < ROWS; row++) for (const lane of [0, 1] as Lane[]) {
    shapes.push({ points: floorRect(rowX(row), rowX(row) + 1.2, laneY[lane], laneY[lane] + 1), stroke: "#eeeeec", strokeOpacity: 0.16 });
  }

  const slots = arrangements.proposed;
  const clear = ([0, 1] as Lane[]).map((lane) => {
    const first = Math.max(...items.filter((item) => item.shipment === FIRST && slots[item.key].lane === lane).map((item) => rowX(slots[item.key].row) + 1.2));
    return { lane, from: first, z0: laneY[lane] + 0.12, z1: laneY[lane] + 0.88 };
  });
  for (const strip of clear) shapes.push({ points: floorRect(strip.from + 0.04, L, strip.z0, strip.z1), fill: "#007dfe", fillOpacity: 0.22, stroke: "#007dfe", strokeOpacity: 1, dash: "4 4" });

  const depth = (key: string) => (rowX(slots[key].row) + 0.6) * VIEWER.x + (laneY[slots[key].lane] + 0.5) * VIEWER.z;
  for (const item of [...items].sort((a, b) => depth(a.key) - depth(b.key))) pallet(shapes, item.key, rowX(slots[item.key].row), laneY[slots[item.key].lane]);

  box(shapes, [0, DECK, W - 0.02], [L, DECK + 0.1, W + 0.04], BODY);
  box(shapes, [-0.06, DECK + H, W - 0.02], [L - 0.02, DECK + H + 0.08, W + 0.06], BODY);
  box(shapes, [-0.06, DECK, W], [0.06, DECK + H, W + 0.07], BODY);

  for (const x of [0.5, 3.3]) box(shapes, [x, 0.55, W], [x + 0.06, FLOOR, W + 0.03], BODY);
  for (const y of [0.55, 0.85]) box(shapes, [0.3, y, W], [3.5, y + 0.05, W + 0.03], BODY);
  wheel(shapes, 4.3, W - 0.46);
  for (const x of [-1.45, 4.3]) wheel(shapes, x, W - 0.16);

  box(shapes, [L + 0.12, 0, -DOCK_SIDE], [DOCK_END, DECK, W + DOCK_SIDE], DOCK);
  line([L + 1.5, DECK, -DOCK_SIDE], [L + 1.5, DECK, W + DOCK_SIDE], "#eeeeec", 0.18);
  box(shapes, [L + 0.12, DECK - 0.07, -DOCK_SIDE], [L + 0.2, DECK, W + DOCK_SIDE], BODY);
  shapes.push({ points: floorRect(L, L + 0.6, 0.05, W - 0.05, DECK + 0.001), fill: "#262626", ...STROKE });
  for (const strip of clear) shapes.push({ points: floorRect(L, L + 0.6, strip.z0, strip.z1, DECK + 0.004), fill: "#007dfe", fillOpacity: 0.22, stroke: "#007dfe", strokeOpacity: 1, dash: "4 4" });

  box(shapes, [L, DECK, W], [L + 0.06, DECK + H, W + 0.06], BODY);
  box(shapes, [L - 0.02, DECK + H, -0.06], [L + 0.06, DECK + H + 0.12, W + 0.06], BODY);
  return shapes;
}

const SHAPES = buildDrawing();
const points = SHAPES.flatMap((shape) => shape.points);
const PAD = 8;
const VIEW = {
  x: Math.min(...points.map(([x]) => x)) - PAD,
  y: Math.min(...points.map(([, y]) => y)) - PAD,
  width: Math.max(...points.map(([x]) => x)) - Math.min(...points.map(([x]) => x)) + PAD * 2,
  height: Math.max(...points.map(([, y]) => y)) - Math.min(...points.map(([, y]) => y)) + PAD * 2,
};
const pathOf = (shape: Shape) => shape.points.map(([x, y], index) => `${index ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ") + (shape.open ? "" : "Z");

const firstSlot = arrangements.proposed[`${FIRST}-1`];
const MARKER = project([rowX(firstSlot.row) + 0.6, DECK + shipments[FIRST].pallet.height, laneY[firstSlot.lane] + 0.5]);

export function LoadIllustration() {
  return (
    <figure className={styles.heroFigure} aria-label={`Line drawing of Vehicle B backed onto the loading dock with seven pallets on board, arranged so ${FIRST}, the first delivery, sits by the rear door with a clear path out.`}>
      <svg viewBox={`${VIEW.x.toFixed(1)} ${VIEW.y.toFixed(1)} ${VIEW.width.toFixed(1)} ${VIEW.height.toFixed(1)}`} className={styles.heroDrawing} aria-hidden="true">
        {SHAPES.map((shape, index) => (
          <path
            key={index}
            d={pathOf(shape)}
            fill={shape.fill ?? "none"}
            fillOpacity={shape.fillOpacity}
            stroke={shape.stroke ?? "none"}
            strokeOpacity={shape.strokeOpacity}
            strokeDasharray={shape.dash}
            strokeWidth={shape.dash ? 1.25 : 0.8}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      <span className={styles.heroMarker} style={{ left: `${((MARKER[0] - VIEW.x) / VIEW.width) * 100}%`, top: `${((MARKER[1] - VIEW.y) / VIEW.height) * 100}%` }}>
        <span>Stop 1</span>{FIRST} by the door
      </span>
    </figure>
  );
}
