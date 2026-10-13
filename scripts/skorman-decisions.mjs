// Builds public/skorman/decisions.json: land-use cases near Hills City Center that were denied,
// withdrawn, recommended for denial, or cancelled, from official government records.
// Run with: npm run skorman:decisions (needs `pdftotext` from poppler for older PDFs).
import { execFile } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const CACHE = new URL("./.cache/skorman/", import.meta.url);
const HEADERS = { "User-Agent": "Mozilla/5.0 (Pontian research)" };
const CENTER = { lng: -81.72145, lat: 28.60651 };
const RADIUS_METERS = 16000;
const LAKE_COUNTY_SINCE = "2021-10-01";
const CLERMONT_SINCE = "2021-01-01";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

async function getJson(url) {
  const response = await fetch(url, { headers: HEADERS });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json();
}

async function civicEvents(tenant, filter) {
  let url = `https://${tenant}.api.civicclerk.com/v1/Events?${new URLSearchParams({ $filter: filter, $orderby: "startDateTime asc" })}`;
  const events = [];
  while (url) {
    const data = await getJson(url);
    events.push(...data.value);
    url = data["@odata.nextLink"];
    await sleep(300);
  }
  return events;
}

const fileUrl = (tenant, fileId) => `https://${tenant}.api.civicclerk.com/v1/Meetings/GetMeetingFileStream(fileId=${fileId},plainText=false)`;

// CivicClerk serves plain text for newer documents only, so older ones go through pdftotext.
async function fileText(tenant, fileId) {
  const cached = new URL(`${tenant}-${fileId}.txt`, CACHE);
  try {
    return await readFile(cached, "utf8");
  } catch {}
  let text = "";
  const plain = await fetch(fileUrl(tenant, fileId).replace("plainText=false", "plainText=true"), { headers: HEADERS });
  if (plain.ok) text = await plain.text();
  await sleep(500);
  if (text.trim().length < 2000) {
    const pdfPath = join(tmpdir(), `${tenant}-${fileId}.pdf`);
    const pdf = await fetch(fileUrl(tenant, fileId), { headers: HEADERS });
    if (!pdf.ok) throw new Error(`${pdf.status} downloading ${tenant} file ${fileId}`);
    await writeFile(pdfPath, Buffer.from(await pdf.arrayBuffer()));
    try {
      ({ stdout: text } = await run("pdftotext", ["-layout", pdfPath, "-"], { maxBuffer: 512 * 1024 * 1024 }));
    } finally {
      await rm(pdfPath, { force: true });
    }
    await sleep(500);
  }
  await writeFile(cached, text);
  return text;
}

// Lake County staff reports list fields as "Label:   value" with indented continuation lines.
const REPORT_LABELS = new Map([
  ["tab number", "tab"],
  ["public hearings", "hearings"],
  ["case no. and project name", "case"],
  ["applicant(s)", "applicant"],
  ["owner(s)", "owner"],
  ["requested action", "request"],
  ["staff determination", "staff"],
  ["pzb recommendation", "board"],
  ["size", "size"],
  ["location", "location"],
  ["alternate key no.", "keys"],
  ["alternate key nos.", "keys"],
  ["alternate key number", "keys"],
  ["alternate key numbers", "keys"],
  ["future land use", "flu"],
  ["current zoning district", "currentZoning"],
  ["proposed zoning district", "proposedZoning"],
]);
const LABEL_LINE = /^\s{0,6}([A-Za-z][A-Za-z/().' ]{2,40}?)\s*:\s*(.*)$/;

function readReport(lines, start) {
  const fields = {};
  let current = null;
  for (let i = Math.max(0, start - 8); i < Math.min(lines.length, start + 45); i++) {
    const line = lines[i];
    if (/Page \d+ of \d+/.test(line)) {
      if (i > start) break;
      continue;
    }
    if (/Subject Property Information|Adjacent Property/i.test(line)) {
      current = null;
      continue;
    }
    const match = line.match(LABEL_LINE);
    const key = match && REPORT_LABELS.get(match[1].trim().toLowerCase());
    if (key) {
      current = key;
      fields[key] = clean(match[2]);
    } else if (match) {
      current = null;
    } else if (current && /^\s{12,}\S/.test(line)) {
      fields[current] = clean(`${fields[current]} ${line}`);
    } else if (current && line.trim() === "") {
      current = null;
    }
  }
  return fields;
}

const CASE_NUMBER = /\b(PZ\d{4}-\d{1,4}|(?:FLU|RZ|CUP|CP|VAR|MCUP|MSP|LPA|CD)-\d{2}-\d{1,3}(?:-\d)?)\b/i;
const zoningCode = (text) => [...String(text).matchAll(/\(([A-Z0-9-]{1,6})\)/g)].map((m) => m[1]).at(-1) ?? "";

function lakeCountyCases(text, event, packetId) {
  const lines = text.split(/\r?\n/);
  const markers = new Map();
  for (const line of lines) {
    const tab = line.match(/^\s*Tab\s+(\d+)\s+(.+)$/);
    if (tab && /\b(WITHDRAWN|CONTINUED|POSTPONED|DEFERRED|TABLED)\b/i.test(tab[2])) {
      markers.set(tab[1], { status: tab[2].match(/\b(WITHDRAWN|CONTINUED|POSTPONED|DEFERRED|TABLED)\b/i)[1].toUpperCase(), title: clean(tab[2]) });
    }
  }
  const cases = [];
  lines.forEach((line, index) => {
    if (!/Case No\. and Project Name:/i.test(line)) return;
    const fields = readReport(lines, index);
    const caseText = fields.case ?? "";
    const number = caseText.match(CASE_NUMBER)?.[1]?.toUpperCase() ?? "";
    const name = clean(caseText.replace(CASE_NUMBER, "").replace(/^[,\s]+|[,\s]+$/g, "")).slice(0, 90);
    let keys = [...(fields.keys ?? "").matchAll(/\b\d{7}\b/g)].map((m) => m[0]);
    if (keys.length === 0) {
      const after = lines.slice(index, index + 140).join(" ");
      const found = after.match(/Alternate Key (?:Numbers?|Nos?\.?|#)?\s*([\d ,and&]{6,})/i);
      keys = found ? [...found[1].matchAll(/\b\d{7}\b/g)].map((m) => m[0]) : [];
    }
    const marker = fields.tab ? markers.get(fields.tab) : undefined;
    cases.push({
      number,
      name,
      date: event.startDateTime.slice(0, 10),
      tab: fields.tab ?? "",
      hearings: fields.hearings ?? "",
      applicant: fields.applicant ?? "",
      owner: fields.owner ?? "",
      request: fields.request ?? "",
      staff: fields.staff ?? "",
      board: fields.board ?? "",
      size: fields.size ?? "",
      location: fields.location ?? "",
      flu: fields.flu ?? "",
      currentZoning: fields.currentZoning ?? "",
      proposedZoning: fields.proposedZoning ?? "",
      keys: [...new Set(keys)],
      marker: marker?.status ?? (/\*+\s*(WITHDRAWN|CONTINUED)/i.exec(fields.hearings ?? "")?.[1]?.toUpperCase() || ""),
      source: { label: `Lake County BCC zoning packet, ${event.startDateTime.slice(0, 10)}`, url: fileUrl("lakecountyfl", packetId) },
    });
  });
  return cases;
}

function classifyLakeCounty(record) {
  const reasons = [];
  if (record.markers.includes("WITHDRAWN")) reasons.push("Withdrawn before a final vote");
  if (/den(y|ied|ial)|failed/i.test(record.board)) reasons.push(`Planning & Zoning Board: ${record.board}`);
  if (/(?<!consistent\/)\binconsistent\b|not consistent|recommends? denial/i.test(record.staff)) reasons.push(`County staff: ${record.staff}`);
  const continued = record.markers.filter((marker) => marker !== "WITHDRAWN").length;
  if (reasons.length > 0 && continued >= 2) reasons.push(`Continued ${continued} times`);
  return reasons;
}

async function lakeCounty() {
  console.log("Lake County: listing zoning meetings…");
  const events = await civicEvents(
    "lakecountyfl",
    `categoryName eq 'Board of County Commissioners' and startDateTime ge ${LAKE_COUNTY_SINCE}T00:00:00Z and startDateTime lt ${new Date().toISOString().slice(0, 10)}T00:00:00Z`,
  );
  const zoning = events.filter((event) => /zoning/i.test(event.eventName) && event.publishedFiles?.some((file) => file.type === "Agenda Packet"));
  console.log(`  ${zoning.length} zoning packets since ${LAKE_COUNTY_SINCE}`);
  const byCase = new Map();
  for (const [index, event] of zoning.entries()) {
    const packet = event.publishedFiles.find((file) => file.type === "Agenda Packet");
    process.stdout.write(`  ${index + 1}/${zoning.length} ${event.startDateTime.slice(0, 10)}\r`);
    let text;
    try {
      text = await fileText("lakecountyfl", packet.fileId);
    } catch (error) {
      console.warn(`\n  skipped ${event.startDateTime.slice(0, 10)}: ${error.message}`);
      continue;
    }
    for (const found of lakeCountyCases(text, event, packet.fileId)) {
      const key = found.number || found.name.toLowerCase();
      const record = byCase.get(key) ?? { ...found, meetings: [], markers: [], keys: [] };
      record.meetings.push(found.date);
      if (found.marker) record.markers.push(found.marker);
      record.keys = [...new Set([...record.keys, ...found.keys])];
      for (const field of ["name", "applicant", "owner", "request", "staff", "board", "size", "location", "flu", "currentZoning", "proposedZoning", "hearings"]) {
        if (found[field]) record[field] = found[field];
      }
      record.date = found.date;
      record.source = found.source;
      byCase.set(key, record);
    }
  }
  console.log(`\n  ${byCase.size} unique cases`);
  return [...byCase.values()].map((record) => ({
    id: `lake-${record.number || record.name}`,
    government: "Lake County",
    caseNumber: record.number,
    name: record.name,
    date: record.date,
    meetings: record.meetings,
    request: record.request,
    owner: record.owner,
    applicant: record.applicant,
    size: record.size,
    location: record.location,
    staff: record.staff,
    board: record.board,
    fromZoning: zoningCode(record.currentZoning),
    toZoning: zoningCode(record.proposedZoning),
    reasons: classifyLakeCounty(record),
    parcelKeys: record.keys,
    parcelNumbers: [],
    point: null,
    sources: [record.source],
  }));
}

const CLERMONT_OUTCOME = /\b(APPROVED[^\n]*|DENIED[^\n]*|NO ACTION TAKEN[^\n]*|WITHDRAWN[^\n]*|TABLED[^\n]*|CONTINUED[^\n]*|POSTPONED[^\n]*|FAILED[^\n]*)\s*$/;
const LAND_USE = /rezon|land use|conditional use|\bCUP\b|annex|planned unit|\bPUD\b|variance|comprehensive plan|\bCPA\b|site plan|subdivision|development agreement/i;

function clermontItems(text) {
  const chunks = text.split(/\r?\n\s*Item No\.\s*\d+\s*[-–]\s*/).slice(1);
  return chunks.map((chunk) => {
    const lines = chunk.split(/\r?\n/);
    const left = lines
      .slice(0, 4)
      .map((line) => line.split(/\s{3,}/)[0].trim())
      .filter((part) => part && !/^(Consider|Request)/.test(part));
    const outcomeLine = lines.map((line) => line.trim()).filter((line) => CLERMONT_OUTCOME.test(line)).at(-1) ?? "";
    const vote = chunk.match(/\b(?:YES|AYES)\s*:?\s*(\d+)\s*,?\s*(?:NO|NAYS)\s*:?\s*(\d+)/i) ?? chunk.match(/\bVOTE:\s*(\d+)\s*\/\s*(\d+)/i);
    return {
      title: clean(left.join(" ")),
      text: clean(chunk),
      outcome: clean(outcomeLine),
      vote: vote ? `${vote[1]}-${vote[2]}` : "",
    };
  });
}

function normalizeOutcome(outcome) {
  if (/DENIED/i.test(outcome)) return "Denied";
  if (/FAILED/i.test(outcome)) return "Motion to approve failed";
  if (/WITHDRAWN/i.test(outcome)) return "Withdrawn";
  if (/NO ACTION/i.test(outcome)) return "No action taken";
  if (/APPROVED/i.test(outcome)) return "Approved";
  return clean(outcome);
}

const itemKey = (title) =>
  title.match(/(Ordinance|Resolution) No\.?\s*([\d-]+R?)/i)?.[2] ??
  title.replace(/(Ordinance|Resolution) No\.?\s*[\d-]+R?|\b(Final|Introduction|Intro|Withdrawn)\b/gi, "").replace(/\W+/g, " ").trim().toLowerCase();

function keysNear(packet, title) {
  const name = title
    .replace(/(Ordinance|Resolution) No\.?\s*[\d-]+R?/gi, "")
    .replace(/\b(Final|Introduction|Quasi-Judicial|Public Hearing)\b/gi, "")
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .join(" ");
  if (name.length < 6) return { keys: [], numbers: [] };
  const pattern = new RegExp(name.split(" ").join("[\\s\\S]{0,12}"), "gi");
  for (const match of packet.matchAll(pattern)) {
    const window = packet.slice(match.index, match.index + 30000);
    const keys = [...window.matchAll(/Alternate Keys?(?: No\.?| Numbers?| #)?\s*:?\s*((?:\d{7}[\s,and&]*)+)/gi)].flatMap((m) => [...m[1].matchAll(/\b\d{7}\b/g)].map((k) => k[0]));
    const numbers = [
      ...[...window.matchAll(/\b(\d{2})-(\d{2})-(\d{2})-(\d{4})-([0-9A-Z]{3})-([0-9A-Z]{5})\b/g)].map((m) => m.slice(1).join("")),
      ...[...window.matchAll(/\b\d{6}[0-9A-Z]{12}\b/g)].map((m) => m[0]),
    ];
    if (keys.length || numbers.length) return { keys: [...new Set(keys)], numbers: [...new Set(numbers)] };
  }
  return { keys: [], numbers: [] };
}

async function clermont() {
  console.log("Clermont: listing council meetings…");
  const events = await civicEvents(
    "clermontfl",
    `startDateTime ge ${CLERMONT_SINCE}T00:00:00Z and startDateTime lt ${new Date().toISOString().slice(0, 10)}T00:00:00Z`,
  );
  const withSummary = events.filter((event) => event.publishedFiles?.some((file) => file.type === "Summary of Actions"));
  console.log(`  ${withSummary.length} meetings with a Summary of Actions`);
  const items = [];
  for (const [index, event] of withSummary.entries()) {
    process.stdout.write(`  ${index + 1}/${withSummary.length} ${event.startDateTime.slice(0, 10)}\r`);
    const summary = event.publishedFiles.find((file) => file.type === "Summary of Actions");
    try {
      const text = await fileText("clermontfl", summary.fileId);
      for (const item of clermontItems(text)) {
        if (LAND_USE.test(item.text) && !/^Variance/i.test(item.title) && item.outcome) items.push({ ...item, event, summary });
      }
    } catch (error) {
      console.warn(`\n  skipped ${event.startDateTime.slice(0, 10)}: ${error.message}`);
    }
  }

  const approvedLater = new Map();
  for (const item of items) {
    if (normalizeOutcome(item.outcome) === "Approved") approvedLater.set(itemKey(item.title), item.event.startDateTime.slice(0, 10));
  }

  const decisions = [];
  for (const item of items.filter((candidate) => /DENIED|WITHDRAWN|FAILED|NO ACTION/i.test(candidate.outcome))) {
    const { event, summary } = item;
    const date = event.startDateTime.slice(0, 10);
    const laterApproval = approvedLater.get(itemKey(item.title));
    if (laterApproval && laterApproval > date) {
      console.log(`\n  ${item.title} (${date}) was approved later on ${laterApproval}; not counted as rejected`);
      continue;
    }
    const packetFile = event.publishedFiles.find((file) => file.type === "Agenda Packet");
    const packet = packetFile ? await fileText("clermontfl", packetFile.fileId).catch(() => "") : "";
    const { keys, numbers } = keysNear(packet, item.title);
    const caseNumber = item.title.match(/(Ordinance|Resolution) No\.?\s*[\d-]+R?/i)?.[0] ?? "";
    const request = item.text.match(/(Consider|Request)[\s\S]*$/i)?.[0] ?? item.text;
    decisions.push({
        id: `clermont-${date}-${item.title}`,
        government: "City of Clermont",
        caseNumber,
        name: clean(item.title.replace(caseNumber, "").replace(/\b(Final|Introduction|Intro)\b|-\s*Withdrawn/gi, "")),
        date,
        meetings: [date],
        request: clean(request.replace(item.outcome, "").replace(/(YES|AYES)\s*:?\s*\d+[\s\S]*$/i, "")).slice(0, 400),
        owner: "",
        applicant: "",
        size: item.text.match(/\(?(\d+(?:\.\d+)?)\)?\s*\+?\/?-?\s*acres/i)?.[1] ? `${item.text.match(/\(?(\d+(?:\.\d+)?)\)?\s*\+?\/?-?\s*acres/i)[1]} acres` : "",
        location: item.text.match(/located (?:at|on|north|south|east|west)[^.]{0,160}/i)?.[0] ?? "",
        staff: "",
        board: "",
        fromZoning: "",
        toZoning: "",
        reasons: [`Clermont City Council: ${normalizeOutcome(item.outcome).toLowerCase()}${item.vote ? ` (vote ${item.vote})` : ""}`],
        parcelKeys: keys,
        parcelNumbers: numbers,
        point: null,
        sources: [
          { label: `Clermont City Council summary of actions, ${event.startDateTime.slice(0, 10)}`, url: fileUrl("clermontfl", summary.fileId) },
          ...(packetFile ? [{ label: "Meeting packet", url: fileUrl("clermontfl", packetFile.fileId) }] : []),
        ],
      });
  }
  console.log(`\n  ${decisions.length} denied or withdrawn land-use items`);
  return decisions;
}

async function lakeCountySnapshot() {
  console.log("Lake County development applications (2018–2021 snapshot)…");
  const url = "https://gis.lakecountyfl.gov/lakegis/rest/services/Planning/CD_Plus_AppRequets/MapServer/0/query";
  const rows = [];
  for (let offset = 0; ; offset += 400) {
    const response = await fetch(url, {
      method: "POST",
      headers: { ...HEADERS, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        f: "json",
        where: "AppStatus IN ('DENIAL','CANCEL')",
        outFields: "AlternateKey,FolioNumber,ProjectName,ApplicantionCode,AppStatus,OpenDate,AppRequestDescription,Change,ACRES,ParcelAddress",
        returnGeometry: "true",
        outSR: "4326",
        maxAllowableOffset: "0.0001",
        geometry: `${CENTER.lng},${CENTER.lat}`,
        geometryType: "esriGeometryPoint",
        inSR: "4326",
        distance: String(RADIUS_METERS),
        units: "esriSRUnit_Meter",
        spatialRel: "esriSpatialRelIntersects",
        resultOffset: String(offset),
        resultRecordCount: "400",
      }),
    });
    const data = await response.json();
    if (data.error) throw new Error(JSON.stringify(data.error));
    rows.push(
      ...data.features.map((feature) => {
        const ring = feature.geometry?.rings?.[0];
        const point = ring?.length
          ? { lat: ring.reduce((sum, p) => sum + p[1], 0) / ring.length, lng: ring.reduce((sum, p) => sum + p[0], 0) / ring.length }
          : null;
        return { ...feature.attributes, point };
      }),
    );
    if (!data.exceededTransferLimit) break;
    await sleep(300);
  }
  const landUse = new Set(["REZONING", "PRE-PLAT", "CMP PLN AM", "CUP", "MCUP", "DEV AGR", "MASTERPARK"]);
  const development = /lots|units|subdivision|apartment|commercial|warehouse|retail|industrial|\bPUD\b/i;
  const unique = new Map();
  for (const row of rows) {
    const type = clean(row.ApplicantionCode);
    const description = `${clean(row.AppRequestDescription)} ${clean(row.Change)}`;
    if (!landUse.has(type) && !(["SITE PLAN", "PRE-SUB"].includes(type) && development.test(description))) continue;
    const key = [row.ApplicantionCode, row.AppStatus, row.ProjectName, row.AppRequestDescription, row.FolioNumber].join("|");
    if (!unique.has(key) || (!unique.get(key).OpenDate && row.OpenDate)) unique.set(key, row);
  }
  console.log(`  ${unique.size} denied or cancelled applications`);
  return [...unique.values()].map((row) => {
    const date = row.OpenDate ? new Date(row.OpenDate).toISOString().slice(0, 10) : "";
    const denied = row.AppStatus === "DENIAL";
    return {
      id: `lake-app-${row.ApplicantionCode}-${row.ProjectName}-${row.FolioNumber}`,
      government: "Lake County",
      caseNumber: clean(row.ApplicantionCode),
      name: clean(row.ProjectName),
      date,
      meetings: [],
      request: clean(row.AppRequestDescription) || clean(row.Change),
      owner: "",
      applicant: "",
      size: row.ACRES ? `${row.ACRES} acres` : "",
      location: clean(row.ParcelAddress),
      staff: "",
      board: "",
      fromZoning: "",
      toZoning: "",
      reasons: [`County application ${denied ? "denied" : "cancelled"}${date ? ` (${date.slice(0, 4)})` : ""}`],
      parcelKeys: [clean(row.AlternateKey)].filter(Boolean),
      parcelNumbers: [clean(row.FolioNumber)].filter(Boolean),
      point: row.point ? { lat: Math.round(row.point.lat * 1e6) / 1e6, lng: Math.round(row.point.lng * 1e6) / 1e6 } : null,
      sources: [{ label: "Lake County development applications layer (2018–2021)", url: "https://gis.lakecountyfl.gov/lakegis/rest/services/Planning/CD_Plus_AppRequets/MapServer/0" }],
    };
  });
}

// Minneola's older records are PDFs on its website without an index API, and its board rarely
// denies requests, so verified Minneola decisions are listed here with their sources.
const minneola = [
  {
    id: "minneola-resolution-2025-17",
    government: "City of Minneola",
    caseNumber: "Resolution 2025-17",
    name: "Convenience store with fuel (special exception)",
    date: "2025-09-08",
    meetings: ["2025-08-04", "2025-09-08", "2025-10-07", "2026-05-05"],
    request: "Special exception for a convenience store with fuel operations on B-1 land.",
    owner: "JEN FLORIDA 30 LLC (parcel owner per property appraiser)",
    applicant: "Jonathan Huels",
    size: "",
    location: "Northeast corner of N Hancock Rd and CR 561A",
    staff: "Conditional approval",
    board: "Recommended denial 4-0 on September 8, 2025, after an August 4 motion to approve died without a second",
    fromZoning: "B-1",
    toZoning: "B-1",
    reasons: [
      "Planning & Zoning Commission recommended denial 4-0",
      "City Council tabled it in October 2025; a revised version returned in May 2026 after mediation",
    ],
    parcelKeys: ["3938432"],
    parcelNumbers: [],
    point: { lat: 28.6209, lng: -81.724 },
    sources: [
      { label: "Minneola City Council agenda, October 7, 2025", url: "https://www.minneola.us/sites/g/files/vyhlif4716/f/agendas/october_7_2025_city_council_meeting_agenda_2.pdf" },
      { label: "Minneola City Council agenda, May 5, 2026", url: "https://www.minneola.us/sites/g/files/vyhlif4716/f/agendas/may_5_2026_city_council_meeting_agenda_3_0.pdf" },
      { label: "Summary of the September 8, 2025 minutes (Zoning Signal)", url: "https://zoningsignal.com/meetings/minneola-pz-2025-09" },
    ],
  },
];

async function main() {
  await mkdir(CACHE, { recursive: true });
  const lake = await lakeCounty();
  const snapshot = await lakeCountySnapshot();
  let city = [];
  try {
    await run("pdftotext", ["-v"]);
    city = await clermont();
  } catch (error) {
    console.warn(`Skipping Clermont: ${error.message}`);
  }
  const lakeRejected = lake.filter((decision) => decision.reasons.length > 0);
  const all = [...lakeRejected, ...snapshot, ...city, ...minneola];
  const output = {
    generatedAt: new Date().toISOString(),
    coverage: [
      `Lake County Board of County Commissioners zoning packets since ${LAKE_COUNTY_SINCE} (${lake.length} cases read, ${lakeRejected.length} withdrawn, recommended for denial, or repeatedly continued)`,
      `Lake County development applications marked denied or cancelled, 2018 to 2021 (${snapshot.length})`,
      `City of Clermont council summaries of actions since ${CLERMONT_SINCE} (${city.length} denied or withdrawn land-use items)`,
      `City of Minneola: verified decisions listed by hand (${minneola.length})`,
    ],
    approvedLakeCountyCases: lake
      .filter((decision) => decision.reasons.length === 0)
      .map(({ caseNumber, name, date, fromZoning, toZoning, parcelKeys }) => ({ caseNumber, name, date, fromZoning, toZoning, parcelKeys })),
    decisions: all,
  };
  await mkdir(new URL("../public/skorman/", import.meta.url), { recursive: true });
  await writeFile(new URL("../public/skorman/decisions.json", import.meta.url), JSON.stringify(output, null, 1));
  console.log(`Wrote ${all.length} decisions.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
