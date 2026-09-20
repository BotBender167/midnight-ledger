import { useEffect, useRef, useState } from "react";

/**
 * How far through the survey the reader is, and a way back to the start.
 *
 * The document is roughly thirty thousand pixels tall. Without a progress
 * readout the scrollbar is the only cue, and on a phone there is no scrollbar
 * at all — so a reader has no idea whether they are near the end of a chapter
 * or the end of the page.
 *
 * Scroll is read inside a `requestAnimationFrame` and the listener is passive,
 * so scrolling is never blocked and the DOM is measured at most once a frame.
 * The bar itself is driven by `transform: scaleX()`, which stays on the
 * compositor — animating `width` here would force a layout on every frame of
 * every scroll.
 */
export function ReadingProgress() {
  const [progress, setProgress] = useState(0);
  const [showTop, setShowTop] = useState(false);
  const frame = useRef(0);

  useEffect(() => {
    const measure = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const y = window.scrollY;
      setProgress(scrollable > 0 ? Math.min(1, Math.max(0, y / scrollable)) : 0);
      setShowTop(y > window.innerHeight * 1.5);
    };

    const onScroll = () => {
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      cancelAnimationFrame(frame.current);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <>
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[2px]"
        role="progressbar"
        aria-label="Progress through the survey"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
      >
        <div
          className="h-full origin-left bg-[var(--color-azure)]"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>

      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className={`fixed right-4 bottom-4 z-50 border border-[color-mix(in_oklab,var(--color-ink)_22%,transparent)] bg-[var(--color-paper-2)] px-3 py-2.5 font-mono text-micro tracking-widest uppercase transition-all duration-300 sm:right-6 sm:bottom-6 ${
          showTop
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none translate-y-3 opacity-0"
        }`}
        aria-hidden={!showTop}
        tabIndex={showTop ? 0 : -1}
      >
        <span aria-hidden="true">↑</span>
        <span className="sr-only">Back to the top of the survey</span>
      </button>
    </>
  );
}
