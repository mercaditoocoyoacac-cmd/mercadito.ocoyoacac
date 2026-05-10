"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || "Error al enviar el correo");
        return;
      }
      setSent(true);
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-4">
        <div className="w-full rounded-xl border border-[var(--border)] bg-white p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600 text-2xl">✓</div>
          <h1 className="text-xl font-semibold">Revisa tu correo</h1>
          <p className="mt-2 text-sm text-[color:var(--muted)]">
            Si existe una cuenta con ese correo, recibirás un enlace para restablecer tu contraseña.
          </p>
          <Link href="/login" className="mt-6 inline-block text-sm text-[var(--accent)] hover:underline">
            Volver al inicio de sesión
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-4">
      <div className="w-full rounded-xl border border-[var(--border)] bg-white p-8">
        <h1 className="text-xl font-semibold">Recuperar contraseña</h1>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-medium">Correo electrónico</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              placeholder="tu@correo.com"
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
            {loading ? "Enviando..." : "Enviar enlace"}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-[color:var(--muted)]">
          <Link href="/login" className="text-[var(--accent)] hover:underline">
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    </main>
  );
}
