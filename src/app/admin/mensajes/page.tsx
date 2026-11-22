"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  Skeleton,
  Textarea,
  toast,
} from "@/components/ui/design-system";
import { parseRoles } from "@/lib/roles";

type SupportMessage = {
  id: string;
  message: string;
  contactEmail: string | null;
  contactPhone: string | null;
  imageUrl: string | null;
  read: boolean;
  createdAt: string;
  reply: string | null;
  repliedAt: string | null;
  repliedBy: string | null;
  user: { name: string | null; email: string } | null;
};

function formatDate(value: string): string {
  return new Date(value).toLocaleString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatShortDate(value: string): string {
  return new Date(value).toLocaleString("es-MX", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminMensajesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SupportMessage | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  useEffect(() => {
    const roles = parseRoles(session?.user?.role, session?.user?.additionalRoles);
    if (session && !roles.includes("ADMIN")) {
      router.push("/admin/login");
      return;
    }
    if (!session) return;

    fetch("/api/admin/support-messages")
      .then((res) => res.json())
      .then((data) => {
        if (data.messages) setMessages(data.messages);
      })
      .catch(() => toast.error("No fue posible cargar los mensajes"))
      .finally(() => setLoading(false));
  }, [session, router]);

  useEffect(() => {
    setReplyText(selected?.reply ?? "");
    setReplyError(null);
  }, [selected?.id, selected?.reply]);

  function openMessage(msg: SupportMessage) {
    setSelected(msg);
    if (!msg.read) void markRead(msg.id);
  }

  async function markRead(id: string, event?: React.MouseEvent) {
    event?.stopPropagation();
    const res = await fetch("/api/admin/support-messages", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      toast.error("No fue posible marcar el mensaje como leído");
      return;
    }
    setMessages((prev) => prev.map((item) => (item.id === id ? { ...item, read: true } : item)));
    setSelected((prev) => (prev?.id === id ? { ...prev, read: true } : prev));
  }

  async function deleteMsg(id: string, event?: React.MouseEvent) {
    event?.stopPropagation();
    if (!confirm("¿Eliminar este mensaje?")) return;
    const res = await fetch("/api/admin/support-messages", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      toast.error("No fue posible eliminar el mensaje");
      return;
    }
    setMessages((prev) => prev.filter((item) => item.id !== id));
    if (selected?.id === id) setSelected(null);
    toast.success("Mensaje eliminado");
  }

  async function handleReply(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setReplying(true);
    setReplyError(null);

    try {
      const res = await fetch("/api/admin/support-messages/reply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: selected.id, reply: replyText }),
      });
      const data = await res.json();
      if (!data.ok) {
        setReplyError(data.error || "No fue posible enviar la respuesta");
        return;
      }

      const updated = data.message as Pick<
        SupportMessage,
        "id" | "reply" | "repliedAt" | "repliedBy" | "read"
      >;
      setMessages((prev) =>
        prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)),
      );
      setSelected((prev) => (prev?.id === updated.id ? { ...prev, ...updated } : prev));
      toast.success("Respuesta enviada al remitente");
    } catch {
      setReplyError("No fue posible enviar la respuesta");
    } finally {
      setReplying(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Mensajes de soporte</h1>
      <p className="mb-6 text-sm text-[color:var(--muted)]">
        Revisa los mensajes de los usuarios y respóndeles desde aquí.
      </p>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : messages.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] p-8 text-center text-sm text-[color:var(--muted)]">
          No hay mensajes de soporte todavía.
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => (
            <Card key={msg.id} padding="none" className="hover:border-[var(--accent)]">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      {!msg.read && (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--accent)]" aria-hidden="true" />
                      )}
                      <span className="text-xs font-medium text-[color:var(--muted)]">
                        {msg.user ? `${msg.user.name || msg.user.email} (registrado)` : "Invitado"}
                      </span>
                      <span className="text-xs text-[color:var(--muted)]">{formatShortDate(msg.createdAt)}</span>
                      {msg.reply && (
                        <Badge variant="success" size="sm">Respondido</Badge>
                      )}
                    </div>
                    <p className="line-clamp-2 whitespace-pre-wrap break-words text-sm">{msg.message}</p>
                    {msg.imageUrl && (
                      <span className="mt-1 inline-flex items-center gap-1 text-xs text-[var(--accent-strong)]">
                        Ver imagen
                      </span>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button type="button" variant="secondary" size="sm" onClick={() => openMessage(msg)}>
                      Abrir
                    </Button>
                    {!msg.read && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(event) => markRead(msg.id, event)}
                      >
                        Leído
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(event) => deleteMsg(msg.id, event)}
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={selected !== null}
        onClose={() => setSelected(null)}
        title="Mensaje de soporte"
        size="lg"
        className="max-h-[90vh] overflow-y-auto"
      >
        {selected && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">
                  {selected.user
                    ? `${selected.user.name || selected.user.email} (registrado)`
                    : "Invitado"}
                </p>
                <p className="text-xs text-[color:var(--muted)]">{formatDate(selected.createdAt)}</p>
              </div>
              {selected.reply && <Badge variant="success" size="sm">Respondido</Badge>}
            </div>

            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
                Mensaje
              </h3>
              <p className="whitespace-pre-wrap break-words text-sm">{selected.message}</p>
            </div>

            {(selected.contactEmail || selected.contactPhone) && (
              <div>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
                  Contacto
                </h3>
                <div className="space-y-1 text-sm">
                  {selected.contactEmail && <p>Correo: {selected.contactEmail}</p>}
                  {selected.contactPhone && <p>Teléfono: {selected.contactPhone}</p>}
                </div>
              </div>
            )}

            {selected.imageUrl && (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
                  Imagen adjunta
                </h3>
                <img
                  src={selected.imageUrl}
                  alt="Imagen adjunta al mensaje"
                  className="max-h-80 w-full rounded-xl border border-[var(--border)] object-cover"
                />
              </div>
            )}

            {selected.reply && (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
                  Respuesta enviada
                </h3>
                <p className="whitespace-pre-wrap break-words text-sm">{selected.reply}</p>
                {selected.repliedAt && (
                  <p className="mt-2 text-xs text-[color:var(--muted)]">
                    {selected.repliedBy ? `${selected.repliedBy} · ` : ""}
                    {formatDate(selected.repliedAt)}
                  </p>
                )}
              </div>
            )}

            <form onSubmit={handleReply} className="space-y-3 border-t border-[var(--border)] pt-4">
              <Textarea
                label={selected.reply ? "Actualizar respuesta" : "Respuesta"}
                value={replyText}
                onChange={(event) => setReplyText(event.target.value)}
                rows={5}
                maxLength={2000}
                placeholder="Escribe tu respuesta para el usuario"
                required
              />
              {replyError && (
                <p className="text-sm text-[var(--danger)]" role="alert">{replyError}</p>
              )}
              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setSelected(null)}>
                  Cerrar
                </Button>
                <Button type="submit" loading={replying} disabled={!replyText.trim()}>
                  {selected.reply ? "Actualizar respuesta" : "Enviar respuesta"}
                </Button>
              </div>
            </form>
          </div>
        )}
      </Dialog>
    </div>
  );
}
