// Propuesta comercial de MyM Soluciones.
// 1) Pone el nombre de la empresa (y del contacto) que viene en la dirección:
//      propuesta/?empresa=Nombre%20de%20la%20Empresa&contacto=Nombre
//    Se muestran siempre como texto (textContent), nunca como HTML. No se lee ningún otro dato.
// 2) Arma los botones «Quiero este plan» con el WhatsApp de config.js y el mensaje ya escrito.
// 3) Pone la fecha de hoy y saca la promoción cuando pasa su fecha (30/11/2026).
// 4) Si un video MP4 no carga, muestra en su lugar la animación (videos/src/).
(function () {
  "use strict";
  var cfg = window.SITE || {};
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };

  // Limpia lo que viene en la dirección: sin saltos ni caracteres invisibles, espacios simples y largo máximo
  function limpiar(v, max) {
    if (!v) return "";
    return String(v)
      .replace(/[\u0000-\u001F\u007F-\u009F\u00AD\u200B-\u200F\u2028-\u202F\u2060-\u206F\uFEFF]/g, " ")
      .replace(/\s+/g, " ").trim().slice(0, max);
  }
  var q;
  try { q = new URLSearchParams(location.search); } catch (e) { q = { get: function () { return null; } }; }
  var empresa = limpiar(q.get("empresa"), 80);
  var contacto = limpiar(q.get("contacto"), 40);

  if (empresa) {
    $("#pp-empresa").textContent = empresa;
    $("#pp-para").textContent = empresa;
    document.title = "Propuesta para " + empresa + " — MyM Soluciones";
  }
  if (contacto) $("#pp-saludo").textContent = "Hola, " + contacto + ".";

  // Fecha de hoy, con la hora de Argentina
  var ahora = new Date();
  try {
    $("#pp-fecha").textContent = new Intl.DateTimeFormat("es-AR", { timeZone: "America/Argentina/Buenos_Aires", day: "2-digit", month: "2-digit", year: "numeric" }).format(ahora);
  } catch (e) { /* queda la fecha escrita en la página */ }

  // La promoción vale hasta el 30/11/2026 inclusive (hora de Argentina): después no se muestra más
  if (ahora.getTime() >= Date.parse("2026-12-01T00:00:00-03:00")) document.documentElement.classList.add("promo-vencida");

  // Botones a WhatsApp, con el plan y la empresa en el mensaje
  function mensaje(plan) {
    var quien = "Hola!";
    if (contacto && empresa) quien += " Soy " + contacto + ", de " + empresa + ".";
    else if (empresa) quien += " Escribo de " + empresa + ".";
    else if (contacto) quien += " Soy " + contacto + ".";
    if (plan) return quien + " Quiero el plan " + plan + " de la propuesta de MyM Soluciones.";
    return quien + " Vi la propuesta de MyM Soluciones y quiero hacer una consulta.";
  }
  if (cfg.whatsapp) {
    $$("[data-plan]").forEach(function (a) {
      a.href = "https://wa.me/" + cfg.whatsapp + "?text=" + encodeURIComponent(mensaje(a.getAttribute("data-plan")));
      a.target = "_blank";
      a.rel = "noopener";
    });
  }

  var imprimir = $("#pp-imprimir");
  if (imprimir) imprimir.addEventListener("click", function () { window.print(); });

  // Si el MP4 no está o no carga, va la animación de la carpeta videos/src/ en un cuadro vertical
  $$("video[data-anim]").forEach(function (v) {
    var puesto = false;
    function animacion() {
      if (puesto) return;
      puesto = true;
      var m = document.createElement("iframe");
      m.src = v.getAttribute("data-anim");
      m.title = v.getAttribute("aria-label") || "Animación del plan";
      m.loading = "lazy";
      v.parentNode.replaceChild(m, v);
    }
    var fuente = v.querySelector("source");
    if (fuente) fuente.addEventListener("error", animacion);
    v.addEventListener("error", animacion);
    // Por si el error llegó antes de que corriera este archivo
    if (v.networkState === 3 || (fuente && v.error)) animacion();
  });
})();
