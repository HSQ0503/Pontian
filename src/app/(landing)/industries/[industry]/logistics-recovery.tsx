"use client";

import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import styles from "./logistics.module.css";
import { Choice, Example } from "./logistics-visuals";
import { CargoView } from "./logistics-load";
import { operation, places, plans, shipments, stopOf, vehicles } from "./logistics-data";
import { freeSlots, recoveryLayout, recoverySceneItems, slotMark, type RecoveryMode, type SceneTone } from "./logistics-load-plan";
import type { SceneChip } from "./logistics-load-scene";

type Option = "KV-2044" | "KV-2045";

export function DisruptionRecovery() {
  const [mode, setMode] = useState<RecoveryMode>("recovery");
  const [option, setOption] = useState<Option>("KV-2044");
  const [draft, setDraft] = useState(false);
  const layout = useMemo(() => recoveryLayout(mode), [mode]);
  const free = freeSlots(layout);
  const moved = stopOf(plans.recoveryB, "KV-2044");
  const movedStop = plans.recoveryB.stops.findIndex((stop) => stop.shipment === "KV-2044") + 1;
  const fairholt = shipments["KV-2045"];
  const fromVehicleA = new Set(["KV-2044", "KV-2045"]);

  const tones = Object.fromEntries(recoverySceneItems.map((item) => {
    if (item.shipment === option) return [item.key, "selected"];
    const unresolved = item.shipment === "KV-2045" || (mode === "original" && fromVehicleA.has(item.shipment));
    return [item.key, unresolved ? "blocking" : "none"];
  })) as Record<string, SceneTone>;
  const anchor = `${option}-1`;
  const marks = free.map((slot) => slotMark(slot.row, slot.lane, mode === "recovery" && option === "KV-2045" ? "alert" : "ok"));
  const spaces = `${free.length} ${free.length === 1 ? "space" : "spaces"} free on Vehicle B`;
  const chip: SceneChip = mode === "original"
    ? { title: `${option} · from Vehicle A`, detail: `${shipments[option].pallets} pallets · ${spaces}`, tone: shipments[option].pallets <= free.length ? "ok" : "alert" }
    : option === "KV-2044"
      ? { title: `KV-2044 · stop ${movedStop} on Vehicle B`, detail: `Arrives ${moved?.arrive}, window ${moved?.window[0]}–${moved?.window[1]}`, tone: "ok" }
      : { title: `KV-2045 · ${fairholt.pallets} pallets`, detail: `Only ${free.length} ${free.length === 1 ? "space" : "spaces"} left on Vehicle B`, tone: "alert" };

  const details: Record<Option, { status: string; tone: "ok" | "alert"; rows: [string, string][] }> = {
    "KV-2044": {
      status: "Delivery 1 can be reassigned.",
      tone: "ok",
      rows: [
        ["Moves to", `Vehicle B, stop ${movedStop}, after ${places.hollin.name}`],
        ["Window", `Arrives ${moved?.arrive}. Window ${moved?.window[0]}–${moved?.window[1]}.`],
        ["Vehicle B", `${plans.recoveryB.loadedAtDepot} of ${vehicles.B.palletSpaces} spaces. Other stops keep their times.`],
      ],
    },
    "KV-2045": {
      status: "Delivery 2 still needs another option.",
      tone: "alert",
      rows: [
        ["Moves to", `Nowhere yet. It needs ${fairholt.pallets} spaces and Vehicle B has ${vehicles.B.palletSpaces - plans.recoveryB.loadedAtDepot} left.`],
        ["Window", `${fairholt.deliveryWindow[0]}–${fairholt.deliveryWindow[1]} at ${places.fairholt.name}, while Vehicle B is across the area.`],
        ["Still open", "Another truck, a carrier, or a new window with the customer."],
      ],
    },
  };
  const shown = mode === "original"
    ? {
      status: `Delivery ${option === "KV-2044" ? 1 : 2} is affected.`,
      tone: "alert" as const,
      rows: [
        ["Was on", "Vehicle A, now off the road"] as [string, string],
        ["Window", `${shipments[option].deliveryWindow[0]}–${shipments[option].deliveryWindow[1]} at ${places[shipments[option].to].name}`] as [string, string],
        ["Needs", `${shipments[option].pallets} spaces. Vehicle B has ${free.length} free.`] as [string, string],
      ],
    }
    : details[option];

  return (
    <Example
      title={`Vehicle A off the road · ${operation.name} (fictional)`}
      note="Starts from a recorded vehicle-status update"
      outcome={{
        start: <p><strong>Vehicle A is unavailable before departure.</strong> Vehicle B has some remaining capacity.</p>,
        finding: <p><strong>A recovery plan with the remaining gap identified.</strong> One delivery moves. One doesn’t fit.</p>,
        next: <p><strong>Dispatcher confirms the reassignment and reviews the unresolved delivery.</strong></p>,
      }}
    >
      <div className={styles.statusUpdate}>
        <span className={styles.statusTime}>06:30</span>
        <span>Workshop: Vehicle A is unavailable before departure.</span>
        <span className={styles.statusMeta}>Vehicle B leaves at {vehicles.B.departs}</span>
      </div>
      <Choice
        label="Plan to show"
        value={mode}
        onChange={setMode}
        options={[{ value: "original", label: "Original plan" }, { value: "recovery", label: "Proposed partial recovery" }]}
      />
      <div className={styles.loadGrid}>
        <div className={styles.sceneSheet}>
          <CargoView
            items={recoverySceneItems}
            layout={layout}
            tones={tones}
            anchor={anchor}
            marks={marks}
            chip={chip}
            label={`Vehicle B at the depot dock with Vehicle A’s freight, ${mode === "original" ? "original plan" : "proposed partial recovery"}.`}
            onSelect={(shipment) => { if (shipment === "KV-2044" || shipment === "KV-2045") setOption(shipment); }}
            cameras={false}
            initialView="overhead"
          />
        </div>
        <div className={styles.loadSide}>
          <div className={styles.sheet}>
            <div role="group" aria-label="Vehicle A’s deliveries" className={styles.optionList}>
              {(Object.keys(details) as Option[]).map((id, index) => (
                <button key={id} type="button" aria-pressed={option === id} data-tone={mode === "original" ? "alert" : details[id].tone} onClick={() => setOption(id)}>
                  <span className={styles.optionName}>Delivery {index + 1} · {id}</span>
                  <span className={styles.optionMeta}>{places[shipments[id].to].name} · {shipments[id].pallets} pallets</span>
                </button>
              ))}
            </div>
            <p className={styles.optionStatus} data-tone={shown.tone} aria-live="polite">{shown.status}</p>
            <dl className={styles.miniFacts}>
              {shown.rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
            </dl>
            <button type="button" className={styles.draftToggle} aria-expanded={draft} onClick={() => setDraft(!draft)}>
              {draft ? "Hide customer update" : "Preview customer update"} <ArrowRight size={14} aria-hidden="true" />
            </button>
            {draft && (
              <div className={styles.draft}>
                <p className={styles.draftLabel}>Draft update — awaiting approval</p>
                <p className={styles.draftText}>Your delivery schedule is being revised. We will confirm the updated arrival window.</p>
                <p className={styles.draftMeta}>To the KV-2045 customer. Not sent until dispatch approves it.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Example>
  );
}
