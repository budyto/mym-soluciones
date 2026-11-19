// Molde «local»: el catálogo. Se marcan cantidades, se filtra por categoría y el pedido sale armado por WhatsApp,
// agrupado por categoría (sirve cuando un mismo negocio tiene dos locales o dos rubros).
(function () {
  var lista = document.getElementById('productos');
  if (!lista) return;
  var barra = document.getElementById('pedidoBarra'), cuenta = document.getElementById('pedidoCantidad');
  var items = [].slice.call(lista.querySelectorAll('.producto'));
  var elegidos = function () { return items.filter(function (li) { return Number(li.dataset.cant || 0) > 0; }); };

  lista.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-d]'); if (!b) return;
    var li = b.closest('.producto');
    var n = Math.max(0, Number(li.dataset.cant || 0) + Number(b.dataset.d));
    li.dataset.cant = n; li.querySelector('output').textContent = n; li.classList.toggle('con', n > 0);
    var k = elegidos().length;
    cuenta.textContent = k + (k === 1 ? ' producto' : ' productos');
    barra.hidden = k === 0; document.body.classList.toggle('con-pedido', k > 0);
  });

  [].forEach.call(document.querySelectorAll('.filtro'), function (f) {
    f.addEventListener('click', function () {
      [].forEach.call(document.querySelectorAll('.filtro'), function (x) { x.setAttribute('aria-pressed', x === f); });
      items.forEach(function (li) { li.hidden = !(f.dataset.f === 'todo' || li.dataset.cat === f.dataset.f); });
    });
  });

  document.getElementById('pedidoEnviar').addEventListener('click', function () {
    var grupos = {}, orden = [];
    elegidos().forEach(function (li) {
      var g = li.dataset.grupo; if (!grupos[g]) { grupos[g] = []; orden.push(g); }
      grupos[g].push('• ' + li.dataset.nombre + ': ' + li.dataset.cant + ' ' + li.dataset.unidad);
    });
    var t = lista.dataset.saludo + '\n';
    orden.forEach(function (g) { t += '\n' + (orden.length > 1 ? g.toUpperCase() + '\n' : '') + grupos[g].join('\n') + '\n'; });
    if (lista.dataset.cierre) t += '\n' + lista.dataset.cierre;
    window.MYM.abrirWa(t.trim(), 'pedido', 'enviar_pedido');
  });
})();
