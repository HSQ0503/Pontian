"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Download, SlidersHorizontal } from "lucide-react";
import { FilterPanel, inputClass } from "./filter-panel";
import { DecisionCard, ParcelDetail, googleEmbed, placeName, plainSummary } from "./parcel-detail";
import { ParcelMap, scoreColor, type MapView } from "./parcel-map";
import {
  applyFilters,
  decisionTitle,
  defaultFilters,
  hasSignal,
  matchLabel,
  toCsv,
  isRelatedOwner,
  scoreParcels,
  statusChoice,
  type Decision,
  type Filters,
  type ParcelData,
  type Scored,
} from "./parcels";
import { useTracking } from "./store";
import styles from "./tracker.module.css";

const LIST_LIMIT = 40;

const legend = [
  { label: "Strong match", color: scoreColor(60) },
  { label: "Worth a look", color: scoreColor(40) },
  { label: "Possible", color: scoreColor(20) },
  { label: "Weak match", color: scoreColor(0) },
];

type Mode = "matches" | "turned-down" | "mine";

const modes: { id: Mode; label: string }[] = [
  { id: "matches", label: "Best matches" },
  { id: "turned-down", label: "Turned down" },
  { id: "mine", label: "My list" },
];

function milesLabel(miles: number, suffix: string) {
  const value = Number(miles.toFixed(1));
  const unit = value === 1 ? "mile" : "miles";
  return `${value} ${unit} ${suffix}`;
}

function plainDate(value: string) {
  if (!value) return "date unknown";
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function decisionSummary(decision: Decision) {
  const text = decision.reasons.join(" ");
  if (/withdrawn/i.test(text)) return "The owner withdrew the application.";
  if (/cancelled|canceled/i.test(text)) return "The application was cancelled.";
  if (/denial|denied/i.test(text)) return "The board recommended denying it.";
  if (/inconsistent/i.test(text)) return "Staff said it did not fit the plan.";
  return decision.reasons[0] ?? "The city or county did not approve it.";
}

function searchHit(parcel: Scored, search: string) {
  if (!search) return true;
  return [parcel.owner, parcel.address, parcel.parcelNumber, parcel.propertyName].some((value) => value.toLowerCase().includes(search));
}

export function PropertyTracker() {
  const [data, setData] = useState<ParcelData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [refresh, setRefresh] = useState<{ enabled: boolean; running: boolean; lastError: string | null; step: string } | null>(null);
  const recordsAt = useRef<string | null>(null);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDecision, setSelectedDecision] = useState<Decision | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [view, setView] = useState<MapView | "google">("parcels");
  const [mode, setMode] = useState<Mode>("matches");
  const tracking = useTracking();

  useEffect(() => {
    let cancelled = false;
    function loadParcels() {
      return fetch(`/skorman/parcels.json?t=${Date.now()}`)
        .then((response) => (response.ok ? response.json() : Promise.reject(response.status)))
        .then((next) => {
          if (!cancelled) setData(next);
        })
        .catch(() => {
          if (!cancelled) setLoadError(true);
        });
    }
    async function loadRefresh() {
      const response = await fetch("/api/skorman/refresh");
      if (cancelled) return;
      if (!response.ok) {
        setRefresh({ enabled: false, running: false, lastError: null, step: "" });
        return;
      }
      const next = (await response.json()) as { enabled: boolean; running: boolean; lastError: string | null; step: string; recordsAt: string | null };
      if (cancelled) return;
      setRefresh(next);
      if (recordsAt.current && next.recordsAt && next.recordsAt !== recordsAt.current) {
        recordsAt.current = next.recordsAt;
        await loadParcels();
      } else if (next.recordsAt) recordsAt.current = next.recordsAt;
    }
    void loadParcels();
    void loadRefresh();
    const timer = setInterval(() => void loadRefresh(), 5000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  async function readFilings() {
    setRefresh((current) => current && { ...current, running: true, lastError: null, step: "Starting" });
    const response = await fetch("/api/skorman/refresh", { method: "POST" });
    if (!response.ok) {
      setRefresh({ enabled: false, running: false, lastError: null, step: "" });
      return;
    }
    setRefresh(await response.json());
  }

  const scored = useMemo(() => (data ? scoreParcels(data) : []), [data]);
  const search = filters.search.trim().toLowerCase();
  const results = useMemo(() => applyFilters(scored, filters, tracking), [scored, filters, tracking]);
  const mine = useMemo(
    () => scored.filter((parcel) => tracking[parcel.id] && searchHit(parcel, search)).sort((a, b) => b.score - a.score || a.distanceMiles - b.distanceMiles),
    [scored, tracking, search],
  );
  const related = useMemo(() => scored.filter(isRelatedOwner), [scored]);
  const jurisdictions = useMemo(() => [...new Set(scored.map((parcel) => parcel.jurisdiction))].sort(), [scored]);
  const rejectedParcels = useMemo(() => scored.filter((parcel) => hasSignal(parcel, "rejected-here")), [scored]);
  const decisions = useMemo(() => [...(data?.decisions ?? [])].sort((a, b) => (a.distanceMiles ?? 99) - (b.distanceMiles ?? 99)), [data]);
  const visibleDecisions = useMemo(() => {
    if (!search) return decisions;
    return decisions.filter((decision) =>
      [decision.name, decision.owner, decision.location, decision.request, decision.caseNumber, decision.government].join(" ").toLowerCase().includes(search),
    );
  }, [decisions, search]);
  const listed = mode === "mine" ? mine : results;
  const mapParcels = mode === "turned-down" ? rejectedParcels : listed;
  const exportRows = mode === "turned-down" ? rejectedParcels : listed;
  const selected = scored.find((parcel) => parcel.id === selectedId) ?? null;
  const focus = selected ?? (selectedDecision?.point ? selectedDecision.point : data?.center);
  const savedCount = scored.filter((parcel) => tracking[parcel.id]).length;

  function selectParcel(id: string) {
    setSelectedId(id);
    setSelectedDecision(null);
  }

  function selectDecision(decision: Decision) {
    const parcelId = decision.parcelIds.find((id) => scored.some((parcel) => parcel.id === id));
    setSelectedDecision(parcelId ? null : decision);
    setSelectedId(parcelId ?? null);
  }

  function chooseMode(next: Mode) {
    setMode(next);
    setSelectedId(null);
    setSelectedDecision(null);
    setFilters((current) => {
      if (next === "matches") return { ...defaultFilters, search: current.search };
      if (next === "mine") return { ...defaultFilters, search: current.search, tracked: "tracked" };
      return { ...defaultFilters, search: current.search };
    });
  }

  function exportCsv() {
    const blob = new Blob([toCsv(exportRows, tracking)], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `skorman-places-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  if (loadError) {
    return (
      <p className={`${styles.app} min-h-dvh p-8 text-[16px] text-[#d4d4d2]`} role="alert">
        The places couldn&apos;t load. Refresh the page to try again.
      </p>
    );
  }
  if (!data) {
    return (
      <div className={`${styles.app} grid min-h-dvh place-items-center`}>
        <p className="text-[15px] text-[#a6a6a6]">Loading places near Crooked Can…</p>
      </div>
    );
  }

  const pulled = new Date(data.generatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const listCount = mode === "turned-down" ? visibleDecisions.length : listed.length;

  return (
    <div className={`${styles.app} flex h-dvh flex-col`}>
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
            <p className="hidden truncate text-[12px] text-[#8a8a88] sm:block">For Skorman Development</p>
            <h1 className={`${styles.headline} truncate text-[18px] leading-tight`}>Places to look at</h1>
          </div>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          className="flex min-h-11 items-center gap-2 px-2 text-[13px] text-[#a6a6a6] hover:text-[#eeeeec]"
        >
          <Download size={15} strokeWidth={1.5} />
          <span className="hidden sm:inline">Download list</span>
        </button>
      </header>

      <div className="shrink-0 border-b border-[#262626] px-4 py-4 lg:px-5">
        <p className="max-w-3xl text-[15px] leading-relaxed text-[#d4d4d2]">
          Land near Crooked Can where the zoning may be holding it back. Start with the best matches, then open one to see why.
        </p>
        <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center">
          <input
            value={filters.search}
            onChange={(event) => setFilters({ ...filters, search: event.target.value })}
            placeholder="Search an owner or address"
            aria-label="Search an owner or address"
            className={`${inputClass} lg:max-w-sm`}
          />
          <div className="flex flex-wrap gap-2" role="group" aria-label="Which places to show">
            {modes.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={mode === item.id}
                onClick={() => chooseMode(item.id)}
                className={`min-h-11 px-3 text-[14px] transition-colors duration-200 ${mode === item.id ? "bg-[#fdd907] text-[#111]" : "border border-[#3a3a3a] text-[#eeeeec] hover:border-[#fdd907]"}`}
              >
                {item.label}
                {item.id === "mine" && savedCount > 0 ? ` · ${savedCount}` : ""}
              </button>
            ))}
          </div>
          {mode === "matches" && (
            <select
              value={filters.sort}
              onChange={(event) => setFilters({ ...filters, sort: event.target.value as Filters["sort"] })}
              aria-label="Sort the list"
              className={`${inputClass} lg:ml-auto lg:w-52`}
            >
              <option value="score">Best matches first</option>
              <option value="distance">Closest first</option>
              <option value="acres">Largest first</option>
              <option value="held">Held longest first</option>
            </select>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {mode === "matches" && (
            <button
              type="button"
              onClick={() => setFiltersOpen((open) => !open)}
              aria-expanded={filtersOpen}
              className="flex min-h-11 items-center gap-2 border border-[#3a3a3a] px-3 text-[14px] text-[#eeeeec] hover:border-[#fdd907]"
            >
              <SlidersHorizontal size={15} strokeWidth={1.5} />
              {filtersOpen ? "Hide extra filters" : "Narrow the list"}
            </button>
          )}
          <p className="text-[13px] text-[#8a8a88]">
            {listCount} {mode === "turned-down" ? (listCount === 1 ? "application" : "applications") : listCount === 1 ? "place" : "places"}
            <span className="hidden sm:inline"> · public records from {pulled}</span>
          </p>
          {refresh?.enabled && (
            <button
              type="button"
              onClick={() => void readFilings()}
              disabled={refresh.running}
              className="min-h-11 border border-[#3a3a3a] px-3 text-[14px] text-[#eeeeec] hover:border-[#fdd907] disabled:opacity-60"
            >
              {refresh.running ? "Reading filings…" : "Read filings again"}
            </button>
          )}
          <details className="text-[13px] leading-relaxed text-[#8a8a88]">
            <summary className="min-h-11 py-2 text-[#a6a6a6]">Where this comes from</summary>
            <p className="max-w-3xl pb-2">
              County and city meeting records through {pulled}. While this computer is running the tracker, those records are read again every 6 hours. City zoning for Minneola and Montverde is an older map, so confirm those with the city. This is a starting list, not a recommendation to buy.
            </p>
          </details>
        </div>
        {refresh?.running && (
          <p className="mt-3 text-[14px] text-[#d4d4d2]" role="status">
            Reading the county and city filings again. This usually takes several minutes.{refresh.step ? ` ${refresh.step}` : ""}
          </p>
        )}
        {refresh?.lastError && (
          <p className="mt-3 text-[14px] text-[#f8a3a9]" role="alert">
            The last read failed: {refresh.lastError}
          </p>
        )}
        {filtersOpen && mode === "matches" && (
          <div className="mt-4 max-w-xl border border-[#262626] bg-[#0b0b0b] p-4">
            <FilterPanel filters={filters} onChange={setFilters} jurisdictions={jurisdictions} rejectedCount={rejectedParcels.length} />
          </div>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <section className={`${styles.scroll} min-h-0 flex-1 overflow-y-auto border-b border-[#262626] lg:order-1 lg:w-[400px] lg:flex-none lg:border-b-0 lg:border-r`} aria-label="Places">
          {mode === "turned-down" ? (
            <ol className="divide-y divide-[#1a1a1a]">
              {visibleDecisions.map((decision) => (
                <li key={decision.id}>
                  <button
                    type="button"
                    onClick={() => selectDecision(decision)}
                    className={`flex w-full gap-3 px-4 py-4 text-left transition-colors duration-200 hover:bg-white/[0.04] ${selectedDecision?.id === decision.id || decision.parcelIds.includes(selectedId ?? "") ? "bg-white/[0.06]" : ""}`}
                  >
                    <span className="mt-1.5 block size-2.5 shrink-0 rotate-45 bg-[#f51625]" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[16px] leading-snug text-[#eeeeec]">{decisionTitle(decision)}</span>
                      <span className="mt-1 block text-[13px] leading-relaxed text-[#a6a6a6]">
                        {decision.government} · {plainDate(decision.date)}
                        {decision.distanceMiles !== null && ` · ${milesLabel(decision.distanceMiles, "away")}`}
                        {decision.size ? ` · ${decision.size}` : ""}
                      </span>
                      <span className="mt-1.5 block text-[14px] leading-relaxed text-[#d4d4d2]">{decisionSummary(decision)}</span>
                    </span>
                  </button>
                </li>
              ))}
              {visibleDecisions.length === 0 && <li className="p-6 text-[15px] text-[#a6a6a6]">No applications match that search.</li>}
            </ol>
          ) : (
            <ol className="divide-y divide-[#1a1a1a]">
              {listed.slice(0, LIST_LIMIT).map((parcel) => {
                const track = tracking[parcel.id];
                return (
                  <li key={parcel.id}>
                    <button
                      type="button"
                      onClick={() => selectParcel(parcel.id)}
                      aria-current={parcel.id === selectedId ? "true" : undefined}
                      className={`flex w-full flex-col gap-1.5 px-4 py-4 text-left transition-colors duration-200 hover:bg-white/[0.04] ${parcel.id === selectedId ? "bg-white/[0.06]" : ""}`}
                    >
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-[12px] font-medium" style={{ color: parcel.score >= 20 ? scoreColor(parcel.score) : "#c8c8c6" }}>
                          {matchLabel(parcel.score)}
                        </span>
                        {track && <span className="border border-[#fdd907]/60 px-1.5 py-0.5 text-[11px] text-[#fdd907]">{statusChoice[track.status].label}</span>}
                      </span>
                      <span className="text-[16px] leading-snug text-[#eeeeec]">{placeName(parcel)}</span>
                      <span className="text-[13px] text-[#a6a6a6]">
                        {Number(parcel.acres.toFixed(1))} acres · {milesLabel(parcel.distanceMiles, "away")} · {parcel.owner}
                      </span>
                      <span className="line-clamp-2 text-[14px] leading-relaxed text-[#d4d4d2]">{plainSummary(parcel)}</span>
                    </button>
                  </li>
                );
              })}
              {listed.length > LIST_LIMIT && (
                <li className="px-4 py-4 text-[14px] leading-relaxed text-[#a6a6a6]">
                  Showing the first {LIST_LIMIT}. Use Narrow the list, or download all {listed.length}.
                </li>
              )}
              {listed.length === 0 && (
                <li className="p-6 text-[15px] leading-relaxed text-[#a6a6a6]">
                  {mode === "mine" ? "Nothing saved yet. Open a place and choose Save." : "Nothing matches. Clear the search, or reset the extra filters."}
                </li>
              )}
            </ol>
          )}
        </section>

        <section className="relative order-first max-lg:h-[240px] max-lg:shrink-0 lg:order-2 lg:min-h-0 lg:flex-1">
          <div className="absolute inset-0">
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
                parcels={mapParcels}
                related={related}
                decisions={mode === "turned-down" ? visibleDecisions : []}
                center={data.center}
                selectedId={selectedId}
                focus={selectedDecision?.point ?? null}
                onSelect={selectParcel}
                onSelectDecision={selectDecision}
              />
            )}
            <div className="absolute left-3 top-3 z-[500] flex border border-[#3a3a3a] bg-[#080808]/90 backdrop-blur" role="group" aria-label="Map style">
              {(
                [
                  ["parcels", "Map"],
                  ["satellite", "Satellite"],
                  ["google", "Google"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={view === value}
                  onClick={() => setView(value)}
                  className={`min-h-11 px-3 text-[13px] transition-colors duration-200 ${view === value ? "bg-[#f8f8f6] text-[#252525]" : "text-[#d4d4d2] hover:text-white"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {view !== "google" && (
              <div className="pointer-events-none absolute bottom-3 left-3 right-14 z-[500] flex flex-wrap items-center gap-x-3 gap-y-1 border border-[#262626] bg-[#080808]/90 px-3 py-2 text-[12px] text-[#d4d4d2] backdrop-blur">
                {legend.map((item) => (
                  <span key={item.label} className="flex items-center gap-1.5">
                    <span className="size-2.5" style={{ background: item.color }} />
                    {item.label}
                  </span>
                ))}
                {mode === "turned-down" && (
                  <span className="flex items-center gap-1.5">
                    <span className="block size-2.5 rotate-45 bg-[#f51625]" />
                    Turned down
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <span className="block size-2.5 rotate-45 bg-[#fdd907]" />
                  Crooked Can
                </span>
              </div>
            )}
          </div>

          {(selected || selectedDecision) && (
            <aside className={`${styles.scroll} fixed inset-0 z-[1100] overflow-y-auto bg-[#080808] lg:absolute lg:inset-y-0 lg:left-auto lg:right-0 lg:w-[440px] lg:border-l lg:border-[#262626]`}>
              {selected ? (
                <ParcelDetail key={selected.id} parcel={selected} onClose={() => setSelectedId(null)} />
              ) : selectedDecision ? (
                <div className="flex flex-col gap-4 p-5">
                  <button type="button" onClick={() => setSelectedDecision(null)} className="min-h-11 self-start border border-[#3a3a3a] px-3 text-[14px] text-[#eeeeec] hover:border-[#fdd907]">
                    Back to the list
                  </button>
                  <DecisionCard decision={selectedDecision} />
                  <p className="text-[14px] leading-relaxed text-[#a6a6a6]">
                    This application isn&apos;t tied to a parcel in the list yet. Use the links above to find the property, then search its owner or address.
                  </p>
                </div>
              ) : null}
            </aside>
          )}
        </section>
      </div>
    </div>
  );
}
