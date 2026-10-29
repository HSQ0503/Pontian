export type Bilingual = { pt: string; en: string };

export type Project = {
  id: string;
  on: string;
  name: string;
  client: string;
  city: string;
  createdAt: string;
  demo?: boolean;
};

export type ItemStatus = "info" | "progress" | "closed";
export type Risk = "low" | "medium" | "high";

export type Evidence = { time: number; quote: string };

export type AtaItem = {
  id: string;
  number: string;
  section: number;
  subsection: string;
  origins: string[];
  firstDate: string;
  building: string;
  pt: string;
  en: string;
  status: ItemStatus;
  responsible: string;
  deadline: string;
  deadlineHistory: string[];
  deadlineText: string;
  risk: Risk;
  isDecision: boolean;
  isAction: boolean;
  evidence: Evidence[];
  // Number of the Registro Geral item this one carries forward, if any.
  updates: string | null;
  // MF keeps private coordinator notes beside the print area; they never reach the PDF.
  note: string;
};

export type Subsection = { code: string; section: number; pt: string; en: string };

export type Ata = {
  title: Bilingual;
  summary: Bilingual;
  agenda: Bilingual[];
  items: AtaItem[];
  subsections: Subsection[];
  nextMeeting: Bilingual | null;
  reviewFlags: Bilingual[];
  generatedAt: string;
  model: string;
};

export type Participant = { id: string; name: string; company: string; role: string; present: boolean };
export type Speaker = { id: string; name: string; company: string; description: string; guessed: boolean };
export type Segment = { id: string; speakerId: string; start: number; text: string };

export type SourceKind = "recording" | "audio" | "transcript";
export type MeetingStatus = "processing" | "draft" | "approved" | "failed";
export type Modality = "teams" | "presencial" | "hibrida";
export type PipelineStage = "transcribe" | "draft";

export type Meeting = {
  id: string;
  projectId: string;
  ar: number;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  modality: Modality;
  location: string;
  secretary: string;
  participants: Participant[];
  agenda: string[];
  source: { kind: SourceKind; name: string; duration: number; size: number };
  hasAudio: boolean;
  speakers: Speaker[];
  segments: Segment[];
  ata: Ata | null;
  status: MeetingStatus;
  error: string;
  failedStage: PipelineStage | "";
  approvedBy: string;
  approvedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type RgEntry = AtaItem & {
  history: { origin: string; date: string; pt: string; en: string; status: ItemStatus }[];
};
