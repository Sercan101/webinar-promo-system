"use client";

import { m } from "motion/react";
import type { ReactNode } from "react";

/** Blendet Inhalt sanft von unten ein, sobald er ins Bild scrollt (einmalig). */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 16,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  return (
    <m.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </m.div>
  );
}

/** Variants für gestaffelt einblendende Listen/Grids. */
export const gridParent = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};
export const gridChild = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const } },
};
