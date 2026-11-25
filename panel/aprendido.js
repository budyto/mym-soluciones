// «Lo que aprendió tu Boti» en el panel del cliente (21/11/2026, pedido de Matías; 25/11/2026, pedido de Budy:
// «que el Boti aprenda con el dueño y que el cliente también pueda aprobar»).
// El dueño ve, sólo de su negocio:
//   - «Para revisar», con el contador en Inicio («N cosas para revisar»):
//       · Preguntas que no supo contestar: lo que el Boti no supo responder, agrupado; el dueño escribe la respuesta y
//         el Boti la aprende (o la saca de la lista).
//       · Para aprobar: precios, promesas, plazos que el Boti sacó de las charlas. El dueño los aprueba, los cambia o
//         los descarta. Si nombra un precio que no está en su lista, lo suma a «Tus precios» en el mismo toque.
//       · MyM lo está confirmando: los datos de cobro (alias, CBU, cuentas, links de pago). Sólo se miran: los aprueba
//         MyM después de confirmarlos con el dueño por otro medio.
//   - Lo que ya usa (por tema, con la fecha y de dónde salió; se deshace con un toque) y lo que ya no usa.
//   - En cada respuesta del Boti en una charla: «👎 Está mal, corregir» → «¿Qué tendría que haber dicho?».
// El servidor (plataforma-bots/servidor/aprendizaje.js) decide qué negocio ve cada sesión y qué puede aprobar:
// /api/panel/aprendido, /aprendido/deshacer, /aprendido/resolver, /corregir, /preguntas y /preguntas/contestar.
//
// Va en un archivo aparte para no tocar panel.js: se cuelga de lo que panel.js ya dibuja (las secciones, las
// pestañas, las burbujas de la charla) y usa su misma sesión (localStorage «panel-mym»). No agrega una pestaña: se
// entra desde «Inicio» y desde «Lo que dice tu bot», y el número de lo que hay para revisar se ve en la pestaña del bot.
// Links directos: #revisar y #preguntas (también después de entrar con el link del mail: «#t=…&ir=preguntas»).
// Regla de seguridad: todo lo que viene del servidor se pone como texto (nodos de texto), nunca como HTML.
(function () {
  'use strict';
  const cfg = window.SITE || {};
  const local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const API = String((local && new URLSearchParams(location.search).get('api')) || cfg.plataformaApi || '').replace(/\/+$/, '');
  const $ = (s) => document.querySelector(s);
  if (!API || !$('#v-panel')) return;
  const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'aprendido.css?v=202611251800'; document.head.appendChild(css);

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
  const cuando = (iso) => { const d = new Date(iso); if (isNaN(d)) return ''; const hoy = new Date().toLocaleDateString('es-AR', { timeZone: TZ }); const ayer = new Date(Date.now() - 864e5).toLocaleDateString('es-AR', { timeZone: TZ }); const f = d.toLocaleDateString('es-AR', { timeZone: TZ }); return f === hoy ? 'hoy' : f === ayer ? 'ayer' : `el ${dia(iso)}`; };
  const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
  const pesos = (m) => String(m || '').replace('$', '$ ');

  // La sesión es la de panel.js: se lee cada vez, porque cambia al entrar, al salir y al elegir otro negocio.
  const sesion = () => { try { const s = JSON.parse(localStorage.getItem('panel-mym') || 'null'); return s && s.sesion && Array.isArray(s.clientes) && s.clientes.length ? s : null; } catch (e) { return null; } };
  const cliente = () => { const s = sesion(); return s ? s.actual || s.clientes[0].id : null; };
  async function api(ruta, cuerpo) {
    const s = sesion(); if (!s) throw new Error('Tu sesión venció. Entrá de nuevo con tu mail.');
    let r;
    try { r = await fetch(API + ruta, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + s.sesion }, body: JSON.stringify({ cliente: cliente(), ...cuerpo }) }); }
    catch (e) { throw new Error('No pudimos conectarnos. Revisá tu conexión y probá de nuevo.'); }
    let d = {}; try { d = await r.json(); } catch (e) { /* sin cuerpo */ }
    if (!r.ok) throw Object.assign(new Error(d.error === 'No existe.' ? 'Esto todavía no está disponible. Probá más tarde.' : d.error || 'No se pudo completar. Probá de nuevo en un rato.'), { status: r.status, datos: d });
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
  let datos = null; let datosDe = null; let vengoDe = 'inicio'; let irA = null;
  const seccion = el('section', { id: 's-aprendido', class: 'seccion angosta', hidden: true, 'aria-label': 'Lo que aprendió tu Boti' });
  // Inicio: el contador arriba de todo.
  const cuentaInicio = el('p', { class: 'apr-cuenta' }, 'Cargando…');
  const detalleInicio = el('p', { class: 'apr-detalle' });
  const botonInicio = el('button', { class: 'btn', type: 'button', onclick: () => abrir('inicio', 'revisar') }, 'Revisar ahora');
  const usaInicio = el('button', { class: 'btn-chico', type: 'button', onclick: () => abrir('inicio', 'usa') }, 'Ver lo que ya sabe');
  const entradaInicio = el('div', { class: 'tarjeta apr-inicio', 'data-bot': true },
    el('h2', { class: 'apr-inicio-tit' }, 'Tu Boti'), cuentaInicio, detalleInicio, el('div', { class: 'apr-btns' }, botonInicio, usaInicio));
  const linkBot = el('button', { class: 'btn sec apr-link', type: 'button', onclick: () => abrir('bot') }, 'Ver lo que aprendió solo');
  const globo = el('b', { class: 'globo apr-globo', hidden: true });

  function armar() {
    const inicio = $('#s-inicio'); if (inicio) inicio.prepend(entradaInicio);
    const introBot = $('#s-bot .tarjeta'); if (introBot) introBot.append(linkBot);
    const pestBot = $('.pestanas [data-seccion="bot"]'); if (pestBot) pestBot.append(globo);
    const pie = $('#v-panel .pie'); if (pie) pie.before(seccion); else $('#v-panel').append(seccion);
    // panel.js no conoce esta sección: cuando muestra una de las suyas, esta se guarda.
    const mirar = new MutationObserver(() => { if (!seccion.hidden && [...document.querySelectorAll('#v-panel > section.seccion')].some((s) => s !== seccion && !s.hidden)) cerrar(false); });
    document.querySelectorAll('#v-panel > section.seccion').forEach((s) => { if (s !== seccion) mirar.observe(s, { attributes: true, attributeFilter: ['hidden'] }); });
    const sel = $('#negocios'); if (sel) sel.addEventListener('change', () => setTimeout(() => { datos = null; refrescar(); }, 0));
    window.addEventListener('popstate', () => { if (!seccion.hidden && !/^#(aprendido|revisar|preguntas)$/.test(location.hash)) volver(); });
    window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if (seccion.hidden && ['aprendido', 'revisar', 'preguntas'].includes(h)) abrir('inicio', h); });
    mirarMensajes();
  }

  // `foco`: a qué parte ir ('revisar', 'preguntas', 'usa').
  function abrir(desde, foco) {
    vengoDe = desde || 'inicio'; irA = foco || null;
    document.querySelectorAll('#v-panel > section.seccion').forEach((s) => { s.hidden = s !== seccion; });
    document.querySelectorAll('.pestanas button').forEach((b) => { if (b.dataset.seccion === 'bot') b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    const destino = foco === 'preguntas' ? '#preguntas' : foco === 'revisar' ? '#revisar' : '#aprendido';
    if (location.hash !== destino) history.pushState({ aprendido: 1 }, '', destino);
    pintar(); refrescar(); window.scrollTo({ top: 0 });
  }
  function cerrar(mostrarOtra) {
    seccion.hidden = true;
    if (/^#(aprendido|revisar|preguntas)$/.test(location.hash)) history.replaceState(null, '', location.pathname + location.search);
    if (mostrarOtra) { const b = $(`.pestanas [data-seccion="${vengoDe}"]`); if (b) b.click(); }
  }
  const volver = () => cerrar(true);
  function irAlFoco() {
    if (!irA) return;
    // «Revisar» ya queda arriba de todo: sólo se baja para las preguntas o para lo que ya usa.
    const destino = { preguntas: '#apr-preguntas', usa: '#apr-usa' }[irA]; irA = null;
    const n = destino && $(destino); if (n) setTimeout(() => n.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }), 60);
  }

  // =====================================================================================
  // Datos y contadores
  // =====================================================================================
  async function refrescar() {
    const cli = cliente(); if (!cli || document.body.classList.contains('sin-bot')) return;
    try {
      const d = await api('/api/panel/aprendido');
      if (cli !== cliente()) return;
      datos = d; datosDe = cli; pintarContadores();
      // No se redibuja encima de lo que el dueño está escribiendo.
      const escribiendo = [...seccion.querySelectorAll('textarea')].some((t) => t.value.trim());
      if (!seccion.hidden && !escribiendo) { pintar(); irAlFoco(); }
    } catch (e) { if (!seccion.hidden && !datos) { vaciar(seccion); seccion.append(cabecera(), el('p', { class: 'aviso mal' }, e.message)); } }
  }
  const paraAprobar = () => datos.pendientes.filter((p) => !p.esperaMyM);
  const enMyM = () => datos.pendientes.filter((p) => p.esperaMyM);
  function pintarContadores() {
    const preg = (datos.preguntas || []).length; const apr = paraAprobar().length; const total = preg + apr; const u = datos.aprendido.length;
    vaciar(cuentaInicio); vaciar(detalleInicio);
    entradaInicio.classList.toggle('al-dia', total === 0);
    if (total) {
      cuentaInicio.append(el('b', null, String(total)), total === 1 ? ' cosa para revisar' : ' cosas para revisar');
      const partes = [];
      if (preg) partes.push(plural(preg, 'pregunta que no supo contestar', 'preguntas que no supo contestar'));
      if (apr) partes.push(plural(apr, 'dato para aprobar', 'datos para aprobar'));
      detalleInicio.append(partes.join(' y ') + '.', u ? ` Ya usa ${plural(u, 'dato que aprendió', 'datos que aprendió')}.` : '');
    } else {
      cuentaInicio.append('Nada para revisar');
      detalleInicio.append(u ? `Tu Boti está al día y ya usa ${plural(u, 'dato que aprendió', 'datos que aprendió')} de tus charlas.` : 'Tu Boti aprende de lo que contestás a mano y de las respuestas que le corregís.');
    }
    if (enMyM().length) detalleInicio.append(` En MyM estamos confirmando ${plural(enMyM().length, 'dato de cobro', 'datos de cobro')} con vos.`);
    botonInicio.hidden = total === 0;
    linkBot.textContent = u ? `Ver lo que aprendió solo (${u})` : 'Ver lo que aprendió solo';
    globo.hidden = total === 0; globo.textContent = total > 99 ? '99+' : String(total); globo.title = total === 1 ? '1 cosa para revisar' : `${total} cosas para revisar`;
  }
  const cabecera = () => el('div', null,
    el('button', { class: 'btn-chico apr-volver', type: 'button', onclick: volver }, '← Volver'),
    el('div', { class: 'tarjeta' }, el('h2', { class: 'titulo' }, 'Lo que aprendió tu Boti'),
      el('p', { class: 'paso', style: 'margin:0' }, 'Tu Boti aprende de lo que contestás a mano, de las respuestas que le corregís y de tus charlas anteriores. Lo que tenga precios o promesas no lo dice hasta que lo apruebes vos. Los datos de cobro los confirmamos en MyM con vos.')));

  const ORIGEN = { historial: 'De tus charlas anteriores', app: 'De lo que contestaste desde el celular', panel: 'De lo que contestaste desde acá', correccion: 'De una respuesta corregida', pregunta: 'De una pregunta que contestaste' };
  const TEMAS = [['horarios', 'Horarios'], ['zonas', 'Zonas'], ['servicios', 'Qué hacés y qué no'], ['como', 'Cómo se pide o se hace'], ['pagos', 'Pagos'], ['precios', 'Precios'], ['promesa', 'Promesas y condiciones'], ['tono', 'Cómo habla'], ['otro', 'Otros datos']];
  // El motivo, en palabras del dueño (el servidor lo dice como lo lee MyM).
  const MOTIVO = { 'nombra plata': 'nombra un precio', 'es un precio o una promesa': 'es un precio o una promesa', 'habla de promociones, descuentos o cuotas': 'habla de promociones, descuentos o cuotas', 'promete un plazo': 'promete un plazo', 'habla de garantías o promete algo': 'promete algo (garantía, stock o una reserva)' };
  const motivo = (r) => MOTIVO[r] || (/contradic/.test(r || '') ? 'dice algo distinto de lo que tu Boti ya sabe' : r || 'es un precio o una promesa');
  const fechaDe = (a) => (a.dicho ? `Dicho el ${dia(a.dicho)}` : a.aprobado ? `Aprobado el ${dia(a.aprobado)}` : `Desde el ${dia(a.cuando)}`);

  // =====================================================================================
  // La sección
  // =====================================================================================
  function pintar() {
    vaciar(seccion); seccion.append(cabecera());
    if (!datos || datosDe !== cliente()) { seccion.append(el('p', { class: 'apr-vacio' }, 'Cargando…')); return; }
    const preguntas = datos.preguntas || []; const aprobar = paraAprobar(); const myM = enMyM();
    // 1. Para revisar.
    const rev = el('div', { class: 'tarjeta apr-revisar', id: 'apr-revisar' }); seccion.append(rev);
    rev.append(el('h2', { class: 'apr-tit' }, 'Para revisar', el('span', { class: 'apr-num' }, String(preguntas.length + aprobar.length))));
    if (!preguntas.length && !aprobar.length) rev.append(el('p', { class: 'apr-vacio' }, 'Nada para revisar. Cuando tu Boti no sepa algo o aprenda un precio, lo vas a ver acá.'));
    if (preguntas.length) {
      rev.append(el('h3', { class: 'apr-sub', id: 'apr-preguntas' }, 'Preguntas que no supo contestar', el('span', null, String(preguntas.length))),
        el('p', { class: 'apr-nota' }, 'Contestá cada una como le contestarías a un cliente. Tu Boti lo aprende y la próxima vez contesta solo.'));
      for (const p of preguntas) rev.append(tarjetaPregunta(p));
    }
    if (aprobar.length) {
      rev.append(el('h3', { class: 'apr-sub' }, 'Para aprobar', el('span', null, String(aprobar.length))),
        el('p', { class: 'apr-nota' }, 'Tu Boti sacó esto de tus charlas, pero todavía no lo dice. Si está bien, aprobalo. Si no, cambialo o descartalo.'));
      for (const p of aprobar) rev.append(tarjetaAprobar(p));
    }
    // 2. Lo que confirma MyM (datos de cobro): sólo se mira.
    if (myM.length) {
      const c = el('div', { class: 'tarjeta apr-mym' }); seccion.append(c);
      c.append(el('h3', { class: 'apr-sub', style: 'margin-top:0' }, 'MyM lo está confirmando', el('span', null, String(myM.length))),
        el('p', { class: 'apr-nota' }, 'Son datos de cobro: alias, CBU, cuentas o links de pago. Para que nadie pueda cambiarlos desde acá, te los confirmamos por WhatsApp o por teléfono antes de que tu Boti los diga.'));
      for (const p of myM) c.append(el('article', { class: 'apr-dato' }, par(p), el('div', { class: 'apr-pie' }, el('p', { class: 'apr-estado-mym' }, 'MyM lo está confirmando'), el('p', null, fechaDe(p) + '.'))));
    }
    // 3. Lo que ya usa, por tema.
    const caja = el('div', { class: 'tarjeta', id: 'apr-usa' }); seccion.append(caja);
    caja.append(el('h3', { class: 'apr-sub', style: 'margin-top:0' }, 'Lo que ya usa', el('span', null, String(datos.aprendido.length))));
    if (!datos.aprendido.length) caja.append(el('p', { class: 'apr-vacio' }, 'Todavía no aprendió nada solo. Cuando contestes una charla a mano o le corrijas una respuesta, lo vas a ver acá.'));
    else caja.append(el('p', { class: 'apr-nota' }, 'Si algo está mal, tocá «Deshacer» y tu Boti deja de decirlo en el momento.'));
    for (const [clave, nombre] of TEMAS) {
      const del = datos.aprendido.filter((a) => (TEMAS.some(([k]) => k === a.tema) ? a.tema : 'otro') === clave);
      if (del.length) caja.append(el('section', { class: 'apr-tema' }, el('h4', null, nombre), del.map(fila)));
    }
    // 4. Lo que ya no usa.
    if (datos.anteriores.length) {
      const NOMBRE = { deshecho: 'Deshecho', descartado: 'Descartado', archivado: 'Reemplazado por uno más nuevo' };
      caja.append(el('details', { class: 'apr-anteriores' }, el('summary', null, `Lo que ya no usa (${datos.anteriores.length})`),
        datos.anteriores.map((a) => el('div', { class: 'apr-fila' }, el('div', { class: 'p' }, a.pregunta), el('div', { class: 'r' }, a.respuesta), el('div', { class: 'm' }, el('span', { class: 'apr-estado' }, NOMBRE[a.estado] || a.estado), a.resuelto ? el('span', null, dia(a.resuelto)) : null)))));
    }
  }
  const par = (p, etiquetaBot = 'Tu Boti contestaría') => el('div', { class: 'apr-par' }, el('div', { class: 'apr-glo cli' }, el('small', null, 'Te preguntan'), p.pregunta), el('div', { class: 'apr-glo bot' }, el('small', null, etiquetaBot), p.respuesta));

  // Una pregunta que no supo contestar: el dueño escribe la respuesta.
  function tarjetaPregunta(p) {
    const id = 'apr-p-' + p.id;
    const t = el('textarea', { id, rows: '3', maxlength: '600', placeholder: 'Escribí la respuesta como se la dirías a un cliente' });
    const error = el('p', { class: 'error', role: 'alert' });
    const ok = el('button', { class: 'btn', type: 'button' }, 'Enseñarle');
    const no = el('button', { class: 'btn-chico', type: 'button' }, 'No hace falta');
    const veces = p.veces > 1 ? `Te la hicieron ${p.veces} veces${p.personas > 1 ? `, ${p.personas} personas distintas` : ''}. La última, ${cuando(p.ultima)}.` : `Te la hicieron ${cuando(p.ultima)}.`;
    const art = el('article', { class: 'apr-preg' },
      el('div', { class: 'apr-par' }, el('div', { class: 'apr-glo cli' }, el('small', null, 'Te preguntaron'), p.pregunta)),
      el('div', { class: 'apr-pie' }, el('p', null, veces),
        p.otras && p.otras.length ? el('details', { class: 'apr-otras' }, el('summary', null, 'Cómo lo preguntaron'), el('ul', null, p.otras.map((o) => el('li', null, o)))) : null,
        el('label', { for: id, class: 'apr-lbl' }, '¿Qué tendría que contestar tu Boti?'), t, error, el('div', { class: 'apr-btns' }, ok, no)));
    ok.addEventListener('click', async () => {
      const v = t.value.trim(); if (!v) { error.textContent = 'Escribí qué tiene que contestar tu Boti.'; t.focus(); return; }
      ok.disabled = true; no.disabled = true; error.textContent = '';
      try { const r = await api('/api/panel/preguntas/contestar', { pregunta: p.id, respuesta: v }); hecho(art, r.mensaje, r.estado === 'pendiente'); refrescarLuego(); }
      catch (e) { error.textContent = e.message; ok.disabled = false; no.disabled = false; }
    });
    no.addEventListener('click', async () => {
      if (!(await confirmar('¿Sacar esta pregunta?', `«${p.pregunta.slice(0, 140)}» sale de la lista y tu Boti sigue sin saberla. Si te la vuelven a hacer, aparece de nuevo.`, 'Sí, sacarla'))) return;
      ok.disabled = true; no.disabled = true;
      try { const r = await api('/api/panel/preguntas/contestar', { pregunta: p.id, decision: 'descartar' }); hecho(art, r.mensaje); refrescarLuego(); }
      catch (e) { error.textContent = e.message; ok.disabled = false; no.disabled = false; }
    });
    return art;
  }

  // Un dato para aprobar: aprobar, cambiar o descartar. Con un precio que no está en su lista, «Sumarlo a mis precios».
  function tarjetaAprobar(p) {
    const error = el('p', { class: 'error', role: 'alert' });
    const art = el('article', { class: 'apr-dato' });
    const monto = p.montoFuera;
    const aprobar = el('button', { class: 'btn', type: 'button' }, monto ? `Sumar ${pesos(monto)} a mis precios y aprobar` : 'Aprobar');
    const cambiar = el('button', { class: 'btn sec', type: 'button' }, 'Cambiar');
    const descartar = el('button', { class: 'btn-chico', type: 'button' }, 'Descartar');
    const botones = el('div', { class: 'apr-btns' }, aprobar, cambiar, descartar);
    const pie = el('div', { class: 'apr-pie' }, el('p', null, fechaDe(p) + (p.veces > 1 ? `. Apareció ${p.veces} veces.` : '.')));
    if (p.contradice) pie.append(el('p', { class: 'apr-hoy' }, 'Hoy tu Boti dice: ', el('q', null, p.contradice.respuesta)));
    if (monto) pie.append(el('p', { class: 'apr-precio' }, el('b', null, `${pesos(monto)} no está en tus precios.`), ' Tu Boti sólo dice los precios de tu lista. Si es el precio correcto, lo sumamos a «Tus precios» al aprobar.'));
    pie.append(botones, error);
    art.append(el('p', { class: 'apr-motivo' }, 'Para revisar porque ', el('b', null, motivo(p.riesgo)), '.'), par(p), pie);
    const todos = [aprobar, cambiar, descartar]; const trabar = (v) => todos.forEach((b) => { b.disabled = v; });
    const resolver = async (cuerpo, okTexto) => {
      trabar(true); error.textContent = '';
      try { await api('/api/panel/aprendido/resolver', { aprendizaje: p.id, ...cuerpo }); hecho(art, okTexto, false); refrescarLuego(); }
      catch (e) {
        trabar(false);
        // Cambió el texto y ahora nombra otro precio: se ofrece sumarlo.
        if (e.datos && e.datos.montoFuera && !cuerpo.sumarPrecio) { error.textContent = e.message; aprobar.textContent = `Sumar ${pesos(e.datos.montoFuera)} a mis precios y aprobar`; p.montoFuera = e.datos.montoFuera; }
        else error.textContent = e.message;
      }
    };
    aprobar.addEventListener('click', () => resolver({ decision: 'aprobar', ...(p.montoFuera ? { sumarPrecio: true } : {}) }, p.montoFuera ? `Listo: sumamos ${pesos(p.montoFuera)} a tus precios y tu Boti ya lo dice.` : 'Listo: tu Boti ya lo dice.'));
    descartar.addEventListener('click', async () => {
      if (!(await confirmar('¿Descartar este dato?', `Tu Boti no va a contestar «${p.respuesta.slice(0, 140)}».`, 'Sí, descartar'))) return;
      resolver({ decision: 'descartar' }, 'Listo: lo descartamos. Tu Boti no lo dice.');
    });
    cambiar.addEventListener('click', () => {
      const id = 'apr-e-' + p.id;
      const t = el('textarea', { id, rows: '3', maxlength: '600' }); t.value = p.respuesta;
      const guardar = el('button', { class: 'btn', type: 'button' }, 'Guardar y aprobar'); const cancelar = el('button', { class: 'btn-chico', type: 'button' }, 'Cancelar');
      const f = el('div', { class: 'apr-corregir' }, el('label', { for: id }, '¿Qué tendría que contestar?'), t, el('div', { class: 'apr-btns' }, guardar, cancelar));
      botones.hidden = true; botones.after(f); t.focus();
      cancelar.addEventListener('click', () => { f.remove(); botones.hidden = false; error.textContent = ''; });
      guardar.addEventListener('click', async () => {
        const v = t.value.trim(); if (!v) { error.textContent = 'Escribí la respuesta.'; return; }
        guardar.disabled = true; error.textContent = '';
        try { await api('/api/panel/aprendido/resolver', { aprendizaje: p.id, decision: 'aprobar', respuesta: v }); hecho(art, 'Listo: tu Boti ya contesta así.', false); refrescarLuego(); }
        catch (e) {
          guardar.disabled = false; error.textContent = e.message;
          if (e.datos && e.datos.montoFuera) {
            const sumar = el('button', { class: 'btn sec', type: 'button' }, `Sumar ${pesos(e.datos.montoFuera)} a mis precios y aprobar`);
            sumar.addEventListener('click', async () => {
              sumar.disabled = true;
              try { await api('/api/panel/aprendido/resolver', { aprendizaje: p.id, decision: 'aprobar', respuesta: v, sumarPrecio: true }); hecho(art, `Listo: sumamos ${pesos(e.datos.montoFuera)} a tus precios y tu Boti ya lo dice.`, false); refrescarLuego(); }
              catch (e2) { sumar.disabled = false; error.textContent = e2.message; }
            });
            const fila = f.querySelector('.apr-btns'); if (fila && !fila.querySelector('.btn.sec')) fila.prepend(sumar);
          }
        }
      });
    });
    return art;
  }
  // Una tarjeta resuelta: queda el aviso un momento y después se redibuja la lista.
  function hecho(art, texto, espera) {
    vaciar(art); art.classList.add('apr-resuelto');
    art.append(el('p', { class: 'apr-hecho' + (espera ? ' espera' : ''), role: 'status' }, texto));
    tostada(texto);
  }
  let reloj2 = null;
  const refrescarLuego = () => { clearTimeout(reloj2); reloj2 = setTimeout(refrescar, 1800); };

  function fila(a) {
    const error = el('p', { class: 'error', role: 'alert' });
    const b = el('button', { class: 'btn-chico', type: 'button' }, 'Deshacer');
    b.addEventListener('click', async () => {
      if (!(await confirmar('¿Deshacer este dato?', `Tu Boti deja de contestar «${a.respuesta.slice(0, 140)}» cuando preguntan «${a.pregunta.slice(0, 100)}».${a.reemplazaA ? ' Vuelve el dato anterior.' : ''}`, 'Sí, deshacer'))) return;
      b.disabled = true; error.textContent = '';
      try { await api('/api/panel/aprendido/deshacer', { aprendizaje: a.id }); tostada('Listo: tu Boti ya no usa ese dato.'); await refrescar(); }
      catch (e) { error.textContent = e.message; b.disabled = false; }
    });
    return el('div', { class: 'apr-fila' }, el('div', { class: 'p' }, a.pregunta), el('div', { class: 'r' }, a.respuesta),
      el('div', { class: 'm' }, el('span', null, fechaDe(a)), el('span', null, ORIGEN[a.origen && a.origen.tipo] || '')), b, error);
  }

  // =====================================================================================
  // En la charla: «👎 Está mal, corregir» debajo de cada respuesta del Boti
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
      const boton = el('button', { class: 'apr-mal', type: 'button', 'aria-label': 'Esta respuesta del Boti está mal: corregirla' }, el('span', { 'aria-hidden': 'true' }, '👎'), ' Está mal, corregir');
      boton.addEventListener('click', () => formulario(b, boton, hora.getAttribute('datetime')));
      b.append(boton);
    });
    new MutationObserver(marcar).observe(caja, { childList: true });
    marcar();
  }
  function formulario(burbuja, boton, cuandoMsj) {
    const contacto = new URLSearchParams(location.hash.slice(1)).get('charla');
    const id = 'apr-c-' + Math.random().toString(36).slice(2, 8);
    const t = el('textarea', { id, rows: '3', maxlength: '600', placeholder: 'Escribilo como se lo dirías al cliente' });
    const error = el('p', { class: 'error', role: 'alert' });
    const ok = el('button', { class: 'btn', type: 'button' }, 'Enseñarle'); const no = el('button', { class: 'btn sec', type: 'button' }, 'Cancelar');
    const f = el('div', { class: 'apr-corregir' }, el('label', { for: id }, '¿Qué tendría que haber dicho?'), t,
      el('small', { class: 'apr-ayuda' }, 'Tu Boti lo aprende para la próxima. Al cliente no le llega nada.'), error, el('div', { class: 'apr-btns' }, ok, no));
    boton.hidden = true; burbuja.append(f); t.focus(); f.scrollIntoView({ block: 'nearest' });
    no.addEventListener('click', () => { f.remove(); boton.hidden = false; });
    ok.addEventListener('click', async () => {
      const v = t.value.trim(); if (!v) { error.textContent = 'Escribí qué tendría que haber dicho.'; return; }
      if (!contacto) { error.textContent = 'No pudimos identificar la charla. Cerrala y volvé a abrirla.'; return; }
      ok.disabled = true; error.textContent = '';
      try {
        const r = await api('/api/panel/corregir', { contacto, cuando: cuandoMsj, respuestaCorrecta: v });
        const anterior = burbuja.querySelector('.apr-hecho'); if (anterior) anterior.remove();
        f.replaceWith(el('p', { class: 'apr-hecho' + (r.estado === 'pendiente' ? ' espera' : ''), role: 'status' }, r.mensaje || (r.estado === 'pendiente' ? 'Guardado para revisar.' : 'Listo: tu Boti ya contesta así.')));
        boton.hidden = false; refrescar();
      } catch (e) { error.textContent = e.message; ok.disabled = false; }
    });
  }

  // =====================================================================================
  // Arranque: cuando panel.js muestra el panel (después de entrar)
  // =====================================================================================
  // Adónde ir al entrar: el hash (#revisar, #preguntas) o lo que guardó index.html antes de que panel.js lo borrara.
  const destinoInicial = () => {
    let ir = null; try { ir = sessionStorage.getItem('panel-ir'); sessionStorage.removeItem('panel-ir'); } catch (e) { /* sin almacenamiento */ }
    const h = location.hash.slice(1);
    return ['aprendido', 'revisar', 'preguntas'].includes(h) ? h : ['revisar', 'preguntas'].includes(ir) ? ir : null;
  };
  let armado = false;
  function alMostrarse() {
    if ($('#v-panel').hidden || !sesion()) return;
    if (!armado) { armar(); armado = true; }
    datos = null; refrescar();
    const ir = destinoInicial(); if (ir) abrir('inicio', ir === 'aprendido' ? null : ir);
  }
  new MutationObserver(alMostrarse).observe($('#v-panel'), { attributes: true, attributeFilter: ['hidden'] });
  alMostrarse();
  setInterval(() => { if (armado && !$('#v-panel').hidden && document.visibilityState === 'visible' && !seccion.querySelector('textarea:focus')) refrescar(); }, 60000);
})();
