"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { SceneRuntime } from "./model-frame";
import {
  bx, cylinder, ContactShadow, DashedOutline, EDGE_INK, EDGE_OK, Ground, ModelCanvas, OK, Part, PROPOSED, ZONE_SELECT,
  physical, pickHandlers, standard, useContinuous, useTween, type View,
} from "./scene-kit";
import {
  CLEANED, DRIVE, DRIVE_LENGTH, DRIVE_MID_X, FOOTPATH_Z, FRONT_PATH, HOUSE, IMPACT_AHEAD, KERB_Z, LANE_Z, LOT, PATIO, PATIO_CLEANED, REEL_X, ROOF_OVERHANG,
  ROOF_RISE, STREET_Z, TRUCK_X, WALL_H, WORKER_BACK, areaState, chipsFor, cleanFront, type AreaState, type JobView, type Point, type Rect,
} from "./canes-pressure-washing-data";

export type PickTarget = "house" | "truck";
type Props = SceneRuntime & { step: number; view: JobView; onPick?: (target: PickTarget) => void };

const M = {
  wall: physical("#efeee9", 0.82, { envMapIntensity: 0.6 }),
  roof: standard("#787a7c", 0.74, 0.04),
  trim: standard("#44474b", 0.6, 0.15),
  glass: physical("#33404a", 0.08, { envMapIntensity: 1.3 }),
  door: standard("#5d6064", 0.55, 0.1),
  sill: standard("#dddcd6", 0.85),
  lawn: standard("#e7e8e1", 1),
  path: standard("#dcdad3", 0.95),
  asphalt: standard("#c6c7c3", 0.96),
  kerb: standard("#e0dfdb", 0.9),
  marking: standard("#f7f7f4", 0.8),
  slabSide: standard("#c9c5bc", 0.95),
  clean: standard("#e8e5de", 0.9),
  joint: standard("#8f8a80", 0.95),
  hedge: standard("#bcc0b3", 0.95, 0, { flatShading: true }),
  trunk: standard("#8f877b", 0.9),
  body: physical("#f3f3f0", 0.36, { clearcoat: 0.5, clearcoatRoughness: 0.35, envMapIntensity: 0.7 }),
  graphite: standard("#3c3f41", 0.6, 0.25),
  frame: standard("#55585b", 0.5, 0.35),
  rubber: standard("#1d1f20", 0.72),
  steel: standard("#8a8e91", 0.4, 0.6),
  hub: standard("#c1c4c6", 0.32, 0.7),
  tank: physical("#efeee8", 0.28, { clearcoat: 0.4, clearcoatRoughness: 0.3, envMapIntensity: 0.6 }),
  hose: standard("#2a2c2e", 0.5),
  lens: standard("#dfe1e2", 0.2, 0.3),
  cloth: standard("#4b4f53", 0.85),
  trousers: standard("#6d7073", 0.85),
  skin: standard("#c9b9a6", 0.7),
  wet: physical("#9e998f", 0.12, { clearcoat: 1, clearcoatRoughness: 0.08, transparent: true, depthWrite: false }),
  spray: new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false }),
  mist: new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.85, depthWrite: false }),
};

/* Surface textures, made once on first use. */

function random(seed: number) {
  let value = seed;
  return () => {
    value = (value * 16807) % 2147483647;
    return value / 2147483647;
  };
}

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

// Weathered concrete: a darker base, mottled staining and, on the driveway,
// tyre tracks and an oil mark where a car parks.
function grime(width: number, height: number, seed: number, tracks: boolean) {
  return canvasTexture(width, height, (context) => {
    const next = random(seed);
    context.fillStyle = "#aaa498";
    context.fillRect(0, 0, width, height);
    for (let index = 0; index < 900; index++) {
      const dark = next() < 0.6;
      context.fillStyle = dark ? `rgba(92, 86, 76, ${0.04 + next() * 0.08})` : `rgba(214, 209, 199, ${0.05 + next() * 0.08})`;
      context.beginPath();
      context.arc(next() * width, next() * height, 2 + next() * 14, 0, Math.PI * 2);
      context.fill();
    }
    if (tracks) {
      for (const center of [0.3, 0.7]) {
        const gradient = context.createLinearGradient((center - 0.09) * width, 0, (center + 0.09) * width, 0);
        gradient.addColorStop(0, "rgba(80, 75, 66, 0)");
        gradient.addColorStop(0.5, "rgba(80, 75, 66, 0.3)");
        gradient.addColorStop(1, "rgba(80, 75, 66, 0)");
        context.fillStyle = gradient;
        context.fillRect((center - 0.09) * width, 0, 0.18 * width, height);
      }
      context.fillStyle = "rgba(60, 56, 50, 0.32)";
      context.beginPath();
      context.ellipse(width * 0.5, height * 0.12, width * 0.12, height * 0.035, 0, 0, Math.PI * 2);
      context.fill();
    }
  });
}

let textures: { drive: THREE.MeshStandardMaterial; patioDirt: THREE.MeshStandardMaterial; pavers: THREE.MeshStandardMaterial; wetAlpha: THREE.Texture } | null = null;
function surfaces() {
  if (textures) return textures;
  const pavers = canvasTexture(128, 128, (context) => {
    context.fillStyle = "#e6e3dc";
    context.fillRect(0, 0, 128, 128);
    context.strokeStyle = "rgba(70, 66, 58, 0.3)";
    context.lineWidth = 3;
    for (let v = 0; v <= 128; v += 64) {
      context.beginPath(); context.moveTo(v, 0); context.lineTo(v, 128); context.stroke();
      context.beginPath(); context.moveTo(0, v); context.lineTo(128, v); context.stroke();
    }
  });
  pavers.wrapS = pavers.wrapT = THREE.RepeatWrapping;
  pavers.repeat.set((PATIO.x[1] - PATIO.x[0]) / 1.2, (PATIO.z[1] - PATIO.z[0]) / 1.2);
  const wetAlpha = canvasTexture(4, 64, (context) => {
    const gradient = context.createLinearGradient(0, 0, 0, 64);
    gradient.addColorStop(0, "#000");
    gradient.addColorStop(1, "#fff");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 4, 64);
  });
  wetAlpha.colorSpace = THREE.NoColorSpace;
  M.wet.alphaMap = wetAlpha;
  M.wet.needsUpdate = true;
  textures = {
    drive: standard("#ffffff", 0.94, 0, { map: grime(200, 528, 7, true) }),
    patioDirt: standard("#ffffff", 0.94, 0, { map: grime(528, 160, 11, false), transparent: true, depthWrite: false }),
    pavers: standard("#ffffff", 0.9, 0, { map: pavers }),
    wetAlpha,
  };
  return textures;
}

/* Geometry helpers */

const UP = new THREE.Vector3(0, 1, 0);

function merge(geometries: THREE.BufferGeometry[]) {
  return mergeGeometries(geometries.map((geometry) => (geometry.index ? geometry.toNonIndexed() : geometry)), false) ?? geometries[0];
}

// A cylinder between two points, for arms, the lance and the drawbar.
function rod(a: Point, b: Point, radius: number, segments = 10) {
  const start = new THREE.Vector3(...a);
  const direction = new THREE.Vector3(...b).sub(start);
  const geometry = new THREE.CylinderGeometry(radius, radius, direction.length(), segments);
  geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, direction.clone().normalize()));
  return geometry.translate(start.x + direction.x / 2, start.y + direction.y / 2, start.z + direction.z / 2);
}

// A profile drawn in the (z, y) plane, extruded west to east.
function alongX(profile: [number, number][], x0: number, x1: number) {
  const shape = new THREE.Shape(profile.map(([z, y]) => new THREE.Vector2(-z, y)));
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: x1 - x0, bevelEnabled: false });
  geometry.rotateY(Math.PI / 2);
  return geometry.translate(x0, 0, 0);
}

function flat(rect: Rect, y: number) {
  const geometry = new THREE.PlaneGeometry(rect.x[1] - rect.x[0], rect.z[1] - rect.z[0]);
  geometry.rotateX(-Math.PI / 2);
  return geometry.translate((rect.x[0] + rect.x[1]) / 2, y, (rect.z[0] + rect.z[1]) / 2);
}

function outline(rect: Rect, y: number) {
  const points = [[rect.x[0], rect.z[0]], [rect.x[1], rect.z[0]], [rect.x[1], rect.z[1]], [rect.x[0], rect.z[1]]].map(([x, z]) => new THREE.Vector3(x, y, z));
  return new THREE.BufferGeometry().setFromPoints(points);
}

// A water tank: a cylinder with rounded shoulders, lathed and laid along x.
function tank(radius: number, length: number, round: number, center: Point) {
  const half = length / 2;
  const points = [new THREE.Vector2(0, -half)];
  for (let index = 0; index <= 6; index++) {
    const angle = (index / 6) * (Math.PI / 2);
    points.push(new THREE.Vector2(radius - round + Math.sin(angle) * round, -half + round - Math.cos(angle) * round));
  }
  for (let index = 0; index <= 6; index++) {
    const angle = (index / 6) * (Math.PI / 2);
    points.push(new THREE.Vector2(radius - round + Math.cos(angle) * round, half - round + Math.sin(angle) * round));
  }
  points.push(new THREE.Vector2(0, half));
  return new THREE.LatheGeometry(points, 36).rotateZ(-Math.PI / 2).translate(...center);
}

/* The house: single storey, gable roof with the ridge running east to west. */

type Face = "front" | "back" | "east" | "west";
function onFace(face: Face, u: [number, number], y: [number, number], depth: [number, number]) {
  const [x0, x1] = HOUSE.x;
  const [z0, z1] = HOUSE.z;
  if (face === "front") return bx(u, y, [z1 + depth[0], z1 + depth[1]], 0.01);
  if (face === "back") return bx(u, y, [z0 - depth[1], z0 - depth[0]], 0.01);
  if (face === "east") return bx([x1 + depth[0], x1 + depth[1]], y, u, 0.01);
  return bx([x0 - depth[1], x0 - depth[0]], y, u, 0.01);
}

function houseKit() {
  const [x0, x1] = HOUSE.x;
  const [z0, z1] = HOUSE.z;
  const zc = (z0 + z1) / 2;
  const slope = ROOF_RISE / ((z1 - z0) / 2);
  const o = ROOF_OVERHANG;
  const t = 0.18;
  const eave = WALL_H - o * slope;
  const ridge = WALL_H + ROOF_RISE;
  const trim: THREE.BufferGeometry[] = [];
  const glass: THREE.BufferGeometry[] = [];
  const sill: THREE.BufferGeometry[] = [];
  const pane = (face: Face, u: [number, number], y: [number, number], mullion = true) => {
    trim.push(onFace(face, u, y, [0, 0.05]));
    glass.push(onFace(face, [u[0] + 0.07, u[1] - 0.07], [y[0] + 0.07, y[1] - 0.07], [0.02, 0.065]));
    if (mullion) trim.push(onFace(face, [(u[0] + u[1]) / 2 - 0.03, (u[0] + u[1]) / 2 + 0.03], y, [0, 0.08]));
    if (y[0] > 0.2) sill.push(onFace(face, [u[0] - 0.08, u[1] + 0.08], [y[0] - 0.06, y[0]], [0, 0.12]));
  };
  pane("front", [-8.6, -6.6], [0.95, 2.15]);
  pane("front", [-3.1, -0.9], [0.95, 2.15]);
  pane("back", [-8.2, -6.6], [0.95, 2.15]);
  pane("back", [-3.2, -0.6], [0.05, 2.2]);
  pane("back", [-6, -4.8], [1.2, 2.15], false);
  pane("east", [-2.6, -1.2], [0.95, 2.15], false);
  pane("east", [0.2, 1.6], [0.95, 2.15], false);
  pane("west", [-1.8, -0.2], [0.95, 2.15], false);
  trim.push(onFace("front", [-5.1, -3.9], [2.15, 2.24], [0, 0.07]));
  trim.push(bx([x0 - o, x1 + o], [eave - 0.14, eave + 0.02], [z1 + o - 0.02, z1 + o + 0.1], 0.02));
  trim.push(bx([x0 - o, x1 + o], [eave - 0.14, eave + 0.02], [z0 - o - 0.1, z0 - o + 0.02], 0.02));
  return {
    walls: alongX([[z0, 0], [z1, 0], [z1, WALL_H], [zc, ridge], [z0, WALL_H]], x0, x1),
    roof: alongX([[z0 - o, eave], [zc, ridge], [z1 + o, eave], [z1 + o, eave + t], [zc, ridge + t], [z0 - o, eave + t]], x0 - o, x1 + o),
    door: onFace("front", [-5, -4], [0, 2.15], [0, 0.05]),
    step: onFace("front", [-5.3, -3.7], [0, 0.16], [0, 0.7]),
    trim: merge(trim),
    glass: merge(glass),
    sill: merge(sill),
  };
}

function House({ selected, onPick }: { selected: boolean; onPick?: () => void }) {
  const kit = useMemo(() => houseKit(), []);
  return (
    <group {...pickHandlers(onPick)}>
      <Part geometry={kit.walls} material={M.wall} selected={selected} tint={0.3} />
      <Part geometry={kit.roof} material={M.roof} selected={selected} tint={0.34} />
      <Part geometry={kit.trim} material={M.trim} shadow={false} />
      <Part geometry={kit.glass} material={M.glass} shadow={false} />
      <Part geometry={kit.sill} material={M.sill} shadow={false} />
      <Part geometry={kit.door} material={M.door} shadow={false} />
      <Part geometry={kit.step} material={M.sill} />
    </group>
  );
}

/* Lot, street and planting */

function siteKit() {
  const [d0, d1] = DRIVE.x;
  const dashes = Array.from({ length: 34 }, (_, index) => -68 + index * 4).map((x) => bx([x, x + 2], [0.02, 0.024], [(STREET_Z[0] + STREET_Z[1]) / 2 - 0.06, (STREET_Z[0] + STREET_Z[1]) / 2 + 0.06], 0.001));
  return {
    lawn: bx(LOT.x, [0, 0.03], LOT.z, 0.01),
    footpath: merge([bx([-70, d0], [0, 0.1], FOOTPATH_Z, 0.01), bx([d1, 70], [0, 0.1], FOOTPATH_Z, 0.01), bx([-70, 70], [0, 0.1], [STREET_Z[1] + 0.2, STREET_Z[1] + 1.8], 0.01), bx(FRONT_PATH.x, [0, 0.06], FRONT_PATH.z, 0.01)]),
    kerb: merge([bx([-70, d0], [0, 0.14], KERB_Z, 0.02), bx([d1, 70], [0, 0.14], KERB_Z, 0.02), bx(DRIVE.x, [0, 0.09], KERB_Z, 0.02), bx([-70, 70], [0, 0.14], [STREET_Z[1], STREET_Z[1] + 0.2], 0.02)]),
    asphalt: bx([-70, 70], [0, 0.02], STREET_Z, 0.005),
    dashes: merge(dashes),
    hedge: merge([bx([12.6, 13.3], [0, 0.95], [LOT.z[0], 7.6], 0.25), bx([-13.7, -13], [0, 0.95], [LOT.z[0], 7.6], 0.25), bx([-13.7, 13.3], [0, 0.95], [LOT.z[0] - 0.7, LOT.z[0]], 0.25)]),
    mailbox: merge([bx([2.55, 2.65], [0, 1.05], [7.45, 7.55], 0.01), bx([2.4, 2.8], [1.05, 1.32], [7.28, 7.76], 0.04)]),
  };
}

const TREES: [number, number, number][] = [[-10.9, -9.6, 1.8], [10.6, -9.8, 1.5], [-11.2, 5.4, 1.3]];
const SHRUBS: [number, number][] = [[-8.9, 3.2], [-7.6, 3.25], [-2.2, 3.2], [-0.4, 3.15], [0.9, 3.2]];

function Site() {
  const kit = useMemo(() => siteKit(), []);
  const canopy = useMemo(() => new THREE.IcosahedronGeometry(1, 1), []);
  return (
    <group>
      <mesh geometry={kit.lawn} material={M.lawn} receiveShadow />
      <mesh geometry={kit.footpath} material={M.path} receiveShadow />
      <mesh geometry={kit.kerb} material={M.kerb} receiveShadow castShadow />
      <mesh geometry={kit.asphalt} material={M.asphalt} receiveShadow />
      <mesh geometry={kit.dashes} material={M.marking} />
      <mesh geometry={kit.hedge} material={M.hedge} castShadow receiveShadow />
      <mesh geometry={kit.mailbox} material={M.trim} castShadow />
      {TREES.map(([x, z, radius]) => (
        <group key={x} position={[x, 0, z]}>
          <mesh material={M.trunk} position={[0, 1.1, 0]} castShadow><cylinderGeometry args={[0.12, 0.17, 2.2, 10]} /></mesh>
          <mesh geometry={canopy} material={M.hedge} position={[0, 2.1 + radius * 0.75, 0]} scale={[radius, radius * 0.88, radius]} castShadow receiveShadow />
        </group>
      ))}
      {SHRUBS.map(([x, z]) => <mesh key={x} geometry={canopy} material={M.hedge} position={[x, 0.32, z]} scale={[0.55, 0.42, 0.5]} castShadow receiveShadow />)}
    </group>
  );
}

/* Work areas: proposed in blue, approved in yellow, scheduled with a blue line. */

function AreaOverlay({ rect, state, y }: { rect: Rect; state: AreaState; y: number }) {
  const fill = useMemo(() => flat(rect, y), [rect, y]);
  const line = useMemo(() => outline(rect, y + 0.005), [rect, y]);
  if (state === "plain") return null;
  const points: [number, number][] = [[rect.x[0], rect.z[0]], [rect.x[1], rect.z[0]], [rect.x[1], rect.z[1]], [rect.x[0], rect.z[1]]];
  return (
    <group>
      {state === "proposed" && <mesh geometry={fill} material={PROPOSED} renderOrder={3} />}
      {state === "approved" && <mesh geometry={fill} material={ZONE_SELECT} renderOrder={3} />}
      {state === "proposed" ? <DashedOutline points={points} y={y + 0.005} color={OK} dash={0.4} gap={0.25} /> : <lineLoop geometry={line} material={state === "approved" ? EDGE_INK : EDGE_OK} />}
    </group>
  );
}

/* The crew pickup and its trailer, built facing west from the back of the bed. */

function truckKit() {
  const wheels: THREE.BufferGeometry[] = [];
  const hubs: THREE.BufferGeometry[] = [];
  for (const x of [-4.55, -1.15]) for (const z of [-0.84, 0.84]) {
    wheels.push(cylinder(0.42, 0.3, "z", [x, 0.42, z], 28));
    hubs.push(cylinder(0.21, 0.32, "z", [x, 0.42, z], 18));
  }
  for (const z of [-1.08, 1.08]) {
    wheels.push(cylinder(0.33, 0.22, "z", [2.9, 0.33, z], 26));
    hubs.push(cylinder(0.16, 0.24, "z", [2.9, 0.33, z], 16));
  }
  const side = (z: number) => [z, -z];
  return {
    body: merge([
      bx([-5.5, -0.12], [0.6, 1.12], [-0.95, 0.95], 0.12),
      bx([-5.5, -3.85], [1.0, 1.32], [-0.92, 0.92], 0.14),
      bx([-3.95, -1.95], [1.0, 2.05], [-0.9, 0.9], 0.16),
      ...side(0.905).map((z) => bx([-1.95, -0.12], [1.1, 1.5], [z - 0.045, z + 0.045], 0.03)),
      bx([-1.98, -1.86], [1.1, 1.52], [-0.95, 0.95], 0.03),
      bx([-0.24, -0.12], [1.0, 1.5], [-0.95, 0.95], 0.03),
    ]),
    trim: merge([
      bx([-5.66, -5.42], [0.45, 0.78], [-0.96, 0.96], 0.06),
      bx([-0.16, 0], [0.45, 0.72], [-0.9, 0.9], 0.04),
      bx([-5.54, -5.46], [0.82, 1.2], [-0.58, 0.58], 0.02),
      ...side(0.97).map((z) => bx([-3.85, -1.95], [0.48, 0.58], [z - 0.06, z + 0.06], 0.02)),
      ...[-4.55, -1.15].flatMap((x) => side(0.94).map((z) => bx([x - 0.55, x + 0.55], [0.86, 0.96], [z - 0.05, z + 0.05], 0.03))),
    ]),
    glass: merge([
      bx([-3.99, -3.91], [1.4, 1.95], [-0.8, 0.8], 0.02),
      ...side(0.9).map((z) => bx([-3.75, -2.15], [1.4, 1.9], [z - 0.015, z + 0.015], 0.01)),
      bx([-1.99, -1.93], [1.45, 1.9], [-0.7, 0.7], 0.02),
    ]),
    lens: merge(side(0.74).map((z) => bx([-5.53, -5.46], [1.02, 1.18], [z - 0.12, z + 0.12], 0.02))),
    // Bed: a surface cleaner and a lance laid in the back.
    bedKit: merge([cylinder(0.38, 0.12, "y", [-1.0, 1.2, 0.35], 28), cylinder(0.05, 0.3, "y", [-1.0, 1.4, 0.35], 10), rod([-1.0, 1.55, 0.35], [-1.6, 1.25, -0.4], 0.025), rod([-1.8, 1.16, -0.65], [-0.4, 1.16, -0.65], 0.02)]),
    trailerFrame: merge([
      rod([0.05, 0.55, 0], [1.15, 0.6, -0.85], 0.05),
      rod([0.05, 0.55, 0], [1.15, 0.6, 0.85], 0.05),
      bx([-0.15, 0.25], [0.45, 0.62], [-0.08, 0.08], 0.03),
      bx([1.1, 4.5], [0.56, 0.68], [-0.95, 0.95], 0.03),
      ...side(1.1).map((z) => bx([2.35, 3.45], [0.72, 0.78], [z - 0.14, z + 0.14], 0.02)),
      ...[1.5, 2.6].map((x) => bx([x - 0.1, x + 0.1], [0.68, 0.98], [-0.55, 0.55], 0.03)),
      ...side(0.42).map((z) => bx([3.98, 4.12], [0.68, 1.26], [z - 0.04, z + 0.04], 0.01)),
    ]),
    deck: bx([1.12, 4.48], [0.68, 0.72], [-0.93, 0.93], 0.01),
    tank: tank(0.62, 1.95, 0.16, [2.05, 1.38, 0]),
    straps: merge([1.5, 2.6].map((x) => cylinder(0.635, 0.06, "x", [x, 1.38, 0], 36))),
    tankCap: cylinder(0.12, 0.08, "y", [2.05, 2.02, 0], 18),
    // The washer unit: engine, fuel tank and pump on a base frame.
    engine: merge([bx([3.12, 3.62], [0.72, 1.22], [-0.85, -0.05], 0.06), cylinder(0.11, 0.42, "x", [3.37, 0.9, 0.22], 16)]),
    fuel: bx([3.18, 3.56], [1.22, 1.38], [-0.78, -0.2], 0.05),
    reelSides: merge(side(0.38).map((z) => cylinder(0.44, 0.04, "z", [REEL_X, 1.22, z], 32))),
    reelHose: cylinder(0.33, 0.72, "z", [REEL_X, 1.22, 0], 32),
    wheels: merge(wheels),
    hubs: merge(hubs),
  };
}

function Truck({ selected }: { selected: boolean }) {
  const kit = useMemo(() => truckKit(), []);
  return (
    <group>
      <Part geometry={kit.body} material={M.body} selected={selected} tint={0.4} />
      <Part geometry={kit.trim} material={M.graphite} />
      <Part geometry={kit.glass} material={M.glass} shadow={false} />
      <Part geometry={kit.lens} material={M.lens} shadow={false} />
      <Part geometry={kit.bedKit} material={M.graphite} />
      <Part geometry={kit.trailerFrame} material={M.frame} />
      <Part geometry={kit.deck} material={M.steel} />
      <Part geometry={kit.tank} material={M.tank} selected={selected} tint={0.4} />
      <Part geometry={kit.straps} material={M.graphite} />
      <Part geometry={kit.tankCap} material={M.graphite} />
      <Part geometry={kit.engine} material={M.graphite} />
      <Part geometry={kit.fuel} material={M.body} />
      <Part geometry={kit.reelSides} material={M.steel} />
      <Part geometry={kit.reelHose} material={M.hose} />
      <Part geometry={kit.wheels} material={M.rubber} />
      <Part geometry={kit.hubs} material={M.hub} shadow={false} />
      <ContactShadow width={11.5} depth={3.2} position={[-0.6, 0.03, 0]} opacity={0.45} />
    </group>
  );
}

/* The crew member with a lance, built facing +z (toward the street). */

const NOZZLE: Point = [0.14, 0.3, 1.12];
const IMPACT_Z = IMPACT_AHEAD;
const MIST = 36;

function workerKit() {
  const pair = (x0: number, x1: number, y: [number, number], z: [number, number], radius: number) => [bx([x0, x1], y, z, radius), bx([-x1, -x0], y, z, radius)];
  const fan = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...NOZZLE), new THREE.Vector3(-0.3, 0.03, IMPACT_Z + 0.1), new THREE.Vector3(0.6, 0.03, IMPACT_Z + 0.1)]);
  fan.computeVertexNormals();
  return {
    boots: merge(pair(0.04, 0.2, [0, 0.1], [-0.1, 0.16], 0.03)),
    legs: merge(pair(0.03, 0.19, [0.1, 0.86], [-0.08, 0.08], 0.05)),
    upper: merge([bx([-0.23, 0.23], [0.84, 1.44], [-0.13, 0.13], 0.09), rod([0.22, 1.38, 0], [0.14, 1.02, 0.32], 0.05), rod([-0.22, 1.38, 0], [-0.02, 1.08, 0.42], 0.05), cylinder(0.12, 0.07, "y", [0, 1.665, 0], 16), bx([-0.1, 0.1], [1.635, 1.655], [0.05, 0.2], 0.005)]),
    skin: merge([new THREE.SphereGeometry(0.115, 16, 12).translate(0, 1.56, 0), new THREE.SphereGeometry(0.045, 8, 6).translate(0.14, 1.0, 0.35), new THREE.SphereGeometry(0.045, 8, 6).translate(-0.02, 1.06, 0.45)]),
    lance: merge([bx([0.07, 0.17], [0.88, 1.04], [0.28, 0.46], 0.02), rod([0.1, 1.0, 0.4], NOZZLE, 0.016, 8)]),
    fan,
    splash: new THREE.CircleGeometry(0.45, 24).rotateX(-Math.PI / 2).scale(1, 1, 0.45).translate(0.15, 0.03, IMPACT_Z + 0.1),
    drop: new THREE.SphereGeometry(1, 6, 4),
  };
}

const dummy = new THREE.Object3D();

function Worker({ group, mist }: { group: RefObject<THREE.Group | null>; mist: RefObject<THREE.InstancedMesh | null> }) {
  const kit = useMemo(() => workerKit(), []);
  return (
    <group ref={group} visible={false}>
      <Part geometry={kit.boots} material={M.rubber} />
      <Part geometry={kit.legs} material={M.trousers} />
      <Part geometry={kit.upper} material={M.cloth} />
      <Part geometry={kit.skin} material={M.skin} />
      <Part geometry={kit.lance} material={M.graphite} />
      <mesh geometry={kit.fan} material={M.spray} renderOrder={4} />
      <mesh geometry={kit.splash} material={M.spray} renderOrder={4} />
      <instancedMesh ref={mist} args={[kit.drop, M.mist, MIST]} renderOrder={5} />
      <ContactShadow width={1.1} depth={0.9} position={[0, 0.025, 0.05]} opacity={0.4} />
    </group>
  );
}

function placeMist(mesh: THREE.InstancedMesh, time: number) {
  for (let index = 0; index < MIST; index++) {
    const seed = Math.sin(index * 12.9898) * 43758.5453;
    const spread = seed - Math.floor(seed);
    const phase = (time * 1.3 + index / MIST) % 1;
    const bounce = index % 3 === 0;
    if (bounce) {
      dummy.position.set(-0.3 + spread * 0.9, 0.12 + phase * 0.32, IMPACT_Z + 0.05 + phase * 0.35);
      dummy.scale.setScalar(0.03 * (1 - phase * 0.6));
    } else {
      dummy.position.set(NOZZLE[0] + (spread - 0.5) * 0.85 * phase, NOZZLE[1] + (0.12 - NOZZLE[1]) * phase, NOZZLE[2] + (IMPACT_Z + 0.1 - NOZZLE[2]) * phase);
      dummy.scale.setScalar(0.022 + phase * 0.012);
    }
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
}

/* The hose: segments re-laid every frame from the reel to the lance. */

const HOSE_POINTS = 6;
const hosePoints = Array.from({ length: HOSE_POINTS }, () => new THREE.Vector3());
const segmentDirection = new THREE.Vector3();

function layHose(meshes: (THREE.Mesh | null)[], workerX: number, workerZ: number) {
  const reelX = TRUCK_X + REEL_X;
  hosePoints[0].set(reelX - 0.15, 0.95, LANE_Z - 0.3);
  hosePoints[1].set(reelX - 0.35, 0.05, LANE_Z - 1.0);
  hosePoints[2].set(reelX - 0.55, 0.17, KERB_Z[0] + 0.1);
  hosePoints[3].set(reelX - 0.9, 0.1, DRIVE.z[1] - 1.2);
  hosePoints[4].set(workerX + 0.45, 0.1, workerZ - 0.1);
  hosePoints[5].set(workerX + 0.13, 0.95, workerZ + 0.34);
  meshes.forEach((mesh, index) => {
    if (!mesh) return;
    const a = hosePoints[index];
    const b = hosePoints[index + 1];
    segmentDirection.subVectors(b, a);
    const length = segmentDirection.length();
    mesh.position.copy(a).addScaledVector(segmentDirection, 0.5);
    mesh.quaternion.setFromUnitVectors(UP, segmentDirection.normalize());
    mesh.scale.set(1, length, 1);
  });
}

/* The job: the driveway and patio surfaces, the truck, the crew and the hose. */

const SEGMENT = new THREE.CylinderGeometry(0.035, 0.035, 1, 8);
const WET_DEPTH = 1.1;
const ARRIVE_FROM = 38;
const LEAVE_TO = 46;

function Job({ step, instant, onPick }: { step: number; instant: boolean; onPick?: (target: PickTarget) => void }) {
  const s = useMemo(() => surfaces(), []);
  const [moves, setMoves] = useState({ step, from: step });
  if (moves.step !== step) setMoves({ step, from: moves.step });
  const forward = step > moves.from;
  const fromParked = moves.from >= 3;
  const arrive = useTween(step >= 3 ? 1 : 0, instant || step < 3 || (step >= 4 && !fromParked), 2600);
  const leave = useTween(step >= 5 ? 1 : 0, instant || step < 5 || !fromParked, 2600);
  const clean = useTween(CLEANED[step], instant || !forward, step === 5 ? 900 : 3200);
  const patio = useTween(PATIO_CLEANED[step], instant || !forward, 1200);
  const cleaning = step === 4;
  useContinuous(cleaning && !instant);

  const kit = useMemo(() => {
    const width = DRIVE.x[1] - DRIVE.x[0];
    const unit = new THREE.PlaneGeometry(width, 1).rotateX(-Math.PI / 2).translate(DRIVE_MID_X, 0, 0.5);
    const wet = new THREE.PlaneGeometry(width, WET_DEPTH).rotateX(-Math.PI / 2).translate(DRIVE_MID_X, 0, -WET_DEPTH / 2);
    const joints = merge([
      ...[1, 2, 3].map((index) => bx(DRIVE.x, [0.1, 0.104], [DRIVE.z[0] + (index * DRIVE_LENGTH) / 4 - 0.025, DRIVE.z[0] + (index * DRIVE_LENGTH) / 4 + 0.025], 0.001)),
      bx([DRIVE_MID_X - 0.025, DRIVE_MID_X + 0.025], [0.1, 0.104], DRIVE.z, 0.001),
    ]);
    return { slab: bx(DRIVE.x, [0, 0.07], DRIVE.z, 0.02), dirt: flat(DRIVE, 0.08), unit, wet, joints, patioSlab: bx(PATIO.x, [0, 0.07], PATIO.z, 0.02), patioTop: flat(PATIO, 0.08), patioDirt: flat(PATIO, 0.09) };
  }, []);

  const truck = useRef<THREE.Group>(null);
  const cleaned = useRef<THREE.Mesh>(null);
  const wet = useRef<THREE.Mesh>(null);
  const worker = useRef<THREE.Group>(null);
  const mist = useRef<THREE.InstancedMesh>(null);
  const hose = useRef<(THREE.Mesh | null)[]>([]);

  useFrame((state) => {
    const a = arrive.current;
    const l = leave.current;
    if (truck.current) {
      truck.current.position.x = TRUCK_X + (1 - a) * ARRIVE_FROM - l * LEAVE_TO;
      truck.current.visible = a > 0.001 && l < 0.999;
    }
    const progress = clean.current;
    const front = cleanFront(progress);
    if (cleaned.current) {
      cleaned.current.visible = progress > 0.001;
      cleaned.current.position.set(0, 0.09, DRIVE.z[0]);
      cleaned.current.scale.set(1, 1, Math.max(0.001, front - DRIVE.z[0]));
    }
    if (wet.current) {
      wet.current.visible = cleaning && progress > 0.02;
      wet.current.position.set(0, 0.095, front);
    }
    const dirt = surfaces().patioDirt;
    dirt.opacity = 0.92 * (1 - patio.current);
    dirt.visible = patio.current < 0.999;
    const onSite = cleaning && a > 0.999;
    const time = instant ? 0.6 : state.clock.elapsedTime;
    const sweep = instant ? 0 : Math.sin(time * 1.2);
    const workerX = DRIVE_MID_X - 0.15 + sweep * 1.3;
    const workerZ = front - WORKER_BACK;
    if (worker.current) {
      worker.current.visible = onSite;
      worker.current.position.set(workerX, 0.08, workerZ);
      worker.current.rotation.y = sweep * 0.22;
    }
    if (mist.current && onSite) placeMist(mist.current, time);
    for (const mesh of hose.current) if (mesh) mesh.visible = onSite;
    if (onSite) layHose(hose.current, workerX, workerZ);
  });

  return (
    <group>
      <Part geometry={kit.slab} material={M.slabSide} />
      <mesh geometry={kit.dirt} material={s.drive} receiveShadow />
      <mesh ref={cleaned} geometry={kit.unit} material={M.clean} receiveShadow visible={false} />
      <mesh ref={wet} geometry={kit.wet} material={M.wet} visible={false} />
      <mesh geometry={kit.joints} material={M.joint} receiveShadow />
      <Part geometry={kit.patioSlab} material={M.slabSide} />
      <mesh geometry={kit.patioTop} material={s.pavers} receiveShadow />
      <mesh geometry={kit.patioDirt} material={s.patioDirt} receiveShadow />
      <group ref={truck} position={[TRUCK_X + ARRIVE_FROM, 0, LANE_Z]} visible={false} {...pickHandlers(onPick ? () => onPick("truck") : undefined)}>
        <Truck selected={step === 3} />
      </group>
      <Worker group={worker} mist={mist} />
      {Array.from({ length: HOSE_POINTS - 1 }, (_, index) => (
        <mesh key={index} ref={(mesh) => { hose.current[index] = mesh; }} geometry={SEGMENT} material={M.hose} visible={false} castShadow />
      ))}
    </group>
  );
}

/* Camera: one framing per step, plus the crew framing on the truck and work area. */

const VIEWS: Record<"inquiry" | "estimate" | "street" | "site" | "crew" | "paid", View> = {
  inquiry: { position: [14, 17, 36], target: [-1.8, 0.9, 2.2], narrow: { position: [7, 30, 44], target: [-2, 0.5, -0.5] } },
  estimate: { position: [22, 30, 21], target: [1.2, 0, -1.2], narrow: { position: [15, 50, 32], target: [-1.6, 0, -1.5] } },
  street: { position: [21, 9.5, 31], target: [1.8, 0.8, 8.2], narrow: { position: [12, 17, 37], target: [1.2, 0.6, 6.5] } },
  site: { position: [19, 11, 29], target: [3, 0.6, 6], narrow: { position: [12, 20, 40], target: [2.4, 0.5, 5.6] } },
  crew: { position: [15, 6.5, 21], target: [3.4, 0.7, 7.6], narrow: { position: [11, 13, 36], target: [2.4, 0.6, 7.6] } },
  paid: { position: [13, 19, 36], target: [-0.5, 0.8, 2], narrow: { position: [8, 31, 45], target: [-1.5, 0.5, -0.5] } },
};
const STEP_VIEWS = ["inquiry", "estimate", "estimate", "street", "site", "paid"] as const;

export default function CanesScene({ active, instant, onReady, step, view, onPick }: Props) {
  const labels = useMemo(() => chipsFor(step), [step]);
  const areas = areaState(step);
  return (
    <ModelCanvas active={active} instant={instant} onReady={onReady} view={VIEWS[view === "crew" ? "crew" : STEP_VIEWS[step]]} labels={labels} extent={18} center={[0, 0, 2]} fog={[55, 120]}>
      <Ground />
      <Site />
      <House selected={step === 0 || step === 5} onPick={onPick ? () => onPick("house") : undefined} />
      <Job step={step} instant={instant} onPick={onPick} />
      <AreaOverlay rect={DRIVE} state={areas} y={0.12} />
      <AreaOverlay rect={PATIO} state={areas} y={0.12} />
    </ModelCanvas>
  );
}
