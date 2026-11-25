// El service worker del panel (25/11/2026, Budy: «que me avise en el celular con el panel cerrado»).
// Vive en admin/ y su alcance es sólo admin/: no toca la web pública. Hace dos cosas y nada más:
//   · muestra el aviso cuando el server de MyM manda un push (un mensaje nuevo de WhatsApp);
//   · al tocar el aviso, abre (o trae al frente) el panel en esa charla.
// No guarda páginas ni datos en caché: el panel siempre se carga del server, con el login de Google.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { texto: e.data ? e.data.text() : '' }; }
  e.waitUntil((async () => {
    // Con el panel a la vista y en foco no hace falta el aviso del sistema: el panel ya lo muestra y suena.
    const ventanas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (ventanas.some((w) => w.visibilityState === 'visible' && w.focused && /\/whatsapp\.html/.test(w.url))) return;
    await self.registration.showNotification(d.titulo || 'WhatsApp · MyM Soluciones', {
      body: d.texto || 'Entró un mensaje nuevo.',
      tag: d.tag || 'wa-panel',
      renotify: true,
      icon: '../img/icono-192.png',
      badge: '../img/favicon.png',
      data: { tel: d.tel || '' }
    });
  })());
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const tel = String((e.notification.data || {}).tel || '').replace(/\D/g, '');
  const url = new URL('whatsapp.html' + (tel ? '#tel=' + tel : ''), self.registration.scope).href;
  e.waitUntil((async () => {
    const ventanas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const panel = ventanas.find((w) => /\/whatsapp\.html/.test(w.url));
    if (panel) { await panel.focus(); panel.postMessage({ abrir: tel }); return; }
    await self.clients.openWindow(url);
  })());
});
