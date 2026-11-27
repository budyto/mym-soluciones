/* Módulo «Etiquetas y códigos»: etiquetas de góndola, rótulos de bulto y de pallet, y rótulos de envío por remito,
   con código de barras EAN-13 real (App.ui.barcodeEAN13), vista previa en milímetros y CSS de impresión propio.
   No cambia datos: lee productos, lotes, remitos y hojas de ruta. Los precios que «cambiaron» se comparan contra
   la lista con la que arrancó la demo (la misma semilla), así después de «Actualizar precios» en Stock aparecen acá. */
(function () {
  'use strict';
  const ui = App.ui, h = ui.h, q = App.q;

  const est = {
    zoom: 'ajustar',
    g: { modo: null, items: [], rubro: 'Almacén', soloStock: true, lista: 'L2', por: 'unidad', copias: 1, termica: false, borde: true, codigo: 'ean' },
    b: { tipo: 'bulto', productoId: '', dep: 'D1', loteId: '', copias: 6, bultosPallet: null, copiasPallet: 2, termica: true, codigo: 'ean' },
    k: { productoId: '', kilos: 0.75, lista: 'L2', copias: 1 },
    e: { clienteId: '', ids: null, porBulto: true, termica: true }
  };

  // tamaños: en mm; las hojas A4 son las de etiquetas autoadhesivas estándar
  const FORMATOS = {
    g: { termica: { ancho: 50, alto: 30, pagina: '50mm 30mm', nombre: 'Rollo térmico 50 × 30 mm', termica: true },
      a4: { ancho: 63.5, alto: 38.1, cols: 3, filas: 7, padV: 15.15, padH: 7.25, gapH: 2.5, nombre: 'Hoja A4 de 21 etiquetas de 63,5 × 38,1 mm' } },
    b: { termica: { ancho: 100, alto: 70, pagina: '100mm 70mm', nombre: 'Rollo térmico 100 × 70 mm', termica: true },
      a4: { ancho: 100, alto: 70, cols: 2, filas: 4, padV: 8.5, padH: 5, gapH: 0, nombre: 'Hoja A4 de 8 etiquetas de 100 × 70 mm' } },
    k: { termica: { ancho: 60, alto: 40, pagina: '60mm 40mm', nombre: 'Rollo térmico de balanza 60 × 40 mm', termica: true } },
    p: { termica: { ancho: 100, alto: 150, pagina: '100mm 150mm', nombre: 'Rollo térmico 100 × 150 mm', termica: true },
      a4: { ancho: 100, alto: 150, cols: 2, filas: 1, padV: 10, padH: 5, gapH: 0, nombre: 'Hoja A4 de 2 etiquetas de 100 × 150 mm' } }
  };
  const MAX_ETIQUETAS = 600;

  // ---------- estilos (pantalla e impresión; se mandan también al marco de impresión) ----------
  const CSS = `
.et-mesa { display: grid; grid-template-columns: minmax(0, 370px) minmax(0, 1fr); gap: 20px; align-items: start; }
.et-config { background: var(--hoja); border: 1px solid var(--linea); border-radius: var(--r-panel); padding: 4px 18px 16px; }
.et-bloque { padding-top: 14px; }
.et-bloque + .et-bloque { border-top: 1px solid var(--linea-suave); margin-top: 14px; }
.et-bloque h3 { font-size: var(--fs-13); font-weight: 700; margin: 0 0 8px; }
.et-campos { display: grid; gap: 12px; }
.et-campos-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.et-config .segmentado { display: flex; flex-wrap: wrap; }
.et-config .segmentado button { flex: 1 1 auto; }
.et-config .check { margin-top: 10px; font-size: var(--fs-13); }
.et-lista { list-style: none; margin: 10px 0 0; padding: 0; max-height: 300px; overflow-y: auto; border: 1px solid var(--linea-suave); border-radius: var(--r-control); }
.et-lista:empty { display: none; }
.et-lista li { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-bottom: 1px solid var(--linea-suave); font-size: var(--fs-13); }
.et-lista li:last-child { border-bottom: 0; }
.et-lista .et-item-txt { flex: 1; min-width: 0; line-height: 1.25; }
.et-lista .et-item-txt small { display: block; color: var(--texto-2); font-size: var(--fs-12); }
.et-lista input[type="number"] { width: 62px; height: 30px; flex: none; }
.et-lista label { display: flex; gap: 8px; align-items: center; flex: 1; min-width: 0; cursor: pointer; }
.et-quitar { border: 0; background: none; width: 28px; height: 28px; border-radius: var(--r-control); cursor: pointer; color: var(--texto-2); font-size: 18px; line-height: 1; flex: none; }
.et-quitar:hover { background: var(--peligro-suave); color: var(--peligro); }
.et-cambio { color: var(--texto-2); white-space: nowrap; }
.et-cambio strong { color: var(--tinta); }
.et-previa { min-width: 0; }
.et-previa-cabeza { display: flex; justify-content: space-between; align-items: center; gap: 10px 16px; flex-wrap: wrap; margin-bottom: 10px; }
.et-resumen { font-size: var(--fs-13); color: var(--texto-2); }
.et-resumen strong { display: block; color: var(--tinta); font-weight: 800; font-stretch: 118%; font-size: var(--fs-20); line-height: 1.1; }
.et-previa .vista-previa { display: block; min-height: 380px; }
.et-lienzo { width: max-content; margin: 0 auto; }
.et-escala { font-size: var(--fs-12); color: var(--texto-2); }
.et-regla { height: 3.2mm; margin-bottom: 2mm; border-bottom: .25mm solid #5B6670;
  background:
    linear-gradient(to right, #5B6670 .25mm, transparent .25mm) 0 100% / 10mm 100% repeat-x,
    linear-gradient(to right, #5B6670 .2mm, transparent .2mm) 0 100% / 5mm 60% repeat-x,
    linear-gradient(to right, #8C969E .15mm, transparent .15mm) 0 100% / 1mm 32% repeat-x; }
.et-hoja { width: 210mm; height: 297mm; box-sizing: border-box; background: #fff; border: 1px solid #C3C9C1; overflow: hidden; }
.et-lienzo .et-hoja + .et-hoja { margin-top: 8mm; }
.et-grilla { display: grid; box-sizing: border-box; }
.et-rollo { background: #EDE3CC; padding: 3mm; border-radius: 2mm; display: flex; flex-direction: column; gap: 3mm; border-left: .6mm solid #D8C9A6; border-right: .6mm solid #D8C9A6; }
.et-rollo > .et-lab, .et-rollo > .etiqueta { border-radius: 1.6mm; outline: .2mm solid rgba(0,0,0,.12); }
.et-rollo-mas { font: 600 8pt/1.3 'Archivo', sans-serif; color: #6E5A33; text-align: center; padding: 1mm 0; }
.et-mas-hojas { font-size: var(--fs-13); color: var(--texto-2); text-align: center; margin-top: 4mm; }
.et-vacio { width: 120mm; padding: 30mm 10mm; text-align: center; color: var(--texto-2); font-size: var(--fs-14); }

/* ---------- las etiquetas ---------- */
.et-lab { background: #fff; color: #000; box-sizing: border-box; overflow: hidden; position: relative; font-family: 'Archivo', Arial, sans-serif; line-height: 1.12; font-variant-numeric: tabular-nums; }
.et-lab .ean13, .etiqueta .ean13 { color: #000; }
.et-cent { font-size: .55em; vertical-align: .62em; margin-left: .2mm; letter-spacing: 0; }
.et-clamp2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.et-clamp3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.etiqueta.et-g { box-sizing: border-box; }
.et-g .etiqueta-desc { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.et-g .etiqueta-marca { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.et-g .etiqueta-precio { white-space: nowrap; }
.et-g .etiqueta-precio.et-largo { font-size: 11pt; }
.et-g .etiqueta-codigo { line-height: 1.3; }
.et-sin-borde .etiqueta { border-color: transparent !important; }

.et-t50 { width: 50mm; height: 30mm; padding: 1.7mm 2.2mm 1.2mm; display: flex; flex-direction: column; }
.et-t50-desc { font-weight: 800; font-stretch: 110%; font-size: 7.2pt; line-height: 1.08; }
.et-t50-precio { font-weight: 800; font-stretch: 118%; font-size: 15pt; line-height: 1; margin-top: .9mm; letter-spacing: -.02em; white-space: nowrap; }
.et-t50-precio.et-largo { font-size: 12.5pt; }
.et-t50-pie { margin-top: auto; display: grid; grid-template-columns: minmax(0, 1fr) 25mm; gap: 1.4mm; align-items: end; }
.et-t50-pie .ean13 { width: 25mm; }
.et-t50-datos { font-size: 5.6pt; line-height: 1.28; color: #222; }
.et-t50-datos strong { font-size: 6.2pt; color: #000; }

.et-bulto { width: 100mm; height: 70mm; border: .5mm solid #000; padding: 3.5mm 4mm; display: flex; flex-direction: column; gap: 1.6mm; }
.et-cabeza { display: flex; justify-content: space-between; align-items: center; gap: 3mm; font-size: 7pt; line-height: 1.25; }
.et-num { font-weight: 800; font-stretch: 125%; font-size: 10pt; border: .4mm solid #000; padding: .5mm 1.8mm; white-space: nowrap; flex: none; }
.et-b-desc { font-weight: 800; font-stretch: 125%; font-size: 16pt; line-height: 1.02; letter-spacing: -.01em; }
.et-b-sub { font-size: 7.5pt; }
.et-franja { display: grid; grid-template-columns: 1.2fr 1.2fr .7fr; border-top: .5mm solid #000; border-bottom: .5mm solid #000; }
.et-franja > div { padding: 1mm 1.5mm 1.2mm 0; min-width: 0; }
.et-franja > div + div { border-left: .3mm solid #000; padding-left: 2mm; }
.et-franja span { display: block; font-size: 6.3pt; }
.et-franja strong { display: block; font-weight: 800; font-stretch: 115%; font-size: 11.5pt; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.et-pie { margin-top: auto; display: grid; grid-template-columns: 44mm 1fr; gap: 3mm; align-items: end; font-size: 6.8pt; line-height: 1.32; }
.et-pie .ean13 { width: 44mm; }

.et-pallet { width: 100mm; height: 150mm; border: .7mm solid #000; padding: 5mm; display: flex; flex-direction: column; gap: 3mm; }
.et-p-desc { font-weight: 800; font-stretch: 125%; font-size: 23pt; line-height: 1.02; letter-spacing: -.015em; }
.et-p-vence { display: flex; align-items: baseline; justify-content: space-between; gap: 3mm; background: #000; color: #fff; padding: 2mm 3.5mm; }
.et-p-vence span { font-size: 9pt; font-weight: 600; }
.et-p-vence strong { font-weight: 800; font-stretch: 125%; font-size: 26pt; line-height: 1; white-space: nowrap; }
.et-p-datos { display: grid; grid-template-columns: 1fr 1fr; border-top: .5mm solid #000; }
.et-p-datos > div { padding: 1.6mm 0 1.6mm; border-bottom: .3mm solid #000; min-width: 0; }
.et-p-datos > div:nth-child(even) { border-left: .3mm solid #000; padding-left: 2.5mm; }
.et-p-datos span { display: block; font-size: 6.8pt; }
.et-p-datos strong { display: block; font-weight: 800; font-stretch: 115%; font-size: 12.5pt; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.et-p-pie { margin-top: auto; display: grid; grid-template-columns: 60mm 1fr; gap: 4mm; align-items: end; font-size: 7.5pt; line-height: 1.35; }
.et-p-pie .ean13 { width: 60mm; }
.et-p-datos > .et-ancho { grid-column: 1 / -1; border-left: 0 !important; padding-left: 0 !important; }
.et-firma { border-top: .3mm solid #000; padding-top: 1mm; margin-top: 8mm; }

.et-envio { width: 100mm; height: 70mm; border: .5mm solid #000; padding: 3mm 4mm; display: flex; flex-direction: column; gap: 1.3mm; }
.et-e-remite { font-size: 6.3pt; line-height: 1.25; }
.et-e-remite b { font-weight: 700; }
.et-e-nombre { font-weight: 800; font-stretch: 125%; font-size: 15pt; line-height: 1.02; letter-spacing: -.01em; border-top: .5mm solid #000; padding-top: 1.4mm; }
.et-e-dir { font-size: 8pt; line-height: 1.25; }
.et-e-pie { margin-top: auto; display: grid; grid-template-columns: 42mm 1fr; gap: 3mm; align-items: end; font-size: 6.6pt; line-height: 1.32; }
.et-e-pie .ean13 { width: 42mm; }

/* etiqueta de balanza 60 × 40 mm: lo que pega la balanza en la pieza fraccionada */
.et-bal { width: 60mm; height: 40mm; padding: 1.6mm 2.2mm 1.2mm; display: flex; flex-direction: column; gap: .8mm; }
.et-bal-cab { display: flex; justify-content: space-between; gap: 2mm; font-size: 5.4pt; line-height: 1.2; color: #222; }
.et-bal-cab b { color: #000; font-weight: 700; }
.et-bal-desc { font-weight: 800; font-stretch: 112%; font-size: 9pt; line-height: 1.05; }
.et-bal-datos { display: grid; grid-template-columns: .85fr 1fr 1.3fr; border-top: .35mm solid #000; border-bottom: .35mm solid #000; }
.et-bal-datos > div { padding: .5mm 1mm .6mm 0; min-width: 0; }
.et-bal-datos > div + div { border-left: .25mm solid #000; padding-left: 1.2mm; }
.et-bal-datos span { display: block; font-size: 4.9pt; }
.et-bal-datos strong { display: block; font-weight: 800; font-stretch: 108%; font-size: 7.4pt; white-space: nowrap; }
.et-bal-datos .et-bal-importe strong { font-stretch: 112%; font-size: 8.6pt; letter-spacing: -.02em; }
.et-bal-pie { margin-top: auto; display: grid; grid-template-columns: 31mm minmax(0, 1fr); gap: 1.6mm; align-items: end; }
.et-bal-pie .ean13 { width: 31mm; }
.et-bal-pie div { font-size: 5.3pt; line-height: 1.3; color: #222; }
.et-bal-pie strong { color: #000; font-size: 6.4pt; }
.et-aviso-cod { margin-top: 8px; }
.et-pesos { display: flex; flex-wrap: wrap; gap: 6px; }
.et-ean-desglose { font-size: var(--fs-12); color: var(--texto-2); line-height: 1.45; }
.et-ean-desglose code { font: inherit; font-weight: 700; color: var(--tinta); letter-spacing: .04em; }

/* ---------- impresión ---------- */
.et-impresion .et-hoja { border: 0; margin: 0; break-after: page; }
.et-impresion .et-hoja:last-child { break-after: auto; }
.et-pag { overflow: hidden; break-after: page; }
.et-pag:last-child { break-after: auto; }
.et-impresion .et-pag > .et-lab { border-radius: 0; }

@media (max-width: 1100px) { .et-mesa { grid-template-columns: minmax(0, 1fr); } }
@media (max-width: 760px) {
  .et-previa-cabeza { align-items: stretch; flex-direction: column; }
  .et-previa-cabeza .fila { justify-content: space-between; }
  .et-previa-cabeza .btn-senal { flex: 1 1 100%; justify-content: center; }
  .et-previa .vista-previa { min-height: 0; padding: 12px; }
  .et-campos-2 { grid-template-columns: 1fr; }
}`;
  function estilos() {
    if (document.getElementById('et-estilos')) return;
    const s = document.createElement('style');
    s.id = 'et-estilos'; s.textContent = CSS;
    document.head.appendChild(s);
  }

  // ---------- ayudas ----------
  const productosActivos = () => App.db.productos.filter(p => p.activo !== false);
  const rubros = () => Array.from(new Set(App.db.productos.map(p => p.rubro)));
  const nombreDep = id => (App.get('depositos', id) || {}).nombre || '';
  const plural = (n, uno, varios) => ui.num(n) + ' ' + (n === 1 ? uno : varios);
  const fechaCorta = iso => ui.fecha(iso).slice(0, 6) + iso.slice(2, 4);

  // precios con los que arrancó la demo, para saber cuáles cambiaron
  let base = null;
  function preciosBase() {
    if (!base) {
      base = {};
      try { window.SEMILLA.maestros().productos.forEach(p => { base[p.id] = p.precios; }); } catch (e) { /* sin base: nada figura como cambiado */ }
    }
    return base;
  }
  function cambiaron() {
    const b = preciosBase();
    // p.precioCambio lo ponen actualizarPrecios y guardarMaestro; la comparación con la semilla cubre lo demás
    return productosActivos().filter(p => p.precioCambio || !b[p.id] || Object.keys(p.precios).some(l => b[p.id][l] !== p.precios[l]));
  }

  // «Yerba 1 kg», «Aceite 1,5 L», «Puré 520 g»: cuánto trae cada unidad, en kg o litros
  function medida(desc) {
    const m = String(desc).match(/(\d+(?:,\d+)?)\s*(kg|g|ml|l)\b/i);
    if (!m) return null;
    const v = parseFloat(m[1].replace(',', '.'));
    const u = m[2].toLowerCase();
    if (!(v > 0)) return null;
    return u === 'g' ? { cant: v / 1000, unidad: 'kg' } : u === 'kg' ? { cant: v, unidad: 'kg' } : u === 'ml' ? { cant: v / 1000, unidad: 'litro' } : { cant: v, unidad: 'litro' };
  }
  function precioGrande(n) {
    const s = ui.pesos(n);
    const i = s.lastIndexOf(',');
    return h`${s.slice(0, i)}<span class="et-cent">${s.slice(i)}</span>`;
  }
  // código interno EAN-13 del remito: prefijo 20 (uso interno), número de remito y dígito verificador
  const eanRemito = r => { const doce = '20' + String(r.numero).padStart(10, '0'); return doce + App.f.digitoEAN(doce); };

  // código de barras que va en la etiqueta: el EAN del fabricante o el código propio (si el producto no tiene, va el EAN)
  // el Code 39 es más ancho que el EAN-13: se le da más alto para que en el mismo ancho de etiqueta las barras no queden achatadas
  function barras(p, cual, o) {
    const c = cual === 'propio' && p.codigoPropio ? p.codigoPropio : p.ean;
    const op = Object.assign({}, o, { cual: cual === 'propio' ? 'propio' : 'ean' });
    if (App.f.tipoCodigo(c) === 'code39' && op.alto) op.alto = Math.round(Math.min(3, (16 * (c.length + 2) + 15) / 113) * op.alto);
    return ui.barcodeProducto(p, op);
  }
  const textoCodigo = (p, cual) => cual === 'propio' && p.codigoPropio ? 'Código propio ' + p.codigoPropio : 'EAN ' + p.ean;
  function avisoSinPropio(prods, cual) {
    if (cual !== 'propio') return '';
    const sin = prods.filter(p => !p.codigoPropio);
    if (!sin.length) return '';
    return String(h`<div class="aviso aviso-alerta et-aviso-cod">${sin.length === 1 ? '«' + sin[0].descripcion + '» no tiene código propio' : plural(sin.length, 'producto no tiene', 'productos no tienen') + ' código propio'}: se imprime su EAN del fabricante. El código propio se crea desde la ficha del producto, en Stock.</div>`);
  }

  // ---------- etiquetas ----------
  function datosPrecio(p, g) {
    const pBulto = q.precioConIVA(p.id, g.lista);
    const unit = g.por === 'unidad' && p.contenido > 1;
    const precio = unit ? pBulto / p.contenido : pBulto;
    const med = medida(p.descripcion);
    const cant = med ? med.cant * (unit ? 1 : p.contenido) : 0;
    return {
      precio, unit,
      porMedida: cant ? ui.pesos(precio / cant) + ' el ' + med.unidad : '',
      que: unit ? 'Precio final por unidad' : 'Precio final por ' + p.unidad.toLowerCase(),
      largo: ui.pesos(precio).split(',')[0].length > 7
    };
  }
  function etiquetaGondola(p, g) {
    const d = datosPrecio(p, g);
    const lista = App.get('listasPrecio', g.lista);
    if (g.termica) {
      return String(h`<div class="et-lab et-t50">
        <div class="et-t50-desc et-clamp2">${p.descripcion}</div>
        <div class="et-t50-precio${d.largo ? ' et-largo' : ''}">${precioGrande(d.precio)}</div>
        <div class="et-t50-pie"><div class="et-t50-datos"><strong>${d.unit ? 'Por unidad' : p.unidad}</strong>${d.porMedida ? h`<br>${d.porMedida}` : ''}<br>${p.codigo}, ${lista ? lista.nombre : ''}<br>${fechaCorta(App.hoy())}</div>${barras(p, g.codigo, { alto: 40 })}</div>
      </div>`);
    }
    return String(h`<div class="etiqueta et-g">
      <div class="etiqueta-desc">${p.descripcion}</div>
      <div class="etiqueta-marca">${p.marca}${d.unit ? ', precio por unidad' : ', ' + p.unidad}</div>
      <div class="etiqueta-pie"><div><div class="etiqueta-precio${d.largo ? ' et-largo' : ''}">${precioGrande(d.precio)}<small>${d.que}</small></div>
        <div class="etiqueta-codigo">${d.porMedida ? h`${d.porMedida}<br>` : ''}${p.codigo}, ${fechaCorta(App.hoy())}</div></div>${barras(p, g.codigo, { alto: 46 })}</div>
    </div>`);
  }
  function etiquetaBulto(p, lote, i, n) {
    return String(h`<div class="et-lab et-bulto">
      <div class="et-cabeza"><span><b>${App.config.negocio}</b><br>${nombreDep(lote ? lote.depositoId : est.b.dep)}</span><span class="et-num">Bulto ${i} de ${n}</span></div>
      <div class="et-b-desc et-clamp2">${p.descripcion}</div>
      <div class="et-b-sub">${p.marca ? p.marca + ', ' : ''}${p.unidad}${p.contenido > 1 ? ' (' + p.contenido + ' unidades)' : ''}</div>
      <div class="et-franja"><div><span>Lote</span><strong>${lote ? lote.lote : 'Sin lote'}</strong></div><div><span>Vence</span><strong>${lote && lote.vence ? ui.fecha(lote.vence) : 'No vence'}</strong></div><div><span>Contenido</span><strong>${p.contenido} u.</strong></div></div>
      <div class="et-pie">${barras(p, est.b.codigo, { alto: 46 })}<div>Código ${p.codigo}<br>${lote ? 'Ingreso: ' + ui.fecha(lote.ingreso) : 'Rotulado: ' + ui.fecha(App.hoy())}<br>${p.pesoKg ? 'Peso aprox. ' + ui.num(p.pesoKg, 1) + ' kg' : ''}</div></div>
    </div>`);
  }
  function ocDeLote(lote) { return lote ? App.db.ordenesCompra.find(oc => oc.recepcion && (oc.recepcion.loteIds || []).includes(lote.id)) : null; }
  function etiquetaPallet(p, lote, bultos, i, n) {
    const oc = ocDeLote(lote);
    const prov = App.get('proveedores', oc ? oc.proveedorId : p.proveedorId);
    return String(h`<div class="et-lab et-pallet">
      <div class="et-cabeza"><span><b>${App.config.negocio}</b><br>${nombreDep(lote ? lote.depositoId : est.b.dep)}</span><span class="et-num">Pallet, cara ${i} de ${n}</span></div>
      <div class="et-p-desc et-clamp3">${p.descripcion}</div>
      <div class="et-b-sub">${p.marca ? p.marca + ', ' : ''}${p.unidad}. Código ${p.codigo}</div>
      <div class="et-p-vence"><span>${lote && lote.vence ? 'Vence' : 'Vencimiento'}</span><strong>${lote && lote.vence ? ui.fecha(lote.vence) : 'No vence'}</strong></div>
      <div class="et-p-datos">
        <div><span>Lote</span><strong>${lote ? lote.lote : 'Sin lote'}</strong></div>
        <div><span>Bultos</span><strong>${ui.num(bultos)}</strong></div>
        <div><span>Unidades</span><strong>${ui.num(bultos * (p.contenido || 1))}</strong></div>
        <div><span>Peso aprox.</span><strong>${ui.num(bultos * (p.pesoKg || 0), 0)} kg</strong></div>
        <div><span>Ingreso</span><strong>${lote ? ui.fecha(lote.ingreso) : ui.fecha(App.hoy())}</strong></div>
        <div><span>Orden de compra</span><strong>${oc ? oc.nro : '–'}</strong></div>
        <div class="et-ancho"><span>Proveedor</span><strong>${prov ? prov.razonSocial : '–'}</strong></div>
      </div>
      <div class="et-p-pie">${barras(p, est.b.codigo, { alto: 54 })}<div>No apilar más de 2 pallets.<br>Primero que vence, primero que sale.<div class="et-firma">Armado y control</div></div></div>
    </div>`);
  }
  // etiqueta de balanza: precio por kilo de la lista (con el recargo de la venta por kilo) por el peso; el código lleva PLU y gramos
  function datosBalanza(p, k) {
    const pk = App.presentacionDe(p, 'kg');
    const porKilo = App.r2(q.precioConIVA(p.id, k.lista) * (1 + ((pk && pk.id === 'kg' ? pk.recargo : 0) || 0) / 100));
    const kilos = Math.round((Number(k.kilos) || 0) * 1000) / 1000;
    return { porKilo, kilos, importe: App.r2(porKilo * kilos), ean: App.f.eanBalanza(p.plu, kilos) };
  }
  function etiquetaBalanza(p, k) {
    const d = datosBalanza(p, k);
    // la pieza fraccionada vence antes que la entera: hasta 30 días o la vida útil, si es menor
    const vence = p.vidaUtil ? App.f.sumar(App.hoy(), Math.min(p.vidaUtil, 30)) : null;
    return String(h`<div class="et-lab et-bal">
      <div class="et-bal-cab"><span><b>${App.config.negocio}</b></span><span>Envasado ${fechaCorta(App.hoy())}</span></div>
      <div class="et-bal-desc et-clamp2">${p.descripcion}</div>
      <div class="et-bal-datos"><div><span>Peso neto</span><strong>${ui.num(d.kilos, 3)} kg</strong></div><div><span>Precio por kg</span><strong>${ui.pesos(d.porKilo)}</strong></div><div class="et-bal-importe"><span>Importe</span><strong>${ui.pesos(d.importe)}</strong></div></div>
      <div class="et-bal-pie">${ui.barcodeEAN13(d.ean, { alto: 34 })}<div><strong>PLU ${p.plu}</strong><br>${p.marca}${vence ? h`<br>Consumir antes del ${fechaCorta(vence)}` : ''}<br>Conservar refrigerado</div></div>
    </div>`);
  }
  function etiquetaEnvio(r, i, n) {
    const c = App.get('clientes', r.clienteId) || {};
    const hr = r.hojaRutaId ? App.get('hojasRuta', r.hojaRutaId) : null;
    const ch = hr ? App.get('choferes', hr.choferId) : null;
    const ve = hr ? App.get('vehiculos', hr.vehiculoId) : null;
    const fc = App.get('comprobantes', r.comprobanteId);
    const cfg = App.config;
    return String(h`<div class="et-lab et-envio">
      <div class="et-cabeza"><span class="et-e-remite">Remite <b>${cfg.razonSocial}</b><br>${cfg.domicilio}. Tel. ${cfg.telefono}</span><span class="et-num">${i} de ${n}</span></div>
      <div class="et-e-nombre et-clamp2">${c.fantasia || c.razonSocial || ''}</div>
      <div class="et-e-dir">${c.razonSocial && c.razonSocial !== c.fantasia ? h`${c.razonSocial}<br>` : ''}${c.direccion || ''}, ${c.localidad || ''}${c.zona ? ' (zona ' + c.zona + ')' : ''}</div>
      <div class="et-franja"><div><span>Remito</span><strong>${r.nro}</strong></div><div><span>Hoja de ruta</span><strong>${hr ? hr.nro : 'A asignar'}</strong></div><div><span>Peso</span><strong>${ui.num(r.kg || 0, 0)} kg</strong></div></div>
      <div class="et-e-pie">${ui.barcodeEAN13(eanRemito(r), { alto: 40 })}<div>${fc ? fc.tipo.replace('F', 'Factura ') + ' ' + fc.nro : ''}<br>${hr ? 'Reparto ' + ui.fecha(hr.fecha) + (ch ? ', ' + ch.nombre : '') + (ve ? ', ' + ve.patente : '') : 'Remito del ' + ui.fecha(r.fecha)}${c.telefono ? h`<br>Tel. cliente ${c.telefono}` : ''}</div></div>
    </div>`);
  }

  // ---------- armado de hojas, vista previa e impresión ----------
  function trozos(arr, n) { const r = []; for (let i = 0; i < arr.length; i += n) r.push(arr.slice(i, i + n)); return r; }
  function hojaHTML(chunk, f) {
    return '<div class="et-hoja"><div class="et-grilla" style="grid-template-columns:repeat(' + f.cols + ',' + f.ancho + 'mm);grid-auto-rows:' + f.alto + 'mm;column-gap:' + f.gapH + 'mm;padding:' + f.padV + 'mm ' + f.padH + 'mm">' + chunk.join('') + '</div></div>';
  }
  function previaHTML(r) {
    const f = r.f;
    if (!r.etiquetas.length) return '<div class="et-vacio">' + ui.escapar(r.vacio || 'Sin selección: la vista previa se mostrará aquí.') + '</div>';
    if (f.termica) {
      const muestra = r.etiquetas.slice(0, f.ancho > 60 ? 3 : 8);
      return '<div class="et-regla" style="width:' + f.ancho + 'mm;margin-left:3mm" title="Regla en milímetros"></div><div class="et-rollo" style="width:' + (f.ancho + 6) + 'mm">' + muestra.join('') +
        (r.etiquetas.length > muestra.length ? '<div class="et-rollo-mas">y ' + ui.num(r.etiquetas.length - muestra.length) + ' más en el rollo</div>' : '') + '</div>';
    }
    const hojas = trozos(r.etiquetas, f.cols * f.filas);
    return '<div class="et-regla" style="width:210mm" title="Regla en milímetros"></div><div class="' + (r.clase || '') + '">' + hojas.slice(0, 2).map(c => hojaHTML(c, f)).join('') + '</div>' +
      (hojas.length > 2 ? '<p class="et-mas-hojas">y ' + plural(hojas.length - 2, 'hoja más', 'hojas más') + ' en la impresión</p>' : '');
  }
  function resumenTexto(r) {
    const n = r.etiquetas.length;
    if (!n) return '<strong>Sin etiquetas</strong>' + ui.escapar(r.f.nombre);
    const detalle = r.f.termica ? r.f.nombre : plural(Math.ceil(n / (r.f.cols * r.f.filas)), 'hoja A4', 'hojas A4') + ', ' + r.f.nombre.replace(/^Hoja A4 de /, '').replace(/^(\d+) etiquetas de/, '$1 por hoja, de');
    return '<strong>' + plural(n, 'etiqueta', 'etiquetas') + '</strong>' + ui.escapar(detalle);
  }
  function imprimir(r) {
    const f = r.f, n = r.etiquetas.length;
    if (!n) { ui.toast('No hay etiquetas para imprimir: se debe seleccionar al menos una.', 'alerta'); return; }
    if (n > MAX_ETIQUETAS) { ui.toast('Se seleccionaron ' + ui.num(n) + ' etiquetas: el máximo por impresión es ' + MAX_ETIQUETAS + '.', 'peligro'); return; }
    const cuerpo = f.termica
      ? r.etiquetas.map(e => '<div class="et-pag" style="width:' + f.ancho + 'mm;height:' + f.alto + 'mm">' + e + '</div>').join('')
      : trozos(r.etiquetas, f.cols * f.filas).map(c => hojaHTML(c, f)).join('');
    const pagina = '@page { size: ' + (f.termica ? f.pagina : 'A4') + '; margin: 0; } body.impresion { margin: 0; }';
    ui.imprimir('<style>' + CSS + pagina + '</style><div class="et-impresion ' + (r.clase || '') + '">' + cuerpo + '</div>', { titulo: 'Etiquetas | ' + App.config.negocio });
    ui.toast('Etiquetas enviadas a impresión: ' + plural(n, 'etiqueta', 'etiquetas') + ' (' + (f.termica ? f.nombre.toLowerCase() : plural(Math.ceil(n / (f.cols * f.filas)), 'hoja A4', 'hojas A4')) + ').', 'ok');
  }

  // mesa de trabajo: configuración a la izquierda, vista previa a la derecha
  function mesa(panel, armarConfig, generar) {
    const cont = ui.nodo(`<div class="et-mesa"><div class="et-config"></div><div class="et-previa">
      <div class="et-previa-cabeza"><div class="et-resumen" aria-live="polite"></div>
        <div class="fila"><div class="segmentado" role="group" aria-label="Escala de la vista previa"><button type="button" data-z="ajustar">Ajustar</button><button type="button" data-z="real">Tamaño real</button></div>
        <button type="button" class="btn btn-senal" data-imprimir>Imprimir etiquetas</button></div></div>
      <div class="vista-previa"><div class="et-lienzo"></div></div>
      <p class="nota-discreta et-escala"></p></div></div>`);
    panel.appendChild(cont);
    const config = cont.querySelector('.et-config'), lienzo = cont.querySelector('.et-lienzo'), vp = cont.querySelector('.vista-previa');
    let ultimo = null;
    function ajustar() {
      if (!lienzo.isConnected || !ultimo) return;
      lienzo.style.zoom = '';
      const nat = lienzo.offsetWidth || 1;
      const disp = Math.max(120, vp.clientWidth - 36);
      const z = est.zoom === 'real' ? 1 : Math.min(ultimo.f.termica ? (ultimo.f.ancho > 60 ? 1.25 : 1.8) : 1, disp / nat);
      lienzo.style.zoom = String(Math.round(z * 1000) / 1000);
      cont.querySelector('.et-escala').textContent = 'Vista previa al ' + ui.num(z * 100) + ' % del tamaño real. La regla superior está en milímetros. ' +
        (ultimo.f.termica ? 'En la impresora térmica cada etiqueta se imprime como una página.' : 'Configuración de impresión requerida: A4, sin márgenes y al 100 %.');
      cont.querySelectorAll('[data-z]').forEach(b => b.setAttribute('aria-pressed', b.dataset.z === est.zoom));
    }
    function redibujar() {
      ultimo = generar();
      cont.querySelector('.et-resumen').innerHTML = resumenTexto(ultimo);
      lienzo.innerHTML = previaHTML(ultimo);
      ajustar();
    }
    cont.querySelectorAll('[data-z]').forEach(b => b.addEventListener('click', () => { est.zoom = b.dataset.z; ajustar(); }));
    cont.querySelector('[data-imprimir]').addEventListener('click', () => imprimir(ultimo));
    cont._ajustar = ajustar;
    armarConfig(config, redibujar);
    redibujar();
  }
  let escuchaResize = false;
  function escucharResize() {
    if (escuchaResize) return;
    escuchaResize = true;
    let t = null;
    window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => document.querySelectorAll('.et-mesa').forEach(m => m._ajustar && m._ajustar()), 120); });
  }
  function segmentado(nombre, opciones, valor, etiqueta) {
    return h`<div class="segmentado" role="group" aria-label="${etiqueta}">${opciones.map(([v, t]) => h`<button type="button" data-${nombre}="${v}" aria-pressed="${String(v) === String(valor)}">${t}</button>`)}</div>`;
  }
  function alSegmentado(el, nombre, fn) {
    el.querySelectorAll('[data-' + nombre + ']').forEach(b => b.addEventListener('click', () => {
      el.querySelectorAll('[data-' + nombre + ']').forEach(x => x.setAttribute('aria-pressed', x === b));
      fn(b.dataset[nombre]);
    }));
  }

  // ---------- pestaña góndola ----------
  function tabGondola(panel) {
    const g = est.g;
    const cam = cambiaron();
    if (!g.modo) g.modo = cam.length ? 'cambio' : 'mano';
    if (g.modo === 'mano' && !g.items.length) {
      g.items = productosActivos().slice().sort((a, b) => b.popularidad - a.popularidad).slice(0, 6).map(p => ({ id: p.id, copias: 1 }));
    }
    let avisoCod = null;
    function generar() {
      const f = FORMATOS.g[g.termica ? 'termica' : 'a4'];
      let lista;
      if (g.modo === 'mano') lista = g.items.map(it => ({ p: App.get('productos', it.id), copias: it.copias })).filter(x => x.p);
      else if (g.modo === 'rubro') lista = productosActivos().filter(p => p.rubro === g.rubro && (!g.soloStock || q.stock(p.id).disponible > 0)).map(p => ({ p, copias: g.copias }));
      else lista = cambiaron().map(p => ({ p, copias: g.copias }));
      const etiquetas = [];
      if (avisoCod) avisoCod.innerHTML = avisoSinPropio(lista.map(x => x.p), g.codigo);
      lista.forEach(x => { const html = etiquetaGondola(x.p, g); for (let i = 0; i < Math.max(0, Math.min(99, x.copias || 0)); i++) etiquetas.push(html); });
      return { etiquetas, f, clase: !g.termica && !g.borde ? 'et-sin-borde' : '',
        vacio: g.modo === 'cambio' ? 'No hay precios cambiados desde la última lista.' : g.modo === 'rubro' ? 'El rubro no tiene productos con stock.' : 'Sin productos seleccionados. Pueden agregarse con el buscador.' };
    }
    function config(el, redibujar) {
      function pintar() {
        el.innerHTML = h`
          <div class="et-bloque"><h3>Productos</h3>
            ${segmentado('modo', [['mano', 'Selección manual'], ['rubro', 'Por rubro'], ['cambio', 'Precio nuevo (' + cam.length + ')']], g.modo, 'Productos')}
            <div data-cuerpo style="margin-top:12px"></div></div>
          <div class="et-bloque et-campos">
            <div class="et-campos-2">
              <div class="campo"><label for="eg-lista">Lista de precios</label><select id="eg-lista">${ui.opciones(App.db.listasPrecio, 'id', 'nombre', g.lista)}</select></div>
              ${g.modo !== 'mano' ? h`<div class="campo"><label for="eg-copias">Copias por producto</label><input id="eg-copias" type="number" min="1" max="99" step="1" value="${g.copias}"></div>` : ''}
            </div>
            <div class="campo"><span class="etiqueta-campo">Precio grande</span>${segmentado('por', [['unidad', 'Por unidad'], ['bulto', 'Por bulto o caja']], g.por, 'Precio grande')}
              <span class="campo-ayuda">IVA incluido. Debajo se muestra el precio por kilo o por litro cuando la descripción indica el contenido.</span></div>
          </div>
          <div class="et-bloque"><h3>Código a imprimir</h3>${segmentado('codigo', [['ean', 'EAN del fabricante'], ['propio', 'Código propio']], g.codigo, 'Código a imprimir')}<div data-aviso-cod></div></div>
          <div class="et-bloque"><h3>Papel</h3>${segmentado('papel', [['a4', 'Hoja A4 (21)'], ['termica', 'Térmica 50 × 30']], g.termica ? 'termica' : 'a4', 'Papel')}
            ${!g.termica ? h`<label class="check"><input type="checkbox" data-borde${g.borde ? ' checked' : ''}> Marcar borde de corte (papel común)</label>` : ''}</div>`;
        const cuerpo = el.querySelector('[data-cuerpo]');
        if (g.modo === 'mano') cuerpoMano(cuerpo);
        else if (g.modo === 'rubro') {
          cuerpo.innerHTML = h`<div class="campo"><label for="eg-rubro">Rubro</label><select id="eg-rubro">${rubros().map(r => h`<option${r === g.rubro ? ' selected' : ''}>${r}</option>`)}</select></div>
            <label class="check"><input type="checkbox" data-solo${g.soloStock ? ' checked' : ''}> Sólo productos con stock</label>`;
          cuerpo.querySelector('#eg-rubro').addEventListener('change', e => { g.rubro = e.target.value; redibujar(); });
          cuerpo.querySelector('[data-solo]').addEventListener('change', e => { g.soloStock = e.target.checked; redibujar(); });
        } else {
          const b = preciosBase();
          if (!cam.length) cuerpo.innerHTML = '<div class="aviso">No hay cambios de precio desde la última lista. Al actualizar precios en Stock e inventario, los productos modificados se listan aquí para reimprimir sus etiquetas. <a href="#/stock">Ir a Stock</a></div>';
          else cuerpo.innerHTML = h`<ul class="et-lista">${cam.map(p => { const antes = b[p.id] ? b[p.id][g.lista] : null; const ahora = p.precios[g.lista];
            return h`<li><span class="et-item-txt">${p.descripcion}<small>${p.codigo}</small></span><span class="et-cambio">${antes != null ? (antes === ahora ? 'igual en esta lista' : h`${ui.pesos(antes)} a <strong>${ui.pesos(ahora)}</strong>`) : 'producto nuevo'}</span></li>`; })}</ul>`;
        }
        alSegmentado(el, 'modo', v => { g.modo = v; if (v === 'mano' && !g.items.length) g.items = []; pintar(); redibujar(); });
        alSegmentado(el, 'por', v => { g.por = v; redibujar(); });
        avisoCod = el.querySelector('[data-aviso-cod]');
        alSegmentado(el, 'codigo', v => { g.codigo = v; if (g.modo === 'mano') pintar(); redibujar(); });
        alSegmentado(el, 'papel', v => { g.termica = v === 'termica'; pintar(); redibujar(); });
        el.querySelector('#eg-lista').addEventListener('change', e => { g.lista = e.target.value; if (g.modo === 'cambio') pintar(); redibujar(); });
        const cop = el.querySelector('#eg-copias');
        if (cop) cop.addEventListener('input', () => { g.copias = Math.max(1, Math.min(99, Math.round(Number(cop.value) || 1))); redibujar(); });
        const bo = el.querySelector('[data-borde]');
        if (bo) bo.addEventListener('change', () => { g.borde = bo.checked; redibujar(); });
      }
      function cuerpoMano(cuerpo) {
        cuerpo.innerHTML = `<label class="solo-lector" for="eg-buscar">Buscar producto</label><input id="eg-buscar" type="search" autocomplete="off" placeholder="Buscar por nombre, código, EAN o código propio">
          <ul class="et-lista" data-res></ul><ul class="et-lista" data-eleg></ul>
          <div class="fila separar" style="margin-top:8px"><span class="nota-discreta" data-cuantos></span><button type="button" class="btn btn-fantasma btn-chico" data-vaciar>Quitar todos</button></div>`;
        const res = cuerpo.querySelector('[data-res]'), eleg = cuerpo.querySelector('[data-eleg]'), input = cuerpo.querySelector('#eg-buscar');
        function pintarElegidos() {
          eleg.innerHTML = '';
          g.items.forEach(it => {
            const p = App.get('productos', it.id); if (!p) return;
            const li = ui.nodo(h`<li><span class="et-item-txt">${p.descripcion}<small>${p.codigo}, ${ui.pesos(datosPrecio(p, g).precio)} ${datosPrecio(p, g).unit ? 'la unidad' : 'el bulto'}${g.codigo === 'propio' ? (p.codigoPropio ? ', propio ' + p.codigoPropio : ', sin código propio') : ''}</small></span>
              <input type="number" min="1" max="99" step="1" value="${it.copias}" aria-label="Copias de ${p.descripcion}" title="Copias">
              <button type="button" class="et-quitar" aria-label="Quitar ${p.descripcion}">×</button></li>`);
            li.querySelector('input').addEventListener('input', e => { it.copias = Math.max(0, Math.min(99, Math.round(Number(e.target.value) || 0))); redibujar(); });
            li.querySelector('button').addEventListener('click', () => { g.items = g.items.filter(x => x !== it); pintarElegidos(); redibujar(); });
            eleg.appendChild(li);
          });
          cuerpo.querySelector('[data-cuantos]').textContent = g.items.length ? plural(g.items.length, 'producto seleccionado', 'productos seleccionados') : 'Sin productos seleccionados.';
        }
        function buscar(t) {
          res.innerHTML = '';
          if (!t) return;
          productosActivos().filter(p => !g.items.some(it => it.id === p.id) && ui.coincide(t, p.descripcion, p.codigo, p.ean, p.marca, p.codigoPropio, p.plu)).slice(0, 6).forEach(p => {
            const li = ui.nodo(h`<li><span class="et-item-txt">${p.descripcion}<small>${p.codigo}, EAN ${p.ean}</small></span><button type="button" class="btn btn-secundario btn-chico">Agregar</button></li>`);
            li.querySelector('button').addEventListener('click', () => { g.items.push({ id: p.id, copias: 1 }); buscar(ui.normalizar(input.value).trim()); pintarElegidos(); redibujar(); input.focus(); });
            res.appendChild(li);
          });
          if (!res.children.length) res.innerHTML = '<li class="texto-2">No hay otros productos que coincidan con la búsqueda.</li>';
        }
        ui.buscador(input, t => buscar(t), 60);
        input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); const b = res.querySelector('button'); if (b) b.click(); } });
        cuerpo.querySelector('[data-vaciar]').addEventListener('click', () => { g.items = []; pintarElegidos(); redibujar(); });
        pintarElegidos();
      }
      pintar();
    }
    mesa(panel, config, generar);
  }

  // ---------- pestaña bulto y pallet ----------
  function tabBulto(panel) {
    const b = est.b;
    if (!b.productoId || !App.get('productos', b.productoId)) {
      const reciente = lotesRecientes()[0];
      if (reciente) { b.productoId = reciente.productoId; b.dep = reciente.depositoId; b.loteId = reciente.id; }
      else b.productoId = productosActivos()[0].id;
    }
    function loteElegido() { return b.loteId ? App.get('lotes', b.loteId) : null; }
    function generar() {
      const p = App.get('productos', b.productoId);
      const lote = loteElegido();
      const etiquetas = [];
      if (b.tipo === 'pallet') {
        const f = FORMATOS.p[b.termica ? 'termica' : 'a4'];
        const bultos = b.bultosPallet || 0;
        const n = Math.max(0, Math.min(8, b.copiasPallet || 0));
        if (p && bultos > 0) for (let i = 1; i <= n; i++) etiquetas.push(etiquetaPallet(p, lote, bultos, i, n));
        return { etiquetas, f, vacio: 'Falta indicar la cantidad de bultos del pallet.' };
      }
      const f = FORMATOS.b[b.termica ? 'termica' : 'a4'];
      const n = Math.max(0, Math.min(MAX_ETIQUETAS, b.copias || 0));
      if (p) for (let i = 1; i <= n; i++) etiquetas.push(etiquetaBulto(p, lote, i, n));
      return { etiquetas, f, vacio: 'Falta indicar la cantidad de bultos a rotular.' };
    }
    function config(el, redibujar) {
      function pintar() {
        const p = App.get('productos', b.productoId);
        const lotes = q.lotes(b.productoId, b.dep);
        if (b.loteId && !lotes.some(l => l.id === b.loteId)) b.loteId = '';
        if (!b.loteId && lotes.length) b.loteId = lotes[0].id;
        const lote = loteElegido();
        if (b.bultosPallet == null) b.bultosPallet = lote ? Math.min(lote.cantidad, 60) : 40;
        el.innerHTML = h`
          <div class="et-bloque"><h3>Tipo de rótulo</h3>${segmentado('tipo', [['bulto', 'Bultos o cajas'], ['pallet', 'Pallet']], b.tipo, 'Tipo de rótulo')}</div>
          <div class="et-bloque et-campos">
            <div class="campo"><label for="eb-prod">Producto</label><select id="eb-prod">${rubros().map(r => ui.seguro('<optgroup label="' + ui.escapar(r) + '">' + productosActivos().filter(x => x.rubro === r).map(x => '<option value="' + x.id + '"' + (x.id === b.productoId ? ' selected' : '') + '>' + ui.escapar(x.descripcion) + '</option>').join('') + '</optgroup>'))}</select></div>
            <div class="et-campos-2">
              <div class="campo"><label for="eb-dep">Depósito</label><select id="eb-dep">${ui.opciones(App.db.depositos, 'id', 'nombre', b.dep)}</select></div>
              <div class="campo"><label for="eb-lote">Lote</label><select id="eb-lote"><option value="">Sin lote</option>${lotes.map(l => h`<option value="${l.id}"${l.id === b.loteId ? ' selected' : ''}>${l.lote}${l.vence ? ', vence ' + ui.fecha(l.vence) : ''}</option>`)}</select></div>
            </div>
            ${b.tipo === 'bulto' ? h`<div class="campo"><label for="eb-copias">Cantidad de etiquetas</label><input id="eb-copias" type="number" min="1" max="${MAX_ETIQUETAS}" step="1" value="${b.copias}">
                ${lote ? h`<button type="button" class="btn btn-fantasma btn-chico" data-todo style="align-self:flex-start">Una por bulto del lote (${ui.num(Math.ceil(lote.cantidad))})</button>` : ''}
                <span class="campo-ayuda">Numeración «Bulto 1 de N» para controlar la integridad del envío.</span></div>`
            : h`<div class="et-campos-2"><div class="campo"><label for="eb-pallet">Bultos en el pallet</label><input id="eb-pallet" type="number" min="1" step="1" value="${b.bultosPallet}"></div>
                <div class="campo"><label for="eb-caras">Etiquetas</label><input id="eb-caras" type="number" min="1" max="8" step="1" value="${b.copiasPallet}"></div></div>
                <span class="campo-ayuda">Se recomiendan dos: una en cada cara del pallet visible desde el pasillo.</span>`}
            ${p && lote ? h`<p class="nota-discreta" style="margin:0">Existencia del lote ${lote.lote}: ${ui.num(lote.cantidad)} (${p.unidad}) en ${nombreDep(lote.depositoId)}.</p>` : ''}
          </div>
          <div class="et-bloque"><h3>Código a imprimir</h3>${segmentado('codigo', [['ean', 'EAN del fabricante'], ['propio', 'Código propio']], b.codigo, 'Código a imprimir')}${p ? ui.seguro(avisoSinPropio([p], b.codigo)) : ''}</div>
          <div class="et-bloque"><h3>Papel</h3>${segmentado('papel', b.tipo === 'pallet' ? [['termica', 'Térmica 100 × 150'], ['a4', 'Hoja A4 (2)']] : [['termica', 'Térmica 100 × 70'], ['a4', 'Hoja A4 (8)']], b.termica ? 'termica' : 'a4', 'Papel')}</div>
          <div class="et-bloque"><h3>Ingresos recientes</h3><ul class="et-lista" data-recientes></ul></div>`;
        alSegmentado(el, 'tipo', v => { b.tipo = v; pintar(); redibujar(); });
        alSegmentado(el, 'papel', v => { b.termica = v === 'termica'; redibujar(); });
        alSegmentado(el, 'codigo', v => { b.codigo = v; pintar(); redibujar(); });
        el.querySelector('#eb-prod').addEventListener('change', e => { b.productoId = e.target.value; b.loteId = ''; b.bultosPallet = null; pintar(); redibujar(); });
        el.querySelector('#eb-dep').addEventListener('change', e => { b.dep = e.target.value; b.loteId = ''; b.bultosPallet = null; pintar(); redibujar(); });
        el.querySelector('#eb-lote').addEventListener('change', e => { b.loteId = e.target.value; b.bultosPallet = null; pintar(); redibujar(); });
        const num = (sel, fn) => { const i = el.querySelector(sel); if (i) i.addEventListener('input', () => { fn(Math.max(0, Math.round(Number(i.value) || 0))); redibujar(); }); };
        num('#eb-copias', v => { b.copias = Math.min(MAX_ETIQUETAS, v); });
        num('#eb-pallet', v => { b.bultosPallet = v; });
        num('#eb-caras', v => { b.copiasPallet = Math.min(8, v); });
        const todo = el.querySelector('[data-todo]');
        if (todo) todo.addEventListener('click', () => { b.copias = Math.min(MAX_ETIQUETAS, Math.ceil(lote.cantidad)); pintar(); redibujar(); });
        const ul = el.querySelector('[data-recientes]');
        lotesRecientes().slice(0, 6).forEach(l => {
          const pr = App.get('productos', l.productoId);
          const li = ui.nodo(h`<li><span class="et-item-txt">${pr.descripcion}<small>Lote ${l.lote}, ${ui.num(l.cantidad)} en ${nombreDep(l.depositoId)}, ingreso ${ui.fecha(l.ingreso)}</small></span><button type="button" class="btn btn-secundario btn-chico">Rotular</button></li>`);
          li.querySelector('button').addEventListener('click', () => {
            Object.assign(b, { tipo: 'bulto', productoId: l.productoId, dep: l.depositoId, loteId: l.id, copias: Math.min(MAX_ETIQUETAS, Math.ceil(l.cantidad)), bultosPallet: null });
            pintar(); redibujar();
          });
          ul.appendChild(li);
        });
      }
      pintar();
    }
    mesa(panel, config, generar);
  }
  function lotesRecientes() {
    return App.db.lotes.filter(l => l.cantidad > 0 && l.origen === 'compra' && l.ingreso >= App.config.desde && App.get('productos', l.productoId))
      .sort((a, b) => a.ingreso < b.ingreso ? 1 : a.ingreso > b.ingreso ? -1 : 0);
  }

  // ---------- pestaña balanza (pesables) ----------
  const pesables = () => productosActivos().filter(p => p.pesable && p.plu);
  function tabBalanza(panel) {
    const k = est.k;
    const lista = pesables();
    if (!lista.length) { panel.appendChild(ui.nodo('<div class="vacio">No hay productos pesables. Un producto pesable lleva su PLU de 4 dígitos, el código de la balanza, y se vende por kilo.</div>')); return; }
    if (!k.productoId || !lista.some(p => p.id === k.productoId)) k.productoId = lista[0].id;
    function generar() {
      const p = App.get('productos', k.productoId);
      const f = FORMATOS.k.termica;
      const etiquetas = [];
      if (p && k.kilos > 0) { const html = etiquetaBalanza(p, k); for (let i = 0; i < Math.max(0, Math.min(99, k.copias || 0)); i++) etiquetas.push(html); }
      return { etiquetas, f, vacio: 'Falta indicar el peso en kilos.' };
    }
    function config(el, redibujar) {
      const decimales = n => n % 1 ? (Math.round(n * 100) % 10 ? 2 : 1) : 0;
      function desglose() {
        const p = App.get('productos', k.productoId);
        const d = datosBalanza(p, k);
        const c = d.ean;
        return h`<p class="et-ean-desglose" style="margin:0">Código de la etiqueta: <code>${c}</code><br>${c.slice(0, 2)} pesable, ${c.slice(2, 6)} PLU, ${c.slice(6, 7)} control, ${c.slice(7, 12)} gramos y ${c.slice(12)} verificador. La caja lee el código y sabe qué producto es y cuánto pesa.</p>
          <p class="nota-discreta" style="margin:6px 0 0">${ui.pesos(d.porKilo)} el kilo (lista ${(App.get('listasPrecio', k.lista) || {}).nombre}, con IVA y el recargo de la venta por kilo). Importe: ${ui.pesos(d.importe)}.</p>`;
      }
      function pintar() {
        const p = App.get('productos', k.productoId);
        const piezas = App.presentaciones(p).filter(x => x.id !== 'kg');
        el.innerHTML = h`
          <div class="et-bloque et-campos">
            <div class="campo"><label for="ek-prod">Producto pesable</label><select id="ek-prod">${lista.map(x => h`<option value="${x.id}"${x.id === k.productoId ? ' selected' : ''}>${x.descripcion} (PLU ${x.plu})</option>`)}</select></div>
            <div class="et-campos-2">
              <div class="campo"><label for="ek-kilos">Peso (kg)</label><input id="ek-kilos" type="number" inputmode="decimal" min="0.005" max="99.999" step="0.005" value="${k.kilos}"></div>
              <div class="campo"><label for="ek-copias">Etiquetas</label><input id="ek-copias" type="number" min="1" max="99" step="1" value="${k.copias}"></div>
            </div>
            ${piezas.length ? h`<div class="et-pesos" role="group" aria-label="Peso de una presentación">${piezas.map(x => h`<button type="button" class="btn btn-fantasma btn-chico" data-kilos="${x.factor}">${x.nombre.replace(/\s*\(.*\)/, '')}: ${ui.num(x.factor, decimales(x.factor))} kg</button>`)}</div>` : ''}
            <div class="campo"><label for="ek-lista">Lista de precios</label><select id="ek-lista">${ui.opciones(App.db.listasPrecio, 'id', 'nombre', k.lista)}</select></div>
          </div>
          <div class="et-bloque" data-desglose>${desglose()}</div>
          <div class="et-bloque"><h3>Papel</h3><p class="nota-discreta" style="margin:0">Rollo térmico de balanza, 60 × 40 mm. En el sistema real la balanza imprime sola al pesar; desde acá se reimprime o se rotula una pieza pesada aparte.</p></div>`;
        const refrescar = () => { el.querySelector('[data-desglose]').innerHTML = String(desglose()); redibujar(); };
        el.querySelector('#ek-prod').addEventListener('change', e => { k.productoId = e.target.value; pintar(); redibujar(); });
        el.querySelector('#ek-lista').addEventListener('change', e => { k.lista = e.target.value; refrescar(); });
        const kil = el.querySelector('#ek-kilos');
        kil.addEventListener('input', () => { k.kilos = Math.max(0, Math.min(99.999, Number(kil.value) || 0)); refrescar(); });
        const cop = el.querySelector('#ek-copias');
        cop.addEventListener('input', () => { k.copias = Math.max(0, Math.min(99, Math.round(Number(cop.value) || 0))); redibujar(); });
        el.querySelectorAll('[data-kilos]').forEach(b => b.addEventListener('click', () => { k.kilos = Number(b.dataset.kilos); kil.value = k.kilos; refrescar(); }));
      }
      pintar();
    }
    mesa(panel, config, generar);
  }

  // ---------- pestaña envíos ----------
  function remitosAbiertos() {
    return App.db.remitos.filter(r => r.estado === 'pendiente' || r.estado === 'en_ruta').slice().sort((a, b) => b.numero - a.numero);
  }
  function tabEnvios(panel) {
    const e = est.e;
    const abiertos = remitosAbiertos();
    if (e.ids == null) e.ids = abiertos.slice(0, 2).map(r => r.id);
    e.ids = e.ids.filter(id => App.get('remitos', id));
    function generar() {
      const f = FORMATOS.b[e.termica ? 'termica' : 'a4'];
      const etiquetas = [];
      e.ids.map(id => App.get('remitos', id)).filter(Boolean).forEach(r => {
        const n = e.porBulto ? Math.max(1, Math.min(99, Math.ceil(r.bultos || 1))) : 1;
        for (let i = 1; i <= n; i++) etiquetas.push(etiquetaEnvio(r, i, n));
      });
      return { etiquetas, f, vacio: 'Se debe seleccionar al menos un remito para generar los rótulos.' };
    }
    function config(el, redibujar) {
      function pintar() {
        const clientes = Array.from(new Set(abiertos.map(r => r.clienteId))).map(id => App.get('clientes', id)).filter(Boolean).sort((a, b) => a.fantasia < b.fantasia ? -1 : 1);
        const visibles = abiertos.filter(r => !e.clienteId || r.clienteId === e.clienteId);
        el.innerHTML = h`
          <div class="et-bloque et-campos"><h3 style="margin:0">Remitos para despachar</h3>
            <div class="campo"><label for="ee-cli">Cliente</label><select id="ee-cli"><option value="">Todos los clientes (${abiertos.length} remitos)</option>${clientes.map(c => h`<option value="${c.id}"${c.id === e.clienteId ? ' selected' : ''}>${c.fantasia}</option>`)}</select></div>
            <ul class="et-lista" data-rem></ul>
            <div class="fila separar"><button type="button" class="btn btn-fantasma btn-chico" data-todos>Seleccionar los ${visibles.length} de la lista</button><button type="button" class="btn btn-fantasma btn-chico" data-ninguno>Quitar selección</button></div>
          </div>
          <div class="et-bloque"><h3>Cantidad de rótulos</h3>${segmentado('cuantos', [['bulto', 'Uno por bulto'], ['remito', 'Uno por remito']], e.porBulto ? 'bulto' : 'remito', 'Cantidad de rótulos')}
            <span class="campo-ayuda" style="display:block;margin-top:6px">Código de barras interno: contiene el número de remito y se escanea con el lector al cargar el camión.</span></div>
          <div class="et-bloque"><h3>Papel</h3>${segmentado('papel', [['termica', 'Térmica 100 × 70'], ['a4', 'Hoja A4 (8)']], e.termica ? 'termica' : 'a4', 'Papel')}</div>`;
        const ul = el.querySelector('[data-rem]');
        if (!visibles.length) ul.innerHTML = '<li class="texto-2">No hay remitos pendientes ni en reparto.</li>';
        visibles.forEach(r => {
          const c = App.get('clientes', r.clienteId) || {};
          const li = ui.nodo(h`<li><label><input type="checkbox"${e.ids.includes(r.id) ? ' checked' : ''}><span class="et-item-txt">${c.fantasia || ''}<small>Remito ${r.nro}, ${ui.num(r.bultos)} bultos, ${r.estado === 'en_ruta' ? 'en reparto' : 'sin hoja de ruta'}</small></span></label></li>`);
          li.querySelector('input').addEventListener('change', ev => { if (ev.target.checked) { if (!e.ids.includes(r.id)) e.ids.push(r.id); } else e.ids = e.ids.filter(x => x !== r.id); redibujar(); });
          ul.appendChild(li);
        });
        el.querySelector('#ee-cli').addEventListener('change', ev => { e.clienteId = ev.target.value; pintar(); });
        el.querySelector('[data-todos]').addEventListener('click', () => { visibles.forEach(r => { if (!e.ids.includes(r.id)) e.ids.push(r.id); }); pintar(); redibujar(); });
        el.querySelector('[data-ninguno]').addEventListener('click', () => { e.ids = []; pintar(); redibujar(); });
        alSegmentado(el, 'cuantos', v => { e.porBulto = v === 'bulto'; redibujar(); });
        alSegmentado(el, 'papel', v => { e.termica = v === 'termica'; redibujar(); });
      }
      pintar();
    }
    mesa(panel, config, generar);
  }

  // ---------- pantalla ----------
  function render(el, params) {
    estilos();
    escucharResize();
    let activa = null;
    if (params[0] === 'producto' && App.get('productos', params[1])) {
      const id = params[1];
      est.g.modo = 'mano';
      est.g.items = [{ id, copias: 1 }].concat(est.g.items.filter(it => it.id !== id));
      est.g.codigo = params[2] === 'propio' ? 'propio' : 'ean';
      activa = 'gondola';
    } else if (params[0] === 'balanza' && App.get('productos', params[1])) {
      est.k.productoId = params[1];
      activa = 'balanza';
    } else if (params[0] === 'remito' && App.get('remitos', params[1])) {
      est.e.ids = [params[1]]; est.e.clienteId = '';
      activa = 'envios';
    }
    if (activa) history.replaceState(null, '', '#/etiquetas');
    const cam = cambiaron().length;
    el.innerHTML = h`
      <div class="encabezado-vista"><div><h1 class="titulo-vista">Etiquetas y códigos</h1>
        <p class="bajada">Etiquetas de góndola, rótulos de bulto y de pallet, etiquetas de balanza para pesables y rótulos de envío, con el EAN-13 del fabricante o el código propio de la distribuidora. Vista previa en tamaño real antes de imprimir.</p></div></div>
      ${cam ? h`<div class="aviso aviso-alerta" style="margin-bottom:16px">${plural(cam, 'producto cambió', 'productos cambiaron')} de precio desde la última lista: corresponde reimprimir sus etiquetas de góndola para que el precio exhibido coincida con el facturado.</div>` : ''}
      <div data-pestanas></div>`;
    ui.pestanas(el.querySelector('[data-pestanas]'), [
      { id: 'gondola', titulo: 'Góndola', render: tabGondola },
      { id: 'bulto', titulo: 'Bulto y pallet', render: tabBulto },
      { id: 'balanza', titulo: 'Balanza', render: tabBalanza },
      { id: 'envios', titulo: 'Rótulos de envío', cuenta: remitosAbiertos().length, render: tabEnvios }
    ], { clave: 'etiquetas', activa: activa || undefined });
  }

  App.modulo({
    id: 'etiquetas',
    titulo: 'Etiquetas y códigos',
    grupo: 'Logística',
    orden: 40,
    icono: '<svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 4v12M5.5 4v12M8 4v12M11.5 4v12M13.5 4v12M17 4v12" stroke-width="1.4"/></svg>',
    contador: () => cambiaron().length || '',
    render
  });
})();
