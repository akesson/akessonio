# Table design system — decision log

Process: one self-contained HTML per round (`round-N-*.html`, open directly in a
browser — real tokens, theme toggle, drag-resizable samples that pivot to cards
via the same container-query mechanism zola-plus generates). Henrik picks; the
choice is recorded here; the next round builds on it. After the last round the
winning system is implemented in `sass/style.scss` (+ the reflow/transpose/
scroll/expand author styles) and the exploration drafts are deleted.

Direction references: two screenshots (2026-07-22) — elevated card container
with caption bar, uppercase letterspaced dimmed headers, airy padding, hairline
rows. Research: booktabs canon, Butterick (borders off first; tabular figures,
digits aligned), see the table-styles draft session.

## Ladder

| Round | Decides | Status |
|---|---|---|
| 1 | Container: bare / sunken panel / captioned card / booktabs frame | **decided** (theme-split, see below) |
| 2 | Header treatment (weight, case, colour, rule) | **decided** (2A, see below) |
| 3 | Row separation & density (hairlines / banding / whitespace; padding scale) | **decided** (3A + 3E, see below) |
| 4 | Cell typography & alignment (numeric right-align + tabular figures, first-column emphasis, inline-code colour) | **decided** (4B + fit-content, 4C provisional, 4F — see below) |
| 5 | Responsive pivots: behavior map (when each directive works / fails), grouped rows & complex variants, scroll sticky column, expand overlay | **decided** (P1 + P2, see below; P3 superseded by round 6's sticky policy) |
| 6 | Width scheme: centered panels — continuous / three rungs / equal 6rem steps — overflow past Full, sticky coverage guard | **decided** (W measured steps + S measured sticky, below) — **ladder complete** |

## Decisions

- **Round 1 — container (2026-07-22): theme-split, no caption anywhere.**
  Dark mode → **1B sunken panel** (`--surface-sunken`, radius 12, no
  border/shadow — recessed, the code-block containment language). Light mode →
  **1C's card without its caption bar** (`--surface`, 1px `--border`, radius 12,
  soft shadow — raised but bare). The caption bar was dropped in both themes
  ("title in text everywhere", follow-up 2026-07-22): a table's title/context
  always lives in the running prose before it, never in table chrome. This also
  keeps markdown authoring plain — no caption directive needed.

- **Round 2 — header (2026-07-22): 2A, uppercase dimmed with rule.** Both
  themes: `thead th` at `0.72rem / 0.14em letterspacing / uppercase / 600 /
  --muted`, with a `1px --border` rule under the header row. The reflow card
  labels (`td::before`) speak the same voice. This is the reference-screenshot
  header, now a decision rather than a working default.

- **Round 3 — rows & density (2026-07-22): 3A + 3E.** Hairline row separation
  (`1px --border` under each body row, none after the last) at the default
  density (`0.65rem × 1rem` cell padding). Both themes. Rationale (readability
  canon): hairlines at low contrast guide the eye across wide rows without the
  gray mass of banding — banding's measured benefit is marginal (Enders 2008)
  and mainly for 10+-row tables; 0.65rem vertical (~0.6em) keeps rows grouped
  (Gestalt proximity) and matches the body rhythm. In reflow card mode the
  hairlines become the separators between cards.

- **Round 4 — cells (2026-07-22): 4B + fit-content width, 4C (provisional),
  4F.** Numbers stay left-aligned — they read like words (4B). **Width
  amendment**: a table (and its panel) hugs its content — `width: fit-content`
  capped by the rung — instead of stretching to 100%; a table wider than its
  rung is exactly what the pivot directives handle. First column stays plain
  (4C), *provisional*: revisit if complex variants (grouped rows, row headers)
  want emphasis. Inline code in tables renders in the text colour (4F) — the
  mono shape alone marks code, less colour per row. Verified fact for the
  record: Hanken Grotesk's ten digit glyphs are equal-width by default, so
  per-column right-alignment via markdown `---:` stays available at zero cost
  whenever an author wants comparable magnitudes.

- **Round 5 — P1, the shape map (2026-07-22): adopted.** When a table is too
  wide, the escape hatch follows its shape: rows are self-contained records →
  **reflow** (cards lose nothing); few rows × many columns → **transpose**
  (flip stays a table); numbers compared in both directions → **scroll**
  (cards would destroy the column comparisons); too big even for Full →
  **expand**. This is authoring guidance; the width-measuring skill suggests
  from it when it flags an oversized table.

- **Round 5 — P2, grouped rows (2026-07-22): adopted, dash-row syntax.** A
  body row whose cells after the first are all dashes (3+) is a group header
  — it echoes the delimiter row, so the source reads as a section divider:

  ```markdown
  | flag               | arity | effect                  |
  |--------------------|-------|-------------------------|
  | **sync behaviour** |-------|-------------------------|
  | `--no-sync`        | 0     | skip the snapshot push  |
  ```

  Renders as a full-width group heading in the header voice (2A, one step up);
  in reflow card mode it becomes a heading between cards. First-cell inline
  markdown is allowed; bold is conventional but not required (the dashes are
  the trigger). Caveat accepted: outside zola-plus (e.g. GitHub preview) the
  dashes render literally. A zola-plus extension implements this.

- **Round 6 — width scheme (2026-07-22): measured equal steps.** Panels are
  **centered** and sized on the **equal 6rem step scale** (…18, 24, 30, 36, 42,
  48, 54, 60, 66, 72, 78; cap 80rem — steps exist below Column and above Wide;
  42/66 lie on the scale). The step is **not chosen by CSS at render time**:
  a Claude authoring skill builds the article, measures each table's natural
  width in Playwright, snaps it up to the scale, and writes the width into the
  table's directive in the markdown. Deterministic in every browser (Safari
  included — `calc-size` rejected for being Chrome-only), zero runtime logic,
  and re-runnable when content changes. Table centers inside its panel; ≤6rem
  slack splits symmetrically. Wider than 80rem natural → the shape-map pivots
  (scroll/expand), unchanged.

- **Round 6 — sticky guard (2026-07-22): measured, like the widths.** Sticky
  applies only to scroll tables. Reference: the narrowest reading container
  C = 20rem (a 375px phone minus page padding); budget B = **30% of C = 6rem**
  (pleasingly, exactly one width step). The authoring skill measures the first
  column: (1) every label fits one line at ≤ B → `scroll: sticky` (nowrap);
  (2) else, laid out at B every label fits **≤ 2 lines** → `scroll: sticky
  6rem` (fixed width, natural two-liners stay two lines); (3) else → plain
  `scroll`, no sticky — a column that long would wall off the screen. Runtime
  CSS just obeys the written directive (position: sticky + max-width +
  white-space: normal); deterministic in every browser, re-measured on edit.
  Verified feasible: the Playwright probe correctly passed the short-label
  guest table and rejected the long-label benchmark table.

## Working defaults used while undecided

Reflow breakpoint 37rem (decided in round 5). Everything else — container,
header, rows, density — is now a recorded decision above.
