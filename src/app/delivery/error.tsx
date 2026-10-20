"use client";

export default function DeliveryError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8">
      <h2 className="text-xl font-semibold">Error del repartidor</h2>
      <p className="text-[color:var(--muted)] text-sm text-center max-w-md">
        Ocurri&oacute; un error en tu panel de repartidor. Intenta de nuevo.
      </p>
      <button
        onClick={() => reset()}
        className="rounded-lg bg-[var(--accent)] px-6 py-2 text-[var(--on-accent)] transition-colors hover:bg-[var(--accent-hover)]"
      >
        Reintentar
      </button>
    </div>
  );
}
