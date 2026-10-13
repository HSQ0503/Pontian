"use client";

import { useEffect, useMemo, useState } from "react";
import { FilterPanel } from "./filter-panel";
import { ParcelDetail } from "./parcel-detail";
import { ParcelMap } from "./parcel-map";
import {
  applyFilters,
  defaultFilters,
  isRelatedOwner,
  scoreParcels,
  signalCatalog,
  toCsv,
  type Filters,
  type ParcelData,
} from "./parcels";
import { useTracking } from "./store";
import styles from "./tracker.module.css";

const LIST_LIMIT = 150;

const legend = [
  { label: "60+", color: "#fdd907" },
  { label: "40–59", color: "#f59e0b" },
  { label: "20–39", color: "#38bdf8" },
  { label: "Under 20", color: "#71717a" },
];

const scoring = [
  "Land-use plan allows much more than current zoning: +30 (somewhat more: +12)",
  "Earlier county development application cancelled or denied: +20",
  "Within 1 mile of Crooked Can: +20 (2 miles: +15, 3 miles: +10)",
  "Held 25+ years: +15 (15+ years: +10, no sale on record: +5)",
  "Still in farm or timber use: +10 · vacant: +8 · owner outside Florida: +5 · owner holds several nearby parcels: +5",
  "Wetlands over 30%: −15 (over 60%: −25) · flood zone over 30%: −10 · already built on: −15",
];

export function PropertyTracker() {
  const [data, setData] = useState<ParcelData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const tracking = useTracking();

  useEffect(() => {
    fetch("/skorman/parcels.json")
      .then((response) => (response.ok ? response.json() : Promise.reject(response.status)))
      .then(setData)
      .catch(() => setLoadError(true));
  }, []);

  const scored = useMemo(() => (data ? scoreParcels(data.parcels) : []), [data]);
  const results = useMemo(() => applyFilters(scored, filters, tracking), [scored, filters, tracking]);
  const related = useMemo(() => scored.filter(isRelatedOwner), [scored]);
  const jurisdictions = useMemo(() => [...new Set(scored.map((parcel) => parcel.jurisdiction))].sort(), [scored]);
  const selected = scored.find((parcel) => parcel.id === selectedId) ?? null;

  function exportCsv() {
    const blob = new Blob([toCsv(results, tracking)], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `skorman-parcels-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  if (loadError) return <p className={`${styles.app} p-8 text-zinc-300`}>The parcel data couldn&apos;t load. Refresh to try again.</p>;
  if (!data) return <p className={`${styles.app} p-8 text-zinc-400`}>Loading Lake County parcels…</p>;

  return (
    <div className={`${styles.app} flex min-h-dvh flex-col bg-[#0a0a0a] text-zinc-100 lg:h-dvh`}>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Pontian · Skorman Development</p>
          <h1 className="text-base font-semibold">Property tracker</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
            className="min-h-10 rounded-md border border-white/10 px-3 text-sm text-zinc-200 lg:hidden"
          >
            Filters
          </button>
          <button type="button" onClick={exportCsv} className="min-h-10 rounded-md bg-zinc-100 px-3 text-sm font-medium text-zinc-950 hover:bg-white">
            Export {results.length} to CSV
          </button>
        </div>
      </header>

      <div className="grid flex-1 lg:min-h-0 lg:grid-cols-[300px_minmax(0,1fr)_420px]">
        <aside className={`${filtersOpen ? "block" : "hidden"} border-b border-white/10 p-4 lg:block lg:overflow-y-auto lg:border-b-0 lg:border-r`}>
          <FilterPanel filters={filters} onChange={setFilters} jurisdictions={jurisdictions} />
          <div className="mt-6 border-t border-white/10 pt-4 text-xs leading-relaxed text-zinc-500">
            <p>
              Public Lake County records pulled {new Date(data.generatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}: parcels of {data.minAcres}+ acres within {data.radiusMiles} miles of Crooked Can.
            </p>
            <p className="mt-2">
              Zoning and land-use plan comparisons are approximate. County applications cover unincorporated areas only. Confirm anything important with the property appraiser and planning staff.
            </p>
          </div>
        </aside>

        <main className="flex min-h-0 flex-col">
          <div className="relative h-[45vh] shrink-0 lg:h-[52%]">
            <ParcelMap parcels={results} related={related} center={data.center} selectedId={selectedId} onSelect={setSelectedId} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-y border-white/10 px-4 py-2.5 text-sm">
            <p className="text-zinc-300">
              <span className="font-semibold tabular-nums text-zinc-50">{results.length}</span> parcels match
              {results.length > LIST_LIMIT && <span className="text-zinc-500"> · showing the top {LIST_LIMIT}</span>}
            </p>
            <div className="flex items-center gap-3 text-xs text-zinc-400">
              {legend.map((item) => (
                <span key={item.label} className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-sm" style={{ background: item.color }} />
                  {item.label}
                </span>
              ))}
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm border border-dashed border-zinc-300" />
                Possible Skorman
              </span>
            </div>
          </div>
          <details className="border-b border-white/10 px-4 py-2 text-sm text-zinc-400">
            <summary className="cursor-pointer py-1 text-zinc-300">How the score works</summary>
            <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-xs">
              {scoring.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </details>
          <ol className="divide-y divide-white/5 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
            {results.slice(0, LIST_LIMIT).map((parcel) => {
              const reasons = parcel.signals.filter((signal) => signal.points > 0).sort((a, b) => b.points - a.points).slice(0, 3);
              const track = tracking[parcel.id];
              return (
                <li key={parcel.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(parcel.id)}
                    aria-current={parcel.id === selectedId}
                    className={`flex w-full gap-3 px-4 py-3 text-left hover:bg-white/[0.03] ${parcel.id === selectedId ? "bg-white/[0.06]" : ""}`}
                  >
                    <span className="mt-0.5 w-9 shrink-0 text-lg font-semibold tabular-nums text-yellow-200">{parcel.score}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-medium text-zinc-100">{parcel.address || parcel.parcelNumber}</span>
                        {track && <span className="rounded-full border border-yellow-300/40 px-2 text-[11px] text-yellow-200">{track.status}</span>}
                      </span>
                      <span className="block truncate text-sm text-zinc-400">
                        {parcel.acres.toFixed(1)} ac · {parcel.distanceMiles.toFixed(1)} mi · {parcel.owner}
                      </span>
                      {reasons.length > 0 && (
                        <span className="mt-1 block text-xs text-zinc-500">{reasons.map((signal) => signalCatalog[signal.id]).join(" · ")}</span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
            {results.length === 0 && <li className="p-6 text-sm text-zinc-400">No parcels match. Loosen the filters or reset them.</li>}
          </ol>
        </main>

        <aside
          className={`${selected ? "fixed inset-0 z-[1100] block overflow-y-auto bg-[#0a0a0a] p-5" : "hidden"} lg:static lg:z-auto lg:block lg:overflow-y-auto lg:border-l lg:border-white/10 lg:p-5`}
        >
          {selected ? (
            <ParcelDetail key={selected.id} parcel={selected} onClose={() => setSelectedId(null)} />
          ) : (
            <div className="text-sm text-zinc-400">
              <p className="text-zinc-200">Select a parcel on the map or in the list.</p>
              <p className="mt-2">Each one shows why it appeared, what to watch out for, its public record, and an AI research brief on request.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
