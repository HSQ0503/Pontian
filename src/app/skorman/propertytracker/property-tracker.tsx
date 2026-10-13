"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Download, SlidersHorizontal } from "lucide-react";
import { FilterPanel } from "./filter-panel";
import { DecisionCard, ParcelDetail, googleEmbed } from "./parcel-detail";
import { ParcelMap, scoreColor, type MapView } from "./parcel-map";
import {
  applyFilters,
  decisionTitle,
  defaultFilters,
  hasSignal,
  isRelatedOwner,
  scoreParcels,
  signalCatalog,
  toCsv,
  type Decision,
  type Filters,
  type ParcelData,
} from "./parcels";
import { useTracking } from "./store";
import styles from "./tracker.module.css";

const LIST_LIMIT = 150;

const legend = [
  { label: "60+", color: scoreColor(60) },
  { label: "40–59", color: scoreColor(40) },
  { label: "20–39", color: scoreColor(20) },
  { label: "Under 20", color: scoreColor(0) },
];

const scoring = [
  "Rejected or withdrawn application on the parcel: +32, or +40 when today's zoning shows the change never happened (+16 if the land sold after the application, 0 if it has been subdivided since)",
  "Land-use plan allows much more than current zoning: +25 (somewhat more: +10)",
  "Within 1 mile of Crooked Can: +16 (2 miles: +12, 3 miles: +8) · next to a rejected application: +8",
  "Held 25+ years: +12 (15+ years: +8) · farm or timber use: +8 · vacant: +6",
  "Owner outside Florida, owner holds several nearby parcels, or recent approvals nearby: +4 each",
  "Platted subdivision −30 · subdivided since the application −20 · builder-owned −20 · rezoned in the last 5 years −15 · Green Swamp −15 · built on −15 · wetlands over 30% −12 · flood zone over 30% −8",
];

type Tab = "parcels" | "decisions";

export function PropertyTracker() {
  const [data, setData] = useState<ParcelData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDecision, setSelectedDecision] = useState<Decision | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [view, setView] = useState<MapView | "google">("parcels");
  const [tab, setTab] = useState<Tab>("parcels");
  const tracking = useTracking();

  useEffect(() => {
    fetch("/skorman/parcels.json")
      .then((response) => (response.ok ? response.json() : Promise.reject(response.status)))
      .then(setData)
      .catch(() => setLoadError(true));
  }, []);

  const scored = useMemo(() => (data ? scoreParcels(data) : []), [data]);
  const results = useMemo(() => applyFilters(scored, filters, tracking), [scored, filters, tracking]);
  const related = useMemo(() => scored.filter(isRelatedOwner), [scored]);
  const jurisdictions = useMemo(() => [...new Set(scored.map((parcel) => parcel.jurisdiction))].sort(), [scored]);
  const rejectedCount = useMemo(() => scored.filter((parcel) => hasSignal(parcel, "rejected-here")).length, [scored]);
  const decisions = useMemo(() => [...(data?.decisions ?? [])].sort((a, b) => (a.distanceMiles ?? 99) - (b.distanceMiles ?? 99)), [data]);
  const selected = scored.find((parcel) => parcel.id === selectedId) ?? null;
  const focus = selected ?? (selectedDecision?.point ? selectedDecision.point : data?.center);

  function selectParcel(id: string) {
    setSelectedId(id);
    setSelectedDecision(null);
  }

  function selectDecision(decision: Decision) {
    const parcelId = decision.parcelIds.find((id) => scored.some((parcel) => parcel.id === id));
    setSelectedDecision(parcelId ? null : decision);
    setSelectedId(parcelId ?? null);
  }

  function exportCsv() {
    const blob = new Blob([toCsv(results, tracking)], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `skorman-parcels-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  if (loadError) return <p className={`${styles.app} min-h-dvh p-8 text-[#d4d4d2]`}>The parcel data couldn&apos;t load. Refresh to try again.</p>;
  if (!data) {
    return (
      <div className={`${styles.app} grid min-h-dvh place-items-center`}>
        <p className="text-[13px] text-[#a6a6a6]">Loading Lake County parcels and public decisions…</p>
      </div>
    );
  }

  const pulled = new Date(data.generatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className={`${styles.app} flex min-h-dvh flex-col lg:h-dvh`}>
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-[#262626] px-4 lg:px-5">
        <div className="flex min-w-0 items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-[18px] font-medium tracking-[-0.04em]" aria-label="Pontian home">
            <span className={styles.mark}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/pontian/frontier-logo.png" alt="" style={{ mixBlendMode: "lighten" }} />
            </span>
            Pontian
          </Link>
          <span className="hidden h-6 w-px bg-[#303030] sm:block" aria-hidden />
          <div className="min-w-0">
            <p className="hidden truncate text-[11px] text-[#8a8a88] sm:block">Prepared for Skorman Development</p>
            <h1 className={`${styles.headline} truncate text-[17px] leading-tight`}>Property tracker</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-[12px] text-[#8a8a88] xl:block">Public records pulled {pulled}</span>
          <button
            type="button"
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
            className="flex h-9 items-center gap-2 whitespace-nowrap border border-[#3a3a3a] px-3 text-[13px] lg:hidden"
          >
            <SlidersHorizontal size={15} strokeWidth={1.5} /> Filters
          </button>
          <button
            type="button"
            onClick={exportCsv}
            aria-label={`Export ${results.length} parcels to CSV`}
            className="flex h-9 items-center gap-2 whitespace-nowrap bg-[#f8f8f6] px-3 text-[13px] text-[#252525] hover:bg-[#dcdcd9]"
          >
            <Download size={15} strokeWidth={1.5} />
            <span className="hidden sm:inline">Export {results.length}</span>
          </button>
        </div>
      </header>

      <div className="grid flex-1 lg:min-h-0 lg:grid-cols-[320px_minmax(0,1fr)_440px]">
        <aside className={`${filtersOpen ? "block" : "hidden"} ${styles.scroll} border-b border-[#262626] bg-[#0b0b0b] p-5 lg:block lg:overflow-y-auto lg:border-b-0 lg:border-r`}>
          <FilterPanel filters={filters} onChange={setFilters} jurisdictions={jurisdictions} rejectedCount={rejectedCount} />
          <details className="mt-6 border-t border-[#262626] pt-5 text-[12px] leading-relaxed text-[#8a8a88]">
            <summary className="cursor-pointer text-[12px] text-[#a6a6a6]">Where this data comes from</summary>
            <p className="mt-3">Pulled {pulled}. Parcels of {data.minAcres}+ acres within {data.radiusMiles} miles of Crooked Can, plus any parcel with a rejected application within 10 miles.</p>
            <ul className="mt-3 flex list-disc flex-col gap-1.5 pl-4">
              {data.sources.map((source) => (
                <li key={source}>{source}</li>
              ))}
            </ul>
            <p className="mt-3 text-[#a6a6a6]">Rejected and withdrawn applications</p>
            <ul className="mt-1.5 flex list-disc flex-col gap-1.5 pl-4">
              {data.decisionCoverage.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <p className="mt-3">
              Minneola and Montverde zoning in the county GIS dates from 2018. Annexations and county zoning are current. Treat city zoning as a starting point and confirm with the city.
            </p>
          </details>
        </aside>

        <main className="flex min-h-0 flex-col">
          <div className="relative h-[48vh] shrink-0 border-b border-[#262626] lg:h-[56%]">
            {view === "google" && focus ? (
              <iframe
                key={`${focus.lat},${focus.lng}`}
                title="Google Maps satellite view"
                src={googleEmbed(focus.lat, focus.lng, selected ? (selected.acres > 40 ? 16 : 17) : 15)}
                className="h-full w-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            ) : (
              <ParcelMap
                view={view === "google" ? "parcels" : view}
                parcels={results}
                related={related}
                decisions={decisions}
                center={data.center}
                selectedId={selectedId}
                focus={selectedDecision?.point ?? null}
                onSelect={selectParcel}
                onSelectDecision={selectDecision}
              />
            )}
            <div className="absolute left-3 top-3 z-[500] flex border border-[#3a3a3a] bg-[#080808]/90 backdrop-blur" role="group" aria-label="Map view">
              {(
                [
                  ["parcels", "Parcels"],
                  ["satellite", "Satellite"],
                  ["google", "Google Maps"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={view === value}
                  onClick={() => setView(value)}
                  className={`h-9 px-3 text-[12px] transition-colors ${view === value ? "bg-[#f8f8f6] text-[#252525]" : "text-[#d4d4d2] hover:text-white"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {view !== "google" && (
              <div className="pointer-events-none absolute bottom-3 left-3 z-[500] flex flex-wrap items-center gap-x-3 gap-y-1 border border-[#262626] bg-[#080808]/85 px-3 py-2 text-[11px] text-[#b8b8b6] backdrop-blur">
                {legend.map((item) => (
                  <span key={item.label} className="flex items-center gap-1.5">
                    <span className="size-2.5" style={{ background: item.color }} />
                    {item.label}
                  </span>
                ))}
                <span className="flex items-center gap-1.5">
                  <span className="block size-2.5 rotate-45 bg-[#f51625]" />
                  Rejected application
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="block size-2.5 rotate-45 bg-[#fdd907]" />
                  Crooked Can
                </span>
              </div>
            )}
            {view === "google" && (
              <p className="absolute bottom-3 left-3 z-[500] border border-[#262626] bg-[#080808]/85 px-3 py-2 text-[11px] text-[#b8b8b6]">
                Google shows the property itself. Switch to Parcels or Satellite to see boundaries.
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#262626] px-4">
            <div className="flex" role="tablist" aria-label="Results">
              {(
                [
                  ["parcels", `Parcels · ${results.length}`],
                  ["decisions", `Rejected applications · ${decisions.length}`],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={tab === value}
                  onClick={() => setTab(value)}
                  className={`-mb-px h-11 border-b-2 px-3 text-[13px] ${tab === value ? "border-[#fdd907] text-[#eeeeec]" : "border-transparent text-[#8a8a88] hover:text-[#d4d4d2]"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <details className="relative text-[12px] text-[#a6a6a6]">
              <summary className="cursor-pointer list-none py-2 hover:text-[#eeeeec]">How the score works</summary>
              <ul className="absolute right-0 top-full z-[600] mt-1 flex w-[min(460px,85vw)] list-disc flex-col gap-1.5 border border-[#303030] bg-[#141414] p-4 pl-8 leading-relaxed text-[#d4d4d2]">
                {scoring.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </details>
          </div>

          {tab === "parcels" ? (
            <ol className={`${styles.scroll} divide-y divide-[#1a1a1a] lg:min-h-0 lg:flex-1 lg:overflow-y-auto`}>
              {results.slice(0, LIST_LIMIT).map((parcel) => {
                const reasons = parcel.signals.filter((signal) => signal.points > 0).sort((a, b) => b.points - a.points).slice(0, 3);
                const track = tracking[parcel.id];
                const rejected = hasSignal(parcel, "rejected-here");
                return (
                  <li key={parcel.id}>
                    <button
                      type="button"
                      onClick={() => selectParcel(parcel.id)}
                      aria-current={parcel.id === selectedId}
                      className={`flex w-full gap-4 px-4 py-3.5 text-left transition-colors hover:bg-white/[0.03] ${parcel.id === selectedId ? "bg-white/[0.06]" : ""}`}
                    >
                      <span className={`${styles.headline} w-10 shrink-0 text-[24px] leading-none`} style={{ color: scoreColor(parcel.score) }}>
                        {parcel.score}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          {rejected && <span className="block size-2 rotate-45 bg-[#f51625]" aria-label="Rejected application" />}
                          <span className="truncate text-[14px] text-[#eeeeec]">{parcel.address && parcel.address !== "UNASSIGNED" ? parcel.address : `Parcel ${parcel.parcelNumber}`}</span>
                          {track && <span className="border border-[#fdd907]/60 px-1.5 text-[11px] text-[#fdd907]">{track.status}</span>}
                        </span>
                        <span className="mt-0.5 block truncate text-[12px] text-[#a6a6a6]">
                          {parcel.acres.toFixed(1)} ac · {parcel.distanceMiles.toFixed(1)} mi · {parcel.jurisdiction.replace(" Lake County", "")} · {parcel.owner}
                        </span>
                        {reasons.length > 0 && <span className="mt-1 block truncate text-[12px] text-[#7a7a78]">{reasons.map((signal) => signalCatalog[signal.id]).join(" · ")}</span>}
                      </span>
                    </button>
                  </li>
                );
              })}
              {results.length > LIST_LIMIT && <li className="px-4 py-3 text-[12px] text-[#8a8a88]">Showing the top {LIST_LIMIT}. Narrow the filters or export all {results.length}.</li>}
              {results.length === 0 && <li className="p-6 text-[13px] text-[#a6a6a6]">No parcels match. Loosen the filters or reset them.</li>}
            </ol>
          ) : (
            <ol className={`${styles.scroll} divide-y divide-[#1a1a1a] lg:min-h-0 lg:flex-1 lg:overflow-y-auto`}>
              {decisions.map((decision) => (
                <li key={decision.id}>
                  <button
                    type="button"
                    onClick={() => selectDecision(decision)}
                    className={`flex w-full gap-4 px-4 py-3.5 text-left transition-colors hover:bg-white/[0.03] ${selectedDecision?.id === decision.id || decision.parcelIds.includes(selectedId ?? "") ? "bg-white/[0.06]" : ""}`}
                  >
                    <span className="mt-1.5 block size-2.5 shrink-0 rotate-45 bg-[#f51625]" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] text-[#eeeeec]">{decisionTitle(decision)}</span>
                      <span className="mt-0.5 block truncate text-[12px] text-[#a6a6a6]">
                        {decision.government} · {decision.date || "date unknown"}
                        {decision.distanceMiles !== null && ` · ${decision.distanceMiles.toFixed(1)} mi`}
                        {decision.size && ` · ${decision.size}`}
                      </span>
                      <span className="mt-1 block truncate text-[12px] text-[#f8a3a9]">{decision.reasons.join(" · ")}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </main>

        <aside
          className={`${selected || selectedDecision ? "fixed inset-0 z-[1100] block overflow-y-auto bg-[#080808]" : "hidden"} ${styles.scroll} lg:static lg:z-auto lg:block lg:overflow-y-auto lg:border-l lg:border-[#262626] lg:bg-[#0b0b0b]`}
        >
          {selected ? (
            <ParcelDetail key={selected.id} parcel={selected} onClose={() => setSelectedId(null)} />
          ) : selectedDecision ? (
            <div className="flex flex-col gap-4 p-5">
              <button type="button" onClick={() => setSelectedDecision(null)} className="self-end text-[12px] text-[#a6a6a6] hover:text-[#eeeeec]">
                Close
              </button>
              <DecisionCard decision={selectedDecision} />
              <p className="text-[12px] leading-relaxed text-[#8a8a88]">
                This application isn&apos;t linked to a parcel in the dataset yet. Use the sources to find the property, then search its owner or parcel number.
              </p>
            </div>
          ) : (
            <div className="flex h-full flex-col justify-center gap-5 p-8">
              <div className={styles.accent} aria-hidden>
                <span />
                <span />
                <span />
              </div>
              <h2 className={`${styles.headline} text-[28px] leading-tight text-[#eeeeec]`}>Land around Hills City Center worth a closer look.</h2>
              <p className="text-[14px] leading-relaxed text-[#a6a6a6]">
                Select a parcel to see the property from above, why it appeared, any rejected or withdrawn applications on it, and its public record. Red diamonds mark applications the county or a city turned down or the owner withdrew.
              </p>
              <dl className="grid grid-cols-2 gap-px border border-[#262626] bg-[#262626]">
                <div className="bg-[#0b0b0b] p-4">
                  <dt className="text-[12px] text-[#8a8a88]">Parcels matching</dt>
                  <dd className={`${styles.headline} mt-1 text-[28px]`}>{results.length}</dd>
                </div>
                <div className="bg-[#0b0b0b] p-4">
                  <dt className="text-[12px] text-[#8a8a88]">Rejected applications</dt>
                  <dd className={`${styles.headline} mt-1 text-[28px] text-[#f51625]`}>{decisions.length}</dd>
                </div>
              </dl>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
