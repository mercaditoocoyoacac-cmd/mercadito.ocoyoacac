"use client";

import { motion, useMotionValue, useTransform } from "framer-motion";
import { useRouter } from "next/navigation";
import { useCallback, useRef } from "react";

const THRESHOLD = 80;
const EDGE_SIZE = 24;

export function SwipeBack({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const x = useMotionValue(0);
  const opacity = useTransform(x, [0, THRESHOLD], [0, 1]);
  const scale = useTransform(x, [0, THRESHOLD], [0.8, 1]);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDragEnd = useCallback(
    (_: unknown, info: { offset: { x: number } }) => {
      if (info.offset.x > THRESHOLD) {
        if (navigator.vibrate) navigator.vibrate(10);
        router.back();
      }
      x.set(0);
    },
    [router, x],
  );

  return (
    <div ref={containerRef} className="relative">
      <motion.div
        className="fixed left-0 top-0 z-40 h-full"
        style={{ width: EDGE_SIZE }}
      />
      <motion.div
        className="fixed left-0 top-0 z-50 flex h-full items-center justify-center"
        style={{ width: 0, x, opacity, scale }}
        drag="x"
        dragConstraints={{ left: 0, right: THRESHOLD + 20 }}
        dragElastic={0.3}
        onDragEnd={handleDragEnd}
        dragMomentum={false}
      >
        <div className="flex h-20 w-10 items-center justify-center rounded-r-2xl bg-[var(--accent)]/10 shadow-lg backdrop-blur-md border border-[var(--accent)]/20">
          <svg className="h-6 w-6 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </div>
      </motion.div>
      <motion.div style={{ x }}>{children}</motion.div>
    </div>
  );
}
