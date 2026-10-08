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

function useNearViewport<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setNear(true);
        observer.disconnect();
      }
    }, { rootMargin: "600px 0px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return { ref, near };
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

type SceneInput = SceneProps extends infer P ? (P extends unknown ? Omit<P, "onReady"> : never) : never;

function MachineView({ scene, fallback, label, className = "", children }: { scene: SceneInput; fallback: ReactNode; label: string; className?: string; children?: ReactNode }) {
  const reduced = useReducedMotion();
  const webgl = useSyncExternalStore(noSubscription, hasWebGL, () => false);
  const { ref, near } = useNearViewport<HTMLDivElement>();
  const [ready, setReady] = useState(false);
  const live = near && webgl && !reduced;
  return (
    <div ref={ref} className={`${styles.viewport} ${className}`} role="img" aria-label={label}>
      <div className={styles.fallback} data-hidden={live && ready} aria-hidden="true">{fallback}</div>
      {live && <ExcavatorScene {...(scene as SceneProps)} onReady={() => setReady(true)} />}
      {children}
      <span className={styles.viewNote} aria-hidden="true">{live && ready ? "Illustrative model, select a part" : "Illustrative drawing"}</span>
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
    const timer = setTimeout(advance, 3600);
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
  return (
    <div className={styles.sequence}>
      <ol className={styles.steps} aria-label={`${title} steps`}>
        {steps.map((item, index) => (
          <li key={item.label}>
            <button type="button" aria-current={sequence.step === index ? "step" : undefined} data-done={index < sequence.step} onClick={() => sequence.go(index)}>
              <span className={styles.stepIndex}>{String(index + 1).padStart(2, "0")}</span>
              <span className={styles.stepLabel}>{item.label}</span>
              <span className={styles.stepText}>{item.text}</span>
            </button>
          </li>
        ))}
      </ol>
      <div className={styles.controls}>
        <button type="button" aria-label="Previous step" disabled={sequence.step === 0} onClick={() => sequence.go(sequence.step - 1)}><ChevronLeft size={16} strokeWidth={1.5} /></button>
        <button type="button" aria-label="Next step" disabled={sequence.step === steps.length - 1} onClick={() => sequence.go(sequence.step + 1)}><ChevronRight size={16} strokeWidth={1.5} /></button>
        <button type="button" aria-label={sequence.playing ? "Pause example" : "Play example"} onClick={sequence.toggle}>{sequence.playing ? <Pause size={14} /> : <Play size={14} />}</button>
        <button type="button" aria-label="Replay example" onClick={sequence.replay}><RotateCcw size={14} strokeWidth={1.5} /></button>
        <span aria-live="polite">Step {sequence.step + 1} of {steps.length}</span>
      </div>
    </div>
  );
}

type Tone = "ok" | "flag" | "alert" | "quiet" | "done";

function Status({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={styles.status} data-tone={tone}>{children}</span>;
}

function SourceTag({ source }: { source: Source }) {
  return <span className={styles.source} data-source={source}>{SOURCES[source]}</span>;
}

function MachineChip({ id, state, tone }: { id: string; state: string; tone: Tone }) {
  return <span className={styles.machineChip} data-tone={tone}><strong>{id}</strong>{state}</span>;
}

type ExampleProps = {
  title: string;
  chips: ReactNode;
  children: ReactNode;
  situation: ReactNode;
  output: ReactNode;
  next: ReactNode;
};

function Example({ title, chips, children, situation, output, next }: ExampleProps) {
  return (
    <figure className={styles.example}>
      <figcaption className={styles.exampleBar}>
        <span className={styles.exampleTag}>Example workflow</span>
        <span className={styles.exampleTitle}>{title}</span>
        <span className={styles.chips}>{chips}</span>
      </figcaption>
      <div className={styles.exampleBody}>{children}</div>
      <ol className={styles.outcome}>
        <li data-role="situation"><span className={styles.outcomeLabel}>Situation</span>{situation}</li>
        <li data-role="finding"><span className={styles.outcomeLabel}>Result for review</span>{output}</li>
        <li data-role="next"><span className={styles.outcomeLabel}>Next step for your team</span>{next}</li>
      </ol>
      <p className={styles.exampleFoot}>Fictional machines, customer, and site. Not a client project, and no manufacturer is represented.</p>
    </figure>
  );
}

function Drawing({ viewBox, children, ground = true }: { viewBox: string; children: ReactNode; ground?: boolean }) {
  const [x, , width] = viewBox.split(" ").map(Number);
  return (
    <svg viewBox={viewBox} className={styles.drawing} preserveAspectRatio="xMidYMid meet">
      <g transform="scale(1 -1)">
        {ground && <line x1={x} y1={0} x2={x + width} y2={0} stroke="#b9baba" strokeWidth={1} vectorEffect="non-scaling-stroke" />}
        {children}
      </g>
    </svg>
  );
}

function DrawingLabel({ x, y, children, tone = "plain", size = 1 }: { x: number; y: number; children: string; tone?: "plain" | "flag" | "ok" | "alert" | "ink"; size?: number }) {
  const fills = { plain: ["#ffffff", "#17191a"], flag: ["#fed603", "#17191a"], ok: ["#007dfe", "#ffffff"], alert: ["#f51625", "#ffffff"], ink: ["#17191a", "#ffffff"] };
  const width = children.length * 0.205 + 0.5;
  return (
    <g transform={`translate(${x} ${y}) scale(${size} ${-size})`}>
      <rect x={-width / 2} y={-0.62} width={width} height={0.62} fill={fills[tone][0]} />
      <text x={0} y={-0.2} textAnchor="middle" fontSize={0.36} fontWeight={600} fill={fills[tone][1]}>{children}</text>
    </g>
  );
}

/* 1. Match the machine */

const MATCH_STEPS: Step[] = [
  { label: "Request", text: "A customer message reaches the rental desk." },
  { label: "Brief", text: "The request becomes structured requirements." },
  { label: "Shortlist", text: "Two machines compared with fleet records." },
  { label: "Attachment check", text: "The missing detail is supplied and checked." },
];

const MATCH_STEP_FOCUS: { focus: MatchFocus; machine: MachineId }[] = [
  { focus: "availability", machine: EX014 },
  { focus: "availability", machine: EX014 },
  { focus: "inspection", machine: EX027 },
  { focus: "attachment", machine: EX014 },
];

type BriefRow = { field: string; value: string; status: string; tone: Tone };

function briefRows(confirmed: boolean): BriefRow[] {
  return [
    { field: "Work to perform", value: confirmed ? "Quarry work, including breaking oversize rock" : "Quarry work", status: "Stated", tone: "quiet" },
    confirmed
      ? { field: "Required attachment", value: `${BREAKER_TYPE}. The customer has none on site.`, status: "Confirmed by customer", tone: "ok" }
      : { field: "Required attachment", value: "Named only as “the required attachment”", status: "Needs confirmation", tone: "flag" },
    { field: "Rental dates", value: `${RENTAL_PERIOD}, starting next week`, status: "Stated", tone: "quiet" },
    { field: "Site conditions", value: "Surface quarry. Ground and working area not yet described.", status: "Needs confirmation", tone: "flag" },
    { field: "Delivery requirements", value: "Delivery to the quarry. Receiving window not yet given.", status: "Carried to delivery", tone: "quiet" },
  ];
}

type MatchRecord = { label: string; requirement: string; source: Source; answer: Record<MachineId, string>; tone: Record<MachineId, Tone>; limit: string };

function matchRecords(documented: boolean): Record<MatchFocus, MatchRecord> {
  return {
    attachment: {
      label: "Attachment connection",
      requirement: documented ? `${BREAKER_TYPE} for breaking oversize rock` : "The required attachment, not yet named",
      source: "manufacturer",
      answer: {
        [EX014]: documented
          ? `${BREAKER}'s mounting interface is documented for this machine's model and coupler. The fleet record shows an auxiliary hydraulic circuit fitted.`
          : "Cannot be checked until the customer confirms which attachment is required.",
        [EX027]: "Not assessed. The machine is awaiting inspection.",
      },
      tone: { [EX014]: documented ? "ok" : "flag", [EX027]: "quiet" },
      limit: "Compatibility comes from documented records, not from the model on screen.",
    },
    capability: {
      label: "Documented operating capability",
      requirement: documented ? "Breaking oversize rock at a surface quarry" : "Quarry work",
      source: "manufacturer",
      answer: {
        [EX014]: "The published specification for this model is on file for the rental specialist. This example shows no figures.",
        [EX027]: "Same specification on file. Readiness is the open question, not the model.",
      },
      tone: { [EX014]: "quiet", [EX027]: "quiet" },
      limit: "A match is not confirmation that the machine suits every task or site.",
    },
    transport: {
      label: "Transport dimensions",
      requirement: "Delivery to the quarry",
      source: "manufacturer",
      answer: {
        [EX014]: "Transport length, width, height, and weight for this configuration are on file and pass to delivery planning.",
        [EX027]: "On file, as for EX-014. Not used until the machine is ready to commit.",
      },
      tone: { [EX014]: "quiet", [EX027]: "quiet" },
      limit: "Dimensions alone do not establish a route or site access.",
    },
    availability: {
      label: "Availability",
      requirement: RENTAL_PERIOD,
      source: "fleet",
      answer: {
        [EX014]: `No reservation ${RENTAL_PERIOD}. The next reservation, ${NEXT_RESERVATION}, begins ${NEXT_RESERVATION_START}.`,
        [EX027]: `No reservation ${RENTAL_PERIOD}.`,
      },
      tone: { [EX014]: "ok", [EX027]: "ok" },
      limit: "A free calendar slot does not establish that a machine is ready to rent.",
    },
    inspection: {
      label: "Inspection status",
      requirement: `Ready to rent on ${RENTAL_START}`,
      source: "fleet",
      answer: {
        [EX014]: "Inspected after its last return and released by an authorized reviewer on 6 Oct. Readiness record current.",
        [EX027]: "Returned 7 Oct. No inspection recorded yet, so it is not ready to commit.",
      },
      tone: { [EX014]: "ok", [EX027]: "flag" },
      limit: "Readiness follows the inspection and release record, not the calendar.",
    },
  };
}

const MATCH_FOCUS_ORDER: MatchFocus[] = ["attachment", "capability", "transport", "availability", "inspection"];

function MatchFallback({ focus, machine, documented }: { focus: MatchFocus; machine: MachineId; documented: boolean }) {
  const tone: ElevationTone = documented ? "blue" : "yellow";
  const highlight = (id: MachineId): Partial<Record<ElevationArea, ElevationTone>> => {
    if (id !== machine) return {};
    if (focus === "attachment") return { coupler: id === EX014 ? tone : "yellow" };
    if (focus === "capability") return { arm: "blue" };
    return {};
  };
  return (
    <Drawing viewBox="-3 -6.4 25 7.4">
      <Elevation tool="bucket" highlight={highlight(EX014)} />
      <Breaker x={7.4} y={0} tone={focus === "attachment" && machine === EX014 ? tone : undefined} />
      <Elevation tool="bucket" x={13.5} highlight={highlight(EX027)} />
      <DrawingLabel x={1.2} y={5.6} tone="ok">EX-014 · Candidate match</DrawingLabel>
      <DrawingLabel x={8.6} y={1.8} tone={documented ? "plain" : "flag"}>{documented ? "AT-112 · Documented" : "AT-112 · To confirm"}</DrawingLabel>
      <DrawingLabel x={14.7} y={5.6} tone="flag">EX-027 · Awaiting inspection</DrawingLabel>
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
      chips={<><MachineChip id={EX014} state="Ready for rental" tone="ok" /><MachineChip id={EX027} state={EX027_STATE} tone="flag" /></>}
      situation={<p>A customer needs an excavator, an attachment, and delivery to a surface quarry. Some requirements are still unclear.</p>}
      output={<p><strong>A candidate machine and attachment for review:</strong> {EX014} with {BREAKER}. Not a confirmation of suitability for every task or site.</p>}
      next={<p>Rental specialist confirms suitability and prepares the quote.</p>}
    >
      <Sequence steps={MATCH_STEPS} sequence={sequence} title="Match the machine" />
      <div className={styles.stage}>
        <MachineView
          scene={{ kind: "match", focus, machine, documented, onPick: pick }}
          fallback={<MatchFallback focus={focus} machine={machine} documented={documented} />}
          label={`Illustrative yard view: ${EX014}, a candidate match, ${EX027}, awaiting inspection, and ${BREAKER}, a ${BREAKER_TYPE.toLowerCase()}.`}
        />
        <div className={styles.panel} aria-live="polite">
          {sequence.step === 0 && (
            <div className={styles.request}>
              <p className={styles.sheetLabel}>Customer request, by email</p>
              <blockquote>“We need an excavator for quarry work next week, with the required attachment and delivery to site.”</blockquote>
              <p className={styles.evidenceNote}>The rental desk would normally rebuild this into a brief by hand.</p>
            </div>
          )}
          {sequence.step === 1 && (
            <div>
              <p className={styles.sheetLabel}>Structured brief</p>
              <ul className={styles.brief}>
                {rows.map((row) => (
                  <li key={row.field}>
                    <span className={styles.briefField}>{row.field}</span>
                    <span className={styles.briefValue}>{row.value}</span>
                    <Status tone={row.tone}>{row.status}</Status>
                  </li>
                ))}
              </ul>
              <p className={styles.flagLine}>Attachment requirements need confirmation.</p>
            </div>
          )}
          {sequence.step === 2 && (
            <div>
              <p className={styles.sheetLabel}>Shortlist</p>
              <div className={styles.candidates}>
                <div data-tone="ok">
                  <strong>{EX014}</strong>
                  <Status tone="ok">Candidate match</Status>
                  <span>Rental dates available</span>
                  <span>Readiness record current</span>
                </div>
                <div data-tone="flag">
                  <strong>{EX027}</strong>
                  <Status tone="flag">Potential alternative</Status>
                  <span>{EX027_STATE}</span>
                  <span>Not ready to commit</span>
                </div>
              </div>
              <table className={styles.matrix}>
                <thead><tr><th>Record</th><th>{EX014}</th><th>{EX027}</th></tr></thead>
                <tbody>
                  <tr><td>Calendar, {RENTAL_PERIOD}</td><td>Free</td><td>Free</td></tr>
                  <tr><td>Readiness</td><td>Current</td><td data-flag="true">{EX027_STATE}</td></tr>
                  <tr><td>Attachment</td><td data-flag="true">To confirm</td><td>Not assessed</td></tr>
                </tbody>
              </table>
              <p className={styles.evidenceNote}>Both calendars are free. Only one machine has a current readiness record.</p>
            </div>
          )}
          {sequence.step === 3 && (
            <div className={styles.check}>
              <p className={styles.sheetLabel}>Brief updated</p>
              <ul className={styles.brief}>
                {rows.filter((row) => row.field === "Required attachment" || row.field === "Site conditions").map((row) => (
                  <li key={row.field}>
                    <span className={styles.briefField}>{row.field}</span>
                    <span className={styles.briefValue}>{row.value}</span>
                    <Status tone={row.tone}>{row.status}</Status>
                  </li>
                ))}
              </ul>
              <p className={styles.sheetLabel}>Documented compatibility check</p>
              <ul>
                <li><SourceTag source="customer" /><span>{BREAKER_TYPE} for breaking oversize rock. No customer-owned attachment.</span></li>
                <li><SourceTag source="fleet" /><span>{BREAKER} is in the yard with no reservation for {RENTAL_PERIOD}.</span></li>
                <li><SourceTag source="manufacturer" /><span>Mounting interface documented for {EX014}&rsquo;s model and coupler.</span></li>
                <li><SourceTag source="fleet" /><span>Auxiliary hydraulic circuit recorded as fitted to {EX014}.</span></li>
              </ul>
            </div>
          )}
        </div>
      </div>
      <div className={styles.explorer}>
        <div className={styles.explorerHead}>
          <p className={styles.sheetLabel}>Select a requirement to see the record behind it</p>
          <div className={styles.toggle} role="group" aria-label="Machine">
            {[EX014, EX027].map((id) => (
              <button key={id} type="button" aria-pressed={machine === id} onClick={() => setMachine(id as MachineId)}>{id}</button>
            ))}
          </div>
        </div>
        <div className={styles.requirements} role="group" aria-label="Requirements">
          {MATCH_FOCUS_ORDER.map((key) => (
            <button key={key} type="button" aria-pressed={focus === key} onClick={() => setFocus(key)}>{records[key].label}</button>
          ))}
        </div>
        <div className={styles.record} aria-live="polite">
          <div>
            <p className={styles.recordLabel}><SourceTag source="customer" /> What the customer needs</p>
            <p className={styles.recordText}>{record.requirement}</p>
          </div>
          <div>
            <p className={styles.recordLabel}><SourceTag source={record.source} /> {machine}</p>
            <p className={styles.recordText}>{record.answer[machine]}</p>
            <Status tone={record.tone[machine]}>{record.tone[machine] === "ok" ? "Supported by record" : record.tone[machine] === "flag" ? "Open" : "For reference"}</Status>
          </div>
          <p className={styles.recordLimit}>{record.limit}</p>
        </div>
      </div>
      <p className={styles.boundary}>A candidate match is not professional confirmation that equipment suits every task or site. Capacities, operating limits, attachment compatibility, and site acceptance come from documented records and the rental specialist&rsquo;s review, not from this example.</p>
    </Example>
  );
}

/* 2. Prepare the delivery */

const DELIVERY_STEPS: Step[] = [
  { label: "Proposed handoff", text: "Yard, transport, and quarry checked together." },
  { label: "Transport confirmed", text: "The transport coordinator confirms the arrangement." },
  { label: "Site confirmed", text: "The quarry contact confirms window and access." },
  { label: "Reviewed plan", text: "All four checks reviewed for dispatch." },
];
const DELIVERY_STEP_FOCUS: DeliveryFocus[] = ["overview", "transport", "site", "overview"];

type DeliveryCheck = {
  id: Exclude<DeliveryFocus, "overview">;
  label: string;
  status: string;
  done: boolean;
  confirmStep?: number;
  record: string;
  missing?: string;
  owner: string;
};

function deliveryChecks(transport: boolean, site: boolean): DeliveryCheck[] {
  return [
    { id: "machine", label: "Machine", status: "Inspection and preparation reviewed", done: true, owner: "Yard lead", record: `${EX014}: readiness record current, released 6 Oct. Dispatch preparation reviewed for ${RENTAL_START}.` },
    { id: "attachment", label: "Attachment", status: "Required attachment allocated", done: true, owner: "Rental desk", record: `${BREAKER} allocated to ${RENTAL} for ${RENTAL_PERIOD}. Travels on the same load and is fitted on site.` },
    transport
      ? { id: "transport", label: "Transport", status: "Transport arrangement confirmed", done: true, owner: "Transport coordinator", record: `${TRANSPORT}: low-loader arrangement reviewed against ${EX014}'s recorded transport dimensions and weight. Loading at the yard agreed for ${RENTAL_START}.` }
      : { id: "transport", label: "Transport", status: "Suitable transport arrangement to confirm", done: false, confirmStep: 1, owner: "Transport coordinator", record: `${TRANSPORT} requested.`, missing: "Vehicle and trailer for this machine's recorded transport dimensions and weight, the loading arrangement, and any permits that apply." },
    site
      ? { id: "site", label: "Site", status: "Receiving window and access confirmed", done: true, owner: "Customer site contact, recorded by the rental desk", record: `Receiving ${RENTAL_START}, 07:00 to 09:00, at the quarry gate. Escort and site induction required for the driver.` }
      : { id: "site", label: "Site", status: "Receiving window and access requirements to confirm", done: false, confirmStep: 2, owner: "Customer site contact", record: "Delivery to the quarry requested.", missing: "Receiving window, the unloading area, and the quarry's access and induction requirements." },
  ];
}

function DeliveryFallback({ transport, site }: { transport: boolean; site: boolean }) {
  return (
    <Drawing viewBox="-26 -6.8 61 8">
      <Elevation tool="bucket" x={-23} />
      <Breaker x={-13.6} y={0} />
      <LowLoaderElevation x={0} y={0} ghost={!transport} />
      <Elevation tool="bucket" pose={TRANSPORT_POSE} x={1.5} y={0.95} flip ghost />
      <Breaker x={-8.4} y={0.95} ghost />
      <g>
        <polygon points="26,0 34,0 34,5 31,5 31,2.6 26,2.6" fill="#cfcabf" stroke="#262829" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        <rect x={17} y={0} width={8.4} height={0.08} fill={site ? "#007dfe" : "#fed603"} />
      </g>
      <DrawingLabel x={-18} y={5.4} size={1.8} tone="ink">Main rental yard</DrawingLabel>
      <DrawingLabel x={1.5} y={5.4} size={1.8} tone={transport ? "ok" : "flag"}>{transport ? "TR-208 · Confirmed" : "TR-208 · To confirm"}</DrawingLabel>
      <DrawingLabel x={25} y={5.4} size={1.8} tone={site ? "ok" : "flag"}>{site ? "Quarry · Confirmed" : "Quarry · To confirm"}</DrawingLabel>
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
  const handoff = [
    { label: "Rental yard", status: "Machine and attachment ready", done: true },
    { label: "Transport", status: transport ? "Arrangement confirmed" : "Arrangement to confirm", done: transport },
    { label: "Quarry", status: site ? "Window and access confirmed" : "Window and access to confirm", done: site },
  ];
  return (
    <Example
      title={`${EX014} delivery to the quarry`}
      chips={<><MachineChip id={EX014} state={reviewed ? "Reserved, delivery reviewed" : "Reserved, delivery pending"} tone={reviewed ? "ok" : "flag"} /><MachineChip id={BREAKER} state="Allocated" tone="ok" /></>}
      situation={<p>The quote is accepted and {EX014} is reserved for {RENTAL_PERIOD}. The handoff to the quarry still has to work.</p>}
      output={reviewed ? <p><strong>A reviewed delivery plan.</strong> Machine, attachment, transport, and site checks all recorded.</p> : <p><strong>The machine is available. Delivery is not yet confirmed.</strong> {[!transport && "Transport", !site && "site access"].filter(Boolean).join(" and ")} still open.</p>}
      next={<p>Dispatcher confirms the handoff.</p>}
    >
      <Sequence steps={DELIVERY_STEPS} sequence={sequence} title="Prepare the delivery" />
      <ol className={styles.handoff} aria-label="Proposed handoff">
        {handoff.map((item) => (
          <li key={item.label} data-done={item.done}><strong>{item.label}</strong><span>{item.status}</span></li>
        ))}
      </ol>
      <div className={styles.stage} data-wide="true">
        <MachineView
          className={styles.wideView}
          scene={{ kind: "delivery", focus, transport, site, onPick: setFocus }}
          fallback={<DeliveryFallback transport={transport} site={site} />}
          label={`Illustrative handoff from the rental yard to the quarry. ${EX014} waits in the yard with ${BREAKER}. The planned low-loader load is ${transport ? "confirmed" : "still to confirm"}, and the quarry receiving area is ${site ? "confirmed" : "still to confirm"}.`}
        >
          <p className={styles.legend} aria-hidden="true"><span data-key="solid" />Recorded<span data-key="outline" />Planned or to confirm</p>
        </MachineView>
        <div className={`${styles.panel} ${styles.checkPanel}`}>
          <p className={styles.sheetLabel}>Four checks before committing</p>
          <div className={styles.checks} role="group" aria-label="Delivery checks">
            {checks.map((check) => (
              <button key={check.id} type="button" aria-pressed={focus === check.id} data-done={check.done} onClick={() => setFocus(check.id)}>
                <span className={styles.checkLabel}>{check.label}</span>
                <span className={styles.checkStatus}>{check.status}</span>
                <Status tone={check.done ? "ok" : "flag"}>{check.done ? "Reviewed" : "Pending"}</Status>
              </button>
            ))}
          </div>
          <div className={styles.evidence} aria-live="polite">
            {selected ? (
              <>
                <p className={styles.sheetLabel}>{selected.label}</p>
                <p className={styles.evidenceTitle}>{selected.record}</p>
                {selected.missing && <p className={styles.missing}><strong>Missing:</strong> {selected.missing}</p>}
                <p className={styles.evidenceNote}><strong>{selected.done ? "Confirmed by" : "Needs confirmation from"}:</strong> {selected.owner}</p>
                {selected.confirmStep !== undefined && (
                  <button type="button" className={styles.action} onClick={() => sequence.go(selected.confirmStep ?? 0)}>Record the confirmation (example) <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" /></button>
                )}
              </>
            ) : (
              <p className={styles.evidenceNote}>Select a check to see what is recorded, what is missing, and who confirms it.</p>
            )}
          </div>
        </div>
      </div>
      <p className={styles.boundary}>A standard road route does not establish heavy-haul access. Transport suitability, site restrictions, permits where applicable, and loading arrangements need the relevant operational review.</p>
    </Example>
  );
}

/* 3. Manage the rental */

const RENTAL_STEPS: Step[] = [
  { label: "On rent", text: `${EX014} working at the quarry under ${RENTAL}.` },
  { label: "Extension request", text: "The customer asks for three more days." },
  { label: "Check alternatives", text: "Machine, attachment, transport, and service." },
  { label: "Terms and usage", text: "Agreed terms and recorded hours side by side." },
];
const DAYS = Array.from({ length: 20 }, (_, index) => 12 + index);
const RENTAL_END_DAY = 23;
const NEXT_START_DAY = 25;

type AlternativeCheck = { id: string; question: string; answer: string; status: string; tone: Tone; focus: RentalFocus };

const RENTAL_CHECKS: AlternativeCheck[] = [
  { id: "machine", question: "Another suitable machine available?", answer: `${EX027} is free in the calendar for ${NEXT_RESERVATION}, but it is still awaiting inspection. Its inspection is booked for ${EX027_INSPECTION_BOOKED} and has not been recorded.`, status: "Not ready to commit", tone: "flag", focus: "ex027" },
  { id: "attachment", question: "Attachment available?", answer: `${BREAKER} has no booking after ${RENTAL_END}, so it could stay with ${EX014}. ${NEXT_RESERVATION}'s own attachment needs are checked against its booking.`, status: "Available", tone: "ok", focus: "ex014" },
  { id: "transport", question: "Transport change required?", answer: `Pickup ${PICKUP} is booked for 24 Oct. An extension moves it, and ${NEXT_RESERVATION} would need a delivery from the yard with a different machine.`, status: "Change required", tone: "flag", focus: "both" },
  { id: "service", question: "Service requirement affected?", answer: `${EX014}'s next scheduled service is recorded against operating hours. The maintenance supervisor confirms whether the extra days reach it.`, status: "To confirm", tone: "flag", focus: "ex014" },
];

function RentalFallback({ focus, conflict }: { focus: RentalFocus; conflict: boolean }) {
  return (
    <Drawing viewBox="-3 -6.4 26 7.4">
      <polygon points="-2.8,0 9.6,0 9.6,2.2 4.5,2.2 4.5,3.8 -2.8,3.8" fill="#e3dfd5" stroke="#b9baba" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      <line x1={11.4} y1={0} x2={11.4} y2={5.8} stroke="#b9baba" strokeWidth={1} strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
      <Elevation tool="breaker" pose={POSES.parked} />
      <Elevation tool="bucket" x={16} highlight={focus === "ex027" ? { house: "yellow" } : {}} />
      <DrawingLabel x={1.5} y={5.6} tone="ok">EX-014 · On rent</DrawingLabel>
      {conflict && <DrawingLabel x={8} y={4.4} tone="alert">R-1057 begins 25 Oct</DrawingLabel>}
      <DrawingLabel x={17.5} y={5.6} tone="flag">EX-027 · Awaiting inspection</DrawingLabel>
    </Drawing>
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
  const output = conflict
    ? <p><strong>Extension requires a reviewed alternative plan.</strong> The next customer&rsquo;s reservation begins during the requested days.</p>
    : tight
      ? <p><strong>The extension uses the turnaround day before {NEXT_RESERVATION}.</strong> Return, inspection, and delivery would need review.</p>
      : <p><strong>No change requested yet.</strong> Extend the rental to see what it affects.</p>;
  return (
    <Example
      title={`${EX014} on rent, extension request`}
      chips={<><MachineChip id={EX014} state="On rent" tone="ok" /><MachineChip id={EX027} state={EX027_STATE} tone="flag" /></>}
      situation={<p>{EX014} is on rent at the quarry until {RENTAL_END} with {BREAKER}. The customer asks: “Can we keep the machine for three more days?”</p>}
      output={output}
      next={<p>Rental team confirms the arrangement before approving the extension.</p>}
    >
      <Sequence steps={RENTAL_STEPS} sequence={sequence} title="Manage the rental" />
      <div className={styles.stage}>
        <MachineView
          scene={{ kind: "rental", focus, conflict, onPick: (next) => setSelected(next === "ex027" ? "machine" : null) }}
          fallback={<RentalFallback focus={focus} conflict={conflict} />}
          label={`Illustrative view: ${EX014} on rent at the quarry with ${BREAKER}, and ${EX027} in the yard, awaiting inspection.${conflict ? ` The extension overlaps ${NEXT_RESERVATION}.` : ""}`}
        />
        <div className={styles.panel}>
          <p className={styles.sheetLabel}>Customer request</p>
          <blockquote className={styles.quote}>“Can we keep the machine for three more days?”</blockquote>
          <div className={styles.extend}>
            <label htmlFor="extension-days">Requested extension <strong>{extension === 0 ? "None" : `${extension} day${extension > 1 ? "s" : ""}, 24–${lastDay} Oct`}</strong></label>
            <input id="extension-days" type="range" min={0} max={3} step={1} value={extension} onChange={(event) => extend(Number(event.target.value))} />
            <div className={styles.extendButtons}>
              {[0, 1, 2, 3].map((days) => <button key={days} type="button" aria-pressed={extension === days} onClick={() => extend(days)}>{days === 0 ? "None" : `+${days}`}</button>)}
            </div>
          </div>
          <div className={styles.timeline} aria-label={`Calendar from 12 to 31 Oct. ${RENTAL} runs ${RENTAL_PERIOD}. ${NEXT_RESERVATION} for ${EX014} begins ${NEXT_RESERVATION_START}.`}>
            <div className={styles.days} aria-hidden="true">{DAYS.map((day) => <span key={day} data-mark={day === 12 || day === 24 || day === 31}>{day}</span>)}</div>
            <div className={styles.lane}>
              <span className={styles.laneLabel}>{EX014}</span>
              <span className={styles.track}>
                <span className={styles.bar} data-tone="rent" style={{ gridColumn: "1 / span 12" }}>{RENTAL}</span>
                {extension > 0 && <span className={styles.bar} data-tone="extend" style={{ gridColumn: `13 / span ${extension}`, gridRow: 2 }}>+{extension}</span>}
                <span className={styles.bar} data-tone="turn" style={{ gridColumn: "13 / span 1" }} title="Return, inspection, and delivery window" />
                <span className={styles.bar} data-tone={conflict ? "conflict" : "next"} style={{ gridColumn: "14 / span 7" }}>{NEXT_RESERVATION}</span>
              </span>
            </div>
            <div className={styles.lane}>
              <span className={styles.laneLabel}>{BREAKER}</span>
              <span className={styles.track}>
                <span className={styles.bar} data-tone="rent" style={{ gridColumn: "1 / span 12" }}>With {EX014}</span>
                {extension > 0 && <span className={styles.bar} data-tone="extend" style={{ gridColumn: `13 / span ${extension}`, gridRow: 2 }} />}
              </span>
            </div>
            <div className={styles.lane}>
              <span className={styles.laneLabel}>{EX027}</span>
              <span className={styles.track}>
                <span className={styles.bar} data-tone="hold" style={{ gridColumn: "1 / span 12" }}>{EX027_STATE}</span>
                <span className={styles.bar} data-tone="turn" style={{ gridColumn: "13 / span 1" }} title={`Inspection booked ${EX027_INSPECTION_BOOKED}`} />
                <span className={styles.bar} data-tone="free" style={{ gridColumn: "14 / span 7" }}>Free, not released</span>
              </span>
            </div>
            <p className={styles.timelineKey}><span data-tone="turn" />Turnaround or inspection day</p>
          </div>
          {conflict && <p className={styles.conflictLine}>Next customer reservation begins during the requested extension.</p>}
        </div>
      </div>
      <div className={styles.rentalChecks}>
        <div className={styles.questionList} role="group" aria-label="Checks before approving">
          {RENTAL_CHECKS.map((item) => (
            <button key={item.id} type="button" className={styles.question} aria-pressed={selected === item.id} disabled={!conflict && !tight} onClick={() => setSelected(selected === item.id ? null : item.id)}>
              <span className={styles.questionText}>{item.question}</span>
              <Status tone={item.tone}>{item.status}</Status>
            </button>
          ))}
        </div>
        <div className={styles.evidence} aria-live="polite">
          {check ? (
            <>
              <p className={styles.sheetLabel}>{check.question}</p>
              <p className={styles.evidenceTitle}>{check.answer}</p>
              {check.id === "machine" && (
                <ul className={styles.facts}>
                  <li><SourceTag source="fleet" /><span>Availability: free {NEXT_RESERVATION_START} onward</span><Status tone="ok">Free</Status></li>
                  <li><SourceTag source="fleet" /><span>Readiness: {EX027_STATE.toLowerCase()}, inspection booked {EX027_INSPECTION_BOOKED}</span><Status tone="flag">Not ready to commit</Status></li>
                  <li><SourceTag source="fleet" /><span>Attachment: {NEXT_RESERVATION}&rsquo;s requirement to check against {EX027}&rsquo;s records</span><Status tone="flag">Open</Status></li>
                </ul>
              )}
            </>
          ) : (
            <p className={styles.evidenceNote}>{conflict || tight ? "Select a check to see the record behind it." : "Extend the rental to review what it affects."}</p>
          )}
        </div>
      </div>
      <div className={styles.terms} data-active={sequence.step === 3}>
        <div><p className={styles.sheetLabel}>Agreed rental terms</p><p>Rental agreement for {RENTAL}, on file. Any extension follows those terms.</p></div>
        <div><p className={styles.sheetLabel}>Recorded operating hours</p><p className={styles.reading}>{METER_ON_RENT}</p><p className={styles.evidenceNote}>Example recorded reading. Last updated {METER_ON_RENT_UPDATED}, from a meter photo at a site visit. Not live telemetry.</p></div>
        <div><p className={styles.sheetLabel}>Proposed additional period</p><p>{extension === 0 ? "None requested" : `24–${lastDay} Oct, ${extension} day${extension > 1 ? "s" : ""}`}</p></div>
        <div><p className={styles.sheetLabel}>Charges requiring review</p><p>Worked out under the agreed terms after review. No price is shown or applied here.</p></div>
      </div>
      <p className={styles.boundary}>Engine hours, productive hours, and billable hours are not automatically the same. Billing follows the agreement and verified records. Nothing in this example changes a reservation, messages a customer, or applies a charge.</p>
    </Example>
  );
}

/* 4. Return it to service */

const RETURN_STEPS: Step[] = [
  { label: RETURN_STAGES[0], text: `${EX014} back at the yard with ${BREAKER}.` },
  { label: RETURN_STAGES[1], text: "Return evidence compared with the handoff." },
  { label: RETURN_STAGES[2], text: "The inspector records required maintenance." },
  { label: RETURN_STAGES[3], text: "Maintenance recorded, release approved." },
  { label: RETURN_STAGES[4], text: "The release updates availability." },
];

const RETURN_ACTIONS = [
  "Start the inspection (example)",
  "Record the inspection finding (example)",
  "Release after recorded maintenance (example)",
  "Update availability from the release (example)",
];

type AreaEvidence = { label: string; before: string; after: string; status: string; tone: Tone; note: string };

const AREAS: Record<Exclude<ReturnArea, "overall">, AreaEvidence> = {
  sidePanel: { label: "Side panel", before: "Right side panel. No marks recorded.", after: "Possible new mark on side panel.", status: "Needs inspection", tone: "flag", note: "Not a damage finding. The inspector checks it, and any charge is reviewed separately under the agreed terms." },
  attachment: { label: "Attachment", before: `${BREAKER} fitted at handoff.`, after: `${BREAKER} returned with the machine.`, status: "Returned", tone: "ok", note: "The attachment has its own inspection entry." },
  undercarriage: { label: "Undercarriage", before: "Tracks photographed at handoff.", after: "Tracks photographed at return. No visible difference noted.", status: "Compared", tone: "quiet", note: "Photos show the surface only. They do not reveal internal or mechanical condition." },
  meter: { label: "Hour meter", before: `${METER_AT_HANDOFF} at handoff, ${RENTAL_START}.`, after: `${METER_AT_RETURN} at return.`, status: "Recorded", tone: "quiet", note: "Recorded operating hours. Billable hours follow the rental agreement." },
};
const AREA_ORDER = Object.keys(AREAS) as (keyof typeof AREAS)[];

function ReturnFallback({ area, stage }: { area: ReturnArea; stage: number }) {
  const highlight = (after: boolean): Partial<Record<ElevationArea, ElevationTone>> => {
    if (area === "sidePanel") return { sidePanel: after ? "yellow" : "blue" };
    if (area === "attachment") return { tool: "blue", coupler: "blue" };
    if (area === "undercarriage") return { tracks: "blue" };
    if (area === "meter") return { cab: "blue" };
    return after && stage === 1 ? { sidePanel: "yellow" } : {};
  };
  return (
    <Drawing viewBox="-2.6 -5.6 22 6.4">
      <Elevation tool="breaker" pose={POSES.parked} highlight={highlight(false)} />
      <line x1={8.2} y1={-0.4} x2={8.2} y2={5.6} stroke="#b9baba" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      <Elevation tool="breaker" pose={POSES.parked} x={10.6} highlight={highlight(true)} mark />
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
  const outcome = stage === 0 ? "Pending" : stage === 1 ? "Inspection under way" : stage === 2 ? "Maintenance required before release" : "Maintenance recorded, released by authorized reviewer";
  const stageTone: Tone = stage === 4 ? "ok" : stage === 2 ? "alert" : stage === 3 ? "done" : "flag";
  return (
    <Example
      title={`${EX014} return and inspection`}
      chips={<MachineChip id={EX014} state={RETURN_STAGES[stage]} tone={stageTone} />}
      situation={<p>{EX014} comes back to the yard with {BREAKER}. Its next reservation, {NEXT_RESERVATION}, depends on what the return shows.</p>}
      output={<p><strong>A documented return and reviewed readiness status.</strong> {ready ? `${EX014} is ready for rental.` : "Availability stays blocked until release."}</p>}
      next={<p>{ready ? "The rental desk can offer the machine again." : "Inspector and maintenance supervisor work through the open items."}</p>}
    >
      <div className={styles.sequence}>
        <ol className={styles.steps} data-count="5" aria-label="Return stages">
          {RETURN_STEPS.map((item, index) => (
            <li key={item.label}>
              <button type="button" aria-current={stage === index ? "step" : undefined} data-done={index < stage} disabled={index > stage} onClick={() => setStage(index)}>
                <span className={styles.stepIndex}>{String(index + 1).padStart(2, "0")}</span>
                <span className={styles.stepLabel}>{item.label}</span>
                <span className={styles.stepText}>{item.text}</span>
              </button>
            </li>
          ))}
        </ol>
        <div className={styles.controls}>
          {stage < 4 && <button type="button" className={styles.action} onClick={advance}>{RETURN_ACTIONS[stage]} <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" /></button>}
          <button type="button" aria-label="Reset example" onClick={reset}><RotateCcw size={14} strokeWidth={1.5} /></button>
          <span aria-live="polite">Stage {stage + 1} of 5. Each stage needs an explicit step.</span>
        </div>
      </div>
      <div ref={ref} className={styles.stage} data-wide="true">
        <MachineView
          className={stacked ? styles.splitStacked : styles.split}
          scene={{ kind: "return", area, stage, stacked }}
          fallback={<ReturnFallback area={area} stage={stage} />}
          label={`Matched views of ${EX014} before rental and on return${area !== "overall" && evidence ? `, focused on the ${evidence.label.toLowerCase()}` : ""}. A possible new mark appears on the side panel in the return view.`}
        >
          <div className={styles.splitLabels} data-stacked={stacked} aria-hidden="true">
            <span>Before rental <em>Handoff photos, {RENTAL_START}</em></span>
            <span>On return <em>Yard check-in</em></span>
          </div>
        </MachineView>
      </div>
      <div className={styles.returnGrid}>
        <div>
          <p className={styles.sheetLabel}>Select an inspection area</p>
          <div className={styles.requirements} role="group" aria-label="Inspection areas">
            <button type="button" aria-pressed={area === "overall"} onClick={() => setArea("overall")}>Whole machine</button>
            {AREA_ORDER.map((key) => <button key={key} type="button" aria-pressed={area === key} onClick={() => setArea(key)}>{AREAS[key].label}</button>)}
          </div>
          <div className={styles.compare} aria-live="polite">
            {evidence ? (
              <>
                <div><span className={styles.sheetLabel}>Before rental</span><p>{evidence.before}</p></div>
                <div data-after="true"><span className={styles.sheetLabel}>On return</span><p>{evidence.after}</p><Status tone={evidence.tone}>{evidence.status}</Status></div>
                <p className={styles.evidenceNote}>{evidence.note}</p>
              </>
            ) : (
              <p className={styles.evidenceNote}>Select an area to open matching before and after evidence. Views are schematic, not photographs from a real site.</p>
            )}
          </div>
        </div>
        <div>
          <p className={styles.sheetLabel}>Return record</p>
          <ul className={styles.returnRecord}>
            <li><span>Condition photos</span><span>Handoff and return sets, matched by area</span></li>
            <li><span>Meter reading</span><span>{METER_AT_RETURN} at return ({METER_AT_HANDOFF} at handoff)</span></li>
            <li><span>Attachment returned</span><span>{BREAKER}, returned with the machine</span></li>
            <li><span>Reported issues</span><span>None reported by the customer at pickup</span></li>
            <li><span>Inspection outcome</span><span data-tone={stage === 2 ? "alert" : undefined}>{outcome}</span></li>
          </ul>
          {stage >= 2 && (
            <div className={styles.hold} data-cleared={stage >= 3}>
              <button type="button" aria-expanded={showHold} onClick={() => setShowHold(!showHold)}>
                <span><strong>Maintenance hold</strong> {stage === 2 ? "Maintenance required before release." : "Cleared by recorded maintenance."}</span>
                <span className={styles.findingAction}>{showHold ? "Hide reason" : "Show reason"} <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" /></span>
              </button>
              {showHold && (
                <div className={styles.holdDetail}>
                  <p><strong>Recorded reason:</strong> scheduled service due. Recorded operating hours reached the service interval during this rental. Entered by the inspector.</p>
                  <p><strong>Required follow-up:</strong> complete {WORK_ORDER}, record the side panel outcome, then an authorized reviewer decides on release.</p>
                </div>
              )}
            </div>
          )}
          <p className={styles.availability} data-ready={ready}>
            <span className={styles.sheetLabel}>Availability</span>
            {ready ? "Ready for rental. Released by an authorized reviewer." : stage === 3 ? "Release recorded. Availability updates when the release is applied." : "Not available. Blocked until an authorized release."}
          </p>
        </div>
      </div>
      <p className={styles.boundary}>Photos can support an inspection but cannot establish every defect or mechanical condition. This is not safety certification or predictive maintenance. Customer liability and additional charges need separate review under the agreed terms.</p>
    </Example>
  );
}
