import { useEffect, useState } from "react";
import { NAV_SECTIONS } from "../constants/ui";
import { useTheme } from "../hooks/useTheme";

/**
 * Sticky masthead: section navigation plus the lamp switch.
 *
 * The nav doubles as a progress readout — the current section is marked with
 * `aria-current`, so one piece of state serves both the sighted reader and a
 * screen reader rather than needing a second mechanism.
 *
 * Colour-scheme state lives in ThemeProvider; this component only renders the
 * control.
 */
export function Masthead() {
  const { theme, toggle } = useTheme();
  const [active, setActive] = useState<string>(NAV_SECTIONS[0].id);

  useEffect(() => {
    const targets = NAV_SECTIONS.map((s) => document.getElementById(s.id)).filter(
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

  return (
    <div className="sticky top-0 z-50 border-b border-[color-mix(in_oklab,var(--color-ink)_14%,transparent)] bg-[color-mix(in_oklab,var(--color-paper)_88%,transparent)] backdrop-blur-sm">
      <div className="shell flex items-center justify-between gap-4 py-2.5">
        <a href="#top" className="annotation shrink-0 no-underline hover:text-[var(--color-ink)]">
          ML<span className="hidden sm:inline"> · The Midnight Ledger</span>
        </a>

        <nav aria-label="Sections" className="min-w-0 flex-1">
          <ul className="flex items-center gap-1 overflow-x-auto sm:justify-center [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {NAV_SECTIONS.map((section) => (
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
          onClick={toggle}
          aria-pressed={theme === "dark"}
        >
          <span aria-hidden="true">{theme === "dark" ? "☾" : "☀"}</span>
          <span className="sr-only">
            {theme === "dark" ? "Switch to daylight" : "Switch to night"}
          </span>
        </button>
      </div>
    </div>
  );
}
