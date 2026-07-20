"use client";

import { motion, type HTMLMotionProps } from "framer-motion";

const cardSpring = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 200, damping: 25, mass: 0.5 } },
} as const;

type AnimatedCardProps = HTMLMotionProps<"div"> & {
  index?: number;
};

export function AnimatedCard({ index = 0, children, ...props }: AnimatedCardProps) {
  return (
    <motion.div
      variants={cardSpring}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-20px" }}
      transition={{ delay: index * 0.04 }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function StaggerGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-40px" }}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
      } as const}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedSection({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 20 }}
      whileInView="visible"
      viewport={{ once: true, margin: "-30px" }}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 200, damping: 26, delay } },
      } as const}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedFadeIn({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.4, delay } }}
    >
      {children}
    </motion.div>
  );
}
