"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

interface Category {
  key: string;
  label: string;
  icon: string;
}

export function CategoryFilter({
  categories,
  selected,
  baseUrl,
}: {
  categories: Category[];
  selected: string;
  baseUrl: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const ITEM_W = 104;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || categories.length === 0) return;

    const centerIndex = categories.length;
    el.scrollLeft = centerIndex * ITEM_W;

    let ticking = false;

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const max = el.scrollWidth - el.clientWidth;
          const threshold = ITEM_W * 2;

          if (el.scrollLeft < threshold) {
            el.scrollLeft += categories.length * ITEM_W;
          } else if (el.scrollLeft > max - threshold) {
            el.scrollLeft -= categories.length * ITEM_W;
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [categories.length]);

  const items = [...categories, ...categories, ...categories];

  return (
    <div
      ref={scrollRef}
      className="overflow-x-auto scrollbar-hide"
      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
    >
      <div className="flex gap-2 py-2" style={{ width: "max-content" }}>
        <Link
          href={baseUrl}
          className={`flex flex-col items-center gap-1.5 px-2 py-1 rounded-2xl transition-colors ${
            !selected ? "bg-[var(--accent-soft)]" : "hover:bg-gray-50"
          }`}
          style={{ width: ITEM_W }}
        >
          <div
            className={`flex items-center justify-center rounded-full text-2xl font-bold transition-all ${
              !selected
                ? "bg-[var(--accent)] text-white shadow-md"
                : "bg-gray-100 text-gray-500"
            }`}
            style={{ width: 64, height: 64 }}
          >
            <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </div>
          <span className={`text-[11px] font-medium leading-tight text-center ${
            !selected ? "text-[var(--accent)]" : "text-[color:var(--muted)]"
          }`}>
            Todas
          </span>
        </Link>
        {items.map((cat, i) => (
          <Link
            key={`${cat.key}-${i}`}
            href={`${baseUrl}?category=${cat.key}`}
            className={`flex flex-col items-center gap-1.5 px-2 py-1 rounded-2xl transition-colors ${
              selected === cat.key ? "bg-[var(--accent-soft)]" : "hover:bg-gray-50"
            }`}
            style={{ width: ITEM_W }}
          >
            <div
              className={`flex items-center justify-center rounded-full text-2xl transition-all ${
                selected === cat.key
                  ? "bg-[var(--accent)] text-white shadow-md scale-105"
                  : "bg-gray-100 text-gray-500"
              }`}
              style={{ width: 64, height: 64 }}
            >
              {cat.icon}
            </div>
            <span className={`text-[11px] font-medium leading-tight text-center ${
              selected === cat.key ? "text-[var(--accent)]" : "text-[color:var(--muted)]"
            }`}>
              {cat.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
