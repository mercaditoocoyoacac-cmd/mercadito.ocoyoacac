"use client";

import Link from "next/link";
import Image from "next/image";
import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { Button } from "./Button";
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
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`mx-auto max-w-6xl px-4 py-3 ${className}`}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="shrink-0 rounded-lg p-2 hover:bg-gray-100 transition-colors border-none bg-transparent cursor-pointer"
          aria-label="Volver"
        >
          <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        {store.imageUrl && (
          <Link href={`/tienda/${store.slug}`} className="shrink-0" aria-label={store.name}>
            <div className="relative h-10 w-10 overflow-hidden rounded-lg border border-gray-200">
              <Image
                src={store.imageUrl}
                alt={store.name}
                fill
                className="object-cover"
                sizes="40px"
                priority
              />
            </div>
          </Link>
        )}
        
        <div className="flex-1 min-w-0">
          <Link href={`/tienda/${store.slug}`} className="block" aria-label={store.name}>
            <h1 className="text-base font-bold truncate">{store.name}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  isOpen ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
                {isOpen ? "Abierto" : "Cerrado"}
              </span>
              {store.plan === "MEMBER" && (
                <Badge variant="accent" size="sm" leftIcon={
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                }>
                  Vende+
                </Badge>
              )}
            </div>
          </Link>
          {store.distance && (
            <p className="mt-1 text-xs text-[color:var(--muted)] flex items-center gap-1">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {store.distance}
            </p>
          )}
          {store.deliveryTime && (
            <p className="mt-1 text-xs text-[color:var(--muted)] flex items-center gap-1">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Entrega en ~{store.deliveryTime}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {store.rating && store.rating > 0 && (
            <div className="flex items-center gap-1 text-sm">
              <span className="font-semibold text-amber-600">{store.rating.toFixed(1)}</span>
              <svg className="h-4 w-4 text-amber-500" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              {store.reviewCount && (
                <span className="text-[color:var(--muted)]">({store.reviewCount})</span>
              )}
            </div>
          )}

          {cartCount > 0 && onCartClick && (
            <Button
              variant="ghost"
              size="sm"
              leftIcon={
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              }
              rightIcon={
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)] text-white text-[10px] font-bold">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              }
              onClick={onCartClick}
              className="relative"
            >
              Carrito
            </Button>
          )}
        </div>
      </div>

      {store.address && (
        <div className="mt-3 flex items-center gap-2 text-xs text-[color:var(--muted)]">
          <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="truncate">{store.address}</span>
        </div>
      )}
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
                {store.plan === "MEMBER" && (
                  <Badge variant="accent" size="sm">Vende+</Badge>
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
                <span className="h-2 w-2 rounded-full bg-white animate-pulse" aria-hidden="true" />
                {isOpen ? "Abierto ahora" : "Cerrado"}
              </div>
              {store.deliveryFee !== undefined && (
                <Link
                  href={`/tienda/${store.slug}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-base font-bold text-[var(--accent)] shadow-lg transition-all hover:scale-105 hover:shadow-xl active:scale-[0.98]"
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