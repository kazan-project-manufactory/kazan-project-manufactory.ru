// phrase-form experiment: a copy of /assets/form.js with the same receiver and flow. The form
// is one sentence with blanks; before sending, the blanks are glued back into that sentence
// and it goes out as `task`, so the team gets a letter, not a questionnaire.
(function () {
  var ENDPOINT = 'https://functions.yandexcloud.net/d4e5vi24ua8fnfeam2nv';
  var form = document.getElementById('lead-form');
  if (!form) return;

  var status = form.querySelector('.form__status');
  var button = form.querySelector('button[type="submit"]');
  var name = form.elements.name;
  var contact = form.elements.contact;
  var topic = document.getElementById('pf-topic');
  var about = document.getElementById('pf-about');

  // Safari has no field-sizing yet: the blanks are measured by hand as the text changes.
  var fits = [];
  if (!(window.CSS && CSS.supports('field-sizing', 'content'))) {
    var pen = document.createElement('canvas').getContext('2d');
    var fitWidth = function (el, text) {
      var cs = getComputedStyle(el);
      pen.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
      el.style.width = Math.ceil(pen.measureText(text).width + parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) + 2) + 'px';
    };
    [name, contact].forEach(function (input) {
      var fit = function () { fitWidth(input, input.value || input.placeholder); };
      input.addEventListener('input', fit);
      fits.push(fit);
    });
    var fitTopic = function () { fitWidth(topic, topic.options[topic.selectedIndex].text); };
    var fitAbout = function () { about.style.height = 'auto'; about.style.height = about.scrollHeight + 'px'; };
    topic.addEventListener('change', fitTopic);
    about.addEventListener('input', fitAbout);
    fits.push(fitTopic, fitAbout);
    var refit = function () { fits.forEach(function (fit) { fit(); }); };
    // the sentence is sized by its sheet, so a new width or the late display face means new measures
    window.addEventListener('resize', refit);
    if (document.fonts) document.fonts.ready.then(refit);
    refit();
  }

  function clean(el) { return el.value.trim().replace(/\s+/g, ' '); }

  // The sentence as the visitor sees it, minus the blanks they left empty.
  function letter() {
    var who = clean(name), what = topic.value, text = about.value.trim(), reply = clean(contact);
    var parts = ['Здравствуйте!'];
    if (who) parts.push('Меня зовут ' + who + (what ? ', пишу про ' + what + '.' : '.'));
    else if (what) parts.push('Пишу про ' + what + '.');
    if (text) parts.push('Коротко о задаче: ' + text);
    if (reply) parts.push('Ответьте, пожалуйста, сюда: ' + reply + '.');
    return parts.join('\n');
  }

  function showStatus(text, ok) {
    status.textContent = text;
    status.classList.remove(ok ? 'form__status--error' : 'form__status--ok');
    status.classList.add(ok ? 'form__status--ok' : 'form__status--error');
    status.hidden = false;
  }

  function hideStatus() {
    status.hidden = true;
    status.classList.remove('form__status--ok');
    status.classList.remove('form__status--error');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var data = new FormData(form);
    data.set('task', letter());
    data.append('page', location.href);

    // Source tags for the lead: campaign params as they came in the URL.
    new URLSearchParams(location.search).forEach(function (value, key) {
      if (key.indexOf('utm_') === 0) data.append(key, value);
    });
    // Our own pages are not a source, so only an external referrer is worth sending.
    if (document.referrer && new URL(document.referrer).hostname !== location.hostname) {
      data.append('referrer', document.referrer);
    }

    var label = button.textContent;
    button.disabled = true;
    button.textContent = 'Отправляем…';
    hideStatus();

    fetch(ENDPOINT, { method: 'POST', body: new URLSearchParams(data) })
      .then(function (response) {
        if (!response.ok) throw new Error(response.status);
        form.reset();
        fits.forEach(function (fit) { fit(); });
        showStatus('Заявка ушла. Ответим в течение рабочего дня', true);
      })
      .catch(function () {
        showStatus('Не отправилось. Напишите на alex@kazan-project-manufactory.ru', false);
      })
      .then(function () {
        button.disabled = false;
        button.textContent = label;
      });
  });
})();
