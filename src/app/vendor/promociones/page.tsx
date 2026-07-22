"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import { shimmerBlur } from "@/lib/images";
import { formatMoney } from "@/lib/format";

interface Product {
  id: string;
  name: string;
  priceCents: number;
  imageUrl: string | null;
}

interface PromotionProduct {
  id: string;
  promoPriceCents: number | null;
  quantity: number;
  product: Product;
}

interface Promotion {
  id: string;
  title: string;
  description: string | null;
  discountPercentage: number | null;
  imageUrl: string | null;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  requiresCoupon: boolean;
  products: PromotionProduct[];
}

export default function VendorPromocionesPage() {
  const router = useRouter();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [discountPct, setDiscountPct] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [promoPrices, setPromoPrices] = useState<Record<string, string>>({});
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [requiresCoupon, setRequiresCoupon] = useState(false);
  const [isPercentage, setIsPercentage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchData() {
    const [promoRes, prodRes] = await Promise.all([
      fetch("/api/vendor/promotions"),
      fetch("/api/vendor/products"),
    ]);
    const promoData = await promoRes.json();
    const prodData = await prodRes.json();
    if (promoData.ok) setPromotions(promoData.promotions);
    if (prodData.ok) setProducts(prodData.products?.filter((p: Product & { isActive: boolean }) => p.isActive !== false) || prodData.products || []);
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  function resetForm() {
    setTitle("");
    setDescription("");
    setDiscountPct("");
    setImageUrl("");
    setStartDate("");
    setEndDate("");
    setSelectedProducts(new Set());
    setPromoPrices({});
    setQuantities({});
    setRequiresCoupon(false);
    setIsPercentage(false);
    setEditingId(null);
    setShowForm(false);
    setError(null);
  }

  function openEdit(promo: Promotion) {
    setEditingId(promo.id);
    setTitle(promo.title);
    setDescription(promo.description || "");
    setDiscountPct(promo.discountPercentage?.toString() || "");
    setImageUrl(promo.imageUrl || "");
    setStartDate(promo.startDate ? promo.startDate.slice(0, 10) : "");
    setEndDate(promo.endDate ? promo.endDate.slice(0, 10) : "");
    setSelectedProducts(new Set(promo.products.map((pp) => pp.product.id)));
    const prices: Record<string, string> = {};
    const qtys: Record<string, string> = {};
    promo.products.forEach((pp) => {
      if (pp.promoPriceCents != null) {
        prices[pp.product.id] = (pp.promoPriceCents / 100).toString();
      }
      qtys[pp.product.id] = (pp.quantity || 1).toString();
    });
    setPromoPrices(prices);
    setQuantities(qtys);
    setRequiresCoupon(promo.requiresCoupon ?? false);
    setIsPercentage(!!(promo.discountPercentage && promo.discountPercentage > 0));
    setShowForm(true);
    setError(null);
  }

  function toggleProduct(productId: string) {
    setSelectedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  }

  function toggleAll() {
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(products.map((p) => p.id)));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) { setError("Escribe un nombre para la promoción"); return; }
    if (selectedProducts.size === 0) { setError("Selecciona al menos un producto"); return; }

    setSaving(true);

    const prices: Record<string, number> = {};
    const qtys: Record<string, number> = {};
    selectedProducts.forEach((pid) => {
      const raw = promoPrices[pid];
      if (raw && parseFloat(raw) > 0) {
        prices[pid] = Math.round(parseFloat(raw) * 100);
      }
      const q = quantities[pid];
      qtys[pid] = q ? parseInt(q) : 1;
    });

    const body = {
      title: title.trim(),
      description: description.trim() || undefined,
      discountPercentage: isPercentage && discountPct ? parseInt(discountPct) : null,
      imageUrl: imageUrl || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      requiresCoupon,
      productIds: Array.from(selectedProducts),
      promoPrices: isPercentage ? {} : prices,
      quantities: qtys,
    };

    const url = editingId ? `/api/vendor/promotions/${editingId}` : "/api/vendor/promotions";
    const method = editingId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok || !data?.ok) {
      setError(data?.error || "Error al guardar");
      return;
    }

    resetForm();
    fetchData();
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta promoción?")) return;
    const res = await fetch(`/api/vendor/promotions/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!data?.ok) {
      alert(data?.error || "Error al eliminar");
      return;
    }
    fetchData();
  }

  async function handleToggle(id: string, currentActive: boolean) {
    const res = await fetch(`/api/vendor/promotions/${id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isActive: !currentActive }),
    });
    const data = await res.json();
    if (!data?.ok) {
      alert(data?.error || "Error");
      return;
    }
    fetchData();
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-semibold">Promociones</h1>
        <div className="mt-6 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Promociones</h1>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            Crea promociones con uno o más productos de tu tienda
          </p>
        </div>
        <button
          type="button"
          onClick={() => { resetForm(); setShowForm(true); }}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
        >
          + Nueva promoción
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-6 rounded-xl border border-[var(--border)] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{editingId ? "Editar promoción" : "Nueva promoción"}</h2>
            <button type="button" onClick={resetForm} className="text-sm text-[color:var(--muted)] hover:underline">Cancelar</button>
          </div>

          <label className="block">
            <div className="text-sm font-medium">Nombre de la promoción *</div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              placeholder="Ej: Combo fin de semana, 2x1 en bebidas..."
              required
            />
          </label>

          <label className="block">
            <div className="text-sm font-medium">Descripción (opcional)</div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="mt-1 w-full resize-none rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              placeholder="Describe la promoción..."
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <div className="text-sm font-medium">Inicio</div>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              />
            </label>
            <label className="block">
              <div className="text-sm font-medium">Fin</div>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              />
            </label>
          </div>

          <label className="flex items-center gap-3 cursor-pointer rounded-lg border border-[var(--accent)] bg-[var(--accent-soft)] p-3 transition-colors">
            <input
              type="checkbox"
              checked={isPercentage}
              onChange={(e) => setIsPercentage(e.target.checked)}
              className="h-4 w-4 rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
            />
            <div>
              <div className="text-sm font-medium">
                {isPercentage ? "Descuento por porcentaje" : "Precio fijo de promoción"}
              </div>
              <div className="text-xs text-[color:var(--muted)]">
                {isPercentage
                  ? "Se aplica un % de descuento a todos los productos seleccionados."
                  : "Colocas el precio exacto de promoción por cada producto."}
              </div>
            </div>
          </label>

          {isPercentage ? (
            <label className="block">
              <div className="text-sm font-medium">% Descuento general</div>
              <input
                value={discountPct}
                onChange={(e) => setDiscountPct(e.target.value)}
                inputMode="numeric"
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                placeholder="Ej: 20"
              />
            </label>
          ) : null}

          <label className="flex items-center gap-3 cursor-pointer rounded-lg border border-[var(--border)] p-3 hover:bg-gray-50 transition-colors">
            <input
              type="checkbox"
              checked={requiresCoupon}
              onChange={(e) => setRequiresCoupon(e.target.checked)}
              className="h-4 w-4 rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
            />
            <div>
              <div className="text-sm font-medium">Requiere cupón para activarse</div>
              <div className="text-xs text-[color:var(--muted)]">
                Si está marcado, esta promoción solo se aplica cuando el cliente ingresa un código de cupón. Si no está marcado, se aplica automáticamente.
              </div>
            </div>
          </label>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium">Productos incluidos * ({selectedProducts.size} seleccionados)</div>
              <button type="button" onClick={toggleAll} className="text-xs text-[var(--accent)] hover:underline">
                {selectedProducts.size === products.length ? "Deseleccionar todos" : "Seleccionar todos"}
              </button>
            </div>
            {products.length === 0 ? (
              <p className="text-sm text-[color:var(--muted)]">No tienes productos creados aún.</p>
            ) : (
              <div className="max-h-64 overflow-y-auto rounded-lg border border-[var(--border)] divide-y divide-[var(--border)]">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${
                      selectedProducts.has(product.id) ? "bg-[var(--accent-soft)]" : "hover:bg-gray-50"
                    }`}
                    onClick={() => toggleProduct(product.id)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedProducts.has(product.id)}
                      onChange={() => toggleProduct(product.id)}
                      className="rounded border-[var(--border)] shrink-0"
                    />
                    {product.imageUrl ? (
                      <Image
                        src={product.imageUrl}
                        alt={product.name}
                        width={32}
                        height={32}
                        className="h-8 w-8 rounded-md object-cover shrink-0"
                        placeholder="blur"
                        blurDataURL={shimmerBlur}
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-md bg-gray-100 flex items-center justify-center text-xs text-gray-400 shrink-0">
                        📦
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{product.name}</div>
                      <div className="text-xs text-[color:var(--muted)]">
                        {formatMoney(product.priceCents, "MXN")}
                      </div>
                    </div>
                    {selectedProducts.has(product.id) && (
                      <div className="shrink-0 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          value={quantities[product.id] || "1"}
                          onChange={(e) => setQuantities((prev) => ({ ...prev, [product.id]: e.target.value }))}
                          inputMode="numeric"
                          className="w-12 rounded-md border border-[var(--border)] bg-white px-2 py-1 text-xs text-center outline-none focus:border-[var(--accent)]"
                          placeholder="Cant"
                          min="1"
                        />
                        {!isPercentage && (
                          <input
                            value={promoPrices[product.id] || ""}
                            onChange={(e) => setPromoPrices((prev) => ({ ...prev, [product.id]: e.target.value }))}
                            inputMode="decimal"
                            className="w-20 rounded-md border border-[var(--border)] bg-white px-2 py-1 text-xs outline-none focus:border-[var(--accent)]"
                            placeholder="P. promo"
                          />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60"
          >
            {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Crear promoción"}
          </button>
        </form>
      )}

      <div className="mt-6 space-y-3">
        {promotions.length === 0 && !showForm ? (
          <div className="rounded-xl border border-dashed border-[var(--border)] p-10 text-center text-sm text-[color:var(--muted)]">
            No tienes promociones creadas aún.
          </div>
        ) : (
          promotions.map((promo) => (
            <div key={promo.id} className={`rounded-xl border border-[var(--border)] p-4 transition-opacity ${!promo.isActive ? "opacity-50" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">{promo.title}</h3>
                    {!promo.isActive && (
                      <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-medium text-gray-600">Inactiva</span>
                    )}
                    {promo.requiresCoupon && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">Requiere cupón</span>
                    )}
                    {promo.discountPercentage && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600">
                        -{promo.discountPercentage}%
                      </span>
                    )}
                  </div>
                  {promo.description && (
                    <p className="mt-1 text-sm text-[color:var(--muted)]">{promo.description}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {promo.products.map((pp) => (
                      <div key={pp.id} className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-gray-50 px-2 py-1">
                        {pp.product.imageUrl && (
                          <Image
                            src={pp.product.imageUrl}
                            alt={pp.product.name}
                            width={20}
                            height={20}
                            className="h-5 w-5 rounded object-cover"
                            placeholder="blur"
                            blurDataURL={shimmerBlur}
                          />
                        )}
                        <span className="text-xs font-medium">{pp.product.name}</span>
                        {(pp.quantity || 1) > 1 && (
                          <span className="rounded bg-[var(--accent)] text-white px-1 py-0.5 text-[9px] font-bold leading-none">
                            {pp.quantity}x1
                          </span>
                        )}
                        {pp.promoPriceCents != null && (
                          <span className="text-xs text-[var(--accent)] font-bold">
                            {formatMoney(pp.promoPriceCents, "MXN")}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  {promo.endDate && (
                    <div className="mt-2 text-[10px] text-amber-600">
                      Vence: {new Date(promo.endDate).toLocaleDateString("es-MX")}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggle(promo.id, promo.isActive)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium border ${
                      promo.isActive
                        ? "border-green-300 text-green-600 hover:bg-green-50"
                        : "border-gray-300 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {promo.isActive ? "Activa" : "Inactiva"}
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(promo)}
                    className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium hover:bg-gray-50"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(promo.id)}
                    className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
