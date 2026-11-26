/* Módulo «Clientes»: lista con saldo, vencido y límite; ficha con cuenta corriente, antigüedad de la deuda, lista de precios,
   pedidos y resumen de cuenta por WhatsApp; alta y edición. Los datos se guardan con App.acciones.guardarMaestro. */
(function () {
  'use strict';
  const U = App.ui, h = U.h, F = App.f, r2 = App.r2;

  const CSS = `
.cli-titulo { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.cli-uso { display: inline-grid; grid-template-columns: 56px 44px; gap: 8px; align-items: center; justify-content: end; }
.cli-uso .barra-h { min-width: 0; height: 6px; }
.cli-uso .barra-h > span { background: var(--ok); }
.cli-uso.cli-uso-alerta .barra-h > span { background: var(--alerta); }
.cli-uso.cli-uso-peligro .barra-h > span { background: var(--peligro); }
.cli-uso small { font-size: var(--fs-12); color: var(--texto-2); text-align: right; font-variant-numeric: tabular-nums; }
.cli-antiguedad { display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px; }
.cli-pila { display: flex; height: 30px; border-radius: 4px; overflow: hidden; background: var(--neutro-suave); }
.cli-pila > span { display: block; height: 100%; min-width: 0; }
.cli-pila > span + span { border-left: 2px solid var(--hoja); }
.cli-t1 { background: #8FB9A3; } .cli-t2 { background: var(--carton); } .cli-t3 { background: var(--alerta); } .cli-t4 { background: var(--peligro); }
.cli-tramos { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0; }
.cli-tramos > div { padding: 2px 14px 0; border-left: 1px solid var(--linea); }
.cli-tramos > div:first-child { border-left: 0; padding-left: 0; }
.cli-tramos span { display: flex; align-items: center; gap: 6px; font-size: var(--fs-12); color: var(--texto-2); }
.cli-tramos span i { width: 10px; height: 10px; border-radius: 2px; display: inline-block; }
.cli-tramos strong { display: block; font-size: var(--fs-16); font-weight: 800; font-stretch: 112%; font-variant-numeric: tabular-nums; margin-top: 2px; }
.cli-tramos em { font-style: normal; font-size: var(--fs-12); color: var(--texto-2); }
.cli-dias { display: flex; gap: 4px; flex-wrap: wrap; }
.cli-dias span { font-size: var(--fs-12); padding: 2px 7px; border-radius: 4px; background: var(--neutro-suave); color: var(--texto-2); }
.cli-dias span.on { background: var(--tinta); color: #fff; font-weight: 600; }
.cli-wa textarea { min-height: 260px; font-size: var(--fs-13); line-height: 1.5; }
.cli-checks { display: flex; gap: 6px 14px; flex-wrap: wrap; padding-top: 6px; }
@media (max-width: 760px) {
  .cli-tramos { grid-template-columns: repeat(2, minmax(0, 1fr)); row-gap: 10px; }
  .cli-tramos > div:nth-child(3) { border-left: 0; padding-left: 0; }
}`;
  function estilos() {
    if (document.getElementById('cli-estilos')) return;
    const s = document.createElement('style');
    s.id = 'cli-estilos';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  const nodo = html => { const t = document.createElement('template'); t.innerHTML = String(html).trim(); return t.content.firstElementChild; };
  const COND = { RI: 'Responsable Inscripto', MT: 'Monotributo', CF: 'Consumidor Final', EX: 'Exento' };
  const MEDIOS = { efectivo: 'Efectivo', transferencia: 'Transferencia', cheque: 'Cheque', echeq: 'eCheq' };
  const DIAS = [['lun', 'Lun'], ['mar', 'Mar'], ['mie', 'Mié'], ['jue', 'Jue'], ['vie', 'Vie'], ['sab', 'Sáb']];
  const TRAMOS = [['t1', 'De 0 a 30 días'], ['t2', 'De 31 a 60 días'], ['t3', 'De 61 a 90 días'], ['t4', 'Más de 90 días']];
  const preventista = id => App.get('preventistas', id) || {};
  const lista = id => App.get('listasPrecio', id) || { nombre: id };
  function cuitValido(c) {
    const d = String(c || '').replace(/\D/g, '');
    if (d.length !== 11) return false;
    const p = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    let s = 0; for (let i = 0; i < 10; i++) s += Number(d[i]) * p[i];
    let dv = 11 - (s % 11); if (dv === 11) dv = 0;
    return dv !== 10 && dv === Number(d[10]);
  }
  const formatoCuit = c => { const d = String(c || '').replace(/\D/g, ''); return d.length === 11 ? d.slice(0, 2) + '-' + d.slice(2, 10) + '-' + d.slice(10) : c; };

  // situación de deuda de todos los clientes en una pasada
  function situaciones() {
    const hoy = App.hoy(), res = {};
    App.db.clientes.forEach(c => { res[c.id] = { saldo: App.q.saldoCliente(c.id), vencido: 0, atraso: 0, t1: 0, t2: 0, t3: 0, t4: 0, pendientes: 0 }; });
    App.db.comprobantes.forEach(f => {
      if (f.clase !== 'factura') return;
      const s = App.q.saldoComprobante(f); if (s <= 0.01) return;
      const x = res[f.clienteId]; if (!x) return;
      x.pendientes++;
      const edad = F.diferencia(f.fecha, hoy);
      x[edad <= 30 ? 't1' : edad <= 60 ? 't2' : edad <= 90 ? 't3' : 't4'] += s;
      if (f.vence < hoy) { x.vencido += s; x.atraso = Math.max(x.atraso, F.diferencia(f.vence, hoy)); }
    });
    Object.values(res).forEach(x => ['vencido', 't1', 't2', 't3', 't4'].forEach(k => { x[k] = r2(x[k]); }));
    return res;
  }
  function estadoCliente(c, s) {
    if (c.activo === false) return ['Inactivo', 'neutro'];
    if (s.saldo > c.limiteCredito) return ['Excedido', 'peligro'];
    if (s.atraso > 60) return ['Moroso', 'peligro'];
    if (s.vencido > 0.01) return ['Con vencido', 'alerta'];
    if (s.saldo > 0.01) return ['Al día', 'ok'];
    return ['Sin deuda', 'neutro'];
  }
  function usoLimite(c, s) {
    const u = c.limiteCredito ? Math.max(0, s.saldo) / c.limiteCredito : 0;
    const t = u > 1 ? ' cli-uso-peligro' : u > 0.8 ? ' cli-uso-alerta' : '';
    return h`<span class="cli-uso${t}" title="Uso del límite: ${U.porcentaje(u, 0)}"><span class="barra-h" aria-hidden="true"><span style="width:${Math.min(100, u * 100).toFixed(0)}%"></span></span><small>${U.num(u * 100)} %</small></span>`;
  }

  // ---------- alta y edición ----------
  function formCliente(c) {
    const nuevo = !c;
    const d = c || { condicionIVA: 'MT', tipo: 'Almacén', preventistaId: 'pv1', depositoId: 'D1', listaId: 'L2', limiteCredito: 3500000, plazo: 7, diasVisita: ['lun', 'jue'], medioPreferido: 'efectivo', activo: true };
    const tipos = [...new Set(App.db.clientes.map(x => x.tipo))].sort();
    const cuerpo = nodo(h`<form class="form-grilla cli-form" novalidate>
      <div class="campo"><label for="cli-fantasia">Nombre de fantasía</label><input id="cli-fantasia" name="fantasia" value="${d.fantasia || ''}" placeholder="Ej.: Almacén Don Pepe" required></div>
      <div class="campo"><label for="cli-razon">Razón social</label><input id="cli-razon" name="razonSocial" value="${d.razonSocial || ''}" placeholder="Como figura en ARCA" required></div>
      <div class="campo"><label for="cli-cond">Condición frente al IVA</label><select id="cli-cond" name="condicionIVA">${Object.keys(COND).map(k => h`<option value="${k}"${d.condicionIVA === k ? U.seguro(' selected') : ''}>${COND[k]}</option>`)}</select>
        <span class="campo-ayuda" data-letra></span></div>
      <div class="campo"><label for="cli-cuit">CUIT</label><input id="cli-cuit" name="cuit" value="${d.cuit || ''}" inputmode="numeric" placeholder="30-00000000-0"><span class="campo-error" data-error-cuit hidden></span></div>
      <div class="campo"><label for="cli-tipo">Tipo de negocio</label><select id="cli-tipo" name="tipo">${tipos.map(t => h`<option${d.tipo === t ? U.seguro(' selected') : ''}>${t}</option>`)}</select></div>
      <div class="campo"><label for="cli-tel">Teléfono</label><input id="cli-tel" name="telefono" type="tel" value="${d.telefono || ''}" placeholder="0353 452-0000"></div>
      <div class="campo"><label for="cli-dir">Dirección</label><input id="cli-dir" name="direccion" value="${d.direccion || ''}" placeholder="Calle y número"></div>
      <div class="campo"><label for="cli-loc">Localidad</label><input id="cli-loc" name="localidad" value="${d.localidad || ''}" list="cli-localidades"></div>
      <datalist id="cli-localidades">${[...new Set(App.db.clientes.map(x => x.localidad))].sort().map(l => h`<option value="${l}">`)}</datalist>
      <div class="campo"><label for="cli-email">Correo</label><input id="cli-email" name="email" type="email" value="${d.email || ''}"></div>
      <div class="campo"><label for="cli-pv">Preventista y zona</label><select id="cli-pv" name="preventistaId">${U.opciones(App.db.preventistas, 'id', p => p.nombre + ' (' + p.zona + ')', d.preventistaId)}</select></div>
      <div class="campo"><label for="cli-dep">Depósito que lo abastece</label><select id="cli-dep" name="depositoId">${U.opciones(App.db.depositos, 'id', 'nombre', d.depositoId)}</select></div>
      <div class="campo"><label for="cli-lista">Lista de precios</label><select id="cli-lista" name="listaId">${U.opciones(App.db.listasPrecio, 'id', l => l.nombre + ' (+' + U.num(l.recargo * 100, 1) + ' % s/costo)', d.listaId)}</select></div>
      <div class="campo"><label for="cli-limite">Límite de crédito</label><input id="cli-limite" name="limiteCredito" type="number" min="0" step="10000" value="${d.limiteCredito}"></div>
      <div class="campo"><label for="cli-plazo">Condición de venta</label><select id="cli-plazo" name="plazo">${[0, 7, 15, 21, 30, 45, 60].map(p => h`<option value="${p}"${Number(d.plazo) === p ? U.seguro(' selected') : ''}>${p ? 'Cuenta corriente a ' + p + ' días' : 'Contado'}</option>`)}</select></div>
      <div class="campo"><label for="cli-medio">Medio de pago habitual</label><select id="cli-medio" name="medioPreferido">${Object.keys(MEDIOS).map(k => h`<option value="${k}"${d.medioPreferido === k ? U.seguro(' selected') : ''}>${MEDIOS[k]}</option>`)}</select></div>
      <fieldset class="campo ancho-total" style="border:0;padding:0;margin:0"><legend class="etiqueta-campo" style="font-size:var(--fs-13);font-weight:600">Días de visita del preventista</legend>
        <div class="cli-checks">${DIAS.map(([k, t]) => h`<label class="check"><input type="checkbox" data-dia="${k}"${(d.diasVisita || []).includes(k) ? U.seguro(' checked') : ''}> ${t}</label>`)}</div></fieldset>
      ${nuevo ? '' : h`<label class="check ancho-total"><input type="checkbox" name="activo"${d.activo !== false ? U.seguro(' checked') : ''}> Cliente activo (los clientes inactivos no se muestran al cargar pedidos)</label>`}
    </form>`);
    cuerpo.addEventListener('submit', e => e.preventDefault());
    const letra = () => { cuerpo.querySelector('[data-letra]').textContent = 'Comprobante a emitir: factura ' + (cuerpo.querySelector('#cli-cond').value === 'RI' ? 'A' : 'B') + '.'; };
    cuerpo.querySelector('#cli-cond').addEventListener('change', letra); letra();
    const cuitIn = cuerpo.querySelector('#cli-cuit'), cuitErr = cuerpo.querySelector('[data-error-cuit]');
    cuitIn.addEventListener('blur', () => {
      const v = cuitIn.value.trim();
      const mal = v && !cuitValido(v);
      cuitIn.setAttribute('aria-invalid', mal ? 'true' : 'false');
      cuitErr.hidden = !mal; cuitErr.textContent = mal ? 'CUIT inválido: el dígito verificador no coincide.' : '';
      if (!mal && v) cuitIn.value = formatoCuit(v);
    });
    U.modal({ titulo: nuevo ? 'Nuevo cliente' : 'Editar cliente: ' + d.fantasia, cuerpo, ancho: 820, acciones: [
      { texto: 'Cancelar', tipo: 'secundario' },
      { texto: nuevo ? 'Dar de alta' : 'Guardar cambios', tipo: 'primario', alClic: () => {
        const v = U.leerFormulario(cuerpo);
        const datos = {
          fantasia: (v.fantasia || '').trim() || (v.razonSocial || '').trim(), razonSocial: (v.razonSocial || '').trim(),
          condicionIVA: v.condicionIVA, cuit: (v.cuit || '').trim() ? formatoCuit(v.cuit.trim()) : '', tipo: v.tipo, telefono: (v.telefono || '').trim(),
          direccion: (v.direccion || '').trim(), localidad: (v.localidad || '').trim(), email: (v.email || '').trim(),
          preventistaId: v.preventistaId, zona: preventista(v.preventistaId).zona, depositoId: v.depositoId, listaId: v.listaId,
          limiteCredito: Number(v.limiteCredito) || 0, plazo: Number(v.plazo) || 0, medioPreferido: v.medioPreferido,
          diasVisita: [...cuerpo.querySelectorAll('[data-dia]')].filter(i => i.checked).map(i => i.dataset.dia)
        };
        if (!datos.razonSocial) throw new Error('Falta la razón social del cliente.');
        if (datos.condicionIVA !== 'CF' && !datos.cuit) throw new Error('El CUIT es obligatorio para facturar.');
        if (datos.cuit && !cuitValido(datos.cuit)) throw new Error('CUIT inválido: el dígito verificador no coincide.');
        if (datos.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(datos.email)) throw new Error('El correo electrónico no es válido.');
        if (!datos.diasVisita.length) throw new Error('Se debe indicar al menos un día de visita del preventista.');
        if (datos.limiteCredito < 0) throw new Error('El límite de crédito no puede ser negativo.');
        if (datos.cuit) { const otro = App.db.clientes.find(x => x.cuit === datos.cuit && (!c || x.id !== c.id)); if (otro) throw new Error('Ya hay un cliente con ese CUIT: ' + otro.fantasia + ' (' + otro.codigo + ').'); }
        let res;
        if (nuevo) {
          const max = App.db.clientes.reduce((m, x) => Math.max(m, Number(String(x.codigo).replace(/\D/g, '')) || 0), 100);
          res = App.acciones.guardarMaestro('clientes', Object.assign(datos, { codigo: 'CL-' + (max + 1), comportamiento: 'buena', tamano: 1, activo: true }));
          U.toast('Cliente creado: ' + res.fantasia + ' (' + res.codigo + ')', 'ok');
          setTimeout(() => U.ir('#/clientes/' + res.id), 0);
        } else {
          datos.id = c.id; datos.activo = !!v.activo;
          res = App.acciones.guardarMaestro('clientes', datos);
          U.toast('Cambios guardados: ' + res.fantasia, 'ok');
        }
      } }] });
  }

  // ---------- lista ----------
  let filtro = 'todos', texto = '', zona = '';
  function vistaLista(el) {
    const sit = situaciones();
    const clientes = App.db.clientes;
    const activos = clientes.filter(c => c.activo !== false);
    const totSaldo = r2(activos.reduce((s, c) => s + sit[c.id].saldo, 0)), totVenc = r2(activos.reduce((s, c) => s + sit[c.id].vencido, 0));
    const excedidos = activos.filter(c => sit[c.id].saldo > c.limiteCredito).length;
    const morosos = activos.filter(c => sit[c.id].atraso > 60).length;
    const zonas = [...new Set(App.db.preventistas.map(p => p.zona))];
    el.innerHTML = h`<div class="encabezado-vista"><div><h1 class="titulo-vista">Clientes</h1>
      <p class="bajada">Almacenes, autoservicios, kioscos y supermercados de Villa María y la región. Cada ficha incluye la cuenta corriente y el resumen de cuenta del cliente.</p></div>
      <div class="acciones"><button type="button" class="btn btn-primario" data-nuevo>Nuevo cliente</button></div></div>
      ${U.franjaKpi([
        { titulo: 'Clientes activos', valor: U.num(activos.length), detalle: zonas.length + ' zonas de preventa' },
        { titulo: 'Deudores por ventas', valor: U.pesosCorto(totSaldo), detalle: 'saldo en cuenta corriente' },
        { titulo: 'Vencido', valor: U.pesosCorto(totVenc), detalle: totSaldo ? U.porcentaje(totVenc / totSaldo, 0) + ' del saldo' : '', tono: totVenc ? 'peligro' : 'ok' },
        { titulo: 'Límite de crédito excedido', valor: U.num(excedidos), detalle: 'nuevos pedidos sujetos a autorización', tono: excedidos ? 'alerta' : 'ok' },
        { titulo: 'Con más de 60 días de atraso', valor: U.num(morosos), detalle: 'gestión de cobranza prioritaria', tono: morosos ? 'peligro' : 'ok' }
      ])}
      <div class="seccion"><div class="filtros">
        <input type="search" placeholder="Buscar por nombre, razón social, CUIT o código" aria-label="Buscar clientes" value="${texto}">
        <select aria-label="Zona"><option value="">Todas las zonas</option>${zonas.map(z => h`<option${z === zona ? U.seguro(' selected') : ''}>${z}</option>`)}</select>
        <div class="segmentado" role="group" aria-label="Situación">
          <button type="button" data-f="todos" aria-pressed="${filtro === 'todos'}">Todos</button>
          <button type="button" data-f="vencido" aria-pressed="${filtro === 'vencido'}">Con vencido</button>
          <button type="button" data-f="excedido" aria-pressed="${filtro === 'excedido'}">Límite excedido</button>
          <button type="button" data-f="inactivos" aria-pressed="${filtro === 'inactivos'}">Inactivos</button></div>
      </div><div data-tabla></div></div>`;
    el.querySelector('[data-nuevo]').addEventListener('click', () => formCliente(null));
    const filas = () => {
      const t = U.normalizar(texto).trim();
      return clientes.filter(c => (filtro === 'inactivos' ? c.activo === false : c.activo !== false) &&
        (filtro !== 'vencido' || sit[c.id].vencido > 0.01) && (filtro !== 'excedido' || sit[c.id].saldo > c.limiteCredito) &&
        (!zona || c.zona === zona) && U.coincide(t, c.fantasia, c.razonSocial, c.cuit, c.codigo, c.localidad));
    };
    const caja = el.querySelector('[data-tabla]');
    function dibujar() {
      const f = filas();
      caja.innerHTML = '';
      caja.appendChild(U.tabla({
        filas: f,
        columnas: [
          { titulo: 'Código', clase: 'ocultar-celu', campo: 'codigo' },
          { titulo: 'Cliente', ordenar: c => c.fantasia, valor: c => h`<span class="celda-principal">${c.fantasia}</span><span class="celda-sub">${c.razonSocial}, ${c.localidad}</span>` },
          { titulo: 'Zona y preventista', clase: 'ocultar-celu', ordenar: c => c.zona, valor: c => h`${c.zona}<span class="celda-sub">${preventista(c.preventistaId).nombre || ''}, lista ${lista(c.listaId).nombre}</span>` },
          { titulo: 'IVA', clase: 'ocultar-celu', ordenar: c => c.condicionIVA, valor: c => c.condicionIVA },
          { titulo: 'Saldo', alinear: 'der', ordenar: c => sit[c.id].saldo, valor: c => U.pesos(sit[c.id].saldo) },
          { titulo: 'Vencido', clase: 'ocultar-celu', alinear: 'der', ordenar: c => sit[c.id].vencido, valor: c => sit[c.id].vencido > 0.01 ? h`<span style="color:var(--peligro);font-weight:600">${U.pesos(sit[c.id].vencido)}</span><span class="celda-sub">${sit[c.id].atraso} ${sit[c.id].atraso === 1 ? 'día' : 'días'} de atraso</span>` : h`<span class="texto-2">—</span>` },
          { titulo: 'Uso del límite', clase: 'ocultar-celu', alinear: 'der', ordenar: c => c.limiteCredito ? sit[c.id].saldo / c.limiteCredito : 0, valor: c => h`${usoLimite(c, sit[c.id])}<span class="celda-sub">de ${U.pesosCorto(c.limiteCredito)}</span>` },
          { titulo: 'Estado', ordenar: c => estadoCliente(c, sit[c.id])[0], valor: c => { const e = estadoCliente(c, sit[c.id]); return U.chip(e[0], e[1]); } }
        ],
        filaClase: c => { const e = estadoCliente(c, sit[c.id])[1]; return e === 'peligro' ? 'fila-peligro' : e === 'alerta' ? 'fila-alerta' : c.activo === false ? 'fila-apagada' : ''; },
        pie: ['', f.length + (f.length === 1 ? ' cliente' : ' clientes'), '', '', U.pesos(f.reduce((s, c) => s + sit[c.id].saldo, 0)), U.pesos(f.reduce((s, c) => s + sit[c.id].vencido, 0)), '', ''],
        alClic: c => U.ir('#/clientes/' + c.id),
        vacio: filtro === 'inactivos' ? 'No hay clientes inactivos.' : 'No hay clientes que coincidan con el filtro.'
      }));
    }
    dibujar();
    U.buscador(el.querySelector('input[type="search"]'), (t, crudo) => { texto = crudo; dibujar(); });
    el.querySelector('select').addEventListener('change', e => { zona = e.target.value; dibujar(); });
    el.querySelectorAll('[data-f]').forEach(b => b.addEventListener('click', () => {
      filtro = b.dataset.f; el.querySelectorAll('[data-f]').forEach(x => x.setAttribute('aria-pressed', x === b)); dibujar();
    }));
  }

  // ---------- resumen de cuenta (texto e impresión) ----------
  function textoResumen(c, s) {
    const pend = App.q.pendientesCliente(c.id);
    const hoy = App.hoy();
    const lineas = pend.slice(0, 12).map(f => '- ' + f.tipo + ' ' + f.nro + ' del ' + U.fecha(f.fecha) + ': ' + U.pesos(App.q.saldoComprobante(f)) + (f.vence < hoy ? ' (vencida el ' + U.fecha(f.vence) + ')' : ' (vence el ' + U.fecha(f.vence) + ')'));
    const cfg = App.config;
    return 'Buen día, ' + c.fantasia + '. A continuación se detalla el resumen de cuenta corriente con ' + cfg.negocio + ' al ' + U.fecha(hoy) + '.\n\n' +
      'Saldo total: ' + U.pesos(s.saldo) + '\n' + (s.vencido > 0.01 ? 'Saldo vencido: ' + U.pesos(s.vencido) + '\n' : 'No registra saldo vencido.\n') +
      (lineas.length ? '\nFacturas pendientes:\n' + lineas.join('\n') + (pend.length > 12 ? '\n- y ' + (pend.length - 12) + ' más' : '') + '\n' : '') +
      '\nMedios de pago: efectivo al chofer, transferencia bancaria o eCheq a nombre de ' + cfg.razonSocial + ' (CUIT ' + cfg.cuit + '). ' +
      'Si el pago ya fue realizado, se solicita informarlo para su imputación.\n\n' + (preventista(c.preventistaId).nombre ? 'Saludos cordiales, ' + preventista(c.preventistaId).nombre + ' (' + cfg.negocio + ')' : 'Saludos cordiales, ' + cfg.negocio);
  }
  function mandarWhatsApp(c, s) {
    const cuerpo = nodo(h`<div class="cli-wa">
      <div class="campo"><label for="cli-wa-texto">Mensaje</label><textarea id="cli-wa-texto">${textoResumen(c, s)}</textarea>
      <span class="campo-ayuda">El texto puede modificarse antes del envío. Se abre WhatsApp con el mensaje listo para seleccionar el contacto; en la versión definitiva se envía directamente al teléfono del cliente.</span></div></div>`);
    U.modal({ titulo: 'Resumen de cuenta por WhatsApp', cuerpo, ancho: 620, acciones: [
      { texto: 'Copiar texto', tipo: 'secundario', alClic: ({ cuerpo: b }) => {
        const t = b.querySelector('textarea').value;
        try { navigator.clipboard.writeText(t).then(() => U.toast('Texto copiado', 'ok'), () => U.toast('No se pudo copiar el texto. Puede seleccionarse y copiarse manualmente.', 'alerta')); }
        catch (e) { U.toast('No se pudo copiar el texto. Puede seleccionarse y copiarse manualmente.', 'alerta'); }
        return false;
      } },
      { texto: 'Abrir WhatsApp', tipo: 'primario', alClic: ({ cuerpo: b }) => {
        const url = 'https://wa.me/?text=' + encodeURIComponent(b.querySelector('textarea').value);
        window.open(url, '_blank', 'noopener');
        U.toast('Resumen preparado en WhatsApp: ' + c.fantasia, 'ok');
      } }] });
  }
  function imprimirResumen(c, s) {
    const hoy = App.hoy(), cfg = App.config;
    const pend = App.q.pendientesCliente(c.id);
    const desde = F.sumar(hoy, -90);
    const movs = App.q.ctaCteCliente(c.id).filter(m => m.fecha >= desde);
    const anterior = (() => { const a = App.q.ctaCteCliente(c.id).filter(m => m.fecha < desde); return a.length ? a[a.length - 1].saldo : 0; })();
    const css = `<style>.rsc{font-family:Archivo,Arial,sans-serif;color:#000;font-size:9.5pt}.rsc h1{font-size:18pt;font-weight:800;font-stretch:125%;margin:0}
      .rsc-cab{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #000;padding-bottom:3mm;margin-bottom:4mm}
      .rsc table{width:100%;border-collapse:collapse;margin-top:2mm}.rsc th,.rsc td{border-bottom:1px solid #999;padding:1.4mm 1.6mm;text-align:left}
      .rsc th{font-size:8pt;background:#eee}.rsc .n{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
      .rsc h2{font-size:11pt;margin:6mm 0 1mm}.rsc-tot{display:flex;gap:10mm;margin-top:3mm}.rsc-tot strong{display:block;font-size:13pt}
      .rsc small{color:#444}</style>`;
    U.imprimir(h`${U.seguro(css)}<div class="rsc">
      <div class="rsc-cab"><div><strong>${cfg.razonSocial}</strong><br>${cfg.domicilio}<br>CUIT ${cfg.cuit}</div><div style="text-align:right"><h1>Resumen de cuenta</h1>al ${U.fecha(hoy)}</div></div>
      <div><strong>${c.razonSocial}</strong> (${c.fantasia}), ${c.codigo}<br>CUIT ${c.cuit || '—'}, ${COND[c.condicionIVA]}<br>${c.direccion}, ${c.localidad}</div>
      <div class="rsc-tot"><div>Saldo<strong>${U.pesos(s.saldo)}</strong></div><div>Vencido<strong>${U.pesos(s.vencido)}</strong></div><div>Condición<strong>${c.plazo ? c.plazo + ' días' : 'Contado'}</strong></div></div>
      <h2>Facturas pendientes</h2>
      <table><thead><tr><th>Comprobante</th><th>Fecha</th><th>Vence</th><th class="n">Total</th><th class="n">Saldo</th></tr></thead><tbody>
      ${pend.map(f => h`<tr><td>${f.tipo} ${f.nro}</td><td>${U.fecha(f.fecha)}</td><td>${U.fecha(f.vence)}${f.vence < hoy ? h` <small>vencida</small>` : ''}</td><td class="n">${U.pesos(f.total)}</td><td class="n">${U.pesos(App.q.saldoComprobante(f))}</td></tr>`)}
      </tbody></table>
      <h2>Movimientos de los últimos 90 días</h2>
      <table><thead><tr><th>Fecha</th><th>Comprobante</th><th class="n">Debe</th><th class="n">Haber</th><th class="n">Saldo</th></tr></thead><tbody>
      <tr><td>${U.fecha(desde)}</td><td>Saldo anterior</td><td></td><td></td><td class="n">${U.pesos(anterior)}</td></tr>
      ${movs.map(m => h`<tr><td>${U.fecha(m.fecha)}</td><td>${m.comprobante}</td><td class="n">${m.debe ? U.pesos(m.debe) : ''}</td><td class="n">${m.haber ? U.pesos(m.haber) : ''}</td><td class="n">${U.pesos(m.saldo)}</td></tr>`)}
      </tbody></table></div>`, { titulo: 'Resumen de cuenta ' + c.fantasia });
  }

  // ---------- ficha ----------
  let periodoCta = '60';
  function rutaDe(m) {
    if (m.tipo === 'RC') return '#/cobranzas/recibo/' + m.refId;
    if (['FA', 'FB', 'NCA', 'NCB'].includes(m.tipo)) return '#/facturacion/comprobante/' + m.refId;
    return null;
  }
  function vistaFicha(el, id) {
    const c = App.get('clientes', id);
    if (!c) {
      el.innerHTML = h`<div class="vacio vacio-grande"><h1 class="titulo-vista">No se encontró el cliente</h1><p>El enlace puede ser incorrecto.</p><a class="btn btn-primario" href="#/clientes">Volver a Clientes</a></div>`;
      return;
    }
    const s = situaciones()[c.id];
    const est = estadoCliente(c, s);
    const hoy = App.hoy(), mes = F.mes(hoy);
    const pedidos = App.db.pedidos.filter(p => p.clienteId === c.id).sort((a, b) => b.fecha < a.fecha ? -1 : b.fecha > a.fecha ? 1 : b.numero - a.numero);
    const facturas = App.db.comprobantes.filter(f => f.clienteId === c.id && f.clase === 'factura');
    const ultima = facturas.reduce((m, f) => f.fecha > m ? f.fecha : m, '');
    const compraMes = r2(facturas.filter(f => F.mes(f.fecha) === mes).reduce((x, f) => x + f.total, 0));
    const pend = App.q.pendientesCliente(c.id);
    const disponible = r2(c.limiteCredito - s.saldo);
    const pv = preventista(c.preventistaId);
    const totalTramos = s.t1 + s.t2 + s.t3 + s.t4;
    el.innerHTML = h`<nav class="migas" aria-label="Ubicación"><a href="#/clientes">Clientes</a> › ${c.fantasia}</nav>
      <div class="encabezado-vista"><div><div class="cli-titulo"><h1 class="titulo-vista">${c.fantasia}</h1>${U.chip(est[0], est[1])}</div>
        <p class="bajada">${c.razonSocial}, CUIT ${c.cuit || 'sin CUIT'} (${COND[c.condicionIVA]}). ${c.direccion}, ${c.localidad}. Código ${c.codigo}.</p></div>
        <div class="acciones"><button type="button" class="btn btn-secundario" data-editar>Editar datos</button><button type="button" class="btn btn-secundario" data-imprimir>Imprimir resumen</button>
          <a class="btn btn-secundario" href="#/cobranzas/nuevo/${c.id}">Registrar cobranza</a><button type="button" class="btn btn-primario" data-wa>Enviar resumen por WhatsApp</button></div></div>
      ${U.franjaKpi([
        { titulo: 'Saldo', valor: U.pesosCorto(s.saldo), detalle: pend.length + (pend.length === 1 ? ' factura pendiente' : ' facturas pendientes') },
        { titulo: 'Vencido', valor: U.pesosCorto(s.vencido), detalle: s.vencido > 0.01 ? 'mayor atraso: ' + s.atraso + ' días' : 'sin saldo vencido', tono: s.vencido > 0.01 ? 'peligro' : 'ok' },
        { titulo: 'Crédito disponible', valor: U.pesosCorto(disponible), detalle: 'límite ' + U.pesos(c.limiteCredito), tono: disponible < 0 ? 'peligro' : disponible < c.limiteCredito * 0.2 ? 'alerta' : '' },
        { titulo: 'Condición de venta', valor: c.plazo ? c.plazo + ' días' : 'Contado', detalle: 'medio de pago: ' + (c.medioPreferido === 'echeq' ? 'eCheq' : (MEDIOS[c.medioPreferido] || '—').toLowerCase()) },
        { titulo: 'Compras de ' + F.nombreMes(hoy).split(' ')[0], valor: U.pesosCorto(compraMes), detalle: ultima ? 'última factura ' + U.fecha(ultima) : 'sin compras' }
      ])}
      <section class="seccion"><h2 class="seccion-titulo">Antigüedad de la deuda <span class="texto-2">días desde la fecha de cada factura con saldo</span></h2>
        <div class="panel cli-antiguedad">${totalTramos > 0.01 ? h`
          <div class="cli-pila" role="img" aria-label="${TRAMOS.map(([k, t]) => t + ': ' + U.pesos(s[k])).join('; ')}">${TRAMOS.map(([k]) => s[k] > 0 ? h`<span class="cli-${k}" style="flex:${(s[k] / totalTramos).toFixed(4)} 1 0"></span>` : '')}</div>
          <div class="cli-tramos">${TRAMOS.map(([k, t]) => h`<div><span><i class="cli-${k}"></i>${t}</span><strong>${U.pesos(s[k])}</strong><em>${U.porcentaje(s[k] / totalTramos, 0)}</em></div>`)}</div>`
          : h`<p class="texto-2">Sin deuda: todas las facturas se encuentran cobradas.</p>`}</div></section>
      <div class="seccion cli-pestanas"></div>`;
    el.querySelector('[data-editar]').addEventListener('click', () => formCliente(c));
    el.querySelector('[data-wa]').addEventListener('click', () => mandarWhatsApp(c, s));
    el.querySelector('[data-imprimir]').addEventListener('click', () => imprimirResumen(c, s));

    U.pestanas(el.querySelector('.cli-pestanas'), [
      { id: 'cta', titulo: 'Cuenta corriente', render: panel => {
        const seg = nodo(h`<div class="filtros"><div class="segmentado" role="group" aria-label="Período"><button type="button" data-p="60" aria-pressed="${periodoCta === '60'}">Últimos 60 días</button><button type="button" data-p="todo" aria-pressed="${periodoCta === 'todo'}">Todo</button></div>
          <span class="nota-discreta">El saldo acumulado se calcula desde el primer movimiento. Orden: del más reciente al más antiguo.</span></div>`);
        panel.appendChild(seg);
        const movs = App.q.ctaCteCliente(c.id);
        const filas = () => (periodoCta === '60' ? movs.filter(m => m.fecha >= F.sumar(hoy, -60)) : movs).slice().reverse();
        const tabla = U.tabla({
          filas: filas(), limite: 25,
          columnas: [
            { titulo: 'Fecha', clase: 'ocultar-celu', campo: 'fecha', valor: m => U.fecha(m.fecha) },
            { titulo: 'Comprobante', valor: m => h`<span class="celda-principal">${m.comprobante}</span>${m.detalle ? h`<span class="celda-sub">${m.detalle}</span>` : ''}` },
            { titulo: 'Debe', alinear: 'der', campo: 'debe', valor: m => m.debe ? U.pesos(m.debe) : '' },
            { titulo: 'Haber', alinear: 'der', campo: 'haber', valor: m => m.haber ? U.pesos(m.haber) : '' },
            { titulo: 'Saldo', alinear: 'der', valor: m => h`<strong>${U.pesos(m.saldo)}</strong>` }
          ],
          alClic: m => { const r = rutaDe(m); if (r) U.ir(r); },
          vacio: 'El cliente no registra movimientos.'
        });
        panel.appendChild(tabla);
        seg.querySelectorAll('[data-p]').forEach(b => b.addEventListener('click', () => { periodoCta = b.dataset.p; seg.querySelectorAll('[data-p]').forEach(x => x.setAttribute('aria-pressed', x === b)); tabla.actualizar(filas()); }));
      } },
      { id: 'pendientes', titulo: 'Facturas pendientes', cuenta: pend.length, render: panel => {
        panel.appendChild(U.tabla({
          filas: pend,
          columnas: [
            { titulo: 'Comprobante', valor: f => h`<span class="celda-principal">${f.tipo} ${f.nro}</span>` },
            { titulo: 'Fecha', clase: 'ocultar-celu', campo: 'fecha', valor: f => U.fecha(f.fecha) },
            { titulo: 'Vence', campo: 'vence', valor: f => f.vence < hoy ? h`${U.fecha(f.vence)}<span class="celda-sub" style="color:var(--peligro)">hace ${F.diferencia(f.vence, hoy)} días</span>` : U.fecha(f.vence) },
            { titulo: 'Total', alinear: 'der', campo: 'total', valor: f => U.pesos(f.total) },
            { titulo: 'Cobrado o acreditado', clase: 'ocultar-celu', alinear: 'der', valor: f => U.pesos(f.cobrado + f.acreditado) },
            { titulo: 'Saldo', alinear: 'der', ordenar: f => App.q.saldoComprobante(f), valor: f => h`<strong>${U.pesos(App.q.saldoComprobante(f))}</strong>` }
          ],
          pie: ['Total', '', '', '', '', U.pesos(pend.reduce((x, f) => x + App.q.saldoComprobante(f), 0))],
          filaClase: f => f.vence < hoy ? 'fila-peligro' : '',
          alClic: f => U.ir('#/facturacion/comprobante/' + f.id),
          vacio: 'Sin facturas pendientes.'
        }));
      } },
      { id: 'pedidos', titulo: 'Pedidos', cuenta: pedidos.filter(p => p.estado === 'pendiente').length || null, render: panel => {
        panel.appendChild(U.tabla({
          filas: pedidos, limite: 30,
          columnas: [
            { titulo: 'Pedido', campo: 'numero', valor: p => h`<span class="celda-principal">${p.nro}</span>` },
            { titulo: 'Fecha', clase: 'ocultar-celu', campo: 'fecha', valor: p => U.fecha(p.fecha) },
            { titulo: 'Origen', clase: 'ocultar-celu', campo: 'origen', valor: p => ({ preventa: 'Preventa', catalogo: 'Catálogo online', mostrador: 'Mostrador' })[p.origen] || p.origen },
            { titulo: 'Productos', clase: 'ocultar-celu', alinear: 'der', valor: p => U.num(p.items.length) },
            { titulo: 'Total', alinear: 'der', campo: 'total', valor: p => U.pesos(p.total) },
            { titulo: 'Estado', valor: p => U.estado(p.estado) }
          ],
          filaClase: p => p.estado === 'pendiente' ? 'fila-alerta' : p.estado === 'cancelado' ? 'fila-apagada' : '',
          alClic: p => U.ir('#/ventas/pedido/' + p.id),
          vacio: 'El cliente no registra pedidos.'
        }));
      } },
      { id: 'precios', titulo: 'Lista de precios', render: panel => {
        const l = lista(c.listaId);
        const cab = nodo(h`<div class="filtros fila separar"><span><strong>Lista ${l.nombre}</strong> <span class="texto-2">${l.detalle || ''}${l.recargo != null ? ', ' + U.num(l.recargo * 100, 1) + ' % sobre el costo' : ''}</span></span>
          <input type="search" placeholder="Buscar producto" aria-label="Buscar en la lista de precios"></div>`);
        panel.appendChild(cab);
        const prods = App.db.productos.filter(p => p.activo !== false);
        const tabla = U.tabla({
          filas: prods, limite: 40,
          columnas: [
            { titulo: 'Código', clase: 'ocultar-celu', campo: 'codigo' },
            { titulo: 'Producto', ordenar: p => p.descripcion, valor: p => h`<span class="celda-principal">${p.descripcion}</span><span class="celda-sub">${p.marca}, ${p.unidad}</span>` },
            { titulo: 'Rubro', clase: 'ocultar-celu', campo: 'rubro' },
            { titulo: 'Precio neto', alinear: 'der', ordenar: p => App.q.precio(p.id, c.listaId), valor: p => U.pesos(App.q.precio(p.id, c.listaId)) },
            { titulo: 'IVA', clase: 'ocultar-celu', alinear: 'der', campo: 'iva', valor: p => U.num(p.iva, 1) + ' %' },
            { titulo: c.condicionIVA === 'RI' ? 'Con IVA' : 'Precio final', alinear: 'der', ordenar: p => App.q.precioConIVA(p.id, c.listaId), valor: p => h`<strong>${U.pesos(App.q.precioConIVA(p.id, c.listaId))}</strong>` }
          ],
          vacio: 'No hay productos que coincidan con la búsqueda.'
        });
        panel.appendChild(tabla);
        U.buscador(cab.querySelector('input'), t => tabla.actualizar(prods.filter(p => U.coincide(t, p.descripcion, p.codigo, p.marca, p.rubro, p.ean))));
      } },
      { id: 'datos', titulo: 'Datos', render: panel => {
        panel.appendChild(nodo(h`<div class="grilla-2">
          <div class="panel"><h3 class="panel-titulo">Fiscales y de contacto</h3><dl class="datos">
            <dt>Razón social</dt><dd>${c.razonSocial}</dd><dt>CUIT</dt><dd>${c.cuit || '—'}</dd><dt>IVA</dt><dd>${COND[c.condicionIVA]} (factura ${c.condicionIVA === 'RI' ? 'A' : 'B'})</dd>
            <dt>Tipo</dt><dd>${c.tipo}</dd><dt>Dirección</dt><dd>${c.direccion}, ${c.localidad}</dd><dt>Teléfono</dt><dd>${c.telefono || '—'}</dd><dt>Correo</dt><dd>${c.email || '—'}</dd></dl></div>
          <div class="panel"><h3 class="panel-titulo">Comerciales</h3><dl class="datos">
            <dt>Preventista</dt><dd>${pv.nombre || '—'}${pv.telefono ? ', ' + pv.telefono : ''}</dd><dt>Zona</dt><dd>${c.zona}</dd>
            <dt>Días de visita</dt><dd><span class="cli-dias">${DIAS.map(([k, t]) => h`<span class="${(c.diasVisita || []).includes(k) ? 'on' : ''}">${t}</span>`)}</span></dd>
            <dt>Depósito</dt><dd>${(App.get('depositos', c.depositoId) || {}).nombre || '—'}</dd><dt>Lista de precios</dt><dd>${lista(c.listaId).nombre}</dd>
            <dt>Límite de crédito</dt><dd>${U.pesos(c.limiteCredito)}</dd><dt>Condición de venta</dt><dd>${c.plazo ? 'Cuenta corriente a ' + c.plazo + ' días' : 'Contado'}</dd>
            <dt>Medio de pago</dt><dd>${MEDIOS[c.medioPreferido] || '—'}</dd><dt>Estado</dt><dd>${c.activo === false ? 'Inactivo' : 'Activo'}</dd></dl></div></div>`));
      } }
    ], { clave: 'clientes-ficha' });
  }

  App.modulo({
    id: 'clientes',
    titulo: 'Clientes',
    grupo: 'Comercial',
    orden: 40,
    icono: '<svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="7.5" cy="7" r="2.8"/><path d="M2.5 16.5c.6-2.8 2.6-4.3 5-4.3s4.4 1.5 5 4.3"/><path d="M13 4.5a2.6 2.6 0 0 1 0 5M15 12.5c1.3.6 2.1 1.9 2.5 4"/></svg>',
    render(el, params) {
      estilos();
      if (params[0]) vistaFicha(el, params[0]);
      else vistaLista(el);
    }
  });
})();
