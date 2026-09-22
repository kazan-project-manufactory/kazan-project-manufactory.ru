// The site is static, so the form posts to our receiver in Yandex Cloud Functions, which
// mails the lead to the team. Tilda and Telegram were tried and dropped along the way —
// the reasons are in form-api/README.md.
(function () {
  var ENDPOINT = 'https://functions.yandexcloud.net/d4e5vi24ua8fnfeam2nv';
  var form = document.getElementById('lead-form');
  if (!form) return;

  var status = form.querySelector('.form__status');
  var button = form.querySelector('button[type="submit"]');

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
    data.append('page', location.href);

    // Source tags for the lead: campaign params as they came in the URL.
    new URLSearchParams(location.search).forEach(function (value, name) {
      if (name.indexOf('utm_') === 0) data.append(name, value);
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
