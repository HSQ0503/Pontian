import type { ReactNode } from "react";
import { Check } from "./brand";
import { Window } from "./visuals";

type TagTone = "flag" | "ok" | "alert" | "ink" | "quiet";

const TAG_TONE: Record<TagTone, string> = {
  flag: "bg-pt-yellow text-pt-ink",
  ok: "bg-[#e9f6ef] text-[#0f5c3c]",
  alert: "bg-[#fdecee] text-[#a3101c]",
  ink: "bg-pt-ink text-white",
  quiet: "bg-pt-paper text-pt-muted",
};

function Tag({ tone, children }: { tone: TagTone; children: ReactNode }) {
  return <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none ${TAG_TONE[tone]}`}>{children}</span>;
}

function Caption({ children }: { children: ReactNode }) {
  return <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-pt-muted">{children}</p>;
}

function Photo({ label }: { label: string }) {
  return (
    <span className="relative block aspect-[4/3] overflow-hidden rounded-[8px] bg-[linear-gradient(135deg,#d6d1c6,#a8a294)]">
      <span className="absolute bottom-1.5 left-1.5 rounded-[5px] bg-white/85 px-1.5 py-0.5 text-[10px] font-semibold">{label}</span>
    </span>
  );
}

function Stages({ stages, current }: { stages: string[]; current: number }) {
  return (
    <ol className="flex flex-wrap gap-1.5 text-[11px] font-semibold">
      {stages.map((stage, index) => (
        <li
          key={stage}
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 ${index < current ? "bg-pt-paper text-pt-muted" : index === current ? "bg-pt-ink text-white" : "ring-1 ring-inset ring-pt-line text-pt-muted"}`}
        >
          {index < current && <Check className="size-3" />}
          {stage}
        </li>
      ))}
    </ol>
  );
}

function Person({ initials, name, role }: { initials: string; name: string; role: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-pt-blue text-[10px] font-bold text-white">{initials}</span>
      <span className="leading-4">
        <span className="block text-[12px] font-semibold">{name}</span>
        <span className="block text-[11px] text-pt-muted">{role}</span>
      </span>
    </span>
  );
}

function RevisionReview() {
  const fields = [
    { field: "Operating weight", before: "1,240 kg", after: "1,380 kg" },
    { field: "Power supply", before: "380 V", after: "380 V" },
    { field: "Outlet connection", before: "DN 80", after: "DN 100" },
  ];
  const deliverables: { code: string; title: string; discipline: string; tag: [TagTone, string] }[] = [
    { code: "STR 201", title: "Equipment base details", discipline: "Structural", tag: ["flag", "Lead review"] },
    { code: "MEC 310", title: "Pump room layout", discipline: "Mechanical", tag: ["flag", "Lead review"] },
    { code: "ELE 114", title: "Single line diagram", discipline: "Electrical", tag: ["ok", "No change"] },
  ];
  return (
    <div role="img" aria-label="A revision comparison for an equipment data sheet, highlighting changed values and the dependent deliverables awaiting discipline lead review.">
      <Window title="Pump data sheet" meta="Rev B to Rev C">
        <div className="space-y-4 px-5 pb-5 pt-4 text-[12px]">
          <table className="w-full text-left">
            <thead className="text-[11px] text-pt-muted">
              <tr><th className="pb-2 font-semibold">Field</th><th className="pb-2 font-semibold">Rev B</th><th className="pb-2 font-semibold">Rev C</th></tr>
            </thead>
            <tbody>
              {fields.map(({ field, before, after }) => (
                <tr key={field} className="border-t border-pt-line">
                  <td className="py-2 font-semibold">{field}</td>
                  <td className="py-2 text-pt-muted">{before}</td>
                  <td className="py-2"><span className={`rounded-[5px] px-1.5 py-0.5 font-semibold ${before === after ? "" : "bg-[#fff3b0]"}`}>{after}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div>
            <Caption>Dependent deliverables</Caption>
            <ul className="mt-2 space-y-2">
              {deliverables.map(({ code, title, discipline, tag }) => (
                <li key={code} className="flex items-center justify-between gap-3 rounded-[10px] px-3 py-2 ring-1 ring-inset ring-pt-line">
                  <span>
                    <span className="block font-semibold">{code} {title}</span>
                    <span className="block text-[11px] text-pt-muted">{discipline}</span>
                  </span>
                  <Tag tone={tag[0]}>{tag[1]}</Tag>
                </li>
              ))}
            </ul>
          </div>
          <p className="rounded-[10px] bg-pt-paper px-3 py-2 font-semibold">Review summary prepared. Waiting on two discipline leads.</p>
        </div>
      </Window>
    </div>
  );
}

function ExceptionQueue() {
  const exceptions: { job: string; issue: string; tag: [TagTone, string] }[] = [
    { job: "Job 2281", issue: "Delivery running late", tag: ["alert", "Delayed"] },
    { job: "Job 2274", issue: "Proof of delivery missing", tag: ["flag", "Paperwork"] },
    { job: "Job 2269", issue: "Handoff at depot missed", tag: ["quiet", "Assigned"] },
  ];
  return (
    <div role="img" aria-label="An exception queue with a delayed delivery selected, showing the driver's update, the affected stops, and a customer message waiting for dispatch approval.">
      <Window title="Exceptions" meta="Today">
        <div className="space-y-4 px-5 pb-5 pt-4 text-[12px]">
          <ul className="space-y-2">
            {exceptions.map(({ job, issue, tag }, index) => (
              <li key={job} className={`flex items-center justify-between gap-3 rounded-[10px] px-3 py-2 ${index === 0 ? "ring-2 ring-inset ring-pt-action" : "ring-1 ring-inset ring-pt-line"}`}>
                <span>
                  <span className="block font-semibold">{job}</span>
                  <span className="block text-[11px] text-pt-muted">{issue}</span>
                </span>
                <Tag tone={tag[0]}>{tag[1]}</Tag>
              </li>
            ))}
          </ul>
          <div className="space-y-2 rounded-[12px] bg-pt-paper px-3.5 py-3">
            <p><span className="font-semibold">Driver update:</span> running behind after the previous stop.</p>
            <p><span className="font-semibold">Also affected:</span> two later stops on this route.</p>
          </div>
          <div className="rounded-[12px] px-3.5 py-3 ring-1 ring-inset ring-pt-line">
            <Caption>Customer update, draft</Caption>
            <p className="mt-1.5 leading-[18px]">Your delivery is now expected this afternoon. We will confirm a time as soon as it is set.</p>
            <div className="mt-3 flex justify-end gap-2 font-semibold">
              <span className="rounded-[10px] px-3 py-1.5 ring-1 ring-pt-line">Edit</span>
              <span className="rounded-[10px] bg-pt-action px-3 py-1.5 text-white">Approve and send</span>
            </div>
          </div>
        </div>
      </Window>
    </div>
  );
}

function IssueRecord() {
  const linked = [
    { label: "Work order", value: "WO 4471, bracket run" },
    { label: "Procedure", value: "Feeder changeover, version 7, approved" },
    { label: "Maintenance", value: "Two earlier notes on this feeder" },
  ];
  return (
    <div role="img" aria-label="A recurring production issue linked to its work order, approved procedure, and earlier maintenance notes, with follow-up assigned to a shift lead.">
      <Window title="Issue 0412" meta="Recurring">
        <div className="space-y-4 px-5 pb-5 pt-4 text-[12px]">
          <div>
            <p className="text-[15px] font-semibold">Feeder jam, line 2</p>
            <p className="mt-0.5 text-pt-muted">Recorded by the operator at start of shift</p>
          </div>
          <dl className="divide-y divide-pt-line rounded-[12px] px-3.5 ring-1 ring-inset ring-pt-line">
            {linked.map(({ label, value }) => (
              <div key={label} className="grid grid-cols-[88px_1fr] gap-3 py-2.5">
                <dt className="text-pt-muted">{label}</dt>
                <dd className="font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="flex items-center justify-between gap-3">
            <Person initials="SL" name="Shift lead" role="Reviewing the response" />
            <Tag tone="flag">Follow-up assigned</Tag>
          </div>
          <p className="flex items-center gap-2 rounded-[10px] bg-[#e9f6ef] px-3 py-2 font-semibold text-[#0f5c3c]">
            <Check className="size-3.5" />
            Reviewed resolution saved with this issue
          </p>
        </div>
      </Window>
    </div>
  );
}

function LocationComparison() {
  const categories = [
    { name: "Essentials", a: 46, b: 44 },
    { name: "Seasonal", a: 78, b: 52 },
    { name: "Accessories", a: 64, b: 38 },
  ];
  return (
    <div role="img" aria-label="Two locations compared under the same definitions: similar revenue, different product margin by category, and a follow-up action assigned to a location manager.">
      <Window title="Location comparison" meta="Same definitions">
        <div className="space-y-5 px-5 pb-5 pt-4 text-[12px]">
          <div>
            <Caption>Revenue</Caption>
            <ul className="mt-2.5 space-y-2.5">
              {[["Location A", 84], ["Location B", 81]].map(([name, share]) => (
                <li key={name} className="grid grid-cols-[76px_1fr] items-center gap-3">
                  <span className="font-semibold">{name}</span>
                  <span className="h-3 rounded-full bg-pt-paper"><span className={`block h-full rounded-full ${name === "Location A" ? "bg-pt-ink" : "bg-pt-blue"}`} style={{ width: `${share}%` }} /></span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Caption>Product margin by category</Caption>
              <span className="flex gap-3 text-[11px] text-pt-muted">
                <span className="flex items-center gap-1.5"><span className="size-2 rounded-[2px] bg-pt-ink" />A</span>
                <span className="flex items-center gap-1.5"><span className="size-2 rounded-[2px] bg-pt-blue" />B</span>
              </span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {categories.map(({ name, a, b }) => (
                <div key={name}>
                  <div className="flex h-24 items-end gap-1.5 rounded-[10px] bg-pt-paper px-3 pt-3">
                    <span className="flex-1 rounded-t-[3px] bg-pt-ink" style={{ height: `${a}%` }} />
                    <span className="flex-1 rounded-t-[3px] bg-pt-blue" style={{ height: `${b}%` }} />
                  </div>
                  <p className="mt-1.5 text-center text-[11px] font-semibold">{name}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-pt-line pt-4">
            <Person initials="LM" name="Review accessories mix" role="Location B manager" />
            <Tag tone="quiet">Check next period</Tag>
          </div>
        </div>
      </Window>
    </div>
  );
}

function JobRecord() {
  const checklist = ["House wash, all sides", "Back patio and walkway", "Gate code in job notes"];
  return (
    <div role="img" aria-label="A job record moving from inquiry to payment, with the crew's approved scope checklist, completion photos, and an invoice awaiting payment.">
      <Window title="Job 318, house wash" meta="Completed today">
        <div className="space-y-4 px-5 pb-5 pt-4 text-[12px]">
          <Stages stages={["Inquiry", "Estimate", "Scheduled", "Completed", "Invoiced", "Paid"]} current={4} />
          <div className="rounded-[12px] px-3.5 py-3 ring-1 ring-inset ring-pt-line">
            <div className="flex items-center justify-between">
              <p className="font-semibold">Crew A, approved scope</p>
              <span className="text-[11px] text-pt-muted">3 of 3</span>
            </div>
            <ul className="mt-2.5 space-y-2">
              {checklist.map((item) => (
                <li key={item} className="flex items-center gap-2 font-medium">
                  <span className="grid size-4 place-items-center rounded-[5px] bg-pt-ink text-white"><Check className="size-3" /></span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Photo label="Before" />
            <Photo label="After" />
            <Photo label="Patio" />
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-pt-line pt-4">
            <span>
              <span className="block font-semibold">Invoice sent</span>
              <span className="block text-[11px] text-pt-muted">Photos attached to the job</span>
            </span>
            <Tag tone="flag">Payment pending</Tag>
          </div>
        </div>
      </Window>
    </div>
  );
}

function AssetRecord() {
  return (
    <div role="img" aria-label="An excavator's asset record showing it under maintenance after a damage report at return, with photos attached and a conflict with an upcoming reservation to resolve.">
      <Window title="Unit EX 14, compact excavator" meta="Not available">
        <div className="space-y-4 px-5 pb-5 pt-4 text-[12px]">
          <Stages stages={["Reserved", "On rent", "Returned", "Inspection", "Maintenance", "Ready"]} current={4} />
          <div className="grid grid-cols-[1fr_1fr_1.3fr] items-center gap-2">
            <Photo label="Hose" />
            <Photo label="Track" />
            <p className="pl-1 leading-[17px]">
              <span className="block font-semibold">Hydraulic hose damage</span>
              <span className="text-pt-muted">Noted at return, maintenance task open</span>
            </p>
          </div>
          <div className="rounded-[12px] bg-[#fdecee] px-3.5 py-3 text-[#7d0c16]">
            <p className="font-semibold">Booked for Thursday by another customer</p>
            <p className="mt-0.5">Resolve before confirming availability.</p>
            <div className="mt-3 flex flex-wrap gap-2 font-semibold">
              <span className="rounded-[10px] bg-white px-3 py-1.5 text-pt-ink">Assign substitute</span>
              <span className="rounded-[10px] bg-white px-3 py-1.5 text-pt-ink">Move date</span>
            </div>
          </div>
        </div>
      </Window>
    </div>
  );
}

export const industryVisuals: Record<string, () => ReactNode> = {
  "design-engineering": RevisionReview,
  logistics: ExceptionQueue,
  manufacturing: IssueRecord,
  retail: LocationComparison,
  "property-services": JobRecord,
  "equipment-rental": AssetRecord,
};
