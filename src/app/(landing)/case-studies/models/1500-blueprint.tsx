"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { Caption, frame, InteractionCue, Legend, ModelFigure, ModelViewport, Panel, PlanChip, Segmented, StepPlayer, StepRail, useStepPlayer } from "./model-frame";
import {
  ACTIVE_SECTION, ADMIN_STEPS, adminChip, BARRIER_AT, bezierPoint, caption, CARD, CURRENT_TILE, description, GATE_X, inPlan, LESSON_TILE_Z, LESSON_TILES, MODULE_NAME, MODULES,
  PADS, PATH, pathLegs, PLAN_NAME, REVIEW, SECTION_Z, SECTIONS, SLAB, STACK_PULL, STACK_Z, STACKS, stopIndex, STUDENT_STEPS, studentChip, TOKEN_HALT, TOPIC_STACK,
  type Mode, type ModuleId, type PickId, type PlanKey, type Rect, type Vec,
} from "./1500-blueprint-data";
import styles from "./1500-blueprint.module.css";

const Scene = dynamic(() => import("./1500-blueprint-scene"), { ssr: false });

const INK = "#17191a";
const SELECT = "#fed603";
const OK = "#007dfe";
const BLOCKED = "#f51625";
const MUTED = "#9a9b9b";

/* Plan drawing: the same layout from above, in ink on the grid. */

const X = (x: number) => (x + 7.6) * 40;
const Y = (z: number) => (z + 4.1) * 40;
const W = (dx: number) => dx * 40;
const LEGS = pathLegs(PATH);
const legPath = (leg: (typeof LEGS)[number]) => `M${X(leg[0][0])} ${Y(leg[0][1])}C${leg.slice(1).map(([x, z]) => `${X(x)} ${Y(z)}`).join(" ")}`;
const pathAt = (index: number): Vec => bezierPoint(LEGS[Math.min(LEGS.length - 1, Math.floor(index))], index - Math.min(LEGS.length - 1, Math.floor(index)));

function Box({ rect, fill = "#fff", stroke = INK, weight = 1, dash, opacity }: { rect: Rect; fill?: string; stroke?: string; weight?: number; dash?: string; opacity?: number }) {
  return <rect x={X(rect.x[0])} y={Y(rect.z[0])} width={W(rect.x[1] - rect.x[0])} height={W(rect.z[1] - rect.z[0])} rx={2} fill={fill} fillOpacity={opacity} stroke={stroke} strokeWidth={weight} strokeDasharray={dash} />;
}

function padStyle(focus: boolean, ghost: boolean, k: number) {
  if (ghost) return { fill: "none", stroke: MUTED, weight: k, dash: "4 3" };
  if (focus) return { fill: SELECT, opacity: 0.38, stroke: INK, weight: 1.6 * k };
  return { fill: "#fff", stroke: INK, weight: k };
}

type PlanProps = { mode: Mode; step: number; plan: PlanKey; weight?: number };

function PlanDrawing({ mode, step, plan, weight: k = 1 }: PlanProps) {
  const student = mode === "student";
  const focusModule = student ? MODULES[step] : null;
  const tutoringClosed = student && !inPlan(plan, "tutoring");
  const fine = 0.8 * k;
  const pulled = focusModule === "bank" || (!student && step === 1);
  const reached = stopIndex(step);
  const token = pathAt(student && focusModule === "tutoring" && plan === "b" ? TOKEN_HALT : stopIndex(step));
  const barrier = pathAt(BARRIER_AT);
  const dial = SECTIONS[ACTIVE_SECTION];
  const dialX = X((dial.x[0] + dial.x[1]) / 2);
  const dialY = Y((SECTION_Z[0] + SECTION_Z[1]) / 2 + 0.18);
  const sweep = 0.62 * Math.PI * 2;
  const feeds: { from: Vec; to: Vec }[] = [
    { from: [-0.95, -2.2], to: [(LESSON_TILES[4][0] + LESSON_TILES[4][1]) / 2, LESSON_TILE_Z[0] - 0.1] },
    { from: [-0.4, -1.35], to: [STACKS[TOPIC_STACK].x + 0.2, STACK_Z + STACK_PULL - 0.4] },
    { from: [-0.95, -2.76], to: [GATE_X + 0.2, -0.2] },
  ];
  return (
    <g fill="none" strokeLinejoin="round" strokeLinecap="round">
      <rect x={X(SLAB.x[0])} y={Y(SLAB.z[0])} width={W(SLAB.x[1] - SLAB.x[0])} height={W(SLAB.z[1] - SLAB.z[0])} rx={3} fill="#fff" stroke={INK} strokeWidth={1.5 * k} />
      <rect x={X(SLAB.x[0]) + 5} y={Y(SLAB.z[0]) + 5} width={W(SLAB.x[1] - SLAB.x[0]) - 10} height={W(SLAB.z[1] - SLAB.z[0]) - 10} rx={2} stroke={INK} strokeOpacity={0.25} strokeWidth={fine} />

      {/* Lessons */}
      <Box rect={PADS.lessons} {...padStyle(focusModule === "lessons", false, k)} />
      <rect x={X(-4.85)} y={Y(-2.96)} width={W(2.5)} height={W(0.16)} fill={INK} />
      <path d={`M${X(-3.75)} ${Y(-2.62)}L${X(-3.4)} ${Y(-2.42)}L${X(-3.75)} ${Y(-2.22)}Z`} fill={INK} />
      {LESSON_TILES.map((x, index) => {
        const fresh = index === LESSON_TILES.length - 1 && !student && step === 0;
        const current = focusModule === "lessons" && index === CURRENT_TILE;
        return <Box key={index} rect={{ x, z: LESSON_TILE_Z }} fill={fresh ? OK : current ? SELECT : "#fff"} opacity={fresh ? 0.3 : current ? 0.6 : 1} stroke={fresh ? OK : INK} weight={fine} />;
      })}

      {/* Question bank */}
      <Box rect={PADS.bank} {...padStyle(focusModule === "bank", false, k)} />
      {STACKS.map((stack, index) => {
        const z = STACK_Z + (index === TOPIC_STACK && pulled ? STACK_PULL : 0);
        const selected = index === TOPIC_STACK && focusModule === "bank";
        const rect = { x: [stack.x - CARD.width / 2, stack.x + CARD.width / 2] as Vec, z: [z - CARD.depth / 2, z + CARD.depth / 2] as Vec };
        return (
          <g key={index}>
            <Box rect={rect} fill={selected ? SELECT : "#fff"} opacity={selected ? 0.6 : 1} weight={index === TOPIC_STACK && pulled ? 1.4 * k : fine} />
            <line x1={X(rect.x[0]) + 3} x2={X(rect.x[1]) - 3} y1={Y(rect.z[0]) + 4} y2={Y(rect.z[0]) + 4} stroke={INK} strokeWidth={fine} strokeOpacity={0.5} />
            <line x1={X(rect.x[0]) + 3} x2={X(rect.x[1]) - 3} y1={Y(rect.z[0]) - 3} y2={Y(rect.z[0]) - 3} stroke={INK} strokeWidth={1.4 * k} />
          </g>
        );
      })}
      {!student && step === 1 && <Box rect={{ x: [STACKS[TOPIC_STACK].x - 0.2, STACKS[TOPIC_STACK].x + 0.28], z: [STACK_Z + STACK_PULL - 0.36, STACK_Z + STACK_PULL + 0.24] }} fill={OK} opacity={0.3} stroke={OK} weight={1.2 * k} />}

      {/* Practice test */}
      <Box rect={PADS.test} {...padStyle(focusModule === "test", false, k)} />
      {SECTIONS.map((section, index) => {
        const active = focusModule === "test" && index === ACTIVE_SECTION;
        return (
          <g key={section.id}>
            <Box rect={{ x: section.x, z: SECTION_Z }} fill={active ? SELECT : section.math ? "#ecebe7" : "#fff"} opacity={active ? 0.6 : 1} weight={active ? 1.4 * k : k} />
            {index < ACTIVE_SECTION && <rect x={X(section.x[0] + 0.1)} y={Y(SECTION_Z[1]) - 5} width={W(0.24)} height={3.5} fill={OK} />}
          </g>
        );
      })}
      <circle cx={dialX} cy={dialY} r={11.6} fill="#fff" stroke={INK} strokeWidth={fine} />
      <circle cx={dialX} cy={dialY} r={8.2} stroke="#c9c6bf" strokeWidth={2.6} />
      <path d={`M${dialX} ${dialY - 8.2}A8.2 8.2 0 ${sweep > Math.PI ? 1 : 0} 1 ${dialX + 8.2 * Math.sin(sweep)} ${dialY - 8.2 * Math.cos(sweep)}`} stroke={INK} strokeWidth={2.6} strokeLinecap="butt" />

      {/* Review */}
      <Box rect={PADS.review} {...padStyle(focusModule === "review", false, k)} />
      <Box rect={{ x: REVIEW.x, z: REVIEW.z }} weight={focusModule === "review" ? 1.4 * k : k} fill={focusModule === "review" ? SELECT : "#fff"} opacity={focusModule === "review" ? 0.5 : 1} />
      <Box rect={{ x: [REVIEW.x[0] + 0.12, REVIEW.x[1] - 0.12], z: [REVIEW.z[0] + 0.12, REVIEW.z[1] - 0.12] }} weight={fine} />
      {Array.from({ length: REVIEW.rows * REVIEW.columns }, (_, index) => {
        const row = Math.floor(index / REVIEW.columns);
        const column = index % REVIEW.columns;
        const cellX = (REVIEW.x[1] - REVIEW.x[0] - 0.5) / REVIEW.columns;
        const cellZ = (REVIEW.z[1] - REVIEW.z[0] - 0.62) / REVIEW.rows;
        return <rect key={index} x={X(REVIEW.x[0] + 0.29 + column * cellX)} y={Y(REVIEW.z[0] + 0.49 + row * cellZ)} width={W(cellX - 0.1)} height={W(0.12)} fill={REVIEW.flagged.includes(index) ? BLOCKED : OK} />;
      })}
      {[0, 1, 2].map((index) => <rect key={index} x={X(5.49 + index * 0.02)} y={Y(1.3 - index * 0.03)} width={W(0.68)} height={W(0.95)} fill="#fff" stroke={INK} strokeWidth={fine} />)}

      {/* Tutoring */}
      {(() => {
        const ghost = tutoringClosed;
        const style = padStyle(focusModule === "tutoring" && !ghost, ghost, k);
        const line = ghost ? MUTED : INK;
        return (
          <g>
            <Box rect={PADS.tutoring} {...style} />
            <rect x={X(2.65)} y={Y(-2.97)} width={W(3.4)} height={W(0.15)} fill={ghost ? "none" : INK} stroke={line} strokeWidth={fine} />
            {Array.from({ length: 6 }, (_, index) => (
              <rect key={index} x={X(3.25 + (index % 3) * 0.75)} y={Y(-2.55 + Math.floor(index / 3) * 0.42)} width={W(0.62)} height={W(0.32)} fill={!ghost && focusModule === "tutoring" && index === 4 ? SELECT : "none"} stroke={line} strokeWidth={fine} />
            ))}
            <rect x={X(2.85)} y={Y(-1.58)} width={W(2.7)} height={W(0.52)} stroke={line} strokeWidth={fine} strokeDasharray={ghost ? "4 3" : undefined} />
            {Array.from({ length: 13 }, (_, index) => <line key={index} x1={X(3.0 + index * 0.19)} x2={X(3.0 + index * 0.19)} y1={Y(-1.48)} y2={Y(-1.16)} stroke={line} strokeWidth={1.6 * k} />)}
          </g>
        );
      })()}

      {/* Admin editor */}
      {(() => {
        const ghost = student;
        const line = ghost ? MUTED : INK;
        return (
          <g>
            <Box rect={PADS.editor} {...padStyle(false, ghost, k)} />
            <rect x={X(-1.05)} y={Y(-3.05)} width={W(2.3)} height={W(1.75)} rx={2} fill={!ghost ? SELECT : "none"} fillOpacity={!ghost ? 0.38 : undefined} stroke={line} strokeWidth={ghost ? fine : 1.4 * k} strokeDasharray={ghost ? "4 3" : undefined} />
            <rect x={X(-0.7)} y={Y(-2.82)} width={W(1.6)} height={W(0.12)} fill={ghost ? "none" : INK} stroke={line} strokeWidth={fine} />
            <rect x={X(-0.45)} y={Y(-2.15)} width={W(1.1)} height={W(0.45)} stroke={line} strokeWidth={fine} />
          </g>
        );
      })()}

      {/* Membership gate */}
      <g>
        <rect x={X(GATE_X - 0.16)} y={Y(-0.98)} width={W(0.32)} height={W(1.96)} fill={!student && step === 2 ? SELECT : "#fff"} fillOpacity={!student && step === 2 ? 0.6 : 1} stroke={INK} strokeWidth={1.2 * k} />
        <rect x={X(GATE_X - 0.12)} y={Y(-0.98)} width={W(0.24)} height={W(0.24)} fill={INK} />
        <rect x={X(GATE_X - 0.12)} y={Y(0.74)} width={W(0.24)} height={W(0.24)} fill={INK} />
        {MODULES.map((id, index) => <circle key={id} cx={X(GATE_X)} cy={Y(-0.56 + index * 0.28)} r={2.6} fill={inPlan(student ? plan : "a", id) ? OK : "#c9c6bf"} />)}
      </g>

      {/* Student path */}
      {LEGS.map((leg, index) => {
        const closed = plan === "b" && index >= 5;
        const ghost = !student || closed;
        return <path key={index} d={legPath(leg)} stroke={ghost ? MUTED : OK} strokeOpacity={ghost ? 0.6 : index < reached ? 1 : 0.4} strokeWidth={2.2 * k} strokeDasharray="6 6" strokeLinecap="butt" />;
      })}
      {MODULES.map((id, index) => {
        const [x, z] = PATH[stopIndex(index)];
        const ghost = !student || (id === "tutoring" && tutoringClosed);
        return <circle key={id} cx={X(x)} cy={Y(z)} r={6} fill="#fff" stroke={ghost ? MUTED : index <= step ? OK : MUTED} strokeWidth={1.6 * k} />;
      })}
      {student && plan === "b" && (
        <g stroke={BLOCKED} strokeWidth={3 * k}>
          <line x1={X(barrier[0])} x2={X(barrier[0])} y1={Y(-0.74)} y2={Y(0.74)} />
        </g>
      )}
      {student && <circle cx={X(token[0])} cy={Y(token[1])} r={7.5} fill={SELECT} stroke={INK} strokeWidth={1.5 * k} />}

      {/* Publishing feeds */}
      {!student && feeds.map((feed, index) => {
        const [x0, y0] = [X(feed.from[0]), Y(feed.from[1])];
        const [x1, y1] = [X(feed.to[0]), Y(feed.to[1])];
        const cx = (x0 + x1) / 2;
        const cy = Math.min(y0, y1) - 46;
        const angle = Math.atan2(y1 - cy, x1 - cx);
        const head = (offset: number) => `${x1 - 8 * Math.cos(angle + offset)} ${y1 - 8 * Math.sin(angle + offset)}`;
        const colour = index === step ? OK : MUTED;
        return (
          <g key={index} stroke={colour} strokeWidth={(index === step ? 2 : 1.4) * k}>
            <path d={`M${x0} ${y0}Q${cx} ${cy} ${x1} ${y1}`} strokeDasharray="5 4" />
            <path d={`M${head(0.45)}L${x1} ${y1}L${head(-0.45)}`} />
          </g>
        );
      })}
    </g>
  );
}

const ANCHOR: Record<ModuleId, Vec> = {
  lessons: [-3.6, PADS.lessons.z[0] - 0.1],
  bank: [-3.6, SLAB.z[1] + 1.15],
  test: [0.65, SLAB.z[1] + 1.15],
  review: [4.85, SLAB.z[1] + 1.15],
  tutoring: [4.35, PADS.tutoring.z[0] - 0.1],
};
const pct = ([x, z]: Vec) => ({ x: (X(x) / 600) * 100, y: ((Y(z) + 40) / 412) * 100 });

function Drawing({ mode, step, plan }: Omit<PlanProps, "weight">) {
  const student = mode === "student";
  const chips: { key: string; at: Vec; title: string; detail?: string; state?: "ok" | "select" | "blocked" }[] = [];
  if (student) {
    const chip = studentChip(step, plan);
    chips.push({ key: "module", at: ANCHOR[MODULES[step]], ...chip });
  } else {
    const chip = adminChip(step);
    chips.push({ key: "editor", at: [step === 0 ? 0.9 : 0.1, PADS.editor.z[0] - 0.1], title: chip.title, detail: chip.detail, state: chip.state });
    chips.push({ key: "target", at: [[-3.9, PADS.lessons.z[0] - 0.1], [-3.6, SLAB.z[1] + 1.15], [GATE_X + 0.6, SLAB.z[0] - 0.1]][step] as Vec, ...chip.target });
  }
  return (
    <div className={styles.plan}>
      <svg viewBox="0 -40 600 412" aria-hidden="true">
        <PlanDrawing mode={mode} step={step} plan={plan} />
      </svg>
      {chips.map((chip) => {
        const { x, y } = pct(chip.at);
        return <PlanChip key={chip.key} x={x} y={y} title={chip.title} detail={chip.detail} state={chip.state} />;
      })}
    </div>
  );
}

export default function BlueprintModel() {
  const [mode, setMode] = useState<Mode>("student");
  const [plan, setPlan] = useState<PlanKey>("a");
  const [live, setLive] = useState(false);
  const steps = mode === "student" ? STUDENT_STEPS : ADMIN_STEPS;
  const player = useStepPlayer(steps.length);
  const { go } = player;
  const step = Math.min(player.current, steps.length - 1);
  const student = mode === "student";

  const switchMode = useCallback((next: Mode) => { setMode(next); go(0); }, [go]);
  const onPick = useCallback((id: PickId) => {
    if (mode === "student") {
      const index = MODULES.indexOf(id as ModuleId);
      if (index >= 0) go(index);
      return;
    }
    const index = (["lessons", "bank", "gate"] as PickId[]).indexOf(id);
    if (index >= 0) go(index);
  }, [mode, go]);

  const cue = [
    "Switch the view",
    ...(student ? ["Switch the plan"] : []),
    ...(player.canPlay ? ["Play the example"] : []),
    "Choose a step",
    ...(live ? ["Drag to look around", student ? "Click a module" : "Click lessons, the bank or the gate"] : []),
  ];

  const rows = student
    ? [
      { key: "gate", title: "Membership gate", detail: plan === "a" ? `${PLAN_NAME.a} opens all five modules` : `${PLAN_NAME.b} opens four modules`, state: "ok" as const },
      ...MODULES.map((id, index) => {
        const open = inPlan(plan, id);
        const details: Record<ModuleId, string> = {
          lessons: "Courses and video lessons",
          bank: "Exercises sorted by topic",
          test: "Timed sections, saved attempts",
          review: "Answers from saved attempts",
          tutoring: open ? "Group calls and recordings" : `Not in ${PLAN_NAME.b}`,
        };
        return { key: id, title: MODULE_NAME[id], detail: details[id], state: index === step ? (open ? "select" as const : "blocked" as const) : open ? "ok" as const : "muted" as const };
      }),
    ]
    : [
      { key: "lesson", title: "Lesson editor", detail: "Publishes lessons into courses", state: step === 0 ? "select" as const : "ok" as const },
      { key: "question", title: "Question editor", detail: "Questions and explanations for the bank", state: step === 1 ? "select" as const : "ok" as const },
      { key: "access", title: "Access and membership", detail: "Which plan opens which modules", state: step === 2 ? "select" as const : "ok" as const },
    ];

  return (
    <ModelFigure title="One student’s path through the platform">
      <div className={frame.controls}>
        <div className={styles.footer}>
          <Segmented label="View" value={mode} onChange={switchMode} options={[{ value: "student", label: "Student view" }, { value: "admin", label: "Admin view" }]} />
          {student && <Segmented label="Example plan" value={plan} onChange={setPlan} options={[{ value: "a", label: PLAN_NAME.a }, { value: "b", label: PLAN_NAME.b }]} />}
        </div>
        <StepPlayer {...player} current={step} count={steps.length} />
      </div>
      <StepRail label={student ? "Student A’s path" : "Publishing flow"} steps={steps} current={step} onChange={go} />
      <div className={frame.split}>
        <div className={styles.stack}>
          <InteractionCue line="You can use this." steps={cue} />
          <ModelViewport
            label={description(mode, step, plan)}
            fallback={<Drawing mode={mode} step={step} plan={plan} />}
            scene={(runtime) => <Scene {...runtime} mode={mode} step={step} plan={plan} onPick={onPick} />}
            onModel={setLive}
          />
        </div>
        <Panel heading={student ? `Student A (example) · ${PLAN_NAME[plan]}` : "Admin tools"} rows={rows} />
      </div>
      <Caption>{caption(mode, step, plan)}</Caption>
      <Legend items={student ? ["select", "ok", "blocked"] : ["select", "ok"]} labels={{ select: "In focus", ok: student ? "Open, done or correct" : "Being published", blocked: "Closed or for review" }} />
    </ModelFigure>
  );
}

export function BlueprintPreview() {
  return (
    <svg viewBox="-50 -16 700 360" aria-hidden="true">
      <PlanDrawing mode="student" step={2} plan="a" weight={1.7} />
    </svg>
  );
}
