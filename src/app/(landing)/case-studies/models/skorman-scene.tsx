"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useNarrow, type SceneRuntime } from "./model-frame";
import {
  BLOCKED, bx, ContactShadow, cylinder, DashedOutline, EDGE_INK, edgesOf, Ground, INK, ModelCanvas, OK, Part, physical, pickHandlers,
  SELECT, standard, useContinuous, useTween, type Point, type SceneLabel, type View,
} from "./scene-kit";
import {
  CARD_COUNT, CARD_Z, center, CRANE, DESTINATION, EMERGING, EXCLUDED, inside, OLDER, OTHER_PLOTS, PADS, PARCELS, PIN, PLAZA, PLINTH,
  ROUTES, SIGN, SLAB, TRAY, TREES, type Building, type Frame, type Mode, type OldBuilding, type Parcel, type ParcelId, type Range, type Rect,
} from "./skorman-data";

export type SkormanSceneProps = SceneRuntime & { mode: Mode; selected: ParcelId; onPick: (id: ParcelId) => void };

// The diorama sits on a slab; everything inside the lifted group is measured from its top.
const LIFT = 0.5;
const PAD = 0.1;
const FLOOR = 0.9;

const M = {
  slab: standard("#cfcec8", 0.95),
  pad: physical("#f3f2ed", 0.9, { envMapIntensity: 0.6 }),
  plaza: standard("#e5e1d7", 0.9),
  plot: standard("#e4dfd2", 1),
  wall: physical("#f5f4f0", 0.8, { envMapIntensity: 0.6 }),
  glass: physical("#34414b", 0.1, { envMapIntensity: 1.3 }),
  band: standard("#575b5f", 0.6, 0.1),
  cap: standard("#d8d7d2", 0.85),
  old: physical("#e4e1d9", 0.88, { envMapIntensity: 0.6 }),
  roof: standard("#8c8f93", 0.75, 0.05, { side: THREE.DoubleSide }),
  concrete: standard("#d4d3cd", 0.92),
  column: standard("#b3b2ac", 0.9),
  steel: standard("#55595c", 0.5, 0.35),
  trunk: standard("#8f877b", 0.9),
  canopy: standard("#c6cbc0", 0.95, 0, { flatShading: true }),
  shrub: standard("#d2d5cb", 0.95, 0, { flatShading: true }),
  paper: physical("#fbfbf9", 0.7, { envMapIntensity: 0.5 }),
  tray: standard("#3d4042", 0.65, 0.1),
  route: standard(OK, 0.45),
  pin: standard(SELECT, 0.42),
  ink: standard(INK, 0.6),
  stake: standard("#6d7174", 0.6, 0.2),
  link: standard("#7f8386", 0.6),
  linkSelected: standard(INK, 0.5),
  sweep: physical("#7d848a", 0.4, { transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }),
};

/* Geometry */

function box(x: Range, y: Range, z: Range) {
  return new THREE.BoxGeometry(x[1] - x[0], y[1] - y[0], z[1] - z[0]).translate((x[0] + x[1]) / 2, (y[0] + y[1]) / 2, (z[0] + z[1]) / 2);
}
function merged(parts: THREE.BufferGeometry[]) {
  return (parts.length ? mergeGeometries(parts) : null) ?? new THREE.BufferGeometry();
}
const grow = (range: Range, by: number): Range => [range[0] - by, range[1] + by];
const corners = (rect: Rect): [number, number][] => [[rect.x[0], rect.z[0]], [rect.x[1], rect.z[0]], [rect.x[1], rect.z[1]], [rect.x[0], rect.z[1]]];

function triangles(points: number[][]) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(points.flat(), 3));
  geometry.computeVertexNormals();
  return geometry;
}

// A gable roof with its ridge along the longer side of the building.
function gable(rect: Rect, eave: number, rise: number, overhang: number) {
  const along = rect.x[1] - rect.x[0] >= rect.z[1] - rect.z[0];
  const length = (along ? rect.x[1] - rect.x[0] : rect.z[1] - rect.z[0]) / 2 + overhang;
  const half = (along ? rect.z[1] - rect.z[0] : rect.x[1] - rect.x[0]) / 2 + overhang;
  const top = eave + rise;
  const A = [-length, eave, -half], B = [length, eave, -half], C = [length, top, 0], D = [-length, top, 0], E = [-length, eave, half], F = [length, eave, half];
  const geometry = triangles([A, C, B, A, D, C, E, F, C, E, C, D, A, E, D, B, C, F]);
  if (!along) geometry.rotateY(Math.PI / 2);
  const [cx, cz] = center(rect);
  return geometry.translate(cx, 0, cz);
}

// Glazed ground floor under a canopy band, ribbon windows above, a parapet cap.
function mixedUse(building: Building) {
  const ground = 0.6;
  const top = PAD + building.height;
  const floors = Math.max(1, Math.floor((building.height - ground - 0.15) / 0.5));
  return {
    glass: bx(grow(building.x, -0.08), [PAD, PAD + ground], grow(building.z, -0.08), 0.02),
    canopy: box(grow(building.x, 0.1), [PAD + ground - 0.05, PAD + ground + 0.01], grow(building.z, 0.1)),
    body: bx(building.x, [PAD + ground, top], building.z, 0.05),
    ribbons: merged(Array.from({ length: floors }, (_, index) => {
      const y = PAD + ground + 0.14 + index * 0.5;
      return box(grow(building.x, 0.016), [y, y + 0.24], grow(building.z, 0.016));
    })),
    cap: bx(grow(building.x, 0.03), [top, top + 0.07], grow(building.z, 0.03), 0.02),
  };
}

function older(building: OldBuilding) {
  const top = PAD + building.height;
  const y = PAD + building.height * 0.42;
  return {
    body: bx(building.x, [PAD, top], building.z, 0.03),
    roof: building.roof === "gable"
      ? gable(building, top, 0.55, 0.12)
      : merged([box(grow(building.x, 0.03), [top, top + 0.06], grow(building.z, 0.03)), box([building.x[0] + 0.4, building.x[0] + 1], [top, top + 0.3], [building.z[0] + 0.3, building.z[0] + 0.8])]),
    windows: merged([
      box(grow(building.x, -0.3), [y, y + 0.24], [building.z[1], building.z[1] + 0.025]),
      box([building.x[1], building.x[1] + 0.025], [y, y + 0.24], grow(building.z, -0.3)),
      box([building.x[0] + 0.3, building.x[0] + 0.75], [PAD, PAD + 0.62], [building.z[1], building.z[1] + 0.03]),
    ]),
  };
}

// Floor slabs on a column grid; the top level is half poured.
function frame(item: Frame) {
  const slabs: THREE.BufferGeometry[] = [];
  const columns: THREE.BufferGeometry[] = [];
  const at = (range: Range, count: number, index: number) => range[0] + 0.18 + ((range[1] - range[0] - 0.36) * index) / (count - 1);
  for (let level = 0; level <= item.floors; level++) {
    const y = PAD + level * FLOOR;
    const x: Range = level === item.floors && level > 0 ? [item.x[0], (item.x[0] + item.x[1]) / 2 + 0.2] : item.x;
    slabs.push(box(x, [y, y + 0.08], item.z));
  }
  for (let level = 0; level < Math.max(1, item.floors); level++) {
    const y = PAD + level * FLOOR + 0.08;
    const height = item.floors === 0 ? 0.32 : FLOOR - 0.08;
    for (let col = 0; col < item.cols; col++) {
      for (let row = 0; row < item.rows; row++) {
        const cx = at(item.x, item.cols, col);
        const cz = at(item.z, item.rows, row);
        columns.push(box([cx - 0.06, cx + 0.06], [y, y + height], [cz - 0.06, cz + 0.06]));
      }
    }
  }
  return {
    slabs: merged(slabs),
    columns: merged(columns),
    core: item.core ? bx(item.core.x, [PAD, PAD + item.floors * FLOOR + 0.6], item.core.z, 0.03) : null,
  };
}

function rod(from: Point, to: Point, radius: number) {
  const start = new THREE.Vector3(...from);
  const end = new THREE.Vector3(...to);
  const length = start.distanceTo(end);
  const geometry = new THREE.CylinderGeometry(radius, radius, length, 6).translate(0, length / 2, 0);
  geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.sub(start).normalize()));
  return geometry.translate(...from);
}

function crane() {
  const [mx, mz] = CRANE.mast;
  const top = PAD + CRANE.height;
  const trolley = mx - CRANE.jib * 0.62;
  const hook = PAD + 2.8;
  return merged([
    box([mx - 0.42, mx + 0.42], [PAD, PAD + 0.22], [mz - 0.42, mz + 0.42]),
    box([mx - 0.13, mx + 0.13], [PAD + 0.22, top], [mz - 0.13, mz + 0.13]),
    box([mx - CRANE.jib, mx + 0.13], [top, top + 0.16], [mz - 0.08, mz + 0.08]),
    box([mx, mx + CRANE.counter], [top, top + 0.14], [mz - 0.1, mz + 0.1]),
    box([mx + CRANE.counter - 0.55, mx + CRANE.counter], [top - 0.28, top + 0.18], [mz - 0.2, mz + 0.2]),
    box([mx + 0.14, mx + 0.5], [top - 0.4, top - 0.02], [mz - 0.18, mz + 0.18]),
    box([mx - 0.05, mx + 0.05], [top + 0.16, top + 1], [mz - 0.05, mz + 0.05]),
    rod([mx, top + 1, mz], [mx - CRANE.jib * 0.7, top + 0.16, mz], 0.018),
    rod([mx, top + 1, mz], [mx + CRANE.counter - 0.1, top + 0.14, mz], 0.018),
    box([trolley - 0.12, trolley + 0.12], [top - 0.08, top], [mz - 0.1, mz + 0.1]),
    rod([trolley, hook, mz], [trolley, top - 0.08, mz], 0.012),
    box([trolley - 0.1, trolley + 0.1], [hook - 0.25, hook], [mz - 0.08, mz + 0.08]),
  ]);
}

function greenery() {
  const shrubs: [number, number, number][] = [[-13.4, -8.6, 0.3], [-12.6, -8.9, 0.22], [-9.2, -6.2, 0.26], [-2.8, 8.8, 0.24], [-13.6, 8.8, 0.28], [-10.2, 6.8, 0.2], [13.8, 9, 0.26], [3.2, -5.6, 0.22]];
  return {
    trunks: merged(TREES.map(([x, z]) => cylinder(0.05, 0.42, "y", [x, PAD + 0.21, z], 8))),
    canopies: merged(TREES.map(([x, z]) => new THREE.IcosahedronGeometry(0.34, 1).scale(1, 1.15, 1).translate(x, PAD + 0.72, z))),
    shrubs: merged(shrubs.map(([x, z, r]) => new THREE.IcosahedronGeometry(r, 0).scale(1, 0.75, 1).translate(x, PAD + r * 0.6, z))),
  };
}

// An open tray of upright record cards. Parcel cards carry tabs, staggered so the set reads as indexed.
const CARD_TOP = PAD + 1.56;
const TRAY_X = (TRAY.x[0] + TRAY.x[1]) / 2;
function tray() {
  const [x0, x1] = TRAY.x;
  const [z0, z1] = TRAY.z;
  const wall = 0.07;
  const height = 0.62;
  return {
    tray: merged([
      box([x0, x1], [PAD - 0.1, PAD], [z0, z1]),
      box([x0, x1], [PAD, PAD + height], [z0, z0 + wall]),
      box([x0, x1], [PAD, PAD + height * 0.6], [z1 - wall, z1]),
      box([x0, x0 + wall], [PAD, PAD + height], [z0, z1]),
      box([x1 - wall, x1], [PAD, PAD + height], [z0, z1]),
    ]),
    card: bx([x0 + 0.18, x1 - 0.18], [PAD, CARD_TOP - 0.2], [-0.026, 0.026], 0.012),
    tabs: Array.from({ length: CARD_COUNT }, (_, index) => bx([x0 + 0.3 + (index % 4) * 0.48, x0 + 0.78 + (index % 4) * 0.48], [CARD_TOP - 0.2, CARD_TOP], [-0.026, 0.026], 0.012)),
  };
}

function link(parcel: Parcel) {
  const [sx, sz] = parcel.stake;
  const start = new THREE.Vector3(sx, PAD + 2.05, sz);
  const end = new THREE.Vector3(TRAY_X, CARD_TOP - 0.1, CARD_Z(parcel.card));
  const rise = 2.2 + start.distanceTo(end) * 0.1;
  const curve = new THREE.CubicBezierCurve3(start, start.clone().add(new THREE.Vector3(0, rise, 0)), end.clone().add(new THREE.Vector3(-1.5, rise, 0)), end);
  return new THREE.TubeGeometry(curve, 64, 0.03, 6, false);
}

/* Routes: dashes laid along each path, and the same paths for the walking visitors. */

type Track = { points: THREE.Vector3[]; lengths: number[]; total: number };

const routeHeight = (x: number, z: number) => (PADS.some((pad) => inside(pad, x, z)) ? PAD + 0.016 : 0.016);

function track(route: [number, number][]): Track {
  const points = route.map(([x, z]) => new THREE.Vector3(x, 0, z));
  const lengths = [0];
  for (let index = 1; index < points.length; index++) lengths.push(lengths[index - 1] + points[index].distanceTo(points[index - 1]));
  return { points, lengths, total: lengths[lengths.length - 1] };
}

// Writes the point at distance s along the track into `out` without allocating; returns the segment index.
function along({ points, lengths }: Track, s: number, out: THREE.Vector3) {
  let index = 1;
  while (index < lengths.length - 1 && lengths[index] < s) index++;
  const k = (s - lengths[index - 1]) / (lengths[index] - lengths[index - 1] || 1);
  out.lerpVectors(points[index - 1], points[index], THREE.MathUtils.clamp(k, 0, 1));
  out.y = routeHeight(out.x, out.z);
  return index;
}

function dashes(path: Track) {
  const matrices: THREE.Matrix4[] = [];
  const dummy = new THREE.Object3D();
  for (let s = 0.3; s < path.total - 0.2; s += 0.62) {
    const index = along(path, s, dummy.position);
    const a = path.points[index - 1];
    const b = path.points[index];
    dummy.rotation.set(0, -Math.atan2(b.z - a.z, b.x - a.x), 0);
    dummy.updateMatrix();
    matrices.push(dummy.matrix.clone());
  }
  return matrices;
}

const byParcel = <T,>(make: (parcel: Parcel) => T) => Object.fromEntries(PARCELS.map((parcel) => [parcel.id, make(parcel)])) as Record<ParcelId, T>;
const fill = (plot: Rect) => box(plot.x, [PAD + 0.016, PAD + 0.02], plot.z);

function buildSite() {
  const tracks = ROUTES.map(track);
  return {
    slab: bx(SLAB.x, [-LIFT, 0], SLAB.z, 0.12),
    plinth: bx(PLINTH.x, [-LIFT, 0], PLINTH.z, 0.1),
    pads: merged(PADS.map((pad) => bx(pad.x, [0, PAD], pad.z, 0.05))),
    plaza: box(PLAZA.x, [PAD, PAD + 0.018], PLAZA.z),
    plots: merged([...PARCELS.filter((parcel) => parcel.type === "Land").map((parcel) => parcel.plot), EXCLUDED, ...OTHER_PLOTS].map((plot) => box(plot.x, [PAD, PAD + 0.014], plot.z))),
    fills: { ...byParcel((parcel) => fill(parcel.plot)), excluded: fill(EXCLUDED) },
    destination: DESTINATION.map(mixedUse),
    older: OLDER.map(older),
    parcels: byParcel((parcel) => (parcel.building ? older(parcel.building) : null)),
    frames: EMERGING.map(frame),
    crane: crane(),
    green: greenery(),
    tray: tray(),
    links: byParcel(link),
    tracks,
    dashes: tracks.map(dashes),
    dash: new THREE.BoxGeometry(0.4, 0.02, 0.15),
    visitor: merged([cylinder(0.1, 0.24, "y", [0, 0.12, 0], 12), new THREE.SphereGeometry(0.085, 12, 8).translate(0, 0.34, 0)]),
    pin: {
      stem: cylinder(0.045, 4.3, "y", [0, 2.15, 0], 10),
      cone: new THREE.CylinderGeometry(0.5, 0.04, 1.15, 28).translate(0, 4.4, 0),
      head: new THREE.SphereGeometry(0.58, 32, 20).translate(0, 5.03, 0),
      base: new THREE.CylinderGeometry(0.42, 0.42, 0.02, 32).translate(0, 0.01, 0),
    },
    sign: {
      posts: merged([box([-0.28, -0.24], [0, 0.82], [-0.02, 0.02]), box([0.24, 0.28], [0, 0.82], [-0.02, 0.02])]),
      board: bx([-0.32, 0.32], [0.42, 0.86], [-0.03, 0.03], 0.012),
    },
    stake: {
      post: cylinder(0.045, 1.75, "y", [0, 0.87, 0], 8),
      tag: bx([-0.45, 0.45], [1.45, 2.05], [-0.035, 0.035], 0.02),
    },
    sweep: {
      plane: box([-0.015, 0.015], [0, 2.4], SLAB.z),
      band: box([-1.6, 0], [PAD + 0.03, PAD + 0.04], SLAB.z),
      rails: merged([box([-0.04, 0.04], [0, PAD + 0.05], SLAB.z), box([-0.03, 0.03], [2.37, 2.43], SLAB.z)]),
    },
  };
}
type Site = ReturnType<typeof buildSite>;

/* Pieces */

function Destination({ site, focus }: { site: Site; focus: boolean }) {
  return (
    <group>
      <mesh geometry={site.plaza} material={M.plaza} receiveShadow />
      {site.destination.map((building, index) => (
        <group key={index}>
          <mesh geometry={building.glass} material={M.glass} castShadow receiveShadow />
          <mesh geometry={building.canopy} material={M.band} castShadow />
          <Part geometry={building.body} material={M.wall} selected={focus} tint={0.38} />
          <mesh geometry={building.ribbons} material={M.glass} />
          <Part geometry={building.cap} material={M.cap} selected={focus} tint={0.38} />
        </group>
      ))}
      <mesh geometry={site.green.trunks} material={M.trunk} castShadow />
      <mesh geometry={site.green.canopies} material={M.canopy} castShadow receiveShadow />
    </group>
  );
}

function Emerging({ site }: { site: Site }) {
  return (
    <group>
      {site.frames.map((item, index) => (
        <group key={index}>
          <mesh geometry={item.slabs} material={M.concrete} castShadow receiveShadow />
          <mesh geometry={item.columns} material={M.column} castShadow receiveShadow />
          {item.core && <mesh geometry={item.core} material={M.concrete} castShadow receiveShadow />}
        </group>
      ))}
      <mesh geometry={site.crane} material={M.steel} castShadow />
    </group>
  );
}

function OlderBuilding({ parts, selected, onPick }: { parts: ReturnType<typeof older>; selected?: boolean; onPick?: () => void }) {
  return (
    <group {...pickHandlers(onPick)}>
      <Part geometry={parts.body} material={M.old} selected={selected} />
      <Part geometry={parts.roof} material={M.roof} selected={selected} tint={0.55} />
      <mesh geometry={parts.windows} material={M.glass} />
    </group>
  );
}

function RouteDashes({ geometry, matrices, drawn }: { geometry: THREE.BufferGeometry; matrices: THREE.Matrix4[]; drawn: RefObject<number> }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const current = mesh.current;
    if (!current) return;
    matrices.forEach((matrix, index) => current.setMatrixAt(index, matrix));
    current.instanceMatrix.needsUpdate = true;
    current.computeBoundingSphere();
  }, [matrices]);
  useFrame(() => { if (mesh.current) mesh.current.count = Math.round(matrices.length * drawn.current); });
  return <instancedMesh ref={mesh} args={[geometry, M.route, matrices.length]} receiveShadow />;
}

// Routes draw in from the site edge, then visitors walk them toward the plaza.
function Routes({ site, show, instant }: { site: Site; show: boolean; instant: boolean }) {
  const drawn = useTween(show ? 1 : 0, instant, 1200);
  const group = useRef<THREE.Group>(null);
  const walkers = useRef<(THREE.Mesh | null)[]>([]);
  useContinuous(show && !instant);
  useFrame((state) => {
    if (group.current) group.current.visible = drawn.current > 0.001;
    const time = instant ? 0 : state.clock.elapsedTime;
    walkers.current.forEach((walker, index) => {
      if (!walker) return;
      const path = site.tracks[index % site.tracks.length];
      const offset = index < site.tracks.length ? 0.2 : 0.62;
      along(path, (offset * path.total + time * 0.9) % path.total, walker.position);
      walker.visible = drawn.current > 0.95;
    });
  });
  return (
    <group ref={group}>
      {site.dashes.map((matrices, index) => <RouteDashes key={index} geometry={site.dash} matrices={matrices} drawn={drawn} />)}
      {Array.from({ length: site.tracks.length * 2 }, (_, index) => (
        <mesh key={index} ref={(mesh) => { walkers.current[index] = mesh; }} geometry={site.visitor} material={M.route} castShadow />
      ))}
    </group>
  );
}

function Pin({ site, show, instant }: { site: Site; show: boolean; instant: boolean }) {
  const scale = useTween(show ? 1 : 0, instant, 650);
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!group.current) return;
    const s = Math.max(0.0001, scale.current);
    group.current.scale.set(s, s, s);
    group.current.visible = scale.current > 0.01;
  });
  return (
    <group ref={group} position={[PIN[0], PAD + 0.018, PIN[1]]}>
      <mesh geometry={site.pin.base} material={M.ink} />
      <mesh geometry={site.pin.stem} material={M.ink} castShadow />
      <mesh geometry={site.pin.cone} material={M.pin} castShadow />
      <mesh geometry={site.pin.head} material={M.pin} castShadow />
      <lineSegments geometry={edgesOf(site.pin.cone)} material={EDGE_INK} />
    </group>
  );
}

function Sign({ site, focus }: { site: Site; focus: boolean }) {
  return (
    <group position={[SIGN[0], PAD, SIGN[1]]} rotation={[0, 0.4, 0]}>
      <mesh geometry={site.sign.posts} material={M.steel} castShadow />
      <Part geometry={site.sign.board} material={M.paper} edges={focus} />
    </group>
  );
}

function SolidOutline({ rect, y }: { rect: Rect; y: number }) {
  const line = useMemo(() => new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(corners(rect).map(([x, z]) => new THREE.Vector3(x, y, z))), EDGE_INK), [rect, y]);
  useEffect(() => () => line.geometry.dispose(), [line]);
  return <primitive object={line} />;
}

const sweepAt = (p: number) => SLAB.x[0] - 0.6 + (SLAB.x[1] - SLAB.x[0] + 1.2) * p;

// A flat fill over a plot that fades in once the sweep has passed over it.
function PlotFill({ geometry, rect, color, strength, sweepRef, instant, onPick }: { geometry: THREE.BufferGeometry; rect: Rect; color: string; strength: number; sweepRef: RefObject<number>; instant: boolean; onPick?: () => void }) {
  const mesh = useRef<THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>>(null);
  const { invalidate } = useThree();
  useEffect(() => { invalidate(); }, [strength, invalidate]);
  useFrame((state) => {
    const material = mesh.current?.material;
    if (!material) return;
    const reveal = THREE.MathUtils.clamp((sweepAt(sweepRef.current) - rect.x[0]) / (rect.x[1] - rect.x[0]), 0, 1);
    const target = reveal * strength;
    const gap = target - material.opacity;
    if (Math.abs(gap) < 0.002) return;
    material.opacity = instant ? target : material.opacity + gap * 0.25;
    state.invalidate();
  });
  return (
    <mesh ref={mesh} geometry={geometry} renderOrder={2} {...pickHandlers(onPick)}>
      <meshBasicMaterial color={color} transparent opacity={0} depthWrite={false} toneMapped={false} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
    </mesh>
  );
}

function Stake({ site, parcel, show, selected, instant }: { site: Site; parcel: Parcel; show: boolean; selected: boolean; instant: boolean }) {
  const grown = useTween(show ? 1 : 0, instant, 700);
  const group = useRef<THREE.Group>(null);
  const tube = site.links[parcel.id];
  const total = tube.index?.count ?? 0;
  useFrame(() => {
    const p = grown.current;
    if (group.current) {
      group.current.scale.set(1, Math.max(0.0001, p), 1);
      group.current.visible = p > 0.01;
    }
    tube.setDrawRange(0, Math.floor((total * p) / 3) * 3);
  });
  return (
    <>
      <group ref={group} position={[parcel.stake[0], PAD, parcel.stake[1]]}>
        <mesh geometry={site.stake.post} material={M.stake} castShadow />
        <Part geometry={site.stake.tag} material={M.paper} selected={selected} edges />
      </group>
      <mesh geometry={tube} material={selected ? M.linkSelected : M.link} />
    </>
  );
}

function Card({ site, index, selected, instant }: { site: Site; index: number; selected: boolean; instant: boolean }) {
  const lift = useTween(selected ? 0.42 : 0, instant, 600);
  const group = useRef<THREE.Group>(null);
  const indexed = PARCELS.some((parcel) => parcel.card === index);
  useFrame(() => { if (group.current) group.current.position.y = lift.current; });
  return (
    <group position={[0, 0, CARD_Z(index)]}>
      <group ref={group}>
        <Part geometry={site.tray.card} material={M.paper} selected={selected} />
        {indexed && <Part geometry={site.tray.tabs[index]} material={M.paper} selected={selected} edges />}
      </group>
    </group>
  );
}

function Records({ site, show, selected, instant }: { site: Site; show: boolean; selected: ParcelId; instant: boolean }) {
  const card = PARCELS.find((parcel) => parcel.id === selected)?.card;
  return (
    <group>
      <mesh geometry={site.tray.tray} material={M.tray} castShadow receiveShadow />
      {Array.from({ length: CARD_COUNT }, (_, index) => <Card key={index} site={site} index={index} selected={show && index === card} instant={instant} />)}
      {PARCELS.map((parcel) => <Stake key={parcel.id} site={site} parcel={parcel} show={show} selected={show && parcel.id === selected} instant={instant} />)}
    </group>
  );
}

function Sweep({ site, sweepRef, show }: { site: Site; sweepRef: RefObject<number>; show: boolean }) {
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!group.current) return;
    const p = sweepRef.current;
    group.current.visible = show && p > 0.002 && p < 0.995;
    group.current.position.x = sweepAt(p);
  });
  return (
    <group ref={group} visible={false}>
      <mesh geometry={site.sweep.plane} material={M.sweep} renderOrder={3} />
      <mesh geometry={site.sweep.band} material={M.sweep} renderOrder={3} />
      <mesh geometry={site.sweep.rails} material={M.ink} />
    </group>
  );
}

// Drives the sweep (0 to 1) and reports once it has crossed the whole site.
function SweepClock({ target, instant, sweepRef, onSwept }: { target: number; instant: boolean; sweepRef: RefObject<number>; onSwept: (swept: boolean) => void }) {
  const p = useTween(target, instant, 2200);
  const swept = useRef<boolean | null>(null);
  useFrame(() => {
    sweepRef.current = p.current;
    const done = p.current > 0.985;
    if (done !== swept.current) { swept.current = done; onSwept(done); }
  });
  return null;
}

/* Views and labels */

const VIEWS: Record<Mode, View> = {
  visibility: { position: [16.5, 27, 37], target: [0.4, 1.2, 0.8], narrow: { position: [9, 45, 39], target: [2.4, 0.6, 1.2] } },
  research: { position: [8, 39, 35], target: [1.4, 0, 0.6], narrow: { position: [51, 63, 15], target: [1.4, 0, 0] } },
  records: { position: [18, 36, 40], target: [3, 0.4, 0.4], narrow: { position: [50, 60, 15], target: [3, 0, 0.4] } },
};

const up = (x: number, y: number, z: number): Point => [x, y + LIFT, z];

function parcelTop(parcel: Parcel): Point {
  const [x, z] = center(parcel.plot);
  return up(x, parcel.building ? PAD + parcel.building.height + 0.5 : PAD + 0.1, z);
}

function labelsFor(mode: Mode, selected: ParcelId, swept: boolean, narrow: boolean): SceneLabel[] {
  const pick = PARCELS.find((parcel) => parcel.id === selected) ?? PARCELS[0];
  if (mode === "visibility") {
    const labels: SceneLabel[] = [
      { id: "pin", at: up(PIN[0], PAD + 5.65, PIN[1]), title: "Destination information (example)", detail: "Useful details about the area", state: "select", lift: 24 },
      { id: "inquiries", at: up(SIGN[0], PAD + 0.9, SIGN[1]), title: "Visitor inquiries", detail: "Example contact point", state: "ok", lift: 16 },
    ];
    if (!narrow) labels.push({ id: "emerging", at: up(13.4, PAD + 2.4, -0.6), title: "Emerging area (example)", detail: "Structures under construction", lift: 26 });
    return labels;
  }
  if (mode === "research") {
    if (!swept) return [];
    const [ex, ez] = center(EXCLUDED);
    const others = narrow ? [] : PARCELS.filter((parcel) => parcel.id !== selected).map((parcel): SceneLabel => ({ id: parcel.id, at: parcelTop(parcel), title: `${parcel.name} (example)`, lift: 18 }));
    return [
      { id: pick.id, at: parcelTop(pick), title: `${pick.name} (example)`, detail: "Candidate for review", state: "select", lift: 30 },
      ...others,
      { id: "excluded", at: up(ex, PAD + 0.1, ez), title: "Excluded: example constraint", detail: "Not a candidate", state: "blocked", lift: 22 },
    ];
  }
  return [
    { id: "owner", at: up(pick.stake[0], PAD + 2.05, pick.stake[1]), title: "Owner of record, from public records (example)", detail: `Linked to ${pick.name} (example)`, state: "select", lift: 26 },
    { id: "records", at: up(TRAY_X, CARD_TOP + 0.5, (TRAY.z[0] + TRAY.z[1]) / 2), title: "Organized records (example)", detail: "Public property and ownership records", state: "ok", lift: 34 },
  ];
}

/* Scene */

export default function SkormanScene({ mode, selected, onPick, ...runtime }: SkormanSceneProps) {
  const site = useMemo(() => buildSite(), []);
  const narrow = useNarrow();
  const { instant } = runtime;
  const researched = mode !== "visibility";
  const sweepRef = useRef(0);
  const [swept, setSwept] = useState(false);
  const labels = useMemo(() => labelsFor(mode, selected, swept, narrow), [mode, selected, swept, narrow]);
  return (
    <ModelCanvas {...runtime} view={VIEWS[mode]} labels={labels} extent={21} center={[2, 0, 0]}>
      <Ground />
      <ContactShadow width={44} depth={30} position={[2, 0.006, 0]} opacity={0.32} />
      <SweepClock target={researched ? 1 : 0} instant={instant} sweepRef={sweepRef} onSwept={setSwept} />
      <group position={[0, LIFT, 0]}>
        <mesh geometry={site.slab} material={M.slab} castShadow receiveShadow />
        <mesh geometry={site.plinth} material={M.slab} castShadow receiveShadow />
        <mesh geometry={site.pads} material={M.pad} receiveShadow />
        <mesh geometry={site.plots} material={M.plot} receiveShadow />
        <mesh geometry={site.green.shrubs} material={M.shrub} castShadow receiveShadow />
        <Destination site={site} focus={mode === "visibility"} />
        <Emerging site={site} />
        {site.older.map((parts, index) => <OlderBuilding key={index} parts={parts} />)}
        <Routes site={site} show={mode === "visibility"} instant={instant} />
        <Pin site={site} show={mode === "visibility"} instant={instant} />
        <Sign site={site} focus={mode === "visibility"} />
        <Sweep site={site} sweepRef={sweepRef} show={mode === "research"} />

        {OTHER_PLOTS.map((plot, index) => <DashedOutline key={index} points={corners(plot)} y={PAD + 0.03} />)}
        {PARCELS.map((parcel) => {
          const isSelected = parcel.id === selected && researched;
          const parts = site.parcels[parcel.id];
          const pick = () => onPick(parcel.id);
          return (
            <group key={parcel.id}>
              {parts && <OlderBuilding parts={parts} selected={isSelected} onPick={pick} />}
              <PlotFill geometry={site.fills[parcel.id]} rect={parcel.plot} color={SELECT} strength={isSelected ? 0.62 : 0.28} sweepRef={sweepRef} instant={instant} onPick={pick} />
              {isSelected && swept ? <SolidOutline rect={parcel.plot} y={PAD + 0.03} /> : <DashedOutline points={corners(parcel.plot)} y={PAD + 0.03} />}
            </group>
          );
        })}
        <PlotFill geometry={site.fills.excluded} rect={EXCLUDED} color={BLOCKED} strength={0.22} sweepRef={sweepRef} instant={instant} />
        <DashedOutline points={corners(EXCLUDED)} y={PAD + 0.03} color={swept && researched ? BLOCKED : INK} />

        <Records site={site} show={mode === "records"} selected={selected} instant={instant} />
      </group>
    </ModelCanvas>
  );
}
