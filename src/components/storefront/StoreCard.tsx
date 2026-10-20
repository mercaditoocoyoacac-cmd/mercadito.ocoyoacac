import Link from "next/link";
import Image from "next/image";
import { shimmerBlur } from "@/lib/images";

interface ProductPreview {
  id: string;
  name: string;
  imageUrl: string | null;
}

interface StoreCardProps {
  store: {
    name: string;
    slug: string;
    description: string | null;
    imageUrl: string | null;
    _count: { products: number };
    topProducts: ProductPreview[];
  };
  categoryLabel?: string;
  categoryIcon?: string;
  rating?: number | null;
  animationDelay?: number;
}

export function StoreCard({
  store,
  categoryLabel,
  categoryIcon,
  rating,
  animationDelay = 0,
}: StoreCardProps) {
  const previews = store.topProducts.filter((product) => product.imageUrl).slice(0, 3);
  const total = store._count.products;

  return (
    <Link
      href={`/tienda/${store.slug}`}
      style={{ animationDelay: `${animationDelay}ms` }}
      className="group flex flex-col overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card-bg)] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[var(--accent)]/30 hover:shadow-xl fade-in"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-[var(--accent-soft)]">
        {store.imageUrl ? (
          <Image
            src={store.imageUrl}
            alt=""
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            placeholder="blur"
            blurDataURL={shimmerBlur}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-5xl font-bold text-[var(--accent)]">
              {store.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-black/0 to-transparent"
        />
        {categoryLabel ? (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--card-bg)]/90 px-2.5 py-1 text-xs font-medium text-[color:var(--foreground)] shadow-sm backdrop-blur">
            {categoryIcon ? <span aria-hidden="true">{categoryIcon}</span> : null}
            {categoryLabel}
          </span>
        ) : null}
        {rating != null ? (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-[var(--card-bg)]/90 px-2.5 py-1 text-xs font-semibold text-[color:var(--foreground)] shadow-sm backdrop-blur">
            <span aria-hidden="true" className="text-[var(--gold)]">
              ★
            </span>
            {rating.toFixed(1)}
            <span className="sr-only">de 5 estrellas</span>
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h2 className="text-lg font-semibold tracking-tight transition-colors group-hover:text-[var(--accent)]">
          {store.name}
        </h2>
        {store.description ? (
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-[color:var(--muted)]">
            {store.description}
          </p>
        ) : null}

        {previews.length > 0 ? (
          <div className="mt-4 flex gap-2" aria-hidden="true">
            {previews.map((product) => (
              <span
                key={product.id}
                className="relative h-14 w-14 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]"
              >
                <Image
                  src={product.imageUrl as string}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="56px"
                  placeholder="blur"
                  blurDataURL={shimmerBlur}
                />
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-3 pt-5">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[color:var(--muted)]">
            <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            {total} producto{total === 1 ? "" : "s"}
          </span>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--accent)]">
            Ver tienda
            <svg
              aria-hidden="true"
              className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}
