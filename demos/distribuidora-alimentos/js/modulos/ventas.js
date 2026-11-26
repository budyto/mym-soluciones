/* Módulo «Ventas y pedidos».
   Rutas: #/ventas (pedidos con filtros, facturación de a uno o en lote, ranking del mes),
   #/ventas/pedido/<id> (detalle) y #/ventas/mostrador (carga de pedido de mostrador).
   Los filtros, la selección y el pedido de mostrador viven en memoria del módulo, así sobreviven
   al render que dispara cada 'cambio' del store. Todo cambio de datos pasa por App.acciones. */
(function () {
  'use strict';
  const ui = App.ui, h = ui.h;
  const ORIGEN = { preventa: 'Preventa', catalogo: 'Catálogo online', mostrador: 'Mostrador' };
  const ORIGEN_TONO = { preventa: 'neutro', catalogo: 'info', mostrador: 'neutro' };
  const IVA_NOMBRE = { RI: 'Responsable Inscripto', MT: 'Monotributo', CF: 'Consumidor Final', EX: 'Exento' };

  // ---------- estado del módulo ----------
  const filtros = { estado: 'pendiente', preventista: '', origen: '', desde: '', hasta: '', texto: '' };
  const seleccion = new Set();
  let periodoRanking = 'actual';
  const mostrador = { clienteId: null, depositoId: null, items: [], obs: '', texto: '' };

  function estilos() {
    if (document.getElementById('vt-estilos')) return;
    const st = document.createElement('style');
    st.id = 'vt-estilos';
    st.textContent = `
.vt-barra-lote { display: flex; align-items: center; justify-content: space-between; gap: 10px 16px; flex-wrap: wrap; margin: 0 0 10px; min-height: 36px; }
.vt-barra-lote .texto-2 { font-size: var(--fs-13); }
.vt-filtros .campo { gap: 3px; }
.vt-corte { flex-basis: 100%; height: 0; }
.vt-filtros select { min-width: 170px; }
.vt-filtros .campo > label { font-size: var(--fs-12); font-weight: 600; color: var(--texto-2); }
.vt-filtros input[type="date"] { width: 150px; }
.vt-filtros .vt-busca { flex: 1 1 220px; max-width: 320px; }
.vt-filtros .vt-busca input { max-width: none; }
.vt-tabla { table-layout: fixed; min-width: 0; }
.vt-tabla th.vt-check, .vt-tabla td.vt-check { width: 40px; padding-right: 0; }
.vt-tabla .vt-c-pedido { width: 104px; } .vt-tabla .vt-c-fecha { width: 96px; } .vt-tabla .vt-c-origen { width: 140px; }
.vt-tabla .vt-c-total { width: 140px; } .vt-tabla .vt-c-estado { width: 112px; } .vt-tabla .vt-c-accion { width: 100px; }
.vt-tabla td { overflow: hidden; text-overflow: ellipsis; }
.vt-ayuda { font-size: var(--fs-12); color: var(--texto-2); }
.vt-bonif { width: 64px; }
.vt-com-pct { width: 70px; text-align: right; }
.vt-liq-hist { margin-top: 8px; }
.vt-tabla td.vt-check input { width: 18px; height: 18px; cursor: pointer; }
.vt-alerta-ico { color: var(--alerta); font-weight: 800; margin-left: 6px; }
.vt-detalle-cab { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.vt-nro { font-size: var(--fs-40); line-height: 1; }
.vt-nro small { font-size: var(--fs-16); font-stretch: 100%; font-weight: 600; color: var(--texto-2); display: block; margin-bottom: 6px; letter-spacing: 0; }
.vt-totales { display: grid; grid-template-columns: 1fr auto; gap: 4px 0; max-width: 340px; margin-left: auto; padding-top: 12px; }
.vt-totales dt { color: var(--texto-2); }
.vt-totales dd { margin: 0; text-align: right; padding-left: 24px; }
.vt-totales .vt-total { border-top: 1px solid var(--linea); padding-top: 8px; margin-top: 4px; font-weight: 700; }
.vt-totales dd.vt-total { font-size: var(--fs-20); font-stretch: 118%; font-weight: 800; }
.vt-pasos { list-style: none; margin: 0; padding: 0; display: grid; gap: 0; }
.vt-pasos li { display: grid; grid-template-columns: 22px 1fr; gap: 10px; padding: 6px 0; position: relative; }
.vt-pasos li::before { content: ''; width: 12px; height: 12px; border-radius: 50%; border: 2px solid var(--linea); background: var(--hoja); margin: 4px 0 0 4px; }
.vt-pasos li.hecho::before { border-color: var(--ok); background: var(--ok); }
.vt-pasos li.actual::before { border-color: var(--senal); background: var(--senal); }
.vt-pasos li + li::after { content: ''; position: absolute; left: 9px; top: -6px; height: 14px; border-left: 2px solid var(--linea); }
.vt-pasos .texto-2 { font-size: var(--fs-12); display: block; }
.vt-rank-tabla .barra-h { width: 140px; }
.vt-variacion { font-size: var(--fs-12); font-weight: 600; }
.vt-mostrador-res { list-style: none; margin: 6px 0 0; padding: 4px; background: var(--hoja); border: 1px solid var(--linea); border-radius: var(--r-panel); max-height: 320px; overflow-y: auto; }
.vt-mostrador-res:empty { display: none; }
.vt-mostrador-res li button { width: 100%; display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 12px; align-items: center; text-align: left; padding: 8px 10px; border: 0; background: none; border-radius: var(--r-control); cursor: pointer; }
.vt-mostrador-res li button:hover, .vt-mostrador-res li button:focus-visible { background: var(--fila-hover); }
.vt-mostrador-res li button:disabled { opacity: .5; cursor: not-allowed; }
.vt-mostrador-res .celda-sub { display: block; font-size: var(--fs-12); color: var(--texto-2); }
.vt-cant { width: 84px; }
.vt-resumen-lote { margin: 0; padding: 0; list-style: none; }
.vt-resumen-lote li { display: flex; justify-content: space-between; gap: 12px; padding: 7px 0; border-bottom: 1px solid var(--linea-suave); }
.vt-resumen-lote li:last-child { border-bottom: 0; }
@media (max-width: 760px) {
  .vt-tabla { table-layout: auto; }
  .vt-tabla th, .vt-tabla td { padding: 0 5px; }
  .vt-tabla td.vt-c-total { font-size: var(--fs-13); }
  .vt-tabla .vt-c-accion .btn { padding: 0 8px; }
  .vt-tabla .vt-c-pedido, .vt-tabla .vt-c-total, .vt-tabla .vt-c-accion { width: auto; }
  .vt-tabla td.celu-envolver { min-width: 96px; }
  .vt-tabla td:first-child, .vt-tabla th:first-child { padding-left: 10px; }
  .vt-filtros .campo { flex: 1 1 calc(50% - 10px); }
  .vt-filtros input[type="date"] { width: 100%; }
  .vt-filtros .vt-busca { max-width: none; flex: 1 1 100%; }
  .vt-filtros .segmentado { display: flex; width: 100%; overflow-x: auto; }
  .vt-filtros .segmentado button { flex: 1 0 auto; }
  .vt-nro { font-size: 30px; }
  .vt-totales { max-width: none; }
  .vt-rank-tabla .barra-h { width: 90px; }
  .vt-mostrador-res li button { grid-template-columns: minmax(0, 1fr) auto; gap: 2px 12px; }
  .vt-mostrador-res li button > span:first-child { grid-row: span 2; }
  .vt-mostrador-res li button > strong { grid-column: 2; grid-row: 1; text-align: right; }
  .vt-mostrador-res li button > .chico { grid-column: 2; grid-row: 2; text-align: right; }
}`;
    document.head.appendChild(st);
  }

  // ---------- ayudas ----------
  const cliente = id => App.get('clientes', id) || { fantasia: '(cliente eliminado)', razonSocial: '' };
  const nombrePrev = id => { const p = App.get('preventistas', id); return p ? p.nombre : 'Sin preventista'; };
  const disponible = (prod, dep) => App.q.stock(prod, dep).disponible;
  function variacion(actual, anterior) {
    if (!anterior) return h`<span class="vt-variacion texto-2">sin datos previos</span>`;
    const v = (actual - anterior) / Math.abs(anterior);
    return h`<span class="vt-variacion ${v >= 0 ? 'ok' : 'peligro'}">${v >= 0 ? '+' : ''}${ui.porcentaje(v, 1)}</span>`;
  }
  function imprimirComprobantes(comps) {
    if (!comps.length) return;
    ui.imprimir(comps.map(c => String(ui.comprobanteHTML(c))).join(''), { titulo: comps.length === 1 ? App.nombreTipo(comps[0].tipo) + ' ' + comps[0].nro : comps.length + ' facturas' });
  }
  function pedidosFiltrados() {
    const f = filtros;
    const t = ui.normalizar(f.texto).trim();
    const out = [];
    const ps = App.db.pedidos;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      if (f.estado && p.estado !== f.estado) continue;
      if (f.preventista && p.preventistaId !== f.preventista) continue;
      if (f.origen && p.origen !== f.origen) continue;
      if (f.desde && p.fecha < f.desde) continue;
      if (f.hasta && p.fecha > f.hasta) continue;
      if (t) { const c = cliente(p.clienteId); if (!ui.coincide(t, p.nro, c.fantasia, c.razonSocial, c.codigo)) continue; }
      out.push(p);
    }
    return out;
  }

  // ---------- facturar ----------
  async function facturarUno(pedidoId) {
    const p = App.get('pedidos', pedidoId);
    if (!(await App.confirmarLimite(pedidoId))) return null;
    const comp = App.intentar(() => App.acciones.facturarPedido(pedidoId), r => App.nombreTipo(r.tipo) + ' ' + r.nro + ' emitida: pedido facturado');
    if (comp) { seleccion.delete(pedidoId); ofrecerImpresion([comp], p); }
    return comp;
  }
  function ofrecerImpresion(comps, pedidoUnico) {
    const total = comps.reduce((s, c) => s + c.total, 0);
    const cuerpo = comps.length === 1
      ? h`<p>Se emitió la <strong>${App.nombreTipo(comps[0].tipo)} ${comps[0].nro}</strong> a ${comps[0].razonSocial} por <strong>${ui.pesos(comps[0].total)}</strong>, con CAE ${comps[0].cae}. Se generó el remito para el reparto, se descontó el stock y se registró el cargo en la cuenta corriente.</p>
         <p class="nota-discreta">En la versión productiva el CAE es otorgado por ARCA (web service de factura electrónica).</p>`
      : h`<p>Se emitieron <strong>${comps.length} facturas</strong> por ${ui.pesos(total)}. Cada una con su remito, su cargo en la cuenta corriente y su asiento contable.</p>
         <ul class="vt-resumen-lote">${comps.map(c => h`<li><span>${c.tipo} ${c.nro}<span class="celda-sub texto-2">${c.razonSocial}</span></span><strong>${ui.pesos(c.total)}</strong></li>`)}</ul>`;
    const acciones = [{ texto: 'Cerrar', tipo: 'secundario' }];
    if (comps.length === 1) acciones.push({ texto: 'Ver comprobante', tipo: 'secundario', alClic: () => { setTimeout(() => ui.ir('#/facturacion/comprobante/' + comps[0].id), 0); } });
    acciones.push({ texto: comps.length === 1 ? 'Imprimir factura' : 'Imprimir facturas', tipo: 'primario', alClic: () => { imprimirComprobantes(comps); } });
    ui.modal({ titulo: comps.length === 1 ? 'Pedido facturado' : 'Pedidos facturados', cuerpo: String(cuerpo), acciones, ancho: 560 });
  }
  async function facturarSeleccion(ids) {
    const lista = ids.map(id => App.get('pedidos', id)).filter(p => p && p.estado === 'pendiente').sort((a, b) => a.numero - b.numero);
    if (!lista.length) { ui.toast('No hay pedidos pendientes seleccionados.', 'alerta'); return; }
    const total = lista.reduce((s, p) => s + p.total, 0);
    const conAlertas = lista.filter(p => p.alertas && p.alertas.length).length;
    const ok = await ui.confirmar('Se facturarán ' + lista.length + (lista.length === 1 ? ' pedido' : ' pedidos') + ' por ' + ui.pesos(total) + '.' + (conAlertas ? ' ' + conAlertas + ' superan el límite de crédito del cliente.' : '') + ' Se emitirán las facturas con CAE y los remitos para el reparto.', { titulo: 'Facturar seleccionados', aceptar: 'Facturar seleccionados', tipo: 'senal' });
    if (!ok) return;
    const comps = [], errores = [];
    lista.forEach(p => {
      try { comps.push(App.acciones.facturarPedido(p.id)); seleccion.delete(p.id); }
      catch (e) { errores.push('Pedido ' + p.nro + ': ' + e.message); }
    });
    if (comps.length) ui.toast((comps.length === 1 ? '1 pedido facturado' : comps.length + ' pedidos facturados') + ' por ' + ui.pesos(comps.reduce((s, c) => s + c.total, 0)), 'ok');
    errores.slice(0, 3).forEach(e => ui.toast(e, 'peligro'));
    if (comps.length) ofrecerImpresion(comps);
  }

  // ---------- pantalla: lista de pedidos ----------
  function renderLista(el) {
    const hoy = App.hoy(), ini = App.f.inicioMes(hoy);
    const pend = App.q.pedidosPendientes();
    const facHoy = App.db.comprobantes.filter(c => c.fecha === hoy && c.clase === 'factura');
    const pedMes = App.db.pedidos.filter(p => p.fecha >= ini && p.fecha <= hoy && p.estado !== 'cancelado');
    const totMes = pedMes.reduce((s, p) => s + p.total, 0);

    const cab = ui.nodo(String(h`<div class="encabezado-vista">
      <div><h1 class="titulo-vista">Ventas y pedidos</h1>
      <p class="bajada">Pedidos ingresados por preventa, catálogo online y mostrador. Facturación individual o por lote.</p></div>
      <div class="acciones"><a class="btn btn-primario" href="#/ventas/mostrador">Cargar pedido de mostrador</a><a class="btn btn-secundario" href="#/preventa">Abrir preventa</a></div>
    </div>`));
    el.appendChild(cab);
    el.appendChild(ui.nodo(String(ui.franjaKpi([
      { titulo: 'Pendientes de facturación', valor: ui.num(pend.length), detalle: ui.pesos(pend.reduce((s, p) => s + p.total, 0)) + ' con IVA', tono: pend.length ? 'senal' : null },
      { titulo: 'Facturado hoy', valor: ui.pesosCorto(facHoy.reduce((s, c) => s + c.total, 0)), detalle: facHoy.length + (facHoy.length === 1 ? ' factura' : ' facturas') },
      { titulo: 'Pedidos del mes', valor: ui.num(pedMes.length), detalle: 'desde el ' + ui.fecha(ini) },
      { titulo: 'Ticket promedio del mes', valor: ui.pesosCorto(pedMes.length ? totMes / pedMes.length : 0), detalle: 'con IVA' }
    ]))));

    const cont = document.createElement('div');
    el.appendChild(cont);
    ui.pestanas(cont, [
      { id: 'pedidos', titulo: 'Pedidos', cuenta: pend.length || null, render: renderPedidos },
      { id: 'ranking', titulo: 'Ranking del mes', render: renderRanking },
      { id: 'comisiones', titulo: 'Comisiones', render: renderComisiones }
    ], { clave: 'ventas-pestanas' });
  }

  function renderPedidos(panel) {
    const pvs = App.db.preventistas;
    const ESTADOS = [['pendiente', 'Pendientes'], ['facturado', 'Facturados'], ['cancelado', 'Cancelados'], ['', 'Todos']];
    const fil = ui.nodo(String(h`<div class="filtros vt-filtros">
      <div class="segmentado" role="group" aria-label="Estado">${ESTADOS.map(([v, t]) => h`<button type="button" data-estado="${v}" aria-pressed="${filtros.estado === v}">${t}</button>`)}</div>
      <div class="vt-corte" aria-hidden="true"></div>
      <div class="campo vt-busca"><label for="vt-texto">Cliente o número</label><input id="vt-texto" type="search" placeholder="Buscar cliente o número de pedido" value="${filtros.texto}"></div>
      <div class="campo"><label for="vt-pv">Preventista</label><select id="vt-pv"><option value="">Todos</option>${ui.opciones(pvs, 'id', 'nombre', filtros.preventista)}</select></div>
      <div class="campo"><label for="vt-origen">Origen</label><select id="vt-origen"><option value="">Todos</option>${ui.opciones(Object.keys(ORIGEN).map(k => ({ id: k, t: ORIGEN[k] })), 'id', 't', filtros.origen)}</select></div>
      <div class="campo"><label for="vt-desde">Desde</label><input id="vt-desde" type="date" value="${filtros.desde}" max="${App.hoy()}"></div>
      <div class="campo"><label for="vt-hasta">Hasta</label><input id="vt-hasta" type="date" value="${filtros.hasta}" max="${App.hoy()}"></div>
      ${filtros.preventista || filtros.origen || filtros.desde || filtros.hasta || filtros.texto ? h`<button type="button" class="btn btn-fantasma" id="vt-limpiar" style="align-self:flex-end">Limpiar filtros</button>` : ''}
    </div>`));
    panel.appendChild(fil);
    const barra = document.createElement('div');
    barra.className = 'vt-barra-lote';
    panel.appendChild(barra);

    const columnas = [
      { titulo: '', clase: 'vt-check ocultar-celu', valor: p => {
        if (p.estado !== 'pendiente') return '';
        const i = document.createElement('input');
        i.type = 'checkbox'; i.checked = seleccion.has(p.id); i.setAttribute('aria-label', 'Seleccionar el pedido ' + p.nro);
        i.addEventListener('change', () => { if (i.checked) seleccion.add(p.id); else seleccion.delete(p.id); dibujarBarra(); });
        return i;
      } },
      { titulo: 'Pedido', clase: 'vt-c-pedido ocultar-celu', campo: 'numero', valor: p => h`<span class="celda-principal">${p.nro}</span>${p.alertas && p.alertas.length ? h`<span class="vt-alerta-ico" title="${p.alertas.join(' ')}" aria-label="Excede el límite de crédito">${ui.seguro('<svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-2px"><path d="M10 3l8 14H2z"/><path d="M10 8.5v3.5"/><path d="M10 14.6v.1"/></svg>')}</span>` : ''}<span class="celda-sub solo-celu">${{ pendiente: 'Pendiente', facturado: 'Facturado', cancelado: 'Cancelado' }[p.estado] || p.estado}</span>` },
      { titulo: 'Fecha', clase: 'vt-c-fecha ocultar-celu', campo: 'fecha', valor: p => ui.fecha(p.fecha) },
      { titulo: 'Cliente', clase: 'celu-envolver', ordenar: p => cliente(p.clienteId).fantasia, valor: p => { const c = cliente(p.clienteId); return h`<span class="celda-principal">${c.fantasia}</span><span class="celda-sub">${c.localidad || ''}, ${nombrePrev(p.preventistaId)}, ${p.items.length} ${p.items.length === 1 ? 'ítem' : 'ítems'}</span><span class="celda-sub solo-celu">Pedido ${p.nro}${p.alertas && p.alertas.length ? ', supera el límite' : ''}, ${{ pendiente: 'pendiente', facturado: 'facturado', cancelado: 'cancelado' }[p.estado] || p.estado}</span>`; } },
      { titulo: 'Origen', clase: 'vt-c-origen ocultar-celu', campo: 'origen', valor: p => ui.chip(ORIGEN[p.origen] || p.origen, ORIGEN_TONO[p.origen]) },
      { titulo: 'Total', clase: 'vt-c-total', alinear: 'der', campo: 'total', valor: p => ui.pesos(p.total) },
      { titulo: 'Estado', clase: 'vt-c-estado ocultar-celu', campo: 'estado', valor: p => ui.estado(p.estado) },
      { titulo: '', clase: 'vt-c-accion', alinear: 'der', valor: p => {
        if (p.estado !== 'pendiente') return '';
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'btn btn-chico btn-secundario'; b.textContent = 'Facturar';
        b.setAttribute('aria-label', 'Facturar el pedido ' + p.nro);
        b.addEventListener('click', () => facturarUno(p.id));
        return b;
      } }
    ];
    let filas = pedidosFiltrados();
    const tabla = ui.tabla({
      columnas, filas, clase: 'vt-tabla', limite: 60,
      alClic: p => ui.ir('#/ventas/pedido/' + p.id),
      filaClase: p => p.estado === 'cancelado' ? 'fila-apagada' : (p.alertas && p.alertas.length && p.estado === 'pendiente' ? 'fila-alerta' : ''),
      vacio: filtros.estado === 'pendiente' && !filtros.texto ? 'No hay pedidos pendientes de facturación. Los pedidos de preventa y del catálogo se listan aquí al ingresar.' : 'No hay pedidos para los filtros aplicados. Se pueden modificar las fechas o limpiar los filtros.'
    });
    panel.appendChild(tabla);

    function dibujarBarra() {
      const visibles = filas.filter(p => p.estado === 'pendiente');
      [...seleccion].forEach(id => { const p = App.get('pedidos', id); if (!p || p.estado !== 'pendiente') seleccion.delete(id); });
      const sel = [...seleccion].map(id => App.get('pedidos', id));
      const totalSel = sel.reduce((s, p) => s + p.total, 0);
      const totalFil = filas.reduce((s, p) => s + p.total, 0);
      barra.innerHTML = String(h`<span class="texto-2">${ui.num(filas.length)} ${filas.length === 1 ? 'pedido' : 'pedidos'} por ${ui.pesos(totalFil)}${sel.length ? h`. Seleccionados: <strong>${sel.length}</strong> por <strong>${ui.pesos(totalSel)}</strong>.` : ''}</span>
        <span class="acciones">
          ${visibles.length ? h`<button type="button" class="btn btn-secundario" id="vt-todos">${visibles.every(p => seleccion.has(p.id)) ? 'Quitar selección' : 'Seleccionar los ' + visibles.length + ' pendientes'}</button>` : ''}
          ${visibles.length && !sel.length ? h`<span class="vt-ayuda" id="vt-lote-ayuda">Seleccionar al menos un pedido</span>` : ''}
          ${visibles.length || sel.length ? h`<button type="button" class="btn btn-senal" id="vt-lote" ${sel.length ? '' : 'disabled aria-describedby="vt-lote-ayuda"'}>Facturar seleccionados${sel.length ? ' (' + sel.length + ')' : ''}</button>` : ''}
        </span>`);
      const bt = barra.querySelector('#vt-todos');
      if (bt) bt.addEventListener('click', () => {
        const todos = visibles.every(p => seleccion.has(p.id));
        visibles.forEach(p => { if (todos) seleccion.delete(p.id); else seleccion.add(p.id); });
        tabla.actualizar(filas); dibujarBarra();
      });
      const bl = barra.querySelector('#vt-lote');
      if (bl) bl.addEventListener('click', () => facturarSeleccion([...seleccion]));
    }
    dibujarBarra();

    const refiltrar = () => { filas = pedidosFiltrados(); tabla.actualizar(filas); dibujarBarra(); };
    fil.querySelectorAll('[data-estado]').forEach(b => b.addEventListener('click', () => {
      filtros.estado = b.dataset.estado;
      fil.querySelectorAll('[data-estado]').forEach(x => x.setAttribute('aria-pressed', x === b));
      refiltrar();
    }));
    const enlazar = (sel, campo) => fil.querySelector(sel).addEventListener('change', e => { filtros[campo] = e.target.value; App.renderizar(); });
    enlazar('#vt-pv', 'preventista'); enlazar('#vt-origen', 'origen'); enlazar('#vt-desde', 'desde'); enlazar('#vt-hasta', 'hasta');
    ui.buscador(fil.querySelector('#vt-texto'), (t, crudo) => { filtros.texto = crudo || ''; refiltrar(); }, 150);
    const lim = fil.querySelector('#vt-limpiar');
    if (lim) lim.addEventListener('click', () => { Object.assign(filtros, { preventista: '', origen: '', desde: '', hasta: '', texto: '' }); App.renderizar(); });
  }

  // ---------- pestaña: ranking ----------
  function renderRanking(panel) {
    const hoy = App.hoy();
    let desde, hasta, antDesde, antHasta, titulo;
    if (periodoRanking === 'actual') {
      desde = App.f.inicioMes(hoy); hasta = hoy;
      antDesde = App.f.inicioMes(App.f.sumar(desde, -1));
      antHasta = App.f.sumar(antDesde, App.f.diferencia(desde, hasta));
      if (antHasta > App.f.finMes(antDesde)) antHasta = App.f.finMes(antDesde);
      titulo = 'Del 1 al ' + Number(hoy.slice(8)) + ' de ' + App.f.nombreMes(hoy).split(' ')[0] + ', comparado con los mismos días de ' + App.f.nombreMes(antDesde).split(' ')[0] + '.';
    } else {
      desde = App.f.inicioMes(App.f.sumar(App.f.inicioMes(hoy), -1)); hasta = App.f.finMes(desde);
      antDesde = App.f.inicioMes(App.f.sumar(desde, -1)); antHasta = App.f.finMes(antDesde);
      titulo = 'Todo ' + App.f.nombreMes(desde) + ', comparado con ' + App.f.nombreMes(antDesde) + '.';
    }
    const seg = ui.nodo(String(h`<div class="filtros"><div class="segmentado" role="group" aria-label="Período">
      <button type="button" data-per="actual" aria-pressed="${periodoRanking === 'actual'}">${App.f.nombreMes(hoy).split(' ')[0].replace(/^./, x => x.toUpperCase())} hasta hoy</button>
      <button type="button" data-per="anterior" aria-pressed="${periodoRanking === 'anterior'}">${App.f.nombreMes(App.f.sumar(App.f.inicioMes(hoy), -1)).split(' ')[0].replace(/^./, x => x.toUpperCase())} completo</button>
    </div><span class="nota-discreta">${titulo} Ventas netas de IVA, deducidas las notas de crédito.</span></div>`));
    panel.appendChild(seg);
    seg.querySelectorAll('[data-per]').forEach(b => b.addEventListener('click', () => { periodoRanking = b.dataset.per; panel.innerHTML = ''; renderRanking(panel); }));

    // preventistas
    const porPv = App.q.ventasPorPreventista(desde, hasta);
    const antPv = {}; App.q.ventasPorPreventista(antDesde, antHasta).forEach(x => { antPv[x.preventistaId] = x.neto; });
    const pedidosPv = {}, clientesPv = {};
    App.db.comprobantes.forEach(c => {
      if (c.clase !== 'factura' || c.fecha < desde || c.fecha > hasta) return;
      const p = c.pedidoId && App.get('pedidos', c.pedidoId); const k = p ? p.preventistaId : '—';
      pedidosPv[k] = (pedidosPv[k] || 0) + 1; (clientesPv[k] = clientesPv[k] || new Set()).add(c.clienteId);
    });
    // efectividad de visita: visitas con pedido sobre visitas totales (con pedido + «no compró hoy»)
    const visitasPv = {};
    App.db.pedidos.forEach(p => { if (p.origen !== 'preventa' || p.fecha < desde || p.fecha > hasta) return; const v = visitasPv[p.preventistaId] = visitasPv[p.preventistaId] || { con: 0, sin: 0 }; v.con++; });
    App.db.visitas.forEach(x => { if (x.fecha < desde || x.fecha > hasta) return; const v = visitasPv[x.preventistaId] = visitasPv[x.preventistaId] || { con: 0, sin: 0 }; v.sin++; });
    const efect = id => { const v = visitasPv[id]; return v && v.con + v.sin ? v.con / (v.con + v.sin) : null; };
    const totalPv = porPv.reduce((s, x) => s + x.neto, 0);
    const maxPv = Math.max(1, ...porPv.map(x => x.neto));
    const s1 = document.createElement('div');
    s1.className = 'seccion'; s1.style.marginTop = '8px';
    s1.innerHTML = String(h`<h2 class="seccion-titulo">Por preventista <span class="texto-2">${ui.pesos(totalPv)} en total</span></h2>`);
    s1.appendChild(ui.tabla({
      clase: 'vt-rank-tabla',
      columnas: [
        { titulo: 'Puesto', alinear: 'centro', valor: x => h`<span class="rotulo">${porPv.indexOf(x) + 1}</span>` },
        { titulo: 'Preventista', valor: x => h`<span class="celda-principal">${x.preventista ? x.preventista.nombre : 'Sin preventista'}</span><span class="celda-sub">${x.preventista ? x.preventista.zona : 'Mostrador y otros'}</span>` },
        { titulo: 'Ventas netas', alinear: 'der', campo: 'neto', valor: x => ui.pesos(x.neto) },
        { titulo: 'Participación', valor: x => h`<div class="barra-h" title="${ui.porcentaje(x.neto / (totalPv || 1))}"><span style="width:${(x.neto / maxPv * 100).toFixed(1)}%"></span></div>` },
        { titulo: '%', alinear: 'der', valor: x => ui.porcentaje(x.neto / (totalPv || 1)) },
        { titulo: 'Facturas', alinear: 'der', ordenar: x => pedidosPv[x.preventistaId] || 0, valor: x => ui.num(pedidosPv[x.preventistaId] || 0) },
        { titulo: 'Clientes', alinear: 'der', ordenar: x => (clientesPv[x.preventistaId] || new Set()).size, valor: x => ui.num((clientesPv[x.preventistaId] || new Set()).size) },
        { titulo: 'Ticket promedio', alinear: 'der', valor: x => ui.pesos(pedidosPv[x.preventistaId] ? x.neto / pedidosPv[x.preventistaId] : 0) },
        { titulo: 'Efectividad de visita', alinear: 'der', ordenar: x => efect(x.preventistaId) || 0, valor: x => { const e = efect(x.preventistaId), v = visitasPv[x.preventistaId]; return e == null ? '' : h`${ui.porcentaje(e, 0)}<span class="celda-sub">${v.con} de ${v.con + v.sin} visitas</span>`; } },
        { titulo: 'Contra el período anterior', alinear: 'der', valor: x => variacion(x.neto, antPv[x.preventistaId]) }
      ],
      filas: porPv, vacio: 'No se registran ventas en este período.'
    }));
    panel.appendChild(s1);

    // clientes
    const porCli = App.q.ventasPorCliente(desde, hasta).filter(x => x.neto > 0);
    const antCli = {}; App.q.ventasPorCliente(antDesde, antHasta).forEach(x => { antCli[x.clienteId] = x.neto; });
    const totalCli = porCli.reduce((s, x) => s + x.neto, 0);
    const maxCli = Math.max(1, ...porCli.map(x => x.neto));
    const s2 = document.createElement('div');
    s2.className = 'seccion';
    s2.innerHTML = String(h`<h2 class="seccion-titulo">Por cliente <span class="texto-2">los 15 principales, de ${porCli.length}</span></h2>`);
    s2.appendChild(ui.tabla({
      clase: 'vt-rank-tabla',
      columnas: [
        { titulo: 'Puesto', alinear: 'centro', valor: x => h`<span class="rotulo">${porCli.indexOf(x) + 1}</span>` },
        { titulo: 'Cliente', valor: x => h`<span class="celda-principal">${x.cliente.fantasia}</span><span class="celda-sub">${x.cliente.tipo}, ${x.cliente.localidad}</span>` },
        { titulo: 'Preventista', valor: x => nombrePrev(x.cliente.preventistaId) },
        { titulo: 'Ventas netas', alinear: 'der', campo: 'neto', valor: x => ui.pesos(x.neto) },
        { titulo: 'Participación', valor: x => h`<div class="barra-h"><span style="width:${(x.neto / maxCli * 100).toFixed(1)}%"></span></div>` },
        { titulo: '%', alinear: 'der', valor: x => ui.porcentaje(x.neto / (totalCli || 1)) },
        { titulo: 'Contra el período anterior', alinear: 'der', valor: x => variacion(x.neto, antCli[x.clienteId]) }
      ],
      filas: porCli.slice(0, 15), alClic: x => ui.ir('#/clientes/' + x.clienteId), vacio: 'No se registran ventas en este período.'
    }));
    panel.appendChild(s2);
  }

  // ---------- pestaña: comisiones de preventistas ----------
  const com = { periodo: 'actual', base: 'facturado', pcts: {} };
  function periodoComisiones() {
    const hoy = App.hoy(), F = App.f;
    if (com.periodo === 'anterior') { const d = F.inicioMes(F.sumar(F.inicioMes(hoy), -1)); return { desde: d, hasta: F.finMes(d), nombre: F.nombreMes(d) }; }
    return { desde: F.inicioMes(hoy), hasta: hoy, nombre: F.nombreMes(hoy) + ' hasta hoy' };
  }
  function imprimirLiquidacion(liq) {
    const filas = liq.filas.map(x => { const pv = App.get('preventistas', x.preventistaId); return h`<tr><td>${pv ? pv.nombre : x.preventistaId}</td><td class="al-der">${ui.num(x.comprobantes)}</td><td class="al-der">${ui.pesos(x.base)}</td><td class="al-der">${ui.num(x.pct, 2)} %</td><td class="al-der">${ui.pesos(x.importe)}</td></tr>`; });
    ui.imprimir(String(h`<article class="comprobante"><header class="comp-cabecera"><div class="comp-emisor"><div class="comp-negocio">${App.config.razonSocial}</div><div>${App.config.domicilio}</div></div>
      <div class="comp-datos"><div class="comp-titulo">Liquidación de comisiones</div><div>N.º <strong>${liq.nro}</strong></div><div>Fecha ${ui.fecha(liq.fecha)}</div><div>Período del ${ui.fecha(liq.desde)} al ${ui.fecha(liq.hasta)}</div><div>Base de cálculo: importe ${liq.base} sin IVA</div></div></header>
      <table class="comp-items"><thead><tr><th>Preventista</th><th class="al-der">Comprobantes</th><th class="al-der">Base</th><th class="al-der">Comisión</th><th class="al-der">Importe</th></tr></thead><tbody>${filas}</tbody></table>
      <div class="comp-totales"><div class="comp-total"><span>Total a pagar</span><strong>${ui.pesos(liq.total)}</strong></div></div>
      <div class="comp-firma"><div>Firma del preventista</div><div>Firma de la administración</div></div></article>`), { titulo: 'Liquidación de comisiones ' + liq.nro });
  }
  function renderComisiones(panel) {
    const per = periodoComisiones();
    const filas = App.q.comisiones({ desde: per.desde, hasta: per.hasta, base: com.base, porcentajes: com.pcts });
    const total = filas.reduce((s, x) => s + x.importe, 0);
    const mesAnt = App.f.nombreMes(App.f.sumar(App.f.inicioMes(App.hoy()), -1)).split(' ')[0];
    const cab = ui.nodo(String(h`<div class="filtros">
      <div class="segmentado" role="group" aria-label="Período"><button type="button" data-cper="actual" aria-pressed="${com.periodo === 'actual'}">Mes en curso</button><button type="button" data-cper="anterior" aria-pressed="${com.periodo === 'anterior'}">${mesAnt.replace(/^./, x => x.toUpperCase())} completo</button></div>
      <div class="segmentado" role="group" aria-label="Base de cálculo"><button type="button" data-cbase="facturado" aria-pressed="${com.base === 'facturado'}">Sobre lo facturado</button><button type="button" data-cbase="cobrado" aria-pressed="${com.base === 'cobrado'}">Sobre lo cobrado</button></div>
      <span class="nota-discreta">Del ${ui.fecha(per.desde)} al ${ui.fecha(per.hasta)}, sin IVA. Los importes ya liquidados no se computan nuevamente.</span></div>`));
    panel.appendChild(cab);
    cab.querySelectorAll('[data-cper]').forEach(b => b.addEventListener('click', () => { com.periodo = b.dataset.cper; panel.innerHTML = ''; renderComisiones(panel); }));
    cab.querySelectorAll('[data-cbase]').forEach(b => b.addEventListener('click', () => { com.base = b.dataset.cbase; panel.innerHTML = ''; renderComisiones(panel); }));
    const verDetalle = x => ui.modal({ titulo: 'Comisión de ' + x.preventista.nombre, ancho: 640, cuerpo: ui.tabla({ limite: 40,
      columnas: [{ titulo: 'Fecha', valor: d => ui.fecha(d.fecha) }, { titulo: 'Comprobante', valor: d => h`<span class="celda-principal">${d.texto}</span><span class="celda-sub">${cliente(d.clienteId).fantasia}</span>` },
        { titulo: 'Base', alinear: 'der', valor: d => ui.pesos(d.base) }, { titulo: 'Comisión', alinear: 'der', valor: d => ui.pesos(d.base * x.pct / 100) }],
      filas: x.detalle.slice().sort((a, b) => a.fecha < b.fecha ? 1 : -1), vacio: 'No hay comprobantes sin liquidar en el período.' }) });
    panel.appendChild(ui.tabla({
      columnas: [
        { titulo: 'Preventista', valor: x => h`<span class="celda-principal">${x.preventista.nombre}</span><span class="celda-sub">${x.preventista.zona}</span>` },
        { titulo: 'Comprobantes', alinear: 'der', clase: 'ocultar-celu', valor: x => ui.num(x.detalle.length) },
        { titulo: 'Base', alinear: 'der', campo: 'base', valor: x => ui.pesos(x.base) },
        { titulo: '% de comisión', alinear: 'der', valor: x => {
          const i = document.createElement('input'); i.type = 'number'; i.min = '0'; i.max = '20'; i.step = '0.25'; i.value = x.pct; i.className = 'vt-com-pct';
          i.setAttribute('aria-label', 'Porcentaje de comisión de ' + x.preventista.nombre);
          i.addEventListener('change', () => { com.pcts[x.preventistaId] = Math.max(0, Math.min(20, Number(i.value) || 0)); panel.innerHTML = ''; renderComisiones(panel); });
          return i;
        } },
        { titulo: 'Comisión', alinear: 'der', campo: 'importe', valor: x => h`<strong>${ui.pesos(x.importe)}</strong>` },
        { titulo: '', alinear: 'der', valor: x => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-fantasma btn-chico'; b.textContent = 'Ver detalle'; b.addEventListener('click', () => verDetalle(x)); return b; } }
      ],
      filas, pie: ['Total', '', ui.pesos(filas.reduce((s, x) => s + x.base, 0)), '', ui.pesos(total), '']
    }));
    const pie = ui.nodo(String(h`<div class="vt-barra-lote" style="margin-top:12px"><span class="nota-discreta">La liquidación genera el asiento contra Comisiones de preventistas (5.2.02) con pago por banco y cancela lo devengado del mes.</span>
      <span class="acciones">${total > 0 ? '' : h`<span class="vt-ayuda">No hay comisiones pendientes en el período</span>`}<button type="button" class="btn btn-primario" id="vt-liquidar" ${total > 0 ? '' : 'disabled'}>Liquidar comisiones</button></span></div>`));
    panel.appendChild(pie);
    pie.querySelector('#vt-liquidar').addEventListener('click', async () => {
      const ok = await ui.confirmar('Se liquidarán ' + ui.pesos(total) + ' de comisiones del ' + ui.fecha(per.desde) + ' al ' + ui.fecha(per.hasta) + ', sobre lo ' + com.base + '. El pago se realiza por banco y se registra el asiento.', { titulo: 'Liquidar comisiones', aceptar: 'Liquidar comisiones' });
      if (!ok) return;
      const liq = App.intentar(() => App.acciones.liquidarComisiones({ desde: per.desde, hasta: per.hasta, base: com.base, porcentajes: com.pcts }), r => 'Comisiones liquidadas: ' + ui.pesos(r.total));
      if (liq) imprimirLiquidacion(liq);
    });
    const liqs = App.db.liquidacionesComision.slice().reverse();
    const sec = document.createElement('div');
    sec.className = 'seccion vt-liq-hist';
    sec.innerHTML = String(h`<h2 class="seccion-titulo">Liquidaciones emitidas</h2>`);
    sec.appendChild(ui.tabla({ limite: 8,
      columnas: [
        { titulo: 'N.º', valor: l => l.nro }, { titulo: 'Fecha', valor: l => ui.fecha(l.fecha) },
        { titulo: 'Período', clase: 'ocultar-celu', valor: l => ui.fecha(l.desde) + ' al ' + ui.fecha(l.hasta) }, { titulo: 'Base', clase: 'ocultar-celu', valor: l => 'Importe ' + l.base },
        { titulo: 'Total', alinear: 'der', valor: l => ui.pesos(l.total) },
        { titulo: '', alinear: 'der', valor: l => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-fantasma btn-chico'; b.textContent = 'Imprimir'; b.addEventListener('click', () => imprimirLiquidacion(l)); return b; } }
      ], filas: liqs, vacio: 'No se registran liquidaciones de comisiones.' }));
    panel.appendChild(sec);
  }

  // ---------- pantalla: detalle del pedido ----------
  function renderDetalle(el, id) {
    const p = App.get('pedidos', id);
    if (!p) {
      el.innerHTML = String(h`<div class="vacio vacio-grande"><h1 class="titulo-vista">Pedido no encontrado</h1><p>El enlace puede ser incorrecto.</p><a class="btn btn-primario" href="#/ventas">Volver a pedidos</a></div>`);
      return;
    }
    const c = cliente(p.clienteId);
    const dep = App.get('depositos', p.depositoId);
    const lista = App.get('listasPrecio', p.listaId);
    const comp = p.comprobanteId && App.get('comprobantes', p.comprobanteId);
    const rem = p.remitoId && App.get('remitos', p.remitoId);
    const hr = rem && rem.hojaRutaId && App.get('hojasRuta', rem.hojaRutaId);
    const pend = p.estado === 'pendiente';

    el.appendChild(ui.nodo(String(h`<div>
      <div class="migas"><a href="#/ventas">Ventas y pedidos</a> / Pedido ${p.nro}</div>
      <div class="encabezado-vista vt-detalle-cab">
        <div>
          <h1 class="titulo-vista vt-nro"><small>${ORIGEN[p.origen] || p.origen}, ${ui.fechaLarga(p.fecha)}</small>Pedido ${p.nro}</h1>
          <div class="fila" style="margin-top:10px">${ui.estado(p.estado)}${comp ? h`<a class="btn btn-fantasma btn-chico" href="#/facturacion/comprobante/${comp.id}">${App.nombreTipo(comp.tipo)} ${comp.nro}</a>` : ''}</div>
        </div>
        <div class="acciones" id="vt-acciones"></div>
      </div>
    </div>`)));
    const acc = el.querySelector('#vt-acciones');
    const boton = (texto, tipo, fn) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-' + tipo; b.textContent = texto; b.addEventListener('click', fn); acc.appendChild(b); return b; };
    if (pend) {
      boton('Cancelar pedido', 'peligro', () => cancelar(p));
      boton('Modificar pedido', 'secundario', () => modificar(p));
      boton('Facturar pedido', 'primario', () => facturarUno(p.id));
    } else if (comp) {
      if (rem) boton('Imprimir remito', 'secundario', () => ui.imprimir(String(ui.comprobanteHTML(rem, 'R')), { titulo: 'Remito ' + rem.nro }));
      boton('Imprimir factura', 'primario', () => imprimirComprobantes([comp]));
    }

    if (p.alertas && p.alertas.length && pend) el.appendChild(ui.nodo(String(h`<div class="aviso aviso-alerta" style="margin-bottom:16px"><div><strong>Requiere revisión antes de facturar.</strong> ${p.alertas.join(' ')} Saldo actual de la cuenta: ${ui.pesos(App.q.saldoCliente(c.id))}.</div></div>`)));
    if (p.estado === 'cancelado') el.appendChild(ui.nodo(String(h`<div class="aviso" style="margin-bottom:16px"><div>Pedido cancelado${p.motivoCancelacion ? ': ' + p.motivoCancelacion : ''}. La mercadería reservada quedó nuevamente disponible.</div></div>`)));

    const grilla = document.createElement('div');
    grilla.className = 'grilla-lado';
    el.appendChild(grilla);
    const izq = document.createElement('div');
    grilla.appendChild(izq);

    izq.appendChild(ui.tabla({
      columnas: [
        { titulo: 'Código', valor: it => App.get('productos', it.productoId).codigo },
        { titulo: 'Producto', valor: it => { const pr = App.get('productos', it.productoId); return h`<span class="celda-principal">${pr.descripcion}</span><span class="celda-sub">${pr.marca}, ${pr.unidad.toLowerCase()}</span>`; } },
        { titulo: 'Cantidad', alinear: 'der', campo: 'cantidad', valor: it => ui.num(it.cantidad) },
        { titulo: 'Precio unitario', alinear: 'der', campo: 'precio', valor: it => ui.pesos(it.precio) },
        { titulo: 'Bonif.', alinear: 'der', valor: it => it.bonif ? ui.num(it.bonif, 1) + ' %' : '' },
        { titulo: 'IVA', alinear: 'der', clase: 'ocultar-celu', valor: it => ui.num(it.iva, it.iva % 1 ? 1 : 0) + ' %' },
        { titulo: 'Subtotal', alinear: 'der', ordenar: it => it.cantidad * App.precioNeto(it), valor: it => ui.pesos(App.r2(it.cantidad * App.precioNeto(it))) }
      ].concat(pend ? [{ titulo: 'Stock sin reservar', alinear: 'der', valor: it => ui.num(disponible(it.productoId, p.depositoId)) }] : []),
      filas: p.items
    }));
    izq.appendChild(ui.nodo(String(h`<dl class="vt-totales">
      <dt>Neto gravado</dt><dd>${ui.pesos(p.neto)}</dd>
      <dt>IVA</dt><dd>${ui.pesos(p.iva)}</dd>
      <dt class="vt-total">Total</dt><dd class="vt-total">${ui.pesos(p.total)}</dd>
    </dl>`)));
    if (p.obs) izq.appendChild(ui.nodo(String(h`<div class="panel" style="margin-top:16px"><div class="panel-titulo">Observaciones</div><p style="margin:0">${p.obs}</p></div>`)));

    const der = document.createElement('div');
    der.innerHTML = String(h`<div class="panel">
        <div class="panel-titulo">Cliente</div>
        <p style="margin:0 0 10px"><a href="#/clientes/${c.id}" class="celda-principal">${c.fantasia}</a><br><span class="texto-2">${c.razonSocial}, ${IVA_NOMBRE[c.condicionIVA] || c.condicionIVA}</span></p>
        <dl class="datos">
          ${c.cuit ? h`<dt>CUIT</dt><dd>${c.cuit}</dd>` : ''}
          <dt>Dirección</dt><dd>${c.direccion || ''}, ${c.localidad || ''}</dd>
          <dt>Saldo</dt><dd>${ui.pesos(App.q.saldoCliente(c.id))}</dd>
          <dt>Límite</dt><dd>${ui.pesos(c.limiteCredito)}</dd>
          <dt>Lista</dt><dd>${lista ? lista.nombre : p.listaId}</dd>
          <dt>Preventista</dt><dd>${nombrePrev(p.preventistaId)}</dd>
          <dt>Depósito</dt><dd>${dep ? dep.nombre : p.depositoId}</dd>
        </dl>
      </div>
      <div class="panel">
        <div class="panel-titulo">Recorrido</div>
        <ol class="vt-pasos">
          <li class="hecho"><span>Pedido cargado<span class="texto-2">${ui.fecha(p.fecha)}, ${ORIGEN[p.origen] || p.origen}</span></span></li>
          <li class="${comp ? 'hecho' : (pend ? 'actual' : '')}"><span>${comp ? 'Facturado' : (p.estado === 'cancelado' ? 'Cancelado, sin facturación' : 'Pendiente de facturación')}<span class="texto-2">${comp ? comp.tipo + ' ' + comp.nro + ', ' + ui.fecha(comp.fecha) : ''}</span></span></li>
          <li class="${rem && rem.estado !== 'pendiente' ? 'hecho' : (rem ? 'actual' : '')}"><span>${rem ? (rem.estado === 'pendiente' ? 'Remito pendiente de hoja de ruta' : 'En hoja de ruta') : 'Remito y reparto'}<span class="texto-2">${rem ? 'Remito ' + rem.nro + (hr ? ', hoja ' + hr.nro : '') : ''}</span></span></li>
          <li class="${rem && ['entregado', 'parcial', 'rechazado'].includes(rem.estado) ? 'hecho' : (rem && rem.estado === 'en_ruta' ? 'actual' : '')}"><span>${rem && rem.estado === 'entregado' ? 'Entregado' : rem && rem.estado === 'parcial' ? 'Entrega parcial' : rem && rem.estado === 'rechazado' ? 'Rechazado en la entrega' : 'Entrega'}<span class="texto-2">${rem && rem.fechaEntrega ? ui.fecha(rem.fechaEntrega) : ''}</span></span></li>
          <li class="${comp && App.q.saldoComprobante(comp) <= 0.01 ? 'hecho' : ''}"><span>${comp && App.q.saldoComprobante(comp) <= 0.01 ? 'Cobrado' : 'Cobranza'}<span class="texto-2">${comp ? (App.q.saldoComprobante(comp) > 0.01 ? 'Saldo pendiente ' + ui.pesos(App.q.saldoComprobante(comp)) + ', vence ' + ui.fecha(comp.vence) : 'Sin saldo') : ''}</span></span></li>
        </ol>
      </div>`);
    grilla.appendChild(der);
  }

  function modificar(p) {
    const form = document.createElement('div');
    const filas = p.items.map(it => ({ productoId: it.productoId, cantidad: it.cantidad, bonif: it.bonif || 0 }));
    form.innerHTML = String(h`<p class="texto-2" style="margin-top:0">Se pueden modificar las cantidades y la bonificación. Con cantidad 0 el producto se quita del pedido. Los precios se mantienen según la toma del pedido.</p>
      <div class="tabla-envoltura"><table class="tabla"><thead><tr><th>Producto</th><th class="al-der">Disponible</th><th class="al-der">Cantidad</th><th class="al-der">% bonif.</th></tr></thead><tbody>
      ${filas.map(f => { const pr = App.get('productos', f.productoId); return h`<tr><td class="envolver">${pr.descripcion}</td><td class="al-der">${ui.num(disponible(f.productoId, p.depositoId) + f.cantidad)}</td><td class="al-der"><input class="vt-cant" type="number" min="0" step="1" value="${f.cantidad}" data-prod="${f.productoId}" aria-label="Cantidad de ${pr.descripcion}"></td><td class="al-der"><input class="vt-bonif" type="number" min="0" max="99" step="0.5" value="${f.bonif}" data-bonif="${f.productoId}" aria-label="Bonificación de ${pr.descripcion}"></td></tr>`; })}
      </tbody></table></div>
      <div class="campo" style="margin-top:14px"><label for="vt-mod-obs">Observaciones</label><textarea id="vt-mod-obs" rows="2">${p.obs || ''}</textarea></div>`);
    ui.modal({ titulo: 'Modificar pedido ' + p.nro, cuerpo: form, ancho: 620, acciones: [
      { texto: 'Volver', tipo: 'secundario' },
      { texto: 'Guardar cambios', tipo: 'primario', alClic: ({ cuerpo }) => {
        const items = [...cuerpo.querySelectorAll('[data-prod]')].map(i => ({ productoId: i.dataset.prod, cantidad: Math.floor(Number(i.value) || 0), bonif: Number(cuerpo.querySelector('[data-bonif="' + i.dataset.prod + '"]').value) || 0 }));
        App.acciones.modificarPedido(p.id, { items, obs: cuerpo.querySelector('#vt-mod-obs').value.trim() });
        ui.toast('Pedido ' + p.nro + ' modificado', 'ok');
      } }
    ] });
  }

  function cancelar(p) {
    const cuerpo = String(h`<p style="margin-top:0">El pedido ${p.nro} de ${cliente(p.clienteId).fantasia} no se facturará y la mercadería reservada quedará nuevamente disponible.</p>
      <div class="campo"><label for="vt-motivo">Motivo</label><select id="vt-motivo">
        <option>Baja solicitada por el cliente</option><option>Pedido duplicado</option><option>Falta de stock</option><option>Problema de crédito</option><option>Otro</option></select></div>`);
    ui.modal({ titulo: 'Cancelar pedido', cuerpo, ancho: 480, acciones: [
      { texto: 'Volver', tipo: 'secundario' },
      { texto: 'Cancelar pedido', tipo: 'peligro', alClic: ({ cuerpo: c }) => {
        App.acciones.cancelarPedido(p.id, c.querySelector('#vt-motivo').value);
        seleccion.delete(p.id);
        ui.toast('Pedido ' + p.nro + ' cancelado', 'ok');
      } }
    ] });
  }

  // ---------- pantalla: pedido de mostrador ----------
  function renderMostrador(el) {
    const m = mostrador;
    if (!m.clienteId || !App.get('clientes', m.clienteId)) {
      const cf = App.db.clientes.find(c => c.tipo === 'Mostrador') || App.db.clientes[0];
      m.clienteId = cf.id; m.depositoId = cf.depositoId;
    }
    if (!m.depositoId) m.depositoId = App.get('clientes', m.clienteId).depositoId;
    const c = App.get('clientes', m.clienteId);
    const clientes = App.db.clientes.filter(x => x.activo !== false).slice().sort((a, b) => (a.tipo === 'Mostrador' ? -1 : b.tipo === 'Mostrador' ? 1 : a.fantasia.localeCompare(b.fantasia)));

    el.appendChild(ui.nodo(String(h`<div>
      <div class="migas"><a href="#/ventas">Ventas y pedidos</a> / Mostrador</div>
      <div class="encabezado-vista"><div><h1 class="titulo-vista">Pedido de mostrador</h1>
        <p class="bajada">Venta con retiro en depósito. Puede facturarse en el momento o quedar pendiente para su preparación.</p></div></div>
    </div>`)));
    const grilla = document.createElement('div');
    grilla.className = 'grilla-lado';
    el.appendChild(grilla);
    const izq = document.createElement('div');
    const der = document.createElement('div');
    grilla.appendChild(izq); grilla.appendChild(der);

    izq.innerHTML = String(h`<div class="panel">
      <div class="form-grilla">
        <div class="campo"><label for="vt-m-cli">Cliente</label><select id="vt-m-cli">${ui.opciones(clientes, 'id', x => x.fantasia + (x.tipo === 'Mostrador' ? '' : ' (' + x.codigo + ')'), m.clienteId)}</select>
          <span class="campo-ayuda">${IVA_NOMBRE[c.condicionIVA] || c.condicionIVA}: corresponde factura ${c.condicionIVA === 'RI' ? 'A' : 'B'}. Lista ${(App.get('listasPrecio', c.listaId) || {}).nombre || c.listaId}.</span></div>
        <div class="campo"><label for="vt-m-dep">Depósito de retiro</label><select id="vt-m-dep">${ui.opciones(App.db.depositos.filter(d => d.activo !== false), 'id', 'nombre', m.depositoId)}</select></div>
        <div class="campo ancho-total"><label for="vt-m-buscar">Agregar producto</label>
          <input id="vt-m-buscar" type="search" autocomplete="off" placeholder="Nombre, marca, código o código de barras" value="${m.texto}">
          <ul class="vt-mostrador-res" id="vt-m-res"></ul></div>
      </div>
    </div>
    <div class="seccion"><h2 class="seccion-titulo">Productos <span class="texto-2" id="vt-m-cuenta"></span></h2><div id="vt-m-items"></div></div>`);
    der.innerHTML = String(h`<div class="panel">
      <div class="panel-titulo">Resumen</div>
      <dl class="vt-totales" style="max-width:none;padding-top:0" id="vt-m-tot"></dl>
      <div id="vt-m-avisos" class="pila" style="margin-top:12px"></div>
      <div class="campo" style="margin-top:14px"><label for="vt-m-obs">Observaciones</label><textarea id="vt-m-obs" rows="2" placeholder="Ejemplo: retira un tercero autorizado, pago en efectivo">${m.obs}</textarea></div>
      <div class="pila" style="margin-top:16px">
        <button type="button" class="btn btn-senal btn-grande" id="vt-m-facturar" style="width:100%;justify-content:center" aria-describedby="vt-m-ayuda">Cargar y facturar pedido</button>
        <span class="vt-ayuda" id="vt-m-ayuda" aria-live="polite"></span>
        <button type="button" class="btn btn-secundario" id="vt-m-cargar" style="width:100%;justify-content:center">Cargar pedido sin facturar</button>
        <button type="button" class="btn btn-fantasma" id="vt-m-vaciar" style="width:100%;justify-content:center">Vaciar pedido</button>
      </div>
    </div>`);

    const $ = s => el.querySelector(s);
    const inp = $('#vt-m-buscar'), res = $('#vt-m-res');
    const cantidad = id => { const it = m.items.find(x => x.productoId === id); return it ? it.cantidad : 0; };
    function agregar(id, n) {
      const disp = disponible(id, m.depositoId);
      const it = m.items.find(x => x.productoId === id);
      if (cantidad(id) + n > disp) { ui.toast('De «' + App.get('productos', id).descripcion + '» quedan ' + ui.num(disp) + ' disponibles.', 'alerta'); if (cantidad(id) >= disp) return; n = disp - cantidad(id); }
      if (it) { it.cantidad += n; if (!it.bonifManual) it.bonif = App.bonifEscala(App.get('productos', id), it.cantidad); }
      else m.items.push({ productoId: id, cantidad: n, bonif: App.bonifEscala(App.get('productos', id), n) });
      dibujar();
    }
    function resultados() {
      const t = ui.normalizar(m.texto).trim();
      if (t.length < 2) { res.innerHTML = ''; return; }
      const xs = App.db.productos.filter(p => p.activo !== false && ui.coincide(t, p.descripcion, p.marca, p.codigo, p.ean, p.rubro)).slice(0, 12);
      res.innerHTML = xs.length ? xs.map(p => { const d = disponible(p.id, m.depositoId); return String(h`<li><button type="button" data-agregar="${p.id}" ${d > cantidad(p.id) ? '' : 'disabled'}><span><span class="celda-principal">${p.descripcion}</span><span class="celda-sub">${p.codigo}, ${p.marca}, ${p.unidad.toLowerCase()}</span></span><span class="texto-2 chico">${d > 0 ? 'Quedan ' + ui.num(d) : 'Sin stock'}</span><strong>${ui.pesos(App.q.precio(p.id, c.listaId))}</strong></button></li>`); }).join('')
        : String(h`<li class="nota-discreta" style="padding:8px 10px">No se encontraron productos para «${m.texto}».</li>`);
    }
    res.addEventListener('click', e => { const b = e.target.closest('[data-agregar]'); if (b) { agregar(b.dataset.agregar, 1); resultados(); } });
    ui.buscador(inp, (t, crudo) => { m.texto = crudo || ''; resultados(); }, 100);
    inp.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const crudo = inp.value.trim(), cod = crudo.replace(/\D/g, '');
      const p = App.db.productos.find(x => x.activo !== false && ((cod.length >= 8 && x.ean === cod) || x.codigo.toUpperCase() === crudo.toUpperCase()));
      if (p) { agregar(p.id, 1); inp.value = ''; m.texto = ''; resultados(); }
      else { const b = res.querySelector('[data-agregar]:not([disabled])'); if (b) { agregar(b.dataset.agregar, 1); resultados(); } }
    });

    let tablaItems = null;
    function dibujar() {
      const cont = $('#vt-m-items');
      cont.innerHTML = '';
      let neto = 0, iva = 0, falta = false;
      const pu = it => App.precioNeto({ precio: App.q.precio(it.productoId, c.listaId), bonif: it.bonif || 0 });
      m.items.forEach(it => { const pr = App.get('productos', it.productoId); const s = App.r2(it.cantidad * pu(it)); neto += s; iva += s * pr.iva / 100; if (it.cantidad > disponible(it.productoId, m.depositoId)) falta = true; });
      neto = App.r2(neto); iva = App.r2(iva);
      tablaItems = ui.tabla({
        columnas: [
          { titulo: 'Producto', valor: it => { const pr = App.get('productos', it.productoId); return h`<span class="celda-principal">${pr.descripcion}</span><span class="celda-sub">${pr.codigo}, ${pr.unidad.toLowerCase()}</span>`; } },
          { titulo: 'Disponible', alinear: 'der', valor: it => { const d = disponible(it.productoId, m.depositoId); return it.cantidad > d ? h`<span class="peligro">${ui.num(d)}</span>` : ui.num(d); } },
          { titulo: 'Cantidad', alinear: 'der', valor: it => {
            const i = document.createElement('input'); i.type = 'number'; i.min = '0'; i.step = '1'; i.value = it.cantidad; i.className = 'vt-cant';
            i.setAttribute('aria-label', 'Cantidad de ' + App.get('productos', it.productoId).descripcion);
            i.addEventListener('change', () => { const v = Math.floor(Number(i.value) || 0); if (v > 0) { it.cantidad = v; if (!it.bonifManual) it.bonif = App.bonifEscala(App.get('productos', it.productoId), v); } else m.items = m.items.filter(x => x !== it); dibujar(); });
            return i;
          } },
          { titulo: 'Precio', alinear: 'der', valor: it => ui.pesos(App.q.precio(it.productoId, c.listaId)) },
          { titulo: '% bonif.', alinear: 'der', valor: it => {
            const i = document.createElement('input'); i.type = 'number'; i.min = '0'; i.max = '99'; i.step = '0.5'; i.value = it.bonif || 0; i.className = 'vt-bonif';
            i.setAttribute('aria-label', 'Bonificación de ' + App.get('productos', it.productoId).descripcion);
            i.addEventListener('change', () => { it.bonif = Math.max(0, Math.min(99, Number(i.value) || 0)); it.bonifManual = true; dibujar(); });
            return i;
          } },
          { titulo: 'Subtotal', alinear: 'der', valor: it => ui.pesos(App.r2(it.cantidad * pu(it))) },
          { titulo: '', alinear: 'der', valor: it => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-fantasma btn-chico'; b.textContent = 'Quitar'; b.addEventListener('click', () => { m.items = m.items.filter(x => x !== it); dibujar(); resultados(); }); return b; } }
        ],
        filas: m.items, filaClase: it => it.cantidad > disponible(it.productoId, m.depositoId) ? 'fila-peligro' : '',
        vacio: 'Los productos se agregan desde el buscador superior. Con la lectora de códigos se agregan automáticamente.'
      });
      cont.appendChild(tablaItems);
      $('#vt-m-cuenta').textContent = m.items.length ? m.items.length + (m.items.length === 1 ? ' producto' : ' productos') : '';
      const total = App.r2(neto + iva);
      $('#vt-m-tot').innerHTML = String(h`<dt>Neto</dt><dd>${ui.pesos(neto)}</dd><dt>IVA</dt><dd>${ui.pesos(iva)}</dd><dt class="vt-total">Total</dt><dd class="vt-total">${ui.pesos(total)}</dd>`);
      const avisos = [];
      if (m.items.length && c.tipo !== 'Mostrador' && App.q.saldoCliente(c.id) + total > c.limiteCredito) avisos.push(h`<div class="aviso aviso-alerta"><div>Con este pedido ${c.fantasia} supera su límite de crédito de ${ui.pesos(c.limiteCredito)}.</div></div>`);
      if (falta) avisos.push(h`<div class="aviso aviso-peligro"><div>Hay cantidades mayores al stock disponible en ${App.get('depositos', m.depositoId).nombre}. Es necesario corregirlas para continuar.</div></div>`);
      $('#vt-m-avisos').innerHTML = avisos.map(String).join('');
      $('#vt-m-facturar').disabled = $('#vt-m-cargar').disabled = !m.items.length || falta;
      $('#vt-m-ayuda').textContent = !m.items.length ? 'Agregar al menos un producto para cargar el pedido.' : falta ? 'Corregir las cantidades sin stock para continuar.' : '';
    }
    function crear() {
      return App.acciones.crearPedido({ clienteId: c.id, depositoId: m.depositoId, origen: 'mostrador', obs: m.obs.trim(), items: m.items.map(x => ({ productoId: x.productoId, cantidad: x.cantidad, bonif: x.bonif || 0 })) });
    }
    function limpiar() { m.items = []; m.obs = ''; m.texto = ''; }
    $('#vt-m-cli').addEventListener('change', e => { m.clienteId = e.target.value; m.depositoId = App.get('clientes', m.clienteId).depositoId; App.renderizar(); });
    $('#vt-m-dep').addEventListener('change', e => { m.depositoId = e.target.value; dibujar(); resultados(); });
    $('#vt-m-obs').addEventListener('input', e => { m.obs = e.target.value; });
    $('#vt-m-vaciar').addEventListener('click', () => { limpiar(); App.renderizar(); });
    $('#vt-m-cargar').addEventListener('click', () => {
      const p = App.intentar(crear, r => 'Pedido ' + r.nro + ' cargado');
      if (p) { limpiar(); ui.ir('#/ventas/pedido/' + p.id); }
    });
    $('#vt-m-facturar').addEventListener('click', () => {
      let p = null;
      try { p = crear(); }
      catch (e) { ui.toast(e.message, 'peligro'); return; }
      limpiar();
      ui.ir('#/ventas/pedido/' + p.id);
      setTimeout(() => facturarUno(p.id), 0);
    });
    dibujar();
    resultados();
  }

  App.modulo({
    id: 'ventas',
    titulo: 'Ventas y pedidos',
    grupo: 'Comercial',
    orden: 20,
    icono: '<svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 4h2l1.6 8.5h8.8L17 6H6"/><circle cx="8" cy="16" r="1.2"/><circle cx="14" cy="16" r="1.2"/></svg>',
    contador: () => App.q.pedidosPendientes().length,
    render(el, params) {
      estilos();
      if (params[0] === 'pedido' && params[1]) renderDetalle(el, params[1]);
      else if (params[0] === 'mostrador') renderMostrador(el);
      else renderLista(el);
    }
  });
})();
