/* Módulo «Usuarios» (sólo el dueño).
   El dueño invita a cada persona con su mail, le pone un puesto y marca qué pantallas ve y qué acciones puede hacer.
   La persona entra a mymsoluciones.online/sistema/ con ese mail (con contraseña o con Google) y queda adentro.
   Usuarios sin límite. Cada invitación, cambio de permisos o baja queda en empresas/{id}/auditoria. */
(function () {
  'use strict';
  const ui = App.ui, h = ui.h;
  const N = () => App.nube;
  let miembros = null, invitaciones = null, cargando = false, error = '', intentado = false;

  function estilos() {
    if (document.getElementById('us-estilos')) return;
    const st = document.createElement('style');
    st.id = 'us-estilos';
    st.textContent = `
.us-permisos { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px 24px; margin-top: 16px; }
.us-permisos fieldset { border: 1px solid var(--linea); border-radius: var(--r-panel); padding: 12px 14px 14px; margin: 0; min-width: 0; }
.us-permisos legend { font-weight: 700; font-size: var(--fs-14); padding: 0 6px; }
.us-check { display: flex; gap: 9px; align-items: flex-start; padding: 6px 0; font-size: var(--fs-14); cursor: pointer; }
.us-check input { margin-top: 3px; width: 16px; height: 16px; accent-color: var(--tinta); flex: none; }
.us-check small { display: block; color: var(--texto-2); font-size: var(--fs-12); }
.us-datos { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px 16px; }
.us-aviso { background: var(--info-suave); color: var(--tinta); border-radius: var(--r-control); padding: 12px 14px; font-size: var(--fs-14); margin-top: 16px; }
.us-aviso a { color: var(--info); font-weight: 600; }
@media (max-width: 760px) { .us-permisos, .us-datos { grid-template-columns: minmax(0, 1fr); } }`;
    document.head.appendChild(st);
  }

  async function cargar() {
    if (cargando) return;
    cargando = true; error = ''; intentado = true;
    const { fs, sesion } = N();
    try {
      const [m, i] = await Promise.all([
        fs.collection('empresas/' + sesion.eid + '/miembros').get(),
        fs.collection('invitaciones').where('empresaId', '==', sesion.eid).get()
      ]);
      miembros = m.docs.map(d => d.data()).sort((a, b) => (a.rol === 'dueno' ? -1 : 0) - (b.rol === 'dueno' ? -1 : 0) || String(a.nombre).localeCompare(b.nombre));
      invitaciones = i.docs.map(d => Object.assign({ email: d.id }, d.data()));
    } catch (e) { error = e.code === 'unavailable' ? 'Sin conexión: la lista de usuarios se ve cuando vuelva internet.' : e.message; }
    cargando = false;
    if (App.ruta().id === 'usuarios') App.renderizar();
  }

  function auditar(texto, extra) {
    const { fs, sesion, ahoraServidor } = N();
    return fs.collection('empresas/' + sesion.eid + '/auditoria').add(Object.assign({
      uid: sesion.user.uid, usuario: sesion.miembro.nombre, detalle: texto, creado: ahoraServidor()
    }, extra || {})).catch(e => console.warn('No se pudo anotar en la auditoría: ' + e.message));
  }

  const nombrePuesto = id => (N().PUESTOS[id] || {}).nombre || id || 'Personalizado';
  const pantallas = () => App.modulos.filter(m => !m.oculto && !N().SOLO_DUENO.includes(m.id)).sort((a, b) => (a.orden || 0) - (b.orden || 0));

  // formulario para invitar o editar: datos, puesto y permisos
  function formulario(base, esNuevo) {
    const { GRUPOS_ACCIONES, PUESTOS } = N();
    const f = { nombre: base.nombre || '', email: base.email || '', puesto: base.puesto || 'vendedor', modulos: new Set(base.modulos || PUESTOS.vendedor.modulos), acciones: new Set(base.acciones || PUESTOS.vendedor.acciones), activo: base.activo !== false };
    const cuerpo = ui.nodo(String(h`<div>
      <div class="us-datos">
        <div class="campo"><label for="us-nombre">Nombre y apellido</label><input id="us-nombre" type="text" autocomplete="off" value="${f.nombre}" placeholder="Como va a figurar en el registro"></div>
        <div class="campo"><label for="us-mail">Mail</label><input id="us-mail" type="email" autocomplete="off" value="${f.email}" ${esNuevo ? '' : 'disabled'} placeholder="El mail con el que va a entrar"></div>
        <div class="campo"><label for="us-puesto">Puesto</label><select id="us-puesto">${ui.seguro(Object.keys(PUESTOS).map(k => '<option value="' + k + '"' + (k === f.puesto ? ' selected' : '') + '>' + ui.escapar(PUESTOS[k].nombre) + '</option>').join('') + '<option value="personalizado"' + (PUESTOS[f.puesto] ? '' : ' selected') + '>Personalizado</option>')}</select><span class="campo-ayuda">Al elegir un puesto se marcan sus permisos; después se pueden cambiar.</span></div>
      </div>
      <div class="us-permisos">
        <fieldset><legend>Pantallas que ve</legend>${ui.seguro(pantallas().map(m => '<label class="us-check"><input type="checkbox" data-mod="' + m.id + '"' + (f.modulos.has(m.id) ? ' checked' : '') + '><span>' + ui.escapar(m.titulo) + '</span></label>').join(''))}</fieldset>
        <fieldset><legend>Lo que puede hacer</legend>${ui.seguro(GRUPOS_ACCIONES.map(g => '<label class="us-check"><input type="checkbox" data-acc="' + g.id + '"' + (f.acciones.has(g.id) ? ' checked' : '') + '><span>' + ui.escapar(g.nombre) + '<small>' + ui.escapar(g.detalle) + '</small></span></label>').join(''))}</fieldset>
      </div>
      ${esNuevo ? '' : h`<label class="us-check" style="margin-top:14px"><input type="checkbox" data-activo ${f.activo ? 'checked' : ''}><span>Usuario activo<small>Si lo destildás, la persona deja de entrar en el momento. Lo que cargó queda en el registro.</small></span></label>`}
    </div>`));
    const $ = s => cuerpo.querySelector(s);
    const marcar = () => {
      cuerpo.querySelectorAll('[data-mod]').forEach(c => { c.checked = f.modulos.has(c.dataset.mod); });
      cuerpo.querySelectorAll('[data-acc]').forEach(c => { c.checked = f.acciones.has(c.dataset.acc); });
    };
    $('#us-puesto').addEventListener('change', e => {
      f.puesto = e.target.value;
      const p = PUESTOS[f.puesto];
      if (p) { f.modulos = new Set(p.modulos); f.acciones = new Set(p.acciones); marcar(); }
    });
    cuerpo.addEventListener('change', e => {
      const c = e.target;
      if (c.dataset.mod) { c.checked ? f.modulos.add(c.dataset.mod) : f.modulos.delete(c.dataset.mod); }
      else if (c.dataset.acc) { c.checked ? f.acciones.add(c.dataset.acc) : f.acciones.delete(c.dataset.acc); }
      else return;
      // si ya no coincide con el puesto elegido, pasa a «Personalizado»
      const p = PUESTOS[f.puesto];
      if (p && (JSON.stringify([...f.modulos].sort()) !== JSON.stringify(p.modulos.slice().sort()) || JSON.stringify([...f.acciones].sort()) !== JSON.stringify(p.acciones.slice().sort()))) { f.puesto = 'personalizado'; $('#us-puesto').value = 'personalizado'; }
    });
    const leer = () => {
      f.nombre = $('#us-nombre').value.trim();
      f.email = $('#us-mail').value.trim().toLowerCase();
      const act = $('[data-activo]'); if (act) f.activo = act.checked;
      if (!f.nombre) throw new Error('Falta el nombre.');
      if (esNuevo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) throw new Error('El mail no está bien escrito.');
      if (!f.modulos.size) throw new Error('Marcá al menos una pantalla.');
      // las acciones de una pantalla que no ve no le sirven, pero se respetan si el dueño las marca
      return { nombre: f.nombre, email: f.email, puesto: f.puesto, modulos: [...f.modulos].sort(), acciones: [...f.acciones].sort(), activo: f.activo };
    };
    return { cuerpo, leer };
  }

  function invitar() {
    const { fs, sesion, ahoraServidor } = N();
    const fm = formulario({}, true);
    ui.modal({ titulo: 'Invitar usuario', ancho: 820, cuerpo: fm.cuerpo, acciones: [
      { texto: 'Cancelar', tipo: 'secundario' },
      { texto: 'Invitar', tipo: 'primario', alClic: ({ cerrar, modal }) => {
        const d = fm.leer();
        if ((miembros || []).some(m => m.email === d.email)) throw new Error('Esa persona ya es usuario de la empresa.');
        const b = modal.querySelector('.modal-pie .btn-primario'); b.disabled = true; b.textContent = 'Invitando…';
        fs.doc('invitaciones/' + d.email).set({
          empresaId: sesion.eid, empresa: sesion.empresa.nombre || '', rol: 'empleado', nombre: d.nombre, puesto: d.puesto, modulos: d.modulos, acciones: d.acciones,
          invitadoPor: sesion.user.uid, creada: ahoraServidor()
        }).then(() => {
          auditar('Invitó a ' + d.nombre + ' (' + d.email + ') como ' + nombrePuesto(d.puesto), { email: d.email });
          cerrar();
          mostrarEnlace(d);
          cargar();
        }).catch(e => { b.disabled = false; b.textContent = 'Invitar'; ui.toast(e.code === 'permission-denied' ? 'Ese mail ya tiene una invitación de otra empresa.' : 'No se pudo invitar: ' + e.message, 'peligro'); });
        return false;
      } }] });
  }

  const enlace = () => location.origin + location.pathname;
  function mostrarEnlace(d) {
    const texto = 'Hola ' + d.nombre.split(' ')[0] + ', ya tenés usuario en el sistema de ' + (N().sesion.empresa.nombre || 'la empresa') + '. Entrá en ' + enlace() + ' con este mail: ' + d.email + '. La primera vez tocá «Crear cuenta» y elegí una contraseña, o entrá con Google si el mail es de Gmail.';
    ui.modal({ titulo: 'Invitación lista', ancho: 560, cuerpo: ui.nodo(String(h`<div><p style="margin-top:0">Mandale este mensaje a ${d.nombre} por WhatsApp o por mail:</p>
      <textarea readonly rows="5" style="width:100%;font:inherit;padding:10px;border:1px solid var(--linea);border-radius:var(--r-control)">${texto}</textarea></div>`)),
      acciones: [{ texto: 'Cerrar', tipo: 'secundario' },
        { texto: 'Mandar por WhatsApp', tipo: 'secundario', alClic: () => { window.open('https://wa.me/?text=' + encodeURIComponent(texto), '_blank', 'noopener'); return false; } },
        { texto: 'Copiar mensaje', tipo: 'primario', alClic: () => { navigator.clipboard.writeText(texto).then(() => ui.toast('Mensaje copiado.', 'ok')); return false; } }] });
  }

  function editar(m) {
    const { fs, sesion } = N();
    if (m.rol === 'dueno') { ui.toast('El dueño ve y hace todo: no tiene permisos para editar.', 'info'); return; }
    const fm = formulario(m, false);
    ui.modal({ titulo: 'Permisos de ' + m.nombre, ancho: 820, cuerpo: fm.cuerpo, acciones: [
      { texto: 'Cancelar', tipo: 'secundario' },
      { texto: 'Guardar cambios', tipo: 'primario', alClic: ({ cerrar }) => {
        const d = fm.leer();
        fs.doc('empresas/' + sesion.eid + '/miembros/' + m.uid).update({ nombre: d.nombre, puesto: d.puesto, modulos: d.modulos, acciones: d.acciones, activo: d.activo }).then(() => {
          const cambios = [];
          if (d.activo !== (m.activo !== false)) cambios.push(d.activo ? 'lo volvió a activar' : 'lo desactivó');
          if (JSON.stringify(d.modulos) !== JSON.stringify((m.modulos || []).slice().sort()) || JSON.stringify(d.acciones) !== JSON.stringify((m.acciones || []).slice().sort())) cambios.push('le cambió los permisos (' + nombrePuesto(d.puesto) + ')');
          if (d.nombre !== m.nombre) cambios.push('le cambió el nombre a ' + d.nombre);
          auditar('Editó a ' + m.nombre + ': ' + (cambios.join(', ') || 'sin cambios'), { email: m.email });
          ui.toast('Cambios guardados. ' + d.nombre + ' los ve en el momento.', 'ok');
          cerrar(); cargar();
        }).catch(e => ui.toast('No se pudo guardar: ' + e.message, 'peligro'));
        return false;
      } }] });
  }

  async function borrarInvitacion(inv) {
    const ok = await ui.confirmar('Se borra la invitación de ' + inv.nombre + ' (' + inv.email + '). Si todavía no entró, ya no va a poder entrar con ese mail.', { titulo: 'Borrar invitación', aceptar: 'Borrar invitación', tipo: 'peligro' });
    if (!ok) return;
    N().fs.doc('invitaciones/' + inv.email).delete().then(() => { auditar('Borró la invitación de ' + inv.nombre + ' (' + inv.email + ')', { email: inv.email }); cargar(); })
      .catch(e => ui.toast('No se pudo borrar: ' + e.message, 'peligro'));
  }

  function render(el) {
    estilos();
    if (miembros === null && !cargando && !intentado) cargar();
    el.appendChild(ui.nodo(String(h`<div class="encabezado-vista"><div><h1 class="titulo-vista">Usuarios</h1>
      <p class="bajada">Cada persona entra con su mail y ve sólo lo que le marques. Podés crear todos los usuarios que necesites.</p></div>
      <div class="acciones"><button type="button" class="btn btn-primario" data-invitar>Invitar usuario</button></div></div>`)));
    el.querySelector('[data-invitar]').addEventListener('click', invitar);
    if (error) { const v = ui.nodo(String(h`<div class="vacio">${error} <button type="button" class="btn btn-chico btn-secundario">Probar de nuevo</button></div>`)); v.querySelector('button').addEventListener('click', cargar); el.appendChild(v); }
    if (miembros === null) { if (!error) el.appendChild(ui.nodo('<div class="vacio">Cargando usuarios…</div>')); return; }

    const sec = document.createElement('section');
    sec.className = 'seccion'; sec.style.marginTop = '0';
    sec.innerHTML = String(h`<h2 class="seccion-titulo">Usuarios de la empresa <span class="texto-2">${miembros.length}</span></h2>`);
    sec.appendChild(ui.tabla({
      filas: miembros,
      alClic: editar,
      columnas: [
        { titulo: 'Nombre', valor: m => h`<span class="celda-principal">${m.nombre}</span><span class="celda-sub">${m.email}</span>` },
        { titulo: 'Puesto', valor: m => m.rol === 'dueno' ? 'Dueño' : nombrePuesto(m.puesto) },
        { titulo: 'Ve', clase: 'ocultar-celu', valor: m => m.rol === 'dueno' ? 'Todo' : (m.modulos || []).map(id => (App.modulos.find(x => x.id === id) || {}).titulo || id).join(', ') },
        { titulo: 'Estado', valor: m => m.activo === false ? ui.chip('Desactivado', 'neutro') : ui.chip('Activo', 'ok') }
      ]
    }));
    el.appendChild(sec);

    if (invitaciones && invitaciones.length) {
      const si = document.createElement('section');
      si.className = 'seccion';
      si.innerHTML = String(h`<h2 class="seccion-titulo">Invitaciones que todavía no entraron <span class="texto-2">${invitaciones.length}</span></h2>`);
      si.appendChild(ui.tabla({
        filas: invitaciones,
        columnas: [
          { titulo: 'Nombre', valor: i => h`<span class="celda-principal">${i.nombre}</span><span class="celda-sub">${i.email}</span>` },
          { titulo: 'Puesto', valor: i => nombrePuesto(i.puesto) },
          { titulo: 'Invitado', clase: 'ocultar-celu', valor: i => i.creada ? ui.fecha(i.creada.toDate().toISOString().slice(0, 10)) : '' },
          { titulo: '', alinear: 'der', valor: i => ui.seguro('<button type="button" class="btn btn-chico btn-secundario" data-mensaje="' + ui.escapar(i.email) + '">Mensaje</button> <button type="button" class="btn btn-chico btn-secundario" data-borrar="' + ui.escapar(i.email) + '">Borrar</button>') }
        ]
      }));
      si.addEventListener('click', e => {
        const b = e.target.closest('[data-borrar], [data-mensaje]'); if (!b) return;
        const inv = invitaciones.find(i => i.email === (b.dataset.borrar || b.dataset.mensaje));
        if (b.dataset.borrar) borrarInvitacion(inv); else mostrarEnlace(inv);
      });
      el.appendChild(si);
    }
    el.appendChild(ui.nodo(String(h`<p class="us-aviso">Para entrar, cada usuario abre <a href="${enlace()}">${enlace()}</a> con el mail invitado. Tocá un usuario para cambiarle los permisos o desactivarlo.</p>`)));
  }

  App.modulo({
    id: 'usuarios',
    titulo: 'Usuarios',
    grupo: 'Administración',
    orden: 90,
    icono: '<svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="7.5" cy="7" r="3"/><path d="M2 17c.6-3 2.8-4.5 5.5-4.5S12.4 14 13 17"/><path d="M13 4.2a3 3 0 0 1 0 5.6M15 12.8c1.6.6 2.6 2 3 4.2"/></svg>',
    render(el) { render(el); }
  });
})();
