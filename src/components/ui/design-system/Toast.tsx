"use client";

import { Toaster as SonnerToaster, toast as sonnerToast, type ToastOptions, type ExternalToast } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      theme="system"
      className="toaster-group"
      toastOptions={{
        classNames: {
          toast: "rounded-xl border border-[var(--border)] bg-white shadow-lg",
          description: "text-[color:var(--muted)]",
          actionButton: "rounded-lg bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]",
          cancelButton: "rounded-lg border border-[var(--border)] hover:bg-[var(--accent-soft)]",
        },
        style: {
          "--normal-bg": "white",
          "--error-bg": "#fef2f2",
          "--success-bg": "#f0fdf4",
          "--warning-bg": "#fffbeb",
          "--info-bg": "#eff6ff",
        },
      }}
    />
  );
}

export const toast = {
  success: (message: string, options?: ToastOptions) => 
    sonnerToast.success(message, { 
      icon: "✅",
      ...options 
    }),
  
  error: (message: string, options?: ToastOptions) => 
    sonnerToast.error(message, { 
      icon: "❌",
      ...options 
    }),
  
  warning: (message: string, options?: ToastOptions) => 
    sonnerToast.warning(message, { 
      icon: "⚠️",
      ...options 
    }),
  
  info: (message: string, options?: ToastOptions) => 
    sonnerToast.info(message, { 
      icon: "ℹ️",
      ...options 
    }),
  
  loading: (message: string, options?: ToastOptions) => 
    sonnerToast.loading(message, { 
      icon: "⏳",
      ...options 
    }),
  
  promise: <T,>(
    promise: Promise<T>,
    messages: { loading: string; success: string | ((data: T) => string); error: string | ((error: any) => string) },
    options?: ToastOptions
  ) => sonnerToast.promise(promise, messages, options),

  custom: (component: React.ReactNode, options?: ToastOptions) => 
    sonnerToast.custom(component, options),

  dismiss: (toastId?: string | number) => sonnerToast.dismiss(toastId),
};

export function ToastAction({ 
  label, 
  onClick, 
  variant = "primary",
  className = ""
}: {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary" | "danger";
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        px-3 py-1.5 text-sm font-medium rounded-lg transition-colors
        ${variant === "primary" 
          ? "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]" 
          : variant === "danger" 
            ? "bg-red-600 text-white hover:bg-red-700" 
            : "border border-[var(--border)] hover:bg-[var(--accent-soft)]"
        }
        ${className}
      `}
    >
      {label}
    </button>
  );
}

export function CartToast({ 
  productName, 
  onViewCart, 
  onUndo 
}: {
  productName: string;
  onViewCart: () => void;
  onUndo?: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 p-1">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
          <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">Agregado al carrito</p>
          <p className="text-xs text-[color:var(--muted)] truncate">{productName}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={onViewCart} className="flex-1 rounded-lg bg-[var(--accent)] text-white py-2 text-sm font-medium hover:bg-[var(--accent-hover)]">
          Ver carrito
        </button>
        {onUndo && (
          <button onClick={onUndo} className="flex-1 rounded-lg border border-[var(--border)] text-[color:var(--muted)] py-2 text-sm font-medium hover:bg-[var(--accent-soft)]">
            Deshacer
          </button>
        )}
      </div>
    </div>
  );
}