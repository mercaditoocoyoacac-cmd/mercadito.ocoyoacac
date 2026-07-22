"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { formatMoney } from "@/lib/format";

type Store = { id: string; name: string; slug: string };
type User = { id: string; name: string | null; email: string; role: string; createdAt: string };
type StoreCoupon = {
  id: string;
  code: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  minPurchaseCents: number | null;
  maxUses: number | null;
  usedCount: number;
  maxUsesPerUser: number | null;
  userRegisteredBefore: string | null;
  storeCreatedBefore: string | null;
  isActive: boolean;
  startsAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  stores: { store: Store }[];
  users: { user: User }[];
};
type MembershipCoupon = {
  id: string;
  code: string;
  description: string | null;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  maxUses: number | null;
  maxUsesPerStore: number | null;
  usedCount: number;
  userRegisteredBefore: string | null;
  storeCreatedBefore: string | null;
  isActive: boolean;
  startsAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  users: { user: User }[];
};

const MEMBERSHIP_PRICE = 83000;

const emptyStoreForm = {
  storeIds: [] as string[],
  userIds: [] as string[],
  code: "",
  discountType: "PERCENTAGE" as "PERCENTAGE" | "FIXED",
  discountValue: 0,
  minPurchaseCents: "",
  maxUses: "",
  maxUsesPerUser: "",
  userRegisteredBefore: "",
  storeCreatedBefore: "",
  startsAt: "",
  expiresAt: "",
};

const emptyMemberForm = {
  code: "",
  description: "",
  discountType: "PERCENTAGE" as "PERCENTAGE" | "FIXED",
  discountValue: 0,
  maxUses: "",
  maxUsesPerStore: "",
  userIds: [] as string[],
  userRegisteredBefore: "",
  storeCreatedBefore: "",
  startsAt: "",
  expiresAt: "",
};

export default function AdminCuponesPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"tienda" | "membresia">("tienda");

  // Store coupons state
  const [storeCoupons, setStoreCoupons] = useState<StoreCoupon[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [storeForm, setStoreForm] = useState(emptyStoreForm);
  const [showStoreForm, setShowStoreForm] = useState(false);

  // Membership coupons state
  const [memberCoupons, setMemberCoupons] = useState<MembershipCoupon[]>([]);
  const [memberForm, setMemberForm] = useState(emptyMemberForm);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);

  async function loadStoreCoupons() {
    const [cRes, sRes, uRes] = await Promise.all([
      fetch("/api/admin/coupons"),
      fetch("/api/admin/stores"),
      fetch("/api/admin/users"),
    ]);
    if (cRes.status === 401) { router.push("/admin/login"); return; }
    const cData = await cRes.json();
    const sData = await sRes.json();
    const uData = await uRes.json();
    if (cData.ok) setStoreCoupons(cData.coupons);
    if (sData.ok) setStores(sData.stores || sData.data || []);
    if (uData.ok) setUsers(uData.users || []);
  }

  async function loadMemberCoupons() {
    const res = await fetch("/api/admin/membership-coupons");
    if (res.status === 401) { router.push("/admin/login"); return; }
    const data = await res.json();
    if (data.ok) setMemberCoupons(data.coupons);
  }

  async function loadAll() {
    setLoading(true);
    await Promise.all([loadStoreCoupons(), loadMemberCoupons()]);
    setLoading(false);
  }

  useEffect(() => { loadAll(); }, []);

  // === STORE COUPON HANDLERS ===
  function handleStoreChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setStoreForm((prev) => ({ ...prev, [name]: value }));
  }

  function toggleStoreId(storeId: string) {
    setStoreForm((prev) => ({
      ...prev,
      storeIds: prev.storeIds.includes(storeId)
        ? prev.storeIds.filter((id) => id !== storeId)
        : [...prev.storeIds, storeId],
    }));
  }

  function toggleUserId(userId: string) {
    setStoreForm((prev) => ({
      ...prev,
      userIds: prev.userIds.includes(userId)
        ? prev.userIds.filter((id) => id !== userId)
        : [...prev.userIds, userId],
    }));
  }

  async function handleStoreSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (storeForm.storeIds.length === 0 || !storeForm.code || !storeForm.discountValue) {
      toast.error("Completa los campos obligatorios.");
      return;
    }
    const body: Record<string, unknown> = {
      storeIds: storeForm.storeIds,
      code: storeForm.code,
      discountType: storeForm.discountType,
      discountValue: Number(storeForm.discountValue),
    };
    if (storeForm.minPurchaseCents) body.minPurchaseCents = Number(storeForm.minPurchaseCents);
    if (storeForm.maxUses) body.maxUses = Number(storeForm.maxUses);
    if (storeForm.maxUsesPerUser) body.maxUsesPerUser = Number(storeForm.maxUsesPerUser);
    if (storeForm.userRegisteredBefore) body.userRegisteredBefore = new Date(storeForm.userRegisteredBefore).toISOString();
    if (storeForm.storeCreatedBefore) body.storeCreatedBefore = new Date(storeForm.storeCreatedBefore).toISOString();
    if (storeForm.userIds.length > 0) body.userIds = storeForm.userIds;
    if (storeForm.startsAt) body.startsAt = new Date(storeForm.startsAt).toISOString();
    if (storeForm.expiresAt) body.expiresAt = new Date(storeForm.expiresAt).toISOString();

    const res = await fetch("/api/admin/coupons", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) { toast.error(data.error || "Error al crear cupón."); return; }
    toast.success("Cupón de tienda creado.");
    setStoreForm(emptyStoreForm);
    setShowStoreForm(false);
    loadStoreCoupons();
  }

  async function toggleStoreActive(coupon: StoreCoupon) {
    const res = await fetch(`/api/admin/coupons/${coupon.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isActive: !coupon.isActive }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) { toast.error(data.error || "Error"); return; }
    toast.success(coupon.isActive ? "Cupón desactivado" : "Cupón activado");
    loadStoreCoupons();
  }

  async function deleteStoreCoupon(coupon: StoreCoupon) {
    if (!confirm(`¿Eliminar cupón "${coupon.code}"?`)) return;
    const res = await fetch(`/api/admin/coupons/${coupon.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok || !data.ok) { toast.error(data.error || "Error"); return; }
    toast.success("Cupón eliminado.");
    loadStoreCoupons();
  }

  // === MEMBERSHIP COUPON HANDLERS ===
  function handleMemberChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setMemberForm((prev) => ({ ...prev, [name]: value }));
  }

  function resetMemberForm() {
    setMemberForm(emptyMemberForm);
    setEditingMemberId(null);
    setShowMemberForm(false);
  }

  function openEditMember(coupon: MembershipCoupon) {
    setEditingMemberId(coupon.id);
    setMemberForm({
      code: coupon.code,
      description: coupon.description || "",
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      maxUses: coupon.maxUses?.toString() || "",
      maxUsesPerStore: coupon.maxUsesPerStore?.toString() || "",
      userIds: coupon.users?.map((u) => u.user.id) || [],
      userRegisteredBefore: coupon.userRegisteredBefore ? new Date(coupon.userRegisteredBefore).toISOString().slice(0, 10) : "",
      storeCreatedBefore: coupon.storeCreatedBefore ? new Date(coupon.storeCreatedBefore).toISOString().slice(0, 10) : "",
      startsAt: coupon.startsAt ? new Date(coupon.startsAt).toISOString().slice(0, 16) : "",
      expiresAt: coupon.expiresAt ? new Date(coupon.expiresAt).toISOString().slice(0, 16) : "",
    });
    setShowMemberForm(true);
  }

  function memberDiscountedPrice(c: MembershipCoupon | { discountType: string; discountValue: number }) {
    if (c.discountType === "PERCENTAGE") return MEMBERSHIP_PRICE * (1 - c.discountValue / 100);
    return MEMBERSHIP_PRICE - c.discountValue;
  }

  function toggleMemberUserId(userId: string) {
    setMemberForm((prev) => ({
      ...prev,
      userIds: prev.userIds.includes(userId)
        ? prev.userIds.filter((id) => id !== userId)
        : [...prev.userIds, userId],
    }));
  }

  async function handleMemberSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!memberForm.code || !memberForm.discountValue) {
      toast.error("Completa los campos obligatorios.");
      return;
    }
    if (memberForm.discountType === "PERCENTAGE" && memberForm.discountValue > 100) {
      toast.error("El porcentaje no puede ser mayor a 100.");
      return;
    }

    const body: Record<string, unknown> = {
      code: memberForm.code,
      description: memberForm.description || undefined,
      discountType: memberForm.discountType,
      discountValue: Number(memberForm.discountValue),
    };
    if (memberForm.maxUses) body.maxUses = Number(memberForm.maxUses);
    if (memberForm.maxUsesPerStore) body.maxUsesPerStore = Number(memberForm.maxUsesPerStore);
    if (memberForm.userIds.length > 0) body.userIds = memberForm.userIds;
    if (memberForm.userRegisteredBefore) body.userRegisteredBefore = new Date(memberForm.userRegisteredBefore).toISOString();
    if (memberForm.storeCreatedBefore) body.storeCreatedBefore = new Date(memberForm.storeCreatedBefore).toISOString();
    if (memberForm.startsAt) body.startsAt = new Date(memberForm.startsAt).toISOString();
    if (memberForm.expiresAt) body.expiresAt = new Date(memberForm.expiresAt).toISOString();

    const url = editingMemberId
      ? `/api/admin/membership-coupons/${editingMemberId}`
      : "/api/admin/membership-coupons";
    const method = editingMemberId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) { toast.error(data.error || "Error al guardar cupón."); return; }
    toast.success(editingMemberId ? "Cupón actualizado." : "Cupón de membresía creado.");
    resetMemberForm();
    loadMemberCoupons();
  }

  async function toggleMemberActive(coupon: MembershipCoupon) {
    const res = await fetch(`/api/admin/membership-coupons/${coupon.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isActive: !coupon.isActive }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) { toast.error(data.error || "Error"); return; }
    toast.success(coupon.isActive ? "Cupón desactivado" : "Cupón activado");
    loadMemberCoupons();
  }

  async function deleteMemberCoupon(coupon: MembershipCoupon) {
    if (!confirm(`¿Eliminar cupón "${coupon.code}"?`)) return;
    const res = await fetch(`/api/admin/membership-coupons/${coupon.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok || !data.ok) { toast.error(data.error || "Error"); return; }
    toast.success("Cupón eliminado.");
    loadMemberCoupons();
  }

  if (loading) {
    return <div className="p-6 text-center text-[color:var(--muted)]">Cargando...</div>;
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Cupones de descuento</h1>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-[var(--surface)] p-1 mb-6 max-w-md">
        <button
          onClick={() => setTab("tienda")}
          className={`flex-1 rounded-md px-4 py-2.5 text-sm font-medium transition-all ${
            tab === "tienda"
              ? "bg-[var(--background)] text-[var(--accent)] shadow-sm"
              : "text-[color:var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          🏪 Cupones de tienda
        </button>
        <button
          onClick={() => setTab("membresia")}
          className={`flex-1 rounded-md px-4 py-2.5 text-sm font-medium transition-all ${
            tab === "membresia"
              ? "bg-[var(--background)] text-amber-600 shadow-sm"
              : "text-[color:var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          ⭐ Cupones de membresía
        </button>
      </div>

      {/* ====== TAB: TIENDA ====== */}
      {tab === "tienda" && (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-[color:var(--muted)]">Cupones aplicados al carrito de compra por tienda</p>
            <button
              type="button"
              onClick={() => setShowStoreForm(!showStoreForm)}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
            >
              {showStoreForm ? "Cancelar" : "+ Nuevo cupón"}
            </button>
          </div>

          {showStoreForm && (
            <form onSubmit={handleStoreSubmit} className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--background)] p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[color:var(--muted)] mb-2">Tiendas *</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {stores.map((s) => (
                    <label key={s.id} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-all ${storeForm.storeIds.includes(s.id) ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]" : "border-[var(--border)] hover:border-gray-300"}`}>
                      <input type="checkbox" checked={storeForm.storeIds.includes(s.id)} onChange={() => toggleStoreId(s.id)} className="sr-only" />
                      <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${storeForm.storeIds.includes(s.id) ? "border-[var(--accent)] bg-[var(--accent)]" : "border-gray-300"}`}>
                        {storeForm.storeIds.includes(s.id) && (
                          <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        )}
                      </span>
                      {s.name}
                    </label>
                  ))}
                </div>
                {storeForm.storeIds.length > 0 && (
                  <p className="mt-1 text-xs text-[color:var(--muted)]">{storeForm.storeIds.length} tienda{storeForm.storeIds.length > 1 ? "s" : ""} seleccionada{storeForm.storeIds.length > 1 ? "s" : ""}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-[color:var(--muted)] mb-2">Usuarios específicos <span className="text-[color:var(--muted)]">(opcional — vacío = todos los usuarios)</span></label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto rounded-lg border border-[var(--border)] p-2">
                  {users.length === 0 && <p className="text-xs text-[color:var(--muted)] col-span-3">Cargando usuarios...</p>}
                  {users.map((u) => (
                    <label key={u.id} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-all ${storeForm.userIds.includes(u.id) ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300" : "border-[var(--border)] hover:border-gray-300"}`}>
                      <input type="checkbox" checked={storeForm.userIds.includes(u.id)} onChange={() => toggleUserId(u.id)} className="sr-only" />
                      <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${storeForm.userIds.includes(u.id) ? "border-emerald-500 bg-emerald-500" : "border-gray-300"}`}>
                        {storeForm.userIds.includes(u.id) && (
                          <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        )}
                      </span>
                      <span className="truncate">{u.name || u.email}</span>
                    </label>
                  ))}
                </div>
                {storeForm.userIds.length > 0 && (
                  <p className="mt-1 text-xs text-emerald-600">{storeForm.userIds.length} usuario{storeForm.userIds.length > 1 ? "s" : ""} seleccionado{storeForm.userIds.length > 1 ? "s" : ""} — solo ellos podrán usar el cupón</p>
                )}
                {storeForm.userIds.length === 0 && (
                  <p className="mt-1 text-xs text-[color:var(--muted)]">Sin selección = todos los usuarios pueden usar el cupón</p>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-[color:var(--muted)] mb-1">Código *</label>
                  <input name="code" value={storeForm.code} onChange={handleStoreChange} placeholder="BIENVENIDO10" className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm uppercase" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[color:var(--muted)] mb-1">Tipo *</label>
                  <select name="discountType" value={storeForm.discountType} onChange={handleStoreChange} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
                    <option value="PERCENTAGE">% Porcentaje</option>
                    <option value="FIXED">$ Monto fijo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[color:var(--muted)] mb-1">
                    {storeForm.discountType === "PERCENTAGE" ? "Porcentaje *" : "Monto ($) *"}
                  </label>
                  <input name="discountValue" type="number" min="1" value={storeForm.discountValue} onChange={handleStoreChange} className={`w-full rounded-lg border px-3 py-2 text-sm ${storeForm.discountType === "PERCENTAGE" ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border)] bg-[var(--background)]"}`} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[color:var(--muted)] mb-1">Compra mínima ($)</label>
                  <input name="minPurchaseCents" type="number" min="0" value={storeForm.minPurchaseCents} onChange={handleStoreChange} placeholder="0 = sin mínimo" className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[color:var(--muted)] mb-1">Usos máximos</label>
                  <input name="maxUses" type="number" min="1" value={storeForm.maxUses} onChange={handleStoreChange} placeholder="Sin límite" className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[color:var(--muted)] mb-1">Usos por usuario</label>
                  <input name="maxUsesPerUser" type="number" min="1" value={storeForm.maxUsesPerUser} onChange={handleStoreChange} placeholder="Sin límite" className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[color:var(--muted)] mb-1">Usuarios registrados antes de</label>
                  <input name="userRegisteredBefore" type="date" value={storeForm.userRegisteredBefore} onChange={handleStoreChange} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
                  <p className="mt-0.5 text-xs text-[color:var(--muted)]">Solo usuarios con cuenta antes de esta fecha</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[color:var(--muted)] mb-1">Tiendas creadas antes de</label>
                  <input name="storeCreatedBefore" type="date" value={storeForm.storeCreatedBefore} onChange={handleStoreChange} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
                  <p className="mt-0.5 text-xs text-[color:var(--muted)]">Solo tiendas registradas antes de esta fecha</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[color:var(--muted)] mb-1">Válido desde</label>
                  <input name="startsAt" type="datetime-local" value={storeForm.startsAt} onChange={handleStoreChange} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[color:var(--muted)] mb-1">Válido hasta</label>
                  <input name="expiresAt" type="datetime-local" value={storeForm.expiresAt} onChange={handleStoreChange} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
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
                <tr className="border-b border-[var(--border)] bg-[var(--surface)]">
                  <th className="px-4 py-3 text-left font-medium">Código</th>
                  <th className="px-4 py-3 text-left font-medium">Tiendas</th>
                  <th className="px-4 py-3 text-left font-medium">Descuento</th>
                  <th className="px-4 py-3 text-left font-medium">Usos</th>
                  <th className="px-4 py-3 text-left font-medium">Vigencia</th>
                  <th className="px-4 py-3 text-left font-medium">Estado</th>
                  <th className="px-4 py-3 text-left font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {storeCoupons.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-[color:var(--muted)]">Sin cupones de tienda aún</td></tr>
                )}
                {storeCoupons.map((c, idx) => {
                  const now = new Date();
                  const expired = c.expiresAt && new Date(c.expiresAt) < now;
                  const notStarted = c.startsAt && new Date(c.startsAt) > now;
                  const discountLabel = c.discountType === "PERCENTAGE" ? `${c.discountValue}%` : `$${(c.discountValue / 100).toFixed(2)}`;
                  return (
                    <tr key={c.id} style={{ animationDelay: `${idx * 40}ms` }} className="border-b border-[var(--border)] hover:bg-[var(--surface)] fade-in">
                      <td className="px-4 py-3 font-mono font-bold">{c.code}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {c.stores.map((cs) => (
                            <span key={cs.store.id} className="inline-block rounded-full bg-[var(--surface)] px-2 py-0.5 text-xs text-[color:var(--muted)]">{cs.store.name}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">{discountLabel}</td>
                      <td className="px-4 py-3">{c.usedCount}{c.maxUses ? ` / ${c.maxUses}` : ""}</td>
                      <td className="px-4 py-3 text-xs">
                        {c.startsAt && <div>Desde: {new Date(c.startsAt).toLocaleDateString()}</div>}
                        {c.expiresAt && <div>Hasta: {new Date(c.expiresAt).toLocaleDateString()}</div>}
                        {!c.startsAt && !c.expiresAt && <span className="text-[color:var(--muted)]">Sin fecha</span>}
                      </td>
                      <td className="px-4 py-3">
                        {expired ? <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">Expirado</span> :
                         notStarted ? <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700">Próximo</span> :
                         c.isActive ? <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">Activo</span> :
                         <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">Inactivo</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => toggleStoreActive(c)}
                            className={`rounded px-2 py-1 text-xs font-medium ${c.isActive ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200" : "bg-green-100 text-green-700 hover:bg-green-200"}`}>
                            {c.isActive ? "Desactivar" : "Activar"}
                          </button>
                          <button type="button" onClick={() => deleteStoreCoupon(c)}
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
        </>
      )}

      {/* ====== TAB: MEMBRESÍA ====== */}
      {tab === "membresia" && (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-[color:var(--muted)]">
              Cupones que aplican descuento en el pago de la membresía Vende+ ({formatMoney(MEMBERSHIP_PRICE, "MXN")}/mes)
            </p>
            <button
              type="button"
              onClick={() => { resetMemberForm(); setShowMemberForm(!showMemberForm); }}
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600"
            >
              {showMemberForm ? "Cancelar" : "+ Nuevo cupón"}
            </button>
          </div>

          {showMemberForm && (
            <form onSubmit={handleMemberSubmit} className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--background)] p-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-[color:var(--muted)] mb-1">Código *</label>
                  <input name="code" value={memberForm.code} onChange={handleMemberChange} placeholder="MIEMBRESIA20" required className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm uppercase" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[color:var(--muted)] mb-1">Tipo *</label>
                  <select name="discountType" value={memberForm.discountType} onChange={handleMemberChange} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
                    <option value="PERCENTAGE">% Porcentaje</option>
                    <option value="FIXED">$ Monto fijo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[color:var(--muted)] mb-1">
                    {memberForm.discountType === "PERCENTAGE" ? "Porcentaje (1-100) *" : "Monto a descontar ($) *"}
                  </label>
                  <input name="discountValue" type="number" min="1" max={memberForm.discountType === "PERCENTAGE" ? 100 : undefined}
                    value={memberForm.discountValue || ""} onChange={handleMemberChange} required
                    className={`w-full rounded-lg border px-3 py-2 text-sm ${memberForm.discountType === "PERCENTAGE" ? "border-amber-400 bg-amber-50 dark:bg-amber-900/20" : "border-[var(--border)] bg-[var(--background)]"}`} />
                  {memberForm.discountValue > 0 && (
                    <p className="mt-1 text-xs text-[color:var(--muted)]">
                      Precio final: <span className="font-semibold text-amber-600">
                        {formatMoney(memberDiscountedPrice({ discountType: memberForm.discountType, discountValue: Number(memberForm.discountValue) }), "MXN")}/mes
                      </span>
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-[color:var(--muted)] mb-1">Usos máximos</label>
                  <input name="maxUses" type="number" min="1" value={memberForm.maxUses} onChange={handleMemberChange} placeholder="Sin límite" className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[color:var(--muted)] mb-1">Usos máximos por tienda</label>
                  <input name="maxUsesPerStore" type="number" min="1" value={memberForm.maxUsesPerStore || ""} onChange={handleMemberChange} placeholder="Sin límite" className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[color:var(--muted)] mb-2">Usuarios específicos <span className="text-[color:var(--muted)]">(opcional — vacío = todos los usuarios)</span></label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto rounded-lg border border-[var(--border)] p-2">
                    {users.length === 0 && <p className="text-xs text-[color:var(--muted)] col-span-3">Cargando usuarios...</p>}
                    {users.map((u) => (
                      <label key={u.id} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-all ${memberForm.userIds.includes(u.id) ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300" : "border-[var(--border)] hover:border-gray-300"}`}>
                        <input type="checkbox" checked={memberForm.userIds.includes(u.id)} onChange={() => toggleMemberUserId(u.id)} className="sr-only" />
                        <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${memberForm.userIds.includes(u.id) ? "border-emerald-500 bg-emerald-500" : "border-gray-300"}`}>
                          {memberForm.userIds.includes(u.id) && (
                            <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                          )}
                        </span>
                        <span className="truncate">{u.name || u.email}</span>
                      </label>
                    ))}
                  </div>
                  {memberForm.userIds.length > 0 && (
                    <p className="mt-1 text-xs text-emerald-600">{memberForm.userIds.length} usuario{memberForm.userIds.length > 1 ? "s" : ""} seleccionado{memberForm.userIds.length > 1 ? "s" : ""} — solo ellos podrán usar el cupón</p>
                  )}
                  {memberForm.userIds.length === 0 && (
                    <p className="mt-1 text-xs text-[color:var(--muted)]">Sin selección = todos los usuarios pueden usar el cupón</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-[color:var(--muted)] mb-1">Usuarios registrados antes de</label>
                  <input name="userRegisteredBefore" type="date" value={memberForm.userRegisteredBefore} onChange={handleMemberChange} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
                  <p className="mt-0.5 text-xs text-[color:var(--muted)]">Solo usuarios con cuenta antes de esta fecha</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[color:var(--muted)] mb-1">Tiendas creadas antes de</label>
                  <input name="storeCreatedBefore" type="date" value={memberForm.storeCreatedBefore} onChange={handleMemberChange} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
                  <p className="mt-0.5 text-xs text-[color:var(--muted)]">Solo tiendas registradas antes de esta fecha</p>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[color:var(--muted)] mb-1">Descripción (interna)</label>
                  <input name="description" value={memberForm.description} onChange={handleMemberChange} placeholder="Ej: Descuento para nuevos vendors" maxLength={200} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[color:var(--muted)] mb-1">Válido desde</label>
                  <input name="startsAt" type="datetime-local" value={memberForm.startsAt} onChange={handleMemberChange} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[color:var(--muted)] mb-1">Válido hasta</label>
                  <input name="expiresAt" type="datetime-local" value={memberForm.expiresAt} onChange={handleMemberChange} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button type="submit" className="rounded-lg bg-amber-500 px-6 py-2 text-sm font-medium text-white hover:bg-amber-600">
                  {editingMemberId ? "Actualizar cupón" : "Crear cupón"}
                </button>
                {editingMemberId && (
                  <button type="button" onClick={resetMemberForm} className="text-sm text-[color:var(--muted)] hover:underline">
                    Cancelar edición
                  </button>
                )}
              </div>
            </form>
          )}

          <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface)]">
                  <th className="px-4 py-3 text-left font-medium">Código</th>
                  <th className="px-4 py-3 text-left font-medium">Descripción</th>
                  <th className="px-4 py-3 text-left font-medium">Descuento</th>
                  <th className="px-4 py-3 text-left font-medium">Precio final</th>
                  <th className="px-4 py-3 text-left font-medium">Usos</th>
                  <th className="px-4 py-3 text-left font-medium">Usos/tienda</th>
                  <th className="px-4 py-3 text-left font-medium">Vigencia</th>
                  <th className="px-4 py-3 text-left font-medium">Estado</th>
                  <th className="px-4 py-3 text-left font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {memberCoupons.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-[color:var(--muted)]">Sin cupones de membresía aún</td></tr>
                )}
                {memberCoupons.map((c, idx) => {
                  const now = new Date();
                  const expired = c.expiresAt && new Date(c.expiresAt) < now;
                  const notStarted = c.startsAt && new Date(c.startsAt) > now;
                  const finalPrice = memberDiscountedPrice(c);
                  return (
                    <tr key={c.id} style={{ animationDelay: `${idx * 40}ms` }} className="border-b border-[var(--border)] hover:bg-[var(--surface)] fade-in">
                      <td className="px-4 py-3 font-mono font-bold">{c.code}</td>
                      <td className="px-4 py-3 text-xs text-[color:var(--muted)]">{c.description || "—"}</td>
                      <td className="px-4 py-3 font-semibold">{c.discountType === "PERCENTAGE" ? `${c.discountValue}%` : formatMoney(c.discountValue, "MXN")}</td>
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
                      <td className="px-4 py-3">{c.usedCount}{c.maxUses ? ` / ${c.maxUses}` : ""}</td>
                      <td className="px-4 py-3 text-xs">{c.maxUsesPerStore ? `Máx. ${c.maxUsesPerStore}` : "—"}</td>
                      <td className="px-4 py-3 text-xs">
                        {c.startsAt && <div>Desde: {new Date(c.startsAt).toLocaleDateString()}</div>}
                        {c.expiresAt && <div>Hasta: {new Date(c.expiresAt).toLocaleDateString()}</div>}
                        {!c.startsAt && !c.expiresAt && <span className="text-[color:var(--muted)]">Sin fecha</span>}
                      </td>
                      <td className="px-4 py-3">
                        {expired ? <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">Expirado</span> :
                         notStarted ? <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700">Próximo</span> :
                         c.isActive ? <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">Activo</span> :
                         <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">Inactivo</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => openEditMember(c)}
                            className="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200">
                            Editar
                          </button>
                          <button type="button" onClick={() => toggleMemberActive(c)}
                            className={`rounded px-2 py-1 text-xs font-medium ${c.isActive ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200" : "bg-green-100 text-green-700 hover:bg-green-200"}`}>
                            {c.isActive ? "Desactivar" : "Activar"}
                          </button>
                          <button type="button" onClick={() => deleteMemberCoupon(c)}
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
        </>
      )}
    </main>
  );
}
