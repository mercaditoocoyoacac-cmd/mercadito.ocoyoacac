"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { Card, CardContent, CardHeader, CardTitle, Input, Button, Badge } from "@/components/ui/design-system";

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
      <div className="mb-8 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent-soft)]">
          <svg className="h-8 w-8 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Iniciar sesión</h1>
        <p className="mt-2 text-sm text-[color:var(--muted)]">Accede con tu correo y contraseña</p>
      </div>

      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="text-base">Bienvenido de nuevo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 pt-0">
          {suggestions.length > 0 && (
            <div className="space-y-3 p-4 rounded-xl bg-[var(--accent-soft)]/50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[color:var(--muted)] uppercase tracking-wide">Cuentas sugeridas</span>
                <Button variant="ghost" size="sm" onClick={clearSuggestions}>Limpiar</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((acc) => (
                  <Button
                    key={acc}
                    variant="ghost"
                    size="sm"
                    onClick={() => selectAccount(acc)}
                    className="text-left justify-start max-w-full"
                  >
                    <div className="truncate">{acc}</div>
                  </Button>
                ))}
              </div>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit} autoComplete="on">
            <Input
              label="Correo electrónico"
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: "" }));
              }}
              onBlur={() => {
                if (!email.trim()) setFieldErrors((prev) => ({ ...prev, email: "Ingresa tu correo" }));
                else setFieldErrors((prev) => ({ ...prev, email: "" }));
              }}
              placeholder="tu@correo.com"
              required
              error={fieldErrors.email}
            />

            <Input
              label="Contraseña"
              type="password"
              name="password"
              autoComplete="current-password"
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
              placeholder="********"
              required
              error={fieldErrors.password}
            />

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

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 flex items-center gap-2" role="alert">
                <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" size="lg" fullWidth loading={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <div className="text-center text-sm text-[color:var(--muted)]">
            ¿No tienes cuenta?{" "}
            <Link className="underline font-medium text-[var(--accent)]" href="/registro">
              Regístrate
            </Link>
          </div>

          <div className="pt-4 border-t border-[var(--border)] space-y-2">
            <Link href="/vendor/login" className="block text-sm text-[color:var(--muted)] hover:text-[var(--accent)] transition-colors">
              ¿Eres vendedor? Portal de vendedores
            </Link>
            <Link href="/delivery/login" className="block text-sm text-[color:var(--muted)] hover:text-[var(--accent)] transition-colors">
              ¿Eres repartidor? Portal de repartidores
            </Link>
            <Link href="/admin/login" className="block text-sm text-[color:var(--muted)] hover:text-[var(--accent)] transition-colors">
              ¿Eres administrador? Portal de administración
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}