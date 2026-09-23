// Subtle one-time scroll reveal. Content is visible by default: only blocks below the fold
// get the hidden state, and only when JS runs and the visitor has not asked for reduced motion.
(function () {
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('rv--in');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.section .h1, .rec .h1, .rec .h2, .card, .tile, .ai__cta, .contact__grid, .pic').forEach(function (el) {
    if (el.getBoundingClientRect().top < innerHeight) return; // already on screen: never hide it
    el.classList.add('rv');
    io.observe(el);
  });
})();
