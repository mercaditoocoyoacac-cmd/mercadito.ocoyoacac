"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

type SortMode = "date" | "name" | "manual";
type SortDir = "asc" | "desc";

export function SortControls({
  mode,
  dir,
  isManual,
  onChangeSort,
}: {
  mode: SortMode;
  dir: SortDir;
  isManual: boolean;
  onChangeSort?: (newMode: SortMode, newDir?: SortDir) => Promise<void>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const navigate = useCallback(
    async (newMode: SortMode, newDir?: SortDir) => {
      if (onChangeSort && newMode !== "manual") {
        await onChangeSort(newMode, newDir);
      }
      const params = new URLSearchParams(searchParams.toString());
      params.set("sort", newMode);
      if (newDir) params.set("dir", newDir);
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams, onChangeSort]
  );

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border)] bg-white px-4 py-3">
      <span className="text-sm font-medium text-[color:var(--muted)]">Ordenar por:</span>

      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => navigate("date", mode === "date" ? (dir === "desc" ? "asc" : "desc") : "desc")}
          className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === "date"
              ? "bg-[var(--accent)] text-white"
              : "bg-gray-100 text-[color:var(--muted)] hover:bg-gray-200"
          }`}
        >
          Fecha
          {mode === "date" && (
            <svg className={`h-3.5 w-3.5 transition-transform ${dir === "asc" ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </button>

        <button
          onClick={() => navigate("name", mode === "name" ? (dir === "asc" ? "desc" : "asc") : "asc")}
          className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === "name"
              ? "bg-[var(--accent)] text-white"
              : "bg-gray-100 text-[color:var(--muted)] hover:bg-gray-200"
          }`}
        >
          Nombre
          {mode === "name" && (
            <svg className={`h-3.5 w-3.5 transition-transform ${dir === "desc" ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </button>

        <button
          onClick={() => navigate("manual")}
          className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === "manual"
              ? "bg-[var(--accent)] text-white"
              : "bg-gray-100 text-[color:var(--muted)] hover:bg-gray-200"
          }`}
        >
          Orden libre
        </button>
      </div>

      {mode === "date" && (
        <span className="text-xs text-[color:var(--muted)]">
          {dir === "desc" ? "Más reciente primero" : "Más antiguo primero"}
        </span>
      )}
      {mode === "name" && (
        <span className="text-xs text-[color:var(--muted)]">
          {dir === "asc" ? "A — Z" : "Z — A"}
        </span>
      )}
      {isManual && (
        <span className="text-xs text-[color:var(--muted)]">
          Escribe el n&uacute;mero de orden y presiona Guardar orden
        </span>
      )}
    </div>
  );
}
