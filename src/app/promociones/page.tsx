"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatMoney } from "@/lib/format";
import { shimmerBlur } from "@/lib/images";

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
  product: MultiPromoProduct;
}

interface MultiPromo {
  id: string;
  title: string;
  description: string | null;
  discountPercentage: number | null;
  imageUrl: string | null;
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
        <h1 className="text-2xl font-semibold tracking-tight mb-6">Promociones</h1>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-gray-100 animate-pulse aspect-square" />
          ))}
        </div>
      </main>
    );
  }

  const hasAny = productPromos.length > 0 || multiPromos.length > 0;

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Promociones</h1>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          Los mejores descuentos de Mercadito Ocoyoacac
        </p>
      </div>

      {!hasAny && (
        <div className="rounded-xl border border-dashed border-[var(--border)] p-10 text-center text-sm text-[color:var(--muted)]">
          No hay promociones activas en este momento.
        </div>
      )}

      {multiPromos.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Promociones especiales</h2>
          <div className="space-y-4">
            {multiPromos.map((promo) => (
              <motion.div
                key={promo.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-[var(--border)] overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-base">{promo.title}</h3>
                        {promo.discountPercentage && (
                          <span className="rounded-md bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                            -{promo.discountPercentage}%
                          </span>
                        )}
                      </div>
                      {promo.description && (
                        <p className="mt-1 text-sm text-[color:var(--muted)]">{promo.description}</p>
                      )}
                      <div className="mt-1 text-xs text-[color:var(--muted)]">{promo.store.name}</div>
                      {promo.endDate && (
                        <div className="mt-1 text-[10px] text-amber-600">
                          Vence: {new Date(promo.endDate).toLocaleDateString("es-MX")}
                        </div>
                      )}
                    </div>
                    <Link
                      href={`/tienda/${promo.store.slug}`}
                      className="shrink-0 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--accent-hover)]"
                    >
                      Ver tienda
                    </Link>
                  </div>
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {promo.products.map((pp) => {
                      const origPrice = pp.product.isPromotion && pp.product.promotionPriceCents
                        ? pp.product.promotionPriceCents
                        : pp.product.priceCents;
                      return (
                        <Link
                          key={pp.id}
                          href={`/tienda/${promo.store.slug}`}
                          className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-gray-50 p-2 hover:bg-gray-100 transition-colors"
                        >
                          {pp.product.imageUrl ? (
                            <Image
                              src={pp.product.imageUrl}
                              alt={pp.product.name}
                              width={40}
                              height={40}
                              className="h-10 w-10 rounded-md object-cover shrink-0"
                              placeholder="blur"
                              blurDataURL={shimmerBlur}
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-md bg-gray-200 flex items-center justify-center text-xs text-gray-400 shrink-0">
                              📦
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="text-xs font-medium truncate">{pp.product.name}</div>
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
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {productPromos.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Ofertas individuales</h2>
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
                  className="group rounded-xl border border-[var(--border)] overflow-hidden hover:shadow-md transition-shadow block"
                >
                  <div className="relative aspect-square bg-gray-50">
                    {p.imageUrl ? (
                      <Image
                        src={p.imageUrl}
                        alt={p.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        placeholder="blur"
                        blurDataURL={shimmerBlur}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-3xl text-gray-300">
                        🏪
                      </div>
                    )}
                    {p.discountPercentage != null && (
                      <div className="absolute top-2 left-2 rounded-md bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                        -{p.discountPercentage}%
                      </div>
                    )}
                  </div>
                  <div className="p-3 space-y-1">
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
                      <div className="text-[10px] text-amber-600">
                        Vence: {new Date(p.promotionEndDate).toLocaleDateString("es-MX")}
                      </div>
                    )}
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      )}
    </main>
  );
}
