"use client";

import { chapters } from "./Story";

// Every chapter on its own 1920x1080 page, fully revealed and static.
// scripts/export-pdf.mjs prints this route to public/pontian-{pt,en}.pdf.
export function PrintStory() {
  return (
    <div className="bg-ink">
      {chapters.map((C, i) => (
        <C key={i} print />
      ))}
    </div>
  );
}
