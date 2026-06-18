"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

const LocationPicker = dynamic(
  () => import("@/components/maps/LocationPicker"),
  { ssr: false, loading: () => <div className="h-64 w-full bg-gray-100 animate-pulse rounded-xl" /> }
);

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
  openTime: string | null;
  closeTime: string | null;
  scheduleDays: string[];
  scheduleDetails?: StoreScheduleDetails;
}

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

export default function EditarTiendaPage() {
  const router = useRouter();
  const [store, setStore] = useState<Store | null>(null);
  const [loadingStore, setLoadingStore] = useState(true);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("CANASTA_BASICA");
  const [categories, setCategories] = useState<{ key: string; label: string; icon: string }[]>([]);
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [openTime, setOpenTime] = useState("");
  const [closeTime, setCloseTime] = useState("");
  const [scheduleDays, setScheduleDays] = useState<string[]>(
    DAYS.map((d) => d.key)
  );
  const [scheduleDetails, setScheduleDetails] = useState<StoreScheduleDetails>(defaultStoreSchedule());
  const [scheduleMode, setScheduleMode] = useState<"weekly" | "daily">("weekly");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (loadingStore && !store) {
    fetchStore();
    return (
      <div className="mx-auto max-w-xl">
        <div className="text-sm text-[color:var(--muted)]">Cargando...</div>
      </div>
    );
  }

  async function fetchStore() {
    const [storeRes, catsRes] = await Promise.all([
      fetch("/api/vendor/store"),
      fetch("/api/admin/categories"),
    ]);
    const catsData = await catsRes.json();
    if (catsData.ok) setCategories(catsData.categories);
    const data = (await storeRes.json()) as { ok: true; store: Store | null };
    if (data.store) {
      setStore(data.store);
      setName(data.store.name);
      setCategory(data.store.category);
      setDescription(data.store.description ?? "");
      setPhone(data.store.phone ?? "");
      setAddress(data.store.address ?? "");
      setImageUrl(data.store.imageUrl ?? "");
      setLatitude(data.store.latitude ?? null);
      setLongitude(data.store.longitude ?? null);
      setOpenTime(data.store.openTime ?? "");
      setCloseTime(data.store.closeTime ?? "");
      setScheduleDays(data.store.scheduleDays.length > 0 ? data.store.scheduleDays : DAYS.map((d) => d.key));
      if (data.store.scheduleDetails && data.store.scheduleDetails.days) {
        setScheduleDetails(data.store.scheduleDetails);
        setScheduleMode(data.store.scheduleDetails.mode || "weekly");
      }
    } else {
      router.push("/vendor/onboarding");
      return;
    }
    setLoadingStore(false);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = (await res.json()) as
      | { ok: true; url: string }
      | { ok: false; error?: string };

    setUploading(false);

    if (!res.ok || !data.ok) {
      const errorMsg = "error" in data ? data.error : "Error al subir imagen.";
      setError(errorMsg ?? "Error al subir imagen.");
      return;
    }

    if (!("url" in data)) {
      setError("Error al subir imagen.");
      return;
    }

    setImageUrl(data.url);
  }

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const activeDays = DAYS.filter(d => scheduleDetails.days[d.key]?.active);
    const syncOpenTime = activeDays.length > 0 ? scheduleDetails.days[activeDays[0].key].start : "";
    const syncCloseTime = activeDays.length > 0 ? scheduleDetails.days[activeDays[0].key].end : "";
    const syncScheduleDays = activeDays.map(d => d.key);

    const res = await fetch("/api/vendor/store", {
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

    const text = await res.text().catch(() => "");
    let data: { ok: true } | { ok: false; error?: string } = { ok: false };
    try { data = JSON.parse(text); } catch {}

    setSaving(false);

    if (!res.ok || !data.ok) {
      const msg = "error" in data && data.error ? data.error : `Error (${res.status}): ${text.slice(0, 200)}`;
      setError(msg);
      return;
    }

    router.push("/vendor/productos");
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-semibold tracking-tight">Editar tienda</h1>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <div className="text-sm font-medium">Logo o imagen de la tienda</div>
          <div className="flex items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="rounded-md border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-[var(--accent-soft)] disabled:opacity-60"
            >
              {uploading ? "Subiendo..." : "Cambiar imagen"}
            </button>
            {imageUrl && (
              <div className="relative h-16 w-16 overflow-hidden rounded-md border border-[var(--border)]">
                <img
                  src={imageUrl}
                  alt="Vista previa"
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setImageUrl("")}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 hover:opacity-100"
                >
                  ×
                </button>
              </div>
            )}
          </div>
          <p className="text-xs text-[color:var(--muted)]">
            JPG, PNG, WebP o GIF. Máx 5MB.
          </p>
        </div>

        <label className="block">
          <div className="text-sm font-medium">Nombre de la tienda</div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
        </label>

        <label className="block">
          <div className="text-sm font-medium">Categoría del negocio</div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          >
            <option value="CANASTA_BASICA">🛒 Canasta básica</option>
            {categories.filter((c) => c.key !== "CANASTA_BASICA").map((cat) => (
              <option key={cat.key} value={cat.key}>{cat.icon} {cat.label}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-[color:var(--muted)]">
            {category === "SERVICIOS"
              ? "Consultorios, estéticas, oficios, renta para fiestas. Sin envío ni recolección."
              : "Tiendas con productos disponibles para pedido y entrega."}
          </p>
        </label>

        <label className="block">
          <div className="text-sm font-medium">Descripción (opcional)</div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-1 w-full resize-none rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <div className="text-sm font-medium">Teléfono (opcional)</div>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label className="block">
            <div className="text-sm font-medium">Dirección (opcional)</div>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <svg className="h-5 w-5 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <div className="text-sm font-semibold">Ubicación de la tienda</div>
          </div>
          <p className="text-xs text-[color:var(--muted)] mb-4">
            Marca en el mapa la ubicación de tu tienda para calcular el costo de envío.
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

        <div className="rounded-xl border border-[var(--border)] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <svg className="h-5 w-5 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm font-semibold">Horario de atención</div>
          </div>
          <p className="text-xs text-[color:var(--muted)] mb-4">
            Los clientes solo podrán hacer pedidos durante tu horario configurado.
            Desmarca todos los días para aceptar pedidos 24/7.
          </p>

          <div className="mb-4 flex gap-2">
            <button
              type="button"
              onClick={() => handleStoreScheduleMode("weekly")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                scheduleMode === "weekly"
                  ? "bg-[var(--accent)] text-white"
                  : "border border-[var(--border)] text-[color:var(--muted)] hover:bg-[var(--accent-soft)]"
              }`}
            >
              Mismo horario todos los días
            </button>
            <button
              type="button"
              onClick={() => handleStoreScheduleMode("daily")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                scheduleMode === "daily"
                  ? "bg-[var(--accent)] text-white"
                  : "border border-[var(--border)] text-[color:var(--muted)] hover:bg-[var(--accent-soft)]"
              }`}
            >
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
                    <button
                      key={day.key}
                      type="button"
                      onClick={() => toggleDay(day.key)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                        isActive
                          ? "bg-[var(--accent)] text-white"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      {day.label.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-2">
            {(scheduleMode === "daily" ? DAYS : DAYS.filter(d => scheduleDays.includes(d.key))).map(day => (
              <div
                key={day.key}
                className={`flex items-center justify-between rounded-lg border p-3 ${
                  scheduleMode === "daily" && !scheduleDetails.days[day.key]?.active
                    ? "border-dashed border-gray-300 opacity-60"
                    : "border-gray-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  {scheduleMode === "daily" && (
                    <input
                      type="checkbox"
                      checked={scheduleDetails.days[day.key]?.active ?? false}
                      onChange={() => toggleDay(day.key)}
                      className="h-4 w-4 rounded border-gray-300 text-[var(--accent)]"
                    />
                  )}
                  <span className="text-sm font-medium">{day.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={scheduleDetails.days[day.key]?.start ?? "09:00"}
                    onChange={e => updateDaySchedule(day.key, { start: e.target.value })}
                    disabled={!scheduleDetails.days[day.key]?.active}
                    className="w-28 rounded-md border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm [font-size:16px] disabled:opacity-40"
                  />
                  <span className="text-xs text-[color:var(--muted)]">a</span>
                  <input
                    type="time"
                    value={scheduleDetails.days[day.key]?.end ?? "18:00"}
                    onChange={e => updateDaySchedule(day.key, { end: e.target.value })}
                    disabled={!scheduleDetails.days[day.key]?.active}
                    className="w-28 rounded-md border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm [font-size:16px] disabled:opacity-40"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {error ? (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 rounded-md border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-[var(--accent-soft)]"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving || uploading}
            className="flex-1 rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60"
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}
