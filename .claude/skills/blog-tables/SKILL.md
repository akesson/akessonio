---
name: blog-tables
description: Measure an article's tables and write the width/shape/sticky directives (the decided table system, docs/table-design/DECISIONS.md). Use after writing or editing any article that contains markdown tables, before it ships.
---

# blog-tables — measure tables, write directives

The site's table widths are **not chosen by CSS at render time**: each table's
panel sits on the equal 6rem step scale, measured here with real fonts and
written into a directive in the markdown (DECISIONS.md round 6). Same for the
sticky-column verdict on scroll tables. Re-run this whenever a table's content
changes — the directives are only as fresh as the last measurement.

## Workflow

1. **Build the article** to a scratch dir with the file:// base URL (real CSS +
   fonts is the whole point; `--drafts` because unpublished articles are drafts):

   ```sh
   OUT=<scratchpad>/measure-public
   ~/.cargo/bin/zola-plus build --drafts --base-url "file://$OUT" -o "$OUT" --force
   ```

   Traps: use `~/.cargo/bin/zola-plus` explicitly and reinstall after any
   zola-plus source change (a stale binary silently no-ops directives — check
   `$OUT/responsive-tables.css` exists whenever directives are present); file://
   URLs need the explicit `/index.html` (directory URLs don't resolve).

2. **Measure** every table on the page:

   ```sh
   node .claude/skills/blog-tables/measure.mjs "file://$OUT/<slug>/index.html"
   ```

   Per table it reports `naturalPx` (max-content width), `snapRem` (panel outer
   width snapped up the scale …18, 24, 30 … 78, cap 80 — already accounting for
   the panel's 2rem padding + border; `null` means wider than the cap), and a
   `sticky` verdict for the first column (round-6 policy: every label one line
   within the 6rem budget → `sticky`; ≤2 lines when clamped to 6rem →
   `sticky 6rem`; else `none`).

3. **Decide shape, then width, per table** (round-5 shape map):

   | shape | directive |
   |---|---|
   | fits at its snap, no pivot needed | `<!-- table: <snap>rem -->` |
   | rows are self-contained records | `<!-- reflow: 37rem width <snap>rem -->` |
   | few rows × many columns (spec sheet) | `<!-- transpose: <bp> width <snap>rem -->` |
   | numbers compared in both directions (matrix) | `<!-- scroll[: sticky …] width <snap>rem -->` |
   | `snapRem: null` (wider than 80rem) | `<!-- scroll: … -->` or `<!-- expand: <bp> -->`, **no width** |

   - 37rem is the decided pivot breakpoint for **both reflow and transpose**
     (the site's card/flip appearance CSS is keyed to that value — don't vary
     it). For expand pick the width where the table starts feeling cramped
     (40rem is the usual default; it only gates the button).
   - On `scroll`, append the measured sticky verdict (`sticky` / `sticky 6rem` /
     nothing). Only scroll takes `sticky`.
   - Grouped rows use the dash-row convention — a body row whose cells after the
     first are all dashes: `| **group label** |------|------|`.

4. **Write the directives** into the markdown: each on its own line, **blank
   line between directive and table**. Set `responsive_tables = true` in the
   page's `[extra]` front-matter iff the page uses any directive (it links the
   generated stylesheet).

5. **Rebuild and verify**: build again, confirm the wrappers/widths landed
   (grep the HTML for `--table-w`), and screenshot or `open` the page at a wide
   and a narrow width. If a table changed content since its directive was
   written, its width is stale — this skill is the refresh.

## Notes

- Production CI still builds with vanilla zola (shalzz action), so directives
  currently no-op in production until the deploy workflow moves to zola-plus.
  Local `zola-plus serve/build` is where they render.
- A width below the Column cap is still worth writing: panels sit on shared
  steps (calm, repeatable widths), not on whatever `fit-content` produced.
- Full grammar and emitted markup: zola-plus
  `docs/content/documentation/content/tables.md`.
