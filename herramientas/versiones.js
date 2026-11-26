#!/usr/bin/env node
// Control de versiones de los js y css (25/11/2026).
//
// Por qué existe: el .htaccess guarda los .js y .css en la caché del navegador (y de Hostinger) por un año.
// Lo único que hace llegar una versión nueva es cambiar el ?v= con que la pide el HTML. El 25/11 se publicó
// un alta/alta.js nuevo sin cambiarle el ?v= y la web siguió entregando el viejo (lo arregló la PR #26).
//
// Uso (Node, sin dependencias):
//   node herramientas/versiones.js                  Revisa que todo js/css local se pida con ?v=.
//   node herramientas/versiones.js --base origin/main
//                                                   Además, para cada js/css que cambió desde esa rama,
//                                                   revisa que en cada página que lo pide el ?v= también cambió.
//                                                   Es lo que corre GitHub en cada PR a main.
//   node herramientas/versiones.js --publicado [https://mymsoluciones.online]
//                                                   Baja cada js/css tal cual lo pide cada HTML (con su ?v=) y lo
//                                                   compara con el del repo: avisa cuál quedó viejo en la web.
//   node herramientas/versiones.js --listar          Muestra cada carga encontrada (cargador, archivo, versión).
//
// Qué cuenta como "cargador": cada HTML (<script src>, <link rel=stylesheet href> y las cargas por código en
// sus <script>) y cada .js que arma a mano un <script> o <link> con 'archivo.js?v=...' (por ejemplo
// admin/acceso.js carga menu.js y panel/pieza.js carga pieza.css). Las rutas se resuelven contra la carpeta
// del cargador, o contra la raíz si empiezan con /.
'use strict';

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..');

// Archivos que van sin ?v= a propósito: el .htaccess los sirve sin caché.
// admin/sw.js: el service worker tiene que tener siempre la misma dirección para que el navegador lo actualice.
const SIN_VERSION = new Set(['admin/sw.js']);

function git(args, opciones) {
  return execFileSync('git', args, Object.assign({ cwd: RAIZ, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }, opciones || {}));
}

const esLocal = (ref) => !/^([a-z][a-z0-9+.-]*:|\/\/)/i.test(ref);

// Devuelve { ruta, v } con la ruta del archivo dentro del repo (con / como separador) y el valor de ?v= (o null).
function resolver(cargador, ref) {
  const [sinHash] = ref.split('#');
  const [camino, consulta = ''] = sinHash.split('?');
  if (!/\.(js|css)$/i.test(camino)) return null;
  const base = camino.startsWith('/') ? '' : path.posix.dirname(cargador);
  const ruta = path.posix.normalize(path.posix.join(base, camino.replace(/^\/+/, '')));
  if (ruta.startsWith('..')) return null;
  const v = new URLSearchParams(consulta).get('v');
  return { ruta, v: v === null || v === '' ? null : v };
}

// Cargas por código: cadenas como 'menu.js?v=2026...' o register('sw.js'). Sólo se toman si el archivo existe
// en el repo (así no se confunden con archivos de otro servidor, como el pdf.min.js de la CDN).
const RE_CADENA = /(['"`])([^'"`\s<>()]+?\.(?:js|css)(?:\?[^'"`\s]*)?)\1/g;

function refsEnCodigo(cargador, codigo, existe) {
  const salida = [];
  for (const m of codigo.matchAll(RE_CADENA)) {
    if (!esLocal(m[2])) continue;
    // Una cadena que se pega a otra (PDFJS + 'pdf.min.js', API + '/x.js') no es una dirección propia, salvo que
    // lleve ?v=: entonces es nuestra y se arma con la carpeta del propio script (base + 'menu.js?v=...').
    const antes = codigo.slice(Math.max(0, m.index - 3), m.index);
    if (/\+\s*$/.test(antes) && !/\?(.*&)?v=/.test(m[2])) continue;
    const r = resolver(cargador, m[2]);
    if (r && existe(r.ruta)) salida.push(Object.assign({ cargador, texto: m[2] }, r));
  }
  return salida;
}

function refsEnHtml(cargador, html, existe) {
  const salida = [];
  const limpio = html.replace(/<!--[\s\S]*?-->/g, '');
  const attr = (etiqueta, nombre) => {
    const m = etiqueta.match(new RegExp('\\s' + nombre + '\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|([^\\s>]+))', 'i'));
    return m ? (m[1] ?? m[2] ?? m[3]) : null;
  };
  const agregar = (texto) => {
    if (!texto || !esLocal(texto)) return;
    const r = resolver(cargador, texto.trim());
    if (r) salida.push(Object.assign({ cargador, texto: texto.trim() }, r));
  };
  for (const m of limpio.matchAll(/<script\b[^>]*>/gi)) agregar(attr(m[0], 'src'));
  for (const m of limpio.matchAll(/<link\b[^>]*>/gi)) {
    const rel = (attr(m[0], 'rel') || '').toLowerCase().split(/\s+/);
    if (rel.includes('stylesheet') || rel.includes('modulepreload') || (rel.includes('preload') && /^(script|style)$/i.test(attr(m[0], 'as') || ''))) agregar(attr(m[0], 'href'));
  }
  for (const m of limpio.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
    if (/\ssrc\s*=/i.test(m[0].slice(0, m[0].indexOf('>')))) continue;
    salida.push(...refsEnCodigo(cargador, m[1], existe));
  }
  return salida;
}

// Todas las referencias de una versión del repo. leer(ruta) devuelve el texto o null; existe(ruta) dice si está.
function recolectar(archivos, leer, existe) {
  const refs = [];
  for (const f of archivos) {
    if (/\.html?$/i.test(f)) { const t = leer(f); if (t !== null) refs.push(...refsEnHtml(f, t, existe)); }
    else if (/\.js$/i.test(f)) { const t = leer(f); if (t !== null) refs.push(...refsEnCodigo(f, t, existe).filter((r) => r.ruta !== f)); }
  }
  return refs;
}

function delTrabajo() {
  const archivos = git(['ls-files', '-z']).split('\0').filter(Boolean);
  const set = new Set(archivos);
  const leer = (f) => { try { return fs.readFileSync(path.join(RAIZ, f), 'utf8'); } catch (e) { return null; } };
  return { archivos, existe: (f) => set.has(f), leer };
}

function deCommit(commit) {
  const archivos = git(['ls-tree', '-r', '-z', '--name-only', commit]).split('\0').filter(Boolean);
  const set = new Set(archivos);
  const leer = (f) => { if (!set.has(f)) return null; try { return git(['show', commit + ':' + f]); } catch (e) { return null; } };
  return { archivos, existe: (f) => set.has(f), leer };
}

const anotar = (archivo, msj) => { if (process.env.GITHUB_ACTIONS) console.log(`::error file=${archivo}::${msj}`); };

function chequearSinVersion(refs) {
  const errores = [];
  for (const r of refs) {
    if (r.v !== null || SIN_VERSION.has(r.ruta)) continue;
    errores.push([r.cargador, `${r.cargador} pide ${r.texto} sin ?v=: así queda un año en la caché. Agregale ?v=AAAAMMDDhhmm (o sumalo a SIN_VERSION en herramientas/versiones.js si el .htaccess lo sirve sin caché).`]);
  }
  return errores;
}

function chequearCambios(base, refs) {
  const mb = git(['merge-base', base, 'HEAD']).trim();
  const cambiados = new Set(git(['diff', '--name-only', '-z', mb, '--']).split('\0').filter(Boolean)
    .map((f) => f.replace(/\\/g, '/')).filter((f) => /\.(js|css)$/i.test(f)));
  const aRevisar = refs.filter((r) => cambiados.has(r.ruta) && !SIN_VERSION.has(r.ruta) && r.v !== null);
  // Sólo se lee la versión vieja de los cargadores que piden algo cambiado (leer las 1000 páginas tarda mucho).
  const antes = deCommit(mb);
  const refsAntes = recolectar([...new Set(aRevisar.map((r) => r.cargador))], antes.leer, antes.existe);
  const vAntes = new Map(refsAntes.map((r) => [r.cargador + '\0' + r.ruta, r.v]));
  const errores = [];
  for (const r of aRevisar) {
    const clave = r.cargador + '\0' + r.ruta;
    if (!vAntes.has(clave)) continue; // el cargador o la referencia son nuevos en la PR: no hay versión vieja que tapar
    if (vAntes.get(clave) === r.v) {
      errores.push([r.cargador, `${r.ruta} cambió pero ${r.cargador} sigue pidiendo ${r.texto}: subile la versión.`]);
    }
  }
  return { errores, cambiados: [...cambiados], mb };
}

async function auditarPublicado(sitio, refs) {
  sitio = sitio.replace(/\/+$/, '');
  const unicas = new Map();
  for (const r of refs) {
    const url = `${sitio}/${r.ruta}${r.v !== null ? '?v=' + encodeURIComponent(r.v) : ''}`;
    if (!unicas.has(url)) unicas.set(url, { ruta: r.ruta, v: r.v, cargadores: [] });
    unicas.get(url).cargadores.push(r.cargador);
  }
  const norm = (s) => s.replace(/\r\n?/g, '\n');
  const lista = [...unicas.entries()];
  const resultados = [];
  for (let i = 0; i < lista.length; i += 8) {
    resultados.push(...await Promise.all(lista.slice(i, i + 8).map(async ([url, info]) => {
      const local = norm(fs.readFileSync(path.join(RAIZ, info.ruta), 'utf8'));
      try {
        const resp = await fetch(url, { headers: { 'User-Agent': 'control-versiones' } });
        if (!resp.ok) return Object.assign({ url, estado: `HTTP ${resp.status}` }, info);
        const remoto = norm(await resp.text());
        return Object.assign({ url, estado: remoto === local ? 'igual' : 'distinto' }, info);
      } catch (e) { return Object.assign({ url, estado: 'error: ' + e.message }, info); }
    })));
  }
  let malos = 0;
  for (const r of resultados.sort((a, b) => a.url.localeCompare(b.url))) {
    const sinV = r.v === null && !SIN_VERSION.has(r.ruta);
    if (r.estado === 'igual' && !sinV) continue;
    malos++;
    console.log(`${r.estado === 'igual' ? 'SIN ?v=' : r.estado.toUpperCase()}  ${r.url}\n    lo piden: ${[...new Set(r.cargadores)].join(', ')}`);
  }
  console.log(`\n${resultados.length} direcciones revisadas, ${malos} con problemas.`);
  return malos;
}

async function main() {
  const args = process.argv.slice(2);
  const trabajo = delTrabajo();
  const refs = recolectar(trabajo.archivos.filter((f) => /\.(html?|js)$/i.test(f)), trabajo.leer, trabajo.existe);

  if (args.includes('--listar')) {
    for (const r of refs) console.log(`${r.cargador}\t${r.ruta}\t${r.v === null ? '(sin ?v=)' : r.v}`);
    return;
  }

  const iPub = args.indexOf('--publicado');
  if (iPub >= 0) {
    const sitio = args[iPub + 1] && !args[iPub + 1].startsWith('--') ? args[iPub + 1] : 'https://mymsoluciones.online';
    process.exit(await auditarPublicado(sitio, refs) ? 1 : 0);
  }

  const errores = chequearSinVersion(refs);
  const iBase = args.indexOf('--base');
  if (iBase >= 0) {
    const base = args[iBase + 1];
    if (!base) { console.error('Falta la rama después de --base (por ejemplo: --base origin/main).'); process.exit(2); }
    const r = chequearCambios(base, refs);
    errores.push(...r.errores);
    console.log(`Comparando contra ${base} (${r.mb.slice(0, 7)}): ${r.cambiados.length} js/css cambiados${r.cambiados.length ? ': ' + r.cambiados.join(', ') : ''}.`);
  }
  console.log(`${refs.length} cargas de js/css locales revisadas.`);
  if (!errores.length) { console.log('Todo bien: cada js/css se pide con su ?v= al día.'); return; }
  console.log(`\n${errores.length} problema(s):`);
  for (const [archivo, msj] of errores) { console.log('- ' + msj); anotar(archivo, msj); }
  process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(2); });
