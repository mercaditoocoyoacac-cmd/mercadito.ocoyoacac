"use client";

import { signIn, useSession } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";

function generateSecurePassword() {
  const length = 20;
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset[array[i] % charset.length];
  }
  return password;
}

export default function AdminRegistroPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [adminKey, setAdminKey] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGeneratePassword = () => {
    setGeneratedPassword(generateSecurePassword());
    setPassword(generatedPassword);
    setConfirmPassword(generatedPassword);
  };

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Registro de Administrador</h1>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Este registro está protegido. Solo para uso del propietario del sistema.
        </p>
      </div>

      <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 mb-6">
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="text-sm text-yellow-800">
            <strong>Requisitos de seguridad:</strong> Contraseña mínima 16 caracteres con mayúscula, minúscula, número y carácter especial.
          </div>
        </div>
      </div>

      <form
        className="mt-6 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setLoading(true);
          setError(null);

          if (password !== confirmPassword) {
            setLoading(false);
            setError("Las contraseñas no coinciden.");
            return;
          }

          if (password.length < 16) {
            setLoading(false);
            setError("La contraseña debe tener al menos 16 caracteres.");
            return;
          }

          const res = await fetch("/api/register", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              email,
              password,
              adminKey,
            }),
          });
          const data = (await res.json().catch(() => null)) as
            | { ok: true; user: { id: string; email: string } }
            | { ok: false; error?: string }
            | null;

          if (!res.ok || !data?.ok) {
            setLoading(false);
            const msg = data && "error" in data ? data.error : "No se pudo registrar.";
            setError(msg ?? "Error desconocido.");
            return;
          }

          const login = await signIn("credentials", {
            email,
            password,
            redirect: false,
            callbackUrl: "/admin",
          });
          setLoading(false);
          if (login?.ok) {
            window.location.href = "/admin";
          } else {
            window.location.href = "/admin/login";
          }
        }}
      >
        <label className="block">
          <div className="text-sm font-medium">Correo electrónico</div>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            placeholder="admin@tu-dominio.com"
          />
        </label>

        <div className="rounded-lg border border-[var(--border)] p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Contraseña segura</div>
            <button
              type="button"
              onClick={handleGeneratePassword}
              className="text-xs text-[var(--accent)] hover:underline"
            >
              Generar contraseña segura
            </button>
          </div>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
            className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)] font-mono"
            placeholder="Mínimo 16 caracteres"
          />
          {generatedPassword && (
            <div className="text-xs text-green-600 bg-green-50 p-2 rounded font-mono break-all">
              Contraseña generada: {generatedPassword}
              <br />
              <span className="text-[color:var(--muted)]">Copia esta contraseña ahora. No se mostrará de nuevo.</span>
            </div>
          )}
        </div>

        <label className="block">
          <div className="text-sm font-medium">Confirmar contraseña</div>
          <input
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            type="password"
            required
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)] font-mono"
            placeholder="Repite la contraseña"
          />
        </label>

        <label className="block">
          <div className="text-sm font-medium">Clave de administrador</div>
          <input
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            type="password"
            required
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            placeholder="Clave segura proporcionada por el sistema"
          />
          <div className="text-xs text-[color:var(--muted)] mt-1">
            Esta clave se establece en las variables de entorno del servidor.
          </div>
        </label>

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
          {loading ? "Registrando..." : "Crear administrador"}
        </button>
      </form>

      <div className="mt-6 text-sm text-[color:var(--muted)] text-center">
        <Link href="/admin/login" className="underline">
          ¿Ya tienes cuenta? Iniciar sesión
        </Link>
      </div>
    </main>
  );
}