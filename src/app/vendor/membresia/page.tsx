"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { formatMoney } from "@/lib/format";

const FULL_PRICE = 83000;
const DISCOUNTED_PRICE = 49800;
const GRACE_DATE = new Date("2026-08-01T00:00:00.000Z");

interface SubscriptionInfo {
  status: string;
  startDate: string;
  endDate: string;
  discountEndDate: string | null;
  contractSigned: boolean;
  createdAt: string;
}

export default function VendorMembresiaPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [store, setStore] = useState<{ name: string; createdAt: string; plan: string } | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponData, setCouponData] = useState<{ code: string; description: string | null; discountType: string; discountValue: number; finalPrice: number; savings: number } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");

  useEffect(() => {
    if (searchParams.get("success")) {
      setSuccess("¡Pago recibido! Tu membresía Vende+ está activa.");
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
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError("");
    setCouponData(null);
    try {
      const res = await fetch("/api/vendor/membership-coupon", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: couponCode.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        setCouponData(data.coupon ? {
          code: data.coupon.code,
          description: data.coupon.description,
          discountType: data.coupon.discountType,
          discountValue: data.coupon.discountValue,
          finalPrice: data.finalPrice,
          savings: data.savings,
        } : null);
      } else {
        setCouponError(data.error || "Cupón inválido.");
      }
    } catch {
      setCouponError("Error al validar cupón.");
    }
    setCouponLoading(false);
  }

  async function handlePay() {
    setPaying(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {};
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

  const now = new Date();
  const storeCreated = store ? new Date(store.createdAt) : null;
  const hasGrace = storeCreated && storeCreated < GRACE_DATE;
  const inGrace = hasGrace && now < GRACE_DATE;
  const isSubActive = subscription && (subscription.status === "ACTIVE" || subscription.status === "TRIAL") && new Date(subscription.endDate) > now;
  const isDiscounted = subscription?.discountEndDate ? now < new Date(subscription.discountEndDate) : false;
  const price = isDiscounted ? DISCOUNTED_PRICE : FULL_PRICE;
  const isFree = store?.plan === "FREE";

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight mb-2">Mi Membresía</h1>
      <p className="text-sm text-[color:var(--muted)] mb-8">Elige el plan ideal para tu negocio</p>

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
          {/* Pricing cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* FREE */}
            <div className={`relative rounded-2xl border-2 p-6 transition-all ${
              isFree && !isSubActive
                ? "border-[var(--accent)] shadow-lg shadow-[var(--accent)]/10"
                : "border-[var(--border)]"
            }`}>
              {isFree && !isSubActive && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--accent)] px-3 py-0.5 text-xs font-bold text-white">
                  Plan actual
                </div>
              )}
              <div className="text-center mb-4">
                <div className="text-lg font-bold">Vende</div>
                <div className="text-3xl font-extrabold mt-1">Gratis</div>
                <div className="text-xs text-[color:var(--muted)] mt-1">Para empezar a vender</div>
              </div>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <svg className="h-4 w-4 mt-0.5 shrink-0 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  <span>Tienda online con nombre personalizado</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="h-4 w-4 mt-0.5 shrink-0 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  <span>Catálogo de productos ilimitado</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="h-4 w-4 mt-0.5 shrink-0 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  <span>Pedidos en tienda (recoger)</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="h-4 w-4 mt-0.5 shrink-0 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  <span>Pagos en efectivo</span>
                </li>
              </ul>
              {isFree && !isSubActive && (
                <div className="mt-5 rounded-lg bg-[var(--accent-soft)] px-3 py-2 text-center text-sm font-medium text-[var(--accent)]">
                  ✓ Tu plan activo
                </div>
              )}
            </div>

            {/* Vende+ */}
            <div className={`relative rounded-2xl border-2 p-6 transition-all ${
              !isFree || isSubActive
                ? "border-amber-400 shadow-lg shadow-amber-400/10"
                : "border-[var(--border)]"
            }`}>
              {(!isFree || isSubActive) && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-3 py-0.5 text-xs font-bold text-white">
                  {isFree ? "" : "Plan actual"} Vende+
                </div>
              )}
              <div className="text-center mb-4">
                <div className="text-lg font-bold">Vende+</div>
                <div className="text-3xl font-extrabold mt-1">
                  {formatMoney(price, "MXN")}<span className="text-sm font-normal text-[color:var(--muted)]">/mes</span>
                </div>
                {isDiscounted && (
                  <div className="text-xs text-green-600 font-medium mt-1">
                    40% off los primeros 12 meses
                  </div>
                )}
              </div>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <svg className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  <span><strong>Envío a domicilio</strong> con repartidores locales</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  <span><strong>Promociones multi-producto</strong> y cupones de descuento</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  <span><strong>Pagos en línea</strong> con MercadoPago</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  <span><strong>Notificaciones push</strong> a tus clientes</span>
                </li>
              </ul>
              {!isFree || isSubActive ? (
                <div className="mt-5 rounded-lg bg-amber-50 px-3 py-2 text-center text-sm font-medium text-amber-700">
                  ✓ Tu plan activo
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {/* Coupon input */}
                  <div className="rounded-lg border border-[var(--border)] p-3">
                    <label className="text-xs font-medium text-[color:var(--muted)]">¿Tienes un cupón de descuento?</label>
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
                    className="w-full rounded-xl bg-amber-500 px-6 py-3 text-sm font-bold text-white hover:bg-amber-600 disabled:opacity-60 transition-all"
                  >
                    {inGrace ? "En periodo de gracia" : paying ? "Conectando..." : couponData
                      ? `Pagar ${formatMoney(couponData.finalPrice, "MXN")}/mes`
                      : `Activar Vende+ ${formatMoney(price, "MXN")}/mes`}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Grace period */}
          {inGrace && (
            <div className="rounded-xl border-2 border-amber-400 bg-amber-50 p-5 text-center">
              <div className="text-lg font-bold text-amber-800">Periodo de gracia</div>
              <p className="mt-1 text-sm text-amber-700">
                Como agradecimiento por acompañarnos durante la fase de prueba, tu membresía es <strong>gratuita hasta agosto de 2026</strong>. No necesitas realizar ningún pago por ahora.
              </p>
            </div>
          )}

          {/* Current subscription details */}
          {subscription && isSubActive && (
            <div className="rounded-xl border border-[var(--border)] p-5 text-xs text-[color:var(--muted)] space-y-1">
              <div>Estado: <span className="font-medium">Activa</span></div>
              <div>Vigente hasta: {new Date(subscription.endDate).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}</div>
              {isDiscounted && subscription.discountEndDate && (
                <div>Descuento 40% vigente hasta: {new Date(subscription.discountEndDate).toLocaleDateString("es-MX")}</div>
              )}
              {subscription.contractSigned && <div>✓ Contrato firmado</div>}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
