"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect } from "react";

// One soft pool of sky blue behind everything. Follows the pointer on desktop
// and drifts on its own where there is no pointer. Low opacity keeps the page
// black and lets the light read as atmosphere.
export function Glow({ intensity = 0.2 }: { intensity?: number }) {
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.4);
  const sx = useSpring(x, { stiffness: 28, damping: 22, mass: 1.4 });
  const sy = useSpring(y, { stiffness: 28, damping: 22, mass: 1.4 });
  const left = useTransform(sx, (v) => `${v * 100}vw`);
  const top = useTransform(sy, (v) => `${v * 100}vh`);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    if (fine) {
      const onMove = (e: PointerEvent) => {
        x.set(e.clientX / window.innerWidth);
        y.set(e.clientY / window.innerHeight);
      };
      window.addEventListener("pointermove", onMove, { passive: true });
      return () => window.removeEventListener("pointermove", onMove);
    }
    let t = 0;
    const id = window.setInterval(() => {
      t += 0.04;
      x.set(0.5 + Math.sin(t) * 0.3);
      y.set(0.42 + Math.cos(t * 0.7) * 0.24);
    }, 120);
    return () => window.clearInterval(id);
  }, [x, y]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      <motion.div
        className="absolute h-[80vmax] w-[80vmax] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          left,
          top,
          background: `radial-gradient(closest-side, rgba(143,208,250,${intensity}) 0%, rgba(143,208,250,${intensity * 0.3}) 32%, rgba(1,2,6,0) 68%)`,
          filter: "blur(28px)",
        }}
      />
    </div>
  );
}
