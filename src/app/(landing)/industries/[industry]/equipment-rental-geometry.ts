// Side profiles and arm kinematics for the illustrative tracked excavator.
// Units are metres in the machine frame: x forward, y up, z to the right.
// The 3D scene extrudes these outlines and the static fallback draws them,
// so both views show the same machine.

export type Vec = [number, number];
export type Pose = { boom: number; stick: number; tool: number };
export type Tool = "bucket" | "breaker";

export const TRACK = { length: 4.4, height: 0.86, width: 0.6, gauge: 2 };
export const DECK_Y = 1;
export const ARM_Z = 0.15;
export const BOOM_PIVOT: Vec = [0.78, 1.72];
export const BOOM_ANCHOR: Vec = [1.28, 1.2];

const BOOM_LINE: Vec[] = [[-0.25, 0], [2.75, 0.95], [5.6, 0]];
const BOOM_WIDTHS = [0.6, 0.84, 0.46];
const STICK_LINE: Vec[] = [[-0.62, 0.12], [0, 0], [2.85, 0]];
const STICK_WIDTHS = [0.5, 0.52, 0.32];
const BOOM_TIP: Vec = [5.6, 0];
const STICK_TIP: Vec = [2.85, 0];

// Solved so the tool rests on the ground (or on dunnage when loaded) and the
// arm clears the tracks; see lowestPoint.
export const POSES: Record<"display" | "parked" | "transport", Pose> = {
  display: { boom: 0.38, stick: -1.82, tool: -0.7 },
  parked: { boom: 0.52, stick: -2.46, tool: 1.1 },
  transport: { boom: -0.14, stick: -2.8, tool: -0.5 },
};
export const TRANSPORT_DUNNAGE = 0.12;

export function rotate([x, y]: Vec, angle: number): Vec {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [x * c - y * s, x * s + y * c];
}

function add(a: Vec, b: Vec): Vec {
  return [a[0] + b[0], a[1] + b[1]];
}

function beamOutline(line: Vec[], widths: number[]): Vec[] {
  const left: Vec[] = [];
  const right: Vec[] = [];
  line.forEach((point, index) => {
    const prev = line[Math.max(0, index - 1)];
    const next = line[Math.min(line.length - 1, index + 1)];
    const dx = next[0] - prev[0];
    const dy = next[1] - prev[1];
    const length = Math.hypot(dx, dy) || 1;
    const nx = -dy / length;
    const ny = dx / length;
    const half = widths[index] / 2;
    left.push([point[0] + nx * half, point[1] + ny * half]);
    right.push([point[0] - nx * half, point[1] - ny * half]);
  });
  return [...left, ...right.reverse()];
}

export const BOOM_OUTLINE = beamOutline(BOOM_LINE, BOOM_WIDTHS);
export const STICK_OUTLINE = beamOutline(STICK_LINE, STICK_WIDTHS);

export const BUCKET_OUTLINE: Vec[] = [
  [-0.12, 0.2], [0.32, 0.36], [0.86, 0.22], [1.2, -0.12], [1.3, -0.5],
  [1.18, -0.82], [1.02, -0.78], [0.98, -0.5], [0.68, -0.3], [0.24, -0.22], [-0.1, -0.12],
];

export const BREAKER_PARTS = {
  bracket: { x0: -0.1, x1: 0.55, half: 0.3 },
  body: { x0: 0.55, x1: 1.95, radius: 0.24 },
  chisel: { x0: 1.95, x1: 2.45, radius: 0.075 },
};

export const CAB_OUTLINE: Vec[] = [[-0.1, 1.14], [1.25, 1.14], [1.32, 2.12], [1.12, 2.98], [-0.1, 2.98]];
export const CAB_Z: Vec = [-1.22, -0.32];
export const COUNTERWEIGHT_OUTLINE: Vec[] = [[-1.25, 1.06], [-1.25, 2.12], [-1.62, 2.12], [-1.9, 1.86], [-1.9, 1.32], [-1.68, 1.06]];

export type Box = { x: Vec; y: Vec; z: Vec };
export const HOUSE: Record<"deck" | "hood" | "compartment" | "sidePanel", Box> = {
  deck: { x: [-1.75, 1.35], y: [0.98, 1.14], z: [-1.25, 1.25] },
  hood: { x: [-1.25, -0.12], y: [1.14, 2.2], z: [-1.2, 1.2] },
  compartment: { x: [-0.12, 1.25], y: [1.14, 1.95], z: [0.62, 1.25] },
  sidePanel: { x: [-0.02, 1.12], y: [1.22, 1.87], z: [1.25, 1.275] },
};

export function trackOutline(segments = 10): Vec[] {
  const r = TRACK.height / 2;
  const reach = TRACK.length / 2 - r;
  const points: Vec[] = [];
  for (let i = 0; i <= segments; i++) {
    const angle = -Math.PI / 2 + (Math.PI * i) / segments;
    points.push([reach + Math.cos(angle) * r, r + Math.sin(angle) * r]);
  }
  for (let i = 0; i <= segments; i++) {
    const angle = Math.PI / 2 + (Math.PI * i) / segments;
    points.push([-reach + Math.cos(angle) * r, r + Math.sin(angle) * r]);
  }
  return points;
}

export type ArmFrame = {
  boomAngle: number;
  stickPivot: Vec;
  stickAngle: number;
  toolPivot: Vec;
  toolAngle: number;
  cylinders: { boom: [Vec, Vec]; stick: [Vec, Vec]; tool: [Vec, Vec] };
};

export function armFrame(pose: Pose): ArmFrame {
  const boomAngle = pose.boom;
  const stickAngle = pose.boom + pose.stick;
  const toolAngle = stickAngle + pose.tool;
  const onBoom = (point: Vec) => add(BOOM_PIVOT, rotate(point, boomAngle));
  const stickPivot = onBoom(BOOM_TIP);
  const onStick = (point: Vec) => add(stickPivot, rotate(point, stickAngle));
  const toolPivot = onStick(STICK_TIP);
  return {
    boomAngle,
    stickPivot,
    stickAngle,
    toolPivot,
    toolAngle,
    cylinders: {
      boom: [BOOM_ANCHOR, onBoom([2.1, -0.36])],
      stick: [onBoom([2.3, 0.5]), onStick([-0.6, 0.2])],
      tool: [onStick([0.25, 0.3]), onStick([2.55, 0.3])],
    },
  };
}

export function toolOutline(tool: Tool, frame: ArmFrame): Vec[] {
  const local: Vec[] = tool === "bucket"
    ? BUCKET_OUTLINE
    : [
        [BREAKER_PARTS.bracket.x0, -0.3], [BREAKER_PARTS.bracket.x1, -0.3], [BREAKER_PARTS.body.x0, -0.24], [BREAKER_PARTS.body.x1, -0.24],
        [BREAKER_PARTS.chisel.x0, -0.075], [BREAKER_PARTS.chisel.x1, 0], [BREAKER_PARTS.chisel.x0, 0.075], [BREAKER_PARTS.body.x1, 0.24],
        [BREAKER_PARTS.body.x0, 0.24], [BREAKER_PARTS.bracket.x1, 0.3], [BREAKER_PARTS.bracket.x0, 0.3],
      ];
  return local.map((point) => add(frame.toolPivot, rotate(point, frame.toolAngle)));
}

export function placeOnArm(outline: Vec[], pivot: Vec, angle: number): Vec[] {
  return outline.map((point) => add(pivot, rotate(point, angle)));
}

export function boxOutline(box: Box): Vec[] {
  return [[box.x[0], box.y[0]], [box.x[1], box.y[0]], [box.x[1], box.y[1]], [box.x[0], box.y[1]]];
}

export function lowestPoint(points: Vec[]) {
  return points.reduce((low, point) => Math.min(low, point[1]), Infinity);
}
