/* Módulo «Compras»: sugerencia de compra, órdenes de compra (crear, enviar, estado), recepción de mercadería
   contra la orden y historial de costos por producto.
   Rutas: #/compras · #/compras/nueva[/<proveedorId>] · #/compras/orden/<id> · #/compras/recibir/<id> · #/compras/costos/<productoId>
   Todo lo que cambia datos pasa por App.acciones (crearOrdenCompra, recibirCompra, guardarMaestro). */
(function () {
  'use strict';
  const ui = App.ui, h = ui.h, F = App.f, r2 = App.r2;

  // ---------- estilos propios (prefijo cp-), se inyectan una sola vez ----------
  function estilos() {
    if (document.getElementById('estilos-compras')) return;
    const s = document.createElement('style');
    s.id = 'estilos-compras';
    s.textContent = `
      /* sugerencia por proveedor: todas las tablas con los mismos anchos, así las columnas quedan alineadas entre grupos */
      .cp-tabla-sug .tabla { table-layout: fixed; }
      .cp-tabla-sug th:nth-child(1) { width: 44px; } .cp-tabla-sug th:nth-child(3) { width: 120px; } .cp-tabla-sug th:nth-child(4) { width: 96px; }
      .cp-tabla-sug th:nth-child(5) { width: 84px; } .cp-tabla-sug th:nth-child(6) { width: 90px; } .cp-tabla-sug th:nth-child(7) { width: 110px; }
      .cp-tabla-sug th:nth-child(8) { width: 150px; } .cp-tabla-sug th:nth-child(9) { width: 120px; }
      .cp-tabla-sug td { overflow: hidden; text-overflow: ellipsis; }
      .cp-grupo { background: var(--hoja); border: 1px solid var(--linea); border-radius: var(--r-panel); }
      .cp-grupo + .cp-grupo { margin-top: 16px; }
      .cp-grupo-cabeza { display: flex; flex-wrap: wrap; gap: 10px 20px; align-items: flex-end; justify-content: space-between; padding: 14px 18px 12px; border-bottom: 1px solid var(--linea); }
      .cp-grupo-cabeza .subtitulo { line-height: 1.1; margin: 0; }
      .cp-grupo-cabeza .nota-discreta { margin-top: 3px; }
      .cp-grupo .tabla-envoltura { border: 0; border-radius: 0; }
      .cp-grupo-pie { display: flex; flex-wrap: wrap; gap: 10px 16px; align-items: center; justify-content: space-between; padding: 12px 18px; border-top: 1px solid var(--linea); background: var(--fila-hover); border-radius: 0 0 var(--r-panel) var(--r-panel); }
      .cp-grupo-pie .cp-total { font-variant-numeric: tabular-nums; }
      .cp-grupo-pie .cp-total strong { font-stretch: 112%; font-weight: 800; font-size: var(--fs-16); margin-left: 6px; }
      .cp-grupo-pie select { width: auto; min-width: 170px; }
      .tabla input.cp-cant { width: 84px; text-align: right; }
      .tabla input.cp-costo { width: 120px; text-align: right; }
      .tabla input.cp-lote { width: 120px; }
      .tabla input.cp-vence { width: 150px; }
      .cp-rojo { color: var(--peligro); }
      .cp-cobertura { display: inline-flex; align-items: center; gap: 8px; }
      .cp-cobertura .barra-h { width: 64px; min-width: 64px; }
      .cp-cobertura .barra-h > span { background: var(--peligro); }
      .cp-cobertura.cp-media .barra-h > span { background: var(--alerta); }
      .cp-renglon-extra td:first-child { padding-left: 28px; }
      .cp-totales { display: grid; grid-template-columns: max-content auto; gap: 6px 24px; justify-content: end; margin: 0; font-variant-numeric: tabular-nums; }
      .cp-totales dt { color: var(--texto-2); }
      .cp-totales dd { margin: 0; text-align: right; }
      .cp-totales .cp-gran { font-weight: 800; font-stretch: 118%; font-size: var(--fs-20); }
      .cp-linea-tiempo { list-style: none; margin: 0; padding: 0; }
      .cp-linea-tiempo li { display: grid; grid-template-columns: 14px 1fr; gap: 10px; padding-bottom: 14px; position: relative; }
      .cp-linea-tiempo li::before { content: ''; width: 10px; height: 10px; border-radius: 50%; border: 2px solid var(--tinta); background: var(--hoja); margin-top: 4px; box-sizing: content-box; width: 6px; height: 6px; }
      .cp-linea-tiempo li.cp-hecho::before { background: var(--tinta); }
      .cp-linea-tiempo li:not(:last-child)::after { content: ''; position: absolute; left: 4px; top: 16px; bottom: 0; width: 2px; background: var(--linea); }
      .cp-linea-tiempo li.cp-hecho:not(:last-child)::after { background: var(--tinta); }
      .cp-linea-tiempo strong { display: block; }
      .cp-grafico { width: 100%; height: auto; display: block; }
      .cp-grafico .cp-eje { stroke: var(--linea); }
      .cp-grafico .cp-linea { fill: none; stroke: var(--tinta); stroke-width: 2; }
      .cp-grafico .cp-punto { fill: var(--hoja); stroke: var(--tinta); stroke-width: 2; }
      .cp-grafico .cp-ficha { stroke: var(--carton); stroke-dasharray: 4 4; stroke-width: 1.5; }
      .cp-grafico text { font-size: 13px; fill: var(--texto-2); font-variant-numeric: tabular-nums; }
      .cp-envio textarea { min-height: 220px; font-size: var(--fs-13); font-variant-numeric: tabular-nums; }
      .cp-titulo-panel { display: flex; flex-wrap: wrap; gap: 8px 12px; align-items: center; justify-content: space-between; margin-bottom: 12px; }
      .cp-titulo-panel .panel-titulo { margin: 0; }
      .cp-agregar { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; }
      .cp-agregar select { flex: 1 1 260px; width: auto; min-width: 0; }
      .cp-aviso + .cp-aviso { margin-top: 8px; }
      @media (max-width: 760px) {
        .cp-tabla-sug .tabla { table-layout: auto; } .cp-tabla-sug th { width: auto !important; }
        .cp-grupo-cabeza, .cp-grupo-pie { padding: 12px 14px; }
        .cp-grupo-pie .acciones { width: 100%; }
        .cp-grupo-pie .acciones > * { flex: 1 1 100%; }
        .cp-totales { justify-content: stretch; grid-template-columns: 1fr auto; }
      }
    `;
    document.head.appendChild(s);
  }

  // ---------- envío y cancelación: quedan en el registro de acciones (marcarOrdenEnviada, cancelarOrdenCompra) ----------
  const marcarEnviada = (oc, medio) => App.acciones.marcarOrdenEnviada(oc.id, { medio });
  const envioDe = oc => oc.envio || null;
  async function cancelarOrden(oc) {
    const ok = await ui.confirmar('La orden ' + oc.nro + ' a ' + prov(oc.proveedorId).razonSocial + ' deja de figurar como pedida y no podrá recibirse. No afecta el stock ni las cuentas corrientes.', { titulo: 'Cancelar la orden ' + oc.nro, aceptar: 'Cancelar orden', cancelar: 'Volver', tipo: 'peligro' });
    if (ok) App.intentar(() => App.acciones.cancelarOrdenCompra(oc.id, 'Cancelada desde Compras'), 'Orden ' + oc.nro + ' cancelada');
  }

  // ---------- datos derivados ----------
  const prov = id => App.get('proveedores', id) || { razonSocial: '—', plazo: 0, marcas: [] };
  const prod = id => App.get('productos', id) || { descripcion: id, codigo: '', unidad: '', iva: 21 };
  const dep = id => App.get('depositos', id) || { nombre: id };
  const ocsPendientes = () => App.db.ordenesCompra.filter(o => o.estado === 'pendiente');

  // cantidades en órdenes pendientes, por producto
  function enCamino() {
    const m = {};
    ocsPendientes().forEach(o => o.items.forEach(it => { m[it.productoId] = (m[it.productoId] || 0) + it.cantidad; }));
    return m;
  }
  // venta de las últimas 4 semanas por producto (facturas menos notas de crédito)
  function ventaUltimas4Semanas() {
    const desde = F.sumar(App.hoy(), -28), m = {};
    App.db.comprobantes.forEach(c => {
      if (c.fecha < desde) return;
      const signo = c.clase === 'nc' ? -1 : 1;
      c.items.forEach(it => { m[it.productoId] = (m[it.productoId] || 0) + signo * it.cantidad; });
    });
    return m;
  }

  // sugerencia: lo que está bajo mínimo o cerca, descontando lo que ya está pedido
  function sugerencia() {
    const camino = enCamino(), venta = ventaUltimas4Semanas();
    const filas = [];
    App.db.productos.forEach(p => {
      if (p.activo === false || !p.minimo) return;
      const st = App.q.stock(p.id);
      const pedido = camino[p.id] || 0;
      const proyectado = st.disponible + pedido;
      if (proyectado >= p.minimo * 1.25) return;
      const objetivo = p.minimo * (p.fresco ? 1.6 : 2.5);
      const cantidad = Math.max(1, Math.ceil(objetivo - proyectado));
      const ventaDia = Math.max(0, (venta[p.id] || 0) / 28);
      filas.push({
        producto: p, productoId: p.id, proveedorId: p.proveedorId,
        disponible: st.disponible, minimo: p.minimo, pedido,
        ventaSemana: r2(ventaDia * 7), cobertura: ventaDia > 0 ? st.disponible / ventaDia : null,
        urgente: st.disponible < p.minimo, cantidad, costo: p.costo, elegido: true
      });
    });
    return filas.sort((a, b) => (b.urgente - a.urgente) || (a.disponible / a.minimo) - (b.disponible / b.minimo));
  }

  // historial de costos de compra (sale de las facturas de compra)
  function comprasDe(productoId) {
    const res = [];
    App.db.comprasFacturas.forEach(fc => fc.items.forEach(it => {
      if (it.productoId === productoId) res.push({ fecha: fc.fecha, factura: fc, proveedorId: fc.proveedorId, cantidad: it.cantidad, costo: it.costo, subtotal: it.subtotal });
    }));
    return res.sort((a, b) => a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0);
  }
  function resumenCostos() {
    const por = {};
    App.db.comprasFacturas.forEach(fc => fc.items.forEach(it => { (por[it.productoId] = por[it.productoId] || []).push({ fecha: fc.fecha, costo: it.costo, cantidad: it.cantidad }); }));
    const hace90 = F.sumar(App.hoy(), -90);
    return App.db.productos.filter(p => p.activo !== false).map(p => {
      const l = (por[p.id] || []).sort((a, b) => a.fecha < b.fecha ? -1 : 1);
      const ult = l[l.length - 1];
      const rec = l.filter(x => x.fecha >= hace90);
      const unidades = rec.reduce((s, x) => s + x.cantidad, 0);
      const promedio = unidades ? rec.reduce((s, x) => s + x.costo * x.cantidad, 0) / unidades : null;
      const primero = rec[0] || l[0];
      const variacion = ult && primero && primero.costo ? ult.costo / primero.costo - 1 : 0;
      const precio = App.q.precio(p.id, 'L2');
      return { producto: p, productoId: p.id, compras: l.length, ultimaFecha: ult ? ult.fecha : null, ultimoCosto: ult ? ult.costo : null,
        promedio, variacion: Math.abs(variacion) < 0.0005 ? 0 : variacion, ficha: p.costo, precio, margen: precio ? (precio - p.costo) / precio : 0,
        distinto: !!ult && Math.abs(ult.costo - p.costo) > 0.5 };
    });
  }

  function totales(items) {
    let n21 = 0, n105 = 0;
    items.forEach(it => { const st = (Number(it.cantidad) || 0) * (Number(it.costo) || 0); if (Number(it.iva) === 10.5) n105 += st; else n21 += st; });
    const i21 = r2(n21 * 0.21), i105 = r2(n105 * 0.105);
    return { neto21: r2(n21), neto105: r2(n105), neto: r2(n21 + n105), iva21: i21, iva105: i105, iva: r2(i21 + i105), total: r2(n21 + n105 + i21 + i105) };
  }
  const totalesHTML = t => h`<dl class="cp-totales">
    ${t.neto21 ? h`<dt>Neto gravado 21 %</dt><dd>${ui.pesos(t.neto21)}</dd>` : ''}
    ${t.neto105 ? h`<dt>Neto gravado 10,5 %</dt><dd>${ui.pesos(t.neto105)}</dd>` : ''}
    ${t.iva21 ? h`<dt>IVA 21 %</dt><dd>${ui.pesos(t.iva21)}</dd>` : ''}
    ${t.iva105 ? h`<dt>IVA 10,5 %</dt><dd>${ui.pesos(t.iva105)}</dd>` : ''}
    <dt>Total</dt><dd class="cp-gran">${ui.pesos(t.total)}</dd></dl>`;

  function estadoOC(oc) {
    if (oc.estado === 'recibida') return ui.chip('Recibida', 'ok');
    if (oc.estado === 'cancelada') return ui.chip('Cancelada', 'neutro');
    const dias = F.diferencia(oc.fecha, App.hoy());
    if (dias > 3) return ui.chip('Atrasada ' + dias + ' días', 'peligro');
    if (envioDe(oc)) return ui.chip('Enviada, por recibir', 'info');
    return ui.chip('Por enviar', 'alerta');
  }

  const celda = (principal, sub) => h`<div class="celda-principal">${principal}</div>${sub ? h`<div class="celda-sub">${sub}</div>` : ''}`;
  const encabezado = (titulo, bajada, migas, acciones) => h`<div class="encabezado-vista"><div>
      ${migas ? h`<div class="migas">${migas}</div>` : ''}<h1 class="titulo-vista">${titulo}</h1>${bajada ? h`<p class="bajada">${bajada}</p>` : ''}</div>
      ${acciones ? h`<div class="acciones">${acciones}</div>` : ''}</div>`;
  const miga = h`<a href="#/compras">Compras</a> / `;
  const noEncontrada = (titulo) => h`<div class="vacio vacio-grande"><h1 class="titulo-vista">${titulo}</h1><p>Puede que el enlace esté mal o que ya no exista.</p><a class="btn btn-primario" href="#/compras">Volver a Compras</a></div>`;

  function inputNum(valor, clase, alCambiar, opciones) {
    const o = opciones || {};
    const i = document.createElement('input');
    i.type = 'number'; i.className = clase; i.min = o.min != null ? o.min : 0; i.step = o.step || 1; i.value = valor;
    if (o.etiqueta) i.setAttribute('aria-label', o.etiqueta);
    i.addEventListener('input', () => alCambiar(i.value === '' ? 0 : Number(i.value), i));
    return i;
  }

  // ---------- documento de la orden de compra (imprimible: sólo clases comp-* de app.css) ----------
  function ordenHTML(oc) {
    const C = App.config, p = prov(oc.proveedorId), d = dep(oc.depositoId);
    const t = totales(oc.items);
    return h`<article class="comprobante">
      <header class="comp-cabecera">
        <div class="comp-emisor"><div class="comp-negocio">${C.razonSocial}</div><div>${C.domicilio}</div><div>Tel. ${C.telefono}</div><div>${C.email}</div><div>CUIT ${C.cuit}</div></div>
        <div class="comp-letra"><span>X</span><small>No válido como factura</small></div>
        <div class="comp-datos"><div class="comp-titulo">Orden de compra</div><div>N.º <strong>${oc.nro}</strong></div><div>Fecha ${ui.fecha(oc.fecha)}</div><div>Entregar en ${d.nombre}</div><div>${d.direccion || ''}</div></div>
      </header>
      <section class="comp-receptor">
        <div><span>Proveedor</span><strong>${p.razonSocial}</strong></div><div><span>CUIT</span>${p.cuit || '—'}</div>
        <div><span>Domicilio</span>${p.direccion || ''}</div><div><span>Condición de pago</span>Cuenta corriente a ${p.plazo || 0} días</div>
        ${oc.obs ? h`<div><span>Observaciones</span>${oc.obs}</div>` : ''}
      </section>
      <table class="comp-items"><thead><tr><th>Código</th><th>Descripción</th><th>Unidad</th><th class="al-der">Cant.</th><th class="al-der">Costo neto</th><th class="al-der">IVA</th><th class="al-der">Subtotal neto</th></tr></thead><tbody>
        ${oc.items.map(it => { const pr = prod(it.productoId); return h`<tr><td>${pr.codigo}</td><td>${pr.descripcion}</td><td>${pr.unidad}</td><td class="al-der">${ui.num(it.cantidad)}</td><td class="al-der">${ui.pesos(it.costo)}</td><td class="al-der">${ui.num(it.iva, 1)} %</td><td class="al-der">${ui.pesos(it.cantidad * it.costo)}</td></tr>`; })}
      </tbody></table>
      <div class="comp-totales">
        ${t.neto21 ? h`<div><span>Neto gravado 21 %</span>${ui.pesos(t.neto21)}</div>` : ''}${t.neto105 ? h`<div><span>Neto gravado 10,5 %</span>${ui.pesos(t.neto105)}</div>` : ''}
        ${t.iva21 ? h`<div><span>IVA 21 %</span>${ui.pesos(t.iva21)}</div>` : ''}${t.iva105 ? h`<div><span>IVA 10,5 %</span>${ui.pesos(t.iva105)}</div>` : ''}
        <div class="comp-total"><span>Total estimado</span><strong>${ui.pesos(t.total)}</strong></div>
      </div>
      <div class="comp-firma"><div>Autorizó: firma y aclaración</div><div>Fecha</div></div>
      <footer class="comp-pie comp-pie-simple"><p>Se solicita indicar el número de esta orden en la factura.</p></footer>
    </article>`;
  }

  function textoOrden(oc) {
    const p = prov(oc.proveedorId), d = dep(oc.depositoId);
    const lineas = oc.items.map(it => { const pr = prod(it.productoId); return '- ' + ui.num(it.cantidad) + ' × ' + pr.descripcion + ' (' + pr.unidad + ', cód. ' + pr.codigo + ') a ' + ui.pesos(it.costo) + ' + IVA'; });
    return 'Señores de ' + p.razonSocial + ':\n\nSe adjunta la orden de compra n.º ' + oc.nro + ' del ' + ui.fecha(oc.fecha) + ' de ' + App.config.razonSocial + ':\n\n' +
      lineas.join('\n') + '\n\nTotal estimado: ' + ui.pesos(oc.total) + ' con IVA.\nEntregar en ' + d.nombre + (d.direccion ? ', ' + d.direccion : '') + '.\n' +
      'Condición de pago: cuenta corriente a ' + (p.plazo || 0) + ' días.' + (oc.obs ? '\nObservaciones: ' + oc.obs : '') + '\n\nSe solicita confirmar la fecha de entrega.\n\nSaludos cordiales.';
  }

  function enviarOrden(oc) {
    const p = prov(oc.proveedorId);
    const cuerpo = ui.nodo(h`<div class="cp-envio pila">
      <dl class="datos"><dt>Destinatario</dt><dd>${p.razonSocial}</dd><dt>Correo</dt><dd>${p.email || 'sin correo registrado'}</dd><dt>Teléfono</dt><dd>${p.telefono || '—'}</dd></dl>
      <div class="campo"><label for="cp-texto-envio">Texto del envío</label><textarea id="cp-texto-envio">${textoOrden(oc)}</textarea>
      <span class="campo-ayuda">El texto puede modificarse antes del envío. En la versión definitiva la orden se envía directamente desde el sistema, con el PDF adjunto.</span></div>
    </div>`);
    const leer = () => cuerpo.querySelector('textarea').value;
    const listo = (medio, aviso) => { marcarEnviada(oc, medio); ui.toast(aviso, 'ok'); setTimeout(App.renderizar, 0); };
    const m = ui.modal({
      titulo: 'Enviar la orden ' + oc.nro, cuerpo, ancho: 640,
      acciones: [
        { texto: 'Imprimir orden', tipo: 'secundario', alClic: () => { ui.imprimir(ordenHTML(oc), { titulo: 'Orden de compra ' + oc.nro }); listo('impresa', 'Orden ' + oc.nro + ' enviada a impresión'); } },
        { texto: 'Copiar para WhatsApp', tipo: 'secundario', alClic: () => {
          const falla = () => ui.toast('El navegador no permitió copiar el texto. Puede seleccionarse y copiarse manualmente.', 'alerta');
          try { navigator.clipboard.writeText(leer()).then(() => listo('WhatsApp', 'Texto copiado para el chat del proveedor'), falla); } catch (e) { falla(); }
        } },
        { texto: 'Enviar por correo', tipo: 'primario', alClic: () => {
          // sin destinatario a propósito: los correos de los proveedores de la demo son inventados
          const a = document.createElement('a');
          a.href = 'mailto:?subject=' + encodeURIComponent('Orden de compra ' + oc.nro + ' de ' + App.config.razonSocial) + '&body=' + encodeURIComponent(leer());
          a.click();
          listo('correo', 'Orden ' + oc.nro + ' enviada por correo');
        } }
      ]
    });
  }

  // ---------- pestaña: sugerencia de compra ----------
  function vistaSugerencia(panel) {
    const filas = sugerencia();
    if (!filas.length) { panel.innerHTML = String(h`<div class="vacio">No hay productos para reponer: todos superan el stock mínimo o ya tienen una orden en curso.</div>`); return; }
    const urg = filas.filter(f => f.urgente).length;
    panel.appendChild(ui.nodo(h`<p class="nota-discreta" style="margin:0 0 14px">${urg} bajo mínimo y ${filas.length - urg} cerca del mínimo. La cantidad sugerida lleva el stock a 2,5 veces el mínimo (1,6 en frescos), descontando lo ya pedido. Las cantidades pueden ajustarse y los productos que no se pidan, desmarcarse.</p>`));
    const grupos = {};
    filas.forEach(f => { (grupos[f.proveedorId] = grupos[f.proveedorId] || []).push(f); });
    Object.keys(grupos).sort((a, b) => grupos[b].filter(f => f.urgente).length - grupos[a].filter(f => f.urgente).length).forEach(pid => {
      const lista = grupos[pid], p = prov(pid);
      const caja = ui.nodo(h`<section class="cp-grupo" data-proveedor="${pid}">
        <div class="cp-grupo-cabeza"><div><h2 class="subtitulo">${p.razonSocial}</h2><div class="nota-discreta">Plazo de pago: ${p.plazo} días. Marcas: ${(p.marcas || []).join(', ')}</div></div>
        <a class="btn btn-fantasma btn-chico" href="#/proveedores/${pid}">Ver proveedor</a></div>
        <div data-tabla></div>
        <div class="cp-grupo-pie"><div class="cp-total">Total estimado con IVA<strong data-total></strong></div>
          <div class="acciones"><select data-dep aria-label="Depósito de entrega">${ui.opciones(App.db.depositos, 'id', d => 'Entregar en ' + d.nombre, 'D1')}</select>
          <button type="button" class="btn btn-secundario" data-editar>Revisar orden</button><button type="button" class="btn btn-primario" data-generar>Generar orden de compra</button></div></div>
      </section>`);
      const pintarTotal = () => { caja.querySelector('[data-total]').textContent = ui.pesos(totales(lista.filter(f => f.elegido).map(f => ({ cantidad: f.cantidad, costo: f.costo, iva: f.producto.iva }))).total); };
      const tabla = ui.tabla({
        filas: lista, clase: 'cp-tabla-sug',
        filaClase: f => f.urgente ? 'fila-peligro' : 'fila-alerta',
        columnas: [
          { titulo: '', ancho: '36px', valor: f => { const c = document.createElement('input'); c.type = 'checkbox'; c.checked = f.elegido; c.setAttribute('aria-label', 'Pedir ' + f.producto.descripcion); c.addEventListener('change', () => { f.elegido = c.checked; pintarTotal(); }); return c; } },
          { titulo: 'Producto', ordenar: f => f.producto.descripcion, valor: f => celda(f.producto.descripcion, f.producto.codigo + ', ' + f.producto.unidad) },
          { titulo: 'Pedir', alinear: 'der', valor: f => inputNum(f.cantidad, 'cp-cant', v => { f.cantidad = v; pintarTotal(); }, { min: 1, etiqueta: 'Cantidad a pedir de ' + f.producto.descripcion }) },
          { titulo: 'Disponible', alinear: 'der', campo: 'disponible', valor: f => h`<strong>${ui.num(f.disponible)}</strong>` },
          { titulo: 'Mínimo', clase: 'ocultar-celu', alinear: 'der', campo: 'minimo', valor: f => ui.num(f.minimo) },
          { titulo: 'Ya pedido', clase: 'ocultar-celu', alinear: 'der', campo: 'pedido', valor: f => f.pedido ? ui.num(f.pedido) : '—' },
          { titulo: 'Venta semanal', clase: 'ocultar-celu', alinear: 'der', campo: 'ventaSemana', valor: f => ui.num(f.ventaSemana, f.ventaSemana < 10 ? 1 : 0) },
          { titulo: 'Cobertura', clase: 'ocultar-celu', ordenar: f => f.cobertura == null ? 999 : f.cobertura, valor: f => {
            if (f.cobertura == null) return 'sin ventas';
            const dias = f.cobertura, pct = Math.max(4, Math.min(100, dias / 14 * 100));
            return h`<span class="cp-cobertura${dias >= 4 ? ' cp-media' : ''}"><span class="barra-h"><span style="width:${Math.round(pct)}%"></span></span>${dias < 1 ? 'menos de 1 día' : ui.num(dias, 0) + (Math.round(dias) === 1 ? ' día' : ' días')}</span>`;
          } },
          { titulo: 'Costo neto', clase: 'ocultar-celu', alinear: 'der', campo: 'costo', valor: f => ui.pesos(f.costo) }
        ]
      });
      caja.querySelector('[data-tabla]').appendChild(tabla);
      pintarTotal();
      const items = () => lista.filter(f => f.elegido && f.cantidad > 0).map(f => ({ productoId: f.productoId, cantidad: f.cantidad, costo: f.costo }));
      caja.querySelector('[data-generar]').addEventListener('click', () => {
        const its = items();
        if (!its.length) { ui.toast('Se debe seleccionar al menos un producto para generar la orden.', 'alerta'); return; }
        const oc = App.intentar(() => App.acciones.crearOrdenCompra({ proveedorId: pid, items: its, depositoId: caja.querySelector('[data-dep]').value }), o => 'Orden de compra ' + o.nro + ' generada');
        if (oc) ui.ir('#/compras/orden/' + oc.id);
      });
      caja.querySelector('[data-editar]').addEventListener('click', () => {
        borrador = { proveedorId: pid, depositoId: caja.querySelector('[data-dep]').value, items: items() };
        ui.ir('#/compras/nueva/' + pid);
      });
      panel.appendChild(caja);
    });
  }

  // ---------- pestaña: órdenes de compra ----------
  const filtroOC = { estado: null, texto: '', proveedorId: '' };
  function vistaOrdenes(panel) {
    if (!filtroOC.estado) filtroOC.estado = ocsPendientes().length ? 'pendiente' : 'todas';
    const f = ui.nodo(h`<div class="filtros">
      <div class="segmentado" role="group" aria-label="Estado de la orden">
        <button type="button" data-e="pendiente">Por recibir</button><button type="button" data-e="recibida">Recibidas</button><button type="button" data-e="cancelada">Canceladas</button><button type="button" data-e="todas">Todas</button></div>
      <input type="search" placeholder="Buscar por número, proveedor o producto" aria-label="Buscar órdenes" value="${filtroOC.texto}">
      <select aria-label="Proveedor"><option value="">Todos los proveedores</option>${ui.opciones(App.db.proveedores, 'id', 'razonSocial', filtroOC.proveedorId)}</select>
    </div>`);
    panel.appendChild(f);
    const filtrar = () => {
      const t = ui.normalizar(filtroOC.texto).trim();
      return App.db.ordenesCompra.filter(o => (filtroOC.estado === 'todas' || o.estado === filtroOC.estado) && (!filtroOC.proveedorId || o.proveedorId === filtroOC.proveedorId) &&
        (!t || ui.coincide(t, o.nro, prov(o.proveedorId).razonSocial, ...o.items.map(it => prod(it.productoId).descripcion))))
        .sort((a, b) => ((a.estado === 'pendiente' ? 0 : 1) - (b.estado === 'pendiente' ? 0 : 1)) || b.numero - a.numero);
    };
    const tabla = ui.tabla({
      filas: filtrar(), limite: 40,
      vacio: filtroOC.estado === 'pendiente' ? h`No hay órdenes pendientes de recepción. Pueden generarse desde la sugerencia de compra o con «Nueva orden de compra».` : 'No hay órdenes con ese filtro.',
      alClic: o => ui.ir('#/compras/orden/' + o.id),
      filaClase: o => o.estado === 'pendiente' && F.diferencia(o.fecha, App.hoy()) > 3 ? 'fila-peligro' : '',
      columnas: [
        { titulo: 'N.º', campo: 'numero', valor: o => h`<strong>${o.nro}</strong>` },
        { titulo: 'Fecha', clase: 'ocultar-celu', campo: 'fecha', valor: o => ui.fecha(o.fecha) },
        { titulo: 'Proveedor', ordenar: o => prov(o.proveedorId).razonSocial, valor: o => celda(prov(o.proveedorId).razonSocial, o.items.length + (o.items.length === 1 ? ' renglón' : ' renglones')) },
        { titulo: 'Depósito', clase: 'ocultar-celu', valor: o => dep(o.depositoId).nombre },
        { titulo: 'Total', alinear: 'der', campo: 'total', valor: o => ui.pesos(o.total) },
        { titulo: 'Estado', valor: o => estadoOC(o) },
        { titulo: 'Recibida', clase: 'ocultar-celu', ordenar: o => o.recepcion ? o.recepcion.fecha : '', valor: o => o.recepcion ? ui.fecha(o.recepcion.fecha) : '—' }
      ]
    });
    panel.appendChild(tabla);
    const seg = f.querySelectorAll('[data-e]');
    const marcar = () => seg.forEach(b => b.setAttribute('aria-pressed', b.dataset.e === filtroOC.estado));
    marcar();
    seg.forEach(b => b.addEventListener('click', () => { filtroOC.estado = b.dataset.e; marcar(); tabla.actualizar(filtrar()); }));
    ui.buscador(f.querySelector('input'), (t, crudo) => { filtroOC.texto = crudo; tabla.actualizar(filtrar()); });
    f.querySelector('select').addEventListener('change', e => { filtroOC.proveedorId = e.target.value; tabla.actualizar(filtrar()); });
  }

  // ---------- pestaña: historial de costos ----------
  let textoCostos = '';
  function vistaCostos(panel) {
    const filas = resumenCostos();
    const distintos = filas.filter(f => f.distinto).length;
    const f = ui.nodo(h`<div class="filtros"><input type="search" placeholder="Buscar producto, código o marca" aria-label="Buscar producto" value="${textoCostos}">
      <span class="nota-discreta">${distintos ? distintos + (distintos === 1 ? ' producto tiene' : ' productos tienen') + ' la última compra a un costo distinto del de la ficha.' : 'El costo de ficha coincide con la última compra en todos los productos.'} El detalle de compras se consulta desde cada producto.</span></div>`);
    panel.appendChild(f);
    const filtrar = () => { const t = ui.normalizar(textoCostos).trim(); return filas.filter(x => ui.coincide(t, x.producto.descripcion, x.producto.codigo, x.producto.marca, x.producto.rubro)); };
    const tabla = ui.tabla({
      filas: filtrar(), limite: 30, alClic: x => ui.ir('#/compras/costos/' + x.productoId),
      filaClase: x => x.distinto ? 'fila-alerta' : '',
      columnas: [
        { titulo: 'Producto', ordenar: x => x.producto.descripcion, valor: x => celda(x.producto.descripcion, x.producto.codigo + ', ' + x.producto.marca) },
        { titulo: 'Proveedor', clase: 'ocultar-celu', ordenar: x => prov(x.producto.proveedorId).razonSocial, valor: x => prov(x.producto.proveedorId).razonSocial },
        { titulo: 'Última compra', clase: 'ocultar-celu', ordenar: x => x.ultimaFecha || '', valor: x => x.ultimaFecha ? ui.fecha(x.ultimaFecha) : 'nunca' },
        { titulo: 'Último costo', alinear: 'der', ordenar: x => x.ultimoCosto || 0, valor: x => x.ultimoCosto != null ? ui.pesos(x.ultimoCosto) : '—' },
        { titulo: 'Promedio 90 días', clase: 'ocultar-celu', alinear: 'der', ordenar: x => x.promedio || 0, valor: x => x.promedio != null ? ui.pesos(x.promedio) : '—' },
        { titulo: 'Variación', clase: 'ocultar-celu', alinear: 'der', campo: 'variacion', valor: x => x.variacion ? h`<span class="${x.variacion > 0 ? 'cp-rojo' : 'ok'}">${x.variacion > 0 ? '+' : ''}${ui.porcentaje(x.variacion)}</span>` : 'sin cambios' },
        { titulo: 'Costo de ficha', alinear: 'der', campo: 'ficha', valor: x => ui.pesos(x.ficha) },
        { titulo: 'Margen lista Almacén', clase: 'ocultar-celu', alinear: 'der', campo: 'margen', valor: x => ui.porcentaje(x.margen) }
      ]
    });
    panel.appendChild(tabla);
    ui.buscador(f.querySelector('input'), (t, crudo) => { textoCostos = crudo; tabla.actualizar(filtrar()); });
  }

  // ---------- pantalla principal ----------
  function vistaInicio(el) {
    const bajo = App.q.bajoMinimo();
    const pend = ocsPendientes();
    const mes = F.inicioMes(App.hoy());
    const delMes = App.db.comprasFacturas.filter(f => f.fecha >= mes);
    const deuda = App.db.proveedores.reduce((s, p) => s + App.q.saldoProveedor(p.id), 0);
    const sug = sugerencia().length;
    el.innerHTML = String(h`${encabezado('Compras', 'Reposición de faltantes, envío de órdenes a proveedores y recepción de mercadería con lote y vencimiento.', null,
      h`<a class="btn btn-primario" href="#/compras/nueva">Nueva orden de compra</a>`)}
      ${ui.franjaKpi([
        { titulo: 'Bajo mínimo', valor: ui.num(bajo.length), detalle: bajo.length ? bajo.slice(0, 2).map(b => b.producto.descripcion).join(', ') + (bajo.length > 2 ? ' y ' + (bajo.length - 2) + ' más' : '') : 'Stock cubierto', tono: bajo.length ? 'peligro' : 'ok' },
        { titulo: 'Órdenes por recibir', valor: ui.num(pend.length), detalle: pend.length ? ui.pesos(pend.reduce((s, o) => s + o.total, 0)) + ' pendientes de recepción' : 'Sin órdenes pendientes', tono: pend.length ? 'info' : null },
        { titulo: 'Compras de ' + F.nombreMes(App.hoy()).split(' ')[0], valor: ui.pesosCorto(delMes.reduce((s, f) => s + f.total, 0)), detalle: delMes.length + ' facturas de proveedores' },
        { titulo: 'Deuda con proveedores', valor: ui.pesosCorto(deuda), detalle: h`<a href="#/proveedores">Ver vencimientos de la semana</a>` }
      ])}
      <div class="seccion" data-pestanas></div>`);
    ui.pestanas(el.querySelector('[data-pestanas]'), [
      { id: 'sugerencia', titulo: 'Sugerencia de compra', cuenta: sug || null, render: vistaSugerencia },
      { id: 'ordenes', titulo: 'Órdenes de compra', cuenta: pend.length || null, render: vistaOrdenes },
      { id: 'costos', titulo: 'Historial de costos', render: vistaCostos }
    ], { clave: 'compras' });
  }

  // ---------- nueva orden de compra ----------
  let borrador = null;
  function vistaNueva(el, proveedorId) {
    const b = borrador && (!proveedorId || borrador.proveedorId === proveedorId) ? borrador : null;
    borrador = null;
    const estado = {
      proveedorId: (b && b.proveedorId) || (App.get('proveedores', proveedorId) ? proveedorId : App.db.proveedores[0].id),
      depositoId: (b && b.depositoId) || 'D1',
      renglones: b ? b.items.map(it => ({ productoId: it.productoId, cantidad: it.cantidad, costo: it.costo })) : []
    };
    el.innerHTML = String(h`${encabezado('Nueva orden de compra', 'Selección del proveedor, carga de productos y generación de la orden, con envío posterior por correo o WhatsApp.', h`${miga}Nueva orden`)}
      <div class="grilla-lado">
        <div class="pila">
          <div class="panel"><div class="form-grilla">
            <div class="campo"><label for="cp-prov">Proveedor</label><select id="cp-prov">${ui.opciones(App.db.proveedores, 'id', 'razonSocial', estado.proveedorId)}</select></div>
            <div class="campo"><label for="cp-dep">Entregar en</label><select id="cp-dep">${ui.opciones(App.db.depositos, 'id', 'nombre', estado.depositoId)}</select></div>
            <div class="campo"><label for="cp-fecha">Fecha</label><input type="date" id="cp-fecha" value="${App.hoy()}"></div>
            <div class="campo ancho-total"><label for="cp-obs">Observaciones para el proveedor</label><input type="text" id="cp-obs" placeholder="Por ejemplo: entregar antes de las 11, con remito"></div>
          </div></div>
          <div class="panel"><div class="cp-titulo-panel"><h2 class="panel-titulo">Productos</h2>
            <button type="button" class="btn btn-secundario btn-chico" data-faltantes>Agregar productos bajo mínimo</button></div>
            <div class="cp-agregar"><select data-agregar aria-label="Producto para agregar"></select><button type="button" class="btn btn-secundario" data-sumar>Agregar producto</button></div>
            <div data-tabla></div></div>
        </div>
        <aside class="panel"><h2 class="panel-titulo">Resumen</h2><div data-resumen></div>
          <div class="acciones" style="margin-top:16px"><button type="button" class="btn btn-senal btn-grande" data-crear style="flex:1">Generar orden de compra</button></div>
          <p class="nota-discreta" style="margin:10px 0 0">Los costos se toman de la ficha de cada producto y pueden modificarse si el proveedor informó otro precio.</p></aside>
      </div>`);
    const selProv = el.querySelector('#cp-prov'), selAgregar = el.querySelector('[data-agregar]');
    const productosProv = () => App.db.productos.filter(p => p.activo !== false && p.proveedorId === estado.proveedorId);
    const pintarOpciones = () => {
      const usados = new Set(estado.renglones.map(r => r.productoId));
      const lista = productosProv().filter(p => !usados.has(p.id));
      selAgregar.innerHTML = lista.length ? String(ui.opciones(lista, 'id', p => p.descripcion + ' (' + p.codigo + '), disponible ' + ui.num(App.q.stock(p.id).disponible), null)) : '<option value="">Todos los productos del proveedor ya están en la orden</option>';
    };
    const pintarResumen = () => {
      const t = totales(estado.renglones.map(r => ({ cantidad: r.cantidad, costo: r.costo, iva: prod(r.productoId).iva })));
      const p = prov(estado.proveedorId);
      el.querySelector('[data-resumen]').innerHTML = String(h`<dl class="datos" style="margin-bottom:14px"><dt>Proveedor</dt><dd>${p.razonSocial}</dd><dt>Plazo de pago</dt><dd>${p.plazo} días</dd><dt>Renglones</dt><dd>${estado.renglones.length}</dd></dl>${totalesHTML(t)}`);
    };
    function sub(r) { const s = el.querySelector('[data-sub="' + r.productoId + '"]'); if (s) s.textContent = ui.pesos(r.cantidad * r.costo); }
    const tabla = ui.tabla({
      filas: estado.renglones,
      vacio: 'La orden no tiene productos. Pueden agregarse desde el selector o con «Agregar productos bajo mínimo».',
      columnas: [
        { titulo: 'Producto', valor: r => { const p = prod(r.productoId), st = App.q.stock(p.id); return celda(p.descripcion, p.codigo + ', disponible ' + ui.num(st.disponible) + ', mínimo ' + ui.num(p.minimo)); } },
        { titulo: 'Cantidad', alinear: 'der', valor: r => inputNum(r.cantidad, 'cp-cant', v => { r.cantidad = v; pintarResumen(); sub(r); }, { min: 1, etiqueta: 'Cantidad de ' + prod(r.productoId).descripcion }) },
        { titulo: 'Costo neto', alinear: 'der', valor: r => inputNum(r.costo, 'cp-costo', v => { r.costo = v; pintarResumen(); sub(r); }, { step: 0.01, etiqueta: 'Costo de ' + prod(r.productoId).descripcion }) },
        { titulo: 'IVA', clase: 'ocultar-celu', alinear: 'der', valor: r => ui.num(prod(r.productoId).iva, 1) + ' %' },
        { titulo: 'Subtotal neto', clase: 'ocultar-celu', alinear: 'der', valor: r => { const s = document.createElement('span'); s.dataset.sub = r.productoId; s.textContent = ui.pesos(r.cantidad * r.costo); return s; } },
        { titulo: '', valor: r => { const x = document.createElement('button'); x.type = 'button'; x.className = 'btn btn-fantasma btn-chico'; x.textContent = 'Quitar'; x.addEventListener('click', () => { estado.renglones = estado.renglones.filter(y => y !== r); refrescar(); }); return x; } }
      ]
    });
    function refrescar() { tabla.actualizar(estado.renglones); pintarOpciones(); pintarResumen(); }
    el.querySelector('[data-tabla]').appendChild(tabla);
    refrescar();
    selProv.addEventListener('change', () => {
      if (estado.renglones.length) ui.toast('Proveedor modificado: se quitaron los productos del proveedor anterior.', 'info');
      estado.proveedorId = selProv.value; estado.renglones = []; refrescar();
    });
    el.querySelector('#cp-dep').addEventListener('change', e => { estado.depositoId = e.target.value; });
    el.querySelector('[data-sumar]').addEventListener('click', () => {
      const p = App.get('productos', selAgregar.value);
      if (!p) return;
      estado.renglones.push({ productoId: p.id, cantidad: Math.max(1, Math.ceil(p.minimo * 2 - App.q.stock(p.id).disponible)), costo: p.costo });
      refrescar();
    });
    el.querySelector('[data-faltantes]').addEventListener('click', () => {
      const usados = new Set(estado.renglones.map(r => r.productoId));
      const nuevos = sugerencia().filter(f => f.proveedorId === estado.proveedorId && !usados.has(f.productoId));
      if (!nuevos.length) { ui.toast('El proveedor no tiene productos bajo mínimo pendientes de agregar.', 'info'); return; }
      nuevos.forEach(f => estado.renglones.push({ productoId: f.productoId, cantidad: f.cantidad, costo: f.costo }));
      refrescar();
      ui.toast('Productos agregados: ' + nuevos.length + (nuevos.length === 1 ? ' producto' : ' productos'), 'ok');
    });
    el.querySelector('[data-crear]').addEventListener('click', () => {
      const oc = App.intentar(() => App.acciones.crearOrdenCompra({
        proveedorId: estado.proveedorId, depositoId: estado.depositoId, fecha: el.querySelector('#cp-fecha').value || App.hoy(),
        obs: el.querySelector('#cp-obs').value.trim(), items: estado.renglones.map(r => ({ productoId: r.productoId, cantidad: r.cantidad, costo: r.costo }))
      }), o => 'Orden de compra ' + o.nro + ' generada');
      if (oc) ui.ir('#/compras/orden/' + oc.id);
    });
  }

  // ---------- detalle de la orden ----------
  function vistaOrden(el, id) {
    const oc = App.get('ordenesCompra', id);
    if (!oc) { el.innerHTML = String(noEncontrada('No se encontró la orden')); return; }
    const p = prov(oc.proveedorId), env = envioDe(oc), rec = oc.recepcion;
    const fc = rec ? App.get('comprasFacturas', rec.compraFacturaId) : null;
    const acciones = oc.estado === 'pendiente'
      ? h`<button type="button" class="btn btn-secundario" data-imprimir>Imprimir orden</button><button type="button" class="btn btn-secundario" data-enviar>Enviar al proveedor</button><button type="button" class="btn btn-peligro" data-cancelar>Cancelar orden</button><a class="btn btn-senal" href="#/compras/recibir/${oc.id}">Recibir mercadería</a>`
      : h`<button type="button" class="btn btn-secundario" data-imprimir>Imprimir orden</button><a class="btn btn-secundario" href="#/proveedores/${oc.proveedorId}">Ver cuenta del proveedor</a>`;
    const pasos = [
      { hecho: true, titulo: 'Orden generada', detalle: ui.fecha(oc.fecha) },
      { hecho: !!env || !!rec, titulo: 'Enviada al proveedor', detalle: env ? ui.fecha(env.fecha) + ', ' + env.medio : rec ? 'Sin registro del envío' : 'Pendiente de envío' },
      { hecho: !!rec, titulo: oc.estado === 'cancelada' ? 'Orden cancelada' : 'Mercadería recibida', detalle: rec ? ui.fecha(rec.fecha) + ' en ' + dep(rec.depositoId).nombre : oc.estado === 'cancelada' ? ui.fecha(oc.fechaCancelacion) + (oc.motivoCancelacion ? ', ' + oc.motivoCancelacion : '') : 'Pendiente' },
      { hecho: !!fc, titulo: 'Factura del proveedor', detalle: fc ? 'Factura ' + fc.tipo + ' ' + fc.numero + ', vence ' + ui.fecha(fc.vence) : 'Se carga al recibir' }
    ];
    el.innerHTML = String(h`${encabezado('Orden ' + oc.nro, h`${p.razonSocial}, para ${dep(oc.depositoId).nombre}`, h`${miga}Orden de compra`, acciones)}
      <div class="grilla-lado">
        <div class="pila">
          <div class="panel"><div class="cp-titulo-panel"><h2 class="panel-titulo">Productos pedidos</h2>${estadoOC(oc)}</div><div data-items></div>
            <div style="margin-top:16px">${totalesHTML(totales(oc.items))}</div></div>
          ${rec ? h`<div class="panel"><h2 class="panel-titulo">Ingreso al depósito</h2><div data-lotes></div></div>` : ''}
        </div>
        <aside class="pila">
          <div class="panel"><h2 class="panel-titulo">Seguimiento</h2><ol class="cp-linea-tiempo">${pasos.map(s => h`<li class="${s.hecho ? 'cp-hecho' : ''}"><div><strong>${s.titulo}</strong><span class="nota-discreta">${s.detalle}</span></div></li>`)}</ol></div>
          <div class="panel"><h2 class="panel-titulo">Proveedor</h2><dl class="datos"><dt>Razón social</dt><dd><a href="#/proveedores/${p.id}">${p.razonSocial}</a></dd><dt>CUIT</dt><dd>${p.cuit}</dd><dt>Plazo</dt><dd>${p.plazo} días</dd><dt>Teléfono</dt><dd>${p.telefono}</dd>
            <dt>Saldo</dt><dd>${ui.pesos(App.q.saldoProveedor(p.id))}</dd></dl></div>
          ${oc.obs ? h`<div class="panel"><h2 class="panel-titulo">Observaciones</h2><p style="margin:0">${oc.obs}</p></div>` : ''}
        </aside>
      </div>`);
    const recibidos = {};
    if (fc) fc.items.forEach(it => { recibidos[it.productoId] = (recibidos[it.productoId] || 0) + it.cantidad; });
    const cols = [
      { titulo: 'Producto', valor: it => celda(prod(it.productoId).descripcion, prod(it.productoId).codigo + ', ' + prod(it.productoId).unidad) },
      { titulo: 'Pedido', alinear: 'der', valor: it => ui.num(it.cantidad) }
    ];
    if (fc) cols.push({ titulo: 'Recibido', alinear: 'der', valor: it => { const r = recibidos[it.productoId] || 0; return r === it.cantidad ? ui.num(r) : h`<strong class="${r < it.cantidad ? 'cp-rojo' : ''}">${ui.num(r)}</strong>`; } });
    cols.push({ titulo: 'Costo neto', alinear: 'der', valor: it => ui.pesos(it.costo) }, { titulo: 'IVA', alinear: 'der', valor: it => ui.num(it.iva, 1) + ' %' }, { titulo: 'Subtotal neto', alinear: 'der', valor: it => ui.pesos(it.cantidad * it.costo) });
    el.querySelector('[data-items]').appendChild(ui.tabla({ filas: oc.items, columnas: cols }));
    if (rec) {
      const lotes = rec.loteIds.map(lid => App.get('lotes', lid)).filter(Boolean);
      el.querySelector('[data-lotes]').appendChild(ui.tabla({
        filas: lotes, alClic: l => ui.ir('#/stock/producto/' + l.productoId),
        columnas: [
          { titulo: 'Producto', valor: l => prod(l.productoId).descripcion },
          { titulo: 'Lote', clase: 'ocultar-celu', campo: 'lote' },
          { titulo: 'Vence', valor: l => l.vence ? ui.fecha(l.vence) : 'no vence' },
          { titulo: 'Ingresado', alinear: 'der', valor: l => ui.num(l.inicial != null ? l.inicial : l.cantidad) },
          { titulo: 'Existencia', alinear: 'der', valor: l => ui.num(l.cantidad) }
        ]
      }));
    }
    el.querySelector('[data-imprimir]').addEventListener('click', () => ui.imprimir(ordenHTML(oc), { titulo: 'Orden de compra ' + oc.nro }));
    const be = el.querySelector('[data-enviar]');
    if (be) be.addEventListener('click', () => enviarOrden(oc));
    const bc = el.querySelector('[data-cancelar]');
    if (bc) bc.addEventListener('click', () => cancelarOrden(oc));
  }

  // ---------- recepción contra la orden ----------
  function vistaRecibir(el, id) {
    const oc = App.get('ordenesCompra', id);
    if (!oc || oc.estado !== 'pendiente') { vistaOrden(el, id); return; }
    const p = prov(oc.proveedorId), hoy = App.hoy();
    const filas = oc.items.map(it => {
      const pr = prod(it.productoId);
      return { productoId: it.productoId, pedido: it.cantidad, costo: it.costo, iva: it.iva, cantidad: it.cantidad, lote: '', vence: pr.vidaUtil ? F.sumar(hoy, pr.vidaUtil) : '', extra: false };
    });
    el.innerHTML = String(h`${encabezado('Recibir la orden ' + oc.nro, h`Control de la mercadería recibida de ${p.razonSocial}, registro de lote y vencimiento y carga de la factura.`, h`${miga}<a href="#/compras/orden/${oc.id}">Orden ${oc.nro}</a> / Recepción`)}
      <div class="grilla-lado">
        <div class="pila">
          <div class="panel"><h2 class="panel-titulo">Renglones de la orden</h2>
            <p class="nota-discreta" style="margin:-4px 0 12px">Si un producto se recibió en dos lotes con distinto vencimiento, se registra con «Otro lote». Lo no recibido se informa con cantidad 0.</p><div data-tabla></div><div data-avisos style="margin-top:12px"></div></div>
          <div class="panel"><h2 class="panel-titulo">Factura del proveedor</h2><div class="form-grilla">
            <div class="campo"><label for="cp-ftipo">Tipo</label><select id="cp-ftipo"><option value="A">Factura A</option><option value="B">Factura B</option><option value="C">Factura C</option></select></div>
            <div class="campo"><label for="cp-fpv">Punto de venta</label><input id="cp-fpv" inputmode="numeric" maxlength="5" placeholder="0004"></div>
            <div class="campo"><label for="cp-fnum">Número</label><input id="cp-fnum" inputmode="numeric" maxlength="8" placeholder="00012345"></div>
            <div class="campo"><label for="cp-ffecha">Fecha de la factura</label><input type="date" id="cp-ffecha" value="${hoy}"></div>
            <div class="campo"><label for="cp-piibb">Percepción de IIBB</label><input type="number" id="cp-piibb" min="0" step="0.01" placeholder="0,00"><span class="campo-ayuda">Percepción de Rentas Córdoba incluida en la factura. Constituye saldo a favor.</span></div>
            <div class="campo"><label for="cp-piva">Percepción de IVA</label><input type="number" id="cp-piva" min="0" step="0.01" placeholder="0,00"><span class="campo-ayuda">Se descuenta al liquidar el IVA.</span></div>
            <div class="campo"><label for="cp-dep">Depósito de ingreso</label><select id="cp-dep">${ui.opciones(App.db.depositos, 'id', 'nombre', oc.depositoId)}</select></div>
            <div class="campo"><label for="cp-frec">Fecha de recepción</label><input type="date" id="cp-frec" value="${hoy}"></div>
            <label class="check ancho-total"><input type="checkbox" id="cp-actcosto"> Pasar el costo de esta compra a la ficha de cada producto</label>
          </div></div>
        </div>
        <aside class="panel"><h2 class="panel-titulo">Resumen de la recepción</h2><div data-resumen></div>
          <label class="check" style="margin-top:14px" data-reponer-caja hidden><input type="checkbox" data-reponer checked> Generar una orden por los faltantes</label>
          <div class="acciones" style="margin-top:16px"><button type="button" class="btn btn-senal btn-grande" data-confirmar style="flex:1">Confirmar recepción</button></div>
          <p class="nota-discreta" style="margin:10px 0 0">Al confirmar, la mercadería ingresa al stock con su lote, la factura se registra en la cuenta corriente del proveedor y se genera el asiento de compra.</p></aside>
      </div>`);
    const porProducto = () => { const m = {}; filas.forEach(f => { m[f.productoId] = (m[f.productoId] || 0) + (Number(f.cantidad) || 0); }); return m; };
    const faltantes = () => { const m = porProducto(); return oc.items.filter(it => (m[it.productoId] || 0) < it.cantidad).map(it => ({ productoId: it.productoId, cantidad: it.cantidad - (m[it.productoId] || 0), costo: it.costo })); };
    const pintar = () => {
      const t = totales(filas.map(f => ({ cantidad: f.cantidad, costo: f.costo, iva: f.iva })));
      const falta = faltantes(), m = porProducto();
      const sobra = oc.items.filter(it => (m[it.productoId] || 0) > it.cantidad);
      const venceMal = filas.filter(f => f.cantidad > 0 && f.vence && f.vence <= hoy);
      const vencePronto = filas.filter(f => f.cantidad > 0 && f.vence && f.vence > hoy && F.diferencia(hoy, f.vence) < 5);
      const nombres = l => l.map(f => prod(f.productoId).descripcion).join(', ');
      el.querySelector('[data-resumen]').innerHTML = String(h`<dl class="datos" style="margin-bottom:14px"><dt>Total de la orden</dt><dd>${ui.pesos(oc.total)}</dd><dt>Diferencia</dt><dd>${ui.pesos(t.total - oc.total)}</dd></dl>${totalesHTML(t)}`);
      el.querySelector('[data-avisos]').innerHTML = String(h`
        ${falta.length ? h`<div class="aviso aviso-alerta cp-aviso">Faltan ${falta.map(x => ui.num(x.cantidad) + ' de ' + prod(x.productoId).descripcion).join(', ')}. Se carga sólo lo recibido.</div>` : ''}
        ${sobra.length ? h`<div class="aviso aviso-alerta cp-aviso">Se recibió más de lo pedido en ${nombres(sobra)}. Se debe verificar que la factura lo refleje.</div>` : ''}
        ${venceMal.length ? h`<div class="aviso aviso-peligro cp-aviso">${nombres(venceMal)}: fecha de vencimiento cumplida. Se debe corregir la fecha o registrar cantidad 0 para rechazar la mercadería.</div>` : ''}
        ${vencePronto.length ? h`<div class="aviso cp-aviso">${nombres(vencePronto)} vence en menos de 5 días.</div>` : ''}
        ${!falta.length && !sobra.length && !venceMal.length ? h`<div class="aviso aviso-ok cp-aviso">Lo recibido coincide con la orden.</div>` : ''}`);
      el.querySelector('[data-reponer-caja]').hidden = !falta.length;
    };
    const tabla = ui.tabla({
      filas,
      filaClase: f => f.extra ? 'cp-renglon-extra' : '',
      columnas: [
        { titulo: 'Producto', valor: f => f.extra ? h`<span class="celda-sub">Otro lote de ${prod(f.productoId).descripcion}</span>` : celda(prod(f.productoId).descripcion, prod(f.productoId).codigo + ', ' + prod(f.productoId).unidad) },
        { titulo: 'Pedido', alinear: 'der', valor: f => f.extra ? '' : ui.num(f.pedido) },
        { titulo: 'Recibido', alinear: 'der', valor: f => inputNum(f.cantidad, 'cp-cant', v => { f.cantidad = v; pintar(); }, { etiqueta: 'Recibido de ' + prod(f.productoId).descripcion }) },
        { titulo: 'Lote', valor: f => { const i = document.createElement('input'); i.type = 'text'; i.className = 'cp-lote'; i.value = f.lote; i.placeholder = 'Automático'; i.setAttribute('aria-label', 'Lote de ' + prod(f.productoId).descripcion); i.addEventListener('input', () => { f.lote = i.value.trim(); }); return i; } },
        { titulo: 'Vence', valor: f => { if (!prod(f.productoId).vidaUtil && !f.vence) return 'no vence'; const i = document.createElement('input'); i.type = 'date'; i.className = 'cp-vence'; i.value = f.vence; i.setAttribute('aria-label', 'Vencimiento de ' + prod(f.productoId).descripcion); i.addEventListener('change', () => { f.vence = i.value; pintar(); }); return i; } },
        { titulo: 'Costo neto', alinear: 'der', valor: f => ui.pesos(f.costo) },
        { titulo: '', clase: 'ocultar-celu', valor: f => {
          const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-fantasma btn-chico';
          if (f.extra) { b.textContent = 'Quitar'; b.addEventListener('click', () => { filas.splice(filas.indexOf(f), 1); tabla.actualizar(filas); pintar(); }); }
          else { b.textContent = 'Otro lote'; b.addEventListener('click', () => { filas.splice(filas.indexOf(f) + 1, 0, Object.assign({}, f, { cantidad: 0, lote: '', extra: true })); tabla.actualizar(filas); pintar(); }); }
          return b;
        } }
      ]
    });
    el.querySelector('[data-tabla]').appendChild(tabla);
    pintar();
    el.querySelector('[data-confirmar]').addEventListener('click', () => {
      el.querySelectorAll('[aria-invalid]').forEach(c => c.removeAttribute('aria-invalid'));
      const marcarError = (sel, msg) => { const c = el.querySelector(sel); c.setAttribute('aria-invalid', 'true'); c.focus(); ui.toast(msg, 'peligro'); };
      const pv = el.querySelector('#cp-fpv').value.replace(/\D/g, ''), num = el.querySelector('#cp-fnum').value.replace(/\D/g, '');
      if (!pv) return marcarError('#cp-fpv', 'Falta el punto de venta de la factura del proveedor.');
      if (!num) return marcarError('#cp-fnum', 'Falta el número de la factura del proveedor.');
      const numero = pv.padStart(4, '0') + '-' + num.padStart(8, '0');
      const tipo = el.querySelector('#cp-ftipo').value;
      if (App.db.comprasFacturas.some(f => f.proveedorId === oc.proveedorId && f.numero === numero && f.tipo === tipo)) return marcarError('#cp-fnum', 'La factura ' + tipo + ' ' + numero + ' de este proveedor ya está cargada.');
      if (filas.some(f => f.cantidad < 0)) { ui.toast('Las cantidades recibidas no pueden ser negativas.', 'peligro'); return; }
      if (filas.some(f => f.cantidad > 0 && f.vence && f.vence <= hoy)) { ui.toast('Hay mercadería con fecha de vencimiento cumplida: se debe corregir la fecha o registrar cantidad 0.', 'peligro'); return; }
      const reponer = !el.querySelector('[data-reponer-caja]').hidden && el.querySelector('[data-reponer]').checked ? faltantes() : [];
      const fc = App.intentar(() => App.acciones.recibirCompra(oc.id, {
        depositoId: el.querySelector('#cp-dep').value, fecha: el.querySelector('#cp-frec').value || hoy,
        lotes: filas.filter(f => f.cantidad > 0).map(f => ({ productoId: f.productoId, cantidad: Number(f.cantidad), lote: f.lote || undefined, vence: f.vence || undefined })),
        factura: { tipo, numero, fecha: el.querySelector('#cp-ffecha').value || hoy, percepcionIIBB: Number(el.querySelector('#cp-piibb').value) || 0, percepcionIVA: Number(el.querySelector('#cp-piva').value) || 0 },
        actualizarCosto: el.querySelector('#cp-actcosto').checked
      }), r => 'Mercadería recibida: factura ' + r.tipo + ' ' + r.numero + ' cargada');
      if (!fc) return;
      if (reponer.length) App.intentar(() => App.acciones.crearOrdenCompra({ proveedorId: oc.proveedorId, depositoId: oc.depositoId, items: reponer, obs: 'Faltante de la orden ' + oc.nro }), o => 'Orden ' + o.nro + ' generada por los faltantes');
      ui.ir('#/compras/orden/' + oc.id);
    });
  }

  // ---------- historial de costos de un producto ----------
  function graficoCostos(compras, ficha) {
    const W = 960, H = 220, ml = 96, mr = 14, mt = 14, mb = 26;
    let min = Math.min(ficha, ...compras.map(c => c.costo)), max = Math.max(ficha, ...compras.map(c => c.costo));
    if (max - min < max * 0.04) { const m = (max + min) / 2; min = m * 0.9; max = m * 1.1; }
    const t0 = Date.parse(compras[0].fecha), t1 = Math.max(t0 + 86400000, Date.parse(App.hoy()));
    const x = f => ml + (Date.parse(f) - t0) / (t1 - t0) * (W - ml - mr);
    const y = v => mt + (1 - (v - min) / (max - min)) * (H - mt - mb);
    let d = '';
    compras.forEach((c, i) => { d += i ? 'H' + x(c.fecha).toFixed(1) + 'V' + y(c.costo).toFixed(1) : 'M' + x(c.fecha).toFixed(1) + ' ' + y(c.costo).toFixed(1); });
    d += 'H' + x(App.hoy()).toFixed(1);
    const marcas = [min, (min + max) / 2, max];
    return h`<svg class="cp-grafico" viewBox="0 0 ${W} ${H}" role="img" aria-label="Costo unitario en cada compra desde el ${ui.fecha(compras[0].fecha)}">
      ${marcas.map(v => h`<line class="cp-eje" x1="${ml}" x2="${W - mr}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/><text x="${ml - 8}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end">${ui.pesos(Math.round(v))}</text>`)}
      <line class="cp-ficha" x1="${ml}" x2="${W - mr}" y1="${y(ficha).toFixed(1)}" y2="${y(ficha).toFixed(1)}"/>
      <path class="cp-linea" d="${d}"/>
      ${compras.slice(-14).map(c => h`<circle class="cp-punto" cx="${x(c.fecha).toFixed(1)}" cy="${y(c.costo).toFixed(1)}" r="3.5"><title>${ui.fecha(c.fecha)}: ${ui.pesos(c.costo)}</title></circle>`)}
      <text x="${ml}" y="${H - 6}">${ui.fecha(compras[0].fecha)}</text><text x="${W - mr}" y="${H - 6}" text-anchor="end">hoy</text>
    </svg>`;
  }

  function vistaCostoProducto(el, id) {
    const p = App.get('productos', id);
    if (!p) { el.innerHTML = String(noEncontrada('No se encontró el producto')); return; }
    const compras = comprasDe(p.id);
    const ult = compras[compras.length - 1];
    const unidades = compras.reduce((s, c) => s + c.cantidad, 0);
    const promedio = unidades ? compras.reduce((s, c) => s + c.costo * c.cantidad, 0) / unidades : 0;
    const precio = App.q.precio(p.id, 'L2');
    const distinto = !!ult && Math.abs(ult.costo - p.costo) > 0.5;
    el.innerHTML = String(h`${encabezado(p.descripcion, h`${p.marca}, ${p.unidad.toLowerCase()}. Proveedor: ${prov(p.proveedorId).razonSocial}.`, h`${miga}Historial de costos`,
      h`<a class="btn btn-secundario" href="#/stock/producto/${p.id}">Ver stock</a><a class="btn btn-secundario" href="#/compras/nueva/${p.proveedorId}">Nueva orden a este proveedor</a>${distinto ? h`<button type="button" class="btn btn-senal" data-actualizar>Actualizar costo de ficha</button>` : ''}`)}
      ${ui.franjaKpi([
        { titulo: 'Costo de ficha', valor: ui.pesos(p.costo), detalle: 'Neto de IVA, por ' + p.unidad.toLowerCase() },
        { titulo: 'Última compra', valor: ult ? ui.pesos(ult.costo) : '—', detalle: ult ? ui.fecha(ult.fecha) + (distinto ? ', distinto de la ficha' : ', igual a la ficha') : 'Sin compras', tono: distinto ? 'alerta' : null },
        { titulo: 'Costo promedio', valor: unidades ? ui.pesos(promedio) : '—', detalle: ui.num(unidades) + ' unidades en ' + compras.length + ' compras' },
        { titulo: 'Margen en lista Almacén', valor: ui.porcentaje(precio ? (precio - p.costo) / precio : 0), detalle: 'Precio neto ' + ui.pesos(precio) }
      ])}
      <div class="seccion panel"><h2 class="panel-titulo">Costo en cada compra</h2>${compras.length ? graficoCostos(compras, p.costo) : h`<div class="vacio">El producto no registra compras.</div>`}
        <p class="nota-discreta" style="margin:6px 0 0">La línea punteada indica el costo de ficha, base para la valorización del stock y la sugerencia de órdenes.</p></div>
      <div class="seccion"><h2 class="seccion-titulo">Compras de este producto</h2><div data-tabla></div></div>`);
    const filas = compras.slice().reverse().map((c, i, arr) => Object.assign({}, c, { anterior: arr[i + 1] ? arr[i + 1].costo : null }));
    el.querySelector('[data-tabla]').appendChild(ui.tabla({
      filas, limite: 25, vacio: 'Sin compras.',
      alClic: c => { if (c.factura.ordenId) ui.ir('#/compras/orden/' + c.factura.ordenId); },
      columnas: [
        { titulo: 'Fecha', campo: 'fecha', valor: c => ui.fecha(c.fecha) },
        { titulo: 'Factura', clase: 'ocultar-celu', valor: c => 'Factura ' + c.factura.tipo + ' ' + c.factura.numero },
        { titulo: 'Proveedor', clase: 'ocultar-celu', valor: c => prov(c.proveedorId).razonSocial },
        { titulo: 'Cantidad', alinear: 'der', campo: 'cantidad', valor: c => ui.num(c.cantidad) },
        { titulo: 'Costo unitario', alinear: 'der', campo: 'costo', valor: c => ui.pesos(c.costo) },
        { titulo: 'Cambio', clase: 'ocultar-celu', alinear: 'der', valor: c => c.anterior == null || Math.abs(c.costo - c.anterior) < 0.5 ? '—' : h`<strong class="${c.costo > c.anterior ? 'cp-rojo' : 'ok'}">${c.costo > c.anterior ? '+' : ''}${ui.porcentaje(c.costo / c.anterior - 1)}</strong>` },
        { titulo: 'Subtotal', alinear: 'der', campo: 'subtotal', valor: c => ui.pesos(c.subtotal) }
      ]
    }));
    const b = el.querySelector('[data-actualizar]');
    if (b) b.addEventListener('click', async () => {
      const ok = await ui.confirmar('El costo de ficha de «' + p.descripcion + '» pasa de ' + ui.pesos(p.costo) + ' a ' + ui.pesos(ult.costo) + '. Los precios de venta no se modifican; pueden actualizarse desde Stock.', { titulo: 'Actualizar costo de ficha', aceptar: 'Actualizar costo de ficha' });
      if (ok) App.intentar(() => App.acciones.guardarMaestro('productos', { id: p.id, costo: ult.costo }), 'Costo de ficha actualizado');
    });
  }

  App.modulo({
    id: 'compras',
    titulo: 'Compras',
    grupo: 'Logística',
    orden: 30,
    icono: '<svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7l7-4 7 4-7 4z"/><path d="M3 7v6l7 4 7-4V7"/><path d="M10 11v6"/></svg>',
    contador: () => App.q.bajoMinimo().length || '',
    render(el, params) {
      estilos();
      const [sub, id] = params || [];
      if (sub === 'nueva') return vistaNueva(el, id);
      if (sub === 'orden' && id) return vistaOrden(el, id);
      if (sub === 'recibir' && id) return vistaRecibir(el, id);
      if (sub === 'costos' && id) return vistaCostoProducto(el, id);
      return vistaInicio(el);
    }
  });
})();
