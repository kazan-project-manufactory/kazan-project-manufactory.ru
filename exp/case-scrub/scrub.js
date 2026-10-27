// case-scrub: horizontal cursor position over a project card = frame of the case (0 = cover).
(() => {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const B = '/exp/case-scrub/assets/frames/';
  for (const card of document.querySelectorAll('.card[data-scrub]')) {
    const [slug, n] = card.dataset.scrub.split(':'), N = +n, fr = [], ok = [true];
    let box, left = 0, w = 1, x = 0, cur = 0, raf = 0, inside = false;
    const set = k => {
      if (!ok[k]) k = 0;
      if (k === cur) return;
      if (cur) fr[cur - 1].classList.remove('on');
      if (k) fr[k - 1].classList.add('on');
      card.classList.toggle('cs-on', k > 0);
      cur = k;
    };
    const tick = () => { raf = 0; if (inside) set(Math.min(N, Math.max(0, Math.floor((x - left) / w * (N + 1))))); };
    const build = () => {
      box = document.createElement('span');
      box.className = 'cs';
      box.setAttribute('aria-hidden', 'true');
      for (let i = 1; i <= N; i++) {
        const im = document.createElement('img');
        im.alt = '';
        im.decoding = 'async';
        im.src = `${B}${slug}-${i}.webp`;
        im.decode().then(() => { ok[i] = true; if (inside && !raf) raf = requestAnimationFrame(tick); }, () => {});
        box.append(im);
        fr.push(im);
      }
      card.prepend(box);
    };
    card.addEventListener('pointerenter', e => {
      if (e.pointerType !== 'mouse') return;
      if (!box) build();
      const r = card.getBoundingClientRect();
      left = r.left; w = r.width; x = e.clientX; inside = true;
      tick();
    });
    card.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      x = e.clientX;
      if (!raf) raf = requestAnimationFrame(tick);
    });
    card.addEventListener('pointerleave', () => { inside = false; cancelAnimationFrame(raf); raf = 0; set(0); });
  }
})();
