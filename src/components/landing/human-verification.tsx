"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./intake-quiz.module.css";

type Turnstile = {
  render: (container: HTMLElement, options: {
    sitekey: string;
    theme: "dark";
    size: "flexible";
    action: "intake";
    callback: (token: string) => void;
    "expired-callback": () => void;
    "error-callback": () => boolean;
    "timeout-callback": () => void;
    "refresh-expired": "auto";
    "refresh-timeout": "auto";
  }) => string;
  remove: (id: string) => void;
};

const getTurnstile = () => (window as Window & { turnstile?: Turnstile }).turnstile;
const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || "";
const testKey = /^[123]x0{10}/.test(sitekey);
const configured = Boolean(sitekey) && (!testKey || process.env.NODE_ENV === "development");
let scriptPromise: Promise<Turnstile> | undefined;

function loadTurnstile(): Promise<Turnstile> {
  const existing = getTurnstile();
  if (existing) return Promise.resolve(existing);
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<Turnstile>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    const fail = () => {
      clearTimeout(timeout);
      script.remove();
      reject(new Error("Verification could not load. Check your connection and try again."));
    };
    const timeout = window.setTimeout(fail, 15000);
    script.onerror = fail;
    script.onload = () => {
      const api = getTurnstile();
      if (!api) { fail(); return; }
      clearTimeout(timeout);
      resolve(api);
    };
    document.head.appendChild(script);
  }).catch((error: unknown) => {
    // A failed script must be loadable again without discarding the form answers.
    scriptPromise = undefined;
    throw error;
  });
  return scriptPromise;
}

export function HumanVerification({ token, onToken }: { token: string; onToken: (token: string) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!configured) return;
    let active = true;
    let widgetId: string | undefined;
    let api: Turnstile | undefined;
    const fail = (message: string) => {
      if (!active) return;
      onToken("");
      setError(message);
    };
    loadTurnstile().then((loaded) => {
      if (!active || !container.current) return;
      api = loaded;
      widgetId = api.render(container.current, {
        sitekey, theme: "dark", size: "flexible", action: "intake",
        callback: (value) => { if (active) { onToken(value); setError(""); } },
        "expired-callback": () => { if (active) { onToken(""); setError(""); } },
        "error-callback": () => { fail("Verification failed. Please try again."); return true; },
        "timeout-callback": () => fail("Verification timed out. Please try again."),
        "refresh-expired": "auto",
        "refresh-timeout": "auto",
      });
    }).catch(() => fail("Verification could not load. Check your connection and try again."));
    return () => {
      active = false;
      if (api && widgetId !== undefined) api.remove(widgetId);
      onToken("");
    };
  }, [attempt, onToken]);

  return (
    <div className={styles.verification}>
      <p className={styles.verifyLabel}>Human verification</p>
      {configured && <div ref={container} className={styles.verifyWidget} />}
      <p className={styles.verifyNote} role={error ? "alert" : "status"}>
        {!configured ? "Verification is currently unavailable. Please contact Pontian directly." : error || (token ? "Verification complete. You can send your details." : "Complete the Cloudflare security check to send your details.")}
      </p>
      {error && <button type="button" className={styles.verifyRetry} onClick={() => { onToken(""); setError(""); setAttempt(value => value + 1); }}>Retry verification</button>}
      {testKey && process.env.NODE_ENV === "development" && <p className={styles.verifyNote}>Development test widget. This does not protect a live form.</p>}
    </div>
  );
}
