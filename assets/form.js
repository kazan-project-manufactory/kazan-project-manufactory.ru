// The lead form posts to the Tilda form endpoint of the same project that serves the
// production site, so leads keep arriving where they do today. Both ids below are public
// (they sit in the markup of kazan-project-manufactory.ru). When the Tilda plan ends,
// swap ENDPOINT/fields for our own receiver — the rest of this file stays as is.
(function () {
  var ENDPOINT = 'https://forms.tildacdn.com/procces/';
  var SERVICE = 'd8cd5c7e21a9e6de5db2b37ce7e69159';
  var ELEMID = '1754311367728';
  var FORMID = 'form1201751351';

  var form = document.getElementById('lead-form');
  if (!form) return;
  var button = form.querySelector('button[type="submit"]');
  var status = form.querySelector('.form__status');

  function say(text) { if (status) status.textContent = text; }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (form.dataset.sending) return;
    form.dataset.sending = '1';
    button.disabled = true;
    say('Отправляем…');

    var fd = new FormData();
    fd.append('formservices[]', SERVICE);
    fd.append('tildaspec-elemid', ELEMID);
    fd.append('formid', FORMID);
    fd.append('tranid', String(Date.now()) + Math.random().toString(36).slice(2));
    fd.append('Name', form.elements.name.value);
    fd.append('contact', form.elements.contact.value);
    fd.append('description', form.elements.task.value);
    fd.append('form-spec-comments', ''); // honeypot, stays empty for humans

    fetch(ENDPOINT, { method: 'POST', body: fd })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function () {
        form.reset();
        say('Спасибо, заявка ушла. Свяжемся в рабочее время.');
        button.textContent = 'Отправлено';
      })
      .catch(function () {
        button.disabled = false;
        say('Не отправилось. Напишите на alex@kazan-project-manufactory.ru или позвоните.');
      })
      .then(function () { delete form.dataset.sending; });
  });
})();
