"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

export default function VendorLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function redirectByRole() {
    const sessionRes = await fetch("/api/auth/session");
    const session = await sessionRes.json();
    const role = session?.user?.role;
    const extra = session?.user?.additionalRoles;
    if (extra) { router.push("/"); return; }
    if (role === "VENDOR") router.push("/vendor");
    else if (role === "DELIVERY") router.push("/delivery");
    else if (role === "ADMIN") router.push("/admin");
    else router.push("/");
  }

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Portal del Vendedor</h1>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Accede para administrar tu tienda y productos.
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
          });
          setLoading(false);
          if (!res || res.error) {
            setError("Correo o contraseña incorrectos.");
            return;
          }
          await redirectByRole();
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
            placeholder="vendedor@tu-tienda.com"
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

        <div className="text-right">
          <Link href="/recuperar-contrasena" className="text-xs text-[var(--accent)] hover:underline">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

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
          {loading ? "Entrando..." : "Entrar como vendedor"}
        </button>
      </form>

      <div className="mt-6 text-sm text-[color:var(--muted)]">
        ¿Eres cliente?{" "}
        <Link className="underline" href="/login">
          Ir al portal de clientes
        </Link>
      </div>

      <div className="mt-4 border-t border-[var(--border)] pt-4 text-sm text-[color:var(--muted)]">
        ¿No tienes cuenta de vendedor?{" "}
        <Link className="underline" href="/vendor/registro">
          Regístrate aquí
        </Link>
      </div>
    </main>
  );
}
