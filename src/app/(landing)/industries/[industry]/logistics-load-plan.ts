import { loadStops, shipments, vehicles } from "./logistics-data";

// Geometry for Vehicle B's loading example, in metres. x runs from the front
// bulkhead to the rear door, y across the two pallet lanes.

export type ArrangementId = "initial" | "proposed";
export type Lane = 0 | 1;
export type Point = { x: number; y: number };
type Slot = { row: number; lane: Lane };
type Item = { key: string; shipment: string; stop: number };

export const CARGO = vehicles.B.cargo;
export const ROWS = 5;
export const PALLET_BASE = 0.14;
export const rowX = (row: number) => 0.05 + row * 1.22;
export const laneY: Record<Lane, number> = { 0: 0.15, 1: 1.3 };
const DOOR_X = CARGO.length + 0.1;
const stageX = (index: number) => CARGO.length + 1.5 + index * 1.3;
const exitY: Record<Lane, number> = { 0: -1.35, 1: CARGO.width + 0.25 };
const MS_PER_M = 115;
export const FADE_MS = 260;

export const items: Item[] = loadStops.flatMap(({ stop, shipment }) =>
  Array.from({ length: shipments[shipment].pallets }, (_, index) => ({ key: `${shipment}-${index + 1}`, shipment, stop })),
);

// Both arrangements use the same seven floor positions and stack nothing;
// only which pallet sits where changes.
export const arrangements: Record<ArrangementId, Record<string, Slot>> = {
  initial: {
    "KV-2041-1": { row: 0, lane: 0 }, "KV-2041-2": { row: 0, lane: 1 },
    "KV-2042-1": { row: 1, lane: 0 }, "KV-2042-2": { row: 1, lane: 1 }, "KV-2042-3": { row: 2, lane: 0 },
    "KV-2043-1": { row: 2, lane: 1 }, "KV-2043-2": { row: 3, lane: 0 },
  },
  proposed: {
    "KV-2043-1": { row: 0, lane: 0 }, "KV-2043-2": { row: 0, lane: 1 },
    "KV-2042-1": { row: 1, lane: 0 }, "KV-2042-2": { row: 1, lane: 1 }, "KV-2042-3": { row: 2, lane: 0 },
    "KV-2041-1": { row: 3, lane: 0 }, "KV-2041-2": { row: 2, lane: 1 },
  },
};

const slotPoint = (slot: Slot): Point => ({ x: rowX(slot.row), y: laneY[slot.lane] });

type Action = { key: string; kind: "stage" | "deliver"; lane: Lane; stageIndex: number };

// Unloading works from the door inward, lane by lane. Freight for a later
// stop that sits between the door and this stop's freight moves straight
// back along its lane to the space behind the truck, and is reloaded the
// same way before the truck drives on.
function stopActions(arrangement: ArrangementId, stop: number): Action[] {
  const slots = arrangements[arrangement];
  return ([0, 1] as Lane[]).flatMap((lane) => {
    const inLane = items.filter((item) => item.stop >= stop && slots[item.key].lane === lane).sort((a, b) => slots[b.key].row - slots[a.key].row);
    const target = inLane.filter((item) => item.stop === stop);
    if (target.length === 0) return [];
    const deepest = Math.min(...target.map((item) => slots[item.key].row));
    const sequence = inLane.filter((item) => slots[item.key].row >= deepest);
    const staged = sequence.filter((item) => item.stop !== stop);
    return sequence.map((item): Action => item.stop === stop
      ? { key: item.key, kind: "deliver", lane, stageIndex: -1 }
      : { key: item.key, kind: "stage", lane, stageIndex: staged.length - 1 - staged.indexOf(item) });
  });
}

export const blockingKeys = (arrangement: ArrangementId, stop: number) => stopActions(arrangement, stop).filter((action) => action.kind === "stage").map((action) => action.key);
export const blockersAt = (arrangement: ArrangementId, stop: number) => blockingKeys(arrangement, stop).length;

export type ViewId = "angle" | "side" | "rear" | "top" | "overhead";
export const viewLabels: Partial<Record<ViewId, string>> = { angle: "Three-quarter", side: "Side", rear: "Rear door", top: "Plan" };

export type Placement = Point & { gone: boolean; staged: boolean };

export function placements(arrangement: ArrangementId, step: number): Record<string, Placement> {
  const slots = arrangements[arrangement];
  const actions = step > 0 ? stopActions(arrangement, step) : [];
  return Object.fromEntries(items.map((item) => {
    const slot = slots[item.key];
    const action = actions.find((entry) => entry.key === item.key);
    if (item.stop < step || action?.kind === "deliver") return [item.key, { x: DOOR_X, y: exitY[slot.lane], gone: true, staged: false }];
    if (action?.kind === "stage") return [item.key, { x: stageX(action.stageIndex), y: laneY[slot.lane], gone: false, staged: true }];
    return [item.key, { ...slotPoint(slot), gone: false, staged: false }];
  }));
}

// One timeline per pallet: positions at absolute times in ms. A pallet can
// be reloaded and moved off again within the same stop.
export type Track = { key: string; frames: { at: number; point: Point }[]; fade?: { from: number; to: number } };

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

// Lanes unload in parallel; within a lane each pallet waits for the one in
// front, so nothing passes through other freight.
export function transitionMoves(arrangement: ArrangementId, step: number): { tracks: Track[]; total: number } {
  const slots = arrangements[arrangement];
  const reload = step > 1 ? stopActions(arrangement, step - 1).filter((action) => action.kind === "stage") : [];
  const current = stopActions(arrangement, step);
  const tracks = new Map<string, Track>();
  let total = 0;
  ([0, 1] as Lane[]).forEach((lane) => {
    let cursor = 0;
    const push = (key: string, path: Point[], fade = false) => {
      const track = tracks.get(key) ?? { key, frames: [] };
      const length = path.slice(1).reduce((sum, point, index) => sum + distance(point, path[index]), 0);
      const travel = Math.round(220 + length * MS_PER_M);
      let at = cursor;
      track.frames.push({ at, point: path[0] });
      path.slice(1).forEach((point, index) => {
        at += travel * (distance(point, path[index]) / length);
        track.frames.push({ at: Math.round(at), point });
      });
      if (fade) track.fade = { from: cursor + travel, to: cursor + travel + FADE_MS };
      tracks.set(key, track);
      cursor += travel + 60;
    };
    reload.filter((action) => action.lane === lane).sort((a, b) => a.stageIndex - b.stageIndex).forEach((action) => {
      push(action.key, [{ x: stageX(action.stageIndex), y: laneY[lane] }, slotPoint(slots[action.key])]);
    });
    current.filter((action) => action.lane === lane).forEach((action) => {
      const from = slotPoint(slots[action.key]);
      if (action.kind === "stage") push(action.key, [from, { x: stageX(action.stageIndex), y: from.y }]);
      else push(action.key, [from, { x: DOOR_X, y: from.y }, { x: DOOR_X, y: exitY[lane] }], true);
    });
    total = Math.max(total, cursor + FADE_MS);
  });
  return { tracks: [...tracks.values()], total };
}

// Shared shape for anything the cargo scene or its plan-view fallback draws.
export type SceneItem = { key: string; shipment: string; label: string };
export type SceneTone = "selected" | "blocking" | "none";
export type FloorMark = { x: number; y: number; length: number; width: number; tone: "ok" | "alert" };
export type SceneLayout = { key: string; placements: Record<string, Placement>; transition?: { fromKey: string; tracks: Track[]; total: number } };

export const loadSceneItems: SceneItem[] = items.map((item) => ({ key: item.key, shipment: item.shipment, label: String(item.stop) }));

export function loadLayout(arrangement: ArrangementId, step: number): SceneLayout {
  const key = `${arrangement}-${step}`;
  if (step === 0) return { key, placements: placements(arrangement, 0) };
  const { tracks, total } = transitionMoves(arrangement, step);
  return { key, placements: placements(arrangement, step), transition: { fromKey: `${arrangement}-${step - 1}`, tracks, total } };
}

export const slotMark = (row: number, lane: Lane, tone: FloorMark["tone"]): FloorMark => ({ x: rowX(row), y: laneY[lane], length: 1.2, width: 1, tone });

// Disruption: Vehicle A is off the road, so its freight waits on the depot
// dock. Recovery reloads Vehicle B with KV-2044 at the front, since it is
// delivered last; everything else moves back one row and one space is left.
export type RecoveryMode = "original" | "recovery";

const fleetPallets = (shipment: string, label: string) =>
  Array.from({ length: shipments[shipment].pallets }, (_, index): SceneItem => ({ key: `${shipment}-${index + 1}`, shipment, label }));

export const recoverySceneItems: SceneItem[] = [...loadSceneItems, ...fleetPallets("KV-2044", "6"), ...fleetPallets("KV-2045", "–")];

const dock = (index: number, lane: Lane): Placement => ({ x: stageX(index), y: laneY[lane], gone: false, staged: true });
const inTruck = (row: number, lane: Lane): Placement => ({ x: rowX(row), y: laneY[lane], gone: false, staged: false });

const recoverySlots: Record<string, Slot> = {
  "KV-2044-1": { row: 0, lane: 0 }, "KV-2044-2": { row: 0, lane: 1 },
  "KV-2043-1": { row: 1, lane: 0 }, "KV-2043-2": { row: 1, lane: 1 },
  "KV-2042-1": { row: 2, lane: 0 }, "KV-2042-2": { row: 2, lane: 1 }, "KV-2042-3": { row: 3, lane: 0 },
  "KV-2041-1": { row: 4, lane: 0 }, "KV-2041-2": { row: 3, lane: 1 },
};

const fairholtOnDock: Record<string, Placement> = {
  "KV-2045-1": dock(0, 0), "KV-2045-2": dock(0, 1), "KV-2045-3": dock(1, 0), "KV-2045-4": dock(1, 1),
};

export function recoveryLayout(mode: RecoveryMode): SceneLayout {
  const proposed = arrangements.proposed;
  const placementsFor: Record<string, Placement> = mode === "original"
    ? {
      ...Object.fromEntries(items.map((item) => [item.key, inTruck(proposed[item.key].row, proposed[item.key].lane)])),
      "KV-2044-1": dock(2, 0), "KV-2044-2": dock(2, 1),
      ...fairholtOnDock,
    }
    : {
      ...Object.fromEntries(Object.entries(recoverySlots).map(([key, slot]) => [key, inTruck(slot.row, slot.lane)])),
      ...fairholtOnDock,
    };
  return { key: `recovery-${mode}`, placements: placementsFor };
}

export function freeSlots(layout: SceneLayout) {
  const taken = new Set(Object.values(layout.placements).filter((point) => !point.gone && !point.staged).map((point) => `${point.x.toFixed(2)}:${point.y.toFixed(2)}`));
  const free: { row: number; lane: Lane }[] = [];
  for (let row = 0; row < ROWS; row++) for (const lane of [0, 1] as Lane[]) if (!taken.has(`${rowX(row).toFixed(2)}:${laneY[lane].toFixed(2)}`)) free.push({ row, lane });
  return free;
}
