/* Módulo «Estado de resultados» (pedido especial de Budy).
   Cuadro vertical clásico con comparativo contra el período anterior, cascada de la venta al resultado neto
   (con una segunda escala ampliada para que se lean los gastos), margen por rubro y evolución de los 6 meses.
   Cada renglón con cuentas abre el mayor del período. Todo sale de App.q.estadoResultados y App.q.mayor:
   el módulo no guarda nada propio y se actualiza solo cuando otra pantalla factura, cobra o asienta. */
(function () {
  const ui = App.ui, h = ui.h, F = App.f, r2 = App.r2;

  // ---------- estilos propios (prefijo er-), se inyectan una sola vez ----------
  function estilos() {
    if (document.getElementById('estilos-resultados')) return;
    const s = document.createElement('style');
    s.id = 'estilos-resultados';
    s.textContent = `
.er-periodo { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-bottom: 18px; }
.er-periodo select { width: auto; min-width: 220px; }
.er-franja .kpi-valor { font-size: 24px; }
.er-var { font-weight: 600; }
.er-var.bien { color: var(--ok); } .er-var.mal { color: var(--peligro); } .er-var.igual { color: var(--texto-2); }
.er-cuadro .tabla th { white-space: normal; line-height: 1.2; height: auto; padding-top: 9px; padding-bottom: 9px; vertical-align: bottom; }
.er-cuadro .tabla td { height: 36px; }
.er-cuadro .tabla td:first-child { min-width: 300px; }
.er-cuadro .tabla .col-pct { color: var(--texto-2); font-size: var(--fs-13); width: 1%; }
.er-cuadro .tabla .col-ant { color: #3E4851; }
.er-cuadro tr.er-click { cursor: pointer; }
.er-cuadro tr.er-click td:first-child { text-decoration: underline; text-decoration-color: transparent; text-underline-offset: 3px; }
.er-cuadro tr.er-click:hover td:first-child { text-decoration-color: currentColor; }
.er-cuadro tr.er-click:focus-visible { outline: 3px solid var(--senal); outline-offset: -3px; }
.er-cuadro tr.er-cuenta td { height: 30px; font-size: var(--fs-13); color: var(--texto-2); border-bottom-color: transparent; }
.er-cuadro tr.er-cuenta td:first-child { padding-left: 30px; }
.er-cuadro tr.er-grupo td { border-bottom-color: transparent; }
.er-cuadro tr.er-sub td { font-weight: 700; border-top: 1px solid var(--tinta); background: #F7F8F5; }
.er-cuadro tr.er-sub td:first-child { font-stretch: 112%; }
.er-cuadro tr.er-neto td { height: 54px; font-weight: 800; font-stretch: 118%; font-size: var(--fs-16); border-top: 1px solid var(--tinta); border-bottom: 3px double var(--tinta); background: #F7F8F5; }
.er-cuadro tr.er-neto td.er-cifra { font-size: var(--fs-20); }
.er-cuadro tr.er-neto td.col-pct { font-size: var(--fs-14); }
.er-cuadro .neg { color: #7A2620; }
.er-nota { font-size: var(--fs-12); color: var(--texto-2); margin-top: 8px; }
.er-cascada { overflow-x: auto; -webkit-overflow-scrolling: touch; }
.er-cascada svg { display: block; width: 100%; min-width: 760px; height: auto; }
.er-cascada text { font-family: inherit; }
.er-cascada .eje { font-size: 12px; fill: var(--texto-2); }
.er-cascada .rot { font-size: 11.5px; fill: var(--tinta); }
.er-cascada .val { font-size: 12px; font-weight: 800; font-stretch: 118%; fill: var(--tinta); }
.er-cascada .val-baja { fill: var(--peligro); }
.er-cascada .tit { font-size: 13px; font-weight: 700; fill: var(--tinta); }
.er-cascada .tit-2 { font-size: 12px; fill: var(--texto-2); }
.er-cascada .b-total { fill: var(--tinta); }
.er-cascada .b-sub { fill: #556373; }
.er-cascada .b-baja { fill: #C4554D; }
.er-cascada .b-final { fill: var(--ok); }
.er-cascada .b-final-neg { fill: var(--peligro); }
.er-cascada .conector { stroke: #8D979F; stroke-width: 1; stroke-dasharray: 3 3; }
.er-cascada .base { stroke: var(--linea); }
.er-cascada .lupa { fill: var(--neutro-suave); }
.er-cascada .lupa-borde { stroke: #B9C1B8; stroke-width: 1; fill: none; }
.er-cascada .lupa-txt { font-size: 12px; font-weight: 700; fill: var(--texto-2); }
.er-rubro-barra { display: flex; align-items: center; gap: 8px; }
.er-rubro-barra .barra-h { flex: 1; min-width: 70px; }
.er-rubro-barra .barra-h > span { background: var(--carton); }
.er-evo { display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 6fr); gap: 16px; align-items: start; }
.er-evo-graf { padding: 14px 16px 10px; }
.er-evo-graf svg { display: block; width: 100%; height: auto; }
.er-evo-graf .eje { font-size: 12px; fill: var(--texto-2); }
.er-evo-graf .mes { font-size: 13px; fill: var(--tinta); }
.er-evo-graf .mes-sel { font-size: 13px; fill: var(--tinta); font-weight: 700; }
.er-evo-graf .v { font-size: 12.5px; fill: var(--tinta); font-weight: 600; }
.er-evo-graf .b-vta { fill: #B9C2CA; }
.er-evo-graf .b-vta-sel { fill: var(--tinta); }
.er-evo-graf .b-neto { fill: var(--ok); }
.er-evo-graf .b-neto-neg { fill: var(--peligro); }
.er-evo-graf .franja-sel { fill: rgba(244, 196, 48, .16); }
.er-evo-graf a:hover .b-vta { fill: #8E99A3; }
.er-evo-graf a:focus-visible { outline: none; }
.er-evo-graf a:focus-visible rect.zona { stroke: var(--senal); stroke-width: 3; }
.er-evo .tabla td, .er-evo .tabla th { padding: 0 10px; }
.er-evo .tabla th.sel, .er-evo .tabla td.sel { background: rgba(244, 196, 48, .14); }
.er-mayor-res { display: flex; flex-wrap: wrap; gap: 8px 26px; margin-bottom: 12px; font-size: var(--fs-13); color: var(--texto-2); }
.er-mayor-res strong { display: block; color: var(--tinta); font-size: var(--fs-16); font-weight: 800; font-stretch: 112%; }
.er-cuentas { list-style: none; margin: 0 0 14px; padding: 0; border: 1px solid var(--linea); border-radius: var(--r-panel); }
.er-cuentas li + li { border-top: 1px solid var(--linea-suave); }
.er-cuentas button { display: flex; width: 100%; justify-content: space-between; gap: 12px; padding: 9px 12px; border: 0; background: none; cursor: pointer; text-align: left; }
.er-cuentas button:hover { background: var(--fila-hover); }
.er-cuentas small { color: var(--texto-2); margin-right: 8px; }
.er-cuentas b { white-space: nowrap; }
@media (max-width: 1100px) { .er-evo { grid-template-columns: minmax(0, 1fr); } }
@media (max-width: 760px) {
  .er-periodo .segmentado { width: 100%; }
  .er-periodo .segmentado button { flex: 1; padding: 0 6px; }
  .er-periodo select { min-width: 0; flex: 1 1 100%; }
  .er-cuadro .tabla td:first-child { min-width: 0; white-space: normal; }
  .er-cuadro .col-pct, .er-cuadro .col-ant, .er-cuadro .col-dif { display: none; }
  .er-cuadro.er-ver-ant .col-ant, .er-cuadro.er-ver-ant .col-dif { display: table-cell; }
  .er-cascada svg { min-width: 0; }
  .er-cascada svg + svg { margin-top: 14px; }
}
.er-comparar { margin: 0 0 16px; }
.er-comparar .segmentado button { height: auto; min-height: 30px; padding: 5px 12px; white-space: normal; line-height: 1.2; }
.er-ver-celu { margin: 8px 0 0; }`;
    document.head.appendChild(s);
  }

  const ICONO = '<svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 17h14"/><path d="M5 14V9"/><path d="M9 14V5"/><path d="M13 14v-3"/><path d="M17 14V7"/></svg>';

  // ---------- períodos ----------
  const mayus = t => t.charAt(0).toUpperCase() + t.slice(1);
  const nombreMes = m => F.nombreMes(m + '-01');          // 'noviembre 2026'
  const mesCorto = m => F.nombreMesCorto(m + '-01');      // 'nov'
  function sumarMes(m, n) { let [y, mm] = m.split('-').map(Number); mm += n; while (mm < 1) { mm += 12; y--; } while (mm > 12) { mm -= 12; y++; } return y + '-' + String(mm).padStart(2, '0'); }
  function mesesDisponibles() { return F.meses(App.config.desde, App.hoy()); }
  function rango(mIni, mFin) {
    const hoy = App.hoy();
    const desde = mIni + '-01', fin = F.finMes(mFin + '-01');
    return { desde, hasta: fin > hoy ? hoy : fin, parcial: fin > hoy };
  }
  function nombreRango(mIni, mFin, r) {
    const fin = mIni === mFin ? nombreMes(mIni) : F.nombreMes(mIni + '-01').split(' ')[0] + ' a ' + nombreMes(mFin);
    return fin + (r.parcial ? ' (al ' + ui.fecha(r.hasta).slice(0, 5) + ')' : '');
  }
  let compararCompleto = false;
  function periodo(params) {
    const meses = mesesDisponibles(), ultimo = meses[meses.length - 1], primero = meses[0];
    const tipo = ['mes', 'trimestre', 'semestre'].includes(params[0]) ? params[0] : 'mes';
    let mFin = meses.includes(params[1]) ? params[1] : ultimo, largo = tipo === 'mes' ? 1 : tipo === 'trimestre' ? 3 : 6;
    if (tipo === 'semestre') mFin = ultimo;
    let mIni = sumarMes(mFin, -(largo - 1));
    if (mIni < primero) { mIni = primero; if (tipo === 'trimestre') mFin = sumarMes(primero, 2); }
    const r = rango(mIni, mFin);
    const p = Object.assign({ tipo, mIni, mFin, nombre: nombreRango(mIni, mFin, r), corto: mIni === mFin ? mayus(nombreMes(mIni)) : mayus(mesCorto(mIni)) + ' a ' + mesCorto(mFin) + ' ' + mFin.slice(0, 4), anterior: null }, r);
    const aFin = sumarMes(mIni, -1), aIni = sumarMes(aFin, -(largo - 1));
    if (tipo !== 'semestre' && aIni >= primero) {
      const ra = rango(aIni, aFin);
      if (r.parcial && tipo === 'mes' && !compararCompleto) {
        const dia = Math.min(Number(r.hasta.slice(8, 10)), F.diasDelMes(ra.desde));
        ra.fin = ra.hasta; ra.hasta = ra.desde.slice(0, 8) + String(dia).padStart(2, '0');
        ra.prop = dia / F.diasDelMes(ra.desde);
      }
      p.anterior = Object.assign({ mIni: aIni, mFin: aFin, nombre: nombreRango(aIni, aFin, ra), corto: aIni === aFin ? mayus(nombreMes(aIni)) : mayus(mesCorto(aIni)) + ' a ' + mesCorto(aFin) + ' ' + aFin.slice(0, 4) }, ra);
    }
    return p;
  }

  // ---------- formatos ----------
  const fmt = v => { const x = Math.round(v); return x < 0 ? '(' + ui.num(-x, 0) + ')' : ui.num(x, 0); };
  const pct = (v, base) => base ? ui.num(v / base * 100, 1) + ' %' : '';
  function varPct(act, ant, costo) {
    if (ant == null || !ant) return { texto: '', tono: 'igual' };
    if (costo) {
      const p = (Math.abs(act) - Math.abs(ant)) / Math.abs(ant);
      return { texto: (p > 0 ? '+' : p < 0 ? '−' : '') + ui.num(Math.abs(p) * 100, 1) + ' %', tono: Math.abs(p) < 0.0005 ? 'igual' : p > 0 ? 'mal' : 'bien' };
    }
    const p = (act - ant) / Math.abs(ant);
    return { texto: (p > 0 ? '+' : p < 0 ? '−' : '') + ui.num(Math.abs(p) * 100, 1) + ' %', tono: Math.abs(p) < 0.0005 ? 'igual' : p > 0 ? 'bien' : 'mal' };
  }

  // ---------- renglones del cuadro ----------
  const cuentasDe = grupo => App.db.planCuentas.filter(c => c.imputable && c.grupoER === grupo).map(c => c.codigo);
  function valorCuenta(cuenta, per) {
    // signo del cuadro: ingresos positivos, costos y gastos negativos
    const c = App.get('planCuentas', cuenta);
    // los gastos del mes anterior se asientan a fin de mes: para «los mismos días» se toman en proporción
    const s = per.prop && !['ventas', 'devoluciones', 'cmv'].includes(c.grupoER)
      ? App.q.saldoCuenta(cuenta, per.fin, per.desde) * per.prop
      : App.q.saldoCuenta(cuenta, per.hasta, per.desde);
    if (c.grupoER === 'ventas') return s;
    if (c.grupoER === 'devoluciones') return s;   // saldoCuenta ya la da con signo de ingreso (negativa)
    return -s;
  }
  function renglones() {
    return [
      { id: 'ventas', titulo: 'Ventas brutas', v: e => e.ventasBrutas, cuentas: cuentasDe('ventas') },
      { id: 'dev', titulo: 'Devoluciones y notas de crédito', v: e => -e.devoluciones, cuentas: cuentasDe('devoluciones'), costo: true },
      { id: 'vn', titulo: 'Ventas netas', v: e => e.ventasNetas, sub: true },
      { id: 'cmv', titulo: 'Costo de las mercaderías vendidas', v: e => -e.cmv, cuentas: cuentasDe('cmv'), costo: true, abrir: true },
      { id: 'ub', titulo: 'Utilidad bruta', v: e => e.utilidadBruta, sub: true },
      { id: 'com', titulo: 'Gastos de comercialización', v: e => -e.totalGastos.comerciales, cuentas: cuentasDe('comerciales'), costo: true, abrir: true },
      { id: 'adm', titulo: 'Gastos de administración', v: e => -e.totalGastos.administracion, cuentas: cuentasDe('administracion'), costo: true, abrir: true },
      { id: 'iibb', titulo: 'Impuesto sobre los Ingresos Brutos', v: e => -e.iibb, cuentas: cuentasDe('iibb'), costo: true },
      { id: 'ro', titulo: 'Resultado operativo', v: e => e.resultadoOperativo, sub: true },
      { id: 'fin', titulo: 'Gastos financieros', v: e => -e.totalGastos.financieros, cuentas: cuentasDe('financieros'), costo: true, abrir: true },
      { id: 'rag', titulo: 'Resultado antes del impuesto a las ganancias', v: e => e.resultadoAntesGanancias, sub: true },
      { id: 'gan', titulo: 'Impuesto a las ganancias (estimado según escala)', v: e => -e.ganancias, cuentas: cuentasDe('ganancias'), costo: true },
      { id: 'neto', titulo: 'Resultado neto del período', v: e => e.resultadoNeto, neto: true }
    ];
  }

  // Arma las filas del cuadro (sirve para la pantalla y para la hoja impresa)
  function filasCuadro(per, er, erAnt) {
    const filas = [];
    renglones().forEach(r => {
      const act = r.v(er), ant = erAnt ? r.v(erAnt) : null;
      filas.push({ tipo: r.neto ? 'neto' : r.sub ? 'sub' : r.abrir ? 'grupo' : 'simple', id: r.id, titulo: r.titulo, act, ant, costo: r.costo, cuentas: r.cuentas || null });
      if (r.abrir) {
        r.cuentas.forEach(c => {
          const a = valorCuenta(c, per), b = erAnt ? valorCuenta(c, per.anterior) : null;
          if (Math.abs(a) < 0.005 && (b == null || Math.abs(b) < 0.005)) return;
          filas.push({ tipo: 'cuenta', id: c, titulo: App.get('planCuentas', c).nombre, act: a, ant: b, costo: true, cuentas: [c] });
        });
      }
    });
    return filas;
  }

  function cuadroHTML(per, er, erAnt, imprimir) {
    const filas = filasCuadro(per, er, erAnt);
    const conAnt = !!erAnt;
    const cab = h`<thead><tr><th>Concepto</th><th class="al-der">${per.corto}${per.parcial ? h`<br><span style="font-weight:400">al ${ui.fecha(per.hasta).slice(0, 5)}</span>` : ''}</th><th class="al-der col-pct">% s/ ventas</th>
      ${conAnt ? h`<th class="al-der col-ant">${per.anterior.corto}${per.anterior.prop ? h`<br><span style="font-weight:400">al ${ui.fecha(per.anterior.hasta).slice(0, 5)}</span>` : ''}</th><th class="al-der col-pct">% s/ ventas</th><th class="al-der col-dif">Variación $</th><th class="al-der">Variación %</th>` : ''}</tr></thead>`;
    const cuerpo = filas.map(f => {
      const cls = 'er-' + f.tipo + (f.cuentas && !imprimir ? ' er-click' : '');
      const v = varPct(f.act, f.ant, f.costo);
      const dif = conAnt ? f.act - f.ant : 0;
      const neg = x => x < -0.5 ? ' neg' : '';
      return h`<tr class="${cls}"${f.cuentas && !imprimir ? ui.seguro(' tabindex="0" data-fila="' + ui.escapar(f.id) + '"') : ''}>
        <td>${f.titulo}</td>
        <td class="al-der er-cifra${neg(f.act)}">${fmt(f.act)}</td>
        <td class="al-der col-pct">${f.tipo === 'cuenta' ? '' : pct(f.act, er.ventasNetas)}</td>
        ${conAnt ? h`<td class="al-der col-ant${neg(f.ant)}">${fmt(f.ant)}</td><td class="al-der col-pct">${f.tipo === 'cuenta' ? '' : pct(f.ant, erAnt.ventasNetas)}</td>
          <td class="al-der col-dif${neg(dif)}">${Math.abs(dif) < 0.5 ? '0' : (dif > 0 ? '+' : '') + fmt(dif)}</td><td class="al-der"><span class="er-var ${v.tono}">${v.texto}</span></td>` : ''}
      </tr>`;
    });
    return h`<table class="tabla">${cab}<tbody>${cuerpo}</tbody></table>`;
  }

  // ---------- detalle: mayor de las cuentas del renglón en el período ----------
  function abrirDetalle(titulo, cuentas, per) {
    const datos = cuentas.map(c => ({ cuenta: App.get('planCuentas', c), mayor: App.q.mayor(c, per.desde, per.hasta) }));
    const movs = [];
    datos.forEach(d => d.mayor.movimientos.forEach(m => movs.push(Object.assign({ cuentaNombre: d.cuenta.nombre, cuentaTipo: d.cuenta.tipo }, m))));
    movs.sort((a, b) => a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : a.numero - b.numero);
    let acum = 0;
    movs.forEach(m => { acum = r2(acum + (m.cuentaTipo === 'ingreso' ? m.haber - m.debe : m.debe - m.haber)); m.acumulado = acum; });
    const td = r2(movs.reduce((s, m) => s + m.debe, 0)), th = r2(movs.reduce((s, m) => s + m.haber, 0));
    const cuerpo = document.createElement('div');
    cuerpo.innerHTML = String(h`
      <p class="nota-discreta" style="margin-bottom:10px">Del ${ui.fecha(per.desde)} al ${ui.fecha(per.hasta)}. ${cuentas.length === 1 ? 'Cuenta ' + cuentas[0] + '.' : 'Cuentas ' + cuentas.join(', ') + '.'} Al seleccionar un movimiento de venta se abre el comprobante.</p>
      <div class="er-mayor-res"><div>Movimientos<strong>${ui.num(movs.length)}</strong></div><div>Debe<strong>${ui.pesos(td)}</strong></div><div>Haber<strong>${ui.pesos(th)}</strong></div><div>Neto del período<strong>${ui.pesos(acum)}</strong></div></div>
      ${datos.length > 1 ? h`<ul class="er-cuentas">${datos.map(d => h`<li><button type="button" data-cuenta="${d.cuenta.codigo}"><span><small>${d.cuenta.codigo}</small>${d.cuenta.nombre}</span><b>${ui.pesos(d.cuenta.tipo === 'ingreso' ? d.mayor.totalHaber - d.mayor.totalDebe : d.mayor.totalDebe - d.mayor.totalHaber)}</b></button></li>`)}</ul>` : ''}`);
    let modal = null;
    cuerpo.appendChild(ui.tabla({
      filas: movs, limite: 150,
      vacio: 'No hay movimientos en este período.',
      alClic: m => {
        const a = App.get('asientos', m.asientoId);
        const c = a && a.refId ? App.get('comprobantes', a.refId) : null;
        if (c) { modal.cerrar(); ui.ir('#/facturacion/comprobante/' + c.id); }
        else ui.toast('El asiento ' + m.numero + ' no tiene comprobante de venta asociado (origen: ' + (a ? a.origen : 'asiento') + ').', 'info');
      },
      columnas: [
        { titulo: 'Fecha', valor: m => ui.fecha(m.fecha), ordenar: m => m.fecha + String(m.numero).padStart(8, '0') },
        { titulo: 'Asiento', clase: 'ocultar-celu', campo: 'numero', alinear: 'der' },
        ...(cuentas.length > 1 ? [{ titulo: 'Cuenta', clase: 'ocultar-celu', campo: 'cuentaNombre' }] : []),
        { titulo: 'Detalle', campo: 'detalle', clase: 'envolver' },
        { titulo: 'Debe', clase: 'ocultar-celu', alinear: 'der', valor: m => m.debe ? ui.pesos(m.debe) : '', ordenar: m => m.debe },
        { titulo: 'Haber', clase: 'ocultar-celu', alinear: 'der', valor: m => m.haber ? ui.pesos(m.haber) : '', ordenar: m => m.haber },
        { titulo: 'Acumulado', alinear: 'der', valor: m => ui.pesos(m.acumulado) }
      ]
    }));
    cuerpo.querySelectorAll('[data-cuenta]').forEach(b => b.addEventListener('click', () => {
      const c = App.get('planCuentas', b.dataset.cuenta);
      abrirDetalle(c.nombre, [c.codigo], per);
    }));
    modal = ui.modal({ titulo, cuerpo, ancho: 960, acciones: [
      { texto: 'Imprimir mayor', tipo: 'secundario', alClic: () => { imprimirMayor(titulo, cuentas, per, movs, td, th); return false; } },
      { texto: 'Cerrar', tipo: 'primario' }
    ] });
    // sin esto, en el celular la tabla ancha estira el modal más allá de la pantalla
  }

  function imprimirMayor(titulo, cuentas, per, movs, td, th) {
    const html = h`${estiloHoja()}<div class="er-hoja">${encabezadoHoja('Mayor: ' + titulo, per)}
      <p class="er-h-nota">Cuentas: ${cuentas.map(c => c + ' ' + App.get('planCuentas', c).nombre).join('; ')}</p>
      <table class="er-h-tabla"><thead><tr><th>Fecha</th><th class="d">Asiento</th>${cuentas.length > 1 ? h`<th>Cuenta</th>` : ''}<th>Detalle</th><th class="d">Debe</th><th class="d">Haber</th><th class="d">Acumulado</th></tr></thead>
      <tbody>${movs.map(m => h`<tr><td>${ui.fecha(m.fecha)}</td><td class="d">${m.numero}</td>${cuentas.length > 1 ? h`<td>${m.cuentaNombre}</td>` : ''}<td>${m.detalle}</td><td class="d">${m.debe ? ui.num(m.debe, 2) : ''}</td><td class="d">${m.haber ? ui.num(m.haber, 2) : ''}</td><td class="d">${ui.num(m.acumulado, 2)}</td></tr>`)}</tbody>
      <tfoot><tr><td colspan="${cuentas.length > 1 ? 4 : 3}">Totales del período</td><td class="d">${ui.num(td, 2)}</td><td class="d">${ui.num(th, 2)}</td><td></td></tr></tfoot></table>
      ${pieHoja(false)}</div>`;
    ui.imprimir(String(html), { titulo: 'Mayor ' + titulo });
  }

  // ---------- cascada: de la venta al resultado neto ----------
  function cascada(er) {
    const W = 1000, H = 390, arriba = 82, abajo = 66, alto = H - arriba - abajo;
    const pasosA = [
      { t: 'Ventas netas', tipo: 'total', v: er.ventasNetas },
      { t: 'Costo de mercaderías', tipo: 'baja', v: er.cmv },
      { t: 'Utilidad bruta', tipo: 'sub', v: er.utilidadBruta }
    ];
    const pasosB = [
      { t: 'Utilidad bruta', tipo: 'total', v: er.utilidadBruta },
      { t: 'Gastos comerciales', tipo: 'baja', v: er.totalGastos.comerciales },
      { t: 'Gastos de administración', tipo: 'baja', v: er.totalGastos.administracion },
      { t: 'Ingresos Brutos', tipo: 'baja', v: er.iibb },
      { t: 'Resultado operativo', tipo: 'sub', v: er.resultadoOperativo },
      { t: 'Gastos financieros', tipo: 'baja', v: er.totalGastos.financieros },
      { t: 'Impuesto a las ganancias', tipo: 'baja', v: er.ganancias },
      { t: 'Resultado neto', tipo: 'final', v: er.resultadoNeto }
    ];
    function niveles(pasos) {
      let cur = 0;
      return pasos.map(p => {
        let a, b;
        if (p.tipo === 'baja') { a = cur; b = cur - p.v; cur = b; } else { a = 0; b = p.v; cur = p.v; }
        return Object.assign({ a, b }, p);
      });
    }
    const nA = niveles(pasosA), nB = niveles(pasosB);
    const dominio = n => { const vals = n.flatMap(x => [x.a, x.b]); return [Math.min(0, ...vals), Math.max(1, ...vals)]; };
    const [minA, maxA] = dominio(nA), [minB, maxB] = dominio(nB);
    const escala = (min, max) => v => arriba + (max - v) / (max - min) * alto;
    const yA = escala(minA, maxA), yB = escala(minB, maxB);
    const factor = (maxA - minA) / (maxB - minB);
    const xA0 = 40, xA1 = 290, xB0 = 370, xB1 = W - 6;
    let svg = '';
    function partirRotulo(t) {
      const pal = t.split(' ');
      const lineas = [];
      pal.forEach(w => { const u = lineas.length - 1; if (u >= 0 && (lineas[u] + ' ' + w).length <= 13) lineas[u] += ' ' + w; else lineas.push(w); });
      return lineas;
    }
    function dibujar(n, x0, x1, y) {
      const col = (x1 - x0) / n.length, bw = Math.min(64, col * 0.62);
      svg += `<line class="base" x1="${x0}" x2="${x1}" y1="${y(0).toFixed(1)}" y2="${y(0).toFixed(1)}"/>`;
      n.forEach((p, i) => {
        const cx = x0 + col * i + col / 2, bx = cx - bw / 2;
        const top = Math.min(y(p.a), y(p.b)), alt = Math.max(1.5, Math.abs(y(p.a) - y(p.b)));
        const clase = p.tipo === 'total' ? 'b-total' : p.tipo === 'sub' ? 'b-sub' : p.tipo === 'baja' ? 'b-baja' : (p.v < 0 ? 'b-final-neg' : 'b-final');
        const valor = p.tipo === 'baja' ? '−' + ui.pesosCorto(p.v).replace('$ ', '$ ') : ui.pesosCorto(p.v);
        const titulo = p.t + ': ' + ui.pesos(p.tipo === 'baja' ? -p.v : p.v);
        svg += `<g><title>${ui.escapar(titulo)}</title><rect class="${clase}" x="${bx.toFixed(1)}" y="${top.toFixed(1)}" width="${bw.toFixed(1)}" height="${alt.toFixed(1)}" rx="2"/></g>`;
        const debajo = p.tipo !== 'baja' && p.v < 0;
        const ty = debajo ? Math.max(y(p.a), y(p.b)) + 16 : top - 8;
        svg += `<text class="val${p.tipo === 'baja' ? ' val-baja' : ''}" x="${cx.toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="middle">${ui.escapar(valor)}</text>`;
        partirRotulo(p.t).forEach((l, k) => { svg += `<text class="rot" x="${cx.toFixed(1)}" y="${(H - abajo + 18 + k * 14).toFixed(1)}" text-anchor="middle">${ui.escapar(l)}</text>`; });
        if (i < n.length - 1) {
          const sig = x0 + col * (i + 1) + col / 2 - bw / 2;
          svg += `<line class="conector" x1="${(bx + bw).toFixed(1)}" x2="${sig.toFixed(1)}" y1="${y(p.b).toFixed(1)}" y2="${y(p.b).toFixed(1)}"/>`;
        }
      });
      return { col, bw };
    }
    // la lupa: une la utilidad bruta del primer tramo con la del segundo, que está dibujado con otra escala
    const colA = (xA1 - xA0) / nA.length, bwA = Math.min(64, colA * 0.62), colB = (xB1 - xB0) / nB.length, bwB = Math.min(64, colB * 0.62);
    const ubAx = xA0 + colA * 2.5 + bwA / 2, ubBx = xB0 + colB / 2 - bwB / 2;
    if (er.utilidadBruta > 0) {
      svg += `<polygon class="lupa" points="${ubAx.toFixed(1)},${yA(er.utilidadBruta).toFixed(1)} ${ubBx.toFixed(1)},${yB(er.utilidadBruta).toFixed(1)} ${ubBx.toFixed(1)},${yB(0).toFixed(1)} ${ubAx.toFixed(1)},${yA(0).toFixed(1)}"/>`;
      svg += `<line class="lupa-borde" x1="${ubAx.toFixed(1)}" y1="${yA(er.utilidadBruta).toFixed(1)}" x2="${ubBx.toFixed(1)}" y2="${yB(er.utilidadBruta).toFixed(1)}"/>`;
    }
    dibujar(nA, xA0, xA1, yA);
    dibujar(nB, xB0, xB1, yB);
    svg += `<text class="tit" x="${xA0}" y="20">De la venta a la utilidad bruta</text><text class="tit-2" x="${xA0}" y="38">Escala completa</text>`;
    svg += `<text class="tit" x="${xB0}" y="20">De la utilidad bruta al resultado neto</text><text class="tit-2" x="${xB0}" y="38">Escala ampliada para detallar los gastos</text>`;
    void factor;
    if (typeof window !== 'undefined' && window.innerWidth < 760) return cascadaApilada(nA, nB);
    return ui.seguro(`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${ui.escapar('Cascada de ventas netas ' + ui.pesos(er.ventasNetas) + ' a resultado neto ' + ui.pesos(er.resultadoNeto))}">${svg}</svg>`);
  }
  // en el celular: las dos mitades una debajo de la otra, cada una al ancho de la pantalla y con su propia escala
  function cascadaApilada(nA, nB) {
    const W = 340;
    function tramo(n, titulo, sub) {
      const H = 310, arriba = 74, abajo = 50, alto = H - arriba - abajo;
      const vals = n.flatMap(x => [x.a, x.b]), min = Math.min(0, ...vals), max = Math.max(1, ...vals);
      const y = v => arriba + (max - v) / (max - min) * alto;
      const x0 = 4, x1 = W - 4, col = (x1 - x0) / n.length, bw = Math.min(46, col * 0.66);
      let svg = `<text class="tit" x="${x0}" y="18">${ui.escapar(titulo)}</text><text class="tit-2" x="${x0}" y="35">${ui.escapar(sub)}</text>`;
      svg += `<line class="base" x1="${x0}" x2="${x1}" y1="${y(0).toFixed(1)}" y2="${y(0).toFixed(1)}"/>`;
      n.forEach((p, i) => {
        const cx = x0 + col * i + col / 2, bx = cx - bw / 2;
        const top = Math.min(y(p.a), y(p.b)), alt = Math.max(1.5, Math.abs(y(p.a) - y(p.b)));
        const clase = p.tipo === 'total' ? 'b-total' : p.tipo === 'sub' ? 'b-sub' : p.tipo === 'baja' ? 'b-baja' : (p.v < 0 ? 'b-final-neg' : 'b-final');
        const valor = (p.tipo === 'baja' ? '−' : '') + ui.pesosCorto(p.v).replace('$ ', '');
        svg += `<g><title>${ui.escapar(p.t + ': ' + ui.pesos(p.tipo === 'baja' ? -p.v : p.v))}</title><rect class="${clase}" x="${bx.toFixed(1)}" y="${top.toFixed(1)}" width="${bw.toFixed(1)}" height="${alt.toFixed(1)}" rx="2"/></g>`;
        // en columnas angostas los importes van en dos alturas para que no se pisen
        const ty = p.tipo !== 'baja' && p.v < 0 ? Math.max(y(p.a), y(p.b)) + 14 : top - 6 - (n.length > 4 && i % 2 ? 13 : 0);
        svg += `<text class="val${p.tipo === 'baja' ? ' val-baja' : ''}" x="${cx.toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="middle" style="font-size:10.5px">${ui.escapar(valor)}</text>`;
        const pal = p.t.split(' '); const ls = []; pal.forEach(w => { const u = ls.length - 1; if (u >= 0 && (ls[u] + ' ' + w).length <= 11) ls[u] += ' ' + w; else ls.push(w); });
        ls.slice(0, 3).forEach((l, k) => { svg += `<text class="rot" x="${cx.toFixed(1)}" y="${(H - abajo + 14 + k * 12).toFixed(1)}" text-anchor="middle" style="font-size:10px">${ui.escapar(l)}</text>`; });
      });
      return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${ui.escapar(titulo)}">${svg}</svg>`;
    }
    return ui.seguro(tramo(nA, 'De la venta a la utilidad bruta', 'Millones de pesos') +
      tramo(nB, 'De la utilidad bruta al resultado neto', 'Escala ampliada para detallar los gastos'));
  }

  // ---------- margen por rubro ----------
  function tablaRubros(er) {
    const total = er.porRubro.reduce((s, r) => s + r.ventas, 0) || 1;
    const tv = r2(er.porRubro.reduce((s, r) => s + r.ventas, 0)), tc = r2(er.porRubro.reduce((s, r) => s + r.cmv, 0));
    const margenMedio = tv ? (tv - tc) / tv : 0;
    return ui.tabla({
      filas: er.porRubro,
      vacio: 'Sin ventas en el período.',
      filaClase: r => r.margen < margenMedio - 0.015 ? 'fila-alerta' : '',
      columnas: [
        { titulo: 'Rubro', campo: 'rubro', clase: 'celda-principal' },
        { titulo: 'Ventas netas', alinear: 'der', valor: r => ui.pesos(r.ventas), ordenar: r => r.ventas },
        { titulo: 'Participación', clase: 'ocultar-celu', valor: r => h`<div class="er-rubro-barra"><div class="barra-h" aria-hidden="true"><span style="width:${(r.ventas / total * 100).toFixed(1)}%"></span></div><span>${ui.porcentaje(r.ventas / total)}</span></div>`, ordenar: r => r.ventas },
        { titulo: 'Costo', clase: 'ocultar-celu', alinear: 'der', valor: r => ui.pesos(r.cmv), ordenar: r => r.cmv },
        { titulo: 'Utilidad bruta', clase: 'ocultar-celu', alinear: 'der', valor: r => ui.pesos(r.utilidad), ordenar: r => r.utilidad },
        { titulo: 'Margen', alinear: 'der', valor: r => h`<b class="${r.margen >= margenMedio ? 'ok' : 'alerta'}">${ui.porcentaje(r.margen)}</b>`, ordenar: r => r.margen }
      ],
      pie: ['Total', ui.pesos(tv), '100 %', ui.pesos(tc), ui.pesos(tv - tc), ui.porcentaje(margenMedio)]
    });
  }

  // ---------- evolución de los 6 meses ----------
  function evolucion(per) {
    const meses = App.q.estadoResultados(App.config.desde, App.hoy()).porMes;
    const enPer = m => m.mes >= per.mIni && m.mes <= per.mFin;
    const W = 460, H = 300, mi = 6, md = 6;
    const col = (W - mi - md) / meses.length, bw = col * 0.56;
    const maxV = Math.max(1, ...meses.map(m => m.ventasNetas));
    const maxN = Math.max(1, ...meses.map(m => Math.abs(m.resultadoNeto)));
    const vTop = 30, vBase = 168, nBase = 238, nAlto = 40;
    let svg = `<text class="eje" x="${mi}" y="14">Ventas netas</text><text class="eje" x="${mi}" y="${vBase + 26}">Resultado neto y margen neto</text>`;
    meses.forEach((m, i) => {
      const x = mi + col * i, cx = x + col / 2, sel = enPer(m);
      const hv = (m.ventasNetas / maxV) * (vBase - vTop);
      const hn = Math.abs(m.resultadoNeto) / maxN * nAlto;
      const ny = m.resultadoNeto >= 0 ? nBase - hn : nBase;
      const etiqueta = mayus(mesCorto(m.mes)) + (m.completo ? '' : ' *');
      svg += `<a href="#/resultados/mes/${m.mes}" aria-label="${ui.escapar('Ver ' + m.etiqueta)}"><title>${ui.escapar(mayus(m.etiqueta) + ': ventas netas ' + ui.pesos(m.ventasNetas) + ', resultado neto ' + ui.pesos(m.resultadoNeto))}</title>` +
        (sel ? `<rect class="franja-sel" x="${(x + 2).toFixed(1)}" y="20" width="${(col - 4).toFixed(1)}" height="${H - 24}" rx="6"/>` : '') +
        `<rect class="zona" x="${(x + 2).toFixed(1)}" y="20" width="${(col - 4).toFixed(1)}" height="${H - 24}" rx="6" fill="transparent"/>` +
        `<rect class="${sel ? 'b-vta-sel' : 'b-vta'}" x="${(cx - bw / 2).toFixed(1)}" y="${(vBase - hv).toFixed(1)}" width="${bw.toFixed(1)}" height="${hv.toFixed(1)}" rx="2"/>` +
        `<text class="v" x="${cx.toFixed(1)}" y="${(vBase - hv - 6).toFixed(1)}" text-anchor="middle">${ui.escapar(ui.pesosCorto(m.ventasNetas).replace('$ ', ''))}</text>` +
        `<rect class="${m.resultadoNeto >= 0 ? 'b-neto' : 'b-neto-neg'}" x="${(cx - bw / 2).toFixed(1)}" y="${ny.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(1, hn).toFixed(1)}" rx="2"/>` +
        `<text class="v" x="${cx.toFixed(1)}" y="${(nBase + 16).toFixed(1)}" text-anchor="middle">${ui.escapar(ui.pesosCorto(m.resultadoNeto).replace('$ ', ''))}</text>` +
        `<text class="eje" x="${cx.toFixed(1)}" y="${(nBase + 30).toFixed(1)}" text-anchor="middle">${ui.escapar(ui.porcentaje(m.margenNeto))}</text>` +
        `<text class="${sel ? 'mes-sel' : 'mes'}" x="${cx.toFixed(1)}" y="${H - 8}" text-anchor="middle">${ui.escapar(etiqueta)}</text></a>`;
    });
    svg += `<line x1="${mi}" x2="${W - md}" y1="${vBase}" y2="${vBase}" stroke="#D3D8D2"/><line x1="${mi}" x2="${W - md}" y1="${nBase}" y2="${nBase}" stroke="#D3D8D2"/>`;
    const graf = h`<div class="panel er-evo-graf">${ui.seguro(`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Ventas netas y resultado neto de los últimos 6 meses">${svg}</svg>`)}
      <p class="nota-discreta" style="margin:6px 0 0">Millones de pesos. Al seleccionar un mes se abre su estado de resultados.${meses.some(m => !m.completo) ? ' * Mes en curso.' : ''}</p></div>`;
    const conceptos = [
      ['Ventas netas', m => ui.pesosCorto(m.ventasNetas)],
      ['Utilidad bruta', m => ui.pesosCorto(m.utilidadBruta)],
      ['Margen bruto', m => ui.porcentaje(m.margenBruto)],
      ['Gastos e IIBB', m => ui.pesosCorto(m.gastosComerciales + m.gastosAdministracion + m.gastosFinancieros + m.iibb)],
      ['Resultado neto', m => h`<b class="${m.resultadoNeto >= 0 ? '' : 'peligro'}">${ui.pesosCorto(m.resultadoNeto)}</b>`],
      ['Margen neto', m => ui.porcentaje(m.margenNeto)]
    ];
    const tabla = h`<div class="tabla-envoltura"><table class="tabla"><thead><tr><th></th>${meses.map(m => h`<th class="al-der${enPer(m) ? ' sel' : ''}">${mayus(mesCorto(m.mes))}${m.completo ? '' : ' *'}</th>`)}</tr></thead>
      <tbody>${conceptos.map(c => h`<tr><td class="celda-principal">${c[0]}</td>${meses.map(m => h`<td class="al-der${enPer(m) ? ' sel' : ''}">${c[1](m)}</td>`)}</tr>`)}</tbody></table></div>`;
    return { graf, tabla, meses };
  }

  // ---------- hoja impresa ----------
  function estiloHoja() {
    return ui.seguro(`<style>
.er-hoja { font-family: 'Archivo', Arial, sans-serif; color: #000; font-size: 9.5pt; line-height: 1.35; font-variant-numeric: tabular-nums; }
.er-h-cab { display: flex; justify-content: space-between; gap: 8mm; border-bottom: 2px solid #000; padding-bottom: 3mm; margin-bottom: 5mm; }
.er-h-neg { font-weight: 800; font-stretch: 118%; font-size: 13pt; }
.er-h-dat { font-size: 8pt; color: #333; }
.er-h-tit { font-weight: 800; font-stretch: 122%; font-size: 17pt; line-height: 1.05; text-align: right; }
.er-h-per { font-size: 9pt; text-align: right; margin-top: 1.5mm; }
.er-h-nota { font-size: 8pt; color: #333; margin: 0 0 3mm; }
.er-hoja h3 { font-size: 10.5pt; font-weight: 800; font-stretch: 112%; margin: 7mm 0 2mm; }
.er-hoja table { width: 100%; border-collapse: collapse; }
.er-hoja th { font-size: 7.5pt; font-weight: 700; text-align: left; border-bottom: 1.5px solid #000; padding: 1.4mm 1.6mm; vertical-align: bottom; }
.er-hoja td { padding: 1.2mm 1.6mm; border-bottom: 1px solid #E2E2E2; }
.er-hoja .al-der, .er-hoja .d { text-align: right; white-space: nowrap; }
.er-hoja .col-pct { color: #444; font-size: 8pt; }
.er-hoja tr.er-cuenta td { color: #444; font-size: 8.5pt; border-bottom: 0; padding-top: .6mm; padding-bottom: .6mm; }
.er-hoja tr.er-cuenta td:first-child { padding-left: 6mm; }
.er-hoja tr.er-grupo td { border-bottom: 0; }
.er-hoja tr.er-sub td { font-weight: 700; border-top: 1px solid #000; }
.er-hoja tr.er-neto td { font-weight: 800; font-stretch: 115%; font-size: 10.5pt; border-top: 1px solid #000; border-bottom: 3px double #000; }
.er-hoja .er-var.mal { color: #8C1D17; } .er-hoja .er-var.bien { color: #155B39; }
.er-hoja tfoot td { font-weight: 700; border-top: 1.5px solid #000; border-bottom: 0; }
.er-hoja .neg { color: #000; }
.er-h-firmas { display: grid; grid-template-columns: 1fr 1fr; gap: 20mm; margin-top: 22mm; }
.er-h-firmas div { border-top: 1px solid #000; padding-top: 1.5mm; font-size: 8pt; text-align: center; }
.er-h-pie { margin-top: 8mm; font-size: 7.5pt; color: #444; border-top: 1px solid #999; padding-top: 2mm; }
.er-salto { break-before: page; }
</style>`);
  }
  function encabezadoHoja(titulo, per) {
    const c = App.config;
    return h`<div class="er-h-cab"><div><div class="er-h-neg">${c.razonSocial || c.negocio}</div>
      <div class="er-h-dat">CUIT ${c.cuit}. ${c.condicionIVA || ''}<br>${c.domicilio}${c.iibb ? h`<br>Ingresos Brutos ${c.iibb}` : ''}</div></div>
      <div><div class="er-h-tit">${titulo}</div><div class="er-h-per">Del ${ui.fecha(per.desde)} al ${ui.fecha(per.hasta)}</div></div></div>`;
  }
  function pieHoja(firmas) {
    return h`${firmas ? h`<div class="er-h-firmas"><div>Socio gerente</div><div>Contador público</div></div>` : ''}
      <div class="er-h-pie">Información de gestión, sin auditar, emitida el ${ui.fecha(App.hoy())}. Datos de ejemplo. ${App.config.negocio}.</div>`;
  }
  function imprimirEstado(per, er, erAnt) {
    const evo = evolucion(per);
    const filasRub = er.porRubro;
    const tv = filasRub.reduce((s, r) => s + r.ventas, 0) || 1;
    const html = h`${estiloHoja()}<div class="er-hoja">
      ${encabezadoHoja('Estado de resultados', per)}
      <p class="er-h-nota">Cifras en pesos, sin centavos. Los importes entre paréntesis son negativos.${erAnt ? ' Comparado con ' + per.anterior.nombre + '.' : ''}${per.parcial ? ' El período va hasta el ' + ui.fecha(per.hasta) + ': los gastos están devengados a esa fecha.' : ''}</p>
      ${cuadroHTML(per, er, erAnt, true)}
      <h3>Margen por rubro</h3>
      <table><thead><tr><th>Rubro</th><th class="d">Ventas netas</th><th class="d">Participación</th><th class="d">Costo</th><th class="d">Utilidad bruta</th><th class="d">Margen</th></tr></thead>
      <tbody>${filasRub.map(r => h`<tr><td>${r.rubro}</td><td class="d">${fmt(r.ventas)}</td><td class="d">${ui.porcentaje(r.ventas / tv)}</td><td class="d">${fmt(r.cmv)}</td><td class="d">${fmt(r.utilidad)}</td><td class="d">${ui.porcentaje(r.margen)}</td></tr>`)}</tbody></table>
      <h3>Evolución mensual</h3>
      <table><thead><tr><th></th>${evo.meses.map(m => h`<th class="d">${mayus(m.etiqueta)}${m.completo ? '' : ' *'}</th>`)}</tr></thead><tbody>
      ${[['Ventas netas', 'ventasNetas'], ['Utilidad bruta', 'utilidadBruta'], ['Resultado operativo', 'resultadoOperativo'], ['Resultado neto', 'resultadoNeto']].map(c => h`<tr><td>${c[0]}</td>${evo.meses.map(m => h`<td class="d">${fmt(m[c[1]])}</td>`)}</tr>`)}
      <tr><td>Margen neto</td>${evo.meses.map(m => h`<td class="d">${ui.porcentaje(m.margenNeto)}</td>`)}</tr></tbody></table>
      ${evo.meses.some(m => !m.completo) ? h`<p class="er-h-nota" style="margin-top:2mm">* Mes en curso.</p>` : ''}
      ${pieHoja(true)}</div>`;
    ui.imprimir(String(html), { titulo: 'Estado de resultados ' + per.nombre });
  }

  // Mes anterior «a los mismos días»: ventas, devoluciones y costo de lo que pasó hasta ese día;
  // los gastos, IIBB y ganancias (que se asientan a fin de mes) en proporción a los días, igual que el mes en curso.
  function erProporcional(ant) {
    const base = App.q.estadoResultados(ant.desde, ant.hasta);
    const comp = App.q.estadoResultados(ant.desde, ant.fin);
    const k = ant.prop;
    const e = Object.assign({}, base);
    e.totalGastos = { comerciales: r2(comp.totalGastos.comerciales * k), administracion: r2(comp.totalGastos.administracion * k), financieros: r2(comp.totalGastos.financieros * k) };
    e.iibb = r2(comp.iibb * k); e.ganancias = r2(comp.ganancias * k);
    e.resultadoOperativo = r2(e.utilidadBruta - e.totalGastos.comerciales - e.totalGastos.administracion - e.iibb);
    e.resultadoAntesGanancias = r2(e.resultadoOperativo - e.totalGastos.financieros);
    e.resultadoNeto = r2(e.resultadoAntesGanancias - e.ganancias);
    e.margenNeto = e.ventasNetas ? e.resultadoNeto / e.ventasNetas : 0;
    return e;
  }

  // ---------- pantalla ----------
  App.modulo({
    id: 'resultados',
    titulo: 'Estado de resultados',
    grupo: 'Finanzas',
    orden: 10,
    icono: ICONO,
    render(el, params) {
      estilos();
      const per = periodo(params || []);
      const er = App.q.estadoResultados(per.desde, per.hasta);
      const erAnt = per.anterior ? (per.anterior.prop ? erProporcional(per.anterior) : App.q.estadoResultados(per.anterior.desde, per.anterior.hasta)) : null;
      const meses = mesesDisponibles();
      const opcionesTri = meses.slice(2).reverse().map(m => ({ m, t: mayus(F.nombreMes(sumarMes(m, -2) + '-01').split(' ')[0]) + ' a ' + nombreMes(m) }));
      const opcionesMes = meses.slice().reverse().map(m => ({ m, t: mayus(nombreMes(m)) + (m === meses[meses.length - 1] && per.parcial ? ' (en curso)' : '') }));
      const vVn = erAnt ? varPct(er.ventasNetas, erAnt.ventasNetas) : null;
      const vNeto = erAnt ? varPct(er.resultadoNeto, erAnt.resultadoNeto) : null;
      const gastos = er.totalGastos.comerciales + er.totalGastos.administracion + er.totalGastos.financieros + er.iibb;
      const gastosAnt = erAnt ? erAnt.totalGastos.comerciales + erAnt.totalGastos.administracion + erAnt.totalGastos.financieros + erAnt.iibb : 0;
      const detVar = (v, txt) => v && v.texto ? h`<span class="er-var ${v.tono}">${v.texto}</span> ${txt}` : txt;
      const contra = erAnt ? 'contra ' + per.anterior.corto.toLowerCase() + (per.anterior.prop ? ' al ' + ui.fecha(per.anterior.hasta).slice(0, 5) : '') : '';
      const mesAntNombre = per.anterior ? F.nombreMes(per.anterior.desde).split(' ')[0] : '';

      el.innerHTML = String(h`
        <div class="encabezado-vista">
          <div><h1 class="titulo-vista">Estado de resultados</h1>
          <p class="bajada">${mayus(per.nombre)}, del ${ui.fecha(per.desde)} al ${ui.fecha(per.hasta)}. ${erAnt ? 'Comparado con ' + per.anterior.nombre + (per.anterior.prop ? ' al ' + ui.fecha(per.anterior.hasta) : '') + '.' : 'No hay datos anteriores a junio para comparar.'}</p></div>
          <div class="acciones"><button type="button" class="btn btn-primario" id="er-imprimir">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" aria-hidden="true"><path d="M5.5 7V3h9v4"/><rect x="2.5" y="7" width="15" height="7" rx="1.5"/><path d="M5.5 11.5h9V17h-9z"/></svg>Imprimir estado de resultados</button></div>
        </div>
        <div class="er-periodo">
          <div class="segmentado" role="group" aria-label="Tipo de período">
            <button type="button" data-tipo="mes" aria-pressed="${per.tipo === 'mes'}">Mes</button>
            <button type="button" data-tipo="trimestre" aria-pressed="${per.tipo === 'trimestre'}">Trimestre</button>
            <button type="button" data-tipo="semestre" aria-pressed="${per.tipo === 'semestre'}">Últimos 6 meses</button>
          </div>
          ${per.tipo !== 'semestre' ? h`<label class="solo-lector" for="er-elegir">Período</label><select id="er-elegir">${(per.tipo === 'mes' ? opcionesMes : opcionesTri).map(o => h`<option value="${o.m}"${ui.seguro(o.m === per.mFin ? ' selected' : '')}>${o.t}</option>`)}</select>` : ''}
        </div>
        <div class="franja-kpi er-franja">
          ${ui.kpi({ titulo: 'Ventas netas', valor: ui.pesosCorto(er.ventasNetas), detalle: erAnt ? detVar(vVn, contra) : 'sin IVA' })}
          ${ui.kpi({ titulo: 'Utilidad bruta', valor: ui.pesosCorto(er.utilidadBruta), detalle: 'margen bruto ' + ui.porcentaje(er.margenBruto) + (erAnt ? ' (antes ' + ui.porcentaje(erAnt.margenBruto) + ')' : '') })}
          ${ui.kpi({ titulo: 'Gastos, IIBB y financieros', valor: ui.pesosCorto(gastos), detalle: pct(gastos, er.ventasNetas) + ' de las ventas' + (erAnt ? ' (antes ' + pct(gastosAnt, erAnt.ventasNetas) + ')' : '') })}
          ${ui.kpi({ titulo: 'Resultado neto', valor: ui.pesosCorto(er.resultadoNeto), tono: er.resultadoNeto >= 0 ? 'ok' : 'peligro', detalle: erAnt ? detVar(vNeto, 'margen neto ' + ui.porcentaje(er.margenNeto)) : 'margen neto ' + ui.porcentaje(er.margenNeto) })}
        </div>
        ${per.parcial && per.tipo === 'mes' && per.anterior ? h`<div class="filtros er-comparar"><div class="segmentado" role="group" aria-label="Comparar contra">
            <button type="button" data-comparar="dias" aria-pressed="${!compararCompleto}">Contra ${mesAntNombre} a los mismos días</button>
            <button type="button" data-comparar="completo" aria-pressed="${compararCompleto}">Contra ${mesAntNombre} completo</button></div></div>` : ''}
        ${per.parcial && erAnt ? h`<div class="aviso" style="margin-bottom:16px">${mayus(per.nombre)} todavía no cerró. ${per.anterior.prop
          ? 'Se compara con ' + per.anterior.nombre + ' del 1 al ' + Number(per.anterior.hasta.slice(8, 10)) + ': ventas y costo de esos días; sueldos, alquiler y demás gastos fijos en proporción a los días, con el mismo criterio que el mes en curso.'
          : 'Se compara con ' + per.anterior.nombre + ' completo: las cifras en pesos resultan menores por los días faltantes. Para una comparación proporcional, corresponde tomar las columnas «% s/ ventas».'}</div>` : ''}

        <section aria-labelledby="er-cuadro-t">
          <h2 class="seccion-titulo" id="er-cuadro-t">Cuadro de resultados <span class="texto-2">en pesos, sin centavos; entre paréntesis, importes negativos</span></h2>
          <div class="tabla-envoltura er-cuadro">${cuadroHTML(per, er, erAnt, false)}</div>
          ${erAnt ? h`<button type="button" class="btn btn-secundario btn-chico solo-celu er-ver-celu" id="er-ver-ant" aria-pressed="false">Ver ${per.anterior.corto.toLowerCase()}</button>` : ''}
          <p class="er-nota">Al seleccionar un renglón se abre el mayor de la cuenta en el período. El impuesto a las ganancias es una provisión estimada según la escala para sociedades sobre el resultado acumulado anualizado; un mes con pérdida baja la provisión. En el mes en curso todos los gastos fijos (sueldos, alquiler, honorarios, servicios) están devengados en proporción a los días.</p>
        </section>

        <section class="seccion" aria-labelledby="er-cascada-t">
          <h2 class="seccion-titulo" id="er-cascada-t">Rentabilidad por peso vendido <span class="texto-2">${ui.num(er.ventasNetas ? er.resultadoNeto / er.ventasNetas * 100 : 0, 1)} centavos de resultado neto por cada peso de venta neta</span></h2>
          <div class="panel er-cascada">${cascada(er)}</div>
        </section>

        <section class="seccion" aria-labelledby="er-rubros-t">
          <h2 class="seccion-titulo" id="er-rubros-t">Margen por rubro <span class="texto-2">se destacan los rubros por debajo del margen promedio</span></h2>
          <p class="er-nota" style="margin:-4px 0 10px">Facturas menos notas de crédito de cada rubro. El costo no incluye las diferencias de inventario, que no se asignan a un rubro.</p>
          <div id="er-rubros"></div>
        </section>

        <section class="seccion" aria-labelledby="er-evo-t">
          <h2 class="seccion-titulo" id="er-evo-t">Evolución de los últimos 6 meses</h2>
          <div class="er-evo" id="er-evo"></div>
        </section>`);

      el.querySelector('#er-rubros').appendChild(tablaRubros(er));
      const evo = evolucion(per);
      const caja = el.querySelector('#er-evo');
      caja.appendChild(ui.nodo(String(evo.graf)));
      caja.appendChild(ui.nodo(String(evo.tabla)));

      el.querySelectorAll('[data-tipo]').forEach(b => b.addEventListener('click', () => {
        const t = b.dataset.tipo;
        ui.ir('#/resultados/' + t + (t === 'semestre' ? '' : '/' + (t === 'trimestre' && per.mFin < meses[2] ? meses[2] : per.mFin)));
      }));
      const sel = el.querySelector('#er-elegir');
      if (sel) sel.addEventListener('change', () => ui.ir('#/resultados/' + per.tipo + '/' + sel.value));
      el.querySelector('#er-imprimir').addEventListener('click', () => imprimirEstado(per, er, erAnt));
      el.querySelectorAll('[data-comparar]').forEach(b => b.addEventListener('click', () => { compararCompleto = b.dataset.comparar === 'completo'; App.renderizar(); }));
      const verAnt = el.querySelector('#er-ver-ant');
      if (verAnt) verAnt.addEventListener('click', () => { const on = el.querySelector('.er-cuadro').classList.toggle('er-ver-ant'); verAnt.setAttribute('aria-pressed', on); verAnt.textContent = (on ? 'Ocultar ' : 'Ver ') + per.anterior.corto.toLowerCase(); });

      const filas = filasCuadro(per, er, erAnt);
      el.querySelectorAll('.er-cuadro tr[data-fila]').forEach(tr => {
        const f = filas.find(x => x.id === tr.dataset.fila);
        if (!f) return;
        const abrir = () => abrirDetalle(f.titulo, f.cuentas, per);
        tr.addEventListener('click', abrir);
        tr.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(); } });
      });
    }
  });
})();
