// Molde «turnos»: lo que se marca en la carta y en «Tu turno» arma el mensaje de WhatsApp.
(function () {
  var form = document.getElementById('turno'), boton = document.getElementById('turnoEnviar'), elegido = document.getElementById('turnoElegido');
  if (!form || !boton) return;
  var marcados = function (sel) { return [].map.call(document.querySelectorAll(sel + ':checked'), function (x) { return x.value; }); };
  var unir = function (l) { return l.length > 1 ? l.slice(0, -1).join(', ') + ' y ' + l[l.length - 1] : l[0] || ''; };
  function mensaje() {
    var s = marcados('input[name="servicio"]'), d = marcados('input[name="dia"]'), m = marcados('input[name="momento"]')[0];
    var con = form.querySelector('[name="con"]'); con = con && con.value;
    elegido.textContent = s.length ? unir(s) : elegido.dataset.vacio;
    var t = form.dataset.saludo;
    if (s.length) t += '\nPara: ' + unir(s) + '.';
    if (d.length || m) t += '\nMe queda mejor ' + (d.length ? 'el ' + unir(d).toLowerCase() : '') + (m ? ' ' + m : '') + '.';
    if (con) t += '\nSi se puede, con ' + con + '.';
    return t.replace(/ +/g, ' ');
  }
  function actualizar() {
    var t = mensaje(); boton.dataset.wa = t;
    if (window.SITIO.wa) boton.href = 'https://wa.me/' + window.SITIO.wa + '?text=' + encodeURIComponent(t);
  }
  document.addEventListener('change', function (e) { if (e.target.matches('input[name="servicio"],#turno input,#turno select')) actualizar(); });
  form.addEventListener('submit', function (e) { e.preventDefault(); });
  boton.addEventListener('click', function (e) { e.preventDefault(); window.MYM.abrirWa(mensaje(), 'turno', 'pedir_turno'); });
  actualizar();
})();
