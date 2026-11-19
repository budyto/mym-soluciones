#!/usr/bin/env node
// Baja las letras de cada molde desde Google Fonts y las deja en moldes/<molde>/letras/, para servirlas desde
// el propio sitio (más rápido y sin mandar la dirección IP del visitante a Google). Se corre una sola vez, o
// cuando se cambia la letra de un molde:   node moldes/nucleo/bajar-letras.mjs
// Todas tienen licencia SIL Open Font License, que permite alojarlas y redistribuirlas.
import { writeFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const MOLDES = {
  servicio: 'family=Bricolage+Grotesque:opsz,wght@12..96,600..800&family=Public+Sans:wght@400..700',
  local: 'family=Barlow+Condensed:wght@700;800&family=Barlow:wght@400;500;600',
  turnos: 'family=Fraunces:ital,opsz,wght@0,9..144,400..600;1,9..144,400&family=Nunito+Sans:opsz,wght@6..12,400..700',
};

for (const [molde, familias] of Object.entries(MOLDES)) {
  const css = await (await fetch(`https://fonts.googleapis.com/css2?${familias}&display=swap`, { headers: { 'User-Agent': UA } })).text();
  const dir = path.join(AQUI, '..', molde, 'letras');
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  // Sólo el bloque «latin»: cubre el español (ñ, tildes, ¿ ¡ « »).
  const bloques = [...css.matchAll(/\/\* latin \*\/\s*(@font-face\s*{[^}]+})/g)].map((m) => m[1]);
  let salida = '', n = 0;
  for (const b of bloques) {
    const familia = b.match(/font-family:\s*'([^']+)'/)[1];
    const estilo = b.match(/font-style:\s*(\w+)/)[1];
    const peso = b.match(/font-weight:\s*([\d ]+)/)[1].trim();
    const url = b.match(/url\((https:[^)]+\.woff2)\)/)[1];
    const archivo = `${familia.toLowerCase().replace(/\s+/g, '-')}-${estilo === 'italic' ? 'cursiva-' : ''}${peso.replace(' ', '-')}.woff2`;
    await writeFile(path.join(dir, archivo), Buffer.from(await (await fetch(url)).arrayBuffer()));
    salida += b.replace(/url\(https:[^)]+\)/, `url(letras/${archivo})`).replace(/\s*\n\s*/g, '') + '\n';
    n++;
  }
  await writeFile(path.join(dir, 'letras.css'), salida);
  console.log(`${molde}: ${n} archivo(s) en moldes/${molde}/letras/`);
}
