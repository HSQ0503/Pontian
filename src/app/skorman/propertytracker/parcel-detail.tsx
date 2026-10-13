"use client";

import { useState } from "react";
import { describeCode, intensityLabels, isRelatedOwner, trackStatuses, yearsHeld, type Scored, type TrackStatus } from "./parcels";
import { setTracking, useTracking } from "./store";

type Brief = {
  verdict: string;
  summary: string;
  whyItMayFit: string[];
  obstacles: string[];
  nearbyActivity: string[];
  questionsToVerify: string[];
};

const money = (value: number) => (value ? `$${value.toLocaleString()}` : "—");

function levelText(level: Scored["zoningLevel"]) {
  if (level === null) return "Not classified";
  if (level === "public") return "Public or institutional";
  return intensityLabels[level];
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[8.5rem_1fr] gap-2 py-1.5 text-sm">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="break-words text-zinc-200">{value || "—"}</dd>
    </div>
  );
}

function List({ title, items, tone }: { title: string; items: string[]; tone?: "warn" }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h4 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-zinc-500">{title}</h4>
      <ul className="flex flex-col gap-1.5 text-sm">
        {items.map((item) => (
          <li key={item} className={`border-l-2 pl-3 ${tone === "warn" ? "border-orange-400/60 text-orange-100" : "border-yellow-300/60 text-zinc-200"}`}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ParcelDetail({ parcel, onClose }: { parcel: Scored; onClose: () => void }) {
  const tracking = useTracking();
  const track = tracking[parcel.id];
  const [note, setNote] = useState(track?.note ?? "");
  const [research, setResearch] = useState<{ status: "idle" | "loading" | "done" | "error"; brief?: Brief; error?: string }>({ status: "idle" });

  const positives = parcel.signals.filter((signal) => signal.points > 0);
  const cautions = parcel.signals.filter((signal) => signal.points <= 0);
  const held = yearsHeld(parcel);

  async function runResearch() {
    setResearch({ status: "loading" });
    try {
      const response = await fetch("/api/skorman/parcel-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parcelNumber: parcel.parcelNumber,
          owner: parcel.owner,
          address: parcel.address,
          acres: parcel.acres,
          lat: parcel.lat,
          lng: parcel.lng,
          jurisdiction: parcel.jurisdiction,
          zoning: parcel.zoning,
          zoningName: parcel.zoningName,
          flu: parcel.flu,
          fluName: parcel.fluName,
          landUse: parcel.landUse,
          justValue: parcel.justValue,
          lastSaleDate: parcel.lastSaleDate,
          lastSalePrice: parcel.lastSalePrice,
          distanceMiles: parcel.distanceMiles,
          wetlandPct: parcel.wetlandPct,
          floodPct: parcel.floodPct,
          signals: parcel.signals.map((signal) => signal.detail),
        }),
        signal: AbortSignal.timeout(70_000),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Research failed.");
      setResearch({ status: "done", brief: data.brief });
    } catch (error) {
      setResearch({ status: "error", error: error instanceof Error ? error.message : "Research failed." });
    }
  }

  return (
    <article className="flex flex-col gap-5">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-zinc-500">{parcel.jurisdiction}</p>
          <h2 className="mt-1 text-lg font-semibold leading-snug text-zinc-50">{parcel.address || parcel.propertyName || parcel.parcelNumber}</h2>
          <p className="mt-1 text-sm text-zinc-400">
            {parcel.acres.toFixed(1)} acres · {parcel.distanceMiles.toFixed(1)} mi from Crooked Can
          </p>
        </div>
        <div className="flex shrink-0 items-start gap-1">
          <div className="rounded-lg border border-yellow-300/40 px-3 py-1.5 text-center">
            <p className="text-xl font-semibold tabular-nums text-yellow-200">{parcel.score}</p>
            <p className="text-[10px] uppercase tracking-wide text-zinc-500">Score</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close parcel" className="grid size-11 place-items-center rounded-lg text-zinc-400 hover:bg-white/5 hover:text-zinc-100">
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      </header>

      {isRelatedOwner(parcel) && (
        <p className="rounded-lg border border-white/15 p-3 text-sm text-zinc-300">This owner appears to hold Hills City Center land. Confirm with Max before treating it as a lead.</p>
      )}

      <List title="Why it appeared" items={positives.map((signal) => signal.detail)} />
      <List title="Watch outs" items={cautions.map((signal) => signal.detail)} tone="warn" />

      <section className="rounded-xl border border-white/10 p-4">
        <h3 className="mb-3 text-sm font-medium text-zinc-200">Track this parcel</h3>
        <div className="flex flex-wrap gap-2">
          {trackStatuses.map((status) => (
            <button
              key={status}
              type="button"
              aria-pressed={track?.status === status}
              onClick={() => setTracking(parcel.id, track?.status === status ? null : (status as TrackStatus), note)}
              className={`min-h-9 rounded-full border px-3 text-xs ${track?.status === status ? "border-yellow-300 bg-yellow-300/10 text-yellow-200" : "border-white/10 text-zinc-400 hover:border-white/25"}`}
            >
              {status}
            </button>
          ))}
        </div>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          onBlur={() => setTracking(parcel.id, track?.status ?? null, note)}
          rows={3}
          placeholder="Notes, who to call, what you learned…"
          aria-label="Notes"
          className="mt-3 w-full rounded-md border border-white/10 bg-zinc-900 px-3 py-2 text-[15px] text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-400 focus:outline-none"
        />
      </section>

      <section className="rounded-xl border border-white/10 p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-medium text-zinc-200">AI research brief</h3>
          <button
            type="button"
            onClick={runResearch}
            disabled={research.status === "loading"}
            className="min-h-9 rounded-md bg-zinc-100 px-3 text-sm font-medium text-zinc-950 hover:bg-white disabled:opacity-60"
          >
            {research.status === "loading" ? "Researching…" : research.status === "done" ? "Run again" : "Research"}
          </button>
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          Checks this parcel&apos;s sale history, nearby land sales, and nearby county applications, then writes a short brief. It can be wrong. Verify before acting.
        </p>
        {research.status === "error" && <p className="mt-3 text-sm text-red-300">{research.error}</p>}
        {research.brief && (
          <div className="mt-4 flex flex-col gap-4">
            <p className="text-sm text-zinc-100">
              <span className="mr-2 rounded bg-yellow-300/15 px-2 py-0.5 text-xs font-medium text-yellow-200">{research.brief.verdict}</span>
              {research.brief.summary}
            </p>
            <List title="Why it may fit" items={research.brief.whyItMayFit} />
            <List title="Obstacles" items={research.brief.obstacles} tone="warn" />
            <List title="Nearby activity" items={research.brief.nearbyActivity} />
            <List title="Questions to verify" items={research.brief.questionsToVerify} />
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-500">Property record</h3>
        <dl className="divide-y divide-white/5">
          <Fact label="Owner" value={parcel.owner} />
          <Fact label="Mailing address" value={[parcel.ownerAddress, parcel.ownerCity, parcel.ownerState, parcel.ownerZip].filter(Boolean).join(", ")} />
          <Fact label="Parcel number" value={parcel.parcelNumber} />
          <Fact label="Zoning" value={`${describeCode(parcel.zoning, parcel.zoningName)} (${levelText(parcel.zoningLevel)})`} />
          <Fact label="Land-use plan" value={`${describeCode(parcel.flu, parcel.fluName)} (${levelText(parcel.planLevel)})`} />
          <Fact label="Current use" value={parcel.landUse} />
          <Fact label="Assessed value" value={`${money(parcel.justValue)} (land ${money(parcel.landValue)}, buildings ${money(parcel.buildingValue)})`} />
          <Fact label="Last sale" value={parcel.lastSaleDate ? `${parcel.lastSaleDate} for ${money(parcel.lastSalePrice)}${held !== null ? ` · ${held} years ago` : ""}` : "No sale on record"} />
          <Fact label="Wetlands / flood" value={`${parcel.wetlandPct}% wetland · ${parcel.floodPct}% flood zone`} />
        </dl>
        <div className="mt-3 flex flex-wrap gap-2">
          {parcel.link && (
            <a href={parcel.link} target="_blank" rel="noreferrer" className="min-h-9 rounded-md border border-white/10 px-3 py-2 text-sm text-zinc-200 hover:border-white/25">
              Property appraiser record ↗
            </a>
          )}
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${parcel.lat},${parcel.lng}`}
            target="_blank"
            rel="noreferrer"
            className="min-h-9 rounded-md border border-white/10 px-3 py-2 text-sm text-zinc-200 hover:border-white/25"
          >
            Google Maps ↗
          </a>
        </div>
      </section>

      {parcel.applications.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">County applications on this parcel</h3>
          <ul className="flex flex-col gap-2 text-sm">
            {parcel.applications.map((application) => (
              <li key={[application.type, application.status, application.project, application.description].join("|")} className="rounded-lg border border-white/10 p-3">
                <p className="text-zinc-200">
                  {application.type} · <span className="text-zinc-400">{application.status.toLowerCase()}</span>
                  {application.opened && <span className="text-zinc-500"> · opened {application.opened}</span>}
                </p>
                <p className="mt-1 text-zinc-400">{application.description || application.project}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
