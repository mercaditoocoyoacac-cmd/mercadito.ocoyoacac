"use client";

import { Fragment, type ReactNode, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./Button";
import { createPortal } from "react-dom";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  showClose?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  full: "max-w-[90vw]",
};

export function Dialog({ 
  open, 
  onClose, 
  title, 
  description, 
  children, 
  size = "md", 
  showClose = true, 
  closeOnOverlayClick = true, 
  closeOnEscape = true,
  className = "" 
}: DialogProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      document.body.style.overflow = "hidden";
      titleRef.current?.focus();
      
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape" && closeOnEscape) onClose();
        if (e.key === "Tab") {
          const focusableElements = document.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];
          
          if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          } else if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      };
      
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        document.body.style.overflow = "";
        previousActiveElement.current?.focus();
      };
    }
  }, [open, closeOnEscape, onClose]);

  if (!open) return null;

  const dialogContent = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={closeOnOverlayClick ? onClose : undefined}
        role="presentation"
        aria-hidden="true"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className={`
            w-full ${sizeClasses[size]} rounded-2xl bg-white shadow-2xl overflow-hidden
            ${className}
          `}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? "dialog-title" : undefined}
          aria-describedby={description ? "dialog-description" : undefined}
          onClick={(e) => e.stopPropagation()}
        >
          {(title || showClose) && (
            <div className="flex items-start justify-between gap-4 p-5 border-b border-[var(--border)]">
              <div>
                {title && (
                  <h2 
                    ref={titleRef}
                    id="dialog-title" 
                    tabIndex={-1}
                    className="text-lg font-semibold text-[var(--foreground)]"
                  >
                    {title}
                  </h2>
                )}
                {description && (
                  <p id="dialog-description" className="mt-1 text-sm text-[color:var(--muted)]">
                    {description}
                  </p>
                )}
              </div>
{showClose && (
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-lg p-2 text-[color:var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--accent-soft)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                aria-label="Cerrar"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            </div>
          )}
          <div className="p-5">{children}</div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  if (typeof window === "undefined") return null;
  return createPortal(dialogContent, document.body);
}

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "primary" | "warning";
  loading?: boolean;
}

const variantConfig = {
  danger: { confirmClass: "bg-red-600 hover:bg-red-700", icon: "⚠️" },
  primary: { confirmClass: "bg-[var(--accent)] hover:bg-[var(--accent-hover)]", icon: "ℹ️" },
  warning: { confirmClass: "bg-amber-600 hover:bg-amber-700", icon: "⚠️" },
};

export function ConfirmDialog({ 
  open, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = "Confirmar", 
  cancelText = "Cancelar", 
  variant = "danger",
  loading = false
}: ConfirmDialogProps) {
  const config = variantConfig[variant];
  
  return (
    <Dialog open={open} onClose={onClose} title={title} size="sm">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <span className="text-3xl" aria-hidden="true">{config.icon}</span>
          <p className="text-sm text-[color:var(--muted)] mt-1">{message}</p>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {cancelText}
          </Button>
          <Button variant={variant as any} onClick={onConfirm} loading={loading}>
            {confirmText}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

export interface AlertDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  message: string;
  buttonText?: string;
}

export function AlertDialog({ open, onClose, title, message, buttonText = "Entendido" }: AlertDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title={title} size="sm">
      <div className="space-y-4">
        <p className="text-sm text-[color:var(--muted)]">{message}</p>
        <div className="flex justify-end pt-2">
          <Button onClick={onClose}>{buttonText}</Button>
        </div>
      </div>
    </Dialog>
  );
}