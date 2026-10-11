"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode, type RefObject } from "react";
import dynamic from "next/dynamic";
import { ArrowRight, Pause, Play, RotateCcw } from "lucide-react";
import type { CellView, SampleId } from "./manufacturing-scene";
import {
  averageOf, buildPlan, cell, cellStatus, driveHistory, formatClock, partPoses, planning, runs, sequences, simulation, summaries,
  type Configuration, type OrderId, type PlanBlock, type Stage,
} from "./manufacturing-model";
import styles from "./manufacturing.module.css";

const ProductCanvas = dynamic(() => import("./manufacturing-scene").then((module) => module.ProductCanvas), { ssr: false });
const DriveCanvas = dynamic(() => import("./manufacturing-scene").then((module) => module.DriveCanvas), { ssr: false });
const CompareCanvas = dynamic(() => import("./manufacturing-scene").then((module) => module.CompareCanvas), { ssr: false });

function subscribeToMotion(update: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", update);
  return () => media.removeEventListener("change", update);
}
function useReducedMotion() {
  return useSyncExternalStore(subscribeToMotion, () => window.matchMedia("(prefers-reduced-motion: reduce)").matches, () => false);
}

let webglSupport: boolean | undefined;
function detectWebGL() {
  if (webglSupport === undefined) {
    try {
      const canvas = document.createElement("canvas");
      webglSupport = Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
    } catch {
      webglSupport = false;
    }
  }
  return webglSupport;
}
const subscribeToNothing = () => () => {};

function useInView(target: RefObject<HTMLElement | null>, rootMargin: string, threshold = 0, once = true) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const element = target.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!once) setInView(entry.isIntersecting);
      else if (entry.isIntersecting) {
        setInView(true);
        observer.disconnect();
      }
    }, { rootMargin, threshold });
    observer.observe(element);
    return () => observer.disconnect();
  }, [target, rootMargin, threshold, once]);
  return inView;
}

// The SVG fallback renders first. The WebGL scene loads near the viewport,
// fades in once it has drawn, and stops rendering while off screen.
function SceneFrame({ label, fallback, shape, render, children }: { label: string; fallback: ReactNode; shape: "wide" | "product" | "detail"; render: (onReady: () => void, active: boolean) => ReactNode; children?: ReactNode }) {
  const frame = useRef<HTMLDivElement>(null);
  const near = useInView(frame, "600px 0px");
  const active = useInView(frame, "100px 0px", 0, false);
  const webgl = useSyncExternalStore(subscribeToNothing, detectWebGL, () => false);
  const [ready, setReady] = useState(false);
  return (
    <div ref={frame} className={styles.scene} data-shape={shape}>
      <div className={styles.sceneArt} role="img" aria-label={label}>
        <div className={styles.sceneFallback}>{fallback}</div>
        {near && webgl && <div className={styles.sceneLayer} data-ready={ready}>{render(() => setReady(true), active)}</div>}
      </div>
      {children}
    </div>
  );
}

type ExampleProps = { title: string; children: ReactNode; situation: ReactNode; finding: ReactNode; next: ReactNode; findingLabel?: string; boundary?: ReactNode };

function Example({ title, children, situation, finding, next, findingLabel = "Finding for review", boundary }: ExampleProps) {
  return (
    <figure className={styles.example}>
      <figcaption className={styles.exampleBar}>
        <span className={styles.exampleTag}>Illustrative workflow</span>
        <span className={styles.exampleTitle}>{title}</span>
      </figcaption>
      <div className={styles.exampleBody}>{children}</div>
      <ol className={styles.outcome}>
        <li data-role="situation"><span className={styles.outcomeLabel}>Situation</span>{situation}</li>
        <li data-role="finding"><span className={styles.outcomeLabel}>{findingLabel}</span>{finding}</li>
        <li data-role="next"><span className={styles.outcomeLabel}>Next step for your team</span>{next}</li>
      </ol>
      {boundary && <p className={styles.boundary}>{boundary}</p>}
    </figure>
  );
}

const range = (start: number, end: number) => `${formatClock(start)}–${formatClock(end)}`;

/* 1. Inspect the product -------------------------------------------------- */

const SAMPLES: { id: SampleId; label: string }[] = [
  { id: "reference", label: "Reference" },
  { id: "missing", label: "Missing fastener" },
  { id: "variation", label: "Allowed variation" },
];

const SPOTS = [[-0.135, 0.098], [0.135, 0.098], [0.135, -0.098], [-0.135, -0.098]];

function HousingSketch({ x, variant, missing, ring, outline }: { x: number; variant?: boolean; missing?: boolean; ring?: boolean; outline?: boolean }) {
  const scale = 520;
  return (
    <g transform={`translate(${x} 140)`}>
      <rect x={-124} y={-102} width={248} height={204} rx={10} fill="#f8f8f6" stroke="#d8d9d9" />
      {outline && <rect x={-0.176 * scale - 9} y={-0.136 * scale - 9} width={0.352 * scale + 18} height={0.272 * scale + 18} rx={30} fill="none" stroke="#fed603" strokeWidth={5} />}
      <rect x={-0.176 * scale} y={-0.136 * scale} width={0.352 * scale} height={0.272 * scale} rx={24} fill={variant ? "#b3a88f" : "#8a9399"} stroke="#3e4347" strokeWidth={1.25} />
      <rect x={-0.1 * scale} y={-0.071 * scale} width={0.2 * scale} height={0.142 * scale} rx={15} fill={variant ? "#c1b69e" : "#a4acb1"} stroke="#1d2022" strokeWidth={1.25} />
      <circle cx={-0.042 * scale} r={13} fill="#25282b" />
      <rect x={0.017 * scale} y={-0.017 * scale} width={0.066 * scale} height={0.034 * scale} rx={2} fill="#dfe2e4" />
      {SPOTS.map(([sx, sz], index) => {
        const empty = missing && index === 2;
        return (
          <g key={index} transform={`translate(${sx * scale} ${-sz * scale})`}>
            <circle r={10} fill="#3e4347" />
            {empty ? <circle r={4.4} fill="#0b0c0d" /> : <><circle r={8.4} fill="#d4d8db" stroke="#7e8489" strokeWidth={0.75} /><path d="M-3.6 0 H3.6 M0 -3.6 V3.6" stroke="#2a2d30" strokeWidth={1.4} /></>}
            {ring && index === 2 && <circle r={17} fill="none" stroke="#fed603" strokeWidth={4} />}
          </g>
        );
      })}
    </g>
  );
}

function ProductSketch({ sample, showFinding }: { sample: SampleId; showFinding: boolean }) {
  const pair = sample !== "reference";
  return (
    <svg viewBox={pair ? "0 0 600 300" : "150 0 300 300"} className={styles.sketch}>
      <HousingSketch x={pair ? 160 : 300} ring={sample === "missing" && showFinding} outline={sample === "variation" && showFinding} />
      <text x={pair ? 160 : 300} y={276} textAnchor="middle" className={styles.sketchText}>Approved reference</text>
      {pair && (
        <>
          <HousingSketch x={440} variant={sample === "variation"} missing={sample === "missing"} ring={sample === "missing" && showFinding} outline={sample === "variation" && showFinding} />
          <text x={440} y={276} textAnchor="middle" className={styles.sketchText}>From the line</text>
        </>
      )}
    </svg>
  );
}

const SAMPLE_STORY: Record<SampleId, { situation: ReactNode; finding: string; detail: string; next: ReactNode; flagged: boolean }> = {
  reference: {
    situation: <p>The approved part, as the camera sees it.</p>,
    finding: "Four fasteners, positions 1–4.",
    detail: "This and the written spec define the check.",
    next: <p>Gather good parts and known defects from your line to set it up.</p>,
    flagged: false,
  },
  missing: {
    situation: <p>A housing off the line, at the same angle as the reference.</p>,
    finding: "Possible missing fastener.",
    detail: "Position 3 is an empty hole.",
    next: <p><strong>Send it to quality review.</strong> An inspector decides before anything is reworked.</p>,
    flagged: true,
  },
  variation: {
    situation: <p>This one is a lighter shade.</p>,
    finding: "Allowed variation.",
    detail: "The shade is in range and all four screws are there.",
    next: <p>No review. It goes on to packaging.</p>,
    flagged: true,
  },
};

export function InspectProduct() {
  const [sample, setSample] = useState<SampleId>("missing");
  const [showFinding, setShowFinding] = useState(true);
  const story = SAMPLE_STORY[sample];
  return (
    <Example
      title={`Final check, ${cell.product}`}
      situation={story.situation}
      finding={
        <button type="button" className={styles.findingButton} aria-pressed={showFinding} onClick={() => setShowFinding(!showFinding)}>
          <strong>{story.finding}</strong>
          <span>{story.detail}</span>
          {story.flagged && <span className={styles.findingAction}>{showFinding ? "Hide on the part" : "Show on the part"} <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" /></span>}
        </button>
      }
      next={story.next}
      boundary="One reference photo isn’t enough. A real system needs representative samples, the right camera and lighting, and testing for missed defects and false alarms."
    >
      <div className={styles.choices} role="group" aria-label="Choose an example">
        {SAMPLES.map((item) => (
          <button key={item.id} type="button" className={styles.choice} aria-pressed={sample === item.id} onClick={() => { setSample(item.id); setShowFinding(true); }}>{item.label}</button>
        ))}
      </div>
      <SceneFrame
        shape="product"
        label={sample === "reference"
          ? "The approved reference housing, seen from above at an angle, with four fasteners numbered 1 to 4."
          : sample === "missing"
            ? "The approved reference beside a housing from the line, at the same angle. The housing from the line has an empty hole at fastener position 3."
            : "The approved reference beside a housing from the line with a lighter surface shade. Both have four fasteners."}
        fallback={<ProductSketch sample={sample} showFinding={showFinding} />}
        render={(onReady) => <ProductCanvas sample={sample} showFinding={showFinding} onReady={onReady} />}
      />
    </Example>
  );
}

/* 2. Plan the production -------------------------------------------------- */

type SequenceKey = "urgentFirst" | "currentFirst";
const SEQUENCE_OPTIONS: { id: SequenceKey; name: string; title: string; detail: string }[] = [
  { id: "urgentFirst", name: "Sequence A", title: "Run the urgent order first", detail: "Needs one more setup change." },
  { id: "currentFirst", name: "Sequence B", title: "Finish the current batch first", detail: "The urgent order starts later." },
];

const CHECKS: [string, string][] = [
  ["Material", "In stock"],
  ["Equipment", "Cell 1, fixture F2"],
  ["Setup change", `F1 to F2, ${planning.setupMinutes} min`],
  ["Orders that move", "Depends on the sequence"],
];

const SHIFT_LENGTH = planning.shiftEnd - planning.shiftStart;
const HOURS = Array.from({ length: SHIFT_LENGTH / 60 + 1 }, (_, index) => planning.shiftStart + index * 60);
const currentPlan = buildPlan(sequences.current);
const orderBlock = (plan: PlanBlock[], order: OrderId) => plan.find((block): block is Extract<PlanBlock, { kind: "order" }> => block.kind === "order" && block.order === order);
const setupCount = (blocks: PlanBlock[]) => blocks.filter((block) => block.kind === "setup").length;

function addedSetups(plan: PlanBlock[]) {
  const existing = currentPlan.filter((block) => block.kind === "setup").map((block) => (block.kind === "setup" ? `${block.from}-${block.to}` : ""));
  return new Set(plan.filter((block) => block.kind === "setup" && !existing.includes(`${block.from}-${block.to}`)).map((block) => block.start));
}

function shiftText(minutes: number) {
  const size = Math.abs(minutes);
  return `${size % 60 === 0 ? `${size / 60} h` : `${size} min`} ${minutes > 0 ? "later" : "earlier"}`;
}

// One line naming every order that moves and any extra setup, computed from the plan.
function changeSummary(plan: PlanBlock[]) {
  const parts: string[] = [];
  for (const order of ["1042", "1043"] as OrderId[]) {
    const before = orderBlock(currentPlan, order);
    const after = orderBlock(plan, order);
    if (before && after && before.start !== after.start) parts.push(`${order} starts ${shiftText(after.start - before.start)}`);
  }
  const urgent = orderBlock(plan, "1051");
  if (urgent) parts.push(`1051 runs ${range(urgent.start, urgent.end)}`);
  const extra = setupCount(plan) - setupCount(currentPlan);
  if (extra > 0) parts.push(`${extra === 1 ? "one" : extra} extra setup`);
  return parts.join(" · ");
}

function Lane({ title, plan, compare }: { title: string; plan: PlanBlock[]; compare?: boolean }) {
  const added = compare ? addedSetups(plan) : new Set<number>();
  return (
    <div className={styles.lane} data-compare={Boolean(compare)}>
      <p className={styles.laneTitle}>{title}</p>
      <ol className={styles.laneTrack}>
        {plan.map((block) => {
          const style = { left: `${((block.start - planning.shiftStart) / SHIFT_LENGTH) * 100}%`, width: `${((block.end - block.start) / SHIFT_LENGTH) * 100}%` };
          if (block.kind === "setup") {
            const isAdded = added.has(block.start);
            return (
              <li key={`s${block.start}`} className={styles.block} data-kind="setup" data-added={isAdded} style={style}>
                <span className={styles.srOnly}>Setup {block.from} to {block.to}{isAdded ? ", added" : ""}, {range(block.start, block.end)}</span>
              </li>
            );
          }
          const before = orderBlock(currentPlan, block.order);
          const moved = compare && before && before.start !== block.start;
          return (
            <li key={block.order} className={styles.block} data-kind={block.order === "1051" ? "urgent" : "order"} data-moved={Boolean(moved)} style={style}>
              <span className={styles.blockName}>{block.order}</span>
              <span className={styles.blockMeta}>{range(block.start, block.end)}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function PlanProduction() {
  const [choice, setChoice] = useState<SequenceKey>("urgentFirst");
  const option = SEQUENCE_OPTIONS.find((item) => item.id === choice) ?? SEQUENCE_OPTIONS[0];
  const plan = buildPlan(sequences[choice]);
  return (
    <Example
      title="Rush order, Cell 1"
      situation={<p>A rush order for <strong>120 extended housings</strong> lands for tomorrow’s {range(planning.shiftStart, planning.shiftEnd)} shift.</p>}
      findingLabel="Result for review"
      finding={<p><strong>Two sequences to compare.</strong> Neither is approved yet.</p>}
      next={<p><strong>Your planner picks one and approves it.</strong> Only that plan goes to the floor.</p>}
    >
      <div className={styles.request}>
        <p className={styles.askText}>“Can we fit an urgent order into tomorrow’s shift?”</p>
        <dl className={styles.checks}>
          {CHECKS.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
        </dl>
      </div>
      <div className={styles.options} role="group" aria-label="Proposed sequences">
        {SEQUENCE_OPTIONS.map((item) => (
          <button key={item.id} type="button" className={styles.option} aria-pressed={choice === item.id} onClick={() => setChoice(item.id)}>
            <span className={styles.optionName}>{item.name}</span>
            <span className={styles.optionTitle}>{item.title}</span>
            <span className={styles.optionDetail}>{item.detail}</span>
          </button>
        ))}
      </div>
      <div className={styles.board}>
        <div className={styles.axis} aria-hidden="true">
          {HOURS.map((hour) => <span key={hour} style={{ left: `${((hour - planning.shiftStart) / SHIFT_LENGTH) * 100}%` }}>{formatClock(hour)}</span>)}
        </div>
        <Lane title="Today’s plan" plan={currentPlan} />
        <Lane title={option.name} plan={plan} compare />
        <p className={styles.delta} aria-live="polite">{changeSummary(plan)}</p>
        <div className={styles.legend} aria-hidden="true">
          <span data-kind="setup">Setup</span><span data-kind="added">Added setup</span><span data-kind="urgent">Rush order</span><span data-kind="moved">Moved</span>
        </div>
      </div>
      <p className={styles.assumptions}>Cell 1 makes {planning.ratePerHour} housings an hour, set by its one inspection station. A fixture change takes {planning.setupMinutes} minutes. No breaks modeled.</p>
    </Example>
  );
}

/* 3. Investigate the problem ---------------------------------------------- */

type SourceId = "signals" | "manual" | "record";
type ExplanationId = "load" | "condition";
const days = driveHistory.temperature.length;
const before = (values: number[]) => values.slice(0, driveHistory.changeDay - 1);
const after = (values: number[]) => values.slice(driveHistory.changeDay - 1);
const tempBefore = Math.round(averageOf(before(driveHistory.temperature)));
const tempAfter = Math.round(averageOf(after(driveHistory.temperature)));
const loadBefore = Math.round(averageOf(before(driveHistory.load)));
const loadAfter = Math.round(averageOf(after(driveHistory.load)));

const SOURCES: Record<SourceId, { title: string; excerpt: string }> = {
  signals: { title: "Sensor log", excerpt: `Day ${driveHistory.changeDay - 1}: ${driveHistory.temperature[driveHistory.changeDay - 2]} °C at ${driveHistory.load[driveHistory.changeDay - 2]}% load. Day ${driveHistory.changeDay}: ${driveHistory.temperature[driveHistory.changeDay - 1]} °C at ${driveHistory.load[driveHistory.changeDay - 1]}% load.` },
  manual: { title: "Manual, 4.3", excerpt: "Allowed housing temperature depends on load. Check Table 4-2 before running at a higher load." },
  record: { title: "Work order WO-2318", excerpt: "Service 14 weeks ago: oil topped up, coupling checked. No temperature or load readings taken." },
};

const EXPLANATIONS: { id: ExplanationId; title: string; text: string; sources: SourceId[]; charts: ("temperature" | "load")[]; checks: number[] }[] = [
  { id: "load", title: "It’s working harder", text: "Load went up on day 8. So did the temperature.", sources: ["signals", "manual"], charts: ["temperature", "load"], checks: [0, 1] },
  { id: "condition", title: "Something changed inside", text: "Oil or wear since the last service. There are no old readings to compare.", sources: ["record", "signals"], charts: ["temperature"], checks: [2] },
];

const CHECK_NEXT = ["Review applicable operating limits.", "Compare with previous operation under similar load.", "Technician confirms the next inspection."];

const CHART_WIDTH = 520;
const CHART_HEIGHT = 110;
const dayX = (day: number) => 8 + ((day - 1) / (days - 1)) * (CHART_WIDTH - 16);
const KEY_DAYS = new Set([1, 4, driveHistory.changeDay, 11, days]);

function SignalChart({ label, unit, values, low, high, emphasis }: { label: string; unit: "°C" | "%"; values: number[]; low: number; high: number; emphasis: boolean }) {
  const y = (value: number) => 10 + (1 - (value - low) / (high - low)) * (CHART_HEIGHT - 20);
  const points = values.map((value, index) => `${dayX(index + 1).toFixed(1)},${y(value).toFixed(1)}`).join(" ");
  const [from, to] = unit === "°C" ? [tempBefore, tempAfter] : [loadBefore, loadAfter];
  return (
    <div className={styles.chart} data-emphasis={emphasis}>
      <p className={styles.chartLabel}>{label} <span>{from}{unit === "°C" ? " °C" : "%"} → {to}{unit === "°C" ? " °C" : "%"}</span></p>
      <div className={styles.chartBody}>
        <div className={styles.chartTicks} aria-hidden="true">
          {[high, low].map((tick) => <span key={tick} style={{ top: `${(y(tick) / CHART_HEIGHT) * 100}%` }}>{tick}{unit === "°C" ? " °C" : "%"}</span>)}
        </div>
        <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} role="img" aria-label={`${label} over ${days} days: about ${from}${unit} before day ${driveHistory.changeDay}, ${to}${unit} after.`}>
          <rect x={dayX(driveHistory.changeDay - 0.5)} y={0} width={CHART_WIDTH - dayX(driveHistory.changeDay - 0.5)} height={CHART_HEIGHT} fill="#fff5bf" />
          {[high, low].map((tick) => <line key={tick} x1={0} x2={CHART_WIDTH} y1={y(tick)} y2={y(tick)} stroke="#dcdcda" vectorEffect="non-scaling-stroke" />)}
          <polyline points={points} fill="none" stroke="#262829" strokeWidth={1.75} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          {values.map((value, index) => <circle key={index} cx={dayX(index + 1)} cy={y(value)} r={3.4} fill={index + 1 >= driveHistory.changeDay ? "#262829" : "#fff"} stroke="#262829" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />)}
        </svg>
      </div>
    </div>
  );
}

function DayAxis() {
  return (
    <div className={styles.chartBody} aria-hidden="true">
      <span />
      <div className={styles.dayAxis}>
        {Array.from({ length: days }, (_, index) => <span key={index} data-key={KEY_DAYS.has(index + 1)} style={{ left: `${(dayX(index + 1) / CHART_WIDTH) * 100}%` }}>{index === 0 ? "Day 1" : index + 1}</span>)}
      </div>
    </div>
  );
}

function DriveSketch() {
  return (
    <svg viewBox="0 0 400 320" className={styles.sketch}>
      <rect x={20} y={70} width={360} height={26} fill="#2b2e31" />
      {Array.from({ length: 18 }, (_, index) => <rect key={index} x={26 + index * 20} y={74} width={10} height={18} rx={2} fill="#bfc3c6" />)}
      <rect x={160} y={110} width={70} height={78} rx={8} fill="#d9bd3a" stroke="#17191a" />
      <rect x={80} y={120} width={84} height={60} rx={24} fill="#f1d85c" stroke="#17191a" />
      <path d="M230 150 C 280 150 290 200 300 300" fill="none" stroke="#1b1d1f" strokeWidth={4} />
      <text x={200} y={232} textAnchor="middle" className={styles.sketchText}>{cell.drive}: {tempBefore} → {tempAfter} °C</text>
    </svg>
  );
}

export function InvestigateProblem() {
  const [explanation, setExplanation] = useState<ExplanationId>("load");
  const [source, setSource] = useState<SourceId | null>(null);
  const reducedMotion = useReducedMotion();
  const frame = useRef<HTMLDivElement>(null);
  const seen = useInView(frame, "0px", 0.45);
  const view: CellView = seen || reducedMotion ? "drive" : "cell";
  const selected = EXPLANATIONS.find((item) => item.id === explanation) ?? EXPLANATIONS[0];
  const opened = source && selected.sources.includes(source) ? source : null;
  return (
    <Example
      title={`Conveyor drive ${cell.drive}, Cell 1`}
      situation={<p><strong>Operating temperature has increased.</strong> {cell.drive} is running hotter than it did two weeks ago.</p>}
      finding={<p><strong>A supported investigation, with open questions.</strong> No cause confirmed.</p>}
      next={<p>Your maintenance lead decides what to inspect, by the approved procedure.</p>}
      boundary="Fictional example. A hotter motor alone doesn’t prove a part is failing, and the assistant never touches the machine."
    >
      <div className={styles.investigateTop}>
        <div ref={frame}>
          <SceneFrame
            shape="detail"
            label={`Conveyor drive ${cell.drive}: a gear motor bolted to the conveyor frame beside packaging. Its temperature rose from about ${tempBefore} °C to ${tempAfter} °C.`}
            fallback={<DriveSketch />}
            render={(onReady, active) => <DriveCanvas view={view} instant={reducedMotion} active={active} temperature={`${tempBefore} → ${tempAfter} °C since day ${driveHistory.changeDay}`} onReady={onReady} />}
          />
        </div>
        <div className={styles.signals}>
          <SignalChart label="Drive temperature" unit="°C" values={driveHistory.temperature} low={44} high={58} emphasis={selected.charts.includes("temperature")} />
          <SignalChart label="Production load" unit="%" values={driveHistory.load} low={50} high={85} emphasis={selected.charts.includes("load")} />
          <DayAxis />
          <p className={styles.chartNote}>Production load also changed during this period.</p>
        </div>
      </div>
      <div className={styles.reasoning}>
        <div className={styles.column} data-kind="observed">
          <p className={styles.columnLabel}>Observed</p>
          <p>Temperature and load both rose on day {driveHistory.changeDay}.</p>
        </div>
        <div className={styles.column} data-kind="possible">
          <p className={styles.columnLabel}>Possible explanation</p>
          <p className={styles.read}>The temperature change coincides with a change in load. More information is needed to determine the cause.</p>
          <div className={styles.explanations} role="group" aria-label="Possible explanations">
            {EXPLANATIONS.map((item) => (
              <button key={item.id} type="button" className={styles.explanation} aria-pressed={explanation === item.id} onClick={() => { setExplanation(item.id); setSource(null); }}>
                <strong>{item.title}</strong>
                <span>{item.text}</span>
              </button>
            ))}
          </div>
          <div className={styles.sources}>
            <span>Based on</span>
            {selected.sources.map((id) => (
              <button key={id} type="button" aria-pressed={opened === id} onClick={() => setSource(opened === id ? null : id)}>{SOURCES[id].title}</button>
            ))}
          </div>
          {opened && <p className={styles.excerpt} aria-live="polite"><span>Fictional excerpt</span>{SOURCES[opened].excerpt}</p>}
        </div>
        <div className={styles.column} data-kind="confirm">
          <p className={styles.columnLabel}>Needs confirmation</p>
          <ol>
            {CHECK_NEXT.map((check, index) => <li key={check} data-related={selected.checks.includes(index)}>{check}</li>)}
          </ol>
        </div>
      </div>
    </Example>
  );
}

/* 4. Test the change ------------------------------------------------------ */

const RUN = simulation.runSeconds;
const PLAYBACK_SPEED = 15;
const formatSim = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
const stageName: Record<Stage, string> = { assembly: "Assembly", inspection: "Inspection", packaging: "Packaging" };
const bottleneckMoved = summaries.existing.limitingStage === "inspection" && summaries.proposed.limitingStage === "assembly";

const ASSUMPTIONS = [
  `Assembly: ${simulation.assemblySeconds} s a housing, one station.`,
  `Inspection: ${simulation.inspectionSeconds} s a housing per station, moving through the booth included.`,
  `Packaging: ${simulation.packagingSeconds} s a housing, one station.`,
  `Conveyor at ${simulation.conveyorSpeed * 60} m a minute, room for ${simulation.bufferCapacity} housings before inspection. When it’s full, assembly holds its finished part.`,
  "First in, first out. Each part goes to whichever inspection station can take it sooner.",
  `Both lines start empty and run ${RUN / 60} simulated minutes. Parts are always in stock and the new station is staffed.`,
];

const RESULTS: { label: string; today: string; proposed: string }[] = [
  { label: `Packed in ${RUN / 60} minutes`, today: String(summaries.existing.packaged), proposed: String(summaries.proposed.packaged) },
  { label: "Most parts waiting", today: String(summaries.existing.mostWaiting), proposed: String(summaries.proposed.mostWaiting) },
  { label: "Bottleneck", today: stageName[summaries.existing.limitingStage], proposed: stageName[summaries.proposed.limitingStage] },
];

function CompareSketch({ time }: { time: number }) {
  const scale = 54;
  const px = (x: number) => (x + 6.2) * scale;
  const lines: { configuration: Configuration; y: number; title: string }[] = [
    { configuration: "existing", y: 70, title: "Today" },
    { configuration: "proposed", y: 250, title: "With a second station" },
  ];
  return (
    <svg viewBox={`0 0 ${8.8 * scale} 330`} className={styles.sketch}>
      {lines.map(({ configuration, y, title }) => {
        const proposed = configuration === "proposed";
        const status = cellStatus(runs[configuration], time);
        const pz = (z: number) => y + z * scale;
        return (
          <g key={configuration}>
            <text x={px(-6)} y={y - 34} className={styles.sketchText}>{title} · {status.packaged} packed · {status.waitingForInspection} waiting</text>
            <line x1={px(-4.85)} y1={pz(0)} x2={px(2.6)} y2={pz(0)} stroke="#9a9d9f" strokeWidth={18} />
            {proposed && <path d={`M${px(-1.4)} ${pz(0)} V${pz(-2.2)} H${px(1.4)} V${pz(0)}`} fill="none" stroke="#007dfe" strokeWidth={18} />}
            <rect x={px(-5.9)} y={pz(-0.47)} width={1.05 * scale} height={0.95 * scale} fill="#dcdcd9" stroke="#262829" />
            <rect x={px(-0.7)} y={pz(-0.44)} width={1.4 * scale} height={0.88 * scale} fill="none" stroke="#262829" strokeWidth={2.5} />
            {proposed && <rect x={px(-0.7)} y={pz(-2.64)} width={1.4 * scale} height={0.88 * scale} fill="none" stroke="#007dfe" strokeWidth={2.5} />}
            {partPoses(runs[configuration], time).filter((pose) => pose.visible && pose.x < 2.6).map((pose) => <rect key={pose.id} x={px(pose.x) - 8.5} y={pz(pose.z) - 6.5} width={17} height={13} rx={3} fill="#8a9399" stroke="#262829" />)}
          </g>
        );
      })}
    </svg>
  );
}

export function TestChange() {
  const reducedMotion = useReducedMotion();
  const [time, setTime] = useState(RUN);
  const [playing, setPlaying] = useState(false);
  const clock = useRef(RUN);
  const touched = useRef(false);
  const section = useRef<HTMLDivElement>(null);
  const visible = useInView(section, "0px", 0.4);
  const onScreen = useInView(section, "0px", 0, false);
  const running = playing && onScreen;

  useEffect(() => {
    if (!running) return;
    let frame = 0;
    let last = performance.now();
    let pushed = 0;
    const tick = (now: number) => {
      const delta = Math.min(now - last, 100) / 1000;
      last = now;
      clock.current = Math.min(RUN, clock.current + delta * PLAYBACK_SPEED);
      if (now - pushed > 90 || clock.current >= RUN) {
        pushed = now;
        setTime(clock.current);
      }
      if (clock.current >= RUN) {
        setPlaying(false);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running]);

  useEffect(() => {
    if (!visible || reducedMotion || touched.current) return;
    touched.current = true;
    clock.current = 0;
    const start = requestAnimationFrame(() => { setTime(0); setPlaying(true); });
    return () => cancelAnimationFrame(start);
  }, [visible, reducedMotion]);

  function seek(next: number) {
    touched.current = true;
    clock.current = Math.max(0, Math.min(RUN, next));
    setTime(clock.current);
  }
  function play() {
    touched.current = true;
    if (clock.current >= RUN) seek(0);
    setPlaying(true);
  }

  const today = cellStatus(runs.existing, time);
  const proposed = cellStatus(runs.proposed, time);
  return (
    <Example
      title="A second inspection station, Cell 1"
      situation={<p>Parts pile up in front of inspection, and assembly sits holding finished housings.</p>}
      findingLabel="Result for review"
      finding={bottleneckMoved
        ? <p><strong>Inspection can accept more work. Assembly now limits the line.</strong></p>
        : <p><strong>The change doesn’t move the limit.</strong></p>}
      next={<p>Check it with your real cycle times before you buy the station.</p>}
      boundary="Illustrative simulation using simplified assumptions. It isn’t a validated model of a real factory or a live digital twin, and it isn’t connected to any equipment. A real study needs calibrated process data and engineering sign-off."
    >
      <div className={styles.question}>
        <p className={styles.askText}>“What happens if we add a second inspection station?”</p>
        <p>The assistant set it up as one extra station, everything else unchanged.</p>
      </div>
      <div ref={section} className={styles.simulation}>
        <div className={styles.playback}>
          <button type="button" className={styles.iconButton} onClick={() => (playing ? setPlaying(false) : play())} aria-label={playing ? "Pause" : time >= RUN ? "Replay" : "Play"}>
            {playing ? <Pause size={16} strokeWidth={1.5} /> : <Play size={16} strokeWidth={1.5} />}
          </button>
          <button type="button" className={styles.iconButton} onClick={() => { seek(0); setPlaying(true); }} aria-label="Replay from the start"><RotateCcw size={16} strokeWidth={1.5} /></button>
          <label className={styles.scrubber}>
            <span className={styles.srOnly}>Simulated time</span>
            <input type="range" min={0} max={RUN} step={1} value={Math.round(time)} onChange={(event) => { setPlaying(false); seek(Number(event.target.value)); }} />
          </label>
          <span className={styles.clock}>{formatSim(time)} / {formatSim(RUN)}</span>
        </div>
        <SceneFrame
          shape="wide"
          label={`Both lines at ${formatSim(time)} simulated time. Today: ${today.waitingForInspection} housings waiting before inspection, ${today.packaged} packed. With a second station: ${proposed.waitingForInspection} waiting, ${proposed.packaged} packed.`}
          fallback={<CompareSketch time={time} />}
          render={(onReady, active) => <CompareCanvas clock={clock} time={time} animating={running} active={active} instant={reducedMotion} onReady={onReady} />}
        >
          <p className={styles.compareKey}><strong>Left:</strong> with a second station. <strong>Right:</strong> today.</p>
        </SceneFrame>
      </div>
      <dl className={styles.results}>
        {RESULTS.map((result) => (
          <div key={result.label}>
            <dt>{result.label}</dt>
            <dd><span>{result.today}</span><ArrowRight size={18} strokeWidth={1.5} aria-label="becomes" /><strong>{result.proposed}</strong></dd>
          </div>
        ))}
      </dl>
      <details className={styles.assumptionList}>
        <summary>Assumptions, the same for both lines</summary>
        <ul>{ASSUMPTIONS.map((item) => <li key={item}>{item}</li>)}</ul>
      </details>
    </Example>
  );
}

