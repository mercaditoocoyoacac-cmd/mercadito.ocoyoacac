"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense, useState } from "react";

export default function VendorPortalPage() {
  return (
    <Suspense fallback={<PortalLoading />}>
      <PortalContent />
    </Suspense>
  );
}

function PortalLoading() {
  return (
    <main className="flex-1">
      <section className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-700 px-4 py-20 text-white">
        <div className="mx-auto max-w-4xl text-center">
          <div className="h-6 w-32 rounded-full bg-white/20 mx-auto"></div>
          <div className="mt-6 h-10 w-80 rounded bg-white/20 mx-auto"></div>
        </div>
      </section>
    </main>
  );
}

function PortalContent() {
  const router = useRouter();
  const search = useSearchParams();
  const mode = search.get("mode");

  if (mode === "login") return <VendorLogin />;
  if (mode === "register") return <VendorRegister />;

  return (
    <main className="flex-1">
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-700 px-4 py-20 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white blur-3xl"></div>
          <div className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-white blur-3xl"></div>
        </div>
        
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
            Portal de Vendedores
          </div>
          
          <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">
            Haz crecer tu negocio
          </h1>
          
          <p className="mt-4 text-lg text-white/90 sm:text-xl">
            Crea tu tienda digital y llega a mas clientes en tu comunidad.
          </p>
          
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/portal/vendedor?mode=login"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-semibold text-emerald-700 shadow-lg transition-transform hover:scale-105"
            >
              Ya tengo tienda - Entrar
            </Link>
            <Link
              href="/portal/vendedor?mode=register"
              className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-white/30 bg-white/10 px-8 py-4 text-base font-semibold backdrop-blur-sm transition-all hover:bg-white/20"
            >
              Crear mi tienda
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16">
        <div className="grid gap-8 sm:grid-cols-3">
          <div className="rounded-xl border border-[var(--border)] bg-white p-6 text-center shadow-sm">
            <div className="text-4xl mb-3">📦</div>
            <h3 className="text-lg font-semibold">Sube productos</h3>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              Agrega fotos, precios y descripciones de tus productos
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-white p-6 text-center shadow-sm">
            <div className="text-4xl mb-3">📱</div>
            <h3 className="text-lg font-semibold">Gestion facil</h3>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              Administra pedidos desde tu celular
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-white p-6 text-center shadow-sm">
            <div className="text-4xl mb-3">💳</div>
            <h3 className="text-lg font-semibold">Acepta pagos</h3>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              Efectivo o tarjeta online
            </p>
          </div>
        </div>
      </section>

      <section className="bg-emerald-600 py-16 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-2xl font-bold">Listo para vender?</h2>
          <p className="mt-3 text-emerald-100">
            Crea tu tienda por solo $496/mes.
          </p>
          <div className="mt-8">
            <Link
              href="/portal/vendedor?mode=register"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-semibold text-emerald-700 shadow-lg transition-transform hover:scale-105"
            >
              Crear mi tienda
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-8 text-center">
        <Link href="/" className="text-sm text-emerald-600 hover:underline">
          Volver a la tienda
        </Link>
      </section>
    </main>
  );
}

function VendorLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function redirectByRole() {
    const sessionRes = await fetch("/api/auth/session");
    const session = await sessionRes.json();
    const role = session?.user?.role;
    if (role === "VENDOR") {
      const userRes = await fetch("/api/profile");
      const userData = await userRes.json();
      if (userData.ok && userData.user.storeId) {
        router.push("/vendor");
      } else {
        router.push("/vendor/onboarding");
      }
    } else if (role === "ADMIN") router.push("/admin");
    else if (role === "DELIVERY") router.push("/delivery");
    else router.push("/");
  }

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-10">
      <Link href="/portal/vendedor" className="mb-4 inline-block text-sm text-emerald-600 hover:underline">
        ← Volver al portal
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Entrar a mi tienda</h1>
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
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-emerald-500"
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
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-emerald-500"
            placeholder="********"
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
          className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {loading ? "Entrando..." : "Entrar a mi tienda"}
        </button>
      </form>

      <div className="mt-6 text-sm text-[color:var(--muted)]">
        ¿No tienes cuenta?{" "}
        <Link href="/portal/vendedor?mode=register" className="text-emerald-600 underline">
          Crea tu tienda
        </Link>
      </div>
    </main>
  );
}

function VendorRegister() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-10">
      <Link href="/portal/vendedor" className="mb-4 inline-block text-sm text-emerald-600 hover:underline">
        ← Volver al portal
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Crear mi tienda</h1>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Paso 1: Crea tu cuenta. Despues configura tu tienda.
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
            setError("Tu cuenta de cliente se actualizo a vendedor. Inicia sesion con tu contraseña actual.");
            setTimeout(() => {
              const login = signIn("credentials", {
                email,
                password,
                redirect: false,
              });
              login.then((r) => {
                if (r?.ok) router.push("/vendor/onboarding");
              });
            }, 2000);
            return;
          }

          const login = await signIn("credentials", {
            email,
            password,
            redirect: false,
          });
          if (login?.ok) {
            router.push("/vendor/onboarding");
          }
        }}
      >
        <label className="block">
          <div className="text-sm font-medium">Nombre de tu negocio o nombre</div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-emerald-500"
            placeholder="Panaderia La Esquina"
          />
        </label>

        <label className="block">
          <div className="text-sm font-medium">Correo</div>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-emerald-500"
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
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-emerald-500"
            placeholder="Minimo 8 caracteres"
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
          className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {loading ? "Creando cuenta..." : "Crear cuenta"}
        </button>
      </form>

      <div className="mt-6 text-sm text-[color:var(--muted)]">
        ¿Ya tienes cuenta?{" "}
        <Link href="/portal/vendedor?mode=login" className="text-emerald-600 underline">
          Inicia sesion
        </Link>
      </div>
    </main>
  );
}
