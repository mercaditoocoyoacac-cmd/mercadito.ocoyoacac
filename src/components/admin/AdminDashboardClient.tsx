"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/format";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";

interface StatsData {
  totals: {
    totalUsers: number; customerCount: number; vendorCount: number;
    deliveryCount: number; totalStores: number; activeStores: number;
    totalProducts: number; totalOrders: number;
  };
  revenue: {
    totalCents: number; byDay: { date: string; revenue: number; orders: number }[];
    topVendors: { name: string; revenueCents: number }[];
  };
  orders: {
    statusCounts: { name: string; value: number; color: string }[];
    byDay: { date: string; count: number }[];
    recentOrders: {
      id: string; status: string; totalCents: number; currency: string;
      createdAt: string; paymentMethod: string; fulfillmentType: string;
      user: { email: string; name: string | null };
      store: { name: string };
    }[];
  };
  subscriptions: {
    total: number; byStatus: { name: string; value: number; color: string }[];
    activeCount: number; monthlyRevenueCents: number;
  };
  categories: { name: string; count: number }[];
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

function ChartCard({ title, subtitle, children, delay }: {
  title: string; subtitle?: string; children: React.ReactNode; delay: number;
}) {
  return (
    <div className={`rounded-xl border border-[var(--border)] card-hover fade-in stagger-${delay}`}>
      <div className="border-b border-[var(--border)] px-5 py-4">
        <h2 className="font-semibold">{title}</h2>
        {subtitle && <p className="text-xs text-[color:var(--muted)] mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-5">
        {children}
      </div>
    </div>
  );
}

export default function AdminDashboardClient({ data }: { data: StatsData }) {
  const { totals, revenue, orders, subscriptions, categories } = data;
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const totalOrdersCount = orders.statusCounts.reduce((s, c) => s + c.value, 0);

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10">
      <div className="mb-8 fade-in">
        <h1 className="text-2xl font-semibold tracking-tight">
          Dashboard de Administración
        </h1>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          Resumen financiero, membresías y logística
        </p>
      </div>

      {/* Quick Stats */}
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
          sub={`${orders.statusCounts[0].value} pendientes`}
          color="text-orange-600"
          delay={4}
          icon={<svg className="h-5 w-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
        />
        <StatCard
          label="Ingresos totales"
          value={revenue.totalCents / 100}
          suffix=" MXN"
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

      {/* Financial Section */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 fade-in">
          <svg className="h-5 w-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
          Financiero
        </h2>
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartCard title="Ingresos diarios (30 días)" subtitle="Pedidos completados por día" delay={1}>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={revenue.byDay}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v / 100).toFixed(0)}`} />
                <Tooltip formatter={((v: number) => formatMoney(v, "MXN")) as any} />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="url(#revenueGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Ingresos totales" subtitle="Distribución por tienda" delay={2}>
            <div className="text-3xl font-bold text-emerald-600 mb-4">
              {formatMoney(revenue.totalCents, "MXN")}
            </div>
            <div className="space-y-2">
              {revenue.topVendors.map((v, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="truncate max-w-[60%]">{v.name}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-1000"
                        style={{ width: `${Math.min(100, (v.revenueCents / Math.max(...revenue.topVendors.map(x => x.revenueCents))) * 100)}%` }}
                      />
                    </div>
                    <span className="font-medium text-xs w-20 text-right">{formatMoney(v.revenueCents, "MXN")}</span>
                  </div>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>
      </div>

      {/* Membership Section */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 fade-in">
          <svg className="h-5 w-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          Membresías
        </h2>
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartCard title="Estado de membresías" subtitle={`${subscriptions.total} totales`} delay={3}>
            <div className="flex items-center gap-8">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie data={subscriptions.byStatus} cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={3} dataKey="value">
                    {subscriptions.byStatus.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {subscriptions.byStatus.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-[color:var(--muted)]">{s.name}</span>
                    <span className="font-semibold">{s.value}</span>
                  </div>
                ))}
                <div className="pt-2 border-t border-[var(--border)] mt-2">
                  <div className="text-xs text-[color:var(--muted)]">Ingreso mensual recurrente</div>
                  <div className="text-lg font-bold text-amber-600">{formatMoney(subscriptions.monthlyRevenueCents, "MXN")}</div>
                </div>
              </div>
            </div>
          </ChartCard>

          <ChartCard title="Categorías de tiendas" subtitle="Distribución por tipo" delay={4}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={categories} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={110} tickFormatter={(v: string) => v.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase())} />
                <Tooltip formatter={((v: number) => `${v} tiendas`) as any} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {(categories || []).map((_, i) => (
                    <Cell key={i} fill={["#10b981","#3b82f6","#f97316","#a855f7","#eab308","#ef4444","#06b6d4","#ec4899"][i % 8]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>

      {/* Logistics Section */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 fade-in">
          <svg className="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>
          Logística
        </h2>
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartCard title="Pedidos por estado" subtitle={`${totalOrdersCount} en total`} delay={5}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={orders.statusCounts}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={((v: number) => `${v} pedidos`) as any} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {orders.statusCounts.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Volumen de pedidos (14 días)" subtitle="Pedidos por día" delay={6}>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={orders.byDay}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip formatter={((v: number) => `${v} pedidos`) as any} />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>

      {/* Recent Orders + Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-3 mb-8">
        <div className="lg:col-span-2 rounded-xl border border-[var(--border)] card-hover fade-in">
          <div className="border-b border-[var(--border)] px-5 py-4">
            <h2 className="font-semibold">Pedidos recientes</h2>
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
                      {order.paymentMethod === "CASH" ? " 💵" : " 💳"}
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

        {/* Quick Actions */}
        <div className="rounded-xl border border-[var(--border)] card-hover fade-in">
          <div className="border-b border-[var(--border)] px-5 py-4">
            <h2 className="font-semibold">Acceso rápido</h2>
          </div>
          <div className="p-4 space-y-3">
            {[
              { href: "/admin/membresias", label: "Membresías", icon: "🛡️", desc: "Gestionar suscripciones" },
              { href: "/admin/usuarios", label: "Usuarios", icon: "👥", desc: "Clientes y vendedores" },
              { href: "/admin/tiendas", label: "Tiendas", icon: "🏪", desc: "Editar datos de tiendas" },
              { href: "/admin/productos", label: "Productos", icon: "📦", desc: "Administrar productos" },
              { href: "/admin/pedidos", label: "Pedidos", icon: "📋", desc: "Todos los pedidos" },
              { href: "/admin/ranking", label: "Ranking", icon: "⭐", desc: "Calificaciones" },
            ].map((item, i) => (
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
