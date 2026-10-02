export const intakeQuestions = [
  { title: "What industry are you in?", options: ["Construction", "Design & Engineering", "Logistics", "Manufacturing", "Retail", "Property Services", "Equipment Rental", "Other"] },
  { title: "How large is the company?", options: ["1–25", "26–100", "101–500", "501–2,000", "2,000+"], hint: "Number of people on your team." },
  { title: "What best describes your role?", options: ["Owner/Founder", "C-Suite", "Operations", "Technology", "Finance", "Other"] },
  { title: "How does most of your team’s work get coordinated?", options: ["Email + spreadsheets", "Specialized software", "ERP", "Internal systems", "Mix of everything"] },
  { title: "How many major software platforms does the company use?", options: ["1–3", "4–7", "8–15", "15+", "Not sure"] },
  { title: "How is company knowledge stored today?", options: ["Mostly in people’s heads", "Files & folders", "Email", "Centralized systems", "Combination"] },
  { title: "How much manual administrative work is involved in day-to-day operations?", options: ["Very little", "Some", "A lot", "It dominates parts of the business"] },
  { title: "How extensively are you using AI today?", options: ["Not at all", "Individual employees use it", "A few workflows", "Across departments", "Built into core operations"] },
  { title: "How does your company typically adopt new technology?", options: ["Very cautiously", "When there's a clear need", "Regularly", "We actively look for new technology"] },
  { title: "Why are you looking at Pontian right now?", options: ["Exploring what’s possible", "A specific operational problem", "Existing technology isn’t working", "Growth is creating complexity", "Leadership wants to modernize", "Other"] },
].map((question) => ({
  ...question,
  options: [...question.options.filter((option) => option !== "Other"), "Other"],
}));

export function isIntakeAnswerValid(index: number, answer: unknown, other: unknown = "") {
  return typeof answer === "string" && intakeQuestions[index]?.options.includes(answer) &&
    (answer !== "Other" || (typeof other === "string" && other.trim().length > 0 && other.length <= 500));
}
