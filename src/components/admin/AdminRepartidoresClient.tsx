"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type DocKey = "vehiclePhotoUrl" | "licensePhotoUrl" | "personPhotoUrl" | "officialIdPhotoUrl";
type Photos = Record<DocKey, string | null>;

const DOC_FIELDS: { key: DocKey; label: string; hint: string }[] = [
  { key: "vehiclePhotoUrl", label: "Vehículo", hint: "Foto del vehículo o moto" },
  { key: "licensePhotoUrl", label: "Licencia", hint: "Licencia vigente y legible" },
  { key: "personPhotoUrl", label: "Persona", hint: "Retrato reciente del repartidor" },
  { key: "officialIdPhotoUrl", label: "Identificación", hint: "INE, pasaporte o cédula" },
];

export default function AdminRepartidoresClient({
  userId,
  photos: initialPhotos,
  approved,
}: {
  userId: string;
  photos: Photos;
  approved: boolean;
}) {
  const router = useRouter();
  const [photos, setPhotos] = useState<Photos>(initialPhotos);
  const [dirty, setDirty] = useState(false);
  const [uploading, setUploading] = useState<DocKey | null>(null);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState<"APP" | "WHATSAPP" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const inputRefs = useRef<Partial<Record<DocKey, HTMLInputElement | null>>>({});

  const photoCount = DOC_FIELDS.filter((field) => photos[field.key]).length;
  const completePhotos = useMemo(() => photoCount === DOC_FIELDS.length, [photoCount]);
  const busy = saving || approving !== null || uploading !== null;

  async function handleFile(field: DocKey, file: File | null) {
    if (!file) return;
    setUploading(field);
    setError(null);
    setNotice(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; url?: string; error?: string } | null;
      if (!res.ok || !data?.ok || !data.url) {
        throw new Error(data?.error || "No se pudo subir la imagen.");
      }
      setPhotos((prev) => ({ ...prev, [field]: data.url }));
      setDirty(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al subir la imagen.");
    } finally {
      setUploading(null);
    }
  }

  function clearPhoto(field: DocKey) {
    setPhotos((prev) => ({ ...prev, [field]: null }));
    setDirty(true);
    setNotice(null);
  }

  function discardChanges() {
    setPhotos(initialPhotos);
    setDirty(false);
    setError(null);
    setNotice(null);
  }

  async function persistPhotos(): Promise<boolean> {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/repartidores/${userId}/docs`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(photos),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "No se pudieron guardar las fotos.");
      }
      setDirty(false);
      setNotice("Fotos guardadas.");
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron guardar las fotos.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function savePhotos() {
    const ok = await persistPhotos();
    if (ok) router.refresh();
  }

  async function approve(via: "APP" | "WHATSAPP") {
    setApproving(via);
    setError(null);
    setNotice(null);
    try {
      if (dirty && !(await persistPhotos())) return;

      const res = await fetch(`/api/admin/repartidores/${userId}/approve-docs`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ via }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "No se pudieron validar los documentos.");
      }
      setNotice(
        via === "WHATSAPP"
          ? "Documentos validados por WhatsApp."
          : "Documentos validados en la plataforma.",
      );
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron validar los documentos.");
    } finally {
      setApproving(null);
    }
  }

  return (
    <div className="mt-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {DOC_FIELDS.map((field) => {
          const url = photos[field.key];
          const uploadingThis = uploading === field.key;
          return (
            <div key={field.key} className="rounded-lg border border-[var(--border)] p-2">
              <div className="text-xs font-medium text-[color:var(--muted)]">{field.label}</div>
              {url ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 block"
                  aria-label={`Abrir ${field.label} en tamaño completo`}
                >
                  <img
                    src={url}
                    alt={field.label}
                    className="h-24 w-full rounded-md border border-[var(--border)] object-cover"
                    loading="lazy"
                  />
                </a>
              ) : (
                <div className="mt-1 flex h-24 items-center justify-center rounded-md border border-dashed border-[var(--border)] text-xs text-[color:var(--muted)]">
                  Sin foto
                </div>
              )}
              <p className="mt-1 text-[11px] leading-4 text-[color:var(--muted)]">{field.hint}</p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <input
                  ref={(el) => {
                    inputRefs.current[field.key] = el;
                  }}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  aria-label={`Subir ${field.label}`}
                  onChange={(e) => {
                    void handleFile(field.key, e.target.files?.[0] ?? null);
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => inputRefs.current[field.key]?.click()}
                  className="rounded-md border border-[var(--border)] px-2.5 py-1 text-xs font-medium hover:bg-[var(--accent-soft)] disabled:opacity-60"
                >
                  {uploadingThis ? "Subiendo..." : url ? "Reemplazar" : "Subir foto"}
                </button>
                {url && !approved && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => clearPhoto(field.key)}
                    className="rounded-md px-2 py-1 text-xs font-medium text-[color:var(--danger)] hover:bg-[var(--danger-soft)] disabled:opacity-60"
                  >
                    Quitar
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {(error || notice) && (
        <div
          role={error ? "alert" : "status"}
          className={`mt-3 rounded-md border px-3 py-2 text-sm ${
            error
              ? "border-[var(--danger)] text-[var(--danger)]"
              : "border-[var(--success)] text-[var(--success)]"
          }`}
        >
          {error || notice}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {!approved && (
          <>
            <button
              type="button"
              onClick={() => approve("APP")}
              disabled={busy || !completePhotos}
              title={
                completePhotos
                  ? "Validar con las fotos registradas en la plataforma"
                  : "Sube las 4 fotos para validar en la plataforma"
              }
              className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-[var(--on-accent)] transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-60"
            >
              {approving === "APP" ? "Validando..." : "Validar en plataforma"}
            </button>
            <button
              type="button"
              onClick={() => approve("WHATSAPP")}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--accent-strong)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-strong)] transition-colors hover:bg-[var(--accent-soft)] disabled:opacity-60"
            >
              <svg aria-hidden="true" className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 004.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0012.04 2zm5.8 14.09c-.25.69-1.44 1.32-1.98 1.36-.53.05-1.03.24-3.46-.72-2.93-1.15-4.78-4.15-4.92-4.34-.14-.19-1.17-1.55-1.17-2.96 0-1.41.73-2.1 1-2.39.25-.29.55-.36.73-.36.18 0 .37 0 .53.01.17.01.4-.06.62.48.25.6.85 2.06.92 2.21.07.15.12.32.02.51-.09.19-.14.31-.29.48-.15.17-.31.38-.44.51-.15.15-.3.31-.13.6.17.29.76 1.25 1.63 2.02 1.12.99 2.06 1.3 2.35 1.45.29.15.46.12.63-.07.17-.19.73-.85.92-1.14.19-.29.39-.24.65-.15.27.1 1.7.8 1.99.95.29.15.48.22.55.34.07.12.07.7-.18 1.39z" />
              </svg>
              {approving === "WHATSAPP" ? "Validando..." : "Validar por WhatsApp"}
            </button>
          </>
        )}
        {dirty && (
          <>
            <button
              type="button"
              onClick={savePhotos}
              disabled={busy}
              className="rounded-lg border border-[var(--border-strong)] px-3 py-1.5 text-xs font-semibold hover:bg-[var(--accent-soft)] disabled:opacity-60"
            >
              {saving ? "Guardando..." : "Guardar fotos"}
            </button>
            <button
              type="button"
              onClick={discardChanges}
              disabled={busy}
              className="rounded-md px-2 py-1 text-xs font-medium text-[color:var(--muted)] hover:underline disabled:opacity-60"
            >
              Descartar
            </button>
            <span className="text-xs text-[color:var(--muted)]">Cambios sin guardar</span>
          </>
        )}
        {!approved && !dirty && (
          <span className="text-xs text-[color:var(--muted)]">
            {completePhotos
              ? "Las 4 fotos están completas."
              : `${photoCount} de 4 fotos. Puedes autorizar por WhatsApp sin subir fotos a la plataforma.`}
          </span>
        )}
      </div>
    </div>
  );
}
