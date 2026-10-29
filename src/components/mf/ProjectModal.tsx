"use client";

import { useState, type ChangeEvent } from "react";
import { useCopy } from "@/lib/mf/copy";
import { uid } from "@/lib/mf/format";
import { saveProject } from "@/lib/mf/store";
import type { Project } from "@/lib/mf/types";
import { Button, Field, Input, Modal } from "./ui";

export function ProjectModal({ onClose, onCreated }: { onClose: () => void; onCreated: (project: Project) => void }) {
  const { c } = useCopy();
  const [form, setForm] = useState({ on: "", name: "", client: "", city: "" });
  const [saving, setSaving] = useState(false);
  const valid = form.on.trim() && form.name.trim() && form.client.trim();

  async function create() {
    if (!valid) return;
    setSaving(true);
    const project: Project = {
      id: uid(),
      on: form.on.trim().replace(/^ON\s*/i, ""),
      name: form.name.trim(),
      client: form.client.trim(),
      city: form.city.trim(),
      createdAt: new Date().toISOString(),
    };
    await saveProject(project);
    onCreated(project);
  }

  const set = (key: keyof typeof form) => (event: ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  return (
    <Modal
      title={c.form.newProject}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {c.cancel}
          </Button>
          <Button variant="primary" onClick={create} disabled={!valid} loading={saving}>
            {c.projects.create}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
        <Field label={c.projects.on}>
          <Input value={form.on} onChange={set("on")} placeholder="1210" inputMode="numeric" autoFocus className="mf-num" />
        </Field>
        <Field label={c.projects.name}>
          <Input value={form.name} onChange={set("name")} placeholder="Fábrica de aromas" />
        </Field>
        <Field label={c.projects.client} className="sm:col-span-2">
          <Input value={form.client} onChange={set("client")} placeholder="Cliente S.A." />
        </Field>
        <Field label={c.projects.city} className="sm:col-span-2">
          <Input value={form.city} onChange={set("city")} placeholder="Jundiaí - SP" />
        </Field>
      </div>
    </Modal>
  );
}
