"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

export default function VendorRegistroPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Registro de Vendedor</h1>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Crea tu cuenta para abrir tu tienda y vender productos.
        </p>
      </div>

      <form
        className="mt-6 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setLoading(true);
          setError(null);

          if (password.length < 8) {
            setLoading(false);
            setError("La contraseña debe tener al menos 8 caracteres.");
            return;
          }

          const res = await fetch("/api/register", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              name: name.trim() || undefined,
              email,
              password,
              role: "VENDOR",
            }),
          });
          const data = (await res.json().catch(() => null)) as
            | { ok: true; user: { id: string; email: string }; upgraded?: boolean }
            | { ok: false; error?: string }
            | null;

          if (!res.ok || !data?.ok) {
            setLoading(false);
            const msg = data && "error" in data ? data.error : "No se pudo registrar.";
            setError(msg ?? "No se pudo registrar.");
            return;
          }

          setLoading(false);
          
          if (data.upgraded) {
            setError("Tu cuenta de cliente se actualizó a vendedor. Inicia sesión con tu contraseña actual.");
            setTimeout(() => router.push("/vendor/login"), 2000);
            return;
          }

          const login = await signIn("credentials", {
            email,
            password,
            redirect: false,
            callbackUrl: "/vendor/onboarding",
          });
          router.push(login?.url ?? "/vendor/onboarding");
        }}
      >
        <label className="block">
          <div className="text-sm font-medium">Nombre de tu negocio o nombre</div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            placeholder="Panadería La Esquina"
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
            placeholder="tu@negocio.com"
          />
        </label>

        <label className="block">
          <div className="text-sm font-medium">Contraseña</div>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
            minLength={8}
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
          {loading ? "Creando cuenta..." : "Crear cuenta de vendedor"}
        </button>
      </form>

      <div className="mt-6 text-sm text-[color:var(--muted)]">
        ¿Ya tienes cuenta?{" "}
        <Link className="underline" href="/vendor/login">
          Inicia sesión
        </Link>
      </div>

      <div className="mt-4 border-t border-[var(--border)] pt-4 text-sm text-[color:var(--muted)]">
        ¿Eres cliente?{" "}
        <Link className="underline" href="/registro">
          Regístrate como cliente
        </Link>
      </div>
    </main>
  );
}
