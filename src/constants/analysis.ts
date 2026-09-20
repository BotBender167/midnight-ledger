/**
 * Tuning constants for the analysis layer.
 *
 * These were scattered across the modules that used them, which made the
 * system's behaviour impossible to read in one place — the connection scoring
 * weights in particular are the difference between "two Beatles plays an hour
 * apart" and a real cross-archive finding. Centralised so the numbers that
 * define the product can be reviewed and tuned together.
 */

/** Weights for the three connection-scoring axes. Sum to 1 so `score` reads as a fraction. */
export const CONNECTION_WEIGHTS = {
  /** How close in time, decaying to zero at the window edge. */
  proximity: 0.5,
  /** Shared vocabulary: artist, category, kind. */
  resonance: 0.3,
  /** Bonus when the link jumps between archives — the only links that argue for one person. */
  crossing: 0.2,
} as const;

/** Half-width of the connection search window, in days. */
export const DEFAULT_WINDOW_DAYS = 3;

/** Windows the reader can choose between. */
export const WINDOW_OPTIONS = [1, 3, 7, 14] as const;

/** Links returned per anchor. More than this reads as noise rather than a story. */
export const DEFAULT_CONNECTION_LIMIT = 12;

/**
 * A same-archive link with no shared vocabulary needs at least this proximity
 * to be worth drawing. Without the floor, every record within the window links
 * to every other one and the figure says nothing.
 */
export const WEAK_LINK_PROXIMITY_FLOOR = 0.72;

/** Tags that are structural rather than descriptive, so they prove nothing. */
export const GENERIC_TAGS = new Set(["music", "money"]);

/** Hours counted as "after dark" when reporting night share. */
export const NIGHT_HOURS = new Set([22, 23, 0, 1, 2, 3, 4]);

/** Milliseconds in a day. */
export const DAY_MS = 86_400_000;
