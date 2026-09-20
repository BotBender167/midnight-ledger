import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { THEME_STORAGE_KEY } from "../constants/ui";

export type Theme = "light" | "dark";

export type ThemeContextValue = {
  /** The scheme actually in effect, after falling back to the OS preference. */
  theme: Theme;
  /** True when the reader has overridden the OS preference. */
  isOverridden: boolean;
  toggle: () => void;
  setTheme: (theme: Theme) => void;
  /** Drop the override and follow the OS again. */
  reset: () => void;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Storage can throw in private mode, so every access is guarded. */
function readStoredTheme(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

function prefersDark(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches === true
  );
}

/**
 * Colour-scheme state for the whole document.
 *
 * Previously this lived inside the masthead, which meant a presentational
 * component owned application state and nothing else could read the scheme.
 * Hoisting it into a provider gives one owner, lets any component consume it,
 * and keeps the OS-preference listener in a single place.
 *
 * The document follows the OS until the reader overrides it; the override then
 * persists. Both schemes are designed, so neither is a fallback.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [override, setOverride] = useState<Theme | null>(readStoredTheme);
  const [systemDark, setSystemDark] = useState(prefersDark);

  // Track the OS preference so an un-overridden document follows it live.
  useEffect(() => {
    const query = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!query) return;
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const theme: Theme = override ?? (systemDark ? "dark" : "light");

  // Apply the override to the document, or remove it to fall back to the OS.
  useEffect(() => {
    const root = document.documentElement;
    if (override) {
      root.dataset.theme = override;
      try {
        localStorage.setItem(THEME_STORAGE_KEY, override);
      } catch {
        // Storage unavailable — the choice simply will not persist.
      }
    } else {
      delete root.dataset.theme;
      try {
        localStorage.removeItem(THEME_STORAGE_KEY);
      } catch {
        // Nothing to clean up.
      }
    }
  }, [override]);

  const setTheme = useCallback((next: Theme) => setOverride(next), []);
  const toggle = useCallback(() => setOverride(theme === "dark" ? "light" : "dark"), [theme]);
  const reset = useCallback(() => setOverride(null), []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, isOverridden: override !== null, toggle, setTheme, reset }),
    [theme, override, toggle, setTheme, reset],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
