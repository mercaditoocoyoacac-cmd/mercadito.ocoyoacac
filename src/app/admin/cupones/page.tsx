"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type Store = { id: string; name: string; slug: string };
type Coupon = {
  id: string;
  code: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  minPurchaseCents: number | null;
  maxUses: number | null;
  usedCount: number;
  maxUsesPerUser: number | null;
  isActive: boolean;
  startsAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  store: Store;
};

const emptyForm = {
  storeId: "",
  code: "",
  discountType: "PERCENTAGE" as "PERCENTAGE" | "FIXED",
  discountValue: 0,
  minPurchaseCents: "",
  maxUses: "",
  maxUsesPerUser: "",
  startsAt: "",
  expiresAt: "",
};

export default function AdminCuponesPage() {
  const router = useRouter();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setLoading(true);
    const [cRes, sRes] = await Promise.all([
      fetch("/api/admin/coupons"),
      fetch("/api/admin/stores"),
    ]);
    if (cRes.status === 401) { router.push("/admin/login"); return; }
    const cData = await cRes.json();
    const sData = await sRes.json();
    if (cData.ok) setCoupons(cData.coupons);
    if (sData.ok) setStores(sData.stores || sData.data || []);
    setLoading(false);
  }

  useEffect(() => { load() }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.storeId || !form.code || !form.discountValue) {
      toast.error("Completa los campos obligatorios.");
      return;
    }
    const body: Record<string, unknown> = {
      storeId: form.storeId,
      code: form.code,
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
    };
    if (form.minPurchaseCents) body.minPurchaseCents = Number(form.minPurchaseCents);
    if (form.maxUses) body.maxUses = Number(form.maxUses);
    if (form.maxUsesPerUser) body.maxUsesPerUser = Number(form.maxUsesPerUser);
    if (form.startsAt) body.startsAt = new Date(form.startsAt).toISOString();
    if (form.expiresAt) body.expiresAt = new Date(form.expiresAt).toISOString();

    const res = await fetch("/api/admin/coupons", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      toast.error(data.error || "Error al crear cupón.");
      return;
    }
    toast.success("Cupón creado.");
    setForm(emptyForm);
    setShowForm(false);
    load();
  }

  async function toggleActive(coupon: Coupon) {
    const res = await fetch(`/api/admin/coupons/${coupon.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isActive: !coupon.isActive }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) { toast.error(data.error || "Error"); return; }
    toast.success(coupon.isActive ? "Cupón desactivado" : "Cupón activado");
    load();
  }

  async function deleteCoupon(coupon: Coupon) {
    if (!confirm(`¿Eliminar cupón "${coupon.code}"?`)) return;
    const res = await fetch(`/api/admin/coupons/${coupon.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok || !data.ok) { toast.error(data.error || "Error"); return; }
    toast.success("Cupón eliminado.");
    load();
  }

  if (loading) {
    return <div className="p-6 text-center text-[color:var(--muted)]">Cargando...</div>;
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Cupones de descuento</h1>
          <p className="text-sm text-[color:var(--muted)]">Crea y administra códigos promocionales</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
        >
          {showForm ? "Cancelar" : "+ Nuevo cupón"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-8 rounded-xl border border-[var(--border)] bg-white p-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-[color:var(--muted)] mb-1">Tienda *</label>
              <select name="storeId" value={form.storeId} onChange={handleChange} required className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
                <option value="">Seleccionar tienda...</option>
                {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[color:var(--muted)] mb-1">Código *</label>
              <input name="code" value={form.code} onChange={handleChange} placeholder="BIENVENIDO10" className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm uppercase" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[color:var(--muted)] mb-1">Tipo *</label>
              <select name="discountType" value={form.discountType} onChange={handleChange} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
                <option value="PERCENTAGE">% Porcentaje</option>
                <option value="FIXED">$ Monto fijo</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[color:var(--muted)] mb-1">
                {form.discountType === "PERCENTAGE" ? "Porcentaje *" : "Monto ($) *"}
              </label>
              <input name="discountValue" type="number" min="1" value={form.discountValue} onChange={handleChange} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[color:var(--muted)] mb-1">Compra mínima ($)</label>
              <input name="minPurchaseCents" type="number" min="0" value={form.minPurchaseCents} onChange={handleChange} placeholder="0 = sin mínimo" className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[color:var(--muted)] mb-1">Usos máximos</label>
              <input name="maxUses" type="number" min="1" value={form.maxUses} onChange={handleChange} placeholder="Sin límite" className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[color:var(--muted)] mb-1">Usos por usuario</label>
              <input name="maxUsesPerUser" type="number" min="1" value={form.maxUsesPerUser} onChange={handleChange} placeholder="Sin límite" className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[color:var(--muted)] mb-1">Válido desde</label>
              <input name="startsAt" type="datetime-local" value={form.startsAt} onChange={handleChange} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[color:var(--muted)] mb-1">Válido hasta</label>
              <input name="expiresAt" type="datetime-local" value={form.expiresAt} onChange={handleChange} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
            </div>
          </div>
          <button type="submit" className="rounded-lg bg-[var(--accent)] px-6 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]">
            Crear cupón
          </button>
        </form>
      )}

      <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-gray-50">
              <th className="px-4 py-3 text-left font-medium">Código</th>
              <th className="px-4 py-3 text-left font-medium">Tienda</th>
              <th className="px-4 py-3 text-left font-medium">Descuento</th>
              <th className="px-4 py-3 text-left font-medium">Usos</th>
              <th className="px-4 py-3 text-left font-medium">Vigencia</th>
              <th className="px-4 py-3 text-left font-medium">Estado</th>
              <th className="px-4 py-3 text-left font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {coupons.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[color:var(--muted)]">Sin cupones aún</td>
              </tr>
            )}
            {coupons.map((coupon, idx) => {
              const now = new Date();
              const expired = coupon.expiresAt && new Date(coupon.expiresAt) < now;
              const notStarted = coupon.startsAt && new Date(coupon.startsAt) > now;
              const discountLabel = coupon.discountType === "PERCENTAGE" ? `${coupon.discountValue}%` : `$${(coupon.discountValue / 100).toFixed(2)}`;
              return (
                <tr key={coupon.id} style={{ animationDelay: `${idx * 40}ms` }} className="border-b border-[var(--border)] hover:bg-gray-50 fade-in">
                  <td className="px-4 py-3 font-mono font-bold">{coupon.code}</td>
                  <td className="px-4 py-3">{coupon.store.name}</td>
                  <td className="px-4 py-3">{discountLabel}</td>
                  <td className="px-4 py-3">{coupon.usedCount}{coupon.maxUses ? ` / ${coupon.maxUses}` : ""}</td>
                  <td className="px-4 py-3 text-xs">
                    {coupon.startsAt && <div>Desde: {new Date(coupon.startsAt).toLocaleDateString()}</div>}
                    {coupon.expiresAt && <div>Hasta: {new Date(coupon.expiresAt).toLocaleDateString()}</div>}
                    {!coupon.startsAt && !coupon.expiresAt && <span className="text-[color:var(--muted)]">Sin fecha</span>}
                  </td>
                  <td className="px-4 py-3">
                    {expired ? <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">Expirado</span> :
                     notStarted ? <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700">Próximo</span> :
                     coupon.isActive ? <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">Activo</span> :
                     <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">Inactivo</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => toggleActive(coupon)}
                        className={`rounded px-2 py-1 text-xs font-medium ${coupon.isActive ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200" : "bg-green-100 text-green-700 hover:bg-green-200"}`}>
                        {coupon.isActive ? "Desactivar" : "Activar"}
                      </button>
                      <button type="button" onClick={() => deleteCoupon(coupon)}
                        className="rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-200">
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
