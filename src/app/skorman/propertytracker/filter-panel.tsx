"use client";

import { useState, type ReactNode } from "react";
import {
  defaultFilters,
  ruleFields,
  ruleOperators,
  signalCatalog,
  trackStatuses,
  type Filters,
  type Rule,
  type RuleField,
  type RuleOperator,
  type SignalId,
} from "./parcels";
import { deleteView, saveView, useSavedViews } from "./store";

const inputClass =
  "w-full rounded-md border border-white/10 bg-zinc-900 px-2.5 py-2 text-[15px] text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-400 focus:outline-none";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-t border-white/10 pt-4">
      <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500">{title}</h3>
      {children}
    </section>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex min-h-9 cursor-pointer items-center gap-3 text-sm text-zinc-300">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="size-4 accent-yellow-300" />
      {label}
    </label>
  );
}

const numberOrNull = (value: string) => (value.trim() === "" ? null : Number(value));

export function FilterPanel({
  filters,
  onChange,
  jurisdictions,
}: {
  filters: Filters;
  onChange: (filters: Filters) => void;
  jurisdictions: string[];
}) {
  const views = useSavedViews();
  const [viewName, setViewName] = useState("");
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => onChange({ ...filters, [key]: value });

  const toggleSignal = (id: SignalId) =>
    set("requiredSignals", filters.requiredSignals.includes(id) ? filters.requiredSignals.filter((item) => item !== id) : [...filters.requiredSignals, id]);
  const toggleJurisdiction = (name: string) =>
    set("jurisdictions", filters.jurisdictions.includes(name) ? filters.jurisdictions.filter((item) => item !== name) : [...filters.jurisdictions, name]);
  const updateRule = (id: string, patch: Partial<Rule>) =>
    set("rules", filters.rules.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)));

  return (
    <div className="flex flex-col gap-4 text-zinc-200">
      <div className="flex flex-col gap-2">
        <input
          value={filters.search}
          onChange={(event) => set("search", event.target.value)}
          placeholder="Search owner, address, parcel #"
          aria-label="Search"
          className={inputClass}
        />
        <div className="flex items-center gap-2">
          <select value={filters.sort} onChange={(event) => set("sort", event.target.value as Filters["sort"])} aria-label="Sort by" className={inputClass}>
            <option value="score">Sort: best score</option>
            <option value="distance">Sort: closest</option>
            <option value="acres">Sort: largest</option>
            <option value="held">Sort: held longest</option>
          </select>
          <button type="button" onClick={() => onChange(defaultFilters)} className="min-h-10 shrink-0 rounded-md px-3 text-sm text-zinc-400 hover:bg-white/5 hover:text-zinc-100">
            Reset
          </button>
        </div>
      </div>

      <Section title="Location and size">
        <label className="flex flex-col gap-1.5 text-sm text-zinc-400">
          Within {filters.maxMiles} miles of Crooked Can
          <input type="range" min={0.5} max={7} step={0.5} value={filters.maxMiles} onChange={(event) => set("maxMiles", Number(event.target.value))} className="accent-yellow-300" />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-sm text-zinc-400">
            Min acres
            <input type="number" min={0} value={filters.minAcres} onChange={(event) => set("minAcres", Number(event.target.value) || 0)} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-400">
            Max acres
            <input type="number" min={0} value={filters.maxAcres ?? ""} onChange={(event) => set("maxAcres", numberOrNull(event.target.value))} placeholder="Any" className={inputClass} />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm text-zinc-400">
          Max assessed value ($)
          <input type="number" min={0} step={50000} value={filters.maxValue ?? ""} onChange={(event) => set("maxValue", numberOrNull(event.target.value))} placeholder="Any" className={inputClass} />
        </label>
        <div className="flex flex-wrap gap-2">
          {jurisdictions.map((name) => (
            <button
              key={name}
              type="button"
              aria-pressed={filters.jurisdictions.includes(name)}
              onClick={() => toggleJurisdiction(name)}
              className={`min-h-8 rounded-full border px-3 text-xs ${filters.jurisdictions.includes(name) ? "border-yellow-300 bg-yellow-300/10 text-yellow-200" : "border-white/10 text-zinc-400 hover:border-white/25"}`}
            >
              {name.replace(" Lake County", "")}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Opportunity signals">
        <p className="text-xs text-zinc-500">Only show parcels with every selected signal.</p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(signalCatalog) as SignalId[])
            .filter((id) => !["wetlands", "flood", "improved"].includes(id))
            .map((id) => (
              <button
                key={id}
                type="button"
                aria-pressed={filters.requiredSignals.includes(id)}
                onClick={() => toggleSignal(id)}
                className={`min-h-8 rounded-full border px-3 text-left text-xs ${filters.requiredSignals.includes(id) ? "border-yellow-300 bg-yellow-300/10 text-yellow-200" : "border-white/10 text-zinc-400 hover:border-white/25"}`}
              >
                {signalCatalog[id]}
              </button>
            ))}
        </div>
        <label className="flex flex-col gap-1.5 text-sm text-zinc-400">
          Minimum score: {filters.minScore}
          <input type="range" min={0} max={80} step={5} value={filters.minScore} onChange={(event) => set("minScore", Number(event.target.value))} className="accent-yellow-300" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-zinc-400">
          Owner has held it at least
          <select value={filters.minYearsHeld} onChange={(event) => set("minYearsHeld", Number(event.target.value))} className={inputClass}>
            <option value={0}>Any length</option>
            <option value={10}>10 years</option>
            <option value={15}>15 years</option>
            <option value={25}>25 years</option>
          </select>
        </label>
      </Section>

      <Section title="Exclude">
        <label className="flex flex-col gap-1.5 text-sm text-zinc-400">
          Max wetlands: {filters.maxWetlandPct}%
          <input type="range" min={0} max={100} step={10} value={filters.maxWetlandPct} onChange={(event) => set("maxWetlandPct", Number(event.target.value))} className="accent-yellow-300" />
        </label>
        <Toggle label="Vacant land only" checked={filters.vacantOnly} onChange={(value) => set("vacantOnly", value)} />
        <Toggle label="Hide parcels already built on" checked={filters.hideImproved} onChange={(value) => set("hideImproved", value)} />
        <Toggle label="Show public, HOA, and church land" checked={filters.showUnavailable} onChange={(value) => set("showUnavailable", value)} />
        <Toggle label="Show possible Skorman parcels" checked={filters.showRelated} onChange={(value) => set("showRelated", value)} />
      </Section>

      <Section title="Your list">
        <select value={filters.tracked} onChange={(event) => set("tracked", event.target.value as Filters["tracked"])} aria-label="Tracking status" className={inputClass}>
          <option value="all">All parcels</option>
          <option value="tracked">Anything I&apos;ve marked</option>
          {trackStatuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </Section>

      <Section title="Custom filters">
        {filters.rules.map((rule) => (
          <div key={rule.id} className="flex flex-col gap-2 rounded-lg border border-white/10 p-2.5">
            <select value={rule.field} onChange={(event) => updateRule(rule.id, { field: event.target.value as RuleField })} aria-label="Field" className={inputClass}>
              {(Object.keys(ruleFields) as RuleField[]).map((field) => (
                <option key={field} value={field}>
                  {ruleFields[field].label}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <select value={rule.operator} onChange={(event) => updateRule(rule.id, { operator: event.target.value as RuleOperator })} aria-label="Condition" className={inputClass}>
                {ruleOperators.map((operator) => (
                  <option key={operator}>{operator}</option>
                ))}
              </select>
              {rule.operator !== "is empty" && rule.operator !== "is not empty" && (
                <input
                  value={rule.value}
                  onChange={(event) => updateRule(rule.id, { value: event.target.value })}
                  type={ruleFields[rule.field].kind === "number" ? "number" : "text"}
                  aria-label="Value"
                  className={inputClass}
                />
              )}
            </div>
            <button type="button" onClick={() => set("rules", filters.rules.filter((item) => item.id !== rule.id))} className="self-start text-xs text-zinc-500 hover:text-red-300">
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => set("rules", [...filters.rules, { id: crypto.randomUUID(), field: "landUse", operator: "contains", value: "" }])}
          className="min-h-10 rounded-md border border-dashed border-white/15 text-sm text-zinc-300 hover:border-white/30"
        >
          Add a filter
        </button>
      </Section>

      <Section title="Saved views">
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!viewName.trim()) return;
            saveView(viewName.trim(), filters);
            setViewName("");
          }}
        >
          <input value={viewName} onChange={(event) => setViewName(event.target.value)} placeholder="Name this search" aria-label="View name" className={inputClass} />
          <button type="submit" className="min-h-10 shrink-0 rounded-md bg-zinc-100 px-3 text-sm font-medium text-zinc-950 hover:bg-white">
            Save
          </button>
        </form>
        {views.map((view) => (
          <div key={view.id} className="flex items-center justify-between gap-2 text-sm">
            <button type="button" onClick={() => onChange({ ...defaultFilters, ...view.filters })} className="min-h-9 truncate text-left text-zinc-200 hover:text-yellow-200">
              {view.name}
            </button>
            <button type="button" onClick={() => deleteView(view.id)} aria-label={`Delete ${view.name}`} className="min-h-9 px-2 text-xs text-zinc-500 hover:text-red-300">
              Delete
            </button>
          </div>
        ))}
      </Section>
    </div>
  );
}
