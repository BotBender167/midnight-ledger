import type { Receipt } from "../types/archive";

/**
 * The connection engine.
 *
 * The brief's central claim is that five unrelated-looking records can be one
 * moment. This module is where that claim is tested. Given any receipt it
 * scores every other receipt on three independent axes and returns the ones
 * that survive:
 *
 *   proximity  — how close in time, decaying smoothly to zero at the window edge
 *   resonance  — how much vocabulary the two records share (artist, category, kind)
 *   crossing   — a deliberate bonus when the link jumps between archives
 *
 * The crossing bonus exists because a same-archive link is cheap: two Beatles
 * plays an hour apart are not an insight. A Beatles vigil on the same night as
 * a ₹199 Netflix renewal is the thing worth showing, so the scoring is tilted
 * to surface it.
 *
 * Interface is deliberately one function. Callers supply an anchor and the
 * corpus; everything else is tuning that lives in here.
 */

/** Default half-width of the search window, in days. */
const DEFAULT_WINDOW_DAYS = 3;
/** How many links to return. More than this reads as noise, not a story. */
const DEFAULT_LIMIT = 12;

/** Axis weights. They sum to 1 so `score` stays readable as a percentage. */
const WEIGHT = { proximity: 0.5, resonance: 0.3, crossing: 0.2 } as const;

/** Tags that are structural rather than descriptive and so prove nothing. */
const GENERIC_TAGS = new Set(["music", "money"]);

export interface Connection {
  receipt: Receipt;
  /** 0-1 overall strength. */
  score: number;
  /** Whole days from the anchor; negative is earlier. */
  dayOffset: number;
  /** Why this link was drawn, in the reader's language. */
  reason: string;
  /** True when the two receipts come from different archives. */
  crossesArchives: boolean;
}

export interface ConnectionOptions {
  windowDays?: number;
  limit?: number;
}

const toTime = (ts: string): number => Date.parse(ts.replace(" ", "T"));

/**
 * Index of the first receipt at or after `time`.
 *
 * `findConnections` is called for every receipt when building the suggested
 * anchors, so a linear scan of the corpus would be 3,704² comparisons on the
 * main thread. The corpus is emitted sorted by timestamp, so the window can be
 * bracketed with two binary searches instead — the scan then touches only the
 * handful of records actually inside it.
 *
 * Precondition: `corpus` is sorted ascending by `ts`. The build step guarantees
 * this; `createCorpus` re-sorts defensively for anyone calling it directly.
 */
function lowerBound(corpus: readonly Receipt[], time: number): number {
  let lo = 0;
  let hi = corpus.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (toTime(corpus[mid]!.ts) < time) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * Guarantee the precondition `findConnections` relies on.
 * Cheap on already-sorted input, and removes a silent-wrong-answer class of bug.
 */
export const createCorpus = (receipts: readonly Receipt[]): Receipt[] =>
  [...receipts].sort((a, b) => a.ts.localeCompare(b.ts));

/** Meaningful tags only, lowercased for comparison. */
const significantTags = (r: Receipt): Set<string> =>
  new Set(r.tags.filter((t) => !GENERIC_TAGS.has(t)).map((t) => t.toLowerCase()));

/**
 * Build the sentence shown on the link. Specific beats generic: name the shared
 * artist or category if there is one, fall back to timing otherwise.
 */
function explain(shared: string[], dayOffset: number, crosses: boolean): string {
  const when =
    dayOffset === 0
      ? "the same day"
      : `${Math.abs(dayOffset)} day${Math.abs(dayOffset) === 1 ? "" : "s"} ${dayOffset < 0 ? "earlier" : "later"}`;

  if (shared.length > 0) {
    const subject = shared[0];
    return crosses
      ? `${subject} — ${when}, in the other archive`
      : `${subject} — ${when}`;
  }
  return crosses ? `${when}, in the other archive` : when;
}

/**
 * Find the records that plausibly belong to the same moment as `anchor`.
 *
 * @param anchor the receipt the reader selected
 * @param corpus every receipt in the dataset
 * @returns scored links, strongest first, never including the anchor itself
 */
export function findConnections(
  anchor: Receipt,
  corpus: readonly Receipt[],
  options: ConnectionOptions = {},
): Connection[] {
  const windowDays = options.windowDays ?? DEFAULT_WINDOW_DAYS;
  const limit = options.limit ?? DEFAULT_LIMIT;

  const anchorTime = toTime(anchor.ts);
  if (Number.isNaN(anchorTime)) return [];

  const windowMs = windowDays * 86_400_000;
  const anchorTags = significantTags(anchor);

  const links: Connection[] = [];

  // Only the slice inside the time window can possibly match.
  const start = lowerBound(corpus, anchorTime - windowMs);
  const end = lowerBound(corpus, anchorTime + windowMs + 1);

  for (let i = start; i < end; i++) {
    const candidate = corpus[i]!;
    if (candidate.id === anchor.id) continue;

    const delta = toTime(candidate.ts) - anchorTime;
    if (Number.isNaN(delta)) continue;
    // The binary search already bracketed the window, but only correctly if the
    // corpus is genuinely sorted by time. Re-check rather than trust it: a
    // sorting regression should return fewer links, never wrong ones.
    if (Math.abs(delta) > windowMs) continue;

    // Proximity decays linearly to zero at the window edge.
    const proximity = 1 - Math.abs(delta) / windowMs;

    // Resonance is Jaccard-ish: shared vocabulary over the anchor's vocabulary.
    const candidateTags = significantTags(candidate);
    const shared = [...anchorTags].filter((t) => candidateTags.has(t));
    const resonance = anchorTags.size === 0 ? 0 : shared.length / anchorTags.size;

    const crossesArchives = candidate.source !== anchor.source;

    const score =
      proximity * WEIGHT.proximity +
      resonance * WEIGHT.resonance +
      (crossesArchives ? WEIGHT.crossing : 0);

    // A same-archive link with nothing in common but the clock is not a finding.
    if (!crossesArchives && shared.length === 0 && proximity < 0.72) continue;

    const dayOffset = Math.round(delta / 86_400_000);

    links.push({
      receipt: candidate,
      score,
      dayOffset,
      crossesArchives,
      reason: explain(
        shared.map((t) => candidate.tags.find((o) => o.toLowerCase() === t) ?? t),
        dayOffset,
        crossesArchives,
      ),
    });
  }

  return links.sort((a, b) => b.score - a.score).slice(0, limit);
}

/**
 * Receipts worth offering as a starting point.
 *
 * A reader dropped into 3,704 records with no lead will bounce. These are the
 * anchors that actually have a cross-archive story attached, which is the only
 * kind worth putting a "start here" label on.
 */
export function findRichAnchors(corpus: readonly Receipt[], count = 6): Receipt[] {
  const scored = corpus
    .map((receipt) => {
      const links = findConnections(receipt, corpus, { limit: 20 });
      const crossings = links.filter((l) => l.crossesArchives).length;
      return { receipt, rank: crossings * 2 + links.length * 0.2 + receipt.weight };
    })
    .filter((s) => s.rank > 0)
    .sort((a, b) => b.rank - a.rank);

  // Spread the picks across years so the suggestions are not all from 2017.
  const picked: Receipt[] = [];
  const usedYears = new Set<string>();
  for (const { receipt } of scored) {
    const year = receipt.ts.slice(0, 4);
    if (usedYears.has(year)) continue;
    usedYears.add(year);
    picked.push(receipt);
    if (picked.length === count) break;
  }

  // Backfill if the year spread was too strict to reach `count`.
  for (const { receipt } of scored) {
    if (picked.length >= count) break;
    if (!picked.some((p) => p.id === receipt.id)) picked.push(receipt);
  }

  return picked;
}
