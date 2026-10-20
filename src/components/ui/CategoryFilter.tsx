import Link from "next/link";

interface Category {
  key: string;
  label: string;
  icon: string;
}

export function CategoryFilter({
  categories,
  selected,
  baseUrl,
  query,
}: {
  categories: Category[];
  selected: string;
  baseUrl: string;
  query?: string;
}) {
  const buildHref = (key?: string) => {
    const params = new URLSearchParams();
    if (key) params.set("category", key);
    if (query?.trim()) params.set("q", query.trim());
    const qs = params.toString();
    return qs ? `${baseUrl}?${qs}` : baseUrl;
  };

  const chip =
    "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors";
  const idle =
    "border-[var(--border)] bg-[var(--card-bg)] text-[color:var(--muted)] hover:border-[var(--accent)]/40 hover:text-[color:var(--foreground)]";
  const active = "border-[var(--accent)] bg-[var(--accent)] text-[var(--on-accent)]";

  return (
    <nav aria-label="Filtrar por categoría" className="-mx-4 overflow-x-auto px-4 scrollbar-hide">
      <div className="flex w-max gap-2 py-1">
        <Link
          href={buildHref()}
          aria-current={!selected ? "page" : undefined}
          className={`${chip} ${!selected ? active : idle}`}
        >
          <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          Todas
        </Link>
        {categories.map((cat) => {
          const isActive = selected === cat.key;
          return (
            <Link
              key={cat.key}
              href={buildHref(cat.key)}
              aria-current={isActive ? "page" : undefined}
              className={`${chip} ${isActive ? active : idle}`}
            >
              {cat.icon ? (
                <span aria-hidden="true" className="text-base leading-none">
                  {cat.icon}
                </span>
              ) : null}
              {cat.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
