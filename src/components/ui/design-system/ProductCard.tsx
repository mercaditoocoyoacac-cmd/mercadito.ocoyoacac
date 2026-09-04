"use client";

import { type ReactNode, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Button } from "./Button";
import { Badge, StockBadge, PromoBadge } from "./Badge";
import { formatMoney } from "@/lib/format";
import { shimmerBlur } from "@/lib/images";

export interface ProductCardData {
  id: string;
  name: string;
  description?: string;
  priceCents: number;
  currency: string;
  imageUrl?: string;
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
}

export interface ProductCardProps {
  product: ProductCardData;
  variant?: "default" | "compact" | "featured" | "horizontal";
  onAddToCart: (data: { productId: string; variantId?: string; weightGrams?: number }) => void;
  onBookAppointment?: string;
  onQuickView?: () => void;
  showQuickView?: boolean;
  className?: string;
}

export interface ProductGridProps {
  products: ProductCardData[];
  onAddToCart: (data: { productId: string; variantId?: string; weightGrams?: number }) => void;
  onBookAppointment?: (product: ProductCardData) => string;
  onQuickView?: (product: ProductCardData) => void;
  variant?: "default" | "compact" | "featured" | "horizontal";
  className?: string;
  emptyState?: {
    title: string;
    description: string;
    actionLabel: string;
    actionHref: string;
  };
  skeletonCount?: number;
}

export function ProductCard({ 
  product, 
  variant = "default", 
  onAddToCart, 
  onBookAppointment,
  onQuickView, 
  showQuickView = false,
  className = "" 
}: ProductCardProps) {
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

  const baseClasses = "rounded-xl border border-[var(--border)] bg-white overflow-hidden shadow-sm transition-all duration-300";
  const variantClasses = {
    default: "flex flex-col hover:shadow-lg hover:-translate-y-0.5",
    compact: "flex flex-col",
    featured: "flex flex-col",
    horizontal: "flex flex-row items-stretch",
  };

  if (variant === "horizontal") {
    return (
      <motion.article
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      >
        <div className="relative w-32 sm:w-40 shrink-0 aspect-square bg-[var(--accent-soft)] flex items-center justify-center overflow-hidden">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-cover"
              sizes="128px"
              placeholder="blur"
              blurDataURL={shimmerBlur}
            />
          ) : (
            <div className="text-4xl">📦</div>
          )}
          {product.isUnavailable && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="rounded-full bg-red-500 px-2 py-1 text-xs font-semibold text-white">Agotado</span>
            </div>
          )}
        </div>
        <div className="flex-1 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-sm truncate">{product.name}</h4>
              {product.isPromotion && product.discountPercentage && <PromoBadge discountPercentage={product.discountPercentage} size="sm" />}
            </div>
            {product.description && <p className="text-xs text-[color:var(--muted)] line-clamp-2 mt-1">{product.description}</p>}
            <div className="mt-2 flex items-center gap-2">
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
                <span className="text-xs text-[color:var(--muted)] line-through">{formatMoney(product.priceCents, product.currency)}</span>
              )}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center gap-2">
            {isService ? (
              <Button
                variant="primary"
                size="sm"
                fullWidth
                asChild={!!onBookAppointment}
              >
                {onBookAppointment ? (
                  <a href={onBookAppointment} target="_blank" rel="noopener noreferrer">
                    Asignar cita
                  </a>
                ) : (
                  <span>Asignar cita</span>
                )}
              </Button>
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
                  <option key={v.id} value={v.id}>{v.name} — {formatMoney(v.priceCents)}</option>
                ))}
              </select>
            )}
            {product.sellByWeight && (
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
            )}
            <Button
              variant="primary"
              size="sm"
              loading={loading}
              disabled={isBlocked}
              onClick={() => onAddToCart({ productId: product.id, variantId: selectedVariant || undefined, weightGrams: product.sellByWeight ? weight : undefined })}
            >
              Agregar
            </Button>
            </>
            )}
          </div>
        </div>
      </motion.article>
    );
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      whileHover={variant !== "compact" ? { y: -2, boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)" } : undefined}
    >
      <div className="relative aspect-square bg-[var(--accent-soft)] flex items-center justify-center overflow-hidden">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover p-2 transition-transform duration-500 group-hover:scale-105"
            sizes={variant === "featured" ? "200px" : "150px"}
            placeholder="blur"
            blurDataURL={shimmerBlur}
          />
        ) : (
          <div className="text-4xl sm:text-5xl">📦</div>
        )}
        {product.isUnavailable && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="rounded-full bg-red-500 px-3 py-1 text-sm font-semibold text-white">Agotado</span>
          </div>
        )}
        {product.isPromotion && product.discountPercentage != null && (
          <PromoBadge discountPercentage={product.discountPercentage} size="sm" />
        )}
        {onQuickView && showQuickView && !isService && (
          <button
            type="button"
            onClick={onQuickView}
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
      <div className="p-4 flex-1 flex flex-col">
        <h4 className="font-medium text-sm line-clamp-1">{product.name}</h4>
        {product.description && variant !== "compact" && (
          <p className="mt-1 text-xs text-[color:var(--muted)] line-clamp-2">{product.description}</p>
        )}
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
            <span className="text-xs text-[color:var(--muted)] line-through">{formatMoney(product.priceCents, product.currency)}</span>
          )}
        </div>
        <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center gap-2">
          {isService ? (
            <Button
              variant={variant === "compact" ? "ghost" : "primary"}
              size={variant === "compact" ? "sm" : "md"}
              fullWidth
              asChild={!!onBookAppointment}
            >
              {onBookAppointment ? (
                <a href={onBookAppointment} target="_blank" rel="noopener noreferrer">
                  Asignar cita
                </a>
              ) : (
                <span>Asignar cita</span>
              )}
            </Button>
          ) : (
            <>
          {hasVariants && (
            <select
              value={selectedVariant || ""}
              onChange={(e) => setSelectedVariant(e.target.value || null)}
              className="flex-1 rounded-md border border-[var(--border)] bg-white px-2 py-1.5 text-xs outline-none focus:border-[var(--accent)]"
              disabled={loading || product.isUnavailable}
            >
              <option value="">Seleccionar opción</option>
              {product.variants?.map((v) => (
                <option key={v.id} value={v.id}>{v.name} — {formatMoney(v.priceCents)}</option>
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
          <Button
            variant="primary"
            size={variant === "compact" ? "sm" : "md"}
            loading={loading}
            disabled={isBlocked}
            fullWidth={!hasVariants && !product.sellByWeight}
            onClick={() => onAddToCart({ productId: product.id, variantId: selectedVariant || undefined, weightGrams: product.sellByWeight ? weight : undefined })}
          >
            {loading ? "..." : product.isUnavailable ? "Agotado" : "Agregar"}
          </Button>
            </>
          )}
        </div>
      </div>
    </motion.article>
  );
}

export function ProductGrid({ 
  products, 
  onAddToCart, 
  onBookAppointment,
  onQuickView,
  variant = "default",
  className = "",
  emptyState,
  skeletonCount = 6
}: ProductGridProps) {
  if (products.length === 0) {
    return emptyState ? (
      <div className="rounded-xl border-2 border-dashed border-[var(--border)] p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-soft)]">
          <svg className="h-8 w-8 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
        <h3 className="font-semibold">{emptyState.title}</h3>
        <p className="mt-1 text-sm text-[color:var(--muted)]">{emptyState.description}</p>
        <Button variant="primary" size="md" asChild className="mt-4">
          <a href={emptyState.actionHref}>{emptyState.actionLabel}</a>
        </Button>
      </div>
    ) : null;
  }

  const gridClasses = {
    default: "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
    compact: "grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
    featured: "grid gap-6 sm:grid-cols-2 lg:grid-cols-3",
    horizontal: "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  };

  return (
    <div className={`${gridClasses[variant]} ${className}`} role="list" aria-label="Productos">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          variant={variant}
          onAddToCart={onAddToCart}
          onBookAppointment={onBookAppointment ? onBookAppointment(product) : undefined}
          onQuickView={onQuickView ? () => onQuickView(product) : undefined}
          showQuickView={!!onQuickView}
        />
      ))}
    </div>
  );
}

interface ProductCarouselProps {
  products: ProductCardData[];
  onAddToCart: (data: { productId: string; variantId?: string; weightGrams?: number }) => void;
  onBookAppointment?: (product: ProductCardData) => string;
  onQuickView?: (product: ProductCardData) => void;
  title?: string;
  showTitle?: boolean;
  className?: string;
}

export function ProductCarousel({ 
  products, 
  onAddToCart, 
  onBookAppointment,
  onQuickView,
  title = "Productos",
  showTitle = true,
  className = ""
}: ProductCarouselProps) {
  return (
    <div className={className}>
      {showTitle && <h3 className="text-lg font-semibold mb-3">{title}</h3>}
      <div className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory -mx-1 px-1" style={{ scrollBehavior: "smooth" }}>
        {products.map((product) => (
          <div key={product.id} className="flex-shrink-0 w-40 sm:w-44 snap-center" style={{ scrollSnapAlign: "center" }}>
            <ProductCard
              product={product}
              variant="compact"
              onAddToCart={onAddToCart}
              onBookAppointment={onBookAppointment ? onBookAppointment(product) : undefined}
              onQuickView={onQuickView ? () => onQuickView(product) : undefined}
              showQuickView={!!onQuickView}
            />
          </div>
        ))}
      </div>
    </div>
  );
}