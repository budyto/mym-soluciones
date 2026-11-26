/* Módulo «Stock e inventario»: existencias por depósito, ficha del producto con lotes FEFO, vencimientos,
   bajo mínimo, toma de inventario, transferencias y valorización. Todo lo que cambia datos pasa por
   App.acciones (ajustarStock, transferirStock, guardarMaestro, actualizarPrecios, crearOrdenCompra). */
(function () {
  'use strict';
  const ui = App.ui, h = ui.h, q = App.q;

  // lo que elige la persona se guarda acá, así sobrevive a los redibujos por 'cambio'
  const estado = {
    texto: '', textoCrudo: '', rubro: '', dep: '', soloBajo: false, verInactivos: false,
    diasVenc: 15,
    inv: { dep: 'D1', rubro: 'Lácteos y frescos', conteo: {} },
    tr: { productoId: '', desde: 'D1', hasta: 'D2', cantidad: '', obs: '' },
    tipoAjuste: ''
  };

  // ---------- estilos propios del módulo (prefijo st-) ----------
  const CSS = `
.st-ean { background: #fff; border: 1px solid var(--linea); border-radius: var(--r-control); padding: 8px 10px 4px; width: 210px; flex: none; }
.st-ean .ean13 { color: #000; }
.st-ean-pie { display: flex; justify-content: space-between; gap: 8px; white-space: nowrap; font-size: var(--fs-12); color: var(--texto-2); padding: 2px; }
.st-cabeza { display: flex; gap: 24px; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; margin-bottom: 20px; }
.st-cabeza-texto { flex: 1 1 360px; min-width: 0; }
.st-cabeza .acciones { margin-top: 14px; }
.st-etiquetas-datos { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.st-dif-pos { color: var(--ok); font-weight: 600; }
.st-dif-neg { color: var(--peligro); font-weight: 600; }
.tabla input.st-conteo { width: 96px; }
.tabla input.st-conteo.tiene { border-color: var(--tinta); background: #FFFBEA; }
.st-resumen-inv { display: flex; flex-wrap: wrap; gap: 12px 28px; align-items: center; justify-content: space-between; margin-top: 14px; padding: 14px 18px; background: var(--hoja); border: 1px solid var(--linea); border-radius: var(--r-panel); }
.st-resumen-inv dl { display: flex; flex-wrap: wrap; gap: 6px 28px; margin: 0; }
.st-resumen-inv dt { font-size: var(--fs-12); color: var(--texto-2); }
.st-resumen-inv dd { margin: 0; font-weight: 800; font-stretch: 112%; font-size: var(--fs-20); }
.st-total-val { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 18px; margin-bottom: 16px; }
.st-total-val .texto-2 { max-width: 70ch; }
.st-prov { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 14px; }
.st-prov-item { display: flex; gap: 14px; align-items: center; justify-content: space-between; background: var(--hoja); border: 1px solid var(--linea); border-left: 4px solid var(--carton); border-radius: var(--r-control); padding: 10px 12px 10px 14px; flex: 1 1 300px; }
.st-prov-item strong { display: block; }
.st-sugerencias { display: flex; flex-direction: column; margin: 0; padding: 0; list-style: none; }
.st-sugerencias li { display: flex; justify-content: space-between; gap: 10px; align-items: center; font-size: var(--fs-13); padding: 8px 0; border-bottom: 1px solid var(--linea-suave); }
.st-sugerencias li:last-child { border-bottom: 0; }
.st-precio-sug { font-size: var(--fs-12); color: var(--texto-2); min-height: 1.2em; }
.st-lado { display: grid; grid-template-columns: minmax(0, 400px) minmax(0, 1fr); gap: 20px; align-items: start; }
@media (max-width: 1100px) { .st-lado { grid-template-columns: minmax(0, 1fr); } }
@media (max-width: 760px) {
  .st-ean { width: 100%; max-width: 260px; }
  .st-resumen-inv { flex-direction: column; align-items: stretch; }
  .st-resumen-inv .btn { width: 100%; justify-content: center; }
  .st-prov-item { flex-direction: column; align-items: stretch; }
}`;
  function estilos() {
    if (document.getElementById('st-estilos')) return;
    const s = document.createElement('style');
    s.id = 'st-estilos'; s.textContent = CSS;
    document.head.appendChild(s);
  }

  // ---------- ayudas ----------
  const depositos = () => App.db.depositos.filter(d => d.activo !== false);
  const nombreDep = id => (App.get('depositos', id) || {}).nombre || id || '';
  const rubros = () => Array.from(new Set(App.db.productos.map(p => p.rubro)));
  const productosActivos = () => App.db.productos.filter(p => p.activo !== false);
  const plural = (n, uno, varios) => ui.num(n) + ' ' + (Math.abs(n) === 1 ? uno : varios);
  function valorProducto(prodId, dep) { return App.r2(q.lotes(prodId, dep || undefined).reduce((s, l) => s + l.cantidad * l.costo, 0)); }
  function boton(texto, clase, fn, titulo) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'btn btn-chico ' + (clase || 'btn-secundario'); b.textContent = texto;
    if (titulo) b.title = titulo;
    b.addEventListener('click', e => { e.stopPropagation(); fn(e); });
    return b;
  }
  function semaforo(dias) {
    if (dias < 0) return { texto: 'Vencido hace ' + plural(-dias, 'día', 'días'), tono: 'peligro' };
    if (dias === 0) return { texto: 'Vence hoy', tono: 'peligro' };
    if (dias <= 3) return { texto: 'Vence en ' + plural(dias, 'día', 'días'), tono: 'peligro' };
    if (dias <= 7) return { texto: 'Vence en ' + plural(dias, 'día', 'días'), tono: 'alerta' };
    if (dias <= 30) return { texto: 'Vence en ' + plural(dias, 'día', 'días'), tono: 'info' };
    return { texto: 'Vence en ' + plural(dias, 'día', 'días'), tono: 'ok' };
  }
  function enCamino(prodId) {
    return App.r2(App.db.ordenesCompra.reduce((s, oc) => oc.estado === 'pendiente' ? s + oc.items.filter(it => it.productoId === prodId).reduce((a, it) => a + it.cantidad, 0) : s, 0));
  }
  function opcionesProductos(elegido) {
    return ui.seguro(rubros().map(r => '<optgroup label="' + ui.escapar(r) + '">' +
      productosActivos().filter(p => p.rubro === r).map(p => '<option value="' + p.id + '"' + (p.id === elegido ? ' selected' : '') + '>' + ui.escapar(p.descripcion + ' (' + p.codigo + ')') + '</option>').join('') + '</optgroup>').join(''));
  }
  // un ajuste no puede dejar menos stock sano que lo reservado por pedidos sin facturar
  function chequearReserva(prod, dep, baja, lote) {
    if (!(baja > 0)) return;
    const st = q.stock(prod.id, dep);
    const sano = lote ? (lote.vence && lote.vence < App.hoy() ? 0 : baja) : Math.max(0, baja - st.vencido);
    const queda = App.r2(st.fisico - st.vencido - sano);
    if (queda < st.reservado - 0.001) throw new Error('«' + prod.descripcion + '» tiene ' + ui.num(st.reservado) + ' reservados en ' + nombreDep(dep) + ' para pedidos sin facturar y quedarían ' + ui.num(Math.max(0, queda)) + ' sin vencer. Se debe verificar el conteo o modificar esos pedidos antes del ajuste.');
  }
  // venta promedio por semana de las últimas 4 semanas (en unidades de venta)
  function ventaSemanal(prodId) {
    const desde = App.f.sumar(App.hoy(), -28);
    let s = 0;
    App.db.comprobantes.forEach(c => { if (c.clase === 'factura' && c.fecha > desde) c.items.forEach(it => { if (it.productoId === prodId) s += it.cantidad; }); });
    return s / 4;
  }

  // ---------- movimientos de un producto (derivados de comprobantes, lotes y ajustes) ----------
  function movimientos(prodId) {
    const movs = [];
    const ocDeLote = {};
    App.db.ordenesCompra.forEach(oc => { if (oc.recepcion) (oc.recepcion.loteIds || []).forEach(id => { ocDeLote[id] = oc; }); });
    App.db.lotes.forEach(l => {
      if (l.productoId !== prodId || l.origen !== 'compra') return;
      const oc = ocDeLote[l.id];
      const prov = oc ? App.get('proveedores', oc.proveedorId) : null;
      movs.push({ fecha: l.ingreso, orden: 0, tipo: oc ? 'Compra' : 'Existencia inicial', ref: oc ? 'OC ' + oc.nro : 'Apertura',
        detalle: (prov ? prov.razonSocial + ', ' : '') + 'lote ' + l.lote, dep: l.depositoId, cantidad: l.inicial });
    });
    App.db.comprobantes.forEach(c => {
      if (c.clase === 'factura') {
        const cant = App.r2(c.consumos.reduce((s, x) => x.productoId === prodId ? s + x.cantidad : s, 0));
        if (!cant) return;
        const ped = App.get('pedidos', c.pedidoId);
        const cli = App.get('clientes', c.clienteId);
        movs.push({ fecha: c.fecha, orden: 2, tipo: 'Venta', ref: c.tipo + ' ' + c.nro, detalle: cli ? cli.fantasia : c.razonSocial, dep: ped ? ped.depositoId : '', cantidad: -cant, ruta: '#/facturacion/comprobante/' + c.id });
      } else if (c.clase === 'nc' && c.reingresoStock) {
        const it = c.items.find(x => x.productoId === prodId);
        if (!it) return;
        const f = App.get('comprobantes', c.asociadoId);
        const ped = f ? App.get('pedidos', f.pedidoId) : null;
        movs.push({ fecha: c.fecha, orden: 1, tipo: 'Devolución', ref: c.tipo + ' ' + c.nro, detalle: c.motivo, dep: ped ? ped.depositoId : '', cantidad: it.cantidad, ruta: '#/facturacion/comprobante/' + c.id });
      }
    });
    App.db.ajustesStock.forEach(a => {
      if (a.productoId !== prodId) return;
      if (a.tipo === 'transferencia') {
        movs.push({ fecha: a.fecha, orden: 3, tipo: 'Transferencia', ref: 'TR ' + a.numero, detalle: 'Hacia ' + nombreDep(a.hastaDepositoId), dep: a.depositoId, cantidad: -a.cantidad });
        movs.push({ fecha: a.fecha, orden: 3, tipo: 'Transferencia', ref: 'TR ' + a.numero, detalle: 'Desde ' + nombreDep(a.depositoId), dep: a.hastaDepositoId, cantidad: a.cantidad });
      } else {
        movs.push({ fecha: a.fecha, orden: 3, tipo: 'Ajuste', ref: 'AJ ' + a.numero, detalle: a.motivo, dep: a.depositoId, cantidad: a.cantidad });
      }
    });
    movs.sort((a, b) => a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : a.orden - b.orden);
    let saldo = 0;
    movs.forEach(m => { saldo = App.r2(saldo + m.cantidad); m.saldo = saldo; });
    return movs.reverse();
  }

  // ---------- modales ----------
  function siguienteCodigo(rubro) {
    const del = App.db.productos.filter(p => p.rubro === rubro && /-\d+$/.test(p.codigo || ''));
    const pref = del.length ? del[0].codigo.split('-')[0] : rubro.slice(0, 2).toUpperCase();
    const max = del.reduce((m, p) => Math.max(m, Number(p.codigo.split('-')[1]) || 0), 0);
    return pref + '-' + String(max + 1).padStart(3, '0');
  }

  function modalProducto(prod) {
    const p = prod || { descripcion: '', marca: '', rubro: 'Almacén', unidad: 'Caja x 12', contenido: 12, iva: 21, costo: '', precios: {}, minimo: 0, vidaUtil: 180, pesoKg: '', proveedorId: App.db.proveedores[0].id, ean: '', activo: true };
    const listas = App.db.listasPrecio;
    const form = document.createElement('form');
    form.className = 'form-grilla';
    form.innerHTML = h`
      <div class="campo ancho-total"><label for="pf-desc">Descripción</label><input id="pf-desc" name="descripcion" required value="${p.descripcion}" placeholder="Ej.: Yerba mate con palo 1 kg"><span class="campo-ayuda">Incluir el contenido (1 kg, 500 g, 1,5 L): la etiqueta de góndola lo utiliza para calcular el precio por kilo o por litro.</span></div>
      <div class="campo"><label for="pf-marca">Marca</label><input id="pf-marca" name="marca" value="${p.marca}"></div>
      <div class="campo"><label for="pf-rubro">Rubro</label><select id="pf-rubro" name="rubro">${rubros().map(r => h`<option${r === p.rubro ? ' selected' : ''}>${r}</option>`)}</select></div>
      <div class="campo"><label for="pf-prov">Proveedor</label><select id="pf-prov" name="proveedorId">${ui.opciones(App.db.proveedores, 'id', 'razonSocial', p.proveedorId)}</select></div>
      <div class="campo"><label for="pf-unidad">Unidad de venta</label><input id="pf-unidad" name="unidad" value="${p.unidad}" placeholder="Caja x 12"></div>
      <div class="campo"><label for="pf-cont">Unidades por bulto</label><input id="pf-cont" name="contenido" type="number" min="1" step="1" value="${p.contenido}"></div>
      <div class="campo"><label for="pf-iva">IVA</label><select id="pf-iva" name="iva"><option value="21"${p.iva === 21 ? ' selected' : ''}>21 %</option><option value="10.5"${p.iva === 10.5 ? ' selected' : ''}>10,5 %</option></select></div>
      <div class="campo"><label for="pf-costo">Costo por bulto (neto)</label><input id="pf-costo" name="costo" type="number" min="0" step="0.01" value="${p.costo}"></div>
      ${listas.map(l => h`<div class="campo"><label for="pf-${l.id}">Precio ${l.nombre} (neto)</label><input id="pf-${l.id}" name="precio_${l.id}" type="number" min="0" step="1" value="${p.precios[l.id] != null ? p.precios[l.id] : ''}"><span class="st-precio-sug" data-sug="${l.id}"></span></div>`)}
      <div class="campo ancho-total"><button type="button" class="btn btn-fantasma btn-chico" data-sugerir>Calcular precios según el recargo de cada lista</button></div>
      <div class="campo"><label for="pf-min">Stock mínimo</label><input id="pf-min" name="minimo" type="number" min="0" step="1" value="${p.minimo}"></div>
      <div class="campo"><label for="pf-vida">Vida útil (días)</label><input id="pf-vida" name="vidaUtil" type="number" min="1" step="1" value="${p.vidaUtil == null ? '' : p.vidaUtil}"><span class="campo-ayuda">Sin completar si el producto no vence.</span></div>
      <div class="campo"><label for="pf-peso">Peso del bulto (kg)</label><input id="pf-peso" name="pesoKg" type="number" min="0" step="0.1" value="${p.pesoKg}"></div>
      <div class="campo"><label for="pf-ean">Código EAN-13</label><input id="pf-ean" name="ean" inputmode="numeric" maxlength="13" value="${p.ean}" placeholder="Sin completar: se genera uno interno"><span class="campo-ayuda" data-ean-ayuda>13 dígitos; el último es el dígito verificador.</span></div>
      ${prod ? h`<label class="check ancho-total"><input type="checkbox" name="activo"${p.activo !== false ? ' checked' : ''}> Producto activo (se vende y aparece en el catálogo)</label>` : ''}`;
    const costoIn = form.querySelector('[name=costo]');
    const sugerencias = () => {
      const c = Number(costoIn.value) || 0;
      listas.forEach(l => {
        const s = form.querySelector('[data-sug="' + l.id + '"]');
        const pr = Number(form.querySelector('[name=precio_' + l.id + ']').value) || 0;
        s.textContent = c && pr ? 'Margen sobre costo ' + ui.porcentaje(pr / c - 1) : '';
      });
    };
    form.addEventListener('input', sugerencias);
    sugerencias();
    form.querySelector('[data-sugerir]').addEventListener('click', () => {
      const c = Number(costoIn.value) || 0;
      if (!c) { ui.toast('Falta el costo del bulto.', 'alerta'); costoIn.focus(); return; }
      listas.forEach(l => { form.querySelector('[name=precio_' + l.id + ']').value = Math.round(c * (1 + l.recargo)); });
      sugerencias();
    });
    const eanIn = form.querySelector('[name=ean]');
    eanIn.addEventListener('input', () => {
      const v = eanIn.value.replace(/\D/g, '');
      const ayuda = form.querySelector('[data-ean-ayuda]');
      if (v.length === 12) ayuda.textContent = 'Falta el dígito verificador: corresponde ' + App.f.digitoEAN(v) + '.';
      else if (v.length === 13) ayuda.textContent = App.f.eanValido(v) ? 'Código válido.' : 'El dígito verificador no coincide: corresponde ' + App.f.digitoEAN(v.slice(0, 12)) + '.';
      else ayuda.textContent = '13 dígitos; el último es el dígito verificador.';
      eanIn.setAttribute('aria-invalid', v.length === 13 && !App.f.eanValido(v) ? 'true' : 'false');
    });
    form.addEventListener('submit', e => e.preventDefault());
    ui.modal({
      titulo: prod ? 'Editar producto' : 'Nuevo producto', cuerpo: form, ancho: 760,
      acciones: [{ texto: 'Cancelar', tipo: 'secundario' }, { texto: prod ? 'Guardar cambios' : 'Crear producto', tipo: 'primario', alClic: () => {
        const d = ui.leerFormulario(form);
        if (!d.descripcion || !d.descripcion.trim()) throw new Error('Falta la descripción del producto.');
        if (!(d.costo > 0)) throw new Error('El costo debe ser mayor que cero.');
        if (!(d.contenido >= 1)) throw new Error('Las unidades por bulto deben ser 1 o más.');
        const precios = {};
        listas.forEach(l => {
          const v = d['precio_' + l.id];
          if (!(v > 0)) throw new Error('Falta el precio de la lista ' + l.nombre + '.');
          precios[l.id] = Math.round(v);
        });
        const ean = String(d.ean || '').replace(/\D/g, '');
        if (ean && !App.f.eanValido(ean)) throw new Error('Código EAN-13 inválido: el dígito verificador no coincide.');
        const repetido = ean && App.db.productos.find(x => x.ean === ean && (!prod || x.id !== prod.id));
        if (repetido) throw new Error('El código EAN ya está asignado a «' + repetido.descripcion + '».');
        const vida = d.vidaUtil ? Math.round(d.vidaUtil) : null;
        const datos = {
          descripcion: d.descripcion.trim(), marca: (d.marca || '').trim(), rubro: d.rubro, proveedorId: d.proveedorId,
          unidad: (d.unidad || '').trim() || 'Unidad', contenido: Math.round(d.contenido), iva: Number(d.iva), costo: App.r2(d.costo), precios,
          minimo: Math.max(0, Math.round(d.minimo || 0)), vidaUtil: vida, fresco: vida != null && vida <= 45, pesoKg: d.pesoKg || 0
        };
        if (ean) datos.ean = ean;
        if (prod) { datos.id = prod.id; datos.activo = !!d.activo; if (prod.rubro !== d.rubro) datos.codigo = siguienteCodigo(d.rubro); }
        else { datos.codigo = siguienteCodigo(d.rubro); datos.popularidad = 0.5; }
        const r = App.acciones.guardarMaestro('productos', datos);
        ui.toast(prod ? 'Cambios guardados' : 'Producto creado: ' + r.codigo, 'ok');
        if (!prod) setTimeout(() => ui.ir('#/stock/producto/' + r.id), 0);
      } }]
    });
  }

  function modalPrecios() {
    const cuerpo = document.createElement('form');
    cuerpo.className = 'form-grilla';
    cuerpo.innerHTML = h`
      <div class="campo"><label for="ap-rubro">Productos</label><select id="ap-rubro" name="rubro"><option value="">Todos los rubros</option>${rubros().map(r => h`<option>${r}</option>`)}</select></div>
      <div class="campo"><label for="ap-lista">Lista</label><select id="ap-lista" name="lista"><option value="">Las tres listas</option>${ui.opciones(App.db.listasPrecio, 'id', 'nombre')}</select></div>
      <div class="campo"><label for="ap-pct">Aumento (%)</label><input id="ap-pct" name="pct" type="number" step="0.5" value="5"><span class="campo-ayuda">Valor negativo para una baja de precios.</span></div>
      <div class="ancho-total aviso" data-vista></div>`;
    const vista = cuerpo.querySelector('[data-vista]');
    const elegidos = () => { const d = ui.leerFormulario(cuerpo); return { d, prods: productosActivos().filter(p => !d.rubro || p.rubro === d.rubro) }; };
    const pintar = () => {
      const { d, prods } = elegidos();
      const pct = Number(d.pct) || 0;
      const ej = prods[0];
      const l = d.lista || 'L2';
      vista.textContent = !pct ? 'Falta indicar el porcentaje.' : 'Se actualizan ' + plural(prods.length, 'producto', 'productos') + '. Ejemplo: ' + (ej ? ej.descripcion + ', lista ' + App.get('listasPrecio', l).nombre + ': ' + ui.pesos(ej.precios[l]) + ' pasa a ' + ui.pesos(Math.round(ej.precios[l] * (1 + pct / 100))) + '.' : '');
    };
    cuerpo.addEventListener('input', pintar);
    cuerpo.addEventListener('change', pintar);
    cuerpo.addEventListener('submit', e => e.preventDefault());
    pintar();
    ui.modal({
      titulo: 'Actualizar precios', cuerpo, ancho: 620,
      acciones: [{ texto: 'Cancelar' }, { texto: 'Actualizar precios', tipo: 'primario', alClic: () => {
        const { d, prods } = elegidos();
        if (!prods.length) throw new Error('No hay productos para actualizar.');
        const n = App.acciones.actualizarPrecios({ productoIds: prods.map(p => p.id), porcentaje: d.pct, listaId: d.lista || undefined });
        ui.toast('Precios actualizados: ' + plural(n, 'producto', 'productos') + '. Las etiquetas actualizadas pueden imprimirse desde Etiquetas y códigos.', 'ok');
      } }]
    });
  }

  function modalAjuste(prod, lote) {
    const cuerpo = document.createElement('form');
    cuerpo.className = 'form-grilla';
    const depIni = lote ? lote.depositoId : 'D1';
    const motivos = ['Toma de inventario', 'Rotura', 'Vencido', 'Faltante sin justificar', 'Sobrante sin justificar', 'Muestra o degustación'];
    const vencido = lote && lote.vence && lote.vence < App.hoy();
    cuerpo.innerHTML = h`
      <div class="campo"><label for="aj-dep">Depósito</label><select id="aj-dep" name="dep"${lote ? ' disabled' : ''}>${ui.opciones(depositos(), 'id', 'nombre', depIni)}</select></div>
      <div class="campo"><label for="aj-lote">Lote</label><select id="aj-lote" name="loteId"></select></div>
      <div class="campo"><label for="aj-modo">Tipo de carga</label><select id="aj-modo" name="modo"><option value="contado">Cantidad contada</option><option value="delta">Diferencia (suma o resta)</option></select></div>
      <div class="campo"><label for="aj-cant" data-rot>Cantidad contada</label><input id="aj-cant" name="cantidad" type="number" step="1"></div>
      <div class="campo ancho-total"><label for="aj-mot">Motivo</label><select id="aj-mot" name="motivo">${motivos.map(m => h`<option${vencido && m === 'Vencido' ? ' selected' : ''}>${m}</option>`)}</select></div>
      <p class="ancho-total nota-discreta" data-info></p>`;
    const depSel = cuerpo.querySelector('[name=dep]'), loteSel = cuerpo.querySelector('[name=loteId]');
    const pintarLotes = () => {
      const ls = q.lotes(prod.id, depSel.value);
      loteSel.innerHTML = '<option value="">Sin lote específico (baja por FEFO, alta en lote nuevo)</option>' + ls.map(l => '<option value="' + l.id + '"' + (lote && l.id === lote.id ? ' selected' : '') + '>' + ui.escapar(l.lote + ', ' + ui.num(l.cantidad) + (l.vence ? ', vence ' + ui.fecha(l.vence) : '')) + '</option>').join('');
    };
    const info = () => {
      const l = loteSel.value ? App.get('lotes', loteSel.value) : null;
      const sist = l ? l.cantidad : q.stock(prod.id, depSel.value).fisico;
      const modo = cuerpo.querySelector('[name=modo]').value;
      cuerpo.querySelector('[data-rot]').textContent = modo === 'contado' ? 'Cantidad contada' : 'Diferencia (con signo)';
      const crudo = cuerpo.querySelector('[name=cantidad]').value;
      const v = Number(crudo);
      const dif = modo === 'contado' ? v - sist : v;
      cuerpo.querySelector('[data-info]').textContent = 'En el sistema: ' + ui.num(sist) + ' (' + prod.unidad + ')' + (l ? ' en el lote ' + l.lote : ' en ' + nombreDep(depSel.value)) + '.' +
        (crudo !== '' ? ' Diferencia: ' + (dif > 0 ? '+' : '') + ui.num(dif) + ', a costo ' + ui.pesos(Math.abs(dif) * (l ? l.costo : prod.costo)) + '. Genera un asiento contra Diferencias de inventario.' : '');
    };
    pintarLotes();
    depSel.addEventListener('change', () => { pintarLotes(); info(); });
    cuerpo.addEventListener('input', info);
    cuerpo.addEventListener('change', info);
    cuerpo.addEventListener('submit', e => e.preventDefault());
    info();
    ui.modal({
      titulo: 'Ajustar stock', cuerpo, ancho: 640,
      acciones: [{ texto: 'Cancelar' }, { texto: 'Ajustar stock', tipo: 'primario', alClic: () => {
        const d = ui.leerFormulario(cuerpo);
        if (d.cantidad == null || isNaN(d.cantidad)) throw new Error('Falta la cantidad.');
        const args = { productoId: prod.id, depositoId: depSel.value, motivo: d.motivo };
        if (d.loteId) args.loteId = d.loteId;
        if (d.modo === 'contado') { if (d.cantidad < 0) throw new Error('La cantidad contada no puede ser negativa.'); args.contado = d.cantidad; } else args.cantidad = d.cantidad;
        const l = d.loteId ? App.get('lotes', d.loteId) : null;
        const sist = l ? l.cantidad : q.stock(prod.id, depSel.value).fisico;
        chequearReserva(prod, depSel.value, d.modo === 'contado' ? sist - d.cantidad : -d.cantidad, l);
        App.acciones.ajustarStock(args);
        ui.toast('Stock ajustado', 'ok');
      } }]
    });
  }

  // formulario de transferencia (se usa en la pestaña y en la ficha)
  function formTransferencia(contenedor) {
    const t = estado.tr;
    if (!t.productoId || !App.get('productos', t.productoId)) t.productoId = productosActivos()[0].id;
    const form = document.createElement('form');
    form.className = 'form-grilla';
    form.innerHTML = h`
      <div class="campo ancho-total"><label for="tr-prod">Producto</label><select id="tr-prod" name="productoId">${opcionesProductos(t.productoId)}</select></div>
      <div class="campo"><label for="tr-desde">Desde</label><select id="tr-desde" name="desde">${ui.opciones(depositos(), 'id', 'nombre', t.desde)}</select></div>
      <div class="campo"><label for="tr-hasta">Hasta</label><select id="tr-hasta" name="hasta">${ui.opciones(depositos(), 'id', 'nombre', t.hasta)}</select></div>
      <div class="campo"><label for="tr-cant">Cantidad</label><input id="tr-cant" name="cantidad" type="number" min="1" step="1" value="${t.cantidad}"></div>
      <div class="campo"><label for="tr-obs">Observación</label><input id="tr-obs" name="obs" value="${t.obs}" placeholder="Ej.: reposición semanal"></div>
      <p class="ancho-total nota-discreta" data-info></p>`;
    const info = () => {
      const d = ui.leerFormulario(form);
      Object.assign(t, { productoId: d.productoId, desde: d.desde, hasta: d.hasta, cantidad: d.cantidad == null ? '' : d.cantidad, obs: d.obs });
      const p = App.get('productos', d.productoId);
      const st = q.stock(d.productoId, d.desde), st2 = q.stock(d.productoId, d.hasta);
      const ls = q.lotes(d.productoId, d.desde).filter(l => !l.vence || l.vence >= App.hoy());
      form.querySelector('[data-info]').textContent = d.desde === d.hasta ? 'Los depósitos de origen y destino deben ser distintos.' :
        'Disponible en ' + nombreDep(d.desde) + ': ' + ui.num(st.disponible) + ' (' + p.unidad + '). En ' + nombreDep(d.hasta) + ' hay ' + ui.num(st2.disponible) + '. ' +
        (ls.length ? 'Egresa primero el lote ' + ls[0].lote + (ls[0].vence ? ', con vencimiento el ' + ui.fecha(ls[0].vence) : '') + ' (FEFO).' : 'No hay lotes vigentes para transferir.');
    };
    form.addEventListener('input', info); form.addEventListener('change', info);
    form.addEventListener('submit', e => e.preventDefault());
    info();
    contenedor.appendChild(form);
    return {
      hacer() {
        const d = ui.leerFormulario(form);
        if (!(d.cantidad > 0)) throw new Error('Falta la cantidad a transferir.');
        const r = App.acciones.transferirStock({ productoId: d.productoId, desdeId: d.desde, hastaId: d.hasta, cantidad: d.cantidad, obs: d.obs || undefined });
        t.cantidad = ''; t.obs = '';
        ui.toast('Stock transferido: ' + ui.num(r.cantidad) + ' a ' + nombreDep(d.hasta), 'ok');
        return r;
      }
    };
  }
  function modalTransferencia(prod) {
    if (prod) estado.tr.productoId = prod.id;
    const cuerpo = document.createElement('div');
    const f = formTransferencia(cuerpo);
    ui.modal({ titulo: 'Transferir stock entre depósitos', cuerpo, ancho: 640,
      acciones: [{ texto: 'Cancelar' }, { texto: 'Transferir stock', tipo: 'primario', alClic: () => { f.hacer(); } }] });
  }

  // ---------- pantalla principal ----------
  function renderInicio(el) {
    const total = q.valorStock();
    const porDep = depositos().map(d => ({ d, v: q.valorStock(d.id) }));
    const vto7 = q.vencimientosProximos(7);
    const vencidos = vto7.filter(v => v.dias < 0);
    const porVencer = vto7.filter(v => v.dias >= 0);
    const bajo = q.bajoMinimo();
    el.innerHTML = h`
      <div class="encabezado-vista">
        <div><h1 class="titulo-vista">Stock e inventario</h1>
          <p class="bajada">Existencias por depósito con sus lotes y vencimientos. Los egresos se descuentan por FEFO (primero vence, primero sale) y el inventario se valoriza a costo.</p></div>
        <div class="acciones"><a class="btn btn-secundario" href="#/listas">Listas de precios</a><button class="btn btn-primario" type="button" data-acc="nuevo">Nuevo producto</button></div>
      </div>
      ${ui.franjaKpi([
        { titulo: 'Inventario a costo', valor: ui.pesosCorto(total), detalle: porDep.map(x => x.d.nombre + ' ' + ui.pesosCorto(x.v)).join(', ') },
        { titulo: 'Bajo mínimo', valor: ui.num(bajo.length), detalle: bajo.length ? bajo.slice(0, 2).map(b => b.producto.descripcion).join(', ') + (bajo.length > 2 ? ' y más' : '') : 'Stock cubierto', tono: bajo.length ? 'alerta' : 'ok' },
        { titulo: 'Lotes que vencen en 7 días', valor: ui.num(porVencer.length), detalle: ui.pesos(porVencer.reduce((s, v) => s + v.costo, 0)) + ' a costo', tono: porVencer.length ? 'alerta' : 'ok' },
        { titulo: 'Vencido en depósito', valor: ui.pesosCorto(vencidos.reduce((s, v) => s + v.costo, 0)), detalle: vencidos.length ? plural(vencidos.length, 'lote para dar de baja', 'lotes para dar de baja') : 'Sin mercadería vencida', tono: vencidos.length ? 'peligro' : 'ok' },
        { titulo: 'Productos activos', valor: ui.num(productosActivos().length), detalle: plural(rubros().length, 'rubro', 'rubros') }
      ])}
      <div data-pestanas></div>`;
    el.querySelector('[data-acc=nuevo]').addEventListener('click', () => modalProducto(null));
    void modalPrecios; // el aumento masivo ahora vive en «Listas de precios» (#/listas)
    const vto = q.vencimientosProximos(estado.diasVenc);
    ui.pestanas(el.querySelector('[data-pestanas]'), [
      { id: 'productos', titulo: 'Productos', cuenta: productosActivos().length, render: tabProductos },
      { id: 'vencimientos', titulo: 'Vencimientos', cuenta: vto.length, render: tabVencimientos },
      { id: 'minimo', titulo: 'Bajo mínimo', cuenta: bajo.length, render: tabMinimo },
      { id: 'inventario', titulo: 'Toma de inventario', render: tabInventario },
      { id: 'transferencias', titulo: 'Transferencias', render: tabTransferencias },
      { id: 'valorizacion', titulo: 'Valorización', render: tabValorizacion },
      { id: 'ajustes', titulo: 'Ajustes y movimientos', render: tabAjustes }
    ], { clave: 'stock-principal' });
  }

  function tabProductos(panel) {
    const filtros = ui.nodo(h`<div class="filtros">
      <label class="solo-lector" for="st-buscar">Buscar producto</label>
      <input id="st-buscar" type="search" placeholder="Buscar por nombre, código, EAN o marca" value="${estado.textoCrudo}">
      <label class="solo-lector" for="st-rubro">Rubro</label>
      <select id="st-rubro"><option value="">Todos los rubros</option>${rubros().map(r => h`<option${r === estado.rubro ? ' selected' : ''}>${r}</option>`)}</select>
      <div class="segmentado" role="group" aria-label="Depósito">
        <button type="button" data-dep="" aria-pressed="${!estado.dep}">Todos</button>
        ${depositos().map(d => h`<button type="button" data-dep="${d.id}" aria-pressed="${estado.dep === d.id}">${d.nombre}</button>`)}
      </div>
      <label class="check"><input type="checkbox" data-bajo${estado.soloBajo ? ' checked' : ''}> Sólo bajo mínimo</label>
      <label class="check"><input type="checkbox" data-inact${estado.verInactivos ? ' checked' : ''}> Ver inactivos</label>
    </div>`);
    panel.appendChild(filtros);
    const filas = () => App.db.productos.filter(p => (estado.verInactivos || p.activo !== false) && (!estado.rubro || p.rubro === estado.rubro) && ui.coincide(estado.texto, p.descripcion, p.codigo, p.ean, p.marca))
      .map(p => {
        const st = q.stock(p.id, estado.dep || undefined);
        const tot = estado.dep ? q.stock(p.id) : st;
        return { p, st, bajo: tot.disponible < p.minimo, valor: valorProducto(p.id, estado.dep) };
      }).filter(f => !estado.soloBajo || f.bajo);
    const crear = () => {
      const datos = filas();
      return ui.tabla({
        columnas: [
          { titulo: 'Producto', valor: f => h`<span class="celda-principal">${f.p.descripcion}</span><span class="celda-sub">${f.p.codigo}, EAN ${f.p.ean}${f.p.activo === false ? ', inactivo' : ''}</span>`, ordenar: f => f.p.descripcion },
          { titulo: 'Rubro', clase: 'ocultar-celu', valor: f => f.p.rubro, ordenar: f => f.p.rubro },
          { titulo: 'Unidad', clase: 'ocultar-celu', valor: f => f.p.unidad },
          { titulo: 'Físico', clase: 'ocultar-celu', alinear: 'der', valor: f => ui.num(f.st.fisico), ordenar: f => f.st.fisico },
          { titulo: 'Reservado', clase: 'ocultar-celu', alinear: 'der', valor: f => f.st.reservado ? ui.num(f.st.reservado) : '–', ordenar: f => f.st.reservado },
          { titulo: 'Disponible', alinear: 'der', valor: f => h`<strong class="${f.bajo ? 'alerta' : ''}">${ui.num(f.st.disponible)}</strong>${f.st.vencido ? h`<span class="celda-sub peligro">${ui.num(f.st.vencido)} vencido</span>` : ''}`, ordenar: f => f.st.disponible },
          { titulo: 'Mínimo', alinear: 'der', valor: f => f.bajo ? ui.chip(ui.num(f.p.minimo), 'alerta') : ui.num(f.p.minimo), ordenar: f => f.p.minimo },
          { titulo: 'Valorizado a costo', clase: 'ocultar-celu', alinear: 'der', valor: f => ui.pesos(f.valor), ordenar: f => f.valor }
        ],
        filas: datos,
        pie: [plural(datos.length, 'producto', 'productos'), '', '', '', '', '', '', ui.pesos(datos.reduce((s, f) => s + f.valor, 0))],
        filaClase: f => f.p.activo === false ? 'fila-apagada' : f.bajo ? 'fila-alerta' : '',
        alClic: f => ui.ir('#/stock/producto/' + f.p.id),
        vacio: 'No hay productos que coincidan con el filtro.'
      });
    };
    let tabla = crear();
    panel.appendChild(tabla);
    const refrescar = () => { const nueva = crear(); tabla.replaceWith(nueva); tabla = nueva; };
    ui.buscador(filtros.querySelector('#st-buscar'), (t, crudo) => { estado.texto = t; estado.textoCrudo = crudo; refrescar(); });
    filtros.querySelector('#st-rubro').addEventListener('change', e => { estado.rubro = e.target.value; refrescar(); });
    filtros.querySelectorAll('[data-dep]').forEach(b => b.addEventListener('click', () => {
      estado.dep = b.dataset.dep;
      filtros.querySelectorAll('[data-dep]').forEach(x => x.setAttribute('aria-pressed', x === b));
      refrescar();
    }));
    filtros.querySelector('[data-bajo]').addEventListener('change', e => { estado.soloBajo = e.target.checked; refrescar(); });
    filtros.querySelector('[data-inact]').addEventListener('change', e => { estado.verInactivos = e.target.checked; refrescar(); });
  }

  async function darDeBaja(v) {
    const ok = await ui.confirmar('Se dan de baja ' + ui.num(v.cantidad) + ' de «' + v.producto.descripcion + '», lote ' + v.lote.lote + ', en ' + v.deposito.nombre + '. Se imputan ' + ui.pesos(v.costo) + ' a costo a Diferencias de inventario.', { titulo: 'Dar de baja el lote', aceptar: 'Dar de baja', tipo: 'peligro' });
    if (!ok) return;
    App.intentar(() => { chequearReserva(v.producto, v.lote.depositoId, v.cantidad, v.lote); return App.acciones.ajustarStock({ loteId: v.loteId, cantidad: -v.cantidad, motivo: v.dias < 0 ? 'Vencido' : 'Retiro por vencimiento próximo' }); }, 'Lote dado de baja');
  }

  function tabVencimientos(panel) {
    const lista = q.vencimientosProximos(estado.diasVenc);
    const vencidos = lista.filter(v => v.dias < 0);
    const barra = ui.nodo(h`<div class="filtros"><span class="texto-2">Vencimientos en los próximos</span><div class="segmentado" role="group" aria-label="Plazo">
      ${[7, 15, 30, 60].map(d => h`<button type="button" data-d="${d}" aria-pressed="${estado.diasVenc === d}">${d} días</button>`)}</div></div>`);
    barra.querySelectorAll('[data-d]').forEach(b => b.addEventListener('click', () => { estado.diasVenc = Number(b.dataset.d); App.renderizar(); }));
    panel.appendChild(barra);
    if (vencidos.length) panel.appendChild(ui.nodo(h`<div class="aviso aviso-peligro" style="margin-bottom:14px">Hay ${plural(vencidos.length, 'lote vencido', 'lotes vencidos')} en depósito por ${ui.pesos(vencidos.reduce((s, v) => s + v.costo, 0))} a costo. La facturación ya no los utiliza; corresponde darlos de baja para que el inventario refleje la existencia real.</div>`));
    panel.appendChild(ui.tabla({
      columnas: [
        { titulo: 'Estado', valor: f => { const s = semaforo(f.dias); return ui.chip(s.texto, s.tono); }, ordenar: f => f.dias },
        { titulo: 'Producto', valor: f => h`<span class="celda-principal">${f.producto.descripcion}</span><span class="celda-sub">${f.producto.codigo}, ${f.producto.rubro}</span>`, ordenar: f => f.producto.descripcion },
        { titulo: 'Lote', clase: 'ocultar-celu', valor: f => f.lote.lote },
        { titulo: 'Depósito', clase: 'ocultar-celu', valor: f => f.deposito.nombre, ordenar: f => f.deposito.nombre },
        { titulo: 'Vence', valor: f => ui.fecha(f.vence), ordenar: f => f.vence },
        { titulo: 'Cantidad', alinear: 'der', valor: f => ui.num(f.cantidad), ordenar: f => f.cantidad },
        { titulo: 'A costo', clase: 'ocultar-celu', alinear: 'der', valor: f => ui.pesos(f.costo), ordenar: f => f.costo },
        { titulo: '', alinear: 'der', valor: f => boton(f.dias < 0 ? 'Dar de baja' : 'Retirar', f.dias < 0 ? 'btn-peligro' : 'btn-secundario', () => darDeBaja(f), f.dias < 0 ? 'Baja por vencimiento' : 'Retirar de la venta antes del vencimiento') }
      ],
      filas: lista,
      filaClase: f => f.dias <= 3 ? 'fila-peligro' : f.dias <= 7 ? 'fila-alerta' : '',
      alClic: f => ui.ir('#/stock/producto/' + f.producto.id),
      pie: [plural(lista.length, 'lote', 'lotes'), '', '', '', '', ui.num(lista.reduce((s, v) => s + v.cantidad, 0)), ui.pesos(lista.reduce((s, v) => s + v.costo, 0)), ''],
      vacio: 'No hay vencimientos en los próximos ' + estado.diasVenc + ' días.'
    }));
  }

  function tabMinimo(panel) {
    const lista = q.bajoMinimo().map(b => {
      const camino = enCamino(b.productoId);
      const sugerido = Math.max(0, Math.ceil(b.minimo * 2 - b.stock - camino));
      return Object.assign({}, b, { camino, sugerido, proveedor: App.get('proveedores', b.producto.proveedorId) });
    });
    if (!lista.length) { panel.appendChild(ui.nodo('<div class="vacio">No hay productos por debajo del stock mínimo. Los productos que lo alcancen se listarán aquí con la cantidad sugerida de compra.</div>')); return; }
    const porProv = {};
    lista.filter(x => x.sugerido > 0).forEach(x => { (porProv[x.proveedor.id] = porProv[x.proveedor.id] || { prov: x.proveedor, items: [] }).items.push(x); });
    panel.appendChild(ui.nodo('<p class="nota-discreta">La cantidad sugerida lleva el stock al doble del mínimo, descontando lo pedido pendiente de recepción. La orden de compra queda pendiente en Compras para su revisión y envío.</p>'));
    const caja = document.createElement('div'); caja.className = 'st-prov';
    Object.values(porProv).forEach(g => {
      const costo = g.items.reduce((s, x) => s + x.sugerido * x.producto.costo, 0);
      const item = ui.nodo(h`<div class="st-prov-item"><div><strong>${g.prov.razonSocial}</strong><span class="texto-2 chico">${plural(g.items.length, 'producto', 'productos')}, aprox. ${ui.pesos(costo)} más IVA</span></div></div>`);
      item.appendChild(boton('Generar orden de compra', 'btn-primario', () => {
        App.intentar(() => App.acciones.crearOrdenCompra({ proveedorId: g.prov.id, depositoId: 'D1', items: g.items.map(x => ({ productoId: x.productoId, cantidad: x.sugerido })), obs: 'Reposición por stock bajo mínimo' }),
          oc => 'Orden de compra ' + oc.nro + ' generada para ' + g.prov.razonSocial);
      }));
      caja.appendChild(item);
    });
    panel.appendChild(caja);
    panel.appendChild(ui.tabla({
      columnas: [
        { titulo: 'Producto', valor: f => h`<span class="celda-principal">${f.producto.descripcion}</span><span class="celda-sub">${f.producto.codigo}, ${f.producto.unidad}</span>`, ordenar: f => f.producto.descripcion },
        { titulo: 'Proveedor', clase: 'ocultar-celu', valor: f => f.proveedor.razonSocial },
        { titulo: 'Disponible', alinear: 'der', valor: f => h`<strong class="alerta">${ui.num(f.stock)}</strong>`, ordenar: f => f.stock },
        { titulo: 'Mínimo', alinear: 'der', valor: f => ui.num(f.minimo) },
        { titulo: 'Cobertura', clase: 'ocultar-celu', valor: f => h`<div class="barra-h" title="${ui.porcentaje(f.stock / f.minimo, 0)} del mínimo"><span style="width:${Math.max(2, Math.min(100, f.stock / f.minimo * 100)).toFixed(0)}%;background:var(--alerta)"></span></div>` },
        { titulo: 'Pendiente de recepción', clase: 'ocultar-celu', alinear: 'der', valor: f => f.camino ? ui.num(f.camino) : '–', ordenar: f => f.camino },
        { titulo: 'Sugerido', alinear: 'der', valor: f => f.sugerido ? h`<strong>${ui.num(f.sugerido)}</strong>` : ui.chip('Ya pedido', 'info'), ordenar: f => f.sugerido }
      ],
      filas: lista, filaClase: () => 'fila-alerta',
      alClic: f => ui.ir('#/stock/producto/' + f.productoId)
    }));
  }

  function tabInventario(panel) {
    const inv = estado.inv;
    const barra = ui.nodo(h`<div class="filtros">
      <label class="solo-lector" for="inv-dep">Depósito</label><select id="inv-dep">${ui.opciones(depositos(), 'id', 'nombre', inv.dep)}</select>
      <label class="solo-lector" for="inv-rubro">Rubro</label><select id="inv-rubro"><option value="">Todos los rubros</option>${rubros().map(r => h`<option${r === inv.rubro ? ' selected' : ''}>${r}</option>`)}</select>
      <button type="button" class="btn btn-secundario btn-chico" data-copiar>Completar vacíos con el stock del sistema</button>
      <button type="button" class="btn btn-fantasma btn-chico" data-limpiar>Borrar conteo</button>
    </div>`);
    panel.appendChild(barra);
    panel.appendChild(ui.nodo('<p class="nota-discreta">Registro de las cantidades contadas en el depósito (Enter avanza a la fila siguiente). Las filas vacías no se modifican. Al confirmar, cada diferencia se registra como ajuste con su asiento contra Diferencias de inventario.</p>'));
    const clave = p => inv.dep + '|' + p.id;
    const prods = () => productosActivos().filter(p => !inv.rubro || p.rubro === inv.rubro);
    const filas = prods().map(p => ({ p, fisico: q.stock(p.id, inv.dep).fisico }));
    const difDe = f => { const c = inv.conteo[clave(f.p)]; return c == null || c === '' ? null : App.r2(Number(c) - f.fisico); };
    const pintarDif = (tr, f) => {
      if (!tr) return;
      const span = tr.querySelector('[data-dif]'), val = tr.querySelector('[data-val]');
      const d = difDe(f);
      span.className = d > 0 ? 'st-dif-pos' : d < 0 ? 'st-dif-neg' : 'texto-2';
      span.textContent = d == null ? '' : d === 0 ? 'Coincide' : (d > 0 ? '+' : '') + ui.num(d);
      val.textContent = d ? ui.pesos(d * f.p.costo) : '';
    };
    const tabla = ui.tabla({
      columnas: [
        { titulo: 'Producto', valor: f => h`<span class="celda-principal">${f.p.descripcion}</span><span class="celda-sub">${f.p.codigo}, ${f.p.unidad}</span>`, ordenar: f => f.p.descripcion },
        { titulo: 'Lotes', clase: 'ocultar-celu', valor: f => { const ls = q.lotes(f.p.id, inv.dep); return ls.length ? ls.slice(0, 2).map(l => l.lote).join(', ') + (ls.length > 2 ? ' y ' + (ls.length - 2) + ' más' : '') : '–'; } },
        { titulo: 'En el sistema', alinear: 'der', valor: f => ui.num(f.fisico), ordenar: f => f.fisico },
        { titulo: 'Contado', alinear: 'der', valor: f => {
          const inp = document.createElement('input');
          inp.type = 'number'; inp.min = '0'; inp.step = '1'; inp.className = 'st-conteo' + (inv.conteo[clave(f.p)] != null ? ' tiene' : '');
          inp.setAttribute('aria-label', 'Contado de ' + f.p.descripcion);
          inp.value = inv.conteo[clave(f.p)] != null ? inv.conteo[clave(f.p)] : '';
          inp.addEventListener('input', () => {
            if (inp.value === '') delete inv.conteo[clave(f.p)]; else inv.conteo[clave(f.p)] = Number(inp.value);
            inp.classList.toggle('tiene', inp.value !== '');
            pintarDif(inp.closest('tr'), f);
            resumen();
          });
          inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); const tr = inp.closest('tr').nextElementSibling; const sig = tr && tr.querySelector('input'); if (sig) sig.focus(); } });
          return inp;
        } },
        { titulo: 'Diferencia', alinear: 'der', valor: f => { const s = document.createElement('span'); s.dataset.dif = ''; s._fila = f; return s; } },
        { titulo: 'A costo', clase: 'ocultar-celu', alinear: 'der', valor: () => { const s = document.createElement('span'); s.dataset.val = ''; return s; } }
      ].filter(Boolean),
      filas, vacio: 'No hay productos activos en ese rubro.'
    });
    panel.appendChild(tabla);
    const pintarTodo = () => tabla.querySelectorAll('[data-dif]').forEach(s => pintarDif(s.closest('tr'), s._fila));
    // la tabla se redibuja al ordenar: se vuelven a pintar las diferencias
    new MutationObserver(pintarTodo).observe(tabla, { childList: true });
    pintarTodo();
    const res = document.createElement('div');
    res.className = 'st-resumen-inv';
    panel.appendChild(res);
    function resumen() {
      const con = filas.filter(f => difDe(f) != null);
      const difs = con.filter(f => difDe(f) !== 0);
      const falt = difs.reduce((s, f) => s + Math.min(0, difDe(f)) * f.p.costo, 0);
      const sob = difs.reduce((s, f) => s + Math.max(0, difDe(f)) * f.p.costo, 0);
      res.innerHTML = h`<dl><div><dt>Contados</dt><dd>${ui.num(con.length)} de ${ui.num(filas.length)}</dd></div><div><dt>Con diferencia</dt><dd>${ui.num(difs.length)}</dd></div>
        <div><dt>Faltante a costo</dt><dd class="${falt ? 'peligro' : ''}">${ui.pesos(-falt)}</dd></div><div><dt>Sobrante a costo</dt><dd class="${sob ? 'ok' : ''}">${ui.pesos(sob)}</dd></div></dl>`;
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'btn btn-senal btn-grande'; b.dataset.confirmarInventario = '';
      b.textContent = difs.length ? 'Confirmar ajuste de ' + plural(difs.length, 'producto', 'productos') : 'Confirmar ajuste';
      b.disabled = !con.length;
      b.addEventListener('click', () => confirmar(con, difs));
      res.appendChild(b);
    }
    async function confirmar(con, difs) {
      if (!difs.length) {
        con.forEach(f => delete inv.conteo[clave(f.p)]);
        ui.toast('El conteo coincide con el sistema: no se requieren ajustes.', 'ok');
        App.renderizar();
        return;
      }
      const ok = await ui.confirmar('Se ajustan ' + plural(difs.length, 'producto', 'productos') + ' en ' + nombreDep(inv.dep) + '. Cada uno genera un ajuste de stock y su asiento contra Diferencias de inventario.', { titulo: 'Confirmar ajuste de inventario', aceptar: 'Confirmar ajuste' });
      if (!ok) return;
      const trabados = [];
      difs.forEach(f => { try { chequearReserva(f.p, inv.dep, f.fisico - Number(inv.conteo[clave(f.p)]), null); } catch (e) { trabados.push(e.message); } });
      if (trabados.length) { ui.toast(trabados.join(' '), 'peligro'); return; }
      const errores = [];
      let hechos = 0;
      difs.forEach(f => {
        try { App.acciones.ajustarStock({ productoId: f.p.id, depositoId: inv.dep, contado: Number(inv.conteo[clave(f.p)]), motivo: 'Toma de inventario del ' + ui.fecha(App.hoy()) }); hechos++; delete inv.conteo[clave(f.p)]; }
        catch (e) { errores.push(f.p.descripcion + ': ' + e.message); }
      });
      con.filter(f => difDe(f) === 0).forEach(f => delete inv.conteo[clave(f.p)]);
      if (hechos) ui.toast('Ajuste confirmado: ' + plural(hechos, 'producto', 'productos') + ' en ' + nombreDep(inv.dep), 'ok');
      if (errores.length) ui.toast(errores.join(' '), 'peligro');
    }
    resumen();
    barra.querySelector('#inv-dep').addEventListener('change', e => { inv.dep = e.target.value; App.renderizar(); });
    barra.querySelector('#inv-rubro').addEventListener('change', e => { inv.rubro = e.target.value; App.renderizar(); });
    barra.querySelector('[data-copiar]').addEventListener('click', () => { filas.forEach(f => { if (inv.conteo[clave(f.p)] == null) inv.conteo[clave(f.p)] = f.fisico; }); App.renderizar(); });
    barra.querySelector('[data-limpiar]').addEventListener('click', () => { prods().forEach(p => delete inv.conteo[clave(p)]); App.renderizar(); });
  }

  function tabTransferencias(panel) {
    const lado = document.createElement('div');
    lado.className = 'st-lado';
    const izq = ui.nodo('<div class="panel"><h2 class="panel-titulo">Nueva transferencia</h2></div>');
    const f = formTransferencia(izq);
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'btn btn-primario'; btn.textContent = 'Transferir stock'; btn.style.marginTop = '14px'; btn.dataset.transferir = '';
    btn.addEventListener('click', () => { try { f.hacer(); } catch (e) { ui.toast(e.message, 'peligro'); } });
    izq.appendChild(btn);
    // sugerencias: lo que en un depósito quedó corto y en el otro sobra
    const sug = [];
    productosActivos().forEach(p => {
      depositos().forEach(d => {
        const otro = depositos().find(x => x.id !== d.id);
        if (!otro) return;
        const st = q.stock(p.id, d.id), so = q.stock(p.id, otro.id);
        const meta = Math.ceil(p.minimo * (d.id === 'D2' ? 0.35 : 0.65));
        if (st.disponible < meta && so.disponible > meta * 2) sug.push({ p, hasta: d, desde: otro, cant: Math.max(1, Math.min(Math.ceil(meta * 1.5 - st.disponible), Math.floor(so.disponible / 2))), st, falta: meta - st.disponible });
      });
    });
    sug.sort((a, b) => b.falta - a.falta);
    if (sug.length) {
      const caja = ui.nodo('<div style="margin-top:22px"><h3 class="panel-titulo">Sugerencias para equilibrar depósitos</h3><ul class="st-sugerencias"></ul></div>');
      const ul = caja.querySelector('ul');
      sug.slice(0, 6).forEach(s => {
        const li = ui.nodo(h`<li><span><strong>${s.p.descripcion}</strong><br><span class="texto-2">Existencia en ${s.hasta.nombre}: ${ui.num(s.st.disponible)}. Transferencia sugerida: ${ui.num(s.cant)} desde ${s.desde.nombre}</span></span></li>`);
        li.appendChild(boton('Cargar transferencia', 'btn-secundario', () => { Object.assign(estado.tr, { productoId: s.p.id, desde: s.desde.id, hasta: s.hasta.id, cantidad: s.cant, obs: 'Reposición de ' + s.hasta.nombre }); App.renderizar(); }));
        ul.appendChild(li);
      });
      izq.appendChild(caja);
    }
    lado.appendChild(izq);
    const der = ui.nodo('<div><h2 class="seccion-titulo">Últimas transferencias</h2></div>');
    const trs = App.db.ajustesStock.filter(a => a.tipo === 'transferencia').slice().reverse();
    der.appendChild(ui.tabla({
      columnas: [
        { titulo: 'N.º', valor: a => 'TR ' + a.numero, ordenar: a => a.numero },
        { titulo: 'Fecha', clase: 'ocultar-celu', valor: a => ui.fecha(a.fecha), ordenar: a => a.fecha },
        { titulo: 'Producto', valor: a => { const p = App.get('productos', a.productoId); return h`<span class="celda-principal">${p ? p.descripcion : a.productoId}</span><span class="celda-sub">Lote ${a.lotes.map(l => l.lote).join(', ')}</span>`; } },
        { titulo: 'Recorrido', clase: 'ocultar-celu', valor: a => nombreDep(a.depositoId) + ' a ' + nombreDep(a.hastaDepositoId) },
        { titulo: 'Cantidad', alinear: 'der', valor: a => ui.num(a.cantidad) },
        { titulo: 'Observación', clase: 'ocultar-celu', valor: a => a.motivo }
      ],
      filas: trs, limite: 25,
      alClic: a => ui.ir('#/stock/producto/' + a.productoId),
      vacio: 'No se registran transferencias entre depósitos.'
    }));
    lado.appendChild(der);
    panel.appendChild(lado);
  }

  function tabValorizacion(panel) {
    const deps = depositos();
    const porRubro = {}, porProd = {};
    let total = 0, unidades = 0;
    App.db.lotes.forEach(l => {
      if (!(l.cantidad > 0)) return;
      const p = App.get('productos', l.productoId); if (!p) return;
      const v = l.cantidad * l.costo;
      const r = porRubro[p.rubro] = porRubro[p.rubro] || { rubro: p.rubro, unidades: 0, total: 0, venta: 0, porDep: {} };
      r.unidades += l.cantidad; r.total += v; r.porDep[l.depositoId] = (r.porDep[l.depositoId] || 0) + v;
      r.venta += l.cantidad * q.precio(p.id, 'L1');
      const pp = porProd[p.id] = porProd[p.id] || { p, unidades: 0, total: 0 };
      pp.unidades += l.cantidad; pp.total += v;
      total += v; unidades += l.cantidad;
    });
    const filas = Object.values(porRubro).sort((a, b) => b.total - a.total);
    const venta = filas.reduce((s, r) => s + r.venta, 0);
    panel.appendChild(ui.nodo(h`<div class="st-total-val"><span class="cifra-grande">${ui.pesos(total)}</span><span class="texto-2">de mercadería a costo: ${ui.num(unidades)} bultos en ${plural(deps.length, 'depósito', 'depósitos')}. A precio de la lista Mayorista equivale a ${ui.pesos(venta)} netos, con un margen potencial de ${ui.porcentaje(venta ? 1 - total / venta : 0)}.</span></div>`));
    panel.appendChild(ui.tabla({
      columnas: [
        { titulo: 'Rubro', campo: 'rubro', clase: 'celda-principal' },
        { titulo: 'Bultos', clase: 'ocultar-celu', alinear: 'der', valor: r => ui.num(r.unidades), ordenar: r => r.unidades }
      ].concat(deps.map(d => ({ titulo: d.nombre, alinear: 'der', valor: r => ui.pesos(r.porDep[d.id] || 0), ordenar: r => r.porDep[d.id] || 0 })))
        .concat([
          { titulo: 'Total a costo', alinear: 'der', valor: r => h`<strong>${ui.pesos(r.total)}</strong>`, ordenar: r => r.total },
          { titulo: 'Participación', clase: 'ocultar-celu', valor: r => h`<div class="fila" style="flex-wrap:nowrap"><div class="barra-h" style="flex:1"><span style="width:${(r.total / total * 100).toFixed(1)}%"></span></div><span class="chico">${ui.porcentaje(r.total / total)}</span></div>`, ordenar: r => r.total }
        ]),
      filas,
      pie: ['Total', ui.num(unidades)].concat(deps.map(d => ui.pesos(q.valorStock(d.id)))).concat([ui.pesos(total), ''])
    }));
    const top = Object.values(porProd).sort((a, b) => b.total - a.total).slice(0, 10);
    const sec = ui.nodo('<div class="seccion"><h2 class="seccion-titulo">Mayor capital inmovilizado <span class="texto-2">los 10 productos con mayor valor en depósito</span></h2></div>');
    sec.appendChild(ui.tabla({
      columnas: [
        { titulo: 'Producto', valor: f => h`<span class="celda-principal">${f.p.descripcion}</span><span class="celda-sub">${f.p.codigo}, ${f.p.rubro}</span>` },
        { titulo: 'Bultos', clase: 'ocultar-celu', alinear: 'der', valor: f => ui.num(f.unidades) },
        { titulo: 'Semanas de venta', alinear: 'der', valor: f => { const s = ventaSemanal(f.p.id); return s ? ui.num(f.unidades / s, 1) : '–'; } },
        { titulo: 'A costo', alinear: 'der', valor: f => ui.pesos(f.total) },
        { titulo: 'Del total', clase: 'ocultar-celu', alinear: 'der', valor: f => ui.porcentaje(f.total / total) }
      ],
      filas: top, alClic: f => ui.ir('#/stock/producto/' + f.p.id)
    }));
    panel.appendChild(sec);
  }

  function tabAjustes(panel) {
    const barra = ui.nodo(h`<div class="filtros"><div class="segmentado" role="group" aria-label="Tipo">
      ${[['', 'Todos'], ['ajuste', 'Ajustes'], ['transferencia', 'Transferencias']].map(([v, t]) => h`<button type="button" data-t="${v}" aria-pressed="${estado.tipoAjuste === v}">${t}</button>`)}</div></div>`);
    barra.querySelectorAll('[data-t]').forEach(b => b.addEventListener('click', () => { estado.tipoAjuste = b.dataset.t; App.renderizar(); }));
    panel.appendChild(barra);
    const lista = App.db.ajustesStock.filter(a => !estado.tipoAjuste || a.tipo === estado.tipoAjuste).slice().reverse();
    panel.appendChild(ui.tabla({
      columnas: [
        { titulo: 'N.º', valor: a => (a.tipo === 'transferencia' ? 'TR ' : 'AJ ') + a.numero },
        { titulo: 'Fecha', clase: 'ocultar-celu', valor: a => ui.fecha(a.fecha), ordenar: a => a.fecha },
        { titulo: 'Tipo', valor: a => a.tipo === 'transferencia' ? ui.chip('Transferencia', 'info') : a.cantidad < 0 ? ui.chip('Baja', 'peligro') : ui.chip('Alta', 'ok') },
        { titulo: 'Producto', valor: a => { const p = App.get('productos', a.productoId); return h`<span class="celda-principal">${p ? p.descripcion : a.productoId}</span><span class="celda-sub">Lote ${a.lotes.map(l => l.lote).join(', ')}</span>`; } },
        { titulo: 'Depósito', clase: 'ocultar-celu', valor: a => a.tipo === 'transferencia' ? nombreDep(a.depositoId) + ' a ' + nombreDep(a.hastaDepositoId) : nombreDep(a.depositoId) },
        { titulo: 'Cantidad', alinear: 'der', valor: a => h`<span class="${a.tipo === 'transferencia' ? '' : a.cantidad < 0 ? 'st-dif-neg' : 'st-dif-pos'}">${a.cantidad > 0 && a.tipo !== 'transferencia' ? '+' : ''}${ui.num(a.cantidad)}</span>`, ordenar: a => a.cantidad },
        { titulo: 'Motivo', clase: 'ocultar-celu', valor: a => a.motivo },
        { titulo: 'A costo', clase: 'ocultar-celu', alinear: 'der', valor: a => a.costo ? ui.pesos(a.costo) : '–', ordenar: a => a.costo }
      ],
      filas: lista, limite: 40,
      alClic: a => ui.ir('#/stock/producto/' + a.productoId),
      vacio: 'No hay movimientos de este tipo.'
    }));
  }

  // ---------- ficha del producto ----------
  function renderFicha(el, id) {
    const p = App.get('productos', id);
    if (!p) {
      el.innerHTML = h`<div class="vacio vacio-grande"><h1 class="titulo-vista">No se encontró el producto</h1><p>El enlace puede ser incorrecto.</p><a class="btn btn-primario" href="#/stock">Volver a Stock</a></div>`;
      return;
    }
    const st = q.stock(p.id);
    const valor = valorProducto(p.id);
    const prov = App.get('proveedores', p.proveedorId);
    const sem = ventaSemanal(p.id);
    const bajo = st.disponible < p.minimo;
    el.innerHTML = h`
      <div class="migas"><a href="#/stock">Stock e inventario</a> / ${p.rubro}</div>
      <div class="st-cabeza">
        <div class="st-cabeza-texto">
          <h1 class="titulo-vista">${p.descripcion}</h1>
          <p class="bajada">${((p.marca ? p.marca + ', ' : '') + p.unidad + '. Código ' + p.codigo + (prov ? ', proveedor ' + prov.razonSocial : '') + '.').replace(/\.\.$/, '.')}</p>
          <div class="st-etiquetas-datos">${p.activo === false ? ui.chip('Inactivo', 'neutro') : ui.chip('Activo', 'ok')}${ui.chip('IVA ' + ui.num(p.iva, p.iva % 1 ? 1 : 0) + ' %', 'neutro')}${p.vidaUtil ? ui.chip('Vida útil: ' + p.vidaUtil + ' días', p.fresco ? 'alerta' : 'neutro') : ui.chip('No vence', 'neutro')}${bajo ? ui.chip('Bajo mínimo', 'alerta') : ''}</div>
          <div class="acciones">
            <button type="button" class="btn btn-primario" data-acc="ajustar">Ajustar stock</button>
            <button type="button" class="btn btn-secundario" data-acc="transferir">Transferir stock</button>
            <button type="button" class="btn btn-secundario" data-acc="editar">Editar producto</button>
            <a class="btn btn-secundario" href="#/etiquetas/producto/${p.id}">Imprimir etiquetas</a>
          </div>
        </div>
        <figure class="st-ean" style="margin:0">${ui.barcodeEAN13(p.ean, { alto: 50 })}<figcaption class="st-ean-pie"><span>EAN-13</span><span>${App.f.eanValido(p.ean) ? 'Verificador correcto' : 'Código inválido'}</span></figcaption></figure>
      </div>
      ${ui.franjaKpi([
        { titulo: 'Disponible para la venta', valor: ui.num(st.disponible), detalle: p.unidad, tono: bajo ? 'alerta' : st.disponible ? '' : 'peligro' },
        { titulo: 'Físico en depósitos', valor: ui.num(st.fisico), detalle: 'Reservado ' + ui.num(st.reservado) + (st.vencido ? ', vencido ' + ui.num(st.vencido) : '') },
        { titulo: 'Mínimo', valor: ui.num(p.minimo), detalle: sem ? 'Venta promedio: ' + ui.num(sem, 1) + ' por semana' : 'Sin ventas recientes' },
        { titulo: 'Cobertura', valor: sem ? ui.num(st.disponible / sem, 1) + ' sem.' : '–', detalle: 'Según la venta de las últimas 4 semanas' },
        { titulo: 'Valorizado a costo', valor: ui.pesosCorto(valor), detalle: 'Costo actual ' + ui.pesos(p.costo) + ' por bulto' }
      ])}
      <div class="grilla-2">
        <div><h2 class="seccion-titulo">Stock por depósito</h2><div data-deps></div></div>
        <div><h2 class="seccion-titulo">Precios por lista <span class="texto-2">por ${p.unidad.toLowerCase()}</span></h2><div data-precios></div></div>
      </div>
      <div class="seccion"><h2 class="seccion-titulo">Lotes en orden FEFO <span class="texto-2">primero vence, primero sale</span></h2><div data-lotes></div></div>
      <div class="seccion"><h2 class="seccion-titulo">Movimientos <span class="texto-2">compras, ventas, devoluciones, ajustes y transferencias</span></h2><div data-movs></div></div>`;
    el.querySelector('[data-acc=ajustar]').addEventListener('click', () => modalAjuste(p, null));
    el.querySelector('[data-acc=transferir]').addEventListener('click', () => modalTransferencia(p));
    el.querySelector('[data-acc=editar]').addEventListener('click', () => modalProducto(p));

    el.querySelector('[data-deps]').appendChild(ui.tabla({
      columnas: [
        { titulo: 'Depósito', valor: f => f.d.nombre, clase: 'celda-principal' },
        { titulo: 'Físico', alinear: 'der', valor: f => ui.num(f.st.fisico) },
        { titulo: 'Reservado', clase: 'ocultar-celu', alinear: 'der', valor: f => ui.num(f.st.reservado) },
        { titulo: 'Vencido', clase: 'ocultar-celu', alinear: 'der', valor: f => f.st.vencido ? h`<span class="peligro">${ui.num(f.st.vencido)}</span>` : '–' },
        { titulo: 'Disponible', alinear: 'der', valor: f => h`<strong>${ui.num(f.st.disponible)}</strong>` },
        { titulo: 'A costo', clase: 'ocultar-celu', alinear: 'der', valor: f => ui.pesos(f.v) }
      ],
      filas: depositos().map(d => ({ d, st: q.stock(p.id, d.id), v: valorProducto(p.id, d.id) })),
      pie: ['Total', ui.num(st.fisico), ui.num(st.reservado), st.vencido ? ui.num(st.vencido) : '–', ui.num(st.disponible), ui.pesos(valor)]
    }));
    el.querySelector('[data-precios]').appendChild(ui.tabla({
      columnas: [
        { titulo: 'Lista', valor: l => h`<span class="celda-principal">${l.nombre}</span><span class="celda-sub">${l.detalle || ''}</span>` },
        { titulo: 'Neto', alinear: 'der', valor: l => ui.pesos(q.precio(p.id, l.id)) },
        { titulo: 'Con IVA', alinear: 'der', valor: l => h`<strong>${ui.pesos(q.precioConIVA(p.id, l.id))}</strong>` },
        { titulo: 'Por unidad', clase: 'ocultar-celu', alinear: 'der', valor: l => ui.pesos(q.precioConIVA(p.id, l.id) / (p.contenido || 1)) },
        { titulo: 'Margen', alinear: 'der', valor: l => { const pr = q.precio(p.id, l.id); return h`${ui.porcentaje(p.costo ? pr / p.costo - 1 : 0)}<span class="celda-sub">${ui.porcentaje(pr ? (pr - p.costo) / pr : 0)} de la venta</span>`; } }
      ],
      filas: App.db.listasPrecio
    }));
    const lotes = q.lotes(p.id);
    el.querySelector('[data-lotes]').appendChild(ui.tabla({
      columnas: [
        { titulo: 'Orden', alinear: 'centro', valor: l => String(lotes.indexOf(l) + 1) + '.º' },
        { titulo: 'Lote', clase: 'ocultar-celu', valor: l => h`<span class="celda-principal">${l.lote}</span><span class="celda-sub">Ingreso: ${ui.fecha(l.ingreso)}${l.origen === 'transferencia' ? ' por transferencia' : l.origen === 'ajuste' ? ' por ajuste' : ''}</span>` },
        { titulo: 'Depósito', clase: 'ocultar-celu', valor: l => nombreDep(l.depositoId) },
        { titulo: 'Vence', valor: l => l.vence ? ui.fecha(l.vence) : 'No vence' },
        { titulo: 'Estado', valor: l => { if (!l.vence) return ui.chip('Sin vencimiento', 'neutro'); const s = semaforo(App.f.diferencia(App.hoy(), l.vence)); return ui.chip(s.texto, s.tono); } },
        { titulo: 'Cantidad', alinear: 'der', valor: l => h`<strong>${ui.num(l.cantidad)}</strong><span class="celda-sub">de ${ui.num(l.inicial)} ingresadas</span>` },
        { titulo: 'Costo', clase: 'ocultar-celu', alinear: 'der', valor: l => ui.pesos(l.costo) },
        { titulo: '', alinear: 'der', valor: l => boton('Ajustar', 'btn-secundario', () => modalAjuste(p, l)) }
      ],
      filas: lotes,
      filaClase: l => { if (!l.vence) return ''; const d = App.f.diferencia(App.hoy(), l.vence); return d <= 3 ? 'fila-peligro' : d <= 7 ? 'fila-alerta' : ''; },
      vacio: 'Sin lotes en existencia. Los lotes se generan al recibir una compra.'
    }));
    el.querySelector('[data-movs]').appendChild(ui.tabla({
      columnas: [
        { titulo: 'Fecha', valor: m => ui.fecha(m.fecha) },
        { titulo: 'Movimiento', valor: m => h`<span class="celda-principal">${m.tipo}</span><span class="celda-sub">${m.ref}</span>` },
        { titulo: 'Detalle', clase: 'ocultar-celu', valor: m => m.detalle },
        { titulo: 'Depósito', clase: 'ocultar-celu', valor: m => nombreDep(m.dep) },
        { titulo: 'Ingreso', alinear: 'der', valor: m => m.cantidad > 0 ? h`<span class="st-dif-pos">+${ui.num(m.cantidad)}</span>` : '' },
        { titulo: 'Egreso', alinear: 'der', valor: m => m.cantidad < 0 ? h`<span class="st-dif-neg">${ui.num(m.cantidad)}</span>` : '' },
        { titulo: 'Saldo', alinear: 'der', valor: m => ui.num(m.saldo) }
      ],
      filas: movimientos(p.id), limite: 25,
      alClic: m => { if (m.ruta) ui.ir(m.ruta); },
      vacio: 'El producto no registra movimientos.'
    }));
  }

  App.modulo({
    id: 'stock',
    titulo: 'Stock e inventario',
    grupo: 'Logística',
    orden: 10,
    icono: '<svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="10.5" width="6.5" height="6.5"/><rect x="11" y="10.5" width="6.5" height="6.5"/><rect x="6.8" y="3" width="6.5" height="6.5"/></svg>',
    contador: () => q.bajoMinimo().length || '',
    render(el, params) {
      estilos();
      if (params[0] === 'producto' && params[1]) renderFicha(el, params[1]);
      else renderInicio(el);
    }
  });
})();
