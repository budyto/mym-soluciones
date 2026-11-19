// Ficha de Plomería Mansilla. Sale de la landing hecha a mano el 14/11/2026 (demos/plomeriamansilla), que usó
// sólo lo que ellos publican en Instagram, TikTok y Facebook. Sirve para comprobar que el molde «servicio»
// alcanza para rehacerla. Lo que dice null es un dato que todavía no nos pasó el cliente.
export default {
  molde: 'servicio',
  slug: 'plomeria-mansilla',
  estado: 'demo', // «demo»: con cinta de muestra y sin indexar. «final»: exige todos los datos legales.

  marca: {
    nombre: 'Plomería Mansilla',
    lema: 'Profesionales en el área',
    queHace: 'Plomería, instalaciones de agua, bombas y reformas de baño y cocina en Palermo.',
    logo: null,
  },
  tema: { primario: '#0f2a52', acento: '#f26a1b' },

  contacto: {
    whatsapp: '5491131638945',
    whatsappMostrar: '11 3163-8945',
    telefono: null,
    mail: null,
    mensaje: 'Hola, quiero pedir un presupuesto.',
    horarios: [], // FALTA: no lo publican. Pregunta C7.
    redes: {
      instagram: 'https://www.instagram.com/plomeriamansilla',
      tiktok: 'https://www.tiktok.com/@plomeriamansilla',
      facebook: 'https://www.facebook.com/profile.php?id=61595020777258',
    },
  },

  zona: {
    texto: 'Palermo y alrededores',
    titulo: 'En Palermo y alrededores',
    direccion: 'Honduras 5737',
    localidad: 'Palermo',
    provincia: 'Ciudad Autónoma de Buenos Aires',
    mapa: 'Honduras 5737, Palermo, CABA, Argentina',
    puntos: ['Estamos en Honduras 5737, Palermo.', 'Trabajos en Palermo, Almagro y barrios cercanos.', 'Presupuesto por WhatsApp: 11 3163-8945.'],
    boton: '¿Trabajan en mi barrio?',
    mensaje: 'Hola, ¿trabajan en mi barrio?',
  },

  legal: {
    razonSocial: null, // FALTA (preguntas C5 y W9): el responsable del sitio es el cliente, no MyM
    cuit: null,
    domicilio: null,
    condicionIva: null,
    queSeVende: ['Arreglo de plomería', 'Instalación de agua', 'Bomba o presurizadora', 'Reforma de baño o cocina', 'Pintura o durlock'],
    botones: { arrepentimiento: true, baja: true },
  },
  permisos: { fotosYLogo: false }, // FALTA: la confirmación del cliente de que fotos y textos son suyos

  seo: {
    titulo: 'Plomería Mansilla · Plomería y reformas en Palermo',
    descripcion: 'Plomería, pérdidas, instalaciones de agua, bombas y reformas de baño y cocina. Más de 10 años de experiencia. Presupuesto por WhatsApp.',
    dominio: null, // FALTA: se registra a nombre del cliente (pregunta W7)
    tipo: 'Plumber',
  },
  medicion: { ga4: '', metaPixel: '' },

  inicio: {
    titulo: '¿Pérdida, goteo o reforma? | Lo resolvemos.',
    bajada: 'Arreglos de plomería, instalaciones de agua fría y caliente, bombas y reformas completas de baño y cocina. Mandanos una foto por WhatsApp y te pasamos el presupuesto.',
    foto: 'media/hero-bano.jpg',
    video: 'media/hero-bano.mp4',
    alt: 'Baño reformado por Plomería Mansilla',
    boton: 'Pedir presupuesto por WhatsApp',
  },
  problemas: {
    pregunta: '¿Qué te está pasando?',
    items: [
      { texto: 'Pierde una canilla o el depósito', mensaje: 'Hola, tengo una pérdida (canilla o depósito). ¿Me pasan un presupuesto? Les mando una foto.' },
      { texto: 'No tengo presión de agua', mensaje: 'Hola, tengo poca presión de agua. ¿Me pasan un presupuesto por una bomba o presurizadora?' },
      { texto: 'Se me inunda el patio', mensaje: 'Hola, se me inunda el patio cuando llueve. Les mando un video. ¿Qué conviene hacer?' },
      { texto: 'Quiero reformar el baño o la cocina', mensaje: 'Hola, quiero reformar el baño o la cocina. ¿Me pasan un presupuesto?' },
      { texto: 'Otra cosa', mensaje: 'Hola, quiero pedir un presupuesto.' },
    ],
  },
  datos: ['Más de 10 años de experiencia', 'Palermo y alrededores', 'Reformas completas'],

  servicios: {
    titulo: 'Todo lo de agua, en un solo lugar',
    bajada: 'Desde una canilla que gotea hasta un baño nuevo. Si no sabés qué tiene, mandanos una foto o un video y lo vemos.',
    items: [
      { nombre: 'Pérdidas y goteos', detalle: 'Canillas que gotean, pérdidas en el baño y la cocina, depósitos que pierden agua.', foto: 'media/goteo.jpg', video: 'media/goteo.mp4' },
      { nombre: 'Instalaciones de agua', detalle: 'Agua fría y caliente para baños, cocinas y toda la vivienda, bien hecha desde el principio.', foto: 'media/instalacion.jpg', video: 'media/instalacion.mp4' },
      { nombre: 'Bombas y presurizadoras', detalle: 'Instalación y cambio de bombas para que tengas presión en toda la casa.', foto: 'media/bomba.jpg', video: 'media/bomba.mp4' },
      { nombre: 'Reformas de baño y cocina', detalle: 'Reformas completas: instalación, revestimientos y terminaciones.', foto: 'media/reforma.jpg', video: 'media/reforma.mp4' },
      { nombre: 'Desagües y patios que se inundan', detalle: 'Si cada vez que llueve se te llena el patio, muchas veces se soluciona sin romper nada.', foto: 'media/desague.jpg', video: 'media/desague.mp4' },
      { nombre: 'Pintura y durlock', detalle: 'Además de plomería: pintura interior y exterior, y trabajos en durlock.', foto: 'media/pintura.jpg', alt: 'Pintor de Plomería Mansilla trabajando' },
    ],
  },
  trabajos: {
    titulo: 'Así trabajamos, obra por obra',
    bajada: 'Fotos de nuestros trabajos. Más en Instagram y TikTok: @plomeriamansilla.',
    items: [
      { foto: 'media/g-bano.jpg', video: 'media/g-bano.mp4', pie: 'Baño terminado' },
      { foto: 'media/g-obra.jpg', video: 'media/g-obra.mp4', pie: 'Arrancando una obra' },
      { foto: 'media/g-termotanque.jpg', video: 'media/g-termotanque.mp4', pie: 'Termotanque instalado' },
      { foto: 'media/g-arreglo.jpg', video: 'media/g-arreglo.mp4', pie: 'Arreglos' },
    ],
  },
  pasos: {
    titulo: 'Pedir un plomero, sin vueltas',
    bajada: 'Tres pasos, todo por WhatsApp.',
    items: [
      { titulo: 'Nos escribís', detalle: 'Por WhatsApp, con una foto o un video del problema y tu barrio.' },
      { titulo: 'Te pasamos el presupuesto', detalle: 'Con lo que hay que hacer y cuánto sale, antes de empezar.' },
      { titulo: 'Coordinamos el día', detalle: 'Vamos, lo resolvemos y dejamos todo limpio.' },
    ],
  },
  preguntas: {
    titulo: 'Lo que más nos preguntan',
    items: [
      { pregunta: '¿Cómo pido un presupuesto?', respuesta: 'Escribinos por WhatsApp al 11 3163-8945 con una foto o un video del problema y tu barrio. Te contestamos con lo que hay que hacer.' },
      { pregunta: '¿Hacen reformas completas?', respuesta: 'Sí: reformas de baño y cocina, con la instalación de agua fría y caliente y las terminaciones.' },
      { pregunta: '¿Hacen otros trabajos además de plomería?', respuesta: 'Sí, también pintura interior y exterior y trabajos en durlock.' },
      { pregunta: '¿Se puede arreglar un patio que se inunda sin romper?', respuesta: 'Muchas veces sí. Mandanos un video de cómo queda cuando llueve y te decimos qué conviene.' },
    ],
  },
  cierre: {
    titulo: '¿Tenés un problema de agua? | Escribinos hoy.',
    bajada: 'Mandanos una foto por WhatsApp y te pasamos el presupuesto.',
    boton: 'Pedir presupuesto por WhatsApp',
  },
};
