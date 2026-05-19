import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
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
      <section className="relative overflow-hidden bg-gradient-to-br from-rose-500 via-rose-600 to-rose-700 px-4 py-20 text-white">
        <div className="absolute inset-0 opacity-15">
          <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white blur-3xl"></div>
          <div className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-white blur-3xl"></div>
          <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/20 blur-3xl"></div>
        </div>
        
        <div className="relative mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
              🛒 Compra local en Ocoyoacac
            </div>
            
            <h1 className="mt-6 text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              Todo lo que{" "}
              <span className="text-rose-200">necesitas</span>,<br/>
              cerca de ti
            </h1>
            
            <p className="mt-6 text-xl leading-relaxed text-white/90">
              Descubre los mejores productos de tu comunidad. Compra directo a vendedores locales 
              y recibe tus pedidos en minutos.
            </p>
            
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/tiendas"
                className="inline-flex items-center justify-center gap-3 rounded-2xl bg-white px-8 py-4 text-lg font-bold text-rose-600 shadow-2xl transition-all hover:scale-105 hover:shadow-xl"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Explorar tiendas
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-center gap-8 text-center">
          <div>
            <div className="text-4xl font-bold text-rose-600">{storeCount}</div>
            <div className="text-sm text-[color:var(--muted)]">Tiendas locales</div>
          </div>
          <div className="h-12 w-px bg-[var(--border)]"></div>
          <div>
            <div className="text-4xl font-bold text-rose-600">{productCount}</div>
            <div className="text-sm text-[color:var(--muted)]">Productos</div>
          </div>
          <div className="h-12 w-px bg-[var(--border)]"></div>
          <div>
            <div className="text-4xl font-bold text-rose-600">📦</div>
            <div className="text-sm text-[color:var(--muted)]">Entrega misma día</div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-rose-50 py-16">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-2xl font-bold">¿Cómo funciona?</h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            <div>
              <div className="mx-auto h-16 w-16 rounded-2xl bg-rose-100 flex items-center justify-center text-3xl">1</div>
              <h3 className="mt-4 font-semibold">Elige una tienda</h3>
              <p className="mt-2 text-sm text-[color:var(--muted)]">
                Explora las tiendas locales y encuentra lo que necesitas
              </p>
            </div>
            <div>
              <div className="mx-auto h-16 w-16 rounded-2xl bg-rose-100 flex items-center justify-center text-3xl">2</div>
              <h3 className="mt-4 font-semibold">Agrega al carrito</h3>
              <p className="mt-2 text-sm text-[color:var(--muted)]">
                Elige tus productos y paga cuando recibas
              </p>
            </div>
            <div>
              <div className="mx-auto h-16 w-16 rounded-2xl bg-rose-100 flex items-center justify-center text-3xl">3</div>
              <h3 className="mt-4 font-semibold">Recibe en casa</h3>
              <p className="mt-2 text-sm text-[color:var(--muted)]">
                Lo recibes el mismo día o pasando a recoger
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Stores */}
      {featuredStores.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-2xl font-bold">Tiendas destacadas</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredStores.map((store) => (
              <Link
                key={store.id}
                href={`/tienda/${store.slug}`}
                className="group rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1"
              >
                {store.imageUrl ? (
                  <div className="relative h-32 overflow-hidden rounded-xl">
                    <Image 
                      src={store.imageUrl} 
                      alt={store.name}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  </div>
                ) : (
                  <div className="flex h-32 items-center justify-center rounded-xl bg-rose-100 text-5xl">
                    🏪
                  </div>
                )}
                <h3 className="mt-4 text-lg font-semibold group-hover:text-rose-600">
                  {store.name}
                </h3>
                {store.description && (
                  <p className="mt-1 text-sm text-[color:var(--muted)] line-clamp-2">
                    {store.description}
                  </p>
                )}
              </Link>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link
              href="/tiendas"
              className="inline-flex items-center gap-2 text-rose-600 hover:underline"
            >
              Ver todas las tiendas →
            </Link>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="bg-rose-600 py-16 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-2xl font-bold">¿Listo para comprar?</h2>
          <p className="mt-3 text-rose-100">
            Explora las tiendas de tu zona y encuentra lo que necesitas
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/tiendas"
              className="rounded-xl bg-white px-6 py-3 font-semibold text-rose-600 shadow-lg transition-all hover:scale-105"
            >
              Ver tiendas
            </Link>
            <Link
              href="/login"
              className="rounded-xl border-2 border-white/30 px-6 py-3 font-semibold transition-all hover:bg-white/10"
            >
              Iniciar sesión
            </Link>
          </div>
        </div>
      </section>

      {/* Footer Links */}
      <section className="mx-auto max-w-6xl px-4 py-8 text-center">
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
          <Link href="/login" className="text-[color:var(--muted)] hover:underline">
            Iniciar sesión
          </Link>
          <Link href="/portal/vendedor" className="text-rose-600 font-medium hover:underline">
            ¿Eres vendedor? →
          </Link>
          <Link href="/portal/repartidor" className="text-orange-600 font-medium hover:underline">
            ¿Quieres entregar? →
          </Link>
        </div>
      </section>
    </main>
  );
}