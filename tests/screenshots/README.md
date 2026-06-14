# Page screenshots

Committed visual record of every page, in **light** and **dark** themes at **6 viewport
widths** (`375 · 600 · 900 · 1200 · 1440 · 1920`). Filenames are
`<slug>__<theme>__<width>w.png` (e.g. `projects-cargo-leptos__dark__1200w.png`).

The page list is **dynamic** — parsed from `public/sitemap.xml` at run time — so adding an
article, project, or tag captures it automatically with no test changes.

## Regenerate

```bash
npm run screenshots        # zola build --base-url … && playwright test
```

Re-running overwrites in place; review with `git diff` / `git status` and commit.

## How it stays diff-clean

Two details keep a no-op re-run from churning git:

- **Local assets.** The build passes `--base-url http://127.0.0.1:8787` so the page's CSS/JS/
  fonts resolve to the local server, not the production domain baked into `config.toml`. Without
  this the browser loads production assets and screenshots the wrong (deployed) styles.
- **Tolerant write.** Each shot is compared to the committed PNG with `pixelmatch`; the file is
  rewritten only on a real visual change. Headless Chromium's glyph-edge anti-aliasing jitters
  imperceptibly between runs — that noise is ignored, real changes always rewrite.

Determinism is further helped by `reducedMotion: 'reduce'` (freezes the drifting accent hue),
deterministic-raster launch flags, and a settle loop (`tests/screenshots.spec.js`). The spec waits
on `load` rather than `networkidle`, keeping a run to ~37s.

## Size

PNGs are tracked with **Git LFS** (`.gitattributes`: `tests/screenshots/*.png`) — the working repo
stays tiny (pointers), favicons/text stay in normal git. Each shot is also run through **oxipng**
(lossless, ~−32%) *before* the diff, so it shrinks without touching pixels and unchanged files are
never rewritten. oxipng is an optional system tool (`brew install oxipng`); if it's missing the
suite still works and just commits larger PNGs.

Config: `playwright.config.js`, `tests/pages.js` (page list + widths/themes),
`tests/screenshots.spec.js`, `tests/serve.mjs` (static server for `public/`).
