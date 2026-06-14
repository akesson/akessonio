// The dynamic page list: parsed from the built `public/sitemap.xml`, so adding
// an article, project, or tag is captured with zero edits here. Build first
// (`zola build`, or just use `npm run screenshots`) or this throws.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const sitemapPath = fileURLToPath(new URL('../public/sitemap.xml', import.meta.url));

// Viewport widths — one inside each real layout regime, bracketing the
// structural breakpoints in sass/ (520 / 760 / 1180 / 1300px).
export const WIDTHS = [375, 600, 900, 1200, 1440, 1920];

// Both colour themes (forced via Playwright's colorScheme; site default is
// "system", which resolves from prefers-color-scheme before first paint).
export const THEMES = ['light', 'dark'];

// Paths to skip. Empty = capture every sitemap URL. To drop the taxonomy pages
// later, add e.g. '/tags/', '/tags/rust/', … here.
export const EXCLUDE = new Set([]);

const slug = (path) => {
  const trimmed = path.replace(/^\/+|\/+$/g, '');
  return trimmed === '' ? 'home' : trimmed.replace(/\//g, '-');
};

let xml;
try {
  xml = readFileSync(sitemapPath, 'utf8');
} catch {
  throw new Error('public/sitemap.xml not found — run "zola build" first (or use "npm run screenshots").');
}

export const PAGES = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)]
  .map((m) => new URL(m[1]).pathname) // strip scheme + host → path
  .filter((path) => !EXCLUDE.has(path))
  .sort()
  .map((path) => ({ path, slug: slug(path) }));
