"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useState } from "react";
import { StockToggle } from "@/components/storefront/StockToggle";
import { formatMoney } from "@/lib/format";
import { useRouter } from "next/navigation";

type Product = {
  id: string;
  name: string;
  priceCents: number;
  currency: string;
  imageUrl: string | null;
  isActive: boolean;
  sku: string | null;
  stock: number;
  isUnavailable: boolean;
  sellByWeight: boolean;
  sortOrder: number;
};

export function ReorderForm({ products }: { products: Product[] }) {
  const router = useRouter();
  const [orders, setOrders] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    products.forEach((p, i) => { map[p.id] = p.sortOrder || i + 1; });
    return map;
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const updateOrder = useCallback((id: string, val: string) => {
    const num = parseInt(val, 10);
    if (isNaN(num) || num < 0) return;
    setOrders(prev => ({ ...prev, [id]: num }));
    setSaved(false);
  }, []);

  const sorted = [...products].sort((a, b) => (orders[a.id] ?? 0) - (orders[b.id] ?? 0));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/vendor/products/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orders: Object.entries(orders).map(([id, sortOrder]) => ({ id, sortOrder })),
        }),
      });
      if (res.ok) {
        setSaved(true);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      {sorted.map(product => (
        <div
          key={product.id}
          className="group flex items-center gap-3 rounded-xl border border-[var(--border)] bg-white px-3 py-2 transition-shadow hover:shadow-sm"
        >
          <div className="flex w-10 shrink-0 items-center justify-center">
            <input
              aria-label={`Orden de ${product.name}`}
              type="number"
              min={0}
              value={orders[product.id] ?? 0}
              onChange={e => updateOrder(product.id, e.target.value)}
              className="w-full rounded border border-[var(--border)] px-1.5 py-1 text-center text-xs font-mono tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          </div>

          <Link href={`/vendor/productos/${product.id}`} className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--border)] bg-gray-50">
              {product.imageUrl ? (
                <Image src={product.imageUrl} alt={product.name} width={40} height={40} className="h-full w-full object-cover" />
              ) : (
                <svg className="h-5 w-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              )}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium group-hover:text-[var(--accent)]">{product.name}</div>
              <div className="text-xs text-[color:var(--muted)]">{formatMoney(product.priceCents, product.currency)}</div>
            </div>
          </Link>

          <div className="flex shrink-0 items-center gap-2">
            <StockToggle productId={product.id} initial={product.isUnavailable} />
            <Link
              href={`/vendor/productos/${product.id}`}
              className="text-xs text-[var(--accent)] opacity-0 transition-opacity group-hover:opacity-100"
            >
              Editar &rarr;
            </Link>
          </div>
        </div>
      ))}

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-5 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
        >
          {saving ? "Guardando..." : "Guardar orden"}
        </button>
        {saved && (
          <span className="text-sm text-green-600">
            Orden guardado
          </span>
        )}
      </div>
    </div>
  );
}
