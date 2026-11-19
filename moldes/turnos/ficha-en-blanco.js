// FICHA DE UN CLIENTE · molde «turnos» (peluquería, barbería, estética, consultorio, kinesiología, estudio).
// Se llena con las respuestas del cuestionario de pedido (bloque común C1 a C17 y bloque W y L de landing).
// Lo que no se sabe todavía se deja en null: en «demo» sale marcado como pendiente; en «final» no se genera.
// Ejemplo completo (negocio inventado): moldes/clientes/estudio-alma/cliente.js
//
// Si es un consultorio o cualquier servicio de salud: nada de promesas de resultado («cura», «elimina»),
// cada profesional con su matrícula (equipo.pideMatricula: true) y los textos los aprueba el profesional.
export default {
  molde: 'turnos',
  slug: 'NOMBRE-DE-LA-CARPETA',
  estado: 'demo', // 'demo' mientras se arma y se aprueba · 'final' para subir al dominio del cliente

  marca: {
    nombre: '',     // (C2)
    queHace: '',    // (C3) en una oración
    logo: null,     // (C9) 'fotos/logo.png' o null para usar el nombre escrito
  },
  tema: { primario: '#5b2a4e', acento: '#ef6f6c' }, // (C9) el acento es el color del botón de pedir turno

  contacto: {
    whatsapp: '',          // (C6) formato 5491112345678
    whatsappMostrar: '',
    telefono: null,
    mail: null,            // (C8) casilla para trámites y datos personales
    mensaje: 'Hola, quiero hacer una consulta.',
    horarios: [            // (C7) d: 0 domingo … 6 sábado
      { dias: 'Lunes a viernes', d: [1, 2, 3, 4, 5], de: '10:00', a: '19:00' },
      { dias: 'Sábados', d: [6], de: '9:00', a: '14:00' },
    ],
    redes: { instagram: '' },
  },

  zona: { texto: '', direccion: '', localidad: '', referencia: '', provincia: '', mapa: '' }, // (C4)

  legal: {            // (C5 y W9) SIEMPRE los datos del cliente, nunca los de MyM
    razonSocial: null,
    cuit: null,
    domicilio: null,
    condicionIva: null,
    queSeVende: [],      // servicios, para el formulario de arrepentimiento
    queSeDaDeBaja: [],   // abonos o membresías, si los tiene
    botones: { arrepentimiento: true, baja: true },
  },
  permisos: { fotosYLogo: false },

  seo: { titulo: '', descripcion: '', dominio: null, tipo: 'LocalBusiness' }, // HairSalon, BeautySalon, Dentist, Physiotherapy…
  medicion: { ga4: '', metaPixel: '' },
  precios: { vigentesAl: '', aclaracion: '' }, // (L3) obligatorio si la carta lleva precios: 'dd/mm/aaaa'

  inicio: {
    titulo: '',  // (W3)
    bajada: '',
    boton: 'Elegir servicio y pedir turno',
    foto: 'fotos/principal.jpg', alt: '',   // (W6) vertical: va dentro del arco
    fotoIzquierda: null, fotoDerecha: null, // opcionales, sólo se ven en pantallas grandes
  },
  datos: [],     // hasta 3 hechos: 'Atención sólo con turno'

  servicios: {   // (C10) la carta. duracion y precio son opcionales, pero ayudan a decidir
    titulo: 'Servicios',
    bajada: 'Marcá lo que querés hacerte.',
    grupos: [
      { nombre: '', items: [{ nombre: '', detalle: '', duracion: '', precio: '' }] },
    ],
  },
  turnos: {
    url: null,   // si usa una agenda online (la dirección completa), aparece «Reservar en la agenda»
    saludo: 'Hola, quiero pedir un turno.',
    dias: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
    momentos: ['A la mañana', 'A la tarde'],
  },

  equipo: {      // borrá el bloque si atiende una sola persona y no quiere figurar
    titulo: 'Quiénes te atienden',
    pideMatricula: false, // true en salud
    items: [{ nombre: '', rol: '', matricula: '', foto: 'fotos/retrato-1.jpg' }],
  },
  galeria: { titulo: 'El lugar', items: [{ foto: 'fotos/lugar-1.jpg', pie: '' }] }, // de a 4 fotos queda mejor
  antes: {       // (C11 y C13) cancelaciones, señas y medios de pago, dicho claro
    titulo: 'Antes de venir',
    items: [{ titulo: 'Si no podés venir', detalle: '' }],
  },
  preguntas: { items: [{ pregunta: '', respuesta: '' }] },
  cierre: { titulo: '¿Te guardamos un lugar?', bajada: '', boton: 'Pedir turno' },
};
