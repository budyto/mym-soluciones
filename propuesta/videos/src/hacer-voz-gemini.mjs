// Genera la voz de los videos de la propuesta con Gemini (voces con acento argentino), un MP3 por tramo,
// en voz/gemini/<plan>-<n>.mp3. Después se corre hacer-voz.py --fuente gemini y hacer-videos.mjs.
//
// Voces elegidas por Budy el 19/11/2026 (se van alternando según el caso):
//   varon  → es-419-csagent-10 (hombre de 51 años, vendedor: natural y claro)
//   mujer  → es-419-training-1 (mujer de 27 años: clara y amigable)
//
// Qué hace falta: Node 22, ffmpeg y la clave en GEMINI_API_KEY (nunca en el repo ni en el chat).
// Cómo se corre:
//   node propuesta/videos/src/hacer-voz-gemini.mjs redes-esencial redes-profesional     -> esos planes, voz de varón
//   VOZ=mujer node propuesta/videos/src/hacer-voz-gemini.mjs redes-premium              -> con la voz de mujer
//   REHACER=1 node …                                                                    -> vuelve a generar aunque ya exista
// Un tramo que dice lo mismo que otro ya generado con la misma voz (la prueba gratis) se copia: no se paga dos veces.
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ACA = path.dirname(fileURLToPath(import.meta.url));
export const VOCES = { varon: 'es-419-csagent-10', mujer: 'es-419-training-1' };
const MODELO = 'gemini-3.8-flash-tts';
const ESTILO = 'Locución de un video corto de una agencia argentina: cálida, clara y segura, con ritmo ágil y natural. Sin tono de locutor de radio ni de robot. Acento rioplatense de Buenos Aires.';

const clave = process.env.GEMINI_API_KEY;
if (!clave) throw new Error('Falta GEMINI_API_KEY en el entorno.');
const cual = process.env.VOZ || 'varon';
const voz = VOCES[cual];
if (!voz) throw new Error('VOZ tiene que ser varon o mujer.');

// Los mismos tramos que lee hacer-voz.py: «## plan · título» y «N. **Qué se ve.** Lo que dice la voz.»
const planes = {};
let plan = null;
for (const l of readFileSync(path.join(ACA, 'guiones-de-voz.md'), 'utf8').split(/\r?\n/)) {
  let m = /^## ([a-z0-9-]+) · (.+)$/.exec(l);
  if (m) { plan = m[1]; planes[plan] = []; continue; }
  m = /^\d+\. \*\*(.+?)\*\* (.+)$/.exec(l);
  if (m && plan) planes[plan].push(m[2].trim());
}
const pedidos = process.argv.slice(2);
if (!pedidos.length) throw new Error('Decí qué planes: por ejemplo redes-esencial redes-profesional redes-premium.');

const carpeta = path.join(ACA, 'voz', 'gemini');
mkdirSync(carpeta, { recursive: true });
// Qué texto y qué voz tiene cada MP3 ya generado, para reusar y para saber cuándo hay que rehacer.
const indiceRuta = path.join(carpeta, 'indice.json');
const indice = existsSync(indiceRuta) ? JSON.parse(readFileSync(indiceRuta, 'utf8')) : {};

async function generar(texto) {
  for (let intento = 1; ; intento++) {
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      headers: { 'x-goog-api-key': clave, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(90_000),
      body: JSON.stringify({ model: MODELO, input: [{ type: 'user_input', content: [{ type: 'text', text: texto, annotations: [{ type: 'speech_metadata', style: ESTILO }] }] }], response_format: { type: 'audio' }, generation_config: { speech_config: [{ voice: voz }] } })
    }).catch((err) => ({ ok: false, status: 0, json: async () => ({ error: { message: err.message } }) }));
    const d = await r.json().catch(() => ({}));
    const audio = (d.steps || []).flatMap((s) => s.content || []).find((c) => c.type === 'audio');
    if (r.ok && audio) return Buffer.from(audio.data, 'base64');
    if (intento >= 4) throw new Error(`Gemini no devolvió la voz (${r.status}): ${JSON.stringify(d.error || d).slice(0, 200)}`);
    await new Promise((ok) => setTimeout(ok, 8000 * intento));
  }
}

for (const p of pedidos) {
  if (!planes[p]) throw new Error(`No hay guion para «${p}».`);
  for (const [i, texto] of planes[p].entries()) {
    const nombre = `${p}-${i + 1}.mp3`;
    const destino = path.join(carpeta, nombre);
    const igual = indice[nombre]?.texto === texto && indice[nombre]?.voz === voz && existsSync(destino);
    if (igual && !process.env.REHACER) { console.log(`${nombre}: ya estaba`); continue; }
    const gemelo = Object.entries(indice).find(([n, x]) => n !== nombre && x.texto === texto && x.voz === voz && existsSync(path.join(carpeta, n)));
    if (gemelo && !process.env.REHACER) {
      copyFileSync(path.join(carpeta, gemelo[0]), destino);
      console.log(`${nombre}: igual a ${gemelo[0]}, copiado`);
    } else {
      const wav = await generar(texto);
      const tmp = path.join(carpeta, `${nombre}.wav`);
      writeFileSync(tmp, wav);
      const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', tmp, '-b:a', '160k', destino]);
      spawnSync(process.platform === 'win32' ? 'cmd' : 'rm', process.platform === 'win32' ? ['/c', 'del', tmp] : [tmp]);
      if (r.status !== 0) throw new Error(`ffmpeg no pudo pasar ${nombre} a MP3.`);
      console.log(`${nombre}: generado`);
    }
    indice[nombre] = { texto, voz, modelo: MODELO };
    writeFileSync(indiceRuta, JSON.stringify(indice, null, 1) + '\n');
  }
}
