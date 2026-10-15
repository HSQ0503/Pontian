"use client";

import { useState } from "react";
import { ArrowUpRight, X } from "lucide-react";
import { decisionTitle, describeCode, intensityLabels, isRelatedOwner, matchLabel, outcomeNote, statusChoice, trackStatuses, yearsHeld, type Decision, type Scored, type TrackStatus } from "./parcels";
import { setTracking, useTracking } from "./store";
import styles from "./tracker.module.css";

type Brief = {
  verdict: string;
  summary: string;
  whyItMayFit: string[];
  obstacles: string[];
  nearbyActivity: string[];
  questionsToVerify: string[];
};

const money = (value: number) => (value ? `$${value.toLocaleString()}` : "—");

export function placeName(parcel: { address: string; propertyName: string; parcelNumber: string }) {
  if (parcel.address && parcel.address !== "UNASSIGNED") return parcel.address;
  return parcel.propertyName || `Parcel ${parcel.parcelNumber}`;
}

export function plainSummary(parcel: Scored) {
  const decision = parcel.decisions[0];
  const rejected = parcel.signals.find((signal) => signal.id === "rejected-here");
  if (rejected?.detail.includes("approved later")) {
    return "An application was turned down, but the zoning may have changed since. Confirm that before treating the land as available.";
  }
  if (rejected?.detail.includes("split up") || rejected?.detail.includes("subdivided")) {
    return "An application was turned down, but the land has since been split up.";
  }
  if (decision) {
    const text = decision.reasons.join(" ");
    const year = decision.date.slice(0, 4);
    const when = year ? ` in ${year}` : "";
    if (/withdrawn/i.test(text)) return `The owner withdrew an application${when}.`;
    if (/cancelled|canceled/i.test(text)) return `An application was cancelled${when}.`;
    if (/denial|denied/i.test(text)) return `${decision.government} recommended denying an application${when}.`;
    if (/inconsistent/i.test(text)) return `${decision.government} staff said an application did not fit the plan${when}.`;
    return `${decision.government} did not approve an application here${when}.`;
  }
  const ranked = parcel.signals.filter((signal) => signal.points > 0 && signal.id !== "close").sort((a, b) => b.points - a.points);
  const best = ranked[0];
  if (!best) return parcel.signals.find((signal) => signal.points > 0)?.detail ?? "Open it to read the public record.";
  if (best.id === "farm-use") return "It's still farm or timber land.";
  if (best.id === "near-rejected") return "It sits next to land where an application was turned down.";
  if (best.id === "vacant") return "The county lists it as vacant land.";
  if (best.id === "out-of-state") return best.detail.replace("Owner mailing address in", "The owner lives in");
  if (best.id === "owner-holdings") return best.detail.replace("This owner holds", "The same owner holds");
  return best.detail;
}

export const googleEmbed = (lat: number, lng: number, zoom = 18) => `https://maps.google.com/maps?q=${lat},${lng}&t=k&z=${zoom}&output=embed`;
const streetView = (lat: number, lng: number) => `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`;
const googleMaps = (lat: number, lng: number) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

function readableDetail(detail: string) {
  if (/^Classified today as /.test(detail)) return "It's still farm or timber land.";
  const approvals = detail.match(/^(\d+) county rezoning or land-use approvals within a mile since (\d+)\.$/);
  if (approvals) return Number(approvals[1]) === 1 ? `One nearby approval since ${approvals[2]}.` : `${approvals[1]} nearby approvals since ${approvals[2]}.`;
  return detail;
}

function levelText(level: Scored["zoningLevel"]) {
  if (level === null) return "not classified";
  if (level === "public") return "public or institutional";
  return intensityLabels[level].toLowerCase();
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-3 py-2 text-[13px]">
      <dt className="text-[#8a8a88]">{label}</dt>
      <dd className="break-words text-[#eeeeec]">{value || "—"}</dd>
    </div>
  );
}

function Points({ title, items, tone }: { title: string; items: string[]; tone: "good" | "warn" | "info" }) {
  if (items.length === 0) return null;
  const bar = tone === "good" ? "bg-[#fdd907]" : tone === "warn" ? "bg-[#f51625]" : "bg-[#3d9bff]";
  return (
    <section>
      <h3 className="mb-2 text-[12px] text-[#a6a6a6]">{title}</h3>
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-[13px] leading-relaxed text-[#d4d4d2]">
            <span className={`mt-[7px] block size-1.5 shrink-0 rotate-45 ${bar}`} aria-hidden />
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function DecisionCard({ decision, note }: { decision: Decision; note?: string | null }) {
  return (
    <article className="border border-[#3a2023] bg-[#f51625]/[0.06] p-4">
      <p className="text-[12px] text-[#f8a3a9]">
        {decision.government}
        {decision.caseNumber && ` · ${decision.caseNumber}`}
        {decision.date && ` · ${decision.date}`}
      </p>
      <h4 className={`${styles.headline} mt-1 text-[17px] text-[#eeeeec]`}>{decisionTitle(decision)}</h4>
      {decision.request && <p className="mt-2 text-[13px] leading-relaxed text-[#b8b8b6]">{decision.request}</p>}
      <ul className="mt-3 flex flex-col gap-1.5 text-[13px] text-[#eeeeec]">
        {decision.reasons.map((reason) => (
          <li key={reason} className="flex gap-2.5">
            <span className="mt-[7px] block size-1.5 shrink-0 rotate-45 bg-[#f51625]" aria-hidden />
            {reason}
          </li>
        ))}
      </ul>
          {(decision.fromZoning || decision.toZoning) && (
            <p className="mt-3 text-[13px] leading-relaxed text-[#d4d4d2]">
              They asked to change the zoning from {decision.fromZoning || "the current zoning"} to {decision.toZoning || "a new category"}.
            </p>
          )}
      {decision.meetings.length > 1 && <p className="mt-1 text-[12px] text-[#a6a6a6]">Heard on {decision.meetings.join(", ")}</p>}
      {note && <p className="mt-2 text-[12px] text-[#eeeeec]">{note}</p>}
      {decision.located && decision.located !== "parcel number in the record" && (
        <p className="mt-2 text-[12px] text-[#a6a6a6]">Located by {decision.located}. Confirm the boundary before relying on it.</p>
      )}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
        {decision.sources.map((source) => (
          <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[12px] text-[#eeeeec] underline decoration-[#5a5a58] underline-offset-4 hover:decoration-[#fdd907]">
            {source.label} <ArrowUpRight size={12} />
          </a>
        ))}
      </div>
    </article>
  );
}

export function ParcelDetail({ parcel, onClose }: { parcel: Scored; onClose: () => void }) {
  const tracking = useTracking();
  const track = tracking[parcel.id];
  const [note, setNote] = useState(track?.note ?? "");
  const [research, setResearch] = useState<{ status: "idle" | "loading" | "done" | "error"; brief?: Brief; error?: string }>({ status: "idle" });

  const positives = parcel.signals.filter((signal) => signal.points > 0 && signal.id !== "rejected-here");
  const cautions = parcel.signals.filter((signal) => signal.points < 0);
  const notes = parcel.signals.filter((signal) => signal.points === 0);
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
          signals: parcel.signals.map((signal) => signal.detail).slice(0, 20),
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
    <article className="flex flex-col">
      <div className="relative aspect-[16/10] w-full shrink-0 border-b border-[#262626] bg-[#111]">
        <iframe
          key={parcel.id}
          title={`Google satellite view of ${parcel.address || parcel.parcelNumber}`}
          src={googleEmbed(parcel.lat, parcel.lng, parcel.acres > 40 ? 16 : parcel.acres > 8 ? 17 : 18)}
          className="absolute inset-0 h-full w-full"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close parcel"
          className="absolute right-3 top-3 grid size-10 place-items-center bg-[#f8f8f6] text-[#252525] hover:bg-[#dcdcd9]"
        >
          <X size={18} strokeWidth={1.5} />
        </button>
      </div>

      <div className="flex flex-col gap-6 p-5">
        <header>
          <p className="text-[13px] text-[#a6a6a6]">
            {parcel.jurisdiction.replace(" Lake County", "")} · {Number(parcel.acres.toFixed(1))} acres · {Number(parcel.distanceMiles.toFixed(1))} miles from Crooked Can
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="bg-[#fdd907] px-2 py-1 text-[12px] font-medium text-[#111]">{matchLabel(parcel.score)}</span>
            {track && <span className="border border-[#fdd907]/60 px-2 py-1 text-[12px] text-[#fdd907]">{statusChoice[track.status].label}</span>}
          </div>
          <h2 className={`${styles.headline} mt-3 text-[28px] leading-tight text-[#eeeeec]`}>{placeName(parcel)}</h2>
          <p className="mt-1 text-[15px] text-[#d4d4d2]">{parcel.owner}</p>
          <p className="mt-3 text-[16px] leading-relaxed text-[#eeeeec]">{plainSummary(parcel)}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a href={streetView(parcel.lat, parcel.lng)} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1.5 border border-[#3a3a3a] px-3 text-[14px] text-[#eeeeec] hover:border-[#fdd907]">
              Street View <ArrowUpRight size={14} />
            </a>
            <a href={googleMaps(parcel.lat, parcel.lng)} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1.5 border border-[#3a3a3a] px-3 text-[14px] text-[#eeeeec] hover:border-[#fdd907]">
              Google Maps <ArrowUpRight size={14} />
            </a>
            {parcel.link && (
              <a href={parcel.link} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1.5 border border-[#3a3a3a] px-3 text-[14px] text-[#eeeeec] hover:border-[#fdd907]">
                County record <ArrowUpRight size={14} />
              </a>
            )}
          </div>
        </header>

        {isRelatedOwner(parcel) && (
          <p className="border border-[#3a3a3a] p-3 text-[13px] text-[#d4d4d2]">This owner holds Hills City Center land, so it may be Skorman&apos;s. Confirm with Max before treating it as a lead.</p>
        )}

        {parcel.decisions.length > 0 && (
          <section className="flex flex-col gap-3">
            <h3 className="text-[15px] text-[#eeeeec]">What the city or county decided</h3>
            {parcel.decisions.map((decision) => (
              <DecisionCard key={decision.id} decision={decision} note={outcomeNote(parcel, decision)} />
            ))}
          </section>
        )}

        <Points title="Why it is on this list" items={positives.map((signal) => readableDetail(signal.detail))} tone="good" />
        <Points title="Watch outs" items={cautions.map((signal) => readableDetail(signal.detail))} tone="warn" />
        <Points title="Check before relying on this" items={notes.map((signal) => readableDetail(signal.detail))} tone="info" />

        <section className="border border-[#262626] p-4">
          <h3 className="text-[16px] text-[#eeeeec]">What should we do with this?</h3>
          <p className="mt-1 text-[13px] leading-relaxed text-[#8a8a88]">Saved on this computer only, until the shared list is ready.</p>
          <div className="mt-3 grid gap-2">
            {trackStatuses.map((status) => {
              const choice = statusChoice[status];
              const selected = track?.status === status;
              return (
                <button
                  key={status}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setTracking(parcel.id, selected ? null : (status as TrackStatus), note)}
                  className={`flex min-h-11 items-center justify-between gap-3 border px-3 text-left transition-colors duration-200 ${selected ? "border-[#fdd907] bg-[#fdd907] text-[#111]" : "border-[#303030] text-[#eeeeec] hover:border-[#5a5a58]"}`}
                >
                  <span className="text-[15px]">{choice.label}</span>
                  <span className={`text-[12px] ${selected ? "text-[#252525]" : "text-[#8a8a88]"}`}>{choice.hint}</span>
                </button>
              );
            })}
          </div>
          <label className="mt-3 block text-[13px] text-[#a6a6a6]">
            Note
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              onBlur={() => setTracking(parcel.id, track?.status ?? null, note)}
              rows={3}
              placeholder="Who to call, or what you learned"
              className="mt-1.5 w-full border border-[#262626] bg-[#0e0e0e] px-3 py-2 text-[15px] text-[#eeeeec] placeholder:text-[#7a7a78] focus:border-[#fdd907] focus:outline-none"
            />
          </label>
        </section>

        <section className="border border-[#262626] p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[16px] text-[#eeeeec]">Plain-English summary</h3>
            <button type="button" onClick={runResearch} disabled={research.status === "loading"} className="min-h-11 bg-[#f8f8f6] px-3 text-[14px] text-[#252525] hover:bg-[#dcdcd9] disabled:opacity-60">
              {research.status === "loading" ? "Writing…" : research.status === "done" ? "Write again" : "Write a summary"}
            </button>
          </div>
          <p className="mt-2 text-[14px] leading-relaxed text-[#a6a6a6]">
            Looks up recent sales and nearby county applications, then explains them in a few sentences. Check the sources before acting on it.
          </p>
          {research.status === "error" && <p className="mt-3 text-[13px] text-[#f8a3a9]">{research.error}</p>}
          {research.brief && (
            <div className="mt-4 flex flex-col gap-4">
              <p className="text-[13px] leading-relaxed text-[#eeeeec]">
                <span className="mr-2 bg-[#fdd907] px-1.5 py-0.5 text-[11px] text-[#111]">{research.brief.verdict}</span>
                {research.brief.summary}
              </p>
              <Points title="Why it may fit" items={research.brief.whyItMayFit} tone="good" />
              <Points title="Obstacles" items={research.brief.obstacles} tone="warn" />
              <Points title="Nearby activity" items={research.brief.nearbyActivity} tone="info" />
              <Points title="Questions to verify" items={research.brief.questionsToVerify} tone="info" />
            </div>
          )}
        </section>

        <details className="border border-[#262626] p-4">
          <summary className="text-[15px] text-[#eeeeec]">Full public record</summary>
          <dl className="mt-2 divide-y divide-[#1e1e1e]">
            <Fact label="Owner" value={parcel.owner} />
            <Fact label="Mailing address" value={[parcel.ownerAddress, parcel.ownerCity, parcel.ownerState, parcel.ownerZip].filter(Boolean).join(", ")} />
            <Fact label="Parcel number" value={`${parcel.parcelNumber} · county ID ${parcel.id}`} />
            <Fact label="Zoning" value={`${describeCode(parcel.zoning, parcel.zoningName)}, ${levelText(parcel.zoningLevel)}`} />
            <Fact label="Zoning source" value={parcel.zoningSource} />
            <Fact label="Land-use plan" value={`${describeCode(parcel.flu, parcel.fluName)}, ${levelText(parcel.planLevel)}`} />
            {parcel.lastRezoning && <Fact label="Last rezoning" value={`${parcel.lastRezoning.change} · ordinance ${parcel.lastRezoning.ordinance} · ${parcel.lastRezoning.date}`} />}
            {parcel.annexed && <Fact label="Annexed" value={`Into ${parcel.annexed.city} · ordinance ${parcel.annexed.ordinance} · ${parcel.annexed.date}`} />}
            <Fact label="Current use" value={parcel.landUse} />
            <Fact label="Assessed value" value={`${money(parcel.justValue)} (land ${money(parcel.landValue)}, buildings ${money(parcel.buildingValue)})`} />
            <Fact label="Last sale" value={parcel.lastSaleDate ? `${parcel.lastSaleDate} for ${money(parcel.lastSalePrice)}${held !== null ? ` · ${held} years ago` : ""}` : "No sale on record"} />
            <Fact label="Wetlands / flood" value={`${parcel.wetlandPct}% wetland · ${parcel.floodPct}% flood zone`} />
          </dl>
        </details>
      </div>
    </article>
  );
}
