"use client";

import { useEffect, useMemo, useRef, type CSSProperties, type RefObject } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { BUILDING, WALL_HEIGHT, WALLS, wallById, type Wall } from "./design-engineering-model";
import styles from "./design-engineering.module.css";

const BACKGROUND = "#f3f3f1";
const ease = (t: number) => 1 - Math.pow(1 - t, 4);
const toScene = (x: number, y: number): [number, number] => [x - BUILDING.width / 2, y - BUILDING.depth / 2];

function roundedRect(width: number, depth: number, radius: number) {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -depth / 2;
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + depth - radius);
  shape.quadraticCurveTo(x + width, y + depth, x + width - radius, y + depth);
  shape.lineTo(x + radius, y + depth);
  shape.quadraticCurveTo(x, y + depth, x, y + depth - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  return shape;
}

// A box with softened edges, sitting on y = 0, so lighting picks out each edge.
function bevelledBox(width: number, depth: number, height: number, radius: number) {
  const geometry = new THREE.ExtrudeGeometry(roundedRect(width, depth, radius), {
    depth: height - radius * 2, bevelEnabled: true, bevelThickness: radius, bevelSize: radius, bevelOffset: -radius, bevelSegments: 2, curveSegments: 3,
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, radius, 0);
  geometry.computeVertexNormals();
  return geometry;
}

function boxEdges(width: number, depth: number, height: number) {
  const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(width, height, depth));
  edges.translate(0, height / 2, 0);
  return edges;
}

function contactShadowTexture() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (context) {
    const gradient = context.createRadialGradient(size / 2, size / 2, size * 0.18, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, "rgba(23, 25, 26, 0.55)");
    gradient.addColorStop(0.55, "rgba(23, 25, 26, 0.22)");
    gradient.addColorStop(1, "rgba(23, 25, 26, 0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const material = {
  wall: new THREE.MeshStandardMaterial({ color: "#e4e3df", roughness: 0.78 }),
  selected: new THREE.MeshStandardMaterial({ color: "#fed603", emissive: "#fed603", emissiveIntensity: 0.22, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }),
  slab: new THREE.MeshStandardMaterial({ color: "#c9c9c5", roughness: 0.9 }),
  proposed: new THREE.MeshStandardMaterial({ color: "#007dfe", roughness: 0.6, transparent: true, opacity: 0.55 }),
  edge: new THREE.LineBasicMaterial({ color: "#17191a" }),
  ground: new THREE.ShadowMaterial({ opacity: 0.12 }),
};

function roomLighting(gl: THREE.WebGLRenderer, scene: THREE.Scene) {
  const generator = new THREE.PMREMGenerator(gl);
  const room = new RoomEnvironment();
  const environment = generator.fromScene(room, 0.04).texture;
  room.dispose();
  generator.dispose();
  scene.environment = environment;
  scene.environmentIntensity = 0.6;
  return environment;
}

function KeyLight() {
  return (
    <directionalLight
      position={[-8, 13, 6]}
      intensity={1.9}
      castShadow
      shadow-mapSize={[2048, 2048]}
      shadow-radius={5}
      shadow-bias={-0.0004}
      shadow-normalBias={0.02}
      shadow-camera-left={-9}
      shadow-camera-right={9}
      shadow-camera-top={9}
      shadow-camera-bottom={-9}
      shadow-camera-near={1}
      shadow-camera-far={40}
    />
  );
}

type WallPart = { wall: Wall; position: [number, number, number]; size: [number, number]; body: THREE.BufferGeometry; edges: THREE.BufferGeometry; footprint: THREE.BufferGeometry; footprintEdges: THREE.BufferGeometry };

function useWallParts() {
  return useMemo<WallPart[]>(() => WALLS.map((wall) => {
    const width = wall.x1 - wall.x0;
    const depth = wall.y1 - wall.y0;
    const [x, z] = toScene((wall.x0 + wall.x1) / 2, (wall.y0 + wall.y1) / 2);
    const radius = Math.min(0.018, depth / 5, width / 5);
    return {
      wall,
      position: [x, 0, z],
      size: [width, depth],
      body: bevelledBox(width, depth, WALL_HEIGHT, radius),
      edges: boxEdges(width, depth, WALL_HEIGHT),
      footprint: bevelledBox(width, depth, 0.03, 0.006),
      footprintEdges: boxEdges(width, depth, 0.03),
    };
  }), []);
}

type Pin = { id: string; at: [number, number, number]; title: string; detail: string; state?: "blocked" | "proposed" | "selected"; place?: "above" | "below" };

function pinsFor(selected: string, confirmed: boolean): Pin[] {
  const wall = wallById(selected);
  const [x, z] = toScene((wall.x0 + wall.x1) / 2, (wall.y0 + wall.y1) / 2);
  const pins: Pin[] = [{
    id: "wall",
    at: [x, confirmed ? WALL_HEIGHT : 0.03, z],
    title: `${wall.id} ${wall.name}`,
    detail: confirmed ? `${wall.length}, ${wall.thickness}, 3.00 m high` : `${wall.length}, ${wall.thickness}, height not set`,
    state: "selected",
  }];
  if (!confirmed) pins.push({ id: "height", at: [BUILDING.width / 2 - 0.15, 0.03, BUILDING.depth / 2 - 0.15], title: "Wall height", detail: "Needs confirmation", state: "blocked", place: "below" });
  return pins;
}

const VIEWS = {
  pending: { elevation: 62, azimuth: 24 },
  confirmed: { elevation: 31, azimuth: 36 },
};
const scratch = new THREE.Vector3();
const corners = [-1, 1].flatMap((sx) => [-1, 1].flatMap((sz) => [0, 1].map((sy) => new THREE.Vector3(sx * BUILDING.width / 2, sy, sz * BUILDING.depth / 2))));

// Camera, wall extrusion, and label positions all advance here; the loop only
// runs while something is moving because the canvas renders on demand.
function Director({ confirmed, reduced, pins, pinNodes }: { confirmed: boolean; reduced: boolean; pins: Pin[]; pinNodes: RefObject<Map<string, HTMLSpanElement>> }) {
  const invalidate = useThree((state) => state.invalidate);
  const size = useThree((state) => state.size);
  const progress = useRef(confirmed ? 1 : 0);
  const from = useRef(confirmed ? 1 : 0);
  const started = useRef(0);
  useEffect(() => {
    from.current = progress.current;
    started.current = performance.now();
    invalidate();
  }, [confirmed, invalidate]);
  useEffect(() => { invalidate(); }, [pins, size, invalidate]);

  useFrame((state) => {
    const { camera, scene } = state;
    const target = confirmed ? 1 : 0;
    if (progress.current !== target) {
      const t = reduced ? 1 : Math.min(1, (performance.now() - started.current) / 1100);
      progress.current = from.current + (target - from.current) * ease(t);
      if (t >= 1) progress.current = target;
      else state.invalidate();
    }
    const p = progress.current;
    const extrude = confirmed ? Math.min(1, Math.max(0, (p - 0.25) / 0.75)) : 0;
    const walls = scene.getObjectByName("walls");
    if (walls) {
      walls.scale.y = Math.max(extrude, 0.0001);
      walls.visible = extrude > 0.001;
    }
    const elevation = THREE.MathUtils.degToRad(VIEWS.pending.elevation + (VIEWS.confirmed.elevation - VIEWS.pending.elevation) * p);
    const azimuth = THREE.MathUtils.degToRad(VIEWS.pending.azimuth + (VIEWS.confirmed.azimuth - VIEWS.pending.azimuth) * p);
    const height = WALL_HEIGHT * extrude;
    camera.position.set(Math.sin(azimuth) * Math.cos(elevation) * 30, Math.sin(elevation) * 30, Math.cos(azimuth) * Math.cos(elevation) * 30);
    camera.lookAt(0, height * 0.4, 0);
    camera.updateMatrixWorld();
    if (camera instanceof THREE.OrthographicCamera) {
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const corner of corners) {
        scratch.set(corner.x, corner.y * Math.max(height, 0.25) - (corner.y ? 0 : BUILDING.slab), corner.z).applyMatrix4(camera.matrixWorldInverse);
        minX = Math.min(minX, scratch.x); maxX = Math.max(maxX, scratch.x);
        minY = Math.min(minY, scratch.y); maxY = Math.max(maxY, scratch.y);
      }
      const zoom = Math.min(state.size.width / ((maxX - minX) * 1.18), state.size.height / ((maxY - minY) * (1.75 - 0.25 * p)));
      camera.zoom = zoom;
      camera.updateProjectionMatrix();
    }
    for (const pin of pins) {
      const node = pinNodes.current.get(pin.id);
      if (!node) continue;
      scratch.set(...pin.at);
      if (pin.id === "wall") scratch.y = pin.at[1] > 0.1 ? height : 0.03;
      scratch.project(camera);
      const x = ((scratch.x + 1) / 2) * size.width;
      const y = ((1 - scratch.y) / 2) * size.height;
      const chip = node.lastElementChild as HTMLElement | null;
      const half = (chip?.offsetWidth ?? 0) / 2;
      const shift = Math.min(Math.max(x, half + 10), size.width - half - 10) - x;
      const reach = 26 + (chip?.offsetHeight ?? 0) + 8;
      const preferred = pin.place ?? "above";
      const place = preferred === "below" ? (y + reach > size.height ? "above" : "below") : (y - reach < 0 ? "below" : "above");
      node.dataset.place = place;
      node.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      node.style.setProperty("--shift", `${shift.toFixed(1)}px`);
      node.style.visibility = "visible";
    }
  });
  return null;
}

type SceneProps = { selected: string; confirmed: boolean; reduced: boolean; onSelect: (id: string) => void; onReady?: () => void };

export default function PlanModelScene({ selected, confirmed, reduced, onSelect, onReady }: SceneProps) {
  const parts = useWallParts();
  const pinNodes = useRef(new Map<string, HTMLSpanElement>());
  const environment = useRef<THREE.Texture | null>(null);
  const pins = useMemo(() => pinsFor(selected, confirmed), [selected, confirmed]);
  const slab = useMemo(() => ({ body: bevelledBox(BUILDING.width, BUILDING.depth, BUILDING.slab, 0.03) }), []);
  const shadow = useMemo(() => contactShadowTexture(), []);
  useEffect(() => () => {
    document.body.style.cursor = "";
    environment.current?.dispose();
    shadow.dispose();
  }, [shadow]);
  const pick = (id: string) => (event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onSelect(id); };
  const hover = (on: boolean) => () => { document.body.style.cursor = on ? "pointer" : ""; };

  return (
    <div className={styles.sceneCanvas}>
      <Canvas
        orthographic
        shadows="percentage"
        dpr={[1, 2]}
        frameloop="demand"
        gl={{ antialias: true, toneMapping: THREE.NeutralToneMapping, toneMappingExposure: 1 }}
        camera={{ position: [10, 20, 20], zoom: 40, near: 0.1, far: 100 }}
        onCreated={({ gl, scene }) => {
          environment.current = roomLighting(gl, scene);
          onReady?.();
        }}
      >
        <color attach="background" args={[BACKGROUND]} />
        <KeyLight />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -BUILDING.slab, 0]} receiveShadow material={material.ground}>
          <planeGeometry args={[60, 60]} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -BUILDING.slab + 0.002, 0]}>
          <planeGeometry args={[BUILDING.width * 1.28, BUILDING.depth * 1.45]} />
          <meshBasicMaterial map={shadow} transparent depthWrite={false} opacity={0.42} />
        </mesh>
        <mesh geometry={slab.body} material={material.slab} position={[0, -BUILDING.slab, 0]} castShadow receiveShadow />
        {!confirmed && parts.map((part) => (
          <group key={part.wall.id} position={part.position} onClick={pick(part.wall.id)} onPointerOver={hover(true)} onPointerOut={hover(false)}>
            <mesh geometry={part.footprint} material={part.wall.id === selected ? material.selected : material.proposed} receiveShadow />
            {part.wall.id === selected && <lineSegments geometry={part.footprintEdges} material={material.edge} />}
          </group>
        ))}
        <group name="walls">
          {parts.map((part) => (
            <group key={part.wall.id} position={part.position} onClick={pick(part.wall.id)} onPointerOver={hover(true)} onPointerOut={hover(false)}>
              <mesh geometry={part.body} material={part.wall.id === selected ? material.selected : material.wall} castShadow receiveShadow />
              {part.wall.id === selected && <lineSegments geometry={part.edges} material={material.edge} />}
            </group>
          ))}
        </group>
        <Director confirmed={confirmed} reduced={reduced} pins={pins} pinNodes={pinNodes} />
      </Canvas>
      <div className={styles.pins} aria-hidden="true">
        {pins.map((pin) => (
          <span
            key={pin.id}
            ref={(node) => { if (node) pinNodes.current.set(pin.id, node); else pinNodes.current.delete(pin.id); }}
            className={styles.pin}
            data-state={pin.state}
            data-place={pin.place ?? "above"}
            style={{ visibility: "hidden", "--leader": "26px" } as CSSProperties}
          >
            <i className={styles.pinDot} />
            <i className={styles.pinLeader} />
            <span className={styles.pinChip}><strong>{pin.title}</strong><span>{pin.detail}</span></span>
          </span>
        ))}
      </div>
    </div>
  );
}
