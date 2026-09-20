import { useDeferredValue, useMemo, useState } from "react";
import { ReceiptSlip } from "../components/ReceiptSlip";
import { Reveal } from "../components/Reveal";
import type { Receipt, ReceiptKind } from "../types/archive";
import { KIND_LABEL, num } from "../lib/format";

import { ARCHIVE_PAGE_SIZE as PAGE } from "../constants/ui";

const KIND_GROUPS: Array<{ label: string; kinds: ReceiptKind[] }> = [
  { label: "Listening", kinds: ["discovery", "obsession", "vigil", "binge", "return"] },
  { label: "Money", kinds: ["purchase", "ritual", "investment", "income"] },
];

type Props = {
  receipts: Receipt[] | null;
  isLoading: boolean;
  years: string[];
};

/**
 * The archive — free search across every shipped receipt.
 *
 * Search runs over title, subtitle, detail and tags. It is deliberately a
 * plain substring match rather than a fuzzy index: the corpus is 3,704 rows,
 * a linear scan is well under a frame, and an exact match is easier to trust
 * when the reader is checking a claim the page just made.
 */
export function Archive({ receipts, isLoading, years }: Props) {
  const [query, setQuery] = useState("");
  const [activeKinds, setActiveKinds] = useState<Set<ReceiptKind>>(new Set());
  const [year, setYear] = useState<string>("all");
  const [limit, setLimit] = useState(PAGE);

  // Keeps typing responsive: the input updates every keystroke, the (heavier)
  // filter pass runs on a deferred copy.
  const deferredQuery = useDeferredValue(query);

  const results = useMemo(() => {
    if (!receipts) return [];
    const needle = deferredQuery.trim().toLowerCase();

    return receipts.filter((receipt) => {
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
  }, [receipts, deferredQuery, activeKinds, year]);

  function toggleKind(kind: ReceiptKind) {
    setActiveKinds((prev) => {
      const next = new Set(prev);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });
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
            Every claim on this page is drawn from these rows. Search them, filter them, and
            disagree with the conclusions if the evidence does not hold.
          </p>
        </Reveal>

        {/* ── Controls ──────────────────────────────────────────────────── */}
        <div className="mt-10 grid gap-5">
          <div className="relative max-w-md">
            <label htmlFor="archive-search" className="sr-only">
              Search the archive
            </label>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 font-mono text-[var(--color-ink-3)]"
            >
              ⌕
            </span>
            <input
              id="archive-search"
              type="search"
              className="field"
              placeholder="Beatles, Netflix, idli, 2am…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setLimit(PAGE);
              }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            {KIND_GROUPS.map((group) => (
              <fieldset key={group.label} className="flex flex-wrap items-center gap-2">
                <legend className="annotation mb-1">{group.label}</legend>
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
              </fieldset>
            ))}

            <div className="flex items-center gap-2">
              <label htmlFor="archive-year" className="annotation">
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
                <option value="all">All</option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {hasFilters && (
              <button
                type="button"
                className="control !border-[var(--color-rust)] !text-[var(--color-rust)]"
                onClick={() => {
                  setQuery("");
                  setActiveKinds(new Set());
                  setYear("all");
                  setLimit(PAGE);
                }}
              >
                Clear
              </button>
            )}
          </div>

          <p className="font-mono text-label text-[var(--color-ink-3)]" role="status" aria-live="polite">
            {isLoading
              ? "Reading the archive…"
              : `${num(results.length)} receipt${results.length === 1 ? "" : "s"}${
                  hasFilters ? " match" : ""
                }`}
          </p>
        </div>

        {/* ── Results ───────────────────────────────────────────────────── */}
        {results.length === 0 && !isLoading ? (
          <p className="mt-10 border-l-2 border-[var(--color-rust)] pl-4 text-body text-[var(--color-ink-2)]">
            Nothing matches that. The archive holds music and money only — there are no photos,
            messages or searches in it, however much the brief implied there would be.
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
