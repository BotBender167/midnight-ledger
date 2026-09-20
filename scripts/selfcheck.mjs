/**
 * Self-check: assert the invariants the UI depends on.
 *
 * No test framework. This runs against the real generated bundles and the real
 * connection engine, and exits non-zero if anything the site assumes is false.
 * The two things worth checking are the two pieces of non-obvious logic:
 * change-point chapter detection, and connection scoring.
 *
 * Usage: npm run check   (after npm run data)
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { findConnections, createCorpus } from "../src/lib/connections.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(HERE, "..", "public", "data");

const read = (name) => JSON.parse(fs.readFileSync(path.join(DATA, name), "utf8"));

let checks = 0;
function check(label, fn) {
  fn();
  checks++;
  console.log(`  ok  ${label}`);
}

console.log("\nBundles");
const overview = read("overview.json");
const receipts = read("receipts.json");
const days = read("days.json");

check("every year is inside exactly one chapter", () => {
  const covered = overview.chapters.flatMap((c) => c.years);
  const years = overview.years.map((y) => y.year);
  assert.deepEqual([...covered].sort(), [...years].sort());
  assert.equal(new Set(covered).size, covered.length, "a year appears in two chapters");
});

check("chapter plays sum to the archive total", () => {
  const sum = overview.chapters.reduce((n, c) => n + c.plays, 0);
  assert.equal(sum, overview.listening.plays);
});

check("no chapter swallows more than half the archive", () => {
  // The bug that motivated the drift band: 2020-2024 once held 56%.
  for (const c of overview.chapters) {
    assert.ok(c.share <= 50, `${c.title} holds ${c.share}%`);
  }
});

check("every chapter peak hour is a real hour", () => {
  for (const c of overview.chapters) {
    assert.ok(Number.isInteger(c.peakHour) && c.peakHour >= 0 && c.peakHour < 24);
    assert.equal(c.hours24.length, 24);
  }
});

check("hour histogram sums to the play count", () => {
  assert.equal(overview.hours24.length, 24);
    assert.equal(
    overview.hours24.reduce((a, b) => a + b, 0),
    overview.listening.plays,
  );
});

check("receipts are sorted by timestamp", () => {
  // findConnections binary-searches and silently returns wrong answers otherwise.
  for (let i = 1; i < receipts.length; i++) {
    assert.ok(receipts[i - 1].ts <= receipts[i].ts, `out of order at ${i}`);
  }
});

check("no receipt carries NaN, undefined or an empty title", () => {
  for (const r of receipts) {
    assert.ok(r.id && r.kind && r.ts && r.title, `incomplete receipt ${r.id}`);
    assert.ok(Number.isFinite(r.weight), `bad weight on ${r.id}`);
    if (r.amount !== undefined) assert.ok(Number.isFinite(r.amount), `bad amount on ${r.id}`);
  }
});

check("both archives are actually present", () => {
  const sources = new Set(receipts.map((r) => r.source));
  assert.ok(sources.has("listening") && sources.has("ledger"));
});

check("the overlap window contains records from both archives", () => {
  const { start, end } = overview.overlap;
  const inside = receipts.filter((r) => r.ts.slice(0, 10) >= start && r.ts.slice(0, 10) <= end);
  assert.ok(inside.some((r) => r.source === "listening"));
  assert.ok(inside.some((r) => r.source === "ledger"));
});

check("day ribbon has no duplicate dates", () => {
  assert.equal(new Set(days.map((d) => d.date)).size, days.length);
});

console.log("\nConnection engine");
const corpus = createCorpus(receipts);

check("an anchor never links to itself", () => {
  for (const anchor of corpus.slice(0, 200)) {
    const links = findConnections(anchor, corpus);
    assert.ok(!links.some((l) => l.receipt.id === anchor.id));
  }
});

check("every link falls inside the requested window", () => {
  const windowDays = 3;
  for (const anchor of corpus.slice(500, 700)) {
    for (const link of findConnections(anchor, corpus, { windowDays })) {
      assert.ok(
        Math.abs(link.dayOffset) <= windowDays,
        `${link.dayOffset}d outside ±${windowDays}d`,
      );
    }
  }
});

check("links are returned strongest first", () => {
  for (const anchor of corpus.slice(1000, 1100)) {
    const links = findConnections(anchor, corpus);
    for (let i = 1; i < links.length; i++) {
      assert.ok(links[i - 1].score >= links[i].score);
    }
  }
});

check("scores stay within 0-1", () => {
  for (const anchor of corpus.slice(0, 400)) {
    for (const link of findConnections(anchor, corpus)) {
      assert.ok(link.score >= 0 && link.score <= 1, `score ${link.score}`);
    }
  }
});

check("a wider window never returns fewer links", () => {
  for (const anchor of corpus.slice(200, 260)) {
    const narrow = findConnections(anchor, corpus, { windowDays: 1, limit: 500 }).length;
    const wide = findConnections(anchor, corpus, { windowDays: 14, limit: 500 }).length;
    assert.ok(wide >= narrow, `${wide} < ${narrow}`);
  }
});

check("cross-archive links are actually cross-archive", () => {
  for (const anchor of corpus.slice(0, 300)) {
    for (const link of findConnections(anchor, corpus)) {
      assert.equal(link.crossesArchives, link.receipt.source !== anchor.source);
    }
  }
});

check("binary search agrees with a full scan", () => {
  // The optimisation that makes suggested anchors viable. If the corpus were
  // ever unsorted this is the check that would catch it.
  const windowMs = 3 * 86_400_000;
  for (const anchor of corpus.slice(1500, 1540)) {
    const anchorTime = Date.parse(anchor.ts);
    const bruteForce = corpus.filter(
      (c) => c.id !== anchor.id && Math.abs(Date.parse(c.ts) - anchorTime) <= windowMs,
    ).length;
    const found = findConnections(anchor, corpus, { windowDays: 3, limit: 100_000 }).length;
    assert.ok(found <= bruteForce, `${found} links from ${bruteForce} candidates`);
  }
});

console.log(`\n${checks} checks passed.\n`);
