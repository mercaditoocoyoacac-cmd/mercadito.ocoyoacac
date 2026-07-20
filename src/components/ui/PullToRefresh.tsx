"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

const THRESHOLD = 80;
const MAX_PULL = 160;

type Phase = "idle" | "pulling" | "ready" | "refreshing";

export function PullToRefresh({
  children,
  onRefresh,
}: {
  children: React.ReactNode;
  onRefresh?: () => Promise<void>;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const startY = useRef(0);
  const pulling = useRef(false);
  const pullRaw = useMotionValue(0);
  const pullSpring = useSpring(pullRaw, { stiffness: 300, damping: 30, mass: 0.5 });
  const rotate = useTransform(pullSpring, [0, THRESHOLD], [180, 0]);
  const opacity = useTransform(pullSpring, [0, 20], [0, 1]);
  const scale = useTransform(pullSpring, [0, THRESHOLD], [0.5, 1]);
  const contentY = useTransform(pullSpring, [0, MAX_PULL], [0, MAX_PULL]);
  const indicatorH = useTransform(pullSpring, [0, MAX_PULL], [0, MAX_PULL]);

  const refresh = useCallback(async () => {
    setPhase("refreshing");
    try {
      if (onRefresh) {
        await onRefresh();
      } else {
        window.location.reload();
      }
    } finally {
      setPhase("idle");
      pullRaw.set(0);
    }
  }, [onRefresh, pullRaw]);

  useEffect(() => {
    const el = document.documentElement;

    function onTouchStart(e: TouchEvent) {
      if (window.scrollY > 5) return;
      if (phase === "refreshing") return;
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    }

    function onTouchMove(e: TouchEvent) {
      if (!pulling.current) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) {
        pullRaw.set(0);
        setPhase("idle");
        return;
      }
      e.preventDefault();
      const dist = Math.min(dy * 0.4, MAX_PULL);
      pullRaw.set(dist);
      const wasReady = phase === "ready";
      const nowReady = dist >= THRESHOLD;
      setPhase(nowReady ? "ready" : "pulling");
      if (nowReady && !wasReady && navigator.vibrate) {
        navigator.vibrate(12);
      }
    }

    function onTouchEnd() {
      if (!pulling.current) return;
      pulling.current = false;
      if (phase === "ready") {
        refresh();
      } else {
        setPhase("idle");
        pullRaw.set(0);
      }
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [phase, refresh, pullRaw]);

  return (
    <div className="relative overflow-hidden">
      <motion.div
        className="pointer-events-none fixed left-0 right-0 z-50 flex items-center justify-center overflow-hidden"
        style={{ top: 0, height: indicatorH }}
      >
        <motion.div
          className="flex items-center justify-center"
          style={{ opacity, scale }}
        >
          {phase === "refreshing" ? (
            <div className="flex items-center gap-2 text-sm font-medium text-[var(--accent)]">
              <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Actualizando...
            </div>
          ) : (
            <motion.svg
              className="h-6 w-6 text-[var(--accent)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              style={{ rotate }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </motion.svg>
          )}
        </motion.div>
      </motion.div>
      <motion.div style={{ y: contentY }}>{children}</motion.div>
    </div>
  );
}
