import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { shimmerBlur } from "@/lib/images";
import { prisma } from "@/server/prisma";
import { getSession } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getSession();
  const role = session?.user?.role;
  const additionalRoles = session?.user?.additionalRoles;
  const hasExtraRoles = additionalRoles && additionalRoles.length > 0;
  if (role === "VENDOR" && !hasExtraRoles) redirect("/vendor");
  if (role === "DELIVERY" && !hasExtraRoles) redirect("/delivery");
  if (role === "ADMIN" && !hasExtraRoles) redirect("/admin");

  const storeCount = await prisma.store.count({ where: { isActive: true, isPublished: true } });
  const productCount = await prisma.product.count({ where: { isActive: true } });

  const featuredStores = await prisma.store.findMany({
    where: { isActive: true, isPublished: true },
    select: { id: true, name: true, slug: true, imageUrl: true, description: true },
    take: 6,
  });

  return (
    <main className="flex-1">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-amber-700 via-orange-600 to-rose-700 px-4 py-20 text-white">
        <div className="absolute inset-0 opacity-[0.08]">
          <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="pueblo" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M0 10 L10 0 L20 10 L10 20 Z" fill="currentColor" />
                <circle cx="10" cy="10" r="2" fill="currentColor" />
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#pueblo)" />
          </svg>
        </div>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white blur-3xl"></div>
          <div className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-white blur-3xl"></div>
          <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-300 blur-3xl"></div>
        </div>

        <div className="relative mx-auto max-w-6xl animate-slide-up">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-200/20 px-4 py-1.5 text-sm font-medium backdrop-blur-sm border border-amber-200/10">
              🛒 Compra local en Ocoyoacac
            </div>

            <h1 className="mt-6 text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              Todo lo que{" "}
              <span className="text-amber-200">necesitas</span>,<br/>
              cerca de ti
            </h1>

            <p className="mt-6 text-xl leading-relaxed text-white/90">
              Descubre los mejores productos de tu comunidad. Compra directo a vendedores locales
              y recibe tus pedidos en minutos.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/tiendas"
                className="inline-flex items-center justify-center gap-3 rounded-2xl bg-white px-8 py-4 text-lg font-bold text-amber-700 shadow-2xl transition-all duration-300 hover:scale-105 hover:shadow-xl active:scale-[0.98]"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Explorar tiendas
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-3 rounded-2xl border-2 border-white/40 px-8 py-4 text-lg font-bold text-white backdrop-blur-sm transition-all duration-300 hover:bg-white/10 hover:border-white/60 active:scale-[0.98]"
              >
                Iniciar sesión
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="mx-auto max-w-6xl px-4 py-10 animate-slide-up-sm">
        <div className="flex flex-wrap items-center justify-center gap-8 text-center">
          <div className="animate-fade-in">
            <div className="text-4xl font-bold text-amber-600">{storeCount}</div>
            <div className="text-sm text-stone-600">Tiendas locales</div>
          </div>
          <div className="h-12 w-px bg-amber-200"></div>
          <div className="animate-fade-in animate-stagger-1">
            <div className="text-4xl font-bold text-amber-600">{productCount}</div>
            <div className="text-sm text-stone-600">Productos</div>
          </div>
          <div className="h-12 w-px bg-amber-200"></div>
          <div className="animate-fade-in animate-stagger-2">
            <div className="text-4xl font-bold text-amber-600">🚚</div>
            <div className="text-sm text-stone-600">Entrega misma día</div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-gradient-to-b from-amber-50 to-orange-50 py-20">
        <div className="mx-auto max-w-4xl px-4 text-center animate-slide-up">
          <h2 className="text-3xl font-bold text-stone-800">¿Cómo funciona?</h2>
          <p className="mt-3 text-stone-600">Tres pasos para recibir tus productos</p>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            <div className="animate-slide-up-sm animate-stagger-1">
              <div className="mx-auto h-20 w-20 rounded-3xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-3xl font-bold text-white shadow-lg shadow-amber-200">
                1
              </div>
              <h3 className="mt-5 text-lg font-bold text-stone-800">Elige una tienda</h3>
               <p className="mt-2 text-sm text-stone-600">
                Explora las tiendas locales y encuentra lo que necesitas
              </p>
            </div>
            <div className="animate-slide-up-sm animate-stagger-2">
              <div className="mx-auto h-20 w-20 rounded-3xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center text-3xl font-bold text-white shadow-lg shadow-teal-200">
                2
              </div>
              <h3 className="mt-5 text-lg font-bold text-stone-800">Agrega al carrito</h3>
              <p className="mt-2 text-sm text-stone-600">
                Elige tus productos y paga cuando recibas
              </p>
            </div>
            <div className="animate-slide-up-sm animate-stagger-3">
              <div className="mx-auto h-20 w-20 rounded-3xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg shadow-rose-200">
                3
              </div>
              <h3 className="mt-5 text-lg font-bold text-stone-800">Recibe en casa</h3>
              <p className="mt-2 text-sm text-stone-600">
                Lo recibes el mismo día o pasando a recoger
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Stores */}
      {featuredStores.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-20 animate-slide-up">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-stone-800">Tiendas destacadas</h2>
            <p className="mt-2 text-stone-600">Descubre las tiendas más populares de tu comunidad</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredStores.map((store, idx) => (
              <Link
                key={store.id}
                href={`/tienda/${store.slug}`}
                className={`group rounded-2xl border border-amber-200 bg-gradient-to-b from-white to-amber-50/30 p-6 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-2 hover:border-amber-300 animate-slide-up-sm animate-stagger-${Math.min(idx + 1, 6)}`}
              >
                {store.imageUrl ? (
                  <div className="relative h-36 overflow-hidden rounded-xl">
                    <Image
                      src={store.imageUrl}
                      alt={store.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      placeholder="blur"
                      blurDataURL={shimmerBlur}
                      priority={idx < 3}
                    />
                  </div>
                ) : (
                  <div className="flex h-36 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 text-5xl">
                    🏪
                  </div>
                )}
                <h3 className="mt-4 text-lg font-bold text-stone-800 group-hover:text-amber-700 transition-colors">
                  {store.name}
                </h3>
                {store.description && (
                  <p className="mt-1.5 text-sm text-stone-600 line-clamp-2">
                    {store.description}
                  </p>
                )}
              </Link>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link
              href="/tiendas"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-3 text-sm font-bold text-white shadow-md transition-all duration-300 hover:shadow-lg hover:from-amber-700 hover:to-orange-700 active:scale-[0.97]"
            >
              Ver todas las tiendas
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-amber-700 via-orange-600 to-rose-700 py-20 text-white">
        <div className="absolute inset-0 opacity-[0.06]">
          <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <rect width="100" height="100" fill="url(#pueblo)" />
          </svg>
        </div>
        <div className="relative mx-auto max-w-4xl px-4 text-center animate-slide-up">
          <h2 className="text-3xl font-bold">¿Listo para comprar?</h2>
          <p className="mt-3 text-amber-100">
            Explora las tiendas de tu zona y encuentra lo que necesitas
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/tiendas"
              className="rounded-xl bg-white px-8 py-4 text-lg font-bold text-amber-700 shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl active:scale-[0.98]"
            >
              Ver tiendas
            </Link>
            <Link
              href="/login"
              className="rounded-xl border-2 border-white/30 px-8 py-4 text-lg font-bold text-white backdrop-blur-sm transition-all duration-300 hover:bg-white/10 hover:border-white/50 active:scale-[0.98]"
            >
              Iniciar sesión
            </Link>
          </div>
        </div>
      </section>

      {/* Footer Links */}
      <section className="mx-auto max-w-6xl px-4 py-10 text-center">
        <div className="flex flex-wrap items-center justify-center gap-8 text-sm">
          <Link href="/login" className="text-stone-600 hover:text-stone-800 transition-colors hover:underline">
            Iniciar sesión
          </Link>
          <Link href="/portal/vendedor" className="text-amber-600 font-semibold hover:text-amber-700 transition-colors hover:underline">
            ¿Eres vendedor? →
          </Link>
          <Link href="/portal/repartidor" className="text-teal-600 font-semibold hover:text-teal-700 transition-colors hover:underline">
            ¿Quieres entregar? →
          </Link>
        </div>
      </section>
    </main>
  );
}
