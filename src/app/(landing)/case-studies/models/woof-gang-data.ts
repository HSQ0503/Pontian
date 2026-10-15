/* Shared layout and example data for the Woof Gang model and its drawing.
   World units: the plinth top is y = 0, stores face +z, the dashboard sits at the front. */

export type ViewId = "revenue" | "mix" | "returns" | "groomers";
export type StoreId = "a" | "b" | "c";
export type Scope = "all" | StoreId;
export type Range = [number, number];

export const VIEWS: readonly { value: ViewId; label: string }[] = [
  { value: "revenue", label: "Revenue trend" },
  { value: "mix", label: "Service mix" },
  { value: "returns", label: "Return visits" },
  { value: "groomers", label: "Groomers" },
];

export const SCOPES: readonly { value: Scope; label: string }[] = [
  { value: "all", label: "All stores" },
  { value: "a", label: "Store A" },
  { value: "b", label: "Store B" },
  { value: "c", label: "Store C" },
];

export const STORE_IDS: readonly StoreId[] = ["a", "b", "c"];
export const STORE_NAME: Record<StoreId, string> = { a: "Store A (example)", b: "Store B (example)", c: "Store C (example)" };
export const STORE_SHORT: Record<StoreId, string> = { a: "Store A", b: "Store B", c: "Store C" };

export const PLINTH = { x: [-5.95, 5.95] as Range, z: [-2.45, 4.5] as Range, height: 0.42 };
export const STORE_X: Record<StoreId, number> = { a: -3.75, b: 0, c: 3.75 };
export const STORE = { half: 1.4, z: [-1.9, 0] as Range, height: 1.6, parapet: 0.16 };
export const ROOF_Z = -0.95;
export const DASHBOARD = { x: [-1.7, 1.7] as Range, z: [3.05, 4.15] as Range, height: 0.34 };

// Relative values only. They set heights and lengths, never amounts.
export const REVENUE: Record<StoreId, number[]> = {
  a: [0.52, 0.58, 0.55, 0.63, 0.68, 0.72],
  b: [0.7, 0.66, 0.74, 0.8, 0.77, 0.86],
  c: [0.38, 0.44, 0.42, 0.5, 0.55, 0.6],
};
export const REVENUE_SCALE = 1.35;
export const COLUMN = { width: 0.26, step: 0.38, depth: 0.56 };
export const columnX = (index: number) => (index - 2.5) * COLUMN.step;

export const MIX: Record<StoreId, { total: number; grooming: number }> = {
  a: { total: 1, grooming: 0.62 },
  b: { total: 1.22, grooming: 0.5 },
  c: { total: 0.8, grooming: 0.7 },
};
export const MIX_SCALE = 1.25;
export const MIX_SIZE = 0.8;

export const RETURNING: Record<StoreId, number> = { a: 5, b: 6, c: 4 };
export const FOLLOW_UP_STORE: StoreId = "b";
export const FOLLOW_UP: [number, number][] = [[0.82, 1.22], [1.28, 1.36], [0.92, 1.72], [1.38, 1.86]];

// Quadratic path a returning customer follows from the front edge to the door.
export const RETURN_PATH: [[number, number], [number, number], [number, number]] = [[-1.2, 2.55], [-1.35, 0.95], [-0.12, 0.42]];
export function returnPoint(t: number): [number, number] {
  const [a, b, c] = RETURN_PATH;
  const u = 1 - t;
  return [u * u * a[0] + 2 * u * t * b[0] + t * t * c[0], u * u * a[1] + 2 * u * t * b[1] + t * t * c[1]];
}

export const GROOMERS: Record<StoreId, number[]> = { a: [0.72, 0.5], b: [0.8, 0.62, 0.44], c: [0.66, 0.78] };
export const GROOMER_Z = 1.05;
export const BAR = { start: 1.36, scale: 1.3, width: 0.36, height: 0.12 };
// Data line from a store's roof edge, forward and down into the back of the dashboard.
const LINE_ENDS: Record<StoreId, [number, number]> = { a: [-2.6, -0.95], b: [1.15, 0.25], c: [2.6, 0.95] };
export function lineControls(id: StoreId): [[number, number, number], [number, number, number], [number, number, number]] {
  const [sx, ex] = LINE_ENDS[id];
  const top = STORE.height + STORE.parapet;
  return [[sx, top, -0.07], [sx * 0.8 + ex * 0.2, top + 0.42, 1.5], [ex, 0.66, DASHBOARD.z[0] + 0.12]];
}

export const groomerX = (count: number, index: number) => (count === 3 ? (index - 1) * 0.8 : (index - 0.5) * 0.9);

/* Copy */

const VIEW_LABEL: Record<ViewId, string> = Object.fromEntries(VIEWS.map((view) => [view.value, view.label])) as Record<ViewId, string>;
export const viewLabel = (view: ViewId) => VIEW_LABEL[view];
export const scopeName = (scope: Scope) => (scope === "all" ? "All stores" : STORE_NAME[scope]);

export function viewDetail(view: ViewId, scope: Scope) {
  const store = scope === "all" ? null : STORE_SHORT[scope];
  switch (view) {
    case "revenue":
      return store
        ? `${store}’s six example months, on the same relative scale as the other stores. Example data, relative scale.`
        : "Six example months per store, side by side on one relative scale. Example data, relative scale.";
    case "mix":
      return store
        ? `${store}’s split between grooming services, in blue, and retail sales, in graphite.`
        : "One column per store. Grooming services in blue, retail sales in graphite.";
    case "returns":
      if (!store) return "Customers coming back to each store. One group at Store B may be due for follow-up.";
      return scope === FOLLOW_UP_STORE
        ? `Returning customers at ${store}, and a group that may be due for follow-up.`
        : `Returning customers at ${store}. No follow-up group is flagged here in this example.`;
    case "groomers":
      return store
        ? `${store}’s groomers, each with a bar for recorded service activity.`
        : "Example groomers at each store, each with a bar for recorded service activity.";
  }
}

export function caption(view: ViewId, scope: Scope) {
  const lead = scope === "all" ? "All three example stores" : `${STORE_NAME[scope]} in focus, the other stores faded`;
  switch (view) {
    case "revenue": return `${lead}. Six months of revenue per store as columns on a relative scale, with no amounts.`;
    case "mix": return `${lead}. Each column splits grooming services, in blue, from retail sales, in graphite.`;
    case "returns": return scope === "all" || scope === FOLLOW_UP_STORE
      ? `${lead}. Customers return to the store. One group at Store B is highlighted because it may be due for follow-up.`
      : `${lead}. Customers return to the store. No follow-up group is flagged at this store in the example.`;
    case "groomers": return `${lead}. Each groomer token has a bar for recorded service activity.`;
  }
}

export function description(view: ViewId, scope: Scope) {
  return `Table model of three example storefronts, Store A, Store B and Store C, on a shared base. A data line runs from each store to a shared dashboard at the front. View: ${viewLabel(view)}. ${caption(view, scope)} Example data, not client records.`;
}
