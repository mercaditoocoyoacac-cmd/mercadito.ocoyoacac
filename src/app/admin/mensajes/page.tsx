"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

type SupportMessage = {
  id: string;
  message: string;
  contactEmail: string | null;
  contactPhone: string | null;
  imageUrl: string | null;
  read: boolean;
  createdAt: string;
  user: { name: string | null; email: string } | null;
};

export default function AdminMensajesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SupportMessage | null>(null);

  useEffect(() => {
    if (session?.user?.role !== "ADMIN") {
      router.push("/admin/login");
      return;
    }
    fetch("/api/admin/support-messages")
      .then((r) => r.json())
      .then((data) => { if (data.messages) setMessages(data.messages); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session, router]);

  async function markRead(id: string, e?: React.MouseEvent) {
    e?.stopPropagation();
    await fetch("/api/admin/support-messages", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setMessages((prev) => prev.map((m) => m.id === id ? { ...m, read: true } : m));
    if (selected?.id === id) setSelected((prev) => prev ? { ...prev, read: true } : prev);
  }

  async function deleteMsg(id: string, e?: React.MouseEvent) {
    e?.stopPropagation();
    if (!confirm("¿Eliminar este mensaje?")) return;
    await fetch("/api/admin/support-messages", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setMessages((prev) => prev.filter((m) => m.id !== id));
    if (selected?.id === id) setSelected(null);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight mb-2">Mensajes de soporte</h1>
      <p className="text-sm text-[color:var(--muted)] mb-6">Los usuarios te escriben desde el botón azul de ayuda.</p>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-[var(--accent-soft)]" />
          ))}
        </div>
      ) : messages.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] p-8 text-center text-sm text-[color:var(--muted)]">
          No hay mensajes de soporte todavía.
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              onClick={() => { setSelected(msg); if (!msg.read) markRead(msg.id); }}
              className={`rounded-xl border cursor-pointer transition-colors ${
                msg.read ? "border-[var(--border)] hover:border-gray-300" : "border-blue-300 bg-blue-50/50 dark:bg-blue-950/20 hover:border-blue-400"
              } p-4`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {!msg.read && (
                      <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                    )}
                    <span className="text-xs font-medium text-[color:var(--muted)]">
                      {msg.user
                        ? `${msg.user.name || msg.user.email} (registrado)`
                        : "Invitado"}
                    </span>
                    <span className="text-xs text-[color:var(--muted)]">
                      {new Date(msg.createdAt).toLocaleString("es-MX", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap break-words line-clamp-2">{msg.message}</p>
                  {msg.imageUrl && (
                    <span className="mt-1 inline-flex items-center gap-1 text-xs text-blue-600">
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Ver imagen
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!msg.read && (
                    <button
                      type="button"
                      onClick={(e) => markRead(msg.id, e)}
                      className="rounded-lg border border-[var(--border)] px-3 py-1 text-xs font-medium text-[color:var(--muted)] hover:bg-[var(--accent-soft)] transition-colors bg-transparent cursor-pointer"
                    >
                      Leído
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => deleteMsg(msg.id, e)}
                    className="rounded-lg border border-transparent px-2 py-1 text-xs text-red-500 hover:bg-red-50 transition-colors bg-transparent cursor-pointer"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold">
                  {selected.user
                    ? `${selected.user.name || selected.user.email} (registrado)`
                    : "Invitado"}
                </p>
                <p className="text-xs text-[color:var(--muted)]">
                  {new Date(selected.createdAt).toLocaleString("es-MX", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-lg p-1.5 hover:bg-gray-100 transition-colors border-none bg-transparent cursor-pointer"
              >
                <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-semibold text-[color:var(--muted)] uppercase tracking-wide mb-1">Mensaje</h3>
                <p className="text-sm whitespace-pre-wrap break-words">{selected.message}</p>
              </div>

              {(selected.contactEmail || selected.contactPhone) && (
                <div>
                  <h3 className="text-xs font-semibold text-[color:var(--muted)] uppercase tracking-wide mb-1">Contacto</h3>
                  <div className="space-y-1 text-sm">
                    {selected.contactEmail && <p>✉ {selected.contactEmail}</p>}
                    {selected.contactPhone && <p>📞 {selected.contactPhone}</p>}
                  </div>
                </div>
              )}

              {selected.imageUrl && (
                <div>
                  <h3 className="text-xs font-semibold text-[color:var(--muted)] uppercase tracking-wide mb-2">Imagen adjunta</h3>
                  <img
                    src={selected.imageUrl}
                    alt="Imagen adjunta"
                    className="w-full rounded-xl border border-[var(--border)] object-cover max-h-80"
                  />
                </div>
              )}

              <div className="flex gap-2">
                {!selected.read && (
                  <button
                    type="button"
                    onClick={() => markRead(selected.id)}
                    className="flex-1 rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[color:var(--muted)] hover:bg-[var(--accent-soft)] transition-colors bg-transparent cursor-pointer"
                  >
                    Marcar como leído
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => deleteMsg(selected.id)}
                  className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors bg-transparent cursor-pointer"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
