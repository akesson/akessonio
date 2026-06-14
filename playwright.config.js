import { defineConfig, devices } from '@playwright/test';

// A tiny static server serves the built `public/` so screenshot URLs match the
// real site exactly (Zola's pretty URLs). The suite *generates* committed PNGs;
// it does not assert against a baseline — regression diffing is `git diff`.
const PORT = 8787;

export default defineConfig({
  testDir: 'tests',
  // 10 parallel workers. Output stays diff-stable run-to-run: the settle loop +
  // tolerant pixelmatch write in screenshots.spec.js absorb the ~1px font-swap
  // jitter parallelism can introduce (verified across consecutive runs).
  // Note: worker count barely changes wall-clock here (~36s at both 1 and 10) —
  // the suite is bound by per-test screenshot/CPU-raster work and the single
  // static server, not test-level CPU concurrency.
  workers: 10,
  forbidOnly: !!process.env.CI,
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    // Freezes the wall-clock `--hue` drift (index.html / main.js gate it on
    // reduced motion) so colours are deterministic across runs. Also disables
    // the 1s hue setInterval, which makes `networkidle` reliable.
    reducedMotion: 'reduce',
    viewport: { width: 1200, height: 900 },
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Deterministic text rasterization across runs: software raster + no
        // font hinting + pinned colour profile. Without these, glyph-edge
        // anti-aliasing varies imperceptibly run-to-run and churns the PNGs.
        launchOptions: {
          args: ['--disable-gpu', '--font-render-hinting=none', '--force-color-profile=srgb'],
        },
      },
    },
  ],
  webServer: {
    command: `node tests/serve.mjs ${PORT}`,
    url: `http://127.0.0.1:${PORT}/sitemap.xml`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
