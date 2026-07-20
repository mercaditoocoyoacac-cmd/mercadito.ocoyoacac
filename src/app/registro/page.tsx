"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

type RoleOption = "CUSTOMER" | "VENDOR" | "DELIVERY";

const roleIcons: Record<RoleOption, React.ReactNode> = {
  CUSTOMER: (
    <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  VENDOR: (
    <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  DELIVERY: (
    <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
    </svg>
  ),
};

const roleLabels: Record<RoleOption, { title: string; desc: string }> = {
  CUSTOMER: { title: "Comprar", desc: "Explora tiendas y compra productos locales" },
  VENDOR: { title: "Vender", desc: "Registra tu tienda y vende en línea" },
  DELIVERY: { title: "Repartir", desc: "Entrega pedidos y gana dinero" },
};

const roleColors: Record<RoleOption, { active: string; border: string; bg: string }> = {
  CUSTOMER: { active: "border-rose-500 bg-rose-50", border: "border-rose-200", bg: "bg-rose-500" },
  VENDOR: { active: "border-emerald-500 bg-emerald-50", border: "border-emerald-200", bg: "bg-emerald-500" },
  DELIVERY: { active: "border-orange-500 bg-orange-50", border: "border-orange-200", bg: "bg-orange-500" },
};

export default function RegistroPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [selectedRole, setSelectedRole] = useState<RoleOption | null>(null);
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

    if (!selectedRole) {
      setError("Selecciona qué quieres hacer en Mercadito Ocoyoacac");
      return;
    }

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
        role: selectedRole,
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
      callbackUrl: roleRedirects[selectedRole],
    });
    setLoading(false);
    router.push(login?.url ?? roleRedirects[selectedRole]);
  }

  const roleRedirects: Record<RoleOption, string> = {
    CUSTOMER: "/tiendas",
    VENDOR: "/vendor",
    DELIVERY: "/delivery",
  };

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          {isLoggedInVendorOrDelivery ? "Ser cliente también" : "Crear cuenta"}
        </h1>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          {isLoggedInVendorOrDelivery
            ? "Activa el modo cliente en tu cuenta para comprar en tiendas."
            : "Únete a Mercadito Ocoyoacac"}
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
        <>
          {/* Role selection */}
          <div className="mb-6">
            <p className="text-sm font-medium mb-3">¿Qué necesitas hacer en Mercadito Ocoyoacac?</p>
            <div className="grid grid-cols-3 gap-3">
              {(["CUSTOMER", "VENDOR", "DELIVERY"] as const).map((r) => {
                const colors = roleColors[r];
                const isSelected = selectedRole === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setSelectedRole(r)}
                    className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all ${
                      isSelected
                        ? colors.active + " shadow-sm scale-[1.03]"
                        : "border-[var(--border)] bg-transparent hover:border-gray-300"
                    }`}
                  >
                    <span className={isSelected ? "text-inherit" : "text-[color:var(--muted)]"}>
                      {roleIcons[r]}
                    </span>
                    <div>
                      <div className={`text-sm font-semibold ${isSelected ? "" : "text-[color:var(--muted)]"}`}>
                        {roleLabels[r].title}
                      </div>
                      <div className="text-[10px] leading-tight text-[color:var(--muted)] mt-0.5">
                        {roleLabels[r].desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
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
              disabled={loading || !selectedRole}
              className="w-full rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60"
            >
              {loading
                ? "Creando cuenta..."
                : selectedRole
                  ? `Crear cuenta como ${roleLabels[selectedRole].title}`
                  : "Selecciona una opción arriba"}
            </button>
          </form>
        </>
      )}

      {!isLoggedInVendorOrDelivery && (
        <>
          <div className="mt-6 text-sm text-[color:var(--muted)]">
            ¿Ya tienes cuenta?{" "}
            <Link className="underline" href="/login">
              Inicia sesión
            </Link>
          </div>
        </>
      )}
    </main>
  );
}
