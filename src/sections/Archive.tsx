import { useDeferredValue, useMemo, useState } from "react";
import { ReceiptSlip } from "../components/ReceiptSlip";
import { Reveal } from "../components/Reveal";
import { ARCHIVE_PAGE_SIZE as PAGE } from "../constants/ui";
import { useUrlState } from "../hooks/useUrlState";
import { downloadCSV } from "../lib/exportReceipts";
import type { Receipt, ReceiptKind } from "../types/archive";
import { BRIEF_TAXONOMY, KIND_LABEL, num } from "../lib/format";

/** Filter groups, arranged by which archive the records came from. */
const KIND_GROUPS: Array<{ label: string; kinds: ReceiptKind[] }> = [
  { label: "Listening", kinds: ["discovery", "obsession", "vigil", "binge", "return"] },
  { label: "Living", kinds: ["place", "event", "entertainment", "note"] },
  { label: "Money", kinds: ["purchase", "ritual", "investment", "income"] },
];

type SortKey = "date-desc" | "date-asc" | "amount-desc" | "weight-desc";

const SORTS: Array<{ key: SortKey; label: string }> = [
  { key: "date-asc", label: "Oldest" },
  { key: "date-desc", label: "Newest" },
  { key: "amount-desc", label: "Largest ₹" },
  { key: "weight-desc", label: "Most significant" },
];

const COMPARATORS: Record<SortKey, (a: Receipt, b: Receipt) => number> = {
  "date-asc": (a, b) => a.ts.localeCompare(b.ts),
  "date-desc": (a, b) => b.ts.localeCompare(a.ts),
  "amount-desc": (a, b) => Math.abs(b.amount ?? 0) - Math.abs(a.amount ?? 0),
  "weight-desc": (a, b) => b.weight - a.weight,
};

type Props = {
  receipts: Receipt[] | null;
  isLoading: boolean;
  years: string[];
};

/**
 * The archive — free search, filtering and sorting across every shipped receipt.
 *
 * Search runs over title, subtitle, detail and tags. It is deliberately a plain
 * substring match rather than a fuzzy index: the corpus is 3,704 rows, a linear
 * scan is well under a frame, and an exact match is easier to trust when the
 * reader is checking a claim the page just made.
 *
 * Search, filters, sort and year all live in the query string, so any view here
 * is a link someone can send.
 */
export function Archive({ receipts, isLoading, years }: Props) {
  const [query, setQuery] = useUrlState("q", "");
  const [year, setYear] = useUrlState("year", "all");
  const [sort, setSort] = useUrlState("sort", "date-asc");
  const [kindParam, setKindParam] = useUrlState("kind", "");
  const [limit, setLimit] = useState(PAGE);

  const activeKinds = useMemo(
    () => new Set(kindParam ? kindParam.split(",").filter(Boolean) : []),
    [kindParam],
  );

  // Keeps typing responsive: the input updates every keystroke, the heavier
  // filter pass runs on a deferred copy.
  const deferredQuery = useDeferredValue(query);

  const results = useMemo(() => {
    if (!receipts) return [];
    const needle = deferredQuery.trim().toLowerCase();

    const filtered = receipts.filter((receipt) => {
      if (year !== "all" && !receipt.ts.startsWith(year)) return false;
      if (activeKinds.size > 0 && !activeKinds.has(receipt.kind)) return false;
      if (!needle) return true;

      return (
        receipt.title.toLowerCase().includes(needle) ||
        receipt.subtitle?.toLowerCase().includes(needle) ||
        receipt.detail?.toLowerCase().includes(needle) ||
        receipt.tags.some((tag) => tag.toLowerCase().includes(needle))
      );
    });

    const comparator = COMPARATORS[sort as SortKey] ?? COMPARATORS["date-asc"];
    return [...filtered].sort(comparator);
  }, [receipts, deferredQuery, activeKinds, year, sort]);

  function toggleKind(kind: ReceiptKind) {
    const next = new Set(activeKinds);
    if (next.has(kind)) next.delete(kind);
    else next.add(kind);
    setKindParam([...next].join(","));
    setLimit(PAGE);
  }

  function clearAll() {
    setQuery("");
    setKindParam("");
    setYear("all");
    setSort("date-asc");
    setLimit(PAGE);
  }

  const hasFilters = query !== "" || activeKinds.size > 0 || year !== "all";

  return (
    <section id="archive" className="section" aria-labelledby="archive-title">
      <div className="shell">
        <Reveal from="none" className="flex items-baseline justify-between gap-6">
          <p className="annotation">Plate VII · The archive</p>
          <p className="annotation hidden sm:block">Every shipped receipt</p>
        </Reveal>
        <Reveal from="none" stagger={1}>
          <hr className="rule mt-3" />
        </Reveal>

        <Reveal className="mt-12 max-w-[42rem]">
          <h2 id="archive-title" className="font-display text-h2">
            Check the working
          </h2>
          <p className="mt-5 text-body text-[var(--color-ink-2)]">
            Every claim on this page is drawn from these rows. Search them, filter them, sort them,
            take them away as a spreadsheet — and disagree with the conclusions if the evidence does
            not hold.
          </p>
        </Reveal>

        {/* ── What the brief asked for, against what the data holds ──────── */}
        <Reveal stagger={2} className="mt-10">
          <h3 className="annotation mb-3">Nine receipt types were named. Six are in the data.</h3>
          <ul className="grid gap-px border border-[color-mix(in_oklab,var(--color-ink)_14%,transparent)] bg-[color-mix(in_oklab,var(--color-ink)_14%,transparent)] sm:grid-cols-3 lg:grid-cols-5">
            {BRIEF_TAXONOMY.map((entry) => {
              const count = receipts
                ? receipts.filter((r) => entry.kinds.includes(r.kind)).length
                : 0;
              const present = entry.kinds.length > 0;
              return (
                <li key={entry.brief} className="bg-[var(--color-paper)] p-3">
                  <p
                    className={`font-display text-[1.05rem] leading-tight ${
                      present ? "" : "text-[var(--color-ink-3)] line-through"
                    }`}
                  >
                    {entry.brief}
                  </p>
                  <p
                    className={`tnum mt-1 font-mono text-micro ${
                      present ? "text-[var(--color-azure)]" : "text-[var(--color-rust)]"
                    }`}
                  >
                    {present ? `${num(count)} records` : "absent"}
                  </p>
                  <p className="mt-1 text-nano text-[var(--color-ink-3)]">{entry.note}</p>
                </li>
              );
            })}
          </ul>
        </Reveal>

        {/* ── Controls ──────────────────────────────────────────────────── */}
        <div className="mt-10 grid gap-5">
          <div className="flex flex-wrap items-end gap-4">
            <div className="relative min-w-[16rem] flex-1 sm:max-w-md">
              <label htmlFor="archive-search" className="annotation mb-1.5 block">
                Search the archive
              </label>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute bottom-[0.6rem] left-3 font-mono text-[var(--color-ink-3)]"
              >
                ⌕
              </span>
              <input
                id="archive-search"
                type="search"
                className="field"
                placeholder="Beatles, Netflix, idli, Place 0…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setLimit(PAGE);
                }}
              />
            </div>

            <div>
              <label htmlFor="archive-year" className="annotation mb-1.5 block">
                Year
              </label>
              <select
                id="archive-year"
                className="control"
                value={year}
                onChange={(e) => {
                  setYear(e.target.value);
                  setLimit(PAGE);
                }}
              >
                <option value="all">All years</option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="archive-sort" className="annotation mb-1.5 block">
                Sort by
              </label>
              <select
                id="archive-sort"
                className="control"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                {SORTS.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-start gap-x-6 gap-y-4">
            {KIND_GROUPS.map((group) => (
              <fieldset key={group.label} className="min-w-0">
                <legend className="annotation mb-1.5">{group.label}</legend>
                <div className="flex flex-wrap gap-2">
                  {group.kinds.map((kind) => (
                    <button
                      key={kind}
                      type="button"
                      className="control"
                      aria-pressed={activeKinds.has(kind)}
                      onClick={() => toggleKind(kind)}
                    >
                      {KIND_LABEL[kind]}
                    </button>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <p
              className="tnum font-mono text-label text-[var(--color-ink-3)]"
              role="status"
              aria-live="polite"
            >
              {isLoading
                ? "Reading the archive…"
                : `${num(results.length)} receipt${results.length === 1 ? "" : "s"}${
                    hasFilters ? " match" : ""
                  }`}
            </p>

            <button
              type="button"
              className="control"
              disabled={results.length === 0}
              onClick={() =>
                downloadCSV(results, `midnight-ledger${hasFilters ? "-filtered" : ""}.csv`)
              }
            >
              ↓ Export CSV
            </button>

            {hasFilters && (
              <button
                type="button"
                className="control !border-[var(--color-rust)] !text-[var(--color-rust)]"
                onClick={clearAll}
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* ── Results ───────────────────────────────────────────────────── */}
        {results.length === 0 && !isLoading ? (
          <p className="mt-10 border-l-2 border-[var(--color-rust)] pl-4 text-body text-[var(--color-ink-2)]">
            Nothing matches that. The archive holds music, money, journeys, occasions and written
            notes — but no photos, messages or searches, however much the brief implied there would
            be.
          </p>
        ) : (
          <>
            <ul className="slip-grid mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {results.slice(0, limit).map((receipt) => (
                <li key={receipt.id}>
                  <ReceiptSlip receipt={receipt} />
                </li>
              ))}
            </ul>

            {results.length > limit && (
              <div className="mt-10 flex justify-center">
                <button
                  type="button"
                  className="control !px-6 !py-3"
                  onClick={() => setLimit((n) => n + PAGE * 2)}
                >
                  Show {num(Math.min(PAGE * 2, results.length - limit))} more
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
