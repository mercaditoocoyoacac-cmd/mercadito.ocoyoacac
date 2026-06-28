"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

export default function RegistroPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const role = session?.user?.role;
  const additionalRoles = session?.user?.additionalRoles?.split(",").filter(Boolean) || [];
  const isLoggedInVendorOrDelivery = session?.user && role !== "CUSTOMER" && !additionalRoles.includes("CUSTOMER");

  async function handleUpgrade() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: session?.user?.email,
        password: "placeholder",
        role: "CUSTOMER",
      }),
    });
    const data = await res.json().catch(() => null);
    setLoading(false);
    if (res.ok && data?.ok) {
      router.push("/tiendas");
    } else {
      setError(data?.error || "Error al activar modo cliente");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email || !password || !phone) {
      setError("Completa todos los campos requeridos");
      return;
    }

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: (nombres.trim() + " " + apellidos.trim()).trim() || undefined,
        email,
        password,
        phone: phone || undefined,
        role: "CUSTOMER",
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
      callbackUrl: "/tiendas",
    });
    setLoading(false);
    router.push(login?.url ?? "/tiendas");
  }

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          {isLoggedInVendorOrDelivery ? "Ser cliente también" : "Crear cuenta"}
        </h1>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          {isLoggedInVendorOrDelivery
            ? "Activa el modo cliente en tu cuenta para comprar en tiendas."
            : "Regístrate para comprar en las tiendas de tu zona."}
        </p>
      </div>

      {isLoggedInVendorOrDelivery ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            Sesión iniciada como <strong>{session?.user?.email}</strong> ({role?.toLowerCase()})
          </div>
          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full rounded-md bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-600 disabled:opacity-60"
          >
            {loading ? "Activando..." : "Activar modo cliente"}
          </button>
          <p className="text-xs text-[color:var(--muted)]">
            Tu cuenta de {role === "VENDOR" ? "vendedor" : "repartidor"} se conservará. Podrás cambiar entre roles desde el menú.
          </p>
        </div>
      ) : (
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <div className="text-sm font-medium">Nombres</div>
              <input
                value={nombres}
                onChange={(e) => setNombres(e.target.value)}
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                placeholder="Juan"
              />
            </label>
            <label className="block">
              <div className="text-sm font-medium">Apellidos</div>
              <input
                value={apellidos}
                onChange={(e) => setApellidos(e.target.value)}
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                placeholder="Pérez"
              />
            </label>
          </div>

          <label className="block">
            <div className="text-sm font-medium">Correo *</div>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              placeholder="tu@correo.com"
            />
          </label>

          <label className="block">
            <div className="text-sm font-medium">Contraseña *</div>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              minLength={8}
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              placeholder="Mínimo 8 caracteres"
            />
            <p className="mt-1 text-xs text-[color:var(--muted)]">Mínimo 8 caracteres</p>
          </label>

          <label className="block">
            <div className="text-sm font-medium">Teléfono *</div>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              type="tel"
              required
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              placeholder="722..."
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
            {loading ? "Creando cuenta..." : "Crear cuenta"}
          </button>
        </form>
      )}

      {!isLoggedInVendorOrDelivery && (
        <>
          <div className="mt-6 text-sm text-[color:var(--muted)]">
            ¿Ya tienes cuenta?{" "}
            <Link className="underline" href="/login">
              Inicia sesión
            </Link>
          </div>

          <div className="mt-4 border-t border-[var(--border)] pt-4 text-sm text-[color:var(--muted)]">
            ¿Quieres vender?{" "}
            <Link className="underline" href="/vendor/registro">
              Regístrate como vendedor
            </Link>
          </div>
        </>
      )}
    </main>
  );
}
