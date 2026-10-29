"use client";

import { ArrowRight, Box, Brain, CalendarRange, CircleDot, Database, FileText, FolderOpen, Send, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { pick, useCopy } from "@/lib/mf/copy";
import { arCode, docCode, shortDate } from "@/lib/mf/format";
import { buildRegistry } from "@/lib/mf/registry";
import { useMf } from "@/lib/mf/store";
import { Card, CardHeader, cx, Page, PageHeader, Tag } from "./ui";

function PreviewHeader({ icon, title, lead, when }: { icon: ReactNode; title: string; lead: string; when: string }) {
  const { c } = useCopy();
  return (
    <PageHeader
      eyebrow={
        <span className="inline-flex items-center gap-2">
          {icon}
          {c.preview} · {when}
        </span>
      }
      title={title}
      lead={lead}
      actions={<Tag>{c.preview}</Tag>}
    />
  );
}

function SampleNote({ children }: { children: ReactNode }) {
  return <p className="mt-6 flex items-center gap-2 text-[12px] text-mf-600"><CircleDot className="size-3.5" />{children}</p>;
}

export function BrainPreview() {
  const { c, lang } = useCopy();
  const mf = useMf();
  const pt = lang === "pt";
  const approved = mf.meetings.filter((m) => m.status === "approved");
  const items = mf.projects.reduce((total, p) => total + buildRegistry(mf.meetings, p.id).entries.length, 0);
  const sources = [
    { name: pt ? "Atas aprovadas" : "Approved minutes", detail: `${approved.length} ${pt ? "atas" : "minutes"} · ${items} ${pt ? "itens do RG" : "RG items"}`, live: true },
    { name: pt ? "Normas e manuais MF" : "MF standards and manuals", detail: pt ? "NORMAS, manuais BIM, checklists" : "NORMAS, BIM manuals, checklists", live: false },
    { name: pt ? "Lições aprendidas" : "Lessons learned", detail: "0100-LA-G-001", live: false },
    { name: "Autodesk Docs", detail: pt ? "Conta de serviço por projeto" : "Service account per project", live: false },
    { name: "SharePoint / Teams", detail: pt ? "Pastas aprovadas pela TI" : "IT-approved folders", live: false },
  ];
  return (
    <Page wide>
      <PreviewHeader
        icon={<Brain className="size-3.5" />}
        when={pt ? "Mês 3" : "Month 3"}
        title="Brain"
        lead={pt ? "Perguntas sobre os projetos respondidas com base no que a MF aprovou: atas, Registro Geral, normas e documentos, sempre com a fonte citada e respeitando quem pode ver cada projeto." : "Project questions answered from what MF has approved: minutes, the General Register, standards and documents, always citing the source and respecting who may see each project."}
      />
      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card className="flex flex-col overflow-hidden">
          <div className="flex-1 space-y-6 p-6">
            <div className="ml-auto max-w-md rounded-xl rounded-xl-sm bg-white px-4 py-3 text-[13.5px] text-black">
              {pt ? "O que ficou decidido sobre a portaria de caminhões do CD da Atlas, e quem ainda tem pendência?" : "What was decided about the truck gatehouse at the Atlas DC, and who still has open items?"}
            </div>
            <div className="max-w-xl">
              <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-mf-600">
                <Brain className="size-3.5" /> Brain
              </div>
              <div className="space-y-3 text-[13.5px] leading-relaxed text-mf-900">
                <p>
                  {pt ? "Na reunião de 20/10 ficou acordado deslocar a portaria de caminhões para a via lateral, separando o fluxo de pedestres das carretas" : "On 10/20 it was agreed to move the truck gatehouse to the side road, separating pedestrians from trailer traffic"}
                  <Cite>AR#002 · 3.01.02</Cite>.
                </p>
                <p>
                  {pt ? "A MF ainda precisa reservar área para a ampliação da doca para 32 posições, com prazo em 03/11" : "MF still needs to reserve area for the dock expansion to 32 positions, due 11/03"}
                  <Cite>AR#002 · 3.01.03</Cite>.
                </p>
              </div>
            </div>
          </div>
          <div className="border-t border-mf-300 p-4">
            <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-[13px] text-mf-600">
              <span className="flex-1">{pt ? "Pergunte sobre qualquer projeto que você pode acessar…" : "Ask about any project you can access…"}</span>
              <Send className="size-4" />
            </div>
          </div>
        </Card>
        <Card>
          <CardHeader title={pt ? "Fontes" : "Sources"} lead={pt ? "Só entra o que tem dono e aprovação." : "Only what has an owner and an approval goes in."} />
          <ul className="divide-y divide-mf-300">
            {sources.map((source) => (
              <li key={source.name} className="flex items-center gap-4 px-5 py-4">
                <Database className="size-4 text-mf-600" />
                <div className="flex-1">
                  <div className="text-[13px] font-medium text-white">{source.name}</div>
                  <div className="text-[11.5px] text-mf-600">{source.detail}</div>
                </div>
                <Tag tone={source.live ? "ok" : "default"}>{source.live ? (pt ? "Conectado" : "Connected") : pt ? "Planejado" : "Planned"}</Tag>
              </li>
            ))}
          </ul>
          <div className="flex items-start gap-3 border-t border-mf-300 px-5 py-4 text-[12px] leading-relaxed text-mf-700">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-white" />
            {pt ? "Cada resposta respeita as permissões do projeto: quem não tem acesso ao Einstein não vê nada do Einstein." : "Every answer respects project permissions: whoever lacks access to a project sees nothing from it."}
          </div>
        </Card>
      </div>
      <SampleNote>{c.dashboard.modulesLead}</SampleNote>
    </Page>
  );
}

function Cite({ children }: { children: ReactNode }) {
  return <span className="mf-num ml-1.5 inline-flex h-5 items-center rounded-xl border border-mf-500 px-1.5 align-middle text-[10.5px] text-mf-800">{children}</span>;
}

const MONTHS_PT = ["Nov", "Dez", "Jan", "Fev", "Mar", "Abr"];
const MONTHS_EN = ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr"];

export function SchedulePreview() {
  const { c, lang } = useCopy();
  const pt = lang === "pt";
  const rows = [
    { on: "1201", name: "CD Refrigerado", phases: [[0, 1.6, pt ? "Básico" : "Basic"], [1.6, 4.4, pt ? "Executivo" : "Detailed"], [4.4, 6, pt ? "Editais" : "Bids"]] as [number, number, string][], late: 1.6 },
    { on: "1188", name: "Embalagens Flexíveis", phases: [[0, 2.2, pt ? "Executivo" : "Detailed"], [2.2, 3.4, pt ? "Editais" : "Bids"], [3.4, 6, pt ? "Obra" : "Site"]] as [number, number, string][] },
    { on: "1176", name: "Laboratório QA", phases: [[0, 0.8, pt ? "Estudo" : "Study"], [0.8, 3, pt ? "Básico" : "Basic"], [3, 6, pt ? "Executivo" : "Detailed"]] as [number, number, string][] },
    { on: "1163", name: "Ampliação Envase", phases: [[0, 3.5, pt ? "Obra" : "Site"], [3.5, 5.2, pt ? "Comissionamento" : "Commissioning"]] as [number, number, string][] },
  ];
  const people = [
    { name: "Juliana Prado", team: pt ? "Arquitetura" : "Architecture", hours: [38, 42, 46, 44, 40, 36, 32, 30] },
    { name: "Marcos Vieira", team: "HVAC", hours: [44, 48, 50, 46, 42, 40, 40, 38] },
    { name: "Eduardo Nunes", team: pt ? "Elétrica" : "Electrical", hours: [30, 32, 36, 40, 40, 42, 38, 36] },
    { name: "Fernanda Lopes", team: pt ? "Planejamento" : "Planning", hours: [40, 40, 40, 40, 40, 40, 40, 40] },
    { name: "Rafael Moura", team: pt ? "Estruturas" : "Structures", hours: [24, 26, 30, 34, 38, 44, 46, 44] },
  ];
  const shade = (h: number) => (h > 44 ? "bg-white text-black ring-2 ring-mf-rec" : h >= 40 ? "bg-mf-800 text-black" : h >= 32 ? "bg-mf-500 text-white" : "bg-mf-300 text-mf-800");
  return (
    <Page wide>
      <PreviewHeader
        icon={<CalendarRange className="size-3.5" />}
        when={pt ? "Mês 2" : "Month 2"}
        title={c.nav.schedule}
        lead={pt ? "Cronogramas do Planejamento e alocação declarada por pessoa, em uma única visão para a diretoria. A carga vem do que o Planejamento declara, nunca de monitorar pessoas." : "Planning schedules and declared allocation per person in one view for the directors. Load comes from what Planning declares, never from monitoring people."}
      />
      <Card className="mt-8 overflow-hidden">
        <CardHeader title={pt ? "Portfólio" : "Portfolio"} lead={pt ? "Fases por projeto e marcos em risco." : "Phases per project and milestones at risk."} />
        <div className="mf-scroll overflow-x-auto px-5 py-5">
          <div className="min-w-[760px]">
            <div className="ml-[220px] grid grid-cols-6 border-b border-mf-300 pb-2 text-[11px] uppercase tracking-[0.12em] text-mf-600">
              {(pt ? MONTHS_PT : MONTHS_EN).map((m) => <span key={m}>{m}</span>)}
            </div>
            {rows.map((row) => (
              <div key={row.on} className="flex items-center border-b border-mf-300 py-3 last:border-0">
                <div className="w-[220px] shrink-0">
                  <span className="mf-num mr-2 text-[13px] text-white">{row.on}</span>
                  <span className="text-[12.5px] text-mf-800">{row.name}</span>
                </div>
                <div className="relative h-7 flex-1">
                  {row.phases.map(([start, end, label], index) => (
                    <div
                      key={label}
                      className={cx("absolute top-0 flex h-7 items-center overflow-hidden rounded-xl px-2 text-[10.5px] font-semibold", ["bg-white text-black", "bg-mf-600 text-white", "bg-mf-400 text-mf-950"][index % 3])}
                      style={{ left: `${(start / 6) * 100}%`, width: `calc(${((end - start) / 6) * 100}% - 3px)` }}
                    >
                      {label}
                    </div>
                  ))}
                  {row.late !== undefined && (
                    <div className="absolute -top-1 flex h-9 items-start" style={{ left: `${(row.late / 6) * 100}%` }}>
                      <span className="h-9 w-[2px] bg-mf-rec" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
      <Card className="mt-6 overflow-hidden">
        <CardHeader title={pt ? "Carga por pessoa" : "Load per person"} lead={pt ? "Horas declaradas por semana. Acima de 44 h fica destacado." : "Declared hours per week. Above 44 h is highlighted."} />
        <div className="mf-scroll overflow-x-auto px-5 py-5">
          <table className="min-w-[700px] text-[12px]">
            <thead>
              <tr className="text-[11.5px] text-mf-600">
                <th className="w-56 pb-3 text-left font-semibold">{pt ? "Pessoa" : "Person"}</th>
                {Array.from({ length: 8 }, (_, i) => <th key={i} className="pb-3 font-semibold">S{45 + i}</th>)}
              </tr>
            </thead>
            <tbody>
              {people.map((person) => (
                <tr key={person.name}>
                  <td className="py-1.5 pr-4">
                    <div className="text-[13px] text-white">{person.name}</div>
                    <div className="text-[11px] text-mf-600">{person.team}</div>
                  </td>
                  {person.hours.map((h, i) => (
                    <td key={i} className="p-1">
                      <div className={cx("mf-num flex h-9 items-center justify-center rounded-xl text-[12px] font-medium", shade(h))}>{h}</div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <SampleNote>{c.dashboard.modulesLead}</SampleNote>
    </Page>
  );
}

export function DocumentsPreview() {
  const { c, lang } = useCopy();
  const mf = useMf();
  const pt = lang === "pt";
  const approved = mf.meetings.filter((m) => m.status === "approved" && m.ata);
  const sample = [
    { code: "1201-LD-G-001", title: pt ? "Lista geral de desenhos" : "General drawing list", discipline: pt ? "Coordenação" : "Coordination", rev: "00", status: pt ? "Emitido" : "Issued", date: "2026-10-18" },
    { code: "1201-AR-A-101", title: pt ? "Implantação geral" : "General site plan", discipline: pt ? "Arquitetura" : "Architecture", rev: "02", status: pt ? "Em revisão" : "In review", date: "2026-10-24" },
    { code: "1201-MD-H-001", title: pt ? "Memorial descritivo de HVAC" : "HVAC description", discipline: "HVAC", rev: "00", status: pt ? "Em elaboração" : "In progress", date: "2026-10-27" },
    { code: "1188-DE-E-210", title: pt ? "Diagrama unifilar geral" : "General single-line diagram", discipline: pt ? "Elétrica" : "Electrical", rev: "01", status: pt ? "Aprovado" : "Approved", date: "2026-10-12" },
  ];
  const rows = [
    ...approved.map((m) => {
      const project = mf.projects.find((p) => p.id === m.projectId)!;
      return { code: docCode(project, m.ar), title: `${arCode(m.ar)} · ${pick(m.ata!.title, lang)}`, discipline: pt ? "Coordenação" : "Coordination", rev: "00", status: pt ? "Aprovado" : "Approved", date: m.date, live: true };
    }),
    ...sample.map((s) => ({ ...s, live: false })),
  ];
  return (
    <Page wide>
      <PreviewHeader
        icon={<FolderOpen className="size-3.5" />}
        when={pt ? "Mês 2" : "Month 2"}
        title={c.nav.documents}
        lead={pt ? "O registro de documentos de cada projeto, com revisão, status e dono, sincronizado com o Autodesk Docs. As atas aprovadas já aparecem aqui como documentos controlados." : "Each project's document register with revision, status and owner, synced with Autodesk Docs. Approved minutes already appear here as controlled documents."}
      />
      <Card className="mt-8 overflow-hidden">
        <div className="mf-scroll overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-[13px]">
            <thead className="border-b border-mf-300 text-[11.5px] text-mf-600">
              <tr>
                <th className="px-5 py-3 font-semibold">{pt ? "Código" : "Code"}</th>
                <th className="px-5 py-3 font-semibold">{pt ? "Título" : "Title"}</th>
                <th className="px-5 py-3 font-semibold">{pt ? "Disciplina" : "Discipline"}</th>
                <th className="px-5 py-3 font-semibold">Rev.</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">{pt ? "Atualizado" : "Updated"}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.code} className="border-b border-mf-300 last:border-0">
                  <td className="mf-num px-5 py-3.5 text-[12.5px] text-white">
                    <span className="inline-flex items-center gap-2"><FileText className="size-3.5 text-mf-600" />{row.code}</span>
                  </td>
                  <td className="px-5 py-3.5 text-mf-900">{row.title}</td>
                  <td className="px-5 py-3.5 text-mf-700">{row.discipline}</td>
                  <td className="mf-num px-5 py-3.5 text-mf-800">{row.rev}</td>
                  <td className="px-5 py-3.5"><Tag tone={row.live ? "ok" : "default"}>{row.status}</Tag></td>
                  <td className="mf-num px-5 py-3.5 text-[12px] text-mf-700">{shortDate(row.date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <SampleNote>{c.dashboard.modulesLead}</SampleNote>
    </Page>
  );
}

export function RevitPreview() {
  const { c, lang } = useCopy();
  const pt = lang === "pt";
  const steps = [
    { title: pt ? "Planta aprovada" : "Approved plan", text: pt ? "O engenheiro escolhe a planta, a revisão e o template MF." : "The engineer picks the plan, revision and MF template." },
    { title: pt ? "Geometria proposta" : "Proposed geometry", text: pt ? "A IA lê cotas, níveis e ambientes e propõe as operações." : "AI reads dimensions, levels and rooms and proposes operations." },
    { title: pt ? "Revisão profissional" : "Professional review", text: pt ? "Nada é criado sem a aprovação do arquiteto ou do BIM." : "Nothing is created without architect or BIM approval." },
    { title: pt ? "Modelo nativo" : "Native model", text: pt ? "Paredes e lajes nativas do Revit, com recibo de validação." : "Native Revit walls and floors, with a validation receipt." },
  ];
  return (
    <Page wide>
      <PreviewHeader
        icon={<Box className="size-3.5" />}
        when={pt ? "Viabilidade no mês 1 · piloto no mês 5" : "Feasibility in month 1 · pilot in month 5"}
        title={c.nav.revit}
        lead={pt ? "Modelagem assistida dentro do processo da MF: da planta aprovada ao modelo nativo em um template da MF, com revisão profissional antes de qualquer alteração." : "Assisted modeling inside MF's process: from an approved plan to a native model in an MF template, with professional review before any change."}
      />
      <Card className="mt-8 overflow-hidden">
        <div className="grid items-center gap-6 p-6 lg:grid-cols-[1fr_auto_1fr]">
          <svg viewBox="0 0 320 220" className="w-full max-w-md justify-self-center" fill="none" stroke="currentColor">
            <g className="text-mf-800" strokeWidth="2">
              <rect x="20" y="20" width="280" height="180" />
              <line x1="140" y1="20" x2="140" y2="120" />
              <line x1="20" y1="120" x2="220" y2="120" />
              <line x1="220" y1="120" x2="220" y2="200" />
            </g>
            <g className="text-mf-600" strokeWidth="1" strokeDasharray="3 3">
              <line x1="20" y1="10" x2="300" y2="10" />
              <line x1="310" y1="20" x2="310" y2="200" />
            </g>
            <g className="fill-mf-700 text-[9px]" stroke="none" fontFamily="monospace">
              <text x="150" y="8">28,00</text>
              <text x="296" y="114" transform="rotate(90 304 110)">18,00</text>
              <text x="60" y="75">ESCRITÓRIO</text>
              <text x="190" y="75">DOCA</text>
              <text x="90" y="165">CÂMARA FRIA</text>
            </g>
          </svg>
          <ArrowRight className="size-6 justify-self-center text-mf-600 lg:rotate-0" />
          <svg viewBox="0 0 320 220" className="w-full max-w-md justify-self-center" fill="none" stroke="currentColor" strokeWidth="1.5">
            <g className="text-white">
              <path d="M60 150 L200 190 L290 140 L150 100 Z" />
              <path d="M60 150 L60 90 L150 40 L150 100" />
              <path d="M290 140 L290 80 L150 40" />
              <path d="M200 190 L200 130 L290 80" />
              <path d="M60 90 L200 130" />
            </g>
            <g className="text-mf-600" strokeDasharray="4 3">
              <path d="M105 125 L105 65 L195 105 L195 165" />
            </g>
          </svg>
        </div>
        <div className="grid border-t border-mf-300 sm:grid-cols-2 xl:grid-cols-4">
          {steps.map((step, index) => (
            <div key={step.title} className={cx("p-5", index > 0 && "border-mf-300 sm:border-l", index > 1 && "border-t sm:border-t-0", index === 2 && "sm:border-l-0 xl:border-l")}>
              <div className="mf-num text-[12px] text-mf-600">0{index + 1}</div>
              <div className="mt-2 text-[14px] font-semibold text-white">{step.title}</div>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-mf-700">{step.text}</p>
            </div>
          ))}
        </div>
      </Card>
      <SampleNote>{c.dashboard.modulesLead}</SampleNote>
    </Page>
  );
}
