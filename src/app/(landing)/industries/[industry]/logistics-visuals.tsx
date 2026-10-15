"use client";

import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, Check, CircleAlert } from "lucide-react";
import styles from "./logistics.module.css";
import { InteractionCue } from "./interaction-cue";
import {
  collectionDetourKm,
  formatMoney,
  operation,
  places,
  plans,
  quoteLines,
  quoteRequest,
  quoteTotal,
  rateCard,
  shipments,
  stopOf,
  toMinutes,
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
const placeLabel = (name: string) => name.replace(/ Works| Park| Lane| Yard| Quay/g, "");

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
          const showName = isSelected || stop.late || isNew;
          return (
            <Fragment key={`${stop.shipment}-${stop.action}`}>
              <span className={styles.drive} style={{ left: pct(driveStart), width: span(driveStart, arrive) }}>
                {stop.late && stop.driveMinutes >= 45 && <em>{stop.driveMinutes} min drive</em>}
              </span>
              {start > arrive && <span className={styles.wait} style={{ left: pct(arrive), width: span(arrive, start) }} />}
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
                {showName && <i>{placeLabel(places[stop.place].name)}</i>}
                {isSelected && <em>{stop.late ? `Closes ${stop.window[1]}` : `${stop.window[0]}–${stop.window[1]}`}</em>}
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
  const [view, setView] = useState<DispatchView>("A");
  const [selected, setSelected] = useState<Selection | null>(null);
  const routes = viewRoutes[view];
  const request = shipments["KV-2046"];
  const missed = plans.requestOnA.lateStops;
  const late = missed[0];
  const collect = stopOf(plans.requestOnB, "KV-2046", "collect");
  const deliver = stopOf(plans.requestOnB, "KV-2046");
  const focus = selected ?? (view === "A" ? { vehicle: "A" as const, index: plans.requestOnA.stops.indexOf(late) } : view === "B" ? { vehicle: "B" as const, index: plans.requestOnB.stops.findIndex((stop) => stop.shipment === "KV-2046" && stop.action === "collect") } : null);
  const focusStop = focus ? routes[focus.vehicle].stops[focus.index] : null;
  const verdict = {
    plan: { tone: "neutral", title: "Five drops, both trucks on time.", text: "Nothing is late. Then the Glenway pickup comes in." },
    A: { tone: "alert", title: "Two stops miss their windows.", text: `${placeLabel(places[late.place].name)} arrives at ${late.arrive} after a ${late.driveMinutes}-minute drive back west. ${placeLabel(places[missed[1].place].name)} arrives at ${missed[1].arrive}. Both windows have closed.` },
    B: { tone: "ok", title: "Vehicle B can take it.", text: `Glenway at ${collect?.arrive}, Hollin at ${deliver?.start}. The other stops stay put.` },
  }[view];
  const changeView = (next: DispatchView) => { setView(next); setSelected(null); };
  const scroller = useRef<HTMLDivElement>(null);
  // On narrow screens the timeline scrolls; keep the stop that matters in view.
  useEffect(() => {
    const container = scroller.current;
    const target = container?.querySelector<HTMLElement>("button[aria-pressed=\"true\"]");
    if (!container || !target || container.scrollWidth <= container.clientWidth) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const block = target.getBoundingClientRect();
    const bits = [block, ...Array.from(target.querySelectorAll("i, em"), (node) => node.getBoundingClientRect())];
    const leftEdge = Math.min(...bits.map((box) => box.left));
    const rightEdge = Math.max(...bits.map((box) => box.right));
    const middle = (leftEdge + rightEdge) / 2;
    const left = middle - container.getBoundingClientRect().left + container.scrollLeft - container.clientWidth / 2;
    container.scrollTo({ left: Math.max(0, left), behavior: reduce ? "auto" : "smooth" });
  }, [view, selected]);

  return (
    <Example
      title={`Tomorrow’s deliveries · ${operation.name} (fictional)`}
      note="Example drive times"
      outcome={{
        start: <p>Five deliveries on two trucks. Then a pickup for {request.pallets} pallets comes in.</p>,
        finding: <p><strong>Proposed assignment: Vehicle B.</strong> On Vehicle A, Fairholt and Elm would both be late.</p>,
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
      <InteractionCue line="Switch the option." steps={["Switch where the job goes", "Click a stop"]} />
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
type LineKey = "base" | "detour" | "handling";

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

function Message({ parts, fields }: { parts: { text: string; field?: FieldKey }[]; fields: FieldKey[] }) {
  return (
    <p className={styles.messageText}>
      {parts.map((part, index) => part.field ? <mark key={index} data-active={fields.includes(part.field) || undefined}>{part.text}</mark> : <span key={index}>{part.text}</span>)}
    </p>
  );
}

const lineFields: Record<LineKey, FieldKey[]> = {
  base: ["cargo"],
  detour: ["pickup", "delivery"],
  handling: ["handling"],
};

export function QuotePreparation() {
  const [replied, setReplied] = useState(true);
  const [line, setLine] = useState<LineKey>("detour");
  const shipment = shipments["KV-2046"];
  const lines: { key: LineKey; label: string; amount: string; why: string }[] = [
    { key: "base", label: "Base transport charge", amount: formatMoney(quoteLines.base), why: `${shipment.pallets} pallets at ${formatMoney(rateCard.palletRate)} each, from the ${rateCard.zone} rate card.` },
    { key: "detour", label: "Additional pickup distance", amount: formatMoney(quoteLines.detour), why: `Glenway adds ${collectionDetourKm} km, at ${formatMoney(rateCard.perExtraKm)} a km.` },
    { key: "handling", label: "Required handling", amount: formatMoney(quoteLines.handling), why: `No forklift at Hollin Yard. The rate card adds ${formatMoney(rateCard.tailLiftPerStop)} for the tail-lift.` },
  ];
  const active = lines.find((item) => item.key === line) ?? lines[0];
  const fields = replied ? lineFields[active.key] : [];
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
      <InteractionCue line="You can use this." steps={replied ? ["Switch the step", "Click a quote line"] : ["Switch the step", "Add the customer’s reply"]} />
      <div className={styles.quoteGrid}>
        <div className={styles.sheet}>
          <div className={styles.message}>
            <p className={styles.messageMeta}>{quoteRequest.from} · {quoteRequest.received}</p>
            <Message parts={requestText} fields={fields} />
          </div>
          {replied ? (
            <div className={styles.message} data-reply="true">
              <p className={styles.messageMeta}>Reply · {quoteRequest.replyReceived}</p>
              <Message parts={replyText} fields={fields} />
            </div>
          ) : (
            <button type="button" className={styles.supply} onClick={() => setReplied(true)}>Add the customer’s reply <ArrowRight size={14} aria-hidden="true" /></button>
          )}
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
              <p className={styles.quoteTotal}><span>Draft total</span>{formatMoney(quoteTotal)}</p>
              <p className={styles.quoteStatus}>Draft, not sent. It assumes the pallets in the reply, a tail-lift, and a truck your dispatcher confirms.</p>
            </>
          ) : (
            <p className={styles.locked}><CircleAlert size={18} aria-hidden="true" /> Confirm dimensions before selecting a vehicle.</p>
          )}
        </div>
      </div>
    </Example>
  );
}
