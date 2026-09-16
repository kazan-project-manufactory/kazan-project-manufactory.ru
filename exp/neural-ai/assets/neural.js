/* neural-ai: нейросеть из узлов и связей на canvas за «тёмным цехом ИИ».
   Ванильный JS, без зависимостей. Останавливается вне экрана, при
   prefers-reduced-motion рисует один статичный кадр. */
(function () {
  'use strict';
  var canvas = document.getElementById('neural');
  var zone = document.getElementById('forge');
  if (!canvas || !zone || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var narrow = matchMedia('(max-width: 639px)').matches;

  var W = 0, H = 0, dpr = 1, nodes = [], LINK = 0, running = false, raf = 0, t = 0;
  var cursor = { x: -1e4, y: -1e4, on: false };

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    var r = canvas.getBoundingClientRect();
    var sameW = nodes.length && Math.abs(r.width - W) < 1; // моб. адрес-бар меняет только высоту
    W = r.width; H = r.height;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (sameW) return;
    // плотность: ~1 узел на 12–18 тыс. px², на телефоне вдвое реже
    var n = Math.round(W * H / (narrow ? 9000 : 12000));
    n = Math.max(24, Math.min(narrow ? 45 : 150, n));
    LINK = narrow ? 110 : 150;
    nodes = [];
    for (var i = 0; i < n; i++) nodes.push(spawn());
  }

  function spawn() {
    return {
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - .5) * .4, vy: (Math.random() - .5) * .4,
      r: 1 + Math.random() * 2, p: Math.random() * 6.28
    };
  }

  // лёгкое поле течения: сумма синусов, без шума Перлина
  function flow(x, y, tt) {
    var a = Math.sin(x * .0035 + tt * .0006) + Math.cos(y * .004 - tt * .0004);
    return a * 1.9;
  }

  function step(dt) {
    var pull = cursor.on ? 220 : 0;
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      var a = flow(n.x, n.y, t);
      n.vx += Math.cos(a) * .004 * dt;
      n.vy += Math.sin(a) * .004 * dt;
      if (pull) {
        var dx = cursor.x - n.x, dy = cursor.y - n.y, d = Math.sqrt(dx * dx + dy * dy);
        if (d < pull && d > 1) { var f = (1 - d / pull) * .03 * dt; n.vx += dx / d * f; n.vy += dy / d * f; }
      }
      n.vx *= .985; n.vy *= .985;
      var sp = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
      if (sp > 1.4) { n.vx *= 1.4 / sp; n.vy *= 1.4 / sp; }
      n.x += n.vx * dt; n.y += n.vy * dt;
      if (n.x < -20) n.x = W + 20; else if (n.x > W + 20) n.x = -20;
      if (n.y < -20) n.y = H + 20; else if (n.y > H + 20) n.y = -20;
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    var n = nodes.length, i, j, a, b;
    ctx.lineWidth = 1;
    for (i = 0; i < n; i++) {
      a = nodes[i];
      for (j = i + 1; j < n; j++) {
        b = nodes[j];
        var dx = a.x - b.x, dy = a.y - b.y;
        if (Math.abs(dx) > LINK || Math.abs(dy) > LINK) continue;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d > LINK) continue;
        var k = 1 - d / LINK;
        // связи возле курсора — синие, остальные — белёсые
        var cx = (a.x + b.x) / 2 - cursor.x, cy = (a.y + b.y) / 2 - cursor.y;
        var near = cursor.on && cx * cx + cy * cy < 260 * 260;
        ctx.strokeStyle = near ? 'rgba(57,57,255,' + (k * .9) + ')' : 'rgba(255,255,255,' + (k * .28) + ')';
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
    }
    for (i = 0; i < n; i++) {
      a = nodes[i];
      var glow = .55 + .45 * Math.sin(t * .002 + a.p);
      ctx.fillStyle = 'rgba(180,190,255,' + (glow * .9) + ')';
      ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, 6.2832); ctx.fill();
    }
    if (cursor.on) {
      var g = ctx.createRadialGradient(cursor.x, cursor.y, 0, cursor.x, cursor.y, 260);
      g.addColorStop(0, 'rgba(57,57,255,.18)'); g.addColorStop(1, 'rgba(57,57,255,0)');
      ctx.fillStyle = g; ctx.fillRect(cursor.x - 260, cursor.y - 260, 520, 520);
    }
  }

  var last = 0;
  function frame(now) {
    if (!running) return;
    var dt = Math.min(2.5, (now - (last || now)) / 16.67); last = now;
    t = now;
    step(dt); draw();
    raf = requestAnimationFrame(frame);
  }
  function start() { if (running || reduced) return; running = true; last = 0; raf = requestAnimationFrame(frame); }
  function stop() { running = false; cancelAnimationFrame(raf); }

  function point(e) {
    var r = canvas.getBoundingClientRect();
    var p = e.touches ? e.touches[0] : e;
    cursor.x = p.clientX - r.left; cursor.y = p.clientY - r.top; cursor.on = true;
  }
  function leave() { cursor.on = false; cursor.x = cursor.y = -1e4; }

  resize();
  if (reduced) {
    // один статичный кадр: пара сотен шагов, чтобы сеть «сложилась»
    for (var s = 0; s < 120; s++) { t += 16; step(1); }
    draw();
    addEventListener('resize', function () { resize(); for (var s = 0; s < 120; s++) step(1); draw(); });
    return;
  }
  addEventListener('resize', resize);
  zone.addEventListener('pointermove', point);
  zone.addEventListener('pointerleave', leave);
  zone.addEventListener('touchstart', point, { passive: true });
  zone.addEventListener('touchmove', point, { passive: true });
  zone.addEventListener('touchend', leave);
  // рисуем только пока цех на экране
  new IntersectionObserver(function (es) { es[0].isIntersecting ? start() : stop(); }, { threshold: 0 }).observe(zone);
})();
