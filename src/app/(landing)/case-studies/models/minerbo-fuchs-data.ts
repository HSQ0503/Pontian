export type Mode = "mine" | "all";

export const MODES = [
  { value: "mine", label: "My work" },
  { value: "all", label: "All projects" },
] as const;

export const STEPS = ["Ask a question", "Open the source", "See the decision", "See your task", "Add new information"] as const;

export const POLICY = "AI prepares and organizes. Staff review its drafts, and engineering decisions and approvals stay with the firm’s engineers.";

type Copy = { title: string; text: string; label: string };

export const STEP_COPY: readonly Copy[] = [
  {
    title: "Ask a question",
    text: "Engineer A (example) asks, “Which Level 2 slab thickness is current?” The search looks only in approved company and project documents and points to the source: the Structural memo, rev C (example).",
    label: "The Structural memo, rev C (example) is selected in the Structural group and marked approved.",
  },
  {
    title: "Open the source",
    text: "The answer opens the original memo at section 4.2, so the engineer reads the approved wording, with a reference back to the document.",
    label: "The memo slides out of the library and lies open on the cabinet, with section 4.2 on slab thickness selected.",
  },
  {
    title: "See the decision",
    text: "The memo links to the coordination meeting where the thickness was decided. AI prepared draft minutes, decisions and follow-up tasks, and they stay a draft until staff review them.",
    label: "The meeting table is in focus. The decision from the coordination meeting (example) is linked to the memo, and the minutes are marked as a draft for staff review.",
  },
  {
    title: "See your task",
    text: "The follow-up from that meeting sits on the project board under Engineer A (example), due Friday. The engineer goes from the question to the source, the decision and their own task.",
    label: "On the responsibility board, the task card for Engineer A (example), update Level 2 slab drawings, due Friday, is selected.",
  },
  {
    title: "Add new information",
    text: "A new MEP site note (example) is added with its source attached. It shows as under review and isn’t treated as approved until a staff member checks it.",
    label: "A new MEP site note (example) is entering the MEP group, shown as a faint outline with its source kept and its status under review by staff.",
  },
];

export const ALL_COPY: Copy = {
  title: "All projects",
  text: "A manager sees outstanding work across Example Projects A, B and C, stacked by person. One item on Example Project C needs attention.",
  label: "Three project boards, Example Projects A, B and C, with outstanding task cards stacked by person. One card on Example Project C is red and needs attention.",
};

export const ROOM_LABEL = "Example Project A room with an approved document library in Structural, MEP and Architecture groups, a meeting table and a responsibility board.";

/* Board layout shared by the scene and the drawing: open cards per person column. */
export const BOARD_A = [3, 2, 3] as const;
export const BOARD_B = [3, 2, 4] as const;
export const BOARD_C = [2, 4, 3] as const;
// Column and card index (top of the stack) of the item that needs attention on Example Project C.
export const ALERT_CARD: [number, number] = [1, 3];
export const TASK_CARD: [number, number] = [0, 0];

/* Library: three discipline groups. The memo is in Structural; the new note arrives in MEP. */
export const GROUPS = ["Structural", "MEP", "Architecture"] as const;
export const BINDERS = [6, 5, 6] as const;
export const MEMO = { group: 0, index: 2 } as const;
export const NEW_NOTE = { group: 1, index: 5 } as const;
