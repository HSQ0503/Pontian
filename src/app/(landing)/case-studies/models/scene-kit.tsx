"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode, type RefObject } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import styles from "./model.module.css";

export type Vec = [number, number];
export type Point = [number, number, number];

/* Shared conventions: yellow tint plus ink edges for selection, blue for
   proposed or OK, red for blocked, white HTML chips with an ink leader. */

export const INK = "#17191a";
export const SELECT = "#fed603";
export const OK = "#007dfe";
export const BLOCKED = "#f51625";
export const GROUND = "#f5f5f2";

export const standard = (color: string, roughness: number, metalness = 0, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
export const physical = (color: string, roughness: number, extra: THREE.MeshPhysicalMaterialParameters = {}) => new THREE.MeshPhysicalMaterial({ color, roughness, metalness: 0, ...extra });

export const GHOST = physical("#dfe3e8", 0.6, { transparent: true, opacity: 0.28, depthWrite: false });
export const PROPOSED = standard(OK, 0.6, 0, { transparent: true, opacity: 0.42, depthWrite: false });
export const ZONE_OK = standard(OK, 0.7, 0, { transparent: true, opacity: 0.18, depthWrite: false });
export const ZONE_SELECT = standard(SELECT, 0.7, 0, { transparent: true, opacity: 0.45, depthWrite: false });
export const ALERT = new THREE.MeshBasicMaterial({ color: BLOCKED, transparent: true, opacity: 0.86, depthWrite: false, toneMapped: false });
export const MARKER = new THREE.MeshBasicMaterial({ color: SELECT, toneMapped: false });

const tintCache = new Map<THREE.Material, Map<number, THREE.Material>>();
// Large surfaces take a lighter tint so they read as highlighted, not repainted.
export function tinted(material: THREE.Material, strength = 0.72) {
  let byStrength = tintCache.get(material);
  if (!byStrength) { byStrength = new Map(); tintCache.set(material, byStrength); }
  const cached = byStrength.get(strength);
  if (cached) return cached;
  const copy = (material as THREE.MeshStandardMaterial).clone();
  copy.color.lerp(new THREE.Color(SELECT), strength);
  copy.polygonOffset = true;
  copy.polygonOffsetFactor = 1;
  copy.polygonOffsetUnits = 1;
  byStrength.set(strength, copy);
  return copy;
}

export const EDGE_INK = new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.85 });
export const EDGE_SOFT = new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.28 });
export const EDGE_OK = new THREE.LineBasicMaterial({ color: OK, transparent: true, opacity: 0.9 });
const edgeCache = new WeakMap<THREE.BufferGeometry, THREE.EdgesGeometry>();
export function edgesOf(geometry: THREE.BufferGeometry) {
  let edges = edgeCache.get(geometry);
  if (!edges) {
    edges = new THREE.EdgesGeometry(geometry, 32);
    edgeCache.set(geometry, edges);
  }
  return edges;
}

/* Geometry helpers */

export function bx(x: Vec, y: Vec, z: Vec, radius = 0.02) {
  const width = x[1] - x[0];
  const height = y[1] - y[0];
  const depth = z[1] - z[0];
  const r = Math.max(0.0001, Math.min(radius, width / 2.2, height / 2.2, depth / 2.2));
  return new RoundedBoxGeometry(width, height, depth, 2, r).translate((x[0] + x[1]) / 2, (y[0] + y[1]) / 2, (z[0] + z[1]) / 2);
}

export function cylinder(radius: number, length: number, axis: "x" | "y" | "z", center: Point, segments = 24) {
  const geometry = new THREE.CylinderGeometry(radius, radius, length, segments);
  if (axis === "x") geometry.rotateZ(-Math.PI / 2);
  if (axis === "z") geometry.rotateX(Math.PI / 2);
  return geometry.translate(...center);
}

/* Picking: a drag that turns the model is not a click. */

function setCursor(event: ThreeEvent<PointerEvent>, cursor: string) {
  const target = event.nativeEvent.target;
  if (target instanceof HTMLElement) target.style.cursor = cursor;
}

export function pickHandlers(onPick?: () => void) {
  if (!onPick) return {};
  return {
    onClick: (event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); if (event.delta <= 6) onPick(); },
    onPointerOver: (event: ThreeEvent<PointerEvent>) => { event.stopPropagation(); setCursor(event, "pointer"); },
    onPointerOut: (event: ThreeEvent<PointerEvent>) => setCursor(event, ""),
  };
}

type PartProps = {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  selected?: boolean;
  ghost?: boolean;
  edges?: boolean;
  shadow?: boolean;
  tint?: number;
  onPick?: () => void;
};

export function Part({ geometry, material, selected, ghost, edges, shadow = true, tint, onPick }: PartProps) {
  const resolved = ghost ? GHOST : selected ? tinted(material, tint) : material;
  return (
    <group {...pickHandlers(onPick)}>
      <mesh geometry={geometry} material={resolved} castShadow={shadow && !ghost} receiveShadow={!ghost} />
      {(selected || edges || ghost) && <lineSegments geometry={edgesOf(geometry)} material={ghost ? EDGE_SOFT : EDGE_INK} />}
    </group>
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

export function ContactShadow({ width, depth, position = [0, 0.006, 0], opacity = 0.5 }: { width: number; depth: number; position?: Point; opacity?: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={position} renderOrder={1}>
      <planeGeometry args={[width, depth]} />
      <meshBasicMaterial map={contactTexture()} transparent depthWrite={false} opacity={opacity} toneMapped={false} />
    </mesh>
  );
}

export function Ground({ size = 240, grid = true }: { size?: number; grid?: boolean }) {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[size, size]} />
        <shadowMaterial transparent opacity={0.14} depthWrite={false} />
      </mesh>
      {grid && <gridHelper args={[size, size / 2, "#e2e2de", "#e2e2de"]} position={[0, 0.001, 0]} />}
    </>
  );
}

export function DashedOutline({ points, y = 0.012, color = INK, dash = 0.12, gap = 0.08 }: { points: Vec[]; y?: number; color?: string; dash?: number; gap?: number }) {
  const key = points.map((point) => point.join(",")).join(";");
  const line = useMemo(() => {
    const path = [...points, points[0]].map(([px, pz]) => new THREE.Vector3(px, y, pz));
    const outline = new THREE.Line(new THREE.BufferGeometry().setFromPoints(path), new THREE.LineDashedMaterial({ color, dashSize: dash, gapSize: gap }));
    outline.computeLineDistances();
    return outline;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, y, color, dash, gap]);
  return <primitive object={line} />;
}

/* Lighting: RoomEnvironment reflections plus one soft shadow-casting key light. */

export function Studio({ extent = 12, center = [0, 0, 0], intensity = 2.1 }: { extent?: number; center?: Point; intensity?: number }) {
  const { gl } = useThree();
  const environment = useMemo(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const texture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    return texture;
  }, [gl]);
  useEffect(() => () => environment.dispose(), [environment]);
  const [cx, cy, cz] = center;
  const light = useMemo(() => {
    const directional = new THREE.DirectionalLight("#ffffff", intensity);
    directional.position.set(cx + extent * 0.75, extent * 1.35, cz + extent * 0.95);
    directional.target.position.set(cx, cy, cz);
    directional.castShadow = true;
    directional.shadow.mapSize.set(2048, 2048);
    directional.shadow.radius = 7;
    directional.shadow.bias = -0.0004;
    directional.shadow.normalBias = 0.02;
    Object.assign(directional.shadow.camera, { left: -extent, right: extent, top: extent, bottom: -extent, near: 0.5, far: extent * 6 });
    directional.shadow.camera.updateProjectionMatrix();
    return directional;
  }, [extent, cx, cy, cz, intensity]);
  return (
    <>
      <primitive object={environment} attach="environment" />
      <primitive object={light} />
      <primitive object={light.target} />
    </>
  );
}

/* Labels: HTML chips positioned every rendered frame from 3D anchors. */

export type LabelState = "ok" | "select" | "blocked";
export type SceneLabel = { id: string; at: Point; title: string; detail?: string; state?: LabelState; lift?: number };

function LabelLayer({ labels, layer }: { labels: SceneLabel[]; layer: RefObject<HTMLDivElement | null> }) {
  return (
    <div ref={layer} className={styles.sceneLabels} aria-hidden="true">
      {labels.map((label) => (
        <div key={label.id} className={styles.sceneLabel} data-label={label.id} data-state={label.state} style={{ "--lift": `${label.lift ?? 30}px` } as CSSProperties}>
          <span className={styles.chip}><strong>{label.title}</strong>{label.detail && <span>{label.detail}</span>}</span>
          <i className={styles.leader} />
        </div>
      ))}
    </div>
  );
}

const scratch = new THREE.Vector3();
const EDGE = 8;

// The leader stays on its anchor; the chip slides along it to stay in frame.
function placeLabels(layer: HTMLDivElement | null, labels: SceneLabel[], camera: THREE.Camera, width: number, height: number) {
  if (!layer) return;
  for (const label of labels) {
    const element = layer.querySelector<HTMLElement>(`[data-label="${label.id}"]`);
    const chip = element?.firstElementChild as HTMLElement | null;
    if (!element || !chip) continue;
    scratch.set(...label.at).project(camera);
    const x = (scratch.x * 0.5 + 0.5) * width;
    const y = (-scratch.y * 0.5 + 0.5) * height;
    const visible = scratch.z < 1 && Math.abs(scratch.x) < 1.05 && Math.abs(scratch.y) < 1.05;
    const half = chip.offsetWidth / 2;
    const shift = x - half < EDGE ? EDGE - (x - half) : x + half > width - EDGE ? width - EDGE - (x + half) : 0;
    element.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -100%)`;
    chip.style.transform = `translateX(${shift.toFixed(1)}px)`;
    element.style.opacity = visible ? "1" : "0";
  }
}

/* Camera: eased moves between framed viewpoints, plus a small clamped turn on drag. */

export type Frame = { position: Point; target: Point };
export type View = Frame & { narrow?: Frame };
type Orbit = { yaw: number; pitch: number };
const TRANSITION_MS = 900;
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 4);

function fit(view: View, aspect: number) {
  const frame = aspect < 1.3 && view.narrow ? view.narrow : view;
  const target = new THREE.Vector3(...frame.target);
  const offset = new THREE.Vector3(...frame.position).sub(target);
  if (aspect < 1.5 && !(aspect < 1.3 && view.narrow)) offset.multiplyScalar(Math.min(2.1, Math.pow(1.5 / aspect, 0.85)));
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
  const viewKey = JSON.stringify(view);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const goal = useMemo(() => fit(view, size.width / size.height), [viewKey, size.width, size.height]);
  useEffect(() => { invalidate(); }, [goal, labels, invalidate]);
  useFrame((state, delta) => {
    const { current, moving } = step(tween, goal, instant);
    const target = orbit.current;
    const k = instant ? 1 : 1 - Math.exp(-delta * 10);
    turn.current.yaw += (target.yaw - turn.current.yaw) * k;
    turn.current.pitch += (target.pitch - turn.current.pitch) * k;
    spherical.setFromVector3(offsetVector.copy(current.position).sub(current.target));
    spherical.theta += turn.current.yaw;
    spherical.phi = THREE.MathUtils.clamp(spherical.phi - turn.current.pitch, 0.2, 1.45);
    camera.position.copy(current.target).add(offsetVector.setFromSpherical(spherical));
    camera.lookAt(current.target);
    camera.updateMatrixWorld();
    placeLabels(layer.current, labels, camera, size.width, size.height);
    const turning = Math.abs(target.yaw - turn.current.yaw) > 0.0005 || Math.abs(target.pitch - turn.current.pitch) > 0.0005;
    if (moving || turning) state.invalidate();
  });
  return null;
}

/* Animation helpers for frameloop="demand": they request frames only while moving. */

// Eases a number toward its target. Read `.current` inside useFrame.
export function useTween(target: number, instant: boolean, duration = 700) {
  const value = useRef(target);
  const from = useRef(target);
  const to = useRef(target);
  const start = useRef(0);
  const { invalidate } = useThree();
  useEffect(() => {
    from.current = value.current;
    to.current = target;
    start.current = performance.now();
    invalidate();
  }, [target, invalidate]);
  useFrame((state) => {
    if (instant || duration <= 0) {
      if (value.current !== to.current) { value.current = to.current; state.invalidate(); }
      return;
    }
    const t = Math.min(1, (performance.now() - start.current) / duration);
    value.current = from.current + (to.current - from.current) * easeOut(t);
    if (t < 1) state.invalidate();
  }, -1);
  return value;
}

// Keeps frames coming while `running` is true (and motion is allowed).
export function useContinuous(running: boolean) {
  const { invalidate } = useThree();
  useEffect(() => { if (running) invalidate(); }, [running, invalidate]);
  useFrame((state) => { if (running) state.invalidate(); });
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

type ModelCanvasProps = {
  active: boolean;
  instant: boolean;
  onReady: () => void;
  view: View;
  labels: SceneLabel[];
  turnable?: boolean;
  extent?: number;
  center?: Point;
  fov?: number;
  exposure?: number;
  fog?: [number, number];
  children: ReactNode;
};

export function ModelCanvas({ active, instant, onReady, view, labels, turnable = true, extent = 12, center = [0, 0, 0], fov = 26, exposure = 0.95, fog, children }: ModelCanvasProps) {
  const layer = useRef<HTMLDivElement>(null);
  const orbit = useRef<Orbit>({ yaw: 0, pitch: 0 });
  const redraw = useRef<() => void>(() => undefined);
  const drag = useRef<{ x: number; y: number; start: Orbit; moved: boolean } | null>(null);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!turnable) return;
    drag.current = { x: event.clientX, y: event.clientY, start: { ...orbit.current }, moved: false };
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = drag.current;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (!start.moved && Math.hypot(dx, dy) < 5) return;
    if (!start.moved) { start.moved = true; event.currentTarget.setPointerCapture(event.pointerId); }
    orbit.current = {
      yaw: THREE.MathUtils.clamp(start.start.yaw - dx * 0.005, -0.6, 0.6),
      pitch: event.pointerType === "touch" ? start.start.pitch : THREE.MathUtils.clamp(start.start.pitch + dy * 0.003, -0.25, 0.3),
    };
    redraw.current();
  };
  const onPointerEnd = () => { drag.current = null; };

  return (
    <div className={styles.sceneRoot} data-turnable={turnable || undefined} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerEnd} onPointerCancel={onPointerEnd}>
      <Canvas
        frameloop={active ? "demand" : "never"}
        shadows="percentage"
        dpr={[1, 2]}
        camera={{ fov, near: 0.1, far: 500, position: [20, 16, 24] }}
        gl={{ antialias: true, alpha: true, powerPreference: "low-power", toneMapping: THREE.NeutralToneMapping, toneMappingExposure: exposure }}
        style={{ position: "absolute", inset: 0 }}
        onCreated={(state) => { redraw.current = () => state.invalidate(); }}
        aria-hidden="true"
      >
        {fog && <fog attach="fog" args={[GROUND, fog[0], fog[1]]} />}
        <Studio extent={extent} center={center} />
        <Rig view={view} labels={labels} layer={layer} instant={instant} orbit={orbit} />
        {children}
        <Ready onReady={onReady} />
      </Canvas>
      <LabelLayer labels={labels} layer={layer} />
    </div>
  );
}
