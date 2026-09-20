/**
 * Build step: three raw archives in, four small JSON bundles out.
 *
 *   scripts/*.csv  ──▶  public/data/{overview,receipts,days,ambient}.json
 *
 * Runs before `vite build`. The browser never parses 24 MB of CSV; it loads
 * pre-aggregated bundles, which is what keeps the first paint cheap.
 *
 * Usage: npm run data
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { round } from "./lib/csv.mjs";
import * as spotify from "./lib/spotify.mjs";
import * as ledger from "./lib/ledger.mjs";
import { summarizeAmbient } from "./lib/ambient.mjs";
import { detectChapters } from "./lib/eras.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, "..", "public", "data");

/** Hard ceiling on shipped receipts. Beyond this the payload stops being worth it. */
const MAX_RECEIPTS = 5200;

const read = (file) => fs.readFileSync(path.join(HERE, file), "utf8");

function write(name, data) {
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, name);
  fs.writeFileSync(file, JSON.stringify(data));
  const kb = (fs.statSync(file).size / 1024).toFixed(0);
  console.log(`  ${name.padEnd(16)} ${kb.padStart(6)} KB`);
}

console.log("\nReading archives…");

// ── Archive A: listening ───────────────────────────────────────────────────
const plays = spotify.readPlays(read("spotify_history.csv"));
const listening = spotify.summarize(plays);
const years = spotify.byYear(plays);
const chapters = detectChapters(years);
const musicMoments = spotify.extractMoments(plays);
const musicDays = spotify.byDay(plays);
console.log(`  archive A  ${plays.length.toLocaleString()} plays → ${musicMoments.length.toLocaleString()} moments`);

// ── Archive B: household ledger ────────────────────────────────────────────
const ledgerReceipts = ledger.readLedger(read("Daily Household Transactions.csv"));
const spending = ledger.summarizeLedger(ledgerReceipts);
const ledgerYears = ledger.ledgerByYear(ledgerReceipts);
const ledgerDays = ledger.ledgerByDay(ledgerReceipts);
console.log(`  archive B  ${ledgerReceipts.length.toLocaleString()} entries`);

// ── Archive C: the crowd (aggregates only) ─────────────────────────────────
const ambient = summarizeAmbient(read("Augmented_IndiaTransactMultiFacet2024.csv"));
console.log(`  archive C  ${ambient.rows.toLocaleString()} rows → aggregates only`);

// ── Merge into one receipt stream ──────────────────────────────────────────
// Both archives are kept whole where possible; if the music moments overflow
// the budget the lightest ones are dropped first, never the ledger.
const budget = MAX_RECEIPTS - ledgerReceipts.length;
const keptMusic =
  musicMoments.length <= budget
    ? musicMoments
    : [...musicMoments].sort((a, b) => b.weight - a.weight).slice(0, budget);

const receipts = [...keptMusic, ...ledgerReceipts]
  .sort((a, b) => a.ts.localeCompare(b.ts))
  .map((r) => ({ ...r, weight: round(r.weight, 3) }));

// ── The overlap window: where the two archives can actually be compared ────
const overlap = {
  start: [listening.first, spending.first].sort().pop().slice(0, 10),
  end: [listening.last, spending.last].sort().shift().slice(0, 10),
};

// ── Day-level ribbon: listening and spending on one axis ───────────────────
const dayIndex = new Map();
for (const d of musicDays) dayIndex.set(d.date, { date: d.date, plays: d.plays, minutes: d.minutes, spend: 0, entries: 0 });
for (const d of ledgerDays) {
  const existing = dayIndex.get(d.date) ?? { date: d.date, plays: 0, minutes: 0, spend: 0, entries: 0 };
  existing.spend = d.spend;
  existing.entries = d.entries;
  dayIndex.set(d.date, existing);
}
const days = [...dayIndex.values()].sort((a, b) => a.date.localeCompare(b.date));

// ── Convergence: normalised year curves for both archives ──────────────────
const maxPlays = Math.max(...years.map((y) => y.plays));
const maxEntries = Math.max(...ledgerYears.map((y) => y.entries));
const convergence = years.map((y) => {
  const led = ledgerYears.find((l) => l.year === y.year);
  return {
    year: y.year,
    plays: y.plays,
    playsNorm: round(y.plays / maxPlays, 4),
    entries: led?.entries ?? null,
    entriesNorm: led ? round(led.entries / maxEntries, 4) : null,
    spend: led?.spend ?? null,
  };
});

write("overview.json", {
  generatedAt: new Date().toISOString(),
  listening,
  spending,
  ambient: { rows: ambient.rows, usable: ambient.usable, completeness: ambient.completeness, span: ambient.span },
  years,
  ledgerYears,
  chapters,
  convergence,
  overlap,
  hours24: spotify.hourHistogram(plays),
  counts: {
    receipts: receipts.length,
    totalRecords: plays.length + ledgerReceipts.length + ambient.rows,
  },
});

write("receipts.json", receipts);
write("days.json", days);
write("ambient.json", ambient);

console.log(`\nDone. ${receipts.length.toLocaleString()} receipts, ${chapters.length} chapters.\n`);
console.log("Chapters detected:");
for (const c of chapters) {
  console.log(`  ${String(c.start).padEnd(4)}-${c.end}  ${c.title.padEnd(18)} ${String(c.plays).padStart(6)} plays  peak ${String(c.peakHour).padStart(2)}:00 UTC  top: ${c.topArtist}`);
}
console.log();
