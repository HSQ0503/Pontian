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
