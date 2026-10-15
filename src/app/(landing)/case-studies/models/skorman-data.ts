/* Site plan for the Skorman example, in plan units. x runs west to east, z
   north to south, so the camera looks in from the south-east. Shared by the
   3D scene and the SVG drawing. Every place and parcel here is an example. */

export type Range = [number, number];
export type Rect = { x: Range; z: Range };
export type Mode = "visibility" | "research" | "records";
export type ParcelId = "p1" | "p2" | "p3" | "p4";

export const MODES: readonly { value: Mode; label: string }[] = [
  { value: "visibility", label: "Development visibility" },
  { value: "research", label: "Property research" },
  { value: "records", label: "Public records" },
];

export const SLAB: Rect = { x: [-15.5, 15.5], z: [-10.5, 10.5] };
export const PLINTH: Rect = { x: [16.4, 20], z: [-0.6, 5.6] };

// Blocks are raised pads; the roads are the gaps between them.
const COLS: Range[] = [[-15.1, -5.8], [-4.2, 4.2], [5.8, 15.1]];
const ROWS: Range[] = [[-10.1, -4.4], [-2.8, 3.8], [5.4, 10.1]];
export const PADS: Rect[] = ROWS.flatMap((z) => COLS.map((x) => ({ x, z })));
export const ROAD_LINES = { x: [-5, 5], z: [-3.6, 4.6] };

export const PLAZA: Rect = { x: [-1.7, 1.7], z: [-0.9, 2] };
export const PIN: [number, number] = [0, 0.55];
export const SIGN: [number, number] = [-3, 3.62];
export const TREES: [number, number][] = [[-1.2, -0.45], [1.2, -0.45], [-1.2, 1.55], [1.2, 1.55]];

export type Building = Rect & { height: number };

// Destination district: mixed-use buildings around the plaza.
export const DESTINATION: Building[] = [
  { x: [-3.9, -2], z: [-2.5, -0.3], height: 2.8 },
  { x: [2, 3.9], z: [-2.5, -0.5], height: 3.6 },
  { x: [-3.9, -2], z: [1.1, 3.5], height: 2 },
  { x: [2, 3.9], z: [1.3, 3.5], height: 2.4 },
  { x: [-1.5, 1.5], z: [-2.5, -1.45], height: 1.3 },
];

// Emerging district: frames under construction.
export type Frame = Rect & { floors: number; cols: number; rows: number; core?: Rect };
export const EMERGING: Frame[] = [
  { x: [6.4, 9.8], z: [-2.3, 0.9], floors: 3, cols: 4, rows: 3 },
  { x: [10.8, 14.6], z: [-2.3, 1.1], floors: 2, cols: 4, rows: 3, core: { x: [13.3, 14.2], z: [-1.9, -0.7] } },
  { x: [6.6, 11.4], z: [2, 3.4], floors: 0, cols: 5, rows: 2 },
];
export const CRANE = { mast: [12.6, 2.6] as [number, number], height: 5.4, jib: 6.4, counter: 2.2 };

export type OldBuilding = Building & { roof: "gable" | "flat" };

// Older buildings around the edges that are not candidates.
export const OLDER: OldBuilding[] = [
  { x: [-7.6, -6.2], z: [-9.3, -5.4], height: 1.2, roof: "flat" },
  { x: [-14.5, -11], z: [-2.3, 0.3], height: 1.3, roof: "gable" },
  { x: [-14.5, -11.6], z: [1.2, 3.3], height: 1, roof: "flat" },
  { x: [-8.6, -6.4], z: [6.3, 9.1], height: 1.4, roof: "gable" },
  { x: [-3.8, -1], z: [-9.3, -5.6], height: 1.6, roof: "flat" },
  { x: [0.4, 3.8], z: [-9.4, -7.7], height: 1.1, roof: "gable" },
  { x: [1, 3.8], z: [6.2, 9.4], height: 1.5, roof: "flat" },
  { x: [6.4, 11.2], z: [6.1, 7.7], height: 1.2, roof: "gable" },
  { x: [6.4, 9.2], z: [8.3, 9.6], height: 0.9, roof: "flat" },
  { x: [12.4, 14.6], z: [-9.4, -6.6], height: 1.3, roof: "gable" },
];

// Plots the research sweep passes over but does not flag.
export const OTHER_PLOTS: Rect[] = [
  { x: [0.4, 3.8], z: [-7.1, -5.1] },
  { x: [12, 14.6], z: [6, 9.6] },
];

export type Parcel = {
  id: ParcelId;
  name: string;
  type: "Land" | "Building";
  size: "Large" | "Medium" | "Small";
  plot: Rect;
  building?: OldBuilding;
  // Where the owner-of-record stake stands, and its card in the records tray.
  stake: [number, number];
  card: number;
};

export const PARCELS: Parcel[] = [
  { id: "p1", name: "Parcel 1", type: "Land", size: "Large", plot: { x: [-14.4, -8.4], z: [-9.4, -5.2] }, stake: [-9, -5.8], card: 1 },
  { id: "p2", name: "Parcel 2", type: "Building", size: "Medium", plot: { x: [6.5, 11.7], z: [-9.5, -5.1] }, building: { x: [7, 11.2], z: [-9, -5.7], height: 1.5, roof: "gable" }, stake: [11.2, -5.4], card: 3 },
  { id: "p3", name: "Parcel 3", type: "Land", size: "Small", plot: { x: [-3.6, 0.1], z: [6.1, 9.5] }, stake: [-0.5, 6.6], card: 5 },
  { id: "p4", name: "Parcel 4", type: "Building", size: "Small", plot: { x: [-10.3, -6.3], z: [-1.9, 3] }, building: { x: [-9.8, -6.8], z: [-1.4, 2.5], height: 1.7, roof: "flat" }, stake: [-6.8, 2.6], card: 6 },
];
export const parcelById = (id: ParcelId) => PARCELS.find((parcel) => parcel.id === id) ?? PARCELS[0];

export const EXCLUDED: Rect = { x: [-14.4, -9.4], z: [6.1, 9.5] };

// Dashed visitor routes, from the edge of the site to the plaza.
export const ROUTES: [number, number][][] = [
  [[-15.5, 4.6], [-5, 4.6], [-5, 0.45], [-1.7, 0.45]],
  [[5, 10.5], [5, 4.6], [0, 4.6], [0, 2.1]],
  [[15.5, -3.6], [5, -3.6], [5, 0.45], [1.7, 0.45]],
];

// Records tray on its own plinth: upright cards along z, one per parcel and some blanks.
export const TRAY: Rect = { x: [16.9, 19.5], z: [0, 5] };
export const CARD_Z = (index: number) => TRAY.z[0] + 0.5 + index * 0.57;
export const CARD_COUNT = 8;

export const center = (rect: Rect): [number, number] => [(rect.x[0] + rect.x[1]) / 2, (rect.z[0] + rect.z[1]) / 2];
export const inside = (rect: Rect, x: number, z: number) => x >= rect.x[0] && x <= rect.x[1] && z >= rect.z[0] && z <= rect.z[1];
