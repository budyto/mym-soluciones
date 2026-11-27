/* Módulo «Listas de precios».
   Las listas con su recargo (las tres de base y las que se creen), el aumento por proveedor, marca o rubro (como llegan las listas nuevas de los
   proveedores) con vista previa, el historial de aumentos y el enlace a imprimir las etiquetas con el precio nuevo.
   Todo cambio pasa por App.acciones.actualizarPrecios y App.acciones.crearListaPrecio.
   Pedido de Leandro «agregar una opción de sumar una lista en la lista»: lo interpretamos como poder crear una
   lista de precios nueva (desde el costo o desde otra lista, con un porcentaje que puede ser negativo). */
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
.lp-nueva { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 14px 16px; align-items: start; }
.lp-nueva .lp-ancho { grid-column: 1 / -1; }
.lp-baja { color: var(--info); font-weight: 600; }
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

  const signo = n => (n > 0 ? '+' : n < 0 ? '−' : '') + ui.num(Math.abs(n), 1);

  // «Nueva lista de precios»: nombre, base (costo o una lista) y porcentaje, con vista previa antes de crearla
  function nuevaLista() {
    const listas = App.db.listasPrecio;
    const f = { nombre: '', base: listas[0] ? listas[0].id : 'costo', pct: -3, detalle: '' };
    const muestra = App.db.productos.filter(p => p.activo !== false && !p.insumo).sort((a, b) => (b.popularidad || 0) - (a.popularidad || 0)).slice(0, 6);
    const precioNuevo = p => {
      const desde = f.base !== 'costo' ? App.get('listasPrecio', f.base) : null;
      const b = desde ? (p.precios[desde.id] != null ? p.precios[desde.id] : Math.round(p.costo * (1 + desde.recargo))) : p.costo;
      return Math.round(b * (1 + (Number(f.pct) || 0) / 100));
    };
    const cuerpo = ui.nodo(String(h`<div><div class="lp-nueva">
      <div class="campo"><label for="lp-n-nombre">Nombre de la lista</label><input id="lp-n-nombre" type="text" placeholder="Por ejemplo: Mayorista especial" autocomplete="off"></div>
      <div class="campo"><label for="lp-n-base">Se calcula desde</label><select id="lp-n-base"><option value="costo">El costo del producto</option>${ui.opciones(listas, 'id', l => 'La lista ' + l.nombre, f.base)}</select></div>
      <div class="campo"><label for="lp-n-pct">Porcentaje (%)</label><input id="lp-n-pct" type="number" step="0.5" value="${f.pct}"><span class="campo-ayuda">Negativo para una lista más barata que la base.</span></div>
      <div class="campo lp-ancho"><label for="lp-n-detalle">Descripción</label><input id="lp-n-detalle" type="text" placeholder="Opcional: para quién es la lista"></div>
    </div><p class="nota-discreta" data-resumen style="margin:14px 0 8px"></p><div data-previa></div></div>`));
    const $ = s => cuerpo.querySelector(s);
    function previa() {
      const base = f.base === 'costo' ? 'el costo' : 'la lista ' + App.get('listasPrecio', f.base).nombre;
      $('[data-resumen]').textContent = 'Vista previa: ' + signo(Number(f.pct) || 0) + ' % sobre ' + base + '. Se calculan los precios de los ' + App.db.productos.length + ' productos; después se ajustan con «Aumentar precios» como cualquier otra lista.';
      const cont = $('[data-previa]'); cont.innerHTML = '';
      cont.appendChild(ui.tabla({
        filas: muestra,
        columnas: [
          { titulo: 'Producto', valor: p => h`<span class="celda-principal">${p.descripcion}</span><span class="celda-sub">${p.unidad.toLowerCase()}</span>` },
          { titulo: f.base === 'costo' ? 'Costo' : 'Lista ' + App.get('listasPrecio', f.base).nombre, alinear: 'der', clase: 'ocultar-celu', valor: p => ui.pesos(f.base === 'costo' ? p.costo : (p.precios[f.base] != null ? p.precios[f.base] : App.q.precio(p.id, f.base))) },
          { titulo: 'Lista nueva, neto', alinear: 'der', valor: p => ui.pesos(precioNuevo(p)) },
          { titulo: 'Final con IVA', alinear: 'der', valor: p => h`<span class="${(Number(f.pct) || 0) < 0 ? 'lp-baja' : 'lp-sube'}">${ui.pesos(final(p, precioNuevo(p)))}</span>` }
        ]
      }));
    }
    $('#lp-n-nombre').addEventListener('input', e => { f.nombre = e.target.value; });
    $('#lp-n-detalle').addEventListener('input', e => { f.detalle = e.target.value; });
    $('#lp-n-base').addEventListener('change', e => { f.base = e.target.value; previa(); });
    $('#lp-n-pct').addEventListener('input', e => { f.pct = e.target.value; previa(); });
    previa();
    ui.modal({ titulo: 'Nueva lista de precios', ancho: 720, cuerpo, acciones: [
      { texto: 'Cancelar', tipo: 'secundario' },
      { texto: 'Crear lista de precios', tipo: 'primario', alClic: () => {
        const l = App.intentar(() => App.acciones.crearListaPrecio({ nombre: f.nombre, detalle: f.detalle.trim() || undefined, base: f.base, porcentaje: Number(f.pct) || 0 }), x => 'Lista de precios creada: ' + x.nombre);
        return l ? true : false;
      } }] });
  }

  function render(el) {
    estilos();
    const listas = App.db.listasPrecio;
    const aumentos = App.db.aumentosPrecio.slice().reverse();
    const ultimo = aumentos[0];
    el.appendChild(ui.nodo(String(h`<div class="encabezado-vista"><div><h1 class="titulo-vista">Listas de precios</h1>
      <p class="bajada">Actualización masiva de precios ante una lista nueva de proveedor. El ajuste puede aplicarse a todas las listas en simultáneo o a cada una por separado.</p></div>
      <div class="acciones"><button type="button" class="btn btn-secundario" data-nueva-lista>Nueva lista de precios</button><a class="btn btn-secundario" href="#/etiquetas">Imprimir etiquetas de precio nuevo</a></div></div>`)));
    el.querySelector('[data-nueva-lista]').addEventListener('click', nuevaLista);
    el.appendChild(ui.nodo(String(ui.franjaKpi(listas.map(l => ({ titulo: 'Lista ' + l.nombre, valor: signo(l.recargo * 100) + ' %', detalle: (l.detalle || '') + ', recargo base sobre el costo' }))
      .concat([{ titulo: 'Último aumento', valor: ultimo ? ui.fecha(ultimo.fecha).slice(0, 5) : 'Ninguno', detalle: ultimo ? ultimo.detalle + ', ' + (ultimo.porcentaje > 0 ? '+' : '') + ui.num(ultimo.porcentaje, 1) + ' %' : '' }])))));

    // tabla de listas: las tres de base y las creadas con «Nueva lista de precios»
    const ejemplo = App.db.productos.find(p => p.activo !== false && !p.insumo && p.rubro === 'Almacén') || App.db.productos[0];
    const tabLis = document.createElement('section');
    tabLis.className = 'seccion';
    tabLis.style.marginTop = '0';
    tabLis.style.marginBottom = '24px';
    tabLis.innerHTML = String(h`<h2 class="seccion-titulo">Listas vigentes <span class="texto-2">${listas.length} listas, ejemplo con ${ejemplo.descripcion}</span></h2>`);
    tabLis.appendChild(ui.tabla({
      filas: listas,
      columnas: [
        { titulo: 'Lista', valor: l => h`<span class="celda-principal">${l.nombre}</span><span class="celda-sub">${l.id}${l.creada ? ', creada el ' + ui.fecha(l.creada) : ''}</span>` },
        { titulo: 'Cómo se calcula', clase: 'ocultar-celu', valor: l => l.base && l.base !== 'costo' ? signo(l.porcentaje) + ' % sobre la lista ' + ((App.get('listasPrecio', l.base) || {}).nombre || l.base)
          : l.base === 'costo' ? signo(l.porcentaje) + ' % sobre el costo' : (l.detalle || 'Recargo sobre el costo') },
        { titulo: 'Recargo s/ costo', alinear: 'der', valor: l => signo(l.recargo * 100) + ' %' },
        { titulo: 'Clientes', alinear: 'der', valor: l => ui.num(App.db.clientes.filter(c => c.listaId === l.id).length) },
        { titulo: 'Precio final de ejemplo', alinear: 'der', clase: 'ocultar-celu', valor: l => ui.pesos(App.q.precioConIVA(ejemplo.id, l.id)) }
      ]
    }));
    el.appendChild(tabLis);

    const sec = document.createElement('section');
    sec.className = 'panel';
    sec.innerHTML = String(h`<div class="panel-titulo">Aumentar precios</div>
      <form class="lp-form" id="lp-form">
        <div class="campo"><label for="lp-tipo">Aumentar por</label><select id="lp-tipo">${ui.opciones([{ id: 'proveedor', t: 'Proveedor' }, { id: 'marca', t: 'Marca' }, { id: 'rubro', t: 'Rubro' }], 'id', 't', filtro.tipo)}</select></div>
        <div class="campo"><label for="lp-valor">${filtro.tipo === 'proveedor' ? 'Proveedor' : filtro.tipo === 'marca' ? 'Marca' : 'Rubro'}</label><select id="lp-valor"><option value="">Todos</option>${ui.opciones(opcionesFiltro(filtro.tipo), 'id', 't', filtro.valor)}</select></div>
        <div class="campo"><label for="lp-lista">Lista</label><select id="lp-lista"><option value="">Todas las listas</option>${ui.opciones(listas, 'id', 'nombre', filtro.lista)}</select></div>
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
      const lista = filtro.lista ? 'la lista ' + App.get('listasPrecio', filtro.lista).nombre : 'todas las listas (' + listas.length + ')';
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
        { titulo: 'Lista', clase: 'ocultar-celu', valor: a => a.listaId ? (App.get('listasPrecio', a.listaId) || {}).nombre : 'Todas' },
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
