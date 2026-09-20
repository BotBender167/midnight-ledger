# Architecture

How The Midnight Ledger is put together, and why it is put together that way.

## The one decision everything else follows from

Three sources with nothing in common — a streaming log, a household cashbook, a national card
feed — are normalised to a single `Receipt` shape **at build time**, before any UI code exists.

```ts
type Receipt = {
  id: string;
  kind: ReceiptKind;   // discovery | obsession | vigil | binge | return
                       // purchase | ritual | investment | income
  ts: string;          // ISO-ish. Archive A is UTC.
  title: string;
  subtitle?: string;
  detail?: string;
  amount?: number;     // INR. Positive is money out.
  weight: number;      // 0-1 significance
  tags: string[];
  source: "listening" | "ledger";
};
```

Every downstream view — archive, constellation, chapters, clock — reads only this shape.
Adding a fourth archive means writing one adapter in `scripts/lib/` and changing nothing else.

## Two runtimes, one boundary

```
BUILD TIME (Node, no dependencies)          RUNTIME (browser)
─────────────────────────────────           ─────────────────
scripts/*.csv           24 MB
  │
  ├─ lib/csv.mjs        parse
  ├─ lib/spotify.mjs    149,860 plays → 1,243 moments
  ├─ lib/ledger.mjs     2,461 rows → receipts
  ├─ lib/ambient.mjs    10,267 rows → aggregates only
  └─ lib/eras.mjs       change-point detection
        │
        ▼
  public/data/*.json    1.1 MB  ──────────▶  hooks/useDataset.ts
                                                   │
                                             sections/ + components/
```

The browser never parses a CSV. It never sees archive C's individual rows — those are other
people's transactions and aggregating them is both a privacy choice and a payload choice.

### Why the build step is dependency-free

`scripts/lib/csv.mjs` is a hand-written RFC-4180 parser rather than `papaparse` or `csv-parse`.
The data step runs before `vite build` on a clean clone, and a 60-line parser is cheaper to
trust than a dependency in the critical path of "does this project build at all".

## A play is not a receipt

The most important transformation in the project. 149,860 individual plays are not 149,860
moments — they are mostly noise. `scripts/lib/spotify.mjs` derives five kinds of *moment*:

| Kind | Rule | Why it is a moment |
|---|---|---|
| `discovery` | First ever play of an artist later played ≥25 times | The day they met someone who mattered |
| `obsession` | One track ≥8 times in a day | Something was going on |
| `vigil` | ≥40 plays between 22:00 and 05:00 | A night that did not end |
| `binge` | ≥150 plays in a calendar day | A day given over entirely |
| `return` | A play after ≥30 days of silence | The archive waking up |

1,243 moments survive. Together with all 2,461 ledger rows that gives 3,704 shipped receipts —
small enough to search linearly in well under a frame, rich enough to tell a story.

## Module boundaries

**`src/lib/`** — pure functions, no React, no DOM. `connections.ts` and `format.ts` are
directly unit-testable and have no imports from anywhere else in `src/`.

**`src/hooks/`** — the two stateful concerns: data loading (`useDataset`) and scroll arrival
(`useInView`). Both are deep: small interfaces, all the awkwardness inside.

**`src/components/`** — split three ways. `art/` is hand-drawn illustration, `viz/` is data
figures, and the root holds primitives (`Reveal`, `Counter`, `ReceiptSlip`).

**`src/sections/`** — one file per plate. Each is a pure function of its props; all fetching
happens once in `App.tsx` and flows down.

**`src/styles/`** — `tokens.css` is the entire visual world (colour, type, rhythm, easing) and
`motion.css` owns every animation. No component file contains a colour or a duration.

## Motion

`Reveal` sets `data-enter="true"` on arrival. That is the whole component. CSS in `motion.css`
decides what the attribute means, which keeps transitions on the compositor and keeps
presentation out of the component tree.

Everything animated is `transform`, `opacity`, `stroke-dashoffset` or `clip-path` — the four
properties that never trigger layout. Nothing animates width, height, top or margin.

SVG paths carry `pathLength="1"`, so one `stroke-dasharray: 1` draws a 40px tick and a 2000px
coastline alike with no per-path measuring.

### The failsafe

Elements start hidden so the entrance has a start state — which means a scroll observer that
never reports would leave the page blank. `IntersectionObserver` genuinely does not run while a
document is not being rendered (background tabs, some headless capture tools), so `useInView`
runs a health check: if no callback arrives for any element within 1.2s, observation is declared
broken and everything reveals at once. Healthy browsers fire on the frame after `observe()`, so
the normal path is never delayed.

## Performance decisions

| Decision | Reason |
|---|---|
| No animation library | Framer Motion is ~34 KB for transitions CSS already does on the compositor |
| No chart library | Hand-authored SVG inherits `currentColor`, re-inks itself in dark mode, and ships no runtime |
| Two-stage data load | 14 KB blocks paint; 906 KB does not |
| Binary-searched connection window | Building suggested anchors is O(n²) with a linear scan — 13.7M comparisons |
| Pooled IntersectionObserver | One observer per config, not one per element |
| `useDeferredValue` on archive search | Input stays responsive while the filter pass runs on a deferred copy |
| React split into its own chunk | Stable across deploys, independently cacheable |

## Accessibility decisions

Charts are the hard part. The approach:

1. Every figure has a `<title>` stating the finding, not the encoding.
2. Every interactive mark is a real focusable element with a full accessible name, and a hit
   target sized for a fingertip rather than for the visible dot.
3. The radial clock additionally ships a visually hidden `<table>`. A dial is not readable
   however good its labels are, so the numbers are provided directly.

## What I would change with more than six hours

- **Tests.** `connections.ts` and `eras.mjs` are pure and deserve unit tests. The scoring
  weights in particular are asserted by eye right now.
- **An index for the archive.** Linear search is fine at 3,704 rows and wrong at 50,000.
- **Virtualised results.** The archive pages at 60 rather than windowing.
- **Move era detection to runtime** so the reader could tune the thresholds and watch the
  chapters redraw — the same move the timezone dial already makes.
