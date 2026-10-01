"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type DocKey = "vehiclePhotoUrl" | "licensePhotoUrl" | "personPhotoUrl" | "officialIdPhotoUrl";

const DOC_FIELDS: { key: DocKey; label: string; hint: string }[] = [
  { key: "vehiclePhotoUrl", label: "Foto del vehículo", hint: "Fotografía clara de tu vehículo/moto" },
  { key: "licensePhotoUrl", label: "Licencia de conducir", hint: "Vigente, a color y legible" },
  { key: "personPhotoUrl", label: "Foto de la persona", hint: "Retrato reciente, sin lentes oscuros" },
  { key: "officialIdPhotoUrl", label: "Identificación oficial", hint: "INE, pasaporte o cédula (frente claro)" },
];

export default function DeliveryDocumentosPage() {
  const router = useRouter();
  const [urls, setUrls] = useState<Partial<Record<DocKey, string>>>({});
  const [uploading, setUploading] = useState<DocKey | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<Partial<Record<DocKey, HTMLInputElement | null>>>({});

  async function handleFile(doc: DocKey, file: File | null) {
    if (!file) return;
    setUploading(doc);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok || !data.url) throw new Error("No se pudo subir la imagen.");
      setUrls((prev) => ({ ...prev, [doc]: data.url }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al subir la imagen.");
    } finally {
      setUploading(null);
    }
  }

  const uploadedCount = DOC_FIELDS.filter((f) => urls[f.key]).length;

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/delivery/documents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(urls),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || "No se pudieron guardar los documentos.");
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron guardar los documentos.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Documentos de repartidor</h1>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Sube los 4 documentos antes del <strong>15 de octubre de 2026</strong>. Si no los registras a
          tiempo, se retirará el status de repartidor a tu cuenta.
        </p>
      </div>

      {done && (
        <div className="mb-4 rounded-xl border border-green-300 bg-green-50 p-4 text-sm text-green-800">
          ¡Listo! Tus documentos fueron guardados.{" "}
          <button className="underline" onClick={() => router.push("/delivery")}>
            Volver al panel de repartidor
          </button>
        </div>
      )}

      <div className="space-y-5">
        {DOC_FIELDS.map((field) => (
          <div key={field.key} className="rounded-xl border border-[var(--border)] p-4">
            <div className="mb-2 text-sm font-medium">{field.label} *</div>
            <p className="mb-3 text-xs text-[color:var(--muted)]">{field.hint}</p>
            <div className="flex items-center gap-3">
              {urls[field.key] ? (
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-[var(--border)]">
                  <img src={urls[field.key]} alt={field.label} className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-[var(--border)] text-xs text-[color:var(--muted)]">
                  sin foto
                </div>
              )}
              <input
                ref={(el) => { inputRefs.current[field.key] = el; }}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { handleFile(field.key, e.target.files?.[0] ?? null); e.target.value = ""; }}
              />
              <button
                type="button"
                disabled={uploading === field.key}
                onClick={() => inputRefs.current[field.key]?.click()}
                className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-[var(--accent-soft)] disabled:opacity-60"
              >
                {uploading === field.key ? "Subiendo..." : urls[field.key] ? "Cambiar foto" : "Subir foto"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {error ? (
        <div className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <button
        onClick={save}
        disabled={saving || uploadedCount === 0}
        className="mt-6 w-full rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60"
      >
        {saving ? "Guardando..." : uploadedCount === 4 ? "Guardar mis documentos" : `Guardar (${uploadedCount}/4)`}
      </button>
      <p className="mt-2 text-xs text-[color:var(--muted)]">
        Puedes guardar los que tengas y completar el resto después, pero solo con los 4 estará todo listo.
      </p>
    </main>
  );
}