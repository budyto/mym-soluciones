// Utilidades comunes de los moldes: texto seguro, links de WhatsApp, colores y controles de la ficha.
// Nada de esto depende del molde: se arregla acá una vez y vale para todas las landings.

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Permite marcar el quiebre de un titular con "|" en la ficha (se vuelve un salto de línea).
export const titular = (s) => esc(s).replace(/\s*\|\s*/g, ' <br>');

export const soloNumeros = (s) => String(s ?? '').replace(/\D/g, '');

export function linkWa(numero, texto) {
  const n = soloNumeros(numero);
  if (!n) return '#';
  return `https://wa.me/${n}${texto ? `?text=${encodeURIComponent(texto)}` : ''}`;
}

export const linkTel = (t) => `tel:+${soloNumeros(t).replace(/^0/, '54')}`;

export const linkMapa = (consulta) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(consulta)}`;
export const mapaInsertado = (consulta) => `https://www.google.com/maps?q=${encodeURIComponent(consulta)}&output=embed`;

// ---------- Colores ----------
function aRgb(hex) {
  let h = String(hex || '').trim().replace('#', '');
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  if (!/^[0-9a-f]{6}$/i.test(h)) return null;
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}
const aHex = (rgb) => '#' + rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
function luminancia(hex) {
  const [r, g, b] = aRgb(hex).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contraste(a, b) {
  const [x, y] = [luminancia(a), luminancia(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}
export function mezclar(a, b, t) {
  const [x, y] = [aRgb(a), aRgb(b)];
  return aHex(x.map((v, i) => v + (y[i] - v) * t));
}
// Oscurece (o aclara) un color hasta que se pueda leer sobre el fondo dado.
export function legibleSobre(color, fondo, minimo = 4.5) {
  const hacia = luminancia(fondo) > 0.4 ? '#000000' : '#ffffff';
  let c = color;
  for (let t = 0; t <= 1 && contraste(c, fondo) < minimo; t += 0.04) c = mezclar(color, hacia, t);
  return c;
}
const TINTA = '#14171c';
export const textoSobre = (fondo) => (contraste('#ffffff', fondo) >= contraste(TINTA, fondo) ? '#ffffff' : TINTA);

// De los dos colores de la marca salen todos los tonos de la página. Así el cliente pasa dos colores
// y el molde garantiza que todo se lea (WCAG AA) sin que nadie tenga que calcular nada.
export function paleta(tema = {}) {
  const c1 = aRgb(tema.primario) ? tema.primario : '#1d4a8f';
  const c2 = aRgb(tema.acento) ? tema.acento : '#f26a1b';
  const papel = aRgb(tema.fondo) ? tema.fondo : '#ffffff';
  const oscuro = legibleSobre(mezclar(c1, '#000000', 0.35), '#ffffff', 12); // tono profundo de la marca
  return {
    c1, c2, papel,
    'sobre-c1': textoSobre(c1),
    'sobre-c2': textoSobre(c2),
    'c1-texto': legibleSobre(c1, papel, 4.5),   // el primario usado como texto sobre el fondo claro
    'c2-texto': legibleSobre(c2, papel, 4.5),
    'c2-en-oscuro': legibleSobre(c2, oscuro, 4.5),
    'c1-suave': mezclar(c1, papel, 0.92),
    'c2-suave': mezclar(c2, papel, 0.88),
    oscuro,
    'oscuro-2': mezclar(oscuro, '#ffffff', 0.08),
    tinta: mezclar(oscuro, '#101216', 0.55),
    gris: legibleSobre(mezclar(c1, '#6b7280', 0.8), papel, 4.6),
    borde: mezclar(c1, papel, 0.86),
    fondo: mezclar(c1, papel, 0.955),
  };
}
export const variablesCss = (p) => ':root{' + Object.entries(p).map(([k, v]) => `--${k}:${v}`).join(';') + '}';

// ---------- CUIT ----------
export function cuitValido(cuit) {
  const d = soloNumeros(cuit);
  if (d.length !== 11) return false;
  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const suma = pesos.reduce((a, p, i) => a + p * Number(d[i]), 0);
  let ver = 11 - (suma % 11);
  if (ver === 11) ver = 0;
  if (ver === 10) return false;
  return ver === Number(d[10]);
}
export const cuitLindo = (c) => { const d = soloNumeros(c); return d.length === 11 ? `${d.slice(0, 2)}-${d.slice(2, 10)}-${d[10]}` : String(c || ''); };

// ---------- Horarios ----------
// horarios: [{ dias: 'Lunes a viernes', d: [1,2,3,4,5], de: '8:00', a: '17:00' }]  (d: 0 domingo … 6 sábado)
const aHoras = (s) => { const [h, m = 0] = String(s).split(':').map(Number); return h + m / 60; };
export function tablaHorarios(horarios = []) {
  const t = {};
  for (const h of horarios) for (const dia of h.d || []) (t[dia] ||= []).push([aHoras(h.de), aHoras(h.a)]);
  return t;
}
export const horaLinda = (s) => { const [h, m = '00'] = String(s).split(':'); return m === '00' || m === '0' ? `${Number(h)}` : `${Number(h)}:${m}`; };
export const rangoLindo = (h) => (h.cerrado ? 'Cerrado' : `${horaLinda(h.de)} a ${horaLinda(h.a)} h`);
const DIAS_SCHEMA = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export function horariosSchema(horarios = []) {
  return horarios.filter((h) => !h.cerrado && h.d?.length).map((h) => ({
    '@type': 'OpeningHoursSpecification', dayOfWeek: h.d.map((d) => DIAS_SCHEMA[d]),
    opens: String(h.de).padStart(5, '0'), closes: String(h.a).padStart(5, '0'),
  }));
}

// ---------- Control de la ficha ----------
// Frases que no pueden salir publicadas (Ley 24.240, DNU 274/2019 y la voz de las marcas del grupo).
const PROHIBIDAS = [
  [/garantizad[oa]s?/i, 'promete un resultado («garantizado»)'],
  [/100\s?%/i, 'promete un resultado («100 %»)'],
  [/sin riesgos?/i, 'promete un resultado («sin riesgo»)'],
  [/\b(el|la|los|las) mejor(es)?\b/i, 'dice «el mejor» sin respaldo'],
  [/\b(n[úu]mero uno|n[°º] ?1|l[ií]der(es)? (en|del))\b/i, 'dice «número uno» o «líder» sin respaldo'],
  [/[úu]ltimos? (lugares|cupos|turnos|d[ií]as)/i, 'usa una urgencia que hay que poder probar'],
  [/solo (por )?hoy/i, 'usa una urgencia que hay que poder probar'],
  [/\u{1F916}/u, 'usa el emoji de robot'],
  [/\b(cura|sana)(mos|n)?\b/i, 'promete un resultado de salud'],
];

function recorrer(obj, ruta, fn) {
  if (typeof obj === 'string') return fn(obj, ruta);
  if (Array.isArray(obj)) return obj.forEach((v, i) => recorrer(v, `${ruta}[${i}]`, fn));
  if (obj && typeof obj === 'object') for (const [k, v] of Object.entries(obj)) recorrer(v, ruta ? `${ruta}.${k}` : k, fn);
}

// Devuelve { errores, avisos, faltan }. Los errores frenan siempre. Lo que «falta» frena una landing final
// y en una demo sale marcado como pendiente (con la cinta de demo y sin indexar).
export function controlar(c, molde) {
  const errores = [], avisos = [], faltan = [];
  const pedir = (cond, que) => { if (!cond) faltan.push(que); };
  const error = (cond, que) => { if (!cond) errores.push(que); };

  error(c.slug && /^[a-z0-9-]+$/.test(c.slug), 'slug: va en minúsculas, con guiones y sin espacios (ej. «plomeria-mansilla»).');
  error(['demo', 'final'].includes(c.estado), 'estado: tiene que ser «demo» o «final».');
  error(c.marca?.nombre, 'marca.nombre: cómo se llama el negocio (pregunta C2).');
  error(c.marca?.queHace, 'marca.queHace: a qué se dedica, en una oración (pregunta C3).');
  error(aRgb(c.tema?.primario) && aRgb(c.tema?.acento), 'tema.primario y tema.acento: dos colores en código, como «#1d4a8f» (pregunta C9).');
  error(c.inicio?.titulo && c.inicio?.bajada, 'inicio.titulo e inicio.bajada: el titular dice qué problema resuelve (pregunta W3).');
  error(c.seo?.titulo && c.seo?.descripcion, 'seo.titulo y seo.descripcion: lo que muestra Google.');
  error(c.zona?.texto, 'zona.texto: en qué zona atiende (pregunta C4).');
  pedir(c.contacto?.horarios?.length, 'contacto.horarios: días y horario en que atienden personas (pregunta C7).');

  const wa = soloNumeros(c.contacto?.whatsapp);
  if (wa) error(/^549\d{10}$/.test(wa), 'contacto.whatsapp: va en formato internacional, sin + ni espacios (ej. «5491131638945»).');
  pedir(wa, 'contacto.whatsapp: el WhatsApp de atención (pregunta C6). Sin número, los botones muestran cómo llegaría el mensaje pero no mandan nada.');

  // Responsable del sitio: siempre el cliente, nunca MyM.
  const l = c.legal || {};
  pedir(l.razonSocial, 'legal.razonSocial: nombre y apellido o razón social del cliente (preguntas C5 y W9).');
  pedir(l.cuit, 'legal.cuit: CUIT del cliente (pregunta C5).');
  pedir(l.domicilio, 'legal.domicilio: domicilio legal del cliente (pregunta W9).');
  if (l.cuit) error(cuitValido(l.cuit), 'legal.cuit: el dígito verificador no cierra; revisá el número.');
  if (/mym|gargiolo/i.test(`${l.razonSocial} ${l.domicilio}`) || soloNumeros(l.cuit) === '20346194236') {
    errores.push('legal: el responsable del sitio es el cliente, no MyM. Cargá los datos del cliente.');
  }
  pedir(c.contacto?.mail || l.mail, 'contacto.mail: una casilla para los trámites de arrepentimiento, baja y datos personales (pregunta C8).');
  pedir(c.seo?.dominio, 'seo.dominio: la dirección de la página, registrada a nombre del cliente (pregunta W7).');
  pedir(c.permisos?.fotosYLogo === true, 'permisos.fotosYLogo: el cliente tiene que confirmar que el logo, las fotos y los textos son suyos (cierre del cuestionario).');

  const b = l.botones || {};
  if (b.arrepentimiento === false) error(b.motivoSinArrepentimiento, 'legal.botones: si se saca el botón de arrepentimiento hay que escribir el motivo en «motivoSinArrepentimiento».');
  if (b.baja === false) error(b.motivoSinBaja, 'legal.botones: si se saca el botón de baja hay que escribir el motivo en «motivoSinBaja».');

  // Opiniones: sólo reales, con fuente, fecha y permiso.
  const op = c.opiniones;
  if (op?.items?.length) {
    error(op.fuente && op.fecha, 'opiniones: hay que decir de dónde salen y en qué fecha se copiaron (ej. «Google», «18/11/2026»).');
    error(op.reales === true, 'opiniones.reales: confirmá que son opiniones reales y copiadas tal cual. No se inventan testimonios.');
    pedir(op.permiso === true, 'opiniones.permiso: para publicar hace falta el permiso guardado de cada persona (pregunta W5).');
  }
  // Precios: lo publicado obliga, así que llevan fecha.
  let hayPrecio = false;
  recorrer(c, '', (v, ruta) => { if (/\.precio$/.test(ruta) && v) hayPrecio = true; });
  if (hayPrecio) error(c.precios?.vigentesAl, 'precios.vigentesAl: si se publican precios hay que decir a qué fecha valen (pregunta L3).');
  if (c.promo) error(c.promo.desde && c.promo.hasta && c.promo.condiciones, 'promo: toda promoción lleva fecha de inicio, de fin y condiciones.');

  recorrer(c, '', (v, ruta) => {
    if (/^(legal|permisos|creditosFotos)/.test(ruta) || /mensaje|motivo/i.test(ruta)) return;
    if (op?.items && /^opiniones\.items/.test(ruta)) return; // las opiniones van tal cual las escribió la persona
    for (const [re, que] of PROHIBIDAS) if (re.test(v)) errores.push(`${ruta}: «${v.slice(0, 60)}» ${que}. Cambiá el texto.`);
    if (/\[FALTA/i.test(v)) faltan.push(`${ruta}: todavía dice [FALTA].`);
  });

  const p = paleta(c.tema);
  if (contraste(p.c1, p.c2) < 1.6) avisos.push('tema: el primario y el acento se parecen mucho; el botón principal no va a resaltar.');

  for (const f of molde.controlar?.(c) || []) (f.falta ? faltan : errores).push(f.falta || f);
  return { errores, avisos, faltan };
}
