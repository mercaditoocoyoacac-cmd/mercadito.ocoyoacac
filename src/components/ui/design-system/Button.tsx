"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { Slot } from "@radix-ui/react-slot";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
export type ButtonSize = "sm" | "md" | "lg" | "xl";

interface ButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
  children?: ReactNode;
  asChild?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] active:bg-[var(--accent)]/90 shadow-sm shadow-[var(--accent)]/20",
  secondary: "bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] hover:bg-[var(--accent-soft)] hover:border-[var(--accent)]",
  outline: "bg-transparent text-[var(--accent)] border-2 border-[var(--accent)] hover:bg-[var(--accent-soft)]",
  ghost: "bg-transparent text-[var(--foreground)] hover:bg-[var(--accent-soft)] text-[var(--accent)]",
  danger: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-sm shadow-red-500/20",
  success: "bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 shadow-sm shadow-emerald-500/20",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs gap-1.5",
  md: "px-4 py-2 text-sm gap-2",
  lg: "px-6 py-3 text-base gap-2.5",
  xl: "px-8 py-4 text-lg gap-3",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    variant = "primary", 
    size = "md", 
    loading = false, 
    leftIcon, 
    rightIcon, 
    fullWidth = false, 
    disabled, 
    children, 
    className = "",
    style,
    asChild = false,
    ...props 
  }, ref) => {
    const isDisabled = disabled || loading;

    const buttonContent = (
      <>
        {loading ? (
          <svg
            className="animate-spin h-4 w-4 sm:h-5 sm:w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <>
            {leftIcon && <span className="flex-shrink-0" aria-hidden="true">{leftIcon}</span>}
            <span className="truncate">{children}</span>
            {rightIcon && !loading && <span className="flex-shrink-0" aria-hidden="true">{rightIcon}</span>}
          </>
        )}
      );

    const baseClasses = [
      "inline-flex items-center justify-center font-semibold rounded-xl",
      "transition-all duration-200 ease-out",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2",
      "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none",
      variantClasses[variant],
      sizeClasses[size],
      fullWidth ? "w-full" : "",
      className,
    ].join(" ");

    if (asChild) {
      return (
        <Slot {...props}>
          <motion.button
            ref={ref}
            disabled={isDisabled}
            className={baseClasses}
            style={{
              ...style,
              transform: isDisabled ? undefined : style?.transform,
            }}
            whileTap={{ scale: isDisabled ? 1 : 0.98 }}
            {...props}
          >
            {buttonContent}
          </motion.button>
        </Slot>
      );
    }

    return (
      <motion.button
        ref={ref}
        disabled={isDisabled}
        className={baseClasses}
        style={{
          ...style,
          transform: isDisabled ? undefined : style?.transform,
        }}
        whileTap={{ scale: isDisabled ? 1 : 0.98 }}
        {...props}
      >
        {buttonContent}
      </motion.button>
    );
  }
);

Button.displayName = "Button";

export type { ButtonHTMLAttributes };