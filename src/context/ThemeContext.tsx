"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type ThemePreference = "dark" | "light" | "system";
type ResolvedTheme = "dark" | "light";

interface ThemeContextValue {
  theme: ResolvedTheme;
  preference: ThemePreference;
  toggleTheme: () => void;
  setTheme: (theme: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  preference: "dark",
  toggleTheme: () => {},
  setTheme: () => {},
});

const STORAGE_KEY = "gm_theme";

function resolveTheme(pref: ThemePreference): ResolvedTheme {
  if (pref === "light" || pref === "dark") return pref;
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  return "dark";
}

function applyThemeClass(resolved: ResolvedTheme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("light", resolved === "light");
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreference] = useState<ThemePreference>("dark");
  const [theme, setThemeState] = useState<ResolvedTheme>("dark");

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      try {
        const saved = localStorage.getItem(STORAGE_KEY) as ThemePreference | null;
        const pref: ThemePreference =
          saved === "light" || saved === "dark" || saved === "system" ? saved : "dark";
        const resolved = resolveTheme(pref);
        setPreference(pref);
        setThemeState(resolved);
        applyThemeClass(resolved);
      } catch {
        // ignore
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (preference !== "system" || typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => {
      const resolved = mq.matches ? "light" : "dark";
      setThemeState(resolved);
      applyThemeClass(resolved);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [preference]);

  const setTheme = (next: ThemePreference) => {
    const resolved = resolveTheme(next);
    setPreference(next);
    setThemeState(resolved);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
    applyThemeClass(resolved);
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <ThemeContext.Provider value={{ theme, preference, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
