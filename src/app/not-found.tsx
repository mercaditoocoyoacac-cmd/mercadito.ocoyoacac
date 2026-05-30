import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 items-center px-4">
      <div className="w-full text-center">
        <div className="text-6xl font-bold text-[var(--accent)]">404</div>
        <h1 className="mt-4 text-xl font-semibold">Página no encontrada</h1>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          La página que buscas no existe o fue movida.
        </p>
        <div className="mt-8">
          <Link
            href="/"
            className="inline-flex rounded-md bg-[var(--accent)] px-6 py-2.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
          >
            Ir al inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
