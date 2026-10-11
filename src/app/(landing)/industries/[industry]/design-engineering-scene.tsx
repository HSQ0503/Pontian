"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type CSSProperties, type ReactNode, type RefObject } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import {
  ACCESS_DEPTH, BEAMS, BUILDING, CLASH, CORRIDOR, DUCT, HOUSE, ISOLATOR_X, MISSING_WINDOW, PIPE_HEIGHT, PIPE_RUNS, PLINTH, ROOM, TANK, UNITS,
  WALL_HEIGHT, WALLS, WINDOWS, accessGap, wallById, type WindowMark,
} from "./design-engineering-model";
import styles from "./design-engineering.module.css";

type Vec = [number, number];
type Point = [number, number, number];

export type PlantFocus = "space" | "connections" | "support";
export type SceneProps = { active: boolean; onReady: () => void } & (
  | { kind: "model"; selected: string; confirmed: boolean; onSelect: (id: string) => void }
  | { kind: "clash"; structure: boolean; ventilation: boolean; reroute: boolean }
  | { kind: "plant"; focus: PlantFocus; unit: "approved" | "proposed" }
  | { kind: "windows"; selected: string | null; corrected: boolean; onSelect: (mark: string) => void }
);

/* Shared conventions: yellow tint plus ink edges for selection, blue for
   proposed or OK, red for blocked, white HTML chips with an ink leader. */

const INK = "#17191a";
const SELECT = "#fed603";
const OK = "#007dfe";
const BLOCKED = "#f51625";

const physical = (color: string, roughness: number, extra: THREE.MeshPhysicalMaterialParameters = {}) => new THREE.MeshPhysicalMaterial({ color, roughness, metalness: 0, ...extra });
const standard = (color: string, roughness: number, metalness = 0, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });

const M = {
  wall: standard("#e4e3df", 0.8),
  slab: standard("#c9c9c5", 0.9),
  concrete: standard("#cfcfcb", 0.92),
  cut: standard("#8c8d89", 0.95),
  plaster: standard("#ecebe7", 0.88),
  floor: standard("#dcdbd6", 0.95),
  duct: standard("#c6cbcf", 0.36, 0.55),
  seam: standard("#a6abaf", 0.4, 0.6),
  rod: standard("#7d8185", 0.45, 0.6),
  unit: physical("#d5d8da", 0.42, { clearcoat: 0.25, clearcoatRoughness: 0.5 }),
  slat: standard("#9da2a6", 0.5, 0.3),
  grille: standard("#4c5054", 0.55, 0.35),
  pipe: standard("#a8acaf", 0.38, 0.65),
  tank: standard("#b6babd", 0.55, 0.2),
  isolator: standard("#3c3f41", 0.6, 0.2),
  render: standard("#eeede9", 0.86),
  base: standard("#a3a5a3", 0.85),
  coping: standard("#c4c5c2", 0.75),
  frame: standard("#3a3d40", 0.5, 0.35),
  interior: standard("#2c3135", 0.9),
  glass: physical("#a9bccb", 0.06, { transparent: true, opacity: 0.45, envMapIntensity: 1.3 }),
  sill: standard("#d9d6cf", 0.7),
  ghost: physical("#dfe3e8", 0.6, { transparent: true, opacity: 0.28, depthWrite: false }),
  proposed: standard(OK, 0.6, 0, { transparent: true, opacity: 0.45, depthWrite: false }),
  zone: standard(OK, 0.7, 0, { transparent: true, opacity: 0.18, depthWrite: false }),
  zoneSelected: standard(SELECT, 0.7, 0, { transparent: true, opacity: 0.45, depthWrite: false }),
  clash: new THREE.MeshBasicMaterial({ color: BLOCKED, transparent: true, opacity: 0.55, depthWrite: false }),
};
type MaterialKey = keyof typeof M;

const tintCache = new Map<THREE.Material, THREE.Material>();
function tinted(material: THREE.Material) {
  const cached = tintCache.get(material);
  if (cached) return cached;
  const copy = (material as THREE.MeshStandardMaterial).clone();
  // Large surfaces take a lighter tint so they read as highlighted, not repainted.
  const strength = material === M.unit || material === M.wall || material === M.concrete ? 0.55 : 0.75;
  copy.color.lerp(new THREE.Color(SELECT), strength);
  copy.polygonOffset = true;
  copy.polygonOffsetFactor = 1;
  copy.polygonOffsetUnits = 1;
  tintCache.set(material, copy);
  return copy;
}

const EDGE_INK = new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.85 });
const EDGE_GHOST = new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.25 });
const edgeCache = new WeakMap<THREE.BufferGeometry, THREE.EdgesGeometry>();
function edgesOf(geometry: THREE.BufferGeometry) {
  let edges = edgeCache.get(geometry);
  if (!edges) {
    edges = new THREE.EdgesGeometry(geometry, 32);
    edgeCache.set(geometry, edges);
  }
  return edges;
}

/* Geometry helpers */

function bx(x: Vec, y: Vec, z: Vec, radius = 0.02) {
  const width = x[1] - x[0];
  const height = y[1] - y[0];
  const depth = z[1] - z[0];
  const r = Math.min(radius, width / 2.2, height / 2.2, depth / 2.2);
  return new RoundedBoxGeometry(width, height, depth, 2, r).translate((x[0] + x[1]) / 2, (y[0] + y[1]) / 2, (z[0] + z[1]) / 2);
}

function cylinder(radius: number, length: number, axis: "x" | "y" | "z", center: Point, segments = 24) {
  const geometry = new THREE.CylinderGeometry(radius, radius, length, segments);
  if (axis === "x") geometry.rotateZ(-Math.PI / 2);
  if (axis === "z") geometry.rotateX(Math.PI / 2);
  return geometry.translate(...center);
}

// A straight run between two points in the x/y plane, depth along z.
function run(a: Vec, b: Vec, height: number, z: Vec, overlap = 0) {
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]) + overlap;
  const geometry = new THREE.BoxGeometry(length, height, z[1] - z[0]);
  geometry.rotateZ(Math.atan2(b[1] - a[1], b[0] - a[0]));
  return geometry.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (z[0] + z[1]) / 2);
}

function setCursor(event: ThreeEvent<PointerEvent>, cursor: string) {
  const target = event.nativeEvent.target;
  if (target instanceof HTMLElement) target.style.cursor = cursor;
}

function pickHandlers(onPick?: () => void) {
  if (!onPick) return {};
  return {
    onClick: (event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onPick(); },
    onPointerOver: (event: ThreeEvent<PointerEvent>) => { event.stopPropagation(); setCursor(event, "pointer"); },
    onPointerOut: (event: ThreeEvent<PointerEvent>) => setCursor(event, ""),
  };
}

type PartProps = { geometry: THREE.BufferGeometry; material: MaterialKey; selected?: boolean; ghost?: boolean; edges?: boolean; shadow?: boolean };

function Part({ geometry, material, selected, ghost, edges, shadow = true }: PartProps) {
  const base = M[material];
  const resolved = ghost ? M.ghost : selected ? tinted(base) : base;
  return (
    <>
      <mesh geometry={geometry} material={resolved} castShadow={shadow && !ghost} receiveShadow={!ghost} />
      {(selected || edges || ghost) && <lineSegments geometry={edgesOf(geometry)} material={ghost ? EDGE_GHOST : EDGE_INK} />}
    </>
  );
}

let contact: THREE.CanvasTexture | null = null;
function contactTexture() {
  if (contact) return contact;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  if (context) {
    const gradient = context.createRadialGradient(128, 128, 10, 128, 128, 128);
    gradient.addColorStop(0, "rgba(23, 25, 26, 0.55)");
    gradient.addColorStop(0.55, "rgba(23, 25, 26, 0.2)");
    gradient.addColorStop(1, "rgba(23, 25, 26, 0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 256, 256);
  }
  contact = new THREE.CanvasTexture(canvas);
  return contact;
}

function ContactShadow({ width, depth, position = [0, 0.006, 0], opacity = 0.5 }: { width: number; depth: number; position?: Point; opacity?: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={position} renderOrder={1}>
      <planeGeometry args={[width, depth]} />
      <meshBasicMaterial map={contactTexture()} transparent depthWrite={false} opacity={opacity} toneMapped={false} />
    </mesh>
  );
}

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[240, 240]} />
      <shadowMaterial transparent opacity={0.14} depthWrite={false} />
    </mesh>
  );
}

function DashedOutline({ x0, x1, z0, z1, y = 0.012, color }: { x0: number; x1: number; z0: number; z1: number; y?: number; color: string }) {
  const line = useMemo(() => {
    const points = [[x0, z0], [x1, z0], [x1, z1], [x0, z1], [x0, z0]].map(([px, pz]) => new THREE.Vector3(px, y, pz));
    const outline = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineDashedMaterial({ color, dashSize: 0.12, gapSize: 0.08 }));
    outline.computeLineDistances();
    return outline;
  }, [x0, x1, z0, z1, y, color]);
  return <primitive object={line} />;
}

/* Labels: HTML chips positioned every rendered frame from 3D anchors. */

type SceneLabel = { id: string; at: Point; title: string; detail?: string; state?: "ok" | "blocked"; lift?: number };

function LabelLayer({ labels, layer }: { labels: SceneLabel[]; layer: RefObject<HTMLDivElement | null> }) {
  return (
    <div ref={layer} className={styles.sceneLabels} aria-hidden="true">
      {labels.map((label) => (
        <div key={label.id} className={styles.sceneLabel} data-label={label.id} data-state={label.state} style={{ "--lift": `${label.lift ?? 30}px` } as CSSProperties}>
          <span className={styles.labelChip}><strong>{label.title}</strong>{label.detail && <span>{label.detail}</span>}</span>
          <i className={styles.labelLeader} />
        </div>
      ))}
    </div>
  );
}

const scratch = new THREE.Vector3();
const EDGE = 8;

// The leader stays on its anchor; the chip slides along it to stay in frame.
function placeLabels(layer: HTMLDivElement | null, labels: SceneLabel[], project: (label: SceneLabel) => { x: number; y: number; visible: boolean }) {
  if (!layer) return;
  const width = layer.clientWidth;
  for (const label of labels) {
    const element = layer.querySelector<HTMLElement>(`[data-label="${label.id}"]`);
    const chip = element?.firstElementChild as HTMLElement | null;
    if (!element || !chip) continue;
    const { x, y, visible } = project(label);
    const half = chip.offsetWidth / 2;
    const shift = x - half < EDGE ? EDGE - (x - half) : x + half > width - EDGE ? width - EDGE - (x + half) : 0;
    element.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -100%)`;
    chip.style.transform = `translateX(${shift.toFixed(1)}px)`;
    element.style.opacity = visible ? "1" : "0";
  }
}

/* Camera: eased transitions between framed viewpoints (homepage ease-out). */

type Frame = { position: Point; target: Point };
type View = Frame & { narrow?: Frame };
const TRANSITION_MS = 900;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 4);

function fit(view: View, aspect: number) {
  const frame = aspect < 1.5 && view.narrow ? view.narrow : view;
  const target = new THREE.Vector3(...frame.target);
  const offset = new THREE.Vector3(...frame.position).sub(target);
  if (aspect < 1.5 && !view.narrow) offset.multiplyScalar(Math.min(2.1, Math.pow(1.5 / aspect, 0.85)));
  return { position: target.clone().add(offset), target };
}

type Goal = ReturnType<typeof fit>;
type Tween = { from: Goal; to: Goal; start: number; current: Goal };

function step(tween: { current: Tween | null }, goal: Goal) {
  const now = performance.now();
  if (!tween.current) tween.current = { from: goal, to: goal, start: now - TRANSITION_MS, current: { position: goal.position.clone(), target: goal.target.clone() } };
  const state = tween.current;
  if (state.to !== goal) {
    state.from = { position: state.current.position.clone(), target: state.current.target.clone() };
    state.to = goal;
    state.start = now;
  }
  const t = Math.min(1, (now - state.start) / TRANSITION_MS);
  const e = easeOut(t);
  state.current.position.lerpVectors(state.from.position, state.to.position, e);
  state.current.target.lerpVectors(state.from.target, state.to.target, e);
  return { current: state.current, moving: t < 1 };
}

function Rig({ view, labels, layer }: { view: View; labels: SceneLabel[]; layer: RefObject<HTMLDivElement | null> }) {
  const { camera, size, invalidate } = useThree();
  const tween = useRef<Tween | null>(null);
  const goal = useMemo(() => fit(view, size.width / size.height), [view, size.width, size.height]);
  useEffect(() => { invalidate(); }, [goal, labels, invalidate]);
  useFrame((state) => {
    const { current, moving } = step(tween, goal);
    camera.position.copy(current.position);
    camera.lookAt(current.target);
    camera.updateMatrixWorld();
    placeLabels(layer.current, labels, (label) => {
      scratch.set(...label.at).project(camera);
      return { x: (scratch.x * 0.5 + 0.5) * size.width, y: (-scratch.y * 0.5 + 0.5) * size.height, visible: scratch.z < 1 && Math.abs(scratch.x) < 1.05 && Math.abs(scratch.y) < 1.05 };
    });
    if (moving) state.invalidate();
  });
  return null;
}

function Studio({ extent, center = [0, 0, 0] }: { extent: number; center?: Point }) {
  const { gl } = useThree();
  const environment = useMemo(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const texture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    return texture;
  }, [gl]);
  useEffect(() => () => environment.dispose(), [environment]);
  const light = useMemo(() => {
    const directional = new THREE.DirectionalLight("#ffffff", 2.1);
    directional.position.set(center[0] + 9, 16, center[2] + 11);
    directional.target.position.set(...center);
    directional.castShadow = true;
    directional.shadow.mapSize.set(2048, 2048);
    directional.shadow.radius = 7;
    directional.shadow.bias = -0.0004;
    directional.shadow.normalBias = 0.02;
    Object.assign(directional.shadow.camera, { left: -extent, right: extent, top: extent, bottom: -extent, near: 1, far: 70 });
    directional.shadow.camera.updateProjectionMatrix();
    return directional;
  }, [extent, center]);
  return (
    <>
      <primitive object={environment} attach="environment" />
      <primitive object={light} />
      <primitive object={light.target} />
    </>
  );
}

/* 1. Plan to model ------------------------------------------------------- */

const toModel = (x: number, y: number): Vec => [x - BUILDING.width / 2, y - BUILDING.depth / 2];
const MODEL_VIEWS: Record<"pending" | "confirmed", View> = {
  pending: { position: [5, 23.5, 14.5], target: [0, 0.2, 0.3] },
  confirmed: { position: [15, 12, 18.5], target: [0, 1.4, 0] },
};

function modelLabels({ selected, confirmed }: Extract<SceneProps, { kind: "model" }>): SceneLabel[] {
  const wall = wallById(selected);
  const [x, z] = toModel((wall.x0 + wall.x1) / 2, (wall.y0 + wall.y1) / 2);
  const floor = BUILDING.slab + 0.04;
  const labels: SceneLabel[] = [{ id: "wall", at: [x, confirmed ? BUILDING.slab + WALL_HEIGHT : floor, z], title: `${wall.id} · ${wall.name}`, detail: confirmed ? `${wall.length}, 3.00 m high` : `${wall.length}, height not set` }];
  if (!confirmed) labels.push({ id: "height", at: [BUILDING.width / 2 - 0.15, floor, -BUILDING.depth / 2 + 0.15], title: "Wall height", detail: "Not on the drawing", state: "blocked", lift: 34 });
  return labels;
}

function ModelScene({ selected, confirmed, onSelect, layer, labels }: Extract<SceneProps, { kind: "model" }> & Layered) {
  const parts = useMemo(() => WALLS.map((wall) => {
    const [x0, z0] = toModel(wall.x0, wall.y0);
    const [x1, z1] = toModel(wall.x1, wall.y1);
    return { wall, body: bx([x0, x1], [0, WALL_HEIGHT], [z0, z1], 0.02), footprint: bx([x0, x1], [0, 0.035], [z0, z1], 0.006) };
  }), []);
  const slab = useMemo(() => bx([-BUILDING.width / 2, BUILDING.width / 2], [-BUILDING.slab, 0], [-BUILDING.depth / 2, BUILDING.depth / 2], 0.03), []);
  const walls = useRef<THREE.Group>(null);
  const growth = useRef({ value: confirmed ? 1 : 0, start: 0 });
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    growth.current.start = performance.now();
    if (!confirmed) growth.current.value = 0;
    invalidate();
  }, [confirmed, invalidate]);
  useFrame((state) => {
    const group = walls.current;
    if (!group) return;
    if (confirmed && growth.current.value < 1) {
      const t = Math.min(1, Math.max(0, (performance.now() - growth.current.start - 250) / 800));
      growth.current.value = easeOut(t);
      if (t < 1) state.invalidate();
    }
    group.scale.y = Math.max(growth.current.value, 0.0001);
    group.visible = growth.current.value > 0.001;
  });
  return (
    <>
      <Studio extent={12} />
      <Rig view={MODEL_VIEWS[confirmed ? "confirmed" : "pending"]} labels={labels} layer={layer} />
      <Ground />
      <ContactShadow width={BUILDING.width * 1.3} depth={BUILDING.depth * 1.45} position={[0, 0.004, 0]} opacity={0.4} />
      <group position={[0, BUILDING.slab, 0]}>
        <Part geometry={slab} material="slab" />
        {!confirmed && parts.map((part) => (
          <group key={part.wall.id} {...pickHandlers(() => onSelect(part.wall.id))}>
            <mesh geometry={part.footprint} material={part.wall.id === selected ? tinted(M.wall) : M.proposed} receiveShadow />
            {part.wall.id === selected && <lineSegments geometry={edgesOf(part.footprint)} material={EDGE_INK} />}
          </group>
        ))}
        <group ref={walls}>
          {parts.map((part) => (
            <group key={part.wall.id} {...pickHandlers(() => onSelect(part.wall.id))}>
              <Part geometry={part.body} material="wall" selected={part.wall.id === selected} />
            </group>
          ))}
        </group>
      </group>
    </>
  );
}

/* 2. Duct and beam ------------------------------------------------------- */

// A section box cut at z = 0, so the duct and beam meet on the cut face.
const toCorridor = (x: number) => x - CORRIDOR.length / 2;
const level = (depth: number) => CORRIDOR.soffit - depth;
const SPAN: Vec = [-3.2, 3.2];
const BACK = -1.8;
const DUCT_Z: Vec = [-DUCT.width / 2, 0];
const HANGERS = [-2.6, -0.4, 2.7];

const CLASH_VIEW: View = { position: [4.6, 1.15, 9.4], target: [0.35, 2.5, -0.7], narrow: { position: [4.4, 1.1, 8.6], target: [1.0, 2.45, -0.6] } };

function ductRoute(lowered: boolean) {
  const top = DUCT.top + DUCT.height / 2;
  const high = level(top);
  const low = level(DUCT.loweredTop + DUCT.height / 2);
  if (!lowered) return [run([SPAN[0], high], [SPAN[1], high], DUCT.height, DUCT_Z)];
  const path: Vec[] = [[SPAN[0], high], [0.55, high], [0.95, low], [1.85, low], [2.25, high], [SPAN[1], high]];
  return path.slice(1).map((point, index) => run(path[index], point, DUCT.height, DUCT_Z, index % 2 === 1 ? 0.2 : 0));
}

function clashLabels({ structure, ventilation, reroute }: Extract<SceneProps, { kind: "clash" }>): SceneLabel[] {
  const x = toCorridor((CLASH.x0 + CLASH.x1) / 2);
  if (structure && ventilation && !reroute) return [{ id: "clash", at: [x, level(CLASH.top), 0], title: `${DUCT.id} runs through B-13`, detail: "Same space in both models", state: "blocked", lift: 44 }];
  if (ventilation && reroute) return [{ id: "reroute", at: [x, level(DUCT.loweredTop + DUCT.height), 0], title: "Possible revision", detail: "Needs both teams to review", lift: 36 }];
  return [];
}

function ClashScene({ structure, ventilation, reroute, layer, labels }: Extract<SceneProps, { kind: "clash" }> & Layered) {
  const geometry = useMemo(() => {
    const beams = BEAMS.map((beam) => ({ id: beam.id, body: bx([toCorridor(beam.x0), toCorridor(beam.x1)], [level(beam.depth), CORRIDOR.soffit + 0.01], [BACK, 0], 0.012), cut: bx([toCorridor(beam.x0), toCorridor(beam.x1)], [level(beam.depth), CORRIDOR.soffit], [-0.004, 0.003], 0.001) }));
    const ductTop = level(DUCT.top);
    const ductBottom = level(DUCT.top + DUCT.height);
    return {
      floor: bx([SPAN[0] - 0.2, SPAN[1] + 0.2], [-0.12, 0], [BACK - 0.15, 0], 0.01),
      wall: bx([SPAN[0] - 0.2, SPAN[1] + 0.2], [0, CORRIDOR.soffit + CORRIDOR.slab], [BACK - 0.15, BACK], 0.01),
      slab: bx([SPAN[0] - 0.2, SPAN[1] + 0.2], [CORRIDOR.soffit, CORRIDOR.soffit + CORRIDOR.slab], [BACK, 0], 0.015),
      slabCut: bx([SPAN[0] - 0.2, SPAN[1] + 0.2], [CORRIDOR.soffit, CORRIDOR.soffit + CORRIDOR.slab], [-0.004, 0.003], 0.001),
      beams,
      duct: ductRoute(false),
      lowered: ductRoute(true),
      flanges: [-2.0, 0.1, 2.6].map((x) => bx([x - 0.02, x + 0.02], [ductBottom - 0.03, ductTop + 0.03], [DUCT_Z[0] - 0.03, 0], 0.005)),
      hangers: HANGERS.flatMap((x) => [
        cylinder(0.009, CORRIDOR.soffit - ductBottom + 0.05, "y", [x, (CORRIDOR.soffit + ductBottom - 0.05) / 2, DUCT_Z[0] - 0.08], 10),
        bx([x - 0.035, x + 0.035], [ductBottom - 0.07, ductBottom - 0.03], [DUCT_Z[0] - 0.12, 0], 0.006),
      ]),
      clash: bx([toCorridor(CLASH.x0) - 0.008, toCorridor(CLASH.x1) + 0.008], [level(CLASH.bottom) - 0.008, level(CLASH.top) + 0.008], [DUCT_Z[0] - 0.008, 0.006], 0.004),
    };
  }, []);
  const clash = structure && ventilation && !reroute;
  return (
    <>
      <Studio extent={7} center={[0, 1.5, -0.8]} />
      <Rig view={CLASH_VIEW} labels={labels} layer={layer} />
      <Ground />
      <Part geometry={geometry.floor} material="floor" />
      <Part geometry={geometry.wall} material="plaster" />
      <Part geometry={geometry.slab} material="concrete" ghost={!structure} />
      {structure && <mesh geometry={geometry.slabCut} material={M.cut} />}
      {geometry.beams.map((beam) => (
        <group key={beam.id}>
          <Part geometry={beam.body} material="concrete" ghost={!structure} edges={clash && beam.id === "B-13"} />
          {structure && <mesh geometry={beam.cut} material={M.cut} />}
        </group>
      ))}
      {(reroute ? geometry.lowered : geometry.duct).map((piece, index) => <Part key={index} geometry={piece} material="duct" ghost={!ventilation} edges={clash} />)}
      {reroute && ventilation && geometry.duct.map((piece, index) => <Part key={`was-${index}`} geometry={piece} material="duct" ghost />)}
      {ventilation && !reroute && geometry.flanges.map((flange, index) => <Part key={index} geometry={flange} material="seam" />)}
      {ventilation && geometry.hangers.map((hanger, index) => <Part key={index} geometry={hanger} material="rod" />)}
      {clash && (
        <>
          <mesh geometry={geometry.clash} material={M.clash} renderOrder={3} />
          <lineSegments geometry={edgesOf(geometry.clash)} material={EDGE_INK} renderOrder={4} />
        </>
      )}
    </>
  );
}

/* 3. Plant room ---------------------------------------------------------- */

const toRoom = (x: number, y: number): Vec => [x - ROOM.width / 2, y - ROOM.depth / 2];
const PLANT_VIEWS: Record<PlantFocus, View> = {
  space: { position: [3.6, 6.2, 8.4], target: [-0.8, 0.45, 0.25], narrow: { position: [4.2, 7.4, 10], target: [-0.6, 0.45, 0.2] } },
  connections: { position: [5.6, 3.4, 4.6], target: [0, 0.6, -0.75], narrow: { position: [7.6, 4.6, 7], target: [-0.2, 0.6, -0.6] } },
  support: { position: [3.6, 1.35, 4.6], target: [-0.5, 0.45, -0.6], narrow: { position: [5, 1.9, 6.6], target: [-0.5, 0.5, -0.5] } },
};

type UnitKey = "approved" | "proposed";

function unitBox(unit: UnitKey) {
  const footprint = UNITS[unit];
  const [x0, z0] = toRoom(footprint.x0, footprint.y0);
  const [x1, z1] = toRoom(footprint.x1, footprint.y1);
  return { x: [x0, x1] as Vec, z: [z0, z1] as Vec, y: [PLINTH.height, PLINTH.height + footprint.height] as Vec };
}

function unitGeometry(unit: UnitKey) {
  const { x, y, z } = unitBox(unit);
  const slats = Array.from({ length: 7 }, (_, index) => {
    const h = y[0] + 0.25 + index * 0.14;
    return bx([x[0] + 0.12, x[1] - 0.12], [h, h + 0.05], [z[1], z[1] + 0.025], 0.008);
  });
  const fanRadius = Math.min(x[1] - x[0], z[1] - z[0]) * 0.32;
  return {
    body: bx(x, y, z, 0.035),
    slats,
    fan: cylinder(fanRadius, 0.03, "y", [(x[0] + x[1]) / 2, y[1] + 0.012, (z[0] + z[1]) / 2], 48),
    hub: cylinder(fanRadius * 0.28, 0.05, "y", [(x[0] + x[1]) / 2, y[1] + 0.02, (z[0] + z[1]) / 2], 24),
    stubs: UNITS[unit].connections.map((y0) => cylinder(0.045, 0.14, "x", [x[1] + 0.07, PIPE_HEIGHT, y0 - ROOM.depth / 2], 20)),
    collars: UNITS[unit].connections.map((y0) => cylinder(0.06, 0.03, "x", [x[1] + 0.015, PIPE_HEIGHT, y0 - ROOM.depth / 2], 20)),
  };
}

function plantLabels({ focus, unit }: Extract<SceneProps, { kind: "plant" }>): SceneLabel[] {
  const box = unitBox(unit);
  const proposed = unit === "proposed";
  const gap = Math.round(accessGap(unit) * 100) / 100;
  switch (focus) {
    case "space": return [{ id: "space", at: [box.x[1], 0.02, box.z[1] + ACCESS_DEPTH / 2], title: "Access space", detail: `${gap.toFixed(2)} m left before the tank`, state: proposed ? undefined : "ok", lift: 52 }];
    case "connections": return [{ id: "connections", at: [box.x[1] + 0.14, PIPE_HEIGHT + 0.05, UNITS[unit].connections[1] - ROOM.depth / 2], title: proposed ? "Connections moved" : "Pipes meet the unit", detail: proposed ? "Pipes stop at the old positions" : "As designed", state: proposed ? undefined : "ok", lift: 46 }];
    case "support": {
      const [px, pz] = toRoom(PLINTH.x1, PLINTH.y1);
      return [{ id: "support", at: [px, PLINTH.height, pz], title: proposed ? "Base sized for the old unit" : "Base fits the unit", detail: proposed ? "The new unit overhangs it" : "As designed", state: proposed ? undefined : "ok", lift: 40 }];
    }
  }
}

function PlantScene({ focus, unit, layer, labels }: Extract<SceneProps, { kind: "plant" }> & Layered) {
  const geometry = useMemo(() => {
    const half = { x: ROOM.width / 2, z: ROOM.depth / 2 };
    const [doorX0] = toRoom(ROOM.door.x0, 0);
    const [doorX1] = toRoom(ROOM.door.x1, 0);
    const [tx0, tz0] = toRoom(TANK.x0, TANK.y0);
    const [tx1, tz1] = toRoom(TANK.x1, TANK.y1);
    const [px0, pz0] = toRoom(PLINTH.x0, PLINTH.y0);
    const [px1, pz1] = toRoom(PLINTH.x1, PLINTH.y1);
    const [ix] = toRoom(ISOLATOR_X, 0);
    return {
      floor: bx([-half.x - 0.15, half.x + 0.15], [-0.12, 0], [-half.z - 0.15, half.z + 0.15], 0.01),
      walls: [
        bx([-half.x - 0.15, half.x + 0.15], [0, ROOM.height], [-half.z - 0.15, -half.z], 0.01),
        bx([-half.x - 0.15, -half.x], [0, ROOM.height], [-half.z, half.z + 0.15], 0.01),
        bx([-half.x, doorX0], [0, 0.45], [half.z, half.z + 0.15], 0.01),
        bx([doorX1, half.x + 0.15], [0, 0.45], [half.z, half.z + 0.15], 0.01),
        bx([half.x, half.x + 0.15], [0, 0.45], [-half.z, half.z], 0.01),
      ],
      tank: bx([tx0, tx1], [0, TANK.height], [tz0, tz1], 0.06),
      ribs: [0.25, 0.55, 0.85, 1.15, 1.45].map((offset) => bx([tx0 + offset, tx0 + offset + 0.04], [0.05, TANK.height - 0.05], [tz1, tz1 + 0.02], 0.006)),
      hatch: cylinder(0.18, 0.04, "y", [tx0 + 0.45, TANK.height + 0.02, (tz0 + tz1) / 2], 32),
      plinth: bx([px0, px1], [0, PLINTH.height], [pz0, pz1], 0.015),
      isolator: bx([ix - 0.12, ix + 0.12], [1.15, 1.45], [-half.z, -half.z + 0.11], 0.015),
      conduit: cylinder(0.018, 1.15, "y", [ix, 0.575, -half.z + 0.05], 12),
      approved: unitGeometry("approved"),
      proposed: unitGeometry("proposed"),
      pipes: (end: number) => PIPE_RUNS.map((y0) => cylinder(0.042, half.x - end, "x", [(half.x + end) / 2, PIPE_HEIGHT, y0 - half.z], 20)),
      caps: (end: number) => PIPE_RUNS.map((y0) => cylinder(0.058, 0.03, "x", [end + 0.015, PIPE_HEIGHT, y0 - half.z], 20)),
      stands: [1.1, 2.0].flatMap((x) => PIPE_RUNS.map((y0) => cylinder(0.014, PIPE_HEIGHT - 0.04, "y", [x, (PIPE_HEIGHT - 0.04) / 2, y0 - half.z], 10))),
    };
  }, []);
  const proposed = unit === "proposed";
  const box = unitBox(unit);
  const parts = proposed ? geometry.proposed : geometry.approved;
  const pipeEnd = proposed ? box.x[1] + 0.24 : box.x[1] + 0.14;
  const pipes = useMemo(() => ({ runs: geometry.pipes(pipeEnd), caps: geometry.caps(pipeEnd) }), [geometry, pipeEnd]);
  const zoneGeometry = useMemo(() => {
    const b = unitBox(unit);
    return bx(b.x, [0.002, 0.012], [b.z[1], b.z[1] + ACCESS_DEPTH], 0.002);
  }, [unit]);
  return (
    <>
      <Studio extent={6} />
      <Rig view={PLANT_VIEWS[focus]} labels={labels} layer={layer} />
      <Ground />
      <Part geometry={geometry.floor} material="floor" />
      {geometry.walls.map((wall, index) => <Part key={index} geometry={wall} material="plaster" />)}
      <Part geometry={geometry.tank} material="tank" edges={focus === "space"} />
      {geometry.ribs.map((rib, index) => <Part key={index} geometry={rib} material="slat" />)}
      <Part geometry={geometry.hatch} material="grille" />
      <Part geometry={geometry.plinth} material="concrete" selected={focus === "support"} />
      <Part geometry={geometry.isolator} material="isolator" selected={focus === "support"} />
      <Part geometry={geometry.conduit} material="rod" />
      <mesh geometry={zoneGeometry} material={focus === "space" ? M.zoneSelected : M.zone} renderOrder={2} />
      <DashedOutline x0={box.x[0]} x1={box.x[1]} z0={box.z[1]} z1={box.z[1] + ACCESS_DEPTH} y={0.016} color={focus === "space" ? INK : OK} />
      {proposed && (() => {
        const old = unitBox("approved");
        return <DashedOutline x0={old.x[0]} x1={old.x[1]} z0={old.z[0]} z1={old.z[1]} y={box.y[1] + 0.012} color={INK} />;
      })()}
      <Part geometry={parts.body} material="unit" />
      {parts.slats.map((slat, index) => <Part key={index} geometry={slat} material="slat" />)}
      <Part geometry={parts.fan} material="grille" />
      <Part geometry={parts.hub} material="slat" />
      {parts.stubs.map((stub, index) => <Part key={index} geometry={stub} material="pipe" selected={focus === "connections"} />)}
      {parts.collars.map((collar, index) => <Part key={index} geometry={collar} material="slat" />)}
      {pipes.runs.map((pipe, index) => <Part key={index} geometry={pipe} material="pipe" selected={focus === "connections"} />)}
      {pipes.caps.map((cap, index) => <Part key={index} geometry={cap} material="slat" />)}
      {geometry.stands.map((stand, index) => <Part key={index} geometry={stand} material="rod" />)}
      <ContactShadow width={2.4} depth={1.6} position={[(box.x[0] + box.x[1]) / 2, 0.006, (box.z[0] + box.z[1]) / 2]} opacity={0.35} />
    </>
  );
}

/* 4. Four-window building ------------------------------------------------ */

const toHouse = (x: number, y: number): Vec => [x - HOUSE.length / 2, y - HOUSE.depth / 2];
const WINDOWS_VIEW: View = { position: [14.2, 7.2, 16.8], target: [0.4, 1.6, 0], narrow: { position: [15, 7.8, 17.6], target: [0.7, 1.6, 0] } };
const PROUD = 0.05;

function windowGeometry(item: WindowMark) {
  const { sill, head } = HOUSE;
  const frame = 0.06;
  const south = item.side === "South";
  // Faces are built in a local frame (u along the wall, v up, w out of the wall), then placed.
  const place = (u: Vec, v: Vec, w: Vec) => {
    if (south) {
      const [a] = toHouse(u[0], 0);
      const [b] = toHouse(u[1], 0);
      return bx([a, b], v, [HOUSE.depth / 2 + w[0], HOUSE.depth / 2 + w[1]], 0.006);
    }
    const [, a] = toHouse(0, u[0]);
    const [, b] = toHouse(0, u[1]);
    return bx([HOUSE.length / 2 + w[0], HOUSE.length / 2 + w[1]], v, [a, b], 0.006);
  };
  const width = item.to - item.from;
  const bars = [
    place([item.from, item.to], [head - frame, head], [0, PROUD]),
    place([item.from, item.to], [sill, sill + frame], [0, PROUD]),
    place([item.from, item.from + frame], [sill, head], [0, PROUD]),
    place([item.to - frame, item.to], [sill, head], [0, PROUD]),
  ];
  if (width > 1) bars.push(place([item.from + width / 2 - 0.025, item.from + width / 2 + 0.025], [sill, head], [0, PROUD - 0.01]));
  return {
    frame: bars,
    interior: place([item.from + frame, item.to - frame], [sill + frame, head - frame], [0.001, 0.004]),
    glass: place([item.from + frame, item.to - frame], [sill + frame, head - frame], [0.018, 0.026]),
    sill: place([item.from - 0.06, item.to + 0.06], [sill - 0.05, sill], [0, 0.12]),
  };
}

function windowAnchor(item: WindowMark): Point {
  const middle = (item.from + item.to) / 2;
  if (item.side === "South") return [toHouse(middle, 0)[0], HOUSE.head + 0.05, HOUSE.depth / 2 + PROUD];
  return [HOUSE.length / 2 + PROUD, HOUSE.head + 0.05, toHouse(0, middle)[1]];
}

function windowLabels({ selected, corrected }: Extract<SceneProps, { kind: "windows" }>): SceneLabel[] {
  const missing = WINDOWS.find((item) => item.mark === MISSING_WINDOW) ?? WINDOWS[2];
  const labels: SceneLabel[] = [{ id: MISSING_WINDOW, at: windowAnchor(missing), title: MISSING_WINDOW, detail: corrected ? "Now in the schedule" : "Not in the schedule", state: corrected ? "ok" : "blocked", lift: 40 }];
  const other = WINDOWS.find((item) => item.mark === selected && item.mark !== MISSING_WINDOW);
  if (other) labels.push({ id: other.mark, at: windowAnchor(other), title: other.mark, detail: "In the schedule", state: "ok", lift: 32 });
  return labels;
}

function WindowsScene({ selected, onSelect, layer, labels }: Extract<SceneProps, { kind: "windows" }> & Layered) {
  const geometry = useMemo(() => {
    const half = { x: HOUSE.length / 2, z: HOUSE.depth / 2 };
    return {
      base: bx([-half.x - 0.06, half.x + 0.06], [0, 0.3], [-half.z - 0.06, half.z + 0.06], 0.015),
      body: bx([-half.x, half.x], [0.3, HOUSE.height], [-half.z, half.z], 0.02),
      roof: bx([-half.x + 0.12, half.x - 0.12], [HOUSE.height, HOUSE.height + 0.04], [-half.z + 0.12, half.z - 0.12], 0.01),
      coping: [
        bx([-half.x - 0.04, half.x + 0.04], [HOUSE.height, HOUSE.height + 0.28], [half.z - 0.12, half.z + 0.04], 0.012),
        bx([-half.x - 0.04, half.x + 0.04], [HOUSE.height, HOUSE.height + 0.28], [-half.z - 0.04, -half.z + 0.12], 0.012),
        bx([half.x - 0.12, half.x + 0.04], [HOUSE.height, HOUSE.height + 0.28], [-half.z + 0.12, half.z - 0.12], 0.012),
        bx([-half.x - 0.04, -half.x + 0.12], [HOUSE.height, HOUSE.height + 0.28], [-half.z + 0.12, half.z - 0.12], 0.012),
      ],
      windows: WINDOWS.map((item) => ({ item, ...windowGeometry(item) })),
    };
  }, []);
  return (
    <>
      <Studio extent={10} />
      <Rig view={WINDOWS_VIEW} labels={labels} layer={layer} />
      <Ground />
      <ContactShadow width={HOUSE.length * 1.35} depth={HOUSE.depth * 1.5} position={[0, 0.004, 0]} opacity={0.42} />
      <Part geometry={geometry.base} material="base" />
      <Part geometry={geometry.body} material="render" />
      <Part geometry={geometry.roof} material="coping" />
      {geometry.coping.map((piece, index) => <Part key={index} geometry={piece} material="coping" />)}
      {geometry.windows.map(({ item, frame, interior, glass, sill }) => {
        const active = item.mark === selected;
        return (
          <group key={item.mark} {...pickHandlers(() => onSelect(item.mark))}>
            <mesh geometry={interior} material={M.interior} />
            <mesh geometry={glass} material={active ? tinted(M.glass) : M.glass} />
            {frame.map((bar, index) => <Part key={index} geometry={bar} material="frame" selected={active} />)}
            <Part geometry={sill} material="sill" selected={active} />
          </group>
        );
      })}
    </>
  );
}

/* Entry ------------------------------------------------------------------- */

type Layered = { layer: RefObject<HTMLDivElement | null>; labels: SceneLabel[] };

function labelsFor(props: SceneProps): SceneLabel[] {
  switch (props.kind) {
    case "model": return modelLabels(props);
    case "clash": return clashLabels(props);
    case "plant": return plantLabels(props);
    case "windows": return windowLabels(props);
  }
}

function SceneContent(props: SceneProps & Layered): ReactNode {
  switch (props.kind) {
    case "model": return <ModelScene {...props} />;
    case "clash": return <ClashScene {...props} />;
    case "plant": return <PlantScene {...props} />;
    case "windows": return <WindowsScene {...props} />;
  }
}

function Ready({ onReady }: { onReady: () => void }) {
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    done.current = true;
    requestAnimationFrame(onReady);
  });
  return null;
}

export default function DesignScene(props: SceneProps): ReactNode {
  const layer = useRef<HTMLDivElement>(null);
  const labels = labelsFor(props);
  return (
    <>
      <Canvas
        frameloop={props.active ? "demand" : "never"}
        shadows="percentage"
        dpr={[1, 2]}
        camera={{ fov: 24, near: 0.1, far: 300, position: [14, 9, 16] }}
        gl={{ antialias: true, alpha: true, powerPreference: "low-power", toneMapping: THREE.NeutralToneMapping, toneMappingExposure: 0.92 }}
        style={{ position: "absolute", inset: 0 }}
        aria-hidden="true"
      >
        <SceneContent {...props} layer={layer} labels={labels} />
        <Ready onReady={props.onReady} />
      </Canvas>
      <LabelLayer labels={labels} layer={layer} />
    </>
  );
}
