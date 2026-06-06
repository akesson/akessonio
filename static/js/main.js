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

// ToC scroll-spy
//
// Highlight the TOC entry for the section currently in view. This is
// progressive enhancement: the TOC works as plain anchor links without it.
// The active cue is an instant, low-emphasis accent — no animation (DESIGN §5).
const tocLinks = Array.from(document.querySelectorAll('#TableOfContents a'));

if (tocLinks.length) {
  const toc = document.getElementById('toc');

  const targets = tocLinks
    .map((link) => {
      const id = decodeURIComponent((link.hash || '').slice(1));
      const heading = id && document.getElementById(id);
      return heading ? { link, heading } : null;
    })
    .filter(Boolean);

  let active = null;
  const setActive = (link) => {
    if (active === link) return;
    if (active) active.classList.remove('active');
    if (link) link.classList.add('active');
    active = link;
  };

  const syncActive = () => {
    // Skip the work entirely when the TOC isn't shown (narrow viewports).
    if (!toc || getComputedStyle(toc).display === 'none') return;
    const line = 120; // a heading becomes "current" once its top passes this
    let current = targets[0];
    for (const t of targets) {
      if (t.heading.getBoundingClientRect().top <= line) current = t;
      else break;
    }
    setActive(current ? current.link : null);
  };

  syncActive();
  window.addEventListener('scroll', throttle(syncActive, 100));
}
