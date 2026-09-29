// "AI for <sphere>": the last word of the section title is the only control.
// A click (Enter/Space) moves to the next sphere; five task lines below re-read
// themselves for it. Texts are the hand-written ones from the living-brief version —
// no generation, no network. Without JS the page shows the museum set as plain text.
(function () {
  var SPHERES = [
    { id: 'museum', label: 'Музей', gen: 'музея', nom: 'музей' },
    { id: 'university', label: 'Вуз', gen: 'вуза', nom: 'вуз' },
    { id: 'gov', label: 'Госструктура', gen: 'госструктуры', nom: 'госструктура' },
    { id: 'business', label: 'Бизнес', gen: 'бизнеса', nom: 'бизнес' }
  ];

  // Order matches the rows in the markup. `focus` is the industry line of each task.
  var TASKS = [
    {
      label: 'Обработка документов',
      focus: {
        museum: 'Для музея это учётные карточки предметов, акты приёма на хранение и выставочная документация.',
        university: 'Для вуза это приказы, заявления абитуриентов, справки и отчётность.',
        gov: 'Для госструктуры это обращения граждан, входящая корреспонденция и отчётные формы.',
        business: 'Для бизнеса это счета, договоры, акты и остальная первичка.'
      }
    },
    {
      label: 'Ассистент для посетителей',
      focus: {
        museum: 'Для музея это навигация по экспозиции и ответы про билеты, часы работы и текущие выставки.',
        university: 'Для вуза это расписание, кампус, общежитие и вопросы приёмной кампании.',
        gov: 'Для госструктуры это типовые вопросы об услугах, документах и сроках — нагрузка на горячую линию падает.',
        business: 'Для бизнеса это вопросы клиентов о продуктах, статусах заказов и условиях — круглосуточно.'
      }
    },
    {
      label: 'Аналитика и прогнозы',
      focus: {
        museum: 'Для музея это прогноз посещаемости по дням и выставкам — чтобы планировать смены, экскурсии и закупки.',
        university: 'Для вуза это ранние сигналы по отчислениям и нагрузке на потоки — чтобы вмешаться вовремя.',
        gov: 'Для госструктуры это нагрузка на услуги и сезонные всплески обращений — чтобы заранее расставить людей.',
        business: 'Для бизнеса это спрос, отток и выручка по сценариям — чтобы решения принимались на цифрах.'
      }
    },
    {
      label: 'Генерация контента',
      focus: {
        museum: 'Для музея это этикетки, анонсы выставок, описания предметов и посты — в едином голосе.',
        university: 'Для вуза это новости кафедр, анонсы, материалы для абитуриентов и рассылки.',
        gov: 'Для госструктуры это пресс-релизы, ответы на типовые обращения и материалы для портала.',
        business: 'Для бизнеса это карточки товаров, рассылки, посты и лендинги — потоком и в одном тоне.'
      }
    },
    {
      label: 'Распознавание изображений',
      focus: {
        museum: 'Для музея это оцифровка фондов: рукописные карточки, инвентарные номера, атрибуция по фотографии предмета.',
        university: 'Для вуза это проверка бланков и ведомостей, распознавание рукописных работ, контроль доступа в корпуса.',
        gov: 'Для госструктуры это сканы, приложенные к обращениям, и контроль объектов по фотофиксации.',
        business: 'Для бизнеса это чеки, накладные, номера и контроль на площадке по камерам.'
      }
    }
  ];

  var NBSP = ' ';

  // "Для музея это учётные карточки…" -> "Учётные карточки…", with short words glued to the next one.
  function line(task, sphereId) {
    var s = task.focus[sphereId].replace(/^Для \S+ это\s+/, '');
    s = s.charAt(0).toUpperCase() + s.slice(1);
    return s.replace(/(^|[\s(])(и|в|во|на|по|для|к|с|со|о|об|а|не|из|от|за|до|про|у) /gi, '$1$2' + NBSP)
            .replace(/ —/g, NBSP + '—');
  }

  // What lands in the form: short, and open-ended so the visitor just keeps typing.
  function briefText(sphere) {
    return 'Искусственный интеллект для ' + sphere.gen + ': хотим обсудить, какие решения подойдут нам. ';
  }

  /* --- wiring --- */

  var section = document.getElementById('ai');
  var holder = document.getElementById('ai-switch');
  var list = document.getElementById('ai-ideas');
  if (!section || !holder || !list) return;

  var calm = window.matchMedia('(prefers-reduced-motion: reduce)');
  var cells = list.querySelectorAll('.idea__cell');
  var index = 0; // must match the sphere the markup ships with (museum)
  var busy = false;

  // Upgrade the static word into the control: a button inside the heading,
  // with a dotted underline and a small arrow that hints "there is more".
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'sw';
  btn.id = 'ai-switch';
  btn.setAttribute('aria-describedby', 'ai-switch-hint');
  while (holder.firstChild) btn.appendChild(holder.firstChild);
  btn.insertAdjacentHTML('beforeend',
    '<svg class="sw__hint" viewBox="0 0 16 16" aria-hidden="true" focusable="false">' +
    '<path d="M2 8h11M9 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>');
  holder.parentNode.replaceChild(btn, holder);

  var hint = document.createElement('span');
  hint.id = 'ai-switch-hint';
  hint.className = 'vh';
  hint.textContent = 'Следующая сфера';
  section.appendChild(hint);

  var slot = btn.querySelector('.sw__slot');
  var spheres = document.getElementById('ai-spheres');
  if (spheres) spheres.hidden = false;
  section.classList.add('ai--live');

  var go = document.getElementById('ai-go');
  var goWord = go && go.querySelector('.ai__go-word');

  // Every line box is as tall as its longest variant across the four spheres,
  // so switching never moves the page — only the words inside the rows change.
  function reserve() {
    for (var i = 0; i < cells.length; i++) {
      var max = 0;
      for (var k = 0; k < SPHERES.length; k++) {
        var probe = document.createElement('p');
        probe.className = 'idea__text idea__text--probe';
        probe.textContent = line(TASKS[i], SPHERES[k].id);
        cells[i].appendChild(probe);
        max = Math.max(max, probe.offsetHeight);
        cells[i].removeChild(probe);
      }
      cells[i].style.minHeight = max + 'px';
    }
  }
  reserve();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(reserve);
  var lastWidth = list.offsetWidth, pending = 0;
  window.addEventListener('resize', function () {
    if (pending) return;
    pending = requestAnimationFrame(function () {
      pending = 0;
      if (list.offsetWidth !== lastWidth) { lastWidth = list.offsetWidth; reserve(); }
    });
  });

  // Swap the content of a clipped box: the old piece leaves upwards, the new one rises
  // from below. For the title word the box also eases from the old width to the new one.
  function swap(box, oldEl, newEl, delay, easeWidth) {
    if (calm.matches) {
      box.replaceChild(newEl, oldEl);
      if (easeWidth) box.style.width = '';
      return;
    }
    var from = box.getBoundingClientRect().width;
    oldEl.classList.remove('is-in');
    oldEl.classList.add('is-out');
    oldEl.setAttribute('aria-hidden', 'true');
    box.appendChild(newEl);
    if (easeWidth) {
      box.style.width = from + 'px';
      box.getBoundingClientRect(); // commit the start width before the transition
      box.style.width = newEl.getBoundingClientRect().width + 'px';
    }
    oldEl.style.animationDelay = delay + 'ms';
    newEl.style.animationDelay = (delay + 140) + 'ms';
    newEl.classList.add('is-in');
    oldEl.addEventListener('animationend', function () {
      if (oldEl.parentNode) oldEl.parentNode.removeChild(oldEl);
    });
    newEl.addEventListener('animationend', function () {
      newEl.classList.remove('is-in');
      newEl.style.animationDelay = '';
    });
  }

  function show(next) {
    if (next === index || busy) return;
    busy = true;
    var sphere = SPHERES[next];
    index = next;

    var oldWord = slot.querySelector('.sw__word:not(.is-out)');
    var word = document.createElement('span');
    word.className = 'sw__word';
    word.textContent = sphere.gen;
    swap(slot, oldWord, word, 0, true);

    for (var i = 0; i < cells.length; i++) {
      var oldText = cells[i].querySelector('.idea__text:not(.is-out)');
      var text = document.createElement('p');
      text.className = 'idea__text';
      text.textContent = line(TASKS[i], sphere.id);
      swap(cells[i], oldText, text, 60 + i * 40, false);
    }

    if (spheres) {
      var marks = spheres.querySelectorAll('button');
      for (var j = 0; j < marks.length; j++) marks[j].setAttribute('aria-pressed', String(j === next));
    }
    if (goWord) goWord.textContent = sphere.gen;

    // the whole change lasts under 0.8s; ignore clicks until it settles so pieces never pile up
    setTimeout(function () { busy = false; }, calm.matches ? 0 : 60 + cells.length * 40 + 680);
  }

  btn.addEventListener('click', function () { show((index + 1) % SPHERES.length); });

  if (spheres) {
    spheres.addEventListener('click', function (e) {
      var mark = e.target.closest('button[data-sphere]');
      if (!mark) return;
      for (var k = 0; k < SPHERES.length; k++) if (SPHERES[k].id === mark.dataset.sphere) show(k);
    });
  }

  var field = document.querySelector('#lead-form textarea[name="task"]');
  if (!go || !field) return; // without the form the link stays a plain anchor to #form

  var lastPrefill = '';
  go.addEventListener('click', function (e) {
    e.preventDefault();
    // never overwrite what the visitor has already written themselves
    if (!field.value.trim() || field.value === lastPrefill) {
      field.value = lastPrefill = briefText(SPHERES[index]);
    }
    document.getElementById('lead-form').scrollIntoView({ behavior: calm.matches ? 'auto' : 'smooth', block: 'start' });
    field.focus({ preventScroll: true });
    field.setSelectionRange(field.value.length, field.value.length);
  });
})();
