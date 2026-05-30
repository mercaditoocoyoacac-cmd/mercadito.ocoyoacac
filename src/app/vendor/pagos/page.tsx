"use client";

import { useEffect, useState } from "react";
import { useConfirm } from "@/components/ui/ConfirmDialog";

type ProcessorDef = {
  label: string;
  fields: { key: string; label: string; required: boolean }[];
};

type PaymentMethod = {
  id: string;
  processor: string;
  label: string;
  isActive: boolean;
  status: string;
  hasCredentials: boolean;
  credentials: Record<string, string> | null;
};

export default function PaymentMethodsPage() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const confirm = useConfirm();
  const [processors, setProcessors] = useState<Record<string, ProcessorDef>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/vendor/payment-methods");
    const data = await res.json();
    if (data.ok) {
      setMethods(data.methods);
      setProcessors(data.processors);
    }
    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      queueMicrotask(() => setLoading(true));
      const res = await fetch("/api/vendor/payment-methods");
      const data = await res.json();
      if (data.ok) {
        setMethods(data.methods);
        setProcessors(data.processors);
      }
      setLoading(false);
    })();
  }, []);

  async function save(processor: string, credentials: Record<string, string>) {
    setSaving(processor);
    setError(null);
    const res = await fetch("/api/vendor/payment-methods", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ processor, credentials }),
    });
    const data = await res.json();
    setSaving(null);
    if (!res.ok || !data.ok) {
      setError(data?.error || "Error al guardar");
      return;
    }
    setExpanded(null);
    await load();
  }

  async function disconnect(id: string) {
    if (!(await confirm({ message: "¿Desconectar este método de pago?", variant: "danger", confirmText: "Desconectar", title: "Desconectar método de pago" }))) return;
    await fetch(`/api/vendor/payment-methods?id=${id}`, { method: "DELETE" });
    await load();
  }

  function getStatusBadge(m: PaymentMethod) {
    if (!m.isActive) return <span className="text-xs text-red-600">Inactivo</span>;
    if (m.status === "APPROVED") return <span className="text-xs text-green-600">Aprobado</span>;
    if (m.status === "PENDING") return <span className="text-xs text-yellow-600">Pendiente</span>;
    if (m.status === "REJECTED") return <span className="text-xs text-red-600">Rechazado</span>;
    return null;
  }

  function getProcessorIcon(processor: string) {
    const icons: Record<string, string> = {
      MERCADO_PAGO: "🟡",
      CLIP: "🔴",
      BBVA: "🔵",
      OPENPAY: "🟢",
      CONEKTRA: "🟣",
    };
    return icons[processor] || "⚙️";
  }

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
        <div className="text-sm text-[color:var(--muted)]">Cargando...</div>
      </main>
    );
  }

  const configuredProcessors = new Set(methods.map((m) => m.processor));
  const availableProcessors = Object.entries(processors).filter(
    ([key]) => !configuredProcessors.has(key) || expanded === key,
  );

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Métodos de pago</h1>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Configura los procesadores de pago que quieras ofrecer a tus clientes.
          Cada procesador requiere sus propias credenciales.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {methods.map((m) => (
          <div key={m.id} className="rounded-xl border border-[var(--border)] overflow-hidden">
            <button
              type="button"
              onClick={() => setExpanded(expanded === m.id ? null : m.id)}
              className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-[var(--accent-soft)] transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{getProcessorIcon(m.processor)}</span>
                <div>
                  <div className="font-medium">{m.label}</div>
                  <div className="text-xs text-[color:var(--muted)]">
                    {m.processor} {getStatusBadge(m)}
                  </div>
                </div>
              </div>
              <svg
                className={`h-5 w-5 text-[color:var(--muted)] transition-transform ${
                  expanded === m.id ? "rotate-180" : ""
                }`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {expanded === m.id && (
              <ProcessorForm
                processor={m.processor}
                def={processors[m.processor]}
                initial={m.credentials || undefined}
                saving={saving === m.processor}
                onSave={(creds) => save(m.processor, creds)}
                onDelete={() => disconnect(m.id)}
              />
            )}
          </div>
        ))}

        {availableProcessors.length > 0 && (
          <div className="rounded-xl border border-dashed border-[var(--border)] p-5">
            <div className="text-sm font-medium text-[color:var(--muted)] mb-3">
              Agregar otro procesador
            </div>
            <div className="flex flex-wrap gap-2">
              {availableProcessors.map(([key, def]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setExpanded(key)}
                  className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm hover:bg-[var(--accent-soft)] transition-colors"
                >
                  <span>{getProcessorIcon(key)}</span>
                  {def.label}
                </button>
              ))}
            </div>

            {availableProcessors
              .filter(([key]) => expanded === key)
              .map(([key, def]) => (
                <div key={key} className="mt-4">
                  <ProcessorForm
                    processor={key}
                    def={def}
                    saving={saving === key}
                    onSave={(creds) => save(key, creds)}
                    onDelete={() => {}}
                  />
                </div>
              ))}
          </div>
        )}
      </div>

      <div className="mt-6 rounded-lg bg-yellow-500/10 p-4 text-sm text-yellow-800">
        <strong>Nota:</strong> Las credenciales se almacenan encriptadas. 
        Después de guardar, un administrador debe aprobar el método de pago antes de que esté disponible.
      </div>
    </main>
  );
}

function ProcessorForm({
  processor: _processor,
  def,
  initial,
  saving,
  onSave,
  onDelete,
}: {
  processor: string;
  def: ProcessorDef;
  initial?: Record<string, string>;
  saving: boolean;
  onSave: (creds: Record<string, string>) => void;
  onDelete: () => void;
}) {
  const [creds, setCreds] = useState<Record<string, string>>(initial || {});

  return (
    <div className="border-t border-[var(--border)] px-5 py-4">
      <div className="space-y-3">
        {def.fields.map((field) => (
          <label key={field.key} className="block">
            <div className="text-sm font-medium">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </div>
            <input
              value={creds[field.key] || ""}
              onChange={(e) => setCreds({ ...creds, [field.key]: e.target.value })}
              type={field.key.includes("secret") || field.key.includes("token") || field.key.includes("Key") ? "password" : "text"}
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              placeholder={field.label}
            />
          </label>
        ))}
      </div>
      <div className="mt-4 flex gap-3">
        <button
          type="button"
          disabled={saving}
          onClick={() => onSave(creds)}
          className="flex-1 rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60"
        >
          {saving ? "Guardando..." : "Guardar"}
        </button>
        {initial && (
          <button
            type="button"
            onClick={onDelete}
            className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-700"
          >
            Desconectar
          </button>
        )}
      </div>
    </div>
  );
}
