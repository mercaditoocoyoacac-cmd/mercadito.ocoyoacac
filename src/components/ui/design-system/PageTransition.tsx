"use client";

import { motion, AnimatePresence } from "framer-motion";
import { type ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
  key: string;
}

const pageVariants = {
  initial: { opacity: 0, y: 20, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -20, scale: 1.02 },
};

export function PageTransition({ children, key }: PageTransitionProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={key}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={pageVariants}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="min-h-[calc(100vh-theme(spacing.10))]"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export function LayoutTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={{
        initial: { opacity: 0 },
        animate: { opacity: 1, transition: { duration: 0.2 } },
      }}
      className="layout-transition"
    >
      {children}
    </motion.div>
  );
}

interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
  delayChildren?: number;
  staggerChildren?: number;
}

export function StaggerContainer({ children, className = "", delayChildren = 0.1, staggerChildren = 0.05 }: StaggerContainerProps) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren,
            delayChildren,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className = "", ...props }: { children: ReactNode; className?: string } & Record<string, any>) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 16 },
        visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 200, damping: 25, mass: 0.5 } },
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function HoverLift({ children, className = "", lift = -4, scale = 1.02 }: { children: ReactNode; className?: string; lift?: number; scale?: number }) {
  return (
    <motion.div
      className={className}
      whileHover={{ y: lift, scale, transition: { duration: 0.2, ease: "easeOut" } }}
      whileTap={{ scale: 0.98 }}
    >
      {children}
    </motion.div>
  );
}

export function TapScale({ children, className = "", scale = 0.96 }: { children: ReactNode; className?: string; scale?: number }) {
  return (
    <motion.div
      className={className}
      whileTap={{ scale, transition: { duration: 0.1 } }}
    >
      {children}
    </motion.div>
  );
}

export function FadeInUp({ children, className = "", delay = 0, duration = 0.4 }: { children: ReactNode; className?: string; delay?: number; duration?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration, delay, ease: [0.4, 0, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function SlideInRight({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.4, 0, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function PulseRing({ className = "", color = "var(--accent)" }: { className?: string; color?: string }) {
  return (
    <motion.div
      className={className}
      animate={{
        scale: [1, 1.5, 2],
        opacity: [0.5, 0.2, 0],
      }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: "50%",
        border: `2px solid ${color}`,
        pointerEvents: "none",
      }}
      aria-hidden="true"
    />
  );
}

export function ShimmerEffect({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={`relative overflow-hidden ${className}`}
      initial={false}
      animate={{
        backgroundPosition: ["-200% 0", "200% 0"],
      }}
      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      style={{
        background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)",
        backgroundSize: "200% 100%",
      }}
    >
      {children}
    </motion.div>
  );
}