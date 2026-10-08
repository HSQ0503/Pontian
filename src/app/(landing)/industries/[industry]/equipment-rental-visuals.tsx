"use client";

import dynamic from "next/dynamic";
import { useEffect, useEffectEvent, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from "lucide-react";
import styles from "./equipment-rental.module.css";
import type { DeliveryFocus, MachineId, MatchFocus, RentalFocus, ReturnArea, SceneProps } from "./equipment-rental-scene";
import { Breaker, Elevation, LowLoaderElevation, TRANSPORT_POSE, type ElevationArea, type ElevationTone } from "./equipment-rental-elevation";
import { POSES } from "./equipment-rental-geometry";
import {
  BREAKER, BREAKER_TYPE, EX014, EX027, EX027_INSPECTION_BOOKED, EX027_STATE, METER_AT_HANDOFF, METER_AT_RETURN, METER_ON_RENT,
  METER_ON_RENT_UPDATED, NEXT_RESERVATION, NEXT_RESERVATION_START, PICKUP, RENTAL, RENTAL_END, RENTAL_PERIOD, RENTAL_START,
  RETURN_STAGES, SOURCES, TRANSPORT, WORK_ORDER, type Source,
} from "./equipment-rental-fleet";

const ExcavatorScene = dynamic(() => import("./equipment-rental-scene"), { ssr: false });

function subscribeToMotion(update: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", update);
  return () => media.removeEventListener("change", update);
}

function useReducedMotion() {
  return useSyncExternalStore(subscribeToMotion, () => window.matchMedia("(prefers-reduced-motion: reduce)").matches, () => true);
}

let webglSupport: boolean | null = null;
function hasWebGL() {
  if (webglSupport === null) {
    try {
      const canvas = document.createElement("canvas");
      webglSupport = Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
    } catch {
      webglSupport = false;
    }
  }
  return webglSupport;
}
const noSubscription = () => () => {};

// Mounts the 3D view once it nears the viewport, then pauses rendering
// whenever it scrolls out of view.
function useViewportPresence<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [near, setNear] = useState(false);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const nearObserver = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setNear(true); }, { rootMargin: "600px 0px" });
    const visibleObserver = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: "80px 0px" });
    nearObserver.observe(element);
    visibleObserver.observe(element);
    return () => { nearObserver.disconnect(); visibleObserver.disconnect(); };
  }, []);
  return { ref, near, visible };
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return { ref, width };
}

type SceneInput = SceneProps extends infer P ? (P extends unknown ? Omit<P, "onReady" | "active"> : never) : never;

function MachineView({ scene, fallback, label, className = "", children }: { scene: SceneInput; fallback: ReactNode; label: string; className?: string; children?: ReactNode }) {
  const reduced = useReducedMotion();
  const webgl = useSyncExternalStore(noSubscription, hasWebGL, () => false);
  const { ref, near, visible } = useViewportPresence<HTMLDivElement>();
  const [ready, setReady] = useState(false);
  const live = near && webgl && !reduced;
  return (
    <div ref={ref} className={`${styles.viewport} ${className}`} role="img" aria-label={label}>
      <div className={styles.fallback} data-hidden={live && ready} aria-hidden="true">{fallback}</div>
      {live && <ExcavatorScene {...(scene as SceneProps)} active={visible} onReady={() => setReady(true)} />}
      {children}
    </div>
  );
}

type Step = { label: string; text: string };

function useSequence(count: number, onChange: (step: number) => void) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const go = (next: number) => {
    const clamped = Math.max(0, Math.min(count - 1, next));
    setStep(clamped);
    onChange(clamped);
  };
  const advance = useEffectEvent(() => {
    if (step >= count - 1) {
      setPlaying(false);
      return;
    }
    setStep(step + 1);
    onChange(step + 1);
  });
  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(advance, 4200);
    return () => clearTimeout(timer);
  }, [playing, step]);
  return {
    step,
    playing,
    go: (next: number) => { setPlaying(false); go(next); },
    toggle: () => {
      if (!playing && step >= count - 1) go(0);
      setPlaying(!playing);
    },
    replay: () => { go(0); setPlaying(true); },
  };
}

function Sequence({ steps, sequence, title }: { steps: Step[]; sequence: ReturnType<typeof useSequence>; title: string }) {
  const current = steps[sequence.step];
  return (
    <div className={styles.sequence}>
      <ol className={styles.steps} style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }} aria-label={`${title} steps`}>
        {steps.map((item, index) => (
          <li key={item.label}>
            <button type="button" aria-current={sequence.step === index ? "step" : undefined} data-done={index < sequence.step} onClick={() => sequence.go(index)}>
              <span className={styles.stepIndex}>{String(index + 1).padStart(2, "0")}</span>
              <span className={styles.stepLabel}>{item.label}</span>
            </button>
          </li>
        ))}
      </ol>
      <div className={styles.sequenceBar}>
        <p className={styles.caption} aria-live="polite"><span className={styles.captionStep}>{String(sequence.step + 1).padStart(2, "0")} / {String(steps.length).padStart(2, "0")} · {current.label}</span>{current.text}</p>
        <div className={styles.controls}>
          <button type="button" aria-label="Previous step" disabled={sequence.step === 0} onClick={() => sequence.go(sequence.step - 1)}><ChevronLeft size={16} strokeWidth={1.5} /></button>
          <button type="button" aria-label="Next step" disabled={sequence.step === steps.length - 1} onClick={() => sequence.go(sequence.step + 1)}><ChevronRight size={16} strokeWidth={1.5} /></button>
          <button type="button" aria-label={sequence.playing ? "Pause example" : "Play example"} onClick={sequence.toggle}>{sequence.playing ? <Pause size={14} /> : <Play size={14} />}</button>
          <button type="button" aria-label="Replay example" onClick={sequence.replay}><RotateCcw size={14} strokeWidth={1.5} /></button>
        </div>
      </div>
    </div>
  );
}

type State = "ok" | "blocked" | "pending";

function StateText({ state, children }: { state: State; children: ReactNode }) {
  return <span className={styles.state} data-state={state}>{children}</span>;
}

function SourceTag({ source }: { source: Source }) {
  return <span className={styles.source}>{SOURCES[source]}</span>;
}

type ExampleProps = { title: string; children: ReactNode; situation: ReactNode; result: ReactNode; next: ReactNode; boundary: string };

function Example({ title, children, situation, result, next, boundary }: ExampleProps) {
  return (
    <figure className={styles.example}>
      <figcaption className={styles.exampleBar}>
        <span className={styles.exampleTag}>Example workflow</span>
        <span className={styles.exampleTitle}>{title}</span>
      </figcaption>
      <div className={styles.exampleBody}>{children}</div>
      <ol className={styles.outcome}>
        <li data-role="situation"><span className={styles.outcomeLabel}>Situation</span>{situation}</li>
        <li data-role="finding"><span className={styles.outcomeLabel}>Result for review</span>{result}</li>
        <li data-role="next"><span className={styles.outcomeLabel}>Next step for your team</span>{next}</li>
      </ol>
      <div className={styles.exampleFoot}>
        <p>{boundary}</p>
        <p>Fictional machines, customer and site. Not a client project; no manufacturer is represented.</p>
      </div>
    </figure>
  );
}

function Drawing({ viewBox, children, ground = true }: { viewBox: string; children: ReactNode; ground?: boolean }) {
  const [x, , width] = viewBox.split(" ").map(Number);
  return (
    <svg viewBox={viewBox} className={styles.drawing} preserveAspectRatio="xMidYMid meet">
      <g transform="scale(1 -1)">
        {ground && <line x1={x} y1={0} x2={x + width} y2={0} stroke="#c9cac6" strokeWidth={1} vectorEffect="non-scaling-stroke" />}
        {children}
      </g>
    </svg>
  );
}

const DRAWING_STATE: Record<State, string> = { ok: "#007dfe", blocked: "#f51625", pending: "transparent" };

// Same anatomy as the 3D chips: white chip, ink text, leader to a dot.
function DrawingLabel({ x, y, title, detail, state, lift = 0.9, size = 1 }: { x: number; y: number; title: string; detail?: string; state?: State; lift?: number; size?: number }) {
  const width = Math.max(title.length * 0.2, (detail?.length ?? 0) * 0.17) + (state ? 0.82 : 0.56);
  const height = detail ? 1.02 : 0.62;
  return (
    <g transform={`translate(${x} ${y}) scale(${size} ${-size})`}>
      <line x1={0} y1={0} x2={0} y2={-lift} stroke="#17191a" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      <circle cx={0} cy={0} r={0.07} fill="#17191a" />
      <g transform={`translate(${-width / 2} ${-lift - height})`}>
        <rect width={width} height={height} rx={0.04} fill="#ffffff" stroke="#d8d9d9" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        {state && <rect x={0.26} y={0.24} width={0.16} height={0.16} fill={DRAWING_STATE[state]} stroke={state === "pending" ? "#17191a" : "none"} strokeWidth={1} vectorEffect="non-scaling-stroke" />}
        <text x={state ? 0.56 : 0.28} y={0.42} fontSize={0.34} fontWeight={600} fill="#17191a">{title}</text>
        {detail && <text x={state ? 0.56 : 0.28} y={0.84} fontSize={0.29} fill="#4a4a48">{detail}</text>}
      </g>
    </g>
  );
}

/* 1. Match the machine */

const MATCH_STEPS: Step[] = [
  { label: "Request", text: "A customer’s message reaches the rental desk." },
  { label: "Brief", text: "The message becomes five structured requirements." },
  { label: "Shortlist", text: "Two machines are compared against fleet records." },
  { label: "Attachment check", text: "The customer confirms the attachment and the records are checked." },
];

const MATCH_STEP_FOCUS: { focus: MatchFocus; machine: MachineId }[] = [
  { focus: "availability", machine: EX014 },
  { focus: "availability", machine: EX014 },
  { focus: "inspection", machine: EX027 },
  { focus: "attachment", machine: EX014 },
];

type BriefRow = { field: string; value: string; status: string; state: State };

function briefRows(confirmed: boolean): BriefRow[] {
  return [
    { field: "Work to perform", value: confirmed ? "Quarry work, including breaking oversize rock" : "Quarry work", status: "Stated", state: "ok" },
    confirmed
      ? { field: "Required attachment", value: `${BREAKER_TYPE}; the customer has none on site`, status: "Confirmed by customer", state: "ok" }
      : { field: "Required attachment", value: "Named only as “the required attachment”", status: "Needs confirmation", state: "pending" },
    { field: "Rental dates", value: `${RENTAL_PERIOD}, starting next week`, status: "Stated", state: "ok" },
    { field: "Site conditions", value: "Surface quarry; ground and working area not described", status: "Needs confirmation", state: "pending" },
    { field: "Delivery requirements", value: "Delivery to the quarry; no receiving window yet", status: "Passed to delivery planning", state: "pending" },
  ];
}

type MatchRecord = { label: string; requirement: string; source: Source; answer: Record<MachineId, string>; state: Record<MachineId, State>; limit: string };

function matchRecords(documented: boolean): Record<MatchFocus, MatchRecord> {
  return {
    attachment: {
      label: "Attachment connection",
      requirement: documented ? `${BREAKER_TYPE} for breaking oversize rock` : "The required attachment, not yet named",
      source: "manufacturer",
      answer: {
        [EX014]: documented
          ? `${BREAKER}’s mounting interface is documented for this model and coupler. The fleet record shows an auxiliary hydraulic circuit fitted.`
          : "Can’t be checked until the customer confirms the attachment.",
        [EX027]: "Not assessed while the machine awaits inspection.",
      },
      state: { [EX014]: documented ? "ok" : "pending", [EX027]: "blocked" },
      limit: "Compatibility comes from documented records, not from the model on screen.",
    },
    capability: {
      label: "Documented operating capability",
      requirement: documented ? "Breaking oversize rock at a surface quarry" : "Quarry work",
      source: "manufacturer",
      answer: {
        [EX014]: "The model’s published specification is on file for the rental specialist. No figures are shown here.",
        [EX027]: "The same specification is on file. Readiness is the open question, not the model.",
      },
      state: { [EX014]: "ok", [EX027]: "ok" },
      limit: "A match doesn’t confirm the machine suits every task or site.",
    },
    transport: {
      label: "Transport dimensions",
      requirement: "Delivery to the quarry",
      source: "manufacturer",
      answer: {
        [EX014]: "Transport length, width, height and weight for this configuration are on file for delivery planning.",
        [EX027]: "On file, but not used until the machine is ready to commit.",
      },
      state: { [EX014]: "ok", [EX027]: "pending" },
      limit: "Dimensions alone don’t establish a route or site access.",
    },
    availability: {
      label: "Availability",
      requirement: RENTAL_PERIOD,
      source: "fleet",
      answer: {
        [EX014]: `No reservation for ${RENTAL_PERIOD}. The next one, ${NEXT_RESERVATION}, starts ${NEXT_RESERVATION_START}.`,
        [EX027]: `No reservation for ${RENTAL_PERIOD}.`,
      },
      state: { [EX014]: "ok", [EX027]: "ok" },
      limit: "A free calendar slot doesn’t mean a machine is ready to rent.",
    },
    inspection: {
      label: "Inspection status",
      requirement: `Ready to rent on ${RENTAL_START}`,
      source: "fleet",
      answer: {
        [EX014]: "Inspected after its last return and released by an authorized reviewer on 6 Oct.",
        [EX027]: "Returned 7 Oct. No inspection recorded, so it can’t be committed.",
      },
      state: { [EX014]: "ok", [EX027]: "blocked" },
      limit: "Readiness follows the inspection and release record, not the calendar.",
    },
  };
}

const MATCH_FOCUS_ORDER: MatchFocus[] = ["availability", "inspection", "attachment", "capability", "transport"];

function MatchFallback({ focus, machine, documented }: { focus: MatchFocus; machine: MachineId; documented: boolean }) {
  const highlight = (id: MachineId): Partial<Record<ElevationArea, ElevationTone>> => {
    if (id !== machine) return {};
    if (focus === "attachment") return { coupler: "yellow" };
    if (focus === "capability") return { arm: "yellow" };
    return {};
  };
  return (
    <Drawing viewBox="-3 -7 25 8">
      <Elevation tool="bucket" highlight={highlight(EX014)} />
      <Breaker x={7.4} y={0} tone={focus === "attachment" && machine === EX014 ? "yellow" : undefined} />
      <Elevation tool="bucket" x={13.5} highlight={highlight(EX027)} />
      <DrawingLabel x={0.55} y={3.05} title={EX014} detail="Candidate match" state="ok" />
      {focus === "attachment" && <DrawingLabel x={8.4} y={0.85} title={BREAKER} detail={documented ? "Documented for EX-014" : "Compatibility to confirm"} state={documented ? "ok" : "pending"} lift={0.7} />}
      <DrawingLabel x={14.05} y={3.05} title={EX027} detail="Awaiting inspection" state="blocked" />
    </Drawing>
  );
}

export function MatchMachine() {
  const [focus, setFocus] = useState<MatchFocus>("availability");
  const [machine, setMachine] = useState<MachineId>(EX014);
  const sequence = useSequence(MATCH_STEPS.length, (step) => {
    setFocus(MATCH_STEP_FOCUS[step].focus);
    setMachine(MATCH_STEP_FOCUS[step].machine);
  });
  const documented = sequence.step === 3;
  const records = matchRecords(documented);
  const record = records[focus];
  const rows = briefRows(documented);
  const pick = (id: MachineId, next?: MatchFocus) => {
    setMachine(id);
    if (next) setFocus(next);
  };
  return (
    <Example
      title="Quarry request, tracked excavator"
      situation={<p>A customer needs an excavator, an attachment and delivery to a surface quarry. Some requirements are still unclear.</p>}
      result={<p><strong>A candidate machine and attachment for review:</strong> {EX014} with {BREAKER}.</p>}
      next={<p>Rental specialist confirms suitability and prepares the quote.</p>}
      boundary="A candidate match is not professional confirmation that a machine suits every task or site. Capacities, operating limits, attachment compatibility and site acceptance come from documented records and the rental specialist’s review."
    >
      <Sequence steps={MATCH_STEPS} sequence={sequence} title="Match the machine" />
      <div className={styles.stage}>
        <MachineView
          scene={{ kind: "match", focus, machine, documented, onPick: pick }}
          fallback={<MatchFallback focus={focus} machine={machine} documented={documented} />}
          label={`Illustrative yard view: ${EX014}, a candidate match; ${EX027}, awaiting inspection; and ${BREAKER}, a ${BREAKER_TYPE.toLowerCase()}.`}
        />
        <div className={styles.panel} aria-live="polite">
          {sequence.step === 0 && (
            <>
              <p className={styles.sheetLabel}>Customer request, by email</p>
              <blockquote className={styles.quote}>“We need an excavator for quarry work next week, with the required attachment and delivery to site.”</blockquote>
              <p className={styles.note}>Today, the rental desk turns this into a brief by hand.</p>
            </>
          )}
          {sequence.step === 1 && (
            <>
              <p className={styles.sheetLabel}>Structured brief</p>
              <ul className={styles.brief}>
                {rows.map((row) => (
                  <li key={row.field}>
                    <span className={styles.briefField}>{row.field}</span>
                    <span className={styles.briefValue}>{row.value}</span>
                    <StateText state={row.state}>{row.status}</StateText>
                  </li>
                ))}
              </ul>
              <p className={styles.callout}>Attachment requirements need confirmation.</p>
            </>
          )}
          {sequence.step === 2 && (
            <>
              <p className={styles.sheetLabel}>Shortlist</p>
              <div className={styles.candidates}>
                <div data-state="ok">
                  <strong>{EX014}</strong>
                  <StateText state="ok">Candidate match</StateText>
                  <span>Rental dates available</span>
                  <span>Readiness record current</span>
                </div>
                <div data-state="blocked">
                  <strong>{EX027}</strong>
                  <StateText state="blocked">Potential alternative</StateText>
                  <span>Rental dates available</span>
                  <span>{EX027_STATE}; not ready to commit</span>
                </div>
              </div>
              <p className={styles.note}>Both calendars are free. Only {EX014} is ready to rent.</p>
            </>
          )}
          {sequence.step === 3 && (
            <>
              <p className={styles.sheetLabel}>Documented compatibility check</p>
              <ul className={styles.facts}>
                <li><SourceTag source="customer" /><span>{BREAKER_TYPE} for breaking oversize rock; no customer-owned attachment.</span></li>
                <li><SourceTag source="fleet" /><span>{BREAKER} is in the yard with no reservation for {RENTAL_PERIOD}.</span></li>
                <li><SourceTag source="manufacturer" /><span>Mounting interface documented for {EX014}’s model and coupler.</span></li>
                <li><SourceTag source="fleet" /><span>Auxiliary hydraulic circuit recorded as fitted to {EX014}.</span></li>
              </ul>
              <p className={styles.note}>Site conditions still need confirmation. They pass to delivery planning.</p>
            </>
          )}
        </div>
      </div>
      <div className={styles.explorer}>
        <div className={styles.explorerHead}>
          <p className={styles.sheetLabel}>The record behind each requirement</p>
          <div className={styles.toggle} role="group" aria-label="Machine">
            {[EX014, EX027].map((id) => (
              <button key={id} type="button" aria-pressed={machine === id} onClick={() => setMachine(id as MachineId)}>{id}</button>
            ))}
          </div>
        </div>
        <div className={styles.segments} role="group" aria-label="Requirements">
          {MATCH_FOCUS_ORDER.map((key) => (
            <button key={key} type="button" aria-pressed={focus === key} onClick={() => setFocus(key)}>{records[key].label}</button>
          ))}
        </div>
        <div className={styles.record} aria-live="polite">
          <div>
            <SourceTag source="customer" />
            <p className={styles.recordText}>{record.requirement}</p>
          </div>
          <div>
            <SourceTag source={record.source} />
            <p className={styles.recordText}><strong>{machine}.</strong> {record.answer[machine]}</p>
          </div>
          <p className={styles.recordLimit}>{record.limit}</p>
        </div>
      </div>
    </Example>
  );
}

/* 2. Prepare the delivery */

const DELIVERY_STEPS: Step[] = [
  { label: "Proposed handoff", text: "Yard, transport and quarry are checked together." },
  { label: "Transport confirmed", text: "The transport coordinator confirms the arrangement." },
  { label: "Site confirmed", text: "The quarry contact confirms the receiving window and access." },
  { label: "Reviewed plan", text: "All four checks are recorded and ready for dispatch." },
];
const DELIVERY_STEP_FOCUS: DeliveryFocus[] = ["overview", "transport", "site", "overview"];

type DeliveryCheck = { id: Exclude<DeliveryFocus, "overview">; label: string; status: string; done: boolean; confirmStep?: number; record: string; missing?: string; owner: string };

function deliveryChecks(transport: boolean, site: boolean): DeliveryCheck[] {
  return [
    { id: "machine", label: "Machine", status: "Inspection and preparation reviewed", done: true, owner: "Yard lead", record: `${EX014}’s readiness record is current (released 6 Oct). Dispatch preparation is reviewed for ${RENTAL_START}.` },
    { id: "attachment", label: "Attachment", status: "Required attachment allocated", done: true, owner: "Rental desk", record: `${BREAKER} is allocated to ${RENTAL} for ${RENTAL_PERIOD}. It travels on the same load and is fitted on site.` },
    transport
      ? { id: "transport", label: "Transport", status: "Transport arrangement confirmed", done: true, owner: "Transport coordinator", record: `${TRANSPORT}: low-loader arrangement reviewed against ${EX014}’s recorded transport dimensions and weight. Loading at the yard agreed for ${RENTAL_START}.` }
      : { id: "transport", label: "Transport", status: "Suitable transport arrangement to confirm", done: false, confirmStep: 1, owner: "Transport coordinator", record: `${TRANSPORT} is requested but not confirmed.`, missing: "A vehicle and trailer suited to this machine’s recorded transport dimensions and weight, the loading arrangement, and any permits that apply." },
    site
      ? { id: "site", label: "Site", status: "Receiving window and access confirmed", done: true, owner: "Customer site contact, recorded by the rental desk", record: `Receiving ${RENTAL_START}, 07:00–09:00, at the quarry gate. The driver needs an escort and site induction.` }
      : { id: "site", label: "Site", status: "Receiving window and access requirements to confirm", done: false, confirmStep: 2, owner: "Customer site contact", record: "Delivery to the quarry is requested.", missing: "The receiving window, the unloading area, and the quarry’s access and induction requirements." },
  ];
}

function DeliveryFallback({ transport, site }: { transport: boolean; site: boolean }) {
  return (
    <Drawing viewBox="-26 -7.4 61 8.6">
      <Elevation tool="bucket" x={-23} />
      <Breaker x={-13.6} y={0} />
      <LowLoaderElevation x={0} y={0} ghost={!transport} />
      <Elevation tool="bucket" pose={TRANSPORT_POSE} x={1.5} y={0.95} flip ghost />
      <Breaker x={-8.4} y={0.95} ghost />
      <polygon points="26,0 34,0 34,5 31,5 31,2.6 26,2.6" fill="#d8d4ca" stroke="#9c9a94" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      <rect x={17} y={0} width={8.4} height={0.1} fill={site ? "#007dfe" : "#17191a"} opacity={site ? 1 : 0.4} />
      <DrawingLabel x={-19} y={3.1} size={1.7} title="Main rental yard" detail="Machine and attachment ready" state="ok" />
      <DrawingLabel x={1.5} y={3.7} size={1.7} title={TRANSPORT} detail={transport ? "Confirmed" : "To confirm"} state={transport ? "ok" : "pending"} />
      <DrawingLabel x={21.2} y={0.1} size={1.7} lift={1.6} title="Quarry receiving area" detail={site ? "Confirmed" : "To confirm"} state={site ? "ok" : "pending"} />
    </Drawing>
  );
}

export function PrepareDelivery() {
  const [focus, setFocus] = useState<DeliveryFocus>("overview");
  const sequence = useSequence(DELIVERY_STEPS.length, (step) => setFocus(DELIVERY_STEP_FOCUS[step]));
  const transport = sequence.step >= 1;
  const site = sequence.step >= 2;
  const checks = deliveryChecks(transport, site);
  const selected = checks.find((check) => check.id === focus);
  const reviewed = sequence.step === 3;
  const open = checks.filter((check) => !check.done).map((check) => check.label.toLowerCase());
  return (
    <Example
      title={`${EX014} delivery to the quarry`}
      situation={<p>The quote is accepted and {EX014} is reserved for {RENTAL_PERIOD}. The handoff to the quarry still has to work.</p>}
      result={reviewed ? <p><strong>A reviewed delivery plan.</strong> Machine, attachment, transport and site are all recorded.</p> : <p><strong>The machine is available. Delivery is not yet confirmed.</strong></p>}
      next={<p>Dispatcher confirms the handoff.</p>}
      boundary="A standard road route doesn’t establish heavy-haul access. Transport suitability, site restrictions, permits where they apply, and loading arrangements need operational review."
    >
      <Sequence steps={DELIVERY_STEPS} sequence={sequence} title="Prepare the delivery" />
      <MachineView
        className={styles.wideView}
        scene={{ kind: "delivery", focus, transport, site, onPick: setFocus }}
        fallback={<DeliveryFallback transport={transport} site={site} />}
        label={`Illustrative handoff from the rental yard to the quarry. ${EX014} waits in the yard with ${BREAKER}. The planned low-loader load is ${transport ? "confirmed" : "still to confirm"}; the quarry receiving area is ${site ? "confirmed" : "still to confirm"}.`}
      >
        <p className={styles.legend} aria-hidden="true">Rental yard <ArrowRight size={13} strokeWidth={1.5} /> Transport <ArrowRight size={13} strokeWidth={1.5} /> Quarry<span className={styles.legendKey}><i data-key="solid" />Recorded<i data-key="ghost" />Planned</span></p>
      </MachineView>
      <div className={styles.checks} role="group" aria-label="Delivery checks">
        {checks.map((check) => (
          <button key={check.id} type="button" aria-pressed={focus === check.id} onClick={() => setFocus(focus === check.id ? "overview" : check.id)}>
            <span className={styles.checkLabel}>{check.label}</span>
            <span className={styles.checkStatus}>{check.status}</span>
            <StateText state={check.done ? "ok" : "pending"}>{check.done ? "Reviewed" : "Open"}</StateText>
          </button>
        ))}
      </div>
      <div className={styles.detail} aria-live="polite">
        {selected ? (
          <>
            <p className={styles.detailTitle}>{selected.record}</p>
            {selected.missing && <p className={styles.detailText}><strong>Missing:</strong> {selected.missing}</p>}
            <p className={styles.detailText}><strong>{selected.done ? "Confirmed by" : "Needs confirmation from"}:</strong> {selected.owner}</p>
            {selected.confirmStep !== undefined && (
              <button type="button" className={styles.action} onClick={() => sequence.go(selected.confirmStep ?? 0)}>Record the confirmation (example) <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" /></button>
            )}
          </>
        ) : (
          <p className={styles.detailText}>{open.length ? `Still open: ${open.join(" and ")}. Select a check to see what’s missing and who confirms it.` : "All four checks are recorded. Select a check to see its record."}</p>
        )}
      </div>
    </Example>
  );
}

/* 3. Manage the rental */

const RENTAL_STEPS: Step[] = [
  { label: "On rent", text: `${EX014} is working at the quarry under ${RENTAL}.` },
  { label: "Extension request", text: "The customer asks for three more days." },
  { label: "Alternatives", text: "Machine, attachment, transport and service are checked." },
  { label: "Terms and usage", text: "Agreed terms and recorded hours, side by side." },
];
const FIRST_DAY = 12;
const LAST_DAY = 31;
const RENTAL_END_DAY = 23;
const NEXT_START_DAY = 25;
const DAY_COUNT = LAST_DAY - FIRST_DAY + 1;
const column = (day: number) => day - FIRST_DAY + 1;

type AlternativeCheck = { id: string; question: string; answer: string; status: string; state: State; focus: RentalFocus };

const RENTAL_CHECKS: AlternativeCheck[] = [
  { id: "machine", question: "Another suitable machine?", answer: `${EX027} is free in the calendar for ${NEXT_RESERVATION}, but its inspection, booked for ${EX027_INSPECTION_BOOKED}, isn’t recorded.`, status: "Not ready to commit", state: "blocked", focus: "ex027" },
  { id: "attachment", question: "Attachment available?", answer: `${BREAKER} has no booking after ${RENTAL_END}, so it can stay with ${EX014}.`, status: "Available", state: "ok", focus: "ex014" },
  { id: "transport", question: "Transport change?", answer: `Pickup ${PICKUP} on 24 Oct would move, and ${NEXT_RESERVATION} would need a delivery from the yard.`, status: "Change required", state: "pending", focus: "both" },
  { id: "service", question: "Service affected?", answer: `${EX014}’s next service is due by recorded hours. The maintenance supervisor confirms whether the extra days reach it.`, status: "To confirm", state: "pending", focus: "ex014" },
];

function RentalFallback({ conflict, focus }: { conflict: boolean; focus: RentalFocus }) {
  return (
    <Drawing viewBox="-3 -7 26 8">
      <polygon points="-2.8,0 9.6,0 9.6,2.2 4.5,2.2 4.5,3.8 -2.8,3.8" fill="#e6e2d9" stroke="#c9c5bb" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      <line x1={11.4} y1={0} x2={11.4} y2={5.8} stroke="#c9cac6" strokeWidth={1} strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
      <Elevation tool="breaker" pose={POSES.parked} />
      <Elevation tool="bucket" x={16} highlight={focus === "ex027" ? { house: "yellow" } : {}} />
      <DrawingLabel x={0.55} y={3.05} title={`${EX014} · On rent`} detail={conflict ? "Next reservation starts during the extension" : "At the quarry"} state={conflict ? "blocked" : "ok"} />
      <DrawingLabel x={16.55} y={3.05} title={EX027} detail="Awaiting inspection" state="blocked" />
    </Drawing>
  );
}

function RentalTimeline({ extension, conflict }: { extension: number; conflict: boolean }) {
  return (
    <div className={styles.timeline} role="img" aria-label={`Calendar for ${EX014}: ${RENTAL} runs ${RENTAL_PERIOD}${extension ? `, a ${extension}-day extension is proposed` : ""}, and ${NEXT_RESERVATION} starts ${NEXT_RESERVATION_START}.`}>
      <div className={styles.timelineTrack} style={{ gridTemplateColumns: `repeat(${DAY_COUNT}, minmax(0, 1fr))` }}>
        <span className={styles.span} data-kind="rent" style={{ gridColumn: `${column(FIRST_DAY)} / ${column(RENTAL_END_DAY) + 1}` }}>{RENTAL}</span>
        <span className={styles.span} data-kind="turn" style={{ gridColumn: `${column(24)} / span 1` }} />
        <span className={styles.span} data-kind={conflict ? "blocked" : "next"} style={{ gridColumn: `${column(NEXT_START_DAY)} / ${column(LAST_DAY) + 1}` }}>{NEXT_RESERVATION}</span>
        {extension > 0 && <span className={styles.span} data-kind="proposed" style={{ gridColumn: `${column(24)} / span ${extension}`, gridRow: 2 }}>+{extension}</span>}
      </div>
      <div className={styles.timelineAxis} style={{ gridTemplateColumns: `repeat(${DAY_COUNT}, minmax(0, 1fr))` }} aria-hidden="true">
        <span style={{ gridColumn: "1 / span 4" }}>12 Oct</span>
        <span style={{ gridColumn: `${column(RENTAL_END_DAY) - 1} / span 4` }}>23 Oct</span>
        <span style={{ gridColumn: `${column(LAST_DAY) - 3} / span 4`, textAlign: "right" }}>31 Oct</span>
      </div>
    </div>
  );
}

export function ManageRental() {
  const [extension, setExtension] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const sequence = useSequence(RENTAL_STEPS.length, (step) => {
    setExtension(step === 0 ? 0 : 3);
    setSelected(step === 2 ? "machine" : null);
  });
  const lastDay = RENTAL_END_DAY + extension;
  const conflict = lastDay >= NEXT_START_DAY;
  const tight = extension === 1;
  const check = RENTAL_CHECKS.find((item) => item.id === selected);
  const focus: RentalFocus = check ? check.focus : conflict ? "both" : "ex014";
  const extend = (days: number) => {
    setExtension(days);
    if (days > 0 && sequence.step === 0) sequence.go(1);
  };
  const result = conflict
    ? <p><strong>The extension needs a reviewed alternative plan.</strong></p>
    : tight
      ? <p><strong>The extension uses the turnaround day before {NEXT_RESERVATION}.</strong> Return, inspection and delivery need review.</p>
      : <p><strong>No change requested yet.</strong></p>;
  const extensionControl = (
    <div className={styles.extend}>
      <p className={styles.sheetLabel} id="extension-label">Extend the rental</p>
      <div className={styles.segments} role="group" aria-labelledby="extension-label">
        {[0, 1, 2, 3].map((days) => <button key={days} type="button" aria-pressed={extension === days} onClick={() => extend(days)}>{days === 0 ? "No extension" : `+${days} ${days > 1 ? "days" : "day"}`}</button>)}
      </div>
    </div>
  );
  return (
    <Example
      title={`${EX014} on rent, extension request`}
      situation={<p>{EX014} is on rent at the quarry until {RENTAL_END}. The customer asks, “Can we keep the machine for three more days?”</p>}
      result={result}
      next={<p>Rental team confirms the arrangement before approving the extension.</p>}
      boundary="Engine hours, productive hours and billable hours aren’t automatically the same; billing follows the agreement and verified records. Nothing here changes a reservation, messages a customer or applies a charge."
    >
      <Sequence steps={RENTAL_STEPS} sequence={sequence} title="Manage the rental" />
      <div className={styles.stage}>
        <MachineView
          scene={{ kind: "rental", focus, conflict, onPick: (next) => setSelected(next === "ex027" ? "machine" : null) }}
          fallback={<RentalFallback conflict={conflict} focus={focus} />}
          label={`Illustrative view: ${EX014} on rent at the quarry with ${BREAKER}, and ${EX027} in the yard, awaiting inspection.${conflict ? ` The extension overlaps ${NEXT_RESERVATION}.` : ""}`}
        />
        <div className={styles.panel} aria-live="polite">
          {sequence.step === 0 && (
            <>
              <p className={styles.sheetLabel}>{EX014} rental calendar</p>
              <RentalTimeline extension={extension} conflict={conflict} />
              <p className={styles.note}>{EX014} returns {RENTAL_END}. {NEXT_RESERVATION}, for another customer, starts {NEXT_RESERVATION_START}.</p>
              {extensionControl}
            </>
          )}
          {sequence.step === 1 && (
            <>
              <blockquote className={styles.quote}>“Can we keep the machine for three more days?”</blockquote>
              {extensionControl}
              <RentalTimeline extension={extension} conflict={conflict} />
              {conflict && <p className={styles.conflict}>The next customer’s reservation starts during the requested extension.</p>}
              {tight && <p className={styles.note}>One extra day leaves no turnaround before {NEXT_RESERVATION}.</p>}
            </>
          )}
          {sequence.step === 2 && (
            <>
              <p className={styles.sheetLabel}>Before approving</p>
              <ul className={styles.checklist}>
                {RENTAL_CHECKS.map((item) => (
                  <li key={item.id}>
                    <button type="button" aria-pressed={selected === item.id} disabled={!conflict && !tight} onClick={() => setSelected(selected === item.id ? null : item.id)}>
                      <span className={styles.checklistQuestion}>{item.question}</span>
                      <StateText state={item.state}>{item.status}</StateText>
                    </button>
                    {selected === item.id && <p className={styles.checklistAnswer}>{item.answer}</p>}
                  </li>
                ))}
              </ul>
              {!conflict && !tight && <p className={styles.note}>Extend the rental to see what it affects.</p>}
            </>
          )}
          {sequence.step === 3 && (
            <>
              <p className={styles.sheetLabel}>Terms and usage</p>
              <dl className={styles.terms}>
                <div><dt>Agreed rental terms</dt><dd>The rental agreement for {RENTAL}, on file. Any extension follows it.</dd></div>
                <div><dt>Recorded operating hours</dt><dd>{METER_ON_RENT}, an example recorded reading. Last updated {METER_ON_RENT_UPDATED} from a meter photo; not live telemetry.</dd></div>
                <div><dt>Proposed additional period</dt><dd>{extension === 0 ? "None requested" : `24–${lastDay} Oct, ${extension} ${extension > 1 ? "days" : "day"}`}</dd></div>
                <div><dt>Charges requiring review</dt><dd>Worked out under the agreed terms after review. No price is shown or applied.</dd></div>
              </dl>
            </>
          )}
        </div>
      </div>
    </Example>
  );
}

/* 4. Return it to service */

const RETURN_STEPS: Step[] = [
  { label: RETURN_STAGES[0], text: `${EX014} is back at the yard with ${BREAKER}.` },
  { label: RETURN_STAGES[1], text: "Return evidence is compared with the handoff." },
  { label: RETURN_STAGES[2], text: "The inspector records maintenance required before release." },
  { label: RETURN_STAGES[3], text: "Maintenance is recorded and release is approved." },
  { label: RETURN_STAGES[4], text: "The release updates availability." },
];

const RETURN_ACTIONS = [
  "Start the inspection",
  "Record the inspection finding",
  "Release after recorded maintenance",
  "Apply the release to availability",
];

type AreaEvidence = { label: string; before: string; after: string; status: string; state: State; note: string };

const AREAS: Record<Exclude<ReturnArea, "overall">, AreaEvidence> = {
  sidePanel: { label: "Side panel", before: "Right side panel; no marks recorded.", after: "Possible new mark on side panel.", status: "Needs inspection", state: "pending", note: "Not a damage finding. The inspector checks it; any charge is reviewed separately under the agreed terms." },
  attachment: { label: "Attachment", before: `${BREAKER} fitted at handoff.`, after: `${BREAKER} returned with the machine.`, status: "Returned", state: "ok", note: "The attachment has its own inspection entry." },
  undercarriage: { label: "Undercarriage", before: "Tracks photographed at handoff.", after: "Tracks photographed on return; no visible difference.", status: "Compared", state: "ok", note: "Photos show surfaces only, not internal or mechanical condition." },
  meter: { label: "Hour meter", before: `${METER_AT_HANDOFF} at handoff, ${RENTAL_START}.`, after: `${METER_AT_RETURN} on return.`, status: "Recorded", state: "ok", note: "Recorded operating hours. Billable hours follow the rental agreement." },
};
const AREA_ORDER = Object.keys(AREAS) as (keyof typeof AREAS)[];

function ReturnFallback({ area, stage }: { area: ReturnArea; stage: number }) {
  const highlight: Partial<Record<ElevationArea, ElevationTone>> = area === "sidePanel" ? { sidePanel: "yellow" } : area === "attachment" ? { tool: "yellow", coupler: "yellow" } : area === "undercarriage" ? { tracks: "yellow" } : area === "meter" ? { cab: "yellow" } : {};
  return (
    <Drawing viewBox="-2.6 -5.6 22 6.4">
      <Elevation tool="breaker" pose={POSES.parked} highlight={highlight} />
      <line x1={8.2} y1={-0.4} x2={8.2} y2={5.6} stroke="#c9cac6" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      <Elevation tool="breaker" pose={POSES.parked} x={10.6} highlight={highlight} mark />
      {stage === 2 && <rect x={10.6 - 2} y={-0.25} width={8.8} height={0.12} fill="#f51625" />}
    </Drawing>
  );
}

export function ReturnToService() {
  const [stage, setStage] = useState(0);
  const [area, setArea] = useState<ReturnArea>("overall");
  const [showHold, setShowHold] = useState(false);
  const { ref, width } = useWidth<HTMLDivElement>();
  const stacked = width > 0 && width < 560;
  const evidence = area === "overall" ? null : AREAS[area];
  const ready = stage === 4;
  const advance = () => {
    const next = Math.min(4, stage + 1);
    setStage(next);
    if (next === 1) setArea("sidePanel");
    if (next === 2) setShowHold(true);
  };
  const reset = () => { setStage(0); setArea("overall"); setShowHold(false); };
  const outcome = stage === 0 ? "Pending" : stage === 1 ? "Inspection under way" : stage === 2 ? "Maintenance required before release" : "Maintenance recorded; released by an authorized reviewer";
  const current = RETURN_STEPS[stage];
  return (
    <Example
      title={`${EX014} return and inspection`}
      situation={<p>{EX014} comes back to the yard with {BREAKER}. Its next reservation, {NEXT_RESERVATION}, depends on what the return shows.</p>}
      result={<p><strong>A documented return and reviewed readiness status.</strong></p>}
      next={<p>{ready ? "The rental desk can offer the machine again." : "Inspector and maintenance supervisor work through the open items."}</p>}
      boundary="Photos can support an inspection but can’t establish every defect or mechanical condition. This isn’t safety certification or predictive maintenance. Customer liability and additional charges need separate review under the agreed terms."
    >
      <div className={styles.sequence}>
        <ol className={styles.steps} style={{ gridTemplateColumns: "repeat(5, minmax(0, 1fr))" }} aria-label="Return stages">
          {RETURN_STEPS.map((item, index) => (
            <li key={item.label}>
              <button type="button" aria-current={stage === index ? "step" : undefined} data-done={index < stage} disabled={index > stage} onClick={() => setStage(index)}>
                <span className={styles.stepIndex}>{String(index + 1).padStart(2, "0")}</span>
                <span className={styles.stepLabel}>{item.label}</span>
              </button>
            </li>
          ))}
        </ol>
        <div className={styles.sequenceBar}>
          <p className={styles.caption} aria-live="polite"><span className={styles.captionStep}>{String(stage + 1).padStart(2, "0")} / 05 · {current.label}</span>{current.text}</p>
          <div className={styles.controls}>
            {stage < 4 && <button type="button" className={styles.action} onClick={advance}>{RETURN_ACTIONS[stage]} <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" /></button>}
            <button type="button" aria-label="Reset example" onClick={reset}><RotateCcw size={14} strokeWidth={1.5} /></button>
          </div>
        </div>
      </div>
      <div ref={ref}>
        <MachineView
          className={stacked ? styles.splitStacked : styles.split}
          scene={{ kind: "return", area, stage, stacked }}
          fallback={<ReturnFallback area={area} stage={stage} />}
          label={`Matched views of ${EX014} before rental and on return${evidence ? `, focused on the ${evidence.label.toLowerCase()}` : ""}. A possible new mark appears on the side panel in the return view.`}
        >
          <div className={styles.splitLabels} data-stacked={stacked} aria-hidden="true">
            <span>Before rental <em>Handoff photos, {RENTAL_START}</em></span>
            <span>On return <em>Yard check-in</em></span>
          </div>
        </MachineView>
      </div>
      <div className={styles.returnGrid}>
        <div>
          <p className={styles.sheetLabel}>Inspection area</p>
          <div className={styles.segments} role="group" aria-label="Inspection areas">
            <button type="button" aria-pressed={area === "overall"} onClick={() => setArea("overall")}>Whole machine</button>
            {AREA_ORDER.map((key) => <button key={key} type="button" aria-pressed={area === key} onClick={() => setArea(key)}>{AREAS[key].label}</button>)}
          </div>
          {evidence ? (
            <div className={styles.compare} aria-live="polite">
              <div><span className={styles.sheetLabel}>Before rental</span><p>{evidence.before}</p></div>
              <div><span className={styles.sheetLabel}>On return</span><p>{evidence.after}</p><StateText state={evidence.state}>{evidence.status}</StateText></div>
              <p className={styles.note}>{evidence.note}</p>
            </div>
          ) : (
            <p className={styles.note}>Select an area to compare matching before and after evidence. Views are schematic, not photographs.</p>
          )}
        </div>
        <div>
          <p className={styles.sheetLabel}>Return record</p>
          <dl className={styles.returnRecord}>
            <div><dt>Condition photos</dt><dd>Handoff and return sets, matched by area</dd></div>
            <div><dt>Meter reading</dt><dd>{METER_AT_RETURN} on return ({METER_AT_HANDOFF} at handoff)</dd></div>
            <div><dt>Attachment returned</dt><dd>{BREAKER}, with the machine</dd></div>
            <div><dt>Reported issues</dt><dd>None reported by the customer at pickup</dd></div>
            <div><dt>Inspection outcome</dt><dd data-state={stage === 2 ? "blocked" : undefined}>{outcome}</dd></div>
          </dl>
          {stage >= 2 && (
            <div className={styles.hold} data-cleared={stage >= 3}>
              <button type="button" aria-expanded={showHold} onClick={() => setShowHold(!showHold)}>
                <StateText state={stage >= 3 ? "ok" : "blocked"}>{stage >= 3 ? "Maintenance hold cleared" : "Maintenance hold"}</StateText>
                <span className={styles.disclosure}>{showHold ? "Hide reason" : "Show reason"}</span>
              </button>
              {showHold && (
                <div className={styles.holdDetail}>
                  <p><strong>Recorded reason:</strong> scheduled service due. Recorded operating hours reached the service interval during this rental. Entered by the inspector.</p>
                  <p><strong>Required follow-up:</strong> complete {WORK_ORDER} and record the side panel outcome. An authorized reviewer then decides on release.</p>
                </div>
              )}
            </div>
          )}
          <p className={styles.availability}>
            <StateText state={ready ? "ok" : "blocked"}>{ready ? "Ready for rental" : stage === 3 ? "Release recorded" : "Not available"}</StateText>
            <span>{ready ? "Released by an authorized reviewer." : stage === 3 ? "Availability updates when the release is applied." : "Blocked until an authorized release."}</span>
          </p>
        </div>
      </div>
    </Example>
  );
}
