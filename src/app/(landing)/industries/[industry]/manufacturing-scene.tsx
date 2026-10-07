"use client";

import { useEffect, useId, useLayoutEffect, useRef, type ReactNode, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { cellStatus, layout, runs, partPoses, type Configuration, type Point, type SimRun } from "./manufacturing-model";
import styles from "./manufacturing.module.css";

const H = layout.conveyorHeight;
const BACKGROUND = "#eeeeec";

function roundedRect(width: number, depth: number, radius: number, path: THREE.Shape | THREE.Path = new THREE.Shape()) {
  const x = -width / 2;
  const y = -depth / 2;
  path.moveTo(x + radius, y);
  path.lineTo(x + width - radius, y);
  path.quadraticCurveTo(x + width, y, x + width, y + radius);
  path.lineTo(x + width, y + depth - radius);
  path.quadraticCurveTo(x + width, y + depth, x + width - radius, y + depth);
  path.lineTo(x + radius, y + depth);
  path.quadraticCurveTo(x, y + depth, x, y + depth - radius);
  path.lineTo(x, y + radius);
  path.quadraticCurveTo(x, y, x + radius, y);
  return path;
}

function slab(width: number, depth: number, radius: number, thickness: number, bevel: number) {
  const geometry = new THREE.ExtrudeGeometry(roundedRect(width, depth, radius) as THREE.Shape, { depth: thickness, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 8 });
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, bevel, 0);
  return geometry;
}

function band(width: number, depth: number, radius: number, thickness: number) {
  const shape = roundedRect(width + thickness, depth + thickness, radius + thickness / 2) as THREE.Shape;
  shape.holes.push(roundedRect(width, depth, radius, new THREE.Path()));
  const geometry = new THREE.ShapeGeometry(shape, 8);
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

// H-20 housing: body, raised cover, cable boss, and four corner fasteners.
const HOUSING_TOP = 0.082;
const COVER_TOP = HOUSING_TOP + 0.022;
const FASTENER_SPOTS: Point[] = [[-0.135, 0.098], [0.135, 0.098], [0.135, -0.098], [-0.135, -0.098]];

const geometry = {
  body: slab(0.34, 0.26, 0.04, 0.07, 0.006),
  cover: slab(0.2, 0.14, 0.03, 0.016, 0.003),
  plate: slab(0.46, 0.38, 0.02, 0.006, 0.003),
  boss: new THREE.CylinderGeometry(0.026, 0.028, 0.022, 28),
  port: new THREE.CircleGeometry(0.013, 24).rotateX(-Math.PI / 2),
  seat: new THREE.CircleGeometry(0.019, 24).rotateX(-Math.PI / 2),
  hole: new THREE.CircleGeometry(0.0085, 20).rotateX(-Math.PI / 2),
  screw: new THREE.CylinderGeometry(0.0155, 0.0165, 0.008, 22),
  slot: new THREE.BoxGeometry(0.021, 0.003, 0.0032),
  ring: new THREE.RingGeometry(0.027, 0.034, 40).rotateX(-Math.PI / 2),
  outline: band(0.36, 0.28, 0.045, 0.012),
  roller: new THREE.CylinderGeometry(0.022, 0.022, 0.4, 10).rotateX(Math.PI / 2),
  carton: new THREE.BoxGeometry(0.3, 0.18, 0.24),
  focusBox: new THREE.BoxGeometry(0.36, 0.38, 0.62),
  focusEdges: new THREE.EdgesGeometry(new THREE.BoxGeometry(0.36, 0.38, 0.62)),
};

const standard = (color: string, roughness = 0.6, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const material = {
  body: standard("#8e979d", 0.55, 0.05),
  cover: standard("#99a2a8", 0.5, 0.05),
  variantBody: standard("#b2a78f", 0.55, 0.05),
  variantCover: standard("#bbb099", 0.5, 0.05),
  boss: standard("#33373a", 0.5),
  port: standard("#121314", 0.8),
  seat: standard("#5f656a", 0.5, 0.3),
  hole: standard("#0e0f10", 0.9),
  screw: standard("#c3c7ca", 0.3, 0.7),
  slot: standard("#2a2c2e", 0.6),
  ink: standard("#262829", 0.55, 0.2),
  frame: standard("#3a3d40", 0.5, 0.3),
  steel: standard("#a3a8ab", 0.45, 0.4),
  surface: standard("#d8d9d9", 0.7),
  bench: standard("#c9cacb", 0.6),
  white: standard("#f8f8f6", 0.6),
  roller: standard("#b7bbbe", 0.35, 0.6),
  motor: standard("#6b7176", 0.45, 0.35),
  floor: standard("#e2e2df", 0.95),
  kraft: standard("#c9b089", 0.85),
  blue: standard("#007dfe", 0.45),
  yellow: standard("#fed603", 0.5),
  light: new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#ffffff", emissiveIntensity: 0.9 }),
  marker: new THREE.MeshBasicMaterial({ color: "#fed603", side: THREE.DoubleSide }),
  expected: new THREE.MeshBasicMaterial({ color: "#007dfe", side: THREE.DoubleSide }),
  focus: new THREE.MeshBasicMaterial({ color: "#fed603", transparent: true, opacity: 0.14, depthWrite: false }),
  focusEdge: new THREE.LineBasicMaterial({ color: "#d9b400" }),
  tape: new THREE.MeshBasicMaterial({ color: "#fed603" }),
  proposedTape: new THREE.MeshBasicMaterial({ color: "#007dfe" }),
};

type HousingProps = { variant?: boolean; fasteners?: number; missing?: number; detail?: "high" | "low"; ring?: { index: number; tone: "marker" | "expected" }; outline?: "marker" | "expected" };

export function Housing({ variant = false, fasteners = 4, missing, detail = "low", ring, outline }: HousingProps) {
  return (
    <group>
      <mesh geometry={geometry.body} material={variant ? material.variantBody : material.body} castShadow receiveShadow />
      <mesh geometry={geometry.cover} material={variant ? material.variantCover : material.cover} position={[0, HOUSING_TOP - 0.003, 0]} castShadow />
      <mesh geometry={geometry.boss} material={material.boss} position={[0, COVER_TOP + 0.011, 0]} castShadow />
      <mesh geometry={geometry.port} material={material.port} position={[0, COVER_TOP + 0.0225, 0]} />
      {FASTENER_SPOTS.map(([x, z], index) => (
        <group key={index} position={[x, HOUSING_TOP, z]}>
          <mesh geometry={geometry.seat} material={material.seat} position={[0, 0.0005, 0]} />
          <mesh geometry={geometry.hole} material={material.hole} position={[0, 0.0009, 0]} />
          <group name={`fastener-${index}`} visible={index < fasteners && index !== missing}>
            <mesh geometry={geometry.screw} material={material.screw} position={[0, 0.004, 0]} castShadow />
            {detail === "high" && (
              <>
                <mesh geometry={geometry.slot} material={material.slot} position={[0, 0.0081, 0]} rotation={[0, Math.PI / 4, 0]} />
                <mesh geometry={geometry.slot} material={material.slot} position={[0, 0.0081, 0]} rotation={[0, -Math.PI / 4, 0]} />
              </>
            )}
          </group>
        </group>
      ))}
      {ring && <mesh geometry={geometry.ring} material={material[ring.tone]} position={[FASTENER_SPOTS[ring.index][0], HOUSING_TOP + 0.014, FASTENER_SPOTS[ring.index][1]]} />}
      {outline && <mesh geometry={geometry.outline} material={material[outline]} position={[0, 0.003, 0]} />}
    </group>
  );
}

type SceneLabel = { id: string; at: [number, number, number]; text: ReactNode; detail?: ReactNode; tone?: "default" | "accent" | "proposed" | "alert" | "quiet"; place?: "above" | "below"; minor?: boolean };
const scratch = new THREE.Vector3();

// Labels are HTML for legibility; each frame moves them to their projected anchor.
function LabelProjector({ labels, layer }: { labels: SceneLabel[]; layer: string }) {
  useFrame(({ camera, size }) => {
    for (const label of labels) {
      const element = document.getElementById(`${layer}-${label.id}`);
      if (!element) continue;
      scratch.set(...label.at).project(camera);
      const half = element.offsetWidth / 2;
      const x = Math.min(Math.max(((scratch.x + 1) / 2) * size.width, half + 4), size.width - half - 4);
      const y = ((1 - scratch.y) / 2) * size.height;
      element.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, ${label.place === "below" ? "8px" : "calc(-100% - 8px)"})`;
      element.style.visibility = scratch.z < 1 && x > 0 && x < size.width && y > 0 && y < size.height ? "visible" : "hidden";
    }
  });
  return null;
}

function LabelLayer({ labels, layer }: { labels: SceneLabel[]; layer: string }) {
  return (
    <div className={styles.sceneLabels} aria-hidden="true">
      {labels.map((label) => (
        <span
          key={label.id}
          id={`${layer}-${label.id}`}
          className={`${styles.sceneLabel} ${label.minor ? styles.sceneLabelMinor : ""}`}
          data-tone={label.tone ?? "default"}
          data-place={label.place ?? "above"}
        >
          <strong>{label.text}</strong>
          {label.detail && <span>{label.detail}</span>}
        </span>
      ))}
    </div>
  );
}

function Invalidate({ signal }: { signal: string }) {
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => { invalidate(); }, [invalidate, signal]);
  return null;
}

/* Inspection close-up ---------------------------------------------------- */

export type SampleId = "reference" | "missing" | "variation";
export const MISSING_INDEX = 2;

function FitOrthographic({ width, height }: { width: number; height: number }) {
  useFrame(({ camera, size }) => {
    const zoom = Math.min(size.width / width, size.height / height);
    if (camera instanceof THREE.OrthographicCamera && Math.abs(camera.zoom - zoom) > 0.01) {
      camera.zoom = zoom;
      camera.updateProjectionMatrix();
    }
  });
  return null;
}

function productLabels(sample: SampleId, showFinding: boolean, referenceX: number, sampleX: number) {
  const labels: SceneLabel[] = [{ id: "reference", at: [referenceX, 0, 0.2], text: "Approved reference", detail: "Required: four fasteners", place: "below", tone: "quiet" }];
  if (sample === "reference") {
    FASTENER_SPOTS.forEach(([x, z], index) => labels.push({ id: `n${index}`, at: [x + Math.sign(x) * 0.05, HOUSING_TOP, z + Math.sign(z) * 0.035], text: String(index + 1), tone: "quiet" }));
    return labels;
  }
  labels.push({ id: "sample", at: [sampleX, 0, 0.2], text: "Inspection sample", detail: sample === "variation" ? "Allowed variation" : "Same viewpoint and orientation", place: "below", tone: sample === "variation" ? "proposed" : "accent" });
  const [x, z] = FASTENER_SPOTS[MISSING_INDEX];
  if (sample === "missing" && showFinding) labels.push({ id: "expected", at: [sampleX + x, HOUSING_TOP + 0.02, z], text: "Fastener 3 expected here", tone: "accent" });
  if (sample === "variation" && showFinding) labels.push({ id: "shade", at: [sampleX, COVER_TOP + 0.03, -0.12], text: "Shade within approved range", tone: "proposed" });
  return labels;
}

export function ProductCanvas({ sample, showFinding, onReady }: { sample: SampleId; showFinding: boolean; onReady?: () => void }) {
  const layer = useId();
  const pair = sample !== "reference";
  const referenceX = pair ? -0.28 : 0;
  const sampleX = 0.28;
  const labels = productLabels(sample, showFinding, referenceX, sampleX);
  return (
    <div className={styles.sceneCanvas}>
      <Canvas
        orthographic
        flat
        shadows="percentage"
        dpr={[1, 2]}
        frameloop="demand"
        camera={{ position: [0, 1.3, 1.05], zoom: 600, near: 0.01, far: 10 }}
        onCreated={({ camera }) => { camera.lookAt(0, 0.02, 0.01); onReady?.(); }}
      >
        <color attach="background" args={[BACKGROUND]} />
        <hemisphereLight args={["#ffffff", "#d9d9d4", 1.5]} />
        <directionalLight position={[-0.8, 2.2, 1.2]} intensity={2.1} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-1} shadow-camera-right={1} shadow-camera-top={1} shadow-camera-bottom={-1} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.0125, 0]} receiveShadow>
          <planeGeometry args={[4, 4]} />
          <meshStandardMaterial color={BACKGROUND} roughness={1} />
        </mesh>
        <mesh geometry={geometry.plate} material={material.white} position={[referenceX, -0.012, 0]} receiveShadow />
        <group position={[referenceX, 0, 0]}>
          <Housing detail="high" ring={sample === "missing" && showFinding ? { index: MISSING_INDEX, tone: "expected" } : undefined} outline={sample === "variation" && showFinding ? "expected" : undefined} />
        </group>
        {pair && (
          <>
            <mesh geometry={geometry.plate} material={material.white} position={[sampleX, -0.012, 0]} receiveShadow />
            <group position={[sampleX, 0, 0]}>
              <Housing
                detail="high"
                variant={sample === "variation"}
                missing={sample === "missing" ? MISSING_INDEX : undefined}
                ring={sample === "missing" && showFinding ? { index: MISSING_INDEX, tone: "marker" } : undefined}
                outline={sample === "variation" && showFinding ? "marker" : undefined}
              />
            </group>
          </>
        )}
        <FitOrthographic width={pair ? 1.12 : 0.7} height={0.62} />
        <LabelProjector labels={labels} layer={layer} />
        <Invalidate signal={`${sample}-${showFinding}`} />
      </Canvas>
      <LabelLayer labels={labels} layer={layer} />
    </div>
  );
}

/* Production cell -------------------------------------------------------- */

function Conveyor({ from, to, accent = false }: { from: Point; to: Point; accent?: boolean }) {
  const [ax, az] = from;
  const [bx, bz] = to;
  const length = Math.hypot(bx - ax, bz - az);
  const angle = Math.atan2(-(bz - az), bx - ax);
  const count = Math.max(1, Math.floor(length / 0.11));
  const rollers = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = rollers.current;
    if (!mesh) return;
    const matrix = new THREE.Matrix4();
    for (let index = 0; index < count; index++) {
      matrix.makeTranslation(-length / 2 + ((index + 0.5) * length) / count, 0, 0);
      mesh.setMatrixAt(index, matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [count, length]);
  const legs = Math.max(2, Math.round(length / 1.4) + 1);
  const legPositions = Array.from({ length: legs }, (_, index) => -length / 2 + 0.08 + (index * (length - 0.16)) / (legs - 1));
  return (
    <group position={[(ax + bx) / 2, H - 0.025, (az + bz) / 2]} rotation={[0, angle, 0]}>
      <instancedMesh ref={rollers} args={[geometry.roller, material.roller, count]} receiveShadow />
      {[-0.215, 0.215].map((z) => (
        <mesh key={z} position={[0, 0.006, z]} material={accent ? material.blue : material.frame} castShadow receiveShadow>
          <boxGeometry args={[length, 0.07, 0.03]} />
        </mesh>
      ))}
      {legPositions.map((x) => [-0.19, 0.19].map((z) => (
        <mesh key={`${x}-${z}`} position={[x, -(H - 0.025) / 2, z]} material={material.frame} castShadow>
          <boxGeometry args={[0.04, H - 0.06, 0.04]} />
        </mesh>
      )))}
    </group>
  );
}

function TransferUnit({ at }: { at: Point }) {
  return (
    <group position={[at[0], 0, at[1]]}>
      <mesh position={[0, H - 0.03, 0]} material={material.frame} castShadow receiveShadow><boxGeometry args={[0.5, 0.05, 0.5]} /></mesh>
      <mesh position={[0, H - 0.0035, 0]} material={material.blue}><boxGeometry args={[0.4, 0.002, 0.05]} /></mesh>
      <mesh position={[0, H - 0.0035, 0]} material={material.blue}><boxGeometry args={[0.05, 0.002, 0.4]} /></mesh>
      <mesh position={[0, (H - 0.055) / 2, 0]} material={material.frame}><boxGeometry args={[0.08, H - 0.055, 0.08]} /></mesh>
    </group>
  );
}

function Leg({ x, z, height }: { x: number; z: number; height: number }) {
  return <mesh position={[x, height / 2, z]} material={material.frame} castShadow><boxGeometry args={[0.05, height, 0.05]} /></mesh>;
}

function AssemblyStation() {
  const [x] = layout.fixture;
  const post: Point = [x - 0.42, -0.4];
  return (
    <group>
      <mesh position={[x - 0.075, H - 0.031, 0]} material={material.bench} castShadow receiveShadow><boxGeometry args={[1.05, 0.05, 0.95]} /></mesh>
      {[[-0.55, -0.4], [0.4, -0.4], [-0.55, 0.4], [0.4, 0.4]].map(([dx, dz]) => <Leg key={`${dx}${dz}`} x={x + dx} z={dz} height={H - 0.056} />)}
      <mesh position={[x, H - 0.003, 0]} material={material.ink} receiveShadow><boxGeometry args={[0.42, 0.006, 0.34]} /></mesh>
      <mesh position={[x, H + 0.004, -0.17]} material={material.blue}><boxGeometry args={[0.42, 0.014, 0.02]} /></mesh>
      <mesh position={[x - 0.42, H + 0.044, 0.3]} material={material.frame} castShadow><boxGeometry args={[0.32, 0.1, 0.24]} /></mesh>
      <group position={[x - 0.42, H + 0.02, 0.3]} scale={0.6}><Housing fasteners={0} /></group>
      <mesh position={[x - 0.42, H + 0.024, -0.26]} material={material.surface} castShadow><boxGeometry args={[0.24, 0.06, 0.18]} /></mesh>
      <mesh position={[post[0], 1.4, post[1]]} material={material.frame} castShadow><boxGeometry args={[0.06, 1.2, 0.06]} /></mesh>
      <mesh position={[(post[0] + x) / 2, 1.98, post[1] / 2]} rotation={[0, Math.atan2(x - post[0], -post[1]), 0]} material={material.frame} castShadow><boxGeometry args={[0.04, 0.04, Math.hypot(x - post[0], post[1])]} /></mesh>
      <mesh position={[x, 1.73, 0]} material={material.steel}><cylinderGeometry args={[0.004, 0.004, 0.5, 6]} /></mesh>
      <mesh position={[x, 1.38, 0]} material={material.blue} castShadow><cylinderGeometry args={[0.03, 0.03, 0.2, 14]} /></mesh>
      <mesh position={[x, 1.24, 0]} material={material.steel}><cylinderGeometry args={[0.006, 0.006, 0.08, 6]} /></mesh>
    </group>
  );
}

function InspectionBooth({ at, proposed = false }: { at: Point; proposed?: boolean }) {
  const [x, z] = at;
  const top = 1.95;
  const accent = proposed ? material.blue : material.ink;
  return (
    <group position={[x, 0, z]}>
      {[[-0.68, -0.42], [0.68, -0.42], [-0.68, 0.42], [0.68, 0.42]].map(([dx, dz]) => <Leg key={`${dx}${dz}`} x={dx} z={dz} height={top} />)}
      {[-0.42, 0.42].map((dz) => <mesh key={dz} position={[0, top, dz]} material={accent} castShadow><boxGeometry args={[1.41, 0.05, 0.05]} /></mesh>)}
      {[-0.68, 0.68].map((dx) => <mesh key={dx} position={[dx, top, 0]} material={accent} castShadow><boxGeometry args={[0.05, 0.05, 0.89]} /></mesh>)}
      <mesh position={[0, top - 0.02, 0]} material={material.frame}><boxGeometry args={[0.05, 0.04, 0.84]} /></mesh>
      <mesh position={[0, top - 0.12, 0]} material={material.ink} castShadow><boxGeometry args={[0.15, 0.16, 0.13]} /></mesh>
      <mesh position={[0, top - 0.23, 0]} material={material.frame}><cylinderGeometry args={[0.04, 0.045, 0.07, 18]} /></mesh>
      {[-0.28, 0.28].map((dz) => (
        <group key={dz} position={[0, 1.45, dz]} rotation={[dz > 0 ? 0.5 : -0.5, 0, 0]}>
          <mesh material={material.frame}><boxGeometry args={[0.8, 0.05, 0.07]} /></mesh>
          <mesh position={[0, -0.026, 0]} material={material.light}><boxGeometry args={[0.76, 0.004, 0.05]} /></mesh>
        </group>
      ))}
      {[-0.68, 0.68].map((dx) => <mesh key={dx} position={[dx, 1.45, 0]} material={material.frame}><boxGeometry args={[0.04, 0.04, 0.84]} /></mesh>)}
    </group>
  );
}

function PackagingStation({ run, clock }: { run: SimRun; clock: RefObject<number> }) {
  const cartons = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = cartons.current;
    if (!mesh) return;
    const matrix = new THREE.Matrix4();
    for (let index = 0; index < 36; index++) {
      const layer = Math.floor(index / 9);
      const column = index % 3;
      const row = Math.floor(index / 3) % 3;
      matrix.makeTranslation((column - 1) * 0.32, 0.21 + layer * 0.185, (row - 1) * 0.26);
      mesh.setMatrixAt(index, matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, []);
  useFrame(() => {
    if (cartons.current) cartons.current.count = Math.min(36, run.parts.filter((part) => part.packEnd <= clock.current).length);
  });
  const [cx] = layout.carton;
  return (
    <group>
      <mesh position={[5.4, H - 0.033, 0]} material={material.bench} castShadow receiveShadow><boxGeometry args={[0.9, 0.05, 0.95]} /></mesh>
      {[[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]].map(([dx, dz]) => <Leg key={`${dx}${dz}`} x={5.4 + dx} z={dz} height={H - 0.058} />)}
      <group position={[cx, H - 0.008, 0]}>
        <mesh position={[0, 0.004, 0]} material={material.kraft} receiveShadow><boxGeometry args={[0.42, 0.008, 0.34]} /></mesh>
        {[[0, 0.17, 0.42, 0.008], [0, -0.17, 0.42, 0.008], [0.21, 0, 0.008, 0.34], [-0.21, 0, 0.008, 0.34]].map(([dx, dz, w, d]) => (
          <mesh key={`${dx}${dz}`} position={[dx, 0.08, dz]} material={material.kraft} castShadow><boxGeometry args={[w, 0.16, d]} /></mesh>
        ))}
      </group>
      <mesh position={[5.62, H + 0.042, -0.32]} material={material.kraft} castShadow><boxGeometry args={[0.36, 0.1, 0.24]} /></mesh>
      <group position={[5.45, 0, 1.25]}>
        <mesh position={[0, 0.06, 0]} material={material.surface} castShadow receiveShadow><boxGeometry args={[1.0, 0.12, 0.82]} /></mesh>
        <instancedMesh ref={cartons} args={[geometry.carton, material.kraft, 36]} castShadow receiveShadow />
      </group>
    </group>
  );
}

function ConveyorDrive({ focused }: { focused: boolean }) {
  const [x, z] = layout.drive;
  return (
    <group position={[x, 0.6, z]}>
      <mesh material={material.ink} castShadow><boxGeometry args={[0.2, 0.2, 0.16]} /></mesh>
      <mesh position={[0, 0.05, -0.1]} rotation={[Math.PI / 2, 0, 0]} material={material.steel}><cylinderGeometry args={[0.02, 0.02, 0.1, 10]} /></mesh>
      <group position={[0, 0, 0.24]} rotation={[Math.PI / 2, 0, 0]}>
        <mesh material={material.motor} castShadow><cylinderGeometry args={[0.085, 0.085, 0.3, 24]} /></mesh>
        {[-0.09, -0.03, 0.03, 0.09].map((offset) => <mesh key={offset} position={[0, offset, 0]} material={material.motor}><cylinderGeometry args={[0.093, 0.093, 0.012, 24]} /></mesh>)}
        <mesh position={[0, 0.17, 0]} material={material.frame}><cylinderGeometry args={[0.08, 0.08, 0.04, 24]} /></mesh>
      </group>
      <mesh position={[0, 0.115, 0.2]} material={material.ink} castShadow><boxGeometry args={[0.1, 0.05, 0.1]} /></mesh>
      <mesh position={[0.075, 0.03, 0.09]} material={material.yellow}><cylinderGeometry args={[0.014, 0.014, 0.02, 12]} /></mesh>
      {focused && (
        <group position={[0, 0.02, 0.17]}>
          <mesh geometry={geometry.focusBox} material={material.focus} />
          <lineSegments geometry={geometry.focusEdges} material={material.focusEdge} />
        </group>
      )}
    </group>
  );
}

function FloorStrip({ from, to, tone }: { from: Point; to: Point; tone: THREE.Material }) {
  const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
  return (
    <mesh position={[(from[0] + to[0]) / 2, 0.003, (from[1] + to[1]) / 2]} rotation={[-Math.PI / 2, 0, -Math.atan2(to[1] - from[1], to[0] - from[0])]} material={tone}>
      <planeGeometry args={[length, 0.05]} />
    </mesh>
  );
}

const CELL_BOUNDARY: Point[] = [[-6.15, 1.95], [6.15, 1.95], [6.15, -3.0], [-6.15, -3.0]];
const PROPOSED_FOOTPRINT: Point[] = [[-0.75, -1.72], [0.75, -1.72], [0.75, -2.68], [-0.75, -2.68]];

function dashes(outline: Point[], dash = 0.1, gap = 0.1) {
  const segments: [Point, Point][] = [];
  outline.forEach((start, side) => {
    const end = outline[(side + 1) % outline.length];
    const length = Math.hypot(end[0] - start[0], end[1] - start[1]);
    for (let step = 0; step < length; step += dash + gap) {
      const t0 = step / length;
      const t1 = Math.min(1, (step + dash) / length);
      segments.push([[start[0] + (end[0] - start[0]) * t0, start[1] + (end[1] - start[1]) * t0], [start[0] + (end[0] - start[0]) * t1, start[1] + (end[1] - start[1]) * t1]]);
    }
  });
  return segments;
}
const FOOTPRINT_DASHES = dashes(PROPOSED_FOOTPRINT);

function FloorMarkings({ proposed }: { proposed: boolean }) {
  return (
    <group>
      {CELL_BOUNDARY.map((corner, index) => <FloorStrip key={index} from={corner} to={CELL_BOUNDARY[(index + 1) % 4]} tone={material.tape} />)}
      {!proposed && FOOTPRINT_DASHES.map(([from, to], index) => <FloorStrip key={`d${index}`} from={from} to={to} tone={material.proposedTape} />)}
    </group>
  );
}

function SimulatedParts({ run, clock }: { run: SimRun; clock: RefObject<number> }) {
  const groups = useRef<(THREE.Group | null)[]>([]);
  useFrame(() => {
    const poses = partPoses(run, clock.current);
    poses.forEach((pose, index) => {
      const group = groups.current[index];
      if (!group) return;
      group.visible = pose.visible;
      group.position.set(pose.x, H, pose.z);
      for (let fastener = 0; fastener < 4; fastener++) {
        const object = group.getObjectByName(`fastener-${fastener}`);
        if (object) object.visible = fastener < pose.fasteners;
      }
    });
  });
  return (
    <>
      {run.parts.map((part, index) => (
        <group key={`${run.configuration}-${part.id}`} ref={(group) => { groups.current[index] = group; }} visible={false}>
          <Housing />
        </group>
      ))}
    </>
  );
}

export type CellView = "cell" | "drive";
type ViewPreset = { target: [number, number, number]; direction: [number, number, number]; bounds: [[number, number, number], [number, number, number]] };

const views: Record<CellView | "cellPortrait", ViewPreset> = {
  cell: { target: [0, 0.6, -0.5], direction: [-0.2, 1.35, 1], bounds: [[-6.0, 0, -2.75], [6.0, 1.95, 1.7]] },
  cellPortrait: { target: [0, 0.6, -0.5], direction: [0.62, 2.3, 0.12], bounds: [[-6.0, 0, -2.75], [6.0, 1.95, 1.7]] },
  drive: { target: [4.55, 0.7, 0.3], direction: [0.85, 0.5, 1], bounds: [[3.95, 0.3, -0.3], [5.15, 1.05, 0.9]] },
};

function fitCamera(preset: ViewPreset, fov: number, aspect: number) {
  const target = new THREE.Vector3(...preset.target);
  const direction = new THREE.Vector3(...preset.direction).normalize();
  const probe = new THREE.Object3D();
  probe.position.copy(target).add(direction);
  probe.lookAt(target);
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(probe.quaternion);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(probe.quaternion);
  const vertical = Math.tan(THREE.MathUtils.degToRad(fov / 2));
  const horizontal = vertical * aspect;
  const [min, max] = preset.bounds;
  let distance = 0;
  for (const x of [min[0], max[0]]) for (const y of [min[1], max[1]]) for (const z of [min[2], max[2]]) {
    const relative = new THREE.Vector3(x, y, z).sub(target);
    const depth = relative.dot(direction);
    distance = Math.max(distance, depth + (Math.abs(relative.dot(right)) * 1.02) / horizontal, depth + (Math.abs(relative.dot(up)) * 1.05) / vertical);
  }
  return { position: target.clone().add(direction.multiplyScalar(distance)), target };
}

function CameraRig({ view, instant }: { view: CellView; instant: boolean }) {
  const current = useRef<{ target: THREE.Vector3; position: THREE.Vector3 } | null>(null);
  useFrame(({ camera, size, invalidate }, delta) => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    const aspect = size.width / size.height;
    const preset = view === "cell" && aspect < 0.95 ? views.cellPortrait : views[view];
    const goal = fitCamera(preset, camera.fov, aspect);
    if (!current.current || instant) current.current = { target: goal.target.clone(), position: goal.position.clone() };
    const state = current.current;
    const blend = 1 - Math.exp(-Math.min(delta, 0.1) * 3.2);
    state.position.lerp(goal.position, blend);
    state.target.lerp(goal.target, blend);
    if (state.position.distanceTo(goal.position) < 0.005) {
      state.position.copy(goal.position);
      state.target.copy(goal.target);
    } else invalidate();
    camera.position.copy(state.position);
    camera.lookAt(state.target);
  });
  return null;
}

export type CellCanvasProps = {
  configuration: Configuration;
  clock: RefObject<number>;
  time: number;
  animating: boolean;
  view: CellView;
  instant: boolean;
  focusDrive?: boolean;
  showStatus?: boolean;
  onReady?: () => void;
};

function cellLabels(configuration: Configuration, time: number, showStatus: boolean, focusDrive: boolean): SceneLabel[] {
  const status = cellStatus(runs[configuration], time);
  const proposed = configuration === "proposed";
  const blocked = status.assembly === "blocked";
  const labels: SceneLabel[] = [
    { id: "A1", at: [layout.fixture[0], 2.15, 0], text: "A1 Assembly", detail: showStatus ? (blocked ? "Holding a part, no space" : "Assembling") : undefined, tone: showStatus && blocked ? "alert" : "default" },
    { id: "queue", at: [-2.6, 1.0, 0.05], text: `${status.waitingForInspection} waiting`, detail: "before inspection", tone: status.waitingForInspection >= 2 ? "accent" : "quiet" },
    { id: "I1", at: [0, 2.08, 0], text: "I1 Inspection", detail: showStatus ? (status.inspection.I1 === "inspecting" ? "Inspecting" : "Waiting for parts") : undefined },
    proposed
      ? { id: "I2", at: [0, 2.08, -2.2], text: "I2 Inspection, proposed", detail: showStatus ? (status.inspection.I2 === "inspecting" ? "Inspecting" : "Waiting for parts") : undefined, tone: "proposed" }
      : { id: "I2", at: [0, 0.05, -2.7], text: "Space for proposed I2", tone: "quiet", minor: true },
    { id: "P1", at: [5.4, 1.12, -0.1], text: "P1 Packaging", detail: showStatus ? `${status.packaged} packaged` : undefined },
    { id: "CD1", at: [layout.drive[0], focusDrive ? 0.86 : 0.5, layout.drive[1] + 0.3], text: "CD-1 Conveyor drive", tone: focusDrive ? "accent" : "quiet", minor: !focusDrive, place: focusDrive ? "above" : "below" },
  ];
  return showStatus ? labels : labels.filter((label) => label.id !== "queue" && label.id !== "I2");
}

export function CellCanvas({ configuration, clock, time, animating, view, instant, focusDrive = false, showStatus = false, onReady }: CellCanvasProps) {
  const layer = useId();
  const run = runs[configuration];
  const proposed = configuration === "proposed";
  const labels = cellLabels(configuration, time, showStatus, focusDrive);
  return (
    <div className={styles.sceneCanvas}>
      <Canvas
        flat
        shadows="percentage"
        dpr={[1, 2]}
        frameloop={animating ? "always" : "demand"}
        camera={{ fov: 30, near: 0.1, far: 80, position: [-4, 9, 12] }}
        onCreated={() => onReady?.()}
      >
        <color attach="background" args={[BACKGROUND]} />
        <hemisphereLight args={["#ffffff", "#d6d6d1", 1.45]} />
        <directionalLight
          position={[-3.5, 9, 6]}
          intensity={1.9}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-8}
          shadow-camera-right={8}
          shadow-camera-top={6}
          shadow-camera-bottom={-6}
          shadow-bias={-0.0004}
        />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -0.5]} material={material.floor} receiveShadow>
          <planeGeometry args={[40, 30]} />
        </mesh>
        <gridHelper args={[40, 80, "#d2d2ce", "#d2d2ce"]} position={[0, 0.001, -0.5]} />
        <FloorMarkings proposed={proposed} />
        <AssemblyStation />
        {proposed ? (
          <>
            <Conveyor from={[-4.85, 0]} to={[layout.head[0] - 0.25, 0]} />
            <Conveyor from={[layout.head[0] + 0.25, 0]} to={[layout.merge[0] - 0.25, 0]} />
            <Conveyor from={[layout.merge[0] + 0.25, 0]} to={[4.85, 0]} />
            <TransferUnit at={layout.head} />
            <TransferUnit at={layout.merge} />
            <TransferUnit at={layout.divert} />
            <TransferUnit at={layout.rejoin} />
            <Conveyor from={[layout.head[0], -0.25]} to={[layout.divert[0], layout.divert[1] + 0.25]} accent />
            <Conveyor from={[layout.divert[0] + 0.25, layout.divert[1]]} to={[layout.rejoin[0] - 0.25, layout.rejoin[1]]} accent />
            <Conveyor from={[layout.rejoin[0], layout.rejoin[1] + 0.25]} to={[layout.merge[0], -0.25]} accent />
            <InspectionBooth at={layout.booth.I2.center} proposed />
          </>
        ) : (
          <Conveyor from={[-4.85, 0]} to={[4.85, 0]} />
        )}
        <InspectionBooth at={layout.booth.I1.center} />
        <PackagingStation run={run} clock={clock} />
        <ConveyorDrive focused={focusDrive} />
        <SimulatedParts run={run} clock={clock} />
        <CameraRig view={view} instant={instant} />
        <LabelProjector labels={labels} layer={layer} />
        <Invalidate signal={`${configuration}-${time}-${view}-${focusDrive}`} />
      </Canvas>
      <LabelLayer labels={labels} layer={layer} />
    </div>
  );
}
