"use client";

export default function TiendaError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8">
      <h2 className="text-xl font-semibold">Error al cargar tienda</h2>
      <p className="text-[color:var(--muted)] text-sm text-center max-w-md">
        Ocurri&oacute; un error al cargar esta tienda. Intenta de nuevo.
      </p>
      <button
        onClick={() => reset()}
        className="px-6 py-2 bg-[var(--accent)] text-[var(--on-accent)] rounded-lg hover:bg-[var(--accent-hover)] transition-colors"
      >
        Reintentar
      </button>
    </div>
  );
}
