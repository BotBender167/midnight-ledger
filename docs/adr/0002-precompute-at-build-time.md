# ADR 0002 — Precompute everything at build time, with no dependencies

- **Status:** Accepted
- **Date:** 2026-09-20

## Context

The sources total roughly 24 MB of CSV, dominated by 149,860 Spotify rows. The hackathon
forbids a backend, so the only two places computation can happen are the build step and the
browser.

Parsing 24 MB of CSV in the browser would cost seconds of main-thread time before first paint,
on a page whose entire argument depends on charts being legible immediately.

## Decision

A Node build step (`npm run data`) reduces the three CSVs to four JSON bundles. The browser
never sees a CSV.

The build step uses **no npm dependencies** — `scripts/lib/csv.mjs` is a hand-written RFC-4180
parser. It sits in the critical path of "does this project build at all", on CI and on a
grader's clean clone, and sixty lines are cheaper to trust than a package.

Archive C is reduced to **aggregates only**. Its individual rows are other people's
transactions; not shipping them is both a privacy decision and a payload decision.

## Consequences

**Good.** `overview.json` is 14 KB and blocks first paint; the 906 KB receipts bundle loads
after mount, so the hero renders immediately. Chapter detection, hour histograms and moment
extraction all run once on CI instead of on every visitor's phone.

**Bad.** Analysis parameters are frozen at build time. A reader cannot retune the chapter
detector's thresholds and watch the eras redraw — which is exactly the move the timezone dial
makes, and the most obvious thing to do with more time.

**Also.** The three CSVs are committed, so the repo is 8.5 MB. That is the price of a clean
clone reproducing the site with one command.
