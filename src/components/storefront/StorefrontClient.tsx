"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

import {
  Badge,
  EmptyState,
  QuickViewSheet,
  ProductGrid,
  StoreHeader,
  formatMoney,
  shimmerBlur,
} from "@/components/ui/design-system";

interface VariantData {
  id: string;
  name: string;
  priceCents: number;
}

interface ProductData {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  currency: string;
  imageUrl: string | null;
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
  store: { category: string } | null;
  variants: VariantData[];
}

interface StoreData {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string | null;
  phone: string | null;
  address: string | null;
  imageUrl: string | null;
  isActive: boolean;
  openTime: string | null;
  closeTime: string | null;
  scheduleDays: string[] | null;
  scheduleDetails: string | null;
  plan: string;
}

interface StorePromoProduct {
  promoPriceCents: number | null;
  quantity: number;
  product: {
    id: string;
    name: string;
    imageUrl: string | null;
    priceCents: number;
  };
}

interface StorePromotion {
  id: string;
  title: string;
  description: string | null;
  discountPercentage: number | null;
  requiresCoupon: boolean;
  products: StorePromoProduct[];
}

export function StorefrontClient({
  store,
  products,
  storePromotions,
  open,
  isPremium,
  rating = null,
  reviewCount = 0,
  scheduleLabel = null,
}: {
  store: StoreData;
  products: ProductData[];
  storePromotions: StorePromotion[];
  open: boolean;
  isPremium: boolean;
  rating?: number | null;
  reviewCount?: number;
  scheduleLabel?: string | null;
}) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [cartCount, setCartCount] = useState(0);
  const [quickViewProduct, setQuickViewProduct] = useState<ProductData | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("ALL");

  const isServicios = store.category === "SERVICIOS";

  const getProductCategory = useCallback(
    (product: ProductData) => product.store?.category || "General",
    []
  );

  const categoryNames = useMemo(() => {
    if (isServicios) return [];
    const names = new Set<string>();
    products.forEach((p) => names.add(getProductCategory(p)));
    return names.size > 1 ? Array.from(names) : [];
  }, [products, isServicios, getProductCategory]);

  const priceCentsOf = useCallback(
    (product: ProductData) =>
      product.isPromotion && product.promotionPriceCents != null
        ? product.promotionPriceCents
        : product.priceCents,
    []
  );

  const visibleProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      if (activeCategory !== "ALL" && getProductCategory(p) !== activeCategory) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.description != null && p.description.toLowerCase().includes(q))
      );
    });
  }, [products, searchQuery, activeCategory, getProductCategory]);

  const featuredProducts = useMemo(() => {
    if (searchQuery || activeCategory !== "ALL" || isServicios) return [];
    const highlighted = products
      .filter((p) => p.isPromotion || p.soldCount > 0)
      .sort((a, b) => b.soldCount - a.soldCount)
      .slice(0, 5);
    return highlighted.length >= 3 ? highlighted : [];
  }, [products, searchQuery, activeCategory, isServicios]);

  const featuredIds = useMemo(() => new Set(featuredProducts.map((p) => p.id)), [featuredProducts]);
  const gridProducts = useMemo(
    () => (featuredIds.size > 0 ? visibleProducts.filter((p) => !featuredIds.has(p.id)) : visibleProducts),
    [visibleProducts, featuredIds]
  );

  const promoProducts = useMemo(
    () =>
      storePromotions
        .flatMap((promo) =>
          promo.products
            .filter((pp) => pp.product.imageUrl)
            .map((pp) => ({
              id: pp.product.id,
              name: pp.product.name,
              imageUrl: pp.product.imageUrl as string,
              priceCents: pp.promoPriceCents ?? pp.product.priceCents,
              currency: "MXN",
            }))
        )
        .slice(0, 6),
    [storePromotions]
  );

  const fetchCartCount = useCallback(async () => {
    try {
      const res = await fetch("/api/cart/items");
      if (res.ok) {
        const data = await res.json();
        if (data.ok) setCartCount(data.items?.length ?? 0);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchCartCount();
    const interval = setInterval(fetchCartCount, 5000);
    return () => clearInterval(interval);
  }, [fetchCartCount]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setQuickViewProduct(null);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const handleAddToCart = async (data: { productId: string; variantId?: string; weightGrams?: number }) => {
    const res = await fetch("/api/cart/items", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...data, quantity: 1 }),
    });
    const result = await res.json().catch(() => null);
    if (res.status === 401) {
      router.push(`/login?callbackUrl=${encodeURIComponent(window.location.href)}`);
      return;
    }
    if (res.ok && result?.ok) {
      fetchCartCount();
    }
  };

  const bookAppointmentHref = (product: { name: string }) => {
    if (!store.phone) return "";
    const number = store.phone.replace(/\D/g, "");
    const message = encodeURIComponent(
      `Hola ${store.name}, me gustaría agendar una cita para: ${product.name}`,
    );
    return `https://api.whatsapp.com/send?phone=${number}&text=${message}`;
  };

  const clearFilters = () => {
    setSearchQuery("");
    setActiveCategory("ALL");
  };

  const hasFilters = searchQuery.trim().length > 0 || activeCategory !== "ALL";
  const sectionLabel = isServicios ? "Servicios" : "Productos";

  return (
    <>
      <StoreHeader
        store={{
          ...store,
          description: store.description ?? undefined,
          phone: store.phone ?? undefined,
          address: store.address ?? undefined,
          imageUrl: store.imageUrl ?? undefined,
          openTime: store.openTime ?? undefined,
          closeTime: store.closeTime ?? undefined,
          scheduleDays: store.scheduleDays ?? undefined,
          scheduleDetails: store.scheduleDetails ?? undefined,
          rating: rating ?? undefined,
          reviewCount: reviewCount || undefined,
          scheduleLabel: scheduleLabel ?? undefined,
          currency: "MXN",
        }}
        isOpen={open}
        onBack={() => window.history.back()}
        cartCount={cartCount}
        onCartClick={() => router.push("/carrito")}
      />

      <main className="mx-auto max-w-6xl flex-1 px-4 pb-24 pt-5">
        {!isPremium && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-[var(--warning)]/30 bg-[var(--warning-soft)] px-4 py-3">
            <svg aria-hidden="true" className="h-5 w-5 shrink-0 text-[var(--warning)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2-1m6 0l2 1m-2-1v-4a1 1 0 011-1h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 01.293.707V16l-2 1m-6-3h4m-8 3h8" />
            </svg>
            <div>
              <div className="text-sm font-semibold text-[color:var(--warning)]">
                Accede a una membresía para tener todos los beneficios
              </div>
              <p className="text-xs text-[color:var(--warning)] opacity-90">
                Activa Solo Delivery o Vende+ para habilitar el envío a domicilio. Por ahora elige “Recoger en tienda”.
              </p>
            </div>
          </div>
        )}

        <div className="relative">
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[color:var(--muted)]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            aria-label={isServicios ? "Buscar servicios" : "Buscar productos"}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isServicios ? "Buscar servicios…" : "Buscar productos…"}
            className="w-full rounded-full border border-[var(--border)] bg-[var(--card-bg)] py-3 pl-11 pr-11 text-sm outline-none transition-colors [font-size:16px] focus:border-[var(--accent)]/50"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 transition-colors hover:bg-[var(--surface)]"
              aria-label="Limpiar búsqueda"
            >
              <svg aria-hidden="true" className="h-5 w-5 text-[color:var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : null}
        </div>

        {categoryNames.length > 0 ? (
          <nav aria-label="Filtrar por categoría" className="mt-3 -mx-4 overflow-x-auto px-4 scrollbar-hide">
            <div className="flex w-max gap-2 py-1">
              <CategoryChip label="Todo" active={activeCategory === "ALL"} onClick={() => setActiveCategory("ALL")} />
              {categoryNames.map((name) => (
                <CategoryChip
                  key={name}
                  label={name}
                  active={activeCategory === name}
                  onClick={() => setActiveCategory(name)}
                />
              ))}
            </div>
          </nav>
        ) : null}

        {featuredProducts.length > 0 && promoProducts.length > 0 ? (
          <section aria-labelledby="tienda-destacados" className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="tienda-destacados" className="text-base font-semibold">
                Promociones y más vendidos
              </h2>
              <span className="text-xs text-[color:var(--muted)]">{featuredProducts.length + promoProducts.length} destacados</span>
            </div>
            <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 scrollbar-hide">
              {promoProducts.map((product) => (
                <div key={`promo-${product.id}`} className="w-64 shrink-0 snap-start">
                  <FeaturedTile
                    imageUrl={product.imageUrl}
                    name={product.name}
                    priceCents={product.priceCents}
                    badge="Promo"
                    onOpen={() => router.push(`/carrito`)}
                  />
                </div>
              ))}
              {featuredProducts.map((product) => (
                <div key={`feat-${product.id}`} className="w-64 shrink-0 snap-start">
                  <FeaturedTile
                    imageUrl={product.imageUrl}
                    name={product.name}
                    priceCents={priceCentsOf(product)}
                    badge="Popular"
                    onOpen={() => setQuickViewProduct(product)}
                  />
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section aria-labelledby="tienda-productos" className="mt-8">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 id="tienda-productos" className="text-base font-semibold">
              {sectionLabel}
              <span className="ml-2 text-sm font-normal text-[color:var(--muted)]">
                {gridProducts.length}
              </span>
            </h2>
            {hasFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="text-sm font-medium text-[var(--accent-strong)] underline-offset-4 hover:underline"
              >
                Limpiar filtros
              </button>
            ) : null}
          </div>

          {gridProducts.length === 0 ? (
            hasFilters ? (
              <EmptyState
                illustration="search"
                title="No se encontraron productos"
                description={`No hay resultados para “${searchQuery || activeCategory}”.`}
                action={{ label: "Limpiar filtros", onClick: clearFilters, variant: "outline" }}
              />
            ) : (
              <EmptyState
                illustration="store"
                title="No hay productos disponibles"
                description="Esta tienda aún no tiene productos publicados."
              />
            )
          ) : isServicios ? (
            <ProductGrid
              products={gridProducts.map((product) => ({
                ...product,
                currency: product.currency || "MXN",
                description: product.description ?? undefined,
                imageUrl: product.imageUrl ?? undefined,
              }))}
              variant="default"
              onAddToCart={handleAddToCart}
              onBookAppointment={(product) => (product.isService ? bookAppointmentHref(product) : "")}
              onQuickView={(product) => setQuickViewProduct(product as ProductData)}
              rating={null}
              priorityCount={2}
            />
          ) : (
            <ProductGrid
              products={gridProducts.map((product) => ({
                ...product,
                currency: product.currency || "MXN",
                description: product.description ?? undefined,
                imageUrl: product.imageUrl ?? undefined,
              }))}
              variant="default"
              onAddToCart={handleAddToCart}
              onBookAppointment={(product) => (product.isService ? bookAppointmentHref(product) : "")}
              onQuickView={(product) => setQuickViewProduct(product as ProductData)}
              rating={rating}
              priorityCount={3}
            />
          )}
        </section>

        {cartCount > 0 && !quickViewProduct ? (
          <button
            type="button"
            onClick={() => router.push("/carrito")}
            className="fixed bottom-24 right-5 z-20 inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-5 py-3.5 font-semibold text-[var(--on-accent)] shadow-xl transition-transform hover:bg-[var(--accent-hover)] active:scale-95"
          >
            <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
            </svg>
            Ver carrito
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--card-bg)] px-1.5 text-[11px] font-bold text-[var(--accent-strong)]">
              {cartCount > 99 ? "99+" : cartCount}
            </span>
          </button>
        ) : null}

        {quickViewProduct ? (
          (() => {
            const product = quickViewProduct;
            return (
              <QuickViewSheet
                open={!!quickViewProduct}
                onClose={() => setQuickViewProduct(null)}
                product={
                  {
                    ...product,
                    description: product.description ?? undefined,
                    imageUrl: product.imageUrl ?? undefined,
                    formatMoney: (cents: number, currency: string) =>
                      new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(cents / 100),
                  } as never
                }
                onAddToCart={(data) => handleAddToCart(data)}
              />
            );
          })()
        ) : null}
      </main>
    </>
  );
}

function CategoryChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex shrink-0 items-center rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
        active
          ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--on-accent)]"
          : "border-[var(--border)] bg-[var(--card-bg)] text-[color:var(--muted)] hover:border-[var(--accent)]/40 hover:text-[color:var(--foreground)]"
      }`}
    >
      {label}
    </button>
  );
}

function FeaturedTile({
  imageUrl,
  name,
  priceCents,
  badge,
  onOpen,
}: {
  imageUrl: string | null;
  name: string;
  priceCents: number;
  badge: string;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group block w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="relative aspect-[4/3] bg-[var(--accent-soft)]">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt=""
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="256px"
            placeholder="blur"
            blurDataURL={shimmerBlur}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl">📦</div>
        )}
        <span className="absolute left-3 top-3">
          <Badge variant={badge === "Promo" ? "danger" : "accent"} size="sm">
            {badge}
          </Badge>
        </span>
      </div>
      <div className="p-3">
        <h3 className="line-clamp-1 text-sm font-medium">{name}</h3>
        <p className="mt-1 text-sm font-semibold text-[var(--accent-strong)]">{formatMoney(priceCents, "MXN")}</p>
      </div>
    </button>
  );
}
