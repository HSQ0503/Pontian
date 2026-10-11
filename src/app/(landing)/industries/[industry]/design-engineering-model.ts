// One source of geometry for the plan, the interpretation, and the 3D model,
// in plan metres: x runs east, y runs south, origin at the north-west corner.
export type Wall = { id: string; name: string; length: string; thickness: string; x0: number; x1: number; y0: number; y1: number };

export const BUILDING = { width: 10, depth: 6, slab: 0.25 };
export const WALL_HEIGHT = 3;

export const WALLS: Wall[] = [
  { id: "W1", name: "North exterior wall", length: "10.00 m", thickness: "300 mm", x0: 0, x1: 10, y0: 0, y1: 0.3 },
  { id: "W2", name: "East exterior wall", length: "6.00 m", thickness: "300 mm", x0: 9.7, x1: 10, y0: 0.3, y1: 5.7 },
  { id: "W3", name: "South exterior wall", length: "10.00 m", thickness: "300 mm", x0: 0, x1: 10, y0: 5.7, y1: 6 },
  { id: "W4", name: "West exterior wall", length: "6.00 m", thickness: "300 mm", x0: 0, x1: 0.3, y0: 0.3, y1: 5.7 },
  { id: "W5", name: "Interior partition", length: "5.40 m", thickness: "100 mm", x0: 5.95, x1: 6.05, y0: 0.3, y1: 5.7 },
];

export const wallById = (id: string) => WALLS.find((wall) => wall.id === id) ?? WALLS[0];

// Corridor ceiling: distances along the corridor (x) and below the slab soffit (depth).
export const CORRIDOR = { length: 6, soffit: 3, slab: 0.25 };
export const BEAMS = [
  { id: "B-12", x0: 1.4, x1: 1.8, depth: 0.35 },
  { id: "B-13", x0: 4.2, x1: 4.6, depth: 0.8 },
];
export const DUCT = { id: "SD-04", top: 0.5, height: 0.45, width: 0.6, loweredTop: 0.85 };
export const CEILING = 1.45;
export const CLASH = { x0: 4.2, x1: 4.6, top: 0.5, bottom: 0.8 };

// Plant room, in plan metres from the room's north-west corner.
type Footprint = { x0: number; x1: number; y0: number; y1: number };
export const ROOM = { width: 5, depth: 3.4, height: 2.4, door: { x0: 3.8, x1: 4.7 } };
export const UNITS: Record<"approved" | "proposed", Footprint & { height: number; size: string; connections: number[] }> = {
  approved: { x0: 0.8, x1: 2.0, y0: 0.5, y1: 1.3, height: 1.4, size: "1,200 × 800 mm", connections: [0.75, 1.05] },
  proposed: { x0: 0.8, x1: 2.4, y0: 0.5, y1: 1.5, height: 1.6, size: "1,600 × 1,000 mm", connections: [0.8, 1.2] },
};
export const PLINTH = { x0: 0.7, x1: 2.1, y0: 0.4, y1: 1.4, height: 0.15 };
export const TANK = { x0: 0.3, x1: 2.0, y0: 2.55, y1: 3.2, height: 1.3 };
export const ACCESS_DEPTH = 0.8;
export const PIPE_RUNS = UNITS.approved.connections;
export const PIPE_HEIGHT = 0.55;
export const ISOLATOR_X = 1.4;
export const accessGap = (unit: keyof typeof UNITS) => TANK.y0 - (UNITS[unit].y1 + ACCESS_DEPTH);

// Four-window building, in plan metres; south and east are the visible faces.
export type WindowMark = { mark: string; side: "South" | "East"; size: string; type: string; from: number; to: number };
export const HOUSE = { length: 8, depth: 5, height: 3.2, sill: 0.9, head: 2.4 };
export const WINDOWS: WindowMark[] = [
  { mark: "W01", side: "South", size: "1200 × 1500", type: "A", from: 1.2, to: 2.4 },
  { mark: "W02", side: "South", size: "1200 × 1500", type: "A", from: 4.6, to: 5.8 },
  { mark: "W03", side: "East", size: "900 × 1500", type: "B", from: 1.0, to: 1.9 },
  { mark: "W04", side: "East", size: "900 × 1500", type: "B", from: 3.0, to: 3.9 },
];
export const MISSING_WINDOW = "W03";

export type Point = [number, number];
const COS30 = Math.cos(Math.PI / 6);

// Isometric projection for the static drawings: x east, y south, z up.
export function isometric(scale: number, originX: number, originY: number) {
  return (x: number, y: number, z: number): Point => [originX + (x - y) * COS30 * scale, originY + (x + y) * 0.5 * scale - z * scale];
}

export function toPoints(list: Point[]) {
  return list.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
}

export type Box = { x0: number; x1: number; y0: number; y1: number; z0: number; z1: number };

export function boxFaces(project: ReturnType<typeof isometric>, { x0, x1, y0, y1, z0, z1 }: Box) {
  return {
    top: toPoints([project(x0, y0, z1), project(x1, y0, z1), project(x1, y1, z1), project(x0, y1, z1)]),
    south: toPoints([project(x0, y1, z0), project(x1, y1, z0), project(x1, y1, z1), project(x0, y1, z1)]),
    east: toPoints([project(x1, y0, z0), project(x1, y1, z0), project(x1, y1, z1), project(x1, y0, z1)]),
  };
}
