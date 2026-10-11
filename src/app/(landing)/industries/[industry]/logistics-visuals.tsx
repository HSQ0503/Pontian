"use client";

import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, Check, CircleAlert } from "lucide-react";
import styles from "./logistics.module.css";
import {
  collectionDetourKm,
  formatKg,
  formatMoney,
  formatSize,
  operation,
  places,
  plans,
  quoteLines,
  quoteRequest,
  quoteTotal,
  rateCard,
  roadKm,
  shipments,
  stopOf,
  toMinutes,
  totalWeight,
  vehicles,
  type PlannedRoute,
  type VehicleId,
} from "./logistics-data";

type Outcome = { start: ReactNode; finding: ReactNode; next: ReactNode };

export function Example({ title, note, children, outcome }: { title: string; note: string; children: ReactNode; outcome: Outcome }) {
  return (
    <figure className={styles.example}>
      <figcaption className={styles.exampleBar}>
        <span className={styles.exampleTag}>Example workflow</span>
        <span className={styles.exampleTitle}>{title}</span>
        <span className={styles.exampleNote}>{note}</span>
      </figcaption>
      <div className={styles.exampleBody}>{children}</div>
      <ol className={styles.outcome}>
        <li data-role="start"><span className={styles.outcomeLabel}>Situation</span>{outcome.start}</li>
        <li data-role="finding"><span className={styles.outcomeLabel}>Finding for review</span>{outcome.finding}</li>
        <li data-role="next"><span className={styles.outcomeLabel}>Next step for your team</span>{outcome.next}</li>
      </ol>
    </figure>
  );
}

export function Choice<T extends string>({ label, options, value, onChange }: {
  label: string;
  options: { value: T; label: string; detail?: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className={styles.choice}>
      {options.map((option) => (
        <button key={option.value} type="button" aria-pressed={value === option.value} onClick={() => onChange(option.value)}>
          <span>{option.label}</span>
          {option.detail && <span className={styles.choiceDetail}>{option.detail}</span>}
        </button>
      ))}
    </div>
  );
}

// Day timeline: 07:00 to 17:00.
const DAY_START = toMinutes("07:00");
const DAY_SPAN = toMinutes("17:00") - DAY_START;
const pct = (time: string | number) => `${(((typeof time === "string" ? toMinutes(time) : time) - DAY_START) / DAY_SPAN) * 100}%`;
const span = (from: string | number, to: string | number) => {
  const a = typeof from === "string" ? toMinutes(from) : from;
  const b = typeof to === "string" ? toMinutes(to) : to;
  return `${((b - a) / DAY_SPAN) * 100}%`;
};
const hours = Array.from({ length: 11 }, (_, index) => 7 + index);
const shortName = (name: string) => name.replace(" Works", "");

type DispatchView = "plan" | "A" | "B";

const viewRoutes: Record<DispatchView, Record<VehicleId, PlannedRoute>> = {
  plan: { A: plans.baseA, B: plans.baseB },
  A: { A: plans.requestOnA, B: plans.baseB },
  B: { A: plans.baseA, B: plans.requestOnB },
};

type Selection = { vehicle: VehicleId; index: number };

// Each stop's drive starts when the truck left the previous stop, or after the driver's break there.
function driveStarts(route: PlannedRoute) {
  return route.stops.map((_, index) => {
    if (index === 0) return toMinutes(vehicles[route.vehicle].departs);
    const prior = route.stops[index - 1];
    const pause = route.driverBreak?.stopIndex === index - 1 && route.driverBreak.during === "after" ? route.driverBreak : null;
    return toMinutes(pause ? pause.end : prior.depart);
  });
}

function Lane({ route, selected, onSelect }: { route: PlannedRoute; selected: Selection | null; onSelect: (selection: Selection) => void }) {
  const vehicle = vehicles[route.vehicle];
  const starts = driveStarts(route);
  const last = route.stops[route.stops.length - 1];
  const lastPause = route.driverBreak?.stopIndex === route.stops.length - 1 && route.driverBreak.during === "after" ? route.driverBreak.end : last.depart;
  return (
    <div className={styles.lane}>
      <div className={styles.laneHead}>
        <strong>{vehicle.name}</strong>
        <span>{vehicle.palletSpaces} spaces</span>
      </div>
      <div className={styles.laneTrack}>
        <span className={styles.shift} style={{ left: pct(vehicle.driver[0]), width: span(vehicle.driver[0], vehicle.driver[1]) }} title="Driver availability" />
        {route.stops.map((stop, index) => {
          const driveStart = starts[index];
          const arrive = toMinutes(stop.arrive);
          const start = toMinutes(stop.start);
          const breakHere = route.driverBreak?.stopIndex === index ? route.driverBreak : null;
          const isNew = stop.shipment === "KV-2046";
          const isSelected = selected?.vehicle === route.vehicle && selected.index === index;
          return (
            <Fragment key={`${stop.shipment}-${stop.action}`}>
              <span className={styles.drive} style={{ left: pct(driveStart), width: span(driveStart, arrive) }}>
                {stop.driveMinutes >= 60 && <em>{stop.driveMinutes} min drive</em>}
              </span>
              {start > arrive && <span className={styles.wait} style={{ left: pct(arrive), width: span(arrive, start) }} />}
              {isSelected && <span className={styles.window} data-focus="true" data-late={stop.late || undefined} style={{ left: pct(stop.window[0]), width: span(stop.window[0], stop.window[1]) }}><em>{stop.late ? `Closes ${stop.window[1]}` : `Window ${stop.window[0]}–${stop.window[1]}`}</em></span>}
              {breakHere && breakHere.during === "after" && <span className={styles.breakBlock} style={{ left: pct(breakHere.start), width: span(breakHere.start, breakHere.end) }} />}
              <button
                type="button"
                className={styles.stopBlock}
                data-late={stop.late || undefined}
                data-new={isNew || undefined}
                aria-pressed={isSelected}
                style={{ left: pct(start), width: span(start, stop.depart) }}
                onClick={() => onSelect({ vehicle: route.vehicle, index })}
                aria-label={`${places[stop.place].name}, ${stop.action === "collect" ? "collect" : "deliver"} ${stop.shipment}, arrives ${stop.arrive}, window ${stop.window[0]} to ${stop.window[1]}${stop.late ? ", misses the window" : ""}`}
              >
                <span>{index + 1}</span>
                <i>{shortName(places[stop.place].name)}</i>
              </button>
            </Fragment>
          );
        })}
        <span className={styles.drive} style={{ left: pct(lastPause), width: span(lastPause, route.returnsAt) }} />
        <span className={styles.depotMark} style={{ left: pct(route.returnsAt) }} />
      </div>
    </div>
  );
}

export function DeliveryPlan() {
  const [view, setView] = useState<DispatchView>("B");
  const [selected, setSelected] = useState<Selection | null>(null);
  const routes = viewRoutes[view];
  const request = shipments["KV-2046"];
  const late = plans.requestOnA.lateStops[0];
  const collect = stopOf(plans.requestOnB, "KV-2046", "collect");
  const deliver = stopOf(plans.requestOnB, "KV-2046");
  const focus = selected ?? (view === "A" ? { vehicle: "A" as const, index: plans.requestOnA.stops.indexOf(late) } : view === "B" ? { vehicle: "B" as const, index: plans.requestOnB.stops.findIndex((stop) => stop.shipment === "KV-2046") } : null);
  const focusStop = focus ? routes[focus.vehicle].stops[focus.index] : null;
  const verdict = {
    plan: { tone: "neutral", title: "Tomorrow’s deliveries", text: "Five drops on two trucks. Everything lands inside its window." },
    A: { tone: "alert", title: "Vehicle A: Conflicts with an existing delivery window.", text: `It has to drive back west after the pickup. ${shortName(places[late.place].name)} slips to ${late.arrive}; its window closes at ${late.window[1]}.` },
    B: { tone: "ok", title: "Vehicle B: Fits the example schedule and available capacity.", text: `Collect at ${collect?.arrive}, deliver at ${deliver?.start}. Its other stops don’t move.` },
  }[view];
  const changeView = (next: DispatchView) => { setView(next); setSelected(null); };
  const scroller = useRef<HTMLDivElement>(null);
  // On narrow screens the timeline scrolls; keep the stop that matters in view.
  useEffect(() => {
    const container = scroller.current;
    const target = container?.querySelector<HTMLElement>("button[aria-pressed=\"true\"]");
    if (!container || !target || container.scrollWidth <= container.clientWidth) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const bracket = container.querySelector<HTMLElement>("[data-focus]");
    const block = target.getBoundingClientRect();
    // The window label sits at the bracket's right end; keep it and the stop on screen together.
    const label = bracket ? bracket.getBoundingClientRect().right : block.left;
    const middle = (Math.min(block.left, label - 150) + Math.max(block.right, label)) / 2;
    const left = middle - container.getBoundingClientRect().left + container.scrollLeft - container.clientWidth / 2;
    container.scrollTo({ left, behavior: reduce ? "auto" : "smooth" });
  }, [view, selected]);

  return (
    <Example
      title={`Tomorrow’s deliveries · ${operation.name} (fictional)`}
      note="Example drive times"
      outcome={{
        start: <p>Five deliveries on two trucks. Then a pickup for {request.pallets} pallets comes in.</p>,
        finding: <p><strong>Proposed assignment: Vehicle B.</strong> Vehicle A would make Fairholt late.</p>,
        next: <p><strong>Dispatcher reviews the updated route.</strong></p>,
      }}
    >
      <div className={styles.requestStrip} data-active={view !== "plan" || undefined}>
        <span className={styles.requestLead}>A new pickup request arrives</span>
        <span><strong>KV-2046</strong> · {request.pallets} pallets · collect {places.glenway.name} {request.collectionWindow?.[0]}–{request.collectionWindow?.[1]} · deliver {places.hollin.name} {request.deliveryWindow[0]}–{request.deliveryWindow[1]}</span>
      </div>
      <div className={styles.timelineHead}>
        <Choice
          label="Where the new job goes"
          value={view}
          onChange={changeView}
          options={[{ value: "plan", label: "Before the request" }, { value: "A", label: "Try Vehicle A" }, { value: "B", label: "Try Vehicle B" }]}
        />
        <p className={styles.verdict} data-tone={verdict.tone} aria-live="polite">
          {verdict.tone === "ok" ? <Check size={16} aria-hidden="true" /> : verdict.tone === "alert" ? <CircleAlert size={16} aria-hidden="true" /> : null}
          <span><strong>{verdict.title}</strong> {verdict.text}</span>
        </p>
      </div>
      <div ref={scroller} className={styles.timelineScroll}>
        <div className={styles.timeline}>
          <div className={styles.axis}>
            <span />
            <div className={styles.axisTrack}>
              {hours.map((hour) => <span key={hour} style={{ left: pct(hour * 60) }}>{String(hour).padStart(2, "0")}:00</span>)}
            </div>
          </div>
          {(["A", "B"] as VehicleId[]).map((id) => <Lane key={id} route={routes[id]} selected={focus} onSelect={setSelected} />)}
        </div>
      </div>
      <div className={styles.timelineFoot}>
        <ul className={styles.timelineKey} aria-label="Key">
          <li data-key="window">Customer delivery window</li>
          <li data-key="shift">Driver availability</li>
          <li data-key="new">New job</li>
          <li data-key="late">Misses its window</li>
        </ul>
        {focusStop && (
          <p className={styles.stopDetail} aria-live="polite">
            <strong>{places[focusStop.place].name}</strong> · {focusStop.action === "collect" ? "collect" : "deliver"} {focusStop.shipment} · {shipments[focusStop.shipment].pallets} pallets · window {focusStop.window[0]}–{focusStop.window[1]} · arrives {focusStop.arrive}
          </p>
        )}
      </div>
    </Example>
  );
}

type FieldKey = "pickup" | "delivery" | "timing" | "cargo" | "dimensions" | "handling";
type LineKey = "base" | "detour" | "handling" | "availability";

const requestText: { text: string; field?: FieldKey }[] = [
  { text: "Can you collect " },
  { text: "two pallets", field: "cargo" },
  { text: " " },
  { text: "tomorrow morning", field: "timing" },
  { text: " and deliver them " },
  { text: "that afternoon", field: "timing" },
  { text: "? They’re at " },
  { text: "Glenway Works, Unit 4", field: "pickup" },
  { text: ", going to " },
  { text: "Hollin Yard, Gate 2", field: "delivery" },
  { text: "." },
];

const replyText: { text: string; field?: FieldKey }[] = [
  { text: "Each pallet is " },
  { text: "1.2 × 1.0 m and 1.4 m high, about 380 kg", field: "dimensions" },
  { text: ". They " },
  { text: "can’t be stacked", field: "dimensions" },
  { text: ", and there’s " },
  { text: "no forklift at Hollin Yard", field: "handling" },
  { text: "." },
];

function Message({ parts, field }: { parts: { text: string; field?: FieldKey }[]; field: FieldKey | null }) {
  return (
    <p className={styles.messageText}>
      {parts.map((part, index) => part.field ? <mark key={index} data-active={part.field === field || undefined}>{part.text}</mark> : <span key={index}>{part.text}</span>)}
    </p>
  );
}

export function QuotePreparation() {
  const [replied, setReplied] = useState(true);
  const [field, setField] = useState<FieldKey | null>("dimensions");
  const [line, setLine] = useState<LineKey>("detour");
  const shipment = shipments["KV-2046"];
  const fields: { key: FieldKey; label: string; value: string; missing?: boolean }[] = [
    { key: "pickup", label: "Pickup", value: "Glenway Works" },
    { key: "delivery", label: "Delivery", value: "Hollin Yard" },
    { key: "timing", label: "Requested timing", value: `${shipment.collectionWindow?.[0]}–${shipment.collectionWindow?.[1]}, then ${shipment.deliveryWindow[0]}–${shipment.deliveryWindow[1]}` },
    { key: "cargo", label: "Cargo", value: `${shipment.pallets} pallets` },
    replied
      ? { key: "dimensions", label: "Dimensions", value: `${formatSize(shipment)}, ${formatKg(totalWeight(shipment))}` }
      : { key: "dimensions", label: "Dimensions", value: "Confirmation needed", missing: true },
    ...(replied ? [{ key: "handling" as const, label: "Handling", value: "Tail-lift" }] : []),
  ];
  const lines: { key: LineKey; label: string; amount: string; why: string }[] = [
    { key: "base", label: "Base transport charge", amount: formatMoney(quoteLines.base), why: `Rate card: ${formatMoney(rateCard.palletRate)} per standard pallet in ${rateCard.zone}. ${shipment.pallets} × ${formatMoney(rateCard.palletRate)}.` },
    { key: "detour", label: "Additional pickup distance", amount: formatMoney(quoteLines.detour), why: `Rate card: ${formatMoney(rateCard.perExtraKm)} per extra km. Via Glenway it’s ${roadKm("depot", "glenway")} + ${roadKm("glenway", "hollin")} km against ${roadKm("depot", "hollin")} km direct, so ${collectionDetourKm} km extra.` },
    { key: "handling", label: "Required handling", amount: formatMoney(quoteLines.handling), why: `Rate card: ${formatMoney(rateCard.tailLiftPerStop)} per tail-lift stop. The reply says there’s no forklift on site.` },
    { key: "availability", label: "Availability check", amount: "No charge", why: "Vehicle B has room after its morning drops. Dispatch confirms before the quote goes out." },
  ];
  const active = lines.find((item) => item.key === line) ?? lines[0];
  return (
    <Example
      title={`Request ${quoteRequest.reference} · ${operation.name} (fictional)`}
      note="Example rate card, not market rates"
      outcome={{
        start: <p>A two-line email. No pallet sizes.</p>,
        finding: replied
          ? <p><strong>A draft quote with its assumptions.</strong></p>
          : <p><strong>Confirm dimensions before selecting a vehicle.</strong></p>,
        next: <p><strong>Commercial team reviews the price before sending.</strong></p>,
      }}
    >
      <Choice label="Step" value={replied ? "after" : "before"} onChange={(value) => setReplied(value === "after")} options={[{ value: "before", label: "Before the reply" }, { value: "after", label: "After the reply" }]} />
      <div className={styles.quoteGrid}>
        <div className={styles.sheet}>
          <div className={styles.message}>
            <p className={styles.messageMeta}>{quoteRequest.from} · {quoteRequest.received}</p>
            <Message parts={requestText} field={field} />
          </div>
          {replied ? (
            <div className={styles.message} data-reply="true">
              <p className={styles.messageMeta}>Reply · {quoteRequest.replyReceived}</p>
              <Message parts={replyText} field={field} />
            </div>
          ) : (
            <button type="button" className={styles.supply} onClick={() => setReplied(true)}>Add the customer’s reply <ArrowRight size={14} aria-hidden="true" /></button>
          )}
          <div role="group" aria-label="Extracted details. Select one to see where it came from." className={styles.fieldChips}>
            {fields.map((item) => (
              <button key={item.key} type="button" aria-pressed={field === item.key} data-missing={item.missing || undefined} onClick={() => setField(item.key)}>
                <span>{item.label}</span>{item.value}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.sheet} data-locked={!replied || undefined}>
          {replied ? (
            <>
              <div role="group" aria-label="Quote lines. Select one to see the rule behind it." className={styles.lines}>
                {lines.map((item) => (
                  <button key={item.key} type="button" aria-pressed={line === item.key} onClick={() => setLine(item.key)}>
                    <span>{item.label}</span>
                    <span className={styles.lineAmount}>{item.amount}</span>
                  </button>
                ))}
              </div>
              <p className={styles.lineWhy} aria-live="polite">{active.why}</p>
              {line === "detour" && <p className={styles.consideration}>This pickup adds travel before the vehicle reaches the customer.</p>}
              <p className={styles.quoteTotal}><span>Draft total</span>{formatMoney(quoteTotal)}</p>
              <p className={styles.quoteStatus}>Draft, not sent. Assumes the pallets as described, a tail-lift, and a vehicle dispatch confirms.</p>
            </>
          ) : (
            <p className={styles.locked}><CircleAlert size={18} aria-hidden="true" /> Confirm dimensions before selecting a vehicle.</p>
          )}
        </div>
      </div>
    </Example>
  );
}
