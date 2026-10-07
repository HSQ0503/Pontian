// Single source for the fictional example: every section reads machine IDs,
// attachments, bookings, and states from here so the story cannot drift.

export const EX014 = "EX-014";
export const EX027 = "EX-027";
export const BREAKER = "AT-112";
export const RENTAL = "R-1041";
export const NEXT_RESERVATION = "R-1057";
export const TRANSPORT = "TR-208";
export const PICKUP = "TR-215";
export const WORK_ORDER = "WO-5520";

export const MACHINE_TYPE = "Tracked excavator";
export const BREAKER_TYPE = "Hydraulic breaker";
export const YARD = "Main rental yard";
export const QUARRY = "Customer's surface quarry";

export const RENTAL_START = "12 Oct";
export const RENTAL_END = "23 Oct";
export const RENTAL_PERIOD = "12–23 Oct";
export const NEXT_RESERVATION_START = "25 Oct";
export const EX027_INSPECTION_BOOKED = "24 Oct";

export const METER_AT_HANDOFF = "6,318 h";
export const METER_ON_RENT = "6,401 h";
export const METER_ON_RENT_UPDATED = "21 Oct, 16:40";
export const METER_AT_RETURN = "6,421 h";

export const SOURCES = {
  manufacturer: "Manufacturer specification",
  fleet: "Fleet record",
  customer: "Customer requirement",
} as const;

export type Source = keyof typeof SOURCES;

export const RETURN_STAGES = [
  "Returned",
  "Awaiting inspection",
  "Maintenance hold",
  "Released by authorized reviewer",
  "Ready for rental",
] as const;

export type ReturnStage = (typeof RETURN_STAGES)[number];

export const EX027_STATE = "Awaiting inspection";
