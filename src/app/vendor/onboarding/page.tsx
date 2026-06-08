"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

export default function VendorOnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const autoSlug = useMemo(() => slugify(name), [name]);
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState("CANASTA_BASICA");
  const [categories, setCategories] = useState<{ key: string; label: string; icon: string }[]>([]);
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/admin/categories")
      .then((r) => r.json())
      .then((data) => { if (data.ok) setCategories(data.categories); })
      .catch(() => {});
  }, []);

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

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-semibold tracking-tight">Crea tu tienda</h1>
      <p className="mt-2 text-sm text-[color:var(--muted)]">
        Configura tu storefront para empezar a publicar productos.
      </p>

      <form
        className="mt-6 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setLoading(true);
          setError(null);
          const res = await fetch("/api/vendor/store", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              name,
              slug: (slug || autoSlug).trim(),
              category,
              description: description.trim() || undefined,
              phone: phone.trim() || undefined,
              address: address.trim() || undefined,
              imageUrl: imageUrl || undefined,
            }),
          });
          const text = await res.text().catch(() => "");
          let data: { ok: true; store: { id: string; slug: string; name: string } } | { ok: false; error?: string } | null = null;
          try { data = JSON.parse(text); } catch {}
          setLoading(false);
          if (!res.ok || !data?.ok) {
            const msg =
              data && "error" in data
                ? data.error
                : `Error del servidor (${res.status}): ${text.slice(0, 200)}`;
            setError(msg ?? "No se pudo crear la tienda.");
            return;
          }
          router.push("/vendor");
        }}
      >
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
              {uploading ? "Subiendo..." : "Elegir imagen"}
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
            placeholder="Ej: Panadería La Esquina"
          />
        </label>

        <label className="block">
          <div className="flex items-baseline justify-between gap-2">
            <div className="text-sm font-medium">Slug (URL)</div>
            <div className="text-xs text-[color:var(--muted)]">
              Ej: <span className="font-mono">{autoSlug || "mi-tienda"}</span>
            </div>
          </div>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 font-mono text-sm outline-none focus:border-[var(--accent)]"
            placeholder={autoSlug || "mi-tienda"}
          />
        </label>

        <label className="block">
          <div className="text-sm font-medium">Categoría del negocio</div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          >
            <option value="CANASTA_BASICA">🛒 Canasta básica</option>
            {categories.filter((c) => c.key !== "CANASTA_BASICA").map((cat) => (
              <option key={cat.key} value={cat.key}>{cat.icon} {cat.label}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-[color:var(--muted)]">
            {category === "SERVICIOS"
              ? "Consultorios, estéticas, oficios, renta para fiestas y similares. Sin envío ni recolección."
              : "Tiendas con productos disponibles para pedido y entrega."}
          </p>
        </label>

        <label className="block">
          <div className="text-sm font-medium">Descripción (opcional)</div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-1 w-full resize-none rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            placeholder="¿Qué vendes? Horarios, especialidades..."
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <div className="text-sm font-medium">Teléfono (opcional)</div>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              placeholder="722..."
            />
          </label>
          <label className="block">
            <div className="text-sm font-medium">Dirección (opcional)</div>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              placeholder="Centro, Ocoyoacac"
            />
          </label>
        </div>

        {error ? (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading || uploading}
          className="w-full rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60"
        >
          {loading ? "Creando..." : "Crear tienda"}
        </button>
      </form>
    </div>
  );
}
