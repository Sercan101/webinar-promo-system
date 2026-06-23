"use client";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { LazyMotion, domAnimation, MotionConfig } from "motion/react";

export function ThemeProvider({ children, ...props }: React.ComponentProps<typeof NextThemesProvider>) {
  // reducedMotion="user" respektiert die System-Einstellung „Bewegung reduzieren".
  // LazyMotion lädt nur das schlanke domAnimation-Feature-Set (~5 KB statt ~34 KB).
  return (
    <NextThemesProvider {...props}>
      <MotionConfig reducedMotion="user">
        <LazyMotion features={domAnimation}>{children}</LazyMotion>
      </MotionConfig>
    </NextThemesProvider>
  );
}
