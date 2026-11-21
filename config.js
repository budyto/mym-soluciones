// Configuración de la web. Cambiá estos valores y listo.
window.SITE = {
  // Número de WhatsApp en formato internacional, sin + ni espacios (ej: 5491112345678)
  whatsapp: "5491133662080",
  whatsappText: "Hola! Quiero agendar un diagnóstico gratis.",

  // El server de MyM, donde corre el robot del WhatsApp de MyM Soluciones (ventas-sol.js de AppMyM).
  // El panel admin/whatsapp.html lee y contesta esas charlas desde acá.
  ventasApi: "https://mym-creditos-81440681742.southamerica-east1.run.app",

  // Panel admin: se entra con Google y sólo estas cuentas. Matías, 21/11/2026: «los 3 tenemos que tener
  // acceso a todo». Esta es LA lista de la web (la usan todas las páginas de admin/ por acceso.js), pero cada
  // servidor vuelve a verificar la cuenta con su propia lista, que tiene que ser IGUAL a esta:
  //   - server de MyM (AppMyM): variable VENTAS_SOL_PANEL_EMAILS → inicio, WhatsApp, campaña, mails y métricas;
  //   - plataforma de bots: variable ADMIN_EMAILS (y su valor por defecto en servidor/index.js) → clientes,
  //     facturación y métricas;
  //   - base del Grupo MyM: diagnósticos = admins del grupo o miembros de la empresa «agencia-ia» (se suma
  //     desde el CRM); mails = admins del grupo o prospeccionSol() de crm/firestore.rules.
  // Si se suma o se saca una cuenta, se cambia acá y en esos lugares. firebaseWeb es la configuración pública
  // del proyecto de MyM (la misma del CRM): no es secreta.
  adminEmails: ["matiasvale32@gmail.com", "dagiodes1@gmail.com", "matiasnappe7@gmail.com"],
  firebaseWeb: {
    apiKey: "AIzaSyD8BTD9IhswuPxuCWDL1f-OiCkeIbvYDzY",
    authDomain: "appmym-5fdd1.firebaseapp.com",
    projectId: "appmym-5fdd1",
    appId: "1:81440681742:web:1a2bddb6f34fe637ec715f",
  },

  // Cotización de respaldo para la calculadora (pesos por dólar). La web intenta
  // traer la cotización oficial del día desde dolarapi.com; si falla, usa esta.
  usdArs: 1500,

  // Servidor de la plataforma de bots (proyecto mym-soluciones-bots, 14/11/2026). Mientras esté vacío,
  // /alta/ muestra que el alta automática se está preparando y no deja avanzar.
  plataformaApi: "https://plataforma-bots-332174980527.southamerica-east1.run.app",

  // Servidor del asistente de voz que atiende las llamadas de WhatsApp (VM bot-llamadas, appmym-5fdd1, 21/11/2026).
  // Lo usa admin/llamadas.html; la API exige el ingreso con Google de las tres cuentas del admin.
  llamadasApi: "https://34-151-227-10.sslip.io",

  // Supabase (opcional). Si queda vacío, el formulario manda el lead por WhatsApp.
  // Usá la "anon public key": es pública y la protege la política RLS de supabase-leads.sql.
  supabaseUrl: "",
  supabaseAnonKey: "",
};

// Vista previa en la compu (20/11/2026): en localhost la web habla con la plataforma de bots que corre en la compu
// (MEMORIA=1, puerto 8080, datos de prueba). En la web publicada no hace nada.
if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) window.SITE.plataformaApi = 'http://localhost:8080';
// Llamadas en la compu: el bot de llamadas corriendo con WEB_HTTP=1 PUERTO_WEB=8099 y datos de prueba.
if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) window.SITE.llamadasApi = 'http://localhost:8099';
