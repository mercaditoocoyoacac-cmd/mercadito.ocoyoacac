"use client";

import { type ReactNode } from "react";
import { motion } from "framer-motion";

export type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "neutral" | "accent";
export type BadgeSize = "sm" | "md" | "lg";
export type BadgeShape = "rounded" | "pill" | "square";

export interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  shape?: BadgeShape;
  dot?: boolean;
  dotColor?: string;
  leftIcon?: ReactNode;
  className?: string;
  onClick?: () => void;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/20",
  success: "bg-green-50 text-green-700 border border-green-200",
  warning: "bg-amber-50 text-amber-700 border border-amber-200",
  danger: "bg-red-50 text-red-700 border border-red-200",
  info: "bg-blue-50 text-blue-700 border border-blue-200",
  neutral: "bg-gray-100 text-gray-700 border border-gray-200",
  accent: "bg-[var(--accent)] text-white border-none",
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-[10px] gap-1",
  md: "px-2.5 py-1 text-xs gap-1.5",
  lg: "px-3 py-1.5 text-sm gap-2",
};

const shapeClasses: Record<BadgeShape, string> = {
  rounded: "rounded-md",
  pill: "rounded-full",
  square: "rounded-sm",
};

export function Badge({ 
  children, 
  variant = "default", 
  size = "md", 
  shape = "pill", 
  dot = false, 
  dotColor, 
  leftIcon,
  className = "", 
  onClick 
}: BadgeProps) {
  const Component = onClick ? motion.button : "span";
  
  return (
    <Component
      onClick={onClick}
      className={`
        inline-flex items-center font-medium transition-all duration-200
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${shapeClasses[shape]}
        ${onClick ? "cursor-pointer hover:opacity-80 active:scale-[0.98]" : ""}
        ${className}
      `}
      whileTap={{ scale: 0.95 }}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
      {dot && (
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: dotColor || "currentColor" }}
          aria-hidden="true"
        />
      )}
      <span className="whitespace-nowrap">{children}</span>
    </Component>
  );
}

export interface StatusBadgeProps {
  status: "pending" | "confirmed" | "ready" | "out_for_delivery" | "completed" | "cancelled" | "active" | "inactive" | "draft" | string;
  size?: BadgeSize;
  showDot?: boolean;
}

const statusConfig: Record<string, { variant: BadgeVariant; label: string; dotColor?: string }> = {
  pending: { variant: "warning", label: "Pendiente", dotColor: "#f59e0b" },
  confirmed: { variant: "info", label: "Confirmado", dotColor: "#3b82f6" },
  ready: { variant: "info", label: "Listo", dotColor: "#8b5cf6" },
  out_for_delivery: { variant: "accent", label: "En camino", dotColor: "#f97316" },
  completed: { variant: "success", label: "Completado", dotColor: "#10b981" },
  cancelled: { variant: "danger", label: "Cancelado", dotColor: "#ef4444" },
  active: { variant: "success", label: "Activo", dotColor: "#10b981" },
  inactive: { variant: "neutral", label: "Inactivo", dotColor: "#9ca3af" },
  draft: { variant: "neutral", label: "Borrador", dotColor: "#9ca3af" },
};

export function StatusBadge({ status, size = "md", showDot = true }: StatusBadgeProps) {
  const config = statusConfig[status] || { variant: "neutral", label: status, dotColor: "#9ca3af" };
  return (
    <Badge variant={config.variant} size={size} dot={showDot} dotColor={config.dotColor}>
      {config.label}
    </Badge>
  );
}

export interface PromoBadgeProps {
  discountPercentage?: number;
  label?: string;
  size?: BadgeSize;
}

export function PromoBadge({ discountPercentage, label = "Promo", size = "sm" }: PromoBadgeProps) {
  return (
    <Badge variant="danger" size={size} leftIcon={
      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    }>
      {discountPercentage ? `-${discountPercentage}%` : label}
    </Badge>
  );
}

export interface StockBadgeProps {
  level: "high" | "medium" | "low" | "out";
  count?: number;
  size?: BadgeSize;
}

export function StockBadge({ level, count, size = "sm" }: StockBadgeProps) {
  const configs: Record<StockBadgeProps["level"], { variant: BadgeVariant; label: string; dotColor?: string }> = {
    high: { variant: "success", label: count !== undefined ? `Stock: ${count}` : "Disponible", dotColor: "#10b981" },
    medium: { variant: "warning", label: count !== undefined ? `Quedan ${count}` : "Pocas unidades", dotColor: "#f59e0b" },
    low: { variant: "danger", label: count !== undefined ? `¡Solo ${count}!` : "Últimas unidades", dotColor: "#ef4444" },
    out: { variant: "neutral", label: "Agotado", dotColor: "#9ca3af" },
  };
  
  const config = configs[level];
  return (
    <Badge variant={config.variant} size={size} dot={level !== "out"} dotColor={config.dotColor}>
      {config.label}
    </Badge>
  );
}