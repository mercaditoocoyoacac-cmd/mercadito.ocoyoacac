"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

interface CampaignRow {
  id: string;
  title: string;
  body: string;
  url: string;
  segment: string;
  status: string;
  scheduledAt: string | null;
  sentAt: string | null;
  recipientCount: number;
  createdAt: string;
  createdBy: { name: string | null; email: string } | null;
  store: { id: string; name: string } | null;
  category: { id: string; label: string } | null;
}

interface StoreOption {
  id: string;
  name: string;
}

interface CategoryOption {
  id: string;
  key: string;
  label: string;
}

const SEGMENT_LABELS: Record<string, string> = {
  ALL_USERS: "Todos los usuarios",
  CUSTOMERS: "Solo clientes",
  STORE_CUSTOMERS: "Clientes de una tienda",
  BY_CATEGORY: "Clientes por categoría",
};

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: "Borrador", cls: "bg-gray-100 text-gray-700" },
  SCHEDULED: { label: "Programada", cls: "bg-blue-100 text-blue-700" },
  SENT: { label: "Enviada", cls: "bg-emerald-100 text-emerald-700" },
  CANCELLED: { label: "Cancelada", cls: "bg-red-100 text-red-600" },
};

function toLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function PublicidadClient({
  campaigns,
  stores,
  categories,
}: {
  campaigns: CampaignRow[];
  stores: StoreOption[];
  categories: CategoryOption[];
}) {
  const router = useRouter();
  const [list, setList] = useState<CampaignRow[]>(campaigns);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("/tiendas");
  const [segment, setSegment] = useState("ALL_USERS");
  const [storeId, setStoreId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");

  const refresh = useCallback(async () => {
    const res = await fetch("/api/admin/campaigns", { cache: "no-store" });
    const data = await res.json();
    if (data.ok) setList(data.campaigns);
  }, []);

  const resetForm = () => {
    setTitle("");
    setBody("");
    setUrl("/tiendas");
    setSegment("ALL_USERS");
    setStoreId("");
    setCategoryId("");
    setScheduledAt("");
  };

  const createCampaign = async (sendNow: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = { title, body, url, segment };
      if (segment === "STORE_CUSTOMERS") payload.storeId = storeId || null;
      if (segment === "BY_CATEGORY") payload.categoryId = categoryId || null;
      if (scheduledAt && !sendNow) payload.scheduledAt = scheduledAt;

      const res = await fetch("/api/admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || "No se pudo crear la campaña");
        return;
      }

      if (sendNow && data.campaign?.id) {
        const sendRes = await fetch(`/api/admin/campaigns/${data.campaign.id}/send`, { method: "POST" });
        const sendData = await sendRes.json();
        if (!sendData.ok) setError(sendData.error || "Se creó pero no se pudo enviar");
      }

      await refresh();
      resetForm();
      router.refresh();
    } catch {
      setError("Error de red al crear la campaña");
    } finally {
      setLoading(false);
    }
  };

  const sendCampaign = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/campaigns/${id}/send`, { method: "POST" });
      const data = await res.json();
      if (!data.ok) setError(data.error || "No se pudo enviar");
      await refresh();
    } catch {
      setError("Error de red al enviar");
    } finally {
      setBusyId(null);
    }
  };

  const cancelCampaign = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/campaigns/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) setError(data.error || "No se pudo cancelar");
      await refresh();
    } catch {
      setError("Error de red al cancelar");
    } finally {
      setBusyId(null);
    }
  };

  const input = "w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";
  const label = "mb-1 block text-sm font-medium";

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold">Publicidad por notificaciones</h1>
      <p className="mt-1 text-sm text-[color:var(--muted)]">
        Lanza campañas de notificación push a clientes nuevos. Solo afecta a usuarios con la app y notificaciones activadas.
      </p>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <section className="mt-6 rounded-xl border border-[var(--border)] p-5">
        <h2 className="text-lg font-semibold">Nueva campaña</h2>

        <div className="mt-4 space-y-4">
          <div>
            <label className={label}>Título</label>
            <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="🔥 ¡Nuevo en Ocoyoacac!" maxLength={120} />
          </div>

          <div>
            <label className={label}>Mensaje</label>
            <textarea className={input} rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Descubre las tiendas y productos de tu comunidad." maxLength={500} />
          </div>

          <div>
            <label className={label}>Ir a (ruta de la app)</label>
            <input className={input} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="/tiendas" />
          </div>

          <div>
            <label className={label}>Audiencia</label>
            <select className={input} value={segment} onChange={(e) => setSegment(e.target.value)}>
              <option value="ALL_USERS">Todos los usuarios</option>
              <option value="CUSTOMERS">Solo clientes</option>
              <option value="STORE_CUSTOMERS">Clientes de una tienda</option>
              <option value="BY_CATEGORY">Clientes por categoría</option>
            </select>
          </div>

          {segment === "STORE_CUSTOMERS" && (
            <div>
              <label className={label}>Tienda</label>
              <select className={input} value={storeId} onChange={(e) => setStoreId(e.target.value)}>
                <option value="">Selecciona una tienda</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}

          {segment === "BY_CATEGORY" && (
            <div>
              <label className={label}>Categoría</label>
              <select className={input} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Selecciona una categoría</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className={label}>Programar (opcional). Si se deja vacío, queda como borrador para enviar manualmente.</label>
            <input type="datetime-local" className={input} value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={() => createCampaign(false)}
              disabled={loading || !title.trim() || !body.trim()}
              className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-[var(--accent-soft)] disabled:opacity-50"
            >
              {loading ? "Guardando…" : "Guardar campaña"}
            </button>
            <button
              onClick={() => createCampaign(true)}
              disabled={loading || !title.trim() || !body.trim()}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
            >
              {loading ? "Enviando…" : "Guardar y enviar ahora"}
            </button>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Campañas ({list.length})</h2>

        {list.length === 0 ? (
          <p className="mt-4 text-sm text-[color:var(--muted)]">Aún no hay campañas.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {list.map((c) => {
              const st = STATUS_LABELS[c.status] || STATUS_LABELS.DRAFT;
              const isDone = c.status === "SENT" || c.status === "CANCELLED";
              return (
                <div key={c.id} className="rounded-xl border border-[var(--border)] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{c.title}</h3>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${st.cls}`}>{st.label}</span>
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                          {SEGMENT_LABELS[c.segment] || c.segment}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-[color:var(--muted)]">{c.body}</p>
                      <p className="mt-1 text-xs text-[color:var(--muted)]">
                        {c.store ? `Tienda: ${c.store.name} · ` : ""}
                        {c.category ? `Categoría: ${c.category.label} · ` : ""}
                        Destinatarios: {c.recipientCount} · Creada {new Date(c.createdAt).toLocaleString("es-MX")}
                        {" por "}
                        {c.createdBy?.name || c.createdBy?.email || "Admin"}
                        {c.sentAt ? ` · Enviada ${new Date(c.sentAt).toLocaleString("es-MX")}` : ""}
                        {c.scheduledAt && !c.sentAt ? ` · Programada ${new Date(c.scheduledAt).toLocaleString("es-MX")}` : ""}
                      </p>
                    </div>

                    {!isDone && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => sendCampaign(c.id)}
                          disabled={busyId === c.id}
                          className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
                        >
                          {busyId === c.id ? "…" : "Enviar"}
                        </button>
                        {c.status !== "SENT" && (
                          <button
                            onClick={() => cancelCampaign(c.id)}
                            disabled={busyId === c.id}
                            className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
