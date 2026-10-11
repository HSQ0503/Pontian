"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type PointerEvent, type RefObject } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import styles from "./construction.module.css";
import {
  BOARD_STACK, CORE_X, CORRIDOR, DOOR_HEAD, DOOR_WIDTH, DOORS, FLOOR, LIFT, LIFT_DOOR, QUOTED, UNQUOTED, WALL_HEIGHT, WALLS,
  doorById, doorCenter, wallBox, wallBoxes, type Box, type Door, type Range, type Wall, type WallKind,
} from "./construction-floor";

export type BidMode = "drawing" | "quote";
export type SceneKind = { kind: "bid"; mode: BidMode } | { kind: "change"; revised: boolean } | { kind: "site"; stacked: boolean };
export type SceneProps = SceneKind & { active: boolean; instant: boolean; onReady: () => void };

/* Shared 3D conventions: yellow tint plus ink edges for selection, blue for
   proposed or OK, white HTML chips with an ink leader. */

const INK = "#17191a";
const SELECT = "#fed603";
const OK = "#007dfe";
const GROUND = "#f5f5f2";

const standard = (color: string, roughness: number, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });

// The site capture is the same geometry in flatter, darker greys, so the only
// thing that reads as different between the two views is the doorway itself.
function palette(capture: boolean) {
  const tone = (model: string, scan: string) => (capture ? scan : model);
  return {
    slab: standard(tone("#c4c4c0", "#8f908e"), 0.95),
    floor: standard(tone("#ecebe7", "#a5a6a4"), 0.92),
    corridor: standard(tone("#dcdad4", "#979896"), 0.9),
    exterior: standard(tone("#d2d3d0", "#a9aaa8"), 0.84),
    partition: standard(tone("#f4f4f2", "#c2c3c1"), 0.86),
    core: standard(tone("#bebfbc", "#9d9e9c"), 0.88),
    cap: standard("#3b3e40", 0.7),
    frame: standard(tone("#6e7173", "#5c5f61"), 0.5, 0.25),
    leaf: standard(tone("#cdc9c1", "#a9aaa7"), 0.6),
    handle: standard("#a3a6a8", 0.3, 0.85),
    glass: new THREE.MeshPhysicalMaterial({ color: tone("#2b3943", "#3a4046"), roughness: 0.08, transparent: true, opacity: 0.45, envMapIntensity: 1.3 }),
    mullion: standard("#55595c", 0.5, 0.3),
    stair: standard(tone("#d2d2ce", "#a6a7a5"), 0.9),
    ceiling: standard(tone("#f2f2f0", "#b4b5b3"), 0.92),
    fixture: new THREE.MeshBasicMaterial({ color: tone("#ffffff", "#e2e2e0"), toneMapped: false }),
    liftDoor: standard(tone("#8e9194", "#707275"), 0.4, 0.6),
  };
}
type Palette = ReturnType<typeof palette>;
const MODEL = palette(false);
const CAPTURE = palette(true);

const tint = (material: THREE.MeshStandardMaterial, color: string, strength: number) => {
  const copy = material.clone();
  copy.color.lerp(new THREE.Color(color), strength);
  return copy;
};
const ADDED_WALL = tint(MODEL.partition, SELECT, 0.55);
const LEAF_SELECTED = tint(MODEL.leaf, SELECT, 0.62);
const LEAF_OK = tint(MODEL.leaf, OK, 0.4);
const LEAF_GHOST = new THREE.MeshStandardMaterial({ color: SELECT, roughness: 0.6, transparent: true, opacity: 0.32, depthWrite: false });
const EDGE_INK = new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.85 });
const EDGE_DASHED = new THREE.LineDashedMaterial({ color: INK, dashSize: 0.1, gapSize: 0.07 });
const SWING_LINE = new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.3 });
const SWING_FILL = new THREE.MeshBasicMaterial({ color: SELECT, transparent: true, opacity: 0.55, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
const TIMBER = standard("#a08d6d", 0.9);
const BOARD = standard("#e8e4d9", 0.92);
const STUD = standard("#a6a9ac", 0.45, 0.55);

/* Geometry: everything is laid out in metres from construction-floor. */

function block({ x, y, z }: Box) {
  return new THREE.BoxGeometry(x[1] - x[0], y[1] - y[0], z[1] - z[0]).translate((x[0] + x[1]) / 2, (y[0] + y[1]) / 2, (z[0] + z[1]) / 2);
}
function merged(boxes: Box[]) {
  return (boxes.length ? mergeGeometries(boxes.map(block)) : null) ?? new THREE.BufferGeometry();
}

const JAMB = 0.05;

function frameBoxes(wall: Wall): Box[] {
  return wall.openings.filter((opening) => opening.sill === undefined).flatMap((opening) => {
    const reveal = { ...wall, thickness: wall.thickness + 0.024 };
    return [
      wallBox(reveal, [opening.from, opening.from + JAMB], [0, opening.head]),
      wallBox(reveal, [opening.to - JAMB, opening.to], [0, opening.head]),
      wallBox(reveal, [opening.from, opening.to], [opening.head - JAMB, opening.head]),
    ];
  });
}

function windowBoxes(wall: Wall) {
  const glass: Box[] = [];
  const mullions: Box[] = [];
  for (const opening of wall.openings) {
    if (opening.sill === undefined) continue;
    const pane = (along: Range, y: Range, depth: number) => wallBox({ ...wall, thickness: depth }, along, y);
    const middle = (opening.from + opening.to) / 2;
    glass.push(pane([opening.from, opening.to], [opening.sill, opening.head], 0.02));
    mullions.push(
      pane([opening.from, opening.from + 0.05], [opening.sill, opening.head], 0.08),
      pane([opening.to - 0.05, opening.to], [opening.sill, opening.head], 0.08),
      pane([middle - 0.025, middle + 0.025], [opening.sill, opening.head], 0.08),
      pane([opening.from, opening.to], [opening.sill, opening.sill + 0.05], 0.08),
      pane([opening.from, opening.to], [opening.head - 0.05, opening.head], 0.08),
    );
  }
  return { glass, mullions };
}

function stairBoxes(): Box[] {
  const rise = 0.17;
  const going = 0.28;
  const start = CORE_X + 0.35;
  const landing = start + 8 * going;
  const steps: Box[] = [];
  for (let index = 0; index < 8; index++) steps.push({ x: [start + index * going, start + (index + 1) * going], y: [0, (index + 1) * rise], z: [2.6, 4.9] });
  steps.push({ x: [landing, FLOOR.length], y: [0, 8 * rise], z: [0, 4.9] });
  for (let index = 0; index < 7; index++) steps.push({ x: [landing - (index + 1) * going, landing - index * going], y: [0, (9 + index) * rise], z: [0, 2.4] });
  return steps;
}

function boardStack() {
  const { x, z } = BOARD_STACK;
  const pallet: Box[] = [
    ...[0.05, 0.6, 1.15].map((offset): Box => ({ x: [x, x + 2.4], y: [0, 0.1], z: [z + offset - 0.05, z + offset + 0.05] })),
    ...[0, 0.2, 0.4, 0.6, 0.8, 1.0].map((offset): Box => ({ x: [x, x + 2.4], y: [0.1, 0.13], z: [z + offset + 0.02, z + offset + 0.18] })),
  ];
  const sheets: Box[] = Array.from({ length: 9 }, (_, index): Box => ({ x: [x + 0.01, x + 2.39], y: [0.13 + index * 0.04, 0.13 + index * 0.04 + 0.034], z: [z + 0.01, z + 1.19] }));
  const studs: Box[] = [
    ...[0.2, 2.2].map((offset): Box => ({ x: [x + offset, x + offset + 0.12], y: [0, 0.08], z: [z + 1.5, z + 2.3] })),
    ...Array.from({ length: 10 }, (_, index): Box => ({ x: [x - 0.3, x + 2.7], y: [0.08 + Math.floor(index / 5) * 0.08, 0.15 + Math.floor(index / 5) * 0.08], z: [z + 1.52 + (index % 5) * 0.15, z + 1.57 + (index % 5) * 0.15] })),
  ];
  return { pallet: merged(pallet), sheets: merged(sheets), studs: merged(studs) };
}

function buildKit() {
  const of = (kind: WallKind) => WALLS.filter((wall) => wall.kind === kind);
  const solid = (walls: Wall[]) => walls.flatMap(wallBoxes);
  const caps = (boxes: Box[]) => boxes.filter((item) => item.y[1] >= WALL_HEIGHT - 0.001).map((item): Box => ({ ...item, y: [WALL_HEIGHT, WALL_HEIGHT + 0.016] }));
  const fixed = WALLS.filter((wall) => wall.kind !== "added");
  const windows = WALLS.map(windowBoxes);
  const coreBoxes = [...solid(of("core")), LIFT];
  const lobby: Box = { x: [CORE_X, FLOOR.length], y: [0.006, 0.01], z: [5.1, 9] };
  const corridor: Box = { x: [CORRIDOR.west, CORE_X - 0.25], y: [0.006, 0.01], z: [CORRIDOR.north + 0.06, CORRIDOR.south - 0.06] };
  const fixtures: Box[] = Array.from({ length: 8 }, (_, index): Box => {
    const center = CORRIDOR.west + 2 + index * 3;
    return { x: [center - 0.6, center + 0.6], y: [WALL_HEIGHT - 0.012, WALL_HEIGHT], z: [6.7, 7.3] };
  });
  return {
    exterior: merged(solid(of("exterior"))),
    partition: merged(solid(of("partition"))),
    core: merged(coreBoxes),
    caps: merged([...caps(solid(fixed)), ...caps([LIFT])]),
    frames: merged(fixed.flatMap(frameBoxes)),
    glass: merged(windows.flatMap((item) => item.glass)),
    mullions: merged(windows.flatMap((item) => item.mullions)),
    added: merged(solid(of("added"))),
    addedCaps: merged(caps(solid(of("added")))),
    addedFrames: merged(of("added").flatMap(frameBoxes)),
    slab: block({ x: [-0.3, FLOOR.length + 0.3], y: [-0.35, 0], z: [-0.3, FLOOR.depth + 0.3] }),
    floor: block({ x: [0, FLOOR.length], y: [0, 0.006], z: [0, FLOOR.depth] }),
    corridor: merged([corridor, lobby]),
    stair: merged(stairBoxes()),
    liftDoor: block({ x: LIFT_DOOR, y: [0, DOOR_HEAD], z: [LIFT.z[0] - 0.02, LIFT.z[0]] }),
    ceiling: block({ x: [0, FLOOR.length], y: [WALL_HEIGHT + 0.016, WALL_HEIGHT + 0.06], z: [0, FLOOR.depth] }),
    fixtures: merged(fixtures),
    boards: boardStack(),
  };
}
type Kit = ReturnType<typeof buildKit>;
let kit: Kit | null = null;
const getKit = () => (kit ??= buildKit());

let addedEdges: THREE.EdgesGeometry | null = null;
const getAddedEdges = () => (addedEdges ??= new THREE.EdgesGeometry(getKit().added, 20));

/* Doors: the leaf hangs inside the jambs, on the side it swings into. */

const LEAF_WIDTH = DOOR_WIDTH - JAMB * 2;
const LEAF = new THREE.BoxGeometry(LEAF_WIDTH, DOOR_HEAD - JAMB - 0.01, 0.04).translate(LEAF_WIDTH / 2, (DOOR_HEAD - JAMB) / 2, 0);
const LEAF_EDGES = new THREE.EdgesGeometry(LEAF);
const HANDLE = mergeGeometries([
  new THREE.BoxGeometry(0.03, 0.03, 0.12).translate(LEAF_WIDTH - 0.08, 1.02, 0),
  new THREE.BoxGeometry(0.12, 0.022, 0.022).translate(LEAF_WIDTH - 0.13, 1.02, 0.06),
  new THREE.BoxGeometry(0.12, 0.022, 0.022).translate(LEAF_WIDTH - 0.13, 1.02, -0.06),
]) ?? new THREE.BufferGeometry();

function hinge(door: Door) {
  const depth = (door.kind === "core" ? 0.25 : 0.12) / 2 - 0.03;
  const along = door.closed;
  const into = door.closed + door.swing * (Math.PI / 2);
  return {
    x: door.hinge[0] + Math.cos(along) * JAMB + Math.cos(into) * depth,
    z: door.hinge[1] - Math.sin(along) * JAMB - Math.sin(into) * depth,
  };
}

type LeafState = "neutral" | "ok" | "selected" | "ghost" | "none";

function Leaf({ door, state, materials }: { door: Door; state: LeafState; materials: Palette }) {
  if (state === "none") return null;
  const point = hinge(door);
  const material = state === "ok" ? LEAF_OK : state === "selected" ? LEAF_SELECTED : state === "ghost" ? LEAF_GHOST : materials.leaf;
  return (
    <group position={[point.x, 0.01, point.z]} rotation={[0, door.closed + door.swing * door.open, 0]}>
      <mesh geometry={LEAF} material={material} castShadow={state !== "ghost"} receiveShadow={state !== "ghost"} />
      {state !== "ghost" && <mesh geometry={HANDLE} material={materials.handle} />}
      {state === "selected" && <lineSegments geometry={LEAF_EDGES} material={EDGE_INK} />}
      {state === "ghost" && <lineSegments geometry={LEAF_EDGES} material={EDGE_DASHED} onUpdate={(line) => line.computeLineDistances()} />}
    </group>
  );
}

// The swing drawn on the floor, the way a plan shows it.
function Swing({ door, filled }: { door: Door; filled: boolean }) {
  const point = hinge(door);
  const start = Math.min(door.closed, door.closed + door.swing * door.open);
  const line = useMemo(() => {
    const point = (index: number) => {
      const angle = start + (door.open * index) / 24;
      return new THREE.Vector3(Math.cos(angle) * LEAF_WIDTH, 0, -Math.sin(angle) * LEAF_WIDTH);
    };
    return new THREE.BufferGeometry().setFromPoints(Array.from({ length: 24 }, (_, index) => [point(index), point(index + 1)]).flat());
  }, [start, door.open]);
  useEffect(() => () => line.dispose(), [line]);
  return (
    <group position={[point.x, 0.014, point.z]}>
      <lineSegments geometry={line} material={SWING_LINE} />
      {filled && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} material={SWING_FILL}>
          <circleGeometry args={[LEAF_WIDTH, 32, start, door.open]} />
        </mesh>
      )}
    </group>
  );
}

/* The floor: slab, finishes, walls with cut tops, windows, stair and lift. */

function Floor({ materials, ceiling = false }: { materials: Palette; ceiling?: boolean }) {
  const k = getKit();
  return (
    <group>
      <mesh geometry={k.slab} material={materials.slab} receiveShadow />
      <mesh geometry={k.floor} material={materials.floor} receiveShadow />
      <mesh geometry={k.corridor} material={materials.corridor} receiveShadow />
      <mesh geometry={k.exterior} material={materials.exterior} castShadow receiveShadow />
      <mesh geometry={k.partition} material={materials.partition} castShadow receiveShadow />
      <mesh geometry={k.core} material={materials.core} castShadow receiveShadow />
      <mesh geometry={k.frames} material={materials.frame} castShadow />
      <mesh geometry={k.mullions} material={materials.mullion} castShadow />
      <mesh geometry={k.glass} material={materials.glass} />
      <mesh geometry={k.stair} material={materials.stair} castShadow receiveShadow />
      <mesh geometry={k.liftDoor} material={materials.liftDoor} />
      {ceiling ? (
        <>
          <mesh geometry={k.ceiling} material={materials.ceiling} />
          <mesh geometry={k.fixtures} material={materials.fixture} />
        </>
      ) : (
        <mesh geometry={k.caps} material={materials.cap} />
      )}
    </group>
  );
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 4);

// The two requested rooms rise out of the floor when the revision is shown.
function AddedRooms({ revised, instant }: { revised: boolean; instant: boolean }) {
  const k = getKit();
  const group = useRef<THREE.Group>(null);
  const motion = useRef({ from: revised ? 1 : 0, to: revised ? 1 : 0, start: 0, value: revised ? 1 : 0 });
  const { invalidate } = useThree();
  useEffect(() => {
    const state = motion.current;
    state.from = state.value;
    state.to = revised ? 1 : 0;
    state.start = performance.now();
    invalidate();
  }, [revised, invalidate]);
  useFrame((frame) => {
    const state = motion.current;
    const t = instant ? 1 : Math.min(1, (performance.now() - state.start) / 900);
    state.value = state.from + (state.to - state.from) * easeOut(t);
    if (group.current) {
      group.current.scale.y = Math.max(0.001, state.value);
      group.current.visible = state.value > 0.002;
    }
    if (t < 1) frame.invalidate();
  });
  return (
    <group ref={group}>
      <mesh geometry={k.added} material={ADDED_WALL} castShadow receiveShadow />
      <lineSegments geometry={getAddedEdges()} material={EDGE_INK} />
      <mesh geometry={k.addedCaps} material={MODEL.cap} />
      <mesh geometry={k.addedFrames} material={MODEL.frame} />
      {DOORS.filter((door) => door.kind === "added").map((door) => <Leaf key={door.id} door={door} state="neutral" materials={MODEL} />)}
    </group>
  );
}

function BoardStack() {
  const { boards } = getKit();
  return (
    <group>
      <mesh geometry={boards.pallet} material={TIMBER} castShadow receiveShadow />
      <mesh geometry={boards.sheets} material={BOARD} castShadow receiveShadow />
      <mesh geometry={boards.studs} material={STUD} castShadow receiveShadow />
    </group>
  );
}

/* Ground, light and shadow, matching the other 3D pages. */

let contact: THREE.CanvasTexture | null = null;
function contactTexture() {
  if (contact) return contact;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  if (context) {
    const gradient = context.createRadialGradient(128, 128, 10, 128, 128, 128);
    gradient.addColorStop(0, "rgba(23, 25, 26, 0.5)");
    gradient.addColorStop(0.6, "rgba(23, 25, 26, 0.16)");
    gradient.addColorStop(1, "rgba(23, 25, 26, 0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 256, 256);
  }
  contact = new THREE.CanvasTexture(canvas);
  return contact;
}

function Ground() {
  return (
    <group position={[FLOOR.length / 2, -0.35, FLOOR.depth / 2]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[260, 260]} />
        <shadowMaterial transparent opacity={0.12} />
      </mesh>
      <gridHelper args={[240, 120, "#e3e3df", "#e3e3df"]} position={[0, 0.001, 0]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]} renderOrder={1}>
        <planeGeometry args={[FLOOR.length + 8, FLOOR.depth + 8]} />
        <meshBasicMaterial map={contactTexture()} transparent depthWrite={false} opacity={0.55} toneMapped={false} />
      </mesh>
    </group>
  );
}

type Point = [number, number, number];

function Studio({ extent, center, shadows = true }: { extent: number; center: Point; shadows?: boolean }) {
  const { gl } = useThree();
  const environment = useMemo(() => {
    const generator = new THREE.PMREMGenerator(gl);
    const texture = generator.fromScene(new RoomEnvironment(), 0.04).texture;
    generator.dispose();
    return texture;
  }, [gl]);
  useEffect(() => () => environment.dispose(), [environment]);
  const light = useMemo(() => {
    const directional = new THREE.DirectionalLight("#ffffff", shadows ? 2 : 0.9);
    directional.position.set(center[0] + 12, 24, center[2] + 16);
    directional.target.position.set(...center);
    directional.castShadow = shadows;
    directional.shadow.mapSize.set(2048, 2048);
    directional.shadow.radius = 7;
    directional.shadow.bias = -0.0004;
    directional.shadow.normalBias = 0.02;
    Object.assign(directional.shadow.camera, { left: -extent, right: extent, top: extent, bottom: -extent, near: 1, far: 90 });
    directional.shadow.camera.updateProjectionMatrix();
    return directional;
  }, [extent, center, shadows]);
  return (
    <>
      <primitive object={environment} attach="environment" />
      <primitive object={light} />
      <primitive object={light.target} />
    </>
  );
}

/* Labels: HTML chips positioned every rendered frame from 3D anchors. A chip
   can point at more than one part, with one leader per anchor. */

export type SceneLabel = { id: string; at: Point[]; title: string; detail?: string; state?: "ok" | "finding"; lift?: number; view?: 0 | 1 };

function LabelLayer({ labels, layer }: { labels: SceneLabel[]; layer: RefObject<HTMLDivElement | null> }) {
  return (
    <div ref={layer} className={styles.sceneLabels} aria-hidden="true">
      <svg className={styles.sceneLeaders}>
        {labels.map((label) => (
          <g key={label.id} data-leader={label.id}>
            {label.at.map((_, index) => <line key={index} />)}
            {label.at.map((_, index) => <circle key={index} r={3.5} />)}
          </g>
        ))}
      </svg>
      {labels.map((label) => (
        <div key={label.id} className={styles.sceneChip} data-chip={label.id} data-state={label.state}>
          <strong>{label.title}</strong>
          {label.detail && <span>{label.detail}</span>}
        </div>
      ))}
    </div>
  );
}

const scratch = new THREE.Vector3();
const EDGE = 8;

function placeLabels(layer: HTMLDivElement | null, labels: SceneLabel[], project: (point: Point, view: 0 | 1) => { x: number; y: number; visible: boolean }) {
  if (!layer) return;
  const width = layer.clientWidth;
  for (const label of labels) {
    const chip = layer.querySelector<HTMLElement>(`[data-chip="${label.id}"]`);
    const leader = layer.querySelector<SVGGElement>(`[data-leader="${label.id}"]`);
    if (!chip || !leader) continue;
    const anchors = label.at.map((point) => project(point, label.view ?? 0));
    const visible = anchors.every((anchor) => anchor.visible);
    const center = anchors.reduce((sum, anchor) => sum + anchor.x, 0) / anchors.length;
    const highest = Math.min(...anchors.map((anchor) => anchor.y));
    const chipWidth = chip.offsetWidth;
    const chipHeight = chip.offsetHeight;
    const left = Math.min(Math.max(center - chipWidth / 2, EDGE), width - chipWidth - EDGE);
    const top = Math.max(highest - (label.lift ?? 36) - chipHeight, EDGE);
    chip.style.transform = `translate3d(${left.toFixed(1)}px, ${top.toFixed(1)}px, 0)`;
    chip.style.opacity = visible ? "1" : "0";
    leader.style.opacity = visible ? "1" : "0";
    const lines = leader.querySelectorAll("line");
    const dots = leader.querySelectorAll("circle");
    anchors.forEach((anchor, index) => {
      const line = lines[index];
      const dot = dots[index];
      line.setAttribute("x1", Math.min(Math.max(anchor.x, left + 12), left + chipWidth - 12).toFixed(1));
      line.setAttribute("y1", (top + chipHeight).toFixed(1));
      line.setAttribute("x2", anchor.x.toFixed(1));
      line.setAttribute("y2", anchor.y.toFixed(1));
      dot.setAttribute("cx", anchor.x.toFixed(1));
      dot.setAttribute("cy", anchor.y.toFixed(1));
    });
  }
}

/* Camera: eased transitions between framed viewpoints (homepage ease-out),
   with a small, clamped turn when the visitor drags. */

type Frame = { position: Point; target: Point };
type View = Frame & { narrow?: Frame };
type Orbit = { yaw: number; pitch: number };
const TRANSITION_MS = 900;

function fit(view: View, aspect: number) {
  const frame = aspect < 1.5 && view.narrow ? view.narrow : view;
  const target = new THREE.Vector3(...frame.target);
  const offset = new THREE.Vector3(...frame.position).sub(target);
  if (aspect < 1.5 && !view.narrow) offset.multiplyScalar(Math.min(2.1, Math.pow(1.5 / aspect, 0.85)));
  return { position: target.clone().add(offset), target };
}

type Goal = ReturnType<typeof fit>;
type Tween = { from: Goal; to: Goal; start: number; current: Goal };

function step(tween: { current: Tween | null }, goal: Goal, instant: boolean) {
  const now = performance.now();
  if (!tween.current) tween.current = { from: goal, to: goal, start: now - TRANSITION_MS, current: { position: goal.position.clone(), target: goal.target.clone() } };
  const state = tween.current;
  if (state.to !== goal) {
    state.from = { position: state.current.position.clone(), target: state.current.target.clone() };
    state.to = goal;
    state.start = instant ? now - TRANSITION_MS : now;
  }
  const t = Math.min(1, (now - state.start) / TRANSITION_MS);
  const e = easeOut(t);
  state.current.position.lerpVectors(state.from.position, state.to.position, e);
  state.current.target.lerpVectors(state.from.target, state.to.target, e);
  return { current: state.current, moving: t < 1 };
}

const spherical = new THREE.Spherical();
const offsetVector = new THREE.Vector3();

function Rig({ view, labels, layer, instant, orbit }: { view: View; labels: SceneLabel[]; layer: RefObject<HTMLDivElement | null>; instant: boolean; orbit: RefObject<Orbit> }) {
  const { camera, size, invalidate } = useThree();
  const tween = useRef<Tween | null>(null);
  const turn = useRef<Orbit>({ yaw: 0, pitch: 0 });
  const goal = useMemo(() => fit(view, size.width / size.height), [view, size.width, size.height]);
  useEffect(() => { invalidate(); }, [goal, labels, invalidate]);
  useFrame((state, delta) => {
    const { current, moving } = step(tween, goal, instant);
    const target = orbit.current;
    const k = instant ? 1 : 1 - Math.exp(-delta * 10);
    turn.current.yaw += (target.yaw - turn.current.yaw) * k;
    turn.current.pitch += (target.pitch - turn.current.pitch) * k;
    spherical.setFromVector3(offsetVector.copy(current.position).sub(current.target));
    spherical.theta += turn.current.yaw;
    spherical.phi = THREE.MathUtils.clamp(spherical.phi - turn.current.pitch, 0.2, 1.4);
    camera.position.copy(current.target).add(offsetVector.setFromSpherical(spherical));
    camera.lookAt(current.target);
    camera.updateMatrixWorld();
    placeLabels(layer.current, labels, (point) => {
      scratch.set(...point).project(camera);
      return { x: (scratch.x * 0.5 + 0.5) * size.width, y: (-scratch.y * 0.5 + 0.5) * size.height, visible: scratch.z < 1 && Math.abs(scratch.x) < 1.05 && Math.abs(scratch.y) < 1.05 };
    });
    const turning = Math.abs(target.yaw - turn.current.yaw) > 0.0005 || Math.abs(target.pitch - turn.current.pitch) > 0.0005;
    if (moving || turning) state.invalidate();
  });
  return null;
}

const SPLIT_OFFSET = 60;

// Two cameras on one canvas: the model on the left (or top), the capture on
// the right (or bottom), always framed identically.
function SplitRig({ view, stacked, labels, layer }: { view: Frame; stacked: boolean; labels: SceneLabel[]; layer: RefObject<HTMLDivElement | null> }) {
  const { gl, scene, size, invalidate } = useThree();
  const cameras = useMemo(() => [new THREE.PerspectiveCamera(40, 1, 0.05, 200), new THREE.PerspectiveCamera(40, 1, 0.05, 200)], []);
  const width = stacked ? size.width : size.width / 2;
  const height = stacked ? size.height / 2 : size.height;
  useEffect(() => { invalidate(); }, [stacked, labels, size.width, size.height, invalidate]);
  useFrame(() => {
    gl.setScissorTest(true);
    cameras.forEach((camera, index) => {
      const shift = new THREE.Vector3(index * SPLIT_OFFSET, 0, 0);
      camera.fov = stacked ? 46 : 40;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      camera.position.set(...view.position).add(shift);
      camera.lookAt(new THREE.Vector3(...view.target).add(shift));
      camera.updateMatrixWorld();
      const x = stacked ? 0 : index * width;
      const y = stacked ? (index === 0 ? height : 0) : 0;
      gl.setViewport(x, y, width, height);
      gl.setScissor(x, y, width, height);
      gl.render(scene, camera);
    });
    gl.setScissorTest(false);
    placeLabels(layer.current, labels, (point, index) => {
      scratch.set(point[0] + index * SPLIT_OFFSET, point[1], point[2]).project(cameras[index]);
      const offsetX = stacked ? 0 : index * width;
      const offsetY = stacked ? index * height : 0;
      return { x: offsetX + (scratch.x * 0.5 + 0.5) * width, y: offsetY + (-scratch.y * 0.5 + 0.5) * height, visible: scratch.z < 1 && Math.abs(scratch.x) < 1 && Math.abs(scratch.y) < 1 };
    });
  }, 1);
  return null;
}

/* Scenes */

const VIEWS: Record<"bid" | "change", View> = {
  bid: { position: [27, 30, 39], target: [18.5, 0, 6.4], narrow: { position: [37.5, 15.5, 24], target: [26.8, 0, 8.6] } },
  change: { position: [-3.2, 15.5, 22.5], target: [5.6, 0.2, 5.4], narrow: { position: [-4.5, 15, 21], target: [4.8, 0.4, 6.2] } },
};
const SITE_VIEW: Frame = { position: [24.6, 1.6, 7.25], target: [CORE_X, 1.15, 7] };

const fitoutDoors = DOORS.filter((door) => door.kind === "fitout");
const C14 = doorById("C-14");

function doorTop(id: string, lift = DOOR_HEAD + 0.1): Point {
  const [x, z] = doorCenter(doorById(id));
  return [x, lift, z];
}

function bidLabels(mode: BidMode): SceneLabel[] {
  return [{
    id: "unquoted",
    at: UNQUOTED.map((id) => doorTop(id)),
    title: "D11 and D12",
    detail: mode === "quote" ? "Not in the quote" : "On the drawing",
    state: mode === "quote" ? "finding" : undefined,
    lift: 44,
  }];
}

function changeLabels(revised: boolean): SceneLabel[] {
  if (!revised) return [];
  return [
    { id: "walls", at: [[6.3, WALL_HEIGHT, CORRIDOR.north]], title: "New walls and doors", detail: "Not in quote Q-2047", lift: 30 },
    { id: "boards", at: [[BOARD_STACK.x + 1.2, 0.5, BOARD_STACK.z + 0.6]], title: "Studs and boards", detail: "Order MO-112 is for the current plan", lift: 40 },
    { id: "power", at: [[4, WALL_HEIGHT, 1.6]], title: "Electrical first fix", detail: "Booked for the current layout", lift: 54 },
  ];
}

const siteLabels: SceneLabel[] = [
  { id: "planned", at: [[CORE_X - 0.125, DOOR_HEAD - 0.4, 7]], title: "C-14", detail: "Door in the model", state: "ok", lift: 28, view: 0 },
  { id: "captured", at: [[CORE_X - 0.125, DOOR_HEAD - 0.4, 7]], title: "C-14", detail: "No door visible", state: "finding", lift: 28, view: 1 },
];

function BidScene({ mode, instant, labels, layer, orbit }: { mode: BidMode; instant: boolean } & Layered) {
  const leafState = (door: Door): LeafState => {
    if (door.kind !== "fitout") return "neutral";
    const unquoted = !QUOTED.has(door.id);
    if (mode === "drawing") return unquoted ? "selected" : "neutral";
    return unquoted ? "ghost" : "ok";
  };
  return (
    <>
      <Studio extent={24} center={[18, 0, 7]} />
      <Rig view={VIEWS.bid} labels={labels} layer={layer} instant={instant} orbit={orbit} />
      <Ground />
      <Floor materials={MODEL} />
      {[...fitoutDoors, C14].map((door) => <Leaf key={door.id} door={door} state={leafState(door)} materials={MODEL} />)}
      {fitoutDoors.map((door) => <Swing key={door.id} door={door} filled={mode === "quote" && !QUOTED.has(door.id)} />)}
    </>
  );
}

function ChangeScene({ revised, instant, labels, layer, orbit }: { revised: boolean; instant: boolean } & Layered) {
  return (
    <>
      <Studio extent={20} center={[10, 0, 7]} />
      <Rig view={VIEWS.change} labels={labels} layer={layer} instant={instant} orbit={orbit} />
      <Ground />
      <Floor materials={MODEL} />
      <AddedRooms revised={revised} instant={instant} />
      <BoardStack />
      {[...fitoutDoors, C14].map((door) => <Leaf key={door.id} door={door} state="neutral" materials={MODEL} />)}
      {fitoutDoors.map((door) => <Swing key={door.id} door={door} filled={false} />)}
    </>
  );
}

function SiteScene({ stacked, labels, layer }: { stacked: boolean } & Omit<Layered, "orbit">) {
  return (
    <>
      <Studio extent={14} center={[28, 0, 7]} shadows={false} />
      <SplitRig view={SITE_VIEW} stacked={stacked} labels={labels} layer={layer} />
      <Floor materials={MODEL} ceiling />
      {[...fitoutDoors, C14].map((door) => <Leaf key={door.id} door={door} state="neutral" materials={MODEL} />)}
      <group position={[SPLIT_OFFSET, 0, 0]}>
        <Floor materials={CAPTURE} ceiling />
        {fitoutDoors.map((door) => <Leaf key={door.id} door={door} state="neutral" materials={CAPTURE} />)}
      </group>
    </>
  );
}

type Layered = { labels: SceneLabel[]; layer: RefObject<HTMLDivElement | null>; orbit: RefObject<Orbit> };

function Ready({ onReady }: { onReady: () => void }) {
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    done.current = true;
    requestAnimationFrame(onReady);
  });
  return null;
}

function labelsFor(props: SceneKind): SceneLabel[] {
  switch (props.kind) {
    case "bid": return bidLabels(props.mode);
    case "change": return changeLabels(props.revised);
    case "site": return siteLabels;
  }
}

export default function FloorScene(props: SceneProps) {
  const layer = useRef<HTMLDivElement>(null);
  const orbit = useRef<Orbit>({ yaw: 0, pitch: 0 });
  const redraw = useRef<() => void>(() => undefined);
  const drag = useRef<{ x: number; y: number; start: Orbit; moved: boolean } | null>(null);
  const labels = labelsFor(props);
  const turnable = props.kind !== "site";

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!turnable) return;
    drag.current = { x: event.clientX, y: event.clientY, start: { ...orbit.current }, moved: false };
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = drag.current;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (!start.moved && Math.hypot(dx, dy) < 5) return;
    if (!start.moved) { start.moved = true; event.currentTarget.setPointerCapture(event.pointerId); }
    orbit.current = {
      yaw: THREE.MathUtils.clamp(start.start.yaw - dx * 0.005, -0.55, 0.55),
      pitch: event.pointerType === "touch" ? start.start.pitch : THREE.MathUtils.clamp(start.start.pitch + dy * 0.003, -0.25, 0.3),
    };
    redraw.current();
  };
  const onPointerEnd = () => { drag.current = null; };

  return (
    <div className={styles.sceneRoot} data-turnable={turnable || undefined} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerEnd} onPointerCancel={onPointerEnd}>
      <Canvas
        frameloop={props.active ? "demand" : "never"}
        shadows="percentage"
        dpr={[1, 2]}
        camera={{ fov: 26, near: 0.1, far: 500, position: [30, 30, 40] }}
        gl={{ antialias: true, alpha: true, powerPreference: "low-power", toneMapping: THREE.NeutralToneMapping, toneMappingExposure: 0.95 }}
        style={{ position: "absolute", inset: 0 }}
        onCreated={(state) => { redraw.current = () => state.invalidate(); }}
        aria-hidden="true"
      >
        <fog attach="fog" args={[GROUND, 90, 240]} />
        {props.kind === "bid" && <BidScene mode={props.mode} instant={props.instant} labels={labels} layer={layer} orbit={orbit} />}
        {props.kind === "change" && <ChangeScene revised={props.revised} instant={props.instant} labels={labels} layer={layer} orbit={orbit} />}
        {props.kind === "site" && <SiteScene stacked={props.stacked} labels={labels} layer={layer} />}
        <Ready onReady={props.onReady} />
      </Canvas>
      <LabelLayer labels={labels} layer={layer} />
    </div>
  );
}
