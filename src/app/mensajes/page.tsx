"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Skeleton,
} from "@/components/ui/design-system";

interface UserSupportMessage {
  id: string;
  message: string;
  imageUrl: string | null;
  read: boolean;
  createdAt: string;
  reply: string | null;
  repliedAt: string | null;
  repliedBy: string | null;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function UserMessagesPage() {
  const { status } = useSession();
  const router = useRouter();
  const [messages, setMessages] = useState<UserSupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status !== "authenticated") return;

    fetch("/api/support-messages")
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) setMessages(data.messages);
        else setError(data.error || "No fue posible cargar tus mensajes");
      })
      .catch(() => setError("No fue posible cargar tus mensajes"))
      .finally(() => setLoading(false));
  }, [status, router]);

  if (status === "loading" || loading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Skeleton className="mb-6 h-8 w-56" />
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Mis mensajes</h1>
      <p className="mb-6 text-sm text-[color:var(--muted)]">
        Aquí aparecen las respuestas del equipo de Mercadito a tus mensajes de soporte.
      </p>

      {error && (
        <p className="mb-4 rounded-xl border border-[var(--danger)] p-4 text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      )}

      {messages.length === 0 ? (
        <EmptyState
          title="Todavía no tienes mensajes"
          description="Cuando escribas al soporte y recibas una respuesta, aparecerá aquí."
          illustration="default"
        />
      ) : (
        <div className="space-y-4">
          {messages.map((message) => (
            <Card key={message.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base">Mensaje del {formatDate(message.createdAt)}</CardTitle>
                  {message.reply ? (
                    <Badge variant="success" size="sm">Respondido</Badge>
                  ) : (
                    <Badge variant="neutral" size="sm">En espera</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
                    Tu mensaje
                  </p>
                  <p className="whitespace-pre-wrap break-words text-sm">{message.message}</p>
                </div>

                {message.imageUrl && (
                  <img
                    src={message.imageUrl}
                    alt="Imagen adjunta al mensaje"
                    className="max-h-80 w-full rounded-xl border border-[var(--border)] object-cover"
                  />
                )}

                {message.reply && (
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
                        Respuesta de Mercadito
                      </p>
                      {message.repliedAt && (
                        <p className="text-xs text-[color:var(--muted)]">{formatDate(message.repliedAt)}</p>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap break-words text-sm">{message.reply}</p>
                    {message.repliedBy && (
                      <p className="mt-2 text-xs text-[color:var(--muted)]">Respondió {message.repliedBy}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
