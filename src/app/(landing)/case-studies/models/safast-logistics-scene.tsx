"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { SceneRuntime } from "./model-frame";
import {
  bx, ContactShadow, cylinder, EDGE_INK, EDGE_SOFT, edgesOf, GHOST, Ground, ModelCanvas, OK, physical, pickHandlers, standard, tinted, useContinuous,
  type Point, type SceneLabel, type View,
} from "./scene-kit";
import {
  BAY_LINES, BAY_Z, BENCHES, CARRIER, CHIPS, CONTAINER_H, DEPOT_CHIP, FOCUS, GATE, HAUL, heightAt, LOAD, MINE_CHIP, OFFICE, PAD, PLACES, ROAD, ROAD_LIFT, roadAt, roadEdges,
  SHED, STACK, STOCKPILE, STRIP, TRUCK_MID_ROUTE, type ItemId, type RoadPose, type ViewId, type XZ,
} from "./safast-logistics-data";

type Props = SceneRuntime & { view: ViewId; selected: ItemId | null; moving: boolean; onPick: (id: ItemId) => void };

/* Materials: warm neutral paints, graphite running gear, matte ground. */

const M = {
  paint: physical("#eeede8", 0.42, { clearcoat: 0.35, clearcoatRoughness: 0.45, envMapIntensity: 0.6 }),
  paintShade: physical("#cfcdc6", 0.5, { clearcoat: 0.2, clearcoatRoughness: 0.55, envMapIntensity: 0.55 }),
  machine: physical("#d8d3c8", 0.46, { clearcoat: 0.3, clearcoatRoughness: 0.5, envMapIntensity: 0.55 }),
  machineShade: physical("#b9b4a8", 0.5, { clearcoat: 0.2, clearcoatRoughness: 0.55, envMapIntensity: 0.55 }),
  graphite: standard("#3c3f41", 0.6, 0.25),
  rubber: standard("#1f2122", 0.74),
  steel: standard("#8a8e90", 0.42, 0.6),
  darkSteel: standard("#4d5154", 0.48, 0.55),
  glass: physical("#2b3943", 0.06, { transparent: true, opacity: 0.55, envMapIntensity: 1.4 }),
  container: standard("#c9c4b9", 0.66, 0.12),
  containerAlt: standard("#a8a49b", 0.66, 0.12),
  crate: standard("#cdb894", 0.88),
  base: standard("#cdc9bf", 0.95),
  terrain: standard("#e3e0d7", 0.97),
  pad: standard("#f2f1ec", 0.9),
  padLine: standard("#bdb9b0", 0.85),
  road: standard("#b3aea3", 0.96),
  haul: standard("#d2ccbf", 0.96),
  rock: standard("#a59d8d", 0.94),
  rockDark: standard("#8f8778", 0.92),
  wall: standard("#e7e6e1", 0.85),
  roof: standard("#a6a9aa", 0.5, 0.35),
  door: standard("#5f6365", 0.6, 0.3),
  fence: standard("#6d7174", 0.5, 0.5),
};
type Material = THREE.MeshStandardMaterial;
type TruckSet = { paint: Material; paintShade: Material; graphite: Material; rubber: Material; steel: Material; darkSteel: Material; glass: Material; container: Material; crate: Material };
const TRUCK_SET: TruckSet = { paint: M.paint, paintShade: M.paintShade, graphite: M.graphite, rubber: M.rubber, steel: M.steel, darkSteel: M.darkSteel, glass: M.glass, container: M.container, crate: M.crate };

// The looping truck fades in at the gate and out in the haul area, so it has
// its own transparent copies of the truck materials and edge lines.
const fadeable = (material: Material) => {
  const copy = material.clone();
  copy.transparent = true;
  copy.userData.opacity = material.opacity;
  return copy;
};
const MOVING_SET = Object.fromEntries(Object.entries(TRUCK_SET).map(([key, material]) => [key, fadeable(material)])) as TruckSet;
const MOVING_MATERIALS = Object.values(MOVING_SET);
const MOVING_LINES = EDGE_INK.clone();

const ROUTE = new THREE.MeshBasicMaterial({ color: OK, toneMapped: false, transparent: true, opacity: 0.92, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });

/* Geometry helpers */

type XY = [number, number];

function merge(parts: THREE.BufferGeometry[]) {
  const prepared = parts.map((part) => (part.index ? part.toNonIndexed() : part));
  prepared.forEach((part) => { if (!part.attributes.uv) part.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(part.attributes.position.count * 2), 2)); });
  return mergeGeometries(prepared) ?? new THREE.BufferGeometry();
}

// A rounded bar from a to b in the xy plane, centred on z.
function beam(a: XY, b: XY, z: number, height: number, thickness: number) {
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const geometry = bx([-length / 2, length / 2], [-height / 2, height / 2], [-thickness / 2, thickness / 2], Math.min(height, thickness) / 2.4);
  geometry.rotateZ(Math.atan2(b[1] - a[1], b[0] - a[0]));
  return geometry.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z);
}

function rod(a: XY, b: XY, z: number, radius: number) {
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const geometry = new THREE.CylinderGeometry(radius, radius, length, 12);
  geometry.rotateZ(Math.atan2(b[1] - a[1], b[0] - a[0]) - Math.PI / 2);
  return geometry.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z);
}

function extrudeXY(outline: XY[], z0: number, z1: number, bevel = 0.02) {
  const shape = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y)));
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: z1 - z0 - bevel * 2, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 1, curveSegments: 6 });
  return geometry.translate(0, 0, z0 + bevel);
}

// A profile drawn in (z, y), run along x from x0 to x1.
function extrudeAlongX(profile: XY[], x0: number, x1: number) {
  const shape = new THREE.Shape(profile.map(([z, y]) => new THREE.Vector2(-z, y)));
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: x1 - x0, bevelEnabled: false });
  geometry.rotateY(Math.PI / 2);
  return geometry.translate(x0, 0, 0);
}

const mirrorZ = (make: (side: 1 | -1) => THREE.BufferGeometry) => [make(1), make(-1)];

/* Truck: a rigid flatbed, origin on the ground between the axles, nose on +x. */

const WHEEL_R = 0.27;
const DECK_Y = 0.68;

function containerParts(x: XY, y0: number, z: XY) {
  const ribs: THREE.BufferGeometry[] = [];
  for (let rx = x[0] + 0.22; rx < x[1] - 0.1; rx += 0.26) {
    ribs.push(bx([rx - 0.03, rx + 0.03], [y0 + 0.06, y0 + CONTAINER_H - 0.06], [z[1] - 0.01, z[1] + 0.02], 0.01));
    ribs.push(bx([rx - 0.03, rx + 0.03], [y0 + 0.06, y0 + CONTAINER_H - 0.06], [z[0] - 0.02, z[0] + 0.01], 0.01));
  }
  const corners: THREE.BufferGeometry[] = [];
  for (const cx of [x[0], x[1] - 0.1]) for (const cy of [y0, y0 + CONTAINER_H - 0.1]) for (const cz of [z[0] - 0.01, z[1] - 0.09]) corners.push(bx([cx, cx + 0.1], [cy, cy + 0.1], [cz, cz + 0.1], 0.01));
  const bars = [-0.32, -0.12, 0.12, 0.32].map((bz) => cylinder(0.018, CONTAINER_H - 0.2, "y", [x[0] - 0.02, y0 + CONTAINER_H / 2, (z[0] + z[1]) / 2 + bz], 8));
  return { body: bx(x, [y0, y0 + CONTAINER_H], z, 0.03), ribs: merge(ribs), trim: merge([...corners, ...bars]) };
}

let truckCache: ReturnType<typeof buildTruck> | null = null;
function buildTruck() {
  const tyres: THREE.BufferGeometry[] = [];
  const hubs: THREE.BufferGeometry[] = [];
  for (const x of [1.55, -0.95, -1.62]) for (const z of [0.5, -0.5]) {
    tyres.push(cylinder(WHEEL_R, 0.26, "z", [x, WHEEL_R, z], 28));
    hubs.push(cylinder(0.13, 0.28, "z", [x, WHEEL_R, z], 16));
  }
  const container = containerParts([-2.32, 0.76], DECK_Y, [-0.61, 0.61]);
  return {
    cab: bx([1.0, 2.12], [0.56, 1.86], [-0.62, 0.62], 0.12),
    roof: bx([1.05, 1.9], [1.84, 2.04], [-0.55, 0.55], 0.08),
    glass: merge([bx([2.09, 2.15], [1.22, 1.72], [-0.54, 0.54], 0.02), ...mirrorZ((s) => bx([1.48, 2.02], [1.22, 1.7], s > 0 ? [0.6, 0.64] : [-0.64, -0.6], 0.02))]),
    trim: merge([
      bx([2.1, 2.16], [0.66, 1.08], [-0.42, 0.42], 0.02),
      bx([2.02, 2.24], [0.36, 0.6], [-0.63, 0.63], 0.04),
      ...mirrorZ((s) => bx([1.98, 2.06], [1.24, 1.62], s > 0 ? [0.66, 0.72] : [-0.72, -0.66], 0.02)),
      ...mirrorZ((s) => bx([1.25, 1.65], [0.3, 0.36], s > 0 ? [0.6, 0.67] : [-0.67, -0.6], 0.01)),
    ]),
    chassis: bx([-2.3, 1.9], [0.34, 0.56], [-0.36, 0.36], 0.03),
    deck: merge([bx([-2.42, 0.92], [0.56, DECK_Y], [-0.63, 0.63], 0.03), bx([0.84, 0.94], [DECK_Y, 1.56], [-0.6, 0.6], 0.02)]),
    metal: merge([cylinder(0.15, 0.62, "x", [0.45, 0.42, 0.5], 18), cylinder(0.045, 1.05, "y", [0.97, 1.42, -0.5], 10)]),
    tyres: merge(tyres),
    hubs: merge(hubs),
    container: container.body,
    containerRibs: container.ribs,
    containerTrim: container.trim,
    crates: merge([bx([-2.32, -1.32], [DECK_Y, 1.44], [-0.56, 0.56], 0.03), bx([-1.18, -0.18], [DECK_Y, 1.3], [-0.56, 0.56], 0.03)]),
    crateBands: merge([-1.82, -0.68].map((x) => bx([x - 0.05, x + 0.05], [DECK_Y, x < -1 ? 1.46 : 1.32], [-0.575, 0.575], 0.01))),
    groundCrate: bx([-0.5, 0.5], [0, 0.74], [-0.56, 0.56], 0.03),
  };
}
const truckKit = () => (truckCache ??= buildTruck());

type PieceProps = { geometry: THREE.BufferGeometry; material: THREE.Material; selected?: boolean; ghost?: boolean; edges?: boolean; lines?: THREE.LineBasicMaterial; shadow?: boolean; tint?: number };

function Piece({ geometry, material, selected, ghost, edges, lines = EDGE_INK, shadow = true, tint }: PieceProps) {
  const resolved = ghost ? GHOST : selected ? tinted(material, tint) : material;
  return (
    <>
      <mesh geometry={geometry} material={resolved} castShadow={shadow && !ghost} receiveShadow={!ghost} />
      {(selected || edges || ghost) && <lineSegments geometry={edgesOf(geometry)} material={ghost ? EDGE_SOFT : lines} />}
    </>
  );
}

type Layer = { selected?: boolean; ghost?: boolean; edges?: boolean; onPick?: () => void };
type TruckProps = { cargo: "container" | "crates"; body: Layer; load: Layer; set?: TruckSet; lines?: THREE.LineBasicMaterial };

function Truck({ cargo, body, load, set = TRUCK_SET, lines }: TruckProps) {
  const k = truckKit();
  const { selected, ghost, edges } = body;
  const fine = { ghost, lines };
  const cargoLayer = { selected: load.selected, ghost: load.ghost, edges: load.edges, lines };
  return (
    <>
      <group {...pickHandlers(body.onPick)}>
        <Piece geometry={k.cab} material={set.paint} selected={selected} ghost={ghost} edges={edges} lines={lines} tint={0.5} />
        <Piece geometry={k.roof} material={set.paintShade} selected={selected} {...fine} tint={0.5} />
        {!ghost && <mesh geometry={k.glass} material={set.glass} />}
        <Piece geometry={k.trim} material={set.graphite} {...fine} shadow={false} />
        <Piece geometry={k.chassis} material={set.graphite} selected={selected} {...fine} />
        <Piece geometry={k.deck} material={set.darkSteel} selected={selected} ghost={ghost} edges={edges} lines={lines} />
        <Piece geometry={k.metal} material={set.steel} {...fine} />
        <Piece geometry={k.tyres} material={set.rubber} {...fine} />
        <Piece geometry={k.hubs} material={set.steel} {...fine} shadow={false} />
      </group>
      <group {...pickHandlers(load.onPick)}>
        {cargo === "container" ? (
          <>
            <Piece geometry={k.container} material={set.container} {...cargoLayer} tint={0.6} />
            <Piece geometry={k.containerRibs} material={set.container} selected={load.selected} ghost={load.ghost} lines={lines} shadow={false} tint={0.6} />
            <Piece geometry={k.containerTrim} material={set.darkSteel} ghost={load.ghost} lines={lines} shadow={false} />
          </>
        ) : (
          <>
            <Piece geometry={k.crates} material={set.crate} {...cargoLayer} />
            <Piece geometry={k.crateBands} material={set.darkSteel} ghost={load.ghost} lines={lines} shadow={false} />
          </>
        )}
      </group>
    </>
  );
}

/* Rental equipment. Each origin sits on the ground; +x is the working end. */

let equipmentCache: ReturnType<typeof buildEquipment> | null = null;
function buildEquipment() {
  const exTracks = mirrorZ((s) => bx([-1.2, 1.2], [0, 0.46], s > 0 ? [0.42, 0.88] : [-0.88, -0.42], 0.2));
  const exWheels = [-0.98, 0.98].flatMap((x) => mirrorZ((s) => cylinder(0.19, 0.48, "z", [x, 0.23, s * 0.65], 18)));
  const loaderTyres: THREE.BufferGeometry[] = [];
  const loaderHubs: THREE.BufferGeometry[] = [];
  for (const x of [0.95, -0.95]) for (const z of [0.66, -0.66]) {
    loaderTyres.push(cylinder(0.44, 0.34, "z", [x, 0.44, z], 30));
    loaderHubs.push(cylinder(0.2, 0.36, "z", [x, 0.44, z], 16));
  }
  const louvres: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 6; i++) for (const s of [1, -1]) louvres.push(bx([-0.86 + i * 0.12, -0.8 + i * 0.12], [0.42, 0.98], s > 0 ? [0.49, 0.52] : [-0.52, -0.49], 0.01));
  return {
    excavator: {
      tracks: merge(exTracks),
      running: merge([...exWheels, bx([-0.55, 0.55], [0.22, 0.52], [-0.42, 0.42], 0.04), cylinder(0.5, 0.1, "y", [0, 0.57, 0], 28)]),
      house: merge([bx([-1.15, 0.55], [0.6, 1.2], [-0.78, 0.78], 0.08), bx([-1.15, -0.2], [1.18, 1.32], [-0.7, 0.05], 0.06)]),
      counterweight: bx([-1.42, -0.8], [0.6, 1.28], [-0.78, 0.78], 0.16),
      cab: bx([-0.02, 0.82], [0.6, 1.76], [0.12, 0.76], 0.08),
      glass: merge([bx([0.8, 0.85], [1.0, 1.66], [0.18, 0.7], 0.01), bx([0.08, 0.72], [1.06, 1.66], [0.74, 0.79], 0.01)]),
      arm: merge([beam([0.45, 1.0], [2.2, 2.35], -0.18, 0.36, 0.32), beam([2.2, 2.35], [2.95, 0.9], -0.18, 0.26, 0.24)]),
      rams: merge([rod([0.75, 0.85], [1.75, 2.0], -0.18, 0.06), rod([1.6, 2.35], [2.55, 2.55], -0.18, 0.05)]),
      bucket: extrudeXY([[2.72, 0.95], [3.18, 1.0], [3.3, 0.52], [3.05, 0.14], [2.72, 0.36]], -0.58, 0.22),
    },
    loader: {
      tyres: merge(loaderTyres),
      hubs: merge(loaderHubs),
      body: merge([bx([-1.75, -0.25], [0.5, 1.25], [-0.52, 0.52], 0.1), bx([0.1, 1.35], [0.45, 0.85], [-0.38, 0.38], 0.06)]),
      fenders: merge([...mirrorZ((s) => bx([-1.45, -0.45], [0.95, 1.0], s > 0 ? [0.46, 0.86] : [-0.86, -0.46], 0.02)), ...mirrorZ((s) => bx([0.5, 1.4], [0.93, 0.98], s > 0 ? [0.46, 0.86] : [-0.86, -0.46], 0.02))]),
      cab: merge([bx([-0.55, 0.2], [1.0, 2.12], [-0.48, 0.48], 0.08), bx([-0.62, 0.3], [2.1, 2.2], [-0.54, 0.54], 0.04)]),
      glass: merge([bx([0.18, 0.23], [1.35, 2.0], [-0.42, 0.42], 0.01), ...mirrorZ((s) => bx([-0.45, 0.12], [1.35, 2.0], s > 0 ? [0.46, 0.5] : [-0.5, -0.46], 0.01))]),
      running: merge([cylinder(0.18, 0.5, "y", [-0.05, 0.65, 0], 16), bx([-1.78, -1.72], [0.7, 1.15], [-0.4, 0.4], 0.01)]),
      arms: merge(mirrorZ((s) => beam([0.6, 1.05], [1.85, 0.95], s * 0.36, 0.2, 0.14))),
      bucket: extrudeXY([[1.78, 0.28], [2.46, 0.24], [2.52, 0.38], [2.04, 0.5], [1.96, 1.14], [1.8, 1.18]], -0.84, 0.84),
    },
    generator: {
      skid: bx([-1.12, 1.12], [0, 0.16], [-0.56, 0.56], 0.03),
      body: bx([-1.0, 1.0], [0.16, 1.2], [-0.5, 0.5], 0.06),
      roof: bx([-1.04, 1.04], [1.18, 1.26], [-0.54, 0.54], 0.03),
      louvres: merge([...louvres, bx([0.35, 0.75], [0.5, 0.9], [0.49, 0.53], 0.01)]),
      stack: merge([cylinder(0.07, 0.55, "y", [0.62, 1.5, -0.18], 12), cylinder(0.12, 0.08, "y", [0.62, 1.28, -0.18], 12)]),
    },
  };
}
const equipmentKit = () => (equipmentCache ??= buildEquipment());

function Excavator({ selected, ghost, edges, onPick }: Layer) {
  const k = equipmentKit().excavator;
  const fine = { ghost };
  return (
    <group {...pickHandlers(onPick)}>
      <Piece geometry={k.tracks} material={M.rubber} {...fine} />
      <Piece geometry={k.running} material={M.darkSteel} {...fine} shadow={false} />
      <Piece geometry={k.house} material={M.machine} selected={selected} ghost={ghost} edges={edges} tint={0.45} />
      <Piece geometry={k.counterweight} material={M.machineShade} selected={selected} ghost={ghost} edges={edges} tint={0.45} />
      <Piece geometry={k.cab} material={M.machine} selected={selected} ghost={ghost} edges={edges} tint={0.45} />
      {!ghost && <mesh geometry={k.glass} material={M.glass} />}
      <Piece geometry={k.arm} material={M.machine} selected={selected} ghost={ghost} edges={edges} tint={0.45} />
      <Piece geometry={k.rams} material={M.steel} {...fine} />
      <Piece geometry={k.bucket} material={M.darkSteel} {...fine} />
    </group>
  );
}

function WheelLoader({ selected, ghost, edges, onPick }: Layer) {
  const k = equipmentKit().loader;
  const fine = { ghost };
  return (
    <group {...pickHandlers(onPick)}>
      <Piece geometry={k.tyres} material={M.rubber} {...fine} />
      <Piece geometry={k.hubs} material={M.steel} {...fine} shadow={false} />
      <Piece geometry={k.body} material={M.machine} selected={selected} ghost={ghost} edges={edges} tint={0.45} />
      <Piece geometry={k.fenders} material={M.machineShade} selected={selected} {...fine} tint={0.45} />
      <Piece geometry={k.cab} material={M.machine} selected={selected} ghost={ghost} edges={edges} tint={0.45} />
      {!ghost && <mesh geometry={k.glass} material={M.glass} />}
      <Piece geometry={k.running} material={M.graphite} {...fine} shadow={false} />
      <Piece geometry={k.arms} material={M.machine} selected={selected} {...fine} tint={0.45} />
      <Piece geometry={k.bucket} material={M.darkSteel} selected={selected} ghost={ghost} edges={edges} />
    </group>
  );
}

function Generator({ selected, ghost, edges, onPick }: Layer) {
  const k = equipmentKit().generator;
  return (
    <group {...pickHandlers(onPick)}>
      <Piece geometry={k.skid} material={M.graphite} ghost={ghost} />
      <Piece geometry={k.body} material={M.machine} selected={selected} ghost={ghost} edges={edges} tint={0.45} />
      <Piece geometry={k.roof} material={M.machineShade} selected={selected} ghost={ghost} tint={0.45} />
      <Piece geometry={k.louvres} material={M.graphite} ghost={ghost} shadow={false} />
      <Piece geometry={k.stack} material={M.steel} ghost={ghost} />
    </group>
  );
}

/* Site: the terrain strip, the depot yard, the road and the mine. */

const STACK_TOP = (level: number) => PAD.top + level * CONTAINER_H;

function ribbon(width: number, lift: number) {
  const edges = roadEdges(width);
  const positions: number[] = [];
  const indices: number[] = [];
  edges.forEach(({ left, right }, index) => {
    positions.push(left[0], heightAt(left[0], left[1]) + lift, left[1], right[0], heightAt(right[0], right[1]) + lift, right[1]);
    if (index > 0) {
      const a = (index - 1) * 2;
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function ring(at: XZ, lift: number) {
  return new THREE.RingGeometry(0.34, 0.5, 32).rotateX(-Math.PI / 2).translate(at[0], heightAt(at[0], at[1]) + lift, at[1]);
}

let siteCache: ReturnType<typeof buildSite> | null = null;
function buildSite() {
  const terrain = new THREE.PlaneGeometry(STRIP.x[1] - STRIP.x[0] - 0.1, STRIP.z[1] - STRIP.z[0] - 0.1, 168, 64).rotateX(-Math.PI / 2);
  const position = terrain.attributes.position;
  for (let i = 0; i < position.count; i++) position.setY(i, heightAt(position.getX(i), position.getZ(i)));
  terrain.computeVertexNormals();

  const fence: THREE.BufferGeometry[] = [];
  const run = (from: XZ, to: XZ) => {
    const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
    const count = Math.max(1, Math.round(length / 1.4));
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      fence.push(cylinder(0.045, 0.95, "y", [from[0] + (to[0] - from[0]) * t, PAD.top + 0.47, from[1] + (to[1] - from[1]) * t], 8));
    }
    for (const y of [0.5, 0.92]) {
      const x: XZ = from[0] === to[0] ? [from[0] - 0.02, from[0] + 0.02] : [Math.min(from[0], to[0]), Math.max(from[0], to[0])];
      const z: XZ = from[1] === to[1] ? [from[1] - 0.02, from[1] + 0.02] : [Math.min(from[1], to[1]), Math.max(from[1], to[1])];
      fence.push(bx(x, [PAD.top + y - 0.02, PAD.top + y + 0.02], z, 0.01));
    }
  };
  run([GATE.x, PAD.z[0]], [GATE.x, GATE.z[0]]);
  run([GATE.x, GATE.z[1]], [GATE.x, PAD.z[1]]);
  run([PAD.x[0], PAD.z[0]], [GATE.x, PAD.z[0]]);

  // Gate leaves stand open, swung back inside the yard.
  const gate = [GATE.z[0] + 0.12, GATE.z[1] - 0.12].flatMap((z) => [
    bx([GATE.x - 1.5, GATE.x - 0.08], [PAD.top + 0.15, PAD.top + 0.21], [z - 0.03, z + 0.03], 0.01),
    bx([GATE.x - 1.5, GATE.x - 0.08], [PAD.top + 1.0, PAD.top + 1.06], [z - 0.03, z + 0.03], 0.01),
    bx([GATE.x - 1.5, GATE.x - 1.44], [PAD.top + 0.15, PAD.top + 1.06], [z - 0.03, z + 0.03], 0.01),
    beam([GATE.x - 1.47, PAD.top + 0.18], [GATE.x - 0.1, PAD.top + 1.03], z, 0.05, 0.05),
  ]);
  const posts = GATE.z.map((z) => cylinder(0.1, 1.35, "y", [GATE.x, PAD.top + 0.67, z], 14));

  const zMid = (SHED.z[0] + SHED.z[1]) / 2;
  const roofProfile: XY[] = [[SHED.z[0] - 0.3, SHED.wall - 0.12], [zMid, SHED.ridge], [SHED.z[1] + 0.3, SHED.wall - 0.12], [SHED.z[1] + 0.3, SHED.wall], [zMid, SHED.ridge + 0.12], [SHED.z[0] - 0.3, SHED.wall]];

  const containers = STACK.map(({ x, z, level }) => containerParts(x, STACK_TOP(level), z));
  const rocks = ([[14.2, -3.2, 0.32], [15.1, -3.4, 0.24], [17.1, -3.25, 0.36], [9.7, -3.2, 0.3], [19.4, -3.3, 0.28], [7.6, -0.6, 0.22]] as const).map(([x, z, s], index) => {
    const rock = new THREE.DodecahedronGeometry(1, 0);
    rock.scale(s, s * 0.7, s).rotateY(index * 1.3).translate(x, s * 0.45, z);
    return rock;
  });
  const pile = new THREE.ConeGeometry(STOCKPILE.radius, STOCKPILE.height, 11, 1).toNonIndexed();
  pile.computeVertexNormals();
  pile.translate(STOCKPILE.x, STOCKPILE.height / 2 + HAUL.top, STOCKPILE.z);

  return {
    base: bx(STRIP.x, [-STRIP.depth, 0.001], STRIP.z, 0.08),
    terrain,
    pad: bx(PAD.x, [-0.02, PAD.top], PAD.z, 0.03),
    bays: merge([
      ...BAY_LINES.map((x) => bx([x - 0.04, x + 0.04], [PAD.top, PAD.top + 0.008], BAY_Z, 0.002)),
      bx([BAY_LINES[0], BAY_LINES[BAY_LINES.length - 1]], [PAD.top, PAD.top + 0.008], [BAY_Z[0] - 0.04, BAY_Z[0] + 0.04], 0.002),
    ]),
    shed: merge([bx(SHED.x, [0, SHED.wall], SHED.z, 0.04), extrudeAlongX([[SHED.z[0], SHED.wall - 0.01], [zMid, SHED.ridge - 0.1], [SHED.z[1], SHED.wall - 0.01]], SHED.x[0] + 0.02, SHED.x[1] - 0.02)]),
    roof: extrudeAlongX(roofProfile, SHED.x[0] - 0.25, SHED.x[1] + 0.25),
    doors: merge([[-19.3, -17.1], [-16.2, -14]].map(([x0, x1]) => bx([x0, x1], [PAD.top, 2.05], [SHED.z[1] - 0.02, SHED.z[1] + 0.05], 0.02))),
    office: merge([bx(OFFICE.x, [PAD.top, OFFICE.top], OFFICE.z, 0.05), bx([OFFICE.x[0] - 0.08, OFFICE.x[1] + 0.08], [OFFICE.top, OFFICE.top + 0.08], [OFFICE.z[0] - 0.08, OFFICE.z[1] + 0.08], 0.03)]),
    officeGlass: merge([bx([OFFICE.x[0] + 0.25, OFFICE.x[0] + 1.25], [0.62, 1.05], [OFFICE.z[1] - 0.01, OFFICE.z[1] + 0.03], 0.01), bx([OFFICE.x[1] - 0.6, OFFICE.x[1] - 0.2], [PAD.top, 1.1], [OFFICE.z[1] - 0.01, OFFICE.z[1] + 0.03], 0.01)]),
    stack: containers.map((part) => part.body),
    stackDetail: merge(containers.flatMap((part) => [part.ribs, part.trim])),
    fence: merge([...fence, ...gate]),
    posts: merge(posts),
    road: ribbon(2.3, ROAD_LIFT),
    route: merge([ribbon(0.2, ROAD_LIFT + 0.03), ring(ROAD[0], ROAD_LIFT + 0.03), ring(ROAD[ROAD.length - 1], ROAD_LIFT + 0.03)]),
    haul: bx(HAUL.x, [-0.02, HAUL.top], HAUL.z, 0.02),
    benches: BENCHES.map((bench) => extrudeAlongX([[bench.z[0], 0], [bench.z[1], 0], [bench.z[1] - 0.55, bench.top], [bench.z[0], bench.top]], bench.x[0], bench.x[1])),
    rocks: merge(rocks),
    pile,
  };
}
const siteKit = () => (siteCache ??= buildSite());

function Site({ route }: { route: boolean }) {
  const k = siteKit();
  return (
    <>
      <mesh geometry={k.base} material={M.base} receiveShadow />
      <mesh geometry={k.terrain} material={M.terrain} receiveShadow />
      <mesh geometry={k.pad} material={M.pad} receiveShadow />
      <mesh geometry={k.bays} material={M.padLine} receiveShadow />
      <Piece geometry={k.shed} material={M.wall} />
      <Piece geometry={k.roof} material={M.roof} />
      <mesh geometry={k.doors} material={M.door} receiveShadow />
      <Piece geometry={k.office} material={M.wall} />
      <mesh geometry={k.officeGlass} material={M.glass} />
      {k.stack.map((geometry, index) => <Piece key={index} geometry={geometry} material={index === 1 ? M.containerAlt : M.container} />)}
      <Piece geometry={k.stackDetail} material={M.darkSteel} shadow={false} />
      <Piece geometry={k.fence} material={M.fence} />
      <Piece geometry={k.posts} material={M.graphite} />
      <mesh geometry={k.road} material={M.road} receiveShadow />
      {route && <mesh geometry={k.route} material={ROUTE} renderOrder={2} />}
      <mesh geometry={k.haul} material={M.haul} receiveShadow />
      {k.benches.map((geometry, index) => <Piece key={index} geometry={geometry} material={index === 1 ? M.rockDark : M.rock} />)}
      <Piece geometry={k.pile} material={M.rockDark} />
      <Piece geometry={k.rocks} material={M.rockDark} />
    </>
  );
}

/* The truck on the road loops from the gate to the haul area. Its label
   anchors are updated in place each frame; the label layer reads them. */

const LOOP_SECONDS = 15;
const HALF_BASE = 1.3;
const pose: RoadPose = { x: 0, z: 0, dx: 1, dz: 0 };
const MOVING_TRUCK_AT: Point = [0, 0, 0];
const MOVING_LOAD_AT: Point = [0, 0, 0];
const smooth = (edge0: number, edge1: number, value: number) => {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

function placeOnRoad(u: number, group: THREE.Group | null, visible: boolean) {
  roadAt(u, pose);
  const front = heightAt(pose.x + pose.dx * HALF_BASE, pose.z + pose.dz * HALF_BASE);
  const rear = heightAt(pose.x - pose.dx * HALF_BASE, pose.z - pose.dz * HALF_BASE);
  const y = (front + rear) / 2 + ROAD_LIFT;
  group?.position.set(pose.x, y, pose.z);
  group?.rotation.set(0, Math.atan2(-pose.dz, pose.dx), Math.atan2(front - rear, HALF_BASE * 2), "YZX");
  const lift = visible ? 0 : 999;
  MOVING_TRUCK_AT[0] = pose.x + pose.dx * 1.4; MOVING_TRUCK_AT[1] = y + 2.1 + lift; MOVING_TRUCK_AT[2] = pose.z + pose.dz * 1.4;
  MOVING_LOAD_AT[0] = pose.x - pose.dx * 0.8; MOVING_LOAD_AT[1] = y + 2.05 + lift; MOVING_LOAD_AT[2] = pose.z - pose.dz * 0.8;
}
placeOnRoad(TRUCK_MID_ROUTE, null, true);

function setFade(alpha: number) {
  for (const material of MOVING_MATERIALS) {
    const opacity = (material.userData.opacity as number) * alpha;
    material.opacity = opacity;
    for (const strength of [0.5, 0.6, 0.72]) tinted(material, strength).opacity = opacity;
  }
  MOVING_LINES.opacity = 0.85 * alpha;
}

function MovingTruck({ instant, running, body, load }: { instant: boolean; running: boolean; body: Layer; load: Layer }) {
  const group = useRef<THREE.Group>(null);
  const progress = useRef(0.34);
  const loop = running && !instant;
  useContinuous(loop);
  useFrame((_, delta) => {
    if (loop) progress.current = (progress.current + Math.min(delta, 0.1) / LOOP_SECONDS) % 1;
    const u = instant ? TRUCK_MID_ROUTE : progress.current;
    const alpha = instant ? 1 : smooth(0, 0.06, u) * smooth(1, 0.93, u);
    placeOnRoad(u, group.current, alpha > 0.6);
    setFade(alpha);
  }, -1);
  return (
    <group ref={group}>
      <Truck cargo="container" body={body} load={load} set={MOVING_SET} lines={MOVING_LINES} />
    </group>
  );
}

/* Views and labels */

const OVERVIEW: Record<ViewId, View> = {
  everything: { position: [23, 36, 40.5], target: [0, 0, -0.5], narrow: { position: [-52, 52, 30], target: [-1.5, 0, 0] } },
  fleet: { position: [-18, 30, 40], target: [-1, 0.3, 1], narrow: { position: [-54, 48, 32], target: [-1, 0, 0.5] } },
  shipments: { position: [6, 44, 34], target: [-0.5, 0, 1.2], narrow: { position: [-46, 60, 26], target: [-0.5, 0, 0.5] } },
  rentals: { position: [21, 13, 23], target: [13.8, 0.7, 0.8], narrow: { position: [21, 17, 27], target: [14, 0.7, 1.2] } },
};

const ANCHOR: Record<Exclude<ItemId, "t2" | "s1042">, Point> = {
  t1: [PLACES.t1.x, 2.15, PLACES.t1.z + 1.4],
  t3: [PLACES.t3.x - 1.4, 2.0, PLACES.t3.z],
  s1045: [PLACES.t1.x, 2.15, PLACES.t1.z - 0.8],
  s1039: [PLACES.t3.x + 1.8, 1.55, PLACES.t3.z],
  ex: [PLACES.ex.x + 0.75, 1.5, PLACES.ex.z - 0.2],
  wl: [PLACES.wl.x - 1.9, 1.15, PLACES.wl.z - 0.5],
  gs: [PLACES.gs.x, 1.3, PLACES.gs.z],
};
const anchorOf = (id: ItemId): Point => (id === "t2" ? MOVING_TRUCK_AT : id === "s1042" ? MOVING_LOAD_AT : ANCHOR[id]);

function itemView(id: ItemId): View {
  if (id === "t2" || id === "s1042") return { position: [1.5, 15, 25], target: [-0.3, 0.6, 2.6] };
  const [x, y, z] = ANCHOR[id];
  return { position: [x + 7, y + 10.5, z + 18], target: [x, y - 0.6, z] };
}

function chip(id: ItemId, selected: ItemId | null, lift?: number): SceneLabel {
  const { title, detail, state } = CHIPS[id];
  return { id, at: anchorOf(id), title, detail, state: id === selected ? "select" : state, lift };
}

function buildLabels(view: ViewId, selected: ItemId | null): SceneLabel[] {
  if (view === "fleet") return [chip("t1", selected), chip("t2", selected, 40), chip("t3", selected)];
  if (view === "shipments") return [chip("s1045", selected), chip("s1042", selected, 40), chip("s1039", selected)];
  if (view === "rentals") return [chip("ex", selected, 40), chip("wl", selected, 34), chip("gs", selected)];
  const labels: SceneLabel[] = [
    { id: "depot", at: [-15.6, SHED.wall, SHED.z[1]], ...DEPOT_CHIP, lift: 22 },
    chip("t2", selected, 40),
    { id: "mine", at: [16, BENCHES[2].top, -7.1], ...MINE_CHIP, lift: 28 },
  ];
  if (selected && selected !== "t2") labels.push(chip(selected, selected, 52));
  return labels;
}

/* Scene */

export default function SafastScene({ active, instant, onReady, view, selected, moving, onPick }: Props) {
  const focus = FOCUS[view];
  const labels = useMemo(() => buildLabels(view, selected), [view, selected]);
  const camera = selected ? itemView(selected) : OVERVIEW[view];

  const trucksGhost = focus === "equipment";
  const equipmentGhost = focus === "truck" || focus === "shipment";
  const truckPick = (id: ItemId) => (trucksGhost ? undefined : () => onPick(focus === "shipment" ? (LOAD[id] ?? id) : id));
  const loadPick = (id: ItemId) => (trucksGhost ? undefined : () => onPick(focus === "shipment" ? id : (CARRIER[id] ?? id)));
  const equipmentPick = (id: ItemId) => (equipmentGhost ? undefined : () => onPick(id));
  const body = (id: ItemId): Layer => ({ selected: selected === id, ghost: trucksGhost, edges: focus === "truck", onPick: truckPick(id) });
  const load = (id: ItemId): Layer => ({ selected: selected === id, ghost: trucksGhost, edges: focus === "shipment", onPick: loadPick(id) });
  const machine = (id: ItemId): Layer => ({ selected: selected === id, ghost: equipmentGhost, edges: focus === "equipment", onPick: equipmentPick(id) });
  const place = (id: keyof typeof PLACES) => {
    const spot = PLACES[id];
    return { position: [spot.x, HAUL.top, spot.z] as Point, rotation: [0, "heading" in spot ? spot.heading : 0, 0] as [number, number, number] };
  };

  return (
    <ModelCanvas active={active} instant={instant} onReady={onReady} view={camera} labels={labels} extent={24} fov={26} exposure={0.98}>
      <group position={[0, -STRIP.depth, 0]}>
        <Ground />
        <ContactShadow width={50} depth={22} opacity={0.32} />
      </group>
      <Site route={view === "shipments" || view === "everything"} />

      <group position={[PLACES.t1.x, PAD.top, PLACES.t1.z]} rotation={[0, PLACES.t1.heading, 0]}>
        <Truck cargo="container" body={body("t1")} load={load("s1045")} />
      </group>
      <MovingTruck instant={instant} running={moving && active} body={body("t2")} load={load("s1042")} />
      <group {...place("t3")}>
        <Truck cargo="crates" body={body("t3")} load={load("s1039")} />
      </group>
      <group position={[PLACES.crate.x, HAUL.top, PLACES.crate.z]} {...pickHandlers(loadPick("s1039"))}>
        <Piece geometry={truckKit().groundCrate} material={M.crate} selected={selected === "s1039"} ghost={trucksGhost} edges={focus === "shipment"} />
      </group>

      <group {...place("ex")}><Excavator {...machine("ex")} /></group>
      <group {...place("wl")}><WheelLoader {...machine("wl")} /></group>
      <group {...place("gs")}><Generator {...machine("gs")} /></group>
    </ModelCanvas>
  );
}
