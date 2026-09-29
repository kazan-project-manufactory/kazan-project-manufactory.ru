// exp/lenis-scroll (29.09): smooth scroll (lenis) + restrained velocity skew of card/tile/panel columns.
// One rAF per frame: lenis.raf → velocity from the scroll position (no DOM reads) → lerp → write transforms.
// Section titles are pure CSS (animation-timeline: view()) — no JS per frame for them.
(function () {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || typeof Lenis !== 'function') return;

  var MAX = 2.4;              // deg, at full speed
  var SPEED = 2.8;            // px/ms that gives ~76% of MAX (tanh soft clip)
  var FOLLOW = .14;           // lerp toward the target skew per 60 Hz frame; return to 0 is the same tween
  var REST = 900;             // ms at rest before layers are released (will-change off)

  var narrow = matchMedia('(max-width: 959px)');
  var items = [].slice.call(document.querySelectorAll('[data-skew]')).map(function (el) {
    return { el: el, k: parseFloat(el.getAttribute('data-skew')) || 1, on: false, shown: '' };
  });

  // which columns are near the viewport — async, no layout reads in the frame
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      var it = items.find(function (x) { return x.el === e.target; });
      it.on = e.isIntersecting;
      if (!it.on && it.shown) { it.el.style.transform = it.el.style.willChange = ''; it.shown = ''; }
    });
  }, { rootMargin: '25% 0px' });
  items.forEach(function (it) { io.observe(it.el); });

  var lenis = new Lenis({ lerp: .1, wheelMultiplier: .9, autoRaf: false });

  // touch: lenis leaves native scroll alone, so measure it ourselves from native scroll events
  var nativeY = scrollY;
  addEventListener('scroll', function () { nativeY = scrollY; }, { passive: true });

  var lastY = nativeY, lastT = 0, skew = 0, layered = false, restAt = 0;

  function frame(t) {
    lenis.raf(t);
    var dt = lastT ? Math.min(64, t - lastT) : 16.7;
    lastT = t;
    var y = lenis.isScrolling === 'smooth' ? lenis.animatedScroll : nativeY;
    var v = (y - lastY) / dt; // px/ms
    lastY = y;

    var target = MAX * Math.tanh(v / SPEED);
    skew += (target - skew) * (1 - Math.pow(1 - FOLLOW, dt / 16.7));
    if (Math.abs(skew) < .004 && target === 0) skew = 0;

    if (skew !== 0) {
      restAt = 0;
      var flip = narrow.matches; // one column on phones: no counter-phase
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        if (!it.on) continue;
        var k = flip ? Math.abs(it.k) : it.k;
        var val = 'skewY(' + (skew * k).toFixed(3) + 'deg)';
        if (val !== it.shown) {
          if (!it.shown) it.el.style.willChange = 'transform';
          it.el.style.transform = it.shown = val;
        }
      }
      layered = true;
    } else if (layered) {
      // back at rest: flatten (crisp text) right away, release layers a bit later
      if (!restAt) {
        restAt = t;
        items.forEach(function (it) { if (it.shown) { it.el.style.transform = ''; it.shown = ''; } });
      } else if (t - restAt > REST) {
        items.forEach(function (it) { it.el.style.willChange = ''; });
        layered = false; restAt = 0;
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // header anchors and in-page CTAs: smooth, calm easing
  var ease = function (x) { return 1 - Math.pow(1 - x, 4); };
  [].slice.call(document.querySelectorAll('a[href^="#"]')).forEach(function (a) {
    a.addEventListener('click', function (ev) {
      var el = document.querySelector(a.getAttribute('href'));
      if (!el) return;
      ev.preventDefault();
      lenis.scrollTo(el, { duration: 1.2, easing: ease });
    });
  });

  // warm up the decode of card backgrounds while idle, so the first pass does not decode 1504px webp on the fly
  var idle = window.requestIdleCallback || function (fn) { return setTimeout(fn, 200); };
  addEventListener('load', function () {
    idle(function () {
      [].slice.call(document.querySelectorAll('.card[style*="--card-img"]')).forEach(function (c) {
        var m = /url\(['"]?([^'")]+)/.exec(c.getAttribute('style'));
        if (!m) return;
        var img = new Image();
        img.decoding = 'async';
        img.src = m[1];
        if (img.decode) img.decode().catch(function () {});
      });
    });
  });
})();
