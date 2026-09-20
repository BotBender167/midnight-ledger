/** Presentation helpers. Pure functions, no React, safe to unit test. */

// Counts use en-GB thousands grouping (162,588). The ledger is Indian and its
// *currency* is formatted en-IN below, but lakh grouping on record counts
// ("1,62,588") misreads for most of this page's audience.
const NUMBER = new Intl.NumberFormat("en-GB");
const RUPEES = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export const num = (value: number): string => NUMBER.format(Math.round(value));

export const rupees = (value: number): string => RUPEES.format(Math.abs(value));

/** `2017-03-04T02:11:00` → `4 Mar 2017`. */
export function longDate(ts: string): string {
  const d = new Date(ts.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return ts.slice(0, 10);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** `2017-03-04T02:11:00` → `02:11`. */
export function clockTime(ts: string): string {
  const t = ts.slice(11, 16);
  return t || "--:--";
}

/** `0` → `12am`, `13` → `1pm`. Used on every hour axis. */
export function hourLabel(hour: number): string {
  const h = ((hour % 24) + 24) % 24;
  if (h === 0) return "12am";
  if (h === 12) return "12pm";
  return h < 12 ? `${h}am` : `${h - 12}pm`;
}

/**
 * Rotate a 24-slot histogram by a whole-hour timezone offset.
 *
 * The listening archive is stamped in UTC and the subject's location is
 * unknown, so the UI lets the reader move the clock instead of guessing.
 * Offsets are applied as whole hours; India's +5:30 is offered as +5 with the
 * half-hour noted in the label.
 */
export function shiftHours(hours: number[], offset: number): number[] {
  const n = hours.length;
  return hours.map((_, i) => hours[(((i - offset) % n) + n) % n] ?? 0);
}

/** Largest value in a list, guarding against an empty array. */
export const peak = (values: number[]): number => (values.length ? Math.max(...values) : 0);

/** Index of the largest value. */
export const peakIndex = (values: number[]): number => values.indexOf(peak(values));

/** Human label for a receipt kind, used in filters and legends. */
export const KIND_LABEL: Record<string, string> = {
  discovery: "First encounter",
  obsession: "On repeat",
  vigil: "Night vigil",
  binge: "Lost day",
  return: "Return",
  purchase: "Purchase",
  place: "Journey",
  event: "Occasion",
  entertainment: "Watched",
  note: "Written note",
  ritual: "Recurring",
  investment: "Put away",
  income: "Received",
};

/** Token name per kind, so colour is assigned in one place only. */
export const KIND_COLOR: Record<string, string> = {
  discovery: "var(--color-azure)",
  obsession: "var(--color-rust)",
  vigil: "var(--color-ink-2)",
  binge: "var(--color-ochre)",
  return: "var(--color-moss)",
  purchase: "var(--color-ink)",
  place: "var(--color-moss)",
  event: "var(--color-rust)",
  entertainment: "var(--color-azure)",
  note: "var(--color-ink-2)",
  ritual: "var(--color-moss)",
  investment: "var(--color-azure)",
  income: "var(--color-ochre)",
};

/**
 * The nine receipt types the brief named, against what the data actually holds.
 *
 * Shown in the interface rather than quietly omitted: three of the nine have no
 * corresponding records in the supplied archives, and inventing them would have
 * meant fabricating a life rather than reading one.
 */
export const BRIEF_TAXONOMY: Array<{ brief: string; kinds: string[]; note: string }> = [
  { brief: "Music", kinds: ["discovery", "obsession", "vigil", "binge", "return"], note: "149,860 plays" },
  { brief: "Purchases", kinds: ["purchase", "ritual", "investment", "income"], note: "the household ledger" },
  { brief: "Places", kinds: ["place"], note: "journeys between anonymised places" },
  { brief: "Events", kinds: ["event"], note: "festivals and occasions" },
  { brief: "Movies & entertainment", kinds: ["entertainment"], note: "subscriptions and what was watched" },
  { brief: "Personal notes", kinds: ["note"], note: "the ledger's free-text field" },
  { brief: "Photos", kinds: [], note: "no records in the supplied data" },
  { brief: "Messages", kinds: [], note: "no records in the supplied data" },
  { brief: "Searches", kinds: [], note: "no records in the supplied data" },
];
