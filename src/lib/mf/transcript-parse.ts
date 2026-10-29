import { parseClock } from "./format";
import type { Segment, Speaker } from "./types";
import { readZipEntry } from "./zip";

export type ParsedTranscript = { speakers: Speaker[]; segments: Segment[] };
type Cue = { start: number | null; speaker: string; text: string };

const TIME = String.raw`\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d+)?`;
const TIMED_LINE = new RegExp(String.raw`^\[?(${TIME})\]?\s*[-–]?\s*(?:([^:\[\]]{2,60}?)\s*:\s*)?(.+)$`);
const TEAMS_HEADER = new RegExp(String.raw`^(.{2,60}?)\s+\[?(${TIME})\]?$`);
const NAMED_LINE = /^([A-ZÀ-Ý][\p{L}.'’\- ]{1,48}(?:\([^)]{1,30}\))?)\s*:\s+(.+)$/u;

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const decode = (text: string) =>
  text.replace(/&(#\d+|amp|lt|gt|quot|apos);/g, (_, code: string) =>
    code.startsWith("#") ? String.fromCharCode(Number(code.slice(1))) : ENTITIES[code],
  );

export async function readTranscriptFile(file: File) {
  if (file.name.toLowerCase().endsWith(".docx")) {
    const xml = await readZipEntry(file, "word/document.xml");
    if (!xml) throw new Error("docx");
    return xml
      .split("</w:p>")
      .map((paragraph) => decode(paragraph.replace(/<w:tab\/>/g, "\t").replace(/<w:br\/>/g, "\n").replace(/<[^>]+>/g, "")))
      .join("\n");
  }
  return file.text();
}

function cuesFromSubtitles(text: string): Cue[] {
  return text
    .split(/\n{2,}/)
    .map((block): Cue | null => {
      const lines = block.split("\n");
      const timing = lines.findIndex((line) => line.includes("-->"));
      if (timing < 0) return null;
      const body = lines.slice(timing + 1).join(" ");
      const voice = body.match(/<v(?:\.[^\s>]+)?\s+([^>]+)>/);
      let clean = body.replace(/<[^>]+>/g, "").trim();
      let speaker = voice?.[1].trim() ?? "";
      const named = !speaker ? clean.match(NAMED_LINE) : null;
      if (named) {
        speaker = named[1];
        clean = named[2];
      }
      return { start: parseClock(lines[timing].split("-->")[0]), speaker, text: clean };
    })
    .filter((cue): cue is Cue => cue !== null && Boolean(cue.text));
}

function cuesFromLines(text: string): Cue[] {
  const cues: Cue[] = [];
  let pendingHeader: Cue | null = null;
  for (const raw of text.split("\n")) {
    const line = raw.replace(/\*\*|__/g, "").trim();
    if (!line || /^#{1,6}\s/.test(line)) continue;

    const header = line.match(TEAMS_HEADER);
    if (header && !line.includes(":  ") && header[1].split(/\s+/).length <= 6 && !/[.!?]$/.test(header[1])) {
      pendingHeader = { start: parseClock(header[2]), speaker: header[1], text: "" };
      cues.push(pendingHeader);
      continue;
    }
    const timed = line.match(TIMED_LINE);
    if (timed) {
      pendingHeader = null;
      cues.push({ start: parseClock(timed[1]), speaker: timed[2]?.trim() ?? "", text: timed[3].trim() });
      continue;
    }
    const named = line.match(NAMED_LINE);
    if (named && named[1].split(/\s+/).length <= 6) {
      pendingHeader = null;
      cues.push({ start: null, speaker: named[1], text: named[2].trim() });
      continue;
    }
    const target = pendingHeader ?? cues.at(-1);
    if (target && (pendingHeader || target.text.length < 1200)) target.text = `${target.text} ${line}`.trim();
    else cues.push({ start: null, speaker: "", text: line });
  }
  return cues.filter((cue) => cue.text);
}

function splitName(label: string) {
  const match = label.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  return match ? { name: match[1].trim(), company: match[2].trim() } : { name: label.trim(), company: "" };
}

export function parseTranscript(raw: string): ParsedTranscript {
  const text = raw.replace(/^﻿/, "").replace(/\r\n?/g, "\n").trim();
  const subtitles = /^WEBVTT/.test(text) || /^\d+\n\d{2}:\d{2}:\d{2}[,.]\d{3}\s+-->/m.test(text);
  const cues = subtitles ? cuesFromSubtitles(text) : cuesFromLines(text);

  const speakers: Speaker[] = [];
  const idFor = (label: string) => {
    const { name, company } = splitName(label);
    const key = name.toLowerCase();
    let speaker = speakers.find((s) => s.name.toLowerCase() === key);
    if (!speaker) {
      speaker = { id: `S${speakers.length + 1}`, name, company, description: "", guessed: false };
      speakers.push(speaker);
    }
    return speaker.id;
  };

  const segments: Segment[] = [];
  let clock = 0;
  for (const cue of cues) {
    const speakerId = idFor(cue.speaker);
    // Untimed text gets an estimate from speaking pace, so order and rough position survive.
    const start = cue.start ?? clock;
    clock = Math.max(clock, start) + Math.max(2, cue.text.split(/\s+/).length / 2.5);
    const previous = segments.at(-1);
    if (previous && previous.speakerId === speakerId && subtitles && previous.text.length < 600) {
      previous.text = `${previous.text} ${cue.text}`;
    } else {
      segments.push({ id: `seg-${segments.length}`, speakerId, start, text: cue.text });
    }
  }
  return { speakers, segments };
}
