+++
title = "The width ladder, measured"
date = 2026-07-17
draft = true

[extra]
responsive_tables = true
+++

This page exists to *settle* DESIGN.md §6: every
artifact type that can earn width appears here at its intended rung, with real content,
so the provisional Wide and Full caps can be measured against the things that define
them — a genuine 100-column code block and a genuine three-panel illustration — and then
pinned. It never publishes (`draft = true`); it is the calibration target for the
screenshot suite and the breakpoint-measurement loop.

The ladder, briefly: **Column** is the `$measure` reading width every element defaults
to. **Wide** is sized so 100 columns of rustfmt'd code plus the line-number gutter fit
without scrolling. **Full** is sized to the floor where three vector panels stay legible
side by side. Nothing here may cause a horizontal page scrollbar at any viewport width,
in either theme.

## Code

Prose and short code stay in the Column. This block's widest line is 43 characters —
it should render at exactly the reading measure, no bleed:

```rust
fn reflow_class_token(bp: &str) -> String {
    bp.replace('.', "_")
}
```

The block below is the **Wide-rung calibration artifact**. It is real code from
zola-plus (`components/markdown/src/markdown.rs`), rustfmt'd at `max_width = 100`, and
its widest line — the function signature — is 99 characters. With line numbers on, this
is precisely the content the Wide cap is derived from: **if this block scrolls
horizontally at a wide viewport, the cap is wrong.**

```rust,linenos
/// Emit one scrollable table: a `<div class="table-scroll">` wrapper around the
/// *unchanged* table. The generated CSS gives the wrapper `overflow-x: auto` (see
/// `scroll_css`), so a table wider than its column pans horizontally instead of
/// overflowing the page. `table` holds the events after `Start(Table)` up to and
/// including `End(Table)`.
fn emit_scroll_table<'a>(out: &mut Vec<Event<'a>>, aligns: Vec<Alignment>, table: Vec<Event<'a>>) {
    out.push(Event::Html(r#"<div class="table-scroll">"#.into()));
    out.push(Event::Start(Tag::Table(aligns)));
    out.extend(table);
    out.push(Event::Html("</div>".into()));
}
```

Below the point where the page can no longer give the block its cap, it must scroll
*inside* the `pre` — never shrink, never soft-wrap.

## Tables

A small table is content like any other: a quiet panel in the Column — sunken in
dark, a raised hairline card in light — with hairline rows and a letterspaced
header, no gridlines. This one carries **no directive on purpose** — an undirected
table falls back to the CSS legibility floor: it shrink-wraps to its content and,
on a container too narrow for even that, pans in place rather than widening the
page. (In production every table gets a measured width directive via the
`blog-tables` skill; this floor is the safety net.) The four zola-plus directives:

| Directive | Value | Below the breakpoint |
|---|---|---|
| `reflow` | length | rows become label/value cards |
| `transpose` | length | header row becomes the left column |
| `scroll` | — | table pans inside its own container |
| `expand` | length | a button opens a fullscreen overlay |

A table can also be too wide for *any* rung — that is what **`expand`** is for. The
one below measures **past even the 80rem cap** natural, so no container on this site
ever fits it whole; it therefore carries no width (the shape map, not a step, is the
answer beyond the cap), and its breakpoint is `66rem` — comfortably above any
container it sits in, which keeps the ⛶ button permanently offered. The button opens
the table as a fullscreen, pannable overlay (a JS-free `:target` toggle); inline, it
pans like a `scroll` table. The data is real: what each directive generates, per mode.

<!-- expand: 66rem -->

| Mode | Wrapper classes | Cells rewritten | Generated CSS mechanism | Needs an id |
|---|---|---|---|---|
| reflow | `reflow reflow-bp-{token}` | yes — `data-label` on every `td`, `scope="col"` on headers | container query hides `thead`, `td` becomes a two-column grid | no |
| transpose | `transpose transpose-bp-{token} transpose-cols-{n}` | no | `display: contents` collapse + column-first grid, `repeat(n, auto)` | no |
| scroll | `table-scroll` | no | static `overflow-x: auto` on the wrapper | no |
| expand | `table-expand table-expand-bp-{token}` | no | `:target` restyles the wrapper to `position: fixed; inset: 0` | yes — per page |

A genuinely large table carries a **measured width** — snapped up the 6rem step
scale, written into the directive by the `blog-tables` skill — *and* a `scroll`
directive, so below its step's room it pans inside its panel instead of widening the
page. This one measured to the 78rem step. Real data: the CSS features this site's
design depends on.

<!-- scroll: width 78rem -->

| Feature | Chrome | Edge | Firefox | Safari | iOS Safari | Where the site uses it |
|---|---|---|---|---|---|---|
| Container size queries | 105 | 105 | 110 | 16.0 | 16.0 | every responsive-table breakpoint (`@container (max-width: …)`) |
| `display: contents` | 65 | 79 | 62 | 11.1 | 11.3 | transpose collapses `thead`/`tbody`/`tr` out of the grid |
| `:target` | 1 | 12 | 1 | 1.3 | 1 | the JS-free expand overlay toggle |
| `clamp()` | 79 | 79 | 75 | 13.1 | 13.4 | the page gutter, fluid `h1`, and every bleed formula |
| CSS custom properties in inline SVG | 49 | 15 | 42 | 9.1 | 9.3 | token-coloured diagrams (§5) |
| Cross-document view transitions | 126 | 126 | — | 18.2 | 18.2 | the ≤200ms page crossfade (progressive enhancement) |

And one record-like table wearing its intended production treatment — `reflow` at the
decided `37rem` breakpoint, its panel at its measured 48rem step, with a dash-row
group header splitting the records:

<!-- reflow: 37rem width 48rem -->

| Page | Template | Layout | Widest artifact |
|---|---|---|---|
| **top level** |---|---|---|
| `/` | `index.html` | spotlight | nav tabs |
| `/projects` | `projects.html` | editorial list | project entries |
| **reading pages** |---|---|---|
| `/projects/cargo-leptos` | `project.html` | reading | code blocks |
| `/about` | `description.html` | reading | prose |
| `/design-ladder` | `page.html` | reading | everything on this page |

The opposite shape — many columns, few rows — **transposes**: below the breakpoint the
header row becomes the left-hand label column and each record becomes a column of
cells. Real data again: how the screenshot set further down was captured, per guest.

<!-- transpose: 37rem width 42rem -->

| Guest | OS | Terminal | Launch route | Capture |
|---|---|---|---|---|
| macos | macOS 15 | Terminal.app | `open x.command` | `vm shot` |
| linux | Ubuntu 24.04 | GNOME Terminal | `systemd-run --user` | `vm shot` |
| windows | Windows 11 | Windows Terminal | `start wt` | `vm shot` |

## Diagrams

A diagram whose horizontal extent means nothing stays in the Column. This one is a
sequence — order matters, width doesn't:

<figure class="no-bleed">
<svg viewBox="0 0 440 320" role="img" aria-label="A directive comment binds to the table immediately after it, producing a wrapped table and a recorded breakpoint" style="max-width: 27.5rem">
  <g font-size="15" text-anchor="middle">
    <rect x="90" y="12" width="260" height="52" rx="6" fill="var(--surface)" stroke="var(--border)"/>
    <text x="220" y="34" fill="var(--muted)" font-family="monospace" font-size="14">&lt;!-- reflow: 40rem --&gt;</text>
    <text x="220" y="54" fill="var(--muted)" font-size="13">directive comment</text>
    <line x1="220" y1="64" x2="220" y2="96" stroke="var(--muted)" marker-end="url(#arr1)"/>
    <rect x="90" y="100" width="260" height="52" rx="6" fill="var(--surface)" stroke="var(--border)"/>
    <text x="220" y="122" fill="var(--text)">markdown table</text>
    <text x="220" y="142" fill="var(--muted)" font-size="13">immediately below, blank line ok</text>
    <line x1="220" y1="152" x2="220" y2="184" stroke="var(--muted)" marker-end="url(#arr1)"/>
    <rect x="90" y="188" width="260" height="52" rx="6" fill="var(--surface)" stroke="var(--accent)"/>
    <text x="220" y="210" fill="var(--text)">wrapped table</text>
    <text x="220" y="230" fill="var(--muted)" font-size="13">div.reflow.reflow-bp-40rem</text>
    <line x1="220" y1="240" x2="220" y2="272" stroke="var(--muted)" marker-end="url(#arr1)"/>
    <text x="220" y="296" fill="var(--muted)" font-size="13">breakpoint recorded for responsive-tables.css</text>
  </g>
  <defs>
    <marker id="arr1" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
      <path d="M0,0 L8,4 L0,8 z" fill="var(--muted)"/>
    </marker>
  </defs>
</svg>
<figcaption>Column rung: a flow whose meaning is vertical order, not horizontal extent.</figcaption>
</figure>

A pipeline earns Wide because its horizontal extent *is* the meaning — left to right is
build order:

<figure>
<svg viewBox="0 0 1020 170" role="img" aria-label="zola-plus responsive-table pipeline from markdown events to one generated stylesheet">
  <g font-size="15" text-anchor="middle">
    <rect x="8" y="40" width="200" height="64" rx="6" fill="var(--surface)" stroke="var(--border)"/>
    <text x="108" y="66" fill="var(--text)">markdown events</text>
    <text x="108" y="88" fill="var(--muted)" font-size="13">pulldown-cmark stream</text>
    <line x1="208" y1="72" x2="262" y2="72" stroke="var(--muted)" marker-end="url(#arr2)"/>
    <rect x="266" y="40" width="200" height="64" rx="6" fill="var(--surface)" stroke="var(--border)"/>
    <text x="366" y="66" fill="var(--text)" font-family="monospace" font-size="14">transform_tables</text>
    <text x="366" y="88" fill="var(--muted)" font-size="13">directive → wrapper</text>
    <line x1="466" y1="72" x2="520" y2="72" stroke="var(--muted)" marker-end="url(#arr2)"/>
    <rect x="524" y="40" width="220" height="64" rx="6" fill="var(--surface)" stroke="var(--border)"/>
    <text x="634" y="66" fill="var(--text)">wrapped HTML</text>
    <text x="634" y="88" fill="var(--muted)" font-size="13">+ breakpoints recorded</text>
    <line x1="744" y1="72" x2="798" y2="72" stroke="var(--muted)" marker-end="url(#arr2)"/>
    <rect x="802" y="40" width="210" height="64" rx="6" fill="var(--surface)" stroke="var(--accent)"/>
    <text x="907" y="66" fill="var(--text)" font-family="monospace" font-size="14">responsive-tables.css</text>
    <text x="907" y="88" fill="var(--muted)" font-size="13">one file, linked once</text>
  </g>
  <defs>
    <marker id="arr2" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
      <path d="M0,0 L8,4 L0,8 z" fill="var(--muted)"/>
    </marker>
  </defs>
</svg>
<figcaption>Wide rung: a pipeline reads left-to-right, so width carries meaning.</figcaption>
</figure>

A diptych compares two states of the same thing — before and after the reflow
breakpoint. Two panels, Wide rung, one caption at the reading measure:

<figure class="panels panels-2">
<svg viewBox="0 0 460 240" role="img" aria-label="Above the breakpoint: a conventional four-column table">
  <text x="230" y="24" text-anchor="middle" fill="var(--text)" font-size="15">≥ breakpoint</text>
  <g stroke="var(--border)">
    <rect x="30" y="44" width="400" height="34" fill="var(--surface)"/>
    <rect x="30" y="78" width="400" height="34" fill="none"/>
    <rect x="30" y="112" width="400" height="34" fill="var(--surface-sunken)"/>
    <rect x="30" y="146" width="400" height="34" fill="none"/>
    <rect x="30" y="180" width="400" height="34" fill="var(--surface-sunken)"/>
  </g>
  <g fill="var(--accent)">
    <rect x="42" y="56" width="60" height="10" rx="2"/>
    <rect x="142" y="56" width="60" height="10" rx="2"/>
    <rect x="242" y="56" width="60" height="10" rx="2"/>
    <rect x="342" y="56" width="60" height="10" rx="2"/>
  </g>
  <g fill="var(--muted)">
    <rect x="42" y="90" width="52" height="8" rx="2"/><rect x="142" y="90" width="66" height="8" rx="2"/><rect x="242" y="90" width="48" height="8" rx="2"/><rect x="342" y="90" width="58" height="8" rx="2"/>
    <rect x="42" y="124" width="60" height="8" rx="2"/><rect x="142" y="124" width="50" height="8" rx="2"/><rect x="242" y="124" width="64" height="8" rx="2"/><rect x="342" y="124" width="44" height="8" rx="2"/>
    <rect x="42" y="158" width="46" height="8" rx="2"/><rect x="142" y="158" width="62" height="8" rx="2"/><rect x="242" y="158" width="54" height="8" rx="2"/><rect x="342" y="158" width="60" height="8" rx="2"/>
    <rect x="42" y="192" width="56" height="8" rx="2"/><rect x="142" y="192" width="48" height="8" rx="2"/><rect x="242" y="192" width="60" height="8" rx="2"/><rect x="342" y="192" width="50" height="8" rx="2"/>
  </g>
</svg>
<svg viewBox="0 0 460 240" role="img" aria-label="Below the breakpoint: each row reflowed into a label and value card">
  <text x="230" y="24" text-anchor="middle" fill="var(--text)" font-size="15">&lt; breakpoint</text>
  <g stroke="var(--border)">
    <rect x="90" y="44" width="280" height="56" rx="4" fill="var(--surface)"/>
    <rect x="90" y="112" width="280" height="56" rx="4" fill="var(--surface)"/>
    <rect x="90" y="180" width="280" height="34" rx="4" fill="var(--surface)"/>
  </g>
  <g fill="var(--accent)">
    <rect x="104" y="58" width="56" height="9" rx="2"/>
    <rect x="104" y="80" width="56" height="9" rx="2"/>
    <rect x="104" y="126" width="56" height="9" rx="2"/>
    <rect x="104" y="148" width="56" height="9" rx="2"/>
    <rect x="104" y="192" width="56" height="9" rx="2"/>
  </g>
  <g fill="var(--muted)">
    <rect x="190" y="58" width="120" height="9" rx="2"/>
    <rect x="190" y="80" width="96" height="9" rx="2"/>
    <rect x="190" y="126" width="110" height="9" rx="2"/>
    <rect x="190" y="148" width="88" height="9" rx="2"/>
    <rect x="190" y="192" width="104" height="9" rx="2"/>
  </g>
</svg>
<figcaption>Wide rung, diptych: the same table above and below its reflow breakpoint. Labels in accent, values muted.</figcaption>
</figure>

The triptych is the **Full-rung calibration artifact**: three panels comparing what
each remaining directive does below its breakpoint. Three panels side by side is the
constraint the Full cap is derived from — **the width where these three stop being
legible is the floor.**

<figure class="panels panels-3 full">
<svg viewBox="0 0 400 260" role="img" aria-label="Transpose: the header row becomes the left-hand label column">
  <text x="200" y="24" text-anchor="middle" fill="var(--text)" font-size="15">transpose</text>
  <g stroke="var(--border)">
    <rect x="24" y="44" width="110" height="200" fill="var(--surface)"/>
    <rect x="134" y="44" width="121" height="200" fill="none"/>
    <rect x="255" y="44" width="121" height="200" fill="var(--surface-sunken)"/>
  </g>
  <g fill="var(--accent)">
    <rect x="38" y="62" width="70" height="10" rx="2"/>
    <rect x="38" y="112" width="70" height="10" rx="2"/>
    <rect x="38" y="162" width="70" height="10" rx="2"/>
    <rect x="38" y="212" width="70" height="10" rx="2"/>
  </g>
  <g fill="var(--muted)">
    <rect x="148" y="62" width="80" height="9" rx="2"/><rect x="269" y="62" width="72" height="9" rx="2"/>
    <rect x="148" y="112" width="66" height="9" rx="2"/><rect x="269" y="112" width="84" height="9" rx="2"/>
    <rect x="148" y="162" width="88" height="9" rx="2"/><rect x="269" y="162" width="60" height="9" rx="2"/>
    <rect x="148" y="212" width="72" height="9" rx="2"/><rect x="269" y="212" width="78" height="9" rx="2"/>
  </g>
</svg>
<svg viewBox="0 0 400 260" role="img" aria-label="Scroll: the table pans horizontally inside its own container">
  <text x="200" y="24" text-anchor="middle" fill="var(--text)" font-size="15">scroll</text>
  <rect x="24" y="44" width="352" height="180" rx="4" fill="var(--surface)" stroke="var(--border)"/>
  <g fill="var(--accent)">
    <rect x="40" y="62" width="56" height="10" rx="2"/>
    <rect x="128" y="62" width="56" height="10" rx="2"/>
    <rect x="216" y="62" width="56" height="10" rx="2"/>
    <rect x="304" y="62" width="56" height="10" rx="2"/>
  </g>
  <g fill="var(--muted)">
    <rect x="40" y="96" width="48" height="8" rx="2"/><rect x="128" y="96" width="60" height="8" rx="2"/><rect x="216" y="96" width="52" height="8" rx="2"/><rect x="304" y="96" width="58" height="8" rx="2"/>
    <rect x="40" y="126" width="58" height="8" rx="2"/><rect x="128" y="126" width="46" height="8" rx="2"/><rect x="216" y="126" width="62" height="8" rx="2"/><rect x="304" y="126" width="48" height="8" rx="2"/>
    <rect x="40" y="156" width="50" height="8" rx="2"/><rect x="128" y="156" width="64" height="8" rx="2"/><rect x="216" y="156" width="44" height="8" rx="2"/><rect x="304" y="156" width="60" height="8" rx="2"/>
  </g>
  <g fill="var(--muted)" opacity="0.35">
    <rect x="356" y="52" width="20" height="164"/>
  </g>
  <rect x="24" y="230" width="140" height="5" rx="2.5" fill="var(--accent)"/>
  <rect x="24" y="230" width="352" height="5" rx="2.5" fill="none" stroke="var(--border)"/>
</svg>
<svg viewBox="0 0 400 260" role="img" aria-label="Expand: a button opens the table in a fullscreen overlay">
  <text x="200" y="24" text-anchor="middle" fill="var(--text)" font-size="15">expand</text>
  <rect x="24" y="44" width="200" height="120" rx="4" fill="var(--surface)" stroke="var(--border)"/>
  <g fill="var(--muted)">
    <rect x="38" y="60" width="60" height="8" rx="2"/><rect x="118" y="60" width="60" height="8" rx="2"/>
    <rect x="38" y="84" width="52" height="8" rx="2"/><rect x="118" y="84" width="68" height="8" rx="2"/>
    <rect x="38" y="108" width="64" height="8" rx="2"/><rect x="118" y="108" width="48" height="8" rx="2"/>
  </g>
  <text x="210" y="62" text-anchor="middle" fill="var(--accent)" font-size="14">⛶</text>
  <line x1="180" y1="140" x2="250" y2="176" stroke="var(--muted)" marker-end="url(#arr3)"/>
  <rect x="140" y="150" width="236" height="100" rx="4" fill="var(--surface)" stroke="var(--accent)"/>
  <g fill="var(--muted)">
    <rect x="156" y="170" width="88" height="9" rx="2"/><rect x="264" y="170" width="88" height="9" rx="2"/>
    <rect x="156" y="196" width="76" height="9" rx="2"/><rect x="264" y="196" width="96" height="9" rx="2"/>
    <rect x="156" y="222" width="92" height="9" rx="2"/><rect x="264" y="222" width="72" height="9" rx="2"/>
  </g>
  <text x="362" y="168" text-anchor="middle" fill="var(--accent)" font-size="13">✕</text>
  <defs>
    <marker id="arr3" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
      <path d="M0,0 L8,4 L0,8 z" fill="var(--muted)"/>
    </marker>
  </defs>
</svg>
<figcaption>Full rung, triptych: a comparison earns width because side-by-side is the point. Drops to 2-up, then stacks, at its own legibility floor — not at the rung edge.</figcaption>
</figure>

## Screenshots

A single small screenshot sits in the Column with a quiet hairline frame. It ships as
a light and a dark capture, and the swap keys on `data-theme` — flip the theme toggle
and this image must flip with it, without a glare in either direction:

<figure class="no-bleed shot-pair">
  <img class="shot-dark" src="/img/ladder/home-dark.png" alt="akesson.io home in the dark theme" width="600">
  <img class="shot-light" src="/img/ladder/home-light.png" alt="akesson.io home in the light theme" width="600">
  <figcaption>Column rung: the site's own home page, captured per theme.</figcaption>
</figure>

A cross-platform set renders as an equal-cell grid on the Wide rung: shared aspect
ratio, each cell labelled, one caption for the whole set:

<figure class="shot-set">
  <div class="shot-cell">
    <img src="/img/ladder/term-macos.png" alt="Terminal on macOS">
    <span class="shot-label">macOS</span>
  </div>
  <div class="shot-cell">
    <img src="/img/ladder/term-linux.png" alt="Terminal on Linux">
    <span class="shot-label">Linux</span>
  </div>
  <div class="shot-cell">
    <img src="/img/ladder/term-windows.png" alt="Terminal on Windows">
    <span class="shot-label">Windows</span>
  </div>
  <figcaption>Wide rung: the same command on three platforms — equal cells, labels, one caption.</figcaption>
</figure>

## What "settled" means

Every claim above is checkable: the 99-column block does not scroll at ≥1500px
viewports; the triptych holds three legible panels at ≥1600px; no artifact — table
included — ever widens the page at any width; every figure works in both themes; below
`$bp-md` everything is one column. And all four table directives are *observable* on
this page: reflow flips to cards, transpose flips to a label column, scroll pans, and
expand offers its overlay, each at the breakpoint written in this file's markdown.
When those hold, the provisional caps stop being provisional.
