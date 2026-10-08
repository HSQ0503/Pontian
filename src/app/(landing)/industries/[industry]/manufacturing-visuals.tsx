"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode, type RefObject } from "react";
import dynamic from "next/dynamic";
import { ArrowRight, Pause, Play, RotateCcw, StepForward } from "lucide-react";
import type { CellView, SampleId } from "./manufacturing-scene";
import {
  averageOf, buildPlan, cell, cellStatus, driveHistory, formatClock, layout, partPoses, planning, runs, sequences, simulation, summaries,
  type Configuration, type OrderId, type PlanBlock, type RunSummary,
} from "./manufacturing-model";
import styles from "./manufacturing.module.css";

const ProductCanvas = dynamic(() => import("./manufacturing-scene").then((module) => module.ProductCanvas), { ssr: false });
const CellCanvas = dynamic(() => import("./manufacturing-scene").then((module) => module.CellCanvas), { ssr: false });

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

// The SVG fallback renders first; the WebGL scene loads only near the
// viewport and fades in over the fallback once it has drawn.
function SceneFrame({ label, fallback, shape, render, children }: { label: string; fallback: ReactNode; shape: "wide" | "product" | "detail"; render: (onReady: () => void) => ReactNode; children?: ReactNode }) {
  const frame = useRef<HTMLDivElement>(null);
  const near = useInView(frame, "600px 0px");
  const webgl = useSyncExternalStore(subscribeToNothing, detectWebGL, () => false);
  const [ready, setReady] = useState(false);
  return (
    <div ref={frame} className={styles.scene} data-shape={shape}>
      <div className={styles.sceneArt} role="img" aria-label={label}>
        <div className={styles.sceneFallback}>{fallback}</div>
        {near && webgl && <div className={styles.sceneLayer} data-ready={ready}>{render(() => setReady(true))}</div>}
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
        <span className={styles.exampleNote}>Fictional cell, not a live system or customer record</span>
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
  { id: "reference", label: "Reference product" },
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
          <text x={440} y={276} textAnchor="middle" className={styles.sketchText}>Inspection sample</text>
        </>
      )}
    </svg>
  );
}

const SAMPLE_STORY: Record<SampleId, { situation: ReactNode; finding: string; findingDetail: string; next: ReactNode; fasteners: string; shade: string; flag?: "fasteners" | "shade" }> = {
  reference: {
    situation: <p>The approved reference shows a correct <strong>{cell.product}</strong> from the inspection camera’s viewpoint.</p>,
    finding: "Four fasteners, positions 1–4.",
    findingDetail: "The reference and the written requirements define what the check looks for.",
    next: <p>Collect approved examples and known defects from production to set up and test the check.</p>,
    fasteners: "4 of 4 visible",
    shade: "Reference shade",
  },
  missing: {
    situation: <p>A housing from the line, seen from the same viewpoint and orientation as the reference.</p>,
    finding: "Possible missing fastener.",
    findingDetail: "Position 3 shows an empty hole where the requirement expects a fastener.",
    next: <p><strong>Send for quality review.</strong> An inspector confirms the finding before the part is reworked or rejected.</p>,
    fasteners: "3 of 4 visible: position 3 is empty",
    shade: "Matches the reference",
    flag: "fasteners",
  },
  variation: {
    situation: <p>This housing’s surface is lighter than the reference.</p>,
    finding: "Allowed variation.",
    findingDetail: "The shade is within the approved range and all four fasteners are present. The difference is not a defect.",
    next: <p>No review needed. The housing continues to packaging.</p>,
    fasteners: "4 of 4 visible",
    shade: "Lighter than the reference, within range",
    flag: "shade",
  },
};

export function InspectProduct() {
  const [sample, setSample] = useState<SampleId>("missing");
  const [showFinding, setShowFinding] = useState(true);
  const story = SAMPLE_STORY[sample];
  const highlighted = showFinding ? story.flag : undefined;
  return (
    <Example
      title={`Final check before packaging, ${cell.product}`}
      situation={story.situation}
      finding={
        <button type="button" className={styles.findingButton} aria-pressed={showFinding} onClick={() => setShowFinding(!showFinding)}>
          <strong>{story.finding}</strong>
          <span>{story.findingDetail}</span>
          {story.flag && <span className={styles.findingAction}>{showFinding ? "Hide on the product" : "Show on the product"} <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" /></span>}
        </button>
      }
      next={story.next}
      boundary="One reference image is not enough for production use. A working inspection system needs representative samples, suitable cameras and lighting, and testing for both missed defects and false alarms."
    >
      <div className={styles.choices} role="group" aria-label="Choose an example">
        {SAMPLES.map((item) => (
          <button key={item.id} type="button" className={styles.choice} aria-pressed={sample === item.id} onClick={() => { setSample(item.id); setShowFinding(true); }}>{item.label}</button>
        ))}
      </div>
      <div className={styles.inspectGrid}>
        <SceneFrame
          shape="product"
          label={sample === "reference"
            ? "The approved reference housing, seen from above at an angle, with four fasteners numbered 1 to 4."
            : sample === "missing"
              ? "The approved reference beside an inspection sample, at the same viewpoint and orientation. The sample has an empty hole at fastener position 3."
              : "The approved reference beside an inspection sample with a lighter surface shade. Both have four fasteners."}
          fallback={<ProductSketch sample={sample} showFinding={showFinding} />}
          render={(onReady) => <ProductCanvas sample={sample} showFinding={showFinding} onReady={onReady} />}
        />
        <div className={styles.requirements} aria-live="polite">
          <p className={styles.sheetLabel}>Requirements</p>
          <dl>
            <div data-flag={highlighted === "fasteners"}>
              <dt>Four fasteners</dt>
              <dd>{story.fasteners}</dd>
            </div>
            <div data-flag={highlighted === "shade"}>
              <dt>Surface shade within the approved range</dt>
              <dd>{story.shade}</dd>
            </div>
          </dl>
        </div>
      </div>
    </Example>
  );
}

/* 2. Plan the production -------------------------------------------------- */

type SequenceKey = "urgentFirst" | "currentFirst";
const SEQUENCE_OPTIONS: { id: SequenceKey; name: string; title: string; detail: string }[] = [
  { id: "urgentFirst", name: "Sequence A", title: "Run the urgent order first", detail: "Requires an additional setup change." },
  { id: "currentFirst", name: "Sequence B", title: "Complete the current batch first", detail: "The urgent order starts later." },
];

const CHECKS = [
  { question: "Material available?", answer: "Yes, for all 120 units." },
  { question: "Suitable equipment available?", answer: "Yes. Cell 1 with fixture F2." },
  { question: "Setup change required?", answer: `Yes. F1 to F2, ${planning.setupMinutes} minutes.` },
  { question: "Which existing orders would move?", answer: "Depends on the sequence." },
];

const SHIFT_LENGTH = planning.shiftEnd - planning.shiftStart;
const HOURS = Array.from({ length: SHIFT_LENGTH / 60 + 1 }, (_, index) => planning.shiftStart + index * 60);
const currentPlan = buildPlan(sequences.current);
const orderBlock = (plan: PlanBlock[], order: OrderId) => plan.find((block): block is Extract<PlanBlock, { kind: "order" }> => block.kind === "order" && block.order === order);

function addedSetups(plan: PlanBlock[]) {
  const existing = currentPlan.filter((block) => block.kind === "setup").map((block) => (block.kind === "setup" ? `${block.from}-${block.to}` : ""));
  return new Set(plan.filter((block) => block.kind === "setup" && !existing.includes(`${block.from}-${block.to}`)).map((block) => block.start));
}

function describeShift(minutes: number) {
  const size = Math.abs(minutes);
  const amount = size % 60 === 0 ? `${size / 60} h` : `${size} min`;
  return minutes === 0 ? "No change" : `Starts ${amount} ${minutes > 0 ? "later" : "earlier"}`;
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
              <li key={`s${block.start}`} className={styles.block} data-kind="setup" data-added={isAdded} style={style} title={`Setup ${block.from} to ${block.to}, ${range(block.start, block.end)}`}>
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
  const setupCount = (blocks: PlanBlock[]) => blocks.filter((block) => block.kind === "setup").length;
  const orders: OrderId[] = ["1042", "1043", "1051"];
  return (
    <Example
      title="Urgent order for tomorrow’s shift, Cell 1"
      situation={<p>An urgent order for <strong>120 extended housings</strong> arrives for tomorrow’s {range(planning.shiftStart, planning.shiftEnd)} shift.</p>}
      findingLabel="Result for review"
      finding={<p><strong>Two sequences for the planner to compare.</strong> Neither is approved or automatically better.</p>}
      next={<p><strong>Review priorities and approve the schedule.</strong> Only the approved plan goes to the floor.</p>}
    >
      <div className={styles.request}>
        <div className={styles.ask}>
          <p className={styles.sheetLabel}>Planner’s question</p>
          <p className={styles.askText}>“Can we fit an urgent order into tomorrow’s shift?”</p>
          <p className={styles.interpreted}><span>Interpreted by the AI assistant</span>Order 1051 · 120 extended housings · Tomorrow, {range(planning.shiftStart, planning.shiftEnd)} · Cell 1</p>
        </div>
        <div className={styles.checks}>
          <p className={styles.sheetLabel}>What the scheduling tool checks</p>
          <dl>
            {CHECKS.map((check) => <div key={check.question}><dt>{check.question}</dt><dd>{check.answer}</dd></div>)}
          </dl>
        </div>
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
        <div className={styles.boardHead}>
          <p className={styles.boardTitle}>Tomorrow’s shift <span>Cell 1: {cell.assembly} Assembly → {cell.inspection} Inspection → {cell.packaging} Packaging</span></p>
          <p className={styles.status}>Proposed, not approved</p>
        </div>
        <div className={styles.axis} aria-hidden="true">
          {HOURS.map((hour) => <span key={hour} style={{ left: `${((hour - planning.shiftStart) / SHIFT_LENGTH) * 100}%` }}>{formatClock(hour)}</span>)}
        </div>
        <Lane title="Current plan" plan={currentPlan} />
        <Lane title={option.name} plan={plan} compare />
        <div className={styles.legend} aria-hidden="true">
          <span data-kind="setup">Setup change</span><span data-kind="added">Added setup</span><span data-kind="urgent">Urgent order</span><span data-kind="moved">Moved order</span>
        </div>
      </div>
      <div className={styles.impact} aria-live="polite">
        <table className={styles.table}>
          <caption>What {option.name} changes</caption>
          <thead><tr><th scope="col">Order</th><th scope="col">Current plan</th><th scope="col">{option.name}</th><th scope="col">Change</th></tr></thead>
          <tbody>
            {orders.map((order) => {
              const before = orderBlock(currentPlan, order);
              const after = orderBlock(plan, order);
              const shift = before && after ? after.start - before.start : 0;
              return (
                <tr key={order} data-changed={!before || shift !== 0}>
                  <th scope="row">{order}<span>{planning.orders[order].product}, {planning.orders[order].units} units</span></th>
                  <td data-label="Current plan">{before ? range(before.start, before.end) : "Not planned"}</td>
                  <td data-label={option.name}>{after ? range(after.start, after.end) : "Not planned"}</td>
                  <td data-label="Change">{before ? describeShift(shift) : "Added"}</td>
                </tr>
              );
            })}
            <tr data-changed={setupCount(plan) !== setupCount(currentPlan)}>
              <th scope="row">Setup changes<span>{planning.setupMinutes} minutes each</span></th>
              <td data-label="Current plan">{setupCount(currentPlan)}</td>
              <td data-label={option.name}>{setupCount(plan)}</td>
              <td data-label="Change">{setupCount(plan) === setupCount(currentPlan) ? "No change" : `${setupCount(plan) - setupCount(currentPlan)} more`}</td>
            </tr>
          </tbody>
        </table>
        <p className={styles.assumptions}>
          Assumptions: Cell 1 completes {planning.ratePerHour} housings an hour for either variant, set by the single inspection station in the simulation below. Each fixture change takes {planning.setupMinutes} minutes. Breaks are not modeled.
        </p>
      </div>
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
const lastSteadyDay = driveHistory.changeDay - 1;

const SOURCES: { id: SourceId; title: string; reference: string; excerpt: string[] }[] = [
  {
    id: "signals",
    title: "Temperature and load history",
    reference: `Sensor log, ${cell.drive}, daily averages during operating hours`,
    excerpt: [
      `Day ${lastSteadyDay}: ${driveHistory.temperature[lastSteadyDay - 1]} °C at ${driveHistory.load[lastSteadyDay - 1]}% of rated load.`,
      `Day ${driveHistory.changeDay}: ${driveHistory.temperature[driveHistory.changeDay - 1]} °C at ${driveHistory.load[driveHistory.changeDay - 1]}% of rated load.`,
      `Day ${days}: ${driveHistory.temperature[days - 1]} °C at ${driveHistory.load[days - 1]}% of rated load.`,
    ],
  },
  {
    id: "manual",
    title: "Equipment documentation",
    reference: `${cell.drive} drive manual, section 4.3: operating limits`,
    excerpt: [
      "Permissible housing temperature depends on load and ambient temperature.",
      "Compare readings with Table 4-2 for the installed duty class before continued operation at a higher load.",
    ],
  },
  {
    id: "record",
    title: "Previous maintenance record",
    reference: "Work order WO-2318, scheduled service, 14 weeks ago",
    excerpt: [
      "Gearbox oil level checked and topped up. Coupling inspected; no wear noted.",
      "No temperature or load readings were recorded during the service.",
    ],
  },
];

const EXPLANATIONS: { id: ExplanationId; title: string; text: string; relies: SourceId[]; charts: ("temperature" | "load")[]; confirms: number[] }[] = [
  { id: "load", title: "The drive is working harder", text: "Higher production load may explain the higher temperature. Both changed on day 8.", relies: ["signals", "manual"], charts: ["temperature", "load"], confirms: [0, 1] },
  { id: "condition", title: "Something changed inside the drive", text: "Lubrication or mechanical condition may have changed since the last service. No earlier readings exist to compare.", relies: ["signals", "record"], charts: ["temperature"], confirms: [2] },
];

const NEXT_CHECKS = ["Review applicable operating limits.", "Compare with previous operation under similar load.", "Technician confirms the next inspection."];

const CHART_WIDTH = 520;
const CHART_HEIGHT = 110;
const dayX = (day: number) => 8 + ((day - 1) / (days - 1)) * (CHART_WIDTH - 16);
const KEY_DAYS = new Set([1, 4, driveHistory.changeDay, 11, days]);

function SignalChart({ label, unit, values, low, high, emphasis }: { label: string; unit: string; values: number[]; low: number; high: number; emphasis: boolean }) {
  const y = (value: number) => 10 + (1 - (value - low) / (high - low)) * (CHART_HEIGHT - 20);
  const points = values.map((value, index) => `${dayX(index + 1).toFixed(1)},${y(value).toFixed(1)}`).join(" ");
  const summary = unit === "°C" ? `averaging ${tempBefore} °C before day ${driveHistory.changeDay} and ${tempAfter} °C after` : `averaging ${loadBefore}% before day ${driveHistory.changeDay} and ${loadAfter}% after`;
  return (
    <div className={styles.chart} data-emphasis={emphasis}>
      <p className={styles.chartLabel}>{label}</p>
      <div className={styles.chartBody}>
        <div className={styles.chartTicks} aria-hidden="true">
          {[high, low].map((tick) => <span key={tick} style={{ top: `${(y(tick) / CHART_HEIGHT) * 100}%` }}>{tick}{unit === "°C" ? " °C" : "%"}</span>)}
        </div>
        <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} role="img" aria-label={`${label}, days 1–${days}, ${summary}.`}>
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

const INVESTIGATION_TIME = 330;

function CellSketch({ configuration, time, focusDrive }: { configuration: Configuration; time: number; focusDrive?: boolean }) {
  const scale = 48;
  const px = (x: number) => (x + 6.4) * scale;
  const pz = (z: number) => (z + 3.2) * scale;
  const proposed = configuration === "proposed";
  const poses = partPoses(runs[configuration], time).filter((pose) => pose.visible);
  const conveyor = (x1: number, z1: number, x2: number, z2: number, key: string, accent = false) => (
    <line key={key} x1={px(x1)} y1={pz(z1)} x2={px(x2)} y2={pz(z2)} stroke={accent ? "#007dfe" : "#9a9d9f"} strokeWidth={18} />
  );
  return (
    <svg viewBox={`0 0 ${12.8 * scale} ${5.6 * scale}`} className={styles.sketch}>
      <rect x={px(-6.15)} y={pz(-3)} width={12.3 * scale} height={4.95 * scale} fill="none" stroke="#fed603" strokeWidth={2} />
      {conveyor(-4.85, 0, 4.85, 0, "main")}
      {proposed && [conveyor(-1.4, 0, -1.4, -2.2, "a", true), conveyor(-1.4, -2.2, 1.4, -2.2, "b", true), conveyor(1.4, -2.2, 1.4, 0, "c", true)]}
      <rect x={px(-5.9)} y={pz(-0.47)} width={1.05 * scale} height={0.95 * scale} fill="#dcdcd9" stroke="#262829" />
      <rect x={px(-0.7)} y={pz(-0.44)} width={1.4 * scale} height={0.88 * scale} fill="none" stroke="#262829" strokeWidth={2.5} />
      {proposed && <rect x={px(-0.7)} y={pz(-2.64)} width={1.4 * scale} height={0.88 * scale} fill="none" stroke="#007dfe" strokeWidth={2.5} />}
      <rect x={px(4.95)} y={pz(-0.47)} width={0.9 * scale} height={0.95 * scale} fill="#dcdcd9" stroke="#262829" />
      <rect x={px(4.95)} y={pz(0.84)} width={1.0 * scale} height={0.82 * scale} fill="#d3c8b2" stroke="#262829" />
      <rect x={px(layout.drive[0] - 0.12)} y={pz(0.24)} width={0.24 * scale} height={0.5 * scale} fill={focusDrive ? "#fed603" : "#7b8288"} stroke="#262829" strokeWidth={focusDrive ? 2.5 : 1} />
      {poses.map((pose) => <rect key={pose.id} x={px(pose.x) - 8.5} y={pz(pose.z) - 6.5} width={17} height={13} rx={3} fill="#8a9399" stroke="#262829" />)}
      <text x={px(-5.9)} y={pz(-0.7)} textAnchor="start" className={styles.sketchText}>{cell.assembly} Assembly</text>
      <text x={px(0)} y={pz(-0.66)} textAnchor="middle" className={styles.sketchText}>{cell.inspection} Inspection</text>
      {proposed && <text x={px(0)} y={pz(-2.86)} textAnchor="middle" className={styles.sketchText}>{cell.proposedInspection} Inspection, proposed</text>}
      <text x={px(5.85)} y={pz(-0.7)} textAnchor="end" className={styles.sketchText}>{cell.packaging} Packaging</text>
      <text x={px(layout.drive[0] - 0.2)} y={pz(0.62)} textAnchor="end" className={styles.sketchText}>{cell.drive}</text>
    </svg>
  );
}

export function InvestigateProblem() {
  const [explanation, setExplanation] = useState<ExplanationId>("load");
  const [source, setSource] = useState<SourceId>("signals");
  const [userView, setUserView] = useState<CellView | null>(null);
  const reducedMotion = useReducedMotion();
  const frame = useRef<HTMLDivElement>(null);
  const seen = useInView(frame, "0px", 0.45);
  const view: CellView = userView ?? (seen || reducedMotion ? "drive" : "cell");
  const clock = useRef(INVESTIGATION_TIME);
  const selected = EXPLANATIONS.find((item) => item.id === explanation) ?? EXPLANATIONS[0];
  const opened = SOURCES.find((item) => item.id === source) ?? SOURCES[0];
  return (
    <Example
      title={`Conveyor drive ${cell.drive}, Cell 1`}
      situation={<p><strong>Operating temperature has increased</strong> on {cell.drive}, which drives the main conveyor into packaging.</p>}
      finding={<p><strong>A supported investigation, with open questions.</strong> No cause is confirmed.</p>}
      next={<p>The maintenance lead decides what to inspect, following the approved procedure.</p>}
      boundary="A temperature rise alone does not show that a component is failing. Predictive maintenance needs suitable sensors, historical data, and validated diagnostics. The assistant does not control the machine or replace approved procedures."
    >
      <div className={styles.investigateTop}>
        <div ref={frame} className={styles.driveView}>
          <SceneFrame
            shape="detail"
            label={view === "drive"
              ? `Close view of conveyor drive ${cell.drive}: a gear motor bolted to the conveyor frame beside packaging station ${cell.packaging}, highlighted.`
              : `The production cell: assembly ${cell.assembly}, inspection ${cell.inspection}, and packaging ${cell.packaging} along one conveyor, with drive ${cell.drive} highlighted at the packaging end.`}
            fallback={<CellSketch configuration="existing" time={INVESTIGATION_TIME} focusDrive />}
            render={(onReady) => <CellCanvas configuration="existing" clock={clock} time={INVESTIGATION_TIME} animating={false} view={view} instant={reducedMotion} focusDrive onReady={onReady} />}
          >
            <div className={styles.viewSwitch} data-overlay="true" role="group" aria-label="Viewpoint">
              <button type="button" aria-pressed={view === "cell"} onClick={() => setUserView("cell")}>Cell</button>
              <button type="button" aria-pressed={view === "drive"} onClick={() => setUserView("drive")}>Drive {cell.drive}</button>
            </div>
          </SceneFrame>
        </div>
        <div className={styles.signals}>
          <p className={styles.sheetLabel}>Operating signals, same {days} days</p>
          <SignalChart label="Drive temperature" unit="°C" values={driveHistory.temperature} low={44} high={58} emphasis={selected.charts.includes("temperature")} />
          <SignalChart label="Motor load, % of rated" unit="%" values={driveHistory.load} low={50} high={85} emphasis={selected.charts.includes("load")} />
          <DayAxis />
          <p className={styles.chartNote}><span aria-hidden="true" />Production load also changed during this period, from day {driveHistory.changeDay}.</p>
        </div>
      </div>
      <div className={styles.reasoning}>
        <div className={styles.column} data-kind="observed">
          <p className={styles.columnLabel}>Observed</p>
          <ul>
            <li>Drive temperature averaged {tempBefore} °C on days 1–{lastSteadyDay} and {tempAfter} °C on days {driveHistory.changeDay}–{days}.</li>
            <li>Motor load averaged {loadBefore}% of rated before day {driveHistory.changeDay} and {loadAfter}% after.</li>
            <li>The last service recorded no temperature or load readings.</li>
          </ul>
        </div>
        <div className={styles.column} data-kind="possible">
          <p className={styles.columnLabel}>Possible explanation</p>
          <div className={styles.explanations} role="group" aria-label="Possible explanations">
            {EXPLANATIONS.map((item) => (
              <button key={item.id} type="button" className={styles.explanation} aria-pressed={explanation === item.id} onClick={() => setExplanation(item.id)}>
                <strong>{item.title}</strong>
                <span>{item.text}</span>
              </button>
            ))}
          </div>
          <p className={styles.summary}><span>Assistant’s summary</span>The temperature change coincides with a change in load. More information is needed to determine the cause.</p>
        </div>
        <div className={styles.column} data-kind="confirm">
          <p className={styles.columnLabel}>Needs confirmation</p>
          <ol>
            {NEXT_CHECKS.map((check, index) => <li key={check} data-related={selected.confirms.includes(index)}>{check}</li>)}
          </ol>
        </div>
      </div>
      <div className={styles.evidence}>
        <div className={styles.sourceTabs} role="group" aria-label="Evidence sources">
          {SOURCES.map((item) => (
            <button key={item.id} type="button" className={styles.source} aria-pressed={source === item.id} data-relied={selected.relies.includes(item.id)} onClick={() => setSource(item.id)}>
              <span className={styles.sourceTitle}>{item.title}</span>
              {selected.relies.includes(item.id) && <span className={styles.srOnly}>, cited by the selected explanation</span>}
            </button>
          ))}
        </div>
        <div className={styles.excerpt} aria-live="polite">
          <p className={styles.excerptTitle}>{opened.reference}<span>Fictional example material</span></p>
          <ul>{opened.excerpt.map((line) => <li key={line}>{line}</li>)}</ul>
        </div>
      </div>
    </Example>
  );
}

/* 4. Test the change ------------------------------------------------------ */

const RUN = simulation.runSeconds;
const PLAYBACK_SPEED = 15;
const percent = (value: number) => `${Math.round(value * 100)}%`;
const formatSim = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
const stageName: Record<RunSummary["limitingStage"], string> = { assembly: `Assembly (${cell.assembly})`, inspection: "Inspection", packaging: `Packaging (${cell.packaging})` };
const bottleneckMoved = summaries.existing.limitingStage === "inspection" && summaries.proposed.limitingStage === "assembly";

const EXPERIMENT = ["Add one parallel inspection station.", "Keep assembly and packaging unchanged.", "Keep processing times unchanged.", "Assume the additional station is staffed."];
const ASSUMPTIONS = [
  `Assembly takes ${simulation.assemblySeconds} s per housing at one station.`,
  `Inspection takes ${simulation.inspectionSeconds} s per housing at each station, including moving through the booth.`,
  `Packaging takes ${simulation.packagingSeconds} s per housing at one station.`,
  `The conveyor runs at ${simulation.conveyorSpeed * 60} m a minute and holds up to ${simulation.bufferCapacity} housings before inspection. When it is full, assembly holds the finished housing.`,
  "Parts queue first in, first out and go to whichever inspection station can start them sooner.",
  `The line starts empty and runs for ${RUN / 60} simulated minutes. Components are always available.`,
];
const STEPS = ["Review assumptions", "Run illustrative scenario", "Compare results"];

export function TestChange() {
  const reducedMotion = useReducedMotion();
  const [configuration, setConfiguration] = useState<Configuration>("existing");
  const [time, setTime] = useState(RUN);
  const [playing, setPlaying] = useState(false);
  const [step, setStep] = useState(0);
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
        setStep((current) => (current === 1 ? 2 : current));
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
  function choose(next: Configuration) {
    touched.current = true;
    setConfiguration(next);
  }
  function goTo(index: number) {
    touched.current = true;
    setStep(index);
    if (index === 0) { setPlaying(false); setConfiguration("existing"); seek(RUN); }
    if (index === 1) { setConfiguration("proposed"); seek(0); setPlaying(true); }
    if (index === 2) { setPlaying(false); seek(RUN); }
  }

  const status = cellStatus(runs[configuration], time);
  const proposed = configuration === "proposed";
  return (
    <Example
      title="Second inspection station, Cell 1"
      situation={<p>Parts accumulate before inspection. {cell.inspection} is busy {percent(summaries.existing.inspectionBusy)} of the run, and assembly holds finished parts {percent(summaries.existing.assemblyBlocked)} of the time.</p>}
      findingLabel="Result for review"
      finding={bottleneckMoved
        ? <p><strong>Inspection can accept more work. Assembly now limits the line.</strong> {cell.assembly} is busy {percent(summaries.proposed.assemblyBusy)} of the run; the inspection stations average {percent(summaries.proposed.inspectionBusy)}.</p>
        : <p><strong>The change does not move the limit.</strong> {stageName[summaries.proposed.limitingStage]} still sets the pace.</p>}
      next={<p>Engineers validate with calibrated process data before committing to an investment.</p>}
      boundary="Illustrative simulation using simplified assumptions. It is not a validated model of a real factory or a live digital twin, and it is not connected to any equipment. A production engagement requires calibrated process data, suitable simulation technology, and engineering validation."
    >
      <div className={styles.experiment}>
        <div className={styles.ask}>
          <p className={styles.sheetLabel}>Engineer’s question</p>
          <p className={styles.askText}>“What happens if we add a second inspection station?”</p>
        </div>
        <div className={styles.proposal}>
          <p className={styles.sheetLabel}>Proposed experiment, drafted by the assistant for review</p>
          <ul>{EXPERIMENT.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
      </div>
      <ol className={styles.steps}>
        {STEPS.map((label, index) => (
          <li key={label}>
            <button type="button" aria-current={step === index ? "step" : undefined} onClick={() => goTo(index)}>
              <span>{String(index + 1).padStart(2, "0")}</span>{label}
            </button>
          </li>
        ))}
      </ol>
      <div ref={section} className={styles.simulation}>
        <div className={styles.simControls}>
          <div className={styles.viewSwitch} role="group" aria-label="Configuration">
            <button type="button" aria-pressed={!proposed} onClick={() => choose("existing")}>Existing line</button>
            <button type="button" aria-pressed={proposed} onClick={() => choose("proposed")}>With proposed {cell.proposedInspection}</button>
          </div>
          <div className={styles.playback}>
            <button type="button" className={styles.iconButton} onClick={() => (playing ? setPlaying(false) : play())} aria-label={playing ? "Pause" : time >= RUN ? "Replay" : "Play"}>
              {playing ? <Pause size={16} strokeWidth={1.5} /> : <Play size={16} strokeWidth={1.5} />}
            </button>
            <button type="button" className={styles.iconButton} onClick={() => { seek(0); setPlaying(true); }} aria-label="Replay from the start"><RotateCcw size={16} strokeWidth={1.5} /></button>
            <button type="button" className={styles.iconButton} onClick={() => { setPlaying(false); seek(clock.current + simulation.inspectionSeconds); }} aria-label={`Step forward ${simulation.inspectionSeconds} simulated seconds`}><StepForward size={16} strokeWidth={1.5} /></button>
            <label className={styles.scrubber}>
              <span className={styles.srOnly}>Simulated time</span>
              <input type="range" min={0} max={RUN} step={1} value={Math.round(time)} onChange={(event) => { setPlaying(false); seek(Number(event.target.value)); }} />
            </label>
            <span className={styles.clock}>{formatSim(time)} / {formatSim(RUN)}</span>
          </div>
        </div>
        <SceneFrame
          shape="wide"
          label={`${proposed ? "Proposed configuration" : "Existing line"} at ${formatSim(time)} simulated time: ${status.waitingForInspection} housings waiting before inspection, ${status.packaged} packaged. Assembly is ${status.assembly === "blocked" ? "holding a finished part because the conveyor is full" : "assembling"}.`}
          fallback={<CellSketch configuration={configuration} time={time} />}
          render={(onReady) => <CellCanvas configuration={configuration} clock={clock} time={time} animating={running} view="cell" instant showStatus onReady={onReady} />}
        />
        <p className={styles.simStatus}>
          <span><strong>{status.waitingForInspection}</strong> waiting before inspection</span>
          <span><strong>{status.packaged}</strong> packaged</span>
          <span data-alert={status.assembly === "blocked"}>{cell.assembly} {status.assembly === "blocked" ? "holding a part" : "assembling"}</span>
          <span className={styles.simNote}>Playback runs at {PLAYBACK_SPEED}× in both configurations. Compare the calculated results, not the animation.</span>
        </p>
      </div>
      <div className={styles.results} data-active={step === 2}>
        <div className={styles.assumptionList} data-active={step === 0}>
          <p className={styles.sheetLabel}>Shared assumptions, identical in both configurations</p>
          <ul>{ASSUMPTIONS.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
        <table className={styles.table}>
          <caption>Calculated over {RUN / 60} simulated minutes</caption>
          <thead><tr><th scope="col">Measure</th><th scope="col">Existing line</th><th scope="col">With {cell.proposedInspection}</th></tr></thead>
          <tbody>
            <tr><th scope="row">Housings packaged</th><td>{summaries.existing.packaged}</td><td>{summaries.proposed.packaged}</td></tr>
            <tr><th scope="row">Average wait before inspection<span>Time standing still, not travel</span></th><td>{Math.round(summaries.existing.averageWait)} s</td><td>{Math.round(summaries.proposed.averageWait)} s</td></tr>
            <tr><th scope="row">Most housings waiting at once</th><td>{summaries.existing.mostWaiting}</td><td>{summaries.proposed.mostWaiting}</td></tr>
            <tr><th scope="row">{cell.assembly} holding finished parts</th><td>{percent(summaries.existing.assemblyBlocked)}</td><td>{percent(summaries.proposed.assemblyBlocked)}</td></tr>
            <tr><th scope="row">Busy share: assembly</th><td>{percent(summaries.existing.assemblyBusy)}</td><td>{percent(summaries.proposed.assemblyBusy)}</td></tr>
            <tr><th scope="row">Busy share: inspection<span>Average per station</span></th><td>{percent(summaries.existing.inspectionBusy)}</td><td>{percent(summaries.proposed.inspectionBusy)}</td></tr>
            <tr><th scope="row">Busy share: packaging</th><td>{percent(summaries.existing.packagingBusy)}</td><td>{percent(summaries.proposed.packagingBusy)}</td></tr>
            <tr data-changed="true"><th scope="row">Stage that limits the line<span>Highest busy share</span></th><td>{stageName[summaries.existing.limitingStage]}</td><td>{stageName[summaries.proposed.limitingStage]}</td></tr>
          </tbody>
        </table>
      </div>
    </Example>
  );
}
