"use client";

import { useEffect, useState } from "react";
import { formatMoney } from "@/lib/format";

type Receipt = {
  id: string;
  receiptNumber: string;
  amountCents: number;
  currency: string;
  description: string;
  periodStart: string;
  periodEnd: string;
  couponCode: string | null;
  couponSavings: number | null;
  paymentMethod: string | null;
  paymentReference: string | null;
  status: string;
  issuedAt: string;
  createdAt: string;
};

export default function VendorRecibosPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Receipt | null>(null);

  useEffect(() => {
    fetch("/api/vendor/receipts")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) setReceipts(data.receipts);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function fmtDate(d: string) {
    return new Date(d).toLocaleDateString("es-MX", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  if (loading) {
    return <div className="p-6 text-center text-[color:var(--muted)]">Cargando...</div>;
  }

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Mis Recibos</h1>
        <p className="text-sm text-[color:var(--muted)]">Historial de pagos de tu membresía</p>
      </div>

      {receipts.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] p-12 text-center">
          <div className="text-4xl mb-3">🧾</div>
          <h2 className="text-lg font-semibold">Sin recibos</h2>
          <p className="mt-2 text-sm text-[color:var(--muted)]">
            Aún no tienes pagos registrados. Adquiere la membresía Vende+ para recibir tu primer recibo.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {receipts.map((r, idx) => (
              <button
                key={r.id}
                onClick={() => setSelected(selected?.id === r.id ? null : r)}
                style={{ animationDelay: `${idx * 50}ms` }}
                className="w-full text-left rounded-xl border border-[var(--border)] p-4 hover:border-[var(--accent)] transition-all fade-in"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm">{r.receiptNumber}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        r.status === "PAID"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                        {r.status === "PAID" ? "Pagado" : "Reembolsado"}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-[color:var(--muted)]">{r.description}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-green-600">{formatMoney(r.amountCents, "MXN")}</div>
                    <div className="text-xs text-[color:var(--muted)]">{fmtDate(r.issuedAt)}</div>
                  </div>
                </div>

                {selected?.id === r.id && (
                  <div className="mt-4 pt-4 border-t border-[var(--border)]">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-[color:var(--muted)]">Periodo:</span>
                        <div className="font-medium">{fmtDate(r.periodStart)} — {fmtDate(r.periodEnd)}</div>
                      </div>
                      <div>
                        <span className="text-[color:var(--muted)]">Método de pago:</span>
                        <div className="font-medium">{r.paymentMethod || "MercadoPago"}</div>
                      </div>
                      {r.couponCode && (
                        <div>
                          <span className="text-[color:var(--muted)]">Cupón:</span>
                          <div className="font-medium text-green-600">
                            {r.couponCode}
                            {r.couponSavings && ` (ahorro ${formatMoney(r.couponSavings, "MXN")})`}
                          </div>
                        </div>
                      )}
                      {r.paymentReference && (
                        <div>
                          <span className="text-[color:var(--muted)]">Referencia:</span>
                          <div className="font-medium font-mono text-xs">{r.paymentReference}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>

          <div className="mt-6 text-center text-xs text-[color:var(--muted)]">
            {receipts.length} recibo{receipts.length !== 1 ? "s" : ""} en tu historial
          </div>
        </>
      )}
    </main>
  );
}
