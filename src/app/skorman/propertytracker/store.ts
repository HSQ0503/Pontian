"use client";

import { useSyncExternalStore } from "react";
import type { Filters, TrackStatus, Tracking } from "./parcels";

export type SavedView = { id: string; name: string; filters: Filters };

function localStore<T>(key: string, fallback: T) {
  const listeners = new Set<() => void>();
  let cache: T | null = null;

  function read(): T {
    if (cache !== null) return cache;
    try {
      const saved = localStorage.getItem(key);
      cache = saved ? (JSON.parse(saved) as T) : fallback;
    } catch {
      cache = fallback;
    }
    return cache;
  }

  function write(next: T) {
    cache = next;
    localStorage.setItem(key, JSON.stringify(next));
    listeners.forEach((listener) => listener());
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    const onStorage = (event: StorageEvent) => {
      if (event.key !== key) return;
      cache = null;
      listener();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  }

  const useValue = () => useSyncExternalStore(subscribe, read, () => fallback);
  return { read, write, useValue };
}

const tracking = localStore<Tracking>("skorman-property-tracking:v1", {});
const views = localStore<SavedView[]>("skorman-property-views:v1", []);

export const useTracking = tracking.useValue;
export const useSavedViews = views.useValue;

export function setTracking(parcelId: string, status: TrackStatus | null, note: string) {
  const next = { ...tracking.read() };
  if (status === null && !note.trim()) delete next[parcelId];
  else next[parcelId] = { status: status ?? "Interesting", note, updatedAt: new Date().toISOString() };
  tracking.write(next);
}

export function saveView(name: string, filters: Filters) {
  views.write([...views.read(), { id: crypto.randomUUID(), name, filters }]);
}

export function deleteView(id: string) {
  views.write(views.read().filter((view) => view.id !== id));
}
