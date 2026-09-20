/**
 * The hero illustration — a hand-drawn night platform.
 *
 * Authored as inline SVG rather than an exported asset for three reasons: the
 * strokes inherit `currentColor` so the whole scene re-inks itself in dark
 * mode for free, individual paths can be drawn on in sequence by the scroll
 * observer, and the entire scene costs about 9 KB of markup with no network
 * request and nothing to lazy-load.
 *
 * Irregularity is authored into the path data — no two windows align, no
 * rooftop is level — because a perfectly straight line reads as a chart, not
 * as a pen.
 */

/** Deterministic pseudo-random in [0,1). Keeps the "hand-drawn" jitter stable
 *  across renders so the scene never twitches on re-mount. */
function wobble(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/** Lit windows scattered across a building face. */
function Windows({ x, y, w, h, seed }: { x: number; y: number; w: number; h: number; seed: number }) {
  const cells = [];
  const cols = Math.max(1, Math.floor(w / 13));
  const rows = Math.max(1, Math.floor(h / 17));

  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const n = wobble(seed + c * 7.3 + r * 3.1);
      if (n < 0.52) continue;
      cells.push(
        <rect
          key={`${c}-${r}`}
          x={x + 6 + c * 13 + wobble(n) * 1.5}
          y={y + 9 + r * 17}
          width={5.5}
          height={7}
          fill={n > 0.84 ? "var(--color-ochre)" : "currentColor"}
          opacity={n > 0.84 ? 0.92 : 0.2}
        />,
      );
    }
  }
  return <g className="ink-wash">{cells}</g>;
}

/**
 * `preserveAspectRatio="xMidYMid slice"` crops the wide plate rather than
 * shrinking it. Given an explicit height taller than the 1000:620 ratio — which
 * the caller sets only on small screens — the scene fills and crops at the
 * sides, keeping the figure and the moon legible on a phone instead of
 * collapsing them to twenty pixels. From `sm` up the height goes auto and the
 * whole plate is shown.
 */
export function NightScene({ className }: { className?: string }) {
  const stars = Array.from({ length: 26 }, (_, i) => ({
    cx: 60 + wobble(i * 1.7) * 880,
    cy: 30 + wobble(i * 3.3) * 210,
    r: 1 + wobble(i * 5.1) * 1.6,
    i,
  }));

  const receipts = Array.from({ length: 5 }, (_, i) => ({
    x: 250 + i * 135 + wobble(i * 9.2) * 40,
    y: 170 + wobble(i * 4.4) * 60,
    i,
  }));

  return (
    <svg
      className={className}
      viewBox="0 0 1000 620"
      fill="none"
      role="img"
      aria-labelledby="night-scene-title night-scene-desc"
      preserveAspectRatio="xMidYMid slice"
    >
      <title id="night-scene-title">A figure alone on a night platform</title>
      <desc id="night-scene-desc">
        An ink drawing of a city skyline after dark. A single figure stands on a railway platform
        wearing headphones, beneath a moon marked with survey ticks. Paper receipts drift down
        through the air around them. Lit windows are scattered across the buildings behind.
      </desc>

      {/* ── Sky ───────────────────────────────────────────────────────────── */}
      <g stroke="currentColor" opacity={0.55}>
        {stars.map((s) => (
          <circle
            key={s.i}
            className="anim-twinkle"
            cx={s.cx}
            cy={s.cy}
            r={s.r}
            fill="currentColor"
            stroke="none"
            style={{ "--stagger": s.i } as React.CSSProperties}
          />
        ))}
      </g>

      {/* ── Moon, with survey ticks ───────────────────────────────────────── */}
      <g>
        <circle cx={812} cy={128} r={46} fill="var(--color-ochre)" opacity={0.16} className="ink-wash" />
        <circle
          cx={812}
          cy={128}
          r={46}
          pathLength={1}
          className="ink-draw"
          stroke="var(--color-ochre)"
          strokeWidth={2}
        />
        <g className="anim-orbit" style={{ transformOrigin: "812px 128px" }}>
          <circle
            cx={812}
            cy={128}
            r={66}
            pathLength={1}
            className="ink-draw"
            stroke="currentColor"
            strokeWidth={1}
            strokeDasharray="0.012 0.02"
            opacity={0.5}
          />
          <circle cx={812} cy={62} r={3.5} fill="var(--color-azure)" />
        </g>
        {/* craters */}
        <g className="ink-wash" fill="var(--color-ochre)" opacity={0.45}>
          <ellipse cx={800} cy={116} rx={8} ry={6.5} />
          <ellipse cx={826} cy={140} rx={5.5} ry={4.5} />
          <ellipse cx={805} cy={147} rx={4} ry={3} />
        </g>
      </g>

      {/* ── Skyline ───────────────────────────────────────────────────────── */}
      <g stroke="currentColor" strokeWidth={2} strokeLinejoin="round">
        {/* far bank, low and soft */}
        <path
          pathLength={1}
          className="ink-draw"
          style={{ "--stagger": 1 } as React.CSSProperties}
          opacity={0.42}
          d="M0 352 L58 349 L64 318 L96 316 L102 347 L168 344 L174 300 L212 298 L218 341 L286 338 L292 312 L330 310 L336 336 L402 334"
        />

        {/* principal block */}
        <path
          pathLength={1}
          className="ink-draw"
          style={{ "--stagger": 2 } as React.CSSProperties}
          d="M96 402 L98 268 L164 264 L166 232 L206 230 L208 262 L268 258 L270 300 L344 296 L346 214 L392 212 L396 292 L462 288 L464 330 L536 326 L540 246 L588 244 L592 322 L660 318 L664 278 L724 276 L728 344 L806 340 L810 300 L868 298 L872 348 L1000 344"
        />

        <Windows x={98} y={268} w={66} h={130} seed={1} />
        <Windows x={208} y={262} w={60} h={138} seed={2} />
        <Windows x={346} y={214} w={46} h={182} seed={3} />
        <Windows x={464} y={330} w={72} h={70} seed={4} />
        <Windows x={540} y={246} w={48} h={154} seed={5} />
        <Windows x={664} y={278} w={60} h={122} seed={6} />
        <Windows x={810} y={300} w={58} h={100} seed={7} />

        {/* a water tower, because every skyline needs one thing that is not a box */}
        <g className="ink-draw" style={{ "--stagger": 3 } as React.CSSProperties}>
          <path pathLength={1} d="M272 258 L276 226 L308 224 L312 256" />
          <path pathLength={1} d="M280 224 L294 206 L308 222" />
          <path pathLength={1} d="M286 258 L288 292 M300 257 L302 291" />
        </g>
      </g>

      {/* ── Platform ──────────────────────────────────────────────────────── */}
      <g stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
        <path
          pathLength={1}
          className="ink-draw"
          style={{ "--stagger": 4 } as React.CSSProperties}
          d="M0 452 L996 446"
        />
        <path
          pathLength={1}
          className="ink-draw"
          style={{ "--stagger": 5 } as React.CSSProperties}
          strokeWidth={1.5}
          opacity={0.6}
          d="M0 470 L998 464"
        />
        {/* rails receding */}
        <path
          pathLength={1}
          className="ink-draw"
          style={{ "--stagger": 6 } as React.CSSProperties}
          strokeWidth={1.2}
          opacity={0.38}
          d="M0 540 L1000 512 M0 580 L1000 548"
        />
        {/* sleepers */}
        <g strokeWidth={1.1} opacity={0.3}>
          {Array.from({ length: 16 }, (_, i) => (
            <path
              key={i}
              pathLength={1}
              className="ink-draw"
              style={{ "--stagger": 6 + i * 0.12 } as React.CSSProperties}
              d={`M${i * 64} ${542 - i * 1.7} L${i * 64 + 26} ${582 - i * 2}`}
            />
          ))}
        </g>
      </g>

      {/* ── The subject ───────────────────────────────────────────────────── */}
      <g className="anim-walk">
        <g
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          className="ink-draw"
          style={{ "--stagger": 7 } as React.CSSProperties}
        >
          {/* head */}
          <circle cx={476} cy={382} r={11} pathLength={1} />
          {/* headphone band and cups */}
          <path pathLength={1} d="M464 379 A13 13 0 0 1 488 379" stroke="var(--color-azure)" strokeWidth={2.8} />
          <path pathLength={1} d="M463 380 L462 388 M489 380 L490 388" stroke="var(--color-azure)" strokeWidth={4} />
          {/* body, arms, legs */}
          <path pathLength={1} d="M476 393 L474 424" />
          <path pathLength={1} d="M474 400 L462 414 M474 400 L488 412" />
          <path pathLength={1} d="M474 424 L466 450 M474 424 L484 449" />
        </g>

        {/* sound leaving the head */}
        <g stroke="var(--color-azure)" strokeWidth={1.6} fill="none" opacity={0.75}>
          {[20, 30, 40].map((r, i) => (
            <path
              key={r}
              className="anim-ring"
              style={{ transformOrigin: "476px 382px", animationDelay: `${i * 0.55}s` }}
              d={`M${476 + r} ${382 - r * 0.55} A${r} ${r} 0 0 1 ${476 + r} ${382 + r * 0.55}`}
            />
          ))}
        </g>
      </g>

      {/* ── Falling receipts ──────────────────────────────────────────────── */}
      <g>
        {receipts.map((r) => (
          <g
            key={r.i}
            className="anim-fall"
            style={{ "--stagger": r.i } as React.CSSProperties}
            transform={`translate(${r.x} ${r.y})`}
          >
            <rect
              width={26}
              height={36}
              fill="var(--color-paper-2)"
              stroke="currentColor"
              strokeWidth={1.2}
              opacity={0.95}
            />
            <path
              d="M5 9 H21 M5 15 H18 M5 21 H21 M5 27 H14"
              stroke="currentColor"
              strokeWidth={1}
              opacity={0.45}
            />
          </g>
        ))}
      </g>

      {/* ── Survey annotations ────────────────────────────────────────────── */}
      <g
        stroke="var(--color-azure)"
        strokeWidth={1.1}
        className="ink-draw"
        style={{ "--stagger": 9 } as React.CSSProperties}
        opacity={0.8}
      >
        <path pathLength={1} strokeDasharray="0.02 0.03" d="M476 368 L476 300 L604 300" />
        <path pathLength={1} d="M470 294 L482 306 M482 294 L470 306" />
        <path pathLength={1} strokeDasharray="0.02 0.03" d="M812 182 L812 224 L700 224" />
      </g>

      <g
        fill="var(--color-azure)"
        fontFamily="var(--font-mono)"
        fontSize={11}
        letterSpacing="0.14em"
        className="ink-wash"
      >
        <text x={610} y={296}>SUBJECT — UNIDENTIFIED</text>
        <text x={560} y={312} fill="var(--color-ink-3)" fontSize={9.5}>
          149,860 PLAYS · 2013—2024
        </text>
        <text x={560} y={228} textAnchor="end" fill="var(--color-ink-3)" fontSize={9.5}>
          PEAK LISTENING HOUR — 00:00 UTC
        </text>
      </g>

      {/* corner ticks, like a plate from an atlas */}
      <g stroke="currentColor" strokeWidth={1} opacity={0.35}>
        <path d="M16 16 H52 M16 16 V52" />
        <path d="M984 16 H948 M984 16 V52" />
        <path d="M16 604 H52 M16 604 V568" />
        <path d="M984 604 H948 M984 604 V568" />
      </g>
    </svg>
  );
}
