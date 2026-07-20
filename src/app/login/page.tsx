"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { FieldError } from "@/components/ui/FieldError";

const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "";
const STORAGE_KEY = "mercadito_suggested_accounts";

function getSuggestedAccounts(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveSuggestedAccount(email: string) {
  const accounts = getSuggestedAccounts().filter((a) => a !== email);
  accounts.unshift(email);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts.slice(0, 5)));
}

export default function LoginPage() {
  const router = useRouter();
  const captchaRef = useRef<ReCAPTCHA>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSuggestions(getSuggestedAccounts().filter((a) => a !== email));
  }, [email]);

  async function redirectByRole() {
    const sessionRes = await fetch("/api/auth/session");
    const session = await sessionRes.json();
    const role = session?.user?.role;
    const extra = session?.user?.additionalRoles;
    if (extra) { router.push("/"); return; }
    if (role === "VENDOR") router.push("/vendor");
    else if (role === "DELIVERY") router.push("/delivery");
    else if (role === "ADMIN") router.push("/admin");
    else router.push("/");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const errors: Record<string, string> = {};
    if (!email.trim()) errors.email = "Ingresa tu correo";
    if (!password) errors.password = "Ingresa tu contraseña";
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    const captchaToken = captchaRef.current?.getValue() || "";
    if (RECAPTCHA_SITE_KEY && !captchaToken) {
      setError("Confirma que no eres un robot.");
      return;
    }

    setLoading(true);
    const res = await signIn("credentials", {
      email,
      password,
      captchaToken,
      redirect: false,
    });
    setLoading(false);
    if (!res || res.error) {
      captchaRef.current?.reset();
      setError("Correo o contraseña incorrectos.");
      return;
    }
    saveSuggestedAccount(email);
    await redirectByRole();
  }

  function selectAccount(acc: string) {
    setEmail(acc);
    setTimeout(() => passwordRef.current?.focus(), 100);
  }

  function clearSuggestions() {
    localStorage.removeItem(STORAGE_KEY);
    setSuggestions([]);
  }

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-10 fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Iniciar sesión</h1>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Accede con tu correo y contraseña.
        </p>
      </div>

      <div className="mt-6">
        {suggestions.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-[color:var(--muted)] uppercase tracking-wide">Cuentas sugeridas</span>
              <button
                type="button"
                onClick={clearSuggestions}
                className="text-xs text-[color:var(--muted)] hover:underline"
              >
                Limpiar
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((acc) => (
                <button
                  key={acc}
                  type="button"
                  onClick={() => selectAccount(acc)}
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium text-left hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] transition-colors max-w-full"
                >
                  <div className="truncate">{acc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit} autoComplete="on">
        <label className="block">
          <div className="text-sm font-medium">Correo</div>
          <input
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: "" }));
            }}
            onBlur={() => {
              if (!email.trim()) setFieldErrors((prev) => ({ ...prev, email: "Ingresa tu correo" }));
              else setFieldErrors((prev) => ({ ...prev, email: "" }));
            }}
            type="email"
            name="email"
            autoComplete="email"
            required
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            placeholder="tu@correo.com"
          />
          <FieldError message={fieldErrors.email} />
        </label>

        <label className="block">
          <div className="text-sm font-medium">Contraseña</div>
          <input
            ref={passwordRef}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: "" }));
            }}
            onBlur={() => {
              if (!password) setFieldErrors((prev) => ({ ...prev, password: "Ingresa tu contraseña" }));
              else setFieldErrors((prev) => ({ ...prev, password: "" }));
            }}
            type="password"
            name="password"
            autoComplete="current-password"
            required
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            placeholder="********"
          />
          <FieldError message={fieldErrors.password} />
        </label>

        <div className="text-right">
          <Link href="/recuperar-contrasena" className="text-xs text-[var(--accent)] hover:underline">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        {RECAPTCHA_SITE_KEY ? (
          <div className="flex justify-center">
            <ReCAPTCHA ref={captchaRef} sitekey={RECAPTCHA_SITE_KEY} />
          </div>
        ) : null}

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
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
      </div>

      <div className="mt-6 text-sm text-[color:var(--muted)]">
        ¿No tienes cuenta?{" "}
        <Link className="underline" href="/registro">
          Regístrate
        </Link>
      </div>

      <div className="mt-4 flex flex-col gap-2 border-t border-[var(--border)] pt-4 text-sm text-[color:var(--muted)]">
        <Link className="underline" href="/vendor/login">
          ¿Eres vendedor? Portal de vendedores
        </Link>
        <Link className="underline" href="/delivery/login">
          ¿Eres repartidor? Portal de repartidores
        </Link>
        <Link className="underline" href="/admin/login">
          ¿Eres administrador? Portal de administración
        </Link>
      </div>
    </main>
  );
}
