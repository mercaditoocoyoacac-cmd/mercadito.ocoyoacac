import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/server/session";

export default async function AdminPortalPage() {
  const session = await getSession();
  
  if (session?.user?.id && session.user.role === "ADMIN") {
    redirect("/admin");
  }

  return (
    <main className="flex-1">
      <section className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 px-4 py-20 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white blur-3xl"></div>
          <div className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-white blur-3xl"></div>
        </div>
        
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
            ⚙️ Portal de Administración
          </div>
          
          <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">
            Gestiona tu plataforma
          </h1>
          
          <p className="mt-4 text-lg text-white/90 sm:text-xl">
            Administra usuarios, tiendas, pedidos y configuraciones desde un solo lugar.
          </p>
          
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/admin/login"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-semibold text-purple-700 shadow-lg transition-transform hover:scale-105"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m0 0h8m0 0l-4 4m4 4v8m-8-4h8" />
              </svg>
              Entrar como Admin
            </Link>
            <Link
              href="/admin/registro"
              className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-white/30 bg-white/10 px-8 py-4 text-base font-semibold backdrop-blur-sm transition-all hover:bg-white/20"
            >
              Registrarse como Admin
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16">
        <div className="grid gap-8 sm:grid-cols-3">
          <div className="rounded-xl border border-[var(--border)] bg-white p-6 text-center shadow-sm">
            <div className="text-4xl mb-3">👥</div>
            <h3 className="text-lg font-semibold">Gestión de usuarios</h3>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              Administra clientes, vendedores y repartidores
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-white p-6 text-center shadow-sm">
            <div className="text-4xl mb-3">📊</div>
            <h3 className="text-lg font-semibold">Estadísticas</h3>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              Monitorea ventas, pedidos e ingresos
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-white p-6 text-center shadow-sm">
            <div className="text-4xl mb-3">🔒</div>
            <h3 className="text-lg font-semibold">Control total</h3>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              Aprueba tiendas, gestiona membresías y contratos
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-8 text-center">
        <Link href="/" className="text-sm text-purple-600 hover:underline">
          ← Volver a la tienda
        </Link>
      </section>
    </main>
  );
}
