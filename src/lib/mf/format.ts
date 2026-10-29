import type { Meeting, Project } from "./types";

export type Lang = "pt" | "en";

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

export const uid = () => crypto.randomUUID();

export const arCode = (ar: number) => `AR#${pad(ar, 3)}`;

export const docCode = (project: Project, ar: number) => `${project.on}-AR-G-${pad(ar, 3)}`;

export function todayIso() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function clockNow() {
  const now = new Date();
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export function isoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

// MF prints dates as dd/mm/yy in its minutes.
export function shortDate(iso: string) {
  if (!isoDate(iso)) return "-";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

export function longDate(iso: string, lang: Lang) {
  if (!isoDate(iso)) return "-";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(lang === "pt" ? "pt-BR" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function clock(seconds: number) {
  const total = Math.max(0, Math.round(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export function parseClock(value: string) {
  const parts = value.trim().replace(",", ".").split(":").map(Number);
  if (parts.some(Number.isNaN)) return 0;
  return parts.reduce((total, part) => total * 60 + part, 0);
}

export function addMinutes(time: string, minutes: number) {
  if (!/^\d{1,2}:\d{2}$/.test(time)) return "";
  const [h, m] = time.split(":").map(Number);
  const total = (h * 60 + m + Math.round(minutes)) % (24 * 60);
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

export function durationLabel(seconds: number) {
  if (!seconds) return "-";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${pad(minutes % 60)}`;
}

export function bytes(size: number) {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export function daysUntil(iso: string) {
  if (!isoDate(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((new Date(y, m - 1, d).getTime() - start.getTime()) / 86_400_000);
}

export function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  return (words[0][0] + (words.length > 1 ? words[words.length - 1][0] : "")).toUpperCase();
}

export function compareNumbers(a: string, b: string) {
  const left = a.split(".").map(Number);
  const right = b.split(".").map(Number);
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0);
    if (diff) return diff;
  }
  return 0;
}

export function meetingDuration(meeting: Meeting) {
  if (meeting.source.duration) return meeting.source.duration;
  const last = meeting.segments.at(-1);
  return last ? last.start + 30 : 0;
}

export function download(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export const transcriptFileName = (meeting: Meeting) => `transcricao-AR${String(meeting.ar).padStart(3, "0")}.txt`;
