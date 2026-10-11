// Level 2 of a fictional office fit-out, in metres. Plan x runs west to east,
// plan z north to south. The 3D scene and the plan fallbacks both draw from
// this file, so the drawing, the model and the copy can't drift apart.

export type Range = [number, number];
export type Box = { x: Range; y: Range; z: Range };

export const WALL_HEIGHT = 2.7;
export const DOOR_HEAD = 2.1;
export const DOOR_WIDTH = 0.9;
export const FLOOR = { length: 36, depth: 14 };
export const CORRIDOR = { north: 6, south: 8, west: 8, east: 32 };
export const CORE_X = 32.25;

export type WallKind = "exterior" | "partition" | "core" | "added";
export type Opening = { from: number; to: number; head: number; sill?: number };
export type Wall = { axis: "x" | "z"; at: number; from: number; to: number; thickness: number; kind: WallKind; openings: Opening[] };

export type DoorKind = "fitout" | "added" | "core";
// `closed` is the leaf's heading when shut; `swing` turns it into the room.
export type Door = { id: string; hinge: [number, number]; closed: number; swing: 1 | -1; open: number; kind: DoorKind };

const ROOM_X = [8, 12, 16, 20, 24, 28];
const doorway = (x0: number): Opening => ({ from: x0 + 0.5, to: x0 + 0.5 + DOOR_WIDTH, head: DOOR_HEAD });
const windows = (bays: number[]): Opening[] => bays.map((x0) => ({ from: x0 + 0.8, to: x0 + 3.2, sill: 0.9, head: 2.3 }));
const ROOM_OPEN = 1.25;

export const DOORS: Door[] = [
  ...ROOM_X.map((x0, index): Door => ({ id: `D${index + 1}`, hinge: [x0 + 0.5, CORRIDOR.north], closed: 0, swing: 1, open: ROOM_OPEN, kind: "fitout" })),
  ...ROOM_X.map((x0, index): Door => ({ id: `D${index + 7}`, hinge: [x0 + 0.5, CORRIDOR.south], closed: 0, swing: -1, open: ROOM_OPEN, kind: "fitout" })),
  { id: "A", hinge: [0.5, CORRIDOR.north], closed: 0, swing: 1, open: ROOM_OPEN, kind: "added" },
  { id: "B", hinge: [4.5, CORRIDOR.north], closed: 0, swing: 1, open: ROOM_OPEN, kind: "added" },
  { id: "C-14", hinge: [CORE_X - 0.125, 6.5], closed: -Math.PI / 2, swing: 1, open: 0, kind: "core" },
];

export const QUOTED = new Set(DOORS.filter((door) => door.kind === "fitout").map((door) => door.id).slice(0, 10));
export const UNQUOTED = ["D11", "D12"];

export const WALLS: Wall[] = [
  { axis: "x", at: -0.15, from: -0.3, to: FLOOR.length + 0.3, thickness: 0.3, kind: "exterior", openings: windows([0, 4, 8, 12, 16, 20, 24, 28]) },
  { axis: "x", at: FLOOR.depth + 0.15, from: -0.3, to: FLOOR.length + 0.3, thickness: 0.3, kind: "exterior", openings: windows([0, 4, 8, 12, 16, 20, 24, 28]) },
  { axis: "z", at: -0.15, from: 0, to: FLOOR.depth, thickness: 0.3, kind: "exterior", openings: [{ from: 1.4, to: 4.6, sill: 0.9, head: 2.3 }, { from: 9.4, to: 12.6, sill: 0.9, head: 2.3 }] },
  { axis: "z", at: FLOOR.length + 0.15, from: 0, to: FLOOR.depth, thickness: 0.3, kind: "exterior", openings: [] },
  { axis: "x", at: CORRIDOR.north, from: CORRIDOR.west - 0.06, to: CORE_X - 0.25, thickness: 0.12, kind: "partition", openings: ROOM_X.map(doorway) },
  { axis: "x", at: CORRIDOR.south, from: CORRIDOR.west - 0.06, to: CORE_X - 0.25, thickness: 0.12, kind: "partition", openings: ROOM_X.map(doorway) },
  ...ROOM_X.flatMap((x): Wall[] => [
    { axis: "z", at: x, from: 0, to: CORRIDOR.north - 0.06, thickness: 0.12, kind: "partition", openings: [] },
    { axis: "z", at: x, from: CORRIDOR.south + 0.06, to: FLOOR.depth, thickness: 0.12, kind: "partition", openings: [] },
  ]),
  { axis: "z", at: CORE_X - 0.125, from: 0, to: FLOOR.depth, thickness: 0.25, kind: "core", openings: [{ from: 6.5, to: 7.5, head: DOOR_HEAD }] },
  { axis: "x", at: 5, from: CORE_X, to: FLOOR.length, thickness: 0.2, kind: "core", openings: [{ from: 33.3, to: 34.3, head: DOOR_HEAD }] },
  { axis: "x", at: CORRIDOR.north, from: 0, to: CORRIDOR.west - 0.06, thickness: 0.12, kind: "added", openings: [doorway(0), doorway(4)] },
  { axis: "z", at: 4, from: 0, to: CORRIDOR.north - 0.06, thickness: 0.12, kind: "added", openings: [] },
];

export const LIFT: Box = { x: [CORE_X, FLOOR.length], y: [0, WALL_HEIGHT], z: [9, FLOOR.depth] };
export const LIFT_DOOR: Range = [33.95, 35.05];
export const BOARD_STACK = { x: 1.2, z: 9.6 };

// Solid wall pieces in plan, with doorways and windows cut out.
export function planPieces(wall: Wall) {
  const edges = [wall.from, ...wall.openings.flatMap((opening) => [opening.from, opening.to]), wall.to];
  const pieces: Box[] = [];
  for (let index = 0; index < edges.length; index += 2) {
    if (edges[index + 1] - edges[index] > 0.001) pieces.push(wallBox(wall, [edges[index], edges[index + 1]], [0, WALL_HEIGHT]));
  }
  return pieces;
}

// Pieces, plus lintels over openings and sills under windows.
export function wallBoxes(wall: Wall) {
  const boxes = planPieces(wall);
  for (const opening of wall.openings) {
    boxes.push(wallBox(wall, [opening.from, opening.to], [opening.head, WALL_HEIGHT]));
    if (opening.sill) boxes.push(wallBox(wall, [opening.from, opening.to], [0, opening.sill]));
  }
  return boxes;
}

export function wallBox(wall: Wall, along: Range, y: Range): Box {
  const across: Range = [wall.at - wall.thickness / 2, wall.at + wall.thickness / 2];
  return wall.axis === "x" ? { x: along, y, z: across } : { x: across, y, z: along };
}

export function doorById(id: string) {
  const door = DOORS.find((item) => item.id === id);
  if (!door) throw new Error(`No door ${id}`);
  return door;
}

// Leaf tip in plan for a given opening angle, using three.js's y rotation.
export function leafTip(door: Door, angle: number): [number, number] {
  const heading = door.closed + door.swing * angle;
  return [door.hinge[0] + Math.cos(heading) * DOOR_WIDTH, door.hinge[1] - Math.sin(heading) * DOOR_WIDTH];
}

export function doorCenter(door: Door): [number, number] {
  const tip = leafTip(door, 0);
  return [(door.hinge[0] + tip[0]) / 2, (door.hinge[1] + tip[1]) / 2];
}
