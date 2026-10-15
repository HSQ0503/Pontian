"use client";

import dynamic from "next/dynamic";
import { ModelFigure, ModelViewport } from "./model-frame";

const Scene = dynamic(() => import("./placeholder-scene"), { ssr: false });

function Drawing() {
  return (
    <svg viewBox="0 0 320 200" aria-hidden="true">
      <rect x="110" y="70" width="100" height="60" fill="#fff" stroke="#17191a" />
    </svg>
  );
}

export default function CanesModel() {
  return (
    <ModelFigure title="One job, from inquiry to payment">
      <ModelViewport label="Placeholder model." fallback={<Drawing />} scene={(runtime) => <Scene {...runtime} />} />
    </ModelFigure>
  );
}

export function CanesPreview() {
  return <Drawing />;
}
