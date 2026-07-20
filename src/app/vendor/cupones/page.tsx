"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

type Coupon = {
  id: string;
  code: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  minPurchaseCents: number | null;
  maxUses: number | null;
  usedCount: number;
  maxUsesPerUser: number | null;
  isActive: boolean;
  startsAt: string | null;
  expiresAt: string | null;
  createdAt: string;
};

export default function VendorCuponesPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/vendor/coupons");
    if (res.status === 401) { window.location.href = "/login?callbackUrl=/vendor/cupones"; return; }
    const data = await res.json();
    if (data.ok) setCoupons(data.coupons);
    setLoading(false);
  }

  useEffect(() => { load() }, []);

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    toast.success(`"${code}" copiado al portapapeles`);
  }

  if (loading) {
    return <div className="text-center py-8 text-[color:var(--muted)]">Cargando...</div>;
  }

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Mis cupones de descuento</h1>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          Comparte estos códigos con tus clientes para que obtengan descuentos en tu tienda.
        </p>
      </div>

      {coupons.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] p-8 text-center">
          <div className="text-4xl mb-3">🏷️</div>
          <p className="text-[color:var(--muted)]">No tienes cupones asignados aún.</p>
          <p className="text-sm text-[color:var(--muted)] mt-1">Pide al administrador que cree cupones para tu tienda.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {coupons.map((coupon) => {
            const now = new Date();
            const expired = coupon.expiresAt && new Date(coupon.expiresAt) < now;
            const notStarted = coupon.startsAt && new Date(coupon.startsAt) > now;
            const discountLabel = coupon.discountType === "PERCENTAGE" ? `${coupon.discountValue}% OFF` : `$${(coupon.discountValue / 100).toFixed(2)} OFF`;

            return (
              <div key={coupon.id} className="rounded-xl border border-[var(--border)] bg-white p-5 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🏷️</span>
                    <div>
                      <div className="font-mono font-bold text-lg">{coupon.code}</div>
                      <div className="text-sm text-[color:var(--muted)]">{discountLabel}</div>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[color:var(--muted)]">
                    {coupon.minPurchaseCents && <span>Compra mín: ${(coupon.minPurchaseCents / 100).toFixed(2)}</span>}
                    <span>Usos: {coupon.usedCount}{coupon.maxUses ? ` / ${coupon.maxUses}` : " · sin límite"}</span>
                    {coupon.expiresAt && <span>Vence: {new Date(coupon.expiresAt).toLocaleDateString()}</span>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div>
                    {expired ? <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">Expirado</span> :
                     notStarted ? <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700">Próximo</span> :
                     coupon.isActive ? <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">Activo</span> :
                     <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">Inactivo</span>}
                  </div>
                  <button
                    type="button"
                    onClick={() => copyCode(coupon.code)}
                    className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--accent-hover)]"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    Copiar código
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
