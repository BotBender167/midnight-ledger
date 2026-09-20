import { Masthead } from "./components/Masthead";
import { Hero } from "./sections/Hero";
import { TheDig } from "./sections/TheDig";
import { Chapters } from "./sections/Chapters";
import { TheClock } from "./sections/TheClock";
import { Constellation } from "./sections/Constellation";
import { Convergence } from "./sections/Convergence";
import { TheCrowd } from "./sections/TheCrowd";
import { Archive } from "./sections/Archive";
import { Verdict } from "./sections/Verdict";
import { useAmbient, useOverview, useReceipts } from "./hooks/useDataset";

/**
 * Composition root.
 *
 * Each bundle is fetched once here and passed down, so sections stay pure
 * functions of their props and there is a single place to reason about loading
 * and failure. The receipts bundle is the large one; sections that need it
 * render their own loading state rather than blocking the page.
 */
export function App() {
  const overview = useOverview();
  const receipts = useReceipts();
  const ambient = useAmbient();

  const years = overview.data?.years.map((y) => y.year) ?? [];

  return (
    <>
      <a className="skip-link" href="#dig">
        Skip to the survey
      </a>

      <div id="top" />
      <Masthead />

      {overview.status === "error" && (
        <div role="alert" className="shell py-10">
          <p className="border-l-2 border-[var(--color-rust)] pl-4 text-[var(--color-rust)]">
            The archive index could not be read ({overview.error}). Run{" "}
            <code className="font-mono">npm run data</code> to rebuild it, then reload.
          </p>
        </div>
      )}

      <main>
        <Hero overview={overview.data} />
        <TheDig overview={overview.data} />
        <Chapters overview={overview.data} />
        <TheClock overview={overview.data} />
        <Constellation receipts={receipts.data} isLoading={receipts.status === "loading"} />
        <Convergence overview={overview.data} />
        <TheCrowd ambient={ambient.data} overview={overview.data} />
        <Archive
          receipts={receipts.data}
          isLoading={receipts.status === "loading"}
          years={years}
        />
      </main>

      <Verdict overview={overview.data} />
    </>
  );
}
