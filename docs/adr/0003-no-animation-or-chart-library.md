# ADR 0003 — Hand-author every figure and every animation

- **Status:** Accepted
- **Date:** 2026-09-20

## Context

The site needs a radial 24-hour clock, a dual-series convergence chart, six small hour
fingerprints, a crowd-versus-subject overlay, a force-style constellation graph, and
scroll-triggered motion on roughly fifty elements.

The reflex is Recharts or D3 for the figures and Framer Motion for the movement. That is
roughly 34 KB gzipped for the motion library and considerably more for charting, against a
150 KB budget for the whole page.

## Decision

No animation library and no chart library. Every figure is inline SVG written by hand; all
motion is CSS.

**Figures.** Inline SVG inherits `currentColor`, so the entire visual world re-inks itself for
dark mode with no per-chart theming. A charting library would need its palette configured
twice and would still fight the hand-drawn art direction, which is the point of the design.

**Motion.** `Reveal` sets one attribute, `data-enter`. `styles/motion.css` decides what that
means. Everything animated is `transform`, `opacity`, `stroke-dashoffset` or `clip-path` — the
four properties that never trigger layout — so transitions run on the compositor, which is
genuinely smoother than a JS-driven library, not merely smaller.

SVG paths carry `pathLength="1"`, so a single `stroke-dasharray: 1` draws a 40px tick and a
2000px skyline alike with no per-path measuring.

## Consequences

**Good.** 82.8 KB gzipped JS for the whole application. Dark mode is free. Reduced-motion
support is four CSS rules rather than a prop threaded through every component.

**Bad.** Every chart is bespoke, so there is no shared axis or legend abstraction, and adding a
seventh figure means writing it from scratch. Accessibility had to be built by hand too — each
interactive mark is an individually authored focusable element, and the radial clock needed a
separate hidden table because a dial cannot be read aloud.

**Watch for.** Elements start hidden so the entrance has a start state, which means a scroll
observer that never reports would leave the page blank. `useInView` carries a health check that
reveals everything if no callback arrives within 1.2s. Do not remove it.
