import { arCode, compareNumbers } from "./format";
import type { AtaItem, Bilingual, Meeting, RgEntry, Subsection } from "./types";

export type Registry = { entries: RgEntry[]; subsections: Subsection[] };

const pad2 = (n: number) => String(n).padStart(2, "0");
const normalize = (text: string) =>
  text.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
const unique = (values: string[]) => [...new Set(values.filter(Boolean))];
const lastIndex = (number: string) => Number(number.split(".").at(-1)) || 0;

// The Registro Geral is the replay of every approved ata, in AR order: an item
// keeps its number forever and collects the meetings that touched it.
export function buildRegistry(meetings: Meeting[], projectId: string, excludeId?: string): Registry {
  const approved = meetings
    .filter((m) => m.projectId === projectId && m.status === "approved" && m.ata && m.id !== excludeId)
    .sort((a, b) => a.ar - b.ar);
  const entries = new Map<string, RgEntry>();
  const subsections = new Map<string, Subsection>();

  for (const meeting of approved) {
    const ata = meeting.ata!;
    for (const sub of ata.subsections) if (!subsections.has(sub.code)) subsections.set(sub.code, sub);
    for (const item of ata.items) {
      if (!item.number) continue;
      const origin = arCode(meeting.ar);
      const step = { origin, date: meeting.date, pt: item.pt, en: item.en, status: item.status };
      const existing = entries.get(item.number);
      if (existing) {
        entries.set(item.number, {
          ...existing,
          ...item,
          origins: unique([...existing.origins, ...item.origins, origin]),
          firstDate: existing.firstDate,
          deadlineHistory: unique([...existing.deadlineHistory, ...item.deadlineHistory, item.deadline]),
          history: [...existing.history, step],
        });
      } else {
        entries.set(item.number, {
          ...item,
          origins: item.origins.length ? item.origins : [origin],
          deadlineHistory: unique([...item.deadlineHistory, item.deadline]),
          history: [step],
        });
      }
    }
  }

  for (const entry of entries.values()) {
    if (!subsections.has(entry.subsection)) {
      subsections.set(entry.subsection, { code: entry.subsection, section: entry.section, pt: "-", en: "-" });
    }
  }

  return {
    entries: [...entries.values()].sort((a, b) => compareNumbers(a.number, b.number)),
    subsections: [...subsections.values()].sort((a, b) => compareNumbers(a.code, b.code)),
  };
}

// Finds the subsection a new item belongs to, reusing an existing one with the
// same title before creating the next free code in that section.
export function resolveSubsection(
  section: number,
  code: string | null,
  title: Bilingual | null,
  known: Map<string, Subsection>,
) {
  if (code && known.get(code)?.section === section) return code;
  const wanted = title ?? { pt: "Geral", en: "General" };
  const match = [...known.values()].find(
    (sub) => sub.section === section && normalize(sub.pt) === normalize(wanted.pt),
  );
  if (match) return match.code;
  const next =
    Math.max(0, ...[...known.values()].filter((sub) => sub.section === section).map((sub) => lastIndex(sub.code))) + 1;
  const created = {
    code: `${section}.${pad2(next)}`,
    section,
    pt: wanted.pt.toUpperCase(),
    en: wanted.en.toUpperCase(),
  };
  known.set(created.code, created);
  return created.code;
}

// Numbers an ata against the current registry. Carried items keep their RG
// number; new ones take the next free index in their subsection. Pure and
// repeatable, so it runs after generation, after edits, and again at approval.
export function numberAta(
  items: AtaItem[],
  ataSubsections: Subsection[],
  registry: Registry,
  ar: number,
  date: string,
) {
  const origin = arCode(ar);
  const known = new Map(registry.entries.map((entry) => [entry.number, entry]));
  const subsections = new Map(registry.subsections.map((sub) => [sub.code, sub]));
  const remap = new Map<string, string>();
  const created: Subsection[] = [];

  for (const sub of ataSubsections) {
    const existing = subsections.get(sub.code);
    if (existing && normalize(existing.pt) === normalize(sub.pt)) continue;
    const code = existing ? resolveSubsection(sub.section, null, sub, subsections) : sub.code;
    if (!existing) subsections.set(code, sub);
    remap.set(sub.code, code);
    created.push({ ...sub, code });
  }

  const used = new Map<string, number>();
  for (const entry of registry.entries) {
    used.set(entry.subsection, Math.max(used.get(entry.subsection) ?? 0, lastIndex(entry.number)));
  }

  const numbered = items.map((item) => {
    const carried = item.updates ? known.get(item.updates) : undefined;
    if (carried) {
      // An update that doesn't restate the owner or deadline keeps the ones already on record.
      const deadline = item.deadline || carried.deadline;
      return {
        ...item,
        number: carried.number,
        section: carried.section,
        subsection: carried.subsection,
        origins: unique([...carried.origins, origin]),
        firstDate: carried.firstDate,
        responsible: item.responsible || carried.responsible,
        building: item.building && item.building !== "-" ? item.building : carried.building,
        deadline,
        deadlineHistory: unique([...carried.deadlineHistory, deadline]),
      };
    }
    const subsection = resolveSubsection(item.section, remap.get(item.subsection) ?? item.subsection, null, subsections);
    if (!registry.subsections.some((sub) => sub.code === subsection) && !created.some((sub) => sub.code === subsection)) {
      created.push(subsections.get(subsection)!);
    }
    const index = (used.get(subsection) ?? 0) + 1;
    used.set(subsection, index);
    return {
      ...item,
      updates: null,
      number: `${subsection}.${pad2(index)}`,
      subsection,
      origins: [origin],
      firstDate: date,
      deadlineHistory: unique([item.deadline]),
    };
  });

  return { items: numbered, subsections: created };
}

export type SectionGroup<T extends AtaItem> = {
  section: number;
  subsections: { sub: Subsection; items: T[] }[];
};

export function groupItems<T extends AtaItem>(items: T[], subsections: Subsection[]): SectionGroup<T>[] {
  const lookup = new Map(subsections.map((sub) => [sub.code, sub]));
  const sorted = [...items].sort((a, b) => compareNumbers(a.number || a.subsection, b.number || b.subsection));
  const groups: SectionGroup<T>[] = [];
  for (const item of sorted) {
    let group = groups.find((g) => g.section === item.section);
    if (!group) {
      group = { section: item.section, subsections: [] };
      groups.push(group);
    }
    let bucket = group.subsections.find((s) => s.sub.code === item.subsection);
    if (!bucket) {
      bucket = {
        sub: lookup.get(item.subsection) ?? { code: item.subsection, section: item.section, pt: "-", en: "-" },
        items: [],
      };
      group.subsections.push(bucket);
    }
    bucket.items.push(item);
  }
  return groups.sort((a, b) => a.section - b.section);
}
