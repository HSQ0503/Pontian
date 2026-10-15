/* Shared layout for the Safast scene and its drawing. World units: x runs from
   the depot (west) to the mine (east), z toward the viewer, y up. */

export type ViewId = "fleet" | "shipments" | "rentals" | "everything";
export type ItemId = "t1" | "t2" | "t3" | "s1045" | "s1042" | "s1039" | "ex" | "wl" | "gs";
export type Kind = "truck" | "shipment" | "equipment";
export type ItemState = "ok" | "blocked" | "muted";
export type XZ = [number, number];

export const VIEWS: readonly { value: ViewId; label: string }[] = [
  { value: "fleet", label: "Fleet" },
  { value: "shipments", label: "Shipments" },
  { value: "rentals", label: "Rentals" },
  { value: "everything", label: "Everything" },
];

export const STRIP = { x: [-21, 21] as XZ, z: [-8, 8] as XZ, depth: 0.7 };
export const PAD = { x: [-20.4, -8.6] as XZ, z: [-7.2, 7.2] as XZ, top: 0.08 };
export const SHED = { x: [-20, -13] as XZ, z: [-7, -3.4] as XZ, wall: 2.5, ridge: 3.4 };
export const OFFICE = { x: [-11.6, -9.4] as XZ, z: [5.2, 6.8] as XZ, top: 1.3 };
export const BAY_LINES = [-19.5, -17.3, -15.1, -12.9];
export const BAY_Z: XZ = [-1.6, 4.6];
export const GATE = { x: -8.6, z: [1.0, 4.2] as XZ };
export const STACK: { x: XZ; z: XZ; level: number }[] = [
  { x: [-12.4, -9.4], z: [-6.9, -5.7], level: 0 },
  { x: [-12.4, -9.4], z: [-5.5, -4.3], level: 0 },
  { x: [-12.4, -9.4], z: [-6.9, -5.7], level: 1 },
];
export const CONTAINER_H = 1.3;

export const HAUL = { x: [6.8, 20.6] as XZ, z: [-4, 7.2] as XZ, top: 0.035 };
export const BENCHES: { x: XZ; z: XZ; top: number }[] = [
  { x: [6.8, 20.6], z: [-7.6, -3.6], top: 1.1 },
  { x: [8.8, 20.6], z: [-7.6, -5.2], top: 2.2 },
  { x: [11.2, 20.6], z: [-7.6, -6.6], top: 3.1 },
];
export const STOCKPILE = { x: 8.7, z: -1.9, radius: 1.5, height: 1.05 };

/* Gently graded ground: a low rise the road climbs over, plus a few mounds.
   It stays flat on the depot pad and the haul area and drops to 0 at the edges. */

const bump = (dx: number, dz: number) => Math.exp(-(dx * dx + dz * dz));
const smooth = (edge0: number, edge1: number, value: number) => {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

export function heightAt(x: number, z: number) {
  const edge = smooth(8, 6.6, Math.abs(z)) * smooth(21, 19.6, Math.abs(x));
  const open = smooth(-8.6, -7.2, x) * smooth(7, 5.6, x);
  const rise = 0.55 * bump((x + 1.2) / 4.2, (z - 2) / 9);
  const mounds = 1.05 * bump((x + 2.4) / 3.2, (z + 5.4) / 2.1) + 0.5 * bump((x - 2.6) / 2.8, (z - 6.1) / 1.6);
  const slope = 1.5 * bump((x - 5.8) / 1.9, (z + 6.2) / 1.9);
  return edge * ((rise + mounds) * open + slope * smooth(-4, -5, z));
}

/* Road: a Catmull-Rom curve from the depot gate to the haul area, sampled by
   arc length so the truck moves at an even speed. */

const ROAD_POINTS: XZ[] = [[-9.4, 2.6], [-6.2, 2.7], [-2.8, 4.1], [0.8, 3.4], [3.6, 0.9], [6.6, 0.1], [9.8, 1]];
export const ROAD_WIDTH = 2.3;
export const ROAD_LIFT = 0.06;

function catmull(points: XZ[], samplesPerSpan: number) {
  const out: XZ[] = [];
  const at = (index: number) => points[Math.max(0, Math.min(points.length - 1, index))];
  for (let i = 0; i < points.length - 1; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    for (let s = 0; s < samplesPerSpan; s++) {
      const t = s / samplesPerSpan;
      const t2 = t * t;
      const t3 = t2 * t;
      const coord = (k: 0 | 1) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3);
      out.push([coord(0), coord(1)]);
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

export const ROAD = catmull(ROAD_POINTS, 40);
const ROAD_LENGTHS = ROAD.reduce<number[]>((lengths, point, index) => {
  lengths.push(index === 0 ? 0 : lengths[index - 1] + Math.hypot(point[0] - ROAD[index - 1][0], point[1] - ROAD[index - 1][1]));
  return lengths;
}, []);
export const ROAD_LENGTH = ROAD_LENGTHS[ROAD_LENGTHS.length - 1];

export type RoadPose = { x: number; z: number; dx: number; dz: number };

// Fills `out` with the point and unit direction at fraction `u` of the road.
export function roadAt(u: number, out: RoadPose) {
  const target = Math.min(1, Math.max(0, u)) * ROAD_LENGTH;
  let low = 0;
  let high = ROAD_LENGTHS.length - 1;
  while (high - low > 1) {
    const mid = (low + high) >> 1;
    if (ROAD_LENGTHS[mid] < target) low = mid;
    else high = mid;
  }
  const span = ROAD_LENGTHS[high] - ROAD_LENGTHS[low] || 1;
  const t = (target - ROAD_LENGTHS[low]) / span;
  const [ax, az] = ROAD[low];
  const [bx, bz] = ROAD[high];
  out.x = ax + (bx - ax) * t;
  out.z = az + (bz - az) * t;
  out.dx = (bx - ax) / span;
  out.dz = (bz - az) / span;
  return out;
}

// Left and right road edges, for the drawing and the road ribbon.
export function roadEdges(width = ROAD_WIDTH) {
  return ROAD.map((point, index) => {
    const prev = ROAD[Math.max(0, index - 1)];
    const next = ROAD[Math.min(ROAD.length - 1, index + 1)];
    const length = Math.hypot(next[0] - prev[0], next[1] - prev[1]) || 1;
    const nx = -(next[1] - prev[1]) / length;
    const nz = (next[0] - prev[0]) / length;
    const half = width / 2;
    return { left: [point[0] + nx * half, point[1] + nz * half] as XZ, right: [point[0] - nx * half, point[1] - nz * half] as XZ };
  });
}

/* Placements. Headings are radians about y; 0 faces +x. */

export const TRUCK_MID_ROUTE = 0.5;
export const PLACES = {
  t1: { x: -16.2, z: 1.5, heading: -Math.PI / 2 },
  t3: { x: 13.4, z: 3.7, heading: Math.PI },
  ex: { x: 15.6, z: -0.9, heading: Math.PI / 2 },
  wl: { x: 11.3, z: -1.3, heading: Math.PI - 0.25 },
  gs: { x: 18.4, z: 5, heading: 0 },
  crate: { x: 16.5, z: 3.5 },
};

/* Items listed in the panel and labelled in the model. Every name is an example. */

export type Item = { id: ItemId; kind: Kind; name: string; short: string; status: string; detail: string; state: ItemState };

export const ITEMS: Record<ItemId, Item> = {
  t1: { id: "t1", kind: "truck", name: "Truck 01 (example)", short: "Truck 01", status: "At depot", detail: "Parked in bay 2, loading SF-1045", state: "ok" },
  t2: { id: "t2", kind: "truck", name: "Truck 02 (example)", short: "Truck 02", status: "On the road", detail: "Carrying SF-1042 to the mine site", state: "ok" },
  t3: { id: "t3", kind: "truck", name: "Truck 03 (example)", short: "Truck 03", status: "At site", detail: "Unloading at Mine site A (example)", state: "ok" },
  s1045: { id: "s1045", kind: "shipment", name: "Shipment SF-1045 (example)", short: "SF-1045", status: "Loading", detail: "Container on Truck 01 at the depot", state: "muted" },
  s1042: { id: "s1042", kind: "shipment", name: "Shipment SF-1042 (example)", short: "SF-1042", status: "In transit", detail: "Container on Truck 02, depot to mine site", state: "ok" },
  s1039: { id: "s1039", kind: "shipment", name: "Shipment SF-1039 (example)", short: "SF-1039", status: "Unloading", detail: "Crates from Truck 03 at Mine site A (example)", state: "ok" },
  ex: { id: "ex", kind: "equipment", name: "Excavator EX-07 (example)", short: "EX-07", status: "On rent", detail: "Mine site A (example), working the bench", state: "ok" },
  wl: { id: "wl", kind: "equipment", name: "Wheel loader WL-03 (example)", short: "WL-03", status: "Due back (example)", detail: "On rent at Mine site A (example)", state: "ok" },
  gs: { id: "gs", kind: "equipment", name: "Generator set GS-02 (example)", short: "GS-02", status: "Service due", detail: "On rent at Mine site A (example)", state: "blocked" },
};

export const ROWS: Record<ViewId, ItemId[]> = {
  fleet: ["t1", "t2", "t3"],
  shipments: ["s1042", "s1039", "s1045"],
  rentals: ["ex", "wl", "gs"],
  everything: ["t1", "t2", "t3", "ex", "wl", "gs"],
};

export const FOCUS: Record<ViewId, Kind | null> = { fleet: "truck", shipments: "shipment", rentals: "equipment", everything: null };

// The truck that carries each shipment, and the shipment on each truck.
export const CARRIER: Partial<Record<ItemId, ItemId>> = { s1045: "t1", s1042: "t2", s1039: "t3" };
export const LOAD: Partial<Record<ItemId, ItemId>> = { t1: "s1045", t2: "s1042", t3: "s1039" };

// Chip text shared by the 3D labels and the drawing.
export const CHIPS: Record<ItemId, { title: string; detail: string; state?: "ok" | "blocked" }> = {
  t1: { title: "Truck 01 · At depot", detail: "Bay 2 (example)", state: "ok" },
  t2: { title: "Truck 02 · On the road", detail: "Carrying SF-1042 (example)", state: "ok" },
  t3: { title: "Truck 03 · At site", detail: "Mine site A (example)", state: "ok" },
  s1045: { title: "SF-1045 · Loading", detail: "Shipment (example), Truck 01" },
  s1042: { title: "Shipment SF-1042 · In transit", detail: "Example, depot to mine site", state: "ok" },
  s1039: { title: "SF-1039 · Unloading", detail: "Shipment (example), Truck 03", state: "ok" },
  ex: { title: "EX-07 · On rent", detail: "Mine site A (example)", state: "ok" },
  wl: { title: "WL-03 · Due back (example)", detail: "On rent, Mine site A", state: "ok" },
  gs: { title: "GS-02 · Service due", detail: "On rent (example)", state: "blocked" },
};
export const DEPOT_CHIP = { title: "Depot (example)", detail: "Truck 01 loading SF-1045" };
export const MINE_CHIP = { title: "Mine site A (example)", detail: "GS-02 service due", state: "blocked" as const };

export function everythingDetail(id: ItemId) {
  const item = ITEMS[id];
  const load = LOAD[id];
  return load ? `${item.status} · ${ITEMS[load].short} ${ITEMS[load].status.toLowerCase()}` : `${item.status} · Mine site A (example)`;
}

export const CAPTIONS: Record<ViewId, string> = {
  fleet: "All three trucks in one shared view: one at the depot, one on the road and one unloading at the mine site.",
  shipments: "Each load is tied to the truck carrying it, along the route from the depot gate to the mine site.",
  rentals: "Equipment on rent at the mine site sits in the same system as the trucks. One machine is due back and one needs a service.",
  everything: "Fleet activity, shipments and equipment rentals in one place, so staff can coordinate the transport and rental sides.",
};

export const SCENE_SUMMARY = "A depot yard with a shed, parking bays and a gate, a road across gently graded ground, and a mine site with benches cut into a slope and a haul area.";
