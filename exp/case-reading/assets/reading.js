/* case-reading: click a plate to see it larger (medium-zoom 1.1.0, vendored next to this file).
   Only plates that actually grow by 20%+ get the zoom: a full-width shot on a laptop or any shot on a phone
   would open at the same size, so there it stays a plain picture. Without JS — plain pictures everywhere. */
(function () {
  if (!window.mediumZoom) return;
  var MARGIN = 24;
  var bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#f6f6f6';
  var zoom = mediumZoom({ margin: MARGIN, background: bg, scrollOffset: 40 });
  var pics = Array.prototype.slice.call(document.querySelectorAll('.rec .pic'));
  var open = false;
  zoom.on('open', function () { open = true; });
  zoom.on('closed', function () { open = false; });

  // the same fit medium-zoom computes: no upscaling past the file, no overflow past the viewport
  function gain(img) {
    var r = img.getBoundingClientRect();
    if (!r.width || !img.naturalWidth) return 0;
    var vw = document.documentElement.clientWidth - MARGIN * 2, vh = window.innerHeight - MARGIN * 2;
    var sx = Math.min(Math.max(r.width, img.naturalWidth), vw) / r.width;
    var sy = Math.min(Math.max(r.height, img.naturalHeight), vh) / r.height;
    return Math.min(sx, sy);
  }
  function sync(img) {
    if (open) return;
    if (gain(img) >= 1.2) zoom.attach(img); else zoom.detach(img);
  }
  function syncAll() { pics.forEach(sync); }

  pics.forEach(function (img) {
    if (img.complete) sync(img); else img.addEventListener('load', function () { sync(img); }, { once: true });
  });
  var t;
  window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(syncAll, 150); });
})();
