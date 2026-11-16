#!/usr/bin/env python3
"""Voz de los videos de la propuesta de MyM Soluciones.

Lee guiones-de-voz.md, toma la voz de cada tramo, le da a cada tramo de la animación el tiempo que necesita
la voz (reescribe los tiempos de <plan>.html) y deja la pista completa, con el volumen parejo, en voz/<plan>.m4a.
Después se corre hacer-videos.mjs.

Dos fuentes de voz:
  --fuente elevenlabs (la que se usa desde el 16/11/2026): voz «Mauricio - Publicidad cálida | Argentina» de la
    biblioteca de ElevenLabs (voice_id jIgvw3W75cbd6IP0JYwL, modelo eleven_v4). No es la voz de nadie del equipo.
    Lee un MP3 por tramo de voz/elevenlabs/<plan>-<n>.mp3, generado con el texto del tramo tal cual está en el guion
    (una generación por tramo). Si un tramo dice lo mismo que otro ya generado (la prueba gratis de cinco planes),
    se reusa ese MP3. La voz va a velocidad normal (1,00×). Sólo si el video pasara de 51 s, se acelera la voz de todo el video lo mínimo necesario,
    hasta 1,04× (atempo de ffmpeg: no cambia el tono). Si ni así entra, avisa.
  --fuente kokoro: voz sintética de Kokoro (ef_dora), sin internet. Lo de abajo es sólo para esta fuente.

Qué hace falta para Kokoro (una vez):
  pip install kokoro-onnx soundfile numpy        (y ffmpeg instalado)
  Los dos archivos del modelo, de los «releases» de github.com/thewh1teagle/kokoro-onnx (model-files-v1.0):
  kokoro-v1.0.onnx y voices-v1.0.bin, en una carpeta aparte (fuera del repo).
Cómo se corre:
  python3 propuesta/videos/src/hacer-voz.py                                         -> los 8, con ElevenLabs
  python3 propuesta/videos/src/hacer-voz.py redes-premium                           -> uno solo
  KOKORO=/ruta/a/esa/carpeta python3 propuesta/videos/src/hacer-voz.py --fuente kokoro [plan]
Cómo se piensan los tiempos: cada página tiene en <body> data-base (lo mínimo que dura cada tramo de la animación)
y data-tramos (dónde empieza cada tramo hoy). Cada tramo dura lo que pide su voz, nunca menos que su mínimo,
y todos los --in, --out y --foco de la página se corren en proporción. Ningún video puede pasar de 51 segundos (tope subido el 16/11/2026 para la voz de ElevenLabs; antes era 45).
"""
import hashlib, json, os, pathlib, re, subprocess, sys
import numpy as np, soundfile as sf

ACA = pathlib.Path(__file__).resolve().parent
FUENTE = 'elevenlabs'
if '--fuente' in sys.argv:
    i = sys.argv.index('--fuente'); FUENTE = sys.argv[i + 1]; del sys.argv[i:i + 2]
if FUENTE not in ('elevenlabs', 'kokoro'): sys.exit('--fuente tiene que ser elevenlabs o kokoro')
VOZ, IDIOMA, VELOCIDAD = 'ef_dora', 'es-419', float(os.environ.get('VELOCIDAD', '1.1'))
ONCE = {'voz': 'Mauricio - Publicidad cálida | Argentina', 'voice_id': 'jIgvw3W75cbd6IP0JYwL', 'modelo': 'eleven_v4'}
ACELERAR_MAX = 1.04   # lo más que se puede apurar la voz de ElevenLabs para entrar en el tope (normal: 1,00×)
ANTES, DESPUES, COLA, TOPE = 0.35, 0.40, 1.2, 51.0   # aire antes y después de cada tramo, cola del final, duración máxima
SR = 24000 if FUENTE == 'kokoro' else 44100        # la de ElevenLabs viene a 44,1 kHz: no se baja de calidad
# Cómo se le escriben al motor las palabras que no son del español
DICHO = [(r'WhatsApp Business', 'guátsap bísnes'), (r'WhatsApp', 'guátsap'), (r'\breels\b', 'rils'), (r'\breel\b', 'ril'),
         (r'\blanding\b', 'landin'), (r'\bstock\b', 'estoc'), (r'YouTube Shorts', 'iutub shorts'), (r'TikTok', 'tic toc'),
         (r'Facebook', 'feisbuc'), (r'Premium', 'prémium')]

def guiones():
    planes, plan = {}, None
    for l in (ACA / 'guiones-de-voz.md').read_text(encoding='utf-8').splitlines():
        m = re.match(r'^## ([a-z0-9-]+) · (.+)$', l)
        if m: plan = m.group(1); planes[plan] = {'titulo': m.group(2), 'tramos': []}; continue
        m = re.match(r'^\d+\. \*\*(.+?)\*\* (.+)$', l)
        if m and plan: planes[plan]['tramos'].append((m.group(1).rstrip('.'), m.group(2).strip()))
    return planes

_k = None
def decir(texto, cache):
    """Devuelve el audio del tramo (sin silencios en las puntas), usando lo ya generado si el texto no cambió."""
    global _k
    hablado = texto
    for de, a in DICHO: hablado = re.sub(de, a, hablado)
    f = cache / (hashlib.sha1(f'{VOZ}|{IDIOMA}|{VELOCIDAD}|raya|{hablado}'.encode()).hexdigest()[:16] + '.wav')
    if not f.exists():
        if _k is None:
            from kokoro_onnx import Kokoro
            d = pathlib.Path(os.environ.get('KOKORO', '.'))
            _k = Kokoro(str(d / 'kokoro-v1.0.onnx'), str(d / 'voices-v1.0.bin'))
        # Cada oración se genera aparte y se une con una pausa: así el motor no se come finales ni apura las pausas
        partes = []
        for o in re.findall(r'[^.!?]+[.!?]+', hablado + ('' if hablado[-1] in '.!?' else '.')):
            # La raya del principio le da al motor un respiro: sin ella deforma la primera sílaba («Redes», «Vos», «Arranca»)
            s, sr = _k.create('— ' + o.strip(), voice=VOZ, speed=VELOCIDAD, lang=IDIOMA)
            assert sr == SR
            partes += [recortar(s), np.zeros(int(0.28 * SR), dtype=np.float32)]
        sf.write(f, np.concatenate(partes[:-1]), SR)
    s, _ = sf.read(f, dtype='float32')
    return s

def leer_mp3(f, tempo=1.0):
    """Decodifica el MP3 a mono, a SR, y si hace falta lo acelera sin cambiar el tono (atempo)."""
    filtro = ['-af', f'atempo={tempo:.4f}'] if abs(tempo - 1) > 1e-6 else []
    crudo = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(f), *filtro, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                           capture_output=True, check=True).stdout
    return np.frombuffer(crudo, dtype=np.float32).copy()

def mp3_del_tramo(planes, plan, n):
    """voz/elevenlabs/<plan>-<n>.mp3; si no está y otro tramo dice exactamente lo mismo, usa el de ese tramo."""
    carpeta = ACA / 'voz' / 'elevenlabs'
    f = carpeta / f'{plan}-{n}.mp3'
    if f.exists(): return f
    texto = planes[plan]['tramos'][n - 1][1]
    for otro, d in planes.items():
        for m, (_, t) in enumerate(d['tramos'], 1):
            if t == texto and (carpeta / f'{otro}-{m}.mp3').exists(): return carpeta / f'{otro}-{m}.mp3'
    sys.exit(f'{plan}: falta la voz del tramo {n} ({f.name}). Generala en ElevenLabs con el texto del guion.')

def recortar(s, umbral=0.012):
    act = np.where(np.abs(s) > umbral)[0]
    a, b = max(act[0] - int(0.03 * SR), 0), min(act[-1] + int(0.08 * SR), len(s))
    s = s[a:b].copy(); n = int(0.012 * SR)
    s[:n] *= np.linspace(0, 1, n); s[-n:] *= np.linspace(1, 0, n)
    return s.astype(np.float32)

def retocar_pagina(plan, durs):
    f = ACA / f'{plan}.html'; h = f.read_text(encoding='utf-8')
    base = [float(x) for x in re.search(r'data-base="([^"]+)"', h).group(1).split(',')]
    viejo = [float(x) for x in re.search(r'data-tramos="([^"]+)"', h).group(1).split(',')]
    if len(base) != len(durs): sys.exit(f'{plan}: el guion tiene {len(durs)} tramos y la página {len(base)}')
    largo = [max(b, round(ANTES + d + (COLA if i == len(durs) - 1 else DESPUES), 1)) for i, (b, d) in enumerate(zip(base, durs))]
    nuevo = [0.0]
    for x in largo: nuevo.append(round(nuevo[-1] + x, 1))
    def mapa(t):
        for i in range(len(base)):
            if t <= viejo[i + 1] or i == len(base) - 1:
                return round(nuevo[i] + (t - viejo[i]) * (nuevo[i + 1] - nuevo[i]) / (viejo[i + 1] - viejo[i]), 2)
    h = re.sub(r'--(in|out|foco):\s*([\d.]+)s', lambda m: f'--{m.group(1)}:{mapa(float(m.group(2))):g}s', h)
    h = re.sub(r'data-tramos="[^"]+"', 'data-tramos="' + ','.join(f'{x:g}' for x in nuevo) + '"', h)
    h = re.sub(r'data-dur="[^"]+"', f'data-dur="{nuevo[-1]:g}"', h)
    return nuevo, f, h

def main():
    planes = guiones()
    pedidos = sys.argv[1:] or list(planes)
    cache = pathlib.Path(os.environ.get('CACHE_VOZ', '/tmp/voz-propuesta')); cache.mkdir(parents=True, exist_ok=True)
    (ACA / 'voz').mkdir(exist_ok=True)
    resumen = json.loads((ACA / 'voz' / 'tramos.json').read_text()) if (ACA / 'voz' / 'tramos.json').exists() else {}
    mal = False
    for plan in pedidos:
        tempo, origen = 1.0, []
        if FUENTE == 'kokoro':
            audios = [decir(t, cache) for _, t in planes[plan]['tramos']]
        else:
            origen = [mp3_del_tramo(planes, plan, n) for n in range(1, len(planes[plan]['tramos']) + 1)]
            base = [recortar(leer_mp3(f)) for f in origen]
            # Lo mínimo que hay que apurar la voz (de a 1 %, hasta 1,08×) para que el video no pase de 45 s
            while retocar_pagina(plan, [len(a) / SR / tempo for a in base])[0][-1] > TOPE and tempo < ACELERAR_MAX - 1e-9:
                tempo = round(min(tempo + 0.01, ACELERAR_MAX), 2)
            audios = base if tempo == 1.0 else [recortar(leer_mp3(f, tempo)) for f in origen]
        durs = [len(a) / SR for a in audios]
        lim, archivo, pagina = retocar_pagina(plan, durs)
        if lim[-1] > TOPE:
            print(f'{plan}: quedaría de {lim[-1]} s y el tope es {TOPE} s' + (f' (voz ya acelerada {tempo:g}×)' if tempo != 1.0 else '') +
                  '. Acortá el guion. Voz de cada tramo:', [round(d, 1) for d in durs]); mal = True; continue
        archivo.write_text(pagina, encoding='utf-8')
        pista = np.zeros(int(lim[-1] * SR), dtype=np.float32)
        filas = []
        for i, (a, d) in enumerate(zip(audios, durs)):
            desde = lim[i] + ANTES
            if desde + d > lim[i + 1]: sys.exit(f'{plan}: la voz del tramo {i + 1} no entra')
            p = int(desde * SR); pista[p:p + len(a)] += a
            filas.append({'tramo': i + 1, 'se_ve': planes[plan]['tramos'][i][0], 'pantalla_desde': lim[i], 'pantalla_hasta': lim[i + 1],
                          'pantalla_dura': round(lim[i + 1] - lim[i], 2), 'voz_desde': round(desde, 2), 'voz_dura': round(d, 2),
                          'aire_al_final': round(lim[i + 1] - desde - d, 2)})
        crudo = cache / f'{plan}-crudo.wav'; sf.write(crudo, pista, SR)
        # Volumen parejo entre todos los videos: se mide y se lleva a -16 LUFS (loudnorm de ffmpeg, en dos pasadas)
        r = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(crudo), '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'],
                           capture_output=True, text=True).stderr
        m = json.loads(r[r.rindex('{'):r.rindex('}') + 1])
        filtro = (f"loudnorm=I=-16:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
                  f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true,aresample=48000")
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(crudo), '-af', filtro, '-ac', '2', '-c:a', 'aac', '-b:a', '128k',
                        '-t', f'{lim[-1]:g}', str(ACA / 'voz' / f'{plan}.m4a')], check=True)
        if FUENTE == 'kokoro':
            resumen[plan] = {'dura': lim[-1], 'fuente': 'kokoro', 'voz': VOZ, 'idioma': IDIOMA, 'velocidad': VELOCIDAD, 'tramos': filas}
        else:
            for x, f in zip(filas, origen): x['mp3'] = f.name
            resumen[plan] = {'dura': lim[-1], 'fuente': 'elevenlabs', **ONCE, 'velocidad': tempo, 'tramos': filas}
        print(f"\n{plan}: {lim[-1]:g} s" + (f" · voz acelerada {tempo:g}×" if tempo != 1.0 else ''))
        for x in filas: print(f"  {x['tramo']}. {x['se_ve'][:38]:38} pantalla {x['pantalla_desde']:5.1f}–{x['pantalla_hasta']:5.1f} ({x['pantalla_dura']:4.1f} s) · voz {x['voz_dura']:5.2f} s · aire {x['aire_al_final']:.2f} s")
    (ACA / 'voz' / 'tramos.json').write_text(json.dumps(resumen, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    if mal: sys.exit(1)

if __name__ == '__main__':
    main()
