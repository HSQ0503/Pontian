"use client";

import { useState, type ReactNode } from "react";
import {
  defaultFilters,
  opportunitySignals,
  ruleFields,
  ruleOperators,
  signalCatalog,
  statusChoice,
  trackStatuses,
  type Filters,
  type Rule,
  type RuleField,
  type RuleOperator,
  type SignalId,
} from "./parcels";
import { deleteView, saveView, useSavedViews } from "./store";

export const inputClass =
  "min-h-11 w-full border border-[#262626] bg-[#0e0e0e] px-3 text-[15px] text-[#eeeeec] placeholder:text-[#7a7a78] focus:border-[#fdd907] focus:outline-none";

const chipClass = (active: boolean) =>
  `min-h-11 border px-3 text-left text-[13px] transition-colors duration-200 ${active ? "border-[#fdd907] bg-[#fdd907] text-[#111]" : "border-[#303030] text-[#d4d4d2] hover:border-[#5a5a58] hover:text-[#eeeeec]"}`;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-t border-[#262626] pt-5">
      <h3 className="text-[13px] text-[#eeeeec]">{title}</h3>
      {children}
    </section>
  );
}

function Toggle({ label, detail, checked, onChange }: { label: string; detail?: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 py-1 text-[13px] text-[#d4d4d2]">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-0.5 size-4 shrink-0 accent-[#fdd907]" />
      <span>
        {label}
        {detail && <span className="block text-[12px] text-[#8a8a88]">{detail}</span>}
      </span>
    </label>
  );
}

const numberOrNull = (value: string) => (value.trim() === "" ? null : Number(value));

export function FilterPanel({
  filters,
  onChange,
  jurisdictions,
  rejectedCount,
}: {
  filters: Filters;
  onChange: (filters: Filters) => void;
  jurisdictions: string[];
  rejectedCount: number;
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
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] leading-relaxed text-[#a6a6a6]">Use these when the main list is still too long.</p>
        <button type="button" onClick={() => onChange(defaultFilters)} className="min-h-11 shrink-0 px-3 text-[13px] text-[#a6a6a6] hover:text-[#eeeeec]">
          Reset
        </button>
      </div>

      <button
        type="button"
        aria-pressed={filters.rejectedOnly}
        onClick={() => set("rejectedOnly", !filters.rejectedOnly)}
        className={`flex min-h-11 items-center justify-between gap-3 border px-3 py-3 text-left text-[14px] transition-colors duration-200 ${filters.rejectedOnly ? "border-[#f51625] bg-[#f51625]/10 text-[#eeeeec]" : "border-[#303030] text-[#d4d4d2] hover:border-[#5a5a58]"}`}
      >
        <span className="flex items-center gap-2.5">
          <span className="block size-2.5 rotate-45 bg-[#f51625]" aria-hidden />
          Only land where an application was turned down
        </span>
        <span className="text-[#8a8a88]">{rejectedCount}</span>
      </button>

      <Section title="How close, and how big">
        <label className="flex flex-col gap-2 text-[13px] text-[#d4d4d2]">
          Within {filters.maxMiles} miles of Crooked Can
          <input type="range" min={0.5} max={7} step={0.5} value={filters.maxMiles} onChange={(event) => set("maxMiles", Number(event.target.value))} />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-[12px] text-[#a6a6a6]">
            Min acres
            <input type="number" min={0} value={filters.minAcres} onChange={(event) => set("minAcres", Number(event.target.value) || 0)} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-[12px] text-[#a6a6a6]">
            Max acres
            <input type="number" min={0} value={filters.maxAcres ?? ""} onChange={(event) => set("maxAcres", numberOrNull(event.target.value))} placeholder="Any" className={inputClass} />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-[12px] text-[#a6a6a6]">
          Max assessed value ($)
          <input type="number" min={0} step={50000} value={filters.maxValue ?? ""} onChange={(event) => set("maxValue", numberOrNull(event.target.value))} placeholder="Any" className={inputClass} />
        </label>
        <div className="flex flex-wrap gap-1.5">
          {jurisdictions.map((name) => (
            <button key={name} type="button" aria-pressed={filters.jurisdictions.includes(name)} onClick={() => toggleJurisdiction(name)} className={chipClass(filters.jurisdictions.includes(name))}>
              {name.replace(" Lake County", "")}
            </button>
          ))}
        </div>
        <p className="text-[13px] leading-relaxed text-[#8a8a88]">Land with a turned-down application still shows, even if it is smaller or farther away.</p>
      </Section>

      <Section title="Only show land that has all of these">
        <div className="flex flex-wrap gap-1.5">
          {opportunitySignals.map((id) => (
            <button key={id} type="button" aria-pressed={filters.requiredSignals.includes(id)} onClick={() => toggleSignal(id)} className={chipClass(filters.requiredSignals.includes(id))}>
              {signalCatalog[id]}
            </button>
          ))}
        </div>
        <label className="flex flex-col gap-2 text-[13px] text-[#d4d4d2]">
          Stronger matches only. Minimum strength: {filters.minScore}
          <input type="range" min={0} max={80} step={5} value={filters.minScore} onChange={(event) => set("minScore", Number(event.target.value))} />
        </label>
        <label className="flex flex-col gap-1 text-[12px] text-[#a6a6a6]">
          Owner has held it at least
          <select value={filters.minYearsHeld} onChange={(event) => set("minYearsHeld", Number(event.target.value))} className={inputClass}>
            <option value={0}>Any length</option>
            <option value={10}>10 years</option>
            <option value={15}>15 years</option>
            <option value={25}>25 years</option>
          </select>
        </label>
      </Section>

      <Section title="Leave out">
        <Toggle
          label="Land already being developed"
          detail="Platted subdivisions, builder-owned land, and parcels rezoned in the last five years"
          checked={filters.hideActiveDevelopment}
          onChange={(value) => set("hideActiveDevelopment", value)}
        />
        <Toggle label="Land that already has buildings" checked={filters.hideImproved} onChange={(value) => set("hideImproved", value)} />
        <Toggle label="Vacant land only" checked={filters.vacantOnly} onChange={(value) => set("vacantOnly", value)} />
        <Toggle label="Show public, HOA, and church land" checked={filters.showUnavailable} onChange={(value) => set("showUnavailable", value)} />
        <Toggle label="Include land that may already be Skorman's" checked={filters.showRelated} onChange={(value) => set("showRelated", value)} />
        <label className="flex flex-col gap-2 text-[13px] text-[#d4d4d2]">
          Max wetlands: {filters.maxWetlandPct}%
          <input type="range" min={0} max={100} step={10} value={filters.maxWetlandPct} onChange={(event) => set("maxWetlandPct", Number(event.target.value))} />
        </label>
      </Section>

      <Section title="Places you have marked">
        <select value={filters.tracked} onChange={(event) => set("tracked", event.target.value as Filters["tracked"])} aria-label="Your list" className={`${inputClass} min-h-11`}>
          <option value="all">All places</option>
          <option value="tracked">Anything I&apos;ve marked</option>
          {trackStatuses.map((status) => (
            <option key={status} value={status}>
              {statusChoice[status].label}
            </option>
          ))}
        </select>
      </Section>

      <details className="border-t border-[#262626] pt-5">
        <summary className="text-[13px] text-[#eeeeec]">Exact filters</summary>
        <div className="mt-4 flex flex-col gap-3">
        {filters.rules.map((rule) => (
          <div key={rule.id} className="flex flex-col gap-2 border border-[#262626] p-2.5">
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
            <button type="button" onClick={() => set("rules", filters.rules.filter((item) => item.id !== rule.id))} className="self-start text-[12px] text-[#8a8a88] hover:text-[#f51625]">
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => set("rules", [...filters.rules, { id: crypto.randomUUID(), field: "landUse", operator: "contains", value: "" }])}
          className="min-h-11 border border-dashed border-[#3a3a3a] text-[14px] text-[#d4d4d2] hover:border-[#fdd907] hover:text-[#fdd907]"
        >
          Add a filter
        </button>
        </div>
      </details>

      <Section title="Saved setups">
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!viewName.trim()) return;
            saveView(viewName.trim(), filters);
            setViewName("");
          }}
        >
          <input value={viewName} onChange={(event) => setViewName(event.target.value)} placeholder="Name this search" aria-label="Search name" className={inputClass} />
          <button type="submit" className="shrink-0 bg-[#f8f8f6] px-3 text-[13px] text-[#252525] hover:bg-[#dcdcd9]">
            Save
          </button>
        </form>
        {views.map((view) => (
          <div key={view.id} className="flex items-center justify-between gap-2 text-[13px]">
            <button type="button" onClick={() => onChange({ ...defaultFilters, ...view.filters })} className="min-h-9 truncate text-left text-[#eeeeec] hover:text-[#fdd907]">
              {view.name}
            </button>
            <button type="button" onClick={() => deleteView(view.id)} aria-label={`Delete ${view.name}`} className="min-h-9 px-2 text-[12px] text-[#8a8a88] hover:text-[#f51625]">
              Delete
            </button>
          </div>
        ))}
      </Section>
    </div>
  );
}
