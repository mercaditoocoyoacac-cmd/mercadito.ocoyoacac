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

const STORAGE_KEY = "mo_bubble_queue";

function loadQueue(): Omit<BubbleItem, "id">[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch { return []; }
}

function saveQueue(queue: Omit<BubbleItem, "id">[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(queue.slice(-20))); } catch {}
}

const STATUS_ICONS: Record<string, string> = {
  NEW_ORDER: "🛒",
  ORDER_ACCEPTED: "✅",
  OUT_FOR_DELIVERY: "🚚",
  DELIVERY_ARRIVED: "📍",
  ORDER_COMPLETED: "📦",
  CANCELLED: "❌",
  PAYMENT: "💳",
  MEMBERSHIP: "⭐",
  ADMIN_NOTIFY: "🔔",
};

export function NotificationBubble() {
  const [queue, setQueue] = useState<BubbleItem[]>([]);
  const [current, setCurrent] = useState<BubbleItem | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const idRef = useRef(0);

  const processQueue = useCallback(() => {
    setQueue((prev) => {
      if (prev.length > 0 && !prev.some((p) => p.id === -1)) return prev;
      return prev.filter((p) => p.id !== -1);
    });
    setCurrent(null);
  }, []);

  const dismiss = useCallback(() => {
    setCurrent(null);
    setQueue((prev) => {
      const next = prev.slice(1);
      saveQueue(next);
      return next;
    });
  }, []);

  const addItem = useCallback((detail: { title: string; body: string; url?: string; type?: string }) => {
    const item: BubbleItem = { id: ++idRef.current, ...detail };
    setQueue((prev) => {
      if (prev.some((p) => p.title === item.title && p.body === item.body)) return prev;
      const next = [...prev, item];
      saveQueue(next);
      return next;
    });
  }, []);

  useEffect(() => {
    const persisted = loadQueue();
    if (persisted.length > 0) {
      const items = persisted.map((p) => ({ ...p, id: ++idRef.current }));
      setQueue(items);
    }
  }, []);

  useEffect(() => {
    const handler = (e: WindowEventMap["push-bubble"]) => addItem(e.detail);
    window.addEventListener("push-bubble", handler);
    return () => window.removeEventListener("push-bubble", handler);
  }, [addItem]);

  useEffect(() => {
    const handle = () => {
      if (document.visibilityState === "visible") {
        const persisted = loadQueue();
        if (persisted.length > 0) {
          setQueue((prev) => {
            const existingIds = new Set(prev.map((p) => `${p.title}|${p.body}`));
            const newItems = persisted
              .filter((p) => !existingIds.has(`${p.title}|${p.body}`))
              .map((p) => ({ ...p, id: ++idRef.current }));
            return [...prev, ...newItems];
          });
        }
      }
    };
    document.addEventListener("visibilitychange", handle);
    return () => document.removeEventListener("visibilitychange", handle);
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

  return (
    <div className="fixed bottom-20 right-4 z-[9999] animate-slide-up">
      <div className="flex w-72 items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-lg">
          {STATUS_ICONS[current.type || ""] || (
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
