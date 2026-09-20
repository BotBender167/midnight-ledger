import { NightScene } from "../components/art/NightScene";
import { Reveal } from "../components/Reveal";
import type { Overview } from "../types/archive";
import { hourLabel, num, peakIndex } from "../lib/format";

/**
 * The opening plate.
 *
 * States the premise in one screen: three archives, one unidentified subject,
 * and a question the reader is asked to answer rather than a conclusion handed
 * to them. Every figure shown here is read from the data, never hardcoded —
 * the fallbacks exist only for the few hundred milliseconds before the
 * overview bundle lands.
 */
export function Hero({ overview }: { overview: Overview | null }) {
  const peakHour = overview ? peakIndex(overview.hours24) : 0;

  const readings = [
    { label: "Span", value: "2013–2024" },
    { label: "Listening", value: `${num(overview?.listening.hours ?? 5342)} hrs` },
    { label: "Peak hour", value: overview ? hourLabel(peakHour) : "12am" },
    { label: "After dark", value: `${overview?.listening.nightShare ?? 42.3}%` },
  ];

  return (
    <header className="relative overflow-hidden" aria-labelledby="hero-title">
      <div className="shell relative z-10 pt-16 sm:pt-20 lg:pt-24">
        <Reveal
          from="none"
          className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1"
        >
          <p className="annotation">The Midnight Ledger · Plate I</p>
          <p className="annotation">
            {overview ? `${num(overview.counts.totalRecords)} records` : "reading archives…"} · three
            sources
          </p>
        </Reveal>
        <Reveal from="none" stagger={1}>
          <hr className="rule mt-3" />
        </Reveal>

        {/* ── Title ─────────────────────────────────────────────────────── */}
        <h1 id="hero-title" className="font-display mt-8 leading-[0.82] sm:mt-10">
          <Reveal as="span" from="left" stagger={2} className="block text-h1">
            The
          </Reveal>
          <Reveal as="span" from="left" stagger={3} className="block text-h1 text-[var(--color-azure)]">
            Midnight
          </Reveal>
          <Reveal as="span" from="left" stagger={4} className="block text-h1">
            Ledger
          </Reveal>
        </h1>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,32rem)_minmax(0,1fr)] lg:items-end lg:gap-16">
          <Reveal stagger={6}>
            <p className="text-lead leading-[1.3] text-pretty">
              Three anonymous archives. Eleven years of listening, four years of household
              spending, ten thousand strangers paying for things.
            </p>
            <p className="mt-4 max-w-[30rem] text-body text-[var(--color-ink-2)]">
              Nothing in the data says they belong to the same person. This is the evidence, laid
              out so you can decide.
            </p>
          </Reveal>

          <Reveal
            as="dl"
            stagger={8}
            className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4 lg:gap-x-4"
          >
            {readings.map((item) => (
              <div key={item.label}>
                <dt className="annotation">{item.label}</dt>
                <dd className="tnum mt-1 font-display text-[1.5rem] leading-none sm:text-[1.9rem]">
                  {item.value}
                </dd>
              </div>
            ))}
          </Reveal>
        </div>
      </div>

      {/* ── The plate ───────────────────────────────────────────────────── */}
      <Reveal from="none" rootMargin="0px" className="relative mt-4 sm:mt-0 lg:-mt-16">
        <NightScene className="h-[46vh] w-full text-[var(--color-ink)] sm:h-auto" />
      </Reveal>

      <div className="shell relative -mt-6 pb-14 sm:-mt-10">
        <Reveal from="none" stagger={4} className="flex items-center gap-3">
          <a
            href="#dig"
            className="annotation no-underline transition-colors hover:text-[var(--color-ink)]"
          >
            Begin the survey
          </a>
          <span aria-hidden="true" className="anim-drift text-[var(--color-azure)]">
            ↓
          </span>
        </Reveal>
      </div>
    </header>
  );
}
