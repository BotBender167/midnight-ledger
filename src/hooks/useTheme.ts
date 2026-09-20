import { useContext } from "react";
import { ThemeContext, type ThemeContextValue } from "../context/ThemeContext";

/**
 * Read the document colour scheme.
 *
 * Throws outside a `ThemeProvider` rather than returning a default — a silent
 * fallback here would mean the toggle renders and does nothing, which is worse
 * than failing loudly at development time.
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used inside a <ThemeProvider>.");
  }
  return context;
}
