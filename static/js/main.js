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

// Dark / light theme toggle
//
// The initial theme is set by an inline <head> script (before first paint, so
// there is no flash); this only handles clicks and persists the choice. With no
// stored choice the inline script falls back to the OS preference.
// Activate the syntax-highlight sheet (giallo-dark / giallo-light) that matches
// the theme; the other is disabled but stays loaded, so toggling is instant.
const applySyntaxTheme = (theme) => {
  const dark = document.getElementById('giallo-dark');
  const light = document.getElementById('giallo-light');
  if (dark && light) {
    dark.media = theme === 'light' ? 'not all' : 'all';
    light.media = theme === 'light' ? 'all' : 'not all';
  }
};

const themeToggle = document.getElementById('theme-toggle');
if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const root = document.documentElement;
    const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    root.setAttribute('data-theme', next);
    applySyntaxTheme(next);
    try {
      localStorage.setItem('theme', next);
    } catch (e) {}
  });
}

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
