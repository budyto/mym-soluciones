/* Módulo «Inicio»: el tablero de la mañana del dueño.
   Arriba la plata (ventas, cobranzas, deuda vencida, lo que hay que pagar y los cheques), al costado lo que hay
   que resolver hoy (cada aviso lleva a su módulo y algunos se resuelven desde acá con las acciones del store),
   y en el medio las ventas por día del mes en un gráfico SVG propio. */
(function () {
  const ui = App.ui, h = ui.h, F = App.f;

  // ---------- estilos propios (prefijo ini-), se inyectan una sola vez ----------
  function estilos() {
    if (document.getElementById('estilos-inicio')) return;
    const s = document.createElement('style');
    s.id = 'estilos-inicio';
    s.textContent = `
.ini-saludo { font-size: var(--fs-40); line-height: 1; font-stretch: 125%; font-weight: 800; letter-spacing: -.02em; }
.ini-franja a.kpi { color: inherit; text-decoration: none; }
.ini-franja a.kpi:hover { background: var(--fila-hover); }
.ini-franja a.kpi:focus-visible { outline-offset: -3px; }
.ini-var { font-weight: 600; }
.ini-var.sube { color: var(--ok); } .ini-var.baja { color: var(--peligro); }
.ini-grafico-cab { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px 24px; flex-wrap: wrap; margin-bottom: 6px; }
.ini-resumen { display: flex; gap: 22px; flex-wrap: wrap; font-size: var(--fs-13); color: var(--texto-2); }
.ini-resumen strong { display: block; color: var(--tinta); font-size: var(--fs-16); font-stretch: 112%; font-weight: 800; }
.ini-grafico { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
.ini-grafico svg { display: block; width: 100%; height: auto; }
.ini-grafico .eje { font-size: 11px; fill: var(--texto-2); }
.ini-grafico .eje-hoy { font-size: 11px; fill: var(--tinta); font-weight: 700; }
.ini-grafico .grilla { stroke: var(--linea-suave); stroke-width: 1; }
.ini-grafico .base { stroke: var(--linea); stroke-width: 1; }
.ini-grafico .ini-col { fill: var(--tinta); }
.ini-grafico .ini-col-hoy { fill: var(--senal); stroke: #C99D10; stroke-width: 1; }
.ini-grafico .ini-col-futura { fill: none; stroke: var(--linea); stroke-dasharray: 3 3; }
.ini-grafico .domingo { font-size: 10px; fill: #A2ABA3; }
.ini-grafico .promedio { stroke: var(--carton); stroke-width: 1.5; stroke-dasharray: 5 4; }
.ini-grafico g.dia:hover .ini-col { fill: var(--tinta-3); }
.ini-leyenda { display: flex; gap: 6px 16px; flex-wrap: wrap; font-size: var(--fs-12); color: var(--texto-2); margin-top: 8px; }
.ini-leyenda i { display: inline-block; width: 12px; height: 10px; border-radius: 2px; margin-right: 6px; vertical-align: -1px; }
.ini-leyenda .l-prom { height: 0; border-top: 2px dashed var(--carton); border-radius: 0; width: 16px; vertical-align: 3px; }
.ini-alertas { padding: 0; margin: 0; }
.ini-izq { min-width: 0; }
.ini-franja .kpi-valor { font-size: 24px; }
.ini-pv { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px 28px; }
@media (max-width: 1100px) { .ini-alertas { margin-top: 4px; } }
@media (max-width: 760px) { .ini-alertas { order: -1; margin: 0 0 8px; } }
@media (max-width: 600px) { .ini-pv { grid-template-columns: minmax(0, 1fr); } }
.ini-alertas .panel-titulo { padding: 16px 18px 0; margin-bottom: 6px; }
.ini-alerta { padding: 12px 18px 14px; border-top: 1px solid var(--linea-suave); position: relative; --sangria: 38px; }
.ini-alerta::before { content: ''; position: absolute; left: 0; top: 12px; bottom: 14px; width: 3px; border-radius: 0 3px 3px 0; background: var(--info); }
.ini-alerta.t-alerta::before { background: var(--alerta); }
.ini-alerta.t-peligro::before { background: var(--peligro); }
.ini-alerta-cab { display: flex; align-items: baseline; gap: 8px; }
.ini-alerta-num { font-size: var(--fs-20); font-weight: 800; font-stretch: 118%; min-width: calc(var(--sangria) - 8px); color: var(--info); }
.ini-alerta.t-alerta .ini-alerta-num { color: var(--alerta); }
.ini-alerta.t-peligro .ini-alerta-num { color: var(--peligro); }
.ini-alerta-titulo { font-weight: 700; }
.ini-alerta-det { font-size: var(--fs-13); color: var(--texto-2); margin: 3px 0 0; padding-left: var(--sangria); }
.ini-alerta-items { list-style: none; margin: 6px 0 0; padding: 0 0 0 var(--sangria); font-size: var(--fs-13); }
.ini-alerta-items li { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 2px 0; min-width: 0; }
.ini-alerta-items li > a { flex: 1; }
.ini-alerta-items .btn { height: 24px; padding: 0 8px; font-size: var(--fs-12); flex: none; }
.ini-alerta-items a { color: var(--tinta); text-decoration: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
.ini-alerta-items a:hover { text-decoration: underline; }
.ini-alerta-items span { color: var(--texto-2); white-space: nowrap; flex: none; }
.ini-alerta .botones { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 9px; padding-left: var(--sangria); }
.ini-limpio { padding: 14px 18px 18px; color: var(--texto-2); font-size: var(--fs-13); border-top: 1px solid var(--linea-suave); }
.ini-pv-item { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 4px 12px; align-items: center; font-size: var(--fs-13); }
.ini-pv .barra-h { grid-column: 1 / -1; }
.ini-pv .barra-h > span { background: var(--carton); }
.ini-pv b { font-weight: 600; }
.ini-pv b small { font-weight: 400; color: var(--texto-2); font-size: var(--fs-12); }
@media (max-width: 760px) {
  .ini-saludo { font-size: 30px; }
  .ini-resumen { gap: 14px; }
}`;
    document.head.appendChild(s);
  }

  const ICONO = '<svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 9.5L10 3.5l7 6"/><path d="M5 8.5V17h10V8.5"/><path d="M8.5 17v-4.5h3V17"/></svg>';

  const sum = (lista, fn) => App.r2(lista.reduce((s, x) => s + (fn ? fn(x) : x), 0));
  const variacion = (act, ant) => ant ? (act - ant) / Math.abs(ant) : null;
  const mesSolo = iso => F.nombreMes(iso).split(' ')[0];
  function textoVar(v, frase) {
    if (v == null) return '';
    const signo = v > 0 ? '+' : v < 0 ? '−' : '';
    return h`<span class="ini-var ${v >= 0 ? 'sube' : 'baja'}">${signo}${ui.num(Math.abs(v) * 100, 1)} %</span> ${frase}`;
  }
  function mismoDiaMesAnterior(iso) {
    // el mismo número de día del mes anterior (o el último día, si ese mes es más corto)
    const ini = F.inicioMes(F.sumar(F.inicioMes(iso), -1));
    const dia = Math.min(Number(iso.slice(8, 10)), F.diasDelMes(ini));
    return ini.slice(0, 8) + String(dia).padStart(2, '0');
  }
  const esDomingo = iso => F.diaSemana(iso) === 0;
  function diasHabiles(desde, hasta) { let n = 0; for (let d = desde; d <= hasta; d = F.sumar(d, 1)) if (!esDomingo(d)) n++; return n; }

  // ---------- números del día ----------
  function calcular() {
    const db = App.db, q = App.q, hoy = App.hoy();
    const iniMes = F.inicioMes(hoy), finMes = F.finMes(hoy);
    const antIni = F.inicioMes(F.sumar(iniMes, -1)), antHasta = mismoDiaMesAnterior(hoy), antFin = F.finMes(antIni);
    const diasMes = q.ventasPorDia(iniMes, hoy);
    const diasAnt = antIni >= App.config.desde ? q.ventasPorDia(antIni, antFin) : [];
    const ventasHoy = diasMes.find(d => d.fecha === hoy) || { neto: 0, total: 0, comprobantes: 0 };
    const ventasMes = sum(diasMes, d => d.neto);
    const ventasAntMismoTramo = sum(diasAnt.filter(d => d.fecha <= antHasta), d => d.neto);
    const ventasAntCompleto = sum(diasAnt, d => d.neto);
    const habilesHechos = diasHabiles(iniMes, hoy), habilesMes = diasHabiles(iniMes, finMes);
    const proyeccion = habilesHechos ? ventasMes / habilesHechos * habilesMes : 0;
    const promAnt = diasAnt.length ? ventasAntCompleto / diasHabiles(antIni, antFin) : 0;
    const mejor = diasMes.reduce((m, d) => !m || d.neto > m.neto ? d : m, null);

    const recibosHoy = db.recibos.filter(r => r.fecha === hoy);
    const cobradoMes = sum(db.recibos.filter(r => r.fecha >= iniMes && r.fecha <= hoy), r => r.total);
    const deudores = q.antiguedadDeuda().map(r => Object.assign({ vencida: App.r2(r.d30 + r.d60 + r.mas60) }, r)).filter(r => r.vencida > 0.01).sort((a, b) => b.vencida - a.vencida);
    const deudaVencida = q.deudaVencida();
    const semana = F.sumar(hoy, 7);
    const aPagar = db.comprasFacturas.filter(f => App.r2(f.total - f.pagado) > 0.01 && f.vence <= semana).sort((a, b) => a.vence < b.vence ? -1 : 1);
    const cheques = q.chequesEnCartera();
    const chequesDepositables = cheques.filter(c => c.fechaPago <= hoy);

    const pendientes = q.pedidosPendientes().slice().sort((a, b) => a.numero - b.numero);
    const remitos = q.remitosSinHoja();
    const porVencer = q.vencimientosProximos(7);
    const bajo = q.bajoMinimo();
    const excedidos = db.clientes.filter(c => c.activo !== false).map(c => ({ cliente: c, saldo: q.saldoCliente(c.id) }))
      .filter(x => x.saldo > x.cliente.limiteCredito).map(x => Object.assign(x, { exceso: App.r2(x.saldo - x.cliente.limiteCredito) })).sort((a, b) => b.exceso - a.exceso);
    const hojasHoy = db.hojasRuta.filter(r => r.fecha === hoy);
    const preventistas = q.ventasPorPreventista(iniMes, hoy).filter(p => p.preventista);

    return { hoy, iniMes, finMes, antIni, antHasta, diasMes, ventasHoy, ventasMes, ventasAntMismoTramo, ventasAntCompleto, proyeccion, promAnt, mejor,
      habilesHechos, habilesMes, recibosHoy, cobradoMes, deudores, deudaVencida, aPagar, cheques, chequesDepositables,
      pendientes, remitos, porVencer, bajo, excedidos, hojasHoy, preventistas };
  }

  // ---------- franja de la plata ----------
  function franja(d) {
    const kpi = (ruta, k) => h`<a class="kpi${k.tono ? ' kpi-' + k.tono : ''}" href="${ruta}"><div class="kpi-titulo">${k.titulo}</div><div class="kpi-valor">${k.valor}</div><div class="kpi-detalle">${k.detalle}</div></a>`;
    const vMes = variacion(d.ventasMes, d.ventasAntMismoTramo);
    const totalCheques = sum(d.cheques, c => c.importe);
    const totalPagar = sum(d.aPagar, f => f.total - f.pagado);
    const proxCheque = d.cheques[0];
    return h`<div class="franja-kpi ini-franja">
      ${kpi('#/facturacion', { titulo: 'Ventas del día', valor: ui.pesosCorto(d.ventasHoy.neto), detalle: d.ventasHoy.comprobantes + (d.ventasHoy.comprobantes === 1 ? ' factura' : ' facturas') + ', sin IVA' })}
      ${kpi('#/ventas', { titulo: 'Ventas del mes', valor: ui.pesosCorto(d.ventasMes), tono: 'senal', detalle: vMes == null ? 'sin IVA' : textoVar(vMes, 'contra ' + mesSolo(d.antIni) + ' al ' + ui.fecha(d.antHasta).slice(0, 5)) })}
      ${kpi('#/cobranzas', { titulo: 'Cobranzas del día', valor: ui.pesosCorto(sum(d.recibosHoy, r => r.total)), detalle: d.recibosHoy.length + (d.recibosHoy.length === 1 ? ' recibo' : ' recibos') + '; en el mes ' + ui.pesosCorto(d.cobradoMes) })}
      ${kpi('#/clientes', { titulo: 'Deudores por ventas vencidos', valor: ui.pesosCorto(d.deudaVencida), tono: d.deudaVencida > 0 ? 'peligro' : 'ok', detalle: d.deudores.length + ' clientes con facturas vencidas' })}
      ${kpi('#/proveedores', { titulo: 'Pagos a proveedores a 7 días, incluye vencidos', valor: ui.pesosCorto(totalPagar), tono: totalPagar > 0 ? 'alerta' : '', detalle: d.aPagar.length ? d.aPagar.length + ' facturas de proveedores, la primera vence el ' + ui.fecha(d.aPagar[0].vence).slice(0, 5) : 'Sin vencimientos en los próximos 7 días' })}
      ${kpi('#/cobranzas', { titulo: 'Cheques en cartera', valor: ui.pesosCorto(totalCheques), tono: 'info', detalle: d.cheques.length + ' cheques' + (proxCheque ? ', el próximo se cobra el ' + ui.fecha(proxCheque.fechaPago).slice(0, 5) : '') })}
    </div>`;
  }

  // ---------- gráfico de ventas por día ----------
  function grafico(d) {
    // en pantallas angostas el gráfico se dibuja a su ancho real (así entra el mes entero y la barra de hoy)
    const angosto = typeof window !== 'undefined' && window.innerWidth < 760;
    const W = angosto ? Math.max(300, Math.min(window.innerWidth - 40, 720)) : 760, H = angosto ? 210 : 250, mi = angosto ? 44 : 58, md = 8, ms = 16, mb = 30;
    const dias = []; for (let x = d.iniMes; x <= d.finMes; x = F.sumar(x, 1)) dias.push(x);
    const porFecha = {}; d.diasMes.forEach(v => { porFecha[v.fecha] = v; });
    const max = Math.max(d.promAnt, ...d.diasMes.map(v => v.neto), 1);
    const paso = [1e5, 2.5e5, 5e5, 1e6, 2e6, 2.5e6, 5e6, 1e7, 2e7, 5e7].find(p => max / p <= 5) || 1e8;
    const tope = Math.ceil(max / paso) * paso;
    const anchoArea = W - mi - md, anchoCol = anchoArea / dias.length, altoArea = H - ms - mb;
    const y = v => ms + altoArea - (Math.max(0, v) / tope) * altoArea;
    let svg = '';
    for (let v = 0; v <= tope + 1; v += paso) {
      svg += `<line class="${v === 0 ? 'base' : 'grilla'}" x1="${mi}" x2="${W - md}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/>`;
      svg += `<text class="eje" x="${mi - 8}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end">${ui.escapar(v ? ui.pesosCorto(v).replace(',0 M', ' M') : '$ 0')}</text>`;
    }
    dias.forEach((f, i) => {
      const x = mi + i * anchoCol, bw = Math.max(4, anchoCol * 0.62), bx = x + (anchoCol - bw) / 2;
      const v = porFecha[f], dia = Number(f.slice(8, 10)), cx = (x + anchoCol / 2).toFixed(1);
      const etiqueta = (dia === 1 || dia % 5 === 0 || (f === d.hoy && (!angosto || dia % 5 > 1 && dia % 5 < 4))) ? `<text class="${f === d.hoy ? 'eje-hoy' : 'eje'}" x="${cx}" y="${H - 10}" text-anchor="middle">${dia}</text>` : '';
      if (f > d.hoy) {
        if (!esDomingo(f)) svg += `<rect class="ini-col-futura" x="${bx.toFixed(1)}" y="${(ms + altoArea - 10).toFixed(1)}" width="${bw.toFixed(1)}" height="10" rx="1.5"/>`;
        svg += etiqueta;
        return;
      }
      if (!v || v.neto <= 0) {
        if (esDomingo(f)) svg += `<text class="domingo" x="${cx}" y="${(ms + altoArea - 4).toFixed(1)}" text-anchor="middle">d</text>`;
        svg += etiqueta;
        return;
      }
      const alto = Math.max(1.5, ms + altoArea - y(v.neto));
      const titulo = ui.fechaLarga(f) + ': ' + ui.pesos(v.neto) + ' sin IVA en ' + v.comprobantes + ' facturas';
      svg += `<g class="dia"><title>${ui.escapar(titulo)}</title><rect class="${f === d.hoy ? 'ini-col-hoy' : 'ini-col'}" x="${bx.toFixed(1)}" y="${(ms + altoArea - alto).toFixed(1)}" width="${bw.toFixed(1)}" height="${alto.toFixed(1)}" rx="1.5"/>` +
        `<rect x="${x.toFixed(1)}" y="${ms}" width="${anchoCol.toFixed(1)}" height="${altoArea}" fill="transparent"/></g>` + etiqueta;
    });
    if (d.promAnt > 0) {
      const yp = y(d.promAnt).toFixed(1);
      svg += `<line class="promedio" x1="${mi}" x2="${W - md}" y1="${yp}" y2="${yp}"/>`;
    }
    return h`<div class="ini-grafico">${ui.seguro(`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${ui.escapar('Ventas por día de ' + F.nombreMes(d.hoy) + ', sin IVA')}">${svg}</svg>`)}</div>
      <div class="ini-leyenda"><span><i style="background:var(--tinta)"></i>Venta del día</span><span><i style="background:var(--senal)"></i>Hoy</span>${d.promAnt > 0 ? h`<span><i class="l-prom"></i>Promedio por día hábil de ${mesSolo(d.antIni)}: ${ui.pesosCorto(d.promAnt)}</span>` : ''}<span>d: domingo, sin reparto</span></div>`;
  }

  // ---------- alertas accionables ----------
  function alertas(d) {
    const lista = [];
    const items = filas => h`<ul class="ini-alerta-items">${filas.map(f => h`<li><a href="${f.ruta}">${f.texto}</a><span>${f.dato}</span>${f.facturar ? h`<button type="button" class="btn btn-secundario" data-accion="facturar" data-id="${f.facturar}" aria-label="${'Facturar el pedido ' + f.nro}">Facturar</button>` : ''}</li>`)}</ul>`;
    if (d.pendientes.length) {
      const total = sum(d.pendientes, p => p.total), conAlerta = d.pendientes.filter(p => p.alertas && p.alertas.length).length;
      lista.push({ tono: 'alerta', num: d.pendientes.length, titulo: d.pendientes.length === 1 ? 'pedido sin facturar' : 'pedidos sin facturar',
        det: 'Suman ' + ui.pesos(total) + ' con IVA.' + (conAlerta ? ' ' + conAlerta + (conAlerta === 1 ? ' excede' : ' exceden') + ' el límite de crédito del cliente.' : ''),
        items: d.pendientes.slice(0, 3).map(p => ({ ruta: '#/ventas/pedido/' + p.id, texto: 'Pedido ' + p.nro + ', ' + (App.get('clientes', p.clienteId) || {}).fantasia, dato: ui.pesosCorto(p.total), facturar: p.id, nro: p.nro })),
        botones: [{ texto: d.pendientes.length > 3 ? 'Ver los ' + d.pendientes.length + ' pedidos' : 'Ver pedidos', ruta: '#/ventas', tipo: 'secundario' }] });
    }
    if (d.remitos.length) {
      const bultos = sum(d.remitos, r => r.bultos || 0), kg = sum(d.remitos, r => r.kg || 0);
      lista.push({ tono: 'info', num: d.remitos.length, titulo: d.remitos.length === 1 ? 'remito sin hoja de ruta' : 'remitos sin hoja de ruta',
        det: 'Pendientes de asignación de chofer y vehículo. Total: ' + ui.num(bultos) + ' bultos y ' + ui.num(kg) + ' kg.',
        items: d.remitos.slice(0, 3).map(r => ({ ruta: '#/entregas', texto: 'Remito ' + r.nro + ', ' + (App.get('clientes', r.clienteId) || {}).fantasia, dato: ui.num(r.bultos || 0) + ' bultos' })),
        botones: [{ texto: 'Armar hoja de ruta', ruta: '#/entregas', tipo: 'secundario' }] });
    }
    if (d.porVencer.length) {
      const vencidos = d.porVencer.filter(v => v.dias < 0).length;
      lista.push({ tono: vencidos ? 'peligro' : 'alerta', num: d.porVencer.length, titulo: d.porVencer.length === 1 ? 'lote vence esta semana' : 'lotes vencen esta semana',
        det: 'Mercadería por ' + ui.pesos(sum(d.porVencer, v => v.costo)) + ' al costo.' + (vencidos ? ' ' + vencidos + ' ya ' + (vencidos === 1 ? 'venció y no se puede vender.' : 'vencieron y no se pueden vender.') : ' Se recomienda priorizar su venta.'),
        items: d.porVencer.slice(0, 3).map(v => ({ ruta: '#/stock/producto/' + v.producto.id, texto: v.producto.descripcion, dato: (v.dias < 0 ? 'venció hace ' + (-v.dias) + ' d' : v.dias === 0 ? 'vence hoy' : 'en ' + v.dias + (v.dias === 1 ? ' día' : ' días')) + ', ' + ui.num(v.cantidad) + ' u.' })),
        botones: [{ texto: 'Ver vencimientos', ruta: '#/stock', tipo: 'secundario' }] });
    }
    if (d.bajo.length) {
      lista.push({ tono: 'peligro', num: d.bajo.length, titulo: d.bajo.length === 1 ? 'producto bajo el mínimo' : 'productos bajo el mínimo',
        det: 'El stock disponible está por debajo del mínimo. Se puede solicitar a cada proveedor lo faltante.',
        items: d.bajo.slice(0, 3).map(b => ({ ruta: '#/stock/producto/' + b.productoId, texto: b.producto.descripcion, dato: ui.num(b.stock) + ' de ' + ui.num(b.minimo) })),
        botones: [{ texto: 'Generar órdenes de compra', accion: 'reponer', tipo: 'secundario' }, { texto: 'Ver stock', ruta: '#/stock' }] });
    }
    if (d.excedidos.length) {
      lista.push({ tono: 'alerta', num: d.excedidos.length, titulo: d.excedidos.length === 1 ? 'cliente con límite de crédito excedido' : 'clientes con límite de crédito excedido',
        det: 'Se recomienda gestionar la cobranza antes de cargar nuevos pedidos. Exceso total: ' + ui.pesos(sum(d.excedidos, x => x.exceso)) + '.',
        items: d.excedidos.slice(0, 3).map(x => ({ ruta: '#/clientes/' + x.cliente.id, texto: x.cliente.fantasia, dato: '+' + ui.pesosCorto(x.exceso) })),
        botones: [{ texto: 'Ver clientes', ruta: '#/clientes', tipo: 'secundario' }] });
    }
    if (d.chequesDepositables.length) {
      lista.push({ tono: 'info', num: d.chequesDepositables.length, titulo: d.chequesDepositables.length === 1 ? 'cheque para depositar' : 'cheques para depositar',
        det: 'Con fecha de pago cumplida. Total: ' + ui.pesos(sum(d.chequesDepositables, c => c.importe)) + '.',
        items: d.chequesDepositables.slice(0, 3).map(c => ({ ruta: '#/cobranzas', texto: c.banco + ' n.º ' + c.numero, dato: ui.pesosCorto(c.importe) })),
        botones: [{ texto: d.chequesDepositables.length === 1 ? 'Depositar el cheque' : 'Depositar los ' + d.chequesDepositables.length + ' cheques', accion: 'depositar', tipo: 'secundario' }] });
    }
    const botones = a => h`<div class="botones">${a.botones.map(b => b.ruta
      ? h`<a class="btn btn-chico btn-${b.tipo || 'fantasma'}" href="${b.ruta}">${b.texto}</a>`
      : h`<button type="button" class="btn btn-chico btn-${b.tipo || 'secundario'}" data-accion="${b.accion}">${b.texto}</button>`)}</div>`;
    return h`<section class="panel ini-alertas" aria-labelledby="ini-alertas-t"><h2 class="panel-titulo" id="ini-alertas-t">Pendientes del día</h2>
      ${lista.length ? lista.map(a => h`<div class="ini-alerta t-${a.tono}">
        <div class="ini-alerta-cab"><span class="ini-alerta-num">${a.num}</span><span class="ini-alerta-titulo">${a.titulo}</span></div>
        <p class="ini-alerta-det">${a.det}</p>${items(a.items)}${botones(a)}</div>`)
      : h`<p class="ini-limpio">Sin pendientes: pedidos facturados, remitos con hoja de ruta y stock por encima del mínimo.</p>`}
    </section>`;
  }

  // ---------- acciones que se resuelven desde el inicio ----------
  // factura un pedido por vez, como en el mostrador: genera factura, remito, cargo en cuenta corriente y asientos
  async function facturarUno(id) {
    const p = App.get('pedidos', id);
    if (!p) return;
    if (!(await App.confirmarLimite(id))) return;
    App.intentar(() => App.acciones.facturarPedido(id), c => 'Pedido ' + p.nro + ' facturado: ' + (App.nombreTipo ? App.nombreTipo(c.tipo) : c.tipo) + ' ' + c.nro);
  }

  function planReposicion() {
    const porProv = {};
    App.q.bajoMinimo().forEach(b => {
      const p = b.producto;
      if (!p.proveedorId || !App.get('proveedores', p.proveedorId)) return;
      const cantidad = Math.max(1, Math.ceil(p.minimo * 2 - b.stock));
      (porProv[p.proveedorId] = porProv[p.proveedorId] || []).push({ producto: p, cantidad, costo: p.costo });
    });
    return Object.keys(porProv).map(id => ({ proveedor: App.get('proveedores', id), items: porProv[id] }));
  }
  function reponer() {
    const plan = planReposicion();
    if (!plan.length) { ui.toast('No hay productos bajo el mínimo con proveedor asignado.', 'info'); return; }
    const cuerpo = h`<p>Se genera una orden de compra por proveedor para llegar al doble del stock mínimo. La recepción de la mercadería se registra desde Compras.</p>
      ${plan.map(g => h`<h3 class="seccion-titulo" style="margin-top:14px">${g.proveedor.razonSocial}</h3>
        <div class="tabla-envoltura"><table class="tabla"><thead><tr><th>Producto</th><th class="al-der">Cantidad</th><th class="al-der">Costo sin IVA</th></tr></thead><tbody>
        ${g.items.map(it => h`<tr><td>${it.producto.descripcion}</td><td class="al-der">${ui.num(it.cantidad)}</td><td class="al-der">${ui.pesos(it.cantidad * it.costo)}</td></tr>`)}
        </tbody></table></div>`)}`;
    const texto = plan.length === 1 ? 'Generar la orden de compra' : 'Generar las ' + plan.length + ' órdenes de compra';
    const m = ui.modal({ titulo: 'Generar órdenes de compra', cuerpo: String(cuerpo), ancho: 680, acciones: [
      { texto: 'Volver', tipo: 'secundario' },
      { texto, tipo: 'primario', alClic: () => {
        let n = 0;
        plan.forEach(g => {
          const r = App.intentar(() => App.acciones.crearOrdenCompra({ proveedorId: g.proveedor.id, items: g.items.map(it => ({ productoId: it.producto.id, cantidad: it.cantidad, costo: it.costo })), obs: 'Reposición de productos bajo el mínimo, armada desde el inicio' }));
          if (r) n++;
        });
        if (n) ui.toast(n === 1 ? 'Orden de compra generada' : n + ' órdenes de compra generadas', 'ok');
      } }
    ] });
  }

  async function depositar() {
    const hoy = App.hoy();
    const lista = App.q.chequesEnCartera().filter(c => c.fechaPago <= hoy);
    if (!lista.length) return;
    const ok = await ui.confirmar('Se depositan ' + lista.length + ' cheques por ' + ui.pesos(sum(lista, c => c.importe)) + ' en la cuenta corriente del banco.', { titulo: 'Depositar cheques', aceptar: 'Depositar cheques' });
    if (!ok) return;
    let n = 0;
    lista.forEach(c => { try { App.acciones.depositarCheque(c.id); n++; } catch (e) { ui.toast(e.message, 'peligro'); } });
    if (n) ui.toast(n === 1 ? 'Cheque depositado' : n + ' cheques depositados', 'ok');
  }

  // ---------- bloques de abajo ----------
  function bloque(titulo, sub, contenido) {
    const s = document.createElement('section');
    s.innerHTML = String(h`<h2 class="seccion-titulo">${titulo} <span class="texto-2">${sub}</span></h2>`);
    s.appendChild(contenido);
    return s;
  }
  function bloqueHojas(d) {
    return bloque('Reparto de hoy', d.hojasHoy.length === 1 ? '1 hoja de ruta' : d.hojasHoy.length + ' hojas de ruta', ui.tabla({
      filas: d.hojasHoy,
      vacio: 'No hay hojas de ruta emitidas en el día. Se generan desde Entregas.',
      alClic: () => ui.ir('#/entregas'),
      columnas: [
        { titulo: 'Hoja', valor: r => h`<span class="celda-principal">${r.nro}</span><span class="celda-sub">${(App.get('choferes', r.choferId) || {}).nombre || ''}</span>` },
        { titulo: 'Entregas', alinear: 'der', valor: r => r.remitoIds.filter(id => { const x = App.get('remitos', id); return x && x.estado !== 'en_ruta' && x.estado !== 'pendiente'; }).length + ' de ' + r.remitoIds.length },
        { titulo: 'Estado', valor: r => ui.estado(r.estado) }
      ]
    }));
  }
  function bloqueDeudores(d) {
    return bloque('Cobranzas pendientes', 'deuda vencida', ui.tabla({
      filas: d.deudores.slice(0, 6),
      vacio: 'Ningún cliente tiene facturas vencidas.',
      alClic: r => ui.ir('#/clientes/' + r.clienteId),
      filaClase: r => r.mas60 > 0 ? 'fila-peligro' : r.d60 > 0 ? 'fila-alerta' : '',
      columnas: [
        { titulo: 'Cliente', valor: r => h`<span class="celda-principal">${r.cliente.fantasia}</span><span class="celda-sub">${r.cliente.localidad}</span>` },
        { titulo: 'Vencido', alinear: 'der', valor: r => ui.pesosCorto(r.vencida) },
        { titulo: 'Más de 60 días', alinear: 'der', valor: r => r.mas60 ? ui.pesosCorto(r.mas60) : '' }
      ]
    }));
  }
  function bloquePreventistas(d) {
    const max = Math.max(1, ...d.preventistas.map(p => p.neto));
    const panel = ui.nodo(String(h`<div class="panel ini-pv">${d.preventistas.length ? d.preventistas.map(p => h`<div class="ini-pv-item"><b>${p.preventista.nombre}${p.preventista.zona ? h` <small>${p.preventista.zona}</small>` : ''}</b><span>${ui.pesosCorto(p.neto)}</span>
      <div class="barra-h" aria-hidden="true"><span style="width:${(p.neto / max * 100).toFixed(1)}%"></span></div></div>`) : h`<span class="texto-2">Sin ventas registradas en el mes.</span>`}</div>`));
    return bloque('Venta del mes por preventista', 'sin IVA', panel);
  }

  App.modulo({
    id: 'inicio',
    titulo: 'Inicio',
    grupo: 'Inicio',
    orden: 0,
    icono: ICONO,
    render(el) {
      estilos();
      const d = calcular();
      const nombreAnt = mesSolo(d.antIni);
      const vsAnt = d.ventasAntCompleto ? variacion(d.proyeccion, d.ventasAntCompleto) : null;
      const fechaTexto = ui.fechaLarga(d.hoy).replace(/^./, c => c.toUpperCase());
      el.innerHTML = String(h`
        <div class="encabezado-vista">
          <div><h1 class="ini-saludo">Buen día, Leandro</h1>
          <p class="bajada">${fechaTexto}. Resumen financiero del día, pendientes y evolución de ventas de ${mesSolo(d.hoy)}.</p></div>
          <div class="acciones"><a class="btn" href="#/preventa">Cargar pedido</a><a class="btn btn-primario" href="#/resultados">Ver estado de resultados</a></div>
        </div>
        ${franja(d)}
        <div class="grilla-lado">
          <div class="ini-izq">
          <section class="panel" aria-labelledby="ini-graf-t">
            <div class="ini-grafico-cab">
              <div><h2 class="panel-titulo" id="ini-graf-t" style="margin-bottom:2px">Ventas por día de ${F.nombreMes(d.hoy)}</h2>
              <p class="nota-discreta">Facturas menos notas de crédito, sin IVA. Días hábiles transcurridos: ${d.habilesHechos} de ${d.habilesMes}.</p></div>
              <div class="ini-resumen">
                <div>Proyección de cierre<strong>${ui.pesosCorto(d.proyeccion)}</strong></div>
                ${d.ventasAntCompleto ? h`<div>Cierre de ${nombreAnt}<strong>${ui.pesosCorto(d.ventasAntCompleto)}</strong></div>` : ''}
                <div>Mejor día<strong>${d.mejor ? ui.fecha(d.mejor.fecha).slice(0, 5) + ', ' + ui.pesosCorto(d.mejor.neto) : 'Sin ventas'}</strong></div>
              </div>
            </div>
            ${grafico(d)}
            ${vsAnt != null ? h`<p class="nota-discreta" style="margin:10px 0 0">La proyección ${vsAnt >= 0 ? 'supera a' : 'queda por debajo de'} ${nombreAnt} en ${ui.num(Math.abs(vsAnt) * 100, 1)} %. Se calcula sobre el promedio de los días hábiles transcurridos.</p>` : ''}
          </section>
          <div class="grilla-2 seccion" id="ini-abajo"></div>
          <div class="seccion" id="ini-pv"></div>
          </div>
          ${alertas(d)}
        </div>`);
      const abajo = el.querySelector('#ini-abajo');
      abajo.appendChild(bloqueHojas(d));
      abajo.appendChild(bloqueDeudores(d));
      el.querySelector('#ini-pv').appendChild(bloquePreventistas(d));
      el.querySelectorAll('[data-accion]').forEach(b => b.addEventListener('click', () => {
        const a = b.dataset.accion;
        if (a === 'facturar') facturarUno(b.dataset.id);
        else if (a === 'reponer') reponer();
        else if (a === 'depositar') depositar();
      }));
    }
  });
})();
