"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import styles from "./construction.module.css";

const INK = "#262829";
const SWING = "#9a9b9b";

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

type Rect = { x: number; y: number; w: number; h: number };

function wallWithOpenings(axis: "x" | "y", fixed: number, thickness: number, from: number, to: number, openings: number[], width: number): Rect[] {
  const edges = [from, ...openings.flatMap((center) => [center - width / 2, center + width / 2]), to];
  const rects: Rect[] = [];
  for (let index = 0; index < edges.length; index += 2) {
    const start = edges[index];
    const length = edges[index + 1] - start;
    if (length <= 0) continue;
    rects.push(axis === "x" ? { x: start, y: fixed - thickness / 2, w: length, h: thickness } : { x: fixed - thickness / 2, y: start, w: thickness, h: length });
  }
  return rects;
}

function Walls({ rects }: { rects: Rect[] }) {
  return <>{rects.map((rect, index) => <rect key={index} x={rect.x} y={rect.y} width={rect.w} height={rect.h} fill={INK} />)}</>;
}

function Door({ hinge, wall, depth, leaf, width }: { hinge: number; wall: number; depth: 1 | -1; leaf: number; width: number }) {
  const tip = wall + depth * leaf;
  return (
    <g>
      <line x1={hinge} y1={wall} x2={hinge} y2={tip} stroke={INK} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      <path d={`M ${hinge} ${tip} A ${leaf} ${leaf} 0 0 ${depth < 0 ? 1 : 0} ${hinge + width} ${wall}`} fill="none" stroke={SWING} strokeWidth="1" vectorEffect="non-scaling-stroke" />
    </g>
  );
}

function PlanLabel({ x, y, width, height, children, strong }: { x: number; y: number; width: number; height: number; children: ReactNode; strong?: boolean }) {
  const position: CSSProperties = { left: `${(x / width) * 100}%`, top: `${(y / height) * 100}%` };
  return <span className={`${styles.planLabel} ${strong ? styles.planLabelStrong : ""}`} style={position}>{children}</span>;
}

const PLAN_W = 360;
const PLAN_H = 240;
const DOOR_W = 18;
const CORRIDOR = { top: 100, bottom: 140 };
const DOORS = Array.from({ length: 12 }, (_, index) => ({ id: `D${index + 1}`, x: 30 + 60 * (index % 6), top: index < 6 }));
const UNQUOTED = new Set(["D11", "D12"]);

function DoorPlan({ highlight }: { highlight: boolean }) {
  const centers = (top: boolean) => DOORS.filter((door) => door.top === top).map((door) => door.x);
  const walls: Rect[] = [
    { x: 0, y: 0, w: PLAN_W, h: 6 }, { x: 0, y: PLAN_H - 6, w: PLAN_W, h: 6 },
    { x: 0, y: 0, w: 6, h: PLAN_H }, { x: PLAN_W - 6, y: 0, w: 6, h: PLAN_H },
    ...wallWithOpenings("x", CORRIDOR.top, 3, 6, PLAN_W - 6, centers(true), DOOR_W),
    ...wallWithOpenings("x", CORRIDOR.bottom, 3, 6, PLAN_W - 6, centers(false), DOOR_W),
    ...[60, 120, 180, 240, 300].flatMap((x) => [
      { x: x - 1.5, y: 6, w: 3, h: CORRIDOR.top - 6 },
      { x: x - 1.5, y: CORRIDOR.bottom, w: 3, h: PLAN_H - 6 - CORRIDOR.bottom },
    ]),
  ];
  return (
    <div className={styles.planFrame} style={{ aspectRatio: `${PLAN_W} / ${PLAN_H}` }}>
      <svg viewBox={`0 0 ${PLAN_W} ${PLAN_H}`} role="img" aria-label="Level 2 floor plan: six rooms on each side of a corridor, with twelve numbered doors, D1 to D12.">
        <rect width={PLAN_W} height={PLAN_H} fill="#fff" />
        {DOORS.filter((door) => UNQUOTED.has(door.id)).map((door) => (
          <rect key={door.id} className={styles.tint} data-on={highlight} x={door.x - 30 + 4.5} y={CORRIDOR.bottom + 1.5} width={51} height={PLAN_H - CORRIDOR.bottom - 7.5} />
        ))}
        <Walls rects={walls} />
        {DOORS.map((door) => (
          <Door key={door.id} hinge={door.x - DOOR_W / 2} wall={door.top ? CORRIDOR.top - 1.5 : CORRIDOR.bottom + 1.5} depth={door.top ? -1 : 1} leaf={DOOR_W} width={DOOR_W} />
        ))}
      </svg>
      {DOORS.map((door) => (
        <PlanLabel key={door.id} x={door.x} y={door.top ? 52 : 194} width={PLAN_W} height={PLAN_H} strong={highlight && UNQUOTED.has(door.id)}>{door.id}</PlanLabel>
      ))}
      <PlanLabel x={PLAN_W / 2} y={(CORRIDOR.top + CORRIDOR.bottom) / 2} width={PLAN_W} height={PLAN_H}>Corridor</PlanLabel>
    </div>
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
          <span>For estimator review: the quote may leave them out on purpose.</span>
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
          <p className={styles.sheetMeta}>Level 2 floor plan</p>
        </div>
        <div className={styles.versus} aria-hidden="true"><span>&ne;</span></div>
        <div className={styles.sheet}>
          <p className={styles.sheetLabel}>Source B</p>
          <p className={styles.sheetTitle}>Subcontractor quote</p>
          <p className={styles.figure}><span>10</span> doors included</p>
          <table className={styles.quote}>
            <thead><tr><th>Item</th><th>Qty</th></tr></thead>
            <tbody>
              <tr className={styles.quoteRow} data-on={show}><td>Interior doors D1 to D10, supply and install</td><td>10</td></tr>
              <tr><td>Partition walls, as drawn</td><td>Incl.</td></tr>
              <tr><td>Paint to walls and door frames</td><td>Incl.</td></tr>
              <tr><td>Skirting and trim</td><td>Incl.</td></tr>
            </tbody>
          </table>
          <p className={styles.sheetMeta}>{show ? "D11 and D12 are not in the quote’s door list." : "Interior fit-out, level 2"}</p>
        </div>
      </div>
    </Example>
  );
}

const ROOM_W = 250;
const ROOM_H = 170;

function RoomPlan({ revised }: { revised: boolean }) {
  const body = { x0: 0, y0: 0, x1: 166, y1: ROOM_H };
  const walls: Rect[] = [
    { x: body.x0, y: body.y0, w: body.x1, h: 5 }, { x: body.x0, y: body.y1 - 5, w: body.x1, h: 5 },
    { x: body.x0, y: body.y0, w: 5, h: body.y1 },
    ...wallWithOpenings("y", 84, 2.5, 5, ROOM_H - 5, [62, 108], 14),
    ...wallWithOpenings("x", 85, 2.5, 5, body.x1 - 2.5, [44, 124], 14),
    ...(revised
      ? [
          ...wallWithOpenings("y", body.x1, 5, 0, ROOM_H, [44, 128], 14),
          { x: body.x1, y: 0, w: ROOM_W - body.x1, h: 5 }, { x: body.x1, y: ROOM_H - 5, w: ROOM_W - body.x1, h: 5 },
          { x: ROOM_W - 5, y: 0, w: 5, h: ROOM_H },
          ...wallWithOpenings("x", 85, 2.5, body.x1, ROOM_W - 5, [208], 14),
        ]
      : [{ x: body.x1 - 5, y: 0, w: 5, h: ROOM_H }]),
  ];
  return (
    <div className={styles.planFrame} style={{ aspectRatio: `${ROOM_W} / ${ROOM_H}` }}>
      <svg viewBox={`0 0 ${ROOM_W} ${ROOM_H}`} role="img" aria-label={revised ? "Requested revision: the four original rooms with two new rooms added on the right, highlighted." : "Original plan: four rooms."}>
        <rect width={ROOM_W} height={ROOM_H} fill="#fff" />
        {revised ? (
          <rect className={styles.tint} data-on="true" x={body.x1} y={5} width={ROOM_W - body.x1 - 5} height={ROOM_H - 10} />
        ) : (
          <rect x={body.x1 + 4} y={4} width={ROOM_W - body.x1 - 8} height={ROOM_H - 8} fill="none" stroke="#c9caca" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
        )}
        <Walls rects={walls} />
      </svg>
      {[["Room 1", 44, 44], ["Room 2", 125, 44], ["Room 3", 44, 128], ["Room 4", 125, 128]].map(([label, x, y]) => (
        <PlanLabel key={label} x={Number(x)} y={Number(y)} width={ROOM_W} height={ROOM_H}>{label}</PlanLabel>
      ))}
      {revised && [["Room 5", 208, 44], ["Room 6", 208, 128]].map(([label, x, y]) => (
        <PlanLabel key={label} x={Number(x)} y={Number(y)} width={ROOM_W} height={ROOM_H} strong>{label}</PlanLabel>
      ))}
    </div>
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
    lines: ["Studs and plasterboard for rooms 1 to 4", "Four interior door sets", "Ordered, not yet delivered"],
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
      finding={<p><strong>Change review:</strong> scope, materials, and affected work gathered for review. Three questions remain open, and nothing is approved.</p>}
      next={<p>Review the impact and prepare a change proposal for the client.</p>}
    >
      <div className={styles.revisions}>
        <div className={styles.sheet}>
          <p className={styles.sheetLabel}>Version 1</p>
          <p className={styles.sheetTitle}>Original plan</p>
          <RoomPlan revised={false} />
          <p className={styles.sheetMeta}>Four rooms</p>
        </div>
        <div className={styles.sheet}>
          <p className={styles.sheetLabel}>Version 2</p>
          <p className={styles.sheetTitle}>Requested revision</p>
          <RoomPlan revised />
          <p className={styles.sheetMeta}><span className={styles.swatch} aria-hidden="true" />Rooms 5 and 6 added</p>
        </div>
      </div>
      <div className={styles.questions}>
        <div>
          <div className={styles.questionsHead}>
            <p className={styles.sheetLabel}>Questions linked to the change</p>
            <span className={styles.questionsCount}>3 open</span>
          </div>
          <div className={styles.questionList}>
            {CONSEQUENCES.map((item, index) => (
              <button key={item.area} type="button" className={styles.question} aria-pressed={selected === index} onClick={() => setSelected(index)}>
                <span className={styles.questionArea}>{item.area}</span>
                <span className={styles.questionText}>{item.question}</span>
              </button>
            ))}
          </div>
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
const FRAME = "227,72 268,59 268,170 227,150";

function Corridor({ captured, active, onSelect }: { captured: boolean; active: boolean; onSelect: () => void }) {
  const tone = captured
    ? { wallNear: "#bdbebc", wallFar: "#cfd0ce", ceilingNear: "#a9aaa8", ceilingFar: "#bebfbd", floorNear: "#8e8f8d", floorFar: "#a7a8a6", back: "#b9bab8", line: "#5a5c5d" }
    : { wallNear: "#f2f2ef", wallFar: "#fbfbf9", ceilingNear: "#ecece9", ceilingFar: "#f6f6f3", floorNear: "#d9d9d5", floorFar: "#ebebe7", back: "#ffffff", line: INK };
  const id = captured ? "captured" : "planned";
  return (
    <div className={styles.corridor}>
      <svg viewBox="0 0 320 200" role="img" aria-label={captured ? "Schematic of the 14 May site capture: the same corridor, with no door visible in opening C-14." : "Planned corridor view, with a door installed in opening C-14."}>
        <defs>
          <linearGradient id={`${id}-left`} x1="0" x2="1" y1="0" y2="0"><stop offset="0" stopColor={tone.wallNear} /><stop offset="1" stopColor={tone.wallFar} /></linearGradient>
          <linearGradient id={`${id}-right`} x1="1" x2="0" y1="0" y2="0"><stop offset="0" stopColor={tone.wallNear} /><stop offset="1" stopColor={tone.wallFar} /></linearGradient>
          <linearGradient id={`${id}-ceiling`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={tone.ceilingNear} /><stop offset="1" stopColor={tone.ceilingFar} /></linearGradient>
          <linearGradient id={`${id}-floor`} x1="0" x2="0" y1="1" y2="0"><stop offset="0" stopColor={tone.floorNear} /><stop offset="1" stopColor={tone.floorFar} /></linearGradient>
        </defs>
        <polygon points="0,0 130,75 130,125 0,200" fill={`url(#${id}-left)`} />
        <polygon points="320,0 190,75 190,125 320,200" fill={`url(#${id}-right)`} />
        <polygon points="0,0 320,0 190,75 130,75" fill={`url(#${id}-ceiling)`} />
        <polygon points="0,200 320,200 190,125 130,125" fill={`url(#${id}-floor)`} />
        <rect x="130" y="75" width="60" height="50" fill={tone.back} />
        <g fill="none" stroke={tone.line} strokeWidth="1" vectorEffect="non-scaling-stroke" strokeLinejoin="round">
          <line x1="0" y1="0" x2="130" y2="75" vectorEffect="non-scaling-stroke" />
          <line x1="320" y1="0" x2="190" y2="75" vectorEffect="non-scaling-stroke" />
          <line x1="0" y1="200" x2="130" y2="125" vectorEffect="non-scaling-stroke" />
          <line x1="320" y1="200" x2="190" y2="125" vectorEffect="non-scaling-stroke" />
          <rect x="130" y="75" width="60" height="50" vectorEffect="non-scaling-stroke" />
          <polygon points="60,64 92,82 92,148 60,166" vectorEffect="non-scaling-stroke" />
        </g>
        {!captured && (
          <g fill="#ffffff" stroke={tone.line} strokeWidth="1" vectorEffect="non-scaling-stroke">
            <polygon points="146,14 174,14 171,22 149,22" vectorEffect="non-scaling-stroke" />
            <polygon points="152,44 168,44 166.5,49 153.5,49" vectorEffect="non-scaling-stroke" />
            <polygon points="155.5,62 164.5,62 163.8,65 156.2,65" vectorEffect="non-scaling-stroke" />
          </g>
        )}
        <polygon points={FRAME} fill={captured ? "#7d7f7e" : "#e4e4e1"} stroke={tone.line} strokeWidth="1" vectorEffect="non-scaling-stroke" />
        {captured ? (
          <g>
            <polygon points={OPENING} fill="#3d3f40" />
            <polygon points="231,148 264,167 264,145 231,131" fill="#5f6160" />
            <g stroke="#a3a4a2" strokeWidth="2" vectorEffect="non-scaling-stroke">
              <line x1="241" y1="69.5" x2="241" y2="137" vectorEffect="non-scaling-stroke" />
              <line x1="253" y1="65.8" x2="253" y2="141" vectorEffect="non-scaling-stroke" />
            </g>
          </g>
        ) : (
          <g>
            <polygon points={OPENING} fill="#d5d6d4" stroke={tone.line} strokeWidth="1" vectorEffect="non-scaling-stroke" />
            <line x1="235" y1="116" x2="235" y2="122" stroke={tone.line} strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </g>
        )}
      </svg>
      <button
        type="button"
        className={`${styles.marker} ${captured ? styles.markerFinding : ""}`}
        aria-pressed={active}
        aria-label={`Opening C-14, ${captured ? "site capture" : "planned view"}. ${active ? "Hide" : "Show"} the installation update.`}
        onClick={onSelect}
      >
        <span>C-14</span>
      </button>
      {captured && <span className={styles.captureStamp}>Captured 14 May, 10:20</span>}
    </div>
  );
}

export function SiteCheck() {
  const [selected, setSelected] = useState(false);
  const toggle = () => setSelected(!selected);
  return (
    <Example
      title="Level 2 corridor, opening C-14"
      situation={<p>The plan shows a door at opening C-14. A site capture from 14 May shows the same opening.</p>}
      finding={<p><strong>Door not visible in this capture.</strong> Check it against the latest installation update. Not visible does not mean missing.</p>}
      next={<p>Ask the site team to confirm the door at C-14.</p>}
    >
      <div className={styles.views}>
        <div>
          <p className={styles.viewLabel}><span className={styles.dotPlanned} aria-hidden="true" />Planned</p>
          <Corridor captured={false} active={selected} onSelect={toggle} />
          <p className={styles.sheetMeta}>Project model</p>
        </div>
        <div>
          <p className={styles.viewLabel}><span className={styles.dotFinding} aria-hidden="true" />Captured on site</p>
          <Corridor captured active={selected} onSelect={toggle} />
          <p className={styles.sheetMeta}>Schematic of a dated capture, not a site photograph</p>
        </div>
      </div>
      <div className={styles.siteFinding} data-open={selected}>
        <button type="button" className={styles.siteFindingToggle} aria-expanded={selected} onClick={toggle}>
          <span><strong>C-14:</strong> door not visible in the 14 May capture</span>
          <span className={styles.findingAction}>{selected ? "Hide the update" : "Check the installation update"} <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" /></span>
        </button>
        {selected && (
          <div className={styles.siteContext}>
            <p className={styles.sheetLabel}>Latest installation update, 12 May</p>
            <p>Corridor C doors are scheduled for installation on 16 May.</p>
            <p className={styles.evidenceNote}>The capture may predate the installation. The site team confirms what is there now.</p>
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
  { id: "a" as const, name: "Option A", title: "Keep the original sequence", detail: "The flooring crew waits for delivery.", tradeoff: "Nothing moves. Finishing work starts once the floor is in." },
  { id: "b" as const, name: "Option B", title: "Move eligible work forward", detail: "Complete work that does not depend on the flooring.", tradeoff: "Ceiling and painting move earlier. Flooring and the final clean still wait, and finished walls may need protection while the floor goes in." },
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
      finding={<p><strong>An alternative sequence to review.</strong> Option B rests on example assumptions the planner has not yet confirmed.</p>}
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
          <span className={styles.boardAxis} aria-hidden="true">Earlier <ArrowRight size={13} strokeWidth={1.5} /> Later</span>
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
