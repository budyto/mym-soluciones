#!/usr/bin/env python3
"""Arma la cortina de fondo de los videos de la propuesta: voz/cortina.m4a.

Es música hecha acá, con cuentas (un colchón de acordes, un bajo, un arpegio y una percusión suave): no usa
grabaciones ni melodías de nadie, así que no tiene derechos de terceros. Dura 56 segundos; hacer-voz.py la corta
al largo de cada video, la baja cuando habla la voz y la mezcla.

Si se quiere otra música, alcanza con reemplazar voz/cortina.m4a por otra pista (con licencia para uso comercial)
y volver a correr hacer-voz.py y hacer-videos.mjs.

Qué hace falta: numpy, soundfile y ffmpeg.   Cómo se corre:  python propuesta/videos/src/hacer-cortina.py
"""
import pathlib, subprocess, tempfile
import numpy as np, soundfile as sf

ACA = pathlib.Path(__file__).resolve().parent
SR, PULSO, DURA = 44100, 60 / 96, 56.0          # 96 pulsos por minuto
COMPAS = PULSO * 4
rng = np.random.default_rng(369)                # siempre sale la misma pista

def hz(nota):                                   # número de nota MIDI a frecuencia
    return 440.0 * 2 ** ((nota - 69) / 12)

# Do con novena, La menor séptima, Fa con séptima mayor, Sol con cuarta: una vuelta de 4 compases, tranquila y luminosa
ACORDES = [(36, [60, 64, 67, 74]), (33, [57, 60, 64, 67]), (29, [57, 60, 64, 65]), (31, [55, 60, 62, 67])]

n = int(DURA * SR)
izq, der = np.zeros(n), np.zeros(n)

def poner(pista, desde, sonido, vol=1.0):
    a = int(desde * SR)
    if a >= n: return
    s = sonido[: n - a]
    pista[a:a + len(s)] += s * vol

def tono(f, dura, armonicos=(1.0,)):
    t = np.arange(int(dura * SR)) / SR
    return sum(a * np.sin(2 * np.pi * f * (i + 1) * t) for i, a in enumerate(armonicos)), t

def suave(x, k):                                # pasa-bajos sencillo: promedio móvil
    return np.convolve(x, np.ones(k) / k, mode='same')

compases = int(np.ceil(DURA / COMPAS))
for c in range(compases):
    bajo, notas = ACORDES[c % 4]
    t0 = c * COMPAS
    # Colchón: cada nota del acorde, con entrada y salida lentas, apenas desafinada entre los dos lados
    for nota in notas:
        for pista, des in ((izq, 0.997), (der, 1.003)):
            s, t = tono(hz(nota) * des, COMPAS + 0.9, (1.0, 0.28, 0.10, 0.04))
            env = np.minimum(t / 0.55, 1) * np.minimum((t[-1] - t) / 0.9, 1)
            poner(pista, t0, s * env, 0.050)
    # Bajo: en el primer tiempo y un toque antes del tercero
    for cuando, largo in ((0, 1.4), (2.5, 1.2)):
        s, t = tono(hz(bajo), PULSO * largo, (1.0, 0.35, 0.08))
        s = s * np.minimum(t / 0.012, 1) * np.exp(-t * 2.6)
        poner(izq, t0 + cuando * PULSO, s, 0.30); poner(der, t0 + cuando * PULSO, s, 0.30)
    # Arpegio: las notas del acorde, una octava arriba, en corcheas, con un eco que va de lado a lado
    orden = [0, 2, 1, 3, 2, 1, 3, 2]
    for i, k in enumerate(orden):
        if c < 1: break                         # el primer compás arranca sólo con el colchón
        s, t = tono(hz(notas[k] + 12), 0.9, (1.0, 0.22, 0.06))
        s = s * np.minimum(t / 0.004, 1) * np.exp(-t * 6.5)
        cuando = t0 + i * PULSO / 2
        a, b = (izq, der) if i % 2 == 0 else (der, izq)
        poner(a, cuando, s, 0.085); poner(b, cuando, s, 0.045)
        poner(b, cuando + PULSO * 0.75, s, 0.035); poner(a, cuando + PULSO * 1.5, s, 0.016)
    # Percusión suave, desde el tercer compás: bombo en 1 y 3, un chasquido en 2 y 4 y un roce en corcheas
    if c >= 2:
        for p in (0, 2):
            t = np.arange(int(0.26 * SR)) / SR
            s = np.sin(2 * np.pi * (48 * t + (115 - 48) * (1 - np.exp(-t * 34)) / 34)) * np.exp(-t * 15)
            poner(izq, t0 + p * PULSO, s, 0.34); poner(der, t0 + p * PULSO, s, 0.34)
        for p in (1, 3):
            t = np.arange(int(0.11 * SR)) / SR
            s = suave(np.diff(rng.standard_normal(len(t) + 1)), 6) * np.exp(-t * 46)
            poner(izq, t0 + p * PULSO, s, 0.10); poner(der, t0 + p * PULSO, s, 0.12)
        for i in range(8):
            t = np.arange(int(0.05 * SR)) / SR
            s = np.diff(rng.standard_normal(len(t) + 1)) * np.exp(-t * 95)
            poner(izq if i % 2 else der, t0 + i * PULSO / 2, s, 0.022 if i % 2 else 0.012)

pista = np.stack([izq, der], axis=1)
pista = suave(pista[:, 0], 3)[:, None] * [1, 0] + suave(pista[:, 1], 3)[:, None] * [0, 1]   # le saca el filo a lo agudo
pista = np.tanh(pista * 1.6)
pista *= 0.7 / np.max(np.abs(pista))
f = int(0.4 * SR); pista[:f] *= np.linspace(0, 1, f)[:, None]; pista[-f:] *= np.linspace(1, 0, f)[:, None]

with tempfile.TemporaryDirectory() as d:
    wav = pathlib.Path(d) / 'cortina.wav'
    sf.write(wav, pista.astype(np.float32), SR)
    salida = ACA / 'voz' / 'cortina.m4a'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(wav), '-ar', '48000', '-c:a', 'aac', '-b:a', '160k', str(salida)], check=True)
print('cortina lista:', salida, f'({DURA:g} s)')
