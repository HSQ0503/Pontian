"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { SceneRuntime } from "./model-frame";
import { ALERT_CARD, BINDERS, BOARD_A, BOARD_B, BOARD_C, MEMO, NEW_NOTE, TASK_CARD, type Mode } from "./minerbo-fuchs-data";
import {
  BLOCKED, bx, ContactShadow, cylinder, EDGE_INK, EDGE_OK, EDGE_SOFT, Ground, ModelCanvas, Part, pickHandlers, PROPOSED, physical, standard, useTween,
  type Point, type SceneLabel, type View,
} from "./scene-kit";

type Props = SceneRuntime & { mode: Mode; step: number; onPick: (step: number) => void };

const M = {
  platform: standard("#c8c4bb", 0.95),
  wall: standard("#e8e7e2", 0.9),
  rug: standard("#bdb9b0", 1),
  carcass: standard("#c9c0b0", 0.68),
  oak: standard("#d4cab9", 0.66),
  graphite: standard("#3b3e41", 0.55, 0.2),
  steel: standard("#8f9296", 0.38, 0.6),
  shell: physical("#d3d2ce", 0.48, { clearcoat: 0.25, clearcoatRoughness: 0.5 }),
  structural: standard("#4b4e51", 0.62),
  mep: standard("#a29e95", 0.7),
  architecture: standard("#e4e1d9", 0.72),
  label: standard("#f7f6f2", 0.8),
  paper: standard("#fbfaf7", 0.85),
  line: standard("#9a9a96", 0.9),
  header: standard("#a9a69e", 0.8),
  board: standard("#d6d3cc", 0.6),
  card: standard("#ffffff", 0.7),
  alert: standard(BLOCKED, 0.6),
};
// The kit ghost, a little denser and offset so its blue review edges stay on top.
const NOTE_GHOST = physical("#dfe3e8", 0.6, { transparent: true, opacity: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
const BINDER_MATERIALS = [M.structural, M.mep, M.architecture];

/* Layout in metres. The room sits on a platform; its floor is at y = 0 inside the room group. */

const LIFT = 0.12;
const ROOM = { x: [-4.2, 4.2], z: [-2.6, 2.4], height: 2.4 } as const;
const WALL_FACE = -2.45;

const CAB = { x0: -3.85, x1: -1.15, z0: -2.43, z1: -1.83, height: 1, shelf: 0.53 };
const BAY = (CAB.x1 - CAB.x0) / 3;
const BINDER = { width: 0.085, pitch: 0.098, y: [CAB.shelf, 0.91] as [number, number], z: [CAB.z0 + 0.06, CAB.z1 - 0.04] as [number, number] };
const binderX = (group: number, index: number) => CAB.x0 + group * BAY + 0.1 + index * BINDER.pitch;

const TABLE = { x: [-1, 1.6] as [number, number], z: [-0.2, 1.4] as [number, number], top: 0.77 };

const BOARD = { x: [0.1, 3.9] as [number, number], y: [0.82, 2.18] as [number, number] };
const COLUMN = (BOARD.x[1] - BOARD.x[0] - 0.08) / 3;
const columnX = (column: number) => BOARD.x[0] + 0.04 + COLUMN * (column + 0.5);
const CARD = { width: 0.92, height: 0.28 };
const CARD_Z = WALL_FACE + 0.06;

const SIDE = { width: 2, z: -0.9, card: { width: 0.5, height: 0.2 }, column: 0.64 };
const SIDE_BOARDS = [{ id: "b", x: 5.85, columns: BOARD_B }, { id: "c", x: 8.25, columns: BOARD_C }] as const;

const memoX = binderX(MEMO.group, MEMO.index) + BINDER.width / 2;
const SHEET_REST: Point = [-3.32, CAB.height + 0.004, -2.13];
const SHEET_FROM: Point = [memoX, BINDER.y[1], CAB.z1 + 0.2];
const MINUTES: Point = [0.3, TABLE.top, 0.62];

/* Views: one per step, a wider frame for the manager overview, and taller frames for 4:5 phones. */

function frame(target: Point, distance: number, dir: Point = [0.5, 0.52, 0.7]) {
  const length = Math.hypot(...dir);
  return { target, position: [target[0] + (dir[0] / length) * distance, target[1] + (dir[1] / length) * distance, target[2] + (dir[2] / length) * distance] as Point };
}

const STEP_VIEWS: View[] = [
  { ...frame([-0.2, 0.7, -0.15], 14.2), narrow: frame([-2.2, 0.9, -1.2], 12.5, [0.55, 0.5, 0.75]) },
  { ...frame([-2.45, 0.8, -2.0], 9.2, [0.45, 0.55, 0.72]), narrow: frame([-2.6, 0.9, -1.7], 8.2, [0.4, 0.56, 0.75]) },
  { ...frame([0.05, 0.6, 0.45], 8.6, [0.5, 0.62, 0.68]), narrow: frame([0.3, 0.6, 0.55], 11, [0.45, 0.7, 0.6]) },
  { ...frame([1.85, 1.35, -1.9], 8.4, [0.42, 0.42, 0.8]), narrow: frame([2.05, 1.45, -2.2], 11.8, [0.25, 0.32, 0.92]) },
  { ...frame([-2.25, 0.8, -1.5], 8.8, [0.48, 0.55, 0.72]), narrow: frame([-2.4, 0.85, -1.6], 9.4, [0.42, 0.56, 0.75]) },
];
const ALL_VIEW: View = { ...frame([4.6, 1.15, -1.1], 14.5, [0.2, 0.36, 0.91]), narrow: frame([5.1, 1.1, -1.3], 17.5, [0.62, 0.42, 0.66]) };

/* Labels: one or two chips per state. */

const cardSpread = (column: number, index: number): Point => [columnX(column), 1.7 - index * 0.32, CARD_Z];
const cardStacked = (column: number, index: number): Point => [columnX(column) - 0.06 + index * 0.05, 1.62 - index * 0.07, CARD_Z + index * 0.018];
const sideCard = (column: number, index: number): Point => [(column - 1) * SIDE.column - 0.04 + index * 0.035, 1.6 - index * 0.06, 0.03 + index * 0.016];

function labelsFor(mode: Mode, step: number): SceneLabel[] {
  if (mode === "all") {
    const [alertColumn, alertIndex] = ALERT_CARD;
    const alert = sideCard(alertColumn, alertIndex);
    return [
      { id: "a", at: [columnX(1), BOARD.y[1] + LIFT, WALL_FACE], title: "Example Project A", detail: "Open work by person", lift: 26 },
      { id: "b", at: [SIDE_BOARDS[0].x, 2.12, SIDE.z], title: "Example Project B", detail: "Open work by person", lift: 26 },
      { id: "attention", at: [SIDE_BOARDS[1].x + alert[0], alert[1] + SIDE.card.height / 2, SIDE.z + alert[2]], title: "Example Project C · Needs attention", detail: "Past its due date", state: "blocked", lift: 64 },
    ];
  }
  switch (step) {
    case 0: return [{ id: "memo", at: [memoX, BINDER.y[1] + LIFT, CAB.z1 - 0.06], title: "Structural memo, rev C (example)", detail: "Approved", state: "select", lift: 54 }];
    case 1: return [{ id: "section", at: [SHEET_REST[0] + 0.04, SHEET_REST[1] + LIFT + 0.01, SHEET_REST[2] + 0.04], title: "Section 4.2, slab thickness", detail: "Structural memo, rev C (example)", state: "select", lift: 40 }];
    case 2: return [
      { id: "decision", at: [-0.45, TABLE.top + LIFT, 0.95], title: "Decision, coordination meeting (example)", detail: "Level 2 slab, see memo rev C", state: "select", lift: 84 },
      { id: "minutes", at: [MINUTES[0] + 0.05, MINUTES[1] + LIFT + 0.01, MINUTES[2] + 0.1], title: "Draft minutes", detail: "Draft for staff review", state: "ok", lift: 30 },
    ];
    case 3: {
      const [x, y, z] = cardSpread(...TASK_CARD);
      return [{ id: "task", at: [x, y + CARD.height / 2 + LIFT, z], title: "Engineer A (example) · Due Friday", detail: "Update Level 2 slab drawings", state: "select", lift: 44 }];
    }
    default: {
      const x = binderX(NEW_NOTE.group, NEW_NOTE.index) + BINDER.width / 2;
      return [{ id: "new", at: [x, BINDER.y[1] + LIFT, CAB.z1 - 0.06], title: "Source kept · Under review", detail: "MEP site note (example), for staff review", state: "ok", lift: 54 }];
    }
  }
}

/* Outlines: the kit edges skip these small-radius rounded boxes, so selection and review edges trace the bounding box instead. */

const outlineCache = new WeakMap<THREE.BufferGeometry, THREE.EdgesGeometry>();
function outlineOf(geometry: THREE.BufferGeometry) {
  let outline = outlineCache.get(geometry);
  if (!outline) {
    geometry.computeBoundingBox();
    const box = geometry.boundingBox ?? new THREE.Box3();
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    outline = new THREE.EdgesGeometry(new THREE.BoxGeometry(size.x, size.y, size.z).translate(center.x, center.y, center.z));
    outlineCache.set(geometry, outline);
  }
  return outline;
}

function Outline({ geometry, material = EDGE_INK }: { geometry: THREE.BufferGeometry; material?: THREE.LineBasicMaterial }) {
  return <lineSegments geometry={outlineOf(geometry)} material={material} renderOrder={3} />;
}

/* Geometry */

const merge = (parts: THREE.BufferGeometry[]) => mergeGeometries(parts) ?? parts[0];

function cabinetGeometry() {
  const { x0, x1, z0, z1, height, shelf } = CAB;
  const parts = [
    bx([x0, x1], [height - 0.04, height], [z0, z1 + 0.02], 0.012),
    bx([x0 + 0.02, x1 - 0.02], [0, 0.08], [z0, z1 - 0.03], 0.01),
    bx([x0, x0 + 0.03], [0.02, height - 0.04], [z0, z1], 0.008),
    bx([x1 - 0.03, x1], [0.02, height - 0.04], [z0, z1], 0.008),
    bx([x0, x1], [0.08, height - 0.04], [z0, z0 + 0.02], 0.004),
    bx([x0 + 0.03, x1 - 0.03], [0.08, 0.1], [z0 + 0.02, z1], 0.004),
    bx([x0 + 0.03, x1 - 0.03], [shelf - 0.03, shelf], [z0 + 0.02, z1], 0.006),
    ...[1, 2].map((bay) => bx([x0 + bay * BAY - 0.015, x0 + bay * BAY + 0.015], [0.1, height - 0.04], [z0 + 0.02, z1], 0.006)),
  ];
  return merge(parts);
}

function binderParts(x: number) {
  return {
    body: bx([x, x + BINDER.width], BINDER.y, BINDER.z, 0.012),
    label: bx([x + 0.016, x + BINDER.width - 0.016], [0.7, 0.83], [BINDER.z[1] - 0.002, BINDER.z[1] + 0.006], 0.003),
  };
}

function libraryGeometry() {
  const groups = BINDERS.map((count, group) => {
    const bodies: THREE.BufferGeometry[] = [];
    const labels: THREE.BufferGeometry[] = [];
    for (let index = 0; index < count; index++) {
      if (group === MEMO.group && index === MEMO.index) continue;
      const parts = binderParts(binderX(group, index));
      bodies.push(parts.body);
      labels.push(parts.label);
    }
    return { body: merge(bodies), label: merge(labels) };
  });
  // Flat sheet stacks on the lower shelf, two per group.
  const stacks = merge([0, 1, 2].flatMap((group) => {
    const left = CAB.x0 + group * BAY + 0.07;
    return [
      bx([left, left + 0.36], [0.1, 0.2 + group * 0.02], [CAB.z0 + 0.06, CAB.z1 - 0.05], 0.008),
      bx([left + 0.42, left + 0.78], [0.1, 0.16], [CAB.z0 + 0.06, CAB.z1 - 0.05], 0.008),
      bx([left + 0.44, left + 0.76], [0.16, 0.25 - group * 0.02], [CAB.z0 + 0.08, CAB.z1 - 0.08], 0.008),
    ];
  }));
  return { groups, stacks };
}

// Local to the binder: x from 0, so the slide only moves along z.
function memoGeometry() {
  return binderParts(0);
}

function sheetGeometry() {
  const width = 0.62;
  const depth = 0.5;
  const sheet = bx([-width / 2, width / 2], [0, 0.008], [-depth / 2, depth / 2], 0.003);
  const rows = [-0.18, -0.13, -0.08, 0.1, 0.15, 0.2];
  const lines = merge(rows.map((z, index) => bx([-0.25, index % 3 === 2 ? 0.05 : 0.22], [0.008, 0.011], [z - 0.008, z + 0.008], 0.001)));
  const section = bx([-0.27, 0.27], [0.008, 0.016], [-0.035, 0.055], 0.003);
  const sectionLines = merge([-0.01, 0.025].map((z) => bx([-0.22, 0.18], [0.016, 0.019], [z - 0.007, z + 0.007], 0.001)));
  return { sheet, lines, section, sectionLines };
}

function tableGeometry() {
  const [x0, x1] = TABLE.x;
  const [z0, z1] = TABLE.z;
  const top = bx([x0, x1], [TABLE.top - 0.05, TABLE.top], [z0, z1], 0.025);
  const legs = merge([[x0 + 0.14, z0 + 0.14], [x1 - 0.14, z0 + 0.14], [x0 + 0.14, z1 - 0.14], [x1 - 0.14, z1 - 0.14]].map(([x, z]) => bx([x - 0.03, x + 0.03], [0, TABLE.top - 0.05], [z - 0.03, z + 0.03], 0.008)));
  const rail = merge([
    bx([x0 + 0.14, x1 - 0.14], [TABLE.top - 0.12, TABLE.top - 0.05], [z0 + 0.12, z0 + 0.15], 0.006),
    bx([x0 + 0.14, x1 - 0.14], [TABLE.top - 0.12, TABLE.top - 0.05], [z1 - 0.15, z1 - 0.12], 0.006),
  ]);
  const shells: THREE.BufferGeometry[] = [];
  const chairLegs: THREE.BufferGeometry[] = [];
  for (const x of [-0.5, 0.3, 1.1]) {
    for (const side of [-1, 1] as const) {
      const z = side < 0 ? z0 - 0.38 : z1 + 0.38;
      const back = side < 0 ? [z - 0.23, z - 0.18] : [z + 0.18, z + 0.23];
      shells.push(bx([x - 0.22, x + 0.22], [0.42, 0.48], [z - 0.21, z + 0.21], 0.025));
      shells.push(bx([x - 0.21, x + 0.21], [0.52, 0.88], back as [number, number], 0.02));
      for (const [dx, dz] of [[-0.18, -0.17], [0.18, -0.17], [-0.18, 0.17], [0.18, 0.17]]) chairLegs.push(cylinder(0.016, 0.42, "y", [x + dx, 0.21, z + dz], 10));
      chairLegs.push(cylinder(0.014, 0.12, "y", [x - 0.17, 0.53, side < 0 ? z - 0.2 : z + 0.2], 10), cylinder(0.014, 0.12, "y", [x + 0.17, 0.53, side < 0 ? z - 0.2 : z + 0.2], 10));
    }
  }
  const minutes = bx([-0.21, 0.21], [0, 0.006], [-0.29, 0.29], 0.002);
  const draft = bx([-0.21, 0.21], [0.006, 0.01], [-0.29, 0.29], 0.002);
  const minutesLines = merge([-0.2, -0.15, -0.1, 0, 0.05, 0.1, 0.18].map((z, index) => bx([-0.15, index % 3 === 1 ? 0.04 : 0.15], [0.006, 0.009], [z - 0.008, z + 0.008], 0.001)));
  const notes = merge([
    bx([0.95, 1.33], [TABLE.top, TABLE.top + 0.006], [0.15, 0.68], 0.002),
    bx([0.97, 1.35], [TABLE.top + 0.006, TABLE.top + 0.012], [0.12, 0.65], 0.002),
  ]);
  const laptop = merge([
    bx([-0.78, -0.36], [TABLE.top, TABLE.top + 0.022], [0.08, 0.38], 0.01),
  ]);
  const mug = cylinder(0.042, 0.1, "y", [1.3, TABLE.top + 0.05, 1.08], 24);
  return { top, legs, rail, shells: merge(shells), chairLegs: merge(chairLegs), minutes, draft, minutesLines, notes, laptop, mug };
}

function wallBoardGeometry() {
  const [x0, x1] = BOARD.x;
  const [y0, y1] = BOARD.y;
  const frame = bx([x0, x1], [y0, y1], [WALL_FACE, WALL_FACE + 0.04], 0.015);
  const panel = bx([x0 + 0.04, x1 - 0.04], [y0 + 0.04, y1 - 0.04], [WALL_FACE + 0.04, WALL_FACE + 0.05], 0.006);
  const headers = merge([0, 1, 2].map((column) => bx([columnX(column) - 0.5, columnX(column) + 0.5], [1.94, 2.06], [WALL_FACE + 0.05, WALL_FACE + 0.056], 0.004)));
  const avatars = merge([0, 1, 2].map((column) => cylinder(0.035, 0.012, "z", [columnX(column) - 0.4, 2, WALL_FACE + 0.06], 20)));
  const dividers = merge([1, 2].map((column) => bx([columnX(column) - COLUMN / 2 - 0.004, columnX(column) - COLUMN / 2 + 0.004], [0.92, 2.06], [WALL_FACE + 0.05, WALL_FACE + 0.054], 0.001)));
  const ledge = bx([x0 + 0.2, x1 - 0.2], [y0 - 0.04, y0], [WALL_FACE, WALL_FACE + 0.1], 0.01);
  return { frame, panel, headers, avatars, dividers, ledge };
}

// Card geometry is local to the card centre so cards can move between spread and stacked.
function cardGeometry(width: number, height: number) {
  const body = bx([-width / 2, width / 2], [-height / 2, height / 2], [-0.007, 0.007], 0.004);
  const lines = merge([
    bx([-width / 2 + 0.06, width * 0.2], [height * 0.14, height * 0.14 + 0.022], [0.006, 0.009], 0.001),
    bx([-width / 2 + 0.06, 0], [-height * 0.12, -height * 0.12 + 0.022], [0.006, 0.009], 0.001),
    bx([width / 2 - 0.06 - width * 0.18, width / 2 - 0.06], [-height / 2 + 0.04, -height / 2 + 0.07], [0.006, 0.01], 0.002),
  ]);
  return { body, lines };
}

function sideBoardGeometry() {
  const half = SIDE.width / 2;
  const structure = merge([
    bx([-half, -half + 0.08], [0, 0.04], [-0.38, 0.38], 0.012),
    bx([half - 0.08, half], [0, 0.04], [-0.38, 0.38], 0.012),
    bx([-half + 0.015, -half + 0.065], [0.04, 2.08], [-0.05, 0], 0.01),
    bx([half - 0.065, half - 0.015], [0.04, 2.08], [-0.05, 0], 0.01),
  ]);
  const frame = bx([-half, half], [0.76, 2.04], [-0.04, 0.005], 0.014);
  const panel = bx([-half + 0.04, half - 0.04], [0.8, 2], [0.005, 0.014], 0.005);
  const headers = merge([-1, 0, 1].map((column) => bx([column * SIDE.column - 0.27, column * SIDE.column + 0.27], [1.84, 1.93], [0.014, 0.019], 0.003)));
  return { structure, frame, panel, headers };
}

/* Scene */

export default function MinerboFuchsScene({ mode, step, onPick, ...runtime }: Props) {
  const all = mode === "all";
  const labels = useMemo(() => labelsFor(mode, step), [mode, step]);
  return (
    <ModelCanvas {...runtime} view={all ? ALL_VIEW : STEP_VIEWS[step]} labels={labels} extent={8} center={[2.4, 0.6, -0.6]} fog={[18, 40]}>
      <Ground />
      <ContactShadow width={10.4} depth={6.8} position={[0, 0.004, -0.1]} opacity={0.42} />
      <Room mode={mode} step={step} onPick={onPick} instant={runtime.instant} />
      <SideBoards all={all} instant={runtime.instant} />
    </ModelCanvas>
  );
}

function Room({ mode, step, onPick, instant }: { mode: Mode; step: number; onPick: (step: number) => void; instant: boolean }) {
  const mine = mode === "mine";
  const pick = (target: number) => (mine ? () => onPick(target) : undefined);
  const shell = useMemo(() => ({
    platform: bx([ROOM.x[0], ROOM.x[1]], [-LIFT, 0], [ROOM.z[0], ROOM.z[1]], 0.03),
    back: bx([ROOM.x[0], ROOM.x[1]], [0, ROOM.height], [ROOM.z[0], WALL_FACE], 0.02),
    side: bx([ROOM.x[0], ROOM.x[0] + 0.15], [0, ROOM.height], [WALL_FACE, ROOM.z[1]], 0.02),
    rug: bx([-1.55, 2.15], [0, 0.012], [-1, 2.1], 0.004),
  }), []);
  return (
    <group position={[0, LIFT, 0]}>
      <Part geometry={shell.platform} material={M.platform} />
      <Part geometry={shell.back} material={M.wall} />
      <Part geometry={shell.side} material={M.wall} />
      <Part geometry={shell.rug} material={M.rug} shadow={false} />
      <ContactShadow width={3.6} depth={2.6} position={[0.3, 0.016, 0.6]} opacity={0.3} />
      <Library mine={mine} step={step} instant={instant} onPick={pick(1)} />
      <Table focus={mine && step === 2} draft={mine && step >= 2} onPick={pick(2)} />
      <WallBoard mine={mine} step={step} instant={instant} onPick={pick(3)} />
    </group>
  );
}

function Library({ mine, step, instant, onPick }: { mine: boolean; step: number; instant: boolean; onPick?: () => void }) {
  const cabinet = useMemo(() => cabinetGeometry(), []);
  const library = useMemo(() => libraryGeometry(), []);
  const memo = useMemo(() => memoGeometry(), []);
  const sheet = useMemo(() => sheetGeometry(), []);
  const note = useMemo(() => binderParts(binderX(NEW_NOTE.group, NEW_NOTE.index)), []);
  const open = useTween(mine && step >= 1 && step <= 3 ? 1 : 0, instant, 900);
  const arrive = useTween(mine && step === 4 ? 1 : 0, instant, 1000);
  const memoRef = useRef<THREE.Group>(null);
  const sheetRef = useRef<THREE.Group>(null);
  const noteRef = useRef<THREE.Group>(null);
  useFrame(() => {
    const t = open.current;
    if (memoRef.current) memoRef.current.position.z = 0.36 * Math.min(1, t * 1.6);
    const s = sheetRef.current;
    if (s) {
      const k = Math.max(0, Math.min(1, (t - 0.3) / 0.7));
      s.visible = k > 0.01;
      s.position.set(SHEET_FROM[0] + (SHEET_REST[0] - SHEET_FROM[0]) * k, SHEET_FROM[1] + (SHEET_REST[1] - SHEET_FROM[1]) * k + Math.sin(k * Math.PI) * 0.18, SHEET_FROM[2] + (SHEET_REST[2] - SHEET_FROM[2]) * k);
      s.scale.setScalar(Math.max(0.001, 0.3 + 0.7 * k));
    }
    const n = noteRef.current;
    if (n) {
      const a = arrive.current;
      n.visible = a > 0.01;
      n.position.set(0, 0.25 * (1 - a), 0.9 * (1 - a));
    }
  });
  const memoSelected = mine && step <= 1;
  return (
    <group {...pickHandlers(onPick)}>
      <Part geometry={cabinet} material={M.carcass} />
      {library.groups.map((group, index) => (
        <group key={index}>
          <Part geometry={group.body} material={BINDER_MATERIALS[index]} />
          <Part geometry={group.label} material={M.label} shadow={false} />
        </group>
      ))}
      <Part geometry={library.stacks} material={M.paper} />
      <group position={[binderX(MEMO.group, MEMO.index), 0, 0]}>
        <group ref={memoRef}>
          <Part geometry={memo.body} material={M.structural} selected={memoSelected} tint={0.62} />
          {memoSelected && <Outline geometry={memo.body} />}
          <Part geometry={memo.label} material={M.label} shadow={false} />
        </group>
      </group>
      <group ref={sheetRef} visible={false}>
        <Part geometry={sheet.sheet} material={M.paper} />
        <mesh geometry={sheet.lines} material={M.line} />
        <Part geometry={sheet.section} material={M.paper} selected={mine && step === 1} shadow={false} />
        {mine && step === 1 && <Outline geometry={sheet.section} />}
        <mesh geometry={sheet.sectionLines} material={M.line} />
      </group>
      <group ref={noteRef} visible={false}>
        <mesh geometry={note.body} material={NOTE_GHOST} renderOrder={2} />
        <Outline geometry={note.body} material={EDGE_OK} />
      </group>
    </group>
  );
}

function Table({ focus, draft, onPick }: { focus: boolean; draft: boolean; onPick?: () => void }) {
  const table = useMemo(() => tableGeometry(), []);
  return (
    <group {...pickHandlers(onPick)}>
      <Part geometry={table.top} material={M.oak} selected={focus} tint={0.45} />
      {focus && <Outline geometry={table.top} />}
      <Part geometry={table.legs} material={M.graphite} />
      <Part geometry={table.rail} material={M.graphite} />
      <Part geometry={table.shells} material={M.shell} />
      <Part geometry={table.chairLegs} material={M.steel} />
      <Part geometry={table.notes} material={M.paper} />
      <Part geometry={table.laptop} material={M.graphite} />
      <Part geometry={table.mug} material={M.paper} />
      <group position={MINUTES} rotation={[0, -0.12, 0]}>
        <mesh geometry={table.minutes} material={M.paper} receiveShadow />
        {draft && <mesh geometry={table.draft} material={PROPOSED} renderOrder={2} />}
        {draft && <Outline geometry={table.draft} material={EDGE_OK} />}
        <mesh geometry={table.minutesLines} material={M.line} />
      </group>
    </group>
  );
}

function WallBoard({ mine, step, instant, onPick }: { mine: boolean; step: number; instant: boolean; onPick?: () => void }) {
  const board = useMemo(() => wallBoardGeometry(), []);
  const card = useMemo(() => cardGeometry(CARD.width, CARD.height), []);
  const cards = useMemo(() => BOARD_A.flatMap((count, column) => Array.from({ length: count }, (_, index) => ({ column, index }))), []);
  const stack = useTween(mine ? 0 : 1, instant, 900);
  const refs = useRef<(THREE.Group | null)[]>([]);
  useFrame(() => {
    const t = stack.current;
    cards.forEach(({ column, index }, i) => {
      const group = refs.current[i];
      if (!group) return;
      const a = cardSpread(column, index);
      const b = cardStacked(column, index);
      group.position.set(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);
    });
  });
  return (
    <group {...pickHandlers(onPick)}>
      <Part geometry={board.frame} material={M.graphite} />
      <Part geometry={board.panel} material={M.board} />
      <Part geometry={board.ledge} material={M.graphite} />
      <mesh geometry={board.headers} material={M.header} />
      <mesh geometry={board.avatars} material={M.graphite} />
      <mesh geometry={board.dividers} material={M.header} />
      {cards.map(({ column, index }, i) => {
        const selected = mine && step === 3 && column === TASK_CARD[0] && index === TASK_CARD[1];
        return (
          <group key={i} ref={(node) => { refs.current[i] = node; }} position={cardSpread(column, index)}>
            <Part geometry={card.body} material={M.card} selected={selected} tint={0.7} />
            <Outline geometry={card.body} material={selected ? EDGE_INK : EDGE_SOFT} />
            <mesh geometry={card.lines} material={M.line} />
          </group>
        );
      })}
    </group>
  );
}

function SideBoards({ all, instant }: { all: boolean; instant: boolean }) {
  const board = useMemo(() => sideBoardGeometry(), []);
  const card = useMemo(() => cardGeometry(SIDE.card.width, SIDE.card.height), []);
  const grow = useTween(all ? 1 : 0, instant, 1000);
  const refs = useRef<(THREE.Group | null)[]>([]);
  useFrame(() => {
    refs.current.forEach((group, index) => {
      if (!group) return;
      const t = Math.max(0, Math.min(1, grow.current * 1.25 - index * 0.25));
      group.visible = t > 0.01;
      group.scale.set(1, Math.max(0.001, t), 1);
    });
  });
  return (
    <>
      {SIDE_BOARDS.map((side, boardIndex) => (
        <group key={side.id} ref={(node) => { refs.current[boardIndex] = node; }} position={[side.x, 0, SIDE.z]} visible={false}>
          <ContactShadow width={2.6} depth={1.2} position={[0, 0.004, 0]} opacity={0.4} />
          <Part geometry={board.structure} material={M.graphite} />
          <Part geometry={board.frame} material={M.graphite} />
          <Part geometry={board.panel} material={M.board} />
          <mesh geometry={board.headers} material={M.header} />
          {side.columns.map((count, column) => Array.from({ length: count }, (_, index) => {
            const alert = side.id === "c" && column === ALERT_CARD[0] && index === ALERT_CARD[1];
            return (
              <group key={`${column}-${index}`} position={sideCard(column, index)}>
                <Part geometry={card.body} material={alert ? M.alert : M.card} />
                <Outline geometry={card.body} material={alert ? EDGE_INK : EDGE_SOFT} />
                {!alert && <mesh geometry={card.lines} material={M.line} />}
              </group>
            );
          }))}
        </group>
      ))}
    </>
  );
}
