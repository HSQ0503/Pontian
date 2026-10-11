export type Area = "driveway" | "patio" | "path" | "fence" | "gate";
export type AreaState = "scope" | "excluded" | "open" | "plain";
export type StopId = "birch" | "alder" | "cedar";
export type ViewId = "wide" | "side" | "front" | "back" | "street" | StopId;
export type Point = [number, number, number];
export type SceneLabel = { id: string; at: Point; title: string; detail?: string; state?: "ok" | "blocked"; lift?: number };
export type Pin = { id: "driveway" | "patio"; state: "ok" | "blocked" };

export type SceneInput = {
  view: ViewId;
  states: Partial<Record<Area, AreaState>>;
  selected: Area[];
  labels: SceneLabel[];
  pins?: Pin[];
  neighbourhood?: boolean;
  stop?: StopId | null;
  onPick?: (area: Area) => void;
  onPickStop?: (stop: StopId) => void;
};

/* Label anchors in the scene's metres: x west to east, z north to south,
   street at +z. The 2D plan uses the same layout at 1 unit = 10 cm. */
export const ANCHORS: Record<Area, Point> = {
  driveway: [-1.75, 0.06, 10.6],
  patio: [4.5, 0.08, -6.4],
  path: [-7, 0.05, 3.2],
  fence: [-12.5, 1.32, -10.7],
  gate: [-7, 1.5, -1.3],
};
export const SIDE_FENCE: Point = [-13, 1.32, -1.3];
export const STOP_ANCHORS: Record<StopId, Point> = { birch: [-30.5, 4.3, -21], alder: [4, 5.4, 0.2], cedar: [30.5, 4.3, -30] };
export const PIN_ANCHORS: Record<Pin["id"], Point> = { driveway: [-1.75, 1.8, 15.6], patio: [4.8, 1.8, -4.5] };
