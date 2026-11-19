// FICHA DE UN CLIENTE · molde «servicio» (plomero, electricista, gasista, técnico, cerrajero, fletes).
// Se llena con las respuestas del cuestionario de pedido (bloque común C1 a C17 y bloque W y L de landing).
// Entre paréntesis va la pregunta de donde sale cada dato. Lo que no se sabe todavía se deja en null:
// en estado «demo» la página sale igual, con el dato marcado como pendiente; en «final» no se genera.
// Ejemplo completo: moldes/clientes/plomeria-mansilla/cliente.js
export default {
  molde: 'servicio',
  slug: 'NOMBRE-DE-LA-CARPETA',
  estado: 'demo', // 'demo' mientras se arma y se aprueba · 'final' para subir al dominio del cliente

  marca: {
    nombre: '',     // (C2) cómo lo conocen los clientes
    lema: '',       // opcional, una línea corta debajo del nombre
    queHace: '',    // (C3) a qué se dedica, en una oración
    logo: null,     // (C9) 'fotos/logo.png' o null para usar el nombre escrito
  },
  tema: { primario: '#1d4a8f', acento: '#f26a1b' }, // (C9) dos colores de la marca; el acento es el del botón

  contacto: {
    whatsapp: '',          // (C6) formato 5491112345678, sin + ni espacios
    whatsappMostrar: '',   // como se lee: '11 1234-5678'
    telefono: null,        // opcional, si además atienden llamadas
    mail: null,            // (C8) casilla para trámites de arrepentimiento, baja y datos personales
    mensaje: 'Hola, quiero pedir un presupuesto.', // el mensaje que ya sale escrito en WhatsApp
    horarios: [            // (C7) d: 0 domingo, 1 lunes … 6 sábado
      { dias: 'Lunes a viernes', d: [1, 2, 3, 4, 5], de: '8:00', a: '18:00' },
      { dias: 'Sábados', d: [6], de: '9:00', a: '13:00' },
    ],
    redes: { instagram: '', tiktok: '', facebook: '' }, // (C8) direcciones completas; borrá las que no tenga
  },

  zona: {
    texto: '',       // (C4) 'Palermo y alrededores'
    titulo: '',      // opcional: titular de la sección de zona
    direccion: '',   // opcional, si tiene local o base
    localidad: '',
    provincia: '',
    mapa: '',        // lo que se busca en Google Maps: 'Honduras 5737, Palermo, CABA'. Vacío = sin mapa
    puntos: [],      // 2 o 3 renglones: barrios, si cobra la visita, etc.
  },

  legal: {           // (C5 y W9) SIEMPRE los datos del cliente, nunca los de MyM
    razonSocial: null,
    cuit: null,
    domicilio: null,
    condicionIva: null, // 'Monotributo', 'Responsable inscripto'
    queSeVende: [],     // opciones del formulario de arrepentimiento: sus servicios principales
    botones: { arrepentimiento: true, baja: true }, // para sacar uno hay que escribir el motivo (motivoSinBaja)
  },
  permisos: { fotosYLogo: false }, // true cuando el cliente confirmó que fotos, logo y textos son suyos

  seo: {
    titulo: '',       // 'Plomería Mansilla · Plomería y reformas en Palermo' (hasta 60 letras)
    descripcion: '',  // una o dos oraciones (hasta 155 letras)
    dominio: null,    // (W7) 'plomeriamansilla.com.ar', registrado a nombre del cliente
    tipo: 'LocalBusiness', // para Google: Plumber, Electrician, Locksmith, HVACBusiness, MovingCompany…
  },
  medicion: { ga4: '', metaPixel: '' }, // (L2) ids de Google Analytics y del píxel de Meta, si pauta

  inicio: {
    titulo: '',   // (W3) el problema, con las palabras del cliente. Con | se corta el renglón
    bajada: '',   // qué hace y cómo se pide, en dos oraciones
    foto: 'fotos/principal.jpg', // (W6) vertical, de un trabajo real
    video: null,  // opcional: clip corto sin sonido
    alt: '',      // qué se ve en la foto
    boton: 'Pedir presupuesto por WhatsApp',
  },
  problemas: {    // (W3) entre 3 y 6. Son los botones del inicio: cada uno arma su mensaje de WhatsApp
    pregunta: '¿Qué te está pasando?',
    items: [
      { texto: '', mensaje: '' },
      { texto: 'Otra cosa', mensaje: 'Hola, quiero pedir un presupuesto.' },
    ],
  },
  datos: [],      // (W4) hasta 3 hechos que el cliente pueda probar: 'Más de 10 años de experiencia'

  servicios: {    // (C10)
    titulo: 'Qué hacemos',
    bajada: '',
    items: [
      { nombre: '', detalle: '', foto: 'fotos/servicio-1.jpg' },
    ],
  },
  trabajos: {     // (W6) fotos verticales de trabajos terminados; borrá el bloque si no hay
    titulo: 'Trabajos hechos',
    items: [{ foto: 'fotos/trabajo-1.jpg', pie: '' }],
  },
  pasos: {
    titulo: 'Cómo trabajamos',
    items: [
      { titulo: 'Nos escribís', detalle: 'Por WhatsApp, con una foto o un video del problema y tu barrio.' },
      { titulo: 'Te pasamos el presupuesto', detalle: 'Con lo que hay que hacer y cuánto sale, antes de empezar.' },
      { titulo: 'Coordinamos el día', detalle: '' },
    ],
  },
  preguntas: { items: [{ pregunta: '', respuesta: '' }] },
  cierre: { titulo: '', bajada: '', boton: 'Pedir presupuesto por WhatsApp' },
};
