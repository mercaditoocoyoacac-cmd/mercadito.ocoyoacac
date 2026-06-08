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
  const [store, setStore] = useState<{ name: string; createdAt: string } | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);

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

        // Fetch subscription status from a vendor endpoint
        // For now use the store data that includes subscription
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

  async function handlePay() {
    setPaying(true);
    setError(null);
    try {
      const res = await fetch("/api/vendor/pay-subscription", { method: "POST" });
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

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight mb-6">Mi Membresía</h1>

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
          {/* Store info */}
          <div className="rounded-xl border border-[var(--border)] p-5">
            <div className="text-sm text-[color:var(--muted)]">Tienda</div>
            <div className="text-lg font-semibold">{store.name}</div>
          </div>

          {/* Grace period */}
          {inGrace && (
            <div className="rounded-xl border-2 border-amber-400 bg-amber-50 p-6 text-center">
              <div className="text-4xl mb-2">🎉</div>
              <div className="text-lg font-bold text-amber-800">Periodo de gracia</div>
              <p className="mt-2 text-sm text-amber-700">
                Como agradecimiento por acompañarnos durante la fase de prueba, tu membresía es <strong>gratuita hasta agosto de 2026</strong>.
              </p>
              <p className="mt-1 text-xs text-amber-600">
                No necesitas realizar ningún pago por ahora.
              </p>
            </div>
          )}

          {/* Subscription active */}
          {isSubActive && !inGrace && (
            <div className="rounded-xl border-2 border-green-400 bg-green-50 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                  <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <div className="font-semibold text-green-800">Membresía activa</div>
                  <div className="text-sm text-green-700">
                    Vigente hasta {new Date(subscription!.endDate).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Pricing info */}
          <div className="rounded-xl border border-[var(--border)] p-5 space-y-3">
            <h2 className="text-sm font-semibold">Detalle del plan</h2>
            <div className="flex justify-between text-sm">
              <span className="text-[color:var(--muted)]">Precio normal</span>
              <span>{formatMoney(FULL_PRICE, "MXN")}/mes</span>
            </div>
            {isDiscounted && (
              <div className="flex justify-between text-sm text-green-700">
                <span>Descuento 40% primer año</span>
                <span>-{formatMoney(FULL_PRICE - DISCOUNTED_PRICE, "MXN")}/mes</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-semibold border-t border-[var(--border)] pt-3">
              <span>Total a pagar</span>
              <span>{formatMoney(price, "MXN")}/mes</span>
            </div>
            {!isDiscounted && !isSubActive && (
              <div className="text-xs text-[color:var(--muted)]">
                * El descuento del 40% aplica durante los primeros 12 meses a partir del primer pago.
              </div>
            )}
          </div>

          {/* Pay button */}
          {!inGrace && !(isSubActive && now < new Date(subscription!.endDate)) && (
            <button
              onClick={handlePay}
              disabled={paying}
              className="w-full rounded-xl bg-[var(--accent)] px-6 py-4 text-base font-bold text-white hover:bg-[var(--accent-hover)] disabled:opacity-60 transition-all"
            >
              {paying ? "Conectando con MercadoPago..." : `Pagar ${formatMoney(price, "MXN")} ahora`}
            </button>
          )}

          {/* Current subscription details */}
          {subscription && (
            <div className="rounded-xl border border-[var(--border)] p-5 text-xs text-[color:var(--muted)] space-y-1">
              <div>Estado: <span className="font-medium">{subscription.status === "ACTIVE" ? "Activa" : subscription.status === "TRIAL" ? "Prueba" : subscription.status === "EXPIRED" ? "Expirada" : subscription.status === "CANCELLED" ? "Cancelada" : subscription.status}</span></div>
              {subscription.discountEndDate && (
                <div>Descuento vigente hasta: {new Date(subscription.discountEndDate).toLocaleDateString("es-MX")}</div>
              )}
              {subscription.contractSigned && <div>✓ Contrato firmado</div>}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
