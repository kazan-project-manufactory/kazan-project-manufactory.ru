/* exp view-transitions: the names `case` (colour panel) and `case-img` (mockup) live on one pair only —
   the card that was clicked and the cover it opens into. Loaded in <head> without defer: pagereveal
   has to be listened for before the first frame. No support / reduced motion -> plain navigation. */
(() => {
  const HOME = '/exp/view-transitions/';
  const slugOf = (u) => {
    try {
      const p = new URL(u, location.href).pathname;
      return p.startsWith(HOME) ? p.slice(HOME.length).replace(/\/$/, '') : null;
    } catch (_) { return null; }
  };
  // [panel, image] for the case shared by this page and the other one, or null
  const pairWith = (other) => {
    const here = slugOf(location.href), there = slugOf(other);
    if (here === '' && there) {
      const card = [...document.querySelectorAll('a.card')].find((a) => slugOf(a.href) === there);
      // the card's title and chips get names too: they fade out over the panel instead of vanishing under it
      return card && [card.querySelector('.card__media'), card.querySelector('.card__img'),
        card.querySelector('.card__title'), card.querySelector('.chips')];
    }
    if (there === '' && here) {
      const bg = document.querySelector('.cover__card');
      return bg && [bg, bg.querySelector('.cover__img')];
    }
    return null;
  };
  const onScreen = (el) => {
    const r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < innerHeight;
  };
  const NAMES = ['case', 'case-img', 'case-title', 'case-chips'];
  const name = (pair) => {
    // a pair that is off screen would fly in from outside the viewport: leave it to the page crossfade
    if (!pair || !pair[0] || !pair[1] || !onScreen(pair[0])) return false;
    pair.forEach((el, i) => { if (el) el.style.viewTransitionName = NAMES[i]; });
    return true;
  };
  const clear = () => document.querySelectorAll('.card__media, .card__img, .card__title, .card .chips, .cover__card, .cover__img')
    .forEach((el) => { el.style.viewTransitionName = ''; });

  addEventListener('pageswap', (e) => {
    clear();
    if (e.viewTransition && e.activation && e.activation.entry) name(pairWith(e.activation.entry.url));
  });
  addEventListener('pagereveal', (e) => {
    clear(); // restored from bfcache with the names of the last departure
    if (!e.viewTransition || !window.navigation || !navigation.activation) return;
    const from = navigation.activation.from;
    if (from && name(pairWith(from.url))) e.viewTransition.finished.finally(clear);
  });
})();
