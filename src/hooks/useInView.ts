import { useEffect, useRef, useState } from "react";

/**
 * Scroll-arrival detection, pooled and fail-safe.
 *
 * Two things matter here beyond "does the element intersect".
 *
 * Pooling: every scene, card and chart on the page registers. One observer per
 * element would mean well over a hundred of them, and the browser batches
 * callbacks per observer, so sharing one per (rootMargin, threshold) pair
 * keeps the work flat however many elements register.
 *
 * The failsafe: elements start hidden so the entrance has somewhere to move
 * from, which means a scroll observer that never reports leaves the entire
 * page blank. That is not hypothetical — IntersectionObserver does not run
 * while a document is not being rendered, which covers background tabs and
 * some headless capture tools. So the first pool starts a health check: if no
 * callback has arrived for any element within the grace period, observation is
 * declared broken and everything is revealed at once. Normal browsers fire on
 * the frame after `observe()`, so the healthy path is never delayed.
 */
import { OBSERVER_HEALTH_GRACE_MS as HEALTH_GRACE_MS } from "../constants/ui";

type Callback = (entry: IntersectionObserverEntry) => void;

type Pool = { observer: IntersectionObserver; callbacks: Map<Element, Callback> };

const pools = new Map<string, Pool>();

/** Set once any observer reports; stops the failsafe from second-guessing it. */
let observerHealthy = false;
/** Set when the grace period expires with no callback. Latches on. */
let observerBroken = false;
/** Elements waiting to be told the observer never worked. */
const failsafeListeners = new Set<() => void>();
let healthTimer: number | undefined;

function startHealthCheck() {
  if (healthTimer !== undefined || observerHealthy || observerBroken) return;
  healthTimer = window.setTimeout(() => {
    if (observerHealthy) return;
    observerBroken = true;
    for (const reveal of failsafeListeners) reveal();
    failsafeListeners.clear();
  }, HEALTH_GRACE_MS);
}

function getPool(rootMargin: string, threshold: number): Pool {
  const key = `${rootMargin}|${threshold}`;
  let pool = pools.get(key);
  if (!pool) {
    const callbacks = new Map<Element, Callback>();
    const observer = new IntersectionObserver(
      (entries) => {
        observerHealthy = true;
        for (const entry of entries) callbacks.get(entry.target)?.(entry);
      },
      { rootMargin, threshold },
    );
    pool = { observer, callbacks };
    pools.set(key, pool);
  }
  return pool;
}

export type InViewOptions = {
  /** Trigger before the element reaches the viewport so motion starts early. */
  rootMargin?: string;
  threshold?: number;
  /** Stop observing after the first entry. Default true — scenes animate once. */
  once?: boolean;
};

/**
 * Report whether an element has scrolled into view.
 *
 * @example
 * const { ref, inView } = useInView<HTMLElement>();
 * return <section ref={ref} data-enter={inView}>…</section>;
 */
export function useInView<T extends Element>(options: InViewOptions = {}) {
  const { rootMargin = "0px 0px -12% 0px", threshold = 0.12, once = true } = options;
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // No IntersectionObserver at all: show the content, skip the entrance.
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    // A previous element already proved observation is dead.
    if (observerBroken) {
      setInView(true);
      return;
    }

    const reveal = () => setInView(true);
    failsafeListeners.add(reveal);
    startHealthCheck();

    const { observer, callbacks } = getPool(rootMargin, threshold);

    callbacks.set(element, (entry) => {
      if (entry.isIntersecting) {
        setInView(true);
        if (once) {
          callbacks.delete(element);
          observer.unobserve(element);
        }
      } else if (!once) {
        setInView(false);
      }
    });

    observer.observe(element);

    return () => {
      failsafeListeners.delete(reveal);
      callbacks.delete(element);
      observer.unobserve(element);
    };
  }, [rootMargin, threshold, once]);

  return { ref, inView };
}
