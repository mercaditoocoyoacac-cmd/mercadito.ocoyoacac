"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const groups: { title: string; items: { href: string; label: string }[] }[] = [
  {
    title: "Operación",
    items: [
      { href: "/admin", label: "Resumen" },
      { href: "/admin/pedidos", label: "Pedidos" },
      { href: "/admin/envios", label: "Envíos" },
      { href: "/admin/zonas-envio", label: "Zonas de envío" },
      { href: "/admin/repartidores", label: "Repartidores" },
    ],
  },
  {
    title: "Negocios",
    items: [
      { href: "/admin/tiendas", label: "Tiendas" },
      { href: "/admin/productos", label: "Productos" },
      { href: "/admin/categorias", label: "Categorías" },
      { href: "/admin/aprobacion", label: "Aprobación" },
      { href: "/admin/ranking", label: "Ranking" },
    ],
  },
  {
    title: "Promoción",
    items: [
      { href: "/admin/cupones", label: "Cupones" },
      { href: "/admin/membresia-cupones", label: "Cupones de membresía" },
      { href: "/admin/promociones", label: "Promociones" },
      { href: "/admin/publicidad", label: "Publicidad" },
    ],
  },
  {
    title: "Gestión",
    items: [
      { href: "/admin/membresias", label: "Membresías" },
      { href: "/admin/usuarios", label: "Usuarios" },
      { href: "/admin/mercado-pago", label: "Pagos" },
      { href: "/admin/informes", label: "Informes" },
      { href: "/admin/mensajes", label: "Mensajes" },
    ],
  },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-semibold tracking-tight">Administración</h1>
        <Link href="/" className="text-sm text-[color:var(--muted)] hover:text-[color:var(--text)]">
          Volver al sitio
        </Link>
      </div>

      <nav aria-label="Secciones de administración" className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)]">
        {groups.map((group) => (
          <div key={group.title} className="flex flex-col gap-2 border-b border-[var(--border)] px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:gap-6">
            <div className="w-32 shrink-0 text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
              {group.title}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {group.items.map((item) => {
                const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href + "/"));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                      active
                        ? "bg-[var(--accent-soft)] font-medium text-[var(--accent-strong)]"
                        : "text-[color:var(--muted)] hover:bg-[var(--surface)] hover:text-[color:var(--text)]"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
}
