"use client";

import { useState } from "react";

export function SupportButton() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");

  const handleSubmit = async () => {
    if (!message.trim() || sending) return;
    setSending(true);
    setStatus("idle");
    try {
      const res = await fetch("/api/support/message", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: message.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        setStatus("sent");
        setMessage("");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    } finally {
      setSending(false);
      setTimeout(() => { if (!open) setStatus("idle"); }, 3000);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); setStatus("idle"); }}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl transition-all duration-300 hover:bg-blue-700 hover:scale-110 active:scale-95 animate-slide-up-sm border-none cursor-pointer"
        aria-label="Enviar mensaje al administrador"
      >
        <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
          onClick={() => { setOpen(false); setStatus("idle"); }}
        >
          <div
            className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl animate-slide-up-sm overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between bg-blue-600 px-5 py-4 text-white">
              <div className="flex items-center gap-3">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <div>
                  <h3 className="font-bold text-sm">Contactar administrador</h3>
                  <p className="text-xs text-blue-200">Te responderemos pronto</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setOpen(false); setStatus("idle"); }}
                className="rounded-full p-1 hover:bg-white/20 transition-colors border-none bg-transparent cursor-pointer"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5">
              {status === "sent" ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                    <svg className="h-7 w-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h4 className="font-bold text-gray-900">Mensaje enviado</h4>
                  <p className="mt-1 text-sm text-gray-500">Gracias, te contactaremos pronto.</p>
                  <button
                    type="button"
                    onClick={() => { setOpen(false); setStatus("idle"); }}
                    className="mt-4 rounded-xl bg-gray-100 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors border-none cursor-pointer"
                  >
                    Cerrar
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    ¿Tienes algún problema o sugerencia? Envíanos un mensaje y te atenderemos lo antes posible.
                  </p>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Escribe tu mensaje aquí..."
                    rows={4}
                    maxLength={1000}
                    className="w-full rounded-xl border-2 border-gray-200 p-3 text-sm outline-none focus:border-blue-500 resize-none transition-colors"
                  />
                  {status === "error" && (
                    <p className="text-xs text-red-600">Error al enviar. Intenta de nuevo.</p>
                  )}
                  <button
                    type="button"
                    disabled={!message.trim() || sending}
                    onClick={handleSubmit}
                    className="w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors border-none cursor-pointer"
                  >
                    {sending ? "Enviando..." : "Enviar mensaje"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
