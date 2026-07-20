"use client";

import { type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

const pageVariants = {
  initial: { opacity: 0, y: 20, scale: 0.97 },
  enter: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 200, damping: 26, mass: 0.5 } },
  exit: { opacity: 0, y: -10, scale: 0.97, transition: { duration: 0.15, ease: "easeInOut" } },
} as const;

export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="enter"
      exit="exit"
    >
      {children}
    </motion.div>
  );
}

export function AnimatedPageWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        variants={pageVariants}
        initial="initial"
        animate="enter"
        exit="exit"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
