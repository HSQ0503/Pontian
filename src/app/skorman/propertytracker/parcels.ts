export type Source = { label: string; url: string };

export type Decision = {
  id: string;
  government: string;
  caseNumber: string;
  name: string;
  date: string;
  meetings: string[];
  request: string;
  owner: string;
  applicant: string;
  size: string;
  location: string;
  staff: string;
  board: string;
  fromZoning: string;
  toZoning: string;
  reasons: string[];
  parcelKeys: string[];
  parcelNumbers: string[];
  parcelIds: string[];
  point: { lat: number; lng: number } | null;
  distanceMiles: number | null;
  located?: string;
  sources: Source[];
};

export function decisionTitle(decision: Decision) {
  if (decision.name.length >= 8) return decision.name;
  const request = decision.request.replace(/^(Consider|Request)\s+(a\s+)?/i, "");
  return request ? `${request.charAt(0).toUpperCase()}${request.slice(1, 80)}${request.length > 80 ? "…" : ""}` : decision.caseNumber || "Unnamed application";
}

export type Approval = { caseNumber: string; name: string; date: string; fromZoning: string; toZoning: string; lat: number; lng: number };

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
  inStudyArea: boolean;
  jurisdiction: string;
  zoning: string;
  zoningName: string;
  zoningSource: string;
  flu: string;
  fluName: string;
  lastRezoning: { ordinance: string; date: string; change: string } | null;
  annexed: { city: string; ordinance: string; date: string } | null;
  plannedSubdivision: string;
  developmentDistrict: string;
  floodPct: number;
  wetlandPct: number;
  decisionIds: string[];
  rings: number[][][];
};

export type ParcelData = {
  generatedAt: string;
  center: { lat: number; lng: number };
  radiusMiles: number;
  minAcres: number;
  freshness: { countyZoning: string; countyPlan: string; annexations: string; cityZoning: Record<string, string> };
  decisionCoverage: string[];
  decisions: Decision[];
  approvals: Approval[];
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
    "pud-r": null, "pud-c": null, r: "public", u: "public", "c-wetlands": 0, sfl: 1, sfm: 2, sfm3: 2, sfh: 2, mfm: 3, mfh: 3,
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

const unavailableOwner =
  /\b(HOA|HOMEOWNERS|PROPERTY OWNERS|OWNERS ASS|ASSOCIATION|CDD|COMMUNITY DEVELOPMENT|CITY OF|COUNTY|STATE OF|SCHOOL BOARD|WATER MANAGEMENT|WATER AUTHORITY|BOARD OF TRUSTEES|DUKE ENERGY|UNITED STATES|CHURCH|MINISTR|CEMETERY|TRUSTEES OF)\b/;
const unavailableUse = /COMMON ELEMENTS|GOVT|CHURCH|SCHOOL|COLLEGE|HOSPITAL|UTILITY|CEMETER|SUBMERGED|RIGHT OF WAY/;
const farmUse = /PASTURE|TIMBER|GROVE|NURSERY|CROP|CATTLE|POULTRY|HORSE|DAIRY|ORCHARD|AGRICULTUR|ACREAGE/;
const builderOwner =
  /\b(LENNAR|HORTON|PULTE|DEL WEBB|TAYLOR MORRISON|MERITAGE|KB HOME|TOLL BROTHERS|M\/I HOMES|MATTAMY|DREAM FINDERS|CENTEX|DAVID WEEKLEY|ASHTON WOODS|AMH|LANDCO|INVITATION HOMES|PROGRESS RESIDENTIAL|HOMES|BUILDERS|COMMUNITIES|DEVELOPMENT|DEVELOPERS)\b/;

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

export function milesBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = Math.PI / 180;
  const h =
    Math.sin(((b.lat - a.lat) * rad) / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(((b.lng - a.lng) * rad) / 2) ** 2;
  return 3958.8 * 2 * Math.asin(Math.sqrt(h));
}

export const signalCatalog = {
  "rejected-here": "Application rejected or withdrawn here",
  "near-rejected": "Next to a rejected application",
  "plan-allows-much-more": "Plan allows much more than zoning",
  "plan-allows-more": "Plan allows more than zoning",
  "farm-use": "Still in farm or timber use",
  vacant: "Vacant",
  "long-held": "Held 15+ years",
  "no-sale": "No sale on record",
  "out-of-state": "Owner outside Florida",
  "owner-holdings": "Owner holds several nearby parcels",
  close: "Within 3 miles of Crooked Can",
  "approvals-nearby": "Recent approvals nearby",
  "planned-subdivision": "Subdivision already platted",
  "since-subdivided": "Subdivided since the application",
  "green-swamp": "In the Green Swamp critical area",
  "builder-owned": "Owned by a builder or developer",
  "recently-rezoned": "Rezoned in the last 5 years",
  "development-district": "Inside a development district",
  wetlands: "Significant wetlands",
  flood: "Significant flood zone",
  improved: "Already built on",
  "zoning-unverified": "City zoning needs checking",
} as const;

export type SignalId = keyof typeof signalCatalog;
export type Signal = { id: SignalId; detail: string; points: number };

export const opportunitySignals: SignalId[] = [
  "rejected-here",
  "near-rejected",
  "plan-allows-much-more",
  "plan-allows-more",
  "farm-use",
  "vacant",
  "long-held",
  "out-of-state",
  "owner-holdings",
  "close",
  "approvals-nearby",
];

export const activeDevelopmentSignals: SignalId[] = ["planned-subdivision", "since-subdivided", "builder-owned", "recently-rezoned"];

type Context = {
  decisions: Map<string, Decision>;
  rejected: Decision[];
  approvals: Approval[];
  holdings: Map<string, { count: number; acres: number }>;
  freshness: ParcelData["freshness"];
  today: Date;
};

function decisionOutcome(parcel: Parcel, decision: Decision) {
  if (decision.government !== "Lake County" || !decision.fromZoning || parcel.jurisdiction !== "Unincorporated Lake County") return null;
  const now = parcel.zoning.toUpperCase();
  if (decision.toZoning && now === decision.toZoning.toUpperCase() && decision.toZoning !== decision.fromZoning) return "adopted";
  if (now === decision.fromZoning.toUpperCase()) return "unchanged";
  return null;
}

export function outcomeNote(parcel: Parcel, decision: Decision) {
  const outcome = decisionOutcome(parcel, decision);
  if (outcome === "adopted") return `Today's county zoning (${parcel.zoning}) matches the request, so it may have been approved later.`;
  if (outcome === "unchanged") return `Today's county zoning is still ${parcel.zoning}, so the requested change did not go through.`;
  return null;
}

function signalsFor(parcel: Parcel, context: Context): Signal[] {
  const signals: Signal[] = [];
  const add = (id: SignalId, detail: string, points: number) => signals.push({ id, detail, points });

  const own = parcel.decisionIds.map((id) => context.decisions.get(id)).filter((decision): decision is Decision => Boolean(decision));
  for (const decision of own) {
    const outcome = decisionOutcome(parcel, decision);
    const label = `${decision.government}${decision.caseNumber ? ` ${decision.caseNumber}` : ""} (${decision.date.slice(0, 4) || "date unknown"}): ${decision.reasons.join("; ")}.`;
    const soldAfter = decision.date && parcel.lastSaleDate > decision.date;
    if (decision.located?.startsWith("application map")) {
      add("rejected-here", `${label} The original parcel has since been split up.`, 0);
      add("since-subdivided", "The land named in the application has been subdivided since, so it was probably developed later.", -20);
    } else if (outcome === "adopted") {
      add("rejected-here", `${label} Current zoning now matches the request, so it may have been approved later.`, 8);
    } else if (soldAfter) {
      add("rejected-here", `${label} Sold on ${parcel.lastSaleDate}, after this application, so the new owner may already have plans.`, 16);
    } else if (decision.government === "Lake County" && parcel.annexed?.date && decision.date && parcel.annexed.date > decision.date) {
      add("rejected-here", `${label} Annexed into ${parcel.annexed.city} on ${parcel.annexed.date}, after the county case, so the city may have approved something since.`, 16);
    } else {
      add("rejected-here", `${label}${outcome === "unchanged" ? " Zoning is unchanged today, so the request did not go through." : ""}`, outcome === "unchanged" ? 40 : 32);
    }
    break;
  }

  if (own.length === 0) {
    const nearest = context.rejected
      .filter((decision) => decision.point)
      .map((decision) => ({ decision, miles: milesBetween(parcel, decision.point!) }))
      .filter((item) => item.miles <= 0.5)
      .sort((a, b) => a.miles - b.miles)[0];
    if (nearest) add("near-rejected", `${nearest.miles.toFixed(2)} mi from ${nearest.decision.name || nearest.decision.caseNumber} (${nearest.decision.reasons[0]?.toLowerCase()}).`, 8);
  }

  const zoning = zoningLevel(parcel);
  const plan = planLevel(parcel);
  if (typeof zoning === "number" && typeof plan === "number" && plan > zoning) {
    const detail = `Zoned ${intensityLabels[zoning].toLowerCase()} (${parcel.zoning}), but the land-use plan shows ${intensityLabels[plan].toLowerCase()} (${parcel.fluName || parcel.flu}).`;
    if (plan - zoning >= 2) add("plan-allows-much-more", detail, 25);
    else add("plan-allows-more", detail, 10);
  }

  if (farmUse.test(parcel.landUse.toUpperCase())) add("farm-use", `Classified today as ${parcel.landUse.toLowerCase()}.`, 8);
  if (parcel.vacant) add("vacant", "The property appraiser lists it as vacant.", 6);

  const held = yearsHeld(parcel, context.today);
  if (held === null) add("no-sale", "No sale date in the property appraiser record.", 4);
  else if (held >= 15) add("long-held", `Last sold in ${parcel.lastSaleDate.slice(0, 4)} (${held} years ago).`, held >= 25 ? 12 : 8);

  if (parcel.ownerState && parcel.ownerState !== "FL") add("out-of-state", `Owner mailing address in ${parcel.ownerState}.`, 4);

  const owned = context.holdings.get(parcel.owner);
  if (owned && owned.count >= 2 && !isUnavailable(parcel)) {
    add("owner-holdings", `This owner holds ${owned.count} parcels in the area (${Math.round(owned.acres)} acres total).`, 4);
  }

  if (parcel.distanceMiles <= 3) add("close", `${parcel.distanceMiles.toFixed(1)} miles from Crooked Can.`, parcel.distanceMiles <= 1 ? 16 : parcel.distanceMiles <= 2 ? 12 : 8);

  const fiveYearsAgo = new Date(context.today.getFullYear() - 5, context.today.getMonth(), 1).toISOString().slice(0, 10);
  const approvals = context.approvals.filter((approval) => approval.date >= fiveYearsAgo && milesBetween(parcel, approval) <= 1);
  if (approvals.length > 0) add("approvals-nearby", `${approvals.length} county rezoning or land-use approvals within a mile since ${fiveYearsAgo.slice(0, 4)}.`, 4);

  if (parcel.plannedSubdivision) add("planned-subdivision", `A subdivision is already platted here: ${parcel.plannedSubdivision.toLowerCase()}.`, -30);
  if (builderOwner.test(parcel.owner.toUpperCase()) && !isRelatedOwner(parcel)) add("builder-owned", `Owner name suggests a homebuilder or developer: ${parcel.owner}.`, -20);
  if (parcel.lastRezoning?.date && parcel.lastRezoning.date >= fiveYearsAgo) {
    add("recently-rezoned", `Rezoned ${parcel.lastRezoning.change || ""} by ordinance ${parcel.lastRezoning.ordinance} (${parcel.lastRezoning.date}).`, -15);
  }
  if (parcel.developmentDistrict) add("development-district", `Inside the ${parcel.developmentDistrict.toLowerCase()} community development district.`, -8);

  if (/green swamp/i.test(parcel.fluName)) {
    add("green-swamp", "The land-use plan places it in the Green Swamp Area of Critical State Concern, where the state oversees development and densities are very low.", -15);
  }
  if (parcel.wetlandPct >= 30) add("wetlands", `About ${parcel.wetlandPct}% of the parcel is mapped wetland.`, parcel.wetlandPct >= 60 ? -25 : -12);
  if (parcel.floodPct >= 30) add("flood", `About ${parcel.floodPct}% is in a FEMA flood zone.`, -8);
  if (isImproved(parcel)) add("improved", `Buildings valued at $${parcel.buildingValue.toLocaleString()}.`, -15);

  if (parcel.jurisdiction !== "Unincorporated Lake County") {
    const uploaded = context.freshness.cityZoning[parcel.jurisdiction];
    const annexedLater = parcel.annexed?.date && uploaded && parcel.annexed.date > uploaded;
    if (annexedLater) add("zoning-unverified", `Annexed into ${parcel.annexed!.city} on ${parcel.annexed!.date} (ordinance ${parcel.annexed!.ordinance}), after the city's zoning map in the county GIS was last updated (${uploaded}). Get current zoning from the city.`, 0);
    else if (!parcel.zoning) add("zoning-unverified", `${parcel.jurisdiction} zoning for this parcel is not in the county GIS. Get it from the city.`, 0);
    else if (!uploaded || uploaded < "2023-01-01") add("zoning-unverified", `${parcel.jurisdiction} zoning comes from a city map ${uploaded ? `uploaded ${uploaded}` : "with no upload date"}. Confirm with the city before relying on it.`, 0);
  }

  return signals;
}

export function scoreOf(signals: Signal[]) {
  const total = signals.reduce((sum, signal) => sum + signal.points, 0);
  return Math.max(0, Math.min(100, total));
}

export function matchLabel(score: number) {
  if (score >= 60) return "Strong match";
  if (score >= 40) return "Worth a look";
  if (score >= 20) return "Possible";
  return "Weak match";
}

export type Scored = Parcel & { signals: Signal[]; score: number; zoningLevel: Level; planLevel: Level; decisions: Decision[] };

export function scoreParcels(data: ParcelData, today = new Date()): Scored[] {
  const holdings = new Map<string, { count: number; acres: number }>();
  for (const parcel of data.parcels) {
    if (!parcel.inStudyArea) continue;
    const current = holdings.get(parcel.owner) ?? { count: 0, acres: 0 };
    holdings.set(parcel.owner, { count: current.count + 1, acres: current.acres + parcel.acres });
  }
  const context: Context = {
    decisions: new Map(data.decisions.map((decision) => [decision.id, decision])),
    rejected: data.decisions.filter((decision) => !decision.located?.startsWith("application map")),
    approvals: data.approvals,
    holdings,
    freshness: data.freshness,
    today,
  };
  return data.parcels
    .filter((parcel) => parcel.inStudyArea || parcel.decisionIds.length > 0)
    .map((parcel) => {
      const signals = signalsFor(parcel, context);
      return {
        ...parcel,
        signals,
        score: scoreOf(signals),
        zoningLevel: zoningLevel(parcel),
        planLevel: planLevel(parcel),
        decisions: parcel.decisionIds.map((id) => context.decisions.get(id)).filter((decision): decision is Decision => Boolean(decision)),
      };
    });
}

export const hasSignal = (parcel: Scored, id: SignalId) => parcel.signals.some((signal) => signal.id === id);
export const isActiveDevelopment = (parcel: Scored) => activeDevelopmentSignals.some((id) => hasSignal(parcel, id));

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
  justValue: { label: "Assessed value ($)", kind: "number" },
  landValue: { label: "Land value ($)", kind: "number" },
  buildingValue: { label: "Building value ($)", kind: "number" },
  lastSalePrice: { label: "Last sale price ($)", kind: "number" },
  lastSaleYear: { label: "Last sale year", kind: "number" },
  distanceMiles: { label: "Miles from Crooked Can", kind: "number" },
  wetlandPct: { label: "Wetland %", kind: "number" },
  floodPct: { label: "Flood zone %", kind: "number" },
  decisionCount: { label: "Rejected applications on parcel", kind: "number" },
  score: { label: "Score", kind: "number" },
} as const;

export type RuleField = keyof typeof ruleFields;
export const ruleOperators = ["contains", "does not contain", "is", "is not", "greater than", "less than", "is empty", "is not empty"] as const;
export type RuleOperator = (typeof ruleOperators)[number];
export type Rule = { id: string; field: RuleField; operator: RuleOperator; value: string };

export const trackStatuses = ["Interesting", "Researching", "Contact owner", "Pursuing", "Pass"] as const;
export type TrackStatus = (typeof trackStatuses)[number];

export const statusChoice: Record<TrackStatus, { label: string; hint: string }> = {
  Interesting: { label: "Saved", hint: "Keep it on your list" },
  Researching: { label: "Looking into it", hint: "You want more information" },
  "Contact owner": { label: "Call the owner", hint: "Ready to reach out" },
  Pursuing: { label: "Working on it", hint: "A deal is in progress" },
  Pass: { label: "Skip", hint: "Not a fit" },
};
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
  rejectedOnly: boolean;
  vacantOnly: boolean;
  hideImproved: boolean;
  hideActiveDevelopment: boolean;
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
  rejectedOnly: false,
  vacantOnly: false,
  hideImproved: true,
  hideActiveDevelopment: true,
  showUnavailable: false,
  showRelated: false,
  tracked: "all",
  rules: [],
  sort: "score",
};

function fieldValue(parcel: Scored, field: RuleField): string | number {
  if (field === "lastSaleYear") return parcel.lastSaleDate ? Number(parcel.lastSaleDate.slice(0, 4)) : "";
  if (field === "decisionCount") return parcel.decisions.length;
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
    const rejected = hasSignal(parcel, "rejected-here");
    if (filters.tracked === "tracked" && !track) return false;
    if (filters.tracked !== "all" && filters.tracked !== "tracked" && track?.status !== filters.tracked) return false;
    if (filters.rejectedOnly && !rejected) return false;
    if (!filters.showRelated && isRelatedOwner(parcel)) return false;
    if (!filters.showUnavailable && isUnavailable(parcel)) return false;
    if (filters.hideActiveDevelopment && isActiveDevelopment(parcel)) return false;
    if (!rejected) {
      if (!parcel.inStudyArea) return false;
      if (parcel.distanceMiles > filters.maxMiles) return false;
      if (parcel.acres < filters.minAcres) return false;
    }
    if (filters.maxAcres !== null && parcel.acres > filters.maxAcres) return false;
    if (filters.maxValue !== null && parcel.justValue > filters.maxValue) return false;
    if (parcel.score < filters.minScore) return false;
    if (parcel.wetlandPct > filters.maxWetlandPct) return false;
    if (filters.vacantOnly && !parcel.vacant) return false;
    if (filters.hideImproved && isImproved(parcel)) return false;
    if (filters.minYearsHeld > 0 && (yearsHeld(parcel) ?? 999) < filters.minYearsHeld) return false;
    if (filters.jurisdictions.length > 0 && !filters.jurisdictions.includes(parcel.jurisdiction)) return false;
    if (filters.requiredSignals.some((id) => !hasSignal(parcel, id))) return false;
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
    ["Alternate key", (p) => p.id],
    ["Owner", (p) => p.owner],
    ["Owner mailing address", (p) => [p.ownerAddress, p.ownerCity, p.ownerState, p.ownerZip].filter(Boolean).join(", ")],
    ["Property address", (p) => p.address],
    ["Jurisdiction", (p) => p.jurisdiction],
    ["Acres", (p) => p.acres],
    ["Miles from Crooked Can", (p) => p.distanceMiles],
    ["Zoning", (p) => describeCode(p.zoning, p.zoningName)],
    ["Zoning source", (p) => p.zoningSource],
    ["Land-use plan", (p) => describeCode(p.flu, p.fluName)],
    ["Land use", (p) => p.landUse],
    ["Assessed value", (p) => p.justValue],
    ["Last sale", (p) => [p.lastSaleDate, p.lastSalePrice ? `$${p.lastSalePrice}` : ""].filter(Boolean).join(" ")],
    ["Wetland %", (p) => p.wetlandPct],
    ["Flood %", (p) => p.floodPct],
    ["Rejected applications", (p) => p.decisions.map((d) => `${d.government} ${d.caseNumber} ${d.name} (${d.date}): ${d.reasons.join("; ")}`).join(" | ")],
    ["Why it appeared", (p) => p.signals.filter((s) => s.points > 0).map((s) => s.detail).join(" | ")],
    ["Watch outs", (p) => p.signals.filter((s) => s.points <= 0).map((s) => s.detail).join(" | ")],
    ["Status", (p) => tracking[p.id]?.status ?? ""],
    ["Notes", (p) => tracking[p.id]?.note ?? ""],
    ["Property appraiser", (p) => p.link],
  ];
  const escape = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
  return [columns.map(([name]) => escape(name)).join(","), ...parcels.map((parcel) => columns.map(([, get]) => escape(get(parcel))).join(","))].join("\n");
}
