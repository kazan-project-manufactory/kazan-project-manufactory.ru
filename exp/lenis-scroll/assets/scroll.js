// exp/lenis-scroll: one smooth scroll drives everything — pinned giant titles (--p),
// velocity skew (--v), hero parallax (--scroll), progress thread (--progress).
(function () {
  var root = document.documentElement;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var heads = [].slice.call(document.querySelectorAll('.sec-head'));
  var marks = [].slice.call(document.querySelectorAll('.thread__mark'));
  var targets = marks.map(function (m) { return document.querySelector(m.getAttribute('href')); });
  var ease = function (t) { return 1 - Math.pow(1 - t, 4); };

  function markPositions() {
    var max = root.scrollHeight - innerHeight;
    targets.forEach(function (el, i) {
      var at = (el.getBoundingClientRect().top + scrollY) / max;
      marks[i].style.setProperty('--at', Math.min(at, .97).toFixed(3));
    });
  }

  var settle;
  function update(y, velocity, progress) {
    root.style.setProperty('--scroll', y);
    root.style.setProperty('--v', Math.max(-1, Math.min(1, velocity / 50)).toFixed(3));
    clearTimeout(settle);                       // native/touch scroll stops emitting: let --v fall back to 0
    settle = setTimeout(function () { root.style.setProperty('--v', 0); }, 120);
    root.style.setProperty('--progress', progress.toFixed(4));
    heads.forEach(function (h) {
      var r = h.getBoundingClientRect(), span = r.height - innerHeight;
      h.style.setProperty('--p', span > 0 ? Math.max(0, Math.min(1, -r.top / span)).toFixed(3) : 1);
    });
    var active = -1, line = innerHeight * .45;
    targets.forEach(function (el, i) { if (el.getBoundingClientRect().top <= line) active = i; });
    marks.forEach(function (m, i) { m.classList.toggle('is-active', i === active); });
  }

  if (reduce) {
    // reduced motion: no lenis, no pins, no skew; the thread only highlights the section
    root.classList.remove('js');
    addEventListener('scroll', function () { update(scrollY, 0, 0); }, { passive: true });
    update(scrollY, 0, 0);
    return;
  }

  var lenis = new Lenis({ autoRaf: true, lerp: .09, wheelMultiplier: 1 });
  lenis.on('scroll', function (e) { update(e.animatedScroll, e.velocity, e.progress); });
  [].slice.call(document.querySelectorAll('a[href^="#"]')).forEach(function (a) {
    a.addEventListener('click', function (ev) {
      var el = document.querySelector(a.getAttribute('href'));
      if (!el) return;
      ev.preventDefault();
      lenis.scrollTo(el, { duration: 1.6, easing: ease });
    });
  });
  markPositions();
  addEventListener('resize', markPositions);
  addEventListener('load', function () { markPositions(); lenis.resize(); });
  update(scrollY, 0, lenis.progress || 0);
})();
