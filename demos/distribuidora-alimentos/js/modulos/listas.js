/* Módulo «Listas de precios».
   Las tres listas con su recargo, el aumento por proveedor, marca o rubro (como llegan las listas nuevas de los
   proveedores) con vista previa, el historial de aumentos y el enlace a imprimir las etiquetas con el precio nuevo.
   Todo cambio pasa por App.acciones.actualizarPrecios. */
(function () {
  'use strict';
  const ui = App.ui, h = ui.h;
  const filtro = { tipo: 'proveedor', valor: '', lista: '', pct: 3, texto: '' };

  function estilos() {
    if (document.getElementById('lp-estilos')) return;
    const st = document.createElement('style');
    st.id = 'lp-estilos';
    st.textContent = `
.lp-form { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 14px 16px; align-items: end; }
.lp-form .lp-acciones { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.lp-previa { margin-top: 14px; }
.lp-sube { color: var(--ok); font-weight: 600; }
.lp-ayuda { font-size: var(--fs-12); color: var(--texto-2); }
@media (max-width: 760px) { .lp-form { grid-template-columns: minmax(0, 1fr); } }`;
    document.head.appendChild(st);
  }

  // mismo redondeo que App.q.precioConIVA: pesos enteros, múltiplos de $ 10 si es un bulto
  const final = (p, base) => { const con = base * (1 + p.iva / 100); return p.contenido > 1 ? Math.round(con / 10) * 10 : Math.round(con); };
  const opcionesFiltro = tipo => tipo === 'proveedor' ? App.db.proveedores.map(p => ({ id: p.id, t: p.razonSocial }))
    : tipo === 'marca' ? [...new Set(App.db.productos.map(p => p.marca))].sort().map(m => ({ id: m, t: m }))
    : [...new Set(App.db.productos.map(p => p.rubro))].map(r => ({ id: r, t: r }));
  function elegidos() {
    return App.db.productos.filter(p => p.activo !== false && (!filtro.valor ||
      (filtro.tipo === 'proveedor' ? p.proveedorId === filtro.valor : filtro.tipo === 'marca' ? p.marca === filtro.valor : p.rubro === filtro.valor)));
  }
  function nombreFiltro() {
    if (!filtro.valor) return 'Todos los productos';
    const o = opcionesFiltro(filtro.tipo).find(x => x.id === filtro.valor);
    return (filtro.tipo === 'proveedor' ? 'Lista de ' : filtro.tipo === 'marca' ? 'Marca ' : 'Rubro ') + (o ? o.t : filtro.valor);
  }

  function render(el) {
    estilos();
    const listas = App.db.listasPrecio;
    const aumentos = App.db.aumentosPrecio.slice().reverse();
    const ultimo = aumentos[0];
    el.appendChild(ui.nodo(String(h`<div class="encabezado-vista"><div><h1 class="titulo-vista">Listas de precios</h1>
      <p class="bajada">Actualización masiva de precios ante una lista nueva de proveedor. El ajuste puede aplicarse a las tres listas en simultáneo o a cada una por separado.</p></div>
      <div class="acciones"><a class="btn btn-secundario" href="#/etiquetas">Imprimir etiquetas de precio nuevo</a></div></div>`)));
    el.appendChild(ui.nodo(String(ui.franjaKpi(listas.map(l => ({ titulo: 'Lista ' + l.nombre, valor: '+' + ui.num(l.recargo * 100, 1) + ' %', detalle: (l.detalle || '') + ', recargo base sobre el costo' }))
      .concat([{ titulo: 'Último aumento', valor: ultimo ? ui.fecha(ultimo.fecha).slice(0, 5) : 'Ninguno', detalle: ultimo ? ultimo.detalle + ', ' + (ultimo.porcentaje > 0 ? '+' : '') + ui.num(ultimo.porcentaje, 1) + ' %' : '' }])))));

    const sec = document.createElement('section');
    sec.className = 'panel';
    sec.innerHTML = String(h`<div class="panel-titulo">Aumentar precios</div>
      <form class="lp-form" id="lp-form">
        <div class="campo"><label for="lp-tipo">Aumentar por</label><select id="lp-tipo">${ui.opciones([{ id: 'proveedor', t: 'Proveedor' }, { id: 'marca', t: 'Marca' }, { id: 'rubro', t: 'Rubro' }], 'id', 't', filtro.tipo)}</select></div>
        <div class="campo"><label for="lp-valor">${filtro.tipo === 'proveedor' ? 'Proveedor' : filtro.tipo === 'marca' ? 'Marca' : 'Rubro'}</label><select id="lp-valor"><option value="">Todos</option>${ui.opciones(opcionesFiltro(filtro.tipo), 'id', 't', filtro.valor)}</select></div>
        <div class="campo"><label for="lp-lista">Lista</label><select id="lp-lista"><option value="">Las tres listas</option>${ui.opciones(listas, 'id', 'nombre', filtro.lista)}</select></div>
        <div class="campo"><label for="lp-pct">Aumento (%)</label><input id="lp-pct" type="number" step="0.5" value="${filtro.pct}"><span class="campo-ayuda">Un valor negativo reduce los precios.</span></div>
        <div class="lp-acciones"><button type="button" class="btn btn-primario" id="lp-aplicar">Aplicar aumento</button><span class="lp-ayuda" id="lp-ayuda"></span></div>
      </form>
      <div class="lp-previa" id="lp-previa"></div>`);
    el.appendChild(sec);

    const $ = s => sec.querySelector(s);
    function previa() {
      const prods = elegidos(), pct = Number(filtro.pct) || 0;
      const l = filtro.lista || 'L2';
      $('#lp-ayuda').textContent = !pct ? 'Ingresar el porcentaje.' : plural(prods.length) + ' a actualizar';
      $('#lp-aplicar').disabled = !pct || !prods.length;
      const cont = $('#lp-previa');
      cont.innerHTML = String(h`<p class="nota-discreta" style="margin:0 0 8px">Vista previa en la lista ${App.get('listasPrecio', l).nombre}, precio final con IVA.</p>`);
      cont.appendChild(ui.tabla({
        filas: prods, limite: 10,
        columnas: [
          { titulo: 'Producto', valor: p => h`<span class="celda-principal">${p.descripcion}</span><span class="celda-sub">${p.marca}, ${p.unidad.toLowerCase()}</span>` },
          { titulo: 'Último cambio', clase: 'ocultar-celu', valor: p => p.precioCambio ? ui.fecha(p.precioCambio) : 'Sin cambios' },
          { titulo: 'Hoy', alinear: 'der', valor: p => ui.pesos(App.q.precioConIVA(p.id, l)) },
          { titulo: 'Con el aumento', alinear: 'der', valor: p => pct ? h`<span class="lp-sube">${ui.pesos(final(p, Math.round(p.precios[l] * (1 + pct / 100))))}</span>` : '' }
        ],
        vacio: 'No hay productos con ese filtro.'
      }));
    }
    function plural(n) { return n + (n === 1 ? ' producto' : ' productos'); }
    $('#lp-tipo').addEventListener('change', e => { filtro.tipo = e.target.value; filtro.valor = ''; App.renderizar(); });
    $('#lp-valor').addEventListener('change', e => { filtro.valor = e.target.value; previa(); });
    $('#lp-lista').addEventListener('change', e => { filtro.lista = e.target.value; previa(); });
    $('#lp-pct').addEventListener('input', e => { filtro.pct = e.target.value; previa(); });
    $('#lp-form').addEventListener('submit', e => e.preventDefault());
    $('#lp-aplicar').addEventListener('click', async () => {
      const prods = elegidos(), pct = Number(filtro.pct) || 0;
      const lista = filtro.lista ? 'la lista ' + App.get('listasPrecio', filtro.lista).nombre : 'las tres listas';
      const ok = await ui.confirmar('Se aplicará ' + (pct > 0 ? 'un aumento' : 'una reducción') + ' del ' + ui.num(Math.abs(pct), 1) + ' % a ' + plural(prods.length) + ' (' + nombreFiltro().toLowerCase() + ') en ' + lista + '.', { titulo: 'Aplicar aumento', aceptar: 'Aplicar aumento' });
      if (!ok) return;
      const n = App.intentar(() => App.acciones.actualizarPrecios({ productoIds: prods.map(p => p.id), porcentaje: pct, listaId: filtro.lista || undefined, detalle: nombreFiltro() }));
      if (!n) return;
      ui.modal({ titulo: 'Aumento aplicado', ancho: 480, cuerpo: ui.h`<p style="margin-top:0">Se actualizaron ${plural(n)}. Se recomienda imprimir las etiquetas con el precio nuevo para las góndolas propias y de los clientes.</p>`,
        acciones: [{ texto: 'Cerrar', tipo: 'secundario' }, { texto: 'Imprimir etiquetas de precio nuevo', tipo: 'primario', alClic: () => { setTimeout(() => ui.ir('#/etiquetas'), 0); } }] });
    });
    previa();

    const hist = document.createElement('section');
    hist.className = 'seccion';
    hist.innerHTML = String(h`<h2 class="seccion-titulo">Historial de aumentos <span class="texto-2">del más reciente al más antiguo</span></h2>`);
    hist.appendChild(ui.tabla({
      filas: aumentos, limite: 15,
      columnas: [
        { titulo: 'Fecha', valor: a => ui.fecha(a.fecha) },
        { titulo: 'Alcance', valor: a => h`<span class="celda-principal">${a.detalle}</span><span class="celda-sub">${a.cantidad} ${a.cantidad === 1 ? 'producto' : 'productos'}${a.costo ? ', con el costo del proveedor' : ''}</span>` },
        { titulo: 'Lista', clase: 'ocultar-celu', valor: a => a.listaId ? (App.get('listasPrecio', a.listaId) || {}).nombre : 'Las tres' },
        { titulo: 'Aumento', alinear: 'der', valor: a => (a.porcentaje > 0 ? '+' : '') + ui.num(a.porcentaje, 1) + ' %' }
      ],
      vacio: 'No hay aumentos registrados.'
    }));
    el.appendChild(hist);
  }

  App.modulo({
    id: 'listas',
    titulo: 'Listas de precios',
    grupo: 'Comercial',
    orden: 45,
    icono: '<svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.5 2.5H16a1.5 1.5 0 0 1 1.5 1.5v5.5l-8 8-7-7 8-8z"/><circle cx="13.5" cy="6.5" r="1.2"/></svg>',
    render(el) { render(el); }
  });
})();
