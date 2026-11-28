/* Módulo «Proveedores»: lista con saldo, vencimientos a pagar de la semana, ficha con cuenta corriente, órdenes,
   facturas y pagos, y el registro de pagos (transferencia, efectivo, cheque propio o endoso de cheques de terceros
   de la cartera) con imputación a facturas.
   Rutas: #/proveedores · #/proveedores/<id>
   Los datos sólo cambian por App.acciones (registrarPago, guardarMaestro). */
(function () {
  'use strict';
  const ui = App.ui, h = ui.h, F = App.f, r2 = App.r2;

  function estilos() {
    if (document.getElementById('estilos-proveedores')) return;
    const s = document.createElement('style');
    s.id = 'estilos-proveedores';
    s.textContent = `
      /* vencimientos por día: mismos anchos en todos los bloques, así Estado, Total y Saldo quedan en columna */
      .pv-tabla-dia .tabla { table-layout: fixed; }
      .pv-tabla-dia .pv-c-prov { width: 40%; } .pv-tabla-dia .pv-c-estado { width: 16%; } .pv-tabla-dia .pv-c-num { width: 16%; } .pv-tabla-dia .pv-c-accion { width: 12%; }
      .pv-tabla-dia td { overflow: hidden; text-overflow: ellipsis; }
      .pv-dia { display: grid; grid-template-columns: 112px minmax(0, 1fr); gap: 0 18px; padding: 14px 0; border-top: 1px solid var(--linea); }
      .pv-dia:first-child { border-top: 0; padding-top: 0; }
      .pv-fecha { line-height: 1.15; }
      .pv-fecha strong { display: block; font-weight: 800; font-stretch: 118%; font-size: var(--fs-20); font-variant-numeric: tabular-nums; }
      .pv-fecha span { color: var(--texto-2); font-size: var(--fs-13); }
      .pv-fecha .pv-suma { display: block; margin-top: 4px; color: var(--tinta); font-weight: 600; font-variant-numeric: tabular-nums; }
      .pv-dia-vencido .pv-fecha strong { color: var(--peligro); }
      .pv-dia .tabla-envoltura { margin: 0; }
      .pv-saldo-grande { font-weight: 800; font-stretch: 122%; font-size: var(--fs-28); line-height: 1.05; font-variant-numeric: tabular-nums; }
      .pv-pago .pv-bloque + .pv-bloque { margin-top: 20px; }
      .pv-pago h3 { font-size: var(--fs-14); font-weight: 700; margin: 0 0 8px; }
      .pv-pago .tabla-envoltura { max-height: 260px; overflow: auto; }
      .pv-imp { width: 130px; text-align: right; }
      .pv-medio { display: grid; grid-template-columns: 150px repeat(3, minmax(0, 1fr)) auto; gap: 8px; align-items: end; padding: 10px 0; border-top: 1px solid var(--linea-suave); }
      .pv-medio:first-of-type { border-top: 0; }
      .pv-medio .campo > label { font-size: var(--fs-12); }
      .pv-medio-tipo { font-weight: 700; padding-bottom: 9px; }
      .pv-medio-tipo small { display: block; font-weight: 400; color: var(--texto-2); font-size: var(--fs-12); }
      .pv-resumen { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); border: 1px solid var(--linea); border-radius: var(--r-control); background: var(--fila-hover); }
      .pv-resumen > div { padding: 10px 14px; }
      .pv-resumen > div + div { border-left: 1px solid var(--linea); }
      .pv-resumen span { display: block; font-size: var(--fs-12); color: var(--texto-2); }
      .pv-resumen strong { font-weight: 800; font-stretch: 112%; font-size: var(--fs-16); font-variant-numeric: tabular-nums; }
      .pv-resumen .pv-mal strong { color: var(--peligro); }
      .pv-resumen .pv-bien strong { color: var(--ok); }
      .pv-agregar { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
      .pv-rojo { color: var(--peligro); }
      @media (max-width: 760px) {
        .pv-tabla-dia .pv-c-prov { width: auto; } .pv-tabla-dia .pv-c-num { width: 30%; } .pv-tabla-dia .pv-c-accion { width: 72px; }
        .pv-dia { grid-template-columns: minmax(0, 1fr); gap: 8px; }
        .pv-medio { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
        .pv-medio-tipo { grid-column: 1 / -1; padding-bottom: 0; }
        .pv-resumen { grid-template-columns: minmax(0, 1fr); }
        .pv-resumen > div + div { border-left: 0; border-top: 1px solid var(--linea); }
      }
    `;
    document.head.appendChild(s);
  }

  const prov = id => App.get('proveedores', id);
  const prod = id => App.get('productos', id) || { descripcion: id };
  const saldoFC = f => r2(f.total - f.pagado);
  const celda = (principal, sub) => h`<div class="celda-principal">${principal}</div>${sub ? h`<div class="celda-sub">${sub}</div>` : ''}`;
  const pendientesTodas = () => App.db.comprasFacturas.filter(f => saldoFC(f) > 0.01);
  // el modal es un ítem flex: sin min-width 0, una tabla ancha lo estira más allá de la pantalla del celular
  const modal = o => ui.modal(o);
  const NOMBRE_MEDIO = { transferencia: 'Transferencia', efectivo: 'Efectivo', cheque: 'Cheque de terceros endosado', cheque_propio: 'Cheque propio' };

  function chipVence(f) {
    const dias = F.diferencia(App.hoy(), f.vence);
    if (saldoFC(f) <= 0.01) return ui.estado('pagada');
    if (dias < 0) return ui.chip('Vencida hace ' + (-dias) + (dias === -1 ? ' día' : ' días'), 'peligro');
    if (dias === 0) return ui.chip('Vence hoy', 'peligro');
    if (dias <= 7) return ui.chip('Vence en ' + dias + (dias === 1 ? ' día' : ' días'), 'alerta');
    return ui.chip('A vencer', 'neutro');
  }

  // ---------- orden de pago imprimible (sólo clases comp-* de app.css) ----------
  function ordenPagoHTML(op) {
    const C = App.config, p = prov(op.proveedorId) || {};
    const propios = [];
    String(op.obs || '').replace(/Cheque propio n\.º (\S+) por (\$\s[\d.,]+), pago (\d{2}\/\d{2}\/\d{4})/g, (x, numero, importe, fecha) => { propios.push({ numero, importe, fecha }); return x; });
    return h`<article class="comprobante">
      <header class="comp-cabecera">
        <div class="comp-emisor"><div class="comp-negocio">${C.razonSocial}</div><div>${C.domicilio}</div><div>Tel. ${C.telefono}</div><div>CUIT ${C.cuit}</div></div>
        <div class="comp-letra"><span>X</span><small>No válido como factura</small></div>
        <div class="comp-datos"><div class="comp-titulo">Orden de pago</div><div>N.º <strong>${op.nro}</strong></div><div>Fecha ${ui.fecha(op.fecha)}</div></div>
      </header>
      <section class="comp-receptor">
        <div><span>Proveedor</span><strong>${p.razonSocial || ''}</strong></div><div><span>CUIT</span>${p.cuit || ''}</div>
        <div><span>Domicilio</span>${p.direccion || ''}</div>${op.obs ? h`<div><span>Observaciones</span>${op.obs}</div>` : ''}
      </section>
      <table class="comp-items"><thead><tr><th>Medio de pago</th><th>Detalle</th><th class="al-der">Importe</th></tr></thead><tbody>
        ${op.medios.map(m => {
          const ch = m.chequeId ? App.get('cheques', m.chequeId) : null;
          if (m.tipo === 'cheque_propio' && m.datos) return h`<tr><td>Cheque propio</td><td>${m.datos.banco} n.º ${m.datos.numero}, pago ${ui.fecha(m.datos.fechaPago)}</td><td class="al-der">${ui.pesos(m.importe)}</td></tr>`;
          if (m.tipo === 'transferencia' && m.datos && m.datos.operacion) return h`<tr><td>Transferencia</td><td>Op. ${m.datos.operacion}</td><td class="al-der">${ui.pesos(m.importe)}</td></tr>`;
          // pagos guardados antes de que existiera el medio «cheque propio»: el número quedaba en las observaciones
          const cp = m.tipo === 'transferencia' ? propios.find(x => !x.usado && x.importe === ui.pesos(m.importe)) : null;
          if (cp) { cp.usado = true; return h`<tr><td>Cheque propio</td><td>N.º ${cp.numero}, pago ${cp.fecha}</td><td class="al-der">${ui.pesos(m.importe)}</td></tr>`; }
          return h`<tr><td>${NOMBRE_MEDIO[m.tipo] || m.tipo}</td><td>${ch ? (ch.tipo === 'echeq' ? 'eCheq ' : '') + ch.banco + ' n.º ' + ch.numero + ', librado por ' + ch.librador + ', pago ' + ui.fecha(ch.fechaPago) : ''}</td><td class="al-der">${ui.pesos(m.importe)}</td></tr>`;
        })}
      </tbody></table>
      <table class="comp-items"><thead><tr><th>Se cancela</th><th class="al-der">Importe</th></tr></thead><tbody>
        ${op.imputaciones.map(i => h`<tr><td>Factura ${i.numero}</td><td class="al-der">${ui.pesos(i.importe)}</td></tr>`)}
        ${op.aCuenta > 0.01 ? h`<tr><td>Pago a cuenta</td><td class="al-der">${ui.pesos(op.aCuenta)}</td></tr>` : ''}
      </tbody></table>
      <div class="comp-totales"><div class="comp-total"><span>Total pagado</span><strong>${ui.pesos(op.total)}</strong></div></div>
      <div class="comp-firma"><div>Recibí conforme: firma y aclaración del proveedor</div><div>Fecha</div></div>
      <footer class="comp-pie comp-pie-simple"><p>Orden de pago.</p></footer>
    </article>`;
  }
  function verOrdenPago(op) {
    modal({ titulo: 'Orden de pago ' + op.nro, ancho: 820, cuerpo: h`<div class="vista-previa">${ordenPagoHTML(op)}</div>`,
      acciones: [{ texto: 'Cerrar', tipo: 'secundario' }, { texto: 'Imprimir orden de pago', tipo: 'primario', alClic: () => { ui.imprimir(ordenPagoHTML(op), { titulo: 'Orden de pago ' + op.nro }); return false; } }] });
  }

  // ---------- registrar pago ----------
  function abrirPago(proveedorId, facturaId) {
    const estado = { proveedorId: proveedorId || '', imputar: {}, medios: [], cheques: {}, tocado: false };
    const cuerpo = document.createElement('div');
    cuerpo.className = 'pv-pago';
    const cartera = App.q.chequesEnCartera();
    const totalImputado = () => r2(Object.values(estado.imputar).reduce((s, v) => s + (Number(v) || 0), 0));
    const totalCheques = () => r2(Object.keys(estado.cheques).reduce((s, id) => s + (estado.cheques[id] ? App.get('cheques', id).importe : 0), 0));
    const totalMedios = () => r2(estado.medios.reduce((s, m) => s + (Number(m.importe) || 0), 0) + totalCheques());

    function preparar() {
      estado.imputar = {}; estado.cheques = {}; estado.tocado = false;
      const pend = estado.proveedorId ? App.q.pendientesProveedor(estado.proveedorId) : [];
      if (facturaId && pend.find(f => f.id === facturaId)) estado.imputar[facturaId] = saldoFC(App.get('comprasFacturas', facturaId));
      else pend.filter(f => f.vence <= F.sumar(App.hoy(), 7)).forEach(f => { estado.imputar[f.id] = saldoFC(f); });
      estado.medios = [{ tipo: 'transferencia', importe: totalImputado(), referencia: '' }];
    }
    function sincronizar() {
      // mientras la persona no toque los importes, la transferencia acompaña lo imputado menos los cheques
      if (estado.tocado || estado.medios.length !== 1) return;
      estado.medios[0].importe = Math.max(0, r2(totalImputado() - totalCheques()));
      const i = cuerpo.querySelector('[data-medio="0"] [data-campo="importe"]');
      if (i) i.value = estado.medios[0].importe;
    }
    function resumen() {
      const imp = totalImputado(), med = totalMedios(), dif = r2(med - imp);
      const caja = cuerpo.querySelector('[data-resumen]');
      caja.innerHTML = String(h`<div><span>Imputado a facturas</span><strong>${ui.pesos(imp)}</strong></div><div><span>Total de medios de pago</span><strong>${ui.pesos(med)}</strong></div>
        <div class="${dif < -0.01 ? 'pv-mal' : dif > 0.01 ? 'pv-bien' : ''}"><span>${!imp ? 'Sin facturas seleccionadas: se imputa a las más antiguas' : dif < -0.01 ? 'Faltante' : dif > 0.01 ? 'Pago a cuenta' : 'Diferencia'}</span><strong>${ui.pesos(Math.abs(dif))}</strong></div>`);
    }
    function pintarMedios() {
      const caja = cuerpo.querySelector('[data-medios]');
      caja.innerHTML = '';
      estado.medios.forEach((m, i) => {
        const campos = m.tipo === 'cheque_propio'
          ? h`<div class="campo"><label>Número</label><input type="text" inputmode="numeric" data-campo="numero" value="${m.numero || ''}" placeholder="00012345"></div>
              <div class="campo"><label>Fecha de pago</label><input type="date" data-campo="fechaPago" value="${m.fechaPago || App.hoy()}"></div>`
          : m.tipo === 'transferencia'
            ? h`<div class="campo"><label>N.º de operación</label><input type="text" data-campo="referencia" value="${m.referencia || ''}" placeholder="Opcional"></div><div></div>`
            : h`<div></div><div></div>`;
        const fila = ui.nodo(h`<div class="pv-medio" data-medio="${i}">
          <div class="pv-medio-tipo">${m.tipo === 'cheque_propio' ? 'Cheque propio' : m.tipo === 'efectivo' ? 'Efectivo' : 'Transferencia'}<small>${m.tipo === 'efectivo' ? 'Egreso de Caja' : 'Egreso de Banco cuenta corriente'}</small></div>
          ${campos}
          <div class="campo"><label>Importe</label><input type="number" min="0" step="0.01" data-campo="importe" value="${m.importe}"></div>
          <button type="button" class="btn btn-fantasma btn-chico" data-quitar ${estado.medios.length === 1 && !totalCheques() ? 'hidden' : ''}>Quitar</button>
        </div>`);
        fila.querySelectorAll('[data-campo]').forEach(inp => inp.addEventListener('input', () => {
          const c = inp.dataset.campo;
          m[c] = c === 'importe' ? (inp.value === '' ? 0 : Number(inp.value)) : inp.value;
          if (c === 'importe') { estado.tocado = true; resumen(); }
        }));
        fila.querySelector('[data-quitar]').addEventListener('click', () => { estado.medios.splice(i, 1); estado.tocado = true; pintarMedios(); resumen(); });
        caja.appendChild(fila);
      });
    }
    function pintar() {
      const pend = estado.proveedorId ? App.q.pendientesProveedor(estado.proveedorId) : [];
      const p = prov(estado.proveedorId);
      cuerpo.innerHTML = String(h`
        <div class="pv-bloque form-grilla">
          <div class="campo"><label for="pv-prov">Proveedor</label><select id="pv-prov"><option value="">Seleccionar proveedor</option>${ui.opciones(App.db.proveedores, 'id', 'razonSocial', estado.proveedorId)}</select></div>
          <div class="campo"><label for="pv-fecha">Fecha del pago</label><input type="date" id="pv-fecha" value="${App.hoy()}"></div>
          ${p ? h`<div class="campo"><span class="etiqueta-campo">Saldo con el proveedor</span><strong class="cifra" style="font-size:var(--fs-20)">${ui.pesos(App.q.saldoProveedor(p.id))}</strong></div>` : ''}
        </div>
        ${p ? h`
        <div class="pv-bloque"><div class="fila separar"><h3>Facturas que se pagan</h3><button type="button" class="btn btn-fantasma btn-chico" data-todas>${pend.length && pend.every(f => estado.imputar[f.id]) ? 'Quitar selección' : 'Seleccionar todas'}</button></div><div data-facturas></div></div>
        <div class="pv-bloque"><h3>Medios de pago</h3><div data-medios></div>
          <div class="pv-agregar"><button type="button" class="btn btn-secundario btn-chico" data-agregar="transferencia">Agregar transferencia</button><button type="button" class="btn btn-secundario btn-chico" data-agregar="cheque_propio">Agregar cheque propio</button><button type="button" class="btn btn-secundario btn-chico" data-agregar="efectivo">Agregar efectivo</button></div></div>
        <div class="pv-bloque"><h3>Endosar cheques de terceros de la cartera</h3><p class="nota-discreta" style="margin:-4px 0 8px">Se endosan por el importe total. ${cartera.length} cheques en cartera por ${ui.pesos(cartera.reduce((s, c) => s + c.importe, 0))}.</p><div data-cheques></div></div>
        <div class="pv-bloque"><div class="pv-resumen" data-resumen></div>
          <div class="campo" style="margin-top:12px"><label for="pv-obs">Observaciones</label><input type="text" id="pv-obs" placeholder="Opcional: aparece en la orden de pago"></div></div>`
        : h`<div class="vacio">Seleccionar un proveedor para ver sus facturas pendientes.</div>`}`);
      cuerpo.querySelector('#pv-prov').addEventListener('change', e => { estado.proveedorId = e.target.value; facturaId = null; preparar(); pintar(); });
      if (!p) return;
      cuerpo.querySelector('[data-facturas]').appendChild(ui.tabla({
        filas: pend, vacio: 'El proveedor no tiene facturas pendientes. Todo pago se registra como pago a cuenta.',
        filaClase: f => f.vence < App.hoy() ? 'fila-peligro' : f.vence <= F.sumar(App.hoy(), 7) ? 'fila-alerta' : '',
        columnas: [
          { titulo: '', valor: f => { const c = document.createElement('input'); c.type = 'checkbox'; c.checked = !!estado.imputar[f.id]; c.setAttribute('aria-label', 'Pagar la factura ' + f.numero);
            c.addEventListener('change', () => { if (c.checked) estado.imputar[f.id] = saldoFC(f); else delete estado.imputar[f.id]; const i = cuerpo.querySelector('[data-imp="' + f.id + '"]'); if (i) { i.value = estado.imputar[f.id] || ''; i.disabled = !c.checked; } sincronizar(); resumen(); }); return c; } },
          { titulo: 'Factura', valor: f => celda(f.tipo + ' ' + f.numero, 'del ' + ui.fecha(f.fecha)) },
          { titulo: 'Vence', valor: f => h`${ui.fecha(f.vence)} ${chipVence(f)}` },
          { titulo: 'Saldo', alinear: 'der', valor: f => ui.pesos(saldoFC(f)) },
          { titulo: 'A pagar', alinear: 'der', valor: f => { const i = document.createElement('input'); i.type = 'number'; i.min = 0; i.step = 0.01; i.className = 'pv-imp'; i.dataset.imp = f.id; i.value = estado.imputar[f.id] || ''; i.disabled = !estado.imputar[f.id]; i.setAttribute('aria-label', 'Importe a pagar de la factura ' + f.numero);
            i.addEventListener('input', () => { estado.imputar[f.id] = Number(i.value) || 0; sincronizar(); resumen(); }); return i; } }
        ]
      }));
      cuerpo.querySelector('[data-cheques]').appendChild(ui.tabla({
        filas: cartera, vacio: 'No hay cheques de terceros en cartera.',
        columnas: [
          { titulo: '', valor: ch => { const c = document.createElement('input'); c.type = 'checkbox'; c.checked = !!estado.cheques[ch.id]; c.setAttribute('aria-label', 'Endosar el cheque ' + ch.numero);
            c.addEventListener('change', () => { if (c.checked) estado.cheques[ch.id] = true; else delete estado.cheques[ch.id]; sincronizar(); resumen(); const q = cuerpo.querySelector('[data-medio="0"] [data-quitar]'); if (q) q.hidden = estado.medios.length === 1 && !totalCheques(); }); return c; } },
          { titulo: 'Cheque', valor: ch => celda((ch.tipo === 'echeq' ? 'eCheq ' : '') + ch.banco, 'N.º ' + ch.numero) },
          { titulo: 'Librador', clase: 'ocultar-celu', valor: ch => celda(ch.librador, ch.cuitLibrador) },
          { titulo: 'Pago', valor: ch => ui.fecha(ch.fechaPago) },
          { titulo: 'Importe', alinear: 'der', valor: ch => ui.pesos(ch.importe) }
        ]
      }));
      cuerpo.querySelector('[data-todas]').addEventListener('click', () => {
        const todas = pend.length && pend.every(f => estado.imputar[f.id]);
        estado.imputar = {};
        if (!todas) pend.forEach(f => { estado.imputar[f.id] = saldoFC(f); });
        const scroll = cuerpo.closest('.modal-cuerpo') ? cuerpo.closest('.modal-cuerpo').scrollTop : 0;
        sincronizar(); pintar();
        if (cuerpo.closest('.modal-cuerpo')) cuerpo.closest('.modal-cuerpo').scrollTop = scroll;
      });
      cuerpo.querySelectorAll('[data-agregar]').forEach(b => b.addEventListener('click', () => {
        const falta = Math.max(0, r2(totalImputado() - totalMedios()));
        estado.medios.push({ tipo: b.dataset.agregar, importe: falta, referencia: '' });
        estado.tocado = true; pintarMedios(); resumen();
      }));
      pintarMedios(); resumen();
    }

    function confirmar() {
      const p = prov(estado.proveedorId);
      if (!p) throw new Error('Falta seleccionar el proveedor.');
      const fecha = cuerpo.querySelector('#pv-fecha').value || App.hoy();
      const imput = Object.keys(estado.imputar).filter(id => Number(estado.imputar[id]) > 0).map(id => ({ facturaId: id, importe: r2(estado.imputar[id]) }));
      imput.forEach(i => { const f = App.get('comprasFacturas', i.facturaId); if (i.importe > saldoFC(f) + 0.01) throw new Error('El importe imputado supera el saldo de la factura ' + f.numero + ' (' + ui.pesos(saldoFC(f)) + ').'); });
      const notas = [];
      const medios = [];
      estado.medios.forEach(m => {
        const imp = r2(Number(m.importe) || 0);
        if (imp <= 0) return;
        if (m.tipo === 'cheque_propio') {
          if (!String(m.numero || '').trim()) throw new Error('Falta el número del cheque propio.');
          // sale del Banco cuenta corriente; número y fecha de pago quedan en el medio
          medios.push({ tipo: 'cheque_propio', importe: imp, datos: { numero: m.numero.trim(), banco: 'Banco cuenta corriente', fechaPago: m.fechaPago || fecha } });
        } else if (m.tipo === 'transferencia' && m.referencia && m.referencia.trim()) {
          medios.push({ tipo: m.tipo, importe: imp, datos: { operacion: m.referencia.trim() } });
        } else {
          medios.push({ tipo: m.tipo, importe: imp });
        }
      });
      Object.keys(estado.cheques).forEach(id => { if (estado.cheques[id]) medios.push({ tipo: 'cheque', chequeId: id }); });
      if (!medios.length) throw new Error('Falta indicar el medio de pago: transferencia, cheque propio, efectivo o un cheque de la cartera.');
      const total = totalMedios(), imputado = totalImputado();
      if (imputado > total + 0.01) throw new Error('El importe imputado (' + ui.pesos(imputado) + ') supera el total de medios de pago (' + ui.pesos(total) + '). Faltante: ' + ui.pesos(imputado - total) + '.');
      const obs = [cuerpo.querySelector('#pv-obs').value.trim()].concat(notas).filter(Boolean).join('. ');
      // sin facturas tildadas, la acción imputa a las facturas más viejas y lo que sobra queda a cuenta
      const op = App.acciones.registrarPago({ proveedorId: p.id, fecha, medios, imputaciones: imput.length ? imput : undefined, obs });
      ui.toast('Pago registrado: orden de pago ' + op.nro + ' por ' + ui.pesos(op.total), 'ok');
      setTimeout(() => verOrdenPago(op), 0);
    }

    preparar();
    pintar();
    modal({ titulo: 'Registrar pago a proveedor', cuerpo, ancho: 900,
      acciones: [{ texto: 'Cancelar', tipo: 'secundario' }, { texto: 'Registrar pago', tipo: 'senal', alClic: () => { confirmar(); } }] });
  }

  // ---------- editar o dar de alta un proveedor ----------
  function editarProveedor(p) {
    const d = p || { plazo: 30, marcas: [] };
    const form = ui.nodo(h`<form class="form-grilla" onsubmit="return false">
      <div class="campo ancho-total"><label for="pv-rs">Razón social</label><input id="pv-rs" name="razonSocial" value="${d.razonSocial || ''}" required></div>
      <div class="campo"><label for="pv-cuit">CUIT</label><input id="pv-cuit" name="cuit" value="${d.cuit || ''}" placeholder="30-71234567-8"></div>
      <div class="campo"><label for="pv-plazo">Plazo de pago (días)</label><input id="pv-plazo" type="number" min="0" name="plazo" value="${d.plazo}"></div>
      <div class="campo ancho-total"><label for="pv-dir">Dirección</label><input id="pv-dir" name="direccion" value="${d.direccion || ''}"></div>
      <div class="campo"><label for="pv-mail">Correo</label><input id="pv-mail" type="email" name="email" value="${d.email || ''}"></div>
      <div class="campo"><label for="pv-tel">Teléfono</label><input id="pv-tel" type="tel" name="telefono" value="${d.telefono || ''}"></div>
      <div class="campo ancho-total"><label for="pv-marcas">Marcas que trae</label><input id="pv-marcas" name="marcas" value="${(d.marcas || []).join(', ')}"><span class="campo-ayuda">Separadas por comas.</span></div>
    </form>`);
    modal({ titulo: p ? 'Editar ' + p.razonSocial : 'Nuevo proveedor', cuerpo: form, ancho: 620,
      acciones: [{ texto: 'Cancelar', tipo: 'secundario' }, { texto: p ? 'Guardar cambios' : 'Crear proveedor', tipo: 'primario', alClic: () => {
        const v = ui.leerFormulario(form);
        if (!v.razonSocial.trim()) throw new Error('Falta la razón social.');
        if (v.cuit && !/^\d{2}-\d{8}-\d$/.test(v.cuit.trim())) throw new Error('El CUIT debe tener el formato 30-71234567-8.');
        const datos = { razonSocial: v.razonSocial.trim(), cuit: v.cuit.trim(), plazo: Number(v.plazo) || 0, direccion: v.direccion.trim(), email: v.email.trim(), telefono: v.telefono.trim(),
          marcas: v.marcas.split(',').map(x => x.trim()).filter(Boolean), condicionIVA: 'RI' };
        if (p) datos.id = p.id;
        else datos.codigo = 'PR-' + (201 + App.db.proveedores.length);
        const r = App.acciones.guardarMaestro('proveedores', datos);
        ui.toast(p ? 'Cambios guardados' : 'Proveedor creado', 'ok');
        if (!p) setTimeout(() => ui.ir('#/proveedores/' + r.id), 0);
      } }] });
  }

  // ---------- lista y vencimientos ----------
  let textoLista = '';
  function vistaLista(el) {
    const hoy = App.hoy(), finSemana = F.sumar(hoy, 7);
    const pend = pendientesTodas();
    const vencidas = pend.filter(f => f.vence < hoy);
    const semana = pend.filter(f => f.vence >= hoy && f.vence <= finSemana);
    const deuda = App.db.proveedores.reduce((s, p) => s + App.q.saldoProveedor(p.id), 0);
    const cartera = App.q.chequesEnCartera();
    const suma = l => l.reduce((s, f) => s + saldoFC(f), 0);
    el.innerHTML = String(h`<div class="encabezado-vista"><div><h1 class="titulo-vista">Proveedores</h1><p class="bajada">Deuda con proveedores, vencimientos de la semana y valores disponibles para cancelarlos.</p></div>
      <div class="acciones"><button type="button" class="btn btn-secundario" data-nuevo>Nuevo proveedor</button><button type="button" class="btn btn-primario" data-pagar>Registrar pago</button></div></div>
      ${ui.franjaKpi([
        { titulo: 'Deuda con proveedores', valor: ui.pesosCorto(deuda), detalle: pend.length + ' facturas sin pagar' },
        { titulo: 'A pagar en 7 días, con lo vencido', valor: ui.pesosCorto(suma(semana) + suma(vencidas)), detalle: (semana.length + vencidas.length) + ' facturas hasta el ' + ui.fecha(finSemana) + (vencidas.length ? ', ' + ui.pesosCorto(suma(vencidas)) + ' ya vencido' : ''), tono: semana.length + vencidas.length ? 'alerta' : null },
        { titulo: 'Vencido', valor: ui.pesosCorto(suma(vencidas)), detalle: vencidas.length ? vencidas.length + ' facturas atrasadas' : 'Sin facturas atrasadas', tono: vencidas.length ? 'peligro' : 'ok' },
        { titulo: 'Cheques para endosar', valor: ui.pesosCorto(cartera.reduce((s, c) => s + c.importe, 0)), detalle: cartera.length + ' cheques de clientes en cartera', tono: 'info' }
      ])}
      <section class="seccion"><h2 class="seccion-titulo">Vencimientos a pagar de la semana <span class="texto-2">${vencidas.length ? 'incluye lo vencido' : 'de hoy al ' + ui.fecha(finSemana)}</span></h2><div class="panel" data-semana></div></section>
      <section class="seccion"><h2 class="seccion-titulo">Todos los proveedores</h2>
        <div class="filtros"><input type="search" placeholder="Buscar por nombre, CUIT o marca" aria-label="Buscar proveedor" value="${textoLista}"></div><div data-lista></div></section>`);
    el.querySelector('[data-pagar]').addEventListener('click', () => abrirPago(null));
    el.querySelector('[data-nuevo]').addEventListener('click', () => editarProveedor(null));

    // vencimientos agrupados por día
    const caja = el.querySelector('[data-semana]');
    const lista = vencidas.concat(semana).sort((a, b) => a.vence < b.vence ? -1 : a.vence > b.vence ? 1 : saldoFC(b) - saldoFC(a));
    if (!lista.length) caja.innerHTML = String(h`<div class="vacio">No hay vencimientos esta semana.</div>`);
    const dias = {};
    lista.forEach(f => { const k = f.vence < hoy ? 'vencido' : f.vence; (dias[k] = dias[k] || []).push(f); });
    Object.keys(dias).sort((a, b) => a === 'vencido' ? -1 : b === 'vencido' ? 1 : a < b ? -1 : 1).forEach(k => {
      const fs = dias[k];
      const titulo = k === 'vencido' ? h`<strong>Vencido</strong><span>antes de hoy</span>` : h`<strong>${ui.fecha(k).slice(0, 5)}</strong><span>${k === hoy ? 'hoy, ' : ''}${F.nombreDia(k)}</span>`;
      const bloque = ui.nodo(h`<div class="pv-dia${k === 'vencido' ? ' pv-dia-vencido' : ''}"><div class="pv-fecha">${titulo}<span class="pv-suma">${ui.pesos(suma(fs))}</span></div><div data-t></div></div>`);
      bloque.querySelector('[data-t]').appendChild(ui.tabla({
        filas: fs, clase: 'pv-tabla-dia', alClic: f => ui.ir('#/proveedores/' + f.proveedorId),
        columnas: [
          { titulo: 'Proveedor', clase: 'pv-c-prov', valor: f => celda(prov(f.proveedorId).razonSocial, 'Factura ' + f.tipo + ' ' + f.numero + ' del ' + ui.fecha(f.fecha)) },
          { titulo: 'Estado', clase: 'pv-c-estado ocultar-celu', valor: f => chipVence(f) },
          { titulo: 'Total', clase: 'pv-c-num ocultar-celu', alinear: 'der', valor: f => ui.pesos(f.total) },
          { titulo: 'Saldo', clase: 'pv-c-num', alinear: 'der', valor: f => h`<strong>${ui.pesos(saldoFC(f))}</strong>` },
          { titulo: '', clase: 'pv-c-accion', alinear: 'der', valor: f => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-secundario btn-chico'; b.textContent = 'Pagar'; b.setAttribute('aria-label', 'Pagar la factura ' + f.numero); b.addEventListener('click', () => abrirPago(f.proveedorId, f.id)); return b; } }
        ]
      }));
      caja.appendChild(bloque);
    });

    // lista de proveedores
    const filas = App.db.proveedores.filter(p => p.activo !== false).map(p => {
      const pf = App.q.pendientesProveedor(p.id);
      const prox = pf.slice().sort((a, b) => a.vence < b.vence ? -1 : 1)[0];
      return { p, saldo: App.q.saldoProveedor(p.id), impagas: pf.length, vencido: suma(pf.filter(f => f.vence < hoy)), prox, semana: suma(pf.filter(f => f.vence <= finSemana)) };
    });
    const filtrar = () => { const t = ui.normalizar(textoLista).trim(); return filas.filter(x => ui.coincide(t, x.p.razonSocial, x.p.cuit, x.p.codigo, ...(x.p.marcas || []))); };
    const tabla = ui.tabla({
      filas: filtrar(), alClic: x => ui.ir('#/proveedores/' + x.p.id),
      filaClase: x => x.vencido > 0.01 ? 'fila-peligro' : '',
      pie: ['Total', '', '', ui.pesos(filas.reduce((s, x) => s + x.semana, 0)), ui.pesos(filas.reduce((s, x) => s + x.saldo, 0))],
      columnas: [
        { titulo: 'Proveedor', ordenar: x => x.p.razonSocial, valor: x => celda(x.p.razonSocial, x.p.codigo + ', CUIT ' + x.p.cuit) },
        { titulo: 'Plazo', clase: 'ocultar-celu', alinear: 'der', ordenar: x => x.p.plazo, valor: x => x.p.plazo + ' días' },
        { titulo: 'Próximo vencimiento', clase: 'ocultar-celu', ordenar: x => x.prox ? x.prox.vence : '9', valor: x => x.prox ? h`${ui.fecha(x.prox.vence)} ${chipVence(x.prox)}` : '—' },
        { titulo: 'A pagar en 7 días, con lo vencido', alinear: 'der', campo: 'semana', valor: x => x.semana ? ui.pesos(x.semana) : '—' },
        { titulo: 'Saldo', alinear: 'der', campo: 'saldo', valor: x => h`<strong>${ui.pesos(x.saldo)}</strong>` }
      ]
    });
    el.querySelector('[data-lista]').appendChild(tabla);
    ui.buscador(el.querySelector('.filtros input'), (t, crudo) => { textoLista = crudo; tabla.actualizar(filtrar()); });
  }

  // ---------- ficha del proveedor ----------
  function vistaFicha(el, id) {
    const p = prov(id);
    if (!p) { el.innerHTML = String(h`<div class="vacio vacio-grande"><h1 class="titulo-vista">No se encontró el proveedor</h1><p>Puede que el enlace esté mal o que ya no exista.</p><a class="btn btn-primario" href="#/proveedores">Volver a Proveedores</a></div>`); return; }
    const hoy = App.hoy();
    const facturas = App.db.comprasFacturas.filter(f => f.proveedorId === p.id).sort((a, b) => a.fecha < b.fecha ? 1 : -1);
    const ordenes = App.db.ordenesCompra.filter(o => o.proveedorId === p.id).sort((a, b) => b.numero - a.numero);
    const pagos = App.db.pagos.filter(o => o.proveedorId === p.id).sort((a, b) => b.numero - a.numero);
    const pend = facturas.filter(f => saldoFC(f) > 0.01);
    const vencido = pend.filter(f => f.vence < hoy).reduce((s, f) => s + saldoFC(f), 0);
    const semana = pend.filter(f => f.vence <= F.sumar(hoy, 7)).reduce((s, f) => s + saldoFC(f), 0);
    const hace90 = F.sumar(hoy, -90);
    const comprado = facturas.filter(f => f.fecha >= hace90).reduce((s, f) => s + f.total, 0);
    const ultPago = pagos[0];
    const ocPend = ordenes.filter(o => o.estado === 'pendiente');
    el.innerHTML = String(h`<div class="encabezado-vista"><div><div class="migas"><a href="#/proveedores">Proveedores</a> / Ficha</div><h1 class="titulo-vista">${p.razonSocial}</h1>
        <p class="bajada">${p.codigo}, CUIT ${p.cuit}. Plazo de pago: ${p.plazo} días.</p></div>
      <div class="acciones"><button type="button" class="btn btn-fantasma" data-editar>Editar datos</button><a class="btn btn-secundario" href="#/compras/nueva/${p.id}">Nueva orden de compra</a><button type="button" class="btn btn-primario" data-pagar>Registrar pago</button></div></div>
      ${ui.franjaKpi([
        { titulo: 'Saldo a pagar', valor: ui.pesosCorto(App.q.saldoProveedor(p.id)), detalle: ui.pesos(App.q.saldoProveedor(p.id)) + ' en ' + pend.length + ' facturas' },
        { titulo: 'A pagar en 7 días, con lo vencido', valor: ui.pesosCorto(semana), detalle: vencido > 0.01 ? 'Incluye ' + ui.pesos(vencido) + ' vencido' : 'Sin saldo vencido', tono: vencido > 0.01 ? 'peligro' : semana ? 'alerta' : null },
        { titulo: 'Comprado en 90 días', valor: ui.pesosCorto(comprado), detalle: facturas.filter(f => f.fecha >= hace90).length + ' facturas' },
        { titulo: 'Último pago', valor: ultPago ? ui.pesosCorto(ultPago.total) : '—', detalle: ultPago ? ui.fecha(ultPago.fecha) + ', orden ' + ultPago.nro : 'Sin pagos' }
      ])}
      <div class="grilla-lado seccion"><div data-pestanas></div>
        <aside class="pila"><div class="panel"><h2 class="panel-titulo">Datos</h2><dl class="datos">
          <dt>Condición IVA</dt><dd>Responsable Inscripto</dd><dt>Dirección</dt><dd>${p.direccion || '—'}</dd><dt>Correo</dt><dd>${p.email || '—'}</dd><dt>Teléfono</dt><dd>${p.telefono || '—'}</dd>
          <dt>Marcas</dt><dd>${(p.marcas || []).join(', ') || '—'}</dd><dt>Productos</dt><dd>${App.db.productos.filter(x => x.proveedorId === p.id).length} en el catálogo</dd></dl></div>
          ${ocPend.length ? h`<div class="panel"><h2 class="panel-titulo">Pendientes de recepción</h2>${ocPend.map(o => h`<p style="margin:0 0 6px"><a href="#/compras/orden/${o.id}">Orden ${o.nro}</a> del ${ui.fecha(o.fecha)}, ${ui.pesos(o.total)}</p>`)}</div>` : ''}
        </aside></div>`);
    el.querySelector('[data-pagar]').addEventListener('click', () => abrirPago(p.id));
    el.querySelector('[data-editar]').addEventListener('click', () => editarProveedor(p));
    ui.pestanas(el.querySelector('[data-pestanas]'), [
      { id: 'ctacte', titulo: 'Cuenta corriente', render: panel => {
        const movs = App.q.ctaCteProveedor(p.id).reverse();
        panel.appendChild(ui.tabla({
          filas: movs, limite: 30, vacio: 'Sin movimientos.',
          alClic: m => { if (m.tipo === 'OP') { const op = App.get('pagos', m.refId); if (op) verOrdenPago(op); } else { const f = App.get('comprasFacturas', m.refId); if (f && f.ordenId) ui.ir('#/compras/orden/' + f.ordenId); } },
          columnas: [
            { titulo: 'Fecha', clase: 'ocultar-celu', valor: m => ui.fecha(m.fecha) },
            { titulo: 'Comprobante', valor: m => m.comprobante },
            { titulo: 'Debe (pagos)', alinear: 'der', valor: m => m.debe ? ui.pesos(m.debe) : '' },
            { titulo: 'Haber (compras)', alinear: 'der', valor: m => m.haber ? ui.pesos(m.haber) : '' },
            { titulo: 'Saldo', alinear: 'der', valor: m => h`<strong>${ui.pesos(m.saldo)}</strong>` }
          ]
        }));
      } },
      { id: 'facturas', titulo: 'Facturas', cuenta: pend.length || null, render: panel => {
        panel.appendChild(ui.tabla({
          filas: facturas, limite: 30, vacio: 'Sin facturas.',
          filaClase: f => saldoFC(f) > 0.01 && f.vence < hoy ? 'fila-peligro' : saldoFC(f) <= 0.01 ? 'fila-apagada' : '',
          alClic: f => { if (f.ordenId) ui.ir('#/compras/orden/' + f.ordenId); },
          columnas: [
            { titulo: 'Fecha', campo: 'fecha', valor: f => ui.fecha(f.fecha) },
            { titulo: 'Factura', ordenar: f => f.numero, valor: f => celda(f.tipo + ' ' + f.numero, f.items.length + (f.items.length === 1 ? ' renglón' : ' renglones')) },
            { titulo: 'Neto', clase: 'ocultar-celu', alinear: 'der', campo: 'neto', valor: f => ui.pesos(f.neto) },
            { titulo: 'IVA', clase: 'ocultar-celu', alinear: 'der', campo: 'iva', valor: f => ui.pesos(f.iva) },
            { titulo: 'Total', alinear: 'der', campo: 'total', valor: f => ui.pesos(f.total) },
            { titulo: 'Saldo', alinear: 'der', ordenar: saldoFC, valor: f => saldoFC(f) > 0.01 ? h`<strong>${ui.pesos(saldoFC(f))}</strong>` : '—' },
            { titulo: 'Vence', clase: 'ocultar-celu', campo: 'vence', valor: f => h`${ui.fecha(f.vence)} ${saldoFC(f) > 0.01 ? chipVence(f) : ui.estado('pagada')}` }
          ]
        }));
      } },
      { id: 'ordenes', titulo: 'Órdenes de compra', cuenta: ocPend.length || null, render: panel => {
        panel.appendChild(ui.tabla({
          filas: ordenes, limite: 30, vacio: 'Sin órdenes de compra.', alClic: o => ui.ir('#/compras/orden/' + o.id),
          columnas: [
            { titulo: 'N.º', campo: 'numero', valor: o => h`<strong>${o.nro}</strong>` },
            { titulo: 'Fecha', clase: 'ocultar-celu', campo: 'fecha', valor: o => ui.fecha(o.fecha) },
            { titulo: 'Productos', clase: 'ocultar-celu', valor: o => h`<span class="texto-2">${o.items.slice(0, 2).map(it => prod(it.productoId).descripcion).join(', ')}${o.items.length > 2 ? ' y ' + (o.items.length - 2) + ' más' : ''}</span>` },
            { titulo: 'Total', alinear: 'der', campo: 'total', valor: o => ui.pesos(o.total) },
            { titulo: 'Estado', valor: o => o.estado === 'recibida' ? ui.estado('recibida') : ui.chip('Por recibir', 'alerta') }
          ]
        }));
      } },
      { id: 'pagos', titulo: 'Pagos', render: panel => {
        panel.appendChild(ui.tabla({
          filas: pagos, limite: 30, vacio: 'No se registran pagos a este proveedor.', alClic: verOrdenPago,
          columnas: [
            { titulo: 'N.º', campo: 'numero', valor: o => h`<strong>${o.nro}</strong>` },
            { titulo: 'Fecha', clase: 'ocultar-celu', campo: 'fecha', valor: o => ui.fecha(o.fecha) },
            { titulo: 'Medios', clase: 'ocultar-celu', valor: o => o.medios.map(m => m.tipo === 'cheque' ? 'cheque endosado' : (NOMBRE_MEDIO[m.tipo] || m.tipo).toLowerCase()).filter((x, i, a) => a.indexOf(x) === i).join(', ') },
            { titulo: 'Facturas', clase: 'ocultar-celu', valor: o => h`<span class="texto-2">${o.imputaciones.map(i => i.numero).join(', ') || 'a cuenta'}</span>` },
            { titulo: 'A cuenta', clase: 'ocultar-celu', alinear: 'der', valor: o => o.aCuenta > 0.01 ? ui.pesos(o.aCuenta) : '—' },
            { titulo: 'Total', alinear: 'der', campo: 'total', valor: o => ui.pesos(o.total) }
          ]
        }));
      } }
    ], { clave: 'proveedor-ficha' });
  }

  App.modulo({
    id: 'proveedores',
    titulo: 'Proveedores',
    grupo: 'Administración',
    orden: 20,
    icono: '<svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 17V8l5-3v3l5-3v3l5-3v12z"/><path d="M6 13h1.5M10 13h1.5M14 13h1.5"/></svg>',
    // facturas que vencen hoy o ya vencieron
    contador: () => pendientesTodas().filter(f => f.vence <= App.hoy()).length || '',
    render(el, params) {
      estilos();
      const [id] = params || [];
      if (id) return vistaFicha(el, id);
      return vistaLista(el);
    }
  });
})();
