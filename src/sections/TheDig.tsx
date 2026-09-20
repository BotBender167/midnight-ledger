import { Counter } from "../components/Counter";
import { Reveal } from "../components/Reveal";
import type { Overview } from "../types/archive";
import { num, rupees } from "../lib/format";

type ArchiveCard = {
  sigil: string;
  name: string;
  records: number;
  span: string;
  note: string;
  verdict: string;
  trusted: boolean;
};

function buildCards(overview: Overview): ArchiveCard[] {
  const { listening, spending, ambient } = overview;

  return [
    {
      sigil: "A",
      name: "Listening",
      records: listening.plays,
      span: `${listening.first.slice(0, 4)}–${listening.last.slice(0, 4)}`,
      note: `${num(listening.tracks)} tracks · ${num(listening.artists)} artists · ${num(listening.hours)} hours`,
      verdict: "One account, one consistent device history. Almost certainly one person.",
      trusted: true,
    },
    {
      sigil: "B",
      name: "Household ledger",
      records: spending.entries,
      span: `${spending.first.slice(0, 4)}–${spending.last.slice(0, 4)}`,
      note: `${rupees(spending.spent)} out · ${rupees(spending.earned)} in · places anonymised`,
      verdict: "One household, in India. Whether it is archive A's household is the whole question.",
      trusted: true,
    },
    {
      sigil: "C",
      name: "The crowd",
      records: ambient.rows,
      span: `${ambient.span.first.slice(0, 4)}–${ambient.span.last.slice(0, 4)}`,
      note: `${num(ambient.usable)} rows usable · ~${Math.round(100 - ambient.completeness.city)}% missing a city or category`,
      verdict: "Ten thousand different cardholders. Never the subject — only the weather around them.",
      trusted: false,
    },
  ];
}

type Props = {
  overview: Overview | null;
};

/**
 * The inventory.
 *
 * Before any storytelling, an honest accounting of what is in the boxes —
 * including the part that undermines the premise. Archive C is marked
 * untrusted on its own card rather than quietly blended into the story.
 */
export function TheDig({ overview }: Props) {
  const cards = overview ? buildCards(overview) : [];

  return (
    <section id="dig" className="section" aria-labelledby="dig-title">
      <div className="shell">
        <Reveal from="none" className="flex items-baseline justify-between gap-6">
          <p className="annotation">Plate II · The inventory</p>
          <p className="annotation hidden sm:block">What is actually in the boxes</p>
        </Reveal>
        <Reveal from="none" stagger={1}>
          <hr className="rule mt-3 mb-12" />
        </Reveal>

        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-16">
          <div>
            <Reveal>
              <h2 id="dig-title" className="font-display text-h2">
                <Counter to={overview?.counts.totalRecords ?? 162588} />
                <span className="block text-[var(--color-ink-3)]">records</span>
              </h2>
            </Reveal>

            <Reveal stagger={2} className="mt-6 max-w-[32rem]">
              <p className="text-body text-[var(--color-ink-2)]">
                Three files arrived with no names attached. Two of them read like a single life.
                The third is ten thousand other people, and it is kept separate for exactly that
                reason.
              </p>
            </Reveal>

            <Reveal stagger={3} className="mt-10">
              <p className="annotation mb-2">Where the archives overlap</p>
              <p className="font-display text-h3 tnum">
                {overview ? `${overview.overlap.start} → ${overview.overlap.end}` : "—"}
              </p>
              <p className="mt-3 max-w-[30rem] text-label text-[var(--color-ink-3)]">
                Only inside this window can listening and spending be compared at all. Everything
                outside it is one archive talking to itself.
              </p>
            </Reveal>
          </div>

          <ul className="grid gap-4">
            {cards.map((card, i) => (
              <Reveal
                as="li"
                key={card.sigil}
                stagger={i + 1}
                from="right"
                className="border border-[color-mix(in_oklab,var(--color-ink)_16%,transparent)] bg-[var(--color-paper-2)] p-5 sm:p-6"
              >
                <div className="flex items-start gap-4 sm:gap-6">
                  <span
                    aria-hidden="true"
                    className="font-display text-[2.75rem] leading-[0.8] text-[var(--color-azure)] sm:text-[3.5rem]"
                  >
                    {card.sigil}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <h3 className="font-display text-[1.3rem]">{card.name}</h3>
                      <p className="annotation">{card.span}</p>
                    </div>
                    <p className="tnum mt-1.5 font-mono text-label">{num(card.records)} records</p>
                    <p className="mt-2 font-mono text-micro text-[var(--color-ink-3)]">
                      {card.note}
                    </p>
                    <p
                      className={`mt-3 border-l-2 pl-3 text-label ${
                        card.trusted
                          ? "border-[var(--color-moss)] text-[var(--color-ink-2)]"
                          : "border-[var(--color-rust)] text-[var(--color-rust)]"
                      }`}
                    >
                      {card.verdict}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
