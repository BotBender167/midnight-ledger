import { Reveal } from "../components/Reveal";
import type { Chapter, Overview } from "../types/archive";
import { hourLabel, num, peak } from "../lib/format";

/**
 * A chapter's 24-hour fingerprint, drawn small.
 *
 * Repeated at the same scale beside every chapter so the six can be compared
 * at a glance — the shape migrating rightward across the page is the finding.
 */
function HourFingerprint({ hours, label }: { hours: number[]; label: string }) {
  const max = peak(hours) || 1;

  return (
    <svg
      viewBox="0 0 240 56"
      className="w-full"
      role="img"
      aria-label={`Hour-of-day fingerprint for ${label}`}
    >
      {hours.map((value, hour) => {
        const height = Math.max(1.5, (value / max) * 46);
        const isNight = hour >= 22 || hour < 5;
        return (
          <rect
            key={hour}
            x={hour * 10 + 1}
            y={52 - height}
            width={7}
            height={height}
            fill={isNight ? "var(--color-ochre)" : "currentColor"}
            opacity={isNight ? 0.95 : 0.4}
          />
        );
      })}
      <line x1={0} y1={53} x2={240} y2={53} stroke="currentColor" strokeWidth={0.75} opacity={0.3} />
    </svg>
  );
}

function ChapterPanel({ chapter, index }: { chapter: Chapter; index: number }) {
  const flip = index % 2 === 1;

  return (
    <Reveal
      as="article"
      from={flip ? "right" : "left"}
      className="grid gap-8 border-t border-[color-mix(in_oklab,var(--color-ink)_16%,transparent)] py-12 lg:grid-cols-[minmax(0,7rem)_minmax(0,1fr)_minmax(0,17rem)] lg:gap-12 lg:py-16"
    >
      {/* ── Numeral ─────────────────────────────────────────────────────── */}
      <div className="flex items-baseline gap-4 lg:block">
        <p
          aria-hidden="true"
          className="font-display text-[3.5rem] leading-[0.75] text-[var(--color-azure)] lg:text-[5rem]"
        >
          {String(index + 1).padStart(2, "0")}
        </p>
        <p className="annotation lg:mt-3">
          {chapter.start}
          {chapter.end !== chapter.start ? `–${chapter.end}` : ""}
        </p>
      </div>

      {/* ── Narrative ───────────────────────────────────────────────────── */}
      <div className="min-w-0">
        <h3 className="font-display text-h3">{chapter.title}</h3>
        <p className="mt-4 max-w-[38rem] text-body text-[var(--color-ink-2)]">{chapter.line}</p>

        <ul className="mt-6 flex flex-wrap gap-x-2 gap-y-2">
          {chapter.topArtists.map((artist) => (
            <li
              key={artist.name}
              className="border border-[color-mix(in_oklab,var(--color-ink)_18%,transparent)] px-2.5 py-1 font-mono text-micro"
            >
              {artist.name}
              <span className="tnum ml-2 text-[var(--color-ink-3)]">{num(artist.count)}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* ── Evidence ────────────────────────────────────────────────────── */}
      <div className="lg:text-right">
        <div className="text-[var(--color-ink-2)]">
          <HourFingerprint hours={chapter.hours24} label={chapter.title} />
        </div>

        <dl className="mt-4 grid grid-cols-3 gap-3 lg:grid-cols-1 lg:gap-2">
          <div className="lg:flex lg:items-baseline lg:justify-between lg:gap-4">
            <dt className="annotation">Plays</dt>
            <dd className="tnum font-mono text-label">{num(chapter.plays)}</dd>
          </div>
          <div className="lg:flex lg:items-baseline lg:justify-between lg:gap-4">
            <dt className="annotation">Peak</dt>
            <dd className="tnum font-mono text-label text-[var(--color-ochre)]">
              {hourLabel(chapter.peakHour)}
            </dd>
          </div>
          <div className="lg:flex lg:items-baseline lg:justify-between lg:gap-4">
            <dt className="annotation">After dark</dt>
            <dd className="tnum font-mono text-label">{chapter.nightShare}%</dd>
          </div>
        </dl>

        {/* Share of the whole archive, as a bar rather than another number. */}
        <div
          className="mt-4 h-1 w-full bg-[color-mix(in_oklab,var(--color-ink)_14%,transparent)]"
          role="img"
          aria-label={`${chapter.share}% of all plays`}
        >
          <div className="h-full bg-[var(--color-azure)]" style={{ width: `${chapter.share}%` }} />
        </div>
        <p className="annotation mt-1.5">{chapter.share}% of the archive</p>
      </div>
    </Reveal>
  );
}

type Props = {
  overview: Overview | null;
};

/**
 * The chapters.
 *
 * Boundaries here are detected, not chosen: a year opens a new chapter when
 * volume breaks a stability band, drifts too far from the era's opening year,
 * or the dominant artist changes alongside a real shift in volume. Titles and
 * opening lines are authored. The README says which is which.
 */
export function Chapters({ overview }: Props) {
  const chapters = overview?.chapters ?? [];

  return (
    <section id="chapters" className="section" aria-labelledby="chapters-title">
      <div className="shell">
        <Reveal from="none" className="flex items-baseline justify-between gap-6">
          <p className="annotation">Plate III · Six chapters</p>
          <p className="annotation hidden sm:block">Boundaries detected, not chosen</p>
        </Reveal>
        <Reveal from="none" stagger={1}>
          <hr className="rule mt-3" />
        </Reveal>

        <Reveal className="mt-12 max-w-[42rem]">
          <h2 id="chapters-title" className="font-display text-h2">
            The archive divides itself
          </h2>
          <p className="mt-5 text-body text-[var(--color-ink-2)]">
            Nobody drew these lines. A change-point pass over eleven years of listening found them:
            six eras, each with its own volume, its own dominant artist, and its own hour of the
            night. Watch the orange band slide right as the years go on.
          </p>
        </Reveal>

        <div className="mt-10">
          {chapters.map((chapter, i) => (
            <ChapterPanel key={chapter.start} chapter={chapter} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
