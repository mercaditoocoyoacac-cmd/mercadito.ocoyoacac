"use client";

import { useRef, useEffect, type ReactNode } from "react";

export function PageTransition({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el) {
      el.style.opacity = "0";
      el.style.transform = "translateY(8px)";
      requestAnimationFrame(() => {
        el.style.transition = "opacity 0.3s ease, transform 0.3s ease";
        el.style.opacity = "1";
        el.style.transform = "translateY(0)";
      });
    }
  }, []);

  return <div ref={ref}>{children}</div>;
}
