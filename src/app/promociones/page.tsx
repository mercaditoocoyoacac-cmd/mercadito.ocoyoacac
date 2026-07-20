"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatMoney } from "@/lib/format";
import { shimmerBlur } from "@/lib/images";

interface Promotion {
  id: string;
  name: string;
  priceCents: number;
  promotionPriceCents: number;
  discountPercentage: number | null;
  imageUrl: string | null;
  promotionEndDate: string | null;
  store: {
    id: string;
    name: string;
    slug: string;
    imageUrl: string | null;
  };
}

export default function PromocionesPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/promotions");
        const data = await res.json();
        if (data.ok) setPromotions(data.promotions);
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

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Promociones</h1>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          Los mejores descuentos de Mercadito Ocoyoacac
        </p>
      </div>

      {promotions.length === 0 && (
        <div className="rounded-xl border border-dashed border-[var(--border)] p-10 text-center text-sm text-[color:var(--muted)]">
          No hay promociones activas en este momento.
        </div>
      )}

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
        {promotions.map((p) => (
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
    </main>
  );
}
