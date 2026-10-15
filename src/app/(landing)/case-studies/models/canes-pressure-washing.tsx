"use client";

import dynamic from "next/dynamic";
import { useCallback, useId, useState, type CSSProperties, type SVGProps } from "react";
import {
  Caption, InteractionCue, Legend, ModelFigure, ModelViewport, Panel, PlanChip, Segmented, StepPlayer, StepRail, frame, useNarrow, useStepPlayer,
} from "./model-frame";
import {
  CLEANED, DRIVE, DRIVE_MID_X, FOOTPATH_Z, FRONT_PATH, HOUSE, IMPACT_AHEAD, KERB_Z, LANE_Z, LOT, PATIO, PATIO_CLEANED, REEL_X, ROOF_OVERHANG, STEPS,
  STREET_Z, TRUCK_X, VIEW_OPTIONS, WORKER_BACK, areaState, captionFor, chipsFor, cleanFront, crewRows, ownerRows, truckPresent, type JobView, type Rect,
} from "./canes-pressure-washing-data";
import type { PickTarget } from "./canes-pressure-washing-scene";
import styles from "./canes-pressure-washing.module.css";

const Scene = dynamic(() => import("./canes-pressure-washing-scene"), { ssr: false });

const INK = "#17191a";
const SELECT = "#fed603";
const OK = "#007dfe";

/* Plan drawing, in the scene's metres. Each framing is [x, z, width, height]. */

type Box = [number, number, number, number];
const FRAMES: Record<"owner" | "crew" | "ownerNarrow" | "crewNarrow" | "preview", Box> = {
  owner: [-24, -13, 48, 27],
  crew: [-8, -4.5, 31.1, 17.5],
  ownerNarrow: [-14, -13, 28, 35],
  crewNarrow: [-3, -5, 16, 20],
  preview: [-25, -13, 50, 26],
};

const line = { vectorEffect: "non-scaling-stroke", fill: "none", stroke: INK } as const satisfies SVGProps<SVGPathElement>;
const rect = (r: Rect, inset = 0) => ({ x: r.x[0] - inset, y: r.z[0] - inset, width: r.x[1] - r.x[0] + inset * 2, height: r.z[1] - r.z[0] + inset * 2 });
const span = (x: [number, number], z: [number, number]) => ({ x: x[0], y: z[0], width: x[1] - x[0], height: z[1] - z[0] });

function Area({ r, state }: { r: Rect; state: ReturnType<typeof areaState> }) {
  if (state === "plain") return null;
  if (state === "proposed") return <rect {...rect(r)} {...line} fill={OK} fillOpacity={0.16} stroke={OK} strokeWidth={1.6} strokeDasharray="6 4" />;
  if (state === "approved") return <rect {...rect(r)} {...line} fill={SELECT} fillOpacity={0.5} strokeWidth={1.6} />;
  return <rect {...rect(r)} {...line} stroke={OK} strokeWidth={1.6} />;
}

function TruckPlan({ selected }: { selected: boolean }) {
  const x = (value: number) => TRUCK_X + value;
  const fill = selected ? SELECT : "#fff";
  const fillOpacity = selected ? 0.55 : 1;
  return (
    <g>
      {[-4.55, -1.15].flatMap((wx) => [-0.84, 0.84].map((wz) => <rect key={`${wx}${wz}`} x={x(wx) - 0.42} y={LANE_Z + wz - 0.15} width={0.84} height={0.3} fill={INK} />))}
      {[-1.08, 1.08].map((wz) => <rect key={wz} x={x(2.9) - 0.33} y={LANE_Z + wz - 0.11} width={0.66} height={0.22} fill={INK} />)}
      <rect x={x(-5.65)} y={LANE_Z - 0.95} width={5.65} height={1.9} rx={0.3} {...line} fill={fill} fillOpacity={fillOpacity} strokeWidth={1.4} />
      <rect x={x(-3.95)} y={LANE_Z - 0.85} width={2} height={1.7} rx={0.2} {...line} strokeWidth={1} />
      <rect x={x(-1.86)} y={LANE_Z - 0.82} width={1.62} height={1.64} {...line} strokeWidth={0.8} />
      <circle cx={x(-1)} cy={LANE_Z + 0.35} r={0.38} {...line} strokeWidth={0.8} />
      <path d={`M${x(0.05)} ${LANE_Z} L${x(1.15)} ${LANE_Z - 0.85} M${x(0.05)} ${LANE_Z} L${x(1.15)} ${LANE_Z + 0.85}`} {...line} strokeWidth={1} />
      <rect x={x(1.1)} y={LANE_Z - 0.95} width={3.4} height={1.9} {...line} fill="#fff" strokeWidth={1.2} />
      <rect x={x(1.08)} y={LANE_Z - 0.62} width={1.95} height={1.24} rx={0.3} {...line} fill={fill} fillOpacity={fillOpacity} strokeWidth={1.2} />
      <rect x={x(3.12)} y={LANE_Z - 0.85} width={0.5} height={0.8} {...line} fill="#d8d9d9" strokeWidth={0.8} />
      <rect x={x(REEL_X - 0.44)} y={LANE_Z - 0.4} width={0.88} height={0.8} {...line} fill="#fff" strokeWidth={1} />
      <path d={`M${x(REEL_X - 0.44)} ${LANE_Z - 0.2} H${x(REEL_X + 0.44)} M${x(REEL_X - 0.44)} ${LANE_Z} H${x(REEL_X + 0.44)} M${x(REEL_X - 0.44)} ${LANE_Z + 0.2} H${x(REEL_X + 0.44)}`} {...line} strokeWidth={0.6} />
    </g>
  );
}

type DrawingProps = { step: number; view: JobView; narrow?: boolean; preview?: boolean };

function Drawing({ step, view, narrow = false, preview = false }: DrawingProps) {
  const id = useId().replace(/:/g, "");
  const box = FRAMES[preview ? "preview" : `${view}${narrow ? "Narrow" : ""}` as const];
  const areas = areaState(step);
  const front = cleanFront(CLEANED[step]);
  const houseSelected = step === 0 || step === 5;
  const midZ = (HOUSE.z[0] + HOUSE.z[1]) / 2;
  const workerX = DRIVE_MID_X - 0.15;
  const workerZ = front - WORKER_BACK;
  const reel = TRUCK_X + REEL_X;
  return (
    <svg viewBox={box.join(" ")} aria-hidden="true" preserveAspectRatio="xMidYMid meet">
      <defs>
        <pattern id={`${id}grime`} width={0.55} height={0.55} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width={0.55} height={0.55} fill="#dcd9d2" />
          <path d="M0 0.27 H0.55" stroke={INK} strokeOpacity={0.4} strokeWidth={0.05} />
        </pattern>
        <pattern id={`${id}pavers`} width={1.2} height={1.2} patternUnits="userSpaceOnUse" x={PATIO.x[0]} y={PATIO.z[0]}>
          <rect width={1.2} height={1.2} fill="#fff" />
          <path d="M0 0 H1.2 M0 0 V1.2" stroke={INK} strokeOpacity={0.25} strokeWidth={0.04} />
        </pattern>
      </defs>

      {/* Street, kerbs and footpaths */}
      <rect x={-80} y={STREET_Z[0]} width={160} height={STREET_Z[1] - STREET_Z[0]} fill="#fff" />
      <path d={`M-80 ${FOOTPATH_Z[0]} H${DRIVE.x[0]} M${DRIVE.x[1]} ${FOOTPATH_Z[0]} H80 M-80 ${KERB_Z[0]} H80 M-80 ${KERB_Z[1]} H80 M-80 ${STREET_Z[1]} H80 M-80 ${STREET_Z[1] + 1.8} H80`} {...line} strokeWidth={1} />
      <path d={`M-80 ${(STREET_Z[0] + STREET_Z[1]) / 2} H80`} {...line} strokeWidth={1} strokeOpacity={0.45} strokeDasharray="8 8" />
      <rect {...rect(LOT)} {...line} strokeWidth={0.8} strokeOpacity={0.5} strokeDasharray="3 4" />

      {/* Planting */}
      {[[-10.9, -9.6, 1.8], [10.6, -9.8, 1.5], [-11.2, 5.4, 1.3]].map(([cx, cz, r]) => <circle key={cx} cx={cx} cy={cz} r={r} {...line} fill="#fff" strokeWidth={0.8} strokeOpacity={0.6} />)}

      {/* Patio and driveway: hatched while weathered, white once clean */}
      <rect {...rect(PATIO)} fill={`url(#${id}pavers)`} />
      {PATIO_CLEANED[step] < 1 && <rect {...rect(PATIO)} fill={`url(#${id}grime)`} fillOpacity={0.85} />}
      <rect {...rect(PATIO)} {...line} strokeWidth={1.2} />
      <rect {...rect(DRIVE)} fill={`url(#${id}grime)`} />
      {CLEANED[step] > 0 && <rect {...span(DRIVE.x, [DRIVE.z[0], front])} fill="#fff" />}
      {CLEANED[step] > 0 && CLEANED[step] < 1 && <path d={`M${DRIVE.x[0]} ${front} H${DRIVE.x[1]}`} {...line} strokeWidth={1.4} />}
      <rect {...rect(DRIVE)} {...line} strokeWidth={1.2} />
      <Area r={DRIVE} state={areas} />
      <Area r={PATIO} state={areas} />

      {/* House: roof plan with the ridge, walls dashed beneath */}
      <rect {...rect(FRONT_PATH)} {...line} fill="#fff" strokeWidth={0.8} />
      <rect {...rect(HOUSE, ROOF_OVERHANG)} {...line} fill={houseSelected ? SELECT : "#fff"} fillOpacity={houseSelected ? 0.55 : 1} strokeWidth={houseSelected ? 1.8 : 1.4} />
      <rect {...rect(HOUSE)} {...line} strokeWidth={0.7} strokeOpacity={0.55} strokeDasharray="4 3" />
      <path d={`M${HOUSE.x[0] - ROOF_OVERHANG} ${midZ} H${HOUSE.x[1] + ROOF_OVERHANG}`} {...line} strokeWidth={1.1} />

      {/* Crew truck, crew member, hose and spray */}
      {truckPresent(step) && <TruckPlan selected={step === 3} />}
      {step === 4 && (
        <g>
          <path d={`M${reel - 0.15} ${LANE_Z - 0.3} L${reel - 0.35} ${LANE_Z - 1} L${reel - 0.55} ${KERB_Z[0] + 0.1} L${reel - 0.9} ${DRIVE.z[1] - 1.2} L${workerX + 0.45} ${workerZ - 0.1} L${workerX + 0.13} ${workerZ + 0.34}`} {...line} strokeWidth={1.4} />
          <path d={`M${workerX + 0.14} ${workerZ + 1.12} L${workerX - 0.3} ${workerZ + IMPACT_AHEAD + 0.1} L${workerX + 0.6} ${workerZ + IMPACT_AHEAD + 0.1} Z`} {...line} fill="#fff" strokeWidth={0.8} />
          <circle cx={workerX} cy={workerZ} r={0.32} {...line} fill={INK} />
        </g>
      )}
    </svg>
  );
}

function Plan({ step, view, narrow }: DrawingProps) {
  const box = FRAMES[`${view}${narrow ? "Narrow" : ""}` as const];
  const chips = chipsFor(step);
  return (
    <div className={styles.plan} style={{ "--ratio": box[2] / box[3] } as CSSProperties}>
      <Drawing step={step} view={view} narrow={narrow} />
      {chips.map((chip) => {
        const x = ((chip.at[0] - box[0]) / box[2]) * 100;
        const y = ((chip.at[2] - box[1]) / box[3]) * 100;
        if (x < 0 || x > 100 || y < 0 || y > 100) return null;
        const edge = narrow ? 34 : 16;
        return <PlanChip key={chip.id} x={Math.min(100 - edge, Math.max(edge, x))} y={y} title={chip.title} detail={narrow ? undefined : chip.detail} state={chip.state} />;
      })}
    </div>
  );
}

export default function CanesModel() {
  const player = useStepPlayer(STEPS.length, 3400);
  const [view, setView] = useState<JobView>("owner");
  const [live, setLive] = useState(false);
  const narrow = useNarrow();
  const step = player.current;
  const caption = captionFor(step, view);
  const onPick = useCallback((target: PickTarget) => setView(target === "truck" ? "crew" : "owner"), []);
  const cue = [
    "Switch owner view or crew phone",
    ...(player.canPlay ? ["Play the example"] : []),
    "Choose a step",
    ...(live ? ["Drag to look around", "Click the house or the crew truck"] : []),
  ];
  const label = `Illustration of an example pressure-washing job: a single-storey house with a concrete driveway and a rear patio, a street, and a crew pickup with a trailer-mounted water tank, pressure washer and hose reel. Step ${step + 1} of ${STEPS.length}, ${STEPS[step]}. ${caption}`;
  return (
    <ModelFigure title="One job, from inquiry to payment">
      <div className={frame.controls}>
        <Segmented label="Whose view" value={view} options={VIEW_OPTIONS} onChange={setView} />
        <StepPlayer {...player} count={STEPS.length} />
      </div>
      <StepRail label="Steps in the job" steps={STEPS} current={step} onChange={player.go} />
      <InteractionCue line="You can use this." steps={cue} />
      <div className={frame.split}>
        <ModelViewport
          label={label}
          fallback={<Plan step={step} view={view} narrow={narrow} />}
          scene={(runtime) => <Scene {...runtime} step={step} view={view} onPick={onPick} />}
          onModel={setLive}
        />
        <div className={view === "crew" ? styles.phone : undefined}>
          <Panel
            heading={view === "crew" ? "Crew phone · Crew 2 (example)" : "Job record · Customer A (example)"}
            rows={view === "crew" ? crewRows(step) : ownerRows(step)}
          />
        </div>
      </div>
      <Caption><strong>{STEPS[step]}.</strong> {caption}</Caption>
      <Legend items={["select", "ok", "blocked"]} labels={{ select: "In focus", ok: "Proposed, ready or done", blocked: "Balance outstanding" }} />
    </ModelFigure>
  );
}

/* Index card: an isometric line drawing of the opening state. */

const iso = (x: number, y: number, z: number) => [(x - z) * 0.866, (x + z) * 0.5 - y] as const;
const poly = (points: [number, number, number][]) => points.map(([x, y, z]) => iso(x, y, z).map((value) => value.toFixed(2)).join(",")).join(" ");
const ground = (r: Rect): [number, number, number][] => [[r.x[0], 0, r.z[0]], [r.x[1], 0, r.z[0]], [r.x[1], 0, r.z[1]], [r.x[0], 0, r.z[1]]];

function IsoTree({ x, z, r }: { x: number; z: number; r: number }) {
  const [bx, by] = iso(x, 0, z);
  const [, cy] = iso(x, 2.1 + r * 0.75, z);
  return (
    <g>
      <path d={`M${bx} ${by} V${cy}`} {...line} strokeWidth={1} />
      <circle cx={bx} cy={cy} r={r * 0.95} {...line} fill="#fff" strokeWidth={1} />
    </g>
  );
}

export function CanesPreview() {
  const id = useId().replace(/:/g, "");
  const [x0, x1] = HOUSE.x;
  const [z0, z1] = HOUSE.z;
  const zc = (z0 + z1) / 2;
  const o = ROOF_OVERHANG;
  const top = 2.7;
  const ridge = 4.4;
  const eave = top - o * (1.7 / ((z1 - z0) / 2));
  const street: Rect = { x: [-16, 14], z: [STREET_Z[0], STREET_Z[1]] };
  const tint = { fill: SELECT, fillOpacity: 0.5 };
  return (
    <svg viewBox="-23 -12.6 42 21.6" aria-hidden="true">
      <defs>
        <pattern id={`${id}hatch`} width={0.7} height={0.7} patternUnits="userSpaceOnUse" patternTransform="rotate(-30)">
          <rect width={0.7} height={0.7} fill="#e2dfd8" />
          <path d="M0 0.35 H0.7" stroke={INK} strokeOpacity={0.45} strokeWidth={0.07} />
        </pattern>
      </defs>
      <polygon points={poly(ground(street))} fill="#fff" />
      {[STREET_Z[0], STREET_Z[1], FOOTPATH_Z[0]].map((z) => <polyline key={z} points={poly([[street.x[0], 0, z], [street.x[1], 0, z]])} {...line} strokeWidth={1.1} />)}
      <polyline points={poly([[street.x[0], 0, (STREET_Z[0] + STREET_Z[1]) / 2], [street.x[1], 0, (STREET_Z[0] + STREET_Z[1]) / 2]])} {...line} strokeWidth={0.8} strokeOpacity={0.45} strokeDasharray="5 5" />
      <polygon points={poly(ground(PATIO))} {...line} fill={`url(#${id}hatch)`} strokeWidth={1.1} />
      <polygon points={poly(ground(DRIVE))} {...line} fill={`url(#${id}hatch)`} strokeWidth={1.1} />
      <polygon points={poly(ground(FRONT_PATH))} {...line} fill="#fff" strokeWidth={0.8} />
      <IsoTree x={10.6} z={-9.8} r={1.5} />
      <polygon points={poly([[x1, 0, z1], [x1, 0, z0], [x1, top, z0], [x1, ridge, zc], [x1, top, z1]])} {...line} {...tint} strokeWidth={1.2} />
      <polygon points={poly([[x0, 0, z1], [x1, 0, z1], [x1, top, z1], [x0, top, z1]])} {...line} {...tint} strokeWidth={1.2} />
      {[[-8.6, -6.6], [-3.1, -0.9]].map(([a, b]) => <polygon key={a} points={poly([[a, 0.95, z1], [b, 0.95, z1], [b, 2.15, z1], [a, 2.15, z1]])} {...line} fill="#fff" strokeWidth={0.9} />)}
      <polygon points={poly([[-5, 0, z1], [-4, 0, z1], [-4, 2.15, z1], [-5, 2.15, z1]])} {...line} fill={INK} strokeWidth={0.9} />
      <polygon points={poly([[x0 - o, ridge, zc], [x1 + o, ridge, zc], [x1 + o, eave, z0 - o], [x0 - o, eave, z0 - o]])} {...line} {...tint} strokeWidth={1.2} />
      <polygon points={poly([[x0 - o, eave, z1 + o], [x1 + o, eave, z1 + o], [x1 + o, ridge, zc], [x0 - o, ridge, zc]])} {...line} {...tint} strokeWidth={1.4} />
      {[-8.9, -7.6, -2.2, -0.4, 0.9].map((x) => {
        const [cx, cy] = iso(x, 0.35, 3.2);
        return <circle key={x} cx={cx} cy={cy} r={0.5} {...line} fill="#fff" strokeWidth={0.9} />;
      })}
      <IsoTree x={-11.2} z={5.4} r={1.3} />
    </svg>
  );
}
