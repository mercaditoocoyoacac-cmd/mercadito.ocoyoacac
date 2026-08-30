"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ProductoTutorial } from "@/components/ui/ProductoTutorial";
import { formatMoney } from "@/lib/format";

export function CompleteStoreSetup() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [hasProduct, setHasProduct] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/vendor/products");
      const data = await res.json();
      if (data?.ok && Array.isArray(data.products) && data.products.length > 0) {
        setHasProduct(true);
      }
    } catch {
      // noop
    }
    setLoading(false);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json().catch(() => null);
    setUploading(false);
    if (!res.ok || !data?.ok || !data.url) {
      setError("Error al subir la imagen.");
      return;
    }
    setImageUrl(data.url);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const priceNumber = Number(price.replace(/,/g, "."));
    if (!name.trim()) { setError("Escribe el nombre del producto."); return; }
    if (!price || isNaN(priceNumber) || priceNumber <= 0) { setError("Escribe un precio válido."); return; }
    setSubmitting(true);
    const res = await fetch("/api/vendor/products", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        priceCents: Math.round(priceNumber * 100),
        imageUrl: imageUrl || undefined,
      }),
    });
    const data = await res.json().catch(() => null);
    setSubmitting(false);
    if (!res.ok || !data?.ok) {
      setError(data?.error || "No se pudo crear el producto.");
      return;
    }
    setHasProduct(true);
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--border)] p-10 text-center text-sm text-[color:var(--muted)]">
        Cargando...
      </div>
    );
  }

  if (hasProduct) {
    return <WelcomeVendePlus />;
  }

  return (
    <div className="mx-auto max-w-xl">
      <ProductoTutorial show={true} />
      <h1 className="text-2xl font-semibold tracking-tight">Agrega tu primer producto</h1>
      <p className="mt-2 text-sm text-[color:var(--muted)]">
        Para completar tu registro como vendedor necesitas publicar al menos un producto.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="space-y-2">
          <div className="text-sm font-medium">Foto del producto (opcional)</div>
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
              {uploading ? "Subiendo..." : "Elegir imagen"}
            </button>
            {imageUrl && (
              <div className="relative h-16 w-16 overflow-hidden rounded-md border border-[var(--border)]">
                <img src={imageUrl} alt="Vista previa" className="h-full w-full object-cover" />
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
        </div>

        <label className="block">
          <div className="text-sm font-medium">Nombre del producto</div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            placeholder="Ej: Concha de vainilla"
          />
        </label>

        <label className="block">
          <div className="text-sm font-medium">Precio (pesos)</div>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            inputMode="decimal"
            required
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            placeholder="25.00"
          />
        </label>

        {error && (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || uploading}
          className="w-full rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60"
        >
          {submitting ? "Guardando..." : "Guardar y completar mi registro"}
        </button>
      </form>
    </div>
  );
}

export function WelcomeVendePlus() {
  return (
    <main className="mx-auto max-w-2xl">
      <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-50 to-white p-6 text-center shadow-sm">
        <div className="text-5xl">🎉</div>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">
          ¡Tu registro como vendedor está completo!
        </h1>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Ya estás en la membresía <strong>Vende (gratuita)</strong>. Puedes vender con recolección en tienda.
        </p>

        <div className="mt-6 rounded-xl border border-[var(--border)] bg-white p-4 text-left">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold">✅ Vende — Gratis</div>
              <p className="text-xs text-[color:var(--muted)]">Tu tienda + recolección en tienda</p>
            </div>
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">Plan actual</span>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-[var(--accent)] bg-[var(--accent-soft)] p-4 text-left">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold">💎 Vende+ — {formatMoney(83000)}/mes</div>
              <p className="text-xs text-[color:var(--muted)]">
                Envíos a domicilio, promociones, cupones, notificaciones y pagos en línea.
              </p>
            </div>
            <a
              href="/vendor/membresia"
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
            >
              Mejorar a Vende+
            </a>
          </div>
        </div>

        <a
          href="/vendor"
          className="mt-6 inline-block rounded-lg bg-emerald-600 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Ir a mi panel
        </a>
      </div>
    </main>
  );
}
