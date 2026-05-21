"use client";

export default function TiendasError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8">
      <h2 className="text-xl font-semibold">Error al cargar tiendas</h2>
      <p className="text-gray-500 text-sm text-center max-w-md">
        Ocurri&oacute; un error al cargar las tiendas. Intenta de nuevo.
      </p>
      <button
        onClick={() => reset()}
        className="px-6 py-2 bg-black text-white rounded-lg hover:opacity-80 transition-opacity"
      >
        Reintentar
      </button>
    </div>
  );
}
