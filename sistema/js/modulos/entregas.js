/* Módulo «Entregas»: remitos para repartir, armado de la hoja de ruta, marcado de entregas y rendición del chofer.
   Todo pasa por App.acciones (armarHojaRuta, marcarEntrega, registrarCobranza): nada se toca a mano en App.db. */
(function () {
  'use strict';
  const U = App.ui, h = U.h, F = App.f, r2 = App.r2;

  // ---------- estilos propios (prefijo ent-), se inyectan una sola vez ----------
  const CSS = `
.ent-armado { position: sticky; top: 72px; }
.ent-carga { margin: 14px 0 4px; }
.ent-carga-cifras { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; font-size: var(--fs-13); color: var(--texto-2); margin-bottom: 6px; }
.ent-carga-cifras strong { font-size: var(--fs-20); font-weight: 800; font-stretch: 118%; color: var(--tinta); font-variant-numeric: tabular-nums; }
.ent-caja { position: relative; height: 26px; border: 2px solid var(--tinta); border-radius: 3px; background: repeating-linear-gradient(90deg, transparent 0 calc(10% - 1px), var(--linea-suave) calc(10% - 1px) 10%); overflow: hidden; }
.ent-caja > span { position: absolute; inset: 0 auto 0 0; background: repeating-linear-gradient(-45deg, var(--carton) 0 7px, #C9A06A 7px 14px); transition: width .2s ease; }
.ent-caja.ent-excede { border-color: var(--peligro); }
.ent-caja.ent-excede > span { background: repeating-linear-gradient(-45deg, var(--peligro) 0 7px, #CF5A52 7px 14px); }
.ent-caja-pie { display: flex; justify-content: space-between; font-size: var(--fs-12); color: var(--texto-2); margin-top: 4px; font-variant-numeric: tabular-nums; }
.ent-paradas { list-style: none; margin: 8px 0 0; padding: 0; counter-reset: parada; max-height: 360px; overflow-y: auto; }
.ent-paradas li { display: grid; grid-template-columns: 30px minmax(0, 1fr) auto; gap: 8px; align-items: center; padding: 7px 0; border-top: 1px solid var(--linea-suave); font-size: var(--fs-13); }
.ent-paradas li::before { counter-increment: parada; content: counter(parada); font-weight: 800; font-stretch: 125%; font-size: var(--fs-16); text-align: center; color: var(--tinta); font-variant-numeric: tabular-nums; }
.ent-mover { display: flex; gap: 2px; }
.ent-mover .btn { width: 28px; padding: 0; justify-content: center; }
.ent-zona { display: inline-block; font-size: var(--fs-12); color: var(--texto-2); }
.ent-recorrido { list-style: none; margin: 0; padding: 0; background: var(--hoja); border: 1px solid var(--linea); border-radius: var(--r-panel); }
.ent-parada { display: grid; grid-template-columns: 64px minmax(0, 1.4fr) minmax(0, 1.2fr) auto; gap: 6px 18px; align-items: center; padding: 14px 18px 14px 0; border-top: 1px solid var(--linea-suave); position: relative; }
.ent-parada:first-child { border-top: 0; }
.ent-parada::before { content: ''; position: absolute; left: 31px; top: 0; bottom: 0; width: 2px; background: repeating-linear-gradient(180deg, var(--linea) 0 5px, transparent 5px 9px); }
.ent-parada:first-child::before { top: 50%; }
.ent-parada:last-child::before { bottom: 50%; }
.ent-parada:only-child::before { display: none; }
.ent-numero { position: relative; z-index: 1; justify-self: center; width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; background: var(--hoja); border: 2px solid var(--tinta); font-weight: 800; font-stretch: 125%; font-size: var(--fs-16); font-variant-numeric: tabular-nums; }
.ent-parada[data-estado="entregado"] .ent-numero { background: var(--ok); border-color: var(--ok); color: #fff; }
.ent-parada[data-estado="rechazado"] .ent-numero { background: var(--peligro); border-color: var(--peligro); color: #fff; }
.ent-parada[data-estado="parcial"] .ent-numero { background: var(--alerta); border-color: var(--alerta); color: #fff; }
.ent-parada[data-estado="en_ruta"] .ent-numero { box-shadow: 0 0 0 4px var(--senal); }
.ent-cliente { font-weight: 700; color: var(--tinta); text-decoration: none; }
.ent-cliente:hover { text-decoration: underline; }
.ent-sub { display: block; font-size: var(--fs-12); color: var(--texto-2); line-height: 1.35; }
.ent-sub a { color: inherit; }
.ent-cifras { font-size: var(--fs-13); font-variant-numeric: tabular-nums; }
.ent-botones { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
.ent-obs { grid-column: 2 / -1; font-size: var(--fs-12); color: var(--texto-2); }
.ent-devolver td input { width: 90px; }
.ent-rendicion-medios { display: flex; flex-wrap: wrap; gap: 8px 28px; margin-top: 12px; font-size: var(--fs-13); color: var(--texto-2); }
.ent-rendicion-medios strong { display: block; color: var(--tinta); font-size: var(--fs-16); font-weight: 800; font-stretch: 112%; font-variant-numeric: tabular-nums; }
.tabla input.ent-input-chico { width: 130px; }
@media (max-width: 1100px) { .ent-armado { position: static; } }
@media (max-width: 760px) {
  .ent-parada { grid-template-columns: 52px minmax(0, 1fr); padding-right: 14px; }
  .ent-parada::before { left: 25px; }
  .ent-parada > .ent-cifras, .ent-parada > .ent-botones, .ent-obs { grid-column: 2; }
  .ent-botones { justify-content: flex-start; }
}`;
  function estilos() {
    if (document.getElementById('ent-estilos')) return;
    const s = document.createElement('style');
    s.id = 'ent-estilos';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  // ---------- ayudas ----------
  const cli = id => App.get('clientes', id) || {};
  const condicion = c => c.plazo ? 'Cta. cte. a ' + c.plazo + ' días' : 'Contado';
  const nombreChofer = id => (App.get('choferes', id) || {}).nombre || '—';
  const vehiculo = id => App.get('vehiculos', id) || { descripcion: '—', patente: '', capacidadKg: 0 };
  const manana = () => { let d = F.sumar(App.hoy(), 1); if (F.diaSemana(d) === 0) d = F.sumar(d, 1); return d; };
  const kg = n => U.num(n, n < 100 ? 1 : 0) + ' kg';
  const nodo = html => { const t = document.createElement('template'); t.innerHTML = String(html).trim(); return t.content.firstElementChild; };
  const ordenZona = (a, b) => {
    const ca = cli(a.clienteId), cb = cli(b.clienteId);
    return (ca.zona || '').localeCompare(cb.zona || '') || (ca.localidad || '').localeCompare(cb.localidad || '') || (ca.direccion || '').localeCompare(cb.direccion || '');
  };
  // lo que se cobró en la calle: recibos con hojaRutaId (App.q.recibosDeHoja); para la historia de ejemplo,
  // también los de los clientes de la hoja el mismo día de la entrega
  function recibosDeHoja(hr) {
    const propios = new Set(App.q.recibosDeHoja(hr.id).map(rc => rc.id));
    const marca = 'hoja de ruta ' + hr.nro;
    const clientes = new Set(hr.remitoIds.map(id => (App.get('remitos', id) || {}).clienteId));
    const fechas = new Set(hr.remitoIds.map(id => (App.get('remitos', id) || {}).fechaEntrega).filter(Boolean));
    return App.db.recibos.filter(rc => propios.has(rc.id) || (!rc.hojaRutaId && (rc.obs || '').toLowerCase().includes(marca)) || (clientes.has(rc.clienteId) && fechas.has(rc.fecha) && rc.fecha >= hr.fecha))
      .sort((a, b) => a.numero - b.numero);
  }
  const NOMBRE_MEDIO = { efectivo: 'Efectivo', transferencia: 'Transferencia', cheque: 'Cheque', echeq: 'eCheq', retencion: 'Retención' };

  // estado del armado (se conserva entre redibujos de la pantalla)
  const armado = { sel: new Set(), orden: [], fecha: null, choferId: '', vehiculoId: '', manual: false, obs: '' };
  App.on('reinicio', () => { armado.sel.clear(); armado.orden = []; armado.manual = false; });

  // ---------- acciones sobre un remito ----------
  function marcarEntregado(rem) {
    App.intentar(() => App.acciones.marcarEntrega(rem.id, { estado: 'entregado' }), 'Entrega registrada: remito ' + rem.nro + ', ' + cli(rem.clienteId).fantasia);
  }
  function marcarParcial(rem) {
    const f = App.get('comprobantes', rem.comprobanteId);
    if (!f) return U.toast('El remito no tiene factura asociada.', 'peligro');
    const filas = f.items.map(it => ({ it, quedan: r2(it.cantidad - ((f.devuelto || {})[it.productoId] || 0)) })).filter(x => x.quedan > 0);
    const cuerpo = nodo(h`<div class="ent-modal">
      <p class="bajada" style="margin:0 0 12px">Indicar la mercadería devuelta. Se emite la nota de crédito correspondiente y la mercadería reingresa al lote de origen.</p>
      <div class="tabla-envoltura"><table class="tabla ent-devolver"><thead><tr><th>Producto</th><th class="al-der">Entregado</th><th class="al-der">Devuelto</th></tr></thead><tbody>
      ${filas.map(x => h`<tr><td><span class="celda-principal">${x.it.descripcion}</span><span class="celda-sub">${x.it.codigo}, ${x.it.unidad}</span></td><td class="al-der">${U.num(x.quedan)}</td>
        <td class="al-der"><input type="number" min="0" max="${x.quedan}" step="1" value="0" data-prod="${x.it.productoId}" aria-label="Cantidad devuelta de ${x.it.descripcion}"></td></tr>`)}
      </tbody></table></div>
      <div class="campo" style="margin-top:14px"><label for="ent-obs-parcial">Motivo de la devolución</label>
        <select id="ent-obs-parcial"><option>Bulto dañado</option><option>Cantidad no solicitada</option><option>Producto vencido o próximo a vencer</option><option>Faltante en la preparación del pedido</option><option>Otro motivo</option></select></div>
      <fieldset class="campo" style="margin-top:14px;border:0;padding:0"><legend class="etiqueta-campo" style="font-weight:600;font-size:var(--fs-13);margin-bottom:6px">Condición de la mercadería devuelta</legend>
        <label class="check"><input type="radio" name="ent-vendible" value="si"> Apta para la venta: reingresa al stock</label>
        <label class="check"><input type="radio" name="ent-vendible" value="no" checked> No apta (rota o vencida): baja por rotura</label></fieldset>
    </div>`);
    U.modal({ titulo: 'Entrega parcial: ' + cli(rem.clienteId).fantasia, cuerpo, ancho: 680, acciones: [
      { texto: 'Volver', tipo: 'secundario' },
      { texto: 'Registrar entrega parcial', tipo: 'primario', alClic: ({ cuerpo: c }) => {
        const devoluciones = [...c.querySelectorAll('input[data-prod]')].map(i => ({ productoId: i.dataset.prod, cantidad: Number(i.value) || 0 })).filter(d => d.cantidad > 0);
        if (!devoluciones.length) throw new Error('Se debe indicar al menos un producto devuelto. Si la entrega fue completa, corresponde registrarla como entregada.');
        const vendible = (c.querySelector('input[name="ent-vendible"]:checked') || {}).value === 'si';
        App.acciones.marcarEntrega(rem.id, { estado: 'parcial', obs: c.querySelector('#ent-obs-parcial').value, devoluciones, vendible });
        U.toast('Entrega parcial registrada: nota de crédito emitida por la mercadería devuelta', 'ok');
      } }] });
  }
  function marcarRechazo(rem) {
    const c0 = cli(rem.clienteId);
    const f = App.get('comprobantes', rem.comprobanteId);
    const cuerpo = nodo(h`<div>
      <p class="bajada" style="margin:0 0 12px">${c0.fantasia} rechazó el pedido. Se emite la nota de crédito por el total${f ? ' (' + U.pesos(f.total) + ')' : ''} y la totalidad de la mercadería reingresa al depósito.</p>
      <div class="campo"><label for="ent-motivo">Motivo del rechazo</label>
        <select id="ent-motivo"><option>Comercio cerrado</option><option>Sin fondos para el pago</option><option>El cliente desconoce el pedido</option><option>Mercadería en mal estado</option><option>Otro motivo</option></select></div>
    </div>`);
    U.modal({ titulo: 'Rechazo del remito ' + rem.nro, cuerpo, ancho: 520, acciones: [
      { texto: 'Volver', tipo: 'secundario' },
      { texto: 'Registrar rechazo', tipo: 'peligro', alClic: ({ cuerpo: c }) => {
        App.acciones.marcarEntrega(rem.id, { estado: 'rechazado', obs: c.querySelector('#ent-motivo').value });
        U.toast('Rechazo registrado: nota de crédito emitida y mercadería reingresada al stock', 'ok');
      } }] });
  }
  function botonesEntrega(rem) {
    const caja = document.createElement('div');
    caja.className = 'ent-botones';
    [['Entregado', 'btn-secundario', marcarEntregado], ['Parcial', 'btn-secundario', marcarParcial], ['Rechazado', 'btn-peligro', marcarRechazo]].forEach(([t, cl, fn]) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'btn btn-chico ' + cl; b.textContent = t;
      b.dataset.entrega = t.toLowerCase();
      b.setAttribute('aria-label', 'Registrar como ' + t.toLowerCase() + ': ' + cli(rem.clienteId).fantasia);
      b.addEventListener('click', e => { e.stopPropagation(); fn(rem); });
      caja.appendChild(b);
    });
    return caja;
  }

  // ---------- impresión de la hoja de ruta ----------
  const CSS_IMP = `<style>
    .hri { font-family: Archivo, Arial, sans-serif; color: #000; font-size: 9.5pt; }
    .hri-cab { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #000; padding-bottom: 3mm; margin-bottom: 3mm; gap: 6mm; }
    .hri-cab h1 { font-size: 20pt; font-weight: 800; font-stretch: 125%; margin: 0; line-height: 1; }
    .hri-datos { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2mm 5mm; margin-bottom: 4mm; }
    .hri-datos span { display: block; font-size: 7.5pt; color: #444; }
    .hri-datos strong { font-size: 10.5pt; }
    .hri table { width: 100%; border-collapse: collapse; }
    .hri th, .hri td { border: 1px solid #000; padding: 1.6mm 1.8mm; text-align: left; vertical-align: top; }
    .hri th { background: #eee; font-size: 8pt; }
    .hri td.n { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
    .hri .orden { font-size: 13pt; font-weight: 800; font-stretch: 125%; text-align: center; width: 9mm; }
    .hri .firma { width: 34mm; }
    .hri small { display: block; color: #444; font-size: 7.5pt; }
    .hri tfoot td { font-weight: 700; background: #f4f4f4; }
    .hri-pie { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8mm; margin-top: 14mm; }
    .hri-pie div { border-top: 1px solid #000; padding-top: 1.5mm; font-size: 8pt; text-align: center; }
    .hri-nota { margin-top: 4mm; font-size: 7.5pt; color: #444; }
  </style>`;
  function htmlHojaRuta(hr) {
    const v = vehiculo(hr.vehiculoId);
    const rems = hr.remitoIds.map(id => App.get('remitos', id));
    let aCobrar = 0;
    const filas = rems.map((r, i) => {
      const c = cli(r.clienteId), f = App.get('comprobantes', r.comprobanteId) || {};
      const saldo = App.q.saldoComprobante(f);
      if (!c.plazo) aCobrar += saldo;
      return h`<tr><td class="orden">${i + 1}</td><td><strong>${c.fantasia}</strong><small>${c.razonSocial}, tel. ${c.telefono || '—'}</small></td>
        <td>${c.direccion}<small>${c.localidad} (${c.zona})</small></td><td>${r.nro}<small>${f.tipo || ''} ${f.nro || ''}</small></td>
        <td class="n">${U.num(r.bultos)}</td><td class="n">${U.num(r.kg, 1)}</td>
        <td class="n">${c.plazo ? h`<small>Cta. cte. ${c.plazo} días</small>` : U.pesos(saldo)}</td><td class="firma"></td></tr>`;
    });
    const cfg = App.config;
    return h`${U.seguro(CSS_IMP)}<div class="hri">
      <div class="hri-cab"><div><div style="font-weight:700">${cfg.razonSocial}</div><div>${cfg.domicilio}</div></div><div style="text-align:right"><h1>Hoja de ruta ${hr.nro}</h1><div>${U.fechaLarga(hr.fecha)}</div></div></div>
      <div class="hri-datos">
        <div><span>Chofer</span><strong>${nombreChofer(hr.choferId)}</strong></div>
        <div><span>Vehículo</span><strong>${v.descripcion}</strong> ${v.patente}</div>
        <div><span>Carga</span><strong>${U.num(hr.kg, 0)} kg</strong> de ${U.num(v.capacidadKg)} kg</div>
        <div><span>Bultos y paradas</span><strong>${U.num(hr.bultos)}</strong> en ${rems.length} paradas</div>
      </div>
      <table><thead><tr><th>#</th><th>Cliente</th><th>Dirección</th><th>Remito</th><th>Bultos</th><th>Kg</th><th>A cobrar</th><th>Firma y aclaración, observaciones</th></tr></thead>
      <tbody>${filas}</tbody>
      <tfoot><tr><td></td><td colspan="3">Totales</td><td class="n">${U.num(hr.bultos)}</td><td class="n">${U.num(hr.kg, 1)}</td><td class="n">${U.pesos(aCobrar)}</td><td></td></tr></tfoot></table>
      ${hr.obs ? h`<p class="hri-nota">Observaciones: ${hr.obs}</p>` : ''}
      <p class="hri-nota">Los clientes de contado abonan al recibir la mercadería. La cobranza se rinde en administración al regreso, junto con esta hoja y los remitos firmados.</p>
      <div class="hri-pie"><div>Salida: hora y km</div><div>Llegada: hora y km</div><div>Firma del chofer</div></div>
    </div>`;
  }
  function imprimirHoja(hr) { U.imprimir(htmlHojaRuta(hr), { titulo: 'Hoja de ruta ' + hr.nro }); }
  function imprimirRemitos(hr) {
    U.imprimir(hr.remitoIds.map(id => U.comprobanteHTML(App.get('remitos', id), 'R')).join(''), { titulo: 'Remitos de la hoja ' + hr.nro });
  }

  // ---------- pestaña: armar hoja de ruta ----------
  function pestanaArmar(panel) {
    const pend = App.q.remitosSinHoja().slice().sort(ordenZona);
    // saca de lo elegido lo que ya no está pendiente
    [...armado.sel].forEach(id => { if (!pend.find(r => r.id === id)) armado.sel.delete(id); });
    armado.orden = armado.orden.filter(id => armado.sel.has(id));
    if (!armado.fecha || armado.fecha < App.hoy()) armado.fecha = manana();
    if (!pend.length) {
      panel.appendChild(nodo(h`<div class="vacio vacio-grande"><p class="subtitulo">No hay remitos pendientes de reparto</p><p>Al facturar los pedidos de preventa, los remitos se listan aquí para incorporarlos a una hoja de ruta.</p><a class="btn btn-primario" href="#/ventas">Ir a pedidos</a></div>`));
      return;
    }
    const grilla = nodo('<div class="grilla-lado"><div class="ent-izq"></div><aside class="panel ent-armado" aria-label="Hoja de ruta en preparación"></aside></div>');
    panel.appendChild(grilla);
    const izq = grilla.querySelector('.ent-izq'), der = grilla.querySelector('.ent-armado');
    const totKg = pend.reduce((s, r) => s + (r.kg || 0), 0);
    const barra = nodo(h`<div class="filtros fila separar"><span class="texto-2">${pend.length} remitos facturados pendientes de reparto: ${U.num(pend.reduce((s, r) => s + r.bultos, 0))} bultos y ${kg(totKg)}.</span>
      <span class="fila"><button type="button" class="btn btn-chico btn-secundario" data-todos>Seleccionar todos</button><button type="button" class="btn btn-chico btn-fantasma" data-ninguno>Quitar todos</button></span></div>`);
    izq.appendChild(barra);
    function alternar(id, si) {
      if (si) { armado.sel.add(id); if (!armado.orden.includes(id)) armado.orden.push(id); }
      else { armado.sel.delete(id); armado.orden = armado.orden.filter(x => x !== id); }
      if (!armado.manual) armado.orden.sort((a, b) => ordenZona(App.get('remitos', a), App.get('remitos', b)));
    }
    const tabla = U.tabla({
      filas: pend,
      columnas: [
        { titulo: '', ancho: '36px', valor: r => { const i = document.createElement('input'); i.type = 'checkbox'; i.checked = armado.sel.has(r.id); i.dataset.remito = r.id; i.setAttribute('aria-label', 'Incluir el remito ' + r.nro + ' de ' + cli(r.clienteId).fantasia); i.addEventListener('change', () => { alternar(r.id, i.checked); refrescar(); }); return i; } },
        { titulo: 'Cliente', ordenar: r => cli(r.clienteId).fantasia, valor: r => h`<span class="celda-principal">${cli(r.clienteId).fantasia}</span><span class="celda-sub">${cli(r.clienteId).direccion}, ${cli(r.clienteId).localidad}</span>` },
        { titulo: 'Zona', clase: 'ocultar-celu', ordenar: r => cli(r.clienteId).zona, valor: r => cli(r.clienteId).zona },
        { titulo: 'Remito', clase: 'ocultar-celu', ordenar: r => r.numero, valor: r => h`${r.nro.slice(5).replace(/^0+/, '')}<span class="celda-sub">${U.fecha(r.fecha)}</span>` },
        { titulo: 'Bultos', campo: 'bultos', alinear: 'der', valor: r => U.num(r.bultos) },
        { titulo: 'Peso', clase: 'ocultar-celu', campo: 'kg', alinear: 'der', valor: r => kg(r.kg) },
        { titulo: 'Cobro', valor: r => cli(r.clienteId).plazo ? cli(r.clienteId).plazo + ' días' : 'Contado' }
      ],
      filaClase: r => armado.sel.has(r.id) ? 'fila-ok' : '',
      alClic: r => { alternar(r.id, !armado.sel.has(r.id)); refrescar(); },
      vacio: 'No hay remitos pendientes de reparto.'
    });
    izq.appendChild(tabla);
    barra.querySelector('[data-todos]').addEventListener('click', () => { pend.forEach(r => alternar(r.id, true)); refrescar(); });
    barra.querySelector('[data-ninguno]').addEventListener('click', () => { armado.sel.clear(); armado.orden = []; armado.manual = false; refrescar(); });
    function refrescar() { tabla.actualizar(pend); pintarArmado(); }

    function ocupados(fecha) {
      const hs = App.db.hojasRuta.filter(x => x.fecha === fecha && x.estado !== 'cerrada');
      return { choferes: new Map(hs.map(x => [x.choferId, x])), vehiculos: new Map(hs.map(x => [x.vehiculoId, x])) };
    }
    function pintarArmado() {
      const rems = armado.orden.map(id => App.get('remitos', id));
      const kgTot = r2(rems.reduce((s, r) => s + (r.kg || 0), 0)), bultos = rems.reduce((s, r) => s + r.bultos, 0);
      const oc = ocupados(armado.fecha);
      const choferes = App.db.choferes.filter(c => c.activo !== false), vehs = App.db.vehiculos.filter(v => v.activo !== false);
      if (!armado.choferId || !App.get('choferes', armado.choferId)) armado.choferId = (choferes.find(c => !oc.choferes.has(c.id)) || choferes[0] || {}).id || '';
      if (!armado.vehiculoId || !App.get('vehiculos', armado.vehiculoId)) armado.vehiculoId = (vehs.find(v => !oc.vehiculos.has(v.id)) || vehs[0] || {}).id || '';
      const v = vehiculo(armado.vehiculoId);
      const uso = v.capacidadKg ? kgTot / v.capacidadKg : 0;
      const excede = kgTot > v.capacidadKg;
      const avisos = [];
      if (excede) avisos.push(['peligro', 'La carga excede la capacidad del vehículo en ' + kg(kgTot - v.capacidadKg) + '. Es necesario quitar remitos o asignar un vehículo de mayor capacidad.']);
      else if (uso > 0.9) avisos.push(['alerta', 'El vehículo está cerca de su capacidad máxima (' + U.porcentaje(uso, 0) + ').']);
      if (oc.choferes.has(armado.choferId)) avisos.push(['alerta', nombreChofer(armado.choferId) + ' tiene asignada la hoja ' + oc.choferes.get(armado.choferId).nro + ' para esa fecha.']);
      if (oc.vehiculos.has(armado.vehiculoId)) avisos.push(['alerta', 'El vehículo tiene asignada la hoja ' + oc.vehiculos.get(armado.vehiculoId).nro + ' para esa fecha.']);
      const frescos = rems.some(r => (App.get('comprobantes', r.comprobanteId) || { items: [] }).items.some(it => (App.get('productos', it.productoId) || {}).fresco));
      if (frescos && !/térmica/i.test(v.descripcion)) avisos.push(['alerta', 'La carga incluye lácteos o frescos y el vehículo no cuenta con caja térmica.']);
      der.innerHTML = h`<h2 class="panel-titulo">Hoja de ruta para el ${U.fechaLarga(armado.fecha)}</h2>
        <div class="form-grilla" style="grid-template-columns:repeat(2,minmax(0,1fr))">
          <div class="campo"><label for="ent-fecha">Fecha de reparto</label><input type="date" id="ent-fecha" value="${armado.fecha}" min="${App.hoy()}"></div>
          <div class="campo"><label for="ent-chofer">Chofer</label><select id="ent-chofer">${U.opciones(choferes, 'id', c => c.nombre + (oc.choferes.has(c.id) ? ' (con hoja asignada)' : ''), armado.choferId)}</select></div>
          <div class="campo ancho-total"><label for="ent-vehiculo">Vehículo</label><select id="ent-vehiculo">${U.opciones(vehs, 'id', x => x.descripcion + ', ' + x.patente + ' (' + U.num(x.capacidadKg) + ' kg)', armado.vehiculoId)}</select></div>
        </div>
        <div class="ent-carga">
          <div class="ent-carga-cifras"><span>Carga</span><span><strong>${U.num(kgTot, 0)} kg</strong> de ${U.num(v.capacidadKg)} kg</span></div>
          <div class="ent-caja${excede ? ' ent-excede' : ''}" role="meter" aria-valuemin="0" aria-valuemax="${v.capacidadKg}" aria-valuenow="${kgTot}" aria-label="Carga del vehículo"><span style="width:${Math.min(100, uso * 100).toFixed(1)}%"></span></div>
          <div class="ent-caja-pie"><span>${rems.length} paradas, ${U.num(bultos)} bultos</span><span>${U.porcentaje(uso, 0)} de la capacidad</span></div>
        </div>
        ${avisos.map(([t, x]) => h`<div class="aviso aviso-${t}" style="margin-top:8px">${x}</div>`)}
        <div class="fila separar" style="margin-top:16px"><strong>Orden de visita</strong>${rems.length > 1 ? h`<button type="button" class="btn btn-chico btn-fantasma" data-zona>Ordenar por zona</button>` : ''}</div>
        ${rems.length ? h`<ol class="ent-paradas">${rems.map((r, i) => h`<li><span><strong>${cli(r.clienteId).fantasia}</strong><span class="celda-sub">${cli(r.clienteId).direccion}, ${cli(r.clienteId).localidad}. ${U.num(r.bultos)} bultos, ${kg(r.kg)}</span></span>
          <span class="ent-mover"><button type="button" class="btn btn-chico btn-secundario" data-sube="${i}" aria-label="Visitar antes a ${cli(r.clienteId).fantasia}"${i === 0 ? U.seguro(' disabled') : ''}>↑</button><button type="button" class="btn btn-chico btn-secundario" data-baja="${i}" aria-label="Visitar después a ${cli(r.clienteId).fantasia}"${i === rems.length - 1 ? U.seguro(' disabled') : ''}>↓</button></span></li>`)}</ol>`
          : h`<p class="nota-discreta" style="margin-top:8px">Los remitos se incorporan desde la lista. Se ordenan automáticamente por zona y el orden puede modificarse con las flechas.</p>`}
        <div class="campo" style="margin-top:14px"><label for="ent-obs">Observaciones para el chofer</label><input type="text" id="ent-obs" value="${armado.obs}" placeholder="Ejemplo: cargar primero el pedido de Ticino"></div>
        <button type="button" class="btn btn-senal btn-grande" style="width:100%;justify-content:center;margin-top:14px" data-armar${!rems.length || excede ? U.seguro(' disabled aria-describedby="ent-armar-ayuda"') : ''}>Armar hoja de ruta</button>
        ${!rems.length || excede ? h`<p class="nota-discreta" id="ent-armar-ayuda" style="margin:6px 0 0">${!rems.length ? 'Se deben incorporar remitos para armar la hoja.' : 'La carga supera la capacidad del vehículo: quitar remitos o asignar otro vehículo.'}</p>` : ''}`;
      der.querySelector('#ent-fecha').addEventListener('change', e => { if (e.target.value) { armado.fecha = e.target.value; pintarArmado(); } });
      der.querySelector('#ent-chofer').addEventListener('change', e => { armado.choferId = e.target.value; pintarArmado(); });
      der.querySelector('#ent-vehiculo').addEventListener('change', e => { armado.vehiculoId = e.target.value; pintarArmado(); });
      der.querySelector('#ent-obs').addEventListener('input', e => { armado.obs = e.target.value; });
      const z = der.querySelector('[data-zona]');
      if (z) z.addEventListener('click', () => { armado.manual = false; armado.orden.sort((a, b) => ordenZona(App.get('remitos', a), App.get('remitos', b))); pintarArmado(); });
      der.querySelectorAll('[data-sube],[data-baja]').forEach(b => b.addEventListener('click', () => {
        const sube = b.dataset.sube != null;
        const i = Number(sube ? b.dataset.sube : b.dataset.baja), j = sube ? i - 1 : i + 1;
        [armado.orden[i], armado.orden[j]] = [armado.orden[j], armado.orden[i]];
        armado.manual = true; pintarArmado();
        const foco = der.querySelector('[data-' + (sube ? 'sube' : 'baja') + '="' + j + '"]');
        if (foco && !foco.disabled) foco.focus();
      }));
      der.querySelector('[data-armar]').addEventListener('click', () => {
        const hr = App.intentar(() => App.acciones.armarHojaRuta({ fecha: armado.fecha, choferId: armado.choferId, vehiculoId: armado.vehiculoId, remitoIds: armado.orden.slice(), obs: armado.obs }),
          x => 'Hoja de ruta ' + x.nro + ' armada para ' + nombreChofer(x.choferId) + ': ' + x.remitoIds.length + (x.remitoIds.length === 1 ? ' parada' : ' paradas'));
        if (hr) { armado.sel.clear(); armado.orden = []; armado.manual = false; armado.obs = ''; U.ir('#/entregas/hoja/' + hr.id); }
      });
    }
    pintarArmado();
  }

  // ---------- pestaña: en reparto ----------
  function pestanaReparto(panel) {
    const filas = [];
    App.db.hojasRuta.filter(x => x.estado !== 'cerrada').forEach(hr => hr.remitoIds.forEach((id, i) => {
      const r = App.get('remitos', id);
      if (r.estado === 'en_ruta') filas.push({ r, hr, orden: i + 1 });
    }));
    filas.sort((a, b) => a.hr.fecha < b.hr.fecha ? -1 : a.hr.fecha > b.hr.fecha ? 1 : a.hr.numero - b.hr.numero || a.orden - b.orden);
    panel.appendChild(nodo(h`<p class="bajada" style="margin:0 0 12px">Remitos en reparto. Con la confirmación del chofer se registra el resultado de cada entrega.</p>`));
    panel.appendChild(U.tabla({
      filas,
      columnas: [
        { titulo: 'Hoja', ordenar: f => f.hr.numero, valor: f => h`<span class="celda-principal">${f.hr.nro}</span><span class="celda-sub">${U.fecha(f.hr.fecha)}, ${nombreChofer(f.hr.choferId)}</span>` },
        { titulo: 'Parada', clase: 'ocultar-celu', alinear: 'der', ordenar: f => f.orden, valor: f => f.orden },
        { titulo: 'Cliente', ordenar: f => cli(f.r.clienteId).fantasia, valor: f => h`<span class="celda-principal">${cli(f.r.clienteId).fantasia}</span><span class="celda-sub">${cli(f.r.clienteId).direccion}, ${cli(f.r.clienteId).localidad}</span>` },
        { titulo: 'Remito', clase: 'ocultar-celu', valor: f => f.r.nro },
        { titulo: 'Bultos', clase: 'ocultar-celu', alinear: 'der', valor: f => U.num(f.r.bultos) },
        { titulo: 'A cobrar', alinear: 'der', valor: f => { const c = cli(f.r.clienteId); return c.plazo ? h`<span class="texto-2">Cta. cte.</span>` : U.pesos(App.q.saldoComprobante(f.r.comprobanteId)); } },
        { titulo: 'Resultado', alinear: 'der', valor: f => botonesEntrega(f.r) }
      ],
      alClic: f => U.ir('#/entregas/hoja/' + f.hr.id),
      vacio: 'No hay remitos en reparto en este momento.'
    }));
  }

  // ---------- pestaña: hojas de ruta ----------
  let filtroHojas = 'recientes';
  function pestanaHojas(panel) {
    const hoy = App.hoy();
    const seg = nodo(h`<div class="filtros"><div class="segmentado" role="group" aria-label="Filtro de hojas de ruta">
      <button type="button" data-f="recientes" aria-pressed="${filtroHojas === 'recientes'}">Última semana</button>
      <button type="button" data-f="abiertas" aria-pressed="${filtroHojas === 'abiertas'}">Sin cerrar</button>
      <button type="button" data-f="todas" aria-pressed="${filtroHojas === 'todas'}">Todas</button></div></div>`);
    panel.appendChild(seg);
    const lista = () => App.db.hojasRuta.filter(x => filtroHojas === 'todas' ? true : filtroHojas === 'abiertas' ? x.estado !== 'cerrada' : x.fecha >= F.sumar(hoy, -6))
      .slice().sort((a, b) => b.fecha < a.fecha ? -1 : b.fecha > a.fecha ? 1 : b.numero - a.numero);
    const tabla = U.tabla({
      filas: lista(), limite: 40,
      columnas: [
        { titulo: 'Hoja', campo: 'numero', valor: x => h`<span class="celda-principal">${x.nro}</span>` },
        { titulo: 'Fecha', clase: 'ocultar-celu', campo: 'fecha', valor: x => h`${U.fecha(x.fecha)}<span class="celda-sub">${F.nombreDia(x.fecha)}</span>` },
        { titulo: 'Chofer', ordenar: x => nombreChofer(x.choferId), valor: x => nombreChofer(x.choferId) },
        { titulo: 'Vehículo', clase: 'ocultar-celu', valor: x => h`${vehiculo(x.vehiculoId).descripcion}<span class="celda-sub">${vehiculo(x.vehiculoId).patente}</span>` },
        { titulo: 'Entregas', alinear: 'der', valor: x => { const ok = x.remitoIds.filter(id => App.get('remitos', id).estado !== 'en_ruta').length; return ok + ' de ' + x.remitoIds.length; } },
        { titulo: 'Carga', clase: 'ocultar-celu', alinear: 'der', campo: 'kg', valor: x => h`${U.num(x.kg, 0)} kg<span class="celda-sub">${U.porcentaje(x.kg / (vehiculo(x.vehiculoId).capacidadKg || 1), 0)} del vehículo</span>` },
        { titulo: 'Estado', valor: x => U.estado(x.estado) }
      ],
      filaClase: x => x.estado === 'en_curso' ? 'fila-alerta' : x.estado === 'armada' ? '' : 'fila-apagada',
      alClic: x => U.ir('#/entregas/hoja/' + x.id),
      vacio: 'No hay hojas de ruta con ese filtro.'
    });
    panel.appendChild(tabla);
    seg.querySelectorAll('[data-f]').forEach(b => b.addEventListener('click', () => {
      filtroHojas = b.dataset.f;
      seg.querySelectorAll('[data-f]').forEach(x => x.setAttribute('aria-pressed', x === b));
      tabla.actualizar(lista());
    }));
  }

  // ---------- tablero ----------
  function tablero(el) {
    const hoy = App.hoy(), mes = F.mes(hoy);
    const pend = App.q.remitosSinHoja();
    const enRuta = App.db.remitos.filter(r => r.estado === 'en_ruta');
    const hojasAbiertas = new Set(enRuta.map(r => r.hojaRutaId));
    const entregadosHoy = App.db.remitos.filter(r => r.fechaEntrega === hoy && r.estado === 'entregado').length;
    const delMes = App.db.remitos.filter(r => r.fechaEntrega && F.mes(r.fechaEntrega) === mes);
    const conProblema = delMes.filter(r => r.estado === 'rechazado' || r.estado === 'parcial');
    el.innerHTML = h`<div class="encabezado-vista"><div><h1 class="titulo-vista">Entregas</h1>
      <p class="bajada">Armado de hojas de ruta con los remitos facturados, registro del resultado de cada entrega y rendición de la cobranza del chofer.</p></div></div>
      ${U.franjaKpi([
        { titulo: 'Remitos pendientes de reparto', valor: U.num(pend.length), detalle: U.num(pend.reduce((s, r) => s + r.bultos, 0)) + ' bultos, ' + kg(pend.reduce((s, r) => s + (r.kg || 0), 0)), tono: pend.length ? 'senal' : 'ok' },
        { titulo: 'En reparto', valor: U.num(enRuta.length), detalle: hojasAbiertas.size ? 'en ' + hojasAbiertas.size + (hojasAbiertas.size === 1 ? ' hoja de ruta' : ' hojas de ruta') : 'sin vehículos en reparto', tono: 'info' },
        { titulo: 'Entregados hoy', valor: U.num(entregadosHoy), detalle: U.fechaLarga(hoy) },
        { titulo: 'Con devolución en ' + F.nombreMes(hoy).split(' ')[0], valor: U.num(conProblema.length), detalle: delMes.length ? U.porcentaje(conProblema.length / delMes.length) + ' de ' + U.num(delMes.length) + ' entregas' : '', tono: conProblema.length ? 'alerta' : 'ok' }
      ])}
      <div class="seccion ent-pestanas"></div>`;
    U.pestanas(el.querySelector('.ent-pestanas'), [
      { id: 'armar', titulo: 'Armar hoja de ruta', cuenta: pend.length, render: pestanaArmar },
      { id: 'reparto', titulo: 'En reparto', cuenta: enRuta.length, render: pestanaReparto },
      { id: 'hojas', titulo: 'Hojas de ruta', render: pestanaHojas }
    ], { clave: 'entregas' });
  }

  // ---------- detalle de una hoja de ruta ----------
  function detalleHoja(el, id) {
    const hr = App.get('hojasRuta', id);
    if (!hr) {
      el.innerHTML = h`<div class="vacio vacio-grande"><h1 class="titulo-vista">Hoja de ruta no encontrada</h1><p>El enlace puede ser incorrecto.</p><a class="btn btn-primario" href="#/entregas">Volver a Entregas</a></div>`;
      return;
    }
    const v = vehiculo(hr.vehiculoId);
    const rems = hr.remitoIds.map(x => App.get('remitos', x));
    const hechos = rems.filter(r => r.estado !== 'en_ruta').length;
    const recibos = recibosDeHoja(hr);
    const cobrado = r2(recibos.reduce((s, rc) => s + rc.total, 0));
    el.innerHTML = h`<nav class="migas" aria-label="Ubicación"><a href="#/entregas">Entregas</a> › Hoja de ruta ${hr.nro}</nav>
      <div class="encabezado-vista"><div><h1 class="titulo-vista">Hoja de ruta ${hr.nro}</h1>
        <p class="bajada">${U.fechaLarga(hr.fecha)}. ${nombreChofer(hr.choferId)} en ${v.descripcion} (${v.patente}). ${U.estado(hr.estado)}</p></div>
        <div class="acciones"><button type="button" class="btn btn-secundario" data-remitos>Imprimir remitos</button><button type="button" class="btn btn-primario" data-imprimir>Imprimir hoja de ruta</button></div></div>
      ${U.franjaKpi([
        { titulo: 'Paradas', valor: U.num(rems.length), detalle: hechos + ' con entrega registrada' },
        { titulo: 'Carga', valor: U.num(hr.kg, 0) + ' kg', detalle: U.porcentaje(hr.kg / (v.capacidadKg || 1), 0) + ' de ' + U.num(v.capacidadKg) + ' kg, ' + U.num(hr.bultos) + ' bultos', tono: hr.kg > v.capacidadKg ? 'peligro' : '' },
        { titulo: 'Entregados', valor: U.num(rems.filter(r => r.estado === 'entregado').length), detalle: rems.filter(r => r.estado === 'parcial').length + ' parciales, ' + rems.filter(r => r.estado === 'rechazado').length + ' rechazados', tono: 'ok' },
        { titulo: 'Cobranza en reparto', valor: U.pesosCorto(cobrado), detalle: recibos.length + (recibos.length === 1 ? ' recibo' : ' recibos'), tono: cobrado ? 'senal' : '' }
      ])}
      ${hr.obs ? h`<div class="aviso" style="margin-top:14px">Indicaciones para el chofer: ${hr.obs}</div>` : ''}
      <section class="seccion"><h2 class="seccion-titulo">Recorrido <span class="texto-2">en el orden de visita</span></h2><ol class="ent-recorrido"></ol></section>
      <section class="seccion ent-rendicion"><h2 class="seccion-titulo">Rendición del chofer <span class="texto-2">cobranza al momento de la entrega</span></h2></section>`;
    el.querySelector('[data-imprimir]').addEventListener('click', () => imprimirHoja(hr));
    el.querySelector('[data-remitos]').addEventListener('click', () => imprimirRemitos(hr));
    const ol = el.querySelector('.ent-recorrido');
    rems.forEach((r, i) => {
      const c = cli(r.clienteId), f = App.get('comprobantes', r.comprobanteId) || {};
      const li = nodo(h`<li class="ent-parada" data-estado="${r.estado}">
        <span class="ent-numero" aria-label="Parada ${i + 1}">${i + 1}</span>
        <div><a class="ent-cliente" href="#/clientes/${c.id}">${c.fantasia}</a><span class="ent-sub">${c.direccion}, ${c.localidad}. Tel. ${c.telefono || '—'}</span><span class="ent-zona">${c.zona}</span></div>
        <div class="ent-cifras">Remito ${r.nro}<span class="ent-sub">${U.num(r.bultos)} bultos, ${kg(r.kg)}. ${f.tipo ? h`<a href="#/facturacion/comprobante/${f.id}">${f.tipo} ${f.nro}</a>` : ''} por ${U.pesos(f.total)}. ${condicion(c)}</span></div>
        <div class="ent-botones">${U.estado(r.estado)}</div>
        ${r.obs ? h`<div class="ent-obs">${r.estado === 'entregado' ? 'Nota' : 'Motivo'}: ${r.obs}${r.fechaEntrega ? ', ' + U.fecha(r.fechaEntrega) : ''}</div>` : ''}
      </li>`);
      if (r.estado === 'en_ruta') li.querySelector('.ent-botones').replaceWith(botonesEntrega(r));
      ol.appendChild(li);
    });
    rendicion(el.querySelector('.ent-rendicion'), hr, rems, recibos);
  }

  function rendicion(sec, hr, rems, recibos) {
    const entregados = rems.filter(r => r.estado === 'entregado' || r.estado === 'parcial');
    const porCobrar = entregados.map(r => ({ r, c: cli(r.clienteId), f: App.get('comprobantes', r.comprobanteId) })).filter(x => x.f && App.q.saldoComprobante(x.f) > 0.01);
    if (!entregados.length) {
      sec.appendChild(nodo(h`<div class="panel vacio">Una vez registradas las entregas, aquí se carga la cobranza de ${nombreChofer(hr.choferId)}: efectivo y transferencias de clientes de contado y pagos anticipados de cuenta corriente.</div>`));
    } else if (porCobrar.length) {
      const panel = nodo(h`<div class="panel"><p class="bajada" style="margin:0 0 12px">Importe rendido por el chofer para cada cliente. Los clientes de contado se precargan con el saldo de la factura; los pagos de clientes de cuenta corriente también se registran aquí. Cada cobro genera su recibo imputado a la factura.</p></div>`);
      const inputs = [];
      function campo(x, tipo) {
        const i = document.createElement('input');
        i.type = 'number'; i.min = '0'; i.step = '0.01'; i.className = 'ent-input-chico';
        const sugerido = !x.c.plazo && ((x.c.medioPreferido === 'transferencia') === (tipo === 'transferencia')) ? App.q.saldoComprobante(x.f) : 0;
        i.value = sugerido ? String(sugerido) : '';
        i.placeholder = '0,00';
        i.dataset.medio = tipo;
        i.setAttribute('aria-label', NOMBRE_MEDIO[tipo] + ' cobrado a ' + x.c.fantasia);
        i.addEventListener('input', sumar);
        inputs.push({ i, x, tipo });
        return i;
      }
      function sumar() {
        ['efectivo', 'transferencia'].forEach(t => {
          const s = inputs.filter(o => o.tipo === t).reduce((a, o) => a + (Number(o.i.value) || 0), 0);
          const td = panel.querySelector('[data-tot="' + t + '"]'); if (td) td.textContent = U.pesos(s);
        });
      }
      const tabla = U.tabla({
        filas: porCobrar,
        columnas: [
          { titulo: 'Cliente', valor: x => h`<span class="celda-principal">${x.c.fantasia}</span><span class="celda-sub">${condicion(x.c)}</span>` },
          { titulo: 'Factura', clase: 'ocultar-celu', valor: x => h`${x.f.tipo} ${x.f.nro}<span class="celda-sub">vence ${U.fecha(x.f.vence)}</span>` },
          { titulo: 'Saldo', alinear: 'der', valor: x => U.pesos(App.q.saldoComprobante(x.f)) },
          { titulo: 'Efectivo', alinear: 'der', valor: x => campo(x, 'efectivo') },
          { titulo: 'Transferencia', clase: 'ocultar-celu', alinear: 'der', valor: x => campo(x, 'transferencia') }
        ],
        pie: ['Total a rendir', '', '', U.seguro('<span data-tot="efectivo"></span>'), U.seguro('<span data-tot="transferencia"></span>')]
      });
      panel.appendChild(tabla);
      const pie = nodo(h`<div class="fila separar" style="margin-top:14px"><span class="nota-discreta">Los saldos de cuenta corriente no cobrados permanecen en la cuenta del cliente hasta su vencimiento.</span><button type="button" class="btn btn-senal" data-rendir>Registrar rendición</button></div>`);
      panel.appendChild(pie);
      sec.appendChild(panel);
      sumar();
      pie.querySelector('[data-rendir]').addEventListener('click', () => {
        const cobros = porCobrar.map(x => ({ x, medios: inputs.filter(o => o.x === x && Number(o.i.value) > 0).map(o => ({ tipo: o.tipo, importe: r2(Number(o.i.value)) })) })).filter(o => o.medios.length);
        if (!cobros.length) return U.toast('Se debe ingresar al menos un importe cobrado para registrar la rendición.', 'alerta');
        let hechos = 0, total = 0;
        try {
          cobros.forEach(({ x, medios }) => {
            const tot = r2(medios.reduce((s, m) => s + m.importe, 0));
            const imp = r2(Math.min(tot, App.q.saldoComprobante(x.f)));
            App.acciones.registrarCobranza({ clienteId: x.c.id, medios, imputaciones: [{ comprobanteId: x.f.id, importe: imp }],
              obs: 'Rendición hoja de ruta ' + hr.nro + ' (' + nombreChofer(hr.choferId) + ')', hojaRutaId: hr.id });
            hechos++; total += tot;
          });
          U.toast('Rendición registrada: ' + hechos + (hechos === 1 ? ' recibo' : ' recibos') + ' por ' + U.pesos(total), 'ok');
        } catch (e) {
          U.toast((hechos ? 'Se registraron ' + hechos + ' recibos y uno no pudo registrarse: ' : '') + e.message, 'peligro');
        }
      });
    } else {
      sec.appendChild(nodo(h`<div class="aviso aviso-ok">Las facturas entregadas en esta hoja no registran saldo pendiente de cobro.</div>`));
    }
    // lo que ya se rindió
    if (recibos.length) {
      const medios = {};
      recibos.forEach(rc => rc.medios.forEach(m => { medios[m.tipo] = r2((medios[m.tipo] || 0) + m.importe); }));
      const caja = nodo(h`<div style="margin-top:18px"><h3 class="panel-titulo">Recibos de esta hoja</h3></div>`);
      caja.appendChild(U.tabla({
        filas: recibos,
        columnas: [
          { titulo: 'Recibo', valor: rc => h`<span class="celda-principal">${rc.nro}</span><span class="celda-sub">${U.fecha(rc.fecha)}</span>` },
          { titulo: 'Cliente', valor: rc => cli(rc.clienteId).fantasia },
          { titulo: 'Medios', clase: 'ocultar-celu', valor: rc => rc.medios.map(m => NOMBRE_MEDIO[m.tipo]).join(', ') },
          { titulo: 'Imputado a', clase: 'ocultar-celu', valor: rc => rc.imputaciones.map(i => i.nro).join(', ') || 'A cuenta' },
          { titulo: 'Total', alinear: 'der', valor: rc => U.pesos(rc.total) }
        ],
        pie: ['Total cobrado', '', '', '', U.pesos(recibos.reduce((s, rc) => s + rc.total, 0))],
        alClic: rc => U.ir('#/cobranzas/recibo/' + rc.id)
      }));
      caja.appendChild(nodo(h`<div class="ent-rendicion-medios">${Object.keys(medios).map(k => h`<div>${k === 'efectivo' ? 'Efectivo a ingresar en caja' : NOMBRE_MEDIO[k]}<strong>${U.pesos(medios[k])}</strong></div>`)}</div>`));
      sec.appendChild(caja);
    }
  }

  App.modulo({
    id: 'entregas',
    titulo: 'Entregas',
    grupo: 'Logística',
    orden: 20,
    icono: '<svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 5h10v9H2z"/><path d="M12 8h3.5L18 11v3h-6"/><circle cx="5.5" cy="15" r="1.5"/><circle cx="14.5" cy="15" r="1.5"/></svg>',
    contador: () => App.q.remitosSinHoja().length,
    render(el, params) {
      estilos();
      if (params[0] === 'hoja' && params[1]) detalleHoja(el, params[1]);
      else tablero(el);
    }
  });
})();
