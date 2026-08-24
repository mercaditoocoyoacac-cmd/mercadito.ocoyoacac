"use client";

import { type ReactNode } from "react";
import { motion } from "framer-motion";

interface Step {
  label: string;
  href?: string;
  disabled?: boolean;
  completed?: boolean;
}

interface StepperProps {
  steps: Step[];
  current: number;
  className?: string;
  variant?: "default" | "compact" | "vertical";
  showNumbers?: boolean;
}

const variantStyles = {
  default: "flex items-center justify-center gap-2",
  compact: "flex items-center gap-4",
  vertical: "flex flex-col items-start gap-6",
};

export function Stepper({ 
  steps, 
  current, 
  className = "", 
  variant = "default", 
  showNumbers = true 
}: StepperProps) {
  return (
    <nav 
      className={`${variantStyles[variant]} ${className}`} 
      aria-label="Pasos del proceso"
    >
      {steps.map((step, index) => {
        const isActive = index === current;
        const isCompleted = step.completed || index < current;
        const isDisabled = step.disabled;
        
        return (
          <motion.div
            key={step.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center gap-2"
          >
            {variant !== "vertical" && index > 0 && (
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                className={`h-px flex-1 max-w-12 transition-colors ${
                  index <= current ? "bg-[var(--accent)]" : "bg-[var(--border)]"
                }`}
              />
            )}
            
            <div className="flex flex-col items-center gap-1.5">
              <button
                type="button"
                disabled={isDisabled}
                onClick={() => step.href && !isDisabled && (window.location.href = step.href)}
                className={`
                  relative flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold
                  transition-all duration-300
                  ${isCompleted 
                    ? "bg-[var(--accent)] text-white" 
                    : isActive 
                      ? "bg-[var(--accent)] text-white ring-4 ring-[var(--accent)]/20" 
                      : "bg-gray-100 text-gray-400"
                  }
                  ${isDisabled ? "opacity-50 cursor-not-allowed" : "hover:scale-110 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"}
                `}
                aria-current={isActive ? "step" : undefined}
                aria-disabled={isDisabled}
              >
                {showNumbers ? (
                  isCompleted ? (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    index + 1
                  )
                ) : null}
              </button>
              
              <span 
                className={`
                  text-xs font-medium text-center max-w-[100px] truncate
                  ${isActive || isCompleted ? "text-[var(--foreground)]" : "text-[color:var(--muted)]"}
                  ${isDisabled ? "opacity-50" : ""}
                `}
              >
                {step.label}
              </span>
            </div>
          </motion.div>
        );
      })}
    </nav>
  );
}

interface StepContentProps {
  current: number;
  children: ReactNode;
  className?: string;
}

export function StepContent({ current, children, className = "" }: StepContentProps) {
  return (
    <div className={className} role="tabpanel" aria-labelledby={`step-${current}`}>
      {typeof children === "function" ? children(current) : children}
    </div>
  );
}

interface StepPanelProps {
  step: number;
  current: number;
  children: ReactNode;
  className?: string;
}

export function StepPanel({ step, current, children, className = "" }: StepPanelProps) {
  if (step !== current) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className={className}
      role="tabpanel"
      aria-labelledby={`step-${step}`}
    >
      {children}
    </motion.div>
  );
}