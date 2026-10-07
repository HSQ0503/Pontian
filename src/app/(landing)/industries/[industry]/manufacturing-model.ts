// One fictional production cell shared by every demonstration on the
// manufacturing page. Every number displayed on the page is derived here.

export type Point = readonly [x: number, z: number];
export type StationId = "I1" | "I2";
export type Configuration = "existing" | "proposed";

export const cell = {
  product: "H-20 housing",
  assembly: "A1",
  inspection: "I1",
  proposedInspection: "I2",
  packaging: "P1",
  drive: "CD-1",
};

export const simulation = {
  assemblySeconds: 20,
  inspectionSeconds: 30,
  packagingSeconds: 15,
  conveyorSpeed: 0.25,
  spacing: 0.45,
  bufferCapacity: 4,
  runSeconds: 600,
};

const { assemblySeconds, inspectionSeconds, packagingSeconds, conveyorSpeed: speed, spacing, bufferCapacity, runSeconds } = simulation;

export const layout = {
  fixture: [-5.3, 0] as Point,
  output: [-4.5, 0] as Point,
  head: [-1.4, 0] as Point,
  pack: [4.6, 0] as Point,
  carton: [5.25, 0] as Point,
  drive: [4.45, 0.34] as Point,
  conveyorHeight: 0.8,
  booth: {
    I1: { stage: [-0.95, 0] as Point, center: [0, 0] as Point, exit: [0.95, 0] as Point },
    I2: { stage: [-0.95, -2.2] as Point, center: [0, -2.2] as Point, exit: [0.95, -2.2] as Point },
  },
  divert: [-1.4, -2.2] as Point,
  rejoin: [1.4, -2.2] as Point,
  merge: [1.4, 0] as Point,
};

const inboundCommon: Point[] = [layout.fixture, layout.output, layout.head];
const paths = {
  inbound: { I1: [...inboundCommon, layout.booth.I1.stage], I2: [...inboundCommon, layout.divert, layout.booth.I2.stage] },
  booth: { I1: [layout.booth.I1.stage, layout.booth.I1.center, layout.booth.I1.exit], I2: [layout.booth.I2.stage, layout.booth.I2.center, layout.booth.I2.exit] },
  outbound: { I1: [layout.booth.I1.exit, layout.pack], I2: [layout.booth.I2.exit, layout.rejoin, layout.merge, layout.pack] },
} satisfies Record<string, Record<StationId, Point[]>>;

export function pathLength(path: readonly Point[]) {
  let total = 0;
  for (let index = 1; index < path.length; index++) total += Math.hypot(path[index][0] - path[index - 1][0], path[index][1] - path[index - 1][1]);
  return total;
}

export function pointAlong(path: readonly Point[], distance: number): Point {
  let remaining = Math.max(0, distance);
  for (let index = 1; index < path.length; index++) {
    const [ax, az] = path[index - 1];
    const [bx, bz] = path[index];
    const length = Math.hypot(bx - ax, bz - az);
    if (remaining <= length) return [ax + ((bx - ax) * remaining) / length, az + ((bz - az) * remaining) / length];
    remaining -= length;
  }
  return path[path.length - 1];
}

const headDistance = pathLength(inboundCommon);
const inboundLength = { I1: pathLength(paths.inbound.I1), I2: pathLength(paths.inbound.I2) };
const outboundLength = { I1: pathLength(paths.outbound.I1), I2: pathLength(paths.outbound.I2) };
const boothTravel = pathLength(paths.booth.I1) / 2 / speed;
const cartonTravel = (layout.carton[0] - layout.pack[0]) / speed;

export const stationsFor: Record<Configuration, StationId[]> = { existing: ["I1"], proposed: ["I1", "I2"] };

export type SimPart = {
  id: number;
  assemblyStart: number;
  assemblyEnd: number;
  release: number;
  dispatch: number;
  station: StationId;
  inspectionStart: number;
  inspectionEnd: number;
  packArrival: number;
  packStart: number;
  packEnd: number;
};

export type SimRun = { configuration: Configuration; parts: SimPart[]; packOrder: number[] };

// Event sequence for a single assembly station feeding one or two inspection
// stations and one packaging station. Parts move at conveyor speed, keep a
// fixed spacing, and queue first-in, first-out. Assembly holds a finished part
// whenever the accumulation conveyor already carries `bufferCapacity` parts.
export function simulate(configuration: Configuration): SimRun {
  const stations = stationsFor[configuration];
  const stagingFree: Record<StationId, number> = { I1: 0, I2: 0 };
  const stationFree: Record<StationId, number> = { I1: 0, I2: 0 };
  const parts: SimPart[] = [];
  for (let id = 0; ; id++) {
    const assemblyStart = id === 0 ? 0 : parts[id - 1].release;
    if (assemblyStart >= runSeconds) break;
    const assemblyEnd = assemblyStart + assemblySeconds;
    const release = id >= bufferCapacity ? Math.max(assemblyEnd, parts[id - bufferCapacity].dispatch) : assemblyEnd;
    const headReady = Math.max(release + headDistance / speed, id > 0 ? parts[id - 1].dispatch + spacing / speed : 0);
    let choice: { station: StationId; dispatch: number; inspectionStart: number } | undefined;
    for (const station of stations) {
      const dispatch = Math.max(headReady, stagingFree[station]);
      const inspectionStart = Math.max(dispatch + (inboundLength[station] - headDistance) / speed, stationFree[station]);
      if (!choice || inspectionStart < choice.inspectionStart - 1e-9) choice = { station, dispatch, inspectionStart };
    }
    if (!choice) break;
    const inspectionEnd = choice.inspectionStart + inspectionSeconds;
    stagingFree[choice.station] = choice.inspectionStart;
    stationFree[choice.station] = inspectionEnd;
    parts.push({
      id, assemblyStart, assemblyEnd, release,
      dispatch: choice.dispatch, station: choice.station,
      inspectionStart: choice.inspectionStart, inspectionEnd,
      packArrival: inspectionEnd + outboundLength[choice.station] / speed, packStart: 0, packEnd: 0,
    });
  }
  const packOrder = parts.map((part) => part.id).sort((a, b) => parts[a].packArrival - parts[b].packArrival);
  let previousEnd = -Infinity;
  for (const id of packOrder) {
    const part = parts[id];
    part.packStart = Math.max(part.packArrival, previousEnd + spacing / speed);
    part.packEnd = part.packStart + packagingSeconds;
    previousEnd = part.packEnd;
  }
  return { configuration, parts, packOrder };
}

export type PartPose = { id: number; visible: boolean; x: number; z: number; fasteners: number };

// Positions are a pure function of time, so playback, scrubbing, and stepping
// all show the same state. Queued parts are capped behind the part ahead,
// which keeps them on the conveyor without overlapping.
export function partPoses(run: SimRun, time: number): PartPose[] {
  const poses: PartPose[] = run.parts.map((part) => ({ id: part.id, visible: false, x: 0, z: 0, fasteners: 4 }));
  let leadDistance = Infinity;
  for (const part of run.parts) {
    const pose = poses[part.id];
    if (time < part.release) {
      const elapsed = time - part.assemblyStart;
      pose.visible = elapsed >= assemblySeconds * 0.1;
      pose.fasteners = Math.max(0, Math.min(4, Math.floor((elapsed / assemblySeconds - 0.3) / 0.15) + 1));
      [pose.x, pose.z] = layout.fixture;
      leadDistance = Infinity;
      continue;
    }
    const distance = time >= part.dispatch
      ? headDistance + speed * (time - part.dispatch)
      : Math.min(speed * (time - part.release), leadDistance - spacing, headDistance);
    leadDistance = distance;
    if (time < part.inspectionStart) {
      pose.visible = true;
      [pose.x, pose.z] = pointAlong(paths.inbound[part.station], time >= part.dispatch ? Math.min(distance, inboundLength[part.station]) : distance);
    }
  }
  let leadRemaining = -Infinity;
  for (const id of run.packOrder) {
    const part = run.parts[id];
    const pose = poses[id];
    let remaining: number;
    if (time < part.packStart) remaining = Math.max(speed * (part.packArrival - time), leadRemaining + spacing, 0);
    else if (time < part.packEnd) remaining = 0;
    else remaining = -speed * (time - part.packEnd);
    leadRemaining = remaining;
    if (time < part.inspectionStart || time >= part.packEnd) continue;
    pose.visible = true;
    if (time < part.inspectionEnd) {
      const elapsed = time - part.inspectionStart;
      const travel = elapsed < boothTravel ? speed * elapsed : elapsed > inspectionSeconds - boothTravel ? 2 * boothTravel * speed - speed * (inspectionSeconds - elapsed) : boothTravel * speed;
      [pose.x, pose.z] = pointAlong(paths.booth[part.station], travel);
    } else if (time < part.packStart) {
      const length = outboundLength[part.station];
      [pose.x, pose.z] = pointAlong(paths.outbound[part.station], length - Math.min(remaining, length));
    } else {
      pose.x = layout.pack[0] + Math.min(time - part.packStart, cartonTravel) * speed;
      pose.z = 0;
    }
  }
  return poses;
}

export type CellStatus = {
  assembly: "assembling" | "blocked";
  inspection: Record<StationId, "inspecting" | "waiting">;
  packaging: "packing" | "waiting";
  waitingForInspection: number;
  packaged: number;
};

// A part counts as waiting when it has been assembled, has not started
// inspection, and is standing still: held at assembly, queued on the
// conveyor, or parked at a station entrance.
export function cellStatus(run: SimRun, time: number): CellStatus {
  const active = run.parts.find((part) => part.assemblyStart <= time && time < part.release);
  const inspecting = (station: StationId) => run.parts.some((part) => part.station === station && part.inspectionStart <= time && time < part.inspectionEnd);
  const now = partPoses(run, time);
  const soon = partPoses(run, time + 0.25);
  const stationary = (id: number) => now[id].x === soon[id].x && now[id].z === soon[id].z;
  return {
    assembly: active && time >= active.assemblyEnd ? "blocked" : "assembling",
    inspection: { I1: inspecting("I1") ? "inspecting" : "waiting", I2: inspecting("I2") ? "inspecting" : "waiting" },
    packaging: run.parts.some((part) => part.packStart <= time && time < part.packEnd) ? "packing" : "waiting",
    waitingForInspection: run.parts.filter((part) => part.assemblyEnd <= time && time < part.inspectionStart && stationary(part.id)).length,
    packaged: run.parts.filter((part) => part.packEnd <= time).length,
  };
}

const overlap = (start: number, end: number) => Math.max(0, Math.min(end, runSeconds) - Math.max(start, 0));

export type Stage = "assembly" | "inspection" | "packaging";

export type RunSummary = {
  packaged: number;
  averageWait: number;
  mostWaiting: number;
  assemblyBusy: number;
  assemblyBlocked: number;
  inspectionBusy: number;
  packagingBusy: number;
  limitingStage: Stage;
};

export function summarize(run: SimRun): RunSummary {
  const stations = stationsFor[run.configuration];
  const inspected = run.parts.filter((part) => part.inspectionStart <= runSeconds);
  const waits = inspected.map((part) => part.inspectionStart - part.assemblyEnd - inboundLength[part.station] / speed);
  let mostWaiting = 0;
  for (let time = 0; time <= runSeconds; time += 0.5) mostWaiting = Math.max(mostWaiting, cellStatus(run, time).waitingForInspection);
  const share = (total: number) => total / runSeconds;
  const busy = {
    assembly: share(run.parts.reduce((sum, part) => sum + overlap(part.assemblyStart, part.assemblyEnd), 0)),
    inspection: share(run.parts.reduce((sum, part) => sum + overlap(part.inspectionStart, part.inspectionEnd), 0)) / stations.length,
    packaging: share(run.parts.reduce((sum, part) => sum + overlap(part.packStart, part.packEnd), 0)),
  };
  const limitingStage = (Object.keys(busy) as Stage[]).reduce((best, stage) => (busy[stage] > busy[best] ? stage : best), "assembly");
  return {
    packaged: run.parts.filter((part) => part.packEnd <= runSeconds).length,
    averageWait: waits.length ? waits.reduce((sum, wait) => sum + wait, 0) / waits.length : 0,
    mostWaiting,
    assemblyBusy: busy.assembly,
    assemblyBlocked: share(run.parts.reduce((sum, part) => sum + overlap(part.assemblyEnd, part.release), 0)),
    inspectionBusy: busy.inspection,
    packagingBusy: busy.packaging,
    limitingStage,
  };
}

export const runs: Record<Configuration, SimRun> = { existing: simulate("existing"), proposed: simulate("proposed") };
export const summaries: Record<Configuration, RunSummary> = { existing: summarize(runs.existing), proposed: summarize(runs.proposed) };

// Production planning example. The line rate follows from the single
// inspection station in the simulation above.
export type OrderId = "1042" | "1043" | "1051";
export type Fixture = "F1" | "F2";

export const planning = {
  shiftStart: 6 * 60,
  shiftEnd: 14 * 60,
  ratePerHour: 3600 / inspectionSeconds,
  setupMinutes: 30,
  startingFixture: "F1" as Fixture,
  orders: {
    "1042": { units: 240, fixture: "F1" as Fixture, product: "Standard housing", note: "In progress" },
    "1043": { units: 360, fixture: "F2" as Fixture, product: "Extended housing", note: "Next in plan" },
    "1051": { units: 120, fixture: "F2" as Fixture, product: "Extended housing", note: "Urgent request" },
  } satisfies Record<OrderId, { units: number; fixture: Fixture; product: string; note: string }>,
};

export type PlanBlock =
  | { kind: "order"; order: OrderId; start: number; end: number }
  | { kind: "setup"; from: Fixture; to: Fixture; start: number; end: number };

export function buildPlan(sequence: OrderId[]): PlanBlock[] {
  const blocks: PlanBlock[] = [];
  let clock = planning.shiftStart;
  let fixture = planning.startingFixture;
  for (const order of sequence) {
    const details = planning.orders[order];
    if (details.fixture !== fixture) {
      blocks.push({ kind: "setup", from: fixture, to: details.fixture, start: clock, end: clock + planning.setupMinutes });
      clock += planning.setupMinutes;
      fixture = details.fixture;
    }
    const minutes = (details.units / planning.ratePerHour) * 60;
    blocks.push({ kind: "order", order, start: clock, end: clock + minutes });
    clock += minutes;
  }
  return blocks;
}

export const sequences = {
  current: ["1042", "1043"] as OrderId[],
  urgentFirst: ["1051", "1043", "1042"] as OrderId[],
  currentFirst: ["1042", "1051", "1043"] as OrderId[],
};

export function formatClock(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(Math.round(minutes % 60)).padStart(2, "0")}`;
}

// Fictional daily averages for conveyor drive CD-1 during operating hours.
export const driveHistory = {
  temperature: [46.8, 47.4, 47.1, 46.5, 47.9, 47.2, 46.9, 51.8, 53.6, 54.1, 54.9, 55.3, 54.6, 55.2],
  load: [58, 61, 59, 57, 62, 60, 58, 74, 77, 76, 78, 79, 77, 78],
  changeDay: 8,
};

export function averageOf(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
