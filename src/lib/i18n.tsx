"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { content, type Content, type Locale } from "./content";

const KEY = "pontian-locale";

// A tiny external store so the server can render PT and the client can wake
// up in whatever the reader chose, without a setState-in-effect.
let current: Locale | null = null;
const listeners = new Set<() => void>();

function readInitial(): Locale {
  const q = new URLSearchParams(window.location.search).get("lang");
  if (q === "en" || q === "pt") return q;
  return window.localStorage.getItem(KEY) === "en" ? "en" : "pt";
}

function getSnapshot(): Locale {
  if (current === null) current = readInitial();
  return current;
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function write(l: Locale) {
  current = l;
  window.localStorage.setItem(KEY, l);
  listeners.forEach((fn) => fn());
}

type Ctx = { locale: Locale; t: Content; setLocale: (l: Locale) => void };

const LocaleContext = createContext<Ctx>({
  locale: "pt",
  t: content.pt,
  setLocale: () => {},
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => "pt" as Locale,
  );
  const setLocale = useCallback((l: Locale) => write(l), []);

  useEffect(() => {
    document.documentElement.lang = locale === "pt" ? "pt-BR" : "en";
  }, [locale]);

  return (
    <LocaleContext.Provider value={{ locale, t: content[locale], setLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useT() {
  return useContext(LocaleContext);
}
