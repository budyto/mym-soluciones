// Campaña → Ventas del Grupo MyM (21/11/2026, Mati Jefe: «que quede conectado ya»).
// Cada vez que la planilla de la campaña se carga (al abrirla y cada minuto mientras está abierta), los cambios pasan
// solos a la página de Ventas (grupomym.online/ventas, base del grupo: empresas/ventas/embudo) y al CRM de Soluciones
// (empresas/agencia-ia/clients), que a su vez le manda el resumen al orquestador.
// Reglas: nunca se baja de etapa lo que un vendedor ya avanzó a mano; una baja o un «no» siempre se pasa (Ley 26.951).
// Usa la misma conexión a la base del grupo que «Prospección por mail» (app 'grupo'): si en este navegador nunca se
// conectó, lo avisa en la página y no hace nada. Los datos de los clientes no están en esta web: vienen de AppMyM.
(function () {
  'use strict';
  var CFG = { apiKey: 'AIzaSyDTLcVzYxFdz5AOzq40zaMDHhvaKC0SW-I', authDomain: 'grupo-mym-73b8d.firebaseapp.com', projectId: 'grupo-mym-73b8d', appId: '1:966952304229:web:99501761762dfd290cd08c' };
  var CANAL = 'WhatsApp campaña Créditos', VENDEDOR = 'Matías Nappe';
  var ETAPA_CRM = { 1: 'lead', 2: 'contactado', 3: 'diagnostico', 4: 'propuesta', 5: 'propuesta', 6: 'ganado', 7: 'perdido' };
  var app, fs, auth, ultimo = 0, corriendo = false;

  function aviso(t) {
    var p = document.getElementById('syncVentas');
    if (!p) { p = document.createElement('p'); p.id = 'syncVentas'; p.className = 'small'; p.style.cssText = 'margin:8px 0;color:#4a5878';
      var e = document.getElementById('error'); if (e && e.parentNode) e.parentNode.insertBefore(p, e); else return; }
    p.innerHTML = t;
  }
  function iniciar() {
    if (app) return true;
    if (!window.firebase || !firebase.firestore) return false;
    try { app = firebase.app('grupo'); } catch (e) { app = firebase.initializeApp(CFG, 'grupo'); }
    fs = app.firestore(); auth = app.auth();
    return true;
  }
  function dia(iso) { if (!iso) return ''; return new Date(new Date(iso).getTime() - 3 * 3600e3).toISOString().slice(0, 10); }
  function hoy() { return dia(new Date().toISOString()); }
  function linda(s) { return String(s || '').toLowerCase().replace(/(^|\s)\S/g, function (m) { return m.toUpperCase(); }); }
  // Lo que dice la campaña → etapa y paso de Ventas
  function destino(f) {
    if (f.estado === 'baja' || f.estado === 'no') return { etapa: 7, paso: 'no', txt: f.estado === 'baja' ? 'Pidió la baja en la campaña: no volver a escribirle (Ley 26.951).' : 'Contestó que no le interesa.' };
    if (f.estado === 'pidio_pdf') return { etapa: 3, paso: 'interesado', txt: 'Pidió el PDF en la campaña: llamarlo.' };
    if (f.estado === 'respondio') return { etapa: 3, paso: 'interesado', txt: 'Contestó la campaña: llamarlo.' };
    if (f.estado === 'encolado' || f.estado === 'enviado') return { etapa: 2, paso: 'escrito', txt: 'Le llegó la campaña por ' + (f.canal === 'mail' ? 'mail' : 'WhatsApp') + '.' };
    return null; // falta, mandando, error, rebote: todavía no hay nada que pasar
  }
  function copiarCrm(id, d) {
    return fs.collection('empresas').doc('agencia-ia').collection('clients').doc('ventas-' + id).set({
      id: 'ventas-' + id, nombre: d.contacto || d.negocio, empresa: d.negocio, etapa: ETAPA_CRM[d.etapa] || 'lead', origen: 'WhatsApp',
      plan: 'Bot de WhatsApp', responsable: d.vendedor || '', honorario: d.abono || 0, moneda: 'ARS', desdeVentas: id, actualizado: new Date().toISOString()
    }, { merge: true }).catch(function () {});
  }
  async function sincronizar(datos) {
    if (corriendo || Date.now() - ultimo < 4 * 60e3) return;
    if (!iniciar()) return;
    var u = auth.currentUser;
    if (!u) { aviso('🔌 Para que la campaña pase sola a <b>Ventas</b> del Grupo MyM, entrá una vez a <a href="mails.html">Prospección por mail</a> y conectá la base del grupo.'); return; }
    corriendo = true; ultimo = Date.now();
    try {
      var col = fs.collection('empresas').doc('ventas').collection('embudo');
      var qs = await col.where('canal', '==', CANAL).get();
      var porNum = {};
      qs.docs.forEach(function (d) { var x = d.data(), n = x.campanaId || ((String(x.notas || '').match(/N\.º\s*(\d+)/) || [])[1]); if (n) porNum[String(n)] = { id: d.id, x: x }; });
      var nuevos = 0, cambiados = 0, quien = u.email + ' (campaña automática)';
      for (var k = 0; k < (datos.filas || []).length; k++) {
        var f = datos.filas[k], dest = destino(f); if (!dest) continue;
        var num = String(f.cliente_id || ''); if (!num) continue;
        var ya = porNum[num], fecha = dia(f.respondio_en || f.enviado_en) || hoy();
        if (!ya) {
          var d = { negocio: linda(f.nombre), contacto: linda(f.nombre), tel: f.contacto || '', rubro: f.rubro || '', canal: CANAL, vendedor: VENDEDOR, producto: 'Bot de WhatsApp',
            etapa: dest.etapa, paso: dest.paso, alta: dia(f.enviado_en) || hoy(), ultimo: fecha, proximoManual: '', instalacion: null, abono: null, cobrado: null, motivo: dest.etapa === 7 ? dest.txt : '',
            notas: 'Cliente de MyM Créditos (N.º ' + num + '). ' + dest.txt, campanaId: num, historial: [{ fecha: fecha, texto: dest.txt, quien: quien }],
            cambiadoPor: quien, cambiado: firebase.firestore.FieldValue.serverTimestamp(), creado: firebase.firestore.FieldValue.serverTimestamp() };
          var ref = await col.add(d); await copiarCrm(ref.id, d); nuevos++; continue;
        }
        if (ya.x.campanaManual && dest.etapa !== 7) continue; // alguien lo revisó a mano: la campaña no lo vuelve a mover (solo las bajas)
        var e = Number(ya.x.etapa) || 1;
        var subir = dest.etapa === 7 ? e !== 7 : (dest.etapa > e && e !== 7);
        if (!subir) { if (!ya.x.campanaId) await col.doc(ya.id).set({ campanaId: num }, { merge: true }); continue; }
        var cambio = { etapa: dest.etapa, paso: dest.paso, ultimo: fecha, campanaId: num, cambiadoPor: quien, cambiado: firebase.firestore.FieldValue.serverTimestamp(),
          historial: (ya.x.historial || []).concat([{ fecha: fecha, texto: dest.txt, quien: quien }]) };
        if (dest.etapa === 7) cambio.motivo = dest.txt;
        if (f.estado === 'pidio_pdf' && !/pdf/i.test(ya.x.notas || '')) cambio.notas = (ya.x.notas || '') + ' Pidió el PDF.';
        await col.doc(ya.id).set(cambio, { merge: true }); await copiarCrm(ya.id, Object.assign({}, ya.x, cambio)); cambiados++;
      }
      aviso('✅ Pasado a <b>Ventas</b> del Grupo MyM a las ' + new Date().toTimeString().slice(0, 5) + (nuevos || cambiados ? ': ' + nuevos + ' nuevos y ' + cambiados + ' que avanzaron.' : ': sin cambios.') + ' Se repite solo mientras esta página esté abierta.');
    } catch (err) {
      aviso('⚠️ No se pudo pasar a Ventas: ' + String(err && err.message || err).replace(/[<>]/g, ''));
    } finally { corriendo = false; }
  }
  window.addEventListener('campana-datos', function (ev) { sincronizar(ev.detail || {}); });
})();
