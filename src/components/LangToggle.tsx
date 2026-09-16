"use client";

import { useT } from "@/lib/i18n";
import type { Locale } from "@/lib/content";

export function LangToggle({ className = "" }: { className?: string }) {
  const { locale, setLocale } = useT();
  const opt = (l: Locale) => (
    <button
      type="button"
      onClick={() => setLocale(l)}
      aria-pressed={locale === l}
      className={`label px-2 py-2.5 transition-colors ${
        locale === l ? "text-sky" : "text-mist/60 hover:text-mist"
      }`}
    >
      {l}
    </button>
  );
  return (
    <div
      className={`flex items-center ${className}`}
      role="group"
      aria-label="Language"
    >
      {opt("pt")}
      <span className="text-mist/30 text-xs">·</span>
      {opt("en")}
    </div>
  );
}
