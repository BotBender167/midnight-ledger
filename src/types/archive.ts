/**
 * The domain model.
 *
 * Three very different sources — a streaming log, a household cashbook and a
 * national card feed — are flattened into one shape, `Receipt`, before the UI
 * sees any of them. Every view downstream (archive, constellation, timeline,
 * chapters) reads only this shape, which is why a fourth archive could be
 * added by writing one adapter and changing nothing else.
 */

/** Which of the three archives a record came from. */
export type Source = "listening" | "ledger";

/**
 * What kind of moment a receipt records.
 *
 * Listening moments are *derived*: a single play is not a moment, but a first
 * encounter, a track on repeat, a 4am vigil, a lost day or a return after
 * silence all are. Ledger moments map straight from the source rows.
 */
export type ReceiptKind =
  | "discovery"
  | "obsession"
  | "vigil"
  | "binge"
  | "return"
  | "purchase"
  | "ritual"
  | "investment"
  | "income";

export interface Receipt {
  id: string;
  kind: ReceiptKind;
  /** ISO-ish local timestamp, `YYYY-MM-DDTHH:mm:ss`. Listening records are UTC. */
  ts: string;
  title: string;
  subtitle?: string;
  detail?: string;
  /** INR. Positive is money out, negative is money in. Absent on listening records. */
  amount?: number;
  /** 0-1 significance, used for sizing and for trimming the payload. */
  weight: number;
  tags: string[];
  source: Source;
}

/** A detected era. Boundaries are computed; title and line are authored. */
export interface Chapter {
  index: number;
  start: string;
  end: string;
  years: string[];
  plays: number;
  hours: number;
  share: number;
  topArtist: string;
  topArtists: Array<{ name: string; count: number }>;
  nightShare: number;
  skipRate: number;
  peakHour: number;
  hours24: number[];
  title: string;
  line: string;
}

export interface YearStats {
  year: string;
  plays: number;
  hours: number;
  artists: number;
  topArtists: Array<{ name: string; count: number }>;
  topTracks: Array<{ name: string; count: number }>;
  nightShare: number;
  skipRate: number;
  hours24: number[];
}

export interface Overview {
  generatedAt: string;
  listening: {
    plays: number;
    hours: number;
    days: number;
    tracks: number;
    artists: number;
    albums: number;
    skipRate: number;
    nightShare: number;
    platforms: Record<string, number>;
    first: string;
    last: string;
  };
  spending: {
    entries: number;
    spent: number;
    earned: number;
    median: number;
    categories: Array<{ name: string; count: number; total: number }>;
    first: string;
    last: string;
  };
  ambient: {
    rows: number;
    usable: number;
    completeness: Completeness;
    span: { first: string; last: string };
  };
  years: YearStats[];
  ledgerYears: Array<{ year: string; entries: number; spend: number }>;
  chapters: Chapter[];
  convergence: Array<{
    year: string;
    plays: number;
    playsNorm: number;
    entries: number | null;
    entriesNorm: number | null;
    spend: number | null;
  }>;
  overlap: { start: string; end: string };
  hours24: number[];
  counts: { receipts: number; totalRecords: number };
}

/** One calendar day across both personal archives. */
export interface DayRecord {
  date: string;
  plays: number;
  minutes: number;
  spend: number;
  entries: number;
}

/**
 * Share of archive C rows carrying each field, as a percentage.
 *
 * Named rather than a `Record<string, number>` so the four fields the UI reads
 * are known to exist — the source is dirty enough that a silently-undefined
 * completeness figure would print "NaN% missing" on the page.
 */
export interface Completeness {
  category: number;
  city: number;
  merchant: number;
  state: number;
}

/** Aggregates for archive C — the crowd, never presented as the subject. */
export interface Ambient {
  rows: number;
  usable: number;
  completeness: Completeness;
  hours24: number[];
  categories: Array<{ name: string; count: number; avg: number }>;
  states: Array<{ name: string; count: number }>;
  merchants: Array<{ name: string; count: number }>;
  months: Array<{ month: string; count: number; total: number }>;
  medianAmount: number;
  span: { first: string; last: string };
}
