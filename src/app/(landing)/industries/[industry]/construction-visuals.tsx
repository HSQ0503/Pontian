"use client";

import { useState, type ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import styles from "./construction.module.css";

type ExampleProps = {
  title: string;
  children: ReactNode;
  situation: ReactNode;
  finding: ReactNode;
  next: ReactNode;
  findingLabel?: string;
};

function Example({ title, children, situation, finding, next, findingLabel = "Finding for review" }: ExampleProps) {
  return (
    <figure className={styles.example}>
      <figcaption className={styles.exampleBar}>
        <span className={styles.exampleTag}>Example workflow</span>
        <span className={styles.exampleTitle}>{title}</span>
        <span className={styles.exampleNote}>Illustration, not a client project</span>
      </figcaption>
      <div className={styles.exampleBody}>{children}</div>
      <ol className={styles.outcome}>
        <li data-role="situation"><span className={styles.outcomeLabel}>Situation</span>{situation}</li>
        <li data-role="finding"><span className={styles.outcomeLabel}>{findingLabel}</span>{finding}</li>
        <li data-role="next"><span className={styles.outcomeLabel}>Next step for your team</span>{next}</li>
      </ol>
    </figure>
  );
}

const DOORS = Array.from({ length: 12 }, (_, index) => ({ id: `D${index + 1}`, x: 30 + 60 * (index % 6), top: index < 6 }));
const UNQUOTED = new Set(["D11", "D12"]);

function DoorPlan({ highlight }: { highlight: boolean }) {
  return (
    <svg viewBox="0 0 360 240" className={styles.plan} role="img" aria-label="Floor plan with six rooms on each side of a corridor and twelve numbered doors, D1 to D12.">
      <rect x="4" y="4" width="352" height="232" fill="#fff" stroke="#262829" strokeWidth="3" />
      {[60, 120, 180, 240, 300].map((x) => <g key={x}><line x1={x} y1="4" x2={x} y2="100" stroke="#262829" strokeWidth="2" /><line x1={x} y1="140" x2={x} y2="236" stroke="#262829" strokeWidth="2" /></g>)}
      <line x1="4" y1="100" x2="356" y2="100" stroke="#262829" strokeWidth="2" />
      <line x1="4" y1="140" x2="356" y2="140" stroke="#262829" strokeWidth="2" />
      <text x="180" y="124" textAnchor="middle" className={styles.planText}>Corridor</text>
      {DOORS.map((door) => {
        const wall = door.top ? 100 : 140;
        const swing = door.top ? -18 : 18;
        const marked = highlight && UNQUOTED.has(door.id);
        return (
          <g key={door.id}>
            <line x1={door.x - 9} y1={wall} x2={door.x + 9} y2={wall} stroke="#fff" strokeWidth="4" />
            {marked && <circle cx={door.x} cy={wall + swing / 2} r="17" fill="#fed603" stroke="#262829" strokeDasharray="3 3" />}
            <line x1={door.x - 9} y1={wall} x2={door.x - 9} y2={wall + swing} stroke="#262829" strokeWidth="2" />
            <path d={`M ${door.x - 9} ${wall + swing} A 18 18 0 0 ${door.top ? 1 : 0} ${door.x + 9} ${wall}`} fill="none" stroke="#262829" strokeWidth="1" />
            <text x={door.x} y={door.top ? 70 : 182} textAnchor="middle" className={`${styles.doorLabel} ${marked ? styles.doorLabelMarked : ""}`}>{door.id}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function BidCheck() {
  const [show, setShow] = useState(false);
  return (
    <Example
      title="Interior fit-out bid, level 2"
      situation={<p>The drawing shows <strong>12 doors</strong>. The subcontractor quote includes <strong>10</strong>.</p>}
      finding={
        <button type="button" className={styles.findingButton} aria-pressed={show} onClick={() => setShow(!show)}>
          <strong>2 doors may be missing from the quote.</strong>
          <span>For estimator review. The quote may leave them out on purpose.</span>
          <span className={styles.findingAction}>{show ? "Hide the doors" : "Show where they are"} <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" /></span>
        </button>
      }
      next={<p>Confirm the door count with the subcontractor before the bid goes out.</p>}
    >
      <div className={styles.sources}>
        <div className={styles.sheet}>
          <p className={styles.sheetLabel}>Source A</p>
          <p className={styles.sheetTitle}>Project drawing</p>
          <p className={styles.figure}><span>12</span> doors shown</p>
          <DoorPlan highlight={show} />
          <p className={styles.sheetMeta}>Level 2 floor plan, doors D1 to D12</p>
        </div>
        <div className={styles.versus} aria-hidden="true"><span>12</span><i>vs</i><span>10</span></div>
        <div className={styles.sheet}>
          <p className={styles.sheetLabel}>Source B</p>
          <p className={styles.sheetTitle}>Subcontractor quote</p>
          <p className={styles.figure}><span>10</span> doors included</p>
          <table className={styles.quote}>
            <thead><tr><th>Item</th><th>Qty</th></tr></thead>
            <tbody>
              <tr className={show ? styles.marked : undefined}><td>Interior doors D1 to D10, supply and install</td><td>10</td></tr>
              <tr><td>Partition walls, as drawn</td><td>Incl.</td></tr>
              <tr><td>Paint to walls and door frames</td><td>Incl.</td></tr>
              <tr><td>Skirting and trim</td><td>Incl.</td></tr>
            </tbody>
          </table>
          <p className={styles.sheetMeta}>{show ? "D11 and D12 do not appear in the quote's door list." : "Quote for interior fit-out, level 2"}</p>
        </div>
      </div>
    </Example>
  );
}

function RoomPlan({ revised }: { revised: boolean }) {
  return (
    <svg viewBox="0 0 250 170" className={styles.plan} role="img" aria-label={revised ? "Revised plan with four original rooms and two new rooms added on the right, highlighted." : "Original plan with four rooms."}>
      <rect x="6" y="6" width="160" height="158" fill="#fff" stroke="#262829" strokeWidth="3" />
      <line x1="86" y1="6" x2="86" y2="164" stroke="#262829" strokeWidth="2" />
      <line x1="6" y1="85" x2="166" y2="85" stroke="#262829" strokeWidth="2" />
      {[["Room 1", 46, 50], ["Room 2", 126, 50], ["Room 3", 46, 129], ["Room 4", 126, 129]].map(([label, x, y]) => <text key={label} x={x} y={y} textAnchor="middle" className={styles.planText}>{label}</text>)}
      {revised ? (
        <g>
          <rect x="166" y="6" width="78" height="79" fill="#fed603" stroke="#262829" strokeWidth="3" />
          <rect x="166" y="85" width="78" height="79" fill="#fed603" stroke="#262829" strokeWidth="3" />
          <text x="205" y="50" textAnchor="middle" className={styles.planTextStrong}>New room 5</text>
          <text x="205" y="129" textAnchor="middle" className={styles.planTextStrong}>New room 6</text>
        </g>
      ) : (
        <rect x="166" y="6" width="78" height="158" fill="none" stroke="#b9baba" strokeDasharray="4 4" />
      )}
    </svg>
  );
}

const CONSEQUENCES = [
  {
    area: "Quoted work",
    question: "Are the extra walls and doors included?",
    source: "Quote Q-2047, partitions and doors",
    lines: ["Partition walls, rooms 1 to 4, as drawn", "Interior doors for rooms 1 to 4"],
    note: "The quote describes the original four rooms.",
  },
  {
    area: "Materials",
    question: "What needs to be added to the order?",
    source: "Material order MO-112",
    lines: ["Studs and plasterboard for rooms 1 to 4", "Four interior door sets", "Status: ordered, not yet delivered"],
    note: "The order was placed against the original plan.",
  },
  {
    area: "Upcoming work",
    question: "Does the electrical installation need to change?",
    source: "Schedule, next two weeks",
    lines: ["Framing, rooms 1 to 4", "Electrical first fix, rooms 1 to 4, after framing"],
    note: "Electrical work is planned for the original rooms only.",
  },
];

export function ChangeImpact() {
  const [selected, setSelected] = useState(0);
  const consequence = CONSEQUENCES[selected];
  return (
    <Example
      title="Client requests two additional rooms"
      situation={<p>The client asks for two more rooms after the quote, orders, and schedule are in place.</p>}
      finding={<p><strong>Change review:</strong> scope, materials, and affected work gathered for review. Three questions are open and nothing has been approved.</p>}
      next={<p>Review the impact and prepare a change proposal for the client.</p>}
    >
      <div className={styles.revisions}>
        <div className={styles.sheet}>
          <p className={styles.sheetLabel}>Version 1</p>
          <p className={styles.sheetTitle}>Original plan</p>
          <RoomPlan revised={false} />
        </div>
        <div className={styles.sheet}>
          <p className={styles.sheetLabel}>Version 2</p>
          <p className={styles.sheetTitle}>Requested revision</p>
          <RoomPlan revised />
          <p className={styles.sheetMeta}><span className={styles.swatch} aria-hidden="true" /> Two rooms added</p>
        </div>
      </div>
      <div className={styles.questions}>
        <p className={styles.sheetLabel}>Questions linked to the change</p>
        <div className={styles.questionList}>
          {CONSEQUENCES.map((item, index) => (
            <button key={item.area} type="button" className={styles.question} aria-pressed={selected === index} onClick={() => setSelected(index)}>
              <span className={styles.questionArea}>{item.area}</span>
              <span className={styles.questionText}>{item.question}</span>
              <span className={styles.questionStatus}>Open</span>
            </button>
          ))}
        </div>
        <div className={styles.evidence} aria-live="polite">
          <p className={styles.sheetLabel}>Supporting source</p>
          <p className={styles.evidenceTitle}>{consequence.source}</p>
          <ul>{consequence.lines.map((line) => <li key={line}>{line}</li>)}</ul>
          <p className={styles.evidenceNote}>{consequence.note}</p>
        </div>
      </div>
    </Example>
  );
}

const OPENING = "230,73 265,62 265,168 230,148";

function Corridor({ captured, active, onSelect }: { captured: boolean; active: boolean; onSelect: () => void }) {
  const wall = captured ? "#c9cac8" : "#fff";
  const line = captured ? "#555758" : "#262829";
  return (
    <div className={styles.corridor}>
      <svg viewBox="0 0 320 200" role="img" aria-label={captured ? "Schematic of the site capture: the same corridor opening, with no door visible." : "Planned corridor view with a door installed in the marked opening."}>
        <rect width="320" height="200" fill={captured ? "#b4b5b3" : "#f5f5f2"} />
        <polygon points="0,0 130,75 130,125 0,200" fill={wall} stroke={line} />
        <polygon points="320,0 190,75 190,125 320,200" fill={wall} stroke={line} />
        <polygon points="0,0 320,0 190,75 130,75" fill={captured ? "#a6a7a5" : "#eeeeec"} stroke={line} />
        <polygon points="0,200 320,200 190,125 130,125" fill={captured ? "#8f908e" : "#e2e2df"} stroke={line} />
        <rect x="130" y="75" width="60" height="50" fill={captured ? "#9d9e9c" : "#f9f9f7"} stroke={line} />
        <polygon points="60,64 92,82 92,148 60,166" fill="none" stroke={line} strokeWidth="2" />
        {captured ? (
          <g>
            <polygon points={OPENING} fill="#58595a" stroke={line} strokeWidth="2" />
            <polygon points="234,150 261,163 261,140 234,132" fill="#7c7d7b" />
            <line x1="230" y1="148" x2="265" y2="168" stroke="#2c2d2e" strokeWidth="3" />
          </g>
        ) : (
          <g>
            <polygon points={OPENING} fill="#d8d9d9" stroke={line} strokeWidth="2" />
            <circle cx="236" cy="117" r="2.5" fill={line} />
          </g>
        )}
      </svg>
      <button
        type="button"
        className={`${styles.marker} ${captured ? styles.markerFinding : ""}`}
        aria-pressed={active}
        aria-label={`Opening C-14, ${captured ? "site capture" : "planned view"}. ${active ? "Hide" : "Show"} the finding details.`}
        onClick={onSelect}
      >
        <span>C-14</span>
      </button>
      {captured && <span className={styles.captureStamp}>Captured 14 May, 10:20</span>}
      {captured && <span className={styles.captureFlag} aria-hidden="true">Door not visible</span>}
    </div>
  );
}

export function SiteCheck() {
  const [selected, setSelected] = useState(false);
  const toggle = () => setSelected(!selected);
  return (
    <Example
      title="Level 2 corridor, opening C-14"
      situation={<p>The plan shows a door at opening C-14. The site capture from 14 May shows the same opening.</p>}
      finding={<p><strong>Door not visible in this capture.</strong> Check against the latest installation update. Not visible does not mean missing.</p>}
      next={<p>Ask the site team to confirm the door at C-14.</p>}
    >
      <div className={styles.views}>
        <div>
          <p className={styles.viewLabel}><span className={styles.dotPlanned} aria-hidden="true" />Planned</p>
          <Corridor captured={false} active={selected} onSelect={toggle} />
          <p className={styles.sheetMeta}>Project model, door at C-14</p>
        </div>
        <div>
          <p className={styles.viewLabel}><span className={styles.dotFinding} aria-hidden="true" />Captured on site</p>
          <Corridor captured active={selected} onSelect={toggle} />
          <p className={styles.sheetMeta}>Schematic of a dated capture, not a photograph from a real site</p>
        </div>
      </div>
      <div className={`${styles.siteFinding} ${selected ? styles.siteFindingOpen : ""}`}>
        <button type="button" className={styles.siteFindingToggle} aria-expanded={selected} onClick={toggle}>
          <span><strong>C-14:</strong> door not visible in the 14 May capture</span>
          <span className={styles.findingAction}>{selected ? "Hide context" : "Check the installation update"} <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" /></span>
        </button>
        {selected && (
          <div className={styles.siteContext}>
            <p className={styles.sheetLabel}>Latest installation update</p>
            <p>12 May: corridor C doors scheduled for installation on 16 May.</p>
            <p className={styles.evidenceNote}>The capture may simply predate the installation. The site team confirms what is there now.</p>
          </div>
        )}
      </div>
    </Example>
  );
}

type Bar = { start: number; span: number; tone: "late" | "wait" | "moved" | "blocked" | "planned"; text: string };
type Row = { activity: string; bar: Bar; extra?: Bar };

const SLOTS = 7;
const PLANS: Record<"a" | "b", Row[]> = {
  a: [
    { activity: "Flooring delivery", bar: { start: 2, span: 1, tone: "late", text: "Delayed" } },
    { activity: "Flooring installation", bar: { start: 3, span: 2, tone: "planned", text: "After delivery" }, extra: { start: 0, span: 2, tone: "wait", text: "Crew waits" } },
    { activity: "Ceiling fixtures", bar: { start: 5, span: 1, tone: "planned", text: "Later" } },
    { activity: "Wall painting", bar: { start: 5, span: 1, tone: "planned", text: "Later" } },
    { activity: "Final clean", bar: { start: 6, span: 1, tone: "planned", text: "Last" } },
  ],
  b: [
    { activity: "Flooring delivery", bar: { start: 2, span: 1, tone: "late", text: "Delayed" } },
    { activity: "Flooring installation", bar: { start: 3, span: 2, tone: "blocked", text: "Still waits" } },
    { activity: "Ceiling fixtures", bar: { start: 0, span: 1, tone: "moved", text: "Moved" } },
    { activity: "Wall painting", bar: { start: 1, span: 1, tone: "moved", text: "Moved" } },
    { activity: "Final clean", bar: { start: 6, span: 1, tone: "blocked", text: "Still last" } },
  ],
};

const OPTIONS = [
  { id: "a" as const, name: "Option A", title: "Keep the original sequence", detail: "The flooring crew waits for delivery.", tradeoff: "Nothing moves. Finishing work starts after the floor is in." },
  { id: "b" as const, name: "Option B", title: "Move eligible work forward", detail: "Complete work that does not depend on the flooring.", tradeoff: "Ceiling and painting move earlier. Flooring and the final clean still wait, and finished walls may need protection while floors go in." },
];

const CONDITIONS = ["Work area available", "Required materials on site", "Suitable crew available"];

export function WayForward() {
  const [option, setOption] = useState<"a" | "b">("b");
  const rows = PLANS[option];
  return (
    <Example
      title="Flooring delivery delayed"
      situation={<p>The flooring delivery is late, and the original sequence depends on it.</p>}
      findingLabel="Result for review"
      finding={<p><strong>An alternative sequence to review.</strong> Option B depends on example assumptions the planner has not yet confirmed.</p>}
      next={<p>The planner checks feasibility before anything is rescheduled.</p>}
    >
      <div className={styles.sequence}>
        <p className={styles.sheetLabel}>Original sequence</p>
        <ol className={styles.chain}>
          <li data-late="true">Flooring arrives <span>Delayed</span></li>
          <li>Flooring installation</li>
          <li>Remaining finishing work</li>
        </ol>
      </div>
      <div className={styles.options} role="group" aria-label="Sequence options">
        {OPTIONS.map((item) => (
          <button key={item.id} type="button" className={styles.option} aria-pressed={option === item.id} onClick={() => setOption(item.id)}>
            <span className={styles.optionName}>{item.name}</span>
            <span className={styles.optionTitle}>{item.title}</span>
            <span className={styles.optionDetail}>{item.detail}</span>
            <span className={styles.optionTradeoff}>{item.tradeoff}</span>
          </button>
        ))}
      </div>
      <div className={styles.board}>
        <div className={styles.boardHead}>
          <p className={styles.sheetLabel}>{option === "a" ? "Option A, original sequence" : "Option B, alternative sequence to review"}</p>
          <span className={styles.boardAxis} aria-hidden="true">Earlier <ArrowRight size={12} strokeWidth={1.5} /> Later</span>
        </div>
        <ul className={styles.rows} aria-live="polite">
          {rows.map((row) => (
            <li key={row.activity}>
              <span className={styles.rowLabel}>
                {row.activity}
                <span className={styles.rowStatus}>{row.extra ? `${row.extra.text}, then ${row.bar.text.toLowerCase()}` : row.bar.text}</span>
              </span>
              <span className={styles.track} style={{ gridTemplateColumns: `repeat(${SLOTS}, minmax(0, 1fr))` }}>
                {[row.extra, row.bar].filter((bar): bar is Bar => Boolean(bar)).map((bar) => (
                  <span key={bar.text} className={styles.bar} data-tone={bar.tone} style={{ gridColumn: `${bar.start + 1} / span ${bar.span}` }}>{bar.text}</span>
                ))}
              </span>
            </li>
          ))}
        </ul>
        {option === "b" && (
          <div className={styles.conditions}>
            <p className={styles.sheetLabel}>Example assumptions to confirm</p>
            <ul>{CONDITIONS.map((condition) => <li key={condition}><span aria-hidden="true" />{condition}</li>)}</ul>
          </div>
        )}
      </div>
    </Example>
  );
}
