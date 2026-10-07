// One fictional operation shared by every Logistics example. Times, distances,
// and loads are computed from these records so the sections cannot drift apart.

export const operation = {
  name: "Kestrel Freight",
  description: "A fictional regional carrier with one depot and two vehicles.",
};

export type PlaceId = "depot" | "alder" | "brookmere" | "cinder" | "glenway" | "hollin" | "elm" | "fairholt";

export type Place = {
  id: PlaceId;
  name: string;
  x: number;
  y: number;
  label: { dx: number; dy: number; anchor: "start" | "middle" | "end" };
};

// Schematic coordinates in kilometres. Road distance is the straight line
// times a fixed winding factor, driven at an example average speed.
export const places: Record<PlaceId, Place> = {
  depot: { id: "depot", name: "Kestrel depot", x: 30, y: 24, label: { dx: -18, dy: 6, anchor: "end" } },
  alder: { id: "alder", name: "Alder Park", x: 40, y: 13, label: { dx: -18, dy: -4, anchor: "end" } },
  brookmere: { id: "brookmere", name: "Brookmere", x: 54, y: 9, label: { dx: 0, dy: -22, anchor: "middle" } },
  cinder: { id: "cinder", name: "Cinder Lane", x: 64, y: 19, label: { dx: 0, dy: -22, anchor: "middle" } },
  glenway: { id: "glenway", name: "Glenway Works", x: 60, y: 33, label: { dx: 0, dy: 34, anchor: "middle" } },
  hollin: { id: "hollin", name: "Hollin Yard", x: 45, y: 38, label: { dx: 0, dy: 34, anchor: "middle" } },
  elm: { id: "elm", name: "Elm Quay", x: 30, y: 42, label: { dx: 0, dy: 34, anchor: "middle" } },
  fairholt: { id: "fairholt", name: "Fairholt", x: 6, y: 16, label: { dx: 0, dy: -22, anchor: "middle" } },
};

const WINDING = 1.3;
const AVERAGE_KMH = 40;

export function roadKm(from: PlaceId, to: PlaceId) {
  const a = places[from];
  const b = places[to];
  return Math.round(Math.hypot(a.x - b.x, a.y - b.y) * WINDING);
}

export function driveMinutes(from: PlaceId, to: PlaceId) {
  return Math.round((roadKm(from, to) / AVERAGE_KMH) * 60);
}

export const routeAssumptions = `Road distance is about ${WINDING}× the straight line, driven at an average of ${AVERAGE_KMH} km/h.`;

export type VehicleId = "A" | "B";

export type Vehicle = {
  id: VehicleId;
  name: string;
  body: string;
  cargo: { length: number; width: number; height: number };
  palletSpaces: number;
  payloadKg: number;
  driver: [string, string];
  departs: string;
};

export const vehicles: Record<VehicleId, Vehicle> = {
  A: { id: "A", name: "Vehicle A", body: "12-pallet rigid truck with tail-lift", cargo: { length: 7.3, width: 2.45, height: 2.4 }, palletSpaces: 12, payloadKg: 6000, driver: ["09:00", "17:00"], departs: "09:00" },
  B: { id: "B", name: "Vehicle B", body: "10-pallet rigid truck with tail-lift", cargo: { length: 6.2, width: 2.45, height: 2.4 }, palletSpaces: 10, payloadKg: 5000, driver: ["07:00", "16:00"], departs: "07:30" },
};

export type Shipment = {
  id: string;
  pallets: number;
  pallet: { length: number; width: number; height: number; weightKg: number };
  stackable: string;
  from: PlaceId;
  to: PlaceId;
  deliveryWindow: [string, string];
  collectionWindow?: [string, string];
  isNew?: boolean;
};

export const shipments: Record<string, Shipment> = {
  "KV-2041": { id: "KV-2041", pallets: 2, pallet: { length: 1.2, width: 1, height: 1.5, weightKg: 420 }, stackable: "No, fragile top", from: "depot", to: "alder", deliveryWindow: ["08:00", "09:30"] },
  "KV-2042": { id: "KV-2042", pallets: 3, pallet: { length: 1.2, width: 1, height: 1, weightKg: 300 }, stackable: "Yes, up to 2 high", from: "depot", to: "brookmere", deliveryWindow: ["09:00", "11:00"] },
  "KV-2043": { id: "KV-2043", pallets: 2, pallet: { length: 1.2, width: 1, height: 1.8, weightKg: 550 }, stackable: "No", from: "depot", to: "cinder", deliveryWindow: ["09:30", "12:00"] },
  "KV-2044": { id: "KV-2044", pallets: 2, pallet: { length: 1.2, width: 1, height: 1.2, weightKg: 400 }, stackable: "No", from: "depot", to: "elm", deliveryWindow: ["11:30", "13:30"] },
  "KV-2045": { id: "KV-2045", pallets: 4, pallet: { length: 1.2, width: 1, height: 1.4, weightKg: 450 }, stackable: "No", from: "depot", to: "fairholt", deliveryWindow: ["10:00", "11:00"] },
  "KV-2046": { id: "KV-2046", pallets: 2, pallet: { length: 1.2, width: 1, height: 1.4, weightKg: 380 }, stackable: "No", from: "glenway", to: "hollin", collectionWindow: ["09:00", "12:00"], deliveryWindow: ["12:00", "16:00"], isNew: true },
};

export const formatSize = (shipment: Shipment) => {
  const { length, width, height } = shipment.pallet;
  return `${length.toFixed(1)} × ${width.toFixed(1)} × ${height.toFixed(1)} m`;
};

export const totalWeight = (shipment: Shipment) => shipment.pallets * shipment.pallet.weightKg;

export const formatKg = (kg: number) => `${kg.toLocaleString("en-US")} kg`;

export type Task = { shipment: string; action: "deliver" | "collect" };

const SERVICE_MINUTES = 20;
const FOUR_PALLET_SERVICE_MINUTES = 25;
const BREAK_MINUTES = 30;
const BREAK_AFTER = "11:30";
const BREAK_IN_WAIT_FROM = "11:00";

export const driverRule = `A ${BREAK_MINUTES}-minute break once the driver passes ${BREAK_AFTER}, taken during a wait at a stop where possible.`;
export const serviceRule = `${SERVICE_MINUTES} minutes per stop, ${FOUR_PALLET_SERVICE_MINUTES} for four pallets or more.`;

export const toMinutes = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

export const toTime = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

export type PlannedStop = {
  shipment: string;
  action: Task["action"];
  place: PlaceId;
  window: [string, string];
  driveKm: number;
  driveMinutes: number;
  arrive: string;
  start: string;
  depart: string;
  late: boolean;
  onBoardAfter: number;
};

export type PlannedRoute = {
  vehicle: VehicleId;
  tasks: Task[];
  stops: PlannedStop[];
  driverBreak?: { start: string; end: string; stopIndex: number; during: "wait" | "after" };
  loadedAtDepot: number;
  weightAtDepot: number;
  maxOnBoard: number;
  returnKm: number;
  returnsAt: string;
  overShift: boolean;
  overCapacity: boolean;
  lateStops: PlannedStop[];
};

const taskPlace = (task: Task) => (task.action === "collect" ? shipments[task.shipment].from : shipments[task.shipment].to);
const taskWindow = (task: Task) => {
  const shipment = shipments[task.shipment];
  return task.action === "collect" && shipment.collectionWindow ? shipment.collectionWindow : shipment.deliveryWindow;
};

export function planRoute(vehicleId: VehicleId, tasks: Task[]): PlannedRoute {
  const vehicle = vehicles[vehicleId];
  const loadedAtDepot = tasks.filter((task) => task.action === "deliver" && shipments[task.shipment].from === "depot");
  let onBoard = loadedAtDepot.reduce((sum, task) => sum + shipments[task.shipment].pallets, 0);
  const weightAtDepot = loadedAtDepot.reduce((sum, task) => sum + totalWeight(shipments[task.shipment]), 0);
  let maxOnBoard = onBoard;
  let now = toMinutes(vehicle.departs);
  let at: PlaceId = "depot";
  let driverBreak: PlannedRoute["driverBreak"];
  const stops: PlannedStop[] = [];

  tasks.forEach((task, index) => {
    const place = taskPlace(task);
    const window = taskWindow(task);
    const minutes = driveMinutes(at, place);
    const arrive = now + minutes;
    const start = Math.max(arrive, toMinutes(window[0]));
    if (!driverBreak && arrive >= toMinutes(BREAK_IN_WAIT_FROM) && start - arrive >= BREAK_MINUTES) {
      driverBreak = { start: toTime(arrive), end: toTime(arrive + BREAK_MINUTES), stopIndex: index, during: "wait" };
    }
    const pallets = shipments[task.shipment].pallets;
    let depart = start + (pallets >= 4 ? FOUR_PALLET_SERVICE_MINUTES : SERVICE_MINUTES);
    onBoard += task.action === "collect" ? pallets : -pallets;
    maxOnBoard = Math.max(maxOnBoard, onBoard);
    stops.push({
      shipment: task.shipment,
      action: task.action,
      place,
      window,
      driveKm: roadKm(at, place),
      driveMinutes: minutes,
      arrive: toTime(arrive),
      start: toTime(start),
      depart: toTime(depart),
      late: arrive > toMinutes(window[1]),
      onBoardAfter: onBoard,
    });
    if (!driverBreak && depart >= toMinutes(BREAK_AFTER)) {
      driverBreak = { start: toTime(depart), end: toTime(depart + BREAK_MINUTES), stopIndex: index, during: "after" };
      depart += BREAK_MINUTES;
    }
    now = depart;
    at = place;
  });

  const returnsAt = now + driveMinutes(at, "depot");
  return {
    vehicle: vehicleId,
    tasks,
    stops,
    driverBreak,
    loadedAtDepot: loadedAtDepot.reduce((sum, task) => sum + shipments[task.shipment].pallets, 0),
    weightAtDepot,
    maxOnBoard,
    returnKm: roadKm(at, "depot"),
    returnsAt: toTime(returnsAt),
    overShift: returnsAt > toMinutes(vehicle.driver[1]),
    overCapacity: maxOnBoard > vehicle.palletSpaces || weightAtDepot > vehicle.payloadKg,
    lateStops: stops.filter((stop) => stop.late),
  };
}

export const routeWorks = (route: PlannedRoute) => route.lateStops.length === 0 && !route.overShift && !route.overCapacity;

const deliver = (shipment: string): Task => ({ shipment, action: "deliver" });
const collect = (shipment: string): Task => ({ shipment, action: "collect" });

export const plans = {
  baseA: planRoute("A", [deliver("KV-2045"), deliver("KV-2044")]),
  baseB: planRoute("B", [deliver("KV-2041"), deliver("KV-2042"), deliver("KV-2043")]),
  // Vehicle A can only reach the collection in time by going there first.
  requestOnA: planRoute("A", [collect("KV-2046"), deliver("KV-2045"), deliver("KV-2046"), deliver("KV-2044")]),
  requestOnAAfterFairholt: planRoute("A", [deliver("KV-2045"), collect("KV-2046"), deliver("KV-2046"), deliver("KV-2044")]),
  requestOnB: planRoute("B", [deliver("KV-2041"), deliver("KV-2042"), deliver("KV-2043"), collect("KV-2046"), deliver("KV-2046")]),
  recoveryB: planRoute("B", [deliver("KV-2041"), deliver("KV-2042"), deliver("KV-2043"), collect("KV-2046"), deliver("KV-2046"), deliver("KV-2044")]),
  fairholtFirstOnB: planRoute("B", [deliver("KV-2045"), deliver("KV-2041"), deliver("KV-2042"), deliver("KV-2043"), collect("KV-2046"), deliver("KV-2046")]),
};

export const stopOf = (route: PlannedRoute, shipment: string, action: Task["action"] = "deliver") =>
  route.stops.find((stop) => stop.shipment === shipment && stop.action === action);

// Vehicle B's freight for its first three stops, as loaded at the depot.
export const loadStops = [
  { stop: 1, shipment: "KV-2041" },
  { stop: 2, shipment: "KV-2042" },
  { stop: 3, shipment: "KV-2043" },
] as const;

// Example rate card used only to illustrate how a draft quote is assembled.
export const rateCard = {
  zone: "Zone 2",
  palletRate: 68,
  standardPallet: "1.2 × 1.0 m footprint, up to 1.6 m high and 500 kg",
  perExtraKm: 2,
  tailLiftPerStop: 35,
};

export const quoteRequest = {
  reference: "Q-0118",
  shipment: "KV-2046",
  from: "Orders desk, Glenway Works",
  received: "Today, 14:05",
  replyReceived: "Today, 14:20",
};

export const collectionDetourKm = roadKm("depot", "glenway") + roadKm("glenway", "hollin") - roadKm("depot", "hollin");

export const quoteLines = {
  base: shipments["KV-2046"].pallets * rateCard.palletRate,
  detour: collectionDetourKm * rateCard.perExtraKm,
  handling: rateCard.tailLiftPerStop,
};

export const quoteTotal = quoteLines.base + quoteLines.detour + quoteLines.handling;

export const formatMoney = (amount: number) => `$${amount.toFixed(2)}`;
