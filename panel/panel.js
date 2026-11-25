// Panel del cliente de la plataforma de bots de WhatsApp de MyM Soluciones (17/11/2026, pedido de Matías).
// Lo usa el dueño del negocio, casi siempre desde el celular. Acá puede:
//   · ver sus charlas (primero las que esperan a una persona), abrirlas y contestar con texto o un archivo;
//   · tomar una charla, devolvérsela al bot o marcarla como atendida; pausar o prender todo el bot;
//   · cambiar lo que dice el bot (la ficha), probarlo en un chat de ensayo y elegir a qué mail le llegan los avisos.
// Se entra sin contraseña: pide un link con su mail y el link trae «#t=…», que se canjea por una sesión.
// Regla de seguridad: todo lo que viene del servidor se pone como texto (nodos de texto), nunca como HTML.
(function () {
  'use strict';
  const cfg = window.SITE || {};
  const local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const qApi = new URLSearchParams(location.search).get('api');
  const API = String((local && qApi) || cfg.plataformaApi || '').replace(/\/+$/, '');
  const $ = (s) => document.querySelector(s);
  const MAX_ARCHIVO = 12 * 1024 * 1024;
  const TITULO = document.title;

  // Arma un elemento sin pasar por HTML: los textos entran como nodos de texto, así no hay nada que escapar.
  function el(etiqueta, attrs, ...hijos) {
    const e = document.createElement(etiqueta);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
    for (const hijo of hijos.flat()) if (hijo != null && hijo !== false) e.append(hijo);
    return e;
  }
  const vaciar = (nodo) => { while (nodo.firstChild) nodo.removeChild(nodo.firstChild); };

  // ---------- Fechas, siempre en hora argentina ----------
  const TZ = 'America/Argentina/Buenos_Aires';
  const hora = (d) => d.toLocaleTimeString('es-AR', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false });
  const diaClave = (d) => d.toLocaleDateString('es-AR', { timeZone: TZ });
  const diaCorto = (d) => d.toLocaleDateString('es-AR', { timeZone: TZ, day: 'numeric', month: 'numeric' });
  // «recién», «hace 5 min», «hoy 14:05», «ayer 18:30», «12/11 18:30»
  function haceCuanto(iso) {
    const d = new Date(iso); if (!iso || isNaN(d)) return '';
    const min = Math.floor((Date.now() - d.getTime()) / 60000);
    if (min < 1) return 'recién';
    if (min < 60) return `hace ${min} min`;
    const k = diaClave(d);
    if (k === diaClave(new Date())) return `hoy ${hora(d)}`;
    if (k === diaClave(new Date(Date.now() - 864e5))) return `ayer ${hora(d)}`;
    return `${diaCorto(d)} ${hora(d)}`;
  }
  // Para una hora que todavía no llegó: «hoy a las 22:30», «mañana a las 8:10», «el 24/11 a las 10:00»
  function hastaCuando(iso) {
    const d = new Date(iso); if (!iso || isNaN(d)) return '';
    const k = diaClave(d);
    if (k === diaClave(new Date())) return `hoy a las ${hora(d)}`;
    if (k === diaClave(new Date(Date.now() + 864e5))) return `mañana a las ${hora(d)}`;
    return `el ${diaCorto(d)} a las ${hora(d)}`;
  }
  function nombreDia(d) {
    const k = diaClave(d);
    if (k === diaClave(new Date())) return 'Hoy';
    if (k === diaClave(new Date(Date.now() - 864e5))) return 'Ayer';
    return d.toLocaleDateString('es-AR', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' });
  }

  // ---------- Sesión guardada en este navegador ----------
  const CLAVE = 'panel-mym'; const CLAVE_CHARLA = 'panel-mym-charla';
  const leer = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  const guardar = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento: la sesión dura lo que dure la pestaña */ } };
  let S = leer(CLAVE); // { sesion, email, clientes:[{id, negocio}], actual }
  if (S && !(S.sesion && Array.isArray(S.clientes) && S.clientes.length)) S = null;
  const cliente = () => (S ? S.actual || S.clientes[0].id : null);

  // ---------- Pedidos al servidor ----------
  async function api(ruta, cuerpo, opciones = {}) {
    const cabeceras = { 'Content-Type': 'application/json' };
    if (S && !opciones.sinSesion) cabeceras.Authorization = 'Bearer ' + S.sesion;
    let r;
    try { r = await fetch(API + ruta, { method: 'POST', headers: cabeceras, body: JSON.stringify(cuerpo || {}) }); }
    catch (e) { const err = new Error('No pudimos conectarnos. Revisá tu conexión y probá de nuevo.'); err.red = true; throw err; }
    if (r.ok && opciones.binario) return r.blob();
    let d = {}; try { d = await r.json(); } catch (e) { /* sin cuerpo */ }
    if (!r.ok) {
      const err = new Error(d.error || 'No se pudo completar. Probá de nuevo en un rato.'); err.status = r.status; err.datos = d;
      if (r.status === 401 && !opciones.sinSesion) salir(err.message); // la sesión venció: a la entrada, con el mensaje
      throw err;
    }
    return d;
  }
  const con = (x = {}) => ({ cliente: cliente(), ...x });

  // ---------- Avisos flotantes y confirmación ----------
  let relojTostada = null;
  function tostada(txt, mal) {
    const t = $('#tostada'); t.textContent = txt; t.classList.toggle('mal', !!mal);
    clearTimeout(relojTostada); relojTostada = setTimeout(() => { t.textContent = ''; }, mal ? 7000 : 4500);
  }
  function confirmar(titulo, texto, boton) {
    const d = $('#confirmar');
    if (!d.showModal) return Promise.resolve(window.confirm(`${titulo}\n\n${texto}`));
    $('#confirmar-titulo').textContent = titulo; $('#confirmar-texto').textContent = texto; $('#confirmar-si').textContent = boton;
    return new Promise((ok) => {
      const cerrar = (v) => { $('#confirmar-si').onclick = null; $('#confirmar-no').onclick = null; d.onclose = null; if (d.open) d.close(); ok(v); };
      $('#confirmar-si').onclick = () => cerrar(true);
      $('#confirmar-no').onclick = () => cerrar(false);
      d.onclose = () => cerrar(false);
      d.showModal(); $('#confirmar-no').focus();
    });
  }

  // =====================================================================================
  // Entrada
  // =====================================================================================
  function mostrarEntrada(mensaje, tipo) {
    $('#v-panel').hidden = true; $('#v-entrada').hidden = false; document.body.classList.remove('en-charla');
    document.title = TITULO;
    const caja = $('#entrada-estado'); vaciar(caja);
    if (mensaje) caja.append(el('p', { class: 'aviso ' + (tipo || '') }, mensaje));
    $('#form-entrar').hidden = false;
  }
  $('#form-entrar').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('#entrar-email').value.trim(); const b = $('#entrar-btn'); const err = $('#entrar-error');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { err.textContent = 'Revisá el mail: parece que le falta algo.'; $('#entrar-email').focus(); return; }
    b.disabled = true; b.textContent = 'Mandando…'; err.textContent = '';
    try {
      const r = await api('/api/panel/entrar', { email }, { sinSesion: true });
      const caja = $('#entrada-estado'); vaciar(caja);
      caja.append(el('p', { class: 'aviso bien' }, r.mensaje || 'Listo. Revisá tu mail: te mandamos el link para entrar.'));
      caja.scrollIntoView({ block: 'center' });
    } catch (e2) { err.textContent = e2.message; }
    b.disabled = false; b.textContent = 'Mandarme el link';
  });

  // El link del mail trae #t=TOKEN: se canjea una sola vez por la sesión y se saca de la dirección.
  async function canjear(t) {
    history.replaceState(null, '', location.pathname + location.search);
    $('#v-panel').hidden = true; $('#v-entrada').hidden = false; $('#form-entrar').hidden = true;
    const caja = $('#entrada-estado'); vaciar(caja); caja.append(el('p', { class: 'aviso bien' }, 'Entrando a tu panel…'));
    try {
      const r = await api('/api/panel/sesion', { t }, { sinSesion: true });
      if (!r.sesion || !Array.isArray(r.clientes) || !r.clientes.length) throw new Error('No encontramos un negocio con ese link. Pedí uno nuevo con tu mail.');
      S = { sesion: r.sesion, email: r.email, clientes: r.clientes, actual: r.clientes[0].id }; guardar(CLAVE, S);
      const pendiente = leer(CLAVE_CHARLA); guardar(CLAVE_CHARLA, null);
      mostrarPanel(typeof pendiente === 'string' ? pendiente : null);
    } catch (e) {
      if (S) { mostrarPanel(null); tostada('Ese link ya se había usado, pero seguís con la sesión abierta.'); return; } // ya estaba adentro
      mostrarEntrada(e.message, 'mal');
    }
  }

  function salir(mensaje) {
    S = null; guardar(CLAVE, null);
    cerrarCharla(); charlas = []; resumen = null; fichaDe = null; historialEnsayo = [];
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    mostrarEntrada(mensaje || '', mensaje ? 'mal' : '');
  }
  $('#salir').addEventListener('click', async () => {
    if (!(await confirmar('¿Salir del panel?', 'Para volver a entrar vas a tener que pedir un link nuevo con tu mail.', 'Sí, salir'))) return;
    // También se cierra del lado del servidor, así esa sesión no sirve más en ningún lado.
    try { await api('/api/panel/salir', {}); } catch (e) { /* igual se sale */ }
    salir();
  });

  // =====================================================================================
  // Panel: resumen, negocios y secciones
  // =====================================================================================
  let resumen = null; let charlas = []; let filtro = 'todas'; let seccion = 'inicio'; let cuenta = null;

  function mostrarPanel(charlaInicial) {
    $('#v-entrada').hidden = true; $('#v-panel').hidden = false;
    $('#quien-soy').textContent = S.email || '';
    const sel = $('#negocios'); vaciar(sel);
    for (const c of S.clientes) sel.append(el('option', { value: c.id }, c.negocio || 'Mi negocio'));
    sel.value = cliente(); $('#caja-negocios').hidden = S.clientes.length < 2;
    $('#r-negocio').textContent = (S.clientes.find((c) => c.id === cliente()) || {}).negocio || 'Tu negocio';
    verSeccion(charlaInicial ? 'charlas' : 'inicio');
    refrescarResumen(); refrescarLista(); refrescarCuenta(); refrescarExtras();
    if (charlaInicial) abrirDesdeLink(charlaInicial);
  }
  $('#negocios').addEventListener('change', (e) => cambiarNegocio(e.target.value));
  function cambiarNegocio(id) {
    if (!S || !S.clientes.some((c) => c.id === id)) return;
    S.actual = id; guardar(CLAVE, S); $('#negocios').value = id;
    cerrarCharla(); quitarHashCharla();
    resumen = null; charlas = []; cuenta = null; fichaDe = null; avisosTocado = false; reiniciarEnsayo();
    $('#r-negocio').textContent = (S.clientes.find((c) => c.id === id) || {}).negocio || 'Tu negocio';
    $('#r-numero').textContent = ''; $('#r-estado').hidden = true; $('#r-pausar').hidden = true; $('#r-prender').hidden = true; $('#r-pausa-pago').hidden = true;
    pintarLista(); pintarEspera(0);
    refrescarResumen(); refrescarLista(); refrescarCuenta(); refrescarExtras(true);
    if (seccion === 'bot') cargarFicha();
  }

  const ESTADOS = { activo: ['Contestando', ''], pausado: ['En pausa', 'pausa'], revision: ['En revisión', 'revision'], aprobar: ['En revisión', 'revision'] };
  async function refrescarResumen() {
    const cli = cliente(); if (!cli) return;
    try {
      const r = await api('/api/panel/resumen', { cliente: cli });
      if (cli !== cliente()) return; // cambió de negocio mientras tanto
      resumen = r; pintarResumen();
    } catch (e) { if (S && !resumen) $('#r-error').textContent = e.message; }
  }
  function pintarResumen() {
    const r = resumen; if (!r) return;
    $('#r-error').textContent = '';
    $('#r-negocio').textContent = r.negocio || 'Tu negocio';
    $('#r-numero').textContent = r.numero ? 'WhatsApp ' + r.numero : '';
    const [txt, clase] = ESTADOS[r.estado] || ['En preparación', 'revision'];
    const e = $('#r-estado'); e.hidden = false; e.className = 'estado ' + clase; e.textContent = 'Bot: ' + txt;
    $('#r-pausar').hidden = r.estado !== 'activo';
    // Pausado por MyM por falta de pago (19/11/2026): no se puede prender desde acá; en lugar del botón, cómo regularizar.
    const porPago = r.estado === 'pausado' && !!r.pausa && r.pausa.motivo === 'falta_de_pago';
    $('#r-prender').hidden = !(r.estado === 'pausado' && r.puedePrender);
    $('#r-pausa-pago').hidden = !porPago;
    if (!charlas.length) pintarEspera(r.esperando || 0);
    // Avisos: se llenan con lo guardado, salvo que el dueño ya esté cambiando algo.
    if (!avisosTocado && r.avisos) { $('#avisos-email').value = r.avisos.email || ''; $('#avisos-si').checked = r.avisos.mailPersona !== false; pintarInterruptor(); }
  }
  function pintarEspera(n) {
    const p = $('#r-espera');
    p.textContent = n === 0 ? 'Nadie está esperando que le contestes.' : n === 1 ? '1 charla espera que le contestes vos.' : `${n} charlas esperan que les contestes vos.`;
    p.classList.toggle('hay', n > 0);
    const g = $('#globo-espera'); g.hidden = n === 0; g.textContent = n > 99 ? '99+' : String(n);
    $('#f-cuantas').textContent = n ? String(n) : '';
    document.title = (n ? `(${n}) ` : '') + TITULO;
  }
  async function cambiarBot(accion) {
    const b = accion === 'pausar' ? $('#r-pausar') : $('#r-prender');
    if (accion === 'pausar' && !(await confirmar('¿Pausar el bot?', 'El bot deja de contestar en todas las charlas hasta que lo prendas.', 'Sí, pausar el bot'))) return;
    b.disabled = true; $('#r-error').textContent = '';
    try {
      await api('/api/panel/bot', con({ accion }));
      tostada(accion === 'pausar' ? 'El bot quedó en pausa: no contesta hasta que lo prendas.' : 'Listo: el bot ya está contestando de nuevo.');
    } catch (e) { if (S) $('#r-error').textContent = e.message; }
    b.disabled = false;
    refrescarResumen();
  }
  $('#r-pausar').addEventListener('click', () => cambiarBot('pausar'));
  $('#r-prender').addEventListener('click', () => cambiarBot('prender'));

  function verSeccion(cual) {
    seccion = cual;
    for (const s of ['inicio', 'charlas', 'bot', 'seguimiento', 'pagos', 'avisos']) $('#s-' + s).hidden = s !== cual;
    document.querySelectorAll('.pestanas button').forEach((b) => { if (b.dataset.seccion === cual) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    if (cual === 'bot' && fichaDe !== cliente()) cargarFicha();
    if (cual === 'charlas') refrescarLista();
    if (cual === 'seguimiento') cargarSeguimiento();
    if (cual === 'inicio' || cual === 'pagos') refrescarCuenta();
    if (cual === 'inicio' && S) refrescarExtras();
  }

  // =====================================================================================
  // Inicio y Pagos (20/11/2026, pedido de Matías): lo contratado, el próximo pago, los pagos y las facturas.
  // Sólo lectura: lo carga MyM en su panel. Un cliente sin bot (sólo web o redes) no ve las pestañas del bot.
  // =====================================================================================
  const plata = (n) => '$ ' + Number(n || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 });
  const fecha = (iso) => { const d = new Date(String(iso).length === 10 ? iso + 'T12:00:00-03:00' : iso); return isNaN(d) ? '' : d.toLocaleDateString('es-AR', { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' }); };
  const ICONOS = {
    bot: '<path d="M12 4v4"/><rect x="4" y="8" width="16" height="11" rx="3"/><path d="M9 13h.01M15 13h.01"/>',
    web: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    redes: '<rect x="4" y="4" width="16" height="16" rx="5"/><circle cx="12" cy="12" r="3.5"/><path d="M17 7h.01"/>'
  };
  const ESTADO_BOT = { activo: ['Activo', ''], pausado: ['Pausado', 'pausa'], revision: ['En revisión', 'revision'] };
  const ESTADO_SERV = { 'en marcha': ['Activo', ''], 'en armado': ['En implementación', 'revision'], pausado: ['Pausado', 'pausa'] };
  const NOMBRE_SERV = { bot: 'Bot', web: 'Web', redes: 'Redes', otro: 'Otro servicio' };
  function icono(clave) {
    const sp = el('span', { class: 'ic', 'aria-hidden': 'true' });
    sp.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + (ICONOS[clave] || ICONOS.web) + '</svg>';
    return sp;
  }
  let pidiendoCuenta = false;
  async function refrescarCuenta() {
    const cli = cliente(); if (!cli || pidiendoCuenta) return;
    pidiendoCuenta = true;
    try {
      const r = await api('/api/panel/cuenta', { cliente: cli });
      if (cli !== cliente()) return;
      cuenta = r; $('#cuenta-error').textContent = ''; pintarCuenta();
    } catch (e) {
      if (S && !cuenta) $('#cuenta-error').textContent = e.status === 404 ? 'Esta sección todavía no está disponible. Para consultar tus pagos, contactanos.' : e.message;
    } finally { pidiendoCuenta = false; }
  }
  // Prueba gratis (21/11/2026, pedido de Matías): cuántos días le quedan y hasta cuándo, con una tira de un casillero
  // por día (los que ya pasaron, llenos). El servidor manda la cuenta hecha (prueba.js): acá no se calcula nada.
  function bloquePrueba(pr) {
    const usados = pr.porEmpezar ? 0 : pr.dias - pr.diasQuedan;
    const tira = el('ol', { class: 'dias' + (pr.dias > 31 ? ' sin-hueco' : ''), style: '--n:' + pr.dias, 'aria-hidden': 'true' });
    for (let i = 0; i < pr.dias; i++) tira.append(el('li', { class: i < usados ? 'ya' : i === usados && !pr.porEmpezar ? 'hoy' : '' }));
    const que = pr.porEmpezar ? `Tu prueba gratis empieza el ${fecha(pr.inicio)}`
      : pr.diasQuedan === 1 ? 'Hoy es tu último día gratis' : `Te quedan ${pr.diasQuedan} días`;
    return el('div', { class: 'gratis' },
      el('p', { class: 'que' }, que),
      tira,
      el('p', { class: 'chica' }, `${pr.dias} días sin cargo, hasta el ${fecha(pr.ultimoDia)} inclusive.`),
      // Budy, 24/11/2026: los días gratis son del bot y del seguimiento; la landing se cobra desde el primer día.
      ...((pr.sinPrueba || []).length ? [el('p', { class: 'chica' }, `Los días gratis son del bot y del seguimiento. ${pr.sinPrueba.join(', ')}: se cobra desde el primer día.`)] : []));
  }
  // Cómo pagar: el alias de MyM (el monto exacto llega por mail unos días antes) o, con Ualá, el link.
  function bloquePagar(cp) {
    if (!cp) return null;
    if (cp.medio !== 'transferencia') return el('div', { class: 'pagar' }, el('b', null, 'Cómo pagar'), el('p', { class: 'chica' }, 'Unos días antes del vencimiento te llega por mail el link de pago.'));
    const copiar = el('button', { class: 'btn-chico', type: 'button', onclick: (e) => {
      const b = e.currentTarget;
      navigator.clipboard.writeText(cp.alias).then(() => { b.textContent = 'Alias copiado'; setTimeout(() => { b.textContent = 'Copiar alias'; }, 2000); }).catch(() => {});
    } }, 'Copiar alias');
    return el('div', { class: 'pagar' },
      el('b', null, 'Cómo pagar'),
      el('p', { class: 'chica' }, 'Por transferencia al alias'),
      el('div', { class: 'alias-fila' }, el('span', { class: 'alias' }, cp.alias), copiar),
      el('p', { class: 'chica' }, `A nombre de ${cp.titular}${cp.banco ? ' (' + cp.banco + ')' : ''}. Unos días antes del vencimiento te llega por mail el monto exacto a transferir: con ese monto reconocemos tu pago solo.`));
  }
  function pintarCobro(caja, conDetalle) {
    vaciar(caja);
    const co = (cuenta && cuenta.cobro) || {};
    const pr = cuenta && cuenta.prueba; const px = cuenta && cuenta.proximo;
    const enPrueba = !!(pr && (pr.activa || pr.porEmpezar));
    if (!conDetalle) $('#caja-cobro-inicio .subtitulo').textContent = enPrueba ? 'Tu prueba gratis' : 'Próximo vencimiento';
    if (enPrueba) caja.append(bloquePrueba(pr));
    if (co.pendiente && co.pendiente.monto) {
      caja.append(el('div', { class: 'cobro' }, el('span', { class: 'grande' }, plata(co.pendiente.monto)), el('span', { class: 'chica' }, co.pendiente.detalle || 'Pago pendiente')));
      if (co.pendiente.link) caja.append(el('p', { style: 'margin:12px 0 0' }, el('a', { class: 'btn', href: co.pendiente.link, target: '_blank', rel: 'noopener' }, 'Pagar ahora')));
    } else if (px) {
      // Próximo vencimiento con el monto (con IVA, como lo acordado) y cómo pagarlo.
      const vencido = co.estado === 'vencido';
      if (!enPrueba) caja.append(el('div', { class: 'cobro' }, el('span', { class: 'estado' + (vencido ? ' pausa' : '') }, vencido ? 'Vencido' : 'Al día')));
      // Pago anual (24/11/2026): si paga por año, el monto es el del año (10 meses por 12); si ya pagó el año, se
      // muestra hasta cuándo y el próximo pago es sólo la IA del mes (si tiene bot).
      const abonoQue = px.anualHasta ? 'Abono' : px.anual ? (px.primerPago ? 'Primer año (12 meses por el precio de 10)' : 'Abono del año (12 meses por el precio de 10)') : px.primerPago ? 'Primer mes' : 'Abono del mes';
      const abonoCuanto = px.anualHasta ? 'Pago por año hasta el ' + fecha(px.anualHasta) : plata(px.monto) + ' con IVA';
      caja.append(el('dl', { class: 'vence' },
        el('dt', null, vencido ? 'Venció el' : px.primerPago ? 'Primer vencimiento' : 'Próximo vencimiento'), el('dd', null, fecha(px.vence)),
        el('dt', null, abonoQue), el('dd', null, abonoCuanto)));
      if (co.anual && Date.parse(co.anual.hasta) > Date.now()) caja.append(el('p', { class: 'chica', style: 'margin-top:6px' }, `Ya pagaste el abono por año: del ${fecha(co.anual.desde)} al ${fecha(co.anual.hasta)}.`));
      if (px.iaAparte) caja.append(el('p', { class: 'chica', style: 'margin-top:6px' }, (px.anualHasta ? 'Este mes pagás sólo la IA de tu Boti, según lo que use' : 'Más la IA de tu Boti según lo que use') + (px.iaDesde ? `, desde ${plata(px.iaDesde)} con IVA.` : '.') + (px.anual || px.anualHasta ? ' La IA se paga por mes, aunque el abono sea por año.' : '')));
      const pagar = bloquePagar(cuenta.comoPagar); if (pagar) caja.append(pagar);
    } else if (co.vence) {
      const vencido = co.estado === 'vencido';
      caja.append(el('div', { class: 'cobro' }, el('span', { class: 'estado' + (vencido ? ' pausa' : '') }, vencido ? 'Vencido' : 'Al día'), el('span', { class: 'chica' }, (vencido ? 'Venció el ' : 'Próximo vencimiento: ') + fecha(co.vence))));
    } else {
      caja.append(el('p', { class: 'chica' }, co.estado === 'al día' ? 'Tu cuenta está al día.' : 'No hay vencimientos programados.'));
    }
    if (conDetalle && co.medio) caja.append(el('p', { class: 'chica', style: 'margin-top:8px' }, 'Medio de pago: ' + co.medio));
    // Tu página web: la landing o la web que le hicimos (la carga MyM).
    if (!conDetalle && cuenta && cuenta.paginaWeb) {
      let host = cuenta.paginaWeb; try { host = new URL(cuenta.paginaWeb).host.replace(/^www\./, ''); } catch (e) { /* queda el link entero */ }
      caja.append(el('div', { class: 'mi-web' }, icono('web'),
        el('div', { class: 'tx' }, el('b', null, 'Tu página web'), el('span', { class: 'chica' }, host)),
        el('a', { class: 'btn-chico', href: cuenta.paginaWeb, target: '_blank', rel: 'noopener' }, 'Ver mi página')));
    }
  }
  function pintarCuenta() {
    if (!cuenta) return;
    const servicios = cuenta.servicios || [];
    const conBot = servicios.some((x) => x.clave === 'bot');
    document.body.classList.toggle('sin-bot', !conBot);
    if (!conBot && ['charlas', 'bot', 'seguimiento', 'avisos'].includes(seccion)) verSeccion('inicio');
    const caja = $('#servicios'); vaciar(caja);
    if (!servicios.length) caja.append(el('p', { class: 'chica' }, 'Todavía no hay servicios asociados a tu cuenta. Si ya contrataste, contactanos.'));
    for (const x of servicios) {
      // Sin estado cargado por MyM no se muestra ninguno: el panel no inventa en qué anda un servicio.
      const est = x.clave === 'bot' ? (ESTADO_BOT[x.estado] || ['En implementación', 'revision']) : ESTADO_SERV[x.estado];
      const det = x.clave === 'bot' ? (x.numero ? 'WhatsApp ' + x.numero : 'WhatsApp pendiente de conexión.') : (x.nota || '');
      const tx = el('div', { class: 'tx' }, el('b', null, x.nombre), det ? el('p', { class: 'chica' }, det) : null, est ? el('span', { class: 'estado ' + est[1] }, est[0]) : null);
      const acc = el('div', { class: 'acc' });
      if (x.clave === 'bot') acc.append(el('button', { class: 'btn-chico', type: 'button', onclick: () => verSeccion('charlas') }, 'Ver conversaciones'), el('button', { class: 'btn-chico', type: 'button', onclick: () => verSeccion('bot') }, 'Configurar'));
      if (x.link) acc.append(el('a', { class: 'btn-chico', href: x.link, target: '_blank', rel: 'noopener' }, x.grupo === 'web' ? 'Ver sitio' : 'Abrir'));
      if (acc.childNodes.length) tx.append(acc);
      caja.append(el('div', { class: 'serv' }, icono(x.grupo || x.clave), tx));
    }
    pintarCobro($('#cobro-inicio'), false); pintarCobro($('#cobro-pagos'), true);
    const co = cuenta.cobro || {};
    $('#globo-pago').hidden = !(co.estado === 'vencido' || (co.pendiente && co.pendiente.monto));
    const fl = $('#facturas'); vaciar(fl);
    const fs = cuenta.facturas || [];
    if (!fs.length) fl.append(el('li', { class: 'vacio' }, 'Todavía no hay comprobantes emitidos.'));
    for (const f of fs) {
      fl.append(el('li', null,
        el('div', { class: 'tx' }, el('b', null, f.etiqueta + (f.estado === 'anulada' ? ' (anulada)' : '')), el('small', null, fecha(f.fecha) + (f.descripcion ? ' · ' + f.descripcion : ''))),
        el('span', { class: 'monto' }, plata(f.total)),
        el('button', { class: 'btn-chico', type: 'button', onclick: (e) => bajarFactura(f, e.currentTarget) }, 'PDF')));
    }
    const pl = $('#pagos'); vaciar(pl);
    const ps = cuenta.pagos || [];
    if (!ps.length) pl.append(el('li', { class: 'vacio' }, 'Todavía no hay pagos registrados.'));
    for (const x of ps) {
      const medio = x.medio === 'aparte' ? ' · incluido en el contrato' : (x.medio ? ' · ' + x.medio : '');
      pl.append(el('li', null,
        el('div', { class: 'tx' }, el('b', null, x.concepto || NOMBRE_SERV[x.servicio] || 'Pago'), el('small', null, fecha(x.cuando) + medio)),
        el('span', { class: 'monto' }, x.monto == null ? '' : plata(x.monto))));
    }
  }
  async function bajarFactura(f, b) {
    b.disabled = true; const antes = b.textContent; b.textContent = '…';
    try {
      const blob = await api('/api/panel/factura', con({ factura: f.id }), { binario: true });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = f.etiqueta.replace(/[^\w-]+/g, '_') + '.pdf'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    } catch (e) { tostada(e.message, true); }
    b.disabled = false; b.textContent = antes;
  }


  // =====================================================================================
  // Inicio: lo que consume el Boti, el calendario de redes y el material (21/11/2026, pedido de Matías).
  // Tres pedidos sueltos: si uno falla o el servidor todavía no lo tiene, esa caja no aparece y el resto sigue.
  // El consumo y el material son sólo lectura. Cada publicación se toca y se abre entera, con Aprobar y Pedir un
  // cambio (pieza.js); el calendario completo sigue en el CRM para quien lo quiera.
  // =====================================================================================
  const WA = '11 3366-2080';
  const pes = (n) => plata(n).replace(' ', String.fromCharCode(160)); // el monto no se parte en dos renglones
  const numero = (n) => Number(n || 0).toLocaleString('es-AR');
  const diaMes = (iso) => { const d = new Date(String(iso).length === 10 ? iso + 'T12:00:00-03:00' : iso); return isNaN(d) ? '' : d.toLocaleDateString('es-AR', { timeZone: TZ, day: 'numeric', month: 'long' }); };
  const nombreMes = (p) => { const t = new Date(p + '-15T12:00:00-03:00').toLocaleDateString('es-AR', { timeZone: TZ, month: 'long', year: 'numeric' }); return t.charAt(0).toUpperCase() + t.slice(1); };
  let vueltaExtras = 0; let ultimaExtras = 0;
  function refrescarExtras(forzar) {
    const cli = cliente(); if (!cli) return;
    if (!forzar && Date.now() - ultimaExtras < 30000) return; // volver a Inicio no vuelve a pedir todo cada vez
    ultimaExtras = Date.now();
    const vuelta = ++vueltaExtras;
    const pedir = async (ruta, caja, pintar) => {
      try {
        const d = await api(ruta, { cliente: cli });
        if (vuelta !== vueltaExtras || cli !== cliente()) return; // cambió de negocio mientras tanto
        $(caja).hidden = !pintar(d);
      } catch (e) { if (S && vuelta === vueltaExtras) $(caja).hidden = true; }
    };
    if (forzar) for (const c of ['#caja-consumo', '#caja-calendario', '#caja-material']) $(c).hidden = true;
    pedir('/api/panel/consumo', '#caja-consumo', pintarConsumo);
    pedir('/api/panel/calendario', '#caja-calendario', pintarCalendario);
    pedir('/api/panel/material', '#caja-material', pintarMaterial);
  }

  // ---------- Consumo ----------
  const NOMBRE_TIPO_IA = { texto: ['respuesta', 'respuestas'], audio: ['audio', 'audios'], imagen: ['imagen', 'imágenes'], documento: ['documento', 'documentos'] };
  function pintarConsumo(d) {
    if (!d || !d.tieneBot) return false;
    const caja = $('#consumo'); vaciar(caja);
    const p = d.periodo || {};
    const iva = ' + IVA';
    caja.append(el('p', { class: 'paso' }, (p.desde ? `Desde el ${diaMes(p.desde)}` : 'En este período') + (p.vence ? `. El período cierra con tu próximo abono, el ${diaMes(p.vence)}.` : '.')));
    if (d.limite && d.limite.frenado) caja.append(el('p', { class: 'aviso mal' }, `Tu Boti llegó al límite de seguridad y dejó de contestar. Escribinos por WhatsApp al ${WA} y lo subimos.`));

    if (d.regla === 'incluida') {
      caja.append(el('div', { class: 'cifra' }, el('b', null, numero(p.respuestas)), el('span', null, p.respuestas === 1 ? 'respuesta del Boti' : 'respuestas del Boti')));
      caja.append(el('p', { class: 'lectura' }, 'La IA está incluida en tu precio acordado: no pagás nada aparte por lo que consume.'));
    } else {
      const conMinimo = d.regla === 'consumo' && p.incluido > 0;
      caja.append(el('div', { class: 'cifra' }, el('b', null, pes(p.consumo)), el('span', null, conMinimo ? `de ${pes(p.incluido)} incluidos en tu abono` : 'de IA, al costo')));
      if (conMinimo) {
        const pasado = p.extra > 0;
        // Dentro de lo incluido la barra entera es lo incluido; pasado, la barra es todo lo consumido y se parte en dos.
        const dentro = pasado ? Math.max(8, Math.round((p.incluido / p.consumo) * 100)) : Math.max(p.consumo > 0 ? 2 : 0, Math.min(100, p.avance || 0));
        const barra = el('div', { class: 'medidor', role: 'img', 'aria-label': pasado ? `Usaste todo lo incluido y ${pes(p.extra)} más` : `Usaste el ${p.avance || 0} % de lo incluido` },
          el('i', { class: 'dentro' + (pasado ? ' tope' : ''), style: `width:${dentro}%` }), pasado ? el('i', { class: 'extra', style: `width:${100 - dentro}%` }) : null);
        caja.append(barra, el('div', { class: 'medidor-pie' }, el('span', null, pasado ? `Incluido ${pes(p.incluido)}` : `${p.avance || 0} % usado`), el('span', { class: 'marca-incl' }, pasado ? `Extra ${pes(p.extra)}` : `Incluido ${pes(p.incluido)}`)));
      }
      caja.append(el('dl', { class: 'tres' },
        el('div', null, el('dt', null, 'Respuestas del Boti'), el('dd', null, numero(p.respuestas))),
        conMinimo ? el('div', null, el('dt', null, 'Incluido en tu abono'), el('dd', null, pes(p.incluido))) : null,
        conMinimo ? el('div', { class: p.extra > 0 ? 'pasado' : null }, el('dt', null, 'Extra hasta hoy'), el('dd', null, pes(p.extra))) : el('div', null, el('dt', null, 'IA hasta hoy'), el('dd', null, pes(p.aPagar)))));
      const lectura = !conMinimo ? `Pagás la IA al costo, sin mínimo: hasta hoy son ${pes(p.aPagar)}${iva}.`
        : p.extra > 0 ? `Te pasaste de lo incluido por ${pes(p.extra)}. Si el período cerrara hoy, la IA de tu próximo abono sería ${pes(p.aPagar)}${iva}, en lugar de ${pes(p.incluido)}${iva}.`
          : `Vas dentro de lo incluido: la IA de tu próximo abono es ${pes(p.incluido)}${iva}. Si el consumo pasa ese monto, se cobra lo consumido.`;
      caja.append(el('p', { class: 'lectura' }, lectura));
    }
    if (d.limite && !d.limite.frenado) caja.append(el('p', { class: 'chica' }, `Límite de seguridad: vas por el ${d.limite.porcentaje} %. Si llega al 100 %, el Boti deja de contestar hasta que lo subamos o se registre tu abono; al 80 % te avisamos por mail.`));
    if (p.porValorizar) caja.append(el('p', { class: 'chica', style: 'margin-top:6px' }, 'Hay consumo de los últimos días que todavía no pasamos a pesos. Se suma solo en cuanto tengamos la cotización.'));
    caja.append(el('p', { class: 'chica', style: 'margin-top:6px' }, `IA en uso: ${d.modelo === 'economico' ? 'económica' : 'recomendada'}. `, el('a', { href: '#', onclick: (e) => { e.preventDefault(); verSeccion('bot'); window.scrollTo(0, 0); } }, 'Cambiarla')));

    const meses = (d.meses || []).filter((m) => m.respuestas > 0);
    if (meses.length) {
      const tope = Math.max(...meses.map((m) => m.respuestas));
      const conPesos = meses.some((m) => m.consumo != null);
      const tb = el('tbody');
      for (const m of meses) {
        const partes = Object.entries(m.tipos || {}).filter(([k, n]) => n > 0 && NOMBRE_TIPO_IA[k]).map(([k, n]) => `${numero(n)} ${NOMBRE_TIPO_IA[k][n === 1 ? 0 : 1]}`);
        tb.append(el('tr', null,
          el('td', null, nombreMes(m.periodo), partes.length > 1 ? el('small', null, partes.join(' · ')) : null, el('i', { class: 'mini', style: `width:${Math.max(2, Math.round((m.respuestas / tope) * 100))}%`, 'aria-hidden': 'true' })),
          el('td', { class: 'cant' }, numero(m.respuestas)),
          conPesos ? el('td', { class: 'cant' }, m.consumo == null ? '' : pes(m.consumo)) : null));
      }
      caja.append(el('details', { class: 'meses' }, el('summary', null, 'Ver mes por mes'),
        el('table', null, el('thead', null, el('tr', null, el('th', null, 'Mes'), el('th', { class: 'cant' }, 'Respuestas'), conPesos ? el('th', { class: 'cant' }, 'Consumo') : null)), tb),
        el('p', { class: 'chica', style: 'margin-top:8px' }, `Por mes calendario${d.medidoDesde ? `, medido desde el ${diaMes(d.medidoDesde)}` : ''}. Tu abono se cobra por período de 30 días, así que no coincide justo con el mes.`)));
    }
    return true;
  }

  // ---------- Calendario de redes (viene del CRM de MyM) ----------
  const RED = { instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok', youtube: 'YouTube' };
  const FORMATO = { posteo: 'Posteo', carrusel: 'Carrusel', reel: 'Reel', historia: 'Historia', video: 'Video', short: 'Short' };
  const ESTADO_PIEZA = { esperando_ok: ['Espera tu OK', 'pausa'], programado: ['Programada', 'revision'], publicado: ['Publicada', ''], vencida: ['Venció sin aprobar', 'vencida'] };
  const estadoPieza = (x) => ESTADO_PIEZA[x.vencida ? 'vencida' : x.estado] || ['', ''];
  function miniPieza(x) {
    const hueco = () => { const s = el('span', { class: 'mini-pieza', 'aria-hidden': 'true' }); s.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 16l5-4 4 3 3-2 6 4"/></svg>'; return s; };
    let m = null;
    if (x.miniatura) m = el('img', { class: 'mini-pieza', src: x.miniatura, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' });
    else if (x.video) m = el('video', { class: 'mini-pieza', src: x.video + '#t=0.1', muted: true, playsinline: true, preload: 'metadata', 'aria-hidden': 'true', tabindex: '-1' });
    if (!m) return hueco();
    m.addEventListener('error', () => m.replaceWith(hueco()));
    return m;
  }
  function pintarCalendario(d) {
    if (!d || !d.conectado) return false;
    const caja = $('#calendario'); vaciar(caja);
    const abrir = (txt, clase) => el('a', { class: clase, href: d.link, target: '_blank', rel: 'noopener' }, txt);
    if (!d.disponible) {
      caja.append(el('p', { class: 'paso' }, 'Tu calendario de publicaciones está en el tablero de redes de MyM. Entrás con tu cuenta de Google.'),
        el('div', { class: 'fila-btns' }, abrir('Abrir mi calendario', 'btn sec')));
      return true;
    }
    const piezas = d.piezas || [];
    // Tocar una publicación la abre entera en esta misma página (pieza.js). Si ese archivo no cargó, queda el CRM.
    const visor = window.PiezaMyM;
    const ver = (x) => visor.abrir(x, piezas);
    const esperan = piezas.filter((x) => x.estado === 'esperando_ok' && !x.vencida);
    caja.append(el('p', { class: 'paso' }, visor ? 'Lo que te vamos a publicar en los próximos 14 días. Tocá una publicación para verla entera.' : 'Lo que te vamos a publicar en los próximos 14 días.'));
    if (esperan.length) caja.append(el('div', { class: 'aviso' }, esperan.length === 1 ? 'Hay 1 publicación que espera tu OK para salir.' : `Hay ${esperan.length} publicaciones que esperan tu OK para salir.`, el('br'),
      visor ? el('button', { class: 'btn', type: 'button', onclick: () => ver(esperan[0]) }, 'Revisar y aprobar') : abrir('Revisar y aprobar', 'btn')));
    if (!piezas.length) caja.append(el('p', { class: 'chica' }, 'Todavía no hay publicaciones cargadas para estos días. Cuando las armemos, aparecen acá.'));
    else {
      const ul = el('ul', { class: 'piezas' }); let previa = null;
      for (const x of piezas) {
        const f = new Date(x.fecha + 'T12:00:00-03:00');
        const est = estadoPieza(x);
        const datos = [x.hora, RED[x.red], FORMATO[x.formato]].filter(Boolean).join(' · ');
        const adentro = [
          el('span', { class: 'dia-caja' }, el('small', null, f.toLocaleDateString('es-AR', { timeZone: TZ, weekday: 'short' }).replace('.', '')), el('b', null, String(f.toLocaleDateString('es-AR', { timeZone: TZ, day: 'numeric' })))),
          miniPieza(x),
          el('span', { class: 'tx' }, el('b', null, x.titulo || 'Publicación'), datos ? el('small', null, datos) : null, el('span', { class: 'estado ' + est[1] }, est[0]))];
        const flecha = el('span', { class: 'ver-pieza', 'aria-hidden': 'true' }); flecha.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>';
        ul.append(el('li', { class: x.fecha === previa ? 'mismo-dia' : null },
          visor ? el('button', { class: 'pieza-fila', type: 'button', 'aria-haspopup': 'dialog', onclick: () => ver(x) }, adentro, flecha)
            : el('div', { class: 'pieza-fila' }, adentro),
          !visor && x.enlace ? el('a', { href: x.enlace, target: '_blank', rel: 'noopener' }, 'Ver publicada') : null));
        previa = x.fecha;
      }
      caja.append(ul);
    }
    caja.append(el('div', { class: 'fila-btns' }, abrir('Abrir mi calendario completo', 'btn-chico'), el('span', { class: 'chica' }, visor ? 'Es el tablero de redes de MyM: entrás con tu cuenta de Google.' : 'Entrás con tu cuenta de Google. Ahí aprobás o pedís cambios.')));
    return true;
  }
  // Lo que usa pieza.js (el visor de una publicación) de este archivo: los pedidos con la sesión, los avisos y los nombres.
  window.PanelMyM = {
    api: (ruta, cuerpo) => api(ruta, con(cuerpo)),
    tostada,
    negocio: () => { const c = S && S.clientes.find((k) => k.id === cliente()); return (c && c.negocio) || ''; },
    refrescarRedes: () => refrescarExtras(true),
    RED, FORMATO, estadoPieza
  };

  // ---------- Material: la carpeta de Drive compartida y el cuestionario ----------
  function pintarMaterial(d) {
    if (!d) return false;
    // 25/11/2026: el cuestionario tiene dos partes. Sin terminar la parte 1 se dice cuántos minutos faltan; después,
    // el mismo link sirve para «mejorar el Boti» (la parte 2, opcional) y para subir el logo y las fotos.
    const q = d.cuestionario; const falta = q && q.link && (!q.listo || q.faltan > 0 || q.opcionales > 0);
    const archivos = d.archivos || [];
    if (!d.carpeta && !archivos.length && !falta) return false;
    const caja = $('#material'); vaciar(caja);
    caja.append(el('p', { class: 'paso' }, 'El logo, las fotos y las listas de precios que nos mandaste para armar tu Boti, tu web y tus redes.'));
    if (falta) {
      const minutos = (m) => (m === 1 ? '1 minuto' : `unos ${m} minutos`);
      const texto = q.faltan > 0
        ? (q.porcentaje > 0 ? `Para prender tu Boti te faltan ${minutos(q.minutos)}.` : `Todavía no empezaste tu cuestionario: son ${minutos(q.minutos)}.`) + ' Con eso armamos lo que dice tu Boti.'
        : `Tu Boti ya tiene lo necesario. Si querés que atienda todavía mejor, quedan ${q.opcionales} preguntas opcionales (${minutos(q.minutosOpcionales)}). Ahí también subís el logo y las fotos.`;
      const boton = q.faltan > 0 ? (q.porcentaje > 0 ? 'Seguir el cuestionario' : 'Empezar el cuestionario') : 'Mejorar mi Boti';
      caja.append(el('div', { class: 'aviso' }, texto, el('br'), el('a', { class: 'btn', href: q.link, target: '_blank', rel: 'noopener' }, boton)));
    }
    if (archivos.length) {
      const ul = el('ul', { class: 'archivos' });
      for (const a of archivos) {
        const foto = el('span', { class: 'foto' }, /pdf/i.test(a.tipo || '') ? 'PDF' : '');
        ul.append(el('li', null, foto, el('small', { title: a.nombre }, a.nombre)));
        const cli = cliente();
        api('/api/panel/material/miniatura', { cliente: cli, archivo: a.id }, { binario: true }).then((blob) => {
          if (!foto.isConnected || !(blob instanceof Blob) || !/^image\//.test(blob.type)) return;
          vaciar(foto); foto.append(el('img', { src: URL.createObjectURL(blob), alt: a.nombre }));
        }).catch(() => { /* sin miniatura queda el recuadro con el nombre */ });
      }
      caja.append(ul);
      if (d.total > archivos.length) caja.append(el('p', { class: 'chica' }, `Y ${d.total - archivos.length} más en tu carpeta.`));
    } else if (d.carpeta) caja.append(el('p', { class: 'chica' }, 'Tu carpeta está armada y todavía no tiene archivos.'));
    if (d.carpeta) caja.append(el('div', { class: 'fila-btns' }, el('a', { class: 'btn sec', href: d.carpeta, target: '_blank', rel: 'noopener' }, 'Abrir mi carpeta de Drive'), el('span', { class: 'chica' }, 'Para sumar archivos, usá el cuestionario o mandalos por WhatsApp.')));
    return true;
  }


  // =====================================================================================
  // Seguimiento: la planilla de contactos con su estado (17/11/2026)
  let seg = null; let filtroSeg = 'todos';
  const NOMBRE_ESTADO = { 'en charla': 'En charla', esperando: 'En seguimiento', listo: 'Listo para avanzar', cerrado: 'Cerrado', perdido: 'Perdido', 'sin respuesta': 'Sin respuesta', 'no molestar': 'No quiere mensajes' };
  const fechaCorta = (iso) => (iso ? new Date(iso).toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');
  async function cargarSeguimiento() {
    const cli = cliente(); if (!cli) return;
    $('#seg-error').textContent = '';
    try { seg = await api('/api/panel/seguimiento', { cliente: cli }); if (cli === cliente()) pintarSeguimiento(); }
    catch (e) { $('#seg-error').textContent = e.message; }
  }
  function pintarSeguimiento() {
    if (!seg) return;
    const listos = seg.filas.filter((f) => f.estado === 'listo').length;
    const g = $('#globo-listos'); g.hidden = !listos; g.textContent = String(listos);
    if (!seg.incluido) $('#seg-explica').textContent = 'El seguimiento no está incluido en tu plan. Escribinos si lo querés sumar.';
    const p = seg.plantillas || {};
    const pend = Object.values(p).some((x) => x !== 'APPROVED');
    $('#seg-plantillas').textContent = seg.incluido ? (Object.keys(p).length && !pend ? 'Los mensajes de 3 y 7 días ya están aprobados por WhatsApp.' : 'Los mensajes de 3 y 7 días están en revisión de WhatsApp: hasta que los aprueben, sale sólo el de las 20 horas.') : '';
    const filas = seg.filas.filter((f) => filtroSeg === 'todos' || f.estado === filtroSeg);
    const tb = $('#seg-tabla tbody'); tb.textContent = '';
    for (const f of filas) {
      const tr = document.createElement('tr');
      const quien = document.createElement('td'); quien.innerHTML = '<b></b><small></small>'; quien.querySelector('b').textContent = f.nombre || 'Sin nombre'; quien.querySelector('small').textContent = ' ' + (f.numero || '');
      const est = document.createElement('td'); est.textContent = NOMBRE_ESTADO[f.estado] || f.estado; est.className = 'seg-' + f.estado.replace(/\s+/g, '-');
      const prox = document.createElement('td'); prox.textContent = f.proximo ? fechaCorta(f.proximo) : '—';
      const ult = document.createElement('td'); ult.textContent = fechaCorta(f.ultimo);
      const acc = document.createElement('td');
      const sel = document.createElement('select'); sel.setAttribute('aria-label', 'Cambiar el estado de ' + (f.nombre || 'este contacto'));
      for (const [v, t] of [['', 'Marcar como…'], ['cerrado', 'Cerrado (compró)'], ['perdido', 'Perdido'], ['no molestar', 'No escribirle más'], ['esperando', 'Volver a seguirlo']]) { const o = document.createElement('option'); o.value = v; o.textContent = t; sel.append(o); }
      sel.addEventListener('change', async () => {
        if (!sel.value) return;
        try { await api('/api/panel/seguimiento/estado', con({ contacto: f.id, estado: sel.value })); tostada('Listo, quedó marcado.'); cargarSeguimiento(); }
        catch (e) { tostada(e.message, true); sel.value = ''; }
      });
      const abrir = document.createElement('button'); abrir.type = 'button'; abrir.className = 'btn-chico'; abrir.textContent = 'Ver charla';
      abrir.addEventListener('click', () => { verSeccion('charlas'); irACharla(f.id); });
      acc.append(sel, abrir);
      tr.append(quien, est, prox, ult, acc); tb.append(tr);
    }
    const v = $('#seg-vacia'); v.hidden = filas.length > 0; v.textContent = 'Todavía no hay contactos en este grupo.';
  }
  document.querySelectorAll('[data-seg]').forEach((b) => b.addEventListener('click', () => {
    filtroSeg = b.dataset.seg;
    document.querySelectorAll('[data-seg]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    pintarSeguimiento();
  }));
  $('#seg-csv').addEventListener('click', () => {
    if (!seg) return;
    const q = (t) => '"' + String(t ?? '').replace(/"/g, '""') + '"';
    const lineas = [['Nombre', 'Número', 'Estado', 'Desde', 'Último mensaje', 'Próximo seguimiento', 'Seguimientos enviados', 'Motivo'].map(q).join(';')]
      .concat(seg.filas.map((f) => [f.nombre, f.numero, NOMBRE_ESTADO[f.estado] || f.estado, f.desde, f.ultimo, f.proximo, f.enviados, f.motivo].map(q).join(';')));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\ufeff' + lineas.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    a.download = 'seguimiento.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  });
  document.querySelectorAll('.pestanas button').forEach((b) => b.addEventListener('click', () => { verSeccion(b.dataset.seccion); window.scrollTo({ top: 0 }); }));

  // =====================================================================================
  // Lista de charlas
  // =====================================================================================
  let pidiendoLista = false;
  async function refrescarLista() {
    const cli = cliente(); if (!cli || pidiendoLista) return;
    pidiendoLista = true;
    try {
      const r = await api('/api/panel/charlas', { cliente: cli });
      if (cli === cliente()) { charlas = Array.isArray(r.charlas) ? r.charlas : []; $('#lista-error').textContent = ''; pintarLista(); pintarEspera(charlas.filter((c) => c.esperaPersona).length); }
    } catch (e) { if (S) $('#lista-error').textContent = charlas.length ? 'No pudimos actualizar las charlas. Seguimos probando…' : e.message; }
    pidiendoLista = false;
  }
  const nombreDe = (c) => c.nombre || c.numero || 'Sin nombre';
  function pintarLista() {
    const ul = $('#lista');
    const conFoco = document.activeElement && ul.contains(document.activeElement) ? document.activeElement.dataset.id : null;
    const arriba = ul.scrollTop;
    const ver = filtro === 'esperan' ? charlas.filter((c) => c.esperaPersona) : charlas;
    vaciar(ul);
    for (const c of ver) {
      const nombre = nombreDe(c); const inicial = (c.nombre || '').trim().charAt(0) || '#';
      const marcas = [c.esperaPersona && el('span', { class: 'marca roja' }, 'Te espera'), c.botCorridoHasta && el('span', { class: 'marca ambar' }, 'Bot en pausa en esta charla')].filter(Boolean);
      const clases = ['item', c.esperaPersona && 'espera', c.noLeidos > 0 && 'sin-leer', abierta && abierta.id === c.id && 'abierta'].filter(Boolean).join(' ');
      const leyenda = `${nombre}${c.esperaPersona ? ', te espera' : ''}${c.noLeidos > 0 ? `, ${c.noLeidos} sin leer` : ''}`;
      ul.append(el('li', {}, el('button', { type: 'button', class: clases, 'data-id': c.id, 'aria-label': leyenda, onclick: () => irACharla(c.id) },
        el('span', { class: 'avatar', 'aria-hidden': 'true' }, inicial),
        el('span', { class: 'item-cuerpo' },
          el('span', { class: 'item-arriba' }, el('b', {}, nombre), el('time', { datetime: c.ultimo || '' }, haceCuanto(c.ultimo))),
          el('span', { class: 'item-texto' }, c.ultimoTexto || ' '),
          marcas.length ? el('span', { class: 'marcas' }, marcas) : null),
        c.noLeidos > 0 ? el('span', { class: 'noleidos', 'aria-hidden': 'true' }, c.noLeidos > 99 ? '99+' : String(c.noLeidos)) : null)));
    }
    const vacia = $('#lista-vacia'); vacia.hidden = ver.length > 0;
    vacia.textContent = filtro === 'esperan' ? 'Nadie te está esperando. ¡Todo al día!' : 'Todavía no te escribió nadie. Cuando alguien le escriba a tu WhatsApp, la charla aparece acá.';
    ul.scrollTop = arriba;
    if (conFoco) { const b = [...ul.querySelectorAll('.item')].find((x) => x.dataset.id === conFoco); if (b) b.focus({ preventScroll: true }); }
  }
  document.querySelectorAll('.filtro').forEach((b) => b.addEventListener('click', () => {
    filtro = b.dataset.filtro;
    document.querySelectorAll('.filtro').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    pintarLista();
  }));

  // =====================================================================================
  // Charla abierta
  // =====================================================================================
  let abierta = null;            // { id, datos, firma }
  const nodos = new Map();       // clave del mensaje → su burbuja (para no redibujar lo que ya está, ni cortar un audio)
  const archivos = new Map();    // id del archivo → dirección temporal (se liberan al cambiar de charla)
  let mirador = null;            // carga las fotos cuando entran en pantalla
  let pidiendoCharla = false;

  const hashCharla = () => new URLSearchParams(location.hash.slice(1)).get('charla');
  const quitarHashCharla = () => { if (location.hash) history.replaceState(null, '', location.pathname + location.search); };
  // Abrir una charla suma un paso al historial: así el botón «atrás» del celular vuelve a la lista.
  function irACharla(id) {
    const destino = '#charla=' + encodeURIComponent(id);
    if (hashCharla() !== id) { if (hashCharla()) history.replaceState({ panel: 1 }, '', destino); else history.pushState({ panel: 1 }, '', destino); }
    abrirCharla(id);
  }
  $('#volver').addEventListener('click', () => {
    if (history.state && history.state.panel) history.back();
    else { quitarHashCharla(); cerrarCharla(); }
  });
  function alCambiarDireccion() {
    const h = new URLSearchParams(location.hash.slice(1));
    if (h.get('t')) return canjear(h.get('t'));
    if (!S) return;
    const id = h.get('charla');
    if (!id) { if (abierta) cerrarCharla(); } else if (!abierta || abierta.id !== id) abrirDesdeLink(id);
  }
  window.addEventListener('popstate', alCambiarDireccion);
  window.addEventListener('hashchange', alCambiarDireccion);

  function cerrarCharla() {
    abierta = null;
    for (const u of archivos.values()) URL.revokeObjectURL(u);
    archivos.clear(); nodos.clear();
    if (mirador) { mirador.disconnect(); mirador = null; }
    vaciar($('#mensajes')); quitarAdjunto(); $('#texto').value = ''; ajustarAlto();
    $('#c-error').textContent = ''; $('#c-acc-error').textContent = '';
    $('#charla-abierta').hidden = true; $('#charla-vacia').hidden = false; $('#charla-vacia').textContent = 'Elegí una charla de la lista para verla acá.';
    document.body.classList.remove('en-charla');
    document.querySelectorAll('.item.abierta').forEach((x) => x.classList.remove('abierta'));
  }

  // El mail de aviso trae #charla=ID&c=NEGOCIO: se busca primero en ese negocio y, si no está, en los otros.
  async function abrirDesdeLink(id) {
    const delLink = new URLSearchParams(location.hash.slice(1)).get('c');
    const orden = [...new Set([delLink, cliente(), ...S.clientes.map((c) => c.id)].filter((x) => x && S.clientes.some((c) => c.id === x)))];
    for (const cli of orden) {
      try {
        const d = await api('/api/panel/charla', { cliente: cli, contacto: id });
        if (!S) return;
        if (cli !== cliente()) cambiarNegocio(cli);
        if (hashCharla() !== id) history.replaceState(history.state, '', '#charla=' + encodeURIComponent(id));
        verSeccion('charlas'); abrirCharla(id, d);
        return;
      } catch (e) { if (!S) return; if (e.status !== 404 && e.status !== 403) { tostada(e.message, true); return; } }
    }
    quitarHashCharla(); tostada('No encontramos esa charla.', true);
  }

  async function abrirCharla(id, datos) {
    if (abierta && abierta.id !== id) cerrarCharla();
    if (!abierta) {
      abierta = { id, datos: null, firma: '' };
      const previa = charlas.find((c) => c.id === id);
      $('#c-nombre').textContent = previa ? nombreDe(previa) : 'Charla'; $('#c-numero').textContent = previa && previa.nombre ? previa.numero || '' : '';
      vaciar($('#c-marcas')); vaciar($('#c-botones')); $('#c-cerrada').hidden = true;
      vaciar($('#mensajes')); $('#mensajes').append(el('p', { class: 'dia' }, 'Cargando la charla…'));
      $('#charla-vacia').hidden = true; $('#charla-abierta').hidden = false;
      document.body.classList.add('en-charla');
      document.querySelectorAll('.item').forEach((x) => x.classList.toggle('abierta', x.dataset.id === id));
    }
    if (datos) pintarCharla(datos, true); else await refrescarCharla(true);
  }

  async function refrescarCharla(primera) {
    if (!abierta || pidiendoCharla) return;
    const id = abierta.id; const cli = cliente(); pidiendoCharla = true;
    try {
      const d = await api('/api/panel/charla', { cliente: cli, contacto: id });
      if (abierta && abierta.id === id && cli === cliente()) pintarCharla(d, primera);
    } catch (e) {
      if (S && abierta && abierta.id === id && !abierta.datos) { vaciar($('#mensajes')); $('#mensajes').append(el('p', { class: 'aviso mal' }, e.message)); }
    }
    pidiendoCharla = false;
  }

  function pintarCharla(d, primera) {
    abierta.datos = d;
    $('#c-nombre').textContent = nombreDe(d); $('#c-numero').textContent = d.nombre ? d.numero || '' : '';
    // Marcas y botones: solo se rearman si cambió algo (así no se pierde el foco con cada actualización).
    const firma = [d.esperaPersona, d.esperaPersona && haceCuanto(d.esperaDesde), d.botCorridoHasta, d.ventanaAbierta].join('|');
    if (firma !== abierta.firma) {
      abierta.firma = firma;
      const m = $('#c-marcas'); vaciar(m);
      if (d.esperaPersona) m.append(el('span', { class: 'marca roja' }, 'Te espera' + (d.esperaDesde ? ' · ' + haceCuanto(d.esperaDesde) : '')));
      if (d.botCorridoHasta) m.append(el('span', { class: 'marca ambar' }, 'El bot no contesta acá hasta ' + hastaCuando(d.botCorridoHasta)));
      const b = $('#c-botones'); vaciar(b);
      if (d.esperaPersona) b.append(el('button', { type: 'button', class: 'btn listo', onclick: () => accionCharla('listo') }, 'Ya lo atendí'));
      if (d.botCorridoHasta) b.append(el('button', { type: 'button', class: 'btn sec', onclick: () => accionCharla('devolver') }, 'Devolverle la charla al bot'));
      else b.append(el('button', { type: 'button', class: 'btn sec', onclick: () => accionCharla('tomar') }, 'Que el bot no conteste acá'));
      const abiertaV = !!d.ventanaAbierta;
      $('#c-cerrada').hidden = abiertaV;
      for (const x of [$('#texto'), $('#clip'), $('#enviar')]) x.disabled = !abiertaV;
      $('#texto').placeholder = abiertaV ? 'Escribí tu respuesta' : 'No se le puede escribir todavía';
    }
    pintarMensajes(Array.isArray(d.historial) ? d.historial : [], primera);
    // Al abrirla, el servidor la da por leída: se refleja en la lista sin esperar.
    const enLista = charlas.find((c) => c.id === d.id);
    if (enLista && enLista.noLeidos) { enLista.noLeidos = 0; pintarLista(); }
  }

  async function accionCharla(accion) {
    if (!abierta) return;
    const id = abierta.id; const botones = [...document.querySelectorAll('#c-botones button')];
    botones.forEach((b) => { b.disabled = true; }); $('#c-acc-error').textContent = '';
    try {
      await api('/api/panel/bot-charla', con({ contacto: id, accion }));
      tostada({ listo: 'Listo: la charla quedó como atendida.', tomar: 'Listo: el bot no contesta en esta charla.', devolver: 'Listo: el bot vuelve a contestar en esta charla.' }[accion]);
    } catch (e) { if (S) $('#c-acc-error').textContent = e.message; }
    botones.forEach((b) => { b.disabled = false; });
    await refrescarCharla(); refrescarLista();
  }

  // ---------- Mensajes ----------
  // Convierte los links de un texto en links de verdad (solo http y https); el resto queda como texto.
  function conLinks(texto) {
    const partes = String(texto).split(/(https?:\/\/[^\s<>"'()]+)/g);
    return partes.map((p, i) => {
      if (i % 2 === 0) return p;
      const cola = (p.match(/[.,;:!?]+$/) || [''])[0]; const url = cola ? p.slice(0, -cola.length) : p;
      return [el('a', { href: url, target: '_blank', rel: 'noopener noreferrer' }, url), cola];
    }).flat();
  }
  const ETIQUETA_DE = (x) => (x.de === 'bot' ? 'Bot' : x.por === 'celular' ? 'Vos, desde el celular' : 'Vos');
  const SIN_TEXTO = { sticker: 'Sticker', reaction: 'Reacción', location: 'Ubicación', contacts: 'Contacto', interactive: 'Eligió una opción', button: 'Tocó un botón' };

  function pintarMensajes(historial, primera) {
    const caja = $('#mensajes');
    const abajo = primera || caja.scrollHeight - caja.scrollTop - caja.clientHeight < 90;
    if (!mirador && 'IntersectionObserver' in window) {
      mirador = new IntersectionObserver((entradas) => { for (const e of entradas) if (e.isIntersecting) { mirador.unobserve(e.target); if (e.target._cargar) e.target._cargar(); } }, { root: caja, rootMargin: '300px 0px' });
    }
    // Lista de lo que tiene que verse (separadores de día + burbujas), reutilizando lo que ya está en pantalla.
    const orden = []; const vistas = new Map(); let dia = '';
    for (const x of historial) {
      const d = new Date(x.cuando); const k = isNaN(d) ? '' : diaClave(d);
      if (k && k !== dia) { dia = k; orden.push(['dia|' + k, () => el('p', { class: 'dia' }, nombreDia(d))]); }
      let clave = [x.cuando, x.de, x.tipo, x.media ? x.media.id : '', x.transcripcion ? 1 : 0, x.audio || '', (x.texto || '').length].join('|');
      const n = (vistas.get(clave) || 0) + 1; vistas.set(clave, n); if (n > 1) clave += '|' + n;
      orden.push([clave, () => burbuja(x)]);
    }
    if (!historial.length) orden.push(['vacia', () => el('p', { class: 'dia' }, 'Todavía no hay mensajes en esta charla.')]);
    const quedan = new Set(orden.map((o) => o[0]));
    for (const [k, nodo] of nodos) if (!quedan.has(k)) { nodo.remove(); nodos.delete(k); }
    const propios = new Set(nodos.values()); [...caja.children].forEach((n) => { if (!propios.has(n)) n.remove(); }); // «Cargando…» y avisos
    orden.forEach(([k, armar], i) => {
      let nodo = nodos.get(k); if (!nodo) { nodo = armar(); nodos.set(k, nodo); }
      if (caja.children[i] !== nodo) caja.insertBefore(nodo, caja.children[i] || null);
    });
    if (abajo) caja.scrollTop = caja.scrollHeight;
  }

  function burbuja(x) {
    const mia = x.de !== 'cliente';
    const b = el('div', { class: 'burbuja ' + (mia ? 'mia' : 'suya') });
    if (mia) b.append(el('span', { class: 'quien' }, ETIQUETA_DE(x)));
    else b.append(el('span', { class: 'oculto' }, 'Cliente: '));
    if (x.media && x.media.id) b.append(cajaArchivo(x));
    if (x.texto) b.append(el('p', { class: 'txt' }, conLinks(x.texto)));
    // Audios que llegaron con el bot cortado (19/11/2026): quedan sin transcribir hasta que el bot vuelve a contestar;
    // si WhatsApp ya no los tiene (los guarda 7 días), quedan vencidos.
    const AUDIO = { 'sin transcribir': '🎤 Audio sin transcribir: llegó con el bot sin contestar. Se transcribe solo cuando el bot vuelve a andar; mientras tanto podés escucharlo.', vencido: '🎤 Audio vencido: WhatsApp ya no lo tenía y no se pudo transcribir.' };
    if (x.tipo === 'audio' || x.transcripcion) b.append(el('p', { class: 'transc' }, x.transcripcion ? '🎤 Transcripción: ' + x.transcripcion : AUDIO[x.audio] || '🎤 Este audio no tiene transcripción.'));
    if (!x.texto && !x.transcripcion && !(x.media && x.media.id)) b.append(el('p', { class: 'txt vacio' }, SIN_TEXTO[x.tipo] ? `${SIN_TEXTO[x.tipo]} (sin texto)` : 'Mensaje que no se puede mostrar acá. Miralo en tu WhatsApp.'));
    const d = new Date(x.cuando);
    if (!isNaN(d)) b.append(el('time', { class: 'hora', datetime: x.cuando }, hora(d)));
    return b;
  }

  // ---------- Archivos: se piden recién cuando hacen falta ----------
  async function traerArchivo(m) {
    if (archivos.has(m.id)) return archivos.get(m.id);
    const id = abierta && abierta.id; if (!id) throw new Error('La charla se cerró.');
    const blob = await api('/api/panel/media', con({ contacto: id, media: m.id }), { binario: true });
    if (!abierta || abierta.id !== id) throw new Error('La charla se cerró.');
    const u = URL.createObjectURL(blob); archivos.set(m.id, u); return u;
  }
  const pegadoAbajo = () => { const c = $('#mensajes'); return c.scrollHeight - c.scrollTop - c.clientHeight < 140; };
  function cajaArchivo(x) {
    const m = x.media; const caja = el('div', { class: 'media' });
    const nombre = m.nombre || { image: 'foto', audio: 'audio', video: 'video', sticker: 'sticker' }[x.tipo] || 'archivo';
    const fallo = (e, reintentar) => { vaciar(caja); caja.append(el('p', { class: 'media-error' }, 'No se pudo abrir: ' + ((e && e.message) || 'probá de nuevo.')), el('button', { type: 'button', class: 'media-btn', onclick: reintentar }, 'Probar de nuevo')); };
    const cargando = (txt) => { vaciar(caja); caja.append(el('div', { class: x.tipo === 'image' ? 'media-hueco' : 'chica' }, txt)); };
    const enlaceBajar = (u, txt) => el('a', { class: 'media-btn', href: u, download: nombre }, txt);

    if (x.tipo === 'image' || x.tipo === 'sticker') {
      // Fotos y stickers: se cargan solos cuando entran en pantalla (o al tocar, si el navegador es viejo).
      const cargar = async () => {
        cargando(x.tipo === 'sticker' ? 'Cargando…' : 'Cargando la foto…');
        try {
          const u = await traerArchivo(m); const abajo = pegadoAbajo();
          const img = el('img', { src: u, alt: x.tipo === 'sticker' ? 'Sticker' : 'Foto' + (x.texto ? ': ' + x.texto : ''), class: x.tipo === 'sticker' ? 'sticker' : '' });
          img.addEventListener('load', () => { if (abajo) $('#mensajes').scrollTop = $('#mensajes').scrollHeight; });
          img.addEventListener('error', () => fallo(new Error('este teléfono no puede mostrar esta imagen.'), cargar));
          vaciar(caja);
          caja.append(x.tipo === 'sticker' ? img : el('a', { href: u, target: '_blank', rel: 'noopener', 'aria-label': 'Ver la foto en grande' }, img));
        } catch (e) { if (S) fallo(e, cargar); }
      };
      const hueco = el('button', { type: 'button', class: 'media-btn', onclick: cargar }, x.tipo === 'sticker' ? '🖼 Ver sticker' : '🖼 Ver foto');
      caja.append(hueco);
      if (mirador) { hueco._cargar = cargar; mirador.observe(hueco); }
    } else if (x.tipo === 'audio') {
      const cargar = async () => {
        cargando('Cargando el audio…');
        try {
          const u = await traerArchivo(m);
          const a = el('audio', { controls: true, preload: 'metadata', src: u });
          a.addEventListener('error', () => { vaciar(caja); caja.append(el('p', { class: 'media-error' }, 'Este teléfono no puede reproducir el audio. Podés leer la transcripción o descargarlo.'), enlaceBajar(u, '⬇ Descargar el audio')); });
          vaciar(caja); caja.append(a); a.play().catch(() => { /* si el navegador no deja arrancar solo, toca play */ });
        } catch (e) { if (S) fallo(e, cargar); }
      };
      caja.append(el('button', { type: 'button', class: 'media-btn', onclick: cargar }, m.voz ? '▶ Escuchar el audio' : '▶ Escuchar'));
    } else if (x.tipo === 'video') {
      const cargar = async () => {
        cargando('Cargando el video… puede tardar un poco.');
        try {
          const u = await traerArchivo(m);
          const v = el('video', { controls: true, playsinline: true, preload: 'metadata', src: u });
          v.addEventListener('error', () => { vaciar(caja); caja.append(el('p', { class: 'media-error' }, 'Este teléfono no puede reproducir el video. Podés descargarlo.'), enlaceBajar(u, '⬇ Descargar el video')); });
          vaciar(caja); caja.append(v);
        } catch (e) { if (S) fallo(e, cargar); }
      };
      caja.append(el('button', { type: 'button', class: 'media-btn', onclick: cargar }, '▶ Ver video'));
    } else {
      const cargar = async () => {
        cargando('Preparando el archivo…');
        try {
          const u = await traerArchivo(m);
          vaciar(caja);
          caja.append(el('a', { class: 'media-btn', href: u, target: '_blank', rel: 'noopener' }, '📄 Abrir ' + nombre), enlaceBajar(u, '⬇ Descargar'));
        } catch (e) { if (S) fallo(e, cargar); }
      };
      caja.append(el('button', { type: 'button', class: 'media-btn', onclick: cargar }, '📄 Abrir o descargar: ' + nombre));
    }
    return caja;
  }

  // ---------- Contestar ----------
  let adjunto = null; // File
  const pesoLindo = (n) => (n >= 1048576 ? (n / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');
  function quitarAdjunto() { adjunto = null; $('#archivo').value = ''; $('#adjunto').hidden = true; $('#adjunto-nombre').textContent = ''; }
  function ajustarAlto() { const t = $('#texto'); t.style.height = ''; if (t.value) t.style.height = Math.min(t.scrollHeight + 2, 140) + 'px'; }
  $('#clip').addEventListener('click', () => $('#archivo').click());
  $('#adjunto-quitar').addEventListener('click', () => { quitarAdjunto(); $('#texto').focus(); });
  $('#archivo').addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0]; $('#c-error').textContent = '';
    if (!f) return;
    if (f.size > MAX_ARCHIVO) { quitarAdjunto(); $('#c-error').textContent = `Ese archivo pesa ${pesoLindo(f.size)}: el máximo es 12 MB. Probá con uno más liviano.`; return; }
    if (!f.size) { quitarAdjunto(); $('#c-error').textContent = 'Ese archivo está vacío.'; return; }
    adjunto = f; $('#adjunto-nombre').textContent = `📎 ${f.name} (${pesoLindo(f.size)})`; $('#adjunto').hidden = false;
  });
  $('#texto').addEventListener('input', ajustarAlto);
  // En la compu, Enter manda y Mayúsculas+Enter baja de renglón. En el celular, Enter baja de renglón.
  $('#texto').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && !(window.matchMedia && window.matchMedia('(pointer:coarse)').matches)) { e.preventDefault(); $('#redactar').requestSubmit(); }
  });
  const aBase64 = (archivo) => new Promise((ok, mal) => {
    const l = new FileReader();
    l.onload = () => ok(String(l.result).split(',')[1] || '');
    l.onerror = () => mal(new Error('No se pudo leer el archivo. Probá de nuevo.'));
    l.readAsDataURL(archivo);
  });
  const MIME_POR_EXT = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', pdf: 'application/pdf', mp4: 'video/mp4', mp3: 'audio/mpeg', ogg: 'audio/ogg', m4a: 'audio/mp4', aac: 'audio/aac' };
  let enviando = false;
  $('#redactar').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!abierta || enviando) return;
    const txt = $('#texto').value.trim(); const err = $('#c-error'); const id = abierta.id;
    if (!txt && !adjunto) { err.textContent = 'Escribí algo o adjuntá un archivo.'; $('#texto').focus(); return; }
    enviando = true; err.textContent = ''; $('#enviar').disabled = true; $('#clip').disabled = true;
    try {
      const cuerpo = con({ contacto: id, texto: txt });
      if (adjunto) cuerpo.adjunto = { nombre: adjunto.name, mime: adjunto.type || MIME_POR_EXT[(adjunto.name.split('.').pop() || '').toLowerCase()] || 'application/octet-stream', datos: await aBase64(adjunto) };
      await api('/api/panel/responder', cuerpo);
      if (abierta && abierta.id === id) { $('#texto').value = ''; ajustarAlto(); quitarAdjunto(); }
    } catch (e2) { if (S && abierta && abierta.id === id) err.textContent = e2.message; }
    enviando = false;
    if (abierta && abierta.id === id) {
      abierta.firma = ''; // que se rearmen botones y caja con lo que diga el servidor
      await refrescarCharla(true); refrescarLista();
      if (abierta && abierta.datos && abierta.datos.ventanaAbierta) { $('#enviar').disabled = false; $('#clip').disabled = false; }
    }
  });

  // =====================================================================================
  // Lo que dice tu bot: ficha, pruebas y chat de ensayo
  // =====================================================================================
  const ficha = $('#ficha'); let fichaDe = null;
  function marcarObligatorios(lista) {
    ficha.querySelectorAll('.oblig').forEach((x) => x.remove());
    for (const campo of ficha.elements) if (campo.name) { campo.removeAttribute('aria-required'); }
    for (const k of lista) {
      const campo = ficha.elements[k]; if (!campo) continue;
      campo.setAttribute('aria-required', 'true');
      const rot = campo.closest('label').querySelector('.rot');
      if (rot) rot.append(el('span', { class: 'oblig', 'aria-hidden': 'true' }, '*'));
    }
  }
  async function cargarFicha() {
    const cli = cliente(); if (!cli) return;
    $('#ficha-carga').textContent = ''; $('#ficha-error').textContent = ''; vaciar($('#ficha-resultado')); $('#caja-pruebas').hidden = true;
    ficha.querySelectorAll('.falta').forEach((x) => { x.classList.remove('falta'); x.removeAttribute('aria-invalid'); });
    $('#ficha-guardar').disabled = true;
    try {
      const r = await api('/api/panel/ficha', { cliente: cli });
      if (cli !== cliente()) return;
      for (const campo of ficha.elements) if (campo.name) campo.value = campo.name === 'modelo' ? 'recomendado' : '';
      for (const [k, v] of Object.entries(r.ficha || {})) if (ficha.elements[k] && v != null && v !== '') ficha.elements[k].value = v;
      marcarObligatorios(Array.isArray(r.obligatorios) ? r.obligatorios : ['rubro', 'queVende', 'precios', 'horarios', 'derivarA']);
      $('#ficha-version').textContent = r.version ? `Tu bot va por la versión ${r.version}.` : 'Tu bot todavía no está armado.';
      fichaDe = cli; $('#ficha-guardar').disabled = false;
      if (!$('#chat').children.length) reiniciarEnsayo();
    } catch (e) { if (S) $('#ficha-carga').textContent = e.message + ' Recargá la página para probar de nuevo.'; }
  }
  ficha.addEventListener('input', (e) => { e.target.classList.remove('falta'); e.target.removeAttribute('aria-invalid'); });
  ficha.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (fichaDe !== cliente()) return;
    const b = $('#ficha-guardar'); const err = $('#ficha-error'); const res = $('#ficha-resultado');
    b.disabled = true; b.textContent = 'Probando tu bot con los datos nuevos… (puede tardar un minuto)'; err.textContent = ''; vaciar(res);
    ficha.querySelectorAll('.falta').forEach((x) => { x.classList.remove('falta'); x.removeAttribute('aria-invalid'); });
    try {
      const r = await api('/api/panel/ficha/guardar', con({ ficha: Object.fromEntries(new FormData(ficha).entries()) }));
      res.append(el('p', { class: 'aviso bien' }, 'Listo: tu bot ya usa estos datos.'));
      if (r.version) $('#ficha-version').textContent = `Tu bot va por la versión ${r.version}.`;
      mostrarPruebas(r.pruebas, true); reiniciarEnsayo();
    } catch (e2) {
      if (!S) return;
      const d = e2.datos || {};
      if (Array.isArray(d.faltan) && d.faltan.length) {
        err.textContent = 'Completá los campos marcados con * que quedaron en rojo.';
        d.faltan.forEach((k) => { const c = ficha.elements[k]; if (c) { c.classList.add('falta'); c.setAttribute('aria-invalid', 'true'); } });
        const primero = ficha.elements[d.faltan[0]]; if (primero) primero.focus();
      } else if (d.pruebas) {
        res.append(el('p', { class: 'aviso mal' }, (e2.message || 'El bot no pasó las pruebas.') + ' Tu bot sigue como estaba.'));
        mostrarPruebas(d.pruebas, false); $('#caja-pruebas').scrollIntoView({ block: 'start' });
      } else err.textContent = e2.message;
    }
    b.disabled = false; b.textContent = 'Guardar y probar mi bot';
  });
  function mostrarPruebas(p, aplicado) {
    const caja = $('#caja-pruebas');
    if (!p || !Array.isArray(p.resultados)) { caja.hidden = true; return; }
    caja.hidden = false;
    const resu = $('#resumen-pruebas'); vaciar(resu);
    resu.append(el('b', {}, p.aprobadas === p.total ? `Pasó las ${p.total} pruebas.` : `Pasó ${p.aprobadas} de ${p.total} pruebas.`), aplicado ? ' Le hicimos preguntas típicas y revisamos que no invente precios ni promociones y que pase a una persona cuando se lo piden.' : ' Corregí los datos y guardá de nuevo.');
    const lista = $('#lista-pruebas'); vaciar(lista);
    for (const r of p.resultados) {
      lista.append(el('div', { class: 'prueba' },
        el('span', { class: 'tilde ' + (r.ok ? 'si' : 'no'), role: 'img', 'aria-label': r.ok ? 'Bien' : 'Falló' }, r.ok ? '✓' : '!'),
        el('div', {}, el('div', { class: 'b-cli' }, r.pregunta || ''), el('div', { class: 'b-bot' }, r.respuesta || ''), el('div', { class: 'control' }, r.ok ? 'Bien: ' + (r.espera || '') : 'Falló: ' + (r.motivo || '')))));
    }
  }

  let historialEnsayo = [];
  function reiniciarEnsayo() { historialEnsayo = []; const c = $('#chat'); vaciar(c); c.append(el('div', { class: 'b-bot' }, 'Escribime como si fueras un cliente.')); }
  $('#ensayo-borrar').addEventListener('click', () => { reiniciarEnsayo(); $('#txt-ensayo').focus(); });
  $('#form-ensayo').addEventListener('submit', async (e) => {
    e.preventDefault();
    const campo = $('#txt-ensayo'); const t = campo.value.trim(); if (!t) return;
    const chat = $('#chat'); const b = $('#btn-ensayo'); const cli = cliente();
    campo.value = ''; b.disabled = true;
    chat.append(el('div', { class: 'b-cli' }, t));
    const espera = el('div', { class: 'b-bot' }, 'Escribiendo…'); chat.append(espera); chat.scrollTop = chat.scrollHeight;
    try {
      const r = await api('/api/panel/ensayo', { cliente: cli, texto: t, historial: historialEnsayo });
      if (cli !== cliente()) return;
      historialEnsayo.push({ de: 'cliente', texto: t }, { de: 'bot', texto: r.respuesta || '' });
      espera.textContent = r.respuesta || '(sin respuesta)';
      if (r.pasar) chat.append(el('div', { class: 'b-nota' }, 'Acá el bot te pasaría la charla a vos.'));
    } catch (e2) { espera.textContent = e2.message; }
    b.disabled = false; chat.scrollTop = chat.scrollHeight; campo.focus();
  });

  // =====================================================================================
  // Avisos
  // =====================================================================================
  let avisosTocado = false;
  function pintarInterruptor() { $('#avisos-estado').textContent = $('#avisos-si').checked ? 'Prendido: te avisamos al instante.' : 'Apagado: no te mandamos mails.'; }
  $('#avisos-si').addEventListener('change', () => { avisosTocado = true; pintarInterruptor(); $('#avisos-ok').textContent = ''; });
  $('#avisos-email').addEventListener('input', () => { avisosTocado = true; $('#avisos-ok').textContent = ''; });
  $('#form-avisos').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('#avisos-email').value.trim(); const err = $('#avisos-error'); const b = $('#avisos-guardar'); const si = $('#avisos-si').checked;
    $('#avisos-ok').textContent = '';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { err.textContent = 'Revisá el mail: parece que le falta algo.'; $('#avisos-email').focus(); return; }
    b.disabled = true; b.textContent = 'Guardando…'; err.textContent = '';
    try {
      await api('/api/panel/avisos', con({ email, mailPersona: si }));
      avisosTocado = false;
      $('#avisos-ok').textContent = si ? `Listo: te avisamos a ${email}.` : 'Listo: no te vamos a mandar avisos por mail.';
      refrescarResumen();
    } catch (e2) { if (S) err.textContent = e2.message; }
    b.disabled = false; b.textContent = 'Guardar';
  });

  // =====================================================================================
  // Actualización sola (mientras la pestaña está a la vista) y arranque
  // =====================================================================================
  const aLaVista = () => document.visibilityState === 'visible';
  let vueltas = 0;
  setInterval(() => { if (!S || !aLaVista()) return; refrescarLista(); if (++vueltas % 3 === 0) refrescarResumen(); }, 20000);
  setInterval(() => { if (S && aLaVista() && abierta) refrescarCharla(); }, 10000);
  document.addEventListener('visibilitychange', () => { if (S && aLaVista()) { refrescarLista(); refrescarResumen(); if (abierta) refrescarCharla(); } });

  if (!API) { mostrarEntrada('El panel se está terminando de preparar. Mientras tanto, escribinos por WhatsApp al 11 3366-2080.'); $('#form-entrar').hidden = true; return; }
  const h0 = new URLSearchParams(location.hash.slice(1));
  if (h0.get('charla') && !S && !h0.get('t')) guardar(CLAVE_CHARLA, h0.get('charla')); // se abre después de entrar
  if (h0.get('t')) canjear(h0.get('t'));
  else if (S) mostrarPanel(h0.get('charla'));
  else mostrarEntrada(h0.get('charla') ? 'Para ver esa charla, primero entrá con tu mail.' : '');
})();
