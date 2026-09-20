# Contributing

## Getting set up

```bash
npm install
npm run data     # parse the three CSVs in scripts/ into public/data/
npm run dev      # http://localhost:5173
```

`public/data/` is generated and git-ignored. The three CSVs in `scripts/` are the real inputs;
if `npm run dev` shows an error banner, you have not run `npm run data`.

## Before opening a pull request

```bash
npm run verify
```

That runs, in order: data build → unit tests → bundle self-check → typecheck → lint. CI runs the
same sequence and will not publish if any step fails.

| Command | What it covers |
|---|---|
| `npm test` | 40 unit tests over `src/lib` — connection scoring and formatting |
| `npm run check` | 17 assertions over the *generated* bundles and the live connection index |
| `npm run typecheck` | `tsc` in strict mode with `noUncheckedIndexedAccess` |
| `npm run lint` | ESLint, including `jsx-a11y`, at zero warnings |
| `npm run coverage` | V8 coverage over `src/lib` and `src/constants` |

## Where things go

| You are changing… | Put it in |
|---|---|
| A tuning number, threshold or weight | `src/constants/` — never inline it |
| Logic with no React or DOM in it | `src/lib/` (and add a test next to it) |
| Anything that parses a CSV | `scripts/lib/` — build time only |
| A colour, font, spacing or easing value | `src/styles/tokens.css` — never a component |
| An animation | `src/styles/motion.css` — components only set `data-enter` |
| A new full-page plate | `src/sections/`, then lazy-load it in `App.tsx` |

## House rules

**No colour or duration literals in components.** Everything comes from `tokens.css`. A
component that hardcodes `#15223b` breaks dark mode silently.

**Animate only `transform`, `opacity`, `stroke-dashoffset` and `clip-path`.** Anything else
triggers layout, and this page is 30,000px tall.

**Content must never depend on motion.** Elements are authored in their finished state and
pushed back by `[data-enter="false"]`. If the scroll observer dies, the page must still read.
There is a health check in `useInView` that enforces this; do not remove it.

**Every interactive SVG mark needs a real focusable element with an accessible name.** Charts
also need either a `<title>` stating the finding or a visually hidden table. The accessibility
engine scores 100% and that is not an accident.

**Do not invent data.** Every figure on the page is computed from the three source files. If the
data does not support a claim, change the claim.

## Adding a fourth archive

1. Write an adapter in `scripts/lib/` that emits the `Receipt` shape from `src/types/archive.ts`.
2. Register it in `scripts/build-data.mjs`.
3. Nothing in `src/` should need to change. If it does, the adapter is leaking.

## Commit messages

Conventional commits — `feat:`, `fix:`, `perf:`, `refactor:`, `docs:`, `test:`, `ci:`. The body
should say *why*, since the diff already says what.
