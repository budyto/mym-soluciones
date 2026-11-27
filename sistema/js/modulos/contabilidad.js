/* Módulo «Contabilidad»: libro diario, mayor por cuenta, balance de sumas y saldos, plan de cuentas,
   libros de IVA Ventas y Compras y asiento manual.
   Todo se lee con App.q y lo único que escribe pasa por App.acciones.asientoManual (así queda en el
   registro de acciones y sobrevive a la recarga). Rutas:
     #/contabilidad/<pestaña>            diario | mayor | balance | plan | ivaventas | ivacompras | manual
     #/contabilidad/mayor/<cuenta>       mayor de una cuenta
     #/contabilidad/asiento/<id>         detalle de un asiento */
(function () {
  'use strict';
  const ui = App.ui, h = ui.h, q = App.q, F = App.f;

  const ORIGENES = {
    venta: 'Venta', nc: 'Nota de crédito', cmv: 'Costo de ventas', cobranza: 'Cobranza', compra: 'Compra',
    pago: 'Pago a proveedor', tesoreria: 'Tesorería', ajuste: 'Ajuste de stock', gasto: 'Gasto', impuesto: 'Impuestos',
    manual: 'Manual', apertura: 'Apertura'
  };
  const TIPOS = { activo: 'Activo', pasivo: 'Pasivo', patrimonio: 'Patrimonio neto', ingreso: 'Ingresos', egreso: 'Costos y gastos' };
  // Cuentas con libro auxiliar: sólo se mueven desde su módulo; si no, se descuadran con clientes, proveedores, cheques o stock.
  const AUXILIAR = {
    '1.1.03': 'Se registra a partir de los cheques: cobranzas, depósitos y pagos.',
    '1.1.04': 'Se registra a partir de facturas, notas de crédito y cobranzas.',
    '1.1.06': 'Se registra a partir de compras, ventas y ajustes de stock.',
    '2.1.01': 'Se registra a partir de facturas de compra y pagos a proveedores.'
  };
  const PESTANAS = ['diario', 'mayor', 'balance', 'plan', 'ivaventas', 'ivacompras', 'manual'];
  const PLANTILLAS = [
    { titulo: 'Pago de servicios', detalle: 'Pago de luz, gas e internet del depósito', lineas: ['5.3.03', '1.1.02'] },
    { titulo: 'Combustible en efectivo', detalle: 'Carga de combustible de los repartos', lineas: ['5.2.03', '1.1.01'] },
    { titulo: 'Mantenimiento de vehículos', detalle: 'Service y cubiertas de la camioneta de reparto', lineas: ['5.2.05', '1.1.02'] },
    { titulo: 'Pago de sueldos', detalle: 'Pago de sueldos devengados', lineas: ['2.1.03', '1.1.02'] },
    { titulo: 'Compra de equipos', detalle: 'Compra de una zorra hidráulica para el depósito', lineas: ['1.2.02', '1.1.05', '1.1.02'] },
    { titulo: 'Depósito de efectivo', detalle: 'Depósito de la recaudación en efectivo', lineas: ['1.1.02', '1.1.01'] }
  ];

  // ---------- estado de la pantalla (vive entre renders: con cada cambio del store se vuelve a dibujar todo) ----------
  const est = { listo: false, diario: {}, mayor: {}, balance: {}, ivaVentas: null, ivaCompras: null, borrador: null, ultimoManual: null };
  function iniciarEstado() {
    if (est.listo) return;
    const hoy = App.hoy(), ini = F.inicioMes(hoy);
    est.diario = { desde: ini, hasta: hoy, origen: '', cuenta: '', texto: '', mostrar: 25 };
    est.mayor = { cuenta: App.CUENTAS.banco, desde: ini, hasta: hoy };
    est.balance = { desde: App.config.desde, hasta: hoy };
    est.ivaVentas = est.ivaCompras = F.mes(hoy);
    est.borrador = borradorVacio();
    est.listo = true;
  }
  App.on('reinicio', () => { est.listo = false; est.ultimoManual = null; });
  function borradorVacio() { return { fecha: App.hoy(), detalle: '', lineas: [{ cuenta: '', debe: '', haber: '' }, { cuenta: '', debe: '', haber: '' }] }; }

  // ---------- ayudas ----------
  const cuenta = cod => App.get('planCuentas', cod) || { codigo: cod, nombre: cod, tipo: '' };
  const imputables = () => App.db.planCuentas.filter(c => c.imputable).sort((a, b) => a.codigo < b.codigo ? -1 : 1);
  const importe = n => n ? ui.pesos(n) : '';
  const signo = n => n < 0 ? 'cb-neg' : '';
  const meses = () => F.meses(App.config.desde, App.hoy()).reverse();
  // Cada pestaña dibuja en un contenedor nuevo, así los oyentes no se acumulan al redibujar.
  function fresco(panel) { panel.innerHTML = ''; const c = document.createElement('div'); panel.appendChild(c); return c; }
  function leerImporte(v) {
    let s = String(v == null ? '' : v).replace(/[$\s]/g, '');
    if (!s) return 0;
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    const n = Number(s);
    return isFinite(n) ? App.r2(n) : NaN;
  }
  function opcionesCuentas(elegida, conAuxiliar) {
    const grupos = {};
    imputables().forEach(c => { if (!conAuxiliar && AUXILIAR[c.codigo]) return; (grupos[c.tipo] = grupos[c.tipo] || []).push(c); });
    return ui.seguro(Object.keys(TIPOS).filter(t => grupos[t]).map(t => '<optgroup label="' + ui.escapar(TIPOS[t]) + '">' +
      grupos[t].map(c => '<option value="' + c.codigo + '"' + (c.codigo === elegida ? ' selected' : '') + '>' + ui.escapar(c.codigo + ' ' + c.nombre) + '</option>').join('') + '</optgroup>').join(''));
  }
  function filtroFecha(nombre, valor) {
    return h`<label class="cb-filtro"><span>${nombre}</span><input type="date" value="${valor}" min="${App.config.desde}" max="${App.hoy()}" data-campo="${nombre === 'Desde' ? 'desde' : 'hasta'}"></label>`;
  }
  function selectorMes(valor) {
    return h`<label class="cb-filtro"><span>Período</span><select data-campo="mes">${meses().map(m => h`<option value="${m}"${m === valor ? ' selected' : ''}>${F.nombreMes(m + '-01')}</option>`)}</select></label>`;
  }
  function rangoValido(o) { if (o.desde && o.hasta && o.desde > o.hasta) { const t = o.desde; o.desde = o.hasta; o.hasta = t; } }
  // Filtros: cada control con data-campo escribe en el objeto de estado y redibuja (redibujar devuelve el contenedor nuevo).
  function enlazarFiltros(c, o, redibujar) {
    c.querySelectorAll('.filtros [data-campo]').forEach(ctl => {
      const campo = ctl.dataset.campo;
      if (ctl.type === 'search') ui.buscador(ctl, () => {
        o[campo] = ctl.value;
        const nuevo = redibujar();
        const n = nuevo && nuevo.querySelector('[data-campo="' + campo + '"]');
        if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); }
      }, 250);
      else ctl.addEventListener('change', () => {
        if (ctl.type === 'date' && !ctl.value) return;
        o[campo] = ctl.value; rangoValido(o); redibujar();
      });
    });
  }

  const descargarCSV = (nombre, cabeza, filas) => ui.descargarCSV(nombre, cabeza, filas);

  // ---------- de dónde salió cada asiento ----------
  function origenDe(a) {
    const r = a && a.refId;
    if (!r) return null;
    switch (a.origen) {
      case 'venta': case 'nc': case 'cmv': { const c = App.get('comprobantes', r); return c && { texto: App.nombreTipo(c.tipo) + ' ' + c.nro, ruta: '#/facturacion/comprobante/' + c.id }; }
      case 'cobranza': { const rc = App.get('recibos', r); return rc && { texto: 'Recibo ' + rc.nro, ruta: '#/cobranzas/recibo/' + rc.id }; }
      case 'compra': { const f = App.get('comprasFacturas', r); return f && { texto: 'Factura de compra ' + f.tipo + ' ' + f.numero, ruta: '#/proveedores/' + f.proveedorId }; }
      case 'pago': { const p = App.get('pagos', r); return p && { texto: 'Orden de pago ' + p.nro, ruta: '#/proveedores/' + p.proveedorId }; }
      case 'tesoreria': { const ch = App.get('cheques', r); return ch && { texto: (ch.tipo === 'echeq' ? 'eCheq ' : 'Cheque ') + ch.banco + ' n.º ' + ch.numero, ruta: '#/cobranzas/cheque/' + ch.id }; }
      case 'ajuste': { const aj = App.get('ajustesStock', r); const p = aj && App.get('productos', aj.productoId); return aj && { texto: 'Ajuste de stock de ' + (p ? p.descripcion : aj.productoId), ruta: '#/stock/producto/' + aj.productoId }; }
    }
    return null;
  }
  function linkOrigen(a) {
    const o = origenDe(a);
    if (!o) return '';
    return o.ruta ? h`<a href="${o.ruta}">${o.texto}</a>` : h`<button type="button" class="cb-link" data-ver="${o.ver}">${o.texto}</button>`;
  }
  // ---------- validación propia del asiento manual (antes de llamar a la acción) ----------
  function validarManual(lineas, fecha) {
    const usadas = lineas.filter(l => l.cuenta || l.debe || l.haber);
    if (usadas.length < 2) throw new Error('El asiento necesita al menos dos renglones con cuenta e importe.');
    usadas.forEach((l, i) => {
      if (!l.cuenta) throw new Error('Falta la cuenta del renglón ' + (i + 1) + '.');
      if (AUXILIAR[l.cuenta]) throw new Error('La cuenta ' + cuenta(l.cuenta).nombre + ' tiene libro auxiliar. ' + AUXILIAR[l.cuenta]);
      if (isNaN(l.debe) || isNaN(l.haber)) throw new Error('El importe del renglón ' + (i + 1) + ' no es un número.');
      if (l.debe < 0 || l.haber < 0) throw new Error('Los importes deben ser positivos: la columna determina si van al debe o al haber.');
      if (!l.debe && !l.haber) throw new Error('Al renglón ' + (i + 1) + ' le falta el importe.');
      if (l.debe && l.haber) throw new Error('El renglón ' + (i + 1) + ' tiene importe en el debe y en el haber: cada renglón admite un solo lado.');
    });
    const d = App.r2(usadas.reduce((s, l) => s + l.debe, 0)), hb = App.r2(usadas.reduce((s, l) => s + l.haber, 0));
    if (Math.abs(d - hb) > 0.005) throw new Error('El asiento no balancea: el debe suma ' + ui.pesos(d) + ' y el haber ' + ui.pesos(hb) + '.');
    if (fecha && (fecha < App.config.desde || fecha > App.hoy())) throw new Error('La fecha debe estar entre el ' + ui.fecha(App.config.desde) + ' y hoy.');
    // Caja y banco no pueden quedar en rojo.
    [[App.CUENTAS.caja, 'la caja', true], [App.CUENTAS.banco, 'el banco', false]].forEach(([cod, nombre, admiteCero]) => {
      const mov = usadas.reduce((s, l) => s + (l.cuenta === cod ? l.debe - l.haber : 0), 0);
      if (!mov) return;
      const queda = App.r2(q.saldoCuenta(cod) + mov);
      if (admiteCero ? queda < 0 : queda <= 0) throw new Error('Con este asiento ' + nombre + ' queda en ' + ui.pesos(queda) + '. Se debe verificar el importe.');
    });
    return usadas.map(l => ({ cuenta: l.cuenta, debe: l.debe || 0, haber: l.haber || 0 }));
  }
  function contraasientoDe(a) {
    if (a.anuladoPor) return App.get('asientos', a.anuladoPor);
    return App.db.asientos.find(x => x.origen === 'manual' && !x.anulaAsientoId && x.detalle.startsWith('Contraasiento del n.º ' + a.numero + ':')) || null;
  }
  function anuladoPorEste(a) {
    if (a.anulaAsientoId) return App.get('asientos', a.anulaAsientoId);
    const m = a.origen === 'manual' && /^Contraasiento del n\.º (\d+):/.exec(a.detalle);
    return m ? App.db.asientos.find(y => y.numero === Number(m[1])) || null : null;
  }

  // ---------- estilos propios (prefijo cb-), una sola vez ----------
  function inyectarEstilos() {
    if (document.getElementById('estilos-contabilidad')) return;
    const s = document.createElement('style');
    s.id = 'estilos-contabilidad';
    s.textContent = `
.cb .filtros { align-items: flex-end; }
.cb-filtro { display: flex; flex-direction: column; gap: 4px; font-size: var(--fs-12); color: var(--texto-2); font-weight: 600; }
.cb-filtro input[type="date"] { width: 150px; }
.cb-filtro select { width: auto; min-width: 170px; max-width: 230px; }
.cb-filtro input[type="search"] { width: 210px; }
.cb-iva .tabla th, .cb-iva .tabla td { padding: 0 9px; }
.cb-iva .tabla td:has(.celda-sub) { padding-top: 4px; padding-bottom: 4px; }
.cb .filtros .cb-empuje { margin-left: auto; }
.cb-resumen { font-size: var(--fs-13); color: var(--texto-2); margin: -4px 0 12px; }
.cb-resumen strong { color: var(--tinta); font-weight: 600; }
.cb-diario td, .cb-diario th { height: 34px; }
/* el encabezado Fecha / Asiento / Cuenta / Debe / Haber queda fijo debajo de la barra superior */
@media (min-width: 761px) { .cb-diario-lugar .tabla-envoltura { overflow: visible; } .cb-diario thead th { position: sticky; top: 56px; z-index: 2; } }
.cb-diario tbody.cb-asiento tr.cb-cabeza td { background: var(--papel); height: 38px; border-top: 1px solid var(--linea); border-bottom: 1px solid var(--linea-suave); }
.cb-diario tbody.cb-asiento:first-of-type tr.cb-cabeza td { border-top: 0; }
.cb-diario tbody tr:hover { background: transparent; }
.cb-diario tbody.cb-asiento:hover tr.cb-cabeza td { background: #E6E9E3; }
.cb-diario tbody tr:last-child td { border-bottom: 1px solid var(--linea-suave); }
.cb-num { font-stretch: 122%; font-weight: 800; text-decoration: none; color: var(--tinta); letter-spacing: -.01em; white-space: nowrap; }
.cb-num:hover { text-decoration: underline; }
.cb-fecha-cel { display: none; }
.cb-diario td.cb-detalle-celda { white-space: normal; min-width: 320px; }
.cb-detalle { font-weight: 600; }
.cb-meta { color: var(--texto-2); font-size: var(--fs-12); margin-left: 10px; }
.cb-cod { color: var(--texto-2); font-size: var(--fs-13); font-variant-numeric: tabular-nums; }
.tabla td.cb-cta-haber { padding-left: 40px; }
.cb-cta-haber::before { content: 'a '; color: var(--texto-2); }
.cb-link { border: 0; background: none; padding: 0; font: inherit; color: var(--info); text-decoration: underline; cursor: pointer; text-align: left; }
.cb-neg { color: var(--peligro); }
.cb-mas { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; padding: 10px 12px; font-size: var(--fs-13); color: var(--texto-2); border-top: 1px solid var(--linea-suave); }
.tabla tr.cb-titulo-cuenta td { font-weight: 700; background: var(--papel); }
.tabla td.cb-sangria-2 { padding-left: 28px; } .tabla td.cb-sangria-3 { padding-left: 46px; }
.cb-estado-ok { color: var(--ok); font-weight: 600; } .cb-estado-mal { color: var(--peligro); font-weight: 600; }
.cb-cuadre { display: flex; flex-wrap: wrap; gap: 4px 18px; align-items: baseline; margin-bottom: 14px; }
.cb-cuadre .rotulo { font-size: var(--fs-20); font-weight: 800; }
.cb-renglones { width: 100%; border-collapse: collapse; }
.cb-renglones th { font-size: var(--fs-12); color: var(--texto-2); font-weight: 600; text-align: left; padding: 0 6px 6px; }
.cb-renglones td { padding: 4px 6px; vertical-align: top; }
.cb-renglones td.cb-n { width: 28px; color: var(--texto-2); font-size: var(--fs-13); padding-top: 13px; text-align: right; }
.cb-renglones select { min-width: 240px; }
.cb-renglones input { width: 150px; text-align: right; font-variant-numeric: tabular-nums; }
.cb-renglones .btn-icono { width: 36px; height: 36px; color: var(--texto-2); font-size: 20px; }
.cb-cuadro { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); border: 1px solid var(--linea); border-radius: var(--r-panel); margin: 14px 0 8px; background: var(--hoja); }
.cb-cuadro > div { padding: 10px 16px; }
.cb-cuadro > div + div { border-left: 1px solid var(--linea); }
.cb-cuadro span { display: block; font-size: var(--fs-12); color: var(--texto-2); }
.cb-cuadro strong { display: block; font-size: var(--fs-20); font-stretch: 118%; font-weight: 800; font-variant-numeric: tabular-nums; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cb-cuadro .cb-dif-ok { box-shadow: inset 0 -3px 0 var(--ok); }
.cb-cuadro .cb-dif-ok strong { color: var(--ok); }
.cb-cuadro .cb-dif-mal { box-shadow: inset 0 -3px 0 var(--senal); }
.cb-error { min-height: 18px; margin-bottom: 12px; }
.cb-plantillas { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 2px; }
.cb-nav-asiento { display: flex; gap: 8px; flex-wrap: wrap; }
.cb-ultimos > div + div { border-top: 1px solid var(--linea-suave); padding-top: 10px; }
@media (max-width: 760px) {
  .cb .filtros > * { flex: 1 1 140px; }
  .cb-filtro input[type="date"], .cb-filtro select, .cb-filtro input[type="search"] { width: 100%; min-width: 0; max-width: none; }
  .cb .filtros .cb-empuje { margin-left: 0; flex: 1 1 100%; justify-content: center; }
  .cb .segmentado { flex: 1 1 100%; }
  .cb .segmentado button { flex: 1; padding: 0 6px; }
  .cb-diario td.cb-detalle-celda { min-width: 250px; }
  .cb-meta { display: block; margin-left: 0; }
  .cb-diario th:first-child, .cb-diario td:first-child { display: none; }
  .cb-fecha-cel { display: block; font-size: var(--fs-12); color: var(--texto-2); }
  .cb-diario tr.cb-cabeza td { padding-top: 6px; padding-bottom: 6px; }
  .cb .cb-filtro > select, .cb .cb-filtro > input { flex: none; }
  .cb-renglones thead { display: none; }
  .cb-renglones tr { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 40px; gap: 6px 8px; padding: 10px 0; border-bottom: 1px solid var(--linea-suave); }
  .cb-renglones td { padding: 0; }
  .cb-renglones td.cb-n { display: none; }
  .cb-renglones td.cb-td-cuenta { grid-column: 1 / -1; }
  .cb-renglones td[data-titulo]::before { content: attr(data-titulo); display: block; font-size: var(--fs-12); color: var(--texto-2); font-weight: 600; margin-bottom: 3px; }
  .cb-renglones td.cb-td-quitar { align-self: end; }
  .cb-renglones select, .cb-renglones input { min-width: 0; width: 100%; }
  .cb-cuadro strong { font-size: var(--fs-14); }
  .cb-cuadro > div { padding: 8px 10px; }
  .cb-campo-detalle { grid-column: auto !important; }
}`;
    document.head.appendChild(s);
  }

  // =====================================================================
  // Libro diario
  // =====================================================================
  function asientosFiltrados() {
    const o = est.diario, t = ui.normalizar(o.texto).trim();
    return App.db.asientos.filter(a => {
      if (o.desde && a.fecha < o.desde) return false;
      if (o.hasta && a.fecha > o.hasta) return false;
      if (o.origen && a.origen !== o.origen) return false;
      if (o.cuenta && !a.lineas.some(l => l.cuenta === o.cuenta)) return false;
      if (t && !ui.coincide(t, a.detalle, String(a.numero))) return false;
      return true;
    // lo más nuevo arriba: es lo que se mira todos los días
    }).sort((a, b) => a.fecha > b.fecha ? -1 : a.fecha < b.fecha ? 1 : b.numero - a.numero);
  }
  const debePrimero = lineas => lineas.slice().sort((x, y) => (y.debe > 0) - (x.debe > 0));
  function tabDiario(panel) {
    const c = fresco(panel);
    const o = est.diario;
    const lista = asientosFiltrados();
    let td = 0, th = 0;
    lista.forEach(a => a.lineas.forEach(l => { td += l.debe; th += l.haber; }));
    const origenes = Object.keys(ORIGENES).filter(k => App.db.asientos.some(a => a.origen === k));
    c.innerHTML = h`
      <div class="filtros">
        ${filtroFecha('Desde', o.desde)}${filtroFecha('Hasta', o.hasta)}
        <label class="cb-filtro"><span>Origen</span><select data-campo="origen"><option value="">Todos los orígenes</option>${origenes.map(k => h`<option value="${k}"${k === o.origen ? ' selected' : ''}>${ORIGENES[k]}</option>`)}</select></label>
        <label class="cb-filtro"><span>Cuenta</span><select data-campo="cuenta"><option value="">Todas las cuentas</option>${opcionesCuentas(o.cuenta, true)}</select></label>
        <label class="cb-filtro"><span>Buscar</span><input type="search" data-campo="texto" placeholder="Detalle o n.º de asiento" value="${o.texto}"></label>
        <button type="button" class="btn btn-secundario cb-empuje" data-accion="csv">Exportar CSV</button>
      </div>
      <p class="cb-resumen"><strong>${ui.num(lista.length)} asientos</strong> entre el ${ui.fecha(o.desde)} y el ${ui.fecha(o.hasta)}. Debe ${ui.pesos(td)}, haber ${ui.pesos(th)}${Math.abs(td - th) < 0.05 ? '' : ' (no cuadra)'}.</p>
      <div class="cb-diario-lugar"></div>`;
    const lugar = c.querySelector('.cb-diario-lugar');
    function dibujarFilas() {
      if (!lista.length) { lugar.innerHTML = h`<div class="tabla-envoltura"><div class="vacio">No hay asientos con estos filtros. Se puede ampliar el rango de fechas o cambiar el origen.</div></div>`; return; }
      const ver = lista.slice(0, o.mostrar);
      const cuerpos = ver.map(a => h`<tbody class="cb-asiento">
        <tr class="cb-cabeza"><td>${ui.fecha(a.fecha)}</td><td><a class="cb-num" href="#/contabilidad/asiento/${a.id}">N.º ${ui.num(a.numero)}</a><span class="cb-fecha-cel">${ui.fecha(a.fecha)}</span></td>
          <td colspan="3" class="cb-detalle-celda"><span class="cb-detalle">${a.detalle}</span><span class="cb-meta">${ORIGENES[a.origen] || a.origen}${origenDe(a) ? ': ' : ''}${linkOrigen(a)}</span></td></tr>
        ${debePrimero(a.lineas).map(l => h`<tr><td></td><td class="cb-cod">${l.cuenta}</td>
          <td class="${l.haber > 0 ? 'cb-cta-haber' : ''}">${cuenta(l.cuenta).nombre}</td><td class="al-der">${importe(l.debe)}</td><td class="al-der">${importe(l.haber)}</td></tr>`)}
      </tbody>`);
      lugar.innerHTML = h`<div class="tabla-envoltura"><table class="tabla cb-diario">
        <thead><tr><th style="width:104px">Fecha</th><th style="width:110px">Asiento</th><th>Cuenta</th><th class="al-der" style="width:160px">Debe</th><th class="al-der" style="width:160px">Haber</th></tr></thead>
        ${cuerpos}
        <tfoot><tr><td></td><td></td><td>Totales de los ${ui.num(lista.length)} asientos filtrados</td><td class="al-der">${ui.pesos(td)}</td><td class="al-der">${ui.pesos(th)}</td></tr></tfoot>
      </table>
      ${lista.length > ver.length ? h`<div class="cb-mas">Se muestran ${ui.num(ver.length)} de ${ui.num(lista.length)} asientos. <button type="button" class="btn btn-secundario btn-chico" data-accion="mas">Mostrar 25 más</button><button type="button" class="btn btn-fantasma btn-chico" data-accion="todos">Mostrar todos</button></div>` : ''}</div>`;
    }
    dibujarFilas();
    enlazarFiltros(c, o, () => { o.mostrar = 25; return tabDiario(panel); });
    c.addEventListener('click', e => {
      const b = e.target.closest('[data-accion]');
      if (!b) return;
      if (b.dataset.accion === 'mas') { o.mostrar += 25; dibujarFilas(); }
      if (b.dataset.accion === 'todos') { o.mostrar = lista.length; dibujarFilas(); }
      if (b.dataset.accion === 'csv') {
        const filas = [];
        lista.slice().reverse().forEach(a => debePrimero(a.lineas).forEach(l => filas.push([ui.fecha(a.fecha), String(a.numero), a.detalle, ORIGENES[a.origen] || a.origen, (origenDe(a) || {}).texto || '', l.cuenta, cuenta(l.cuenta).nombre, l.debe, l.haber])));
        descargarCSV('libro-diario-' + o.desde + '-al-' + o.hasta + '.csv', ['Fecha', 'Asiento', 'Detalle', 'Origen', 'Comprobante', 'Cuenta', 'Nombre de la cuenta', 'Debe', 'Haber'], filas);
      }
    });
    return c;
  }

  // =====================================================================
  // Mayor por cuenta
  // =====================================================================
  function tabMayor(panel) {
    const cont = fresco(panel);
    const o = est.mayor;
    if (!App.get('planCuentas', o.cuenta) || !cuenta(o.cuenta).imputable) o.cuenta = App.CUENTAS.banco;
    const c = cuenta(o.cuenta);
    const m = q.mayor(o.cuenta, o.desde, o.hasta);
    const naturaleza = c.tipo === 'activo' || c.tipo === 'egreso' ? 'deudor' : 'acreedor';
    cont.innerHTML = h`
      <div class="filtros">
        <label class="cb-filtro"><span>Cuenta</span><select data-campo="cuenta">${opcionesCuentas(o.cuenta, true)}</select></label>
        ${filtroFecha('Desde', o.desde)}${filtroFecha('Hasta', o.hasta)}
        <button type="button" class="btn btn-secundario cb-empuje" data-accion="csv">Exportar CSV</button>
      </div>
      <h2 class="subtitulo" style="margin-bottom:4px">${c.codigo} ${c.nombre}</h2>
      <p class="cb-resumen">${TIPOS[c.tipo] || ''}, de saldo ${naturaleza}.${AUXILIAR[c.codigo] ? ' ' + AUXILIAR[c.codigo] : ''}</p>
      ${ui.franjaKpi([
        { titulo: 'Saldo al ' + ui.fecha(F.sumar(o.desde, -1)), valor: ui.pesos(m.saldoInicial) },
        { titulo: 'Debe del período', valor: ui.pesos(m.totalDebe), detalle: ui.num(m.movimientos.filter(x => x.debe > 0).length) + ' movimientos' },
        { titulo: 'Haber del período', valor: ui.pesos(m.totalHaber), detalle: ui.num(m.movimientos.filter(x => x.haber > 0).length) + ' movimientos' },
        { titulo: 'Saldo al ' + ui.fecha(o.hasta), valor: ui.pesos(m.saldoFinal), tono: m.saldoFinal < 0 ? 'peligro' : 'senal', detalle: m.saldoFinal < 0 ? 'Contrario a su naturaleza' : 'Saldo ' + naturaleza }
      ])}
      <div class="cb-tabla-lugar"></div>`;
    cont.querySelector('.cb-tabla-lugar').appendChild(ui.tabla({
      columnas: [
        { titulo: 'Fecha', campo: 'fecha', valor: x => ui.fecha(x.fecha), ancho: '104px' },
        { titulo: 'Asiento', clase: 'ocultar-celu', ordenar: x => x.numero, valor: x => h`<a class="cb-num" href="#/contabilidad/asiento/${x.asientoId}">N.º ${ui.num(x.numero)}</a>` },
        { titulo: 'Detalle', valor: x => h`${x.detalle}<span class="celda-sub">${ORIGENES[x.origen] || x.origen}${origenDe(App.get('asientos', x.asientoId)) ? ': ' : ''}${linkOrigen(App.get('asientos', x.asientoId))}</span>`, clase: 'envolver' },
        { titulo: 'Debe', clase: 'ocultar-celu', campo: 'debe', valor: x => importe(x.debe), alinear: 'der' },
        { titulo: 'Haber', clase: 'ocultar-celu', campo: 'haber', valor: x => importe(x.haber), alinear: 'der' },
        { titulo: 'Saldo', valor: x => h`<span class="${signo(x.saldo)}">${ui.pesos(x.saldo)}</span>`, alinear: 'der' }
      ],
      filas: m.movimientos,
      limite: 150,
      vacio: 'La cuenta no registra movimientos entre estas fechas.',
      alClic: x => ui.ir('#/contabilidad/asiento/' + x.asientoId),
      pie: ['', '', 'Totales del período', ui.pesos(m.totalDebe), ui.pesos(m.totalHaber), ui.pesos(m.saldoFinal)]
    }));
    enlazarFiltros(cont, o, () => { history.replaceState(null, '', '#/contabilidad/mayor/' + o.cuenta); return tabMayor(panel); });
    cont.querySelector('[data-accion="csv"]').addEventListener('click', () => {
      const filas = [['', '', 'Saldo inicial', '', null, null, m.saldoInicial]].concat(m.movimientos.map(x => [ui.fecha(x.fecha), String(x.numero), x.detalle, ORIGENES[x.origen] || x.origen, x.debe, x.haber, x.saldo]));
      descargarCSV('mayor-' + c.codigo + '-' + o.desde + '-al-' + o.hasta + '.csv', ['Fecha', 'Asiento', 'Detalle', 'Origen', 'Debe', 'Haber', 'Saldo'], filas);
    });
    return cont;
  }

  // =====================================================================
  // Balance de sumas y saldos
  // =====================================================================
  function tabBalance(panel) {
    const c = fresco(panel);
    const o = est.balance, hoy = App.hoy();
    const ss = q.sumasYSaldos(o.desde, o.hasta);
    let sd = 0, sa = 0;
    ss.filas.forEach(f => { sd += f.saldoDeudor; sa += f.saldoAcreedor; });
    sd = App.r2(sd); sa = App.r2(sa);
    const cuadra = Math.abs(ss.totalDebe - ss.totalHaber) < 0.05 && Math.abs(sd - sa) < 0.05;
    const mesAnt = F.sumar(F.inicioMes(hoy), -1);
    const atajos = [
      { id: 'apertura', texto: 'Desde la apertura', desde: App.config.desde, hasta: hoy },
      { id: 'mes', texto: 'Este mes', desde: F.inicioMes(hoy), hasta: hoy },
      { id: 'anterior', texto: 'Mes anterior', desde: F.inicioMes(mesAnt), hasta: mesAnt }
    ];
    c.innerHTML = h`
      <div class="filtros">
        <div class="segmentado" role="group" aria-label="Período">${atajos.map(a => h`<button type="button" data-atajo="${a.id}" aria-pressed="${a.desde === o.desde && a.hasta === o.hasta}">${a.texto}</button>`)}</div>
        ${filtroFecha('Desde', o.desde)}${filtroFecha('Hasta', o.hasta)}
        <button type="button" class="btn btn-secundario cb-empuje" data-accion="csv">Exportar CSV</button>
      </div>
      <div class="cb-cuadre">
        <span class="rotulo">${cuadra ? 'Las sumas cuadran' : 'Las sumas no cuadran'}</span>
        <span class="${cuadra ? 'cb-estado-ok' : 'cb-estado-mal'}">Debe ${ui.pesos(ss.totalDebe)} y haber ${ui.pesos(ss.totalHaber)}</span>
        <span class="texto-2 chico">Saldos deudores ${ui.pesos(sd)} y acreedores ${ui.pesos(sa)}. Al seleccionar una cuenta se abre su mayor.</span>
      </div>
      <div class="cb-tabla-lugar"></div>`;
    c.querySelector('.cb-tabla-lugar').appendChild(ui.tabla({
      columnas: [
        { titulo: 'Código', campo: 'codigo', clase: 'cb-cod ocultar-celu', ancho: '84px' },
        { titulo: 'Cuenta', campo: 'nombre', valor: f => h`<span class="celda-principal">${f.nombre}</span><span class="celda-sub">${TIPOS[f.tipo]}</span>` },
        { titulo: 'Debe', clase: 'ocultar-celu', campo: 'debe', valor: f => ui.pesos(f.debe), alinear: 'der' },
        { titulo: 'Haber', clase: 'ocultar-celu', campo: 'haber', valor: f => ui.pesos(f.haber), alinear: 'der' },
        { titulo: 'Saldo deudor', campo: 'saldoDeudor', valor: f => importe(f.saldoDeudor), alinear: 'der' },
        { titulo: 'Saldo acreedor', campo: 'saldoAcreedor', valor: f => importe(f.saldoAcreedor), alinear: 'der' }
      ],
      filas: ss.filas,
      vacio: 'Sin movimientos entre estas fechas.',
      alClic: f => { Object.assign(est.mayor, { cuenta: f.codigo, desde: o.desde, hasta: o.hasta }); ui.ir('#/contabilidad/mayor/' + f.codigo); },
      pie: ['', 'Totales', ui.pesos(ss.totalDebe), ui.pesos(ss.totalHaber), ui.pesos(sd), ui.pesos(sa)]
    }));
    c.querySelectorAll('[data-atajo]').forEach(b => b.addEventListener('click', () => {
      const a = atajos.find(x => x.id === b.dataset.atajo); o.desde = a.desde; o.hasta = a.hasta; tabBalance(panel);
    }));
    enlazarFiltros(c, o, () => tabBalance(panel));
    c.querySelector('[data-accion="csv"]').addEventListener('click', () => {
      descargarCSV('balance-sumas-y-saldos-' + o.desde + '-al-' + o.hasta + '.csv', ['Código', 'Cuenta', 'Tipo', 'Debe', 'Haber', 'Saldo deudor', 'Saldo acreedor'],
        ss.filas.map(f => [f.codigo, f.nombre, TIPOS[f.tipo], f.debe, f.haber, f.saldoDeudor, f.saldoAcreedor]).concat([['', 'Totales', '', ss.totalDebe, ss.totalHaber, sd, sa]]));
    });
    return c;
  }

  // =====================================================================
  // Plan de cuentas
  // =====================================================================
  function tabPlan(panel) {
    const cont = fresco(panel);
    const plan = App.db.planCuentas.slice().sort((a, b) => {
      const x = a.codigo.split('.').map(Number), y = b.codigo.split('.').map(Number);
      for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d; }
      return 0;
    });
    const saldo = {}, movs = {};
    App.db.asientos.forEach(a => a.lineas.forEach(l => { movs[l.cuenta] = (movs[l.cuenta] || 0) + 1; }));
    plan.forEach(c => { if (c.imputable) saldo[c.codigo] = q.saldoCuenta(c.codigo); });
    // Las cuentas de título suman a sus hijas (cada saldo ya viene con el signo según la naturaleza de su tipo).
    plan.forEach(c => { if (!c.imputable) saldo[c.codigo] = App.r2(plan.filter(x => x.imputable && x.codigo.startsWith(c.codigo + '.')).reduce((s, x) => s + saldo[x.codigo], 0)); });
    const nivel = c => Math.min(c.codigo.split('.').length, 3);
    cont.innerHTML = h`
      <div class="filtros"><p class="cb-resumen" style="margin:0">${plan.filter(c => c.imputable).length} cuentas imputables agrupadas en ${plan.filter(c => !c.imputable).length} cuentas de título. Saldos al ${ui.fecha(App.hoy())}; al seleccionar una cuenta se abre su mayor.</p>
        <button type="button" class="btn btn-secundario cb-empuje" data-accion="csv">Exportar CSV</button></div>
      <div class="tabla-envoltura"><table class="tabla">
        <thead><tr><th style="width:90px">Código</th><th>Cuenta</th><th>Tipo</th><th>Uso</th><th class="al-der">Movimientos</th><th class="al-der">Saldo</th></tr></thead>
        <tbody>${plan.map(c => h`<tr class="${c.imputable ? 'clicable' : 'cb-titulo-cuenta'}"${c.imputable ? h` tabindex="0" data-cuenta="${c.codigo}"` : ''}>
          <td class="cb-cod">${c.codigo}</td>
          <td class="cb-sangria-${nivel(c)}${AUXILIAR[c.codigo] ? ' envolver' : ''}">${c.nombre}${AUXILIAR[c.codigo] ? h`<span class="celda-sub">Con libro auxiliar. ${AUXILIAR[c.codigo]}</span>` : ''}</td>
          <td>${TIPOS[c.tipo] || ''}</td>
          <td>${c.imputable ? 'Imputable' : h`<span class="texto-2">Título</span>`}</td>
          <td class="al-der">${c.imputable ? ui.num(movs[c.codigo] || 0) : ''}</td>
          <td class="al-der ${signo(saldo[c.codigo])}">${ui.pesos(saldo[c.codigo])}</td></tr>`)}</tbody>
      </table></div>`;
    const abrir = cod => { est.mayor.cuenta = cod; ui.ir('#/contabilidad/mayor/' + cod); };
    cont.querySelectorAll('tr[data-cuenta]').forEach(tr => {
      tr.addEventListener('click', () => abrir(tr.dataset.cuenta));
      tr.addEventListener('keydown', e => { if (e.key === 'Enter') abrir(tr.dataset.cuenta); });
    });
    cont.querySelector('[data-accion="csv"]').addEventListener('click', () => {
      descargarCSV('plan-de-cuentas.csv', ['Código', 'Cuenta', 'Tipo', 'Imputable', 'Movimientos', 'Saldo al ' + ui.fecha(App.hoy())],
        plan.map(c => [c.codigo, c.nombre, TIPOS[c.tipo] || '', c.imputable ? 'Sí' : 'No', c.imputable ? String(movs[c.codigo] || 0) : '', saldo[c.codigo]]));
    });
    return cont;
  }

  // =====================================================================
  // Libros de IVA
  // =====================================================================
  function posicionIVA(mes) {
    const v = q.libroIVAVentas(mes).totales, c = q.libroIVACompras(mes).totales;
    const nombre = F.nombreMes(mes + '-01');
    const liq = App.db.asientos.find(a => a.origen === 'impuesto' && a.detalle.startsWith('Liquidación de IVA de ' + nombre));
    const saldo = App.r2(v.iva - c.iva);
    return h`<div class="panel"><h3 class="panel-titulo">Posición de IVA de ${nombre}</h3>
      <dl class="datos">
        <dt>Débito fiscal (ventas)</dt><dd>${ui.pesos(v.iva)}</dd>
        <dt>Crédito fiscal (compras)</dt><dd>${ui.pesos(c.iva)}</dd>
        <dt><strong>Saldo técnico ${saldo >= 0 ? 'a pagar' : 'a favor'}</strong></dt><dd><strong class="${saldo < 0 ? 'ok' : ''}">${ui.pesos(Math.abs(saldo))}</strong></dd>
      </dl>
      <p class="nota-discreta" style="margin-top:12px">${liq ? h`Se liquidó en el <a href="#/contabilidad/asiento/${liq.id}">asiento n.º ${ui.num(liq.numero)}</a> del ${ui.fecha(liq.fecha)}, que también computa el crédito fiscal de meses anteriores.` : 'Pendiente de liquidación: el asiento se registra entre el 18 y el 20 del mes siguiente y computa el crédito fiscal de meses anteriores.'}</p>
    </div>`;
  }
  function panelAlicuotas(t, titulo) {
    return h`<div class="panel"><h3 class="panel-titulo">${titulo}</h3>
      <div class="tabla-envoltura"><table class="tabla"><thead><tr><th>Alícuota</th><th class="al-der">Neto gravado</th><th class="al-der">IVA</th><th class="al-der">Total</th></tr></thead>
      <tbody><tr><td>21 %</td><td class="al-der">${ui.pesos(t.neto21)}</td><td class="al-der">${ui.pesos(t.iva21)}</td><td class="al-der">${ui.pesos(t.neto21 + t.iva21)}</td></tr>
      <tr><td>10,5 %</td><td class="al-der">${ui.pesos(t.neto105)}</td><td class="al-der">${ui.pesos(t.iva105)}</td><td class="al-der">${ui.pesos(t.neto105 + t.iva105)}</td></tr></tbody>
      <tfoot><tr><td>Total</td><td class="al-der">${ui.pesos(t.neto)}</td><td class="al-der">${ui.pesos(t.iva)}</td><td class="al-der">${ui.pesos(t.total)}</td></tr></tfoot></table></div></div>`;
  }
  function tabIVA(panel, tipo) {
    const cont = fresco(panel);
    const ventas = tipo === 'ventas';
    const mes = ventas ? est.ivaVentas : est.ivaCompras;
    const lib = ventas ? q.libroIVAVentas(mes) : q.libroIVACompras(mes);
    const t = lib.totales;
    const nombreMes = F.nombreMes(mes + '-01');
    const ncs = lib.filas.filter(f => f.total < 0).length;
    cont.innerHTML = h`
      <div class="filtros">${selectorMes(mes)}
        <p class="cb-resumen" style="margin:0 0 9px">${ventas ? 'Facturas y notas de crédito emitidas, punto de venta 0003.' : 'Facturas de mercadería de los proveedores y facturas de gastos (alquiler, combustible, fletes, servicios, honorarios).'}</p>
        <button type="button" class="btn btn-secundario cb-empuje" data-accion="csv">Exportar CSV</button></div>
      ${ui.franjaKpi([
        { titulo: 'Neto gravado', valor: ui.pesosCorto(t.neto), detalle: ui.pesos(t.neto) },
        { titulo: 'IVA 21 %', valor: ui.pesosCorto(t.iva21), detalle: 'Sobre ' + ui.pesos(t.neto21) },
        { titulo: 'IVA 10,5 %', valor: ui.pesosCorto(t.iva105), detalle: 'Sobre ' + ui.pesos(t.neto105) },
        { titulo: ventas ? 'Total facturado' : 'Total comprado', valor: ui.pesosCorto(t.total), tono: 'senal', detalle: ui.num(lib.filas.length) + ' comprobantes' + (ncs ? ', ' + ncs + ' notas de crédito' : '') }
      ])}
      <div class="cb-tabla-lugar"></div>
      <div class="grilla-2" style="margin-top:16px">${panelAlicuotas(t, 'Totales por alícuota de ' + nombreMes)}${posicionIVA(mes)}</div>`;
    const monto = campo => f => h`<span class="${signo(f[campo])}">${importe(f[campo])}</span>`;
    const columnas = [
      { titulo: 'Fecha', clase: 'ocultar-celu', campo: 'fecha', valor: f => ui.fecha(f.fecha), ancho: '100px' },
      { titulo: 'Comprobante', ordenar: f => f.tipo + f.nro, valor: f => h`<span class="celda-principal">${f.nombreTipo}</span><span class="celda-sub">${f.nro}</span>` },
      { titulo: ventas ? 'Cliente' : 'Proveedor', campo: 'razonSocial', valor: f => h`${f.razonSocial}<span class="celda-sub">CUIT ${f.cuit || '—'}${ventas ? ', ' + f.condicionIVA : f.concepto ? ', ' + f.concepto.toLowerCase() : ''}</span>` }
    ];
    columnas.push(
      { titulo: 'Neto 21 %', clase: 'ocultar-celu', campo: 'neto21', valor: monto('neto21'), alinear: 'der' },
      { titulo: 'IVA 21 %', clase: 'ocultar-celu', campo: 'iva21', valor: monto('iva21'), alinear: 'der' },
      { titulo: 'Neto 10,5 %', clase: 'ocultar-celu', campo: 'neto105', valor: monto('neto105'), alinear: 'der' },
      { titulo: 'IVA 10,5 %', clase: 'ocultar-celu', campo: 'iva105', valor: monto('iva105'), alinear: 'der' });
    if (!ventas) columnas.push(
      { titulo: 'No gravado', clase: 'ocultar-celu', campo: 'noGravado', valor: monto('noGravado'), alinear: 'der' },
      { titulo: 'Percepciones', clase: 'ocultar-celu', campo: 'percepciones', valor: monto('percepciones'), alinear: 'der' });
    columnas.push(
      { titulo: 'Total', campo: 'total', valor: f => h`<strong class="${signo(f.total)}">${ui.pesos(f.total)}</strong>`, alinear: 'der' });
    const pie = ['', '', 'Totales del mes'].concat((ventas ? [t.neto21, t.iva21, t.neto105, t.iva105, t.total] : [t.neto21, t.iva21, t.neto105, t.iva105, t.noGravado, t.percepciones, t.total]).map(n => ui.pesos(n)));
    cont.querySelector('.cb-tabla-lugar').appendChild(ui.tabla({
      columnas, filas: lib.filas, limite: 200, pie, clase: 'cb-iva',
      vacio: ventas ? 'Sin comprobantes de venta en ' + nombreMes + '.' : 'Sin facturas de compra registradas en ' + nombreMes + '.',
      filaClase: f => f.total < 0 ? 'fila-alerta' : '',
      alClic: f => ui.ir(ventas ? '#/facturacion/comprobante/' + f.comprobanteId : f.asientoId ? '#/contabilidad/asiento/' + f.asientoId : '#/proveedores/' + (App.get('comprasFacturas', f.facturaId) || {}).proveedorId)
    }));
    cont.querySelector('[data-campo="mes"]').addEventListener('change', e => { if (ventas) est.ivaVentas = e.target.value; else est.ivaCompras = e.target.value; tabIVA(panel, tipo); });
    cont.querySelector('[data-accion="csv"]').addEventListener('click', () => {
      const cab = ['Fecha', 'Tipo', 'Punto de venta y número', ventas ? 'Cliente' : 'Proveedor', 'CUIT', 'Condición IVA', 'Neto gravado 21 %', 'IVA 21 %', 'Neto gravado 10,5 %', 'IVA 10,5 %', 'Neto gravado total', 'IVA total', 'Total'];
      const filas = lib.filas.map(f => [ui.fecha(f.fecha), f.nombreTipo, f.nro, f.razonSocial, f.cuit, f.condicionIVA, f.neto21, f.iva21, f.neto105, f.iva105, f.neto, f.iva, f.total]);
      filas.push(['', '', '', 'Totales', '', '', t.neto21, t.iva21, t.neto105, t.iva105, t.neto, t.iva, t.total]);
      descargarCSV('libro-iva-' + tipo + '-' + mes + '.csv', cab, filas);
    });
    return cont;
  }

  // =====================================================================
  // Asiento manual
  // =====================================================================
  function tabManual(panel) {
    const cont = fresco(panel);
    const b = est.borrador;
    const ultimos = App.db.asientos.filter(a => a.origen === 'manual').slice(-6).reverse();
    const hecho = est.ultimoManual && App.get('asientos', est.ultimoManual);
    cont.innerHTML = h`<div class="grilla-lado">
      <div class="panel">
        ${hecho ? h`<div class="aviso aviso-ok" style="margin-bottom:14px"><span>Asiento n.º ${ui.num(hecho.numero)} registrado por ${ui.pesos(hecho.total)}. <a href="#/contabilidad/asiento/${hecho.id}">Ver asiento</a></span></div>` : ''}
        <h2 class="panel-titulo">Nuevo asiento</h2>
        <div class="form-grilla">
          <div class="campo"><label for="cb-fecha">Fecha</label><input type="date" id="cb-fecha" value="${b.fecha}" min="${App.config.desde}" max="${App.hoy()}"></div>
          <div class="campo cb-campo-detalle" style="grid-column: span 2"><label for="cb-detalle">Detalle</label><input type="text" id="cb-detalle" value="${b.detalle}" placeholder="Ejemplo: pago de la factura de energía eléctrica de noviembre" maxlength="140"></div>
          <div class="campo ancho-total"><span class="etiqueta-campo">Modelos de asiento</span>
            <div class="cb-plantillas">${PLANTILLAS.map((p, i) => h`<button type="button" class="btn btn-secundario btn-chico" data-plantilla="${i}">${p.titulo}</button>`)}</div></div>
        </div>
        <h3 class="seccion-titulo" style="margin-top:20px">Renglones</h3>
        <div class="cb-renglones-envoltura"><table class="cb-renglones"><thead><tr><th></th><th>Cuenta</th><th style="text-align:right">Debe</th><th style="text-align:right">Haber</th><th></th></tr></thead><tbody></tbody></table></div>
        <button type="button" class="btn btn-fantasma" data-accion="agregar" style="margin-top:6px">Agregar renglón</button>
        <div class="cb-cuadro" aria-live="polite"></div>
        <p class="campo-error cb-error"></p>
        <div class="fila">
          <button type="button" class="btn btn-senal btn-grande" data-accion="registrar">Registrar asiento</button>
          <button type="button" class="btn btn-fantasma" data-accion="vaciar">Limpiar formulario</button>
        </div>
      </div>
      <div>
        <div class="panel"><h3 class="panel-titulo">Criterios de registración</h3>
          <div class="pila chico texto-2">
            <p>Cada renglón se imputa al debe o al haber; el asiento se registra únicamente cuando ambos lados suman lo mismo.</p>
            <p>Ventas, compras, cobranzas, pagos y ajustes de stock se asientan en forma automática desde sus módulos. Aquí se registran gastos, pagos de impuestos y reclasificaciones.</p>
            <p>Deudores por ventas, Proveedores, Valores a depositar y Mercaderías no están disponibles: tienen libro auxiliar y sólo se registran desde su módulo, para que siempre concilien con las cuentas corrientes, los cheques y el stock.</p>
          </div></div>
        <div class="panel"><h3 class="panel-titulo">Últimos asientos manuales</h3>
          ${ultimos.length ? h`<div class="pila cb-ultimos">${ultimos.map(a => h`<div><a class="cb-num" href="#/contabilidad/asiento/${a.id}">N.º ${ui.num(a.numero)}</a> <span class="texto-2 chico">${ui.fecha(a.fecha)}, ${ui.pesos(a.total)}</span><div class="chico">${a.detalle}</div></div>`)}</div>`
            : h`<p class="texto-2 chico">Sin asientos manuales registrados. Los gastos mensuales de los datos de ejemplo figuran en el libro diario con origen «Gasto».</p>`}
        </div>
      </div></div>`;

    const cuerpo = cont.querySelector('.cb-renglones tbody');
    const cuadro = cont.querySelector('.cb-cuadro');
    const ayuda = cont.querySelector('.cb-error');
    const btnReg = cont.querySelector('[data-accion="registrar"]');
    function dibujarRenglones() {
      cuerpo.innerHTML = h`${b.lineas.map((l, i) => h`<tr data-i="${i}">
        <td class="cb-n">${i + 1}</td>
        <td class="cb-td-cuenta" data-titulo="Cuenta del renglón ${i + 1}"><select data-c="cuenta" aria-label="Cuenta del renglón ${i + 1}"><option value="">Seleccionar cuenta</option>${opcionesCuentas(l.cuenta, false)}</select></td>
        <td data-titulo="Debe"><input type="text" inputmode="decimal" autocomplete="off" data-c="debe" value="${l.debe}" placeholder="0,00" aria-label="Debe del renglón ${i + 1}"></td>
        <td data-titulo="Haber"><input type="text" inputmode="decimal" autocomplete="off" data-c="haber" value="${l.haber}" placeholder="0,00" aria-label="Haber del renglón ${i + 1}"></td>
        <td class="cb-td-quitar"><button type="button" class="btn btn-icono btn-fantasma" data-quitar="${i}" aria-label="Quitar el renglón ${i + 1}"${b.lineas.length <= 2 ? ' disabled' : ''}>×</button></td></tr>`)}`;
      actualizarCuadro();
    }
    function lineasLeidas() { return b.lineas.map(l => ({ cuenta: l.cuenta, debe: leerImporte(l.debe), haber: leerImporte(l.haber) })); }
    function actualizarCuadro() {
      const ls = lineasLeidas();
      const d = App.r2(ls.reduce((s, l) => s + (l.debe || 0), 0)), hb = App.r2(ls.reduce((s, l) => s + (l.haber || 0), 0));
      const dif = App.r2(d - hb);
      let error = '';
      try { validarManual(ls, b.fecha); if (!b.detalle.trim()) error = 'Falta el detalle del asiento.'; } catch (e) { error = e.message; }
      const balancea = d > 0 && Math.abs(dif) < 0.005;
      cuadro.innerHTML = h`<div><span>Debe</span><strong>${ui.pesos(d)}</strong></div><div><span>Haber</span><strong>${ui.pesos(hb)}</strong></div>
        <div class="${balancea ? 'cb-dif-ok' : 'cb-dif-mal'}"><span>${balancea ? 'Balancea' : d === 0 && hb === 0 ? 'Diferencia' : dif > 0 ? 'Falta al haber' : 'Falta al debe'}</span><strong>${balancea ? 'Sin diferencia' : ui.pesos(Math.abs(dif))}</strong></div>`;
      // El motivo se muestra recién cuando ya hay algún importe cargado.
      ayuda.textContent = (d > 0 || hb > 0) ? error : '';
      btnReg.disabled = !!error;
    }
    cuerpo.addEventListener('input', e => {
      const tr = e.target.closest('tr'); if (!tr) return;
      const l = b.lineas[Number(tr.dataset.i)], c = e.target.dataset.c;
      l[c] = e.target.value;
      if ((c === 'debe' || c === 'haber') && e.target.value.trim()) {
        const otro = c === 'debe' ? 'haber' : 'debe';
        if (l[otro]) { l[otro] = ''; tr.querySelector('[data-c="' + otro + '"]').value = ''; }
      }
      actualizarCuadro();
    });
    cuerpo.addEventListener('change', e => {
      const tr = e.target.closest('tr'); if (!tr) return;
      const c = e.target.dataset.c, l = b.lineas[Number(tr.dataset.i)];
      if (c === 'debe' || c === 'haber') { const n = leerImporte(e.target.value); if (n && !isNaN(n)) { e.target.value = ui.num(n, 2); l[c] = e.target.value; } }
      if (c === 'cuenta') l.cuenta = e.target.value;
      actualizarCuadro();
    });
    cuerpo.addEventListener('click', e => {
      const x = e.target.closest('[data-quitar]'); if (!x) return;
      b.lineas.splice(Number(x.dataset.quitar), 1); dibujarRenglones();
    });
    cont.querySelector('#cb-fecha').addEventListener('change', e => { b.fecha = e.target.value; actualizarCuadro(); });
    cont.querySelector('#cb-detalle').addEventListener('input', e => { b.detalle = e.target.value; actualizarCuadro(); });
    cont.querySelectorAll('[data-plantilla]').forEach(bt => bt.addEventListener('click', () => {
      const p = PLANTILLAS[Number(bt.dataset.plantilla)];
      b.lineas = p.lineas.map(cod => ({ cuenta: cod, debe: '', haber: '' }));
      b.detalle = p.detalle; cont.querySelector('#cb-detalle').value = p.detalle;
      if (est.ultimoManual) { est.ultimoManual = null; const av = cont.querySelector('.aviso-ok'); if (av) av.remove(); }
      dibujarRenglones();
      const primero = cuerpo.querySelector('tr[data-i="0"] [data-c="debe"]');
      if (primero) primero.focus();
    }));
    cont.querySelector('[data-accion="agregar"]').addEventListener('click', () => {
      b.lineas.push({ cuenta: '', debe: '', haber: '' }); dibujarRenglones();
      const s = cuerpo.querySelector('tr:last-child select'); if (s) s.focus();
    });
    cont.querySelector('[data-accion="vaciar"]').addEventListener('click', () => { est.borrador = borradorVacio(); est.ultimoManual = null; tabManual(panel); });
    btnReg.addEventListener('click', () => {
      let lineas;
      try {
        if (!b.detalle.trim()) throw new Error('El asiento debe tener un detalle.');
        lineas = validarManual(lineasLeidas(), b.fecha);
      } catch (e) { ui.toast(e.message, 'peligro'); return; }
      const detalle = b.detalle.trim(), fecha = b.fecha;
      // La acción emite 'cambio' (en una microtarea) y la pantalla se redibuja sola con el aviso y el formulario vacío.
      const a = App.intentar(() => App.acciones.asientoManual({ fecha, detalle, lineas }), x => 'Asiento n.º ' + ui.num(x.numero) + ' registrado');
      if (a) { est.ultimoManual = a.id; est.borrador = borradorVacio(); }
    });
    dibujarRenglones();
    return cont;
  }

  // =====================================================================
  // Detalle de un asiento
  // =====================================================================
  function vistaAsiento(raiz, id) {
    const a = App.get('asientos', id);
    if (!a) {
      raiz.innerHTML = h`<div class="vacio vacio-grande"><h1 class="titulo-vista">Asiento no encontrado</h1><p>Puede que el enlace esté mal o que ya no exista.</p><a class="btn btn-primario" href="#/contabilidad/diario">Ir al libro diario</a></div>`;
      return;
    }
    const lista = App.db.asientos;
    const i = lista.indexOf(a), ant = lista[i - 1], sig = lista[i + 1];
    const o = origenDe(a);
    const contra = a.origen === 'manual' && contraasientoDe(a);
    const anulado = anuladoPorEste(a);
    const anulable = a.origen === 'manual' && !contra && !anulado;
    const lineas = debePrimero(a.lineas);
    raiz.innerHTML = h`
      <nav class="migas"><a href="#/contabilidad/diario">Contabilidad</a> / <a href="#/contabilidad/diario">Libro diario</a> / Asiento n.º ${ui.num(a.numero)}</nav>
      <div class="encabezado-vista"><div><h1 class="titulo-vista">Asiento n.º ${ui.num(a.numero)}</h1><p class="bajada">${a.detalle}</p></div>
        <div class="acciones botones">
          <button type="button" class="btn btn-secundario" data-accion="imprimir">Imprimir asiento</button>
          ${anulable ? h`<button type="button" class="btn btn-peligro" data-accion="anular">Anular con contraasiento</button>` : ''}
        </div></div>
      ${contra ? h`<div class="aviso aviso-alerta" style="margin-bottom:16px"><span>Este asiento está anulado por el <a href="#/contabilidad/asiento/${contra.id}">asiento n.º ${ui.num(contra.numero)}</a> del ${ui.fecha(contra.fecha)}.</span></div>` : ''}
      <div class="grilla-lado">
        <div>
          <div class="tabla-envoltura"><table class="tabla">
            <thead><tr><th style="width:90px">Código</th><th>Cuenta</th><th class="al-der">Debe</th><th class="al-der">Haber</th></tr></thead>
            <tbody>${lineas.map(l => h`<tr class="clicable" tabindex="0" data-cuenta="${l.cuenta}"><td class="cb-cod">${l.cuenta}</td><td class="${l.haber > 0 ? 'cb-cta-haber' : ''}">${cuenta(l.cuenta).nombre}</td><td class="al-der">${importe(l.debe)}</td><td class="al-der">${importe(l.haber)}</td></tr>`)}</tbody>
            <tfoot><tr><td></td><td>Totales</td><td class="al-der">${ui.pesos(a.total)}</td><td class="al-der">${ui.pesos(a.total)}</td></tr></tfoot>
          </table></div>
          <p class="nota-discreta" style="margin-top:8px">Al seleccionar una cuenta se abre su mayor del mes de este asiento.</p>
        </div>
        <div class="panel"><dl class="datos">
          <dt>Fecha</dt><dd>${ui.fechaLarga(a.fecha)}</dd>
          <dt>Origen</dt><dd>${ORIGENES[a.origen] || a.origen}</dd>
          <dt>Comprobante</dt><dd>${o ? linkOrigen(a) : h`<span class="texto-2">${a.origen === 'manual' || a.origen === 'apertura' ? 'Asiento manual' : 'Sin comprobante: asiento de cierre mensual'}</span>`}</dd>
          <dt>Importe</dt><dd><strong>${ui.pesos(a.total)}</strong></dd>
          ${anulado ? h`<dt>Anula</dt><dd><a href="#/contabilidad/asiento/${anulado.id}">Asiento n.º ${ui.num(anulado.numero)}</a></dd>` : ''}
        </dl>
        <div class="cb-nav-asiento" style="margin-top:16px">
          ${ant ? h`<a class="btn btn-secundario btn-chico" href="#/contabilidad/asiento/${ant.id}">Anterior: n.º ${ui.num(ant.numero)}</a>` : ''}
          ${sig ? h`<a class="btn btn-secundario btn-chico" href="#/contabilidad/asiento/${sig.id}">Siguiente: n.º ${ui.num(sig.numero)}</a>` : ''}
        </div></div>
      </div>`;
    const abrir = cod => { Object.assign(est.mayor, { cuenta: cod, desde: F.inicioMes(a.fecha), hasta: F.finMes(a.fecha) > App.hoy() ? App.hoy() : F.finMes(a.fecha) }); ui.ir('#/contabilidad/mayor/' + cod); };
    raiz.querySelectorAll('tr[data-cuenta]').forEach(tr => {
      tr.addEventListener('click', () => abrir(tr.dataset.cuenta));
      tr.addEventListener('keydown', e => { if (e.key === 'Enter') abrir(tr.dataset.cuenta); });
    });
    raiz.querySelector('[data-accion="imprimir"]').addEventListener('click', () => {
      const html = h`<div style="padding:8mm 4mm;font-family:Archivo,sans-serif">
        <div style="display:flex;justify-content:space-between;align-items:baseline;border-bottom:1.5px solid #000;padding-bottom:6px;margin-bottom:12px">
          <div><strong>${App.config.razonSocial}</strong><div style="font-size:12px">CUIT ${App.config.cuit}</div></div>
          <div style="text-align:right"><div class="titulo-vista" style="font-size:22px">Asiento n.º ${ui.num(a.numero)}</div><div>${ui.fecha(a.fecha)}</div></div></div>
        <p style="margin:0 0 12px">${a.detalle}${o ? h` (${o.texto})` : ''}</p>
        <table class="tabla"><thead><tr><th>Código</th><th>Cuenta</th><th class="al-der">Debe</th><th class="al-der">Haber</th></tr></thead>
        <tbody>${lineas.map(l => h`<tr><td>${l.cuenta}</td><td style="${l.haber > 0 ? 'padding-left:40px' : ''}">${l.haber > 0 ? 'a ' : ''}${cuenta(l.cuenta).nombre}</td><td class="al-der">${importe(l.debe)}</td><td class="al-der">${importe(l.haber)}</td></tr>`)}</tbody>
        <tfoot><tr><td></td><td>Totales</td><td class="al-der">${ui.pesos(a.total)}</td><td class="al-der">${ui.pesos(a.total)}</td></tr></tfoot></table>
        <p style="margin-top:28px;font-size:11px;color:#555">Origen: ${ORIGENES[a.origen] || a.origen}. Impreso desde el sistema de gestión de ${App.config.negocio}.</p></div>`;
      ui.imprimir(html, { titulo: 'Asiento ' + a.numero });
    });
    const btnAnular = raiz.querySelector('[data-accion="anular"]');
    if (btnAnular) btnAnular.addEventListener('click', async () => {
      const ok = await ui.confirmar('Se registra hoy un asiento con los mismos importes del n.º ' + ui.num(a.numero) + ' pero del lado contrario. Los dos quedan en el libro diario.', { titulo: 'Anular el asiento n.º ' + ui.num(a.numero), aceptar: 'Anular con contraasiento', tipo: 'peligro' });
      if (!ok) return;
      let lineasC;
      try { lineasC = validarManual(a.lineas.map(l => ({ cuenta: l.cuenta, debe: l.haber, haber: l.debe })), App.hoy()); }
      catch (e) { ui.toast(e.message, 'peligro'); return; }
      const c = App.intentar(() => App.acciones.asientoManual({ fecha: App.hoy(), detalle: 'Contraasiento del n.º ' + a.numero + ': ' + a.detalle, lineas: lineasC, anulaAsientoId: a.id }), x => 'Asiento n.º ' + ui.num(a.numero) + ' anulado con el n.º ' + ui.num(x.numero));
      if (c) ui.ir('#/contabilidad/asiento/' + c.id);
    });
  }

  // =====================================================================
  // Encabezado y pestañas
  // =====================================================================
  function franjaResumen() {
    const hoy = App.hoy(), ini = F.inicioMes(hoy), mes = F.mes(hoy), nombreMes = F.nombreMes(ini).split(' ')[0];
    const delMes = App.db.asientos.filter(a => a.fecha >= ini && a.fecha <= hoy);
    const ss = q.sumasYSaldos(App.config.desde, hoy);
    const cuadra = Math.abs(ss.totalDebe - ss.totalHaber) < 0.05;
    const iva = App.r2(q.libroIVAVentas(mes).totales.iva - q.libroIVACompras(mes).totales.iva);
    const ultimo = App.db.asientos[App.db.asientos.length - 1];
    return ui.franjaKpi([
      { titulo: 'Asientos de ' + nombreMes, valor: ui.num(delMes.length), detalle: ultimo ? 'Último: n.º ' + ui.num(ultimo.numero) + ' del ' + ui.fecha(ultimo.fecha) : '' },
      { titulo: 'Sumas desde la apertura', valor: cuadra ? 'Cuadran' : 'No cuadran', tono: cuadra ? 'ok' : 'peligro', detalle: cuadra ? 'Debe y haber: ' + ui.pesosCorto(ss.totalDebe) : 'Debe ' + ui.pesosCorto(ss.totalDebe) + ', haber ' + ui.pesosCorto(ss.totalHaber) },
      { titulo: 'Banco cuenta corriente', valor: ui.pesosCorto(q.saldoCuenta(App.CUENTAS.banco)), detalle: 'Caja ' + ui.pesos(q.saldoCuenta(App.CUENTAS.caja)) },
      { titulo: 'IVA de ' + nombreMes + ', saldo técnico', valor: ui.pesosCorto(Math.abs(iva)), tono: 'senal', detalle: iva >= 0 ? 'A pagar, antes de saldos a favor' : 'A favor' }
    ]);
  }

  App.modulo({
    id: 'contabilidad',
    titulo: 'Contabilidad',
    grupo: 'Finanzas',
    orden: 20,
    icono: '<svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="2.5" width="12" height="15" rx="1.5"/><path d="M7 6.5h6M7 10h6M7 13.5h3"/></svg>',
    render(el, params) {
      inyectarEstilos(); iniciarEstado();
      const raiz = document.createElement('div');
      raiz.className = 'cb';
      el.appendChild(raiz);
      params = params || [];
      if (params[0] === 'asiento') return vistaAsiento(raiz, params[1]);
      const activa = PESTANAS.includes(params[0]) ? params[0] : null;
      if (params[0] === 'mayor' && params[1] && App.get('planCuentas', params[1])) est.mayor.cuenta = params[1];
      raiz.innerHTML = h`<div class="encabezado-vista"><div><h1 class="titulo-vista">Contabilidad</h1>
        <p class="bajada">Ventas, compras, cobranzas, pagos y ajustes de stock se asientan en forma automática. Desde aquí se consultan los libros, se emiten los libros de IVA para el estudio contable y se registran los asientos manuales.</p></div></div>
        ${franjaResumen()}`;
      ui.pestanas(raiz, [
        { id: 'diario', titulo: 'Libro diario', render: tabDiario },
        { id: 'mayor', titulo: 'Mayor por cuenta', render: tabMayor },
        { id: 'balance', titulo: 'Sumas y saldos', render: tabBalance },
        { id: 'plan', titulo: 'Plan de cuentas', render: tabPlan },
        { id: 'ivaventas', titulo: 'IVA Ventas', render: p => tabIVA(p, 'ventas') },
        { id: 'ivacompras', titulo: 'IVA Compras', render: p => tabIVA(p, 'compras') },
        { id: 'manual', titulo: 'Asiento manual', render: tabManual }
      ], {
        clave: 'contabilidad', activa,
        alCambiar: id => { const r = '#/contabilidad/' + id + (id === 'mayor' ? '/' + est.mayor.cuenta : ''); if (location.hash !== r) history.replaceState(null, '', r); }
      });
    }
  });
})();
