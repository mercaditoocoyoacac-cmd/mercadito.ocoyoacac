"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export function NotificationBell() {
  const { data: session } = useSession();
  const [count, setCount] = useState(0);

  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/count");
      if (res.ok) {
        const json = await res.json();
        setCount(json.count);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    fetchCount();

    const interval = setInterval(fetchCount, 30000);
    const onVisibility = () => { if (document.visibilityState === "visible") fetchCount(); };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", fetchCount);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", fetchCount);
    };
  }, [session, fetchCount]);

  useEffect(() => {
    window.addEventListener("push-bubble", fetchCount);
    return () => window.removeEventListener("push-bubble", fetchCount);
  }, [fetchCount]);

  if (!session?.user) return null;

  return (
    <Link
      href="/notificaciones"
      className="relative rounded-lg p-2 transition-colors hover:bg-[var(--surface)] inline-block"
      aria-label="Notificaciones"
      style={{ color: "var(--muted)" }}
    >
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
