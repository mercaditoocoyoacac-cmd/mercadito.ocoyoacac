"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

const LocationPicker = dynamic(
  () => import("@/components/maps/LocationPicker"),
  { ssr: false, loading: () => <div className="h-64 w-full bg-gray-100 animate-pulse rounded-xl" /> }
);

type DaySchedule = { active: boolean; start: string; end: string };
type StoreScheduleDetails = { mode: "weekly" | "daily"; days: Record<string, DaySchedule> };

const DAYS = [
  { key: "MONDAY", label: "Lunes" },
  { key: "TUESDAY", label: "Martes" },
  { key: "WEDNESDAY", label: "Miércoles" },
  { key: "THURSDAY", label: "Jueves" },
  { key: "FRIDAY", label: "Viernes" },
  { key: "SATURDAY", label: "Sábado" },
  { key: "SUNDAY", label: "Domingo" },
] as const;

function defaultStoreSchedule(): StoreScheduleDetails {
  return {
    mode: "weekly",
    days: {
      MONDAY: { active: true, start: "09:00", end: "18:00" },
      TUESDAY: { active: true, start: "09:00", end: "18:00" },
      WEDNESDAY: { active: true, start: "09:00", end: "18:00" },
      THURSDAY: { active: true, start: "09:00", end: "18:00" },
      FRIDAY: { active: true, start: "09:00", end: "18:00" },
      SATURDAY: { active: false, start: "09:00", end: "14:00" },
      SUNDAY: { active: false, start: "09:00", end: "14:00" },
    },
  };
}

interface Category {
  id: string;
  key: string;
  label: string;
  icon: string;
}

interface Store {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string | null;
  phone: string | null;
  address: string | null;
  imageUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  isActive: boolean;
  isPublished: boolean;
  openTime: string | null;
  closeTime: string | null;
  scheduleDays: string[];
  owner: { id: string; name: string; email: string };
}

function StoreForm({
  store,
  categories,
  onSaved,
}: {
  store: Store;
  categories: Category[];
  onSaved: () => void;
}) {
  const [name, setName] = useState(store.name);
  const [category, setCategory] = useState(store.category);
  const [description, setDescription] = useState(store.description ?? "");
  const [phone, setPhone] = useState(store.phone ?? "");
  const [address, setAddress] = useState(store.address ?? "");
  const [imageUrl, setImageUrl] = useState(store.imageUrl ?? "");
  const [latitude, setLatitude] = useState<number | null>(store.latitude);
  const [longitude, setLongitude] = useState<number | null>(store.longitude);
  const [openTime, setOpenTime] = useState(store.openTime ?? "");
  const [closeTime, setCloseTime] = useState(store.closeTime ?? "");
  const [scheduleDays, setScheduleDays] = useState<string[]>(
    store.scheduleDays.length > 0 ? store.scheduleDays : DAYS.map((d) => d.key)
  );
  const [scheduleDetails, setScheduleDetails] = useState<StoreScheduleDetails>(
    (store as any).scheduleDetails?.days ? (store as any).scheduleDetails : defaultStoreSchedule()
  );
  const [scheduleMode, setScheduleMode] = useState<"weekly" | "daily">(
    (store as any).scheduleDetails?.mode || "weekly"
  );
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function toggleDay(day: string) {
    setScheduleDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
    setScheduleDetails(prev => ({
      ...prev,
      days: { ...prev.days, [day]: { ...prev.days[day], active: !prev.days[day]?.active } },
    }));
  }

  function updateDaySchedule(day: string, partial: Partial<DaySchedule>) {
    setScheduleDetails(prev => ({
      ...prev,
      days: { ...prev.days, [day]: { ...prev.days[day], ...partial } },
    }));
  }

  function handleStoreScheduleMode(mode: "weekly" | "daily") {
    setScheduleMode(mode);
    if (mode === "weekly") {
      const activeDays = DAYS.filter(d => scheduleDetails.days[d.key]?.active);
      if (activeDays.length > 0) {
        const ref = scheduleDetails.days[activeDays[0].key];
        setScheduleDetails(prev => ({
          mode: "weekly",
          days: Object.fromEntries(
            DAYS.map(d => [d.key, { ...ref, active: prev.days[d.key]?.active ?? false }])
          ) as Record<string, DaySchedule>,
        }));
      } else {
        setScheduleDetails(prev => ({ ...prev, mode: "weekly" }));
      }
    } else {
      setScheduleDetails(prev => ({ ...prev, mode: "daily" }));
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json();
    setUploading(false);
    if (!res.ok || !data.ok) {
      setError(data.error ?? "Error al subir imagen.");
      return;
    }
    setImageUrl(data.url);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    const activeDays = DAYS.filter(d => scheduleDetails.days[d.key]?.active);
    const syncOpenTime = activeDays.length > 0 ? scheduleDetails.days[activeDays[0].key].start : "";
    const syncCloseTime = activeDays.length > 0 ? scheduleDetails.days[activeDays[0].key].end : "";
    const syncScheduleDays = activeDays.map(d => d.key);

    const res = await fetch(`/api/admin/stores/${store.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        category,
        description: description.trim() || undefined,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        imageUrl: imageUrl || null,
        latitude: latitude,
        longitude: longitude,
        openTime: syncOpenTime || null,
        closeTime: syncCloseTime || null,
        scheduleDays: syncScheduleDays,
        scheduleDetails,
      }),
    });

    const data = await res.json().catch(() => null);
    setSaving(false);

    if (!res.ok || !data?.ok) {
      setError(data?.error ?? "Error al guardar");
      return;
    }

    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-4 mb-2">
        <div className="text-sm text-[color:var(--muted)]">Dueño: <strong>{store.owner.name}</strong> ({store.owner.email})</div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${store.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {store.isActive ? "Activa" : "Inactiva"}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${store.isPublished ? "bg-blue-50 text-blue-700" : "bg-gray-50 text-gray-500"}`}>
          {store.isPublished ? "Publicada" : "No publicada"}
        </span>
      </div>

      <div className="space-y-2">
        <div className="text-sm font-medium">Logo o imagen de la tienda</div>
        <div className="flex items-center gap-4">
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleFileChange} className="hidden" />
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
            className="rounded-md border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-[var(--accent-soft)] disabled:opacity-60">
            {uploading ? "Subiendo..." : "Cambiar imagen"}
          </button>
          {imageUrl && (
            <div className="relative h-16 w-16 overflow-hidden rounded-md border border-[var(--border)]">
              <img src={imageUrl} alt="Vista previa" className="h-full w-full object-cover" />
              <button type="button" onClick={() => setImageUrl("")}
                className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 hover:opacity-100">×</button>
            </div>
          )}
        </div>
      </div>

      <label className="block">
        <div className="text-sm font-medium">Nombre de la tienda</div>
        <input value={name} onChange={(e) => setName(e.target.value)} required
          className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]" />
      </label>

      <label className="block">
        <div className="text-sm font-medium">Categoría</div>
        <select value={category} onChange={(e) => setCategory(e.target.value)}
          className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]">
          {categories.map((cat) => (
            <option key={cat.key} value={cat.key}>{cat.icon} {cat.label}</option>
          ))}
        </select>
      </label>

      <label className="block">
        <div className="text-sm font-medium">Descripción (opcional)</div>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
          className="mt-1 w-full resize-none rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]" />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <div className="text-sm font-medium">Teléfono (opcional)</div>
          <input value={phone} onChange={(e) => setPhone(e.target.value)}
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]" />
        </label>
        <label className="block">
          <div className="text-sm font-medium">Dirección (opcional)</div>
          <input value={address} onChange={(e) => setAddress(e.target.value)}
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]" />
        </label>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-white p-5">
        <div className="flex items-center gap-2 mb-4">
          <svg className="h-5 w-5 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <div className="text-sm font-semibold">Ubicación de la tienda</div>
        </div>
        <p className="text-xs text-[color:var(--muted)] mb-4">
          Marca en el mapa la ubicación de la tienda para calcular el costo de envío.
        </p>
        <LocationPicker
          latitude={latitude}
          longitude={longitude}
          onLocationChange={(lat, lng) => { setLatitude(lat); setLongitude(lng); }}
        />
        {latitude && longitude && (
          <p className="mt-1.5 flex items-center gap-1 text-xs text-green-600 font-medium">
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            Ubicación guardada
          </p>
        )}
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-white p-5">
        <div className="flex items-center gap-2 mb-4">
          <svg className="h-5 w-5 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm font-semibold">Horario de atención</div>
        </div>
        <p className="text-xs text-[color:var(--muted)] mb-4">
          Los clientes solo podrán hacer pedidos durante el horario configurado.
          Desmarca todos los días para aceptar pedidos 24/7.
        </p>

        <div className="mb-4 flex gap-2">
          <button type="button" onClick={() => handleStoreScheduleMode("weekly")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              scheduleMode === "weekly"
                ? "bg-[var(--accent)] text-white"
                : "border border-[var(--border)] text-[color:var(--muted)] hover:bg-[var(--accent-soft)]"
            }`}>
            Mismo horario todos los días
          </button>
          <button type="button" onClick={() => handleStoreScheduleMode("daily")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              scheduleMode === "daily"
                ? "bg-[var(--accent)] text-white"
                : "border border-[var(--border)] text-[color:var(--muted)] hover:bg-[var(--accent-soft)]"
            }`}>
            Horario por día
          </button>
        </div>

        {scheduleMode === "weekly" && (
          <div className="mb-4">
            <div className="text-xs font-medium text-[color:var(--muted)] mb-2">Días activos</div>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((day) => {
                const isActive = scheduleDays.includes(day.key);
                return (
                  <button key={day.key} type="button" onClick={() => toggleDay(day.key)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                      isActive ? "bg-[var(--accent)] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}>
                    {day.label.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="space-y-2">
          {(scheduleMode === "daily" ? DAYS : DAYS.filter(d => scheduleDays.includes(d.key))).map(day => (
            <div key={day.key}
              className={`flex items-center justify-between rounded-lg border p-3 ${
                scheduleMode === "daily" && !scheduleDetails.days[day.key]?.active
                  ? "border-dashed border-gray-300 opacity-60"
                  : "border-gray-200"
              }`}>
              <div className="flex items-center gap-2">
                {scheduleMode === "daily" && (
                  <input type="checkbox" checked={scheduleDetails.days[day.key]?.active ?? false}
                    onChange={() => toggleDay(day.key)}
                    className="h-4 w-4 rounded border-gray-300 text-[var(--accent)]" />
                )}
                <span className="text-sm font-medium">{day.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <input type="time" value={scheduleDetails.days[day.key]?.start ?? "09:00"}
                  onChange={e => updateDaySchedule(day.key, { start: e.target.value })}
                  disabled={!scheduleDetails.days[day.key]?.active}
                  className="w-28 rounded-md border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm [font-size:16px] disabled:opacity-40" />
                <span className="text-xs text-[color:var(--muted)]">a</span>
                <input type="time" value={scheduleDetails.days[day.key]?.end ?? "18:00"}
                  onChange={e => updateDaySchedule(day.key, { end: e.target.value })}
                  disabled={!scheduleDetails.days[day.key]?.active}
                  className="w-28 rounded-md border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm [font-size:16px] disabled:opacity-40" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {success && (
        <div className="rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-700">Tienda actualizada correctamente</div>
      )}

      <button type="submit" disabled={saving || uploading}
        className="w-full rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60">
        {saving ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}

export default function AdminTiendasPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [loading, setLoading] = useState(true);

  function loadData() {
    Promise.all([
      fetch("/api/admin/stores").then((r) => r.json()),
      fetch("/api/admin/categories").then((r) => r.json()),
    ])
      .then(([storesData, catsData]) => {
        if (storesData.ok) setStores(storesData.stores);
        if (catsData.ok) setCategories(catsData.categories);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const selectedStore = stores.find((s) => s.id === selectedStoreId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Editar tiendas</h1>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          Selecciona una tienda para editar su información.
        </p>
      </div>

      <div className="w-full max-w-md">
        <label className="block">
          <div className="text-sm font-medium mb-1">Tienda</div>
          <select
            value={selectedStoreId}
            onChange={(e) => setSelectedStoreId(e.target.value)}
            className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          >
            <option value="">Seleccionar tienda...</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name} ({store.owner.name})
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading && (
        <div className="text-center py-8 text-sm text-[color:var(--muted)]">Cargando tiendas...</div>
      )}

      {!loading && !selectedStoreId && (
        <div className="rounded-xl border border-[var(--border)] p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-soft)]">
            <svg className="h-8 w-8 text-[var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div className="mt-4 font-medium">Selecciona una tienda</div>
          <div className="mt-1 text-sm text-[color:var(--muted)]">
            Elige una tienda del menú desplegable para editar sus datos.
          </div>
        </div>
      )}

      {!loading && selectedStore && (
        <div className="max-w-xl">
          <StoreForm store={selectedStore} categories={categories} onSaved={() => {}} />
        </div>
      )}
    </div>
  );
}
