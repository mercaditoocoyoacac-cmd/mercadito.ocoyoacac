"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MercadoPagoSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [accountId, setAccountId] = useState("");
  const [saved, setSaved] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/vendor/mercado-pago", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        accessToken,
        publicKey: publicKey || undefined,
        accountId: accountId || undefined,
      }),
    });

    const data = await res.json().catch(() => null);
    setLoading(false);

    if (!res.ok || !data?.ok) {
      setError(data?.error || "No se pudieron guardar las credenciales");
      return;
    }

    setSaved(true);
    setTimeout(() => router.push("/vendor"), 1500);
  }

  async function handleDisconnect(e: React.FormEvent) {
    e.preventDefault();
    if (!confirm("¿Estás seguro de desconectar MercadoPago?")) return;

    setLoading(true);
    const res = await fetch("/api/vendor/mercado-pago", { method: "DELETE" });
    setLoading(false);

    if (res.ok) {
      router.push("/vendor");
    }
  }

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">MercadoPago</h1>
      <p className="mt-2 text-sm text-[color:var(--muted)]">
        Configura tus credenciales de MercadoPago para recibir pagos con tarjeta.
      </p>

      <div className="mt-6 rounded-xl border border-[var(--border)] p-5">
        <h2 className="font-semibold">Credenciales de MercadoPago</h2>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          Obtén tus credenciales en{" "}
          <a
            href="https://www.mercadopago.com.mx/developers/panel"
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-[var(--accent)]"
          >
            MercadoPago Developers
          </a>
        </p>

        <form className="mt-4 space-y-4" onSubmit={handleSave}>
          <label className="block">
            <div className="text-sm font-medium">Access Token *</div>
            <input
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              required
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              placeholder="APP_USR-xxxxxxxxxxxxx"
            />
            <div className="text-xs text-[color:var(--muted)] mt-1">
              Lo encuentras en Credenciales → Access Token de prueba/producción
            </div>
          </label>

          <label className="block">
            <div className="text-sm font-medium">Public Key (opcional)</div>
            <input
              value={publicKey}
              onChange={(e) => setPublicKey(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              placeholder="APP_USR-xxxxx"
            />
          </label>

          <label className="block">
            <div className="text-sm font-medium">Account ID (opcional)</div>
            <input
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              placeholder="123456789"
            />
          </label>

          {error && (
            <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {saved && (
            <div className="rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-700">
              ✓ Credenciales guardadas
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60"
            >
              {loading ? "Guardando..." : "Guardar credenciales"}
            </button>
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={loading}
              className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-700 disabled:opacity-60"
            >
              Desconectar
            </button>
          </div>
        </form>
      </div>

      <div className="mt-4 rounded-lg bg-yellow-500/10 p-4 text-sm text-yellow-800">
        <strong>Nota:</strong> Las credenciales se almacenan encriptadas. 
        Usa las credenciales de prueba para pruebas y las de producción para recibir pagos reales.
      </div>
    </main>
  );
}