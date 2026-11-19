# Guiones de voz de los videos de la propuesta

Un guion por video, partido en tramos: cada tramo se dice mientras se ve esa parte de la animación.
Este archivo es la fuente de la voz: `hacer-voz.py` lo lee, genera el audio de cada tramo, le da a cada tramo
de la animación el tiempo que necesita la voz y deja la pista en `voz/<plan>.m4a`. Después `hacer-videos.mjs` arma el MP4 con esa pista.

- **Voz:** ElevenLabs, voz «Mauricio - Publicidad cálida | Argentina» de su biblioteca (`voice_id` `jIgvw3W75cbd6IP0JYwL`, modelo `eleven_v4`), a velocidad normal. No es la voz de nadie del equipo.
  Se genera un MP3 por tramo, con el texto del tramo tal cual está acá, y se guarda en `voz/elevenlabs/<plan>-<n>.mp3`. Si se cambia un tramo, hay que regenerar sólo ese MP3.
- **Duración:** ningún video puede pasar de 51 segundos (tope subido el 16/11/2026 para esta voz; antes era 45).
- **Cómo se escribe:** como se dice (vale para ElevenLabs y para Kokoro). Los números en letras, «MyM» como «eme y eme», «CRM» como «ce erre eme» e «IA» como «inteligencia artificial».
  Las palabras en inglés (WhatsApp, reels, landing, stock, YouTube Shorts) se escriben normal: ElevenLabs las dice bien así (verificado el 16/11/2026);
  para Kokoro, `hacer-voz.py` tiene la lista de cómo se pronuncian.
- **Precios y cantidades:** los de `propuesta/index.html` al 16/11/2026. Si cambian en la web, se cambian acá, en la página animada y se rehace el video.
- **Sin promesas:** nada de cantidades de seguidores, ventas, alcance, consultas ni ahorro. La única urgencia es la fecha real de cada promoción.
- **Vence el 30/11/2026:** la prueba gratis de 15 días (Bot, Seguimiento, Paquete completo y los tres de Redes) y la instalación a mitad de precio
  (Paquete completo, Orquestador y Empresa en automático). **El 1/12/2026 hay que sacar esas oraciones (y sus líneas en pantalla) y rehacer los 8 videos.**
- Formato de cada tramo: `N. **Qué se ve.** Lo que dice la voz.` (una sola línea por tramo).

## bot-de-whatsapp · Bot de WhatsApp

1. **Portada.** Bot de WhatsApp, de eme y eme Soluciones. Responde al instante y agenda.
2. **Chat: responde con precios y horarios.** Responde con tus precios y horarios, a cualquier hora.
3. **Chat: califica y agenda.** Califica al cliente y agenda turnos o visitas.
4. **Chat: pasa a una persona.** Y pasa la charla a una persona cuando hace falta.
5. **Qué incluye.** Todo, con la conexión oficial de WhatsApp Business.
6. **Precio.** La instalación sale noventa y nueve mil novecientos pesos. Después, treinta y nueve mil novecientos por mes, sin permanencia.
7. **Prueba gratis y contacto.** Empezando hasta el treinta de noviembre, tenés quince días de prueba totalmente gratis: no pagás nada al empezar y, si no te sirve, no debés nada. Escribinos por WhatsApp.

## seguimiento-de-clientes · Seguimiento de clientes

1. **Portada.** Seguimiento de clientes, de eme y eme Soluciones.
2. **Chat: el cliente no contesta más.** Le vuelve a escribir al que preguntó y no compró.
3. **Chat: días 1, 3 y 7.** Solo, al día uno, al día tres y al día siete.
4. **Planilla con estados.** Cada contacto queda en una planilla o en un ce erre eme, con su estado.
5. **Aviso.** Y te avisa cuando alguien está listo para comprar.
6. **Qué incluye.** Incluye también un resumen semanal de lo que entró.
7. **Precio.** La instalación sale cuarenta y nueve mil novecientos pesos. Después, veinticuatro mil novecientos por mes, sin permanencia.
8. **Prueba gratis y contacto.** Empezando hasta el treinta de noviembre, tenés quince días de prueba totalmente gratis: no pagás nada al empezar y, si no te sirve, no debés nada. Escribinos por WhatsApp.

## paquete-completo · Paquete completo

1. **Portada.** Paquete completo, de eme y eme Soluciones.
2. **Paso 1: landing.** Primero, una landing de ventas con botón a WhatsApp.
3. **Paso 2: bot.** Después, el bot responde al instante y agenda.
4. **Paso 3: seguimiento.** Y el seguimiento le vuelve a escribir al que no compró.
5. **Qué incluye.** Incluye las tres cosas, con una sola puesta en marcha.
6. **Precio.** La instalación sale doscientos diecinueve mil novecientos pesos. Después, sesenta y cuatro mil novecientos por mes, sin permanencia.
7. **Promoción de instalación.** Hasta el treinta de noviembre de dos mil veintiséis, la instalación queda en sesenta y cuatro mil novecientos cincuenta pesos.
8. **Prueba gratis y contacto.** Y empezando hasta esa fecha, tenés quince días de prueba totalmente gratis: no pagás nada al empezar y, si no te sirve, no debés nada. Escribinos por WhatsApp.

## orquestador · Orquestador

1. **Portada.** El Orquestador, de eme y eme Soluciones. Agentes que proponen; vos aprobás.
2. **Agentes y propuestas.** Hasta tres agentes miran tu operación y te proponen qué hacer.
3. **Vos aprobás.** Vos aprobás desde el celular, con un sí o con un no.
4. **Se ejecuta y queda registro.** Y recién ahí se ejecuta. Queda registro de cada acción.
5. **Qué incluye.** Incluye el relevamiento de tus procesos y hasta tres agentes a medida. Arranca en modo espectador.
6. **Precio.** La instalación sale desde doscientos cuarenta y nueve mil novecientos pesos. Después, sesenta y nueve mil novecientos por mes, sin permanencia.
7. **Promoción de instalación y contacto.** Hasta el treinta de noviembre de dos mil veintiséis, la instalación sale desde ciento veinticuatro mil novecientos cincuenta pesos. Escribinos por WhatsApp.

## empresa-en-automatico · Empresa en automático

1. **Portada.** Empresa en automático, de eme y eme Soluciones: todo conectado.
2. **El bot atiende.** El bot atiende a cada cliente que escribe.
3. **El seguimiento insiste.** El seguimiento insiste con los que no compraron.
4. **El orquestador coordina.** El orquestador coordina y te propone qué hacer.
5. **Vos aprobás.** Y vos aprobás desde el celular.
6. **Qué incluye.** Incluye el orquestador, la landing, el bot de WhatsApp y el seguimiento, con una sola puesta en marcha.
7. **Precio.** La instalación sale desde trescientos veintinueve mil novecientos pesos. Después, noventa y nueve mil novecientos por mes, sin permanencia.
8. **Promoción de instalación y contacto.** Hasta el treinta de noviembre de dos mil veintiséis, la instalación sale desde ciento sesenta y cuatro mil novecientos cincuenta pesos. Escribinos por WhatsApp.

## redes-esencial · Redes en automático · Esencial

1. **Portada.** Redes en automático, plan Esencial, de eme y eme Soluciones. Para empezar a publicar con constancia y método.
2. **Calendario del mes.** Armamos el calendario del mes: cuatro reels animados, cuatro carruseles y veinte historias al mes, en Instagram y Facebook.
3. **Los tres pasos.** Cada pieza sigue tres pasos: gancho, retención y conversión.
4. **Qué incluye.** Incluye la estrategia del mes, la respuesta automática a los comentarios y un reporte mensual.
5. **Precio.** Cuesta doscientos cincuenta mil pesos por mes, sin permanencia. Vos aprobás cada pieza antes de que salga.
6. **Prueba gratis y contacto.** Empezando hasta el treinta de noviembre, tenés quince días de prueba totalmente gratis: no pagás nada al empezar y, si no te sirve, no debés nada. Escribinos por WhatsApp.

## redes-profesional · Redes en automático · Profesional

1. **Portada.** Redes en automático, plan Profesional, de eme y eme Soluciones. Es el plan recomendado.
2. **La semana.** Dos reels por semana e historias todos los días: ocho reels animados por mes y de ocho a doce carruseles.
3. **Tablero de ganchos.** Cada semana medimos qué gancho retiene más, y repetimos lo que funciona.
4. **Qué incluye.** Incluye todo lo del Esencial, historias de comunidad con encuestas y preguntas, y programación a la hora pico.
5. **Precio.** Cuesta cuatrocientos mil pesos por mes, sin permanencia. Vos aprobás cada pieza antes de que salga.
6. **Prueba gratis y contacto.** Empezando hasta el treinta de noviembre, tenés quince días de prueba totalmente gratis: no pagás nada al empezar y, si no te sirve, no debés nada. Escribinos por WhatsApp.

## redes-premium · Redes en automático · Premium

1. **Portada.** Redes en automático, plan Premium, de eme y eme Soluciones.
2. **El reel pasa a anuncio.** Con tus mejores reels armamos tus campañas de publicidad.
3. **Botón a WhatsApp.** El anuncio lleva un botón a WhatsApp: quien lo toca, te escribe.
4. **Avatar hecho con IA.** Suma cuatro videos con tu avatar hecho con inteligencia artificial, con tu autorización y avisando que es inteligencia artificial.
5. **Qué incluye.** Incluye todo lo del Profesional, con doce reels animados, y suma TikTok y YouTube Shorts.
6. **Precio.** Cuesta seiscientos cincuenta mil pesos por mes, sin permanencia. La inversión en publicidad va aparte.
7. **Prueba gratis y contacto.** Empezando hasta el treinta de noviembre, tenés quince días de prueba totalmente gratis: no pagás nada al empezar y, si no te sirve, no debés nada. Escribinos por WhatsApp.
