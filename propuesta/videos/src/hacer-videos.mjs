// Pasa las páginas animadas de esta carpeta a MP4 (1080 x 1920, 30 cuadros por segundo) con su voz.
// La voz y los tiempos de cada tramo los deja antes hacer-voz.py (lee guiones-de-voz.md y escribe voz/<plan>.m4a):
//   1) python3 propuesta/videos/src/hacer-voz.py [plan]     2) node propuesta/videos/src/hacer-videos.mjs [plan]
//
// Qué hace falta: Node, ffmpeg y Chrome instalados, y una carpeta aparte (fuera del repo) con:
//   npm i playwright-core @fontsource/archivo @fontsource/instrument-serif @fontsource/michroma @fontsource/martian-mono
// Cómo se corre (desde cualquier lado):
//   HERRAMIENTAS=/ruta/a/esa/carpeta node propuesta/videos/src/hacer-videos.mjs            -> los 8 videos
//   HERRAMIENTAS=... node propuesta/videos/src/hacer-videos.mjs orquestador               -> uno solo
//   HERRAMIENTAS=... FOTOS=/ruta/salida node .../hacer-videos.mjs                         -> sólo fotos de control
// Deja <plan>.mp4 y <plan>.jpg (la portada) en propuesta/videos/.
// Las tipografías se cargan desde esa carpeta para que el video salga igual aunque no haya internet.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const aca = path.dirname(fileURLToPath(import.meta.url));
const salida = path.resolve(aca, '..');
const herr = process.env.HERRAMIENTAS || process.cwd();
const require = createRequire(path.join(herr, 'x.js'));
const { chromium } = require('playwright-core');
const FPS = 30;
const PLANES = ['bot-de-whatsapp', 'seguimiento-de-clientes', 'paquete-completo', 'orquestador', 'empresa-en-automatico', 'redes-esencial', 'redes-profesional', 'redes-premium'];
const pedidos = process.argv.slice(2).length ? process.argv.slice(2) : PLANES;

const fuente = (paquete, archivo) => 'data:font/woff2;base64,' + fs.readFileSync(path.join(herr, 'node_modules/@fontsource', paquete, 'files', archivo)).toString('base64');
const cara = (familia, peso, estilo, url) => `@font-face{font-family:"${familia}";font-weight:${peso};font-style:${estilo};src:url(${url}) format("woff2");}`;
const CSS_FUENTES = [
  ...[500, 600, 700, 800, 900].map((p) => cara('Archivo', p, 'normal', fuente('archivo', `archivo-latin-${p}-normal.woff2`))),
  cara('Instrument Serif', 400, 'italic', fuente('instrument-serif', 'instrument-serif-latin-400-italic.woff2')),
  cara('Michroma', 400, 'normal', fuente('michroma', 'michroma-latin-400-normal.woff2')),
  cara('Martian Mono', 500, 'normal', fuente('martian-mono', 'martian-mono-latin-500-normal.woff2')),
].join('\n');

const navegador = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--force-color-profile=srgb', '--font-render-hinting=none'] });
for (const plan of pedidos) {
  const pagina = await navegador.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  const errores = [];
  pagina.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
  pagina.on('pageerror', (e) => errores.push(String(e)));
  await pagina.route(/fonts\.googleapis\.com/, (r) => r.fulfill({ contentType: 'text/css', body: CSS_FUENTES }));
  await pagina.route(/fonts\.gstatic\.com/, (r) => r.abort());
  await pagina.goto(pathToFileURL(path.join(aca, plan + '.html')).href + '?capturar');
  await pagina.waitForFunction('window.videoListo === true');
  const dur = Number(await pagina.evaluate('document.body.dataset.dur'));

  if (process.env.FOTOS) {
    for (const s of (process.env.SEGUNDOS || '2.5,6,9,12,15,19,24,31').split(',')) {
      await pagina.evaluate((ms) => window.irA(ms), Number(s) * 1000);
      await pagina.screenshot({ path: path.join(process.env.FOTOS, `${plan}-${String(s).padStart(4, '0')}s.jpg`), type: 'jpeg', quality: 80 });
    }
  } else {
    const mp4 = path.join(salida, plan + '.mp4');
    const voz = path.join(aca, 'voz', plan + '.m4a');
    if (!fs.existsSync(voz)) throw new Error('Falta la voz de ' + plan + ': corré antes hacer-voz.py');
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
      '-i', voz, '-map', '0:v', '-map', '1:a', '-t', String(dur),
      '-vf', 'scale=in_color_matrix=bt601:out_color_matrix=bt709:in_range=full:out_range=tv,format=yuv420p',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '21', '-profile:v', 'high', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
      '-c:a', 'copy', '-movflags', '+faststart', mp4], { stdio: ['pipe', 'inherit', 'inherit'] });
    const fin = new Promise((ok, mal) => ff.on('close', (c) => (c === 0 ? ok() : mal(new Error('ffmpeg salió con ' + c)))));
    const cuadros = Math.round(dur * FPS);
    for (let i = 0; i < cuadros; i++) {
      await pagina.evaluate((ms) => window.irA(ms), (i * 1000) / FPS);
      const foto = await pagina.screenshot({ type: 'jpeg', quality: 95 });
      if (!ff.stdin.write(foto)) await new Promise((r) => ff.stdin.once('drain', r));
    }
    ff.stdin.end();
    await fin;
    // La portada: la pantalla del nombre del plan
    await pagina.evaluate(() => window.irA(2200));
    await pagina.screenshot({ path: path.join(salida, plan + '.jpg'), type: 'jpeg', quality: 82 });
    console.log(plan, 'listo:', (fs.statSync(mp4).size / 1048576).toFixed(2), 'MB,', dur, 's');
  }
  if (errores.length) console.log(plan, 'errores de consola:', errores);
  await pagina.close();
}
await navegador.close();
