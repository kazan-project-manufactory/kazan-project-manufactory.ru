// No backend yet: the form opens a prefilled mail draft. Posting into Tilda was tried and
// dropped — their CRM has no write API, and the form endpoint answers with a captcha
// challenge, so delivery could not be guaranteed. Next step is our own receiver: replace
// the handler below with a fetch to it, the markup stays as is.
(function () {
  var form = document.getElementById('lead-form');
  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var body = 'Имя: ' + form.elements.name.value +
      '\nКонтакт: ' + form.elements.contact.value +
      '\n\n' + form.elements.task.value;
    location.href = 'mailto:alex@kazan-project-manufactory.ru?subject=' +
      encodeURIComponent('Заявка с сайта') + '&body=' + encodeURIComponent(body);
  });
})();
