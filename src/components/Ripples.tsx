"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useState, type ReactNode } from "react";

type Ripple = { id: number; x: number; y: number };

// Wraps a full-screen surface. A tap or click anywhere sends one thin ring out
// from the touch point. Links inside still work; the ring is decoration.
export function Ripples({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const [ripples, setRipples] = useState<Ripple[]>([]);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const id = Date.now() + Math.random();
    setRipples((r) => [...r.slice(-4), { id, x: e.clientX, y: e.clientY }]);
  }, []);

  return (
    <div className={`relative ${className}`} onPointerDown={onPointerDown}>
      {children}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-10 overflow-hidden"
      >
        <AnimatePresence>
          {ripples.map((r) => (
            <motion.span
              key={r.id}
              className="absolute rounded-full border border-sky/50"
              style={{
                left: r.x,
                top: r.y,
                translateX: "-50%",
                translateY: "-50%",
              }}
              initial={{ width: 0, height: 0, opacity: 0.8 }}
              animate={{ width: "70vmax", height: "70vmax", opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
              onAnimationComplete={() =>
                setRipples((list) => list.filter((x) => x.id !== r.id))
              }
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
