// NEGOCIO INVENTADO para medir cuánto lleva sacar una landing nueva con el molde «servicio» (19/11/2026).
// No es un cliente: el nombre, la zona, el matriculado y los datos no existen. Las fotos son rellenos.
export default {
  molde: 'servicio',
  slug: 'electricista-ejemplo',
  estado: 'demo',
  ficticio: true,

  marca: {
    nombre: 'Voltio Electricidad',
    lema: 'Electricista matriculado',
    queHace: 'Electricidad para casas y comercios en Lanús: cortes de luz, tableros, cableado nuevo e instalación de aires.',
    logo: null,
  },
  tema: { primario: '#12355b', acento: '#ffb400' },

  contacto: {
    whatsapp: null,
    whatsappMostrar: null,
    telefono: null,
    mail: null,
    mensaje: 'Hola, necesito un electricista.',
    respuestaDemo: 'Hola, gracias por escribir. ¿En qué barrio estás y qué está pasando?',
    horarios: [
      { dias: 'Lunes a viernes', d: [1, 2, 3, 4, 5], de: '8:00', a: '18:00' },
      { dias: 'Sábados', d: [6], de: '9:00', a: '13:00' },
    ],
    redes: { instagram: 'https://www.instagram.com/' },
  },

  zona: {
    texto: 'Lanús y alrededores',
    titulo: 'En Lanús, Banfield y Remedios de Escalada',
    direccion: '',
    localidad: 'Lanús',
    provincia: 'Buenos Aires',
    mapa: 'Lanús, Buenos Aires',
    puntos: ['Vamos a domicilio en Lanús, Banfield y Remedios de Escalada.', 'La visita para presupuestar se coordina por WhatsApp.'],
  },

  legal: {
    razonSocial: null,
    cuit: null,
    domicilio: null,
    condicionIva: null,
    queSeVende: ['Reparación eléctrica', 'Tablero nuevo', 'Cableado', 'Instalación de aire acondicionado'],
    botones: { arrepentimiento: true, baja: true },
  },
  permisos: { fotosYLogo: false },

  seo: {
    titulo: 'Voltio Electricidad · Electricista en Lanús',
    descripcion: 'Electricista matriculado en Lanús. Cortes de luz, tableros, cableado y aires acondicionados. Pedí presupuesto por WhatsApp.',
    dominio: null,
    tipo: 'Electrician',
  },
  medicion: { ga4: '', metaPixel: '' },

  inicio: {
    titulo: '¿Te salta la térmica | o te quedaste sin luz?',
    bajada: 'Arreglamos fallas eléctricas en casas y comercios de Lanús. Contanos qué pasa por WhatsApp y coordinamos la visita.',
    foto: 'fotos/principal.svg',
    video: null,
    alt: 'Electricista trabajando en un tablero',
    boton: 'Pedir un electricista por WhatsApp',
  },
  problemas: {
    pregunta: '¿Qué te está pasando?',
    items: [
      { texto: 'Me quedé sin luz', mensaje: 'Hola, me quedé sin luz en casa. ¿Pueden venir a revisar?' },
      { texto: 'Salta la térmica o el disyuntor', mensaje: 'Hola, me salta la térmica o el disyuntor. ¿Me pasan un presupuesto para revisarlo?' },
      { texto: 'Quiero cambiar el tablero', mensaje: 'Hola, quiero cambiar el tablero eléctrico. ¿Me pasan un presupuesto?' },
      { texto: 'Instalar un aire', mensaje: 'Hola, quiero instalar un aire acondicionado. ¿Me pasan un presupuesto?' },
      { texto: 'Otra cosa', mensaje: 'Hola, necesito un electricista.' },
    ],
  },
  datos: ['Electricista matriculado', 'Presupuesto antes de empezar', 'Lanús y alrededores'],

  servicios: {
    titulo: 'Qué hacemos',
    bajada: 'Si no sabés cuál es el problema, mandanos una foto del tablero y lo vemos.',
    items: [
      { nombre: 'Cortes y fallas', detalle: 'Buscamos por qué se corta la luz o salta la térmica y lo arreglamos.', foto: 'fotos/servicio-1.svg' },
      { nombre: 'Tableros y disyuntores', detalle: 'Cambio de tablero, térmicas y disyuntor diferencial.', foto: 'fotos/servicio-2.svg' },
      { nombre: 'Cableado nuevo', detalle: 'Recableado de casas y locales, tomas y bocas de luz nuevas.', foto: 'fotos/servicio-3.svg' },
      { nombre: 'Aires acondicionados', detalle: 'Instalación con su línea y su térmica propias.', foto: 'fotos/servicio-4.svg' },
    ],
  },
  pasos: {
    titulo: 'Cómo trabajamos',
    items: [
      { titulo: 'Nos escribís', detalle: 'Por WhatsApp, con una foto del tablero o del problema y tu barrio.' },
      { titulo: 'Te pasamos el presupuesto', detalle: 'Con lo que hay que hacer y cuánto sale, antes de empezar.' },
      { titulo: 'Coordinamos la visita', detalle: 'Vamos el día acordado y probamos todo antes de irnos.' },
    ],
  },
  preguntas: {
    items: [
      { pregunta: '¿Cobran la visita?', respuesta: 'Te lo decimos por WhatsApp antes de ir, según la zona y el trabajo.' },
      { pregunta: '¿Trabajan en comercios?', respuesta: 'Sí, en casas y en locales comerciales.' },
      { pregunta: '¿Qué hago si huelo a quemado en el tablero?', respuesta: 'Bajá la llave general, no toques el tablero y escribinos.' },
    ],
  },
  cierre: { titulo: '¿Problemas con la luz?', bajada: 'Contanos qué pasa por WhatsApp y coordinamos la visita.', boton: 'Pedir un electricista por WhatsApp' },
};
