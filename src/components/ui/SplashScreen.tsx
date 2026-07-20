"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

export default function SplashScreen({ children }: { children: React.ReactNode }) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShow(false), 1800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <AnimatePresence mode="wait">
        {show && (
          <motion.div
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-amber-700 via-orange-600 to-rose-700"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.5, ease: "easeInOut" } }}
          >
            <motion.img
              src="/logo.svg"
              alt="Mercadito"
              className="h-28 w-28 sm:h-36 sm:w-36 drop-shadow-2xl"
              initial={{ opacity: 0, scale: 0.5, y: 20 }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0,
                transition: { type: "spring", stiffness: 200, damping: 14, mass: 0.6 },
              }}
            />
            <motion.h1
              className="mt-6 text-3xl font-bold tracking-tight text-white sm:text-4xl"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 0.3, duration: 0.4 } }}
            >
              Mercadito
            </motion.h1>
            <motion.p
              className="mt-2 text-base text-amber-100/80"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { delay: 0.5, duration: 0.4 } }}
            >
              Ocoyoacac
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: show ? 0 : 1, transition: { duration: 0.3, delay: show ? 0 : 0.2 } }}
      >
        {children}
      </motion.div>
    </>
  );
}
