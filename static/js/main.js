/**
 * main.js
 *
 * Three small concerns:
 *   1. the manual dark / light theme toggle,
 *   2. the drifting accent hue, and
 *   3. the level-2 "back" link upgrade.
 *
 * The old Hermit bottom-bar auto-hide and the mobile-menu toggle were removed
 * with the move to a persistent top tab strip (three tabs need no hamburger).
 */

// Theme — three modes: light / dark / system (the default)
//
// The inline <head> script resolves and applies the theme before first paint (no
// flash); this adds the interactive parts: cycling the mode on click, persisting
// it, keeping the OS preference live while in "system" mode, and labelling the
// button. light/dark are manual overrides; "system" follows the OS, including
// live changes. data-theme holds the resolved light|dark that drives colours;
// data-theme-mode holds the chosen mode that drives which toggle icon shows.
const MODES = ['light', 'dark', 'system'];
const prefersDark = matchMedia('(prefers-color-scheme: dark)');

// Resolve a mode to the concrete light|dark used for colours + syntax sheet.
const resolveTheme = (mode) =>
  mode === 'system' ? (prefersDark.matches ? 'dark' : 'light') : mode;

// Activate the syntax-highlight sheet (giallo-dark / giallo-light) that matches
// the theme; the other is disabled but stays loaded, so switching is instant.
const applySyntaxTheme = (theme) => {
  const dark = document.getElementById('giallo-dark');
  const light = document.getElementById('giallo-light');
  if (dark && light) {
    dark.media = theme === 'light' ? 'not all' : 'all';
    light.media = theme === 'light' ? 'all' : 'not all';
  }
};

const storedMode = () => {
  try {
    return localStorage.getItem('theme') || 'system';
  } catch (e) {
    return 'system';
  }
};

const themeToggle = document.getElementById('theme-toggle');

// Apply a mode everywhere: resolved colour theme, syntax sheet, the mode marker
// (drives the toggle icon via CSS), and the button's accessible label.
const applyMode = (mode) => {
  const root = document.documentElement;
  const theme = resolveTheme(mode);
  root.setAttribute('data-theme', theme);
  root.setAttribute('data-theme-mode', mode);
  applySyntaxTheme(theme);
  if (themeToggle) {
    const next = MODES[(MODES.indexOf(mode) + 1) % MODES.length];
    const label = mode === 'system' ? 'System (follows your OS)'
      : mode[0].toUpperCase() + mode.slice(1);
    themeToggle.setAttribute('title', `Theme: ${label}`);
    themeToggle.setAttribute('aria-label', `Theme: ${label}. Click to switch to ${next}.`);
  }
};

if (themeToggle) {
  // Label to match the mode the inline script already applied before paint.
  applyMode(storedMode());

  themeToggle.addEventListener('click', () => {
    const next = MODES[(MODES.indexOf(storedMode()) + 1) % MODES.length];
    applyMode(next);
    try {
      localStorage.setItem('theme', next);
    } catch (e) {}
  });
}

// Keep "system" mode live: when the OS flips light/dark, re-resolve — but only
// while the user hasn't set a manual override.
prefersDark.addEventListener('change', () => {
  if (storedMode() === 'system') applyMode('system');
});

// Drifting hue
//
// Every colour is oklch(L C var(--hue)); this rotates --hue through a full 360°
// once every 30 minutes. It is wall-clock based (Date.now), so the hue is the
// same on every page and for every visitor at a given moment, and never resets
// on navigation. The drift is sub-perceptual (0.2°/s); we step it ~1×/second —
// invisible, but one repaint a second instead of 60. Paused while the tab is
// hidden; frozen entirely under prefers-reduced-motion (the CSS --hue default,
// 250, then stands — the same blue as the old fixed theme).
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const HUE_PERIOD_MS = 30 * 60 * 1000;
  const setHue = () => {
    if (document.hidden) return;
    const hue = (Date.now() / HUE_PERIOD_MS) * 360 % 360;
    document.documentElement.style.setProperty('--hue', hue.toFixed(1));
  };
  setHue();
  setInterval(setHue, 1000);
  document.addEventListener('visibilitychange', setHue); // catch up on return
}

// Back link — history-aware "up"
//
// A level-2 page (article, project) renders a deterministic back link to its
// section index. This upgrades the label + target to wherever you *actually*
// came from, when that was another section on this site — so an article reached
// from Projects offers "← Projects", not "← Articles". Defensive by design: the
// server default already works with JS off, and we only trust a same-origin
// origin (the Navigation API on Chromium, else document.referrer).
const backLink = document.querySelector('.back-link');
if (backLink) {
  // Known strip sections, most specific first so "/" is the catch-all.
  const sections = [
    { path: '/projects/', label: 'Projects' },
    { path: '/', label: 'Articles' },
  ];

  let fromPath = null;
  try {
    const nav = window.navigation;
    const fromUrl =
      (nav && nav.activation && nav.activation.from && nav.activation.from.url) ||
      document.referrer ||
      '';
    if (fromUrl) {
      const u = new URL(fromUrl, location.href);
      if (u.origin === location.origin) fromPath = u.pathname;
    }
  } catch (e) {}

  if (fromPath && fromPath !== location.pathname) {
    const match = sections.find(
      (s) => fromPath === s.path || fromPath.startsWith(s.path)
    );
    if (match) {
      backLink.setAttribute('href', match.path);
      const label = backLink.querySelector('.back-label');
      if (label) label.textContent = match.label;
    }
  }
}
