"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef, useState, useCallback, useEffect } from "react";
import { memo } from "react";
import { shimmerBlur } from "@/lib/images";
import { formatMoney } from "@/lib/format";
import { AddToCartButton } from "./AddToCartButton";

interface VariantData {
  id: string;
  name: string;
  priceCents: number;
}

interface ProductData {
  id: string;
  name: string;
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
  slug: string;
  category: string | null;
  description: string | null;
  address: string | null;
  imageUrl: string | null;
  _count: { products: number };
  topProducts: ProductData[];
}

interface StoreCardWithProductsProps {
  store: StoreData;
  animationDelay: number;
  categoryLabel?: string;
  categoryIcon?: string;
}

export const StoreCardWithProducts = memo(function StoreCardWithProducts({
  store,
  animationDelay,
  categoryLabel,
  categoryIcon,
}: StoreCardWithProductsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);

  const checkScrollBounds = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setShowLeftFade(scrollLeft > 8);
    setShowRightFade(scrollLeft + clientWidth < scrollWidth - 8);
    setScrollPosition(scrollLeft);
  }, []);

  const scrollLeft = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = 180; // w-44 + gap
    el.scrollBy({ left: -cardWidth * 2, behavior: "smooth" });
  }, []);

  const scrollRight = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = 180; // w-44 + gap
    el.scrollBy({ left: cardWidth * 2, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScrollBounds();
    el.addEventListener("scroll", checkScrollBounds, { passive: true });
    return () => el.removeEventListener("scroll", checkScrollBounds);
  }, [checkScrollBounds]);

  const hasProducts = store.topProducts.length > 0;
  const totalProducts = store._count.products;
  const showArrows = store.topProducts.length > 2;

  return (
    <Link
      style={{ animationDelay: `${animationDelay}ms` }}
      href={`/tienda/${store.slug}`}
      className="group rounded-2xl border border-[var(--border)] bg-white overflow-hidden shadow-sm transition-all hover:shadow-lg hover:-translate-y-1 fade-in"
    >
      <div className="relative aspect-video bg-gradient-to-br from-[var(--accent-soft)] to-[var(--accent)] flex items-center justify-center">
        {store.imageUrl ? (
          <Image
            src={store.imageUrl}
            alt={store.name}
            fill
            className="object-cover p-4 rounded-xl"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            placeholder="blur"
            blurDataURL={shimmerBlur}
          />
        ) : (
          <div className="h-20 w-20 rounded-full bg-white/50 flex items-center justify-center text-3xl font-bold text-[var(--accent)]">
            {store.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-semibold group-hover:text-[var(--accent)] transition-colors">
            {store.name}
          </h3>
          {store.category && (
            <span className="shrink-0 rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-medium text-[var(--accent)]">
              {categoryIcon} {categoryLabel}
            </span>
          )}
        </div>
        {store.description ? (
          <p className="mt-2 text-sm text-[color:var(--muted)] line-clamp-2">
            {store.description}
          </p>
        ) : null}

        {/* Top Products Section */}
        {hasProducts && (
          <div className="mt-4 relative">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold flex items-center gap-1.5">
                <svg className="h-4 w-4 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                Más vendidos
              </h4>
              {totalProducts > 5 && (
                <span className="text-xs text-[color:var(--muted)]">
                  {store.topProducts.length} de {totalProducts}
                </span>
              )}
            </div>

            {/* Scroll container with gradient fades */}
            <div className="relative">
              {/* Left gradient fade */}
              {showLeftFade && (
                <div
                  className="absolute left-0 top-0 bottom-0 w-12 pointer-events-none z-10"
                  style={{
                    background: "linear-gradient(90deg, white 0%, transparent 100%)",
                  }}
                  aria-hidden="true"
                />
              )}
              {/* Right gradient fade */}
              {showRightFade && (
                <div
                  className="absolute right-0 top-0 bottom-0 w-12 pointer-events-none z-10"
                  style={{
                    background: "linear-gradient(270deg, white 0%, transparent 100%)",
                  }}
                  aria-hidden="true"
                />
              )}

              {/* Scroll arrows */}
              {showArrows && showLeftFade && (
                <button
                  type="button"
                  onClick={scrollLeft}
                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white border border-[var(--border)] shadow-lg text-[var(--accent)] hover:bg-[var(--accent-soft)] transition-all duration-200 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  aria-label="Productos anteriores"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              {showArrows && showRightFade && (
                <button
                  type="button"
                  onClick={scrollRight}
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white border border-[var(--border)] shadow-lg text-[var(--accent)] hover:bg-[var(--accent-soft)] transition-all duration-200 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  aria-label="Más productos"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}

              <div
                ref={scrollRef}
                className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1 snap-x snap-mandatory"
                style={{
                  scrollBehavior: "smooth",
                  scrollSnapType: "x mandatory",
                  WebkitOverflowScrolling: "touch",
                }}
                onScroll={checkScrollBounds}
              >
                {store.topProducts.map((product, index) => (
                  <div
                    key={product.id}
                    className="flex-shrink-0 w-40 sm:w-44 snap-center"
                    style={{ scrollSnapAlign: "center" }}
                  >
                    <div className="group relative rounded-xl border border-[var(--border)] bg-white overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                      <div className="relative aspect-square bg-[var(--accent-soft)] flex items-center justify-center overflow-hidden">
                        {product.imageUrl ? (
                          <Image
                            src={product.imageUrl}
                            alt={product.name}
                            fill
                            className="object-cover p-2 group-hover:scale-105 transition-transform duration-300"
                            sizes="100px"
                            placeholder="blur"
                            blurDataURL={shimmerBlur}
                          />
                        ) : (
                          <div className="h-16 w-16 rounded-lg bg-white/50 flex items-center justify-center text-2xl font-bold text-[var(--accent)]">
                            {product.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        {product.isUnavailable && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                              Agotado
                            </span>
                          </div>
                        )}
                        {product.isPromotion && product.promotionPriceCents != null && (
                          <div className="absolute top-2 left-2 z-10">
                            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] font-bold text-white">
                              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                              </svg>
                              Promo
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <h5 className="font-medium text-sm line-clamp-1">{product.name}</h5>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-sm font-semibold text-[var(--accent)]">
                            {product.isPromotion && product.promotionPriceCents != null
                              ? formatMoney(product.promotionPriceCents, product.currency)
                              : formatMoney(product.priceCents, product.currency)}
                            {product.sellByWeight && <span className="text-xs font-normal text-[color:var(--muted)]">/kg</span>}
                          </span>
                          {product.isPromotion && product.promotionPriceCents != null && (
                            <span className="text-xs text-[color:var(--muted)] line-through">
                              {formatMoney(product.priceCents, product.currency)}
                            </span>
                          )}
                        </div>
                        <AddToCartButton
                          productId={product.id}
                          variants={product.variants}
                          disabled={product.isUnavailable}
                          disabledLabel="Agotado"
                          sellByWeight={product.sellByWeight}
                          minWeightGrams={product.minWeightGrams}
                          maxWeightGrams={product.maxWeightGrams}
                          priceCents={product.isPromotion && product.promotionPriceCents != null ? product.promotionPriceCents : product.priceCents}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Scroll indicator dots */}
            {showArrows && store.topProducts.length > 1 && (
              <div className="mt-2 flex items-center justify-center gap-1">
                {store.topProducts.map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      const el = scrollRef.current;
                      if (!el) return;
                      const cardWidth = 180;
                      el.scrollTo({ left: index * cardWidth, behavior: "smooth" });
                    }}
                    className={`h-1.5 w-1.5 rounded-full transition-all duration-200 ${
                      Math.round(scrollPosition / 180) === index
                        ? "bg-[var(--accent)] w-5"
                        : "bg-[var(--border)] hover:bg-[var(--muted)]"
                    }`}
                    aria-label={`Ir al producto ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-[color:var(--muted)]">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            {totalProducts} producto{totalProducts !== 1 ? "s" : ""}
          </div>
          {store.address ? (
            <div className="flex items-center gap-1 text-xs text-[color:var(--muted)]">
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {store.address}
            </div>
          ) : null}
        </div>
      </div>
    </Link>
  );
});