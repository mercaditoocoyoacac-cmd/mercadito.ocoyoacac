"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

interface Store {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  phone: string | null;
  address: string | null;
  imageUrl: string | null;
  openTime: string | null;
  closeTime: string | null;
  scheduleDays: string[];
}

const DAYS = [
  { key: "MONDAY", label: "Lunes" },
  { key: "TUESDAY", label: "Martes" },
  { key: "WEDNESDAY", label: "Miércoles" },
  { key: "THURSDAY", label: "Jueves" },
  { key: "FRIDAY", label: "Viernes" },
  { key: "SATURDAY", label: "Sábado" },
  { key: "SUNDAY", label: "Domingo" },
] as const;

export default function EditarTiendaPage() {
  const router = useRouter();
  const [store, setStore] = useState<Store | null>(null);
  const [loadingStore, setLoadingStore] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [openTime, setOpenTime] = useState("");
  const [closeTime, setCloseTime] = useState("");
  const [scheduleDays, setScheduleDays] = useState<string[]>(
    DAYS.map((d) => d.key)
  );
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (loadingStore && !store) {
    fetchStore();
    return (
      <div className="mx-auto max-w-xl">
        <div className="text-sm text-[color:var(--muted)]">Cargando...</div>
      </div>
    );
  }

  async function fetchStore() {
    const res = await fetch("/api/vendor/store");
    const data = (await res.json()) as { ok: true; store: Store | null };
    if (data.store) {
      setStore(data.store);
      setName(data.store.name);
      setDescription(data.store.description ?? "");
      setPhone(data.store.phone ?? "");
      setAddress(data.store.address ?? "");
      setImageUrl(data.store.imageUrl ?? "");
      setOpenTime(data.store.openTime ?? "");
      setCloseTime(data.store.closeTime ?? "");
      setScheduleDays(data.store.scheduleDays.length > 0 ? data.store.scheduleDays : DAYS.map((d) => d.key));
    } else {
      router.push("/vendor/onboarding");
      return;
    }
    setLoadingStore(false);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = (await res.json()) as
      | { ok: true; url: string }
      | { ok: false; error?: string };

    setUploading(false);

    if (!res.ok || !data.ok) {
      const errorMsg = "error" in data ? data.error : "Error al subir imagen.";
      setError(errorMsg ?? "Error al subir imagen.");
      return;
    }

    if (!("url" in data)) {
      setError("Error al subir imagen.");
      return;
    }

    setImageUrl(data.url);
  }

  function toggleDay(day: string) {
    setScheduleDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const res = await fetch("/api/vendor/store", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        description: description.trim() || undefined,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        imageUrl: imageUrl || null,
        openTime: openTime || null,
        closeTime: closeTime || null,
        scheduleDays,
      }),
    });

    const text = await res.text().catch(() => "");
    let data: { ok: true } | { ok: false; error?: string } = { ok: false };
    try { data = JSON.parse(text); } catch {}

    setSaving(false);

    if (!res.ok || !data.ok) {
      const msg = "error" in data && data.error ? data.error : `Error (${res.status}): ${text.slice(0, 200)}`;
      setError(msg);
      return;
    }

    router.push("/vendor/productos");
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-semibold tracking-tight">Editar tienda</h1>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <div className="text-sm font-medium">Logo o imagen de la tienda</div>
          <div className="flex items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="rounded-md border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-[var(--accent-soft)] disabled:opacity-60"
            >
              {uploading ? "Subiendo..." : "Cambiar imagen"}
            </button>
            {imageUrl && (
              <div className="relative h-16 w-16 overflow-hidden rounded-md border border-[var(--border)]">
                <img
                  src={imageUrl}
                  alt="Vista previa"
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setImageUrl("")}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 hover:opacity-100"
                >
                  ×
                </button>
              </div>
            )}
          </div>
          <p className="text-xs text-[color:var(--muted)]">
            JPG, PNG, WebP o GIF. Máx 5MB.
          </p>
        </div>

        <label className="block">
          <div className="text-sm font-medium">Nombre de la tienda</div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
        </label>

        <label className="block">
          <div className="text-sm font-medium">Descripción (opcional)</div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-1 w-full resize-none rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <div className="text-sm font-medium">Teléfono (opcional)</div>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label className="block">
            <div className="text-sm font-medium">Dirección (opcional)</div>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <svg className="h-5 w-5 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm font-semibold">Horario de atención</div>
          </div>
          <p className="text-xs text-[color:var(--muted)] mb-4">
            Los clientes solo podrán hacer pedidos durante tu horario configurado.
            Deja los campos vacíos para aceptar pedidos 24/7.
          </p>

          <div className="grid gap-4 sm:grid-cols-2 mb-5">
            <label className="block">
              <div className="text-xs font-medium text-[color:var(--muted)]">Hora de apertura</div>
              <input
                type="time"
                value={openTime}
                onChange={(e) => setOpenTime(e.target.value)}
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              />
            </label>
            <label className="block">
              <div className="text-xs font-medium text-[color:var(--muted)]">Hora de cierre</div>
              <input
                type="time"
                value={closeTime}
                onChange={(e) => setCloseTime(e.target.value)}
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              />
            </label>
          </div>

          <div className="text-xs font-medium text-[color:var(--muted)] mb-2">Días de atención</div>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((day) => {
              const isActive = scheduleDays.includes(day.key);
              return (
                <button
                  key={day.key}
                  type="button"
                  onClick={() => toggleDay(day.key)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-[var(--accent)] text-white"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {day.label.slice(0, 3)}
                </button>
              );
            })}
          </div>
        </div>

        {error ? (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 rounded-md border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-[var(--accent-soft)]"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving || uploading}
            className="flex-1 rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60"
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}
