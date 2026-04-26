"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ReceiveOrderPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) {
      setError("Ingresa el código");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/order/confirm-received", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });
      const data = await res.json();

      if (data.ok) {
        router.push(`/pedido/${data.orderId}?recibido=1`);
      } else {
        setError(data.error || "Código inválido");
      }
    } catch {
      setError("Error de conexión");
    }
    setLoading(false);
  }

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Confirmar recepción</h1>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Ingresa el código que te showed el repartidor.
        </p>
      </div>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <div className="text-sm font-medium">Código de entrega</div>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-3 text-center text-2xl font-mono tracking-widest uppercase outline-none focus:border-[var(--accent)]"
            placeholder="XXXXXX"
            maxLength={6}
          />
        </label>

        {error && (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-[var(--accent)] px-4 py-3 text-base font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60"
        >
          {loading ? "Confirmando..." : "Confirmar recepción"}
        </button>
      </form>

      <div className="mt-6 text-center">
        <Link href="/mis-pedidos" className="text-sm text-[var(--accent)] underline">
          Ver mis pedidos
        </Link>
      </div>
    </main>
  );
}