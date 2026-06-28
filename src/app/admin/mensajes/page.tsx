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

  async function markRead(id: string) {
    await fetch("/api/admin/support-messages", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setMessages((prev) => prev.map((m) => m.id === id ? { ...m, read: true } : m));
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
              className={`rounded-xl border ${
                msg.read ? "border-[var(--border)]" : "border-blue-300 bg-blue-50/50 dark:bg-blue-950/20"
              } p-4 transition-colors`}
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
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                  {(msg.contactEmail || msg.contactPhone) && (
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-[color:var(--muted)]">
                      {msg.contactEmail && <span>✉ {msg.contactEmail}</span>}
                      {msg.contactPhone && <span>📞 {msg.contactPhone}</span>}
                    </div>
                  )}
                  {msg.imageUrl && (
                    <div className="mt-2">
                      <a
                        href={msg.imageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Ver imagen adjunta
                      </a>
                    </div>
                  )}
                </div>
                {!msg.read && (
                  <button
                    type="button"
                    onClick={() => markRead(msg.id)}
                    className="shrink-0 rounded-lg border border-[var(--border)] px-3 py-1 text-xs font-medium text-[color:var(--muted)] hover:bg-[var(--accent-soft)] transition-colors bg-transparent cursor-pointer"
                  >
                    Marcar leído
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
