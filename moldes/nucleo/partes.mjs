// Las piezas que llevan TODAS las landings, sea cual sea el molde. Un cambio legal o de medición se hace acá
// una sola vez y después se corre `node moldes/generar.mjs --todos`.
//
// Norma de los botones: Disposición 954/2025 de la Subsecretaría de Defensa del Consumidor y Lealtad Comercial
// (B.O. 4/9/2025), arts. 1, 4, 5 y 6. Texto abierto en argentina.gob.ar/normativa/nacional/norma-417152/texto
// el 19/11/2026. Los enlaces se llaman exactamente «BOTÓN DE ARREPENTIMIENTO» y «BOTÓN DE BAJA DE SERVICIO»
// y van «a simple vista, en lugar destacado y en el primer acceso», sin pedir registro.
// Acá van en el pie de la página de inicio. Que el pie alcance como «lugar destacado» es una lectura, no un
// dictamen: queda para que lo confirme la abogada.
import { esc, linkWa, linkTel, cuitLindo, soloNumeros, rangoLindo, horariosSchema, variablesCss, tablaHorarios } from './util.mjs';

export const NOMBRE_ARREPENTIMIENTO = 'BOTÓN DE ARREPENTIMIENTO';
export const NOMBRE_BAJA = 'BOTÓN DE BAJA DE SERVICIO';
export const NORMA_VISTA = '19/11/2026';
// En una demo los links internos apuntan al archivo, para poder abrir la muestra con doble clic, sin servidor.
const ir = (c, destino) => (c.estado === 'demo' ? `${destino}index.html` : destino || './');

export const ICONOS = {
  wa: '<svg viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3zm0 23.6c-2 0-4-.5-5.7-1.6l-.4-.2-3.9 1 1-3.8-.3-.4A10.6 10.6 0 1 1 16 26.6zm5.8-7.9c-.3-.2-1.9-.9-2.2-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7.1a8.7 8.7 0 0 1-4.3-3.8c-.3-.6.3-.5.9-1.7.1-.2 0-.4 0-.5l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6a1.2 1.2 0 0 0-.9.4 3.7 3.7 0 0 0-1.1 2.7 6.4 6.4 0 0 0 1.3 3.4 14.7 14.7 0 0 0 5.6 5c2.1.9 2.9 1 4 .8.6-.1 1.9-.8 2.2-1.5s.3-1.4.2-1.5-.3-.2-.6-.3z"/></svg>',
  tel: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z"/></svg>',
  pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.6A2.6 2.6 0 1 1 12 6.4a2.6 2.6 0 0 1 0 5.2z"/></svg>',
  reloj: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7v5.2l3.4 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  camion: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" d="M2 6h12v10H2zM14 10h4l3 3v3h-7z"/><circle cx="6" cy="17.5" r="2" fill="currentColor"/><circle cx="17" cy="17.5" r="2" fill="currentColor"/></svg>',
  tilde: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>',
  tiktok: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.6 5.8A4.3 4.3 0 0 1 15.5 3h-3.1v12.4a2.6 2.6 0 1 1-2.6-2.6c.3 0 .5 0 .8.1V9.7a5.8 5.8 0 1 0 5 5.7V9.1a7.4 7.4 0 0 0 4.3 1.4V7.4a4.3 4.3 0 0 1-3.3-1.6z"/></svg>',
  facebook: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M14 8h3V4h-3c-2.8 0-4 1.7-4 4.2V10H7v4h3v8h4v-8h3l.5-4H14V8.6c0-.4.2-.6.6-.6z"/></svg>',
  google: '<svg viewBox="0 0 48 48" role="img" aria-label="Google"><path fill="#4285F4" d="M45 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8a10 10 0 0 1-4.4 6.6v5.5h7.1c4.2-3.8 6.5-9.5 6.5-16.1z"/><path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.4l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.6-3.9-12.3-9.1H4.4v5.7A22 22 0 0 0 24 46z"/><path fill="#FBBC05" d="M11.7 28.1a13.2 13.2 0 0 1 0-8.2v-5.7H4.4a22 22 0 0 0 0 19.6z"/><path fill="#EA4335" d="M24 10.8c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3A22 22 0 0 0 4.4 14.2l7.3 5.7C13.4 14.7 18.3 10.8 24 10.8z"/></svg>',
};

const PENDIENTE = (que) => `<mark class="pendiente">falta ${esc(que)}</mark>`;
const dato = (v, que) => (v ? esc(v) : PENDIENTE(que));

export const mensajeBase = (c) => c.contacto?.mensaje || 'Hola, quiero hacer una consulta.';
export const waMostrar = (c) => c.contacto?.whatsappMostrar || '';
export const mailTramites = (c) => c.legal?.mail || c.contacto?.mail || '';
export const botonesLegales = (c) => ({
  arrepentimiento: c.legal?.botones?.arrepentimiento !== false,
  baja: c.legal?.botones?.baja !== false,
});

// Botón o link que abre WhatsApp con el mensaje ya escrito. Sin JavaScript igual funciona (es un link).
// `lugar` es el nombre con el que queda en la medición (ej. «inicio», «cierre», «flotante»).
export function botonWa(c, { texto, mensaje, lugar, clase = 'btn btn-wa', icono = true, attrs = '' }) {
  const msj = mensaje || mensajeBase(c);
  const n = soloNumeros(c.contacto?.whatsapp);
  return `<a class="${clase}" href="${n ? esc(linkWa(n, msj)) : '#vista-previa'}" ${n ? 'target="_blank" rel="noopener"' : ''} data-wa="${esc(msj)}" data-lugar="${esc(lugar || '')}" ${attrs}>${icono ? ICONOS.wa : ''}<span>${esc(texto)}</span></a>`;
}

// ---------- Cabecera del documento ----------
export function documento({ c, p, molde, cuerpo, ruta = '', titulo, descripcion, indexar = true, claseBody = '', jsonld = true, tramite = '', version }) {
  const demo = c.estado === 'demo';
  const dominio = c.seo?.dominio ? `https://${c.seo.dominio.replace(/^https?:\/\//, '').replace(/\/$/, '')}` : '';
  const canonica = dominio ? `${dominio}/${ruta ? tramite + '/' : ''}` : '';
  const imagen = c.seo?.imagen || c.inicio?.foto || '';
  const datos = {
    nombre: c.marca.nombre, wa: soloNumeros(c.contacto?.whatsapp), mail: mailTramites(c), demo,
    ga4: demo ? '' : (c.medicion?.ga4 || ''), pixel: demo ? '' : (c.medicion?.metaPixel || ''),
    molde: c.molde, respuestaDemo: c.contacto?.respuestaDemo || '',
  };
  const ld = jsonld && !ruta ? `<script type="application/ld+json">${JSON.stringify(esquema(c, dominio)).replace(/</g, '\\u003c')}</script>` : '';
  return `<!doctype html>
<html lang="es-AR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(descripcion)}">
${demo || !indexar ? '<meta name="robots" content="noindex, nofollow">' : ''}
${canonica && !demo ? `<link rel="canonical" href="${esc(canonica)}">` : ''}
<meta name="theme-color" content="${p[molde.colorNavegador || 'c1']}">
<meta property="og:type" content="website">
<meta property="og:locale" content="es_AR">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(descripcion)}">
${imagen && dominio ? `<meta property="og:image" content="${esc(dominio + '/' + imagen)}">` : ''}
<link rel="icon" href="${c.marca.icono ? esc(ruta + c.marca.icono) : favicon(c, p)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${molde.fuentes}" rel="stylesheet">
<style>${variablesCss(p)}</style>
<link rel="stylesheet" href="${ruta}estilo.css?v=${version}">
${ld}
</head>
<body class="molde-${c.molde} ${claseBody}"${tramite ? ` data-tramite="${tramite}"` : ''}>
<a class="saltar" href="#contenido">Ir al contenido</a>
${demo ? `<div class="cinta-demo">${c.ficticio ? `<b>Muestra del molde.</b> ${esc(c.marca.nombre)} es un negocio inventado por MyM Soluciones: los datos, los precios y las personas no existen.` : `<b>Demo de muestra</b> preparada por MyM Soluciones para ${esc(c.marca.nombre)}. Todavía no está publicada.`}</div>` : ''}
${cuerpo}
<script>window.SITIO=${JSON.stringify(datos).replace(/</g, '\\u003c')}</script>
<script src="${ruta}sitio.js?v=${version}" defer></script>
</body>
</html>
`;
}

function favicon(c, p) {
  const letra = (c.marca.nombre || 'M').trim()[0].toUpperCase();
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='14' fill='${p.c1}'/><text x='32' y='44' font-family='Arial,sans-serif' font-size='36' font-weight='700' text-anchor='middle' fill='${p['sobre-c1']}'>${letra}</text></svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

function esquema(c, dominio) {
  const z = c.zona || {};
  const uno = (nombre, direccion, horarios) => ({
    '@type': c.seo?.tipo || 'LocalBusiness', name: nombre, description: c.marca.queHace,
    ...(dominio ? { url: dominio } : {}),
    ...(c.contacto?.telefono || c.contacto?.whatsapp ? { telephone: '+' + soloNumeros(c.contacto.telefonoInternacional || c.contacto.whatsapp) } : {}),
    ...(direccion ? { address: { '@type': 'PostalAddress', streetAddress: direccion, addressLocality: z.localidad || '', addressRegion: z.provincia || '', addressCountry: 'AR' } } : {}),
    areaServed: z.texto,
    openingHoursSpecification: horariosSchema(horarios || c.contacto?.horarios),
  });
  const locales = c.sucursales?.length ? c.sucursales.map((s) => uno(s.nombre, s.direccion, s.horarios)) : [uno(c.marca.nombre, z.direccion)];
  return { '@context': 'https://schema.org', '@graph': locales };
}

// ---------- Los dos botones legales ----------
// Van siempre en el pie de la página de inicio, destacados (decisión de Budy del 19/11/2026: sólo en el pie).
// Si la abogada pide que además estén arriba de todo, se prende en la ficha con legal.botonesArriba: true.
export function franjaLegal(c, ruta = '') {
  const b = botonesLegales(c);
  if (c.legal?.botonesArriba !== true) return '';
  if (!b.arrepentimiento && !b.baja) return '';
  return `<nav class="legal-arriba" aria-label="Trámites del consumidor">
${b.arrepentimiento ? `<a href="${ir(c, ruta + 'arrepentimiento/')}">${NOMBRE_ARREPENTIMIENTO}</a>` : ''}
${b.baja ? `<a href="${ir(c, ruta + 'baja/')}">${NOMBRE_BAJA}</a>` : ''}
</nav>`;
}

// ---------- Pie: quién es el responsable del sitio (el cliente) ----------
export function pie(c, ruta = '') {
  const l = c.legal || {};
  const b = botonesLegales(c);
  const redes = Object.entries(c.contacto?.redes || {}).filter(([k, v]) => v && ICONOS[k]);
  const hor = (c.legal?.horarioReclamos) || (c.contacto?.horarios || []).filter((h) => !h.cerrado).map((h) => `${h.dias.toLowerCase()} de ${rangoLindo(h)}`).join(', ');
  const mail = mailTramites(c);
  return `<footer class="pie">
<div class="ancho pie-grilla">
  <div class="pie-marca">
    <p class="pie-nombre">${esc(c.marca.nombre)}</p>
    <p>${esc(c.marca.queHace)}</p>
    ${redes.length ? `<p class="pie-redes">${redes.map(([k, v]) => `<a href="${esc(v)}" target="_blank" rel="noopener" aria-label="${k[0].toUpperCase() + k.slice(1)} de ${esc(c.marca.nombre)}">${ICONOS[k]}</a>`).join('')}</p>` : ''}
  </div>
  <div>
    <p class="pie-titulo">Responsable de este sitio</p>
    <p>${dato(l.razonSocial, 'la razón social')}<br>CUIT ${l.cuit ? esc(cuitLindo(l.cuit)) : PENDIENTE('el CUIT')}${l.condicionIva ? ` · ${esc(l.condicionIva)}` : ''}<br>${dato(l.domicilio, 'el domicilio legal')}</p>
  </div>
  <div>
    <p class="pie-titulo">Consultas y reclamos</p>
    <p>${esc(l.areaReclamos || 'Atención al cliente')}<br>
    ${waMostrar(c) ? `WhatsApp ${esc(waMostrar(c))}<br>` : ''}${c.contacto?.telefono ? `Teléfono <a href="${linkTel(c.contacto.telefono)}">${esc(c.contacto.telefono)}</a><br>` : ''}${mail ? `<a href="mailto:${esc(mail)}">${esc(mail)}</a><br>` : ''}
    ${hor ? `Atendemos ${esc(hor)}.` : ''}</p>
  </div>
  <div class="pie-tramites">
    <p class="pie-titulo">Trámites</p>
    ${b.arrepentimiento ? `<a class="btn-legal" href="${ir(c, ruta + 'arrepentimiento/')}">${NOMBRE_ARREPENTIMIENTO}</a>` : ''}
    ${b.baja ? `<a class="btn-legal" href="${ir(c, ruta + 'baja/')}">${NOMBRE_BAJA}</a>` : ''}
    <a href="${ir(c, ruta + 'privacidad/')}">Política de privacidad</a>
  </div>
</div>
<div class="ancho pie-base">
  <span>© ${new Date().getFullYear()} ${esc(l.razonSocial || c.marca.nombre)}</span>
  ${c.creditoMym === false ? '' : '<span>Sitio hecho por <a href="https://mymsoluciones.online" target="_blank" rel="noopener">MyM Soluciones</a></span>'}
</div>
${c.creditosFotos ? `<details class="ancho pie-creditos"><summary>Créditos de las fotos</summary><p>${esc(c.creditosFotos)}</p></details>` : ''}
</footer>`;
}

// ---------- Aviso de cookies (sólo si hay medición), vista previa de la demo y botón flotante ----------
export function extras(c, { flotante = true, mensajeFlotante } = {}) {
  const hayMedicion = c.estado !== 'demo' && (c.medicion?.ga4 || c.medicion?.metaPixel);
  const iniciales = c.marca.nombre.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  return `${flotante ? botonWa(c, { texto: 'Escribir por WhatsApp', mensaje: mensajeFlotante, lugar: 'flotante', clase: 'wa-flotante' }) : ''}
${hayMedicion ? `<div class="cookies" id="cookies" hidden role="dialog" aria-label="Aviso de cookies">
<p>Usamos cookies de medición para saber cuánta gente entra y qué botones se usan. No se cargan si no aceptás. <a href="${ir(c, 'privacidad/')}">Más información</a></p>
<div><button type="button" class="btn btn-linea" data-cookies="no">Rechazar</button><button type="button" class="btn btn-principal" data-cookies="si">Aceptar</button></div>
</div>` : ''}
${soloNumeros(c.contacto?.whatsapp) ? '' : `<div class="previa" id="vista-previa" role="dialog" aria-modal="true" aria-labelledby="previaTit" hidden>
<div class="previa-chat">
  <div class="previa-arriba"><span class="previa-av">${esc(iniciales)}</span><div><b id="previaTit">${esc(c.marca.nombre)}</b><small>WhatsApp</small></div><button type="button" data-cerrar aria-label="Cerrar">×</button></div>
  <p class="previa-nota"><b>Demo:</b> así llega el mensaje al WhatsApp del negocio. En la página publicada, este botón abre WhatsApp con el texto ya escrito.</p>
  <div class="previa-cuerpo"><p class="burbuja" id="previaTexto"></p><p class="burbuja burbuja-resp" id="previaResp"></p></div>
</div></div>`}`;
}

// ---------- Páginas de trámite: arrepentimiento y baja ----------
function cabeceraSimple(c, ruta) {
  return `<header class="cab-simple"><div class="ancho"><a class="cab-simple-marca" href="${ir(c, ruta)}">${esc(c.marca.nombre)}</a><a class="cab-simple-volver" href="${ir(c, ruta)}">Volver al inicio</a></div></header>`;
}

export function paginaTramite(c, p, molde, tipo, version) {
  const arr = tipo === 'arrepentimiento';
  const l = c.legal || {};
  const opciones = (arr ? l.queSeVende : l.queSeDaDeBaja) || l.queSeVende || [];
  const quien = esc(c.marca.nombre);
  const cuerpo = `${cabeceraSimple(c, '../')}
<main id="contenido" class="tramite ancho">
<div class="tramite-form">
  <p class="tramite-norma">${arr ? NOMBRE_ARREPENTIMIENTO : NOMBRE_BAJA}</p>
  <h1>${arr ? '¿Te arrepentiste de una compra o contratación?' : '¿Querés dar de baja un servicio?'}</h1>
  <p class="tramite-bajada">${arr
    ? `Si compraste o contrataste a ${quien} por internet, por teléfono o por WhatsApp, tenés <b>10 días corridos</b> para revocar la operación, sin dar motivos y sin costo (art. 34 de la Ley 24.240 y art. 1110 del Código Civil y Comercial). El plazo corre desde que recibiste el producto o desde que contrataste, lo que pase último.`
    : `Podés pedir la baja de un servicio contratado a ${quien} desde acá, por el mismo medio por el que lo contrataste y sin trámites extra (art. 10 ter de la Ley 24.240).`}</p>
  <ul class="tramite-datos">
    <li>${ICONOS.tilde}<span>No necesitás <b>registrarte ni explicar por qué</b>.</span></li>
    <li>${ICONOS.tilde}<span>Te damos el <b>código del trámite en el momento</b>: es tu constancia.</span></li>
    <li>${ICONOS.tilde}<span>${arr ? 'Si ya pagaste, te devolvemos el importe <b>por el mismo medio de pago</b>.' : 'Dentro de las <b>24 horas</b> te confirmamos la baja por el mismo medio.'}</span></li>
  </ul>
  <form id="formTramite" class="tramite-tarjeta" novalidate>
    <label>Nombre y apellido<input name="nombre" autocomplete="name" required></label>
    <label>DNI o CUIT<input name="documento" inputmode="numeric" required></label>
    <label>WhatsApp o mail <small>Por acá te confirmamos el trámite.</small><input name="contacto" required></label>
    <label>${arr ? 'Qué compraste o contrataste' : 'Qué servicio querés dar de baja'}
      ${opciones.length ? `<select name="servicio" required><option value="">Elegí una opción</option>${opciones.map((o) => `<option>${esc(o)}</option>`).join('')}<option>Otro</option></select>` : '<input name="servicio" required>'}</label>
    <label>${arr ? 'Fecha de la compra o de la entrega' : 'Desde cuándo lo tenés'} <small>Si no te acordás, dejala vacía.</small><input name="fecha" type="date"></label>
    <label>Comentario <small>Opcional.</small><textarea name="comentario" rows="2"></textarea></label>
    <label class="trampa" aria-hidden="true">No completar<input name="web" tabindex="-1" autocomplete="off"></label>
    <p class="tramite-error" id="tramiteError" role="alert"></p>
    <button class="btn btn-principal" type="submit">Generar el código del trámite</button>
    <p class="tramite-nota">${arr
      ? 'El arrepentimiento no rige si ya usaste o consumiste lo comprado, en productos perecederos, ni si compraste para revender o para tu propia actividad comercial (art. 3 de la Disposición 954/2025).'
      : `¿Compraste hace menos de 10 días? También podés usar el <a href="${ir(c, '../arrepentimiento/')}">botón de arrepentimiento</a>.`}</p>
    <p class="tramite-nota tramite-aviso-datos">Los datos de este formulario se usan sólo para registrar y contestar tu trámite. Responsable: ${dato(l.razonSocial, 'la razón social')}. <a href="${ir(c, '../privacidad/')}">Política de privacidad</a>.</p>
  </form>
</div>
<section class="tramite-listo" aria-live="polite" hidden>
  <p class="tramite-norma">${arr ? NOMBRE_ARREPENTIMIENTO : NOMBRE_BAJA}</p>
  <h1>Este es el código de tu trámite</h1>
  <p class="tramite-codigo" id="tramiteCodigo" tabindex="-1"></p>
  <p><b>Último paso: mandanos el pedido.</b> Ya va armado con tus datos y el código. El trámite cuenta desde que nos llega.</p>
  <div class="tramite-botones">
    <a class="btn btn-wa" id="tramiteWa" target="_blank" rel="noopener">${ICONOS.wa}<span>Mandarlo por WhatsApp</span></a>
    <a class="btn btn-linea" id="tramiteMail">Mandarlo por mail</a>
    <button class="btn btn-linea" id="tramiteCopiar" type="button">Copiar el código</button>
  </div>
  <p class="tramite-nota">Dentro de las 24 horas te confirmamos por el mismo medio que lo recibimos${arr ? ' y cómo te devolvemos lo que pagaste' : ''} (art. 5 de la Disposición 954/2025). Guardá el código.</p>
</section>
</main>
${pie(c, '../')}`;
  return documento({
    c, p, molde, cuerpo, ruta: '../', tramite: tipo, version, indexar: false,
    titulo: `${arr ? 'Botón de arrepentimiento' : 'Botón de baja de servicio'} · ${c.marca.nombre}`,
    descripcion: arr ? `Revocá una compra o contratación a ${c.marca.nombre} dentro de los 10 días corridos, sin registrarte y sin dar motivos.` : `Pedí la baja de un servicio de ${c.marca.nombre} sin registrarte y sin trámites extra.`,
  });
}

// ---------- Política de privacidad (Ley 25.326) ----------
export function paginaPrivacidad(c, p, molde, version) {
  const l = c.legal || {};
  const m = c.medicion || {};
  const hayMedicion = c.estado !== 'demo' && (m.ga4 || m.metaPixel);
  const mail = mailTramites(c);
  const hoy = new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
  const contacto = [waMostrar(c) && `por WhatsApp al ${esc(waMostrar(c))}`, mail && `a <a href="mailto:${esc(mail)}">${esc(mail)}</a>`].filter(Boolean).join(' o ') || PENDIENTE('el canal de contacto');
  const cuerpo = `${cabeceraSimple(c, '../')}
<main id="contenido" class="texto-legal ancho">
<h1>Política de privacidad</h1>
<p class="texto-legal-fecha">Última actualización: ${hoy}.</p>
<h2>Quién es responsable de tus datos</h2>
<p>${dato(l.razonSocial, 'la razón social')}, CUIT ${l.cuit ? esc(cuitLindo(l.cuit)) : PENDIENTE('el CUIT')}, con domicilio en ${dato(l.domicilio, 'el domicilio legal')}, es responsable de los datos que dejás en esta página y en el WhatsApp de ${esc(c.marca.nombre)}. Para cualquier consulta sobre tus datos, escribinos ${contacto}.</p>
<h2>Qué datos usamos y para qué</h2>
<p><b>Esta página no guarda datos tuyos en ningún servidor propio.</b> Los botones arman un mensaje y te abren WhatsApp para que lo mandes vos. Recién cuando lo mandás nos llega, como cualquier otro mensaje.</p>
<p><b>Charlas por WhatsApp, teléfono o mail.</b> Guardamos tu número o tu casilla, tu nombre y lo que nos escribas, para contestarte, pasarte un presupuesto${c.molde === 'turnos' ? ', darte un turno' : ''} y hacer el seguimiento de esa consulta.${c.legal?.atiendeBot ? ' Fuera de horario puede contestarte un asistente automático; una persona del equipo puede leer y seguir la charla en cualquier momento.' : ''}</p>
<p><b>Trámites de arrepentimiento y de baja.</b> Los datos de esos formularios se usan sólo para registrar y contestar el trámite.</p>
<p><b>Navegación.</b> ${hayMedicion
    ? `Si aceptás el aviso de cookies, usamos ${[m.ga4 && 'Google Analytics', m.metaPixel && 'el píxel de Meta'].filter(Boolean).join(' y ')} para saber cuánta gente entra y qué botones se usan. Si lo rechazás, no se cargan. Podés cambiar tu elección borrando los datos del sitio en tu navegador.`
    : 'No usamos cookies de publicidad ni herramientas de seguimiento.'} El servidor que aloja la página registra datos técnicos de la visita (como la dirección IP y el navegador) por seguridad. Las letras se cargan desde Google Fonts${c.zona?.mapa ? ' y el mapa desde Google Maps' : ''}: esos servicios reciben tu dirección IP, como cualquier sitio que visitás.</p>
<p>No vendemos ni alquilamos tus datos, y no te mandamos publicidad si no nos la pediste.</p>
<h2>Con quién se comparten</h2>
<p>Sólo con los proveedores que hacen falta para funcionar: Meta (WhatsApp), el proveedor donde está alojada la página${hayMedicion ? ', y los servicios de medición nombrados arriba' : ''}. Algunos tienen servidores fuera de la Argentina; al escribirnos prestás tu consentimiento para que tus datos se procesen ahí con estos fines (art. 12 de la Ley 25.326).</p>
<h2>Cuánto tiempo los guardamos</h2>
<p>Mientras hagan falta para atender tu consulta o el servicio que contrataste, y lo que exijan las normas contables, impositivas o legales.</p>
<h2>Tus derechos</h2>
<p>Podés pedirnos ver qué datos tenemos tuyos, corregirlos, actualizarlos o borrarlos, y retirar tu consentimiento. Te respondemos dentro de los plazos de la ley: 10 días corridos para darte acceso y 5 días hábiles para corregir o borrar (arts. 14 y 16 de la Ley 25.326).</p>
<p class="texto-legal-leyenda">El titular de los datos personales tiene la facultad de ejercer el derecho de acceso a los mismos en forma gratuita a intervalos no inferiores a seis meses, salvo que se acredite un interés legítimo al efecto conforme lo establecido en el artículo 14, inciso 3 de la Ley Nº 25.326. La AGENCIA DE ACCESO A LA INFORMACIÓN PÚBLICA, en su carácter de Órgano de Control de la Ley Nº 25.326, tiene la atribución de atender las denuncias y reclamos que interpongan quienes resulten afectados en sus derechos por incumplimiento de las normas vigentes en materia de protección de datos personales.</p>
</main>
${pie(c, '../')}`;
  return documento({ c, p, molde, cuerpo, ruta: '../', tramite: 'privacidad', version, indexar: false, titulo: `Política de privacidad · ${c.marca.nombre}`, descripcion: `Qué datos usa ${c.marca.nombre}, para qué y cómo pedir que se corrijan o se borren.` });
}

// ---------- Ayudas para los moldes ----------
// Foto o video corto. Los videos no se bajan hasta que entran en pantalla y no arrancan si la persona pidió
// menos movimiento o está ahorrando datos (lo resuelve sitio.js).
export function medio(m, { alt = '', primera = false, clase = '' } = {}) {
  if (!m) return '';
  if (m.video) return `<video class="${clase}" data-video src="${esc(m.video)}" poster="${esc(m.foto || '')}" muted loop playsinline preload="none"${alt ? ` aria-label="${esc(alt)}"` : ''}></video>`;
  return `<img class="${clase}" src="${esc(m.foto)}" alt="${esc(alt)}"${primera ? ' fetchpriority="high"' : ' loading="lazy" decoding="async"'}${m.posicion ? ` style="object-position:${esc(m.posicion)}"` : ''}>`;
}

export function listaHorarios(horarios = []) {
  return `<ul class="horarios-lista">${horarios.map((h) => `<li><span>${esc(h.dias)}</span><b>${esc(rangoLindo(h))}</b></li>`).join('')}</ul>`;
}
export const abiertoAhora = (horarios) => `<span class="abierto" data-abierto='${JSON.stringify(tablaHorarios(horarios))}'></span>`;

export function preguntas(lista = []) {
  return lista.map((q) => `<details class="pregunta"><summary>${esc(q.pregunta)}</summary><p>${esc(q.respuesta)}</p></details>`).join('\n');
}
