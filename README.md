# The Midnight Ledger

**Three anonymous archives. 162,588 digital receipts. One question the data refuses to answer.**

An illustrated field journal that reconstructs a life from raw activity logs — and is honest
about where the reconstruction breaks down.

Built for WebRush, a 6-hour frontend hackathon, against the brief *"Your Life, In Receipts"*.

---

## The premise

We were handed three datasets. Read carefully, they do not describe the same person:

| # | Archive | Records | Span | What it actually is |
|---|---------|--------:|------|---------------------|
| **A** | Spotify streaming history | 149,860 | Jul 2013 – Dec 2024 | One account. Beatles, Killers, Dylan, John Mayer. Almost certainly one person. |
| **B** | Daily household transactions | 2,461 | Jan 2015 – Sep 2018 | One Indian household. Idli, Ganesh Chaturthi, train fares, mutual funds. Locations already anonymised to "Place 0"…"Place 5". |
| **C** | India card transactions | 10,267 | Apr 2022 – Apr 2024 | Ten thousand *different* cardholders. A fraud-detection sample, not a person. 850 rows have unreadable dates and are excluded. |

Most entries to this brief would quietly merge all three and narrate a single life. This one
does not. **The site presents the evidence and asks the reader to judge**, because the honest
finding — that the archives may not belong together — turned out to be more interesting than
the fiction.

Archive C is never presented as the subject. It appears once, as *the crowd*: the ambient
economy running while the subject listened alone.

---

## What the data actually revealed

Every figure below is computed at build time from the raw CSVs. None is hardcoded.

**The subject is nocturnal.** Their single biggest listening hour is midnight (10,884 plays).
Their smallest is noon (724). A 15× gap.

**Both personal archives peak in 2017** — 26,320 plays and 1,035 transactions, each its own
maximum, independently. It is the best argument for one person, and the site says plainly that
one shared peak in a four-year overlap is also what coincidence looks like.

**The closing finding: the quieter it got, the later it got.** Across the six detected chapters,
as yearly volume falls the peak listening hour slides deeper into the night — 8pm in the
loudest era (2017), 2am in the last (2023–24). Listening less, and listening later. This is
only visible *after* era detection; no single year shows it.

---

## Requirements → where they live

The brief set six minimum requirements. Each maps to a specific module:

| Requirement | Implementation | File |
|---|---|---|
| A way to explore the receipts | Searchable, filterable archive of all 3,704 shipped receipts | [`src/sections/Archive.tsx`](src/sections/Archive.tsx) |
| Meaningful filtering, searching, navigation | Free-text search across title/subtitle/detail/tags, 9 receipt-kind filters, year filter, sticky section nav with scroll-spy | [`Archive.tsx`](src/sections/Archive.tsx), [`Masthead.tsx`](src/components/Masthead.tsx) |
| **≥1 mechanism for discovering relationships** | **The connection engine** — scores every record against an anchor on proximity, shared vocabulary and cross-archive crossing; any node re-anchors the graph | [`src/lib/connections.ts`](src/lib/connections.ts), [`Constellation.tsx`](src/sections/Constellation.tsx) |
| An interactive storytelling experience | Eight scroll-driven plates, six auto-detected chapters, and a timezone dial that rewrites the subject's personality live | [`src/sections/`](src/sections/) |
| A clear visual of the digital journey | Radial 24-hour clock, per-chapter hour fingerprints, dual-series convergence chart, crowd-vs-subject overlay | [`src/components/viz/`](src/components/viz/) |
| Responsive design | Fluid type and spacing via `clamp()`, single-column → 4-column grids, tested 320 / 375 / 768 / 1024 / 1440 | [`src/styles/tokens.css`](src/styles/tokens.css) |

### The two features worth looking at

**1. The connection engine** ([`src/lib/connections.ts`](src/lib/connections.ts))

The brief's central claim is that five unrelated-looking records can be one moment. This is
where that claim is tested. Given any receipt, every other receipt in the window is scored on
three independent axes:

- `proximity` (0.5) — closeness in time, decaying to zero at the window edge
- `resonance` (0.3) — shared vocabulary: artist, category, kind
- `crossing` (0.2) — a deliberate bonus when the link jumps between archives

The crossing bonus exists because same-archive links are cheap. Two Beatles plays an hour apart
are not an insight. A 4am Beatles vigil on the same night as a ₹199 Netflix renewal is the
thing worth surfacing, so the scoring is tilted to find it.

Selecting any linked record re-anchors the whole graph, turning a single lookup into a walk
through the dataset. A breadcrumb trail records the path.

**2. The timezone dial** ([`src/sections/TheClock.tsx`](src/sections/TheClock.tsx))

Archive A is stamped **UTC** and never records where the subject was. Rather than pick a
timezone and present the result as fact, the dial is handed to the reader. The same 149,860
rows support "a nocturnal life", "a commuter's life", "a working life" or "an evening life"
depending on an assumption nobody wrote down. Move the slider and the verdict rewrites itself.

---

## Chapter detection — what the machine wrote, and what I did

Chapter **boundaries are computed** ([`scripts/lib/eras.mjs`](scripts/lib/eras.mjs)). A year
opens a new chapter when:

- year-over-year volume leaves the stability band `[0.62, 1.75]`, **or**
- volume drifts outside `[0.55, 2.0]` of the era's *opening* year (catches slow slides that no
  single step would trip — without this, 2020–2024 swallowed 56% of the archive), **or**
- the dominant artist changes alongside a ≥25% move in volume

Segments holding under 1% of all plays are absorbed into a neighbour, so a 23-play year cannot
become a chapter. This produces six chapters from eleven years.

Chapter **titles and opening lines are written by hand**, keyed to the detected start year, with
a generated fallback. That split is stated here so the reader knows which half is authored.

---

## Running it

```bash
npm install
npm run data      # parse 24 MB of CSV → 4 JSON bundles in public/data
npm run dev       # http://localhost:5173
```

```bash
npm run build     # runs the data step, typechecks, then builds
npm run preview
npm run lint
npm run typecheck
```

The three source CSVs live in `scripts/`. `npm run data` is wired into `npm run build`, so a
clean clone produces a working site with one command.

---

## Architecture

Full detail in [ARCHITECTURE.md](ARCHITECTURE.md). The short version:

```
scripts/           build-time: CSV → JSON, runs on Node, zero dependencies
  lib/csv.mjs        RFC-4180 parser written by hand so the build needs no packages
  lib/spotify.mjs    149,860 plays → 1,243 *moments* (a play is not a receipt)
  lib/ledger.mjs     household rows → receipts
  lib/ambient.mjs    archive C → aggregates only, never individual rows
  lib/eras.mjs       change-point detection

src/
  types/archive.ts   the domain model — three sources flattened to one Receipt shape
  lib/               pure logic: connection scoring, formatting. No React.
  hooks/             data loading, pooled scroll observation
  components/        primitives, art, viz
  sections/          one file per plate
  styles/            tokens and motion, separated from component code
```

**The shape that matters:** three very different sources are normalised to one `Receipt` type
*before* any UI sees them. Every downstream view reads only that shape, so a fourth archive
would mean writing one adapter and changing nothing else.

---

## Performance

- **No animation library.** All motion is CSS `transform` / `opacity` / `stroke-dashoffset`,
  which stays on the compositor. A scroll observer sets one attribute; CSS does the rest.
- **No charting library.** Every figure is hand-authored inline SVG, so it inherits
  `currentColor` and re-inks itself in dark mode for free.
- **Two-stage data loading.** `overview.json` is 14 KB and blocks first paint; `receipts.json`
  is 906 KB and loads after mount, with the sections that need it showing their own state.
- **The connection index binary-searches** its time window. A linear scan would be 3,704²
  comparisons on the main thread when building suggested anchors.
- **Pooled IntersectionObserver** — one per config, not one per element.

## Accessibility

- Every chart carries a `<title>`/`aria-label`; the radial clock also ships a visually hidden
  `<table>` with the real numbers, because a dial is not readable by a screen reader.
- Every interactive mark in every SVG is a real focusable control with an accessible name.
- `prefers-reduced-motion` cuts all movement and renders the finished state.
- `prefers-color-scheme` is honoured, with a manual override that persists.
- Skip link, landmarks, `aria-live` on result counts, visible focus rings on everything.
- **Motion never gates content.** If the scroll observer fails to report, a health check
  reveals the whole page rather than leaving it blank.

## Known limits

- Archives A and B may well be two different people. The site says so rather than hiding it.
- The brief promised nine receipt types (photos, messages, searches, notes…). The supplied data
  contains **music and money only**. Nothing has been fabricated to fill the gap — the empty
  state in the archive says this out loud.
- `receipts.json` is 906 KB uncompressed (~180 KB over the wire with brotli). Beyond roughly
  5,000 receipts this would need an index rather than a flat file.

## Data sources

All three files are as supplied for the hackathon and are unmodified in `scripts/`.
They are public Kaggle datasets and contain no real identifying information — archive B's
locations arrived pre-anonymised, and archive C's names are synthetic.
