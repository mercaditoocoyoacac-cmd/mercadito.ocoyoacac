"use client";

import { useEffect, useState } from "react";

export default function SplashScreen({ children }: { children: React.ReactNode }) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShow(false), 1800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <div
        aria-hidden={!show}
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-amber-700 via-orange-600 to-rose-700"
        style={{
          opacity: show ? 1 : 0,
          pointerEvents: show ? "auto" : "none",
          transition: "opacity 0.5s ease",
        }}
      >
        <img
          src="/logo.png"
          alt="Mercadito"
          className="h-28 w-28 animate-scale-in drop-shadow-2xl sm:h-36 sm:w-36"
        />
        <h1
          className="mt-6 animate-fade-in text-3xl font-bold tracking-tight text-white sm:text-4xl"
          style={{ animationDelay: "0.15s" }}
        >
          Mercadito
        </h1>
        <p
          className="mt-2 animate-fade-in text-base text-amber-100/80"
          style={{ animationDelay: "0.3s" }}
        >
          Ocoyoacac
        </p>
      </div>
      <div style={{ opacity: show ? 0 : 1, transition: "opacity 0.3s ease 0.15s" }}>
        {children}
      </div>
    </>
  );
}