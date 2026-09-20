import type { Receipt } from "../types/archive";
import { KIND_COLOR, KIND_LABEL, clockTime, longDate, rupees } from "../lib/format";

type Props = {
  receipt: Receipt;
  isSelected?: boolean;
  onSelect?: (receipt: Receipt) => void;
  /** Sentence explaining why this slip is being shown next to another one. */
  reason?: string;
};

/**
 * One receipt, as a torn paper slip.
 *
 * Renders as a `button` whenever it is selectable, so keyboard and screen
 * reader users get the same affordance as a mouse — no div-with-onClick.
 */
export function ReceiptSlip({ receipt, isSelected = false, onSelect, reason }: Props) {
  const interactive = typeof onSelect === "function";
  const Tag = interactive ? "button" : "div";

  return (
    <Tag
      {...(interactive
        ? {
            type: "button" as const,
            onClick: () => onSelect(receipt),
            "aria-pressed": isSelected,
          }
        : {})}
      className="slip block"
    >
      <span className="flex items-start justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden="true"
            className="mt-0.5 inline-block size-2 shrink-0"
            style={{ background: KIND_COLOR[receipt.kind] ?? "currentColor" }}
          />
          <span className="annotation truncate">{KIND_LABEL[receipt.kind] ?? receipt.kind}</span>
        </span>
        <span className="annotation tnum shrink-0">{clockTime(receipt.ts)}</span>
      </span>

      <span className="mt-1.5 block truncate font-display text-[1.05rem] leading-tight">
        {receipt.title}
      </span>

      {receipt.subtitle && (
        <span className="mt-0.5 block truncate text-label text-[var(--color-ink-2)]">
          {receipt.subtitle}
        </span>
      )}

      <span className="mt-2 flex items-baseline justify-between gap-3">
        <span className="annotation">{longDate(receipt.ts)}</span>
        {typeof receipt.amount === "number" && receipt.amount !== 0 && (
          <span
            className={`tnum font-mono text-micro ${
              receipt.amount < 0 ? "text-[var(--color-moss)]" : "text-[var(--color-ink-2)]"
            }`}
          >
            {receipt.amount < 0 ? "+" : "−"}
            {rupees(receipt.amount)}
          </span>
        )}
      </span>

      {reason && (
        <span className="mt-2 block border-t border-[color-mix(in_oklab,var(--color-ink)_14%,transparent)] pt-2 text-micro text-[var(--color-azure)]">
          {reason}
        </span>
      )}
    </Tag>
  );
}
