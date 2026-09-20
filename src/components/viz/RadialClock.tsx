import { useId, useState } from "react";
import { hourLabel, num, peak } from "../../lib/format";

type Props = {
  /** 24 values, index 0 = midnight in the currently displayed timezone. */
  hours: number[];
  /** Highlighted spoke, if any. */
  selected: number | null;
  onSelect: (hour: number | null) => void;
  className?: string;
};

const SIZE = 420;
const CENTER = SIZE / 2;
const INNER = 62;
const OUTER = 186;

/** Polar to cartesian, with midnight at twelve o'clock. */
function polar(hour: number, radius: number): [number, number] {
  const angle = (hour / 24) * Math.PI * 2 - Math.PI / 2;
  return [CENTER + Math.cos(angle) * radius, CENTER + Math.sin(angle) * radius];
}

/**
 * Twenty-four hours as a dial.
 *
 * A bar chart would show the same numbers, but the point of this figure is
 * that a day is a *circle* — midnight sits next to 1am, and the subject's
 * listening piles up across that seam. A linear axis cuts exactly where the
 * story is.
 *
 * Every spoke is a real button: keyboard reachable, individually labelled, and
 * the whole figure has a table equivalent for screen readers.
 */
export function RadialClock({ hours, selected, onSelect, className }: Props) {
  const [hovered, setHovered] = useState<number | null>(null);
  const titleId = useId();
  const max = peak(hours) || 1;
  const active = hovered ?? selected;

  return (
    <div className={className}>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-labelledby={titleId} className="w-full">
        <title id={titleId}>
          Plays by hour of day. The largest hour is {hourLabel(hours.indexOf(peak(hours)))} with{" "}
          {num(peak(hours))} plays.
        </title>

        {/* guide rings */}
        <g stroke="currentColor" fill="none" opacity={0.16}>
          {[0.25, 0.5, 0.75, 1].map((r) => (
            <circle key={r} cx={CENTER} cy={CENTER} r={INNER + (OUTER - INNER) * r} strokeWidth={1} />
          ))}
        </g>

        {/* the night band, 22:00 to 05:00, drawn behind the spokes */}
        <path
          d={[
            `M ${polar(22, INNER - 6).join(" ")}`,
            `L ${polar(22, OUTER + 14).join(" ")}`,
            `A ${OUTER + 14} ${OUTER + 14} 0 0 1 ${polar(29, OUTER + 14).join(" ")}`,
            `L ${polar(29, INNER - 6).join(" ")}`,
            `A ${INNER - 6} ${INNER - 6} 0 0 0 ${polar(22, INNER - 6).join(" ")}`,
            "Z",
          ].join(" ")}
          fill="var(--color-ink)"
          opacity={0.07}
        />

        {/* spokes */}
        {hours.map((value, hour) => {
          const length = INNER + (value / max) * (OUTER - INNER);
          const [x1, y1] = polar(hour, INNER);
          const [x2, y2] = polar(hour, length);
          const isActive = active === hour;
          const isNight = hour >= 22 || hour < 5;

          return (
            <g key={hour}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={isActive ? "var(--color-azure)" : isNight ? "var(--color-ochre)" : "currentColor"}
                strokeWidth={isActive ? 13 : 10}
                strokeLinecap="round"
                opacity={isActive ? 1 : isNight ? 0.85 : 0.5}
                style={{ transition: "stroke-width 160ms var(--ease-out-expo), opacity 160ms" }}
              />
              {/* Generous invisible hit area — the visible spoke is too thin to click. */}
              <line
                x1={x1}
                y1={y1}
                x2={polar(hour, OUTER + 10)[0]}
                y2={polar(hour, OUTER + 10)[1]}
                stroke="transparent"
                strokeWidth={22}
                className="cursor-pointer"
                role="button"
                tabIndex={0}
                aria-label={`${hourLabel(hour)}, ${num(value)} plays`}
                aria-pressed={selected === hour}
                onMouseEnter={() => setHovered(hour)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(hour)}
                onBlur={() => setHovered(null)}
                onClick={() => onSelect(selected === hour ? null : hour)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(selected === hour ? null : hour);
                  }
                }}
              />
            </g>
          );
        })}

        {/* hour ticks */}
        <g fontFamily="var(--font-mono)" fontSize={10} fill="var(--color-ink-3)">
          {[0, 3, 6, 9, 12, 15, 18, 21].map((hour) => {
            const [x, y] = polar(hour, OUTER + 26);
            return (
              <text key={hour} x={x} y={y} textAnchor="middle" dominantBaseline="middle">
                {hourLabel(hour)}
              </text>
            );
          })}
        </g>

        {/* centre readout */}
        <g textAnchor="middle">
          {active === null ? (
            <>
              <text
                x={CENTER}
                y={CENTER - 6}
                fontFamily="var(--font-display)"
                fontSize={30}
                fill="var(--color-ink)"
              >
                24H
              </text>
              <text
                x={CENTER}
                y={CENTER + 16}
                fontFamily="var(--font-mono)"
                fontSize={9}
                letterSpacing="0.14em"
                fill="var(--color-ink-3)"
              >
                HOVER A SPOKE
              </text>
            </>
          ) : (
            <>
              <text
                x={CENTER}
                y={CENTER - 10}
                fontFamily="var(--font-display)"
                fontSize={28}
                fill="var(--color-azure)"
              >
                {hourLabel(active)}
              </text>
              <text
                x={CENTER}
                y={CENTER + 14}
                fontFamily="var(--font-mono)"
                fontSize={13}
                fill="var(--color-ink)"
              >
                {num(hours[active] ?? 0)}
              </text>
              <text
                x={CENTER}
                y={CENTER + 30}
                fontFamily="var(--font-mono)"
                fontSize={8.5}
                letterSpacing="0.14em"
                fill="var(--color-ink-3)"
              >
                PLAYS
              </text>
            </>
          )}
        </g>
      </svg>

      {/* Non-visual equivalent. The dial is decorative for a screen reader; this
          table is the actual data. */}
      <table className="sr-only">
        <caption>Plays by hour of day</caption>
        <thead>
          <tr>
            <th scope="col">Hour</th>
            <th scope="col">Plays</th>
          </tr>
        </thead>
        <tbody>
          {hours.map((value, hour) => (
            <tr key={hour}>
              <th scope="row">{hourLabel(hour)}</th>
              <td>{num(value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
