"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  createdAt: string;
  read: boolean;
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
  if (diff < 3600000) return `hace ${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `hace ${Math.floor(diff / 3600000)}h`;
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

export default function NotificacionesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [markingIds, setMarkingIds] = useState<Set<string>>(new Set());
  const loadedRef = useRef(false);

  const fetchNotifications = useCallback(async (p: number, f: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: "30" });
      if (f === "unread") params.set("filter", "unread");
      else if (f === "read") params.set("filter", "read");
      const res = await fetch(`/api/notifications/all?${params}`);
      if (res.ok) {
        const json = await res.json();
        setNotifications(json.notifications);
        setTotal(json.total);
        setTotalPages(json.totalPages);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    fetchNotifications(page, filter);
  }, [session, page, filter, fetchNotifications]);

  useEffect(() => {
    if (!session?.user) return;
    if (!loadedRef.current) {
      loadedRef.current = true;
    }
  }, [session]);

  if (!session?.user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <div className="text-lg font-medium">Inicia sesión para ver tus notificaciones</div>
        <button
          onClick={() => router.push("/login")}
          className="mt-4 rounded-lg bg-[var(--accent)] px-6 py-2 text-sm font-medium text-white"
        >
          Iniciar sesión
        </button>
      </div>
    );
  }

  async function markRead(ids: string[]) {
    setMarkingIds((prev) => new Set([...prev, ...ids]));
    try {
      await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      setNotifications((prev) =>
        prev.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n))
      );
    } catch {}
    setMarkingIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
  }

  async function markAllRead() {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await markRead(unreadIds);
  }

  const tabs = [
    { key: "all", label: "Todas" },
    { key: "unread", label: "No leídas" },
    { key: "read", label: "Leídas" },
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Notificaciones</h1>
          <p className="text-sm text-[color:var(--muted)] mt-1">{total} en total</p>
        </div>
        <button
          onClick={() => router.back()}
          className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-[var(--surface)]"
        >
          Volver
        </button>
      </div>

      <div className="flex gap-2 mb-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => { setFilter(t.key); setPage(1); }}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              filter === t.key
                ? "bg-[var(--accent)] text-white"
                : "border border-[var(--border)] hover:bg-[var(--surface)]"
            }`}
          >
            {t.label}
          </button>
        ))}
        {notifications.some((n) => !n.read) && (
          <button
            onClick={markAllRead}
            className="ml-auto rounded-lg px-4 py-2 text-sm font-medium text-[var(--accent)] hover:underline"
          >
            Marcar todo leído
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="py-20 text-center">
          <div className="text-5xl mb-4">🔔</div>
          <div className="text-lg font-medium text-[color:var(--muted)]">Sin notificaciones</div>
          <div className="text-sm text-[color:var(--muted)] mt-1">
            {filter === "unread" ? "No tienes notificaciones sin leer" : "Aún no hay notificaciones"}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`rounded-xl border border-[var(--border)] p-4 transition-colors ${
                n.read ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl leading-none pt-0.5">{typeIcons[n.type] || "🔔"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium">{n.title}</div>
                      {n.message && (
                        <div className="text-sm text-[color:var(--muted)] mt-0.5">{n.message}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] whitespace-nowrap text-[color:var(--muted)]">{formatTime(n.createdAt)}</span>
                      {!n.read && (
                        <button
                          onClick={() => markRead([n.id])}
                          disabled={markingIds.has(n.id)}
                          className="rounded-lg px-3 py-1 text-xs font-medium bg-[var(--accent)] text-white hover:opacity-80 disabled:opacity-50"
                        >
                          {markingIds.has(n.id) ? "..." : "Leído"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-8">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-[var(--surface)] disabled:opacity-50"
          >
            Anterior
          </button>
          <span className="text-sm text-[color:var(--muted)]">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-[var(--surface)] disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}
