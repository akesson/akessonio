/**
 * Utils
 */

// Throttle
//
const throttle = (callback, limit) => {
  let timeoutHandler = null;
  return () => {
    if (timeoutHandler == null) {
      timeoutHandler = setTimeout(() => {
        callback();
        timeoutHandler = null;
      }, limit);
    }
  };
};

// addEventListener Helper
//
const listen = (ele, e, callback) => {
  if (document.querySelector(ele) !== null) {
    document.querySelector(ele).addEventListener(e, callback);
  }
};

/**
 * Functions
 */

// Auto Hide Header
//
let header = document.getElementById('site-header');
let lastScrollPosition = window.pageYOffset;

const autoHideHeader = () => {
  let currentScrollPosition = window.pageYOffset;
  if (currentScrollPosition > lastScrollPosition) {
    header.classList.remove('slideInUp');
    header.classList.add('slideOutDown');
  } else {
    header.classList.remove('slideOutDown');
    header.classList.add('slideInUp');
  }
  lastScrollPosition = currentScrollPosition;
};

// Mobile Menu Toggle
//
let mobileMenuVisible = false;

const toggleMobileMenu = () => {
  let mobileMenu = document.getElementById('mobile-menu');
  if (mobileMenuVisible == false) {
    mobileMenu.style.animationName = 'bounceInRight';
    mobileMenu.style.webkitAnimationName = 'bounceInRight';
    mobileMenu.style.display = 'block';
    mobileMenuVisible = true;
  } else {
    mobileMenu.style.animationName = 'bounceOutRight';
    mobileMenu.style.webkitAnimationName = 'bounceOutRight';
    mobileMenuVisible = false;
  }
};

if (header !== null) {
  listen('#menu-btn', 'click', toggleMobileMenu);

  window.addEventListener(
    'scroll',
    throttle(() => {
      autoHideHeader();

      if (mobileMenuVisible == true) {
        toggleMobileMenu();
      }
    }, 250)
  );
}

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
