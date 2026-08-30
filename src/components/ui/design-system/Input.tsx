"use client";

import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes, type ReactNode } from "react";

export type InputSize = "sm" | "md" | "lg";

interface BaseInputProps {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  size?: InputSize;
  fullWidth?: boolean;
  required?: boolean;
}

export interface InputProps extends BaseInputProps, Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {}
export interface TextareaProps extends BaseInputProps, Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "size"> { rows?: number; }

const sizeClasses: Record<InputSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2.5 text-sm",
  lg: "px-4 py-3 text-base",
};

const labelSizeClasses: Record<InputSize, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ 
    label, 
    hint, 
    error, 
    leftIcon, 
    rightIcon, 
    size = "md", 
    fullWidth = true, 
    required, 
    className = "", 
    id, 
    ...props 
  }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    const errorId = error ? `${inputId}-error` : undefined;
    const hintId = hint && !error ? `${inputId}-hint` : undefined;

    return (
      <div className={`${fullWidth ? "w-full" : ""} ${className}`}>
        {label && (
          <label htmlFor={inputId} className={`block mb-1.5 font-medium text-sm text-[var(--foreground)] ${labelSizeClasses[size]}`}>
            {label}
            {required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--muted)] pointer-events-none flex items-center justify-center">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`
              w-full rounded-xl border transition-all duration-200
              bg-white text-[var(--foreground)] placeholder:text-[color:var(--muted)]
              focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)]
              disabled:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60
              ${error ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : "border-[var(--border)]"}
              ${leftIcon ? "pl-10" : ""}
              ${sizeClasses[size]}
            `}
            aria-invalid={error ? "true" : "false"}
            aria-describedby={errorId || hintId}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--muted)] pointer-events-none flex items-center justify-center">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p id={errorId} className="mt-1.5 text-xs text-red-600 flex items-center gap-1" role="alert">
            <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className="mt-1.5 text-xs text-[color:var(--muted)]">{hint}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ 
    label, 
    hint, 
    error, 
    leftIcon, 
    rightIcon, 
    size = "md", 
    fullWidth = true, 
    required, 
    rows = 4,
    className = "", 
    id, 
    ...props 
  }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    const errorId = error ? `${inputId}-error` : undefined;
    const hintId = hint && !error ? `${inputId}-hint` : undefined;

    return (
      <div className={`${fullWidth ? "w-full" : ""} ${className}`}>
        {label && (
          <label htmlFor={inputId} className={`block mb-1.5 font-medium text-sm text-[var(--foreground)] ${labelSizeClasses[size]}`}>
            {label}
            {required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-3 text-[color:var(--muted)] pointer-events-none flex items-center justify-center">
              {leftIcon}
            </div>
          )}
          <textarea
            ref={ref}
            id={inputId}
            rows={rows}
            className={`
              w-full rounded-xl border transition-all duration-200 resize-y min-h-[80px]
              bg-white text-[var(--foreground)] placeholder:text-[color:var(--muted)]
              focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)]
              disabled:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60
              ${error ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : "border-[var(--border)]"}
              ${leftIcon ? "pl-10" : ""}
              ${sizeClasses[size]}
            `}
            aria-invalid={error ? "true" : "false"}
            aria-describedby={errorId || hintId}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-3 text-[color:var(--muted)] pointer-events-none flex items-center justify-center">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p id={errorId} className="mt-1.5 text-xs text-red-600 flex items-center gap-1" role="alert">
            <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className="mt-1.5 text-xs text-[color:var(--muted)]">{hint}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";