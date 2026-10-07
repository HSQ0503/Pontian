import {
  BOOM_OUTLINE, BOOM_PIVOT, CAB_OUTLINE, COUNTERWEIGHT_OUTLINE, HOUSE, POSES, STICK_OUTLINE, TRACK, TRANSPORT_DUNNAGE,
  armFrame, boxOutline, placeOnArm, toolOutline, trackOutline, type Pose, type Tool, type Vec,
} from "./equipment-rental-geometry";

// Static right-side elevation of the same excavator used in the 3D scene.
// Drawn in metres with y flipped, so it shares the 3D outlines exactly.

export type ElevationTone = "blue" | "yellow" | "red";
export type ElevationArea = "tracks" | "house" | "sidePanel" | "cab" | "arm" | "coupler" | "tool";

const FILL = { body: "#ecece9", body2: "#d4d5d3", dark: "#3a3c3d", steel: "#7b7e7f", glass: "#56626a" };
const TONE: Record<ElevationTone, string> = { blue: "#007dfe", yellow: "#fed603", red: "#f51625" };

function points(outline: Vec[]) {
  return outline.map(([x, y]) => `${x.toFixed(3)},${y.toFixed(3)}`).join(" ");
}

function Shape({ outline, fill, ghost }: { outline: Vec[]; fill: string; ghost?: boolean }) {
  return (
    <polygon
      points={points(outline)}
      fill={ghost ? "none" : fill}
      stroke="#262829"
      strokeWidth={1.1}
      strokeDasharray={ghost ? "4 3" : undefined}
      strokeLinejoin="round"
      vectorEffect="non-scaling-stroke"
    />
  );
}

type ElevationProps = {
  pose?: Pose;
  tool: Tool;
  x?: number;
  y?: number;
  flip?: boolean;
  highlight?: Partial<Record<ElevationArea, ElevationTone>>;
  ghost?: boolean;
  mark?: boolean;
};

export function Elevation({ pose = POSES.display, tool, x = 0, y = 0, flip, highlight = {}, ghost, mark }: ElevationProps) {
  const frame = armFrame(pose);
  const fill = (area: ElevationArea, base: string) => (highlight[area] ? TONE[highlight[area]] : base);
  const cylinder = ([a, b]: [Vec, Vec], width: number) => (
    <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={ghost ? "#262829" : "#303233"} strokeWidth={width} strokeLinecap="round" strokeDasharray={ghost ? "0.2 0.15" : undefined} opacity={ghost ? 0.6 : 1} />
  );
  const wheelX = TRACK.length / 2 - TRACK.height / 2;
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -1 : 1} 1)`}>
      <Shape outline={CAB_OUTLINE} fill={fill("cab", FILL.body)} ghost={ghost} />
      {!ghost && <polygon points={points([[0.05, 1.98], [1.17, 1.98], [1.05, 2.86], [0.05, 2.86]])} fill={FILL.glass} opacity={0.9} />}
      <Shape outline={COUNTERWEIGHT_OUTLINE} fill={fill("house", FILL.body2)} ghost={ghost} />
      <Shape outline={boxOutline(HOUSE.hood)} fill={fill("house", FILL.body)} ghost={ghost} />
      <Shape outline={placeOnArm(BOOM_OUTLINE, BOOM_PIVOT, frame.boomAngle)} fill={fill("arm", FILL.body)} ghost={ghost} />
      <Shape outline={placeOnArm(STICK_OUTLINE, frame.stickPivot, frame.stickAngle)} fill={fill("arm", FILL.body)} ghost={ghost} />
      {cylinder(frame.cylinders.boom, 0.2)}
      {cylinder(frame.cylinders.stick, 0.18)}
      {cylinder(frame.cylinders.tool, 0.16)}
      <Shape outline={toolOutline(tool, frame)} fill={fill("tool", tool === "bucket" ? FILL.steel : FILL.dark)} ghost={ghost} />
      <Shape outline={placeOnArm([[-0.16, -0.2], [0.18, -0.2], [0.18, 0.22], [-0.16, 0.22]], frame.toolPivot, frame.toolAngle)} fill={fill("coupler", FILL.dark)} ghost={ghost} />
      <Shape outline={boxOutline(HOUSE.deck)} fill={FILL.dark} ghost={ghost} />
      <Shape outline={boxOutline(HOUSE.compartment)} fill={fill("house", FILL.body)} ghost={ghost} />
      <Shape outline={boxOutline(HOUSE.sidePanel)} fill={fill("sidePanel", fill("house", FILL.body2))} ghost={ghost} />
      {mark && <path d="M0.42 1.42 Q0.62 1.5 0.92 1.55 M0.5 1.36 Q0.75 1.43 1.02 1.46" fill="none" stroke="#262829" strokeWidth={0.035} strokeLinecap="round" />}
      <Shape outline={trackOutline(10)} fill={fill("tracks", FILL.dark)} ghost={ghost} />
      {!ghost && [-wheelX, wheelX].map((cx) => <circle key={cx} cx={cx} cy={TRACK.height / 2} r={0.34} fill={FILL.steel} stroke="#262829" strokeWidth={1} vectorEffect="non-scaling-stroke" />)}
    </g>
  );
}

export function Breaker({ x, y, tone, ghost }: { x: number; y: number; tone?: ElevationTone; ghost?: boolean }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {[0.75, 1.75].map((bx) => <Shape key={bx} outline={[[bx - 0.2, 0], [bx + 0.2, 0], [bx + 0.2, 0.22], [bx - 0.2, 0.22]]} fill="#b8a98a" ghost={ghost} />)}
      <Shape outline={[[-0.1, 0.22], [0.55, 0.22], [0.55, 0.82], [-0.1, 0.82]]} fill={tone ? TONE[tone] : FILL.steel} ghost={ghost} />
      <Shape outline={[[0.55, 0.28], [1.95, 0.28], [1.95, 0.76], [0.55, 0.76]]} fill={tone ? TONE[tone] : FILL.dark} ghost={ghost} />
      <Shape outline={[[1.95, 0.445], [2.45, 0.52], [1.95, 0.595]]} fill={FILL.steel} ghost={ghost} />
    </g>
  );
}

export const TRANSPORT_POSE = POSES.transport;
export const TRANSPORT_LIFT = TRANSPORT_DUNNAGE;

export function LowLoaderElevation({ x, y, ghost }: { x: number; y: number; ghost?: boolean }) {
  const wheel = (cx: number, r: number) => <circle key={cx} cx={cx} cy={r} r={r} fill={ghost ? "none" : "#1f2122"} stroke="#262829" strokeWidth={1} strokeDasharray={ghost ? "3 3" : undefined} vectorEffect="non-scaling-stroke" />;
  return (
    <g transform={`translate(${x} ${y})`}>
      <Shape outline={[[-8.7, 0.8], [4.4, 0.8], [4.4, 0.95], [-8.7, 0.95]]} fill="#303233" ghost={ghost} />
      <Shape outline={[[4.3, 0.8], [4.3, 0.95], [5.2, 1.65], [7.4, 1.65], [7.4, 1.3], [5.4, 1.3], [4.6, 0.8]]} fill="#303233" ghost={ghost} />
      <Shape outline={[[5.4, 0.72], [11.8, 0.72], [11.8, 1.02], [5.4, 1.02]]} fill="#303233" ghost={ghost} />
      <Shape outline={[[9.9, 1.02], [11.85, 1.02], [11.85, 3.55], [9.9, 3.55]]} fill={FILL.body} ghost={ghost} />
      {[-7.9, -6.9, -5.9].map((cx) => wheel(cx, 0.38))}
      {[6.1, 7.5, 10.9].map((cx) => wheel(cx, 0.52))}
    </g>
  );
}
