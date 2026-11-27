/* MyM Distribuidoras: conexión con Firebase (proyecto mym-distribuidoras).
   - Ingreso con mail y contraseña (con verificación del mail) o con Google.
   - Cada persona entra a su empresa: el dueño la crea MyM con herramientas/alta-empresa.mjs y los empleados
     entran por invitación del dueño (pantalla «Usuarios»).
   - Cada movimiento del sistema (App.acciones.*) se guarda en Firestore en empresas/{id}/acciones/{n}, numerado
     de a uno con una transacción, con hora del servidor, usuario y detalle: eso es el «Registro de cambios».
   - Al abrir se bajan sólo los movimientos nuevos (los anteriores quedan guardados en este equipo) y se escuchan
     los que van haciendo los demás. Sin conexión, los movimientos quedan en el equipo y se suben solos al volver.
   - Permisos: el dueño ve y hace todo; cada empleado ve las pantallas y hace las acciones que el dueño le marcó.
     Las reglas de Firestore (firestore.rules) controlan lo mismo del lado del servidor.
   La configuración de abajo es la pública de la app web: no es una clave secreta, el acceso lo cuidan las reglas. */
(function () {
  'use strict';

  const FIREBASE = {
    apiKey: 'AIzaSyAgig83ZUqY07TWxNSyr4_5mqbosPq16X4',
    authDomain: 'mym-distribuidoras.firebaseapp.com',
    projectId: 'mym-distribuidoras',
    storageBucket: 'mym-distribuidoras.firebasestorage.app',
    messagingSenderId: '331369292256',
    appId: '1:331369292256:web:9a320ab2df903ecd420b85'
  };
  const VERSION = '202611280100';
  const SCRIPTS = ['nucleo', 'modulos/inicio', 'modulos/resultados', 'modulos/contabilidad', 'modulos/preventa', 'modulos/ventas',
    'modulos/facturacion', 'modulos/entregas', 'modulos/cobranzas', 'modulos/clientes', 'modulos/compras', 'modulos/produccion',
    'modulos/proveedores', 'modulos/stock', 'modulos/etiquetas', 'modulos/catalogo', 'modulos/listas', 'modulos/usuarios', 'modulos/registro'];

  // ---------- permisos ----------
  // grupos de acciones que el dueño le marca a cada usuario (los mismos nombres están en firestore.rules)
  const GRUPOS_ACCIONES = [
    { id: 'ventas', nombre: 'Ventas', detalle: 'Cargar, modificar y cancelar pedidos; registrar visitas', acciones: ['crearPedido', 'modificarPedido', 'cancelarPedido', 'registrarVisita'] },
    { id: 'facturar', nombre: 'Facturar', detalle: 'Facturas, notas de crédito y cambios en pedidos facturados', acciones: ['facturarPedido', 'modificarPedidoFacturado', 'notaCredito'] },
    { id: 'entregas', nombre: 'Entregas', detalle: 'Armar hojas de ruta y marcar entregas', acciones: ['armarHojaRuta', 'marcarEntrega'] },
    { id: 'cobranzas', nombre: 'Cobranzas', detalle: 'Registrar cobros y depositar cheques', acciones: ['registrarCobranza', 'depositarCheque'] },
    { id: 'compras', nombre: 'Compras y pagos', detalle: 'Órdenes de compra, recepción, pagos a proveedores y comisiones', acciones: ['crearOrdenCompra', 'recibirCompra', 'marcarOrdenEnviada', 'cancelarOrdenCompra', 'registrarPago', 'debitarChequesPropios', 'liquidarComisiones'] },
    { id: 'stock', nombre: 'Stock', detalle: 'Ajustes, transferencias, códigos y fotos de productos', acciones: ['ajustarStock', 'transferirStock', 'asignarCodigoPropio', 'asignarFoto'] },
    { id: 'produccion', nombre: 'Producción', detalle: 'Recetas y producción propia', acciones: ['guardarReceta', 'producir'] },
    { id: 'precios', nombre: 'Precios', detalle: 'Listas de precios y aumentos', acciones: ['crearListaPrecio', 'actualizarPrecios'] },
    { id: 'datos', nombre: 'Datos', detalle: 'Altas y cambios de productos, clientes, proveedores y configuración', acciones: ['guardarMaestro', 'guardarConfig'] },
    { id: 'contabilidad', nombre: 'Contabilidad', detalle: 'Asientos manuales', acciones: ['asientoManual'] }
  ];
  const GRUPO_DE = {};
  GRUPOS_ACCIONES.forEach(g => g.acciones.forEach(a => { GRUPO_DE[a] = g.id; }));
  const NOMBRE_ACCION = {
    crearPedido: 'Cargar pedidos', modificarPedido: 'Modificar pedidos', cancelarPedido: 'Cancelar pedidos', registrarVisita: 'Registrar visitas',
    facturarPedido: 'Facturar', modificarPedidoFacturado: 'Modificar pedidos facturados', notaCredito: 'Hacer notas de crédito',
    armarHojaRuta: 'Armar hojas de ruta', marcarEntrega: 'Marcar entregas', registrarCobranza: 'Registrar cobranzas', depositarCheque: 'Depositar cheques',
    crearOrdenCompra: 'Hacer órdenes de compra', recibirCompra: 'Recibir compras', marcarOrdenEnviada: 'Marcar órdenes como enviadas',
    cancelarOrdenCompra: 'Cancelar órdenes de compra', registrarPago: 'Registrar pagos a proveedores', debitarChequesPropios: 'Debitar cheques propios',
    liquidarComisiones: 'Liquidar comisiones', ajustarStock: 'Ajustar stock', transferirStock: 'Transferir stock', asignarCodigoPropio: 'Asignar códigos propios',
    asignarFoto: 'Cargar fotos de productos', guardarReceta: 'Guardar recetas', producir: 'Registrar producción', crearListaPrecio: 'Crear listas de precios',
    actualizarPrecios: 'Actualizar precios', guardarMaestro: 'Cargar y modificar datos', guardarConfig: 'Cambiar la configuración', asientoManual: 'Hacer asientos manuales'
  };
  // cómo queda escrito cada movimiento en el registro de cambios
  const PASADO = {
    crearPedido: 'Cargó el pedido', modificarPedido: 'Modificó el pedido', cancelarPedido: 'Canceló el pedido', registrarVisita: 'Registró una visita',
    facturarPedido: 'Facturó el pedido', modificarPedidoFacturado: 'Modificó un pedido facturado', notaCredito: 'Hizo una nota de crédito',
    armarHojaRuta: 'Armó la hoja de ruta', marcarEntrega: 'Marcó una entrega', registrarCobranza: 'Registró una cobranza', depositarCheque: 'Depositó cheques',
    crearOrdenCompra: 'Hizo la orden de compra', recibirCompra: 'Recibió la compra', marcarOrdenEnviada: 'Marcó como enviada la orden',
    cancelarOrdenCompra: 'Canceló la orden de compra', registrarPago: 'Registró un pago', debitarChequesPropios: 'Debitó cheques propios',
    liquidarComisiones: 'Liquidó comisiones', ajustarStock: 'Ajustó el stock', transferirStock: 'Transfirió stock', asignarCodigoPropio: 'Asignó un código propio',
    asignarFoto: 'Cargó la foto', guardarReceta: 'Guardó la receta', producir: 'Registró producción', crearListaPrecio: 'Creó la lista de precios',
    actualizarPrecios: 'Actualizó precios', guardarMaestro: 'Guardó', guardarConfig: 'Cambió la configuración', asientoManual: 'Hizo un asiento manual'
  };
  const MAESTRO_SINGULAR = { productos: 'el producto', clientes: 'el cliente', proveedores: 'el proveedor', preventistas: 'el preventista', choferes: 'el chofer', vehiculos: 'el vehículo', depositos: 'el depósito' };
  // puestos armados para no marcar todo a mano (el dueño después ajusta lo que quiera)
  const PUESTOS = {
    vendedor: { nombre: 'Vendedor', modulos: ['inicio', 'preventa', 'ventas', 'clientes', 'catalogo'], acciones: ['ventas'] },
    administracion: { nombre: 'Administración', modulos: ['inicio', 'ventas', 'facturacion', 'cobranzas', 'clientes', 'proveedores', 'compras', 'listas', 'resultados', 'contabilidad'], acciones: ['ventas', 'facturar', 'cobranzas', 'compras', 'precios', 'datos'] },
    deposito: { nombre: 'Depósito', modulos: ['stock', 'compras', 'entregas', 'etiquetas', 'produccion'], acciones: ['stock', 'entregas', 'produccion'] },
    chofer: { nombre: 'Chofer', modulos: ['entregas', 'cobranzas'], acciones: ['entregas', 'cobranzas'] }
  };
  const SOLO_DUENO = ['usuarios', 'registro'];

  // ---------- Firebase ----------
  firebase.initializeApp(FIREBASE);
  const auth = firebase.auth();
  auth.languageCode = 'es';
  const fs = firebase.firestore();
  // pruebas en la compu de MyM: http://localhost:5581/sistema/?emulador usa los emuladores locales de Firebase, no la base real
  const EMULADOR = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && new URLSearchParams(location.search).has('emulador');
  if (EMULADOR) { auth.useEmulator('http://127.0.0.1:9099', { disableWarnings: true }); fs.useEmulator('127.0.0.1', 8080); }
  const ahoraServidor = () => firebase.firestore.FieldValue.serverTimestamp();

  const sesion = { user: null, eid: null, empresa: null, miembro: null, confirmados: [], pendientes: [], ultimo: 0, sinConexion: false, desuscribir: [] };
  const esDueno = () => sesion.miembro && sesion.miembro.rol === 'dueno';

  // ---------- guardado en este equipo ----------
  const Cache = {
    abrir() {
      return new Promise((res, rej) => {
        const r = indexedDB.open('mym-sistema', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('datos');
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      });
    },
    async leer(clave) {
      try { const db = await this.abrir(); return await new Promise(res => { const q = db.transaction('datos').objectStore('datos').get(clave); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); }); }
      catch (e) { return null; }
    },
    async guardar(clave, valor) {
      try { const db = await this.abrir(); await new Promise(res => { const t = db.transaction('datos', 'readwrite'); t.objectStore('datos').put(valor, clave); t.oncomplete = res; t.onerror = res; }); }
      catch (e) { /* sin IndexedDB: la próxima vez baja todo de nuevo */ }
    },
    async borrarTodo() {
      try { const db = await this.abrir(); await new Promise(res => { const t = db.transaction('datos', 'readwrite'); t.objectStore('datos').clear(); t.oncomplete = res; t.onerror = res; }); }
      catch (e) { /* nada */ }
    }
  };
  const clavePend = () => 'mym-pend-' + sesion.eid + '-' + sesion.user.uid;
  const claveSesion = uid => 'mym-sesion-' + uid;
  function guardarPendientes() {
    try { localStorage.setItem(clavePend(), JSON.stringify(sesion.pendientes.map(p => ({ a: p.a, args: p.args, f: p.f, k: p.k, detalle: p.detalle })))); }
    catch (e) { console.warn('No se pudieron guardar los cambios pendientes en el equipo: ' + e.message); }
  }
  function leerPendientes() { try { const x = JSON.parse(localStorage.getItem(clavePend()) || '[]'); return Array.isArray(x) ? x : []; } catch (e) { return []; } }
  let tCache = null;
  function guardarCacheLuego() {
    clearTimeout(tCache);
    tCache = setTimeout(() => Cache.guardar('acciones-' + sesion.eid, { ultimo: sesion.ultimo, lista: sesion.confirmados }), 1500);
  }

  // ---------- pantalla de ingreso ----------
  const $ing = () => document.getElementById('ingreso');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function pantalla(html) {
    const el = $ing();
    el.hidden = false;
    document.getElementById('app').hidden = true;
    el.querySelector('.ingreso-caja').innerHTML = html;
    const f = el.querySelector('input'); if (f) f.focus();
  }
  function avisoIngreso(texto, tipo) {
    const a = $ing().querySelector('[data-aviso]');
    if (a) { a.textContent = texto; a.className = 'ingreso-aviso' + (tipo ? ' ingreso-aviso-' + tipo : ''); a.hidden = !texto; }
  }
  function ocupado(boton, si, texto) {
    if (!boton) return;
    if (si) { boton.dataset.texto = boton.textContent; boton.textContent = texto || 'Un momento…'; boton.disabled = true; }
    else { boton.textContent = boton.dataset.texto || boton.textContent; boton.disabled = false; }
  }
  const ERRORES = {
    'auth/invalid-credential': 'El mail o la contraseña no coinciden.',
    'auth/wrong-password': 'El mail o la contraseña no coinciden.',
    'auth/user-not-found': 'No hay ninguna cuenta con ese mail. Si te invitaron, tocá «Crear cuenta».',
    'auth/invalid-email': 'El mail no está bien escrito.',
    'auth/email-already-in-use': 'Ya hay una cuenta con ese mail. Tocá «Ingresar».',
    'auth/weak-password': 'La contraseña tiene que tener al menos 8 caracteres.',
    'auth/too-many-requests': 'Hubo muchos intentos seguidos. Esperá unos minutos y probá de nuevo.',
    'auth/network-request-failed': 'No hay conexión a internet.',
    'auth/popup-closed-by-user': 'Se cerró la ventana de Google antes de terminar.',
    'auth/cancelled-popup-request': 'Se cerró la ventana de Google antes de terminar.',
    'auth/account-exists-with-different-credential': 'Ese mail ya entra con contraseña. Ingresá con el mail y la contraseña.',
    'permission-denied': 'No tenés permiso para esta acción.',
    'unavailable': 'No hay conexión con el servidor.'
  };
  const textoError = e => ERRORES[e && e.code] || (e && e.message) || 'Algo salió mal.';

  const GOOGLE = '<svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';

  function formIngreso(modo, mail) {
    const crear = modo === 'crear';
    pantalla(`
      <h1 class="ingreso-titulo">${crear ? 'Crear tu cuenta' : 'Ingresar'}</h1>
      <p class="ingreso-bajada">${crear ? 'Usá el mismo mail con el que te invitaron.' : 'Entrá con el mail y la contraseña de tu usuario.'}</p>
      <form class="ingreso-form" novalidate>
        <div class="campo"><label for="in-mail">Mail</label><input id="in-mail" name="mail" type="email" autocomplete="email" required value="${esc(mail || '')}"></div>
        <div class="campo"><label for="in-clave">Contraseña</label><input id="in-clave" name="clave" type="password" autocomplete="${crear ? 'new-password' : 'current-password'}" required minlength="8">${crear ? '<span class="campo-ayuda">Al menos 8 caracteres.</span>' : ''}</div>
        ${crear ? '<div class="campo"><label for="in-clave2">Repetí la contraseña</label><input id="in-clave2" name="clave2" type="password" autocomplete="new-password" required></div>' : ''}
        <p class="ingreso-aviso" data-aviso role="alert" hidden></p>
        <button class="btn btn-primario ingreso-btn" type="submit">${crear ? 'Crear cuenta' : 'Ingresar'}</button>
      </form>
      ${crear ? '' : '<button class="ingreso-link" type="button" data-olvide>Me olvidé la contraseña</button>'}
      <div class="ingreso-o"><span>o</span></div>
      <button class="btn btn-secundario ingreso-btn ingreso-google" type="button" data-google>${GOOGLE}<span>Ingresar con Google</span></button>
      <p class="ingreso-cambio">${crear ? '¿Ya tenés cuenta? <button class="ingreso-link" type="button" data-modo="ingresar">Ingresar</button>' : '¿Te invitaron y es la primera vez? <button class="ingreso-link" type="button" data-modo="crear">Crear cuenta</button>'}</p>`);
    const el = $ing();
    const form = el.querySelector('form');
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const m = form.mail.value.trim(), c = form.clave.value;
      if (!m) return avisoIngreso('Escribí tu mail.', 'peligro');
      if (!c) return avisoIngreso('Escribí la contraseña.', 'peligro');
      if (crear && c.length < 8) return avisoIngreso('La contraseña tiene que tener al menos 8 caracteres.', 'peligro');
      if (crear && c !== form.clave2.value) return avisoIngreso('Las dos contraseñas no coinciden.', 'peligro');
      const b = form.querySelector('button[type=submit]');
      ocupado(b, true, crear ? 'Creando la cuenta…' : 'Ingresando…');
      try {
        if (crear) { const r = await auth.createUserWithEmailAndPassword(m, c); await r.user.sendEmailVerification(); }
        else await auth.signInWithEmailAndPassword(m, c);
      } catch (err) { ocupado(b, false); avisoIngreso(textoError(err), 'peligro'); }
    });
    el.querySelector('[data-google]').addEventListener('click', async ev => {
      const b = ev.currentTarget;
      ocupado(b, true, 'Abriendo Google…');
      try { await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()); }
      catch (err) {
        if (err && err.code === 'auth/popup-blocked') { try { await auth.signInWithRedirect(new firebase.auth.GoogleAuthProvider()); return; } catch (e2) { err = e2; } }
        ocupado(b, false); avisoIngreso(textoError(err), 'peligro');
      }
    });
    el.querySelectorAll('[data-modo]').forEach(b => b.addEventListener('click', () => formIngreso(b.dataset.modo, form.mail.value.trim())));
    const olv = el.querySelector('[data-olvide]');
    if (olv) olv.addEventListener('click', async () => {
      const m = form.mail.value.trim();
      if (!m) return avisoIngreso('Escribí tu mail arriba y tocá de nuevo «Me olvidé la contraseña».', 'peligro');
      try { await auth.sendPasswordResetEmail(m); avisoIngreso('Si hay una cuenta con ese mail, te llegó un mail para elegir una contraseña nueva. Revisá también el correo no deseado.', 'ok'); }
      catch (err) { avisoIngreso(textoError(err), 'peligro'); }
    });
  }

  function pantallaVerificar(user) {
    pantalla(`
      <h1 class="ingreso-titulo">Confirmá tu mail</h1>
      <p class="ingreso-bajada">Te mandamos un mail a <strong>${esc(user.email)}</strong>. Abrí el enlace que trae y después tocá «Ya lo confirmé». Si no lo ves, revisá el correo no deseado.</p>
      <p class="ingreso-aviso" data-aviso role="alert" hidden></p>
      <button class="btn btn-primario ingreso-btn" type="button" data-listo>Ya lo confirmé</button>
      <button class="btn btn-secundario ingreso-btn" type="button" data-reenviar>Mandar el mail de nuevo</button>
      <p class="ingreso-cambio"><button class="ingreso-link" type="button" data-salir>Entrar con otro mail</button></p>`);
    const el = $ing();
    el.querySelector('[data-listo]').addEventListener('click', async ev => {
      ocupado(ev.currentTarget, true, 'Revisando…');
      await user.reload();
      if (auth.currentUser && auth.currentUser.emailVerified) { await auth.currentUser.getIdToken(true); entrar(auth.currentUser); }
      else { ocupado(ev.currentTarget, false); avisoIngreso('Todavía no figura confirmado. Abrí el enlace del mail y probá de nuevo.', 'peligro'); }
    });
    el.querySelector('[data-reenviar]').addEventListener('click', async () => {
      try { await user.sendEmailVerification(); avisoIngreso('Listo, te mandamos otro mail.', 'ok'); }
      catch (err) { avisoIngreso(textoError(err), 'peligro'); }
    });
    el.querySelector('[data-salir]').addEventListener('click', () => auth.signOut());
  }

  function pantallaMensaje(titulo, texto, conReintento) {
    pantalla(`
      <h1 class="ingreso-titulo">${esc(titulo)}</h1>
      <p class="ingreso-bajada">${texto}</p>
      ${conReintento ? '<button class="btn btn-primario ingreso-btn" type="button" data-reintentar>Probar de nuevo</button>' : ''}
      <p class="ingreso-cambio"><button class="ingreso-link" type="button" data-salir>Salir y entrar con otro mail</button></p>`);
    const el = $ing();
    const r = el.querySelector('[data-reintentar]');
    if (r) r.addEventListener('click', () => entrar(auth.currentUser));
    el.querySelector('[data-salir]').addEventListener('click', () => auth.signOut());
  }

  // ---------- entrar a la empresa ----------
  async function reclamarInvitacion(user) {
    const email = String(user.email || '').toLowerCase();
    if (!email) return null;
    const ref = fs.doc('invitaciones/' + email);
    const inv = await ref.get();
    if (!inv.exists) return null;
    const d = inv.data();
    const b = fs.batch();
    b.set(fs.doc('empresas/' + d.empresaId + '/miembros/' + user.uid), {
      uid: user.uid, nombre: d.nombre, email, rol: d.rol, puesto: d.puesto || '', modulos: d.modulos || [], acciones: d.acciones || [], activo: true, alta: ahoraServidor()
    });
    b.set(fs.doc('usuarios/' + user.uid), { empresaId: d.empresaId });
    b.delete(ref);
    await b.commit();
    return d.empresaId;
  }

  let entrando = false;
  async function entrar(user) {
    if (entrando || window.App && App.db) return;
    entrando = true;
    try {
      pantalla('<p class="ingreso-cargando">Conectando con tu empresa…</p>');
      sesion.user = user;
      let datos = null;
      try {
        const u = await fs.doc('usuarios/' + user.uid).get();
        let eid = u.exists ? u.data().empresaId : await reclamarInvitacion(user);
        if (!eid) { entrando = false; return pantallaMensaje('Todavía no tenés acceso', 'Tu cuenta <strong>' + esc(user.email) + '</strong> no está invitada a ninguna empresa. Pedile al dueño que te invite desde la pantalla «Usuarios» con este mismo mail, y después tocá «Probar de nuevo».', true); }
        const [emp, mie] = await Promise.all([fs.doc('empresas/' + eid).get(), fs.doc('empresas/' + eid + '/miembros/' + user.uid).get()]);
        if (!emp.exists || !mie.exists) { entrando = false; return pantallaMensaje('No encontramos tu empresa', 'Avisale a MyM Soluciones para que lo revise.', true); }
        datos = { eid, empresa: emp.data(), miembro: mie.data() };
        try { localStorage.setItem(claveSesion(user.uid), JSON.stringify(datos)); } catch (e) { /* nada */ }
      } catch (e) {
        // sin conexión: se entra con lo último que quedó guardado en este equipo
        try { datos = JSON.parse(localStorage.getItem(claveSesion(user.uid)) || 'null'); } catch (e2) { datos = null; }
        if (!datos) { entrando = false; return pantallaMensaje('No se pudo conectar', esc(textoError(e)) + ' Revisá la conexión y probá de nuevo.', true); }
        sesion.sinConexion = true;
      }
      if (datos.miembro.activo === false) { entrando = false; return pantallaMensaje('Tu usuario está desactivado', 'Si necesitás volver a entrar, pedíselo al dueño de la empresa.', false); }
      sesion.eid = datos.eid; sesion.empresa = datos.empresa; sesion.miembro = datos.miembro;
      await arrancar();
    } catch (e) {
      console.error(e);
      entrando = false;
      pantallaMensaje('No se pudo abrir el sistema', esc(textoError(e)), true);
    }
  }

  function cargarScript(src) {
    return new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'js/' + src + '.js?v=' + VERSION; s.onload = res; s.onerror = () => rej(new Error('No se pudo cargar ' + src)); document.body.appendChild(s); });
  }

  const conv = d => { const x = d.data({ serverTimestamps: 'estimate' }); let args = []; try { args = JSON.parse(x.argsJson); } catch (e) { /* nada */ }
    return { a: x.a, args, f: x.f, k: x.k, n: x.n, uid: x.uid, usuario: x.usuario, detalle: x.detalle, creado: x.creado ? x.creado.toMillis() : null }; };
  const accionesRef = () => fs.collection('empresas/' + sesion.eid + '/acciones');
  const metaRef = () => fs.doc('empresas/' + sesion.eid + '/meta/registro');

  async function bajarAcciones() {
    const c = await Cache.leer('acciones-' + sesion.eid);
    let lista = c && Array.isArray(c.lista) ? c.lista : [];
    let ultimo = c && c.ultimo || 0;
    if (lista.length !== ultimo) { lista = []; ultimo = 0; }
    if (!sesion.sinConexion) {
      try {
        const snap = await accionesRef().where('n', '>', ultimo).orderBy('n').get();
        snap.docs.map(conv).forEach(r => { if (r.n === ultimo + 1) { lista.push(r); ultimo = r.n; } });
      } catch (e) { sesion.sinConexion = true; }
    }
    sesion.confirmados = lista; sesion.ultimo = ultimo;
    guardarCacheLuego();
  }

  async function arrancar() {
    const cfg = window.SEMILLA.config;
    const e = sesion.empresa;
    Object.assign(cfg, e.config || {});
    cfg.negocio = e.nombre || cfg.negocio;
    cfg.desde = e.desde || cfg.desde;
    cfg.hoy = cfg.hoyAR();
    cfg.clave = 'mym-' + sesion.eid;
    await bajarAcciones();
    const hechos = new Set(sesion.confirmados.map(r => r.k));
    sesion.pendientes = leerPendientes().filter(p => !hechos.has(p.k)).map(p => Object.assign(p, { uid: sesion.user.uid, usuario: sesion.miembro.nombre, pendiente: true }));
    for (const s of SCRIPTS) await cargarScript(s);
    prepararApp();
    if (!App.verModulo('inicio') && /^#?\/?(inicio)?$/.test(location.hash.replace(/^#\/?/, '') || '')) {
      const primero = App.modulos.filter(m => !m.oculto && App.verModulo(m.id)).sort((a, b) => (a.orden || 0) - (b.orden || 0))[0];
      if (primero) history.replaceState(null, '', '#/' + primero.id);
    }
    $ing().hidden = true;
    document.getElementById('app').hidden = false;
    App.iniciar();
    pintarUsuario();
    escuchar();
    enviar();
    if (sesion.sinConexion) App.ui.toast('Sin conexión: estás viendo lo último guardado en este equipo. Lo que cargues se sube solo cuando vuelva internet.', 'alerta');
  }

  function prepararApp() {
    App.nombreAccion = a => NOMBRE_ACCION[a] || a;
    App.permiso = a => esDueno() || (!!GRUPO_DE[a] && (sesion.miembro.acciones || []).includes(GRUPO_DE[a]));
    App.verModulo = id => esDueno() || (!SOLO_DUENO.includes(id) && (sesion.miembro.modulos || []).includes(id));
    App.persistencia = {
      leer: () => sesion.confirmados.concat(sesion.pendientes),
      agregar(r, resultado) {
        r.detalle = describir(r, resultado);
        r.uid = sesion.user.uid; r.usuario = sesion.miembro.nombre; r.pendiente = true; r.creado = Date.now();
        sesion.pendientes.push(r);
        guardarPendientes();
        pintarEstado();
        setTimeout(enviar, 0);
      }
    };
    App.nube = {
      fs, auth, ahoraServidor, sesion, esDueno, GRUPOS_ACCIONES, NOMBRE_ACCION, PUESTOS, SOLO_DUENO,
      salir, describirEstado: estadoTexto
    };
  }

  // ---------- detalle de cada movimiento ----------
  function describir(r, res) {
    try {
      const a0 = r.args[0], a1 = r.args[1];
      const nom = (col, id, campo) => { const x = App.get(col, id); return x ? x[campo] || x.nombre || x.descripcion || id : id; };
      if (r.a === 'guardarMaestro') {
        const d = a1 || {};
        return 'Guardó ' + (MAESTRO_SINGULAR[a0] || a0) + ' ' + (d.descripcion || d.fantasia || d.razonSocial || d.nombre || d.patente || d.id || '');
      }
      if (r.a === 'guardarConfig') return 'Cambió la configuración de ' + a0;
      const partes = [PASADO[r.a] || r.a];
      const o = Object.assign({}, a0 && typeof a0 === 'object' ? a0 : {}, res && typeof res === 'object' && !Array.isArray(res) ? res : {});
      if (typeof a0 === 'string') { const p = App.get('pedidos', a0) || App.get('ordenesCompra', a0); if (p) { if (p.nro) partes.push(p.nro); if (p.clienteId) o.clienteId = p.clienteId; if (p.proveedorId) o.proveedorId = p.proveedorId; if (p.total && !o.total) o.total = p.total; } }
      if (o.nro && !partes.includes(o.nro)) partes.push(o.nro);
      if (o.clienteId) partes.push('de ' + nom('clientes', o.clienteId, 'fantasia'));
      if (o.proveedorId) partes.push('de ' + nom('proveedores', o.proveedorId, 'razonSocial'));
      if (o.productoId) partes.push('de ' + nom('productos', o.productoId, 'descripcion'));
      if (o.nombre && (r.a === 'guardarReceta' || r.a === 'crearListaPrecio')) partes.push(o.nombre);
      if (typeof o.total === 'number' && o.total) partes.push('por ' + App.ui.pesos(o.total));
      return partes.join(' ').replace(/\s+/g, ' ').trim();
    } catch (e) { return PASADO[r.a] || r.a; }
  }

  // ---------- subir los movimientos ----------
  let enviando = false, reintento = null;
  async function enviar() {
    if (enviando) return;
    enviando = true;
    try {
      while (true) {
        const r = sesion.pendientes.find(p => !p.enviado);
        if (!r) break;
        try {
          await fs.runTransaction(async t => {
            const m = await t.get(metaRef());
            const n = ((m.exists && m.data().ultimo) || 0) + 1;
            t.update(metaRef(), { ultimo: n });
            t.set(accionesRef().doc(String(n)), {
              n, a: r.a, argsJson: JSON.stringify(r.args), f: r.f, k: r.k,
              uid: sesion.user.uid, usuario: sesion.miembro.nombre, detalle: r.detalle || '', creado: ahoraServidor()
            });
          });
          r.enviado = true;
          if (sesion.sinConexion) { sesion.sinConexion = false; }
        } catch (e) {
          if (e && e.code === 'permission-denied') {
            // el servidor no lo aceptó (por ejemplo, el dueño le sacó el permiso): se descarta y se rehace la pantalla
            sesion.pendientes = sesion.pendientes.filter(p => p !== r);
            guardarPendientes();
            App.reemplazarRegistro(sesion.confirmados.concat(sesion.pendientes));
            App.ui.toast('No se guardó «' + (r.detalle || r.a) + '»: tu usuario no tiene permiso. Pedíselo al dueño.', 'peligro');
            continue;
          }
          sesion.sinConexion = true;
          clearTimeout(reintento);
          reintento = setTimeout(enviar, 8000);
          break;
        }
      }
    } finally { enviando = false; pintarEstado(); }
  }
  window.addEventListener('online', () => { sesion.sinConexion = false; enviar(); pintarEstado(); });
  window.addEventListener('offline', () => { sesion.sinConexion = true; pintarEstado(); });

  // ---------- escuchar lo que hacen los demás ----------
  function escuchar() {
    sesion.desuscribir.forEach(f => f()); sesion.desuscribir = [];
    const desde = sesion.ultimo;
    sesion.desuscribir.push(accionesRef().where('n', '>', desde).orderBy('n').onSnapshot(snap => {
      const nuevos = snap.docChanges().filter(c => c.type === 'added').map(c => conv(c.doc)).filter(r => r.n > sesion.ultimo).sort((x, y) => x.n - y.n);
      if (!nuevos.length) return;
      let regenerar = false, hueco = false;
      nuevos.forEach(r => {
        if (r.n !== sesion.ultimo + 1) { hueco = true; return; }
        sesion.confirmados.push(r); sesion.ultimo = r.n;
        const i = sesion.pendientes.findIndex(p => p.k === r.k);
        if (i === 0 && !regenerar) {
          // es el mío y ya estaba aplicado en este orden: sólo se marca como guardado
          // (es el mismo objeto que tiene el núcleo en su registro)
          const p = sesion.pendientes.shift();
          Object.assign(p, { n: r.n, creado: r.creado, usuario: r.usuario, uid: r.uid, pendiente: false });
          delete p.enviado;
          sesion.confirmados[sesion.confirmados.length - 1] = p;
        } else {
          if (i >= 0) sesion.pendientes.splice(i, 1);
          regenerar = true;
        }
      });
      if (hueco) { location.reload(); return; }
      guardarPendientes();
      guardarCacheLuego();
      if (regenerar) {
        const rech = App.reemplazarRegistro(sesion.confirmados.concat(sesion.pendientes)) || [];
        const malos = rech.filter(x => x.pendiente);
        if (malos.length) {
          const ks = new Set(malos.map(x => x.k));
          sesion.pendientes = sesion.pendientes.filter(p => !ks.has(p.k));
          guardarPendientes();
          malos.forEach(x => App.ui.toast('No se pudo guardar «' + (x.detalle || x.a) + '» porque otro usuario hizo un cambio antes: ' + x.error, 'peligro'));
        }
      }
      pintarEstado();
    }, err => { console.warn('Se cortó la escucha de cambios: ' + err.message); sesion.sinConexion = true; pintarEstado(); setTimeout(escuchar, 10000); }));
    // si el dueño cambia los permisos o desactiva el usuario, se aplica en el momento
    sesion.desuscribir.push(fs.doc('empresas/' + sesion.eid + '/miembros/' + sesion.user.uid).onSnapshot(d => {
      if (!d.exists) return;
      const m = d.data();
      const antes = JSON.stringify([sesion.miembro.modulos, sesion.miembro.acciones, sesion.miembro.rol]);
      sesion.miembro = m;
      try { localStorage.setItem(claveSesion(sesion.user.uid), JSON.stringify({ eid: sesion.eid, empresa: sesion.empresa, miembro: m })); } catch (e) { /* nada */ }
      if (m.activo === false) { salir(true); return; }
      if (antes !== JSON.stringify([m.modulos, m.acciones, m.rol])) { App.renderizar(); App.ui.toast('El dueño actualizó tus permisos.', 'ok'); }
      pintarUsuario();
    }, () => { /* sin conexión: se reintenta con la escucha de acciones */ }));
  }

  // ---------- usuario y estado en pantalla ----------
  function estadoTexto() {
    const n = sesion.pendientes.length;
    if (sesion.sinConexion) return { texto: n ? 'Sin conexión, ' + n + (n === 1 ? ' cambio por subir' : ' cambios por subir') : 'Sin conexión', tono: 'alerta' };
    if (n) return { texto: 'Guardando ' + n + (n === 1 ? ' cambio…' : ' cambios…'), tono: 'info' };
    return { texto: 'Todo guardado', tono: 'ok' };
  }
  function pintarEstado() {
    const el = document.querySelector('[data-sincro]');
    if (!el) return;
    const e = estadoTexto();
    el.className = 'chip chip-' + e.tono + ' sincro';
    el.textContent = e.texto;
  }
  function pintarUsuario() {
    const m = sesion.miembro;
    document.querySelectorAll('[data-usuario]').forEach(el => { el.textContent = m.nombre; });
    document.querySelectorAll('[data-puesto]').forEach(el => { el.textContent = m.rol === 'dueno' ? 'Dueño' : (PUESTOS[m.puesto] ? PUESTOS[m.puesto].nombre : (m.puesto || 'Usuario')); });
    pintarEstado();
  }

  async function salir(desactivado) {
    if (!desactivado && sesion.pendientes.length) {
      const ok = await App.ui.confirmar('Hay ' + sesion.pendientes.length + ' cambios que todavía no se subieron (falta conexión). Si salís ahora, se pierden.', { titulo: 'Salir del sistema', aceptar: 'Salir igual', tipo: 'peligro' });
      if (!ok) return;
    }
    try { sesion.desuscribir.forEach(f => f()); } catch (e) { /* nada */ }
    try { localStorage.removeItem(clavePend()); localStorage.removeItem(claveSesion(sesion.user.uid)); } catch (e) { /* nada */ }
    await Cache.borrarTodo();
    await auth.signOut();
    if (desactivado) sessionStorage.setItem('mym-aviso', 'Tu usuario fue desactivado por el dueño.');
    location.replace(location.pathname + location.search);
  }

  // ---------- arranque ----------
  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('btn-salir');
    if (btn) btn.addEventListener('click', () => salir(false));
  });
  auth.getRedirectResult().catch(err => { setTimeout(() => avisoIngreso(textoError(err), 'peligro'), 300); });
  auth.onAuthStateChanged(user => {
    if (window.App && App.db) { if (!user) location.replace(location.pathname + location.search); return; }
    if (!user) {
      formIngreso('ingresar');
      const aviso = sessionStorage.getItem('mym-aviso');
      if (aviso) { sessionStorage.removeItem('mym-aviso'); avisoIngreso(aviso, 'peligro'); }
      return;
    }
    const conClave = user.providerData.some(p => p.providerId === 'password') && !user.providerData.some(p => p.providerId === 'google.com');
    if (conClave && !user.emailVerified) return pantallaVerificar(user);
    entrar(user);
  });
})();
