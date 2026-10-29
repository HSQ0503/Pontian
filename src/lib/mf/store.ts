"use client";

import { useSyncExternalStore } from "react";
import { buildSeed } from "./seed";
import type { Meeting, Project } from "./types";

// Everything stays in this browser's IndexedDB: nothing about MF's meetings is
// kept on Pontian's servers. The in-memory snapshot feeds React through
// useSyncExternalStore; writes go to IndexedDB first, then notify.

export type MfState = { ready: boolean; projects: Project[]; meetings: Meeting[] };

const EMPTY: MfState = { ready: false, projects: [], meetings: [] };
const DB_NAME = "pontian-mf";
const STORES = ["projects", "meetings", "audio", "meta"] as const;
type StoreName = (typeof STORES)[number];

let state = EMPTY;
let loading: Promise<void> | null = null;
let dbPromise: Promise<IDBDatabase | null> | null = null;
const memoryAudio = new Map<string, Blob>();
const listeners = new Set<() => void>();

function emit(next: MfState) {
  state = next;
  listeners.forEach((listener) => listener());
}

function openDb() {
  return new Promise<IDBDatabase | null>((resolve) => {
    if (typeof indexedDB === "undefined") return resolve(null);
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      for (const name of STORES) {
        if (!request.result.objectStoreNames.contains(name)) request.result.createObjectStore(name);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

const db = () => (dbPromise ??= openDb());

function run<T>(store: StoreName, mode: IDBTransactionMode, action: (s: IDBObjectStore) => IDBRequest<T>) {
  return db().then(
    (database) =>
      new Promise<T | undefined>((resolve, reject) => {
        if (!database) return resolve(undefined);
        const request = action(database.transaction(store, mode).objectStore(store));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }),
  );
}

const getAll = <T,>(store: StoreName) => run<T[]>(store, "readonly", (s) => s.getAll() as IDBRequest<T[]>);
const put = (store: StoreName, key: string, value: unknown) => run(store, "readwrite", (s) => s.put(value, key));
const remove = (store: StoreName, key: string) => run(store, "readwrite", (s) => s.delete(key));

const byOn = (a: Project, b: Project) => a.on.localeCompare(b.on);
const byRecent = (a: Meeting, b: Meeting) =>
  b.date.localeCompare(a.date) || b.ar - a.ar || b.createdAt.localeCompare(a.createdAt);

async function load() {
  let projects = (await getAll<Project>("projects")) ?? [];
  let meetings = (await getAll<Meeting>("meetings")) ?? [];
  const seeded = await run("meta", "readonly", (s) => s.get("seeded"));
  if (!seeded && projects.length === 0) {
    const seed = buildSeed();
    projects = seed.projects;
    meetings = seed.meetings;
    await Promise.all([
      ...projects.map((p) => put("projects", p.id, p)),
      ...meetings.map((m) => put("meetings", m.id, m)),
      put("meta", "seeded", true),
    ]);
  }
  // A tab closed mid-processing leaves work that nothing is running anymore.
  meetings = meetings.map((m) =>
    m.status === "processing"
      ? { ...m, status: "failed", error: "interrupted", failedStage: m.segments.length ? "draft" : "transcribe" }
      : m,
  );
  emit({ ready: true, projects: projects.sort(byOn), meetings: meetings.sort(byRecent) });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  loading ??= load().catch(() => emit({ ready: true, projects: [], meetings: [] }));
  return () => {
    listeners.delete(listener);
  };
}

export function useMf() {
  return useSyncExternalStore(subscribe, () => state, () => EMPTY);
}

export function getMf() {
  return state;
}

export async function saveProject(project: Project) {
  await put("projects", project.id, project);
  emit({ ...state, projects: [...state.projects.filter((p) => p.id !== project.id), project].sort(byOn) });
}

export async function deleteProject(id: string) {
  const owned = state.meetings.filter((m) => m.projectId === id);
  await Promise.all([remove("projects", id), ...owned.flatMap((m) => [remove("meetings", m.id), remove("audio", m.id)])]);
  emit({
    ...state,
    projects: state.projects.filter((p) => p.id !== id),
    meetings: state.meetings.filter((m) => m.projectId !== id),
  });
}

export async function saveMeeting(meeting: Meeting) {
  const next = { ...meeting, updatedAt: new Date().toISOString() };
  await put("meetings", next.id, next);
  emit({ ...state, meetings: [...state.meetings.filter((m) => m.id !== next.id), next].sort(byRecent) });
  return next;
}

export async function patchMeeting(id: string, patch: Partial<Meeting> | ((meeting: Meeting) => Partial<Meeting>)) {
  const current = state.meetings.find((m) => m.id === id);
  if (!current) return null;
  return saveMeeting({ ...current, ...(typeof patch === "function" ? patch(current) : patch) });
}

export async function deleteMeeting(id: string) {
  memoryAudio.delete(id);
  await Promise.all([remove("meetings", id), remove("audio", id)]);
  emit({ ...state, meetings: state.meetings.filter((m) => m.id !== id) });
}

export async function putAudio(id: string, blob: Blob) {
  memoryAudio.set(id, blob);
  await put("audio", id, blob).catch(() => undefined);
}

export async function getAudio(id: string) {
  const cached = memoryAudio.get(id);
  if (cached) return cached;
  const stored = await run<Blob>("audio", "readonly", (s) => s.get(id) as IDBRequest<Blob>).catch(() => undefined);
  return stored ?? null;
}
