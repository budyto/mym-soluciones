// Ver una publicación entera desde «Lo que viene en tus redes» (21/11/2026, pedido de Matías: «el cliente tiene que
// poder ver cada pieza»). Al tocar una publicación de la lista se abre acá, en la misma página: en la compu es una
// ventana con la pieza a la izquierda y los datos a la derecha; en el celular ocupa toda la pantalla.
//   · La pieza se muestra como va a salir: los posteos y carruseles en una tarjeta como la de Instagram o Facebook,
//     las historias, los reels y los shorts dentro de un celular. El carrusel se pasa con las flechas, los puntos,
//     el dedo o las flechas del teclado.
//   · Abajo, «Aprobar» y «Pedir un cambio» (con un cuadro para contar qué cambiar). Una pieza que ya pasó su hora
//     dice «Venció sin aprobar» y ofrece pedir que la reprogramemos.
//   · Se cierra con la cruz, tocando afuera, con Esc o con «atrás» del celular, sin salir del panel.
// Los datos salen de /api/panel/pieza (plataforma-bots/servidor/panel-cliente.js): el servidor decide de qué negocio
// es la sesión y le pide la pieza al CRM. Los links de las fotos y los videos vencen a los 15 minutos, por eso se
// piden cada vez que se abre. Usa lo que panel.js deja en window.PanelMyM (pedidos con la sesión y avisos).
// Regla de seguridad: todo lo que viene del servidor se pone como texto (nodos de texto), nunca como HTML.
(function () {
  'use strict';
  if (!window.HTMLDialogElement || !document.querySelector('#v-panel')) return; // sin <dialog>, la lista queda como antes
  const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'pieza.css?v=202611212200'; document.head.appendChild(css);

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
  // Dibujos fijos de este archivo (nunca llevan datos del servidor).
  const svg = (adentro, clase, caja = '0 0 24 24') => { const s = el('span', { class: clase || null, 'aria-hidden': 'true' }); s.innerHTML = `<svg viewBox="${caja}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${adentro}</svg>`; return s; };
  const NOTA = 'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z';
  const LOGO = {
    facebook: '<circle cx="12" cy="12" r="12" fill="#1877f2"/><path fill="#fff" d="M16.67 15.47 17.2 12h-3.33V9.75c0-.95.47-1.87 1.96-1.87h1.51V4.93s-1.37-.23-2.69-.23c-2.74 0-4.53 1.66-4.53 4.67V12H7.08v3.47h3.04V24a12.1 12.1 0 0 0 3.75 0v-8.53z"/>',
    instagram: '<defs><linearGradient id="pz-ig" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#feda75"/><stop offset=".28" stop-color="#fa7e1e"/><stop offset=".55" stop-color="#d62976"/><stop offset=".8" stop-color="#962fbf"/><stop offset="1" stop-color="#4f5bd5"/></linearGradient></defs><rect width="24" height="24" rx="6.2" fill="url(#pz-ig)"/><rect x="4.6" y="4.6" width="14.8" height="14.8" rx="4.3" fill="none" stroke="#fff" stroke-width="1.9"/><circle cx="12" cy="12" r="3.5" fill="none" stroke="#fff" stroke-width="1.9"/><circle cx="16.4" cy="7.6" r="1.15" fill="#fff"/>',
    tiktok: `<rect width="24" height="24" rx="5.6" fill="#000"/><g transform="translate(4.6 4.5) scale(.62)"><path fill="#25f4ee" transform="translate(-1.1 -.9)" d="${NOTA}"/><path fill="#fe2c55" transform="translate(1.1 .9)" d="${NOTA}"/><path fill="#fff" d="${NOTA}"/></g>`,
    youtube: '<path fill="#fff" d="M8.5 7.5h8v9h-8z"/><path fill="#f00" d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>'
  };
  function logoRed(red, lado) {
    if (!LOGO[red]) return null;
    const s = el('span', { class: 'pz-logo', 'aria-hidden': 'true' });
    s.innerHTML = `<svg viewBox="0 0 24 24" width="${lado}" height="${lado}" focusable="false">${LOGO[red]}</svg>`;
    return s;
  }
  const TZ = 'America/Argentina/Buenos_Aires';
  const mayus = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  const fechaLarga = (x) => { const d = new Date(x.fecha + 'T12:00:00-03:00'); return isNaN(d) ? '' : d.toLocaleDateString('es-AR', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' }).replace(',', ''); };
  const cuando = (x) => { const f = fechaLarga(x); return f ? mayus(f) + (x.hora ? `, a las ${x.hora}` : ', todavía sin hora') : ''; };
  const VERTICAL = ['reel', 'historia', 'short'];
  const P = () => window.PanelMyM;

  // ---------- La ventana (se arma una sola vez) ----------
  const dlg = el('dialog', { id: 'pieza', class: 'pz', 'aria-labelledby': 'pz-titulo' });
  const cabRed = el('div', { class: 'pz-red' });
  const btnCerrar = el('button', { class: 'pz-cerrar', type: 'button', 'aria-label': 'Cerrar', onclick: () => cerrar() }, svg('<path d="M6 6l12 12M18 6L6 18"/>'));
  const escena = el('div', { class: 'pz-escena' });
  const info = el('div', { class: 'pz-info' });
  const acciones = el('div', { class: 'pz-acciones' });
  dlg.append(el('div', { class: 'pz-caja' },
    el('header', { class: 'pz-barra' }, cabRed, btnCerrar),
    el('div', { class: 'pz-desliza' }, escena, info),
    acciones));
  const montar = () => { if (!dlg.isConnected) document.body.append(dlg); };

  let actual = null;   // lo que se sabe de la pieza abierta: primero lo de la lista, después el detalle
  let lista = [];      // las publicaciones de la caja, para ofrecer la siguiente que espera el OK
  let vuelta = 0;      // para descartar la respuesta de una pieza que ya se cerró
  let modo = 'ver';    // 'ver' | 'cambio' | 'aprobada'
  let ocupado = false;
  let sucia = false;   // hay una publicación abierta que todavía no se limpió
  let volviendo = false; let porAbrir = null; // el «atrás» que saca el paso del historial al cerrar, y lo que espera a que termine
  let borrador = '';   // lo que venía escribiendo en «Pedir un cambio»

  // ---------- Abrir y cerrar ----------
  function abrir(x, todas) {
    if (!P() || !x || !x.id) return;
    // Si se acaba de cerrar otra y el «atrás» de ese cierre todavía no terminó, se espera: si no, ese «atrás» cerraría ésta.
    if (volviendo) { porAbrir = [x, todas]; return; }
    montar(); sucia = true;
    lista = Array.isArray(todas) ? todas : [];
    mostrar(x);
    if (!dlg.open) {
      dlg.showModal();
      document.documentElement.classList.add('pz-abierta');
      // Un paso en el historial: «atrás» en el celular cierra la publicación y deja el panel donde estaba.
      history.pushState({ ...(history.state || {}), pieza: true }, '');
    }
    btnCerrar.focus({ preventScroll: true });
  }
  function mostrar(x) {
    actual = { ...x, medios: null }; modo = 'ver'; ocupado = false; borrador = '';
    const v = ++vuelta;
    pintarTodo();
    dlg.querySelector('.pz-desliza').scrollTop = 0; info.scrollTop = 0;
    P().api('/api/panel/pieza', { pieza: x.id }).then((d) => {
      if (v !== vuelta) return;
      actual = { ...actual, ...d.pieza, link: d.link, cargada: true };
      pintarTodo();
    }).catch((e) => {
      if (v !== vuelta) return;
      actual = { ...actual, error: e.message || 'No pudimos traer esta publicación.' };
      pintarTodo();
    });
  }
  // Al cerrar (con la cruz, afuera, Esc o «atrás») se frena el video, se suelta la página y se saca el paso que se
  // había sumado al historial. Se hace en el momento; el «close» de la ventana queda para cuando la cierra el
  // navegador solo (Esc), y no toca nada si mientras tanto ya se abrió otra publicación.
  function limpiar() {
    if (!sucia) return;
    sucia = false; vuelta++;
    for (const v of escena.querySelectorAll('video')) { v.pause(); v.removeAttribute('src'); v.load(); }
    vaciar(escena); actual = null;
    document.documentElement.classList.remove('pz-abierta');
    if (history.state && history.state.pieza) { volviendo = true; history.back(); setTimeout(yaVolvio, 800); } // por si el «atrás» no avisa
  }
  function yaVolvio() {
    volviendo = false;
    if (porAbrir) { const [x, todas] = porAbrir; porAbrir = null; abrir(x, todas); }
  }
  function cerrar() { if (dlg.open) dlg.close(); limpiar(); }
  dlg.addEventListener('close', () => { if (!dlg.open) limpiar(); });
  window.addEventListener('popstate', () => {
    if (dlg.open && !(history.state && history.state.pieza)) cerrar();
    yaVolvio();
  });
  // Esc con el cuadro de «Pedir un cambio» abierto vuelve a los botones; si no, cierra la publicación.
  const dejarCambio = (e) => { if (modo !== 'cambio' || ocupado) return; e.preventDefault(); modo = 'ver'; pintarAcciones(); };
  dlg.addEventListener('keydown', (e) => { if (e.key === 'Escape') dejarCambio(e); });
  dlg.addEventListener('cancel', (e) => { if (e.cancelable) dejarCambio(e); });
  dlg.addEventListener('click', (e) => { if (e.target === dlg) cerrar(); }); // tocar afuera
  dlg.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'TEXTAREA' || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
    const pista = escena.querySelector('.pz-pista'); if (!pista || e.target.tagName === 'VIDEO') return;
    e.preventDefault(); pasar(pista, e.key === 'ArrowRight' ? 1 : -1);
  });

  // ---------- Dibujo ----------
  function pintarTodo() { pintarBarra(); pintarEscena(); pintarInfo(); pintarAcciones(); }
  function pintarBarra() {
    vaciar(cabRed);
    const x = actual; const p = P();
    cabRed.append(logoRed(x.red, 26), el('span', null, [p.RED[x.red], p.FORMATO[x.formato]].filter(Boolean).join(', ') || 'Publicación'));
  }

  // Una foto o un video, dentro de una caja que ya tiene su tamaño: nada salta cuando termina de cargar.
  function medio(m, n, total) {
    const caja = el('div', { class: 'pz-medio cargando' });
    const listo = () => caja.classList.remove('cargando');
    const fallo = () => { listo(); vaciar(caja); caja.append(el('p', { class: 'pz-sin' }, m.tipo === 'video' ? 'No pudimos cargar el video. Cerrá y abrí de nuevo la publicación.' : 'No pudimos cargar la foto. Cerrá y abrí de nuevo la publicación.')); };
    if (m.tipo === 'video') {
      const v = el('video', { src: m.url + '#t=0.1', controls: true, playsinline: true, preload: 'metadata', 'aria-label': total > 1 ? `Video ${n} de ${total}` : 'Video de la publicación' });
      v.addEventListener('loadeddata', listo); v.addEventListener('error', fallo);
      caja.append(v);
    } else {
      const i = el('img', { src: m.url, alt: total > 1 ? `Foto ${n} de ${total}` : 'Foto de la publicación', referrerpolicy: 'no-referrer', decoding: 'async' });
      i.addEventListener('load', listo); i.addEventListener('error', fallo);
      caja.append(i);
    }
    return caja;
  }
  function pasar(pista, paso) { pista.scrollBy({ left: paso * pista.clientWidth, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }
  // El lugar donde va la foto, el video o el carrusel (con flechas, puntos y contador).
  function visor(x) {
    const caja = el('div', { class: 'pz-visor' });
    if (x.error) { caja.append(el('div', { class: 'pz-medio' }, el('p', { class: 'pz-sin' }, x.error, el('br'), el('button', { class: 'pz-reintentar', type: 'button', onclick: () => mostrar(x) }, 'Probar de nuevo')))); return caja; }
    if (!x.cargada) { caja.append(el('div', { class: 'pz-medio cargando', 'aria-label': 'Cargando la publicación', role: 'img' })); return caja; }
    const medios = x.medios || [];
    if (!medios.length) { caja.append(el('div', { class: 'pz-medio' }, el('p', { class: 'pz-sin' }, 'Esta publicación todavía no tiene la foto o el video cargado.'))); return caja; }
    if (medios.length === 1) { caja.append(medio(medios[0], 1, 1)); return caja; }
    const total = medios.length;
    const pista = el('div', { class: 'pz-pista', tabindex: '0', role: 'group', 'aria-roledescription': 'carrusel', 'aria-label': `Carrusel de ${total} fotos` }, medios.map((m, i) => medio(m, i + 1, total)));
    const cuenta = el('span', { class: 'pz-cuenta', 'aria-live': 'polite' }, `1 / ${total}`);
    const antes = el('button', { class: 'pz-flecha antes', type: 'button', 'aria-label': 'Foto anterior', onclick: () => pasar(pista, -1) }, svg('<path d="M15 6l-6 6 6 6"/>'));
    const despues = el('button', { class: 'pz-flecha despues', type: 'button', 'aria-label': 'Foto siguiente', onclick: () => pasar(pista, 1) }, svg('<path d="M9 6l6 6-6 6"/>'));
    const puntos = el('div', { class: 'pz-puntos' }, medios.map((m, i) => el('button', { type: 'button', 'aria-label': `Ir a la foto ${i + 1}`, onclick: () => pista.scrollTo({ left: i * pista.clientWidth, behavior: 'smooth' }) })));
    const marcar = () => {
      const i = Math.max(0, Math.min(total - 1, Math.round(pista.scrollLeft / Math.max(1, pista.clientWidth))));
      cuenta.textContent = `${i + 1} / ${total}`;
      antes.hidden = i === 0; despues.hidden = i === total - 1;
      [...puntos.children].forEach((b, k) => { if (k === i) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
      for (const v of pista.querySelectorAll('video')) if (v.parentNode !== pista.children[i]) v.pause();
    };
    pista.addEventListener('scroll', marcar, { passive: true });
    marcar();
    caja.append(pista, cuenta, antes, despues);
    caja.puntos = puntos;
    return caja;
  }
  function pintarEscena() {
    for (const v of escena.querySelectorAll('video')) v.pause();
    vaciar(escena);
    const x = actual; const p = P();
    const negocio = p.negocio() || 'Tu negocio';
    const inicial = el('span', { class: 'pz-avatar', 'aria-hidden': 'true' }, negocio.trim().charAt(0).toUpperCase());
    const v = visor(x);
    if (VERTICAL.includes(x.formato)) {
      // Historias, reels y shorts: dentro de un celular, sin nada encima: la pieza se ve entera, como se armó.
      escena.append(el('div', { class: 'pz-celu' }, el('span', { class: 'pz-isla', 'aria-hidden': 'true' }), v));
      escena.dataset.marco = 'celular';
    } else {
      // Posteos y carruseles: la tarjeta como se ve en el inicio de la red.
      const ancho = x.formato === 'video';
      const pie = x.red === 'facebook'
        ? el('div', { class: 'pz-post-pie fb', 'aria-hidden': 'true' }, el('span', null, svg('<path d="M7 11v9H4v-9zM7 11l4-8a2.5 2.5 0 0 1 2.4 3.2L12.8 9H18a2 2 0 0 1 2 2.4l-1.3 6.9A2 2 0 0 1 16.7 20H7"/>'), 'Me gusta'), el('span', null, svg('<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>'), 'Comentar'), el('span', null, svg('<path d="M14 5l7 7-7 7v-4c-5 0-8 1.5-10 5 0-6 3-11 10-11z"/>'), 'Compartir'))
        : el('div', { class: 'pz-post-pie', 'aria-hidden': 'true' }, svg('<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>'), svg('<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>'), svg('<path d="M21 4L10 14M21 4l-7 17-4-7-7-3z"/>'), el('span', { class: 'pz-hueco' }), svg('<path d="M6 4h12v17l-6-4.5L6 21z"/>'));
      escena.append(el('div', { class: 'pz-post' + (ancho ? ' ancho' : '') },
        el('div', { class: 'pz-post-cab', 'aria-hidden': 'true' }, inicial, el('span', null, el('b', null, negocio), el('small', null, p.RED[x.red] || ''))),
        v, v.puntos || null, pie));
      escena.dataset.marco = 'tarjeta';
    }
  }
  // El texto del posteo, con los hashtags y las menciones en color (siempre como nodos de texto).
  function textoConHashtags(t) {
    const caja = el('p', { class: 'pz-texto' });
    for (const parte of String(t).split(/([#@][\p{L}\p{N}_.]+)/u)) {
      if (!parte) continue;
      caja.append(/^[#@]./.test(parte) ? el('span', { class: 'pz-tag' }, parte) : parte);
    }
    return caja;
  }
  function pintarInfo() {
    vaciar(info);
    const x = actual; const p = P();
    const est = p.estadoPieza(x);
    info.append(
      el('h2', { id: 'pz-titulo' }, x.titulo || 'Publicación'),
      el('p', { class: 'pz-cuando' }, cuando(x)),
      el('p', { class: 'pz-estado' }, el('span', { class: 'estado ' + est[1] }, x.estado === 'programado' ? 'Aprobada' : est[0]),
        x.estado === 'publicado' && x.enlace ? el('a', { href: x.enlace, target: '_blank', rel: 'noopener' }, 'Ver publicada') : null));
    if (x.vencida) info.append(el('p', { class: 'pz-nota mal' }, 'Ya pasó el día y la hora en que tenía que salir, y no llegó a aprobarse. No se publicó.'));
    else if (x.estado === 'programado') info.append(el('p', { class: 'pz-nota' }, `Sale sola el ${fechaLarga(x)}${x.hora ? ` a las ${x.hora}` : ''}. No tenés que hacer nada más.`));
    if (!x.cargada) { if (!x.error) info.append(el('div', { class: 'pz-renglones', 'aria-hidden': 'true' }, el('i'), el('i'), el('i'))); return; }
    info.append(el('h3', null, x.formato === 'historia' ? 'Texto de la historia' : 'Texto que acompaña la publicación'));
    info.append(x.texto && x.texto.trim() ? textoConHashtags(x.texto) : el('p', { class: 'pz-texto vacio' }, 'Esta publicación sale sin texto.'));
    if (x.link) info.append(el('p', { class: 'pz-crm' }, el('a', { href: x.link, target: '_blank', rel: 'noopener' }, 'Abrir mi calendario completo'), ' Es el tablero de redes de MyM: entrás con tu cuenta de Google.'));
  }

  const TEXTO_REPROGRAMAR = 'Se me pasó aprobarla. Reprogramala para otro día, por favor.';
  function pintarAcciones() {
    vaciar(acciones);
    const x = actual;
    acciones.hidden = false;
    if (!x.cargada) { acciones.hidden = true; return; }
    if (modo === 'aprobada') {
      const faltan = lista.filter((k) => k.id !== x.id && k.estado === 'esperando_ok' && !k.vencida);
      acciones.append(el('p', { class: 'pz-listo', role: 'status' }, svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>'), `Aprobada. Sale sola el ${fechaLarga(x)}${x.hora ? ` a las ${x.hora}` : ''}.`),
        el('div', { class: 'pz-btns' },
          faltan.length ? el('button', { class: 'btn', type: 'button', onclick: () => mostrar(faltan[0]) }, faltan.length === 1 ? 'Ver la otra que espera tu OK' : `Ver la siguiente (quedan ${faltan.length})`) : null,
          el('button', { class: 'btn sec', type: 'button', onclick: () => cerrar() }, 'Cerrar')));
      return;
    }
    if (modo === 'cambio') {
      const error = el('p', { class: 'pz-error', role: 'alert', hidden: true });
      const cuadro = el('textarea', { id: 'pz-cambio', rows: '3', maxlength: '1000', placeholder: 'Por ejemplo: cambiá la foto por la del camión, o sacá el precio.' });
      cuadro.value = borrador || (x.vencida ? TEXTO_REPROGRAMAR : '');
      cuadro.addEventListener('input', () => { borrador = cuadro.value; error.hidden = true; });
      const enviar = el('button', { class: 'btn', type: 'submit' }, 'Enviar el pedido');
      const volver = el('button', { class: 'btn sec', type: 'button', onclick: () => { modo = 'ver'; pintarAcciones(); } }, 'Volver');
      const form = el('form', { class: 'pz-form', novalidate: true, onsubmit: async (e) => {
        e.preventDefault(); if (ocupado) return;
        const cambio = cuadro.value.trim();
        if (cambio.length < 3) { error.textContent = 'Contanos qué querés cambiar.'; error.hidden = false; cuadro.focus(); return; }
        ocupado = true; enviar.disabled = volver.disabled = true; enviar.textContent = 'Enviando…';
        try {
          const v = vuelta;
          await P().api('/api/panel/pieza/cambio', { pieza: x.id, cambio });
          if (v !== vuelta) { P().tostada('Listo. Le pasamos tu pedido al equipo.'); P().refrescarRedes(); return; }
          P().tostada('Listo. Le pasamos tu pedido al equipo: cuando esté corregida vuelve a aparecer para que la apruebes.');
          P().refrescarRedes(); cerrar();
        } catch (err) {
          ocupado = false; enviar.disabled = volver.disabled = false; enviar.textContent = 'Enviar el pedido';
          error.textContent = err.message; error.hidden = false;
        }
      } },
      el('label', { for: 'pz-cambio' }, x.vencida ? '¿Para cuándo la reprogramamos? Podés sumar otro cambio.' : '¿Qué querés que cambiemos?'), cuadro, error,
      el('div', { class: 'pz-btns' }, enviar, volver));
      acciones.append(form);
      cuadro.focus({ preventScroll: true });
      return;
    }
    const pedir = (txt, clase) => el('button', { class: clase, type: 'button', onclick: () => { modo = 'cambio'; pintarAcciones(); } }, txt);
    if (x.estado === 'publicado') { acciones.hidden = true; return; }
    if (x.vencida) {
      acciones.append(el('p', { class: 'pz-motivo mal' }, 'Venció sin aprobar: ya pasó su hora y no se publicó.'),
        el('div', { class: 'pz-btns' }, x.puedePedirCambio ? pedir('Pedir que la reprogramemos', 'btn') : null));
      return;
    }
    if (x.estado === 'esperando_ok' && x.puedeAprobar) {
      const error = el('p', { class: 'pz-error', role: 'alert', hidden: true });
      const ok = el('button', { class: 'btn listo', type: 'button' }, svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>'), 'Aprobar');
      const cambio = pedir('Pedir un cambio', 'btn sec');
      ok.addEventListener('click', async () => {
        if (ocupado) return;
        ocupado = true; ok.disabled = cambio.disabled = true; ok.lastChild.textContent = 'Aprobando…';
        const v = vuelta;
        try {
          const d = await P().api('/api/panel/pieza/aprobar', { pieza: x.id });
          const enLista = lista.find((k) => k.id === x.id); if (enLista) enLista.estado = 'programado';
          if (v !== vuelta) { P().tostada('Aprobada.'); P().refrescarRedes(); return; } // la cerró mientras se aprobaba
          actual = { ...actual, ...(d.pieza || {}), estado: 'programado', puedeAprobar: false, cargada: true };
          ocupado = false; modo = 'aprobada';
          pintarInfo(); pintarAcciones();
          P().refrescarRedes();
        } catch (err) {
          if (v !== vuelta) { P().tostada(err.message, true); return; }
          ocupado = false; ok.disabled = cambio.disabled = false; ok.lastChild.textContent = 'Aprobar';
          error.textContent = err.message; error.hidden = false;
        }
      });
      acciones.append(error, el('div', { class: 'pz-btns' }, ok, cambio));
      return;
    }
    // No se puede aprobar desde acá (le falta la hora o el archivo, o es de TikTok): se dice por qué.
    if (x.estado === 'esperando_ok' && x.motivo) acciones.append(el('p', { class: 'pz-motivo' }, x.motivo));
    acciones.append(el('div', { class: 'pz-btns' }, x.puedePedirCambio ? pedir('Pedir un cambio', 'btn sec') : null));
  }

  window.PiezaMyM = { abrir };
})();
