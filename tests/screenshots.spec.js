import { test } from '@playwright/test';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { PAGES, WIDTHS, THEMES } from './pages.js';

// Two independent stabilisers, each killing one source of churn:
//
// 1. settle() — re-screenshot until two consecutive frames are byte-identical.
//    Within a single page load the raster is deterministic, so this returns on
//    the second shot normally; it only loops when a transient (e.g. a web-font
//    swapping in a frame after fonts.ready) is still settling. Guarantees the
//    captured frame is the page's canonical, settled render.
//
// 2. writeIfChanged() — commit a frame only when it differs meaningfully from
//    the one on disk. Headless Chromium's glyph-edge anti-aliasing wobbles
//    imperceptibly between separate runs; pixelmatch ignores that, so a no-op
//    re-run yields zero git churn, while real visual changes always rewrite.
//
// PIXELMATCH_THRESHOLD is the per-pixel YIQ tolerance. Headless Chromium's
// glyph-edge jitter between runs reaches a YIQ delta just under 0.35 (measured
// across 600+ run-to-run pairs: 0.30 still left up to ~28k px on text-dense
// pages; 0.35 zeroed every pair). Real content/colour changes register far
// above this. CHANGED_PX is a small floor for stray pixels; real changes move
// thousands.
const PIXELMATCH_THRESHOLD = 0.35;
const CHANGED_PX = 100;

// Lossless PNG shrink (~32%) via oxipng. Optimizing BEFORE the diff is the key:
// an unchanged shot still matches pixel-wise, so writeIfChanged keeps its
// committed (already-optimized) bytes and never rewrites — no self-churn, and no
// dependence on oxipng being byte-deterministic. Best-effort: if oxipng isn't
// installed (`brew install oxipng`), commit the screenshots unoptimized.
const HAS_OXIPNG = (() => {
  try {
    execFileSync('oxipng', ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    console.warn('oxipng not found — screenshots will be committed unoptimized (brew install oxipng)');
    return false;
  }
})();

function optimize(buf) {
  if (!HAS_OXIPNG) return buf;
  try {
    return execFileSync('oxipng', ['-o', '2', '--strip', 'safe', '-q', '--stdout', '-'], {
      input: buf,
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch {
    return buf; // optimization is best-effort; never fail a capture over it
  }
}

async function settle(page) {
  let prev = null;
  for (let i = 0; i < 6; i++) {
    const buf = await page.screenshot({ fullPage: true, animations: 'disabled' });
    if (prev && buf.equals(prev)) return buf;
    prev = buf;
    await page.waitForTimeout(100);
  }
  return prev;
}

function writeIfChanged(path, buf) {
  if (existsSync(path)) {
    try {
      const next = PNG.sync.read(buf);
      const prev = PNG.sync.read(readFileSync(path));
      if (next.width === prev.width && next.height === prev.height) {
        const diff = pixelmatch(prev.data, next.data, null, next.width, next.height, {
          threshold: PIXELMATCH_THRESHOLD,
          includeAA: false,
        });
        if (diff <= CHANGED_PX) return; // within noise — keep the committed file
      }
    } catch {
      /* unreadable/garbled existing file — fall through and overwrite */
    }
  }
  writeFileSync(path, buf);
}

// One screenshot per page × theme × width. Filenames are deterministic so the
// committed gallery overwrites in place and `git diff` shows real changes only.
for (const theme of THEMES) {
  test.describe(theme, () => {
    // colorScheme emulates prefers-color-scheme before first paint; the site's
    // default "system" mode resolves data-theme from it. Static per describe,
    // as Playwright's test.use requires.
    test.use({ colorScheme: theme });

    for (const { path, slug } of PAGES) {
      for (const width of WIDTHS) {
        test(`${slug} @ ${width}w (${theme})`, async ({ page }) => {
          await page.setViewportSize({ width, height: 900 });
          await page.goto(path, { waitUntil: 'load' });
          await page.evaluate(() => document.fonts.ready); // no flash of unstyled text
          const buf = optimize(await settle(page));
          writeIfChanged(`tests/screenshots/${slug}__${theme}__${width}w.png`, buf);
        });
      }
    }
  });
}
