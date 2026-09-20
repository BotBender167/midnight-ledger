import type { ElementType, ReactNode } from "react";
import { useInView } from "../hooks/useInView";

type Direction = "up" | "left" | "right" | "scale" | "none";

interface RevealProps {
  children: ReactNode;
  /** Render as something other than a div — `section`, `li`, `figure`… */
  as?: ElementType;
  /** Multiplies the 70ms step so siblings arrive in sequence. */
  stagger?: number;
  from?: Direction;
  className?: string;
  id?: string;
  /** Start the transition earlier or later relative to the viewport edge. */
  rootMargin?: string;
}

/**
 * Scroll-triggered entrance.
 *
 * All this does is set `data-enter` on the element; `styles/motion.css` owns
 * what that looks like. Keeping the visual part in CSS means the transitions
 * run on the compositor and the component stays presentation-free.
 *
 * Children are authored in their finished state, so if JavaScript never runs
 * the content is still there and still readable.
 */
export function Reveal({
  children,
  as: Tag = "div",
  stagger = 0,
  from = "up",
  className,
  id,
  rootMargin,
}: RevealProps) {
  const { ref, inView } = useInView<HTMLElement>(rootMargin ? { rootMargin } : undefined);

  return (
    <Tag
      ref={ref}
      id={id}
      className={className}
      data-enter={inView}
      data-enter-from={from}
      style={{ "--stagger": stagger } as React.CSSProperties}
    >
      {children}
    </Tag>
  );
}
