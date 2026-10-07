"use client";

import { useState, type ReactNode } from "react";
import { ArrowRight, Check, Mic, RotateCcw } from "lucide-react";
import styles from "./property-services.module.css";

type Area = "driveway" | "patio" | "path" | "fence" | "gate";
type AreaTone = "scope" | "excluded" | "open" | "access";
type TagTone = "proposed" | "accepted" | "excluded" | "open" | "neutral" | "received" | "needed" | "ready" | "reviewed";

const AREA_TONE: Record<Area, AreaTone> = { driveway: "scope", patio: "scope", path: "open", fence: "excluded", gate: "access" };
const ALL_AREAS: Area[] = ["driveway", "patio", "path", "fence", "gate"];
const PROPERTY = "Alder Lane property";
const RECORD = ["Walkthrough and estimate", "Crew briefing", "Visit evidence", "Next visit"];

function Tag({ tone, children }: { tone: TagTone; children: ReactNode }) {
  return <span className={styles.tag} data-tone={tone}>{children}</span>;
}

type Footer = { label: string; content: ReactNode; role?: "finding" | "next" };

function Example({ stage, title, children, footer }: { stage: number; title: string; children: ReactNode; footer: Footer[] }) {
  return (
    <figure className={styles.example}>
      <figcaption className={styles.exampleBar}>
        <span className={styles.exampleTag}>Example workflow</span>
        <span className={styles.exampleTitle}>{title}</span>
        <span className={styles.exampleNote}>Fictional property. Illustrations, not photographs or measured drawings.</span>
        <ol className={styles.record} aria-label="Property record so far">
          {RECORD.map((item, index) => (
            <li key={item} data-state={index < stage ? "done" : index === stage ? "current" : "later"}>{item}</li>
          ))}
        </ol>
      </figcaption>
      <div className={styles.exampleBody}>{children}</div>
      <ol className={styles.outcome}>
        {footer.map((item) => (
          <li key={item.label} data-role={item.role}>
            <span className={styles.outcomeLabel}>{item.label}</span>
            {item.content}
          </li>
        ))}
      </ol>
    </figure>
  );
}

const VIEWBOX = { wide: "12 4 376 296", close: "56 12 276 236" };

type PlanProps = {
  view: keyof typeof VIEWBOX;
  label: string;
  marked?: Area[];
  selected?: Area | null;
  onSelect?: (area: Area) => void;
};

function PropertyPlan({ view, label, marked = ALL_AREAS, selected, onSelect }: PlanProps) {
  const areaProps = (area: Area) => ({
    "data-tone": AREA_TONE[area],
    "data-state": area === selected ? "selected" : marked.includes(area) ? "marked" : "plain",
    className: `${styles.area} ${onSelect ? styles.hit : ""}`,
    onClick: onSelect ? () => onSelect(area) : undefined,
  });
  return (
    <svg viewBox={VIEWBOX[view]} className={styles.plan} role="img" aria-label={label}>
      <rect x="0" y="0" width="400" height="262" className={styles.lot} />
      <rect x="0" y="262" width="400" height="38" className={styles.street} />
      <text x="388" y="285" textAnchor="end" className={styles.planNote}>Street</text>

      <g {...areaProps("patio")}>
        <rect x="190" y="44" width="110" height="46" className={styles.surface} />
        <text x="245" y="71" textAnchor="middle" className={styles.planLabel}>Rear patio</text>
      </g>
      <g {...areaProps("driveway")}>
        <rect x="150" y="200" width="65" height="62" className={styles.surface} />
        <text x="182.5" y="234" textAnchor="middle" className={styles.planLabel}>Driveway</text>
      </g>
      <g {...areaProps("path")}>
        <path d="M116 62H144V200H150V216H116Z" className={styles.surface} />
        <text transform="translate(134 166) rotate(-90)" textAnchor="middle" className={styles.planLabel}>Side path</text>
      </g>

      <rect x="150" y="90" width="180" height="110" className={styles.house} />
      <path d="M150 132H215V200" className={styles.houseLine} />
      <line x1="157" y1="200" x2="208" y2="200" className={styles.garageDoor} />
      <line x1="240" y1="90" x2="256" y2="90" className={styles.door} />
      <text x="272" y="150" textAnchor="middle" className={styles.planNote}>House</text>
      <text x="182.5" y="170" textAnchor="middle" className={styles.planNote}>Garage</text>

      <g {...areaProps("fence")}>
        <polyline points="116,118 24,118 24,24 376,24 376,118 330,118" className={styles.fenceHit} />
        <line x1="144" y1="118" x2="150" y2="118" className={styles.fenceHit} />
        <polyline points="116,118 24,118 24,24 376,24 376,118 330,118" className={styles.fence} />
        <line x1="144" y1="118" x2="150" y2="118" className={styles.fence} />
        <text x="150" y="40" textAnchor="middle" className={styles.planLabel}>Painted fence</text>
      </g>
      <g {...areaProps("gate")}>
        <rect x="106" y="106" width="48" height="24" className={styles.gateHit} />
        <rect x="116" y="115" width="28" height="6" className={styles.gate} />
        <text x="111" y="111" textAnchor="end" className={styles.planLabel}>Side gate</text>
      </g>
    </svg>
  );
}

function Legend({ items }: { items: [AreaTone, string][] }) {
  return (
    <ul className={styles.legend}>
      {items.map(([tone, text]) => <li key={text}><span data-tone={tone} aria-hidden="true" />{text}</li>)}
    </ul>
  );
}

type Shot = "before" | "after";

function Stains({ show, spots }: { show: boolean; spots: [number, number, number, number][] }) {
  if (!show) return null;
  return <g fill="#7c7d7b" opacity=".45">{spots.map(([cx, cy, rx, ry]) => <ellipse key={`${cx}-${cy}`} cx={cx} cy={cy} rx={rx} ry={ry} />)}</g>;
}

function Pickets({ x, y, width, height, gap = 7 }: { x: number; y: number; width: number; height: number; gap?: number }) {
  const count = Math.floor(width / gap);
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill="#fff" stroke="#707273" strokeWidth=".8" />
      {Array.from({ length: count }, (_, index) => <line key={index} x1={x + gap * (index + 1)} y1={y} x2={x + gap * (index + 1)} y2={y + height} stroke="#c9cac7" strokeWidth=".8" />)}
    </g>
  );
}

function DrivewayView({ shot = "before" }: { shot?: Shot }) {
  return (
    <svg viewBox="0 0 160 100" className={styles.vignette} aria-hidden="true">
      <rect width="160" height="100" fill="#eeeeec" />
      <Pickets x={0} y={32} width={30} height={26} />
      <rect x="30" y="29" width="14" height="29" fill="#fff" stroke="#262829" strokeWidth="1.2" />
      <path d="M33.5 31V56M37 31V56M40.5 31V56" stroke="#8f908e" strokeWidth=".8" />
      <rect x="44" y="0" width="116" height="58" fill="#e0e0dd" />
      <rect x="70" y="12" width="64" height="46" fill="#f7f7f5" stroke="#707273" />
      <path d="M70 23.5H134M70 35H134M70 46.5H134" stroke="#b9baba" strokeWidth=".8" />
      <polygon points="0,100 22,100 46,58 30,58" fill="#c9cac7" />
      <polygon points="22,100 36,100 62,58 46,58" fill="#e4e5e1" />
      <polygon points="36,100 160,100 142,58 62,58" fill={shot === "before" ? "#b4b5b2" : "#d4d5d2"} />
      <Stains show={shot === "before"} spots={[[98, 80, 15, 5], [124, 91, 10, 4], [80, 67, 9, 3], [138, 72, 7, 3]]} />
    </svg>
  );
}

function PatioView({ shot = "before" }: { shot?: Shot }) {
  return (
    <svg viewBox="0 0 160 100" className={styles.vignette} aria-hidden="true">
      <rect width="160" height="100" fill="#e6e7e3" />
      <rect width="160" height="14" fill="#f3f3f1" />
      <Pickets x={0} y={14} width={160} height={28} />
      <polygon points="0,100 160,100 136,56 24,56" fill={shot === "before" ? "#b4b5b2" : "#d4d5d2"} />
      <path d="M57 56 44 100M80 56V100M103 56 116 100M16 72H144" stroke="#8f908e" strokeWidth=".7" fill="none" />
      <Stains show={shot === "before"} spots={[[60, 84, 14, 5], [104, 66, 10, 3], [126, 90, 9, 4]]} />
      <rect x="0" y="94" width="160" height="6" fill="#8f908e" />
    </svg>
  );
}

function SidePathView() {
  return (
    <svg viewBox="0 0 160 100" className={styles.vignette} aria-hidden="true">
      <rect width="160" height="100" fill="#eeeeec" />
      <polygon points="0,100 34,100 64,52 0,52" fill="#e4e5e1" />
      <Pickets x={0} y={30} width={60} height={22} gap={6} />
      <rect x="60" y="27" width="20" height="25" fill="#fff" stroke="#262829" strokeWidth="1.2" />
      <path d="M65 29V50M70 29V50M75 29V50" stroke="#8f908e" strokeWidth=".8" />
      <polygon points="112,100 160,100 160,0 80,24 80,52" fill="#d8d9d9" stroke="#8f908e" strokeWidth=".8" />
      <polygon points="34,100 112,100 80,52 64,52" fill="#c9cac7" />
    </svg>
  );
}

const PHOTOS = [
  { area: "driveway" as Area, caption: "Photo 1, driveway from the street", View: DrivewayView },
  { area: "patio" as Area, caption: "Photo 2, rear patio, painted fence behind", View: PatioView },
  { area: "path" as Area, caption: "Photo 3, side path toward the gate", View: SidePathView },
];

type ScopeItem = { area: Area; label: string; tag: [TagTone, string]; photo: number; note: string; detail: ReactNode };

const SCOPE: ScopeItem[] = [
  { area: "driveway", label: "Driveway cleaning", tag: ["proposed", "Proposed"], photo: 0, note: "\u201cDriveway and rear patio.\u201d", detail: "Proposed from the spoken note and photo 1. The area still has to be measured before it can be priced." },
  { area: "patio", label: "Rear patio cleaning", tag: ["proposed", "Proposed"], photo: 1, note: "\u201cDriveway and rear patio.\u201d", detail: "Proposed from the spoken note and photo 2. The area still has to be measured before it can be priced." },
  { area: "fence", label: "Painted fence", tag: ["excluded", "Excluded"], photo: 1, note: "\u201cLeave the painted fence alone.\u201d", detail: "Excluded on the owner's instruction. The fence appears in photo 2, but being visible does not add it to the work." },
  { area: "path", label: "Side path", tag: ["open", "Confirmation needed"], photo: 2, note: "\u201cConfirm the side path.\u201d", detail: <><strong>Not included in the accepted scope.</strong> It stays an open question unless a separate change is explicitly approved.</> },
];

const PRICING_INPUTS: [string, string][] = [
  ["Measured area", "From a site measurement"],
  ["Selected service", "From your service catalog"],
  ["Approved pricing rule", "Set by your team"],
];

const ACCEPTED: [string, TagTone, string][] = [
  ["Driveway cleaning", "accepted", "Accepted"],
  ["Rear patio cleaning", "accepted", "Accepted"],
  ["Painted fence", "excluded", "Excluded"],
  ["Side path", "neutral", "Not included"],
];

export function ScopeTheWork() {
  const [selected, setSelected] = useState(0);
  const item = SCOPE[selected];
  const select = (area: Area) => {
    const index = SCOPE.findIndex((entry) => entry.area === area);
    if (index >= 0) setSelected(index);
  };
  return (
    <Example
      stage={0}
      title={`${PROPERTY}, walkthrough on 4 May`}
      footer={[
        { label: "What was observed", content: <p>A spoken note and three photos from the owner&rsquo;s walkthrough.</p> },
        { label: "What your team gets", role: "finding", content: <p><strong>A reviewed scope with its reference photos.</strong> The open side-path question stays outside it.</p> },
        { label: "Keep in mind", role: "next", content: <p>Ordinary photos do not establish dimensions, hidden conditions, or the right treatment method.</p> },
      ]}
    >
      <div className={styles.scopeFlow}>
        <div className={styles.column}>
          <p className={styles.stepHead}><span>1</span>Walkthrough information</p>
          <div className={styles.sheet}>
            <PropertyPlan view="wide" selected={item.area} onSelect={select} label={`Site plan of the fictional property: a house with a driveway to the street, a rear patio, a side path along the house, and a painted fence around the back garden with a side gate across the path. ${item.label} is highlighted.`} />
            <Legend items={[["scope", "Proposed work"], ["excluded", "Excluded"], ["open", "Confirmation needed"]]} />
          </div>
          <div className={styles.voiceNote}>
            <span className={styles.voiceIcon} aria-hidden="true"><Mic size={15} strokeWidth={1.6} /></span>
            <div>
              <p className={styles.sheetLabel}>Spoken note, owner</p>
              <p className={styles.quote}>&ldquo;Driveway and rear patio. Leave the painted fence alone. Confirm the side path.&rdquo;</p>
            </div>
          </div>
          <ul className={styles.photos} aria-label="Walkthrough photos, shown as labelled illustrations">
            {PHOTOS.map((photo, index) => (
              <li key={photo.caption} data-active={item.photo === index}>
                <photo.View />
                <span>{photo.caption}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.column}>
          <p className={styles.stepHead}><span>2</span>Structured scope</p>
          <div className={styles.sheet}>
            <p className={styles.sheetLabel}>Draft scope, prepared for review</p>
            <div className={styles.choiceList}>
              {SCOPE.map((entry, index) => (
                <button key={entry.area} type="button" className={styles.choice} aria-pressed={selected === index} onClick={() => setSelected(index)}>
                  <span className={styles.choiceText}>{entry.label}</span>
                  <Tag tone={entry.tag[0]}>{entry.tag[1]}</Tag>
                </button>
              ))}
            </div>
            <div className={styles.detail} aria-live="polite">
              <p className={styles.sheetLabel}>Why it is on the draft</p>
              <p className={styles.detailQuote}>Walkthrough note: {item.note}</p>
              <p className={styles.detailMeta}>Reference: {PHOTOS[item.photo].caption}</p>
              <p>{item.detail}</p>
            </div>
          </div>
        </div>

        <div className={styles.column}>
          <p className={styles.stepHead}><span>3</span>Reviewed estimate</p>
          <div className={styles.sheet}>
            <ol className={styles.reviewSteps}>
              <li>
                <strong>Review measurements and pricing</strong>
                <ul className={styles.inputs}>
                  {PRICING_INPUTS.map(([input, source]) => <li key={input}><span>{input}</span><Tag tone="needed">{source}</Tag></li>)}
                </ul>
                <p className={styles.smallNote}>No price is calculated from an unscaled photo.</p>
              </li>
              <li>
                <strong>Prepare estimate</strong>
                <span>Driveway and rear patio cleaning, with the fence exclusion written in.</span>
              </li>
              <li>
                <strong>Customer approves the stated work</strong>
                <span>Accepted on 6 May.</span>
              </li>
            </ol>
            <div className={styles.accepted}>
              <p className={styles.sheetLabel}>Accepted scope</p>
              <ul>
                {ACCEPTED.map(([line, tone, status]) => <li key={line}><span>{line}</span><Tag tone={tone}>{status}</Tag></li>)}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Example>
  );
}

const AREA_BRIEF: Record<Area, { title: string; tag: [TagTone, string]; text: string }> = {
  driveway: { title: "Driveway", tag: ["accepted", "Today's work"], text: "Driveway cleaning, as listed on the accepted estimate." },
  patio: { title: "Rear patio", tag: ["accepted", "Today's work"], text: "Rear patio cleaning, as listed on the accepted estimate." },
  fence: { title: "Painted fence", tag: ["excluded", "Excluded"], text: "\u201cLeave the painted fence alone.\u201d Recorded at the walkthrough and stated on the accepted estimate." },
  gate: { title: "Side gate", tag: ["neutral", "Access"], text: "Use the side gate to reach the rear patio." },
  path: { title: "Side path", tag: ["open", "Not included"], text: "Not included in the accepted estimate. Confirm additional work with the office." },
};

const BRIEFING: [string, string][] = [
  ["Today's work", "Driveway and rear patio"],
  ["Important instruction", "Painted fence excluded"],
  ["Access", "Use the side gate"],
  ["Reference", "Accepted estimate and walkthrough photos"],
];

type Excerpt = { title: string; lines: [string, TagTone, string][]; note: string; highlight?: string };

const ESTIMATE_EXCERPT: Excerpt = {
  title: "Accepted estimate, accepted 6 May",
  lines: ACCEPTED,
  note: "Side-path request remains unapproved.",
  highlight: "Side path",
};

type CrewQuestion = { question: string; answer: string; status: [TagTone, string]; sources: string[]; area: Area; excerpt: Excerpt };

const QUESTIONS: CrewQuestion[] = [
  {
    question: "Is the side path included?",
    answer: "The side path is not included in the accepted estimate. Confirm additional work with the office.",
    status: ["received", "Answered from the record"],
    sources: ["Accepted estimate", "Side-path request remains unapproved"],
    area: "path",
    excerpt: ESTIMATE_EXCERPT,
  },
  {
    question: "What was done on the previous visit?",
    answer: "The last recorded visit was on 12 October last year: driveway cleaning only. That is the property's history. Today's work comes from the accepted estimate.",
    status: ["received", "Answered from the record"],
    sources: ["Service record, 12 October last year"],
    area: "driveway",
    excerpt: {
      title: "Service record, 12 October last year",
      lines: [["Driveway cleaning", "reviewed", "Completed"], ["Visit type", "neutral", "One-off"]],
      note: "A past visit does not change today's scope.",
    },
  },
  {
    question: "The customer asked us to add the side path. Can we do it today?",
    answer: "Needs office confirmation. A request made on site does not change the accepted estimate, and no change has been approved.",
    status: ["open", "Needs office confirmation"],
    sources: ["Accepted estimate", "No approved change on record"],
    area: "path",
    excerpt: { ...ESTIMATE_EXCERPT, note: "No approved change on record. The office can prepare one for the customer to approve." },
  },
];

export function EquipTheCrew() {
  const [area, setArea] = useState<Area>("path");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [showSource, setShowSource] = useState(false);
  const question = QUESTIONS[questionIndex];
  const brief = AREA_BRIEF[area];
  const ask = (index: number) => {
    setQuestionIndex(index);
    setArea(QUESTIONS[index].area);
    setShowSource(false);
  };
  return (
    <Example
      stage={1}
      title={`${PROPERTY}, day of service, 14 May`}
      footer={[
        { label: "What the crew sees", content: <p>Only what an assigned crew needs: the approved work, instructions, access, and the records behind them.</p> },
        { label: "Every answer", role: "finding", content: <p><strong>Shows its source,</strong> or says it needs office confirmation when the record is missing or conflicts.</p> },
        { label: "Keep in mind", role: "next", content: <p>Old notes, customer messages, and crew suggestions never override the accepted scope or authorize extra work.</p> },
      ]}
    >
      <div className={styles.crewGrid}>
        <div className={styles.column}>
          <div className={styles.sheet}>
            <p className={styles.sheetLabel}>Closer view, side of the house</p>
            <PropertyPlan view="close" selected={area} onSelect={setArea} label={`Closer view of the same property around the side gate, side path, rear patio, and the top of the driveway. ${brief.title} is highlighted.`} />
            <div className={styles.areaChips} role="group" aria-label="Choose a property area">
              {ALL_AREAS.map((item) => (
                <button key={item} type="button" aria-pressed={area === item} onClick={() => setArea(item)}>{AREA_BRIEF[item].title}</button>
              ))}
            </div>
            <div className={styles.detail} aria-live="polite">
              <p className={styles.detailTitle}>{brief.title} <Tag tone={brief.tag[0]}>{brief.tag[1]}</Tag></p>
              <p>{brief.text}</p>
            </div>
          </div>
        </div>

        <div className={styles.column}>
          <div className={styles.sheet}>
            <p className={styles.sheetLabel}>Crew briefing, Thursday 14 May</p>
            <dl className={styles.briefing}>
              {BRIEFING.map(([term, value]) => <div key={term}><dt>{term}</dt><dd>{value}</dd></div>)}
            </dl>
          </div>
          <div className={styles.sheet}>
            <p className={styles.sheetLabel}>Questions from the crew</p>
            <div className={styles.choiceList}>
              {QUESTIONS.map((item, index) => (
                <button key={item.question} type="button" className={styles.choice} aria-pressed={questionIndex === index} onClick={() => ask(index)}>
                  <span className={styles.choiceText}>{item.question}</span>
                </button>
              ))}
            </div>
            <div className={styles.answer} aria-live="polite">
              <button type="button" className={styles.answerButton} aria-expanded={showSource} onClick={() => setShowSource(!showSource)}>
                <Tag tone={question.status[0]}>{question.status[1]}</Tag>
                <span className={styles.answerText}>{question.answer}</span>
                <span className={styles.sources}>Source: {question.sources.join(" \u00b7 ")}</span>
                <span className={styles.findingAction}>{showSource ? "Hide the record" : "Show the record"} <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" /></span>
              </button>
              {showSource && (
                <div className={styles.excerpt}>
                  <p className={styles.sheetLabel}>{question.excerpt.title}</p>
                  <ul>
                    {question.excerpt.lines.map(([line, tone, status]) => (
                      <li key={line} data-marked={question.excerpt.highlight === line}><span>{line}</span><Tag tone={tone}>{status}</Tag></li>
                    ))}
                  </ul>
                  <p className={styles.smallNote}>{question.excerpt.note}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Example>
  );
}

type WorkId = "driveway" | "patio";

const REVIEW_STEPS = ["Check evidence against the approved tasks", "Documentation ready for review", "Supervisor reviews", "Service summary prepared"];
const STEP_ACTIONS = ["Add the example patio photo", "Supervisor reviews", "Prepare the service summary", "Replay"];
const STEP_STATUS: [TagTone, string][] = [
  ["needed", "Rear patio completion evidence is missing."],
  ["ready", "Documentation ready for review"],
  ["reviewed", "Supervisor reviewed the documentation"],
  ["reviewed", "Service summary prepared"],
];

export function ReviewTheResult() {
  const [work, setWork] = useState<WorkId>("patio");
  const [step, setStep] = useState(0);
  const patioComplete = step > 0;
  const items: { id: WorkId; label: string; evidence: [TagTone, string][] }[] = [
    { id: "driveway", label: "Driveway cleaning", evidence: [["received", "Before photo received"], ["received", "After photo received"]] },
    { id: "patio", label: "Rear patio cleaning", evidence: [["received", "Before photo received"], patioComplete ? ["received", "Completion photo received"] : ["needed", "Completion photo needed"]] },
  ];
  const View = work === "driveway" ? DrivewayView : PatioView;
  const hasAfter = work === "driveway" || patioComplete;
  const advance = () => setStep(step === REVIEW_STEPS.length - 1 ? 0 : step + 1);
  const selectArea = (area: Area) => { if (area === "driveway" || area === "patio") setWork(area); };
  return (
    <Example
      stage={2}
      title={`${PROPERTY}, after the 14 May visit`}
      footer={[
        { label: "Finding at the first check", role: "finding", content: <p><strong>Rear patio completion evidence is missing.</strong></p> },
        { label: "Next step for your team", role: "next", content: <p>Request the relevant photo or crew clarification.</p> },
        { label: "Keep in mind", content: <p>Missing evidence does not prove missing work, and a photo does not certify workmanship, safety, or hidden work.</p> },
      ]}
    >
      <div className={styles.reviewGrid}>
        <div className={styles.column}>
          <div className={styles.sheet}>
            <p className={styles.sheetLabel}>Approved work items</p>
            <div className={styles.workItems}>
              {items.map((item) => (
                <button key={item.id} type="button" className={styles.workItem} aria-pressed={work === item.id} onClick={() => setWork(item.id)}>
                  <span className={styles.choiceText}>{item.label}</span>
                  {item.evidence.map(([tone, text]) => <Tag key={text} tone={tone}>{text}</Tag>)}
                </button>
              ))}
            </div>
            <PropertyPlan view="wide" marked={["driveway", "patio"]} selected={work} onSelect={selectArea} label={`The same property plan with the driveway and rear patio marked as approved work. ${work === "patio" ? "The rear patio" : "The driveway"} is highlighted.`} />
          </div>
        </div>

        <div className={styles.column}>
          <div className={styles.sheet}>
            <p className={styles.sheetLabel}>{work === "patio" ? "Rear patio" : "Driveway"}, matched viewpoint</p>
            <div className={styles.pair} aria-live="polite">
              <div>
                <p className={styles.viewLabel}><span className={styles.dotBefore} aria-hidden="true" />Before</p>
                <View shot="before" />
                <p className={styles.photoMeta}>Illustrative image, crew, 14 May, 9:10</p>
              </div>
              <div>
                <p className={styles.viewLabel}><span className={styles.dotAfter} aria-hidden="true" />After</p>
                {hasAfter ? <View shot="after" /> : <div className={styles.missing}><span>Completion photo needed</span></div>}
                <p className={styles.photoMeta}>{hasAfter ? `Illustrative image, crew, 14 May, ${work === "patio" ? "15:40" : "12:05"}` : "Nothing submitted for this task yet"}</p>
              </div>
            </div>
            <p className={styles.smallNote}>Same position and landmarks in both images: {work === "patio" ? "the back step and the painted fence" : "the garage door, side path, and gate"}.</p>
            {work === "patio" && patioComplete && (
              <p className={styles.crewNote}><span className={styles.sheetLabel}>Crew note, 15:40</span>Patio work completed; photo added for review.</p>
            )}
          </div>

          <div className={styles.sheet}>
            <div className={styles.stepperHead}>
              <p className={styles.sheetLabel}>Documentation status</p>
              <button type="button" className={styles.stepButton} onClick={advance}>
                {step === REVIEW_STEPS.length - 1 ? <RotateCcw size={14} strokeWidth={1.6} aria-hidden="true" /> : <ArrowRight size={14} strokeWidth={1.6} aria-hidden="true" />}
                {STEP_ACTIONS[step]}
              </button>
            </div>
            <p className={styles.statusLine} aria-live="polite"><Tag tone={STEP_STATUS[step][0]}>{STEP_STATUS[step][1]}</Tag></p>
            <ol className={styles.stepper}>
              {REVIEW_STEPS.map((label, index) => (
                <li key={label} data-state={index < step ? "done" : index === step ? "current" : "later"}>
                  <span aria-hidden="true">{index < step ? <Check size={12} strokeWidth={2} /> : index + 1}</span>
                  {label}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      <div className={styles.summary} data-ready={step === 3}>
        <div className={styles.summaryHead}>
          <p className={styles.sheetLabel}>Customer-facing service summary</p>
          <Tag tone={step === 3 ? "reviewed" : "neutral"}>{step === 3 ? "Prepared after supervisor review" : "Prepared only after supervisor review"}</Tag>
        </div>
        <dl className={styles.summaryGrid}>
          <div><dt>Approved services</dt><dd>Driveway cleaning<br />Rear patio cleaning</dd></div>
          <div><dt>Reviewed photographs</dt><dd>{step >= 2 ? <>Driveway, before and after<br />Rear patio, before and after</> : "Waiting for supervisor review"}</dd></div>
          <div><dt>Service notes</dt><dd>Painted fence excluded, as agreed.</dd></div>
          <div><dt>Unresolved item</dt><dd>Side path: requested on site, not included. The office will follow up separately.</dd></div>
        </dl>
        <p className={styles.smallNote}>Left out of the summary: internal pricing discussion and staff notes.</p>
      </div>
    </Example>
  );
}

type StopId = "birch" | "alder" | "cedar";
type Stop = {
  id: StopId; order: number; name: string; service: string; previous: string; access: string; duration: string;
  window: [number, number]; windowLabel: string; slot: [number, number]; slotLabel: string;
};

const STOPS: Stop[] = [
  { id: "birch", order: 1, name: "Birch Road property", service: "Exterior house wash, every 12 months by customer agreement", previous: "11 November last year: exterior house wash", access: "Front driveway. Outdoor tap on the left of the house.", duration: "About 2 hours", window: [8, 17], windowLabel: "Weekdays, 8:00 to 17:00", slot: [8, 10], slotLabel: "8:00 to 10:00" },
  { id: "alder", order: 2, name: "Alder Lane property", service: "Driveway and rear patio cleaning, every 6 months by customer agreement. Painted fence excluded.", previous: "14 May: driveway and rear patio cleaning, documentation reviewed", access: "Use the side gate.", duration: "About 3 hours", window: [8, 17], windowLabel: "Weekdays, 8:00 to 17:00", slot: [10.25, 13.25], slotLabel: "10:15 to 13:15" },
  { id: "cedar", order: 3, name: "Cedar Court property", service: "Patio cleaning, every 6 months by customer agreement", previous: "12 May: patio cleaning", access: "Afternoon access only. Park on Cedar Court.", duration: "About 1.5 hours", window: [13, 17], windowLabel: "Afternoons only, 13:00 to 17:00", slot: [13.5, 15], slotLabel: "13:30 to 15:00" },
];

const CHECKS: [string, TagTone, string][] = [
  ["Already booked?", "received", "No visit on the calendar"],
  ["Plan paused or cancelled?", "received", "Agreement active"],
  ["Customer confirmation needed?", "needed", "Yes, before booking"],
];

const HISTORY: [string, string, string][] = [
  ["Previous service completed", "14 May", "Driveway and rear patio cleaning. Documentation reviewed."],
  ["Recurring service agreed", "20 May", "The customer chose a visit every 6 months, same scope, painted fence excluded."],
  ["Next visit approaching", "Due week of 9 November", "Same scope unless an approved change is recorded."],
];

const DAY_START = 8;
const DAY_HOURS = 9;
const TRAVEL: [number, number][] = [[10, 10.25], [13.25, 13.5]];
const position = ([start, end]: [number, number]) => ({ left: `${((start - DAY_START) / DAY_HOURS) * 100}%`, width: `${((end - start) / DAY_HOURS) * 100}%` });

const MAP_POINTS: Record<StopId, [number, number]> = { birch: [96, 86], alder: [170, 130], cedar: [280, 50] };

function AreaMap({ selected, onSelect }: { selected: StopId; onSelect: (id: StopId) => void }) {
  return (
    <svg viewBox="0 0 320 190" className={styles.plan} role="img" aria-label="Simplified map of three nearby fictional properties. The proposed route starts south on Birch Road, stops at Birch Road first, continues east along Alder Lane to the Alder Lane property, then north to Cedar Court.">
      <rect width="320" height="190" className={styles.lot} />
      <rect x="90" y="0" width="12" height="190" className={styles.road} />
      <rect x="90" y="124" width="230" height="12" className={styles.road} />
      <rect x="224" y="44" width="12" height="92" className={styles.road} />
      <rect x="224" y="44" width="96" height="12" className={styles.road} />
      <text x="86" y="16" textAnchor="end" className={styles.planNote}>Birch Road</text>
      <text x="314" y="150" textAnchor="end" className={styles.planNote}>Alder Lane</text>
      <text x="314" y="70" textAnchor="end" className={styles.planNote}>Cedar Court</text>

      <g className={styles.mapProperty} data-state={selected === "birch" ? "selected" : "plain"}>
        <rect x="42" y="72" width="38" height="28" />
        <rect x="80" y="82" width="10" height="8" />
      </g>
      <g className={styles.mapProperty} data-state={selected === "alder" ? "selected" : "plain"}>
        <rect x="160" y="94" width="44" height="22" />
        <rect x="160" y="116" width="15" height="8" />
        <rect x="174" y="86" width="24" height="8" />
      </g>
      <g className={styles.mapProperty} data-state={selected === "cedar" ? "selected" : "plain"}>
        <rect x="262" y="12" width="40" height="24" />
        <rect x="274" y="36" width="10" height="8" />
      </g>

      <polyline points="96,184 96,86 96,130 170,130 230,130 230,50 280,50" className={styles.route} />
      <circle cx="96" cy="184" r="4" className={styles.routeStart} />
      <text x="106" y="184" className={styles.planNote}>Crew starts</text>
      {STOPS.map((stop) => {
        const [cx, cy] = MAP_POINTS[stop.id];
        return (
          <g key={stop.id} className={styles.stopMarker} data-state={selected === stop.id ? "selected" : "plain"} onClick={() => onSelect(stop.id)}>
            <circle cx={cx} cy={cy} r="9" />
            <text x={cx} y={cy + 3.5} textAnchor="middle">{stop.order}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function PlanTheNextVisit() {
  const [selected, setSelected] = useState<StopId>("alder");
  const stop = STOPS.find((item) => item.id === selected) ?? STOPS[1];
  return (
    <Example
      stage={3}
      title={`${PROPERTY} and two nearby properties, week of 9 November`}
      footer={[
        { label: "What your team gets", role: "finding", content: <p><strong>A crew schedule and customer confirmations to review.</strong></p> },
        { label: "Next step for your team", role: "next", content: <p>Office approves the schedule before confirming visits.</p> },
        { label: "Keep in mind", content: <p>Nothing is booked and no customer is contacted. Optimized grouping is a capability to validate with your team.</p> },
      ]}
    >
      <div className={styles.planGrid}>
        <div className={styles.column}>
          <div className={styles.sheet}>
            <p className={styles.sheetLabel}>{PROPERTY}, service history</p>
            <ol className={styles.history}>
              {HISTORY.map(([title, date, text]) => (
                <li key={title}>
                  <strong>{title}</strong>
                  <span className={styles.historyDate}>{date}</span>
                  <span>{text}</span>
                </li>
              ))}
            </ol>
            <p className={styles.smallNote}>The interval comes from the customer agreement, not from a recommendation.</p>
          </div>
        </div>

        <div className={styles.column}>
          <div className={styles.sheet}>
            <p className={styles.question}>Can these visits fit into the same crew&rsquo;s day?</p>
            <p className={styles.detailMeta}>Proposed for Tuesday 10 November. Crew B is available 8:00 to 16:30.</p>
            <div className={styles.mapWrap}>
              <AreaMap selected={selected} onSelect={setSelected} />
            </div>
            <div className={styles.day}>
              <div className={styles.dayAxis} aria-hidden="true">
                {Array.from({ length: DAY_HOURS + 1 }, (_, hour) => <span key={hour} style={{ left: `${(hour / DAY_HOURS) * 100}%` }}>{DAY_START + hour}:00</span>)}
              </div>
              <div className={styles.dayRow}>
                <span className={styles.dayLabel}>Crew B, proposed</span>
                <span className={styles.dayTrack}>
                  {TRAVEL.map((segment) => <span key={segment[0]} className={styles.travel} style={position(segment)} />)}
                  {STOPS.map((item) => (
                    <button key={item.id} type="button" className={styles.slot} data-state={selected === item.id ? "selected" : "plain"} style={position(item.slot)} onClick={() => setSelected(item.id)} aria-label={`Stop ${item.order}, ${item.name}, ${item.slotLabel}`}>{item.order}</button>
                  ))}
                </span>
              </div>
              {STOPS.map((item) => (
                <button key={item.id} type="button" className={styles.dayRow} data-state={selected === item.id ? "selected" : "plain"} aria-pressed={selected === item.id} onClick={() => setSelected(item.id)}>
                  <span className={styles.dayLabel}><span className={styles.stopNumber}>{item.order}</span>{item.name}<span className={styles.dayTimes}>Window {item.windowLabel.toLowerCase()}. Proposed {item.slotLabel}.</span></span>
                  <span className={styles.dayTrack}>
                    <span className={styles.window} style={position(item.window)} />
                    <span className={styles.slotBar} style={position(item.slot)} />
                  </span>
                </button>
              ))}
            </div>
            <p className={styles.smallNote}>Hatched: the customer&rsquo;s agreed window. Solid: the proposed visit. Cedar Court stays inside its afternoon-only window.</p>
          </div>
        </div>
      </div>

      <div className={styles.stopDetail} aria-live="polite">
        <div>
          <p className={styles.detailTitle}><span className={styles.stopNumber}>{stop.order}</span>{stop.name} <Tag tone="proposed">Proposed, not booked</Tag></p>
          <dl className={styles.briefing}>
            <div><dt>Agreed service</dt><dd>{stop.service}</dd></div>
            <div><dt>Previous visit</dt><dd>{stop.previous}</dd></div>
            <div><dt>Access instructions</dt><dd>{stop.access}</dd></div>
            <div><dt>Expected duration</dt><dd>{stop.duration}</dd></div>
          </dl>
        </div>
        <div>
          <p className={styles.sheetLabel}>Checked before proposing</p>
          <ul className={styles.checks}>
            {CHECKS.map(([check, tone, result]) => <li key={check}><span>{check}</span><Tag tone={tone}>{result}</Tag></li>)}
          </ul>
        </div>
      </div>
    </Example>
  );
}
