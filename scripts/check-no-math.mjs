// Guard: this site has no math rendering (KaTeX was removed 2026-06-14, and Zola
// has no native math). Without a renderer, math delimiters in content would just
// show as literal `$x$` text — so fail loudly instead. To enable math, wire
// MathML into the build (see CLAUDE.md), then delete this guard.
//
// Run by `npm run check:math` and in CI (.github/workflows/main.yml). Exits 1 if
// any KaTeX-style math delimiter survives in prose.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const contentDir = fileURLToPath(new URL('../content', import.meta.url));

function mdFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? mdFiles(p) : p.endsWith('.md') ? [p] : [];
  });
}

// Strip what KaTeX's auto-render ignored too — fenced + inline code — so a shell
// `$`, `echo $$`, or a `\(` in a regex inside a code block isn't a false alarm.
// Keep line count stable (blank the content, not the lines) so reports stay accurate.
function stripCode(src) {
  return src
    .replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/`[^`\n]*`/g, (m) => ' '.repeat(m.length));
}

// The delimiters KaTeX was configured to render (templates/index.html, removed).
const PATTERNS = [
  { re: /\$\$[\s\S]*?\$\$/, label: '$$…$$' },
  { re: /\\\[[\s\S]*?\\\]/, label: '\\[…\\]' },
  { re: /\\\([\s\S]*?\\\)/, label: '\\(…\\)' },
  { re: /\$[^$\n]+\$/, label: '$…$' },
];

const hits = [];
for (const file of mdFiles(contentDir)) {
  const lines = stripCode(readFileSync(file, 'utf8')).split('\n');
  lines.forEach((line, i) => {
    for (const { re, label } of PATTERNS) {
      if (re.test(line)) hits.push(`${file}:${i + 1}  (${label})`);
    }
  });
}

if (hits.length) {
  console.error('✗ Math delimiters found, but this site has no math renderer:\n');
  for (const h of hits) console.error('  ' + h);
  console.error(
    '\nKaTeX was removed and Zola has no built-in math. Either remove the math, ' +
      'escape a literal `$` as `\\$`, or add MathML support (see CLAUDE.md).'
  );
  process.exit(1);
}

console.log('✓ no math delimiters in content/ (none expected — site has no math renderer)');
