/* MyM Distribuidoras: base vacía de una empresa nueva.
   Reemplaza a datos.js (la semilla de la demo). Arranca sin productos, clientes ni movimientos:
   sólo el plan de cuentas, las listas de precios base y el depósito central.
   js/nube.js completa SEMILLA.config con los datos de la empresa (de Firestore) antes de cargar el núcleo. */
(function () {
  'use strict';

  // hoy en la Argentina (UTC-3, sin horario de verano)
  const hoyAR = () => new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 10);

  const CONFIG = {
    negocio: 'Mi distribuidora',
    razonSocial: '',
    condicionIVA: 'Responsable Inscripto',
    cuit: '',
    domicilio: '',
    telefono: '',
    email: '',
    iibb: '',
    inicioActividades: '',
    puntoVenta: 1,
    hoy: hoyAR(),
    desde: hoyAR(),                 // fecha en que la empresa empezó a usar el sistema
    clave: 'mym-distri-sin-nube',   // sólo se usa si no hay conexión con la nube (no debería pasar)
    semilla: 1,
    pie: 'Sistema hecho por MyM Soluciones',
    avisoCAE: 'La factura electrónica con CAE de ARCA se activa cuando se conecta la cuenta de ARCA de la empresa.',
    sistemaReal: true
  };
  CONFIG.hoyAR = hoyAR;

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

  const LISTAS = [
    { id: 'L1', nombre: 'Mayorista', recargo: 0.23, detalle: 'Supermercados y compras grandes' },
    { id: 'L2', nombre: 'Almacén', recargo: 0.37, detalle: 'Almacenes, kioscos y mostrador' },
    { id: 'L3', nombre: 'Autoservicio', recargo: 0.30, detalle: 'Autoservicios y minimercados' }
  ];

  function maestros() {
    const c = CONFIG.contadores || {};
    const n = k => Number(c[k]) || 0;
    return {
      productos: [], lotes: [], clientes: [], proveedores: [], preventistas: [], choferes: [], vehiculos: [],
      depositos: [{ id: 'D1', nombre: 'Depósito central', direccion: CONFIG.domicilio || '', activo: true }],
      pedidos: [], comprobantes: [], remitos: [], hojasRuta: [], recibos: [], cheques: [],
      ordenesCompra: [], comprasFacturas: [], pagos: [], movCtaCte: [], asientos: [],
      planCuentas: PLAN.map(t => ({ codigo: t[0], id: t[0], nombre: t[1], tipo: t[2], imputable: t[3], grupoER: t[4] || null })),
      ajustesStock: [],
      listasPrecio: (CONFIG.listas || LISTAS).map(l => ({ id: l.id, nombre: l.nombre, recargo: l.recargo, detalle: l.detalle || '' })),
      // numeración: si la empresa ya venía facturando, CONFIG.contadores dice desde dónde sigue
      contadores: { FA: n('FA'), FB: n('FB'), NCA: n('NCA'), NCB: n('NCB'), R: n('R'), RC: n('RC'), PE: n('PE'), OC: n('OC'), OP: n('OP'), HR: n('HR'), AS: 0, AJ: 0, TR: 0, id: 0 }
    };
  }

  window.SEMILLA = {
    config: CONFIG, maestros,
    historia: function () { /* empresa real: no hay historia inventada */ },
    extras: null,
    util: { cuit, digitoEAN, azar }
  };
})();
