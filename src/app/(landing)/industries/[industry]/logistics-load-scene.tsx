"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type RefObject } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import styles from "./logistics.module.css";
import { shipments } from "./logistics-data";
import { CARGO, laneY, PALLET_BASE, ROWS, rowX, type FloorMark, type Point, type SceneItem, type SceneLayout, type SceneTone, type Track, type ViewId } from "./logistics-load-plan";

// World axes: x runs from the front bulkhead to the rear door (the plan's x),
// z across the body (the plan's y), y up. The truck is backed onto a dock at
// deck height, so pallets leave the door level and stay on the plan's paths.
const DECK = 1.25;
const L = CARGO.length;
const W = CARGO.width;
const H = CARGO.height;
const DOCK_END = L + 5.4;
const DOCK_SIDE = 1.6;
const TARGET = new THREE.Vector3(4.4, 1.7, 1.2);
const FIT_RADIUS = 5.7;
const FOV = 26;

const VIEWS: Record<ViewId, { azimuth: number; elevation: number; zoom: number }> = {
  angle: { azimuth: 34, elevation: 28, zoom: 1 },
  side: { azimuth: 0, elevation: 10, zoom: 0.95 },
  rear: { azimuth: 90, elevation: 26, zoom: 0.78 },
  top: { azimuth: 0, elevation: 88, zoom: 0.9 },
  overhead: { azimuth: 24, elevation: 46, zoom: 1.12 },
};

const INK = new THREE.Color("#17191a");
const SELECT = new THREE.Color("#fed603");
const BLOCKED = new THREE.Color("#f51625");
const PROPOSED = new THREE.Color("#007dfe");

export const loadTone: Record<string, string> = { "KV-2041": "#e6e4df", "KV-2042": "#c9b28c", "KV-2043": "#a3a6a9", "KV-2044": "#dcd6ca", "KV-2045": "#bfc3c6" };

export type SceneChip = { title: string; detail: string; tone: "ok" | "alert" };

type SceneProps = {
  items: SceneItem[];
  layout: SceneLayout;
  tones: Record<string, SceneTone>;
  anchor: string | null;
  marks: FloorMark[];
  view: ViewId | null;
  active: boolean;
  reducedMotion: boolean;
  chip: SceneChip | null;
  label: string;
  onSelect: (shipment: string) => void;
  onFreeView: () => void;
  onReady: () => void;
};

function useMaterials() {
  return useMemo(() => {
    const make = (color: string, roughness: number, metalness = 0, extra: THREE.MeshStandardMaterialParameters = {}) =>
      new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
    return {
      paint: make("#e4e5e3", 0.5, 0.05),
      interior: make("#f0f0ee", 0.82, 0, { map: panelTexture() }),
      floor: make("#c9c2b5", 0.88, 0, { map: plankTexture() }),
      trim: make("#4a4d51", 0.55, 0.25),
      frame: make("#33363a", 0.6, 0.35),
      rubber: make("#242527", 0.95),
      rim: make("#b8bbbe", 0.38, 0.6),
      glass: make("#2b3137", 0.18, 0.2),
      lamp: make("#d4d7d9", 0.3, 0.1),
      concrete: make("#d8d7d3", 0.95),
      joint: make("#bdbcb8", 0.95),
      steel: make("#a6a9ac", 0.45, 0.55, { polygonOffset: true, polygonOffsetFactor: -1 }),
    };
  }, []);
}
type Materials = ReturnType<typeof useMaterials>;

function canvasTexture(width: number, height: number, draw: (context: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (context) draw(context);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function plankTexture() {
  const texture = canvasTexture(512, 256, (context) => {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, 512, 256);
    context.strokeStyle = "rgba(60, 50, 40, 0.18)";
    context.lineWidth = 2;
    for (let y = 0; y <= 256; y += 32) { context.beginPath(); context.moveTo(0, y); context.lineTo(512, y); context.stroke(); }
  });
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function panelTexture() {
  const texture = canvasTexture(512, 256, (context) => {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, 512, 256);
    context.strokeStyle = "rgba(40, 42, 44, 0.16)";
    context.lineWidth = 3;
    for (let x = 0; x <= 512; x += 51) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, 256); context.stroke(); }
  });
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function wrapTexture(kind: string) {
  return canvasTexture(256, 256, (context) => {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, 256, 256);
    if (kind === "KV-2042") {
      // Cartons under wrap: a carton grid with tape lines.
      context.strokeStyle = "rgba(80, 60, 30, 0.28)";
      context.lineWidth = 3;
      for (let v = 0; v <= 256; v += 85) { context.beginPath(); context.moveTo(v, 0); context.lineTo(v, 256); context.stroke(); context.beginPath(); context.moveTo(0, v); context.lineTo(256, v); context.stroke(); }
    }
    // Stretch wrap: faint horizontal bands.
    for (let y = 0; y < 256; y += 18) {
      context.fillStyle = `rgba(255, 255, 255, ${y % 36 === 0 ? 0.22 : 0.1})`;
      context.fillRect(0, y, 256, 7);
    }
  });
}

function labelTexture(shipment: string, stop: string) {
  return canvasTexture(320, 200, (context) => {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, 320, 200);
    context.fillStyle = "#17191a";
    context.font = "600 112px system-ui, sans-serif";
    context.textBaseline = "middle";
    context.fillText(stop, 22, 92);
    context.font = "600 34px system-ui, sans-serif";
    context.fillText(shipment, 120, 70);
    context.font = "400 28px system-ui, sans-serif";
    context.fillText(stop === "–" ? "Unassigned" : `Stop ${stop}`, 120, 118);
    context.fillRect(22, 168, 276, 6);
  });
}

let shadowBlob: THREE.CanvasTexture | null = null;
function contactShadow() {
  if (shadowBlob) return shadowBlob;
  shadowBlob = canvasTexture(256, 256, (context) => {
    const gradient = context.createRadialGradient(128, 128, 10, 128, 128, 128);
    gradient.addColorStop(0, "rgba(0,0,0,0.5)");
    gradient.addColorStop(0.55, "rgba(0,0,0,0.18)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 256, 256);
  });
  shadowBlob.colorSpace = THREE.NoColorSpace;
  return shadowBlob;
}

function ContactShadow({ x, z, length, width, opacity = 0.5 }: { x: number; z: number; length: number; width: number; opacity?: number }) {
  return (
    <mesh position={[x, 0.004, z]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-1}>
      <planeGeometry args={[length, width]} />
      <meshBasicMaterial map={contactShadow()} transparent depthWrite={false} opacity={opacity} />
    </mesh>
  );
}

// A box from min to max corner, so geometry can be laid out in metres.
function Block({ min, max, material, cast = true, receive = true }: { min: [number, number, number]; max: [number, number, number]; material: THREE.Material; cast?: boolean; receive?: boolean }) {
  const size: [number, number, number] = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
  return (
    <mesh position={[(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2]} material={material} castShadow={cast} receiveShadow={receive}>
      <boxGeometry args={size} />
    </mesh>
  );
}

function useWheelGeometry() {
  return useMemo(() => {
    const profile = [[0.3, -0.14], [0.45, -0.14], [0.5, -0.1], [0.5, 0.1], [0.45, 0.14], [0.3, 0.14]].map(([r, y]) => new THREE.Vector2(r, y));
    const tyre = new THREE.LatheGeometry(profile, 48);
    tyre.rotateX(Math.PI / 2);
    const rim = new THREE.CylinderGeometry(0.3, 0.3, 0.24, 40);
    rim.rotateX(Math.PI / 2);
    const hub = new THREE.CylinderGeometry(0.11, 0.11, 0.27, 24);
    hub.rotateX(Math.PI / 2);
    const nut = new THREE.CylinderGeometry(0.022, 0.022, 0.03, 10);
    nut.rotateX(Math.PI / 2);
    return { tyre, rim, hub, nut };
  }, []);
}

function Wheel({ x, z, outward, materials, geometry }: { x: number; z: number; outward: 1 | -1 | 0; materials: Materials; geometry: ReturnType<typeof useWheelGeometry> }) {
  return (
    <group position={[x, 0.5, z]}>
      <mesh geometry={geometry.tyre} material={materials.rubber} castShadow receiveShadow />
      <mesh geometry={geometry.rim} material={materials.rim} castShadow />
      <mesh geometry={geometry.hub} material={materials.trim} />
      {outward !== 0 && Array.from({ length: 8 }, (_, index) => {
        const angle = (index / 8) * Math.PI * 2;
        return <mesh key={index} geometry={geometry.nut} material={materials.frame} position={[Math.cos(angle) * 0.18, Math.sin(angle) * 0.18, outward * 0.125]} />;
      })}
    </group>
  );
}

function Truck({ materials }: { materials: Materials }) {
  const wheel = useWheelGeometry();
  const cab = useMemo(() => new RoundedBoxGeometry(2.1, 2.07, W + 0.08, 4, 0.12), []);
  const railZ = [0.82, W - 0.82];
  const floorBottom = DECK - 0.12;
  return (
    <group>
      {/* Body: floor, bulkhead, far wall, roof rails, corner posts and rear frame. The near wall and roof are cut away. */}
      <Block min={[-0.06, floorBottom, -0.04]} max={[L + 0.06, DECK - 0.006, W + 0.04]} material={materials.trim} />
      <mesh position={[L / 2, DECK - 0.003, W / 2]} material={materials.floor} receiveShadow>
        <boxGeometry args={[L, 0.006, W]} />
      </mesh>
      <Block min={[-0.06, DECK, -0.04]} max={[0, DECK + H, W + 0.04]} material={materials.interior} />
      <Block min={[0, DECK, -0.04]} max={[L, DECK + H, 0]} material={materials.interior} />
      <Block min={[-0.06, DECK + H, -0.06]} max={[L - 0.02, DECK + H + 0.08, 0.02]} material={materials.paint} />
      <Block min={[-0.06, DECK + H, W - 0.02]} max={[L - 0.02, DECK + H + 0.08, W + 0.06]} material={materials.paint} />
      <Block min={[0, DECK, W - 0.02]} max={[L, DECK + 0.1, W + 0.04]} material={materials.paint} />
      {[[-0.07, -0.04], [W + 0.04, W + 0.07]].map(([z0, z1]) => <Block key={`front-${z0}`} min={[-0.06, DECK, z0]} max={[0.06, DECK + H, z1]} material={materials.paint} />)}
      {[-0.06, W].map((z) => <Block key={`rear-${z}`} min={[L, floorBottom, z]} max={[L + 0.06, DECK + H, z + 0.06]} material={materials.paint} />)}
      <Block min={[L - 0.02, DECK + H, -0.06]} max={[L + 0.06, DECK + H + 0.12, W + 0.06]} material={materials.paint} />
      {/* The far rear door, folded flat against the body side, with locking bars. The near one is cut away with the near wall. */}
      {[[-0.11, -0.065]].map(([z0, z1], side) => (
        <group key={`door-${side}`}>
          <Block min={[L + 0.06 - 1.225, DECK + 0.02, z0]} max={[L + 0.06, DECK + H - 0.02, z1]} material={materials.paint} />
          {[0.35, 0.85].map((offset) => (
            <Block key={offset} min={[L + 0.06 - offset - 0.03, DECK + 0.12, side === 0 ? z0 - 0.025 : z1]} max={[L + 0.06 - offset, DECK + H - 0.12, side === 0 ? z0 : z1 + 0.025]} material={materials.trim} />
          ))}
        </group>
      ))}
      {/* Chassis, axles, springs and guards. */}
      {railZ.map((z) => <Block key={`rail-${z}`} min={[-2.12, 0.85, z - 0.05]} max={[L - 0.4, floorBottom, z + 0.05]} material={materials.frame} />)}
      {[-1.45, 4.3].map((x) => (
        <group key={`axle-${x}`}>
          <mesh position={[x, 0.5, W / 2]} rotation={[Math.PI / 2, 0, 0]} material={materials.frame} castShadow>
            <cylinderGeometry args={[0.07, 0.07, W - 0.3, 16]} />
          </mesh>
          {railZ.map((z) => <Block key={z} min={[x - 0.45, 0.57, z - 0.04]} max={[x + 0.45, 0.85, z + 0.04]} material={materials.frame} />)}
        </group>
      ))}
      {[0.16, W - 0.16].map((z) => <Wheel key={`front-${z}`} x={-1.45} z={z} outward={z > W / 2 ? 1 : -1} materials={materials} geometry={wheel} />)}
      {[0.16, W - 0.16].map((z) => <Wheel key={`rear-${z}`} x={4.3} z={z} outward={z > W / 2 ? 1 : -1} materials={materials} geometry={wheel} />)}
      {[0.46, W - 0.46].map((z) => <Wheel key={`inner-${z}`} x={4.3} z={z} outward={0} materials={materials} geometry={wheel} />)}
      {[{ guard: [0, 0.62], bracket: [0.62, railZ[0] - 0.05] }, { guard: [W - 0.62, W], bracket: [railZ[1] + 0.05, W - 0.62] }].map(({ guard, bracket }) => (
        <group key={`guard-${guard[0]}`}>
          <Block min={[3.6, 1.03, guard[0]]} max={[5.0, 1.07, guard[1]]} material={materials.trim} />
          <Block min={[4.25, 1.03, bracket[0]]} max={[4.35, 1.07, bracket[1]]} material={materials.trim} />
        </group>
      ))}
      {[[-0.03, 0], [W, W + 0.03]].map(([z0, z1]) => (
        <group key={`side-guard-${z0}`}>
          {[0.55, 0.85].map((y) => <Block key={y} min={[0.3, y, z0]} max={[3.5, y + 0.05, z1]} material={materials.paint} />)}
          {[0.5, 3.3].map((x) => <Block key={x} min={[x, 0.55, z0]} max={[x + 0.06, floorBottom, z1]} material={materials.trim} />)}
        </group>
      ))}
      <Block min={[L - 0.12, 0.45, 0.05]} max={[L, 0.6, W - 0.05]} material={materials.trim} />
      {railZ.map((z) => <Block key={`bracket-${z}`} min={[L - 0.4, 0.6, z - 0.04]} max={[L - 0.12, 0.85, z + 0.04]} material={materials.frame} />)}
      {/* Cab. */}
      <mesh geometry={cab} position={[-1.2, 1.13 + 1.035, W / 2]} material={materials.paint} castShadow receiveShadow />
      <Block min={[-2.262, 2.32, 0.16]} max={[-2.246, 3.0, W - 0.16]} material={materials.glass} cast={false} />
      {[-0.046, W + 0.03].map((z) => <Block key={`window-${z}`} min={[-2.02, 2.36, z]} max={[-1.24, 2.98, z + 0.016]} material={materials.glass} cast={false} />)}
      {[-0.044, W + 0.034].map((z) => <Block key={`seam-${z}`} min={[-0.98, 1.3, z]} max={[-0.965, 3.0, z + 0.01]} material={materials.trim} cast={false} />)}
      <Block min={[-2.262, 1.42, 0.5]} max={[-2.246, 1.95, W - 0.5]} material={materials.trim} cast={false} />
      {[1.55, 1.7, 1.85].map((y) => <Block key={`slat-${y}`} min={[-2.268, y, 0.55]} max={[-2.262, y + 0.03, W - 0.55]} material={materials.lamp} cast={false} />)}
      {[[0.18, 0.48], [W - 0.48, W - 0.18]].map(([z0, z1]) => <Block key={`lamp-${z0}`} min={[-2.262, 1.24, z0]} max={[-2.246, 1.38, z1]} material={materials.lamp} cast={false} />)}
      <Block min={[-2.36, 0.6, 0.02]} max={[-2.12, 0.95, W - 0.02]} material={materials.trim} />
      {[[-0.02, 0.25], [W - 0.25, W + 0.02]].map(([z0, z1]) => <Block key={`step-${z0}`} min={[-0.9, 0.62, z0]} max={[-0.35, 1.13, z1]} material={materials.trim} />)}
      {[{ arm: [-0.3, -0.04], housing: [-0.38, -0.3] }, { arm: [W + 0.04, W + 0.3], housing: [W + 0.3, W + 0.38] }].map(({ arm, housing }) => (
        <group key={`mirror-${arm[0]}`}>
          <Block min={[-2.08, 2.72, arm[0]]} max={[-2.02, 2.76, arm[1]]} material={materials.trim} />
          <Block min={[-2.12, 2.5, housing[0]]} max={[-2.0, 2.95, housing[1]]} material={materials.trim} />
        </group>
      ))}
    </group>
  );
}

function Dock({ materials }: { materials: Materials }) {
  const slots = useMemo(() => {
    const points: number[] = [];
    for (let row = 0; row < ROWS; row++) {
      for (const lane of [0, 1] as const) {
        const x0 = rowX(row);
        const z0 = laneY[lane];
        const corners = [[x0, z0], [x0 + 1.2, z0], [x0 + 1.2, z0 + 1], [x0, z0 + 1]];
        corners.forEach(([x, z], index) => {
          const [nx, nz] = corners[(index + 1) % 4];
          points.push(x, DECK + 0.002, z, nx, DECK + 0.002, nz);
        });
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
    return geometry;
  }, []);
  return (
    <group>
      <Block min={[L + 0.12, 0, -DOCK_SIDE]} max={[DOCK_END, DECK, W + DOCK_SIDE]} material={materials.concrete} />
      <Block min={[L + 0.12, DECK - 0.07, -DOCK_SIDE]} max={[L + 0.2, DECK, W + DOCK_SIDE]} material={materials.steel} cast={false} />
      <Block min={[L, DECK - 0.012, 0.05]} max={[L + 0.6, DECK, W - 0.05]} material={materials.steel} cast={false} />
      {[L + 2.2, L + 4.0].map((x) => <Block key={`joint-${x}`} min={[x, DECK - 0.004, -DOCK_SIDE]} max={[x + 0.02, DECK + 0.001, W + DOCK_SIDE]} material={materials.joint} cast={false} receive={false} />)}
      {[[-0.45, -0.12], [W + 0.12, W + 0.45]].map(([z0, z1]) => <Block key={z0} min={[L + 0.07, DECK - 0.48, z0]} max={[L + 0.12, DECK - 0.12, z1]} material={materials.rubber} />)}
      <lineSegments geometry={slots}>
        <lineBasicMaterial color="#17191a" transparent opacity={0.22} />
      </lineSegments>
    </group>
  );
}

type PalletHandle = { group: THREE.Group; load: THREE.MeshStandardMaterial; base: THREE.MeshStandardMaterial; label: THREE.MeshBasicMaterial; edges: THREE.LineSegments; tone: THREE.Color; height: number };
type Orbit = { azimuth: number; elevation: number; zoom: number };

// Imperative scene state lives outside React so animation frames can move
// pallets and the camera without re-rendering the tree.
class SceneStore {
  handles = new Map<string, PalletHandle>();
  anchor: string | null = null;
  goal: Orbit = { ...VIEWS.angle };
  dragged = false;
  active = true;
  invalidate: () => void = () => undefined;
  register(key: string, handle: PalletHandle | null) {
    if (handle) this.handles.set(key, handle);
    else this.handles.delete(key);
  }
  setAnchor(key: string | null) { this.anchor = key; this.invalidate(); }
  setGoal(orbit: Orbit) { this.goal = orbit; this.invalidate(); }
  setDragged(value: boolean) { this.dragged = value; }
  setInvalidate(invalidate: () => void) { this.invalidate = invalidate; }
  setActive(active: boolean) { this.active = active; if (active) this.invalidate(); }
}

function placePallet(handle: PalletHandle, point: Point, visible: boolean) {
  handle.group.position.set(point.x, DECK, point.y);
  handle.group.visible = visible;
}

function setPalletOpacity(handle: PalletHandle, opacity: number) {
  const fading = opacity < 1;
  for (const material of [handle.load, handle.base, handle.label]) {
    material.transparent = fading;
    material.opacity = opacity;
    material.depthWrite = !fading;
  }
}

function paintPallet(handle: PalletHandle, state: "selected" | "blocking" | "none") {
  handle.load.color.copy(handle.tone);
  if (state === "selected") handle.load.color.lerp(SELECT, 0.62);
  if (state === "blocking") handle.load.color.lerp(BLOCKED, 0.16);
  handle.edges.visible = state !== "none";
  (handle.edges.material as THREE.LineBasicMaterial).color.copy(state === "selected" ? INK : BLOCKED);
}

function usePalletGeometry() {
  return useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    const add = (size: [number, number, number], center: [number, number, number]) => {
      const box = new THREE.BoxGeometry(...size);
      box.translate(...center);
      parts.push(box);
    };
    [0.05, 0.5, 0.95].forEach((z) => add([1.2, 0.022, 0.1], [0.6, 0.011, z]));
    [0.0725, 0.6, 1.1275].forEach((x) => [0.05, 0.5, 0.95].forEach((z) => add([0.145, 0.078, 0.1], [x, 0.061, z])));
    [0.0725, 0.6, 1.1275].forEach((x) => add([0.145, 0.022, 1], [x, 0.111, 0.5]));
    [0.05, 0.275, 0.5, 0.725, 0.95].forEach((z) => add([1.2, 0.022, 0.1], [0.6, 0.133, z]));
    return mergeGeometries(parts);
  }, []);
}

function Pallet({ item, base, store, onPick }: { item: SceneItem; base: THREE.BufferGeometry; store: SceneStore; onPick: (event: ThreeEvent<MouseEvent>) => void }) {
  const shipment = shipments[item.shipment];
  const height = shipment.pallet.height - PALLET_BASE - 0.004;
  const group = useRef<THREE.Group>(null);
  const edges = useRef<THREE.LineSegments>(null);
  const resources = useMemo(() => {
    const tone = new THREE.Color(loadTone[item.shipment]);
    return {
      tone,
      geometry: new RoundedBoxGeometry(1.18, height, 0.98, 3, 0.028),
      edgeGeometry: new THREE.EdgesGeometry(new THREE.BoxGeometry(1.185, height + 0.004, 0.985)),
      load: new THREE.MeshStandardMaterial({ color: tone.clone(), roughness: item.shipment === "KV-2042" ? 0.8 : 0.48, metalness: 0, map: wrapTexture(item.shipment) }),
      base: new THREE.MeshStandardMaterial({ color: "#cdbd9c", roughness: 0.85 }),
      label: new THREE.MeshBasicMaterial({ map: labelTexture(item.shipment, item.label), toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2 }),
    };
  }, [item.shipment, item.label, height]);
  useLayoutEffect(() => {
    if (!group.current || !edges.current) return;
    store.register(item.key, { group: group.current, load: resources.load, base: resources.base, label: resources.label, edges: edges.current, tone: resources.tone, height: PALLET_BASE + height });
    return () => store.register(item.key, null);
  }, [item.key, store, resources, height]);
  const centerY = PALLET_BASE + 0.002 + height / 2;
  return (
    <group ref={group} onClick={onPick}>
      <mesh geometry={base} material={resources.base} castShadow receiveShadow />
      <mesh geometry={resources.geometry} material={resources.load} position={[0.6, centerY, 0.5]} castShadow receiveShadow />
      <lineSegments ref={edges} geometry={resources.edgeGeometry} position={[0.6, centerY, 0.5]} visible={false}>
        <lineBasicMaterial color={INK} />
      </lineSegments>
      <mesh material={resources.label} position={[1.192, centerY + height * 0.18, 0.5]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[0.34, 0.21]} />
      </mesh>
      <mesh material={resources.label} position={[0.6, PALLET_BASE + 0.003 + height, 0.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.42, 0.26]} />
      </mesh>
    </group>
  );
}

const ease = (k: number) => k * k * (3 - 2 * k);

function sampleTrack(track: Track, time: number): Point {
  const frames = track.frames;
  if (time <= frames[0].at) return frames[0].point;
  for (let index = 1; index < frames.length; index++) {
    const from = frames[index - 1];
    const to = frames[index];
    if (time <= to.at) {
      const span = to.at - from.at;
      const k = span > 0 ? ease((time - from.at) / span) : 1;
      return { x: from.point.x + (to.point.x - from.point.x) * k, y: from.point.y + (to.point.y - from.point.y) * k };
    }
  }
  return frames[frames.length - 1].point;
}

type Motion = { kind: "unload"; start: number; tracks: Track[]; total: number } | { kind: "fade"; start: number; total: number };

function Cargo({ items, layout, tones, anchor, reducedMotion, onPick, store }: {
  items: SceneItem[];
  layout: SceneLayout;
  tones: Record<string, SceneTone>;
  anchor: string | null;
  reducedMotion: boolean;
  onPick: (shipment: string) => void;
  store: SceneStore;
}) {
  const base = usePalletGeometry();
  const { invalidate } = useThree();
  const motion = useRef<Motion | null>(null);
  const previous = useRef(layout.key);
  const rest = layout.placements;

  useLayoutEffect(() => {
    const before = previous.current;
    if (before === layout.key && motion.current) return;
    previous.current = layout.key;
    motion.current = null;
    store.handles.forEach((handle, key) => { placePallet(handle, rest[key], !rest[key].gone); setPalletOpacity(handle, 1); });
    if (!reducedMotion && before !== layout.key) {
      const transition = layout.transition;
      if (transition && transition.fromKey === before) {
        transition.tracks.forEach((track) => {
          const handle = store.handles.get(track.key);
          if (handle) placePallet(handle, track.frames[0].point, true);
        });
        motion.current = { kind: "unload", start: performance.now(), tracks: transition.tracks, total: transition.total };
      } else {
        motion.current = { kind: "fade", start: performance.now(), total: 360 };
      }
    }
    invalidate();
  }, [layout, rest, reducedMotion, invalidate, store]);

  useLayoutEffect(() => {
    store.setAnchor(anchor && !rest[anchor]?.gone ? anchor : null);
    store.handles.forEach((handle, key) => paintPallet(handle, rest[key]?.gone ? "none" : tones[key] ?? "none"));
    invalidate();
  }, [rest, tones, anchor, store, invalidate]);

  useFrame((state) => {
    const current = motion.current;
    if (!current) return;
    const elapsed = performance.now() - current.start;
    if (current.kind === "fade") {
      const k = Math.min(1, elapsed / current.total);
      store.handles.forEach((handle, key) => { if (!rest[key].gone) setPalletOpacity(handle, 0.15 + 0.85 * ease(k)); });
    } else {
      current.tracks.forEach((track) => {
        const handle = store.handles.get(track.key);
        if (!handle) return;
        const visible = !track.fade || elapsed < track.fade.to;
        placePallet(handle, sampleTrack(track, elapsed), visible);
        if (track.fade) setPalletOpacity(handle, elapsed <= track.fade.from ? 1 : Math.max(0, 1 - (elapsed - track.fade.from) / (track.fade.to - track.fade.from)));
      });
    }
    if (elapsed >= current.total) {
      motion.current = null;
      store.handles.forEach((handle, key) => { placePallet(handle, rest[key], !rest[key].gone); setPalletOpacity(handle, 1); });
    }
    if (store.active) state.invalidate();
  });

  return (
    <group>
      {items.map((item) => (
        <Pallet key={item.key} item={item} base={base} store={store} onPick={(event) => { event.stopPropagation(); onPick(item.shipment); }} />
      ))}
    </group>
  );
}

function FloorMarks({ marks }: { marks: FloorMark[] }) {
  return (
    <group>
      {marks.map((mark) => (
        <mesh key={`${mark.x}-${mark.y}`} position={[mark.x + mark.length / 2, DECK + 0.004, mark.y + mark.width / 2]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[mark.length, mark.width]} />
          <meshBasicMaterial color={mark.tone === "ok" ? PROPOSED : BLOCKED} transparent opacity={0.38} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function studioEnvironment(renderer: THREE.WebGLRenderer) {
  const generator = new THREE.PMREMGenerator(renderer);
  const texture = generator.fromScene(new RoomEnvironment(), 0.04).texture;
  generator.dispose();
  return texture;
}

function applyEnvironment(scene: THREE.Scene, environment: THREE.Texture | null, intensity: number) {
  scene.environment = environment;
  scene.environmentIntensity = intensity;
}

function Studio() {
  const { gl, scene, invalidate } = useThree();
  useEffect(() => {
    const environment = studioEnvironment(gl);
    applyEnvironment(scene, environment, 0.62);
    invalidate();
    return () => { applyEnvironment(scene, null, 1); environment.dispose(); };
  }, [gl, scene, invalidate]);
  return null;
}

function KeyLight() {
  const light = useRef<THREE.DirectionalLight>(null);
  const { scene } = useThree();
  useLayoutEffect(() => {
    const current = light.current;
    if (!current) return;
    current.target.position.copy(TARGET);
    scene.add(current.target);
    const camera = current.shadow.camera;
    camera.left = -11; camera.right = 11; camera.top = 11; camera.bottom = -11; camera.near = 1; camera.far = 50;
    camera.updateProjectionMatrix();
    return () => { scene.remove(current.target); };
  }, [scene]);
  return (
    <directionalLight
      ref={light}
      position={[TARGET.x + 5, 26, TARGET.z + 7]}
      intensity={1.4}
      castShadow
      shadow-mapSize={[2048, 2048]}
      shadow-radius={9}
      shadow-bias={-0.0004}
      shadow-normalBias={0.02}
    />
  );
}

function CameraRig({ store, view, reducedMotion }: { store: SceneStore; view: ViewId | null; reducedMotion: boolean }) {
  const { camera, size } = useThree();
  const current = useRef<Orbit | null>(null);
  useEffect(() => { if (view) store.setGoal({ ...VIEWS[view] }); }, [view, store]);
  useFrame((state, delta) => {
    const target = store.goal;
    if (!current.current || reducedMotion) current.current = { ...target };
    else {
      const k = 1 - Math.exp(-delta * 7);
      current.current.azimuth += (target.azimuth - current.current.azimuth) * k;
      current.current.elevation += (target.elevation - current.current.elevation) * k;
      current.current.zoom += (target.zoom - current.current.zoom) * k;
    }
    const perspective = camera as THREE.PerspectiveCamera;
    const vertical = THREE.MathUtils.degToRad(perspective.fov);
    const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * (size.width / size.height));
    // Portrait frames fit the whole truck, cab included, rather than the cargo alone.
    const radius = FIT_RADIUS * (size.width / size.height < 1.2 ? 1.22 : 1);
    const distance = (radius * current.current.zoom) / Math.sin(Math.min(vertical, horizontal) / 2);
    const azimuth = THREE.MathUtils.degToRad(current.current.azimuth);
    const elevation = THREE.MathUtils.degToRad(current.current.elevation);
    camera.position.set(
      TARGET.x + distance * Math.cos(elevation) * Math.sin(azimuth),
      TARGET.y + distance * Math.sin(elevation),
      TARGET.z + distance * Math.cos(elevation) * Math.cos(azimuth),
    );
    camera.lookAt(TARGET);
    if (store.active && (Math.abs(target.azimuth - current.current.azimuth) > 0.05 || Math.abs(target.elevation - current.current.elevation) > 0.05 || Math.abs(target.zoom - current.current.zoom) > 0.002)) state.invalidate();
  });
  return null;
}

type Overlay = { chip: HTMLDivElement | null; dot: HTMLSpanElement | null; line: SVGLineElement | null };

function hideOverlay(overlay: Overlay) {
  overlay.chip?.style.setProperty("opacity", "0");
  overlay.dot?.style.setProperty("opacity", "0");
  overlay.line?.style.setProperty("opacity", "0");
}

function placeOverlay(overlay: Overlay, x: number, y: number, bounds: { width: number; height: number }) {
  const { chip, dot, line } = overlay;
  if (!chip || !dot || !line) return;
  const width = chip.offsetWidth;
  const height = chip.offsetHeight;
  const left = Math.min(Math.max(x - width * 0.35, 12), bounds.width - width - 12);
  const top = Math.max(y - height - 56, 12);
  chip.style.setProperty("transform", `translate(${left.toFixed(1)}px, ${top.toFixed(1)}px)`);
  dot.style.setProperty("transform", `translate(${(x - 3.5).toFixed(1)}px, ${(y - 3.5).toFixed(1)}px)`);
  line.setAttribute("x1", x.toFixed(1));
  line.setAttribute("y1", y.toFixed(1));
  line.setAttribute("x2", Math.min(Math.max(x, left + 12), left + width - 12).toFixed(1));
  line.setAttribute("y2", (top + height).toFixed(1));
  for (const element of [chip, dot, line]) element.style.setProperty("opacity", "1");
}

// Projects the selected shipment's door-most pallet to the overlay, so the
// HTML chip and its leader line follow the geometry through every move.
function ChipProjector({ store, overlay }: { store: SceneStore; overlay: RefObject<Overlay> }) {
  const { camera, size } = useThree();
  const point = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const handle = store.anchor ? store.handles.get(store.anchor) : undefined;
    if (!overlay.current.chip || !handle || !handle.group.visible) { hideOverlay(overlay.current); return; }
    const position = handle.group.position;
    camera.updateMatrixWorld();
    point.set(position.x + 0.6, position.y + handle.height, position.z + 0.5).project(camera);
    placeOverlay(overlay.current, (point.x * 0.5 + 0.5) * size.width, (-point.y * 0.5 + 0.5) * size.height, size);
  });
  return null;
}

// Rendering is on demand. Off-screen, animations stop requesting frames;
// on return the scene draws once and picks up where the timeline is.
function ResumeWhenActive({ active, store }: { active: boolean; store: SceneStore }) {
  useEffect(() => { store.setActive(active); }, [active, store]);
  return null;
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

export default function LoadScene({ items, layout, tones, anchor, marks, view, active, reducedMotion, chip, label, onSelect, onFreeView, onReady }: SceneProps) {
  const materials = useMaterials();
  const [store] = useState(() => new SceneStore());
  const drag = useRef<{ x: number; y: number; orbit: Orbit; moved: boolean } | null>(null);
  const overlay = useRef<Overlay>({ chip: null, dot: null, line: null });

  const clampOrbit = (orbit: Orbit): Orbit => ({ ...orbit, azimuth: THREE.MathUtils.clamp(orbit.azimuth, -30, 120), elevation: THREE.MathUtils.clamp(orbit.elevation, 6, 88) });

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    store.setDragged(false);
    drag.current = { x: event.clientX, y: event.clientY, orbit: { ...store.goal }, moved: false };
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = drag.current;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (!start.moved && Math.hypot(dx, dy) < 5) return;
    if (!start.moved) { start.moved = true; store.setDragged(true); event.currentTarget.setPointerCapture(event.pointerId); onFreeView(); }
    store.setGoal(clampOrbit({ ...start.orbit, azimuth: start.orbit.azimuth + dx * 0.3, elevation: event.pointerType === "touch" ? start.orbit.elevation : start.orbit.elevation + dy * 0.25 }));
  };
  const onPointerEnd = () => { drag.current = null; };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const turns: Record<string, [number, number]> = { ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, 6], ArrowDown: [0, -6] };
    const turn = turns[event.key];
    if (!turn) return;
    event.preventDefault();
    store.setGoal(clampOrbit({ ...store.goal, azimuth: store.goal.azimuth + turn[0], elevation: store.goal.elevation + turn[1] }));
    onFreeView();
  };

  return (
    <div
      className={styles.sceneLive}
      role="group"
      aria-roledescription="3D cargo view"
      aria-label={label}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onKeyDown={onKeyDown}
    >
      <Canvas
        frameloop="demand"
        dpr={[1, 2]}
        shadows="percentage"
        camera={{ fov: FOV, near: 0.5, far: 200, position: [20, 12, 24] }}
        gl={{ antialias: true, toneMapping: THREE.NeutralToneMapping, toneMappingExposure: 1 }}
        onCreated={(state) => store.setInvalidate(() => state.invalidate())}
      >
        <Studio />
        <hemisphereLight args={["#ffffff", "#d8d7d3", 0.35]} />
        <KeyLight />
        <CameraRig store={store} view={view} reducedMotion={reducedMotion} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[TARGET.x, -0.002, TARGET.z]} renderOrder={-2}>
          <planeGeometry args={[120, 120]} />
          <meshBasicMaterial color="#f3f3f1" toneMapped={false} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[TARGET.x, 0.002, TARGET.z]} receiveShadow>
          <planeGeometry args={[120, 120]} />
          <shadowMaterial transparent opacity={0.12} depthWrite={false} />
        </mesh>
        <ContactShadow x={2} z={W / 2} length={9.6} width={3.6} opacity={0.45} />
        <ContactShadow x={(L + DOCK_END) / 2} z={W / 2} length={DOCK_END - L + 1} width={W + DOCK_SIDE * 2 + 1.2} opacity={0.3} />
        <Truck materials={materials} />
        <Dock materials={materials} />
        <FloorMarks marks={marks} />
        <Cargo items={items} layout={layout} tones={tones} anchor={anchor} reducedMotion={reducedMotion} store={store} onPick={(shipment) => { if (!store.dragged) onSelect(shipment); }} />
        <ChipProjector store={store} overlay={overlay} />
        <Ready onReady={onReady} />
        <ResumeWhenActive active={active} store={store} />
      </Canvas>
      <svg className={styles.leader} aria-hidden="true"><line ref={(element) => { overlay.current.line = element; }} /></svg>
      <span ref={(element) => { overlay.current.dot = element; }} className={styles.leaderDot} aria-hidden="true" />
      {chip && (
        <div ref={(element) => { overlay.current.chip = element; }} className={styles.sceneChip} aria-hidden="true">
          <strong>{chip.title}</strong>
          <span data-tone={chip.tone}>{chip.detail}</span>
        </div>
      )}
    </div>
  );
}
