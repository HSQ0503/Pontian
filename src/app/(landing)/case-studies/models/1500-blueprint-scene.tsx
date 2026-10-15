"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { SceneRuntime } from "./model-frame";
import {
  bx, ContactShadow, cylinder, EDGE_INK, EDGE_OK, EDGE_SOFT, edgesOf, GHOST, Ground, INK, ModelCanvas, OK, BLOCKED, Part, pickHandlers, PROPOSED, standard, physical,
  useContinuous, useTween, type Point, type SceneLabel, type View,
} from "./scene-kit";
import {
  ACTIVE_SECTION, adminChip, CARD, CURRENT_TILE, GATE_X, LESSON_TILE_Z, LESSON_TILES, MODULES, PAD, PADS, PATH, REVIEW, SECTION_HEIGHT, SECTION_Z, SECTIONS, SLAB,
  STACK_PULL, STACK_Z, STACKS, stopIndex, studentChip, TOKEN_HALT, BARRIER_AT, TOP, TOPIC_STACK, inPlan, type Mode, type ModuleId, type PickId, type PlanKey, type Rect,
} from "./1500-blueprint-data";

export type BlueprintSceneProps = SceneRuntime & { mode: Mode; step: number; plan: PlanKey; onPick: (id: PickId) => void };

const M = {
  plinth: standard("#b9b4aa", 0.92),
  slab: standard("#d6d2c9", 0.9),
  pad: standard("#efede8", 0.85),
  paper: standard("#f7f6f2", 0.72),
  card: standard("#f2f0ea", 0.8),
  warm: standard("#d9d5cc", 0.82),
  bezel: standard("#e4e2dd", 0.48, 0.05),
  screen: physical("#23272a", 0.3, { clearcoat: 0.5, clearcoatRoughness: 0.3 }),
  tile: standard("#42474b", 0.62),
  thumb: standard("#5d6267", 0.6),
  head: standard("#d6d3cc", 0.72),
  graphite: standard("#45494c", 0.5, 0.25),
  steel: standard("#a7abae", 0.38, 0.6),
  track: standard("#c9c6bf", 0.8, 0, { side: THREE.DoubleSide }),
  sweep: standard(INK, 0.6, 0, { side: THREE.DoubleSide }),
  ok: standard(OK, 0.55),
  red: standard(BLOCKED, 0.55),
  off: standard("#bdbab4", 0.6),
  stop: standard("#aeaba5", 0.7),
  case: standard("#3f4447", 0.55),
  feed: standard("#808283", 0.6),
};

/* Path: the same Catmull-Rom curve the drawing uses, laid on the slab top. */

const LAST = PATH.length - 1;
const CURVE = new THREE.CatmullRomCurve3(PATH.map(([x, z]) => new THREE.Vector3(x, TOP, z)), false, "catmullrom", 0.5);
const pathPoint = (index: number, target = new THREE.Vector3()) => CURVE.getPoint(Math.min(1, index / LAST), target);
const tokenScratch = new THREE.Vector3();

function pathDashes() {
  const length = CURVE.getLength();
  const pitch = 0.3;
  const legs: THREE.BufferGeometry[][] = Array.from({ length: LAST }, () => []);
  const point = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  for (let distance = pitch / 2; distance < length; distance += pitch) {
    const u = distance / length;
    const leg = Math.min(LAST - 1, Math.floor(CURVE.getUtoTmapping(u, 0) * LAST));
    CURVE.getPointAt(u, point);
    CURVE.getTangentAt(u, tangent);
    const dash = new THREE.BoxGeometry(0.17, 0.014, 0.075);
    dash.rotateY(Math.atan2(-tangent.z, tangent.x));
    dash.translate(point.x, TOP + 0.008, point.z);
    legs[leg].push(dash);
  }
  return legs.map((pieces) => mergeGeometries(pieces));
}

// A dashed tube along a curve, with an arrowhead at the end.
function dashedTube(curve: THREE.Curve<THREE.Vector3>, radius: number) {
  const count = Math.max(6, Math.round(curve.getLength() / 0.26));
  const pieces: THREE.BufferGeometry[] = [];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  for (let index = 0; index < count - 1; index++) {
    curve.getPointAt(index / count, a);
    curve.getPointAt((index + 0.55) / count, b);
    const direction = b.clone().sub(a);
    const piece = new THREE.CylinderGeometry(radius, radius, direction.length(), 8, 1, true);
    piece.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, direction.clone().normalize()));
    piece.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    pieces.push(piece.toNonIndexed());
  }
  const tip = curve.getPointAt(1);
  const tangent = curve.getTangentAt(1);
  const cone = new THREE.ConeGeometry(radius * 3.4, 0.24, 16);
  cone.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, tangent));
  cone.translate(tip.x - tangent.x * 0.12, tip.y - tangent.y * 0.12, tip.z - tangent.z * 0.12);
  pieces.push(cone.toNonIndexed());
  return mergeGeometries(pieces);
}

/* Views: one per step, framed on the module with its neighbours in view. */

const DIRECTION: Point = [0.34, 0.68, 0.86];
const NARROW_DIRECTION: Point = [0.22, 0.86, 0.72];
function look(target: Point, distance: number, direction = DIRECTION): { position: Point; target: Point } {
  const length = Math.hypot(...direction);
  return { position: [target[0] + (direction[0] / length) * distance, target[1] + (direction[1] / length) * distance, target[2] + (direction[2] / length) * distance], target };
}
const centre = (rect: Rect, y = 0.4): Point => [(rect.x[0] + rect.x[1]) / 2, y, (rect.z[0] + rect.z[1]) / 2];
const blend = (a: Point, b: Point, k: number): Point => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const OVERVIEW: Point = [-0.1, 0.5, 0.15];

function studentView(focusModule: ModuleId): View {
  const focus = centre(PADS[focusModule], 0.6);
  return { ...look(blend(OVERVIEW, focus, 0.22), 23), narrow: look([focus[0] * 0.85, 0.9, focus[2] * 0.55 + 0.3], 19.5, NARROW_DIRECTION) };
}
const ADMIN_FOCUS: Point[] = [[-1.4, 1.0, -0.9], [-1.3, 1.0, -0.2], [-1.9, 1.2, -0.6]];
const ADMIN_NARROW: Point[] = [[-1.8, 1.0, -1.2], [-1.8, 1.0, 0.2], [-3.0, 1.2, -0.6]];
const adminView = (step: number): View => ({ ...look(ADMIN_FOCUS[step], 22.5), narrow: look(ADMIN_NARROW[step], 19.5, NARROW_DIRECTION) });

/* Anchors for the HTML chips. */

const ANCHOR: Record<ModuleId, Point> = {
  lessons: [-3.6, TOP + 2.0, -2.84],
  bank: [STACKS[TOPIC_STACK].x, TOP + 0.62, STACK_Z + STACK_PULL],
  test: [(SECTIONS[ACTIVE_SECTION].x[0] + SECTIONS[ACTIVE_SECTION].x[1]) / 2, TOP + PAD + SECTION_HEIGHT + 0.06, (SECTION_Z[0] + SECTION_Z[1]) / 2],
  review: [(REVIEW.x[0] + REVIEW.x[1]) / 2, TOP + 0.62, (REVIEW.z[0] + REVIEW.z[1]) / 2 - 0.25],
  tutoring: [3.9, TOP + 2.05, -2.86],
};
const EDITOR_TOP: Point = [0.1, TOP + 1.95, -2.7];
const NEW_TILE: Point = [(LESSON_TILES[4][0] + LESSON_TILES[4][1]) / 2, TOP + PAD + 0.4, (LESSON_TILE_Z[0] + LESSON_TILE_Z[1]) / 2];
const EDITED_CARD: Point = [STACKS[TOPIC_STACK].x, TOP + 1.25, STACK_Z + STACK_PULL];
const GATE_TOP: Point = [GATE_X, TOP + 2.08, 0];

function sceneLabels(mode: Mode, step: number, plan: PlanKey): SceneLabel[] {
  if (mode === "admin") {
    const chip = adminChip(step);
    const target = [NEW_TILE, EDITED_CARD, GATE_TOP][step];
    return [
      { id: "editor", at: EDITOR_TOP, title: chip.title, detail: chip.detail, state: chip.state, lift: 26 },
      { id: "target", at: target, title: chip.target.title, detail: chip.target.detail, state: chip.target.state, lift: 30 },
    ];
  }
  const focusModule = MODULES[step];
  const chip = studentChip(step, plan);
  const halted = focusModule === "tutoring" && plan === "b";
  const anchor = halted ? ([pathPoint(BARRIER_AT).x, TOP + 0.66, 0] as Point) : ANCHOR[focusModule];
  return [{ id: "module", at: anchor, title: chip.title, detail: chip.detail, state: chip.state, lift: focusModule === "test" || focusModule === "review" ? 44 : 30 }];
}

/* Base slab with module pads. */

function Base() {
  const geometry = useMemo(() => ({
    plinth: bx([SLAB.x[0], SLAB.x[1]], [0, TOP - 0.05], [SLAB.z[0], SLAB.z[1]], 0.05),
    top: bx([SLAB.x[0] + 0.04, SLAB.x[1] - 0.04], [TOP - 0.07, TOP], [SLAB.z[0] + 0.04, SLAB.z[1] - 0.04], 0.03),
  }), []);
  return (
    <>
      <ContactShadow width={SLAB.x[1] - SLAB.x[0] + 2.4} depth={SLAB.z[1] - SLAB.z[0] + 2.4} opacity={0.42} />
      <Part geometry={geometry.plinth} material={M.plinth} />
      <Part geometry={geometry.top} material={M.slab} />
      <lineSegments geometry={edgesOf(geometry.plinth)} material={EDGE_SOFT} />
    </>
  );
}

function Pad({ rect, ghost }: { rect: Rect; ghost?: boolean }) {
  const geometry = useMemo(() => bx(rect.x, [TOP, TOP + PAD], rect.z, 0.03), [rect]);
  return (
    <>
      <Part geometry={geometry} material={M.pad} ghost={ghost} />
      {!ghost && <lineSegments geometry={edgesOf(geometry)} material={EDGE_SOFT} />}
    </>
  );
}

/* Membership gate: the plan decides which indicator lights show open modules. */

function Gate({ plan, selected, onPick }: { plan: PlanKey; selected: boolean; onPick: () => void }) {
  const geometry = useMemo(() => ({
    threshold: bx([GATE_X - 0.22, GATE_X + 0.22], [TOP, TOP + 0.02], [-0.74, 0.74], 0.008),
    posts: [-1, 1].map((side) => bx([GATE_X - 0.12, GATE_X + 0.12], [TOP, TOP + 1.8], side < 0 ? [-0.98, -0.74] : [0.74, 0.98], 0.03)),
    lintel: bx([GATE_X - 0.16, GATE_X + 0.16], [TOP + 1.8, TOP + 2.06], [-0.98, 0.98], 0.035),
    lights: MODULES.map((_, index) => cylinder(0.055, 0.03, "x", [GATE_X + 0.17, TOP + 1.93, -0.56 + index * 0.28], 20)),
    reader: bx([GATE_X + 0.12, GATE_X + 0.2], [TOP + 0.92, TOP + 1.24], [0.78, 0.94], 0.012),
  }), []);
  return (
    <group {...pickHandlers(onPick)}>
      <Part geometry={geometry.threshold} material={M.steel} />
      {geometry.posts.map((post, index) => <Part key={index} geometry={post} material={M.bezel} selected={selected} tint={0.55} />)}
      <Part geometry={geometry.lintel} material={M.bezel} selected={selected} tint={0.55} />
      {geometry.lights.map((light, index) => <mesh key={index} geometry={light} material={inPlan(plan, MODULES[index]) ? M.ok : M.off} />)}
      <Part geometry={geometry.reader} material={M.graphite} />
    </group>
  );
}

/* Lessons: a screen with a play mark, a progress bar and a row of lesson tiles. */

function playMark(size: number, center: Point) {
  const shape = new THREE.Shape();
  shape.moveTo(-size * 0.42, -size * 0.5);
  shape.lineTo(size * 0.58, 0);
  shape.lineTo(-size * 0.42, size * 0.5);
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, { depth: 0.012, bevelEnabled: false }).translate(...center);
}

function Lessons({ focus, publishing, playing, instant, onPick }: { focus: boolean; publishing: boolean; playing: boolean; instant: boolean; onPick: () => void }) {
  const geometry = useMemo(() => ({
    foot: bx([-4.1, -3.1], [TOP + PAD, TOP + PAD + 0.05], [-3.05, -2.55], 0.02),
    post: bx([-3.67, -3.53], [TOP + PAD + 0.05, TOP + 0.62], [-2.95, -2.82], 0.02),
    panel: bx([-4.85, -2.35], [TOP + 0.56, TOP + 1.96], [-2.96, -2.82], 0.035),
    screen: bx([-4.75, -2.45], [TOP + 0.66, TOP + 1.86], [-2.83, -2.81], 0.004),
    play: playMark(0.42, [-3.62, TOP + 1.32, -2.81]),
    track: bx([-4.6, -2.6], [TOP + 0.76, TOP + 0.79], [-2.82, -2.8], 0.004),
    fill: new THREE.BoxGeometry(1, 0.034, 0.024).translate(0.5, TOP + 0.775, -2.8),
    tiles: LESSON_TILES.map((x) => ({
      body: bx(x, [TOP + PAD, TOP + PAD + 0.07], LESSON_TILE_Z, 0.015),
      thumb: bx([x[0] + 0.05, x[1] - 0.05], [TOP + PAD + 0.07, TOP + PAD + 0.078], [LESSON_TILE_Z[0] + 0.06, LESSON_TILE_Z[0] + 0.36], 0.003),
      line: bx([x[0] + 0.05, x[1] - 0.14], [TOP + PAD + 0.07, TOP + PAD + 0.076], [LESSON_TILE_Z[0] + 0.45, LESSON_TILE_Z[0] + 0.5], 0.002),
    })),
  }), []);
  const fill = useRef<THREE.Mesh>(null);
  const newTile = useRef<THREE.Group>(null);
  const lift = useTween(publishing ? 0.34 : 0, instant, 800);
  const looping = playing && !instant;
  useContinuous(looping);
  useFrame(() => {
    if (fill.current) {
      const progress = looping ? (performance.now() / 9000) % 1 : 0.42;
      fill.current.scale.x = Math.max(0.02, progress * 2);
    }
    if (newTile.current) newTile.current.position.y = lift.current;
  });
  const last = geometry.tiles.length - 1;
  return (
    <group {...pickHandlers(onPick)}>
      <Pad rect={PADS.lessons} />
      <ContactShadow width={3.2} depth={1.2} position={[-3.6, TOP + PAD + 0.004, -2.75]} opacity={0.3} />
      <Part geometry={geometry.foot} material={M.steel} />
      <Part geometry={geometry.post} material={M.steel} />
      <Part geometry={geometry.panel} material={M.bezel} selected={focus} tint={0.5} />
      <mesh geometry={geometry.screen} material={M.screen} />
      <mesh geometry={geometry.play} material={M.paper} />
      <mesh geometry={geometry.track} material={M.thumb} />
      <mesh ref={fill} geometry={geometry.fill} material={M.paper} position={[-4.6, 0, 0]} />
      {geometry.tiles.map((tile, index) => index === last ? null : (
        <group key={index}>
          <Part geometry={tile.body} material={M.paper} selected={focus && index === CURRENT_TILE} />
          <mesh geometry={tile.thumb} material={M.tile} />
          <mesh geometry={tile.line} material={M.off} />
        </group>
      ))}
      <group ref={newTile}>
        <mesh geometry={geometry.tiles[last].body} material={publishing ? PROPOSED : M.paper} castShadow />
        <lineSegments geometry={edgesOf(geometry.tiles[last].body)} material={publishing ? EDGE_OK : EDGE_INK} visible={publishing} />
        <mesh geometry={geometry.tiles[last].thumb} material={M.tile} />
        <mesh geometry={geometry.tiles[last].line} material={M.off} />
      </group>
    </group>
  );
}

/* Question bank: card stacks sorted by topic, one topic pulled forward. */

function stackGeometry(cards: number, seed: number) {
  const pieces: THREE.BufferGeometry[] = [];
  const half = { x: CARD.width / 2, z: CARD.depth / 2 };
  for (let index = 0; index < cards; index++) {
    const y = TOP + PAD + index * (CARD.thickness + CARD.gap);
    const jitter = Math.sin((index + 1) * 12.9898 + seed * 78.233) * 0.016;
    const shift = Math.cos((index + 1) * 4.1414 + seed * 3.1) * 0.012;
    pieces.push(bx([-half.x + jitter, half.x + jitter], [y, y + CARD.thickness], [-half.z + shift, half.z + shift], 0.008));
  }
  return mergeGeometries(pieces);
}

function Bank({ pulled, focus, editing, instant, onPick }: { pulled: boolean; focus: boolean; editing: boolean; instant: boolean; onPick: () => void }) {
  const geometry = useMemo(() => STACKS.map((stack, index) => {
    const height = stack.cards * (CARD.thickness + CARD.gap);
    return {
      cards: stackGeometry(stack.cards, index),
      tab: bx([-CARD.width / 2 + 0.03, CARD.width / 2 - 0.03], [TOP + PAD, TOP + PAD + height + 0.2], [-CARD.depth / 2 - 0.05, -CARD.depth / 2 - 0.025], 0.01),
      notch: bx([-0.12, 0.12], [TOP + PAD + height + 0.12, TOP + PAD + height + 0.17], [-CARD.depth / 2 - 0.026, -CARD.depth / 2 - 0.02], 0.004),
      height,
    };
  }), []);
  const single = useMemo(() => bx([-CARD.width / 2, CARD.width / 2], [0, CARD.thickness], [-CARD.depth / 2, CARD.depth / 2], 0.008), []);
  const pull = useTween(pulled ? 1 : 0, instant, 800);
  const lift = useTween(editing ? 1 : 0, instant, 800);
  const topic = useRef<THREE.Group>(null);
  const card = useRef<THREE.Group>(null);
  const topHeight = geometry[TOPIC_STACK].height;
  useFrame(() => {
    if (topic.current) topic.current.position.z = STACK_Z + pull.current * STACK_PULL;
    if (card.current) {
      card.current.position.y = TOP + PAD + topHeight + 0.08 + lift.current * 0.55;
      card.current.position.z = STACK_Z + STACK_PULL;
      card.current.rotation.x = lift.current * 0.28;
      card.current.visible = lift.current > 0.01;
    }
  });
  return (
    <group {...pickHandlers(onPick)}>
      <Pad rect={PADS.bank} />
      {geometry.map((stack, index) => {
        const selected = index === TOPIC_STACK && focus;
        const body = (
          <>
            <Part geometry={stack.cards} material={M.card} selected={selected} edges={index === TOPIC_STACK && pulled && !focus} />
            <Part geometry={stack.tab} material={M.warm} selected={selected} />
            <mesh geometry={stack.notch} material={M.graphite} />
          </>
        );
        return index === TOPIC_STACK
          ? <group key={index} ref={topic} position={[STACKS[index].x, 0, STACK_Z]}>{body}</group>
          : <group key={index} position={[STACKS[index].x, 0, STACK_Z]}>{body}</group>;
      })}
      <group ref={card} position={[STACKS[TOPIC_STACK].x, 0, STACK_Z]} visible={false}>
        <mesh geometry={single} material={PROPOSED} />
        <lineSegments geometry={edgesOf(single)} material={EDGE_OK} />
      </group>
      <ContactShadow width={3.6} depth={1.6} position={[-3.45, TOP + PAD + 0.004, STACK_Z + 0.2]} opacity={0.28} />
    </group>
  );
}

/* Practice test: four timed sections in order, with a timer dial on the active one. */

const DIAL = { inner: 0.17, outer: 0.24, segments: 64 };
const DIAL_CENTRE: Point = [(SECTIONS[ACTIVE_SECTION].x[0] + SECTIONS[ACTIVE_SECTION].x[1]) / 2, TOP + PAD + SECTION_HEIGHT, (SECTION_Z[0] + SECTION_Z[1]) / 2 + 0.18];

function Test({ focus, timing, instant, onPick }: { focus: boolean; timing: boolean; instant: boolean; onPick: () => void }) {
  const dialCentre = DIAL_CENTRE;
  const geometry = useMemo(() => ({
    blocks: SECTIONS.map((section) => ({
      body: bx(section.x, [TOP + PAD, TOP + PAD + SECTION_HEIGHT], SECTION_Z, 0.04),
      lines: [0, 1, 2].map((row) => bx([section.x[0] + 0.12, section.x[1] - (row === 2 ? 0.3 : 0.12)], [TOP + PAD + SECTION_HEIGHT, TOP + PAD + SECTION_HEIGHT + 0.006], [SECTION_Z[0] + 0.14 + row * 0.13, SECTION_Z[0] + 0.18 + row * 0.13], 0.002)),
      saved: bx([section.x[0] + 0.1, section.x[0] + 0.34], [TOP + PAD + SECTION_HEIGHT - 0.12, TOP + PAD + SECTION_HEIGHT - 0.06], [SECTION_Z[1], SECTION_Z[1] + 0.012], 0.004),
    })),
    puck: cylinder(0.29, 0.05, "y", [dialCentre[0], dialCentre[1] + 0.025, dialCentre[2]], 48),
    track: new THREE.RingGeometry(DIAL.inner, DIAL.outer, DIAL.segments, 1, -Math.PI / 2, Math.PI * 2).rotateX(Math.PI / 2).translate(dialCentre[0], dialCentre[1] + 0.052, dialCentre[2]),
    sweep: new THREE.RingGeometry(DIAL.inner, DIAL.outer, DIAL.segments, 1, -Math.PI / 2, Math.PI * 2).rotateX(Math.PI / 2).translate(dialCentre[0], dialCentre[1] + 0.056, dialCentre[2]),
  }), [dialCentre]);
  const sweep = useRef<THREE.Mesh>(null);
  const looping = timing && !instant;
  useContinuous(looping);
  useFrame(() => {
    const progress = looping ? (performance.now() / 6000) % 1 : 0.62;
    sweep.current?.geometry.setDrawRange(0, 6 * Math.max(1, Math.round(progress * DIAL.segments)));
  });
  return (
    <group {...pickHandlers(onPick)}>
      <Pad rect={PADS.test} />
      <ContactShadow width={4.4} depth={1.9} position={[0.7, TOP + PAD + 0.004, 2.05]} opacity={0.3} />
      {geometry.blocks.map((block, index) => (
        <group key={SECTIONS[index].id}>
          <Part geometry={block.body} material={SECTIONS[index].math ? M.warm : M.paper} selected={focus && index === ACTIVE_SECTION} tint={0.6} />
          {block.lines.map((line, row) => <mesh key={row} geometry={line} material={M.off} />)}
          {index < ACTIVE_SECTION && <mesh geometry={block.saved} material={M.ok} />}
        </group>
      ))}
      <Part geometry={geometry.puck} material={M.paper} edges={focus} />
      <mesh geometry={geometry.track} material={M.track} />
      <mesh ref={sweep} geometry={geometry.sweep} material={M.sweep} />
    </group>
  );
}

/* Review: a saved attempt on a reading board, with earlier attempts stacked beside it. */

function Review({ focus, onPick }: { focus: boolean; onPick: () => void }) {
  const width = REVIEW.x[1] - REVIEW.x[0];
  const depth = REVIEW.z[1] - REVIEW.z[0];
  const geometry = useMemo(() => {
    const cellX = (width - 0.5) / REVIEW.columns;
    const cellZ = (depth - 0.62) / REVIEW.rows;
    const markers = { ok: [] as THREE.BufferGeometry[], flagged: [] as THREE.BufferGeometry[] };
    const lines: THREE.BufferGeometry[] = [];
    for (let row = 0; row < REVIEW.rows; row++) {
      for (let column = 0; column < REVIEW.columns; column++) {
        const index = row * REVIEW.columns + column;
        const x0 = -width / 2 + 0.25 + column * cellX + 0.04;
        const z0 = -depth / 2 + 0.44 + row * cellZ + 0.05;
        const marker = new THREE.BoxGeometry(cellX - 0.1, 0.012, 0.09).translate(x0 + (cellX - 0.1) / 2, 0.072, z0 + 0.045);
        const line = new THREE.BoxGeometry(cellX * 0.6, 0.008, 0.035).translate(x0 + cellX * 0.3, 0.07, z0 + 0.17);
        (REVIEW.flagged.includes(index) ? markers.flagged : markers.ok).push(marker);
        lines.push(line);
      }
    }
    return {
      board: bx([-width / 2, width / 2], [0, 0.05], [-depth / 2, depth / 2], 0.02),
      sheet: bx([-width / 2 + 0.12, width / 2 - 0.12], [0.05, 0.064], [-depth / 2 + 0.12, depth / 2 - 0.12], 0.004),
      header: new THREE.BoxGeometry(width * 0.42, 0.008, 0.08).translate(-width / 2 + 0.25 + width * 0.21, 0.068, -depth / 2 + 0.26),
      ok: mergeGeometries(markers.ok),
      flagged: mergeGeometries(markers.flagged),
      lines: mergeGeometries(lines),
      stand: bx([-width / 2 + 0.1, width / 2 - 0.1], [TOP + PAD, TOP + PAD + 0.5], [REVIEW.z[0] + 0.05, REVIEW.z[0] + 0.32], 0.02),
      attempts: [0, 1, 2].map((index) => bx([5.5, 6.18], [TOP + PAD + index * 0.022, TOP + PAD + index * 0.022 + 0.014], [1.3, 2.25], 0.004).translate(index * 0.02 - 0.01, 0, index * -0.03)),
    };
  }, [width, depth]);
  return (
    <group {...pickHandlers(onPick)}>
      <Pad rect={PADS.review} />
      <ContactShadow width={3.4} depth={2.2} position={[4.7, TOP + PAD + 0.004, 2.0]} opacity={0.28} />
      <Part geometry={geometry.stand} material={M.warm} />
      <group position={[(REVIEW.x[0] + REVIEW.x[1]) / 2, TOP + PAD + 0.22, (REVIEW.z[0] + REVIEW.z[1]) / 2]} rotation={[0.32, 0, 0]}>
        <Part geometry={geometry.board} material={M.bezel} selected={focus} tint={0.5} />
        <Part geometry={geometry.sheet} material={M.paper} />
        <mesh geometry={geometry.header} material={M.thumb} />
        <mesh geometry={geometry.lines} material={M.off} />
        <mesh geometry={geometry.ok} material={M.ok} />
        <mesh geometry={geometry.flagged} material={M.red} />
      </group>
      {geometry.attempts.map((sheet, index) => <Part key={index} geometry={sheet} material={M.paper} />)}
    </group>
  );
}

/* Tutoring: a group-call screen and a shelf of recordings. */

function Tutoring({ focus, ghost, onPick }: { focus: boolean; ghost: boolean; onPick: () => void }) {
  const geometry = useMemo(() => {
    const screen = { x: [2.75, 5.95] as [number, number], y: [TOP + 0.6, TOP + 2.0] as [number, number], z: -2.84 };
    const tiles = [];
    const columns = 3;
    const tileW = (screen.x[1] - screen.x[0] - 0.24 - 0.08 * (columns - 1)) / columns;
    const tileH = (screen.y[1] - screen.y[0] - 0.24 - 0.08) / 2;
    for (let row = 0; row < 2; row++) {
      for (let column = 0; column < columns; column++) {
        const x0 = screen.x[0] + 0.12 + column * (tileW + 0.08);
        const y0 = screen.y[1] - 0.12 - (row + 1) * tileH - row * 0.08;
        const cx = x0 + tileW / 2;
        tiles.push({
          body: bx([x0, x0 + tileW], [y0, y0 + tileH], [screen.z, screen.z + 0.012], 0.01),
          head: cylinder(tileH * 0.16, 0.012, "z", [cx, y0 + tileH * 0.6, screen.z + 0.016], 24),
          shoulders: bx([cx - tileW * 0.2, cx + tileW * 0.2], [y0 + 0.02, y0 + tileH * 0.36], [screen.z + 0.01, screen.z + 0.022], 0.06),
        });
      }
    }
    const cases: THREE.BufferGeometry[] = [];
    for (const level of [0, 1]) {
      for (let index = 0; index < 11; index++) {
        const x0 = 2.95 + index * 0.18 + (index > 6 ? 0.18 : 0);
        const y0 = TOP + PAD + 0.06 + level * 0.4;
        cases.push(bx([x0, x0 + 0.1], [y0, y0 + 0.3 - (index % 3) * 0.02], [-1.5, -1.12], 0.01));
      }
    }
    return {
      feet: [3.3, 5.4].map((x) => bx([x - 0.3, x + 0.3], [TOP + PAD, TOP + PAD + 0.05], [-3.12, -2.62], 0.02)),
      posts: [3.3, 5.4].map((x) => bx([x - 0.06, x + 0.06], [TOP + PAD + 0.05, TOP + 0.66], [-2.97, -2.86], 0.02)),
      panel: bx([screen.x[0] - 0.1, screen.x[1] + 0.1], [screen.y[0] - 0.1, screen.y[1] + 0.1], [screen.z - 0.13, screen.z], 0.035),
      screen: bx([screen.x[0], screen.x[1]], [screen.y[0], screen.y[1]], [screen.z - 0.01, screen.z + 0.006], 0.004),
      tiles,
      shelf: [
        bx([2.85, 5.55], [TOP + PAD, TOP + PAD + 0.06], [-1.56, -1.06], 0.015),
        bx([2.85, 5.55], [TOP + PAD + 0.4, TOP + PAD + 0.46], [-1.56, -1.06], 0.015),
        bx([2.85, 5.55], [TOP + PAD + 0.8, TOP + PAD + 0.86], [-1.56, -1.06], 0.015),
        bx([2.85, 2.91], [TOP + PAD, TOP + PAD + 0.86], [-1.56, -1.06], 0.01),
        bx([5.49, 5.55], [TOP + PAD, TOP + PAD + 0.86], [-1.56, -1.06], 0.01),
        bx([2.85, 5.55], [TOP + PAD, TOP + PAD + 0.86], [-1.58, -1.54], 0.01),
      ],
      cases: mergeGeometries(cases),
    };
  }, []);
  const student = 4;
  return (
    <group {...pickHandlers(onPick)}>
      <Pad rect={PADS.tutoring} ghost={ghost} />
      {!ghost && <ContactShadow width={4.2} depth={1.4} position={[4.3, TOP + PAD + 0.004, -2.7]} opacity={0.3} />}
      {geometry.feet.map((foot, index) => <Part key={index} geometry={foot} material={M.steel} ghost={ghost} />)}
      {geometry.posts.map((post, index) => <Part key={index} geometry={post} material={M.steel} ghost={ghost} />)}
      <Part geometry={geometry.panel} material={M.bezel} selected={focus} ghost={ghost} tint={0.5} />
      {!ghost && <mesh geometry={geometry.screen} material={M.screen} />}
      {!ghost && geometry.tiles.map((tile, index) => (
        <group key={index}>
          <Part geometry={tile.body} material={M.tile} selected={focus && index === student} shadow={false} />
          <mesh geometry={tile.head} material={M.head} />
          <mesh geometry={tile.shoulders} material={M.head} />
        </group>
      ))}
      {geometry.shelf.map((board, index) => <Part key={index} geometry={board} material={M.warm} ghost={ghost} />)}
      <Part geometry={geometry.cases} material={M.case} ghost={ghost} />
    </group>
  );
}

/* Admin editor: a console whose screen rows match the three publishing tasks. */

function Editor({ mode, step, onPick }: { mode: Mode; step: number; onPick: () => void }) {
  const ghost = mode === "student";
  const geometry = useMemo(() => ({
    body: bx([-0.95, 1.15], [TOP + PAD, TOP + 0.66], [-2.95, -1.45], 0.035),
    top: bx([-1.05, 1.25], [TOP + 0.66, TOP + 0.73], [-3.05, -1.3], 0.025),
    stand: bx([0.02, 0.18], [TOP + 0.73, TOP + 1.0], [-2.86, -2.72], 0.02),
    panel: bx([-0.7, 0.9], [TOP + 0.98, TOP + 1.9], [-2.82, -2.7], 0.03),
    screen: bx([-0.62, 0.82], [TOP + 1.05, TOP + 1.83], [-2.71, -2.69], 0.004),
    rows: [0, 1, 2].map((row) => bx([-0.52, 0.72], [TOP + 1.62 - row * 0.24, TOP + 1.76 - row * 0.24], [-2.69, -2.68], 0.006)),
    keyboard: bx([-0.45, 0.65], [TOP + 0.73, TOP + 0.76], [-2.15, -1.7], 0.01),
    papers: bx([0.8, 1.15], [TOP + 0.73, TOP + 0.8], [-2.3, -1.85], 0.006),
  }), []);
  const selected = mode === "admin";
  return (
    <group {...pickHandlers(onPick)}>
      <Pad rect={PADS.editor} ghost={ghost} />
      {!ghost && <ContactShadow width={2.8} depth={2} position={[0.1, TOP + PAD + 0.004, -2.2]} opacity={0.3} />}
      <Part geometry={geometry.body} material={M.bezel} ghost={ghost} />
      <Part geometry={geometry.top} material={M.warm} ghost={ghost} />
      <Part geometry={geometry.stand} material={M.steel} ghost={ghost} />
      <Part geometry={geometry.panel} material={M.bezel} ghost={ghost} selected={selected} tint={0.5} />
      {!ghost && <mesh geometry={geometry.screen} material={M.screen} />}
      {!ghost && geometry.rows.map((row, index) => <Part key={index} geometry={row} material={index === step ? M.paper : M.thumb} selected={index === step} shadow={false} />)}
      <Part geometry={geometry.keyboard} material={M.graphite} ghost={ghost} />
      <Part geometry={geometry.papers} material={M.paper} ghost={ghost} />
    </group>
  );
}

/* Student path: walked legs in solid blue, legs ahead translucent, a token at the current stop. */

function StudentPath({ mode, step, plan, instant }: { mode: Mode; step: number; plan: PlanKey; instant: boolean }) {
  const legs = useMemo(() => pathDashes(), []);
  const geometry = useMemo(() => {
    const barrier = pathPoint(BARRIER_AT);
    return {
      stops: MODULES.map((_, index) => {
        const point = pathPoint(stopIndex(index));
        return new THREE.RingGeometry(0.2, 0.28, 40).rotateX(-Math.PI / 2).translate(point.x, TOP + 0.006, point.z);
      }),
      base: cylinder(0.17, 0.06, "y", [0, 0.03, 0], 32),
      body: new THREE.CylinderGeometry(0.075, 0.13, 0.3, 32).translate(0, 0.21, 0),
      head: new THREE.SphereGeometry(0.1, 24, 16).translate(0, 0.46, 0),
      posts: [-0.76, 0.76].map((z) => cylinder(0.05, 0.7, "y", [barrier.x, TOP + 0.35, z], 16)),
      bar: bx([barrier.x - 0.07, barrier.x + 0.07], [TOP + 0.5, TOP + 0.66], [-0.8, 0.8], 0.03),
    };
  }, []);
  const student = mode === "student";
  const halted = student && step === 4 && plan === "b";
  const at = useTween(student ? (halted ? TOKEN_HALT : stopIndex(step)) : 1, instant, 1300);
  const token = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!token.current) return;
    pathPoint(at.current, tokenScratch);
    token.current.position.set(tokenScratch.x, TOP, tokenScratch.z);
  });
  const reached = stopIndex(step);
  return (
    <>
      {legs.map((leg, index) => {
        const closed = plan === "b" && index >= 5;
        const material = !student || closed ? GHOST : index < reached ? M.ok : PROPOSED;
        return <mesh key={index} geometry={leg} material={material} receiveShadow />;
      })}
      {geometry.stops.map((ring, index) => {
        const closed = plan === "b" && MODULES[index] === "tutoring";
        return <mesh key={index} geometry={ring} material={!student || closed ? GHOST : index <= step ? M.ok : M.stop} />;
      })}
      {plan === "b" && student && (
        <>
          {geometry.posts.map((post, index) => <Part key={index} geometry={post} material={M.graphite} />)}
          <Part geometry={geometry.bar} material={M.red} edges />
        </>
      )}
      <group ref={token} visible={student} scale={1.3}>
        <Part geometry={geometry.base} material={M.paper} selected />
        <Part geometry={geometry.body} material={M.paper} selected />
        <mesh geometry={geometry.head} material={M.paper} castShadow />
      </group>
    </>
  );
}

/* Admin feeds: dashed arcs from the editor to lessons, the question bank and the gate. */

function Feeds({ step }: { step: number }) {
  const geometry = useMemo(() => {
    const arc = (from: Point, to: Point, rise: number) => {
      const start = new THREE.Vector3(...from);
      const end = new THREE.Vector3(...to);
      const control = start.clone().add(end).multiplyScalar(0.5);
      control.y = Math.max(start.y, end.y) + rise;
      return dashedTube(new THREE.QuadraticBezierCurve3(start, control, end), 0.028);
    };
    return [
      arc([-0.95, TOP + 0.72, -2.2], [NEW_TILE[0] + 0.05, NEW_TILE[1] + 0.06, NEW_TILE[2] - 0.15], 1.0),
      arc([-0.4, TOP + 0.74, -1.35], [EDITED_CARD[0] + 0.2, EDITED_CARD[1] + 0.12, EDITED_CARD[2] - 0.2], 1.6),
      arc([-0.7, TOP + 1.9, -2.76], [GATE_X + 0.18, TOP + 2.2, 0], 2.0),
    ];
  }, []);
  return <>{geometry.map((feed, index) => <mesh key={index} geometry={feed} material={index === step ? M.ok : M.feed} castShadow={index === step} />)}</>;
}

export default function BlueprintScene({ mode, step, plan, onPick, ...runtime }: BlueprintSceneProps) {
  const student = mode === "student";
  const focusModule = student ? MODULES[step] : null;
  const view = student ? studentView(MODULES[step]) : adminView(step);
  const labels = useMemo(() => sceneLabels(mode, step, plan), [mode, step, plan]);
  const pick = (id: PickId) => () => onPick(id);
  return (
    <ModelCanvas {...runtime} view={view} labels={labels} extent={9} center={[0, 0.5, 0]} fov={26} exposure={0.82}>
      <Ground />
      <Base />
      <Gate plan={student ? plan : "a"} selected={!student && step === 2} onPick={pick("gate")} />
      <Lessons focus={focusModule === "lessons"} publishing={!student && step === 0} playing={focusModule === "lessons"} instant={runtime.instant} onPick={pick("lessons")} />
      <Bank pulled={focusModule === "bank" || (!student && step === 1)} focus={focusModule === "bank"} editing={!student && step === 1} instant={runtime.instant} onPick={pick("bank")} />
      <Test focus={focusModule === "test"} timing={focusModule === "test"} instant={runtime.instant} onPick={pick("test")} />
      <Review focus={focusModule === "review"} onPick={pick("review")} />
      <Tutoring focus={focusModule === "tutoring" && plan === "a"} ghost={student && !inPlan(plan, "tutoring")} onPick={pick("tutoring")} />
      <Editor mode={mode} step={student ? -1 : step} onPick={pick("editor")} />
      <StudentPath mode={mode} step={step} plan={plan} instant={runtime.instant} />
      {!student && <Feeds step={step} />}
    </ModelCanvas>
  );
}
