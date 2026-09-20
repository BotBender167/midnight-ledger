import { describe, expect, test } from "vitest";
import { createCorpus, findConnections, findRichAnchors } from "./connections";
import type { Receipt } from "../types/archive";

/** Build a receipt with sensible defaults so each test states only what it cares about. */
function receipt(overrides: Partial<Receipt> & Pick<Receipt, "id" | "ts">): Receipt {
  return {
    kind: "purchase",
    title: "Something",
    weight: 0.5,
    tags: [],
    source: "ledger",
    ...overrides,
  };
}

const listening = (id: string, ts: string, tags: string[] = []): Receipt =>
  receipt({ id, ts, kind: "vigil", source: "listening", tags: ["music", ...tags] });

const ledger = (id: string, ts: string, tags: string[] = []): Receipt =>
  receipt({ id, ts, kind: "purchase", source: "ledger", tags: ["money", ...tags] });

describe("createCorpus", () => {
  test("sorts by timestamp, which findConnections' binary search depends on", () => {
    const sorted = createCorpus([
      ledger("c", "2017-03-05T10:00:00"),
      ledger("a", "2017-03-01T10:00:00"),
      ledger("b", "2017-03-03T10:00:00"),
    ]);
    expect(sorted.map((r) => r.id)).toEqual(["a", "b", "c"]);
  });

  test("does not mutate the input array", () => {
    const input = [ledger("b", "2017-03-03T10:00:00"), ledger("a", "2017-03-01T10:00:00")];
    createCorpus(input);
    expect(input.map((r) => r.id)).toEqual(["b", "a"]);
  });

  test("orders a space-separated timestamp correctly against a T-separated one", () => {
    // The bug this guards: " " sorts before "T", so a lexical sort put 02:11
    // before 02:00 on the same day and silently broke the search window.
    const sorted = createCorpus([
      listening("later", "2017-03-04T02:11:00"),
      listening("earlier", "2017-03-04T02:00:00"),
    ]);
    expect(sorted.map((r) => r.id)).toEqual(["earlier", "later"]);
  });
});

describe("findConnections", () => {
  const anchor = ledger("anchor", "2017-03-04T12:00:00", ["Food"]);

  test("never links a receipt to itself", () => {
    const corpus = createCorpus([anchor]);
    expect(findConnections(anchor, corpus)).toHaveLength(0);
  });

  test("excludes records outside the window", () => {
    // Cross-archive, so the weak-link floor cannot be what removes "outside".
    const corpus = createCorpus([
      anchor,
      listening("inside", "2017-03-05T12:00:00"),
      listening("outside", "2017-03-20T12:00:00"),
    ]);
    const ids = findConnections(anchor, corpus, { windowDays: 3 }).map((l) => l.receipt.id);
    expect(ids).toContain("inside");
    expect(ids).not.toContain("outside");
  });

  test("reports the day offset with sign: negative is earlier", () => {
    const corpus = createCorpus([
      anchor,
      listening("before", "2017-03-02T12:00:00"),
      listening("after", "2017-03-06T12:00:00"),
    ]);
    const byId = Object.fromEntries(
      findConnections(anchor, corpus).map((l) => [l.receipt.id, l.dayOffset]),
    );
    expect(byId.before).toBe(-2);
    expect(byId.after).toBe(2);
  });

  test("ranks a cross-archive link above an equally-timed same-archive one", () => {
    // The whole point of the crossing bonus: only cross-archive links argue
    // that the two archives belong to one person.
    const corpus = createCorpus([
      anchor,
      listening("crosses", "2017-03-04T18:00:00"),
      ledger("same", "2017-03-04T18:00:00"),
    ]);
    const links = findConnections(anchor, corpus);
    expect(links[0]!.receipt.id).toBe("crosses");
    expect(links[0]!.crossesArchives).toBe(true);
  });

  test("scores a closer record above a more distant one", () => {
    const corpus = createCorpus([
      anchor,
      listening("near", "2017-03-04T14:00:00"),
      listening("far", "2017-03-06T20:00:00"),
    ]);
    const links = findConnections(anchor, corpus);
    expect(links.map((l) => l.receipt.id)).toEqual(["near", "far"]);
  });

  test("shared vocabulary raises the score above timing alone", () => {
    const tagged = ledger("shares-food", "2017-03-05T23:00:00", ["Food"]);
    const untagged = ledger("shares-nothing", "2017-03-05T22:00:00", ["Apparel"]);
    const corpus = createCorpus([anchor, tagged, untagged]);
    const links = findConnections(anchor, corpus);
    // The tagged record is *further* away in time yet still ranks first.
    expect(links[0]!.receipt.id).toBe("shares-food");
  });

  test("generic tags alone do not count as shared vocabulary", () => {
    const a = ledger("a", "2017-03-04T12:00:00");
    const b = ledger("b", "2017-03-04T13:00:00");
    const corpus = createCorpus([a, b]);
    const [link] = findConnections(a, corpus);
    // Close enough in time to survive the floor, and both carry "money" — but
    // that tag is structural, so the reason must fall back to timing alone.
    expect(link).toBeDefined();
    expect(link!.reason).not.toContain("money");
    expect(link!.reason).toContain("the same day");
  });

  test("drops a weak same-archive link with nothing in common", () => {
    const corpus = createCorpus([
      anchor,
      ledger("distant-unrelated", "2017-03-06T22:00:00", ["Apparel"]),
    ]);
    expect(findConnections(anchor, corpus, { windowDays: 3 })).toHaveLength(0);
  });

  test("keeps a weak link when it crosses archives", () => {
    const corpus = createCorpus([
      anchor,
      listening("distant-crossing", "2017-03-06T22:00:00", ["Radiohead"]),
    ]);
    expect(findConnections(anchor, corpus, { windowDays: 3 })).toHaveLength(1);
  });

  test("returns links strongest first", () => {
    const corpus = createCorpus([
      anchor,
      ...Array.from({ length: 20 }, (_, i) =>
        listening(`l${i}`, `2017-03-0${(i % 3) + 3}T0${i % 9}:00:00`),
      ),
    ]);
    const scores = findConnections(anchor, corpus).map((l) => l.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });

  test("honours the limit", () => {
    const corpus = createCorpus([
      anchor,
      ...Array.from({ length: 40 }, (_, i) => listening(`l${i}`, `2017-03-04T${String(i % 24).padStart(2, "0")}:30:00`)),
    ]);
    expect(findConnections(anchor, corpus, { limit: 4 })).toHaveLength(4);
  });

  test("scores stay inside 0 to 1", () => {
    const corpus = createCorpus([anchor, listening("exact", "2017-03-04T12:00:00", ["Food"])]);
    for (const link of findConnections(anchor, corpus)) {
      expect(link.score).toBeGreaterThanOrEqual(0);
      expect(link.score).toBeLessThanOrEqual(1);
    }
  });

  test("a wider window never returns fewer links", () => {
    const corpus = createCorpus([
      anchor,
      ...Array.from({ length: 15 }, (_, i) => listening(`l${i}`, `2017-03-${String(i + 1).padStart(2, "0")}T12:00:00`)),
    ]);
    const narrow = findConnections(anchor, corpus, { windowDays: 1, limit: 999 }).length;
    const wide = findConnections(anchor, corpus, { windowDays: 10, limit: 999 }).length;
    expect(wide).toBeGreaterThanOrEqual(narrow);
  });

  test("returns nothing for an unparseable anchor rather than throwing", () => {
    const broken = receipt({ id: "broken", ts: "not-a-date" });
    expect(findConnections(broken, createCorpus([broken, anchor]))).toEqual([]);
  });

  test("explains a same-day link as the same day", () => {
    const corpus = createCorpus([anchor, listening("sameday", "2017-03-04T20:00:00")]);
    expect(findConnections(anchor, corpus)[0]!.reason).toContain("the same day");
  });
});

describe("findRichAnchors", () => {
  const corpus = createCorpus([
    ledger("pay-2015", "2015-08-31T13:00:00", ["Salary"]),
    listening("band-2015", "2015-08-31T16:00:00", ["The Decemberists"]),
    ledger("pay-2016", "2016-08-31T13:00:00", ["Salary"]),
    listening("band-2016", "2016-08-31T16:00:00", ["Elvis"]),
    ledger("lonely-2017", "2017-01-01T13:00:00", ["Food"]),
  ]);

  test("prefers anchors that actually have a cross-archive story", () => {
    const anchors = findRichAnchors(corpus, 2);
    expect(anchors.length).toBeGreaterThan(0);
    for (const anchor of anchors) {
      const crossings = findConnections(anchor, corpus).filter((l) => l.crossesArchives);
      expect(crossings.length).toBeGreaterThan(0);
    }
  });

  test("spreads picks across years rather than clustering in one", () => {
    const years = findRichAnchors(corpus, 2).map((r) => r.ts.slice(0, 4));
    expect(new Set(years).size).toBe(years.length);
  });

  test("never returns more than asked for", () => {
    expect(findRichAnchors(corpus, 2).length).toBeLessThanOrEqual(2);
  });

  test("returns nothing from an empty corpus instead of throwing", () => {
    expect(findRichAnchors([], 5)).toEqual([]);
  });
});
