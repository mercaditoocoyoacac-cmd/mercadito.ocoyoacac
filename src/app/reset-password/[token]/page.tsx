"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Las contraseñas no coinciden");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || "Error al restablecer la contraseña");
        return;
      }
      setDone(true);
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-4">
        <div className="w-full rounded-xl border border-[var(--border)] bg-white p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600 text-2xl">✓</div>
          <h1 className="text-xl font-semibold">Contraseña actualizada</h1>
          <p className="mt-2 text-sm text-[color:var(--muted)]">
            Tu contraseña se ha restablecido correctamente. Ahora puedes iniciar sesión con tu nueva contraseña.
          </p>
          <Link href="/login" className="mt-6 inline-block rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]">
            Iniciar sesión
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-4">
      <div className="w-full rounded-xl border border-[var(--border)] bg-white p-8">
        <h1 className="text-xl font-semibold">Nueva contraseña</h1>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          Ingresa tu nueva contraseña.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-medium">Nueva contraseña</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              placeholder="Mínimo 6 caracteres"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium">Confirmar contraseña</span>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={6}
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              placeholder="Repite la contraseña"
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
            className="w-full rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60"
          >
            {loading ? "Guardando..." : "Restablecer contraseña"}
          </button>
        </form>
      </div>
    </main>
  );
}
