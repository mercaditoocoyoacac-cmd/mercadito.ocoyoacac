"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";

const LocationPicker = dynamic(
  () => import("@/components/LocationPicker"),
  { ssr: false, loading: () => <div className="h-48 w-full bg-gray-100 animate-pulse rounded-lg" /> }
);

type CartItem = {
  quantity: number;
  product: {
    id: string;
    name: string;
    priceCents: number;
    currency: string;
    isUnavailable: boolean;
    store: { id: string; name: string; slug: string; acceptsMercadoPago: boolean; hasOnlinePayment: boolean };
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
  const hasOnlinePayment = store?.hasOnlinePayment ?? store?.acceptsMercadoPago ?? false;
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
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "ONLINE">("CASH");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerLat, setCustomerLat] = useState<number | null>(null);
  const [customerLng, setCustomerLng] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    setError(null);
    
    const [cartRes, profileRes] = await Promise.all([
      fetch("/api/cart/items"),
      fetch("/api/profile").catch(() => null)
    ]);
    
    if (cartRes.status === 401) {
      router.push("/login?callbackUrl=/carrito");
      return;
    }
    
    const cartData = (await cartRes.json().catch(() => null)) as
      | { ok: true; items: CartItem[] }
      | { ok: false; error?: string }
      | null;
    
    if (!cartRes.ok || !cartData?.ok) {
      setError("No se pudo cargar tu carrito.");
      setLoading(false);
      return;
    }
    
    setItems(cartData.items);
    
    if (profileRes?.ok) {
      const profileData = await profileRes.json();
      if (profileData.ok && profileData.user) {
        setCustomerName(profileData.user.name || "");
        setCustomerPhone(profileData.user.phone || "");
        const addr = [
          profileData.user.address,
          profileData.user.city,
          profileData.user.state,
          profileData.user.zipCode
        ].filter(Boolean).join(", ");
        setCustomerAddress(addr);
        setCustomerLat(profileData.user.latitude);
        setCustomerLng(profileData.user.longitude);
      }
    }
    
    setLoading(false);
  }

  useEffect(() => {
    void refresh();
  }, [router]);

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
      ) : (items ?? []).some((item: CartItem) => item.product.isUnavailable) ? (
        <div className="mt-6 rounded-xl border border-red-500/30 bg-red-50 p-5">
          <div className="font-medium text-red-700">Productos agotados en tu carrito</div>
          <div className="mt-1 text-sm text-red-600">
            Algunos productos ya no están disponibles. Retira los productos marcados como "Agotado" para continuar.
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
                      className={`border-t border-[var(--border)] ${
                        item.product.isUnavailable ? "bg-red-50" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="font-medium">{item.product.name}</div>
                          {item.product.isUnavailable && (
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700">
                              Agotado
                            </span>
                          )}
                        </div>
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
          </div>

          <div className="lg:col-span-2">
            <div className="rounded-xl border border-[var(--border)] p-5">
              <div className="font-semibold">Resumen</div>
              <div className="mt-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-[color:var(--muted)]">Productos</span>
                  <span>{formatMoney(subtotal, currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[color:var(--muted)]">Envío</span>
                  <span>{fulfillmentType === "DELIVERY" ? formatMoney(2500, currency) : "$0.00"}</span>
                </div>
                <hr className="border-[var(--border)]" />
                <div className="flex justify-between text-base font-semibold">
                  <span>Total</span>
                  <span>{formatMoney(subtotal + (fulfillmentType === "DELIVERY" ? 2500 : 0), currency)}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-[var(--border)] p-5">
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
                    <div className="mt-3">
                      <div className="text-sm font-medium mb-2">Ubica tu domicilio en el mapa</div>
                      <LocationPicker
                        latitude={customerLat}
                        longitude={customerLng}
                        onLocationChange={(lat, lng) => {
                          setCustomerLat(lat);
                          setCustomerLng(lng);
                        }}
                      />
                      {customerLat && customerLng && (
                        <p className="mt-1 text-xs text-green-600">
                          ✓ Punto de entrega marcado
                        </p>
                      )}
                    </div>
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

                {hasOnlinePayment && (
                  <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3">
                    <div className="flex items-center gap-2">
                      <svg className="h-5 w-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      <span className="text-sm font-medium text-yellow-800">Esta tienda acepta pagos en línea</span>
                    </div>
                  </div>
                )}

                {hasOnlinePayment && (
                  <label className="block">
                    <div className="text-sm font-medium">Método de pago</div>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="CASH"
                          id="paymentCash"
                          checked={paymentMethod === "CASH"}
                          onChange={() => setPaymentMethod("CASH")}
                          className="h-4 w-4"
                        />
                        <label htmlFor="paymentCash" className="text-sm">
                          Contraentrega / al recoger
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="ONLINE"
                          id="paymentOnline"
                          checked={paymentMethod === "ONLINE"}
                          onChange={() => setPaymentMethod("ONLINE")}
                          className="h-4 w-4"
                        />
                        <label htmlFor="paymentOnline" className="text-sm">
                          Pagar con tarjeta
                        </label>
                      </div>
                    </div>
                  </label>
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
                        paymentMethod,
                        customerName,
                        customerPhone,
                        customerAddress: customerAddress || undefined,
                        customerLat: customerLat || undefined,
                        customerLng: customerLng || undefined,
                        notes: notes || undefined,
                      }),
                    });
                    const data = (await res.json().catch(() => null)) as
                      | { ok: true; orderId: string; paymentUrl?: string; error?: string }
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
                    if (data.error && paymentMethod === "ONLINE") {
                      alert(data.error + ". Volvé al carrito para cambiar el método de pago.");
                      router.push("/carrito");
                      return;
                    }
                    if (data.paymentUrl) {
                      window.location.href = data.paymentUrl;
                    } else {
                      router.push(`/pedido/${data.orderId}`);
                    }
                  }}
                  className="w-full rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60"
                >
                  {checkoutLoading ? "Creando pedido..." : "Confirmar pedido"}
                </button>
                <div className="text-xs text-[color:var(--muted)]">
                  {hasOnlinePayment 
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
