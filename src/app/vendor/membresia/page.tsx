"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { formatMoney } from "@/lib/format";
import {
  SOLO_DELIVERY_PRICE_CENTS,
  VENDE_PLUS_FULL_PRICE_CENTS,
  VENDE_PLUS_DISCOUNTED_PRICE_CENTS,
  GRACE_DATE,
  membershipPlanLabel,
} from "@/lib/membership";

interface SubscriptionInfo {
  status: string;
  startDate: string;
  endDate: string;
  discountEndDate: string | null;
  createdAt: string;
}

interface CouponData {
  code: string;
  description: string | null;
  discountType: string;
  discountValue: number;
  plan?: string;
  finalPrice: number;
  savings: number;
}

const SOLO_DELIVERY_KEY = "SOLO_DELIVERY";
const MEMBER_KEY = "MEMBER";

export default function VendorMembresiaPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [store, setStore] = useState<{ name: string; createdAt: string; plan: string } | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponData, setCouponData] = useState<CouponData | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");

  useEffect(() => {
    if (searchParams.get("success")) {
      setSuccess("¡Pago recibido! Tu membresía está activa.");
    } else if (searchParams.get("error")) {
      setError("El pago fue cancelado o no se pudo completar.");
    } else if (searchParams.get("pending")) {
      setSuccess("Pago pendiente. Se actualizará automáticamente.");
    }
  }, [searchParams]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/vendor/store");
      const data = await res.json();
      if (data.ok && data.store) {
        setStore(data.store);
        if (data.store.subscription) {
          setSubscription(data.store.subscription);
        }
      } else {
        setError("No tienes una tienda registrada.");
      }
    } catch {
      setError("Error al cargar datos.");
    }
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  async function validateCoupon() {
    if (!couponCode.trim() || !selectedPlan) return;
    setCouponLoading(true);
    setCouponError("");
    setCouponData(null);
    try {
      const res = await fetch("/api/vendor/membership-coupon", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: couponCode.trim(), plan: selectedPlan }),
      });
      const data = await res.json();
      if (data.ok) {
        setCouponData({
          code: data.coupon?.code ?? couponCode.trim(),
          description: data.coupon?.description ?? null,
          discountType: data.coupon?.discountType,
          discountValue: data.coupon?.discountValue,
          plan: data.coupon?.plan,
          finalPrice: data.finalPrice,
          savings: data.savings,
        });
      } else {
        setCouponError(data.error || "Cupón inválido.");
      }
    } catch {
      setCouponError("Error al validar cupón.");
    }
    setCouponLoading(false);
  }

  async function handlePay() {
    if (!selectedPlan) return;
    setPaying(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { plan: selectedPlan };
      if (couponData) body.couponCode = couponData.code;
      const res = await fetch("/api/vendor/pay-subscription", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.ok && data.initPoint) {
        window.location.href = data.initPoint;
      } else {
        setError(data.error || "Error al iniciar pago.");
      }
    } catch {
      setError("Error de conexión.");
    }
    setPaying(false);
  }

  function selectPlan(plan: string | null) {
    setSelectedPlan(plan);
    setCouponCode("");
    setCouponData(null);
    setCouponError("");
  }

  const now = new Date();
  const storeCreated = store ? new Date(store.createdAt) : null;
  const hasGrace = storeCreated && storeCreated < GRACE_DATE;
  const inGrace = hasGrace && now < GRACE_DATE;
  const isSubActive = subscription && (subscription.status === "ACTIVE" || subscription.status === "TRIAL") && new Date(subscription.endDate) > now;
  const currentPlan = store?.plan ?? "FREE";
  const currentPlanLabel = isSubActive ? membershipPlanLabel(currentPlan) : null;
  const isDiscounted = subscription?.discountEndDate ? now < new Date(subscription.discountEndDate) : false;
  const vendephusPrice = isDiscounted ? VENDE_PLUS_DISCOUNTED_PRICE_CENTS : VENDE_PLUS_FULL_PRICE_CENTS;

  const selectedIsCurrent = selectedPlan === currentPlan && !!isSubActive;
  const selectedLabel = selectedPlan ? membershipPlanLabel(selectedPlan) : null;
  const selectedBasePrice = selectedPlan === SOLO_DELIVERY_KEY
    ? SOLO_DELIVERY_PRICE_CENTS
    : selectedPlan === MEMBER_KEY
      ? vendephusPrice
      : null;

  const plans = [
    {
      key: "FREE",
      label: "Vende",
      badge: "Gratis",
      tagline: "Para empezar a vender",
      price: "Gratis",
      accent: "text-[var(--accent)]",
      cardBorder: "border-[var(--border)]",
      highlight: currentPlan === "FREE" && !isSubActive,
      features: [
        "Tienda online con nombre personalizado",
        "Catálogo de productos ilimitado",
        "Pedidos en tienda (recoger)",
        "Pagos en efectivo",
      ],
    },
    {
      key: SOLO_DELIVERY_KEY,
      label: "Solo Delivery",
      badge: formatMoney(SOLO_DELIVERY_PRICE_CENTS, "MXN"),
      tagline: "Todas las funciones con envío a domicilio",
      price: formatMoney(SOLO_DELIVERY_PRICE_CENTS, "MXN"),
      accent: "text-sky-600",
      cardBorder: "border-sky-400",
      highlight: currentPlan === SOLO_DELIVERY_KEY && !!isSubActive,
      features: [
        "Envío a domicilio con repartidores locales",
        "Catálogo de productos ilimitado",
        "Promociones y notificaciones push",
        "Pagos en línea con MercadoPago",
      ],
    },
    {
      key: MEMBER_KEY,
      label: "Vende+",
      badge: formatMoney(vendephusPrice, "MXN"),
      tagline: isDiscounted ? "40% off los primeros 12 meses" : "El plan completo",
      price: formatMoney(vendephusPrice, "MXN"),
      accent: "text-amber-600",
      cardBorder: "border-amber-400",
      highlight: currentPlan === MEMBER_KEY && !!isSubActive,
      features: [
        "Envío a domicilio con repartidores locales",
        "Promociones multi-producto y cupones de descuento",
        "Pagos en línea con MercadoPago",
        "Notificaciones push a tus clientes",
      ],
    },
  ];

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight mb-2">Mi Membresía</h1>
      <p className="text-sm text-[color:var(--muted)] mb-8">Compara los 3 planes y elige el ideal para tu negocio</p>

      {success && (
        <div className="mb-4 rounded-xl border border-green-500/30 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>
      )}
      {error && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-8 text-sm text-[color:var(--muted)]">Cargando...</div>
      ) : !store ? (
        <div className="rounded-xl border border-[var(--border)] p-8 text-center text-sm text-[color:var(--muted)]">
          No tienes una tienda registrada.
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {plans.map((plan) => {
              const isCurrent = plan.highlight;
              return (
                <div
                  key={plan.key}
                  className={`relative rounded-2xl border-2 p-6 flex flex-col transition-all ${
                    isCurrent ? `${plan.cardBorder} shadow-lg` : "border-[var(--border)]"
                  }`}
                >
                  {isCurrent && (
                    <div className={`absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-xs font-bold text-white ${
                      plan.key === SOLO_DELIVERY_KEY ? "bg-sky-500" : plan.key === MEMBER_KEY ? "bg-amber-500" : "bg-[var(--accent)]"
                    }`}>
                      Plan actual
                    </div>
                  )}
                  <div className="text-center mb-4">
                    <div className={`text-lg font-bold ${plan.accent}`}>{plan.label}</div>
                    <div className="text-2xl sm:text-3xl font-extrabold mt-1">
                      {plan.price}
                      {plan.key !== "FREE" && <span className="text-sm font-normal text-[color:var(--muted)]">/mes</span>}
                    </div>
                    <div className="text-xs text-[color:var(--muted)] mt-1">{plan.tagline}</div>
                  </div>
                  <ul className="space-y-3 text-sm flex-1">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <svg className={`h-4 w-4 mt-0.5 shrink-0 ${
                          plan.key === SOLO_DELIVERY_KEY ? "text-sky-500" : plan.key === MEMBER_KEY ? "text-amber-500" : "text-green-500"
                        }`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-5">
                    {isCurrent ? (
                      <div className="rounded-lg bg-green-50 px-3 py-2 text-center text-sm font-medium text-green-700">
                        ✓ Plan activo
                      </div>
                    ) : plan.key === "FREE" ? (
                      <div className="rounded-lg bg-[var(--accent-soft)] px-3 py-2 text-center text-sm font-medium text-[var(--accent)]">
                        Gratis por defecto
                      </div>
                    ) : (
                      <button
                        onClick={() => selectPlan(selectedPlan === plan.key ? null : plan.key)}
                        className="w-full rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-gray-50"
                      >
                        {selectedPlan === plan.key ? "Cancelar" : "Elegir este plan"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {selectedPlan && !selectedIsCurrent && (
            <div className="rounded-xl border-2 border-[var(--accent)] p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold">{selectedLabel}</div>
                  <div className="text-sm text-[color:var(--muted)]">
                    {formatMoney(selectedBasePrice!, "MXN")}/mes
                    {selectedPlan === MEMBER_KEY && isDiscounted && " (40% off)"}
                  </div>
                </div>
                <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-medium text-[var(--accent)]">
                  Tu selección
                </span>
              </div>

              <div className="mt-4 space-y-3">
                <div className="rounded-lg border border-[var(--border)] p-3">
                  <label className="text-xs font-medium text-[color:var(--muted)]">¿Tienes un cupón de descuento para {selectedLabel}?</label>
                  <div className="mt-1.5 flex gap-2">
                    <input
                      value={couponCode}
                      onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponData(null); setCouponError(""); }}
                      placeholder="CÓDIGO"
                      className="flex-1 rounded-lg border border-[var(--border)] px-3 py-2 text-sm uppercase font-mono"
                      disabled={couponLoading}
                    />
                    <button
                      type="button"
                      onClick={validateCoupon}
                      disabled={couponLoading || !couponCode.trim()}
                      className="shrink-0 rounded-lg border border-[var(--accent)] px-3 py-2 text-sm font-medium text-[var(--accent)] hover:bg-[var(--accent-soft)] disabled:opacity-50"
                    >
                      {couponLoading ? "..." : "Aplicar"}
                    </button>
                  </div>
                  {couponData && (
                    <div className="mt-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm">
                      <div className="flex items-center gap-2 text-green-700 font-medium">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        Cupón "{couponData.code}" aplicado
                      </div>
                      <div className="mt-1 text-green-600">
                        Ahorras {formatMoney(couponData.savings, "MXN")} — Total: {formatMoney(couponData.finalPrice, "MXN")}/mes
                      </div>
                      <button type="button" onClick={() => { setCouponData(null); setCouponCode(""); }} className="mt-1 text-xs text-red-500 hover:underline">
                        Quitar cupón
                      </button>
                    </div>
                  )}
                  {couponError && (
                    <div className="mt-2 text-xs text-red-600">{couponError}</div>
                  )}
                </div>

                <button
                  onClick={handlePay}
                  disabled={paying || !!inGrace}
                  className="w-full rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-bold text-white hover:bg-[var(--accent-hover)] disabled:opacity-60 transition-all"
                >
                  {inGrace
                    ? "En periodo de gracia"
                    : paying
                      ? "Conectando..."
                      : couponData
                        ? `Pagar ${formatMoney(couponData.finalPrice, "MXN")}/mes`
                        : `Activar ${selectedLabel} ${formatMoney(selectedBasePrice!, "MXN")}/mes`}
                </button>
              </div>
            </div>
          )}

          {selectedIsCurrent && (
            <div className="rounded-xl border border-green-300 bg-green-50 p-5 text-sm text-green-800 text-center">
              Ya tienes el plan {currentPlanLabel} activo.
            </div>
          )}

          {inGrace && (
            <div className="rounded-xl border-2 border-amber-400 bg-amber-50 p-5 text-center">
              <div className="text-lg font-bold text-amber-800">Periodo de gracia</div>
              <p className="mt-1 text-sm text-amber-700">
                Como agradecimiento por acompañarnos durante la fase de prueba, tu membresía es <strong>gratuita hasta agosto de 2026</strong>. No necesitas realizar ningún pago por ahora.
              </p>
            </div>
          )}

          {subscription && isSubActive && (
            <div className="rounded-xl border border-[var(--border)] p-5 text-xs text-[color:var(--muted)] space-y-1">
              <div>Plan: <span className="font-medium">{currentPlanLabel}</span></div>
              <div>Estado: <span className="font-medium">Activa</span></div>
              <div>Vigente hasta: {new Date(subscription.endDate).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}</div>
              {isDiscounted && subscription.discountEndDate && (
                <div>Descuento 40% vigente hasta: {new Date(subscription.discountEndDate).toLocaleDateString("es-MX")}</div>
              )}
            </div>
          )}
        </div>
      )}
    </main>
  );
}