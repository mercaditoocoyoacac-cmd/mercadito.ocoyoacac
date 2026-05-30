"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

export default function BecomeVendorPage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentRole = session?.user?.role;

  async function handleUpgrade() {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/vendor/upgrade", {
      method: "POST",
    });

    const data = (await res.json()) as { ok: true } | { ok: false; error?: string };

    setLoading(false);

    if (!res.ok || !data.ok) {
      const msg = "error" in data ? data.error : "No se pudo completar.";
      setError(msg ?? "Error desconocido.");
      return;
    }

    await update();
    router.push("/vendor/registro");
  }

  if (!session) {
    return (
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Convertirte en vendedor</h1>
          <p className="mt-2 text-sm text-[color:var(--muted)]">
            Inicia sesión para convertirte en vendedor.
          </p>
        </div>
        <Link
          href="/login"
          className="mt-4 inline-flex rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
        >
          Iniciar sesión
        </Link>
      </main>
    );
  }

  if (currentRole === "VENDOR") {
    return (
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Ya eres vendedor</h1>
          <p className="mt-2 text-sm text-[color:var(--muted)]">
            Ya tienes una cuenta de vendedor.
          </p>
        </div>
        <Link
          href="/vendor"
          className="mt-4 inline-flex rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
        >
          Ir a mi tienda
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Convierte tu cuenta en vendedor</h1>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Podrás crear tu tienda y publicar productos.
        </p>
      </div>

      <div className="rounded-xl border border-[var(--accent)] bg-[var(--accent-soft)] p-4">
        <div className="text-sm">
          <div className="font-medium">Tu cuenta actual:</div>
          <div className="text-[color:var(--muted)]">
            Email: {session.user?.email}
          </div>
          <div className="text-[color:var(--muted)]">
            Rol: {currentRole === "CUSTOMER" ? "Cliente" : "Repartidor"}
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        onClick={handleUpgrade}
        disabled={loading}
        className="mt-4 w-full rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60"
      >
        {loading ? "Convirtiendo..." : "Convertirme en vendedor"}
      </button>
    </main>
  );
}