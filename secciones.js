// Bloques nuevos de la portada (26/11/2026): el selector de servicio de «Paso a paso» y los reels de la vitrina.
(() => {
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const quieto = () => document.documentElement.classList.contains("reduced") ||
    (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);

  /* ---------- Selector de servicio (pestañas accesibles: flechas, Inicio y Fin) ---------- */
  $$("[data-srv-tabs]").forEach((lista) => {
    const tabs = $$('[role="tab"]', lista);
    const elegir = (tab, foco) => {
      tabs.forEach((t) => {
        const si = t === tab;
        t.setAttribute("aria-selected", String(si));
        t.tabIndex = si ? 0 : -1;
        const panel = document.getElementById(t.getAttribute("aria-controls"));
        if (!panel) return;
        panel.hidden = !si;
        if (si) {
          panel.classList.remove("entra");
          void panel.offsetWidth; // reinicia la entrada de los pasos
          panel.classList.add("entra");
        }
      });
      if (foco) tab.focus();
    };
    tabs.forEach((t, i) => {
      t.addEventListener("click", () => elegir(t));
      t.addEventListener("keydown", (e) => {
        const ir = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
        if (ir === undefined) return;
        e.preventDefault();
        elegir(tabs[(ir + tabs.length) % tabs.length], true);
      });
    });
  });

  /* ---------- Reels: se reproducen sólo mientras se ven; con «menos movimiento», quietos con su portada ----------
     En el celular (hasta 640 px) se pide la versión de 360x640 y se mueve sólo el del medio: los de los costados quedan
     con su portada hasta que la persona toque su botón. Así en el celular baja un solo video (unos 400 KB). */
  const reels = $$(".reel video");
  if (!reels.length) return;
  const celular = !!(window.matchMedia && matchMedia("(max-width: 640px)").matches);
  reels.forEach((v, i) => {
    const boton = v.closest(".reel").querySelector(".reel-pp");
    v.muted = true; // por si el navegador ignora el atributo
    let enPantalla = false;
    // Frenado: la persona lo frenó, pidió menos movimiento o, en el celular, es uno de los costados.
    let frenado = quieto() || (celular && i !== 1);
    const fuente = () => {
      if (!v.getAttribute("src")) v.src = (celular && v.dataset.srcCel) || v.dataset.src;
    };
    const pinta = () => {
      // Un solo estado para el lector de pantalla: el nombre del botón dice lo que hace (sin aria-pressed).
      boton.dataset.anda = String(!frenado);
      boton.setAttribute("aria-label", (frenado ? "Reproducir " : "Pausar ") + "el reel: " + v.dataset.nombre);
    };
    const decide = () => {
      if (enPantalla && !frenado) { fuente(); const p = v.play(); if (p && p.catch) p.catch(() => {}); }
      else v.pause();
    };
    boton.addEventListener("click", () => { frenado = !frenado; pinta(); decide(); });
    pinta();
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((en) => { enPantalla = en[en.length - 1].isIntersecting; decide(); }, { threshold: 0.4 }).observe(v);
    } else { enPantalla = true; decide(); }
  });
})();
