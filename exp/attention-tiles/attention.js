/* Attention graph for the AI section.
   Nodes are ordinary DOM elements laid out by CSS grid; this only measures them
   and draws weighted wires in the SVG underneath. Edges live in the markup as
   data-in / data-out ("node-id:weight"), so the section stays readable без JS. */
(function () {
  var root = document.getElementById('agraph');
  if (!root || !window.IntersectionObserver || !window.ResizeObserver) return;

  var NS = 'http://www.w3.org/2000/svg';
  var svg = root.querySelector('.agraph__wires');
  var tiles = Array.prototype.slice.call(root.querySelectorAll('.tile'));
  var wide = window.matchMedia('(min-width: 960px)');
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---- edges from markup ---- */
  var edges = [];
  var leaves = [];                       // { el, byTile: Map(tile -> weight) }
  var leafOf = new Map();

  tiles.forEach(function (tile, ti) {
    ['in', 'out'].forEach(function (key) {
      var list = (tile.dataset[key] || '').split(',').filter(Boolean);
      list.forEach(function (part, k) {
        var bits = part.split(':');
        var el = document.getElementById(bits[0].trim());
        var w = parseFloat(bits[1]);
        if (!el || !(w > 0)) return;

        var leaf = leafOf.get(el);
        if (!leaf) { leaf = { el: el, byTile: new Map() }; leafOf.set(el, leaf); leaves.push(leaf); }
        leaf.byTile.set(tile, w);

        var path = document.createElementNS(NS, 'path');
        svg.appendChild(path);
        edges.push({ tile: tile, ti: ti, el: el, path: path, w: w, k: k, into: key === 'in', last: {} });
      });
    });
  });
  if (!edges.length) return;

  /* ---- geometry: wires follow whatever the grid did ---- */
  function r(n) { return Math.round(n * 10) / 10; }

  function measure() {
    if (!wide.matches) return;
    var box = root.getBoundingClientRect();
    if (!box.width) return;
    edges.forEach(function (e) {
      var t = e.tile.getBoundingClientRect();
      var d = e.el.querySelector('.dot').getBoundingClientRect();
      var lx = d.left + d.width / 2 - box.left, ly = d.top + d.height / 2 - box.top;
      var tx = (e.into ? t.left : t.right) - box.left, ty = t.top + t.height / 2 - box.top;
      var x1 = e.into ? lx : tx, y1 = e.into ? ly : ty;
      var x2 = e.into ? tx : lx, y2 = e.into ? ty : ly;
      var dx = Math.max(28, (x2 - x1) * 0.5);
      e.path.setAttribute('d', 'M' + r(x1) + ' ' + r(y1) + 'C' + r(x1 + dx) + ' ' + r(y1) +
        ',' + r(x2 - dx) + ' ' + r(y2) + ',' + r(x2) + ' ' + r(y2));
    });
  }

  /* ---- paint: weight drives opacity and width, that is the whole metaphor ---- */
  var hover = null, focused = null, pinned = null, live = false, raf = 0;
  var SPAN = 4800;                        // ms one task holds the idle wave

  function active() { return hover || focused || pinned; }

  function put(e, prop, v) { if (e.last[prop] !== v) { e.last[prop] = v; e.path.style[prop] = v; } }

  function paint(now) {
    var act = active();
    var amb = -1, t = 0;
    if (!act && !calm.matches) {
      var cycle = (now % (SPAN * tiles.length)) / SPAN;
      amb = Math.floor(cycle);
      t = cycle - amb;
    }
    edges.forEach(function (e) {
      var op, w;
      if (act) {
        if (e.tile === act) { op = 0.18 + 0.5 * e.w; w = 0.8 + 2.8 * e.w; }
        else { op = 0.04; w = 0.6; }
      } else {
        /* wave rolls data → task → case, each edge a touch behind the last */
        var ph = e.ti === amb ? t * 1.55 - (e.into ? 0 : 0.2) - e.k * 0.05 : -1;
        var a = ph > 0 && ph < 1 ? Math.sin(Math.PI * ph) : 0;
        op = 0.05 + 0.14 * e.w + 0.22 * e.w * a;
        w = 0.6 + 1.0 * e.w + 1.0 * e.w * a;
      }
      put(e, 'opacity', op.toFixed(3));
      put(e, 'strokeWidth', w.toFixed(2));
    });
  }

  function highlight() {
    var act = active();
    root.classList.toggle('is-picked', !!act);
    tiles.forEach(function (x) {
      x.classList.toggle('is-on', x === act);
      x.classList.toggle('is-off', !!act && x !== act);
    });
    leaves.forEach(function (l) {
      var w = act ? l.byTile.get(act) : undefined;
      l.el.classList.toggle('is-on', w !== undefined);
      l.el.classList.toggle('is-off', !!act && w === undefined);
      if (w !== undefined) l.el.style.setProperty('--w', w);
    });
    if (!raf) paint(performance.now());   // static mode: repaint on demand
  }

  tiles.forEach(function (tile) {
    tile.addEventListener('pointerenter', function () { hover = tile; highlight(); });
    tile.addEventListener('pointerleave', function () { if (hover === tile) { hover = null; highlight(); } });
    tile.addEventListener('focus', function () { focused = tile; highlight(); });
    tile.addEventListener('blur', function () { if (focused === tile) { focused = null; highlight(); } });
    tile.addEventListener('click', function () {
      pinned = pinned === tile ? null : tile;
      tiles.forEach(function (x) { x.setAttribute('aria-pressed', String(x === pinned)); });
      highlight();
    });
  });
  root.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && pinned) {
      pinned = null;
      tiles.forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
      highlight();
    }
  });

  /* ---- run only while on screen, never with reduced motion ---- */
  function frame(now) { paint(now); raf = requestAnimationFrame(frame); }

  new IntersectionObserver(function (entries) {
    live = entries[0].isIntersecting;
    root.classList.toggle('is-live', live && !calm.matches);
    if (live && !calm.matches) { if (!raf) raf = requestAnimationFrame(frame); }
    else if (raf) { cancelAnimationFrame(raf); raf = 0; paint(performance.now()); }
  }, { rootMargin: '160px' }).observe(root);

  new ResizeObserver(function () { measure(); if (!raf) paint(performance.now()); }).observe(root);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
})();
