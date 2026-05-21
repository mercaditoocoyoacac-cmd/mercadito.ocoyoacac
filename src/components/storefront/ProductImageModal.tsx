"use client";

import { useState, useRef, useEffect } from "react";

export function ProductImageModal({ src, alt, children }: { src: string; alt: string; children: React.ReactNode }) {
  const [preview, setPreview] = useState(false);
  const [full, setFull] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const fullRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!preview && !full) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setFull(false); setPreview(false); };
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (preview && containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setPreview(false);
      }
    };
    window.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleClickOutside);
    if (full) document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "";
    };
  }, [preview, full]);

  const openFull = () => {
    setPreview(false);
    setFull(true);
  };

  return (
    <>
      <div
        ref={containerRef}
        onClick={() => {
          if (typeof window !== "undefined" && window.innerWidth < 640) {
            setPreview((p) => !p);
          } else {
            setFull(true);
          }
        }}
        onTouchStart={() => {
          if (typeof window !== "undefined" && window.innerWidth < 640) {
            setPreview(true);
          }
        }}
        className="cursor-zoom-in relative"
      >
        {children}
      </div>

      {preview && (
        <div
          className="fixed inset-0 z-50 bg-black/30"
          onClick={() => setPreview(false)}
        >
          <div
            className="absolute left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white shadow-2xl p-1 max-w-[85vw] max-h-[70vh]"
            onClick={(e) => {
              e.stopPropagation();
              openFull();
            }}
          >
            <img
              src={src}
              alt={alt}
              className="max-h-[65vh] max-w-[80vw] rounded-lg object-contain"
            />
            <div className="absolute bottom-0 inset-x-0 py-1.5 text-center text-xs text-white bg-black/40 rounded-b-lg">
              Toca para ver completo
            </div>
          </div>
        </div>
      )}

      {full && (
        <div
          ref={fullRef}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setFull(false)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/20 p-2 text-white hover:bg-white/30"
            onClick={() => setFull(false)}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={src}
            alt={alt}
            className="max-h-[90vh] max-w-[95vw] rounded-lg object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
