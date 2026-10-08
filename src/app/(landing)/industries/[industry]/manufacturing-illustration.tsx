import { layout } from "./manufacturing-model";
import styles from "./manufacturing.module.css";

type Vec3 = [number, number, number];
type Face = { points: Vec3[]; depth: number; shade: number };

// Axonometric projection of Cell 1, drawn with the same coordinates as the 3D scene.
const AXIS = { x: [0.9, 0.36], z: [-0.55, 0.62], y: [0, -0.92] };
const SCALE = 46;
const project = ([x, y, z]: Vec3): [number, number] => [
  (x * AXIS.x[0] + z * AXIS.z[0] + y * AXIS.y[0]) * SCALE,
  (x * AXIS.x[1] + z * AXIS.z[1] + y * AXIS.y[1]) * SCALE,
];
// The world direction that projects to a point, oriented toward the viewer:
// the top, front (+z) and right (+x) faces of every box are the visible ones.
const VIEWER: Vec3 = [0.506, 0.756, 0.828];
const depthOf = ([x, y, z]: Vec3) => x * VIEWER[0] + y * VIEWER[1] + z * VIEWER[2];

function box(min: Vec3, max: Vec3, faces: Face[]) {
  const [x0, y0, z0] = min;
  const [x1, y1, z1] = max;
  const quads: [Vec3[], number, Vec3][] = [
    [[[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], 0, [(x0 + x1) / 2, y1, (z0 + z1) / 2]],
    [[[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], 1, [(x0 + x1) / 2, (y0 + y1) / 2, z1]],
    [[[x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]], 2, [x1, (y0 + y1) / 2, (z0 + z1) / 2]],
  ];
  const center: Vec3 = [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2];
  for (const [points, shade, faceCenter] of quads) faces.push({ points, depth: depthOf(center) + depthOf(faceCenter) * 0.001, shade });
}

function buildScene() {
  const faces: Face[] = [];
  const H = layout.conveyorHeight;
  for (let x = -4.85; x < 4.84; x += 9.7 / 20) box([x, H - 0.09, -0.22], [x + 9.7 / 20, H - 0.01, 0.22], faces);
  for (const x of [-4.7, -3.1, -1.5, 1.5, 3.1, 4.7]) for (const z of [-0.19, 0.19]) box([x - 0.02, 0, z - 0.02], [x + 0.02, H - 0.09, z + 0.02], faces);
  box([-5.9, H - 0.04, -0.47], [-4.85, H, 0.47], faces);
  for (const [x, z] of [[-5.85, -0.43], [-4.9, -0.43], [-5.85, 0.43], [-4.9, 0.43]]) box([x - 0.02, 0, z - 0.02], [x + 0.02, H - 0.04, z + 0.02], faces);
  box([-5.86, H, -0.42], [-5.82, 2.05, -0.38], faces);
  box([-5.86, 1.98, -0.42], [-5.3, 2.02, -0.38], faces);
  for (const [x, z] of [[-0.68, -0.42], [0.68, -0.42], [-0.68, 0.42], [0.68, 0.42]]) box([x - 0.02, 0, z - 0.02], [x + 0.02, 1.95, z + 0.02], faces);
  box([-0.7, 1.93, -0.44], [0.7, 1.97, -0.4], faces);
  box([-0.7, 1.93, 0.4], [0.7, 1.97, 0.44], faces);
  box([-0.7, 1.93, -0.44], [-0.66, 1.97, 0.44], faces);
  box([0.66, 1.93, -0.44], [0.7, 1.97, 0.44], faces);
  box([-0.05, 1.66, -0.045], [0.05, 1.93, 0.045], faces);
  box([4.95, H - 0.04, -0.47], [5.85, H, 0.47], faces);
  for (const [x, z] of [[5.0, -0.43], [5.8, -0.43], [5.0, 0.43], [5.8, 0.43]]) box([x - 0.02, 0, z - 0.02], [x + 0.02, H - 0.04, z + 0.02], faces);
  box([5.04, H, -0.17], [5.46, H + 0.17, 0.17], faces);
  box([4.95, 0, 0.84], [5.95, 0.12, 1.66], faces);
  for (let layer = 0; layer < 2; layer++) for (let column = 0; column < 3; column++) for (let row = 0; row < 3; row++) {
    if (layer === 1 && row + column > 2) continue;
    const x = 5.14 + column * 0.31;
    const z = 1.0 + row * 0.25;
    box([x - 0.15, 0.12 + layer * 0.18, z - 0.12], [x + 0.15, 0.3 + layer * 0.18, z + 0.12], faces);
  }
  box([4.35, 0.57, 0.22], [4.55, 0.77, 0.38], faces);
  box([4.37, 0.58, 0.38], [4.53, 0.76, 0.7], faces);
  for (const x of [-3.6, -2.75, -2.3, -1.85, -1.4, 0, 2.6]) box([x - 0.176, H, -0.136], [x + 0.176, H + 0.1, 0.136], faces);
  box([-5.476, H, -0.136], [-5.124, H + 0.1, 0.136], faces);
  return faces.sort((a, b) => a.depth - b.depth);
}

const FACES = buildScene();
const FILLS = ["#202020", "#151515", "#101010"];
const pathOf = (points: Vec3[]) => points.map((point, index) => `${index ? "L" : "M"}${project(point).map((value) => value.toFixed(1)).join(" ")}`).join(" ") + "Z";
const lineOf = (points: Vec3[]) => points.map((point, index) => `${index ? "L" : "M"}${project(point).map((value) => value.toFixed(1)).join(" ")}`).join(" ");

const boundary: Vec3[] = [[-6.15, 0, 1.95], [6.15, 0, 1.95], [6.15, 0, -3.0], [-6.15, 0, -3.0], [-6.15, 0, 1.95]];
const footprint: Vec3[] = [[-0.75, 0, -1.72], [0.75, 0, -1.72], [0.75, 0, -2.68], [-0.75, 0, -2.68], [-0.75, 0, -1.72]];
const loop: Vec3[] = [[-1.4, layout.conveyorHeight, 0], [-1.4, layout.conveyorHeight, -2.2], [1.4, layout.conveyorHeight, -2.2], [1.4, layout.conveyorHeight, 0]];

const corners = [...boundary, [-0.6, 2.05, 0] as Vec3, [5.95, 0.5, 1.66] as Vec3].map(project);
const minX = Math.min(...corners.map(([x]) => x)) - 12;
const maxX = Math.max(...corners.map(([x]) => x)) + 12;
const minY = Math.min(...corners.map(([, y]) => y)) - 40;
const maxY = Math.max(...corners.map(([, y]) => y)) + 12;
const VIEW = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };

const MARKERS: { index: string; at: Vec3; label: string; place?: "right" }[] = [
  { index: "01", at: [0, 2.0, 0], label: "Inspect" },
  { index: "02", at: [-5.3, 1.25, 0.1], label: "Plan" },
  { index: "03", at: [4.45, 0.82, 0.62], label: "Investigate" },
  { index: "04", at: [0.75, 0, -2.2], label: "Test", place: "right" },
];

export function CellIllustration() {
  return (
    <figure className={styles.heroFigure} aria-label="Line drawing of the example production cell: assembly A1, inspection I1, and packaging P1 along one conveyor, with conveyor drive CD-1 and the space for a proposed second inspection station.">
      <svg viewBox={`${VIEW.x.toFixed(1)} ${VIEW.y.toFixed(1)} ${VIEW.width.toFixed(1)} ${VIEW.height.toFixed(1)}`} className={styles.heroDrawing} aria-hidden="true">
        <path d={lineOf(boundary)} fill="none" stroke="#fed603" strokeOpacity={0.55} strokeWidth={1} vectorEffect="non-scaling-stroke" />
        <path d={lineOf(footprint)} fill="none" stroke="#007dfe" strokeWidth={1.25} strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
        <path d={lineOf(loop)} fill="none" stroke="#007dfe" strokeOpacity={0.55} strokeWidth={1} strokeDasharray="2 5" vectorEffect="non-scaling-stroke" />
        {FACES.map((face, index) => (
          <path key={index} d={pathOf(face.points)} fill={FILLS[face.shade]} stroke="#eeeeec" strokeOpacity={0.58} strokeWidth={0.8} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      {MARKERS.map((marker) => {
        const [x, y] = project(marker.at);
        return (
          <span key={marker.index} className={styles.heroMarker} data-index={marker.index} data-place={marker.place} style={{ left: `${((x - VIEW.x) / VIEW.width) * 100}%`, top: `${((y - VIEW.y) / VIEW.height) * 100}%` }}>
            <span>{marker.index}</span>{marker.label}
          </span>
        );
      })}
    </figure>
  );
}
