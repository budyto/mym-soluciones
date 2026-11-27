// Da de alta una empresa nueva en el sistema de distribuidoras (proyecto Firebase mym-distribuidoras)
// y deja invitado a su dueño. Lo corre MyM con la cuenta de administrador que tiene sesión en gcloud.
//
// Uso:
//   node firebase/alta-empresa.mjs --id distri-leandro --nombre "Distribuidora de Leandro" \
//     --dueno-mail leandro@ejemplo.com --dueno-nombre "Leandro" [--desde 2026-12-01] \
//     [--emulador] [--razon "Razón social S.R.L."] [--cuit 30-12345678-9] [--domicilio "..."] [--telefono "..."] [--mail-empresa "..."] [--punto-venta 3]
//   node firebase/alta-empresa.mjs --id distri-leandro --sumar-dueno otro@ejemplo.com --dueno-nombre "Socio"
//
// Después el dueño entra a mymsoluciones.online/sistema/ con ese mail (Crear cuenta o Google) y ya ve su empresa.
// No guarda contraseñas ni claves: cada persona elige la suya al entrar.
import { execSync } from 'node:child_process';

const PROYECTO = 'mym-distribuidoras';
const args = {};
const lista = process.argv.slice(2);
for (let i = 0; i < lista.length; i++) {
  if (lista[i].startsWith('--')) { const k = lista[i].slice(2); const v = lista[i + 1] && !lista[i + 1].startsWith('--') ? lista[++i] : true; args[k] = v; }
}
const fallar = m => { console.error('Error: ' + m); process.exit(1); };
if (!args.id || !/^[a-z0-9-]{3,40}$/.test(args.id)) fallar('falta --id (minúsculas, números y guiones; por ejemplo distri-leandro).');
const mail = String(args['sumar-dueno'] || args['dueno-mail'] || '').trim().toLowerCase();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) fallar('falta el mail del dueño (--dueno-mail).');
if (!args['dueno-nombre']) fallar('falta --dueno-nombre.');
const hoyAR = new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 10);

// --emulador: lo carga en los emuladores locales (pruebas), no en la base real
const token = args.emulador ? 'owner' : execSync('gcloud auth print-access-token', { encoding: 'utf8', shell: true }).trim();
const base = (args.emulador ? 'http://127.0.0.1:8080' : 'https://firestore.googleapis.com') + '/v1/projects/' + PROYECTO + '/databases/(default)/documents';
const nombreDoc = ruta => 'projects/' + PROYECTO + '/databases/(default)/documents/' + ruta;
async function api(metodo, url, cuerpo) {
  const r = await fetch(url, { method: metodo, headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', 'x-goog-user-project': PROYECTO }, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
  const t = await r.text();
  if (!r.ok) throw new Error(metodo + ' ' + url + ' → ' + r.status + ' ' + t);
  return t ? JSON.parse(t) : null;
}
// valores en el formato de la API de Firestore
const val = v => v === null ? { nullValue: null }
  : typeof v === 'boolean' ? { booleanValue: v }
  : typeof v === 'number' ? (Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v })
  : Array.isArray(v) ? { arrayValue: { values: v.map(val) } }
  : typeof v === 'object' ? { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, val(x)])) } }
  : { stringValue: String(v) };
const campos = o => Object.fromEntries(Object.entries(o).map(([k, x]) => [k, val(x)]));
const crear = (ruta, datos, conHora) => ({
  update: { name: nombreDoc(ruta), fields: campos(datos) },
  currentDocument: { exists: false },
  ...(conHora ? { updateTransforms: [{ fieldPath: conHora, setToServerValue: 'REQUEST_TIME' }] } : {})
});

const eid = args.id;
const invitacion = { empresaId: eid, empresa: '', rol: 'dueno', nombre: String(args['dueno-nombre']), puesto: '', modulos: [], acciones: [], invitadoPor: 'mym' };
const writes = [];
if (args['sumar-dueno']) {
  const emp = await api('GET', base + '/empresas/' + eid).catch(() => null);
  if (!emp) fallar('no existe la empresa ' + eid + '.');
  invitacion.empresa = emp.fields.nombre ? emp.fields.nombre.stringValue : '';
} else {
  if (!args.nombre) fallar('falta --nombre (el nombre de la empresa como se va a ver en el sistema).');
  invitacion.empresa = String(args.nombre);
  const config = {
    razonSocial: String(args.razon || args.nombre), cuit: String(args.cuit || ''), condicionIVA: 'Responsable Inscripto',
    domicilio: String(args.domicilio || ''), telefono: String(args.telefono || ''), email: String(args['mail-empresa'] || ''),
    puntoVenta: Number(args['punto-venta'] || 1)
  };
  writes.push(crear('empresas/' + eid, { nombre: String(args.nombre), desde: String(args.desde || hoyAR), config }, 'creada'));
  writes.push(crear('empresas/' + eid + '/meta/registro', { ultimo: 0 }));
}
writes.push(crear('invitaciones/' + mail, invitacion, 'creada'));

try {
  await api('POST', base + ':commit', { writes });
} catch (e) {
  if (String(e.message).includes('ALREADY_EXISTS')) fallar('ya existe esa empresa o ese mail ya tiene una invitación pendiente. Nada se cambió.');
  throw e;
}
console.log((args['sumar-dueno'] ? 'Dueño sumado a ' : 'Empresa creada: ') + eid);
console.log('Invitado como dueño: ' + invitacion.nombre + ' <' + mail + '>');
console.log('Que entre a https://mymsoluciones.online/sistema/ con ese mail (Crear cuenta o Ingresar con Google).');
