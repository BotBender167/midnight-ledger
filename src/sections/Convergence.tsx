import { useId, useState } from "react";
import { Reveal } from "../components/Reveal";
import type { Overview } from "../types/archive";
import { num, rupees } from "../lib/format";

const W = 720;
const H = 300;
const PAD = { top: 24, right: 20, bottom: 40, left: 20 };

type Point = { year: string; playsNorm: number; entriesNorm: number | null };

/** Build an SVG polyline path, skipping years where a series has no data. */
function line(points: Point[], key: "playsNorm" | "entriesNorm"): string {
  const usable = points.filter((p) => p[key] !== null);
  if (usable.length === 0) return "";

  const step = (W - PAD.left - PAD.right) / Math.max(1, points.length - 1);
  return usable
    .map((p) => {
      const i = points.indexOf(p);
      const x = PAD.left + i * step;
      const y = H - PAD.bottom - (p[key] as number) * (H - PAD.top - PAD.bottom);
      return `${i === points.indexOf(usable[0]!) ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

type Props = {
  overview: Overview | null;
};

/**
 * The convergence.
 *
 * Both personal archives peak in 2017, independently. That is the strongest
 * single argument for one person — and also exactly the kind of coincidence
 * that two unrelated datasets covering the same decade will sometimes produce.
 * The section makes the case and then names the objection, rather than letting
 * the chart imply a conclusion on its own.
 */
export function Convergence({ overview }: Props) {
  const titleId = useId();
  const [hover, setHover] = useState<number | null>(null);

  const points = overview?.convergence ?? [];
  if (points.length === 0) {
    return <section id="convergence" className="section" aria-hidden="true" />;
  }

  const step = (W - PAD.left - PAD.right) / Math.max(1, points.length - 1);
  const active = hover !== null ? points[hover] : null;
  const overlapStart = points.findIndex((p) => p.entriesNorm !== null);
  const overlapEnd = points.findLastIndex((p) => p.entriesNorm !== null);

  return (
    <section id="convergence" className="section" aria-labelledby="convergence-title">
      <div className="shell">
        <Reveal from="none" className="flex items-baseline justify-between gap-6">
          <p className="annotation">Plate VI · The convergence</p>
          <p className="annotation hidden sm:block">The best argument, and its flaw</p>
        </Reveal>
        <Reveal from="none" stagger={1}>
          <hr className="rule mt-3" />
        </Reveal>

        <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:gap-16">
          <Reveal from="left">
            <h2 id="convergence-title" className="font-display text-h2">
              Both peak in 2017
            </h2>
            <p className="mt-5 text-body text-[var(--color-ink-2)]">
              Listening hit {num(points.find((p) => p.year === "2017")?.plays ?? 0)} plays that
              year, its highest ever. The household ledger hit its own maximum in the same twelve
              months. Nothing links the two files, and yet they crest together.
            </p>
            <p className="mt-4 border-l-2 border-[var(--color-rust)] pl-3 text-label text-[var(--color-ink-2)]">
              The objection: the archives only overlap for four years. One shared peak in a
              four-year window is the sort of thing chance produces routinely. It is evidence, not
              proof — and it is the best this dataset has.
            </p>
          </Reveal>

          <Reveal from="scale" stagger={2}>
            <svg
              viewBox={`0 0 ${W} ${H}`}
              role="img"
              aria-labelledby={titleId}
              className="w-full text-[var(--color-ink-2)]"
            >
              <title id={titleId}>
                Listening volume and household transaction count per year, each scaled to its own
                maximum. Both series reach their highest point in 2017.
              </title>

              {/* overlap band */}
              {overlapStart >= 0 && (
                <rect
                  x={PAD.left + overlapStart * step}
                  y={PAD.top}
                  width={(overlapEnd - overlapStart) * step}
                  height={H - PAD.top - PAD.bottom}
                  fill="var(--color-azure)"
                  opacity={0.07}
                />
              )}

              {/* baseline */}
              <line
                x1={PAD.left}
                y1={H - PAD.bottom}
                x2={W - PAD.right}
                y2={H - PAD.bottom}
                stroke="currentColor"
                opacity={0.3}
              />

              {/* series */}
              <path
                d={line(points, "playsNorm")}
                fill="none"
                stroke="var(--color-ink)"
                strokeWidth={2.5}
                strokeLinejoin="round"
                pathLength={1}
                className="ink-draw"
              />
              <path
                d={line(points, "entriesNorm")}
                fill="none"
                stroke="var(--color-azure)"
                strokeWidth={2.5}
                strokeDasharray="6 4"
                strokeLinejoin="round"
                pathLength={1}
                className="ink-draw"
                style={{ "--stagger": 2 } as React.CSSProperties}
              />

              {/* the 2017 marker */}
              {(() => {
                const i = points.findIndex((p) => p.year === "2017");
                if (i < 0) return null;
                const x = PAD.left + i * step;
                return (
                  <g>
                    <line
                      x1={x}
                      y1={PAD.top}
                      x2={x}
                      y2={H - PAD.bottom}
                      stroke="var(--color-ochre)"
                      strokeWidth={1.5}
                      strokeDasharray="3 4"
                    />
                    <text
                      x={x}
                      y={PAD.top - 8}
                      textAnchor="middle"
                      fontFamily="var(--font-mono)"
                      fontSize={10}
                      letterSpacing="0.12em"
                      fill="var(--color-ochre)"
                    >
                      BOTH PEAK
                    </text>
                  </g>
                );
              })()}

              {/* interaction columns */}
              {points.map((point, i) => {
                const x = PAD.left + i * step;
                return (
                  <g key={point.year}>
                    {hover === i && (
                      <>
                        <circle
                          cx={x}
                          cy={H - PAD.bottom - point.playsNorm * (H - PAD.top - PAD.bottom)}
                          r={5}
                          fill="var(--color-ink)"
                        />
                        {point.entriesNorm !== null && (
                          <circle
                            cx={x}
                            cy={H - PAD.bottom - point.entriesNorm * (H - PAD.top - PAD.bottom)}
                            r={5}
                            fill="var(--color-azure)"
                          />
                        )}
                      </>
                    )}
                    <text
                      x={x}
                      y={H - PAD.bottom + 20}
                      textAnchor="middle"
                      fontFamily="var(--font-mono)"
                      fontSize={10}
                      fill={hover === i ? "var(--color-ink)" : "var(--color-ink-3)"}
                    >
                      {point.year.slice(2)}
                    </text>
                    <rect
                      x={x - step / 2}
                      y={PAD.top}
                      width={step}
                      height={H - PAD.top}
                      fill="transparent"
                      tabIndex={0}
                      role="button"
                      aria-label={`${point.year}: ${num(point.plays)} plays${
                        point.entries !== null
                          ? `, ${num(point.entries)} transactions, ${rupees(point.spend ?? 0)} spent`
                          : ", no ledger data"
                      }`}
                      onMouseEnter={() => setHover(i)}
                      onMouseLeave={() => setHover(null)}
                      onFocus={() => setHover(i)}
                      onBlur={() => setHover(null)}
                    />
                  </g>
                );
              })}
            </svg>

            {/* readout */}
            <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
              <div className="flex flex-wrap gap-x-6 gap-y-1">
                <p className="flex items-center gap-2">
                  <span aria-hidden="true" className="inline-block h-0.5 w-5 bg-[var(--color-ink)]" />
                  <span className="annotation">Plays</span>
                </p>
                <p className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="inline-block h-0.5 w-5 bg-[var(--color-azure)]"
                  />
                  <span className="annotation">Transactions</span>
                </p>
              </div>
              <p className="tnum font-mono text-micro text-[var(--color-ink-2)]" aria-live="polite">
                {active
                  ? `${active.year} — ${num(active.plays)} plays${
                      active.entries !== null ? ` · ${num(active.entries)} transactions` : " · no ledger"
                    }`
                  : "Each series scaled to its own maximum"}
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
