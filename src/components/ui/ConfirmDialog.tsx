"use client";

import { createContext, useContext, useRef, useState, useCallback, useEffect, type ReactNode } from "react";
import { hapticFeedback } from "@/lib/haptics";

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "normal";
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmOptions & { open: boolean }>({
    open: false,
    message: "",
  });
  const resolveRef = useRef<((value: boolean) => void) | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setState({ ...options, open: true });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    resolveRef.current?.(true);
    setState((prev) => ({ ...prev, open: false }));
    resolveRef.current = null;
    hapticFeedback();
  }, []);

  const handleCancel = useCallback(() => {
    resolveRef.current?.(false);
    setState((prev) => ({ ...prev, open: false }));
    resolveRef.current = null;
  }, []);

  useEffect(() => {
    if (!state.open) return;
    confirmBtnRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") handleCancel();
      if (e.key === "Tab") {
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [state.open, handleCancel]);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={handleCancel}
          role="dialog"
          aria-modal="true"
          aria-label={state.title || "Confirmar"}
        >
          <div
            ref={dialogRef}
            className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl dark:bg-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            {state.title && (
              <h3 className="text-lg font-semibold">{state.title}</h3>
            )}
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              {state.message}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {state.cancelText || "Cancelar"}
              </button>
              <button
                type="button"
                ref={confirmBtnRef}
                onClick={handleConfirm}
                className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${
                  state.variant === "danger"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-[var(--accent)] hover:bg-[var(--accent-hover)]"
                }`}
              >
                {state.confirmText || "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm debe usarse dentro de un ConfirmProvider");
  }
  return ctx.confirm;
}
