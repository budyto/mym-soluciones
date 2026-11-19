// NEGOCIO INVENTADO para mostrar el molde «turnos». No es un cliente: el nombre, la dirección, los precios y las
// personas no existen. Las fotos son rellenos que dicen qué foto va en cada lugar. Sirve como ejemplo para copiar.
const MA_VI = [2, 3, 4, 5];

export default {
  molde: 'turnos',
  slug: 'estudio-alma',
  estado: 'demo',
  ficticio: true,

  marca: {
    nombre: 'Estudio Alma',
    queHace: 'Peluquería, color y manos en Caballito, con turno.',
    logo: null,
  },
  tema: { primario: '#5b2a4e', acento: '#ef6f6c' },

  contacto: {
    whatsapp: null, // negocio inventado: los botones muestran cómo llegaría el mensaje
    whatsappMostrar: null,
    telefono: null,
    mail: null,
    mensaje: 'Hola, quiero hacer una consulta.',
    respuestaDemo: 'Hola, gracias por escribir. Te confirmo el día y la hora en un ratito.',
    horarios: [
      { dias: 'Martes a viernes', d: MA_VI, de: '10:00', a: '19:30' },
      { dias: 'Sábados', d: [6], de: '9:00', a: '17:00' },
      { dias: 'Domingos y lunes', d: [0, 1], cerrado: true },
    ],
    redes: { instagram: 'https://www.instagram.com/' },
  },

  zona: {
    texto: 'Caballito, Ciudad de Buenos Aires',
    direccion: 'Av. Ejemplo 1234, primer piso',
    localidad: 'Caballito, CABA',
    referencia: 'A dos cuadras del subte A',
    provincia: 'Ciudad Autónoma de Buenos Aires',
    mapa: 'Parque Rivadavia, Caballito, CABA',
  },

  legal: {
    razonSocial: null,
    cuit: null,
    domicilio: null,
    queSeVende: ['Corte', 'Color', 'Tratamiento', 'Manos'],
    queSeDaDeBaja: ['Abono mensual de peinado', 'Otro'],
    botones: { arrepentimiento: true, baja: true },
  },
  permisos: { fotosYLogo: false },

  seo: {
    titulo: 'Estudio Alma · Peluquería y color en Caballito',
    descripcion: 'Corte, color, tratamientos y manos en Caballito. Mirá los servicios con su duración y su precio y pedí tu turno por WhatsApp.',
    dominio: null,
    tipo: 'HairSalon',
  },
  medicion: { ga4: '', metaPixel: '' },
  precios: { vigentesAl: '19/11/2026', aclaracion: 'El color se confirma al ver el largo y el estado del pelo.' },

  inicio: {
    titulo: 'Tu pelo, con tiempo y sin apuro.',
    bajada: 'Corte, color y manos en Caballito. Elegí lo que querés hacerte, decinos qué día te queda bien y te confirmamos el turno por WhatsApp.',
    boton: 'Elegir servicio y pedir turno',
    foto: 'fotos/salon.svg', alt: 'El salón de Estudio Alma',
    fotoIzquierda: 'fotos/sillon.svg', altIzquierda: 'Sillón de corte',
    fotoDerecha: 'fotos/color.svg', altDerecha: 'Trabajo de color',
  },
  datos: ['Atención sólo con turno', 'Martes a sábados', 'A dos cuadras del subte A'],

  servicios: {
    titulo: 'Servicios',
    bajada: 'Marcá lo que querés hacerte. Cada servicio dice cuánto dura para que puedas organizarte.',
    grupos: [
      { nombre: 'Corte', items: [
        { nombre: 'Corte y peinado', duracion: '45 min', precio: '$ 18.000' },
        { nombre: 'Corte de flequillo', duracion: '15 min', precio: '$ 6.000' },
        { nombre: 'Corte para chicos', detalle: 'Hasta 12 años', duracion: '30 min', precio: '$ 12.000' },
      ] },
      { nombre: 'Color', items: [
        { nombre: 'Color de raíz', duracion: '1 h 30', precio: '$ 32.000' },
        { nombre: 'Color completo', duracion: '2 h', precio: 'desde $ 45.000' },
        { nombre: 'Balayage', detalle: 'Incluye matiz y peinado', duracion: '3 h 30', precio: 'desde $ 95.000' },
      ] },
      { nombre: 'Tratamientos y manos', items: [
        { nombre: 'Nutrición profunda', duracion: '40 min', precio: '$ 20.000' },
        { nombre: 'Manicuría semipermanente', duracion: '1 h', precio: '$ 16.000' },
      ] },
    ],
  },
  turnos: {
    url: null, // si el cliente usa una agenda online, va acá y aparece el botón «Reservar en la agenda»
    saludo: 'Hola, quiero pedir un turno en Estudio Alma.',
    dias: ['Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
    momentos: ['A la mañana', 'A la tarde'],
    nota: 'Te confirmamos el día y la hora por WhatsApp. El turno queda tomado recién cuando te lo confirmamos.',
  },

  equipo: {
    titulo: 'Quiénes te atienden',
    pideMatricula: false, // en un consultorio va en true y cada profesional lleva su matrícula
    items: [
      { nombre: 'Carla', rol: 'Corte y color', foto: 'fotos/carla.svg' },
      { nombre: 'Vero', rol: 'Color y balayage', foto: 'fotos/vero.svg' },
      { nombre: 'Luz', rol: 'Manos y tratamientos', foto: 'fotos/luz.svg' },
    ],
  },
  galeria: {
    titulo: 'El lugar',
    items: [
      { foto: 'fotos/lavado.svg', pie: 'Lavado' },
      { foto: 'fotos/frente.svg', pie: 'El frente' },
      { foto: 'fotos/detalle.svg', pie: 'Productos' },
      { foto: 'fotos/manos.svg', pie: 'Manos' },
    ],
  },
  antes: {
    titulo: 'Antes de venir',
    items: [
      { titulo: 'Si no podés venir', detalle: 'Avisanos con un día de anticipación así le damos el lugar a otra persona.' },
      { titulo: 'Seña para trabajos largos', detalle: 'Para balayage pedimos una seña del 20 %, que se descuenta del total. Si cancelás con un día de anticipación, te la devolvemos por el mismo medio.' },
      { titulo: 'Medios de pago', detalle: 'Efectivo, transferencia y tarjeta de débito.' },
    ],
  },
  preguntas: {
    items: [
      { pregunta: '¿Atienden sin turno?', respuesta: 'No. Trabajamos sólo con turno para que nadie espere.' },
      { pregunta: '¿Cómo sé cuánto va a salir el color?', respuesta: 'Los precios «desde» dependen del largo y del estado del pelo. Mandanos una foto por WhatsApp y te pasamos el precio antes de reservar.' },
      { pregunta: '¿Puedo cambiar el turno?', respuesta: 'Sí. Escribinos con un día de anticipación y lo movemos.' },
    ],
  },
  cierre: {
    titulo: '¿Te guardamos un lugar?',
    bajada: 'Elegí el servicio, decinos qué día te queda bien y te confirmamos por WhatsApp.',
    boton: 'Pedir turno',
  },
};
