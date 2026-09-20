import { useEffect, useState } from "react";
import type { Ambient, DayRecord, Overview, Receipt } from "../types/archive";
import { createCorpus } from "../lib/connections";

/**
 * Dataset loading.
 *
 * Split into two requests on purpose. `overview.json` is 14 KB and everything
 * above the fold needs it, so it blocks first paint and is preloaded from the
 * document head. `receipts.json` is 900 KB and only the archive and
 * constellation touch it, so it is fetched after mount and the sections that
 * need it render a real loading state instead of holding up the hero.
 */

export type LoadState<T> =
  | { status: "loading"; data: null; error: null }
  | { status: "ready"; data: T; error: null }
  | { status: "error"; data: null; error: string };

const BASE = `${import.meta.env.BASE_URL}data`;

async function getJSON<T>(path: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(path, { signal });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return (await response.json()) as T;
}

function useJSON<T>(file: string, transform?: (raw: T) => T): LoadState<T> {
  const [state, setState] = useState<LoadState<T>>({ status: "loading", data: null, error: null });

  useEffect(() => {
    const controller = new AbortController();

    getJSON<T>(`${BASE}/${file}`, controller.signal)
      .then((raw) => setState({ status: "ready", data: transform ? transform(raw) : raw, error: null }))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          status: "error",
          data: null,
          error: err instanceof Error ? err.message : "Could not read the archive.",
        });
      });

    return () => controller.abort();
    // `transform` is stable by construction (module-scope functions only).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  return state;
}

/** Headline figures, chapters and year curves. Small; blocks first paint. */
export const useOverview = (): LoadState<Overview> => useJSON<Overview>("overview.json");

/** The 3,704 receipts. Large; loaded after mount, sorted for the connection index. */
export const useReceipts = (): LoadState<Receipt[]> =>
  useJSON<Receipt[]>("receipts.json", createCorpus);

/** Per-day listening and spend. Drives the density ribbon. */
export const useDays = (): LoadState<DayRecord[]> => useJSON<DayRecord[]>("days.json");

/** Archive C aggregates — the crowd. */
export const useAmbient = (): LoadState<Ambient> => useJSON<Ambient>("ambient.json");
