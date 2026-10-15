"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { SceneRuntime } from "./model-frame";
import {
  ContactShadow, EDGE_INK, EDGE_SOFT, GHOST, Ground, INK, ModelCanvas, OK, bx, cylinder, edgesOf, physical, pickHandlers, standard, tinted, useTween,
  type Point, type SceneLabel, type View,
} from "./scene-kit";
import {
  BAR, COLUMN, DASHBOARD, FOLLOW_UP, FOLLOW_UP_STORE, GROOMERS, GROOMER_Z, MIX, MIX_SCALE, MIX_SIZE, PLINTH, RETURNING, REVENUE, REVENUE_SCALE, ROOF_Z, STORE, STORE_IDS, STORE_NAME, STORE_X, VIEWS,
  columnX, groomerX, lineControls, returnPoint, type Scope, type StoreId, type ViewId,
} from "./woof-gang-data";

export type WoofGangSceneProps = SceneRuntime & { view: ViewId; scope: Scope; narrow: boolean; onPick: (scope: Scope) => void };

/* Materials: warm matte paper, painted plaster and graphite trim. Blue only for grooming and connected stores. */

const M = {
  plinth: standard("#e3e1db", 0.86),
  plinthTop: standard("#efeeea", 0.92),
  walls: { a: physical("#f1efea", 0.72), b: physical("#e8e4dc", 0.72), c: physical("#f4f3ef", 0.72) } as Record<StoreId, THREE.Material>,
  deck: standard("#d8d5ce", 0.9),
  trim: standard("#3d4042", 0.55, 0.15),
  glass: physical("#34414b", 0.08, { clearcoat: 1, clearcoatRoughness: 0.12, envMapIntensity: 1.3 }),
  awningLight: standard("#f5f3ef", 0.88),
  awningDark: standard("#7b766d", 0.85),
  sidewalk: standard("#d5d1c9", 0.92),
  column: standard("#8e897f", 0.68),
  grooming: standard(OK, 0.55),
  retail: standard("#48494a", 0.6),
  customer: physical("#fbfaf7", 0.5, { clearcoat: 0.3 }),
  groomer: standard("#5a5b5d", 0.55),
  bar: standard("#8e897f", 0.68),
  line: standard("#2d2f31", 0.45),
  dashBase: standard("#d3d0c9", 0.7),
  screen: physical("#202427", 0.2, { clearcoat: 0.8, clearcoatRoughness: 0.2 }),
  tile: standard("#e6e4df", 0.6),
  dot: standard(OK, 0.5),
};
const PULSE = new THREE.MeshBasicMaterial({ color: OK, toneMapped: false });
const PATH = new THREE.LineDashedMaterial({ color: INK, dashSize: 0.1, gapSize: 0.08, transparent: true, opacity: 0.45 });

/* Geometry, built once per page load. */

function merge(parts: THREE.BufferGeometry[]) {
  const prepared = parts.map((part) => (part.index ? part.toNonIndexed() : part));
  prepared.forEach((part) => { if (!part.attributes.uv) part.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(part.attributes.position.count * 2), 2)); });
  return mergeGeometries(prepared) ?? new THREE.BufferGeometry();
}

const ROOF_Y = STORE.height + 0.05;
const PARAPET_TOP = STORE.height + STORE.parapet;
const OPENINGS: { x: [number, number]; y: [number, number]; mullion?: boolean }[] = [
  { x: [-1.18, -0.42], y: [0.32, 1.08], mullion: true },
  { x: [-0.28, 0.28], y: [0.05, 1.12] },
  { x: [0.42, 1.18], y: [0.32, 1.08], mullion: true },
];

function frameStrips(x: [number, number], y: [number, number], mullion?: boolean) {
  const t = 0.045;
  const z: [number, number] = [-0.05, 0.025];
  const strips = [
    bx([x[0] - t, x[1] + t], [y[1], y[1] + t], z, 0.008),
    bx([x[0] - t, x[0]], [y[0], y[1]], z, 0.008),
    bx([x[1], x[1] + t], [y[0], y[1]], z, 0.008),
  ];
  if (y[0] > 0.1) strips.push(bx([x[0] - t, x[1] + t], [y[0] - t, y[0]], [-0.05, 0.06], 0.008));
  if (mullion) strips.push(bx([(x[0] + x[1]) / 2 - 0.015, (x[0] + x[1]) / 2 + 0.015], y, [-0.04, 0.0], 0.005));
  return strips;
}

function awning() {
  const light: THREE.BufferGeometry[] = [];
  const dark: THREE.BufferGeometry[] = [];
  const count = 9;
  const width = 2.56;
  const stripe = width / count;
  const top = 1.25;
  const front = 0.7;
  const drop = 0.26;
  const length = Math.hypot(front, drop);
  const angle = Math.atan2(drop, front);
  for (let index = 0; index < count; index++) {
    const x = -width / 2 + stripe * (index + 0.5);
    const canopy = new THREE.BoxGeometry(stripe, 0.024, length).rotateX(angle).translate(x, top - drop / 2, front / 2 - 0.02);
    const valance = new THREE.BoxGeometry(stripe, 0.13, 0.02).translate(x, top - drop - 0.06, front - 0.01);
    (index % 2 ? dark : light).push(canopy, valance);
  }
  return { light: merge(light), dark: merge(dark) };
}

function buildStore() {
  const { half, z: [z0], height: h, parapet: p } = STORE;
  const frames = OPENINGS.flatMap((opening) => frameStrips(opening.x, opening.y, opening.mullion));
  const board = [-1, 1].map((side) => new THREE.BoxGeometry(0.3, 0.44, 0.025).rotateX(side * 0.2).translate(0.86, 0.26, 0.45 + side * 0.045));
  const { light, dark } = awning();
  return {
    sidewalk: bx([-half - 0.2, half + 0.2], [0, 0.05], [z0 - 0.14, 0.66], 0.02),
    outline: new THREE.BoxGeometry(half * 2, h + p - 0.05, -z0 - 0.02).translate(0, (h + p + 0.05) / 2, (z0 - 0.02) / 2),
    walls: merge([
      bx([-half, half], [0.05, h], [z0, -0.04], 0.03),
      bx([-half, half], [h, h + p], [-0.13, -0.02], 0.02),
      bx([-half, half], [h, h + p], [z0, z0 + 0.11], 0.02),
      bx([-half, -half + 0.11], [h, h + p], [z0, -0.02], 0.02),
      bx([half - 0.11, half], [h, h + p], [z0, -0.02], 0.02),
      bx([-half - 0.02, -half + 0.1], [0.05, h], [-0.12, 0.03], 0.015),
      bx([half - 0.1, half + 0.02], [0.05, h], [-0.12, 0.03], 0.015),
    ]),
    deck: bx([-half + 0.11, half - 0.11], [h - 0.02, ROOF_Y], [z0 + 0.11, -0.13], 0.01),
    glass: merge(OPENINGS.map(({ x, y }) => bx(x, [Math.max(y[0], 0.08), y[1]], [-0.07, -0.025], 0.004))),
    trim: merge([...frames, bx([-1.3, 1.3], [1.3, 1.52], [-0.05, 0.05], 0.015), bx([-0.06, 0.06], [0.55, 0.62], [0.025, 0.06], 0.01), ...board]),
    awningLight: light,
    awningDark: dark,
  };
}

function pawn(base: number, body: [number, number, number], head: number) {
  const [top, bottom, height] = body;
  return merge([
    cylinder(base, 0.035, "y", [0, 0.0175, 0], 22),
    new THREE.CylinderGeometry(top, bottom, height, 22).translate(0, 0.035 + height / 2, 0),
    new THREE.SphereGeometry(head, 20, 14).translate(0, 0.035 + height + head * 0.8, 0),
  ]);
}

const DASH_TILT = 0.45;
const DASH_SCREEN: Point = [0, 0.5, (DASHBOARD.z[0] + DASHBOARD.z[1]) / 2];
const TILE_X = [-1.08, -0.36, 0.36, 1.08];
const DOT_X: Record<StoreId, number> = { a: -0.42, b: 0, c: 0.42 };

function lineCurve(id: StoreId) {
  const [start, control, end] = lineControls(id).map((point) => new THREE.Vector3(...point));
  return new THREE.QuadraticBezierCurve3(start, control, end);
}

const byStore = <T,>(make: (id: StoreId) => T) => Object.fromEntries(STORE_IDS.map((id) => [id, make(id)])) as Record<StoreId, T>;

function buildKit() {
  const curves = byStore(lineCurve);
  const pathPoints = Array.from({ length: 40 }, (_, index) => {
    const [x, z] = returnPoint(index / 39);
    return new THREE.Vector3(x, 0.06, z);
  });
  const path = new THREE.BufferGeometry().setFromPoints(pathPoints);
  return {
    plinth: bx(PLINTH.x, [-PLINTH.height, -0.02], PLINTH.z, 0.06),
    plinthTop: bx([PLINTH.x[0] + 0.12, PLINTH.x[1] - 0.12], [-0.04, 0], [PLINTH.z[0] + 0.12, PLINTH.z[1] - 0.12], 0.02),
    store: buildStore(),
    columns: byStore((id) => REVENUE[id].map((value) => bx([-COLUMN.width / 2, COLUMN.width / 2], [0, value * REVENUE_SCALE], [-COLUMN.depth / 2, COLUMN.depth / 2], 0.03))),
    mixUnit: bx([-MIX_SIZE / 2, MIX_SIZE / 2], [0, 1], [-MIX_SIZE / 2, MIX_SIZE / 2], 0.015),
    customer: pawn(0.13, [0.08, 0.12, 0.28], 0.1),
    groomer: pawn(0.16, [0.1, 0.15, 0.36], 0.12),
    bars: byStore((id) => GROOMERS[id].map((value) => bx([-BAR.width / 2, BAR.width / 2], [0, BAR.height], [0, value * BAR.scale], 0.02))),
    tubes: byStore((id) => new THREE.TubeGeometry(curves[id], 64, 0.024, 8, false)),
    curves,
    pulse: new THREE.SphereGeometry(0.075, 14, 10),
    path,
    dashBase: bx(DASHBOARD.x, [0, DASHBOARD.height], DASHBOARD.z, 0.05),
    screen: bx([-1.56, 1.56], [-0.03, 0.03], [-0.44, 0.44], 0.025),
    tile: bx([-0.31, 0.31], [0.03, 0.045], [-0.34, 0.1], 0.01),
    dot: bx([-0.08, 0.08], [0.03, 0.05], [0.2, 0.34], 0.01),
  };
}
type Kit = ReturnType<typeof buildKit>;
let kit: Kit | null = null;
const getKit = () => (kit ??= buildKit());

/* Parts */

type Edge = "ink" | "soft";

// `plain` skips edges on merged shapes that carry a separate clean outline.
function Piece({ geometry, material, ghost, selected, edge, tint, shadow = true, plain }: { geometry: THREE.BufferGeometry; material: THREE.Material; ghost?: boolean; selected?: boolean; edge?: Edge; tint?: number; shadow?: boolean; plain?: boolean }) {
  const resolved = ghost ? GHOST : selected ? tinted(material, tint) : material;
  const lines = plain ? null : ghost ? (edge ? EDGE_SOFT : null) : selected || edge === "ink" ? EDGE_INK : edge === "soft" ? EDGE_SOFT : null;
  return (
    <>
      <mesh geometry={geometry} material={resolved} castShadow={shadow && !ghost} receiveShadow={!ghost} />
      {lines && <lineSegments geometry={edgesOf(geometry)} material={lines} />}
    </>
  );
}

function Store({ id, ghost, selected, onPick }: { id: StoreId; ghost: boolean; selected: boolean; onPick: () => void }) {
  const s = getKit().store;
  return (
    <group position={[STORE_X[id], 0, 0]} {...pickHandlers(onPick)}>
      <Piece geometry={s.sidewalk} material={M.sidewalk} ghost={ghost} />
      <Piece geometry={s.walls} material={M.walls[id]} ghost={ghost} selected={selected} tint={0.42} plain />
      {(ghost || selected) && <lineSegments geometry={edgesOf(s.outline)} material={ghost ? EDGE_SOFT : EDGE_INK} />}
      <Piece geometry={s.deck} material={M.deck} ghost={ghost} shadow={false} />
      <Piece geometry={s.glass} material={M.glass} ghost={ghost} shadow={false} />
      <Piece geometry={s.trim} material={M.trim} ghost={ghost} />
      <Piece geometry={s.awningLight} material={M.awningLight} ghost={ghost} />
      <Piece geometry={s.awningDark} material={M.awningDark} ghost={ghost} />
    </group>
  );
}

// Grows from zero with a short stagger, then hides below a sliver so nothing z-fights the deck.
const grow = (t: number, index: number) => Math.max(0, Math.min(1, t * 1.35 - index * 0.06));
function setScale(group: THREE.Object3D | null, axis: "y" | "z" | "all", value: number) {
  if (!group) return;
  group.visible = value > 0.002;
  const v = Math.max(value, 0.0001);
  if (axis === "all") group.scale.setScalar(v);
  else group.scale[axis] = v;
}

function RevenueMarks({ id, ghost, instant, on }: { id: StoreId; ghost: boolean; instant: boolean; on: boolean }) {
  const columns = getKit().columns[id];
  const groups = useRef<(THREE.Group | null)[]>([]);
  const t = useTween(on ? 1 : 0, instant, 800);
  useFrame(() => { groups.current.forEach((group, index) => setScale(group, "y", grow(t.current, index))); });
  return (
    <group position={[STORE_X[id], ROOF_Y, ROOF_Z]}>
      {columns.map((geometry, index) => (
        <group key={index} position={[columnX(index), 0, 0]} ref={(node) => { groups.current[index] = node; }}>
          <Piece geometry={geometry} material={M.column} ghost={ghost} edge="soft" />
        </group>
      ))}
    </group>
  );
}

function MixMarks({ id, ghost, instant, on }: { id: StoreId; ghost: boolean; instant: boolean; on: boolean }) {
  const unit = getKit().mixUnit;
  const grooming = useRef<THREE.Group>(null);
  const retail = useRef<THREE.Group>(null);
  const t = useTween(on ? 1 : 0, instant, 800);
  const { total, grooming: share } = MIX[id];
  useFrame(() => {
    const k = grow(t.current, 0);
    const low = total * share * MIX_SCALE * k;
    setScale(grooming.current, "y", low);
    setScale(retail.current, "y", total * (1 - share) * MIX_SCALE * k);
    retail.current?.position.setY(low);
  });
  return (
    <group position={[STORE_X[id], ROOF_Y, ROOF_Z]}>
      <group ref={grooming}><Piece geometry={unit} material={M.grooming} ghost={ghost} edge="soft" /></group>
      <group ref={retail}><Piece geometry={unit} material={M.retail} ghost={ghost} edge="soft" /></group>
    </group>
  );
}

const WALK_MS = 9000;
const fade = (u: number) => Math.max(0, Math.min(1, u / 0.06, (1 - u) / 0.05));

// Customers walk one full loop to the door when the view opens, then rest in the same slots the static layout uses.
function ReturnMarks({ id, ghost, instant, on, active, signal }: { id: StoreId; ghost: boolean; instant: boolean; on: boolean; active: boolean; signal: string }) {
  const k = getKit();
  const count = RETURNING[id];
  const tokens = useRef<(THREE.Group | null)[]>([]);
  const due = useRef<THREE.Group>(null);
  const path = useRef<THREE.Line>(null);
  const started = useRef(-Infinity);
  const t = useTween(on ? 1 : 0, instant, 700);
  const line = useMemo(() => { const object = new THREE.Line(k.path, PATH); object.computeLineDistances(); return object; }, [k.path]);
  useEffect(() => { if (on && active) started.current = performance.now(); }, [on, active, signal]);
  useFrame((state) => {
    const show = t.current;
    const phase = instant || !on ? 1 : Math.min(1, (performance.now() - started.current) / WALK_MS);
    tokens.current.forEach((token, index) => {
      if (!token) return;
      const u = ((index + 0.6) / count + phase) % 1;
      const [x, z] = returnPoint(u);
      token.position.set(x, 0, z);
      setScale(token, "all", show * fade(u));
    });
    setScale(due.current, "all", show);
    if (path.current) path.current.visible = show > 0.05;
    if (phase < 1) state.invalidate();
  });
  return (
    <group position={[STORE_X[id], 0, 0]}>
      <primitive ref={path} object={line} />
      {Array.from({ length: count }, (_, index) => (
        <group key={index} ref={(node) => { tokens.current[index] = node; }}>
          <Piece geometry={k.customer} material={M.customer} ghost={ghost} edge={ghost ? undefined : "soft"} />
        </group>
      ))}
      {id === FOLLOW_UP_STORE && (
        <group ref={due}>
          {FOLLOW_UP.map(([x, z], index) => (
            <group key={index} position={[x, 0, z]}>
              <Piece geometry={k.customer} material={M.customer} ghost={ghost} selected={!ghost} tint={0.85} />
            </group>
          ))}
        </group>
      )}
    </group>
  );
}

function GroomerMarks({ id, ghost, instant, on }: { id: StoreId; ghost: boolean; instant: boolean; on: boolean }) {
  const k = getKit();
  const values = GROOMERS[id];
  const people = useRef<(THREE.Group | null)[]>([]);
  const bars = useRef<(THREE.Group | null)[]>([]);
  const t = useTween(on ? 1 : 0, instant, 800);
  useFrame(() => {
    values.forEach((_, index) => {
      setScale(people.current[index], "all", Math.min(1, t.current * 1.6));
      setScale(bars.current[index], "z", grow(t.current, index + 2));
    });
  });
  return (
    <group position={[STORE_X[id], 0, 0]}>
      {values.map((_, index) => {
        const x = groomerX(values.length, index);
        return (
          <group key={index}>
            <group position={[x, 0, GROOMER_Z]} ref={(node) => { people.current[index] = node; }}>
              <Piece geometry={k.groomer} material={M.groomer} ghost={ghost} />
            </group>
            <group position={[x, 0, BAR.start]} ref={(node) => { bars.current[index] = node; }}>
              <Piece geometry={k.bars[id][index]} material={M.bar} ghost={ghost} edge="soft" />
            </group>
          </group>
        );
      })}
    </group>
  );
}

const PULSE_MS = 2600;

function DataLines({ scope, instant, active, signal }: { scope: Scope; instant: boolean; active: boolean; signal: string }) {
  const k = getKit();
  const pulses = useRef<(THREE.Mesh | null)[]>([]);
  const started = useRef(-Infinity);
  useEffect(() => { if (active) started.current = performance.now(); }, [signal, active]);
  useFrame((state) => {
    const elapsed = instant ? Infinity : performance.now() - started.current;
    const running = elapsed < PULSE_MS;
    STORE_IDS.forEach((id, storeIndex) => {
      for (let n = 0; n < 2; n++) {
        const mesh = pulses.current[storeIndex * 2 + n];
        if (!mesh) continue;
        const u = elapsed / PULSE_MS * 1.6 - n * 0.45 - storeIndex * 0.08;
        mesh.visible = running && u > 0 && u < 1 && (scope === "all" || scope === id);
        if (mesh.visible) k.curves[id].getPointAt(u, mesh.position);
      }
    });
    if (running) state.invalidate();
  });
  return (
    <>
      {STORE_IDS.map((id, storeIndex) => (
        <group key={id}>
          <Piece geometry={k.tubes[id]} material={M.line} ghost={scope !== "all" && scope !== id} shadow={false} />
          {[0, 1].map((n) => <mesh key={n} ref={(node) => { pulses.current[storeIndex * 2 + n] = node; }} geometry={k.pulse} material={PULSE} visible={false} />)}
        </group>
      ))}
    </>
  );
}

function Dashboard({ view, scope, onPick }: { view: ViewId; scope: Scope; onPick: () => void }) {
  const k = getKit();
  return (
    <group {...pickHandlers(onPick)}>
      <Piece geometry={k.dashBase} material={M.dashBase} />
      <group position={DASH_SCREEN} rotation={[DASH_TILT, 0, 0]}>
        <Piece geometry={k.screen} material={M.screen} />
        {VIEWS.map((option, index) => (
          <group key={option.value} position={[TILE_X[index], 0, 0]}>
            <Piece geometry={k.tile} material={M.tile} selected={option.value === view} tint={0.85} shadow={false} />
          </group>
        ))}
        {STORE_IDS.map((id) => (
          <group key={id} position={[DOT_X[id], 0, 0]}>
            <Piece geometry={k.dot} material={scope === id ? M.tile : M.dot} selected={scope === id} tint={0.9} shadow={false} />
          </group>
        ))}
      </group>
    </group>
  );
}

/* Camera and labels */

const ALL_VIEW: View = { position: [2.8, 7, 16.4], target: [0, 1.15, 0.55], narrow: { position: [14.6, 15, 16.6], target: [0.9, 0.7, 0.6] } };
const storeView = (id: StoreId): View => {
  const x = STORE_X[id];
  return { position: [x + 3.6, 7.2, 13.6], target: [x, 1.75, 0.3], narrow: { position: [x + 4.6, 9.6, 15.8], target: [x, 1.5, 0.8] } };
};

const lift = ([x, y, z]: Point): Point => [x, y + PLINTH.height, z];

function storeAnchor(id: StoreId, view: ViewId): Point {
  const x = STORE_X[id];
  if (view === "revenue") return lift([x, ROOF_Y + Math.max(...REVENUE[id]) * REVENUE_SCALE + 0.04, ROOF_Z]);
  if (view === "mix") return lift([x, ROOF_Y + MIX[id].total * MIX_SCALE + 0.02, ROOF_Z]);
  return lift([x, PARAPET_TOP, ROOF_Z]);
}

const OVERVIEW_DETAIL: Record<ViewId, (id: StoreId) => string | undefined> = {
  revenue: (id) => (id === "a" ? "Example data, relative scale" : undefined),
  mix: () => undefined,
  returns: () => undefined,
  groomers: (id) => `${GROOMERS[id].length} example groomers`,
};

const FOCUS_DETAIL: Record<ViewId, string> = {
  revenue: "Example data, relative scale",
  mix: "In focus",
  returns: "Customers returning",
  groomers: "Bars show recorded service activity",
};

function sceneLabels(view: ViewId, scope: Scope, narrow: boolean): SceneLabel[] {
  const labels: SceneLabel[] = [];
  const stores = scope === "all" ? STORE_IDS : [scope];
  stores.forEach((id) => labels.push({
    id: `store-${id}`,
    at: storeAnchor(id, view),
    title: STORE_NAME[id],
    detail: scope === "all" ? OVERVIEW_DETAIL[view](id) : FOCUS_DETAIL[view],
    state: scope === id ? "select" : undefined,
    lift: scope === "all" ? 26 : 30,
  }));
  if (scope === "all" && !narrow && (view === "revenue" || view === "mix")) labels.push({ id: "dashboard", at: lift([-1.45, 0.66, DASHBOARD.z[0] + 0.2]), title: "Shared dashboard", state: "ok", lift: 12 });
  if (scope !== "all") {
    const x = STORE_X[scope];
    if (view === "mix") labels.push({ id: "grooming", at: lift([x + MIX_SIZE / 2, ROOF_Y + MIX[scope].total * MIX[scope].grooming * MIX_SCALE * 0.5, ROOF_Z + MIX_SIZE / 2]), title: "Grooming services", detail: "Retail above, in graphite", state: "ok", lift: 18 });
  }
  if (view === "returns" && (scope === "all" || scope === FOLLOW_UP_STORE)) {
    labels.push({ id: "due", at: lift([STORE_X[FOLLOW_UP_STORE] + 1.1, 0.6, 1.55]), title: "May be due for follow-up", detail: "Example group, for review", state: "select", lift: 22 });
  }
  return labels;
}

export default function WoofGangScene({ active, instant, onReady, view, scope, narrow, onPick }: WoofGangSceneProps) {
  const k = getKit();
  const labels = useMemo(() => sceneLabels(view, scope, narrow), [view, scope, narrow]);
  const camera = scope === "all" ? ALL_VIEW : storeView(scope);
  return (
    <ModelCanvas active={active} instant={instant} onReady={onReady} view={camera} labels={labels} extent={8} center={[0, 0, 0.8]} fov={26} fog={[24, 48]}>
      <Ground />
      <ContactShadow width={15.5} depth={10} position={[0, 0.006, 1]} opacity={0.42} />
      <group position={[0, PLINTH.height, 0]}>
        <Piece geometry={k.plinth} material={M.plinth} />
        <Piece geometry={k.plinthTop} material={M.plinthTop} shadow={false} />
        {STORE_IDS.map((id) => {
          const ghost = scope !== "all" && scope !== id;
          const pick = () => onPick(scope === id ? "all" : id);
          return (
            <group key={id}>
              <Store id={id} ghost={ghost} selected={scope === id} onPick={pick} />
              <RevenueMarks id={id} ghost={ghost} instant={instant} on={view === "revenue"} />
              <MixMarks id={id} ghost={ghost} instant={instant} on={view === "mix"} />
              <ReturnMarks id={id} ghost={ghost} instant={instant} on={view === "returns"} active={active} signal={scope} />
              <GroomerMarks id={id} ghost={ghost} instant={instant} on={view === "groomers"} />
            </group>
          );
        })}
        <DataLines scope={scope} instant={instant} active={active} signal={`${view}:${scope}`} />
        <Dashboard view={view} scope={scope} onPick={() => onPick("all")} />
      </group>
    </ModelCanvas>
  );
}
