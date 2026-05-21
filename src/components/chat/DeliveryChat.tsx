"use client";

import { useEffect, useRef, useState } from "react";

interface ChatMessage {
  id: string;
  senderId: string;
  senderRole: string;
  message: string;
  createdAt: string;
}

interface DeliveryChatProps {
  orderId: string;
  currentUserId: string;
  currentUserRole: string;
}

export default function DeliveryChat({ orderId, currentUserId, currentUserRole }: DeliveryChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/chat/messages?orderId=${orderId}`);
      const data = await res.json();
      if (data.ok) setMessages(data.messages);
    } catch {
      // silent
    }
  };

  useEffect(() => {
    if (!expanded) return;
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [orderId, expanded]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, message: input.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        setMessages((prev) => [...prev, data.message]);
        setInput("");
      }
    } catch {
      // silent
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="mt-4 rounded-xl border border-[var(--border)] overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between bg-gray-50 px-4 py-3 text-sm font-medium hover:bg-gray-100"
      >
        <span className="flex items-center gap-2">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          Chat con {currentUserRole === "DELIVERY" ? "el cliente" : "el repartidor"}
          {messages.length > 0 && (
            <span className="rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-xs text-white">{messages.length}</span>
          )}
        </span>
        <svg
          className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="flex flex-col">
          <div className="flex max-h-64 flex-col gap-2 overflow-y-auto px-4 py-3">
            {messages.length === 0 ? (
              <div className="py-4 text-center text-sm text-[color:var(--muted)]">
                No hay mensajes aún. ¡Envía el primero!
              </div>
            ) : (
              messages.map((msg) => {
                const isMine = msg.senderId === currentUserId;
                return (
                  <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                        isMine
                          ? "bg-[var(--accent)] text-white rounded-br-sm"
                          : "bg-gray-100 text-gray-900 rounded-bl-sm"
                      }`}
                    >
                      <p>{msg.message}</p>
                      <p className={`mt-0.5 text-[10px] ${isMine ? "text-white/70" : "text-[color:var(--muted)]"}`}>
                        {new Date(msg.createdAt).toLocaleTimeString("es-MX", {
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "America/Mexico_City",
                        })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          <div className="flex items-center gap-2 border-t border-[var(--border)] px-4 py-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe un mensaje..."
              className="flex-1 rounded-lg border border-[var(--border)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              maxLength={500}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || sending}
              className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
            >
              {sending ? "..." : "Enviar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
