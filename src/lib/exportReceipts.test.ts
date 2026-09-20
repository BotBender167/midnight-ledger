import { describe, expect, test } from "vitest";
import { toCSV } from "./exportReceipts";
import type { Receipt } from "../types/archive";

function receipt(overrides: Partial<Receipt> = {}): Receipt {
  return {
    id: "r1",
    kind: "purchase",
    ts: "2017-03-04T02:11:00",
    title: "Idli medu vada",
    subtitle: "Food · snacks",
    detail: "Paid by Cash.",
    amount: 60,
    weight: 0.3,
    tags: ["money", "purchase", "Food"],
    source: "ledger",
    ...overrides,
  };
}

describe("toCSV", () => {
  test("emits a header row followed by one row per receipt", () => {
    const lines = toCSV([receipt(), receipt({ id: "r2" })]).split("\n");
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe("date,time,type,title,detail,amount_inr,archive,tags");
  });

  test("writes the human label rather than the internal kind", () => {
    expect(toCSV([receipt({ kind: "vigil" })])).toContain("Night vigil");
  });

  test("quotes a field containing a comma", () => {
    const csv = toCSV([receipt({ title: "Idli, vada and tea" })]);
    expect(csv).toContain('"Idli, vada and tea"');
  });

  test("doubles an embedded quote, per RFC 4180", () => {
    // Listening details are written with curly quotes, but a straight quote in
    // a ledger note would otherwise terminate the field early.
    const csv = toCSV([receipt({ title: 'A 12" record' })]);
    expect(csv).toContain('"A 12"" record"');
  });

  test("quotes a field containing a newline instead of breaking the row", () => {
    const csv = toCSV([receipt({ detail: "line one\nline two" })]);
    expect(csv).toContain('"line one\nline two"');
    // Header plus one record that happens to span two physical lines.
    expect(csv.split("\n")).toHaveLength(3);
  });

  test("leaves the amount column empty for a listening record", () => {
    const csv = toCSV([receipt({ kind: "vigil", amount: undefined, source: "listening" })]);
    const row = csv.split("\n")[1]!;
    expect(row).toContain(",,listening,");
  });

  test("joins tags with a pipe so the column survives a comma split", () => {
    expect(toCSV([receipt()])).toContain("money | purchase | Food");
  });

  test("returns just the header for an empty selection", () => {
    expect(toCSV([]).split("\n")).toHaveLength(1);
  });
});
