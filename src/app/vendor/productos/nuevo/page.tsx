"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

function HelpTip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(!show)}
        className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full border border-[color:var(--muted)] text-[10px] text-[color:var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
        aria-label="Ayuda"
      >
        ?
      </button>
      {show && (
        <div className="absolute bottom-full left-1/2 mb-2 w-56 -translate-x-1/2 rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-xs text-[color:var(--muted)] shadow-lg z-10">
          {text}
        </div>
      )}
    </span>
  );
}

interface VariantEntry {
  key: string;
  name: string;
  price: string;
}

export default function NuevoProductoPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("0");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [sku, setSku] = useState("");
  const [stock, setStock] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [variants, setVariants] = useState<VariantEntry[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function addVariant() {
    setVariants([...variants, { key: crypto.randomUUID(), name: "", price: "0" }]);
  }

  function updateVariant(key: string, field: "name" | "price", value: string) {
    setVariants(variants.map((v) => (v.key === key ? { ...v, [field]: value } : v)));
  }

  function removeVariant(key: string) {
    setVariants(variants.filter((v) => v.key !== key));
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

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-semibold tracking-tight">Nuevo producto</h1>
      <p className="mt-2 text-sm text-[color:var(--muted)]">
        Publica un producto para tu tienda.
      </p>

      <form
        className="mt-6 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setLoading(true);
          setError(null);

          const priceNumber = Number(price);
          if (!Number.isFinite(priceNumber) || priceNumber <= 0) {
            setLoading(false);
            setError("El precio debe ser mayor a 0.");
            return;
          }

          const variantsPayload = variants
            .filter((v) => v.name.trim())
            .map((v, i) => ({
              name: v.name.trim(),
              priceCents: Math.round(Number(v.price) * 100) || 0,
              sortOrder: i,
            }));

          const res = await fetch("/api/vendor/products", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              name,
              description: description.trim() || undefined,
              priceCents: Math.round(priceNumber * 100),
              imageUrl: imageUrl || undefined,
              sku: sku.trim() || undefined,
              stock: stock.trim() === "" ? -1 : parseInt(stock) || 0,
              variants: variantsPayload.length > 0 ? variantsPayload : undefined,
            }),
          });
          const data = (await res.json().catch(() => null)) as
            | { ok: true; product: { id: string } }
            | { ok: false; error?: string }
            | null;
          setLoading(false);
          if (!res.ok || !data?.ok) {
            const msg =
              data && "error" in data
                ? data.error
                : "No se pudo crear el producto.";
            setError(msg ?? "No se pudo crear el producto.");
            return;
          }
          router.push("/vendor/productos");
        }}
      >
        <label className="block">
          <div className="text-sm font-medium">
            Nombre del producto
            <HelpTip text="Pon el nombre tal como lo conocen tus clientes. Ej: 'Concha de vainilla', 'Refresco de cola 600ml'." />
          </div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            placeholder="Ej: Concha de vainilla"
          />
        </label>

        <label className="block">
          <div className="text-sm font-medium">
            Precio (MXN)
            <HelpTip text="¿Cuánto cobras por este producto? Solo números, ej: 25.00" />
          </div>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            inputMode="decimal"
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            placeholder="Ej: 25.00"
          />
        </label>

        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-[var(--border)] px-4 py-2 text-sm text-[color:var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          <svg
            className={`h-4 w-4 transition-transform ${showAdvanced ? "rotate-90" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          {showAdvanced ? "Ocultar opciones avanzadas" : "Mostrar más opciones (imagen, código, inventario, variantes)"}
        </button>

        {showAdvanced && (
          <div className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--accent-soft)]/30 p-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">
                Imagen del producto
                <HelpTip text="Una foto ayuda a que los clientes reconozcan tu producto. Toma la foto con tu celular y súbela aquí." />
              </div>
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
                  className="rounded-md border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium hover:bg-[var(--accent-soft)] disabled:opacity-60"
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

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <div className="text-sm font-medium">
                  SKU / Código (opcional)
                  <HelpTip text="Si usas códigos propios para identificar tus productos, escríbelos aquí. Si no, déjalo vacío." />
                </div>
                <input
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="mt-1 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm font-mono outline-none focus:border-[var(--accent)]"
                  placeholder="Ej: CON-001"
                />
              </label>
              <label className="block">
                <div className="text-sm font-medium">
                  Existencias
                  <HelpTip text="¿Cuántos tienes disponibles? Si vendes productos hechos a mano o no llevas control, déjalo vacío." />
                </div>
                <input
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  inputMode="numeric"
                  className="mt-1 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                  placeholder="Vacío = sin control"
                />
                <p className="mt-1 text-xs text-[color:var(--muted)]">
                  Vacío = sin control de inventario
                </p>
              </label>
            </div>

            <label className="block">
              <div className="text-sm font-medium">
                Descripción (opcional)
                <HelpTip text="Describe ingredientes, tamaño, colores disponibles. Ayuda a que el cliente sepa qué está comprando." />
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="mt-1 w-full resize-none rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                placeholder="Ej: Concha de vainilla espolvoreada con azúcar, 80g"
              />
            </label>

            <div className="border-t border-[var(--border)] pt-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">
                  Variantes
                  <HelpTip text="Si tu producto tiene versiones (ej: clásica, hawaiana, doble), agrégalas aquí. El cliente podrá elegir desde una lista." />
                </div>
                <button
                  type="button"
                  onClick={addVariant}
                  className="text-xs text-[var(--accent)] hover:underline"
                >
                  + Agregar variante
                </button>
              </div>
              {variants.length === 0 && (
                <p className="mt-2 text-xs text-[color:var(--muted)]">
                  Sin variantes. El producto se venderá tal cual.
                </p>
              )}
              <div className="mt-2 space-y-2">
                {variants.map((v) => (
                  <div key={v.key} className="flex items-start gap-2 rounded-md border border-[var(--border)] bg-white p-2">
                    <div className="flex-1">
                      <input
                        value={v.name}
                        onChange={(e) => updateVariant(v.key, "name", e.target.value)}
                        placeholder="Ej: Clásica"
                        className="w-full border-b border-transparent bg-transparent px-1 py-1 text-sm outline-none focus:border-[var(--accent)]"
                      />
                    </div>
                    <div className="w-24">
                      <input
                        value={v.price}
                        onChange={(e) => updateVariant(v.key, "price", e.target.value)}
                        inputMode="decimal"
                        placeholder="Precio"
                        className="w-full border-b border-transparent bg-transparent px-1 py-1 text-sm outline-none focus:border-[var(--accent)]"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeVariant(v.key)}
                      className="shrink-0 rounded p-1 text-xs text-red-500 hover:bg-red-50"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

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
            disabled={loading || uploading}
            className="flex-1 rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60"
          >
            {loading ? "Guardando..." : "Crear producto"}
          </button>
        </div>
      </form>
    </div>
  );
}
