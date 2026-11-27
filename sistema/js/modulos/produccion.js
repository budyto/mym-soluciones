/* Módulo «Producción» (pedido de Leandro: «calculador de costos, módulo de producción»).
   Rutas:
     #/produccion                       pestañas Recetas, Calculador de costos y Órdenes de producción
     #/produccion/recetas | calculador[/<recetaId>] | ordenes
     #/produccion/receta/nueva          alta de receta
     #/produccion/receta/<id>           ficha de la receta
     #/produccion/receta/<id>/editar    edición de la receta
     #/produccion/orden/nueva[/<recetaId>]  nueva orden con control de faltantes
     #/produccion/orden/<id>            ficha de la orden (imprimible)
   Todo cambio pasa por App.acciones.guardarReceta y App.acciones.producir. El calculador simula sin guardar. */
(function () {
  'use strict';
  const ui = App.ui, h = ui.h;
  const C = App.config;

  // estado de la pantalla: sobrevive a los re-render que dispara el store
  const est = {
    calc: { recetaId: null, modo: 'tandas', valor: 1, rinde: null, cantidades: {}, costos: {}, otros: null },
    borradores: {},
    orden: { recetaId: null, tandas: 1, depositoId: 'D1', obs: '' }
  };

  const prod = id => App.get('productos', id) || { id, descripcion: id, unidad: '', costo: 0 };
  const dep = id => App.get('depositos', id) || { id, nombre: id };
  const receta = id => App.get('recetas', id);
  const r2 = n => Math.round((Number(n) || 0) * 100) / 100;
  const r4 = n => Math.round((Number(n) || 0) * 10000) / 10000;
  // cantidades: enteras sin decimales, fracciones con 2 o 3
  const cant = n => { const v = r4(n); return ui.num(v, Number.isInteger(v) ? 0 : Math.abs(v * 100 - Math.round(v * 100)) < 1e-6 ? 2 : 3); };
  const unidad = p => String(p.unidad || '').toLowerCase();
  const pct = m => ui.num(m * 100, 1) + ' %';
  const tonoMargen = m => m < 0 ? 'peligro' : m < 0.15 ? 'alerta' : 'ok';
  const mesActual = () => C.hoy.slice(0, 7);
  const nombreMes = () => new Date(C.hoy + 'T12:00:00').toLocaleDateString('es-AR', { month: 'long' });

  const ICONO = '<svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 17.5h15"/><path d="M3.5 17.5V9.5l4 2.5V9.5l4 2.5V4h4.5v13.5"/><path d="M13.5 7h2"/></svg>';

  const encabezado = (titulo, bajada, migas, acciones) => h`<div class="encabezado-vista"><div>
      ${migas ? h`<div class="migas">${migas}</div>` : ''}<h1 class="titulo-vista">${titulo}</h1>${bajada ? h`<p class="bajada">${bajada}</p>` : ''}</div>
      ${acciones ? h`<div class="acciones">${acciones}</div>` : ''}</div>`;
  const miga = h`<a href="#/produccion">Producción</a> / `;
  const noEncontrada = titulo => h`<div class="vacio vacio-grande"><h1 class="titulo-vista">${titulo}</h1><p>Puede que el enlace esté mal o que ya no exista.</p><a class="btn btn-primario" href="#/produccion">Volver a Producción</a></div>`;
  const NOTA_VALOR = 'El producto terminado entra al stock valorizado al costo de los materiales: la mano de obra y los gastos de fabricación ya están en los gastos del mes.';

  // ---------- cálculo con simulación (sin guardar) ----------
  // sim: { rinde, cantidades: {productoId: cantidad por tanda}, costos: {productoId: costo unitario}, otros: [{concepto, importe}] }
  function armar(r, sim) {
    const s = sim || {};
    return Object.assign({}, r, {
      rinde: s.rinde != null ? s.rinde : r.rinde,
      insumos: r.insumos.map(i => ({ productoId: i.productoId, cantidad: s.cantidades && s.cantidades[i.productoId] != null ? s.cantidades[i.productoId] : i.cantidad })),
      otrosCostos: s.otros || r.otrosCostos || []
    });
  }
  function calcular(r, tandas, sim) {
    if (!r || !r.productoId || !App.get('productos', r.productoId)) return null;
    const k = App.q.costoReceta(armar(r, sim), tandas);
    if (!k) return null;
    const costos = (sim && sim.costos) || {};
    k.insumos.forEach(i => {
      i.costoReal = i.costoUnitario;
      const c = costos[i.productoId];
      if (c != null && c !== '' && Number(c) !== i.costoUnitario) { i.costoUnitario = Number(c); i.subtotal = r2(i.cantidad * i.costoUnitario); i.simulado = true; }
    });
    k.materiales = r2(k.insumos.reduce((s, i) => s + i.subtotal, 0));
    k.total = r2(k.materiales + k.otros);
    k.porUnidad = k.cantidad ? r2(k.total / k.cantidad) : 0;
    k.materialesPorUnidad = k.cantidad ? r2(k.materiales / k.cantidad) : 0;
    k.listas = k.listas.map(x => ({ lista: x.lista, precio: x.precio, margen: x.precio ? (x.precio - k.porUnidad) / x.precio : 0 }));
    return k;
  }
  function rangoMargen(k) {
    if (!k || !k.listas.length) return null;
    const ord = k.listas.slice().sort((a, b) => a.margen - b.margen);
    return { min: ord[0], max: ord[ord.length - 1] };
  }

  // escalera de márgenes: por cada lista, el precio neto partido en costo y margen
  function escalera(k) {
    const max = Math.max(...k.listas.map(x => x.precio), k.porUnidad, 1);
    return h`<div class="pr-escalera" role="list">${k.listas.map(x => {
      const costo = Math.min(k.porUnidad, x.precio);
      return h`<div class="pr-escalon" role="listitem">
        <div class="pr-escalon-nombre"><strong>${x.lista.nombre}</strong><span>${ui.pesos(x.precio)} neto</span></div>
        <div class="pr-escalon-barra" aria-hidden="true"><span class="pr-costo" style="width:${(costo / max * 100).toFixed(2)}%"></span><span class="pr-margen pr-${tonoMargen(x.margen)}" style="width:${(Math.max(0, x.precio - costo) / max * 100).toFixed(2)}%"></span></div>
        <div class="pr-escalon-margen ${tonoMargen(x.margen)}"><strong>${pct(x.margen)}</strong><span>${ui.pesos(x.precio - k.porUnidad)} por ${k.producto ? unidad(k.producto) : 'unidad'}</span></div>
      </div>`;
    })}</div><p class="nota-discreta pr-leyenda"><span><i class="pr-muestra pr-costo"></i>Costo por unidad</span><span><i class="pr-muestra pr-margen pr-ok"></i>Margen sobre el precio neto</span></p>`;
  }

  function resumenCosto(k, titulo) {
    const p = k.producto;
    return h`<div class="pr-resumen">
      <div class="pr-resumen-cabeza"><span class="texto-2">${titulo}</span>
        <div class="cifra-grande">${ui.pesos(k.porUnidad)}</div>
        <span class="texto-2">por ${unidad(p)} de ${p.descripcion}</span></div>
      <dl class="datos pr-datos">
        <dt>Se producen</dt><dd>${cant(k.cantidad)} ${unidad(p)}${k.tandas !== 1 ? h` <span class="texto-2">(${cant(k.tandas)} tandas)</span>` : ''}</dd>
        <dt>Materiales</dt><dd>${ui.pesos(k.materiales)}</dd>
        <dt>Otros costos</dt><dd>${ui.pesos(k.otros)}</dd>
        <dt>Costo total</dt><dd><strong>${ui.pesos(k.total)}</strong></dd>
        <dt>Materiales por unidad</dt><dd>${ui.pesos(k.materialesPorUnidad)}</dd>
      </dl>
      <h3 class="pr-subtitulo">Margen contra cada lista de precios</h3>
      ${escalera(k)}
    </div>`;
  }

  // ---------- pantalla principal con pestañas ----------
  function principal(el, params) {
    const recetas = App.db.recetas.filter(r => r.activa !== false);
    const ops = App.db.ordenesProduccion;
    const delMes = ops.filter(o => o.fecha.slice(0, 7) === mesActual());
    let peor = null;
    recetas.forEach(r => { const g = rangoMargen(calcular(r, 1)); if (g && (!peor || g.min.margen < peor.m.margen)) peor = { r, m: g.min }; });
    el.appendChild(ui.nodo(String(encabezado('Producción',
      'Recetas de la marca propia, costo de cada unidad producida y órdenes de producción. Cada orden descuenta los insumos del stock por vencimiento y suma el producto terminado como lote nuevo.', null,
      h`<a class="btn btn-secundario" href="#/produccion/receta/nueva">Nueva receta</a><a class="btn btn-primario" href="#/produccion/orden/nueva">Nueva orden de producción</a>`))));
    el.appendChild(ui.nodo(String(ui.franjaKpi([
      { titulo: 'Recetas activas', valor: ui.num(recetas.length), detalle: new Set(recetas.map(r => r.productoId)).size + ' productos propios' },
      { titulo: 'Órdenes en ' + nombreMes(), valor: ui.num(delMes.length), detalle: delMes.length ? delMes.map(o => cant(o.cantidad) + ' ' + unidad(prod(o.productoId)) + ' de ' + prod(o.productoId).descripcion).slice(0, 2).join('; ') : 'Sin órdenes este mes' },
      { titulo: 'Materiales consumidos en ' + nombreMes(), valor: ui.pesosCorto(delMes.reduce((s, o) => s + o.costoMateriales, 0)), detalle: 'valorizados al costo de cada lote' },
      peor ? { titulo: 'Margen más bajo', valor: pct(peor.m.margen), detalle: peor.r.nombre + ', lista ' + peor.m.lista.nombre, tono: tonoMargen(peor.m.margen) === 'ok' ? null : tonoMargen(peor.m.margen) }
        : { titulo: 'Margen más bajo', valor: 'Sin datos', detalle: 'Cargá una receta' }
    ]))));
    const ids = ['recetas', 'calculador', 'ordenes'];
    const activa = ids.includes(params[0]) ? params[0] : null;
    if (params[0] === 'calculador' && params[1] && receta(params[1]) && est.calc.recetaId !== params[1]) elegirReceta(params[1]);
    const cont = document.createElement('div');
    el.appendChild(cont);
    ui.pestanas(cont, [
      { id: 'recetas', titulo: 'Recetas', cuenta: recetas.length, render: tabRecetas },
      { id: 'calculador', titulo: 'Calculador de costos', render: tabCalculador },
      { id: 'ordenes', titulo: 'Órdenes de producción', cuenta: ops.length, render: tabOrdenes }
    ], { clave: 'produccion', activa, alCambiar: id => { const destino = '#/produccion/' + id; if (!location.hash.startsWith(destino)) history.replaceState(null, '', destino); } });
  }

  function tabRecetas(panel) {
    const recetas = App.db.recetas.filter(r => r.activa !== false);
    const filtros = ui.nodo(String(h`<div class="filtros"><input type="search" placeholder="Buscar receta, producto o insumo" aria-label="Buscar receta"></div>`));
    panel.appendChild(filtros);
    const filas = recetas.map(r => ({ r, k: calcular(r, 1) })).filter(f => f.k);
    const filtrar = t => filas.filter(f => ui.coincide(t, f.r.nombre, f.k.producto.descripcion, ...f.r.insumos.map(i => prod(i.productoId).descripcion)));
    const tabla = ui.tabla({
      filas,
      alClic: f => ui.ir('#/produccion/receta/' + f.r.id),
      columnas: [
        { titulo: 'Receta', ordenar: f => f.r.nombre, valor: f => h`<span class="celda-principal">${f.r.nombre}</span><span class="celda-sub">RE ${String(f.r.numero).padStart(4, '0')}, produce ${f.k.producto.descripcion}</span>` },
        { titulo: 'Rinde por tanda', alinear: 'der', ordenar: f => f.r.rinde, valor: f => cant(f.r.rinde) + ' ' + unidad(f.k.producto) },
        { titulo: 'Insumos', alinear: 'der', clase: 'ocultar-celu', valor: f => String(f.r.insumos.length) },
        { titulo: 'Costo por unidad', alinear: 'der', ordenar: f => f.k.porUnidad, valor: f => h`<span class="celda-principal">${ui.pesos(f.k.porUnidad)}</span><span class="celda-sub">materiales ${ui.pesos(f.k.materialesPorUnidad)}</span>` },
        { titulo: 'Margen según lista', alinear: 'der', ordenar: f => rangoMargen(f.k).min.margen, valor: f => { const g = rangoMargen(f.k);
          return h`<span class="celda-principal ${tonoMargen(g.min.margen)}">${pct(g.min.margen)} a ${pct(g.max.margen)}</span><span class="celda-sub">${g.min.lista.nombre} a ${g.max.lista.nombre}</span>`; } },
        { titulo: 'Insumos para una tanda', clase: 'ocultar-celu', valor: f => f.k.faltantes.length ? ui.chip('Faltan ' + f.k.faltantes.length, 'alerta') : ui.chip('Alcanzan', 'ok') }
      ],
      vacio: h`Todavía no hay recetas. <a href="#/produccion/receta/nueva">Cargá la primera receta</a>.`
    });
    panel.appendChild(tabla);
    ui.buscador(filtros.querySelector('input'), t => tabla.actualizar(filtrar(t)));
  }

  function tabOrdenes(panel) {
    const ops = App.db.ordenesProduccion.slice().sort((a, b) => b.numero - a.numero);
    const fila = ui.nodo(String(h`<div class="filtros fila separar"><span class="texto-2">Del más reciente al más antiguo. ${NOTA_VALOR}</span><a class="btn btn-secundario" href="#/produccion/orden/nueva">Nueva orden de producción</a></div>`));
    panel.appendChild(fila);
    panel.appendChild(ui.tabla({
      filas: ops,
      alClic: o => ui.ir('#/produccion/orden/' + o.id),
      columnas: [
        { titulo: 'N.º', campo: 'numero', valor: o => h`<span class="celda-principal">${o.nro}</span><span class="celda-sub">${ui.fecha(o.fecha)}</span>` },
        { titulo: 'Producto', ordenar: o => prod(o.productoId).descripcion, valor: o => h`<span class="celda-principal">${prod(o.productoId).descripcion}</span><span class="celda-sub">${cant(o.tandas)} ${o.tandas === 1 ? 'tanda' : 'tandas'}, ${dep(o.depositoId).nombre}</span>` },
        { titulo: 'Producido', alinear: 'der', campo: 'cantidad', valor: o => cant(o.cantidad) + ' ' + unidad(prod(o.productoId)) },
        { titulo: 'Materiales', alinear: 'der', clase: 'ocultar-celu', campo: 'costoMateriales', valor: o => ui.pesos(o.costoMateriales) },
        { titulo: 'Costo por unidad', alinear: 'der', campo: 'costoUnitario', valor: o => h`<span class="celda-principal">${ui.pesos(o.costoUnitario)}</span><span class="celda-sub">con otros costos ${ui.pesos(o.costoTotalUnitario)}</span>` },
        { titulo: 'Lote producido', clase: 'ocultar-celu', valor: o => (App.get('lotes', o.loteId) || {}).lote || '' },
        { titulo: 'Estado', valor: () => ui.chip('Terminada', 'ok') }
      ],
      vacio: h`Todavía no hay órdenes de producción. <a href="#/produccion/orden/nueva">Cargá la primera orden</a>.`
    }));
  }

  // ---------- calculador de costos ----------
  function elegirReceta(id) {
    const c = est.calc;
    c.recetaId = id; c.rinde = null; c.cantidades = {}; c.costos = {}; c.otros = null;
  }
  function tandasCalc(r) {
    const c = est.calc, v = Number(c.valor) || 0;
    if (c.modo === 'tandas') return v > 0 ? v : 1;
    const rinde = c.rinde != null ? Number(c.rinde) : r.rinde;
    return v > 0 && rinde > 0 ? v / rinde : 1;
  }
  function cambiosGuardables(r) {
    const c = est.calc;
    return (c.rinde != null && Number(c.rinde) !== r.rinde) ||
      r.insumos.some(i => c.cantidades[i.productoId] != null && Number(c.cantidades[i.productoId]) !== i.cantidad) ||
      (c.otros != null && JSON.stringify(c.otros) !== JSON.stringify(r.otrosCostos || []));
  }

  function tabCalculador(panel) {
    const recetas = App.db.recetas.filter(r => r.activa !== false);
    if (!recetas.length) { panel.appendChild(ui.nodo(String(h`<div class="vacio">Para calcular costos hace falta una receta. <a href="#/produccion/receta/nueva">Cargá la primera receta</a>.</div>`))); return; }
    const c = est.calc;
    if (!c.recetaId || !receta(c.recetaId)) elegirReceta(recetas[0].id);
    const r = receta(c.recetaId);
    const p = prod(r.productoId);
    const otros = c.otros || (r.otrosCostos || []).map(o => Object.assign({}, o));
    const cuerpo = ui.nodo(String(h`<div class="grilla-lado pr-calc">
      <div>
        <div class="panel">
          <div class="pr-controles">
            <div class="campo pr-campo-receta"><label for="pr-c-receta">Receta</label><select id="pr-c-receta">${ui.opciones(recetas, 'id', 'nombre', r.id)}</select></div>
            <div class="campo pr-campo-modo"><span class="etiqueta-campo" id="pr-c-modo-et">Calcular por</span><div class="segmentado" role="group" aria-labelledby="pr-c-modo-et">
              <button type="button" data-modo="tandas" aria-pressed="${c.modo === 'tandas'}">Tandas</button><button type="button" data-modo="unidades" aria-pressed="${c.modo === 'unidades'}">Unidades</button></div></div>
            <div class="campo"><label for="pr-c-valor" data-et-valor>${c.modo === 'tandas' ? 'Tandas a producir' : 'Unidades a producir'}</label><input id="pr-c-valor" type="number" min="0" step="${c.modo === 'tandas' ? '0.5' : '1'}" value="${c.valor}"><span class="campo-ayuda" data-equivale></span></div>
            <div class="campo"><label for="pr-c-rinde">Rinde por tanda</label><input id="pr-c-rinde" type="number" min="0" step="0.5" value="${c.rinde != null ? c.rinde : r.rinde}"><span class="campo-ayuda">${unidad(p)}; en la receta, ${cant(r.rinde)}</span></div>
          </div>
        </div>
        <section class="seccion pr-seccion-chica">
          <h2 class="seccion-titulo">Insumos <span class="texto-2">cambiá cantidades o costos para simular</span></h2>
          <div class="tabla-envoltura"><table class="tabla pr-tabla-calc"><thead><tr><th>Insumo</th><th class="al-der">Por tanda</th><th class="al-der">Costo unitario</th><th class="al-der">Subtotal</th><th class="al-der ocultar-celu">Disponible</th></tr></thead>
            <tbody>${r.insumos.map(i => { const ip = prod(i.productoId); const real = App.q.costoInsumo(i.productoId);
              return h`<tr data-insumo="${i.productoId}"><td><span class="celda-principal">${ip.descripcion}</span><span class="celda-sub">${ip.unidad}</span></td>
                <td class="al-der"><input type="number" class="pr-input-chico" min="0" step="0.1" data-cant value="${c.cantidades[i.productoId] != null ? c.cantidades[i.productoId] : i.cantidad}" aria-label="Cantidad por tanda de ${ip.descripcion}"><span class="celda-sub" data-total></span></td>
                <td class="al-der"><input type="number" class="pr-input-costo" min="0" step="1" data-costo value="${c.costos[i.productoId] != null ? c.costos[i.productoId] : real}" aria-label="Costo unitario de ${ip.descripcion}"><span class="celda-sub" data-real></span></td>
                <td class="al-der" data-subtotal></td>
                <td class="al-der ocultar-celu" data-disp></td></tr>`; })}</tbody>
            <tfoot><tr><td>Materiales</td><td></td><td></td><td class="al-der" data-materiales></td><td class="ocultar-celu"></td></tr></tfoot></table></div>
        </section>
        <section class="seccion pr-seccion-chica">
          <h2 class="seccion-titulo">Otros costos por tanda <span class="texto-2">gas, envasado tercerizado, flete</span></h2>
          <div class="tabla-envoltura"><table class="tabla"><thead><tr><th>Concepto</th><th class="al-der">Importe por tanda</th><th class="al-der">Total</th></tr></thead>
            <tbody>${otros.length ? otros.map((o, n) => h`<tr><td>${o.concepto}</td><td class="al-der"><input type="number" class="pr-input-costo" min="0" step="100" data-otro="${n}" value="${o.importe}" aria-label="Importe por tanda de ${o.concepto}"></td><td class="al-der" data-otro-total="${n}"></td></tr>`)
              : h`<tr><td colspan="3" class="texto-2">La receta no tiene otros costos. Se cargan desde «Editar receta».</td></tr>`}</tbody></table></div>
        </section>
        <p class="nota-discreta pr-nota">El costo de cada insumo sale del stock valorizado (promedio ponderado de los lotes; sin stock, el costo de la ficha). El costo que cambies acá es sólo una simulación: el real se actualiza con la próxima compra. Las cantidades, el rinde y los otros costos sí se pueden guardar en la receta.</p>
      </div>
      <aside class="panel pr-lado" aria-live="polite">
        <div data-resultado></div>
        <div class="pr-botones">
          <button type="button" class="btn btn-primario" data-guardar>Guardar cambios en la receta</button>
          <button type="button" class="btn btn-secundario" data-restablecer>Restablecer valores</button>
          <button type="button" class="btn btn-fantasma" data-producir>Producir esta cantidad</button>
        </div>
        <p class="nota-discreta" data-aviso-cambios></p>
      </aside>
    </div>`));
    panel.appendChild(cuerpo);
    const $ = s => cuerpo.querySelector(s);

    function actualizar() {
      const t = tandasCalc(r);
      const sim = { rinde: c.rinde != null ? Number(c.rinde) || 0 : null, cantidades: c.cantidades, costos: c.costos, otros: c.otros };
      const k = calcular(r, t, sim);
      $('[data-equivale]').textContent = c.modo === 'tandas' ? '= ' + cant(k.cantidad) + ' ' + unidad(p) : unidad(p) + ', = ' + cant(t) + ' tandas';
      k.insumos.forEach(i => {
        const tr = cuerpo.querySelector('tr[data-insumo="' + i.productoId + '"]');
        if (!tr) return;
        const ip = i.producto;
        tr.querySelector('[data-total]').textContent = t !== 1 ? 'total ' + cant(i.cantidad) : '';
        tr.querySelector('[data-subtotal]').textContent = ui.pesos(i.subtotal);
        tr.querySelector('[data-real]').textContent = i.simulado ? 'real ' + ui.pesos(i.costoReal) : '';
        tr.querySelector('[data-costo]').classList.toggle('pr-simulado', !!i.simulado);
        const d = tr.querySelector('[data-disp]');
        d.innerHTML = String(i.disponible + 1e-6 < i.cantidad ? h`<span class="peligro">${cant(i.disponible)}</span><span class="celda-sub">faltan ${cant(i.cantidad - i.disponible)}</span>` : h`${cant(i.disponible)}`);
        d.title = unidad(ip);
      });
      $('[data-materiales]').innerHTML = String(h`<strong>${ui.pesos(k.materiales)}</strong>`);
      const ot = c.otros || r.otrosCostos || [];
      ot.forEach((o, n) => { const td = cuerpo.querySelector('[data-otro-total="' + n + '"]'); if (td) td.textContent = ui.pesos(o.importe * t); });
      $('[data-resultado]').innerHTML = String(resumenCosto(k, Object.keys(c.costos).some(x => c.costos[x] != null) || cambiosGuardables(r) ? 'Costo por unidad simulado' : 'Costo por unidad'));
      const guardable = cambiosGuardables(r);
      $('[data-guardar]').disabled = !guardable;
      $('[data-aviso-cambios]').textContent = guardable ? 'Hay cambios en cantidades, rinde u otros costos sin guardar.' : k.faltantes.length ? 'Para esta cantidad ' + (k.faltantes.length === 1 ? 'falta 1 insumo' : 'faltan ' + k.faltantes.length + ' insumos') + ' en stock.' : '';
    }

    $('#pr-c-receta').addEventListener('change', e => { elegirReceta(e.target.value); history.replaceState(null, '', '#/produccion/calculador/' + e.target.value); panel.innerHTML = ''; tabCalculador(panel); });
    cuerpo.querySelectorAll('[data-modo]').forEach(b => b.addEventListener('click', () => {
      if (c.modo === b.dataset.modo) return;
      const k = calcular(r, tandasCalc(r), { rinde: c.rinde != null ? Number(c.rinde) : null });
      c.valor = b.dataset.modo === 'unidades' ? r4(k.cantidad) : r4(tandasCalc(r));
      c.modo = b.dataset.modo; panel.innerHTML = ''; tabCalculador(panel);
    }));
    $('#pr-c-valor').addEventListener('input', e => { c.valor = e.target.value; actualizar(); });
    $('#pr-c-rinde').addEventListener('input', e => { c.rinde = e.target.value === '' ? null : Number(e.target.value); actualizar(); });
    cuerpo.querySelectorAll('[data-cant]').forEach(inp => inp.addEventListener('input', () => {
      c.cantidades[inp.closest('tr').dataset.insumo] = inp.value === '' ? 0 : Number(inp.value); actualizar();
    }));
    cuerpo.querySelectorAll('[data-costo]').forEach(inp => inp.addEventListener('input', () => {
      c.costos[inp.closest('tr').dataset.insumo] = inp.value === '' ? null : Number(inp.value); actualizar();
    }));
    cuerpo.querySelectorAll('[data-otro]').forEach(inp => inp.addEventListener('input', () => {
      if (!c.otros) c.otros = (r.otrosCostos || []).map(o => Object.assign({}, o));
      c.otros[Number(inp.dataset.otro)].importe = inp.value === '' ? 0 : Number(inp.value); actualizar();
    }));
    $('[data-restablecer]').addEventListener('click', () => { const v = c.valor, m = c.modo; elegirReceta(r.id); c.valor = v; c.modo = m; panel.innerHTML = ''; tabCalculador(panel); ui.toast('Valores restablecidos a los de la receta', 'info'); });
    $('[data-producir]').addEventListener('click', () => { est.orden.recetaId = r.id; est.orden.tandas = r4(tandasCalc(r)); ui.ir('#/produccion/orden/nueva/' + r.id); });
    $('[data-guardar]').addEventListener('click', async () => {
      const ok = await ui.confirmar('Se guardan en la receta «' + r.nombre + '» el rinde, las cantidades de insumos y los otros costos que estás simulando. Los costos unitarios de los insumos no se guardan: salen del stock.', { titulo: 'Guardar cambios en la receta', aceptar: 'Guardar cambios en la receta' });
      if (!ok) return;
      const a = armar(r, { rinde: c.rinde != null ? Number(c.rinde) : null, cantidades: c.cantidades, otros: c.otros });
      const res = App.intentar(() => App.acciones.guardarReceta({ id: r.id, nombre: r.nombre, productoId: r.productoId, rinde: a.rinde, insumos: a.insumos, otrosCostos: a.otrosCostos, nota: r.nota }), 'Cambios guardados en la receta ' + r.nombre);
      if (res) { const costos = c.costos; elegirReceta(r.id); c.costos = costos; App.renderizar(); }
    });
    actualizar();
  }

  // ---------- ficha de receta ----------
  function fichaReceta(el, r) {
    const k = calcular(r, 1);
    const p = k.producto;
    const ops = App.db.ordenesProduccion.filter(o => o.recetaId === r.id).sort((a, b) => b.numero - a.numero);
    el.appendChild(ui.nodo(String(encabezado(r.nombre, h`Produce ${p.descripcion} (${p.codigo || ''}). Una tanda rinde ${cant(r.rinde)} ${unidad(p)}.`,
      h`${miga}<a href="#/produccion/recetas">Recetas</a> / RE ${String(r.numero).padStart(4, '0')}`,
      h`<a class="btn btn-secundario" href="#/produccion/receta/${r.id}/editar">Editar receta</a><a class="btn btn-secundario" href="#/produccion/calculador/${r.id}">Simular costos</a><a class="btn btn-primario" href="#/produccion/orden/nueva/${r.id}">Nueva orden de producción</a>`))));
    const izq = document.createElement('div');
    const sec1 = ui.nodo(String(h`<section><h2 class="seccion-titulo">Insumos por tanda</h2></section>`));
    sec1.appendChild(ui.tabla({
      filas: k.insumos,
      alClic: i => ui.ir('#/stock/producto/' + i.productoId),
      columnas: [
        { titulo: 'Insumo', valor: i => h`<span class="celda-principal">${i.producto.descripcion}</span><span class="celda-sub">${i.producto.codigo || ''}, ${unidad(i.producto)}</span>` },
        { titulo: 'Cantidad', alinear: 'der', valor: i => cant(i.cantidad) },
        { titulo: 'Costo unitario', alinear: 'der', valor: i => ui.pesos(i.costoUnitario) },
        { titulo: 'Subtotal', alinear: 'der', valor: i => ui.pesos(i.subtotal) },
        { titulo: 'Disponible', alinear: 'der', clase: 'ocultar-celu', valor: i => i.disponible + 1e-6 < i.cantidad ? h`<span class="peligro">${cant(i.disponible)}</span><span class="celda-sub">no alcanza para una tanda</span>` : h`${cant(i.disponible)}<span class="celda-sub">${ui.num(Math.floor(i.disponible / i.cantidad + 1e-9))} tandas</span>` }
      ],
      pie: ['Materiales por tanda', '', '', ui.pesos(k.materiales), '']
    }));
    izq.appendChild(sec1);
    const sec2 = ui.nodo(String(h`<section class="seccion pr-seccion-chica"><h2 class="seccion-titulo">Otros costos por tanda</h2></section>`));
    sec2.appendChild(ui.tabla({
      filas: r.otrosCostos || [],
      columnas: [{ titulo: 'Concepto', campo: 'concepto' }, { titulo: 'Importe', alinear: 'der', valor: o => ui.pesos(o.importe) }],
      pie: (r.otrosCostos || []).length ? ['Total', ui.pesos(k.otros)] : null,
      vacio: 'La receta no tiene otros costos cargados.'
    }));
    izq.appendChild(sec2);
    if (r.nota) izq.appendChild(ui.nodo(String(h`<section class="seccion pr-seccion-chica"><h2 class="seccion-titulo">Instrucciones</h2><div class="panel pr-nota-receta">${r.nota}</div></section>`)));
    const sec3 = ui.nodo(String(h`<section class="seccion pr-seccion-chica"><h2 class="seccion-titulo">Órdenes de esta receta</h2></section>`));
    sec3.appendChild(ui.tabla({
      filas: ops, limite: 8, alClic: o => ui.ir('#/produccion/orden/' + o.id),
      columnas: [
        { titulo: 'N.º', valor: o => o.nro }, { titulo: 'Fecha', valor: o => ui.fecha(o.fecha) },
        { titulo: 'Producido', alinear: 'der', valor: o => cant(o.cantidad) + ' ' + unidad(p) },
        { titulo: 'Costo por unidad', alinear: 'der', valor: o => ui.pesos(o.costoUnitario) }
      ],
      vacio: 'Todavía no se produjo con esta receta.'
    }));
    izq.appendChild(sec3);
    const grilla = document.createElement('div');
    grilla.className = 'grilla-lado';
    grilla.appendChild(izq);
    grilla.appendChild(ui.nodo(String(h`<aside class="panel pr-lado">${resumenCosto(k, 'Costo de una tanda, por unidad')}</aside>`)));
    el.appendChild(grilla);
  }

  // ---------- alta y edición de receta ----------
  function editor(el, r) {
    const clave = r ? r.id : 'nueva';
    const propios = App.db.productos.filter(p => p.activo !== false && !p.insumo);
    if (!est.borradores[clave]) {
      est.borradores[clave] = r ? { id: r.id, nombre: r.nombre, productoId: r.productoId, rinde: r.rinde, nota: r.nota || '', insumos: r.insumos.map(i => Object.assign({}, i)), otrosCostos: (r.otrosCostos || []).map(o => Object.assign({}, o)) }
        : { nombre: '', productoId: (propios.find(p => p.propio) || propios[0]).id, rinde: 10, nota: '', insumos: [], otrosCostos: [] };
    }
    const b = est.borradores[clave];
    const grupoProd = (lista, sel) => ui.opciones(lista, 'id', p => p.descripcion + ' (' + unidad(p) + ')', sel);
    const listaPropios = propios.filter(p => p.propio), otrosProd = propios.filter(p => !p.propio);
    el.appendChild(ui.nodo(String(encabezado(r ? 'Editar receta' : 'Nueva receta', r ? r.nombre : 'Definí qué se produce, cuánto rinde cada tanda y qué insumos lleva. El costo se calcula con el stock valorizado.',
      r ? h`${miga}<a href="#/produccion/receta/${r.id}">${r.nombre}</a> /` : h`${miga}<a href="#/produccion/recetas">Recetas</a> /`))));
    const cuerpo = ui.nodo(String(h`<div class="grilla-lado">
      <div>
        <div class="panel"><div class="form-grilla">
          <div class="campo"><label for="pr-e-prod">Producto que se produce</label><select id="pr-e-prod">
            ${listaPropios.length ? h`<optgroup label="Marca propia">${grupoProd(listaPropios, b.productoId)}</optgroup>` : ''}<optgroup label="Otros productos">${grupoProd(otrosProd, b.productoId)}</optgroup></select></div>
          <div class="campo"><label for="pr-e-nombre">Nombre de la receta</label><input id="pr-e-nombre" type="text" value="${b.nombre}" placeholder="Si lo dejás vacío, el del producto"></div>
          <div class="campo"><label for="pr-e-rinde" data-et-rinde></label><input id="pr-e-rinde" type="number" min="0" step="0.5" value="${b.rinde}"><span class="campo-ayuda">Unidades de venta del producto que salen de una tanda, ya descontada la merma.</span></div>
          <div class="campo ancho-total"><label for="pr-e-nota">Instrucciones</label><textarea id="pr-e-nota" rows="2" placeholder="Temperaturas, tiempos, armado">${b.nota}</textarea></div>
        </div></div>
        <section class="seccion pr-seccion-chica">
          <h2 class="seccion-titulo">Insumos por tanda</h2>
          <div class="pr-buscador">
            <input type="search" id="pr-e-buscar" placeholder="Agregar insumo: buscá por nombre o código" aria-label="Buscar insumo para agregar" autocomplete="off" aria-controls="pr-e-res" aria-expanded="false">
            <div class="pr-res" id="pr-e-res" role="listbox" hidden></div>
          </div>
          <div class="tabla-envoltura"><table class="tabla pr-tabla-calc"><thead><tr><th>Insumo</th><th class="al-der">Cantidad</th><th class="al-der ocultar-celu">Costo unitario</th><th class="al-der">Subtotal</th><th class="al-der ocultar-celu">Disponible</th><th><span class="solo-lector">Quitar</span></th></tr></thead><tbody data-insumos></tbody></table></div>
        </section>
        <section class="seccion pr-seccion-chica">
          <h2 class="seccion-titulo">Otros costos por tanda <span class="texto-2">gas, envasado tercerizado, flete</span></h2>
          <div class="tabla-envoltura"><table class="tabla"><thead><tr><th>Concepto</th><th class="al-der">Importe por tanda</th><th><span class="solo-lector">Quitar</span></th></tr></thead><tbody data-otros></tbody></table></div>
          <button type="button" class="btn btn-secundario btn-chico pr-agregar" data-agregar-otro>Agregar otro costo</button>
        </section>
      </div>
      <aside class="panel pr-lado" aria-live="polite">
        <div data-resultado></div>
        <div class="pr-botones"><button type="button" class="btn btn-primario" data-guardar>Guardar receta</button><button type="button" class="btn btn-secundario" data-cancelar>Descartar cambios</button></div>
      </aside>
    </div>`));
    el.appendChild(cuerpo);
    const $ = s => cuerpo.querySelector(s);

    function dibujarInsumos() {
      const tb = $('[data-insumos]');
      tb.innerHTML = b.insumos.length ? String(h`${b.insumos.map((i, n) => { const ip = prod(i.productoId);
        return h`<tr data-n="${n}"><td><span class="celda-principal">${ip.descripcion}</span><span class="celda-sub">${ip.codigo || ''}, ${unidad(ip)}</span></td>
          <td class="al-der"><input type="number" class="pr-input-chico" min="0" step="0.1" data-cant value="${i.cantidad}" aria-label="Cantidad por tanda de ${ip.descripcion}"></td>
          <td class="al-der ocultar-celu">${ui.pesos(App.q.costoInsumo(ip.id))}</td><td class="al-der" data-subtotal></td>
          <td class="al-der ocultar-celu">${cant(App.q.stock(ip.id).disponible)}</td>
          <td class="al-der"><button type="button" class="btn btn-fantasma btn-chico" data-quitar aria-label="Quitar ${ip.descripcion}">Quitar</button></td></tr>`; })}`)
        : '<tr><td colspan="6" class="texto-2">Todavía no hay insumos. Buscalos arriba para agregarlos.</td></tr>';
      tb.querySelectorAll('[data-cant]').forEach(inp => inp.addEventListener('input', () => { b.insumos[Number(inp.closest('tr').dataset.n)].cantidad = inp.value === '' ? 0 : Number(inp.value); actualizar(); }));
      tb.querySelectorAll('[data-quitar]').forEach(btn => btn.addEventListener('click', () => { b.insumos.splice(Number(btn.closest('tr').dataset.n), 1); dibujarInsumos(); actualizar(); $('#pr-e-buscar').focus(); }));
    }
    function dibujarOtros() {
      const tb = $('[data-otros]');
      tb.innerHTML = b.otrosCostos.length ? String(h`${b.otrosCostos.map((o, n) => h`<tr data-n="${n}">
          <td><input type="text" data-concepto value="${o.concepto}" placeholder="Concepto" aria-label="Concepto del costo ${n + 1}"></td>
          <td class="al-der"><input type="number" class="pr-input-costo" min="0" step="100" data-importe value="${o.importe}" aria-label="Importe por tanda del costo ${n + 1}"></td>
          <td class="al-der"><button type="button" class="btn btn-fantasma btn-chico" data-quitar aria-label="Quitar el costo ${n + 1}">Quitar</button></td></tr>`)}`)
        : '<tr><td colspan="3" class="texto-2">Sin otros costos. Son opcionales.</td></tr>';
      tb.querySelectorAll('[data-concepto]').forEach(inp => inp.addEventListener('input', () => { b.otrosCostos[Number(inp.closest('tr').dataset.n)].concepto = inp.value; }));
      tb.querySelectorAll('[data-importe]').forEach(inp => inp.addEventListener('input', () => { b.otrosCostos[Number(inp.closest('tr').dataset.n)].importe = inp.value === '' ? 0 : Number(inp.value); actualizar(); }));
      tb.querySelectorAll('[data-quitar]').forEach(btn => btn.addEventListener('click', () => { b.otrosCostos.splice(Number(btn.closest('tr').dataset.n), 1); dibujarOtros(); actualizar(); }));
    }
    function actualizar() {
      const p = prod(b.productoId);
      $('[data-et-rinde]').textContent = 'Rinde por tanda (' + unidad(p) + ')';
      const k = calcular({ productoId: b.productoId, rinde: Number(b.rinde) || 0, insumos: b.insumos, otrosCostos: b.otrosCostos.filter(o => Number(o.importe) > 0) }, 1);
      cuerpo.querySelectorAll('[data-insumos] tr[data-n]').forEach(tr => { const i = k.insumos[Number(tr.dataset.n)]; tr.querySelector('[data-subtotal]').textContent = i ? ui.pesos(i.subtotal) : ''; });
      $('[data-resultado]').innerHTML = String(b.insumos.length && Number(b.rinde) > 0 ? resumenCosto(k, 'Costo de una tanda, por unidad') : h`<p class="texto-2" style="margin:0">Agregá al menos un insumo e indicá el rinde para ver el costo por unidad y el margen contra cada lista.</p>`);
    }

    // buscador de insumos: primero los insumos de producción, después el resto de la mercadería
    const buscar = $('#pr-e-buscar'), res = $('#pr-e-res');
    let encontrados = [], sel = -1;
    const cerrarRes = () => { res.hidden = true; buscar.setAttribute('aria-expanded', 'false'); sel = -1; };
    function pintarRes() {
      res.innerHTML = encontrados.length ? encontrados.map((p, i) => '<button type="button" role="option" class="pr-res-item' + (i === sel ? ' activo' : '') + '" data-id="' + ui.escapar(p.id) + '"><span>' + ui.escapar(p.descripcion) + '</span><span class="texto-2">' + ui.escapar((p.codigo || '') + ', ' + unidad(p) + ', ' + ui.pesos(App.q.costoInsumo(p.id))) + (p.insumo ? '' : ', mercadería') + '</span></button>').join('')
        : '<div class="pr-res-vacio">Sin coincidencias para «' + ui.escapar(buscar.value) + '».</div>';
      res.hidden = false; buscar.setAttribute('aria-expanded', 'true');
    }
    function agregar(id) {
      const ex = b.insumos.find(i => i.productoId === id);
      if (ex) ui.toast('«' + prod(id).descripcion + '» ya está en la receta: cambiá la cantidad en la tabla.', 'info');
      else b.insumos.push({ productoId: id, cantidad: 1 });
      buscar.value = ''; cerrarRes(); dibujarInsumos(); actualizar();
      const fila = cuerpo.querySelectorAll('[data-insumos] [data-cant]')[b.insumos.findIndex(i => i.productoId === id)];
      if (fila) { fila.focus(); fila.select(); }
    }
    ui.buscador(buscar, t => {
      if (!t) { cerrarRes(); return; }
      encontrados = App.db.productos.filter(p => p.activo !== false && p.id !== b.productoId && ui.coincide(t, p.descripcion, p.codigo, p.marca))
        .sort((a, c) => (c.insumo ? 1 : 0) - (a.insumo ? 1 : 0)).slice(0, 8);
      sel = encontrados.length ? 0 : -1; pintarRes();
    }, 60);
    buscar.addEventListener('keydown', e => {
      if (res.hidden || !encontrados.length) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); sel = (sel + 1) % encontrados.length; pintarRes(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); sel = (sel - 1 + encontrados.length) % encontrados.length; pintarRes(); }
      else if (e.key === 'Enter') { e.preventDefault(); agregar(encontrados[Math.max(0, sel)].id); }
    });
    res.addEventListener('click', e => { const it = e.target.closest('[data-id]'); if (it) agregar(it.dataset.id); });
    document.addEventListener('click', function fuera(e) { if (!cuerpo.isConnected) { document.removeEventListener('click', fuera); return; } if (!e.target.closest('.pr-buscador')) cerrarRes(); });

    $('#pr-e-prod').addEventListener('change', e => { b.productoId = e.target.value; b.insumos = b.insumos.filter(i => i.productoId !== b.productoId); dibujarInsumos(); actualizar(); });
    $('#pr-e-nombre').addEventListener('input', e => { b.nombre = e.target.value; });
    $('#pr-e-rinde').addEventListener('input', e => { b.rinde = e.target.value === '' ? 0 : Number(e.target.value); actualizar(); });
    $('#pr-e-nota').addEventListener('input', e => { b.nota = e.target.value; });
    $('[data-agregar-otro]').addEventListener('click', () => { b.otrosCostos.push({ concepto: '', importe: 0 }); dibujarOtros(); const ins = cuerpo.querySelectorAll('[data-concepto]'); ins[ins.length - 1].focus(); });
    $('[data-cancelar]').addEventListener('click', () => { delete est.borradores[clave]; ui.ir(r ? '#/produccion/receta/' + r.id : '#/produccion/recetas'); });
    $('[data-guardar]').addEventListener('click', () => {
      const sinConcepto = b.otrosCostos.find(o => Number(o.importe) > 0 && !String(o.concepto).trim());
      if (sinConcepto) { ui.toast('Cada otro costo con importe necesita un concepto.', 'peligro'); return; }
      const guardada = App.intentar(() => App.acciones.guardarReceta({ id: b.id, nombre: b.nombre, productoId: b.productoId, rinde: b.rinde, insumos: b.insumos, otrosCostos: b.otrosCostos, nota: b.nota }),
        x => (r ? 'Receta guardada: ' : 'Receta creada: ') + x.nombre);
      if (!guardada) return;
      delete est.borradores[clave];
      if (est.calc.recetaId === guardada.id) elegirReceta(guardada.id);
      ui.ir('#/produccion/receta/' + guardada.id);
    });
    dibujarInsumos(); dibujarOtros(); actualizar();
  }

  // ---------- nueva orden de producción ----------
  function nuevaOrden(el, recetaId) {
    const recetas = App.db.recetas.filter(r => r.activa !== false);
    if (!recetas.length) { el.appendChild(ui.nodo(String(h`<div class="vacio vacio-grande"><h1 class="titulo-vista">Nueva orden de producción</h1><p>Para producir hace falta una receta.</p><a class="btn btn-primario" href="#/produccion/receta/nueva">Nueva receta</a></div>`))); return; }
    const o = est.orden;
    if (recetaId && receta(recetaId) && o.recetaId !== recetaId) { o.recetaId = recetaId; o.tandas = 1; }
    if (!o.recetaId || !receta(o.recetaId)) o.recetaId = recetas[0].id;
    el.appendChild(ui.nodo(String(encabezado('Nueva orden de producción', 'Elegí la receta, cuántas tandas y en qué depósito. Antes de confirmar se controla que alcancen los insumos de ese depósito.', h`${miga}<a href="#/produccion/ordenes">Órdenes de producción</a> /`))));
    const cuerpo = ui.nodo(String(h`<div class="grilla-lado">
      <div>
        <div class="panel"><div class="form-grilla">
          <div class="campo"><label for="pr-o-receta">Receta</label><select id="pr-o-receta">${ui.opciones(recetas, 'id', 'nombre', o.recetaId)}</select></div>
          <div class="campo"><label for="pr-o-tandas">Tandas</label><input id="pr-o-tandas" type="number" min="0" step="0.5" value="${o.tandas}"><span class="campo-ayuda" data-rinde></span></div>
          <div class="campo"><label for="pr-o-dep">Depósito</label><select id="pr-o-dep">${ui.opciones(App.db.depositos, 'id', 'nombre', o.depositoId)}</select></div>
          <div class="campo ancho-total"><label for="pr-o-obs">Observaciones</label><input id="pr-o-obs" type="text" value="${o.obs}" placeholder="Opcional"></div>
        </div></div>
        <section class="seccion pr-seccion-chica"><h2 class="seccion-titulo">Insumos que se consumen</h2><div data-faltantes></div><div data-tabla></div></section>
      </div>
      <aside class="panel pr-lado" aria-live="polite"><div data-resumen></div>
        <div class="pr-botones"><button type="button" class="btn btn-senal" data-confirmar>Confirmar producción</button><a class="btn btn-secundario" href="#/produccion/ordenes">Volver</a></div>
        <p class="nota-discreta">${NOTA_VALOR}</p></aside>
    </div>`));
    el.appendChild(cuerpo);
    const $ = s => cuerpo.querySelector(s);
    function actualizar() {
      const r = receta(o.recetaId), p = prod(r.productoId), t = Number(o.tandas) || 0;
      const k = calcular(r, t > 0 ? t : 1);
      const filas = k.insumos.map(i => Object.assign({}, i, { enDep: App.q.stock(i.productoId, o.depositoId).disponible }));
      const falt = t > 0 ? filas.filter(i => i.enDep + 1e-6 < i.cantidad) : [];
      $('[data-rinde]').textContent = t > 0 ? '= ' + cant(k.cantidad) + ' ' + unidad(p) + ' (rinde ' + cant(r.rinde) + ' por tanda)' : 'Indicá cuántas tandas.';
      $('[data-faltantes]').innerHTML = String(falt.length ? h`<div class="aviso aviso-peligro pr-aviso"><div><strong>${falt.length === 1 ? 'No alcanza un insumo' : 'No alcanzan ' + falt.length + ' insumos'} en ${dep(o.depositoId).nombre}.</strong> ${falt.map(i => i.producto.descripcion + ': faltan ' + cant(i.cantidad - i.enDep) + ' ' + unidad(i.producto)).join('; ')}. Bajá las tandas, cambiá de depósito, <a href="#/stock">transferí stock</a> o <a href="#/compras">cargá una compra</a>.</div></div>`
        : t > 0 ? h`<div class="aviso aviso-ok pr-aviso">Alcanzan todos los insumos en ${dep(o.depositoId).nombre}. Se consumen por vencimiento: primero los lotes que vencen antes.</div>` : '');
      const tabla = $('[data-tabla]'); tabla.innerHTML = '';
      tabla.appendChild(ui.tabla({
        filas, filaClase: i => i.enDep + 1e-6 < i.cantidad ? 'pr-fila-falta' : '',
        columnas: [
          { titulo: 'Insumo', valor: i => h`<span class="celda-principal">${i.producto.descripcion}</span><span class="celda-sub">${unidad(i.producto)}</span>` },
          { titulo: 'Necesario', alinear: 'der', valor: i => cant(i.cantidad) },
          { titulo: 'En el depósito', alinear: 'der', valor: i => cant(i.enDep) },
          { titulo: 'Costo estimado', alinear: 'der', clase: 'ocultar-celu', valor: i => ui.pesos(i.subtotal) },
          { titulo: 'Estado', valor: i => i.enDep + 1e-6 < i.cantidad ? ui.chip('Faltan ' + cant(i.cantidad - i.enDep), 'peligro') : ui.chip('Alcanza', 'ok') }
        ]
      }));
      $('[data-resumen]').innerHTML = String(h`<div class="pr-resumen"><div class="pr-resumen-cabeza"><span class="texto-2">Se producen</span><div class="cifra-grande">${t > 0 ? cant(k.cantidad) : '0'}</div><span class="texto-2">${unidad(p)} de ${p.descripcion}</span></div>
        <dl class="datos pr-datos"><dt>Depósito</dt><dd>${dep(o.depositoId).nombre}</dd><dt>Materiales estimados</dt><dd>${t > 0 ? ui.pesos(k.materiales) : '—'}</dd><dt>Costo por unidad</dt><dd>${t > 0 ? ui.pesos(k.materialesPorUnidad) : '—'} <span class="texto-2">en materiales</span></dd><dt>Con otros costos</dt><dd>${t > 0 ? ui.pesos(k.porUnidad) : '—'}</dd></dl></div>`);
      const btn = $('[data-confirmar]');
      btn.disabled = !(t > 0) || falt.length > 0;
      btn.title = falt.length ? 'Faltan insumos en el depósito elegido' : '';
    }
    $('#pr-o-receta').addEventListener('change', e => { o.recetaId = e.target.value; history.replaceState(null, '', '#/produccion/orden/nueva/' + o.recetaId); actualizar(); });
    $('#pr-o-tandas').addEventListener('input', e => { o.tandas = e.target.value; actualizar(); });
    $('#pr-o-dep').addEventListener('change', e => { o.depositoId = e.target.value; actualizar(); });
    $('#pr-o-obs').addEventListener('input', e => { o.obs = e.target.value; });
    $('[data-confirmar]').addEventListener('click', async () => {
      const r = receta(o.recetaId), k = calcular(r, Number(o.tandas));
      const ok = await ui.confirmar('Se producen ' + cant(k.cantidad) + ' ' + unidad(k.producto) + ' de ' + k.producto.descripcion + ' en ' + dep(o.depositoId).nombre + '. Se descuentan los insumos del stock y entra un lote nuevo del producto terminado.', { titulo: 'Confirmar producción', aceptar: 'Confirmar producción' });
      if (!ok) return;
      const op = App.intentar(() => App.acciones.producir({ recetaId: r.id, tandas: Number(o.tandas), depositoId: o.depositoId, obs: o.obs }), x => 'Producción confirmada: orden ' + x.nro);
      if (!op) return;
      est.orden.tandas = 1; est.orden.obs = '';
      ui.ir('#/produccion/orden/' + op.id);
    });
    actualizar();
  }

  // ---------- ficha de la orden ----------
  function ordenHTML(op) {
    const p = prod(op.productoId), r = receta(op.recetaId), l = App.get('lotes', op.loteId) || {};
    return h`<article class="comprobante">
      <header class="comp-cabecera">
        <div class="comp-emisor"><div class="comp-negocio">${C.razonSocial}</div><div>${C.domicilio}</div><div>Tel. ${C.telefono}</div><div>CUIT ${C.cuit}</div></div>
        <div class="comp-letra"><span>X</span><small>Documento interno</small></div>
        <div class="comp-datos"><div class="comp-titulo">Orden de producción</div><div>N.º <strong>${op.nro}</strong></div><div>Fecha ${ui.fecha(op.fecha)}</div><div>${dep(op.depositoId).nombre}</div></div>
      </header>
      <section class="comp-receptor">
        <div><span>Producto</span><strong>${p.descripcion}</strong></div><div><span>Código</span>${p.codigo || ''}</div>
        <div><span>Receta</span>${r ? r.nombre : ''}</div><div><span>Tandas</span>${cant(op.tandas)}</div>
        <div><span>Cantidad producida</span><strong>${cant(op.cantidad)} ${unidad(p)}</strong></div><div><span>Lote producido</span>${l.lote || ''}${l.vence ? ', vence ' + ui.fecha(l.vence) : ''}</div>
        ${op.obs ? h`<div><span>Observaciones</span>${op.obs}</div>` : ''}
      </section>
      <table class="comp-items"><thead><tr><th>Código</th><th>Insumo</th><th>Lote</th><th class="al-der">Cantidad</th><th class="al-der">Costo unitario</th><th class="al-der">Subtotal</th></tr></thead><tbody>
        ${op.consumos.map(c => { const ip = prod(c.productoId); return h`<tr><td>${ip.codigo || ''}</td><td>${ip.descripcion} (${unidad(ip)})</td><td>${c.lote}</td><td class="al-der">${cant(c.cantidad)}</td><td class="al-der">${ui.pesos(c.costo)}</td><td class="al-der">${ui.pesos(c.cantidad * c.costo)}</td></tr>`; })}
      </tbody></table>
      <div class="comp-totales">
        <div><span>Materiales</span>${ui.pesos(op.costoMateriales)}</div>
        <div><span>Otros costos (informativo)</span>${ui.pesos(op.otrosCostos)}</div>
        <div><span>Costo por unidad con otros costos</span>${ui.pesos(op.costoTotalUnitario)}</div>
        <div class="comp-total"><span>Costo por unidad en stock</span><strong>${ui.pesos(op.costoUnitario)}</strong></div>
      </div>
      <p class="comp-pie-simple">${NOTA_VALOR}</p>
      <div class="comp-firma"><div>Responsable de producción</div><div>Control de depósito</div></div>
    </article>`;
  }

  function fichaOrden(el, op) {
    const p = prod(op.productoId), r = receta(op.recetaId), l = App.get('lotes', op.loteId) || {};
    el.appendChild(ui.nodo(String(encabezado('Orden de producción ' + op.nro, h`${cant(op.cantidad)} ${unidad(p)} de ${p.descripcion}, ${ui.fecha(op.fecha)}, ${dep(op.depositoId).nombre}.`,
      h`${miga}<a href="#/produccion/ordenes">Órdenes de producción</a> /`,
      h`<button type="button" class="btn btn-secundario" data-imprimir>Imprimir orden</button><a class="btn btn-secundario" href="#/stock/producto/${p.id}">Ver producto en Stock</a>${op.asientoId ? h`<a class="btn btn-secundario" href="#/contabilidad/asiento/${op.asientoId}">Ver asiento</a>` : ''}${r ? h`<a class="btn btn-primario" href="#/produccion/orden/nueva/${r.id}">Repetir producción</a>` : ''}`))));
    el.appendChild(ui.nodo(String(ui.franjaKpi([
      { titulo: 'Producido', valor: cant(op.cantidad), detalle: unidad(p) + ', ' + cant(op.tandas) + (op.tandas === 1 ? ' tanda' : ' tandas') },
      { titulo: 'Materiales consumidos', valor: ui.pesosCorto(op.costoMateriales), detalle: ui.pesos(op.costoMateriales) },
      { titulo: 'Costo por unidad en stock', valor: ui.pesos(op.costoUnitario), detalle: 'con otros costos ' + ui.pesos(op.costoTotalUnitario) },
      { titulo: 'Lote producido', valor: l.lote || '—', detalle: l.vence ? 'vence ' + ui.fecha(l.vence) : 'sin vencimiento' }
    ]))));
    const grilla = document.createElement('div');
    grilla.className = 'grilla-lado';
    const izq = ui.nodo(String(h`<section><h2 class="seccion-titulo">Consumos por lote <span class="texto-2">descontados por vencimiento</span></h2></section>`));
    izq.appendChild(ui.tabla({
      filas: op.consumos,
      columnas: [
        { titulo: 'Insumo', valor: c => h`<span class="celda-principal">${prod(c.productoId).descripcion}</span><span class="celda-sub">${unidad(prod(c.productoId))}</span>` },
        { titulo: 'Lote', valor: c => c.lote },
        { titulo: 'Cantidad', alinear: 'der', valor: c => cant(c.cantidad) },
        { titulo: 'Costo unitario', alinear: 'der', clase: 'ocultar-celu', valor: c => ui.pesos(c.costo) },
        { titulo: 'Subtotal', alinear: 'der', valor: c => ui.pesos(c.cantidad * c.costo) }
      ],
      pie: ['Materiales', '', '', '', ui.pesos(op.costoMateriales)]
    }));
    grilla.appendChild(izq);
    grilla.appendChild(ui.nodo(String(h`<aside class="panel pr-lado"><h2 class="panel-titulo">Datos de la orden</h2>
      <dl class="datos"><dt>Estado</dt><dd>${ui.chip('Terminada', 'ok')}</dd><dt>Fecha</dt><dd>${ui.fecha(op.fecha)}</dd>
        <dt>Receta</dt><dd>${r ? h`<a href="#/produccion/receta/${r.id}">${r.nombre}</a>` : '—'}</dd><dt>Depósito</dt><dd>${dep(op.depositoId).nombre}</dd>
        <dt>Lote producido</dt><dd>${l.lote || '—'}${l.vence ? h`<span class="texto-2">, vence ${ui.fecha(l.vence)}</span>` : ''}</dd>
        <dt>Otros costos</dt><dd>${ui.pesos(op.otrosCostos)} <span class="texto-2">informativo</span></dd>
        ${op.obs ? h`<dt>Observaciones</dt><dd>${op.obs}</dd>` : ''}</dl>
      <p class="nota-discreta" style="margin:14px 0 0">${NOTA_VALOR}</p></aside>`)));
    el.appendChild(grilla);
    el.querySelector('[data-imprimir]').addEventListener('click', () => ui.imprimir(ordenHTML(op), { titulo: 'Orden de producción ' + op.nro }));
  }

  // ---------- router del módulo ----------
  function render(el, params) {
    const [a, b, c] = params || [];
    if (a === 'receta') {
      if (b === 'nueva') return editor(el, null);
      const r = receta(b);
      if (!r) { el.innerHTML = String(noEncontrada('Receta no encontrada')); return; }
      return c === 'editar' ? editor(el, r) : fichaReceta(el, r);
    }
    if (a === 'orden') {
      if (b === 'nueva') return nuevaOrden(el, c);
      const op = App.get('ordenesProduccion', b);
      if (!op) { el.innerHTML = String(noEncontrada('Orden de producción no encontrada')); return; }
      return fichaOrden(el, op);
    }
    principal(el, params || []);
  }

  App.modulo({
    id: 'produccion',
    titulo: 'Producción',
    grupo: 'Logística',
    orden: 35,
    icono: ICONO,
    render
  });
})();
