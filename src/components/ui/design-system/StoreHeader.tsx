"use client";

import Link from "next/link";
import Image from "next/image";
import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { Badge } from "./Badge";
import { formatMoney } from "@/lib/format";
import { shimmerBlur } from "@/lib/images";

export interface StoreHeaderData {
  id: string;
  slug: string;
  name: string;
  category: string;
  description?: string;
  phone?: string;
  address?: string;
  imageUrl?: string;
  isActive: boolean;
  openTime?: string;
  closeTime?: string;
  scheduleDays?: string[];
  scheduleDetails?: string;
  plan: string;
  rating?: number;
  reviewCount?: number;
  deliveryTime?: string;
  deliveryFee?: number;
  currency?: string;
  distance?: string;
  scheduleLabel?: string;
}

export interface StoreHeaderProps {
  store: StoreHeaderData;
  isOpen: boolean;
  onBack: () => void;
  cartCount?: number;
  onCartClick?: () => void;
  className?: string;
}

const categoryLabels: Record<string, string> = {
  CANASTA_BASICA: "Canasta básica",
  FRUTAS_VERDURAS: "Frutas y verduras",
  CARNES: "Carnes",
  LACTEOS: "Lácteos",
  PANADERIA: "Panadería",
  BEBIDAS: "Bebidas",
  SNACKS: "Snacks",
  LIMPIEZA: "Limpieza",
  SERVICIOS: "Servicios",
  OTROS: "Otros",
};

export function StoreHeader({ 
  store, 
  isOpen, 
  onBack, 
  cartCount = 0, 
  onCartClick,
  className = "" 
}: StoreHeaderProps) {
  const categoryLabel = categoryLabels[store.category] || store.category.replace(/_/g, " ");

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`mx-auto max-w-6xl px-4 pt-4 ${className}`}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="shrink-0 rounded-full p-2 text-[color:var(--foreground)] transition-colors hover:bg-[var(--surface)]"
          aria-label="Volver"
        >
          <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <h1 className="min-w-0 flex-1 truncate text-lg font-bold tracking-tight">{store.name}</h1>

        {cartCount > 0 && onCartClick && (
          <button
            type="button"
            onClick={onCartClick}
            className="relative inline-flex shrink-0 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card-bg)] px-4 py-2 text-sm font-semibold transition-colors hover:border-[var(--accent)]/40"
          >
            <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            Carrito
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--accent)] px-1.5 text-[11px] font-bold text-[var(--on-accent)]">
              {cartCount > 99 ? "99+" : cartCount}
            </span>
          </button>
        )}
      </div>

      <div className="mt-4 flex items-center gap-4">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--accent-soft)] sm:h-24 sm:w-24">
          {store.imageUrl ? (
            <Image src={store.imageUrl} alt="" fill className="object-cover" sizes="96px" priority />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-[var(--accent)]">
              {store.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                isOpen
                  ? "bg-[var(--success-soft)] text-[color:var(--success)]"
                  : "bg-[var(--danger-soft)] text-[color:var(--danger)]"
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
              {isOpen ? "Abierto" : "Cerrado"}
            </span>
            {(store.plan === "MEMBER" || store.plan === "SOLO_DELIVERY") && (
              <Badge variant="accent" size="sm">
                {store.plan === "SOLO_DELIVERY" ? "Solo Delivery" : "Vende+"}
              </Badge>
            )}
            <span className="rounded-full bg-[var(--surface)] px-2.5 py-1 text-xs font-medium text-[color:var(--muted)]">
              {categoryLabel}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[color:var(--muted)]">
            {store.rating && store.rating > 0 ? (
              <span className="inline-flex items-center gap-1">
                <span aria-hidden="true" className="text-[var(--gold)]">
                  ★
                </span>
                <span className="font-semibold text-[color:var(--foreground)]">{store.rating.toFixed(1)}</span>
                {store.reviewCount ? <span>({store.reviewCount})</span> : null}
              </span>
            ) : null}
            {store.scheduleLabel ? (
              <span className="inline-flex items-center gap-1">
                <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {store.scheduleLabel}
              </span>
            ) : null}
            {store.distance ? (
              <span className="inline-flex items-center gap-1">
                <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {store.distance}
              </span>
            ) : null}
            {store.deliveryTime ? (
              <span className="inline-flex items-center gap-1">
                <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                </svg>
                Entrega ~{store.deliveryTime}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {store.description ? (
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-[color:var(--muted)]">
          {store.description}
        </p>
      ) : null}

      {store.address ? (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-[color:var(--muted)]">
          <svg aria-hidden="true" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="truncate">{store.address}</span>
        </p>
      ) : null}
    </motion.header>
  );
}

export function StoreHero({ 
  store, 
  isOpen 
}: { 
  store: StoreHeaderData; 
  isOpen: boolean; 
}) {
  return (
    <div className="relative mx-auto max-w-6xl px-4">
      <div className="relative aspect-[16/9] bg-gradient-to-br from-[var(--accent-soft)] to-[var(--accent)] rounded-2xl overflow-hidden">
        {store.imageUrl ? (
          <Image
            src={store.imageUrl}
            alt={store.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 60vw"
            priority
            placeholder="blur"
            blurDataURL={shimmerBlur}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-6xl">
            🏪
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-sm font-medium backdrop-blur-sm">
                  {categoryLabels[store.category] || store.category.replace(/_/g, " ")}
                </span>
                {(store.plan === "MEMBER" || store.plan === "SOLO_DELIVERY") && (
                  <Badge variant="accent" size="sm">{store.plan === "SOLO_DELIVERY" ? "Solo Delivery" : "Vende+"}</Badge>
                )}
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold truncate">{store.name}</h1>
              {store.description && (
                <p className="mt-2 text-white/90 line-clamp-2 max-w-2xl">{store.description}</p>
              )}
            </div>
            <div className="flex flex-col sm:flex-row items-end gap-3 shrink-0">
              <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${
                isOpen ? "bg-green-500" : "bg-red-500"
              }`}>
                <span className="h-2 w-2 rounded-full bg-[var(--card-bg)] animate-pulse" aria-hidden="true" />
                {isOpen ? "Abierto ahora" : "Cerrado"}
              </div>
              {store.deliveryFee !== undefined && (
                <Link
                  href={`/tienda/${store.slug}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--card-bg)] px-6 py-3 text-base font-bold text-[var(--accent)] shadow-lg transition-all hover:scale-105 hover:shadow-xl active:scale-[0.98]"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                  </svg>
                  Ver tienda
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}