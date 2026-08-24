"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, Input, Button, Badge, Stepper, StepPanel } from "@/components/ui/design-system";

type RoleOption = "CUSTOMER" | "VENDOR" | "DELIVERY";

const roleIcons: Record<RoleOption, React.ReactNode> = {
  CUSTOMER: (
    <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  VENDOR: (
    <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  DELIVERY: (
    <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
    </svg>
  ),
};

const roleLabels: Record<RoleOption, { title: string; desc: string }> = {
  CUSTOMER: { title: "Comprar", desc: "Explora tiendas y compra productos locales" },
  VENDOR: { title: "Vender", desc: "Registra tu tienda y vende en línea" },
  DELIVERY: { title: "Repartir", desc: "Entrega pedidos y gana dinero" },
};

const roleColors: Record<RoleOption, { border: string; bg: string }> = {
  CUSTOMER: { border: "border-rose-500", bg: "bg-rose-50" },
  VENDOR: { border: "border-emerald-500", bg: "bg-emerald-50" },
  DELIVERY: { border: "border-orange-500", bg: "bg-orange-50" },
};

const roleRedirects: Record<RoleOption, string> = {
  CUSTOMER: "/tiendas",
  VENDOR: "/vendor",
  DELIVERY: "/delivery",
};

export default function RegistroPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [step, setStep] = useState(0); // 0: role, 1: form
  const [selectedRole, setSelectedRole] = useState<RoleOption | null>(null);
  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const role = session?.user?.role;
  const additionalRoles = session?.user?.additionalRoles?.split(",").filter(Boolean) || [];
  const isLoggedInVendorOrDelivery = session?.user && role !== "CUSTOMER" && !additionalRoles.includes("CUSTOMER");

  async function handleUpgrade() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: session?.user?.email,
        password: "placeholder",
        role: "CUSTOMER",
      }),
    });
    const data = await res.json().catch(() => null);
    setLoading(false);
    if (res.ok && data?.ok) {
      router.push("/tiendas");
    } else {
      setError(data?.error || "Error al activar modo cliente");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!selectedRole) {
      setError("Selecciona qué quieres hacer en Mercadito Ocoyoacac");
      return;
    }

    if (!email || !password || !phone) {
      setError("Completa todos los campos requeridos");
      return;
    }

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: (nombres.trim() + " " + apellidos.trim()).trim() || undefined,
        email,
        password,
        phone: phone || undefined,
        role: selectedRole,
      }),
    });
    const data = (await res.json().catch(() => null)) as
      | { ok: true; user: { id: string; email: string } }
      | { ok: false; error?: string }
      | null;

    if (!res.ok || !data?.ok) {
      setLoading(false);
      const msg = data && "error" in data ? data.error : "No se pudo registrar.";
      setError(msg ?? "No se pudo registrar.");
      return;
    }

    const login = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: roleRedirects[selectedRole],
    });
    setLoading(false);
    router.push(login?.url ?? roleRedirects[selectedRole]);
  }

  const steps = [
    { label: "Rol", completed: step > 0 },
    { label: "Datos", completed: step > 1 },
  ];

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-10 fade-in">
      <div className="mb-8">
        <Stepper steps={steps} current={step} showNumbers={true} className="mb-6" />
        
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            {isLoggedInVendorOrDelivery ? "Ser cliente también" : "Crear cuenta"}
          </h1>
          <p className="mt-2 text-sm text-[color:var(--muted)]">
            {isLoggedInVendorOrDelivery
              ? "Activa el modo cliente en tu cuenta para comprar en tiendas."
              : "Únete a Mercadito Ocoyoacac"}
          </p>
        </div>
      </div>

      {isLoggedInVendorOrDelivery ? (
        <Card variant="outlined" className="border-rose-300 bg-rose-50 mb-6">
          <CardContent className="p-4 text-sm text-rose-800 text-center">
            Sesión iniciada como <strong>{session?.user?.email}</strong> ({role?.toLowerCase()})
          </CardContent>
        </Card>
      ) : null}

      {isLoggedInVendorOrDelivery ? (
        <div className="space-y-4">
          <Button
            variant="outline"
            className="w-full border-rose-500 text-rose-600 hover:bg-rose-50"
            onClick={handleUpgrade}
            disabled={loading}
            loading={loading}
          >
            Activar modo cliente
          </Button>
          <p className="text-xs text-[color:var(--muted)] text-center">
            Tu cuenta de {role === "VENDOR" ? "vendedor" : "repartidor"} se conservará. Podrás cambiar entre roles desde el menú.
          </p>
        </div>
      ) : (
        <StepPanel step={0} current={step}>
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="text-base">¿Para qué deseas tu cuenta?</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-3 gap-3">
                {(["CUSTOMER", "VENDOR", "DELIVERY"] as const).map((r) => {
                  const colors = roleColors[r];
                  const isSelected = selectedRole === r;
                  return (
                    <Button
                      key={r}
                      type="button"
                      variant={isSelected ? "primary" : "outline"}
                      className={`h-32 flex flex-col items-center gap-3 ${isSelected ? "shadow-lg" : ""}`}
                      onClick={() => setSelectedRole(r)}
                    >
                      <span className={isSelected ? "text-white" : "text-[color:var(--muted)]"}>
                        {roleIcons[r]}
                      </span>
                      <div className="text-center">
                        <div className={`text-sm font-semibold ${isSelected ? "text-white" : ""}`}>
                          {roleLabels[r].title}
                        </div>
                        <div className={`text-[10px] leading-tight mt-0.5 ${isSelected ? "text-white/80" : "text-[color:var(--muted)]"}`}>
                          {roleLabels[r].desc}
                        </div>
                      </div>
                    </Button>
                  );
                })}
              </div>
              {error && step === 0 && (
                <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700" role="alert">
                  {error}
                </div>
              )}
              <Button
                size="lg"
                fullWidth
                disabled={!selectedRole}
                onClick={() => setStep(1)}
              >
                Continuar
              </Button>
            </CardContent>
          </Card>
        </StepPanel>
      )}

      <StepPanel step={1} current={step}>
        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="text-base">Completa tu registro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 pt-0">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Nombres"
                  value={nombres}
                  onChange={(e) => setNombres(e.target.value)}
                  placeholder="Juan"
                />
                <Input
                  label="Apellidos"
                  value={apellidos}
                  onChange={(e) => setApellidos(e.target.value)}
                  placeholder="Pérez"
                />
              </div>

              <Input
                label="Correo *"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                required
              />

              <Input
                label="Contraseña *"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                required
                minLength={8}
              />
              <p className="text-xs text-[color:var(--muted)]">Mínimo 8 caracteres</p>

              <Input
                label="Teléfono *"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="722..."
                required
              />

              {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700" role="alert">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button variant="outline" type="button" onClick={() => setStep(0)} fullWidth>
                  ← Atrás
                </Button>
                <Button type="submit" size="lg" fullWidth loading={loading}>
                  {loading ? "Creando cuenta..." : `Crear cuenta como ${selectedRole ? roleLabels[selectedRole].title : "..."}`}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </StepPanel>

      {!isLoggedInVendorOrDelivery && step === 1 && (
        <div className="mt-6 text-center text-sm text-[color:var(--muted)]">
          ¿Ya tienes cuenta?{" "}
          <Link className="underline font-medium text-[var(--accent)]" href="/login">
            Inicia sesión
          </Link>
        </div>
      )}
    </main>
  );
}