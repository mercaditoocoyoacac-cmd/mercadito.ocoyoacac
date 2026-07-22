"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { formatMoney } from "@/lib/format";

type MembershipCoupon = {
  id: string;
  code: string;
  description: string | null;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  maxUses: number | null;
  usedCount: number;
  isActive: boolean;
  startsAt: string | null;
  expiresAt: string | null;
  createdAt: string;
};

const MEMBERSHIP_PRICE = 83000;

const emptyForm = {
  code: "",
  description: "",
  discountType: "PERCENTAGE" as "PERCENTAGE" | "FIXED",
  discountValue: 0,
  maxUses: "",
  startsAt: "",
  expiresAt: "",
};

export default function AdminMembresiaCuponesPage() {
  const router = useRouter();
  const [coupons, setCoupons] = useState<MembershipCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/membership-coupons");
    if (res.status === 401) { router.push("/admin/login"); return; }
    const data = await res.json();
    if (data.ok) setCoupons(data.coupons);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  }

  function openEdit(coupon: MembershipCoupon) {
    setEditingId(coupon.id);
    setForm({
      code: coupon.code,
      description: coupon.description || "",
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      maxUses: coupon.maxUses?.toString() || "",
      startsAt: coupon.startsAt ? new Date(coupon.startsAt).toISOString().slice(0, 16) : "",
      expiresAt: coupon.expiresAt ? new Date(coupon.expiresAt).toISOString().slice(0, 16) : "",
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.code || !form.discountValue) {
      toast.error("Completa los campos obligatorios.");
      return;
    }
    if (form.discountType === "PERCENTAGE" && form.discountValue > 100) {
      toast.error("El porcentaje no puede ser mayor a 100.");
      return;
    }

    setSaving(true);
    const body: Record<string, unknown> = {
      code: form.code,
      description: form.description || undefined,
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
    };
    if (form.maxUses) body.maxUses = Number(form.maxUses);
    if (form.startsAt) body.startsAt = new Date(form.startsAt).toISOString();
    if (form.expiresAt) body.expiresAt = new Date(form.expiresAt).toISOString();

    const url = editingId
      ? `/api/admin/membership-coupons/${editingId}`
      : "/api/admin/membership-coupons";
    const method = editingId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok || !data.ok) {
      toast.error(data.error || "Error al guardar cupón.");
      return;
    }
    toast.success(editingId ? "Cupón actualizado." : "Cupón creado.");
    resetForm();
    load();
  }

  async function toggleActive(coupon: MembershipCoupon) {
    const res = await fetch(`/api/admin/membership-coupons/${coupon.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isActive: !coupon.isActive }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) { toast.error(data.error || "Error"); return; }
    toast.success(coupon.isActive ? "Cupón desactivado" : "Cupón activado");
    load();
  }

  async function deleteCoupon(coupon: MembershipCoupon) {
    if (!confirm(`¿Eliminar cupón "${coupon.code}"?`)) return;
    const res = await fetch(`/api/admin/membership-coupons/${coupon.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok || !data.ok) { toast.error(data.error || "Error"); return; }
    toast.success("Cupón eliminado.");
    load();
  }

  function discountLabel(c: MembershipCoupon) {
    if (c.discountType === "PERCENTAGE") return `${c.discountValue}%`;
    return formatMoney(c.discountValue, "MXN");
  }

  function discountedPrice(c: MembershipCoupon) {
    if (c.discountType === "PERCENTAGE") {
      return MEMBERSHIP_PRICE * (1 - c.discountValue / 100);
    }
    return MEMBERSHIP_PRICE - c.discountValue;
  }

  if (loading) {
    return <div className="p-6 text-center text-[color:var(--muted)]">Cargando...</div>;
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Cupones de Membresía</h1>
          <p className="text-sm text-[color:var(--muted)]">
            Cupones que aplican descuento en el pago de la membresía Vende+ ({formatMoney(MEMBERSHIP_PRICE, "MXN")}/mes)
          </p>
        </div>
        <button
          type="button"
          onClick={() => { resetForm(); setShowForm(!showForm); }}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
        >
          {showForm ? "Cancelar" : "+ Nuevo cupón"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-8 rounded-xl border border-[var(--border)] bg-white p-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-[color:var(--muted)] mb-1">Código *</label>
              <input
                name="code"
                value={form.code}
                onChange={handleChange}
                placeholder="MIEMBRESIA20"
                required
                className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm uppercase"
              />
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
                {form.discountType === "PERCENTAGE" ? "Porcentaje (1-100) *" : "Monto a descontar ($) *"}
              </label>
              <input
                name="discountValue"
                type="number"
                min="1"
                max={form.discountType === "PERCENTAGE" ? 100 : undefined}
                value={form.discountValue || ""}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
              />
              {form.discountValue > 0 && (
                <p className="mt-1 text-xs text-[color:var(--muted)]">
                  Precio final: <span className="font-semibold">{formatMoney(discountedPrice({
                    id: "",
                    code: "",
                    description: null,
                    discountType: form.discountType,
                    discountValue: Number(form.discountValue),
                    maxUses: null,
                    usedCount: 0,
                    isActive: true,
                    startsAt: null,
                    expiresAt: null,
                    createdAt: "",
                  }), "MXN")}/mes</span>
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-[color:var(--muted)] mb-1">Usos máximos</label>
              <input
                name="maxUses"
                type="number"
                min="1"
                value={form.maxUses}
                onChange={handleChange}
                placeholder="Sin límite"
                className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[color:var(--muted)] mb-1">Descripción (interna)</label>
              <input
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Ej: Descuento para nuevos vendors"
                maxLength={200}
                className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
              />
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
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-[var(--accent)] px-6 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
            >
              {saving ? "Guardando..." : editingId ? "Actualizar cupón" : "Crear cupón"}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm} className="text-sm text-[color:var(--muted)] hover:underline">
                Cancelar edición
              </button>
            )}
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-gray-50">
              <th className="px-4 py-3 text-left font-medium">Código</th>
              <th className="px-4 py-3 text-left font-medium">Descripción</th>
              <th className="px-4 py-3 text-left font-medium">Descuento</th>
              <th className="px-4 py-3 text-left font-medium">Precio final</th>
              <th className="px-4 py-3 text-left font-medium">Usos</th>
              <th className="px-4 py-3 text-left font-medium">Vigencia</th>
              <th className="px-4 py-3 text-left font-medium">Estado</th>
              <th className="px-4 py-3 text-left font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {coupons.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-[color:var(--muted)]">
                  Sin cupones de membresía aún
                </td>
              </tr>
            )}
            {coupons.map((coupon, idx) => {
              const now = new Date();
              const expired = coupon.expiresAt && new Date(coupon.expiresAt) < now;
              const notStarted = coupon.startsAt && new Date(coupon.startsAt) > now;
              const finalPrice = discountedPrice(coupon);
              return (
                <tr key={coupon.id} style={{ animationDelay: `${idx * 40}ms` }} className="border-b border-[var(--border)] hover:bg-gray-50 fade-in">
                  <td className="px-4 py-3 font-mono font-bold">{coupon.code}</td>
                  <td className="px-4 py-3 text-xs text-[color:var(--muted)]">{coupon.description || "—"}</td>
                  <td className="px-4 py-3 font-semibold">{discountLabel(coupon)}</td>
                  <td className="px-4 py-3">
                    {finalPrice < MEMBERSHIP_PRICE ? (
                      <span>
                        <span className="text-green-600 font-semibold">{formatMoney(finalPrice, "MXN")}</span>
                        <span className="ml-1 text-xs text-[color:var(--muted)] line-through">{formatMoney(MEMBERSHIP_PRICE, "MXN")}</span>
                      </span>
                    ) : (
                      <span className="text-[color:var(--muted)]">{formatMoney(MEMBERSHIP_PRICE, "MXN")}</span>
                    )}
                  </td>
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
                      <button type="button" onClick={() => openEdit(coupon)}
                        className="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200">
                        Editar
                      </button>
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
