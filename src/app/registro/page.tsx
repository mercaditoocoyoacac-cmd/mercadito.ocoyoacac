"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

export default function RegistroPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [verifying, setVerifying] = useState(false);

  async function sendPhoneCode() {
    if (!phone || phone.replace(/\D/g, "").length < 10) {
      setError("Ingresa un número de teléfono válido (mínimo 10 dígitos)");
      return;
    }
    setSendingCode(true);
    setError(null);
    
    try {
      const res = await fetch("/api/register/send-verification", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      
      if (data.ok) {
        setCodeSent(true);
      } else {
        setError(data.error || "Error al enviar código");
      }
    } catch {
      setError("Error al conectar con el servidor");
    }
    setSendingCode(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    
    if (!email || !password) {
      setError("Completa todos los campos requeridos");
      return;
    }

    if (password.length < 16) {
      setError("La contraseña debe tener al menos 16 caracteres");
      return;
    }
    
    if (!phone || !codeSent) {
      setError("Debes verificar tu número de teléfono");
      return;
    }

    setLoading(true);
    
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: name.trim() || undefined,
        email,
        password,
        phone: phone,
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
      callbackUrl: "/tiendas",
    });
    setLoading(false);
    router.push(login?.url ?? "/tiendas");
  }

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Registro de Cliente</h1>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Crea una cuenta para comprar en las tiendas de tu zona.
        </p>
      </div>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <div className="text-sm font-medium">Nombre (opcional)</div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            placeholder="Tu nombre"
          />
        </label>

        <label className="block">
          <div className="text-sm font-medium">Correo *</div>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            placeholder="tu@correo.com"
          />
        </label>

        <label className="block">
          <div className="text-sm font-medium">Contraseña *</div>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            placeholder="Mínimo 16 caracteres"
          />
          <p className="mt-1 text-xs text-[color:var(--muted)]">
            Debe tener: mayúscula, minúscula, número y carácter especial
          </p>
        </label>

        <label className="block">
          <div className="text-sm font-medium">Teléfono *</div>
          <input
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setCodeSent(false);
            }}
            type="tel"
            required
            disabled={codeSent}
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)] disabled:opacity-50"
            placeholder="55 1234 5678"
          />
          {!codeSent && (
            <button
              type="button"
              onClick={sendPhoneCode}
              disabled={sendingCode || !phone}
              className="mt-2 rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
            >
              {sendingCode ? "Enviando código..." : "Enviar código SMS"}
            </button>
          )}
        </label>

        {codeSent && (
          <label className="block">
            <div className="text-sm font-medium">Código de verificación *</div>
            <input
              value={phoneCode}
              onChange={(e) => setPhoneCode(e.target.value)}
              type="text"
              required
              maxLength={6}
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              placeholder="Código de 6 dígitos"
            />
            <p className="mt-1 text-xs text-green-600">✓ Código enviado al {phone}</p>
          </label>
        )}

        {error ? (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60"
        >
          {loading ? "Creando cuenta..." : "Crear cuenta"}
        </button>
      </form>

      <div className="mt-6 text-sm text-[color:var(--muted)]">
        ¿Ya tienes cuenta?{" "}
        <Link className="underline" href="/login">
          Inicia sesión
        </Link>
      </div>

      <div className="mt-4 border-t border-[var(--border)] pt-4 text-sm text-[color:var(--muted)]">
        ¿Quieres vender?{" "}
        <Link className="underline" href="/vendor/registro">
          Regístrate como vendedor
        </Link>
      </div>
    </main>
  );
}