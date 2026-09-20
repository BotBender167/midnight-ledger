import { useEffect, useState } from "react";

const SECTIONS = [
  { id: "dig", label: "The dig" },
  { id: "chapters", label: "Chapters" },
  { id: "clock", label: "The clock" },
  { id: "constellation", label: "Connections" },
  { id: "crowd", label: "The crowd" },
  { id: "archive", label: "Archive" },
] as const;

type Theme = "light" | "dark";

const STORAGE_KEY = "midnight-ledger:theme";

/** Read the stored preference. Private-mode reads can throw, hence the guard. */
function storedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

/**
 * Sticky masthead: section navigation plus the lamp switch.
 *
 * The nav doubles as a progress readout — the current section is marked with
 * `aria-current`, so the same state serves both the sighted reader and a
 * screen reader without a second mechanism.
 */
export function Masthead() {
  const [theme, setTheme] = useState<Theme | null>(storedTheme);
  const [active, setActive] = useState<string>("dig");

  // Apply the override. Absent one, the document follows the OS scheme.
  useEffect(() => {
    if (!theme) return;
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Storage unavailable — the choice simply will not persist.
    }
  }, [theme]);

  // Track which section the reader is in.
  useEffect(() => {
    const targets = SECTIONS.map((s) => document.getElementById(s.id)).filter(
      (el): el is HTMLElement => el !== null,
    );
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
    );

    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const resolved: Theme =
    theme ??
    (typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light");

  return (
    <div className="sticky top-0 z-50 border-b border-[color-mix(in_oklab,var(--color-ink)_14%,transparent)] bg-[color-mix(in_oklab,var(--color-paper)_88%,transparent)] backdrop-blur-sm">
      <div className="shell flex items-center justify-between gap-4 py-2.5">
        <a href="#top" className="annotation shrink-0 no-underline hover:text-[var(--color-ink)]">
          ML<span className="hidden sm:inline"> · The Midnight Ledger</span>
        </a>

        <nav aria-label="Sections" className="min-w-0 flex-1">
          <ul className="flex items-center gap-1 overflow-x-auto sm:justify-center [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {SECTIONS.map((section) => (
              <li key={section.id} className="shrink-0">
                <a
                  href={`#${section.id}`}
                  aria-current={active === section.id ? "true" : undefined}
                  className="annotation block px-2 py-1 no-underline transition-colors hover:text-[var(--color-ink)] aria-[current]:text-[var(--color-azure)]"
                >
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <button
          type="button"
          className="control shrink-0 !px-2.5 !py-1.5"
          onClick={() => setTheme(resolved === "dark" ? "light" : "dark")}
          aria-pressed={resolved === "dark"}
        >
          <span aria-hidden="true">{resolved === "dark" ? "☾" : "☀"}</span>
          <span className="sr-only">
            {resolved === "dark" ? "Switch to daylight" : "Switch to night"}
          </span>
        </button>
      </div>
    </div>
  );
}
