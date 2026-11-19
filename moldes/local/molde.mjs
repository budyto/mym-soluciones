// MOLDE 2 · Local con productos (ferretería, corralón, bazar, pinturería, comercio de barrio).
// Quien entra quiere saber si tienen lo que busca, cuánto sale y si está abierto. Por eso el centro de la
// página es el catálogo: marca cantidades y manda la lista por WhatsApp, como si la dictara en el mostrador.
import { esc, titular, linkTel, linkMapa, mapaInsertado, rangoLindo } from '../nucleo/util.mjs';
import { documento, franjaLegal, pie, extras, botonWa, medio, preguntas, abiertoAhora, ICONOS } from '../nucleo/partes.mjs';

// Las letras están en letras/ (se bajan con nucleo/bajar-letras.mjs). Se precargan las que se ven arriba de todo.
export const precargar = ['letras/barlow-condensed-800.woff2', 'letras/barlow-400.woff2'];
export const colorNavegador = 'oscuro';

export function controlar(c) {
  const e = [];
  if (!c.catalogo?.productos?.length) e.push('catalogo.productos: la lista de productos o rubros (pregunta C10).');
  if (!c.catalogo?.categorias?.length) e.push('catalogo.categorias: al menos una categoría para agrupar los productos.');
  const cats = new Set((c.catalogo?.categorias || []).map((x) => x.id));
  for (const p of c.catalogo?.productos || []) if (!cats.has(p.cat)) e.push(`catalogo.productos: «${p.nombre}» tiene una categoría («${p.cat}») que no está en catalogo.categorias.`);
  if (!c.sucursales?.items?.length) e.push('sucursales.items: al menos un local con su dirección y sus horarios.');
  if (!c.inicio?.fotos?.length) e.push('inicio.fotos: entre 1 y 3 fotos del local (pregunta W6).');
  return e;
}

const estrellas = (n) => { const k = Math.round(Number(String(n).replace(',', '.'))); return '★'.repeat(k) + '☆'.repeat(5 - k); };

export function pagina(c, p, version) {
  const i = c.inicio, cat = c.catalogo, suc = c.sucursales.items, op = c.opiniones, tel = c.contacto?.telefono;
  const cats = Object.fromEntries(cat.categorias.map((x) => [x.id, x]));
  const principal = suc[0];
  const nav = [suc.length > 1 && ['#locales', 'Nuestros locales'], ['#pedido', 'Productos'], c.pasos?.items?.length && ['#como', 'Cómo comprar'], op?.items?.length && ['#opiniones', 'Opiniones'], ['#donde', 'Horarios y ubicación']].filter(Boolean);
  const coloresCat = cat.categorias.map((x, k) => `[data-cat="${x.id}"]{--cat:${x.color || (k % 2 ? p['c1-texto'] : p['c2-texto'])}}`).join('');

  const cuerpo = `<style>${coloresCat}</style>
${franjaLegal(c)}
<header class="cab">
  <div class="ancho cab-fila">
    <a class="cab-marca" href="#contenido" aria-label="${esc(c.marca.nombre)}, inicio">${c.marca.logo ? `<img src="${esc(c.marca.logo)}" alt="${esc(c.marca.nombre)}" height="40">` : `<span class="cab-ico" aria-hidden="true"></span><span class="cab-txt">${esc(c.marca.nombreCorto || c.marca.nombre)}${c.marca.lema ? `<small>${esc(c.marca.lema)}</small>` : ''}</span>`}</a>
    <nav class="cab-nav" aria-label="Secciones">${nav.map(([h, t]) => `<a href="${h}">${t}</a>`).join('')}</nav>
    ${botonWa(c, { texto: 'Presupuesto', lugar: 'encabezado', clase: 'btn btn-wa btn-chico' })}
  </div>
</header>

<main id="contenido">
<section class="inicio">
  <div class="ancho inicio-grilla">
    <div>
      <p class="inicio-donde">${esc(c.zona.texto)}</p>
      <h1>${titular(i.titulo)}</h1>
      <p class="inicio-bajada">${esc(i.bajada)}</p>
      <div class="inicio-acciones">
        <a class="btn btn-principal" href="#pedido">${esc(i.botonPedido || 'Armar pedido')}</a>
        ${botonWa(c, { texto: i.boton || 'Consultar por WhatsApp', lugar: 'inicio' })}
      </div>
      <ul class="inicio-datos">
        ${op?.resumen ? `<li><span class="estrellas" aria-hidden="true">${estrellas(op.resumen.nota)}</span><b>${esc(op.resumen.nota)}</b> en ${esc(op.fuente)} · ${esc(op.resumen.cantidad)} opiniones</li>` : ''}
        ${(i.datos || []).map((d) => `<li>${ICONOS[d.icono] || ICONOS.tilde}<b>${esc(d.texto)}</b></li>`).join('')}
        ${tel ? `<li>${ICONOS.tel}<a href="${linkTel(tel)}"><b>${esc(tel)}</b></a></li>` : ''}
        ${principal.horarios?.length ? `<li>${abiertoAhora(principal.horarios)}</li>` : ''}
      </ul>
    </div>
    <div class="inicio-fotos inicio-fotos-${Math.min(i.fotos.length, 3)}">
      ${i.fotos.slice(0, 3).map((f, k) => `<figure>${medio(f, { alt: f.alt || f.pie || c.marca.nombre, primera: k === 0 })}${f.pie ? `<figcaption>${esc(f.pie)}</figcaption>` : ''}</figure>`).join('\n      ')}
    </div>
  </div>
</section>

${c.cinta?.length ? `<div class="cinta" aria-hidden="true"><div class="cinta-in">${[...c.cinta, ...c.cinta].map((x) => `<span>${esc(x)}</span>`).join('')}</div></div>` : ''}

${suc.length > 1 ? `<section class="bloque" id="locales">
  <div class="ancho">
    <h2>${titular(c.sucursales.titulo || 'Nuestros locales')}</h2>
    ${c.sucursales.bajada ? `<p class="bloque-bajada">${esc(c.sucursales.bajada)}</p>` : ''}
    <div class="locales">
    ${suc.map((s) => `<article class="local"${s.cat ? ` data-cat="${esc(s.cat)}"` : ''}>
      <div class="local-foto">${medio(s, { alt: s.alt || `Frente de ${s.nombre}` })}${s.etiqueta ? `<span>${esc(s.etiqueta)}</span>` : ''}</div>
      <div class="local-cuerpo">
        <h3>${esc(s.nombre)}</h3>
        <p>${esc(s.detalle || '')}</p>
        ${s.rubros?.length ? `<ul class="rubros">${s.rubros.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>` : ''}
        <p class="local-pie"><b>${esc(s.direccion)}</b><span>${(s.horarios || []).filter((h) => !h.cerrado).map((h) => `${esc(h.diasCorto || h.dias)} ${esc(rangoLindo(h))}`).join(' · ')}</span>${s.google ? `<span><b>${esc(s.google.nota)}</b> en Google (${esc(s.google.cantidad)} opiniones)</span>` : ''}</p>
      </div>
    </article>`).join('\n    ')}
    </div>
  </div>
</section>` : ''}

<section class="bloque bloque-papel" id="pedido">
  <div class="ancho">
    <h2>${titular(cat.titulo || 'Armá tu pedido')}</h2>
    <p class="bloque-bajada">${esc(cat.bajada || 'Marcá las cantidades y mandanos la lista por WhatsApp.')}</p>
    ${cat.categorias.length > 1 ? `<div class="filtros" role="group" aria-label="Filtrar productos">
      <button type="button" class="filtro" aria-pressed="true" data-f="todo">Todos</button>
      ${cat.categorias.map((x) => `<button type="button" class="filtro" aria-pressed="false" data-f="${esc(x.id)}">${esc(x.nombre)}</button>`).join('')}
    </div>` : ''}
    <ul class="productos" id="productos" data-saludo="${esc(cat.saludo || 'Hola, quiero un presupuesto de este pedido:')}" data-cierre="${esc(cat.cierrePedido || '')}">
    ${cat.productos.map((x, k) => `<li class="producto" data-cat="${esc(x.cat)}" data-grupo="${esc(cats[x.cat].rotulo || cats[x.cat].nombre)}" data-nombre="${esc(x.nombre)}" data-unidad="${esc(x.unidad || 'unidades')}">
      <div class="producto-foto">${x.foto ? medio(x, { alt: x.alt || x.nombre }) : ''}<span>${esc(cats[x.cat].rotulo || cats[x.cat].nombre)}</span></div>
      <div class="producto-texto"><h3>${esc(x.nombre)}</h3><p>${esc(x.detalle || '')}</p>${x.precio ? `<p class="producto-precio">${esc(x.precio)}</p>` : ''}</div>
      <div class="producto-cantidad"><span>Cantidad (${esc(x.unidad || 'unidades')})</span>
        <div class="contador"><button type="button" aria-label="Restar ${esc(x.nombre)}" data-d="-1">−</button><output aria-live="polite">0</output><button type="button" aria-label="Sumar ${esc(x.nombre)}" data-d="1">+</button></div></div>
    </li>`).join('\n    ')}
    </ul>
    ${c.precios?.vigentesAl ? `<p class="precios-nota">Precios vigentes al ${esc(c.precios.vigentesAl)}. ${esc(c.precios.aclaracion || '')}</p>` : `<p class="precios-nota">${esc(cat.notaSinPrecios || 'El precio, la disponibilidad y el costo de envío se informan en el presupuesto.')}</p>`}
  </div>
</section>

${c.pasos?.items?.length ? `<section class="bloque" id="como">
  <div class="ancho">
    <h2>${titular(c.pasos.titulo || 'Cómo comprar')}</h2>
    <ol class="pasos">
    ${c.pasos.items.map((s) => `<li><h3>${esc(s.titulo)}</h3><p>${esc(s.detalle)}</p></li>`).join('\n    ')}
    </ol>
  </div>
</section>` : ''}

${op?.items?.length ? `<section class="bloque bloque-papel" id="opiniones">
  <div class="ancho">
    <h2>${titular(op.titulo || 'Lo que dicen los clientes')}</h2>
    <div class="opiniones">
      ${op.resumen ? `<div class="nota">
        <p class="nota-num">${esc(op.resumen.nota)}</p>
        <p class="estrellas" aria-label="${esc(op.resumen.nota)} de 5 estrellas">${estrellas(op.resumen.nota)}</p>
        ${suc.filter((s) => s.google).map((s) => `<p class="nota-fila"><span>${esc(s.nombre)}</span><b>${esc(s.google.nota)} · ${esc(s.google.cantidad)} opiniones</b></p>`).join('')}
        <p class="nota-fuente">Puntaje de ${esc(op.fuente)} al ${esc(op.fecha)}.</p>
        ${op.linkDejar ? `<a class="btn btn-principal" href="${esc(op.linkDejar)}" target="_blank" rel="noopener">Dejar una opinión</a>` : ''}
      </div>` : ''}
      <ul class="citas">
      ${op.items.map((r) => `<li class="cita">
        <div class="cita-arriba">${r.foto ? `<img src="${esc(r.foto)}" alt="" loading="lazy" width="44" height="44">` : `<span class="cita-ini" aria-hidden="true">${esc(r.nombre.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase())}</span>`}<div><b>${esc(r.nombre)}</b><small>${esc([r.cuando, r.local].filter(Boolean).join(' · '))}</small></div>${/google/i.test(op.fuente) ? ICONOS.google : ''}</div>
        <p class="estrellas" aria-label="${r.estrellas || 5} de 5 estrellas">${estrellas(r.estrellas || 5)}</p>
        <blockquote>${esc(r.texto)}</blockquote>
      </li>`).join('\n      ')}
      </ul>
    </div>
  </div>
</section>` : ''}

<section class="bloque" id="donde">
  <div class="ancho">
    <h2>${titular(c.donde?.titulo || 'Horarios y ubicación')}</h2>
    ${c.donde?.bajada ? `<p class="bloque-bajada">${esc(c.donde.bajada)}</p>` : ''}
    <div class="donde">
      ${c.zona.mapa ? `<div class="mapa"><iframe title="Mapa de ${esc(c.marca.nombre)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="${esc(mapaInsertado(c.zona.mapa))}"></iframe><a href="${esc(linkMapa(c.zona.mapa))}" target="_blank" rel="noopener">Cómo llegar</a></div>` : ''}
      <div class="horarios">
        <h3>Horarios de atención</h3>
        ${suc.map((s) => `<h4>${esc(s.nombre)} ${s.horarios?.length ? abiertoAhora(s.horarios) : ''}</h4>
        <ul class="horarios-lista">${(s.horarios || []).map((h) => `<li><span>${esc(h.dias)}</span><b>${esc(rangoLindo(h))}</b></li>`).join('')}</ul>`).join('\n        ')}
        ${tel ? `<p class="horarios-tel">Teléfono: <a href="${linkTel(tel)}"><b>${esc(tel)}</b></a></p>` : ''}
      </div>
    </div>
  </div>
</section>

${c.preguntas?.items?.length ? `<section class="bloque bloque-papel" id="preguntas">
  <div class="ancho ancho-corto">
    <h2>${titular(c.preguntas.titulo || 'Preguntas frecuentes')}</h2>
    ${preguntas(c.preguntas.items)}
  </div>
</section>` : ''}

<section class="cierre">
  <div class="ancho">
    <h2>${titular(c.cierre?.titulo || i.titulo)}</h2>
    <p>${esc(c.cierre?.bajada || '')}</p>
    ${botonWa(c, { texto: c.cierre?.boton || 'Pedir presupuesto', mensaje: c.cierre?.mensaje, lugar: 'cierre' })}
  </div>
</section>
</main>

${pie(c)}
<div class="pedido-barra" id="pedidoBarra" role="region" aria-label="Tu pedido" hidden>
  <p><b id="pedidoCantidad">0 productos</b><span>en la lista</span></p>
  <button type="button" class="btn btn-wa btn-chico" id="pedidoEnviar">${ICONOS.wa}<span>Enviar pedido</span></button>
</div>
${extras(c)}`;

  return documento({ c, p, molde: { precargar, colorNavegador }, cuerpo, titulo: c.seo.titulo, descripcion: c.seo.descripcion, version });
}
