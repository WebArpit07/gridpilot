"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-9 h-9 rounded-2xl border border-purple-500/20 bg-purple-950/20 backdrop-blur-md" />
    );
  }

  const isDark = resolvedTheme === "dark" || theme === "dark";

  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative w-9 h-9 flex items-center justify-center rounded-2xl border border-purple-500/25 bg-[#140a22]/80 hover:bg-purple-950/50 backdrop-blur-xl text-purple-200 shadow-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500/50"
      aria-label="Toggle theme"
      title={`Switch to ${isDark ? "Light" : "Dark"} mode`}
    >
      <motion.div
        key={isDark ? "dark" : "light"}
        initial={{ rotate: -45, opacity: 0, scale: 0.8 }}
        animate={{ rotate: 0, opacity: 1, scale: 1 }}
        exit={{ rotate: 45, opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="flex items-center justify-center"
      >
        {isDark ? (
          <Moon className="w-4 h-4 text-fuchsia-400 drop-shadow-[0_0_6px_rgba(236,72,153,0.8)]" />
        ) : (
          <Sun className="w-4 h-4 text-amber-400 drop-shadow-[0_0_6px_rgba(245,158,11,0.8)]" />
        )}
      </motion.div>
    </motion.button>
  );
}
