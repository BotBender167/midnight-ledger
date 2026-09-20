import { Reveal } from "../components/Reveal";
import type { Overview } from "../types/archive";
import { hourLabel, num } from "../lib/format";

type Props = {
  overview: Overview | null;
};

/**
 * The closing argument.
 *
 * The finding the whole build was for: across the six detected chapters, as
 * yearly volume falls the peak listening hour moves later into the night. The
 * loud years were evening years; the quiet ones are 2am years. Nothing in the
 * source says this — it only appears once the eras are detected and their hour
 * curves are laid side by side.
 */
export function Verdict({ overview }: Props) {
  const chapters = overview?.chapters ?? [];
  if (chapters.length === 0) {
    return <footer className="section" aria-hidden="true" />;
  }

  const loudest = chapters.reduce((a, b) => (b.plays > a.plays ? b : a));
  const quietest = chapters.reduce((a, b) => (b.plays < a.plays ? b : a));
  const last = chapters[chapters.length - 1]!;

  return (
    <footer className="section border-t border-[color-mix(in_oklab,var(--color-ink)_16%,transparent)]">
      <div className="shell">
        <Reveal from="none" className="flex items-baseline justify-between gap-6">
          <p className="annotation">Plate VIII · The verdict</p>
          <p className="annotation hidden sm:block">What it all means</p>
        </Reveal>
        <Reveal from="none" stagger={1}>
          <hr className="rule mt-3" />
        </Reveal>

        <Reveal className="mt-12 max-w-[44rem]">
          <h2 className="font-display text-h2">The quieter it got, the later it got</h2>
          <p className="mt-6 text-lead leading-[1.35] text-[var(--color-ink-2)]">
            In {loudest.start}, the loudest year in the archive, the peak hour was{" "}
            <strong className="text-[var(--color-ink)]">{hourLabel(loudest.peakHour)}</strong> —
            music after work, like everybody else. By {last.start}–{last.end}, with the volume down
            to a fraction, the peak had slid to{" "}
            <strong className="text-[var(--color-azure)]">{hourLabel(last.peakHour)}</strong>.
          </p>
          <p className="mt-5 text-body text-[var(--color-ink-2)]">
            Listening less, and listening later. Whatever the music was for in {loudest.start}, by
            the end it was something done alone, in the middle of the night, by someone who did not
            stop so much as thin out.
          </p>
        </Reveal>

        {/* ── Peak-hour drift ───────────────────────────────────────────── */}
        <Reveal stagger={2} className="mt-12">
          <ol className="grid gap-px border border-[color-mix(in_oklab,var(--color-ink)_16%,transparent)] bg-[color-mix(in_oklab,var(--color-ink)_16%,transparent)] sm:grid-cols-3 lg:grid-cols-6">
            {chapters.map((chapter) => (
              <li key={chapter.start} className="bg-[var(--color-paper)] p-4">
                <p className="annotation">
                  {chapter.start}
                  {chapter.end !== chapter.start ? `–${chapter.end}` : ""}
                </p>
                <p className="tnum mt-2 font-display text-[1.75rem] leading-none text-[var(--color-ochre)]">
                  {hourLabel(chapter.peakHour)}
                </p>
                <p className="mt-2 text-micro text-[var(--color-ink-3)]">{chapter.title}</p>
                <div
                  className="mt-3 h-0.5 bg-[color-mix(in_oklab,var(--color-ink)_14%,transparent)]"
                  role="img"
                  aria-label={`${num(chapter.plays)} plays`}
                >
                  <div
                    className="h-full bg-[var(--color-azure)]"
                    style={{ width: `${(chapter.plays / loudest.plays) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ol>
          <p className="annotation mt-3">
            Peak listening hour per chapter · bar is volume relative to {loudest.start}
          </p>
        </Reveal>

        {/* ── The honest ending ─────────────────────────────────────────── */}
        <Reveal stagger={3} className="mt-16 grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <h3 className="font-display text-h3">So: one person, or three?</h3>
            <p className="mt-4 text-body text-[var(--color-ink-2)]">
              Archive C is certainly not the subject. Archives A and B might be — they peak
              together in 2017 and they overlap for four years. But A listens to Liverpool and
              Nashville while B buys idli and celebrates Ganesh Chaturthi, and nothing in either
              file names a person.
            </p>
            <p className="mt-4 text-body text-[var(--color-ink-2)]">
              The honest answer is that the data does not say. What it does say is that someone,
              somewhere, spent {num(overview?.listening.hours ?? 0)} hours listening —{" "}
              {quietest.start === last.start ? "right" : "all"} the way to {last.end} — and got
              quieter and later every year.
            </p>
          </div>

          <div className="border-l-2 border-[var(--color-azure)] pl-6">
            <p className="annotation">Sources</p>
            <ul className="mt-3 grid gap-2 text-label text-[var(--color-ink-2)]">
              <li>A · Spotify streaming history, {num(overview?.listening.plays ?? 0)} plays, 2013–2024</li>
              <li>B · Daily household transactions, {num(overview?.spending.entries ?? 0)} entries, 2015–2018</li>
              <li>C · India card transactions, {num(overview?.ambient.rows ?? 0)} rows, 2022–2024</li>
            </ul>
            <p className="mt-6 text-micro text-[var(--color-ink-3)]">
              Chapter boundaries, hour curves, peaks and connections are computed from these files
              at build time. Chapter titles and the prose are written. No figure on this page is
              invented.
            </p>
            <p className="mt-6">
              <a
                href="#top"
                className="control inline-block no-underline"
              >
                Back to the top
              </a>
            </p>
          </div>
        </Reveal>
      </div>
    </footer>
  );
}
