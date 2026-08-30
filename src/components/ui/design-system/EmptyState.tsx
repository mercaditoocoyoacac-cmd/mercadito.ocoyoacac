"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { Button } from "./Button";
import { motion } from "framer-motion";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
    variant?: "primary" | "secondary" | "outline" | "ghost";
  };
  secondaryAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
    variant?: "primary" | "secondary" | "outline" | "ghost";
  };
  className?: string;
  illustration?: "default" | "cart" | "search" | "orders" | "store" | "location" | "notifications";
}

const illustrations: Record<NonNullable<EmptyStateProps["illustration"]>, ReactNode> = {
  default: (
    <svg className="h-16 w-16 text-[var(--accent)]/60" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  cart: (
    <svg className="h-16 w-16 text-[var(--accent)]/60" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  search: (
    <svg className="h-16 w-16 text-[var(--accent)]/60" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  orders: (
    <svg className="h-16 w-16 text-[var(--accent)]/60" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  store: (
    <svg className="h-16 w-16 text-[var(--accent)]/60" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  location: (
    <svg className="h-16 w-16 text-[var(--accent)]/60" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  notifications: (
    <svg className="h-16 w-16 text-[var(--accent)]/60" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  ),
};

export function EmptyState({ 
  icon, 
  title, 
  description, 
  action, 
  secondaryAction, 
  className = "", 
  illustration = "default" 
}: EmptyStateProps) {
  const displayIcon = icon || illustrations[illustration] || illustrations.default;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`flex flex-col items-center justify-center text-center py-12 px-4 ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--accent-soft)]/50">
        {displayIcon}
      </div>
      
      <h3 className="text-xl font-semibold text-[var(--foreground)]">{title}</h3>
      
      {description && (
        <p className="mt-2 text-sm text-[color:var(--muted)] max-w-sm">{description}</p>
      )}
      
      {(action || secondaryAction) && (
        <div className="mt-6 flex flex-col sm:flex-row items-center gap-3 w-full max-w-xs">
          {action && (
            <Button
              variant={action.variant || "primary"}
              size="lg"
              fullWidth={!secondaryAction}
              onClick={action.onClick}
              asChild={!!action.href}
            >
              {action.href ? <Link href={action.href}>{action.label}</Link> : action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant={secondaryAction.variant || "ghost"}
              size="md"
              fullWidth={!action}
              onClick={secondaryAction.onClick}
              asChild={!!secondaryAction.href}
            >
              {secondaryAction.href ? <Link href={secondaryAction.href}>{secondaryAction.label}</Link> : secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </motion.div>
  );
}

export function EmptyStateCard({ 
  ...props 
}: EmptyStateProps & { className?: string }) {
  return (
    <div className={`rounded-2xl border border-[var(--border)] bg-white p-8 ${props.className}`}>
      <EmptyState {...props} />
    </div>
  );
}

export function EmptyStateFullScreen({ 
  ...props 
}: EmptyStateProps) {
  return (
    <main className="flex-1 flex items-center justify-center px-4">
      <EmptyState {...props} />
    </main>
  );
}