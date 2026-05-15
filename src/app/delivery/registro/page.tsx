"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

export default function DeliveryRegistroPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (session?.user) {
      const res = await fetch("/api/auth/switch-role", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role: "DELIVERY" }),
      });
      const data = await res.json().catch(() => null);
      setLoading(false);
      if (res.ok && data?.ok) {
        router.push("/delivery");
      } else {
        setError("No se pudo cambiar al rol de repartidor.");
      }
      return;
    }

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: name.trim() || undefined,
        email,
        password,
        role: "DELIVERY",
      }),
    });
    const data = (await res.json().catch(() => null)) as
      | { ok: true; user: { id: string; email: string } }
      | { ok: false; error?: string }
      | null;
    if (!res.ok || !data?.ok) {
      setLoading(false);
      const msg = data && "error" in data ? data.error : "No se pudo registrar.";
      setError(msg ?? "No se pudo registrar.");
      return;
    }

    const login = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/delivery",
    });
    setLoading(false);
    router.push(login?.url ?? "/delivery");
  }

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          {session?.user ? "Ser repartidor" : "Registro de Repartidor"}
        </h1>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          {session?.user
            ? "Tu cuenta de cliente también podrá repartir pedidos."
            : "Únete al equipo de repartidores de Mercadito Ocoyoacac."}
        </p>
      </div>

      {session?.user ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            Sesión iniciada como <strong>{session.user.email}</strong> ({session.user.role})
          </div>
          <button
            onClick={handleRegister}
            disabled={loading}
            className="w-full rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60"
          >
            {loading ? "Cambiando..." : "Activar modo repartidor"}
          </button>
          <p className="text-xs text-[color:var(--muted)]">
            Tu cuenta de cliente se conservará. Podrás cambiar entre cliente y repartidor desde el menú.
          </p>
        </div>
      ) : (
        <form className="mt-6 space-y-4" onSubmit={handleRegister}>
          <label className="block">
            <div className="text-sm font-medium">Nombre</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              placeholder="Tu nombre completo"
            />
          </label>

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
              placeholder="Mínimo 8 caracteres"
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
            {loading ? "Registrando..." : "Registrarse"}
          </button>
        </form>
      )}

      {!session?.user && (
        <div className="mt-6 text-sm text-[color:var(--muted)]">
          ¿Ya tienes cuenta?{" "}
          <Link className="underline" href="/delivery/login">
            Inicia sesión
          </Link>
        </div>
      )}
    </main>
  );
}
