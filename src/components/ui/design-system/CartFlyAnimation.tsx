"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";

interface CartFlyAnimationProps {
  trigger: number;
  onComplete?: () => void;
}

export function CartFlyAnimation({ trigger, onComplete }: CartFlyAnimationProps) {
  const [flying, setFlying] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const cartButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (trigger && cartButtonRef.current && triggerRef.current) {
      const cartRect = cartButtonRef.current.getBoundingClientRect();
      const triggerRect = triggerRef.current.getBoundingClientRect();

      setFlying({
        x: triggerRect.left + triggerRect.width / 2,
        y: triggerRect.top + triggerRect.height / 2,
        width: 24,
        height: 24,
      });

      // Animate to cart
      requestAnimationFrame(() => {
        setFlying({
          x: cartRect.left + cartRect.width / 2 - 12,
          y: cartRect.top + cartRect.height / 2 - 12,
          width: 24,
          height: 24,
        });
      });

      setTimeout(() => {
        setFlying(null);
        onComplete?.();
      }, 800);
    }
  }, [trigger, onComplete]);

  if (!flying) return null;

  return createPortal(
    <motion.div
      initial={false}
      animate={{
        x: flying.x,
        y: flying.y,
        width: flying.width,
        height: flying.height,
        borderRadius: ["50%", "50%", "50%", "8px"],
        opacity: [1, 1, 0],
        scale: [1, 1.2, 0.5],
      }}
      transition={{
        duration: 0.8,
        ease: [0.4, 0, 0.2, 1],
      }}
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        pointerEvents: "none",
        zIndex: 9999,
        background: "var(--accent)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
      }}
      role="status"
      aria-live="polite"
    >
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    </motion.div>,
    document.body
  );
}

export function useCartFly() {
  const cartButtonRef = useRef<HTMLButtonElement>(null);
  const [flyTrigger, setFlyTrigger] = useState(0);

  const triggerFly = (triggerElement: HTMLButtonElement) => {
    if (cartButtonRef.current) {
      // Store trigger element reference globally for the animation
      (window as any).__cartFlyTrigger = triggerElement;
      setFlyTrigger(t => t + 1);
    }
  };

  return { cartButtonRef, flyTrigger, flyTriggerCount: flyTrigger };
}