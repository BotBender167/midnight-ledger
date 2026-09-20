import type { Receipt } from "../types/archive";
import { KIND_LABEL, longDate } from "./format";

/**
 * Let the reader take the evidence with them.
 *
 * The site makes arguments from these rows, so a reader who disagrees should
 * be able to check the working in their own spreadsheet rather than take the
 * page's word for it. Export reflects the *current* filter, not the whole
 * archive — what you see is what you get.
 */

/** Escape a field for RFC-4180 CSV. */
function escape(value: string | number | undefined): string {
  if (value === undefined || value === null) return "";
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const COLUMNS = [
  "date",
  "time",
  "type",
  "title",
  "detail",
  "amount_inr",
  "archive",
  "tags",
] as const;

export function toCSV(receipts: readonly Receipt[]): string {
  const rows = receipts.map((r) =>
    [
      longDate(r.ts),
      r.ts.slice(11, 16),
      KIND_LABEL[r.kind] ?? r.kind,
      r.title,
      r.detail ?? r.subtitle ?? "",
      r.amount ?? "",
      r.source,
      r.tags.join(" | "),
    ]
      .map(escape)
      .join(","),
  );
  return [COLUMNS.join(","), ...rows].join("\n");
}

/**
 * Hand the file to the browser.
 *
 * Uses an object URL rather than a data URI because a 3,704-row export exceeds
 * the data-URI length limit in several browsers. The URL is revoked on the
 * next tick so the download is not cancelled before it starts.
 */
export function downloadCSV(receipts: readonly Receipt[], filename: string): void {
  const blob = new Blob([toCSV(receipts)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 0);
}
