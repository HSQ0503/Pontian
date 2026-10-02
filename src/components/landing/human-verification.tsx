"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { Check, ShieldCheck } from "lucide-react";
import styles from "./intake-quiz.module.css";

type Turnstile = {
  render: (container: HTMLElement, options: {
    sitekey: string; theme: string; size: string; action: string;
    callback: (token: string) => void;
    "expired-callback": () => void;
    "error-callback": () => void;
    "timeout-callback": () => void;
  }) => string;
  remove: (id: string) => void;
};

declare global { interface Window { turnstile?: Turnstile } }

const testMode = process.env.NODE_ENV === "development" && !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || (testMode ? "3x00000000000000000000FF" : "");

export function HumanVerification({ token, onToken }: { token: string; onToken: (token: string) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const [requested, setRequested] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!requested || !ready || !container.current || !window.turnstile) return;
    const api = window.turnstile;
    const fail = (message: string) => { onToken(""); setError(message); };
    const id = api.render(container.current, {
      sitekey, theme: "dark", size: "compact", action: "intake",
      callback: (value) => { onToken(value); setError(""); },
      "expired-callback": () => fail("Verification expired. Please verify again."),
      "error-callback": () => fail("Verification couldn’t load. Please retry."),
      "timeout-callback": () => fail("Verification timed out. Please retry."),
    });
    return () => { api.remove(id); onToken(""); };
  }, [requested, ready, attempt, onToken]);

  return (
    <div className={styles.verification}>
      <button type="button" className={styles.verifyButton} disabled={!sitekey || (requested && !error)} onClick={() => { setError(""); setRequested(true); setAttempt(attempt + 1); }}>
        <span className={styles.verifyCheck}>{token && <Check size={17} />}</span>
        <span>{token ? "You’re verified" : "I’m not a robot"}</span>
        <ShieldCheck size={19} className={styles.verifyShield} />
      </button>
      {requested && sitekey && <>
        <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" onReady={() => setReady(true)} onError={() => { onToken(""); setError("Verification is unavailable. Please reload and try again."); }} />
        <div ref={container} className={styles.verifyWidget} />
      </>}
      <p className={styles.verifyNote} aria-live="polite">{error || (!sitekey ? "Verification is not configured yet." : token ? "Ready to send." : requested ? "Complete the security check below." : "One quick check before we connect.")}</p>
      {testMode && <p className={styles.verifyNote}>Local preview · test verification</p>}
    </div>
  );
}
