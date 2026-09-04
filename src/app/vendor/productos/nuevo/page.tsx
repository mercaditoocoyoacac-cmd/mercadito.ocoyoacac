"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { FieldError } from "@/components/ui/FieldError";
import { ProductoTutorial } from "@/components/ui/ProductoTutorial";

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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [sellByWeight, setSellByWeight] = useState(false);
  const [minWeightGrams, setMinWeightGrams] = useState("100");
  const [maxWeightGrams, setMaxWeightGrams] = useState("5000");
  const [isService, setIsService] = useState(false);
  const [showPrice, setShowPrice] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [variants, setVariants] = useState<VariantEntry[]>([]);
  const [isPromotion, setIsPromotion] = useState(false);
  const [promotionPrice, setPromotionPrice] = useState("");
  const [discountPercentage, setDiscountPercentage] = useState("");
  const [promotionStartDate, setPromotionStartDate] = useState("");
  const [promotionEndDate, setPromotionEndDate] = useState("");
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
      <ProductoTutorial show={true} />
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
          setFieldErrors({});

          const errors: Record<string, string> = {};
          if (!name.trim()) errors.name = "El nombre es obligatorio";
          const priceNumber = Number(price);
          if (!Number.isFinite(priceNumber) || priceNumber < 0) errors.price = "El precio no puede ser negativo";
          if (!isService && (!Number.isFinite(priceNumber) || priceNumber <= 0)) errors.price = "El precio debe ser mayor a 0";
          variants.forEach((v, _i) => {
            if (v.name.trim() && (!Number.isFinite(Number(v.price)) || Number(v.price) <= 0)) {
              errors[`variant_${v.key}_price`] = `El precio de "${v.name}" debe ser mayor a 0`;
            }
          });
          if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            setLoading(false);
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
              sellByWeight,
              isService,
              showPrice: isService ? showPrice : true,
              minWeightGrams: sellByWeight ? parseInt(minWeightGrams) || 100 : undefined,
              maxWeightGrams: sellByWeight ? parseInt(maxWeightGrams) || 5000 : undefined,
              variants: variantsPayload.length > 0 ? variantsPayload : undefined,
              isPromotion,
              promotionPriceCents: isPromotion && promotionPrice ? Math.round(Number(promotionPrice) * 100) : undefined,
              discountPercentage: isPromotion && discountPercentage ? parseInt(discountPercentage) : undefined,
              promotionStartDate: isPromotion && promotionStartDate ? new Date(promotionStartDate).toISOString() : undefined,
              promotionEndDate: isPromotion && promotionEndDate ? new Date(promotionEndDate).toISOString() : undefined,
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
            onChange={(e) => {
              setName(e.target.value);
              if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: "" }));
            }}
            onBlur={() => {
              if (!name.trim()) setFieldErrors((prev) => ({ ...prev, name: "El nombre es obligatorio" }));
              else setFieldErrors((prev) => ({ ...prev, name: "" }));
            }}
            required
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            placeholder="Ej: Concha de vainilla"
          />
          <FieldError message={fieldErrors.name} />
        </label>

        <label className="block">
          <div className="text-sm font-medium">
            Precio {sellByWeight ? "por kg (MXN)" : "(MXN)"}
            {isService && <span className="text-xs font-normal text-[color:var(--muted)]"> (opcional para servicios)</span>}
            <HelpTip text={sellByWeight ? "Precio por kilogramo. Ej: 150 = $150/kg" : isService ? "Escribe tu precio base. Si ocultas el precio, se guardará solo de forma interna." : "¿Cuánto cobras por este producto? Solo números, ej: 25.00"} />
          </div>
          <input
            value={price}
            onChange={(e) => {
              setPrice(e.target.value);
              if (fieldErrors.price) setFieldErrors((prev) => ({ ...prev, price: "" }));
            }}
            onBlur={() => {
              const n = Number(price);
              if (isService) { setFieldErrors((prev) => ({ ...prev, price: "" })); return; }
              if (!Number.isFinite(n) || n <= 0) setFieldErrors((prev) => ({ ...prev, price: "El precio debe ser mayor a 0" }));
              else setFieldErrors((prev) => ({ ...prev, price: "" }));
            }}
            required={!isService}
            inputMode="decimal"
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            placeholder={sellByWeight ? "Ej: 150.00 (precio por kg)" : "Ej: 25.00"}
          />
          <FieldError message={fieldErrors.price} />
        </label>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isService"
            checked={isService}
            onChange={(e) => {
              setIsService(e.target.checked);
              if (e.target.checked) setShowPrice(true);
              if (fieldErrors.price) setFieldErrors((prev) => ({ ...prev, price: "" }));
            }}
            className="rounded border-[var(--border)]"
          />
          <label htmlFor="isService" className="text-sm cursor-pointer">
            Es un servicio / cita (masajes, consultas, citas, etc.)
          </label>
        </div>

        {isService && (
          <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-3 space-y-3">
            <p className="text-sm text-[color:var(--muted)]">
              Los servicios no se venden por carrito: el cliente verá un botón{" "}
              <span className="font-medium">“Asignar cita”</span> que lo llevará a tu WhatsApp.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showPrice"
                checked={showPrice}
                onChange={(e) => setShowPrice(e.target.checked)}
                className="rounded border-[var(--border)]"
              />
              <label htmlFor="showPrice" className="text-sm cursor-pointer">
                Mostrar el precio de este servicio
              </label>
            </div>
            {!showPrice && (
              <p className="text-xs text-[color:var(--muted)]">
                El cliente verá “Precio a cotizar” en lugar de tu precio. El precio que escribas arriba se guarda de forma interna.
              </p>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="sellByWeight"
            checked={sellByWeight}
            onChange={(e) => setSellByWeight(e.target.checked)}
            className="rounded border-[var(--border)]"
          />
          <label htmlFor="sellByWeight" className="text-sm cursor-pointer">
            Venta por peso / gramo (carnicería, pollería, verdulería, etc.)
          </label>
        </div>

        {sellByWeight && (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <div className="text-sm font-medium">Peso mínimo (gramos)</div>
              <input
                value={minWeightGrams}
                onChange={(e) => setMinWeightGrams(e.target.value)}
                inputMode="numeric"
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                placeholder="Ej: 100"
              />
            </label>
            <label className="block">
              <div className="text-sm font-medium">Peso máximo (gramos)</div>
              <input
                value={maxWeightGrams}
                onChange={(e) => setMaxWeightGrams(e.target.value)}
                inputMode="numeric"
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                placeholder="Ej: 5000"
              />
            </label>
          </div>
        )}

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

            <div className="border-t border-[var(--border)] pt-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPromotion"
                  checked={isPromotion}
                  onChange={(e) => setIsPromotion(e.target.checked)}
                  className="rounded border-[var(--border)]"
                />
                <label htmlFor="isPromotion" className="text-sm font-medium cursor-pointer">
                  Promoción / Descuento
                  <HelpTip text="Activa esta opción si quieres mostrar un precio especial con descuento. Aparecerá en la sección de promociones de tu tienda." />
                </label>
              </div>
              {isPromotion && (
                <div className="mt-3 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <div className="text-sm font-medium">Precio promocional (MXN)</div>
                      <input
                        value={promotionPrice}
                        onChange={(e) => setPromotionPrice(e.target.value)}
                        inputMode="decimal"
                        className="mt-1 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                        placeholder="Ej: 20.00"
                      />
                    </label>
                    <label className="block">
                      <div className="text-sm font-medium">% de descuento</div>
                      <input
                        value={discountPercentage}
                        onChange={(e) => setDiscountPercentage(e.target.value)}
                        inputMode="numeric"
                        className="mt-1 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                        placeholder="Ej: 20"
                      />
                    </label>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <div className="text-sm font-medium">Inicio de promoción</div>
                      <input
                        type="date"
                        value={promotionStartDate}
                        onChange={(e) => setPromotionStartDate(e.target.value)}
                        className="mt-1 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                      />
                    </label>
                    <label className="block">
                      <div className="text-sm font-medium">Fin de promoción</div>
                      <input
                        type="date"
                        value={promotionEndDate}
                        onChange={(e) => setPromotionEndDate(e.target.value)}
                        className="mt-1 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                      />
                    </label>
                  </div>
                </div>
              )}
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
                      <FieldError message={fieldErrors[`variant_${v.key}_price`]} />
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
