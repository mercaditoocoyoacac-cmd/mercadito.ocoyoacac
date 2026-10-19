"use client";

export default function VendorCodeQR({ code, orderId, label }: { code: string; orderId: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="w-44 h-44 rounded-lg bg-[var(--surface)] border-2 border-dashed border-[var(--border)] flex items-center justify-center">
        <svg aria-hidden="true" className="h-12 w-12 text-[color:var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      </div>
      <p className="mt-2 text-2xl font-mono font-bold tracking-widest text-[color:var(--text)]">{code}</p>
      <p className="text-xs text-[color:var(--muted)]">Código {label === "pickup" ? "de recogida" : "de entrega"}</p>
    </div>
  );
}