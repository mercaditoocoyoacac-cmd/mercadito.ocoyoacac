"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import dynamic from "next/dynamic";

const LocationPicker = dynamic(
  () => import("@/components/maps/LocationPicker"),
  { ssr: false, loading: () => <div className="h-64 w-full bg-gray-100 animate-pulse rounded-lg" /> }
);

interface ProfileData {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: number | null;
  longitude: number | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  role: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
  });

  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  const [verifyModal, setVerifyModal] = useState<{ open: boolean; type: string; target: string }>({
    open: false,
    type: "",
    target: "",
  });
  const [verifyCode, setVerifyCode] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useState(() => {
    fetchProfile();
  });

  async function fetchProfile() {
    try {
      const res = await fetch("/api/profile");
      const data = await res.json();
      if (data.ok) {
        setProfile(data.user);
        setFormData({
          name: data.user.name || "",
          phone: data.user.phone || "",
          address: data.user.address || "",
          city: data.user.city || "",
          state: data.user.state || "",
          zipCode: data.user.zipCode || "",
        });
        if (data.user.latitude && data.user.longitude) {
          setLocation({ lat: data.user.latitude, lng: data.user.longitude });
        }
      }
    } catch (_e) {
      setError("Error al cargar perfil");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...formData,
          latitude: location?.lat,
          longitude: location?.lng,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setSuccess("Perfil actualizado");
        fetchProfile();
      } else {
        setError(data.error || "Error al guardar");
      }
    } catch (_e) {
      setError("Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function sendVerificationCode(type: "email" | "phone") {
    setSendingCode(true);
    const target = type === "email" ? profile?.email : profile?.phone;
    
    try {
      const res = await fetch("/api/profile/send-verification", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type, target }),
      });
      const data = await res.json();
      if (data.ok) {
        setVerifyModal({ open: true, type, target: data.target });
        toast.success(`Código enviado a ${data.target}`);
      } else {
        setError(data.error || "Error al enviar código");
      }
    } catch (_e) {
      setError("Error al enviar código");
    } finally {
      setSendingCode(false);
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setVerifying(true);
    
    try {
      const res = await fetch("/api/profile/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: verifyModal.type,
          target: verifyModal.target,
          code: verifyCode,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setVerifyModal({ open: false, type: "", target: "" });
        setVerifyCode("");
        fetchProfile();
        toast.success("Verificación exitosa");
      } else {
        setError(data.error || "Código incorrecto");
      }
    } catch {
      setError("Error al verificar");
    } finally {
      setVerifying(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 fade-in">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-gray-200"></div>
          <div className="h-64 rounded-xl bg-gray-200"></div>
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 fade-in">
        <p className="text-red-600">Error al cargar el perfil</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mi Perfil</h1>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            Actualiza tu información personal
          </p>
        </div>
        {profile.role === "ADMIN" && (
          <Link
            href="/admin"
            className="shrink-0 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 transition-colors"
          >
            Ir al Panel Admin
          </Link>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-4 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      <form onSubmit={handleSave} className="mt-6 space-y-6">
        <div className="rounded-xl border border-[var(--border)] bg-white p-6">
          <h2 className="font-semibold">Información personal</h2>
          
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium">Nombre completo *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 w-full rounded-lg border border-[var(--border)] px-4 py-2.5"
                placeholder="Tu nombre completo"
              />
            </div>

            <div>
              <label className="block text-sm font-medium">
                Correo electrónico
                {profile.emailVerified && <span className="ml-2 text-green-600">✓ Verificado</span>}
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  type="email"
                  value={profile.email}
                  disabled
                  className="flex-1 rounded-lg border border-[var(--border)] bg-gray-50 px-4 py-2.5 text-gray-500"
                />
                {!profile.emailVerified && (
                  <button
                    type="button"
                    onClick={() => sendVerificationCode("email")}
                    disabled={sendingCode}
                    className="rounded-lg border border-[var(--accent)] px-4 py-2 text-sm text-[var(--accent)] hover:bg-[var(--accent-soft)] disabled:opacity-50"
                  >
                    {sendingCode ? "Enviando..." : "Verificar"}
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium">
                Teléfono
                {profile.phoneVerified && <span className="ml-2 text-green-600">✓ Verificado</span>}
              </label>
              <div className="mt-1">
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full rounded-lg border border-[var(--border)] px-4 py-2.5"
                  placeholder="55 1234 5678"
                />
                {!profile.phoneVerified && formData.phone && (
                  <button
                    type="button"
                    onClick={() => sendVerificationCode("phone")}
                    disabled={sendingCode}
                    className="mt-2 rounded-lg border border-[var(--accent)] px-4 py-2 text-sm text-[var(--accent)] hover:bg-[var(--accent-soft)] disabled:opacity-50"
                  >
                    {sendingCode ? "Enviando..." : "Verificar teléfono"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-white p-6">
          <h2 className="font-semibold">Dirección</h2>
          
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium">Calle y número</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="mt-1 w-full rounded-lg border border-[var(--border)] px-4 py-2.5"
                placeholder="Av. Principal #123"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium">Ciudad</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] px-4 py-2.5"
                  placeholder="Ocoyoacac"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Estado</label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] px-4 py-2.5"
                  placeholder="Estado de México"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">C.P.</label>
                <input
                  type="text"
                  value={formData.zipCode}
                  onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] px-4 py-2.5"
                  placeholder="52740"
                />
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium">Ubicación en el mapa</label>
              <p className="mt-1 text-xs text-[color:var(--muted)]">
                Toca o haz clic en el mapa para marcar tu ubicación de entrega
              </p>
              <div className="mt-2">
                <LocationPicker
                  latitude={location?.lat ?? null}
                  longitude={location?.lng ?? null}
                  onLocationChange={(lat, lng) => setLocation({ lat, lng })}
                />
              </div>
              {location && (
                <p className="mt-2 text-xs text-green-600">
                  ✓ Ubicación seleccionada
                </p>
              )}
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-xl bg-[var(--accent)] py-3 font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
        >
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
      </form>

      {verifyModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold">Verificar {verifyModal.type === "email" ? "correo" : "teléfono"}</h3>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              Ingresa el código que enviamos a <strong>{verifyModal.target}</strong>
            </p>
            
            <form onSubmit={handleVerifyCode} className="mt-4 space-y-4">
              <input
                type="text"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] px-4 py-3 text-center text-2xl tracking-widest"
                placeholder="000000"
                maxLength={6}
                required
              />
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setVerifyModal({ open: false, type: "", target: "" })}
                  className="flex-1 rounded-lg border border-[var(--border)] py-2.5"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={verifying}
                  className="flex-1 rounded-lg bg-[var(--accent)] py-2.5 font-semibold text-white disabled:opacity-50"
                >
                  {verifying ? "Verificando..." : "Verificar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}