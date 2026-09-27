"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";

const PORTALS: Record<string, { label: string; href: string; icon: string; activeCls: string }> = {
  VENDOR: { label: "Vendedor", href: "/vendor", icon: "🏪", activeCls: "bg-emerald-600 text-white shadow" },
  DELIVERY: { label: "Repartidor", href: "/delivery", icon: "🛵", activeCls: "bg-orange-500 text-white shadow" },
  CUSTOMER: { label: "Cliente", href: "/", icon: "🛍️", activeCls: "bg-rose-500 text-white shadow" },
};

export function RoleModeSwitcher({ availableRoles }: { availableRoles: string[] }) {
  const { data: session, update } = useSession();
  const [switching, setSwitching] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const current = session?.user?.role;
  const roles = availableRoles.filter((r) => PORTALS[r]);

  if (roles.length < 2 || !current) return null;

  async function switchMode(role: string) {
    if (role === current || switching) return;
    setSwitching(role);
    setError(null);
    try {
      const res = await fetch("/api/auth/switch-role", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        await update();
        window.location.assign(PORTALS[role].href);
      } else {
        setError(data?.error || "No se pudo cambiar de modo.");
        setSwitching(null);
      }
    } catch {
      setError("No se pudo cambiar de modo.");
      setSwitching(null);
    }
  }

  return (
    <div className="flex flex-col items-stretch gap-1">
      <div className="inline-flex self-center rounded-full bg-black/20 p-1 backdrop-blur-sm sm:self-auto" role="group" aria-label="Cambiar de modo">
        {roles.map((role) => {
          const cfg = PORTALS[role];
          const isActive = role === current;
          return (
            <button
              key={role}
              type="button"
              disabled={isActive || switching === role}
              onClick={() => switchMode(role)}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition ${
                isActive ? cfg.activeCls : "text-white/80 hover:bg-white/15"
              } disabled:cursor-default`}
            >
              <span aria-hidden>{cfg.icon}</span>
              {switching === role ? "Cambiando..." : cfg.label}
            </button>
          );
        })}
      </div>
      {error && <div className="text-center text-xs text-red-300 sm:text-left">{error}</div>}
    </div>
  );
}