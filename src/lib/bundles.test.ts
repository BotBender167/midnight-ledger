import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { createCorpus, findConnections } from "./connections";
import type { DayRecord, Overview, Receipt } from "../types/archive";

/**
 * Integration checks against the *real* generated bundles.
 *
 * `connections.test.ts` proves the engine's rules with fixtures. This file
 * proves the pipeline's output actually satisfies the invariants the UI
 * depends on — most importantly that receipts are genuinely ordered by time,
 * which `findConnections` binary-searches and would otherwise violate silently.
 *
 * The bundles are generated and git-ignored, so these are skipped rather than
 * failed on a clean clone. `npm run verify` builds them first.
 */
const DATA = path.resolve(__dirname, "../../public/data");
const built = fs.existsSync(path.join(DATA, "overview.json"));

const read = <T,>(name: string): T =>
  JSON.parse(fs.readFileSync(path.join(DATA, name), "utf8")) as T;

describe.skipIf(!built)("generated bundles", () => {
  const overview = read<Overview>("overview.json");
  const receipts = read<Receipt[]>("receipts.json");
  const days = read<DayRecord[]>("days.json");

  test("every year sits inside exactly one chapter", () => {
    const covered = overview.chapters.flatMap((c) => c.years);
    expect([...covered].sort()).toEqual(overview.years.map((y) => y.year).sort());
    expect(new Set(covered).size).toBe(covered.length);
  });

  test("chapter plays sum to the archive total", () => {
    const sum = overview.chapters.reduce((n, c) => n + c.plays, 0);
    expect(sum).toBe(overview.listening.plays);
  });

  test("no chapter swallows more than half the archive", () => {
    // The bug that motivated the drift band: 2020-2024 once held 56%.
    for (const chapter of overview.chapters) {
      expect(chapter.share, chapter.title).toBeLessThanOrEqual(50);
    }
  });

  test("every chapter reports a real peak hour", () => {
    for (const chapter of overview.chapters) {
      expect(chapter.hours24).toHaveLength(24);
      expect(chapter.peakHour).toBeGreaterThanOrEqual(0);
      expect(chapter.peakHour).toBeLessThan(24);
    }
  });

  test("the hour histogram sums to the play count", () => {
    expect(overview.hours24).toHaveLength(24);
    expect(overview.hours24.reduce((a, b) => a + b, 0)).toBe(overview.listening.plays);
  });

  test("receipts are emitted in timestamp order", () => {
    // findConnections binary-searches this ordering; out of order means wrong
    // answers with no error.
    for (let i = 1; i < receipts.length; i++) {
      expect(receipts[i - 1]!.ts <= receipts[i]!.ts).toBe(true);
    }
  });

  test("no receipt carries NaN, undefined or an empty title", () => {
    for (const r of receipts) {
      expect(r.id && r.kind && r.ts && r.title, r.id).toBeTruthy();
      expect(Number.isFinite(r.weight), r.id).toBe(true);
      if (r.amount !== undefined) expect(Number.isFinite(r.amount), r.id).toBe(true);
    }
  });

  test("both personal archives are present", () => {
    const sources = new Set(receipts.map((r) => r.source));
    expect(sources.has("listening")).toBe(true);
    expect(sources.has("ledger")).toBe(true);
  });

  test("the overlap window contains records from both archives", () => {
    const { start, end } = overview.overlap;
    const inside = receipts.filter((r) => r.ts.slice(0, 10) >= start && r.ts.slice(0, 10) <= end);
    expect(inside.some((r) => r.source === "listening")).toBe(true);
    expect(inside.some((r) => r.source === "ledger")).toBe(true);
  });

  test("the day ribbon has no duplicate dates", () => {
    expect(new Set(days.map((d) => d.date)).size).toBe(days.length);
  });

  describe("connection engine over the real corpus", () => {
    const corpus = createCorpus(receipts);

    test("no link falls outside the requested window", () => {
      for (const anchor of corpus.slice(500, 700)) {
        for (const link of findConnections(anchor, corpus, { windowDays: 3 })) {
          expect(Math.abs(link.dayOffset)).toBeLessThanOrEqual(3);
        }
      }
    });

    test("links come back strongest first and stay within 0 to 1", () => {
      for (const anchor of corpus.slice(1000, 1150)) {
        const scores = findConnections(anchor, corpus).map((l) => l.score);
        expect(scores).toEqual([...scores].sort((a, b) => b - a));
        for (const score of scores) {
          expect(score).toBeGreaterThanOrEqual(0);
          expect(score).toBeLessThanOrEqual(1);
        }
      }
    });

    test("cross-archive flags match the underlying sources", () => {
      for (const anchor of corpus.slice(0, 300)) {
        for (const link of findConnections(anchor, corpus)) {
          expect(link.crossesArchives).toBe(link.receipt.source !== anchor.source);
        }
      }
    });

    test("the binary search never returns more than a full scan would", () => {
      const windowMs = 3 * 86_400_000;
      for (const anchor of corpus.slice(1500, 1540)) {
        const anchorTime = Date.parse(anchor.ts);
        const candidates = corpus.filter(
          (c) => c.id !== anchor.id && Math.abs(Date.parse(c.ts) - anchorTime) <= windowMs,
        ).length;
        const found = findConnections(anchor, corpus, { windowDays: 3, limit: 100_000 }).length;
        expect(found).toBeLessThanOrEqual(candidates);
      }
    });
  });
});
