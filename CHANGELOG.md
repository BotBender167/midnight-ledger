# Changelog

Notable changes to The Midnight Ledger. Format follows [Keep a Changelog](https://keepachangelog.com/1.1.0/);
versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] — 2026-09-20

### Added

- **Four more receipt types, extracted from the data that was always there.** The brief named
  nine kinds; the ledger turned out to contain four beyond music and money — journeys (parsed
  out of transport notes like `"2 Place 5 to Place 0"`), events (festivals), entertainment
  (Netflix, Tata Play) and written notes. 540 records that were previously filed as generic
  purchases. Nothing was fabricated; the three genuinely absent types are labelled absent in
  the interface.
- **URL-synced archive state.** Search, kind filters, year and sort all live in the query
  string, so any view is a shareable link and the browser back button undoes a filter.
- **Sorting** — oldest, newest, largest amount, most significant.
- **CSV export** of the current filtered selection, RFC-4180 correct, with tests.
- **Reading-progress bar and back-to-top**, both compositor-driven.
- Mobile-first `min-width` breakpoints and a global rule preventing replaced elements from
  exceeding their column.

### Changed

- **Reverted lazy-loading and `content-visibility`.** Both bought speed with content
  availability — see the Performance section of the README. All eight plates are in the initial
  DOM again.
- `SectionFallback` removed; it existed only to serve the lazy boundaries.

## [1.1.0] — 2026-09-20

### Added

- **Unit tests.** 40 tests over `src/lib` covering connection scoring, corpus ordering and
  formatting, with fixtures rather than generated data (`npm test`).
- **`ThemeProvider`.** Colour-scheme state moved out of `Masthead` into a real context, with a
  live `prefers-color-scheme` listener and the ability to drop the override and follow the OS again.
- **`src/constants/`.** Every tuning number — connection weights, window sizes, page sizes,
  breakpoints, timezone presets — collected into two files instead of being inlined at use sites.
- **Barrel exports** for `lib`, `hooks`, `components` and `constants`.
- **`src/styles/responsive.css`** — container queries for receipt slips, pointer/hover capability
  queries, landscape handling, high-contrast support and a print stylesheet.
- `LICENSE`, `CONTRIBUTING.md`, this changelog, and architecture decision records in `docs/adr/`.

### Changed

- **Below-fold sections are code-split.** Six of the eight plates now load as separate chunks
  behind `Suspense`, with a height-reserving fallback so nothing shifts when they land. Only the
  hero and the inventory are in the entry bundle.
- **`ReceiptSlip` is memoised.** Sixty render at once and every keystroke in the search box
  re-rendered all of them.
- **`content-visibility: auto` on every plate**, so the browser skips layout and paint for the
  sections nowhere near the viewport.

### Fixed

- Receipt slips no longer keep a stuck hover state after a tap on touch devices.

## [1.0.1] — 2026-09-20

### Fixed

- **Timestamp separators.** Archive A's rows arrived with a space separator while the moments
  derived from them used `T`. Since `" "` sorts before `"T"`, records on the same date interleaved
  out of chronological order, violating the precondition of the binary-searched connection window
  and letting out-of-window records into results. Normalised at source, plus a defensive window
  re-check in `findConnections`.
- Archive C's completeness was described as poor when it is ~93%. The card now reports the real
  figure and the 850 rows excluded for unreadable dates.

### Added

- `scripts/selfcheck.mjs` — 17 assertions over the generated bundles and the connection engine.
  This is what found the separator bug.

## [1.0.0] — 2026-09-20

Initial build, for the WebRush 6-hour hackathon.

### Added

- Build-time pipeline turning 24 MB of CSV into four JSON bundles with no dependencies.
- 149,860 plays reduced to 1,243 *moments* — discovery, obsession, vigil, binge, return.
- Change-point chapter detection over eleven years; boundaries computed, titles authored.
- The connection engine: proximity, resonance and a cross-archive crossing bonus.
- The timezone dial, which rewrites the subject's apparent personality from the same rows.
- Eight scroll-driven plates, all figures hand-authored SVG with no chart library.
