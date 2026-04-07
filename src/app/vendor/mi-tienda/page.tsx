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
}

export default function EditarTiendaPage() {
  const router = useRouter();
  const [store, setStore] = useState<Store | null>(null);
  const [loadingStore, setLoadingStore] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [imageUrl, setImageUrl] = useState("");
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
      }),
    });

    const data = (await res.json()) as
      | { ok: true }
      | { ok: false; error?: string };

    setSaving(false);

    if (!res.ok || !data.ok) {
      const msg = "error" in data ? data.error : "No se pudo guardar.";
      setError(msg ?? "No se pudo guardar.");
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
