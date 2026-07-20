"use client";

import { type ReactNode } from "react";
import { motion } from "framer-motion";

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 200, damping: 25, mass: 0.5 } },
} as const;

export function AnimatedList({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {children}
    </motion.div>
  );
}

export function AnimatedListItem({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={itemVariants}>
      {children}
    </motion.div>
  );
}

export function AnimatedListChild({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={itemVariants}>
      {children}
    </motion.div>
  );
}
