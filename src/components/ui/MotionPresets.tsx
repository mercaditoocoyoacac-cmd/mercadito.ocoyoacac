"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { forwardRef } from "react";

export const springPress = { type: "spring" as const, stiffness: 400, damping: 17, mass: 0.3 };

export const MotionDiv = motion.div;
export const MotionSpan = motion.span;
export const MotionButton = forwardRef<HTMLButtonElement, HTMLMotionProps<"button">>(
  function MotionButton({ whileTap, ...props }, ref) {
    return (
      <motion.button
        ref={ref}
        whileTap={whileTap ?? { scale: 0.95 }}
        whileHover={{ scale: 1.02 }}
        transition={springPress}
        {...props}
      />
    );
  }
);

export const MotionLink = forwardRef<HTMLAnchorElement, HTMLMotionProps<"a">>(
  function MotionLink({ whileTap, ...props }, ref) {
    return (
      <motion.a
        ref={ref}
        whileTap={whileTap ?? { scale: 0.95 }}
        whileHover={{ scale: 1.02 }}
        transition={springPress}
        {...props}
      />
    );
  }
);

export const cardSpring = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 200, damping: 25, mass: 0.5 } },
} as const;

export const fadeSlideUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 200, damping: 26 } },
} as const;

export const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 300, damping: 20 } },
} as const;

export const bounceIn = {
  initial: { opacity: 0, scale: 0.6 },
  animate: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 500, damping: 12, mass: 0.4 } },
} as const;
