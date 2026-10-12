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
  const [option, setOption] = useState<Option>("KV-2045");
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

  const cards: Record<Option, { title: string; note: string; tone: "ok" | "alert" }> = mode === "original"
    ? {
      "KV-2044": { title: "On the dock", note: `Was on Vehicle A. Needs ${shipments["KV-2044"].pallets} spaces, and Vehicle B has ${free.length} free.`, tone: "alert" },
      "KV-2045": { title: "On the dock", note: `Was on Vehicle A. Needs ${fairholt.pallets} spaces, and Vehicle B has ${free.length} free.`, tone: "alert" },
    }
    : {
      "KV-2044": { title: "Fits on Vehicle B", note: `Stop ${movedStop}, after Hollin Yard. Arrives ${moved?.arrive}.`, tone: "ok" },
      "KV-2045": { title: "Stays on the dock", note: `Needs ${fairholt.pallets} spaces. Vehicle B has ${free.length} left.`, tone: "alert" },
    };

  return (
    <Example
      title={`Vehicle A off the road · ${operation.name} (fictional)`}
      note="Starts from a recorded vehicle-status update"
      outcome={{
        start: <p><strong>Vehicle A is unavailable before departure.</strong> Vehicle B has some remaining capacity.</p>,
        finding: <p><strong>One delivery moves onto Vehicle B.</strong> Fairholt doesn’t fit.</p>,
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
              {(Object.keys(cards) as Option[]).map((id) => (
                <button key={id} type="button" aria-pressed={option === id} data-tone={cards[id].tone} onClick={() => setOption(id)}>
                  <span className={styles.optionName}>{cards[id].title}</span>
                  <span className={styles.optionMeta}>{id} · {places[shipments[id].to].name} · {shipments[id].pallets} pallets</span>
                  <span className={styles.optionNote}>{cards[id].note}</span>
                </button>
              ))}
            </div>
            <button type="button" className={styles.draftToggle} aria-expanded={draft} onClick={() => setDraft(!draft)}>
              {draft ? "Hide customer update" : "Preview customer update"} <ArrowRight size={14} aria-hidden="true" />
            </button>
            {draft && (
              <div className={styles.draft}>
                <p className={styles.draftLabel}>Draft update. Not sent.</p>
                <p className={styles.draftText}>We’re revising your delivery time. We’ll confirm the new window.</p>
                <p className={styles.draftMeta}>For the Fairholt customer. Dispatch has to approve it first.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Example>
  );
}
