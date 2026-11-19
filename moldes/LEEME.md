# Moldes de landing de MyM Soluciones

19/11/2026 · Armado por Claude por decisión de Budy del 19/11 («dos o tres moldes por tipo de negocio; armá varias, yo las apruebo»). **Estado: 🟡 a la espera de la aprobación de Budy. Nada de esto está publicado.**

Cada cliente es **un archivo de datos** (`cliente.js`) y una carpeta de fotos. Nadie escribe el HTML de un cliente. Un cambio legal o de diseño se hace una vez en el molde y se vuelven a generar todas las landings con un comando.

## Los tres moldes

| Molde | Para quién | Lo que lo distingue |
| --- | --- | --- |
| `servicio` | Plomero, electricista, gasista, técnico, cerrajero | Abre con una pregunta («¿Qué te está pasando?»): la persona toca su problema y el WhatsApp sale con ese mensaje escrito. En el celular, barra fija con «Llamar» y «WhatsApp». Claro, letra de cartel de oficio |
| `local` | Ferretería, corralón, bazar, comercio | El centro es el catálogo: se marcan cantidades y el pedido sale por WhatsApp agrupado por rubro. «Abierto ahora», uno o varios locales, opiniones reales. Fondo profundo, letra condensada de cartel |
| `turnos` | Peluquería, estética, consultorio | Carta de servicios con duración y precio; la persona marca lo que quiere, el día y el momento, y sale el pedido de turno. Centrado, letra con serifa, foto en arco |

Los colores, el logo y las fotos salen de la ficha del cliente. La letra y la composición son del molde.

## Cómo se saca una landing

```bash
node moldes/generar.mjs --nuevo ferreteria-lopez local
```

Eso crea `moldes/clientes/ferreteria-lopez/cliente.js` con todos los campos y, al lado de cada uno, la pregunta del cuestionario de pedido de donde sale (bloques C, W y L de `grupo-mym/docs/soluciones/2026-11-16-Cuestionarios-de-pedido.md`). Se llena, se ponen las fotos en `fotos/` y:

```bash
node moldes/generar.mjs ferreteria-lopez
```

La página queda en `muestras/ferreteria-lopez/` y se abre con doble clic en `index.html`. Para regenerar todas después de un cambio en un molde:

```bash
node moldes/generar.mjs --todos
```

Hace falta Node 18 o más. No hay nada que instalar.

### Demo y final

- `estado: 'demo'`: sale con la cinta de muestra, sin indexar en Google y sin medición. Los datos que faltan aparecen marcados en amarillo y el generador los lista. Si no hay número de WhatsApp, los botones muestran cómo llegaría el mensaje y no mandan nada.
- `estado: 'final'`: **no se genera si falta un solo dato obligatorio**. Suma `robots.txt`, `sitemap.xml` y un `.htaccess` con caché. La carpeta generada se sube tal cual al hosting **del dominio del cliente** (`--salida` permite elegir dónde dejarla).

## Lo que ya está resuelto una sola vez

Todo esto vive en `moldes/nucleo/` y lo llevan las tres plantillas:

- **WhatsApp:** todos los botones abren el número del cliente con el mensaje ya escrito y funcionan aunque no cargue el JavaScript.
- **Botón de arrepentimiento y botón de baja:** con el nombre exacto que fija la Disposición 954/2025 («BOTÓN DE ARREPENTIMIENTO» y «BOTÓN DE BAJA DE SERVICIO»), destacados en el pie de la página de inicio (decisión de Budy del 19/11: sólo en el pie; con `legal.botonesArriba: true` en la ficha vuelven a salir también arriba de todo). 🔴 La norma pide «a simple vista, en lugar destacado y en el primer acceso»: que el pie alcance lo tiene que confirmar la abogada. Cada uno lleva a un formulario sin registro que da el código del trámite en el momento y lo manda al WhatsApp o al mail del cliente. Texto de la norma abierto el 19/11/2026 en `argentina.gob.ar/normativa/nacional/norma-417152/texto`.
- **Responsable del sitio:** razón social, CUIT y domicilio **del cliente** en el pie, con el canal y el horario de reclamos (art. 6 de la misma disposición). El generador rechaza una ficha que traiga los datos de MyM y revisa el dígito verificador del CUIT.
- **Política de privacidad** (Ley 25.326) con las dos leyendas obligatorias, armada con los datos del cliente y con lo que la página hace de verdad (si tiene medición o no).
- **Medición:** Google Analytics y píxel de Meta, sólo si la ficha trae los ids y sólo después de que la persona acepta el aviso de cookies. Eventos con el mismo nombre en todas las landings (`clic_whatsapp`, `clic_llamar`, `enviar_pedido`, `pedir_turno`, `tramite`), para poder comparar un cliente con otro.
- **Carga rápida:** una hoja de estilo y un script por página (entre 26 y 30 KB sin comprimir entre los dos), la foto principal con prioridad, el resto con carga diferida, y los videos no se bajan hasta que entran en pantalla.
- **Celular primero:** probado a 375 px, sin desborde lateral y con todos los botones de 44 px o más.
- **Accesibilidad:** el generador calcula los tonos a partir de los dos colores del cliente para que el texto siempre se lea (contraste AA), foco visible, respeta «menos movimiento».
- **Google:** título, descripción, datos del negocio (`LocalBusiness`), imagen al compartir.

### Controles que frenan una ficha

- Frases que prometen resultados o inventan urgencia: «garantizado», «100 %», «sin riesgo», «el mejor», «número uno», «últimos lugares», «solo hoy» (Ley 24.240 y DNU 274/2019).
- El emoji de robot.
- Opiniones sin fuente, sin fecha o sin la confirmación de que son reales; para publicar, además, el permiso guardado.
- Precios sin la fecha a la que valen; promociones sin inicio, fin y condiciones.
- En un consultorio, un profesional sin matrícula.
- Fotos que la ficha nombra y no están en la carpeta, e imágenes sin texto alternativo.

## Qué hay en la carpeta

```
moldes/
  generar.mjs            el comando
  nucleo/                lo común: legal, WhatsApp, medición, pie, base de estilo
  servicio/ local/ turnos/
    molde.mjs            la página
    molde.css            el diseño
    molde.js             lo que se mueve (selector, catálogo, turno)
    ficha-en-blanco.js   la ficha vacía con las preguntas
  clientes/
    plomeria-mansilla/   ficha + fotos (molde servicio)
    hierros-walter/      ficha + fotos (molde local)
    estudio-alma/        negocio inventado (molde turnos)
    electricista-ejemplo/ negocio inventado (molde servicio; fue la prueba cronometrada)
muestras/                lo generado, para mirar y aprobar
```

`moldes/` tiene un `.htaccess` que impide que se sirva por la web: las fichas son material de trabajo.

## Las dos landings hechas a mano, rehechas con el molde

Las originales siguen intactas en `demos/` (los links que ya se mandaron a los clientes no cambian).

**Plomería Mansilla (molde `servicio`).** Están todos los textos, las 21 fotos y videos, los 6 servicios, la galería, los 3 pasos, el mapa, las 4 preguntas y las redes. Lo que cambió o se perdió:
- La segunda línea de los titulares ya no va en naranja y cursiva; el titular va en un solo color.
- El nombre en dos colores del encabezado («PLOMERÍA» azul, «MANSILLA» naranja) pasó a un solo color. Se recupera cuando pasen el logo.
- El recuadro «+10» sobre la foto pasó a ser un dato en la franja de abajo del inicio.
- Los tres íconos con emoji (★ 📍 🛠) pasaron a tildes dibujadas.
- El botón «Ver trabajos» del inicio lo reemplazó el selector de problemas; «Trabajos» sigue en el menú.
- La galería pasó de grilla de 4 a una tira que se desliza.
- Los 10 videos ya no arrancan todos juntos: cada uno se baja y arranca cuando se ve.

**Hierros Walter y Todo Durlock (molde `local`).** Están los dos locales, los 12 productos con sus fotos, los filtros, el pedido agrupado por local, los 4 pasos, las 3 opiniones con su foto, el puntaje, «abierto ahora», el mapa, los horarios y las preguntas. Lo que cambió o se perdió:
- La vista previa del WhatsApp tenía dos respuestas de ejemplo distintas (una para el pedido y otra para la consulta); ahora hay una sola.
- Los títulos tenían una parte en rojo y un rótulo arriba; ahora van en un solo color con una barra al costado.
- Los créditos de las fotos se leían de un archivo; ahora van escritos en la ficha.
- El pie decía «Demo preparada por MyM Soluciones»; ahora dice «Sitio hecho por MyM Soluciones» (se puede apagar con `creditoMym: false`).
- El resplandor del fondo del inicio.

**Lo que las dos originales no tenían y ahora tienen:** los botones legales, el pie con el responsable, la política de privacidad, los trámites con código y los datos para Google. A las dos les faltan datos del cliente para poder publicarse (CUIT, domicilio, mail, dominio y el permiso de fotos); el generador los lista.

## Cuánto lleva sacar una landing nueva

Prueba del 19/11/2026 con un negocio inventado (`electricista-ejemplo`, molde `servicio`), hecha por Claude con los datos ya definidos:

| Paso | Tiempo |
| --- | --- |
| Crear la ficha, llenarla, poner las fotos y generar | 26 segundos de reloj |
| Lo anterior más la revisión en celular y en computadora | 37 segundos de reloj |
| Generar la página (lo que tarda el comando) | entre 60 y 150 milésimas de segundo |

**Cómo leer este número:** mide a Claude llenando la ficha con datos inventados y sin esperar a nadie. **No mide a una persona.** La ficha de esa prueba tiene unos 80 renglones y cerca de 670 palabras; una persona que la tipea sola, con las respuestas del cuestionario al lado, va a tardar bastante más. 🔴 Falta medirlo con Nappe y un cliente real, que es el número que sirve para el plan de 30 clientes. Tampoco incluye juntar los datos y las fotos del cliente, que hoy es lo que más demora.

## Lo que falta o no se pudo verificar

- 🔴 **Aprobación de Budy** de los tres diseños.
- 🔴 **PageSpeed en celular:** no se midió; hace falta una dirección de prueba pública. El plan pedía 90 o más.
- 🔴 **Revisión legal:** los textos de los trámites y de la privacidad son una lectura de Claude de la Disposición 954/2025 y de la Ley 25.326, no un dictamen. Falta que los mire la abogada. Tampoco se verificaron normas de la Ciudad ni de la Provincia de Buenos Aires sobre los mismos botones.
- 🔴 **El código del trámite se genera en el navegador** y llega al cliente dentro del mensaje. No queda guardado en ningún servidor: si el cliente necesita registro propio, hay que sumarlo.
- 🟡 **Fotos:** el generador no achica ni convierte imágenes; se suben ya livianas. Las letras se cargan desde Google Fonts (podrían alojarse en el sitio para ganar velocidad).
- 🟡 **Molde `turnos`:** se probó sólo con un negocio inventado y fotos de relleno. Falta un cliente real y, si es un consultorio, que el profesional apruebe los textos.
- 🟡 **Modo oscuro automático**, formulario de contacto con base de datos, carrito con precios y simulador: estaban en el plan del 13/11 y no se hicieron.
