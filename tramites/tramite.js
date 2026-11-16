// Trámites sin registrarse: botón de arrepentimiento (Disposición 954/2025) y botón de baja (14/11/2026).
// La web es estática (Hostinger) y todavía no tiene base propia, así que el código del trámite se genera acá,
// se muestra en el momento y viaja en el mensaje que la persona manda por WhatsApp o por mail.
// El trámite cuenta desde que llega ese mensaje. Cuando exista el servidor de la plataforma, el formulario
// se le manda directo y el código queda guardado del lado de MyM.
(function () {
  const cfg = window.SITE || {};
  const tipo = document.body.dataset.tramite; // "arrepentimiento" | "baja"
  const PREFIJO = { arrepentimiento: 'ARR', baja: 'BAJ' }[tipo];
  const TITULO = { arrepentimiento: 'Botón de arrepentimiento', baja: 'Botón de baja de servicio' }[tipo];
  const MAIL = 'info@mymsoluciones.online';
  const $ = (s) => document.querySelector(s);

  // Código legible y sin letras que se confundan (sin 0/O ni 1/I)
  const LETRAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  function codigo() {
    const d = new Date();
    const f = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const r = new Uint32Array(5); (window.crypto || window.msCrypto).getRandomValues(r);
    return `${PREFIJO}-${f}-${[...r].map((n) => LETRAS[n % LETRAS.length]).join('')}`;
  }

  const form = $('#form');
  // Cuando el servidor de la plataforma está prendido (SITE.plataformaApi), el trámite y su código quedan
  // guardados del lado de MyM al instante. Si no responde, el código se arma acá como antes.
  const API = String(cfg.plataformaApi || '').replace(/\/+$/, '');
  async function codigoDelServidor(d) {
    if (!API) return null;
    try {
      const r = await fetch(API + '/api/tramites', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo, nombre: d.nombre, documento: d.documento, contacto: d.contacto, servicio: d.servicio, fecha: d.fecha, comentario: d.comentario }) });
      return r.ok ? (await r.json()).codigo : null;
    } catch (e) { return null; }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(form).entries());
    if (d.web) return; // trampa anti-spam
    const faltan = ['nombre', 'documento', 'contacto', 'servicio'].filter((k) => !String(d[k] || '').trim());
    if (faltan.length) { $('#error').textContent = 'Completá los datos marcados para generar el código.'; form.querySelector(`[name=${faltan[0]}]`).focus(); return; }
    $('#error').textContent = '';
    const boton = form.querySelector('[type=submit]'); boton.disabled = true;
    const cod = (await codigoDelServidor(d)) || codigo();
    boton.disabled = false;
    const cuando = new Date().toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
    const lineas = [
      `${TITULO} de MyM Soluciones`,
      `Código: ${cod}`,
      `Fecha y hora: ${cuando}`,
      `Nombre: ${d.nombre}`,
      `DNI o CUIT: ${d.documento}`,
      `Contacto: ${d.contacto}`,
      `Servicio: ${d.servicio}`,
      d.fecha ? `Fecha de contratación: ${d.fecha.split('-').reverse().join('/')}` : '',
      d.comentario ? `Comentario: ${d.comentario}` : ''
    ].filter(Boolean);
    const texto = lineas.join('\n');
    $('#cod').textContent = cod;
    $('#wa').href = `https://wa.me/${cfg.whatsapp || '5491133662080'}?text=${encodeURIComponent(texto)}`;
    $('#mail').href = `mailto:${MAIL}?subject=${encodeURIComponent(`${TITULO}: ${cod}`)}&body=${encodeURIComponent(texto)}`;
    document.body.classList.add('listo');
    window.scrollTo({ top: 0 });
    $('#cod').focus({ preventScroll: true });
  });

  const copiar = $('#copiar');
  if (copiar) copiar.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($('#cod').textContent); copiar.textContent = 'Código copiado'; } catch (e) { copiar.textContent = 'Anotalo: ' + $('#cod').textContent; }
  });
})();
