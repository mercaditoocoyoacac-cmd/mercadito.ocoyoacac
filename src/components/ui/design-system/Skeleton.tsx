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
          rounded="sm"
          animation={props.animation}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ 
  className = "", 
  showImage = true, 
  showTitle = true, 
  showDescription = true, 
  showFooter = false,
  ...props 
}: {
  className?: string;
  showImage?: boolean;
  showTitle?: boolean;
  showDescription?: boolean;
  showFooter?: boolean;
} & Omit<SkeletonProps, "rounded">) {
  return (
    <div className={`rounded-2xl border border-[var(--border)] bg-white overflow-hidden ${className}`} {...props}>
      {showImage && (
        <Skeleton className="aspect-video w-full" rounded="none" animation={props.animation} />
      )}
      <div className="p-5 space-y-3">
        {showTitle && <Skeleton className="h-6 w-3/4" rounded="sm" animation={props.animation} />}
        {showDescription && <SkeletonText lines={2} className="w-full" animation={props.animation} />}
        {showFooter && (
          <div className="flex items-center justify-between pt-2">
            <Skeleton className="h-5 w-20" rounded="sm" animation={props.animation} />
            <Skeleton className="h-5 w-16" rounded="sm" animation={props.animation} />
          </div>
        )}
      </div>
    </div>
  );
}

export function SkeletonProductCard({ className = "", ...props }: { className?: string } & Omit<SkeletonProps, "rounded">) {
  return (
    <div className={`group rounded-xl border border-[var(--border)] bg-white overflow-hidden shadow-sm ${className}`} {...props}>
      <Skeleton className="aspect-square w-full" rounded="none" animation={props.animation} />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-3/4" rounded="sm" animation={props.animation} />
        <Skeleton className="h-5 w-1/3" rounded="sm" animation={props.animation} />
        <Skeleton className="h-8 w-full" rounded="md" animation={props.animation} />
      </div>
    </div>
  );
}

export function SkeletonStoreCard({ className = "", ...props }: { className?: string } & Omit<SkeletonProps, "rounded">) {
  return (
    <div className={`group rounded-2xl border border-[var(--border)] bg-white overflow-hidden shadow-sm ${className}`} {...props}>
      <Skeleton className="aspect-video w-full" rounded="none" animation={props.animation} />
      <div className="p-5 space-y-3">
        <Skeleton className="h-6 w-1/2" rounded="sm" animation={props.animation} />
        <SkeletonText lines={2} animation={props.animation} />
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" rounded="sm" animation={props.animation} />
          <Skeleton className="h-4 w-20" rounded="sm" animation={props.animation} />
        </div>
      </div>
    </div>
  );
}

export function SkeletonList({ items = 5, className = "", children }: { 
  items?: number; 
  className?: string;
  children?: (index: number) => ReactNode;
}) {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i}>{children ? children(i) : <SkeletonCard />}</div>
      ))}
    </div>
  );
}

export function SkeletonGrid({ 
  items = 6, 
  cols = { base: 1, sm: 2, lg: 3 }, 
  className = "", 
  children 
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