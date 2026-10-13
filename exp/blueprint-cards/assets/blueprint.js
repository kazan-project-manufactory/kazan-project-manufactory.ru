// exp blueprint-cards: на тач-экране hover нет — карточка показывает чертёж, пока не доедет
// до середины экрана, и один раз становится изделием. Скролл не трогаем, только классы.
(function () {
  if (!window.IntersectionObserver || !matchMedia('(hover: none)').matches) return;
  var cards = document.querySelectorAll('.cards .card');
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      // поднялась выше двух третей экрана (или уже проехала вверх) — изделие готово
      if (e.isIntersecting) {
        e.target.classList.add('is-built');
        e.target.classList.remove('is-drawing');
        io.unobserve(e.target);
      }
    });
  // сверху полоса без края: прыжок через экран (якорь, быстрый свайп) тоже считается
  }, { rootMargin: '100000px 0px -35% 0px' });
  cards.forEach(function (c) {
    c.classList.add('is-drawing');
    io.observe(c);
  });
})();
