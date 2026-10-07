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

function useInView(target: RefObject<HTMLElement | null>, rootMargin: string, threshold = 0) {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const element = target.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setSeen(true);
        observer.disconnect();
      }
    }, { rootMargin, threshold });
    observer.observe(element);
    return () => observer.disconnect();
  }, [target, rootMargin, threshold]);
  return seen;
}

// The SVG fallback is always rendered first; the WebGL scene is fetched only
// when the frame nears the viewport and covers the fallback once it has drawn.
function SceneFrame({ label, fallback, shape, render }: { label: string; fallback: ReactNode; shape: "wide" | "product" | "detail"; render: (onReady: () => void) => ReactNode }) {
  const frame = useRef<HTMLDivElement>(null);
  const near = useInView(frame, "600px 0px");
  const webgl = useSyncExternalStore(subscribeToNothing, detectWebGL, () => false);
  const [ready, setReady] = useState(false);
  return (
    <div ref={frame} className={styles.scene} data-shape={shape} role="img" aria-label={label}>
      <div className={styles.sceneFallback}>{fallback}</div>
      {near && webgl && <div className={styles.sceneLayer} data-ready={ready}>{render(() => setReady(true))}</div>}
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
        <span className={styles.exampleNote}>Fictional production cell, not a live feed or customer record</span>
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

/* 1. Inspect the product -------------------------------------------------- */

const SAMPLES: { id: SampleId; label: string }[] = [
  { id: "reference", label: "Reference product" },
  { id: "missing", label: "Missing-fastener example" },
  { id: "variation", label: "Allowed-variation example" },
];

const SPOTS = [[-0.135, 0.098], [0.135, 0.098], [0.135, -0.098], [-0.135, -0.098]];

function HousingSketch({ x, variant, missing, ring, outline }: { x: number; variant?: boolean; missing?: boolean; ring?: string; outline?: string }) {
  const scale = 520;
  return (
    <g transform={`translate(${x} 150)`}>
      <rect x={-125} y={-104} width={250} height={208} rx={8} fill="#fff" />
      <rect x={-0.176 * scale} y={-0.136 * scale} width={0.352 * scale} height={0.272 * scale} rx={22} fill={variant ? "#b2a78f" : "#8e979d"} stroke="#262829" strokeWidth={1.5} />
      {outline && <rect x={-0.176 * scale - 8} y={-0.136 * scale - 8} width={0.352 * scale + 16} height={0.272 * scale + 16} rx={28} fill="none" stroke={outline} strokeWidth={4} />}
      <rect x={-0.103 * scale} y={-0.073 * scale} width={0.206 * scale} height={0.146 * scale} rx={14} fill={variant ? "#bbb099" : "#99a2a8"} stroke="#4a4f54" />
      <circle r={14} fill="#33373a" />
      {SPOTS.map(([sx, sz], index) => {
        const empty = missing && index === 2;
        return (
          <g key={index} transform={`translate(${sx * scale} ${-sz * scale})`}>
            <circle r={10} fill="#5f656a" />
            {empty ? <circle r={4.5} fill="#0e0f10" /> : <><circle r={8.5} fill="#c3c7ca" stroke="#5f656a" /><path d="M-5 -5 L5 5 M5 -5 L-5 5" stroke="#2a2c2e" strokeWidth={1.4} /></>}
            {ring && index === 2 && <circle r={17} fill="none" stroke={ring} strokeWidth={4} />}
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
      <HousingSketch x={pair ? 160 : 300} ring={sample === "missing" && showFinding ? "#007dfe" : undefined} outline={sample === "variation" && showFinding ? "#007dfe" : undefined} />
      <text x={pair ? 160 : 300} y={280} textAnchor="middle" className={styles.sketchText}>Approved reference</text>
      {pair && (
        <>
          <HousingSketch x={440} variant={sample === "variation"} missing={sample === "missing"} ring={sample === "missing" && showFinding ? "#fed603" : undefined} outline={sample === "variation" && showFinding ? "#fed603" : undefined} />
          <text x={440} y={280} textAnchor="middle" className={styles.sketchText}>Inspection sample</text>
        </>
      )}
    </svg>
  );
}

const SAMPLE_STORY: Record<SampleId, { situation: ReactNode; finding: string; findingDetail: string; next: ReactNode; fasteners: string; shade: string; flag?: "fasteners" | "shade"; tone: "pass" | "review" | "allowed" }> = {
  reference: {
    situation: <p>The approved reference shows what a correct <strong>{cell.product}</strong> looks like from the inspection camera.</p>,
    finding: "Four fasteners, positions 1 to 4.",
    findingDetail: "The reference and the written requirements define what the check looks for.",
    next: <p>Collect approved examples and known defects from real production to set up and test the check.</p>,
    fasteners: "4 of 4 visible",
    shade: "Reference shade",
    tone: "pass",
  },
  missing: {
    situation: <p>A housing from the line is compared with the approved reference from the same viewpoint and orientation.</p>,
    finding: "Possible missing fastener.",
    findingDetail: "Position 3 shows an empty hole where the requirement expects a fastener.",
    next: <p><strong>Send for quality review.</strong> An inspector confirms the finding before the part is reworked or rejected.</p>,
    fasteners: "3 of 4 visible, position 3 empty",
    shade: "Matches the reference",
    flag: "fasteners",
    tone: "review",
  },
  variation: {
    situation: <p>A housing with a lighter surface shade arrives. The shade differs from the reference.</p>,
    finding: "Allowed variation.",
    findingDetail: "The shade is inside the range the quality criteria permit, and all four fasteners are present. This difference is not a defect.",
    next: <p>No review needed for this difference. The housing continues to packaging.</p>,
    fasteners: "4 of 4 visible",
    shade: "Lighter than the reference, inside the approved range",
    flag: "shade",
    tone: "allowed",
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
          <span className={styles.findingAction}>{showFinding ? "Hide on the product" : "Show on the product"} <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" /></span>
        </button>
      }
      next={story.next}
      boundary="A single reference image is not enough for production use. A working inspection system needs representative samples, suitable cameras and lighting, and testing for both missed defects and false alarms."
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
              ? "The approved reference beside an inspection sample, same viewpoint and orientation. The sample has an empty hole at fastener position 3."
              : "The approved reference beside an inspection sample with a lighter surface shade. Both have four fasteners."}
          fallback={<ProductSketch sample={sample} showFinding={showFinding} />}
          render={(onReady) => <ProductCanvas sample={sample} showFinding={showFinding} onReady={onReady} />}
        />
        <div className={styles.requirements} aria-live="polite">
          <p className={styles.sheetLabel}>Product requirements, example</p>
          <dl>
            <div data-flag={highlighted === "fasteners"}>
              <dt>Required: four fasteners</dt>
              <dd>{story.fasteners}</dd>
            </div>
            <div data-flag={highlighted === "shade"}>
              <dt>Surface shade inside the approved range</dt>
              <dd>{story.shade}</dd>
            </div>
          </dl>
          <p className={styles.verdict} data-tone={story.tone}>
            {story.tone === "review" ? "Flagged for quality review" : story.tone === "allowed" ? "Recorded as allowed variation" : "Reference for the check"}
          </p>
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
  { question: "Material available?", answer: "Yes. Housings and fasteners for 120 units are in stock." },
  { question: "Suitable equipment available?", answer: "Yes. Cell 1 with assembly fixture F2." },
  { question: "Setup change required?", answer: `Yes. Fixture F1 to F2, ${planning.setupMinutes} minutes.` },
  { question: "Which existing orders would move?", answer: "Depends on the sequence. Compare below." },
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
    <div className={styles.lane}>
      <p className={styles.laneTitle}>{title}</p>
      <ol className={styles.laneTrack}>
        {plan.map((block) => {
          const style = { left: `${((block.start - planning.shiftStart) / SHIFT_LENGTH) * 100}%`, width: `${((block.end - block.start) / SHIFT_LENGTH) * 100}%` };
          if (block.kind === "setup") {
            const isAdded = added.has(block.start);
            return (
              <li key={`s${block.start}`} className={styles.block} data-kind="setup" data-added={isAdded} style={style}>
                <span className={styles.blockName}>Setup</span>
                <span className={styles.blockMeta}>{block.from} to {block.to}{isAdded ? ", added" : ""}</span>
              </li>
            );
          }
          const before = orderBlock(currentPlan, block.order);
          const moved = compare && before && before.start !== block.start;
          return (
            <li key={block.order} className={styles.block} data-kind={block.order === "1051" ? "urgent" : "order"} data-moved={Boolean(moved)} style={style}>
              <span className={styles.blockName}>{block.order}</span>
              <span className={styles.blockMeta}>{formatClock(block.start)} to {formatClock(block.end)}</span>
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
  const urgent = orderBlock(plan, "1051");
  const orders: OrderId[] = ["1042", "1043", "1051"];
  return (
    <Example
      title="Urgent order for tomorrow's shift, Cell 1"
      situation={<p>An urgent order for <strong>120 extended housings</strong> arrives for tomorrow&apos;s {formatClock(planning.shiftStart)} to {formatClock(planning.shiftEnd)} shift.</p>}
      findingLabel="Recommendation for review"
      finding={<p><strong>Two sequences for the planner to compare.</strong> Neither is approved, and neither is automatically better.</p>}
      next={<p><strong>Review priorities and approve the schedule.</strong> Only the approved plan goes to the floor.</p>}
    >
      <div className={styles.request}>
        <div className={styles.ask}>
          <p className={styles.sheetLabel}>Planner&apos;s question</p>
          <p className={styles.askText}>&ldquo;Can we fit an urgent order into tomorrow&apos;s shift?&rdquo;</p>
          <p className={styles.sheetLabel}>Interpreted by the AI assistant</p>
          <ul className={styles.tokens}>
            <li>Order 1051</li><li>120 extended housings</li><li>Tomorrow, {formatClock(planning.shiftStart)} to {formatClock(planning.shiftEnd)}</li><li>Cell 1</li>
          </ul>
        </div>
        <div className={styles.checks}>
          <p className={styles.sheetLabel}>Information the scheduling tool needs</p>
          <ul>
            {CHECKS.map((check) => <li key={check.question}><strong>{check.question}</strong><span>{check.answer}</span></li>)}
          </ul>
        </div>
      </div>
      <div className={styles.cellStrip}>
        <span>Cell 1</span>
        <ol><li>{cell.assembly} Assembly</li><li>{cell.inspection} Inspection</li><li>{cell.packaging} Packaging</li></ol>
        <span className={styles.cellStripNote}>Same cell as the other examples on this page</span>
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
          <p className={styles.sheetLabel}>Tomorrow&apos;s shift, Cell 1</p>
          <span className={styles.status}>Proposed by the scheduling tool, not approved</span>
        </div>
        <div className={styles.axis} aria-hidden="true">
          {HOURS.map((hour) => <span key={hour} style={{ left: `${((hour - planning.shiftStart) / SHIFT_LENGTH) * 100}%` }}>{formatClock(hour)}</span>)}
        </div>
        <Lane title="Current plan" plan={currentPlan} />
        <Lane title={`${option.name}: ${option.title.toLowerCase()}`} plan={plan} compare />
        <div className={styles.legend} aria-hidden="true">
          <span data-kind="urgent">Urgent order</span><span data-kind="moved">Moved order</span><span data-kind="added">Added setup</span>
        </div>
      </div>
      <div className={styles.impact} aria-live="polite">
        <table className={styles.table}>
          <caption className={styles.sheetLabel}>What {option.name} changes</caption>
          <thead><tr><th scope="col">Order</th><th scope="col">Current plan</th><th scope="col">{option.name}</th><th scope="col">Change</th></tr></thead>
          <tbody>
            {orders.map((order) => {
              const before = orderBlock(currentPlan, order);
              const after = orderBlock(plan, order);
              const shift = before && after ? after.start - before.start : 0;
              return (
                <tr key={order} data-changed={!before || shift !== 0}>
                  <th scope="row">{order}<span>{planning.orders[order].product}, {planning.orders[order].units} units</span></th>
                  <td>{before ? `${formatClock(before.start)} to ${formatClock(before.end)}` : "Not planned"}</td>
                  <td>{after ? `${formatClock(after.start)} to ${formatClock(after.end)}` : "Not planned"}</td>
                  <td>{before ? describeShift(shift) : "Added"}</td>
                </tr>
              );
            })}
            <tr data-changed={setupCount(plan) !== setupCount(currentPlan)}>
              <th scope="row">Setup changes<span>{planning.setupMinutes} minutes each</span></th>
              <td>{setupCount(currentPlan)}</td>
              <td>{setupCount(plan)}</td>
              <td>{setupCount(plan) === setupCount(currentPlan) ? "No change" : `${setupCount(plan) - setupCount(currentPlan)} more`}</td>
            </tr>
          </tbody>
        </table>
        <p className={styles.assumptions}>
          Example assumptions: the cell completes {planning.ratePerHour} housings per hour for either variant, limited by the single inspection station in the simulation below. Each fixture change takes {planning.setupMinutes} minutes. Breaks are not modeled. Order 1051 finishes at {urgent ? formatClock(urgent.end) : "n/a"} in {option.name}.
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
const round = (value: number) => Math.round(value);
const tempBefore = round(averageOf(before(driveHistory.temperature)));
const tempAfter = round(averageOf(after(driveHistory.temperature)));
const loadBefore = round(averageOf(before(driveHistory.load)));
const loadAfter = round(averageOf(after(driveHistory.load)));
const lastSteadyDay = driveHistory.changeDay - 1;

const SOURCES: { id: SourceId; title: string; reference: string; excerpt: string[] }[] = [
  {
    id: "signals",
    title: "Temperature and operating-load history",
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
    reference: `${cell.drive} drive manual, section 4.3, operating limits`,
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
      "Gearbox oil level checked and topped up. Coupling inspected, no wear noted.",
      "No temperature or load readings were recorded during the service.",
    ],
  },
];

const EXPLANATIONS: { id: ExplanationId; title: string; text: string; relies: SourceId[]; charts: ("temperature" | "load")[]; confirms: number[] }[] = [
  { id: "load", title: "The drive is working harder", text: "Higher production load may account for the higher temperature. Both changed on the same day.", relies: ["signals", "manual"], charts: ["temperature", "load"], confirms: [0, 1] },
  { id: "condition", title: "Something changed inside the drive", text: "Lubrication or mechanical condition may have changed since the last service. The record has no readings to compare.", relies: ["signals", "record"], charts: ["temperature"], confirms: [2] },
];

const NEXT_CHECKS = ["Review applicable operating limits.", "Compare with previous operation under similar load.", "Technician confirms the next inspection."];

const CHART_WIDTH = 560;
const CHART_LEFT = 46;
const CHART_RIGHT = 10;
const dayX = (day: number) => CHART_LEFT + ((day - 1) / (days - 1)) * (CHART_WIDTH - CHART_LEFT - CHART_RIGHT);

function SignalChart({ label, unit, values, low, high, emphasis }: { label: string; unit: string; values: number[]; low: number; high: number; emphasis: boolean }) {
  const width = CHART_WIDTH;
  const height = 96;
  const right = CHART_RIGHT;
  const left = CHART_LEFT;
  const x = dayX;
  const y = (value: number) => 10 + (1 - (value - low) / (high - low)) * (height - 20);
  const points = values.map((value, index) => `${x(index + 1).toFixed(1)},${y(value).toFixed(1)}`).join(" ");
  return (
    <div className={styles.chart} data-emphasis={emphasis}>
      <p className={styles.chartLabel}>{label}</p>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${label}, days 1 to ${days}. Average ${unit === "°C" ? `${tempBefore} °C before day ${driveHistory.changeDay} and ${tempAfter} °C after` : `${loadBefore}% before day ${driveHistory.changeDay} and ${loadAfter}% after`}.`}>
        <rect x={x(driveHistory.changeDay - 0.5)} y={0} width={x(days) - x(driveHistory.changeDay - 0.5) + right} height={height} fill="#fff6c2" />
        {[low, high].map((tick) => (
          <g key={tick}>
            <line x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} stroke="#d8d9d9" />
            <text x={left - 8} y={y(tick) + 4} textAnchor="end" className={styles.chartTick}>{tick}{unit}</text>
          </g>
        ))}
        <polyline points={points} fill="none" stroke="#262829" strokeWidth={2} />
        {values.map((value, index) => <circle key={index} cx={x(index + 1)} cy={y(value)} r={3} fill={index + 1 >= driveHistory.changeDay ? "#262829" : "#fff"} stroke="#262829" strokeWidth={1.5} />)}
      </svg>
    </div>
  );
}

function DayAxis() {
  return (
    <div className={styles.dayAxis} aria-hidden="true">
      {Array.from({ length: days }, (_, index) => <span key={index} style={{ left: `${(dayX(index + 1) / CHART_WIDTH) * 100}%` }}>{index === 0 ? "Day 1" : index + 1}</span>)}
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
      <rect x={px(-6.15)} y={pz(-3)} width={12.3 * scale} height={4.95 * scale} fill="none" stroke="#fed603" strokeWidth={3} />
      {conveyor(-4.85, 0, 4.85, 0, "main")}
      {proposed && [
        conveyor(-1.4, 0, -1.4, -2.2, "a", true), conveyor(-1.4, -2.2, 1.4, -2.2, "b", true), conveyor(1.4, -2.2, 1.4, 0, "c", true),
      ]}
      <rect x={px(-5.9)} y={pz(-0.47)} width={1.05 * scale} height={0.95 * scale} fill="#c9cacb" stroke="#262829" />
      <rect x={px(-0.7)} y={pz(-0.44)} width={1.4 * scale} height={0.88 * scale} fill="none" stroke="#262829" strokeWidth={3} />
      {proposed && <rect x={px(-0.7)} y={pz(-2.64)} width={1.4 * scale} height={0.88 * scale} fill="none" stroke="#007dfe" strokeWidth={3} />}
      <rect x={px(4.95)} y={pz(-0.47)} width={0.9 * scale} height={0.95 * scale} fill="#c9cacb" stroke="#262829" />
      <rect x={px(4.95)} y={pz(0.84)} width={1.0 * scale} height={0.82 * scale} fill="#d8d9d9" stroke="#262829" />
      <rect x={px(layout.drive[0] - 0.1)} y={pz(0.26)} width={0.2 * scale} height={0.5 * scale} fill={focusDrive ? "#fed603" : "#6b7176"} stroke="#262829" strokeWidth={focusDrive ? 3 : 1} />
      {poses.map((pose) => <rect key={pose.id} x={px(pose.x) - 8} y={pz(pose.z) - 6.5} width={16} height={13} rx={3} fill="#8e979d" stroke="#262829" />)}
      <text x={px(-5.4)} y={pz(-0.65)} textAnchor="middle" className={styles.sketchText}>{cell.assembly} Assembly</text>
      <text x={px(0)} y={pz(-0.62)} textAnchor="middle" className={styles.sketchText}>{cell.inspection} Inspection</text>
      {proposed && <text x={px(0)} y={pz(-2.82)} textAnchor="middle" className={styles.sketchText}>{cell.proposedInspection} Inspection, proposed</text>}
      <text x={px(5.4)} y={pz(-0.65)} textAnchor="middle" className={styles.sketchText}>{cell.packaging} Packaging</text>
      <text x={px(layout.drive[0])} y={pz(1.0)} textAnchor="middle" className={styles.sketchText}>{cell.drive}</text>
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
      title={`${cell.drive} conveyor drive, Cell 1`}
      situation={<p><strong>Operating temperature has increased</strong> on conveyor drive {cell.drive}, which runs the main conveyor into packaging.</p>}
      finding={<p><strong>A supported investigation, with open questions.</strong> No cause is confirmed yet.</p>}
      next={<p>The maintenance lead decides what to inspect, following the approved maintenance procedure.</p>}
      boundary="A temperature rise alone does not show that a component is failing. Predictive maintenance needs suitable sensors, historical data, and validated diagnostics. The assistant does not control the machine or replace approved procedures."
    >
      <div className={styles.investigateTop}>
        <div ref={frame} className={styles.driveView}>
          <div className={styles.viewSwitch} role="group" aria-label="Viewpoint">
            <button type="button" aria-pressed={view === "cell"} onClick={() => setUserView("cell")}>Production cell</button>
            <button type="button" aria-pressed={view === "drive"} onClick={() => setUserView("drive")}>Conveyor drive {cell.drive}</button>
          </div>
          <SceneFrame
            shape="detail"
            label={view === "drive"
              ? `Close view of conveyor drive ${cell.drive}, a gear motor mounted below the end of the main conveyor next to packaging station ${cell.packaging}. The drive is highlighted.`
              : `The production cell from above: assembly ${cell.assembly}, inspection ${cell.inspection}, and packaging ${cell.packaging} along one conveyor, with drive ${cell.drive} highlighted at the packaging end.`}
            fallback={<CellSketch configuration="existing" time={INVESTIGATION_TIME} focusDrive />}
            render={(onReady) => <CellCanvas configuration="existing" clock={clock} time={INVESTIGATION_TIME} animating={false} view={view} instant={reducedMotion} focusDrive onReady={onReady} />}
          />
        </div>
        <div className={styles.signals}>
          <p className={styles.sheetLabel}>Operating signals, same {days} days</p>
          <SignalChart label={`Drive temperature, °C`} unit="°C" values={driveHistory.temperature} low={44} high={58} emphasis={selected.charts.includes("temperature")} />
          <SignalChart label="Motor load, % of rated" unit="%" values={driveHistory.load} low={50} high={85} emphasis={selected.charts.includes("load")} />
          <DayAxis />
          <p className={styles.chartNote}><span aria-hidden="true" /> Production load also changed during this period, from day {driveHistory.changeDay}.</p>
        </div>
      </div>
      <div className={styles.sourcesRow}>
        <div className={styles.sourceList} role="group" aria-label="Evidence sources">
          <p className={styles.sheetLabel}>Evidence sources</p>
          {SOURCES.map((item) => (
            <button key={item.id} type="button" className={styles.source} aria-pressed={source === item.id} data-relied={selected.relies.includes(item.id)} onClick={() => setSource(item.id)}>
              <span className={styles.sourceTitle}>{item.title}</span>
              <span className={styles.sourceRef}>{item.reference}</span>
              {selected.relies.includes(item.id) && <span className={styles.reliedTag}>Used by the selected explanation</span>}
            </button>
          ))}
        </div>
        <div className={styles.excerpt} aria-live="polite">
          <p className={styles.sheetLabel}>Excerpt, fictional example material</p>
          <p className={styles.excerptTitle}>{opened.reference}</p>
          <ul>{opened.excerpt.map((line) => <li key={line}>{line}</li>)}</ul>
        </div>
      </div>
      <div className={styles.reasoning}>
        <div className={styles.column} data-kind="observed">
          <p className={styles.columnLabel}>Observed</p>
          <ul>
            <li>Drive temperature averaged {tempBefore} °C on days 1 to {lastSteadyDay} and {tempAfter} °C on days {driveHistory.changeDay} to {days}.</li>
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
          <p className={styles.summary}><span>Assistant&apos;s summary</span>The temperature change coincides with a change in load. More information is needed to determine the cause.</p>
        </div>
        <div className={styles.column} data-kind="confirm">
          <p className={styles.columnLabel}>Needs confirmation</p>
          <ol>
            {NEXT_CHECKS.map((check, index) => <li key={check} data-related={selected.confirms.includes(index)}>{check}</li>)}
          </ol>
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
const stageName: Record<RunSummary["limitingStage"], string> = { assembly: `Assembly, ${cell.assembly}`, inspection: "Inspection", packaging: `Packaging, ${cell.packaging}` };
const bottleneckMoved = summaries.existing.limitingStage === "inspection" && summaries.proposed.limitingStage === "assembly";

const EXPERIMENT = ["Add one parallel inspection station.", "Keep assembly and packaging unchanged.", "Keep processing times unchanged.", "Assume the additional station is staffed."];
const ASSUMPTIONS = [
  `Assembly: ${simulation.assemblySeconds} s per housing, one station.`,
  `Inspection: ${simulation.inspectionSeconds} s per housing at each station, including moving through the booth.`,
  `Packaging: ${simulation.packagingSeconds} s per housing, one station.`,
  `Conveyor: ${simulation.conveyorSpeed * 60} m per minute. Up to ${simulation.bufferCapacity} housings wait on the conveyor before inspection. When it is full, assembly holds the finished housing.`,
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

  useEffect(() => {
    if (!playing) return;
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
  }, [playing]);

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
      title={`Second inspection station, Cell 1`}
      situation={<p>Parts accumulate before inspection. {cell.inspection} is busy {percent(summaries.existing.inspectionBusy)} of the run and assembly holds finished parts {percent(summaries.existing.assemblyBlocked)} of the time.</p>}
      findingLabel="Result under these assumptions"
      finding={bottleneckMoved
        ? <p><strong>Inspection can accept more work. Assembly now limits the line.</strong> {cell.assembly} is busy {percent(summaries.proposed.assemblyBusy)} of the run, while the inspection stations average {percent(summaries.proposed.inspectionBusy)}.</p>
        : <p><strong>The change does not move the limit.</strong> {stageName[summaries.proposed.limitingStage]} still sets the pace.</p>}
      next={<p>Engineers validate with calibrated process data before anyone commits to an investment.</p>}
      boundary="Illustrative simulation using simplified assumptions. It is not a validated model of a real factory or a live digital twin, and it is not connected to any equipment. A production engagement requires calibrated process data, suitable simulation technology, and engineering validation."
    >
      <div className={styles.experiment}>
        <div className={styles.ask}>
          <p className={styles.sheetLabel}>Engineer&apos;s question</p>
          <p className={styles.askText}>&ldquo;What happens if we add a second inspection station?&rdquo;</p>
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
          label={`${proposed ? "Proposed configuration" : "Existing line"} at ${formatSim(time)} simulated time. ${status.waitingForInspection} housings waiting for inspection, ${status.packaged} packaged. Assembly is ${status.assembly === "blocked" ? "holding a finished part because the conveyor is full" : "assembling"}.`}
          fallback={<CellSketch configuration={configuration} time={time} />}
          render={(onReady) => <CellCanvas configuration={configuration} clock={clock} time={time} animating={playing} view="cell" instant showStatus onReady={onReady} />}
        />
        <dl className={styles.readout} aria-live="off">
          <div><dt>Waiting for inspection</dt><dd>{status.waitingForInspection}</dd></div>
          <div><dt>Packaged so far</dt><dd>{status.packaged}</dd></div>
          <div data-alert={status.assembly === "blocked"}><dt>{cell.assembly} Assembly</dt><dd>{status.assembly === "blocked" ? "Holding a part" : "Assembling"}</dd></div>
          <div><dt>Inspection</dt><dd>{proposed ? `${cell.inspection} ${status.inspection.I1 === "inspecting" ? "busy" : "idle"}, ${cell.proposedInspection} ${status.inspection.I2 === "inspecting" ? "busy" : "idle"}` : status.inspection.I1 === "inspecting" ? "Busy" : "Waiting for parts"}</dd></div>
        </dl>
        <p className={styles.simNote}>Playback runs at {PLAYBACK_SPEED}× in both configurations. A faster-looking animation is not evidence. Compare the calculated results.</p>
      </div>
      <div className={styles.results} data-active={step === 2}>
        <div className={styles.assumptionList} data-active={step === 0}>
          <p className={styles.sheetLabel}>Shared assumptions, identical in both configurations</p>
          <ul>{ASSUMPTIONS.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
        <table className={styles.table}>
          <caption className={styles.sheetLabel}>Calculated over {RUN / 60} simulated minutes</caption>
          <thead><tr><th scope="col">Measure</th><th scope="col">Existing line</th><th scope="col">With proposed {cell.proposedInspection}</th></tr></thead>
          <tbody>
            <tr><th scope="row">Housings packaged</th><td>{summaries.existing.packaged}</td><td>{summaries.proposed.packaged}</td></tr>
            <tr><th scope="row">Average wait before inspection<span>Time standing still, not travel</span></th><td>{Math.round(summaries.existing.averageWait)} s</td><td>{Math.round(summaries.proposed.averageWait)} s</td></tr>
            <tr><th scope="row">Most housings waiting at once</th><td>{summaries.existing.mostWaiting}</td><td>{summaries.proposed.mostWaiting}</td></tr>
            <tr><th scope="row">{cell.assembly} holding finished parts</th><td>{percent(summaries.existing.assemblyBlocked)}</td><td>{percent(summaries.proposed.assemblyBlocked)}</td></tr>
            <tr><th scope="row">Busy share, assembly</th><td>{percent(summaries.existing.assemblyBusy)}</td><td>{percent(summaries.proposed.assemblyBusy)}</td></tr>
            <tr><th scope="row">Busy share, inspection<span>Average per station</span></th><td>{percent(summaries.existing.inspectionBusy)}</td><td>{percent(summaries.proposed.inspectionBusy)}</td></tr>
            <tr><th scope="row">Busy share, packaging</th><td>{percent(summaries.existing.packagingBusy)}</td><td>{percent(summaries.proposed.packagingBusy)}</td></tr>
            <tr data-changed="true"><th scope="row">Stage that limits the line<span>Highest busy share</span></th><td>{stageName[summaries.existing.limitingStage]}</td><td>{stageName[summaries.proposed.limitingStage]}</td></tr>
          </tbody>
        </table>
      </div>
    </Example>
  );
}
