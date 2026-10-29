import { z } from "zod";

const bilingual = z.object({ pt: z.string(), en: z.string() });

export const transcriptionSchema = z.object({
  speakers: z.array(
    z.object({
      id: z.string().describe("S1, S2, ... one per distinct voice"),
      description: z.string().describe("Short description of the voice and role in the conversation"),
      name: z.string().nullable().describe("Name only if someone says it or it is unmistakable from the participant list"),
      company: z.string().nullable(),
    }),
  ),
  segments: z.array(
    z.object({
      speaker: z.string(),
      start: z.string().describe("MM:SS from the start of this audio file"),
      text: z.string(),
    }),
  ),
});

export type TranscriptionResult = z.infer<typeof transcriptionSchema>;

export const transcribeContextSchema = z.object({
  offset: z.number(),
  chunk: z.number(),
  chunks: z.number(),
  participants: z.array(z.object({ name: z.string(), company: z.string(), role: z.string() })),
  roster: z.array(z.object({ id: z.string(), description: z.string(), name: z.string() })),
});

export type TranscribeContext = z.infer<typeof transcribeContextSchema>;

export const ataSchema = z.object({
  title: bilingual.describe("Objective of the meeting, short, as MF writes it: 'Reunião quinzenal de civil'"),
  summary: bilingual.describe("Executive summary, 2 to 4 sentences"),
  agenda: z.array(bilingual),
  speakers: z.array(
    z.object({
      id: z.string(),
      name: z.string().nullable(),
      company: z.string().nullable(),
      evidence: z.string().nullable(),
    }),
  ),
  participants: z.array(
    z.object({ name: z.string(), company: z.string(), role: z.string().nullable(), present: z.boolean() }),
  ),
  items: z.array(
    z.object({
      section: z.number().int(),
      subsectionCode: z.string().nullable(),
      newSubsection: bilingual.nullable(),
      updatesItem: z.string().nullable(),
      pt: z.string(),
      en: z.string(),
      status: z.enum(["info", "progress", "closed"]),
      isDecision: z.boolean(),
      isAction: z.boolean(),
      responsible: z.string().nullable(),
      deadline: z.string().nullable().describe("YYYY-MM-DD"),
      deadlineText: z.string().nullable(),
      risk: z.enum(["low", "medium", "high"]),
      building: z.string().nullable(),
      evidence: z.array(z.object({ time: z.string(), quote: z.string() })),
    }),
  ),
  nextMeeting: bilingual.nullable(),
  endTime: z.string().nullable().describe("HH:MM when the meeting ended, if it can be determined"),
  reviewFlags: z.array(bilingual),
});

export type AtaResult = z.infer<typeof ataSchema>;

export const ataRequestSchema = z.object({
  project: z.object({ on: z.string(), name: z.string(), client: z.string(), city: z.string() }),
  meeting: z.object({
    ar: z.string(),
    title: z.string(),
    date: z.string(),
    weekday: z.string(),
    startTime: z.string(),
    modality: z.string(),
    location: z.string(),
    agenda: z.array(z.string()),
    participants: z.array(z.object({ name: z.string(), company: z.string(), role: z.string() })),
  }),
  speakers: z.array(z.object({ id: z.string(), name: z.string(), company: z.string(), description: z.string() })),
  transcript: z.string(),
  subsections: z.array(z.object({ code: z.string(), pt: z.string(), en: z.string() })),
  openItems: z.array(
    z.object({
      number: z.string(),
      pt: z.string(),
      status: z.string(),
      responsible: z.string(),
      deadline: z.string(),
      origins: z.string(),
    }),
  ),
});

export type AtaRequest = z.infer<typeof ataRequestSchema>;
