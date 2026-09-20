import { Reveal } from "../components/Reveal";
import type { Ambient, Overview } from "../types/archive";
import { hourLabel, num, peak, peakIndex } from "../lib/format";

type Props = {
  ambient: Ambient | null;
  overview: Overview | null;
};

/**
 * Archive C — the crowd.
 *
 * Ten thousand strangers, presented as contrast rather than evidence. The
 * point of the section is the comparison of *shapes*: the crowd spends across
 * the working day, the subject listens through the night. Put the two hour
 * curves on one axis and the subject stops looking like an average person.
 */
export function TheCrowd({ ambient, overview }: Props) {
  if (!ambient || !overview) {
    return <section id="crowd" className="section" aria-hidden="true" />;
  }

  const crowdPeak = peakIndex(ambient.hours24);
  const subjectPeak = peakIndex(overview.hours24);

  const crowdMax = peak(ambient.hours24) || 1;
  const subjectMax = peak(overview.hours24) || 1;

  return (
    <section id="crowd" className="section" aria-labelledby="crowd-title">
      <div className="shell">
        <Reveal from="none" className="flex items-baseline justify-between gap-6">
          <p className="annotation">Plate VI½ · The crowd</p>
          <p className="annotation hidden sm:block">Ten thousand other people</p>
        </Reveal>
        <Reveal from="none" stagger={1}>
          <hr className="rule mt-3" />
        </Reveal>

        <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:gap-16">
          <Reveal from="left">
            <h2 id="crowd-title" className="font-display text-h2">
              Everybody else
            </h2>
            <p className="mt-5 text-body text-[var(--color-ink-2)]">
              The third archive is {num(ambient.rows)} card payments made by thousands of different
              people across India. It cannot tell us anything about the subject. What it can do is
              say what ordinary looks like.
            </p>

            <dl className="mt-8 grid grid-cols-2 gap-6">
              <div>
                <dt className="annotation">Crowd peaks at</dt>
                <dd className="tnum mt-1 font-display text-[1.9rem] leading-none">
                  {hourLabel(crowdPeak)}
                </dd>
              </div>
              <div>
                <dt className="annotation">Subject peaks at</dt>
                <dd className="tnum mt-1 font-display text-[1.9rem] leading-none text-[var(--color-azure)]">
                  {hourLabel(subjectPeak)}
                </dd>
              </div>
            </dl>

            <p className="mt-6 max-w-[30rem] text-label text-[var(--color-ink-2)]">
              Whoever the subject is, they are awake when the country is not.
            </p>

            <p className="mt-6 border-l-2 border-[var(--color-rust)] pl-3 text-micro text-[var(--color-ink-3)]">
              Handle with care: {num(ambient.rows - ambient.usable)} rows carry an unreadable date
              and are excluded, and roughly {Math.round(100 - ambient.completeness.city)}% of the
              rest are missing a city or a category. This is a fraud-detection sample, not a census
              — it shows a shape, not a population.
            </p>
          </Reveal>

          <Reveal from="right" stagger={2}>
            {/* ── Two curves, one axis ──────────────────────────────────── */}
            <svg
              viewBox="0 0 720 240"
              role="img"
              aria-label={`Hour-of-day comparison. The crowd's card payments peak at ${hourLabel(crowdPeak)}; the subject's listening peaks at ${hourLabel(subjectPeak)}.`}
              className="w-full text-[var(--color-ink-2)]"
            >
              <line x1={20} y1={200} x2={700} y2={200} stroke="currentColor" opacity={0.3} />

              {/* crowd, as filled area */}
              <path
                d={[
                  `M 20 200`,
                  ...ambient.hours24.map(
                    (v, h) => `L ${20 + (h / 23) * 680} ${200 - (v / crowdMax) * 150}`,
                  ),
                  `L 700 200 Z`,
                ].join(" ")}
                fill="currentColor"
                opacity={0.14}
              />

              {/* subject, as a line */}
              <path
                d={overview.hours24
                  .map(
                    (v, h) =>
                      `${h === 0 ? "M" : "L"} ${20 + (h / 23) * 680} ${200 - (v / subjectMax) * 150}`,
                  )
                  .join(" ")}
                fill="none"
                stroke="var(--color-azure)"
                strokeWidth={2.5}
                strokeLinejoin="round"
                pathLength={1}
                className="ink-draw"
              />

              <g fontFamily="var(--font-mono)" fontSize={10} fill="var(--color-ink-3)">
                {[0, 6, 12, 18, 23].map((h) => (
                  <text key={h} x={20 + (h / 23) * 680} y={220} textAnchor="middle">
                    {hourLabel(h)}
                  </text>
                ))}
              </g>

              <g fontFamily="var(--font-mono)" fontSize={10} letterSpacing="0.1em">
                <text x={20 + (crowdPeak / 23) * 680} y={26} fill="var(--color-ink-3)">
                  CROWD
                </text>
                <text x={20 + (subjectPeak / 23) * 680} y={44} fill="var(--color-azure)">
                  SUBJECT
                </text>
              </g>
            </svg>

            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              <div>
                <p className="annotation mb-2">What the crowd buys</p>
                <ul className="grid gap-1.5">
                  {ambient.categories
                    .filter((c) => c.name)
                    .slice(0, 5)
                    .map((category) => (
                      <li key={category.name} className="flex items-baseline justify-between gap-3">
                        <span className="truncate text-label">{category.name}</span>
                        <span className="tnum shrink-0 font-mono text-micro text-[var(--color-ink-3)]">
                          {num(category.count)}
                        </span>
                      </li>
                    ))}
                </ul>
              </div>

              <div>
                <p className="annotation mb-2">What the subject bought</p>
                <ul className="grid gap-1.5">
                  {overview.spending.categories.slice(0, 5).map((category) => (
                    <li key={category.name} className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-label">{category.name}</span>
                      <span className="tnum shrink-0 font-mono text-micro text-[var(--color-ink-3)]">
                        {num(category.count)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
