"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useCallback } from "react";
import { toast } from "sonner";
import dynamic from "next/dynamic";

import {
  Button,
  Input,
  Card,
  CardContent,
  Badge,
  Skeleton,
  SkeletonCard,
  EmptyState,
  Stepper,
  AddressCard,
  AddressList,
  PaymentMethodCard,
  PaymentMethodList,
  formatMoney,
  Toaster,
} from "@/components/ui/design-system";
import { calcDeliveryFeeCents, haversineDistance, type DeliveryFeeConfig } from "@/lib/geo";

const LocationPicker = dynamic(
  () => import("@/components/maps/LocationPicker"),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full rounded-xl" /> }
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
    imageUrl: string | null;
    sellByWeight: boolean;
    isUnavailable: boolean;
    isPromotion: boolean;
    promotionPriceCents: number | null;
    promotionEndDate: string | null;
    store: { 
      id: string; 
      name: string; 
      slug: string; 
      acceptsMercadoPago: boolean; 
      hasOnlinePayment: boolean; 
      hasTransferencia: boolean; 
      transferBankName: string | null; 
      transferAccountHolder: string | null; 
      transferClabe: string | null; 
      latitude: number | null; 
      longitude: number | null; 
      plan: string;
    };
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

type Address = {
  id: string;
  label: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  latitude?: number;
  longitude?: number;
  isDefault?: boolean;
  instructions?: string;
};

type PaymentMethod = {
  id: string;
  type: "cash" | "card" | "transfer" | "wallet";
  label: string;
  description?: string;
  isConfigured?: boolean;
  isDefault?: boolean;
  details?: {
    last4?: string;
    brand?: string;
    expiry?: string;
    bankName?: string;
    accountHolder?: string;
    clabe?: string;
  };
};

const initialAddresses: Address[] = [];

export default function CarritoPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[] | null>(null);
  const [storePromotions, setStorePromotions] = useState<StorePromotion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  
  // Addresses
  const [addresses, setAddresses] = useState<Address[]>(initialAddresses);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  
  // Payment methods
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);

  const store = items?.[0]?.product.store;
  const storeLat = store?.latitude;
  const storeLng = store?.longitude;
  const hasOnlinePayment = store?.hasOnlinePayment ?? store?.acceptsMercadoPago ?? false;
  const hasTransferencia = store?.hasTransferencia ?? false;
  const currency = items?.[0]?.product.currency ?? "MXN";
  const storePlan = store?.plan ?? "FREE";

  const [fulfillmentType, setFulfillmentType] = useState<"PICKUP" | "DELIVERY">("PICKUP");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "ONLINE" | "TRANSFERENCIA">("CASH");
  const [paymentEvidenceUrl, setPaymentEvidenceUrl] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [evidenceUploading, setEvidenceUploading] = useState(false);
  const [evidenceError, setEvidenceError] = useState("");
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

  const steps = [
    { label: "Carrito", href: undefined },
    { label: "Entrega", href: undefined },
    { label: "Pago", href: undefined },
  ];

  async function refresh() {
    setLoading(true);
    setError(null);

    try {
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
          
          // Load saved addresses
          if (profileData.user.addresses) {
            setAddresses(profileData.user.addresses);
            const defaultAddr = profileData.user.addresses.find((a: Address) => a.isDefault);
            if (defaultAddr) setSelectedAddressId(defaultAddr.id);
          }
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
    } catch (e) {
      setError("Error al cargar el carrito.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
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

  const handleCheckout = async () => {
    // Validate step 2 (delivery)
    if (currentStep >= 2) {
      if (fulfillmentType === "DELIVERY") {
        if (!customerAddress.trim()) { setError("Ingresa una dirección de entrega."); return; }
        if (!customerLat || !customerLng) { setError("Selecciona tu ubicación en el mapa."); return; }
      }
      if (!customerName.trim()) { setError("Ingresa tu nombre."); return; }
      if (!customerPhone.trim()) { setError("Ingresa tu teléfono."); return; }
    }

    // Validate step 3 (payment)
    if (currentStep >= 3) {
      if (paymentMethod === "TRANSFERENCIA" && !paymentEvidenceUrl) {
        setError("Sube la captura de tu transferencia para continuar.");
        return;
      }
    }

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
    if (paymentMethod === "TRANSFERENCIA") {
      body.paymentEvidenceUrl = paymentEvidenceUrl || undefined;
      body.paymentReference = paymentReference || undefined;
    }
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

  const handleAddressSelect = (address: Address) => {
    setSelectedAddressId(address.id);
    setCustomerAddress([address.street, address.city, address.state, address.zipCode].filter(Boolean).join(", "));
    setCustomerLat(address.latitude ?? null);
    setCustomerLng(address.longitude ?? null);
  };

  const handleAddAddress = () => {
    setEditingAddress(null);
    setShowAddressModal(true);
  };

  const handleEditAddress = (address: Address) => {
    setEditingAddress(address);
    setShowAddressModal(true);
  };

  const handleSaveAddress = (addressData: Omit<Address, "id"> & { id?: string }) => {
    if (editingAddress) {
      // Update existing
      setAddresses(prev => prev.map(a => a.id === editingAddress.id ? { ...a, ...addressData } : a));
    } else {
      // Add new
      const newAddress: Address = {
        id: `addr_${Date.now()}`,
        ...addressData,
      };
      setAddresses(prev => [...prev, newAddress]);
      setSelectedAddressId(newAddress.id);
    }
    handleAddressSelect({ ...editingAddress, ...addressData } as Address);
    setShowAddressModal(false);
    setEditingAddress(null);
  };

  const handleDeleteAddress = (id: string) => {
    setAddresses(prev => prev.filter(a => a.id !== id));
    if (selectedAddressId === id) setSelectedAddressId(null);
  };

  const handlePaymentSelect = (method: PaymentMethod) => {
    setSelectedPaymentId(method.id);
    if (method.type === "cash") setPaymentMethod("CASH");
    else if (method.type === "card") setPaymentMethod("ONLINE");
    else if (method.type === "transfer") setPaymentMethod("TRANSFERENCIA");
  };

  const handleClearCart = async () => {
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

  if (loading) return <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10"><SkeletonCard showImage={false} showTitle={true} showDescription={true} showFooter={true} /></main>;

  const hasUnavailable = (items ?? []).some((i) => i.product.isUnavailable);

  return (
    <>
      <Toaster />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-24">
        {/* Stepper */}
        <Stepper steps={steps} current={currentStep - 1} variant="default" showNumbers={true} className="mb-6" />

        {/* Header */}
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
          <div className="flex items-center gap-2">
            {(items ?? []).length > 0 && (
              <Button variant="outline" size="sm" onClick={handleClearCart} leftIcon={
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              }>
                Vaciar
              </Button>
            )}
            <Link href="/tiendas" className="hidden sm:flex items-center gap-1.5 text-sm text-[var(--accent)] hover:underline">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Seguir comprando
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 flex items-start gap-3">
            <svg className="h-5 w-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>{error}</span>
          </div>
        )}

        {(items ?? []).length === 0 ? (
          <EmptyState
            illustration="cart"
            title="Tu carrito está vacío"
            description="Agrega productos de tus tiendas favoritas y recíbelos en la comodidad de tu hogar."
            action={{ label: "Explorar tiendas", href: "/tiendas", variant: "primary" }}
          />
        ) : hasUnavailable ? (
          <Card variant="outlined" className="mb-6 border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <svg className="h-6 w-6 shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                <div>
                  <h3 className="font-semibold text-red-800">Productos agotados</h3>
                  <p className="mt-1 text-sm text-red-600">Algunos productos ya no están disponibles. Retíralos para continuar.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-5">
            {/* Left: Items */}
            <div className="lg:col-span-3 space-y-4">
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
                  <Card variant="default" hover={false} className={`${item.product.isUnavailable ? "border-red-200 bg-red-50/50" : ""}`}>
                    <CardContent className="p-4 gap-4">
                      <div className="flex items-start gap-4">
                        <div className="relative h-16 w-16 shrink-0 rounded-xl bg-[var(--accent-soft)] flex items-center justify-center overflow-hidden">
                          {item.product.imageUrl ? (
                            <img src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-cover" />
                          ) : (
                            <svg className="h-7 w-7 text-[var(--accent)]/60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                          )}
                          {item.product.isUnavailable && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-semibold text-white">Agotado</span>
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="font-semibold text-sm">{item.product.name}</h3>
                              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[color:var(--muted)]">
                                {item.variant && <Badge variant="neutral" size="sm">{item.variant.name}</Badge>}
                                {item.weightGrams && <Badge variant="neutral" size="sm">{item.weightGrams}g</Badge>}
                                {item.product.sellByWeight ? (
                                  <span>{formatMoney(effectivePrice, item.product.currency)} / kg</span>
                                ) : (
                                  <span className="flex items-center gap-1.5">
                                    <span className={hasPromo ? "font-bold text-[var(--accent)]" : ""}>{formatMoney(effectivePrice, item.product.currency)}</span>
                                    {hasPromo && <span className="text-[color:var(--muted)] line-through text-[10px]">{formatMoney(basePrice, item.product.currency)}</span>}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="font-semibold text-sm">{formatMoney(lineTotal, item.product.currency)}</div>
                            </div>
                          </div>

                          <div className="mt-3 flex items-center justify-between">
                            <div className="inline-flex items-center rounded-lg border border-[var(--border)] overflow-hidden">
                              <Button variant="ghost" size="sm" onClick={() => updateQuantity(item, -1)} disabled={isUpdating || item.quantity <= 1 || item.product.isUnavailable} aria-label="Disminuir">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" /></svg>
                              </Button>
                              <span className="flex h-9 min-w-[2.5rem] items-center justify-center border-x border-[var(--border)] text-sm font-medium bg-white">{item.quantity}</span>
                              <Button variant="ghost" size="sm" onClick={() => updateQuantity(item, 1)} disabled={isUpdating || item.quantity >= 99 || item.product.isUnavailable} aria-label="Aumentar">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                              </Button>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => removeItem(item)} className="text-red-500 hover:text-red-700" aria-label="Eliminar">
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Right: Summary + Steps */}
            <div className="lg:col-span-2 space-y-4">
              {/* Step 1: Cart Summary */}
              <Card variant="elevated" className="lg:sticky lg:top-20">
                <CardContent className="p-5 space-y-5">
                  <h2 className="font-semibold text-sm">Resumen del pedido</h2>

                  <div className="space-y-3 text-sm">
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
                    <div>
                      {appliedCoupon ? (
                        <div className="rounded-lg bg-green-50 px-3 py-2 text-sm space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex h-2 w-2 rounded-full bg-green-500" />
                              <span className="text-green-700 font-medium">Activo</span>
                              <span className="text-green-600 font-mono">({appliedCoupon.code})</span>
                            </div>
                            <Button variant="ghost" size="sm" onClick={removeCoupon} leftIcon={<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>} />
                          </div>
                          <div className="text-green-700 font-semibold">-{formatMoney(couponDiscount, currency)}</div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Input
                            value={couponInput}
                            onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponStatus(""); }}
                            placeholder="Código de cupón"
                            size="sm"
                            onKeyDown={(e) => { if (e.key === "Enter") applyCoupon(); }}
                          />
                          <Button size="sm" onClick={applyCoupon} disabled={couponLoading || !couponInput.trim()} loading={couponLoading}>
                            Aplicar
                          </Button>
                        </div>
                      )}
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

                    <hr className="border-[var(--border)]" />
                    <div className="flex justify-between text-base font-bold">
                      <span>Total</span>
                      <span className="text-lg">{formatMoney(total, currency)}</span>
                    </div>
                    {couponDiscount > 0 && (
                      <div className="text-xs text-green-600 text-right">Ahorras {formatMoney(couponDiscount, currency)}</div>
                    )}
                  </div>

                  {/* Step Navigation */}
                  <div className="pt-4 border-t border-[var(--border)]">
                    <div className="flex gap-2">
                      {currentStep > 1 && (
                        <Button variant="outline" onClick={() => setCurrentStep(currentStep - 1)} fullWidth>
                          ← Atrás
                        </Button>
                      )}
                      <Button 
                        variant="primary" 
                        size="lg" 
                        fullWidth 
                        loading={checkoutLoading}
                        onClick={handleCheckout}
                      >
                        {currentStep < 3 ? `Continuar al paso ${currentStep + 1}` : "Confirmar y pagar"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Step 2: Delivery Details */}
              {currentStep >= 2 && (
                <Card variant="elevated">
                  <CardContent className="p-5 space-y-5">
                    <div className="flex items-center justify-between">
                      <h2 className="font-semibold text-sm">Tipo de entrega</h2>
                      <Badge variant={fulfillmentType === "PICKUP" ? "success" : "info"} size="sm">
                        {fulfillmentType === "PICKUP" ? "Recoger en tienda" : "Envío a domicilio"}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={fulfillmentType === "PICKUP" ? "primary" : "outline"}
                        onClick={() => { setFulfillmentType("PICKUP"); setCurrentStep(3); }}
                        fullWidth
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        Recoger en tienda
                      </Button>
                      <Button
                        variant={fulfillmentType === "DELIVERY" ? "primary" : "outline"}
                        onClick={() => { setFulfillmentType("DELIVERY"); setCurrentStep(3); }}
                        fullWidth
                        disabled={storePlan === "FREE"}
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2-1m6 0l2 1m-2-1v-4a1 1 0 011-1h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 01.293.707V16l-2 1m-6-3h4m-8 3h8" /></svg>
                        Envío a domicilio
                        {storePlan === "FREE" && <Badge variant="warning" size="sm" className="ml-1">Vende+</Badge>}
                      </Button>
                    </div>

                    {fulfillmentType === "DELIVERY" && (
                      <div className="space-y-4 pt-4 border-t border-[var(--border)]">
                        <div>
                          <label className="block text-xs font-medium text-[color:var(--muted)]">Dirección de entrega</label>
                          <Input
                            value={customerAddress}
                            onChange={(e) => setCustomerAddress(e.target.value)}
                            placeholder="Calle, número, colonia, código postal..."
                            size="md"
                            required={true}
                          />
                        </div>

                        <AddressList
                          addresses={addresses}
                          selectedId={selectedAddressId}
                          onSelect={handleAddressSelect}
                          onAdd={handleAddAddress}
                          onEdit={handleEditAddress}
                          onDelete={handleDeleteAddress}
                          onSetDefault={(id) => {
                            setAddresses(prev => prev.map(a => ({ ...a, isDefault: a.id === id })));
                          }}
                        />

                        <div>
                          <label className="block text-xs font-medium text-[color:var(--muted)]">Ubica tu dirección en el mapa</label>
                          <LocationPicker
                            latitude={customerLat}
                            longitude={customerLng}
                            onLocationChange={(lat, lng) => { setCustomerLat(lat); setCustomerLng(lng); }}
                          />
                          {customerLat && customerLng && (
                            <p className="mt-1.5 flex items-center gap-1 text-xs text-green-600 font-medium">
                              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                              Punto de entrega marcado
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Step 3: Payment */}
              {currentStep >= 3 && (
                <Card variant="elevated">
                  <CardContent className="p-5 space-y-5">
                    <h2 className="font-semibold text-sm">Método de pago</h2>
                    
                    <div className="space-y-3">
                      <PaymentMethodCard
                        method={{
                          id: "cash",
                          type: "cash",
                          label: "Efectivo",
                          description: "Paga al recibir tu pedido",
                          isConfigured: true,
                          isDefault: paymentMethod === "CASH",
                        }}
                        isSelected={paymentMethod === "CASH"}
                        onSelect={() => { setPaymentMethod("CASH"); setSelectedPaymentId("cash"); }}
                        requiredConfig={false}
                      />
                      {hasOnlinePayment && (
                        <PaymentMethodCard
                          method={{
                            id: "card",
                            type: "card",
                            label: "Tarjeta de crédito/débito",
                            description: "Pago seguro en línea con MercadoPago",
                            isConfigured: true,
                            isDefault: paymentMethod === "ONLINE",
                          }}
                          isSelected={paymentMethod === "ONLINE"}
                          onSelect={() => { setPaymentMethod("ONLINE"); setSelectedPaymentId("card"); }}
                          requiredConfig={false}
                        />
                      )}
                      {hasTransferencia && (
                        <PaymentMethodCard
                          method={{
                            id: "transfer",
                            type: "transfer",
                            label: "Transferencia SPEI",
                            description: "Paga por transferencia y sube tu captura",
                            isConfigured: true,
                            isDefault: paymentMethod === "TRANSFERENCIA",
                            details: {
                              bankName: store?.transferBankName,
                              accountHolder: store?.transferAccountHolder,
                              clabe: store?.transferClabe,
                            },
                          }}
                          isSelected={paymentMethod === "TRANSFERENCIA"}
                          onSelect={() => { setPaymentMethod("TRANSFERENCIA"); setSelectedPaymentId("transfer"); }}
                          requiredConfig={false}
                        />
                      )}
                    </div>

                    {paymentMethod === "TRANSFERENCIA" && (
                      <Card variant="outlined" className="border-purple-200 bg-purple-50">
                        <CardContent className="p-4 space-y-3">
                          <div className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">Datos para transferir</div>
                          {store?.transferBankName && <div className="text-sm"><span className="font-medium">Banco:</span> {store.transferBankName}</div>}
                          {store?.transferAccountHolder && <div className="text-sm"><span className="font-medium">Titular:</span> {store.transferAccountHolder}</div>}
                          {store?.transferClabe && (
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm"><span className="font-medium">CLABE:</span> <span className="font-mono tracking-wider">{store.transferClabe.replace(/(.{4})/g, "$1 ")}</span></span>
                              <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard?.writeText(store.transferClabe ?? ""); toast.success("CLABE copiada"); }}>Copiar</Button>
                            </div>
                          )}

                          <div>
                            <label className="text-xs font-medium text-[color:var(--muted)]">Captura del comprobante</label>
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp,image/gif"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                setEvidenceUploading(true);
                                setEvidenceError("");
                                try {
                                  const fd = new FormData();
                                  fd.append("file", file);
                                  const res = await fetch("/api/upload", { method: "POST", body: fd });
                                  const data = await res.json();
                                  if (!res.ok || !data.ok) setEvidenceError(data.error || "Error al subir.");
                                  else setPaymentEvidenceUrl(data.url);
                                } catch { setEvidenceError("Error de red."); }
                                setEvidenceUploading(false);
                              }}
                              className="mt-1 block w-full text-sm"
                            />
                            {evidenceUploading && <div className="text-xs text-[color:var(--muted)]">Subiendo...</div>}
                            {evidenceError && <div className="text-xs text-red-600">{evidenceError}</div>}
                            {paymentEvidenceUrl && !evidenceUploading && (
                              <a href={paymentEvidenceUrl} target="_blank" rel="noreferrer" className="text-xs text-[var(--accent)] hover:underline">Ver captura ✓</a>
                            )}
                          </div>

                          <div>
                            <label className="text-xs font-medium text-[color:var(--muted)]">Referencia SPEI (opcional)</label>
                            <Input
                              value={paymentReference}
                              onChange={(e) => setPaymentReference(e.target.value.slice(0, 40))}
                              placeholder="Folio o referencia"
                              size="md"
                            />
                          </div>

                          <p className="text-xs text-[color:var(--muted)]">
                            Tu pedido se activará cuando el negocio verifique el pago. Total a transferir: <span className="font-semibold">{formatMoney(total, currency)}</span>
                          </p>
                        </CardContent>
                      </Card>
                    )}

                    {/* Customer Info */}
                    <div className="pt-4 border-t border-[var(--border)] space-y-4">
                      <h3 className="font-semibold text-sm">Tus datos</h3>
                      
                      <Input
                        label="Nombre completo"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Tu nombre"
                        required={true}
                        size="md"
                      />
                      
                      <Input
                        label="Teléfono"
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="722..."
                        required={true}
                        size="md"
                      />

                      <div>
                        <label className="block text-xs font-medium text-[color:var(--muted)]">Notas (opcional)</label>
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          rows={2}
                          className="mt-1 w-full rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 resize-none"
                          placeholder="Instrucciones de entrega, código de acceso, etc."
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Mobile Sticky Footer */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[var(--border)] p-4 shadow-xl z-50 safe-area-bottom">
          <div className="mx-auto max-w-6xl flex items-center justify-between gap-3">
            <div className="flex-1">
              <p className="text-xs text-[color:var(--muted)]">Total</p>
              <p className="text-2xl font-bold text-[var(--foreground)]">{formatMoney(total, currency)}</p>
            </div>
            <Button 
              variant="primary" 
              size="xl" 
              fullWidth 
              loading={checkoutLoading}
              onClick={handleCheckout}
            >
              {currentStep < 3 ? `Paso ${currentStep + 1}` : "Confirmar y pagar"}
            </Button>
          </div>
        </div>
      </main>
    </>
  );
}