# DESIGN.md

Design principles for Henrik Åkesson's site (akesson.io). These are the rules that decisions get measured against — including the upcoming reviews/comparison section. A principle you can't measure is just a vibe, so each one below is paired with a concrete rule and, where relevant, a token that enforces it.

## The north star

**Professional, trustworthy, calm, beautiful.** This is the outcome of the six principles that follow plus two habits: **restraint** (do less, consistently) and **legibility** (text is always comfortably readable). Calm comes from consistency and generous space, not from decoration. When a choice is ambiguous, pick the quieter option.

A trust check that must always hold: body text meets **WCAG AA contrast (≥ 4.5:1)** against its background. "Beautiful" never wins over "readable."

---

## 1. Whitespace is the primary way to group and organise

Reach for space before lines, boxes, borders, or background fills. Structure should be legible with every divider removed.

- **Group** related elements with small spacing; **separate** groups with one large step. The size jump *is* the grouping signal.
- Intra-group spacing: `$space-2`–`$space-3`. Inter-group / section breaks: `$space-7`–`$space-9`.
- Borders and dividers are a last resort, used at low emphasis (thin, low opacity), only when whitespace genuinely can't carry the grouping.
- **Containment exception:** a surface or box is legitimate when it separates a *different kind of content* (a code sample, an interactive demo, a callout) from surrounding prose — it signals a content-type change, not a grouping of like-content. Grouping like-content still uses space, never boxes.
- Applies hardest to the **comparison table**: prefer whitespace and subtle row banding over heavy gridlines. A dense matrix is the place this principle is most tempting to abandon — don't.

## 2. Effects are discreet, never flashy

Motion and effects acknowledge an action; they never perform.

- **Only animate `opacity` and `transform`.** These are GPU-cheap and never cause layout jank. Never animate width/height/top/left/color-heavy properties for motion.
- **No overshoot, no bounce, no spring.** A decelerating ease-out is the ceiling of expressiveness. This is the line between "discreet" and "flashy."
- Hover/focus feedback is a small, fast change (opacity or a 1–2px shift), not a transformation.
- Shadows, glows, and gradients are subtle or absent. Depth is communicated with restraint.

## 3. Animations and fades are used sparingly, and are short

- **Default UI transition ≤ 200ms** (`$dur-base`). Micro-feedback (hover/focus) ≤ 120ms (`$dur-fast`). The **longest** reveal allowed is ~320ms (`$dur-slow`).
- A page or element gets **at most one** entrance fade — not a fade on every block. If everything animates, nothing reads as intentional.
- Motion is opt-in per element, never a global "animate everything" default.
- **Always honour `prefers-reduced-motion: reduce`** — disable non-essential transitions and animations entirely under it.

## 4. Fluid design, used sparingly

Fluidity smooths the layout across sizes; it is not applied to everything.

- Use `clamp()` for **only**: the page gutter, the largest headings, and section-level spacing.
- **Body text stays a fixed size.** Fluid body type hurts readability and predictability — this is the "sparingly."
- Prefer a few well-chosen `clamp()` expressions over scattered `vw` units. If a value doesn't visibly benefit from being fluid, make it fixed.

## 5. Imagery is theme-aware by construction

Every image must work in both themes (dark default + `[data-theme="light"]`, a runtime swap on `<html>`). *How* it adapts depends on the type — and the type is decided before the asset is made. The site uses three:

- **Technical illustrations & diagrams → inline SVG, coloured by tokens.** Never bake hex into a diagram. Ship the SVG *inline* in the DOM so it inherits the runtime variables, and paint it with theme roles: structure/strokes in `--text` / `--muted` / `--border`, the one meaningful emphasis in `--accent`, multi-series data in `--series-1..3`. One asset, adapts for free, drifts with the hue. (An SVG referenced via `<img>` can't read page variables — inline it, or it won't theme.)
- **Cropped UI screenshots → ship a light *and* a dark capture.** A raster can't be recoloured, so capture the UI in each mode and show the one matching the active theme. Selection must follow `[data-theme]` (the manual toggle), so `<picture>` + `prefers-color-scheme` alone is **not** sufficient — key the swap on the theme attribute. Give a screenshot a hairline `--border` frame (the §1 containment exception: a UI capture is a different *kind* of content) so its own chrome never merges into the page; keep the frame quiet. Any crossfade on theme change is ≤ `$dur-base`, and absent under `prefers-reduced-motion`.
- **Occasional photo → edit a light and a dark variant.** Same `[data-theme]` swap as screenshots. A photo is the one element that *may* go edge-to-edge (§6), but only as a deliberate exception.
- **Never let an image glare.** A bright UI capture dropped on the dark theme is a white rectangle punching through the calm — that is the whole reason for dual captures. An image's surrounding value should sit close to the page surface in each theme.

## 6. Content earns its width on one short ladder

Wide things — code, diagrams, screenshot sets — break out of the reading measure, but only as far as the `--bleed` cap. **Two rungs, no more** (restraint, §1):

- **Column** — `$measure` (`42rem`, ~672px, ~75ch of prose). Prose, inline figures, a single small screenshot, code up to ~80 columns.
- **Wide** — up to `$measure + 2 × --bleed-max` (`--bleed-max: 7rem` → ~`56rem` / ~896px). The default for `pre`, `figure`, and anything tagged `.bleed`: diagrams that need room, side-by-side comparisons, wider code. Symmetric overflow, centred, capped at `--bleed-max`. Opt out with `.no-bleed` (pin a small figure to the column); opt a table in with `.bleed`.
- **No full-bleed by default.** The ladder stops at the cap on purpose. A true edge-to-edge element (the occasional photo) is the rare exception, never routine.
- **Side-by-side (cross-platform) sets** — win/lin/mac or android/ios sit as a 2–4-up grid on the **Wide** rung: equal cells, shared aspect ratio and baseline, each cell labelled with its platform, one caption under the whole set held at the reading measure. Collapse to a single stacked column below `$bp-md`. A diagram earns the Wide rung only when its horizontal extent *means* something (a timeline, a spectrum, a comparison); otherwise it stays in the column.
- **Code measure — design for 80–90 columns.** At the `0.9em` code size (JetBrains Mono, ~0.6em/char) the Wide cap holds ~88 columns without scrolling, and ~65 fit the bare column; 80 is the comfortable house width. Lines past ~90 columns **scroll horizontally** inside the block (`pre { overflow: auto }`) — never shrink code below ~16px, and never soft-wrap it, to force 120 columns to fit. Legibility beats fitting (north star). The only levers if a section genuinely needs more are the `pre` font-size and `--bleed-max`; raising the cap is bounded by the gutter between the column and the page edge. *(Column counts are computed at a 0.6em advance — confirm against the first real code block.)*

---

## Design tokens

A deliberately small set — restraint in the tokens is the calm aesthetic. Values are the source of truth; new code pulls from these rather than using raw literals.

```scss
// ── Spacing scale (rem) — whitespace is the grouping tool ──
$space-1: 0.25rem;  $space-2: 0.5rem;   $space-3: 0.75rem;
$space-4: 1rem;     $space-5: 1.5rem;   $space-6: 2rem;
$space-7: 3rem;     $space-8: 4rem;     $space-9: 6rem;   // section separation

// ── Motion — discreet & short. No bounce / overshoot, ever. ──
$dur-fast: 120ms;   // hover, focus, micro-feedback
$dur-base: 200ms;   // default transition / single entrance fade
$dur-slow: 320ms;   // largest reveal allowed
$ease:     cubic-bezier(0.2, 0, 0, 1);   // decelerate, calm
// Only ever transition opacity & transform.

// ── Named breakpoints ──
$bp-sm: 520px;   $bp-md: 800px;   $bp-lg: 960px;
$bp-xl: 1300px;  // reading layout + content breakout kick in at / above this
$bp-2xl: 1800px;

// ── Type scale (~1.2 modular) — few sizes read as calm ──
$text-sm:  0.875rem;  $text-base: 1rem;     $text-lg:  1.25rem;
$text-xl:  1.563rem;  $text-2xl:  1.953rem; $text-3xl: 2.441rem;
$line-base: 1.6;      // generous, comfortable reading

// ── Fluid — used sparingly ──
$gutter:   clamp(1rem, 5vw, 3rem);
$h1-fluid: clamp(2rem, 1.4rem + 2.4vw, $text-3xl);

// ── Media & breakout (§5–§6) — one short ladder, not a full-bleed system ──
$measure:    42rem;        // reading column (~75ch prose). Breakout cap = $measure + 2*7rem ≈ 56rem
$code-size:  0.9em;        // block code (JetBrains Mono ~0.6em/char) → ~88-col cap; target ≤ 80–90
$frame:      1px solid var(--border);  // quiet frame for a UI screenshot (§1 containment, §5)
// Breakout width itself is a *runtime* var (lives in style.scss, depends on the viewport):
//   --bleed-max: 7rem;                                            // widest overflow per side
//   --bleed: clamp(0rem, 50vw - 21rem - 2rem, var(--bleed-max));  // capped by the gutter
```

**Colour note (for when theming is built):** name colour tokens *semantically* (`$bg`, `$surface`, `$text`, `$accent`, `$muted`) rather than by appearance, so a light theme is a drop-in. **One accent, and it always means something:** `$accent` carries interactive and wayfinding meaning only — links, the active nav item, primary CTAs — never decoration; everything else is `$bg`/`$surface`/`$text`/`$muted`. Whatever the palette, the AA contrast rule in the north star is non-negotiable.

*Now implemented* as **runtime** CSS custom properties (not Sass vars), because the palette is live: a single drifting `--hue` feeds only `--accent` (+ `--series-1..3` for diagrams), and the dark/light theme is a `data-theme` swap on `<html>`. The roles are exactly `--bg --surface --surface-sunken --text --muted --border --accent --page --series-1..3`. Theme-aware imagery (§5) and inline diagrams hook these directly.

---

## Applying this to the reviews / comparison section

- **Reviews** (image/screenshot-heavy): let screenshots breathe with `$space-6`+ around them; group a review's platform sections with whitespace, not boxes. One quiet entrance fade per page at most. Screenshots ship as light/dark pairs and cross-platform sets render as a Wide-rung 2–4-up grid (§5, §6).
- **Comparison table**: whitespace and optional subtle row banding over gridlines; sticky header if long; platform filtering hides columns/rows with no animation (or a single ≤200ms opacity fade) — never a flashy reflow.
- **Platform filter controls**: discreet, calm, and instant-feeling. Feedback within `$dur-fast`.

---

## Status

This document is the **target** design direction. The site currently runs a vendored Hermit theme whose defaults (bundled animate.css with bounce/slide entrances, long durations) predate these principles and do not yet follow them. Reconcile section by section as the site is rebuilt — new work follows this doc from the start.
