"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type CSSProperties, type ReactNode, type RefObject } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import styles from "./equipment-rental.module.css";
import {
  ARM_Z, BOOM_CYLINDER_LUG, BOOM_HOSE_PATH, BOOM_OUTLINE, BOOM_PIVOT, BUCKET_OUTLINE, CAB_OUTLINE, CAB_Z, COUNTERWEIGHT_OUTLINE, HOUSE, POSES,
  STICK_CYLINDER_BASE, STICK_HOSE_PATH, STICK_OUTLINE, TRACK, TRANSPORT_DUNNAGE, armFrame, lowestPoint, onBoom, onStick, toolOutline,
  type Box, type Pose, type Tool, type Vec,
} from "./equipment-rental-geometry";
import { BREAKER, EX014, EX027, TRANSPORT } from "./equipment-rental-fleet";

export type MatchFocus = "attachment" | "capability" | "transport" | "availability" | "inspection";
export type DeliveryFocus = "overview" | "machine" | "attachment" | "transport" | "site";
export type RentalFocus = "ex014" | "ex027" | "both";
export type ReturnArea = "overall" | "sidePanel" | "attachment" | "undercarriage" | "meter";
export type MachineId = typeof EX014 | typeof EX027;

export type SceneProps = { onReady: () => void; active: boolean } & (
  | { kind: "match"; focus: MatchFocus; machine: MachineId; documented: boolean; onPick: (machine: MachineId, focus?: MatchFocus) => void }
  | { kind: "delivery"; focus: DeliveryFocus; transport: boolean; site: boolean; onPick: (focus: DeliveryFocus) => void }
  | { kind: "rental"; focus: RentalFocus; conflict: boolean; onPick: (focus: RentalFocus) => void }
  | { kind: "return"; area: ReturnArea; stage: number; stacked: boolean }
);

/* Shared conventions: yellow tint plus ink edges for selection, blue for
   proposed or OK, red for blocked, white HTML chips with an ink leader. */

const INK = "#17191a";
const SELECT = "#fed603";
const OK = "#007dfe";
const BLOCKED = "#f51625";
const GROUND = "#f5f5f2";

const physical = (color: string, roughness: number, extra: THREE.MeshPhysicalMaterialParameters = {}) => new THREE.MeshPhysicalMaterial({ color, roughness, metalness: 0, ...extra });
const standard = (color: string, roughness: number, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });

const M = {
  paint: physical("#b9bbb8", 0.46, { clearcoat: 0.3, clearcoatRoughness: 0.5, envMapIntensity: 0.55 }),
  paintShade: physical("#9c9e9c", 0.5, { clearcoat: 0.2, clearcoatRoughness: 0.55, envMapIntensity: 0.55 }),
  graphite: standard("#3c3f41", 0.6, 0.25),
  track: standard("#2c2e30", 0.74, 0.35),
  steel: standard("#83878a", 0.42, 0.6),
  darkSteel: standard("#4d5154", 0.48, 0.55),
  chrome: standard("#e7e9ea", 0.16, 1),
  rubber: standard("#1c1e1f", 0.7),
  glass: physical("#2b3943", 0.06, { transparent: true, opacity: 0.5, envMapIntensity: 1.4 }),
  interior: standard("#222426", 0.82),
  lens: standard("#5b5e60", 0.28, 0.2),
  timber: standard("#a08d6d", 0.9),
  pad: standard("#e3e3df", 0.95),
  quarryFloor: standard("#e6e2da", 0.96),
  rock: standard("#c4bfb4", 0.94),
  rockDark: standard("#a39d90", 0.9),
  ghost: physical("#dfe3e8", 0.6, { transparent: true, opacity: 0.32, depthWrite: false }),
};
type MaterialKey = keyof typeof M;

const tintCache = new Map<THREE.Material, THREE.Material>();
function tinted(material: THREE.Material) {
  const cached = tintCache.get(material);
  if (cached) return cached;
  const copy = (material as THREE.MeshStandardMaterial).clone();
  copy.color.lerp(new THREE.Color(SELECT), 0.72);
  tintCache.set(material, copy);
  return copy;
}

const EDGE_INK = new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.85 });
const EDGE_GHOST = new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.3 });
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

function rbox(x: Vec, y: Vec, z: Vec, radius = 0.03) {
  const width = x[1] - x[0];
  const height = y[1] - y[0];
  const depth = z[1] - z[0];
  const r = Math.min(radius, width / 2.2, height / 2.2, depth / 2.2);
  return new RoundedBoxGeometry(width, height, depth, 2, r).translate((x[0] + x[1]) / 2, (y[0] + y[1]) / 2, (z[0] + z[1]) / 2);
}
const fromBox = (box: Box, radius?: number) => rbox(box.x, box.y, box.z, radius);

function extrude(outline: Vec[], z0: number, z1: number, bevel = 0.025) {
  const shape = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y)));
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: z1 - z0 - bevel * 2, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: 10 });
  geometry.translate(0, 0, z0 + bevel);
  return geometry;
}

function cylinder(radius: number, length: number, axis: "x" | "y" | "z", center: [number, number, number], segments = 24, radiusEnd = radius) {
  const geometry = new THREE.CylinderGeometry(radiusEnd, radius, length, segments);
  if (axis === "x") geometry.rotateZ(-Math.PI / 2);
  if (axis === "z") geometry.rotateX(Math.PI / 2);
  return geometry.translate(...center);
}

function between(a: Vec, b: Vec, z: number, radius: number, segments = 18) {
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const geometry = new THREE.CylinderGeometry(radius, radius, length, segments);
  geometry.rotateZ(Math.atan2(b[1] - a[1], b[0] - a[0]) - Math.PI / 2);
  return geometry.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z);
}

function plate(a: Vec, b: Vec, z: number, width: number, thickness: number) {
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]) + width;
  const geometry = new RoundedBoxGeometry(length, width, thickness, 2, Math.min(width, thickness) / 2.4);
  geometry.rotateZ(Math.atan2(b[1] - a[1], b[0] - a[0]));
  return geometry.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z);
}

function merge(parts: THREE.BufferGeometry[]) {
  const prepared = parts.map((part) => (part.index ? part.toNonIndexed() : part));
  prepared.forEach((part) => { if (!part.attributes.uv) part.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(part.attributes.position.count * 2), 2)); });
  return mergeGeometries(prepared) ?? new THREE.BufferGeometry();
}

/* Undercarriage: links follow an inset track loop so the shoes wrap the idler
   and sprocket instead of floating outside them. */

const SHOE = { pitch: 0.207, length: 0.17, thickness: 0.08, grouser: 0.05 };

function trackLoop(center: number) {
  const r = TRACK.height / 2 - SHOE.thickness / 2;
  const reach = TRACK.length / 2 - TRACK.height / 2;
  const straight = reach * 2;
  const arc = Math.PI * r;
  const perimeter = straight * 2 + arc * 2;
  const count = Math.round(perimeter / SHOE.pitch);
  const shoes: THREE.BufferGeometry[] = [];
  for (let index = 0; index < count; index++) {
    const s = (index / count) * perimeter;
    let point: Vec;
    let normal: Vec;
    if (s < straight) {
      point = [reach - s, SHOE.thickness / 2];
      normal = [0, -1];
    } else if (s < straight + arc) {
      const angle = -Math.PI / 2 - (s - straight) / r;
      point = [-reach + Math.cos(angle) * r, TRACK.height / 2 + Math.sin(angle) * r];
      normal = [Math.cos(angle), Math.sin(angle)];
    } else if (s < straight * 2 + arc) {
      point = [-reach + (s - straight - arc), TRACK.height - SHOE.thickness / 2];
      normal = [0, 1];
    } else {
      const angle = Math.PI / 2 - (s - straight * 2 - arc) / r;
      point = [reach + Math.cos(angle) * r, TRACK.height / 2 + Math.sin(angle) * r];
      normal = [Math.cos(angle), Math.sin(angle)];
    }
    const shoe = new THREE.BoxGeometry(SHOE.length, SHOE.thickness, TRACK.width);
    const grouser = new THREE.BoxGeometry(0.035, SHOE.grouser, TRACK.width).translate(0.03, -(SHOE.thickness + SHOE.grouser) / 2 + 0.01, 0);
    const link = merge([shoe, grouser]);
    link.rotateZ(Math.atan2(normal[0], -normal[1]));
    link.translate(point[0], point[1], center);
    shoes.push(link);
  }
  return merge(shoes);
}

function sprocket(x: number, center: number, side: number) {
  const parts: THREE.BufferGeometry[] = [cylinder(0.3, 0.3, "z", [x, TRACK.height / 2, center], 28)];
  for (let tooth = 0; tooth < 13; tooth++) {
    const angle = (tooth / 13) * Math.PI * 2;
    parts.push(new THREE.BoxGeometry(0.07, 0.07, 0.26).translate(0.31, 0, 0).rotateZ(angle).translate(x, TRACK.height / 2, center));
  }
  parts.push(cylinder(0.17, 0.42, "z", [x, TRACK.height / 2, center], 24));
  parts.push(cylinder(0.25, 0.1, "z", [x, TRACK.height / 2, center + side * 0.24], 24));
  for (let bolt = 0; bolt < 8; bolt++) {
    const angle = (bolt / 8) * Math.PI * 2;
    parts.push(cylinder(0.018, 0.03, "z", [x + Math.cos(angle) * 0.19, TRACK.height / 2 + Math.sin(angle) * 0.19, center + side * 0.3], 8));
  }
  return merge(parts);
}

function undercarriage() {
  const half = TRACK.gauge / 2;
  const reach = TRACK.length / 2 - TRACK.height / 2;
  const frames: THREE.BufferGeometry[] = [rbox([-1.1, 1.1], [0.42, 0.86], [-0.76, 0.76], 0.05)];
  const rollers: THREE.BufferGeometry[] = [];
  const shoes: THREE.BufferGeometry[] = [];
  const wheels: THREE.BufferGeometry[] = [];
  ([1, -1] as const).forEach((side) => {
    const center = side * half;
    shoes.push(trackLoop(center));
    frames.push(rbox([-1.62, 1.62], [0.31, 0.6], [center - 0.22, center + 0.22], 0.05));
    frames.push(rbox([-0.5, 0.5], [0.46, 0.7], [side * 0.7, side * (half - 0.15)].sort((a, b) => a - b) as Vec, 0.04));
    [-1.35, -0.8, -0.27, 0.27, 0.8, 1.35].forEach((x) => {
      rollers.push(cylinder(0.11, 0.4, "z", [x, SHOE.thickness + 0.11, center], 18));
      rollers.push(cylinder(0.05, 0.48, "z", [x, SHOE.thickness + 0.11, center], 10));
    });
    [-0.65, 0.65].forEach((x) => rollers.push(cylinder(0.075, 0.3, "z", [x, TRACK.height - SHOE.thickness - 0.075, center], 16)));
    wheels.push(cylinder(0.34, 0.42, "z", [reach, TRACK.height / 2, center], 30));
    wheels.push(cylinder(0.12, 0.5, "z", [reach, TRACK.height / 2, center], 16));
    wheels.push(sprocket(-reach, center, side));
  });
  return { shoes: merge(shoes), frames: merge(frames), rollers: merge(rollers), wheels: merge(wheels), swing: cylinder(1.02, 0.12, "y", [0, 0.92, 0], 40) };
}

function louvers(x: Vec, y: Vec, z: number, count: number, axis: "vertical" | "horizontal", facing: 1 | -1 = 1) {
  const parts: THREE.BufferGeometry[] = [];
  for (let index = 0; index < count; index++) {
    const t = (index + 0.5) / count;
    if (axis === "horizontal") parts.push(rbox([x[0], x[1]], [y[0] + (y[1] - y[0]) * t - 0.012, y[0] + (y[1] - y[0]) * t + 0.012], [z, z + facing * 0.02].sort((a, b) => a - b) as Vec, 0.008));
    else parts.push(rbox([x[0] + (x[1] - x[0]) * t - 0.012, x[0] + (x[1] - x[0]) * t + 0.012], [y[0], y[1]], [z, z + facing * 0.02].sort((a, b) => a - b) as Vec, 0.008));
  }
  return merge(parts);
}

function fasteners(points: [number, number, number][], axis: "x" | "y" | "z") {
  return merge(points.map((point) => cylinder(0.016, 0.02, axis, point, 8)));
}

function house() {
  const sp = HOUSE.sidePanel;
  const glassSide: Vec[] = [[0.06, 1.98], [1.17, 1.98], [1.06, 2.86], [0.06, 2.86]];
  const frameSide: Vec[] = [[0.02, 1.94], [1.21, 1.94], [1.09, 2.9], [0.02, 2.9]];
  const frontAngle = Math.atan2(2.98 - 2.12, 1.12 - 1.32);
  const frontGlass = new THREE.BoxGeometry(0.02, 0.74, CAB_Z[1] - CAB_Z[0] - 0.18).rotateZ(frontAngle - Math.PI / 2).translate(1.25, 2.54, (CAB_Z[0] + CAB_Z[1]) / 2);
  return {
    deck: fromBox(HOUSE.deck, 0.04),
    hood: fromBox(HOUSE.hood, 0.06),
    hoodGrille: merge([
      rbox([-1.08, -0.32], [2.195, 2.205], [-0.05, 1.0], 0.004),
      rbox([-1.08, -0.36], [1.34, 1.78], [1.198, 1.206], 0.004),
    ]),
    hoodLouvers: merge([
      louvers([-1.04, -0.36], [2.2, 2.2], 0, 1, "vertical"),
      ...Array.from({ length: 8 }, (_, index) => rbox([-1.04 + index * 0.09, -0.99 + index * 0.09], [2.2, 2.222], [0, 0.95], 0.008)),
      louvers([-1.04, -0.4], [1.38, 1.74], 1.206, 7, "horizontal"),
    ]),
    hoodFasteners: fasteners([[-1.16, 1.22, 1.205], [-0.2, 1.22, 1.205], [-1.16, 2.12, 1.205], [-0.2, 2.12, 1.205]], "z"),
    counterweight: extrude(COUNTERWEIGHT_OUTLINE, -1.25, 1.25, 0.05),
    counterweightTrim: merge([
      rbox([-1.97, -1.94], [1.83, 1.86], [-1.18, 1.18], 0.008),
      rbox([-1.97, -1.94], [1.36, 1.39], [-1.18, 1.18], 0.008),
    ]),
    tailLights: merge([rbox([-1.98, -1.94], [1.5, 1.64], [0.96, 1.14], 0.012), rbox([-1.98, -1.94], [1.5, 1.64], [-1.14, -0.96], 0.012)]),
    liftingEyes: merge([-0.85, 0.85].map((z) => new THREE.TorusGeometry(0.07, 0.022, 10, 20).translate(-1.48, 2.24, z))),
    exhaust: merge([cylinder(0.055, 0.42, "y", [-0.78, 2.41, 0.78], 18), cylinder(0.07, 0.04, "y", [-0.78, 2.63, 0.78], 18)]),
    intake: merge([cylinder(0.075, 0.18, "y", [-0.38, 2.29, 0.42], 18), cylinder(0.09, 0.06, "y", [-0.38, 2.41, 0.42], 18)]),
    compartment: fromBox(HOUSE.compartment, 0.05),
    sidePanel: rbox(sp.x, sp.y, sp.z, 0.012),
    sidePanelHardware: merge([
      rbox([0.02, 0.1], [1.5, 1.62], [1.275, 1.292], 0.008),
      cylinder(0.018, 0.12, "y", [1.135, 1.36, 1.278], 10),
      cylinder(0.018, 0.12, "y", [1.135, 1.73, 1.278], 10),
      fasteners([[0.03, 1.25, 1.282], [1.08, 1.25, 1.282], [0.03, 1.84, 1.282], [1.08, 1.84, 1.282]], "z"),
    ]),
    sidePanelLouvers: louvers([0.16, 0.42], [1.66, 1.82], 1.275, 5, "vertical"),
    rails: merge([
      cylinder(0.022, 0.5, "y", [-0.04, 2.2, 1.19], 10),
      cylinder(0.022, 0.5, "y", [1.14, 2.2, 1.19], 10),
      cylinder(0.022, 1.2, "x", [0.55, 2.45, 1.19], 10),
      cylinder(0.022, 0.32, "y", [-1.15, 2.36, 1.14], 10),
      cylinder(0.022, 0.32, "y", [-0.22, 2.36, 1.14], 10),
      cylinder(0.022, 0.95, "x", [-0.685, 2.52, 1.14], 10),
    ]),
    step: merge([rbox([1.25, 1.42], [0.98, 1.02], [0.72, 1.18], 0.01), rbox([0.6, 1.0], [0.78, 0.81], [1.3, 1.42], 0.008)]),
    cab: extrude(CAB_OUTLINE, CAB_Z[0], CAB_Z[1], 0.035),
    cabRoof: rbox([-0.16, 1.18], [2.98, 3.03], [CAB_Z[0] - 0.03, CAB_Z[1] + 0.03], 0.02),
    windowFrames: merge([
      extrude(frameSide, CAB_Z[0] - 0.008, CAB_Z[0] - 0.002, 0),
      extrude(frameSide, CAB_Z[1] + 0.002, CAB_Z[1] + 0.008, 0),
      rbox([-0.106, -0.1], [2.2, 2.86], [CAB_Z[0] + 0.06, CAB_Z[1] - 0.06], 0.002),
      rbox([0.72, 0.735], [1.24, 1.92], [CAB_Z[0] - 0.008, CAB_Z[0] - 0.002], 0.002),
    ]),
    glass: merge([
      extrude(glassSide, CAB_Z[0] - 0.016, CAB_Z[0] - 0.009, 0),
      extrude(glassSide, CAB_Z[1] + 0.009, CAB_Z[1] + 0.016, 0),
      frontGlass,
      rbox([-0.114, -0.107], [2.24, 2.82], [CAB_Z[0] + 0.1, CAB_Z[1] - 0.1], 0.002),
    ]),
    cabInterior: merge([
      rbox([0.18, 0.62], [1.4, 1.62], [-0.98, -0.56], 0.04),
      rbox([0.12, 0.26], [1.6, 2.28], [-0.96, -0.58], 0.04),
      rbox([0.82, 1.14], [1.4, 1.76], [-0.6, -0.36], 0.03),
    ]),
    meter: rbox([0.96, 1.12], [1.77, 1.92], [-0.53, -0.38], 0.01),
    mirror: merge([
      cylinder(0.014, 0.42, "y", [1.3, 2.18, -1.3], 8),
      rbox([1.26, 1.34], [2.32, 2.52], [-1.42, -1.3], 0.012),
    ]),
    handle: rbox([0.6, 0.66], [1.66, 1.7], [CAB_Z[0] - 0.03, CAB_Z[0] - 0.004], 0.008),
    wiper: new THREE.BoxGeometry(0.01, 0.55, 0.018).rotateZ(frontAngle - Math.PI / 2 + 0.12).translate(1.27, 2.42, -0.6),
  };
}

function boom() {
  return {
    beam: extrude(BOOM_OUTLINE, ARM_Z - 0.25, ARM_Z + 0.25, 0.035),
    bosses: merge([
      cylinder(0.17, 0.62, "z", [0, 0, ARM_Z], 26),
      cylinder(0.15, 0.6, "z", [5.6, 0, ARM_Z], 24),
      cylinder(0.11, 0.86, "z", [BOOM_CYLINDER_LUG[0], BOOM_CYLINDER_LUG[1], ARM_Z], 20),
      cylinder(0.1, 0.34, "z", [STICK_CYLINDER_BASE[0], STICK_CYLINDER_BASE[1], ARM_Z], 20),
    ]),
    foot: merge([cylinder(0.12, 0.7, "z", [BOOM_PIVOT[0], BOOM_PIVOT[1], ARM_Z], 20), rbox([0.5, 1.05], [1.14, 1.62], [ARM_Z - 0.36, ARM_Z + 0.36], 0.04)]),
  };
}

function stick() {
  return {
    beam: extrude(STICK_OUTLINE, ARM_Z - 0.21, ARM_Z + 0.21, 0.03),
    bosses: merge([
      cylinder(0.15, 0.5, "z", [0, 0, ARM_Z], 24),
      cylinder(0.12, 0.48, "z", [2.85, 0, ARM_Z], 22),
      cylinder(0.1, 0.48, "z", [-0.6, 0.2, ARM_Z], 20),
      cylinder(0.08, 0.3, "z", [0.25, 0.36, ARM_Z], 18),
    ]),
  };
}

function bucket() {
  const teeth: THREE.BufferGeometry[] = [];
  const edgeA: Vec = [1.18, -0.82];
  const edgeB: Vec = [1.02, -0.78];
  const tip: Vec = [(edgeA[0] + edgeB[0]) / 2, (edgeA[1] + edgeB[1]) / 2];
  const direction = Math.atan2(-0.34, -0.12);
  for (let index = 0; index < 5; index++) {
    const z = ARM_Z - 0.44 + index * 0.22;
    const tooth = new THREE.CylinderGeometry(0.012, 0.06, 0.2, 4).rotateY(Math.PI / 4).rotateZ(direction - Math.PI / 2);
    teeth.push(tooth.translate(tip[0] + Math.cos(direction) * 0.08, tip[1] + Math.sin(direction) * 0.08, z));
  }
  return {
    shell: extrude(BUCKET_OUTLINE, ARM_Z - 0.55, ARM_Z + 0.55, 0.03),
    teeth: merge(teeth),
    coupler: merge([rbox([-0.18, 0.18], [-0.22, 0.26], [ARM_Z - 0.32, ARM_Z + 0.32], 0.03), cylinder(0.08, 0.72, "z", [0, 0, ARM_Z], 18), cylinder(0.07, 0.72, "z", [0.02, 0.3, ARM_Z], 18)]),
  };
}

function breaker() {
  const z = ARM_Z;
  const bolts: [number, number, number][] = [];
  [0.53, 1.87].forEach((x) => [-0.17, 0.17].forEach((y) => [-0.17, 0.17].forEach((dz) => bolts.push([x, y, z + dz]))));
  return {
    bracket: merge([
      rbox([-0.12, 0.55], [-0.28, 0.28], [z - 0.27, z + 0.27], 0.04),
      rbox([-0.14, 0.5], [-0.32, 0.32], [z + 0.27, z + 0.31], 0.015),
      rbox([-0.14, 0.5], [-0.32, 0.32], [z - 0.31, z - 0.27], 0.015),
      cylinder(0.08, 0.7, "z", [0, 0, z], 18),
      cylinder(0.07, 0.7, "z", [0.02, 0.3, z], 18),
    ]),
    housing: rbox([0.55, 1.85], [-0.25, 0.25], [z - 0.25, z + 0.25], 0.06),
    wearPlates: merge([rbox([0.78, 1.62], [-0.16, 0.16], [z + 0.25, z + 0.27], 0.01), rbox([0.78, 1.62], [-0.16, 0.16], [z - 0.27, z - 0.25], 0.01)]),
    bolts: merge(bolts.map((point) => cylinder(0.03, 0.05, "x", point, 10))),
    head: merge([cylinder(0.2, 0.15, "x", [1.925, 0, z], 28), cylinder(0.12, 0.06, "x", [2.03, 0, z], 22)]),
    chisel: merge([cylinder(0.075, 0.3, "x", [2.21, 0, z], 18), cylinder(0.075, 0.09, "x", [2.405, 0, z], 18, 0.01)]),
    ports: merge([cylinder(0.03, 0.09, "y", [0.72, 0.29, z - 0.1], 12), cylinder(0.03, 0.09, "y", [0.72, 0.29, z + 0.1], 12)]),
  };
}

type Kit = ReturnType<typeof buildKit>;
function buildKit() {
  return { under: undercarriage(), house: house(), boom: boom(), stick: stick(), bucket: bucket(), breaker: breaker() };
}
let kit: Kit | null = null;
const getKit = () => (kit ??= buildKit());

const BARREL: Record<"boom" | "stick" | "tool", [number, number]> = { boom: [0.1, 0.055], stick: [0.1, 0.055], tool: [0.085, 0.045] };

function hydraulicCylinder([a, b]: [Vec, Vec], z: number, [barrel, rod]: [number, number]) {
  const end: Vec = [a[0] + (b[0] - a[0]) * 0.6, a[1] + (b[1] - a[1]) * 0.6];
  const cap: Vec = [a[0] + (b[0] - a[0]) * 0.585, a[1] + (b[1] - a[1]) * 0.585];
  return {
    barrel: merge([between(a, end, z, barrel), between(cap, end, z, barrel + 0.016), cylinder(barrel * 0.95, 0.12, "z", [a[0], a[1], z], 18)]),
    rod: between(cap, b, z, rod),
    eye: cylinder(rod * 1.5, 0.12, "z", [b[0], b[1], z], 16),
  };
}

function hosePath(points: Vec[], z: number) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, y]) => new THREE.Vector3(x, y, z)), false, "centripetal");
  return new THREE.TubeGeometry(curve, 160, 0.022, 7, false);
}

function sampleLine(a: Vec, b: Vec, count: number, map: (point: Vec) => Vec) {
  return Array.from({ length: count }, (_, index) => map([a[0] + (b[0] - a[0]) * (index / count), a[1] + (b[1] - a[1]) * (index / count)]));
}

// Hoses ride the boom's upper face, wrap over the nose pin and run down the
// stick's outer face, keeping clear of the cylinders.
function hoseRoute(frame: ReturnType<typeof armFrame>, end: Vec): Vec[] {
  const boomTop = BOOM_HOSE_PATH;
  const stickTop = STICK_HOSE_PATH;
  const toBoom = (point: Vec) => onBoom(frame, point);
  const toStick = (point: Vec) => onStick(frame, point);
  const nose: Vec[] = [];
  const radius = 0.44;
  const start = frame.boomAngle + Math.PI / 2 - 0.35;
  let finish = frame.stickAngle + Math.PI / 2;
  while (finish > start) finish -= Math.PI * 2;
  if (start - finish > Math.PI * 1.5) finish += Math.PI * 2;
  for (let index = 1; index < 6; index++) {
    const angle = start + (finish - start) * (index / 6);
    nose.push([frame.stickPivot[0] + Math.cos(angle) * radius, frame.stickPivot[1] + Math.sin(angle) * radius]);
  }
  return [
    ...sampleLine([boomTop[0][0] + 0.25, boomTop[0][1] + 0.04], boomTop[1], 8, toBoom),
    ...sampleLine(boomTop[1], [5.25, boomTop[2][1] + 0.02], 8, toBoom),
    toBoom([5.25, boomTop[2][1] + 0.02]),
    ...nose,
    ...sampleLine([0.3, stickTop[1][1] - 0.01], [2.25, stickTop[2][1] + 0.02], 6, toStick),
    toStick([2.25, stickTop[2][1] + 0.02]),
    end,
  ];
}

const armCache = new Map<string, ReturnType<typeof buildArm>>();
function buildArm(pose: Pose, tool: Tool) {
  const frame = armFrame(pose);
  const { cylinders } = frame;
  const boomPair = [ARM_Z - 0.33, ARM_Z + 0.33].map((z) => hydraulicCylinder(cylinders.boom, z, BARREL.boom));
  const stickCyl = hydraulicCylinder(cylinders.stick, ARM_Z, BARREL.stick);
  const toolCyl = hydraulicCylinder(cylinders.tool, ARM_Z, BARREL.tool);
  const rodEnd = cylinders.tool[1];
  const linkToStick = onStick(frame, [2.62, 0.02]);
  const linkToTool: Vec = [frame.toolPivot[0] + Math.cos(frame.toolAngle + 1.45) * 0.3, frame.toolPivot[1] + Math.sin(frame.toolAngle + 1.45) * 0.3];
  const toolEnd = tool === "breaker"
    ? [frame.toolPivot[0] + Math.cos(frame.toolAngle) * 0.72 - Math.sin(frame.toolAngle) * 0.36, frame.toolPivot[1] + Math.sin(frame.toolAngle) * 0.72 + Math.cos(frame.toolAngle) * 0.36] as Vec
    : onStick(frame, [2.3, 0.32]);
  const hoses = [-0.15, 0.15].map((dz) => hosePath(hoseRoute(frame, toolEnd), ARM_Z + dz));
  return {
    frame,
    barrels: merge([...boomPair.map((part) => part.barrel), stickCyl.barrel, toolCyl.barrel]),
    rods: merge([...boomPair.map((part) => part.rod), stickCyl.rod, toolCyl.rod]),
    eyes: merge([...boomPair.map((part) => part.eye), stickCyl.eye, toolCyl.eye]),
    links: merge([plate(rodEnd, linkToStick, ARM_Z - 0.13, 0.1, 0.04), plate(rodEnd, linkToStick, ARM_Z + 0.13, 0.1, 0.04), plate(rodEnd, linkToTool, ARM_Z, 0.12, 0.18)]),
    hoses: merge(hoses),
  };
}
function getArm(pose: Pose, tool: Tool) {
  const key = `${pose.boom}:${pose.stick}:${pose.tool}:${tool}`;
  let arm = armCache.get(key);
  if (!arm) {
    arm = buildArm(pose, tool);
    armCache.set(key, arm);
  }
  return arm;
}

/* Rendering primitives */

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

type PartProps = { geometry: THREE.BufferGeometry; material: MaterialKey; selected?: boolean; ghost?: boolean; shadow?: boolean; fine?: boolean };

// Fine detail never draws a ghost outline, so planned loads read as silhouettes.
function Part({ geometry, material, selected, ghost, shadow = true, fine }: PartProps) {
  const base = M[material];
  const resolved = ghost ? (material === "glass" ? M.glass : M.ghost) : selected ? tinted(base) : base;
  return (
    <>
      <mesh geometry={geometry} material={resolved} castShadow={shadow && !ghost} receiveShadow={!ghost} />
      {(selected || (ghost && !fine)) && <lineSegments geometry={edgesOf(geometry)} material={ghost ? EDGE_GHOST : EDGE_INK} />}
    </>
  );
}

let decalFamily = "";
function fontFamily() {
  if (!decalFamily) {
    const root = document.querySelector(".pontian-root");
    decalFamily = root ? getComputedStyle(root).fontFamily : "sans-serif";
  }
  return decalFamily;
}

const decalCache = new Map<string, { texture: THREE.CanvasTexture; aspect: number }>();
function decalTexture(text: string) {
  const cached = decalCache.get(text);
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const size = 120;
  const font = `600 ${size}px ${fontFamily()}`;
  if (context) context.font = font;
  canvas.width = Math.ceil((context?.measureText(text).width ?? size * 3) + 40);
  canvas.height = Math.ceil(size * 1.3);
  if (context) {
    context.font = font;
    context.fillStyle = "#2a2c2e";
    context.textBaseline = "middle";
    context.fillText(text, 20, canvas.height / 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  const entry = { texture, aspect: canvas.width / canvas.height };
  decalCache.set(text, entry);
  return entry;
}

function Decal({ text, position, rotationY, height }: { text: string; position: [number, number, number]; rotationY: number; height: number }) {
  const { texture, aspect } = decalTexture(text);
  return (
    <mesh position={position} rotation={[0, rotationY, 0]} renderOrder={2}>
      <planeGeometry args={[height * aspect, height]} />
      <meshStandardMaterial map={texture} transparent roughness={0.5} depthWrite={false} polygonOffset polygonOffsetFactor={-2} />
    </mesh>
  );
}

let scuff: THREE.CanvasTexture | null = null;
function scuffTexture() {
  if (scuff) return scuff;
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  if (context) {
    context.lineCap = "round";
    [[40, 150, 250, 112, 9, 0.75], [80, 178, 330, 128, 5, 0.6], [140, 196, 430, 150, 3, 0.5], [60, 124, 190, 102, 3, 0.45]].forEach(([x0, y0, x1, y1, width, alpha]) => {
      context.strokeStyle = `rgba(52, 54, 56, ${alpha})`;
      context.lineWidth = width;
      context.beginPath();
      context.moveTo(x0, y0);
      context.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 - 18, x1, y1);
      context.stroke();
    });
  }
  scuff = new THREE.CanvasTexture(canvas);
  scuff.colorSpace = THREE.SRGBColorSpace;
  return scuff;
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

function ContactShadow({ width, depth, position = [0, 0.006, 0], opacity = 0.5 }: { width: number; depth: number; position?: [number, number, number]; opacity?: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={position} renderOrder={1}>
      <planeGeometry args={[width, depth]} />
      <meshBasicMaterial map={contactTexture()} transparent depthWrite={false} opacity={opacity} toneMapped={false} />
    </mesh>
  );
}

type Selection = Partial<Record<"tracks" | "body" | "sidePanel" | "cab" | "arm" | "coupler" | "tool", boolean>>;

type ExcavatorProps = {
  id: string;
  pose: Pose;
  tool: Tool;
  position?: [number, number, number];
  rotation?: number;
  selection?: Selection;
  ghost?: boolean;
  mark?: boolean;
  onPick?: (part: keyof Selection) => void;
};

function Excavator({ id, pose, tool, position = [0, 0, 0], rotation = 0, selection = {}, ghost, mark, onPick }: ExcavatorProps) {
  const { under, house: h, boom: b, stick: s, bucket: bk, breaker: br } = getKit();
  const arm = getArm(pose, tool);
  const { frame } = arm;
  const pick = (part: keyof Selection) => pickHandlers(onPick && (() => onPick(part)));
  const sel = selection;
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <group {...pick("tracks")}>
        <Part geometry={under.shoes} material="track" selected={sel.tracks} ghost={ghost} fine />
        <Part geometry={under.frames} fine material="graphite" ghost={ghost} shadow={false} />
        <Part geometry={under.rollers} fine material="darkSteel" ghost={ghost} shadow={false} />
        <Part geometry={under.wheels} fine material="darkSteel" ghost={ghost} shadow={false} />
        <Part geometry={under.swing} fine material="graphite" ghost={ghost} shadow={false} />
      </group>
      <group {...pick("body")}>
        <Part geometry={h.deck} material="graphite" ghost={ghost} />
        <Part geometry={h.hood} material="paint" selected={sel.body} ghost={ghost} />
        <Part geometry={h.hoodGrille} fine material="graphite" ghost={ghost} shadow={false} />
        <Part geometry={h.hoodLouvers} fine material="paint" ghost={ghost} shadow={false} />
        <Part geometry={h.hoodFasteners} fine material="darkSteel" ghost={ghost} shadow={false} />
        <Part geometry={h.counterweight} material="paintShade" selected={sel.body} ghost={ghost} />
        <Part geometry={h.counterweightTrim} fine material="graphite" ghost={ghost} shadow={false} />
        <Part geometry={h.tailLights} fine material="lens" ghost={ghost} shadow={false} />
        <Part geometry={h.liftingEyes} fine material="darkSteel" ghost={ghost} shadow={false} />
        <Part geometry={h.exhaust} fine material="darkSteel" ghost={ghost} />
        <Part geometry={h.intake} fine material="graphite" ghost={ghost} />
        <Part geometry={h.rails} fine material="graphite" ghost={ghost} />
        <Part geometry={h.step} fine material="darkSteel" ghost={ghost} shadow={false} />
      </group>
      <group {...pick("sidePanel")}>
        <Part geometry={h.compartment} material="paint" selected={sel.body} ghost={ghost} />
        <Part geometry={h.sidePanel} material="paint" selected={sel.sidePanel} ghost={ghost} />
        <Part geometry={h.sidePanelHardware} fine material="darkSteel" ghost={ghost} shadow={false} />
        <Part geometry={h.sidePanelLouvers} fine material="paintShade" ghost={ghost} shadow={false} />
      </group>
      <group {...pick("cab")}>
        <Part geometry={h.cab} material="paint" selected={sel.cab} ghost={ghost} />
        <Part geometry={h.cabRoof} fine material="paintShade" ghost={ghost} />
        <Part geometry={h.windowFrames} fine material="interior" ghost={ghost} shadow={false} />
        <Part geometry={h.cabInterior} fine material="interior" ghost={ghost} shadow={false} />
        <Part geometry={h.meter} fine material="lens" selected={sel.cab} ghost={ghost} shadow={false} />
        {!ghost && <mesh geometry={h.glass} material={M.glass} />}
        <Part geometry={h.mirror} fine material="graphite" ghost={ghost} />
        <Part geometry={h.handle} fine material="darkSteel" ghost={ghost} shadow={false} />
        <Part geometry={h.wiper} fine material="interior" ghost={ghost} shadow={false} />
      </group>
      <group {...pick("arm")}>
        <Part geometry={b.foot} fine material="graphite" ghost={ghost} />
        <group position={[BOOM_PIVOT[0], BOOM_PIVOT[1], 0]} rotation={[0, 0, frame.boomAngle]}>
          <Part geometry={b.beam} material="paint" selected={sel.arm} ghost={ghost} />
          <Part geometry={b.bosses} fine material="darkSteel" ghost={ghost} shadow={false} />
        </group>
        <group position={[frame.stickPivot[0], frame.stickPivot[1], 0]} rotation={[0, 0, frame.stickAngle]}>
          <Part geometry={s.beam} material="paint" selected={sel.arm} ghost={ghost} />
          <Part geometry={s.bosses} fine material="darkSteel" ghost={ghost} shadow={false} />
        </group>
        <Part geometry={arm.barrels} fine material="graphite" ghost={ghost} />
        <Part geometry={arm.rods} fine material="chrome" ghost={ghost} shadow={false} />
        <Part geometry={arm.eyes} fine material="darkSteel" ghost={ghost} shadow={false} />
        <Part geometry={arm.links} fine material="darkSteel" ghost={ghost} />
        <Part geometry={arm.hoses} fine material="rubber" ghost={ghost} shadow={false} />
      </group>
      <group position={[frame.toolPivot[0], frame.toolPivot[1], 0]} rotation={[0, 0, frame.toolAngle]}>
        {tool === "bucket" ? (
          <>
            <group {...pick("coupler")}><Part geometry={bk.coupler} material="darkSteel" selected={sel.coupler} ghost={ghost} /></group>
            <group {...pick("tool")}>
              <Part geometry={bk.shell} material="steel" selected={sel.tool} ghost={ghost} />
              <Part geometry={bk.teeth} fine material="darkSteel" ghost={ghost} />
            </group>
          </>
        ) : (
          <BreakerParts kitBreaker={br} selected={sel.tool} bracketSelected={sel.coupler || sel.tool} ghost={ghost} onPick={onPick && (() => onPick("tool"))} />
        )}
      </group>
      {!ghost && (
        <>
          <Decal text={id} position={[-1.957, 1.62, 0]} rotationY={-Math.PI / 2} height={0.26} />
          <Decal text={id} position={[-0.68, 1.96, 1.204]} rotationY={0} height={0.2} />
          <Decal text={id} position={[-0.68, 1.96, -1.204]} rotationY={Math.PI} height={0.2} />
        </>
      )}
      {mark && (
        <mesh position={[0.72, 1.5, 1.278]} renderOrder={3}>
          <planeGeometry args={[0.5, 0.25]} />
          <meshStandardMaterial map={scuffTexture()} transparent roughness={0.7} depthWrite={false} polygonOffset polygonOffsetFactor={-3} />
        </mesh>
      )}
      {!ghost && <ContactShadow width={10} depth={5.6} position={[1.6, 0.006, 0]} />}
    </group>
  );
}

function BreakerParts({ kitBreaker, selected, bracketSelected, ghost, onPick }: { kitBreaker: Kit["breaker"]; selected?: boolean; bracketSelected?: boolean; ghost?: boolean; onPick?: () => void }) {
  return (
    <group {...pickHandlers(onPick)}>
      <Part geometry={kitBreaker.bracket} material="steel" selected={bracketSelected} ghost={ghost} />
      <Part geometry={kitBreaker.housing} material="graphite" selected={selected} ghost={ghost} />
      <Part geometry={kitBreaker.wearPlates} fine material="darkSteel" ghost={ghost} shadow={false} />
      <Part geometry={kitBreaker.bolts} fine material="steel" ghost={ghost} shadow={false} />
      <Part geometry={kitBreaker.head} fine material="darkSteel" ghost={ghost} />
      <Part geometry={kitBreaker.chisel} fine material="steel" ghost={ghost} />
      <Part geometry={kitBreaker.ports} fine material="darkSteel" ghost={ghost} shadow={false} />
      {!ghost && <Decal text={BREAKER} position={[1.2, 0, ARM_Z + 0.272]} rotationY={0} height={0.12} />}
    </group>
  );
}

const BLOCK = rbox([-0.2, 0.2], [0, 0.22], [-0.45, 0.45], 0.02);

function StandaloneBreaker({ position, rotation = 0, selected, bracketSelected, ghost, onPick }: { position: [number, number, number]; rotation?: number; selected?: boolean; bracketSelected?: boolean; ghost?: boolean; onPick?: () => void }) {
  const { breaker: br } = getKit();
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <group position={[0.75, 0, 0]}><Part geometry={BLOCK} material="timber" ghost={ghost} /></group>
      <group position={[1.75, 0, 0]}><Part geometry={BLOCK} material="timber" ghost={ghost} /></group>
      <group position={[0, 0.22 + 0.25, -ARM_Z]}>
        <BreakerParts kitBreaker={br} selected={selected} bracketSelected={bracketSelected} ghost={ghost} onPick={onPick} />
      </group>
      {!ghost && <ContactShadow width={3.8} depth={1.8} position={[1.2, 0.006, 0]} opacity={0.4} />}
    </group>
  );
}

function Ground({ size = 240 }: { size?: number }) {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[size, size]} />
        <shadowMaterial transparent opacity={0.14} />
      </mesh>
      <gridHelper args={[size, size / 2, "#e2e2de", "#e2e2de"]} position={[0, 0.001, 0]} />
    </>
  );
}

function Slab({ box, material, ghost, radius = 0.04 }: { box: Box; material: MaterialKey; ghost?: boolean; radius?: number }) {
  const geometry = useMemo(() => fromBox(box, radius), [box, radius]);
  return <Part geometry={geometry} material={material} ghost={ghost} />;
}

function StateRing({ radius, state, dashed, position }: { radius: number; state: "ok" | "blocked" | "neutral"; dashed?: boolean; position: [number, number, number] }) {
  const line = useMemo(() => {
    const points = Array.from({ length: 128 }, (_, index) => {
      const angle = (index / 128) * Math.PI * 2;
      return new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius * 0.7);
    });
    const color = state === "ok" ? OK : state === "blocked" ? BLOCKED : INK;
    const material = dashed ? new THREE.LineDashedMaterial({ color, dashSize: 0.45, gapSize: 0.3 }) : new THREE.LineBasicMaterial({ color });
    const object = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), material);
    object.computeLineDistances();
    return object;
  }, [radius, state, dashed]);
  useEffect(() => () => { line.geometry.dispose(); (line.material as THREE.Material).dispose(); }, [line]);
  return <primitive object={line} position={[position[0], 0.02, position[2]]} />;
}

function DashedOutline({ box, color }: { box: Box; color: string }) {
  const line = useMemo(() => {
    const object = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(box.x[1] - box.x[0], box.y[1] - box.y[0], box.z[1] - box.z[0]).translate((box.x[0] + box.x[1]) / 2, (box.y[0] + box.y[1]) / 2, (box.z[0] + box.z[1]) / 2)), new THREE.LineDashedMaterial({ color, dashSize: 0.3, gapSize: 0.2 }));
    object.computeLineDistances();
    return object;
  }, [box, color]);
  useEffect(() => () => { line.geometry.dispose(); (line.material as THREE.Material).dispose(); }, [line]);
  return <primitive object={line} />;
}

type Point = [number, number, number];

function Path({ from, to, color, dashed }: { from: Point; to: Point; color: string; dashed?: boolean }) {
  const [x0, y0, z0] = from;
  const [x1, y1, z1] = to;
  const line = useMemo(() => {
    const object = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x0, y0, z0), new THREE.Vector3(x1, y1, z1)]), dashed ? new THREE.LineDashedMaterial({ color, dashSize: 0.6, gapSize: 0.4 }) : new THREE.LineBasicMaterial({ color }));
    object.computeLineDistances();
    return object;
  }, [x0, y0, z0, x1, y1, z1, color, dashed]);
  useEffect(() => () => { line.geometry.dispose(); (line.material as THREE.Material).dispose(); }, [line]);
  return <primitive object={line} />;
}

const YARD_POSTS = Array.from({ length: 9 }, (_, index) => -5.6 + index * 1.4);
const YARD_PAD: Box = { x: [-6.5, 6.5], y: [0, 0.05], z: [-5, 5] };
const YARD_LINES: Box[] = [-2.2, 2.6].map((z) => ({ x: [-6, 6], y: [0.05, 0.056], z: [z - 0.04, z + 0.04] }));
const YARD_FENCE: Box[] = [
  ...YARD_POSTS.map((z): Box => ({ x: [-6.55, -6.45], y: [0, 1.6], z: [z - 0.05, z + 0.05] })),
  { x: [-6.54, -6.46], y: [1.48, 1.56], z: [-5.65, 5.65] },
  { x: [-6.54, -6.46], y: [0.78, 0.84], z: [-5.65, 5.65] },
];

function Yard({ x }: { x: number }) {
  return (
    <group position={[x, 0, 0]}>
      <Slab box={YARD_PAD} material="pad" radius={0.02} />
      {YARD_LINES.map((box, index) => <Slab key={index} box={box} material="paintShade" radius={0.002} />)}
      {YARD_FENCE.map((box, index) => <Slab key={index} box={box} material="darkSteel" radius={0.02} />)}
    </group>
  );
}

const BENCHES: Box[] = [
  { x: [-9, 9], y: [0, 2.6], z: [-9.5, -5.8] },
  { x: [-9, 9], y: [2.6, 5.2], z: [-9.5, -7.6] },
];
const QUARRY_FLOOR: Box = { x: [-9, 9], y: [-0.02, 0.02], z: [-9.5, 6] };
const ROCKS: [number, number, number, number][] = [[6.6, 0.32, 2.6, 0.62], [6.1, 0.24, 3.7, 0.48], [7.5, 0.36, 3.3, 0.72], [4.2, 0.3, -3.8, 0.6], [5.4, 0.36, -4.4, 0.75]];
const RECEIVING: Box = { x: [-4.2, 4.2], y: [0, 0.02], z: [-2.6, 2.6] };
const ROCK = (() => {
  const geometry = new THREE.DodecahedronGeometry(1, 0).toNonIndexed();
  geometry.computeVertexNormals();
  return geometry;
})();

function Quarry({ x, pad }: { x: number; pad?: "open" | "confirmed" | "selected" }) {
  return (
    <group position={[x, 0, 0]}>
      <Slab box={QUARRY_FLOOR} material="quarryFloor" radius={0.01} />
      {BENCHES.map((box, index) => <Slab key={index} box={box} material={index === 1 ? "rockDark" : "rock"} radius={0.08} />)}
      {ROCKS.map(([rx, ry, rz, scale], index) => (
        <group key={index} position={[rx, ry, rz]} scale={[scale, scale * 0.7, scale]} rotation={[index, index * 0.7, 0]}>
          <Part geometry={ROCK} material="rockDark" fine />
        </group>
      ))}
      {pad && (
        <group position={[-1.5, 0.03, 2.2]}>
          <DashedOutline box={RECEIVING} color={pad === "open" ? INK : OK} />
          {pad !== "open" && (
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
              <planeGeometry args={[8.4, 5.2]} />
              <meshBasicMaterial color={pad === "selected" ? SELECT : OK} transparent opacity={pad === "selected" ? 0.35 : 0.12} toneMapped={false} />
            </mesh>
          )}
        </group>
      )}
    </group>
  );
}

const TRAILER_DECK_Y = 0.95;
const GOOSENECK: Vec[] = [[4.3, 0.8], [4.3, TRAILER_DECK_Y], [5.2, 1.65], [7.4, 1.65], [7.4, 1.3], [5.4, 1.3], [4.6, 0.8]];

let lowLoader: Record<string, THREE.BufferGeometry> | null = null;
function lowLoaderKit() {
  if (lowLoader) return lowLoader;
  const trailerWheels: THREE.BufferGeometry[] = [];
  const hubs: THREE.BufferGeometry[] = [];
  [-7.9, -6.9, -5.9].forEach((x) => [-1.0, 1.0].forEach((z) => {
    trailerWheels.push(cylinder(0.38, 0.5, "z", [x, 0.38, z], 28));
    hubs.push(cylinder(0.2, 0.52, "z", [x, 0.38, z], 18));
  }));
  [6.1, 7.5, 10.9].forEach((x) => [-0.95, 0.95].forEach((z) => {
    trailerWheels.push(cylinder(0.52, 0.55, "z", [x, 0.52, z], 30));
    hubs.push(cylinder(0.26, 0.57, "z", [x, 0.52, z], 18));
  }));
  lowLoader = {
    deck: merge([rbox([-8.7, 4.4], [0.8, TRAILER_DECK_Y], [-1.45, 1.45], 0.03), extrude(GOOSENECK, -1.2, 1.2, 0.03), rbox([-8.7, 4.4], [0.62, 0.8], [-0.5, 0.5], 0.03)]),
    chassis: merge([rbox([5.4, 11.8], [0.72, 1.02], [-0.55, 0.55], 0.03), rbox([6.4, 7.2], [1.02, 1.12], [-0.6, 0.6], 0.02)]),
    cab: rbox([9.9, 11.85], [1.02, 3.55], [-1.25, 1.25], 0.12),
    cabGlass: merge([rbox([11.84, 11.88], [2.3, 3.25], [-1.1, 1.1], 0.02), rbox([10.4, 11.5], [2.35, 3.2], [1.24, 1.27], 0.02), rbox([10.4, 11.5], [2.35, 3.2], [-1.27, -1.24], 0.02)]),
    wheels: merge(trailerWheels),
    hubs: merge(hubs),
    lashing: merge([[-0.4, 3.4].flatMap((x) => [-1.3, 1.3].map((z) => cylinder(0.02, 0.9, "y", [x, 1.35, z], 6)))].flat()),
  };
  return lowLoader;
}

function LowLoader({ ghost, selected }: { ghost?: boolean; selected?: boolean }) {
  const k = lowLoaderKit();
  return (
    <group>
      <Part geometry={k.deck} material="graphite" selected={selected} ghost={ghost} />
      <Part geometry={k.chassis} fine material="graphite" ghost={ghost} />
      <Part geometry={k.cab} material="paint" ghost={ghost} />
      {!ghost && <mesh geometry={k.cabGlass} material={M.glass} />}
      <Part geometry={k.wheels} fine material="rubber" ghost={ghost} />
      <Part geometry={k.hubs} fine material="darkSteel" ghost={ghost} shadow={false} />
    </group>
  );
}

// The planned machine faces the trailer's rear, so its local x runs toward -x.
const LOAD_X = 1.5;
const TRANSPORT_BUCKET = toolOutline("bucket", armFrame(POSES.transport));
const TRANSPORT_BUCKET_LOW = lowestPoint(TRANSPORT_BUCKET);
const DUNNAGE_X = LOAD_X - (TRANSPORT_BUCKET.find((point) => point[1] === TRANSPORT_BUCKET_LOW)?.[0] ?? 0);
const DUNNAGE: Box = { x: [-0.35, 0.35], y: [0, TRANSPORT_DUNNAGE], z: [-0.55, 0.55] };

function PlannedLoad({ transport, selected }: { transport: boolean; selected: boolean }) {
  return (
    <group>
      <LowLoader ghost={!transport} selected={selected && transport} />
      <Excavator id={EX014} pose={POSES.transport} tool="bucket" ghost position={[LOAD_X, TRAILER_DECK_Y, 0]} rotation={Math.PI} />
      <group position={[DUNNAGE_X, TRAILER_DECK_Y, -ARM_Z]}><Slab box={DUNNAGE} material="timber" ghost radius={0.01} /></group>
      <StandaloneBreaker position={[-8.4, TRAILER_DECK_Y, 0]} ghost />
    </group>
  );
}

/* Labels: HTML chips positioned every rendered frame from 3D anchors. */

export type SceneLabel = { id: string; at: Point; title: string; detail?: string; state?: "ok" | "blocked"; lift?: number; view?: 0 | 1 };

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

function fit(view: View, aspect: number, origin: Point = [0, 0, 0]) {
  const frame = aspect < 1.5 && view.narrow ? view.narrow : view;
  const target = new THREE.Vector3(...frame.target).add(new THREE.Vector3(...origin));
  const offset = new THREE.Vector3(...frame.position).sub(new THREE.Vector3(...frame.target));
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

function Rig({ view, origin, labels, layer }: { view: View; origin?: Point; labels: SceneLabel[]; layer: RefObject<HTMLDivElement | null> }) {
  const { camera, size, invalidate } = useThree();
  const tween = useRef<Tween | null>(null);
  const goal = useMemo(() => fit(view, size.width / size.height, origin), [view, size.width, size.height, origin]);
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

const SPLIT_OFFSET = 80;

function SplitRig({ view, stacked, labels, layer }: { view: View; stacked: boolean; labels: SceneLabel[]; layer: RefObject<HTMLDivElement | null> }) {
  const { gl, scene, size, invalidate } = useThree();
  const cameras = useMemo(() => [new THREE.PerspectiveCamera(24, 1, 0.1, 300), new THREE.PerspectiveCamera(24, 1, 0.1, 300)], []);
  const tween = useRef<Tween | null>(null);
  const width = stacked ? size.width : size.width / 2;
  const height = stacked ? size.height / 2 : size.height;
  const goal = useMemo(() => fit(view, width / height), [view, width, height]);
  useEffect(() => { invalidate(); }, [goal, labels, invalidate]);
  useFrame((state) => {
    const { current, moving } = step(tween, goal);
    gl.setScissorTest(true);
    cameras.forEach((camera, index) => {
      const shift = new THREE.Vector3(index * SPLIT_OFFSET, 0, 0);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      camera.position.copy(current.position).add(shift);
      camera.lookAt(current.target.clone().add(shift));
      camera.updateMatrixWorld();
      const x = stacked ? 0 : index * width;
      const y = stacked ? (index === 0 ? height : 0) : 0;
      gl.setViewport(x, y, width, height);
      gl.setScissor(x, y, width, height);
      gl.render(scene, camera);
    });
    gl.setScissorTest(false);
    placeLabels(layer.current, labels, (label) => {
      const index = label.view ?? 0;
      scratch.set(label.at[0] + index * SPLIT_OFFSET, label.at[1], label.at[2]).project(cameras[index]);
      const offsetX = stacked ? 0 : index * width;
      const offsetY = stacked ? index * height : 0;
      return { x: offsetX + (scratch.x * 0.5 + 0.5) * width, y: offsetY + (-scratch.y * 0.5 + 0.5) * height, visible: scratch.z < 1 && Math.abs(scratch.x) < 1 && Math.abs(scratch.y) < 1 };
    });
    if (moving) state.invalidate();
  }, 1);
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

/* Scenes */

const ORIGIN: Point = [0, 0, 0];
const EX027_MATCH: Point = [10.5, 0, -7.5];
const CAB_TOP: Point = [0.55, 3.05, -0.77];
const at = (origin: Point, offset: Point): Point => [origin[0] + offset[0], origin[1] + offset[1], origin[2] + offset[2]];

const MATCH_VIEWS: Record<MatchFocus, View> = {
  attachment: { position: [14, 4.4, 10.5], target: [5.8, 0.7, 1.8] },
  capability: { position: [12, 6, 12], target: [3.2, 2.4, 0] },
  transport: { position: [5, 6.5, 19], target: [1.8, 1.5, 0] },
  availability: { position: [3.5, 9, 23], target: [6, 1.4, -3] },
  inspection: { position: [9.5, 5, 10.5], target: [0.8, 1.6, 0] },
};
const TRANSPORT_ENVELOPE: Box = { x: [-2.4, 6.6], y: [0, 4.6], z: [-1.4, 1.4] };
const BREAKER_STAND: Point = [5.4, 0, 3.4];

type Layered = { layer: RefObject<HTMLDivElement | null>; labels: SceneLabel[] };

function matchLabels({ focus, documented }: Extract<SceneProps, { kind: "match" }>): SceneLabel[] {
  const labels: SceneLabel[] = [
    { id: "ex014", at: CAB_TOP, title: EX014, detail: "Candidate match", state: "ok" },
    { id: "ex027", at: at(EX027_MATCH, CAB_TOP), title: EX027, detail: "Awaiting inspection", state: "blocked" },
  ];
  if (focus === "attachment") labels.push({ id: "at112", at: [BREAKER_STAND[0] + 0.25, 0.97, BREAKER_STAND[2]], title: BREAKER, detail: documented ? "Documented for EX-014" : "Compatibility to confirm", state: documented ? "ok" : undefined, lift: 24 });
  return labels;
}

function MatchScene({ focus, machine, documented, onPick, layer, labels }: Extract<SceneProps, { kind: "match" }> & Layered) {
  const specific = focus === "capability" || focus === "transport" || focus === "inspection" || (focus === "attachment" && machine === EX027);
  const origin = specific && machine === EX027 ? EX027_MATCH : ORIGIN;
  const selection = (id: MachineId): Selection => {
    if (id !== machine) return {};
    if (focus === "attachment") return { coupler: true };
    if (focus === "capability") return { arm: true };
    return {};
  };
  const pickPart = (id: MachineId) => (part: keyof Selection) => onPick(id, part === "coupler" || part === "tool" ? "attachment" : part === "arm" ? "capability" : undefined);
  const coupler = useMemo<Point>(() => {
    const frame = armFrame(POSES.display);
    return [frame.toolPivot[0], frame.toolPivot[1] + 0.05, ARM_Z];
  }, []);
  return (
    <>
      <Studio extent={16} center={[4, 0, -2]} />
      <Rig view={MATCH_VIEWS[focus]} origin={origin} labels={labels} layer={layer} />
      <Ground />
      <Excavator id={EX014} pose={POSES.display} tool="bucket" selection={selection(EX014)} onPick={pickPart(EX014)} />
      <Excavator id={EX027} pose={POSES.display} tool="bucket" position={EX027_MATCH} selection={selection(EX027)} onPick={pickPart(EX027)} />
      <StandaloneBreaker position={BREAKER_STAND} bracketSelected={focus === "attachment" && machine === EX014} onPick={() => onPick(EX014, "attachment")} />
      <StateRing radius={5.2} state="ok" dashed={machine !== EX014} position={[1.6, 0, 0]} />
      <StateRing radius={5.2} state="blocked" dashed position={[EX027_MATCH[0] + 1.6, 0, EX027_MATCH[2]]} />
      {focus === "attachment" && machine === EX014 && <Path from={coupler} to={[BREAKER_STAND[0] - 0.1, 0.75, BREAKER_STAND[2]]} color={documented ? OK : INK} dashed={!documented} />}
      {focus === "transport" && <group position={origin}><DashedOutline box={TRANSPORT_ENVELOPE} color={INK} /></group>}
    </>
  );
}

const DELIVERY = { yard: -19, transport: 0, quarry: 24 };
const DELIVERY_VIEWS: Record<DeliveryFocus, View> = {
  overview: { position: [2.5, 25, 50], target: [2.5, 1.6, -4], narrow: { position: [9, 10, 25], target: [1, 1.5, 0] } },
  machine: { position: [-10.5, 6.5, 13], target: [-18, 1.6, 0] },
  attachment: { position: [-10, 4, 10], target: [-14.2, 0.6, 3.2] },
  transport: { position: [8, 8, 18], target: [0.5, 1.6, 0] },
  site: { position: [31, 10, 18], target: [23, 1, 0] },
};

function deliveryLabels({ transport, site }: Extract<SceneProps, { kind: "delivery" }>): SceneLabel[] {
  return [
    { id: "yard", at: [DELIVERY.yard - 2, 3.1, -0.8], title: "Main rental yard", detail: `${EX014} and ${BREAKER} ready`, state: "ok" },
    { id: "transport", at: [DELIVERY.transport + 1.2, 3.9, 0], title: TRANSPORT, detail: transport ? "Arrangement confirmed" : "Arrangement to confirm", state: transport ? "ok" : undefined },
    { id: "site", at: [DELIVERY.quarry - 1.5, 0.1, 2.2], title: "Quarry receiving area", detail: site ? "Window and access confirmed" : "Window and access to confirm", state: site ? "ok" : undefined, lift: 44 },
  ];
}

function DeliveryScene({ focus, transport, site, onPick, layer, labels }: Extract<SceneProps, { kind: "delivery" }> & Layered) {
  return (
    <>
      <Studio extent={34} center={[2, 0, 0]} />
      <Rig view={DELIVERY_VIEWS[focus]} labels={labels} layer={layer} />
      <Ground />
      <Yard x={DELIVERY.yard} />
      <Excavator id={EX014} pose={POSES.display} tool="bucket" position={[DELIVERY.yard - 2.5, 0.05, -0.5]} selection={focus === "machine" ? { body: true } : {}} onPick={() => onPick("machine")} />
      <StandaloneBreaker position={[DELIVERY.yard + 3.3, 0.05, 3.2]} bracketSelected={focus === "attachment"} selected={focus === "attachment"} onPick={() => onPick("attachment")} />
      <group position={[DELIVERY.transport, 0, 0]} {...pickHandlers(() => onPick("transport"))}>
        <PlannedLoad transport={transport} selected={focus === "transport"} />
      </group>
      <group {...pickHandlers(() => onPick("site"))}>
        <Quarry x={DELIVERY.quarry} pad={focus === "site" ? "selected" : site ? "confirmed" : "open"} />
      </group>
      <Path from={[DELIVERY.yard + 6.5, 0.03, 4.2]} to={[DELIVERY.transport - 9.2, 0.03, 4.2]} color={OK} />
      <Path from={[DELIVERY.transport + 12.3, 0.03, 4.2]} to={[DELIVERY.quarry - 9, 0.03, 4.2]} color={site && transport ? OK : INK} dashed={!(site && transport)} />
    </>
  );
}

const RENTAL_YARD_X = -24;
const RENTAL_VIEWS: Record<RentalFocus, View> = {
  ex014: { position: [12.5, 7, 14], target: [2.4, 1.6, -0.5] },
  ex027: { position: [RENTAL_YARD_X + 8, 6.5, 12.5], target: [RENTAL_YARD_X, 1.6, 0] },
  both: { position: [-11, 14, 39], target: [-11, 1.4, -1], narrow: { position: [16, 12, 30], target: [-12, 1, -3] } },
};

function rentalLabels({ focus, conflict }: Extract<SceneProps, { kind: "rental" }>): SceneLabel[] {
  const ex014At = at([-1, 0.03, 0], [CAB_TOP[0] * Math.cos(-0.25) + CAB_TOP[2] * Math.sin(-0.25), CAB_TOP[1], -CAB_TOP[0] * Math.sin(-0.25) + CAB_TOP[2] * Math.cos(-0.25)]);
  const labels: SceneLabel[] = [{ id: "ex014", at: ex014At, title: `${EX014} · On rent`, detail: conflict ? "Next reservation starts during the extension" : "At the quarry", state: conflict ? "blocked" : "ok" }];
  if (focus !== "ex014") labels.push({ id: "ex027", at: at([RENTAL_YARD_X - 1.5, 0.05, 0], CAB_TOP), title: EX027, detail: "In the yard, awaiting inspection", state: "blocked", lift: focus === "both" ? 76 : 30 });
  return labels;
}

function RentalScene({ focus, onPick, layer, labels }: Extract<SceneProps, { kind: "rental" }> & Layered) {
  return (
    <>
      <Studio extent={30} center={[-10, 0, 0]} />
      <Rig view={RENTAL_VIEWS[focus]} labels={labels} layer={layer} />
      <Ground />
      <Quarry x={0} />
      <Excavator id={EX014} pose={POSES.parked} tool="breaker" position={[-1, 0.03, 0]} rotation={-0.25} onPick={() => onPick("ex014")} />
      <Yard x={RENTAL_YARD_X} />
      <Excavator id={EX027} pose={POSES.display} tool="bucket" position={[RENTAL_YARD_X - 1.5, 0.05, 0]} selection={focus === "ex027" ? { body: true } : {}} onPick={() => onPick("ex027")} />
      <StateRing radius={5.2} state="blocked" dashed position={[RENTAL_YARD_X + 0.1, 0, 0]} />
    </>
  );
}

const RETURN_VIEWS: Record<ReturnArea, View> = {
  overall: { position: [11.5, 5.8, 13], target: [2, 1.6, 0] },
  sidePanel: { position: [2.4, 2.5, 8.4], target: [0.45, 1.5, 1.2] },
  attachment: { position: [11.5, 3.8, 8.5], target: [5, 1.5, 0.2] },
  undercarriage: { position: [3.4, 1.4, 7.6], target: [0, 0.45, 1] },
  meter: { position: [3.8, 3.2, -5.8], target: [0.8, 2.1, -0.8] },
};

function returnLabels(area: ReturnArea): SceneLabel[] {
  const breakerFrame = armFrame(POSES.parked);
  const breakerAt: Point = [breakerFrame.toolPivot[0] + Math.cos(breakerFrame.toolAngle) * 1.2, breakerFrame.toolPivot[1] + Math.sin(breakerFrame.toolAngle) * 1.2, ARM_Z + 0.27];
  switch (area) {
    case "sidePanel": return [
      { id: "before", at: [0.72, 1.62, 1.28], title: "Handoff photo", detail: "No marks recorded", view: 0 },
      { id: "after", at: [0.72, 1.62, 1.28], title: "Possible new mark", detail: "Needs inspection", view: 1 },
    ];
    case "attachment": return [
      { id: "before", at: breakerAt, title: BREAKER, detail: "Fitted at handoff", view: 0 },
      { id: "after", at: breakerAt, title: BREAKER, detail: "Returned with the machine", state: "ok", view: 1 },
    ];
    case "undercarriage": return [
      { id: "before", at: [0.4, 0.88, 1.3], title: "Tracks at handoff", view: 0 },
      { id: "after", at: [0.4, 0.88, 1.3], title: "Tracks on return", detail: "No visible difference", view: 1 },
    ];
    case "meter": return [
      { id: "before", at: [1.04, 1.93, -0.45], title: "6,318 h", detail: "At handoff", view: 0 },
      { id: "after", at: [1.04, 1.93, -0.45], title: "6,421 h", detail: "On return", view: 1 },
    ];
    default: return [];
  }
}

function ReturnScene({ area, stage, stacked, layer, labels }: Extract<SceneProps, { kind: "return" }> & Layered) {
  const selection: Selection = area === "sidePanel" ? { sidePanel: true } : area === "attachment" ? { tool: true } : area === "undercarriage" ? { tracks: true } : area === "meter" ? { cab: true } : {};
  return (
    <>
      <Studio extent={14} center={[SPLIT_OFFSET / 2, 0, 0]} />
      <SplitRig view={RETURN_VIEWS[area]} stacked={stacked} labels={labels} layer={layer} />
      <Ground size={320} />
      <Excavator id={EX014} pose={POSES.parked} tool="breaker" selection={selection} />
      <Excavator id={EX014} pose={POSES.parked} tool="breaker" position={[SPLIT_OFFSET, 0, 0]} selection={selection} mark />
      {stage >= 2 && <StateRing radius={5.4} state={stage === 2 ? "blocked" : "ok"} dashed={stage === 2} position={[SPLIT_OFFSET + 1.8, 0, 0]} />}
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

function SceneContent(props: SceneProps & Layered) {
  switch (props.kind) {
    case "match": return <MatchScene {...props} />;
    case "delivery": return <DeliveryScene {...props} />;
    case "rental": return <RentalScene {...props} />;
    case "return": return <ReturnScene {...props} />;
  }
}

function labelsFor(props: SceneProps): SceneLabel[] {
  switch (props.kind) {
    case "match": return matchLabels(props);
    case "delivery": return deliveryLabels(props);
    case "rental": return rentalLabels(props);
    case "return": return returnLabels(props.area);
  }
}

export default function ExcavatorScene(props: SceneProps): ReactNode {
  const layer = useRef<HTMLDivElement>(null);
  const labels = labelsFor(props);
  return (
    <>
      <Canvas
        frameloop={props.active ? "demand" : "never"}
        shadows="percentage"
        dpr={[1, 2]}
        camera={{ fov: 24, near: 0.1, far: 400, position: [14, 9, 16] }}
        gl={{ antialias: true, alpha: true, powerPreference: "low-power", toneMapping: THREE.NeutralToneMapping, toneMappingExposure: 0.92 }}
        style={{ position: "absolute", inset: 0 }}
        aria-hidden="true"
      >
        <fog attach="fog" args={[GROUND, 60, 160]} />
        <SceneContent {...props} layer={layer} labels={labels} />
        <Ready onReady={props.onReady} />
      </Canvas>
      <LabelLayer labels={labels} layer={layer} />
    </>
  );
}

