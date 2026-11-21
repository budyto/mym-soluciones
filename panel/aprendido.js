// «Lo que aprendió tu bot» en el panel del cliente (21/11/2026, pedido de Matías).
// El dueño ve, sólo de su negocio: lo que su bot aprendió y ya usa (por tema, con la fecha y de dónde salió, y lo
// deshace con un toque), lo que espera la revisión de MyM (precios, promesas, datos de cobro: aprobar es de MyM, acá
// sólo se mira) y, en cada mensaje del bot de una charla, el botón «Esta respuesta está mal» → «La correcta es…».
// El servidor (plataforma-bots/servidor/aprendizaje.js) decide qué negocio ve cada sesión: /api/panel/aprendido,
// /api/panel/aprendido/deshacer y /api/panel/corregir.
//
// Va en un archivo aparte para no tocar panel.js: se cuelga de lo que panel.js ya dibuja (las secciones, las
// pestañas, las burbujas de la charla) y usa su misma sesión (localStorage «panel-mym»). No agrega una pestaña: se
// entra desde «Inicio» y desde «Lo que dice tu bot», y el número de lo que espera revisión se ve en la pestaña del bot.
// Regla de seguridad: todo lo que viene del servidor se pone como texto (nodos de texto), nunca como HTML.
(function () {
  'use strict';
  const cfg = window.SITE || {};
  const local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const API = String((local && new URLSearchParams(location.search).get('api')) || cfg.plataformaApi || '').replace(/\/+$/, '');
  const $ = (s) => document.querySelector(s);
  if (!API || !$('#v-panel')) return;
  const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'aprendido.css?v=202611211900'; document.head.appendChild(css);

  function el(etiqueta, attrs, ...hijos) {
    const e = document.createElement(etiqueta);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? '' : v);
    }
    for (const h of hijos.flat()) if (h != null && h !== false) e.append(h);
    return e;
  }
  const vaciar = (n) => { while (n.firstChild) n.removeChild(n.firstChild); };
  const TZ = 'America/Argentina/Buenos_Aires';
  const dia = (iso) => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('es-AR', { timeZone: TZ, day: 'numeric', month: 'long', year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' }); };

  // La sesión es la de panel.js: se lee cada vez, porque cambia al entrar, al salir y al elegir otro negocio.
  const sesion = () => { try { const s = JSON.parse(localStorage.getItem('panel-mym') || 'null'); return s && s.sesion && Array.isArray(s.clientes) && s.clientes.length ? s : null; } catch (e) { return null; } };
  const cliente = () => { const s = sesion(); return s ? s.actual || s.clientes[0].id : null; };
  async function api(ruta, cuerpo) {
    const s = sesion(); if (!s) throw new Error('Tu sesión venció. Entrá de nuevo con tu mail.');
    let r;
    try { r = await fetch(API + ruta, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + s.sesion }, body: JSON.stringify({ cliente: cliente(), ...cuerpo }) }); }
    catch (e) { throw new Error('No pudimos conectarnos. Revisá tu conexión y probá de nuevo.'); }
    let d = {}; try { d = await r.json(); } catch (e) { /* sin cuerpo */ }
    if (!r.ok) throw Object.assign(new Error(d.error === 'No existe.' ? 'Esto todavía no está disponible. Probá más tarde.' : d.error || 'No se pudo completar. Probá de nuevo en un rato.'), { status: r.status });
    return d;
  }
  let reloj = null;
  function tostada(txt, mal) { const t = $('#tostada'); if (!t) return; t.textContent = txt; t.classList.toggle('mal', !!mal); clearTimeout(reloj); reloj = setTimeout(() => { t.textContent = ''; }, mal ? 7000 : 4500); }
  // La misma ventana de confirmación del panel.
  function confirmar(titulo, texto, boton) {
    const d = $('#confirmar');
    if (!d || !d.showModal) return Promise.resolve(window.confirm(`${titulo}\n\n${texto}`));
    $('#confirmar-titulo').textContent = titulo; $('#confirmar-texto').textContent = texto; $('#confirmar-si').textContent = boton;
    return new Promise((ok) => {
      const cerrar = (v) => { $('#confirmar-si').onclick = null; $('#confirmar-no').onclick = null; d.onclose = null; if (d.open) d.close(); ok(v); };
      $('#confirmar-si').onclick = () => cerrar(true); $('#confirmar-no').onclick = () => cerrar(false); d.onclose = () => cerrar(false);
      d.showModal(); $('#confirmar-no').focus();
    });
  }

  // =====================================================================================
  // Lo que se agrega a la página (una sola vez)
  // =====================================================================================
  let datos = null; let datosDe = null; let vengoDe = 'inicio';
  const seccion = el('section', { id: 's-aprendido', class: 'seccion angosta', hidden: true, 'aria-label': 'Lo que aprendió tu bot' });
  const resumenInicio = el('p', null, 'Cargando…');
  const entradaInicio = el('div', { class: 'tarjeta apr-entrada', 'data-bot': true },
    el('h3', { class: 'subtitulo' }, 'Lo que aprendió tu bot'), resumenInicio,
    el('button', { class: 'btn sec', type: 'button', onclick: () => abrir('inicio') }, 'Ver lo que aprendió'));
  const linkBot = el('button', { class: 'btn sec apr-link', type: 'button', onclick: () => abrir('bot') }, 'Ver lo que aprendió solo');
  const globo = el('b', { class: 'globo apr-globo', hidden: true });

  function armar() {
    const inicio = $('#s-inicio'); if (inicio) inicio.append(entradaInicio);
    const introBot = $('#s-bot .tarjeta'); if (introBot) introBot.append(linkBot);
    const pestBot = $('.pestanas [data-seccion="bot"]'); if (pestBot) pestBot.append(globo);
    const pie = $('#v-panel .pie'); if (pie) pie.before(seccion); else $('#v-panel').append(seccion);
    // panel.js no conoce esta sección: cuando muestra una de las suyas, esta se guarda.
    const mirar = new MutationObserver(() => { if (!seccion.hidden && [...document.querySelectorAll('#v-panel > section.seccion')].some((s) => s !== seccion && !s.hidden)) cerrar(false); });
    document.querySelectorAll('#v-panel > section.seccion').forEach((s) => { if (s !== seccion) mirar.observe(s, { attributes: true, attributeFilter: ['hidden'] }); });
    const sel = $('#negocios'); if (sel) sel.addEventListener('change', () => setTimeout(() => { datos = null; refrescar(); }, 0));
    window.addEventListener('popstate', () => { if (!seccion.hidden && location.hash !== '#aprendido') volver(); });
    window.addEventListener('hashchange', () => { if (seccion.hidden && location.hash === '#aprendido') abrir('inicio'); });
    mirarMensajes();
  }

  function abrir(desde) {
    vengoDe = desde || 'inicio';
    document.querySelectorAll('#v-panel > section.seccion').forEach((s) => { s.hidden = s !== seccion; });
    document.querySelectorAll('.pestanas button').forEach((b) => { if (b.dataset.seccion === 'bot') b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    if (location.hash !== '#aprendido') history.pushState({ aprendido: 1 }, '', '#aprendido');
    pintar(); refrescar(); window.scrollTo({ top: 0 });
  }
  // Se guarda la sección. `limpiar`: sacar «#aprendido» de la dirección (cuando se fue a otra pestaña).
  function cerrar(mostrarOtra) {
    seccion.hidden = true;
    if (location.hash === '#aprendido') history.replaceState(null, '', location.pathname + location.search);
    if (mostrarOtra) { const b = $(`.pestanas [data-seccion="${vengoDe}"]`); if (b) b.click(); }
  }
  const volver = () => cerrar(true);

  // =====================================================================================
  // Datos y dibujo
  // =====================================================================================
  async function refrescar() {
    const cli = cliente(); if (!cli || document.body.classList.contains('sin-bot')) return;
    try {
      const d = await api('/api/panel/aprendido');
      if (cli !== cliente()) return;
      datos = d; datosDe = cli; pintarContadores(); if (!seccion.hidden) pintar();
    } catch (e) { if (!seccion.hidden && !datos) { vaciar(seccion); seccion.append(cabecera(), el('p', { class: 'aviso mal' }, e.message)); } }
  }
  function pintarContadores() {
    const n = datos.pendientes.length; const u = datos.aprendido.length;
    vaciar(resumenInicio);
    if (!u && !n) resumenInicio.append('Todavía no aprendió nada solo. Aprende de lo que contestás a mano y de las respuestas que le corregís.');
    else resumenInicio.append(el('b', null, u === 1 ? '1 dato' : `${u} datos`), ' que ya usa en las charlas.', n ? (n === 1 ? ' 1 más espera la revisión de MyM.' : ` ${n} más esperan la revisión de MyM.`) : '');
    linkBot.textContent = u ? `Ver lo que aprendió solo (${u})` : 'Ver lo que aprendió solo';
    globo.hidden = n === 0; globo.textContent = n > 99 ? '99+' : String(n); globo.title = n === 1 ? '1 dato espera la revisión de MyM' : `${n} datos esperan la revisión de MyM`;
  }
  const cabecera = () => el('div', null,
    el('button', { class: 'btn-chico apr-volver', type: 'button', onclick: volver }, '← Volver'),
    el('div', { class: 'tarjeta' }, el('h2', { class: 'titulo' }, 'Lo que aprendió tu bot'),
      el('p', { class: 'paso', style: 'margin:0' }, 'Tu bot aprende de lo que contestás a mano, de las respuestas que le corregís y de tus charlas anteriores. Lo que tenga precios, promesas o datos de cobro no lo dice hasta que lo revisemos en MyM.')));

  const ORIGEN = { historial: 'De tus charlas anteriores', app: 'De lo que contestaste desde el celular', panel: 'De lo que contestaste desde acá', correccion: 'De una respuesta corregida' };
  const TEMAS = [['horarios', 'Horarios'], ['zonas', 'Zonas'], ['servicios', 'Qué hacés y qué no'], ['como', 'Cómo se pide o se hace'], ['pagos', 'Pagos'], ['precios', 'Precios'], ['promesa', 'Promesas y condiciones'], ['tono', 'Cómo habla'], ['otro', 'Otros datos']];
  const fechaDe = (a) => (a.dicho ? `Dicho el ${dia(a.dicho)}` : a.aprobado ? `Aprobado el ${dia(a.aprobado)}` : `Desde el ${dia(a.cuando)}`);

  function pintar() {
    vaciar(seccion); seccion.append(cabecera());
    if (!datos || datosDe !== cliente()) { seccion.append(el('p', { class: 'apr-vacio' }, 'Cargando…')); return; }
    const caja = el('div', { class: 'tarjeta', style: 'margin-top:16px' }); seccion.append(caja);
    // 1. Lo que espera la revisión de MyM (sólo se mira).
    if (datos.pendientes.length) {
      caja.append(el('h3', { class: 'apr-sub', style: 'margin-top:0' }, 'Esperan nuestra revisión', el('span', null, String(datos.pendientes.length))),
        el('p', { class: 'apr-nota' }, 'Tu bot todavía no dice esto. Lo revisamos nosotros y, si hace falta, te consultamos. ¿Hay algo mal o es urgente? Escribinos por WhatsApp al 11 3366-2080.'));
      for (const p of datos.pendientes) {
        const pie = el('div', { class: 'apr-pie' }, el('p', null, fechaDe(p) + (p.veces > 1 ? `. Apareció ${p.veces} veces.` : '.')));
        if (p.montoFuera) pie.append(el('p', { class: 'apr-precio' }, el('b', null, `${p.montoFuera.replace('$', '$ ')} no está en tus precios.`), ' Tu bot sólo dice los precios que cargaste. Si ese es el precio, agregalo en «Tus precios».'),
          el('button', { class: 'btn-chico', type: 'button', onclick: () => { cerrar(false); const b = $('.pestanas [data-seccion="bot"]'); if (b) b.click(); setTimeout(() => { const t = $('#ficha [name="precios"]'); if (t) { t.scrollIntoView({ block: 'center' }); t.focus(); } }, 400); } }, 'Ir a mis precios'));
        caja.append(el('article', { class: 'apr-dato' }, el('p', { class: 'apr-motivo' }, 'Espera porque ', el('b', null, p.riesgo || 'es un precio o una promesa'), '.'),
          el('div', { class: 'apr-par' }, el('div', { class: 'apr-glo cli' }, el('small', null, 'Te preguntan'), p.pregunta), el('div', { class: 'apr-glo bot' }, el('small', null, 'Tu bot contestaría'), p.respuesta)), pie));
      }
    }
    // 2. Lo que ya usa, por tema.
    caja.append(el('h3', { class: 'apr-sub', style: datos.pendientes.length ? null : 'margin-top:0' }, 'Lo que ya usa', el('span', null, String(datos.aprendido.length))));
    if (!datos.aprendido.length) caja.append(el('p', { class: 'apr-vacio' }, 'Todavía no aprendió nada solo. Cuando contestes una charla a mano o le corrijas una respuesta, lo vas a ver acá.'));
    else caja.append(el('p', { class: 'apr-nota' }, 'Si algo está mal, tocá «Deshacer» y tu bot deja de decirlo en el momento.'));
    for (const [clave, nombre] of TEMAS) {
      const del = datos.aprendido.filter((a) => (TEMAS.some(([k]) => k === a.tema) ? a.tema : 'otro') === clave);
      if (del.length) caja.append(el('section', { class: 'apr-tema' }, el('h4', null, nombre), del.map(fila)));
    }
    // 3. Lo que ya no usa.
    if (datos.anteriores.length) {
      const NOMBRE = { deshecho: 'Deshecho', descartado: 'Descartado', archivado: 'Reemplazado por uno más nuevo' };
      caja.append(el('details', { class: 'apr-anteriores' }, el('summary', null, `Lo que ya no usa (${datos.anteriores.length})`),
        datos.anteriores.map((a) => el('div', { class: 'apr-fila' }, el('div', { class: 'p' }, a.pregunta), el('div', { class: 'r' }, a.respuesta), el('div', { class: 'm' }, el('span', { class: 'apr-estado' }, NOMBRE[a.estado] || a.estado), a.resuelto ? el('span', null, dia(a.resuelto)) : null)))));
    }
  }
  function fila(a) {
    const error = el('p', { class: 'error', role: 'alert' });
    const b = el('button', { class: 'btn-chico', type: 'button' }, 'Deshacer');
    b.addEventListener('click', async () => {
      if (!(await confirmar('¿Deshacer este dato?', `Tu bot deja de contestar «${a.respuesta.slice(0, 140)}» cuando preguntan «${a.pregunta.slice(0, 100)}».${a.reemplazaA ? ' Vuelve el dato anterior.' : ''}`, 'Sí, deshacer'))) return;
      b.disabled = true; error.textContent = '';
      try { await api('/api/panel/aprendido/deshacer', { aprendizaje: a.id }); tostada('Listo: tu bot ya no usa ese dato.'); await refrescar(); }
      catch (e) { error.textContent = e.message; b.disabled = false; }
    });
    return el('div', { class: 'apr-fila' }, el('div', { class: 'p' }, a.pregunta), el('div', { class: 'r' }, a.respuesta),
      el('div', { class: 'm' }, el('span', null, fechaDe(a)), el('span', null, ORIGEN[a.origen && a.origen.tipo] || '')), b, error);
  }

  // =====================================================================================
  // En la charla: «Esta respuesta está mal» en cada mensaje del bot
  // =====================================================================================
  // panel.js dibuja cada burbuja una sola vez y la conserva: el botón se agrega adentro de la burbuja del bot (lo que
  // se ponga suelto entre las burbujas, panel.js lo saca en la próxima actualización). El mensaje se identifica por
  // su fecha exacta (el atributo datetime de la hora), que es como lo busca el servidor.
  function mirarMensajes() {
    const caja = $('#mensajes'); if (!caja) return;
    const marcar = () => caja.querySelectorAll('.burbuja.mia:not([data-apr])').forEach((b) => {
      b.dataset.apr = '1';
      const quien = b.querySelector('.quien'); const hora = b.querySelector('time.hora'); const txt = b.querySelector('.txt:not(.vacio)');
      if (!quien || quien.textContent !== 'Bot' || !hora || !txt) return;
      const boton = el('button', { class: 'apr-mal', type: 'button' }, 'Esta respuesta está mal');
      boton.addEventListener('click', () => formulario(b, boton, hora.getAttribute('datetime')));
      b.append(boton);
    });
    new MutationObserver(marcar).observe(caja, { childList: true });
    marcar();
  }
  function formulario(burbuja, boton, cuando) {
    const contacto = new URLSearchParams(location.hash.slice(1)).get('charla');
    const id = 'apr-c-' + Math.random().toString(36).slice(2, 8);
    const t = el('textarea', { id, rows: '3', maxlength: '600', placeholder: 'Escribí cómo tendría que haber contestado' });
    const error = el('p', { class: 'error', role: 'alert' });
    const ok = el('button', { class: 'btn', type: 'button' }, 'Guardar'); const no = el('button', { class: 'btn sec', type: 'button' }, 'Cancelar');
    const f = el('div', { class: 'apr-corregir' }, el('label', { for: id }, 'La correcta es…'), t, error, el('div', { class: 'apr-btns' }, ok, no));
    boton.hidden = true; burbuja.append(f); t.focus(); f.scrollIntoView({ block: 'nearest' });
    no.addEventListener('click', () => { f.remove(); boton.hidden = false; });
    ok.addEventListener('click', async () => {
      const v = t.value.trim(); if (!v) { error.textContent = 'Escribí la respuesta correcta.'; return; }
      if (!contacto) { error.textContent = 'No pudimos identificar la charla. Cerrala y volvé a abrirla.'; return; }
      ok.disabled = true; error.textContent = '';
      try {
        const r = await api('/api/panel/corregir', { contacto, cuando, respuestaCorrecta: v });
        const anterior = burbuja.querySelector('.apr-hecho'); if (anterior) anterior.remove();
        f.replaceWith(el('p', { class: 'apr-hecho' + (r.estado === 'pendiente' ? ' espera' : '') }, r.estado === 'pendiente' ? 'Guardado. Como nombra un precio, una promesa o un dato de cobro, lo revisamos en MyM antes de que tu bot lo diga.' : r.estado === 'repetido' ? 'Tu bot ya tenía ese dato.' : 'Listo: tu bot ya contesta así.'));
        boton.hidden = false; refrescar();
      } catch (e) { error.textContent = e.message; ok.disabled = false; }
    });
  }

  // =====================================================================================
  // Arranque: cuando panel.js muestra el panel (después de entrar)
  // =====================================================================================
  let armado = false;
  function alMostrarse() {
    if ($('#v-panel').hidden || !sesion()) return;
    if (!armado) { armar(); armado = true; }
    datos = null; refrescar();
    if (location.hash === '#aprendido') abrir('inicio');
  }
  new MutationObserver(alMostrarse).observe($('#v-panel'), { attributes: true, attributeFilter: ['hidden'] });
  alMostrarse();
  setInterval(() => { if (armado && !$('#v-panel').hidden && document.visibilityState === 'visible') refrescar(); }, 60000);
})();
