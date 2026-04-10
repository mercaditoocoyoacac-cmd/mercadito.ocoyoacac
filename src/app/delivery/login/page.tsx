"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

export default function DeliveryLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Portal de Repartidores</h1>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Accede para ver y entregar pedidos.
        </p>
      </div>

      <form
        className="mt-6 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setLoading(true);
          setError(null);
          const res = await signIn("credentials", {
            email,
            password,
            redirect: false,
            callbackUrl: "/delivery",
          });
          setLoading(false);
          if (!res || res.error) {
            setError("Correo o contraseña incorrectos.");
            return;
          }
          router.push(res.url ?? "/delivery");
        }}
      >
        <label className="block">
          <div className="text-sm font-medium">Correo</div>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            placeholder="repartidor@mercadito.com"
          />
        </label>

        <label className="block">
          <div className="text-sm font-medium">Contraseña</div>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            placeholder="********"
          />
        </label>

        {error ? (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}