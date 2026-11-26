/* Módulo «Catálogo online»: lo que ve la distribuidora del catálogo que usan sus clientes (catalogo.html).
   Muestra los pedidos que entraron por el catálogo, lo más pedido y la configuración (rubros visibles, compra mínima,
   lista para quien no entró, WhatsApp de ventas). La configuración se guarda con App.acciones.guardarConfig('catalogo', …):
   queda en el registro de la sesión como cualquier otro cambio, la lee catalogo.html y «Reiniciar demo» la vuelve a la original. */
(function () {
  const CLAVE = 'catalogo';
  const RUBROS = ['Almacén', 'Bebidas', 'Lácteos y frescos', 'Limpieza', 'Perfumería', 'Golosinas'];
  const BASE = () => ({ rubros: RUBROS.slice(), minimo: 120000, listaId: 'L2', whatsapp: '353 456-1200', mostrarStock: true });
  function leer() {
    const x = App.configModulo(CLAVE);
    return x && typeof x === 'object' ? Object.assign(BASE(), x) : BASE();
  }
  const guardar = cfg => App.acciones.guardarConfig(CLAVE, cfg);
  const borrar = () => App.acciones.guardarConfig(CLAVE, null);

  // estilos propios del módulo (prefijo catm-), una sola vez
  function estilos() {
    if (document.getElementById('estilos-catm')) return;
    const s = document.createElement('style');
    s.id = 'estilos-catm';
    s.textContent = `
      .catm-link { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
      .catm-link code { font: inherit; font-size: var(--fs-13); background: var(--papel); border: 1px solid var(--linea); border-radius: var(--r-control); padding: 6px 10px; word-break: break-all; flex: 1 1 220px; min-width: 0; }
      .catm-rubros { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 8px; border: 0; padding: 0; margin: 0; min-width: 0; }
      .catm-rubros legend { font-size: var(--fs-13); font-weight: 600; margin-bottom: 8px; padding: 0; }
      .catm-rubro { display: flex; justify-content: space-between; align-items: center; gap: 8px; border: 1px solid var(--linea); border-radius: var(--r-control); padding: 8px 10px; background: var(--hoja); cursor: pointer; }
      .catm-rubro:has(input:checked) { border-color: var(--tinta); }
      .catm-rubro small { color: var(--texto-2); }
      .catm-vista { display: grid; gap: 10px; }
      .catm-vista.panel { margin-top: 0; }
      .catm-vista .cifra { font-size: var(--fs-20); }
      .catm-bulto { display: flex; gap: 10px; align-items: center; }
      .catm-bulto i { width: 12px; height: 12px; border-radius: 2px; background: var(--carton); flex: none; }
      .catm-seg { max-width: 100%; overflow-x: auto; }
      .catm-seg button { white-space: nowrap; flex: none; }
      .catm-pie-form { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 18px; }
    `;
    document.head.appendChild(s);
  }

  const hoy = () => App.hoy();
  const delCatalogo = () => App.db.pedidos.filter(p => p.origen === 'catalogo');
  const nombreLista = id => (App.get('listasPrecio', id) || {}).nombre || id;
  const linkCatalogo = () => new URL('catalogo.html', location.href).href;

  let filtroEstado = 'todos', texto = '';

  function kpis() {
    const ui = App.ui, mes = hoy().slice(0, 7);
    const delMes = App.db.pedidos.filter(p => p.fecha.slice(0, 7) === mes && p.estado !== 'cancelado');
    const cat = delMes.filter(p => p.origen === 'catalogo');
    const totalMes = delMes.reduce((s, p) => s + p.total, 0), totalCat = cat.reduce((s, p) => s + p.total, 0);
    const pendientes = delCatalogo().filter(p => p.estado === 'pendiente');
    const desde = App.f.sumar(hoy(), -30);
    const clientes = new Set(delCatalogo().filter(p => p.fecha >= desde && p.estado !== 'cancelado').map(p => p.clienteId));
    return ui.franjaKpi([
      { titulo: 'Pedidos por catálogo en ' + App.f.nombreMes(hoy()).split(' ')[0], valor: ui.num(cat.length), detalle: cat.length ? 'Ticket promedio ' + ui.pesos(totalCat / cat.length) : 'Sin pedidos en el mes' },
      { titulo: 'Ventas por catálogo', valor: ui.pesosCorto(totalCat), detalle: ui.porcentaje(totalMes ? totalCat / totalMes : 0) + ' del total pedido en el mes', tono: 'info' },
      { titulo: 'Pendientes de facturación', valor: ui.num(pendientes.length), detalle: pendientes.length ? ui.pesos(pendientes.reduce((s, p) => s + p.total, 0)) + ' en pedidos del catálogo' : 'Sin pedidos pendientes', tono: pendientes.length ? 'alerta' : 'ok' },
      { titulo: 'Clientes activos en el catálogo', valor: ui.num(clientes.size), detalle: 'Con pedidos en los últimos 30 días' }
    ]);
  }

  function pestanaPedidos(panel) {
    const ui = App.ui, h = ui.h;
    const filtros = ui.nodo(String(h`<div class="filtros"><input type="search" class="busqueda" placeholder="Buscar por cliente o número de pedido" aria-label="Buscar pedidos del catálogo" value="${texto}">
      <div class="segmentado catm-seg" role="group" aria-label="Estado">${[['todos', 'Todos'], ['pendiente', 'Pendientes'], ['facturado', 'Facturados'], ['cancelado', 'Cancelados']].map(([id, t]) => h`<button type="button" data-estado="${id}" aria-pressed="${id === filtroEstado}">${t}</button>`)}</div></div>`));
    panel.appendChild(filtros);
    const izq = document.createElement('div'), der = document.createElement('div');
    der.className = 'grilla-2 seccion';
    panel.append(izq, der);

    const filas = () => delCatalogo().filter(p => {
      if (filtroEstado !== 'todos' && p.estado !== filtroEstado) return false;
      const c = App.get('clientes', p.clienteId) || {};
      return ui.coincide(texto, p.nro, c.fantasia, c.razonSocial, c.localidad, c.cuit);
    }).sort((a, b) => (b.fecha > a.fecha ? 1 : b.fecha < a.fecha ? -1 : b.numero - a.numero));

    const tabla = ui.tabla({
      columnas: [
        { titulo: 'Pedido', clase: 'ocultar-celu', ordenar: p => p.numero, valor: p => h`<div class="celda-principal">${p.nro}</div><div class="celda-sub">${ui.fecha(p.fecha)}</div>` },
        { titulo: 'Cliente', ordenar: p => (App.get('clientes', p.clienteId) || {}).fantasia, valor: p => { const c = App.get('clientes', p.clienteId) || {}; return h`<div class="celda-principal">${c.fantasia}</div><div class="celda-sub">${c.localidad}, lista ${nombreLista(p.listaId)}</div><div class="celda-sub solo-celu">Pedido ${p.nro}, ${ui.estado(p.estado) && ({ pendiente: 'pendiente', facturado: 'facturado', cancelado: 'cancelado' })[p.estado] || p.estado}</div>`; } },
        { titulo: 'Bultos', clase: 'ocultar-celu', alinear: 'der', ordenar: p => p.items.reduce((s, i) => s + i.cantidad, 0), valor: p => ui.num(p.items.reduce((s, i) => s + i.cantidad, 0)) },
        { titulo: 'Total', alinear: 'der', campo: 'total', valor: p => ui.pesos(p.total) },
        { titulo: 'Estado', clase: 'ocultar-celu', valor: p => h`${ui.estado(p.estado)}${p.alertas && p.alertas.length && p.estado === 'pendiente' ? h`<div class="celda-sub peligro">Excede el límite de crédito</div>` : ''}` },
        { titulo: '', alinear: 'der', valor: p => {
          if (p.estado !== 'pendiente') return '';
          const b = document.createElement('button');
          b.type = 'button'; b.className = 'btn btn-secundario btn-chico'; b.textContent = 'Facturar'; b.setAttribute('aria-label', 'Facturar el pedido ' + p.nro);
          b.addEventListener('click', async () => { if (await App.confirmarLimite(p.id)) App.intentar(() => App.acciones.facturarPedido(p.id), r => 'Pedido facturado: ' + App.nombreTipo(r.tipo) + ' ' + r.nro); });
          return b;
        } }
      ],
      filas: filas(),
      alClic: p => App.ui.ir('#/ventas/pedido/' + p.id),
      filaClase: p => p.estado === 'pendiente' ? (p.alertas && p.alertas.length ? 'fila-peligro' : 'fila-alerta') : p.estado === 'cancelado' ? 'fila-apagada' : '',
      vacio: texto ? 'Ningún pedido del catálogo coincide con la búsqueda.' : 'No hay pedidos del catálogo con ese estado.',
      limite: 25
    });
    izq.appendChild(tabla);

    const input = filtros.querySelector('input');
    ui.buscador(input, t => { texto = t; tabla.actualizar(filas()); });
    filtros.querySelector('.segmentado').addEventListener('click', e => {
      const b = e.target.closest('[data-estado]'); if (!b) return;
      filtroEstado = b.dataset.estado;
      filtros.querySelectorAll('[data-estado]').forEach(x => x.setAttribute('aria-pressed', x === b));
      tabla.actualizar(filas());
    });

    // al costado: el link para mandar a los clientes y cómo está publicado
    const cfg = leer();
    der.appendChild(ui.nodo(String(h`<div class="panel"><div class="panel-titulo">Enlace para clientes</div>
      <p class="texto-2">Puede enviarse por WhatsApp o incluirse en la factura. Cada cliente ingresa con su CUIT y accede a los precios de su lista.</p>
      <div class="catm-link"><code>${linkCatalogo()}</code><button class="btn btn-secundario btn-chico" type="button" data-copiar>Copiar enlace</button></div></div>`)));
    const ult = delCatalogo().filter(p => p.estado !== 'cancelado').sort((a, b) => b.numero - a.numero)[0];
    der.appendChild(ui.nodo(String(h`<div class="panel" style="margin-top:0"><div class="panel-titulo">Configuración vigente</div><dl class="datos">
      <dt>Rubros</dt><dd>${cfg.rubros.length === RUBROS.length ? 'Todos' : cfg.rubros.join(', ') || 'Ninguno'}</dd>
      <dt>Compra mínima</dt><dd>${ui.pesos(cfg.minimo)}</dd><dt>Sin identificación</dt><dd>Precios de la lista ${nombreLista(cfg.listaId)}</dd>
      <dt>WhatsApp</dt><dd>${cfg.whatsapp}</dd><dt>Último pedido</dt><dd>${ult ? ui.fecha(ult.fecha) + ', ' + ((App.get('clientes', ult.clienteId) || {}).fantasia || '') : '—'}</dd></dl></div>`)));
    der.querySelector('[data-copiar]').addEventListener('click', () => {
      const ok = () => App.ui.toast('Enlace copiado', 'ok'), mal = () => App.ui.toast('No se pudo copiar el enlace. Debe seleccionarse y copiarse manualmente.', 'alerta');
      try { navigator.clipboard.writeText(linkCatalogo()).then(ok, mal); } catch (e) { mal(); }
    });
  }

  function pestanaMasPedido(panel) {
    const ui = App.ui, h = ui.h;
    const desde = App.f.sumar(hoy(), -30);
    const acum = {};
    delCatalogo().filter(p => p.fecha >= desde && p.estado !== 'cancelado').forEach(p => p.items.forEach(it => {
      const a = acum[it.productoId] = acum[it.productoId] || { productoId: it.productoId, bultos: 0, neto: 0, pedidos: 0 };
      a.bultos += it.cantidad; a.neto += it.cantidad * it.precio; a.pedidos++;
    }));
    const filas = Object.values(acum).sort((a, b) => b.neto - a.neto);
    const max = filas.length ? filas[0].neto : 1;
    panel.appendChild(ui.nodo(String(h`<p class="bajada" style="margin:0 0 12px">Productos pedidos por el catálogo del ${ui.fecha(desde)} a hoy. Permite definir qué productos destacar y cuáles reponer.</p>`)));
    panel.appendChild(ui.tabla({
      columnas: [
        { titulo: 'Producto', ordenar: f => App.get('productos', f.productoId).descripcion, valor: f => { const p = App.get('productos', f.productoId); return h`<div class="celda-principal">${p.descripcion}</div><div class="celda-sub">${p.codigo}, ${p.rubro}</div>`; } },
        { titulo: 'Pedidos', alinear: 'der', campo: 'pedidos', valor: f => ui.num(f.pedidos) },
        { titulo: 'Bultos', clase: 'ocultar-celu', alinear: 'der', campo: 'bultos', valor: f => ui.num(f.bultos) },
        { titulo: 'Neto vendido', clase: 'ocultar-celu', alinear: 'der', campo: 'neto', valor: f => ui.pesos(f.neto) },
        { titulo: '', ancho: '140px', valor: f => h`<div class="barra-h"><span style="width:${(f.neto / max * 100).toFixed(1)}%"></span></div>` },
        { titulo: 'Disponible', alinear: 'der', valor: f => { const d = App.q.stock(f.productoId).disponible; return d <= 0 ? ui.chip('Sin stock', 'peligro') : ui.num(d); } }
      ],
      filas,
      alClic: f => App.ui.ir('#/stock/producto/' + f.productoId),
      vacio: 'Sin pedidos por catálogo en los últimos 30 días.',
      limite: 25
    }));
  }

  function pestanaConfig(panel) {
    const ui = App.ui, h = ui.h;
    const cfg = leer();
    const cuenta = r => App.db.productos.filter(p => p.rubro === r && p.activo !== false).length;
    const form = ui.nodo(String(h`<form class="grilla-lado" novalidate><div class="panel" style="min-width:0">
      <fieldset class="catm-rubros"><legend>Rubros que se muestran</legend>
        ${RUBROS.map(r => h`<label class="catm-rubro"><span class="check"><input type="checkbox" name="rubro" value="${r}"${cfg.rubros.includes(r) ? ' checked' : ''}> ${r}</span><small>${cuenta(r)} productos</small></label>`)}
      </fieldset>
      <div class="form-grilla" style="margin-top:18px">
        <div class="campo"><label for="catm-minimo">Compra mínima (con IVA)</label><input id="catm-minimo" name="minimo" type="number" min="0" step="1000" value="${cfg.minimo}"><span class="campo-ayuda">Por debajo de este importe el cliente no puede confirmar el pedido.</span></div>
        <div class="campo"><label for="catm-lista">Lista para visitantes sin identificar</label><select id="catm-lista" name="listaId">${ui.opciones(App.db.listasPrecio, 'id', l => l.nombre + ' (' + l.detalle.toLowerCase() + ')', cfg.listaId)}</select><span class="campo-ayuda">Al ingresar con su CUIT, el cliente accede a la lista que tiene asignada.</span></div>
        <div class="campo"><label for="catm-wa">WhatsApp de ventas</label><input id="catm-wa" name="whatsapp" type="tel" value="${cfg.whatsapp}"><span class="campo-ayuda">Destino del botón «Enviar pedido por WhatsApp».</span></div>
        <label class="check ancho-total"><input type="checkbox" name="mostrarStock"${cfg.mostrarStock ? ' checked' : ''}> Mostrar la cantidad de bultos disponibles (en caso contrario, sólo «Hay stock» o «Quedan pocos»)</label>
      </div>
      <div class="catm-pie-form"><button class="btn btn-primario" type="submit">Guardar configuración</button><button class="btn btn-fantasma" type="button" data-original>Volver a la configuración original</button></div>
    </div><div class="panel catm-vista" aria-live="polite"></div></form>`));
    panel.appendChild(form);
    const vista = form.querySelector('.catm-vista');
    function leerForm() {
      return {
        rubros: Array.from(form.querySelectorAll('input[name="rubro"]:checked')).map(i => i.value),
        minimo: Math.max(0, Math.round(Number(form.querySelector('[name="minimo"]').value) || 0)),
        listaId: form.querySelector('[name="listaId"]').value,
        whatsapp: form.querySelector('[name="whatsapp"]').value.trim(),
        mostrarStock: form.querySelector('[name="mostrarStock"]').checked
      };
    }
    function previa() {
      const c = leerForm();
      const ps = App.db.productos.filter(p => p.activo !== false && c.rubros.includes(p.rubro));
      const sinStock = ps.filter(p => App.q.stock(p.id, 'D1').disponible <= 0).length;
      vista.innerHTML = String(h`<div class="panel-titulo">Vista del cliente</div>
        <div class="catm-bulto"><i></i><span><span class="cifra">${ui.num(ps.length)}</span> productos en ${c.rubros.length} ${c.rubros.length === 1 ? 'rubro' : 'rubros'}</span></div>
        <div class="texto-2">${sinStock ? sinStock + ' aparecen «Sin stock» en el Depósito Central.' : 'Todos tienen stock en el Depósito Central.'}</div>
        <div class="texto-2">Sin identificarse accede a la lista ${nombreLista(c.listaId)}. Compra mínima: ${ui.pesos(c.minimo)}.</div>
        ${!c.rubros.length ? h`<div class="aviso aviso-peligro">Sin rubros seleccionados el catálogo queda vacío.</div>` : ''}
        <a class="btn btn-secundario" href="catalogo.html" target="_blank" rel="noopener">Abrir catálogo como cliente</a>`);
    }
    form.addEventListener('input', previa);
    form.addEventListener('change', previa);
    previa();
    form.addEventListener('submit', e => {
      e.preventDefault();
      const c = leerForm();
      if (!c.rubros.length) { ui.toast('Se debe seleccionar al menos un rubro.', 'peligro'); return; }
      if (c.whatsapp.replace(/\D/g, '').length < 8) { ui.toast('El WhatsApp de ventas debe incluir característica y número.', 'peligro'); return; }
      if (App.intentar(() => guardar(c), 'Configuración guardada') == null) return;
      App.renderizar();
    });
    form.querySelector('[data-original]').addEventListener('click', async () => {
      const ok = await ui.confirmar('El catálogo vuelve a mostrar todos los rubros, con compra mínima de ' + ui.pesos(BASE().minimo) + ' y la lista Almacén para visitantes sin identificar.', { titulo: 'Volver a la configuración original', aceptar: 'Volver a la original' });
      if (!ok) return;
      borrar();
      ui.toast('Configuración original restaurada', 'ok');
      App.renderizar();
    });
  }

  App.modulo({
    id: 'catalogo',
    titulo: 'Catálogo online',
    grupo: 'Comercial',
    orden: 50,
    icono: '<svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="10" cy="10" r="7.5"/><path d="M2.5 10h15M10 2.5c2.2 2.3 2.2 12.7 0 15M10 2.5c-2.2 2.3-2.2 12.7 0 15"/></svg>',
    contador: () => delCatalogo().filter(p => p.estado === 'pendiente').length,
    render(el) {
      estilos();
      const ui = App.ui, h = ui.h;
      const pend = delCatalogo().filter(p => p.estado === 'pendiente').length;
      el.appendChild(ui.nodo(String(h`<div class="encabezado-vista"><div><h1 class="titulo-vista">Catálogo online</h1>
        <p class="bajada">Los clientes cargan sus pedidos desde el celular, con los precios de su lista y el stock real. Cada pedido confirmado ingresa aquí y en Ventas como pendiente de facturación.</p></div>
        <div class="acciones"><a class="btn btn-primario" href="catalogo.html" target="_blank" rel="noopener">Abrir catálogo como cliente</a></div></div>`)));
      el.appendChild(ui.nodo(String(kpis())));
      const cont = document.createElement('div');
      cont.className = 'seccion';
      el.appendChild(cont);
      ui.pestanas(cont, [
        { id: 'pedidos', titulo: 'Pedidos recibidos', cuenta: pend || null, render: pestanaPedidos },
        { id: 'mas', titulo: 'Productos más pedidos', render: pestanaMasPedido },
        { id: 'config', titulo: 'Configuración', render: pestanaConfig }
      ], { clave: 'catalogo' });
    }
  });
})();
