"use client";

import { type ReactNode } from "react";

interface SkeletonProps {
  className?: string;
  animation?: "pulse" | "wave" | "none";
  rounded?: "none" | "sm" | "md" | "lg" | "xl" | "full";
}

const roundedClasses = {
  none: "",
  sm: "rounded",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  full: "rounded-full",
};

const animationClasses = {
  pulse: "animate-pulse",
  wave: "animate-[shimmer_1.5s_infinite]",
  none: "",
};

export function Skeleton({ className = "", animation = "wave", rounded = "md" }: SkeletonProps) {
  return (
    <div 
      className={`
        bg-gray-200 dark:bg-gray-700
        ${roundedClasses[rounded]}
        ${animationClasses[animation]}
        ${className}
      `}
      aria-hidden="true"
    />
  );
}

export function SkeletonText({ lines = 3, className = "", lineHeight = "1.5", ...props }: { 
  lines?: number; 
  className?: string;
  lineHeight?: string;
} & Omit<SkeletonProps, "rounded">) {
  return (
    <div className={className} {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-4 w-full ${i === lines - 1 ? "w-3/4" : ""} mb-2`}
          {...props}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = "", ...props }: { className?: string } & Omit<SkeletonProps, "rounded">) {
  return (
    <div className={className} {...props}>
      <Skeleton className="aspect-square w-full mb-3" />
      <Skeleton className="h-4 w-3/4 mb-2" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}

export function SkeletonProductCard({ className = "", ...props }: { className?: string } & Omit<SkeletonProps, "rounded">) {
  return (
    <div className={`group rounded-xl border border-[var(--border)] bg-white overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 ${className}`} {...props}>
      <div className="relative aspect-square bg-[var(--accent-soft)] flex items-center justify-center overflow-hidden">
        <Skeleton className="w-full h-full" />
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <SkeletonText lines={2} className="mb-2" />
        <Skeleton className="h-6 w-1/4 mt-auto" />
      </div>
    </div>
  );
}

export function SkeletonStoreCard({ className = "", ...props }: { className?: string } & Omit<SkeletonProps, "rounded">) {
  return (
    <div className={`group rounded-xl border border-[var(--border)] bg-white overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 ${className}`} {...props}>
      <div className="relative aspect-square bg-[var(--accent-soft)] flex items-center justify-center overflow-hidden">
        <Skeleton className="w-full h-full" />
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <SkeletonText lines={2} className="mb-2" />
        <div className="mt-auto flex items-center justify-between">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-8 w-16 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonList({ items = 5, className = "", ...props }: { items?: number; className?: string } & Omit<SkeletonProps, "rounded">) {
  return (
    <div className={`space-y-4 ${className}`} {...props}>
      {Array.from({ length: items }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonGrid({ 
  items = 6, 
  cols = { base: 1, sm: 2, md: 3, lg: 4, xl: 4 },
  className = "",
  children,
}: { 
  items?: number; 
  cols?: { base?: number; sm?: number; md?: number; lg?: number; xl?: number };
  className?: string;
  children?: (index: number) => ReactNode;
}) {
  const colClasses = [
    cols.base && `grid-cols-${cols.base}`,
    cols.sm && `sm:grid-cols-${cols.sm}`,
    cols.md && `md:grid-cols-${cols.md}`,
    cols.lg && `lg:grid-cols-${cols.lg}`,
    cols.xl && `xl:grid-cols-${cols.xl}`,
  ].filter(Boolean).join(" ");

  return (
    <div className={`grid gap-6 ${colClasses} ${className}`}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i}>{children ? children(i) : <SkeletonCard />}</div>
      ))}
    </div>
  );
}

export type { SkeletonProps };