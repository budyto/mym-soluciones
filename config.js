// Configuración de la web. Cambiá estos valores y listo.
window.SITE = {
  // Número de WhatsApp en formato internacional, sin + ni espacios (ej: 5491112345678)
  whatsapp: "5491133662080",
  whatsappText: "Hola! Quiero agendar un diagnóstico gratis.",

  // El server de MyM, donde corre el robot del WhatsApp de MyM Soluciones (ventas-sol.js de AppMyM).
  // El panel admin/whatsapp.html lee y contesta esas charlas desde acá.
  ventasApi: "https://mym-creditos-81440681742.southamerica-east1.run.app",

  // Panel admin (12/11/2026, Matías): se entra con Google y sólo estas cuentas. La lista de verdad la
  // controla el server de MyM (variable VENTAS_SOL_PANEL_EMAILS): esta copia sólo sirve para avisar
  // antes. firebaseWeb es la configuración pública del proyecto de MyM (la misma del CRM): no es secreta.
  adminEmails: ["matiasvale32@gmail.com", "dagiodes1@gmail.com"],
  firebaseWeb: {
    apiKey: "AIzaSyD8BTD9IhswuPxuCWDL1f-OiCkeIbvYDzY",
    authDomain: "appmym-5fdd1.firebaseapp.com",
    projectId: "appmym-5fdd1",
    appId: "1:81440681742:web:1a2bddb6f34fe637ec715f",
  },

  // Cotización de respaldo para la calculadora (pesos por dólar). La web intenta
  // traer la cotización oficial del día desde dolarapi.com; si falla, usa esta.
  usdArs: 1500,

  // Supabase (opcional). Si queda vacío, el formulario manda el lead por WhatsApp.
  // Usá la "anon public key": es pública y la protege la política RLS de supabase-leads.sql.
  supabaseUrl: "",
  supabaseAnonKey: "",
};
