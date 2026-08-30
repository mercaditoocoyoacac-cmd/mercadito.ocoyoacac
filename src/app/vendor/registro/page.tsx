"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { RegistroTutorial } from "@/components/ui/RegistroTutorial";

const STEPS = ["Cuenta", "Tu tienda"];

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

export default function VendorRegistroPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(session?.user?.id ? 1 : 0);

  // Step 0 fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");

  // Step 1 fields
  const [storeName, setStoreName] = useState("");
  const autoSlug = useMemo(() => slugify(storeName), [storeName]);
  const [slug] = useState("");
  const [category, setCategory] = useState("CANASTA_BASICA");
  const [categories, setCategories] = useState<{ key: string; label: string; icon: string }[]>([]);
  const [storeDescription, setStoreDescription] = useState("");
  const [storePhone, setStorePhone] = useState("");
  const [address, setAddress] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/admin/categories")
      .then((r) => r.json())
      .then((data) => { if (data.ok) setCategories(data.categories); })
      .catch(() => {});
  }, []);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = (await res.json()) as { ok: true; url: string } | { ok: false; error?: string };
    setUploading(false);
    if (!res.ok || !data.ok) { setError("Error al subir imagen."); return; }
    if (!("url" in data)) { setError("Error al subir imagen."); return; }
    setImageUrl(data.url);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (step === 0) {
      if (password.length < 8) { setError("La contraseña debe tener al menos 8 caracteres."); return; }
      setLoading(true);
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim() || undefined, email, password, phone, role: "VENDOR" }),
      });
      const data = await res.json().catch(() => null) as { ok: boolean; error?: string; upgraded?: boolean } | null;
      setLoading(false);
      if (!res.ok || !data?.ok) { setError(data?.error || "No se pudo registrar."); return; }
      if (data.upgraded) {
        setError("Tu cuenta se actualizó a vendedor. Inicia sesión.");
        setTimeout(() => router.push("/vendor/login"), 2000);
        return;
      }
      await signIn("credentials", { email, password, redirect: false });
      setStep(1);
      return;
    }

    if (step === 1) {
      setLoading(true);
      const res = await fetch("/api/vendor/store", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: storeName,
          slug: (slug || autoSlug).trim(),
          category,
          description: storeDescription.trim() || undefined,
          phone: storePhone.trim() || undefined,
          address: address.trim() || undefined,
          imageUrl: imageUrl || undefined,
        }),
      });
      const text = await res.text().catch(() => "");
      let data: { ok: boolean; error?: string } | null = null;
      try { data = JSON.parse(text); } catch {}
      setLoading(false);
      if (!res.ok || !data?.ok) { setError(data?.error || "No se pudo crear la tienda."); return; }
      router.push("/vendor/completar-registro");
      return;
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <RegistroTutorial formStep={step} />
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center">
              <div className="flex items-center gap-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                  i < step ? "bg-green-500 text-white" : i === step ? "bg-[var(--accent)] text-white" : "border border-[var(--border)] text-[color:var(--muted)]"
                }`}>
                  {i < step ? (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : i + 1}
                </div>
                <span className={`hidden text-sm sm:inline ${i === step ? "font-medium" : "text-[color:var(--muted)]"}`}>
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`mx-2 h-px w-8 sm:w-16 ${i < step ? "bg-green-500" : "bg-[var(--border)]"}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {step === 0 && !session?.user?.id && (
          <>
            <h1 className="text-2xl font-semibold tracking-tight">Crea tu cuenta</h1>
            <p className="text-sm text-[color:var(--muted)]">Paso 1 de 2 — tus datos para acceder.</p>

            <label className="block">
              <div className="text-sm font-medium">Nombre o nombre del negocio</div>
              <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]" placeholder="Panadería La Esquina" />
            </label>
            <label className="block">
              <div className="text-sm font-medium">Correo electrónico</div>
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]" placeholder="tu@negocio.com" />
            </label>
            <label className="block">
              <div className="text-sm font-medium">Teléfono</div>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" required className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]" placeholder="722..." />
            </label>
            <label className="block">
              <div className="text-sm font-medium">Contraseña</div>
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required minLength={8} className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]" placeholder="Mínimo 8 caracteres" />
            </label>

            <div className="flex items-center justify-between pt-2">
              <Link href="/vendor/login" className="text-sm text-[var(--accent)] hover:underline">¿Ya tienes cuenta?</Link>
              <button type="submit" disabled={loading} className="rounded-md bg-[var(--accent)] px-6 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60">
                {loading ? "Creando..." : "Continuar"}
              </button>
            </div>
          </>
        )}

        {step === 0 && session?.user?.id && (
          <div className="text-center py-8">
            <div className="text-5xl mb-4">👋</div>
            <h1 className="text-2xl font-semibold tracking-tight">Bienvenido</h1>
            <p className="mt-2 text-sm text-[color:var(--muted)]">Vamos a configurar tu tienda.</p>
            <button type="button" onClick={() => setStep(1)} className="mt-6 rounded-md bg-[var(--accent)] px-6 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]">
              Empezar
            </button>
          </div>
        )}

        {step === 1 && (
          <>
            <h1 className="text-2xl font-semibold tracking-tight">Tu tienda</h1>
            <p className="text-sm text-[color:var(--muted)]">Paso 2 de 2 — cuéntanos de tu negocio.</p>

            <div className="space-y-2">
              <div className="text-sm font-medium">Logo de la tienda</div>
              <div className="flex items-center gap-4">
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleFileChange} className="hidden" />
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="rounded-md border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-[var(--accent-soft)] disabled:opacity-60">
                  {uploading ? "Subiendo..." : "Elegir imagen"}
                </button>
                {imageUrl && (
                  <div className="relative h-16 w-16 overflow-hidden rounded-md border border-[var(--border)]">
                    <img src={imageUrl} alt="Logo" className="h-full w-full object-cover" />
                    <button type="button" onClick={() => setImageUrl("")} className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 hover:opacity-100">×</button>
                  </div>
                )}
              </div>
            </div>

            <label className="block">
              <div className="text-sm font-medium">Nombre de la tienda</div>
              <input value={storeName} onChange={(e) => setStoreName(e.target.value)} required className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]" placeholder="Ej: Panadería La Esquina" />
            </label>

            <label className="block">
              <div className="flex items-baseline justify-between gap-2">
                <div className="text-sm font-medium">Categoría</div>
                <span className="text-xs text-[color:var(--muted)]">{autoSlug ? `tienda/${autoSlug}` : ""}</span>
              </div>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]">
                {categories.map((cat) => (
                  <option key={cat.key} value={cat.key}>{cat.icon} {cat.label}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <div className="text-sm font-medium">Descripción (opcional)</div>
              <textarea value={storeDescription} onChange={(e) => setStoreDescription(e.target.value)} rows={3} className="mt-1 w-full resize-none rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]" placeholder="¿Qué vendes? Horarios, especialidades..." />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <div className="text-sm font-medium">Teléfono de la tienda (opcional)</div>
                <input value={storePhone} onChange={(e) => setStorePhone(e.target.value)} className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]" placeholder="722..." />
              </label>
              <label className="block">
                <div className="text-sm font-medium">Dirección (opcional)</div>
                <input value={address} onChange={(e) => setAddress(e.target.value)} className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]" placeholder="Centro, Ocoyoacac" />
              </label>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button type="button" onClick={() => setStep(0)} className="text-sm text-[color:var(--muted)] hover:text-[var(--accent)]">← Atrás</button>
              <button type="submit" disabled={loading || uploading} className="rounded-md bg-[var(--accent)] px-6 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60">
                {loading ? "Creando tienda..." : "Crear tienda e ir al panel"}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
