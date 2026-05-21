"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ArrivalConfirmButton({ orderId }: { orderId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);
  const router = useRouter();

  const handleConfirm = async () => {
    if (confirming || done) return;
    setConfirming(true);
    try {
      const res = await fetch("/api/delivery/confirm-arrival", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      if (data.ok) {
        setDone(true);
        router.refresh();
      }
    } catch {
      // silent
    } finally {
      setConfirming(false);
    }
  };

  if (done) return null;

  return (
    <button
      onClick={handleConfirm}
      disabled={confirming}
      className="mt-3 rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
    >
      {confirming ? "Confirmando..." : "Sí, estoy enterado"}
    </button>
  );
}
