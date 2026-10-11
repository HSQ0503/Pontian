"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type CSSProperties, type ReactNode, type RefObject } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import styles from "./property-services.module.css";

import type { Area, AreaState, Pin, Point, SceneInput, SceneLabel, StopId, ViewId } from "./property-services-model";

export type SceneProps = SceneInput & { active: boolean; onReady: () => void };

/* Same conventions as the Logistics and Equipment Rental scenes: yellow tint
   plus ink edges for selection, blue for work in scope, red for excluded or
   blocked, white HTML chips with an ink leader. */
const INK = "#17191a";
const SELECT = "#fed603";
const OK = "#007dfe";
const BLOCKED = "#f51625";

const physical = (color: string, roughness: number, extra: THREE.MeshPhysicalMaterialParameters = {}) => new THREE.MeshPhysicalMaterial({ color, roughness, metalness: 0, ...extra });
const standard = (color: string, roughness: number, metalness = 0, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });

const M = {
  wall: physical("#efeee9", 0.82, { envMapIntensity: 0.6 }),
  wallShade: physical("#e2e1dc", 0.84, { envMapIntensity: 0.6 }),
  roof: standard("#7d8185", 0.72, 0.05, { side: THREE.DoubleSide }),
  garageRoof: standard("#868a8e", 0.72, 0.05, { side: THREE.DoubleSide }),
  trim: standard("#44474b", 0.6, 0.15),
  glass: physical("#33404a", 0.08, { envMapIntensity: 1.3 }),
  door: standard("#5d6064", 0.55, 0.1),
  garageDoor: standard("#dcdcd8", 0.6),
  groove: standard("#b9bab6", 0.7),
  concrete: standard("#d3d2cc", 0.95),
  joint: standard("#a9a8a2", 0.95),
  gravel: standard("#c7c5bd", 1),
  slab: standard("#e3e2dc", 0.92),
  paint: physical("#f6f5f1", 0.62, { envMapIntensity: 0.5 }),
  gateFrame: standard("#55585b", 0.55, 0.3),
  lawn: standard("#e6e8e1", 1),
  asphalt: standard("#c4c5c1", 0.96),
  kerb: standard("#dededa", 0.9),
  marking: standard("#f7f7f4", 0.8),
  trunk: standard("#8f877b", 0.9),
  canopy: standard("#c4c9be", 0.95, 0, { flatShading: true }),
  neighbour: physical("#e9e8e3", 0.85),
  neighbourRoof: standard("#9b9ea1", 0.75, 0.05, { side: THREE.DoubleSide }),
};
type MaterialKey = keyof typeof M;

let paverMaterial: THREE.MeshStandardMaterial | null = null;
function pavers() {
  if (paverMaterial) return paverMaterial;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const context = canvas.getContext("2d");
  if (context) {
    context.fillStyle = "#e6e3dc";
    context.fillRect(0, 0, 256, 256);
    context.strokeStyle = "rgba(70, 66, 58, 0.28)";
    context.lineWidth = 3;
    for (let v = 0; v <= 256; v += 64) {
      context.beginPath(); context.moveTo(v, 0); context.lineTo(v, 256); context.stroke();
      context.beginPath(); context.moveTo(0, v); context.lineTo(256, v); context.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(11 / 2.4, 4.6 / 2.4);
  texture.anisotropy = 4;
  paverMaterial = standard("#ffffff", 0.9, 0, { map: texture });
  return paverMaterial;
}

const tintCache = new Map<THREE.Material, THREE.Material>();
function tinted(material: THREE.Material) {
  const cached = tintCache.get(material);
  if (cached) return cached;
  const copy = (material as THREE.MeshStandardMaterial).clone();
  copy.color.lerp(new THREE.Color(SELECT), 0.62);
  tintCache.set(material, copy);
  return copy;
}

const EDGE_INK = new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.85 });

/* Plan layout, in metres. x runs west to east, z north to south, so the
   street is at +z. These are the 2D plan's coordinates at 1 unit = 10 cm. */

type Rect = { x: [number, number]; z: [number, number] };
const DRIVEWAY: Rect = { x: [-5, 1.5], z: [6.9, 13.1] };
const PATIO: Rect = { x: [-1, 10], z: [-8.7, -4.1] };
const PATH_OUTLINE: [number, number][] = [[-8.4, -6.9], [-5.6, -6.9], [-5.6, 6.9], [-5, 6.9], [-5, 8.5], [-8.4, 8.5]];
const HOUSE: Rect = { x: [-5, 13], z: [-4.1, 4.5] };
const GARAGE: Rect = { x: [-5, 1.5], z: [4.5, 6.9] };
const FENCE_Z = -1.3;
const FENCE_RUNS: [[number, number], [number, number]][] = [
  [[-8.4, FENCE_Z], [-17.6, FENCE_Z]],
  [[-17.6, FENCE_Z], [-17.6, -10.7]],
  [[-17.6, -10.7], [17.6, -10.7]],
  [[17.6, -10.7], [17.6, FENCE_Z]],
  [[17.6, FENCE_Z], [13, FENCE_Z]],
  [[-5.6, FENCE_Z], [-5, FENCE_Z]],
];
const GATE = { x: [-8.4, -5.6] as [number, number], z: FENCE_Z };
const STREET_Z: [number, number] = [13.1, 16.9];

const DRIVEWAY_POINTS = rectPoints(DRIVEWAY);
const PATIO_POINTS = rectPoints(PATIO);

/* Geometry helpers */

function box(x: [number, number], y: [number, number], z: [number, number]) {
  return new THREE.BoxGeometry(x[1] - x[0], y[1] - y[0], z[1] - z[0]).translate((x[0] + x[1]) / 2, (y[0] + y[1]) / 2, (z[0] + z[1]) / 2);
}

function triangles(points: Point[]) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(points.flat(), 3));
  geometry.computeVertexNormals();
  return geometry;
}

// A hip roof over a wall rectangle. The eave drops below the wall top by the
// overhang so the roof meets the walls on their line.
function hipRoof(walls: Rect, top: number, rise: number, overhang: number) {
  const half = (walls.z[1] - walls.z[0]) / 2;
  const slope = rise / half;
  const [x0, x1] = [walls.x[0] - overhang, walls.x[1] + overhang];
  const [z0, z1] = [walls.z[0] - overhang, walls.z[1] + overhang];
  const eave = top - overhang * slope;
  const inset = half + overhang;
  const zc = (z0 + z1) / 2;
  const A: Point = [x0, eave, z0], B: Point = [x1, eave, z0], C: Point = [x1, eave, z1], D: Point = [x0, eave, z1];
  const R1: Point = [x0 + inset, top + rise, zc], R2: Point = [x1 - inset, top + rise, zc];
  return { geometry: triangles([A, R1, R2, A, R2, B, D, C, R2, D, R2, R1, A, D, R1, B, R2, C]), eave, outer: { x: [x0, x1] as [number, number], z: [z0, z1] as [number, number] } };
}

// A gable roof with its ridge running north–south and the gable end facing the street.
function gableRoof(walls: Rect, top: number, rise: number, overhang: number, back: number) {
  const half = (walls.x[1] - walls.x[0]) / 2;
  const slope = rise / half;
  const [x0, x1] = [walls.x[0] - overhang, walls.x[1] + overhang];
  const [z0, z1] = [back, walls.z[1] + overhang];
  const eave = top - overhang * slope;
  const xc = (x0 + x1) / 2;
  const W0: Point = [x0, eave, z0], W1: Point = [x0, eave, z1], E0: Point = [x1, eave, z0], E1: Point = [x1, eave, z1];
  const R0: Point = [xc, top + rise, z0], R1: Point = [xc, top + rise, z1];
  const gable = triangles([[walls.x[0], top, walls.z[1]], [walls.x[1], top, walls.z[1]], [xc, top + rise, walls.z[1]]]);
  return { geometry: triangles([W0, W1, R1, W0, R1, R0, E0, R0, R1, E0, R1, E1]), gable, eave };
}

function flatShape(points: [number, number][], y: number) {
  const shape = new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x, -z)));
  const geometry = new THREE.ShapeGeometry(shape);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, y, 0);
  return geometry;
}
function rectPoints(rect: Rect): [number, number][] {
  return [[rect.x[0], rect.z[0]], [rect.x[1], rect.z[0]], [rect.x[1], rect.z[1]], [rect.x[0], rect.z[1]]];
}

const edgeCache = new WeakMap<THREE.BufferGeometry, THREE.EdgesGeometry>();
function edgesOf(geometry: THREE.BufferGeometry) {
  let edges = edgeCache.get(geometry);
  if (!edges) {
    edges = new THREE.EdgesGeometry(geometry, 30);
    edgeCache.set(geometry, edges);
  }
  return edges;
}

const GATE_GLOW = new THREE.MeshBasicMaterial({ color: SELECT, transparent: true, opacity: 0.18, depthWrite: false });

function setCursor(event: ThreeEvent<PointerEvent>, cursor: string) {
  const element = event.nativeEvent.target as HTMLElement | null;
  if (element) element.style.cursor = cursor;
}

function pickHandlers(onPick?: () => void) {
  if (!onPick) return {};
  return {
    onClick: (event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onPick(); },
    onPointerOver: (event: ThreeEvent<PointerEvent>) => { event.stopPropagation(); setCursor(event, "pointer"); },
    onPointerOut: (event: ThreeEvent<PointerEvent>) => setCursor(event, ""),
  };
}

function Solid({ geometry, material, selected, shadow = true }: { geometry: THREE.BufferGeometry; material: MaterialKey | THREE.Material; selected?: boolean; shadow?: boolean }) {
  const base = typeof material === "string" ? M[material] : material;
  return (
    <>
      <mesh geometry={geometry} material={selected ? tinted(base) : base} castShadow={shadow} receiveShadow />
      {selected && <lineSegments geometry={edgesOf(geometry)} material={EDGE_INK} />}
    </>
  );
}

function Block({ x, y, z, material, shadow = true, selected }: { x: [number, number]; y: [number, number]; z: [number, number]; material: MaterialKey | THREE.Material; shadow?: boolean; selected?: boolean }) {
  const [x0, x1] = x;
  const [y0, y1] = y;
  const [z0, z1] = z;
  const geometry = useMemo(() => box([x0, x1], [y0, y1], [z0, z1]), [x0, x1, y0, y1, z0, z1]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <Solid geometry={geometry} material={material} shadow={shadow} selected={selected} />;
}

/* State overlays for the flat work areas: a tinted fill and an outline. */

function AreaOverlay({ points, state, selected }: { points: [number, number][]; state: AreaState; selected: boolean }) {
  const fill = useMemo(() => flatShape(points, 0.075), [points]);
  const line = useMemo(() => {
    const color = selected ? INK : state === "scope" ? OK : state === "excluded" ? BLOCKED : INK;
    const dashed = !selected && state === "open";
    const material = dashed ? new THREE.LineDashedMaterial({ color, dashSize: 0.45, gapSize: 0.3 }) : new THREE.LineBasicMaterial({ color });
    const object = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points.map(([x, z]) => new THREE.Vector3(x, 0.08, z))), material);
    object.computeLineDistances();
    return object;
  }, [points, state, selected]);
  useEffect(() => () => { line.geometry.dispose(); (line.material as THREE.Material).dispose(); }, [line]);
  useEffect(() => () => fill.dispose(), [fill]);
  if (state === "plain" && !selected) return null;
  const color = selected ? SELECT : state === "scope" ? OK : state === "excluded" ? BLOCKED : "#ffffff";
  const opacity = selected ? 0.55 : state === "scope" ? 0.26 : state === "open" ? 0.35 : 0.2;
  return (
    <>
      <mesh geometry={fill} renderOrder={2}>
        <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} toneMapped={false} polygonOffset polygonOffsetFactor={-2} />
      </mesh>
      <primitive object={line} />
    </>
  );
}

/* The house */

function Window({ face, along, y, at }: { face: "south" | "north" | "west" | "east"; along: [number, number]; y: [number, number]; at: number }) {
  const out = face === "south" || face === "east" ? 1 : -1;
  const frame = face === "south" || face === "north"
    ? { x: along, z: [at, at + out * 0.06].sort((a, b) => a - b) as [number, number] }
    : { x: [at, at + out * 0.06].sort((a, b) => a - b) as [number, number], z: along };
  const glass = face === "south" || face === "north"
    ? { x: [along[0] + 0.08, along[1] - 0.08] as [number, number], z: [at, at + out * 0.075].sort((a, b) => a - b) as [number, number] }
    : { x: [at, at + out * 0.075].sort((a, b) => a - b) as [number, number], z: [along[0] + 0.08, along[1] - 0.08] as [number, number] };
  return (
    <>
      <Block x={frame.x} y={y} z={frame.z} material="trim" shadow={false} />
      <Block x={glass.x} y={[y[0] + 0.08, y[1] - 0.08]} z={glass.z} material="glass" shadow={false} />
    </>
  );
}

function House() {
  const main = useMemo(() => hipRoof(HOUSE, 3, 2.4, 0.4), []);
  const garage = useMemo(() => gableRoof(GARAGE, 2.6, 1.5, 0.35, 2.2), []);
  const fascia = main.outer;
  return (
    <group>
      <Block x={HOUSE.x} y={[0, 3]} z={HOUSE.z} material="wall" />
      <Block x={GARAGE.x} y={[0, 2.6]} z={[HOUSE.z[1] - 0.2, GARAGE.z[1]]} material="wallShade" />
      <Solid geometry={main.geometry} material="roof" />
      <Solid geometry={garage.geometry} material="garageRoof" />
      <Solid geometry={garage.gable} material="wallShade" shadow={false} />
      {[
        { x: fascia.x, z: [fascia.z[0], fascia.z[0] + 0.05] as [number, number] },
        { x: fascia.x, z: [fascia.z[1] - 0.05, fascia.z[1]] as [number, number] },
        { x: [fascia.x[0], fascia.x[0] + 0.05] as [number, number], z: fascia.z },
        { x: [fascia.x[1] - 0.05, fascia.x[1]] as [number, number], z: fascia.z },
      ].map((edge, index) => <Block key={index} x={edge.x} y={[main.eave - 0.16, main.eave]} z={edge.z} material="trim" shadow={false} />)}
      {/* Garage door with panel grooves, front door, windows, back door and step. */}
      <Block x={[-4.4, 0.9]} y={[0, 2.25]} z={[6.9, 6.95]} material="garageDoor" />
      {[0.56, 1.12, 1.68].map((y) => <Block key={y} x={[-4.4, 0.9]} y={[y, y + 0.03]} z={[6.95, 6.96]} material="groove" shadow={false} />)}
      <Block x={[-4.5, 1]} y={[2.25, 2.33]} z={[6.9, 6.97]} material="trim" shadow={false} />
      <Block x={[2.4, 3.4]} y={[0, 2.15]} z={[4.5, 4.56]} material="door" />
      {[[5, 6.6], [8, 9.6], [11, 12.4]].map((along) => <Window key={along[0]} face="south" along={along as [number, number]} y={[0.95, 2.25]} at={4.5} />)}
      {[[-3, -1.4], [0.5, 2.1], [7, 8.6], [10.5, 12.1]].map((along) => <Window key={along[0]} face="north" along={along as [number, number]} y={[0.95, 2.25]} at={-4.1} />)}
      <Block x={[4, 5.6]} y={[0, 2.15]} z={[-4.16, -4.1]} material="door" />
      <Block x={[3.8, 5.8]} y={[0, 0.16]} z={[-4.7, -4.1]} material="slab" />
      <Window face="west" along={[-3.6, -2.2]} y={[1, 2.2]} at={-5} />
      <Window face="west" along={[5.2, 6.2]} y={[1.1, 2]} at={-5} />
      <Window face="east" along={[-2.4, -0.6]} y={[0.95, 2.25]} at={13} />
    </group>
  );
}

/* Hard landscaping */

const PATH_SLABS = Array.from({ length: 10 }, (_, index) => -6.6 + index * 1.34);

function Driveway({ state, selected, onPick }: { state: AreaState; selected: boolean; onPick?: () => void }) {
  return (
    <group {...pickHandlers(onPick)}>
      <Block x={DRIVEWAY.x} y={[0, 0.05]} z={DRIVEWAY.z} material="concrete" />
      <Block x={[-1.77, -1.73]} y={[0.05, 0.052]} z={DRIVEWAY.z} material="joint" shadow={false} />
      {[9, 11.05].map((z) => <Block key={z} x={DRIVEWAY.x} y={[0.05, 0.052]} z={[z - 0.02, z + 0.02]} material="joint" shadow={false} />)}
      <AreaOverlay points={DRIVEWAY_POINTS} state={state} selected={selected} />
    </group>
  );
}

function Patio({ state, selected, onPick }: { state: AreaState; selected: boolean; onPick?: () => void }) {
  const geometry = useMemo(() => box(PATIO.x, [0, 0.07], PATIO.z), []);
  return (
    <group {...pickHandlers(onPick)}>
      <mesh geometry={geometry} material={pavers()} receiveShadow castShadow />
      <AreaOverlay points={PATIO_POINTS} state={state} selected={selected} />
    </group>
  );
}

function SidePath({ state, selected, onPick }: { state: AreaState; selected: boolean; onPick?: () => void }) {
  const gravel = useMemo(() => {
    const shape = new THREE.Shape(PATH_OUTLINE.map(([x, z]) => new THREE.Vector2(x, -z)));
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.03, bevelEnabled: false });
    geometry.rotateX(-Math.PI / 2);
    return geometry;
  }, []);
  return (
    <group {...pickHandlers(onPick)}>
      <mesh geometry={gravel} material={M.gravel} receiveShadow />
      {PATH_SLABS.map((z) => <Block key={z} x={[-8.25, -5.75]} y={[0.03, 0.06]} z={[z, z + 1.06]} material="slab" />)}
      <Block x={[-8.25, -5.15]} y={[0.03, 0.06]} z={[7.05, 8.35]} material="slab" />
      <AreaOverlay points={PATH_OUTLINE} state={state} selected={selected} />
    </group>
  );
}

/* Fence and gate: instanced pickets and posts along each run. */

function fenceMatrices() {
  const pickets: THREE.Matrix4[] = [];
  const posts: THREE.Matrix4[] = [];
  const rails: { x: [number, number]; z: [number, number]; y: number }[] = [];
  const dummy = new THREE.Object3D();
  for (const [[x0, z0], [x1, z1]] of FENCE_RUNS) {
    const length = Math.hypot(x1 - x0, z1 - z0);
    const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
    const count = Math.max(1, Math.floor(length / 0.16));
    for (let index = 0; index < count; index++) {
      const k = (index + 0.5) / count;
      dummy.position.set(x0 + (x1 - x0) * k, 0.68, z0 + (z1 - z0) * k);
      dummy.rotation.set(0, alongX ? 0 : Math.PI / 2, 0);
      dummy.updateMatrix();
      pickets.push(dummy.matrix.clone());
    }
    const spans = Math.max(1, Math.round(length / 2.3));
    for (let index = 0; index <= spans; index++) {
      const k = index / spans;
      dummy.position.set(x0 + (x1 - x0) * k, 0.74, z0 + (z1 - z0) * k);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      posts.push(dummy.matrix.clone());
    }
    const offset = 0.04;
    for (const y of [0.32, 1.06]) {
      rails.push(alongX
        ? { x: [Math.min(x0, x1), Math.max(x0, x1)], z: [z0 + offset - 0.02, z0 + offset + 0.02], y }
        : { x: [x0 + offset - 0.02, x0 + offset + 0.02], z: [Math.min(z0, z1), Math.max(z0, z1)], y });
    }
  }
  return { pickets, posts, rails };
}

function Instanced({ geometry, material, matrices }: { geometry: THREE.BufferGeometry; material: THREE.Material; matrices: THREE.Matrix4[] }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    if (!mesh.current) return;
    matrices.forEach((matrix, index) => mesh.current?.setMatrixAt(index, matrix));
    mesh.current.instanceMatrix.needsUpdate = true;
    mesh.current.computeBoundingSphere();
  }, [matrices]);
  return <instancedMesh ref={mesh} args={[geometry, material, matrices.length]} castShadow receiveShadow />;
}

function FenceBaseline({ state }: { state: AreaState }) {
  const line = useMemo(() => {
    const points = FENCE_RUNS.flatMap(([[x0, z0], [x1, z1]]) => [new THREE.Vector3(x0, 0.06, z0), new THREE.Vector3(x1, 0.06, z1)]);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const object = new THREE.LineSegments(geometry, new THREE.LineDashedMaterial({ color: BLOCKED, dashSize: 0.5, gapSize: 0.3 }));
    object.computeLineDistances();
    return object;
  }, []);
  useEffect(() => () => { line.geometry.dispose(); (line.material as THREE.Material).dispose(); }, [line]);
  return state === "excluded" ? <primitive object={line} /> : null;
}

function Fence({ state, selected, onPick }: { state: AreaState; selected: boolean; onPick?: () => void }) {
  const layout = useMemo(() => fenceMatrices(), []);
  const picket = useMemo(() => new THREE.BoxGeometry(0.075, 1.22, 0.022), []);
  const post = useMemo(() => new THREE.BoxGeometry(0.1, 1.48, 0.1), []);
  useEffect(() => () => { picket.dispose(); post.dispose(); }, [picket, post]);
  const material = selected ? tinted(M.paint) : M.paint;
  return (
    <group {...pickHandlers(onPick)}>
      <Instanced geometry={picket} material={material} matrices={layout.pickets} />
      <Instanced geometry={post} material={material} matrices={layout.posts} />
      {layout.rails.map((rail, index) => <Block key={index} x={rail.x} y={[rail.y - 0.035, rail.y + 0.035]} z={rail.z} material={material} />)}
      <FenceBaseline state={state} />
    </group>
  );
}

function Gate({ selected, onPick }: { selected: boolean; onPick?: () => void }) {
  const frame = selected ? tinted(M.gateFrame) : M.gateFrame;
  const leaf = selected ? tinted(M.paint) : M.paint;
  const [x0, x1] = GATE.x;
  const z: [number, number] = [GATE.z - 0.03, GATE.z + 0.03];
  return (
    <group {...pickHandlers(onPick)}>
      {[x0, x1].map((x) => <Block key={x} x={[x - 0.07, x + 0.07]} y={[0, 1.55]} z={[GATE.z - 0.07, GATE.z + 0.07]} material={frame} />)}
      {[0.18, 1.18].map((y) => <Block key={y} x={[x0 + 0.1, x1 - 0.1]} y={[y, y + 0.07]} z={z} material={frame} />)}
      {Array.from({ length: 13 }, (_, index) => x0 + 0.22 + index * 0.19).map((x) => <Block key={x} x={[x - 0.04, x + 0.04]} y={[0.1, 1.32]} z={[GATE.z - 0.012, GATE.z + 0.012]} material={leaf} />)}
      <Block x={[x1 - 0.32, x1 - 0.22]} y={[0.86, 0.96]} z={[GATE.z + 0.03, GATE.z + 0.07]} material="trim" shadow={false} />
      {selected && <Block x={[x0, x1]} y={[0.02, 1.4]} z={[GATE.z - 0.15, GATE.z + 0.15]} material={GATE_GLOW} shadow={false} />}
    </group>
  );
}

function Tree({ x, z, radius }: { x: number; z: number; radius: number }) {
  const canopy = useMemo(() => new THREE.IcosahedronGeometry(radius, 1), [radius]);
  useEffect(() => () => canopy.dispose(), [canopy]);
  return (
    <group position={[x, 0, z]}>
      <mesh material={M.trunk} position={[0, 1.1, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.17, 2.2, 10]} />
      </mesh>
      <mesh geometry={canopy} material={M.canopy} position={[0, 2.1 + radius * 0.75, 0]} scale={[1, 0.88, 1]} castShadow receiveShadow />
    </group>
  );
}

function Street({ length = 200 }: { length?: number }) {
  return (
    <group>
      <Block x={[-length / 2, length / 2]} y={[-0.02, 0.012]} z={STREET_Z} material="asphalt" shadow={false} />
      <Block x={[-length / 2, DRIVEWAY.x[0]]} y={[0, 0.12]} z={[STREET_Z[0] - 0.2, STREET_Z[0]]} material="kerb" />
      <Block x={[DRIVEWAY.x[1], length / 2]} y={[0, 0.12]} z={[STREET_Z[0] - 0.2, STREET_Z[0]]} material="kerb" />
      <Block x={DRIVEWAY.x} y={[0, 0.04]} z={[STREET_Z[0] - 0.2, STREET_Z[0]]} material="kerb" shadow={false} />
      <Block x={[-length / 2, length / 2]} y={[0, 0.12]} z={[STREET_Z[1], STREET_Z[1] + 0.2]} material="kerb" />
      {Array.from({ length: Math.floor(length / 4) }, (_, index) => -length / 2 + 1 + index * 4).map((x) => <Block key={x} x={[x, x + 2]} y={[0.012, 0.016]} z={[14.94, 15.06]} material="marking" shadow={false} />)}
    </group>
  );
}

/* Neighbourhood for the next-visit plan: two nearby properties on side roads. */

const SIDE_ROADS = { birch: -22, cedar: 22 };
const BIRCH_HOUSE: Rect = { x: [-34, -27], z: [-24, -18] };
const CEDAR_HOUSE: Rect = { x: [27, 34], z: [-33, -27] };
const STOP_POINTS: Record<StopId, Point> = { birch: [-22, 0.08, -21], alder: [DRIVEWAY.x[0] + 3.25, 0.08, 15], cedar: [22, 0.08, -30] };
const ROUTE: Point[] = [[-22, 0.09, -21], [-22, 0.09, 15], [22, 0.09, 15], [22, 0.09, -30]];

function SimpleHouse({ x, z, selected, onPick }: { x: [number, number]; z: [number, number]; selected: boolean; onPick?: () => void }) {
  const depth = z[1] - z[0];
  const roof = useMemo(() => {
    const rise = 1.4;
    const half = depth / 2;
    const o = 0.3;
    const eave = 2.8 - o * (rise / half);
    const [x0, x1] = [x[0] - o, x[1] + o];
    const [z0, z1] = [z[0] - o, z[1] + o];
    const zc = (z0 + z1) / 2;
    const top = 2.8 + rise;
    return triangles([[x0, eave, z0], [x0, top, zc], [x1, top, zc], [x0, eave, z0], [x1, top, zc], [x1, eave, z0], [x0, eave, z1], [x1, eave, z1], [x1, top, zc], [x0, eave, z1], [x1, top, zc], [x0, top, zc]]);
  }, [x, z, depth]);
  const gables = useMemo(() => {
    const top = 2.8 + 1.4;
    const zc = (z[0] + z[1]) / 2;
    return triangles([[x[0], 2.8, z[0]], [x[0], 2.8, z[1]], [x[0], top, zc], [x[1], 2.8, z[1]], [x[1], 2.8, z[0]], [x[1], top, zc]]);
  }, [x, z]);
  return (
    <group {...pickHandlers(onPick)}>
      <Block x={x} y={[0, 2.8]} z={z} material="neighbour" selected={selected} />
      <Solid geometry={gables} material="neighbour" selected={selected} shadow={false} />
      <Solid geometry={roof} material="neighbourRoof" selected={selected} />
    </group>
  );
}

function RouteLine() {
  const line = useMemo(() => {
    const object = new THREE.Line(new THREE.BufferGeometry().setFromPoints(ROUTE.map((point) => new THREE.Vector3(...point))), new THREE.LineDashedMaterial({ color: OK, dashSize: 0.9, gapSize: 0.55 }));
    object.computeLineDistances();
    return object;
  }, []);
  useEffect(() => () => { line.geometry.dispose(); (line.material as THREE.Material).dispose(); }, [line]);
  return <primitive object={line} />;
}

function StopMarker({ at, selected, onPick }: { at: Point; selected: boolean; onPick?: () => void }) {
  return (
    <group position={at} {...pickHandlers(onPick)}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[0.75, 32]} />
        <meshBasicMaterial color={selected ? SELECT : INK} toneMapped={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}>
        <ringGeometry args={[0.75, 0.95, 32]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
    </group>
  );
}

function Neighbourhood({ stop, onPickStop }: { stop: StopId | null; onPickStop?: (stop: StopId) => void }) {
  const pick = (id: StopId) => (onPickStop ? () => onPickStop(id) : undefined);
  return (
    <group>
      {Object.values(SIDE_ROADS).map((x) => (
        <group key={x}>
          <Block x={[x - 2, x + 2]} y={[-0.02, 0.013]} z={[-46, STREET_Z[0]]} material="asphalt" shadow={false} />
          {[x - 2.2, x + 2].map((edge) => <Block key={edge} x={[edge, edge + 0.2]} y={[0, 0.12]} z={[-46, STREET_Z[0] - 0.2]} material="kerb" />)}
        </group>
      ))}
      <SimpleHouse x={BIRCH_HOUSE.x} z={BIRCH_HOUSE.z} selected={stop === "birch"} onPick={pick("birch")} />
      <Block x={[-27, -24.2]} y={[0, 0.05]} z={[-22.6, -19.4]} material="concrete" />
      <SimpleHouse x={CEDAR_HOUSE.x} z={CEDAR_HOUSE.z} selected={stop === "cedar"} onPick={pick("cedar")} />
      <Block x={[24.2, 27]} y={[0, 0.05]} z={[-31.6, -28.4]} material="concrete" />
      <Tree x={-36} z={-14} radius={1.6} />
      <Tree x={36} z={-23} radius={1.5} />
      <RouteLine />
      {(Object.keys(STOP_POINTS) as StopId[]).map((id) => <StopMarker key={id} at={STOP_POINTS[id]} selected={stop === id} onPick={pick(id)} />)}
    </group>
  );
}

/* Photo positions for the evidence review: a small camera on a pole, with
   lines to the corners of the area it photographs. */

const CAMERAS: Record<Pin["id"], { at: Point; target: [number, number][] }> = {
  driveway: { at: [-1.75, 1.55, 15.6], target: rectPoints(DRIVEWAY) },
  patio: { at: [4.8, 1.6, -4.5], target: [[-1, -8.7], [10, -8.7], [10, -4.6], [-1, -4.6]] },
};

function PhotoPin({ pin }: { pin: Pin }) {
  const { at, target } = CAMERAS[pin.id];
  const color = pin.state === "ok" ? OK : BLOCKED;
  const lines = useMemo(() => {
    const points = target.flatMap(([x, z]) => [new THREE.Vector3(at[0], at[1], at[2]), new THREE.Vector3(x, 0.09, z)]);
    const object = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points), pin.state === "ok" ? new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.7 }) : new THREE.LineDashedMaterial({ color, dashSize: 0.3, gapSize: 0.22 }));
    object.computeLineDistances();
    return object;
  }, [at, target, color, pin.state]);
  useEffect(() => () => { lines.geometry.dispose(); (lines.material as THREE.Material).dispose(); }, [lines]);
  const facing = Math.atan2(target[0][0] - at[0], target[0][1] - at[2]);
  return (
    <group>
      <Block x={[at[0] - 0.03, at[0] + 0.03]} y={[0, at[1] - 0.12]} z={[at[2] - 0.03, at[2] + 0.03]} material="trim" />
      <group position={at} rotation={[0, facing, 0]}>
        <mesh material={M.trim} castShadow><boxGeometry args={[0.46, 0.3, 0.24]} /></mesh>
        <mesh material={M.glass} position={[0, 0, 0.17]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.09, 0.09, 0.12, 18]} /></mesh>
      </group>
      <primitive object={lines} />
    </group>
  );
}

/* Labels: HTML chips positioned every rendered frame from 3D anchors. */

function LabelLayer({ labels, layer }: { labels: SceneLabel[]; layer: RefObject<HTMLDivElement | null> }) {
  return (
    <div ref={layer} className={styles.sceneLabels} aria-hidden="true">
      {labels.map((label) => (
        <div key={label.id} className={styles.sceneLabel} data-label={label.id} data-state={label.state} data-minor={label.minor || undefined} style={{ "--lift": `${label.lift ?? 30}px` } as CSSProperties}>
          <span className={styles.labelChip}><strong>{label.title}</strong>{label.detail && <span>{label.detail}</span>}</span>
          <i className={styles.labelLeader} />
        </div>
      ))}
    </div>
  );
}

const scratch = new THREE.Vector3();
const EDGE = 8;

function placeLabels(layer: HTMLDivElement | null, labels: SceneLabel[], camera: THREE.Camera, size: { width: number; height: number }) {
  if (!layer) return;
  for (const label of labels) {
    const element = layer.querySelector<HTMLElement>(`[data-label="${label.id}"]`);
    const chip = element?.firstElementChild as HTMLElement | null;
    if (!element || !chip) continue;
    scratch.set(...label.at).project(camera);
    const x = (scratch.x * 0.5 + 0.5) * size.width;
    const y = (-scratch.y * 0.5 + 0.5) * size.height;
    const visible = scratch.z < 1 && Math.abs(scratch.x) < 1.02 && Math.abs(scratch.y) < 1.02;
    const half = chip.offsetWidth / 2;
    const shift = x - half < EDGE ? EDGE - (x - half) : x + half > size.width - EDGE ? size.width - EDGE - (x + half) : 0;
    element.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -100%)`;
    chip.style.transform = `translateX(${shift.toFixed(1)}px)`;
    element.style.opacity = visible ? "1" : "0";
  }
}

/* Camera: eased moves between framed viewpoints. Narrow frames keep the
   property readable on a phone. */

type Frame = { position: Point; target: Point };
type View = Frame & { narrow?: Frame };
const VIEWS: Record<ViewId, View> = {
  wide: { position: [-17, 44, 25], target: [-0.5, 0, 0.6], narrow: { position: [-13, 84, 40], target: [-0.5, 0, 1] } },
  side: { position: [-25, 10.5, 17], target: [-7.5, 0.6, 0.6], narrow: { position: [-29, 15, 25], target: [-7.6, 0.6, 1.2] } },
  front: { position: [9, 10, 31], target: [-1.2, 0.6, 9.2], narrow: { position: [8, 14, 36], target: [-1.2, 0.6, 8] } },
  back: { position: [20, 13.5, -25], target: [4.2, 0.4, -5.6], narrow: { position: [22, 18, -31], target: [4.2, 0.4, -5] } },
  street: { position: [0, 92, 72], target: [0, 0, -8], narrow: { position: [0, 132, 92], target: [0, 0, -9] } },
  birch: { position: [-12, 22, 4], target: [-27, 0, -21], narrow: { position: [-10, 30, 12], target: [-27, 0, -21] } },
  alder: { position: [12, 26, 36], target: [0, 0, 2], narrow: { position: [8, 40, 50], target: [0, 0, 2] } },
  cedar: { position: [42, 22, -6], target: [27, 0, -27], narrow: { position: [44, 30, 2], target: [27, 0, -27] } },
};
const TRANSITION_MS = 900;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 4);

function fit(view: View, aspect: number) {
  const frame = aspect < 1.25 && view.narrow ? view.narrow : view;
  return { position: new THREE.Vector3(...frame.position), target: new THREE.Vector3(...frame.target) };
}

type Goal = ReturnType<typeof fit>;
type Tween = { from: Goal; to: Goal; start: number; current: Goal };

function Rig({ view, labels, layer }: { view: ViewId; labels: SceneLabel[]; layer: RefObject<HTMLDivElement | null> }) {
  const { camera, size, invalidate } = useThree();
  const tween = useRef<Tween | null>(null);
  const goal = useMemo(() => fit(VIEWS[view], size.width / size.height), [view, size.width, size.height]);
  useEffect(() => { invalidate(); }, [goal, labels, invalidate]);
  useFrame((state) => {
    const now = performance.now();
    if (!tween.current) tween.current = { from: goal, to: goal, start: now - TRANSITION_MS, current: { position: goal.position.clone(), target: goal.target.clone() } };
    const current = tween.current;
    if (current.to !== goal) {
      current.from = { position: current.current.position.clone(), target: current.current.target.clone() };
      current.to = goal;
      current.start = now;
    }
    const t = Math.min(1, (now - current.start) / TRANSITION_MS);
    const e = easeOut(t);
    current.current.position.lerpVectors(current.from.position, current.to.position, e);
    current.current.target.lerpVectors(current.from.target, current.to.target, e);
    camera.position.copy(current.current.position);
    camera.lookAt(current.current.target);
    camera.updateMatrixWorld();
    placeLabels(layer.current, labels, camera, size);
    if (t < 1) state.invalidate();
  });
  return null;
}

function Studio({ extent, center }: { extent: number; center: Point }) {
  const { gl } = useThree();
  const environment = useMemo(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const texture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    return texture;
  }, [gl]);
  useEffect(() => () => environment.dispose(), [environment]);
  const light = useMemo(() => {
    const directional = new THREE.DirectionalLight("#ffffff", 2);
    directional.position.set(center[0] - 14, 30, center[2] + 18);
    directional.target.position.set(...center);
    directional.castShadow = true;
    directional.shadow.mapSize.set(2048, 2048);
    directional.shadow.radius = 6;
    directional.shadow.bias = -0.0004;
    directional.shadow.normalBias = 0.03;
    Object.assign(directional.shadow.camera, { left: -extent, right: extent, top: extent, bottom: -extent, near: 1, far: 120 });
    directional.shadow.camera.updateProjectionMatrix();
    return directional;
  }, [extent, center]);
  return (
    <>
      <primitive object={environment} attach="environment" />
      <primitive object={light} />
      <primitive object={light.target} />
      <hemisphereLight args={["#ffffff", "#d9dad5", 0.35]} />
    </>
  );
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

const NEAR_CENTER: Point = [0, 0, 0];
const FAR_CENTER: Point = [0, 0, -4];

function Property({ states, selected, onPick }: Pick<SceneProps, "states" | "selected" | "onPick">) {
  const state = (area: Area) => states[area] ?? "plain";
  const isSelected = (area: Area) => selected.includes(area);
  const pick = (area: Area) => (onPick ? () => onPick(area) : undefined);
  return (
    <group>
      <Driveway state={state("driveway")} selected={isSelected("driveway")} onPick={pick("driveway")} />
      <Patio state={state("patio")} selected={isSelected("patio")} onPick={pick("patio")} />
      <SidePath state={state("path")} selected={isSelected("path")} onPick={pick("path")} />
      <House />
      <Fence state={state("fence")} selected={isSelected("fence")} onPick={pick("fence")} />
      <Gate selected={isSelected("gate")} onPick={pick("gate")} />
      <Tree x={15} z={-6.7} radius={1.8} />
      <Tree x={13} z={9.7} radius={1.4} />
    </group>
  );
}

export default function PropertyScene(props: SceneProps): ReactNode {
  const layer = useRef<HTMLDivElement>(null);
  const wide = props.neighbourhood;
  return (
    <>
      <Canvas
        frameloop={props.active ? "demand" : "never"}
        shadows="percentage"
        dpr={[1, 2]}
        camera={{ fov: 24, near: 0.5, far: 600, position: VIEWS.wide.position }}
        gl={{ antialias: true, alpha: true, powerPreference: "low-power", toneMapping: THREE.NeutralToneMapping, toneMappingExposure: 0.95 }}
        style={{ position: "absolute", inset: 0 }}
        aria-hidden="true"
      >
        <fog attach="fog" args={["#f5f5f2", wide ? 150 : 90, wide ? 320 : 200]} />
        <Studio extent={wide ? 52 : 24} center={wide ? FAR_CENTER : NEAR_CENTER} />
        <Rig view={props.view} labels={props.labels} layer={layer} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} material={M.lawn} receiveShadow>
          <planeGeometry args={[260, 260]} />
        </mesh>
        <Street />
        <Property states={props.states} selected={props.selected} onPick={props.onPick} />
        {props.pins?.map((pin) => <PhotoPin key={pin.id} pin={pin} />)}
        {wide && <Neighbourhood stop={props.stop ?? null} onPickStop={props.onPickStop} />}
        <Ready onReady={props.onReady} />
      </Canvas>
      <LabelLayer labels={props.labels} layer={layer} />
    </>
  );
}

