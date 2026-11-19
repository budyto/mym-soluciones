// FICHA DE UN CLIENTE · molde «local» (ferretería, corralón, bazar, pinturería, comercio de barrio).
// Se llena con las respuestas del cuestionario de pedido (bloque común C1 a C17 y bloque W y L de landing).
// Lo que no se sabe todavía se deja en null: en «demo» sale marcado como pendiente; en «final» no se genera.
// Ejemplo completo: moldes/clientes/hierros-walter/cliente.js
const LV = [1, 2, 3, 4, 5]; // lunes a viernes (0 domingo … 6 sábado)

export default {
  molde: 'local',
  slug: 'NOMBRE-DE-LA-CARPETA',
  estado: 'demo', // 'demo' mientras se arma y se aprueba · 'final' para subir al dominio del cliente

  marca: {
    nombre: '',        // (C2)
    nombreCorto: '',   // opcional, para el encabezado si el nombre es largo
    lema: '',          // opcional
    queHace: '',       // (C3) en una oración
    logo: null,        // (C9) 'fotos/logo.png' o null
  },
  tema: { primario: '#141414', acento: '#ffc21a' }, // (C9) el primario da el fondo oscuro; el acento, los botones

  contacto: {
    whatsapp: '',          // (C6) formato 5491112345678. Vacío en demo = los botones muestran una vista previa
    whatsappMostrar: '',
    telefono: null,
    mail: null,            // (C8) casilla para trámites y datos personales
    mensaje: 'Hola, quiero pedir un presupuesto.',
    horarios: [{ dias: 'Lunes a viernes', d: LV, de: '8:00', a: '17:00' }, { dias: 'Sábados', d: [6], de: '8:00', a: '13:00' }], // (C7)
    redes: { instagram: '', facebook: '' },
  },

  zona: { texto: '', direccion: '', localidad: '', provincia: '', mapa: '' }, // (C4) mapa: lo que se busca en Google Maps

  legal: {             // (C5 y W9) SIEMPRE los datos del cliente, nunca los de MyM
    razonSocial: null,
    cuit: null,
    domicilio: null,
    condicionIva: null,
    queSeVende: [],    // rubros, para el formulario de arrepentimiento
    // Un comercio que sólo vende productos no presta un servicio con abono: se puede sacar el botón de baja
    // escribiendo el motivo. Ante la duda, se dejan los dos.
    botones: { arrepentimiento: true, baja: false, motivoSinBaja: 'Vende productos; no presta un servicio con abono ni suscripción.' },
  },
  permisos: { fotosYLogo: false },

  seo: { titulo: '', descripcion: '', dominio: null, tipo: 'Store' }, // tipo: HardwareStore, HomeGoodsStore, ClothingStore…
  medicion: { ga4: '', metaPixel: '' },
  // precios: { vigentesAl: '19/11/2026', aclaracion: 'Precios de contado.' }, // obligatorio si algún producto lleva precio

  inicio: {
    titulo: '',  // (W3) con | se corta el renglón
    bajada: '',
    botonPedido: 'Armar pedido',
    boton: 'Consultar por WhatsApp',
    datos: [{ icono: 'camion', texto: 'Envíos a domicilio' }], // (C11) hechos que el cliente pueda probar. Iconos: camion, tilde, reloj, pin
    fotos: [     // (W6) de 1 a 3 fotos del local
      { foto: 'fotos/frente.jpg', pie: '', alt: '' },
    ],
  },
  cinta: [],     // rubros que corren en la cinta, de 5 a 8

  sucursales: {  // con un solo local, la sección «Nuestros locales» no aparece (sí sus horarios)
    titulo: 'Nuestros locales',
    items: [
      { nombre: '', etiqueta: '', detalle: '', foto: 'fotos/frente.jpg', rubros: [], direccion: '',
        horarios: [{ dias: 'Lunes a viernes', diasCorto: 'Lun. a vie.', d: LV, de: '8:00', a: '17:00' }, { dias: 'Domingos', d: [0], cerrado: true }] },
    ],
  },

  catalogo: {    // (C10) lo que el cliente marca para armar el pedido
    titulo: 'Armá tu pedido',
    bajada: 'Marcá las cantidades y mandanos la lista por WhatsApp. Te contestamos con precio y disponibilidad.',
    saludo: 'Hola, quiero un presupuesto de este pedido:',
    cierrePedido: 'Lugar de entrega: ',
    categorias: [{ id: 'general', nombre: 'Productos' }],
    productos: [
      { cat: 'general', nombre: '', detalle: '', unidad: 'unidades', foto: 'fotos/producto-1.jpg' }, // precio: '$ 12.500' es opcional
    ],
  },

  pasos: {
    titulo: 'Cómo comprar',
    items: [
      { titulo: 'Mandá tu lista', detalle: 'Desde esta página o con una foto.' },
      { titulo: 'Recibí el presupuesto', detalle: 'Con precio, disponibilidad y costo de envío.' },
      { titulo: 'Retirá o recibí', detalle: '' },
    ],
  },

  // Opiniones: SÓLO reales, copiadas tal cual, con fuente, fecha y permiso (W5). Si no hay, borrá el bloque.
  // opiniones: { titulo: 'Lo que dicen los clientes', fuente: 'Google', fecha: '19/11/2026', reales: true, permiso: false,
  //   resumen: { nota: '4,5', cantidad: 120 }, linkDejar: '', items: [{ nombre: '', cuando: '', texto: '', foto: null }] },

  donde: { titulo: 'Horarios y ubicación', bajada: '' },
  preguntas: { items: [{ pregunta: '', respuesta: '' }] },
  cierre: { titulo: '', bajada: '', boton: 'Pedir presupuesto' },
};
