"use client";

import { useState } from "react";
import Link from "next/link";

export default function EliminarCuentaPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-10">
        <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-6 text-center">
          <div className="text-lg font-semibold text-green-700">Cuenta eliminada</div>
          <p className="mt-2 text-sm text-green-600">
            Tu cuenta y todos los datos asociados han sido eliminados permanentemente.
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
          >
            Volver al inicio
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Eliminar mi cuenta</h1>
      <p className="mt-2 text-sm text-[color:var(--muted)]">
        Esta accion no se puede deshacer. Se eliminara tu cuenta, pedidos, carrito,
        notificaciones y, si eres vendedor, tu tienda y todos tus productos.
      </p>

      {error && (
        <div className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-6 space-y-4 rounded-xl border border-[var(--border)] p-5">
        <label className="block">
          <div className="text-sm font-medium">Confirma tu contraseña</div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            placeholder="Tu contraseña actual"
          />
        </label>

        <label className="block">
          <div className="text-sm font-medium">
            Escribe <span className="font-mono text-red-600">ELIMINAR</span> para confirmar
          </div>
          <input
            type="text"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm font-mono outline-none focus:border-red-400"
            placeholder="ELIMINAR"
          />
        </label>

        <button
          type="button"
          disabled={loading || confirm !== "ELIMINAR" || password.length === 0}
          onClick={async () => {
            setLoading(true);
            setError(null);
            const res = await fetch("/api/account/delete", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ password }),
            });
            const data = (await res.json().catch(() => null)) as
              | { ok: boolean; error?: string }
              | null;
            setLoading(false);
            if (!res.ok || !data?.ok) {
              setError(data?.error ?? "No se pudo eliminar la cuenta.");
              return;
            }
            setDone(true);
          }}
          className="w-full rounded-md bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "Eliminando..." : "Eliminar mi cuenta permanentemente"}
        </button>

        <div className="text-center">
          <Link href="/" className="text-sm text-[var(--accent)] hover:underline">
            Cancelar y volver
          </Link>
        </div>
      </div>
    </main>
  );
}
