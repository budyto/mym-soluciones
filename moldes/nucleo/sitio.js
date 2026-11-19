// Lo que hace funcionar todas las landings de los moldes: WhatsApp, medición con permiso, videos livianos,
// «abierto ahora» y los trámites de arrepentimiento y de baja. Los datos del negocio llegan en window.SITIO.
(function () {
  var S = window.SITIO || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };

  // ---------- Medición (sólo con el «sí» de la persona) ----------
  var KEY = 'cookies-medicion';
  var leer = function () { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
  var cargada = false;
  function cargarMedicion() {
    if (cargada) return; cargada = true;
    if (S.ga4) {
      var g = document.createElement('script'); g.async = true; g.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(S.ga4); document.head.appendChild(g);
      window.dataLayer = window.dataLayer || []; window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag('js', new Date()); window.gtag('config', S.ga4);
    }
    if (S.pixel) {
      !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
      window.fbq('init', S.pixel); window.fbq('track', 'PageView');
    }
  }
  // Eventos: clic_whatsapp, clic_llamar, enviar_pedido, pedir_turno, tramite. Mismos nombres en todas las landings,
  // para poder comparar un cliente con otro.
  function medir(evento, datos) {
    datos = datos || {};
    if (window.gtag) window.gtag('event', evento, datos);
    if (window.fbq) window.fbq(evento === 'clic_whatsapp' || evento === 'enviar_pedido' || evento === 'pedir_turno' ? 'track' : 'trackCustom', evento === 'clic_whatsapp' || evento === 'enviar_pedido' || evento === 'pedir_turno' ? 'Contact' : evento, datos);
    document.dispatchEvent(new CustomEvent('medicion', { detail: { evento: evento, datos: datos } }));
  }
  if (S.ga4 || S.pixel) {
    var aviso = $('#cookies');
    if (leer() === 'si') cargarMedicion();
    else if (leer() !== 'no' && aviso) aviso.hidden = false;
    $$('[data-cookies]').forEach(function (b) {
      b.addEventListener('click', function () {
        try { localStorage.setItem(KEY, b.dataset.cookies); } catch (e) {}
        if (aviso) aviso.hidden = true;
        if (b.dataset.cookies === 'si') cargarMedicion();
      });
    });
  }

  // ---------- WhatsApp ----------
  var previa = $('#vista-previa');
  function cerrarPrevia() { if (previa) previa.hidden = true; }
  function abrirWa(texto, lugar, evento) {
    medir(evento || 'clic_whatsapp', { lugar: lugar || '' });
    if (S.wa) { window.open('https://wa.me/' + S.wa + '?text=' + encodeURIComponent(texto), '_blank', 'noopener'); return; }
    if (!previa) return;
    $('#previaTexto').textContent = texto;
    $('#previaResp').textContent = S.respuestaDemo || '';
    previa.hidden = false; $('[data-cerrar]', previa).focus();
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-wa]');
    if (!a) return;
    if (a.dataset.armado) return; // lo maneja el molde (pedido o turno): arma el texto y llama a abrirWa
    if (S.wa) { medir('clic_whatsapp', { lugar: a.dataset.lugar || '' }); return; } // sigue el link
    e.preventDefault(); abrirWa(a.dataset.wa, a.dataset.lugar);
  });
  $$('a[href^="tel:"]').forEach(function (a) { a.addEventListener('click', function () { medir('clic_llamar', {}); }); });
  if (previa) {
    previa.addEventListener('click', function (e) { if (e.target === previa || e.target.closest('[data-cerrar]')) cerrarPrevia(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') cerrarPrevia(); });
  }

  // ---------- Videos: se bajan y arrancan sólo cuando se ven ----------
  var quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches || (navigator.connection && navigator.connection.saveData);
  var videos = $$('video[data-video]');
  if (videos.length && !quieto && 'IntersectionObserver' in window) {
    var ojo = new IntersectionObserver(function (es) {
      es.forEach(function (x) { var v = x.target; if (x.isIntersecting) { var p = v.play(); if (p && p.catch) p.catch(function () {}); } else v.pause(); });
    }, { rootMargin: '120px' });
    videos.forEach(function (v) { ojo.observe(v); });
  }

  // ---------- Abierto ahora (hora de Buenos Aires) ----------
  $$('[data-abierto]').forEach(function (el) {
    try {
      var t = JSON.parse(el.dataset.abierto);
      var ahora = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
      var h = ahora.getHours() + ahora.getMinutes() / 60;
      var abre = (t[ahora.getDay()] || []).some(function (r) { return h >= r[0] && h < r[1]; });
      el.textContent = abre ? 'Abierto ahora' : 'Cerrado ahora'; el.classList.toggle('no', !abre);
    } catch (e) {}
  });

  // ---------- Trámites: arrepentimiento y baja (Disposición 954/2025) ----------
  // La página es estática: el código se genera acá, se muestra en el momento y viaja en el mensaje que la
  // persona manda. El negocio confirma dentro de las 24 horas por el mismo medio.
  var tipo = document.body.dataset.tramite, form = $('#formTramite');
  if (form && (tipo === 'arrepentimiento' || tipo === 'baja')) {
    var PRE = tipo === 'baja' ? 'BAJ' : 'ARR', TIT = tipo === 'baja' ? 'Botón de baja de servicio' : 'Botón de arrepentimiento';
    var LETRAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var codigo = function () {
      var d = new Date(), r = new Uint32Array(5); crypto.getRandomValues(r);
      var f = '' + d.getFullYear() + ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2);
      return PRE + '-' + f + '-' + [].map.call(r, function (n) { return LETRAS[n % LETRAS.length]; }).join('');
    };
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = {}; new FormData(form).forEach(function (v, k) { d[k] = String(v).trim(); });
      if (d.web) return;
      var faltan = ['nombre', 'documento', 'contacto', 'servicio'].filter(function (k) { return !d[k]; });
      if (faltan.length) { $('#tramiteError').textContent = 'Completá los datos marcados para generar el código.'; form.querySelector('[name=' + faltan[0] + ']').focus(); return; }
      var cod = codigo();
      var texto = [TIT + ' · ' + S.nombre, 'Código: ' + cod, 'Fecha y hora: ' + new Date().toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }),
        'Nombre: ' + d.nombre, 'DNI o CUIT: ' + d.documento, 'Contacto: ' + d.contacto, 'Sobre: ' + d.servicio,
        d.fecha ? 'Fecha: ' + d.fecha.split('-').reverse().join('/') : '', d.comentario ? 'Comentario: ' + d.comentario : ''].filter(Boolean).join('\n');
      $('#tramiteCodigo').textContent = cod;
      var wa = $('#tramiteWa'), mail = $('#tramiteMail');
      if (S.wa) wa.href = 'https://wa.me/' + S.wa + '?text=' + encodeURIComponent(texto); else wa.hidden = true;
      if (S.mail) mail.href = 'mailto:' + S.mail + '?subject=' + encodeURIComponent(TIT + ': ' + cod) + '&body=' + encodeURIComponent(texto); else mail.hidden = true;
      $('.tramite-form').hidden = true; $('.tramite-listo').hidden = false;
      window.scrollTo(0, 0); $('#tramiteCodigo').focus({ preventScroll: true });
      medir('tramite', { tipo: tipo });
    });
    $('#tramiteCopiar').addEventListener('click', function () {
      var b = this, c = $('#tramiteCodigo').textContent;
      (navigator.clipboard ? navigator.clipboard.writeText(c) : Promise.reject()).then(function () { b.textContent = 'Código copiado'; }, function () { b.textContent = 'Anotalo: ' + c; });
    });
  }

  window.MYM = { abrirWa: abrirWa, medir: medir };
})();
