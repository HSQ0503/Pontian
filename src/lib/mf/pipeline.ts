"use client";

import { parsePartialJson } from "ai";
import { useSyncExternalStore } from "react";
import type { AtaRequest, AtaResult, TranscriptionResult } from "./ai-schema";
import { prepareAudio } from "./audio";
import { addMinutes, arCode, clock, meetingDuration, parseClock, uid } from "./format";
import { readNdjson } from "./ndjson";
import { buildRegistry, numberAta, resolveSubsection } from "./registry";
import { STATUS } from "./sections";
import { getAudio, getMf, patchMeeting } from "./store";
import type { Ata, AtaItem, Meeting, Participant, PipelineStage, Segment, Speaker } from "./types";

// Jobs live outside React so processing continues while the user moves around the app.

export type JobView = {
  stage: "preparing" | "transcribing" | "drafting";
  chunk: number;
  chunks: number;
  progress: number;
  startedAt: number;
  liveSegments: { speaker: string; start: string; text: string }[];
  liveItems: { section: number; pt: string }[];
  note: string;
};

const jobs = new Map<string, JobView>();
const listeners = new Set<() => void>();

function setJob(id: string, next: JobView | null) {
  if (next) jobs.set(id, next);
  else jobs.delete(id);
  listeners.forEach((listener) => listener());
}

function updateJob(id: string, patch: Partial<JobView>) {
  const current = jobs.get(id);
  if (current) setJob(id, { ...current, ...patch });
}

export function useJob(id: string) {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    () => jobs.get(id) ?? null,
    () => null,
  );
}

export const isRunning = (id: string) => jobs.has(id);

// Partial JSON parsing is throttled: a long transcript would otherwise reparse on every token.
function partialReader<T>(onValue: (value: T) => void) {
  let text = "";
  let last = 0;
  return async (delta: string) => {
    text += delta;
    const now = performance.now();
    if (now - last < 180) return;
    last = now;
    const { value } = await parsePartialJson(text);
    if (value && typeof value === "object") onValue(value as T);
  };
}

async function transcribe(meeting: Meeting) {
  const audio = await getAudio(meeting.id);
  if (!audio) throw new Error("audio-missing");

  updateJob(meeting.id, { stage: "preparing", progress: 0 });
  const chunks = await prepareAudio(audio, (fraction) => updateJob(meeting.id, { progress: fraction }));
  const duration = chunks.reduce((total, chunk) => Math.max(total, chunk.offset + chunk.duration), 0);

  const roster: Speaker[] = [];
  const segments: Segment[] = [];
  const participants = meeting.participants.map(({ name, company, role }) => ({ name, company, role }));

  for (const [index, chunk] of chunks.entries()) {
    updateJob(meeting.id, { stage: "transcribing", chunk: index + 1, chunks: chunks.length, progress: index / chunks.length });
    const form = new FormData();
    form.append("audio", chunk.blob, `chunk-${index}`);
    form.append(
      "context",
      JSON.stringify({
        offset: chunk.offset,
        chunk: index,
        chunks: chunks.length,
        participants,
        roster: roster.map((s) => ({ id: s.id, description: s.description, name: s.name })),
      }),
    );

    let result: TranscriptionResult | null = null;
    let failure = "";
    const onDelta = partialReader<Partial<TranscriptionResult>>((value) => {
      const live = (value.segments ?? [])
        .filter((s): s is { speaker: string; start: string; text: string } => Boolean(s?.text))
        .map((s) => ({ speaker: s.speaker ?? "", start: clock(chunk.offset + parseClock(s.start ?? "0")), text: s.text }));
      updateJob(meeting.id, { liveSegments: [...segments.map(liveOf(roster)), ...live].slice(-40) });
    });
    const response = await fetch("/api/mf/transcribe", { method: "POST", body: form });
    await readNdjson(response, async (event) => {
      if (event.type === "delta") await onDelta(event.text);
      if (event.type === "done") result = event.data as TranscriptionResult;
      if (event.type === "error") failure = event.message;
    });
    if (!result) throw new Error(failure || "transcription-failed");
    const { speakers: found, segments: spoken } = result as TranscriptionResult;

    for (const speaker of found) {
      const existing = roster.find((s) => s.id === speaker.id);
      if (existing) {
        if (!existing.name && speaker.name) Object.assign(existing, { name: speaker.name, company: speaker.company ?? "", guessed: true });
      } else {
        roster.push({
          id: speaker.id,
          name: speaker.name ?? "",
          company: speaker.company ?? "",
          description: speaker.description,
          guessed: Boolean(speaker.name),
        });
      }
    }
    for (const segment of spoken) {
      if (!segment.text.trim()) continue;
      if (!roster.some((s) => s.id === segment.speaker)) {
        roster.push({ id: segment.speaker, name: "", company: "", description: "", guessed: false });
      }
      segments.push({ id: uid(), speakerId: segment.speaker, start: chunk.offset + parseClock(segment.start), text: segment.text.trim() });
    }
  }

  roster.sort((a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1)));
  return patchMeeting(meeting.id, (current) => ({
    speakers: roster,
    segments,
    source: { ...current.source, duration: current.source.duration || duration },
    endTime: current.endTime || addMinutes(current.startTime, duration / 60),
  }));
}

const liveOf = (roster: Speaker[]) => (segment: Segment) => ({
  speaker: roster.find((s) => s.id === segment.speakerId)?.name || segment.speakerId,
  start: clock(segment.start),
  text: segment.text,
});

export function transcriptText(meeting: Meeting) {
  const label = (id: string) => {
    const speaker = meeting.speakers.find((s) => s.id === id);
    if (!speaker?.name) return id;
    return `${id} ${speaker.name}${speaker.company ? ` (${speaker.company})` : ""}`;
  };
  return meeting.segments.map((s) => `[${clock(s.start)}] ${label(s.speakerId)}: ${s.text}`).join("\n");
}

function weekday(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", { weekday: "long" });
}

const MODALITY = { teams: "Microsoft Teams", presencial: "Presencial", hibrida: "Híbrida" } as const;

async function draft(meeting: Meeting) {
  const { projects, meetings } = getMf();
  const project = projects.find((p) => p.id === meeting.projectId);
  if (!project) throw new Error("project-missing");
  const registry = buildRegistry(meetings, meeting.projectId, meeting.id);

  // Open items always; recent informational ones too, since a meeting often revisits them.
  const recent = new Set(
    meetings
      .filter((m) => m.projectId === meeting.projectId && m.status === "approved" && m.id !== meeting.id)
      .sort((a, b) => b.ar - a.ar)
      .slice(0, 2)
      .map((m) => arCode(m.ar)),
  );
  const openItems = registry.entries
    .filter((entry) => entry.status === "progress" || entry.origins.some((origin) => recent.has(origin)))
    .slice(-150)
    .map((entry) => ({
      number: entry.number,
      pt: entry.pt,
      status: STATUS[entry.status].pt,
      responsible: entry.responsible,
      deadline: entry.deadline,
      origins: entry.origins.join(" "),
    }));

  const request: AtaRequest = {
    project: { on: project.on, name: project.name, client: project.client, city: project.city },
    meeting: {
      ar: arCode(meeting.ar),
      title: meeting.title,
      date: meeting.date,
      weekday: weekday(meeting.date),
      startTime: meeting.startTime,
      modality: MODALITY[meeting.modality],
      location: meeting.location,
      agenda: meeting.agenda,
      participants: meeting.participants.map(({ name, company, role }) => ({ name, company, role })),
    },
    speakers: meeting.speakers.map(({ id, name, company, description }) => ({ id, name, company, description })),
    transcript: transcriptText(meeting),
    subsections: registry.subsections.map(({ code, pt, en }) => ({ code, pt, en })),
    openItems,
  };

  updateJob(meeting.id, { stage: "drafting", progress: 0, liveItems: [], note: "" });
  let result: (AtaResult & { model: string }) | null = null;
  let failure = "";
  const onDelta = partialReader<Partial<AtaResult>>((value) => {
    const items = (value.items ?? []).filter((item): item is AtaResult["items"][number] => Boolean(item?.pt));
    updateJob(meeting.id, { liveItems: items.map((item) => ({ section: item.section ?? 1, pt: item.pt })) });
  });
  const response = await fetch("/api/mf/ata", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  await readNdjson(response, async (event) => {
    if (event.type === "delta") await onDelta(event.text);
    if (event.type === "done") result = event.data as AtaResult & { model: string };
    if (event.type === "error") failure = event.message;
  });
  if (!result) throw new Error(failure || "draft-failed");
  return applyDraft(meeting, result, registry);
}

function applyDraft(meeting: Meeting, result: AtaResult & { model: string }, registry: ReturnType<typeof buildRegistry>) {
  const known = new Map(registry.subsections.map((sub) => [sub.code, sub]));
  const validNumbers = new Set(registry.entries.map((entry) => entry.number));

  const items: AtaItem[] = result.items.map((raw) => {
    const section = Number.isInteger(raw.section) && raw.section >= 1 && raw.section <= 19 ? raw.section : 1;
    const updates = raw.updatesItem && validNumbers.has(raw.updatesItem) ? raw.updatesItem : null;
    const deadline = raw.deadline && /^\d{4}-\d{2}-\d{2}$/.test(raw.deadline) ? raw.deadline : "";
    return {
      id: uid(),
      number: "",
      section,
      subsection: resolveSubsection(section, raw.subsectionCode, raw.newSubsection, known),
      origins: [],
      firstDate: meeting.date,
      building: raw.building ?? "-",
      pt: raw.pt.trim(),
      en: raw.en.trim(),
      status: raw.isAction && raw.status === "info" ? "progress" : raw.status,
      responsible: raw.responsible ?? "",
      deadline,
      deadlineHistory: [],
      deadlineText: raw.deadlineText ?? "",
      risk: raw.risk,
      isDecision: raw.isDecision,
      isAction: raw.isAction,
      evidence: raw.evidence.map((e) => ({ time: parseClock(e.time), quote: e.quote })),
      updates,
      note: "",
    };
  });
  const created = [...known.values()].filter((sub) => !registry.subsections.some((r) => r.code === sub.code));
  const numbered = numberAta(items, created, registry, meeting.ar, meeting.date);

  const speakers = meeting.speakers.map((speaker) => {
    const guess = result.speakers.find((s) => s.id === speaker.id);
    if (speaker.name || !guess?.name) return speaker;
    return { ...speaker, name: guess.name, company: guess.company ?? "", guessed: true };
  });

  const participants: Participant[] = meeting.participants.length
    ? meeting.participants.map((p) => {
        const match = result.participants.find((r) => r.name.toLowerCase() === p.name.toLowerCase());
        return match ? { ...p, present: match.present, role: p.role || match.role || "" } : p;
      })
    : [];
  for (const person of result.participants) {
    if (!participants.some((p) => p.name.toLowerCase() === person.name.toLowerCase())) {
      participants.push({ id: uid(), name: person.name, company: person.company, role: person.role ?? "", present: person.present });
    }
  }

  const ata: Ata = {
    title: result.title,
    summary: result.summary,
    agenda: result.agenda,
    items: numbered.items,
    subsections: numbered.subsections,
    nextMeeting: result.nextMeeting,
    reviewFlags: result.reviewFlags,
    generatedAt: new Date().toISOString(),
    model: result.model,
  };

  return patchMeeting(meeting.id, (current) => ({
    ata,
    speakers,
    participants,
    title: current.title || result.title.pt,
    endTime: current.endTime || result.endTime || addMinutes(current.startTime, meetingDuration(current) / 60),
    status: "draft",
    error: "",
    failedStage: "",
  }));
}

export async function runPipeline(meetingId: string, from: PipelineStage = "transcribe") {
  if (jobs.has(meetingId)) return;
  setJob(meetingId, {
    stage: from === "draft" ? "drafting" : "preparing",
    chunk: 0,
    chunks: 0,
    progress: 0,
    startedAt: Date.now(),
    liveSegments: [],
    liveItems: [],
    note: "",
  });
  let stage: PipelineStage = from;
  try {
    let meeting = await patchMeeting(meetingId, { status: "processing", error: "", failedStage: "" });
    if (!meeting) throw new Error("meeting-missing");
    if (stage === "transcribe" && !meeting.segments.length) meeting = (await transcribe(meeting)) ?? meeting;
    stage = "draft";
    if (!meeting.segments.length) throw new Error("empty-transcript");
    await draft(meeting);
  } catch (error) {
    await patchMeeting(meetingId, {
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
      failedStage: stage,
    });
  } finally {
    setJob(meetingId, null);
  }
}
