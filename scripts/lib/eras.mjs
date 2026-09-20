import { round } from "./csv.mjs";

/**
 * Chapter detection.
 *
 * The *boundaries* are computed, not authored: a year begins a new chapter when
 * listening volume breaks out of a stability band, or when the dominant artist
 * changes at the same time as a material shift in volume. Thin segments are
 * absorbed into their neighbour so a 23-play year cannot become a chapter of
 * its own.
 *
 * The *titles and opening lines* are authored, keyed to the computed start
 * year, with a generated fallback. This split is stated in the README so the
 * reader knows which half the machine wrote.
 */

/** Year-over-year ratios inside this band count as "the same era continuing". */
const STABLE_BAND = [0.62, 1.75];
/**
 * Drift band measured against the *first* year of the open segment.
 *
 * Year-over-year testing alone cannot see a slow slide: 2020→2024 loses 59% of
 * its volume without any single step breaching STABLE_BAND, which let one
 * chapter swallow 56% of the archive. Comparing back to the segment's origin
 * catches the cumulative move.
 */
const DRIFT_BAND = [0.55, 2.0];
/** A change of dominant artist only starts a chapter if volume also moves this much. */
const ARTIST_SHIFT_MIN_DELTA = 0.25;
/** Segments below this share of all plays are merged into a neighbour. */
const MIN_SEGMENT_SHARE = 0.01;

/**
 * Authored narration, keyed by the start year the detector produces.
 * `title` names the chapter; `line` is the claim the evidence underneath must
 * support. Nothing here states a fact the data does not contain.
 */
const NARRATION = {
  2013: {
    title: "First Light",
    line: "The archive opens, flickers, and almost goes out — twenty-three plays in the whole of 2014 — then switches back on with a hundredfold jump and Spanish records beside the English ones.",
  },
  2016: {
    title: "Four Men Arrive",
    line: "The Beatles reach number one and do not leave for five years. Everything after this is measured against them.",
  },
  2017: {
    title: "The Flood",
    line: "The single loudest year in the archive. More plays than the previous four years combined, and the household ledger peaks in the same twelve months.",
  },
  2018: {
    title: "The Plateau",
    line: "The flood recedes to a steady tide. Two years so alike in volume that the detector refuses to separate them.",
  },
  2020: {
    title: "The Long Indoors",
    line: "Volume climbs again and the Beatles are finally dethroned. The Killers take the top of a year the whole world spent inside — and the listening slides later into the night than it has ever been.",
  },
  2023: {
    title: "The Fade",
    line: "No collapse, no silence. Just less, every year, by roughly a tenth — the quietest ending an archive can have.",
  },
};

/** Fallback narration when a detected start year has no authored entry. */
function generateNarration(segment) {
  const top = segment.topArtist;
  return {
    title: `${segment.start}${segment.end !== segment.start ? `–${segment.end}` : ""}`,
    line: `${segment.plays.toLocaleString()} plays, led by ${top}. ${segment.nightShare}% of them after dark.`,
  };
}

/**
 * @param {Array<object>} years output of spotify.byYear()
 * @returns {Array<object>} chapters with computed boundaries and evidence
 */
export function detectChapters(years) {
  const total = years.reduce((s, y) => s + y.plays, 0);

  // ── Pass 1: find boundaries ──────────────────────────────────────────────
  const cuts = new Set([0]);
  let anchor = 0; // first year of the currently open segment
  for (let i = 1; i < years.length; i++) {
    const step = years[i].plays / Math.max(1, years[i - 1].plays);
    const drift = years[i].plays / Math.max(1, years[anchor].plays);
    const artistChanged = years[i].topArtists[0]?.name !== years[i - 1].topArtists[0]?.name;
    const volumeMoved = Math.abs(step - 1) >= ARTIST_SHIFT_MIN_DELTA;

    const isCut =
      step < STABLE_BAND[0] ||
      step > STABLE_BAND[1] ||
      drift < DRIFT_BAND[0] ||
      drift > DRIFT_BAND[1] ||
      (artistChanged && volumeMoved);

    if (isCut) {
      cuts.add(i);
      anchor = i;
    }
  }

  // ── Pass 2: build segments ───────────────────────────────────────────────
  const starts = [...cuts].sort((a, b) => a - b);
  let segments = starts.map((start, i) => {
    const end = i + 1 < starts.length ? starts[i + 1] : years.length;
    return years.slice(start, end);
  });

  // ── Pass 3: absorb thin segments into the larger neighbour ───────────────
  let merged = true;
  while (merged && segments.length > 1) {
    merged = false;
    for (let i = 0; i < segments.length; i++) {
      const plays = segments[i].reduce((s, y) => s + y.plays, 0);
      if (plays / total >= MIN_SEGMENT_SHARE) continue;

      const prev = segments[i - 1];
      const next = segments[i + 1];
      const target = !prev ? i + 1 : !next ? i - 1 : i + 1;
      segments[target] = [...segments[i], ...segments[target]].sort((a, b) =>
        a.year.localeCompare(b.year),
      );
      segments.splice(i, 1);
      merged = true;
      break;
    }
  }

  // ── Pass 4: attach evidence and narration ────────────────────────────────
  return segments.map((seg, index) => {
    const plays = seg.reduce((s, y) => s + y.plays, 0);
    const hours = seg.reduce((s, y) => s + y.hours, 0);

    const artistTotals = {};
    for (const y of seg)
      for (const a of y.topArtists) artistTotals[a.name] = (artistTotals[a.name] || 0) + a.count;
    const ranked = Object.entries(artistTotals).sort((a, b) => b[1] - a[1]);

    const hours24 = new Array(24).fill(0);
    for (const y of seg) y.hours24.forEach((n, h) => (hours24[h] += n));

    const base = {
      index,
      start: seg[0].year,
      end: seg[seg.length - 1].year,
      years: seg.map((y) => y.year),
      plays,
      hours,
      share: round((plays / total) * 100, 1),
      topArtist: ranked[0]?.[0] ?? "unattributed",
      topArtists: ranked.slice(0, 4).map(([name, count]) => ({ name, count })),
      nightShare: round(seg.reduce((s, y) => s + y.nightShare * y.plays, 0) / plays, 1),
      skipRate: round(seg.reduce((s, y) => s + y.skipRate * y.plays, 0) / plays, 1),
      peakHour: hours24.indexOf(Math.max(...hours24)),
      hours24,
    };

    const narration = NARRATION[Number(base.start)] ?? generateNarration(base);
    return { ...base, ...narration };
  });
}
