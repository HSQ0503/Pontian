"use client";

import { memo, useEffect, useId, useLayoutEffect, useMemo, useRef, type ReactNode, type RefObject } from "react";
import { Canvas, useFrame, useThree, type RootState } from "@react-three/fiber";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { bottleneckAt, busySharesAt, cellStatus, layout, runs, partPoses, simulation, type Configuration, type Point, type SimRun, type Stage } from "./manufacturing-model";
import styles from "./manufacturing.module.css";

const H = layout.conveyorHeight;
const BACKGROUND = "#eeeeec";

/* Geometry helpers ------------------------------------------------------- */

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

// A rounded-corner block with bevelled edges, standing on y = 0.
function slab(width: number, depth: number, radius: number, height: number, bevel: number) {
  const geometry = new THREE.ExtrudeGeometry(roundedRect(width - bevel * 2, depth - bevel * 2, Math.max(radius - bevel, 0.001)) as THREE.Shape, {
    depth: Math.max(height - bevel * 2, 0.0005), bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 10,
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, bevel, 0);
  return geometry;
}

function band(width: number, depth: number, radius: number, thickness: number) {
  const shape = roundedRect(width + thickness, depth + thickness, radius + thickness / 2) as THREE.Shape;
  shape.holes.push(roundedRect(width, depth, radius, new THREE.Path()));
  const geometry = new THREE.ShapeGeometry(shape, 10);
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

const lathe = (profile: [number, number][], segments = 32) => new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), segments);

// Soft-edged rectangle used as a contact shadow under equipment.
function contactTexture() {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.filter = "blur(14px)";
  context.fillStyle = "#000";
  context.fillRect(30, 30, 68, 68);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
const CONTACT = contactTexture();

/* Materials -------------------------------------------------------------- */

const satin = (color: string, roughness = 0.5, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const material = {
  housing: satin("#8a9399", 0.42),
  cover: satin("#a4acb1", 0.4),
  variantHousing: satin("#b3a88f", 0.44),
  variantCover: satin("#c1b69e", 0.42),
  gasket: satin("#1d2022", 0.75),
  gland: satin("#25282b", 0.48),
  port: satin("#0b0c0d", 0.9),
  plate: satin("#dfe2e4", 0.32, 0.25),
  print: satin("#62686d", 0.8),
  seat: satin("#3e4347", 0.5, 0.2),
  hole: satin("#0b0c0d", 0.95),
  screw: satin("#d4d8db", 0.26, 0.95),
  recess: satin("#2a2d30", 0.7),
  ink: satin("#2b2e31", 0.55, 0.1),
  aluminium: satin("#c5c9cc", 0.36, 0.7),
  groove: satin("#7e8489", 0.6, 0.3),
  zinc: satin("#bfc3c6", 0.3, 0.85),
  top: satin("#dcdcd9", 0.72),
  edge: satin("#3a3d40", 0.6),
  rubber: satin("#1b1d1f", 0.9),
  motor: satin("#7b8288", 0.42, 0.35),
  gearbox: satin("#5d6469", 0.45, 0.35),
  kraft: satin("#c6a77b", 0.9),
  tape: satin("#dcc59c", 0.6),
  timber: satin("#d3c8b2", 0.85),
  screen: satin("#f4f4f2", 0.4),
  poly: new THREE.MeshStandardMaterial({ color: "#dfe6ea", roughness: 0.12, metalness: 0, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }),
  diffuser: new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#ffffff", emissiveIntensity: 0.35, roughness: 0.6 }),
  proposed: satin("#007dfe", 0.45),
  selected: satin("#f1d85c", 0.45, 0.15),
  selectedDark: satin("#d9bd3a", 0.48, 0.2),
  grille: satin("#3b4044", 0.6, 0.2),
  marker: new THREE.MeshBasicMaterial({ color: "#fed603", side: THREE.DoubleSide, toneMapped: false }),
  outline: new THREE.LineBasicMaterial({ color: "#17191a", transparent: true, opacity: 0.55 }),
  queue: new THREE.MeshBasicMaterial({ color: "#f51625", transparent: true, opacity: 0.28, depthWrite: false, toneMapped: false }),
  alert: new THREE.MeshBasicMaterial({ color: "#f51625", toneMapped: false }),
};

function Contact({ x, z, width, depth, opacity = 0.3, y = 0.002 }: { x: number; z: number; width: number; depth: number; opacity?: number; y?: number }) {
  if (!CONTACT) return null;
  return (
    <mesh position={[x, y, z]} rotation={[-Math.PI / 2, 0, 0]} scale={[width * 1.9, depth * 1.9, 1]} renderOrder={1}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={CONTACT} color="#000" transparent opacity={opacity} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

/* Studio lighting -------------------------------------------------------- */

function applyStudio({ gl, scene }: RootState) {
  gl.toneMapping = THREE.NeutralToneMapping;
  gl.toneMappingExposure = 1;
  const generator = new THREE.PMREMGenerator(gl);
  scene.environment = generator.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.5;
  generator.dispose();
}

const ORIGIN: [number, number, number] = [0, 0, 0];

function Lights({ span, focus = ORIGIN }: { span: number; focus?: [number, number, number] }) {
  const [fx, fy, fz] = focus;
  const key: [number, number, number] = [fx - span * 0.55, fy + span * 1.1, fz + span * 0.75];
  const light = useRef<THREE.DirectionalLight>(null);
  const scene = useThree((state) => state.scene);
  useLayoutEffect(() => {
    const current = light.current;
    if (!current) return;
    current.target.position.set(fx, fy, fz);
    scene.add(current.target);
    return () => { scene.remove(current.target); };
  }, [scene, fx, fy, fz]);
  return (
    <>
      <hemisphereLight args={["#ffffff", "#d7d7d3", 0.5]} />
      <directionalLight
        ref={light}
        position={key}
        intensity={1.45}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-radius={5}
        shadow-intensity={0.5}
        shadow-bias={-0.0002}
        shadow-normalBias={0.015}
        shadow-camera-left={-span}
        shadow-camera-right={span}
        shadow-camera-top={span}
        shadow-camera-bottom={-span}
        shadow-camera-near={0.1}
        shadow-camera-far={span * 4}
      />
      <directionalLight position={[focus[0] + span * 0.9, focus[1] + span * 0.5, focus[2] + span * 0.4]} intensity={0.35} />
      <directionalLight position={[focus[0] + span * 0.2, focus[1] + span * 0.6, focus[2] - span]} intensity={0.55} />
    </>
  );
}

/* H-20 housing ----------------------------------------------------------- */

const HOUSING_TOP = 0.082;
const COVER_TOP = HOUSING_TOP + 0.022;
const FASTENER_SPOTS: Point[] = [[-0.135, 0.098], [0.135, 0.098], [0.135, -0.098], [-0.135, -0.098]];

const geometry = {
  body: slab(0.352, 0.272, 0.046, 0.082, 0.007),
  cover: slab(0.2, 0.142, 0.03, 0.022, 0.005),
  gasket: band(0.2, 0.142, 0.03, 0.007),
  nut: new THREE.CylinderGeometry(0.03, 0.03, 0.012, 6).translate(0, 0.006, 0),
  dome: lathe([[0, 0.022], [0.012, 0.021], [0.02, 0.016], [0.024, 0.008], [0.025, 0]], 28),
  port: new THREE.CircleGeometry(0.009, 20).rotateX(-Math.PI / 2),
  plate: slab(0.066, 0.034, 0.004, 0.0015, 0.0005),
  print: new THREE.PlaneGeometry(0.044, 0.003).rotateX(-Math.PI / 2),
  vent: new THREE.BoxGeometry(0.05, 0.005, 0.002),
  seat: new THREE.CircleGeometry(0.0195, 28).rotateX(-Math.PI / 2),
  hole: new THREE.CircleGeometry(0.0085, 20).rotateX(-Math.PI / 2),
  washer: new THREE.CylinderGeometry(0.0185, 0.0185, 0.0015, 28).translate(0, 0.00075, 0),
  screw: lathe([[0, 0.0085], [0.008, 0.0082], [0.0128, 0.0068], [0.0158, 0.0035], [0.0162, 0]], 28).translate(0, 0.0015, 0),
  recess: new THREE.BoxGeometry(0.014, 0.0012, 0.0028),
  ring: new THREE.RingGeometry(0.027, 0.034, 48).rotateX(-Math.PI / 2),
  outline: band(0.37, 0.29, 0.05, 0.012),
  roller: new THREE.CylinderGeometry(0.024, 0.024, 0.39, 16).rotateX(Math.PI / 2),
  bracket: new THREE.BoxGeometry(0.012, 0.05, 0.012),
  carton: slab(0.3, 0.24, 0.006, 0.18, 0.003),
  cartonTape: new THREE.BoxGeometry(0.3, 0.002, 0.05),
  inspectionPlate: slab(0.46, 0.38, 0.024, 0.012, 0.004),
};

type HousingProps = { variant?: boolean; fasteners?: number; missing?: number; detail?: "high" | "low"; ring?: number; outline?: boolean };

export function Housing({ variant = false, fasteners = 4, missing, detail = "low", ring, outline }: HousingProps) {
  const high = detail === "high";
  return (
    <group>
      <mesh geometry={geometry.body} material={variant ? material.variantHousing : material.housing} castShadow receiveShadow />
      <mesh geometry={geometry.gasket} material={material.gasket} position={[0, HOUSING_TOP + 0.0004, 0]} />
      <mesh geometry={geometry.cover} material={variant ? material.variantCover : material.cover} position={[0, HOUSING_TOP, 0]} castShadow receiveShadow />
      <group position={[-0.042, COVER_TOP, 0]}>
        <mesh geometry={geometry.nut} material={material.gland} castShadow />
        <mesh geometry={geometry.dome} material={material.gland} position={[0, 0.012, 0]} castShadow />
        <mesh geometry={geometry.port} material={material.port} position={[0, 0.0345, 0]} />
      </group>
      {high && (
        <group position={[0.05, COVER_TOP, 0]}>
          <mesh geometry={geometry.plate} material={material.plate} />
          <mesh geometry={geometry.print} material={material.print} position={[0, 0.0016, -0.007]} />
          <mesh geometry={geometry.print} material={material.print} position={[-0.006, 0.0016, 0.002]} scale={[0.72, 1, 1]} />
          <mesh geometry={geometry.print} material={material.print} position={[-0.01, 0.0016, 0.01]} scale={[0.55, 1, 1]} />
        </group>
      )}
      {high && [0.03, 0.042, 0.054].map((y) => <mesh key={y} geometry={geometry.vent} material={material.gasket} position={[-0.09, y, 0.1361]} />)}
      {FASTENER_SPOTS.map(([x, z], index) => (
        <group key={index} position={[x, HOUSING_TOP, z]}>
          <mesh geometry={geometry.seat} material={material.seat} position={[0, 0.0004, 0]} />
          <mesh geometry={geometry.hole} material={material.hole} position={[0, 0.0007, 0]} />
          <group name={`fastener-${index}`} visible={index < fasteners && index !== missing}>
            <mesh geometry={geometry.washer} material={material.screw} />
            <mesh geometry={geometry.screw} material={material.screw} castShadow />
            {high && (
              <>
                <mesh geometry={geometry.recess} material={material.recess} position={[0, 0.0099, 0]} />
                <mesh geometry={geometry.recess} material={material.recess} position={[0, 0.0099, 0]} rotation={[0, Math.PI / 2, 0]} />
              </>
            )}
          </group>
        </group>
      ))}
      {ring !== undefined && <mesh geometry={geometry.ring} material={material.marker} position={[FASTENER_SPOTS[ring][0], HOUSING_TOP + 0.016, FASTENER_SPOTS[ring][1]]} />}
      {outline && <mesh geometry={geometry.outline} material={material.marker} position={[0, 0.002, 0]} />}
    </group>
  );
}

/* HTML labels with leader lines ----------------------------------------- */

type Tone = "default" | "accent" | "proposed" | "alert" | "quiet";
type SceneLabel = { id: string; at: [number, number, number]; text: ReactNode; detail?: ReactNode; tone?: Tone; place?: "above" | "below"; leader?: number; minor?: boolean; brief?: boolean; side?: "left" | "right" };

const scratch = new THREE.Vector3();

// Each frame moves the label's anchor dot to its projected point; the chip
// slides sideways to stay inside the canvas while the leader keeps its anchor.
function LabelProjector({ labels, layer }: { labels: SceneLabel[]; layer: string }) {
  useFrame(({ camera, size }) => {
    for (const label of labels) {
      const element = document.getElementById(`${layer}-${label.id}`);
      if (!element) continue;
      scratch.set(...label.at).project(camera);
      const x = ((scratch.x + 1) / 2) * size.width;
      const y = ((1 - scratch.y) / 2) * size.height;
      const chip = element.firstElementChild as HTMLElement | null;
      const half = (chip?.offsetWidth ?? 0) / 2;
      const shift = Math.min(Math.max(x, half + 6), size.width - half - 6) - x;
      // In tall frames the cell runs top to bottom, so chips sit beside it.
      const portrait = size.width < size.height * 0.95 && label.side !== undefined;
      const leader = portrait ? 18 : label.leader ?? 22;
      const above = (label.place ?? "above") === "above";
      const flip = above ? y - leader - (chip?.offsetHeight ?? 0) < 4 : y + leader + (chip?.offsetHeight ?? 0) > size.height - 4;
      const width = chip?.offsetWidth ?? 0;
      const side = label.side === "left" ? (x - leader - width < 4 ? "right" : "left") : x + leader + width > size.width - 4 ? "left" : "right";
      element.dataset.place = portrait ? side : above !== flip ? "above" : "below";
      element.style.setProperty("--shift", `${portrait ? 0 : shift.toFixed(1)}px`);
      element.style.setProperty("--leader", `${leader}px`);
      element.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      element.style.visibility = scratch.z < 1 && x > 0 && x < size.width && y > 0 && y < size.height ? "visible" : "hidden";
    }
  });
  return null;
}

function LabelLayer({ labels, layer }: { labels: SceneLabel[]; layer: string }) {
  return (
    <div className={styles.sceneLabels} aria-hidden="true">
      {labels.map((label) => (
        <span key={label.id} id={`${layer}-${label.id}`} className={`${styles.sceneLabel} ${label.minor ? styles.sceneLabelMinor : ""} ${label.brief ? styles.sceneLabelBrief : ""}`} data-tone={label.tone ?? "default"}>
          <span className={styles.chip}>
            <strong>{label.text}</strong>
            {label.detail && <span>{label.detail}</span>}
          </span>
          <i className={styles.leader} />
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
const MISSING_INDEX = 2;

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
  const labels: SceneLabel[] = [{ id: "reference", at: [referenceX, 0, 0.2], text: "Approved reference", detail: "Required: four fasteners", place: "below", leader: 10, tone: "quiet" }];
  if (sample === "reference") {
    FASTENER_SPOTS.forEach(([x, z], index) => labels.push({ id: `n${index}`, at: [x, HOUSING_TOP + 0.012, z], text: String(index + 1), tone: "quiet", leader: 18, place: z > 0 ? "below" : "above" }));
    return labels;
  }
  labels.push({ id: "sample", at: [sampleX, 0, 0.2], text: "Inspection sample", detail: sample === "variation" ? "Allowed variation" : undefined, place: "below", leader: 10, tone: "quiet" });
  const [x, z] = FASTENER_SPOTS[MISSING_INDEX];
  if (sample === "missing" && showFinding) labels.push({ id: "expected", at: [sampleX + x, HOUSING_TOP + 0.016, z], text: "Fastener 3 expected here", tone: "accent", leader: 26 });
  if (sample === "variation" && showFinding) labels.push({ id: "shade", at: [sampleX, COVER_TOP, -0.13], text: "Shade within the approved range", tone: "accent", leader: 26 });
  return labels;
}

function InspectionStation({ x, children }: { x: number; children: ReactNode }) {
  return (
    <group position={[x, 0, 0]}>
      <mesh geometry={geometry.inspectionPlate} material={material.screen} position={[0, -0.012, 0]} receiveShadow castShadow />
      <Contact x={0} z={0} width={0.4} depth={0.32} opacity={0.22} y={-0.0115} />
      {children}
    </group>
  );
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
        shadows="percentage"
        dpr={[1, 2]}
        frameloop="demand"
        camera={{ position: [0, 1.25, 1.1], zoom: 600, near: 0.01, far: 10 }}
        gl={{ antialias: true }}
        onCreated={(state) => { applyStudio(state); state.camera.lookAt(0, 0.03, 0.02); onReady?.(); }}
      >
        <color attach="background" args={[BACKGROUND]} />
        <Lights span={0.8} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.0125, 0]} receiveShadow>
          <planeGeometry args={[6, 6]} />
          <meshStandardMaterial color={BACKGROUND} roughness={1} />
        </mesh>
        <InspectionStation x={referenceX}>
          <Housing detail="high" ring={sample === "missing" && showFinding ? MISSING_INDEX : undefined} outline={sample === "variation" && showFinding} />
        </InspectionStation>
        {pair && (
          <InspectionStation x={sampleX}>
            <Housing
              detail="high"
              variant={sample === "variation"}
              missing={sample === "missing" ? MISSING_INDEX : undefined}
              ring={sample === "missing" && showFinding ? MISSING_INDEX : undefined}
              outline={sample === "variation" && showFinding}
            />
          </InspectionStation>
        )}
        <FitOrthographic width={pair ? 1.06 : 0.66} height={0.6} />
        <LabelProjector labels={labels} layer={layer} />
        <Invalidate signal={`${sample}-${showFinding}`} />
      </Canvas>
      <LabelLayer labels={labels} layer={layer} />
    </div>
  );
}

/* Production cell: shared structural parts ------------------------------- */

function Box({ size, position, mat, rotation, cast = true }: { size: [number, number, number]; position: [number, number, number]; mat: THREE.Material; rotation?: [number, number, number]; cast?: boolean }) {
  const [width, height, depth] = size;
  const geometry = useMemo(() => new RoundedBoxGeometry(width, height, depth, 2, Math.min(0.012, Math.min(width, height, depth) / 3)), [width, height, depth]);
  return <mesh geometry={geometry} position={position} rotation={rotation} material={mat} castShadow={cast} receiveShadow />;
}

// Slotted aluminium extrusion: a square profile with a darker groove on each visible face.
function Extrusion({ from, to, size = 0.04 }: { from: [number, number, number]; to: [number, number, number]; size?: number }) {
  const start = new THREE.Vector3(...from);
  const end = new THREE.Vector3(...to);
  const length = start.distanceTo(end);
  const middle = start.clone().add(end).multiplyScalar(0.5);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().sub(start).normalize());
  return (
    <group position={middle} quaternion={quaternion}>
      <mesh material={material.aluminium} castShadow receiveShadow><boxGeometry args={[size, length, size]} /></mesh>
      <mesh material={material.groove} position={[0, 0, size / 2 + 0.0005]}><boxGeometry args={[size * 0.22, length * 0.98, 0.001]} /></mesh>
      <mesh material={material.groove} position={[size / 2 + 0.0005, 0, 0]}><boxGeometry args={[0.001, length * 0.98, size * 0.22]} /></mesh>
      <mesh material={material.groove} position={[-size / 2 - 0.0005, 0, 0]}><boxGeometry args={[0.001, length * 0.98, size * 0.22]} /></mesh>
      <mesh material={material.groove} position={[0, 0, -size / 2 - 0.0005]}><boxGeometry args={[size * 0.22, length * 0.98, 0.001]} /></mesh>
    </group>
  );
}

function Foot({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh material={material.rubber} position={[0, 0.006, 0]} receiveShadow><cylinderGeometry args={[0.032, 0.035, 0.012, 20]} /></mesh>
      <mesh material={material.zinc} position={[0, 0.022, 0]}><cylinderGeometry args={[0.008, 0.008, 0.022, 10]} /></mesh>
    </group>
  );
}

// A workbench on an extrusion frame with a phenolic top and a lower shelf.
function Bench({ x, z, width, depth, top = H - 0.006 }: { x: number; z: number; width: number; depth: number; top?: number }) {
  const legs: [number, number][] = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
  const lx = width / 2 - 0.04;
  const lz = depth / 2 - 0.04;
  return (
    <group position={[x, 0, z]}>
      <mesh geometry={slab(width, depth, 0.012, 0.028, 0.004)} material={material.top} position={[0, top - 0.028, 0]} castShadow receiveShadow />
      <Box size={[width - 0.02, 0.006, 0.003]} position={[0, top - 0.014, depth / 2 + 0.0005]} mat={material.edge} cast={false} />
      {legs.map(([sx, sz]) => (
        <group key={`${sx}${sz}`}>
          <Extrusion from={[sx * lx, 0.034, sz * lz]} to={[sx * lx, top - 0.028, sz * lz]} />
          <Foot x={sx * lx} z={sz * lz} />
        </group>
      ))}
      <Extrusion from={[-lx, top - 0.05, lz]} to={[lx, top - 0.05, lz]} />
      <Extrusion from={[-lx, top - 0.05, -lz]} to={[lx, top - 0.05, -lz]} />
      <Extrusion from={[-lx, 0.16, lz]} to={[lx, 0.16, lz]} />
      <Extrusion from={[-lx, 0.16, -lz]} to={[lx, 0.16, -lz]} />
      <mesh geometry={slab(width - 0.12, depth - 0.1, 0.008, 0.016, 0.003)} material={material.top} position={[0, 0.18, 0]} castShadow receiveShadow />
      <Contact x={0} z={0} width={width} depth={depth} opacity={0.26} />
    </group>
  );
}

/* Conveyor -------------------------------------------------------------- */

const Conveyor = memo(function Conveyor({ from, to, accent = false, guides = true }: { from: Point; to: Point; accent?: boolean; guides?: boolean }) {
  const [ax, az] = from;
  const [bx, bz] = to;
  const length = Math.hypot(bx - ax, bz - az);
  const angle = Math.atan2(-(bz - az), bx - ax);
  const count = Math.max(1, Math.floor(length / 0.1));
  const brackets = Math.max(2, Math.round(length / 0.7) + 1);
  const rollers = useRef<THREE.InstancedMesh>(null);
  const posts = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const matrix = new THREE.Matrix4();
    const rollerMesh = rollers.current;
    if (rollerMesh) {
      for (let index = 0; index < count; index++) rollerMesh.setMatrixAt(index, matrix.makeTranslation(-length / 2 + ((index + 0.5) * length) / count, 0, 0));
      rollerMesh.instanceMatrix.needsUpdate = true;
    }
    const postMesh = posts.current;
    if (postMesh) {
      for (let index = 0; index < brackets * 2; index++) {
        const along = -length / 2 + 0.06 + (Math.floor(index / 2) * (length - 0.12)) / (brackets - 1);
        postMesh.setMatrixAt(index, matrix.makeTranslation(along, 0.047, index % 2 ? 0.205 : -0.205));
      }
      postMesh.instanceMatrix.needsUpdate = true;
    }
  }, [count, length, brackets]);
  const legs = Math.max(2, Math.round(length / 1.5) + 1);
  const legPositions = Array.from({ length: legs }, (_, index) => -length / 2 + 0.1 + (index * (length - 0.2)) / (legs - 1));
  const frame = accent ? material.proposed : material.ink;
  return (
    <group position={[(ax + bx) / 2, H - 0.026, (az + bz) / 2]} rotation={[0, angle, 0]}>
      <instancedMesh ref={rollers} args={[geometry.roller, material.zinc, count]} castShadow receiveShadow />
      {[-1, 1].map((side) => (
        <group key={side} position={[0, 0, side * 0.213]}>
          <Box size={[length, 0.085, 0.006]} position={[0, -0.005, side * 0.006]} mat={frame} />
          <Box size={[length, 0.006, 0.026]} position={[0, 0.035, -side * 0.006]} mat={frame} />
          <Box size={[length, 0.006, 0.026]} position={[0, -0.045, -side * 0.006]} mat={frame} />
        </group>
      ))}
      {guides && (
        <>
          <instancedMesh ref={posts} args={[geometry.bracket, material.zinc, brackets * 2]} castShadow />
          {[-0.205, 0.205].map((z) => (
            <mesh key={z} position={[0, 0.07, z]} rotation={[0, 0, Math.PI / 2]} material={material.aluminium} castShadow>
              <cylinderGeometry args={[0.007, 0.007, length - 0.04, 10]} />
            </mesh>
          ))}
        </>
      )}
      {legPositions.map((x) => (
        <group key={x} position={[x, -(H - 0.026), 0]}>
          {[-0.19, 0.19].map((z) => (
            <group key={z}>
              <Box size={[0.04, H - 0.09, 0.04]} position={[0, (H - 0.09) / 2 + 0.034, z]} mat={material.ink} />
              <Foot x={0} z={z} />
            </group>
          ))}
          <Box size={[0.03, 0.03, 0.38]} position={[0, 0.2, 0]} mat={material.ink} />
        </group>
      ))}
      <Contact x={0} z={0} width={length} depth={0.42} opacity={0.18} y={-(H - 0.026) + 0.002} />
    </group>
  );
});

function TransferUnit({ at }: { at: Point }) {
  return (
    <group position={[at[0], 0, at[1]]}>
      <mesh geometry={slab(0.5, 0.5, 0.02, 0.06, 0.006)} material={material.ink} position={[0, H - 0.066, 0]} castShadow receiveShadow />
      {[-0.12, 0, 0.12].map((offset) => <Box key={offset} size={[0.44, 0.006, 0.03]} position={[0, H - 0.003, offset]} mat={material.proposed} />)}
      <Box size={[0.07, H - 0.1, 0.07]} position={[0, (H - 0.1) / 2 + 0.034, 0]} mat={material.ink} />
      <Foot x={0} z={0} />
      <Contact x={0} z={0} width={0.5} depth={0.5} opacity={0.2} />
    </group>
  );
}

/* Stations ---------------------------------------------------------------- */

function Cable({ points, radius = 0.006 }: { points: [number, number, number][]; radius?: number }) {
  const curve = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)));
  return <mesh material={material.rubber} castShadow><tubeGeometry args={[curve, 48, radius, 8, false]} /></mesh>;
}

const AssemblyStation = memo(function AssemblyStation() {
  const [x] = layout.fixture;
  const benchX = x - 0.075;
  const post: [number, number] = [x - 0.48, -0.38];
  return (
    <group>
      <Bench x={benchX} z={0} width={1.05} depth={0.95} />
      <mesh geometry={slab(0.44, 0.34, 0.01, 0.012, 0.003)} material={material.ink} position={[x, H - 0.012, 0]} receiveShadow castShadow />
      {[[-0.2, -0.155], [0.2, -0.155], [-0.2, 0.155], [0.2, 0.155]].map(([dx, dz]) => (
        <mesh key={`${dx}${dz}`} material={material.zinc} position={[x + dx, H + 0.012, dz]} castShadow><cylinderGeometry args={[0.007, 0.009, 0.024, 12]} /></mesh>
      ))}
      <group position={[x, H, -0.215]}>
        <Box size={[0.07, 0.03, 0.04]} position={[0, 0.015, 0]} mat={material.ink} />
        <Box size={[0.02, 0.012, 0.14]} position={[0, 0.05, 0.03]} rotation={[0.45, 0, 0]} mat={material.zinc} />
        <mesh material={material.rubber} position={[0, 0.082, 0.085]} rotation={[0.45, 0, 0]} castShadow><cylinderGeometry args={[0.012, 0.012, 0.05, 12]} /></mesh>
      </group>
      <group position={[x - 0.43, H, 0.27]}>
        {[[0, 0.005, 0, 0.3, 0.01, 0.24], [0, 0.06, 0.12, 0.3, 0.12, 0.008], [0, 0.06, -0.12, 0.3, 0.12, 0.008], [0.15, 0.06, 0, 0.008, 0.12, 0.24], [-0.15, 0.06, 0, 0.008, 0.12, 0.24]].map(([px, py, pz, sx, sy, sz]) => (
          <Box key={`${px}${py}${pz}`} size={[sx, sy, sz]} position={[px, py, pz]} mat={material.ink} />
        ))}
        <group position={[0, 0.012, 0]} scale={0.62}><Housing fasteners={0} /></group>
        <group position={[0.02, 0.07, 0.02]} rotation={[0.35, 0.2, 0]} scale={0.62}><Housing fasteners={0} /></group>
      </group>
      <group position={[x - 0.43, H, -0.27]}>
        <mesh geometry={slab(0.22, 0.16, 0.012, 0.05, 0.004)} material={material.ink} castShadow />
        <Box size={[0.12, 0.004, 0.08]} position={[0, 0.051, 0.01]} mat={material.zinc} cast={false} />
      </group>
      <Extrusion from={[post[0], H, post[1]]} to={[post[0], 2.05, post[1]]} />
      <Extrusion from={[post[0], 2.0, post[1]]} to={[x, 2.0, 0]} size={0.034} />
      <mesh material={material.ink} position={[x, 1.93, 0]} castShadow><cylinderGeometry args={[0.032, 0.032, 0.09, 20]} /></mesh>
      <mesh material={material.zinc} position={[x, 1.68, 0]}><cylinderGeometry args={[0.0025, 0.0025, 0.42, 6]} /></mesh>
      <group position={[x, 1.33, 0]}>
        <mesh geometry={lathe([[0, 0.17], [0.022, 0.168], [0.026, 0.15], [0.026, 0.06], [0.02, 0.05], [0.018, 0.0], [0, 0]], 24)} material={material.ink} castShadow />
        <mesh material={material.zinc} position={[0, -0.03, 0]}><cylinderGeometry args={[0.004, 0.006, 0.06, 8]} /></mesh>
      </group>
      <group position={[post[0] + 0.025, 1.46, post[1] + 0.03]} rotation={[0, 0.55, 0]}>
        <Box size={[0.3, 0.2, 0.018]} position={[0.15, 0, 0]} mat={material.ink} />
        <Box size={[0.27, 0.17, 0.002]} position={[0.15, 0, 0.0095]} mat={material.screen} cast={false} />
        {[0.05, 0.02, -0.01, -0.04].map((y, index) => <Box key={y} size={[index === 0 ? 0.16 : 0.2 - index * 0.03, 0.008, 0.001]} position={[0.1 + (index === 0 ? -0.01 : 0), y, 0.011]} mat={material.print} cast={false} />)}
      </group>
      <Cable points={[[x, 1.88, 0], [x - 0.1, 1.95, -0.1], [post[0] + 0.02, 1.9, post[1] + 0.03], [post[0] + 0.03, 1.2, post[1] + 0.03], [post[0] + 0.03, H + 0.02, post[1] + 0.03]]} radius={0.005} />
    </group>
  );
});

function InspectionBooth({ at, proposed = false }: { at: Point; proposed?: boolean }) {
  const [x, z] = at;
  const top = 1.95;
  const corners: [number, number][] = [[-0.68, -0.42], [0.68, -0.42], [-0.68, 0.42], [0.68, 0.42]];
  return (
    <group position={[x, 0, z]}>
      {corners.map(([dx, dz]) => (
        <group key={`${dx}${dz}`}>
          <Extrusion from={[dx, 0.012, dz]} to={[dx, top, dz]} />
          <Box size={[0.1, 0.012, 0.1]} position={[dx, 0.006, dz]} mat={material.ink} />
        </group>
      ))}
      {[-0.42, 0.42].map((dz) => <Extrusion key={dz} from={[-0.68, top, dz]} to={[0.68, top, dz]} />)}
      {[-0.68, 0.68].map((dx) => <Extrusion key={dx} from={[dx, top, -0.42]} to={[dx, top, 0.42]} />)}
      {[-0.68, 0.68].map((dx) => <Extrusion key={dx} from={[dx, 1.02, -0.42]} to={[dx, 1.02, 0.42]} size={0.034} />)}
      <Extrusion from={[0, top - 0.035, -0.42]} to={[0, top - 0.035, 0.42]} size={0.034} />
      {proposed && [-0.42, 0.42].map((dz) => <Box key={dz} size={[1.3, 0.012, 0.042]} position={[0, top + 0.026, dz]} mat={material.proposed} cast={false} />)}
      <mesh position={[0, 1.48, -0.42]} material={material.poly}><planeGeometry args={[1.32, 0.9]} /></mesh>
      {[-0.68, 0.68].map((dx) => <mesh key={dx} position={[dx, 1.48, 0]} rotation={[0, Math.PI / 2, 0]} material={material.poly}><planeGeometry args={[0.8, 0.9]} /></mesh>)}
      <group position={[0, top - 0.06, 0]}>
        <mesh geometry={slab(0.1, 0.09, 0.012, 0.158, 0.006)} material={material.ink} position={[0, -0.15, 0]} castShadow />
        <mesh geometry={lathe([[0.034, 0], [0.034, 0.05], [0.03, 0.06], [0.0, 0.06]], 28)} material={material.ink} position={[0, -0.15, 0]} rotation={[Math.PI, 0, 0]} castShadow />
        <mesh material={material.ink} position={[0, -0.164, 0]} castShadow><cylinderGeometry args={[0.14, 0.14, 0.008, 40]} /></mesh>
        <mesh material={material.port} position={[0, -0.27, 0]} rotation={[Math.PI / 2, 0, 0]}><circleGeometry args={[0.022, 24]} /></mesh>
        {[0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].map((angle) => (
          <mesh key={angle} material={material.zinc} position={[Math.cos(angle) * 0.13, -0.257, Math.sin(angle) * 0.13]}><cylinderGeometry args={[0.004, 0.004, 0.186, 6]} /></mesh>
        ))}
        <mesh material={material.ink} position={[0, -0.35, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow><torusGeometry args={[0.13, 0.016, 12, 48]} /></mesh>
        <mesh material={material.diffuser} position={[0, -0.366, 0]} rotation={[Math.PI / 2, 0, 0]}><ringGeometry args={[0.1, 0.145, 48]} /></mesh>
      </group>
      <Cable points={[[0.05, top - 0.14, 0], [0.3, top - 0.02, 0.05], [0.66, top - 0.06, 0.4], [0.66, 1.2, 0.4], [0.66, 0.1, 0.4]]} radius={0.005} />
      <Contact x={0} z={0} width={1.45} depth={0.95} opacity={0.12} />
    </group>
  );
}

const PackagingStation = memo(function PackagingStation({ run, clock }: { run: SimRun; clock: RefObject<number> }) {
  const cartons = useRef<THREE.InstancedMesh>(null);
  const tapes = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const matrix = new THREE.Matrix4();
    for (let index = 0; index < 36; index++) {
      const layer = Math.floor(index / 9);
      const column = index % 3;
      const row = Math.floor(index / 3) % 3;
      const position: [number, number, number] = [(column - 1) * 0.31, 0.118 + layer * 0.182, (row - 1) * 0.25];
      cartons.current?.setMatrixAt(index, matrix.makeTranslation(...position));
      tapes.current?.setMatrixAt(index, matrix.makeTranslation(position[0], position[1] + 0.181, position[2]));
    }
    if (cartons.current) cartons.current.instanceMatrix.needsUpdate = true;
    if (tapes.current) tapes.current.instanceMatrix.needsUpdate = true;
  }, []);
  useFrame(() => {
    const count = Math.min(36, run.parts.filter((part) => part.packEnd <= clock.current).length);
    if (cartons.current) cartons.current.count = count;
    if (tapes.current) tapes.current.count = count;
  });
  const [cx] = layout.carton;
  const flap = (key: string, position: [number, number, number], rotation: [number, number, number], size: [number, number, number]) => <Box key={key} size={size} position={position} rotation={rotation} mat={material.kraft} />;
  return (
    <group>
      <Bench x={5.4} z={0} width={0.9} depth={0.95} />
      <group position={[cx, H, 0]}>
        <Box size={[0.42, 0.006, 0.34]} position={[0, 0.003, 0]} mat={material.kraft} />
        {[[0, 0.17, 0.42, 0.006], [0, -0.17, 0.42, 0.006], [0.21, 0, 0.006, 0.34]].map(([dx, dz, w, d]) => (
          <Box key={`${dx}${dz}`} size={[w, 0.17, d]} position={[dx, 0.085, dz]} mat={material.kraft} />
        ))}
        {flap("f1", [0, 0.2, 0.215], [-0.75, 0, 0], [0.42, 0.006, 0.11])}
        {flap("f2", [0, 0.2, -0.215], [0.75, 0, 0], [0.42, 0.006, 0.11])}
        {flap("f3", [0.25, 0.19, 0], [0, 0, 0.9], [0.1, 0.006, 0.34])}
        {flap("f4", [-0.295, 0.004, 0], [0, 0, 0], [0.17, 0.006, 0.34])}
      </group>
      <group position={[5.66, H, -0.33]}>
        <Box size={[0.36, 0.05, 0.24]} position={[0, 0.025, 0]} mat={material.kraft} />
        <Box size={[0.36, 0.002, 0.004]} position={[0, 0.051, 0.04]} mat={material.tape} cast={false} />
        <mesh material={material.ink} position={[-0.02, 0.09, 0.02]} castShadow><boxGeometry args={[0.12, 0.03, 0.05]} /></mesh>
        <mesh material={material.tape} position={[-0.02, 0.12, 0.02]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.035, 0.035, 0.045, 24]} /></mesh>
      </group>
      <group position={[5.45, 0, 1.25]}>
        {[-0.45, 0, 0.45].map((dx) => [-0.35, 0, 0.35].map((dz) => <Box key={`${dx}${dz}`} size={[0.1, 0.085, 0.1]} position={[dx, 0.055, dz]} mat={material.timber} />))}
        {[-0.35, 0, 0.35].map((dz) => <Box key={dz} size={[1.0, 0.012, 0.1]} position={[0, 0.006, dz]} mat={material.timber} />)}
        {[-0.35, -0.175, 0, 0.175, 0.35].map((dz) => <Box key={dz} size={[1.0, 0.02, 0.1]} position={[0, 0.107, dz]} mat={material.timber} />)}
        <instancedMesh ref={cartons} args={[geometry.carton, material.kraft, 36]} castShadow receiveShadow />
        <instancedMesh ref={tapes} args={[geometry.cartonTape, material.tape, 36]} />
        <Contact x={0} z={0} width={1.0} depth={0.82} opacity={0.3} />
      </group>
    </group>
  );
});

function ConveyorDrive({ selected }: { selected: boolean }) {
  const [x] = layout.drive;
  const body = selected ? material.selected : material.motor;
  const housing = selected ? material.selectedDark : material.gearbox;
  const gearbox = slab(0.2, 0.2, 0.035, 0.15, 0.01);
  const fins: [number, number][] = [[0, 0], [0.084, 0]];
  for (let step = 0; step < 11; step++) fins.push([0.084, 0.02 + step * 0.024], [0.093, 0.024 + step * 0.024], [0.093, 0.032 + step * 0.024], [0.084, 0.036 + step * 0.024]);
  fins.push([0.084, 0.3], [0, 0.3]);
  return (
    <group position={[x, H - 0.13, 0.222]}>
      <mesh geometry={slab(0.3, 0.26, 0.02, 0.012, 0.003)} material={material.ink} rotation={[Math.PI / 2, 0, 0]} castShadow />
      {[[-0.12, 0.1], [0.12, 0.1], [-0.12, -0.1], [0.12, -0.1]].map(([bx, by]) => (
        <mesh key={`${bx}${by}`} material={material.zinc} position={[bx, by, 0.016]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.009, 0.009, 0.008, 6]} /></mesh>
      ))}
      <mesh geometry={gearbox} material={housing} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.012]} castShadow receiveShadow />
      <group position={[0, -0.01, 0.162]} rotation={[Math.PI / 2, 0, 0]}>
        <mesh geometry={lathe(fins, 40)} material={body} castShadow receiveShadow />
        <mesh geometry={lathe([[0.088, 0], [0.09, 0.03], [0.082, 0.06], [0.05, 0.075], [0, 0.078]], 40)} material={housing} position={[0, 0.3, 0]} castShadow />
        {[0.022, 0.034, 0.046, 0.058, 0.07].map((radius) => <mesh key={radius} material={material.grille} position={[0, 0.3785, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[radius - 0.0022, radius, 48]} /></mesh>)}
        <mesh material={material.grille} position={[0, 0.379, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.012, 24]} /></mesh>
      </group>
      <group position={[0, 0.08, 0.3]}>
        <mesh geometry={slab(0.11, 0.12, 0.012, 0.055, 0.005)} material={housing} castShadow />
        <mesh material={material.rubber} position={[0.075, 0.03, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.012, 0.014, 0.03, 12]} /></mesh>
      </group>
      <mesh geometry={slab(0.07, 0.045, 0.004, 0.002, 0.0006)} material={material.plate} position={[0.1, 0, 0.087]} rotation={[0, 0, -Math.PI / 2]} />
      <mesh material={material.ink} position={[0.106, 0.05, 0.04]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.015, 0.015, 0.012, 16]} /></mesh>
      <Cable points={[[0.09, 0.11, 0.3], [0.2, 0.1, 0.31], [0.24, 0, 0.3], [0.25, -0.3, 0.26], [0.26, -0.6, 0.22], [0.36, -0.664, 0.18]]} />
      <Cable points={[[0.112, 0.05, 0.04], [0.14, 0.07, 0.12], [0.12, 0.1, 0.24], [0.055, 0.105, 0.27]]} radius={0.003} />
      {selected && (
        <>
          <lineSegments material={material.outline} position={[0, 0, 0.012]} rotation={[Math.PI / 2, 0, 0]}><edgesGeometry args={[gearbox, 30]} /></lineSegments>
          <lineSegments material={material.outline} position={[0, -0.01, 0.162]} rotation={[Math.PI / 2, 0, 0]}><edgesGeometry args={[new THREE.CylinderGeometry(0.093, 0.093, 0.3, 40, 1, true).translate(0, 0.15, 0), 30]} /></lineSegments>
        </>
      )}
    </group>
  );
}

/* Floor, line equipment, parts ------------------------------------------ */

// Today's line sits just behind the proposed loop, close enough that both
// bottlenecks and the queue fill one frame.
const TODAY_Z = -3.65;
const QUEUE_FRONT = -0.74;
const RING = new THREE.RingGeometry(0.78, 1.02, 96).rotateX(-Math.PI / 2);

const Ground = memo(function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -2]} receiveShadow>
      <planeGeometry args={[90, 70]} />
      <shadowMaterial transparent opacity={0.14} depthWrite={false} />
    </mesh>
  );
});

const LineEquipment = memo(function LineEquipment({ proposed, drive = false }: { proposed: boolean; drive?: boolean }) {
  return (
    <>
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
      {drive && <ConveyorDrive selected />}
    </>
  );
});

const SimulatedParts = memo(function SimulatedParts({ run, clock }: { run: SimRun; clock: RefObject<number> }) {
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
});

// A red lane under the parts standing still before inspection. Its length
// follows the waiting count, one part spacing per housing.
function QueueLane({ run, clock }: { run: SimRun; clock: RefObject<number> }) {
  const fill = useRef<THREE.Mesh>(null);
  const edge = useRef<THREE.Mesh>(null);
  const length = useRef(0);
  useFrame(({ invalidate }, delta) => {
    const target = Math.min(cellStatus(run, clock.current).waitingForInspection, 7) * simulation.spacing;
    length.current += (target - length.current) * (1 - Math.exp(-Math.min(delta, 0.1) * 10));
    if (Math.abs(target - length.current) < 0.002) length.current = target;
    else invalidate();
    const visible = length.current > 0.01;
    if (fill.current) {
      fill.current.visible = visible;
      fill.current.scale.x = Math.max(length.current, 0.001);
      fill.current.position.x = QUEUE_FRONT - length.current / 2;
    }
    if (edge.current) {
      edge.current.visible = visible;
      edge.current.position.x = QUEUE_FRONT - length.current;
    }
  });
  return (
    <>
      <mesh ref={fill} material={material.queue} rotation={[-Math.PI / 2, 0, 0]} position={[QUEUE_FRONT, 0.004, 0]} visible={false}><planeGeometry args={[1, 0.96]} /></mesh>
      <mesh ref={edge} material={material.alert} rotation={[-Math.PI / 2, 0, 0]} position={[QUEUE_FRONT, 0.005, 0]} visible={false}><planeGeometry args={[0.04, 0.96]} /></mesh>
    </>
  );
}

const RING_SPOTS: Record<Stage, { x: number; z: number; sx: number; sz: number }> = {
  assembly: { x: layout.fixture[0] - 0.075, z: 0, sx: 0.88, sz: 0.74 },
  inspection: { x: 0, z: 0, sx: 1.08, sz: 0.76 },
  packaging: { x: 5.4, z: 0, sx: 0.78, sz: 0.74 },
};

// A red floor ring around the stage limiting the line at the current time.
function BottleneckRing({ run, clock }: { run: SimRun; clock: RefObject<number> }) {
  const ring = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const mesh = ring.current;
    if (!mesh) return;
    const stage = bottleneckAt(run, clock.current);
    mesh.visible = stage !== null;
    if (!stage) return;
    const spot = RING_SPOTS[stage];
    mesh.position.set(spot.x, 0.006, spot.z);
    mesh.scale.set(spot.sx, 1, spot.sz);
  });
  return <mesh ref={ring} geometry={RING} material={material.alert} visible={false} />;
}

/* Camera ----------------------------------------------------------------- */

export type CellView = "cell" | "drive";
type ViewName = CellView | "compare";
type ViewPreset = { target: [number, number, number]; direction: [number, number, number]; bounds: [[number, number, number], [number, number, number]] };

const views: Record<ViewName, { wide: ViewPreset; tall: ViewPreset }> = {
  cell: {
    wide: { target: [0, 0.6, -0.45], direction: [-0.08, 1.3, 1], bounds: [[-5.95, 0, -0.7], [5.95, 1.95, 1.68]] },
    tall: { target: [0, 0.6, -0.2], direction: [0.6, 2.3, 0], bounds: [[-5.95, 0, -0.7], [5.95, 1.95, 1.68]] },
  },
  drive: {
    wide: { target: [4.5, 0.62, 0.38], direction: [0.62, 0.42, 1], bounds: [[4.05, 0.32, 0.0], [4.95, 0.98, 0.85]] },
    tall: { target: [4.5, 0.62, 0.38], direction: [0.62, 0.55, 1], bounds: [[4.15, 0.32, 0.05], [4.85, 0.95, 0.8]] },
  },
  compare: {
    wide: { target: [-2.05, 0.42, -1.72], direction: [0.16, 1.9, 0.58], bounds: [[-6.2, 0, TODAY_Z - 0.48], [2.05, 1.42, 0.46]] },
    tall: { target: [-2.15, 0.4, -1.78], direction: [0.95, 2.2, 0.02], bounds: [[-6.15, 0, TODAY_Z - 0.42], [1.85, 1.55, 0.42]] },
  },
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
    distance = Math.max(distance, depth + (Math.abs(relative.dot(right)) * 1.03) / horizontal, depth + (Math.abs(relative.dot(up)) * 1.06) / vertical);
  }
  return { position: target.clone().add(direction.multiplyScalar(distance)), target };
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const TRANSITION_MS = 1100;

// Moves between framed viewpoints with an eased tween; resizes re-fit instantly.
function CameraRig({ view, instant }: { view: ViewName; instant: boolean }) {
  const pose = useRef<{ target: THREE.Vector3; position: THREE.Vector3 } | null>(null);
  const tween = useRef<{ view: ViewName; start: number; from: { target: THREE.Vector3; position: THREE.Vector3 } } | null>(null);
  useFrame(({ camera, size, invalidate }) => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    const aspect = size.width / size.height;
    const goal = fitCamera(aspect < 0.95 ? views[view].tall : views[view].wide, camera.fov, aspect);
    const now = performance.now();
    if (!pose.current) pose.current = { target: goal.target.clone(), position: goal.position.clone() };
    else if (!instant && (!tween.current || tween.current.view !== view) && pose.current.position.distanceTo(goal.position) > 0.05) {
      tween.current = { view, start: now, from: { target: pose.current.target.clone(), position: pose.current.position.clone() } };
    }
    const active = tween.current && tween.current.view === view ? tween.current : null;
    const progress = active && !instant ? Math.min(1, (now - active.start) / TRANSITION_MS) : 1;
    if (active && progress < 1) {
      const amount = ease(progress);
      pose.current.position.lerpVectors(active.from.position, goal.position, amount);
      pose.current.target.lerpVectors(active.from.target, goal.target, amount);
      invalidate();
    } else {
      pose.current.position.copy(goal.position);
      pose.current.target.copy(goal.target);
    }
    camera.position.copy(pose.current.position);
    camera.lookAt(pose.current.target);
  });
  return null;
}

function Stage3D({ children, frameloop, onReady, span, focus }: { children: ReactNode; frameloop: "always" | "demand" | "never"; onReady?: () => void; span: number; focus: [number, number, number] }) {
  return (
    <Canvas
      shadows="percentage"
      dpr={[1, 2]}
      frameloop={frameloop}
      camera={{ fov: 28, near: 0.1, far: 80, position: [-4, 9, 12] }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      onCreated={(state) => { applyStudio(state); onReady?.(); }}
    >
      <Lights span={span} focus={focus} />
      <Ground />
      {children}
    </Canvas>
  );
}

/* Investigation: conveyor drive CD-1 ------------------------------------- */

const DRIVE_TIME = 330;

export function DriveCanvas({ view, instant, active, temperature, onReady }: { view: CellView; instant: boolean; active: boolean; temperature: string; onReady?: () => void }) {
  const layer = useId();
  const clock = useRef(DRIVE_TIME);
  const run = runs.existing;
  const labels: SceneLabel[] = view === "drive"
    ? [{ id: "CD1", at: [layout.drive[0] + 0.112, 0.72, 0.262], text: "CD-1 drive", detail: temperature, tone: "alert", leader: 34 }]
    : [{ id: "CD1", at: [layout.drive[0], 0.78, 0.6], text: "CD-1 drive", detail: temperature, tone: "alert", leader: 30 }];
  return (
    <div className={styles.sceneCanvas}>
      <Stage3D frameloop={active ? "demand" : "never"} onReady={onReady} span={7.5} focus={[0, 0, -0.5]}>
        <LineEquipment proposed={false} drive />
        <PackagingStation run={run} clock={clock} />
        <SimulatedParts run={run} clock={clock} />
        <CameraRig view={view} instant={instant} />
        <LabelProjector labels={labels} layer={layer} />
        <Invalidate signal={`${view}-${active}`} />
      </Stage3D>
      <LabelLayer labels={labels} layer={layer} />
    </div>
  );
}

/* Test the change: both lines over the same ten minutes ------------------ */

const stageLabel: Record<Stage, string> = { assembly: "A1 assembly", inspection: "Inspection", packaging: "P1 packaging" };

function lineLabels(configuration: Configuration, time: number, z: number, inward: "left" | "right"): SceneLabel[] {
  const run = runs[configuration];
  const status = cellStatus(run, time);
  const labels: SceneLabel[] = [
    { id: `${configuration}-line`, at: [1.45, H + 0.1, z], text: configuration === "existing" ? "Today" : "With a second station", detail: `${status.packaged} packed`, tone: configuration === "existing" ? "quiet" : "proposed", leader: 18, minor: true },
  ];
  const bottleneck = bottleneckAt(run, time);
  if (bottleneck) {
    const spot = RING_SPOTS[bottleneck];
    const share = Math.round(busySharesAt(run, time)[bottleneck] * 100);
    labels.push({ id: `${configuration}-limit`, at: [spot.x, bottleneck === "inspection" ? 1.98 : 1.25, spot.z + z], text: "Bottleneck", detail: `${stageLabel[bottleneck]}, busy ${share}%`, tone: "alert", leader: 18, brief: true, side: inward });
  }
  const waiting = status.waitingForInspection;
  if (waiting > 0) {
    labels.push({ id: `${configuration}-queue`, at: [QUEUE_FRONT - Math.min(waiting, 7) * simulation.spacing, 0.02, z + 0.4], text: `${waiting} waiting`, detail: status.assembly === "blocked" ? "A1 can’t release its part" : undefined, tone: waiting >= 2 ? "alert" : "quiet", place: "below", leader: 16, minor: true });
  }
  return labels;
}

export function CompareCanvas({ clock, time, animating, active, instant, onReady }: { clock: RefObject<number>; time: number; animating: boolean; active: boolean; instant: boolean; onReady?: () => void }) {
  const layer = useId();
  const labels = [...lineLabels("existing", time, TODAY_Z, "left"), ...lineLabels("proposed", time, 0, "right")];
  return (
    <div className={styles.sceneCanvas}>
      <Stage3D frameloop={!active ? "never" : animating ? "always" : "demand"} onReady={onReady} span={6.4} focus={[-2.05, 0, -1.72]}>
        <group position={[0, 0, TODAY_Z]}>
          <LineEquipment proposed={false} />
          <QueueLane run={runs.existing} clock={clock} />
          <BottleneckRing run={runs.existing} clock={clock} />
          <SimulatedParts run={runs.existing} clock={clock} />
        </group>
        <LineEquipment proposed />
        <QueueLane run={runs.proposed} clock={clock} />
        <BottleneckRing run={runs.proposed} clock={clock} />
        <SimulatedParts run={runs.proposed} clock={clock} />
        <CameraRig view="compare" instant={instant} />
        <LabelProjector labels={labels} layer={layer} />
        <Invalidate signal={`${time}-${active}`} />
      </Stage3D>
      <LabelLayer labels={labels} layer={layer} />
    </div>
  );
}
