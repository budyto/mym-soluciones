// MOLDE 1 · Servicio a domicilio (plomero, electricista, gasista, técnico, cerrajero, fletes).
// Quien entra tiene un problema en su casa y el celular en la mano. Por eso la página abre con una pregunta
// («¿Qué te está pasando?»): toca su problema y el botón de WhatsApp ya sale con el mensaje escrito.
import { esc, titular, linkTel, linkMapa, mapaInsertado } from '../nucleo/util.mjs';
import { documento, franjaLegal, pie, extras, botonWa, medio, preguntas, abiertoAhora, listaHorarios, ICONOS, waMostrar, mensajeBase } from '../nucleo/partes.mjs';

// Las letras están en letras/ (se bajan con nucleo/bajar-letras.mjs). Se precargan las que se ven arriba de todo.
export const precargar = ['letras/bricolage-grotesque-600-800.woff2', 'letras/public-sans-400-700.woff2'];
export const colorNavegador = 'papel';

export function controlar(c) {
  const e = [];
  if (!c.servicios?.items?.length) e.push('servicios.items: la lista de servicios que ofrece (pregunta C10).');
  if (!c.problemas?.items?.length) e.push('problemas.items: entre 3 y 6 problemas dichos con las palabras del cliente (pregunta W3). Son los botones del inicio.');
  if ((c.problemas?.items?.length || 0) > 6) e.push('problemas.items: como máximo 6; con más, nadie elige.');
  if (!c.inicio?.foto) e.push('inicio.foto: la foto principal (pregunta W6).');
  return e;
}

export function pagina(c, p, version) {
  const i = c.inicio, z = c.zona || {}, tel = c.contacto?.telefono;
  const boton = i.boton || 'Pedir presupuesto por WhatsApp';
  const nav = [c.servicios && ['#servicios', 'Servicios'], c.trabajos?.items?.length && ['#trabajos', 'Trabajos'], c.pasos?.items?.length && ['#como', 'Cómo trabajamos'], ['#zona', 'Zona']].filter(Boolean);

  const cuerpo = `${franjaLegal(c)}
<header class="cab">
  <div class="ancho cab-fila">
    <a class="cab-marca" href="#contenido" aria-label="${esc(c.marca.nombre)}, inicio">${c.marca.logo ? `<img src="${esc(c.marca.logo)}" alt="${esc(c.marca.nombre)}" height="44">` : `<span>${esc(c.marca.nombre)}</span>${c.marca.lema ? `<small>${esc(c.marca.lema)}</small>` : ''}`}</a>
    <nav class="cab-nav" aria-label="Secciones">${nav.map(([h, t]) => `<a href="${h}">${t}</a>`).join('')}</nav>
    ${botonWa(c, { texto: 'Presupuesto', lugar: 'encabezado', clase: 'btn btn-wa btn-chico' })}
  </div>
</header>

<main id="contenido">
<section class="inicio">
  <div class="ancho inicio-grilla">
    <div class="inicio-texto">
      <p class="inicio-donde">${ICONOS.pin}${esc(z.texto)} ${c.contacto.horarios?.length ? abiertoAhora(c.contacto.horarios) : ''}</p>
      <h1>${titular(i.titulo)}</h1>
      <p class="inicio-bajada">${esc(i.bajada)}</p>
      <form class="problema" id="problema" data-base="${esc(mensajeBase(c))}">
        <fieldset>
          <legend>${esc(c.problemas.pregunta || '¿Qué te está pasando?')}</legend>
          <div class="problema-opciones">
          ${c.problemas.items.map((x, k) => `<label><input type="radio" name="problema" value="${esc(x.mensaje || `Hola, ${x.texto.toLowerCase()}. ¿Me pasan un presupuesto?`)}"${k === 0 ? '' : ''}><span>${esc(x.texto)}</span></label>`).join('\n          ')}
          </div>
        </fieldset>
        <div class="inicio-acciones">
          ${botonWa(c, { texto: boton, lugar: 'inicio', attrs: 'id="botonProblema"' })}
          ${tel ? `<a class="btn btn-linea" href="${linkTel(tel)}">${ICONOS.tel}<span>Llamar al ${esc(tel)}</span></a>` : ''}
        </div>
      </form>
    </div>
    <figure class="inicio-foto">${medio(i, { alt: i.alt || c.marca.queHace, primera: true })}</figure>
  </div>
  ${c.datos?.length ? `<ul class="ancho hechos">${c.datos.map((d) => `<li>${ICONOS.tilde}<span>${esc(d)}</span></li>`).join('')}</ul>` : ''}
</section>

<section class="bloque" id="servicios">
  <div class="ancho">
    <h2>${titular(c.servicios.titulo || 'Qué hacemos')}</h2>
    ${c.servicios.bajada ? `<p class="bloque-bajada">${esc(c.servicios.bajada)}</p>` : ''}
    <ul class="servicios">
    ${c.servicios.items.map((s) => `<li class="servicio">
      ${s.foto || s.video ? `<figure>${medio(s, { alt: s.alt || s.nombre })}</figure>` : ''}
      <div><h3>${esc(s.nombre)}</h3><p>${esc(s.detalle || '')}</p>
      ${botonWa(c, { texto: 'Consultar por esto', mensaje: s.mensaje || `Hola, quiero consultar por ${s.nombre.toLowerCase()}.`, lugar: 'servicio', clase: 'enlace-wa', icono: false })}</div>
    </li>`).join('\n    ')}
    </ul>
  </div>
</section>

${c.trabajos?.items?.length ? `<section class="bloque bloque-tinte" id="trabajos">
  <div class="ancho">
    <h2>${titular(c.trabajos.titulo || 'Trabajos hechos')}</h2>
    ${c.trabajos.bajada ? `<p class="bloque-bajada">${esc(c.trabajos.bajada)}</p>` : ''}
  </div>
  <ul class="tira" tabindex="0" aria-label="Fotos de trabajos">
    ${c.trabajos.items.map((t) => `<li><figure>${medio(t, { alt: t.alt || t.pie || 'Trabajo terminado' })}${t.pie ? `<figcaption>${esc(t.pie)}</figcaption>` : ''}</figure></li>`).join('\n    ')}
  </ul>
</section>` : ''}

${c.pasos?.items?.length ? `<section class="bloque" id="como">
  <div class="ancho">
    <h2>${titular(c.pasos.titulo || 'Cómo trabajamos')}</h2>
    ${c.pasos.bajada ? `<p class="bloque-bajada">${esc(c.pasos.bajada)}</p>` : ''}
    <ol class="pasos">
    ${c.pasos.items.map((s) => `<li><h3>${esc(s.titulo)}</h3><p>${esc(s.detalle)}</p></li>`).join('\n    ')}
    </ol>
  </div>
</section>` : ''}

<section class="bloque bloque-tinte" id="zona">
  <div class="ancho zona">
    <div>
      <h2>${titular(z.titulo || `Trabajamos en ${z.texto}`)}</h2>
      ${z.puntos?.length ? `<ul class="zona-puntos">${z.puntos.map((x) => `<li>${ICONOS.tilde}<span>${esc(x)}</span></li>`).join('')}</ul>` : ''}
      ${c.contacto.horarios?.length ? `<h3 class="zona-sub">Horarios de atención</h3>
      ${listaHorarios(c.contacto.horarios)}` : ''}
      <div class="zona-accion">${botonWa(c, { texto: z.boton || '¿Trabajan en mi barrio?', mensaje: z.mensaje || 'Hola, ¿trabajan en mi barrio? Estoy en ', lugar: 'zona', clase: 'btn btn-principal', icono: false })}</div>
    </div>
    ${z.mapa ? `<div class="zona-mapa"><iframe title="Mapa: ${esc(z.mapa)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="${esc(mapaInsertado(z.mapa))}"></iframe>
      <a href="${esc(linkMapa(z.mapa))}" target="_blank" rel="noopener"><span><b>${esc(z.direccion || z.mapa)}</b>${z.localidad ? `, ${esc(z.localidad)}` : ''}</span><span>Cómo llegar</span></a></div>` : ''}
  </div>
</section>

${c.preguntas?.items?.length ? `<section class="bloque" id="preguntas">
  <div class="ancho ancho-corto">
    <h2>${titular(c.preguntas.titulo || 'Preguntas frecuentes')}</h2>
    ${preguntas(c.preguntas.items)}
  </div>
</section>` : ''}

<section class="cierre">
  <div class="ancho">
    <h2>${titular(c.cierre?.titulo || i.titulo)}</h2>
    <p>${esc(c.cierre?.bajada || i.bajada)}</p>
    ${botonWa(c, { texto: c.cierre?.boton || boton, lugar: 'cierre' })}
    ${waMostrar(c) ? `<p class="cierre-numero">WhatsApp ${esc(waMostrar(c))}</p>` : ''}
  </div>
</section>
</main>

${pie(c)}
<div class="barra-fija">${tel ? `<a class="btn btn-linea" href="${linkTel(tel)}">${ICONOS.tel}<span>Llamar</span></a>` : ''}${botonWa(c, { texto: 'WhatsApp', lugar: 'barra fija' })}</div>
${extras(c)}`;

  return documento({ c, p, molde: { precargar, colorNavegador }, cuerpo, titulo: c.seo.titulo, descripcion: c.seo.descripcion, version });
}
