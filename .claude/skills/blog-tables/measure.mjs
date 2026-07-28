// Measure every content table on a built page for the width/sticky directives
// (docs/table-design/DECISIONS.md rounds 5–6). Prints JSON to stdout.
//
//   node .claude/skills/blog-tables/measure.mjs <built-page-url>
//
// The URL must point at a page built with the site's real CSS (fonts, cell
// padding and font-size all shape the measurement) — see SKILL.md for the
// file:// build recipe. Per table it reports the natural (max-content) width,
// the 6rem-scale snap for the panel, and the round-6 sticky verdict for the
// first column. The snap accounts for the panel being border-box: outer width
// = table + 2rem horizontal padding + 2px light-theme border.

import pkg from '/Users/hakesson/Developer/akesson/website/node_modules/playwright-core/index.js';
const { chromium } = pkg;

const url = process.argv[2];
if (!url) {
  console.error('usage: node measure.mjs <built-page-url>');
  process.exit(2);
}

const browser = await chromium.launch();
const page = await browser.newPage({ reducedMotion: 'reduce', viewport: { width: 1600, height: 1200 } });
await page.goto(url);
await page.evaluate(() => document.fonts.ready);
// Dark is the site default; headless Chromium would otherwise pick light.
await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
await page.waitForTimeout(100);

const report = await page.evaluate(() => {
  const REM = 16;
  const PANEL_CHROME = 2 * REM + 2; // 2×$space-4 padding + light border, border-box
  const STEPS = [12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78, 80]; // rem; 80 = cap
  const STICKY_BUDGET = 6 * REM; // round 6: B = 30% of the 20rem phone container

  // Line boxes of a cell's inline content (one rect per line, deduped by top).
  const lineCount = (cell) => {
    const range = document.createRange();
    range.selectNodeContents(cell);
    const tops = new Set();
    for (const r of range.getClientRects()) {
      if (r.width > 0 && r.height > 0) tops.add(Math.round(r.top / 4));
    }
    return Math.max(1, tops.size);
  };

  const tables = [...document.querySelectorAll('.content table')].filter(
    (t) => !t.closest('pre')
  );

  return tables.map((table, index) => {
    const wrapper = table.closest(
      '.reflow, .transpose, .table-scroll, .table-expand, .table-width'
    );
    const kind = wrapper
      ? ['reflow', 'transpose', 'table-scroll', 'table-expand', 'table-width'].find((c) =>
          wrapper.classList.contains(c)
        )
      : 'bare';

    const rows = table.querySelectorAll('tbody tr:not(.group)').length;
    const cols = table.querySelectorAll('thead th').length;
    const headers = [...table.querySelectorAll('thead th')].map((th) => th.textContent.trim());

    // Natural (max-content) width: a hidden clone laid out unconstrained, in the
    // plain-table context (.content) so the site's cell styles apply.
    const probe = document.createElement('div');
    probe.style.cssText =
      'position: absolute; left: -99999px; top: 0; visibility: hidden; width: max-content;';
    const clone = table.cloneNode(true);
    clone.style.cssText = 'display: table; width: max-content; max-width: none;';
    probe.appendChild(clone);
    document.querySelector('.content').appendChild(probe);
    const naturalPx = clone.getBoundingClientRect().width;

    // Sticky analysis on the clone's first column (body + header cells).
    const firstCells = [
      ...clone.querySelectorAll('thead th:first-child, tbody tr:not(.group) td:first-child'),
    ];
    for (const c of firstCells) c.style.whiteSpace = 'nowrap';
    const maxLabelPx = Math.max(0, ...firstCells.map((c) => c.getBoundingClientRect().width));
    const fitsOneLine = maxLabelPx <= STICKY_BUDGET;
    // Two-line check: clamp like `scroll: sticky 6rem` does and count line boxes.
    for (const c of firstCells) {
      c.style.whiteSpace = 'normal';
      c.style.maxWidth = `${STICKY_BUDGET}px`;
    }
    const maxLines = Math.max(1, ...firstCells.map(lineCount));
    probe.remove();

    const panelOuterPx = naturalPx + PANEL_CHROME;
    const snapRem = STEPS.find((s) => s * REM >= panelOuterPx) ?? null;

    return {
      index,
      kind,
      rows,
      cols,
      headers,
      naturalPx: Math.round(naturalPx),
      panelOuterPx: Math.round(panelOuterPx),
      snapRem, // null → wider than the 80rem cap: use the shape map, not a width
      sticky: {
        maxLabelPx: Math.round(maxLabelPx),
        maxLinesAt6rem: maxLines,
        verdict: fitsOneLine ? 'sticky' : maxLines <= 2 ? 'sticky 6rem' : 'none',
      },
    };
  });
});

console.log(JSON.stringify(report, null, 2));
await browser.close();
