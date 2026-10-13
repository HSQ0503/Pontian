"use client";

import dynamic from "next/dynamic";
import { useEffect, useEffectEvent, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from "lucide-react";
import styles from "./equipment-rental.module.css";
import { InteractionCue } from "./interaction-cue";
import type { DeliveryFocus, MachineId, MatchFocus, RentalFocus, ReturnArea, SceneProps } from "./equipment-rental-scene";
import { Breaker, Elevation, LowLoaderElevation, TRANSPORT_POSE, type ElevationArea, type ElevationTone } from "./equipment-rental-elevation";
import { POSES } from "./equipment-rental-geometry";
import {
  BREAKER, BREAKER_TYPE, EX014, EX027, EX027_INSPECTION_BOOKED, METER_AT_HANDOFF, METER_AT_RETURN, METER_ON_RENT, METER_ON_RENT_UPDATED,
  NEXT_RESERVATION, NEXT_RESERVATION_START, PICKUP, RENTAL, RENTAL_END, RENTAL_PERIOD, RENTAL_START, RETURN_STAGES, SOURCES, TRANSPORT, WORK_ORDER, type Source,
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

function MachineView({ scene, fallback, label, className = "", onModel, children }: { scene: SceneInput; fallback: ReactNode; label: string; className?: string; onModel?: (live: boolean) => void; children?: ReactNode }) {
  const reduced = useReducedMotion();
  const webgl = useSyncExternalStore(noSubscription, hasWebGL, () => false);
  const { ref, near, visible } = useViewportPresence<HTMLDivElement>();
  const [ready, setReady] = useState(false);
  const live = near && webgl && !reduced;
  const showing = live && ready;
  useEffect(() => { onModel?.(showing); }, [showing, onModel]);
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

type ExampleProps = { title: string; children: ReactNode; situation: ReactNode; finding: ReactNode; next: ReactNode; boundary: string };

function Example({ title, children, situation, finding, next, boundary }: ExampleProps) {
  return (
    <figure className={styles.example}>
      <figcaption className={styles.exampleBar}>
        <span className={styles.exampleTag}>Example workflow</span>
        <span className={styles.exampleTitle}>{title}</span>
      </figcaption>
      <div className={styles.exampleBody}>{children}</div>
      <ol className={styles.outcome}>
        <li data-role="situation"><span className={styles.outcomeLabel}>Situation</span>{situation}</li>
        <li data-role="finding"><span className={styles.outcomeLabel}>Finding for review</span>{finding}</li>
        <li data-role="next"><span className={styles.outcomeLabel}>Next step for your team</span>{next}</li>
      </ol>
      <p className={styles.exampleFoot}>{boundary}</p>
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
  { label: "Request", text: "An email lands at the rental desk." },
  { label: "Shortlist", text: "Both machines are free. Only one has been inspected." },
  { label: "Attachment", text: "The customer names a breaker. The records say it fits EX-014." },
];

const MATCH_STEP_FOCUS: { focus: MatchFocus; machine: MachineId }[] = [
  { focus: "availability", machine: EX014 },
  { focus: "availability", machine: EX027 },
  { focus: "attachment", machine: EX014 },
];

function MatchFallback({ step }: { step: number }) {
  const attachment = step === 2;
  return (
    <Drawing viewBox="-3 -7 25 8">
      <Elevation tool="bucket" highlight={attachment ? { coupler: "yellow" } : {}} />
      <Breaker x={7.4} y={0} tone={attachment ? "yellow" : undefined} />
      <Elevation tool="bucket" x={13.5} highlight={step === 1 ? { house: "yellow" } : {}} />
      <DrawingLabel x={0.55} y={3.05} title={EX014} detail="Inspected 6 Oct" state="ok" />
      {attachment && <DrawingLabel x={8.4} y={0.85} title={BREAKER} detail="Documented fit" state="ok" lift={0.7} />}
      <DrawingLabel x={14.05} y={3.05} title={EX027} detail="Not inspected" state="blocked" />
    </Drawing>
  );
}

export function MatchMachine() {
  const [model, setModel] = useState(false);
  const [focus, setFocus] = useState<MatchFocus>("availability");
  const [machine, setMachine] = useState<MachineId>(EX014);
  const sequence = useSequence(MATCH_STEPS.length, (step) => {
    setFocus(MATCH_STEP_FOCUS[step].focus);
    setMachine(MATCH_STEP_FOCUS[step].machine);
  });
  const documented = sequence.step === 2;
  const pick = (id: MachineId, next?: MatchFocus) => {
    setMachine(id);
    if (next) setFocus(next);
  };
  return (
    <Example
      title="Quarry request"
      situation={<p>A customer wants an excavator, an attachment and delivery to a quarry.</p>}
      finding={<p><strong>{EX014} with {BREAKER}</strong>, to confirm.</p>}
      next={<p>Your specialist checks it and quotes.</p>}
      boundary="A match isn’t a sign-off. Your specialist decides what suits the job."
    >
      <Sequence steps={MATCH_STEPS} sequence={sequence} title="Match the machine" />
      <div className={styles.stage}>
        <div>
          <InteractionCue line="You can use this." steps={["Step through it", "Play the example", ...(model ? ["Click a machine"] : [])]} />
          <MachineView
          onModel={setModel}
          scene={{ kind: "match", focus, machine, documented, onPick: pick }}
          fallback={<MatchFallback step={sequence.step} />}
          label={`Yard view: ${EX014}, inspected; ${EX027}, not inspected; and ${BREAKER}, a ${BREAKER_TYPE.toLowerCase()}.`}
        />
        </div>
        <div className={styles.panel} aria-live="polite">
          {sequence.step === 0 && (
            <>
              <blockquote className={styles.quote}>“We need an excavator for quarry work next week, with the required attachment and delivery to site.”</blockquote>
              <p className={styles.sheetLabel}>Still unanswered</p>
              <ul className={styles.openList}>
                <li><StateText state="pending">Which attachment?</StateText></li>
                <li><StateText state="pending">What’s the ground like?</StateText></li>
                <li><StateText state="pending">When can the quarry take delivery?</StateText></li>
              </ul>
            </>
          )}
          {sequence.step === 1 && (
            <div className={styles.candidates}>
              <div data-state="ok">
                <strong>{EX014}</strong>
                <StateText state="ok">Free {RENTAL_PERIOD}</StateText>
                <StateText state="ok">Inspected 6 Oct</StateText>
                <span className={styles.verdict}>Can go</span>
              </div>
              <div data-state="blocked">
                <strong>{EX027}</strong>
                <StateText state="ok">Free {RENTAL_PERIOD}</StateText>
                <StateText state="blocked">Not inspected</StateText>
                <span className={styles.verdict}>Can’t promise it</span>
              </div>
            </div>
          )}
          {sequence.step === 2 && (
            <>
              <p className={styles.lead}>The customer wants a {BREAKER_TYPE.toLowerCase()} for oversize rock.</p>
              <ul className={styles.facts}>
                <li><SourceTag source="fleet" /><span>{BREAKER} is in the yard and unbooked.</span></li>
                <li><SourceTag source="manufacturer" /><span>Its mount is documented for {EX014}’s coupler.</span></li>
                <li><SourceTag source="fleet" /><span>{EX014} has the extra hydraulic lines fitted.</span></li>
              </ul>
            </>
          )}
        </div>
      </div>
    </Example>
  );
}

/* 2. Prepare the delivery */

const DELIVERY_STEPS: Step[] = [
  { label: "Plan", text: "The machine’s ready. The truck and the gate aren’t." },
  { label: "Truck", text: "Your transport coordinator books a low-loader that fits." },
  { label: "Gate", text: "The quarry confirms a time and an escort." },
];
const DELIVERY_STEP_FOCUS: DeliveryFocus[] = ["overview", "transport", "site"];

type DeliveryCheck = { id: Exclude<DeliveryFocus, "overview">; label: string; status: string; done: boolean; detail: string };

function deliveryChecks(transport: boolean, site: boolean): DeliveryCheck[] {
  return [
    { id: "machine", label: "Machine", status: "Ready", done: true, detail: `${EX014} was released 6 Oct. The yard lead has prepped it.` },
    { id: "attachment", label: "Attachment", status: "Allocated", done: true, detail: `${BREAKER} rides on the same load and gets fitted on site.` },
    { id: "transport", label: "Truck", status: transport ? `${TRANSPORT} booked` : "Not booked", done: transport, detail: transport ? `A low-loader checked against ${EX014}’s transport dimensions and weight. Loads at the yard on ${RENTAL_START}.` : "Needs a truck and trailer that fit this machine, plus any permits. Your transport coordinator signs it off." },
    { id: "site", label: "Quarry gate", status: site ? `${RENTAL_START}, 07:00–09:00` : "No time yet", done: site, detail: site ? "The driver needs an escort and a site induction at the gate." : "The quarry contact has to give a delivery window and say where to unload." },
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
      <DrawingLabel x={-19} y={3.1} size={1.7} title="Yard" detail="Ready" state="ok" />
      <DrawingLabel x={1.5} y={3.7} size={1.7} title={TRANSPORT} detail={transport ? "Booked" : "Not booked"} state={transport ? "ok" : "pending"} />
      <DrawingLabel x={21.2} y={0.1} size={1.7} lift={1.6} title="Quarry gate" detail={site ? "07:00–09:00" : "No time yet"} state={site ? "ok" : "pending"} />
    </Drawing>
  );
}

export function PrepareDelivery() {
  const [model, setModel] = useState(false);
  const [focus, setFocus] = useState<DeliveryFocus>("overview");
  const sequence = useSequence(DELIVERY_STEPS.length, (step) => setFocus(DELIVERY_STEP_FOCUS[step]));
  const transport = sequence.step >= 1;
  const site = sequence.step >= 2;
  const checks = deliveryChecks(transport, site);
  const selected = checks.find((check) => check.id === focus);
  return (
    <Example
      title={`${EX014} to the quarry`}
      situation={<p>The quote’s accepted and {EX014} is reserved for {RENTAL_PERIOD}.</p>}
      finding={site ? <p><strong>All four checks are in.</strong></p> : <p><strong>The machine’s ready. The delivery isn’t.</strong></p>}
      next={<p>Your dispatcher confirms the handoff.</p>}
      boundary="A road route isn’t heavy-haul clearance. Permits and loading need your own check."
    >
      <Sequence steps={DELIVERY_STEPS} sequence={sequence} title="Prepare the delivery" />
      <InteractionCue line="You can use this." steps={["Step through it", "Click a check", ...(model ? ["Click the machine, truck, or gate"] : [])]} />
      <MachineView
        className={styles.wideView}
        onModel={setModel}
        scene={{ kind: "delivery", focus, transport, site, onPick: setFocus }}
        fallback={<DeliveryFallback transport={transport} site={site} />}
        label={`${EX014} waits in the yard with ${BREAKER}. The truck is ${transport ? "booked" : "not booked"} and the quarry gate ${site ? "has a delivery time" : "has no delivery time yet"}.`}
      >
        <p className={styles.legend} aria-hidden="true"><span className={styles.legendKey}><i data-key="solid" />Confirmed<i data-key="ghost" />Not confirmed</span></p>
      </MachineView>
      <div className={styles.checks} role="group" aria-label="Delivery checks">
        {checks.map((check) => (
          <button key={check.id} type="button" aria-pressed={focus === check.id} onClick={() => setFocus(focus === check.id ? "overview" : check.id)}>
            <span className={styles.checkLabel}>{check.label}</span>
            <StateText state={check.done ? "ok" : "pending"}>{check.status}</StateText>
          </button>
        ))}
      </div>
      {selected && <p className={styles.detail} aria-live="polite">{selected.detail}</p>}
    </Example>
  );
}

/* 3. Manage the rental */

const RENTAL_STEPS: Step[] = [
  { label: "On rent", text: `${EX014} is breaking rock at the quarry until ${RENTAL_END}.` },
  { label: "Three more days?", text: "The customer asks to keep it longer." },
  { label: "Options", text: "What would have to change to say yes." },
];
const FIRST_DAY = 12;
const LAST_DAY = 31;
const RENTAL_END_DAY = 23;
const NEXT_START_DAY = 25;
const DAY_COUNT = LAST_DAY - FIRST_DAY + 1;
const column = (day: number) => day - FIRST_DAY + 1;

type Option = { id: string; question: string; answer: string; state: State; focus: RentalFocus };

const RENTAL_OPTIONS: Option[] = [
  { id: "machine", question: `Send ${EX027} to ${NEXT_RESERVATION}?`, answer: `Not yet. It hasn’t been inspected. That’s booked for ${EX027_INSPECTION_BOOKED}.`, state: "blocked", focus: "ex027" },
  { id: "attachment", question: `Keep ${BREAKER} on site?`, answer: `Yes. It’s free after ${RENTAL_END}.`, state: "ok", focus: "ex014" },
  { id: "transport", question: "Move the pickup?", answer: `${PICKUP} on 24 Oct would have to move.`, state: "pending", focus: "both" },
  { id: "service", question: "Service due?", answer: "Close, on recorded hours. The shop confirms.", state: "pending", focus: "ex014" },
];

function RentalFallback({ conflict, focus }: { conflict: boolean; focus: RentalFocus }) {
  return (
    <Drawing viewBox="-3 -7 26 8">
      <polygon points="-2.8,0 9.6,0 9.6,2.2 4.5,2.2 4.5,3.8 -2.8,3.8" fill="#e6e2d9" stroke="#c9c5bb" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      <line x1={11.4} y1={0} x2={11.4} y2={5.8} stroke="#c9cac6" strokeWidth={1} strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
      <Elevation tool="breaker" pose={POSES.parked} />
      <Elevation tool="bucket" x={16} highlight={focus === "ex027" ? { house: "yellow" } : {}} />
      <DrawingLabel x={0.55} y={3.05} title={`${EX014} · On rent`} detail={conflict ? `${NEXT_RESERVATION} wants it on 25 Oct` : "At the quarry"} state={conflict ? "blocked" : "ok"} />
      <DrawingLabel x={16.55} y={3.05} title={EX027} detail="Not inspected" state="blocked" />
    </Drawing>
  );
}

function RentalTimeline({ extension, conflict }: { extension: number; conflict: boolean }) {
  return (
    <div className={styles.timeline} role="img" aria-label={`${EX014}’s calendar: ${RENTAL} runs ${RENTAL_PERIOD}${extension ? `, plus ${extension} requested days` : ""}. ${NEXT_RESERVATION} starts ${NEXT_RESERVATION_START}.`}>
      <div className={styles.timelineTrack} style={{ gridTemplateColumns: `repeat(${DAY_COUNT}, minmax(0, 1fr))` }}>
        <span className={styles.span} data-kind="rent" style={{ gridColumn: `${column(FIRST_DAY)} / ${column(RENTAL_END_DAY) + 1}` }}>This customer</span>
        <span className={styles.span} data-kind="turn" style={{ gridColumn: `${column(24)} / span 1` }} />
        <span className={styles.span} data-kind={conflict ? "blocked" : "next"} style={{ gridColumn: `${column(NEXT_START_DAY)} / ${column(LAST_DAY) + 1}` }}>Next customer</span>
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
  const [model, setModel] = useState(false);
  const [extension, setExtension] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const sequence = useSequence(RENTAL_STEPS.length, (step) => {
    setExtension(step === 0 ? 0 : 3);
    setSelected(step === 2 ? "machine" : null);
  });
  const conflict = RENTAL_END_DAY + extension >= NEXT_START_DAY;
  const tight = extension === 1;
  const option = RENTAL_OPTIONS.find((item) => item.id === selected);
  const focus: RentalFocus = option ? option.focus : conflict ? "both" : "ex014";
  const extend = (days: number) => {
    setExtension(days);
    if (days > 0 && sequence.step === 0) sequence.go(1);
  };
  const finding = conflict
    ? <p><strong>The extra days run into the next booking.</strong></p>
    : tight
      ? <p><strong>One extra day eats the turnaround</strong> before {NEXT_RESERVATION}.</p>
      : <p>Nothing requested yet.</p>;
  return (
    <Example
      title={`${EX014} on rent`}
      situation={<p>The customer asks, “Can we keep the machine for three more days?”</p>}
      finding={finding}
      next={<p>Your team picks a plan, then answers the customer.</p>}
      boundary="Meter hours aren’t billable hours. Nothing here changes a booking or adds a charge."
    >
      <Sequence steps={RENTAL_STEPS} sequence={sequence} title="Manage the rental" />
      <div className={styles.calendar}>
        <div className={styles.segments} role="group" aria-label="Extend the rental">
          {[0, 1, 2, 3].map((days) => <button key={days} type="button" aria-pressed={extension === days} onClick={() => extend(days)}>{days === 0 ? "As booked" : `+${days} ${days > 1 ? "days" : "day"}`}</button>)}
        </div>
        <RentalTimeline extension={extension} conflict={conflict} />
      </div>
      <InteractionCue line="You can use this." steps={["Step through it", "Switch the extra days", ...(model ? ["Click a machine"] : [])]} />
      <MachineView
        className={styles.wideView}
        onModel={setModel}
        scene={{ kind: "rental", focus, conflict, onPick: (next) => setSelected(next === "ex027" ? "machine" : null) }}
        fallback={<RentalFallback conflict={conflict} focus={focus} />}
        label={`${EX014} on rent at the quarry with ${BREAKER}. ${EX027} is in the yard, not inspected.${conflict ? ` The extension runs into ${NEXT_RESERVATION}, which starts ${NEXT_RESERVATION_START}.` : ""}`}
      />
      {sequence.step === 2 && (
        <>
          <ul className={styles.options} aria-live="polite">
            {RENTAL_OPTIONS.map((item) => (
              <li key={item.id}>
                <button type="button" aria-pressed={selected === item.id} disabled={!conflict && !tight} onClick={() => setSelected(selected === item.id ? null : item.id)}>
                  <StateText state={item.state}>{item.question}</StateText>
                  <span>{item.answer}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className={styles.note}>Meter: {METER_ON_RENT}, an example reading from {METER_ON_RENT_UPDATED}. Charges follow your agreement.</p>
        </>
      )}
    </Example>
  );
}

/* 4. Return it to service */

const RETURN_STEPS: Step[] = [
  { label: RETURN_STAGES[0], text: `${EX014} is back in the yard with ${BREAKER}.` },
  { label: RETURN_STAGES[1], text: "Return photos sit next to the handoff photos." },
  { label: RETURN_STAGES[2], text: "A service is due. It stays off the board." },
  { label: RETURN_STAGES[3], text: "Service done. A reviewer signs it off." },
  { label: RETURN_STAGES[4], text: "Only now does it show as available." },
];

const RETURN_ACTIONS = ["Start the inspection", "Record the finding", "Release after service", "Make it available"];

const AREAS: Record<Exclude<ReturnArea, "overall">, { label: string; note: string }> = {
  sidePanel: { label: "Side panel", note: "A possible new mark. The inspector checks it. Any charge is a separate conversation." },
  attachment: { label: "Attachment", note: `${BREAKER} came back with the machine. It gets its own check.` },
  undercarriage: { label: "Tracks", note: "No visible difference. Photos only show the surface." },
  meter: { label: "Hour meter", note: `${METER_AT_HANDOFF} at handoff, ${METER_AT_RETURN} on return. Those are recorded hours, not billable hours.` },
};
const AREA_ORDER = Object.keys(AREAS) as (keyof typeof AREAS)[];

function ReturnFallback({ area, stage }: { area: ReturnArea; stage: number }) {
  const highlight: Partial<Record<ElevationArea, ElevationTone>> = area === "sidePanel" ? { sidePanel: "yellow" } : area === "attachment" ? { tool: "yellow", coupler: "yellow" } : area === "undercarriage" ? { tracks: "yellow" } : area === "meter" ? { cab: "yellow" } : {};
  const stageChip: { title: string; state?: State } = stage === 2 ? { title: "Maintenance hold", state: "blocked" } : stage >= 3 ? { title: stage === 4 ? "Ready for rental" : "Released", state: "ok" } : { title: stage === 1 ? "Awaiting inspection" : "Returned", state: "pending" };
  return (
    <Drawing viewBox="-2.6 -6.4 22 7.2">
      <Elevation tool="breaker" pose={POSES.parked} highlight={highlight} />
      <line x1={8.2} y1={-0.4} x2={8.2} y2={5.6} stroke="#c9cac6" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      <Elevation tool="breaker" pose={POSES.parked} x={10.6} highlight={highlight} mark />
      <DrawingLabel x={11.15} y={3.05} title={stageChip.title} state={stageChip.state} />
    </Drawing>
  );
}

export function ReturnToService() {
  const [stage, setStage] = useState(0);
  const [area, setArea] = useState<ReturnArea>("overall");
  const { ref, width } = useWidth<HTMLDivElement>();
  const stacked = width > 0 && width < 560;
  const ready = stage === 4;
  const advance = () => {
    const next = Math.min(4, stage + 1);
    setStage(next);
    if (next === 1) setArea("sidePanel");
    if (next === 2) setArea("overall");
  };
  const reset = () => { setStage(0); setArea("overall"); };
  const current = RETURN_STEPS[stage];
  return (
    <Example
      title={`${EX014} comes back`}
      situation={<p>{EX014} is back from the quarry. {NEXT_RESERVATION} is waiting for it.</p>}
      finding={ready ? <p><strong>Released and available.</strong></p> : <p><strong>Off the board until someone signs it off.</strong></p>}
      next={<p>{ready ? "Your desk can offer it again." : "Inspector checks the mark. Shop does the service."}</p>}
      boundary="Photos support an inspection. They don’t certify a machine or set a charge."
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
      <InteractionCue line="You can use this." steps={["Take the next step", "Compare an area"]} />
      <div ref={ref}>
        <MachineView
          className={stacked ? styles.splitStacked : styles.split}
          scene={{ kind: "return", area, stage, stacked }}
          fallback={<ReturnFallback area={area} stage={stage} />}
          label={`${EX014} at handoff and on return, side by side. The return view shows a possible new mark on the side panel. Status: ${current.label}.`}
        >
          <div className={styles.splitLabels} data-stacked={stacked} aria-hidden="true">
            <span>At handoff <em>{RENTAL_START}</em></span>
            <span>On return</span>
          </div>
        </MachineView>
      </div>
      <div className={styles.areaBar}>
        <div className={styles.segments} role="group" aria-label="Compare an area">
          {AREA_ORDER.map((key) => <button key={key} type="button" aria-pressed={area === key} onClick={() => setArea(area === key ? "overall" : key)}>{AREAS[key].label}</button>)}
        </div>
        <p className={styles.note} aria-live="polite">
          {stage === 2 && area === "overall" ? `Hold: service due on recorded hours. ${WORK_ORDER} is open.` : area !== "overall" ? AREAS[area].note : "Pick an area to compare."}
        </p>
      </div>
    </Example>
  );
}
