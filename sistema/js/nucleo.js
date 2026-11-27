/* MyM Distribuidoras: núcleo del sistema (nació de la demo de la distribuidora).
   En el sistema real los movimientos se guardan en Firebase (js/nube.js define App.persistencia);
   sin App.persistencia se comporta como la demo, con localStorage.
   window.App = store + acciones de negocio + consultas + router + utilidades de UI + registro de módulos.
   Los módulos NO tocan App.db a mano: usan App.acciones.*, que mantienen coherentes stock, cuentas corrientes
   y asientos, y avisan con App.emit('cambio').
   Persistencia: se guarda en localStorage (clave CONFIG.clave) sólo el registro de acciones que hizo la persona;
   al abrir, se regenera la semilla (determinística, < 1 s) y se vuelven a aplicar esas acciones. */
(function () {
  'use strict';
  const S = window.SEMILLA;
  const CONFIG = S.config;

  const COLECCIONES = ['productos', 'depositos', 'lotes', 'clientes', 'proveedores', 'preventistas', 'choferes', 'vehiculos',
    'pedidos', 'comprobantes', 'remitos', 'hojasRuta', 'recibos', 'cheques', 'ordenesCompra', 'comprasFacturas', 'pagos',
    'movCtaCte', 'asientos', 'planCuentas', 'ajustesStock', 'listasPrecio', 'aumentosPrecio', 'visitas', 'liquidacionesComision', 'recetas', 'ordenesProduccion'];

  const CUENTAS = {
    caja: '1.1.01', banco: '1.1.02', valores: '1.1.03', deudores: '1.1.04', ivaCF: '1.1.05', mercaderias: '1.1.06',
    rodados: '1.2.01', instalaciones: '1.2.02',
    proveedores: '2.1.01', ivaDF: '2.1.02', sueldosAPagar: '2.1.03', iibbAPagar: '2.1.04', gananciasAPagar: '2.1.05', acreedores: '2.1.06',
    anticiposGanancias: '1.1.07', percepcionesIIBB: '1.1.08', percepcionesIVA: '1.1.09',
    chequesDiferidos: '2.1.07', cargasAPagar: '2.1.08', provisionSAC: '2.1.09', comisionesAPagar: '2.1.10',
    cargasReparto: '5.2.06', cargasAdministracion: '5.3.05',
    capital: '3.1.01', resultadosNoAsignados: '3.1.02',
    ventas: '4.1.01', devoluciones: '4.1.02', cmv: '5.1.01', diferenciasInventario: '5.1.02',
    sueldosReparto: '5.2.01', comisiones: '5.2.02', combustible: '5.2.03', fletes: '5.2.04', mantenimiento: '5.2.05',
    sueldosAdministracion: '5.3.01', alquiler: '5.3.02', servicios: '5.3.03', honorarios: '5.3.04',
    comisionesBancarias: '5.4.01', impuestoDebitosCreditos: '5.4.02', iibb: '5.5.01', ganancias: '5.6.01'
  };

  const App = window.App = {
    config: CONFIG, CUENTAS, db: null, acciones: {}, q: {}, ui: {}, f: {}, modulos: [],
    tiempoGeneracion: 0
  };

  // ---------- números ----------
  const r2 = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
  App.r2 = r2;
  // las cantidades se guardan con 4 decimales: una unidad suelta de un bulto x 24 es 0,0417 bulto; un pesable va en kilos
  const rq = n => Math.round((Number(n) + Number.EPSILON) * 10000) / 10000;
  App.rq = rq;
  const pad = (n, l) => String(n).padStart(l, '0');

  // ---------- fechas (ISO 'aaaa-mm-dd', en UTC para no depender del huso) ----------
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const DIAS_LARGO = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const aUTC = iso => { const [y, m, d] = iso.slice(0, 10).split('-').map(Number); return Date.UTC(y, m - 1, d); };
  const deUTC = t => new Date(t).toISOString().slice(0, 10);
  let hoyActual = CONFIG.hoy;
  const F = App.f = {
    hoy: () => hoyActual,
    sumar: (iso, dias) => deUTC(aUTC(iso) + dias * 86400000),
    diferencia: (desde, hasta) => Math.round((aUTC(hasta) - aUTC(desde)) / 86400000),
    diaSemana: iso => new Date(aUTC(iso)).getUTCDay(),
    nombreDia: iso => DIAS_LARGO[new Date(aUTC(iso)).getUTCDay()],
    mes: iso => iso.slice(0, 7),
    inicioMes: iso => iso.slice(0, 7) + '-01',
    finMes: iso => { const [y, m] = iso.split('-').map(Number); return deUTC(Date.UTC(y, m, 0)); },
    diasDelMes: iso => { const [y, m] = iso.split('-').map(Number); return new Date(Date.UTC(y, m, 0)).getUTCDate(); },
    nombreMes: iso => MESES[Number(iso.slice(5, 7)) - 1] + ' ' + iso.slice(0, 4),
    nombreMesCorto: iso => MESES[Number(iso.slice(5, 7)) - 1].slice(0, 3),
    meses: (desde, hasta) => { const r = []; let m = desde.slice(0, 7); while (m <= hasta.slice(0, 7)) { r.push(m); const [y, mm] = m.split('-').map(Number); m = mm === 12 ? (y + 1) + '-01' : y + '-' + pad(mm + 1, 2); } return r; },
    digitoEAN: S.util.digitoEAN,
    eanValido: ean => /^\d{13}$/.test(ean) && S.util.digitoEAN(ean.slice(0, 12)) === ean[12]
  };
  App.hoy = F.hoy;
  App._fijarHoy = d => { hoyActual = d; };

  // ---------- eventos ----------
  const oyentes = {};
  App.on = (ev, fn) => { (oyentes[ev] = oyentes[ev] || []).push(fn); return () => { oyentes[ev] = oyentes[ev].filter(f => f !== fn); }; };
  App.emit = (ev, dato) => { (oyentes[ev] || []).slice().forEach(fn => { try { fn(dato); } catch (e) { console.error(e); } }); };
  let cambioPendiente = false;
  function avisarCambio() {
    if (generando || cambioPendiente) return;
    cambioPendiente = true;
    Promise.resolve().then(() => { cambioPendiente = false; App.emit('cambio'); });
  }

  // ---------- store e índices ----------
  let db = null, idx = null, generando = false, profundidad = 0, registro = [];
  function reindexar() {
    idx = { porId: {}, lotes: {}, reservado: {} };
    COLECCIONES.forEach(col => { const m = new Map(); db[col].forEach(o => m.set(o.id, o)); idx.porId[col] = m; });
    db.lotes.forEach(l => { if (l.cantidad > 0) (idx.lotes[l.productoId] = idx.lotes[l.productoId] || []).push(l); });
    db.pedidos.forEach(p => { if (p.estado === 'pendiente') p.items.forEach(it => reservar(it.productoId, p.depositoId, it.cantidad)); });
  }
  function insertar(col, obj) { db[col].push(obj); idx.porId[col].set(obj.id, obj); return obj; }
  let claveAccion = null, subId = 0;
  function nuevoId(pref) {
    if (claveAccion) { subId++; return pref + claveAccion + subId.toString(36); }
    db.contadores.id++; return pref + db.contadores.id.toString(36).padStart(5, '0');
  }
  App.claveNueva = () => { let k = ''; const c = '0123456789abcdefghijklmnopqrstuvwxyz'; const a = new Uint32Array(10); crypto.getRandomValues(a); a.forEach(x => { k += c[x % 36]; }); return k; };
  function siguiente(tipo) { db.contadores[tipo] = (db.contadores[tipo] || 0) + 1; return db.contadores[tipo]; }
  const nroCompleto = (pv, n) => pad(pv, 4) + '-' + pad(n, 8);
  function reservar(prod, dep, cant) { const k = prod + '|' + dep; idx.reservado[k] = rq((idx.reservado[k] || 0) + cant); }
  App.get = (col, id) => (idx && idx.porId[col] ? idx.porId[col].get(id) : null) || null;
  const exigir = (col, id, nombre) => { const o = App.get(col, id); if (!o) throw new Error('No se encontró ' + nombre + ' (' + id + ').'); return o; };

  function crearLote({ productoId, depositoId, cantidad, costo, lote, vence, ingreso, origen }) {
    const l = insertar('lotes', { id: nuevoId('lt'), productoId, depositoId, lote: lote || ('L' + hoyActual.slice(2).replace(/-/g, '')), vence: vence || null,
      cantidad: rq(cantidad), inicial: rq(cantidad), costo: r2(costo), ingreso: ingreso || hoyActual, origen: origen || 'compra' });
    if (l.cantidad > 0) (idx.lotes[productoId] = idx.lotes[productoId] || []).push(l);
    return l;
  }
  App._crearLote = crearLote;   // sólo para la semilla (existencia inicial)
  function moverLote(l, delta) {
    const antes = l.cantidad;
    l.cantidad = rq(l.cantidad + delta);
    if (antes <= 0 && l.cantidad > 0) { const arr = idx.lotes[l.productoId] = idx.lotes[l.productoId] || []; if (!arr.includes(l)) arr.push(l); }
  }
  const ordenFEFO = (a, b) => (a.vence || '9999') < (b.vence || '9999') ? -1 : (a.vence || '9999') > (b.vence || '9999') ? 1 : (a.ingreso < b.ingreso ? -1 : a.ingreso > b.ingreso ? 1 : 0);
  function lotesActivos(productoId, depositoId) {
    let arr = idx.lotes[productoId] || [];
    if (arr.some(l => l.cantidad <= 0)) { arr = arr.filter(l => l.cantidad > 0); idx.lotes[productoId] = arr; }
    return arr.filter(l => !depositoId || l.depositoId === depositoId).sort(ordenFEFO);
  }
  // plan de consumo FEFO: no toca nada, sólo calcula
  function planFEFO(productoId, depositoId, cantidad, incluirVencidos) {
    const hoy = hoyActual;
    let falta = cantidad;
    const plan = [];
    for (const l of lotesActivos(productoId, depositoId)) {
      if (!incluirVencidos && l.vence && l.vence < hoy) continue;
      const toma = Math.min(l.cantidad, falta);
      if (toma > 0) { plan.push({ lote: l, cantidad: rq(toma) }); falta = rq(falta - toma); }
      if (falta <= 0) break;
    }
    return { plan, falta };
  }

  // ---------- asientos ----------
  function asentar({ fecha, detalle, origen, refId, lineas }) {
    const ls = lineas.map(l => ({ cuenta: l.cuenta, debe: r2(l.debe || 0), haber: r2(l.haber || 0) })).filter(l => l.debe > 0 || l.haber > 0);
    const d = r2(ls.reduce((s, l) => s + l.debe, 0)), h = r2(ls.reduce((s, l) => s + l.haber, 0));
    if (Math.abs(d - h) > 0.01) throw new Error('El asiento no balancea: debe ' + d + ' y haber ' + h + '.');
    if (ls.length < 2) throw new Error('El asiento necesita al menos dos líneas.');
    ls.forEach(l => {
      const c = App.get('planCuentas', l.cuenta);
      if (!c) throw new Error('La cuenta ' + l.cuenta + ' no existe en el plan de cuentas.');
      if (!c.imputable) throw new Error('La cuenta ' + l.cuenta + ' (' + c.nombre + ') es de título: se debe seleccionar una cuenta imputable.');
    });
    const n = siguiente('AS');
    return insertar('asientos', { id: nuevoId('as'), numero: n, fecha: fecha || hoyActual, detalle, origen: origen || 'manual', refId: refId || null, lineas: ls, total: d });
  }
  function movCta(entidad, entidadId, { fecha, tipo, comprobante, refId, debe, haber, detalle }) {
    return insertar('movCtaCte', { id: nuevoId('mc'), entidad, entidadId, fecha, tipo, comprobante, refId, detalle: detalle || '', debe: r2(debe || 0), haber: r2(haber || 0) });
  }
  const NOMBRE_TIPO = { FA: 'Factura A', FB: 'Factura B', NCA: 'Nota de crédito A', NCB: 'Nota de crédito B', RC: 'Recibo', R: 'Remito', FC: 'Factura de compra', OP: 'Orden de pago' };
  App.nombreTipo = t => NOMBRE_TIPO[t] || t;

  // presentaciones de venta: el stock siempre está en la unidad base del producto (el bulto, o el kilo en los pesables);
  // cada presentación dice cuántas unidades base lleva (factor) y si tiene recargo por fraccionar (en %)
  function presentaciones(p) {
    if (!p) return [];
    if (p.presentaciones && p.presentaciones.length) return p.presentaciones;
    const r = [{ id: 'b', nombre: p.unidad, factor: 1, recargo: 0 }];
    if (p.contenido > 1) {
      if (p.contenido >= 12 && p.contenido % 6 === 0) r.push({ id: 'pk', nombre: 'Pack x 6', factor: 6 / p.contenido, recargo: 4 });
      r.push({ id: 'u', nombre: 'Unidad', factor: 1 / p.contenido, recargo: 8 });
    }
    return r;
  }
  App.presentaciones = presentaciones;
  App.presentacionDe = (p, id) => { const ps = presentaciones(p); return ps.find(x => x.id === id) || ps[0]; };
  // texto de la cantidad de un renglón: «3 cajas x 12», «2,350 kg», «5 unidades»
  App.cantidadTexto = it => {
    const p = App.get('productos', it.productoId);
    if (it.pres) return App.ui.num(it.pres.cantidad, it.pres.cantidad % 1 ? (p && p.pesable && it.pres.id === 'kg' ? 3 : 2) : 0) + ' × ' + it.pres.nombre.toLowerCase();
    return App.ui.num(it.cantidad, it.cantidad % 1 ? 2 : 0);
  };
  // subtotal de un renglón: con presentación se cobra por presentación (así 1 unidad cuesta lo que dice la lista, sin centavos de más)
  function subtotalItem(it) {
    if (it.pres && it.pres.factor !== 1) return r2(it.pres.cantidad * r2(precioNeto(it) * it.pres.factor));
    return r2(it.cantidad * precioNeto(it));
  }
  App.subtotalItem = subtotalItem;
  function totalesItems(items) {
    let neto21 = 0, neto105 = 0;
    items.forEach(it => { const s = subtotalItem(it); if (it.iva === 10.5) neto105 += s; else neto21 += s; });
    neto21 = r2(neto21); neto105 = r2(neto105);
    const iva21 = r2(neto21 * 0.21), iva105 = r2(neto105 * 0.105);
    const neto = r2(neto21 + neto105), iva = r2(iva21 + iva105);
    return { neto21, neto105, neto, iva21, iva105, iva, total: r2(neto + iva) };
  }
  // precio unitario con la bonificación del renglón aplicada (bonif en %)
  function precioNeto(it) { return it.bonif ? r2(it.precio * (1 - it.bonif / 100)) : it.precio; }
  App.precioNeto = precioNeto;
  // bonificación por cantidad según la escala del producto: [{ desde: bultos, pct }]
  function bonifEscala(p, cant) {
    let b = 0;
    (p.escalaBonif || []).forEach(e => { if (cant >= e.desde && e.pct > b) b = e.pct; });
    return b;
  }
  App.bonifEscala = bonifEscala;
  function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  // ---------- acciones ----------
  function accion(nombre, fn) {
    App.acciones[nombre] = function (...args) {
      const copia = profundidad === 0 && !generando ? JSON.parse(JSON.stringify(args)) : null;
      // permisos: el dueño decide qué puede hacer cada usuario (js/nube.js define App.permiso)
      if (copia && App.permiso && !App.permiso(nombre)) throw new Error('Tu usuario no tiene permiso para ' + (App.nombreAccion ? App.nombreAccion(nombre).toLowerCase() : nombre) + '. Pedíselo al dueño.');
      // si otra pestaña guardó cambios que esta no vio, se suman antes de seguir (así no se pisan); en la nube lo resuelve js/nube.js
      if (copia && preparado && !App.persistencia) { const otro = leerRegistro(); if (otro.length > registro.length) { registro = otro; generar(); } }
      const k = copia && App.persistencia ? App.claveNueva() : null;
      if (copia) { claveAccion = k; subId = 0; }
      profundidad++;
      let res;
      try { res = fn.apply(null, args); } finally { profundidad--; if (copia) claveAccion = null; }
      if (profundidad === 0) {
        if (copia) { const r = { a: nombre, args: copia, f: hoyActual }; if (k) r.k = k; registro.push(r); guardar(r, res); }
        avisarCambio();
      }
      return res;
    };
  }

  accion('crearPedido', function ({ clienteId, preventistaId, items, origen, obs, fecha, depositoId }) {
    const c = exigir('clientes', clienteId, 'el cliente');
    if (!items || !items.length) throw new Error('El pedido debe incluir al menos un producto.');
    const dep = depositoId || c.depositoId;
    const juntos = {};
    items.forEach(it => {
      const p = exigir('productos', it.productoId, 'el producto');
      const r = renglon(p, it, c.listaId, null);
      if (!juntos[p.id]) juntos[p.id] = r;
      else unirRenglon(juntos[p.id], r);
    });
    const lista = Object.values(juntos);
    lista.forEach(it => {
      if (it.bonif == null) it.bonif = bonifEscala(App.get('productos', it.productoId), it.cantidad);
      if (!(it.bonif >= 0 && it.bonif < 100)) throw new Error('La bonificación tiene que estar entre 0 y 99 %.');
      it.bonif = r2(it.bonif);
    });
    const sinStock = lista.filter(it => App.q.stock(it.productoId, dep).disponible < it.cantidad);
    if (sinStock.length) {
      throw new Error('No hay stock disponible de ' + sinStock.map(it => '«' + App.get('productos', it.productoId).descripcion + '» (quedan ' + App.q.stock(it.productoId, dep).disponible + ')').join(', ') + '.');
    }
    const tot = totalesItems(lista);
    const alertas = [];
    if (App.q.saldoCliente(c.id) + tot.total > c.limiteCredito) alertas.push('Con este pedido se excede el límite de crédito de ' + App.ui.pesos(c.limiteCredito) + '.');
    const n = siguiente('PE');
    const p = insertar('pedidos', {
      id: nuevoId('pe'), numero: n, nro: pad(n, 6), fecha: fecha || hoyActual, clienteId: c.id, preventistaId: preventistaId || c.preventistaId,
      depositoId: dep, listaId: c.listaId, origen: origen || 'preventa', obs: obs || '', estado: 'pendiente', items: lista,
      neto: tot.neto, iva: tot.iva, total: tot.total, alertas, comprobanteId: null
    });
    lista.forEach(it => reservar(it.productoId, dep, it.cantidad));
    return p;
  });

  // un renglón de pedido a partir de lo que carga la persona: { productoId, cantidad (en la presentación), presentacion, precio?, bonif? }
  function renglon(p, it, listaId, previo) {
    const cantPres = Number(it.cantidad);
    if (!(cantPres > 0)) throw new Error('Las cantidades tienen que ser mayores que cero.');
    const pr = App.presentacionDe(p, it.presentacion || (previo && previo.pres ? previo.pres.id : null));
    if (!p.pesable || pr.id !== 'kg') { if (pr.factor !== 1 && cantPres % 1) throw new Error('De «' + p.descripcion + '» se venden ' + pr.nombre.toLowerCase() + ' enteras: usá una cantidad sin decimales.'); }
    const mismoPrecio = previo && (previo.pres ? previo.pres.id : 'b') === pr.id;
    const precio = it.precio != null && it.precio !== '' ? r2(it.precio) : (mismoPrecio ? previo.precio : r2(App.q.precio(p.id, listaId) * (1 + (pr.recargo || 0) / 100)));
    const conPres = p.presentaciones && p.presentaciones.length ? true : pr.id !== 'b';
    return { productoId: p.id, cantidad: rq(cantPres * pr.factor), precio, iva: p.iva, bonif: it.bonif != null && it.bonif !== '' ? Number(it.bonif) : null,
      pres: conPres ? { id: pr.id, nombre: pr.nombre, factor: pr.factor, cantidad: cantPres } : null };
  }
  // el mismo producto en dos presentaciones se une en la unidad base
  function unirRenglon(a, b) {
    if (a.pres && b.pres && a.pres.id === b.pres.id) a.pres.cantidad = rq(a.pres.cantidad + b.pres.cantidad);
    else { a.pres = null; a.precio = r2((a.cantidad * a.precio + b.cantidad * b.precio) / (a.cantidad + b.cantidad)); }
    a.cantidad = rq(a.cantidad + b.cantidad);
  }

  accion('modificarPedido', function (pedidoId, { items, obs }) {
    const p = exigir('pedidos', pedidoId, 'el pedido');
    if (p.estado !== 'pendiente') throw new Error('Sólo se puede modificar un pedido pendiente.');
    const c = App.get('clientes', p.clienteId);
    const juntos = {};
    (items || []).forEach(it => {
      const cant = Number(it.cantidad);
      if (!(cant > 0)) return;
      const prod = exigir('productos', it.productoId, 'el producto');
      const previo = p.items.find(x => x.productoId === prod.id);
      const r = renglon(prod, it, c.listaId, previo);
      r.previoBonif = previo ? previo.bonif || 0 : null; r.previoCant = previo ? previo.cantidad : null;
      if (!juntos[prod.id]) juntos[prod.id] = r; else unirRenglon(juntos[prod.id], r);
    });
    const lista = Object.values(juntos);
    lista.forEach(it => {
      // si no se indica, se mantiene la del pedido salvo que cambie la cantidad (entonces manda la escala)
      if (it.bonif == null) it.bonif = it.previoCant === it.cantidad ? it.previoBonif : bonifEscala(App.get('productos', it.productoId), it.cantidad);
      if (!(it.bonif >= 0 && it.bonif < 100)) throw new Error('La bonificación tiene que estar entre 0 y 99 %.');
      it.bonif = r2(it.bonif); delete it.previoBonif; delete it.previoCant;
    });
    if (!lista.length) throw new Error('El pedido quedó sin productos. Si no corresponde, debe cancelarse.');
    for (const it of lista) {
      const propio = (p.items.find(x => x.productoId === it.productoId) || { cantidad: 0 }).cantidad;
      if (App.q.stock(it.productoId, p.depositoId).disponible + propio < it.cantidad) throw new Error('No hay stock disponible de «' + App.get('productos', it.productoId).descripcion + '».');
    }
    p.items.forEach(it => reservar(it.productoId, p.depositoId, -it.cantidad));
    p.items = lista;
    lista.forEach(it => reservar(it.productoId, p.depositoId, it.cantidad));
    Object.assign(p, totalesItems(lista), { obs: obs != null ? obs : p.obs });
    delete p.neto21; delete p.neto105; delete p.iva21; delete p.iva105;
    return p;
  });

  // pedido facturado que todavía no salió a reparto ni tiene cobranzas: se anula la factura con una nota de crédito
  // (vuelve el stock y se acredita la cuenta corriente) y se factura el pedido corregido
  App.q.puedeModificarFacturado = (pedidoId) => {
    const p = App.get('pedidos', pedidoId);
    if (!p || p.estado !== 'facturado') return { ok: false, motivo: 'El pedido no está facturado.' };
    const f = App.get('comprobantes', p.comprobanteId), rem = App.get('remitos', p.remitoId);
    if (rem && rem.estado !== 'pendiente') return { ok: false, motivo: 'El remito ya salió en una hoja de ruta: para quitar productos, hacé una nota de crédito desde la factura.' };
    if (f && (f.cobrado > 0.01 || (f.ncIds || []).length)) return { ok: false, motivo: 'La factura ya tiene cobranzas o notas de crédito: los cambios van por nota de crédito.' };
    return { ok: true };
  };
  accion('modificarPedidoFacturado', function (pedidoId, { items, obs }) {
    const chequeo = App.q.puedeModificarFacturado(pedidoId);
    if (!chequeo.ok) throw new Error(chequeo.motivo);
    const p = App.get('pedidos', pedidoId);
    const f = App.get('comprobantes', p.comprobanteId), rem = App.get('remitos', p.remitoId);
    const lista = (items || []).filter(it => Number(it.cantidad) > 0).map(it => {
      const previo = p.items.find(x => x.productoId === it.productoId);
      const nuevo = Object.assign({}, it);
      if (nuevo.precio == null && previo && (!it.presentacion || (previo.pres ? previo.pres.id : 'b') === it.presentacion)) nuevo.precio = previo.precio;
      return nuevo;
    });
    if (!lista.length) throw new Error('El pedido quedó sin productos. Si no corresponde, hacé una nota de crédito por el total.');
    const nc = App.acciones.notaCredito(f.id, null, 'Modificación del pedido ' + p.nro);
    if (rem) rem.estado = 'anulado';
    p.estado = 'modificado';
    const nuevo = App.acciones.crearPedido({ clienteId: p.clienteId, preventistaId: p.preventistaId, items: lista, origen: p.origen, obs: obs != null ? obs : p.obs, depositoId: p.depositoId });
    nuevo.reemplazaA = p.id;
    p.reemplazadoPor = nuevo.id; p.ncModificacionId = nc.id;
    const fc = App.acciones.facturarPedido(nuevo.id);
    return { pedido: nuevo, factura: fc, nc };
  });

  accion('cancelarPedido', function (pedidoId, motivo) {
    const p = exigir('pedidos', pedidoId, 'el pedido');
    if (p.estado !== 'pendiente') throw new Error('Sólo se puede cancelar un pedido pendiente.');
    p.items.forEach(it => reservar(it.productoId, p.depositoId, -it.cantidad));
    p.estado = 'cancelado'; p.motivoCancelacion = motivo || '';
    return p;
  });

  accion('facturarPedido', function (pedidoId, opciones) {
    const fecha = (opciones && opciones.fecha) || hoyActual;
    const p = exigir('pedidos', pedidoId, 'el pedido');
    if (p.estado !== 'pendiente') throw new Error('El pedido ' + p.nro + ' ya está ' + p.estado + '.');
    const c = App.get('clientes', p.clienteId);
    // primero se calcula todo; si falta algo no se toca nada
    const planes = p.items.map(it => {
      const pl = planFEFO(it.productoId, p.depositoId, it.cantidad, false);
      if (pl.falta > 0) throw new Error('No alcanza el stock sin vencer de «' + App.get('productos', it.productoId).descripcion + '» en ' + App.get('depositos', p.depositoId).nombre + '.');
      return pl.plan;
    });
    const letra = c.condicionIVA === 'RI' ? 'A' : 'B';
    const tipo = 'F' + letra;
    const consumos = [];
    let costo = 0;
    planes.forEach((plan, i) => plan.forEach(({ lote, cantidad }) => {
      moverLote(lote, -cantidad);
      consumos.push({ productoId: p.items[i].productoId, loteId: lote.id, lote: lote.lote, vence: lote.vence, cantidad, costo: lote.costo });
      costo += cantidad * lote.costo;
    }));
    costo = r2(costo);
    p.items.forEach(it => reservar(it.productoId, p.depositoId, -it.cantidad));
    const tot = totalesItems(p.items);
    const n = siguiente(tipo);
    const nro = nroCompleto(CONFIG.puntoVenta, n);
    const id = nuevoId('cp');
    const cae = String(76000000000000 + (hash(tipo + nro) % 999999999999)).slice(0, 14);
    const comp = insertar('comprobantes', {
      id, tipo, clase: 'factura', letra, puntoVenta: CONFIG.puntoVenta, numero: n, nro, fecha,
      clienteId: c.id, razonSocial: c.razonSocial, cuit: c.cuit, condicionIVA: c.condicionIVA, pedidoId: p.id,
      items: p.items.map(it => { const pr = App.get('productos', it.productoId); return { productoId: it.productoId, codigo: pr.codigo, descripcion: pr.descripcion, unidad: it.pres ? it.pres.nombre : pr.unidad, cantidad: it.cantidad, pres: it.pres || null, precio: it.precio, bonif: it.bonif || 0, iva: it.iva, subtotal: subtotalItem(it) }; }),
      neto21: tot.neto21, neto105: tot.neto105, neto: tot.neto, iva21: tot.iva21, iva105: tot.iva105, iva: tot.iva, total: tot.total,
      costo, consumos, cae, vtoCae: F.sumar(fecha, 10), vence: F.sumar(fecha, c.plazo || 0),
      cobrado: 0, acreditado: 0, ncIds: [], devuelto: {}, remitoId: null
    });
    const nr = siguiente('R');
    const rem = insertar('remitos', {
      id: nuevoId('rm'), numero: nr, nro: nroCompleto(CONFIG.puntoVenta, nr), fecha, comprobanteId: comp.id, pedidoId: p.id, clienteId: c.id,
      depositoId: p.depositoId, bultos: r2(p.items.reduce((s, it) => s + it.cantidad, 0)),
      kg: r2(p.items.reduce((s, it) => s + it.cantidad * (App.get('productos', it.productoId).pesoKg || 0), 0)),
      estado: 'pendiente', hojaRutaId: null, fechaEntrega: null, obs: ''
    });
    comp.remitoId = rem.id;
    movCta('cliente', c.id, { fecha, tipo, comprobante: NOMBRE_TIPO[tipo] + ' ' + nro, refId: comp.id, debe: comp.total });
    comp.asientoId = asentar({ fecha, detalle: NOMBRE_TIPO[tipo] + ' ' + nro + ' a ' + c.razonSocial, origen: 'venta', refId: comp.id, lineas: [
      { cuenta: CUENTAS.deudores, debe: comp.total }, { cuenta: CUENTAS.ventas, haber: comp.neto }, { cuenta: CUENTAS.ivaDF, haber: comp.iva }] }).id;
    if (costo > 0) comp.asientoCostoId = asentar({ fecha, detalle: 'Costo de la ' + NOMBRE_TIPO[tipo] + ' ' + nro, origen: 'cmv', refId: comp.id, lineas: [
      { cuenta: CUENTAS.cmv, debe: costo }, { cuenta: CUENTAS.mercaderias, haber: costo }] }).id;
    p.estado = 'facturado'; p.comprobanteId = comp.id; p.remitoId = rem.id;
    return comp;
  });

  accion('notaCredito', function (comprobanteId, items, motivo, opciones) {
    const op = opciones || {};
    const fecha = op.fecha || hoyActual;
    const reingresa = op.reingresarStock !== false;
    const f = exigir('comprobantes', comprobanteId, 'el comprobante');
    if (f.clase !== 'factura') throw new Error('La nota de crédito sólo puede emitirse sobre una factura.');
    const pedidos = items && items.length ? items : f.items.map(it => ({ productoId: it.productoId, cantidad: r2(it.cantidad - (f.devuelto[it.productoId] || 0)) })).filter(x => x.cantidad > 0);
    if (!pedidos.length) throw new Error('La factura ya se encuentra acreditada en su totalidad.');
    const lineas = pedidos.map(x => {
      const orig = f.items.find(it => it.productoId === x.productoId);
      if (!orig) throw new Error('Ese producto no está en la factura ' + f.nro + '.');
      const quedan = r2(orig.cantidad - (f.devuelto[x.productoId] || 0));
      const cant = Number(x.cantidad);
      if (!(cant > 0) || cant > quedan) throw new Error('De «' + orig.descripcion + '» se pueden acreditar hasta ' + quedan + '.');
      return { productoId: orig.productoId, codigo: orig.codigo, descripcion: orig.descripcion, unidad: orig.unidad, cantidad: cant, precio: orig.precio, bonif: orig.bonif || 0, iva: orig.iva, subtotal: r2(cant * precioNeto(orig)) };
    });
    const tot = totalesItems(lineas);
    // si esta nota acredita todo lo que quedaba, los importes salen de la factura menos las notas anteriores:
    // así no queda un centavo suelto en la cuenta corriente por redondear por alícuota
    const acreditaTodo = f.items.every(it => { const l = lineas.find(x => x.productoId === it.productoId); return r2(it.cantidad - (f.devuelto[it.productoId] || 0) - (l ? l.cantidad : 0)) <= 0; });
    if (acreditaTodo) {
      const previas = f.ncIds.map(id => App.get('comprobantes', id)).filter(Boolean);
      ['neto21', 'neto105', 'iva21', 'iva105'].forEach(k => { tot[k] = r2(f[k] - previas.reduce((s, x) => s + x[k], 0)); });
      tot.neto = r2(tot.neto21 + tot.neto105); tot.iva = r2(tot.iva21 + tot.iva105); tot.total = r2(tot.neto + tot.iva);
    }
    // devolución al stock: se vuelve a los mismos lotes de donde salió (al revés del consumo)
    let costo = 0;
    const devueltos = [];
    if (reingresa) {
      lineas.forEach(it => {
        let falta = it.cantidad;
        const usados = f.consumos.filter(cn => cn.productoId === it.productoId).slice().reverse();
        for (const cn of usados) {
          const ya = devueltos.filter(dv => dv.loteId === cn.loteId).reduce((s, dv) => s + dv.cantidad, 0) + (cn.devuelto || 0);
          const puede = Math.min(falta, r2(cn.cantidad - ya));
          if (puede <= 0) continue;
          devueltos.push({ loteId: cn.loteId, cantidad: puede, costo: cn.costo, cn });
          falta = r2(falta - puede);
          if (falta <= 0) break;
        }
      });
      devueltos.forEach(dv => { moverLote(App.get('lotes', dv.loteId), dv.cantidad); dv.cn.devuelto = r2((dv.cn.devuelto || 0) + dv.cantidad); costo += dv.cantidad * dv.costo; });
      costo = r2(costo);
    }
    lineas.forEach(it => { f.devuelto[it.productoId] = r2((f.devuelto[it.productoId] || 0) + it.cantidad); });
    const tipo = 'NC' + f.letra;
    const n = siguiente(tipo);
    const nro = nroCompleto(CONFIG.puntoVenta, n);
    const saldoF = App.q.saldoComprobante(f);
    const aplica = r2(Math.min(saldoF, tot.total));
    const nc = insertar('comprobantes', {
      id: nuevoId('cp'), tipo, clase: 'nc', letra: f.letra, puntoVenta: CONFIG.puntoVenta, numero: n, nro, fecha,
      clienteId: f.clienteId, razonSocial: f.razonSocial, cuit: f.cuit, condicionIVA: f.condicionIVA, asociadoId: f.id, asociadoNro: f.tipo + ' ' + f.nro,
      motivo: motivo || 'Devolución', items: lineas,
      neto21: tot.neto21, neto105: tot.neto105, neto: tot.neto, iva21: tot.iva21, iva105: tot.iva105, iva: tot.iva, total: tot.total,
      costo, reingresoStock: reingresa, cae: String(76000000000000 + (hash(tipo + nro) % 999999999999)).slice(0, 14), vtoCae: F.sumar(fecha, 10),
      aplicado: aplica, sinAplicar: r2(tot.total - aplica)
    });
    f.acreditado = r2(f.acreditado + aplica);
    f.ncIds.push(nc.id);
    movCta('cliente', f.clienteId, { fecha, tipo, comprobante: NOMBRE_TIPO[tipo] + ' ' + nro, refId: nc.id, haber: nc.total, detalle: nc.motivo });
    nc.asientoId = asentar({ fecha, detalle: NOMBRE_TIPO[tipo] + ' ' + nro + ' (' + nc.motivo + ')', origen: 'nc', refId: nc.id, lineas: [
      { cuenta: CUENTAS.devoluciones, debe: nc.neto }, { cuenta: CUENTAS.ivaDF, debe: nc.iva }, { cuenta: CUENTAS.deudores, haber: nc.total }] }).id;
    if (costo > 0) asentar({ fecha, detalle: 'Reingreso al stock por ' + NOMBRE_TIPO[tipo] + ' ' + nro, origen: 'cmv', refId: nc.id, lineas: [
      { cuenta: CUENTAS.mercaderias, debe: costo }, { cuenta: CUENTAS.cmv, haber: costo }] });
    return nc;
  });

  accion('armarHojaRuta', function ({ fecha, choferId, vehiculoId, remitoIds, obs }) {
    exigir('choferes', choferId, 'el chofer'); exigir('vehiculos', vehiculoId, 'el vehículo');
    if (!remitoIds || !remitoIds.length) throw new Error('La hoja de ruta debe incluir al menos un remito.');
    const rems = remitoIds.map(id => exigir('remitos', id, 'el remito'));
    const ocupado = rems.find(r => r.estado !== 'pendiente');
    if (ocupado) throw new Error('El remito ' + ocupado.nro + ' ya está ' + ocupado.estado.replace('_', ' ') + '.');
    const n = siguiente('HR');
    const hr = insertar('hojasRuta', { id: nuevoId('hr'), numero: n, nro: pad(n, 6), fecha: fecha || hoyActual, choferId, vehiculoId, remitoIds: remitoIds.slice(), estado: 'armada', obs: obs || '',
      bultos: r2(rems.reduce((s, r) => s + r.bultos, 0)), kg: r2(rems.reduce((s, r) => s + (r.kg || 0), 0)) });
    rems.forEach(r => { r.estado = 'en_ruta'; r.hojaRutaId = hr.id; });
    return hr;
  });

  accion('marcarEntrega', function (remitoId, datos) {
    const { estado, obs, devoluciones, fecha, vendible } = datos || {};
    const r = exigir('remitos', remitoId, 'el remito');
    if (!['entregado', 'rechazado', 'parcial'].includes(estado)) throw new Error('El estado de la entrega tiene que ser entregado, rechazado o parcial.');
    if (!['en_ruta', 'pendiente'].includes(r.estado)) throw new Error('El remito ' + r.nro + ' ya figura como ' + r.estado + '.');
    if (estado === 'parcial' && !(devoluciones && devoluciones.length)) throw new Error('Para una entrega parcial se debe indicar la mercadería devuelta.');
    const f = App.get('comprobantes', r.comprobanteId);
    if (estado === 'rechazado' && f) App.acciones.notaCredito(f.id, null, 'Rechazo en la entrega' + (obs ? ': ' + obs : ''), { fecha });
    if (estado === 'parcial' && f) {
      App.acciones.notaCredito(f.id, devoluciones, 'Devolución en la entrega' + (obs ? ': ' + obs : ''), { fecha });
      // si volvió roto no es vendible: entra al stock y se da de baja enseguida como rotura (va a Diferencias de inventario)
      if (vendible === false) devoluciones.forEach(dv => App.acciones.ajustarStock({ productoId: dv.productoId, depositoId: r.depositoId, cantidad: -Number(dv.cantidad), motivo: 'Rotura', fecha }));
    }
    r.estado = estado; r.obs = obs || ''; r.fechaEntrega = fecha || hoyActual;
    if (r.hojaRutaId) {
      const hr = App.get('hojasRuta', r.hojaRutaId);
      const abiertos = hr.remitoIds.filter(id => App.get('remitos', id).estado === 'en_ruta').length;
      // una hoja de una fecha que todavía no llegó sigue «armada» aunque ya se haya marcado alguna entrega
      hr.estado = !abiertos ? 'cerrada' : (hr.fecha > (fecha || hoyActual) ? 'armada' : 'en_curso');
    }
    return r;
  });

  function imputarAuto(pendientes, total) {
    const imp = [];
    let resto = total;
    for (const c of pendientes) {
      if (resto <= 0) break;
      const s = c.saldo;
      const x = r2(Math.min(s, resto));
      if (x > 0) { imp.push({ id: c.id, importe: x }); resto = r2(resto - x); }
    }
    return imp;
  }

  accion('registrarCobranza', function ({ clienteId, fecha, medios, imputaciones, obs, hojaRutaId }) {
    const c = exigir('clientes', clienteId, 'el cliente');
    fecha = fecha || hoyActual;
    if (!medios || !medios.length) throw new Error('Se debe indicar el medio de cobro (efectivo, transferencia o cheque).');
    medios.forEach(m => {
      if (!['efectivo', 'transferencia', 'cheque', 'echeq', 'retencion'].includes(m.tipo)) throw new Error('Medio de cobro desconocido: ' + m.tipo + '.');
      if (m.tipo === 'retencion' && !(m.datos && m.datos.certificado)) throw new Error('Para una retención se debe indicar el número de certificado.');
      if (!(Number(m.importe) > 0)) throw new Error('Cada medio de cobro tiene que tener un importe mayor que cero.');
    });
    const total = r2(medios.reduce((s, m) => s + Number(m.importe), 0));
    let imps;
    if (imputaciones && imputaciones.length) {
      imps = imputaciones.filter(i => Number(i.importe) > 0).map(i => {
        const cp = exigir('comprobantes', i.comprobanteId, 'el comprobante');
        if (cp.clienteId !== c.id || cp.clase !== 'factura') throw new Error('El comprobante ' + cp.nro + ' no es una factura de este cliente.');
        const s = App.q.saldoComprobante(cp);
        if (Number(i.importe) > s + 0.01) throw new Error('A la factura ' + cp.nro + ' le quedan ' + App.ui.pesos(s) + ' por cobrar.');
        return { id: cp.id, importe: r2(i.importe) };
      });
    } else {
      imps = imputarAuto(App.q.pendientesCliente(c.id).map(cp => ({ id: cp.id, saldo: App.q.saldoComprobante(cp) })), total);
    }
    const sumImp = r2(imps.reduce((s, i) => s + i.importe, 0));
    if (sumImp > total + 0.01) throw new Error('El importe imputado (' + App.ui.pesos(sumImp) + ') supera el total del recibo: ' + App.ui.pesos(total) + '.');
    const n = siguiente('RC');
    const nro = nroCompleto(CONFIG.puntoVenta, n);
    const id = nuevoId('rc');
    const mediosG = medios.map(m => {
      const out = { tipo: m.tipo, importe: r2(m.importe) };
      if (m.tipo === 'cheque' || m.tipo === 'echeq') {
        const dt = m.datos || {};
        const ch = insertar('cheques', { id: nuevoId('ch'), tipo: m.tipo, banco: dt.banco || 'Banco del Plata', numero: dt.numero || String(10000000 + (hash(id) % 89999999)),
          librador: dt.librador || c.razonSocial, cuitLibrador: dt.cuitLibrador || c.cuit, importe: out.importe, fechaEmision: fecha, fechaPago: dt.fechaPago || F.sumar(fecha, 30),
          estado: 'en_cartera', clienteId: c.id, reciboId: id, pagoId: null, fechaDeposito: null });
        out.chequeId = ch.id;
      } else if (m.tipo === 'retencion') {
        const dt = m.datos || {};
        out.datos = { impuesto: ['IIBB', 'Ganancias', 'IVA'].includes(dt.impuesto) ? dt.impuesto : 'IIBB', certificado: String(dt.certificado) };
      } else if (m.datos) out.datos = m.datos;
      return out;
    });
    if (hojaRutaId) exigir('hojasRuta', hojaRutaId, 'la hoja de ruta');
    const rec = insertar('recibos', { id, tipo: 'RC', numero: n, nro, fecha, clienteId: c.id, medios: mediosG, hojaRutaId: hojaRutaId || null,
      imputaciones: imps.map(i => ({ comprobanteId: i.id, importe: i.importe, nro: App.get('comprobantes', i.id).tipo + ' ' + App.get('comprobantes', i.id).nro })),
      total, aCuenta: r2(total - sumImp), obs: obs || '' });
    imps.forEach(i => { const cp = App.get('comprobantes', i.id); cp.cobrado = r2(cp.cobrado + i.importe); });
    movCta('cliente', c.id, { fecha, tipo: 'RC', comprobante: 'Recibo ' + nro, refId: rec.id, haber: total });
    const cuentaDe = { efectivo: CUENTAS.caja, transferencia: CUENTAS.banco, cheque: CUENTAS.valores, echeq: CUENTAS.valores };
    const CUENTA_RET = { IIBB: CUENTAS.percepcionesIIBB, IVA: CUENTAS.percepcionesIVA, Ganancias: CUENTAS.anticiposGanancias };
    const debe = {};
    mediosG.forEach(m => { const k = m.tipo === 'retencion' ? CUENTA_RET[m.datos.impuesto] : cuentaDe[m.tipo]; debe[k] = r2((debe[k] || 0) + m.importe); });
    rec.asientoId = asentar({ fecha, detalle: 'Recibo ' + nro + ' de ' + c.razonSocial, origen: 'cobranza', refId: rec.id,
      lineas: Object.keys(debe).map(k => ({ cuenta: k, debe: debe[k] })).concat([{ cuenta: CUENTAS.deudores, haber: total }]) }).id;
    return rec;
  });

  accion('depositarCheque', function (chequeId, opciones) {
    const fecha = (opciones && opciones.fecha) || hoyActual;
    const ch = exigir('cheques', chequeId, 'el cheque');
    if (ch.estado !== 'en_cartera') throw new Error('El cheque ' + ch.numero + ' ya está ' + ch.estado.replace('_', ' ') + '.');
    if (ch.fechaPago > fecha) throw new Error('El cheque ' + ch.numero + ' es de pago diferido: se puede depositar desde el ' + App.ui.fecha(ch.fechaPago) + '.');
    ch.estado = 'depositado'; ch.fechaDeposito = fecha;
    ch.asientoId = asentar({ fecha, detalle: 'Depósito de ' + (ch.tipo === 'echeq' ? 'eCheq' : 'cheque') + ' ' + ch.banco + ' n.º ' + ch.numero, origen: 'tesoreria', refId: ch.id,
      lineas: [{ cuenta: CUENTAS.banco, debe: ch.importe }, { cuenta: CUENTAS.valores, haber: ch.importe }] }).id;
    return ch;
  });

  accion('crearOrdenCompra', function ({ proveedorId, items, fecha, depositoId, obs }) {
    const pr = exigir('proveedores', proveedorId, 'el proveedor');
    if (!items || !items.length) throw new Error('La orden de compra debe incluir al menos un producto.');
    const lista = items.map(it => {
      const p = exigir('productos', it.productoId, 'el producto');
      const cant = Number(it.cantidad);
      if (!(cant > 0)) throw new Error('Las cantidades tienen que ser mayores que cero.');
      return { productoId: p.id, cantidad: cant, costo: r2(it.costo != null ? it.costo : p.costo), precio: r2(it.costo != null ? it.costo : p.costo), iva: p.iva };
    });
    const tot = totalesItems(lista);
    lista.forEach(it => { delete it.precio; });
    const n = siguiente('OC');
    return insertar('ordenesCompra', { id: nuevoId('oc'), numero: n, nro: pad(n, 6), fecha: fecha || hoyActual, proveedorId: pr.id, depositoId: depositoId || 'D1',
      items: lista, neto: tot.neto, iva: tot.iva, total: tot.total, estado: 'pendiente', obs: obs || '', recepcion: null });
  });

  accion('recibirCompra', function (ordenId, datos) {
    const d = datos || {};
    const oc = exigir('ordenesCompra', ordenId, 'la orden de compra');
    if (oc.estado === 'cancelada') throw new Error('La orden ' + oc.nro + ' está cancelada.');
    if (oc.estado !== 'pendiente') throw new Error('La orden ' + oc.nro + ' ya fue recibida.');
    const pr = App.get('proveedores', oc.proveedorId);
    const fecha = d.fecha || hoyActual;
    const dep = d.depositoId || oc.depositoId || 'D1';
    exigir('depositos', dep, 'el depósito');
    const lotesIn = (d.lotes && d.lotes.length ? d.lotes : oc.items.map(it => ({ productoId: it.productoId, cantidad: it.cantidad }))).filter(l => Number(l.cantidad) > 0);
    if (!lotesIn.length) throw new Error('No se recibió ningún producto.');
    lotesIn.forEach(l => { if (!oc.items.find(it => it.productoId === l.productoId)) throw new Error('El producto ' + l.productoId + ' no está en la orden de compra.'); });
    const fact = d.factura || {};
    const nuevos = lotesIn.map((l, i) => {
      const p = App.get('productos', l.productoId);
      const it = oc.items.find(x => x.productoId === l.productoId);
      const vence = l.vence || (p.vidaUtil ? F.sumar(fecha, p.vidaUtil) : null);
      return crearLote({ productoId: p.id, depositoId: dep, cantidad: Number(l.cantidad), costo: it.costo, lote: l.lote || ('L' + fecha.slice(2).replace(/-/g, '') + '-' + pad((hash(oc.id + i) % 90) + 10, 2)), vence, ingreso: fecha, origen: 'compra' });
    });
    const items = lotesIn.map(l => { const it = oc.items.find(x => x.productoId === l.productoId); return { productoId: l.productoId, cantidad: Number(l.cantidad), precio: it.costo, iva: it.iva }; });
    const tot = totalesItems(items);
    // percepciones que cobra el proveedor en la factura (IIBB de Rentas Córdoba e IVA): son saldos a favor
    const percIIBB = r2(Number(fact.percepcionIIBB) || 0), percIVA = r2(Number(fact.percepcionIVA) || 0);
    if (percIIBB < 0 || percIVA < 0) throw new Error('Las percepciones no pueden ser negativas.');
    const fc = insertar('comprasFacturas', { id: nuevoId('fc'), proveedorId: pr.id, razonSocial: pr.razonSocial, ordenId: oc.id, tipo: fact.tipo || 'A',
      numero: fact.numero || (pad(1 + (hash(pr.id) % 8), 4) + '-' + pad(10000 + (hash(oc.id) % 89999), 8)), fecha: fact.fecha || fecha,
      items: items.map(it => ({ productoId: it.productoId, cantidad: it.cantidad, costo: it.precio, iva: it.iva, subtotal: r2(it.cantidad * it.precio) })),
      neto21: tot.neto21, neto105: tot.neto105, neto: tot.neto, iva21: tot.iva21, iva105: tot.iva105, iva: tot.iva,
      percepcionIIBB: percIIBB, percepcionIVA: percIVA, total: r2(tot.total + percIIBB + percIVA),
      vence: F.sumar(fact.fecha || fecha, pr.plazo || 30), pagado: 0 });
    movCta('proveedor', pr.id, { fecha: fc.fecha, tipo: 'FC', comprobante: 'Factura ' + fc.tipo + ' ' + fc.numero, refId: fc.id, haber: fc.total });
    fc.asientoId = asentar({ fecha: fc.fecha, detalle: 'Compra a ' + pr.razonSocial + ', factura ' + fc.tipo + ' ' + fc.numero, origen: 'compra', refId: fc.id, lineas: [
      { cuenta: CUENTAS.mercaderias, debe: fc.neto }, { cuenta: CUENTAS.ivaCF, debe: fc.iva },
      { cuenta: CUENTAS.percepcionesIIBB, debe: percIIBB }, { cuenta: CUENTAS.percepcionesIVA, debe: percIVA }, { cuenta: CUENTAS.proveedores, haber: fc.total }] }).id;
    oc.estado = 'recibida';
    oc.recepcion = { fecha, depositoId: dep, compraFacturaId: fc.id, loteIds: nuevos.map(l => l.id) };
    // opcional: que el costo de la ficha pase a ser el de esta compra (true = todos, o una lista de productoId)
    if (d.actualizarCosto) {
      const ids = Array.isArray(d.actualizarCosto) ? d.actualizarCosto : items.map(it => it.productoId);
      ids.forEach(id => { const p = App.get('productos', id), it = oc.items.find(x => x.productoId === id); if (p && it && p.costo !== it.costo) { p.costo = it.costo; p.costoCambio = fecha; } });
    }
    return fc;
  });

  accion('marcarOrdenEnviada', function (ordenId, datos) {
    const oc = exigir('ordenesCompra', ordenId, 'la orden de compra');
    if (oc.estado !== 'pendiente') throw new Error('La orden ' + oc.nro + ' ya está ' + oc.estado + '.');
    const d = datos || {};
    oc.envio = { medio: d.medio || 'whatsapp', fecha: d.fecha || hoyActual };
    return oc;
  });

  accion('cancelarOrdenCompra', function (ordenId, motivo) {
    const oc = exigir('ordenesCompra', ordenId, 'la orden de compra');
    if (oc.estado !== 'pendiente') throw new Error('Sólo se puede cancelar una orden pendiente: la ' + oc.nro + ' está ' + oc.estado + '.');
    oc.estado = 'cancelada'; oc.motivoCancelacion = motivo || ''; oc.fechaCancelacion = hoyActual;
    return oc;
  });

  accion('registrarPago', function ({ proveedorId, fecha, medios, imputaciones, obs }) {
    const pr = exigir('proveedores', proveedorId, 'el proveedor');
    fecha = fecha || hoyActual;
    if (!medios || !medios.length) throw new Error('Se debe indicar el medio de pago (transferencia, efectivo, cheque propio o cheque de terceros).');
    const usados = [];
    const mediosG = medios.map(m => {
      if (m.tipo === 'cheque') {
        const ch = exigir('cheques', m.chequeId, 'el cheque');
        if (ch.estado !== 'en_cartera') throw new Error('El cheque ' + ch.numero + ' no está en cartera.');
        if (usados.includes(ch.id)) throw new Error('El mismo cheque figura dos veces.');
        usados.push(ch.id);
        return { tipo: 'cheque', chequeId: ch.id, importe: ch.importe, detalle: ch.banco + ' n.º ' + ch.numero };
      }
      if (!['transferencia', 'efectivo', 'cheque_propio'].includes(m.tipo)) throw new Error('Medio de pago desconocido: ' + m.tipo + '.');
      if (!(Number(m.importe) > 0)) throw new Error('Cada medio de pago tiene que tener un importe mayor que cero.');
      const out = { tipo: m.tipo, importe: r2(m.importe) };
      if (m.tipo === 'cheque_propio') {
        const dt = m.datos || {};
        if (!dt.numero) throw new Error('Se debe indicar el número del cheque propio.');
        out.datos = { numero: String(dt.numero), banco: dt.banco || 'Banco cuenta corriente', fechaPago: dt.fechaPago || fecha };
        out.detalle = 'Cheque propio ' + out.datos.banco + ' n.º ' + out.datos.numero + (out.datos.fechaPago > fecha ? ', pago ' + App.ui.fecha(out.datos.fechaPago) : '');
      } else if (m.datos) out.datos = m.datos;
      return out;
    });
    const total = r2(mediosG.reduce((s, m) => s + m.importe, 0));
    let imps;
    if (imputaciones && imputaciones.length) {
      imps = imputaciones.filter(i => Number(i.importe) > 0).map(i => {
        const fc = exigir('comprasFacturas', i.facturaId, 'la factura de compra');
        if (fc.proveedorId !== pr.id) throw new Error('La factura ' + fc.numero + ' no es de este proveedor.');
        const s = r2(fc.total - fc.pagado);
        if (Number(i.importe) > s + 0.01) throw new Error('A la factura ' + fc.numero + ' le quedan ' + App.ui.pesos(s) + ' por pagar.');
        return { id: fc.id, importe: r2(i.importe) };
      });
    } else {
      imps = imputarAuto(App.q.pendientesProveedor(pr.id).map(fc => ({ id: fc.id, saldo: r2(fc.total - fc.pagado) })), total);
    }
    const sumImp = r2(imps.reduce((s, i) => s + i.importe, 0));
    if (sumImp > total + 0.01) throw new Error('El importe imputado (' + App.ui.pesos(sumImp) + ') supera el total de la orden de pago: ' + App.ui.pesos(total) + '.');
    const n = siguiente('OP');
    const nro = nroCompleto(1, n);
    const pago = insertar('pagos', { id: nuevoId('op'), tipo: 'OP', numero: n, nro, fecha, proveedorId: pr.id, medios: mediosG,
      imputaciones: imps.map(i => ({ facturaId: i.id, importe: i.importe, numero: App.get('comprasFacturas', i.id).numero })),
      total, aCuenta: r2(total - imps.reduce((s, i) => s + i.importe, 0)), obs: obs || '' });
    imps.forEach(i => { const fc = App.get('comprasFacturas', i.id); fc.pagado = r2(fc.pagado + i.importe); });
    usados.forEach(id => { const ch = App.get('cheques', id); ch.estado = 'endosado'; ch.pagoId = pago.id; ch.proveedorId = pr.id; ch.fechaEndoso = fecha; });
    movCta('proveedor', pr.id, { fecha, tipo: 'OP', comprobante: 'Orden de pago ' + nro, refId: pago.id, debe: total });
    // el cheque propio al día sale del Banco; el de pago diferido queda en «Cheques diferidos a pagar» hasta que se debita
    const cuentaDe = { transferencia: CUENTAS.banco, efectivo: CUENTAS.caja, cheque: CUENTAS.valores, cheque_propio: CUENTAS.banco };
    const haber = {};
    mediosG.forEach(m => {
      const k = m.tipo === 'cheque_propio' && m.datos.fechaPago > fecha ? CUENTAS.chequesDiferidos : cuentaDe[m.tipo];
      if (k === CUENTAS.chequesDiferidos) m.diferido = true;
      haber[k] = r2((haber[k] || 0) + m.importe);
    });
    pago.asientoId = asentar({ fecha, detalle: 'Orden de pago ' + nro + ' a ' + pr.razonSocial, origen: 'pago', refId: pago.id,
      lineas: [{ cuenta: CUENTAS.proveedores, debe: total }].concat(Object.keys(haber).map(k => ({ cuenta: k, haber: haber[k] }))) }).id;
    return pago;
  });

  // el banco debita los cheques propios diferidos que vencen hasta la fecha
  accion('debitarChequesPropios', function (opciones) {
    const fecha = (opciones && opciones.fecha) || hoyActual;
    const hechos = [];
    db.pagos.forEach(pg => pg.medios.forEach(m => {
      if (!m.diferido || m.debitado || m.datos.fechaPago > fecha) return;
      m.debitado = m.datos.fechaPago;
      asentar({ fecha: m.datos.fechaPago, detalle: 'Débito del cheque propio n.º ' + m.datos.numero + ' (orden de pago ' + pg.nro + ')', origen: 'tesoreria', refId: pg.id,
        lineas: [{ cuenta: CUENTAS.chequesDiferidos, debe: m.importe }, { cuenta: CUENTAS.banco, haber: m.importe }] });
      hechos.push(m);
    }));
    return hechos.length;
  });

  accion('ajustarStock', function ({ productoId, depositoId, loteId, cantidad, contado, motivo, fecha }) {
    fecha = fecha || hoyActual;
    let lote = loteId ? exigir('lotes', loteId, 'el lote') : null;
    const prodId = lote ? lote.productoId : productoId;
    const dep = lote ? lote.depositoId : (depositoId || 'D1');
    const p = exigir('productos', prodId, 'el producto');
    let delta = cantidad != null ? Number(cantidad) : null;
    if (delta == null && contado != null) delta = r2(Number(contado) - (lote ? lote.cantidad : App.q.stock(prodId, dep).fisico));
    if (!delta) throw new Error('La cantidad a ajustar no puede ser cero.');
    let costo = 0;
    const movs = [];
    if (delta < 0) {
      if (lote) {
        if (lote.cantidad < -delta) throw new Error('El lote ' + lote.lote + ' tiene ' + lote.cantidad + ': no es posible dar de baja ' + (-delta) + '.');
        movs.push({ lote, cantidad: delta });
      } else {
        const pl = planFEFO(prodId, dep, -delta, true);
        if (pl.falta > 0) throw new Error('El stock de «' + p.descripcion + '» es insuficiente para la baja.');
        pl.plan.forEach(x => movs.push({ lote: x.lote, cantidad: -x.cantidad }));
      }
    } else {
      if (!lote) lote = crearLote({ productoId: prodId, depositoId: dep, cantidad: 0, costo: p.costo, lote: 'AJ' + fecha.slice(2).replace(/-/g, ''), vence: p.vidaUtil ? F.sumar(fecha, p.vidaUtil) : null, ingreso: fecha, origen: 'ajuste' });
      movs.push({ lote, cantidad: delta });
    }
    movs.forEach(m => { moverLote(m.lote, m.cantidad); costo += Math.abs(m.cantidad) * m.lote.costo; });
    costo = r2(costo);
    const n = siguiente('AJ');
    const aj = insertar('ajustesStock', { id: nuevoId('aj'), numero: n, tipo: 'ajuste', fecha, productoId: prodId, depositoId: dep,
      loteId: movs.length === 1 ? movs[0].lote.id : null, lotes: movs.map(m => ({ loteId: m.lote.id, lote: m.lote.lote, cantidad: m.cantidad })),
      cantidad: r2(delta), motivo: motivo || 'Toma de inventario', costo });
    if (costo > 0) aj.asientoId = asentar({ fecha, detalle: 'Ajuste de stock: ' + p.descripcion + ' (' + (motivo || 'toma de inventario') + ')', origen: 'ajuste', refId: aj.id,
      lineas: delta < 0 ? [{ cuenta: CUENTAS.diferenciasInventario, debe: costo }, { cuenta: CUENTAS.mercaderias, haber: costo }]
        : [{ cuenta: CUENTAS.mercaderias, debe: costo }, { cuenta: CUENTAS.diferenciasInventario, haber: costo }] }).id;
    return aj;
  });

  accion('transferirStock', function ({ productoId, desdeId, hastaId, cantidad, fecha, obs }) {
    fecha = fecha || hoyActual;
    const p = exigir('productos', productoId, 'el producto');
    exigir('depositos', desdeId, 'el depósito de origen'); exigir('depositos', hastaId, 'el depósito de destino');
    if (desdeId === hastaId) throw new Error('El depósito de origen y el de destino son el mismo.');
    const cant = Number(cantidad);
    if (!(cant > 0)) throw new Error('La cantidad a transferir tiene que ser mayor que cero.');
    if (App.q.stock(productoId, desdeId).disponible < cant) throw new Error('En ' + App.get('depositos', desdeId).nombre + ' no hay ' + cant + ' disponibles de «' + p.descripcion + '».');
    const pl = planFEFO(productoId, desdeId, cant, false);
    const movs = pl.plan.map(({ lote, cantidad: c }) => {
      moverLote(lote, -c);
      const nuevo = crearLote({ productoId, depositoId: hastaId, cantidad: c, costo: lote.costo, lote: lote.lote, vence: lote.vence, ingreso: fecha, origen: 'transferencia' });
      return { desdeLoteId: lote.id, hastaLoteId: nuevo.id, lote: lote.lote, cantidad: c };
    });
    const n = siguiente('TR');
    return insertar('ajustesStock', { id: nuevoId('tr'), numero: n, tipo: 'transferencia', fecha, productoId, depositoId: desdeId, hastaDepositoId: hastaId,
      cantidad: cant, lotes: movs, motivo: obs || 'Transferencia entre depósitos', costo: 0 });
  });

  accion('asientoManual', function ({ fecha, detalle, lineas, origen, anulaAsientoId }) {
    if (!detalle) throw new Error('El asiento debe tener un detalle.');
    if (!lineas || lineas.length < 2) throw new Error('El asiento necesita al menos dos líneas.');
    lineas.forEach(l => { if ((Number(l.debe) || 0) > 0 && (Number(l.haber) || 0) > 0) throw new Error('Cada línea debe imputarse al debe o al haber, no a ambos.'); });
    let anulado = null;
    if (anulaAsientoId) {
      anulado = exigir('asientos', anulaAsientoId, 'el asiento a anular');
      if (anulado.anuladoPor) throw new Error('El asiento n.º ' + anulado.numero + ' ya está anulado.');
      if (anulado.anulaAsientoId) throw new Error('El asiento n.º ' + anulado.numero + ' es un contraasiento: no se anula.');
    }
    const a = asentar({ fecha: fecha || hoyActual, detalle, origen: origen || 'manual', lineas });
    if (anulado) { a.anulaAsientoId = anulado.id; anulado.anuladoPor = a.id; }
    return a;
  });

  const MAESTROS = { productos: 'p', clientes: 'c', proveedores: 'v', preventistas: 'pv', choferes: 'ch', vehiculos: 've', depositos: 'D', listasPrecio: 'L' };
  accion('guardarMaestro', function (coleccion, datos) {
    if (!MAESTROS[coleccion]) throw new Error('La colección ' + coleccion + ' no admite edición manual.');
    const existente = datos.id ? App.get(coleccion, datos.id) : null;
    if (existente) {
      if (coleccion === 'productos' && datos.precios && JSON.stringify(datos.precios) !== JSON.stringify(existente.precios)) datos = Object.assign({}, datos, { precioCambio: hoyActual });
      Object.assign(existente, datos); return existente;
    }
    const obj = Object.assign({ activo: true }, datos, { id: datos.id || nuevoId(MAESTROS[coleccion]) });
    if (coleccion === 'productos') {
      if (!obj.descripcion) throw new Error('El producto necesita una descripción.');
      if (!obj.ean) { const doce = '779' + pad(9000 + (hash(obj.id) % 999), 4) + pad(hash(obj.descripcion) % 100000, 5); obj.ean = doce + F.digitoEAN(doce); }
      if (!F.eanValido(obj.ean)) throw new Error('El código EAN-13 no es válido (dígito verificador incorrecto).');
      obj.precios = obj.precios || {};
      db.listasPrecio.forEach(l => { if (obj.precios[l.id] == null) obj.precios[l.id] = Math.round((obj.costo || 0) * (1 + l.recargo)); });
      obj.minimo = obj.minimo || 0; obj.iva = obj.iva || 21;
    }
    if (coleccion === 'clientes' && !obj.razonSocial) throw new Error('El cliente necesita una razón social.');
    return insertar(coleccion, obj);
  });

  // ---- listas de precios nuevas: salen del costo o de otra lista, con un porcentaje ----
  accion('crearListaPrecio', function ({ nombre, detalle, base, porcentaje }) {
    const nom = String(nombre || '').trim();
    if (!nom) throw new Error('La lista necesita un nombre.');
    if (db.listasPrecio.some(l => App.ui.normalizar(l.nombre) === App.ui.normalizar(nom))) throw new Error('Ya existe una lista llamada «' + nom + '».');
    const pct = Number(porcentaje);
    if (!isFinite(pct) || pct <= -90) throw new Error('El porcentaje no es válido.');
    const desde = base && base !== 'costo' ? exigir('listasPrecio', base, 'la lista de base') : null;
    let n = db.listasPrecio.length + 1; while (App.get('listasPrecio', 'L' + n)) n++;
    const id = 'L' + n;
    const recargo = desde ? r2(((1 + desde.recargo) * (1 + pct / 100) - 1) * 1000) / 1000 : r2(pct / 100 * 1000) / 1000;
    const l = insertar('listasPrecio', { id, nombre: nom, recargo, detalle: detalle || (desde ? (pct >= 0 ? pct + ' % sobre ' : Math.abs(pct) + ' % menos que ') + desde.nombre : pct + ' % sobre el costo'),
      base: desde ? desde.id : 'costo', porcentaje: pct, creada: hoyActual });
    db.productos.forEach(p => {
      const b = desde ? (p.precios[desde.id] != null ? p.precios[desde.id] : Math.round(p.costo * (1 + desde.recargo))) : p.costo;
      p.precios[id] = Math.round(b * (1 + pct / 100));
    });
    return l;
  });

  // ---- código propio: además del EAN-13 del fabricante, un código de la distribuidora para cada producto ----
  // numérico de 12 o 13 dígitos → EAN-13 interno (prefijo 29, reservado para uso interno); con letras → Code 39
  App.f.codigoPropioSugerido = p => { const doce = '29' + pad(hash('propio' + p.id) % 10000000000, 10); return doce + F.digitoEAN(doce); };
  App.f.tipoCodigo = c => /^\d{12,13}$/.test(c) ? 'ean13' : 'code39';
  accion('asignarCodigoPropio', function (productoId, codigo) {
    const p = exigir('productos', productoId, 'el producto');
    let c = String(codigo == null ? '' : codigo).trim().toUpperCase();
    if (!c) { p.codigoPropio = null; return p; }
    if (/^\d{12}$/.test(c)) c += F.digitoEAN(c);
    if (/^\d{13}$/.test(c)) { if (!F.eanValido(c)) throw new Error('El código ' + c + ' no es un EAN-13 válido: el último dígito tendría que ser ' + F.digitoEAN(c.slice(0, 12)) + '.'); }
    else if (!/^[A-Z0-9 .\-\/+%$]{2,20}$/.test(c)) throw new Error('El código propio puede tener de 2 a 20 caracteres: letras, números, espacio y . - / + % $.');
    const otro = db.productos.find(x => x.id !== p.id && (x.ean === c || x.codigoPropio === c));
    if (otro) throw new Error('El código ' + c + ' ya lo usa «' + otro.descripcion + '».');
    p.codigoPropio = c;
    return p;
  });

  // ---- foto del producto elegida desde la búsqueda de imágenes ----
  accion('asignarFoto', function (productoId, foto) {
    const p = exigir('productos', productoId, 'el producto');
    let imagen = foto && foto.imagen ? String(foto.imagen) : '';
    if (imagen && !/^data:image\/(jpeg|png|webp|gif);base64,/.test(imagen) && !/^https:\/\//.test(imagen)) throw new Error('La imagen no es válida: pegá una foto o el enlace https de la imagen.');
    if (imagen.length > 900000) throw new Error('La imagen es demasiado pesada. Probá con otra foto.');
    p.foto = foto ? { consulta: String(foto.consulta || ''), resultado: Number(foto.resultado) || 0, sitio: foto.sitio || '', imagen, fecha: hoyActual } : null;
    return p;
  });

  // ---- producción: recetas (insumos y cantidades por tanda) y órdenes de producción ----
  accion('guardarReceta', function (datos) {
    const d = datos || {};
    const prod = exigir('productos', d.productoId, 'el producto que se produce');
    const rinde = Number(d.rinde);
    if (!(rinde > 0)) throw new Error('Indicá cuánto rinde cada tanda.');
    const insumos = (d.insumos || []).filter(i => Number(i.cantidad) > 0).map(i => {
      const p = exigir('productos', i.productoId, 'el insumo');
      if (p.id === prod.id) throw new Error('Un producto no puede ser insumo de sí mismo.');
      return { productoId: p.id, cantidad: rq(i.cantidad) };
    });
    if (!insumos.length) throw new Error('La receta necesita al menos un insumo.');
    const otros = (d.otrosCostos || []).filter(o => String(o.concepto || '').trim() && Number(o.importe) > 0).map(o => ({ concepto: String(o.concepto).trim(), importe: r2(o.importe) }));
    const existente = d.id ? App.get('recetas', d.id) : null;
    const obj = { nombre: String(d.nombre || prod.descripcion).trim(), productoId: prod.id, rinde: rq(rinde), insumos, otrosCostos: otros, nota: d.nota || '', actualizada: hoyActual };
    if (existente) { Object.assign(existente, obj); return existente; }
    const n = siguiente('RE');
    return insertar('recetas', Object.assign({ id: nuevoId('re'), numero: n, activa: true, creada: hoyActual }, obj));
  });
  // costo de un insumo: promedio ponderado del stock que hay; si no hay stock, el costo de la ficha
  App.q.costoInsumo = productoId => {
    const p = App.get('productos', productoId);
    let c = 0, v = 0;
    lotesActivos(productoId, null).forEach(l => { c += l.cantidad; v += l.cantidad * l.costo; });
    return c > 0 ? r2(v / c) : (p ? p.costo : 0);
  };
  // calculador de costos: cuánto cuesta una tanda y cada unidad, y qué margen deja cada lista
  App.q.costoReceta = (receta, tandas) => {
    const r = typeof receta === 'string' ? App.get('recetas', receta) : receta;
    if (!r) return null;
    const t = Number(tandas) > 0 ? Number(tandas) : 1;
    const insumos = r.insumos.map(i => { const p = App.get('productos', i.productoId); const cu = App.q.costoInsumo(i.productoId); const cant = rq(i.cantidad * t);
      return { productoId: i.productoId, producto: p, cantidad: cant, costoUnitario: cu, subtotal: r2(cant * cu), disponible: App.q.stock(i.productoId).disponible }; });
    const materiales = r2(insumos.reduce((s, i) => s + i.subtotal, 0));
    const otros = r2((r.otrosCostos || []).reduce((s, o) => s + o.importe, 0) * t);
    const cantidad = rq(r.rinde * t);
    const total = r2(materiales + otros);
    const prod = App.get('productos', r.productoId);
    const porUnidad = cantidad ? r2(total / cantidad) : 0;
    const listas = db.listasPrecio.map(l => { const precio = App.q.precio(prod.id, l.id); return { lista: l, precio, margen: precio ? (precio - porUnidad) / precio : 0 }; });
    return { receta: r, producto: prod, tandas: t, cantidad, insumos, materiales, otros, total, porUnidad, materialesPorUnidad: cantidad ? r2(materiales / cantidad) : 0,
      faltantes: insumos.filter(i => i.disponible < i.cantidad), listas };
  };
  accion('producir', function ({ recetaId, tandas, depositoId, fecha, obs }) {
    const r = exigir('recetas', recetaId, 'la receta');
    const t = Number(tandas);
    if (!(t > 0)) throw new Error('Indicá cuántas tandas se producen.');
    const dep = depositoId || 'D1';
    exigir('depositos', dep, 'el depósito');
    const f = fecha || hoyActual;
    const prod = App.get('productos', r.productoId);
    // primero se calcula todo; si falta algún insumo no se toca nada
    const planes = r.insumos.map(i => {
      const cant = rq(i.cantidad * t);
      const pl = planFEFO(i.productoId, dep, cant, false);
      const libre = App.q.stock(i.productoId, dep).disponible;
      if (pl.falta > 0.00005 || libre + 0.00005 < cant) throw new Error('No alcanza «' + App.get('productos', i.productoId).descripcion + '» en ' + App.get('depositos', dep).nombre + ': hacen falta ' + App.ui.num(cant, 2) + ' y hay ' + App.ui.num(libre, 2) + '.');
      return { insumo: i, cantidad: cant, plan: pl.plan };
    });
    const consumos = [];
    let materiales = 0;
    planes.forEach(x => x.plan.forEach(({ lote, cantidad }) => {
      moverLote(lote, -cantidad);
      consumos.push({ productoId: x.insumo.productoId, loteId: lote.id, lote: lote.lote, cantidad, costo: lote.costo });
      materiales += cantidad * lote.costo;
    }));
    materiales = r2(materiales);
    const cantidad = rq(r.rinde * t);
    const costoUnit = r2(materiales / cantidad);
    const n = siguiente('PR');
    const lote = crearLote({ productoId: prod.id, depositoId: dep, cantidad, costo: costoUnit, lote: 'P' + f.slice(2).replace(/-/g, '') + '-' + pad(n % 100, 2),
      vence: prod.vidaUtil ? F.sumar(f, prod.vidaUtil) : null, ingreso: f, origen: 'produccion' });
    const valorTerminado = r2(cantidad * costoUnit);
    const otros = r2((r.otrosCostos || []).reduce((s, o) => s + o.importe, 0) * t);
    const op = insertar('ordenesProduccion', { id: nuevoId('op'), numero: n, nro: pad(n, 6), fecha: f, recetaId: r.id, productoId: prod.id, tandas: t, cantidad, depositoId: dep,
      consumos, costoMateriales: materiales, otrosCostos: otros, costoUnitario: costoUnit, costoTotalUnitario: r2((materiales + otros) / cantidad), loteId: lote.id, obs: obs || '', estado: 'terminada' });
    // el stock se valoriza al costo de los materiales (la mano de obra y los gastos ya están en los gastos del mes)
    op.asientoId = asentar({ fecha: f, detalle: 'Orden de producción ' + op.nro + ': ' + App.ui.num(cantidad, cantidad % 1 ? 2 : 0) + ' × ' + prod.descripcion, origen: 'produccion', refId: op.id, lineas: [
      { cuenta: CUENTAS.mercaderias, debe: valorTerminado }, { cuenta: CUENTAS.mercaderias, haber: materiales },
      valorTerminado > materiales ? { cuenta: CUENTAS.diferenciasInventario, haber: r2(valorTerminado - materiales) } : { cuenta: CUENTAS.diferenciasInventario, debe: r2(materiales - valorTerminado) }] }).id;
    return op;
  });

  accion('actualizarPrecios', function ({ productoIds, porcentaje, listaId, detalle, fecha, costo }) {
    const pct = Number(porcentaje);
    if (!pct) throw new Error('Se debe indicar el porcentaje de aumento.');
    const ids = productoIds && productoIds.length ? productoIds : db.productos.map(p => p.id);
    const f = fecha || hoyActual;
    ids.forEach(id => {
      const p = exigir('productos', id, 'el producto');
      Object.keys(p.precios).forEach(l => { if (!listaId || l === listaId) p.precios[l] = Math.round(p.precios[l] * (1 + pct / 100)); });
      p.precioCambio = f;
    });
    insertar('aumentosPrecio', { id: nuevoId('au'), fecha: f, porcentaje: pct, listaId: listaId || null, productoIds: ids.slice(), cantidad: ids.length,
      detalle: detalle || (ids.length === db.productos.length ? 'Todos los productos' : ids.length + ' productos'), costo: !!costo });
    return ids.length;
  });

  // visita del preventista sin pedido (cerrado, tiene stock…): sirve para medir la efectividad de la ruta
  accion('registrarVisita', function ({ clienteId, preventistaId, fecha, motivo }) {
    const c = exigir('clientes', clienteId, 'el cliente');
    if (!motivo) throw new Error('Se debe indicar el motivo de no compra.');
    return insertar('visitas', { id: nuevoId('vi'), clienteId: c.id, preventistaId: preventistaId || c.preventistaId, fecha: fecha || hoyActual, motivo, conPedido: false });
  });

  // comisiones de preventistas de un período: sobre lo facturado (neto de NC) o sobre lo cobrado (sin IVA)
  const enRangoF = (f, desde, hasta) => (!desde || f >= desde) && (!hasta || f <= hasta);
  App.q.comisiones = ({ desde, hasta, base, porcentajes }) => {
    const res = {};
    db.preventistas.forEach(pv => { res[pv.id] = { preventistaId: pv.id, preventista: pv, pct: porcentajes && porcentajes[pv.id] != null ? Number(porcentajes[pv.id]) : r2((pv.comision || 0) * 100), base: 0, detalle: [] }; });
    const pvDe = cp => { const f = cp.clase === 'nc' ? App.get('comprobantes', cp.asociadoId) : cp; const p = f && f.pedidoId ? App.get('pedidos', f.pedidoId) : null; return p ? p.preventistaId : null; };
    const yaLiquidado = new Set();
    db.liquidacionesComision.forEach(l => l.comprobantes.forEach(id => yaLiquidado.add(id)));
    if (base === 'cobrado') {
      db.recibos.forEach(r => {
        if (!enRangoF(r.fecha, desde, hasta)) return;
        r.imputaciones.forEach(i => {
          const cp = App.get('comprobantes', i.comprobanteId); const pv = cp && pvDe(cp); if (!pv || !res[pv]) return;
          const clave = r.id + ':' + cp.id; if (yaLiquidado.has(clave)) return;
          const neto = r2(i.importe * cp.neto / cp.total);
          res[pv].base += neto; res[pv].detalle.push({ clave, fecha: r.fecha, texto: 'Recibo ' + r.nro + ' por ' + cp.tipo + ' ' + cp.nro, clienteId: cp.clienteId, base: neto });
        });
      });
    } else {
      db.comprobantes.forEach(cp => {
        if (!enRangoF(cp.fecha, desde, hasta) || yaLiquidado.has(cp.id)) return;
        const pv = pvDe(cp); if (!pv || !res[pv]) return;
        const neto = cp.clase === 'nc' ? -cp.neto : cp.neto;
        res[pv].base += neto; res[pv].detalle.push({ clave: cp.id, fecha: cp.fecha, texto: cp.tipo + ' ' + cp.nro, clienteId: cp.clienteId, base: neto, comprobanteId: cp.id });
      });
    }
    return Object.values(res).map(x => Object.assign(x, { base: r2(x.base), importe: r2(x.base * x.pct / 100) }));
  };
  accion('liquidarComisiones', function ({ desde, hasta, base, porcentajes, fecha, preventistaIds }) {
    const f = fecha || hoyActual;
    const b = base === 'cobrado' ? 'cobrado' : 'facturado';
    const filas = App.q.comisiones({ desde, hasta, base: b, porcentajes }).filter(x => x.importe > 0 && (!preventistaIds || preventistaIds.includes(x.preventistaId)));
    if (!filas.length) throw new Error('No hay comisiones para liquidar en ese período.');
    const total = r2(filas.reduce((s, x) => s + x.importe, 0));
    // lo que ya estaba devengado en «Comisiones a pagar» se cancela; el resto es gasto del período
    const prov = Math.max(0, App.q.saldoCuenta(CUENTAS.comisionesAPagar, f));
    const usa = r2(Math.min(prov, total));
    const n = siguiente('LQ');
    const liq = insertar('liquidacionesComision', { id: nuevoId('lq'), numero: n, nro: pad(n, 6), fecha: f, desde, hasta, base: b, total,
      filas: filas.map(x => ({ preventistaId: x.preventistaId, pct: x.pct, base: x.base, importe: x.importe, comprobantes: x.detalle.length })),
      comprobantes: [].concat(...filas.map(x => x.detalle.map(d => d.clave))) });
    liq.asientoId = asentar({ fecha: f, detalle: 'Liquidación de comisiones de preventistas del ' + App.ui.fecha(desde) + ' al ' + App.ui.fecha(hasta) + ' (sobre lo ' + b + ')', origen: 'gasto', refId: liq.id,
      lineas: [{ cuenta: CUENTAS.comisionesAPagar, debe: usa }, { cuenta: CUENTAS.comisiones, debe: r2(total - usa) }, { cuenta: CUENTAS.banco, haber: total }] }).id;
    return liq;
  });

  // configuración de un módulo (por ejemplo, la del catálogo): queda en el registro como cualquier otro cambio
  accion('guardarConfig', function (clave, datos) {
    if (!clave) throw new Error('Falta la clave de la configuración.');
    db.config = db.config || {};
    db.config[clave] = JSON.parse(JSON.stringify(datos == null ? null : datos));
    return db.config[clave];
  });
  App.configModulo = (clave, porDefecto) => (db && db.config && db.config[clave] != null) ? db.config[clave] : (porDefecto === undefined ? null : porDefecto);

  // ---------- consultas ----------
  const q = App.q;
  // el precio final con IVA de cada lista se redondea a pesos (a múltiplos de $ 10 si es un bulto) y el neto se calcula hacia atrás:
  // así el almacenero ve precios redondos en el catálogo, en la preventa y en las góndolas
  function precioFinal(p, l) {
    const base = p.precios[l] != null ? p.precios[l] : Math.round(p.costo * 1.3);
    const con = base * (1 + p.iva / 100);
    return p.contenido > 1 ? Math.round(con / 10) * 10 : Math.round(con);
  }
  q.precio = (productoId, listaId) => { const p = App.get('productos', productoId); if (!p) return 0; return r2(precioFinal(p, listaId || 'L2') / (1 + p.iva / 100)); };
  q.precioConIVA = (productoId, listaId) => { const p = App.get('productos', productoId); return p ? precioFinal(p, listaId || 'L2') : 0; };
  q.lotes = (productoId, depositoId) => lotesActivos(productoId, depositoId).slice();
  q.stock = (productoId, depositoId) => {
    const hoy = hoyActual;
    let fisico = 0, vencido = 0;
    lotesActivos(productoId, null).forEach(l => {
      if (depositoId && l.depositoId !== depositoId) return;
      fisico += l.cantidad;
      if (l.vence && l.vence < hoy) vencido += l.cantidad;
    });
    let reservado = 0;
    if (depositoId) reservado = idx.reservado[productoId + '|' + depositoId] || 0;
    else db.depositos.forEach(d => { reservado += idx.reservado[productoId + '|' + d.id] || 0; });
    fisico = r2(fisico); vencido = r2(vencido); reservado = r2(reservado);
    return { fisico, reservado, vencido, disponible: r2(Math.max(0, fisico - vencido - reservado)) };
  };
  q.valorStock = (depositoId) => r2(db.lotes.reduce((s, l) => s + (l.cantidad > 0 && (!depositoId || l.depositoId === depositoId) ? l.cantidad * l.costo : 0), 0));
  q.bajoMinimo = () => db.productos.filter(p => p.activo !== false).map(p => {
    const st = q.stock(p.id);
    return { producto: p, productoId: p.id, stock: st.disponible, fisico: st.fisico, minimo: p.minimo, faltante: r2(p.minimo - st.disponible) };
  }).filter(x => x.stock < x.minimo).sort((a, b) => b.faltante / b.minimo - a.faltante / a.minimo);
  q.vencimientosProximos = (dias) => {
    const hoy = hoyActual, hasta = F.sumar(hoy, dias == null ? 7 : dias);
    return db.lotes.filter(l => l.cantidad > 0 && l.vence && l.vence <= hasta).map(l => ({
      lote: l, loteId: l.id, producto: App.get('productos', l.productoId), deposito: App.get('depositos', l.depositoId),
      vence: l.vence, dias: F.diferencia(hoy, l.vence), cantidad: l.cantidad, costo: r2(l.cantidad * l.costo)
    })).sort((a, b) => a.vence < b.vence ? -1 : 1);
  };

  q.saldoComprobante = (c) => { const cp = typeof c === 'string' ? App.get('comprobantes', c) : c; return cp && cp.clase === 'factura' ? r2(cp.total - cp.cobrado - cp.acreditado) : 0; };
  q.pendientesCliente = (clienteId) => db.comprobantes.filter(c => c.clienteId === clienteId && c.clase === 'factura' && q.saldoComprobante(c) > 0.01).sort((a, b) => a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : a.numero - b.numero);
  q.pendientesProveedor = (proveedorId) => db.comprasFacturas.filter(f => f.proveedorId === proveedorId && r2(f.total - f.pagado) > 0.01).sort((a, b) => a.fecha < b.fecha ? -1 : 1);
  q.saldoCliente = (id) => r2(db.movCtaCte.reduce((s, m) => m.entidad === 'cliente' && m.entidadId === id ? s + m.debe - m.haber : s, 0));
  q.saldoProveedor = (id) => r2(db.movCtaCte.reduce((s, m) => m.entidad === 'proveedor' && m.entidadId === id ? s + m.haber - m.debe : s, 0));
  function ctaCte(entidad, id, signo) {
    let saldo = 0;
    return db.movCtaCte.filter(m => m.entidad === entidad && m.entidadId === id).slice().sort((a, b) => a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0)
      .map(m => { saldo = r2(saldo + signo * (m.debe - m.haber)); return Object.assign({}, m, { saldo }); });
  }
  q.ctaCteCliente = id => ctaCte('cliente', id, 1);
  q.ctaCteProveedor = id => ctaCte('proveedor', id, -1);
  q.deudaVencida = (clienteId) => {
    const hoy = hoyActual;
    return r2(db.comprobantes.reduce((s, c) => c.clase === 'factura' && (!clienteId || c.clienteId === clienteId) && c.vence < hoy ? s + q.saldoComprobante(c) : s, 0));
  };
  q.antiguedadDeuda = () => {  // por cliente: al día, 1–30, 31–60, más de 60 días de vencida
    const hoy = hoyActual, res = {};
    db.comprobantes.forEach(c => {
      if (c.clase !== 'factura') return;
      const s = q.saldoComprobante(c); if (s <= 0.01) return;
      const r = res[c.clienteId] = res[c.clienteId] || { clienteId: c.clienteId, cliente: App.get('clientes', c.clienteId), alDia: 0, d30: 0, d60: 0, mas60: 0, total: 0 };
      const dias = F.diferencia(c.vence, hoy);
      if (dias <= 0) r.alDia += s; else if (dias <= 30) r.d30 += s; else if (dias <= 60) r.d60 += s; else r.mas60 += s;
      r.total += s;
    });
    return Object.values(res).map(r => { ['alDia', 'd30', 'd60', 'mas60', 'total'].forEach(k => { r[k] = r2(r[k]); }); return r; }).sort((a, b) => b.total - a.total);
  };
  q.chequesEnCartera = () => db.cheques.filter(c => c.estado === 'en_cartera').sort((a, b) => a.fechaPago < b.fechaPago ? -1 : 1);
  q.remitosSinHoja = () => db.remitos.filter(r => r.estado === 'pendiente');
  q.pedidosPendientes = () => db.pedidos.filter(p => p.estado === 'pendiente');
  q.recibosDeHoja = (hojaRutaId) => db.recibos.filter(r => r.hojaRutaId === hojaRutaId);

  const enRango = (f, desde, hasta) => (!desde || f >= desde) && (!hasta || f <= hasta);
  q.saldoCuenta = (cuenta, hasta, desde) => {
    const c = App.get('planCuentas', cuenta);
    let s = 0;
    db.asientos.forEach(a => { if (!enRango(a.fecha, desde, hasta)) return; a.lineas.forEach(l => { if (l.cuenta === cuenta) s += l.debe - l.haber; }); });
    return r2(c && (c.tipo === 'pasivo' || c.tipo === 'patrimonio' || c.tipo === 'ingreso') ? -s : s);
  };
  q.mayor = (cuenta, desde, hasta) => {
    const c = App.get('planCuentas', cuenta);
    if (!c) throw new Error('La cuenta ' + cuenta + ' no existe.');
    const deudora = c.tipo === 'activo' || c.tipo === 'egreso';
    let inicial = 0, saldo = 0, td = 0, th = 0;
    const movs = [];
    db.asientos.slice().sort((a, b) => a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : a.numero - b.numero).forEach(a => {
      a.lineas.forEach(l => {
        if (l.cuenta !== cuenta) return;
        const v = deudora ? l.debe - l.haber : l.haber - l.debe;
        if (desde && a.fecha < desde) { inicial += v; return; }
        if (hasta && a.fecha > hasta) return;
        td += l.debe; th += l.haber;
        movs.push({ fecha: a.fecha, asientoId: a.id, numero: a.numero, detalle: a.detalle, origen: a.origen, debe: l.debe, haber: l.haber, saldo: 0 });
      });
    });
    saldo = r2(inicial);
    movs.forEach(m => { saldo = r2(saldo + (deudora ? m.debe - m.haber : m.haber - m.debe)); m.saldo = saldo; });
    return { cuenta: c.codigo, nombre: c.nombre, tipo: c.tipo, saldoInicial: r2(inicial), movimientos: movs, totalDebe: r2(td), totalHaber: r2(th), saldoFinal: saldo };
  };
  function sumasPorCuenta(desde, hasta) {
    const m = {};
    db.asientos.forEach(a => {
      if (!enRango(a.fecha, desde, hasta)) return;
      a.lineas.forEach(l => { const x = m[l.cuenta] = m[l.cuenta] || { debe: 0, haber: 0 }; x.debe += l.debe; x.haber += l.haber; });
    });
    return m;
  }
  q.sumasYSaldos = (desde, hasta) => {
    const m = sumasPorCuenta(desde, hasta);
    let td = 0, th = 0;
    const filas = db.planCuentas.filter(c => c.imputable && m[c.codigo]).map(c => {
      const x = m[c.codigo]; td += x.debe; th += x.haber;
      const s = r2(x.debe - x.haber);
      return { codigo: c.codigo, nombre: c.nombre, tipo: c.tipo, debe: r2(x.debe), haber: r2(x.haber), saldoDeudor: s > 0 ? s : 0, saldoAcreedor: s < 0 ? -s : 0 };
    });
    return { filas, totalDebe: r2(td), totalHaber: r2(th) };
  };
  function erBase(desde, hasta) {
    const m = sumasPorCuenta(desde, hasta);
    const grupo = {};
    const detalle = { comerciales: [], administracion: [], financieros: [] };
    db.planCuentas.forEach(c => {
      if (!c.grupoER || !m[c.codigo]) return;
      const x = m[c.codigo];
      const v = c.tipo === 'ingreso' ? x.haber - x.debe : x.debe - x.haber;
      const imp = c.grupoER === 'devoluciones' ? -v : v;
      grupo[c.grupoER] = (grupo[c.grupoER] || 0) + imp;
      if (detalle[c.grupoER]) detalle[c.grupoER].push({ cuenta: c.codigo, nombre: c.nombre, importe: r2(imp) });
    });
    const g = k => r2(grupo[k] || 0);
    const ventasBrutas = g('ventas'), devoluciones = g('devoluciones'), ventasNetas = r2(ventasBrutas - devoluciones), cmv = g('cmv');
    const utilidadBruta = r2(ventasNetas - cmv);
    const tot = { comerciales: g('comerciales'), administracion: g('administracion'), financieros: g('financieros') };
    const iibb = g('iibb');
    const resultadoOperativo = r2(utilidadBruta - tot.comerciales - tot.administracion - iibb);
    const resultadoAntesGanancias = r2(resultadoOperativo - tot.financieros);
    const ganancias = g('ganancias');
    const resultadoNeto = r2(resultadoAntesGanancias - ganancias);
    return { desde, hasta, ventasBrutas, devoluciones, ventasNetas, cmv, utilidadBruta, margenBruto: ventasNetas ? utilidadBruta / ventasNetas : 0,
      gastos: detalle, totalGastos: tot, iibb, resultadoOperativo, resultadoAntesGanancias, ganancias, resultadoNeto,
      margenNeto: ventasNetas ? resultadoNeto / ventasNetas : 0 };
  }
  q.estadoResultados = (desde, hasta) => {
    desde = desde || CONFIG.desde; hasta = hasta || hoyActual;
    const er = erBase(desde, hasta);
    const rub = {};
    db.comprobantes.forEach(c => {
      if (!enRango(c.fecha, desde, hasta)) return;
      const s = c.clase === 'nc' ? -1 : 1;
      c.items.forEach(it => {
        const p = App.get('productos', it.productoId);
        const r = rub[p.rubro] = rub[p.rubro] || { rubro: p.rubro, ventas: 0, cmv: 0 };
        r.ventas += s * it.subtotal;
      });
      if (c.clase === 'factura') c.consumos.forEach(cn => { rub[App.get('productos', cn.productoId).rubro].cmv += cn.cantidad * cn.costo; });
      else if (c.reingresoStock) {
        // el costo devuelto se reparte en proporción a lo acreditado
        const totalNC = c.items.reduce((s2, it) => s2 + it.subtotal, 0) || 1;
        c.items.forEach(it => { rub[App.get('productos', it.productoId).rubro].cmv -= c.costo * it.subtotal / totalNC; });
      }
    });
    er.porRubro = Object.values(rub).map(r => ({ rubro: r.rubro, ventas: r2(r.ventas), cmv: r2(r.cmv), utilidad: r2(r.ventas - r.cmv), margen: r.ventas ? (r.ventas - r.cmv) / r.ventas : 0 })).sort((a, b) => b.ventas - a.ventas);
    er.porMes = F.meses(desde, hasta).map(m => {
      const ini = m + '-01' < desde ? desde : m + '-01', fin = F.finMes(m + '-01') > hasta ? hasta : F.finMes(m + '-01');
      const x = erBase(ini, fin);
      return { mes: m, etiqueta: F.nombreMes(m + '-01'), desde: ini, hasta: fin, completo: ini === m + '-01' && fin === F.finMes(m + '-01'),
        ventasNetas: x.ventasNetas, devoluciones: x.devoluciones, cmv: x.cmv, utilidadBruta: x.utilidadBruta, margenBruto: x.margenBruto,
        gastosComerciales: x.totalGastos.comerciales, gastosAdministracion: x.totalGastos.administracion, gastosFinancieros: x.totalGastos.financieros,
        iibb: x.iibb, resultadoOperativo: x.resultadoOperativo, ganancias: x.ganancias, resultadoNeto: x.resultadoNeto, margenNeto: x.margenNeto };
    });
    return er;
  };
  q.ventasPorDia = (desde, hasta) => {
    const m = {};
    db.comprobantes.forEach(c => {
      if (!enRango(c.fecha, desde, hasta)) return;
      const x = m[c.fecha] = m[c.fecha] || { fecha: c.fecha, comprobantes: 0, neto: 0, total: 0 };
      const s = c.clase === 'nc' ? -1 : 1;
      if (c.clase === 'factura') x.comprobantes++;
      x.neto += s * c.neto; x.total += s * c.total;
    });
    return Object.values(m).map(x => ({ fecha: x.fecha, comprobantes: x.comprobantes, neto: r2(x.neto), total: r2(x.total) })).sort((a, b) => a.fecha < b.fecha ? -1 : 1);
  };
  function libro(filas) {
    const totales = { neto21: 0, iva21: 0, neto105: 0, iva105: 0, neto: 0, iva: 0, total: 0 };
    filas.forEach(f => Object.keys(totales).forEach(k => { totales[k] += f[k] || 0; }));
    Object.keys(totales).forEach(k => { totales[k] = r2(totales[k]); });
    return { filas, totales };
  }
  q.libroIVAVentas = (mes) => libro(db.comprobantes.filter(c => c.fecha.slice(0, 7) === mes).sort((a, b) => a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : a.numero - b.numero).map(c => {
    const s = c.clase === 'nc' ? -1 : 1;
    return { fecha: c.fecha, tipo: c.tipo, nombreTipo: NOMBRE_TIPO[c.tipo], nro: c.nro, comprobanteId: c.id, razonSocial: c.razonSocial, cuit: c.cuit, condicionIVA: c.condicionIVA,
      neto21: s * c.neto21, iva21: s * c.iva21, neto105: s * c.neto105, iva105: s * c.iva105, neto: s * c.neto, iva: s * c.iva, total: s * c.total };
  }));
  // libro IVA compras: facturas de mercadería y facturas de gastos (alquiler, combustible, fletes, servicios…)
  q.libroIVACompras = (mes) => {
    const filas = db.comprasFacturas.filter(f => f.fecha.slice(0, 7) === mes).map(f => {
      const p = App.get('proveedores', f.proveedorId);
      return { fecha: f.fecha, tipo: 'F' + f.tipo, nombreTipo: 'Factura ' + f.tipo, nro: f.numero, facturaId: f.id, razonSocial: p.razonSocial, cuit: p.cuit, condicionIVA: 'RI', concepto: 'Mercadería',
        neto21: f.neto21, iva21: f.iva21, neto105: f.neto105, iva105: f.iva105, noGravado: 0, percepciones: r2((f.percepcionIIBB || 0) + (f.percepcionIVA || 0)), neto: f.neto, iva: f.iva, total: f.total };
    });
    db.asientos.forEach(a => {
      const g = a.compra; if (!g || a.fecha.slice(0, 7) !== mes || a.anuladoPor) return;
      filas.push({ fecha: a.fecha, tipo: 'F' + g.letra, nombreTipo: 'Factura ' + g.letra, nro: g.numero, asientoId: a.id, razonSocial: g.razonSocial, cuit: g.cuit, condicionIVA: 'RI', concepto: g.concepto,
        neto21: g.neto21, iva21: g.iva21, neto105: 0, iva105: 0, noGravado: g.noGravado || 0, percepciones: 0, neto: g.neto21, iva: g.iva21, total: g.total });
    });
    filas.sort((a, b) => a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0);
    const r = libro(filas);
    ['noGravado', 'percepciones'].forEach(k => { r.totales[k] = r2(filas.reduce((x, f) => x + f[k], 0)); });
    return r;
  };
  q.ventasPorCliente = (desde, hasta) => {
    const m = {};
    db.comprobantes.forEach(c => { if (!enRango(c.fecha, desde, hasta)) return; m[c.clienteId] = (m[c.clienteId] || 0) + (c.clase === 'nc' ? -c.neto : c.neto); });
    return Object.keys(m).map(id => ({ clienteId: id, cliente: App.get('clientes', id), neto: r2(m[id]) })).sort((a, b) => b.neto - a.neto);
  };
  q.ventasPorProducto = (desde, hasta) => {
    const m = {};
    db.comprobantes.forEach(c => { if (!enRango(c.fecha, desde, hasta)) return; const s = c.clase === 'nc' ? -1 : 1; c.items.forEach(it => { const x = m[it.productoId] = m[it.productoId] || { cantidad: 0, neto: 0 }; x.cantidad += s * it.cantidad; x.neto += s * it.subtotal; }); });
    return Object.keys(m).map(id => ({ productoId: id, producto: App.get('productos', id), cantidad: r2(m[id].cantidad), neto: r2(m[id].neto) })).sort((a, b) => b.neto - a.neto);
  };
  q.ventasPorPreventista = (desde, hasta) => {
    const m = {};
    db.comprobantes.forEach(c => { if (!enRango(c.fecha, desde, hasta)) return; const p = c.pedidoId ? App.get('pedidos', c.pedidoId) : (c.asociadoId ? App.get('pedidos', App.get('comprobantes', c.asociadoId).pedidoId) : null); const pv = p ? p.preventistaId : '—'; m[pv] = (m[pv] || 0) + (c.clase === 'nc' ? -c.neto : c.neto); });
    return Object.keys(m).map(id => ({ preventistaId: id, preventista: App.get('preventistas', id), neto: r2(m[id]) })).sort((a, b) => b.neto - a.neto);
  };
  q.buscar = (texto, limite) => {
    const t = App.ui.normalizar(texto || '').trim();
    if (t.length < 2) return [];
    const lim = limite || 8, res = [];
    const coincide = (...campos) => campos.some(c => c && App.ui.normalizar(String(c)).includes(t));
    db.productos.forEach(p => { if (coincide(p.descripcion, p.codigo, p.ean, p.marca, p.codigoPropio, p.plu)) res.push({ tipo: 'Producto', titulo: p.descripcion, detalle: p.codigo + ' · ' + p.marca, ruta: '#/stock/producto/' + p.id }); });
    db.clientes.forEach(c => { if (coincide(c.fantasia, c.razonSocial, c.cuit, c.codigo, c.localidad)) res.push({ tipo: 'Cliente', titulo: c.fantasia, detalle: c.razonSocial + ' · ' + c.localidad, ruta: '#/clientes/' + c.id }); });
    db.proveedores.forEach(p => { if (coincide(p.razonSocial, p.cuit, p.codigo)) res.push({ tipo: 'Proveedor', titulo: p.razonSocial, detalle: p.cuit, ruta: '#/proveedores/' + p.id }); });
    const tn = t.replace(/[^0-9]/g, '');
    if (tn.length >= 3) {
      for (let i = db.comprobantes.length - 1; i >= 0 && res.length < 60; i--) {
        const c = db.comprobantes[i];
        if (c.nro.replace('-', '').includes(tn) || String(c.numero) === tn) res.push({ tipo: NOMBRE_TIPO[c.tipo], titulo: c.tipo + ' ' + c.nro, detalle: c.razonSocial + ' · ' + App.ui.pesos(c.total), ruta: '#/facturacion/comprobante/' + c.id });
      }
      for (let i = db.recibos.length - 1; i >= 0 && res.length < 70; i--) {
        const r = db.recibos[i];
        if (r.nro.replace('-', '').includes(tn) || String(r.numero) === tn) res.push({ tipo: 'Recibo', titulo: 'RC ' + r.nro, detalle: (App.get('clientes', r.clienteId) || {}).fantasia + ' · ' + App.ui.pesos(r.total), ruta: '#/cobranzas/recibo/' + r.id });
      }
      for (let i = db.cheques.length - 1; i >= 0 && res.length < 75; i--) {
        const ch = db.cheques[i];
        if (String(ch.numero).includes(tn)) res.push({ tipo: ch.tipo === 'echeq' ? 'eCheq' : 'Cheque', titulo: ch.banco + ' n.º ' + ch.numero, detalle: ch.librador + ' · ' + App.ui.pesos(ch.importe), ruta: '#/cobranzas/cheque/' + ch.id });
      }
      for (let i = db.pedidos.length - 1; i >= 0 && res.length < 80; i--) {
        const p = db.pedidos[i];
        if (p.nro.includes(tn)) res.push({ tipo: 'Pedido', titulo: 'Pedido ' + p.nro, detalle: App.get('clientes', p.clienteId).fantasia + ' · ' + p.estado, ruta: '#/ventas/pedido/' + p.id });
      }
    }
    return res.slice(0, lim);
  };

  // ---------- verificación (la usan los agentes y la demo) ----------
  // Coherencia contable y de stock: tiene que dar vacío siempre, haga lo que haga la persona.
  // App.verificar({ semilla: true }) suma además los controles del escenario de arranque (App.verificarSemilla).
  App.verificar = function (opciones) {
    const prob = [];
    const ok = (cond, msg) => { if (!cond) prob.push(msg); };
    let D = 0, H = 0;
    db.asientos.forEach(a => {
      const d = r2(a.lineas.reduce((s, l) => s + l.debe, 0)), h = r2(a.lineas.reduce((s, l) => s + l.haber, 0));
      D += d; H += h;
      if (Math.abs(d - h) > 0.01) prob.push('El asiento ' + a.numero + ' no balancea (' + d + ' / ' + h + ').');
    });
    ok(Math.abs(D - H) < 0.05, 'La suma del debe (' + r2(D) + ') no es igual a la del haber (' + r2(H) + ').');
    db.lotes.forEach(l => { if (l.cantidad < -0.001) prob.push('El lote ' + l.lote + ' de ' + l.productoId + ' quedó negativo (' + l.cantidad + ').'); });
    db.productos.forEach(p => db.depositos.forEach(d => { const s = q.stock(p.id, d.id); if (s.fisico - s.vencido < s.reservado - 0.001) prob.push('«' + p.descripcion + '» en ' + d.nombre + ' tiene más reservado que stock.'); }));
    const dif = (a, b) => Math.abs(a - b) > 1;
    ok(!dif(q.valorStock(), q.saldoCuenta(CUENTAS.mercaderias)), 'El stock valorizado (' + q.valorStock() + ') no coincide con la cuenta Mercaderías (' + q.saldoCuenta(CUENTAS.mercaderias) + ').');
    let totCli = 0;
    db.clientes.forEach(c => {
      const s = q.saldoCliente(c.id);
      const mov = q.ctaCteCliente(c.id);
      const ult = mov.length ? mov[mov.length - 1].saldo : 0;
      totCli += s;
      const pend = r2(q.pendientesCliente(c.id).reduce((x, f) => x + q.saldoComprobante(f), 0));
      const favor = r2(db.recibos.filter(r => r.clienteId === c.id).reduce((x, r) => x + r.aCuenta, 0) + db.comprobantes.filter(n => n.clase === 'nc' && n.clienteId === c.id).reduce((x, n) => x + n.sinAplicar, 0));
      if (dif(s, ult)) prob.push('El saldo de ' + c.fantasia + ' no es igual al último saldo de su cuenta corriente.');
      if (dif(s, pend - favor)) prob.push('El saldo de ' + c.fantasia + ' (' + s + ') no coincide con sus facturas pendientes (' + pend + ') menos su saldo a favor (' + favor + ').');
    });
    ok(!dif(totCli, q.saldoCuenta(CUENTAS.deudores)), 'La suma de saldos de clientes (' + r2(totCli) + ') no es igual a Deudores por ventas (' + q.saldoCuenta(CUENTAS.deudores) + ').');
    let totProv = 0;
    db.proveedores.forEach(p => {
      const s = q.saldoProveedor(p.id); totProv += s;
      const pend = r2(q.pendientesProveedor(p.id).reduce((x, f) => x + f.total - f.pagado, 0));
      const aCuenta = r2(db.pagos.filter(x => x.proveedorId === p.id).reduce((x, y) => x + y.aCuenta, 0));
      if (dif(s, pend - aCuenta)) prob.push('El saldo con ' + p.razonSocial + ' (' + s + ') no coincide con sus facturas impagas (' + pend + ').');
    });
    ok(!dif(totProv, q.saldoCuenta(CUENTAS.proveedores)), 'La suma de saldos de proveedores (' + r2(totProv) + ') no es igual a la cuenta Proveedores (' + q.saldoCuenta(CUENTAS.proveedores) + ').');
    const cartera = r2(q.chequesEnCartera().reduce((s, c) => s + c.importe, 0));
    ok(!dif(cartera, q.saldoCuenta(CUENTAS.valores)), 'Los cheques en cartera (' + cartera + ') no coinciden con Valores a depositar (' + q.saldoCuenta(CUENTAS.valores) + ').');
    ok(q.saldoCuenta(CUENTAS.banco) > 0, 'El banco quedó en negativo (' + q.saldoCuenta(CUENTAS.banco) + ').');
    ok(q.saldoCuenta(CUENTAS.caja) >= 0, 'La caja quedó en negativo.');
    const er = q.estadoResultados(CONFIG.desde, CONFIG.hoy);
    er.porMes.forEach(m => {
      if (!m.completo) return;
      if (m.ventasNetas < 150e6 || m.ventasNetas > 220e6) prob.push('Las ventas de ' + m.etiqueta + ' (' + App.ui.pesos(m.ventasNetas) + ') están fuera de $ 150–220 M.');
      if (m.margenBruto < 0.18 || m.margenBruto > 0.24) prob.push('El margen bruto de ' + m.etiqueta + ' (' + (m.margenBruto * 100).toFixed(1) + ' %) está fuera de 18–24 %.');
    });
    ok(er.resultadoNeto > 0, 'El resultado neto del período no es positivo.');
    if (opciones && opciones.semilla) prob.push(...App.verificarSemilla());
    return prob;
  };
  // Controles del escenario de arranque de la demo (que haya pendientes para mostrar). No son de coherencia:
  // un uso normal (facturar todo, armar la hoja con todos los remitos, recibir mercadería) los cambia.
  App.verificarSemilla = function () {
    const prob = [];
    const ok = (cond, msg) => { if (!cond) prob.push(msg); };
    const bm = q.bajoMinimo().length;
    ok(bm >= 3 && bm <= 5, 'Hay ' + bm + ' productos bajo mínimo (se esperan entre 3 y 5).');
    ok(q.vencimientosProximos(7).some(v => v.producto.rubro === 'Lácteos y frescos' && v.dias >= 0), 'No hay lotes de lácteos por vencer esta semana.');
    ok(q.pedidosPendientes().length > 0, 'No hay pedidos de preventa pendientes de facturar.');
    ok(q.remitosSinHoja().length > 0, 'No hay remitos para armar la hoja de ruta de mañana.');
    ok(q.chequesEnCartera().length > 0, 'No hay cheques en cartera.');
    ok(App.tiempoGeneracion < 1000, 'La generación tardó ' + Math.round(App.tiempoGeneracion) + ' ms (tiene que ser menos de 1 s).');
    return prob;
  };

  // ---------- generación y persistencia ----------
  function leerRegistro() {
    if (App.persistencia) return App.persistencia.leer();
    try { const x = JSON.parse(localStorage.getItem(CONFIG.clave) || 'null'); return x && Array.isArray(x.registro) ? x.registro : []; } catch (e) { return []; }
  }
  function guardar(nuevo, resultado) {
    if (App.persistencia) { if (nuevo) App.persistencia.agregar(nuevo, resultado); return; }
    try { localStorage.setItem(CONFIG.clave, JSON.stringify({ v: 1, registro })); } catch (e) { /* sin almacenamiento: sigue igual */ }
  }
  function generar() {
    const t0 = (typeof performance !== 'undefined' ? performance : Date).now();
    generando = true;
    try {
      db = App.db = S.maestros();
      COLECCIONES.forEach(c => { db[c] = db[c] || []; });
      reindexar();
      hoyActual = CONFIG.desde;
      S.historia(App);
      hoyActual = CONFIG.hoy;
      if (S.extras && !App.persistencia) { const guardado = db.contadores.id; db.contadores.id = 1600000; S.extras(App); db.contadores.id = guardado; }
      App.tiempoGeneracion = (typeof performance !== 'undefined' ? performance : Date).now() - t0;
      const validos = [];
      rechazados = [];
      registro.forEach(r => {
        hoyActual = r.f || CONFIG.hoy;
        claveAccion = r.k || null; subId = 0;
        try { App.acciones[r.a].apply(null, JSON.parse(JSON.stringify(r.args))); validos.push(r); } catch (e) { r.error = e.message; rechazados.push(r); console.warn('No se pudo volver a aplicar «' + r.a + '»: ' + e.message); }
        finally { claveAccion = null; }
      });
      registro = validos;
    } finally { generando = false; hoyActual = CONFIG.hoy; }
    return rechazados;
  }
  let rechazados = [];
  // la nube trae la lista completa de movimientos (los confirmados más los propios que faltan subir): se regenera todo en orden
  App.reemplazarRegistro = function (lista) { registro = lista.slice(); const r = generar(); App.emit('cambio'); return r; };
  App.registro = () => registro;
  let preparado = false, escuchaOtrasPestanas = false;
  // relee lo que hicieron otras pestañas del mismo navegador, regenera y avisa con 'cambio'
  App.recargarRegistro = function () { registro = leerRegistro(); generar(); App.emit('cambio'); };
  App.prepararDatos = function () {
    if (preparado) return App.db;
    registro = leerRegistro(); generar(); preparado = true;
    if (!escuchaOtrasPestanas && typeof window !== 'undefined' && window.addEventListener) {
      escuchaOtrasPestanas = true;
      window.addEventListener('storage', e => { if (e.key === CONFIG.clave || e.key === null) App.recargarRegistro(); });
    }
    return App.db;
  };
  App.reiniciar = function () { registro = []; guardar(); generar(); App.emit('cambio'); App.emit('reinicio'); };
  App.cambiosDeLaSesion = () => registro.length;

  // ---------- utilidades de UI ----------
  const ui = App.ui;
  const fmtPesos = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtNum = {};
  ui.pesos = n => fmtPesos.format(Number(n) || 0).replace(/ /g, ' ');
  ui.pesosCorto = n => { const v = Number(n) || 0; const a = Math.abs(v); return a >= 1e6 ? '$ ' + ui.num(v / 1e6, 1) + ' M' : a >= 1e3 ? '$ ' + ui.num(v / 1e3, 0) + ' mil' : ui.pesos(v); };
  ui.num = (n, dec) => { const d = dec || 0; fmtNum[d] = fmtNum[d] || new Intl.NumberFormat('es-AR', { minimumFractionDigits: d, maximumFractionDigits: d }); return fmtNum[d].format(Number(n) || 0); };
  ui.porcentaje = (x, dec) => ui.num((Number(x) || 0) * 100, dec == null ? 1 : dec) + ' %';
  ui.fecha = d => { if (!d) return ''; const s = typeof d === 'string' ? d : new Date(d).toISOString(); return s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4); };
  ui.fechaLarga = d => F.nombreDia(d) + ' ' + ui.fecha(d);
  ui.normalizar = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  ui.escapar = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ESC[c]);
  // HTML seguro: un String marcado; App.ui.h no lo vuelve a escapar
  ui.seguro = html => { const s = new String(html); s.__seguro = true; return s; };
  const valorH = v => v == null || v === false ? '' : Array.isArray(v) ? v.map(valorH).join('') : (v && v.__seguro) ? String(v) : ui.escapar(v);
  ui.h = (strings, ...valores) => { let out = strings[0]; valores.forEach((v, i) => { out += valorH(v) + strings[i + 1]; }); return ui.seguro(out); };

  ui.chip = (texto, tono) => ui.seguro('<span class="chip chip-' + (tono || 'neutro') + '">' + ui.escapar(texto) + '</span>');
  const ESTADOS = {
    pendiente: ['Pendiente', 'alerta'], facturado: ['Facturado', 'ok'], cancelado: ['Cancelado', 'neutro'],
    en_ruta: ['En reparto', 'info'], entregado: ['Entregado', 'ok'], rechazado: ['Rechazado', 'peligro'], parcial: ['Entrega parcial', 'alerta'],
    armada: ['Armada', 'info'], en_curso: ['En curso', 'info'], cerrada: ['Cerrada', 'ok'],
    en_cartera: ['En cartera', 'info'], depositado: ['Depositado', 'ok'], endosado: ['Endosado', 'neutro'],
    recibida: ['Recibida', 'ok'], vencida: ['Vencida', 'peligro'], pagada: ['Pagada', 'ok'], cobrada: ['Cobrada', 'ok'],
    modificado: ['Modificado', 'neutro'], anulado: ['Anulado', 'neutro'], terminada: ['Terminada', 'ok']
  };
  ui.estado = estado => { const e = ESTADOS[estado] || [estado, 'neutro']; return ui.chip(e[0], e[1]); };
  ui.kpi = ({ titulo, valor, detalle, tono }) => ui.h`<div class="kpi${tono ? ' kpi-' + tono : ''}"><div class="kpi-titulo">${titulo}</div><div class="kpi-valor">${valor}</div>${detalle ? ui.h`<div class="kpi-detalle">${detalle}</div>` : ''}</div>`;
  ui.franjaKpi = lista => ui.h`<div class="franja-kpi">${lista.map(ui.kpi)}</div>`;

  function nodo(x) {
    if (x instanceof Node) return x;
    const t = document.createElement('template');
    t.innerHTML = String(x == null ? '' : x).trim();
    return t.content.childNodes.length === 1 ? t.content.firstChild : t.content;
  }
  ui.nodo = nodo;
  function llenarCelda(td, v) {
    if (v instanceof Node) td.appendChild(v);
    else if (v && v.__seguro) td.innerHTML = String(v);
    else td.textContent = v == null ? '' : String(v);
  }
  ui.tabla = ({ columnas, filas, alClic, vacio, clase, pie, filaClase, limite }) => {
    const env = document.createElement('div');
    env.className = 'tabla-envoltura' + (clase ? ' ' + clase : '');
    let orden = null, dir = 1, datos = filas || [];
    function valorOrden(col, f) { return col.ordenar ? col.ordenar(f) : col.campo ? f[col.campo] : null; }
    function dibujar() {
      env.innerHTML = '';
      if (!datos.length) { const v = document.createElement('div'); v.className = 'vacio'; llenarCelda(v, vacio || 'Sin registros para mostrar.'); env.appendChild(v); return; }
      const t = document.createElement('table');
      t.className = 'tabla';
      const th = t.createTHead().insertRow();
      columnas.forEach((c, i) => {
        const cel = document.createElement('th');
        cel.textContent = c.titulo || '';
        if (c.alinear) cel.classList.add('al-' + c.alinear);
        if (c.clase) String(c.clase).split(/\s+/).filter(Boolean).forEach(k => cel.classList.add(k));
        if (c.ancho) cel.style.width = c.ancho;
        if (c.campo || c.ordenar) {
          cel.classList.add('ordenable'); cel.tabIndex = 0;
          cel.setAttribute('aria-sort', orden === i ? (dir > 0 ? 'ascending' : 'descending') : 'none');
          const ord = () => { if (orden === i) dir = -dir; else { orden = i; dir = 1; } dibujar(); };
          cel.addEventListener('click', ord);
          cel.addEventListener('keydown', e => { if (e.key === 'Enter') ord(); });
        }
        th.appendChild(cel);
      });
      let lista = datos;
      if (orden != null) {
        const c = columnas[orden];
        lista = datos.slice().sort((a, b) => { const x = valorOrden(c, a), y = valorOrden(c, b); return (x > y ? 1 : x < y ? -1 : 0) * dir; });
      }
      const mostrar = limite && lista.length > limite ? lista.slice(0, limite) : lista;
      const tb = t.createTBody();
      mostrar.forEach(f => {
        const tr = tb.insertRow();
        if (filaClase) { const fc = filaClase(f); if (fc) tr.className = fc; }
        columnas.forEach(c => {
          const td = tr.insertCell();
          if (c.alinear) td.classList.add('al-' + c.alinear);
          if (c.clase) td.className += ' ' + c.clase;
          llenarCelda(td, c.valor ? c.valor(f) : f[c.campo]);
        });
        if (alClic) {
          tr.classList.add('clicable'); tr.tabIndex = 0;
          tr.addEventListener('click', e => { if (e.target.closest('button, a, input, select, label')) return; alClic(f, e); });
          tr.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target === tr) alClic(f, e); });
        }
      });
      if (pie) {
        const tf = t.createTFoot().insertRow();
        columnas.forEach((c, i) => { const td = tf.insertCell(); if (c.alinear) td.classList.add('al-' + c.alinear); if (c.clase) String(c.clase).split(/\s+/).filter(Boolean).forEach(k => td.classList.add(k)); llenarCelda(td, pie[i]); });
      }
      env.appendChild(t);
      if (limite && lista.length > limite) {
        const mas = document.createElement('div');
        mas.className = 'tabla-mas';
        mas.innerHTML = 'Se muestran ' + limite + ' de ' + ui.num(lista.length) + '. ';
        const b = document.createElement('button'); b.className = 'btn btn-fantasma btn-chico'; b.textContent = 'Ver todos';
        b.addEventListener('click', () => { limite = 0; dibujar(); });
        mas.appendChild(b); env.appendChild(mas);
      }
    }
    dibujar();
    env.actualizar = nuevas => { datos = nuevas || []; dibujar(); };
    return env;
  };

  let modalesAbiertos = 0;
  ui.modal = ({ titulo, cuerpo, acciones, ancho, alCerrar }) => {
    const fondo = document.createElement('div');
    fondo.className = 'modal-fondo';
    const anterior = document.activeElement;
    fondo.innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="mt' + (++modalesAbiertos) + '"><div class="modal-cabeza"><h2 id="mt' + modalesAbiertos + '"></h2><button class="modal-cerrar" aria-label="Cerrar">×</button></div><div class="modal-cuerpo"></div><div class="modal-pie"></div></div>';
    const m = fondo.firstChild;
    if (ancho) m.style.maxWidth = typeof ancho === 'number' ? ancho + 'px' : ancho;
    m.querySelector('h2').textContent = titulo || '';
    const c = m.querySelector('.modal-cuerpo');
    if (cuerpo instanceof Node) c.appendChild(cuerpo); else c.innerHTML = String(cuerpo == null ? '' : cuerpo);
    const piso = m.querySelector('.modal-pie');
    let cerrado = false;
    const cerrar = () => { if (cerrado) return; cerrado = true; fondo.remove(); document.removeEventListener('keydown', tecla); if (anterior && anterior.isConnected && anterior.focus) anterior.focus(); if (alCerrar) alCerrar(); if (renderPendiente && !document.querySelector('.modal-fondo')) { renderPendiente = false; renderizar(true); } };
    (acciones || [{ texto: 'Cerrar', tipo: 'secundario' }]).forEach(a => {
      const b = document.createElement('button');
      b.className = 'btn btn-' + (a.tipo || 'secundario');
      b.textContent = a.texto;
      b.addEventListener('click', () => {
        if (!a.alClic) return cerrar();
        try { const r = a.alClic({ cerrar, cuerpo: c, modal: m }); if (r !== false) cerrar(); }
        catch (e) { ui.toast(e.message, 'peligro'); }
      });
      piso.appendChild(b);
    });
    function tecla(e) {
      if (e.key === 'Escape') cerrar();
      if (e.key === 'Tab') {
        const foc = m.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (!foc.length) return;
        const pri = foc[0], ult = foc[foc.length - 1];
        if (e.shiftKey && document.activeElement === pri) { e.preventDefault(); ult.focus(); }
        else if (!e.shiftKey && document.activeElement === ult) { e.preventDefault(); pri.focus(); }
      }
    }
    m.querySelector('.modal-cerrar').addEventListener('click', cerrar);
    fondo.addEventListener('mousedown', e => { if (e.target === fondo) cerrar(); });
    document.addEventListener('keydown', tecla);
    document.body.appendChild(fondo);
    const primero = c.querySelector('input, select, textarea') || piso.querySelector('.btn-primario, .btn-senal, .btn-peligro') || piso.querySelector('button');
    if (primero) setTimeout(() => primero.focus(), 0);
    return { el: m, cuerpo: c, cerrar };
  };
  ui.confirmar = (texto, opciones) => new Promise(res => {
    const o = opciones || {};
    let resuelto = false;
    ui.modal({ titulo: o.titulo || 'Confirmar', cuerpo: ui.h`<p>${texto}</p>`, ancho: 460,
      alCerrar: () => { if (!resuelto) res(false); },
      acciones: [{ texto: o.cancelar || 'Volver', tipo: 'secundario' }, { texto: o.aceptar || 'Confirmar', tipo: o.tipo || 'primario', alClic: () => { resuelto = true; res(true); } }] });
  });

  // antes de facturar un pedido de un cliente pasado del límite: el mismo aviso en Ventas, Catálogo e Inicio.
  // Devuelve true si hay que facturar; con «Cobrar primero» abre la carga del recibo de ese cliente.
  App.confirmarLimite = pedidoId => new Promise(res => {
    const p = App.get('pedidos', pedidoId);
    const c = p && App.get('clientes', p.clienteId);
    if (!p || !c || c.tipo === 'Mostrador') return res(true);
    const saldo = q.saldoCliente(c.id);
    if (!(p.alertas && p.alertas.length) && saldo + p.total <= c.limiteCredito) return res(true);
    let hecho = false;
    ui.modal({ titulo: 'Límite de crédito excedido', ancho: 480,
      cuerpo: ui.h`<p style="margin-top:0">${c.fantasia} registra un saldo de ${ui.pesos(saldo)}; con este pedido de ${ui.pesos(p.total)} excede su límite de crédito de ${ui.pesos(c.limiteCredito)}.${q.deudaVencida(c.id) > 0.01 ? ui.h` Deuda vencida: ${ui.pesos(q.deudaVencida(c.id))}.` : ''}</p><p style="margin-bottom:0">¿Se emite la factura de todos modos?</p>`,
      alCerrar: () => { if (!hecho) res(false); },
      acciones: [
        { texto: 'Registrar cobranza primero', tipo: 'secundario', alClic: () => { hecho = true; res(false); setTimeout(() => ui.ir('#/cobranzas/nuevo/' + c.id), 0); } },
        { texto: 'Facturar de todos modos', tipo: 'primario', alClic: () => { hecho = true; res(true); } }] });
  });

  let pilaToast = null;
  ui.toast = (texto, tipo) => {
    if (typeof document === 'undefined') return;
    if (!pilaToast || !pilaToast.isConnected) { pilaToast = document.createElement('div'); pilaToast.className = 'toasts'; pilaToast.setAttribute('role', 'status'); pilaToast.setAttribute('aria-live', 'polite'); document.body.appendChild(pilaToast); }
    const t = document.createElement('div');
    t.className = 'toast toast-' + (tipo || 'ok');
    t.textContent = texto;
    pilaToast.appendChild(t);
    setTimeout(() => { t.classList.add('saliendo'); setTimeout(() => t.remove(), 300); }, tipo === 'peligro' ? 6000 : 3000);
  };
  // corre una acción y avisa: App.intentar(() => App.acciones.facturarPedido(id), 'Pedido facturado')
  App.intentar = (fn, mensajeOk) => {
    try { const r = fn(); if (mensajeOk) ui.toast(typeof mensajeOk === 'function' ? mensajeOk(r) : mensajeOk, 'ok'); return r; }
    catch (e) { ui.toast(e.message, 'peligro'); return null; }
  };

  ui.buscador = (input, alFiltrar, espera) => {
    let t = null;
    input.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => alFiltrar(ui.normalizar(input.value).trim(), input.value), espera == null ? 120 : espera); });
    input.addEventListener('keydown', e => { if (e.key === 'Escape' && input.value) { input.value = ''; alFiltrar('', ''); } });
    return { limpiar: () => { input.value = ''; alFiltrar('', ''); } };
  };
  ui.coincide = (texto, ...campos) => !texto || campos.some(c => ui.normalizar(c).includes(texto));

  const pestanaElegida = {};
  ui.pestanas = (el, tabs, opciones) => {
    const o = opciones || {};
    const clave = o.clave || (location.hash.split('/').slice(0, 2).join('/') + ':' + tabs.map(t => t.id).join(','));
    const barra = document.createElement('div');
    barra.className = 'pestanas'; barra.setAttribute('role', 'tablist');
    const panel = document.createElement('div');
    panel.className = 'pestana-panel'; panel.setAttribute('role', 'tabpanel');
    let activa = o.activa || pestanaElegida[clave] || tabs[0].id;
    if (!tabs.find(t => t.id === activa)) activa = tabs[0].id;
    const botones = tabs.map(t => {
      const b = document.createElement('button');
      b.className = 'pestana'; b.setAttribute('role', 'tab'); b.type = 'button';
      b.innerHTML = ui.escapar(t.titulo) + (t.cuenta != null ? ' <span class="pestana-cuenta">' + ui.escapar(t.cuenta) + '</span>' : '');
      b.addEventListener('click', () => activar(t.id));
      b.addEventListener('keydown', e => {
        const i = tabs.indexOf(t);
        if (e.key === 'ArrowRight') { activar(tabs[(i + 1) % tabs.length].id); botones[(i + 1) % tabs.length].focus(); }
        if (e.key === 'ArrowLeft') { activar(tabs[(i - 1 + tabs.length) % tabs.length].id); botones[(i - 1 + tabs.length) % tabs.length].focus(); }
      });
      barra.appendChild(b);
      return b;
    });
    function activar(id) {
      activa = id; pestanaElegida[clave] = id;
      botones.forEach((b, i) => { const on = tabs[i].id === id; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; });
      panel.innerHTML = '';
      const t = tabs.find(x => x.id === id);
      try { t.render(panel); } catch (e) { console.error(e); panel.innerHTML = '<div class="vacio">Error al mostrar esta sección: ' + ui.escapar(e.message) + '</div>'; }
      if (o.alCambiar) o.alCambiar(id);
    }
    el.appendChild(barra); el.appendChild(panel);
    activar(activa);
    return { activar, get activa() { return activa; }, panel };
  };

  ui.leerFormulario = form => {
    const o = {};
    form.querySelectorAll('[name]').forEach(c => {
      if (c.type === 'checkbox') o[c.name] = c.checked;
      else if (c.type === 'number') o[c.name] = c.value === '' ? null : Number(c.value);
      else o[c.name] = c.value;
    });
    return o;
  };
  ui.opciones = (lista, valor, texto, elegido) => ui.seguro(lista.map(x => '<option value="' + ui.escapar(x[valor]) + '"' + (x[valor] === elegido ? ' selected' : '') + '>' + ui.escapar(typeof texto === 'function' ? texto(x) : x[texto]) + '</option>').join(''));

  // CSV para el Excel en castellano: punto y coma, coma decimal y BOM UTF-8
  ui.descargarCSV = (nombre, encabezados, filas, opciones) => {
    const o = opciones || {};
    const celda = v => {
      if (v == null) return '';
      if (typeof v === 'number') return v.toFixed(o.decimales == null ? 2 : o.decimales).replace('.', ',');
      let s = String(v);
      if (/[";\r\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
      return s;
    };
    const texto = '\uFEFF' + [encabezados].concat(filas).map(f => f.map(celda).join(';')).join('\r\n');
    try {
      const url = URL.createObjectURL(new Blob([texto], { type: 'text/csv;charset=utf-8' }));
      const a = document.createElement('a');
      a.href = url; a.download = nombre; a.style.display = 'none';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      if (o.aviso !== false) ui.toast('Archivo exportado: ' + nombre + ' (' + ui.num(filas.length) + ' filas)', 'ok');
      return true;
    } catch (e) { ui.toast('No se pudo generar el archivo: ' + e.message, 'peligro'); return false; }
  };

  ui.imprimir = (html, opciones) => {
    const o = opciones || {};
    const ifr = document.createElement('iframe');
    ifr.className = 'marco-impresion';
    ifr.setAttribute('aria-hidden', 'true');
    ifr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
    document.body.appendChild(ifr);
    const css = new URL('css/app.css', document.baseURI).href;
    const doc = ifr.contentDocument;
    doc.open();
    doc.write('<!doctype html><html lang="es-AR"><head><meta charset="utf-8"><title>' + ui.escapar(o.titulo || CONFIG.negocio) + '</title>' +
      '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&display=swap">' +
      '<link rel="stylesheet" href="' + css + '">' + (o.css ? '<style>' + String(o.css).replace(/<\/style/gi, '<\\/style') + '</style>' : '') + '</head><body class="impresion' + (o.clase ? ' ' + o.clase : '') + '">' + String(html) + '</body></html>');
    doc.close();
    let hecho = false;
    const lanzar = () => { if (hecho) return; hecho = true; try { ifr.contentWindow.focus(); ifr.contentWindow.print(); } catch (e) { console.error(e); } setTimeout(() => ifr.remove(), 60000); };
    ifr.addEventListener('load', () => setTimeout(lanzar, 250));
    setTimeout(lanzar, 1500);
  };

  // --- código de barras EAN-13 real ---
  const EAN_L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
  const EAN_G = EAN_L.map(c => c.split('').map(b => b === '1' ? '0' : '1').reverse().join(''));
  const EAN_R = EAN_L.map(c => c.split('').map(b => b === '1' ? '0' : '1').join(''));
  const EAN_PARIDAD = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];
  ui.barcodeEAN13 = (codigo, opciones) => {
    const o = opciones || {};
    let c = String(codigo || '').replace(/\D/g, '');
    if (c.length === 12) c += F.digitoEAN(c);
    if (c.length !== 13) return ui.seguro('<svg class="ean13" viewBox="0 0 113 80" role="img" aria-label="Código inválido"><text x="56" y="40" text-anchor="middle" font-size="9">Código inválido</text></svg>');
    const par = EAN_PARIDAD[Number(c[0])];
    let bits = '101';
    for (let i = 1; i <= 6; i++) bits += (par[i - 1] === 'L' ? EAN_L : EAN_G)[Number(c[i])];
    bits += '01010';
    for (let i = 7; i <= 12; i++) bits += EAN_R[Number(c[i])];
    bits += '101';
    const guardas = new Set();
    [0, 1, 2, 45, 46, 47, 48, 49, 92, 93, 94].forEach(i => guardas.add(i));
    const x0 = 11, alto = o.alto || 62, conTexto = o.texto !== false;
    let rects = '';
    for (let i = 0; i < 95;) {
      if (bits[i] === '1') {
        let j = i; while (j < 95 && bits[j] === '1' && guardas.has(j) === guardas.has(i)) j++;
        const h = guardas.has(i) ? alto + 6 : alto;
        rects += '<rect x="' + (x0 + i) + '" y="4" width="' + (j - i) + '" height="' + h + '"/>';
        i = j;
      } else i++;
    }
    const ty = alto + 14;
    const txt = conTexto ? '<g font-family="Archivo, Arial, sans-serif" font-size="10.5" font-weight="500" text-anchor="middle" fill="currentColor" style="font-variant-numeric:tabular-nums">' +
      '<text x="' + (x0 - 5) + '" y="' + ty + '">' + c[0] + '</text>' +
      c.slice(1, 7).split('').map((d, i) => '<text x="' + (x0 + 3 + 7 * i + 3.5) + '" y="' + ty + '">' + d + '</text>').join('') +
      c.slice(7).split('').map((d, i) => '<text x="' + (x0 + 50 + 7 * i + 3.5) + '" y="' + ty + '">' + d + '</text>').join('') + '</g>' : '';
    const vh = conTexto ? alto + 18 : alto + 12;
    return ui.seguro('<svg class="ean13" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 113 ' + vh + '"' + (o.ancho ? ' width="' + o.ancho + '"' : '') +
      ' role="img" aria-label="Código de barras ' + c + '" shape-rendering="crispEdges"><rect width="113" height="' + vh + '" fill="#fff"/><g fill="currentColor">' + rects + '</g>' + txt + '</svg>');
  };

  // --- Code 39: para códigos propios con letras ---
  const C39 = { '0': 'nnnwwnwnn', '1': 'wnnwnnnnw', '2': 'nnwwnnnnw', '3': 'wnwwnnnnn', '4': 'nnnwwnnnw', '5': 'wnnwwnnnn', '6': 'nnwwwnnnn', '7': 'nnnwnnwnw', '8': 'wnnwnnwnn', '9': 'nnwwnnwnn',
    A: 'wnnnnwnnw', B: 'nnwnnwnnw', C: 'wnwnnwnnn', D: 'nnnnwwnnw', E: 'wnnnwwnnn', F: 'nnwnwwnnn', G: 'nnnnnwwnw', H: 'wnnnnwwnn', I: 'nnwnnwwnn', J: 'nnnnwwwnn',
    K: 'wnnnnnnww', L: 'nnwnnnnww', M: 'wnwnnnnwn', N: 'nnnnwnnww', O: 'wnnnwnnwn', P: 'nnwnwnnwn', Q: 'nnnnnnwww', R: 'wnnnnnwwn', S: 'nnwnnnwwn', T: 'nnnnwnwwn',
    U: 'wwnnnnnnw', V: 'nwwnnnnnw', W: 'wwwnnnnnn', X: 'nwnnwnnnw', Y: 'wwnnwnnnn', Z: 'nwwnwnnnn', '-': 'nwnnnnwnw', '.': 'wwnnnnwnn', ' ': 'nwwnnnwnn',
    '$': 'nwnwnwnnn', '/': 'nwnwnnnwn', '+': 'nwnnnwnwn', '%': 'nnnwnwnwn', '*': 'nwnnwnwnn' };
  ui.barcodeCode39 = (texto, opciones) => {
    const o = opciones || {};
    const t = String(texto || '').toUpperCase().split('').filter(ch => C39[ch] && ch !== '*').join('');
    const todo = '*' + t + '*';
    let x = 8, rects = '';
    todo.split('').forEach(ch => {
      C39[ch].split('').forEach((w, i) => { const a = w === 'w' ? 3 : 1; if (i % 2 === 0) rects += '<rect x="' + x + '" y="4" width="' + a + '" height="' + (o.alto || 62) + '"/>'; x += a; });
      x += 1;
    });
    const ancho = x + 7, alto = o.alto || 62, conTexto = o.texto !== false, vh = conTexto ? alto + 18 : alto + 8;
    const txt = conTexto ? '<text x="' + (ancho / 2) + '" y="' + (alto + 15) + '" text-anchor="middle" font-family="Archivo, Arial, sans-serif" font-size="10.5" font-weight="500" fill="currentColor">' + ui.escapar(t) + '</text>' : '';
    return ui.seguro('<svg class="ean13 code39" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + ancho + ' ' + vh + '"' + (o.ancho ? ' width="' + o.ancho + '"' : '') +
      ' role="img" aria-label="Código de barras ' + ui.escapar(t) + '" shape-rendering="crispEdges"><rect width="' + ancho + '" height="' + vh + '" fill="#fff"/><g fill="currentColor">' + rects + '</g>' + txt + '</svg>');
  };
  // el código de barras de un producto: cual = 'ean' (fabricante) o 'propio'
  ui.barcodeProducto = (p, opciones) => {
    const o = opciones || {};
    const c = o.cual === 'propio' && p.codigoPropio ? p.codigoPropio : p.ean;
    return App.f.tipoCodigo(c) === 'ean13' ? ui.barcodeEAN13(c, o) : ui.barcodeCode39(c, o);
  };
  // etiqueta de balanza (pesables): 2 + 0 + PLU (4) + 0 + gramos (5) + verificador
  App.f.eanBalanza = (plu, kilos) => { const doce = '20' + pad(String(plu || '0').slice(-4), 4) + '0' + pad(Math.round((Number(kilos) || 0) * 1000) % 100000, 5); return doce + F.digitoEAN(doce); };

  // --- búsqueda de fotos (simulada en la demo): resultados con aspecto de foto de producto ---
  const SITIOS = ['mercadolibre.com.ar', 'carrefour.com.ar', 'cotodigital.com.ar', 'diaonline.com.ar', 'vea.com.ar', 'masonline.com.ar'];
  const TONOS_RUBRO = { 'Almacén': ['#C8572B', '#E9B44C', '#2F6B3B', '#7A3B2E'], 'Bebidas': ['#B3261E', '#1F6FB2', '#2E8B57', '#E0A800'], 'Lácteos y frescos': ['#2B5C8A', '#A0522D', '#C0392B', '#6B8E23'],
    'Limpieza': ['#1E88E5', '#7CB342', '#8E24AA', '#00897B'], 'Perfumería': ['#D81B60', '#5E35B1', '#00ACC1', '#F4511E'], 'Golosinas': ['#6D4C41', '#E53935', '#FB8C00', '#8E24AA'],
    'Insumos de producción': ['#8D6E63', '#B98B4E', '#607D8B', '#9E9D24'] };
  App.q.buscarFotos = (consulta, p) => {
    const base = hash(App.ui.normalizar(consulta || (p ? p.descripcion : '')));
    return Array.from({ length: 8 }, (_, i) => { const h = hash(base + ':' + i); return { resultado: i, sitio: SITIOS[h % SITIOS.length], ancho: 800 + (h % 5) * 100, alto: 800 + ((h >>> 3) % 4) * 100 }; });
  };
  // dibujo del envase según el producto (bolsa, botella, caja, lata, pieza) con su nombre y marca: se usa como «foto»
  ui.fotoProducto = (p, resultado, opciones) => {
    const o = opciones || {};
    // foto real elegida en Google Imágenes: se muestra la imagen tal cual
    if (resultado == null && p.foto && p.foto.imagen) {
      return ui.seguro('<img class="foto-producto" src="' + ui.escapar(p.foto.imagen) + '" alt="Foto de ' + ui.escapar(p.descripcion) + '"' + (o.ancho ? ' width="' + o.ancho + '"' : '') +
        ' style="width:100%;height:100%;object-fit:contain;background:#fff;display:block" loading="lazy" referrerpolicy="no-referrer">');
    }
    const r = resultado != null ? resultado : (p.foto ? p.foto.resultado : 0);
    const h = hash(p.id + ':' + r);
    const tonos = TONOS_RUBRO[p.rubro] || TONOS_RUBRO['Almacén'];
    const c1 = tonos[h % tonos.length], c2 = tonos[(h >>> 4) % tonos.length] === c1 ? tonos[(h % tonos.length + 1) % tonos.length] : tonos[(h >>> 4) % tonos.length];
    const fondo = ['#F4F4F2', '#FFFFFF', '#ECEFF1', '#F7F1E8'][(h >>> 7) % 4];
    const d = App.ui.normalizar(p.descripcion);
    const forma = p.pesable ? 'pieza' : /gaseosa|agua|aceite|jugo de|lavandina|detergente|suavizante|limpiador|shampoo|acondicionador|soda|cerveza|saborizada/.test(d) ? (/cerveza/.test(d) ? 'lata' : 'botella')
      : /leche|yogur|crema/.test(d) ? 'sachet' : /atun|arvejas|pure|lata/.test(d) ? 'lata' : /yerba|azucar|arroz|fideos|harina|sal |polenta|cafe|mani|caramelos|papas|bolsa|jabon en polvo|panales/.test(d) ? 'bolsa' : 'caja';
    const giro = ((h >>> 9) % 7) - 3;
    const nombre = ui.escapar(p.descripcion.length > 26 ? p.descripcion.slice(0, 25) + '…' : p.descripcion);
    const marca = ui.escapar(p.marca || '');
    let figura = '';
    if (forma === 'botella') figura = '<path d="M86 22h28v18c0 6 14 12 14 30v96c0 8-6 12-14 12H86c-8 0-14-4-14-12V70c0-18 14-24 14-30z" fill="' + c1 + '"/><rect x="88" y="12" width="24" height="12" rx="3" fill="' + c2 + '"/><rect x="72" y="92" width="56" height="46" fill="#fff" opacity=".92"/>';
    else if (forma === 'lata') figura = '<rect x="64" y="50" width="72" height="118" rx="10" fill="' + c1 + '"/><ellipse cx="100" cy="50" rx="36" ry="8" fill="#cfd4d8"/><rect x="64" y="96" width="72" height="40" fill="#fff" opacity=".92"/>';
    else if (forma === 'sachet') figura = '<path d="M62 40h76l8 120c0 8-6 12-14 12H68c-8 0-14-4-14-12z" fill="#fff" stroke="' + c1 + '" stroke-width="3"/><path d="M58 118h84v28H58z" fill="' + c1 + '"/><rect x="62" y="34" width="76" height="10" fill="' + c2 + '"/>';
    else if (forma === 'bolsa') figura = '<path d="M60 36h80l6 12v116c0 6-4 10-10 10H64c-6 0-10-4-10-10V48z" fill="' + c1 + '"/><path d="M60 36h80l-4 10H64z" fill="' + c2 + '"/><rect x="66" y="92" width="68" height="44" rx="4" fill="#fff" opacity=".92"/>';
    else if (forma === 'pieza') figura = '<rect x="36" y="74" width="128" height="76" rx="34" fill="' + c1 + '"/><rect x="36" y="74" width="128" height="76" rx="34" fill="url(#brillo' + h + ')"/><rect x="70" y="96" width="60" height="32" rx="4" fill="#fff" opacity=".92"/>';
    else figura = '<path d="M58 44l60-10 26 12v118l-60 10-26-12z" fill="' + c1 + '"/><path d="M118 34l26 12-60 10-26-12z" fill="' + c2 + '"/><path d="M84 56l60-10v118l-60 10z" fill="#000" opacity=".12"/><rect x="62" y="92" width="58" height="42" fill="#fff" opacity=".92" transform="skewY(-8)"/>';
    const marcaY = forma === 'pieza' ? 110 : forma === 'caja' ? 120 : forma === 'lata' ? 112 : 110;
    return ui.seguro('<svg class="foto-producto" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"' + (o.ancho ? ' width="' + o.ancho + '"' : '') + ' role="img" aria-label="Foto de ' + ui.escapar(p.descripcion) + '">' +
      '<defs><linearGradient id="brillo' + h + '" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
      '<radialGradient id="piso' + h + '"><stop offset="0" stop-color="#000" stop-opacity=".18"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs>' +
      '<rect width="200" height="200" fill="' + fondo + '"/><ellipse cx="100" cy="178" rx="62" ry="9" fill="url(#piso' + h + ')"/>' +
      '<g transform="rotate(' + giro + ' 100 110)">' + figura +
      '<text x="100" y="' + marcaY + '" text-anchor="middle" font-family="Archivo, Arial, sans-serif" font-size="11" font-weight="800" fill="' + c1 + '">' + marca + '</text>' +
      '<text x="100" y="' + (marcaY + 13) + '" text-anchor="middle" font-family="Archivo, Arial, sans-serif" font-size="7.5" fill="#333">' + nombre + '</text></g></svg>');
  };

  // --- QR de aspecto real (simulado: los datos son un patrón derivado del texto) ---
  ui.qr = (texto, opciones) => {
    const o = opciones || {};
    const N = 29, Q = 2;
    const m = Array.from({ length: N }, () => new Array(N).fill(-1));
    const finder = (r, c) => {
      for (let i = -1; i <= 7; i++) for (let j = -1; j <= 7; j++) {
        const y = r + i, x = c + j;
        if (y < 0 || x < 0 || y >= N || x >= N) continue;
        const borde = i === 0 || i === 6 || j === 0 || j === 6, centro = i >= 2 && i <= 4 && j >= 2 && j <= 4;
        m[y][x] = (i >= 0 && i <= 6 && j >= 0 && j <= 6 && (borde || centro)) ? 1 : 0;
      }
    };
    finder(0, 0); finder(0, N - 7); finder(N - 7, 0);
    for (let i = 8; i < N - 8; i++) { m[6][i] = i % 2 ? 0 : 1; m[i][6] = i % 2 ? 0 : 1; }
    const al = N - 7;
    for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) m[al + i][al + j] = (Math.max(Math.abs(i), Math.abs(j)) !== 1) ? 1 : 0;
    m[N - 8][8] = 1;
    for (let i = 0; i < 9; i++) { if (m[8][i] === -1) m[8][i] = (hash('f' + i + texto) & 1); if (m[i][8] === -1) m[i][8] = (hash('g' + i + texto) & 1); }
    for (let i = N - 8; i < N; i++) { if (m[8][i] === -1) m[8][i] = (hash('h' + i + texto) & 1); if (m[i][8] === -1) m[i][8] = (hash('k' + i + texto) & 1); }
    let s = hash(String(texto)) || 1;
    const rnd = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (m[y][x] === -1) m[y][x] = rnd() < 0.5 ? 1 : 0;
    let d = '';
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N;) {
        if (m[y][x] === 1) { let j = x; while (j < N && m[y][j] === 1) j++; d += 'M' + (x + Q) + ' ' + (y + Q) + 'h' + (j - x) + 'v1h-' + (j - x) + 'z'; x = j; } else x++;
      }
    }
    const t = N + Q * 2;
    return ui.seguro('<svg class="qr" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + t + ' ' + t + '"' + (o.ancho ? ' width="' + o.ancho + '" height="' + o.ancho + '"' : '') +
      ' role="img" aria-label="Código QR del comprobante" shape-rendering="crispEdges"><rect width="' + t + '" height="' + t + '" fill="#fff"/><path fill="#000" d="' + d + '"/></svg>');
  };
  // texto del QR de ARCA (simulado) para un comprobante
  // (formato de la especificación de ARCA: tipoCmp numérico, documento del receptor y tipo de código de autorización)
  ui.textoQR = c => {
    const doc = String(c.cuit || '').replace(/[^0-9]/g, '');
    const tipoDocRec = c.condicionIVA === 'CF' || !doc ? 99 : doc.length === 11 ? 80 : 96;
    return 'https://www.afip.gob.ar/fe/qr/?p=' + btoa(JSON.stringify({ ver: 1, fecha: c.fecha, cuit: Number(CONFIG.cuit.replace(/-/g, '')), ptoVta: c.puntoVenta, tipoCmp: Number(CODIGO_ARCA[c.tipo]),
      nroCmp: c.numero, importe: c.total, moneda: 'PES', ctz: 1, tipoDocRec, nroDocRec: tipoDocRec === 99 ? 0 : Number(doc), tipoCodAut: 'E', codAut: Number(c.cae) }));
  };

  // --- documento imprimible estándar (factura, nota de crédito, remito, recibo, orden de compra) ---
  const CODIGO_ARCA = { FA: '01', NCA: '03', FB: '06', NCB: '08' };
  // opciones.copia: 'ORIGINAL' | 'DUPLICADO' | 'TRIPLICADO' (leyenda arriba del comprobante)
  ui.comprobanteHTML = (doc, tipoDoc, opciones) => {
    const op = opciones || {};
    const h = ui.h;
    const tipo = tipoDoc || doc.tipo;
    const esFiscal = !!CODIGO_ARCA[tipo];
    const esRemito = tipo === 'R', esRecibo = tipo === 'RC';
    const cli = App.get('clientes', doc.clienteId) || {};
    const letra = esFiscal ? doc.letra : (esRemito ? 'R' : 'X');
    const titulo = esRemito ? 'Remito' : esRecibo ? 'Recibo' : NOMBRE_TIPO[tipo];
    const discrimina = esFiscal && doc.letra === 'A';
    const filas = esRemito ? (App.get('comprobantes', doc.comprobanteId) || { items: [] }).items : (doc.items || []);
    const cabecera = h`<header class="comp-cabecera">
      <div class="comp-emisor"><div class="comp-negocio">${CONFIG.razonSocial}</div><div>${CONFIG.domicilio}</div><div class="comp-contacto"><span>Tel. ${CONFIG.telefono}</span> <span>${CONFIG.email}</span></div><div>IVA ${CONFIG.condicionIVA}</div></div>
      <div class="comp-letra"><span>${letra}</span><small>${esFiscal ? 'Cód. ' + CODIGO_ARCA[tipo] : 'No válido como factura'}</small></div>
      <div class="comp-datos"><div class="comp-titulo">${titulo}</div><div>N.º <strong>${doc.nro}</strong></div><div>Fecha ${ui.fecha(doc.fecha)}</div>
        <div>CUIT ${CONFIG.cuit}</div><div>Ingresos Brutos ${CONFIG.iibb}</div><div>Inicio de actividades ${ui.fecha(CONFIG.inicioActividades)}</div></div>
    </header>`;
    const COND = { RI: 'IVA Responsable Inscripto', MT: 'Responsable Monotributo', CF: 'Consumidor Final', EX: 'IVA Sujeto Exento' };
    const receptor = h`<section class="comp-receptor"><div><span>Cliente</span><strong>${cli.razonSocial || doc.razonSocial || ''}</strong>${cli.fantasia && cli.fantasia !== cli.razonSocial ? h` (${cli.fantasia})` : ''}</div>
      <div><span>CUIT</span>${cli.cuit || '—'}</div><div><span>Condición frente al IVA</span>${COND[cli.condicionIVA] || ''}</div>
      <div><span>Domicilio</span>${cli.direccion || ''}, ${cli.localidad || ''}</div>
      ${esFiscal && doc.clase === 'factura' ? h`<div><span>Condición de venta</span>${cli.plazo ? 'Cuenta corriente a ' + cli.plazo + ' días (vence ' + ui.fecha(doc.vence) + ')' : 'Contado'}</div>` : ''}
      ${doc.asociadoNro ? h`<div><span>Comprobante asociado</span>${doc.asociadoNro}</div>` : ''}${doc.motivo ? h`<div><span>Motivo</span>${doc.motivo}</div>` : ''}</section>`;
    const conBonif = !esRemito && filas.some(it => it.bonif > 0);
    let cuerpo;
    if (esRecibo) {
      cuerpo = h`<table class="comp-items"><thead><tr><th>Medio</th><th>Detalle</th><th class="al-der">Importe</th></tr></thead><tbody>
        ${doc.medios.map(m => { const ch = m.chequeId ? App.get('cheques', m.chequeId) : null; return h`<tr><td>${m.tipo === 'echeq' ? 'eCheq' : m.tipo === 'retencion' ? 'Retención de ' + m.datos.impuesto : m.tipo[0].toUpperCase() + m.tipo.slice(1)}</td><td>${ch ? ch.banco + ' n.º ' + ch.numero + ', pago ' + ui.fecha(ch.fechaPago) : m.tipo === 'retencion' ? 'Certificado n.º ' + m.datos.certificado : ''}</td><td class="al-der">${ui.pesos(m.importe)}</td></tr>`; })}
        </tbody></table>
        <table class="comp-items"><thead><tr><th>Imputado a</th><th class="al-der">Importe</th></tr></thead><tbody>
        ${doc.imputaciones.map(i => h`<tr><td>${i.nro}</td><td class="al-der">${ui.pesos(i.importe)}</td></tr>`)}
        ${doc.aCuenta > 0 ? h`<tr><td>A cuenta</td><td class="al-der">${ui.pesos(doc.aCuenta)}</td></tr>` : ''}</tbody></table>
        <div class="comp-totales"><div class="comp-total"><span>Total recibido</span><strong>${ui.pesos(doc.total)}</strong></div></div>`;
    } else {
      cuerpo = h`<table class="comp-items"><thead><tr><th>Código</th><th>Descripción</th><th>Unidad</th><th class="al-der">Cant.</th>
        ${esRemito ? '' : h`<th class="al-der">Precio${discrimina ? ' neto' : ''}</th>${conBonif ? h`<th class="al-der">Bonif.</th>` : ''}${discrimina ? h`<th class="al-der">IVA</th>` : ''}<th class="al-der">Subtotal</th>`}</tr></thead><tbody>
        ${filas.map(it => { const f = discrimina ? 1 : 1 + it.iva / 100; const pr = it.pres && it.pres.factor !== 1 ? it.pres : null; const cant = pr ? pr.cantidad : it.cantidad; return h`<tr><td>${it.codigo}</td><td>${it.descripcion}</td><td>${it.unidad}</td><td class="al-der">${ui.num(cant, cant % 1 ? (cant * 1000 % 10 ? 3 : 2) : 0)}</td>
          ${esRemito ? '' : h`<td class="al-der">${ui.pesos((pr ? App.r2(it.precio * pr.factor) : it.precio) * f)}</td>${conBonif ? h`<td class="al-der">${it.bonif ? ui.num(it.bonif, 1) + ' %' : ''}</td>` : ''}${discrimina ? h`<td class="al-der">${ui.num(it.iva, 1)} %</td>` : ''}<td class="al-der">${ui.pesos(it.subtotal * f)}</td>`}</tr>`; })}
        </tbody></table>
        ${esRemito ? h`<div class="comp-totales"><div><span>Bultos</span><strong>${ui.num(doc.bultos)}</strong></div><div><span>Peso aprox.</span><strong>${ui.num(doc.kg)} kg</strong></div></div>
          ${(() => { const hr = doc.hojaRutaId ? App.get('hojasRuta', doc.hojaRutaId) : null; const ch = hr ? App.get('choferes', hr.choferId) : null; const ve = hr ? App.get('vehiculos', hr.vehiculoId) : null;
            const cai = String(51000000000000 + (hash('CAI' + CONFIG.puntoVenta) % 999999999999)).slice(0, 14);
            const cot = String(4000000000 + (hash('COT' + doc.nro) % 999999999));
            return h`<section class="comp-receptor comp-transporte"><div><span>Transporte</span>${hr ? 'Hoja de ruta ' + hr.nro + (ch ? ', chofer ' + ch.nombre : '') + (ve ? ', ' + ve.descripcion + ' patente ' + ve.patente : '') : 'Se completa al armar la hoja de ruta'}</div>
              <div><span>CAI</span>${cai} (vence ${ui.fecha(F.sumar(CONFIG.hoy, 182))})</div><div><span>Código de traslado</span>n.º ${cot} (simulado: en la versión real se tramita cuando la jurisdicción lo exige)</div></section>`; })()}
          <div class="comp-firma"><div>Recibí conforme: firma y aclaración</div><div>DNI</div></div>`
        : h`<div class="comp-totales">
          ${discrimina ? h`${doc.neto21 ? h`<div><span>Neto gravado 21 %</span>${ui.pesos(doc.neto21)}</div>` : ''}${doc.neto105 ? h`<div><span>Neto gravado 10,5 %</span>${ui.pesos(doc.neto105)}</div>` : ''}
            ${doc.iva21 ? h`<div><span>IVA 21 %</span>${ui.pesos(doc.iva21)}</div>` : ''}${doc.iva105 ? h`<div><span>IVA 10,5 %</span>${ui.pesos(doc.iva105)}</div>` : ''}` : ''}
          <div class="comp-total"><span>Total</span><strong>${ui.pesos(doc.total)}</strong></div>
          ${!discrimina && esFiscal ? h`<div class="comp-transparencia">Régimen de transparencia fiscal al consumidor (Ley 27.743): IVA contenido ${ui.pesos(doc.iva)}</div>` : ''}</div>`}`;
    }
    const pie = esFiscal ? h`<footer class="comp-pie">${ui.qr(ui.textoQR(doc), { ancho: 96 })}
      <div class="comp-cae"><div><span>CAE N.º</span><strong>${doc.cae}</strong></div><div><span>Vencimiento del CAE</span><strong>${ui.fecha(doc.vtoCae)}</strong></div>
      <p>Comprobante autorizado (simulado). ${CONFIG.avisoCAE}</p></div></footer>`
      : h`<footer class="comp-pie comp-pie-simple"><p>${esRemito ? 'Documento no válido como factura.' : 'Recibo de pago.'} Datos de ejemplo.</p></footer>`;
    return h`<article class="comprobante">${op.copia ? h`<div class="comp-copia">${op.copia}</div>` : ''}${cabecera}${receptor}${cuerpo}${pie}</article>`;
  };

  ui.ir = ruta => {
    let r = String(ruta || '');
    if (r.startsWith('#')) r = r.slice(1);
    if (!r.startsWith('/')) r = '/' + r;
    if (location.hash === '#' + r) renderizar(false); else location.hash = r;
  };

  // ---------- módulos y router ----------
  const GRUPOS = ['Inicio', 'Comercial', 'Logística', 'Administración', 'Finanzas'];
  App.modulo = def => {
    if (!def || !def.id) throw new Error('Un módulo necesita id.');
    const i = App.modulos.findIndex(m => m.id === def.id);
    if (i >= 0) App.modulos[i] = def; else App.modulos.push(def);
    if (iniciado) { construirMenu(); if (rutaActual().id === def.id) renderizar(false); }
  };
  function rutaActual() {
    const h = (location.hash || '').replace(/^#\/?/, '');
    const partes = h.split('/').filter(Boolean).map(p => { try { return decodeURIComponent(p); } catch (e) { return p; } });
    return { id: partes[0] || 'inicio', params: partes.slice(1) };
  }
  App.ruta = rutaActual;
  let iniciado = false, vista = null, moduloVisible = null, renderPendiente = false;
  function construirMenu() {
    const nav = document.getElementById('nav');
    if (!nav) return;
    const actual = rutaActual().id;
    nav.innerHTML = GRUPOS.map(g => {
      const mods = App.modulos.filter(m => (m.grupo || 'Inicio') === g && !m.oculto && (!App.verModulo || App.verModulo(m.id))).sort((a, b) => (a.orden || 0) - (b.orden || 0));
      if (!mods.length) return '';
      return '<div class="nav-grupo">' + (g === 'Inicio' ? '' : '<div class="nav-titulo">' + ui.escapar(g) + '</div>') + mods.map(m =>
        '<a class="nav-link" href="#/' + m.id + '"' + (m.id === actual ? ' aria-current="page"' : '') + '>' + (m.icono || '') + '<span>' + ui.escapar(m.titulo) + '</span>' +
        (m.contador ? contadorMenu(m) : '') + '</a>').join('') + '</div>';
    }).join('');
  }
  function contadorMenu(m) { try { const n = m.contador(); return n ? '<span class="nav-cuenta">' + ui.escapar(n) + '</span>' : ''; } catch (e) { return ''; } }
  function renderizar(porCambio) {
    if (!vista) return;
    const { id, params } = rutaActual();
    const mod = App.modulos.find(m => m.id === id);
    const scroll = porCambio ? window.scrollY : 0;
    construirMenu();
    document.body.classList.remove('menu-abierto');
    if (!porCambio && pilaToast) pilaToast.querySelectorAll('.toast:not(.toast-peligro)').forEach(t => t.remove());
    vista.innerHTML = '';
    vista.dataset.modulo = id;
    if (mod && App.verModulo && !App.verModulo(mod.id)) {
      vista.innerHTML = '<div class="vacio vacio-grande"><h1 class="titulo-vista">Sin acceso a esta pantalla</h1><p>Tu usuario no tiene permiso para ver ' + ui.escapar(mod.titulo) + '. Si lo necesitás, pedíselo al dueño.</p><a class="btn btn-primario" href="#/inicio">Ir al inicio</a></div>';
      document.title = 'Sin acceso | ' + CONFIG.negocio;
      return;
    }
    if (!mod) {
      vista.innerHTML = '<div class="vacio vacio-grande"><h1 class="titulo-vista">Pantalla no encontrada</h1><p>El enlace no corresponde a ninguna sección del sistema.</p><a class="btn btn-primario" href="#/inicio">Ir al inicio</a></div>';
      document.title = 'No encontrada | ' + CONFIG.negocio;
      return;
    }
    moduloVisible = mod;
    document.title = mod.titulo + ' | ' + CONFIG.negocio;
    try { mod.render(vista, params); }
    catch (e) {
      console.error('Error en el módulo ' + id + ':', e);
      vista.innerHTML = '<div class="vacio vacio-grande"><h1 class="titulo-vista">Error al cargar la pantalla</h1><p>' + ui.escapar(e.message) + '</p></div>';
    }
    if (porCambio) window.scrollTo(0, scroll);
    else { window.scrollTo(0, 0); if (document.activeElement === document.body || !document.activeElement) vista.focus({ preventScroll: true }); }
  }
  App.renderizar = () => renderizar(true);

  function buscadorGlobal() {
    const input = document.getElementById('buscar-global');
    const caja = document.getElementById('resultados-global');
    if (!input || !caja) return;
    let res = [], sel = -1;
    const cerrar = () => { caja.hidden = true; input.setAttribute('aria-expanded', 'false'); sel = -1; };
    const pintar = () => {
      if (!input.value.trim()) { cerrar(); return; }
      caja.innerHTML = res.length ? res.map((r, i) => '<a href="' + r.ruta + '" class="res' + (i === sel ? ' activo' : '') + '" role="option" id="res-' + i + '"' + (i === sel ? ' aria-selected="true"' : '') + '><span class="res-tipo">' + ui.escapar(r.tipo) + '</span><span class="res-titulo">' + ui.escapar(r.titulo) + '</span><span class="res-detalle">' + ui.escapar(r.detalle) + '</span></a>').join('')
        : '<div class="res-vacio">Sin resultados para «' + ui.escapar(input.value) + '». Se puede buscar por código, CUIT o número de comprobante.</div>';
      caja.hidden = false; input.setAttribute('aria-expanded', 'true');
      if (sel >= 0) input.setAttribute('aria-activedescendant', 'res-' + sel); else input.removeAttribute('aria-activedescendant');
    };
    ui.buscador(input, () => { res = q.buscar(input.value, 10); sel = -1; pintar(); }, 80);
    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown' && res.length) { e.preventDefault(); sel = (sel + 1) % res.length; pintar(); }
      else if (e.key === 'ArrowUp' && res.length) { e.preventDefault(); sel = (sel - 1 + res.length) % res.length; pintar(); }
      else if (e.key === 'Enter' && res.length) { e.preventDefault(); ui.ir(res[Math.max(0, sel)].ruta); input.value = ''; cerrar(); input.blur(); }
      else if (e.key === 'Escape') { cerrar(); }
    });
    caja.addEventListener('click', e => { if (e.target.closest('a')) { input.value = ''; cerrar(); } });
    document.addEventListener('click', e => { if (!e.target.closest('.buscador-global')) cerrar(); });
    document.addEventListener('keydown', e => {
      if (e.key === '/' && !e.target.closest('input, textarea, select, [contenteditable]')) { e.preventDefault(); input.focus(); }
    });
  }

  App.iniciar = function () {
    App.prepararDatos();
    vista = document.getElementById('vista');
    iniciado = true;
    document.querySelectorAll('[data-negocio]').forEach(e => { e.textContent = CONFIG.negocio; });
    document.querySelectorAll('[data-pie]').forEach(e => { e.innerHTML = ui.escapar(CONFIG.pie).replace('MyM Soluciones', '<span class="mym">MyM Soluciones</span>'); });
    document.querySelectorAll('[data-hoy]').forEach(e => { e.textContent = ui.fechaLarga(CONFIG.hoy); });
    const btnMenu = document.getElementById('btn-menu');
    if (btnMenu) btnMenu.addEventListener('click', () => { const ab = document.body.classList.toggle('menu-abierto'); btnMenu.setAttribute('aria-expanded', ab); });
    const btnRe = document.getElementById('btn-reiniciar');
    if (btnRe) btnRe.addEventListener('click', async () => {
      const n = registro.length;
      const ok = await ui.confirmar(n ? 'Se descartan los ' + n + ' cambios registrados y los datos vuelven a su estado inicial.' : 'Los datos vuelven a su estado inicial. No hay cambios registrados.', { titulo: 'Reiniciar demo', aceptar: 'Reiniciar demo', tipo: 'peligro' });
      if (ok) { App.reiniciar(); ui.toast('Demo reiniciada: los datos volvieron a su estado inicial.', 'ok'); }
    });
    buscadorGlobal();
    window.addEventListener('hashchange', () => renderizar(false));
    App.on('cambio', () => { if (!moduloVisible) return; if (document.querySelector('.modal-fondo')) { renderPendiente = true; construirMenu(); } else renderizar(true); });
    if (!location.hash) history.replaceState(null, '', '#/inicio');
    renderizar(false);
  };
})();
