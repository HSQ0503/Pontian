export type Application = {
  type: string;
  status: string;
  stage: string;
  project: string;
  description: string;
  units: number | null;
  opened: string;
  closed: string;
  approved: string;
};

export type Parcel = {
  id: string;
  parcelNumber: string;
  owner: string;
  ownerAddress: string;
  ownerCity: string;
  ownerState: string;
  ownerZip: string;
  ownerCountry: string;
  address: string;
  propertyName: string;
  acres: number;
  deedAcres: string;
  landUse: string;
  landUseCode: string;
  propertyClass: string;
  vacant: boolean;
  yearBuilt: string;
  landValue: number;
  buildingValue: number;
  justValue: number;
  lastSalePrice: number;
  lastSaleDate: string;
  link: string;
  lat: number;
  lng: number;
  distanceMiles: number;
  jurisdiction: string;
  zoning: string;
  zoningName: string;
  flu: string;
  fluName: string;
  floodPct: number;
  wetlandPct: number;
  applications: Application[];
  rings: number[][][];
};

export type ParcelData = {
  generatedAt: string;
  center: { lat: number; lng: number };
  radiusMiles: number;
  minAcres: number;
  sources: string[];
  parcels: Parcel[];
};

// 0 rural/agriculture, 1 low-density residential, 2 medium residential, 3 multifamily/commercial/mixed use.
export type Intensity = 0 | 1 | 2 | 3;
type Level = Intensity | "public" | null;

export const intensityLabels: Record<Intensity, string> = {
  0: "Rural or agricultural",
  1: "Low-density residential",
  2: "Medium-density residential",
  3: "Multifamily, commercial, or mixed use",
};

const exactCodes: Record<string, Record<string, Level>> = {
  "Unincorporated Lake County": {
    a: 0, ar: 0, ra: 0, "r-1": 0, "r-2": 1, "r-3": 2, "r-4": 2, "r-6": 2, "r-7": 3, rm: 2, rp: 3,
    "c-1": 3, "c-2": 3, "c-3": 3, cp: 3, mp: 3, lm: 3, hm: 3, cfd: "public", pud: null, rmrp: null, rv: null,
    "440": 0, "460": 0, "450": 0, "500": 0, "120": 1, "130": 2, "140": 3, "150": null, "200": 3, "210": 3,
    "221": 3, "230": "public", "240": "public", "800": 0, "810": 0, "820": 0, "830": 0, "850": 0, "940": 0,
    "900": 3, "910": 3, "930": 3, "960": 3,
  },
  Minneola: {
    "rsf-1": 1, "rsf-2": 2, "rsf-3": 2, "rmf-1": 3, "rmf-2": 3, "b-1": 3, or: 3, "i-1": 3, p: "public",
    "pud-r": null, r: null, u: null, "c-wetlands": 0, sfl: 1, sfm: 2, sfm3: 2, sfh: 2, mfm: 3, mfh: 3,
    "mud-h": 3, "mud-s": 3, "murd-harb": 3, "murd-j": 3, "murd-overlook": 3, "murd-p": 3, ind: 3,
    ins: "public", rec: "public", utilities: "public", general: null,
  },
  Montverde: {
    a: 0, r1l: 1, r1m: 2, r3: 3, c1: 3, orc: 3, pf: "public", pud: null, "ra/mh": 0, sfl: 1, sfm: 2,
    sfah: 2, smf: 3, i: 3, rec: "public", cos: 0, uos: 0, row: "public",
  },
};

const keywordLevels: [RegExp, Level][] = [
  [/planned unit|^pud/, null],
  [/public|civic|institution|parks|recreation|^water|^row$|utilit|community development district/, "public"],
  [/conserv|agricult|rural|green swamp low|wetland/, 0],
  [/high density|multi|mixed|commercial|office|business|industrial|downtown|town cen|town core|village cen|village core|employment|master planned|residential\s*\/\s*(professional|office)|central business/, 3],
  [/medium|moderate|village edge|town edge|^town$|^village$|single family reside/, 2],
  [/low density|estate|established neighbor|hamlet|single family limite/, 1],
];

function levelOf(jurisdiction: string, code: string, name: string): Level {
  const key = code.trim().toLowerCase();
  if (!key) return null;
  const exact = exactCodes[jurisdiction]?.[key];
  if (exact !== undefined) return exact;
  const text = `${code} ${name}`.toLowerCase();
  return keywordLevels.find(([pattern]) => pattern.test(text))?.[1] ?? null;
}

export function zoningLevel(parcel: Parcel) {
  return levelOf(parcel.jurisdiction, parcel.zoning, parcel.zoningName);
}

export function planLevel(parcel: Parcel) {
  return levelOf(parcel.jurisdiction, parcel.flu, parcel.fluName);
}

export function describeCode(code: string, name: string) {
  return [code, name].filter(Boolean).join(" · ") || "Not mapped";
}

const developmentTypes = new Set([
  "REZONING", "SITE PLAN", "MINORSP", "PRE-SUB", "PRE-PLAT", "CMP PLN AM", "CUP", "MCUP", "DEV AGR", "MASTERPARK", "DRI",
]);

const unavailableOwner =
  /\b(HOA|HOMEOWNERS|PROPERTY OWNERS|OWNERS ASS|ASSOCIATION|CDD|COMMUNITY DEVELOPMENT|CITY OF|COUNTY|STATE OF|SCHOOL BOARD|WATER MANAGEMENT|WATER AUTHORITY|BOARD OF TRUSTEES|DUKE ENERGY|UNITED STATES|CHURCH|MINISTR|CEMETERY|TRUSTEES OF)\b/;
const unavailableUse = /COMMON ELEMENTS|GOVT|CHURCH|SCHOOL|COLLEGE|HOSPITAL|UTILITY|CEMETER|SUBMERGED|RIGHT OF WAY/;
const farmUse = /PASTURE|TIMBER|GROVE|NURSERY|CROP|CATTLE|POULTRY|HORSE|DAIRY|ORCHARD|AGRICULTUR|ACREAGE/;

// Owners that appear to hold Hills City Center land. Max should confirm the full list.
export const relatedOwners = ["MINNEOLA LAND LLC", "MINNEOLA HILLS VENTURES LLC"];

export function isRelatedOwner(parcel: Parcel) {
  return relatedOwners.includes(parcel.owner.toUpperCase());
}

export function isUnavailable(parcel: Parcel) {
  return unavailableOwner.test(parcel.owner.toUpperCase()) || unavailableUse.test(parcel.landUse.toUpperCase());
}

export function yearsHeld(parcel: Parcel, today = new Date()) {
  if (!parcel.lastSaleDate) return null;
  return Math.floor((today.getTime() - new Date(parcel.lastSaleDate).getTime()) / (365.25 * 86_400_000));
}

export function isImproved(parcel: Parcel) {
  return parcel.buildingValue > 100_000 && parcel.buildingValue > parcel.landValue;
}

export const signalCatalog = {
  "plan-allows-much-more": "Plan allows much more than zoning",
  "plan-allows-more": "Plan allows more than zoning",
  "failed-attempt": "Earlier development attempt cancelled or denied",
  "open-application": "Open county application",
  "farm-use": "Still in farm or timber use",
  vacant: "Vacant",
  "long-held": "Held 15+ years",
  "no-sale": "No sale on record",
  "out-of-state": "Owner outside Florida",
  "owner-holdings": "Owner holds several nearby parcels",
  close: "Within 3 miles of Crooked Can",
  wetlands: "Significant wetlands",
  flood: "Significant flood zone",
  improved: "Already built on",
} as const;

export type SignalId = keyof typeof signalCatalog;
export type Signal = { id: SignalId; detail: string; points: number };

export function signalsFor(parcel: Parcel): Signal[] {
  const signals: Signal[] = [];
  const add = (id: SignalId, detail: string, points: number) => signals.push({ id, detail, points });

  const zoning = zoningLevel(parcel);
  const plan = planLevel(parcel);
  if (typeof zoning === "number" && typeof plan === "number" && plan > zoning) {
    const detail = `Zoned ${intensityLabels[zoning].toLowerCase()} (${parcel.zoning}), but the land-use plan shows ${intensityLabels[plan].toLowerCase()} (${parcel.fluName || parcel.flu}).`;
    if (plan - zoning >= 2) add("plan-allows-much-more", detail, 30);
    else add("plan-allows-more", detail, 12);
  }

  const devApplications = parcel.applications.filter((application) => developmentTypes.has(application.type));
  const failed = devApplications.find((application) => application.status === "CANCEL" || application.status === "DENIAL");
  if (failed) {
    const year = failed.opened.slice(0, 4);
    add("failed-attempt", `${failed.type.toLowerCase()} ${failed.status === "DENIAL" ? "denied" : "cancelled"}${year ? ` (${year})` : ""}: ${failed.description || failed.project}`, 20);
  }
  const open = devApplications.find((application) => application.status.startsWith("PEND"));
  if (open) add("open-application", `${open.type.toLowerCase()} in progress: ${open.description || open.project}`, 0);

  if (farmUse.test(parcel.landUse.toUpperCase())) add("farm-use", `Classified today as ${parcel.landUse.toLowerCase()}.`, 10);
  if (parcel.vacant) add("vacant", "The property appraiser lists it as vacant.", 8);

  const held = yearsHeld(parcel);
  if (held === null) add("no-sale", "No sale date in the property appraiser record.", 5);
  else if (held >= 15) add("long-held", `Last sold in ${parcel.lastSaleDate.slice(0, 4)} (${held} years ago).`, held >= 25 ? 15 : 10);

  if (parcel.ownerState && parcel.ownerState !== "FL") add("out-of-state", `Owner mailing address in ${parcel.ownerState}.`, 5);

  const miles = parcel.distanceMiles;
  if (miles <= 3) add("close", `${miles.toFixed(1)} miles from Crooked Can.`, miles <= 1 ? 20 : miles <= 2 ? 15 : 10);

  if (parcel.wetlandPct >= 30) add("wetlands", `About ${parcel.wetlandPct}% of the parcel is mapped wetland.`, parcel.wetlandPct >= 60 ? -25 : -15);
  if (parcel.floodPct >= 30) add("flood", `About ${parcel.floodPct}% is in a FEMA flood zone.`, -10);
  if (isImproved(parcel)) add("improved", `Buildings valued at $${parcel.buildingValue.toLocaleString()}.`, -15);

  return signals;
}

export function scoreOf(signals: Signal[]) {
  const total = signals.reduce((sum, signal) => sum + signal.points, 0);
  return Math.max(0, Math.min(100, total));
}

export type Scored = Parcel & { signals: Signal[]; score: number; zoningLevel: Level; planLevel: Level };

export function scoreParcels(parcels: Parcel[]): Scored[] {
  const holdings = new Map<string, { count: number; acres: number }>();
  for (const parcel of parcels) {
    const current = holdings.get(parcel.owner) ?? { count: 0, acres: 0 };
    holdings.set(parcel.owner, { count: current.count + 1, acres: current.acres + parcel.acres });
  }
  return parcels.map((parcel) => {
    const signals = signalsFor(parcel);
    const owned = holdings.get(parcel.owner);
    if (owned && owned.count >= 2 && !isUnavailable(parcel)) {
      signals.push({ id: "owner-holdings", detail: `This owner holds ${owned.count} parcels in the area (${Math.round(owned.acres)} acres total), which could be assembled.`, points: 5 });
    }
    return { ...parcel, signals, score: scoreOf(signals), zoningLevel: zoningLevel(parcel), planLevel: planLevel(parcel) };
  });
}

export const ruleFields = {
  owner: { label: "Owner", kind: "text" },
  ownerState: { label: "Owner state", kind: "text" },
  ownerCity: { label: "Owner city", kind: "text" },
  address: { label: "Property address", kind: "text" },
  landUse: { label: "Land use", kind: "text" },
  jurisdiction: { label: "Jurisdiction", kind: "text" },
  zoning: { label: "Zoning code", kind: "text" },
  flu: { label: "Land-use plan code", kind: "text" },
  fluName: { label: "Land-use plan name", kind: "text" },
  acres: { label: "Acres", kind: "number" },
  justValue: { label: "Just value ($)", kind: "number" },
  landValue: { label: "Land value ($)", kind: "number" },
  buildingValue: { label: "Building value ($)", kind: "number" },
  lastSalePrice: { label: "Last sale price ($)", kind: "number" },
  lastSaleYear: { label: "Last sale year", kind: "number" },
  distanceMiles: { label: "Miles from Crooked Can", kind: "number" },
  wetlandPct: { label: "Wetland %", kind: "number" },
  floodPct: { label: "Flood zone %", kind: "number" },
  applicationCount: { label: "County applications", kind: "number" },
  score: { label: "Score", kind: "number" },
} as const;

export type RuleField = keyof typeof ruleFields;
export const ruleOperators = ["contains", "does not contain", "is", "is not", "greater than", "less than", "is empty", "is not empty"] as const;
export type RuleOperator = (typeof ruleOperators)[number];
export type Rule = { id: string; field: RuleField; operator: RuleOperator; value: string };

export const trackStatuses = ["Interesting", "Researching", "Contact owner", "Pursuing", "Pass"] as const;
export type TrackStatus = (typeof trackStatuses)[number];
export type Tracking = Record<string, { status: TrackStatus; note: string; updatedAt: string }>;

export type Filters = {
  search: string;
  maxMiles: number;
  minAcres: number;
  maxAcres: number | null;
  maxValue: number | null;
  minScore: number;
  minYearsHeld: number;
  maxWetlandPct: number;
  jurisdictions: string[];
  requiredSignals: SignalId[];
  vacantOnly: boolean;
  hideImproved: boolean;
  showUnavailable: boolean;
  showRelated: boolean;
  tracked: "all" | "tracked" | TrackStatus;
  rules: Rule[];
  sort: "score" | "distance" | "acres" | "held";
};

export const defaultFilters: Filters = {
  search: "",
  maxMiles: 3,
  minAcres: 5,
  maxAcres: null,
  maxValue: null,
  minScore: 0,
  minYearsHeld: 0,
  maxWetlandPct: 60,
  jurisdictions: [],
  requiredSignals: [],
  vacantOnly: false,
  hideImproved: true,
  showUnavailable: false,
  showRelated: false,
  tracked: "all",
  rules: [],
  sort: "score",
};

function fieldValue(parcel: Scored, field: RuleField): string | number {
  if (field === "lastSaleYear") return parcel.lastSaleDate ? Number(parcel.lastSaleDate.slice(0, 4)) : "";
  if (field === "applicationCount") return parcel.applications.length;
  return parcel[field];
}

export function matchesRule(parcel: Scored, rule: Rule) {
  const actual = fieldValue(parcel, rule.field);
  const text = String(actual).toLowerCase();
  const wanted = rule.value.trim().toLowerCase();
  switch (rule.operator) {
    case "is empty":
      return text === "";
    case "is not empty":
      return text !== "";
    case "contains":
      return text.includes(wanted);
    case "does not contain":
      return !text.includes(wanted);
    case "is":
      return text === wanted;
    case "is not":
      return text !== wanted;
    case "greater than":
      return actual !== "" && Number(actual) > Number(wanted);
    case "less than":
      return actual !== "" && Number(actual) < Number(wanted);
  }
}

export function applyFilters(parcels: Scored[], filters: Filters, tracking: Tracking) {
  const search = filters.search.trim().toLowerCase();
  const results = parcels.filter((parcel) => {
    const track = tracking[parcel.id];
    if (filters.tracked === "tracked" && !track) return false;
    if (filters.tracked !== "all" && filters.tracked !== "tracked" && track?.status !== filters.tracked) return false;
    if (!filters.showRelated && isRelatedOwner(parcel)) return false;
    if (!filters.showUnavailable && isUnavailable(parcel)) return false;
    if (parcel.distanceMiles > filters.maxMiles) return false;
    if (parcel.acres < filters.minAcres) return false;
    if (filters.maxAcres !== null && parcel.acres > filters.maxAcres) return false;
    if (filters.maxValue !== null && parcel.justValue > filters.maxValue) return false;
    if (parcel.score < filters.minScore) return false;
    if (parcel.wetlandPct > filters.maxWetlandPct) return false;
    if (filters.vacantOnly && !parcel.vacant) return false;
    if (filters.hideImproved && isImproved(parcel)) return false;
    if (filters.minYearsHeld > 0 && (yearsHeld(parcel) ?? 999) < filters.minYearsHeld) return false;
    if (filters.jurisdictions.length > 0 && !filters.jurisdictions.includes(parcel.jurisdiction)) return false;
    if (filters.requiredSignals.some((id) => !parcel.signals.some((signal) => signal.id === id))) return false;
    if (search && ![parcel.owner, parcel.address, parcel.parcelNumber, parcel.propertyName].some((value) => value.toLowerCase().includes(search))) return false;
    return filters.rules.every((rule) => matchesRule(parcel, rule));
  });

  const held = (parcel: Scored) => yearsHeld(parcel) ?? 100;
  const sorters: Record<Filters["sort"], (a: Scored, b: Scored) => number> = {
    score: (a, b) => b.score - a.score || a.distanceMiles - b.distanceMiles,
    distance: (a, b) => a.distanceMiles - b.distanceMiles,
    acres: (a, b) => b.acres - a.acres,
    held: (a, b) => held(b) - held(a),
  };
  return results.sort(sorters[filters.sort]);
}

export function toCsv(parcels: Scored[], tracking: Tracking) {
  const columns: [string, (parcel: Scored) => string | number][] = [
    ["Score", (p) => p.score],
    ["Parcel number", (p) => p.parcelNumber],
    ["Owner", (p) => p.owner],
    ["Owner mailing address", (p) => [p.ownerAddress, p.ownerCity, p.ownerState, p.ownerZip].filter(Boolean).join(", ")],
    ["Property address", (p) => p.address],
    ["Jurisdiction", (p) => p.jurisdiction],
    ["Acres", (p) => p.acres],
    ["Miles from Crooked Can", (p) => p.distanceMiles],
    ["Zoning", (p) => describeCode(p.zoning, p.zoningName)],
    ["Land-use plan", (p) => describeCode(p.flu, p.fluName)],
    ["Land use", (p) => p.landUse],
    ["Just value", (p) => p.justValue],
    ["Last sale", (p) => [p.lastSaleDate, p.lastSalePrice ? `$${p.lastSalePrice}` : ""].filter(Boolean).join(" ")],
    ["Wetland %", (p) => p.wetlandPct],
    ["Flood %", (p) => p.floodPct],
    ["Why it appeared", (p) => p.signals.filter((s) => s.points > 0).map((s) => s.detail).join(" | ")],
    ["Watch outs", (p) => p.signals.filter((s) => s.points < 0).map((s) => s.detail).join(" | ")],
    ["Status", (p) => tracking[p.id]?.status ?? ""],
    ["Notes", (p) => tracking[p.id]?.note ?? ""],
    ["Property appraiser", (p) => p.link],
  ];
  const escape = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
  return [columns.map(([name]) => escape(name)).join(","), ...parcels.map((parcel) => columns.map(([, get]) => escape(get(parcel))).join(","))].join("\n");
}
