import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/server/session";

export default async function VendorPortalPage() {
  const session = await getSession();
  
  if (session?.user?.id && session.user.role === "VENDOR") {
    redirect("/vendor");
  }

  return (
    <main className="flex-1">
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-700 px-4 py-20 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white blur-3xl"></div>
          <div className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-white blur-3xl"></div>
        </div>
        
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
            🏪 Portal de Vendedores
          </div>
          
          <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">
            Haz crecer tu negocio
          </h1>
          
          <p className="mt-4 text-lg text-white/90 sm:text-xl">
            Crea tu tienda digital y-reaching a más clientes en tu comunidad.
          </p>
          
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/vendor/registro"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-semibold text-emerald-700 shadow-lg transition-transform hover:scale-105"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Crear mi tienda
            </Link>
            <Link
              href="/vendor/login"
              className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-white/30 bg-white/10 px-8 py-4 text-base font-semibold backdrop-blur-sm transition-all hover:bg-white/20"
            >
              Ya tengo tienda - Entrar
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
            <h3 className="text-lg font-semibold">Gestión fácil</h3>
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
          <h2 className="text-2xl font-bold">¿Listo para vender?</h2>
          <p className="mt-3 text-emerald-100">
            Crea tu tienda por solo $496/mes.
          </p>
          <div className="mt-8">
            <Link
              href="/vendor/registro"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-semibold text-emerald-700 shadow-lg transition-transform hover:scale-105"
            >
              Crear mi tienda
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-8 text-center">
        <Link href="/" className="text-sm text-emerald-600 hover:underline">
          ← Volver a la tienda
        </Link>
      </section>
    </main>
  );
}