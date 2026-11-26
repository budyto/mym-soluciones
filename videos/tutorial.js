// Videos tutoriales del alta y del cuestionario (25/11/2026, pedido de Budy). Cada .tuto trae la tarjeta (botón) y el
// <video preload="none"> escondido. Al tocar la tarjeta se muestra el video y arranca: lo pidió la persona, así que puede
// sonar. «Cerrar el video» lo pausa y vuelve a la tarjeta. Sirve también para tarjetas que se agregan después (el
// cuestionario arma sus preguntas con JavaScript), porque escucha los clics en todo el documento.
(function () {
  'use strict';
  document.addEventListener('click', function (e) {
    var abrir = e.target.closest && e.target.closest('.tuto-btn');
    var cerrar = e.target.closest && e.target.closest('.tuto-cerrar');
    if (!abrir && !cerrar) return;
    var caja = (abrir || cerrar).closest('.tuto'); if (!caja) return;
    var ver = caja.querySelector('.tuto-ver'); var v = caja.querySelector('video'); var b = caja.querySelector('.tuto-btn');
    if (abrir) {
      b.hidden = true; ver.hidden = false;
      var p = v.play(); if (p && p.catch) p.catch(function () { /* si el navegador no deja, queda con los controles */ });
      v.focus();
    } else {
      v.pause(); ver.hidden = true; b.hidden = false; b.focus();
    }
  });
})();
