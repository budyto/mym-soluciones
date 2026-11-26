/* Módulo «Facturación»: comprobantes electrónicos (Factura A/B y Nota de crédito A/B), vista del comprobante
   como hoja A4, impresión con original y duplicado, nota de crédito total o parcial, remitos imprimibles,
   numeración por tipo y totales del mes. Todo lo que cambia datos pasa por App.acciones. */
(function () {
  'use strict';
  const ui = App.ui, h = ui.h;
  const TIPOS = ['FA', 'FB', 'NCA', 'NCB'];
  const CODIGO_ARCA = { FA: '01', FB: '06', NCA: '03', NCB: '08' };
  const COND_IVA = { RI: 'Responsable Inscripto', MT: 'Monotributista', CF: 'Consumidor Final', EX: 'Exento' };
  const MOTIVOS = ['Devolución de mercadería', 'Mercadería dañada en el reparto', 'Producto vencido o por vencer', 'Error en la cantidad facturada', 'Bonificación acordada con el cliente'];

  // filtros de las listas: quedan mientras la página esté abierta
  const filtro = { tipo: '', mes: '', estado: '', texto: '', mesNum: '' };
  const filtroRem = { estado: '', texto: '' };

  // ---------- estilos propios (prefijo fac-), se inyectan una sola vez ----------
  // CSS_HOJA también viaja dentro de la impresión (el iframe de impresión sólo carga app.css)
  const CSS_HOJA = `
.fac-hoja { position: relative; background: #fff; width: 100%; max-width: 210mm; margin: 0 auto; }
.fac-hoja .comprobante { max-width: none; }
.fac-copia { text-align: center; font-weight: 800; font-stretch: 118%; font-size: 10pt; letter-spacing: .12em;
  border: 1.5px solid #000; border-bottom: 0; padding: 1.2mm 0; color: #000; }
body.impresion .fac-hoja { max-width: none; }
body.impresion .fac-hoja + .fac-hoja { page-break-before: always; break-before: page; }
@page { size: A4; margin: 10mm; }`;
  const CSS = CSS_HOJA + `
.fac-arca { position: relative; font-size: var(--fs-13); color: var(--texto-2); border: 1px solid var(--linea); border-radius: var(--r-control);
  background: var(--hoja); }
.fac-arca summary { list-style: none; cursor: pointer; display: flex; align-items: center; gap: 8px; padding: 7px 12px; min-height: 36px; }
.fac-arca summary::-webkit-details-marker { display: none; }
.fac-arca summary::after { content: ''; width: 6px; height: 6px; border-right: 1.5px solid currentColor; border-bottom: 1.5px solid currentColor;
  transform: rotate(45deg); margin: -3px 0 0 auto; padding-left: 0; }
.fac-arca[open] summary::after { transform: rotate(-135deg); margin-top: 3px; }
.fac-arca strong { color: var(--tinta); font-weight: 600; }
.fac-arca-cuerpo { position: absolute; z-index: 20; top: calc(100% + 6px); right: 0; width: 360px; padding: 12px 14px;
  background: var(--hoja); border: 1px solid var(--linea); border-radius: var(--r-panel); box-shadow: var(--sombra-modal); }
.fac-arca-cuerpo p { margin: 0 0 4px; }
.fac-led { width: 8px; height: 8px; border-radius: 50%; background: var(--ok); box-shadow: 0 0 0 3px var(--ok-suave); flex: none; }
.fac-letra { display: inline-grid; place-items: center; width: 22px; height: 22px; border: 1.5px solid var(--tinta); border-radius: 3px;
  font-weight: 800; font-size: 12px; line-height: 1; margin-right: 8px; vertical-align: middle; }
.fac-letra-nc { border-style: dashed; }
.fac-nro { font-weight: 600; }
.fac-comp { display: inline-flex; align-items: center; }
.fac-neg { color: var(--peligro); }
.fac-previa { padding: 24px; }
.fac-previa .fac-hoja { min-height: 297mm; border: 1px solid var(--linea); }
.fac-previa .comprobante { border: 0; }
.fac-lado .panel-titulo { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
.fac-lista { list-style: none; margin: 0; padding: 0; }
.fac-lista li { display: flex; justify-content: space-between; gap: 12px; padding: 7px 0; border-top: 1px solid var(--linea-suave); font-size: var(--fs-13); }
.fac-lista li:first-child { border-top: 0; padding-top: 0; }
.fac-lista li > span:first-child > .celda-sub { display: block; }
.fac-asiento th { font-size: 11px; font-weight: 600; color: var(--texto-2); text-align: left; padding: 2px 0; border-bottom: 1px solid var(--linea-suave); }
.fac-asiento th.num { text-align: right; padding-left: 8px; width: 96px; }
.fac-asiento td.num { font-variant-numeric: tabular-nums; }
.fac-saldo { font-size: var(--fs-28); line-height: 1.05; margin: 2px 0 14px; }
.fac-asiento + .fac-asiento { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--linea-suave); }
.fac-asiento-cab { font-size: var(--fs-13); margin-bottom: 4px; }
.fac-asiento table { width: 100%; border-collapse: collapse; font-size: var(--fs-12); }
.fac-asiento td { padding: 3px 0; vertical-align: top; }
.fac-asiento td.num { text-align: right; white-space: nowrap; padding-left: 8px; width: 96px; }
.fac-asiento tr.haber td:first-child { padding-left: 18px; }
.fac-nc-modo { margin-bottom: 14px; }
.fac-nc { min-width: 0; }
.fac-nc-resumen { display: grid; grid-template-columns: 1fr auto; gap: 4px 16px; margin: 14px 0 0; padding: 12px 14px;
  background: #F7F8F5; border: 1px solid var(--linea); border-radius: var(--r-control); font-size: var(--fs-13); }
.fac-nc-resumen dt { color: var(--texto-2); align-self: center; }
.fac-nc-resumen dd { margin: 0; text-align: right; }
.fac-nc-resumen .fac-nc-total { font-size: var(--fs-20); font-weight: 800; font-stretch: 118%; }
.fac-nc-items input[type="number"] { width: 92px; }
.fac-numeracion td.fac-proximo { font-weight: 700; }
.fac-totales-pie { display: flex; flex-wrap: wrap; gap: 6px 22px; justify-content: flex-end; font-size: var(--fs-13); color: var(--texto-2); margin-top: 10px; }
.fac-totales-pie strong { color: var(--tinta); }
@media (max-width: 760px) {
  .fac-previa { padding: 10px; }
  .fac-previa .fac-hoja { min-height: 0; }
  .fac-arca { width: 100%; }
  .fac-arca-cuerpo { left: 0; right: 0; width: auto; }
  .fac-totales-pie { justify-content: flex-start; }
}`;
  function estilos() {
    if (document.getElementById('estilos-facturacion')) return;
    const s = document.createElement('style');
    s.id = 'estilos-facturacion';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  // ---------- ayudas ----------
  const r2 = App.r2;
  const pv = () => String(App.config.puntoVenta).padStart(4, '0');
  const letraHTML = c => h`<span class="fac-letra${c.clase === 'nc' ? ' fac-letra-nc' : ''}" title="${App.nombreTipo(c.tipo)}">${c.letra}</span>`;
  const signo = c => c.clase === 'nc' ? -1 : 1;
  const nombreCuenta = cod => { const c = App.get('planCuentas', cod); return c ? c.nombre : cod; };

  function estadoComp(c) {
    if (c.clase === 'nc') return c.sinAplicar > 0.01 ? { id: 'favor', texto: 'Saldo a favor', tono: 'info' } : { id: 'aplicada', texto: 'Aplicada', tono: 'neutro' };
    const s = App.q.saldoComprobante(c);
    if (s <= 0.01) return c.acreditado >= c.total - 0.01 ? { id: 'anulada', texto: 'Anulada con NC', tono: 'neutro' } : { id: 'cobrada', texto: 'Cobrada', tono: 'ok' };
    if (c.vence < App.hoy()) return { id: 'vencida', texto: 'Vencida', tono: 'peligro' };
    return { id: 'pendiente', texto: c.cobrado > 0 || c.acreditado > 0 ? 'Cobro parcial' : 'Pendiente de cobro', tono: 'alerta' };
  }

  // mismo cálculo que el núcleo: neto por alícuota, IVA redondeado por alícuota
  function totalesNC(lineas) {
    let n21 = 0, n105 = 0;
    lineas.forEach(l => { const s = r2(l.cantidad * l.precio); if (l.iva === 10.5) n105 += s; else n21 += s; });
    n21 = r2(n21); n105 = r2(n105);
    const i21 = r2(n21 * 0.21), i105 = r2(n105 * 0.105);
    return { neto: r2(n21 + n105), iva: r2(i21 + i105), total: r2(n21 + n105 + i21 + i105) };
  }
  const quedan = (f, it) => r2(it.cantidad - ((f.devuelto && f.devuelto[it.productoId]) || 0));
  const puedeNC = f => f.clase === 'factura' && f.items.some(it => quedan(f, it) > 0);

  // hoja A4 con la leyenda de la copia (ORIGINAL / DUPLICADO) dentro del comprobante
  function hojaHTML(doc, tipoDoc, copia) {
    let html = String(ui.comprobanteHTML(doc, tipoDoc));
    if (copia) html = html.replace('<article class="comprobante">', '<article class="comprobante"><div class="fac-copia">' + ui.escapar(copia) + '</div>');
    return '<div class="fac-hoja">' + html + '</div>';
  }
  function imprimirDoc(doc, tipoDoc, titulo) {
    const html = '<style>' + CSS_HOJA + '</style>' + ['ORIGINAL', 'DUPLICADO'].map(c => hojaHTML(doc, tipoDoc, c)).join('');
    ui.imprimir(html, { titulo });
    ui.toast('Impresión generada: original y duplicado.', 'info');
  }

  const mesesDisponibles = () => App.f.meses(App.config.desde, App.hoy()).slice().reverse();

  function totalesPorTipo(mes) {
    const r = {};
    TIPOS.forEach(t => { r[t] = { tipo: t, cantidad: 0, neto: 0, iva: 0, total: 0, desde: null, hasta: null }; });
    App.db.comprobantes.forEach(c => {
      if (mes && c.fecha.slice(0, 7) !== mes) return;
      const x = r[c.tipo]; if (!x) return;
      x.cantidad++; x.neto += c.neto; x.iva += c.iva; x.total += c.total;
      if (!x.desde || c.numero < x.desde.numero) x.desde = c;
      if (!x.hasta || c.numero > x.hasta.numero) x.hasta = c;
    });
    TIPOS.forEach(t => { r[t].neto = r2(r[t].neto); r[t].iva = r2(r[t].iva); r[t].total = r2(r[t].total); });
    return r;
  }
  function ultimoPorTipo() {
    const r = {};
    App.db.comprobantes.forEach(c => { if (!r[c.tipo] || c.numero > r[c.tipo].numero) r[c.tipo] = c; });
    return r;
  }

  function panelARCA() {
    const ult = ultimoPorTipo();
    const ultimo = TIPOS.map(t => ult[t]).filter(Boolean).sort((a, b) => a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0)[0];
    return h`<details class="fac-arca no-imprimir">
      <summary><span class="fac-led" aria-hidden="true"></span><span>Conexión con ARCA: <strong>simulada en la demo</strong></span></summary>
      <div class="fac-arca-cuerpo">
        <p>Punto de venta ${pv()}, factura electrónica por web service.</p>
        ${ultimo ? h`<p>Último CAE: ${ultimo.cae}, ${App.nombreTipo(ultimo.tipo)} ${ultimo.nro} del ${ui.fecha(ultimo.fecha)}.</p>` : ''}
        <p>${App.config.avisoCAE}</p>
      </div></details>`;
  }

  // ---------- lista de comprobantes ----------
  function vistaLista(el) {
    const mesHoy = App.hoy().slice(0, 7);
    const t = totalesPorTipo(mesHoy);
    const ncTotal = r2(t.NCA.total + t.NCB.total), ncCant = t.NCA.cantidad + t.NCB.cantidad;
    const netoMes = r2(t.FA.total + t.FB.total - ncTotal);
    const hoyCant = App.db.comprobantes.filter(c => c.fecha === App.hoy()).length;
    const pendientes = App.q.pedidosPendientes().length;
    const mesNombre = App.f.nombreMes(mesHoy).split(' ')[0];

    el.appendChild(ui.nodo(h`<div class="encabezado-vista">
      <div><h1 class="titulo-vista">Facturación</h1>
        <p class="bajada">Facturas A y B, notas de crédito y remitos del punto de venta ${pv()}. Al seleccionar un comprobante se puede consultar, imprimir o emitir una nota de crédito.</p></div>
      <div class="acciones">${panelARCA()}
        <a class="btn btn-secundario" href="#/ventas">Pedidos pendientes de facturación${pendientes ? h` <span class="pestana-cuenta">${pendientes}</span>` : ''}</a></div>
    </div>`));

    el.appendChild(ui.nodo(ui.franjaKpi([
      { titulo: 'Facturas A de ' + mesNombre, valor: ui.pesosCorto(t.FA.total), detalle: ui.num(t.FA.cantidad) + ' a Responsables Inscriptos' },
      { titulo: 'Facturas B de ' + mesNombre, valor: ui.pesosCorto(t.FB.total), detalle: ui.num(t.FB.cantidad) + ' a monotributistas y consumidores finales' },
      { titulo: 'Notas de crédito', valor: ui.pesosCorto(ncTotal), detalle: ui.num(ncCant) + ' en el mes, se deducen de lo facturado', tono: ncCant ? 'alerta' : null },
      { titulo: 'Facturado neto del mes', valor: ui.pesosCorto(netoMes), detalle: 'Facturas menos notas de crédito, IVA incluido', tono: 'senal' },
      { titulo: 'Emitidos hoy', valor: ui.num(hoyCant), detalle: 'Comprobantes del ' + ui.fecha(App.hoy()) }
    ])));

    const cont = document.createElement('div');
    el.appendChild(cont);
    const sinHoja = App.q.remitosSinHoja().length;
    ui.pestanas(cont, [
      { id: 'comprobantes', titulo: 'Comprobantes', render: tabComprobantes },
      { id: 'remitos', titulo: 'Remitos', cuenta: sinHoja || null, render: tabRemitos },
      { id: 'numeracion', titulo: 'Numeración y totales', render: tabNumeracion }
    ]);
  }

  function tabComprobantes(panel) {
    const meses = mesesDisponibles();
    const barra = ui.nodo(h`<div class="filtros">
      <div class="segmentado" role="group" aria-label="Tipo de comprobante">
        ${[['', 'Todos'], ['FA', 'Factura A'], ['FB', 'Factura B'], ['NCA', 'NC A'], ['NCB', 'NC B']].map(([v, tx]) => h`<button type="button" data-tipo="${v}" aria-pressed="${filtro.tipo === v}">${tx}</button>`)}
      </div>
      <label class="solo-lector" for="fac-mes">Mes</label>
      <select id="fac-mes"><option value="">Todos los meses</option>${meses.map(m => h`<option value="${m}"${filtro.mes === m ? ' selected' : ''}>${App.f.nombreMes(m)}</option>`)}</select>
      <label class="solo-lector" for="fac-estado">Estado</label>
      <select id="fac-estado">
        ${[['', 'Cualquier estado'], ['saldo', 'Con saldo a cobrar'], ['vencida', 'Vencidas'], ['cobrada', 'Cobradas'], ['anulada', 'Anuladas con NC'], ['favor', 'NC con saldo a favor']].map(([v, tx]) => h`<option value="${v}"${filtro.estado === v ? ' selected' : ''}>${tx}</option>`)}
      </select>
      <label class="solo-lector" for="fac-buscar">Buscar comprobante</label>
      <input id="fac-buscar" type="search" placeholder="Cliente, CUIT o número" value="${filtro.texto}" autocomplete="off">
    </div>`);
    panel.appendChild(barra);

    const saldoDe = c => c.clase === 'nc' ? -c.sinAplicar : App.q.saldoComprobante(c);
    const tabla = ui.tabla({
      columnas: [
        { titulo: 'Fecha', clase: 'ocultar-celu', valor: c => ui.fecha(c.fecha), ordenar: c => c.fecha + String(c.numero).padStart(8, '0') },
        { titulo: 'Comprobante', valor: c => h`<span class="fac-comp">${letraHTML(c)}<span><span class="fac-nro">${c.nro}</span><span class="celda-sub">${App.nombreTipo(c.tipo)}</span><span class="celda-sub solo-celu">${estadoComp(c).texto}</span></span></span>`, ordenar: c => c.tipo + c.nro },
        { titulo: 'Cliente', clase: 'envolver', valor: c => { const cl = App.get('clientes', c.clienteId) || {}; return h`<span class="celda-principal">${cl.fantasia || c.razonSocial}</span><span class="celda-sub">${c.razonSocial}${c.cuit ? ', CUIT ' + c.cuit : ', ' + (COND_IVA[c.condicionIVA] || '')}</span>`; }, ordenar: c => (App.get('clientes', c.clienteId) || {}).fantasia || c.razonSocial },
        { titulo: 'Neto', clase: 'ocultar-celu', alinear: 'der', valor: c => ui.pesos(signo(c) * c.neto), ordenar: c => signo(c) * c.neto },
        { titulo: 'IVA', clase: 'ocultar-celu', alinear: 'der', valor: c => ui.pesos(signo(c) * c.iva), ordenar: c => signo(c) * c.iva },
        { titulo: 'Total', alinear: 'der', clase: 'celda-principal', valor: c => c.clase === 'nc' ? h`<span class="fac-neg">${ui.pesos(-c.total)}</span>` : ui.pesos(c.total), ordenar: c => signo(c) * c.total },
        { titulo: 'Saldo', clase: 'ocultar-celu', alinear: 'der', valor: c => Math.abs(saldoDe(c)) > 0.01 ? ui.pesos(saldoDe(c)) : '', ordenar: saldoDe },
        { titulo: 'Estado', clase: 'ocultar-celu', valor: c => { const e = estadoComp(c); return ui.chip(e.texto, e.tono); }, ordenar: c => estadoComp(c).texto }
      ],
      filas: [],
      limite: 80,
      alClic: c => ui.ir('#/facturacion/comprobante/' + c.id),
      filaClase: c => { const e = estadoComp(c).id; return e === 'vencida' ? 'fila-peligro' : e === 'anulada' ? 'fila-apagada' : ''; },
      vacio: 'No hay comprobantes para los filtros aplicados. Se puede seleccionar otro mes o limpiar la búsqueda.'
    });
    panel.appendChild(tabla);
    const resumen = document.createElement('div');
    resumen.className = 'fac-totales-pie';
    panel.appendChild(resumen);

    function aplicar() {
      const tx = ui.normalizar(filtro.texto).trim();
      const filas = App.db.comprobantes.filter(c => {
        if (filtro.tipo && c.tipo !== filtro.tipo) return false;
        if (filtro.mes && c.fecha.slice(0, 7) !== filtro.mes) return false;
        if (filtro.estado) {
          const e = estadoComp(c).id;
          if (filtro.estado === 'saldo' ? !(e === 'pendiente' || e === 'vencida') : e !== filtro.estado) return false;
        }
        return ui.coincide(tx, (App.get('clientes', c.clienteId) || {}).fantasia, c.razonSocial, c.cuit, c.nro, c.tipo + ' ' + c.nro, String(c.numero), App.nombreTipo(c.tipo));
      }).sort((a, b) => a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : (a.id < b.id ? 1 : -1));
      tabla.actualizar(filas);
      let fac = 0, nc = 0, saldo = 0;
      filas.forEach(c => { if (c.clase === 'nc') nc += c.total; else { fac += c.total; saldo += App.q.saldoComprobante(c); } });
      resumen.innerHTML = String(h`<span>${ui.num(filas.length)} comprobantes</span><span>Facturado <strong>${ui.pesos(fac)}</strong></span><span>Notas de crédito <strong>${ui.pesos(-nc)}</strong></span><span>Neto <strong>${ui.pesos(fac - nc)}</strong></span><span>Saldo a cobrar <strong>${ui.pesos(saldo)}</strong></span>`);
    }
    barra.querySelectorAll('[data-tipo]').forEach(b => b.addEventListener('click', () => {
      filtro.tipo = b.dataset.tipo;
      barra.querySelectorAll('[data-tipo]').forEach(x => x.setAttribute('aria-pressed', x === b));
      aplicar();
    }));
    barra.querySelector('#fac-mes').addEventListener('change', e => { filtro.mes = e.target.value; aplicar(); });
    barra.querySelector('#fac-estado').addEventListener('change', e => { filtro.estado = e.target.value; aplicar(); });
    ui.buscador(barra.querySelector('#fac-buscar'), (n, crudo) => { filtro.texto = crudo; aplicar(); });
    aplicar();
  }

  function tabRemitos(panel) {
    const barra = ui.nodo(h`<div class="filtros">
      <div class="segmentado" role="group" aria-label="Estado del remito">
        ${[['', 'Todos'], ['pendiente', 'Sin entregar'], ['en_ruta', 'En reparto'], ['entregado', 'Entregados'], ['parcial', 'Parciales'], ['rechazado', 'Rechazados']].map(([v, tx]) => h`<button type="button" data-estado="${v}" aria-pressed="${filtroRem.estado === v}">${tx}</button>`)}
      </div>
      <label class="solo-lector" for="fac-buscar-rem">Buscar remito</label>
      <input id="fac-buscar-rem" type="search" placeholder="Cliente o número de remito" value="${filtroRem.texto}" autocomplete="off">
    </div>`);
    panel.appendChild(barra);
    const cliDe = r => App.get('clientes', r.clienteId) || {};
    const tabla = ui.tabla({
      columnas: [
        { titulo: 'Fecha', clase: 'ocultar-celu', valor: r => ui.fecha(r.fecha), ordenar: r => r.fecha + String(r.numero).padStart(8, '0') },
        { titulo: 'Remito', valor: r => h`<span class="fac-letra">R</span><span class="fac-nro">${r.nro}</span>`, ordenar: r => r.nro },
        { titulo: 'Cliente', valor: r => h`<span class="celda-principal">${cliDe(r).fantasia || cliDe(r).razonSocial || ''}</span><span class="celda-sub">${cliDe(r).localidad || ''}</span>`, ordenar: r => cliDe(r).fantasia || '' },
        { titulo: 'Factura', clase: 'ocultar-celu', valor: r => { const f = App.get('comprobantes', r.comprobanteId); return f ? App.nombreTipo(f.tipo) + ' ' + f.nro : ''; } },
        { titulo: 'Depósito', clase: 'ocultar-celu', valor: r => (App.get('depositos', r.depositoId) || {}).nombre || '' },
        { titulo: 'Bultos', clase: 'ocultar-celu', alinear: 'der', valor: r => ui.num(r.bultos), ordenar: r => r.bultos },
        { titulo: 'Peso', clase: 'ocultar-celu', alinear: 'der', valor: r => ui.num(r.kg) + ' kg', ordenar: r => r.kg },
        { titulo: 'Hoja de ruta', clase: 'ocultar-celu', valor: r => { const hr = r.hojaRutaId && App.get('hojasRuta', r.hojaRutaId); return hr ? hr.nro : h`<span class="nota-discreta">Sin asignar</span>`; } },
        { titulo: 'Estado', valor: r => ui.estado(r.estado), ordenar: r => r.estado }
      ],
      filas: [], limite: 80,
      alClic: r => ui.ir('#/facturacion/remito/' + r.id),
      filaClase: r => r.estado === 'rechazado' ? 'fila-peligro' : r.estado === 'parcial' ? 'fila-alerta' : '',
      vacio: 'No hay remitos con ese estado.'
    });
    panel.appendChild(tabla);
    function aplicar() {
      const tx = ui.normalizar(filtroRem.texto).trim();
      tabla.actualizar(App.db.remitos.filter(r => {
        if (filtroRem.estado && r.estado !== filtroRem.estado) return false;
        const c = cliDe(r);
        return ui.coincide(tx, c.fantasia, c.razonSocial, r.nro, String(r.numero));
      }).sort((a, b) => a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : b.numero - a.numero));
    }
    barra.querySelectorAll('[data-estado]').forEach(b => b.addEventListener('click', () => {
      filtroRem.estado = b.dataset.estado;
      barra.querySelectorAll('[data-estado]').forEach(x => x.setAttribute('aria-pressed', x === b));
      aplicar();
    }));
    ui.buscador(barra.querySelector('#fac-buscar-rem'), (n, crudo) => { filtroRem.texto = crudo; aplicar(); });
    aplicar();
  }

  function tabNumeracion(panel) {
    const meses = mesesDisponibles();
    let mes = filtro.mesNum && meses.includes(filtro.mesNum) ? filtro.mesNum : meses[0];
    const cab = ui.nodo(h`<div class="filtros"><label for="fac-mes-num">Mes</label>
      <select id="fac-mes-num">${meses.map(m => h`<option value="${m}"${mes === m ? ' selected' : ''}>${App.f.nombreMes(m)}</option>`)}</select></div>`);
    panel.appendChild(cab);
    const zonaMes = document.createElement('div');
    panel.appendChild(zonaMes);

    function dibujar() {
      zonaMes.innerHTML = '';
      const t = totalesPorTipo(mes);
      const filas = TIPOS.map(x => t[x]);
      const neto = r2(t.FA.neto + t.FB.neto - t.NCA.neto - t.NCB.neto), iva = r2(t.FA.iva + t.FB.iva - t.NCA.iva - t.NCB.iva);
      zonaMes.appendChild(ui.nodo(h`<h2 class="seccion-titulo">Totales de ${App.f.nombreMes(mes)} por tipo</h2>`));
      zonaMes.appendChild(ui.tabla({
        columnas: [
          { titulo: 'Tipo', valor: x => h`<span class="celda-principal">${App.nombreTipo(x.tipo)}</span>` },
          { titulo: 'Código ARCA', clase: 'ocultar-celu', valor: x => CODIGO_ARCA[x.tipo] },
          { titulo: 'Cantidad', clase: 'ocultar-celu', alinear: 'der', valor: x => ui.num(x.cantidad) },
          { titulo: 'Desde', clase: 'ocultar-celu', valor: x => x.desde ? x.desde.nro : '—' },
          { titulo: 'Hasta', clase: 'ocultar-celu', valor: x => x.hasta ? x.hasta.nro : '—' },
          { titulo: 'Neto gravado', clase: 'ocultar-celu', alinear: 'der', valor: x => x.tipo.startsWith('NC') ? h`<span class="fac-neg">${ui.pesos(-x.neto)}</span>` : ui.pesos(x.neto) },
          { titulo: 'IVA', clase: 'ocultar-celu', alinear: 'der', valor: x => x.tipo.startsWith('NC') ? h`<span class="fac-neg">${ui.pesos(-x.iva)}</span>` : ui.pesos(x.iva) },
          { titulo: 'Total', alinear: 'der', clase: 'celda-principal', valor: x => x.tipo.startsWith('NC') ? h`<span class="fac-neg">${ui.pesos(-x.total)}</span>` : ui.pesos(x.total) }
        ],
        filas,
        pie: ['Neto del mes', '', ui.num(filas.reduce((s, x) => s + x.cantidad, 0)), '', '', ui.pesos(neto), ui.pesos(iva), ui.pesos(r2(neto + iva))]
      }));
    }
    cab.querySelector('select').addEventListener('change', e => { mes = filtro.mesNum = e.target.value; dibujar(); });
    dibujar();

    const ult = ultimoPorTipo();
    panel.appendChild(ui.nodo(h`<div class="seccion"><h2 class="seccion-titulo">Numeración del punto de venta ${pv()} <span class="texto-2">Cada tipo lleva su propia numeración correlativa.</span></h2></div>`));
    panel.appendChild(ui.tabla({
      clase: 'fac-numeracion',
      columnas: [
        { titulo: 'Tipo', valor: x => h`<span class="celda-principal">${App.nombreTipo(x)}</span>` },
        { titulo: 'Código ARCA', clase: 'ocultar-celu', valor: x => CODIGO_ARCA[x] },
        { titulo: 'Último emitido', valor: x => ult[x] ? ult[x].nro : '—' },
        { titulo: 'Fecha', clase: 'ocultar-celu', valor: x => ult[x] ? ui.fecha(ult[x].fecha) : '' },
        { titulo: 'Último CAE', clase: 'ocultar-celu', valor: x => ult[x] ? ult[x].cae : '' },
        { titulo: 'Próximo número', clase: 'fac-proximo', valor: x => pv() + '-' + String((ult[x] ? ult[x].numero : 0) + 1).padStart(8, '0') }
      ],
      filas: TIPOS,
      alClic: x => { if (ult[x]) ui.ir('#/facturacion/comprobante/' + ult[x].id); }
    }));
    const ultR = App.db.remitos.reduce((a, r) => !a || r.numero > a.numero ? r : a, null);
    if (ultR) panel.appendChild(ui.nodo(h`<p class="nota-discreta" style="margin-top:10px">Los remitos (R, no válidos como factura) tienen numeración propia y no requieren CAE. Último: ${ultR.nro} del ${ui.fecha(ultR.fecha)}.</p>`));
  }

  // ---------- detalle de un comprobante ----------
  function noEncontrado(el, que) {
    el.innerHTML = String(h`<div class="vacio vacio-grande"><h1 class="titulo-vista">${que}</h1><p>El enlace puede ser incorrecto.</p><a class="btn btn-primario" href="#/facturacion">Ver todos los comprobantes</a></div>`);
  }

  function vistaComprobante(el, id) {
    const c = App.get('comprobantes', id);
    if (!c) return noEncontrado(el, 'Comprobante no encontrado');
    const esNC = c.clase === 'nc';
    const cli = App.get('clientes', c.clienteId) || {};
    const est = estadoComp(c);
    const titulo = App.nombreTipo(c.tipo) + ' ' + c.nro;
    const rem = !esNC && c.remitoId ? App.get('remitos', c.remitoId) : null;
    const asociado = esNC && c.asociadoId ? App.get('comprobantes', c.asociadoId) : null;

    el.appendChild(ui.nodo(h`<div class="encabezado-vista">
      <div><div class="migas"><a href="#/facturacion">Facturación</a> / ${App.nombreTipo(c.tipo)}</div>
        <h1 class="titulo-vista">${titulo}</h1>
        <p class="bajada">${c.razonSocial}, ${ui.fechaLarga(c.fecha)}.</p></div>
      <div class="acciones">
        <button class="btn btn-primario" type="button" data-accion="imprimir">Imprimir comprobante</button>
        ${puedeNC(c) ? h`<button class="btn btn-secundario" type="button" data-accion="nc">Emitir nota de crédito</button>` : ''}
        ${rem ? h`<a class="btn btn-secundario" href="#/facturacion/remito/${rem.id}">Ver remito</a>` : ''}
        ${asociado ? h`<a class="btn btn-secundario" href="#/facturacion/comprobante/${asociado.id}">Ver factura</a>` : ''}
      </div></div>`));

    const grilla = ui.nodo(h`<div class="grilla-lado">
      <div class="vista-previa fac-previa">${ui.seguro(hojaHTML(c, null, 'ORIGINAL'))}</div>
      <div class="fac-lado pila"></div></div>`);
    el.appendChild(grilla);
    const lado = grilla.querySelector('.fac-lado');

    if (!esNC) {
      const saldo = App.q.saldoComprobante(c);
      lado.appendChild(ui.nodo(h`<div class="panel">
        <div class="panel-titulo">Saldo de la factura ${ui.chip(est.texto, est.tono)}</div>
        <div class="fac-saldo rotulo">${ui.pesos(saldo)}</div>
        <dl class="datos">
          <dt>Total</dt><dd>${ui.pesos(c.total)}</dd>
          <dt>Cobrado</dt><dd>${ui.pesos(c.cobrado)}</dd>
          <dt>Notas de crédito</dt><dd>${ui.pesos(c.acreditado)}</dd>
          <dt>Vence el pago</dt><dd>${ui.fecha(c.vence)}${saldo > 0.01 && c.vence < App.hoy() ? h`, vencida hace ${App.f.diferencia(c.vence, App.hoy())} días` : ''}</dd>
          <dt>Cliente</dt><dd><a href="#/clientes/${cli.id}">${cli.fantasia || c.razonSocial}</a></dd>
          ${c.pedidoId ? h`<dt>Pedido</dt><dd><a href="#/ventas/pedido/${c.pedidoId}">${(App.get('pedidos', c.pedidoId) || {}).nro || 'Ver pedido'}</a></dd>` : ''}
          ${rem ? h`<dt>Remito</dt><dd><a href="#/facturacion/remito/${rem.id}">${rem.nro}</a> ${ui.estado(rem.estado)}</dd>` : ''}
        </dl></div>`));
    } else {
      lado.appendChild(ui.nodo(h`<div class="panel">
        <div class="panel-titulo">Nota de crédito ${ui.chip(est.texto, est.tono)}</div>
        <div class="fac-saldo rotulo fac-neg">${ui.pesos(-c.total)}</div>
        <dl class="datos">
          <dt>Motivo</dt><dd>${c.motivo}</dd>
          <dt>Comprobante asociado</dt><dd>${asociado ? h`<a href="#/facturacion/comprobante/${asociado.id}">${App.nombreTipo(asociado.tipo)} ${asociado.nro}</a>` : c.asociadoNro}</dd>
          <dt>Aplicado a la factura</dt><dd>${ui.pesos(c.aplicado)}</dd>
          <dt>A favor del cliente</dt><dd>${ui.pesos(c.sinAplicar)}</dd>
          <dt>Stock</dt><dd>${c.reingresoStock === false ? 'Sin reingreso de mercadería al stock' : 'Reingresada a los lotes de origen'}</dd>
          <dt>Cliente</dt><dd><a href="#/clientes/${cli.id}">${cli.fantasia || c.razonSocial}</a></dd>
        </dl></div>`));
    }

    lado.appendChild(ui.nodo(h`<div class="panel">
      <div class="panel-titulo">Datos para ARCA</div>
      <dl class="datos">
        <dt>Código</dt><dd>${CODIGO_ARCA[c.tipo]}, ${App.nombreTipo(c.tipo)}</dd>
        <dt>Punto de venta</dt><dd>${String(c.puntoVenta).padStart(4, '0')}</dd>
        <dt>Número</dt><dd>${String(c.numero).padStart(8, '0')}</dd>
        <dt>CAE</dt><dd>${c.cae}</dd>
        <dt>Vencimiento del CAE</dt><dd>${ui.fecha(c.vtoCae)}</dd>
        <dt>Receptor</dt><dd>${COND_IVA[c.condicionIVA] || c.condicionIVA}${c.cuit ? ', CUIT ' + c.cuit : ''}</dd>
      </dl>
      <p class="nota-discreta" style="margin:10px 0 0">${App.config.avisoCAE}</p></div>`));

    if (!esNC) {
      const ncs = (c.ncIds || []).map(x => App.get('comprobantes', x)).filter(Boolean);
      const cobros = [];
      App.db.recibos.forEach(r => (r.imputaciones || []).forEach(i => { if (i.comprobanteId === c.id) cobros.push({ r, importe: i.importe }); }));
      if (ncs.length || cobros.length) {
        lado.appendChild(ui.nodo(h`<div class="panel"><div class="panel-titulo">Movimientos de la factura</div><ul class="fac-lista">
          ${ncs.map(n => h`<li><span><a href="#/facturacion/comprobante/${n.id}">${App.nombreTipo(n.tipo)} ${n.nro}</a><span class="celda-sub nota-discreta">${ui.fecha(n.fecha)}, ${n.motivo}</span></span><span class="fac-neg">${ui.pesos(-n.aplicado)}</span></li>`)}
          ${cobros.map(x => h`<li><span><a href="#/cobranzas/recibo/${x.r.id}">Recibo ${x.r.nro}</a><span class="celda-sub nota-discreta">${ui.fecha(x.r.fecha)}</span></span><span>${ui.pesos(-x.importe)}</span></li>`)}
        </ul></div>`));
      }
    }

    const asientos = App.db.asientos.filter(a => a.refId === c.id);
    if (asientos.length) {
      lado.appendChild(ui.nodo(h`<div class="panel"><div class="panel-titulo">Asientos contables generados</div>
        ${asientos.map(a => h`<div class="fac-asiento"><div class="fac-asiento-cab"><strong>N.º ${a.numero}</strong> ${a.detalle}</div><table class="fac-asiento-tabla"><thead><tr><th>Cuenta</th><th class="num">Debe</th><th class="num">Haber</th></tr></thead><tbody>
          ${a.lineas.map(l => h`<tr class="${l.haber ? 'haber' : 'debe'}"><td>${l.cuenta} ${nombreCuenta(l.cuenta)}</td><td class="num">${l.debe ? ui.pesos(l.debe) : ''}</td><td class="num">${l.haber ? ui.pesos(l.haber) : ''}</td></tr>`)}
        </tbody></table></div>`)}</div>`));
    }

    el.querySelector('[data-accion="imprimir"]').addEventListener('click', () => imprimirDoc(c, null, titulo));
    const bNC = el.querySelector('[data-accion="nc"]');
    if (bNC) bNC.addEventListener('click', () => modalNC(c));
  }

  // ---------- modal: emitir nota de crédito ----------
  function modalNC(f) {
    const items = f.items.map(it => ({ it, quedan: quedan(f, it) })).filter(x => x.quedan > 0);
    let modo = 'total';
    const cuerpo = ui.nodo(h`<form class="fac-nc" novalidate>
      <p class="nota-discreta" style="margin-top:0">Sobre la ${App.nombreTipo(f.tipo)} ${f.nro} de ${f.razonSocial.replace(/\.$/, '')}. Se emitirá una ${App.nombreTipo('NC' + f.letra)} con su CAE, acreditada en la cuenta corriente del cliente.</p>
      <div class="segmentado fac-nc-modo" role="group" aria-label="Alcance de la nota de crédito">
        <button type="button" data-modo="total" aria-pressed="true">Saldo total pendiente</button>
        <button type="button" data-modo="parcial" aria-pressed="false">Productos seleccionados</button>
      </div>
      <div class="fac-nc-items" hidden></div>
      <div class="form-grilla" style="margin-top:14px">
        <div class="campo"><label for="nc-motivo">Motivo</label><select id="nc-motivo" name="motivo">${MOTIVOS.map(m => h`<option>${m}</option>`)}</select></div>
        <div class="campo"><label for="nc-detalle">Detalle (opcional)</label><input id="nc-detalle" name="detalle" type="text" maxlength="80" placeholder="Ejemplo: 3 cajas con daños"></div>
        <label class="check ancho-total"><input type="checkbox" name="reingresar" checked> Reingresar la mercadería al stock (a los lotes de origen)</label>
      </div>
      <dl class="fac-nc-resumen"></dl>
    </form>`);
    const zonaItems = cuerpo.querySelector('.fac-nc-items');
    const resumen = cuerpo.querySelector('.fac-nc-resumen');
    zonaItems.appendChild(ui.tabla({
      columnas: [
        { titulo: 'Producto', valor: x => h`<span class="celda-principal">${x.it.descripcion}</span><span class="celda-sub">${x.it.codigo}, ${ui.pesos(x.it.precio)} neto c/u</span>` },
        { titulo: 'Facturado', alinear: 'der', valor: x => ui.num(x.it.cantidad) },
        { titulo: 'Disponible', alinear: 'der', valor: x => ui.num(x.quedan) },
        { titulo: 'A acreditar', alinear: 'der', valor: x => h`<label class="solo-lector" for="nc-c-${x.it.productoId}">Cantidad a acreditar de ${x.it.descripcion}</label><input id="nc-c-${x.it.productoId}" type="number" min="0" max="${x.quedan}" step="1" value="0" data-prod="${x.it.productoId}">` }
      ],
      filas: items
    }));

    const entradas = () => [...zonaItems.querySelectorAll('input[data-prod]')];
    function lineas() {
      if (modo === 'total') return items.map(x => ({ productoId: x.it.productoId, cantidad: x.quedan, precio: x.it.precio, iva: x.it.iva }));
      return entradas().map(inp => {
        const x = items.find(y => y.it.productoId === inp.dataset.prod);
        const v = Math.min(Math.max(Number(inp.value) || 0, 0), x.quedan);
        return { productoId: x.it.productoId, cantidad: v, precio: x.it.precio, iva: x.it.iva };
      }).filter(l => l.cantidad > 0);
    }
    function actualizar() {
      const t = totalesNC(lineas());
      const aplica = Math.min(App.q.saldoComprobante(f), t.total);
      entradas().forEach(inp => { const v = Number(inp.value); inp.setAttribute('aria-invalid', v < 0 || v > Number(inp.max) ? 'true' : 'false'); });
      resumen.innerHTML = String(h`<dt>Neto</dt><dd>${ui.pesos(t.neto)}</dd><dt>IVA</dt><dd>${ui.pesos(t.iva)}</dd>
        <dt>Total de la nota de crédito</dt><dd class="fac-nc-total">${ui.pesos(t.total)}</dd>
        <dt>Reducción del saldo de la factura</dt><dd>${ui.pesos(aplica)}</dd>
        ${t.total - aplica > 0.01 ? h`<dt>Saldo a favor del cliente</dt><dd>${ui.pesos(t.total - aplica)}</dd>` : ''}`);
    }
    cuerpo.querySelectorAll('[data-modo]').forEach(b => b.addEventListener('click', () => {
      modo = b.dataset.modo;
      cuerpo.querySelectorAll('[data-modo]').forEach(x => x.setAttribute('aria-pressed', x === b));
      zonaItems.hidden = modo !== 'parcial';
      if (modo === 'parcial') { const p = zonaItems.querySelector('input'); if (p) p.focus(); }
      actualizar();
    }));
    zonaItems.addEventListener('input', actualizar);
    cuerpo.querySelector('#nc-motivo').addEventListener('change', e => {
      // si la mercadería vino dañada o vencida, de entrada no vuelve al stock vendible
      cuerpo.querySelector('[name="reingresar"]').checked = !/dañada|vencido/i.test(e.target.value);
    });
    cuerpo.addEventListener('submit', e => e.preventDefault());
    actualizar();

    ui.modal({
      titulo: 'Emitir nota de crédito', cuerpo, ancho: 720,
      acciones: [
        { texto: 'Volver', tipo: 'secundario' },
        { texto: 'Emitir nota de crédito', tipo: 'primario', alClic: ({ cerrar }) => {
          const datos = ui.leerFormulario(cuerpo);
          let pedidos = null;
          if (modo === 'parcial') {
            const fuera = entradas().find(inp => Number(inp.value) < 0 || Number(inp.value) > Number(inp.max));
            if (fuera) { fuera.focus(); throw new Error('La cantidad supera el saldo pendiente de acreditación (máximo ' + fuera.max + ').'); }
            pedidos = lineas().map(l => ({ productoId: l.productoId, cantidad: l.cantidad }));
            if (!pedidos.length) throw new Error('Se debe indicar al menos una cantidad a acreditar.');
          }
          const motivo = datos.motivo + (datos.detalle && datos.detalle.trim() ? ': ' + datos.detalle.trim() : '');
          const nc = App.intentar(() => App.acciones.notaCredito(f.id, pedidos, motivo, { reingresarStock: !!datos.reingresar }),
            r => 'Nota de crédito emitida: ' + App.nombreTipo(r.tipo) + ' ' + r.nro + ' por ' + ui.pesos(r.total) + '.');
          if (!nc) return false;
          cerrar();
          ui.ir('#/facturacion/comprobante/' + nc.id);
          return true;
        } }
      ]
    });
  }

  // ---------- detalle de un remito ----------
  function vistaRemito(el, id) {
    const r = App.get('remitos', id);
    if (!r) return noEncontrado(el, 'Remito no encontrado');
    const f = App.get('comprobantes', r.comprobanteId);
    const cli = App.get('clientes', r.clienteId) || {};
    const hr = r.hojaRutaId ? App.get('hojasRuta', r.hojaRutaId) : null;
    const titulo = 'Remito ' + r.nro;
    el.appendChild(ui.nodo(h`<div class="encabezado-vista">
      <div><div class="migas"><a href="#/facturacion">Facturación</a> / Remitos</div>
        <h1 class="titulo-vista">${titulo}</h1>
        <p class="bajada">${cli.razonSocial || ''}, ${ui.fechaLarga(r.fecha)}.</p></div>
      <div class="acciones">
        <button class="btn btn-primario" type="button" data-accion="imprimir">Imprimir remito</button>
        ${f ? h`<a class="btn btn-secundario" href="#/facturacion/comprobante/${f.id}">Ver factura</a>` : ''}
      </div></div>`));
    el.appendChild(ui.nodo(h`<div class="grilla-lado">
      <div class="vista-previa fac-previa">${ui.seguro(hojaHTML(r, 'R', 'ORIGINAL'))}</div>
      <div class="fac-lado"><div class="panel"><div class="panel-titulo">Entrega ${ui.estado(r.estado)}</div><dl class="datos">
        <dt>Depósito</dt><dd>${(App.get('depositos', r.depositoId) || {}).nombre || ''}</dd>
        <dt>Bultos</dt><dd>${ui.num(r.bultos)}</dd>
        <dt>Peso aproximado</dt><dd>${ui.num(r.kg)} kg</dd>
        <dt>Hoja de ruta</dt><dd>${hr ? hr.nro + ' del ' + ui.fecha(hr.fecha) : 'Sin asignar'}</dd>
        ${r.fechaEntrega ? h`<dt>Entregado el</dt><dd>${ui.fecha(r.fechaEntrega)}</dd>` : ''}
        ${r.obs ? h`<dt>Observaciones</dt><dd>${r.obs}</dd>` : ''}
        ${f ? h`<dt>Factura</dt><dd><a href="#/facturacion/comprobante/${f.id}">${App.nombreTipo(f.tipo)} ${f.nro}</a></dd>` : ''}
        <dt>Cliente</dt><dd><a href="#/clientes/${cli.id}">${cli.fantasia || cli.razonSocial || ''}</a></dd>
        <dt>Dirección</dt><dd>${cli.direccion || ''}, ${cli.localidad || ''}</dd>
      </dl>
      <p class="nota-discreta" style="margin:10px 0 0">El remito acompaña la mercadería y no es válido como factura. La entrega se registra en el módulo Entregas.</p>
      </div></div></div>`));
    el.querySelector('[data-accion="imprimir"]').addEventListener('click', () => imprimirDoc(r, 'R', titulo));
  }

  App.modulo({
    id: 'facturacion',
    titulo: 'Facturación',
    grupo: 'Comercial',
    orden: 30,
    icono: '<svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 2.5h10v15l-2-1.3-2 1.3-2-1.3-2 1.3-2-1.3z"/><path d="M8 7h4M8 10h4"/></svg>',
    render(el, params) {
      estilos();
      const [sub, id] = params || [];
      if (sub === 'comprobante' && id) return vistaComprobante(el, id);
      if (sub === 'remito' && id) return vistaRemito(el, id);
      return vistaLista(el);
    }
  });
})();
