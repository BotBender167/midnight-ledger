import { useId } from "react";
import type { Connection } from "../../lib/connections";
import type { Receipt } from "../../types/archive";
import { KIND_COLOR, KIND_LABEL, clockTime, longDate } from "../../lib/format";

type Props = {
  anchor: Receipt;
  connections: Connection[];
  onSelect: (receipt: Receipt) => void;
  windowDays: number;
};

const SIZE = 560;
const C = SIZE / 2;
const R_MIN = 96;
const R_MAX = 232;

/**
 * Place a link around the anchor.
 *
 * Angle carries *time*: earlier records swing left of vertical, later ones
 * right, so the shape of a moment is legible before any label is read.
 * Radius carries *strength*: the strongest links sit closest in.
 */
function place(connection: Connection, windowDays: number): [number, number] {
  const timeRatio = Math.max(-1, Math.min(1, connection.dayOffset / windowDays));
  // Spread across 300° so nothing collides with the legend directly below.
  const angle = timeRatio * (Math.PI * 0.83) - Math.PI / 2;
  const radius = R_MAX - (R_MAX - R_MIN) * connection.score;
  return [C + Math.cos(angle) * radius, C + Math.sin(angle) * radius];
}

/**
 * The constellation.
 *
 * Renders one anchor and the records that plausibly share its moment. Each
 * node is a button, so the whole figure is traversable by keyboard and any
 * node can become the next anchor — which is what turns a single lookup into
 * exploration.
 */
export function ConstellationGraph({ anchor, connections, onSelect, windowDays }: Props) {
  const titleId = useId();
  const crossings = connections.filter((c) => c.crossesArchives).length;

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      role="img"
      aria-labelledby={titleId}
      className="w-full overflow-visible"
    >
      <title id={titleId}>
        {`${connections.length} records fall within ${windowDays} days of the selected receipt, ${crossings} of them from the other archive.`}
      </title>

      {/* window rings */}
      <g fill="none" stroke="currentColor" opacity={0.13}>
        <circle cx={C} cy={C} r={R_MIN} />
        <circle cx={C} cy={C} r={(R_MIN + R_MAX) / 2} />
        <circle cx={C} cy={C} r={R_MAX} />
      </g>

      {/* the time axis: earlier to the left, later to the right */}
      <g stroke="currentColor" opacity={0.2} strokeDasharray="3 5">
        <line x1={C - R_MAX} y1={C} x2={C + R_MAX} y2={C} />
      </g>
      <g fontFamily="var(--font-mono)" fontSize={9} fill="var(--color-ink-3)" letterSpacing="0.12em">
        <text x={C - R_MAX - 4} y={C - 8}>
          −{windowDays}D
        </text>
        <text x={C + R_MAX + 4} y={C - 8} textAnchor="end">
          +{windowDays}D
        </text>
      </g>

      {/* links */}
      <g>
        {connections.map((connection) => {
          const [x, y] = place(connection, windowDays);
          return (
            <line
              key={`link-${connection.receipt.id}`}
              x1={C}
              y1={C}
              x2={x}
              y2={y}
              stroke={connection.crossesArchives ? "var(--color-azure)" : "currentColor"}
              strokeWidth={connection.crossesArchives ? 1.6 : 1}
              opacity={connection.crossesArchives ? 0.7 : 0.28}
              strokeDasharray={connection.crossesArchives ? undefined : "2 4"}
            />
          );
        })}
      </g>

      {/* nodes */}
      <g>
        {connections.map((connection) => {
          const [x, y] = place(connection, windowDays);
          const { receipt } = connection;
          const radius = 7 + connection.score * 7;

          return (
            <g key={receipt.id} className="cursor-pointer">
              <circle
                cx={x}
                cy={y}
                r={radius}
                fill={KIND_COLOR[receipt.kind] ?? "currentColor"}
                opacity={0.9}
              />
              {connection.crossesArchives && (
                <circle
                  cx={x}
                  cy={y}
                  r={radius + 5}
                  fill="none"
                  stroke="var(--color-azure)"
                  strokeWidth={1.2}
                  opacity={0.6}
                />
              )}
              {/* Hit target sized for a fingertip, not for the dot. */}
              <circle
                cx={x}
                cy={y}
                r={Math.max(22, radius + 12)}
                fill="transparent"
                role="button"
                tabIndex={0}
                aria-label={`${KIND_LABEL[receipt.kind] ?? receipt.kind}: ${receipt.title}, ${longDate(receipt.ts)}. ${connection.reason}. Select to explore from here.`}
                onClick={() => onSelect(receipt)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(receipt);
                  }
                }}
              />
            </g>
          );
        })}
      </g>

      {/* anchor */}
      <g>
        <circle cx={C} cy={C} r={34} fill="var(--color-paper)" />
        <circle
          cx={C}
          cy={C}
          r={34}
          fill="none"
          stroke="var(--color-azure)"
          strokeWidth={2.5}
        />
        <circle
          className="anim-ring"
          cx={C}
          cy={C}
          r={34}
          fill="none"
          stroke="var(--color-azure)"
          strokeWidth={1.5}
          style={{ transformOrigin: `${C}px ${C}px` }}
        />
        <text
          x={C}
          y={C - 3}
          textAnchor="middle"
          fontFamily="var(--font-mono)"
          fontSize={10}
          fontWeight={600}
          fill="var(--color-ink)"
        >
          {clockTime(anchor.ts)}
        </text>
        <text
          x={C}
          y={C + 11}
          textAnchor="middle"
          fontFamily="var(--font-mono)"
          fontSize={8}
          fill="var(--color-ink-3)"
        >
          {anchor.ts.slice(0, 10)}
        </text>
      </g>
    </svg>
  );
}
