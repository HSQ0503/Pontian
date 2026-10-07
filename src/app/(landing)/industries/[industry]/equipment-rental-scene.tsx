"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import {
  ARM_Z, BOOM_OUTLINE, BREAKER_PARTS, BUCKET_OUTLINE, CAB_OUTLINE, CAB_Z, COUNTERWEIGHT_OUTLINE, HOUSE, POSES, STICK_OUTLINE,
  TRACK, TRANSPORT_DUNNAGE, armFrame, toolOutline, trackOutline, lowestPoint, type Box, type Pose, type Tool, type Vec,
} from "./equipment-rental-geometry";
import { BREAKER, EX014, EX027, TRANSPORT } from "./equipment-rental-fleet";

export type MatchFocus = "attachment" | "capability" | "transport" | "availability" | "inspection";
export type DeliveryFocus = "overview" | "machine" | "attachment" | "transport" | "site";
export type RentalFocus = "ex014" | "ex027" | "both";
export type ReturnArea = "overall" | "sidePanel" | "attachment" | "undercarriage" | "meter";
export type MachineId = typeof EX014 | typeof EX027;

export type SceneProps = { onReady: () => void } & (
  | { kind: "match"; focus: MatchFocus; machine: MachineId; documented: boolean; onPick: (machine: MachineId, focus?: MatchFocus) => void }
  | { kind: "delivery"; focus: DeliveryFocus; transport: boolean; site: boolean; onPick: (focus: DeliveryFocus) => void }
  | { kind: "rental"; focus: RentalFocus; conflict: boolean; onPick: (focus: RentalFocus) => void }
  | { kind: "return"; area: ReturnArea; stage: number; stacked: boolean }
);

const C = {
  body: "#ecece9", body2: "#d4d5d3", dark: "#303233", track: "#3a3c3d", steel: "#7b7e7f", rod: "#c9cac8", glass: "#56626a",
  edge: "#262829", ground: "#f5f5f2", grid: "#dfdfdb", pad: "#e6e6e2", rock: "#cfcabf", rock2: "#bdb7aa",
  blue: "#007dfe", yellow: "#fed603", red: "#f51625",
};

type Tone = "blue" | "yellow" | "red";
type Area = "tracks" | "house" | "sidePanel" | "cab" | "arm" | "coupler" | "tool";
type Highlight = Partial<Record<Area, Tone>>;

function boxGeometry({ x, y, z }: Box) {
  const geometry = new THREE.BoxGeometry(x[1] - x[0], y[1] - y[0], z[1] - z[0]);
  geometry.translate((x[0] + x[1]) / 2, (y[0] + y[1]) / 2, (z[0] + z[1]) / 2);
  return geometry;
}

function extrude(outline: Vec[], z0: number, z1: number) {
  const shape = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y)));
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: z1 - z0, bevelEnabled: false });
  geometry.translate(0, 0, z0);
  return geometry;
}

function cylinderAlongX(x0: number, x1: number, radius: number, segments = 20) {
  const geometry = new THREE.CylinderGeometry(radius, radius, x1 - x0, segments);
  geometry.rotateZ(-Math.PI / 2);
  geometry.translate((x0 + x1) / 2, 0, 0);
  return geometry;
}

function cylinderBetween(a: Vec, b: Vec, z: number, radius: number) {
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const geometry = new THREE.CylinderGeometry(radius, radius, length, 14);
  geometry.rotateZ(Math.atan2(b[1] - a[1], b[0] - a[0]) - Math.PI / 2);
  geometry.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z);
  return geometry;
}

type StaticParts = Record<string, THREE.BufferGeometry>;
let staticParts: StaticParts | null = null;

function getStaticParts(): StaticParts {
  if (staticParts) return staticParts;
  const track = trackOutline(12);
  const half = TRACK.gauge / 2;
  const w = TRACK.width / 2;
  const rollers = [-1.3, -0.65, 0, 0.65, 1.3];
  const parts: StaticParts = {
    trackRight: extrude(track, half - w, half + w),
    trackLeft: extrude(track, -half - w, -half + w),
    carBody: boxGeometry({ x: [-1.1, 1.1], y: [0.42, 0.82], z: [-half + w, half - w] }),
    swing: new THREE.CylinderGeometry(1.05, 1.05, 0.16, 32).translate(0, 0.9, 0),
    deck: boxGeometry(HOUSE.deck),
    hood: boxGeometry(HOUSE.hood),
    compartment: boxGeometry(HOUSE.compartment),
    sidePanel: boxGeometry(HOUSE.sidePanel),
    counterweight: extrude(COUNTERWEIGHT_OUTLINE, -1.25, 1.25),
    cab: extrude(CAB_OUTLINE, CAB_Z[0], CAB_Z[1]),
    exhaust: new THREE.CylinderGeometry(0.06, 0.06, 0.4, 12).translate(-0.75, 2.4, 0.75),
    railFront: new THREE.CylinderGeometry(0.025, 0.025, 0.5, 8).translate(1.12, 2.2, 1.18),
    railRear: new THREE.CylinderGeometry(0.025, 0.025, 0.5, 8).translate(-0.05, 2.2, 1.18),
    railTop: cylinderAlongX(-0.05, 1.12, 0.025, 8).translate(0, 2.45, 1.18),
    meter: boxGeometry({ x: [0.95, 1.12], y: [1.78, 1.92], z: [-0.52, -0.38] }),
    boom: extrude(BOOM_OUTLINE, ARM_Z - 0.25, ARM_Z + 0.25),
    stick: extrude(STICK_OUTLINE, ARM_Z - 0.21, ARM_Z + 0.21),
    coupler: boxGeometry({ x: [-0.16, 0.18], y: [-0.2, 0.22], z: [ARM_Z - 0.3, ARM_Z + 0.3] }),
    bucketShell: extrude(BUCKET_OUTLINE, ARM_Z - 0.55, ARM_Z + 0.55),
    breakerBracket: boxGeometry({ x: [BREAKER_PARTS.bracket.x0, BREAKER_PARTS.bracket.x1], y: [-0.3, 0.3], z: [ARM_Z - 0.3, ARM_Z + 0.3] }),
    breakerBody: cylinderAlongX(BREAKER_PARTS.body.x0, BREAKER_PARTS.body.x1, BREAKER_PARTS.body.radius).translate(0, 0, ARM_Z),
    breakerChisel: cylinderAlongX(BREAKER_PARTS.chisel.x0, BREAKER_PARTS.chisel.x1, BREAKER_PARTS.chisel.radius, 12).translate(0, 0, ARM_Z),
  };
  ([1, -1] as const).forEach((side) => {
    const z = side * (half + w + 0.03);
    [-1, 1].forEach((end) => {
      parts[`wheel${side}${end}`] = new THREE.CylinderGeometry(0.34, 0.34, 0.08, 24).rotateX(Math.PI / 2).translate(end * (TRACK.length / 2 - TRACK.height / 2), TRACK.height / 2, z);
    });
    rollers.forEach((x, index) => {
      parts[`roller${side}${index}`] = new THREE.CylinderGeometry(0.11, 0.11, 0.06, 14).rotateX(Math.PI / 2).translate(x, 0.2, z);
    });
  });
  const glassSide: Vec[] = [[0.05, 1.98], [1.17, 1.98], [1.05, 2.86], [0.05, 2.86]];
  parts.glassLeft = extrude(glassSide, CAB_Z[0] - 0.012, CAB_Z[0] - 0.002);
  parts.glassRight = extrude(glassSide, CAB_Z[1] + 0.002, CAB_Z[1] + 0.012);
  const front = new THREE.BoxGeometry(0.02, 0.78, CAB_Z[1] - CAB_Z[0] - 0.16);
  front.rotateZ(Math.atan2(2.98 - 2.12, 1.12 - 1.32) - Math.PI / 2);
  front.translate(1.235, 2.53, (CAB_Z[0] + CAB_Z[1]) / 2);
  parts.glassFront = front;
  staticParts = parts;
  return parts;
}

const armCache = new Map<string, Record<string, THREE.BufferGeometry>>();

function getArmParts(pose: Pose) {
  const key = `${pose.boom}:${pose.stick}:${pose.tool}`;
  const cached = armCache.get(key);
  if (cached) return cached;
  const { cylinders } = armFrame(pose);
  const parts: Record<string, THREE.BufferGeometry> = {};
  ([[ARM_Z - 0.33, "boomLeft"], [ARM_Z + 0.33, "boomRight"]] as const).forEach(([z, name]) => {
    parts[`${name}Barrel`] = cylinderBetween(cylinders.boom[0], lerp(cylinders.boom[0], cylinders.boom[1], 0.62), z, 0.1);
    parts[`${name}Rod`] = cylinderBetween(cylinders.boom[0], cylinders.boom[1], z, 0.055);
  });
  parts.stickBarrel = cylinderBetween(cylinders.stick[0], lerp(cylinders.stick[0], cylinders.stick[1], 0.6), ARM_Z, 0.1);
  parts.stickRod = cylinderBetween(cylinders.stick[0], cylinders.stick[1], ARM_Z, 0.055);
  parts.toolBarrel = cylinderBetween(cylinders.tool[0], lerp(cylinders.tool[0], cylinders.tool[1], 0.6), ARM_Z, 0.085);
  parts.toolRod = cylinderBetween(cylinders.tool[0], cylinders.tool[1], ARM_Z, 0.045);
  armCache.set(key, parts);
  return parts;
}

function lerp(a: Vec, b: Vec, t: number): Vec {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
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

const toneColor: Record<Tone, string> = { blue: C.blue, yellow: C.yellow, red: C.red };

type PartProps = {
  geometry: THREE.BufferGeometry;
  color: string;
  tone?: Tone;
  ghost?: boolean;
  edges?: boolean;
  opacity?: number;
};

function Part({ geometry, color, tone, ghost, edges = true, opacity }: PartProps) {
  const edgeGeometry = useMemo(() => (edges ? new THREE.EdgesGeometry(geometry, 28) : null), [geometry, edges]);
  const fill = tone ? toneColor[tone] : color;
  const alpha = opacity ?? (ghost ? 0.16 : 1);
  return (
    <>
      <mesh geometry={geometry}>
        <meshStandardMaterial color={fill} roughness={0.82} metalness={0.04} transparent={alpha < 1} opacity={alpha} depthWrite={alpha === 1} />
      </mesh>
      {edgeGeometry && (
        <lineSegments geometry={edgeGeometry}>
          <lineBasicMaterial color={C.edge} transparent opacity={ghost ? 0.32 : 0.42} />
        </lineSegments>
      )}
    </>
  );
}

function rootFontFamily() {
  const root = document.querySelector(".pontian-root");
  return root ? getComputedStyle(root).fontFamily : "sans-serif";
}

type LabelTone = "plain" | "flag" | "alert" | "ok" | "ink" | "paint";
const LABEL_TONES: Record<LabelTone, [string, string]> = {
  plain: ["#ffffff", "#17191a"],
  flag: [C.yellow, "#17191a"],
  alert: [C.red, "#ffffff"],
  ok: [C.blue, "#ffffff"],
  ink: ["#17191a", "#ffffff"],
  paint: ["transparent", "#262829"],
};

function makeLabel(lines: string[], tone: LabelTone) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const family = rootFontFamily();
  const scale = 2;
  const size = [30, 24];
  const padX = 22;
  const padY = 16;
  const gap = 8;
  if (!context) return { texture: new THREE.Texture(), aspect: 1 };
  const fonts = lines.map((_, index) => `${index === 0 ? 600 : 400} ${size[Math.min(index, 1)] * scale}px ${family}`);
  const widths = lines.map((line, index) => {
    context.font = fonts[index];
    return context.measureText(line).width;
  });
  const heights = lines.map((_, index) => size[Math.min(index, 1)] * scale);
  canvas.width = Math.ceil(Math.max(...widths) + padX * 2 * scale);
  canvas.height = Math.ceil(heights.reduce((sum, h) => sum + h, 0) + gap * scale * (lines.length - 1) + padY * 2 * scale);
  const [background, foreground] = LABEL_TONES[tone];
  if (background !== "transparent") {
    context.fillStyle = background;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  context.fillStyle = foreground;
  context.textBaseline = "top";
  let y = padY * scale;
  lines.forEach((line, index) => {
    context.font = fonts[index];
    context.globalAlpha = index === 0 ? 1 : 0.86;
    context.fillText(line, padX * scale, y);
    y += heights[index] + gap * scale;
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return { texture, aspect: canvas.width / canvas.height };
}

function useLabel(lines: string[], tone: LabelTone) {
  const key = `${tone}:${lines.join("|")}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const label = useMemo(() => makeLabel(lines, tone), [key]);
  useEffect(() => () => label.texture.dispose(), [label]);
  return label;
}

const TAG_ANCHOR = new THREE.Vector2(0.5, 0);

function Tag({ lines, tone = "plain", position, height = 0.036 }: { lines: string[]; tone?: LabelTone; position: [number, number, number]; height?: number }) {
  const { texture, aspect } = useLabel(lines, tone);
  const scaled = height * (lines.length > 1 ? 1.65 : 1);
  return (
    <sprite position={position} scale={[scaled * aspect, scaled, 1]} renderOrder={10} center={TAG_ANCHOR}>
      <spriteMaterial map={texture} depthTest={false} sizeAttenuation={false} transparent />
    </sprite>
  );
}

function Decal({ text, position, rotationY, height = 0.3 }: { text: string; position: [number, number, number]; rotationY: number; height?: number }) {
  const { texture, aspect } = useLabel([text], "paint");
  return (
    <mesh position={position} rotation={[0, rotationY, 0]} renderOrder={2}>
      <planeGeometry args={[height * aspect, height]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} polygonOffset polygonOffsetFactor={-2} />
    </mesh>
  );
}

let scuffTexture: THREE.CanvasTexture | null = null;
function getScuffTexture() {
  if (scuffTexture) return scuffTexture;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  if (context) {
    context.strokeStyle = "rgba(38, 40, 41, 0.78)";
    context.lineCap = "round";
    [[20, 70, 120, 52, 7], [40, 88, 170, 60, 4], [70, 98, 220, 74, 3], [30, 60, 90, 50, 3]].forEach(([x0, y0, x1, y1, width]) => {
      context.lineWidth = width;
      context.beginPath();
      context.moveTo(x0, y0);
      context.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 - 10, x1, y1);
      context.stroke();
    });
  }
  scuffTexture = new THREE.CanvasTexture(canvas);
  scuffTexture.colorSpace = THREE.SRGBColorSpace;
  return scuffTexture;
}

let shadowTexture: THREE.CanvasTexture | null = null;
function getShadowTexture() {
  if (shadowTexture) return shadowTexture;
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  if (context) {
    const gradient = context.createRadialGradient(64, 64, 8, 64, 64, 64);
    gradient.addColorStop(0, "rgba(23, 25, 26, 0.5)");
    gradient.addColorStop(1, "rgba(23, 25, 26, 0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);
  }
  shadowTexture = new THREE.CanvasTexture(canvas);
  return shadowTexture;
}

function Shadow({ width, depth, position = [0, 0.012, 0], opacity = 0.42 }: { width: number; depth: number; position?: [number, number, number]; opacity?: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={position} renderOrder={1}>
      <planeGeometry args={[width, depth]} />
      <meshBasicMaterial map={getShadowTexture()} transparent depthWrite={false} opacity={opacity} />
    </mesh>
  );
}

function Ring({ radius, tone, dashed, position }: { radius: number; tone: Tone | "ink"; dashed?: boolean; position: [number, number, number] }) {
  const ref = useRef<THREE.LineLoop>(null);
  const geometry = useMemo(() => {
    const points = Array.from({ length: 96 }, (_, index) => {
      const angle = (index / 96) * Math.PI * 2;
      return new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius * 0.72);
    });
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [radius]);
  useLayoutEffect(() => { ref.current?.computeLineDistances(); }, [geometry, dashed]);
  const color = tone === "ink" ? C.edge : toneColor[tone];
  return (
    <lineLoop ref={ref} geometry={geometry} position={[position[0], 0.03, position[2]]}>
      {dashed ? <lineDashedMaterial color={color} dashSize={0.45} gapSize={0.3} linewidth={2} /> : <lineBasicMaterial color={color} linewidth={2} />}
    </lineLoop>
  );
}

function DashedBox({ box, color }: { box: Box; color: string }) {
  const ref = useRef<THREE.LineSegments>(null);
  const geometry = useMemo(() => new THREE.EdgesGeometry(boxGeometry(box)), [box]);
  useLayoutEffect(() => { ref.current?.computeLineDistances(); }, [geometry]);
  return (
    <lineSegments ref={ref} geometry={geometry}>
      <lineDashedMaterial color={color} dashSize={0.3} gapSize={0.2} />
    </lineSegments>
  );
}

type Point = [number, number, number];

function Path({ from, to, color, dashed }: { from: Point; to: Point; color: string; dashed?: boolean }) {
  const [x0, y0, z0] = from;
  const [x1, y1, z1] = to;
  const line = useMemo(() => {
    const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x0, y0, z0), new THREE.Vector3(x1, y1, z1)]);
    const material = dashed ? new THREE.LineDashedMaterial({ color, dashSize: 0.6, gapSize: 0.4 }) : new THREE.LineBasicMaterial({ color });
    const object = new THREE.Line(geometry, material);
    object.computeLineDistances();
    return object;
  }, [x0, y0, z0, x1, y1, z1, color, dashed]);
  useEffect(() => () => {
    line.geometry.dispose();
    (line.material as THREE.Material).dispose();
  }, [line]);
  return <primitive object={line} />;
}

type ExcavatorProps = {
  id: string;
  pose: Pose;
  tool: Tool;
  position?: [number, number, number];
  rotation?: number;
  highlight?: Highlight;
  ghost?: boolean;
  mark?: boolean;
  onArea?: (area: Area) => void;
};

function Excavator({ id, pose, tool, position = [0, 0, 0], rotation = 0, highlight = {}, ghost, mark, onArea }: ExcavatorProps) {
  const parts = getStaticParts();
  const arm = getArmParts(pose);
  const frame = useMemo(() => armFrame(pose), [pose]);
  const handlers = (area: Area) => pickHandlers(onArea && (() => onArea(area)));
  const rad = (angle: number) => [0, 0, angle] as [number, number, number];
  const h = highlight;
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <group {...handlers("tracks")}>
        <Part geometry={parts.trackRight} color={C.track} tone={h.tracks} ghost={ghost} />
        <Part geometry={parts.trackLeft} color={C.track} tone={h.tracks} ghost={ghost} />
        <Part geometry={parts.carBody} color={C.dark} ghost={ghost} edges={false} />
        {Object.keys(parts).filter((key) => key.startsWith("wheel") || key.startsWith("roller")).map((key) => (
          <Part key={key} geometry={parts[key]} color={C.steel} ghost={ghost} edges={false} />
        ))}
      </group>
      <group position={[0, 0, 0]}>
        <Part geometry={parts.swing} color={C.dark} ghost={ghost} edges={false} />
        <group {...handlers("house")}>
          <Part geometry={parts.deck} color={C.dark} ghost={ghost} />
          <Part geometry={parts.hood} color={C.body} tone={h.house} ghost={ghost} />
          <Part geometry={parts.counterweight} color={C.body2} tone={h.house} ghost={ghost} />
          <Part geometry={parts.exhaust} color={C.dark} ghost={ghost} edges={false} />
        </group>
        <group {...handlers("sidePanel")}>
          <Part geometry={parts.compartment} color={C.body} tone={h.house} ghost={ghost} />
          <Part geometry={parts.sidePanel} color={C.body2} tone={h.sidePanel ?? h.house} ghost={ghost} />
          <Part geometry={parts.railFront} color={C.dark} ghost={ghost} edges={false} />
          <Part geometry={parts.railRear} color={C.dark} ghost={ghost} edges={false} />
          <Part geometry={parts.railTop} color={C.dark} ghost={ghost} edges={false} />
        </group>
        <group {...handlers("cab")}>
          <Part geometry={parts.cab} color={C.body} tone={h.cab} ghost={ghost} />
          <Part geometry={parts.glassLeft} color={C.glass} ghost={ghost} edges={false} opacity={ghost ? 0.12 : 0.9} />
          <Part geometry={parts.glassRight} color={C.glass} ghost={ghost} edges={false} opacity={ghost ? 0.12 : 0.9} />
          <Part geometry={parts.glassFront} color={C.glass} ghost={ghost} edges={false} opacity={ghost ? 0.12 : 0.9} />
          <Part geometry={parts.meter} color={h.cab ? C.yellow : C.dark} ghost={ghost} edges={false} />
        </group>
        <group {...handlers("arm")}>
          <group position={[0.78, 1.72, 0]} rotation={rad(frame.boomAngle)}>
            <Part geometry={parts.boom} color={C.body} tone={h.arm} ghost={ghost} />
          </group>
          <group position={[frame.stickPivot[0], frame.stickPivot[1], 0]} rotation={rad(frame.stickAngle)}>
            <Part geometry={parts.stick} color={C.body} tone={h.arm} ghost={ghost} />
          </group>
          {Object.keys(arm).map((key) => (
            <Part key={key} geometry={arm[key]} color={key.endsWith("Rod") ? C.rod : C.dark} ghost={ghost} edges={false} />
          ))}
        </group>
        <group position={[frame.toolPivot[0], frame.toolPivot[1], 0]} rotation={rad(frame.toolAngle)}>
          <group {...handlers("coupler")}>
            <Part geometry={parts.coupler} color={C.dark} tone={h.coupler} ghost={ghost} />
          </group>
          <group {...handlers("tool")}>
            {tool === "bucket" ? (
              <Part geometry={parts.bucketShell} color={C.steel} tone={h.tool} ghost={ghost} />
            ) : (
              <>
                <Part geometry={parts.breakerBracket} color={C.steel} tone={h.tool ?? h.coupler} ghost={ghost} />
                <Part geometry={parts.breakerBody} color={C.dark} tone={h.tool} ghost={ghost} />
                <Part geometry={parts.breakerChisel} color={C.steel} ghost={ghost} />
              </>
            )}
          </group>
        </group>
        {!ghost && (
          <>
            <Decal text={id} position={[-1.912, 1.62, 0]} rotationY={-Math.PI / 2} height={0.3} />
            <Decal text={id} position={[-0.68, 1.82, 1.207]} rotationY={0} height={0.26} />
            <Decal text={id} position={[-0.68, 1.82, -1.207]} rotationY={Math.PI} height={0.26} />
          </>
        )}
        {mark && (
          <mesh position={[0.72, 1.5, 1.283]} renderOrder={3}>
            <planeGeometry args={[0.5, 0.25]} />
            <meshBasicMaterial map={getScuffTexture()} transparent depthWrite={false} polygonOffset polygonOffsetFactor={-3} />
          </mesh>
        )}
      </group>
      {!ghost && <Shadow width={9.5} depth={5.2} position={[1.6, 0.012, 0]} />}
    </group>
  );
}

function StandaloneBreaker({ position, rotation = 0, tone, ghost, onClick }: { position: [number, number, number]; rotation?: number; tone?: Tone; ghost?: boolean; onClick?: () => void }) {
  const parts = getStaticParts();
  const block = useMemo(() => boxGeometry({ x: [-0.2, 0.2], y: [0, 0.22], z: [-0.45, 0.45] }), []);
  const events = pickHandlers(onClick);
  return (
    <group position={position} rotation={[0, rotation, 0]} {...events}>
      <group position={[0.75, 0, 0]}><Part geometry={block} color="#b8a98a" ghost={ghost} /></group>
      <group position={[1.75, 0, 0]}><Part geometry={block} color="#b8a98a" ghost={ghost} /></group>
      <group position={[0, 0.22 + BREAKER_PARTS.bracket.half, -ARM_Z]}>
        <Part geometry={parts.breakerBracket} color={C.steel} tone={tone} ghost={ghost} />
        <Part geometry={parts.breakerBody} color={C.dark} ghost={ghost} />
        <Part geometry={parts.breakerChisel} color={C.steel} ghost={ghost} />
      </group>
      {!ghost && <Shadow width={3.6} depth={1.6} position={[1.2, 0.012, 0]} opacity={0.3} />}
    </group>
  );
}

function Ground({ size = 220 }: { size?: number }) {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.002, 0]}>
        <planeGeometry args={[size, size]} />
        <meshBasicMaterial color={C.ground} />
      </mesh>
      <gridHelper args={[size, size / 2, C.grid, C.grid]} position={[0, 0.001, 0]} />
    </>
  );
}

function Slab({ box, color, ghost, edges = true }: { box: Box; color: string; ghost?: boolean; edges?: boolean }) {
  const geometry = useMemo(() => boxGeometry(box), [box]);
  return <Part geometry={geometry} color={color} ghost={ghost} edges={edges} />;
}

const YARD_POSTS = Array.from({ length: 9 }, (_, index) => -5.6 + index * 1.4);

function Yard({ x, label }: { x: number; label?: boolean }) {
  return (
    <group position={[x, 0, 0]}>
      <Slab box={{ x: [-6.5, 6.5], y: [0, 0.05], z: [-5, 5] }} color={C.pad} edges={false} />
      {[-2.2, 2.6].map((z) => <Slab key={z} box={{ x: [-6, 6], y: [0.05, 0.06], z: [z - 0.04, z + 0.04] }} color="#c3c4c1" edges={false} />)}
      {YARD_POSTS.map((z) => <Slab key={z} box={{ x: [-6.55, -6.45], y: [0, 1.6], z: [z - 0.05, z + 0.05] }} color={C.steel} edges={false} />)}
      <Slab box={{ x: [-6.55, -6.45], y: [1.5, 1.58], z: [-5.6, 5.6] }} color={C.steel} edges={false} />
      {label && <Tag lines={["Main rental yard"]} tone="ink" position={[4, 2.4, -4.6]} />}
    </group>
  );
}

const BENCHES: Box[] = [
  { x: [-9, 9], y: [0, 2.6], z: [-9.5, -5.8] },
  { x: [-9, 9], y: [2.6, 5.2], z: [-9.5, -7.6] },
];
const ROCKS: [number, number, number, number][] = [[6.6, 0.32, 2.6, 0.62], [6.1, 0.24, 3.7, 0.48], [7.5, 0.36, 3.3, 0.72], [4.2, 0.3, -3.8, 0.6], [5.4, 0.36, -4.4, 0.75]];

function Quarry({ x, label, pad }: { x: number; label?: boolean; pad?: "open" | "confirmed" }) {
  const rock = useMemo(() => new THREE.DodecahedronGeometry(1, 0), []);
  return (
    <group position={[x, 0, 0]}>
      <Slab box={{ x: [-9, 9], y: [-0.01, 0.03], z: [-9.5, 6] }} color="#e9e6df" edges={false} />
      {BENCHES.map((box, index) => <Slab key={index} box={box} color={index === 1 ? C.rock2 : C.rock} />)}
      {ROCKS.map(([rx, ry, rz, scale], index) => (
        <group key={index} position={[rx, ry, rz]} scale={[scale, scale * 0.7, scale]} rotation={[index, index * 0.7, 0]}>
          <Part geometry={rock} color={C.rock2} />
        </group>
      ))}
      {pad && (
        <group position={[-1.5, 0.04, 2.2]}>
          <DashedBox box={{ x: [-4.2, 4.2], y: [0, 0.02], z: [-2.6, 2.6] }} color={pad === "confirmed" ? C.blue : "#b59700"} />
          {pad === "confirmed" && <Slab box={{ x: [-4.2, 4.2], y: [0, 0.015], z: [-2.6, 2.6] }} color="#dbe9ff" edges={false} />}
        </group>
      )}
      {label && <Tag lines={["Customer's surface quarry"]} tone="ink" position={[0, 6.2, -8]} />}
    </group>
  );
}

const TRAILER_DECK_Y = 0.95;
const GOOSENECK: Vec[] = [[4.3, 0.8], [4.3, TRAILER_DECK_Y], [5.2, 1.65], [7.4, 1.65], [7.4, 1.3], [5.4, 1.3], [4.6, 0.8]];

function LowLoader({ ghost }: { ghost?: boolean }) {
  const wheel = useMemo(() => new THREE.CylinderGeometry(0.38, 0.38, 0.5, 22).rotateX(Math.PI / 2), []);
  const truckWheel = useMemo(() => new THREE.CylinderGeometry(0.52, 0.52, 0.55, 22).rotateX(Math.PI / 2), []);
  const gooseGeometry = useMemo(() => extrude(GOOSENECK, -1.2, 1.2), []);
  return (
    <group>
      <Slab box={{ x: [-8.7, 4.4], y: [0.8, TRAILER_DECK_Y], z: [-1.45, 1.45] }} color={C.dark} ghost={ghost} />
      <Part geometry={gooseGeometry} color={C.dark} ghost={ghost} />
      {[-7.9, -6.9, -5.9].flatMap((x) => [-1.0, 1.0].map((z) => (
        <group key={`${x}${z}`} position={[x, 0.38, z]}><Part geometry={wheel} color="#1f2122" ghost={ghost} edges={false} /></group>
      )))}
      <Slab box={{ x: [5.4, 11.8], y: [0.72, 1.02], z: [-0.55, 0.55] }} color={C.dark} ghost={ghost} />
      <Slab box={{ x: [6.4, 7.2], y: [1.02, 1.12], z: [-0.6, 0.6] }} color={C.steel} ghost={ghost} edges={false} />
      <Slab box={{ x: [9.9, 11.85], y: [1.02, 3.55], z: [-1.25, 1.25] }} color={C.body} ghost={ghost} />
      <Slab box={{ x: [11.8, 11.86], y: [2.3, 3.25], z: [-1.1, 1.1] }} color={C.glass} ghost={ghost} edges={false} />
      {[6.1, 7.5, 10.9].flatMap((x) => [-0.95, 0.95].map((z) => (
        <group key={`${x}${z}`} position={[x, 0.52, z]}><Part geometry={truckWheel} color="#1f2122" ghost={ghost} edges={false} /></group>
      )))}
    </group>
  );
}

// The machine faces the trailer's rear, so its local x runs toward -x here.
const LOAD_X = 1.5;
const TRANSPORT_BUCKET = toolOutline("bucket", armFrame(POSES.transport));
const TRANSPORT_BUCKET_LOW = lowestPoint(TRANSPORT_BUCKET);
const DUNNAGE_X = LOAD_X - (TRANSPORT_BUCKET.find((point) => point[1] === TRANSPORT_BUCKET_LOW)?.[0] ?? 0);

function PlannedLoad({ transport }: { transport: boolean }) {
  return (
    <group>
      <LowLoader ghost={!transport} />
      <Excavator id={EX014} pose={POSES.transport} tool="bucket" ghost position={[LOAD_X, TRAILER_DECK_Y, 0]} rotation={Math.PI} />
      <group position={[DUNNAGE_X, TRAILER_DECK_Y, -ARM_Z]}>
        <Slab box={{ x: [-0.35, 0.35], y: [0, TRANSPORT_DUNNAGE], z: [-0.55, 0.55] }} color="#b8a98a" ghost />
      </group>
      <StandaloneBreaker position={[-8.4, TRAILER_DECK_Y, 0]} ghost />
    </group>
  );
}

type Frame = { position: [number, number, number]; target: [number, number, number] };
// Wide establishing shots get a separate narrow-screen framing instead of
// simply pulling the camera back until everything is too small to read.
type View = Frame & { narrow?: Frame };

function fit(view: View, aspect: number, origin: [number, number, number] = [0, 0, 0]) {
  const frame = aspect < 1.5 && view.narrow ? view.narrow : view;
  const target = new THREE.Vector3(...frame.target).add(new THREE.Vector3(...origin));
  const offset = new THREE.Vector3(...frame.position).sub(new THREE.Vector3(...frame.target));
  if (aspect < 1.5 && !view.narrow) offset.multiplyScalar(Math.min(2.1, Math.pow(1.5 / aspect, 0.85)));
  return { position: target.clone().add(offset), target };
}

function Rig({ view, origin }: { view: View; origin?: [number, number, number] }) {
  const { camera, size, invalidate } = useThree();
  const current = useRef<{ position: THREE.Vector3; target: THREE.Vector3 } | null>(null);
  const goal = useMemo(() => fit(view, size.width / size.height, origin), [view, size.width, size.height, origin]);
  useEffect(() => { invalidate(); }, [goal, invalidate]);
  useFrame((state, delta) => {
    if (!current.current) current.current = { position: goal.position.clone(), target: goal.target.clone() };
    const k = 1 - Math.exp(-Math.min(delta, 1 / 30) * 3.4);
    current.current.position.lerp(goal.position, k);
    current.current.target.lerp(goal.target, k);
    camera.position.copy(current.current.position);
    camera.lookAt(current.current.target);
    if (current.current.position.distanceTo(goal.position) > 0.01 || current.current.target.distanceTo(goal.target) > 0.01) state.invalidate();
  });
  return null;
}

const SPLIT_OFFSET = 80;

function SplitRig({ view, stacked }: { view: View; stacked: boolean }) {
  const { gl, scene, size, invalidate } = useThree();
  const cameras = useMemo(() => [new THREE.PerspectiveCamera(30, 1, 0.1, 300), new THREE.PerspectiveCamera(30, 1, 0.1, 300)], []);
  const current = useRef<{ position: THREE.Vector3; target: THREE.Vector3 } | null>(null);
  const width = stacked ? size.width : size.width / 2;
  const height = stacked ? size.height / 2 : size.height;
  const goal = useMemo(() => fit(view, width / height), [view, width, height]);
  useEffect(() => { invalidate(); }, [goal, invalidate]);
  useFrame((state, delta) => {
    if (!current.current) current.current = { position: goal.position.clone(), target: goal.target.clone() };
    const k = 1 - Math.exp(-Math.min(delta, 1 / 30) * 3.4);
    current.current.position.lerp(goal.position, k);
    current.current.target.lerp(goal.target, k);
    gl.setScissorTest(true);
    cameras.forEach((camera, index) => {
      const shift = new THREE.Vector3(index * SPLIT_OFFSET, 0, 0);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      camera.position.copy(current.current!.position).add(shift);
      camera.lookAt(current.current!.target.clone().add(shift));
      const x = stacked ? 0 : index * width;
      const y = stacked ? (index === 0 ? height : 0) : 0;
      gl.setViewport(x, y, width, height);
      gl.setScissor(x, y, width, height);
      gl.render(scene, camera);
    });
    gl.setScissorTest(false);
    if (current.current.position.distanceTo(goal.position) > 0.01 || current.current.target.distanceTo(goal.target) > 0.01) state.invalidate();
  }, 1);
  return null;
}

const ORIGIN: [number, number, number] = [0, 0, 0];
const EX027_MATCH_POSITION: [number, number, number] = [10.5, 0, -7.5];

const MATCH_VIEWS: Record<MatchFocus | "overview", View> = {
  overview: { position: [3.5, 9, 23], target: [6, 1.4, -3] },
  attachment: { position: [14, 4.4, 10.5], target: [5.8, 0.7, 1.8] },
  capability: { position: [12, 6, 12], target: [3.2, 2.4, 0] },
  transport: { position: [5, 6.5, 19], target: [1.8, 1.5, 0] },
  availability: { position: [3.5, 9, 23], target: [6, 1.4, -3] },
  inspection: { position: [9.5, 5, 10.5], target: [0.8, 1.6, 0] },
};

function MatchScene({ focus, machine, documented, onPick }: Extract<SceneProps, { kind: "match" }>) {
  const machineSpecific = focus === "capability" || focus === "transport" || focus === "inspection" || (focus === "attachment" && machine === EX027);
  const origin = machineSpecific && machine === EX027 ? EX027_MATCH_POSITION : ORIGIN;
  const tone = documented ? "blue" : "yellow";
  const highlight = (id: MachineId): Highlight => {
    if (id !== machine) return {};
    if (focus === "attachment") return id === EX014 ? { coupler: tone } : { coupler: "yellow" };
    if (focus === "capability") return { arm: "blue" };
    return {};
  };
  const pickArea = (id: MachineId) => (area: Area) => onPick(id, area === "coupler" || area === "tool" ? "attachment" : area === "arm" ? "capability" : undefined);
  const couplerWorld = useMemo(() => {
    const frame = armFrame(POSES.display);
    return [frame.toolPivot[0], frame.toolPivot[1], ARM_Z] as [number, number, number];
  }, []);
  return (
    <>
      <Rig view={MATCH_VIEWS[focus]} origin={origin} />
      <Ground />
      <Excavator id={EX014} pose={POSES.display} tool="bucket" highlight={highlight(EX014)} onArea={pickArea(EX014)} />
      <Excavator id={EX027} pose={POSES.display} tool="bucket" position={EX027_MATCH_POSITION} highlight={highlight(EX027)} onArea={pickArea(EX027)} />
      <StandaloneBreaker position={[5.4, 0, 3.4]} tone={focus === "attachment" && machine === EX014 ? tone : undefined} onClick={() => onPick(EX014, "attachment")} />
      <Ring radius={5.2} tone={machine === EX014 ? "blue" : "ink"} dashed={machine !== EX014} position={[1.6, 0, 0]} />
      <Ring radius={5.2} tone={machine === EX027 ? "yellow" : "ink"} dashed position={[EX027_MATCH_POSITION[0] + 1.6, 0, EX027_MATCH_POSITION[2]]} />
      <Tag lines={[EX014, "Candidate match"]} tone={machine === EX014 ? "ok" : "plain"} position={[-0.4, 3.7, 0]} />
      <Tag lines={[EX027, "Awaiting inspection"]} tone="flag" position={[EX027_MATCH_POSITION[0] - 0.4, 3.7, EX027_MATCH_POSITION[2]]} />
      <Tag lines={[BREAKER, documented ? "Documented for EX-014" : "Compatibility to confirm"]} tone={documented ? "plain" : "flag"} position={[6.6, 1.1, 3.4]} />
      {focus === "attachment" && machine === EX014 && (
        <Path from={couplerWorld} to={[5.4, 0.52, 3.4]} color={documented ? C.blue : "#b59700"} dashed={!documented} />
      )}
      {focus === "transport" && (
        <group position={origin}>
          <DashedBox box={{ x: [-2.3, 6.6], y: [0, 4.6], z: [-1.4, 1.4] }} color={C.blue} />
        </group>
      )}
    </>
  );
}

const DELIVERY = { yard: -19, transport: 0, quarry: 24 };
const DELIVERY_VIEWS: Record<DeliveryFocus, View> = {
  overview: { position: [3, 21, 41], target: [2.5, 2.2, -4], narrow: { position: [9, 10, 25], target: [1, 1.5, 0] } },
  machine: { position: [-10.5, 6.5, 13], target: [-18, 1.6, 0] },
  attachment: { position: [-10, 4, 10], target: [-14.2, 0.6, 3.2] },
  transport: { position: [8, 8, 18], target: [0.5, 1.6, 0] },
  site: { position: [31, 10, 18], target: [23, 1, 0] },
};

function DeliveryScene({ focus, transport, site, onPick }: Extract<SceneProps, { kind: "delivery" }>) {
  const tone = (selected: boolean, done: boolean): Tone | undefined => (selected ? (done ? "blue" : "yellow") : undefined);
  return (
    <>
      <Rig view={DELIVERY_VIEWS[focus]} />
      <Ground size={240} />
      <Yard x={DELIVERY.yard} label />
      <Excavator id={EX014} pose={POSES.display} tool="bucket" position={[DELIVERY.yard - 2.5, 0.05, -0.5]} highlight={focus === "machine" ? { house: "blue" } : {}} onArea={() => onPick("machine")} />
      <StandaloneBreaker position={[DELIVERY.yard + 3.3, 0.05, 3.2]} tone={tone(focus === "attachment", true)} onClick={() => onPick("attachment")} />
      <Tag lines={[BREAKER, "Allocated"]} position={[DELIVERY.yard + 4.6, 1.2, 3.2]} />
      <group position={[DELIVERY.transport, 0, 0]} {...pickHandlers(() => onPick("transport"))}>
        <PlannedLoad transport={transport} />
      </group>
      <Tag lines={[TRANSPORT, transport ? "Arrangement confirmed" : "Arrangement to confirm"]} tone={transport ? "ok" : "flag"} position={[DELIVERY.transport + 1, 4.6, 0]} />
      <Quarry x={DELIVERY.quarry} label pad={site ? "confirmed" : "open"} />
      <Tag lines={["Receiving area", site ? "Window and access confirmed" : "Window and access to confirm"]} tone={site ? "ok" : "flag"} position={[DELIVERY.quarry - 1.5, 1.4, 2.2]} />
      <Path from={[DELIVERY.yard + 6.5, 0.04, 4.2]} to={[DELIVERY.transport - 9.2, 0.04, 4.2]} color={C.edge} />
      <Path from={[DELIVERY.transport + 12.3, 0.04, 4.2]} to={[DELIVERY.quarry - 9, 0.04, 4.2]} color={site && transport ? C.blue : "#b59700"} dashed={!(site && transport)} />
    </>
  );
}

const RENTAL_YARD_X = -24;
const RENTAL_VIEWS: Record<RentalFocus, View> = {
  ex014: { position: [12.5, 7, 14], target: [2.4, 1.6, -0.5] },
  ex027: { position: [RENTAL_YARD_X + 8, 6.5, 12.5], target: [RENTAL_YARD_X, 1.6, 0] },
  both: { position: [-11, 20, 50], target: [-11, 1.6, -2], narrow: { position: [16, 12, 30], target: [-12, 1, -3] } },
};

function RentalScene({ focus, conflict, onPick }: Extract<SceneProps, { kind: "rental" }>) {
  return (
    <>
      <Rig view={RENTAL_VIEWS[focus]} />
      <Ground size={240} />
      <Quarry x={0} />
      <Excavator id={EX014} pose={POSES.parked} tool="breaker" position={[-1, 0.03, 0]} rotation={-0.25} onArea={() => onPick("ex014")} />
      <Tag lines={conflict ? [`${EX014} · On rent at the quarry`, "Next reservation begins during extension"] : [EX014, "On rent at the quarry"]} tone={conflict ? "alert" : "ok"} position={[-1.6, 3.8, 0]} />
      <Yard x={RENTAL_YARD_X} />
      <Excavator id={EX027} pose={POSES.display} tool="bucket" position={[RENTAL_YARD_X - 1.5, 0.05, 0]} onArea={() => onPick("ex027")} />
      <Ring radius={5.2} tone="yellow" dashed position={[RENTAL_YARD_X + 0.1, 0, 0]} />
      <Tag lines={[EX027, "In the yard, awaiting inspection"]} tone="flag" position={[RENTAL_YARD_X - 1.9, 3.8, 0]} />
    </>
  );
}

const RETURN_VIEWS: Record<ReturnArea, View> = {
  overall: { position: [10.5, 5.4, 12], target: [2, 1.5, 0] },
  sidePanel: { position: [2.4, 2.5, 8.4], target: [0.4, 1.45, 1.2] },
  attachment: { position: [11.5, 3.8, 8.5], target: [5, 1.5, 0.2] },
  undercarriage: { position: [3.4, 1.3, 7.4], target: [0, 0.45, 1] },
  meter: { position: [3.6, 3.2, -5.6], target: [0.8, 2.1, -0.8] },
};

function ReturnScene({ area, stage, stacked }: Extract<SceneProps, { kind: "return" }>) {
  const highlight = (after: boolean): Highlight => {
    if (area === "sidePanel") return { sidePanel: after ? "yellow" : "blue" };
    if (area === "attachment") return { tool: "blue", coupler: "blue" };
    if (area === "undercarriage") return { tracks: "blue" };
    if (area === "meter") return { cab: "blue" };
    return after && stage === 1 ? { sidePanel: "yellow" } : {};
  };
  const ringTone: Tone | "ink" = stage >= 3 ? "blue" : stage === 2 ? "red" : "ink";
  return (
    <>
      <SplitRig view={RETURN_VIEWS[area]} stacked={stacked} />
      <Ground size={320} />
      <Excavator id={EX014} pose={POSES.parked} tool="breaker" highlight={highlight(false)} />
      <Excavator id={EX014} pose={POSES.parked} tool="breaker" position={[SPLIT_OFFSET, 0, 0]} highlight={highlight(true)} mark />
      <Ring radius={5.4} tone={ringTone} dashed={stage < 3} position={[SPLIT_OFFSET + 1.8, 0, 0]} />
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

function SceneContent(props: SceneProps) {
  switch (props.kind) {
    case "match": return <MatchScene {...props} />;
    case "delivery": return <DeliveryScene {...props} />;
    case "rental": return <RentalScene {...props} />;
    case "return": return <ReturnScene {...props} />;
  }
}

export default function ExcavatorScene(props: SceneProps): ReactNode {
  return (
    <Canvas
      frameloop="demand"
      flat
      dpr={[1, 2]}
      camera={{ fov: 30, near: 0.1, far: 400, position: [14, 9, 16] }}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      style={{ position: "absolute", inset: 0 }}
      aria-hidden="true"
    >
      <fog attach="fog" args={[C.ground, 55, 150]} />
      <ambientLight intensity={1.15} />
      <hemisphereLight args={["#ffffff", "#cfcfcb", 0.9]} />
      <directionalLight position={[9, 14, 10]} intensity={1.7} />
      <directionalLight position={[-10, 6, -8]} intensity={0.45} />
      <SceneContent {...props} />
      <Ready onReady={props.onReady} />
    </Canvas>
  );
}
