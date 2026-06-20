"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

interface BubbleItem {
  id: number;
  title: string;
  body: string;
  url?: string;
  type?: string;
}

declare global {
  interface WindowEventMap {
    "push-bubble": CustomEvent<{ title: string; body: string; url?: string; type?: string }>;
  }
}

export function NotificationBubble() {
  const [queue, setQueue] = useState<BubbleItem[]>([]);
  const [current, setCurrent] = useState<BubbleItem | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const idRef = useRef(0);

  const dismiss = useCallback(() => {
    setCurrent(null);
    setQueue((prev) => prev.slice(1));
  }, []);

  useEffect(() => {
    const handler = (e: WindowEventMap["push-bubble"]) => {
      const item: BubbleItem = { id: ++idRef.current, ...e.detail };
      setQueue((prev) => {
        if (prev.some((p) => p.title === item.title && p.body === item.body)) return prev;
        return [...prev, item];
      });
    };
    window.addEventListener("push-bubble", handler);
    return () => window.removeEventListener("push-bubble", handler);
  }, []);

  useEffect(() => {
    if (queue.length > 0 && !current) {
      setCurrent(queue[0]);
    }
  }, [queue, current]);

  useEffect(() => {
    if (current) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(dismiss, 5000);
      return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }
  }, [current, dismiss]);

  if (!current) return null;

  const statusIcons: Record<string, string> = {
    new_order: "🛒",
    accepted: "✅",
    out_for_delivery: "🚚",
    delivered: "📦",
    cancelled: "❌",
  };

  return (
    <div className="fixed bottom-20 right-4 z-[9999] animate-slide-up">
      <div className="flex w-72 items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-lg">
          {statusIcons[current.type || ""] || (
            <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
            </svg>
          )}
        </div>
        <div className="flex-1 min-w-0">
          {current.url ? (
            <Link href={current.url} onClick={dismiss} className="no-underline">
              <p className="text-sm font-semibold text-gray-900 truncate">{current.title}</p>
              <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{current.body}</p>
            </Link>
          ) : (
            <>
              <p className="text-sm font-semibold text-gray-900 truncate">{current.title}</p>
              <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{current.body}</p>
            </>
          )}
        </div>
        <button
          onClick={dismiss}
          className="shrink-0 rounded-full p-1 hover:bg-gray-100 transition-colors border-none bg-transparent cursor-pointer"
        >
          <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
