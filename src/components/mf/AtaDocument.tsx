"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { arCode, compareNumbers, docCode, shortDate } from "@/lib/mf/format";
import { groupItems } from "@/lib/mf/registry";
import { RISK, sectionOf, STATUS } from "@/lib/mf/sections";
import type { Ata, AtaItem, Meeting, Project, Subsection } from "@/lib/mf/types";

export type DocView = "both" | "pt" | "en";

const MODALITY = {
  teams: { pt: "Microsoft Teams", en: "Microsoft Teams" },
  presencial: { pt: "Presencial", en: "In person" },
  hibrida: { pt: "Híbrida", en: "Hybrid" },
};

function Bi({ pt, en, view, className }: { pt: string; en: string; view: DocView; className?: string }) {
  return (
    <div className={className}>
      {view !== "en" && <div>{pt}</div>}
      {view !== "pt" && <div className={view === "both" ? "mf-en mt-1" : ""}>{en}</div>}
    </div>
  );
}

function Label({ children }: { children: ReactNode }) {
  return (
    <td className="w-[124px] bg-[#f2f2f2] text-[8.5px] font-semibold uppercase tracking-[0.06em] text-[#444]">{children}</td>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6 break-inside-avoid-page">
      <h3 className="mb-2 border-b-2 border-black pb-1 text-[10px] font-bold uppercase tracking-[0.14em]">{title}</h3>
      {children}
    </section>
  );
}

export function AtaDocument({
  meeting,
  project,
  ata,
  subsections,
  view,
  onEditItem,
}: {
  meeting: Meeting;
  project: Project;
  ata: Ata;
  subsections: Subsection[];
  view: DocView;
  onEditItem?: (item: AtaItem) => void;
}) {
  const L = (pt: string, en: string) => (view === "pt" || pt === en ? pt : view === "en" ? en : `${pt} / ${en}`);
  const current = arCode(meeting.ar);
  const groups = groupItems(ata.items, subsections);
  const decisions = ata.items.filter((item) => item.isDecision).sort((a, b) => compareNumbers(a.number, b.number));
  const actions = ata.items
    .filter((item) => item.isAction || item.status === "progress")
    .sort((a, b) => compareNumbers(a.number, b.number));
  const approved = meeting.status === "approved";
  const present = meeting.participants.filter((p) => p.present);
  const absent = meeting.participants.filter((p) => !p.present);

  return (
    <article className="mf-paper relative mx-auto w-full max-w-[880px] px-[38px] py-[34px] shadow-[0_40px_90px_-30px_rgba(0,0,0,0.9)]">
      {!approved && <div className="mf-watermark">{view === "en" ? "DRAFT" : "RASCUNHO"}</div>}

      <table>
        <tbody>
          <tr>
            <td className="w-[150px] !border-black align-middle">
              <Image src="/mf/mf-logo-black.png" alt="Minerbo-Fuchs" width={206} height={105} className="mx-auto h-11 w-auto" />
            </td>
            <td className="!border-black text-center align-middle font-bold uppercase leading-snug">
              <div className="text-[12px]">
                ON {project.on} - {project.client}
              </div>
              <div className="text-[11px]">{project.name}</div>
              <div className="text-[10px] font-semibold text-[#555]">{project.city}</div>
            </td>
            <td className="w-[178px] !border-black align-middle text-[9px] leading-relaxed">
              <div className="flex justify-between gap-2">
                <span className="font-semibold text-[#666]">DOC.</span>
                <span className="mf-num font-semibold">{docCode(project, meeting.ar)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="font-semibold text-[#666]">REV.</span>
                <span className="mf-num">00</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="font-semibold text-[#666]">{L("EMISSÃO", "ISSUE")}</span>
                <span className="mf-num">{shortDate((meeting.approvedAt || meeting.updatedAt).slice(0, 10))}</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div className="flex items-center justify-between bg-black px-4 py-2 text-white">
        <span className="text-[12px] font-bold tracking-[0.14em]">{L("ATA DE REUNIÃO", "MINUTES OF MEETING")}</span>
        <span className="mf-num text-[12px]">
          {current}
          {view !== "pt" && ` · MoM#${String(meeting.ar).padStart(3, "0")}`}
        </span>
      </div>

      <table className="mt-3">
        <tbody>
          <tr>
            <Label>{L("Data", "Date")}</Label>
            <td className="mf-num">{shortDate(meeting.date)}</td>
            <Label>{L("Horário", "Time")}</Label>
            <td className="mf-num">
              {meeting.startTime || "-"}
              {meeting.endTime ? ` - ${meeting.endTime}` : ""}
            </td>
          </tr>
          <tr>
            <Label>{L("Local", "Location")}</Label>
            <td>
              {L(MODALITY[meeting.modality].pt, MODALITY[meeting.modality].en)}
              {meeting.location && meeting.location !== MODALITY[meeting.modality].pt ? ` · ${meeting.location}` : ""}
            </td>
            <Label>{L("Elaborada por", "Prepared by")}</Label>
            <td>{meeting.secretary || "-"}</td>
          </tr>
          <tr>
            <Label>{L("Objetivo", "Objective")}</Label>
            <td colSpan={3} className="font-semibold">
              <Bi pt={ata.title.pt} en={ata.title.en} view={view} />
            </td>
          </tr>
        </tbody>
      </table>

      {meeting.participants.length > 0 && (
        <Block title={L("Participantes", "Participants")}>
          <table>
            <thead>
              <tr>
                <th>{L("Nome", "Name")}</th>
                <th className="w-[150px]">{L("Empresa", "Company")}</th>
                <th className="w-[170px]">{L("Função", "Role")}</th>
                <th className="w-[84px]">{L("Presença", "Attendance")}</th>
              </tr>
            </thead>
            <tbody>
              {[...present, ...absent].map((person) => (
                <tr key={person.id} className={person.present ? "" : "text-[#888]"}>
                  <td>{person.name}</td>
                  <td>{person.company || "-"}</td>
                  <td>{person.role || "-"}</td>
                  <td>{person.present ? L("Presente", "Present") : L("Ausente", "Absent")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Block>
      )}

      {(ata.agenda.length > 0 || ata.summary.pt) && (
        <Block title={L("Pauta e resumo", "Agenda and summary")}>
          {ata.agenda.length > 0 && (
            <ol className="mb-3 grid gap-x-6 gap-y-1 sm:grid-cols-2">
              {ata.agenda.map((topic, index) => (
                <li key={index} className="flex gap-2">
                  <span className="mf-num font-semibold">{String(index + 1).padStart(2, "0")}</span>
                  <Bi pt={topic.pt} en={topic.en} view={view} />
                </li>
              ))}
            </ol>
          )}
          <Bi pt={ata.summary.pt} en={ata.summary.en} view={view} className="leading-relaxed" />
        </Block>
      )}

      <Block title={L("Assuntos tratados", "Items discussed")}>
        <table>
          <thead>
            <tr>
              <th className="w-[62px]">Item</th>
              <th className="w-[58px]">{L("Origem", "Origin")}</th>
              <th className="w-[52px]">{L("Data", "Date")}</th>
              <th className="w-[38px]">{L("Prédio", "Bldg.")}</th>
              <th>{L("Assunto", "Subject")}</th>
              <th className="w-[78px]">Status</th>
              <th className="w-[76px]">Resp.</th>
              <th className="w-[58px]">{L("Prazo", "Due")}</th>
              <th className="w-[46px]">{L("Risco", "Risk")}</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => {
              const section = sectionOf(group.section);
              return [
                <tr key={`s-${group.section}`} className="mf-row-section">
                  <td className="mf-num">{group.section}</td>
                  <td colSpan={8}>{L(section.pt, section.en)}</td>
                </tr>,
                ...group.subsections.flatMap(({ sub, items }) => [
                  <tr key={`ss-${sub.code}`} className="mf-row-subsection">
                    <td className="mf-num">{sub.code}</td>
                    <td colSpan={8}>{L(sub.pt, sub.en)}</td>
                  </tr>,
                  ...items.map((item) => (
                    <tr
                      key={item.id}
                      className={onEditItem ? "mf-item cursor-pointer" : undefined}
                      onClick={onEditItem ? () => onEditItem(item) : undefined}
                      tabIndex={onEditItem ? 0 : undefined}
                      onKeyDown={onEditItem ? (event) => event.key === "Enter" && onEditItem(item) : undefined}
                    >
                      <td className="mf-num font-semibold">
                        {item.number}
                        {item.updates && <div className="mt-0.5 text-[8px] font-bold tracking-wide text-[#777]">{L("ATUALIZ.", "UPDATED")}</div>}
                      </td>
                      <td className="mf-num text-[9.5px] leading-snug">
                        {item.origins.map((origin) => (
                          <div key={origin} className={origin === current ? "font-bold" : "text-[#777]"}>
                            {origin}
                          </div>
                        ))}
                      </td>
                      <td className="mf-num text-[9.5px]">{shortDate(item.firstDate)}</td>
                      <td className="text-center">{item.building && item.building !== "-" ? item.building : "-"}</td>
                      <td>
                        <Bi pt={item.pt} en={item.en} view={view} />
                        {item.isDecision && (
                          <span className="mt-1.5 inline-block border border-black px-1 text-[7.5px] font-bold tracking-[0.1em]">
                            {L("DECISÃO", "DECISION")}
                          </span>
                        )}
                      </td>
                      <td className={item.status === "progress" ? "font-semibold" : ""}>
                        <Bi pt={STATUS[item.status].pt} en={STATUS[item.status].en} view={view} />
                      </td>
                      <td>{item.responsible || "-"}</td>
                      <td className="mf-num text-[9.5px]">
                        {item.deadlineHistory.filter(Boolean).length > 1
                          ? item.deadlineHistory.filter(Boolean).map((deadline, index, all) => (
                              <div key={deadline} className={index < all.length - 1 ? "text-[#999] line-through" : "font-semibold"}>
                                {shortDate(deadline)}
                              </div>
                            ))
                          : item.deadline
                            ? shortDate(item.deadline)
                            : "-"}
                      </td>
                      <td>{L(RISK[item.risk].pt, RISK[item.risk].en)}</td>
                    </tr>
                  )),
                ]),
              ];
            })}
            {ata.items.length === 0 && (
              <tr>
                <td colSpan={9} className="py-6 text-center text-[#888]">
                  {L("Nenhum assunto registrado.", "No items recorded.")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Block>

      {decisions.length > 0 && (
        <Block title={L("Decisões", "Decisions")}>
          <ul className="flex flex-col gap-2">
            {decisions.map((item) => (
              <li key={item.id} className="flex gap-3">
                <span className="mf-num w-[58px] shrink-0 font-semibold">{item.number}</span>
                <Bi pt={item.pt} en={item.en} view={view} />
              </li>
            ))}
          </ul>
        </Block>
      )}

      {actions.length > 0 && (
        <Block title={L("Plano de ação", "Action plan")}>
          <table>
            <thead>
              <tr>
                <th className="w-[62px]">Item</th>
                <th>{L("Ação", "Action")}</th>
                <th className="w-[110px]">{L("Responsável", "Owner")}</th>
                <th className="w-[64px]">{L("Prazo", "Due")}</th>
                <th className="w-[80px]">Status</th>
              </tr>
            </thead>
            <tbody>
              {actions.map((item) => (
                <tr key={item.id}>
                  <td className="mf-num font-semibold">{item.number}</td>
                  <td>
                    <Bi pt={item.pt} en={item.en} view={view} />
                  </td>
                  <td>{item.responsible || "-"}</td>
                  <td className="mf-num">{item.deadline ? shortDate(item.deadline) : "-"}</td>
                  <td>
                    <Bi pt={STATUS[item.status].pt} en={STATUS[item.status].en} view={view} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Block>
      )}

      <Block title={L("Encerramento", "Adjournment")}>
        {ata.nextMeeting && (
          <div className="mb-3 flex gap-3">
            <span className="w-[124px] shrink-0 text-[8.5px] font-semibold uppercase tracking-[0.06em] text-[#444]">
              {L("Próxima reunião", "Next meeting")}
            </span>
            <Bi pt={ata.nextMeeting.pt} en={ata.nextMeeting.en} view={view} />
          </div>
        )}
        <Bi
          view={view}
          pt={`Nada mais havendo a tratar, a reunião foi encerrada${meeting.endTime ? ` às ${meeting.endTime}` : ""}. Os participantes têm 48 horas a partir do recebimento para solicitar correções a esta ata.`}
          en={`There being no further business, the meeting was adjourned${meeting.endTime ? ` at ${meeting.endTime}` : ""}. Participants have 48 hours from receipt to request corrections to these minutes.`}
        />
      </Block>

      <section className="mt-12 grid grid-cols-3 gap-8 break-inside-avoid">
        {[
          { label: L("Elaborada por", "Prepared by"), name: meeting.secretary },
          { label: L("Aprovada por", "Approved by"), name: meeting.approvedBy },
          { label: L("Pelo cliente", "For the client"), name: project.client },
        ].map((signature) => (
          <div key={signature.label} className="text-center">
            <div className="h-10 border-b border-black" />
            <div className="mt-1.5 text-[10px] font-semibold">{signature.name || " "}</div>
            <div className="text-[8.5px] uppercase tracking-[0.08em] text-[#666]">{signature.label}</div>
          </div>
        ))}
      </section>

      <footer className="mt-8 border-t border-[#ccc] pt-2 text-[8px] leading-relaxed text-[#777]">
        <Bi
          view={view}
          pt={`Ata elaborada com apoio de inteligência artificial a partir da ${meeting.source.kind === "transcript" ? "transcrição" : "gravação"} da reunião${approved ? ` e aprovada por ${meeting.approvedBy}` : ", pendente de revisão da MF"}. Documento ${docCode(project, meeting.ar)}.`}
          en={`Minutes prepared with AI assistance from the meeting ${meeting.source.kind === "transcript" ? "transcript" : "recording"}${approved ? ` and approved by ${meeting.approvedBy}` : ", pending MF review"}. Document ${docCode(project, meeting.ar)}.`}
        />
      </footer>
    </article>
  );
}
