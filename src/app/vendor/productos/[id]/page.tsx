"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface Product {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  currency: string;
  imageUrl: string | null;
  isActive: boolean;
}

export default function EditarProductoPage() {
  const router = useRouter();
  const pathname = usePathname();
  const productId = pathname.split("/").pop()!;

  const [product, setProduct] = useState<Product | null>(null);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProduct();
  }, []);

  async function fetchProduct() {
    try {
      const res = await fetch("/api/vendor/products");
      if (!res.ok) {
        setError("No se pudo cargar el producto.");
        setLoadingProduct(false);
        return;
      }
      const data = (await res.json()) as { ok: true; products: Product[] };
      const found = data.products?.find((p) => p.id === productId);
      if (found) {
        setProduct(found);
        setName(found.name);
        setPrice((found.priceCents / 100).toString());
        setDescription(found.description ?? "");
        setImageUrl(found.imageUrl ?? "");
      } else {
        setError("Producto no encontrado.");
      }
    } catch {
      setError("Error de conexion.");
    }
    setLoadingProduct(false);
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

    const priceNumber = Number(price);
    if (!Number.isFinite(priceNumber) || priceNumber <= 0) {
      setSaving(false);
      setError("El precio debe ser mayor a 0.");
      return;
    }

    const res = await fetch(`/api/vendor/products/${productId}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        description: description.trim() || undefined,
        priceCents: Math.round(priceNumber * 100),
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

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault();
    if (!confirm("¿Estás seguro de eliminar este producto?")) return;
    
    setDeleting(true);
    const res = await fetch(`/api/vendor/products/${productId}`, {
      method: "DELETE",
    });
    const data = (await res.json()) as { ok: true } | { ok: false; error?: string };
    if (!res.ok || !data.ok) {
      setDeleting(false);
      setError("No se pudo eliminar.");
      return;
    }
    router.push("/vendor/productos");
  }

  if (loadingProduct) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="text-sm text-[color:var(--muted)]">Cargando...</div>
      </div>
    );
  }

  if (error && !product) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="text-sm text-red-600">{error}</div>
        <button onClick={() => router.back()} className="mt-4 text-sm underline">
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-semibold tracking-tight">Editar producto</h1>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <div className="text-sm font-medium">Imagen del producto</div>
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
          <div className="text-sm font-medium">Nombre</div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
        </label>

        <label className="block">
          <div className="text-sm font-medium">Precio (MXN)</div>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            inputMode="decimal"
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
        </label>

        <label className="block">
          <div className="text-sm font-medium">Descripción (opcional)</div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="mt-1 w-full resize-none rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
        </label>

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

        <div className="mt-4 pt-4 border-t border-[var(--border)]">
          <button
            type="button"
            disabled={deleting}
            onClick={handleDelete}
            className="w-full rounded-md border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-500/20 disabled:opacity-60"
          >
            {deleting ? "Eliminando..." : "Eliminar producto"}
          </button>
        </div>
      </form>
    </div>
  );
}
