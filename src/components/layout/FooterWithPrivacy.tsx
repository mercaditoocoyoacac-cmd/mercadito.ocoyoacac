import Link from "next/link";

function FooterWithPrivacy() {
  return (
    <footer className="border-t border-[var(--border)] py-4 px-4 text-center">
      <p className="text-xs text-[color:var(--muted)]">
        Mercadito Ocoyoacac © {new Date().getFullYear()} ·{" "}
        <Link href="/privacidad" className="underline hover:text-[color:var(--foreground)]">
          Aviso de privacidad
        </Link>
      </p>
    </footer>
  );
}

export { FooterWithPrivacy };