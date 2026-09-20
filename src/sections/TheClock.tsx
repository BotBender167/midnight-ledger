import { useMemo, useState } from "react";
import { RadialClock } from "../components/viz/RadialClock";
import { Reveal } from "../components/Reveal";
import type { Overview } from "../types/archive";
import { hourLabel, num, peak, peakIndex, shiftHours } from "../lib/format";

import { TIMEZONE_PRESETS as ZONES } from "../constants/ui";

/**
 * Read the shifted peak as a kind of life.
 *
 * This is the interpretive layer, and it is doing exactly what the reader is
 * being invited to distrust: turning one number into a personality. Which is
 * the point — move the dial and the "personality" changes completely, from the
 * same 149,860 rows.
 */
function readPattern(peakHour: number): { verdict: string; note: string } {
  if (peakHour >= 22 || peakHour < 4) {
    return {
      verdict: "A nocturnal life",
      note: "The loudest hour is the middle of the night. This reads as someone who listens alone, after everyone else has stopped.",
    };
  }
  if (peakHour < 9) {
    return {
      verdict: "A commuter's life",
      note: "The loudest hour is early morning. This reads as headphones on the way to work, not insomnia.",
    };
  }
  if (peakHour < 17) {
    return {
      verdict: "A working life",
      note: "The loudest hour falls inside the working day. This reads as music underneath a desk job.",
    };
  }
  return {
    verdict: "An evening life",
    note: "The loudest hour is after work and before bed. The most ordinary shape a day can have.",
  };
}

type Props = {
  overview: Overview | null;
};

/**
 * The clock — the site's central argument.
 *
 * The listening archive is stamped UTC and the subject's location is unknown.
 * Rather than pick a timezone and present the result as fact, the dial is
 * handed to the reader. The same data supports four different lives; which one
 * you believe depends on an assumption nobody recorded.
 */
export function TheClock({ overview }: Props) {
  const [offset, setOffset] = useState(0);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);

  const base = overview?.hours24 ?? new Array(24).fill(0);
  const shifted = useMemo(() => shiftHours(base, offset), [base, offset]);

  const peakHour = peakIndex(shifted);
  const quietHour = shifted.indexOf(Math.min(...shifted.filter((n) => n > 0)));
  const pattern = readPattern(peakHour);
  const ratio = shifted[quietHour] ? Math.round(peak(shifted) / shifted[quietHour]!) : 0;

  const zone = ZONES.find((z) => z.offset === offset);

  return (
    <section id="clock" className="section" aria-labelledby="clock-title">
      <div className="shell">
        <Reveal from="none" className="flex items-baseline justify-between gap-6">
          <p className="annotation">Plate IV · The clock</p>
          <p className="annotation hidden sm:block">One assumption changes everything</p>
        </Reveal>
        <Reveal from="none" stagger={1}>
          <hr className="rule mt-3 mb-12" />
        </Reveal>

        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-20">
          <Reveal from="left">
            <h2 id="clock-title" className="font-display text-h2">
              {pattern.verdict}
            </h2>

            <p className="mt-5 max-w-[32rem] text-body text-[var(--color-ink-2)]">{pattern.note}</p>

            <dl className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-3">
              <div>
                <dt className="annotation">Loudest hour</dt>
                <dd className="tnum mt-1 font-display text-[1.9rem] leading-none text-[var(--color-azure)]">
                  {hourLabel(peakHour)}
                </dd>
              </div>
              <div>
                <dt className="annotation">Quietest hour</dt>
                <dd className="tnum mt-1 font-display text-[1.9rem] leading-none">
                  {hourLabel(quietHour)}
                </dd>
              </div>
              <div>
                <dt className="annotation">Gap</dt>
                <dd className="tnum mt-1 font-display text-[1.9rem] leading-none">{ratio}×</dd>
              </div>
            </dl>

            {/* ── The dial ────────────────────────────────────────────────── */}
            <div className="mt-10 border border-[color-mix(in_oklab,var(--color-ink)_18%,transparent)] bg-[var(--color-paper-2)] p-5">
              <label htmlFor="tz" className="annotation block">
                Assume the subject lived at
              </label>

              <div className="mt-3 flex items-baseline gap-3">
                <output
                  htmlFor="tz"
                  className="tnum font-display text-[1.6rem] leading-none text-[var(--color-azure)]"
                >
                  {zone?.label ?? `UTC${offset >= 0 ? "+" : ""}${offset}`}
                </output>
                {zone && <span className="font-mono text-micro text-[var(--color-ink-3)]">{zone.place}</span>}
              </div>

              <input
                id="tz"
                type="range"
                min={-11}
                max={12}
                step={1}
                value={offset}
                onChange={(e) => setOffset(Number(e.target.value))}
                className="mt-4"
                aria-describedby="tz-help"
              />

              <p id="tz-help" className="mt-3 text-micro text-[var(--color-ink-3)]">
                The archive records UTC and never records where the subject was. Every reading above
                depends on a timezone nobody wrote down.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {ZONES.map((z) => (
                  <button
                    key={z.offset}
                    type="button"
                    className="control"
                    data-active={offset === z.offset}
                    onClick={() => setOffset(z.offset)}
                  >
                    {z.label}
                  </button>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal from="scale" stagger={2}>
            <RadialClock
              hours={shifted}
              selected={selectedHour}
              onSelect={setSelectedHour}
              className="mx-auto max-w-[26rem] text-[var(--color-ink-2)]"
            />

            <p className="mx-auto mt-4 max-w-[26rem] text-center font-mono text-micro text-[var(--color-ink-3)]">
              {num(overview?.listening.plays ?? 0)} plays · shaded band is 10pm–5am ·{" "}
              {overview?.listening.nightShare ?? 0}% fall inside it at UTC
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
