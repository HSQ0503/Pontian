"use client";

import { useMemo } from "react";
import { bx, ContactShadow, Ground, ModelCanvas, Part, standard, type SceneLabel } from "./scene-kit";
import type { SceneRuntime } from "./model-frame";

const BODY = standard("#e4e3df", 0.8);

export default function PlaceholderScene(runtime: SceneRuntime) {
  const block = useMemo(() => bx([-1.5, 1.5], [0, 1.6], [-1, 1], 0.04), []);
  const labels: SceneLabel[] = [{ id: "block", at: [0, 1.6, 0], title: "Model in progress", state: "select" }];
  return (
    <ModelCanvas {...runtime} view={{ position: [8, 6, 9], target: [0, 0.6, 0] }} labels={labels} extent={6}>
      <Ground />
      <ContactShadow width={4.4} depth={3} />
      <Part geometry={block} material={BODY} selected />
    </ModelCanvas>
  );
}
