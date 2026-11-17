// Acceso al panel admin con Google (12/11/2026, Matías): sólo entran las cuentas de SITE.adminEmails.
// Esto es la puerta de la pantalla. La seguridad de verdad está en el server de MyM, que verifica el
// token de Google en cada pedido y tiene su propia lista (VENTAS_SOL_PANEL_EMAILS).
// Necesita antes: config.js y los scripts firebase-app-compat y firebase-auth-compat.
//   ACCESO.iniciar({ alEntrar(usuario), alSalir(mensaje) })
//   await ACCESO.token()   → el token para mandar como "Authorization: Bearer ..."
//   ACCESO.entrar() / ACCESO.salir(mensaje)
(function () {
  const SITE = window.SITE || {};
  const LISTA = (SITE.adminEmails || []).map((e) => String(e).trim().toLowerCase());
  let auth = null, cb = { alEntrar() {}, alSalir() {} };

  const permitido = (u) => !!u && u.emailVerified && LISTA.includes(String(u.email || '').toLowerCase());

  function iniciar(opciones) {
    cb = Object.assign(cb, opciones || {});
    if (!window.firebase || !SITE.firebaseWeb) { cb.alSalir('No se pudo cargar el acceso con Google. Recargá la página.'); return; }
    if (!firebase.apps.length) firebase.initializeApp(SITE.firebaseWeb);
    auth = firebase.auth();
    auth.onAuthStateChanged((u) => {
      if (!u) return cb.alSalir('');
      if (!permitido(u)) {
        const correo = u.email || 'esa cuenta';
        auth.signOut();
        return cb.alSalir(correo + ' no tiene acceso a este panel.');
      }
      cb.alEntrar({ email: u.email, nombre: u.displayName || u.email, foto: u.photoURL || '' });
    });
  }

  function entrar() {
    const p = new firebase.auth.GoogleAuthProvider();
    p.setCustomParameters({ prompt: 'select_account' });
    return auth.signInWithPopup(p).catch((e) => {
      if (e && e.code === 'auth/popup-closed-by-user') return cb.alSalir('');
      if (e && e.code === 'auth/unauthorized-domain') return cb.alSalir('Falta habilitar este dominio en Firebase (Authentication → Configuración → Dominios autorizados).');
      cb.alSalir('No se pudo entrar: ' + (e && e.message ? e.message : e));
    });
  }

  // Firebase renueva el token solo (dura una hora); se pide en cada pedido al server.
  async function token() {
    const u = auth && auth.currentUser;
    if (!permitido(u)) throw new Error('sin sesión');
    return u.getIdToken();
  }

  function salir(mensaje) { if (auth) auth.signOut(); try { sessionStorage.removeItem('cal_token'); } catch (e) {} cb.alSalir(mensaje || ''); }

  // Google Calendar (17/11/2026, Matías: «agenda de diagnósticos del día»). Permiso de SÓLO LECTURA, pedido aparte
  // con un botón (no al entrar). Google da un token que dura 1 hora: se guarda en esta pestaña (sessionStorage) y
  // después se vuelve a pedir con un clic. No se guarda en ningún server.
  const SCOPE_CAL = 'https://www.googleapis.com/auth/calendar.readonly';
  function tokenCalendarioGuardado() {
    try { const t = JSON.parse(sessionStorage.getItem('cal_token') || 'null'); return t && t.vence > Date.now() + 60000 ? t.token : ''; } catch (e) { return ''; }
  }
  async function conectarCalendario() {
    const p = new firebase.auth.GoogleAuthProvider();
    p.addScope(SCOPE_CAL);
    p.setCustomParameters({ prompt: 'consent', login_hint: (auth.currentUser && auth.currentUser.email) || '' });
    const r = await auth.currentUser.reauthenticateWithPopup(p);
    const t = r && r.credential && r.credential.accessToken;
    if (!t) throw new Error('Google no dio permiso para leer el calendario');
    try { sessionStorage.setItem('cal_token', JSON.stringify({ token: t, vence: Date.now() + 55 * 60000 })); } catch (e) {}
    return t;
  }

  window.ACCESO = { iniciar, entrar, salir, token, conectarCalendario, tokenCalendarioGuardado };
})();
