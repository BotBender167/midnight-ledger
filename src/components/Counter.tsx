import { useEffect, useRef, useState } from "react";
import { useInView } from "../hooks/useInView";
import { num } from "../lib/format";

interface CounterProps {
  to: number;
  /** Milliseconds for the whole run. */
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

/** Ease-out cubic — fast start, long settle. Reads as a dial coming to rest. */
const ease = (t: number): number => 1 - (1 - t) ** 3;

const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

/**
 * A figure that counts up once, when it arrives.
 *
 * Driven by requestAnimationFrame rather than a CSS transition because the
 * text content itself changes, and the run is cancelled on unmount so a fast
 * scroll past never leaves a frame loop alive.
 *
 * Under reduced motion the final value renders immediately. The accessible
 * name is always the final value, so a screen reader announces "149,860", not
 * a stream of intermediate numbers.
 */
export function Counter({ to, duration = 1600, prefix = "", suffix = "", className }: CounterProps) {
  const { ref, inView } = useInView<HTMLSpanElement>();
  const [value, setValue] = useState(0);
  const frame = useRef(0);

  useEffect(() => {
    if (!inView) return;

    if (prefersReducedMotion()) {
      setValue(to);
      return;
    }

    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      setValue(to * ease(progress));
      if (progress < 1) frame.current = requestAnimationFrame(tick);
    };

    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [inView, to, duration]);

  return (
    <span ref={ref} className={className}>
      <span aria-hidden="true" className="tnum">
        {prefix}
        {num(value)}
        {suffix}
      </span>
      <span className="sr-only">{`${prefix}${num(to)}${suffix}`}</span>
    </span>
  );
}
