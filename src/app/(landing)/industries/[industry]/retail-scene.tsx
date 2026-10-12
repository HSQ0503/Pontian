"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type RefObject } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import styles from "./retail.module.css";
import { PRODUCTS, TASTING_SLOT, type ProductId } from "./retail-data";
import {
  BAG, BAG_HEIGHT, BAY, BREWER_AT, BREWER_BOXES, BRIEFING_BAGS, COLORS, FOCUS_PRODUCT, HARBOR_GAPS, INCOMING_CARTON, LabelLayer, PRICE_TAGS,
  REORDER_CARTON, STOCK_BAGS, STOCK_BAY_X, TASTING_AT, TASTING_CUPS, TRANSFER_MOVES, placeLabels, stockSlot,
  type BriefingFocus, type Carton, type ShelfLabel, type Vec3,
} from "./retail-shelf";

export type ShelfSceneProps = {
  active: boolean;
  reducedMotion: boolean;
  labels: ShelfLabel[];
  label: string;
  onReady: () => void;
} & (
  | { kind: "briefing"; focus: BriefingFocus; onPick: (focus: BriefingFocus) => void }
  | { kind: "stock"; moved: boolean; replay: number; reorder: boolean; onProgress: (lifted: number, landed: number) => void }
);

/* Materials: matte packaging and fixtures, brand colours only for state and selection. */

const standard = (color: string, roughness: number, metalness = 0, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });

const M = {
  kraft: standard(COLORS.kraft, 0.86),
  charcoal: standard(COLORS.charcoal, 0.62),
  ceramic: new THREE.MeshPhysicalMaterial({ color: COLORS.ceramic, roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.32, side: THREE.DoubleSide }),
  stoneware: new THREE.MeshPhysicalMaterial({ color: COLORS.stoneware, roughness: 0.42, clearcoat: 0.45, clearcoatRoughness: 0.4, side: THREE.DoubleSide }),
  tray: standard("#b99f78", 0.72),
  coffee: standard("#3a2a20", 0.32),
  oak: standard(COLORS.oak, 0.68),
  gable: standard("#dededb", 0.58, 0.08),
  plinth: standard(COLORS.steel, 0.55, 0.3),
  rail: standard("#cfd0cd", 0.48, 0.2),
  header: standard("#fbfbfa", 0.62),
  card: standard(COLORS.card, 0.85),
  slab: standard("#ecebe7", 0.96),
  ghost: new THREE.MeshPhysicalMaterial({ color: "#e3e6ea", roughness: 0.6, transparent: true, opacity: 0.38, depthWrite: false }),
};

const tintCache = new Map<string, THREE.MeshStandardMaterial>();
function tinted(material: THREE.MeshStandardMaterial, color: string, strength: number) {
  const key = `${material.uuid}:${color}:${strength}`;
  let copy = tintCache.get(key);
  if (!copy) {
    copy = material.clone();
    copy.color.lerp(new THREE.Color(color), strength);
    tintCache.set(key, copy);
  }
  return copy;
}
// Light packaging takes a lighter tint so a selected product reads as highlighted, not repackaged in yellow.
const selected = (material: THREE.MeshStandardMaterial) => tinted(material, COLORS.select, material === M.charcoal ? 0.6 : 0.42);
const proposed = (material: THREE.MeshStandardMaterial) => tinted(material, COLORS.ok, 0.45);

const EDGE_INK = new THREE.LineBasicMaterial({ color: COLORS.ink, transparent: true, opacity: 0.85 });

/* Geometry */

function rbox(x: [number, number], y: [number, number], z: [number, number], radius = 0.006) {
  const width = x[1] - x[0];
  const height = y[1] - y[0];
  const depth = z[1] - z[0];
  const r = Math.min(radius, width / 2.2, height / 2.2, depth / 2.2);
  return new RoundedBoxGeometry(width, height, depth, 2, r).translate((x[0] + x[1]) / 2, (y[0] + y[1]) / 2, (z[0] + z[1]) / 2);
}

function merge(parts: THREE.BufferGeometry[]) {
  const prepared = parts.map((part) => (part.index ? part.toNonIndexed() : part));
  prepared.forEach((part) => { if (!part.attributes.uv) part.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(part.attributes.position.count * 2), 2)); });
  return mergeGeometries(prepared) ?? new THREE.BufferGeometry();
}

// The pouch's gusseted top tapers from the full depth to a flat heat seal.
function foldGeometry(width: number, bevel: boolean) {
  const half = BAG.depth / 2;
  const shape = new THREE.Shape([new THREE.Vector2(-half, 0), new THREE.Vector2(half, 0), new THREE.Vector2(0.005, BAG.fold), new THREE.Vector2(-0.005, BAG.fold)]);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: bevel, bevelSize: 0.002, bevelThickness: 0.002, bevelSegments: 1 });
  geometry.rotateY(Math.PI / 2);
  return geometry.translate(-width / 2, BAG.body, 0);
}

function buildKit() {
  const half = BAY.width / 2;
  const d = BAY.depth;
  const inner: [number, number] = [-half + 0.022, half - 0.022];
  const levels = BAY.levels;

  const bag = merge([
    rbox([-BAG.width / 2, BAG.width / 2], [0, BAG.body + 0.004], [-BAG.depth / 2, BAG.depth / 2], 0.012),
    foldGeometry(BAG.width - 0.012, true),
    rbox([-BAG.width / 2 + 0.004, BAG.width / 2 - 0.004], [BAG_HEIGHT - 0.012, BAG_HEIGHT], [-0.004, 0.004], 0.002),
  ]);
  const bagEdges = new THREE.EdgesGeometry(merge([
    new THREE.BoxGeometry(BAG.width, BAG.body, BAG.depth).translate(0, BAG.body / 2, 0),
    foldGeometry(BAG.width - 0.012, false),
  ]), 20);

  const brewerProfile = [[0.012, 0.022], [0.02, 0.022], [0.068, 0.114], [0.071, 0.12], [0.075, 0.118], [0.072, 0.11], [0.024, 0.012]].map(([r, y]) => new THREE.Vector2(r, y));
  const brewer = merge([
    new THREE.LatheGeometry(brewerProfile, 48),
    new THREE.CylinderGeometry(0.052, 0.054, 0.012, 40).translate(0, 0.006, 0),
    new THREE.TorusGeometry(0.03, 0.007, 10, 20, Math.PI).rotateZ(-Math.PI / 2).translate(0.068, 0.072, 0),
  ]);
  const brewerEdges = new THREE.EdgesGeometry(new THREE.CylinderGeometry(0.073, 0.024, 0.104, 24, 1, true).translate(0, 0.064, 0), 30);

  const cup = new THREE.LatheGeometry([[0, 0], [0.016, 0], [0.021, 0.042], [0.019, 0.042], [0.0145, 0.004], [0, 0.004]].map(([r, y]) => new THREE.Vector2(r, y)), 28);
  const cups = merge(TASTING_CUPS.map((x) => cup.clone().translate(x, 0.018, 0)));
  const coffee = merge(TASTING_CUPS.map((x) => new THREE.CircleGeometry(0.018, 24).rotateX(-Math.PI / 2).translate(x, 0.052, 0)));
  const tray = rbox([-0.17, 0.17], [0, 0.018], [-0.05, 0.05], 0.005);
  const trayEdges = new THREE.EdgesGeometry(new THREE.BoxGeometry(0.34, 0.06, 0.1).translate(0, 0.03, 0));

  return {
    bag,
    bagEdges,
    brewer,
    brewerEdges,
    cups,
    coffee,
    tray,
    trayEdges,
    box: rbox([-0.075, 0.075], [0, 0.15], [-0.075, 0.075], 0.006),
    gables: merge([rbox([-half, -half + 0.022], [0, BAY.height], [-d / 2, d / 2 + 0.012]), rbox([half - 0.022, half], [0, BAY.height], [-d / 2, d / 2 + 0.012])]),
    back: rbox(inner, [BAY.plinth, BAY.header[0]], [-d / 2, -d / 2 + 0.014], 0.002),
    plinth: rbox(inner, [0, BAY.plinth], [-d / 2 + 0.02, d / 2 - 0.03]),
    shelves: merge(levels.map((level) => rbox(inner, [level - BAY.shelf, level], [-d / 2 + 0.014, d / 2], 0.004))),
    rails: merge(levels.map((level) => rbox(inner, [level - BAY.shelf - 0.034, level - BAY.shelf + 0.004], [d / 2 - 0.002, d / 2 + 0.012], 0.003))),
    header: rbox([-half, half], [BAY.header[0], BAY.header[1]], [-d / 2, d / 2 + 0.012], 0.008),
    headerTrim: rbox([-half + 0.01, half - 0.01], [BAY.header[0] + 0.012, BAY.header[0] + 0.018], [d / 2 + 0.011, d / 2 + 0.015], 0.002),
  };
}
type Kit = ReturnType<typeof buildKit>;
let kit: Kit | null = null;
const getKit = () => (kit ??= buildKit());

/* Printed surfaces: labels, price tickets and cartons, set in the site's type. */

let family = "";
function fontFamily() {
  if (!family) {
    const root = document.querySelector(".pontian-root");
    family = root ? getComputedStyle(root).fontFamily : "system-ui, sans-serif";
  }
  return family;
}

const textures = new Map<string, THREE.CanvasTexture>();
function printed(key: string, width: number, height: number, draw: (context: CanvasRenderingContext2D, font: string) => void) {
  let texture = textures.get(key);
  if (!texture) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (context) draw(context, fontFamily());
    texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    textures.set(key, texture);
  }
  return texture;
}

function bagLabel(product: "house" | "reserve") {
  return printed(`bag-${product}`, 256, 216, (context, font) => {
    context.fillStyle = product === "house" ? COLORS.kraftLabel : COLORS.charcoalLabel;
    context.fillRect(0, 0, 256, 216);
    context.fillStyle = "#24211e";
    context.textAlign = "center";
    context.font = `600 58px ${font}`;
    context.fillText(product === "house" ? "HOUSE" : "RESERVE", 128, 84);
    context.fillText("BLEND", 128, 142);
    context.font = `400 26px ${font}`;
    context.fillText(product === "house" ? "Medium · 250 g" : "Medium-dark · 250 g", 128, 188);
    context.fillRect(48, 22, 160, 4);
  });
}

function priceTicket(product: ProductId) {
  return printed(`price-${product}`, 192, 84, (context, font) => {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, 192, 84);
    context.fillStyle = COLORS.ink;
    context.font = `600 46px ${font}`;
    context.fillText(`$${PRODUCTS[product].price}`, 12, 54);
    context.font = `400 18px ${font}`;
    context.fillText(PRODUCTS[product].short, 12, 76);
  });
}

function boxPrint() {
  return printed("box", 160, 160, (context, font) => {
    context.fillStyle = "#efe7d8";
    context.fillRect(0, 0, 160, 160);
    context.strokeStyle = "#2a2622";
    context.lineWidth = 5;
    context.beginPath();
    context.moveTo(42, 44); context.lineTo(118, 44); context.lineTo(96, 92); context.lineTo(64, 92); context.closePath();
    context.moveTo(52, 104); context.lineTo(108, 104);
    context.stroke();
    context.fillStyle = "#2a2622";
    context.font = `600 17px ${font}`;
    context.textAlign = "center";
    context.fillText("POUR-OVER", 80, 134);
  });
}

function tastingCard() {
  return printed("tasting", 256, 150, (context, font) => {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, 256, 150);
    context.fillStyle = COLORS.ink;
    context.font = `600 34px ${font}`;
    context.fillText("Tasting", 20, 56);
    context.font = `400 26px ${font}`;
    context.fillText(TASTING_SLOT.when.replace("Saturday", "Sat"), 20, 98);
    context.fillText("Five coffees", 20, 132);
  });
}

function backPanel() {
  const texture = printed("panel", 512, 256, (context) => {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, 512, 256);
    context.strokeStyle = "rgba(40, 42, 44, 0.12)";
    context.lineWidth = 2;
    for (let x = 0; x <= 512; x += 64) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, 256); context.stroke(); }
  });
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}
let panelMaterial: THREE.MeshStandardMaterial | null = null;
const getPanelMaterial = () => (panelMaterial ??= standard(COLORS.panel, 0.9, 0, { map: backPanel() }));

/* Pieces */

const printMaterials = new Map<THREE.Texture, THREE.MeshStandardMaterial>();
function printMaterial(texture: THREE.Texture) {
  let material = printMaterials.get(texture);
  if (!material) {
    material = standard("#ffffff", 0.7, 0, { map: texture, polygonOffset: true, polygonOffsetFactor: -2 });
    printMaterials.set(texture, material);
  }
  return material;
}

function Printed({ texture, size, position, rotation = [0, 0, 0] }: { texture: THREE.Texture; size: [number, number]; position: Vec3; rotation?: Vec3 }) {
  return (
    <mesh position={position} rotation={rotation} material={printMaterial(texture)}>
      <planeGeometry args={size} />
    </mesh>
  );
}

let contactMaterial: THREE.MeshBasicMaterial | null = null;
function getContactMaterial() {
  if (contactMaterial) return contactMaterial;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const context = canvas.getContext("2d");
  if (context) {
    const gradient = context.createRadialGradient(128, 128, 8, 128, 128, 128);
    gradient.addColorStop(0, "rgba(23, 25, 26, 0.5)");
    gradient.addColorStop(0.55, "rgba(23, 25, 26, 0.18)");
    gradient.addColorStop(1, "rgba(23, 25, 26, 0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 256, 256);
  }
  const texture = new THREE.CanvasTexture(canvas);
  contactMaterial = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, opacity: 0.45, toneMapped: false });
  return contactMaterial;
}

function ContactShadow({ x, z, width, depth }: { x: number; z: number; width: number; depth: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.004, z]} renderOrder={1} material={getContactMaterial()}>
      <planeGeometry args={[width, depth]} />
    </mesh>
  );
}

function Bay({ x = 0, tickets }: { x?: number; tickets: { product: ProductId; x: number; level: number }[] }) {
  const k = getKit();
  return (
    <group position={[x, 0, 0]}>
      <mesh geometry={k.gables} material={M.gable} castShadow receiveShadow />
      <mesh geometry={k.back} material={getPanelMaterial()} receiveShadow />
      <mesh geometry={k.plinth} material={M.plinth} castShadow receiveShadow />
      <mesh geometry={k.shelves} material={M.oak} castShadow receiveShadow />
      <mesh geometry={k.rails} material={M.rail} receiveShadow />
      <mesh geometry={k.header} material={M.header} castShadow receiveShadow />
      <mesh geometry={k.headerTrim} material={M.plinth} />
      {tickets.map((ticket) => (
        <Printed key={`${ticket.product}-${ticket.x}-${ticket.level}`} texture={priceTicket(ticket.product)} size={[0.072, 0.0315]} position={[ticket.x, ticket.level - BAY.shelf - 0.015, BAY.depth / 2 + 0.0125]} />
      ))}
      <ContactShadow x={0} z={0.05} width={BAY.width + 0.5} depth={BAY.depth + 0.5} />
    </group>
  );
}

type BagHandle = { group: THREE.Group; body: THREE.Mesh; base: THREE.MeshStandardMaterial };

const Bag = memo(function Bag({ product, at, material, edges, onPick, register }: { product: "house" | "reserve"; at: Vec3; material?: THREE.MeshStandardMaterial; edges?: boolean; onPick?: (event: ThreeEvent<MouseEvent>) => void; register?: (handle: BagHandle | null) => void }) {
  const k = getKit();
  const group = useRef<THREE.Group>(null);
  const body = useRef<THREE.Mesh>(null);
  const base = product === "house" ? M.kraft : M.charcoal;
  useLayoutEffect(() => {
    group.current?.position.set(...at);
    if (!register || !group.current || !body.current) return;
    register({ group: group.current, body: body.current, base });
    return () => register(null);
  }, [at, register, base]);
  return (
    <group ref={group} onClick={onPick} onPointerOver={onPick && hover} onPointerOut={onPick && unhover}>
      <mesh ref={body} geometry={k.bag} material={material ?? base} castShadow receiveShadow />
      <Printed texture={bagLabel(product)} size={[BAG.width - 0.026, 0.074]} position={[0, 0.088, BAG.depth / 2 + 0.0012]} />
      {edges && <lineSegments geometry={k.bagEdges} material={EDGE_INK} />}
    </group>
  );
});

function hover(event: ThreeEvent<PointerEvent>) {
  event.stopPropagation();
  const target = event.nativeEvent.target;
  if (target instanceof HTMLElement) target.style.cursor = "pointer";
}
function unhover(event: ThreeEvent<PointerEvent>) {
  const target = event.nativeEvent.target;
  if (target instanceof HTMLElement) target.style.cursor = "";
}

function Brewer({ position, highlight, onPick }: { position: Vec3; highlight?: boolean; onPick?: (event: ThreeEvent<MouseEvent>) => void }) {
  const k = getKit();
  return (
    <group position={position} onClick={onPick} onPointerOver={onPick && hover} onPointerOut={onPick && unhover}>
      <mesh geometry={k.brewer} material={highlight ? selected(M.stoneware) : M.stoneware} castShadow receiveShadow />
      {highlight && <lineSegments geometry={k.brewerEdges} material={EDGE_INK} />}
    </group>
  );
}

function BrewerBox({ position }: { position: Vec3 }) {
  const k = getKit();
  return (
    <group position={position}>
      <mesh geometry={k.box} material={M.card} castShadow receiveShadow />
      <Printed texture={boxPrint()} size={[0.12, 0.12]} position={[0, 0.075, 0.0752]} />
    </group>
  );
}

function TastingSet({ position, highlight, onPick }: { position: Vec3; highlight?: boolean; onPick?: (event: ThreeEvent<MouseEvent>) => void }) {
  const k = getKit();
  return (
    <group position={position} scale={1.3} onClick={onPick} onPointerOver={onPick && hover} onPointerOut={onPick && unhover}>
      <mesh geometry={k.tray} material={highlight ? selected(M.tray) : M.tray} castShadow receiveShadow />
      <mesh geometry={k.cups} material={highlight ? selected(M.ceramic) : M.ceramic} castShadow receiveShadow />
      <mesh geometry={k.coffee} material={M.coffee} />
      {highlight && <lineSegments geometry={k.trayEdges} material={EDGE_INK} />}
      <group position={[0.02, 0, -0.085]} rotation={[-0.22, 0, 0]}>
        <mesh position={[0, 0.045, 0]} material={M.header} castShadow>
          <boxGeometry args={[0.15, 0.088, 0.003]} />
        </mesh>
        <Printed texture={tastingCard()} size={[0.146, 0.0855]} position={[0, 0.045, 0.0017]} />
      </group>
    </group>
  );
}

/* Studio: the same rig as the Logistics and Equipment Rental scenes. */

function applyEnvironment(scene: THREE.Scene, environment: THREE.Texture | null, intensity: number) {
  scene.environment = environment;
  scene.environmentIntensity = intensity;
}

function Studio({ extent, center }: { extent: number; center: Vec3 }) {
  const { gl, scene, invalidate } = useThree();
  useEffect(() => {
    const generator = new THREE.PMREMGenerator(gl);
    const environment = generator.fromScene(new RoomEnvironment(), 0.04).texture;
    generator.dispose();
    applyEnvironment(scene, environment, 0.62);
    invalidate();
    return () => { applyEnvironment(scene, null, 1); environment.dispose(); };
  }, [gl, scene, invalidate]);
  const light = useMemo(() => {
    const directional = new THREE.DirectionalLight("#ffffff", 1.5);
    directional.position.set(center[0] + 3, 7, center[2] + 6);
    directional.target.position.set(...center);
    directional.castShadow = true;
    directional.shadow.mapSize.set(2048, 2048);
    directional.shadow.radius = 8;
    directional.shadow.bias = -0.0004;
    directional.shadow.normalBias = 0.015;
    Object.assign(directional.shadow.camera, { left: -extent, right: extent, top: extent, bottom: -extent, near: 0.5, far: 30 });
    directional.shadow.camera.updateProjectionMatrix();
    return directional;
  }, [extent, center]);
  return (
    <>
      <hemisphereLight args={["#ffffff", "#d8d7d3", 0.35]} />
      <primitive object={light} />
      <primitive object={light.target} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[center[0], -0.002, center[2]]} renderOrder={-2}>
        <planeGeometry args={[80, 80]} />
        <meshBasicMaterial color="#f3f3f1" toneMapped={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[center[0], 0.001, center[2]]} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <shadowMaterial transparent opacity={0.12} depthWrite={false} />
      </mesh>
    </>
  );
}

/* Camera: a framed viewpoint fitted to the fixture, with a clamped drag. */

type Framing = { target: Vec3; halfWidth: number; halfHeight: number; azimuth: number; elevation: number; fillX: number; fillY: number; narrowFillX: number };
type Orbit = { azimuth: number; elevation: number };

// Imperative state lives outside React so frames can move the camera and bags without re-rendering.
class SceneStore {
  offset: Orbit = { azimuth: 0, elevation: 0 };
  dragged = false;
  active = true;
  invalidate: () => void = () => undefined;
  setOffset(offset: Orbit) { this.offset = offset; this.invalidate(); }
  setDragged(value: boolean) { this.dragged = value; }
  setInvalidate(invalidate: () => void) { this.invalidate = invalidate; }
  setActive(active: boolean) { this.active = active; if (active) this.invalidate(); }
}

// Rendering is on demand. Off screen, animations stop requesting frames; on return the scene draws once and carries on.
function ResumeWhenActive({ active, store }: { active: boolean; store: SceneStore }) {
  useEffect(() => { store.setActive(active); }, [active, store]);
  return null;
}

const FOV = 24;

function CameraRig({ framing, store, reducedMotion, labels, layer }: { framing: Framing; store: SceneStore; reducedMotion: boolean; labels: ShelfLabel[]; layer: RefObject<HTMLDivElement | null> }) {
  const { camera, size, invalidate } = useThree();
  const current = useRef<Orbit | null>(null);
  const point = useMemo(() => new THREE.Vector3(), []);
  useEffect(() => { invalidate(); }, [labels, framing, invalidate]);
  useFrame((state, delta) => {
    const goal = { azimuth: framing.azimuth + store.offset.azimuth, elevation: framing.elevation + store.offset.elevation };
    if (!current.current || reducedMotion) current.current = { ...goal };
    else {
      const k = 1 - Math.exp(-delta * 7);
      current.current.azimuth += (goal.azimuth - current.current.azimuth) * k;
      current.current.elevation += (goal.elevation - current.current.elevation) * k;
    }
    const aspect = size.width / size.height;
    const vertical = THREE.MathUtils.degToRad(FOV);
    const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * aspect);
    const fillX = aspect < 1.2 ? framing.narrowFillX : framing.fillX;
    const distance = Math.max(framing.halfWidth / (fillX * Math.tan(horizontal / 2)), framing.halfHeight / (framing.fillY * Math.tan(vertical / 2))) + BAY.depth;
    const azimuth = THREE.MathUtils.degToRad(current.current.azimuth);
    const elevation = THREE.MathUtils.degToRad(current.current.elevation);
    const [tx, ty, tz] = framing.target;
    camera.position.set(tx + distance * Math.cos(elevation) * Math.sin(azimuth), ty + distance * Math.sin(elevation), tz + distance * Math.cos(elevation) * Math.cos(azimuth));
    camera.lookAt(tx, ty, tz);
    camera.updateMatrixWorld();
    placeLabels(layer.current, labels, (at) => {
      point.set(...at).project(camera);
      return { x: (point.x * 0.5 + 0.5) * size.width, y: (-point.y * 0.5 + 0.5) * size.height, visible: point.z < 1 };
    });
    if (store.active && (Math.abs(goal.azimuth - current.current.azimuth) > 0.05 || Math.abs(goal.elevation - current.current.elevation) > 0.05)) state.invalidate();
  });
  return null;
}

/* Maya's briefing: the Harbor Street coffee bay, with the suggested product lit. */

const BRIEFING_FRAMING: Framing = { target: [0, 0.72, 0], halfWidth: BAY.width / 2 + 0.14, halfHeight: 0.94, azimuth: -34, elevation: 30, fillX: 0.74, fillY: 0.78, narrowFillX: 0.64 };
const BRIEFING_TICKETS = PRICE_TAGS.map((tag) => ({ product: tag.product, x: tag.at[0], level: tag.at[1] }));

function BriefingScene({ focus, onPick, store }: { focus: BriefingFocus; onPick: (focus: BriefingFocus) => void; store: SceneStore }) {
  const lit = FOCUS_PRODUCT[focus];
  const picks = useMemo(() => {
    const pick = (next: BriefingFocus) => (event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); if (!store.dragged) onPick(next); };
    return { house: pick("house"), reserve: pick("reserve"), tasting: pick("tasting"), owned: pick("owned") };
  }, [onPick, store]);
  return (
    <>
      <Studio extent={2} center={[0, 0.8, 0]} />
      <Bay tickets={BRIEFING_TICKETS} />
      <Brewer position={BREWER_AT} highlight={lit === "brewer"} onPick={picks.owned} />
      {BREWER_BOXES.map((at) => <BrewerBox key={at[0]} position={at} />)}
      <TastingSet position={TASTING_AT} highlight={lit === "tasting"} onPick={picks.tasting} />
      {BRIEFING_BAGS.map((bag) => (
        <Bag
          key={bag.key}
          product={bag.product}
          at={bag.at}
          material={lit === bag.product ? selected(bag.product === "house" ? M.kraft : M.charcoal) : undefined}
          edges={lit === bag.product}
          onPick={picks[bag.product]}
        />
      ))}
    </>
  );
}

/* Stock: Reserve Blend bays at three stores. The transfer moves the same twelve bags; none appear or vanish. */

const STOCK_FRAMING: Framing = { target: [0, 0.98, 0.3], halfWidth: 2.75, halfHeight: 0.98, azimuth: -8, elevation: 9, fillX: 0.94, fillY: 0.66, narrowFillX: 0.97 };
const STOCK_TICKETS = BAY.levels.map((level) => ({ product: "reserve" as ProductId, x: 0, level }));
const STAGGER = 110;
const FLIGHT = 1150;
const TIMELINE = (TRANSFER_MOVES.length - 1) * STAGGER + FLIGHT;
const ease = (k: number) => k * k * (3 - 2 * k);
const moving = new Map(TRANSFER_MOVES.map((move) => [move.key, move]));
const BAG_AT = new Map(STOCK_BAGS.map((bag) => [bag.key, moving.get(bag.key)?.from ?? stockSlot(bag.store, bag.index)]));

function flightPoint(from: Vec3, to: Vec3, u: number, out: THREE.Vector3) {
  const pull = 0.3;
  if (u <= 0.18) {
    const k = ease(u / 0.18);
    return out.set(from[0], from[1] + 0.02 * k, from[2] + pull * k);
  }
  if (u >= 0.82) {
    const k = ease((u - 0.82) / 0.18);
    return out.set(to[0], to[1] + 0.02 * (1 - k), to[2] + pull * (1 - k));
  }
  const k = ease((u - 0.18) / 0.64);
  const lift = Math.sin(Math.PI * k) * 0.5;
  return out.set(from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k + 0.02 + lift, from[2] + pull);
}

function GapOutline({ at, register }: { at: Vec3; register: (line: THREE.LineSegments | null) => void }) {
  const line = useMemo(() => {
    const object = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(BAG.width, BAG_HEIGHT, BAG.depth).translate(0, BAG_HEIGHT / 2, 0)), new THREE.LineDashedMaterial({ color: COLORS.blocked, dashSize: 0.014, gapSize: 0.01 }));
    object.computeLineDistances();
    object.position.set(...at);
    return object;
  }, [at]);
  useLayoutEffect(() => { register(line); return () => register(null); }, [line, register]);
  useEffect(() => () => { line.geometry.dispose(); (line.material as THREE.Material).dispose(); }, [line]);
  return <primitive object={line} />;
}

function GhostCarton({ carton, color }: { carton: Carton; color: string }) {
  const [w, h, d] = carton.size;
  const edges = useMemo(() => {
    const object = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)), new THREE.LineDashedMaterial({ color, dashSize: 0.03, gapSize: 0.02 }));
    object.computeLineDistances();
    return object;
  }, [w, h, d, color]);
  useEffect(() => () => { edges.geometry.dispose(); (edges.material as THREE.Material).dispose(); }, [edges]);
  return (
    <group position={[carton.at[0], h / 2 + 0.002, carton.at[2]]}>
      <mesh material={M.ghost}>
        <boxGeometry args={[w, h, d]} />
      </mesh>
      <primitive object={edges} />
    </group>
  );
}

function TransferPath() {
  const line = useMemo(() => {
    const from = new THREE.Vector3(STOCK_BAY_X.market - 0.35, BAY.height + 0.08, 0.32);
    const to = new THREE.Vector3(STOCK_BAY_X.harbor + 0.35, BAY.height + 0.08, 0.32);
    const curve = new THREE.QuadraticBezierCurve3(from, new THREE.Vector3((from.x + to.x) / 2, BAY.height + 0.5, 0.32), to);
    const object = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(48)), new THREE.LineDashedMaterial({ color: COLORS.ok, dashSize: 0.06, gapSize: 0.04 }));
    object.computeLineDistances();
    const tip = curve.getTangent(1);
    return { object, to, angle: Math.atan2(tip.y, tip.x) };
  }, []);
  useEffect(() => () => { line.object.geometry.dispose(); (line.object.material as THREE.Material).dispose(); }, [line]);
  return (
    <group>
      <primitive object={line.object} />
      <mesh position={line.to} rotation={[0, 0, line.angle - Math.PI / 2]}>
        <coneGeometry args={[0.035, 0.09, 16]} />
        <meshBasicMaterial color={COLORS.ok} toneMapped={false} />
      </mesh>
    </group>
  );
}

function StockScene({ moved, replay, reorder, reducedMotion, onProgress, store }: { moved: boolean; replay: number; reorder: boolean; reducedMotion: boolean; onProgress: (lifted: number, landed: number) => void; store: SceneStore }) {
  const { invalidate } = useThree();
  const handles = useRef(new Map<string, BagHandle>());
  const gaps = useRef<(THREE.LineSegments | null)[]>([]);
  const progress = useRef(0);
  const motion = useRef<{ start: number; from: number; to: number } | null>(null);
  const reported = useRef("");
  const lastReplay = useRef(replay);
  const report = useRef(onProgress);
  const point = useMemo(() => new THREE.Vector3(), []);
  useEffect(() => { report.current = onProgress; }, [onProgress]);

  const registers = useMemo(() => new Map(STOCK_BAGS.map((bag) => [bag.key, (handle: BagHandle | null) => { if (handle) handles.current.set(bag.key, handle); else handles.current.delete(bag.key); }])), []);
  const gapRegisters = useMemo(() => HARBOR_GAPS.map((_, index) => (line: THREE.LineSegments | null) => { gaps.current[index] = line; }), []);

  const apply = useCallback((value: number) => {
    let lifted = 0;
    let landed = 0;
    TRANSFER_MOVES.forEach((move) => {
      const handle = handles.current.get(move.key);
      const u = THREE.MathUtils.clamp((value - move.step * STAGGER) / FLIGHT, 0, 1);
      if (u > 0) lifted += 1;
      if (u >= 1) landed += 1;
      if (handle) {
        handle.group.position.copy(flightPoint(move.from, move.to, u, point));
        handle.body.material = u >= 1 ? proposed(handle.base) : handle.base;
      }
      const gap = gaps.current[move.step];
      if (gap) gap.visible = u < 1;
    });
    const key = `${lifted}:${landed}`;
    if (key !== reported.current) { reported.current = key; report.current(lifted, landed); }
  }, [point]);

  useLayoutEffect(() => {
    const target = moved ? TIMELINE : 0;
    if (replay !== lastReplay.current) { lastReplay.current = replay; progress.current = 0; }
    if (reducedMotion) { progress.current = target; motion.current = null; }
    else if (progress.current !== target) motion.current = { start: performance.now(), from: progress.current, to: target };
    apply(progress.current);
    invalidate();
  }, [moved, replay, reducedMotion, apply, invalidate]);

  useFrame((state) => {
    const current = motion.current;
    if (!current) return;
    const forward = current.to > current.from;
    const elapsed = (performance.now() - current.start) * (forward ? 1 : 1.8);
    progress.current = forward ? Math.min(current.to, current.from + elapsed) : Math.max(current.to, current.from - elapsed);
    apply(progress.current);
    if (progress.current === current.to) motion.current = null;
    else if (store.active) state.invalidate();
  });

  return (
    <>
      <Studio extent={4} center={[0, 0.8, 0.2]} />
      {(Object.keys(STOCK_BAY_X) as (keyof typeof STOCK_BAY_X)[]).map((store) => (
        <group key={store}>
          <mesh position={[STOCK_BAY_X[store], 0.003, 0.32]} material={M.slab} receiveShadow>
            <boxGeometry args={[1.78, 0.006, 1.5]} />
          </mesh>
          <Bay x={STOCK_BAY_X[store]} tickets={STOCK_TICKETS} />
        </group>
      ))}
      {STOCK_BAGS.map((bag) => <Bag key={bag.key} product="reserve" at={BAG_AT.get(bag.key) ?? [0, 0, 0]} register={registers.get(bag.key)} />)}
      {HARBOR_GAPS.map((at, index) => <GapOutline key={index} at={at} register={gapRegisters[index]} />)}
      <GhostCarton carton={INCOMING_CARTON} color={COLORS.ink} />
      {reorder ? <GhostCarton carton={REORDER_CARTON} color={COLORS.ok} /> : <TransferPath />}
    </>
  );
}

/* Shell */

function Ready({ onReady }: { onReady: () => void }) {
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    done.current = true;
    requestAnimationFrame(onReady);
  });
  return null;
}

const clampOffset = (offset: Orbit): Orbit => ({ azimuth: THREE.MathUtils.clamp(offset.azimuth, -32, 32), elevation: THREE.MathUtils.clamp(offset.elevation, -5, 22) });

export default function ShelfScene(props: ShelfSceneProps) {
  const [store] = useState(() => new SceneStore());
  const layer = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; offset: Orbit; moved: boolean } | null>(null);
  const framing = props.kind === "briefing" ? BRIEFING_FRAMING : STOCK_FRAMING;

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    store.setDragged(false);
    drag.current = { x: event.clientX, y: event.clientY, offset: { ...store.offset }, moved: false };
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = drag.current;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (!start.moved && Math.hypot(dx, dy) < 5) return;
    if (!start.moved) { start.moved = true; store.setDragged(true); event.currentTarget.setPointerCapture(event.pointerId); }
    store.setOffset(clampOffset({ azimuth: start.offset.azimuth - dx * 0.25, elevation: event.pointerType === "touch" ? start.offset.elevation : start.offset.elevation + dy * 0.2 }));
  };
  const onPointerEnd = () => { drag.current = null; };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const turns: Record<string, [number, number]> = { ArrowLeft: [8, 0], ArrowRight: [-8, 0], ArrowUp: [0, 5], ArrowDown: [0, -5] };
    const turn = turns[event.key];
    if (!turn) return;
    event.preventDefault();
    store.setOffset(clampOffset({ azimuth: store.offset.azimuth + turn[0], elevation: store.offset.elevation + turn[1] }));
  };

  return (
    <div
      className={styles.sceneLive}
      role="group"
      aria-roledescription="3D shelf view"
      aria-label={props.label}
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
        camera={{ fov: FOV, near: 0.1, far: 80, position: [2, 2, 8] }}
        gl={{ antialias: true, powerPreference: "low-power", toneMapping: THREE.NeutralToneMapping, toneMappingExposure: 1 }}
        onCreated={(state) => store.setInvalidate(() => state.invalidate())}
      >
        <CameraRig framing={framing} store={store} reducedMotion={props.reducedMotion} labels={props.labels} layer={layer} />
        {props.kind === "briefing"
          ? <BriefingScene focus={props.focus} onPick={props.onPick} store={store} />
          : <StockScene moved={props.moved} replay={props.replay} reorder={props.reorder} reducedMotion={props.reducedMotion} onProgress={props.onProgress} store={store} />}
        <Ready onReady={props.onReady} />
        <ResumeWhenActive active={props.active} store={store} />
      </Canvas>
      <LabelLayer labels={props.labels} layer={layer} />
    </div>
  );
}
