"use client";

import { type ReactNode, useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { Button } from "./Button";
import { Badge, PromoBadge, StockBadge } from "./Badge";
import { formatMoney } from "@/lib/format";
import { shimmerBlur } from "@/lib/images";

export interface QuickViewProduct {
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
  soldCount: number;
  isPromotion: boolean;
  promotionPriceCents: number | null;
  discountPercentage: number | null;
  variants?: { id: string; name: string; priceCents: number }[];
}

interface QuickViewSheetProps {
  open: boolean;
  onClose: () => void;
  product: QuickViewProduct | null;
  onAddToCart: (data: { productId: string; variantId?: string; weightGrams?: number }) => void;
  className?: string;
}

export function QuickViewSheet({ 
  open, 
  onClose, 
  product, 
  onAddToCart, 
  className = "" 
}: QuickViewSheetProps) {
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [weight, setWeight] = useState(500);
  const [loading, setLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (open && product) {
      document.body.style.overflow = "hidden";
      setSelectedVariant(null);
      setWeight(product.minWeightGrams || 500);
      setImageError(false);
    }
    return () => { document.body.style.overflow = ""; };
  }, [open, product]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  };

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [open]);

  if (!open || !product) return null;

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

  const sheetContent = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-end justify-center"
        onClick={onClose}
        role="presentation"
        aria-hidden="true"
      >
        <motion.div
          initial={{ opacity: 0, y: "100%" }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: "100%" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md rounded-t-2xl bg-white shadow-2xl overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="quickview-title"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
            <h2 id="quickview-title" className="text-lg font-semibold truncate">{product.name}</h2>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg p-2 text-[color:var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--accent-soft)] transition-colors"
              aria-label="Cerrar"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-5 max-h-[70vh] overflow-y-auto">
            {/* Image Gallery */}
            <div className="relative aspect-square bg-[var(--accent-soft)] rounded-xl overflow-hidden">
              {product.imageUrl && !imageError ? (
                <Image
                  src={product.imageUrl}
                  alt={product.name}
                  fill
                  className="object-cover"
                  sizes="320px"
                  priority
                  onError={() => setImageError(true)}
                  placeholder="blur"
                  blurDataURL={shimmerBlur}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-6xl">📦</div>
              )}
              {product.isUnavailable && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white">No disponible</span>
                </div>
              )}
              {product.isPromotion && product.discountPercentage != null && (
                <PromoBadge discountPercentage={product.discountPercentage} size="md" className="absolute top-3 left-3 z-10" />
              )}
              {product.soldCount > 50 && (
                <Badge variant="success" size="sm" className="absolute top-3 right-3 z-10" dot>
                  Popular
                </Badge>
              )}
            </div>

            {/* Price & Badges */}
            <div className="flex items-baseline justify-between gap-4 flex-wrap">
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-2xl font-bold text-[var(--accent)]">
                  {formatMoney(effectivePrice, product.currency)}
                  {product.sellByWeight && <span className="text-lg font-normal text-[color:var(--muted)]">/kg</span>}
                </span>
                {product.isPromotion && product.promotionPriceCents != null && (
                  <span className="text-lg text-[color:var(--muted)] line-through">{formatMoney(product.priceCents, product.currency)}</span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {product.isPromotion && product.discountPercentage != null && (
                  <PromoBadge discountPercentage={product.discountPercentage} size="sm" />
                )}
                <StockBadge 
                  level={product.isUnavailable ? "out" : product.soldCount > 100 ? "high" : product.soldCount > 20 ? "medium" : "low"} 
                  count={product.soldCount}
                  size="sm" 
                />
              </div>
            </div>

            {/* Description */}
            {product.description && (
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-[color:var(--muted)] uppercase tracking-wide">Descripción</h3>
                <p className="text-sm text-[var(--foreground)] whitespace-pre-line">{product.description}</p>
              </div>
            )}

            {/* Variants Selector */}
            {hasVariants && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[color:var(--muted)]">Seleccionar opción</label>
                <div className="flex flex-wrap gap-2">
                  {product.variants!.map((variant) => (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => setSelectedVariant(variant.id)}
                      className={`
                        rounded-lg px-4 py-2.5 text-sm font-medium border-2 transition-all
                        ${selectedVariant === variant.id
                          ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                          : "border-[var(--border)] hover:border-[var(--accent)]"
                        }
                      `}
                      aria-pressed={selectedVariant === variant.id}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span>{variant.name}</span>
                        <span className="font-semibold">{formatMoney(variant.priceCents, product.currency)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Weight Selector */}
            {product.sellByWeight && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-[color:var(--muted)]">Peso (gramos)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={product.minWeightGrams || 100}
                    max={product.maxWeightGrams || 5000}
                    step={50}
                    value={weight}
                    onChange={(e) => setWeight(Math.max(product.minWeightGrams || 100, Math.min(product.maxWeightGrams || 5000, Number(e.target.value) || (product.minWeightGrams || 100))))}
                    className="w-24 rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 text-center text-sm outline-none focus:border-[var(--accent)]"
                    disabled={loading || product.isUnavailable}
                  />
                  <span className="text-sm text-[color:var(--muted)]">gramos</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[250, 500, 1000, 1500, 2000].filter(w => w >= (product.minWeightGrams || 0) && w <= (product.maxWeightGrams || 5000)).map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setWeight(w)}
                      className={`
                        rounded-lg px-3 py-1.5 text-xs font-medium transition-all
                        ${weight === w
                          ? "bg-[var(--accent)] text-white"
                          : "bg-[var(--accent-soft)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white"
                        }
                      `}
                    >
                      {w >= 1000 ? `${w/1000}kg` : `${w}g`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Estimated Total */}
            {estimatedTotal !== null && (
              <div className="rounded-xl bg-[var(--accent-soft)] p-4 text-center">
                <p className="text-sm text-[color:var(--muted)]">Total estimado</p>
                <p className="text-2xl font-bold text-[var(--accent)]">{formatMoney(estimatedTotal, product.currency)}</p>
              </div>
            )}

            {/* Add to Cart Button */}
            <Button
              variant="primary"
              size="xl"
              fullWidth
              loading={loading}
              disabled={isBlocked}
              onClick={async () => {
                setLoading(true);
                await onAddToCart({
                  productId: product.id,
                  variantId: selectedVariant || undefined,
                  weightGrams: product.sellByWeight ? weight : undefined,
                });
                setLoading(false);
                onClose();
              }}
            >
              {loading ? "Agregando..." : product.isUnavailable ? "No disponible" : "Agregar al carrito"}
            </Button>

            {/* Quick Info */}
            <div className="pt-4 border-t border-[var(--border)] space-y-2 text-xs text-[color:var(--muted)]">
              <div className="flex items-center justify-between">
                <span>Disponibilidad</span>
                <span className="font-medium">{product.isUnavailable ? "Agotado" : "En stock"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Vendidos</span>
                <span className="font-medium">{product.soldCount}</span>
              </div>
              {product.variants && product.variants.length > 0 && (
                <div className="flex items-center justify-between">
                  <span>Variantes</span>
                  <span className="font-medium">{product.variants.length} opciones</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  if (typeof window === "undefined") return null;
  return createPortal(sheetContent, document.body);
}

export function QuickViewTrigger({ 
  product, 
  onOpen, 
  children, 
  className = "" 
}: { 
  product: QuickViewProduct; 
  onOpen: (product: QuickViewProduct) => void; 
  children: ReactNode; 
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(product)}
      className={`relative inline-flex items-center justify-center p-2 rounded-lg hover:bg-[var(--accent-soft)] transition-colors ${className}`}
      aria-label={`Vista rápida de ${product.name}`}
    >
      {children}
    </button>
  );
}