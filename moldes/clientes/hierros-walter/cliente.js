// Ficha de Hierros Walter S.A y Todo Durlock (Isidro Casanova). Sale de la landing hecha a mano el 18/11/2026
// (demos/hierros-walter): datos de sus dos fichas de Google Maps. Sirve para comprobar que el molde «local»
// alcanza para rehacerla. Todavía no confirmaron su número de WhatsApp: por eso los botones muestran cómo
// llegaría el mensaje y no mandan nada.
const LV = [1, 2, 3, 4, 5];

export default {
  molde: 'local',
  slug: 'hierros-walter',
  estado: 'demo',

  marca: {
    nombre: 'Hierros Walter · Todo Durlock',
    nombreCorto: 'Hierros Walter',
    lema: '+ Todo Durlock',
    queHace: 'Hierros, mallas, perfiles y materiales para construcción en seco en Isidro Casanova, con entrega en obra.',
    logo: null,
  },
  tema: { primario: '#141414', acento: '#ffc21a' },

  contacto: {
    whatsapp: null, // FALTA confirmar (pregunta C6)
    whatsappMostrar: null,
    telefono: '011 4486-1559',
    telefonoInternacional: '541144861559',
    mail: null,
    mensaje: 'Buenos días, quisiera solicitar un presupuesto.',
    respuestaDemo: 'Buenos días, gracias por comunicarse. Indíquenos qué materiales necesita o envíenos una foto de la lista.',
    horarios: [
      { dias: 'Lunes a viernes', d: LV, de: '8:00', a: '17:00' },
      { dias: 'Sábados', d: [6], de: '8:00', a: '13:00' },
    ],
    redes: {},
  },

  zona: {
    texto: 'Isidro Casanova · La Matanza',
    direccion: 'José Bernaldes Polledo 178',
    localidad: 'Isidro Casanova',
    provincia: 'Buenos Aires',
    mapa: 'José Bernaldes Polledo 178, Isidro Casanova',
  },

  legal: {
    razonSocial: 'Hierros Walter S.A', // tal como figura en su ficha de Google; confirmar con el cliente
    cuit: null, // FALTA (pregunta C5)
    domicilio: null, // FALTA (pregunta W9)
    queSeVende: ['Hierros y mallas', 'Perfiles, caños y chapas', 'Placas de yeso y perfiles', 'Masillas, cintas y aislantes'],
    botones: { arrepentimiento: true, baja: false, motivoSinBaja: 'Vende materiales; no presta un servicio con abono ni suscripción.' },
  },
  permisos: { fotosYLogo: false },

  seo: {
    titulo: 'Hierros Walter · Todo Durlock · Corralón en Isidro Casanova',
    descripcion: 'Hierros, mallas, perfiles y materiales para construcción en seco en Isidro Casanova. Solicite su presupuesto por WhatsApp. Entrega en obra.',
    dominio: null,
    tipo: 'HardwareStore',
  },
  medicion: { ga4: '', metaPixel: '' },

  inicio: {
    titulo: 'Hierros y | construcción en seco | en una misma cuadra.',
    bajada: 'Hierro para construcción, mallas, perfiles y chapas en Hierros Walter. Placas de yeso, perfiles, masillas y aislantes en Todo Durlock. Envíe su lista de materiales y le respondemos con el presupuesto por WhatsApp.',
    botonPedido: 'Armar pedido',
    boton: 'Consultar por WhatsApp',
    datos: [{ icono: 'camion', texto: 'Entrega en obra' }],
    fotos: [
      { foto: 'img/hierros.jpg', pie: 'Hierros Walter', alt: 'Estanterías con barras y perfiles de hierro de Hierros Walter' },
      { foto: 'img/frente-camion.jpg', pie: 'Reparto propio', alt: 'Camión de reparto frente al local' },
      { foto: 'img/durlock.jpg', pie: 'Todo Durlock', alt: 'Frente del local Todo Durlock', posicion: 'center 30%' },
    ],
  },
  cinta: ['Hierro aletado', 'Mallas sima', 'Perfiles y caños', 'Chapas', 'Placas de yeso', 'Masillas y cintas', 'Aislantes', 'Entrega en obra'],

  sucursales: {
    titulo: 'Estructura y terminación en un solo lugar',
    bajada: 'Una única consulta para el hierro de la losa y el durlock de tabiques y cielorrasos, con una sola entrega en obra.',
    items: [
      {
        nombre: 'Hierros Walter S.A', etiqueta: 'Hierros', cat: 'hierros',
        detalle: 'Hierro para construcción, mallas, perfiles, caños estructurales, chapas y alambres, con entrega en obra.',
        foto: 'img/frente-calle.jpg', alt: 'Frente de Hierros Walter sobre Bernaldes Polledo',
        rubros: ['Hierro aletado', 'Mallas sima', 'Perfiles C', 'Caño estructural', 'Chapas', 'Alambre'],
        direccion: 'Bernaldes Polledo 178',
        horarios: [
          { dias: 'Lunes a viernes', diasCorto: 'Lun. a vie.', d: LV, de: '8:00', a: '17:00' },
          { dias: 'Sábados', diasCorto: 'Sáb.', d: [6], de: '8:00', a: '13:00' },
          { dias: 'Domingos', d: [0], cerrado: true },
        ],
        google: { nota: '4,3', cantidad: 88 },
      },
      {
        nombre: 'Todo Durlock', etiqueta: 'Construcción en seco', cat: 'seco',
        detalle: 'Materiales para la construcción en seco: placas de yeso, perfiles, masillas, cintas, tornillería, aislantes y accesorios.',
        foto: 'img/durlock.jpg', alt: 'Frente de Todo Durlock, materiales para la construcción en seco', posicion: 'center 25%',
        rubros: ['Placas de yeso', 'Montantes y soleras', 'Masillas', 'Aislantes', 'Tornillería', 'Accesorios'],
        direccion: 'Bernaldes Polledo 150',
        horarios: [
          { dias: 'Lunes a viernes', diasCorto: 'Lun. a vie.', d: LV, de: '8:00', a: '16:00' },
          { dias: 'Sábados', diasCorto: 'Sáb.', d: [6], de: '8:00', a: '13:00' },
          { dias: 'Domingos', d: [0], cerrado: true },
        ],
        google: { nota: '3,7', cantidad: 12 },
      },
    ],
  },

  catalogo: {
    titulo: 'Arme su pedido y le cotizamos',
    bajada: 'Seleccione las cantidades y envíenos la lista por WhatsApp. Le respondemos con precio, disponibilidad y fecha de entrega.',
    saludo: 'Buenos días, quisiera un presupuesto del siguiente pedido:',
    cierrePedido: 'Lugar de entrega: (localidad o dirección de la obra)',
    notaSinPrecios: 'El precio, la disponibilidad y el costo de envío se informan en el presupuesto.',
    categorias: [
      { id: 'hierros', nombre: 'Hierros', rotulo: 'Hierros Walter', color: '#d9361e' },
      { id: 'seco', nombre: 'Construcción en seco', rotulo: 'Todo Durlock', color: '#1d5fb8' },
    ],
    productos: [
      { cat: 'hierros', nombre: 'Hierro aletado', detalle: 'Barras de 12 m, del 6 al 25 mm', unidad: 'barras', foto: 'img/prod/hierro.jpg' },
      { cat: 'hierros', nombre: 'Malla sima', detalle: 'Para contrapisos, plateas y losas', unidad: 'paños', foto: 'img/prod/malla.jpg' },
      { cat: 'hierros', nombre: 'Perfiles', detalle: 'Perfil C, ángulos y planchuelas', unidad: 'unidades', foto: 'img/hierros.jpg' },
      { cat: 'hierros', nombre: 'Caños', detalle: 'Estructurales, redondos y cuadrados', unidad: 'unidades', foto: 'img/prod/canos.jpg' },
      { cat: 'hierros', nombre: 'Chapas', detalle: 'Lisas, sinusoidales y trapezoidales', unidad: 'unidades', foto: 'img/prod/chapa.jpg' },
      { cat: 'hierros', nombre: 'Alambre', detalle: 'De atar y galvanizado, por kilo', unidad: 'kg', foto: 'img/prod/alambre.jpg' },
      { cat: 'seco', nombre: 'Placas de yeso', detalle: 'Estándar, resistente a la humedad y al fuego', unidad: 'placas', foto: 'img/prod/placas.jpg' },
      { cat: 'seco', nombre: 'Montantes y soleras', detalle: 'Perfiles para tabiques y cielorrasos', unidad: 'unidades', foto: 'img/prod/montantes.jpg' },
      { cat: 'seco', nombre: 'Masillas', detalle: 'Para juntas y terminación', unidad: 'baldes', foto: 'img/prod/masilla.jpg' },
      { cat: 'seco', nombre: 'Cintas y cantoneras', detalle: 'Cinta de papel, de malla y esquineros', unidad: 'unidades', foto: 'img/prod/cinta.jpg' },
      { cat: 'seco', nombre: 'Aislantes', detalle: 'Lana de vidrio y lana mineral', unidad: 'rollos', foto: 'img/prod/lana.jpg' },
      { cat: 'seco', nombre: 'Tornillería', detalle: 'Tornillos T1 y T2 para placa y perfil', unidad: 'cajas', foto: 'img/prod/tornillos.jpg' },
    ],
  },

  pasos: {
    titulo: 'Un proceso simple y claro',
    items: [
      { titulo: 'Envíe su lista', detalle: 'Desde esta página o con una foto del cómputo de materiales de su profesional.' },
      { titulo: 'Reciba el presupuesto', detalle: 'Precio, disponibilidad y costo de envío por WhatsApp, en el día.' },
      { titulo: 'Confirme el pedido', detalle: 'Acordamos la forma de pago y coordinamos día y horario de entrega.' },
      { titulo: 'Entrega en obra', detalle: 'Con nuestro propio camión, o con retiro por el local en Isidro Casanova.' },
    ],
  },

  // Opiniones reales de las fichas de Google, copiadas tal cual (con los cortes marcados) el 18/11/2026.
  opiniones: {
    titulo: 'Lo que dicen nuestros clientes',
    fuente: 'Google',
    fecha: '18/11/2026',
    reales: true,
    permiso: false, // FALTA: el permiso de cada persona para publicarla en la página final (pregunta W5)
    resumen: { nota: '4,3', cantidad: 88 },
    linkDejar: 'https://search.google.com/local/writereview?placeid=ChIJsZrDM_bGvJURaGJ7pYXZJyU',
    items: [
      { nombre: 'South Dream', local: 'Hierros Walter', cuando: 'Hace 5 años', foto: 'img/resenas/south-dream.jpg', texto: 'Llegue a las 17:55 sin dinero y sin transporte porque me habían fallado una camioneta, le conté la situación y sin conocerme no solamente me dio buen precio en el hierro […] sino que me puso a mí disposición el vehículo para llevar los hierros. […] Buen número, buena gente, buen hierro.' },
      { nombre: 'Damian maximiliano Guzmán chaile', local: 'Hierros Walter', cuando: 'Hace un año', foto: 'img/resenas/damian-guzman.jpg', texto: 'Muy buena atención.. buenos precios' },
      { nombre: 'Puertas Blindadas Sam', local: 'Todo Durlock', cuando: 'Hace 5 años', foto: 'img/resenas/puertas-blindadas-sam.jpg', texto: 'Muy bueno te llevan las cosas' },
    ],
  },

  donde: { titulo: 'Bernaldes Polledo 150 y 178', bajada: 'Isidro Casanova, La Matanza. Ambos locales se encuentran en la misma cuadra.' },

  preguntas: {
    titulo: 'Consultas habituales',
    items: [
      { pregunta: '¿Realizan envíos a obra?', respuesta: 'Sí, con camión propio. El costo depende de la zona y del volumen, y se informa junto con el presupuesto.' },
      { pregunta: '¿Cortan el hierro a medida?', respuesta: 'Consúltenos por WhatsApp indicando medidas y cantidades y le confirmamos.' },
      { pregunta: '¿Puedo enviar el cómputo de mi obra?', respuesta: 'Sí. Envíe una foto de la lista o del plano y le preparamos un único presupuesto con los materiales de ambos locales.' },
      { pregunta: '¿Qué medios de pago aceptan?', respuesta: 'Se los detallamos junto con el presupuesto.' },
    ],
  },
  cierre: {
    titulo: '¿Tiene una obra | en marcha?',
    bajada: 'Envíenos la lista de materiales o una foto del cómputo. Le respondemos con precio y fecha de entrega.',
    boton: 'Solicitar presupuesto',
    mensaje: 'Buenos días, tengo una obra en marcha y quisiera solicitar un presupuesto.',
  },

  creditosFotos: 'Fotos de producto de Wikimedia Commons con licencias libres; en la web final se reemplazan por fotos propias. hierro: Useradd (CC BY-SA 3.0) · malla: Gerd Eichmann (CC BY-SA 4.0) · canos: Sắt Thép Biên Hòa (CC BY-SA 4.0) · chapa: Jandre van Heerden, Poly Haven (CC0) · alambre: sarang (dominio público) · placas: RossKur (CC BY 4.0) · montantes: MTA Capital Construction Mega Projects (CC BY 2.0) · masilla: Tomwsulcer (CC0) · cinta: Ural-66 (CC BY-SA 4.0) · lana: FMI Fachverband Mineralwolleindustrie (CC BY-SA 3.0 de) · tornillos: autor sin indicar (dominio público).',
};
