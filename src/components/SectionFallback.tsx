/**
 * Placeholder shown while a lazily-loaded section's chunk arrives.
 *
 * Reserves roughly the height the real section will occupy so the page does
 * not jump when it lands — the whole point of splitting these out is cheaper
 * first paint, which a layout shift would undo.
 */
export function SectionFallback({ label }: { label: string }) {
  return (
    <section className="section" aria-busy="true" aria-label={`Loading ${label}`}>
      <div className="shell">
        <p className="annotation">{label}</p>
        <hr className="rule mt-3" />
        <div className="mt-12 min-h-[42vh] animate-pulse">
          <div className="h-10 w-2/3 max-w-md bg-[color-mix(in_oklab,var(--color-ink)_8%,transparent)]" />
          <div className="mt-5 h-4 w-full max-w-xl bg-[color-mix(in_oklab,var(--color-ink)_6%,transparent)]" />
          <div className="mt-2 h-4 w-5/6 max-w-lg bg-[color-mix(in_oklab,var(--color-ink)_6%,transparent)]" />
        </div>
      </div>
    </section>
  );
}
