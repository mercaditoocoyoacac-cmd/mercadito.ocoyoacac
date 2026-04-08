import Link from "next/link";
import { prisma } from "@/server/prisma";

export const dynamic = "force-dynamic";

export default async function Home() {
  const storeCount = await prisma.store.count({ where: { isActive: true } });
  const productCount = await prisma.product.count({ where: { isActive: true } });

  return (
    <main className="flex-1">
      <section className="relative overflow-hidden bg-gradient-to-br from-[var(--accent)] via-[var(--accent-hover)] to-[var(--accent)] px-4 py-20 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white blur-3xl"></div>
          <div className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-white blur-3xl"></div>
        </div>
        
        <div className="relative mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-white"></span>
              </span>
              Entrega en Ocoyoacac
            </div>
            
            <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Compra local,{" "}
              <span className="text-yellow-300">recibe cercano</span>
            </h1>
            
            <p className="mt-6 text-lg leading-relaxed text-white/90 sm:text-xl">
              Descubre los mejores productos de tu comunidad. 
              Compre directamente a vendedores locales de Ocoyoacac 
              y recibe tus pedidos en minutos.
            </p>
            
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/tiendas"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-semibold text-[var(--accent)] shadow-lg transition-transform hover:scale-105 hover:bg-yellow-50"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Ver tiendas
              </Link>
              <Link
                href="/vendor/registro"
                className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-white/50 bg-white/10 px-8 py-4 text-base font-semibold backdrop-blur-sm transition-all hover:border-white hover:bg-white/20"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Vender en Mercadito
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-8 sm:grid-cols-3">
          <div className="group relative rounded-2xl border border-[var(--border)] bg-white p-8 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1">
            <div className="absolute -top-4 left-6 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-2xl shadow-sm">
              🏪
            </div>
            <div className="mt-4">
              <h3 className="text-lg font-semibold">Tiendas locales</h3>
              <p className="mt-2 text-sm text-[color:var(--muted)]">
                Explora negocios de tu comunidad. Panaderías, restaurants, abarrotes y más.
              </p>
            </div>
          </div>
          
          <div className="group relative rounded-2xl border border-[var(--border)] bg-white p-8 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1">
            <div className="absolute -top-4 left-6 flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 text-2xl shadow-sm">
              🚀
            </div>
            <div className="mt-4">
              <h3 className="text-lg font-semibold">Entrega rápida</h3>
              <p className="mt-2 text-sm text-[color:var(--muted)]">
                Recibe tus pedidos el mismo día. Recoge en tienda o te lo llevamos.
              </p>
            </div>
          </div>
          
          <div className="group relative rounded-2xl border border-[var(--border)] bg-white p-8 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1">
            <div className="absolute -top-4 left-6 flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-100 text-2xl shadow-sm">
              💳
            </div>
            <div className="mt-4">
              <h3 className="text-lg font-semibold">Pago seguro</h3>
              <p className="mt-2 text-sm text-[color:var(--muted)]">
                Paga cuando recibas. Efectivo, transferencia o contraentrega.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[var(--accent-soft)] py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-8 sm:grid-cols-2">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                ¿Tienes un negocio en Ocoyoacac?
              </h2>
              <p className="mt-3 text-[color:var(--muted)]">
                Llega a más clientes sin complicaciones. Crea tu tienda digital 
                en minutos y comienza a vender online hoy.
              </p>
              <ul className="mt-6 space-y-3">
                <li className="flex items-center gap-3">
                  <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Crea tu tienda gratis</span>
                </li>
                <li className="flex items-center gap-3">
                  <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Sube productos con fotos</span>
                </li>
                <li className="flex items-center gap-3">
                  <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Gestiona pedidos fácil</span>
                </li>
              </ul>
              <div className="mt-8">
                <Link
                  href="/vendor/registro"
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-3 font-semibold text-white shadow-lg transition-transform hover:scale-105 hover:bg-[var(--accent-hover)]"
                >
                  Crear mi tienda
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </div>
            </div>
            
            <div className="flex items-center justify-center">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl bg-white p-6 text-center shadow-md">
                  <div className="text-3xl font-bold text-[var(--accent)]">{storeCount}</div>
                  <div className="mt-1 text-sm text-[color:var(--muted)]">Tiendas</div>
                </div>
                <div className="rounded-2xl bg-white p-6 text-center shadow-md">
                  <div className="text-3xl font-bold text-[var(--accent)]">{productCount}</div>
                  <div className="mt-1 text-sm text-[color:var(--muted)]">Productos</div>
                </div>
                <div className="col-span-2 rounded-2xl bg-[var(--accent)] p-6 text-center text-white shadow-md">
                  <div className="text-xl font-bold">100% Local</div>
                  <div className="mt-1 text-sm text-white/80">Apoya a tu comunidad</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 text-center">
        <h2 className="text-2xl font-bold tracking-tight">
          ¿Listo para empezar?
        </h2>
        <p className="mx-auto mt-3 max-w-md text-[color:var(--muted)]">
          Explora las tiendas de tu zona o crea la tuya propia.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/tiendas"
            className="rounded-xl border border-[var(--border)] px-6 py-3 font-medium transition-colors hover:bg-[var(--accent-soft)]"
          >
            Ver tiendas →
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-[var(--border)] px-6 py-3 font-medium transition-colors hover:bg-[var(--accent-soft)]"
          >
            Iniciar sesión
          </Link>
        </div>
      </section>
    </main>
  );
}
