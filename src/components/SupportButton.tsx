"use client";

import { useSession } from "next-auth/react";
import { useState, useRef } from "react";

export function SupportButton() {
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");

  const resetModal = () => { setOpen(false); setStatus("idle"); };

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = (await res.json()) as { ok: true; url: string } | { ok: false; error?: string };
    setUploading(false);
    if (!res.ok || !data.ok || !("url" in data)) return;
    setImageUrl(data.url);
  }

  const handleSubmit = async () => {
    if (!message.trim() || sending) return;
    setSending(true);
    setStatus("idle");
    try {
      const res = await fetch("/api/support/message", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: message.trim(),
          contactEmail: contactEmail.trim() || undefined,
          contactPhone: contactPhone.trim() || undefined,
          imageUrl: imageUrl || undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        setStatus("sent");
        setMessage("");
        setImageUrl("");
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
          onClick={resetModal}
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
                onClick={resetModal}
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
                    onClick={resetModal}
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

                  {!isLoggedIn && (
                    <div className="grid grid-cols-2 gap-3">
                      <label className="block">
                        <div className="text-xs font-medium text-gray-600">Correo</div>
                        <input
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                          type="email"
                          className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-blue-500"
                          placeholder="tu@correo.com"
                        />
                      </label>
                      <label className="block">
                        <div className="text-xs font-medium text-gray-600">Teléfono</div>
                        <input
                          value={contactPhone}
                          onChange={(e) => setContactPhone(e.target.value)}
                          type="tel"
                          className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-blue-500"
                          placeholder="722..."
                        />
                      </label>
                    </div>
                  )}

                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe tu problema o sugerencia..."
                    rows={4}
                    maxLength={1000}
                    className="w-full rounded-xl border-2 border-gray-200 p-3 text-sm outline-none focus:border-blue-500 resize-none transition-colors"
                  />

                  <div className="flex items-center gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors border-none bg-transparent cursor-pointer"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      {uploading ? "Subiendo..." : "Adjuntar imagen"}
                    </button>
                    {imageUrl && (
                      <span className="text-xs text-green-600">✓ Imagen adjunta</span>
                    )}
                  </div>

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
