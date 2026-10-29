import type { Bilingual, ItemStatus, Risk } from "./types";

// The discipline sections of MF's Registro Geral, as used on ON 1155.
export const SECTIONS: (Bilingual & { n: number })[] = [
  { n: 1, pt: "Assuntos gerais", en: "General subjects" },
  { n: 2, pt: "Processos", en: "Process" },
  { n: 3, pt: "Arquitetura", en: "Architecture" },
  { n: 4, pt: "Estrutura de concreto", en: "Concrete structure" },
  { n: 5, pt: "Estrutura metálica", en: "Steel structure" },
  { n: 6, pt: "Instalações de HVAC", en: "HVAC installations" },
  { n: 7, pt: "Instalações elétricas", en: "Electrical installations" },
  { n: 8, pt: "Instalações hidráulicas", en: "Hydraulic installations" },
  { n: 9, pt: "Mecânica / tubulação", en: "Mechanical / piping" },
  { n: 10, pt: "Instalações de PCI", en: "Fire protection installations" },
  { n: 11, pt: "Infraestrutura", en: "Infrastructure" },
  { n: 12, pt: "Sistemas especiais", en: "Special systems" },
  { n: 13, pt: "Aprovações legais", en: "Planning approvals" },
  { n: 14, pt: "Cronograma do projeto", en: "Design schedule" },
  { n: 15, pt: "Editais de concorrência", en: "Bid packages" },
  { n: 16, pt: "Suprimentos", en: "Purchasing" },
  { n: 17, pt: "Lições aprendidas", en: "Lessons learned" },
  { n: 18, pt: "Decision papers", en: "Decision papers" },
  { n: 19, pt: "Alteração de escopo", en: "Scope change" },
];

export function sectionOf(n: number) {
  return SECTIONS.find((section) => section.n === n) ?? SECTIONS[0];
}

export const STATUS: Record<ItemStatus, Bilingual> = {
  info: { pt: "Informação", en: "Information" },
  progress: { pt: "Em andamento", en: "In progress" },
  closed: { pt: "Finalizado", en: "Closed" },
};

export const RISK: Record<Risk, Bilingual> = {
  low: { pt: "Baixo", en: "Low" },
  medium: { pt: "Médio", en: "Medium" },
  high: { pt: "Alto", en: "High" },
};
