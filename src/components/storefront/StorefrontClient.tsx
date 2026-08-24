"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

import {
  Button,
  Card,
  CardContent,
  Badge,
  Skeleton,
  SkeletonProductCard,
  EmptyState,
  BottomSheet,
  QuickViewSheet,
  ProductCard,
  ProductGrid,
  StoreHeader,
  CategoryAccordion,
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
}: {
  store: StoreData;
  products: ProductData[];
  storePromotions: StorePromotion[];
  open: boolean;
}) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [cartCount, setCartCount] = useState(0);
  const [quickViewProduct, setQuickViewProduct] = useState<ProductData | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

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
      if (e.key === "Escape") { setQuickViewProduct(null); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const isServicios = store.category === "SERVICIOS";

  const featuredProducts = useMemo(() => {
    if (isServicios) return [];
    const promoProductIds = new Set(
      storePromotions.flatMap((p) => p.products.map((pp) => pp.product.id))
    );
    return products
      .filter((p) => (p.isPromotion || p.variants.length > 0 || p.soldCount > 0) && !promoProductIds.has(p.id))
      .sort((a, b) => b.soldCount - a.soldCount)
      .slice(0, 10);
  }, [products, isServicios, storePromotions]);

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
    );
  }, [products, searchQuery]);

  const otherProducts = useMemo(() => {
    if (searchQuery) return filteredProducts;
    const featuredIds = new Set(featuredProducts.map((p) => p.id));
    return products.filter((p) => !featuredIds.has(p.id));
  }, [products, featuredProducts, searchQuery, filteredProducts]);

  const categories = useMemo(() => {
    if (isServicios) return [];
    const categoryMap = new Map<string, ProductData[]>();
    otherProducts.forEach((p) => {
      const cat = p.store?.category || "General";
      if (!categoryMap.has(cat)) categoryMap.set(cat, []);
      categoryMap.get(cat)!.push(p);
    });
    return Array.from(categoryMap.entries()).map(([name, products]) => ({
      id: name.toLowerCase().replace(/\s+/g, "-"),
      name,
      slug: name.toLowerCase().replace(/\s+/g, "-"),
      productCount: products.length,
      products,
    }));
  }, [otherProducts, isServicios]);

  const promotionsForDisplay = useMemo(() => storePromotions.map((p) => ({
    ...p,
    products: p.products.map((pp) => ({
      ...pp,
      product: {
        ...pp.product,
        currency: "MXN",
        isUnavailable: false,
        sellByWeight: false,
        minWeightGrams: 100,
        maxWeightGrams: 5000,
        soldCount: 0,
        isPromotion: true,
        promotionPriceCents: pp.promoPriceCents,
        discountPercentage: p.discountPercentage,
        variants: [],
      },
    })),
  })), [storePromotions]);

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

  return (
    <>
      {/* Store Header */}
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
          rating: 4.5,
          reviewCount: 128,
          deliveryTime: "30-45 min",
          deliveryFee: 25,
          currency: "MXN",
          distance: "2.3 km",
        }}
        isOpen={open}
        onBack={() => window.history.back()}
        cartCount={cartCount}
        onCartClick={() => router.push("/carrito")}
      />

      <main className="mx-auto max-w-6xl flex-1 px-4 pb-20">
        {/* Search Bar */}
        <div className="relative mb-6">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[color:var(--muted)] pointer-events-none"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={searchRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isServicios ? "Buscar servicios..." : "Buscar productos..."}
            className="w-full rounded-xl border border-[var(--border)] bg-white py-3 pl-10 pr-10 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 transition-all [font-size:16px]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 hover:bg-[var(--accent-soft)] transition-colors"
              aria-label="Limpiar búsqueda"
            >
              <svg className="h-5 w-5 text-[color:var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Featured Products Carousel */}
        {!isServicios && !searchQuery && featuredProducts.length > 0 && (
          <ProductCarousel
            products={featuredProducts.map(p => ({
              ...p,
              currency: p.currency || "MXN",
              description: p.description ?? null,
            }))}
            onAddToCart={handleAddToCart}
            onQuickView={setQuickViewProduct}
            title="Más vendidos"
            showTitle={true}
          />
        )}

        {/* Promotions Banner */}
        {!isServicios && storePromotions.length > 0 && !searchQuery && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">Promociones activas</h2>
            <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory -mx-1 px-1">
              {promotionsForDisplay.map((promo) => (
                <motion.div
                  key={promo.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex-shrink-0 w-72 snap-center rounded-xl border border-[var(--border)] overflow-hidden hover:shadow-lg transition-shadow"
                  style={{ scrollSnapAlign: "center" }}
                >
                  <div className="relative h-36 bg-gradient-to-br from-[var(--accent-soft)] to-[var(--accent)] flex items-center justify-center">
                    {promo.products[0]?.product.imageUrl ? (
                      <Image
                        src={promo.products[0].product.imageUrl}
                        alt={promo.title}
                        fill
                        className="object-cover p-2"
                        sizes="288px"
                        placeholder="blur"
                        blurDataURL={shimmerBlur}
                      />
                    ) : (
                      <div className="text-4xl">🎁</div>
                    )}
                    {promo.discountPercentage && (
                      <div className="absolute top-2 left-2 z-10">
                        <Badge variant="danger" size="sm">-{promo.discountPercentage}%</Badge>
                      </div>
                    )}
                    {promo.requiresCoupon && (
                      <div className="absolute top-2 right-2 z-10">
                        <Badge variant="warning" size="sm">Requiere cupón</Badge>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-sm truncate mb-1">{promo.title}</h3>
                    {promo.description && <p className="text-xs text-[color:var(--muted)] line-clamp-2 mb-2">{promo.description}</p>}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-[var(--accent)]">
                        {promo.products.length} productos
                      </span>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/tienda/${store.slug}`}>Ver</Link>
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Products Grid / Categories */}
        {searchQuery && filteredProducts.length === 0 ? (
          <EmptyState
            illustration="search"
            title="No se encontraron productos"
            description={`No hay resultados para &ldquo;${searchQuery}&rdquo;`}
            action={{ label: "Limpiar búsqueda", onClick: () => setSearchQuery(""), variant: "outline" }}
          />
        ) : isServicios ? (
          <div className="space-y-4">
            <p className="text-sm text-[color:var(--muted)]">{otherProducts.length} servicios</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {otherProducts.map((product, i) => (
                <ProductCard
                  key={product.id}
                  product={{
                    ...product,
                    currency: product.currency || "MXN",
                    description: product.description ?? undefined,
                  }}
                  variant="default"
                  onAddToCart={handleAddToCart}
                  onQuickView={() => setQuickViewProduct(product)}
                  showQuickView={true}
                />
              ))}
            </div>
          </div>
        ) : categories.length > 0 ? (
          <CategoryAccordion
            categories={categories}
            onAddToCart={handleAddToCart}
            onQuickView={setQuickViewProduct}
            defaultOpen={categories.slice(0, 2).map(c => c.id)}
          />
        ) : otherProducts.length > 0 ? (
<ProductGrid
              products={otherProducts.map(p => ({ ...p, currency: p.currency || "MXN", description: p.description ?? undefined }))}
              onAddToCart={handleAddToCart}
              onQuickView={setQuickViewProduct}
              variant="default"
            emptyState={{
              title: "No hay productos",
              description: "Esta tienda no tiene productos publicados aún.",
              actionLabel: "Ver tienda",
              actionHref: `/tienda/${store.slug}`,
            }}
          />
        ) : (
          <EmptyState
            illustration="store"
            title="No hay productos disponibles"
            description="Esta tienda aún no tiene productos publicados."
            action={{ label: "Ver tienda", href: `/tienda/${store.slug}`, variant: "primary" }}
          />
        )}

        {/* Floating Cart Button */}
        {cartCount > 0 && !quickViewProduct && (
          <Link
            href="/carrito"
            className="fixed bottom-6 right-6 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-xl transition-all hover:bg-[var(--accent-hover)] hover:scale-110 active:scale-95"
            aria-label={`Carrito con ${cartCount} productos`}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
            </svg>
            <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white leading-none border-2 border-white">
              {cartCount > 99 ? "99+" : cartCount}
            </span>
          </Link>
        )}

        {/* Quick View Sheet */}
        <QuickViewSheet
          open={!!quickViewProduct}
          onClose={() => setQuickViewProduct(null)}
          product={quickViewProduct}
          onAddToCart={handleAddToCart}
        />
      </main>
    </>
  );
}

function ProductCarousel({ 
  products, 
  onAddToCart, 
  onQuickView,
  title = "Productos",
  showTitle = true,
  className = ""
}: {
  products: ProductData[];
  onAddToCart: (data: { productId: string; variantId?: string; weightGrams?: number }) => void;
  onQuickView?: (product: ProductData) => void;
  title?: string;
  showTitle?: boolean;
  className?: string;
}) {
  return (
    <div className={`mb-8 ${className}`}>
      {showTitle && <h3 className="text-lg font-semibold mb-3">{title}</h3>}
      <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory -mx-1 px-1" style={{ scrollBehavior: "smooth" }}>
        {products.map((product) => (
          <div key={product.id} className="flex-shrink-0 w-40 sm:w-44 snap-center" style={{ scrollSnapAlign: "center" }}>
            <ProductCard
              product={{
                ...product,
                currency: product.currency || "MXN",
              }}
              variant="compact"
              onAddToCart={onAddToCart}
              onQuickView={onQuickView ? () => onQuickView(product) : undefined}
              showQuickView={!!onQuickView}
            />
          </div>
        ))}
      </div>
    </div>
  );
}