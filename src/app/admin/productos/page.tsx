"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(cents / 100);
}

interface Store {
  id: string;
  name: string;
  slug: string;
}

interface Variant {
  id?: string;
  name: string;
  priceCents: number;
  sortOrder: number;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  currency: string;
  isActive: boolean;
  imageUrl: string | null;
  sku: string | null;
  stock: number;
  isUnavailable: boolean;
  sellByWeight: boolean;
  variants: Variant[];
}

interface ProductFormData {
  name: string;
  price: string;
  description: string;
  imageUrl: string;
  sku: string;
  stock: string;
  isActive: boolean;
  sellByWeight: boolean;
  minWeightGrams: string;
  maxWeightGrams: string;
}

function ProductForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: ProductFormData | null;
  onSave: (data: ProductFormData & { variants: { name: string; price: string }[] }) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [price, setPrice] = useState(initial?.price ?? "0");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? "");
  const [sku, setSku] = useState(initial?.sku ?? "");
  const [stock, setStock] = useState(initial?.stock ?? "");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [sellByWeight, setSellByWeight] = useState(initial?.sellByWeight ?? false);
  const [minWeightGrams, setMinWeightGrams] = useState(initial?.minWeightGrams ?? "100");
  const [maxWeightGrams, setMaxWeightGrams] = useState(initial?.maxWeightGrams ?? "5000");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [variants, setVariants] = useState<{ key: string; name: string; price: string }[]>([]);
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
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json();
    setUploading(false);
    if (!res.ok || !data.ok) {
      setError(data.error ?? "Error al subir imagen.");
      return;
    }
    setImageUrl(data.url);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const priceNumber = Number(price);
    if (!Number.isFinite(priceNumber) || priceNumber <= 0) {
      setError("El precio debe ser mayor a 0.");
      return;
    }
    setSaving(true);
    setError(null);
    const variantsPayload = variants
      .filter((v) => v.name.trim())
      .map((v, i) => ({ name: v.name.trim(), price: v.price, sortOrder: i }));
    // Map back with key removed for the parent
    await onSave({
      name, price, description, imageUrl, sku, stock, isActive,
      sellByWeight, minWeightGrams, maxWeightGrams,
      variants: variantsPayload,
    });
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block">
        <div className="text-sm font-medium">Nombre del producto</div>
        <input value={name} onChange={(e) => setName(e.target.value)} required
          className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          placeholder="Ej: Concha de vainilla" />
      </label>

      <label className="block">
        <div className="text-sm font-medium">Precio {sellByWeight ? "por kg (MXN)" : "(MXN)"}</div>
        <input value={price} onChange={(e) => setPrice(e.target.value)} required inputMode="decimal"
          className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          placeholder={sellByWeight ? "Ej: 150.00 (precio por kg)" : "Ej: 25.00"} />
      </label>

      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)}
            className="rounded border-[var(--border)]" />
          <span className="text-sm">Producto activo</span>
        </label>
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" id="sellByWeight" checked={sellByWeight}
          onChange={(e) => setSellByWeight(e.target.checked)}
          className="rounded border-[var(--border)]" />
        <label htmlFor="sellByWeight" className="text-sm cursor-pointer">
          Venta por peso / gramo
        </label>
      </div>

      {sellByWeight && (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <div className="text-sm font-medium">Peso mínimo (gramos)</div>
            <input value={minWeightGrams} onChange={(e) => setMinWeightGrams(e.target.value)} inputMode="numeric"
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              placeholder="Ej: 100" />
          </label>
          <label className="block">
            <div className="text-sm font-medium">Peso máximo (gramos)</div>
            <input value={maxWeightGrams} onChange={(e) => setMaxWeightGrams(e.target.value)} inputMode="numeric"
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              placeholder="Ej: 5000" />
          </label>
        </div>
      )}

      <button type="button" onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-[var(--border)] px-4 py-2 text-sm text-[color:var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]">
        <svg className={`h-4 w-4 transition-transform ${showAdvanced ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        {showAdvanced ? "Ocultar opciones avanzadas" : "Mostrar más opciones (imagen, código, inventario, variantes)"}
      </button>

      {showAdvanced && (
        <div className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--accent-soft)]/30 p-4">
          <div className="space-y-2">
            <div className="text-sm font-medium">Imagen del producto</div>
            <div className="flex items-center gap-4">
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleFileChange} className="hidden" />
              <button type="button" onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="rounded-md border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium hover:bg-[var(--accent-soft)] disabled:opacity-60">
                {uploading ? "Subiendo..." : "Elegir imagen"}
              </button>
              {imageUrl && (
                <div className="relative h-16 w-16 overflow-hidden rounded-md border border-[var(--border)]">
                  <img src={imageUrl} alt="Vista previa" className="h-full w-full object-cover" />
                  <button type="button" onClick={() => setImageUrl("")}
                    className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 hover:opacity-100">×</button>
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <div className="text-sm font-medium">SKU / Código (opcional)</div>
              <input value={sku} onChange={(e) => setSku(e.target.value)}
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm font-mono outline-none focus:border-[var(--accent)]"
                placeholder="Ej: CON-001" />
            </label>
            <label className="block">
              <div className="text-sm font-medium">Existencias</div>
              <input value={stock} onChange={(e) => setStock(e.target.value)} inputMode="numeric"
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                placeholder="Vacío = sin control" />
            </label>
          </div>

          <label className="block">
            <div className="text-sm font-medium">Descripción (opcional)</div>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
              className="mt-1 w-full resize-none rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              placeholder="Ej: Concha de vainilla espolvoreada con azúcar, 80g" />
          </label>

          <div className="border-t border-[var(--border)] pt-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Variantes</div>
              <button type="button" onClick={addVariant}
                className="text-xs text-[var(--accent)] hover:underline">+ Agregar variante</button>
            </div>
            {variants.length === 0 && (
              <p className="mt-2 text-xs text-[color:var(--muted)]">Sin variantes. El producto se venderá tal cual.</p>
            )}
            <div className="mt-2 space-y-2">
              {variants.map((v) => (
                <div key={v.key} className="flex items-start gap-2 rounded-md border border-[var(--border)] bg-white p-2">
                  <div className="flex-1">
                    <input value={v.name} onChange={(e) => updateVariant(v.key, "name", e.target.value)}
                      placeholder="Ej: Clásica"
                      className="w-full border-b border-transparent bg-transparent px-1 py-1 text-sm outline-none focus:border-[var(--accent)]" />
                  </div>
                  <div className="w-24">
                    <input value={v.price} onChange={(e) => updateVariant(v.key, "price", e.target.value)} inputMode="decimal"
                      placeholder="Precio"
                      className="w-full border-b border-transparent bg-transparent px-1 py-1 text-sm outline-none focus:border-[var(--accent)]" />
                  </div>
                  <button type="button" onClick={() => removeVariant(v.key)}
                    className="shrink-0 rounded p-1 text-xs text-red-500 hover:bg-red-50">×</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <div className="flex gap-3">
        <button type="button" onClick={onCancel}
          className="flex-1 rounded-md border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-[var(--accent-soft)]">
          Cancelar
        </button>
        <button type="submit" disabled={saving || uploading}
          className="flex-1 rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60">
          {saving ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </form>
  );
}

export default function AdminProductosPage() {
  const router = useRouter();
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/stores")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) setStores(data.stores);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedStoreId) {
      setProducts([]);
      return;
    }
    setLoading(true);
    fetch(`/api/admin/products?storeId=${selectedStoreId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) setProducts(data.products);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedStoreId]);

  async function handleCreate(data: ProductFormData & { variants: { name: string; price: string }[] }) {
    const res = await fetch("/api/admin/products", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        storeId: selectedStoreId,
        name: data.name,
        description: data.description.trim() || undefined,
        priceCents: Math.round(Number(data.price) * 100),
        imageUrl: data.imageUrl || undefined,
        isActive: data.isActive,
        sku: data.sku.trim() || undefined,
        stock: data.stock.trim() === "" ? -1 : parseInt(data.stock) || 0,
        sellByWeight: data.sellByWeight,
        minWeightGrams: data.sellByWeight ? parseInt(data.minWeightGrams) || 100 : undefined,
        maxWeightGrams: data.sellByWeight ? parseInt(data.maxWeightGrams) || 5000 : undefined,
        variants: data.variants.length > 0
          ? data.variants.map((v, i) => ({ name: v.name, priceCents: Math.round(Number(v.price) * 100) || 0, sortOrder: i }))
          : undefined,
      }),
    });
    const result = await res.json();
    if (!res.ok || !result.ok) {
      setError(result.error ?? "Error al crear producto");
      return;
    }
    setShowForm(false);
    setError(null);
    // Reload products
    const reload = await fetch(`/api/admin/products?storeId=${selectedStoreId}`);
    const reloadData = await reload.json();
    if (reloadData.ok) setProducts(reloadData.products);
  }

  async function handleUpdate(data: ProductFormData & { variants: { name: string; price: string }[] }) {
    if (!editingProduct) return;
    const res = await fetch(`/api/admin/products/${editingProduct.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: data.name,
        description: data.description.trim() || undefined,
        priceCents: Math.round(Number(data.price) * 100),
        imageUrl: data.imageUrl || undefined,
        isActive: data.isActive,
        sku: data.sku.trim() || undefined,
        stock: data.stock.trim() === "" ? -1 : parseInt(data.stock) || 0,
        sellByWeight: data.sellByWeight,
        minWeightGrams: data.sellByWeight ? parseInt(data.minWeightGrams) || 100 : undefined,
        maxWeightGrams: data.sellByWeight ? parseInt(data.maxWeightGrams) || 5000 : undefined,
        variants: data.variants.length > 0
          ? data.variants.map((v, i) => ({ name: v.name, priceCents: Math.round(Number(v.price) * 100) || 0, sortOrder: i }))
          : [],
      }),
    });
    const result = await res.json();
    if (!res.ok || !result.ok) {
      setError(result.error ?? "Error al actualizar producto");
      return;
    }
    setEditingProduct(null);
    setError(null);
    const reload = await fetch(`/api/admin/products?storeId=${selectedStoreId}`);
    const reloadData = await reload.json();
    if (reloadData.ok) setProducts(reloadData.products);
  }

  async function handleDelete(productId: string) {
    if (!confirm("¿Eliminar este producto?")) return;
    setDeleting(productId);
    const res = await fetch(`/api/admin/products/${productId}`, { method: "DELETE" });
    setDeleting(null);
    if (!res.ok) {
      setError("Error al eliminar producto");
      return;
    }
    const reload = await fetch(`/api/admin/products?storeId=${selectedStoreId}`);
    const reloadData = await reload.json();
    if (reloadData.ok) setProducts(reloadData.products);
  }

  async function handleToggleUnavailable(productId: string) {
    await fetch(`/api/admin/products/${productId}`, { method: "PATCH" });
    const reload = await fetch(`/api/admin/products?storeId=${selectedStoreId}`);
    const reloadData = await reload.json();
    if (reloadData.ok) setProducts(reloadData.products);
  }

  const selectedStore = stores.find((s) => s.id === selectedStoreId);

  if (showForm || editingProduct) {
    const product = editingProduct;
    return (
      <div className="mx-auto max-w-xl">
        <h1 className="text-2xl font-semibold tracking-tight">
          {editingProduct ? "Editar producto" : "Nuevo producto"}
        </h1>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          {selectedStore?.name}
        </p>
        <div className="mt-6">
          <ProductForm
            initial={product ? {
              name: product.name,
              price: (product.priceCents / 100).toString(),
              description: product.description ?? "",
              imageUrl: product.imageUrl ?? "",
              sku: product.sku ?? "",
              stock: product.stock === -1 ? "" : product.stock.toString(),
              isActive: product.isActive,
              sellByWeight: product.sellByWeight ?? false,
              minWeightGrams: (product as any).minWeightGrams?.toString() ?? "100",
              maxWeightGrams: (product as any).maxWeightGrams?.toString() ?? "5000",
            } : null}
            onSave={product ? handleUpdate : handleCreate}
            onCancel={() => { setShowForm(false); setEditingProduct(null); setError(null); }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Productos por tienda</h1>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          Selecciona una tienda para administrar sus productos.
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full max-w-md">
          <label className="block">
            <div className="text-sm font-medium mb-1">Tienda</div>
            <select
              value={selectedStoreId}
              onChange={(e) => setSelectedStoreId(e.target.value)}
              className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            >
              <option value="">Seleccionar tienda...</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </select>
          </label>
        </div>
        {selectedStoreId && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Nuevo producto
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {!selectedStoreId ? (
        <div className="rounded-xl border border-[var(--border)] p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-soft)]">
            <svg className="h-8 w-8 text-[var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div className="mt-4 font-medium">Selecciona una tienda</div>
          <div className="mt-1 text-sm text-[color:var(--muted)]">
            Elige una tienda del menú desplegable para ver y administrar sus productos.
          </div>
        </div>
      ) : loading ? (
        <div className="text-center py-8 text-sm text-[color:var(--muted)]">Cargando productos...</div>
      ) : products.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-soft)]">
            <svg className="h-8 w-8 text-[var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div className="mt-4 font-medium">{selectedStore?.name} no tiene productos</div>
          <div className="mt-1 text-sm text-[color:var(--muted)]">
            Agrega el primer producto para esta tienda.
          </div>
          <div className="mt-6">
            <button onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-1.5 rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Crear primer producto
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <div key={product.id} className="group rounded-xl border border-[var(--border)] bg-white p-4 transition-shadow hover:shadow-md">
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--border)] bg-gray-50">
                  {product.imageUrl ? (
                    <Image src={product.imageUrl} alt={product.name} width={64} height={64} className="h-full w-full object-cover" />
                  ) : (
                    <svg className="h-8 w-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{product.name}</div>
                  <div className="mt-0.5 text-lg font-semibold">{formatMoney(product.priceCents, product.currency)}</div>
                  {product.variants.length > 0 && (
                    <div className="mt-1 text-xs text-[color:var(--muted)]">{product.variants.length} variante(s)</div>
                  )}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                  product.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${product.isActive ? "bg-green-500" : "bg-red-500"}`} />
                  {product.isActive ? "Activo" : "Inactivo"}
                </span>
                {product.stock === -1 ? (
                  <span className="text-xs text-[color:var(--muted)]">Sin control</span>
                ) : product.stock === 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500" />Agotado
                  </span>
                ) : product.stock <= 5 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                    {product.stock} uds
                  </span>
                ) : (
                  <span className="text-xs text-[color:var(--muted)]">{product.stock} uds</span>
                )}
              </div>

              {product.sku && (
                <div className="mt-2 font-mono text-xs text-[color:var(--muted)]">SKU: {product.sku}</div>
              )}

              <div className="mt-3 flex items-center justify-between border-t border-[var(--border)] pt-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleUnavailable(product.id)}
                    className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                      product.isUnavailable
                        ? "bg-green-50 text-green-700 hover:bg-green-100"
                        : "bg-red-50 text-red-700 hover:bg-red-100"
                    }`}
                    title={product.isUnavailable ? "Disponible" : "No disponible"}
                  >
                    {product.isUnavailable ? "Disponible" : "No disponible"}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingProduct(product)}
                    className="text-xs text-[var(--accent)] hover:underline"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    disabled={deleting === product.id}
                    className="text-xs text-red-500 hover:underline disabled:opacity-50"
                  >
                    {deleting === product.id ? "..." : "Eliminar"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
