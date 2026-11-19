#!/usr/bin/env node
// Genera la landing de un cliente a partir de su ficha (cliente.js). Sin dependencias: sólo Node 18 o más.
//
//   node moldes/generar.mjs plomeria-mansilla      → genera muestras/plomeria-mansilla/
//   node moldes/generar.mjs --todos                → genera todas las fichas y el índice de muestras
//   node moldes/generar.mjs mi-cliente --salida C:\ruta\para\subir
//   node moldes/generar.mjs --nuevo mi-cliente servicio   → crea la ficha de un cliente nuevo copiando el ejemplo
//
// Si la ficha tiene un error (falta un dato obligatorio, una frase que promete resultados, un CUIT mal escrito)
// no genera nada y dice qué corregir.
import { readFile, writeFile, mkdir, cp, readdir, rm, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { controlar, paleta, esc } from './nucleo/util.mjs';
import { paginaTramite, paginaPrivacidad, botonesLegales, NOMBRE_ARREPENTIMIENTO, NOMBRE_BAJA } from './nucleo/partes.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const CLIENTES = path.join(AQUI, 'clientes');
const MOLDES = { servicio: 'Servicio a domicilio', local: 'Local con productos', turnos: 'Profesional con turnos' };
const EJEMPLO = { servicio: 'plomeria-mansilla', local: 'hierros-walter', turnos: 'estudio-alma' };

const args = process.argv.slice(2);
const opcion = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const SALIDA = path.resolve(opcion('--salida') || path.join(AQUI, '..', 'muestras'));

const achicarCss = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s*\n\s*/g, '').replace(/\s*([{};,>])\s*/g, '$1').replace(/;}/g, '}');
const kb = (n) => (n / 1024).toFixed(0) + ' KB';

async function pesoDe(dir) {
  let total = 0;
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const r = path.join(dir, e.name);
    total += e.isDirectory() ? await pesoDe(r) : (await stat(r)).size;
  }
  return total;
}

async function generar(slug) {
  const t0 = performance.now();
  const carpeta = path.join(CLIENTES, slug);
  const ficha = path.join(carpeta, 'cliente.js');
  if (!existsSync(ficha)) throw new Error(`No existe ${path.relative(process.cwd(), ficha)}. Para crearla: node moldes/generar.mjs --nuevo ${slug} servicio`);
  const c = (await import(pathToFileURL(ficha).href + '?t=' + Date.now())).default;
  if (!MOLDES[c.molde]) throw new Error(`${slug}: «molde» tiene que ser uno de: ${Object.keys(MOLDES).join(', ')}.`);
  if (c.slug !== slug) throw new Error(`${slug}: el «slug» de la ficha (${c.slug}) tiene que ser igual al nombre de la carpeta.`);
  const molde = await import(pathToFileURL(path.join(AQUI, c.molde, 'molde.mjs')).href);

  const { errores, avisos, faltan } = controlar(c, molde);
  const frenan = [...errores, ...(c.estado === 'final' ? faltan : [])];
  if (frenan.length) {
    console.error(`\n✗ ${slug}: no se generó. Hay que corregir la ficha:\n` + frenan.map((e) => '   · ' + e).join('\n'));
    return { slug, ok: false, errores: frenan };
  }

  const p = paleta(c.tema);
  const css = achicarCss(await readFile(path.join(AQUI, 'nucleo', 'base.css'), 'utf8') + await readFile(path.join(AQUI, c.molde, 'molde.css'), 'utf8'));
  const jsMolde = path.join(AQUI, c.molde, 'molde.js');
  const js = await readFile(path.join(AQUI, 'nucleo', 'sitio.js'), 'utf8') + (existsSync(jsMolde) ? '\n' + await readFile(jsMolde, 'utf8') : '');
  const version = createHash('sha1').update(css + js).digest('hex').slice(0, 8);

  const destino = path.join(SALIDA, slug);
  await rm(destino, { recursive: true, force: true });
  await mkdir(destino, { recursive: true });
  // Las fotos, los videos y el logo: todo lo que haya en la carpeta del cliente menos la ficha.
  for (const e of await readdir(carpeta, { withFileTypes: true })) {
    if (e.name === 'cliente.js' || e.name.startsWith('.') || /\.md$/i.test(e.name)) continue;
    await cp(path.join(carpeta, e.name), path.join(destino, e.name), { recursive: true });
  }
  const inicio = molde.pagina(c, p, version);
  await writeFile(path.join(destino, 'index.html'), inicio);
  await writeFile(path.join(destino, 'estilo.css'), css);
  await writeFile(path.join(destino, 'sitio.js'), js);
  const b = botonesLegales(c);
  const paginas = [['privacidad', paginaPrivacidad(c, p, molde, version)]];
  if (b.arrepentimiento) paginas.push(['arrepentimiento', paginaTramite(c, p, molde, 'arrepentimiento', version)]);
  if (b.baja) paginas.push(['baja', paginaTramite(c, p, molde, 'baja', version)]);
  for (const [nombre, html] of paginas) {
    await mkdir(path.join(destino, nombre), { recursive: true });
    await writeFile(path.join(destino, nombre, 'index.html'), html);
  }
  if (c.estado === 'final') {
    const dom = 'https://' + c.seo.dominio.replace(/^https?:\/\//, '').replace(/\/$/, '');
    await writeFile(path.join(destino, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${dom}/sitemap.xml\n`);
    await writeFile(path.join(destino, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${dom}/</loc></url></urlset>\n`);
    await writeFile(path.join(destino, '.htaccess'), `# Caché: el HTML siempre se vuelve a pedir; el CSS y el JS llevan versión (?v=) y las fotos duran un mes.\n<IfModule mod_headers.c>\n  <FilesMatch "\\.(html)$">\n    Header set Cache-Control "no-cache, must-revalidate"\n  </FilesMatch>\n  <FilesMatch "\\.(css|js)$">\n    Header set Cache-Control "public, max-age=31536000, immutable"\n  </FilesMatch>\n  <FilesMatch "\\.(jpg|jpeg|png|webp|avif|svg|mp4|woff2)$">\n    Header set Cache-Control "public, max-age=2592000"\n  </FilesMatch>\n  Header always set X-Content-Type-Options "nosniff"\n  Header always set Referrer-Policy "strict-origin-when-cross-origin"\n</IfModule>\n<IfModule mod_deflate.c>\n  AddOutputFilterByType DEFLATE text/html text/css application/javascript image/svg+xml\n</IfModule>\n`);
  }

  // Control de salida: lo que una persona tildaría a mano, lo tilda el generador.
  const problemas = [];
  const locales = [...inicio.matchAll(/(?:src|poster|href)="([^"#?:]+\.(?:jpe?g|png|webp|avif|svg|mp4|gif))"/gi)].map((m) => m[1]);
  for (const r of new Set(locales)) if (!existsSync(path.join(destino, r))) problemas.push(`falta el archivo «${r}» en la carpeta del cliente`);
  if (b.arrepentimiento && !inicio.includes(NOMBRE_ARREPENTIMIENTO)) problemas.push('no aparece el botón de arrepentimiento');
  if (b.baja && !inicio.includes(NOMBRE_BAJA)) problemas.push('no aparece el botón de baja');
  if (/\u{1F916}/u.test(inicio)) problemas.push('aparece el emoji de robot');
  const sinAlt = (inicio.match(/<img(?![^>]*\balt=)[^>]*>/g) || []).length;
  if (sinAlt) problemas.push(`${sinAlt} imagen(es) sin texto alternativo`);
  const pesoHtml = Buffer.byteLength(inicio) + Buffer.byteLength(css) + Buffer.byteLength(js);
  const pesoPrimera = [...new Set(locales)].filter((r) => /\.(jpe?g|png|webp|avif)$/i.test(r)).slice(0, 3);
  let fotosArriba = 0;
  for (const r of pesoPrimera) if (existsSync(path.join(destino, r))) fotosArriba += (await stat(path.join(destino, r))).size;

  const ms = Math.round(performance.now() - t0);
  const marca = problemas.length ? '!' : '✓';
  console.log(`\n${marca} ${slug}  ·  molde «${c.molde}»  ·  ${c.estado}  ·  ${ms} ms`);
  console.log(`   ${path.relative(process.cwd(), path.join(destino, 'index.html'))}`);
  console.log(`   Página + estilo + código: ${kb(pesoHtml)} (sin comprimir) · carpeta entera: ${kb(await pesoDe(destino))}`);
  for (const a of avisos) console.log('   aviso: ' + a);
  for (const pr of problemas) console.log('   PROBLEMA: ' + pr);
  if (faltan.length) console.log(`   Para pasarla a «final» faltan ${faltan.length} dato(s):\n` + faltan.map((f) => '     · ' + f).join('\n'));
  return { slug, ok: !problemas.length, c, faltan, ms, peso: pesoHtml };
}

async function indice(resultados) {
  const filas = resultados.filter((r) => r.c).map((r) => `<a class="tarjeta" href="${r.slug}/index.html">
  <span class="molde">Molde ${Object.keys(MOLDES).indexOf(r.c.molde) + 1}: ${MOLDES[r.c.molde]}</span>
  <b>${esc(r.c.marca.nombre)}</b>
  <span>${esc(r.c.marca.queHace)}</span>
  <span class="estado">${r.c.ficticio ? 'Negocio inventado para mostrar el molde' : 'Regenerada desde la landing hecha a mano'} · ${r.faltan.length ? `faltan ${r.faltan.length} datos del cliente para publicarla` : 'ficha completa'}</span>
</a>`).join('\n');
  const html = `<!doctype html><html lang="es-AR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow">
<title>Moldes de landing · MyM Soluciones</title>
<style>
body{margin:0;font:16px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#0f1b3d;background:#f4f7ff}
main{max-width:980px;margin:0 auto;padding:48px 20px 80px}
h1{font-size:clamp(28px,5vw,42px);line-height:1.1;margin:0 0 12px;letter-spacing:-.02em}
h1 span{color:#2f6bff}
p{max-width:62ch;margin:0 0 12px;color:#3c4a6b}
.grilla{display:grid;gap:14px;margin-top:28px}
@media(min-width:720px){.grilla{grid-template-columns:1fr 1fr}}
.tarjeta{display:grid;gap:6px;background:#fff;border:1px solid #d9e2f7;border-radius:16px;padding:20px;text-decoration:none;color:inherit;border-top:5px solid #2f6bff}
.tarjeta:hover{border-top-color:#00c2a8}
.tarjeta b{font-size:22px}
.molde{font-size:13px;font-weight:700;color:#1f4fd1}
.estado{font-size:13px;color:#5a678a}
code{background:#e6edff;padding:2px 6px;border-radius:5px;font-size:14px}
</style></head><body><main>
<h1>Moldes de landing de <span>MyM Soluciones</span></h1>
<p>Cada página de abajo salió de una ficha de datos (<code>cliente.js</code>) y de un molde. Nadie escribió su HTML a mano. Son muestras para aprobar: no están publicadas en ningún dominio de cliente.</p>
<p>Mirá cada una en el celular y en la computadora. Al pie de cada una están los dos botones que pide la Disposición 954/2025 y los datos del responsable, que son los del cliente.</p>
<div class="grilla">
${filas}
</div>
</main></body></html>`;
  await writeFile(path.join(SALIDA, 'index.html'), html);
  console.log(`\nÍndice de muestras: ${path.relative(process.cwd(), path.join(SALIDA, 'index.html'))}`);
}

async function nuevo(slug, molde) {
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) throw new Error('Poné el nombre de la carpeta en minúsculas y con guiones: node moldes/generar.mjs --nuevo ferreteria-lopez local');
  if (!MOLDES[molde]) throw new Error(`Elegí el molde: ${Object.entries(MOLDES).map(([k, v]) => `${k} (${v})`).join(', ')}.`);
  const destino = path.join(CLIENTES, slug);
  if (existsSync(destino)) throw new Error(`Ya existe la carpeta clientes/${slug}.`);
  await mkdir(path.join(destino, 'fotos'), { recursive: true });
  const base = await readFile(path.join(AQUI, molde, 'ficha-en-blanco.js'), 'utf8');
  await writeFile(path.join(destino, 'cliente.js'), base.replaceAll('NOMBRE-DE-LA-CARPETA', slug));
  console.log(`Ficha creada: moldes/clientes/${slug}/cliente.js\nLlenala, poné las fotos en moldes/clientes/${slug}/fotos/ y corré: node moldes/generar.mjs ${slug}`);
}

try {
  if (args[0] === '--nuevo') await nuevo(args[1], args[2]);
  else if (args.includes('--todos')) {
    const slugs = (await readdir(CLIENTES, { withFileTypes: true })).filter((e) => e.isDirectory() && existsSync(path.join(CLIENTES, e.name, 'cliente.js'))).map((e) => e.name).sort();
    const res = [];
    for (const s of slugs) res.push(await generar(s));
    await indice(res);
    if (res.some((r) => !r.ok)) process.exitCode = 1;
  } else if (args[0] && !args[0].startsWith('--')) {
    const r = await generar(path.basename(args[0].replace(/[\\/]cliente\.js$/, '')));
    if (!r.ok) process.exitCode = 1;
  } else {
    console.log('Uso:\n  node moldes/generar.mjs <carpeta-del-cliente>\n  node moldes/generar.mjs --todos\n  node moldes/generar.mjs --nuevo <carpeta> <servicio|local|turnos>\nEjemplos de fichas: ' + Object.values(EJEMPLO).join(', '));
  }
} catch (e) {
  console.error('✗ ' + e.message);
  process.exitCode = 1;
}
