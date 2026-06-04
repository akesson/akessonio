# DESIGN.md

Design principles for the Human Solutions site. These are the rules that decisions get measured against — including the upcoming reviews/comparison section. A principle you can't measure is just a vibe, so each one below is paired with a concrete rule and, where relevant, a token that enforces it.

## The north star

**Professional, trustworthy, calm, beautiful.** This is the outcome of the five principles that follow plus two habits: **restraint** (do less, consistently) and **legibility** (text is always comfortably readable). Calm comes from consistency and generous space, not from decoration. When a choice is ambiguous, pick the quieter option.

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

## 5. A reactive table of contents that appears only when there's room

The TOC is a convenience that must never crowd the content.

- It appears **automatically** when the viewport is wide enough to hold it in the side gutter beside the main content column — **no toggle button, no hamburger**. When there isn't room, it is simply absent.
- Implement as `position: sticky` within a layout gutter, not `position: fixed` with hard-coded offsets. The content column keeps its comfortable measure (~720px); the TOC lives in leftover space.
- Default trigger is the `$bp-xl` breakpoint (the simple, robust 90% solution). Only escalate to JS measurement (`ResizeObserver` on actual gutter width) if the breakpoint proves too blunt in practice.
- The TOC is low-emphasis: smaller, dimmed, quiet hover. It supports the content; it never competes with it.
- The TOC **reflects reading position**: the entry for the section currently in view is highlighted (scroll-spy) — a small, low-emphasis cue (a quiet accent on the active item), never animated.

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
$bp-xl: 1300px;  // TOC appears at / above this
$bp-2xl: 1800px;

// ── Type scale (~1.2 modular) — few sizes read as calm ──
$text-sm:  0.875rem;  $text-base: 1rem;     $text-lg:  1.25rem;
$text-xl:  1.563rem;  $text-2xl:  1.953rem; $text-3xl: 2.441rem;
$line-base: 1.6;      // generous, comfortable reading

// ── Fluid — used sparingly ──
$gutter:   clamp(1rem, 5vw, 3rem);
$h1-fluid: clamp(2rem, 1.4rem + 2.4vw, $text-3xl);
```

**Colour note (for when theming is built):** name colour tokens *semantically* (`$bg`, `$surface`, `$text`, `$accent`, `$muted`) rather than by appearance, so a light theme is a drop-in. **One accent, and it always means something:** `$accent` carries interactive and wayfinding meaning only — links, the active nav/TOC item, primary CTAs — never decoration; everything else is `$bg`/`$surface`/`$text`/`$muted`. Whatever the palette, the AA contrast rule in the north star is non-negotiable.

---

## Applying this to the reviews / comparison section

- **Reviews** (image/screenshot-heavy): let screenshots breathe with `$space-6`+ around them; group a review's platform sections with whitespace, not boxes. One quiet entrance fade per page at most.
- **Comparison table**: whitespace and optional subtle row banding over gridlines; sticky header if long; platform filtering hides columns/rows with no animation (or a single ≤200ms opacity fade) — never a flashy reflow.
- **Platform filter controls**: discreet, calm, and instant-feeling. Feedback within `$dur-fast`.

---

## Status

This document is the **target** design direction. The site currently runs a vendored Hermit theme whose defaults (bundled animate.css with bounce/slide entrances, long durations) predate these principles and do not yet follow them. Reconcile section by section as the site is rebuilt — new work follows this doc from the start.
