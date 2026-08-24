"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatMoney } from "@/lib/format";
import { shimmerBlur } from "@/lib/images";
import { Card, CardContent, Badge, EmptyState, Skeleton, SkeletonCard } from "@/components/ui/design-system";

interface ProductPromo {
  id: string;
  name: string;
  priceCents: number;
  promotionPriceCents: number;
  discountPercentage: number | null;
  imageUrl: string | null;
  promotionEndDate: string | null;
  store: { id: string; name: string; slug: string; imageUrl: string | null };
}

interface MultiPromoProduct {
  id: string;
  name: string;
  priceCents: number;
  imageUrl: string | null;
  promotionPriceCents: number | null;
  isPromotion: boolean;
}

interface MultiPromoProductLink {
  id: string;
  promoPriceCents: number | null;
  quantity: number;
  product: MultiPromoProduct;
}

interface MultiPromo {
  id: string;
  title: string;
  description: string | null;
  discountPercentage: number | null;
  imageUrl: string | null;
  requiresCoupon: boolean;
  endDate: string | null;
  store: { id: string; name: string; slug: string; imageUrl: string | null };
  products: MultiPromoProductLink[];
}

export default function PromocionesPage() {
  const [productPromos, setProductPromos] = useState<ProductPromo[]>([]);
  const [multiPromos, setMultiPromos] = useState<MultiPromo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/promotions");
        const data = await res.json();
        if (data.ok) {
          setProductPromos(data.productPromotions || []);
          setMultiPromos(data.multiPromotions || []);
        }
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 fade-in">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight mb-6">Promociones</h1>
        </div>
        <div className="space-y-4">
          <SkeletonCard showImage={true} showTitle={true} showDescription={false} showFooter={true} />
          <SkeletonCard showImage={true} showTitle={true} showDescription={false} showFooter={true} />
          <SkeletonCard showImage={true} showTitle={true} showDescription={false} showFooter={true} />
        </div>
      </main>
    );
  }

  const hasAny = productPromos.length > 0 || multiPromos.length > 0;

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 fade-in">
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight">Promociones</h1>
        <p className="mt-1 text-sm text-[color:var(--muted)]">Los mejores descuentos de Mercadito Ocoyoacac</p>
      </div>

      {!hasAny && (
        <EmptyState
          illustration="cart"
          title="No hay promociones activas"
          description="Vuelve pronto para ver las mejores ofertas de tu comunidad"
          action={{ label: "Explorar tiendas", href: "/tiendas", variant: "primary" }}
        />
      )}

      {multiPromos.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Promociones especiales</h2>
            <Badge variant="accent" size="sm">{multiPromos.length} activa{multiPromos.length !== 1 ? "s" : ""}</Badge>
          </div>
          <div className="space-y-4">
            {multiPromos.map((promo) => (
              <motion.div
                key={promo.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="group"
              >
                <Card variant="outlined" hover={true} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
                      {/* Promo Header */}
                      <div className="md:col-span-3 p-5 bg-gradient-to-r from-[var(--accent-soft)] to-[var(--accent)] relative overflow-hidden">
                        <div className="absolute inset-0 opacity-10">
                          <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <defs>
                              <pattern id="promo-pattern" width="20" height="20" patternUnits="userSpaceOnUse">
                                <circle cx="10" cy="10" r="1.5" fill="currentColor" />
                              </pattern>
                            </defs>
                            <rect width="100" height="100" fill="url(#promo-pattern)" />
                          </svg>
                        </div>
                        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                              <h3 className="font-semibold text-base text-white">{promo.title}</h3>
                              {promo.discountPercentage && (
                                <Badge variant="danger" size="sm">-{promo.discountPercentage}%</Badge>
                              )}
                              {promo.requiresCoupon && (
                                <Badge variant="warning" size="sm">Requiere cupón</Badge>
                              )}
                            </div>
                            {promo.description && (
                              <p className="text-sm text-white/90 line-clamp-2 mb-2">{promo.description}</p>
                            )}
                            <div className="flex flex-wrap items-center gap-3 text-sm text-white/80">
                              <span className="flex items-center gap-1">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                {promo.store.name}
                              </span>
                              {promo.endDate && (
                                <span className="flex items-center gap-1 bg-white/20 px-2 py-1 rounded-full">
                                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                  Vence: {new Date(promo.endDate).toLocaleDateString("es-MX", { day: "numeric", month: "long" })}
                                </span>
                              )}
                            </div>
                          </div>
                          <Link
                            href={`/tienda/${promo.store.slug}`}
                            className="shrink-0 self-center mx-auto md:mx-0 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-[var(--accent)] shadow-lg transition-all hover:bg-[var(--accent-soft)] hover:shadow-xl"
                          >
                            Ver tienda
                          </Link>
                        </div>
                      </div>

                      {/* Products Grid */}
                      <div className="md:col-span-3 p-4 bg-gray-50">
                        <h4 className="text-xs font-semibold text-[color:var(--muted)] uppercase tracking-wide mb-3">Productos incluidos</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                          {promo.products.map((pp) => {
                            const origPrice = pp.product.isPromotion && pp.product.promotionPriceCents
                              ? pp.product.promotionPriceCents
                              : pp.product.priceCents;
                            return (
                              <Link
                                key={pp.id}
                                href={`/tienda/${promo.store.slug}`}
                                className="group flex flex-col rounded-xl border border-[var(--border)] bg-white p-3 hover:shadow-lg hover:border-[var(--accent)] transition-all"
                              >
                                <div className="relative aspect-square bg-gray-100 mb-3 overflow-hidden rounded-lg">
                                  {pp.product.imageUrl ? (
                                    <Image
                                      src={pp.product.imageUrl}
                                      alt={pp.product.name}
                                      fill
                                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                                      sizes="80px"
                                      placeholder="blur"
                                      blurDataURL={shimmerBlur}
                                    />
                                  ) : (
                                    <div className="flex h-full items-center justify-center text-2xl">📦</div>
                                  )}
                                  {(pp.quantity || 1) > 1 && (
                                    <span className="absolute top-1 right-1 rounded bg-[var(--accent)] text-white px-1.5 py-0.5 text-[9px] font-bold leading-none">
                                      {pp.quantity}x
                                    </span>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-medium truncate mb-1">{pp.product.name}</div>
                                  <div className="flex items-center gap-1">
                                    {pp.promoPriceCents != null && (
                                      <span className="text-xs font-bold text-[var(--accent)]">
                                        {formatMoney(pp.promoPriceCents, "MXN")}
                                      </span>
                                    )}
                                    <span className="text-[10px] text-[color:var(--muted)] line-through">
                                      {formatMoney(origPrice, "MXN")}
                                    </span>
                                  </div>
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {productPromos.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Ofertas individuales</h2>
            <Badge variant="accent" size="sm">{productPromos.length} producto{productPromos.length !== 1 ? "s" : ""}</Badge>
          </div>
          <motion.div
            className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
            } as const}
          >
            {productPromos.map((p) => (
              <motion.div
                key={p.id}
                variants={{
                  hidden: { opacity: 0, y: 16, scale: 0.97 },
                  visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 200, damping: 25, mass: 0.5 } },
                } as const}
              >
                <Link
                  href={`/tienda/${p.store.slug}`}
                  className="group block"
                >
                  <Card variant="default" hover={true} className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className="relative aspect-square bg-gray-100 overflow-hidden">
                        {p.imageUrl ? (
                          <Image
                            src={p.imageUrl}
                            alt={p.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                            placeholder="blur"
                            blurDataURL={shimmerBlur}
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-3xl text-gray-300">🏪</div>
                        )}
                        {p.discountPercentage != null && (
                          <div className="absolute top-2 left-2">
                            <Badge variant="danger" size="sm">-{p.discountPercentage}%</Badge>
                          </div>
                        )}
                      </div>
                      <div className="p-4 space-y-2">
                        <div className="text-xs text-[color:var(--muted)] truncate">{p.store.name}</div>
                        <div className="text-sm font-medium leading-tight line-clamp-2">{p.name}</div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-[var(--accent)]">
                            {formatMoney(p.promotionPriceCents, "MXN")}
                          </span>
                          <span className="text-xs text-[color:var(--muted)] line-through">
                            {formatMoney(p.priceCents, "MXN")}
                          </span>
                        </div>
                        {p.promotionEndDate && (
                          <div className="text-[10px] text-amber-600 flex items-center gap-1">
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            Vence: {new Date(p.promotionEndDate).toLocaleDateString("es-MX")}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      )}
    </main>
  );
}