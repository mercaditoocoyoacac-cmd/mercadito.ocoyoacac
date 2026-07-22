"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatMoney } from "@/lib/format";
import { shimmerBlur } from "@/lib/images";

interface VariantData {
  id: string;
  name: string;
  priceCents: number;
}

interface ProductData {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  currency: string;
  imageUrl: string | null;
  isUnavailable: boolean;
  sellByWeight: boolean;
  minWeightGrams: number;
  maxWeightGrams: number;
  soldCount: number;
  isPromotion: boolean;
  promotionPriceCents: number | null;
  discountPercentage: number | null;
  variants: VariantData[];
}

interface StoreData {
  id: string;
  name: string;
  category: string;
  description: string | null;
  phone: string | null;
  address: string | null;
  imageUrl: string | null;
  isActive: boolean;
  openTime: string | null;
  closeTime: string | null;
  scheduleDays: string[] | null;
}

export function StorefrontClient({
  store,
  products,
  promoProductIds,
  open,
}: {
  store: StoreData;
  products: ProductData[];
  promoProductIds: string[];
  open: boolean;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [quickViewProduct, setQuickViewProduct] = useState<ProductData | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);

  const fetchCartCount = useCallback(async () => {
    try {
      const res = await fetch("/api/cart/items");
      if (res.ok) {
        const data = await res.json();
        if (data.ok) setCartCount(data.items?.length ?? 0);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchCartCount();
    const interval = setInterval(fetchCartCount, 5000);
    return () => clearInterval(interval);
  }, [fetchCartCount]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setQuickViewProduct(null); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    if (quickViewProduct) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [quickViewProduct]);

  const isServicios = store.category === "SERVICIOS";

  const featured = useMemo(() => {
    if (isServicios) return [];
    const seen = new Set<string>();
    const result: ProductData[] = [];
    const addIfNotSeen = (p: ProductData) => {
      if (!seen.has(p.id)) { seen.add(p.id); result.push(p); }
    };
    const promoIdSet = new Set(promoProductIds);
    products.filter((p) => p.isPromotion || promoIdSet.has(p.id)).forEach(addIfNotSeen);
    products.filter((p) => p.variants.length > 0).forEach(addIfNotSeen);
    [...products].filter((p) => p.soldCount > 0).sort((a, b) => b.soldCount - a.soldCount).slice(0, 10).forEach(addIfNotSeen);
    return result;
  }, [products, isServicios, promoProductIds]);

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
    );
  }, [products, searchQuery]);

  const otherProducts = useMemo(() => {
    if (searchQuery) return filteredProducts;
    const featuredIds = new Set(featured.map((p) => p.id));
    return products.filter((p) => !featuredIds.has(p.id));
  }, [products, featured, searchQuery, filteredProducts]);

  return (
    <>
      {/* Minimal store header with back button + cart */}
      <div className="mx-auto max-w-6xl px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="shrink-0 rounded-lg p-2 hover:bg-gray-100 transition-colors border-none bg-transparent cursor-pointer"
          >
            <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          {store.imageUrl && (
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-gray-200">
              <Image
                src={store.imageUrl}
                alt={store.name}
                fill
                className="object-cover"
                sizes="40px"
                priority
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold truncate">{store.name}</h1>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  open ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                }`}
              >
                <span
                  className={`h-1 w-1 rounded-full ${open ? "bg-green-500" : "bg-red-500"}`}
                />
                {open ? "Abierto" : "Cerrado"}
              </span>
            </div>
          </div>
          <Link
            href="/carrito"
            className="relative shrink-0 rounded-lg p-2 hover:bg-gray-100 transition-colors"
          >
            <svg className="h-6 w-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
            </svg>
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white leading-none">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      <main className="mx-auto max-w-6xl flex-1 px-4 py-4">
        {/* Search bar */}
        <div className="relative mb-4">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={searchRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isServicios ? "Buscar servicios..." : "Buscar productos..."}
            className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 py-2.5 pl-9 pr-9 text-sm outline-none focus:border-[var(--accent)] focus:bg-white transition-all [font-size:16px]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 hover:bg-gray-200 transition-colors border-none bg-transparent cursor-pointer"
            >
              <svg className="h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Featured products - horizontal scroll */}
        {!isServicios && !searchQuery && featured.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold mb-3">Lo más destacado</h2>
            <div
              className="flex gap-3 overflow-x-auto pb-2"
              style={{ scrollbarWidth: "thin", msOverflowStyle: "auto" }}
            >
              {featured.map((product, i) => (
                <div key={product.id} className="flex-shrink-0 w-44">
                  <ProductCard
                    product={product}
                    store={store}
                    open={open}
                    index={i}
                    onQuickView={() => setQuickViewProduct(product)}
                    onAddedToCart={fetchCartCount}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All other products */}
        {searchQuery && filteredProducts.length === 0 ? (
          <div className="rounded-xl border border-gray-200 p-10 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
              <svg className="h-7 w-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <p className="font-medium text-gray-700">No encontramos &ldquo;{searchQuery}&rdquo;</p>
            <p className="mt-1 text-sm text-gray-400">Prueba con otro término</p>
          </div>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {searchQuery ? filteredProducts.length : otherProducts.length}{" "}
                {isServicios ? "servicios" : "productos"}
              </p>
            </div>
            <motion.div
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
              } as const}
            >
              {(searchQuery ? filteredProducts : otherProducts).map((product, i) => (
                <motion.div
                  key={product.id}
                  variants={{
                    hidden: { opacity: 0, y: 16 },
                    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 200, damping: 25, mass: 0.5 } },
                  } as const}
                >
                  <ProductCard
                    product={product}
                    store={store}
                    open={open}
                    index={i}
                    onQuickView={() => setQuickViewProduct(product)}
                    onAddedToCart={fetchCartCount}
                  />
                </motion.div>
              ))}
            </motion.div>
          </>
        )}
      </main>

      {/* Quick view modal */}
      {quickViewProduct && (
        <QuickViewModal
          product={quickViewProduct}
          store={store}
          open={open}
          onClose={() => setQuickViewProduct(null)}
          onAddedToCart={fetchCartCount}
        />
      )}

      {/* Floating cart button */}
      {cartCount > 0 && !quickViewProduct && (
        <Link
          href="/carrito"
          className="fixed bottom-6 left-6 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-xl transition-all hover:bg-[var(--accent-hover)] hover:scale-110 active:scale-95"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
          </svg>
          <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white leading-none border-2 border-white">
            {cartCount}
          </span>
        </Link>
      )}
    </>
  );
}

function ProductCard({
  product,
  store,
  open,
  index,
  onQuickView,
  onAddedToCart,
}: {
  product: ProductData;
  store: StoreData;
  open: boolean;
  index: number;
  onQuickView: () => void;
  onAddedToCart: () => void;
}) {
  const [showVariants, setShowVariants] = useState(false);
  const hasVariants = product.variants.length > 0;
  const isServicios = store.category === "SERVICIOS";

  return (
    <div
      style={{ animationDelay: `${index * 50}ms` }}
      className={`group rounded-xl border border-gray-200 overflow-hidden bg-white transition-all duration-200 hover:shadow-lg fade-in ${
        product.isUnavailable ? "opacity-60" : ""
      }`}
    >
      <div
        className="relative h-44 overflow-hidden bg-gray-100 cursor-pointer"
        onClick={onQuickView}
      >
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-110"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            priority={index < 4}
            placeholder="blur"
            blurDataURL={shimmerBlur}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <svg className="h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
        )}
        {product.isUnavailable && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white">Agotado</span>
          </div>
        )}
        {product.isPromotion && (
          <div className="absolute top-2 left-2 z-10">
            <span className="inline-block rounded-full bg-red-500 px-2.5 py-0.5 text-[10px] font-bold text-white shadow">
              -{product.discountPercentage ?? 0}%
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onQuickView(); }}
          className="absolute top-2 right-2 rounded-full bg-white/90 p-1.5 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity border-none cursor-pointer hover:bg-white"
        >
          <svg className="h-4 w-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </button>
      </div>

      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3
            className="text-sm font-semibold truncate cursor-pointer hover:text-[var(--accent)]"
            onClick={onQuickView}
          >
            {product.name}
          </h3>
        </div>

        <div className="text-base font-bold text-[var(--accent)] mb-2">
          {product.sellByWeight
            ? `${formatMoney(product.priceCents, product.currency)} / kg`
            : hasVariants
            ? `Desde ${formatMoney(Math.min(...product.variants.map((v) => v.priceCents), product.priceCents), product.currency)}`
            : product.isPromotion && product.promotionPriceCents != null
            ? <><span className="line-through text-gray-400 text-sm mr-1">{formatMoney(product.priceCents, product.currency)}</span>{formatMoney(product.promotionPriceCents, product.currency)}</>
            : formatMoney(product.priceCents, product.currency)}
        </div>

        {product.soldCount > 0 && (
          <p className="text-[11px] text-gray-400 mb-1">{product.soldCount} vendidos</p>
        )}
        {product.description && (
          <p className="text-xs text-gray-400 line-clamp-2 mb-2.5 leading-relaxed">
            {product.description}
          </p>
        )}

        <div>
          {isServicios ? (
            store.phone ? (
              <a
                href={`https://api.whatsapp.com/send?phone=${store.phone.replace(/\D/g, "")}&text=Hola%2C%20me%20gustaría%20agendar%20una%20cita%20para%20${encodeURIComponent(product.name)}%20en%20${encodeURIComponent(store.name)}`}
                target="_blank" rel="noopener noreferrer"
                className={`block w-full rounded-lg px-3 py-2 text-center text-xs font-medium transition-colors ${
                  product.isUnavailable
                    ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                    : "bg-green-600 text-white hover:bg-green-700"
                }`}
              >
                Agendar cita
              </a>
            ) : (
              <span className="block w-full rounded-lg bg-gray-200 px-3 py-2 text-center text-xs font-medium text-gray-500">
                Tel. no disponible
              </span>
            )
          ) : (
            <>
              {hasVariants && (
                <button
                  type="button"
                  onClick={() => setShowVariants(!showVariants)}
                  className="w-full mb-2 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors border-none bg-transparent cursor-pointer"
                >
                  {showVariants ? "Ocultar variantes" : `Ver variantes (${product.variants.length})`}
                </button>
              )}
              <AddToCartInline
                product={product}
                disabled={!open || product.isUnavailable}
                disabledLabel={product.isUnavailable ? "Agotado" : !open ? "Tienda cerrada" : undefined}
                onAdded={onAddedToCart}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function AddToCartInline({ product, disabled, disabledLabel, onAdded }: {
  product: ProductData;
  disabled?: boolean;
  disabledLabel?: string;
  onAdded: () => void;
}) {
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [weightGrams, setWeightGrams] = useState(product.minWeightGrams || 500);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const hasVariants = product.variants.length > 0;
  const canAdd = hasVariants ? selectedVariantId !== null : true;
  const isBlocked = disabled || loading || !canAdd;

  const effectivePriceCents = hasVariants && selectedVariantId
    ? product.variants.find((v) => v.id === selectedVariantId)?.priceCents ?? product.priceCents
    : product.priceCents;

  const estimatedTotal = product.sellByWeight
    ? Math.round((weightGrams / 1000) * effectivePriceCents)
    : null;

  const handleAdd = async () => {
    setLoading(true);
    setMessage(null);
    const res = await fetch("/api/cart/items", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        productId: product.id,
        quantity: 1,
        variantId: selectedVariantId || undefined,
        weightGrams: product.sellByWeight ? weightGrams : undefined,
      }),
    });
    const data = await res.json().catch(() => null) as { ok?: boolean; error?: string } | null;
    setLoading(false);
    if (res.status === 401) { setMessage("Inicia sesión para agregar."); return; }
    if (!res.ok || !data?.ok) { setMessage(data?.error ?? "No se pudo agregar."); return; }
    setMessage("✓ Agregado");
    onAdded();
    setTimeout(() => setMessage(null), 1500);
  };

  return (
    <div className="flex flex-col gap-2">
      {hasVariants && (
        <select
          value={selectedVariantId || ""}
          onChange={(e) => setSelectedVariantId(e.target.value || null)}
          className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-[var(--accent)]"
        >
          <option value="">Elige una opción</option>
          {product.variants.map((v) => (
            <option key={v.id} value={v.id}>{v.name} — {formatMoney(v.priceCents)}</option>
          ))}
        </select>
      )}
      <div className="flex items-center gap-2">
        {product.sellByWeight && (
          <div className="flex items-center gap-1 shrink-0">
            <input
              type="number"
              min={product.minWeightGrams || 100}
              max={product.maxWeightGrams || 5000}
              step={50}
              value={weightGrams}
              onChange={(e) => setWeightGrams(Number(e.target.value) || (product.minWeightGrams || 100))}
              className="w-16 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-center outline-none focus:border-[var(--accent)]"
            />
            <span className="text-[10px] text-gray-400">g</span>
          </div>
        )}
        <button
          type="button"
          disabled={isBlocked}
          onClick={handleAdd}
          className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-all active:scale-95 ${
            disabled
              ? "bg-gray-200 text-gray-500 cursor-not-allowed"
              : "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] shadow-sm hover:shadow-md"
          } disabled:opacity-60`}
        >
          {loading ? "..." : message || disabledLabel || "Agregar"}
        </button>
        {estimatedTotal !== null && estimatedTotal > 0 && (
          <span className="text-[11px] font-semibold text-[var(--accent)] shrink-0">≈{formatMoney(estimatedTotal)}</span>
        )}
      </div>
    </div>
  );
}

function QuickViewModal({ product, store, open, onClose, onAddedToCart }: {
  product: ProductData;
  store: StoreData;
  open: boolean;
  onClose: () => void;
  onAddedToCart: () => void;
}) {
  const isServicios = store.category === "SERVICIOS";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose}>
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl animate-slide-up-sm" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onClose} className="absolute top-3 right-3 z-10 rounded-full bg-white/90 p-2 shadow-md border-none cursor-pointer hover:bg-white">
          <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {product.imageUrl ? (
          <div className="relative h-56 sm:h-64 w-full bg-gray-100">
            <Image src={product.imageUrl} alt={product.name} fill className="object-cover" sizes="(max-width: 640px) 100vw, 500px" placeholder="blur" blurDataURL={shimmerBlur} />
          </div>
        ) : (
          <div className="flex h-40 items-center justify-center bg-gray-100">
            <svg className="h-16 w-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
        )}

        <div className="p-5 space-y-4">
          <div>
            <h2 className="text-xl font-bold">{product.name}</h2>
            <div className="mt-1 flex items-center gap-3">
              <span className="text-2xl font-bold text-[var(--accent)]">
                {product.sellByWeight ? `${formatMoney(product.priceCents, product.currency)} / kg`
                : product.variants.length > 0 ? `Desde ${formatMoney(Math.min(...product.variants.map((v) => v.priceCents), product.priceCents), product.currency)}`
                : product.isPromotion && product.promotionPriceCents != null
                ? <><span className="line-through text-gray-400 text-lg mr-2">{formatMoney(product.priceCents, product.currency)}</span>{formatMoney(product.promotionPriceCents, product.currency)}</>
                : formatMoney(product.priceCents, product.currency)}
              </span>
              {product.isUnavailable && (
                <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">Agotado</span>
              )}
            </div>
          </div>

          {product.description && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Descripción</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{product.description}</p>
            </div>
          )}

          {product.sellByWeight && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="rounded-lg bg-orange-100 px-2.5 py-1 text-xs font-medium text-orange-700">Venta por peso</span>
              <span className="text-xs text-gray-400">{product.minWeightGrams}g – {product.maxWeightGrams}g</span>
            </div>
          )}

          <div className="pt-2">
            {isServicios ? (
              store.phone ? (
                <a href={`https://api.whatsapp.com/send?phone=${store.phone.replace(/\D/g, "")}&text=Hola%2C%20me%20gustaría%20agendar%20una%20cita%20para%20${encodeURIComponent(product.name)}%20en%20${encodeURIComponent(store.name)}`} target="_blank" rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3.5 text-sm font-bold text-white hover:bg-green-700 transition-colors"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                  Agendar cita por WhatsApp
                </a>
              ) : (
                <span className="block w-full rounded-xl bg-gray-200 px-5 py-3.5 text-center text-sm font-medium text-gray-500">Teléfono no disponible</span>
              )
            ) : (
              <AddToCartInline
                product={product}
                disabled={!open || product.isUnavailable}
                disabledLabel={product.isUnavailable ? "Agotado" : !open ? "Tienda cerrada" : undefined}
                onAdded={onAddedToCart}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
