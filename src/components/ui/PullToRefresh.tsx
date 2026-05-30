"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const THRESHOLD = 80;
const MAX_PULL = 150;

type Phase = "idle" | "pulling" | "ready" | "refreshing";

export function PullToRefresh({ children, onRefresh }: { children: React.ReactNode; onRefresh?: () => Promise<void> }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [pullDist, setPullDist] = useState(0);
  const startY = useRef(0);
  const pulling = useRef(false);

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
      setPullDist(0);
    }
  }, [onRefresh]);

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
      if (dy <= 0) { setPullDist(0); setPhase("idle"); return; }
      e.preventDefault();
      const dist = Math.min(dy * 0.5, MAX_PULL);
      setPullDist(dist);
      setPhase(dist >= THRESHOLD ? "ready" : "pulling");
    }

    function onTouchEnd() {
      if (!pulling.current) return;
      pulling.current = false;
      if (phase === "ready") {
        refresh();
      } else {
        setPhase("idle");
        setPullDist(0);
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
  }, [phase, refresh]);

  const isRefreshing = phase === "refreshing";
  const indicatorH = Math.max(0, pullDist);

  return (
    <div className="relative">
      <div
        className="pointer-events-none fixed left-0 right-0 z-50 flex items-center justify-center overflow-hidden bg-[var(--accent)]/10 backdrop-blur-sm transition-[height] duration-100"
        style={{ top: 0, height: isRefreshing ? 48 : indicatorH }}
      >
        <div className={`transition-transform duration-200 ${phase === "ready" ? "rotate-180" : ""}`}>
          {isRefreshing ? (
            <div className="flex items-center gap-2 text-sm font-medium text-[var(--accent)]">
              <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Actualizando...
            </div>
          ) : (
            <svg className={`h-6 w-6 text-[var(--accent)] transition-opacity duration-150 ${indicatorH > 10 ? "opacity-100" : "opacity-0"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          )}
        </div>
      </div>

      <div style={{ transform: isRefreshing ? "translateY(48px)" : `translateY(${indicatorH}px)`, transition: "transform 0.1s" }}>
        {children}
      </div>
    </div>
  );
}
