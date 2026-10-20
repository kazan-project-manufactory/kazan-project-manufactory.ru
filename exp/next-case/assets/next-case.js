// Предзагрузка следующего кейса по приёму quicklink (GoogleChromeLabs/quicklink, Apache-2.0):
// блок «Следующий проект» вошёл в экран → в простое добавляем <link rel=prefetch> на страницу и её первую картинку.
(() => {
  const card = document.querySelector('.next__card');
  if (!card || !('IntersectionObserver' in window)) return;
  const conn = navigator.connection;
  if (conn && (conn.saveData || /2g/.test(conn.effectiveType || ''))) return;
  const prefetch = (href, as) => {
    const l = document.createElement('link');
    l.rel = 'prefetch'; l.href = href; if (as) l.as = as;
    document.head.appendChild(l);
  };
  const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 1));
  const io = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    io.disconnect();
    idle(() => {
      prefetch(card.href, 'document');
      (card.dataset.prefetch || '').split(' ').filter(Boolean).forEach((u) => prefetch(u, 'image'));
    }, { timeout: 2000 });
  }, { rootMargin: '0px 0px 300px 0px' });
  io.observe(card);
})();
