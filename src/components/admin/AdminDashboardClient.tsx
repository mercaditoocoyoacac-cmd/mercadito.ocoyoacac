"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/format";

interface StatsData {
  totals: {
    totalUsers: number; customerCount: number; vendorCount: number;
    deliveryCount: number; totalStores: number; activeStores: number;
    totalProducts: number; totalOrders: number; pendingOrders: number;
  };
  revenue: { totalCents: number };
  subscriptions: { activeCount: number; monthlyRevenueCents: number };
  orders: {
    recentOrders: {
      id: string; status: string; totalCents: number; currency: string;
      createdAt: string; paymentMethod: string; fulfillmentType: string;
      user: { email: string; name: string | null };
      store: { name: string };
    }[];
  };
}

function AnimatedCounter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let start = 0;
    const duration = 800;
    const step = Math.max(1, Math.floor(value / 30));
    const timer = setInterval(() => {
      start += step;
      if (start >= value) {
        setDisplay(value);
        clearInterval(timer);
      } else {
        setDisplay(start);
      }
    }, duration / 30);
    return () => clearInterval(timer);
  }, [value]);
  return <span ref={ref}>{display.toLocaleString()}{suffix}</span>;
}

function StatCard({ label, value, sub, color, icon, delay, suffix }: {
  label: string; value: number; sub?: string; color: string; icon: React.ReactNode; delay: number; suffix?: string;
}) {
  return (
    <div className={`rounded-xl border border-[var(--border)] p-5 card-hover fade-in stagger-${delay}`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-[color:var(--muted)]">{label}</div>
          <div className={`mt-1 text-2xl font-semibold ${color}`}>
            <AnimatedCounter value={value} suffix={suffix ?? ""} />
          </div>
          {sub && <div className="mt-1 text-xs text-[color:var(--muted)]">{sub}</div>}
        </div>
        <div className="h-10 w-10 rounded-lg bg-[var(--accent-soft)] flex items-center justify-center shrink-0">
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboardClient({ data }: { data: StatsData }) {
  const { totals, revenue, subscriptions, orders } = data;
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const quickActions = [
    { href: "/admin/mensajes", label: "Mensajes", icon: "💬", desc: "Soporte y reportes" },
    { href: "/admin/pedidos", label: "Pedidos", icon: "📋", desc: "Todos los pedidos" },
    { href: "/admin/envios", label: "Envíos", icon: "🛵", desc: "Supervisión de entregas" },
    { href: "/admin/membresias", label: "Membresías", icon: "🛡️", desc: "Gestionar suscripciones" },
    { href: "/admin/tiendas", label: "Tiendas", icon: "🏪", desc: "Editar datos de tiendas" },
    { href: "/admin/usuarios", label: "Usuarios", icon: "👥", desc: "Clientes y vendedores" },
    { href: "/admin/publicidad", label: "Publicidad", icon: "📣", desc: "Notificaciones a clientes" },
    { href: "/admin/productos", label: "Productos", icon: "📦", desc: "Administrar productos" },
    { href: "/admin/zonas-envio", label: "Zonas Envío", icon: "🗺️", desc: "Costos por zona geográfica" },
    { href: "/admin/membresia-cupones", label: "Cupones Membresía", icon: "🎟️", desc: "Descuentos en membresía" },
  ];

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10">
      <div className="mb-8 fade-in">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard de Administración</h1>
        <p className="mt-1 text-sm text-[color:var(--muted)]">Resumen general de la plataforma</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-8">
        <StatCard
          label="Usuarios totales"
          value={totals.totalUsers}
          sub={`${totals.customerCount} clientes, ${totals.vendorCount} vendedores, ${totals.deliveryCount} repartidores`}
          color="text-blue-600"
          delay={1}
          icon={<svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
        />
        <StatCard
          label="Tiendas"
          value={totals.totalStores}
          sub={`${totals.activeStores} activas`}
          color="text-green-600"
          delay={2}
          icon={<svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
        />
        <StatCard
          label="Productos"
          value={totals.totalProducts}
          color="text-purple-600"
          delay={3}
          icon={<svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>}
        />
        <StatCard
          label="Pedidos totales"
          value={totals.totalOrders}
          sub={`${totals.pendingOrders} pendientes`}
          color="text-orange-600"
          delay={4}
          icon={<svg className="h-5 w-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
        />
        <StatCard
          label="Ingresos totales"
          value={revenue.totalCents / 100}
          suffix=" MXN"
          sub="Pedidos completados"
          color="text-emerald-600"
          delay={5}
          icon={<svg className="h-5 w-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          label="Membresías activas"
          value={subscriptions.activeCount}
          sub={`$${(subscriptions.monthlyRevenueCents / 100).toFixed(2)} MXN/mes`}
          color="text-amber-600"
          delay={6}
          icon={<svg className="h-5 w-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3 mb-8">
        <div className="lg:col-span-2 rounded-xl border border-[var(--border)] card-hover fade-in">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
            <h2 className="font-semibold">Pedidos recientes</h2>
            <Link href="/admin/pedidos" className="text-sm text-[var(--accent)] hover:underline">Ver todos</Link>
          </div>
          {orders.recentOrders.length === 0 ? (
            <div className="p-5 text-center text-sm text-[color:var(--muted)]">No hay pedidos aún.</div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {orders.recentOrders.map((order, i) => (
                <div key={order.id} className={`flex items-center justify-between px-5 py-4 stagger-${Math.min(i + 1, 10)}`}>
                  <div>
                    <div className="font-mono text-sm">#{order.id.slice(-8).toUpperCase()}</div>
                    <div className="text-xs text-[color:var(--muted)]">
                      {order.store.name} • {order.user.name || order.user.email}
                    </div>
                    <div className="text-xs text-[color:var(--muted)]">
                      {new Date(order.createdAt).toLocaleDateString("es-MX", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      {order.fulfillmentType === "DELIVERY" ? " 🚚" : " 🏪"}
                      {order.paymentMethod === "CASH"
                        ? " 💵"
                        : order.paymentMethod === "TRANSFERENCIA"
                        ? " 💜"
                        : " 💳"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatMoney(order.totalCents, order.currency)}</div>
                    <div className={`text-xs ${
                      order.status === "COMPLETED" ? "text-green-600" :
                      order.status === "PENDING" ? "text-yellow-600" :
                      order.status === "CANCELLED" ? "text-red-600" :
                      "text-blue-600"
                    }`}>
                      {order.status === "COMPLETED" ? "✅ Completado" :
                       order.status === "PENDING" ? "⏳ Pendiente" :
                       order.status === "CANCELLED" ? "❌ Cancelado" :
                       order.status === "OUT_FOR_DELIVERY" ? "🚚 En camino" :
                       order.status === "CONFIRMED" ? "✓ Confirmado" :
                       order.status === "READY" ? "📦 Listo" : order.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-[var(--border)] card-hover fade-in">
          <div className="border-b border-[var(--border)] px-5 py-4">
            <h2 className="font-semibold">Acceso rápido</h2>
          </div>
          <div className="p-4 space-y-3">
            {quickActions.map((item, i) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg p-3 hover:bg-[var(--accent-soft)] transition-all active:scale-[0.98] stagger-${i + 1}`}
              >
                <span className="text-lg">{item.icon}</span>
                <div>
                  <div className="text-sm font-medium">{item.label}</div>
                  <div className="text-xs text-[color:var(--muted)]">{item.desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
