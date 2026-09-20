import { parseCSV, countBy, topN, round } from "./csv.mjs";

/**
 * Archive C — ~10,000 card transactions across India, 2023-2024.
 *
 * Unlike archives A and B this one is demonstrably *many* people: it carries
 * 10k distinct cardholder names, cities and coordinates. The site therefore
 * never presents it as the subject. It is the crowd the subject is measured
 * against — the ambient economy running while archive A listens alone.
 *
 * The source is also genuinely dirty (blank cities, blank categories, blank
 * merchants, coordinates outside India). Everything here is defensive, and the
 * completeness figures are surfaced in the UI rather than hidden.
 */

/** Source rows use `M/d/yyyy H:mm`. @returns {string|null} ISO timestamp */
function toISO(raw) {
  if (!raw) return null;
  const [datePart, timePart = "00:00"] = raw.trim().split(/\s+/);
  const [m, d, y] = datePart.split("/");
  if (!d || !m || !y) return null;
  const pad = (v) => String(v).padStart(2, "0");
  return `${y}-${pad(m)}-${pad(d)}T${timePart.length === 4 ? "0" + timePart : timePart}:00`;
}

/** Merchant names arrive prefixed `fraud_` regardless of the fraud flag. */
const cleanMerchant = (name) => (name || "").replace(/^fraud_/, "").trim();

/**
 * Reduce the crowd archive to aggregates only.
 *
 * Individual rows are deliberately *not* shipped to the client: they are other
 * people's transactions, they would triple the payload, and the narrative only
 * needs the shape of the crowd.
 */
export function summarizeAmbient(csvText) {
  const rows = parseCSV(csvText);

  const dated = rows
    .map((r) => ({
      ts: toISO(r.trans_date_trans_time),
      amount: Number(r.amt) || 0,
      category: (r.category || "").trim(),
      merchant: cleanMerchant(r.merchant),
      state: (r.state || "").trim(),
      city: (r.city || "").trim(),
      hour: Number((r.trans_date_trans_time || "").split(/\s+/)[1]?.split(":")[0]),
    }))
    .filter((r) => r.ts);

  const hours = new Array(24).fill(0);
  for (const r of dated) if (Number.isInteger(r.hour) && r.hour >= 0 && r.hour < 24) hours[r.hour]++;

  const byMonth = {};
  for (const r of dated) {
    const key = r.ts.slice(0, 7);
    const bucket = (byMonth[key] ||= { month: key, count: 0, total: 0 });
    bucket.count++;
    bucket.total += r.amount;
  }

  return {
    rows: rows.length,
    usable: dated.length,
    // Completeness is part of the story: the crowd is recorded worse than the subject.
    completeness: {
      category: round((dated.filter((r) => r.category).length / dated.length) * 100, 1),
      city: round((dated.filter((r) => r.city).length / dated.length) * 100, 1),
      merchant: round((dated.filter((r) => r.merchant).length / dated.length) * 100, 1),
      state: round((dated.filter((r) => r.state).length / dated.length) * 100, 1),
    },
    hours24: hours,
    categories: topN(countBy(dated, (r) => r.category), 10).map(([name, count]) => ({
      name,
      count,
      avg: round(
        dated.filter((r) => r.category === name).reduce((s, r) => s + r.amount, 0) /
          Math.max(1, count),
      ),
    })),
    states: topN(countBy(dated, (r) => r.state), 12).map(([name, count]) => ({ name, count })),
    merchants: topN(countBy(dated, (r) => r.merchant), 8).map(([name, count]) => ({ name, count })),
    months: Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month)),
    medianAmount: (() => {
      const sorted = dated.map((r) => r.amount).sort((a, b) => a - b);
      return round(sorted[Math.floor(sorted.length / 2)] || 0);
    })(),
    span: {
      first: dated.reduce((a, r) => (r.ts < a ? r.ts : a), dated[0].ts),
      last: dated.reduce((a, r) => (r.ts > a ? r.ts : a), dated[0].ts),
    },
  };
}
