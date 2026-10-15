/* Shared layout and copy for the Canes model: the 3D scene and the plan
   drawing both read these. Units are metres; x runs west to east and z runs
   from the back of the lot (-z) to the street (+z). */

export type Rect = { x: [number, number]; z: [number, number] };
export type Point = [number, number, number];
export type JobView = "owner" | "crew";
export type ChipState = "ok" | "select" | "blocked";
export type RowState = ChipState | "muted";
export type Chip = { id: string; at: Point; title: string; detail?: string; state?: ChipState; lift?: number };
export type Row = { key: string; title: string; detail: string; state: RowState };

export const STEPS = ["Inquiry", "Estimate", "Approved", "Scheduled", "On site", "Paid"] as const;
export const VIEW_OPTIONS = [
  { value: "owner", label: "Owner view" },
  { value: "crew", label: "Crew phone" },
] as const satisfies readonly { value: JobView; label: string }[];

export const LOT: Rect = { x: [-13, 12.6], z: [-12, 8] };
export const HOUSE: Rect = { x: [-9.5, 1.5], z: [-4.5, 2.5] };
export const WALL_H = 2.7;
export const ROOF_RISE = 1.7;
export const ROOF_OVERHANG = 0.45;
export const DRIVE: Rect = { x: [3.2, 8.2], z: [-3.6, 9.6] };
export const PATIO: Rect = { x: [-5, 8.2], z: [-9.4, -5.4] };
export const FRONT_PATH: Rect = { x: [-5, -4], z: [3.3, 8] };
export const FOOTPATH_Z: [number, number] = [8, 9.6];
export const KERB_Z: [number, number] = [9.6, 9.8];
export const STREET_Z: [number, number] = [9.8, 16.4];
export const LANE_Z = 11.1;

// The truck faces west. Its local origin is the back of the pickup bed:
// the pickup runs to x = -5.65 and the trailer to x = +4.5.
export const TRUCK_X = 3;
export const PICKUP_X: [number, number] = [-5.65, 0];
export const TRAILER_X: [number, number] = [0.2, 4.5];
export const REEL_X = 4.05;

export const DRIVE_MID_X = (DRIVE.x[0] + DRIVE.x[1]) / 2;
export const DRIVE_LENGTH = DRIVE.z[1] - DRIVE.z[0];

// Driveway cleaning progress per step: weathered until the crew is on site,
// part way through on site, clean once the job is paid.
export const CLEANED = [0, 0, 0, 0, 0.62, 1] as const;
export const PATIO_CLEANED = [0, 0, 0, 0, 1, 1] as const;
export const cleanFront = (progress: number) => DRIVE.z[0] + progress * DRIVE_LENGTH;
// The crew stands on the clean side and sprays just past the line.
export const WORKER_BACK = 1.2;
export const IMPACT_AHEAD = WORKER_BACK + 0.2;

export const truckPresent = (step: number) => step === 3 || step === 4;
export const areaState = (step: number) => (step === 1 ? "proposed" : step === 2 ? "approved" : step === 3 || step === 4 ? "scheduled" : "plain");
export type AreaState = ReturnType<typeof areaState>;

const HOUSE_TOP: Point = [-4, WALL_H + ROOF_RISE, (HOUSE.z[0] + HOUSE.z[1]) / 2];
const HOUSE_FRONT: Point = [-8.6, 2.3, HOUSE.z[1]];
const DRIVE_SPOT: Point = [DRIVE_MID_X, 0.1, 2.2];
const PATIO_SPOT: Point = [3.6, 0.1, -7.4];
const TRUCK_TOP: Point = [TRUCK_X + 2.05, 2.05, LANE_Z];
const WORKER_TOP: Point = [DRIVE_MID_X, 1.8, cleanFront(CLEANED[4]) - WORKER_BACK];
const PHOTO_SPOT: Point = [DRIVE.x[1] - 0.6, 0.1, DRIVE.z[1] - 1];
const BALANCE: Chip = { id: "balance", at: HOUSE_FRONT, title: "Balance outstanding", state: "blocked", lift: 24 };

export function chipsFor(step: number): Chip[] {
  switch (step) {
    case 0: return [{ id: "inquiry", at: HOUSE_TOP, title: "New inquiry", detail: "Customer A (example)", state: "select" }];
    case 1: return [
      { id: "estimate", at: DRIVE_SPOT, title: "Estimate sent: driveway and patio", detail: "For the customer to review", state: "ok" },
      { id: "patio", at: PATIO_SPOT, title: "Rear patio", detail: "Proposed", state: "ok", lift: 22 },
    ];
    case 2: return [{ id: "approved", at: DRIVE_SPOT, title: "Customer approved", detail: "Deposit recorded", state: "select" }, BALANCE];
    case 3: return [{ id: "crew", at: TRUCK_TOP, title: "Crew 2 (example)", detail: "Tuesday morning", state: "select" }, BALANCE];
    case 4: return [
      { id: "checklist", at: WORKER_TOP, title: "Checklist: patio done", detail: "Driveway in progress", state: "ok" },
      { id: "photos", at: PHOTO_SPOT, title: "Before and after photos added", state: "ok", lift: 26 },
    ];
    default: return [{ id: "paid", at: HOUSE_TOP, title: "Invoice paid", detail: "Balance cleared", state: "ok" }];
  }
}

const CAPTIONS = [
  "A new inquiry comes in. The office creates a record for Customer A (example), and that record carries through to the estimate and the job.",
  "The office sends an estimate for the driveway and the rear patio, shown in blue. The customer reviews the proposed work.",
  "The customer approves the estimate, so the driveway and patio become the job. A deposit is recorded and the balance stays outstanding.",
  "The job is scheduled for Crew 2 (example) on Tuesday morning. The crew truck pulls up with its trailer-mounted water tank, pressure washer and hose reel.",
  "The crew works through the checklist. The patio is done, and the weathered driveway turns clean as the crew works down it. Before and after photos are added.",
  "The crew marks the job complete and leaves. The owner follows it through to payment: the invoice is paid and the balance is cleared.",
];
const CREW_NOTES = [
  "The crew phone is empty for now. The job reaches the crew once it’s scheduled.",
  "The crew phone is empty for now. The job reaches the crew once it’s scheduled.",
  "The crew phone is empty for now. The job reaches the crew once it’s scheduled.",
  "On the crew phone, the job shows the time, the customer and the work to do.",
  "On the crew phone, the crew ticks off the patio, adds before and after photos and sends a progress update.",
  "On the crew phone, the job is marked complete.",
];

export function captionFor(step: number, view: JobView) {
  return view === "crew" ? `${CAPTIONS[step]} ${CREW_NOTES[step]}` : CAPTIONS[step];
}

export function ownerRows(step: number): Row[] {
  const state = (focus: number[]): RowState => (focus.includes(step) ? "select" : step > focus[focus.length - 1] ? "ok" : "muted");
  return [
    { key: "customer", title: "Customer", detail: "Customer A (example) · Residential", state: state([0]) },
    { key: "estimate", title: "Estimate", detail: step < 1 ? "Not started" : step === 1 ? "Sent: driveway and patio, for review" : "Approved by the customer", state: state([1, 2]) },
    { key: "schedule", title: "Schedule", detail: step < 3 ? "Not scheduled" : "Crew 2 (example) · Tuesday morning", state: state([3]) },
    { key: "notes", title: "Crew notes", detail: step < 4 ? "No updates yet" : step === 4 ? "Checklist in progress · Before and after photos added" : "Job complete · Photos on the record", state: state([4]) },
    { key: "payment", title: "Payment", detail: step < 2 ? "No deposit yet" : step < 5 ? "Deposit recorded · Balance outstanding" : "Invoice paid · Balance cleared", state: step < 2 ? "muted" : step < 5 ? "blocked" : "select" },
  ];
}

export function crewRows(step: number): Row[] {
  const assigned = step >= 3;
  return [
    { key: "job", title: "Job", detail: assigned ? "Tuesday morning · Crew 2 (example)" : "Not assigned to a crew yet", state: step === 3 ? "select" : assigned ? "ok" : "muted" },
    { key: "details", title: "Job details", detail: assigned ? "Driveway and patio · Customer A (example)" : "Shows here once the job is scheduled", state: assigned ? "ok" : "muted" },
    { key: "patio", title: "Checklist: patio", detail: step >= 4 ? "Done" : "To do", state: step >= 4 ? "ok" : "muted" },
    { key: "driveway", title: "Checklist: driveway", detail: step >= 5 ? "Done" : step === 4 ? "In progress" : "To do", state: step === 4 ? "select" : step >= 5 ? "ok" : "muted" },
    { key: "photos", title: "Photos", detail: step >= 4 ? "Before and after added" : "None yet", state: step >= 4 ? "ok" : "muted" },
    { key: "update", title: "Progress update", detail: step >= 5 ? "Job marked complete" : step === 4 ? "Sent: driveway in progress" : "None yet", state: step >= 5 ? "select" : step === 4 ? "ok" : "muted" },
  ];
}
