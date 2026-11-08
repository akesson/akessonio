// Step engine for the async-machine page (async-machine.html).
//
// The page declares steps on one stage (the .am-frame):
//   data-s="4"     visible from step 4 onward
//   data-s="4-7"   visible for steps 4..7 only
//   data-on="2,7"  carries .on (current-step emphasis) at those steps
//   data-focus="term poll"  (on a note) the block(s) the phone layout shows
//                           for that step; blocks/panels carry data-f="…"
//
// At load the stage is cloned once per step, each clone gets its step
// applied, and the clones sit side by side in a horizontal scroll-snap
// track (.am-track): stepping is scrolling. A swipe on a phone, a two-
// finger swipe on a trackpad, the ←/→ keys, the side chevrons and the
// phone bar all move the same track, so every input gets the native
// scroll physics and the snap. The current step is read back from the
// scroll position.
(function () {
  "use strict";

  var root = document.getElementById("am");
  if (!root) return;

  var STEPS = parseInt(root.dataset.steps, 10) || 16;
  var proto = root.querySelector(".am-frame");
  var posN = root.querySelector(".am-pos-n");
  var reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

  // ── apply a step to one stage ─────────────────────────────────────────
  function applyStep(stage, s) {
    var all = [].slice.call(stage.querySelectorAll("[data-s]"));
    all.forEach(function (el) {
      var m = el.dataset.s.split("-");
      el.classList.toggle("vis", s >= +m[0] && s <= (m.length > 1 ? +m[1] : Infinity));
    });
    [].slice.call(stage.querySelectorAll("[data-on]")).forEach(function (el) {
      el.classList.toggle("on", el.dataset.on.split(",").map(Number).indexOf(s) !== -1);
    });
    // arrowheads: a marker paints in its own colour, not the arrow's, so an
    // .on arrow points at its SVG's accent marker (id "…-on"), the rest at
    // the muted one; the ids carry the clone's step suffix (see below)
    [].slice.call(stage.querySelectorAll(".am-a [marker-end]")).forEach(function (el) {
      var on = el.parentNode.classList.contains("on");
      var m = el.closest("svg").querySelector(on ? "marker.on" : "marker:not(.on)");
      if (m) el.setAttribute("marker-end", "url(#" + m.id + ")");
    });
    // focus (phone layout): the step's note names the block(s) to show; a
    // panel is .foc if it is one or holds one
    var note = stage.querySelector('.am-note[data-on="' + s + '"]');
    var want = note && note.dataset.focus ? note.dataset.focus.split(" ") : [];
    [].slice.call(stage.querySelectorAll("[data-f]")).forEach(function (el) {
      el.classList.toggle("foc", want.indexOf(el.dataset.f) !== -1);
    });
    [].slice.call(stage.querySelectorAll(".am-panel")).forEach(function (p) {
      p.classList.toggle("foc", want.indexOf(p.dataset.f) !== -1 || !!p.querySelector(".foc"));
    });
    // waker token: appears with the timer at step 10, travels to the
    // executor on the wake at step 13
    [].slice.call(stage.querySelectorAll(".am-wk")).forEach(function (w) {
      w.classList.toggle("wk-timer", s >= 10 && s < 13);
      w.classList.toggle("wk-exec", s >= 13);
    });
    // thread strip: parked only during the one-second gap
    var thread = stage.querySelector(".am-thread");
    if (thread) thread.classList.toggle("parked", s === 12);
    stage.dataset.step = s;
  }

  // ── build the track: one stage per step ───────────────────────────────
  // The clones' ids (SVG arrowhead markers, the thread strip) get a step
  // suffix so url(#…) references stay unique per stage.
  var html = proto.outerHTML;
  var track = document.createElement("div");
  track.className = "am-track";
  var slides = [];
  for (var i = 0; i < STEPS; i++) {
    var slide = document.createElement("div");
    slide.className = "am-slide";
    slide.innerHTML = html.replace(/(#|id=")(am-[a-z-]+?)(?=["')])/g, "$1$2-s" + i);
    slide.querySelector(".am-notes").removeAttribute("aria-live");
    applyStep(slide.firstElementChild, i);
    track.appendChild(slide);
    slides.push(slide);
  }
  proto.parentNode.replaceChild(track, proto);

  // ── step ↔ scroll position ────────────────────────────────────────────
  var step = -1;
  var prevBtns = [].slice.call(root.querySelectorAll(".am-prev"));
  var nextBtns = [].slice.call(root.querySelectorAll(".am-next"));

  function width() { return track.clientWidth || 1; }

  function setStep(s) {
    if (s === step) return;
    step = s;
    prevBtns.forEach(function (b) { b.disabled = s === 0; });
    nextBtns.forEach(function (b) { b.disabled = s === STEPS - 1; });
    if (posN) posN.textContent = s + 1;
  }

  // The track clips vertically to the current stage (phone stages differ in
  // height); while a neighbour is in view it clips to the taller of the two,
  // so nothing is cut off mid-swipe.
  function fitHeight(a, b) {
    var h = Math.max(slides[a].offsetHeight, b === undefined ? 0 : slides[b].offsetHeight);
    track.style.height = h + "px";
  }

  // scrollend is gesture-aware: it waits until the fingers have left the
  // trackpad and any snap animation has finished. Where it is missing the
  // quiet-timer stands in, and then a finger resting mid-swipe looks like a
  // finished scroll, so nothing that moves the track may run from settle().
  var hasScrollEnd = "onscrollend" in window;
  var raf = 0, settleTimer = 0, scrolling = false, realignPending = false;
  function onScroll() {
    scrolling = true;
    if (raf) return;
    raf = requestAnimationFrame(function () {
      raf = 0;
      var x = track.scrollLeft / width();
      var lo = Math.max(0, Math.min(STEPS - 1, Math.floor(x)));
      var hi = Math.max(0, Math.min(STEPS - 1, Math.ceil(x)));
      setStep(Math.round(x));
      fitHeight(lo, hi);
    });
    if (!hasScrollEnd) {
      clearTimeout(settleTimer);
      settleTimer = setTimeout(settle, 150);
    }
  }
  function settle() {
    scrolling = false;
    setStep(Math.round(track.scrollLeft / width()));
    // a width change during the scroll (see realign) left the stage off its
    // snap point; the gesture is over now, so put it back
    if (realignPending && hasScrollEnd) {
      realignPending = false;
      track.scrollTo({ left: step * width(), behavior: "auto" });
    }
    fitHeight(step);
    // a new step is a new card: if the reader had scrolled down into the
    // previous one, start this one from the top (instant, not smooth)
    var top = track.getBoundingClientRect().top + scrollY;
    if (scrollY > top) scrollTo(0, top);
  }
  track.addEventListener("scroll", onScroll, { passive: true });
  if (hasScrollEnd) track.addEventListener("scrollend", settle);

  function goTo(s) {
    s = Math.max(0, Math.min(STEPS - 1, s));
    track.scrollTo({ left: s * width(), behavior: reduceMotion.matches ? "auto" : "smooth" });
  }

  root.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest(".am-prev, .am-next");
    if (!b || b.disabled) return;
    goTo(step + (b.classList.contains("am-next") ? 1 : -1));
  });

  addEventListener("keydown", function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (e.key === "ArrowRight") { e.preventDefault(); goTo(step + 1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); goTo(step - 1); }
  });

  // keep the current stage in place when the track's width changes: a
  // window resize, or a classic (non-overlay) page scrollbar appearing as
  // the track grows — scrollbar-gutter: stable in the CSS prevents most of
  // that. Only the width matters: the height changes on every swipe
  // (fitHeight). Never realign while a scroll is in flight — that cancels
  // the scroll and, with the scrollbar case, loops; settle() re-aligns at
  // the end instead.
  var lastW = width();
  function realign() {
    if (width() === lastW) return;
    lastW = width();
    if (scrolling) { realignPending = true; return; }
    track.scrollTo({ left: step * lastW, behavior: "auto" });
    fitHeight(step);
  }
  if (window.ResizeObserver) {
    new ResizeObserver(function () { requestAnimationFrame(realign); }).observe(track);
  } else addEventListener("resize", realign);
  addEventListener("load", function () { fitHeight(step); });

  setStep(0);
  fitHeight(0);
})();
