export type Mode = "student" | "admin";
export type PlanKey = "a" | "b";
export type ModuleId = "lessons" | "bank" | "test" | "review" | "tutoring";
export type PickId = ModuleId | "editor" | "gate";
export type Vec = [number, number];
export type Rect = { x: Vec; z: Vec };

/* Layout in metres on the shared slab: x runs left to right, z runs back to front.
   The back row holds the tall screens, the front row the low props, and the
   student path runs down the aisle between them. */

export const TOP = 0.32;
export const PAD = 0.06;
export const SLAB: Rect = { x: [-7.4, 7.2], z: [-3.9, 3.9] };
export const GATE_X = -6.3;

export const PADS: Record<ModuleId | "editor", Rect> = {
  lessons: { x: [-5.2, -2.0], z: [-3.3, -0.8] },
  editor: { x: [-1.3, 1.5], z: [-3.3, -0.8] },
  tutoring: { x: [2.3, 6.4], z: [-3.3, -0.8] },
  bank: { x: [-5.2, -2.0], z: [0.8, 3.3] },
  test: { x: [-1.5, 2.8], z: [0.8, 3.3] },
  review: { x: [3.3, 6.4], z: [0.8, 3.3] },
};

export const MODULES: readonly ModuleId[] = ["lessons", "bank", "test", "review", "tutoring"];

// Path waypoints: start, gate, then one stop per module, then the far end.
export const PATH: readonly Vec[] = [[-7.4, 0], [GATE_X, 0], [-4.1, -0.4], [-2.9, 0.4], [0.6, 0.42], [4.0, 0.42], [5.4, -0.4], [7.2, 0]];
export const stopIndex = (step: number) => step + 2;
// Plan B stops the path partway along the leg from review to tutoring.
export const BARRIER_AT = 5.62;
export const TOKEN_HALT = 5.42;

export const LESSON_TILES = Array.from({ length: 5 }, (_, index): Vec => [-4.9 + index * 0.58, -4.9 + index * 0.58 + 0.48]);
export const LESSON_TILE_Z: Vec = [-1.9, -1.2];
export const CURRENT_TILE = 2;

export const STACKS = [7, 10, 6, 9, 8].map((cards, index) => ({ cards, x: -4.65 + index * 0.6 }));
export const TOPIC_STACK = 1;
export const STACK_Z = 1.75;
export const STACK_PULL = 0.95;
export const CARD = { width: 0.48, depth: 0.66, thickness: 0.03, gap: 0.012 };

export const SECTIONS = [
  { id: "rw1", title: "Reading and Writing, module 1", x: [-1.2, -0.38] as Vec, math: false },
  { id: "rw2", title: "Reading and Writing, module 2", x: [-0.24, 0.58] as Vec, math: false },
  { id: "m1", title: "Math, module 1", x: [0.84, 1.66] as Vec, math: true },
  { id: "m2", title: "Math, module 2", x: [1.8, 2.62] as Vec, math: true },
];
export const SECTION_Z: Vec = [1.4, 2.7];
export const SECTION_HEIGHT = 0.42;
export const ACTIVE_SECTION = 1;

export const REVIEW = { x: [3.6, 5.2] as Vec, z: [1.25, 2.85] as Vec, rows: 3, columns: 6, flagged: [4, 9, 14] };

export const STUDENT_STEPS = ["Watch a lesson", "Practise a topic", "Take a timed test", "Review answers", "Join a group call"] as const;
export const ADMIN_STEPS = ["Publish a lesson", "Edit questions and explanations", "Manage student access"] as const;

export const PLAN_NAME: Record<PlanKey, string> = { a: "Plan A (example)", b: "Plan B (example)" };
export const inPlan = (plan: PlanKey, module: ModuleId) => plan === "a" || module !== "tutoring";

export const MODULE_NAME: Record<ModuleId, string> = {
  lessons: "Lessons",
  bank: "Question bank",
  test: "Practice test",
  review: "Review",
  tutoring: "Tutoring",
};

export type Chip = { title: string; detail: string; state?: "ok" | "select" | "blocked" };

export function studentChip(step: number, plan: PlanKey): Chip {
  switch (step) {
    case 0: return { title: "Video lesson", detail: "Part of a course (example)", state: "select" };
    case 1: return { title: "Linear equations (example)", detail: "Targeted exercises by topic", state: "select" };
    case 2: return { title: SECTIONS[ACTIVE_SECTION].title, detail: "Timed section, attempt saved", state: "select" };
    case 3: return { title: "Saved attempt (example)", detail: "Blue correct, red for review", state: "select" };
    default: return plan === "a"
      ? { title: "Group tutoring call", detail: "Recordings on the shelf", state: "select" }
      : { title: `Not in ${PLAN_NAME.b}`, detail: "The plan keeps tutoring closed", state: "blocked" };
  }
}

export function adminChip(step: number): Chip & { target: Chip } {
  switch (step) {
    case 0: return { title: "Lesson editor", detail: "Publishes into a course", state: "select", target: { title: "New lesson (example)", detail: "Added to the lesson row", state: "ok" } };
    case 1: return { title: "Question editor", detail: "Questions and explanations", state: "select", target: { title: "Edited question (example)", detail: "Back in Linear equations", state: "ok" } };
    default: return { title: "Access and membership", detail: "Plans decide what opens", state: "select", target: { title: "Membership gate", detail: "Opens the modules in each plan", state: "ok" } };
  }
}

export function caption(mode: Mode, step: number, plan: PlanKey) {
  if (mode === "admin") {
    switch (step) {
      case 0: return "The admin view. A lesson written in the editor is published straight into the lesson row students see.";
      case 1: return "The admin view. A question and its explanation are edited, then filed back into the Linear equations (example) stack.";
      default: return "The admin view. Access controls set which modules each plan opens at the membership gate.";
    }
  }
  const who = `Student A (example) on ${PLAN_NAME[plan]}`;
  switch (step) {
    case 0: return `${who} enters through the membership gate and watches a video lesson from a course.`;
    case 1: return `${who} pulls the Linear equations (example) stack from the question bank to practise one topic.`;
    case 2: return `${who} takes a full-length practice test. The four sections run in order, and the timer is on Reading and Writing, module 2.`;
    case 3: return `${who} opens a saved attempt. Blue marks are correct answers, red marks are answers to review.`;
    default: return plan === "a"
      ? `${who} joins a group tutoring call. Earlier calls are kept as recordings on the shelf.`
      : `${who} reaches tutoring, but the plan doesn’t include it, so the module stays closed.`;
  }
}

export function description(mode: Mode, step: number, plan: PlanKey) {
  const base = "A diorama of the 1500 Blueprint platform as modules on one base: a membership gate at the entrance, lessons, a question bank, a practice test, review, tutoring and an admin editor.";
  if (mode === "admin") return `${base} Admin view, step ${step + 1} of 3: ${ADMIN_STEPS[step]}. ${caption(mode, step, plan)}`;
  const closed = plan === "b" ? " Tutoring is ghosted because Plan B (example) doesn’t include it." : "";
  return `${base} Student view, step ${step + 1} of 5: ${STUDENT_STEPS[step]}. ${caption(mode, step, plan)}${closed}`;
}

/* Shared helpers for the SVG drawings. */

// Uniform Catmull-Rom as cubic Bézier legs, matching THREE.CatmullRomCurve3 ("catmullrom", tension 0.5).
export function pathLegs(points: readonly Vec[]) {
  const at = (index: number) => points[Math.max(0, Math.min(points.length - 1, index))];
  const first = points[0];
  const second = points[1];
  const last = points[points.length - 1];
  const beforeLast = points[points.length - 2];
  const startGhost: Vec = [2 * first[0] - second[0], 2 * first[1] - second[1]];
  const endGhost: Vec = [2 * last[0] - beforeLast[0], 2 * last[1] - beforeLast[1]];
  const point = (index: number): Vec => (index < 0 ? startGhost : index >= points.length ? endGhost : at(index));
  return points.slice(0, -1).map((_, index) => {
    const p0 = point(index - 1);
    const p1 = point(index);
    const p2 = point(index + 1);
    const p3 = point(index + 2);
    const c1: Vec = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Vec = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    return [p1, c1, c2, p2] as const;
  });
}

export function bezierPoint(leg: ReturnType<typeof pathLegs>[number], t: number): Vec {
  const [a, b, c, d] = leg;
  const u = 1 - t;
  const w = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
  return [a[0] * w[0] + b[0] * w[1] + c[0] * w[2] + d[0] * w[3], a[1] * w[0] + b[1] * w[1] + c[1] * w[2] + d[1] * w[3]];
}
