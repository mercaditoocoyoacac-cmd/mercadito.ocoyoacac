"use client";

import { motion } from "framer-motion";

export function StaggerContainer({
  children,
  className,
  staggerMs = 40,
  delayMs = 50,
}: {
  children: React.ReactNode;
  className?: string;
  staggerMs?: number;
  delayMs?: number;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-40px" }}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: staggerMs / 1000, delayChildren: delayMs / 1000 } },
      } as const}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 16, scale: 0.97 },
        visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 200, damping: 25, mass: 0.5 } },
      } as const}
    >
      {children}
    </motion.div>
  );
}
