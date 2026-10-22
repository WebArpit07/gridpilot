"use client";

import React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { AnimatePresence } from "framer-motion";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      forcedTheme="dark"
      enableSystem={false}
      disableTransitionOnChange={false}
    >
      <AnimatePresence mode="wait">
        <div className="relative min-h-screen flex flex-col antialiased selection:bg-fuchsia-500/30 selection:text-fuchsia-200">
          {/* Liquid Luxury Ambient Background Glows */}
          <div className="liquid-glow-bg" aria-hidden="true">
            <div className="liquid-glow-1" />
            <div className="liquid-glow-2" />
            <div className="liquid-glow-3" />
          </div>
          {children}
        </div>
      </AnimatePresence>
    </NextThemesProvider>
  );
}
