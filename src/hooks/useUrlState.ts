import { useCallback, useEffect, useState } from "react";

/**
 * Keep a piece of UI state in the query string.
 *
 * The archive's search, filters and sort are the reader's position in 3,704
 * records. Holding that only in component state means a reload loses it and a
 * link cannot carry it — so a reader who finds something cannot show anyone.
 * Mirroring it into the URL makes every view addressable, and makes the browser
 * back button undo a filter, which is what people expect it to do.
 *
 * Written with `replaceState` while typing so the history stack does not gain
 * an entry per keystroke.
 *
 * @param key query parameter name
 * @param initial value used when the parameter is absent
 * @param options.push true to add a history entry instead of replacing
 */
export function useUrlState(
  key: string,
  initial: string,
  options: { push?: boolean } = {},
): [string, (next: string) => void] {
  const { push = false } = options;

  const read = useCallback((): string => {
    if (typeof window === "undefined") return initial;
    return new URLSearchParams(window.location.search).get(key) ?? initial;
  }, [key, initial]);

  const [value, setValue] = useState(read);

  // Follow the URL when the reader uses back or forward.
  useEffect(() => {
    const onPop = () => setValue(read());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [read]);

  const update = useCallback(
    (next: string) => {
      setValue(next);

      const params = new URLSearchParams(window.location.search);
      if (next === initial || next === "") params.delete(key);
      else params.set(key, next);

      const query = params.toString();
      const url = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;

      // History writes can throw in sandboxed frames; the UI must not break.
      try {
        if (push) window.history.pushState(null, "", url);
        else window.history.replaceState(null, "", url);
      } catch {
        // Address bar will not update; state still works.
      }
    },
    [key, initial, push],
  );

  return [value, update];
}
