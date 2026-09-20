import { useMemo, useState } from "react";
import { ConstellationGraph } from "../components/viz/ConstellationGraph";
import { ReceiptSlip } from "../components/ReceiptSlip";
import { Reveal } from "../components/Reveal";
import { findConnections, findRichAnchors } from "../lib/connections";
import type { Receipt } from "../types/archive";
import { KIND_LABEL, longDate, num } from "../lib/format";

const WINDOWS = [1, 3, 7, 14] as const;

type Props = {
  receipts: Receipt[] | null;
  isLoading: boolean;
};

/**
 * The constellation — the site's relationship-discovery mechanism.
 *
 * Pick any record and the engine scores every other record inside a time
 * window on proximity, shared vocabulary and whether the link crosses between
 * archives. Selecting a linked record re-anchors the whole figure, so a single
 * lookup becomes a walk through the dataset.
 */
export function Constellation({ receipts, isLoading }: Props) {
  const [anchor, setAnchor] = useState<Receipt | null>(null);
  const [windowDays, setWindowDays] = useState<number>(3);
  const [trail, setTrail] = useState<Receipt[]>([]);

  const suggestions = useMemo(
    () => (receipts ? findRichAnchors(receipts, 5) : []),
    [receipts],
  );

  const active = anchor ?? suggestions[0] ?? null;

  const connections = useMemo(
    () => (active && receipts ? findConnections(active, receipts, { windowDays }) : []),
    [active, receipts, windowDays],
  );

  const crossings = connections.filter((c) => c.crossesArchives);

  function handleSelect(receipt: Receipt) {
    if (active) setTrail((prev) => [...prev.slice(-4), active]);
    setAnchor(receipt);
  }

  return (
    <section id="constellation" className="section" aria-labelledby="constellation-title">
      <div className="shell">
        <Reveal from="none" className="flex items-baseline justify-between gap-6">
          <p className="annotation">Plate V · The constellation</p>
          <p className="annotation hidden sm:block">Pick a moment, follow the threads</p>
        </Reveal>
        <Reveal from="none" stagger={1}>
          <hr className="rule mt-3" />
        </Reveal>

        <Reveal className="mt-12 max-w-[42rem]">
          <h2 id="constellation-title" className="font-display text-h2">
            Five records, one moment
          </h2>
          <p className="mt-5 text-body text-[var(--color-ink-2)]">
            Any record can be an anchor. The engine scores everything nearby on three axes — how
            close in time, how much vocabulary they share, and whether the link crosses from
            listening into spending. Cross-archive links are drawn in blue, because those are the
            only ones that could argue for a single person.
          </p>
        </Reveal>

        {isLoading && (
          <p className="mt-10 font-mono text-label text-[var(--color-ink-3)]" role="status">
            Reading 3,704 receipts…
          </p>
        )}

        {active && (
          <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] lg:gap-14">
            {/* ── Figure ──────────────────────────────────────────────────── */}
            <div>
              <Reveal from="scale" className="text-[var(--color-ink-2)]">
                <ConstellationGraph
                  anchor={active}
                  connections={connections}
                  onSelect={handleSelect}
                  windowDays={windowDays}
                />
              </Reveal>

              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
                <fieldset className="flex items-center gap-2">
                  <legend className="annotation mb-1">Window</legend>
                  {WINDOWS.map((days) => (
                    <button
                      key={days}
                      type="button"
                      className="control"
                      data-active={windowDays === days}
                      onClick={() => setWindowDays(days)}
                      aria-pressed={windowDays === days}
                    >
                      ±{days}d
                    </button>
                  ))}
                </fieldset>

                <p className="font-mono text-micro text-[var(--color-ink-3)]">
                  {connections.length} linked ·{" "}
                  <span className="text-[var(--color-azure)]">{crossings.length} cross-archive</span>
                </p>
              </div>

              {trail.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="annotation">Trail</span>
                  {trail.map((step) => (
                    <button
                      key={step.id}
                      type="button"
                      className="control !normal-case"
                      onClick={() => setAnchor(step)}
                    >
                      {step.title.slice(0, 22)}
                      {step.title.length > 22 ? "…" : ""}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ── Reading panel ───────────────────────────────────────────── */}
            <div className="min-w-0">
              <p className="annotation">Anchored on</p>
              <div className="mt-2">
                <ReceiptSlip receipt={active} />
              </div>
              {active.detail && (
                <p className="mt-3 text-label text-[var(--color-ink-2)]">{active.detail}</p>
              )}

              {crossings.length > 0 ? (
                <div className="mt-8">
                  <p className="annotation text-[var(--color-azure)]">
                    Crossing the archives ({crossings.length})
                  </p>
                  <ul className="mt-3 grid gap-3">
                    {crossings.slice(0, 4).map((connection) => (
                      <li key={connection.receipt.id}>
                        <ReceiptSlip
                          receipt={connection.receipt}
                          onSelect={handleSelect}
                          reason={connection.reason}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="mt-8 border-l-2 border-[var(--color-rust)] pl-3 text-label text-[var(--color-ink-2)]">
                  Nothing from the other archive falls within ±{windowDays} days of this record.
                  Widen the window, or accept that this moment belongs to one archive alone.
                </p>
              )}

              <div className="mt-8">
                <p className="annotation">Start somewhere else</p>
                <ul className="mt-3 grid gap-2">
                  {suggestions.map((receipt) => (
                    <li key={receipt.id}>
                      <button
                        type="button"
                        className="control w-full !normal-case !text-left"
                        data-active={active.id === receipt.id}
                        onClick={() => handleSelect(receipt)}
                      >
                        <span className="block truncate">{receipt.title}</span>
                        <span className="mt-0.5 block text-[var(--color-ink-3)]">
                          {KIND_LABEL[receipt.kind]} · {longDate(receipt.ts)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ── Legend ────────────────────────────────────────────────────── */}
        {active && (
          <Reveal from="none" className="mt-12 flex flex-wrap gap-x-8 gap-y-3">
            {[
              { swatch: "var(--color-azure)", label: "Crosses between archives" },
              { swatch: "var(--color-ochre)", label: "A day given over to listening" },
              { swatch: "var(--color-rust)", label: "One track on repeat" },
              { swatch: "var(--color-ink)", label: "A purchase" },
            ].map((item) => (
              <p key={item.label} className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="inline-block size-2.5"
                  style={{ background: item.swatch }}
                />
                <span className="annotation">{item.label}</span>
              </p>
            ))}
            <p className="annotation ml-auto hidden sm:block">
              {num(receipts?.length ?? 0)} receipts indexed
            </p>
          </Reveal>
        )}
      </div>
    </section>
  );
}
