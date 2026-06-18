"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type DayName = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

type DaySchedule = {
  active: boolean;
  start: string;
  end: string;
};

type AvailabilitySchedule = {
  mode: "weekly" | "daily";
  days: Record<DayName, DaySchedule>;
};

const DAY_LABELS: Record<DayName, string> = {
  monday: "Lunes",
  tuesday: "Martes",
  wednesday: "Miércoles",
  thursday: "Jueves",
  friday: "Viernes",
  saturday: "Sábado",
  sunday: "Domingo",
};

const DAY_ORDER: DayName[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

const DEFAULT_DAY: DaySchedule = { active: false, start: "09:00", end: "18:00" };

function emptySchedule(): AvailabilitySchedule {
  return {
    mode: "weekly",
    days: {
      monday: { ...DEFAULT_DAY },
      tuesday: { ...DEFAULT_DAY },
      wednesday: { ...DEFAULT_DAY },
      thursday: { ...DEFAULT_DAY },
      friday: { ...DEFAULT_DAY },
      saturday: { ...DEFAULT_DAY, active: false },
      sunday: { ...DEFAULT_DAY, active: false },
    },
  };
}

export default function HorariosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [schedule, setSchedule] = useState<AvailabilitySchedule>(emptySchedule);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/delivery/login");
      return;
    }
    if (status !== "authenticated") return;
    if (session.user.role !== "DELIVERY" && !(session.user.additionalRoles ?? "").split(",").includes("DELIVERY")) {
      router.replace("/delivery/login");
      return;
    }
    fetch("/api/delivery/schedule")
      .then(r => r.json())
      .then(data => {
        if (data.ok && data.schedule) {
          const s = data.schedule as AvailabilitySchedule;
          setSchedule({
            mode: s.mode || "weekly",
            days: Object.fromEntries(
              DAY_ORDER.map(d => [d, s.days?.[d] || { ...DEFAULT_DAY }])
            ) as Record<DayName, DaySchedule>,
          });
        }
      })
      .finally(() => setLoading(false));
  }, [status, session, router]);

  function updateDay(day: DayName, partial: Partial<DaySchedule>) {
    setSchedule(prev => ({
      ...prev,
      days: {
        ...prev.days,
        [day]: { ...prev.days[day], ...partial },
      },
    }));
  }

  function toggleActive(day: DayName) {
    updateDay(day, { active: !schedule.days[day].active });
  }

  function handleModeChange(newMode: "weekly" | "daily") {
    if (newMode === "weekly") {
      const activeDays = DAY_ORDER.filter(d => schedule.days[d].active);
      if (activeDays.length > 0) {
        const ref = schedule.days[activeDays[0]];
        setSchedule(prev => ({
          mode: "weekly",
          days: Object.fromEntries(
            DAY_ORDER.map(d => [d, { ...ref, active: prev.days[d].active }])
          ) as Record<DayName, DaySchedule>,
        }));
      } else {
        setSchedule(prev => ({ ...prev, mode: "weekly" }));
      }
    } else {
      setSchedule(prev => ({ ...prev, mode: "daily" }));
    }
  }

  function setAllSame() {
    const activeDays = DAY_ORDER.filter(d => schedule.days[d].active);
    if (activeDays.length === 0) return;
    const ref = schedule.days[activeDays[0]];
    setSchedule(prev => ({
      ...prev,
      mode: "weekly",
      days: Object.fromEntries(
        DAY_ORDER.map(d => [d, { ...ref, active: prev.days[d].active }])
      ) as Record<DayName, DaySchedule>,
    }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/delivery/schedule", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedule }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success("Horario guardado");
      } else {
        toast.error(data.error || "Error al guardar");
      }
    } catch {
      toast.error("Error de red");
    }
    setSaving(false);
  }

  const hasActiveDays = DAY_ORDER.some(d => schedule.days[d].active);

  if (loading) {
    return (
      <main className="mx-auto flex max-w-xl flex-1 items-center justify-center p-4">
        <p className="text-sm text-[color:var(--muted)]">Cargando...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Mis Horarios</h1>
      <p className="mb-6 text-sm text-[color:var(--muted)]">
        Configura los días y horarios en los que estás disponible para realizar entregas.
      </p>

      <div className="mb-6 flex gap-2">
        <button
          onClick={() => handleModeChange("weekly")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            schedule.mode === "weekly"
              ? "bg-[var(--accent)] text-white"
              : "border border-[var(--border)] text-[color:var(--muted)] hover:bg-[var(--accent-soft)]"
          }`}
        >
          Mismo horario todos los días
        </button>
        <button
          onClick={() => handleModeChange("daily")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            schedule.mode === "daily"
              ? "bg-[var(--accent)] text-white"
              : "border border-[var(--border)] text-[color:var(--muted)] hover:bg-[var(--accent-soft)]"
          }`}
        >
          Horario por día
        </button>
      </div>

      {schedule.mode === "weekly" && (
        <div className="mb-4 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] p-4">
          <p className="mb-3 text-sm font-medium text-[color:var(--muted)]">Días activos</p>
          <div className="flex flex-wrap gap-2">
            {DAY_ORDER.map(day => (
              <button
                key={day}
                onClick={() => toggleActive(day)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  schedule.days[day].active
                    ? "bg-[var(--accent)] text-white"
                    : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                }`}
              >
                {DAY_LABELS[day]}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {(schedule.mode === "daily" ? DAY_ORDER : DAY_ORDER.filter(d => schedule.days[d].active)).map(day => (
          <div
            key={day}
            className={`rounded-lg border p-4 transition-colors ${
              schedule.mode === "daily" && !schedule.days[day].active
                ? "border-dashed border-[var(--border)] opacity-60"
                : "border-[var(--border)] bg-[var(--card-bg)]"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {schedule.mode === "daily" && (
                  <input
                    type="checkbox"
                    checked={schedule.days[day].active}
                    onChange={() => toggleActive(day)}
                    className="h-4 w-4 rounded border-gray-300 text-[var(--accent)]"
                  />
                )}
                <span className="text-sm font-medium">{DAY_LABELS[day]}</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={schedule.days[day].start}
                  onChange={e => updateDay(day, { start: e.target.value })}
                  disabled={!schedule.days[day].active}
                  className="rounded-lg border border-[var(--border)] bg-transparent px-3 py-1.5 text-sm [font-size:16px] disabled:opacity-40"
                />
                <span className="text-sm text-[color:var(--muted)]">a</span>
                <input
                  type="time"
                  value={schedule.days[day].end}
                  onChange={e => updateDay(day, { end: e.target.value })}
                  disabled={!schedule.days[day].active}
                  className="rounded-lg border border-[var(--border)] bg-transparent px-3 py-1.5 text-sm [font-size:16px] disabled:opacity-40"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {!hasActiveDays && (
        <p className="mt-3 text-xs text-amber-600">
          Selecciona al menos un día activo para recibir entregas.
        </p>
      )}

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving || !hasActiveDays}
          className="rounded-lg bg-[var(--accent)] px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Guardando..." : "Guardar horario"}
        </button>
        {schedule.mode === "daily" && (
          <button
            onClick={setAllSame}
            className="rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[color:var(--muted)] transition-colors hover:bg-[var(--accent-soft)]"
          >
            Usar mismo horario en todos
          </button>
        )}
      </div>
    </main>
  );
}
