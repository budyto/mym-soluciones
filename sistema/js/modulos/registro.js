/* Módulo «Registro de cambios» (sólo el dueño).
   Todo lo que se hizo en el sistema, con la hora del servidor, quién lo hizo y el detalle. Sale de los mismos
   movimientos guardados en Firestore (empresas/{id}/acciones), que no se pueden editar ni borrar.
   La segunda pestaña muestra las invitaciones y los cambios de permisos (empresas/{id}/auditoria). */
(function () {
  'use strict';
  const ui = App.ui, h = ui.h;
  const filtro = { usuario: '', desde: '', hasta: '', texto: '' };
  let auditoria = null, cargandoAud = false;

  const hora = ms => { if (!ms) return ''; const d = new Date(ms - 3 * 3600000); return d.toISOString().slice(11, 16); };
  const dia = ms => ms ? new Date(ms - 3 * 3600000).toISOString().slice(0, 10) : '';

  function movimientos() {
    const t = ui.normalizar(filtro.texto);
    return App.registro().slice().reverse().filter(r =>
      (!filtro.usuario || r.uid === filtro.usuario) &&
      (!filtro.desde || dia(r.creado) >= filtro.desde) &&
      (!filtro.hasta || dia(r.creado) <= filtro.hasta) &&
      (!t || ui.normalizar((r.detalle || '') + ' ' + (r.usuario || '') + ' ' + App.nombreAccion(r.a)).includes(t)));
  }

  function tabMovimientos(panel) {
    const usuarios = {};
    App.registro().forEach(r => { if (r.uid) usuarios[r.uid] = r.usuario || r.uid; });
    const form = ui.nodo(String(h`<div class="filtros" style="display:flex;flex-wrap:wrap;gap:12px;align-items:end;margin-bottom:14px">
      <div class="campo"><label for="rg-usuario">Usuario</label><select id="rg-usuario"><option value="">Todos</option>${ui.seguro(Object.keys(usuarios).map(u => '<option value="' + ui.escapar(u) + '"' + (u === filtro.usuario ? ' selected' : '') + '>' + ui.escapar(usuarios[u]) + '</option>').join(''))}</select></div>
      <div class="campo"><label for="rg-desde">Desde</label><input id="rg-desde" type="date" value="${filtro.desde}"></div>
      <div class="campo"><label for="rg-hasta">Hasta</label><input id="rg-hasta" type="date" value="${filtro.hasta}"></div>
      <div class="campo" style="flex:1;min-width:200px"><label for="rg-texto">Buscar</label><input id="rg-texto" type="search" placeholder="Cliente, pedido, producto…" value="${filtro.texto}"></div>
      <button type="button" class="btn btn-secundario" data-csv>Descargar en Excel (CSV)</button></div>`));
    panel.appendChild(form);
    const cont = document.createElement('div');
    panel.appendChild(cont);
    let tabla = null;
    const dibujar = () => {
      const filas = movimientos();
      if (!tabla) {
        tabla = ui.tabla({
          filas, limite: 200,
          vacio: App.registro().length ? 'No hay movimientos con esos filtros.' : 'Todavía no se hizo ningún movimiento. Cuando alguien cargue un pedido, un producto o un cobro, aparece acá.',
          columnas: [
            { titulo: 'Fecha y hora', ordenar: r => r.creado || 0, valor: r => h`<span class="celda-principal">${r.creado ? ui.fecha(dia(r.creado)) : ''}</span><span class="celda-sub">${hora(r.creado)}${r.f && r.creado && r.f !== dia(r.creado) ? ', con fecha ' + ui.fecha(r.f) : ''}</span>` },
            { titulo: 'Usuario', campo: 'usuario', valor: r => r.usuario || '' },
            { titulo: 'Detalle', valor: r => h`<span>${r.detalle || App.nombreAccion(r.a)}</span>` },
            { titulo: 'Estado', clase: 'ocultar-celu', valor: r => r.pendiente ? ui.chip('Por subir', 'alerta') : ui.chip('Guardado', 'ok') }
          ]
        });
        cont.appendChild(tabla);
      } else tabla.actualizar(filas);
    };
    form.querySelector('#rg-usuario').addEventListener('change', e => { filtro.usuario = e.target.value; dibujar(); });
    form.querySelector('#rg-desde').addEventListener('change', e => { filtro.desde = e.target.value; dibujar(); });
    form.querySelector('#rg-hasta').addEventListener('change', e => { filtro.hasta = e.target.value; dibujar(); });
    ui.buscador(form.querySelector('#rg-texto'), v => { filtro.texto = typeof v === 'string' ? v : form.querySelector('#rg-texto').value; dibujar(); }, 150);
    form.querySelector('[data-csv]').addEventListener('click', () => {
      ui.descargarCSV('registro-de-cambios-' + App.hoy() + '.csv', ['Fecha', 'Hora', 'Usuario', 'Detalle', 'Fecha del movimiento', 'Número'],
        movimientos().map(r => [r.creado ? ui.fecha(dia(r.creado)) : '', hora(r.creado), r.usuario || '', r.detalle || App.nombreAccion(r.a), r.f ? ui.fecha(r.f) : '', r.n || '']));
    });
    dibujar();
  }

  function cargarAuditoria() {
    if (cargandoAud) return;
    cargandoAud = true;
    const { fs, sesion } = App.nube;
    fs.collection('empresas/' + sesion.eid + '/auditoria').orderBy('creado', 'desc').limit(300).get()
      .then(s => { auditoria = s.docs.map(d => { const x = d.data({ serverTimestamps: 'estimate' }); return { detalle: x.detalle, usuario: x.usuario, creado: x.creado ? x.creado.toMillis() : null }; }); })
      .catch(e => { auditoria = []; ui.toast('No se pudo traer la auditoría: ' + e.message, 'peligro'); })
      .finally(() => { cargandoAud = false; if (App.ruta().id === 'registro') App.renderizar(); });
  }

  function tabUsuarios(panel) {
    if (auditoria === null) { cargarAuditoria(); panel.appendChild(ui.nodo('<div class="vacio">Cargando…</div>')); return; }
    panel.appendChild(ui.tabla({
      filas: auditoria, limite: 300,
      vacio: 'Todavía no hay invitaciones ni cambios de permisos.',
      columnas: [
        { titulo: 'Fecha y hora', valor: r => h`<span class="celda-principal">${r.creado ? ui.fecha(dia(r.creado)) : ''}</span><span class="celda-sub">${hora(r.creado)}</span>` },
        { titulo: 'Usuario', valor: r => r.usuario || '' },
        { titulo: 'Detalle', valor: r => r.detalle || '' }
      ]
    }));
  }

  function render(el) {
    const n = App.registro().length;
    el.appendChild(ui.nodo(String(h`<div class="encabezado-vista"><div><h1 class="titulo-vista">Registro de cambios</h1>
      <p class="bajada">Todo lo que se hizo en el sistema, con la hora, quién lo hizo y el detalle. Nadie puede borrarlo ni cambiarlo.</p></div></div>`)));
    ui.pestanas(el, [
      { id: 'movimientos', titulo: 'Movimientos', cuenta: n, render: tabMovimientos },
      { id: 'usuarios', titulo: 'Usuarios y permisos', render: tabUsuarios }
    ]);
  }

  App.modulo({
    id: 'registro',
    titulo: 'Registro de cambios',
    grupo: 'Administración',
    orden: 91,
    icono: '<svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 2.5h7l3.5 3.5v11.5h-10.5z"/><path d="M12 2.5V6h3.5M8 10h5M8 13h5M8 7h2"/></svg>',
    render(el) { render(el); }
  });
})();
