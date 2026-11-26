/* Distribuidora del Centro: configuración y datos de ejemplo.
   Todo es inventado y determinístico (semilla fija): cada vez que se abre la demo se genera igual.
   Los maestros (productos, clientes, proveedores…) se arman acá; la historia de 6 meses se genera
   pasando por las MISMAS acciones del store (App.acciones), así contabilidad, stock y cuentas corrientes cierran. */
(function () {
  'use strict';

  const CONFIG = {
    negocio: 'Distribuidora del Centro',          // el único lugar para cambiar el nombre
    razonSocial: 'Distribuidora del Centro S.R.L.',
    condicionIVA: 'Responsable Inscripto',
    domicilio: 'Bv. Sarmiento 2.450, Villa María (5900), Córdoba',
    telefono: '(0353) 452-5580',
    email: 'pedidos@distribuidoradelcentro.com.ar',
    iibb: '280-584236-1 (Rentas Córdoba)',      // inscripción en la Dirección General de Rentas de Córdoba
    inicioActividades: '2014-03-01',
    puntoVenta: 3,
    hoy: '2026-11-26',
    desde: '2026-06-01',
    clave: 'dda-demo-v1',
    semilla: 26112026,
    ventaSemanalObjetivo: 43000000,             // neto de IVA, para calibrar la historia
    pie: 'Demo hecha por MyM Soluciones para Leandro · noviembre 2026',
    avisoCAE: 'En la versión productiva, el CAE es otorgado por ARCA (web service de factura electrónica).'
  };

  // ---------- azar determinístico ----------
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function azar(semilla) {
    const r = mulberry32(semilla);
    return {
      r,
      entre: (a, b) => a + Math.floor(r() * (b - a + 1)),
      real: (a, b) => a + r() * (b - a),
      uno: arr => arr[Math.floor(r() * arr.length)],
      prob: p => r() < p
    };
  }

  // ---------- CUIT y EAN válidos ----------
  function cuit(prefijo, cuerpo8) {
    const base = String(prefijo) + String(cuerpo8).padStart(8, '0');
    const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    let s = 0;
    for (let i = 0; i < 10; i++) s += Number(base[i]) * pesos[i];
    let dv = 11 - (s % 11);
    if (dv === 11) dv = 0;
    if (dv === 10) dv = 9;
    return base.slice(0, 2) + '-' + base.slice(2) + '-' + dv;
  }
  function digitoEAN(doce) {
    let s = 0;
    for (let i = 0; i < 12; i++) s += Number(doce[i]) * (i % 2 ? 3 : 1);
    return String((10 - (s % 10)) % 10);
  }
  CONFIG.cuit = cuit(30, 71584236);

  // ---------- catálogo ----------
  // [descripción, marca, unidad de venta, contenido, IVA, costo por unidad de venta, popularidad, vida útil en días (null = no vence)]
  const RUBROS = {
    'Almacén': [
      ['Yerba mate con palo 1 kg', 'Tranquera Roja', 'Bulto x 10', 10, 21, 36500, 2.2, 420],
      ['Yerba mate suave 500 g', 'Tranquera Roja', 'Bulto x 20', 20, 21, 38000, 1.2, 420],
      ['Azúcar común 1 kg', 'Ingenio del Norte', 'Bulto x 10', 10, 21, 11800, 1.8, 720],
      ['Arroz largo fino 1 kg', 'Campo Litoral', 'Bulto x 10', 10, 21, 15600, 1.4, 540],
      ['Fideos tirabuzón 500 g', 'Molino Pampa', 'Bulto x 20', 20, 21, 21400, 1.5, 365],
      ['Fideos spaghetti 500 g', 'Molino Pampa', 'Bulto x 20', 20, 21, 21400, 1.3, 365],
      ['Harina 000 1 kg', 'Molino Pampa', 'Bulto x 10', 10, 10.5, 7900, 1.5, 240],
      ['Harina leudante 1 kg', 'Molino Pampa', 'Bulto x 10', 10, 10.5, 10200, 0.8, 240],
      ['Aceite de girasol 1,5 L', 'Girasol Dorado', 'Caja x 12', 12, 21, 45600, 1.7, 540],
      ['Aceite mezcla 900 ml', 'Girasol Dorado', 'Caja x 12', 12, 21, 24000, 0.9, 540],
      ['Puré de tomate 520 g', 'Huerta Buena', 'Caja x 24', 24, 21, 22800, 1.3, 600],
      ['Arvejas en lata 300 g', 'Huerta Buena', 'Caja x 24', 24, 21, 19200, 0.6, 900],
      ['Atún en aceite 170 g', 'Costa Atlántica', 'Caja x 24', 24, 21, 52800, 0.7, 900],
      ['Sal fina 500 g', 'Salinas del Sur', 'Bulto x 20', 20, 21, 9400, 0.8, null],
      ['Galletitas de agua 300 g', 'Horno Criollo', 'Caja x 20', 20, 10.5, 24000, 1.4, 180],
      ['Galletitas dulces surtidas 400 g', 'Horno Criollo', 'Caja x 16', 16, 10.5, 25600, 1.0, 180],
      ['Mayonesa 475 g', 'Huerta Buena', 'Caja x 12', 12, 21, 21600, 1.0, 270],
      ['Café molido 500 g', 'Tostadero Sur', 'Caja x 12', 12, 21, 66000, 0.6, 365],
      ['Té en saquitos x 50', 'Tranquera Roja', 'Caja x 12', 12, 21, 18000, 0.6, 540],
      ['Polenta instantánea 500 g', 'Molino Pampa', 'Bulto x 20', 20, 21, 14000, 0.7, 365]
    ],
    'Bebidas': [
      ['Gaseosa cola 2,25 L', 'Burbuja', 'Pack x 6', 6, 21, 13800, 2.4, 180],
      ['Gaseosa lima limón 2,25 L', 'Burbuja', 'Pack x 6', 6, 21, 12600, 1.2, 180],
      ['Gaseosa naranja 2,25 L', 'Burbuja', 'Pack x 6', 6, 21, 12600, 1.0, 180],
      ['Agua mineral sin gas 2 L', 'Manantial Serrano', 'Pack x 6', 6, 21, 5700, 1.4, 365],
      ['Agua con gas 1,5 L', 'Manantial Serrano', 'Pack x 6', 6, 21, 5400, 0.7, 365],
      ['Jugo en polvo naranja', 'Fruti', 'Display x 18', 18, 21, 5400, 0.9, 540],
      ['Jugo de naranja 1 L', 'Valle Frutal', 'Caja x 8', 8, 21, 12000, 0.8, 240],
      ['Cerveza rubia lata 473 ml', 'Cervecería del Llano', 'Pack x 24', 24, 21, 33600, 1.5, 270],
      ['Agua saborizada pomelo 1,5 L', 'Manantial Serrano', 'Pack x 6', 6, 21, 7800, 0.9, 240],
      ['Soda en sifón 2 L', 'Burbuja', 'Pack x 6', 6, 21, 4800, 0.6, 365]
    ],
    'Lácteos y frescos': [
      ['Leche entera sachet 1 L', 'Granja del Sur', 'Caja x 12', 12, 10.5, 11400, 2.6, 10],
      ['Leche descremada sachet 1 L', 'Granja del Sur', 'Caja x 12', 12, 10.5, 11400, 1.0, 10],
      ['Yogur bebible frutilla 1 L', 'Granja del Sur', 'Caja x 6', 6, 21, 10800, 0.9, 20],
      ['Queso cremoso (horma 4 kg)', 'Tambo Las Lomas', 'Horma x 4 kg', 1, 21, 30000, 0.8, 35],
      ['Manteca 200 g', 'Granja del Sur', 'Caja x 20', 20, 21, 32000, 0.7, 45],
      ['Dulce de leche 400 g', 'Tambo Las Lomas', 'Caja x 12', 12, 21, 24000, 1.0, 120],
      ['Crema de leche 200 ml', 'Granja del Sur', 'Caja x 12', 12, 21, 15600, 0.5, 18],
      ['Queso rallado 150 g', 'Tambo Las Lomas', 'Caja x 12', 12, 21, 26400, 0.6, 60],
      ['Salchichas x 6 u.', 'Frigorífico Pampeano', 'Caja x 12', 12, 21, 18000, 0.8, 30],
      ['Pan lactal 550 g', 'Horno Criollo', 'Bulto x 8', 8, 10.5, 14400, 0.9, 7]
    ],
    'Limpieza': [
      ['Lavandina 1 L', 'Brillo Hogar', 'Caja x 12', 12, 21, 8400, 1.4, null],
      ['Detergente 750 ml', 'Brillo Hogar', 'Caja x 12', 12, 21, 18000, 1.2, null],
      ['Jabón en polvo 800 g', 'Espuma Blanca', 'Caja x 12', 12, 21, 33600, 0.9, null],
      ['Suavizante 900 ml', 'Espuma Blanca', 'Caja x 12', 12, 21, 21600, 0.7, null],
      ['Limpiador de pisos lavanda 900 ml', 'Brillo Hogar', 'Caja x 12', 12, 21, 14400, 0.8, null],
      ['Esponja multiuso', 'Brillo Hogar', 'Display x 12', 12, 21, 6000, 0.6, null],
      ['Bolsas de residuo 50x70 x 10', 'Brillo Hogar', 'Bulto x 10', 10, 21, 9000, 0.6, null],
      ['Papel higiénico 4 rollos', 'Suave Nube', 'Bulto x 12', 12, 21, 33600, 1.1, null]
    ],
    'Perfumería': [
      ['Shampoo 400 ml', 'Flor de Azahar', 'Caja x 12', 12, 21, 30000, 0.8, 900],
      ['Acondicionador 400 ml', 'Flor de Azahar', 'Caja x 12', 12, 21, 30000, 0.6, 900],
      ['Jabón de tocador 90 g', 'Flor de Azahar', 'Caja x 48', 48, 21, 28800, 0.8, null],
      ['Desodorante aerosol 150 ml', 'Brisa', 'Caja x 12', 12, 21, 36000, 0.7, 900],
      ['Pasta dental 90 g', 'Sonrisa', 'Caja x 12', 12, 21, 16800, 0.8, 720],
      ['Pañales talle G x 30', 'Suave Nube', 'Bulto x 4', 4, 21, 64000, 0.6, null]
    ],
    'Golosinas': [
      ['Alfajor triple chocolate', 'Dulce Pampa', 'Caja x 24', 24, 21, 21600, 1.6, 120],
      ['Caramelos masticables 800 g', 'Dulce Pampa', 'Bulto x 6', 6, 21, 24000, 0.8, 360],
      ['Chicles de menta', 'Dulce Pampa', 'Display x 20', 20, 21, 7200, 0.9, 360],
      ['Chocolate con leche 100 g', 'Cacao Andino', 'Caja x 20', 20, 21, 36000, 0.9, 270],
      ['Turrón de maní', 'Dulce Pampa', 'Caja x 50', 50, 21, 12500, 1.0, 180],
      ['Papas fritas 140 g', 'Crocante', 'Caja x 12', 12, 21, 24000, 1.2, 120],
      ['Chupetines frutales', 'Dulce Pampa', 'Caja x 48', 48, 21, 6200, 0.7, 360]
    ]
  };
  const PREFIJO_RUBRO = { 'Almacén': 'ALM', 'Bebidas': 'BEB', 'Lácteos y frescos': 'LAC', 'Limpieza': 'LIM', 'Perfumería': 'PER', 'Golosinas': 'GOL' };
  // margen sobre costo por lista, ajustado por rubro (lo que deja cada rubro)
  const LISTAS = [
    { id: 'L1', nombre: 'Mayorista', recargo: 0.23, detalle: 'Supermercados y compras grandes' },
    { id: 'L2', nombre: 'Almacén', recargo: 0.37, detalle: 'Almacenes, kioscos y mostrador' },
    { id: 'L3', nombre: 'Autoservicio', recargo: 0.305, detalle: 'Autoservicios y minimercados' }
  ];
  const FACTOR_RUBRO = { 'Almacén': 0.85, 'Bebidas': 0.95, 'Lácteos y frescos': 1.0, 'Limpieza': 1.1, 'Perfumería': 1.25, 'Golosinas': 1.3 };

  // [id, razón social, marcas, plazo, domicilio, correo, característica telefónica sin el 0]
  const PROVEEDORES = [
    ['v1', 'Molinos Pampa S.A.', ['Molino Pampa', 'Campo Litoral', 'Salinas del Sur'], 30, 'Ruta 7 km 52, Luján, Provincia de Buenos Aires', 'ventas@molinospampa.com.ar', '2323'],
    ['v2', 'Alimentos del Litoral S.A.', ['Tranquera Roja', 'Ingenio del Norte', 'Tostadero Sur', 'Girasol Dorado'], 30, 'Av. Circunvalación 2.100, Rosario, Santa Fe', 'pedidos@alimentoslitoral.com.ar', '341'],
    ['v3', 'Conservas Huerta Buena S.A.', ['Huerta Buena', 'Costa Atlántica'], 30, 'Parque Industrial, San Rafael, Mendoza', 'comercial@huertabuena.com.ar', '260'],
    ['v4', 'Embotelladora Burbuja S.A.', ['Burbuja', 'Manantial Serrano', 'Fruti', 'Valle Frutal', 'Cervecería del Llano'], 21, 'Av. Circunvalación 6.800, Córdoba', 'distribuidores@burbuja.com.ar', '351'],
    ['v5', 'Lácteos Granja del Sur S.A.', ['Granja del Sur', 'Tambo Las Lomas', 'Frigorífico Pampeano'], 15, 'Ruta Nacional 158 km 145, General Deheza, Córdoba', 'pedidos@granjadelsur.com.ar', '358'],
    ['v6', 'Panificadora Horno Criollo S.A.', ['Horno Criollo'], 21, 'Parque Industrial Villa María, lote 12, Villa María, Córdoba', 'ventas@hornocriollo.com.ar', '353'],
    ['v7', 'Higiene Brillo Hogar S.A.', ['Brillo Hogar', 'Espuma Blanca', 'Suave Nube', 'Flor de Azahar', 'Brisa', 'Sonrisa'], 30, 'Parque Industrial Pilar, lote 41, Provincia de Buenos Aires', 'clientes@brillohogar.com.ar', '230'],
    ['v8', 'Golosinas Dulce Pampa S.A.', ['Dulce Pampa', 'Cacao Andino', 'Crocante'], 30, 'Av. Japón 1.500, Córdoba', 'mayoristas@dulcepampa.com.ar', '351']
  ];

  // quienes facturan los gastos del mes (Responsables Inscriptos inventados)
  const PRESTADORES = {
    '5.2.03': ['Estación de Servicio El Cruce S.R.L.', 71230455, 'Combustible'],
    '5.2.04': ['Transportes Ruta 9 S.A.', 71458812, 'Fletes'],
    '5.2.05': ['Taller Mecánico Villa Nueva S.R.L.', 71902317, 'Mantenimiento de vehículos'],
    '5.3.02': ['Inversora del Ctalamochita S.A.', 70815544, 'Alquiler'],
    '5.3.03': ['Servicios Energéticos del Centro S.A.', 70122987, 'Luz, gas e internet'],
    '5.3.04': ['Estudio Contable Ferrari y Asociados', 71644020, 'Honorarios'],
    '5.4.01': ['Banco del Plata S.A.', 70049813, 'Comisiones bancarias']
  };

  // Zonas de reparto en Villa María y su zona de influencia. pv4 se abastece desde la sucursal de Bell Ville (D2).
  const PREVENTISTAS = [
    ['pv1', 'Carina Medina', 'Villa María', '353 456-1201'],
    ['pv2', 'Julián Ferreyra', 'Villa Nueva y sur', '353 456-1202'],
    ['pv3', 'Romina Ledesma', 'Norte por ruta 158', '353 456-1203'],
    ['pv4', 'Diego Acosta', 'Bell Ville y ruta 9', '3537 58-1204']
  ];
  const CHOFERES = [
    ['ch1', 'Hugo Benítez', 'B1 y C1', '353 552-3301'],
    ['ch2', 'Marcelo Sosa', 'C1', '353 552-3302'],
    ['ch3', 'Ezequiel Ríos', 'C1', '3537 52-3303']
  ];
  const VEHICULOS = [
    ['ve1', 'Camión 3/4 con caja térmica', 'AF 482 KD', 5500],
    ['ve2', 'Camión 3/4', 'AD 917 PL', 5000],
    ['ve3', 'Camión liviano', 'AG 105 RT', 3500]
  ];

  // [fantasía, razón social, tipo, condición IVA, localidad, dirección, preventista, tamaño, visitas, plazo, comportamiento, medio]
  const CLIENTES = [
    // pv1: Villa María, centro y barrios (incluye la venta de mostrador en el depósito)
    ['Almacén Doña Rosa', 'Gómez, Rosa Beatriz', 'Almacén', 'MT', 'Villa María', 'Mendoza 845', 'pv1', 1.1, ['lun', 'jue'], 7, 'buena', 'efectivo'],
    ['Autoservicio Los Tilos', 'Los Tilos S.R.L.', 'Autoservicio', 'RI', 'Villa María', 'Bv. Vélez Sarsfield 1.620', 'pv1', 2.6, ['lun', 'jue'], 30, 'buena', 'echeq'],
    ['Kiosco La Terminal', 'Paz, Martín Ezequiel', 'Kiosco', 'MT', 'Villa María', 'Catamarca 512', 'pv1', 0.4, ['mar'], 0, 'buena', 'efectivo'],
    ['Despensa Mi Barrio', 'Rojas, Silvia Noemí', 'Almacén', 'MT', 'Villa María', 'Corrientes 1.030', 'pv1', 0.9, ['lun', 'jue'], 7, 'regular', 'transferencia'],
    ['Supermercado La Villa', 'La Villa Alimentos S.A.', 'Supermercado', 'RI', 'Villa María', 'Bv. Alvear 2.340', 'pv1', 5.2, ['lun', 'mie', 'vie'], 30, 'buena', 'cheque'],
    ['Maxikiosco La Costanera', 'Duarte, Pablo Andrés', 'Kiosco', 'MT', 'Villa María', 'Av. Costanera 1.075', 'pv1', 0.6, ['mie'], 0, 'buena', 'efectivo'],
    ['Almacén Los Primos', 'Vera, Claudio Hernán', 'Almacén', 'MT', 'Villa María', 'Santa Fe 1.410', 'pv1', 0.8, ['mar', 'vie'], 7, 'morosa', 'efectivo'],
    ['Almacén San Cayetano', 'Benítez, Norma Liliana', 'Almacén', 'MT', 'Villa María', 'Tucumán 990', 'pv1', 1.0, ['jue'], 15, 'buena', 'transferencia'],
    ['Consumidor Final (mostrador)', 'Consumidor Final', 'Mostrador', 'CF', 'Villa María', 'Venta en el depósito', 'pv1', 0.5, ['sab'], 0, 'buena', 'efectivo'],
    // pv2: Villa Nueva y el sur (Ticino, Arroyo Cabral, Luca)
    ['Autoservicio Villa Nueva', 'Comercial Villa Nueva S.R.L.', 'Autoservicio', 'RI', 'Villa Nueva', 'San Martín 1.150', 'pv2', 2.4, ['mar', 'vie'], 30, 'regular', 'echeq'],
    ['Almacén La Esquina', 'Morales, Juan Carlos', 'Almacén', 'MT', 'Villa Nueva', 'Mitre 640', 'pv2', 1.0, ['mar', 'vie'], 7, 'buena', 'transferencia'],
    ['Kiosco Ticino Centro', 'Sánchez, Lucía Belén', 'Kiosco', 'MT', 'Ticino', 'Av. San Martín 180', 'pv2', 0.45, ['mie'], 0, 'buena', 'efectivo'],
    ['Minimercado Don Bosco', 'Don Bosco Comercial S.R.L.', 'Autoservicio', 'RI', 'Villa Nueva', 'Sarmiento 1.022', 'pv2', 2.1, ['mar', 'vie'], 15, 'buena', 'transferencia'],
    ['Almacén El Progreso', 'Ibáñez, Ricardo Omar', 'Almacén', 'MT', 'Arroyo Cabral', 'Belgrano 455', 'pv2', 0.9, ['mar', 'sab'], 7, 'regular', 'efectivo'],
    ['Despensa Las Heras', 'Correa, Mónica Graciela', 'Almacén', 'MT', 'Villa Nueva', 'Las Heras 1.010', 'pv2', 0.8, ['vie'], 7, 'buena', 'transferencia'],
    ['Maxikiosco 24 Horas', 'Ortiz, Gabriel Alejandro', 'Kiosco', 'MT', 'Villa Nueva', 'Independencia 115', 'pv2', 0.7, ['mar', 'vie'], 0, 'buena', 'efectivo'],
    ['Almacén Doña Chela', 'Romero, Graciela Inés', 'Almacén', 'MT', 'Luca', 'Rivadavia 230', 'pv2', 0.7, ['mie'], 7, 'morosa', 'efectivo'],
    ['Comedor Comunitario Los Gurises', 'Asociación Civil Los Gurises', 'Institución', 'EX', 'Arroyo Cabral', '25 de Mayo 200', 'pv2', 1.2, ['jue'], 30, 'regular', 'transferencia'],
    // pv3: norte por la ruta 158 (Arroyo Algodón, La Playosa, Pozo del Molle, Las Varillas)
    ['Autoservicio Las Varillas', 'Varillense Alimentos S.R.L.', 'Autoservicio', 'RI', 'Las Varillas', 'Av. San Martín 540', 'pv3', 2.3, ['lun', 'jue'], 30, 'buena', 'echeq'],
    ['Almacén Los Hermanos', 'Giménez, Ramón Darío', 'Almacén', 'MT', 'Pozo del Molle', 'Av. Libertador 880', 'pv3', 1.1, ['lun', 'jue'], 7, 'buena', 'efectivo'],
    ['Kiosco La Plaza', 'Molina, Florencia Soledad', 'Kiosco', 'MT', 'Arroyo Algodón', 'Belgrano 302', 'pv3', 0.4, ['sab'], 0, 'buena', 'efectivo'],
    ['Despensa El Sol', 'Herrera, Patricia Alicia', 'Almacén', 'MT', 'Las Varillas', 'Vélez Sarsfield 1.145', 'pv3', 0.85, ['mie', 'sab'], 7, 'buena', 'transferencia'],
    ['Supermercado Norte Cordobés', 'Norte Cordobés Supermercados S.A.', 'Supermercado', 'RI', 'Las Varillas', '25 de Mayo 1.400', 'pv3', 4.6, ['lun', 'mie', 'vie'], 30, 'buena', 'cheque'],
    ['Almacén Santa Lucía', 'Aguirre, Sergio Fabián', 'Almacén', 'MT', 'La Playosa', 'San Martín 867', 'pv3', 0.9, ['jue'], 15, 'regular', 'transferencia'],
    ['Maxikiosco La Ruta', 'Luna, Diego Martín', 'Kiosco', 'MT', 'Arroyo Algodón', 'Ruta Nacional 158 y Sarmiento', 'pv3', 0.55, ['mie'], 0, 'buena', 'efectivo'],
    ['Almacén Mi Lugar', 'Cabrera, Elena Susana', 'Almacén', 'MT', 'Pozo del Molle', 'Echeverría 230', 'pv3', 0.75, ['lun'], 7, 'morosa', 'efectivo'],
    ['Autoservicio Libertad', 'Libertad Comercial S.R.L.', 'Autoservicio', 'RI', 'Las Varillas', 'Saavedra 560', 'pv3', 1.9, ['mie', 'sab'], 15, 'buena', 'transferencia'],
    // pv4: este por la ruta 9 (Bell Ville, Ballesteros, Morrison); se abastece desde la sucursal de Bell Ville
    ['Supermercado Plaza Bell Ville', 'Plaza Bell Ville S.A.', 'Supermercado', 'RI', 'Bell Ville', 'Córdoba 1.050', 'pv4', 4.4, ['mar', 'jue', 'sab'], 30, 'buena', 'echeq'],
    ['Almacén Don Tito', 'Suárez, Alberto Rubén', 'Almacén', 'MT', 'Bell Ville', 'Rivadavia 320', 'pv4', 1.0, ['mar', 'vie'], 7, 'buena', 'efectivo'],
    ['Kiosco Ballesteros', 'Navarro, Camila Abril', 'Kiosco', 'MT', 'Ballesteros', 'San Martín 101', 'pv4', 0.45, ['jue'], 0, 'buena', 'efectivo'],
    ['Autoservicio Morrison', 'Morrison Express S.R.L.', 'Autoservicio', 'RI', 'Morrison', 'Bv. Belgrano 700', 'pv4', 2.2, ['mar', 'vie'], 30, 'regular', 'echeq'],
    ['Despensa La Familia', 'Ponce, Verónica Laura', 'Almacén', 'MT', 'Bell Ville', 'Mitre 1.115', 'pv4', 0.9, ['mar', 'vie'], 7, 'buena', 'transferencia'],
    ['Almacén El Trigal', 'Medina, Oscar Alfredo', 'Almacén', 'MT', 'Ballesteros', 'Sarmiento 640', 'pv4', 0.8, ['jue'], 7, 'buena', 'transferencia'],
    ['Maxikiosco El Puente', 'Ríos, Tomás Agustín', 'Kiosco', 'MT', 'Bell Ville', 'Bv. Ascasubi 85', 'pv4', 0.5, ['mar', 'sab'], 0, 'buena', 'efectivo'],
    ['Almacén Las Golondrinas', 'Figueroa, Mirta Raquel', 'Almacén', 'MT', 'Morrison', 'Belgrano 320', 'pv4', 0.8, ['vie'], 15, 'morosa', 'transferencia']
  ];
  // característica telefónica de cada localidad, sin el 0
  const CARACTERISTICA = {
    'Villa María': '353', 'Villa Nueva': '353', 'Ticino': '353', 'Arroyo Cabral': '353', 'Luca': '353',
    'Arroyo Algodón': '353', 'La Playosa': '353', 'Pozo del Molle': '3533', 'Las Varillas': '3533',
    'Bell Ville': '3537', 'Ballesteros': '3537', 'Morrison': '3537'
  };
  // teléfono fijo de 10 dígitos en total: característica y número local («0353 452-1234», «03537 42-1234», «011 4512-3456»)
  function telFijo(area, cabeza, cola) {
    return '0' + area + ' ' + String(cabeza).slice(0, 6 - area.length) + '-' + cola;
  }

  // Qué compra cada tipo de cliente (peso por rubro)
  const AFINIDAD = {
    'Kiosco': { 'Almacén': 0.10, 'Bebidas': 0.35, 'Lácteos y frescos': 0.10, 'Limpieza': 0.03, 'Perfumería': 0.05, 'Golosinas': 0.37 },
    'Almacén': { 'Almacén': 0.40, 'Bebidas': 0.20, 'Lácteos y frescos': 0.17, 'Limpieza': 0.10, 'Perfumería': 0.05, 'Golosinas': 0.08 },
    'Autoservicio': { 'Almacén': 0.33, 'Bebidas': 0.20, 'Lácteos y frescos': 0.15, 'Limpieza': 0.14, 'Perfumería': 0.10, 'Golosinas': 0.08 },
    'Supermercado': { 'Almacén': 0.33, 'Bebidas': 0.20, 'Lácteos y frescos': 0.15, 'Limpieza': 0.14, 'Perfumería': 0.10, 'Golosinas': 0.08 },
    'Mostrador': { 'Almacén': 0.50, 'Bebidas': 0.15, 'Lácteos y frescos': 0.20, 'Limpieza': 0.10, 'Perfumería': 0.02, 'Golosinas': 0.03 },
    'Institución': { 'Almacén': 0.55, 'Bebidas': 0.10, 'Lácteos y frescos': 0.25, 'Limpieza': 0.08, 'Perfumería': 0.01, 'Golosinas': 0.01 }
  };
  const LISTA_POR_TIPO = { 'Supermercado': 'L1', 'Autoservicio': 'L3', 'Almacén': 'L2', 'Kiosco': 'L2', 'Mostrador': 'L2', 'Institución': 'L2' };
  const LIMITE_POR_TIPO = { 'Supermercado': 30000000, 'Autoservicio': 12000000, 'Almacén': 3500000, 'Kiosco': 1200000, 'Mostrador': 500000, 'Institución': 4000000 };

  // ---------- plan de cuentas ----------
  const PLAN = [
    ['1', 'Activo', 'activo', false], ['1.1', 'Activo corriente', 'activo', false],
    ['1.1.01', 'Caja', 'activo', true], ['1.1.02', 'Banco cuenta corriente', 'activo', true],
    ['1.1.03', 'Valores a depositar', 'activo', true], ['1.1.04', 'Deudores por ventas', 'activo', true],
    ['1.1.05', 'IVA crédito fiscal', 'activo', true], ['1.1.06', 'Mercaderías', 'activo', true],
    ['1.1.07', 'Anticipos y retenciones de ganancias', 'activo', true], ['1.1.08', 'Percepciones y retenciones de IIBB', 'activo', true],
    ['1.1.09', 'Percepciones y retenciones de IVA', 'activo', true],
    ['1.2', 'Activo no corriente', 'activo', false], ['1.2.01', 'Rodados', 'activo', true],
    ['1.2.02', 'Instalaciones y equipos', 'activo', true],
    ['2', 'Pasivo', 'pasivo', false], ['2.1', 'Pasivo corriente', 'pasivo', false],
    ['2.1.01', 'Proveedores', 'pasivo', true], ['2.1.02', 'IVA débito fiscal', 'pasivo', true],
    ['2.1.03', 'Sueldos a pagar', 'pasivo', true], ['2.1.04', 'Ingresos Brutos a pagar', 'pasivo', true],
    ['2.1.05', 'Impuesto a las ganancias a pagar', 'pasivo', true], ['2.1.06', 'Acreedores varios', 'pasivo', true],
    ['2.1.07', 'Cheques diferidos a pagar', 'pasivo', true], ['2.1.08', 'Cargas sociales a pagar (F.931)', 'pasivo', true],
    ['2.1.09', 'Provisión de SAC', 'pasivo', true], ['2.1.10', 'Comisiones a pagar', 'pasivo', true],
    ['3', 'Patrimonio neto', 'patrimonio', false], ['3.1.01', 'Capital social', 'patrimonio', true],
    ['3.1.02', 'Resultados no asignados', 'patrimonio', true],
    ['4', 'Ingresos', 'ingreso', false], ['4.1.01', 'Ventas', 'ingreso', true, 'ventas'],
    ['4.1.02', 'Devoluciones sobre ventas', 'ingreso', true, 'devoluciones'],
    ['5', 'Egresos', 'egreso', false], ['5.1', 'Costo de ventas', 'egreso', false],
    ['5.1.01', 'Costo de mercaderías vendidas', 'egreso', true, 'cmv'],
    ['5.1.02', 'Diferencias de inventario', 'egreso', true, 'cmv'],
    ['5.2', 'Gastos de comercialización', 'egreso', false],
    ['5.2.01', 'Sueldos de depósito y reparto', 'egreso', true, 'comerciales'],
    ['5.2.06', 'Cargas sociales de depósito y reparto', 'egreso', true, 'comerciales'],
    ['5.2.02', 'Comisiones de preventistas', 'egreso', true, 'comerciales'],
    ['5.2.03', 'Combustible', 'egreso', true, 'comerciales'],
    ['5.2.04', 'Fletes', 'egreso', true, 'comerciales'],
    ['5.2.05', 'Mantenimiento de vehículos', 'egreso', true, 'comerciales'],
    ['5.3', 'Gastos de administración', 'egreso', false],
    ['5.3.01', 'Sueldos de administración', 'egreso', true, 'administracion'],
    ['5.3.05', 'Cargas sociales de administración', 'egreso', true, 'administracion'],
    ['5.3.02', 'Alquiler del depósito', 'egreso', true, 'administracion'],
    ['5.3.03', 'Servicios (luz, gas, internet)', 'egreso', true, 'administracion'],
    ['5.3.04', 'Honorarios profesionales', 'egreso', true, 'administracion'],
    ['5.4', 'Gastos financieros', 'egreso', false],
    ['5.4.01', 'Comisiones bancarias', 'egreso', true, 'financieros'],
    ['5.4.02', 'Impuesto a los débitos y créditos', 'egreso', true, 'financieros'],
    ['5.5.01', 'Ingresos Brutos', 'egreso', true, 'iibb'],
    ['5.6.01', 'Impuesto a las ganancias', 'egreso', true, 'ganancias']
  ];

  // ---------- maestros ----------
  function maestros() {
    const z = azar(CONFIG.semilla);
    const productos = [];
    let marcaIdx = {};
    let n = 0;
    Object.keys(RUBROS).forEach(rubro => {
      RUBROS[rubro].forEach((t, i) => {
        n++;
        const [descripcion, marca, unidad, contenido, iva, costo, pop, vida] = t;
        if (!(marca in marcaIdx)) marcaIdx[marca] = 1000 + Object.keys(marcaIdx).length * 37;
        const doce = '779' + String(marcaIdx[marca]).padStart(4, '0') + String(10000 + n * 113).slice(-5);
        const precios = {};
        LISTAS.forEach(l => { precios[l.id] = Math.round(costo * (1 + l.recargo * FACTOR_RUBRO[rubro])); });
        const prov = PROVEEDORES.find(p => p[2].includes(marca));
        productos.push({
          id: 'p' + String(n).padStart(2, '0'),
          codigo: PREFIJO_RUBRO[rubro] + '-' + String(i + 1).padStart(3, '0'),
          ean: doce + digitoEAN(doce),
          descripcion, marca, rubro, unidad, contenido, iva, costo, precios,
          proveedorId: prov ? prov[0] : 'v1',
          vidaUtil: vida, fresco: vida !== null && vida <= 45,
          popularidad: pop, minimo: 0, activo: true,
          // bonificación por cantidad en los productos de más rotación: llevando 10 bultos, 5 % menos
          escalaBonif: pop >= 1.4 ? [{ desde: 10, pct: 5 }] : [],
          pesoKg: Math.round((contenido * (rubro === 'Bebidas' ? 1.6 : 0.6)) * 10) / 10
        });
      });
    });

    const clientes = CLIENTES.map((t, i) => {
      const [fantasia, razonSocial, tipo, cond, localidad, direccion, pv, tamano, visitas, plazo, comportamiento, medio] = t;
      const empresa = cond === 'RI' || cond === 'EX';
      const doc = cond === 'CF' ? '' : empresa
        ? cuit(30, 70000000 + z.entre(1000000, 9999999))
        : cuit(z.prob(0.5) ? 20 : 27, z.entre(18000000, 39000000));
      return {
        id: 'c' + String(i + 1).padStart(2, '0'),
        codigo: 'CL-' + String(101 + i),
        fantasia, razonSocial, tipo, condicionIVA: cond, cuit: doc,
        direccion, localidad, preventistaId: pv,
        zona: PREVENTISTAS.find(p => p[0] === pv)[2],
        depositoId: pv === 'pv4' ? 'D2' : 'D1',
        listaId: LISTA_POR_TIPO[tipo],
        limiteCredito: LIMITE_POR_TIPO[tipo],
        diasVisita: visitas, plazo,
        telefono: telFijo(CARACTERISTICA[localidad] || '353', z.entre(4000, 6999), z.entre(1000, 9999)),
        email: cond === 'CF' ? '' : fantasia.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '') .slice(0, 18) + '@gmail.com',
        comportamiento, medioPreferido: medio, tamano,
        activo: true
      };
    });

    const listasPrecio = LISTAS.map(l => ({ id: l.id, nombre: l.nombre, recargo: l.recargo, detalle: l.detalle }));
    const proveedores = PROVEEDORES.map((t, i) => ({
      id: t[0], codigo: 'PR-' + String(201 + i), razonSocial: t[1], cuit: cuit(30, 70000000 + z.entre(1000000, 9999999)),
      condicionIVA: 'RI', marcas: t[2], plazo: t[3], direccion: t[4], email: t[5],
      telefono: telFijo(t[6], '4' + z.entre(100, 999), z.entre(1000, 9999)), activo: true
    }));
    const preventistas = PREVENTISTAS.map(t => ({ id: t[0], nombre: t[1], zona: t[2], telefono: t[3], comision: 0.02, activo: true }));
    const choferes = CHOFERES.map(t => ({ id: t[0], nombre: t[1], licencia: t[2], telefono: t[3], activo: true }));
    const vehiculos = VEHICULOS.map(t => ({ id: t[0], descripcion: t[1], patente: t[2], capacidadKg: t[3], activo: true }));
    const depositos = [
      { id: 'D1', nombre: 'Depósito Central', direccion: CONFIG.domicilio, activo: true },
      { id: 'D2', nombre: 'Sucursal Bell Ville', direccion: 'Ruta Nacional 9 km 501, Bell Ville (2550), Córdoba', activo: true }
    ];
    const planCuentas = PLAN.map(t => ({ codigo: t[0], id: t[0], nombre: t[1], tipo: t[2], imputable: t[3], grupoER: t[4] || null }));

    return {
      productos, depositos, lotes: [], clientes, proveedores, preventistas, choferes, vehiculos,
      pedidos: [], comprobantes: [], remitos: [], hojasRuta: [], recibos: [], cheques: [],
      ordenesCompra: [], comprasFacturas: [], pagos: [], movCtaCte: [], asientos: [], planCuentas,
      ajustesStock: [], listasPrecio,
      // numeración: siguen desde donde venía el negocio antes de la demo
      contadores: { FA: 1842, FB: 12761, NCA: 96, NCB: 418, R: 14603, RC: 8120, PE: 20450, OC: 3310, OP: 2205, HR: 4120, AS: 0, AJ: 0, TR: 0, id: 0 }
    };
  }

  // ---------- historia de 6 meses (usa las acciones del store) ----------
  function historia(App) {
    const A = App.acciones, q = App.q, db = App.db, F = App.f;
    const z = azar(CONFIG.semilla + 7);
    const hoy = CONFIG.hoy;
    const C = App.CUENTAS;
    const FACTOR_MES = { '06': 0.95, '07': 1.05, '08': 0.97, '09': 0.875, '10': 1.06, '11': 1.07 };
    const DIAS = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab'];
    const BANCOS = ['Banco del Plata', 'Banco Federal Pampeano', 'Banco Comercial del Centro', 'Banco Cooperativo Sur', 'Banco Mercantil Cordobés'];
    const sumaTam = db.clientes.reduce((s, c) => s + c.tamano, 0);
    const volSemanal = {};
    db.clientes.forEach(c => { volSemanal[c.id] = CONFIG.ventaSemanalObjetivo * c.tamano / sumaTam; });

    // demanda esperada semanal por producto y depósito (en unidades de venta)
    const popRubro = {};
    db.productos.forEach(p => { popRubro[p.rubro] = (popRubro[p.rubro] || 0) + p.popularidad; });
    const esperada = {};
    const clave = (d, p) => d + '|' + p;
    db.clientes.forEach(c => {
      db.productos.forEach(p => {
        const share = AFINIDAD[c.tipo][p.rubro] * p.popularidad / popRubro[p.rubro];
        const k = clave(c.depositoId, p.id);
        esperada[k] = (esperada[k] || 0) + volSemanal[c.id] * share / p.precios[c.listaId];
      });
    });
    db.productos.forEach(p => {
      const total = (esperada[clave('D1', p.id)] || 0) + (esperada[clave('D2', p.id)] || 0);
      p.minimo = Math.max(3, Math.ceil(total * (p.fresco ? 0.25 : 0.5)));
    });

    // existencia inicial al 31/05 (lotes) + asiento de apertura
    let valorInicial = 0;
    ['D1', 'D2'].forEach(dep => {
      db.productos.forEach(p => {
        const sem = esperada[clave(dep, p.id)] || 0;
        const cant = Math.ceil(sem * (p.fresco ? 0.6 : 2.6));
        if (cant <= 0) return;
        const ingreso = F.sumar(CONFIG.desde, p.fresco ? -2 : -z.entre(10, 40));
        App._crearLote({ productoId: p.id, depositoId: dep, cantidad: cant, costo: p.costo, ingreso,
          lote: 'L' + ingreso.slice(2).replace(/-/g, '') + '-' + z.entre(10, 99),
          vence: p.vidaUtil ? F.sumar(ingreso, p.vidaUtil) : null });
        valorInicial += cant * p.costo;
      });
    });
    valorInicial = App.r2(valorInicial);
    // sueldos brutos por mes: depósito y reparto (3 choferes, 4 en depósito y sucursal) y administración (2 personas y la encargada)
    const SUELDOS = [['5.2.01', '5.2.06', 8200000, 'depósito y reparto'], ['5.3.01', '5.3.05', 3150000, 'administración']];
    const CONTRIB = 0.24, APORTES = 0.17;            // contribuciones patronales y aportes del empleado (F.931)
    const brutoTotal = SUELDOS.reduce((s, x) => s + x[2], 0);
    const sac = { bruto: App.r2(brutoTotal * 5 / 12), contrib: App.r2(brutoTotal * CONTRIB * 5 / 12) };   // provisión de enero a mayo
    const BANCO_INICIAL = 86000000;
    A.asientoManual({ fecha: CONFIG.desde, detalle: 'Asiento de apertura (saldos al 31/05/2026)', origen: 'apertura', lineas: [
      { cuenta: C.caja, debe: 1500000 }, { cuenta: C.banco, debe: BANCO_INICIAL },
      { cuenta: C.mercaderias, debe: valorInicial }, { cuenta: '1.2.01', debe: 96000000 }, { cuenta: '1.2.02', debe: 18500000 },
      { cuenta: '2.1.09', haber: App.r2(sac.bruto + sac.contrib) },
      { cuenta: '3.1.01', haber: 120000000 }, { cuenta: '3.1.02', haber: App.r2(1500000 + BANCO_INICIAL + valorInicial + 96000000 + 18500000 - 120000000 - sac.bruto - sac.contrib) }
    ] });

    const demanda = Object.assign({}, esperada);      // se va ajustando con lo vendido
    const ventaSemana = {};
    const pendOC = {};                                 // cantidades pedidas y no recibidas
    const recepciones = {};                            // fecha → [ordenId]
    const fechaCobro = {};                             // comprobanteId → fecha en que lo paga
    const sinReponer = ['p13', 'p18', 'p49', 'p58'];   // productos que quedan bajo mínimo hoy (el proveedor no entregó)
    const choferDe = { pv1: 'ch1', pv2: 'ch2', pv3: 'ch1', pv4: 'ch3' };
    const vehiculoDe = { ch1: 've1', ch2: 've2', ch3: 've3' };
    let iibbAPagar = 0, cargasAPagar = 0;
    const costoNuevo = {};                             // costo que pasa a cobrar el proveedor desde su último aumento
    const PROV_GRANDES = ['v2', 'v4', 'v7'];            // agentes de percepción de IIBB (Rentas Córdoba); v4 además percibe IVA
    const esHabil = d => F.diaSemana(d) !== 0;
    const proxHabil = d => { let x = d; while (!esHabil(x)) x = F.sumar(x, 1); return x; };
    const esUltimoDelMes = d => F.mes(F.sumar(d, 1)) !== F.mes(d);
    const demora = (c) => c.comportamiento === 'buena' ? z.entre(0, 2) : c.comportamiento === 'regular' ? z.entre(3, 12) : z.entre(5, 15);

    function armarPedido(c, d, origen) {
      const m = FACTOR_MES[d.slice(5, 7)] || 1;
      const valor = volSemanal[c.id] / c.diasVisita.length * m * z.real(0.8, 1.2);
      const k = Math.max(3, Math.min(16, Math.round(3 + valor / 260000)));
      const candidatos = db.productos.map(p => ({ p, w: AFINIDAD[c.tipo][p.rubro] * p.popularidad / popRubro[p.rubro] }));
      const elegidos = [];
      for (let i = 0; i < k && candidatos.length; i++) {
        const tot = candidatos.reduce((s, x) => s + x.w, 0);
        let r = z.r() * tot, j = 0;
        while (j < candidatos.length - 1 && r > candidatos[j].w) { r -= candidatos[j].w; j++; }
        elegidos.push(candidatos.splice(j, 1)[0]);
      }
      const wTot = elegidos.reduce((s, x) => s + x.w, 0);
      const items = [];
      elegidos.forEach(({ p, w }) => {
        let cant = Math.max(1, Math.round(valor * w / wTot / p.precios[c.listaId]));
        const disp = q.stock(p.id, c.depositoId).disponible;
        cant = Math.min(cant, disp);
        if (cant > 0) items.push({ productoId: p.id, cantidad: cant });
      });
      if (!items.length) return null;
      const obs = origen === 'catalogo' ? 'Pedido ingresado desde el catálogo online' : '';
      return A.crearPedido({ clienteId: c.id, items, origen, obs, fecha: d });
    }

    function facturar(pedido, d) {
      const comp = A.facturarPedido(pedido.id, { fecha: d });
      const c = App.get('clientes', comp.clienteId);
      comp.items.forEach(it => { const k = clave(pedido.depositoId, it.productoId); ventaSemana[k] = (ventaSemana[k] || 0) + it.cantidad; });
      if (c.plazo > 0) fechaCobro[comp.id] = F.sumar(comp.vence, demora(c));
      return comp;
    }

    function reponer(d, soloFrescos) {
      const porProv = {};
      ['D1', 'D2'].forEach(dep => {
        db.productos.forEach(p => {
          if (soloFrescos !== p.fresco) return;
          if (sinReponer.includes(p.id) && d >= '2026-10-29') return;
          const k = clave(dep, p.id);
          const D = Math.max(demanda[k] || 0, (esperada[k] || 0) * 0.5);
          if (D < 0.3) return;
          const disp = q.stock(p.id, dep).disponible + (pendOC[k] || 0);
          // el punto de pedido nunca queda debajo del stock mínimo de la ficha
          const punto = Math.max(p.fresco ? D * 0.5 : D * 1.3, p.minimo * (dep === 'D1' ? 0.6 : 0.3));
          const hasta = Math.max(p.fresco ? D * 0.8 : D * 3, punto * 2.4);
          if (disp >= punto) return;
          const cant = Math.ceil(hasta - disp);
          if (cant <= 0) return;
          const kp = p.proveedorId + '|' + dep;
          (porProv[kp] = porProv[kp] || []).push({ productoId: p.id, cantidad: cant, costo: costoNuevo[p.id] || p.costo });
          pendOC[k] = (pendOC[k] || 0) + cant;
        });
      });
      Object.keys(porProv).forEach(kp => {
        const [prov, dep] = kp.split('|');
        const oc = A.crearOrdenCompra({ proveedorId: prov, items: porProv[kp], fecha: d, depositoId: dep });
        const llega = proxHabil(F.sumar(d, soloFrescos ? 1 : 2));
        (recepciones[llega] = recepciones[llega] || []).push(oc.id);
      });
    }

    function cobrar(d) {
      const porCliente = {};
      db.comprobantes.forEach(cp => {
        if (cp.clase !== 'factura' || !fechaCobro[cp.id] || fechaCobro[cp.id] > d) return;
        if (App.q.saldoComprobante(cp) <= 0.01) { delete fechaCobro[cp.id]; return; }
        (porCliente[cp.clienteId] = porCliente[cp.clienteId] || []).push(cp);
      });
      Object.keys(porCliente).forEach(cid => {
        const c = App.get('clientes', cid);
        const facturas = porCliente[cid];
        const moroso = c.comportamiento === 'morosa' && d >= '2026-09-01';
        let total = 0;
        const imput = facturas.map(f => {
          let imp = q.saldoComprobante(f);
          if (moroso) { imp = App.r2(imp * 0.55); fechaCobro[f.id] = F.sumar(d, z.entre(25, 40)); }
          else delete fechaCobro[f.id];
          total += imp;
          return { comprobanteId: f.id, importe: imp };
        }).filter(x => x.importe > 0);
        total = App.r2(total);
        if (total <= 0) return;
        let medios;
        const pref = c.medioPreferido;
        // los supermercados son agentes de retención de IIBB: retienen el 1,5 % del neto cobrado
        const ret = c.tipo === 'Supermercado' ? App.r2(total / 1.2 * 0.015) : 0;
        total = App.r2(total - ret);
        if (pref === 'efectivo') {
          medios = total > 1800000 ? [{ tipo: 'efectivo', importe: 1000000 }, { tipo: 'transferencia', importe: App.r2(total - 1000000) }] : [{ tipo: 'efectivo', importe: total }];
        } else if (pref === 'transferencia') {
          medios = [{ tipo: 'transferencia', importe: total }];
        } else {
          const dias = pref === 'echeq' ? z.entre(15, 45) : z.entre(20, 60);
          medios = [{ tipo: pref, importe: total, datos: {
            banco: z.uno(BANCOS), numero: String(z.entre(10000000, 99999999)), fechaPago: F.sumar(d, dias),
            librador: c.razonSocial, cuitLibrador: c.cuit } }];
        }
        if (ret > 0) medios.push({ tipo: 'retencion', importe: ret, datos: { impuesto: 'IIBB', certificado: '0001-' + String(z.entre(100000, 999999)).padStart(8, '0') } });
        A.registrarCobranza({ clienteId: cid, fecha: d, medios, imputaciones: imput });
      });
    }

    // facturas que se dejan sin pagar, para que la pantalla de vencimientos tenga algo vencido:
    // las de Conservas Huerta Buena que vencieron del 16 al 20/11
    const atrasada = f => f.proveedorId === 'v3' && f.vence >= '2026-11-14' && f.vence <= '2026-11-21';
    function pagarProveedores(d) {
      db.proveedores.forEach(pr => {
        const todas = db.comprasFacturas.filter(f => f.proveedorId === pr.id && f.vence <= d && App.r2(f.total - f.pagado) > 0.01);
        if (!todas.length) return;
        // para que «Vencido» no dé siempre $ 0, un proveedor queda con facturas atrasadas a hoy
        const vencidas = todas.filter(f => !atrasada(f));
        const usaCheques = z.prob(0.35);   // se sortea igual, así el resto de la historia no cambia
        if (!vencidas.length) return;
        const total = App.r2(vencidas.reduce((s, f) => s + f.total - f.pagado, 0));
        const medios = [];
        let resto = total;
        if (usaCheques) {
          const cartera = db.cheques.filter(ch => ch.estado === 'en_cartera' && ch.fechaPago > F.sumar(d, 3) && ch.fechaPago <= F.sumar(d, 40)).sort((a, b) => a.importe - b.importe);
          for (const ch of cartera) {
            if (ch.importe <= resto * 0.6 && medios.length < 2) { medios.push({ tipo: 'cheque', chequeId: ch.id, importe: ch.importe }); resto = App.r2(resto - ch.importe); }
          }
        }
        if (resto > 0) medios.push({ tipo: 'transferencia', importe: resto });
        A.registrarPago({ proveedorId: pr.id, fecha: d, medios, imputaciones: vencidas.map(f => ({ facturaId: f.id, importe: App.r2(f.total - f.pagado) })) });
      });
    }

    // escala del impuesto a las ganancias para sociedades (art. 73, valores 2026 estimados)
    function gananciasEscala(anual) {
      if (anual <= 0) return 0;
      if (anual <= 101679575) return anual * 0.25;
      if (anual <= 1016795752) return 25419894 + (anual - 101679575) * 0.30;
      return 295459531 + (anual - 1016795752) * 0.35;
    }
    const r2 = App.r2;
    // gasto con factura: separa neto, IVA 21 % (crédito fiscal) y lo no gravado, y lo deja en el libro IVA compras
    function gastoConFactura(d, cuenta, total, detalle, contra, gravado) {
      const pr = PRESTADORES[cuenta];
      const neto = r2(total * gravado / 1.21), iva = r2(neto * 0.21), noGravado = r2(total - neto - iva);
      const a = A.asientoManual({ fecha: d, detalle, origen: 'gasto', lineas: [{ cuenta, debe: r2(neto + noGravado) }, { cuenta: C.ivaCF, debe: iva }, { cuenta: contra, haber: total }] });
      a.compra = { letra: 'A', numero: String(z.entre(1, 9)).padStart(4, '0') + '-' + String(z.entre(100000, 99999999)).padStart(8, '0'), razonSocial: pr[0], cuit: cuit(30, pr[1]),
        concepto: pr[2], neto21: neto, iva21: iva, noGravado, total };
    }

    function cierreDeMes(d, parcial) {
      const ini = F.inicioMes(d);
      // en el mes en curso todo se devenga en proporción a los días transcurridos (mismo criterio para todos los gastos)
      const f = parcial ? Number(d.slice(8, 10)) / F.diasDelMes(d) : 1;
      const m = z.real(0.96, 1.04);
      const mes = F.nombreMes(d);
      const sufijo = ' de ' + mes + (parcial ? ' (devengado al ' + App.ui.fecha(d) + ')' : '');
      // sueldos: bruto + contribuciones, aportes y contribuciones a pagar (F.931) y 1/12 de SAC provisionado
      const paritaria = d >= '2026-09-01' ? 1.04 : 1;
      SUELDOS.forEach(([cS, cC, bruto, area]) => {
        const b = r2(bruto * paritaria * f), contrib = r2(b * CONTRIB), aportes = r2(b * APORTES);
        const sB = r2(b / 12), sC = r2(contrib / 12);
        sac.bruto = r2(sac.bruto + sB); sac.contrib = r2(sac.contrib + sC);
        cargasAPagar = r2(cargasAPagar + aportes + contrib);
        A.asientoManual({ fecha: d, detalle: 'Sueldos y cargas de ' + area + sufijo + ' con 1/12 de SAC', origen: 'gasto', lineas: [
          { cuenta: cS, debe: r2(b + sB) }, { cuenta: cC, debe: r2(contrib + sC) },
          { cuenta: parcial ? '2.1.03' : C.banco, haber: r2(b - aportes) }, { cuenta: '2.1.08', haber: r2(aportes + contrib) }, { cuenta: '2.1.09', haber: r2(sB + sC) }] });
      });
      // aguinaldo de junio: se paga lo provisionado del semestre
      if (!parcial && d.slice(5, 7) === '06') {
        const ret = r2(sac.bruto * APORTES);
        cargasAPagar = r2(cargasAPagar + ret + sac.contrib);
        A.asientoManual({ fecha: d, detalle: 'Pago del SAC (aguinaldo) del primer semestre', origen: 'gasto', lineas: [
          { cuenta: '2.1.09', debe: r2(sac.bruto + sac.contrib) }, { cuenta: C.banco, haber: r2(sac.bruto - ret) }, { cuenta: '2.1.08', haber: r2(ret + sac.contrib) }] });
        sac.bruto = 0; sac.contrib = 0;
      }
      // comisiones de preventistas: el mes cerrado se liquida (2 % de lo facturado); el mes en curso queda devengado
      if (!parcial) A.liquidarComisiones({ desde: ini, hasta: d, base: 'facturado', fecha: d });
      else {
        const est = r2(q.estadoResultados(ini, d).ventasNetas * 0.02);
        if (est > 0) A.asientoManual({ fecha: d, detalle: 'Comisiones de preventistas devengadas' + sufijo + ' (2 % estimado, sin liquidar)', origen: 'gasto',
          lineas: [{ cuenta: '5.2.02', debe: est }, { cuenta: '2.1.10', haber: est }] });
      }
      // gastos con factura (montos finales, con IVA); el combustible trae impuestos internos que no dan crédito fiscal
      [['5.2.03', 2100000 * m, 'Combustible de reparto', C.caja, 0.835],
       ['5.2.04', 1400000 * m, 'Fletes de terceros', C.banco, 1],
       ['5.2.05', 750000 * z.real(0.7, 1.4), 'Mantenimiento de vehículos', C.banco, 1],
       ['5.3.02', 2900000, 'Alquiler del depósito', C.banco, 1],
       ['5.3.03', 880000 * m, 'Luz, gas e internet', C.banco, 1],
       ['5.3.04', 780000, 'Honorarios del estudio contable', C.banco, 1],
       ['5.4.01', 360000, 'Comisiones y mantenimiento de cuenta', C.banco, 1]
      ].forEach(([cuenta, imp, detalle, contra, gravado]) => {
        imp = r2(imp * f);
        if (imp > 0) gastoConFactura(d, cuenta, imp, detalle + sufijo, contra, gravado);
      });
      const banco = q.mayor(C.banco, ini, d);
      const idc = r2((banco.totalDebe + banco.totalHaber) * 0.006);
      if (idc > 0) A.asientoManual({ fecha: d, detalle: 'Impuesto a los débitos y créditos bancarios' + sufijo, origen: 'gasto', lineas: [{ cuenta: '5.4.02', debe: idc }, { cuenta: C.banco, haber: idc }] });
      const ventas = q.estadoResultados(ini, d).ventasNetas;
      const iibb = r2(ventas * 0.035);
      if (iibb > 0) A.asientoManual({ fecha: d, detalle: 'Ingresos Brutos' + sufijo + ' (3,5 % de la venta)', origen: 'impuesto', lineas: [{ cuenta: '5.5.01', debe: iibb }, { cuenta: '2.1.04', haber: iibb }] });
      iibbAPagar = iibb;
      // ganancias: escala para sociedades sobre el resultado acumulado anualizado; un mes con pérdida baja la provisión
      const meses = F.meses(CONFIG.desde, d).length - 1 + f;
      const acum = q.estadoResultados(CONFIG.desde, d).resultadoAntesGanancias;
      const objetivo = r2(gananciasEscala(acum * 12 / meses) * meses / 12);
      const dif = r2(objetivo - q.saldoCuenta('5.6.01', d, CONFIG.desde));
      if (dif > 0) A.asientoManual({ fecha: d, detalle: 'Provisión de impuesto a las ganancias' + sufijo + ' (estimado según escala)', origen: 'impuesto', lineas: [{ cuenta: '5.6.01', debe: dif }, { cuenta: '2.1.05', haber: dif }] });
      else if (dif < 0) A.asientoManual({ fecha: d, detalle: 'Ajuste de la provisión de ganancias' + sufijo + ' por el resultado del mes', origen: 'impuesto', lineas: [{ cuenta: '2.1.05', debe: -dif }, { cuenta: '5.6.01', haber: -dif }] });
    }

    // IVA del mes anterior: débito y crédito del mes liquidado (más el saldo a favor que venía); lo que falta se paga
    function liquidarIVA(d) {
      const mesAnt = F.mes(F.sumar(F.inicioMes(d), -1));
      const fin = F.finMes(mesAnt + '-01');
      const df = q.saldoCuenta(C.ivaDF, fin);
      const cf = q.saldoCuenta(C.ivaCF, fin);
      const perc = q.saldoCuenta('1.1.09', fin);
      const libroCF = q.libroIVACompras(mesAnt).totales.iva;
      const usa = r2(Math.min(df, cf));
      const resto = r2(df - usa);
      const usaPerc = r2(Math.min(resto, perc));
      const paga = r2(resto - usaPerc);
      if (df <= 0) return;
      const lineas = [{ cuenta: C.ivaDF, debe: df }, { cuenta: C.ivaCF, haber: usa }, { cuenta: '1.1.09', haber: usaPerc }];
      if (paga > 0) lineas.push({ cuenta: C.banco, haber: paga });
      const aFavor = r2(cf - usa);
      A.asientoManual({ fecha: d, origen: 'impuesto', lineas, detalle: 'Liquidación de IVA de ' + F.nombreMes(mesAnt + '-01') + ': débito ' + App.ui.pesos(df) +
        ', crédito ' + App.ui.pesos(cf) + ' (libro IVA compras ' + App.ui.pesos(libroCF) + ' + saldo a favor anterior ' + App.ui.pesos(r2(cf - libroCF)) + ')' +
        (usaPerc > 0 ? ', percepciones ' + App.ui.pesos(usaPerc) : '') + (paga > 0 ? ', a pagar ' + App.ui.pesos(paga) : ', queda a favor ' + App.ui.pesos(aFavor)) });
    }

    // aumentos de lista: el primer lunes de cada mes cada proveedor sube entre 1,5 y 3 %; la distribuidora traslada el aumento a sus listas
    function aumentos(d) {
      db.proveedores.forEach(pr => {
        const pct = Math.round(z.real(1.5, 3) * 10) / 10;
        const ids = db.productos.filter(p => p.proveedorId === pr.id).map(p => p.id);
        if (!ids.length) return;
        ids.forEach(id => { costoNuevo[id] = Math.round((costoNuevo[id] || App.get('productos', id).costo) * (1 + pct / 100)); });
        A.actualizarPrecios({ productoIds: ids, porcentaje: pct, fecha: d, costo: true, detalle: 'Lista nueva de ' + pr.razonSocial });
      });
    }

    // ---------- recorrido día por día ----------
    let d = CONFIG.desde;
    const hojasHoy = [];
    while (d <= hoy) {
      App._fijarHoy(d);
      const esHoy = d === hoy;
      const dow = F.diaSemana(d);
      if (esHabil(d)) {
        if (dow === 1 && d >= '2026-07-01' && Number(d.slice(8, 10)) <= 7) aumentos(d);
        // 1. vencidos: los lunes se dan de baja
        if (dow === 1) {
          db.lotes.forEach(l => {
            if (l.cantidad > 0 && l.vence && l.vence < d) A.ajustarStock({ loteId: l.id, cantidad: -l.cantidad, motivo: 'Vencido', fecha: d });
          });
          Object.keys(ventaSemana).forEach(k => { demanda[k] = 0.5 * (demanda[k] || esperada[k] || 0) + 0.5 * ventaSemana[k]; });
          Object.keys(demanda).forEach(k => { if (!(k in ventaSemana)) demanda[k] = 0.5 * demanda[k]; });
          for (const k in ventaSemana) delete ventaSemana[k];
        }
        // 2. llegan las compras
        (recepciones[d] || []).forEach(ocId => {
          const oc = App.get('ordenesCompra', ocId);
          const prov = App.get('proveedores', oc.proveedorId);
          const grande = PROV_GRANDES.includes(oc.proveedorId);
          A.recibirCompra(ocId, { fecha: d, depositoId: oc.depositoId, actualizarCosto: true,
            factura: { tipo: 'A', numero: String(z.entre(2, 9)).padStart(4, '0') + '-' + String(z.entre(10000, 99999)).padStart(8, '0'), fecha: d,
              percepcionIIBB: grande ? App.r2(oc.neto * 0.02) : 0, percepcionIVA: oc.proveedorId === 'v4' ? App.r2(oc.neto * 0.03) : 0 } });
          oc.items.forEach(it => { const k = clave(oc.depositoId, it.productoId); pendOC[k] = Math.max(0, (pendOC[k] || 0) - it.cantidad); });
          void prov;
        });
        // 3. reparto: los remitos facturados salen en la hoja de ruta del día
        const pendientes = db.remitos.filter(r => r.estado === 'pendiente');
        const porChofer = {};
        pendientes.forEach(r => {
          const c = App.get('clientes', r.clienteId);
          const ch = choferDe[c.preventistaId];
          (porChofer[ch] = porChofer[ch] || []).push(r.id);
        });
        Object.keys(porChofer).sort().forEach(ch => {
          const hr = A.armarHojaRuta({ fecha: d, choferId: ch, vehiculoId: vehiculoDe[ch], remitoIds: porChofer[ch] });
          if (esHoy) hojasHoy.push(hr);
          hr.remitoIds.forEach((rid, i) => {
            if (esHoy && i % 5 >= 3) return;  // hoy el reparto está en curso
            const rem = App.get('remitos', rid);
            const c = App.get('clientes', rem.clienteId);
            const x = z.r();
            if (x < 0.015 && c.tipo !== 'Kiosco') A.marcarEntrega(rid, { estado: 'rechazado', obs: 'El local estaba cerrado', fecha: d });
            else if (x < 0.045) {
              const comp = App.get('comprobantes', rem.comprobanteId);
              const it = comp.items[z.entre(0, comp.items.length - 1)];
              A.marcarEntrega(rid, { estado: 'parcial', obs: 'Devolvió un bulto golpeado', fecha: d, vendible: false, devoluciones: [{ productoId: it.productoId, cantidad: 1 }] });
            } else A.marcarEntrega(rid, { estado: 'entregado', fecha: d });
            const comp = App.get('comprobantes', rem.comprobanteId);
            if (c.plazo === 0 && comp) fechaCobro[comp.id] = d;
          });
        });
        // 4. cobranzas, depósito de cheques y pagos
        cobrar(d);
        db.cheques.forEach(ch => { if (ch.estado === 'en_cartera' && ch.fechaPago <= d) A.depositarCheque(ch.id, { fecha: d }); });
        if (!esHoy) pagarProveedores(d);
        if (d.slice(8, 10) >= '15' && iibbAPagar > 0) {
          // al IIBB del mes se le descuentan las percepciones (compras) y retenciones (cobranzas) sufridas hasta fin de mes
          const finAnt = F.sumar(F.inicioMes(d), -1);
          const perc = App.r2(Math.min(iibbAPagar, q.saldoCuenta('1.1.08', finAnt)));
          const paga = App.r2(iibbAPagar - perc);
          A.asientoManual({ fecha: d, detalle: 'Pago de Ingresos Brutos de ' + F.nombreMes(finAnt) + ' (descontando ' + App.ui.pesos(perc) + ' de percepciones y retenciones)', origen: 'impuesto',
            lineas: [{ cuenta: '2.1.04', debe: iibbAPagar }, { cuenta: '1.1.08', haber: perc }, { cuenta: C.banco, haber: paga }] });
          iibbAPagar = 0;
        }
        if (d.slice(8, 10) >= '10' && cargasAPagar > 0 && F.mes(d) > '2026-06') {
          A.asientoManual({ fecha: d, detalle: 'Pago de cargas sociales (F.931) de ' + F.nombreMes(F.sumar(F.inicioMes(d), -1)), origen: 'impuesto',
            lineas: [{ cuenta: '2.1.08', debe: cargasAPagar }, { cuenta: C.banco, haber: cargasAPagar }] });
          cargasAPagar = 0;
        }
        if (d.slice(8, 10) >= '13' && !anticipo[F.mes(d)] && d > '2026-06-30') {
          anticipo[F.mes(d)] = true;
          A.asientoManual({ fecha: d, detalle: 'Anticipo de impuesto a las ganancias de ' + F.nombreMes(d), origen: 'impuesto', lineas: [{ cuenta: '1.1.07', debe: 650000 }, { cuenta: C.banco, haber: 650000 }] });
        }
        if (d.slice(8, 10) >= '18' && !liquidado[F.mes(d)] && d > '2026-06-30') { liquidarIVA(d); liquidado[F.mes(d)] = true; }
        if (dow === 6) {
          const caja = q.saldoCuenta(C.caja, d);
          if (caja > 2500000) {
            const dep = App.r2(caja - 1500000);
            A.asientoManual({ fecha: d, detalle: 'Depósito de la recaudación en efectivo', origen: 'tesoreria', lineas: [{ cuenta: C.banco, debe: dep }, { cuenta: C.caja, haber: dep }] });
          }
        }
        // 5. preventa del día y facturación a la tarde
        const visitados = db.clientes.filter(c => c.diasVisita.includes(DIAS[dow]));
        const pedidosDia = [];
        visitados.forEach(c => {
          const origen = c.tipo === 'Mostrador' ? 'mostrador' : (z.prob(0.1) ? 'catalogo' : 'preventa');
          const p = armarPedido(c, d, origen);
          if (p) pedidosDia.push(p);
        });
        if (esHoy) {
          // pedidos que entraron por el catálogo hoy, de clientes que no tocaba visitar
          db.clientes.filter(c => !c.diasVisita.includes(DIAS[dow]) && c.tipo === 'Almacén').slice(0, 3).forEach(c => armarPedido(c, d, 'catalogo'));
          pedidosDia.forEach((p, i) => { if (i % 5 < 2) facturar(p, d); });
        } else {
          pedidosDia.forEach(p => facturar(p, d));
        }
        // 6. reposición
        if (!esHoy) {
          if (dow === 1 || dow === 4) reponer(d, false);
          if (dow === 1 || dow === 3 || dow === 5) reponer(d, true);
        }
      }
      if (esUltimoDelMes(d)) cierreDeMes(d, false);
      else if (esHoy) cierreDeMes(d, true);
      d = F.sumar(d, 1);
    }
    // una tanda corta de lácteos con vencimiento cercano (compra de oportunidad del 20/11)
    void hojasHoy;
  }
  const liquidado = {}, anticipo = {};

  window.SEMILLA = {
    config: CONFIG, maestros, historia: function (App) { for (const k in liquidado) delete liquidado[k]; for (const k in anticipo) delete anticipo[k]; return historia(App); },
    util: { cuit, digitoEAN, azar }
  };
})();
