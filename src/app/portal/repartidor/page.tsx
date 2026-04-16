import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/server/session";

export default async function DeliveryPortalPage() {
  const session = await getSession();
  
  if (session?.user?.id && session.user.role === "DELIVERY") {
    redirect("/delivery");
  }

  return (
    <main className="flex-1">
      <section className="relative overflow-hidden bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 px-4 py-20 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white blur-3xl"></div>
          <div className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-white blur-3xl"></div>
        </div>
        
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
            🚀 Portal de Repartidores
          </div>
          
          <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">
            Entrega y gana
          </h1>
          
          <p className="mt-4 text-lg text-white/90 sm:text-xl">
            Sé parte del equipo de entregas. Trabaja cuando quieras y gana entregas en tu zona.
          </p>
          
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/delivery/registro"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-semibold text-orange-600 shadow-lg transition-transform hover:scale-105"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Registrarme como repartidor
            </Link>
            <Link
              href="/delivery/login"
              className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-white/30 bg-white/10 px-8 py-4 text-base font-semibold backdrop-blur-sm transition-all hover:bg-white/20"
            >
              Ya soy repartidor - Entrar
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16">
        <div className="grid gap-8 sm:grid-cols-3">
          <div className="rounded-xl border border-[var(--border)] bg-white p-6 text-center shadow-sm">
            <div className="text-4xl mb-3">⏰</div>
            <h3 className="text-lg font-semibold">Tu tiempo, tus reglas</h3>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              Trabaja cuando quieras, sin horarios fijos
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-white p-6 text-center shadow-sm">
            <div className="text-4xl mb-3">📍</div>
            <h3 className="text-lg font-semibold">Entregas locales</h3>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              Solo entregas en Ocoyoacac, cerca de ti
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-white p-6 text-center shadow-sm">
            <div className="text-4xl mb-3">💰</div>
            <h3 className="text-lg font-semibold">Pagos rápidos</h3>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              Recibe tus ganancias por cada entrega
            </p>
          </div>
        </div>
      </section>

      <section className="bg-orange-600 py-16 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-2xl font-bold">¿Tienes bicicleta o moto?</h2>
          <p className="mt-3 text-orange-100">
            Únete al equipo y genera ingresos extras.
          </p>
          <div className="mt-8">
            <Link
              href="/delivery/registro"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-semibold text-orange-600 shadow-lg transition-transform hover:scale-105"
            >
              Registrarme ahora
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-8 text-center">
        <Link href="/" className="text-sm text-orange-600 hover:underline">
          ← Volver a la tienda
        </Link>
      </section>
    </main>
  );
}