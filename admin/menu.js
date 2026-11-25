// Menú general del panel admin (20/11/2026, pedido de Matías: «un menú general para todo el admin, ordenado y
// agrupado; en compu barra lateral y en el celu hamburguesa, que marque dónde estás»).
// Lo carga solo acceso.js, así que toda página de admin/ que use el login de Google lo tiene sin tocar nada.
// Aparece recién cuando la cuenta entró (ACCESO llama a MENU.mostrar / MENU.ocultar).
// Para sumar una sección: agregala en SECCIONES y listo. «ext: true» = se abre en otra pestaña.
(function () {
  if (window.MENU) return;
  const SECCIONES = [
    { items: [
      { href: './', archivo: 'index.html', ic: '🏠', t: 'Inicio', d: 'Resumen del día' },
      { href: 'ventas.html', ic: '📊', t: 'Métricas de ventas', d: 'Mails, campaña, WhatsApp, clientes y cobros' },
    ] },
    { g: 'Atender', items: [
      { href: 'whatsapp.html', ic: '💬', t: 'WhatsApp comercial', d: 'Conversaciones del 11 3366-2080' },
      { href: 'llamadas.html', ic: '📞', t: 'Llamadas', d: 'Las atiende el asistente de voz' },
      { href: 'diagnosticos.html', ic: '📊', t: 'Diagnósticos de redes', d: 'Solicitudes e informes' },
      { href: 'https://crm.creditosmym.com/', ext: true, ic: '📥', t: 'CRM de Instagram', d: 'Mensajes y respuestas automáticas' },
    ] },
    { g: 'Vender', items: [
      { href: 'mails.html', ic: '✉️', t: 'Prospección por mail', d: 'Comercios y simulaciones' },
      { href: 'campana.html', ic: '📣', t: 'Campaña a clientes de Créditos', d: 'Envíos y respuestas' },
      { href: '../propuesta/', ext: true, ic: '📄', t: 'Propuesta comercial', d: 'Planes y precios' },
    ] },
    { g: 'Clientes', items: [
      { href: 'bots.html', ic: '🤖', t: 'Clientes', d: 'Bots, servicios y cobros' },
      { href: 'cuestionarios.html', ic: '📝', t: 'Cuestionarios del Boti', d: 'Respuestas de cada cliente' },
      { href: 'avisos-whatsapp.html', ic: '💬', t: 'Avisos por WhatsApp', d: 'Plantillas y lo que salió a los dueños' },
      { href: 'aprendido.html', ic: '🧠', t: 'Lo que aprendió el Boti', d: 'Aprobar, corregir y deshacer', cuenta: '/api/admin/aprendido/pendientes' },
      { href: 'facturacion.html', ic: '🧾', t: 'Facturación', d: 'Comprobantes ARCA' },
      { href: '../panel/', ext: true, ic: '📱', t: 'Portal de clientes', d: 'La vista de cada cliente' },
    ] },
    { g: 'Contenido', items: [
      { href: '../guias/', ext: true, ic: '📘', t: 'Guías de los reels', d: 'Material para quien comenta' },
      { href: 'https://www.instagram.com/mymsoluciones369/', ext: true, ic: '📸', t: 'Instagram', d: '@mymsoluciones369' },
      { href: 'https://business.facebook.com/latest/home', ext: true, ic: '📈', t: 'Meta Business Suite', d: 'Métricas y anuncios' },
    ] },
    { g: 'Páginas públicas', plegado: true, items: [
      { href: '../', ext: true, ic: '🌐', t: 'Sitio web', d: 'Vista pública' },
      { href: '../diagnostico-redes/', ext: true, ic: '🔎', t: 'Diagnóstico gratuito', d: 'Formulario público' },
      { href: '../alta/', ext: true, ic: '✍️', t: 'Alta del bot', d: 'Autogestión del cliente' },
      { href: '../sorteo/', ext: true, ic: '🎁', t: 'Sorteo', d: 'Bases e inscripción' },
      { href: '../arrepentimiento/', ext: true, ic: '↩️', t: 'Botón de arrepentimiento', d: 'Ley 24.240' },
      { href: '../baja/', ext: true, ic: '⏹️', t: 'Botón de baja', d: 'Baja de un servicio' },
      { href: '../demos/plomeriamansilla/', ext: true, ic: '🛠️', t: 'Demo Plomería Mansilla', d: 'Landing de muestra' },
    ] },
    { g: 'Grupo', items: [
      { href: 'https://grupomym.online/', ext: true, ic: '🧭', t: 'Panel del Grupo MyM', d: 'Empresas y pendientes' },
    ] },
  ];

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const aqui = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  const esAqui = (it) => !it.ext && (it.archivo || it.href).toLowerCase() === aqui;
  const ANCHO = 1000; // desde acá para arriba, barra lateral fija; para abajo, hamburguesa

  const css = `
  .mm-lat{position:fixed;top:0;left:0;bottom:0;width:240px;z-index:45;background:#fff;border-right:1px solid #dbe4f7;
    display:flex;flex-direction:column;font:14px/1.35 Archivo,ui-sans-serif,system-ui,sans-serif;color:#0e1a33;transform:translateX(-102%);transition:transform .2s ease}
  .mm-lat .mm-cab{display:flex;align-items:center;gap:8px;padding:16px 16px 10px}
  .mm-lat .mm-logo{font:900 18px Archivo,system-ui,sans-serif;letter-spacing:-.02em;text-decoration:none;color:#0e1a33}
  .mm-lat .mm-logo span{background:linear-gradient(120deg,#2458e6,#007a6a);-webkit-background-clip:text;background-clip:text;color:transparent}
  .mm-lat .mm-cerrar{margin-left:auto;border:0;background:#eef3ff;border-radius:10px;width:34px;height:34px;font-size:18px;cursor:pointer;color:#0e1a33}
  .mm-lat nav{flex:1;overflow:auto;padding:0 10px 16px}
  .mm-g{font:500 10.5px "Martian Mono",ui-monospace,monospace;letter-spacing:.14em;text-transform:uppercase;color:#4a5878;margin:14px 8px 4px}
  .mm-lat details>summary{list-style:none;cursor:pointer}.mm-lat details>summary::-webkit-details-marker{display:none}
  .mm-lat details>summary.mm-g::after{content:" ▾"}.mm-lat details[open]>summary.mm-g::after{content:" ▴"}
  .mm-it{display:flex;align-items:center;gap:10px;padding:7px 8px;border-radius:10px;text-decoration:none;color:#0e1a33}
  .mm-it:hover{background:#f4f7ff}
  .mm-it .mm-ic{flex:0 0 28px;height:28px;border-radius:9px;background:#eef3ff;display:grid;place-items:center;font-size:15px}
  .mm-it b{display:block;font-weight:600;font-size:13.5px}.mm-it small{display:block;color:#4a5878;font-size:11.5px}
  .mm-it .mm-ext{margin-left:auto;color:#8a96b3;font-size:12px}
  .mm-it .mm-n{margin-left:auto;flex:0 0 auto;min-width:22px;height:22px;padding:0 6px;border-radius:99px;background:#c2364e;color:#fff;display:grid;place-items:center;font:800 12.5px Archivo,system-ui,sans-serif}
  .mm-it .mm-n[hidden]{display:none}
  .mm-it[aria-current=page]{background:#e6eeff;box-shadow:inset 3px 0 0 #2f6bff}.mm-it[aria-current=page] b{color:#1f57e6}
  .mm-pie{padding:10px 16px 14px;border-top:1px solid #eef2fb;font-size:12px;color:#4a5878}
  .mm-velo{position:fixed;inset:0;background:rgba(14,26,51,.45);z-index:44;display:none}
  .mm-boton{display:inline-flex;align-items:center;justify-content:center;gap:6px;border:1px solid #dbe4f7;background:#fff;color:#0e1a33;
    border-radius:12px;height:38px;min-width:38px;padding:0 10px;font:600 14px Archivo,system-ui,sans-serif;cursor:pointer;flex:0 0 auto}
  .mm-boton svg{width:20px;height:20px}
  .mm-flota{position:fixed;top:10px;left:10px;z-index:43;box-shadow:0 6px 18px rgba(14,26,51,.12)}
  html.mm-abierto .mm-lat{transform:none}html.mm-abierto .mm-velo{display:block}
  html.mm-on .mm-viejo{display:none!important}
  html:not(.mm-on) .mm-lat,html:not(.mm-on) .mm-boton,html:not(.mm-on) .mm-velo{display:none!important}
  @media (min-width:${ANCHO}px){
    html.mm-on:not(.mm-plegado) .mm-lat{transform:none}
    html.mm-on:not(.mm-plegado) body{padding-left:240px}
    html.mm-on body{transition:padding-left .2s ease}
    html.mm-on:not(.mm-plegado) .mm-boton,html.mm-on .mm-velo{display:none!important}
  }
  @media print{.mm-lat,.mm-velo,.mm-boton{display:none!important}html.mm-on body{padding-left:0!important}}`;

  function armar() {
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    const lat = document.createElement('aside');
    lat.className = 'mm-lat'; lat.id = 'mmMenu'; lat.setAttribute('aria-label', 'Menú del panel');
    const fila = (it) => `<a class="mm-it" href="${esc(it.href)}"${it.ext ? ' target="_blank" rel="noopener"' : ''}${esAqui(it) ? ' aria-current="page"' : ''}>
      <span class="mm-ic" aria-hidden="true">${it.ic}</span><span><b>${esc(it.t)}</b><small>${esc(it.d)}</small></span>${it.ext ? '<span class="mm-ext" aria-label="se abre en otra pestaña">↗</span>' : ''}${it.cuenta ? `<span class="mm-n" data-cuenta="${esc(it.href)}" hidden></span>` : ''}</a>`;
    lat.innerHTML = `<div class="mm-cab"><a class="mm-logo" href="./">MyM <span>Soluciones</span></a>
      <button class="mm-cerrar" type="button" aria-label="Ocultar el menú" title="Ocultar el menú">«</button></div>
      <nav>${SECCIONES.map((s) => {
        const items = s.items.map(fila).join('');
        if (!s.g) return items;
        const abierto = !s.plegado || s.items.some(esAqui);
        return s.plegado ? `<details${abierto ? ' open' : ''}><summary class="mm-g">${esc(s.g)}</summary>${items}</details>` : `<div class="mm-g">${esc(s.g)}</div>${items}`;
      }).join('')}</nav>
      <div class="mm-pie" id="mmQuien">Panel interno · sólo cuentas autorizadas</div>`;
    const velo = document.createElement('div'); velo.className = 'mm-velo';
    document.body.appendChild(velo); document.body.appendChild(lat);
    velo.addEventListener('click', cerrarCajon);
    lat.querySelector('.mm-cerrar').addEventListener('click', cerrar);
    lat.addEventListener('click', (e) => { if (e.target.closest('a.mm-it')) cerrarCajon(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarCajon(); });
    ponerBoton();
  }

  // El botón ☰ va en el lugar del «← Inicio» que ya tiene cada página, así no cambia la altura de nada
  // (whatsapp.html entra justo en la pantalla). Si la página no tiene ese link, queda flotando arriba a la izquierda.
  const VIEJOS = ['.wa-inicio', 'header > a[href="./"]', 'header > a[href="index.html"]', 'header .fila > a[href="./"]', '.top .logo'];
  function ponerBoton() {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'mm-boton'; b.setAttribute('aria-label', 'Abrir el menú'); b.setAttribute('aria-controls', 'mmMenu');
    b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
    b.addEventListener('click', abrir);
    let viejo = null;
    for (const s of VIEJOS) { viejo = document.querySelector(s); if (viejo) break; }
    if (viejo) { viejo.classList.add('mm-viejo'); viejo.parentNode.insertBefore(b, viejo); }
    else { b.classList.add('mm-flota'); document.body.appendChild(b); }
  }

  // En la compu la barra se oculta y se vuelve a mostrar con el mismo ☰; queda recordado en este navegador.
  // En el celu el ☰ abre un cajón encima de la página.
  const H = document.documentElement;
  const enCompu = () => window.matchMedia('(min-width:' + ANCHO + 'px)').matches;
  const recordar = (v) => { try { localStorage.setItem('mm-plegado', v ? '1' : ''); } catch (e) { /* sin almacenamiento: dura lo que la página */ } };
  try { if (localStorage.getItem('mm-plegado')) H.classList.add('mm-plegado'); } catch (e) { /* idem */ }
  function abrir() {
    if (enCompu()) { H.classList.remove('mm-plegado'); recordar(false); return; }
    H.classList.add('mm-abierto'); const a = document.querySelector('#mmMenu [aria-current=page]') || document.querySelector('#mmMenu a'); if (a) a.focus({ preventScroll: true });
  }
  function cerrarCajon() { H.classList.remove('mm-abierto'); }
  function cerrar() { if (enCompu()) { H.classList.add('mm-plegado'); recordar(true); } else cerrarCajon(); }
  // Contadores (21/11/2026): un ítem con «cuenta» muestra cuántas cosas esperan ahí (hoy, los datos que el Boti
  // aprendió y hay que aprobar). El número sale de la plataforma de bots: { total }. Si no responde, no se muestra nada.
  function contar(href, n) {
    const g = document.querySelector('#mmMenu .mm-n[data-cuenta="' + href + '"]'); if (!g) return;
    g.hidden = !(n > 0); g.textContent = n > 99 ? '99+' : String(n || '');
    g.setAttribute('aria-label', n === 1 ? '1 para aprobar' : n + ' para aprobar');
  }
  async function cargarCuentas() {
    const api = String((LOCAL && new URLSearchParams(location.search).get('api')) || (window.SITE || {}).plataformaApi || '').replace(/\/+$/, '');
    if (!api || !window.ACCESO) return;
    for (const it of SECCIONES.flatMap((s) => s.items).filter((x) => x.cuenta)) {
      try {
        const r = await fetch(api + it.cuenta, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await window.ACCESO.token() }, body: '{}' });
        if (r.ok) contar(it.href, Number((await r.json()).total) || 0);
      } catch (e) { /* sin conexión o servidor viejo: el menú queda sin número */ }
    }
  }
  let listo = false;
  function mostrar(u) {
    if (!listo) { armar(); listo = true; cargarCuentas(); }
    document.documentElement.classList.add('mm-on');
    if (u && u.email) { const q = document.getElementById('mmQuien'); if (q) q.textContent = u.email; }
  }
  function ocultar() { if (LOCAL) return; document.documentElement.classList.remove('mm-on', 'mm-abierto'); }
  const LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);

  window.MENU = { mostrar, ocultar, abrir, cerrar, contar, SECCIONES };
  if (window.__menuPendiente) mostrar(window.__menuPendiente);
})();
// En la compu (localhost) no hay puerta de Google (el proyecto no tiene habilitado localhost): el menú se muestra
// igual, para poder probarlo. En la web publicada sólo aparece después de entrar.
if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && window.MENU) window.MENU.mostrar({ email: 'prueba en la compu' });
