"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { EnableNotifications } from "@/components/ui/EnableNotifications";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Button,
  Badge,
  EmptyState,
  Dialog,
  Skeleton,
  SkeletonCard,
  AddressCard,
  AddressList,
} from "@/components/ui/design-system";

const LocationPicker = dynamic(
  () => import("@/components/maps/LocationPicker"),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full rounded-xl" /> }
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
  addresses?: Address[];
}

interface Address {
  id: string;
  label: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  latitude?: number;
  longitude?: number;
  isDefault?: boolean;
  instructions?: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    nombres: "",
    apellidos: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
  });

  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);

  const [verifyModal, setVerifyModal] = useState<{ open: boolean; type: string; target: string }>({
    open: false,
    type: "",
    target: "",
  });
  const [verifyCode, setVerifyCode] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    fetchProfile();
    fetch("/api/profile/active-orders")
      .then(r => r.json())
      .then(data => { if (data.ok) setActiveOrders(data.orders); });
  }, []);

  async function fetchProfile() {
    try {
      const res = await fetch("/api/profile");
      const data = await res.json();
      if (data.ok) {
        setProfile(data.user);
        const parts = (data.user.name || "").trim().split(" ");
        const nombres = parts.slice(0, -1).join(" ");
        const apellidos = parts.slice(-1).join(" ");
        setFormData({
          nombres,
          apellidos,
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
          name: (formData.nombres.trim() + " " + formData.apellidos.trim()).trim(),
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
        <div className="space-y-6">
          <Skeleton className="h-8 w-48 rounded" />
          <SkeletonCard showImage={false} showTitle={true} showDescription={true} showFooter={true} />
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 fade-in">
        <EmptyState
          illustration="store"
          title="Error al cargar el perfil"
          action={{ label: "Reintentar", onClick: fetchProfile, variant: "primary" }}
        />
      </main>
    );
  }

  const handleAddressSelect = (address: Address) => {
    setFormData({
      ...formData,
      address: address.street,
      city: address.city,
      state: address.state,
      zipCode: address.zipCode,
    });
    setLocation({ lat: address.latitude ?? 0, lng: address.longitude ?? 0 });
    toast.success(`Dirección "${address.label}" seleccionada`);
  };

  const handleAddAddress = () => {
    const newAddress: Address = {
      id: `addr_${Date.now()}`,
      label: "Nueva dirección",
      street: formData.address,
      city: formData.city,
      state: formData.state,
      zipCode: formData.zipCode,
      latitude: location?.lat,
      longitude: location?.lng,
    };
    setProfile(prev => prev ? { ...prev, addresses: [...(prev.addresses || []), newAddress] } : null);
    toast.success("Dirección agregada");
  };

  const handleEditAddress = (address: Address) => {
    setFormData({
      ...formData,
      address: address.street,
      city: address.city,
      state: address.state,
      zipCode: address.zipCode,
    });
    setLocation({ lat: address.latitude ?? null, lng: address.longitude ?? null });
  };

  const handleDeleteAddress = (id: string) => {
    setProfile(prev => prev ? { ...prev, addresses: prev.addresses?.filter(a => a.id !== id) } : null);
    toast.success("Dirección eliminada");
  };

  const handleSetDefaultAddress = (id: string) => {
    setProfile(prev => prev ? { 
      ...prev, 
      addresses: prev.addresses?.map(a => ({ ...a, isDefault: a.id === id })) 
    } : null);
    toast.success("Dirección predeterminada actualizada");
  };

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 lg:py-10 fade-in">
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">Mi Perfil</h1>
            <p className="mt-1 text-sm text-[color:var(--muted)]">Actualiza tu información personal</p>
          </div>
          {profile.role === "ADMIN" && (
            <Link href="/admin" className="shrink-0">
              <Button variant="outline" leftIcon={
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
              }>
                Panel Admin
              </Button>
            </Link>
          )}
        </div>
      </div>

      {activeOrders.length > 0 && (
        <div className="mb-6 space-y-3" role="list" aria-label="Pedidos activos">
          {activeOrders.map(o => (
            <Card key={o.id} variant={o.arrivedAt && o.status === "OUT_FOR_DELIVERY" ? "elevated" : "outlined"} className={o.arrivedAt && o.status === "OUT_FOR_DELIVERY" ? "border-orange-300 bg-orange-50 shadow-lg" : "border-orange-200 bg-orange-50"}>
              <CardContent className="p-6 text-center">
                <div className="text-3xl mb-2">{o.arrivedAt ? "🛵" : "📦"}</div>
                <div className="text-base font-bold text-gray-900">
                  {o.arrivedAt ? "¡El repartidor está en camino a entregarte!" : "Pedido listo en " + o.store.name}
                </div>
                <div className="mt-3 inline-block rounded-xl bg-white px-6 py-3 shadow-inner">
                  <div className="font-mono text-4xl font-bold tracking-[0.25em] text-gray-900">{o.pickupCode}</div>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  {o.arrivedAt ? "Proporciona este código al repartidor" : "Proporciona este código al recoger en tienda"}
                </div>
                <Link href={`/mis-pedidos/${o.id}`} className="mt-3 inline-block text-xs text-[var(--accent)] hover:underline">
                  Ver detalle del pedido →
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-700" role="status">
          {success}
        </div>
      )}

      {/* Notifications Section */}
      <Card variant="outlined" className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Notificaciones</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-[color:var(--muted)]">Recibe alertas cuando haya nuevos pedidos, entregas o actualizaciones</p>
          <div className="mt-4"><EnableNotifications /></div>
        </CardContent>
      </Card>

      {/* Profile Form */}
      <form onSubmit={handleSave} className="space-y-6">
        <Card variant="outlined">
          <CardHeader>
            <CardTitle className="text-base">Información personal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 pt-0">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Nombres *"
                value={formData.nombres}
                onChange={(e) => setFormData({ ...formData, nombres: e.target.value })}
                placeholder="Juan"
                required
              />
              <Input
                label="Apellidos *"
                value={formData.apellidos}
                onChange={(e) => setFormData({ ...formData, apellidos: e.target.value })}
                placeholder="Pérez"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium">
                Correo electrónico
                {profile.emailVerified && <Badge variant="success" size="sm" className="ml-2">Verificado</Badge>}
              </label>
              <div className="mt-1 flex gap-2">
                <Input
                  type="email"
                  value={profile.email}
                  disabled
                  className="flex-1 bg-gray-50 text-gray-500"
                />
                {!profile.emailVerified && (
                  <Button 
                    variant="outline" 
                    onClick={() => sendVerificationCode("email")}
                    disabled={sendingCode}
                    loading={sendingCode}
                  >
                    Verificar
                  </Button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium">
                Teléfono
                {profile.phoneVerified && <Badge variant="success" size="sm" className="ml-2">Verificado</Badge>}
              </label>
              <div className="mt-1 flex flex-col gap-2">
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="55 1234 5678"
                />
                {!profile.phoneVerified && formData.phone && (
                  <Button 
                    variant="outline" 
                    onClick={() => sendVerificationCode("phone")}
                    disabled={sendingCode}
                    loading={sendingCode}
                  >
                    Verificar teléfono
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardHeader>
            <CardTitle className="text-base">Dirección</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 pt-0">
            <Input
              label="Calle y número"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Av. Principal #123"
            />

            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                label="Ciudad"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Ocoyoacac"
              />
              <Input
                label="Estado"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="Estado de México"
              />
              <Input
                label="C.P."
                value={formData.zipCode}
                onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                placeholder="52740"
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Ubicación en el mapa</label>
              <p className="mt-1 text-xs text-[color:var(--muted)]">Toca o haz clic en el mapa para marcar tu ubicación de entrega</p>
              <div className="mt-2">
                <LocationPicker
                  latitude={location?.lat ?? null}
                  longitude={location?.lng ?? null}
                  onLocationChange={(lat, lng) => setLocation({ lat, lng })}
                />
              </div>
              {location && (
                <p className="mt-2 text-xs text-green-600 flex items-center gap-1">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  Ubicación seleccionada
                </p>
              )}
            </div>

            {/* Saved Addresses */}
            {(profile.addresses && profile.addresses.length > 0) && (
              <div className="pt-4 border-t border-[var(--border)]">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">Direcciones guardadas</h4>
                  <Button variant="ghost" size="sm" onClick={handleAddAddress} leftIcon={
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                  }>
                    Agregar actual
                  </Button>
                </div>
                <AddressList
                  addresses={profile.addresses}
                  onSelect={handleAddressSelect}
                  onAdd={handleAddAddress}
                  onEdit={handleEditAddress}
                  onDelete={handleDeleteAddress}
                  onSetDefault={handleSetDefaultAddress}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Button type="submit" size="lg" fullWidth loading={saving}>
          {saving ? "Guardando..." : "Guardar cambios"}
        </Button>
      </form>

      {/* Verification Dialog */}
      <Dialog
        open={verifyModal.open}
        onClose={() => setVerifyModal({ open: false, type: "", target: "" })}
        title={`Verificar ${verifyModal.type === "email" ? "correo" : "teléfono"}`}
        description={`Ingresa el código que enviamos a <strong>{verifyModal.target}</strong>`}
        size="sm"
      >
        <form onSubmit={handleVerifyCode} className="space-y-4">
          <Input
            value={verifyCode}
            onChange={(e) => setVerifyCode(e.target.value)}
            placeholder="000000"
            maxLength={6}
            className="text-center text-2xl tracking-widest"
            required
          />
          <div className="flex gap-3">
            <Button variant="outline" type="button" onClick={() => setVerifyModal({ open: false, type: "", target: "" })} fullWidth>
              Cancelar
            </Button>
            <Button type="submit" loading={verifying} fullWidth>
              Verificar
            </Button>
          </div>
        </form>
      </Dialog>
    </main>
  );
}