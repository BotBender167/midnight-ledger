import { parseCSV, countBy, topN, round } from "./csv.mjs";

/**
 * Archive B — 2,461 household transactions, Jan 2015 - Sep 2018, in INR.
 *
 * Locations in the source are already anonymised to "Place 0".."Place 5",
 * which is why the whole site treats its subject as unidentified rather than
 * inventing a name for them.
 */

/**
 * Receipt-type classification.
 *
 * The brief names nine kinds of digital receipt. The supplied data contains no
 * photos, messages or searches, but it does contain four more than a naive
 * read suggests — journeys, events, entertainment and written notes are all
 * really in the ledger, and are extracted rather than invented:
 *
 *   place         Transportation and Tourism rows name an origin and a
 *                 destination in their note ("2 Place 5 to Place 0")
 *   event         Festivals, Social Life and Culture are dated occasions
 *   entertainment Netflix, Tata Play and similar name what was watched
 *   note          rows whose free-text note is a sentence, not a label
 */

/** Categories that read as a recurring commitment rather than a one-off spend. */
const RITUAL_CATEGORIES = new Set(["Life Insurance", "Rent"]);
/** Categories describing a journey between two places. */
const PLACE_CATEGORIES = new Set(["Transportation", "Tourism"]);
/** Categories describing a dated occasion. */
const EVENT_CATEGORIES = new Set(["Festivals", "Social Life", "Culture"]);
/** Subscriptions that are entertainment rather than utility. */
const ENTERTAINMENT_HINTS = ["netflix", "tata sky", "tata play", "prime", "hotstar", "spotify"];
/** Categories that are money moving into the future rather than being spent. */
const INVESTMENT_HINTS = ["fund", "deposit", "provident", "share", "equity", "investment"];

/** A note this long reads as a sentence the person wrote, not a field label. */
const NOTE_MIN_LENGTH = 24;

/**
 * Pull the endpoints out of a journey note.
 *
 * Source notes look like "2 Place 5 to Place 0" or
 * "Place 2 station to Permanent Residence". Locations were anonymised before
 * the data reached us, which is precisely why the site never names its subject.
 *
 * @returns {{from: string, to: string}|null}
 */
function parseJourney(note) {
  const match = /(.+?)\s+to\s+(.+)/i.exec(note.replace(/^\d+\s+/, "").trim());
  if (!match) return null;

  const from = match[1].trim();
  const to = match[2].trim();
  if (from.length < 2 || to.length < 2) return null;

  // "to and fro" is an idiom, not a destination. Without this guard a return
  // trip parses as a journey to a place called "and fro".
  if (/^(and|amp|fro)\b/i.test(to)) return null;

  return { from, to };
}

/**
 * Source dates arrive as `d/M/yyyy` with an optional `HH:mm:ss`, with
 * inconsistent zero-padding. Normalised to ISO so every archive sorts together.
 *
 * @returns {string|null} ISO timestamp, or null if unparseable
 */
function toISO(raw) {
  if (!raw) return null;
  const [datePart, timePart] = raw.trim().split(/\s+/);
  const [d, m, y] = datePart.split("/");
  if (!d || !m || !y) return null;
  const pad = (v) => String(v).padStart(2, "0");
  return `${y}-${pad(m)}-${pad(d)}T${timePart || "00:00:00"}`;
}

const isInvestment = (row) => {
  const haystack = `${row.Category} ${row.Subcategory} ${row.Mode}`.toLowerCase();
  return INVESTMENT_HINTS.some((hint) => haystack.includes(hint));
};

/** Parse and normalise the household ledger into receipt records. */
export function readLedger(csvText) {
  return parseCSV(csvText)
    .map((row, i) => {
      const ts = toISO(row.Date);
      if (!ts) return null;

      const amount = Number(row.Amount) || 0;
      const isIncome = row["Income/Expense"] === "Income";
      const category = row.Category || "Uncategorised";
      const subcategory = row.Subcategory || "";
      const note = (row.Note || "").trim();

      const haystack = `${category} ${subcategory}`.toLowerCase();
      const journey = PLACE_CATEGORIES.has(category) ? parseJourney(note) : null;
      const isEntertainment = ENTERTAINMENT_HINTS.some((hint) => haystack.includes(hint));

      const kind = isIncome
        ? "income"
        : isInvestment(row)
          ? "investment"
          : journey
            ? "place"
            : EVENT_CATEGORIES.has(category)
              ? "event"
              : isEntertainment
                ? "entertainment"
                : RITUAL_CATEGORIES.has(category) || category === "subscription"
                  ? "ritual"
                  : note.length >= NOTE_MIN_LENGTH
                    ? "note"
                    : "purchase";

      const title = journey ? `${journey.from} → ${journey.to}` : note || subcategory || category;

      return {
        id: `led-${i}`,
        kind,
        ts,
        title,
        subtitle: subcategory ? `${category} · ${subcategory}` : category,
        detail: journey
          ? `${subcategory || "Journey"} from ${journey.from} to ${journey.to}. ${isIncome ? "Received" : "Paid"} by ${row.Mode}.`
          : `${isIncome ? "Received" : "Paid"} by ${row.Mode}.${note && title !== note ? ` “${note}”` : ""}`,
        amount: isIncome ? -amount : amount,
        weight: Math.min(1, amount / 20000),
        tags: [
          "money",
          kind,
          category,
          subcategory,
          journey?.from,
          journey?.to,
        ].filter(Boolean),
        source: "ledger",
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.ts.localeCompare(b.ts));
}

/** Headline totals for the ledger archive. */
export function summarizeLedger(receipts) {
  const spent = receipts.filter((r) => r.amount > 0);
  const earned = receipts.filter((r) => r.amount < 0);
  return {
    entries: receipts.length,
    spent: round(spent.reduce((s, r) => s + r.amount, 0)),
    earned: round(-earned.reduce((s, r) => s + r.amount, 0)),
    median: (() => {
      const sorted = spent.map((r) => r.amount).sort((a, b) => a - b);
      return sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
    })(),
    categories: topN(countBy(receipts, (r) => r.tags[2]), 12).map(([name, count]) => ({
      name,
      count,
      total: round(
        receipts
          .filter((r) => r.tags[2] === name && r.amount > 0)
          .reduce((s, r) => s + r.amount, 0),
      ),
    })),
    first: receipts[0]?.ts,
    last: receipts[receipts.length - 1]?.ts,
  };
}

/** Spend per calendar day — aligned with the listening ribbon. */
export function ledgerByDay(receipts) {
  const days = {};
  for (const r of receipts) {
    const date = r.ts.slice(0, 10);
    const d = (days[date] ||= { date, entries: 0, spend: 0 });
    d.entries++;
    if (r.amount > 0) d.spend += r.amount;
  }
  return Object.values(days)
    .map((d) => ({ ...d, spend: round(d.spend) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Per-year rollup for the convergence chart. */
export function ledgerByYear(receipts) {
  const years = {};
  for (const r of receipts) {
    const y = r.ts.slice(0, 4);
    const bucket = (years[y] ||= { year: y, entries: 0, spend: 0 });
    bucket.entries++;
    if (r.amount > 0) bucket.spend += r.amount;
  }
  return Object.values(years)
    .map((y) => ({ ...y, spend: round(y.spend) }))
    .sort((a, b) => a.year.localeCompare(b.year));
}
