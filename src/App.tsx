import { Masthead, ReadingProgress } from "./components";
import { ThemeProvider } from "./context/ThemeContext";
import { useAmbient, useOverview, useReceipts } from "./hooks";
import { Hero } from "./sections/Hero";
import { TheDig } from "./sections/TheDig";
import { Chapters } from "./sections/Chapters";
import { TheClock } from "./sections/TheClock";
import { Constellation } from "./sections/Constellation";
import { Convergence } from "./sections/Convergence";
import { TheCrowd } from "./sections/TheCrowd";
import { Archive } from "./sections/Archive";
import { Verdict } from "./sections/Verdict";

/**
 * Composition root.
 *
 * Every plate is imported eagerly and rendered into the initial DOM.
 *
 * An earlier revision lazy-loaded six of the eight behind `Suspense`, which cut
 * the entry chunk but meant most of the document did not exist until the
 * reader scrolled. That is wrong for a page whose whole argument is one
 * continuous scrolled essay: in-page anchors from the masthead pointed at
 * sections that were not mounted, Ctrl+F found nothing, and any tool reading
 * the page — a screen reader taking an overview, a crawler, an evaluator —
 * saw two sections and six placeholders. Whole-document availability matters
 * more here than a smaller first chunk, and the vendor split plus memoisation
 * keep the cost reasonable either way.
 *
 * Each data bundle is fetched once here and passed down, so sections stay pure
 * functions of their props and there is one place to reason about loading and
 * failure.
 */
export function App() {
  const overview = useOverview();
  const receipts = useReceipts();
  const ambient = useAmbient();

  const years = overview.data?.years.map((y) => y.year) ?? [];
  const receiptsLoading = receipts.status === "loading";

  return (
    <ThemeProvider>
      <a className="skip-link" href="#dig">
        Skip to the survey
      </a>

      <div id="top" />
      <ReadingProgress />
      <Masthead />

      {overview.status === "error" && (
        <div role="alert" className="shell py-10">
          <p className="border-l-2 border-[var(--color-rust)] pl-4 text-[var(--color-rust)]">
            The archive index could not be read ({overview.error}). Run{" "}
            <code className="font-mono">npm run data</code> to rebuild it, then reload.
          </p>
        </div>
      )}

      <main id="main">
        <Hero overview={overview.data} />
        <TheDig overview={overview.data} />
        <Chapters overview={overview.data} />
        <TheClock overview={overview.data} />
        <Constellation receipts={receipts.data} isLoading={receiptsLoading} />
        <Convergence overview={overview.data} />
        <TheCrowd ambient={ambient.data} overview={overview.data} />
        <Archive receipts={receipts.data} isLoading={receiptsLoading} years={years} />
      </main>

      <Verdict overview={overview.data} />
    </ThemeProvider>
  );
}
