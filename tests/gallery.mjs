// Local-only screenshot review page generator.
//
// Scans tests/screenshots/*.png (named `<name>__<theme>__<width>w.png`), groups
// them by page, and writes a self-contained `gallery.html` you open straight
// from disk (file://) — no server needed. The HTML is gitignored (derived,
// regenerable); this generator is the committed source.
//
//   node tests/gallery.mjs        # or: npm run gallery
//
// `npm run screenshots` runs it automatically after a capture, so adding an
// article/project surfaces a new row with zero edits here.

import { readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const DIR = join(dirname(fileURLToPath(import.meta.url)), 'screenshots');
const OUT = join(DIR, 'gallery.html');

// name__theme__123w.png
const RE = /^(.+)__(light|dark)__(\d+)w\.png$/;

const pages = new Map(); // name -> Map(width -> {light, dark})
for (const file of readdirSync(DIR)) {
  const m = RE.exec(file);
  if (!m) continue;
  const [, name, theme, w] = m;
  const width = Number(w);
  if (!pages.has(name)) pages.set(name, new Map());
  const widths = pages.get(name);
  if (!widths.has(width)) widths.set(width, {});
  widths.get(width)[theme] = file;
}

if (pages.size === 0) {
  console.error(`No screenshots found in ${DIR}. Run \`npm run screenshots\` first.`);
  process.exit(1);
}

// home first, then alphabetical.
const names = [...pages.keys()].sort((a, b) =>
  a === 'home' ? -1 : b === 'home' ? 1 : a.localeCompare(b),
);

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

// Inline zoom levels. The width bucket (e.g. 375) IS the image's CSS pixel
// width, so a level just scales that. Default 50% keeps wide shots on-screen.
const ZOOM_STEPS = [25, 50, 75, 100];
const DEFAULT_ZOOM_INDEX = 1; // 50%
const DEFAULT_ZOOM = ZOOM_STEPS[DEFAULT_ZOOM_INDEX];

const sections = names
  .map((name) => {
    const widths = [...pages.get(name).entries()].sort((a, b) => a[0] - b[0]);
    const shots = widths
      .map(([width, t]) => {
        const light = t.light || t.dark;
        const dark = t.dark || t.light;
        const w0 = Math.round((width * DEFAULT_ZOOM) / 100);
        return (
          `      <figure class="shot">` +
          `<img loading="lazy" alt="${esc(name)} ${width}w" data-w="${width}" ` +
          `style="width:${w0}px" ` +
          `data-light="${esc(light)}" data-dark="${esc(dark)}" src="${esc(light)}">` +
          `<figcaption class="badge">${width}w</figcaption></figure>`
        );
      })
      .join('\n');
    return (
      `    <section id="p-${esc(name)}">\n` +
      `      <h2>${esc(name)}</h2>\n` +
      `      <div class="row">\n${shots}\n      </div>\n` +
      `    </section>`
    );
  })
  .join('\n');

const toc = names
  .map((name) => `<a href="#p-${esc(name)}">${esc(name)}</a>`)
  .join('\n        ');

const html = `<!doctype html>
<html lang="en" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Screenshot review</title>
<style>
  :root { --bg:#fff; --fg:#16181d; --muted:#6b7280; --line:#e5e7eb; --chrome:#fafafaf2; }
  html[data-theme="dark"] { --bg:#0d0e11; --fg:#e8eaed; --muted:#8b94a3; --line:#262a31; --chrome:#14161bf2; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--fg);
         font:14px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif; }
  header { position:sticky; top:0; z-index:10; display:flex; align-items:center; gap:1rem;
           padding:.55rem 1rem; background:var(--chrome); backdrop-filter:blur(8px);
           border-bottom:1px solid var(--line); }
  .brand { font-weight:600; white-space:nowrap; }
  .brand .count { color:var(--muted); font-weight:400; margin-left:.4rem; }
  .toc { display:flex; gap:.35rem; overflow-x:auto; flex:1; scrollbar-width:thin; }
  .toc a { color:var(--muted); text-decoration:none; padding:.15rem .5rem; border-radius:5px;
           white-space:nowrap; }
  .toc a:hover { color:var(--fg); background:var(--line); }
  .controls { display:flex; align-items:center; gap:.5rem; }
  #toggle, .zoom button { cursor:pointer; border:1px solid var(--line); background:var(--bg);
            color:var(--fg); padding:.4rem .8rem; border-radius:7px; white-space:nowrap; font:inherit; }
  #toggle:hover, .zoom button:hover { border-color:var(--muted); }
  .zoom { display:flex; align-items:center; gap:.25rem; }
  .zoom button { padding:.4rem .65rem; font-weight:600; line-height:1; }
  .zoom button:disabled { opacity:.4; cursor:default; }
  .zoom #zoom-val { min-width:3.2em; text-align:center; color:var(--muted);
                    font-variant-numeric:tabular-nums; }
  main { padding-bottom:30vh; }
  section { border-top:1px solid var(--line); scroll-margin-top:3.1rem; }
  section h2 { margin:.7rem 1rem .2rem; font-size:1rem; font-variant-numeric:tabular-nums; }
  /* full-bleed row: shots snap their LEFT edge to the viewport's left edge */
  .row { display:flex; gap:1rem; align-items:flex-start; overflow-x:auto;
         scroll-snap-type:x mandatory; scroll-padding-left:0; padding:.5rem 0 1.2rem; }
  .shot { flex:0 0 auto; scroll-snap-align:start; position:relative; margin:0; }
  .shot:first-child { scroll-snap-align:start; }
  .shot img { display:block; height:auto; border:1px solid var(--line);
              box-shadow:0 1px 8px rgba(0,0,0,.12); cursor:zoom-in; }
  .badge { position:absolute; top:8px; left:8px; background:rgba(10,12,16,.78); color:#fff;
           font-size:11px; font-weight:600; padding:2px 7px; border-radius:5px;
           font-variant-numeric:tabular-nums; pointer-events:none; }
  /* click-to-fullscreen lightbox: fit to width, scroll a tall shot vertically */
  #lightbox { position:fixed; inset:0; z-index:100; background:rgba(0,0,0,.93);
              overflow:auto; cursor:zoom-out; display:flex; justify-content:center;
              align-items:flex-start; padding:1.5rem; }
  #lightbox[hidden] { display:none; }
  #lightbox img { max-width:100%; height:auto; box-shadow:0 8px 50px rgba(0,0,0,.6); }
</style>
</head>
<body>
  <header>
    <div class="brand">Screenshots <span class="count">${names.length} pages</span></div>
    <nav class="toc">
        ${toc}
    </nav>
    <div class="controls">
      <div class="zoom" role="group" aria-label="Zoom">
        <button id="zoom-out" aria-label="Zoom out" title="Zoom out (-)">−</button>
        <span id="zoom-val">${DEFAULT_ZOOM}%</span>
        <button id="zoom-in" aria-label="Zoom in" title="Zoom in (+)">+</button>
      </div>
      <button id="toggle" aria-pressed="false">🌙 Dark</button>
    </div>
  </header>
  <main>
${sections}
  </main>
  <div id="lightbox" hidden><img alt=""></div>
<script>
  (function () {
    var html = document.documentElement;
    var btn = document.getElementById('toggle');
    var theme = 'light';
    function apply() {
      html.setAttribute('data-theme', theme);
      btn.textContent = theme === 'light' ? '🌙 Dark' : '☀️ Light';
      btn.setAttribute('aria-pressed', theme === 'dark');
      var imgs = document.querySelectorAll('.shot img');
      for (var i = 0; i < imgs.length; i++) {
        imgs[i].src = imgs[i].dataset[theme];
      }
    }
    btn.addEventListener('click', function () {
      theme = theme === 'light' ? 'dark' : 'light';
      apply();
    });
    // 'd' / 'l' shortcuts
    document.addEventListener('keydown', function (e) {
      if (e.key === 'd') { theme = 'dark'; apply(); }
      if (e.key === 'l') { theme = 'light'; apply(); }
    });

    // Synced horizontal scroll: scrolling one row scrolls them all to the same
    // offset. Every row has identical widths + gap, so a shared scrollLeft
    // lines up the same width column in every row. The "!== x" guard stops a
    // programmatic set from echoing back into an endless scroll loop.
    var rows = [].slice.call(document.querySelectorAll('.row'));
    var syncing = false;
    rows.forEach(function (row) {
      row.addEventListener('scroll', function () {
        if (syncing) return;
        syncing = true;
        var x = row.scrollLeft;
        for (var i = 0; i < rows.length; i++) {
          if (rows[i] !== row && rows[i].scrollLeft !== x) rows[i].scrollLeft = x;
        }
        syncing = false;
      }, { passive: true });
    });

    // Zoom stepper: each level scales every shot's width by data-w (the bucket
    // px). Global, so synced scroll + snapping still line up across rows.
    var ZOOM = ${JSON.stringify(ZOOM_STEPS)};
    var zi = ${DEFAULT_ZOOM_INDEX};
    var zOut = document.getElementById('zoom-out');
    var zIn = document.getElementById('zoom-in');
    var zVal = document.getElementById('zoom-val');
    function applyZoom() {
      var pct = ZOOM[zi];
      zVal.textContent = pct + '%';
      var imgs = document.querySelectorAll('.shot img');
      for (var i = 0; i < imgs.length; i++) {
        imgs[i].style.width = Math.round(imgs[i].dataset.w * pct / 100) + 'px';
      }
      zOut.disabled = zi === 0;
      zIn.disabled = zi === ZOOM.length - 1;
    }
    function step(d) { var n = zi + d; if (n >= 0 && n < ZOOM.length) { zi = n; applyZoom(); } }
    zOut.addEventListener('click', function () { step(-1); });
    zIn.addEventListener('click', function () { step(1); });
    document.addEventListener('keydown', function (e) {
      if (e.key === '+' || e.key === '=') step(1);
      if (e.key === '-' || e.key === '_') step(-1);
    });
    applyZoom();

    // Click a shot to view it fullscreen; click anywhere or Esc to close.
    var lb = document.getElementById('lightbox');
    var lbImg = lb.querySelector('img');
    function closeLb() { lb.hidden = true; lbImg.removeAttribute('src'); document.body.style.overflow = ''; }
    document.addEventListener('click', function (e) {
      var t = e.target;
      if (t.tagName === 'IMG' && t.closest('.shot')) {
        lbImg.src = t.currentSrc || t.src;
        lb.hidden = false;
        document.body.style.overflow = 'hidden';
      }
    });
    lb.addEventListener('click', closeLb);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeLb(); });
  })();
</script>
</body>
</html>
`;

writeFileSync(OUT, html);
console.log(`Wrote ${OUT}`);
console.log(`${pages.size} pages, ${[...pages.values()].reduce((n, w) => n + w.size, 0)} widths.`);
console.log(`Open it:  open "${OUT}"`);
