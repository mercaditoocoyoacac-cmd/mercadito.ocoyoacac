"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  url: string | null;
  createdAt: string;
}

const typeIcons: Record<string, string> = {
  NEW_ORDER: "🛒",
  ORDER_COMPLETED: "✅",
  DELIVERY_ARRIVED: "🚚",
  PAYMENT: "💳",
  PAYMENT_RECEIVED: "💳",
  MEMBERSHIP: "⭐",
  SUPPORT: "💬",
  ADMIN_NOTIFY: "📢",
};

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return "ahora";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

export function NotificationBell() {
  const { data: session } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/count");
      if (res.ok) {
        const json = await res.json();
        setCount(json.count);
      }
    } catch {}
  }, []);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications/unread");
      if (res.ok) {
        const json = await res.json();
        setNotifications(json);
        setCount(json.length);
      }
    } catch {}
    setLoading(false);
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
    const handler = () => { if (open) fetchNotifications(); };
    window.addEventListener("push-bubble", handler);
    return () => window.removeEventListener("push-bubble", handler);
  }, [open, fetchNotifications]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const toggle = async () => {
    if (!open) await fetchNotifications();
    setOpen(!open);
  };

  const markRead = async (ids: string[], url?: string | null) => {
    try {
      await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
    } catch {}
    setNotifications((prev) => prev.filter((n) => !ids.includes(n.id)));
    setCount((prev) => Math.max(0, prev - ids.length));
    if (url) router.push(url);
    setOpen(false);
  };

  if (!session?.user) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={toggle}
        className="relative rounded-lg p-2 transition-colors hover:bg-[var(--surface)]"
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
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed right-4 top-16 w-80 sm:w-96 rounded-xl border border-[var(--border)] bg-[var(--background)] shadow-lg z-50 max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <div className="text-sm font-semibold">Notificaciones</div>
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={() => markRead(notifications.map((n) => n.id))}
                  className="text-xs font-medium text-[var(--accent)] hover:underline"
                >
                  Marcar todo leído
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading && notifications.length === 0 ? (
                <div className="p-8 text-center text-sm text-[color:var(--muted)]">Cargando...</div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-sm text-[color:var(--muted)]">Sin notificaciones</div>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => markRead([n.id], n.url)}
                    className="w-full text-left hover:bg-[var(--surface)] border-b border-[var(--border)] last:border-0 transition-colors"
                  >
                    <div className="px-4 py-3 grid grid-cols-[auto_1fr_auto] gap-2 items-start">
                      <span className="text-base leading-none pt-0.5">{typeIcons[n.type] || "🔔"}</span>
                      <div className="min-w-0">
                        <div className="text-sm font-medium leading-snug" style={{ color: "var(--foreground)" }}>{n.title}</div>
                        {n.message && <div className="text-xs leading-snug mt-0.5" style={{ color: "var(--muted)" }}>{n.message}</div>}
                      </div>
                      <span className="text-[11px] whitespace-nowrap pt-0.5" style={{ color: "var(--muted)" }}>{formatTime(n.createdAt)}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
