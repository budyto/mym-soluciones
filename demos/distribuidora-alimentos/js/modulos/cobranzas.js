/* Módulo «Cobranzas»: recibos con medios combinados, imputación a facturas, cartera de cheques y cobranzas del día y del mes.
   Usa App.acciones.registrarCobranza y App.acciones.depositarCheque; nada se toca a mano en App.db.
   Desde otros módulos se abre la carga de un recibo con la ruta #/cobranzas/nuevo/<clienteId>.
   Rutas comunes para ver documentos: #/cobranzas/recibo/<id> y #/cobranzas/cheque/<id>. */
(function () {
  'use strict';
  const U = App.ui, h = U.h, F = App.f, r2 = App.r2;

  const CSS = `
.cob-medio { display: grid; grid-template-columns: minmax(0, 1fr) 36px; gap: 10px; align-items: end; padding: 12px 0; border-top: 1px solid var(--linea-suave); }
.cob-medio:first-child { border-top: 0; padding-top: 0; }
.cob-medio-datos { display: grid; grid-template-columns: 150px repeat(4, minmax(0, 1fr)); gap: 10px; }
.cob-medio-datos.cob-simple { grid-template-columns: 150px minmax(0, 1fr); }
.cob-agregar { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 10px; }
.cob-bloque { border: 1px solid var(--linea); border-radius: var(--r-panel); padding: 14px 16px; margin-top: 14px; }
.cob-bloque-titulo { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 10px; font-weight: 700; }
.cob-cuentas { display: flex; flex-wrap: wrap; gap: 6px 22px; font-size: var(--fs-13); color: var(--texto-2); margin-top: 8px; }
.cob-cuentas strong { color: var(--tinta); font-variant-numeric: tabular-nums; }
.cob-totales { display: flex; flex-wrap: wrap; gap: 0; margin-top: 14px; border: 1px solid var(--linea); border-radius: var(--r-panel); overflow: hidden; }
.cob-totales > div { flex: 1 1 150px; padding: 10px 14px; }
.cob-totales > div + div { border-left: 1px solid var(--linea); }
.cob-totales span { display: block; font-size: var(--fs-12); color: var(--texto-2); }
.cob-totales strong { font-size: var(--fs-20); font-weight: 800; font-stretch: 118%; font-variant-numeric: tabular-nums; }
.cob-totales .cob-falta strong { color: var(--peligro); }
.cob-totales .cob-sobra strong { color: var(--alerta); }
.tabla input.cob-imputar { width: 140px; }
.cob-medios-mes { display: grid; gap: 10px; }
.cob-medios-mes > div { display: grid; grid-template-columns: 120px minmax(0, 1fr) 150px 60px; gap: 12px; align-items: center; font-variant-numeric: tabular-nums; }
.cob-medios-mes .barra-h { height: 14px; }
.cob-medios-mes .barra-h > span { background: var(--carton); }
.cob-medios-mes strong { text-align: right; }
.cob-medios-mes em { font-style: normal; color: var(--texto-2); font-size: var(--fs-12); text-align: right; }
.cob-escala { display: flex; flex-wrap: wrap; gap: 0; margin-bottom: 14px; border: 1px solid var(--linea); border-radius: var(--r-panel); background: var(--hoja); }
.cob-escala > div { flex: 1 1 160px; padding: 10px 16px; }
.cob-escala > div + div { border-left: 1px solid var(--linea); }
.cob-escala span { display: block; font-size: var(--fs-12); color: var(--texto-2); }
.cob-escala strong { font-variant-numeric: tabular-nums; font-size: var(--fs-16); }
.cob-recibo { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 20px; align-items: start; }
.cob-lineas { width: 100%; border-collapse: collapse; font-size: var(--fs-13); font-variant-numeric: tabular-nums; }
.cob-lineas td { padding: 5px 0; border-bottom: 1px solid var(--linea-suave); }
.cob-lineas td + td { text-align: right; padding-left: 10px; vertical-align: top; }
.cob-lineas .celda-sub { display: block; font-size: var(--fs-12); color: var(--texto-2); line-height: 1.3; }
@media (max-width: 1100px) { .cob-recibo { grid-template-columns: minmax(0, 1fr); } }
@media (max-width: 760px) {
  .cob-medio { grid-template-columns: minmax(0, 1fr) 36px; }
  .cob-medio-datos, .cob-medio-datos.cob-simple { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .cob-totales > div + div, .cob-escala > div + div { border-left: 0; border-top: 1px solid var(--linea); }
  .cob-medios-mes > div { grid-template-columns: 100px minmax(0, 1fr) auto; }
  .cob-medios-mes em { display: none; }
}`;
  function estilos() {
    if (document.getElementById('cob-estilos')) return;
    const s = document.createElement('style');
    s.id = 'cob-estilos';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  const cli = id => App.get('clientes', id) || {};
  const nodo = html => { const t = document.createElement('template'); t.innerHTML = String(html).trim(); return t.content.firstElementChild; };
  const MEDIOS = { efectivo: 'Efectivo', transferencia: 'Transferencia', cheque: 'Cheque', echeq: 'eCheq', retencion: 'Retención' };
  const nombreMedio = t => MEDIOS[t] || t;
  const desc = (a, b) => b.fecha < a.fecha ? -1 : b.fecha > a.fecha ? 1 : b.numero - a.numero;
  function cuitValido(c) {
    const d = String(c || '').replace(/\D/g, '');
    if (d.length !== 11) return false;
    const p = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    let s = 0; for (let i = 0; i < 10; i++) s += Number(d[i]) * p[i];
    let dv = 11 - (s % 11); if (dv === 11) dv = 0;
    return dv !== 10 && dv === Number(d[10]);
  }
  const bancos = () => { const s = new Set(App.db.cheques.map(c => c.banco)); return [...s].sort(); };

  // ---------- carga de un recibo ----------
  function nuevoRecibo(clienteInicial) {
    const clientes = App.db.clientes.filter(c => c.activo !== false).slice().sort((a, b) => a.fantasia.localeCompare(b.fantasia));
    const estado = { clienteId: clienteInicial && App.get('clientes', clienteInicial) ? clienteInicial : '', medios: [], modo: 'auto', manual: {} };
    const cuerpo = nodo(h`<div class="cob-form">
      <div class="form-grilla" style="grid-template-columns:minmax(0,2fr) minmax(0,1fr)">
        <div class="campo"><label for="cob-cliente">Cliente</label><select id="cob-cliente"><option value="">Seleccionar cliente</option>${U.opciones(clientes, 'id', c => c.fantasia + ' (' + c.codigo + ')', estado.clienteId)}</select></div>
        <div class="campo"><label for="cob-fecha">Fecha</label><input type="date" id="cob-fecha" value="${App.hoy()}" max="${App.hoy()}"></div>
      </div>
      <div class="cob-cuentas" data-cuentas></div>
      <div class="cob-bloque"><div class="cob-bloque-titulo"><span>Medios de pago</span></div><div data-medios></div>
        <div class="cob-agregar"><button type="button" class="btn btn-chico btn-secundario" data-mas="efectivo">Agregar efectivo</button><button type="button" class="btn btn-chico btn-secundario" data-mas="transferencia">Agregar transferencia</button><button type="button" class="btn btn-chico btn-secundario" data-mas="cheque">Agregar cheque</button><button type="button" class="btn btn-chico btn-secundario" data-mas="echeq">Agregar eCheq</button><button type="button" class="btn btn-chico btn-secundario" data-mas="retencion">Agregar retención</button></div></div>
      <div class="cob-bloque"><div class="cob-bloque-titulo"><span>Imputación a facturas</span>
        <div class="segmentado" role="group" aria-label="Criterio de imputación"><button type="button" data-modo="auto" aria-pressed="true">Por antigüedad</button><button type="button" data-modo="manual" aria-pressed="false">Manual</button></div></div>
        <div data-facturas></div></div>
      <div class="cob-totales" data-totales></div>
      <div class="campo" style="margin-top:14px"><label for="cob-obs">Observaciones</label><input type="text" id="cob-obs" placeholder="Ejemplo: pago en el local, cobrado por Carina"></div>
    </div>`);
    const $ = s => cuerpo.querySelector(s);
    const pendientes = () => estado.clienteId ? App.q.pendientesCliente(estado.clienteId) : [];
    const totalMedios = () => r2(estado.medios.reduce((s, m) => s + (Number(m.importe) || 0), 0));
    function imputacionAuto() {
      let resto = totalMedios();
      const out = {};
      pendientes().forEach(f => { const s = App.q.saldoComprobante(f); const x = r2(Math.max(0, Math.min(s, resto))); if (x > 0) { out[f.id] = x; resto = r2(resto - x); } });
      return out;
    }
    const imputado = () => estado.modo === 'auto' ? imputacionAuto() : estado.manual;
    function nuevoMedio(tipo) {
      const c = cli(estado.clienteId);
      const m = { tipo, importe: '', banco: bancos()[0] || 'Banco del Plata', numero: '', fechaPago: F.sumar(App.hoy(), tipo === 'echeq' ? 30 : 15), librador: c.razonSocial || '', cuitLibrador: c.cuit || '', impuesto: 'IIBB', certificado: '' };
      if (!estado.medios.length) {
        const pend = pendientes();
        const vencido = pend.filter(f => f.vence < App.hoy()).reduce((s, f) => s + App.q.saldoComprobante(f), 0);
        m.importe = r2(vencido || (pend[0] ? App.q.saldoComprobante(pend[0]) : 0)) || '';
      }
      estado.medios.push(m);
    }
    function pintarCuentas() {
      const el = $('[data-cuentas]');
      if (!estado.clienteId) { el.innerHTML = h`<span>Seleccionar un cliente para consultar sus facturas pendientes.</span>`; return; }
      const c = cli(estado.clienteId);
      el.innerHTML = h`<span>Saldo <strong>${U.pesos(App.q.saldoCliente(c.id))}</strong></span><span>Vencido <strong>${U.pesos(App.q.deudaVencida(c.id))}</strong></span>
        <span>Medio habitual <strong>${nombreMedio(c.medioPreferido)}</strong></span><span>${c.plazo ? 'Cta. cte. a ' + c.plazo + ' días' : 'Contado'}</span>`;
    }
    function pintarMedios() {
      const caja = $('[data-medios]');
      caja.innerHTML = '';
      if (!estado.medios.length) { caja.innerHTML = '<p class="nota-discreta">Agregar al menos un medio de pago. Los medios pueden combinarse, por ejemplo parte en efectivo y parte con cheque.</p>'; return; }
      estado.medios.forEach((m, i) => {
        const esCheque = m.tipo === 'cheque' || m.tipo === 'echeq';
        const fila = nodo(h`<div class="cob-medio"><div class="cob-medio-datos${esCheque ? '' : ' cob-simple'}">
          <div class="campo"><label for="cob-m${i}-imp">${nombreMedio(m.tipo)}</label><input type="number" id="cob-m${i}-imp" min="0" step="0.01" value="${m.importe}" data-k="importe" placeholder="Importe"></div>
          ${esCheque ? h`<div class="campo"><label for="cob-m${i}-banco">Banco</label><input id="cob-m${i}-banco" list="cob-bancos" value="${m.banco}" data-k="banco"></div>
            <div class="campo"><label for="cob-m${i}-nro">Número</label><input id="cob-m${i}-nro" inputmode="numeric" value="${m.numero}" data-k="numero" placeholder="Ejemplo: 40125566"></div>
            <div class="campo"><label for="cob-m${i}-pago">Fecha de pago</label><input type="date" id="cob-m${i}-pago" value="${m.fechaPago}" data-k="fechaPago"></div>
            <div class="campo"><label for="cob-m${i}-lib">Librador y CUIT</label><input id="cob-m${i}-lib" value="${m.librador}" data-k="librador" aria-describedby="cob-m${i}-ayuda">
              <input id="cob-m${i}-cuit" value="${m.cuitLibrador}" data-k="cuitLibrador" aria-label="CUIT del librador" placeholder="30-00000000-0" style="margin-top:4px"><span class="campo-ayuda" id="cob-m${i}-ayuda">Modificar si se trata de un cheque de terceros.</span></div>`
          : m.tipo === 'retencion' ? h`<div class="campo"><label for="cob-m${i}-imp2">Impuesto</label><select id="cob-m${i}-imp2" data-k="impuesto">${['IIBB', 'Ganancias', 'IVA'].map(x => h`<option${U.seguro(m.impuesto === x ? ' selected' : '')}>${x}</option>`)}</select></div>
            <div class="campo"><label for="cob-m${i}-cert">Certificado n.º</label><input id="cob-m${i}-cert" value="${m.certificado}" data-k="certificado" placeholder="Ejemplo: 0001-00012345"><span class="campo-ayuda">Se registra como saldo a favor y se computa al liquidar el impuesto.</span></div>`
          : h`<div class="campo"><span class="etiqueta-campo">${m.tipo === 'efectivo' ? 'Destino: caja' : 'Destino: banco'}</span><span class="nota-discreta" style="line-height:36px">${m.tipo === 'efectivo' ? 'Se registra en la caja del día.' : 'Se acredita en la cuenta corriente bancaria.'}</span></div>`}
          </div><button type="button" class="btn btn-icono btn-fantasma" data-quitar aria-label="Quitar ${nombreMedio(m.tipo)}">×</button></div>`);
        fila.querySelectorAll('[data-k]').forEach(inp => inp.addEventListener('input', () => { m[inp.dataset.k] = inp.value; if (inp.dataset.k === 'importe') { pintarFacturas(); pintarTotales(); } }));
        fila.querySelector('[data-quitar]').addEventListener('click', () => { estado.medios.splice(i, 1); pintarMedios(); pintarFacturas(); pintarTotales(); });
        caja.appendChild(fila);
      });
      if (!document.getElementById('cob-bancos')) {
        const dl = document.createElement('datalist'); dl.id = 'cob-bancos';
        dl.innerHTML = bancos().map(b => '<option value="' + U.escapar(b) + '">').join('');
        cuerpo.appendChild(dl);
      }
    }
    function pintarFacturas() {
      const caja = $('[data-facturas]');
      caja.innerHTML = '';
      const pend = pendientes();
      if (!estado.clienteId) { caja.innerHTML = '<p class="nota-discreta">Seleccionar un cliente.</p>'; return; }
      if (!pend.length) { caja.innerHTML = '<p class="nota-discreta">El cliente no registra facturas pendientes: el importe cobrado queda a cuenta.</p>'; return; }
      const imp = imputado();
      caja.appendChild(U.tabla({
        filas: pend,
        columnas: [
          { titulo: 'Factura', valor: f => h`<span class="celda-principal">${f.tipo} ${f.nro}</span><span class="celda-sub">${U.fecha(f.fecha)}</span>` },
          { titulo: 'Vence', clase: 'ocultar-celu', valor: f => f.vence < App.hoy() ? h`${U.chip('Vencida hace ' + F.diferencia(f.vence, App.hoy()) + ' d', 'peligro')}` : U.fecha(f.vence) },
          { titulo: 'Saldo', alinear: 'der', valor: f => U.pesos(App.q.saldoComprobante(f)) },
          { titulo: 'Imputar', alinear: 'der', valor: f => {
            if (estado.modo === 'auto') return imp[f.id] ? h`<strong>${U.pesos(imp[f.id])}</strong>` : h`<span class="texto-2">—</span>`;
            const i = document.createElement('input');
            i.type = 'number'; i.min = '0'; i.step = '0.01'; i.className = 'cob-imputar'; i.value = estado.manual[f.id] || '';
            i.dataset.factura = f.id;
            i.setAttribute('aria-label', 'Importe a imputar a ' + f.tipo + ' ' + f.nro);
            i.addEventListener('input', () => { const v = Number(i.value) || 0; if (v > 0) estado.manual[f.id] = r2(v); else delete estado.manual[f.id]; pintarTotales(); });
            const b = document.createElement('button');
            b.type = 'button'; b.className = 'btn btn-chico btn-fantasma'; b.textContent = 'Saldo total';
            b.setAttribute('aria-label', 'Imputar todo el saldo de ' + f.nro);
            b.addEventListener('click', () => { estado.manual[f.id] = App.q.saldoComprobante(f); i.value = estado.manual[f.id]; pintarTotales(); });
            const s = document.createElement('span'); s.className = 'fila'; s.style.justifyContent = 'flex-end'; s.append(b, i); return s;
          } }
        ],
        filaClase: f => f.vence < App.hoy() ? 'fila-peligro' : ''
      }));
    }
    function pintarTotales() {
      const tot = totalMedios();
      const sumImp = r2(Object.values(imputado()).reduce((s, x) => s + x, 0));
      const aCuenta = r2(tot - sumImp);
      $('[data-totales]').innerHTML = h`<div><span>Total del recibo</span><strong>${U.pesos(tot)}</strong></div>
        <div><span>Imputado a facturas</span><strong>${U.pesos(sumImp)}</strong></div>
        <div class="${aCuenta < -0.009 ? 'cob-falta' : aCuenta > 0.009 ? 'cob-sobra' : ''}"><span>${aCuenta < -0.009 ? 'Exceso de imputación' : 'Saldo a cuenta'}</span><strong>${U.pesos(Math.abs(aCuenta))}</strong></div>`;
    }
    function pintarTodo() { pintarCuentas(); pintarMedios(); pintarFacturas(); pintarTotales(); }
    $('#cob-cliente').addEventListener('change', e => {
      estado.clienteId = e.target.value; estado.manual = {};
      estado.medios = [];
      if (estado.clienteId) nuevoMedio(cli(estado.clienteId).medioPreferido || 'efectivo');
      pintarTodo();
    });
    cuerpo.querySelectorAll('[data-mas]').forEach(b => b.addEventListener('click', () => {
      if (!estado.clienteId) return U.toast('Se debe seleccionar un cliente.', 'alerta');
      nuevoMedio(b.dataset.mas); pintarMedios(); pintarFacturas(); pintarTotales();
      const ult = cuerpo.querySelectorAll('[data-medios] [data-k="importe"]'); if (ult.length) ult[ult.length - 1].focus();
    }));
    cuerpo.querySelectorAll('[data-modo]').forEach(b => b.addEventListener('click', () => {
      if (b.dataset.modo === 'manual' && estado.modo === 'auto') estado.manual = Object.assign({}, imputacionAuto());
      estado.modo = b.dataset.modo;
      cuerpo.querySelectorAll('[data-modo]').forEach(x => x.setAttribute('aria-pressed', x === b));
      pintarFacturas(); pintarTotales();
    }));
    if (estado.clienteId) nuevoMedio(cli(estado.clienteId).medioPreferido || 'efectivo');
    pintarTodo();

    U.modal({ titulo: 'Registrar cobranza', cuerpo, ancho: 980, acciones: [
      { texto: 'Volver', tipo: 'secundario' },
      { texto: 'Registrar cobranza', tipo: 'primario', alClic: () => {
        if (!estado.clienteId) throw new Error('Se debe seleccionar el cliente.');
        if (!estado.medios.length) throw new Error('Se debe agregar al menos un medio de pago.');
        const medios = estado.medios.map(m => {
          const importe = r2(Number(m.importe) || 0);
          if (!(importe > 0)) throw new Error('Falta el importe de un medio de pago (' + nombreMedio(m.tipo) + ').');
          if (m.tipo === 'cheque' || m.tipo === 'echeq') {
            if (!String(m.banco).trim()) throw new Error('Falta indicar el banco del ' + nombreMedio(m.tipo) + '.');
            if (!/^\d{6,12}$/.test(String(m.numero).trim())) throw new Error('El número del ' + nombreMedio(m.tipo) + ' debe tener entre 6 y 12 dígitos.');
            if (!m.fechaPago) throw new Error('Falta indicar la fecha de pago del ' + nombreMedio(m.tipo) + '.');
            if (F.diferencia(App.hoy(), m.fechaPago) > 360) throw new Error('La fecha de pago del ' + nombreMedio(m.tipo) + ' no puede superar los 360 días.');
            if (m.cuitLibrador && !cuitValido(m.cuitLibrador)) throw new Error('El CUIT del librador no es válido: dígito verificador incorrecto.');
            return { tipo: m.tipo, importe, datos: { banco: String(m.banco).trim(), numero: String(m.numero).trim(), fechaPago: m.fechaPago, librador: m.librador || cli(estado.clienteId).razonSocial, cuitLibrador: m.cuitLibrador || cli(estado.clienteId).cuit } };
          }
          if (m.tipo === 'retencion') {
            if (!String(m.certificado).trim()) throw new Error('Falta indicar el número de certificado de la retención.');
            return { tipo: 'retencion', importe, datos: { impuesto: m.impuesto || 'IIBB', certificado: String(m.certificado).trim() } };
          }
          return { tipo: m.tipo, importe };
        });
        const imp = imputado();
        const imputaciones = Object.keys(imp).filter(id => imp[id] > 0).map(id => ({ comprobanteId: id, importe: imp[id] }));
        if (estado.modo === 'manual' && !imputaciones.length && pendientes().length) {
          // sin nada elegido a mano: todo queda a cuenta, se avisa
          U.toast('Sin facturas seleccionadas: el recibo queda a cuenta.', 'info');
        }
        const rec = App.acciones.registrarCobranza({ clienteId: estado.clienteId, fecha: cuerpo.querySelector('#cob-fecha').value || App.hoy(), medios,
          imputaciones: imputaciones.length ? imputaciones : (estado.modo === 'manual' ? [{ comprobanteId: (pendientes()[0] || {}).id, importe: 0 }].filter(x => x.comprobanteId) : undefined),
          obs: cuerpo.querySelector('#cob-obs').value });
        U.toast('Cobranza registrada: recibo ' + rec.nro + ' por ' + U.pesos(rec.total), 'ok');
        setTimeout(() => verReciboModal(rec), 0);
      } }] });
  }

  function verReciboModal(rec) {
    U.modal({ titulo: 'Recibo ' + rec.nro, ancho: 860, cuerpo: h`<div class="vista-previa cob-form">${U.comprobanteHTML(rec, 'RC')}</div>`, acciones: [
      { texto: 'Ver recibo', tipo: 'secundario', alClic: () => U.ir('#/cobranzas/recibo/' + rec.id) },
      { texto: 'Imprimir recibo', tipo: 'primario', alClic: () => { imprimirRecibo(rec); return false; } }] });
  }
  const imprimirRecibo = rec => U.imprimir(U.comprobanteHTML(rec, 'RC'), { titulo: 'Recibo ' + rec.nro });

  // ---------- depósito de cheques ----------
  async function depositar(lista) {
    if (!lista.length) return;
    const tot = r2(lista.reduce((s, c) => s + c.importe, 0));
    const ok = await U.confirmar(lista.length === 1
      ? 'Se depositará el ' + nombreMedio(lista[0].tipo) + ' ' + lista[0].banco + ' n.º ' + lista[0].numero + ' por ' + U.pesos(tot) + ' en la cuenta del banco.'
      : 'Se depositarán ' + lista.length + ' valores por ' + U.pesos(tot) + ' en la cuenta del banco.', { titulo: 'Depositar cheques', aceptar: 'Depositar' });
    if (!ok) return;
    let n = 0;
    try { lista.forEach(c => { App.acciones.depositarCheque(c.id); n++; }); U.toast(n === 1 ? 'Cheque depositado: ' + U.pesos(tot) + ' acreditados en banco' : n + ' cheques depositados: ' + U.pesos(tot) + ' acreditados en banco', 'ok'); }
    catch (e) { U.toast((n ? 'Se depositaron ' + n + ' y uno no pudo depositarse: ' : '') + e.message, 'peligro'); }
  }

  // ---------- pestañas del tablero ----------
  let filtroRecibos = 'hoy', textoRecibos = '';
  function pestanaRecibos(panel) {
    const hoy = App.hoy(), mes = F.mes(hoy);
    const fil = nodo(h`<div class="filtros"><input type="search" placeholder="Buscar por cliente o número" aria-label="Buscar recibos" value="${textoRecibos}">
      <div class="segmentado" role="group" aria-label="Período"><button type="button" data-f="hoy" aria-pressed="${filtroRecibos === 'hoy'}">Hoy</button><button type="button" data-f="mes" aria-pressed="${filtroRecibos === 'mes'}">Este mes</button><button type="button" data-f="todos" aria-pressed="${filtroRecibos === 'todos'}">Todos</button></div></div>`);
    panel.appendChild(fil);
    const lista = () => {
      const t = U.normalizar(textoRecibos).trim();
      return App.db.recibos.filter(r => (filtroRecibos === 'hoy' ? r.fecha === hoy : filtroRecibos === 'mes' ? F.mes(r.fecha) === mes : true) &&
        U.coincide(t, cli(r.clienteId).fantasia, cli(r.clienteId).razonSocial, r.nro)).sort(desc);
    };
    const pie = filas => ['Total', '', '', '', '', U.pesos(filas.reduce((s, r) => s + r.total, 0))];
    let filas = lista();
    const crear = () => U.tabla({
      filas, limite: 50, pie: pie(filas),
      columnas: [
        { titulo: 'Recibo', campo: 'numero', valor: r => h`<span class="celda-principal">${r.nro}</span>` },
        { titulo: 'Fecha', clase: 'ocultar-celu', campo: 'fecha', valor: r => U.fecha(r.fecha) },
        { titulo: 'Cliente', ordenar: r => cli(r.clienteId).fantasia, valor: r => h`<span class="celda-principal">${cli(r.clienteId).fantasia}</span><span class="celda-sub">${r.obs || cli(r.clienteId).zona}</span>` },
        { titulo: 'Medios', clase: 'ocultar-celu', valor: r => r.medios.map(m => nombreMedio(m.tipo)).join(' + ') },
        { titulo: 'Imputado a', clase: 'ocultar-celu', valor: r => r.imputaciones.length ? r.imputaciones[0].nro + (r.imputaciones.length > 1 ? ' y ' + (r.imputaciones.length - 1) + ' más' : '') : h`<span class="texto-2">A cuenta</span>` },
        { titulo: 'Total', campo: 'total', alinear: 'der', valor: r => h`${U.pesos(r.total)}${r.aCuenta > 0.009 ? h`<span class="celda-sub">${U.pesos(r.aCuenta)} a cuenta</span>` : ''}` }
      ],
      alClic: r => U.ir('#/cobranzas/recibo/' + r.id),
      vacio: filtroRecibos === 'hoy' ? 'No se registraron recibos en el día.' : 'No hay recibos para el filtro aplicado.'
    });
    let tabla = crear();
    panel.appendChild(tabla);
    const redibujar = () => { filas = lista(); const n = crear(); tabla.replaceWith(n); tabla = n; };
    U.buscador(fil.querySelector('input'), (t, crudo) => { textoRecibos = crudo; redibujar(); });
    fil.querySelectorAll('[data-f]').forEach(b => b.addEventListener('click', () => {
      filtroRecibos = b.dataset.f; fil.querySelectorAll('[data-f]').forEach(x => x.setAttribute('aria-pressed', x === b)); redibujar();
    }));
  }

  let filtroCheques = 'en_cartera', textoCheques = '';
  const elegidos = new Set();
  function pestanaCheques(panel) {
    const hoy = App.hoy();
    const cartera = App.q.chequesEnCartera();
    const tramo = (d1, d2) => r2(cartera.filter(c => { const d = F.diferencia(hoy, c.fechaPago); return d >= d1 && d <= d2; }).reduce((s, c) => s + c.importe, 0));
    panel.appendChild(nodo(h`<div class="cob-escala" aria-label="Vencimientos de los cheques en cartera">
      <div><span>Disponibles para depósito</span><strong>${U.pesos(tramo(-9999, 0))}</strong></div>
      <div><span>En los próximos 7 días</span><strong>${U.pesos(tramo(1, 7))}</strong></div>
      <div><span>De 8 a 30 días</span><strong>${U.pesos(tramo(8, 30))}</strong></div>
      <div><span>A más de 30 días</span><strong>${U.pesos(tramo(31, 99999))}</strong></div></div>`));
    const fil = nodo(h`<div class="filtros"><input type="search" placeholder="Buscar por banco, número o librador" aria-label="Buscar cheques" value="${textoCheques}">
      <div class="segmentado" role="group" aria-label="Estado"><button type="button" data-f="en_cartera" aria-pressed="${filtroCheques === 'en_cartera'}">En cartera</button><button type="button" data-f="depositado" aria-pressed="${filtroCheques === 'depositado'}">Depositados</button><button type="button" data-f="endosado" aria-pressed="${filtroCheques === 'endosado'}">Endosados</button><button type="button" data-f="todos" aria-pressed="${filtroCheques === 'todos'}">Todos</button></div>
      <button type="button" class="btn btn-primario" data-depositar disabled>Depositar seleccionados</button></div>`);
    panel.appendChild(fil);
    const btnDep = fil.querySelector('[data-depositar]');
    const depositable = c => c.estado === 'en_cartera' && c.fechaPago <= hoy;
    [...elegidos].forEach(id => { const c = App.get('cheques', id); if (!c || !depositable(c)) elegidos.delete(id); });
    function pintarBoton() {
      const l = [...elegidos].map(id => App.get('cheques', id));
      btnDep.disabled = !l.length;
      btnDep.textContent = l.length ? 'Depositar ' + l.length + ' (' + U.pesosCorto(l.reduce((s, c) => s + c.importe, 0)) + ')' : 'Depositar seleccionados';
    }
    const lista = () => {
      const t = U.normalizar(textoCheques).trim();
      return App.db.cheques.filter(c => (filtroCheques === 'todos' || c.estado === filtroCheques) && U.coincide(t, c.banco, c.numero, c.librador, cli(c.clienteId).fantasia))
        .slice().sort((a, b) => filtroCheques === 'en_cartera' ? (a.fechaPago < b.fechaPago ? -1 : 1) : (b.fechaEmision < a.fechaEmision ? -1 : 1));
    };
    let filas = lista();
    const crear = () => U.tabla({
      filas, limite: 60,
      pie: ['', 'Total', '', '', '', U.pesos(filas.reduce((s, c) => s + c.importe, 0)), '', ''],
      columnas: [
        { titulo: '', ancho: '36px', valor: c => { if (!depositable(c)) return ''; const i = document.createElement('input'); i.type = 'checkbox'; i.checked = elegidos.has(c.id); i.dataset.cheque = c.id; i.setAttribute('aria-label', 'Seleccionar el cheque ' + c.numero + ' para depósito'); i.addEventListener('change', () => { if (i.checked) elegidos.add(c.id); else elegidos.delete(c.id); pintarBoton(); }); return i; } },
        { titulo: 'Valor', ordenar: c => c.banco, valor: c => h`<span class="celda-principal">${nombreMedio(c.tipo)} ${c.banco}</span><span class="celda-sub">n.º ${c.numero}</span>` },
        { titulo: 'Librador', clase: 'ocultar-celu', ordenar: c => c.librador, valor: c => h`${c.librador}<span class="celda-sub">CUIT ${c.cuitLibrador}</span>` },
        { titulo: 'Cliente', clase: 'ocultar-celu', ordenar: c => cli(c.clienteId).fantasia, valor: c => h`${cli(c.clienteId).fantasia}<span class="celda-sub">recibido ${U.fecha(c.fechaEmision)}</span>` },
        { titulo: 'Pago', campo: 'fechaPago', valor: c => { const d = F.diferencia(hoy, c.fechaPago); return h`${U.fecha(c.fechaPago)}<span class="celda-sub">${c.estado !== 'en_cartera' ? '' : d <= 0 ? 'disponible para depósito' : 'en ' + d + (d === 1 ? ' día' : ' días')}</span>`; } },
        { titulo: 'Importe', campo: 'importe', alinear: 'der', valor: c => U.pesos(c.importe) },
        { titulo: 'Estado', valor: c => h`${U.estado(c.estado)}${c.estado === 'endosado' && c.proveedorId ? h`<span class="celda-sub">a ${(App.get('proveedores', c.proveedorId) || {}).razonSocial || ''}</span>` : c.estado === 'depositado' && c.fechaDeposito ? h`<span class="celda-sub">el ${U.fecha(c.fechaDeposito)}</span>` : ''}` },
        { titulo: '', alinear: 'der', valor: c => { if (!depositable(c)) return ''; const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-chico btn-secundario'; b.textContent = 'Depositar'; b.setAttribute('aria-label', 'Depositar el cheque ' + c.numero); b.addEventListener('click', () => depositar([c])); return b; } }
      ],
      filaClase: c => depositable(c) ? 'fila-alerta' : c.estado !== 'en_cartera' ? 'fila-apagada' : '',
      alClic: c => U.ir('#/cobranzas/cheque/' + c.id),
      vacio: 'No hay cheques para el filtro aplicado.'
    });
    let tabla = crear();
    panel.appendChild(tabla);
    const redibujar = () => { filas = lista(); const n = crear(); tabla.replaceWith(n); tabla = n; };
    U.buscador(fil.querySelector('input'), (t, crudo) => { textoCheques = crudo; redibujar(); });
    fil.querySelectorAll('[data-f]').forEach(b => b.addEventListener('click', () => {
      filtroCheques = b.dataset.f; fil.querySelectorAll('[data-f]').forEach(x => x.setAttribute('aria-pressed', x === b)); redibujar();
    }));
    btnDep.addEventListener('click', () => { const l = [...elegidos].map(id => App.get('cheques', id)); elegidos.clear(); depositar(l); });
    pintarBoton();
    panel.appendChild(nodo(h`<p class="nota-discreta" style="margin-top:10px">Al seleccionar un cheque se consulta su ficha y el recibo de ingreso. Los endosos a proveedores se realizan desde la orden de pago, en Proveedores.</p>`));
  }

  let mesResumen = null;
  function pestanaMes(panel) {
    const hoy = App.hoy();
    const meses = F.meses(App.config.desde || '2026-06-01', hoy).reverse();
    if (!mesResumen || !meses.includes(mesResumen)) mesResumen = F.mes(hoy);
    const sel = nodo(h`<div class="filtros"><label for="cob-mes" class="texto-2">Mes</label><select id="cob-mes">${meses.map(m => h`<option value="${m}"${m === mesResumen ? U.seguro(' selected') : ''}>${F.nombreMes(m + '-01')}</option>`)}</select></div>`);
    panel.appendChild(sel);
    sel.querySelector('select').addEventListener('change', e => { mesResumen = e.target.value; panel.innerHTML = ''; pestanaMes(panel); });
    const recs = App.db.recibos.filter(r => F.mes(r.fecha) === mesResumen);
    const porMedio = { efectivo: 0, transferencia: 0, cheque: 0, echeq: 0, retencion: 0 };
    const porDia = {};
    const porZona = {};
    recs.forEach(r => {
      const d = porDia[r.fecha] = porDia[r.fecha] || { fecha: r.fecha, n: 0, efectivo: 0, transferencia: 0, valores: 0, retencion: 0, total: 0 };
      d.n++; d.total += r.total;
      r.medios.forEach(m => { porMedio[m.tipo] = (porMedio[m.tipo] || 0) + m.importe; if (m.tipo === 'cheque' || m.tipo === 'echeq') d.valores += m.importe; else d[m.tipo] += m.importe; });
      const z = cli(r.clienteId).zona || 'Sin zona';
      porZona[z] = (porZona[z] || 0) + r.total;
    });
    const total = Object.values(porMedio).reduce((s, x) => s + x, 0);
    const max = Math.max(1, ...Object.values(porMedio));
    const grilla = nodo(h`<div class="grilla-2">
      <div class="panel"><h3 class="panel-titulo">Por medio de pago</h3><div class="cob-medios-mes">
        ${Object.keys(porMedio).map(k => h`<div><span>${nombreMedio(k)}</span><div class="barra-h" aria-hidden="true"><span style="width:${(porMedio[k] / max * 100).toFixed(1)}%"></span></div><strong>${U.pesos(porMedio[k])}</strong><em>${total ? U.porcentaje(porMedio[k] / total, 0) : ''}</em></div>`)}
      </div><p class="nota-discreta" style="margin-top:12px">${U.num(recs.length)} recibos por ${U.pesos(total)} en ${F.nombreMes(mesResumen + '-01')}.</p></div>
      <div class="panel"><h3 class="panel-titulo">Por zona de preventa</h3><div class="cob-medios-mes">
        ${Object.keys(porZona).sort((a, b) => porZona[b] - porZona[a]).map(z => h`<div><span>${z}</span><div class="barra-h" aria-hidden="true"><span style="width:${(porZona[z] / Math.max(1, ...Object.values(porZona)) * 100).toFixed(1)}%"></span></div><strong>${U.pesos(porZona[z])}</strong><em>${total ? U.porcentaje(porZona[z] / total, 0) : ''}</em></div>`)}
      </div></div></div>`);
    panel.appendChild(grilla);
    const dias = Object.values(porDia).sort((a, b) => b.fecha < a.fecha ? -1 : 1);
    const sec = nodo(h`<section class="seccion"><h3 class="seccion-titulo">Día por día</h3></section>`);
    sec.appendChild(U.tabla({
      filas: dias,
      columnas: [
        { titulo: 'Fecha', campo: 'fecha', valor: d => h`${U.fecha(d.fecha)}<span class="celda-sub">${F.nombreDia(d.fecha)}</span>` },
        { titulo: 'Recibos', clase: 'ocultar-celu', campo: 'n', alinear: 'der' },
        { titulo: 'Efectivo', campo: 'efectivo', alinear: 'der', valor: d => U.pesos(d.efectivo) },
        { titulo: 'Transferencias', clase: 'ocultar-celu', campo: 'transferencia', alinear: 'der', valor: d => U.pesos(d.transferencia) },
        { titulo: 'Cheques y eCheq', clase: 'ocultar-celu', campo: 'valores', alinear: 'der', valor: d => U.pesos(d.valores) },
        { titulo: 'Retenciones', clase: 'ocultar-celu', campo: 'retencion', alinear: 'der', valor: d => d.retencion ? U.pesos(d.retencion) : '' },
        { titulo: 'Total', campo: 'total', alinear: 'der', valor: d => h`<strong>${U.pesos(d.total)}</strong>` }
      ],
      pie: ['Total del mes', U.num(recs.length), U.pesos(porMedio.efectivo), U.pesos(porMedio.transferencia), U.pesos(porMedio.cheque + porMedio.echeq), U.pesos(porMedio.retencion), U.pesos(total)],
      vacio: 'No se registraron cobranzas en el mes.'
    }));
    panel.appendChild(sec);
  }

  // ---------- tablero ----------
  function tablero(el) {
    const hoy = App.hoy(), mes = F.mes(hoy);
    const recHoy = App.db.recibos.filter(r => r.fecha === hoy), recMes = App.db.recibos.filter(r => F.mes(r.fecha) === mes);
    const cartera = App.q.chequesEnCartera();
    const paraHoy = cartera.filter(c => c.fechaPago <= hoy);
    const vencida = App.q.deudaVencida();
    el.innerHTML = h`<div class="encabezado-vista"><div><h1 class="titulo-vista">Cobranzas</h1>
      <p class="bajada">Registro de recibos con uno o varios medios de pago, imputación a facturas y seguimiento de la cartera de cheques hasta su depósito.</p></div>
      <div class="acciones"><button type="button" class="btn btn-primario" data-nuevo>Registrar cobranza</button></div></div>
      ${U.franjaKpi([
        { titulo: 'Cobrado hoy', valor: U.pesosCorto(recHoy.reduce((s, r) => s + r.total, 0)), detalle: recHoy.length + (recHoy.length === 1 ? ' recibo' : ' recibos'), tono: 'ok' },
        { titulo: 'Cobrado en ' + F.nombreMes(hoy).split(' ')[0], valor: U.pesosCorto(recMes.reduce((s, r) => s + r.total, 0)), detalle: U.num(recMes.length) + ' recibos' },
        { titulo: 'Cheques en cartera', valor: U.pesosCorto(cartera.reduce((s, c) => s + c.importe, 0)), detalle: cartera.length + ' valores', tono: 'info' },
        { titulo: 'Depósitos del día', valor: U.num(paraHoy.length), detalle: paraHoy.length ? U.pesos(paraHoy.reduce((s, c) => s + c.importe, 0)) : 'sin vencimientos en el día', tono: paraHoy.length ? 'alerta' : '' },
        { titulo: 'Deuda vencida de clientes', valor: U.pesosCorto(vencida), detalle: 'detalle en Clientes', tono: vencida > 0 ? 'peligro' : 'ok' }
      ])}
      <div class="seccion cob-pestanas"></div>`;
    el.querySelector('[data-nuevo]').addEventListener('click', () => nuevoRecibo());
    U.pestanas(el.querySelector('.cob-pestanas'), [
      { id: 'recibos', titulo: 'Recibos', render: pestanaRecibos },
      { id: 'cheques', titulo: 'Cartera de cheques', cuenta: cartera.length, render: pestanaCheques },
      { id: 'mes', titulo: 'Resumen del mes', render: pestanaMes }
    ], { clave: 'cobranzas' });
  }

  // ---------- ficha de un cheque ----------
  function detalleCheque(el, id) {
    const ch = App.get('cheques', id);
    if (!ch) {
      el.innerHTML = h`<div class="vacio vacio-grande"><h1 class="titulo-vista">Cheque no encontrado</h1><p>El enlace puede ser incorrecto.</p><a class="btn btn-primario" href="#/cobranzas">Volver a Cobranzas</a></div>`;
      return;
    }
    const c = cli(ch.clienteId);
    const rec = ch.reciboId ? App.get('recibos', ch.reciboId) : null;
    const prov = ch.proveedorId ? App.get('proveedores', ch.proveedorId) : null;
    const pago = ch.pagoId ? App.get('pagos', ch.pagoId) : null;
    const hoy = App.hoy();
    const d = F.diferencia(hoy, ch.fechaPago);
    const depositable = ch.estado === 'en_cartera' && ch.fechaPago <= hoy;
    const asientos = App.db.asientos.filter(a => (ch.asientoId && a.id === ch.asientoId) || (rec && a.id === rec.asientoId) || (pago && a.id === pago.asientoId));
    el.innerHTML = h`<nav class="migas" aria-label="Ubicación"><a href="#/cobranzas">Cobranzas</a> › ${nombreMedio(ch.tipo)} n.º ${ch.numero}</nav>
      <div class="encabezado-vista"><div><h1 class="titulo-vista">${nombreMedio(ch.tipo)} ${ch.banco} n.º ${ch.numero}</h1>
        <p class="bajada">${U.pesos(ch.importe)}, de pago el ${U.fecha(ch.fechaPago)}${ch.estado === 'en_cartera' ? (d <= 0 ? '. Disponible para depósito.' : '. Disponible para depósito en ' + d + (d === 1 ? ' día.' : ' días.')) : '.'}</p></div>
        <div class="acciones">${c.id ? h`<a class="btn btn-secundario" href="#/clientes/${c.id}">Ver cuenta corriente del cliente</a>` : ''}${depositable ? h`<button type="button" class="btn btn-primario" data-depositar>Depositar cheque</button>` : ''}</div></div>
      <div class="cob-recibo"><div class="panel"><dl class="datos">
          <dt>Estado</dt><dd>${U.estado(ch.estado)}${ch.fechaDeposito ? h` <span class="texto-2">el ${U.fecha(ch.fechaDeposito)}</span>` : ''}${ch.fechaEndoso ? h` <span class="texto-2">el ${U.fecha(ch.fechaEndoso)}</span>` : ''}</dd>
          <dt>Banco</dt><dd>${ch.banco}</dd>
          <dt>Número</dt><dd>${ch.numero}</dd>
          <dt>Librador</dt><dd>${ch.librador} <span class="texto-2">(CUIT ${ch.cuitLibrador})</span></dd>
          <dt>Importe</dt><dd><strong>${U.pesos(ch.importe)}</strong></dd>
          <dt>Recibido</dt><dd>${U.fecha(ch.fechaEmision)}${c.id ? h` de <a href="#/clientes/${c.id}">${c.fantasia}</a>` : ''}</dd>
          <dt>Fecha de pago</dt><dd>${U.fecha(ch.fechaPago)}</dd>
          ${rec ? h`<dt>Ingresó con</dt><dd><a href="#/cobranzas/recibo/${rec.id}">Recibo ${rec.nro}</a></dd>` : ''}
          ${prov ? h`<dt>Endosado a</dt><dd><a href="#/proveedores/${prov.id}">${prov.razonSocial}</a>${pago ? h` <span class="texto-2">con la orden de pago ${pago.nro}</span>` : ''}</dd>` : ''}
        </dl></div>
        <aside>${asientos.length ? h`<div class="panel"><h2 class="panel-titulo">Asientos</h2><table class="cob-lineas"><tbody>
          ${asientos.map(a => h`<tr><td><a href="#/contabilidad/asiento/${a.id}">n.º ${U.num(a.numero)}</a><span class="celda-sub">${a.detalle}</span></td><td>${U.fecha(a.fecha)}</td></tr>`)}</tbody></table></div>` : ''}</aside></div>`;
    const b = el.querySelector('[data-depositar]');
    if (b) b.addEventListener('click', () => depositar([ch]));
  }

  // ---------- detalle de un recibo ----------
  function detalleRecibo(el, id) {
    const rec = App.get('recibos', id);
    if (!rec) {
      el.innerHTML = h`<div class="vacio vacio-grande"><h1 class="titulo-vista">Recibo no encontrado</h1><p>El enlace puede ser incorrecto.</p><a class="btn btn-primario" href="#/cobranzas">Volver a Cobranzas</a></div>`;
      return;
    }
    const c = cli(rec.clienteId);
    const as = rec.asientoId ? App.get('asientos', rec.asientoId) : null;
    const nombreCuenta = cod => (App.get('planCuentas', cod) || { nombre: cod }).nombre;
    el.innerHTML = h`<nav class="migas" aria-label="Ubicación"><a href="#/cobranzas">Cobranzas</a> › Recibo ${rec.nro}</nav>
      <div class="encabezado-vista"><div><h1 class="titulo-vista">Recibo ${rec.nro}</h1>
        <p class="bajada">${U.fechaLarga(rec.fecha)}. <a href="#/clientes/${c.id}">${c.fantasia}</a>, ${c.razonSocial}. ${U.pesos(rec.total)}${rec.obs ? '. ' + rec.obs : ''}</p></div>
        <div class="acciones"><a class="btn btn-secundario" href="#/clientes/${c.id}">Ver cuenta corriente del cliente</a><button type="button" class="btn btn-primario" data-imprimir>Imprimir recibo</button></div></div>
      <div class="cob-recibo"><div class="vista-previa">${U.comprobanteHTML(rec, 'RC')}</div>
        <aside>
          <div class="panel"><h2 class="panel-titulo">Imputación</h2><table class="cob-lineas"><tbody>
            ${rec.imputaciones.map(i => h`<tr><td><a href="#/facturacion/comprobante/${i.comprobanteId}">${i.nro}</a></td><td>${U.pesos(i.importe)}</td></tr>`)}
            ${rec.aCuenta > 0.009 ? h`<tr><td>A cuenta</td><td>${U.pesos(rec.aCuenta)}</td></tr>` : ''}</tbody></table></div>
          ${rec.medios.some(m => m.chequeId) ? h`<div class="panel"><h2 class="panel-titulo">Valores recibidos</h2><table class="cob-lineas"><tbody>
            ${rec.medios.filter(m => m.chequeId).map(m => { const ch = App.get('cheques', m.chequeId); return h`<tr><td>${nombreMedio(ch.tipo)} ${ch.banco} n.º ${ch.numero}<span class="celda-sub">pago ${U.fecha(ch.fechaPago)}</span></td><td>${U.estado(ch.estado)}</td></tr>`; })}</tbody></table></div>` : ''}
          ${as ? h`<div class="panel"><h2 class="panel-titulo">Asiento ${U.num(as.numero)}</h2><table class="cob-lineas"><tbody>
            ${as.lineas.map(l => h`<tr><td>${l.haber ? h`<span style="padding-left:18px">a ${nombreCuenta(l.cuenta)}</span>` : nombreCuenta(l.cuenta)}</td><td>${l.debe ? U.pesos(l.debe) : ''}</td><td>${l.haber ? U.pesos(l.haber) : ''}</td></tr>`)}</tbody></table>
            <p class="nota-discreta" style="margin-top:8px">Generado automáticamente al registrar el recibo.</p></div>` : ''}
        </aside></div>`;
    el.querySelector('[data-imprimir]').addEventListener('click', () => imprimirRecibo(rec));
  }

  App.modulo({
    id: 'cobranzas',
    titulo: 'Cobranzas',
    grupo: 'Administración',
    orden: 10,
    icono: '<svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="5" width="15" height="10" rx="1.5"/><circle cx="10" cy="10" r="2.2"/><path d="M5 8v4M15 8v4"/></svg>',
    contador: () => { const hoy = App.hoy(); return App.q.chequesEnCartera().filter(c => c.fechaPago <= hoy).length; },
    render(el, params) {
      estilos();
      if (params[0] === 'recibo' && params[1]) return detalleRecibo(el, params[1]);
      if (params[0] === 'cheque' && params[1]) return detalleCheque(el, params[1]);
      tablero(el);
      if (params[0] === 'nuevo') {
        history.replaceState(null, '', '#/cobranzas');
        setTimeout(() => nuevoRecibo(params[1]), 0);
      }
    }
  });
})();
