import { parseCSV, countBy, topN, round } from "./csv.mjs";

/**
 * Archive B — 2,461 household transactions, Jan 2015 - Sep 2018, in INR.
 *
 * Locations in the source are already anonymised to "Place 0".."Place 5",
 * which is why the whole site treats its subject as unidentified rather than
 * inventing a name for them.
 */

/** Categories that read as a recurring commitment rather than a one-off spend. */
const RITUAL_CATEGORIES = new Set(["subscription", "Festivals", "Life Insurance", "Rent"]);
/** Categories that are money moving into the future rather than being spent. */
const INVESTMENT_HINTS = ["fund", "deposit", "provident", "share", "equity", "investment"];

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

      const kind = isIncome
        ? "income"
        : isInvestment(row)
          ? "investment"
          : RITUAL_CATEGORIES.has(category)
            ? "ritual"
            : "purchase";

      return {
        id: `led-${i}`,
        kind,
        ts,
        title: note || subcategory || category,
        subtitle: subcategory ? `${category} · ${subcategory}` : category,
        detail: `${isIncome ? "Received" : "Paid"} by ${row.Mode}.`,
        amount: isIncome ? -amount : amount,
        weight: Math.min(1, amount / 20000),
        tags: ["money", kind, category, subcategory].filter(Boolean),
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
