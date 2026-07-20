"use client";

import { motion } from "framer-motion";

const shimmerAnimation = {
  initial: { backgroundPosition: "-200% 0" },
  animate: {
    backgroundPosition: "200% 0",
    transition: { repeat: Infinity, duration: 1.5, ease: "linear" },
  },
} as const;

const shimmerStyle: React.CSSProperties = {
  background: "linear-gradient(90deg, var(--surface) 25%, var(--border) 50%, var(--surface) 75%)",
  backgroundSize: "200% 100%",
};

function ShimmerBlock({ className = "" }: { className?: string }) {
  return (
    <motion.div
      className={className}
      style={shimmerStyle}
      variants={shimmerAnimation}
      initial="initial"
      animate="animate"
    />
  );
}

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <ShimmerBlock className={`rounded-lg ${className}`} />;
}

export function SkeletonCard({ lines = 2 }: { lines?: number }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-white p-5 space-y-3">
      <div className="flex items-center gap-3">
        <ShimmerBlock className="h-12 w-12 shrink-0 rounded-xl" />
        <div className="flex-1 space-y-2">
          <ShimmerBlock className="h-4 w-3/5 rounded" />
          <ShimmerBlock className="h-3 w-2/5 rounded" />
        </div>
      </div>
      {Array.from({ length: lines }).map((_, i) => (
        <ShimmerBlock
          key={i}
          className={`h-3 rounded ${i === lines - 1 ? "w-4/6" : "w-full"}`}
        />
      ))}
    </div>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonProductCard() {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-white overflow-hidden">
      <ShimmerBlock className="h-40 w-full" />
      <div className="p-4 space-y-2">
        <ShimmerBlock className="h-4 w-4/5 rounded" />
        <ShimmerBlock className="h-3 w-2/5 rounded" />
        <ShimmerBlock className="h-5 w-1/3 rounded mt-3" />
      </div>
    </div>
  );
}
