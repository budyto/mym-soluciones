// Alta de clientes de la plataforma de bots de MyM Soluciones (14/11/2026).
// 1) Datos del negocio → el servidor crea la ficha y devuelve una llave de alta (solo sirve para este alta).
// 2) Botón «Conectar WhatsApp»: registro insertado de Meta (código por FB.login; cuenta y número por mensaje).
// 3) Ficha completa del negocio: se guarda sola mientras escribís; la IA puede armar un borrador desde la web o Instagram.
// 4) El bot se arma solo, pasa 6 pruebas y el dueño lo prueba en un chat.
// 5) El dueño lo aprueba y queda para la revisión de MyM (modo espectador).
// 17/11/2026 (Matías): quien no se lleva con la tecnología elige «Que lo arme MyM» y no configura nada; con su link,
// MyM completa la ficha antes de conectar el WhatsApp. El pago es por transferencia.
(function () {
  'use strict';
  const cfg = window.SITE || {};
  const META = { appId: '1446343080591411', configId: '4643639185915736', version: 'v23.0' };
  const local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const qApi = new URLSearchParams(location.search).get('api');
  const API = String((local && qApi) || cfg.plataformaApi || '').replace(/\/+$/, '');
  const $ = (s) => document.querySelector(s);
  const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  // La llave del alta se guarda en este navegador para poder seguir después; también va en el link para retomar.
  const guardarSesion = (v) => { try { localStorage.setItem('alta-mym', JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } };
  const leerSesion = () => { try { return JSON.parse(localStorage.getItem('alta-mym') || 'null'); } catch (e) { return null; } };
  const h = new URLSearchParams(location.hash.slice(1));
  // Botón «Seguir» del WhatsApp (25/11/2026): llega con «?c=…&k=…» porque Meta no deja «#» en la variable del botón.
  const qAlta = new URLSearchParams(location.search);
  if (!h.get('c') && qAlta.get('c') && qAlta.get('k')) { h.set('c', qAlta.get('c')); h.set('k', qAlta.get('k')); qAlta.delete('c'); qAlta.delete('k'); history.replaceState(null, '', location.pathname + (qAlta.toString() ? '?' + qAlta : '')); }
  if (h.get('c') && h.get('k')) { guardarSesion({ id: h.get('c'), llave: h.get('k') }); history.replaceState(null, '', location.pathname + location.search); }
  let sesion = leerSesion();

  function verPaso(n) {
    ['paso1', 'paso2', 'paso3', 'paso4', 'paso5'].forEach((id, i) => $('#' + id).classList.toggle('ver', i === n - 1));
    $('#paso-mym').classList.toggle('ver', n === 'mym');
    $('#paso-servicios').classList.toggle('ver', n === 'servicios');
    document.querySelectorAll('.pasos-alta li').forEach((li, i) => li.classList.toggle('si', i < n));
    window.scrollTo({ top: 0 });
  }
  async function api(ruta, cuerpo) {
    const r = await fetch(API + ruta, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
    let d = {}; try { d = await r.json(); } catch (e) { /* sin cuerpo */ }
    if (!r.ok) { const e = new Error(d.error || 'No se pudo completar el paso. Probá de nuevo en un rato.'); e.datos = d; throw e; }
    return d;
  }
  const conLlave = (x = {}) => ({ cliente: sesion.id, llave: sesion.llave, ...x });

  if (!API) {
    $('#estado').innerHTML = '<p class="aviso">El alta automática se está terminando de preparar. Mientras tanto, escribinos por WhatsApp al 11 3366-2080 y lo hacemos con vos.</p>';
    $('#paso1').querySelector('button').disabled = true;
    return;
  }

  // ---------- Al entrar: si ya hay un alta empezada, se sigue donde quedó ----------
  async function retomar() {
    if (!sesion) return verPaso(1);
    try {
      const v = await api('/api/ficha/obtener', conLlave());
      conectado = !!(v.whatsapp && v.whatsapp.conectado);
      // Lo arma MyM: se puede completar la ficha antes de conectar el número (el número se conecta en la llamada).
      if (!conectado && v.armadoPor !== 'mym' && !['aprobar', 'pruebas', 'revision', 'activo', 'pausado'].includes(v.estado)) return verPaso(2);
      // Aprobó sin conectar el WhatsApp (25/11/2026): el Boti se prende solo apenas lo conecta.
      if (!conectado && v.estado === 'revision') { $('#aviso2').hidden = false; return verPaso(2); }
      if (['revision', 'activo', 'pausado'].includes(v.estado)) return mostrarListo(v.estado);
      if (v.estado === 'pago') return mostrarPago();
      if (['pruebas', 'aprobar'].includes(v.estado) && v.pruebas) { mostrarPruebas(v); return verPaso(4); }
      cargarFicha(v); verPaso(3);
    } catch (e) {
      if (e.datos && e.datos.error) { sesion = null; guardarSesion(null); verPaso(1); return; } // la llave ya no vale
      $('#paso1').classList.remove('ver'); // no mostrar el primer paso a quien ya lo hizo
      $('#estado').innerHTML = '<p class="aviso">No pudimos conectarnos para seguir tu alta. Revisá tu conexión y recargá la página.</p>';
    }
  }

  // ---------- Paso 1: datos ----------
  $('#paso1').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target; const fd = new FormData(f); const d = Object.fromEntries(fd.entries());
    if (d.web) return; // trampa anti-spam
    const servicios = [...fd.getAll('servicio'), fd.get('redes')].filter(Boolean);
    const falta = ['negocio', 'contacto', 'email', 'celular'].find((k) => !String(d[k] || '').trim());
    if (falta) { $('#error1').textContent = 'Completá todos los datos para seguir.'; f[falta].focus(); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email)) { $('#error1').textContent = 'Revisá el mail: parece que le falta algo.'; f.email.focus(); return; }
    if (!servicios.length) { $('#error1').textContent = 'Elegí al menos un servicio.'; return; }
    // Datos para la factura (17/11/2026): con ellos, la factura del primer pago sale sola. Las reglas son las de ARCA.
    const nro = String(d.doc_nro || '').replace(/\D/g, '');
    if (!d.condicion_iva) { $('#error1').textContent = 'Elegí tu condición frente al IVA (es para la factura).'; f.condicion_iva.focus(); return; }
    if (['MT', 'RI'].includes(d.condicion_iva) && nro.length !== 11) { $('#error1').textContent = 'Con Monotributo o Responsable Inscripto la factura va con tu CUIT (11 números).'; f.doc_nro.focus(); return; }
    if (!(nro.length === 11 || nro.length === 7 || nro.length === 8)) { $('#error1').textContent = 'Revisá el CUIT (11 números) o el DNI (7 u 8).'; f.doc_nro.focus(); return; }
    const b = f.querySelector('button'); b.disabled = true; b.textContent = 'Guardando…'; $('#error1').textContent = '';
    try {
      const fiscal = { nombre: String(d.razon_social || '').trim() || (nro.length === 11 ? d.negocio : d.contacto), doc_nro: nro, condicion_iva: d.condicion_iva, domicilio: d.domicilio };
      const r = await api('/api/alta', { negocio: d.negocio, contacto: d.contacto, email: d.email, celular: d.celular, servicios, modo: d.modo, fiscal, pagoAnual: d.pago === 'anual' });
      if (r.sinBot) {
        // Sin bot no hay alta que seguir: se muestra lo pedido y MyM le escribe.
        const p = r.precio || {}; const $p = (n) => '$ ' + Number(n || 0).toLocaleString('es-AR');
        // Pago anual (24/11/2026): el abono del año es 10 abonos y cubre 12 meses.
        const abonoTxt = p.pagoAnual ? `${$p(p.abonoAnual)} + IVA por año (12 meses por el precio de 10)` : `${$p(p.abono)} + IVA por mes`;
        $('#resumen-servicios').textContent = `Pediste ${p.nombre}: ${p.instalacion ? 'instalación ' + $p(p.instalacion) + ' + IVA y ' : ''}${abonoTxt}${(p.aCotizar || []).length ? `. ${p.aCotizar.join(', ')}: te pasamos el precio después del diagnóstico` : ''}.`;
        return verPaso('servicios');
      }
      sesion = { id: r.cliente, llave: r.llave }; guardarSesion(sesion);
      verPaso(r.armadoPor === 'mym' ? 'mym' : 2);
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

  window.addEventListener('message', (ev) => {
    if (!/^https:\/\/(www\.|web\.)?facebook\.com$/.test(ev.origin)) return;
    let d; try { d = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data; } catch (e) { return; }
    if (!d || d.type !== 'WA_EMBEDDED_SIGNUP') return;
    if (d.event === 'FINISH' || d.event === 'FINISH_ONLY_WABA' || d.event === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING') { datosWa = { waba_id: d.data && d.data.waba_id, phone_number_id: d.data && d.data.phone_number_id }; terminarConexion(); }
    else if (d.event === 'CANCEL') $('#error2').textContent = 'Se cerró la ventana de Meta antes de terminar' + (d.data && d.data.current_step ? ` (en el paso «${d.data.current_step}»)` : '') + '. Tocá «Conectar WhatsApp» para seguir.';
    else if (d.event === 'ERROR') $('#error2').textContent = 'Meta avisó un error: ' + ((d.data && d.data.error_message) || 'sin detalle') + '. Probá de nuevo o escribinos.';
  });

  // Coexistencia: si el negocio ya usa la app WhatsApp Business, conecta ese mismo número y la sigue usando.
  const tipoNumero = () => (document.querySelector('input[name=tipoNumero]:checked') || {}).value || 'app';
  document.querySelectorAll('input[name=tipoNumero]').forEach((r) => r.addEventListener('change', () => { $('#req-app').hidden = tipoNumero() !== 'app'; $('#req-nuevo').hidden = tipoNumero() === 'app'; }));
  $('#conectar').addEventListener('click', () => {
    $('#error2').textContent = ''; codigo = null; datosWa = null;
    window.FB.login((resp) => {
      if (resp && resp.authResponse && resp.authResponse.code) { codigo = resp.authResponse.code; terminarConexion(); }
      else if (!datosWa) $('#error2').textContent = 'No se completó la conexión con Meta. Tocá «Conectar WhatsApp» para probar de nuevo.';
    }, { config_id: META.configId, response_type: 'code', override_default_response_type: true, extras: { setup: {}, featureType: tipoNumero() === 'app' ? 'whatsapp_business_app_onboarding' : '', sessionInfoVersion: '3' } });
  });

  async function terminarConexion() {
    if (!codigo || !datosWa || enviando) return;
    if (!datosWa.phone_number_id) { $('#error2').textContent = 'Meta conectó la cuenta pero no el número. Volvé a tocar «Conectar WhatsApp» y elegí el número del negocio.'; return; }
    if (!sesion) { verPaso(1); return; }
    enviando = true; const b = $('#conectar'); b.disabled = true; b.lastChild.textContent = 'Conectando tu número…';
    try {
      const r = await api('/api/meta/registro', conLlave({ code: codigo, waba_id: datosWa.waba_id, phone_number_id: datosWa.phone_number_id, coexistencia: tipoNumero() === 'app' }));
      conectado = true;
      $('#titulo3').textContent = `Tu WhatsApp ${r.numero || ''} quedó conectado`.replace('  ', ' ');
      await retomar();
    } catch (err) { $('#error2').textContent = err.message; }
    enviando = false; b.disabled = false; b.lastChild.textContent = 'Conectar WhatsApp';
  }

  // ---------- Paso 3: la ficha, con guardado automático ----------
  const ficha = $('#ficha');
  let conectado = false;
  function cargarFicha(v) {
    $('#falta-wa').hidden = conectado;
    $('#sello3').style.display = conectado ? '' : 'none';
    if (!conectado) $('#titulo3').textContent = `Contanos de ${v.negocio || 'tu negocio'}`;
    const datos = { ...(v.borrador || {}), ...(v.ficha || {}) };
    for (const [k, val] of Object.entries(datos)) if (ficha.elements[k]) ficha.elements[k].value = val;
    const link = `${location.origin}${location.pathname}#c=${encodeURIComponent(sesion.id)}&k=${encodeURIComponent(sesion.llave)}`;
    $('#link-seguir').innerHTML = `Para seguir desde otra compu o el celular, guardá este link (es solo tuyo, no lo compartas): <a href="${esc(link)}">${esc(link.slice(0, 60))}…</a>`;
  }
  const datosFicha = () => Object.fromEntries(new FormData(ficha).entries());
  let temporizador = null;
  async function guardarYa() {
    clearTimeout(temporizador);
    try { const r = await api('/api/ficha/guardar', conLlave({ ficha: datosFicha() })); $('#guardado').textContent = `Guardado ${new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}${r.faltan.length ? '' : ' · ya tenés todo lo obligatorio'}`; }
    catch (e) { $('#guardado').textContent = 'No se pudo guardar: revisá tu conexión.'; }
  }
  ficha.addEventListener('input', (e) => { e.target.classList.remove('sugerido'); $('#guardado').textContent = 'Guardando…'; clearTimeout(temporizador); temporizador = setTimeout(guardarYa, 1500); });

  $('#ia-btn').addEventListener('click', async () => {
    const b = $('#ia-btn'); const url = $('#ia-url').value.trim(); const txt = $('#ia-texto').value.trim();
    if (!url && !txt) { $('#error-ia').textContent = 'Pegá el link de tu web o de tu Instagram, o el texto.'; return; }
    b.disabled = true; b.textContent = 'Leyendo…'; $('#error-ia').textContent = '';
    try {
      const r = await api('/api/ficha/sugerir', conLlave(txt ? { texto: txt } : { url }));
      let n = 0;
      for (const [k, val] of Object.entries(r.borrador || {})) {
        const el = ficha.elements[k];
        if (el && val && !el.value.trim()) { el.value = val; el.classList.add('sugerido'); n++; }
      }
      $('#error-ia').textContent = n ? '' : 'No encontramos datos nuevos para completar. Completalos a mano.';
      if (n) { $('#guardado').textContent = `La IA completó ${n} campo${n === 1 ? '' : 's'} (en verde). Revisalos y corregí lo que haga falta.`; guardarYa(); }
    } catch (e) { $('#error-ia').textContent = e.message; }
    b.disabled = false; b.textContent = 'Armar borrador';
  });

  ficha.addEventListener('submit', async (e) => {
    e.preventDefault();
    const b = $('#armar'); b.disabled = true; b.textContent = 'Armando tu bot y probándolo…'; $('#error3').textContent = '';
    try { const v = await api('/api/ficha/terminar', conLlave({ ficha: datosFicha() })); mostrarPruebas(v); verPaso(4); }
    catch (err) {
      const faltan = (err.datos && err.datos.faltan) || [];
      $('#error3').textContent = faltan.length ? 'Completá los campos marcados con *.' : err.message;
      if (faltan[0] && ficha.elements[faltan[0]]) ficha.elements[faltan[0]].focus();
    }
    b.disabled = false; b.textContent = 'Armar mi bot y probarlo';
  });

  // ---------- Paso 4: pruebas, ensayo y aprobación ----------
  function mostrarPruebas(v) {
    const p = v.pruebas;
    $('#resumen-pruebas').innerHTML = p.aprobadas === p.total
      ? `<b>Pasó las ${p.total} pruebas.</b> Le hicimos preguntas típicas y revisamos que no invente precios ni promociones y que pase a una persona cuando se lo piden.`
      : `<b>Pasó ${p.aprobadas} de ${p.total} pruebas.</b> Corregí los datos de tu negocio y lo armamos de nuevo.`;
    $('#lista-pruebas').innerHTML = p.resultados.map((r) => `<div class="prueba"><span class="tilde ${r.ok ? 'si' : 'no'}">${r.ok ? '✓' : '!'}</span><div><div class="b-cli">${esc(r.pregunta)}</div><div class="b-bot">${esc(r.respuesta)}</div><div class="control">${r.ok ? 'Bien: ' + esc(r.espera) : 'Falló: ' + esc(r.motivo)}</div></div></div>`).join('');
    $('#aprobar').hidden = v.estado !== 'aprobar';
    historial = [];
    $('#chat').innerHTML = '<div class="b-bot">Escribime como si fueras un cliente.</div>';
  }
  let historial = [];
  // Cada charla nueva cambia de ronda: si llega tarde la respuesta de la charla anterior, no se mezcla con la nueva.
  let ronda = 0;
  // Empezar una charla nueva sin recargar la página (pedido de Budy, 25/11/2026: para probar otro caso desde cero,
  // por ejemplo después de que el bot pasó la charla a una persona). La charla de prueba vive sólo en esta página.
  $('#reiniciar-ensayo').addEventListener('click', () => {
    ronda++;
    historial = [];
    $('#chat').innerHTML = '<div class="b-bot">Escribime como si fueras un cliente.</div>';
    $('#txt-ensayo').value = '';
    $('#txt-ensayo').focus();
  });
  $('#form-ensayo').addEventListener('submit', async (e) => {
    e.preventDefault();
    const t = $('#txt-ensayo').value.trim(); if (!t) return;
    $('#txt-ensayo').value = '';
    const chat = $('#chat');
    chat.insertAdjacentHTML('beforeend', `<div class="b-cli">${esc(t)}</div>`); chat.scrollTop = chat.scrollHeight;
    const miRonda = ronda;
    try {
      const r = await api('/api/ensayo', conLlave({ historial, texto: t }));
      if (miRonda !== ronda) return;
      historial.push({ de: 'cliente', texto: t }, { de: 'bot', texto: r.respuesta });
      chat.insertAdjacentHTML('beforeend', `<div class="b-bot">${esc(r.respuesta)}</div>`);
    } catch (err) { if (miRonda !== ronda) return; chat.insertAdjacentHTML('beforeend', `<div class="b-bot">${esc(err.message)}</div>`); }
    chat.scrollTop = chat.scrollHeight;
  });
  $('#aprobar').addEventListener('click', async () => {
    const b = $('#aprobar'); b.disabled = true; $('#error4').textContent = '';
    try {
      const r = await api('/api/aprobar', conLlave());
      if (r.estado === 'pago') mostrarPago(r);
      // Le falta conectar el WhatsApp: se lo pedimos ahora; apenas lo conecta, se prende solo.
      else if (r.estado === 'revision' && (r.falta || []).includes('whatsapp')) { $('#aviso2').hidden = false; verPaso(2); }
      else mostrarListo(r.estado);
    } catch (e) { $('#error4').textContent = e.message; }
    b.disabled = false;
  });
  $('#corregir').addEventListener('click', async () => { try { cargarFicha(await api('/api/ficha/obtener', conLlave())); } catch (e) { /* sigue igual */ } verPaso(3); });

  // ---------- Paso 5: pago con Ualá (si el cobro está prendido) y confirmación ----------
  // Prendido (25/11/2026: se prende solo cuando tiene el WhatsApp conectado y está aprobado) o esperando a MyM.
  function mostrarListo(estado) {
    const prendido = estado === 'activo' || estado === 'pausado';
    $('#listo-prendido').hidden = !prendido; $('#listo-revision').hidden = prendido;
    $('#caja-pago').hidden = true; $('#caja-listo').hidden = false; verPaso(5);
  }
  let consultas = 0;
  async function mostrarPago(datos) {
    $('#caja-listo').hidden = true; $('#caja-pago').hidden = false; verPaso(5);
    let p = datos;
    if (!p || !p.link) { try { const e = await api('/api/pago/estado', conLlave()); if (e.estado !== 'pago') return mostrarListo(); p = e.cobro && e.cobro.pendiente; } catch (err) { return; } }
    if (!p) return;
    $('#detalle-pago').textContent = p.detalle || '';
    $('#monto-pago').textContent = '$ ' + Number(p.monto).toLocaleString('es-AR');
    // Solo se abre un link de Ualá.
    if (/^https:\/\/([\w-]+\.)*(ua\.la|uala\.com\.ar)\//.test(p.link)) $('#link-pago').href = p.link; else $('#link-pago').hidden = true;
    if (new URLSearchParams(location.search).get('pago') === 'ok') esperarPago();
  }
  async function esperarPago() {
    $('#esperando-pago').hidden = false;
    if (consultas++ > 40) return;
    try { const e = await api('/api/pago/estado', conLlave()); if (e.estado !== 'pago') return mostrarListo(); } catch (err) { /* reintenta */ }
    setTimeout(esperarPago, 3000);
  }
  if (new URLSearchParams(location.search).get('pago') === 'error') $('#estado').innerHTML = '<p class="aviso">El pago no se completó. Podés intentarlo de nuevo con el botón de abajo.</p>';

  // La promo del Paquete completo ($ 200.000 + IVA hasta el 30/11/2026) se sacó el 18/11/2026 (Matías): a quien ya la vio se le respeta a mano.
  $('#adelantar').addEventListener('click', (e) => { e.preventDefault(); retomar(); });
  $('#ir-conectar').addEventListener('click', (e) => { e.preventDefault(); verPaso(2); });

  retomar();
})();
