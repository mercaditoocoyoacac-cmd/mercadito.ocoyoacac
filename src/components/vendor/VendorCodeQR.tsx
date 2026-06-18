"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";

export default function VendorCodeQR({ code, orderId, label }: { code: string; orderId: string; label: string }) {
  const [qr, setQr] = useState("");

  useEffect(() => {
    QRCode.toDataURL(JSON.stringify({ orderId, code }), { width: 180, margin: 2 }).then(setQr);
  }, [code, orderId]);

  if (!qr) return <div className="h-44 w-44 mx-auto animate-pulse rounded-lg bg-gray-100" />;

  return (
    <div className="flex flex-col items-center gap-2">
      <img src={qr} alt={label} className="h-44 w-44 rounded-lg" />
      <p className="mt-2 text-2xl font-mono font-bold tracking-widest">{code}</p>
    </div>
  );
}
