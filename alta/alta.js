// Alta de clientes de la plataforma de bots de MyM Soluciones (14/11/2026).
// 1) Datos del negocio → el servidor crea la ficha y devuelve una llave de alta (solo sirve para este alta).
// 2) Botón «Conectar WhatsApp»: registro insertado de Meta. Meta devuelve un código (por FB.login) y, por
//    mensaje de ventana, la cuenta de WhatsApp (waba_id) y el número (phone_number_id).
// 3) Se le manda todo al servidor, que canjea el código, suscribe la app, registra el número y lo guarda.
//    Nada de esto necesita que una persona de MyM haga algo a mano.
(function () {
  'use strict';
  const cfg = window.SITE || {};
  const META = { appId: '1446343080591411', configId: '4643639185915736', version: 'v23.0' };
  // En la compu se puede probar contra un servidor local con ?api=http://localhost:8080 (solo en localhost).
  const local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const qApi = new URLSearchParams(location.search).get('api');
  const API = String((local && qApi) || cfg.plataformaApi || '').replace(/\/+$/, '');
  const $ = (s) => document.querySelector(s);

  const guardar = (k, v) => { try { sessionStorage.setItem('alta:' + k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } };
  const leer = (k) => { try { return JSON.parse(sessionStorage.getItem('alta:' + k) || 'null'); } catch (e) { return null; } };

  function verPaso(n) {
    ['paso1', 'paso2', 'paso3'].forEach((id, i) => $('#' + id).classList.toggle('ver', i === n - 1));
    document.querySelectorAll('.pasos-alta li').forEach((li, i) => li.classList.toggle('si', i < n));
  }
  async function api(ruta, cuerpo) {
    const r = await fetch(API + ruta, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
    let d = {}; try { d = await r.json(); } catch (e) { /* sin cuerpo */ }
    if (!r.ok) throw new Error(d.error || 'No se pudo completar el paso. Probá de nuevo en un rato.');
    return d;
  }

  if (!API) {
    $('#estado').innerHTML = '<p class="aviso">El alta automática se está terminando de preparar. Mientras tanto, escribinos por WhatsApp al 11 3366-2080 y lo hacemos con vos.</p>';
    $('#paso1').querySelector('button').disabled = true;
    return;
  }

  // ---------- Paso 1: datos ----------
  const alta = leer('cliente');
  if (alta) verPaso(alta.conectado ? 3 : 2);
  $('#paso1').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target; const d = Object.fromEntries(new FormData(f).entries());
    if (d.web) return; // trampa anti-spam
    const falta = ['negocio', 'contacto', 'email', 'celular'].find((k) => !String(d[k] || '').trim());
    if (falta) { $('#error1').textContent = 'Completá todos los datos para seguir.'; f[falta].focus(); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email)) { $('#error1').textContent = 'Revisá el mail: parece que le falta algo.'; f.email.focus(); return; }
    const b = f.querySelector('button'); b.disabled = true; b.textContent = 'Guardando…'; $('#error1').textContent = '';
    try {
      const r = await api('/api/alta', { negocio: d.negocio, contacto: d.contacto, email: d.email, celular: d.celular, plan: d.plan });
      guardar('cliente', { id: r.cliente, llave: r.llave, conectado: false });
      verPaso(2);
    } catch (err) { $('#error1').textContent = err.message; }
    b.disabled = false; b.textContent = 'Seguir';
  });

  // ---------- Paso 2: registro insertado de Meta ----------
  let codigo = null; let datosWa = null; let enviando = false;
  window.fbAsyncInit = function () {
    window.FB.init({ appId: META.appId, autoLogAppEvents: true, xfbml: false, version: META.version });
    $('#conectar').disabled = false;
  };
  const s = document.createElement('script');
  s.async = true; s.defer = true; s.crossOrigin = 'anonymous'; s.src = 'https://connect.facebook.net/es_LA/sdk.js';
  s.onerror = () => { $('#error2').textContent = 'No se pudo cargar la ventana de Meta. Revisá tu conexión o si tenés un bloqueador de anuncios, y recargá la página.'; };
  document.head.appendChild(s);

  // Meta avisa por mensaje de ventana qué cuenta y qué número eligió la persona.
  window.addEventListener('message', (ev) => {
    if (!/^https:\/\/(www\.|web\.)?facebook\.com$/.test(ev.origin)) return;
    let d; try { d = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data; } catch (e) { return; }
    if (!d || d.type !== 'WA_EMBEDDED_SIGNUP') return;
    if (d.event === 'FINISH' || d.event === 'FINISH_ONLY_WABA') { datosWa = { waba_id: d.data && d.data.waba_id, phone_number_id: d.data && d.data.phone_number_id }; terminar(); }
    else if (d.event === 'CANCEL') $('#error2').textContent = 'Se cerró la ventana de Meta antes de terminar' + (d.data && d.data.current_step ? ` (en el paso «${d.data.current_step}»)` : '') + '. Tocá «Conectar WhatsApp» para seguir.';
    else if (d.event === 'ERROR') $('#error2').textContent = 'Meta avisó un error: ' + ((d.data && d.data.error_message) || 'sin detalle') + '. Probá de nuevo o escribinos.';
  });

  $('#conectar').addEventListener('click', () => {
    $('#error2').textContent = ''; codigo = null; datosWa = null;
    window.FB.login((resp) => {
      if (resp && resp.authResponse && resp.authResponse.code) { codigo = resp.authResponse.code; terminar(); }
      else if (!datosWa) $('#error2').textContent = 'No se completó la conexión con Meta. Tocá «Conectar WhatsApp» para probar de nuevo.';
    }, {
      config_id: META.configId,
      response_type: 'code',
      override_default_response_type: true,
      extras: { setup: {}, featureType: '', sessionInfoVersion: '3' }
    });
  });

  // Hacen falta las dos cosas: el código (FB.login) y la cuenta y el número (mensaje de ventana).
  async function terminar() {
    if (!codigo || !datosWa || enviando) return;
    if (!datosWa.phone_number_id) { $('#error2').textContent = 'Meta conectó la cuenta pero no el número. Volvé a tocar «Conectar WhatsApp» y elegí el número del negocio.'; return; }
    const cli = leer('cliente'); if (!cli) { verPaso(1); return; }
    enviando = true; const b = $('#conectar'); b.disabled = true; b.lastChild.textContent = 'Conectando tu número…';
    try {
      await api('/api/meta/registro', { cliente: cli.id, llave: cli.llave, code: codigo, waba_id: datosWa.waba_id, phone_number_id: datosWa.phone_number_id });
      guardar('cliente', { ...cli, conectado: true });
      verPaso(3);
    } catch (err) { $('#error2').textContent = err.message; }
    enviando = false; b.disabled = false; b.lastChild.textContent = 'Conectar WhatsApp';
  }
})();
