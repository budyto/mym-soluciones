// Videos de la propuesta: ajusta el lienzo de 1080 x 1920 a la ventana y maneja el tiempo.
// - Abierta normal (o embebida en la propuesta), la animación corre y vuelve a empezar sola.
// - Con ?capturar en la dirección, queda en pausa y hacer-videos.mjs la lleva cuadro por cuadro con irA(ms).
(function () {
  var lienzo = document.getElementById("lienzo");
  var dur = parseFloat(document.body.getAttribute("data-dur") || "30") * 1000;
  var capturar = /[?&]capturar/.test(location.search);

  function ajustar() {
    var s = Math.min(window.innerWidth / 1080, window.innerHeight / 1920);
    lienzo.style.transform = "translate(-50%, -50%) scale(" + s + ")";
  }
  ajustar();
  window.addEventListener("resize", ajustar);

  function arrancar() {
    // Todas las animaciones nacen juntas, así que el mismo reloj sirve para todas
    var anims = document.getAnimations();
    function irA(ms) { anims.forEach(function (a) { a.currentTime = ms; }); }
    if (capturar) {
      anims.forEach(function (a) { a.pause(); });
      irA(0);
      window.irA = irA;
      window.videoListo = true;
    } else {
      setInterval(function () { irA(0); }, dur);
    }
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(arrancar); else arrancar();
})();
