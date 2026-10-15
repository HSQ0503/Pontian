"use client";

import dynamic from "next/dynamic";
import { useCallback, useState, type CSSProperties } from "react";
import {
  Caption, frame, InteractionCue, Legend, ModelFigure, ModelViewport, PlanChip, Segmented, StepPlayer, StepRail, useNarrow, useStepPlayer, type RowState,
} from "./model-frame";
import {
  ALERT_CARD, ALL_COPY, BINDERS, BOARD_A, BOARD_B, BOARD_C, GROUPS, MEMO, MODES, NEW_NOTE, POLICY, ROOM_LABEL, STEP_COPY, STEPS, TASK_CARD, type Mode,
} from "./minerbo-fuchs-data";
import styles from "./minerbo-fuchs.module.css";

const Scene = dynamic(() => import("./minerbo-fuchs-scene"), { ssr: false });

const INK = "#17191a";
const SELECT = "#fed603";
const OK = "#007dfe";
const BLOCKED = "#f51625";
const SOFT = "#ecebe7";
const MID = "#d8d9d9";
const FAINT = "#b0b0ac";

type DrawState = { mode: Mode; step: number };

/* Details, each drawn in its own 280 × 220 box. */

const BAY_WIDTH = 268 / 3;
const binderLeft = (group: number, index: number) => 6 + group * BAY_WIDTH + 9 + index * 12;
const MEMO_X = binderLeft(MEMO.group, MEMO.index) + 4.5;
const NOTE_X = binderLeft(NEW_NOTE.group, NEW_NOTE.index) + 4.5;
const GROUP_FILLS = [MID, SOFT, "#fff"];

function LibraryDetail({ step, mine, sw, text }: { step: number; mine: boolean; sw: number; text: boolean }) {
  const open = mine && step >= 1 && step <= 3;
  return (
    <g stroke={INK} strokeWidth={sw} strokeLinejoin="round">
      {open && (
        <g>
          <path d={`M${MEMO_X} 78 L${MEMO_X} 56`} strokeDasharray="3 3" fill="none" />
          <rect x={22} y={4} width={104} height={50} fill="#fff" />
          {[12, 17, 40, 45].map((y) => <line key={y} x1={30} x2={y === 17 || y === 45 ? 84 : 116} y1={y} y2={y} stroke={FAINT} />)}
          <rect x={26} y={23} width={96} height={11} fill={step === 1 ? SELECT : SOFT} />
        </g>
      )}
      <rect x={0} y={58} width={280} height={8} fill="#fff" />
      <rect x={6} y={66} width={268} height={130} fill="#fff" />
      <rect x={12} y={196} width={256} height={6} fill={SOFT} />
      <rect x={6} y={130} width={268} height={4} fill={SOFT} />
      {[1, 2].map((bay) => <line key={bay} x1={6 + bay * BAY_WIDTH} x2={6 + bay * BAY_WIDTH} y1={66} y2={196} />)}
      {BINDERS.map((count, group) => Array.from({ length: count }, (_, index) => {
        const x = binderLeft(group, index);
        const memo = group === MEMO.group && index === MEMO.index;
        return (
          <g key={`${group}-${index}`}>
            <rect x={x} y={80} width={9} height={50} fill={memo && mine && step <= 1 ? SELECT : GROUP_FILLS[group]} />
            <rect x={x + 2} y={96} width={5} height={10} fill="#fff" strokeWidth={sw * 0.6} />
          </g>
        );
      }))}
      {mine && step === 4 && <rect x={binderLeft(NEW_NOTE.group, NEW_NOTE.index)} y={80} width={9} height={50} fill={OK} fillOpacity={0.16} stroke={OK} strokeDasharray="3 2" />}
      {[0, 1, 2].map((group) => {
        const x = 6 + group * BAY_WIDTH + 9;
        return (
          <g key={group} fill="#fff">
            <rect x={x} y={170} width={32} height={26} />
            <rect x={x + 38} y={180} width={32} height={16} />
            <rect x={x + 40} y={170} width={28} height={10} />
          </g>
        );
      })}
      {text && GROUPS.map((group, index) => <text key={group} x={6 + (index + 0.5) * BAY_WIDTH} y={220} textAnchor="middle" stroke="none">{group}</text>)}
    </g>
  );
}

function TableDetail({ focus, draft, sw }: { focus: boolean; draft: boolean; sw: number }) {
  return (
    <g stroke={INK} strokeWidth={sw} strokeLinejoin="round">
      {[80, 140, 200].map((x) => (
        <g key={x} fill="#fff">
          <rect x={x - 20} y={20} width={40} height={24} rx={3} />
          <rect x={x - 18} y={14} width={36} height={5} fill={SOFT} />
          <rect x={x - 20} y={176} width={40} height={24} rx={3} />
          <rect x={x - 18} y={201} width={36} height={5} fill={SOFT} />
        </g>
      ))}
      <rect x={30} y={50} width={220} height={120} rx={4} fill={focus ? SELECT : "#fff"} fillOpacity={focus ? 0.5 : 1} />
      <rect x={48} y={80} width={44} height={30} rx={2} fill={SOFT} />
      <g transform="rotate(-7 145 99)">
        <rect x={128} y={76} width={34} height={46} fill={draft ? OK : "#fff"} fillOpacity={draft ? 0.22 : 1} stroke={draft ? OK : INK} />
        {[86, 92, 98, 108, 114].map((y) => <line key={y} x1={133} x2={y === 98 ? 146 : 157} y1={y} y2={y} stroke={draft ? OK : FAINT} />)}
      </g>
      <rect x={196} y={70} width={30} height={40} fill="#fff" />
      <rect x={192} y={74} width={30} height={40} fill="#fff" />
      <circle cx={112} cy={142} r={6} fill="#fff" />
    </g>
  );
}

const COLUMN_WIDTH = 280 / 3;
const columnCenter = (column: number) => COLUMN_WIDTH * (column + 0.5);
const cardBox = (column: number, index: number, stacked: boolean) => stacked
  ? { x: columnCenter(column) - 38 + index * 4, y: 34 + index * 8 }
  : { x: columnCenter(column) - 36, y: 34 + index * 42 };

function BoardDetail({ counts, stacked, selected, alert, sw }: { counts: readonly number[]; stacked: boolean; selected?: [number, number]; alert?: [number, number]; sw: number }) {
  return (
    <g stroke={INK} strokeWidth={sw} strokeLinejoin="round">
      <rect x={0} y={0} width={280} height={170} fill="#fff" />
      <rect x={20} y={170} width={240} height={6} fill={SOFT} />
      {[1, 2].map((column) => <line key={column} x1={column * COLUMN_WIDTH} x2={column * COLUMN_WIDTH} y1={10} y2={160} stroke={MID} />)}
      {counts.map((count, column) => (
        <g key={column}>
          <rect x={columnCenter(column) - 38} y={10} width={76} height={14} fill={SOFT} />
          <circle cx={columnCenter(column) - 29} cy={17} r={3.5} fill={INK} stroke="none" />
          {Array.from({ length: count }, (_, index) => {
            const { x, y } = cardBox(column, index, stacked);
            const isSelected = selected?.[0] === column && selected[1] === index;
            const isAlert = alert?.[0] === column && alert[1] === index;
            return (
              <g key={index}>
                <rect x={x} y={y} width={72} height={32} fill={isAlert ? BLOCKED : isSelected ? SELECT : "#fff"} />
                {!isAlert && (
                  <>
                    <line x1={x + 7} x2={x + 46} y1={y + 10} y2={y + 10} stroke={FAINT} />
                    <line x1={x + 7} x2={x + 32} y1={y + 17} y2={y + 17} stroke={FAINT} />
                    <rect x={x + 52} y={y + 24} width={13} height={3} fill={INK} stroke="none" />
                  </>
                )}
              </g>
            );
          })}
        </g>
      ))}
    </g>
  );
}

/* Layouts: three details in a row on wide screens, a stacked sheet on phones. */

type Place = { x: number; y: number; s: number };
const LAYOUT = {
  wide: {
    width: 960, height: 540,
    mine: { library: { x: 30, y: 180, s: 1 }, table: { x: 340, y: 176, s: 1 }, board: { x: 650, y: 190, s: 1 } },
    all: [{ x: 30, y: 200, s: 1 }, { x: 340, y: 200, s: 1 }, { x: 650, y: 200, s: 1 }],
  },
  narrow: {
    width: 400, height: 500,
    mine: { library: { x: 12, y: 96, s: 0.66 }, table: { x: 207, y: 96, s: 0.66 }, board: { x: 20, y: 280, s: 1.29 } },
    all: [{ x: 35, y: 96, s: 1.18 }, { x: 12, y: 354, s: 0.66 }, { x: 207, y: 354, s: 0.66 }],
  },
} as const;

const place = ({ x, y, s }: Place) => `translate(${x} ${y}) scale(${s})`;

type Chip = { id: string; x: number; y: number; title: string; detail?: string; state?: RowState };

function drawingChips({ mode, step }: DrawState, narrow: boolean): Chip[] {
  const layout = narrow ? LAYOUT.narrow : LAYOUT.wide;
  const at = (p: Place, x: number, y: number) => ({ x: p.x + x * p.s, y: p.y + y * p.s });
  if (mode === "all") {
    const [a, b, c] = layout.all;
    const alert = cardBox(ALERT_CARD[0], ALERT_CARD[1], true);
    return [
      ...(narrow ? [] : [
        { id: "a", ...at(a, 140, -4), title: "Example Project A" },
        { id: "b", ...at(b, 140, -4), title: "Example Project B" },
        { id: "c", ...at(c, 140, -4), title: "Example Project C" },
      ]),
      { id: "attention", ...at(c, alert.x + 36, alert.y + 34 + (narrow ? 70 : 64)), title: "Needs attention", detail: narrow ? undefined : "Past its due date", state: "blocked" },
    ];
  }
  const { library, table, board } = layout.mine;
  switch (step) {
    case 0: return [{ id: "memo", ...at(library, MEMO_X, 76), title: "Structural memo, rev C (example)", detail: "Approved", state: "select" }];
    case 1: return [{ id: "section", ...at(library, 74, 2), title: "Section 4.2, slab thickness", detail: "Structural memo, rev C (example)", state: "select" }];
    case 2: return [
      { id: "decision", ...at(table, 140, 10), title: "Decision, coordination meeting (example)", detail: narrow ? undefined : "Level 2 slab, see memo rev C", state: "select" },
      ...(narrow ? [] : [{ id: "minutes", ...at(table, 145, 74), title: "Draft minutes", detail: "Draft for staff review", state: "ok" as const }]),
    ];
    case 3: {
      const card = cardBox(TASK_CARD[0], TASK_CARD[1], false);
      return [{ id: "task", ...at(board, card.x + 36, card.y - 2), title: "Engineer A (example) · Due Friday", detail: "Update Level 2 slab drawings", state: "select" }];
    }
    default: return [{ id: "new", ...at(library, NOTE_X, 76), title: "Source kept · Under review", detail: "MEP site note (example), for staff review", state: "ok" }];
  }
}

function Drawing({ mode, step }: DrawState) {
  const narrow = useNarrow();
  const layout = narrow ? LAYOUT.narrow : LAYOUT.wide;
  const mine = mode === "mine";
  const sw = narrow ? 1.6 : 1.2;
  const clamp = narrow ? [40, 60] : [15, 85];
  return (
    <div className={styles.sheet} style={{ "--ratio": `${layout.width} / ${layout.height}` } as CSSProperties}>
      <svg viewBox={`0 0 ${layout.width} ${layout.height}`} aria-hidden="true">
        {mine ? (
          <>
            <g transform={place(layout.mine.library)}><LibraryDetail step={step} mine sw={sw / layout.mine.library.s} text={!narrow} /></g>
            <g transform={place(layout.mine.table)}><TableDetail focus={step === 2} draft={step >= 2} sw={sw / layout.mine.table.s} /></g>
            <g transform={place(layout.mine.board)}><BoardDetail counts={BOARD_A} stacked={false} selected={step === 3 ? TASK_CARD : undefined} sw={sw / layout.mine.board.s} /></g>
          </>
        ) : (
          [BOARD_A, BOARD_B, BOARD_C].map((counts, index) => (
            <g key={index} transform={place(layout.all[index])}>
              <BoardDetail counts={counts} stacked alert={index === 2 ? ALERT_CARD : undefined} sw={sw / layout.all[index].s} />
            </g>
          ))
        )}
        {!mine && narrow && layout.all.map((board, index) => (
          <text key={index} x={board.x + 140 * board.s} y={board.y - 10} textAnchor="middle" style={{ fontSize: 15 }}>Example Project {"ABC"[index]}</text>
        ))}
      </svg>
      {drawingChips({ mode, step }, narrow).map((chip) => (
        <PlanChip
          key={chip.id}
          x={Math.min(clamp[1], Math.max(clamp[0], (chip.x / layout.width) * 100))}
          y={(chip.y / layout.height) * 100}
          title={chip.title}
          detail={chip.detail}
          state={chip.state}
        />
      ))}
    </div>
  );
}

export default function MinerboFuchsModel() {
  const [mode, setMode] = useState<Mode>("mine");
  const [live, setLive] = useState(false);
  const player = useStepPlayer(STEPS.length, 3200);
  const { go, current } = player;
  const mine = mode === "mine";
  const copy = mine ? STEP_COPY[current] : ALL_COPY;
  const onPick = useCallback((step: number) => go(step), [go]);
  const changeMode = (next: Mode) => {
    go(current);
    setMode(next);
  };
  const cue = [
    "Switch the view",
    ...(mine && player.canPlay ? ["Play the example"] : []),
    ...(mine ? ["Pick a step"] : []),
    ...(live ? ["Drag to look around"] : []),
    ...(live && mine ? ["Click the library, table or board"] : []),
  ];
  const label = mine
    ? `${ROOM_LABEL} Step ${current + 1} of ${STEPS.length}, ${copy.title}. ${copy.label}`
    : `Manager overview. ${copy.label}`;
  return (
    <ModelFigure title="From a question to the person responsible">
      <div className={frame.controls}>
        <Segmented label="View" value={mode} options={MODES} onChange={changeMode} />
        {mine && <StepPlayer {...player} count={STEPS.length} />}
      </div>
      {mine && <StepRail label="From a question to the person responsible" steps={STEPS} current={current} onChange={go} />}
      <InteractionCue line="You can use this." steps={cue} />
      <ModelViewport
        label={label}
        fallback={<Drawing mode={mode} step={current} />}
        scene={(runtime) => <Scene {...runtime} mode={mode} step={current} onPick={onPick} />}
        onModel={setLive}
      />
      <Caption><strong>{copy.title}.</strong> {copy.text} {POLICY}</Caption>
      <Legend items={["select", "ok", "blocked"]} labels={{ select: "In focus", ok: "Draft or under review", blocked: "Needs attention" }} />
    </ModelFigure>
  );
}

export function MinerboFuchsPreview() {
  return (
    <svg viewBox="0 0 500 260" aria-hidden="true">
      <g transform="translate(4 84) scale(0.58)"><LibraryDetail step={0} mine sw={3.4} text={false} /></g>
      <g transform="translate(170 80) scale(0.58)"><TableDetail focus={false} draft={false} sw={3.4} /></g>
      <g transform="translate(336 94) scale(0.58)"><BoardDetail counts={BOARD_A} stacked={false} selected={TASK_CARD} sw={3.4} /></g>
      <g fill="none" stroke={INK} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        <path d={`M${4 + MEMO_X * 0.58} 128 V40 H${336 + columnCenter(0) * 0.58} V112`} strokeDasharray="6 6" />
        <path d={`M${170 + 140 * 0.58} 40 V106`} strokeDasharray="6 6" />
      </g>
      <g fill={INK}>
        <circle cx={4 + MEMO_X * 0.58} cy={40} r={4.5} />
        <circle cx={170 + 140 * 0.58} cy={40} r={4.5} />
        <circle cx={336 + columnCenter(0) * 0.58} cy={40} r={4.5} />
      </g>
    </svg>
  );
}
