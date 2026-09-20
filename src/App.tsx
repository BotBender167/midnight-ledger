import { Suspense, lazy } from "react";
import { Masthead, SectionFallback } from "./components";
import { ThemeProvider } from "./context/ThemeContext";
import { useAmbient, useOverview, useReceipts } from "./hooks";
import { Hero } from "./sections/Hero";
import { TheDig } from "./sections/TheDig";

/**
 * Below-fold sections are split into their own chunks.
 *
 * Hero and TheDig are the only things a reader sees before scrolling, so only
 * those two need to be in the entry bundle. The rest — including the two
 * heaviest figures, the constellation graph and the radial clock — arrive as
 * separate chunks while the reader is still on the first screen. This is what
 * keeps the initial parse small without any section losing functionality.
 */
const Chapters = lazy(() => import("./sections/Chapters").then((m) => ({ default: m.Chapters })));
const TheClock = lazy(() => import("./sections/TheClock").then((m) => ({ default: m.TheClock })));
const Constellation = lazy(() =>
  import("./sections/Constellation").then((m) => ({ default: m.Constellation })),
);
const Convergence = lazy(() =>
  import("./sections/Convergence").then((m) => ({ default: m.Convergence })),
);
const TheCrowd = lazy(() => import("./sections/TheCrowd").then((m) => ({ default: m.TheCrowd })));
const Archive = lazy(() => import("./sections/Archive").then((m) => ({ default: m.Archive })));
const Verdict = lazy(() => import("./sections/Verdict").then((m) => ({ default: m.Verdict })));

/**
 * Composition root.
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

        <Suspense fallback={<SectionFallback label="Plate III · Six chapters" />}>
          <Chapters overview={overview.data} />
        </Suspense>

        <Suspense fallback={<SectionFallback label="Plate IV · The clock" />}>
          <TheClock overview={overview.data} />
        </Suspense>

        <Suspense fallback={<SectionFallback label="Plate V · The constellation" />}>
          <Constellation receipts={receipts.data} isLoading={receiptsLoading} />
        </Suspense>

        <Suspense fallback={<SectionFallback label="Plate VI · The convergence" />}>
          <Convergence overview={overview.data} />
        </Suspense>

        <Suspense fallback={<SectionFallback label="Plate VI½ · The crowd" />}>
          <TheCrowd ambient={ambient.data} overview={overview.data} />
        </Suspense>

        <Suspense fallback={<SectionFallback label="Plate VII · The archive" />}>
          <Archive receipts={receipts.data} isLoading={receiptsLoading} years={years} />
        </Suspense>
      </main>

      <Suspense fallback={<SectionFallback label="Plate VIII · The verdict" />}>
        <Verdict overview={overview.data} />
      </Suspense>
    </ThemeProvider>
  );
}
