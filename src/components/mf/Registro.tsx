"use client";

import { BookOpen, Building, FileSpreadsheet, Plus, Search, Trash } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCopy } from "@/lib/mf/copy";
import { arCode, download, shortDate } from "@/lib/mf/format";
import { buildRegistry, groupItems } from "@/lib/mf/registry";
import { SECTIONS, sectionOf, STATUS } from "@/lib/mf/sections";
import { deleteProject, useMf } from "@/lib/mf/store";
import type { ItemStatus, RgEntry } from "@/lib/mf/types";
import { registryWorkbook } from "@/lib/mf/xlsx";
import { DueLabel } from "./Overview";
import { ProjectModal } from "./ProjectModal";
import { Button, Card, cx, Drawer, Empty, Input, ItemStatusTag, LoadingPage, Modal, Page, PageHeader, RiskBars, Segmented, Select, Tag } from "./ui";

export function Registro({ initialProject }: { initialProject?: string }) {
  const mf = useMf();
  const { c, lang } = useCopy();
  const [projectId, setProjectId] = useState(initialProject ?? "");
  const [status, setStatus] = useState<ItemStatus | "all">("all");
  const [section, setSection] = useState(0);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<RgEntry | null>(null);
  if (!mf.ready) return <LoadingPage />;

  const project = mf.projects.find((p) => p.id === projectId) ?? mf.projects[0];
  if (!project) {
    return (
      <Page>
        <Empty icon={<BookOpen className="size-5" />} title={c.registry.title} lead={c.registry.empty} />
      </Page>
    );
  }
  const registry = buildRegistry(mf.meetings, project.id);
  const entries = registry.entries.filter((entry) => {
    if (status !== "all" && entry.status !== status) return false;
    if (section && entry.section !== section) return false;
    if (!query) return true;
    return `${entry.number} ${entry.pt} ${entry.en} ${entry.responsible}`.toLowerCase().includes(query.toLowerCase());
  });
  const counts = {
    all: registry.entries.length,
    info: registry.entries.filter((e) => e.status === "info").length,
    progress: registry.entries.filter((e) => e.status === "progress").length,
    closed: registry.entries.filter((e) => e.status === "closed").length,
  };

  return (
    <Page wide>
      <PageHeader
        eyebrow={<span className="mf-num">ON {project.on} · {project.client}</span>}
        title={c.registry.title}
        lead={c.registry.lead}
        actions={
          <Button
            icon={<FileSpreadsheet className="size-4" />}
            disabled={!registry.entries.length}
            onClick={() => download(`${project.on}-RG-G-001.xlsx`, registryWorkbook(project, "REGISTRO GERAL DE INFORMAÇÕES DO PROJETO / PROJECT GENERAL INFORMATION LOG", registry.entries, registry.subsections))}
          >
            {c.registry.export}
          </Button>
        }
      />

      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <Select value={project.id} onChange={(e) => setProjectId(e.target.value)} className="lg:w-96">
          {mf.projects.map((p) => (
            <option key={p.id} value={p.id}>
              ON {p.on} · {p.name}
            </option>
          ))}
        </Select>
        <div className="overflow-x-auto">
          <Segmented
            value={status}
            onChange={setStatus}
            options={(["all", "progress", "info", "closed"] as const).map((value) => ({
              value,
              label: (
                <>
                  {value === "all" ? c.all : STATUS[value][lang]}
                  <span className="mf-num text-[10.5px] opacity-60">{counts[value]}</span>
                </>
              ),
            }))}
          />
        </div>
        <Select value={section} onChange={(e) => setSection(Number(e.target.value))} className="lg:w-64">
          <option value={0}>{c.registry.all}</option>
          {SECTIONS.map((s) => (
            <option key={s.n} value={s.n}>
              {s.n} · {s[lang]}
            </option>
          ))}
        </Select>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-mf-600" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={c.search} className="pl-9" />
        </div>
      </div>

      {registry.entries.length === 0 ? (
        <div className="mt-6">
          <Empty icon={<BookOpen className="size-5" />} title={c.registry.title} lead={c.registry.empty} action={<Button href={`/mf/atas/nova?projeto=${project.id}`} icon={<Plus className="size-4" />}>{c.newAta}</Button>} />
        </div>
      ) : (
        <Card className="mt-4 overflow-hidden">
          <div className="mf-scroll overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-[13px]">
              <thead className="border-b border-mf-300 text-[11.5px] text-mf-600">
                <tr>
                  <th className="w-24 px-4 py-3 font-semibold">Item</th>
                  <th className="w-28 px-4 py-3 font-semibold">{lang === "pt" ? "Origem" : "Origin"}</th>
                  <th className="px-4 py-3 font-semibold">{lang === "pt" ? "Assunto" : "Subject"}</th>
                  <th className="w-32 px-4 py-3 font-semibold">Status</th>
                  <th className="w-40 px-4 py-3 font-semibold">{c.item.responsible}</th>
                  <th className="w-40 px-4 py-3 font-semibold">{c.item.deadline}</th>
                  <th className="w-24 px-4 py-3 font-semibold">{c.item.risk}</th>
                </tr>
              </thead>
              <tbody>
                {groupItems(entries, registry.subsections).map((group) => [
                  <tr key={`s${group.section}`} className="border-b border-mf-300 bg-mf-200">
                    <td className="mf-num px-4 py-2 text-[12px] font-semibold text-white">{group.section}</td>
                    <td colSpan={6} className="px-4 py-2 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-white">
                      {sectionOf(group.section)[lang]}
                    </td>
                  </tr>,
                  ...group.subsections.flatMap(({ sub, items }) => [
                    <tr key={`ss${sub.code}`} className="border-b border-mf-300 bg-mf-150">
                      <td className="mf-num px-4 py-1.5 text-[11.5px] text-mf-800">{sub.code}</td>
                      <td colSpan={6} className="px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-mf-700">
                        {lang === "pt" ? sub.pt : sub.en}
                      </td>
                    </tr>,
                    ...items.map((entry) => (
                      <tr key={entry.number} onClick={() => setSelected(entry)} className="cursor-pointer border-b border-mf-300 align-top transition-colors last:border-0 hover:bg-mf-150">
                        <td className="mf-num px-4 py-3.5 text-[12.5px] font-semibold text-white">{entry.number}</td>
                        <td className="mf-num px-4 py-3.5 text-[11.5px] leading-relaxed text-mf-700">
                          {entry.origins.map((origin) => (
                            <div key={origin}>{origin}</div>
                          ))}
                        </td>
                        <td className="px-4 py-3.5 leading-relaxed text-mf-900">
                          {lang === "pt" ? entry.pt : entry.en}
                          {entry.isDecision && <Tag className="ml-2 h-[18px] px-1.5 text-[9px]">{c.item.decision}</Tag>}
                        </td>
                        <td className="px-4 py-3.5">
                          <ItemStatusTag status={entry.status} lang={lang} />
                        </td>
                        <td className="px-4 py-3.5 text-[12.5px] text-mf-800">{entry.responsible || "-"}</td>
                        <td className="px-4 py-3.5">
                          {entry.status === "progress" ? <DueLabel deadline={entry.deadline} /> : <span className="mf-num text-[12px] text-mf-600">{entry.deadline ? shortDate(entry.deadline) : "-"}</span>}
                        </td>
                        <td className="px-4 py-3.5">
                          <RiskBars risk={entry.risk} lang={lang} />
                        </td>
                      </tr>
                    )),
                  ]),
                ])}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {selected && (
        <Drawer title={<span className="mf-num">{selected.number}</span>} onClose={() => setSelected(null)}>
          <div className="flex flex-wrap items-center gap-2">
            <ItemStatusTag status={selected.status} lang={lang} />
            <RiskBars risk={selected.risk} lang={lang} />
            {selected.responsible && <span className="text-[12.5px] text-mf-800">· {selected.responsible}</span>}
          </div>
          <p className="mt-4 text-[14px] leading-relaxed text-white">{selected.pt}</p>
          <p className="mt-2 text-[13px] italic leading-relaxed text-mf-700">{selected.en}</p>
          <h3 className="mf-eyebrow mt-8 text-mf-600">{c.registry.history}</h3>
          <ol className="mt-4 flex flex-col">
            {selected.history.map((step, index) => {
              const meeting = mf.meetings.find((m) => m.projectId === project.id && arCode(m.ar) === step.origin);
              return (
                <li key={`${step.origin}-${index}`} className="relative flex gap-4 pb-6 last:pb-0">
                  {index < selected.history.length - 1 && <span className="absolute left-[5px] top-4 h-full w-px bg-mf-400" />}
                  <span className={cx("relative mt-1.5 size-[11px] shrink-0 rounded-xl border-2", index === selected.history.length - 1 ? "border-white bg-white" : "border-mf-600 bg-mf-100")} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {meeting ? (
                        <Link href={`/mf/atas/${meeting.id}`} className="mf-num text-[12.5px] font-semibold text-white hover:underline">
                          {step.origin}
                        </Link>
                      ) : (
                        <span className="mf-num text-[12.5px] font-semibold text-white">{step.origin}</span>
                      )}
                      <span className="mf-num text-[11.5px] text-mf-600">{shortDate(step.date)}</span>
                      <ItemStatusTag status={step.status} lang={lang} />
                    </div>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-mf-800">{lang === "pt" ? step.pt : step.en}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </Drawer>
      )}
    </Page>
  );
}

export function Projetos() {
  const mf = useMf();
  const { c } = useCopy();
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  if (!mf.ready) return <LoadingPage />;

  return (
    <Page wide>
      <PageHeader
        eyebrow={c.groups.operation}
        title={c.projects.title}
        lead={c.projects.lead}
        actions={
          <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
            {c.form.newProject}
          </Button>
        }
      />
      {mf.projects.length === 0 ? (
        <div className="mt-8">
          <Empty icon={<Building className="size-5" />} title={c.projects.title} lead={c.projects.lead} action={<Button variant="primary" onClick={() => setCreating(true)}>{c.form.newProject}</Button>} />
        </div>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {mf.projects.map((project) => {
            const meetings = mf.meetings.filter((m) => m.projectId === project.id);
            const open = buildRegistry(mf.meetings, project.id).entries.filter((e) => e.status === "progress").length;
            const last = meetings[0];
            return (
              <Card key={project.id} className="group flex flex-col p-6 transition-colors hover:border-mf-600">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="mf-eyebrow text-mf-600">ON</div>
                    <div className="mf-num mt-1 text-[34px] font-medium leading-none text-white">{project.on}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    {project.demo && <Tag>{c.demo}</Tag>}
                    <button type="button" aria-label={c.delete} onClick={() => setRemoving(project.id)} className="flex size-8 items-center justify-center rounded-xl text-mf-600 opacity-0 transition-opacity hover:bg-mf-200 hover:text-white group-hover:opacity-100">
                      <Trash className="size-3.5" />
                    </button>
                  </div>
                </div>
                <h2 className="mt-5 text-[16px] font-semibold text-white">{project.name}</h2>
                <p className="mt-1 text-[12.5px] text-mf-700">
                  {project.client} · {project.city}
                </p>
                <div className="mt-6 grid grid-cols-3 border-t border-mf-300 pt-4">
                  <div>
                    <div className="mf-num text-[18px] text-white">{meetings.length}</div>
                    <div className="text-[11.5px] text-mf-600">{c.projects.atas}</div>
                  </div>
                  <div>
                    <div className="mf-num text-[18px] text-white">{open}</div>
                    <div className="text-[11.5px] text-mf-600">{c.projects.open}</div>
                  </div>
                  <div>
                    <div className="mf-num text-[13px] text-white">{last ? shortDate(last.date) : "-"}</div>
                    <div className="text-[11.5px] text-mf-600">{c.projects.lastMeeting}</div>
                  </div>
                </div>
                <div className="mt-5 flex gap-2">
                  <Button size="sm" variant="primary" href={`/mf/atas/nova?projeto=${project.id}`} icon={<Plus className="size-3.5" />}>
                    {c.newAta}
                  </Button>
                  <Button size="sm" href={`/mf/registro?projeto=${project.id}`} icon={<BookOpen className="size-3.5" />}>
                    {c.projects.openRegistry}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      {creating && (
        <ProjectModal
          onClose={() => setCreating(false)}
          onCreated={(project) => {
            setCreating(false);
            router.push(`/mf/atas/nova?projeto=${project.id}`);
          }}
        />
      )}
      {removing && (
        <Modal
          title={c.delete}
          onClose={() => setRemoving(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setRemoving(null)}>
                {c.cancel}
              </Button>
              <Button
                variant="danger"
                onClick={async () => {
                  await deleteProject(removing);
                  setRemoving(null);
                }}
              >
                {c.delete}
              </Button>
            </>
          }
        >
          <p className="text-[13.5px] text-mf-800">{c.projects.deleteConfirm}</p>
        </Modal>
      )}
    </Page>
  );
}
