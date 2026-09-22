// The site is static, so the form posts to our receiver in Yandex Cloud Functions, which
// mails the lead to the team. Tilda and Telegram were tried and dropped along the way —
// the reasons are in form-api/README.md. The markup stays as it was.
(function () {
  var ENDPOINT = 'https://functions.yandexcloud.net/d4e5vi24ua8fnfeam2nv';
  var form = document.getElementById('lead-form');
  if (!form) return;

  var status = form.querySelector('.form__status');
  var button = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var data = new FormData(form);
    data.append('page', location.href);
    button.disabled = true;
    status.textContent = 'Отправляем…';

    fetch(ENDPOINT, { method: 'POST', body: new URLSearchParams(data) })
      .then(function (response) {
        if (!response.ok) throw new Error(response.status);
        form.reset();
        status.textContent = 'Заявка ушла, ответим в ближайший рабочий день.';
      })
      .catch(function () {
        status.textContent = 'Не отправилось. Напишите на alex@kazan-project-manufactory.ru';
      })
      .then(function () {
        button.disabled = false;
      });
  });
})();
