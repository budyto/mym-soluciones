/* Módulo «Preventa»: la app del preventista, pensada para el celular.
   Rutas: #/preventa (ruta del día) y #/preventa/cliente/<id> (ficha del cliente y carga del pedido).
   El carrito vive en memoria del módulo (por cliente): el render se vuelve a llamar con cada 'cambio'
   del store y así no se pierde lo que se estaba cargando. Los pedidos se crean sólo con App.acciones. */
(function () {
  'use strict';
  const ui = App.ui, h = ui.h;
  const DIAS = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab'];
  const DIAS_NOMBRE = { lun: 'Lunes', mar: 'Martes', mie: 'Miércoles', jue: 'Jueves', vie: 'Viernes', sab: 'Sábado' };
  const IVA_NOMBRE = { RI: 'Responsable Inscripto', MT: 'Monotributo', CF: 'Consumidor Final', EX: 'Exento' };
  const CLAVE_PV = 'dda-preventa-preventista';

  // ---------- estado del módulo ----------
  let preventistaId = null;
  let diaElegido = null;          // null = hoy
  const carritos = {};            // clienteId → { items: [{productoId, presentacion, cantidad (en esa presentación), bonif}], obs }
  const presElegida = {};         // productoId → presentación marcada en la lista de productos
  const textoBusqueda = {};       // clienteId → lo último que se buscó
  let aviso = null;               // { pedidoId } tras confirmar: se muestra una vez en la ruta

  function leerPreventista() {
    if (preventistaId && App.get('preventistas', preventistaId)) return preventistaId;
    let guardado = null;
    try { guardado = localStorage.getItem(CLAVE_PV); } catch (e) { guardado = null; }
    const activos = App.db.preventistas.filter(p => p.activo !== false);
    preventistaId = guardado && App.get('preventistas', guardado) ? guardado : (activos[0] && activos[0].id);
    return preventistaId;
  }
  function elegirPreventista(id) {
    preventistaId = id;
    try { localStorage.setItem(CLAVE_PV, id); } catch (e) { /* sin almacenamiento: no pasa nada */ }
  }
  const diaHoy = () => DIAS[App.f.diaSemana(App.hoy())];

  // ---------- estilos propios (prefijo pv-), una sola vez ----------
  function estilos() {
    if (document.getElementById('pv-estilos')) return;
    const st = document.createElement('style');
    st.id = 'pv-estilos';
    st.textContent = `
.pv-app { max-width: 760px; }
.pv-cabeza { margin-bottom: 14px; }
.pv-quien { display: flex; gap: 6px; overflow-x: auto; padding: 2px 0 4px; margin: 12px 0 0; scrollbar-width: none; }
.pv-quien button { flex: none; height: 38px; padding: 0 14px; border-radius: 19px; border: 1px solid var(--linea); background: var(--hoja); font-weight: 600; cursor: pointer; color: var(--texto-2); }
.pv-quien button[aria-pressed="true"] { background: var(--tinta); border-color: var(--tinta); color: #fff; }
.pv-dias { display: flex; gap: 4px; margin: 10px 0 0; }
.pv-dias button { flex: 1 1 0; min-width: 0; height: 36px; border: 1px solid var(--linea); background: var(--hoja); border-radius: var(--r-control); cursor: pointer; font-size: var(--fs-13); font-weight: 600; color: var(--texto-2); }
.pv-dias button[aria-pressed="true"] { border-color: var(--tinta); color: var(--tinta); box-shadow: inset 0 -3px 0 var(--senal); }
.pv-dias button.pv-es-hoy { color: var(--tinta); text-decoration: underline; text-underline-offset: 3px; }
.pv-avance { background: var(--tinta); color: #fff; border-radius: var(--r-panel); padding: 16px 18px 14px; margin: 14px 0 18px; display: grid; grid-template-columns: auto 1fr; gap: 2px 18px; align-items: end; }
.pv-avance .cifra-grande { color: #fff; }
.pv-avance .cifra-grande small { font-size: var(--fs-20); font-stretch: 112%; color: #AEB9C4; }
.pv-avance-dato { text-align: right; font-size: var(--fs-13); color: #AEB9C4; }
.pv-avance-dato strong { display: block; color: #fff; font-size: var(--fs-20); font-stretch: 118%; font-weight: 800; }
.pv-avance-pie { grid-column: 1 / -1; font-size: var(--fs-13); color: #AEB9C4; }
.pv-tramos { grid-column: 1 / -1; display: flex; gap: 3px; margin-top: 10px; }
.pv-tramos span { flex: 1; height: 8px; border-radius: 2px; background: var(--tinta-3); }
.pv-tramos span.hecho { background: var(--senal); }
.pv-ruta { list-style: none; margin: 0; padding: 0; background: var(--hoja); border: 1px solid var(--linea); border-radius: var(--r-panel); overflow: hidden; }
.pv-parada + .pv-parada { border-top: 1px solid var(--linea-suave); }
.pv-parada a { display: grid; grid-template-columns: 52px minmax(0, 1fr) auto; gap: 0 12px; align-items: center; padding: 12px 14px 12px 0; color: var(--tinta); text-decoration: none; min-height: 68px; }
.pv-parada a:hover { background: var(--fila-hover); }
.pv-orden { align-self: stretch; display: grid; place-items: center; font-stretch: 125%; font-weight: 800; font-size: var(--fs-20); color: var(--texto-2); border-right: 1px dashed var(--linea); }
.pv-parada.hecha .pv-orden { color: var(--ok); }
.pv-parada.hecha .pv-orden svg { width: 22px; height: 22px; }
.pv-nombre { display: block; font-weight: 700; font-size: var(--fs-16); line-height: 1.2; }
.pv-dir { display: block; font-size: var(--fs-13); color: var(--texto-2); margin-top: 2px; }
.pv-marcas { display: flex; gap: 5px; flex-wrap: wrap; margin-top: 6px; }
.pv-saldo { text-align: right; font-size: var(--fs-12); color: var(--texto-2); white-space: nowrap; }
.pv-saldo strong { display: block; font-size: var(--fs-14); color: var(--tinta); }
.pv-otro { margin-top: 22px; }
.pv-otro input { height: 44px; font-size: var(--fs-16); }
.pv-lista-simple { list-style: none; margin: 8px 0 0; padding: 0; }
.pv-lista-simple li + li { border-top: 1px solid var(--linea-suave); }
.pv-lista-simple a { display: flex; justify-content: space-between; gap: 10px; padding: 11px 4px; color: var(--tinta); text-decoration: none; }
.pv-lista-simple a:hover { background: var(--fila-hover); }
.pv-volver { display: inline-flex; align-items: center; gap: 6px; height: 36px; color: var(--texto-2); text-decoration: none; font-weight: 600; margin-bottom: 4px; }
.pv-volver:hover { color: var(--tinta); }
.pv-ficha-nombre { font-size: var(--fs-28); line-height: 1.05; }
.pv-ficha-sub { color: var(--texto-2); margin-top: 8px; display: flex; flex-wrap: wrap; gap: 4px 16px; font-size: var(--fs-13); }
.pv-ficha-sub a { color: var(--info); font-weight: 600; text-decoration: none; }
.pv-ficha .seccion { margin-top: 18px; }
.pv-ficha .franja-kpi { margin-bottom: 0; border-radius: var(--r-panel) var(--r-panel) 0 0; }
.pv-credito { background: var(--hoja); border: 1px solid var(--linea); border-top: 0; border-radius: 0 0 var(--r-panel) var(--r-panel); padding: 10px 20px 12px; margin-bottom: 16px; }
.pv-credito .barra-h { height: 10px; }
.pv-credito .barra-h > span.lleno { background: var(--peligro); }
.pv-credito-pie { display: flex; justify-content: space-between; gap: 10px; font-size: var(--fs-12); color: var(--texto-2); margin-top: 5px; }
.pv-ultimo { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
.pv-ultimo p { margin: 0; }
.pv-buscar { position: sticky; top: 56px; z-index: 5; background: var(--papel); padding: 10px 0 8px; margin-top: 18px; }
.pv-buscar-caja { position: relative; }
.pv-buscar input { height: 48px; font-size: var(--fs-16); padding-left: 42px; padding-right: 12px; border-color: #AEB6AD; }
.pv-buscar-caja svg { position: absolute; left: 13px; top: 14px; width: 20px; height: 20px; color: var(--texto-2); pointer-events: none; }
.pv-buscar .campo-ayuda { margin-top: 5px; }
.pv-sugerencia { font-size: var(--fs-13); color: var(--texto-2); margin: 0 0 8px; }
.pv-productos { list-style: none; margin: 0; padding: 0; background: var(--hoja); border: 1px solid var(--linea); border-radius: var(--r-panel); overflow: hidden; }
.pv-prod { display: grid; grid-template-columns: minmax(0, 1fr) auto 48px; gap: 4px 12px; align-items: center; padding: 10px 10px 10px 14px; }
.pv-prod + .pv-prod { border-top: 1px solid var(--linea-suave); }
.pv-prod-desc { font-weight: 600; line-height: 1.25; }
.pv-prod-sub { font-size: var(--fs-12); color: var(--texto-2); margin-top: 2px; }
.pv-prod-precio { text-align: right; font-weight: 700; white-space: nowrap; }
.pv-prod-precio small { display: block; font-weight: 400; font-size: var(--fs-12); color: var(--texto-2); }
.pv-prod-precio small.sin { color: var(--peligro); font-weight: 600; }
.pv-mas { width: 44px; height: 44px; border-radius: 50%; border: 1.5px solid var(--tinta); background: var(--hoja); font-size: 24px; line-height: 1; cursor: pointer; color: var(--tinta); display: grid; place-items: center; padding: 0; }
.pv-mas:hover { background: var(--tinta); color: #fff; }
.pv-mas:disabled { border-color: var(--linea); color: #AEB6AD; background: var(--hoja); cursor: not-allowed; }
.pv-mas.en-carrito { background: var(--tinta); color: var(--senal); font-size: var(--fs-16); font-weight: 800; font-stretch: 118%; }
.pv-carrito { margin-top: 24px; }
.pv-lineas { list-style: none; margin: 0; padding: 0; background: var(--hoja); border: 1px solid var(--linea); border-radius: var(--r-panel); overflow: hidden; }
.pv-linea { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px 12px; padding: 12px 14px; align-items: start; }
.pv-linea + .pv-linea { border-top: 1px solid var(--linea-suave); }
.pv-linea.sin-stock { box-shadow: inset 4px 0 0 var(--peligro); }
.pv-linea-sub { font-size: var(--fs-12); color: var(--texto-2); margin-top: 2px; }
.pv-linea-total { text-align: right; font-weight: 700; white-space: nowrap; }
.pv-linea-abajo { grid-column: 1 / -1; display: flex; justify-content: space-between; align-items: center; gap: 10px; }
.pv-paso { display: inline-flex; align-items: center; border: 1px solid #AEB6AD; border-radius: 22px; background: var(--hoja); }
.pv-paso button { width: 44px; height: 40px; border: 0; background: none; font-size: 22px; line-height: 1; cursor: pointer; color: var(--tinta); border-radius: 22px; }
.pv-paso button:hover { background: var(--fila-hover); }
.pv-paso button:disabled { color: var(--linea); cursor: not-allowed; background: none; }
.pv-paso input { width: 58px; height: 40px; border: 0; border-radius: 0; text-align: center; font-weight: 700; font-size: var(--fs-16); padding: 0 2px; -moz-appearance: textfield; }
.pv-paso input::-webkit-inner-spin-button, .pv-paso input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
.pv-quitar { border: 0; background: none; color: var(--texto-2); font-size: var(--fs-13); text-decoration: underline; cursor: pointer; padding: 8px 2px; }
.pv-quitar:hover { color: var(--peligro); }
.pv-error-linea { grid-column: 1 / -1; font-size: var(--fs-12); color: var(--peligro); font-weight: 600; }
.pv-avisos { display: grid; gap: 8px; margin-top: 12px; }
.pv-avisos:empty { display: none; }
.pv-obs { margin-top: 14px; }
.pv-pie { position: sticky; bottom: 0; z-index: 6; margin-top: 18px; background: var(--tinta); color: #fff; border-radius: var(--r-panel) var(--r-panel) 0 0; padding: 12px 16px calc(12px + env(safe-area-inset-bottom)); display: flex; align-items: center; justify-content: space-between; gap: 12px; box-shadow: 0 -6px 18px rgba(23, 32, 42, .18); }
.pv-pie-total { line-height: 1.1; min-width: 0; }
.pv-pie-total small { display: block; font-size: var(--fs-12); color: #AEB9C4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pv-pie-total strong { font-size: 24px; font-stretch: 122%; font-weight: 800; white-space: nowrap; }
.pv-pie .btn { flex: none; }
.pv-pie .btn:disabled { opacity: .45; }
.pv-vacio-carrito { padding: 18px 16px; text-align: center; color: var(--texto-2); background: var(--hoja); border: 1px dashed #AEB6AD; border-radius: var(--r-panel); }
@media (max-width: 760px) {
  .pv-ficha-nombre { font-size: 24px; }
  .pv-pie { margin-left: -16px; margin-right: -16px; border-radius: 0; }
  .pv-pie-total strong { font-size: 20px; }
  .pv-pie .btn-grande { padding: 0 14px; }
  .pv-avance .cifra-grande { font-size: 34px; }
  .pv-ficha .kpi-valor { font-size: 20px; }
}
.pv-parada.visitada { opacity: .72; }
.pv-parada.visitada .pv-orden { background: var(--neutro-suave); color: var(--texto-2); }
.pv-nocompro { display: flex; flex-wrap: wrap; gap: 6px; }
.pv-nocompro button { flex: 1 1 calc(50% - 6px); justify-content: center; }
.pv-bonif { display: inline-flex; align-items: center; gap: 4px; font-size: var(--fs-12); color: var(--texto-2); }
.pv-bonif input { width: 58px; height: 30px; padding: 0 6px; }
.pv-escala { display: block; font-size: var(--fs-12); color: var(--ok); font-weight: 600; }
.pv-pres { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 6px; margin-top: 2px; }
.pv-pres button { min-height: 40px; padding: 4px 10px 4px 9px; display: inline-flex; flex-direction: column; justify-content: center; align-items: flex-start; line-height: 1.2; border: 1px solid var(--linea); border-left: 3px solid var(--carton); border-radius: var(--r-control); background: var(--hoja); font-size: var(--fs-12); color: var(--texto-2); cursor: pointer; text-align: left; }
.pv-pres button span { font-size: var(--fs-13); font-weight: 700; color: var(--tinta); font-variant-numeric: tabular-nums; }
.pv-pres button:hover { border-color: var(--tinta); border-left-color: var(--carton); }
.pv-pres button[aria-pressed="true"] { background: var(--tinta); border-color: var(--tinta); border-left-color: var(--carton); color: #DDE3E8; }
.pv-pres button[aria-pressed="true"] span { color: #fff; }
.pv-pres-aviso { grid-column: 1 / -1; font-size: var(--fs-12); color: var(--alerta); font-weight: 600; }
.pv-linea-pres { grid-column: 1 / -1; display: flex; align-items: center; gap: 10px; font-size: var(--fs-12); color: var(--texto-2); font-weight: 600; }
.pv-linea-pres select { flex: 1 1 auto; min-width: 0; height: 40px; font-size: var(--fs-14); }
.pv-unidad { font-weight: 700; color: var(--texto-2); margin-left: -4px; }
.pv-linea-abajo { flex-wrap: wrap; }`;
    document.head.appendChild(st);
  }

  // ---------- datos derivados ----------
  function pedidosDelDia(clienteId, fecha) {
    return App.db.pedidos.filter(p => p.clienteId === clienteId && p.fecha === fecha && p.estado !== 'cancelado');
  }
  function ultimoPedido(clienteId) {
    const ps = App.db.pedidos;
    for (let i = ps.length - 1; i >= 0; i--) if (ps[i].clienteId === clienteId && ps[i].estado !== 'cancelado') return ps[i];
    return null;
  }
  // lo que más compra el cliente (en cuántos pedidos aparece cada producto)
  function habituales(clienteId, n) {
    const cuenta = {};
    App.db.pedidos.forEach(p => { if (p.clienteId === clienteId && p.estado !== 'cancelado') p.items.forEach(it => { cuenta[it.productoId] = (cuenta[it.productoId] || 0) + 1; }); });
    return Object.keys(cuenta).sort((a, b) => cuenta[b] - cuenta[a]).slice(0, n).map(id => App.get('productos', id)).filter(p => p && p.activo !== false);
  }
  const MOTIVOS_SIN_PEDIDO = ['Comercio cerrado', 'Con stock suficiente', 'Titular ausente', 'Compra a otro proveedor', 'Sin disponibilidad de fondos', 'Solicita visita la próxima semana'];
  function visitaDelDia(clienteId, fecha) { const vs = App.db.visitas.filter(v => v.clienteId === clienteId && v.fecha === fecha); return vs[vs.length - 1] || null; }
  const disponible = (productoId, depositoId) => App.q.stock(productoId, depositoId).disponible;
  const carrito = clienteId => (carritos[clienteId] = carritos[clienteId] || { items: [], obs: '' });
  // ---------- presentaciones: bulto o caja, pack, unidad y, en los pesables, por kilo ----------
  // el stock está en la unidad base (el bulto, o el kilo en los pesables)
  const rq = n => Math.round(n * 1000) / 1000;
  const esKg = pr => !!pr && pr.id === 'kg';
  const presDe = (p, id) => App.presentacionDe(p, id);
  const leerCant = v => { const s = String(v == null ? '' : v).trim(); return Number(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s); };
  const precioBasePres = (p, listaId, pr) => App.r2(App.q.precio(p.id, listaId) * (1 + (pr.recargo || 0) / 100));
  const precioPres = (p, listaId, pr) => App.r2(precioBasePres(p, listaId, pr) * pr.factor);
  const precioPresIVA = (p, listaId, pr) => pr.id === 'b' && pr.factor === 1 && !pr.recargo ? App.q.precioConIVA(p.id, listaId) : App.r2(precioPres(p, listaId, pr) * (1 + p.iva / 100));
  const maxPres = (pr, disp) => disp <= 0 ? 0 : (esKg(pr) ? rq(disp) : Math.floor(disp / pr.factor + 1e-9));
  const cantTexto = (pr, n) => App.ui.num(n, esKg(pr) && n % 1 ? 3 : 0);
  const valorInput = (pr, n) => esKg(pr) ? String(rq(n)).replace('.', ',') : String(n);
  // el renglón como lo va a guardar el núcleo, para mostrar el mismo subtotal
  function renglonVista(it, listaId) {
    const p = App.get('productos', it.productoId), pr = presDe(p, it.presentacion);
    return { productoId: p.id, cantidad: rq(it.cantidad * pr.factor), precio: precioBasePres(p, listaId, pr), iva: p.iva, bonif: it.bonif || 0,
      pres: { id: pr.id, nombre: pr.nombre, factor: pr.factor, cantidad: it.cantidad } };
  }
  function totales(c, items) {
    let n21 = 0, n105 = 0;
    items.forEach(it => { const r = renglonVista(it, c.listaId); const s = App.subtotalItem(r); if (r.iva === 10.5) n105 += s; else n21 += s; });
    n21 = App.r2(n21); n105 = App.r2(n105);
    const neto = App.r2(n21 + n105), iva = App.r2(App.r2(n21 * 0.21) + App.r2(n105 * 0.105));
    return { neto, iva, total: App.r2(neto + iva) };
  }
  // código exacto: EAN, código interno o propio, PLU, o etiqueta de balanza (20 + PLU + 0 + gramos + verificador)
  function productoPorCodigo(crudo) {
    const cod = crudo.replace(/\D/g, '');
    const activos = App.db.productos.filter(x => x.activo !== false);
    if (cod.length === 13 && cod.startsWith('20')) {
      const plu = cod.slice(2, 6), p = activos.find(x => x.pesable && x.plu === plu);
      if (p) return { p, presentacion: 'kg', cantidad: rq(Number(cod.slice(7, 12)) / 1000) };
    }
    const p = activos.find(x => (cod.length >= 8 && x.ean === cod) || x.codigo.toUpperCase() === crudo.toUpperCase() || (x.codigoPropio && x.codigoPropio.toUpperCase() === crudo.toUpperCase()) || (cod.length === 4 && x.plu === cod && crudo === cod));
    return p ? { p } : null;
  }
  const iconoCheck = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 10.5l3.5 3.5 7.5-8"/></svg>';
  const iconoLupa = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5"/><path d="M12.6 12.6L17 17"/></svg>';

  // ---------- pantalla 1: la ruta del día ----------
  function renderRuta(el) {
    const pvId = leerPreventista();
    const pv = App.get('preventistas', pvId);
    const hoy = App.hoy();
    const dia = diaElegido || diaHoy();
    const esHoy = dia === diaHoy();
    const clientes = App.db.clientes.filter(c => c.activo !== false && c.preventistaId === pvId && (c.diasVisita || []).includes(dia));
    const hechos = clientes.filter(c => pedidosDelDia(c.id, hoy).length);
    const vendidoHoy = App.db.pedidos.filter(p => p.fecha === hoy && p.preventistaId === pvId && p.estado !== 'cancelado' && p.origen === 'preventa').reduce((s, p) => s + p.total, 0);
    const preventistas = App.db.preventistas.filter(p => p.activo !== false);

    const app = document.createElement('div');
    app.className = 'pv-app';
    let html = String(h`<div class="pv-cabeza">
      <h1 class="titulo-vista">${esHoy ? 'Ruta de hoy' : 'Ruta del ' + DIAS_NOMBRE[dia].toLowerCase()}</h1>
      <p class="bajada">${esHoy ? 'Hoy es ' + ui.fechaLarga(hoy) + '. ' : ''}${pv ? 'Zona ' + pv.zona + '.' : ''}</p>
      <div class="pv-quien" role="group" aria-label="Preventista">${preventistas.map(p => h`<button type="button" data-pv="${p.id}" aria-pressed="${p.id === pvId}">${p.nombre}</button>`)}</div>
      <div class="pv-dias" role="group" aria-label="Día de visita">${['lun', 'mar', 'mie', 'jue', 'vie', 'sab'].map(d => h`<button type="button" data-dia="${d}" aria-pressed="${d === dia}" class="${d === diaHoy() ? 'pv-es-hoy' : ''}" title="${d === diaHoy() ? 'Hoy' : DIAS_NOMBRE[d]}">${DIAS_NOMBRE[d].slice(0, 3)}</button>`)}</div>
    </div>`);

    if (aviso) {
      const p = App.get('pedidos', aviso.pedidoId);
      if (p) {
        const c = App.get('clientes', p.clienteId);
        html += String(h`<div class="aviso aviso-ok" role="status" style="margin-bottom:12px"><div><strong>Pedido ${p.nro} confirmado</strong> para ${c.fantasia}, por ${ui.pesos(p.total)}. La mercadería quedó reservada y el pedido queda pendiente de facturación.${p.alertas && p.alertas.length ? ' ' + p.alertas.join(' ') : ''}</div></div>`);
      }
      aviso = null;
    }

    html += String(h`<div class="pv-avance">
      <div class="cifra-grande">${hechos.length}<small> de ${clientes.length}</small></div>
      <div class="pv-avance-dato">Vendido hoy<strong>${ui.pesos(vendidoHoy)}</strong></div>
      <div class="pv-avance-pie">${esHoy ? 'clientes de la ruta con pedido cargado' : 'clientes de esta ruta con pedido cargado hoy'}</div>
      <div class="pv-tramos" aria-hidden="true">${clientes.map(c => h`<span class="${pedidosDelDia(c.id, hoy).length ? 'hecho' : ''}"></span>`)}</div>
    </div>`);

    if (!clientes.length) {
      html += String(h`<div class="vacio panel">${pv ? pv.nombre : 'Este preventista'} no tiene clientes asignados para el ${DIAS_NOMBRE[dia].toLowerCase()}. Se puede seleccionar otro día o buscar un cliente fuera de la ruta.</div>`);
    } else {
      html += String(h`<ol class="pv-ruta">${clientes.map((c, i) => {
        const peds = pedidosDelDia(c.id, hoy);
        const saldo = App.q.saldoCliente(c.id);
        const vencida = App.q.deudaVencida(c.id);
        const enCarrito = carritos[c.id] && carritos[c.id].items.length;
        const marcas = [];
        if (peds.length) marcas.push(ui.chip('Pedido ' + peds[peds.length - 1].nro + ', ' + ui.pesosCorto(peds.reduce((s, p) => s + p.total, 0)), 'ok'));
        else if (enCarrito) marcas.push(ui.chip('Pedido en carga', 'info'));
        const vis = !peds.length && visitaDelDia(c.id, hoy);
        if (vis) marcas.push(ui.chip('Sin pedido: ' + vis.motivo.toLowerCase(), 'neutro'));
        if (vencida > 0.01) marcas.push(ui.chip('Deuda vencida ' + ui.pesosCorto(vencida), 'peligro'));
        if (saldo > c.limiteCredito) marcas.push(ui.chip('Límite de crédito excedido', 'peligro'));
        else if (saldo >= c.limiteCredito * 0.9) marcas.push(ui.chip('Próximo al límite de crédito', 'alerta'));
        return h`<li class="pv-parada${peds.length ? ' hecha' : ''}${vis ? ' visitada' : ''}"><a href="#/preventa/cliente/${c.id}">
          <span class="pv-orden" aria-label="${peds.length ? 'Con pedido cargado' : 'Parada ' + (i + 1)}">${peds.length ? ui.seguro(iconoCheck) : i + 1}</span>
          <span><span class="pv-nombre">${c.fantasia}</span><span class="pv-dir">${c.direccion}, ${c.localidad}</span>${marcas.length ? h`<span class="pv-marcas">${marcas}</span>` : ''}</span>
          <span class="pv-saldo">Saldo<strong>${ui.pesosCorto(saldo)}</strong></span>
        </a></li>`;
      })}</ol>`);
    }

    html += String(h`<div class="pv-otro">
      <div class="campo"><label for="pv-otro">Clientes fuera de la ruta</label>
      <input id="pv-otro" type="search" autocomplete="off" placeholder="Buscar por nombre, código o localidad"></div>
      <ul class="pv-lista-simple" id="pv-otro-res"></ul>
    </div>`);
    app.innerHTML = html;
    el.appendChild(app);

    app.querySelectorAll('[data-pv]').forEach(b => b.addEventListener('click', () => { elegirPreventista(b.dataset.pv); App.renderizar(); }));
    app.querySelectorAll('[data-dia]').forEach(b => b.addEventListener('click', () => { diaElegido = b.dataset.dia === diaHoy() ? null : b.dataset.dia; App.renderizar(); }));
    const inp = app.querySelector('#pv-otro'), res = app.querySelector('#pv-otro-res');
    ui.buscador(inp, t => {
      if (t.length < 2) { res.innerHTML = ''; return; }
      const xs = App.db.clientes.filter(c => c.activo !== false && ui.coincide(t, c.fantasia, c.razonSocial, c.codigo, c.localidad, c.cuit)).slice(0, 8);
      res.innerHTML = xs.length ? xs.map(c => String(h`<li><a href="#/preventa/cliente/${c.id}"><span><strong>${c.fantasia}</strong><span class="pv-dir">${c.localidad}, visita ${c.diasVisita.map(d => DIAS_NOMBRE[d].toLowerCase()).join(' y ')}</span></span><span class="pv-saldo">Saldo<strong>${ui.pesosCorto(App.q.saldoCliente(c.id))}</strong></span></a></li>`)).join('')
        : String(h`<li class="nota-discreta" style="padding:10px 4px">No se encontraron clientes para «${inp.value}».</li>`);
    });
  }

  // ---------- pantalla 2: ficha del cliente y carga del pedido ----------
  function renderCliente(el, clienteId) {
    const c = App.get('clientes', clienteId);
    if (!c) {
      el.innerHTML = String(h`<div class="vacio vacio-grande"><h1 class="titulo-vista">Cliente no encontrado</h1><a class="btn btn-primario" href="#/preventa">Volver a la ruta</a></div>`);
      return;
    }
    const pvId = leerPreventista();
    const dep = App.get('depositos', c.depositoId);
    const lista = App.get('listasPrecio', c.listaId);
    const saldo = App.q.saldoCliente(c.id);
    const vencida = App.q.deudaVencida(c.id);
    const ult = ultimoPedido(c.id);
    const car = carrito(c.id);
    const hoyPeds = pedidosDelDia(c.id, App.hoy());
    const uso = c.limiteCredito ? Math.min(1, Math.max(0, saldo / c.limiteCredito)) : 1;

    const app = document.createElement('div');
    app.className = 'pv-app pv-ficha';
    app.innerHTML = String(h`
      <a class="pv-volver" href="#/preventa"><svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12.5 4.5L7 10l5.5 5.5"/></svg>Ruta de hoy</a>
      <h1 class="titulo-vista pv-ficha-nombre">${c.fantasia}</h1>
      <div class="pv-ficha-sub">
        <span>${c.direccion}, ${c.localidad}</span>
        ${c.telefono ? h`<a href="tel:${c.telefono.replace(/\s/g, '')}">Llamar al ${c.telefono}</a>` : ''}
        <span>${c.razonSocial}, ${IVA_NOMBRE[c.condicionIVA] || c.condicionIVA}</span>
        <span>Lista ${lista ? lista.nombre : c.listaId}, despacho desde ${dep ? dep.nombre : c.depositoId}</span>
      </div>
      <div class="seccion">
        ${ui.franjaKpi([
          { titulo: 'Saldo de cuenta', valor: ui.pesosCorto(saldo), detalle: 'Plazo de pago: ' + (c.plazo || 0) + ' días' },
          { titulo: 'Deuda vencida', valor: ui.pesosCorto(vencida), tono: vencida > 0.01 ? 'peligro' : 'ok', detalle: vencida > 0.01 ? 'Solicitar regularización' : 'Al día' },
          { titulo: 'Límite de crédito', valor: ui.pesosCorto(c.limiteCredito) },
          { titulo: 'Crédito disponible', valor: ui.pesosCorto(Math.max(0, c.limiteCredito - saldo)), tono: saldo >= c.limiteCredito ? 'peligro' : (saldo > c.limiteCredito * 0.8 ? 'alerta' : null) }
        ])}
        <div class="pv-credito">
          <div class="barra-h" role="img" aria-label="Utiliza el ${ui.porcentaje(uso, 0)} del límite"><span class="${uso >= 1 ? 'lleno' : ''}" style="width:${(uso * 100).toFixed(1)}%"></span></div>
          <div class="pv-credito-pie"><span>Utiliza el ${ui.porcentaje(saldo / (c.limiteCredito || 1), 0)} del límite</span><span>${hoyPeds.length ? 'Pedidos de hoy: ' + hoyPeds.length + '' : 'Sin pedido hoy'}</span></div>
        </div>
      </div>
      <div class="panel pv-ultimo">
        ${ult ? h`<p><strong>Último pedido, ${ui.fecha(ult.fecha)}</strong><br><span class="texto-2">${ult.items.length} ${ult.items.length === 1 ? 'producto' : 'productos'} por ${ui.pesos(ult.total)}, ${ult.estado === 'pendiente' ? 'pendiente de facturación' : 'facturado'}.</span></p>
          <button class="btn btn-secundario" type="button" id="pv-repetir">Repetir último pedido</button>`
        : h`<p class="texto-2">El cliente no registra pedidos.</p>`}
        ${!hoyPeds.length ? h`<button class="btn btn-fantasma" type="button" id="pv-nocompro" style="margin-top:8px">${visitaDelDia(c.id, App.hoy()) ? 'Visita sin pedido: ' + visitaDelDia(c.id, App.hoy()).motivo.toLowerCase() + '. Modificar motivo' : 'Registrar visita sin pedido'}</button>` : ''}
      </div>
      <div class="pv-buscar">
        <div class="pv-buscar-caja">${ui.seguro(iconoLupa)}
          <label for="pv-buscar" class="solo-lector">Buscar producto por nombre, código de barras o PLU de balanza</label>
          <input id="pv-buscar" type="search" autocomplete="off" enterkeyhint="search" placeholder="Producto, marca, código de barras o PLU">
        </div>
        <div class="campo-ayuda">Al escanear el código con la lectora se agrega solo; la etiqueta de la balanza trae el peso.</div>
      </div>
      <p class="pv-sugerencia" id="pv-sug"></p>
      <ul class="pv-productos" id="pv-productos"></ul>
      <section class="pv-carrito" aria-labelledby="pv-car-tit">
        <h2 class="seccion-titulo" id="pv-car-tit">Pedido <span class="texto-2" id="pv-car-cuenta"></span></h2>
        <div id="pv-lineas"></div>
        <div class="pv-avisos" id="pv-avisos"></div>
        <div class="campo pv-obs"><label for="pv-obs">Observaciones para el depósito</label>
          <textarea id="pv-obs" rows="2" placeholder="Ejemplo: entregar después de las 10">${car.obs}</textarea></div>
      </section>
      <div class="pv-pie">
        <div class="pv-pie-total"><small id="pv-pie-det">Sin productos</small><strong id="pv-pie-total">${ui.pesos(0)}</strong></div>
        <button class="btn btn-senal btn-grande" type="button" id="pv-confirmar">Confirmar pedido</button>
      </div>`);
    el.appendChild(app);

    const $ = s => app.querySelector(s);
    const inp = $('#pv-buscar');
    const listaProd = $('#pv-productos');
    const sug = $('#pv-sug');

    const linea = productoId => car.items.find(x => x.productoId === productoId);
    const presLinea = it => presDe(App.get('productos', it.productoId), it.presentacion);
    // la presentación marcada en la lista: la elegida, la del renglón del pedido o la primera (bulto, o kilo en pesables)
    function presMarcada(p) { const it = linea(p.id); return presDe(p, presElegida[p.id] || (it && it.presentacion)); }
    const faltaLinea = it => renglonVista(it, c.listaId).cantidad > disponible(it.productoId, c.depositoId) + 1e-9;
    const cantOk = it => it.cantidad > 0 && (esKg(presLinea(it)) || it.cantidad % 1 === 0);
    function escala(it) { if (!it.bonifManual) it.bonif = App.bonifEscala(App.get('productos', it.productoId), renglonVista(it, c.listaId).cantidad); }
    // suma o resta en la presentación del renglón (en kilos de a medio kilo); presId sólo al agregar desde la lista
    function sumar(productoId, delta, presId, exacta) {
      const p = App.get('productos', productoId);
      let it = linea(productoId);
      if (it && presId && presId !== it.presentacion) {
        ui.toast('«' + p.descripcion + '» ya está en el pedido por ' + presLinea(it).nombre.toLowerCase() + '. Cambiá la presentación desde el renglón.', 'alerta');
        return;
      }
      if (!it) { if (delta <= 0) return; it = { productoId, presentacion: presDe(p, presId).id, cantidad: 0, bonif: 0 }; car.items.push(it); }
      const pr = presLinea(it);
      const paso = exacta != null ? exacta : (esKg(pr) && it.cantidad ? 0.5 : 1) * Math.sign(delta);
      const tope = maxPres(pr, disponible(productoId, c.depositoId));
      let nueva = rq(it.cantidad + paso);
      if (paso > 0 && nueva > tope) { ui.toast('De «' + p.descripcion + '» alcanzan para ' + cantTexto(pr, tope) + ' × ' + pr.nombre.toLowerCase() + ' en ' + dep.nombre + '.', 'alerta'); nueva = Math.max(it.cantidad, tope); }
      if (nueva <= 0) car.items = car.items.filter(x => x !== it);
      else { it.cantidad = nueva; escala(it); }
      dibujarCarrito(); dibujarProductos();
    }

    function filaProducto(p) {
      const ps = App.presentaciones(p);
      const pr = presMarcada(p);
      const disp = disponible(p.id, c.depositoId);
      const it = linea(p.id);
      const enCar = it && it.presentacion === pr.id ? it.cantidad : 0;
      const otraPres = it && it.presentacion !== pr.id;
      const lugar = maxPres(pr, disp) - enCar;
      const conIVA = precioPresIVA(p, c.listaId, pr);
      const esc = (p.escalaBonif || [])[0];
      return h`<li class="pv-prod">
        <div><div class="pv-prod-desc">${p.descripcion}</div><div class="pv-prod-sub">${p.marca}, <span style="white-space:nowrap">${p.codigo}</span>${p.plu ? h`, <span style="white-space:nowrap">PLU ${p.plu}</span>` : ''}</div>${esc ? h`<span class="pv-escala">Bonificación del ${ui.num(esc.pct, 0)} % desde ${esc.desde} bultos</span>` : ''}</div>
        <div class="pv-prod-precio">${ui.pesos(conIVA)}<small>${esKg(pr) ? 'el kilo' : pr.nombre.toLowerCase()}, con IVA</small><small class="${maxPres(pr, disp) > 0 ? '' : 'sin'}">${maxPres(pr, disp) > 0 ? (esKg(pr) ? 'Quedan ' + cantTexto(pr, disp) + ' kg' : 'Quedan ' + cantTexto(pr, maxPres(pr, disp))) : 'Sin stock'}</small></div>
        <button type="button" class="pv-mas${enCar ? ' en-carrito' : ''}" data-mas="${p.id}" data-pres="${pr.id}" ${lugar > 0 && !otraPres ? '' : 'disabled'} aria-label="${enCar ? 'Agregar ' + (esKg(pr) ? 'medio kilo' : 'una') + ' de ' + p.descripcion + ', ' + pr.nombre.toLowerCase() + ', cantidad actual ' + cantTexto(pr, enCar) : 'Agregar ' + p.descripcion + ', ' + pr.nombre.toLowerCase()}">${enCar ? cantTexto(pr, enCar) : '+'}</button>
        ${ps.length > 1 ? h`<div class="pv-pres" role="group" aria-label="Presentación de ${p.descripcion}">${ps.map(x => h`<button type="button" data-elegir="${p.id}" data-pres="${x.id}" aria-pressed="${x.id === pr.id}">${x.nombre}<span>${ui.pesos(precioPresIVA(p, c.listaId, x))}</span></button>`)}</div>` : ''}
        ${otraPres ? h`<div class="pv-pres-aviso">En el pedido va por ${presLinea(it).nombre.toLowerCase()}: cambiá la presentación desde el renglón.</div>` : ''}
      </li>`;
    }
    let ultimoTexto = textoBusqueda[c.id] || '';
    function dibujarProductos() {
      const t = ui.normalizar(ultimoTexto).trim();
      let xs;
      if (t.length < 2) {
        xs = habituales(c.id, 8);
        sug.textContent = xs.length ? 'Productos más comprados por el cliente:' : 'Buscar un producto para comenzar.';
      } else {
        xs = App.db.productos.filter(p => p.activo !== false && ui.coincide(t, p.descripcion, p.marca, p.codigo, p.ean, p.rubro, p.plu, p.codigoPropio)).slice(0, 25);
        sug.textContent = xs.length ? xs.length + (xs.length === 1 ? ' producto' : ' productos') + ' con «' + ultimoTexto.trim() + '»' : 'No se encontraron productos para «' + ultimoTexto.trim() + '». Se puede buscar por marca, código o PLU.';
      }
      listaProd.hidden = !xs.length;
      listaProd.innerHTML = xs.map(p => String(filaProducto(p))).join('');
    }
    listaProd.addEventListener('click', e => {
      const el2 = e.target.closest('[data-elegir]');
      if (el2) { presElegida[el2.dataset.elegir] = el2.dataset.pres; dibujarProductos(); const b = listaProd.querySelector('[data-elegir="' + el2.dataset.elegir + '"][data-pres="' + el2.dataset.pres + '"]'); if (b) b.focus(); return; }
      const b = e.target.closest('[data-mas]');
      if (b) sumar(b.dataset.mas, 1, b.dataset.pres);
    });

    inp.value = ultimoTexto;
    ui.buscador(inp, (t, crudo) => { ultimoTexto = textoBusqueda[c.id] = crudo || ''; dibujarProductos(); }, 100);
    // lectora: EAN, código interno, PLU o etiqueta de la balanza (trae el peso) y Enter
    inp.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const crudo = inp.value.trim();
      const hallado = productoPorCodigo(crudo);
      if (hallado) {
        const p = hallado.p, it = linea(p.id);
        const presId = hallado.presentacion || (it ? it.presentacion : presMarcada(p).id);
        const pr = presDe(p, presId);
        if (maxPres(pr, disponible(p.id, c.depositoId)) - (it && it.presentacion === pr.id ? it.cantidad : 0) <= 0) { ui.toast('De «' + p.descripcion + '» no queda stock disponible.', 'peligro'); return; }
        sumar(p.id, 1, presId, hallado.cantidad);
        const ya = linea(p.id);
        if (ya) ui.toast('Producto agregado: ' + p.descripcion + '. Cantidad: ' + cantTexto(presLinea(ya), ya.cantidad) + ' × ' + presLinea(ya).nombre.toLowerCase() + '.', 'ok');
        inp.value = ''; ultimoTexto = textoBusqueda[c.id] = ''; dibujarProductos();
      } else if (crudo.replace(/\D/g, '').length >= 8) ui.toast('No existe un producto con el código ' + crudo.replace(/\D/g, '') + '.', 'alerta');
    });

    function dibujarCarrito() {
      const cont = $('#pv-lineas');
      const validos = car.items.filter(cantOk);
      const t = totales(c, validos);
      let faltaStock = false, invalida = false;
      if (!car.items.length) {
        cont.innerHTML = '<div class="pv-vacio-carrito">El pedido no tiene productos. Se agregan con el botón + de la lista superior, eligiendo antes la presentación.</div>';
      } else {
        cont.innerHTML = String(h`<ul class="pv-lineas">${car.items.map(it => {
          const p = App.get('productos', it.productoId);
          const pr = presLinea(it);
          const ps = App.presentaciones(p);
          const disp = disponible(p.id, c.depositoId);
          const tope = maxPres(pr, disp);
          const mal = faltaLinea(it), malCant = !cantOk(it);
          if (mal) faltaStock = true;
          if (malCant) invalida = true;
          const r = renglonVista(it, c.listaId);
          return h`<li class="pv-linea${mal || malCant ? ' sin-stock' : ''}">
            <div><div class="pv-prod-desc">${p.descripcion}</div><div class="pv-linea-sub">${ui.pesos(precioPres(p, c.listaId, pr))} sin IVA ${esKg(pr) ? 'el kilo' : 'por ' + pr.nombre.toLowerCase()}, IVA ${ui.num(p.iva, p.iva % 1 ? 1 : 0)} %${it.bonif ? ', bonificado ' + ui.num(it.bonif, 1) + ' %' : ''}</div></div>
            <div class="pv-linea-total">${malCant ? '' : ui.pesos(App.subtotalItem(r))}<small class="pv-linea-sub" style="display:block;font-weight:400">sin IVA</small></div>
            ${ps.length > 1 ? h`<label class="pv-linea-pres"><span>Presentación</span><select data-cambiar="${p.id}" aria-label="Presentación de ${p.descripcion}">${ps.map(x => h`<option value="${x.id}" ${x.id === pr.id ? 'selected' : ''}>${x.nombre}, ${ui.pesos(precioPresIVA(p, c.listaId, x))} con IVA</option>`)}</select></label>` : ''}
            <div class="pv-linea-abajo">
              <div class="pv-paso">
                <button type="button" data-menos="${p.id}" aria-label="Restar ${esKg(pr) ? 'medio kilo' : 'una'} de ${p.descripcion}">−</button>
                <input type="text" inputmode="${esKg(pr) ? 'decimal' : 'numeric'}" value="${valorInput(pr, it.cantidad)}" data-cant="${p.id}" aria-label="Cantidad de ${p.descripcion}${esKg(pr) ? ' en kilos' : ', ' + pr.nombre.toLowerCase()}">
                <button type="button" data-sumar="${p.id}" ${it.cantidad >= tope ? 'disabled' : ''} aria-label="Agregar ${esKg(pr) ? 'medio kilo' : 'una'} de ${p.descripcion}">+</button>
              </div>
              ${esKg(pr) ? h`<span class="pv-unidad">kg</span>` : ''}
              <label class="pv-bonif">% bonif. <input type="number" inputmode="decimal" min="0" max="99" step="0.5" value="${it.bonif || 0}" data-bonif="${p.id}" aria-label="Bonificación de ${p.descripcion}"></label>
              <button type="button" class="pv-quitar" data-quitar="${p.id}">Quitar</button>
            </div>
            ${malCant ? h`<div class="pv-error-linea">${esKg(pr) ? 'Indicá los kilos, por ejemplo 1,35.' : 'La cantidad tiene que ser un número entero.'}</div>`
              : mal ? h`<div class="pv-error-linea">En ${dep.nombre} alcanzan para ${cantTexto(pr, tope)} × ${pr.nombre.toLowerCase()}. Es necesario reducir la cantidad.</div>` : ''}
          </li>`;
        })}</ul>`);
      }
      $('#pv-car-cuenta').textContent = car.items.length ? car.items.length + (car.items.length === 1 ? ' producto' : ' productos') : '';
      const avisos = [];
      if (car.items.length && saldo + t.total > c.limiteCredito) avisos.push(h`<div class="aviso aviso-alerta"><div><strong>Excede el límite de crédito.</strong> Con este pedido la cuenta queda en ${ui.pesos(saldo + t.total)} y el límite es ${ui.pesos(c.limiteCredito)}. Puede confirmarse de todos modos: quedará marcado para revisión de administración antes de facturar.</div></div>`);
      if (vencida > 0.01) avisos.push(h`<div class="aviso aviso-peligro"><div>Tiene ${ui.pesos(vencida)} de deuda vencida. Se recomienda gestionar la cobranza durante la visita.</div></div>`);
      if (faltaStock) avisos.push(h`<div class="aviso aviso-peligro"><div>Hay productos sin stock suficiente. Es necesario corregir las cantidades marcadas para confirmar.</div></div>`);
      if (invalida) avisos.push(h`<div class="aviso aviso-peligro"><div>Hay cantidades para revisar: los bultos, packs y unidades van enteros; por kilo se admiten decimales.</div></div>`);
      $('#pv-avisos').innerHTML = avisos.map(String).join('');
      $('#pv-pie-det').textContent = car.items.length ? 'Neto ' + ui.pesos(t.neto) + ' + IVA ' + ui.pesos(t.iva) : 'Sin productos';
      $('#pv-pie-total').textContent = ui.pesos(t.total);
      $('#pv-confirmar').disabled = !car.items.length || faltaStock || invalida;
    }

    $('#pv-lineas').addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.menos) sumar(b.dataset.menos, -1);
      else if (b.dataset.sumar) sumar(b.dataset.sumar, 1);
      else if (b.dataset.quitar) { car.items = car.items.filter(x => x.productoId !== b.dataset.quitar); dibujarCarrito(); dibujarProductos(); }
    });
    $('#pv-lineas').addEventListener('change', e => {
      const bi = e.target.closest('[data-bonif]');
      if (bi) { const it = linea(bi.dataset.bonif); if (it) { it.bonif = Math.max(0, Math.min(99, Number(bi.value) || 0)); it.bonifManual = true; } dibujarCarrito(); return; }
      const sp = e.target.closest('[data-cambiar]');
      if (sp) {
        const it = linea(sp.dataset.cambiar); if (!it) return;
        const pr = presDe(App.get('productos', it.productoId), sp.value);
        it.presentacion = pr.id; presElegida[it.productoId] = pr.id;
        if (!esKg(pr)) it.cantidad = Math.max(1, Math.round(it.cantidad) || 1);
        escala(it); dibujarCarrito(); dibujarProductos();
        return;
      }
      const i = e.target.closest('[data-cant]');
      if (!i) return;
      const it = linea(i.dataset.cant);
      if (!it) return;
      const pr = presLinea(it);
      const v = leerCant(i.value);
      if (!(v > 0)) car.items = car.items.filter(x => x !== it);
      else { it.cantidad = esKg(pr) ? rq(v) : v; escala(it); }
      dibujarCarrito(); dibujarProductos();
    });
    $('#pv-obs').addEventListener('input', e => { car.obs = e.target.value; });

    const rep = $('#pv-repetir');
    if (rep) rep.addEventListener('click', () => {
      const recortados = [];
      let sumados = 0;
      ult.items.forEach(x => {
        const p = App.get('productos', x.productoId);
        if (!p || p.activo === false) return;
        const pr = presDe(p, x.pres ? x.pres.id : 'b');
        const quiere = x.pres ? x.pres.cantidad : x.cantidad;
        const pone = Math.min(quiere, maxPres(pr, disponible(p.id, c.depositoId)));
        if (pone < quiere) recortados.push(p.descripcion + (pone > 0 ? ' (sólo ' + cantTexto(pr, pone) + ')' : ' (sin stock)'));
        if (pone <= 0) return;
        const it = linea(p.id);
        if (it && it.presentacion === pr.id) it.cantidad = Math.max(it.cantidad, pone);
        else if (!it) car.items.push({ productoId: p.id, presentacion: pr.id, cantidad: pone, bonif: x.bonif || 0, bonifManual: !!x.bonif });
        sumados++;
      });
      dibujarCarrito(); dibujarProductos();
      if (recortados.length) ui.toast('Último pedido cargado. Stock insuficiente para: ' + recortados.join(', ') + '.', 'alerta');
      else ui.toast('Último pedido cargado: ' + sumados + ' productos. Verificar las cantidades.', 'ok');
    });

    $('#pv-confirmar').addEventListener('click', () => {
      const p = App.intentar(() => App.acciones.crearPedido({
        clienteId: c.id, preventistaId: pvId, origen: 'preventa', obs: car.obs.trim(),
        items: car.items.map(x => ({ productoId: x.productoId, presentacion: x.presentacion, cantidad: x.cantidad, bonif: x.bonif || 0 }))
      }), r => 'Pedido ' + r.nro + ' confirmado');
      if (!p) return;
      delete carritos[c.id];
      delete textoBusqueda[c.id];
      aviso = { pedidoId: p.id };
      ui.ir('#/preventa');
    });

    const noCompro = $('#pv-nocompro');
    if (noCompro) noCompro.addEventListener('click', () => {
      const cuerpo = ui.nodo(String(h`<div><p style="margin-top:0">El motivo queda registrado en la ruta y se computa en la efectividad de visita.</p><div class="pv-nocompro">${MOTIVOS_SIN_PEDIDO.map(m => h`<button type="button" class="btn btn-secundario" data-motivo="${m}">${m}</button>`)}</div></div>`));
      const md = ui.modal({ titulo: 'Motivo de visita sin pedido', cuerpo, ancho: 460, acciones: [{ texto: 'Volver', tipo: 'secundario' }] });
      cuerpo.addEventListener('click', e => {
        const b = e.target.closest('[data-motivo]'); if (!b) return;
        const v = App.intentar(() => App.acciones.registrarVisita({ clienteId: c.id, preventistaId: pvId, motivo: b.dataset.motivo }), 'Visita registrada: ' + c.fantasia + ', ' + b.dataset.motivo.toLowerCase());
        if (v) { md.cerrar(); ui.ir('#/preventa'); }
      });
    });

    dibujarProductos();
    dibujarCarrito();
  }

  App.modulo({
    id: 'preventa',
    titulo: 'Preventa',
    grupo: 'Comercial',
    orden: 10,
    icono: '<svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="2" width="8" height="16" rx="1.8"/><path d="M9 15h2"/><path d="M8.5 6.5l1.2 1.2 2.3-2.4"/></svg>',
    render(el, params) {
      estilos();
      if (params[0] === 'cliente' && params[1]) renderCliente(el, params[1]);
      else renderRuta(el);
    }
  });
})();
