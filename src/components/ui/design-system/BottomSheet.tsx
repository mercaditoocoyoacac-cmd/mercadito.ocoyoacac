"use client";

import { Fragment, type ReactNode, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { Button } from "./Button";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "full";
  showHandle?: boolean;
  showClose?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  className?: string;
  snapPoints?: number[];
  defaultSnap?: number;
}

const sizeClasses = {
  sm: "max-h-[40vh]",
  md: "max-h-[60vh]",
  lg: "max-h-[80vh]",
  full: "max-h-[95vh]",
};

export function BottomSheet({ 
  open, 
  onClose, 
  title, 
  description, 
  children, 
  size = "md", 
  showHandle = true, 
  showClose = true, 
  closeOnOverlayClick = true, 
  closeOnEscape = true,
  className = "",
  snapPoints = [0.5, 1],
  defaultSnap = 1
}: BottomSheetProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [dragPosition, setDragPosition] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);
  const currentSnap = useRef(defaultSnap);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      document.body.style.overflow = "hidden";
      
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape" && closeOnEscape) onClose();
      };
      
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        document.body.style.overflow = "";
        previousActiveElement.current?.focus();
      };
    }
  }, [open, closeOnEscape, onClose]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isDragging) {
      startY.current = e.touches[0].clientY - dragPosition;
      setIsDragging(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging) {
      const y = e.touches[0].clientY - startY.current;
      setDragPosition(Math.max(0, y));
    }
  };

  const handleTouchEnd = () => {
    if (isDragging) {
      setIsDragging(false);
      const threshold = window.innerHeight * 0.15;
      if (dragPosition > threshold) {
        onClose();
      } else {
        setDragPosition(0);
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isDragging) {
      startY.current = e.clientY - dragPosition;
      setIsDragging(true);
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      const y = e.clientY - startY.current;
      setDragPosition(Math.max(0, y));
    }
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      const threshold = window.innerHeight * 0.15;
      if (dragPosition > threshold) {
        onClose();
      } else {
        setDragPosition(0);
      }
    }
  };

  if (!open) return null;

  const sheetContent = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-end justify-center"
        onClick={closeOnOverlayClick ? onClose : undefined}
        role="presentation"
        aria-hidden="true"
      >
        <motion.div
          className="fixed bottom-0 left-0 right-0 z-50"
          onClick={(e) => e.stopPropagation()}
        >
          <motion.div
            ref={contentRef}
            initial={{ y: "100%" }}
            animate={{ 
              y: isDragging ? dragPosition : 0,
              opacity: isDragging && dragPosition > window.innerHeight * 0.5 ? 0.5 : 1
            }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            drag={isDragging ? undefined : "y"}
            dragConstraints={{ top: 0, bottom: window.innerHeight * 0.5 }}
            dragElastic={0.2}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={() => handleTouchEnd()}
            className={`
              w-full ${sizeClasses[size]} rounded-t-2xl bg-white shadow-2xl overflow-hidden
              ${className}
            `}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? "bottomsheet-title" : undefined}
            aria-describedby={description ? "bottomsheet-description" : undefined}
          >
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
              {showHandle && (
                <div 
                  className="w-10 h-1.5 rounded-full bg-gray-300 mx-auto touch-none"
                  aria-hidden="true"
                />
              )}
              <div className="flex-1" />
              {showClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="shrink-0 rounded-lg p-2 text-[color:var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--accent-soft)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  aria-label="Cerrar"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            
            {(title || description) && (
              <div className="px-5 pb-4">
                {title && (
                  <h2 id="bottomsheet-title" className="text-lg font-semibold text-[var(--foreground)]">
                    {title}
                  </h2>
                )}
                {description && (
                  <p id="bottomsheet-description" className="mt-1 text-sm text-[color:var(--muted)]">
                    {description}
                  </p>
                )}
              </div>
            )}
            
            <div className="px-5 pb-5">
              {children}
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  if (typeof window === "undefined") return null;
  return createPortal(sheetContent, document.body);
}

interface QuickViewSheetProps {
  open: boolean;
  onClose: () => void;
  product: {
    id: string;
    name: string;
    description?: string;
    priceCents: number;
    currency: string;
    imageUrl?: string;
    variants?: { id: string; name: string; priceCents: number }[];
    sellByWeight?: boolean;
    minWeightGrams?: number;
    maxWeightGrams?: number;
    isUnavailable?: boolean;
  };
  onAddToCart: (data: { variantId?: string; weightGrams?: number }) => void;
  formatMoney: (cents: number, currency: string) => string;
}

export function QuickViewSheet({ 
  open, 
  onClose, 
  product, 
  onAddToCart, 
  formatMoney 
}: QuickViewSheetProps) {
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [weight, setWeight] = useState(product.minWeightGrams || 500);
  const [loading, setLoading] = useState(false);
  
  const effectivePrice = product.variants?.find(v => v.id === selectedVariant)?.priceCents ?? product.priceCents;
  const estimatedTotal = product.sellByWeight 
    ? Math.round((weight / 1000) * effectivePrice) 
    : null;
  
  const hasVariants = product.variants && product.variants.length > 0;
  const canAdd = hasVariants ? selectedVariant !== null : true;
  const isBlocked = product.isUnavailable || loading || !canAdd;

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={product.name}
      size="lg"
      showHandle={true}
    >
      <div className="space-y-5">
        {/* Product Image */}
        <div className="relative aspect-square bg-[var(--accent-soft)] rounded-xl overflow-hidden">
          {product.imageUrl ? (
            <img 
              src={product.imageUrl} 
              alt={product.name} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-5xl">
              📦
            </div>
          )}
          {product.isUnavailable && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="rounded-full bg-red-500 px-3 py-1 text-sm font-semibold text-white">
                No disponible
              </span>
            </div>
          )}
        </div>

        {/* Price & Variants */}
        <div className="space-y-3">
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-2xl font-bold text-[var(--accent)]">
              {formatMoney(effectivePrice, product.currency)}
              {product.sellByWeight && <span className="text-lg font-normal text-[color:var(--muted)]">/kg</span>}
            </span>
            {estimatedTotal && (
              <span className="text-lg font-medium text-[var(--accent)]">
                ≈ {formatMoney(estimatedTotal, product.currency)}
              </span>
            )}
          </div>

          {hasVariants && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-[color:var(--muted)]">Seleccionar opción</label>
              <div className="flex flex-wrap gap-2">
                {product.variants!.map((variant) => (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => setSelectedVariant(variant.id)}
                    className={`
                      rounded-lg px-4 py-2 text-sm font-medium border-2 transition-all
                      ${selectedVariant === variant.id
                        ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                        : "border-[var(--border)] hover:border-[var(--accent)]"
                      }
                    `}
                    aria-pressed={selectedVariant === variant.id}
                  >
                    {variant.name} — {formatMoney(variant.priceCents, product.currency)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {product.sellByWeight && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-[color:var(--muted)]">Peso (gramos)</label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={product.minWeightGrams || 100}
                  max={product.maxWeightGrams || 5000}
                  step={50}
                  value={weight}
                  onChange={(e) => setWeight(Math.max(product.minWeightGrams || 100, Math.min(product.maxWeightGrams || 5000, Number(e.target.value) || (product.minWeightGrams || 100))))}
                  className="w-24 rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-center text-sm outline-none focus:border-[var(--accent)]"
                />
                <span className="text-sm text-[color:var(--muted)]">gramos</span>
                <div className="flex flex-wrap gap-2 ml-auto">
                  {[250, 500, 1000, 2000].filter(w => w >= (product.minWeightGrams || 0) && w <= (product.maxWeightGrams || 5000)).map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setWeight(w)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        weight === w
                          ? "bg-[var(--accent)] text-white"
                          : "bg-[var(--accent-soft)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white"
                      }`}
                    >
                      {w >= 1000 ? `${w/1000}kg` : `${w}g`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

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
              variantId: selectedVariant || undefined,
              weightGrams: product.sellByWeight ? weight : undefined,
            });
            setLoading(false);
            onClose();
          }}
        >
          {product.isUnavailable ? "No disponible" : "Agregar al carrito"}
        </Button>
      </div>
    </BottomSheet>
  );
}