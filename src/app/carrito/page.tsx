"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type CartItem = {
  quantity: number;
  product: {
    id: string;
    name: string;
    priceCents: number;
    currency: string;
    store: { id: string; name: string; slug: string; acceptsMercadoPago: boolean };
  };
};

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(
    cents / 100,
  );
}

export default function CarritoPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const store = items?.[0]?.product.store;
  const acceptsMercadoPago = store?.acceptsMercadoPago ?? false;
  const currency = items?.[0]?.product.currency ?? "MXN";
  const subtotal = useMemo(
    () =>
      (items ?? []).reduce(
        (sum, item) => sum + item.quantity * item.product.priceCents,
        0,
      ),
    [items],
  );

  const [fulfillmentType, setFulfillmentType] = useState<"PICKUP" | "DELIVERY">(
    "PICKUP",
  );
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/cart/items");
    if (res.status === 401) {
      router.push("/login?callbackUrl=/carrito");
      return;
    }
    const data = (await res.json().catch(() => null)) as
      | { ok: true; items: CartItem[] }
      | { ok: false; error?: string }
      | null;
    setLoading(false);
    if (!res.ok || !data?.ok) {
      setError("No se pudo cargar tu carrito.");
      return;
    }
    setItems(data.items);
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Carrito</h1>
      <p className="mt-2 text-sm text-[color:var(--muted)]">
        {store ? (
          <>
            Comprando en{" "}
            <Link className="underline" href={`/tienda/${store.slug}`}>
              {store.name}
            </Link>
          </>
        ) : (
          "Tu selección actual."
        )}
      </p>

      {loading ? (
        <div className="mt-6 text-sm text-[color:var(--muted)]">
          Cargando...
        </div>
      ) : error ? (
        <div className="mt-6 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : (items ?? []).length === 0 ? (
        <div className="mt-6 rounded-xl border border-[var(--border)] p-5">
          <div className="font-medium">Tu carrito está vacío</div>
          <div className="mt-1 text-sm text-[color:var(--muted)]">
            Explora tiendas y agrega productos.
          </div>
          <div className="mt-4">
            <Link
              href="/tiendas"
              className="inline-flex rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
            >
              Ver tiendas
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <div className="overflow-hidden rounded-xl border border-[var(--border)]">
              <table className="w-full text-left text-sm">
                <thead className="bg-[var(--accent-soft)]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Producto</th>
                    <th className="px-4 py-3 font-medium">Cantidad</th>
                    <th className="px-4 py-3 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(items ?? []).map((item) => (
                    <tr
                      key={item.product.id}
                      className="border-t border-[var(--border)]"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium">{item.product.name}</div>
                        <div className="text-xs text-[color:var(--muted)]">
                          {formatMoney(item.product.priceCents, item.product.currency)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="h-8 w-8 rounded-md border border-[var(--border)] hover:bg-[var(--accent-soft)]"
                            onClick={async () => {
                              const next = Math.max(0, item.quantity - 1);
                              await fetch("/api/cart/items", {
                                method: "PUT",
                                headers: { "content-type": "application/json" },
                                body: JSON.stringify({
                                  productId: item.product.id,
                                  quantity: next,
                                }),
                              });
                              await refresh();
                            }}
                          >
                            -
                          </button>
                          <div className="w-6 text-center">{item.quantity}</div>
                          <button
                            type="button"
                            className="h-8 w-8 rounded-md border border-[var(--border)] hover:bg-[var(--accent-soft)]"
                            onClick={async () => {
                              const next = Math.min(99, item.quantity + 1);
                              await fetch("/api/cart/items", {
                                method: "PUT",
                                headers: { "content-type": "application/json" },
                                body: JSON.stringify({
                                  productId: item.product.id,
                                  quantity: next,
                                }),
                              });
                              await refresh();
                            }}
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {formatMoney(
                          item.quantity * item.product.priceCents,
                          item.product.currency,
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 text-right text-sm">
              <span className="text-[color:var(--muted)]">
                Subtotal:
              </span>{" "}
              <span className="font-semibold">{formatMoney(subtotal, currency)}</span>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="rounded-xl border border-[var(--border)] p-5">
              <div className="font-semibold">Finalizar pedido</div>
              <div className="mt-4 space-y-3">
                <label className="block">
                  <div className="text-sm font-medium">Entrega / Recolección</div>
                  <select
                    value={fulfillmentType}
                    onChange={(e) =>
                      setFulfillmentType(
                        e.target.value === "DELIVERY" ? "DELIVERY" : "PICKUP",
                      )
                    }
                    className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                  >
                    <option value="PICKUP">Recolección</option>
                    <option value="DELIVERY">Entrega</option>
                  </select>
                </label>

                <label className="block">
                  <div className="text-sm font-medium">Nombre</div>
                  <input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                    placeholder="Tu nombre"
                  />
                </label>
                <label className="block">
                  <div className="text-sm font-medium">Teléfono</div>
                  <input
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                    placeholder="722..."
                  />
                </label>

                {fulfillmentType === "DELIVERY" ? (
                  <label className="block">
                    <div className="text-sm font-medium">Dirección</div>
                    <input
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                      placeholder="Calle, número, colonia..."
                    />
                  </label>
                ) : null}

                <label className="block">
                  <div className="text-sm font-medium">Notas (opcional)</div>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="mt-1 w-full resize-none rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                    placeholder="Instrucciones, referencia..."
                  />
                </label>

                {acceptsMercadoPago && (
                  <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3">
                    <div className="flex items-center gap-2">
                      <svg className="h-5 w-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      <span className="text-sm font-medium text-yellow-800">Esta tienda acepta pagos en línea</span>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  disabled={checkoutLoading}
                  onClick={async () => {
                    setCheckoutLoading(true);
                    setError(null);
                    const res = await fetch("/api/checkout", {
                      method: "POST",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({
                        fulfillmentType,
                        customerName,
                        customerPhone,
                        customerAddress: customerAddress || undefined,
                        notes: notes || undefined,
                      }),
                    });
                    const data = (await res.json().catch(() => null)) as
                      | { ok: true; orderId: string }
                      | { ok: false; error?: string }
                      | null;
                    setCheckoutLoading(false);
                    if (!res.ok || !data?.ok) {
                      const msg =
                        data && "error" in data
                          ? data.error
                          : "No se pudo crear el pedido.";
                      setError(msg ?? "No se pudo crear el pedido.");
                      return;
                    }
                    router.push(`/pedido/${data.orderId}`);
                  }}
                  className="w-full rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60"
                >
                  {checkoutLoading ? "Creando pedido..." : "Confirmar pedido"}
                </button>
                <div className="text-xs text-[color:var(--muted)]">
                  {acceptsMercadoPago 
                    ? "Pago seguro con tarjeta al confirmar" 
                    : "Pago contraentrega / al recoger"}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
