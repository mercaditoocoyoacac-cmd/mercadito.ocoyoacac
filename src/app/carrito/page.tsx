"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useCallback } from "react";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import dynamic from "next/dynamic";

const LocationPicker = dynamic(
  () => import("@/components/maps/LocationPicker"),
  { ssr: false, loading: () => <div className="h-64 w-full bg-gray-100 animate-pulse rounded-xl" /> }
);

type CartItem = {
  quantity: number;
  weightGrams: number | null;
  variantId: string | null;
  variant: { id: string; name: string; priceCents: number } | null;
  product: {
    id: string;
    name: string;
    priceCents: number;
    currency: string;
    sellByWeight: boolean;
    isUnavailable: boolean;
    isPromotion: boolean;
    promotionPriceCents: number | null;
    promotionEndDate: string | null;
    store: { id: string; name: string; slug: string; acceptsMercadoPago: boolean; hasOnlinePayment: boolean; latitude: number | null; longitude: number | null; plan: string };
  };
};

type StorePromotion = {
  id: string;
  title: string;
  requiresCoupon: boolean;
  discountPercentage: number | null;
  products: {
    promoPriceCents: number | null;
    quantity: number;
    product: { id: string };
  }[];
};

import { motion } from "framer-motion";
import { formatMoney } from "@/lib/format";
import { calcDeliveryFeeCents, haversineDistance, type DeliveryFeeConfig } from "@/lib/geo";
import { bounceIn, cardSpring, fadeSlideUp } from "@/components/ui/MotionPresets";
import { AnimatedList, AnimatedListItem } from "@/components/ui/AnimatedList";

function Skeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="flex gap-4 items-center justify-center">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-8 w-32 rounded-lg bg-gray-200" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-gray-100" />
          ))}
        </div>
        <div className="lg:col-span-2">
          <div className="h-64 rounded-xl bg-gray-100" />
        </div>
      </div>
    </div>
  );
}

function EmptyCart() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-[var(--accent-soft)]">
        <svg className="h-12 w-12 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold">Tu carrito está vacío</h2>
      <p className="mt-2 text-sm text-[color:var(--muted)] max-w-sm">
        Agrega productos de tus tiendas favoritas y recíbelos en la comodidad de tu hogar.
      </p>
      <Link
        href="/tiendas"
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[var(--accent)]/20 transition-all hover:bg-[var(--accent-hover)] hover:shadow-xl hover:shadow-[var(--accent)]/30"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        Explorar tiendas
      </Link>
    </div>
  );
}

function StepIndicator({ current }: { current: number }) {
  const steps = [
    { num: 1, label: "Carrito" },
    { num: 2, label: "Datos" },
    { num: 3, label: "Confirmar" },
  ];
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((step, i) => (
        <div key={step.num} className="flex items-center gap-2">
          <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
            current >= step.num
              ? "bg-[var(--accent)] text-white"
              : "bg-gray-100 text-gray-400"
          }`}>
            {current > step.num ? (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            ) : step.num}
          </div>
          <span className={`text-xs font-medium ${current >= step.num ? "text-[var(--foreground)]" : "text-[color:var(--muted)]"}`}>
            {step.label}
          </span>
          {i < steps.length - 1 && <div className={`hidden sm:block h-px w-12 ${current > step.num ? "bg-[var(--accent)]" : "bg-gray-200"}`} />}
        </div>
      ))}
    </div>
  );
}

function TrustBadges() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 mt-6 text-xs text-[color:var(--muted)]">
      <div className="flex items-center gap-1.5">
        <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        Pago seguro
      </div>
      <div className="flex items-center gap-1.5">
        <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        Compra protegida
      </div>
      <div className="flex items-center gap-1.5">
        <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Envío a domicilio
      </div>
    </div>
  );
}

function QtyControl({ value, onMinus, onPlus, disabled }: { value: number; onMinus: () => void; onPlus: () => void; disabled?: boolean }) {
  return (
    <div className="inline-flex items-center rounded-lg border border-[var(--border)] overflow-hidden">
      <button
        type="button"
        onClick={onMinus}
        disabled={disabled || value <= 0}
        aria-label="Disminuir cantidad"
        className="flex h-9 w-9 items-center justify-center text-[color:var(--muted)] hover:bg-gray-100 disabled:opacity-30 transition-colors"
      >
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" />
        </svg>
      </button>
      <span className="flex h-9 min-w-[2.5rem] items-center justify-center border-x border-[var(--border)] text-sm font-medium bg-white">
        {value}
      </span>
      <button
        type="button"
        onClick={onPlus}
        disabled={disabled || value >= 99}
        aria-label="Aumentar cantidad"
        className="flex h-9 w-9 items-center justify-center text-[color:var(--muted)] hover:bg-gray-100 disabled:opacity-30 transition-colors"
      >
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  );
}

export default function CarritoPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[] | null>(null);
  const [storePromotions, setStorePromotions] = useState<StorePromotion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [step] = useState(1);
  const confirm = useConfirm();

  const store = items?.[0]?.product.store;
  const storeLat = store?.latitude;
  const storeLng = store?.longitude;
  const hasOnlinePayment = store?.hasOnlinePayment ?? store?.acceptsMercadoPago ?? false;
  const currency = items?.[0]?.product.currency ?? "MXN";

  const [fulfillmentType, setFulfillmentType] = useState<"PICKUP" | "DELIVERY">("PICKUP");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "ONLINE">("CASH");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerLat, setCustomerLat] = useState<number | null>(null);
  const [customerLng, setCustomerLng] = useState<number | null>(null);
  const [routeKm, setRouteKm] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [updatingQty, setUpdatingQty] = useState<Record<string, boolean>>({});
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ id: string; code: string; discountCents: number } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [couponStatus, setCouponStatus] = useState<"" | "active" | "inactive">("");
  const [deliverySettings, setDeliverySettings] = useState<DeliveryFeeConfig | null>(null);

  const getEffectivePrice = useCallback((item: CartItem): number => {
    const basePrice = item.variant?.priceCents ?? item.product.priceCents;
    for (const promo of storePromotions) {
      const pp = promo.products.find((p) => p.product.id === item.product.id);
      if (!pp) continue;
      if (promo.requiresCoupon && !appliedCoupon) continue;
      if (pp.promoPriceCents != null) return pp.promoPriceCents;
      if (promo.discountPercentage && promo.discountPercentage > 0) {
        return Math.round(basePrice * (1 - promo.discountPercentage / 100));
      }
    }
    if (item.product.isPromotion && item.product.promotionPriceCents != null) {
      if (!item.product.promotionEndDate || new Date(item.product.promotionEndDate) >= new Date()) {
        return item.product.promotionPriceCents;
      }
    }
    return basePrice;
  }, [storePromotions, appliedCoupon]);

  const subtotal = useMemo(
    () =>
      (items ?? []).reduce((sum, item) => {
        const price = getEffectivePrice(item);
        if (item.product.sellByWeight && item.weightGrams) {
          return sum + Math.round((item.weightGrams / 1000) * price) * item.quantity;
        }
        return sum + item.quantity * price;
      }, 0),
    [items, getEffectivePrice],
  );

  const deliveryFee = useMemo(() => {
    if (fulfillmentType !== "DELIVERY") return 0;
    const storeItem = items?.[0];
    const storeLat = storeItem?.product.store.latitude;
    const storeLng = storeItem?.product.store.longitude;
    if (storeLat && storeLng && customerLat && customerLng) {
      const dist = routeKm ?? haversineDistance(storeLat, storeLng, customerLat, customerLng);
      return calcDeliveryFeeCents(dist, deliverySettings ?? undefined);
    }
    return deliverySettings?.fallbackFeeCents ?? 2500;
  }, [fulfillmentType, items, customerLat, customerLng, deliverySettings, routeKm]);
  const couponDiscount = appliedCoupon?.discountCents ?? 0;
  const total = subtotal + deliveryFee - couponDiscount;

  async function refresh() {
    queueMicrotask(() => setLoading(true));
    setError(null);

    const [cartRes, profileRes, settingsRes] = await Promise.all([
      fetch("/api/cart/items"),
      fetch("/api/profile").catch(() => null),
      fetch("/api/delivery-settings").catch(() => null),
    ]);

    if (cartRes.status === 401) {
      router.push("/login?callbackUrl=/carrito");
      return;
    }

    const cartData = await cartRes.json().catch(() => null);
    if (!cartRes.ok || !cartData?.ok) {
      setError("No se pudo cargar tu carrito.");
      setLoading(false);
      return;
    }

    setItems(cartData.items);

    const storeId = cartData.items?.[0]?.product?.store?.id;
    if (storeId) {
      const promoRes = await fetch(`/api/promotions/store?storeId=${storeId}`);
      const promoData = await promoRes.json().catch(() => null);
      if (promoData?.ok) setStorePromotions(promoData.promotions || []);
    }

    if (profileRes?.ok) {
      const profileData = await profileRes.json();
      if (profileData.ok && profileData.user) {
        setCustomerName(profileData.user.name || "");
        setCustomerPhone(profileData.user.phone || "");
        const addr = [profileData.user.address, profileData.user.city, profileData.user.state, profileData.user.zipCode].filter(Boolean).join(", ");
        setCustomerAddress(addr);
        setCustomerLat(profileData.user.latitude);
        setCustomerLng(profileData.user.longitude);
      }
    }

    if (settingsRes?.ok) {
      const settingsData = await settingsRes.json();
      if (settingsData.ok && settingsData.settings) {
        const s = settingsData.settings;
        setDeliverySettings({
          baseFeeCents: s.baseFeeCents,
          extraFeePerSegmentCents: s.extraFeePerSegmentCents,
          baseDistanceKm: s.baseDistanceKm,
          segmentKm: s.segmentKm,
          fallbackFeeCents: s.fallbackFeeCents,
        });
      }
    }

    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      queueMicrotask(() => setLoading(true));
      const [cartRes, profileRes, settingsRes] = await Promise.all([
        fetch("/api/cart/items"),
        fetch("/api/profile").catch(() => null),
        fetch("/api/delivery-settings").catch(() => null),
      ]);
      if (cartRes.status === 401) { router.push("/login?callbackUrl=/carrito"); return; }
      const cartData = await cartRes.json().catch(() => null);
      if (!cartRes.ok || !cartData?.ok) { setError("No se pudo cargar tu carrito."); setLoading(false); return; }
      setItems(cartData.items);
      const storeId = cartData.items?.[0]?.product?.store?.id;
      if (storeId) {
        const promoRes = await fetch(`/api/promotions/store?storeId=${storeId}`);
        const promoData = await promoRes.json().catch(() => null);
        if (promoData?.ok) setStorePromotions(promoData.promotions || []);
      }
      if (profileRes?.ok) {
        const profileData = await profileRes.json();
        if (profileData.ok && profileData.user) {
          setCustomerName(profileData.user.name || "");
          setCustomerPhone(profileData.user.phone || "");
          const addr = [profileData.user.address, profileData.user.city, profileData.user.state, profileData.user.zipCode].filter(Boolean).join(", ");
          setCustomerAddress(addr);
          setCustomerLat(profileData.user.latitude);
          setCustomerLng(profileData.user.longitude);
        }
      }
      if (settingsRes?.ok) {
        const settingsData = await settingsRes.json();
        if (settingsData.ok && settingsData.settings) {
          const s = settingsData.settings;
          setDeliverySettings({
            baseFeeCents: s.baseFeeCents,
            extraFeePerSegmentCents: s.extraFeePerSegmentCents,
            baseDistanceKm: s.baseDistanceKm,
            segmentKm: s.segmentKm,
            fallbackFeeCents: s.fallbackFeeCents,
          });
        }
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (fulfillmentType !== "DELIVERY" || !storeLat || !storeLng || !customerLat || !customerLng) {
      setRouteKm(null);
      return;
    }
    let cancelled = false;
    const params = new URLSearchParams({
      storeLat: String(storeLat),
      storeLng: String(storeLng),
      customerLat: String(customerLat),
      customerLng: String(customerLng),
    });
    fetch(`/api/delivery/distance?${params.toString()}`)
      .then((r) => r.json().catch(() => null))
      .then((data) => {
        if (!cancelled && data?.ok && data.routeKm != null) setRouteKm(data.routeKm);
      })
      .catch(() => { if (!cancelled) setRouteKm(null); });
    return () => { cancelled = true; };
  }, [fulfillmentType, storeLat, storeLng, customerLat, customerLng]);

  const updateQuantity = async (item: CartItem, delta: number) => {
    const next = Math.max(0, Math.min(99, item.quantity + delta));
    if (next === item.quantity) return;
    const key = `${item.product.id}-${item.variantId || ""}`;
    setUpdatingQty((prev) => ({ ...prev, [key]: true }));
    await fetch("/api/cart/items", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId: item.product.id, quantity: next, variantId: item.variantId || undefined }),
    });
    await refresh();
    setUpdatingQty((prev) => ({ ...prev, [key]: false }));
  };

  const removeItem = async (item: CartItem) => {
    const key = `${item.product.id}-${item.variantId || ""}`;
    setUpdatingQty((prev) => ({ ...prev, [key]: true }));
    await fetch("/api/cart/items", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId: item.product.id, variantId: item.variantId || undefined }),
    });
    await refresh();
  };

  async function applyCoupon() {
    const code = couponInput.trim().toUpperCase();
    if (!code) { setCouponError("Ingresa un código."); return; }
    setCouponLoading(true);
    setCouponError("");
    setAppliedCoupon(null);
    setCouponStatus("");
    const res = await fetch("/api/checkout/coupon", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    setCouponLoading(false);
    if (!res.ok || !data.ok) {
      setCouponStatus("inactive");
      setCouponError(data.error || "Cupón inválido.");
      return;
    }
    setCouponStatus("active");
    setAppliedCoupon({ id: data.coupon.id, code: data.coupon.code, discountCents: data.coupon.discountCents });
    setCouponInput("");
    toast.success(`Cupón aplicado: ${data.coupon.code}`);
  }

  function removeCoupon() {
    setAppliedCoupon(null);
    setCouponError("");
    setCouponStatus("");
  }

  const handleClearCart = async () => {
    if (!(await confirm({ message: "¿Vaciar todo el carrito?", variant: "danger", confirmText: "Vaciar", title: "Vaciar carrito" }))) return;
    const itemsCopy = [...(items ?? [])];
    for (const item of itemsCopy) {
      await fetch("/api/cart/items", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId: item.product.id, variantId: item.variantId || undefined }),
      });
    }
    await refresh();
  };

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    setError(null);
    const body: Record<string, unknown> = {
      fulfillmentType,
      paymentMethod,
      customerName,
      customerPhone,
      customerAddress: customerAddress || undefined,
      customerLat: customerLat || undefined,
      customerLng: customerLng || undefined,
      notes: notes || undefined,
    };
    if (appliedCoupon) body.couponCode = appliedCoupon.code;
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    setCheckoutLoading(false);
    if (!res.ok || !data?.ok) {
      setError(data?.error ?? "No se pudo crear el pedido.");
      return;
    }
    if (data.error && paymentMethod === "ONLINE") {
      toast.error(data.error + ". Volvé al carrito para cambiar el método de pago.");
      router.push("/carrito");
      return;
    }
    if (data.paymentUrl) {
      window.location.href = data.paymentUrl;
    } else {
      router.push(`/pedido/${data.orderId}`);
    }
  };

  if (loading) return <PullToRefresh><main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10"><Skeleton /></main></PullToRefresh>;

  return (
    <PullToRefresh>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 fade-in">
      <StepIndicator current={step} />

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Carrito de compras</h1>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            {(items ?? []).length} producto{(items ?? []).length !== 1 ? "s" : ""}
            {store && (
              <> en <Link className="font-medium text-[var(--accent)] hover:underline" href={`/tienda/${store.slug}`}>{store.name}</Link></>
            )}
          </p>
        </div>
        {(items ?? []).length > 0 && (
          <button type="button" onClick={handleClearCart} className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-all hover:bg-red-50 hover:border-red-300">
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Vaciar carrito
          </button>
        )}
        <Link href="/tiendas" className="hidden sm:flex items-center gap-1.5 text-sm text-[var(--accent)] hover:underline">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Seguir comprando
        </Link>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 flex items-start gap-3">
          <svg className="h-5 w-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {(items ?? []).length === 0 ? <EmptyCart /> : (items ?? []).some((i) => i.product.isUnavailable) ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-5">
          <div className="flex items-start gap-3">
            <svg className="h-6 w-6 shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <h3 className="font-semibold text-red-800">Productos agotados</h3>
              <p className="mt-1 text-sm text-red-600">Algunos productos ya no están disponibles. Retíralos para continuar.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-5">
          {/* Left: Items */}
          <div className="lg:col-span-3">
            <AnimatedList className="space-y-4">
            {(items ?? []).map((item) => {
              const basePrice = item.variant?.priceCents ?? item.product.priceCents;
              const effectivePrice = getEffectivePrice(item);
              const hasPromo = effectivePrice < basePrice;
              const lineTotal = item.product.sellByWeight && item.weightGrams
                ? Math.round((item.weightGrams / 1000) * effectivePrice) * item.quantity
                : item.quantity * effectivePrice;
              const cartKey = `${item.product.id}-${item.variantId || ""}`;
              const isUpdating = updatingQty[cartKey];

              return (
                <AnimatedListItem key={cartKey} className={`group relative rounded-xl border card-hover ${item.product.isUnavailable ? "border-red-200 bg-red-50/50" : "border-[var(--border)] bg-white"}`}>
                  <div className="flex items-start gap-4 p-4 sm:p-5">
                    {/* Product image placeholder */}
                    <div className="hidden sm:flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)]">
                      <svg className="h-7 w-7 text-[var(--accent)]/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-sm">{item.product.name}</h3>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[color:var(--muted)]">
                            {item.variant && <span className="px-1.5 py-0.5 rounded bg-gray-100">{item.variant.name}</span>}
                            {item.weightGrams && <span>{item.weightGrams}g</span>}
                            {item.product.sellByWeight
                              ? <span>{formatMoney(effectivePrice, item.product.currency)} / kg</span>
                              : <span className="flex items-center gap-1.5">
                                  <span className={hasPromo ? "font-bold text-[var(--accent)]" : ""}>{formatMoney(effectivePrice, item.product.currency)}</span>
                                  {hasPromo && <span className="text-[color:var(--muted)] line-through text-[10px]">{formatMoney(basePrice, item.product.currency)}</span>}
                                </span>
                            }
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-semibold text-sm">{formatMoney(lineTotal, item.product.currency)}</div>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        <QtyControl
                          value={item.quantity}
                          onMinus={() => updateQuantity(item, -1)}
                          onPlus={() => updateQuantity(item, 1)}
                          disabled={isUpdating || item.product.isUnavailable}
                        />
                        <button
                          type="button"
                          onClick={() => removeItem(item)}
                          className="flex items-center gap-1 text-xs text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-700"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                  {item.product.isUnavailable && (
                    <div className="absolute top-3 right-3 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                      Agotado
                    </div>
                  )}
                </AnimatedListItem>
              );
            })}

            <div className="flex items-center justify-center pt-2">
              <Link href="/tiendas" className="inline-flex items-center gap-1.5 text-sm text-[var(--accent)] hover:underline sm:hidden">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Seguir comprando
              </Link>
            </div>
            </AnimatedList>
          </div>

          {/* Right: Summary + Checkout */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div variants={fadeSlideUp} initial="initial" animate="animate" className="rounded-xl border border-[var(--border)] bg-white p-5 lg:sticky lg:top-24">
              <h2 className="font-semibold text-sm">Resumen del pedido</h2>

              <div className="mt-4 space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-[color:var(--muted)]">Subtotal</span>
                  <span>{formatMoney(subtotal, currency)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[color:var(--muted)]">Envío</span>
                  <span className={deliveryFee > 0 ? "font-medium" : "text-green-600 font-medium"}>
                    {deliveryFee > 0 ? formatMoney(deliveryFee, currency) : "No aplica"}
                  </span>
                </div>

                {/* Coupon */}
                {appliedCoupon ? (
                  <div className="rounded-lg bg-green-50 px-3 py-2 text-sm space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex h-2 w-2 rounded-full bg-green-500" />
                        <span className="text-green-700 font-medium">Activo</span>
                        <span className="text-green-600 font-mono">({appliedCoupon.code})</span>
                      </div>
                      <button type="button" onClick={removeCoupon} className="text-red-500 hover:text-red-700">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="text-green-700 font-semibold">-{formatMoney(couponDiscount, currency)}</div>
                  </div>
                ) : (
                  <div>
                    <div className="flex gap-2">
                      <input
                        value={couponInput}
                        onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponStatus(""); }}
                        placeholder="Cupón"
                        className="flex-1 rounded-lg border border-[var(--border)] px-3 py-2 text-sm uppercase"
                        onKeyDown={(e) => { if (e.key === "Enter") applyCoupon(); }}
                      />
                      <button
                        type="button"
                        onClick={applyCoupon}
                        disabled={couponLoading || !couponInput.trim()}
                        className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
                      >
                        {couponLoading ? (
                          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        ) : "Aplicar"}
                      </button>
                    </div>
                    {couponError && (
                      <div className="mt-1.5 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
                        <div className="flex items-center gap-1.5 text-xs text-red-700">
                          <span className={`inline-flex h-2 w-2 rounded-full ${couponStatus === "inactive" ? "bg-red-500" : "bg-gray-400"}`} />
                          <span className="font-medium">{couponStatus === "inactive" ? "Inactivo" : "Error"}</span>
                          <span>— {couponError}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <hr className="border-[var(--border)]" />
                <div className="flex justify-between text-base font-bold">
                  <span>Total</span>
                  <span className="text-lg">{formatMoney(total, currency)}</span>
                </div>
                {couponDiscount > 0 && (
                  <div className="text-xs text-green-600 text-right">
                    Ahorras {formatMoney(couponDiscount, currency)}
                  </div>
                )}
              </div>

              {/* Fulfillment type selector */}
              <div className="mt-5">
                <label className="text-xs font-semibold text-[color:var(--muted)] uppercase tracking-wide">Tipo de entrega</label>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFulfillmentType("PICKUP")}
                    className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                      fulfillmentType === "PICKUP"
                        ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                        : "border-[var(--border)] hover:border-gray-300"
                    }`}
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Recoger en tienda
                  </button>
                  <button
                    type="button"
                    onClick={() => setFulfillmentType("DELIVERY")}
                    disabled={store?.plan === "FREE"}
                    className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                      fulfillmentType === "DELIVERY"
                        ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                        : store?.plan === "FREE"
                        ? "border-[var(--border)] opacity-50 cursor-not-allowed"
                        : "border-[var(--border)] hover:border-gray-300"
                    }`}
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2-1m6 0l2 1m-2-1v-4a1 1 0 011-1h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 01.293.707V16l-2 1m-6-3h4m-8 3h8" />
                    </svg>
                    Envío
                    {store?.plan === "FREE" && (
                      <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold">Vende+</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Payment method */}
              {hasOnlinePayment && (
                <div className="mt-4">
                  <label className="text-xs font-semibold text-[color:var(--muted)] uppercase tracking-wide">Método de pago</label>
                  <div className="mt-1.5 space-y-2">
                    <label className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-all ${
                      paymentMethod === "CASH" ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border)] hover:border-gray-300"
                    }`}>
                      <input type="radio" name="paymentMethod" value="CASH" checked={paymentMethod === "CASH"} onChange={() => setPaymentMethod("CASH")} className="h-4 w-4 accent-[var(--accent)]" />
                      <div className="flex-1">
                        <div className="text-sm font-medium">Efectivo</div>
                        <div className="text-xs text-[color:var(--muted)]">Paga al recibir</div>
                      </div>
                      <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </label>
                    <label className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-all ${
                      paymentMethod === "ONLINE" ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border)] hover:border-gray-300"
                    }`}>
                      <input type="radio" name="paymentMethod" value="ONLINE" checked={paymentMethod === "ONLINE"} onChange={() => setPaymentMethod("ONLINE")} className="h-4 w-4 accent-[var(--accent)]" />
                      <div className="flex-1">
                        <div className="text-sm font-medium">Tarjeta de crédito/débito</div>
                        <div className="text-xs text-[color:var(--muted)]">Pago seguro en línea</div>
                      </div>
                      <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </label>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Checkout form */}
            <div className="rounded-xl border border-[var(--border)] bg-white p-5">
              <h2 className="font-semibold text-sm">Tus datos</h2>

              <div className="mt-4 space-y-3.5">
                <div>
                  <label className="text-xs font-medium text-[color:var(--muted)]">Nombre completo</label>
                  <div className="mt-1 flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 focus-within:border-[var(--accent)] focus-within:ring-1 focus-within:ring-[var(--accent)]/20 transition-all">
                    <svg className="h-4 w-4 shrink-0 text-[color:var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="flex-1 bg-transparent text-sm outline-none" placeholder="Tu nombre" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-[color:var(--muted)]">Teléfono</label>
                  <div className="mt-1 flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 focus-within:border-[var(--accent)] focus-within:ring-1 focus-within:ring-[var(--accent)]/20 transition-all">
                    <svg className="h-4 w-4 shrink-0 text-[color:var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="flex-1 bg-transparent text-sm outline-none" placeholder="722..." />
                  </div>
                </div>

                {fulfillmentType === "DELIVERY" && (
                  <>
                    <div>
                      <label className="text-xs font-medium text-[color:var(--muted)]">Dirección de entrega</label>
                      <div className="mt-1 flex items-start gap-2 rounded-lg border border-[var(--border)] px-3 py-2 focus-within:border-[var(--accent)] focus-within:ring-1 focus-within:ring-[var(--accent)]/20 transition-all">
                        <svg className="h-4 w-4 shrink-0 mt-1 text-[color:var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <textarea value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} rows={2} className="flex-1 bg-transparent text-sm outline-none resize-none" placeholder="Calle, número, colonia, código postal..." />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-[color:var(--muted)]">Ubica tu dirección en el mapa</label>
                      <div className="mt-1.5">
                        <LocationPicker
                          latitude={customerLat}
                          longitude={customerLng}
                          onLocationChange={(lat, lng) => { setCustomerLat(lat); setCustomerLng(lng); }}
                        />
                        {customerLat && customerLng && (
                          <p className="mt-1.5 flex items-center gap-1 text-xs text-green-600 font-medium">
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                            Punto de entrega marcado en el mapa
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="text-xs font-medium text-[color:var(--muted)]">Notas (opcional)</label>
                  <div className="mt-1 flex items-start gap-2 rounded-lg border border-[var(--border)] px-3 py-2 focus-within:border-[var(--accent)] focus-within:ring-1 focus-within:ring-[var(--accent)]/20 transition-all">
                    <svg className="h-4 w-4 shrink-0 mt-1 text-[color:var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                    </svg>
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="flex-1 bg-transparent text-sm outline-none resize-none" placeholder="Instrucciones para la entrega, referencia..." />
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={checkoutLoading || !customerName || !customerPhone}
                onClick={handleCheckout}
                className="mt-5 w-full rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[var(--accent)]/20 transition-all hover:bg-[var(--accent-hover)] hover:shadow-xl hover:shadow-[var(--accent)]/30 disabled:opacity-50 disabled:shadow-none"
              >
                {checkoutLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creando pedido...
                  </span>
                ) : `Confirmar pedido · ${formatMoney(total, currency)}`}
              </button>

              <p className="mt-3 text-center text-xs text-[color:var(--muted)]">
                {hasOnlinePayment
                  ? "🔒 Pago procesado de forma segura. Tus datos están protegidos."
                  : "💰 Pagas al recibir tu pedido."
              }</p>
            </div>

            <TrustBadges />
          </div>
        </div>
      )}
    </main>
    </PullToRefresh>
  );
}
