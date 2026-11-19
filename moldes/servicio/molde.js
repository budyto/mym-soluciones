// Molde «servicio»: al tocar un problema, el botón de WhatsApp del inicio sale con ese mensaje ya escrito.
(function () {
  var form = document.getElementById('problema'), boton = document.getElementById('botonProblema');
  if (!form || !boton) return;
  form.addEventListener('submit', function (e) { e.preventDefault(); });
  form.addEventListener('change', function (e) {
    if (e.target.name !== 'problema') return;
    var msj = e.target.value;
    boton.dataset.wa = msj;
    boton.dataset.lugar = 'inicio: ' + e.target.nextElementSibling.textContent;
    if (window.SITIO.wa) boton.href = 'https://wa.me/' + window.SITIO.wa + '?text=' + encodeURIComponent(msj);
  });
})();
