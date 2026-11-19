// MOLDE 3 · Profesional con turnos (peluquería, barbería, estética, consultorio, kinesiología, estudio).
// Quien entra quiere saber qué hacen, cuánto dura, cuánto sale y cuándo hay lugar. Por eso el centro de la
// página es la carta de servicios: marca lo que quiere, elige día y momento, y el pedido de turno sale armado.
import { esc, titular, linkTel, linkMapa, mapaInsertado } from '../nucleo/util.mjs';
import { documento, franjaLegal, pie, extras, botonWa, medio, preguntas, abiertoAhora, listaHorarios, ICONOS, mensajeBase } from '../nucleo/partes.mjs';

export const fuentes = 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,400&family=Nunito+Sans:opsz,wght@6..12,400;6..12,600;6..12,700&display=swap';
export const colorNavegador = 'c1-suave';

export function controlar(c) {
  const e = [];
  if (!c.servicios?.grupos?.length) e.push('servicios.grupos: la carta de servicios, agrupada (pregunta C10).');
  if (!c.inicio?.foto) e.push('inicio.foto: la foto principal (pregunta W6).');
  for (const p of c.equipo?.items || []) if (c.equipo.pideMatricula && !p.matricula) e.push({ falta: `equipo: falta la matrícula de ${p.nombre}. En salud, cada profesional va con su matrícula.` });
  return e;
}

export function pagina(c, p, version) {
  const i = c.inicio, t = c.turnos || {}, tel = c.contacto?.telefono, z = c.zona;
  const boton = t.boton || 'Pedir turno por WhatsApp';
  const nav = [['#servicios', 'Servicios'], c.equipo?.items?.length && ['#equipo', c.equipo.titulo ? 'Equipo' : 'Equipo'], c.galeria?.items?.length && ['#galeria', 'El lugar'], ['#donde', 'Dónde estamos']].filter(Boolean);
  const dias = t.dias || ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const momentos = t.momentos || ['A la mañana', 'A la tarde'];

  const cuerpo = `${franjaLegal(c)}
<header class="cab">
  <div class="ancho cab-fila">
    <a class="cab-marca" href="#contenido" aria-label="${esc(c.marca.nombre)}, inicio">${c.marca.logo ? `<img src="${esc(c.marca.logo)}" alt="${esc(c.marca.nombre)}" height="44">` : esc(c.marca.nombre)}</a>
    <nav class="cab-nav" aria-label="Secciones">${nav.map(([h, x]) => `<a href="${h}">${x}</a>`).join('')}</nav>
    <a class="btn btn-principal btn-chico" href="#turno">Pedir turno</a>
  </div>
</header>

<main id="contenido">
<section class="inicio">
  <div class="ancho">
    <p class="inicio-donde">${esc(z.texto)}</p>
    <h1>${titular(i.titulo)}</h1>
    <p class="inicio-bajada">${esc(i.bajada)}</p>
    <div class="inicio-acciones">
      <a class="btn btn-principal" href="#turno">${esc(i.boton || 'Elegir servicio y pedir turno')}</a>
      ${t.url ? `<a class="btn btn-linea" href="${esc(t.url)}" target="_blank" rel="noopener">Reservar en la agenda</a>` : botonWa(c, { texto: 'Hacer una consulta', lugar: 'inicio', clase: 'btn btn-linea', icono: false })}
    </div>
  </div>
  <div class="ancho inicio-fotos">
    ${i.fotoIzquierda ? `<figure class="inicio-lado">${medio({ foto: i.fotoIzquierda }, { alt: i.altIzquierda || '' })}</figure>` : ''}
    <figure class="inicio-arco">${medio(i, { alt: i.alt || c.marca.queHace, primera: true })}</figure>
    ${i.fotoDerecha ? `<figure class="inicio-lado inicio-lado-b">${medio({ foto: i.fotoDerecha }, { alt: i.altDerecha || '' })}</figure>` : ''}
  </div>
  ${c.datos?.length ? `<ul class="ancho hechos">${c.datos.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>` : ''}
</section>

<section class="bloque" id="servicios">
  <div class="ancho carta-grilla">
    <div class="carta">
      <h2>${titular(c.servicios.titulo || 'Servicios')}</h2>
      ${c.servicios.bajada ? `<p class="bloque-bajada">${esc(c.servicios.bajada)}</p>` : ''}
      ${c.servicios.grupos.map((g) => `<h3>${esc(g.nombre)}</h3>
      <ul class="carta-lista">
      ${g.items.map((s) => `<li><label>
        <input type="checkbox" name="servicio" value="${esc(s.nombre)}">
        <span class="carta-nombre">${esc(s.nombre)}${s.detalle ? `<small>${esc(s.detalle)}</small>` : ''}</span>
        <span class="carta-puntos" aria-hidden="true"></span>
        <span class="carta-dato">${s.duracion ? `<span>${esc(s.duracion)}</span>` : ''}${s.precio ? `<b>${esc(s.precio)}</b>` : ''}</span>
      </label></li>`).join('\n      ')}
      </ul>`).join('\n      ')}
      ${c.precios?.vigentesAl ? `<p class="carta-nota">Precios vigentes al ${esc(c.precios.vigentesAl)}. ${esc(c.precios.aclaracion || '')}</p>` : ''}
    </div>

    <form class="turno" id="turno" data-saludo="${esc(t.saludo || 'Hola, quiero pedir un turno.')}" data-base="${esc(mensajeBase(c))}">
      <h2>Tu turno</h2>
      <p class="turno-elegido" id="turnoElegido" data-vacio="Marcá en la carta lo que querés hacerte.">Marcá en la carta lo que querés hacerte.</p>
      <fieldset><legend>¿Qué día te queda mejor?</legend><div class="turno-opciones">
        ${dias.map((d) => `<label><input type="checkbox" name="dia" value="${esc(d)}"><span>${esc(d)}</span></label>`).join('')}
      </div></fieldset>
      <fieldset><legend>¿En qué momento?</legend><div class="turno-opciones">
        ${momentos.map((m) => `<label><input type="radio" name="momento" value="${esc(m.toLowerCase())}"><span>${esc(m)}</span></label>`).join('')}
      </div></fieldset>
      ${c.equipo?.items?.length > 1 && t.elegirProfesional !== false ? `<label class="turno-con">¿Con quién?<select name="con"><option value="">Me da igual</option>${c.equipo.items.map((x) => `<option>${esc(x.nombre)}</option>`).join('')}</select></label>` : ''}
      ${botonWa(c, { texto: boton, mensaje: t.saludo || 'Hola, quiero pedir un turno.', lugar: 'turno', attrs: 'data-armado="1" id="turnoEnviar"' })}
      <p class="turno-nota">${esc(t.nota || 'Te confirmamos el día y la hora por WhatsApp. El turno queda tomado recién cuando te lo confirmamos.')}</p>
      ${t.url ? `<p class="turno-nota">¿Preferís elegir la hora vos? <a href="${esc(t.url)}" target="_blank" rel="noopener">Reservá en la agenda</a>.</p>` : ''}
    </form>
  </div>
</section>

${c.equipo?.items?.length ? `<section class="bloque bloque-tinte" id="equipo">
  <div class="ancho">
    <h2>${titular(c.equipo.titulo || 'Quiénes te atienden')}</h2>
    ${c.equipo.bajada ? `<p class="bloque-bajada">${esc(c.equipo.bajada)}</p>` : ''}
    <ul class="equipo">
    ${c.equipo.items.map((x) => `<li>${x.foto ? `<figure>${medio(x, { alt: `Retrato de ${x.nombre}` })}</figure>` : `<figure class="equipo-sin" aria-hidden="true">${esc(x.nombre[0])}</figure>`}
      <h3>${esc(x.nombre)}</h3><p>${esc(x.rol || '')}</p>${x.matricula ? `<p class="equipo-mat">${esc(x.matricula)}</p>` : ''}</li>`).join('\n    ')}
    </ul>
  </div>
</section>` : ''}

${c.galeria?.items?.length ? `<section class="bloque" id="galeria">
  <div class="ancho">
    <h2>${titular(c.galeria.titulo || 'El lugar')}</h2>
    ${c.galeria.bajada ? `<p class="bloque-bajada">${esc(c.galeria.bajada)}</p>` : ''}
    <ul class="galeria">
    ${c.galeria.items.map((g) => `<li><figure>${medio(g, { alt: g.alt || g.pie || '' })}${g.pie ? `<figcaption>${esc(g.pie)}</figcaption>` : ''}</figure></li>`).join('\n    ')}
    </ul>
  </div>
</section>` : ''}

${c.antes?.items?.length ? `<section class="bloque bloque-tinte" id="antes">
  <div class="ancho ancho-corto">
    <h2>${titular(c.antes.titulo || 'Antes de venir')}</h2>
    <ul class="antes">${c.antes.items.map((a) => `<li><h3>${esc(a.titulo)}</h3><p>${esc(a.detalle)}</p></li>`).join('')}</ul>
  </div>
</section>` : ''}

<section class="bloque" id="donde">
  <div class="ancho donde">
    <div>
      <h2>${titular(c.donde?.titulo || 'Dónde estamos')}</h2>
      <p class="donde-dir">${ICONOS.pin}<span><b>${esc(z.direccion || '')}</b>${z.localidad ? `<br>${esc(z.localidad)}` : ''}${z.referencia ? `<br>${esc(z.referencia)}` : ''}</span></p>
      ${c.contacto.horarios?.length ? `<h3>Horarios ${abiertoAhora(c.contacto.horarios)}</h3>${listaHorarios(c.contacto.horarios)}` : ''}
      ${tel ? `<p class="donde-tel">Teléfono: <a href="${linkTel(tel)}">${esc(tel)}</a></p>` : ''}
    </div>
    ${z.mapa ? `<div class="donde-mapa"><iframe title="Mapa: ${esc(z.mapa)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="${esc(mapaInsertado(z.mapa))}"></iframe><a href="${esc(linkMapa(z.mapa))}" target="_blank" rel="noopener">Cómo llegar</a></div>` : ''}
  </div>
</section>

${c.preguntas?.items?.length ? `<section class="bloque bloque-tinte" id="preguntas">
  <div class="ancho ancho-corto">
    <h2>${titular(c.preguntas.titulo || 'Preguntas frecuentes')}</h2>
    ${preguntas(c.preguntas.items)}
  </div>
</section>` : ''}

<section class="cierre">
  <div class="ancho">
    <h2>${titular(c.cierre?.titulo || '¿Te guardamos un lugar?')}</h2>
    <p>${esc(c.cierre?.bajada || '')}</p>
    <a class="btn btn-principal" href="#turno">${esc(c.cierre?.boton || 'Pedir turno')}</a>
  </div>
</section>
</main>

${pie(c)}
${extras(c, { mensajeFlotante: t.saludo })}`;

  return documento({ c, p, molde: { fuentes, colorNavegador }, cuerpo, titulo: c.seo.titulo, descripcion: c.seo.descripcion, version });
}
