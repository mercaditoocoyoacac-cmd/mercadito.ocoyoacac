"use client";

import { type ReactNode, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "./Badge";
import { formatMoney } from "@/lib/format";

export interface CategoryData {
  id: string;
  name: string;
  slug: string;
  productCount: number;
  products: Array<{
    id: string;
    name: string;
    description?: string | null;
    priceCents: number;
    currency: string;
    imageUrl?: string | null;
    isUnavailable: boolean;
    sellByWeight: boolean;
    minWeightGrams: number;
    maxWeightGrams: number;
    isService?: boolean;
    showPrice?: boolean;
    soldCount: number;
    isPromotion: boolean;
    promotionPriceCents: number | null;
    discountPercentage: number | null;
    variants?: { id: string; name: string; priceCents: number }[];
  }>;
}

export interface CategoryAccordionProps {
  categories: CategoryData[];
  onAddToCart: (productId: string, data: { variantId?: string; weightGrams?: number }) => void;
  onBookAppointment?: (product: CategoryData["products"][0]) => string;
  onQuickView?: (product: CategoryData["products"][0]) => void;
  defaultOpen?: string[];
  className?: string;
  emptyCategoryMessage?: string;
}

export function CategoryAccordion({ 
  categories, 
  onAddToCart, 
  onBookAppointment,
  onQuickView, 
  defaultOpen = [],
  className = "",
  emptyCategoryMessage = "No hay productos en esta categoría"
}: CategoryAccordionProps) {
  const [openCategories, setOpenCategories] = useState<string[]>(defaultOpen.length > 0 ? defaultOpen : categories.slice(0, 3).map(c => c.id));

  const toggleCategory = (categoryId: string) => {
    setOpenCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const allCategoriesOpen = openCategories.length === categories.filter(c => c.productCount > 0).length;
  const someCategoriesOpen = openCategories.length > 0;

  return (
    <div className={`space-y-4 ${className}`} role="region" aria-label="Categorías de productos">
      {categories.length > 1 && (
        <div className="flex items-center gap-2 mb-2">
          <button
            type="button"
            onClick={() => setOpenCategories(
              allCategoriesOpen 
                ? [] 
                : categories.filter(c => c.productCount > 0).map(c => c.id)
            )}
            className="text-sm text-[var(--accent)] hover:underline flex items-center gap-1"
            aria-expanded={allCategoriesOpen}
            aria-controls="category-list"
          >
            <svg className="h-4 w-4 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ transform: allCategoriesOpen ? "rotate(180deg)" : "rotate(0deg)" }} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            {allCategoriesOpen ? "Colapsar todo" : "Expandir todo"}
          </button>
          <span className="text-xs text-[color:var(--muted)]">
            {openCategories.length} de {categories.filter(c => c.productCount > 0).length} abiertas
          </span>
        </div>
      )}

      <div id="category-list" className="space-y-3" role="list">
        {categories.map((category, index) => (
          <motion.div
            key={category.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            className="rounded-xl border border-[var(--border)] bg-white overflow-hidden"
            role="listitem"
          >
            <button
              type="button"
              onClick={() => toggleCategory(category.id)}
              className="w-full flex items-center justify-between gap-4 p-4 hover:bg-[var(--accent-soft)]/50 transition-colors text-left"
              aria-expanded={openCategories.includes(category.id)}
              aria-controls={`category-${category.id}-content`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <motion.span
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] font-semibold text-sm"
                  animate={{ rotate: openCategories.includes(category.id) ? 90 : 0 }}
                  transition={{ duration: 0.2 }}
                  aria-hidden="true"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </motion.span>
                <div className="min-w-0">
                  <h3 className="font-semibold text-base truncate">{category.name}</h3>
                  <p className="text-xs text-[color:var(--muted)]">
                    {category.productCount} producto{category.productCount !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <Badge variant="neutral" size="sm">{category.productCount}</Badge>
            </button>

            <AnimatePresence>
              {openCategories.includes(category.id) && (
                <motion.div
                  id={`category-${category.id}-content`}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden"
                  role="region"
                  aria-labelledby={`category-${category.id}`}
                >
                  <div className="px-4 pb-4 border-t border-[var(--border)]">
                    {category.products.length === 0 ? (
                      <div className="py-8 text-center text-[color:var(--muted)]">
                        {emptyCategoryMessage}
                      </div>
                    ) : (
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="list">
                        {category.products.map((product) => (
<ProductCardInCategory
                          key={product.id}
                          product={product}
                          categoryId={category.id}
                          onAddToCart={(data) => onAddToCart(product.id, data)}
                          onBookAppointment={onBookAppointment ? onBookAppointment(product) : undefined}
                          onQuickView={onQuickView}
                        />
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      {categories.every(c => c.productCount === 0) && (
        <div className="rounded-xl border-2 border-dashed border-[var(--border)] p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-soft)]">
            <svg className="h-8 w-8 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h3 className="font-semibold">No hay productos disponibles</h3>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            Esta tienda aún no tiene productos publicados.
          </p>
        </div>
      )}
    </div>
  );
}

interface ProductCardInCategoryProps {
  product: CategoryData["products"][0];
  categoryId: string;
  onAddToCart: (data: { variantId?: string; weightGrams?: number }) => void;
  onBookAppointment?: string;
  onQuickView?: (product: CategoryData["products"][0]) => void;
}

function ProductCardInCategory({ 
  product, 
  categoryId, 
  onAddToCart, 
  onBookAppointment,
  onQuickView 
}: ProductCardInCategoryProps) {
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [weight, setWeight] = useState(product.minWeightGrams || 500);
  const [loading, setLoading] = useState(false);

  const isService = product.isService === true;
  const showServicePrice = product.showPrice !== false;

  const hasVariants = product.variants && product.variants.length > 0;
  const effectivePrice = hasVariants && selectedVariant
    ? product.variants!.find(v => v.id === selectedVariant)?.priceCents ?? product.priceCents
    : product.isPromotion && product.promotionPriceCents != null
      ? product.promotionPriceCents
      : product.priceCents;
  
  const estimatedTotal = product.sellByWeight 
    ? Math.round((weight / 1000) * effectivePrice) 
    : null;

  const canAdd = hasVariants ? selectedVariant !== null : true;
  const isBlocked = product.isUnavailable || loading || !canAdd;

  return (
    <article className="group rounded-xl border border-[var(--border)] bg-white overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
      <div className="relative aspect-square bg-[var(--accent-soft)] flex items-center justify-center overflow-hidden">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover p-2 group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="text-3xl">📦</div>
        )}
        {product.isUnavailable && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="rounded-full bg-red-500 px-2 py-1 text-sm font-semibold text-white">Agotado</span>
          </div>
        )}
        {product.isPromotion && product.discountPercentage != null && (
          <div className="absolute top-2 left-2 z-10">
            <Badge variant="danger" size="sm">-{product.discountPercentage}%</Badge>
          </div>
        )}
        {onQuickView && (
          <button
            type="button"
            onClick={() => onQuickView?.(product)}
            className="absolute top-2 right-2 z-10 rounded-full bg-white/90 p-1.5 shadow-md hover:bg-white transition-colors"
            aria-label="Vista rápida"
          >
            <svg className="h-5 w-5 text-[color:var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
        )}
      </div>
      <div className="p-3">
        <h4 className="font-medium text-sm line-clamp-1">{product.name}</h4>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-[var(--accent)]">
            {isService && !showServicePrice ? (
              "Precio a cotizar"
            ) : (
              <>
                {formatMoney(effectivePrice, product.currency)}
                {product.sellByWeight && <span className="text-xs font-normal text-[color:var(--muted)]">/kg</span>}
              </>
            )}
          </span>
          {product.isPromotion && product.promotionPriceCents != null && (
            <span className="text-xs text-[color:var(--muted)] line-through">
              {formatMoney(product.priceCents, product.currency)}
            </span>
          )}
        </div>
        <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center gap-2">
          {isService ? (
            onBookAppointment ? (
              <a
                href={onBookAppointment}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 rounded-lg px-3 py-2 text-xs font-medium text-center bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
              >
                Asignar cita
              </a>
            ) : (
              <span className="flex-1 rounded-lg px-3 py-2 text-xs font-medium text-center bg-[var(--accent)] text-white">
                Asignar cita
              </span>
            )
          ) : (
            <>
          {hasVariants && (
            <select
              value={selectedVariant || ""}
              onChange={(e) => setSelectedVariant(e.target.value || null)}
              className="flex-1 rounded-md border border-[var(--border)] bg-white px-2 py-1.5 text-xs outline-none focus:border-[var(--accent)]"
              disabled={loading || product.isUnavailable}
            >
              <option value="">Seleccionar</option>
              {product.variants?.map((v) => (
                <option key={v.id} value={v.id}>{v.name} — {formatMoney(v.priceCents, product.currency)}</option>
              ))}
            </select>
          )}
          {product.sellByWeight && (
            <div className="flex items-center gap-1 flex-1">
              <input
                type="number"
                min={product.minWeightGrams || 100}
                max={product.maxWeightGrams || 5000}
                step={50}
                value={weight}
                onChange={(e) => setWeight(Number(e.target.value) || (product.minWeightGrams || 100))}
                className="w-20 rounded-md border border-[var(--border)] bg-white px-2 py-1.5 text-xs text-center outline-none focus:border-[var(--accent)]"
                disabled={loading || product.isUnavailable}
              />
              <span className="text-xs text-[color:var(--muted)]">g</span>
            </div>
          )}
          <button
            type="button"
            disabled={isBlocked}
            onClick={() => {
              setLoading(true);
              onAddToCart({
                variantId: selectedVariant || undefined,
                weightGrams: product.sellByWeight ? weight : undefined,
              });
              setTimeout(() => setLoading(false), 500);
            }}
            className={`
              flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors
              ${isBlocked 
                ? "bg-gray-300 text-gray-500 cursor-not-allowed" 
                : "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
              }
            `}
          >
            {loading ? "..." : product.isUnavailable ? "Agotado" : "Agregar"}
          </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

interface ProductCardProps {
  product: CategoryData["products"][0];
  onAddToCart: (productId: string, data: { variantId?: string; weightGrams?: number }) => void;
  onQuickView?: (product: CategoryData["products"][0]) => void;
}