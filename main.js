(() => {
  const cfg = window.SITE || {};
  // ?motion=0 apaga las animaciones (versión estática).
  const reduced = /[?&]motion=0/.test(location.search);
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  if (reduced || !("IntersectionObserver" in window)) document.documentElement.classList.add("reduced");

  /* ---------- Básicos ---------- */
  $("#year").textContent = new Date().getFullYear();
  const waUrl = (text) => `https://wa.me/${cfg.whatsapp}?text=${encodeURIComponent(text)}`;
  $$("[data-wa]").forEach((a) => { a.href = waUrl(a.dataset.waText || cfg.whatsappText || ""); a.target = "_blank"; a.rel = "noopener"; });

  const nav = $("#nav");
  const onScroll = () => nav.classList.toggle("scrolled", scrollY > 20);
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Menú del celular (13/11/2026): debajo de 1000 px las secciones van en un panel que abre el botón ☰
  const toggle = $(".nav-toggle");
  if (toggle) {
    const pone = (abre) => { nav.classList.toggle("abierto", abre); toggle.setAttribute("aria-expanded", String(abre)); toggle.setAttribute("aria-label", abre ? "Cerrar el menú" : "Abrir el menú"); };
    toggle.addEventListener("click", () => pone(!nav.classList.contains("abierto")));
    $$("#menu a").forEach((a) => a.addEventListener("click", () => pone(false)));
    addEventListener("keydown", (e) => { if (e.key === "Escape") pone(false); });
  }

  // Corre una función la primera vez que el elemento entra en pantalla
  const onView = (el, fn, threshold = 0.35) => {
    if (!("IntersectionObserver" in window)) return fn();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { io.disconnect(); fn(); } });
    }, { threshold });
    io.observe(el);
  };

  // Aparición de las tarjetas al hacer scroll
  // Se mira la posición en cada scroll (sin IntersectionObserver): así nunca queda una tarjeta invisible.
  if (!document.documentElement.classList.contains("reduced")) {
    let pending = $$(".rv");
    pending.forEach((el, i) => { el.style.transitionDelay = `${(i % 4) * 70}ms`; });
    const reveal = () => {
      const limit = innerHeight - 40;
      pending = pending.filter((el) => {
        if (el.getBoundingClientRect().top < limit) { el.classList.add("in"); return false; }
        return true;
      });
      if (!pending.length) { removeEventListener("scroll", reveal); removeEventListener("resize", reveal); clearInterval(backup); }
    };
    addEventListener("scroll", reveal, { passive: true });
    addEventListener("resize", reveal);
    const backup = setInterval(reveal, 400); // por si el navegador no manda el scroll (saltos con #ancla, pestañas en segundo plano)
    reveal();
  }

  /* ---------- "Contanos qué te frena" ---------- */
  const SOLUTIONS = [
    { kw: ["whatsapp", "wsp", "mensaje", "respond", "contest", "ventas", "vender", "consulta", "instagram", "turno", "agenda"],
      kind: "Bot de WhatsApp", title: "Un bot que contesta en segundos, a cualquier hora",
      desc: "Responde con tus precios, horarios y preguntas frecuentes, toma los datos del cliente y agenda. Si la consulta es compleja, pasa la charla a tu equipo.",
      steps: ["Cargamos tu información y preguntas frecuentes", "Lo conectamos a WhatsApp con la API oficial", "Definimos cuándo pasa la charla a una persona"] },
    { kw: ["planilla", "excel", "mano", "carg", "copiar", "pasar", "factura", "document", "mail", "reporte", "repet"],
      kind: "Automatización de procesos", title: "Que la información se mueva sola",
      desc: "Lo que hoy alguien copia de un lado a otro se hace solo: carga de datos, avisos y reportes, con un aviso cuando algo necesita que lo mire una persona.",
      steps: ["Relevamos la tarea y de dónde sale cada dato", "Armamos la automatización con lo que ya usás", "La probamos con tu equipo antes de largarla"] },
    { kw: ["todo pasa por", "pasa por mi", "pasa por mí", "abasto", "encima de todo", "controlar", "supervis", "aprobar", "orquestador", "agente"],
      kind: "Orquestador de IA", title: "Un equipo de IA que propone y vos aprobás",
      desc: "Agentes armados para tu empresa miran la operación y te proponen qué hacer. Vos decidís desde el celular con un «sí» o un «no», y recién ahí se ejecuta.",
      steps: ["Relevamos qué hoy tiene que pasar sí o sí por vos", "Armamos los agentes y arrancan en modo espectador", "Los prendemos de a uno cuando confiás en lo que proponen"] },
    { kw: ["no compran", "no compra", "no vuelven", "no vuelve", "seguimiento", "interesad", "presupuesto", "se enfrian", "se enfrían"],
      kind: "Seguimiento de clientes", title: "Que ningún interesado quede sin respuesta",
      desc: "Le vuelve a escribir solo al que preguntó y no compró, ordena cada contacto con su estado y te avisa cuando alguien está listo para comprar.",
      steps: ["Definimos cuándo y qué se le escribe a cada interesado", "Lo conectamos a tu WhatsApp y a una planilla o CRM", "Te llega un resumen de lo que entró cada semana"] },
    { kw: ["sistema", "software", "stock", "pedido", "gestion", "gestión", "panel", "tablero", "app", "control", "venimos", "numeros", "números"],
      kind: "Software a medida", title: "Un sistema hecho para cómo trabajás",
      desc: "Un panel propio para tus pedidos, stock o clientes, y un tablero para ver cómo viene el día sin abrir cinco archivos.",
      steps: ["Definimos qué tiene que hacer y quién lo usa", "Te mostramos avances y lo ajustamos con vos", "Lo ponemos en marcha y lo acompañamos"] },
    { kw: ["web", "pagina", "página", "landing", "google", "sitio", "catalogo", "catálogo", "anuncio", "online"],
      kind: "Página web o landing de ventas", title: "Una página que te trae consultas",
      desc: "Tu web para que te encuentren, o una landing de ventas para tus anuncios: clara, rápida y con el botón directo a tu WhatsApp.",
      steps: ["Definimos a quién le habla y qué tiene que lograr", "Diseñamos y escribimos los textos con vos", "La publicamos conectada a tu WhatsApp"] },
  ];
  const FALLBACK = { kind: "A medida", title: "Lo vemos juntos en el diagnóstico",
    desc: "Tu caso no entra en una caja, y está bien: es justo lo que hacemos. En el diagnóstico gratis te decimos qué se puede automatizar y qué hace falta.",
    steps: ["Diagnóstico gratis", "Alcance y precio por escrito", "Implementación y pruebas con tu equipo"] };
  const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const askForm = $("#ask"), askInput = $("#ask-input"), answer = $("#answer");

  function solve(text) {
    const t = norm(text);
    let best = null, score = 0;
    SOLUTIONS.forEach((s) => {
      const n = s.kw.filter((k) => t.includes(norm(k))).length;
      if (n > score) { best = s; score = n; }
    });
    const s = best || FALLBACK;
    answer.classList.remove("answer-empty");
    answer.innerHTML = `
      <span class="kind">Te armaríamos · ${s.kind}</span>
      <h3>${s.title}</h3>
      <p>${s.desc}</p>
      <ol>${s.steps.map((x) => `<li>${x}</li>`).join("")}</ol>
      <a href="#contacto" class="btn btn-primary" id="ask-cta">Quiero esto · diagnóstico gratis <span class="arr">→</span></a>`;
    answer.style.animation = "none"; answer.offsetHeight; answer.style.animation = "";
    if (innerWidth < 1000) answer.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
    $("#ask-cta").addEventListener("click", () => {
      const ta = $("#lead-form textarea[name=problema]");
      if (ta && !ta.value) ta.value = text;
    });
  }
  askForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (askInput.value.trim()) solve(askInput.value.trim());
    else askInput.focus();
  });
  askInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); askForm.requestSubmit(); }
  });
  $$(".ask-chips button").forEach((b) => b.addEventListener("click", () => {
    askInput.value = b.textContent;
    solve(b.textContent);
  }));

  /* ---------- Celular que contesta solo (17/11/2026) ----------
     Los mensajes ya están en el HTML; acá solo se van mostrando de a uno. El que escribe la clienta se tipea en la barra de abajo
     y sale con el doble tilde; antes de cada respuesta del negocio aparecen los tres puntitos y el encabezado dice «escribiendo…».
     Al terminar vuelve a empezar. Se frena si el celular no está en pantalla o la pestaña está oculta.
     Sin movimiento (?motion=0 o «reducir movimiento» del sistema) la charla queda entera y quieta. */
  const sinMovimiento = document.documentElement.classList.contains("reduced") || (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  const tel = $("#tel");
  if (tel) {
    const chat = $("#tel-chat"), telEstado = $("#tel-estado"), campo = $("#tel-campo"), barra = $(".tel-barra", tel);
    const luego = $$(".tel-luego", chat);
    const alFinal = (suave) => {
      if (suave && chat.scrollTo) chat.scrollTo({ top: chat.scrollHeight, behavior: "smooth" });
      else chat.scrollTop = chat.scrollHeight;
    };
    if (sinMovimiento) {
      luego.forEach((el) => el.classList.remove("tel-luego"));
      alFinal(false);
      addEventListener("load", () => alFinal(false)); // por si la letra cambia el alto al terminar de cargar
    } else {
      let enPantalla = true;
      const cola = [];
      const sigue = () => enPantalla && !document.hidden;
      const despierta = () => { if (sigue()) cola.splice(0).forEach((f) => f()); };
      const espera = (ms) => new Promise((ok) => setTimeout(() => (sigue() ? ok() : cola.push(ok)), ms));
      document.addEventListener("visibilitychange", despierta);
      if ("IntersectionObserver" in window) {
        new IntersectionObserver((en) => { enPantalla = en[en.length - 1].isIntersecting; despierta(); }).observe(tel);
      }
      const puntos = document.createElement("div");
      puntos.className = "tel-m tel-entra tel-puntos";
      puntos.innerHTML = "<i></i><i></i><i></i>";
      const muestra = (el) => { el.classList.remove("tel-luego"); el.classList.add("tel-nuevo"); alFinal(true); };

      (async () => {
        for (;;) {
          await espera(2200);
          for (const el of luego) {
            if (el.classList.contains("tel-sale")) {
              // La clienta escribe en la barra, manda, y el tilde pasa de gris a azul
              const tilde = $(".tel-tilde", el);
              barra.classList.add("escribe");
              campo.textContent = "";
              for (const letra of Array.from($(".tel-tx", el).textContent)) {
                campo.textContent += letra;
                campo.scrollLeft = campo.scrollWidth;
                await espera(34 + Math.random() * 46);
              }
              await espera(380);
              barra.classList.remove("escribe");
              campo.textContent = "Mensaje";
              campo.scrollLeft = 0;
              tilde.classList.remove("leido");
              muestra(el);
              await espera(750);
              tilde.classList.add("leido");
              await espera(350);
            } else if (el.classList.contains("tel-entra")) {
              // El negocio contesta: «escribiendo…» y los tres puntitos, después el mensaje
              telEstado.textContent = "escribiendo…";
              chat.appendChild(puntos);
              alFinal(true);
              await espera(1000 + Math.min(1300, el.textContent.length * 14));
              puntos.remove();
              telEstado.textContent = "en línea";
              muestra(el);
              await espera(1300);
            } else {
              muestra(el);
              await espera(1000);
            }
          }
          await espera(5200);
          // Vuelve a empezar: se apaga, quedan los dos primeros mensajes y se prende
          chat.classList.add("tel-reinicia");
          await espera(450);
          luego.forEach((el) => { el.classList.add("tel-luego"); el.classList.remove("tel-nuevo"); });
          chat.scrollTop = 0;
          chat.classList.remove("tel-reinicia");
        }
      })();
    }
  }

  /* ---------- Reproductor del hero (17/11/2026) ----------
     Un <audio> real con controles propios: play/pausa, la onda (un slider: se toca, se arrastra o se mueve con las flechas),
     la velocidad y el tiempo. El audio no se baja hasta tocar play (preload="none"). */
  const rep = $("#rep");
  if (rep) {
    const audio = $("audio", rep), play = $(".rep-play", rep), onda = $(".rep-onda", rep);
    const repEstado = $(".rep-estado", rep), vel = $(".rep-vel", rep), tiempo = $(".rep-tiempo", rep);
    // Volumen real del audio en 48 tramos (medido del mp3), para que la onda sea la de la voz y no un dibujo cualquiera
    const PICOS = [100, 65, 85, 44, 72, 63, 66, 66, 20, 89, 77, 56, 48, 77, 56, 82, 63, 30, 79, 73, 79, 53, 64, 89, 78, 54, 74, 67, 76, 56, 74, 84, 57, 44, 66, 68, 92, 54, 22, 83, 67, 75, 94, 62, 73, 41, 65, 68];
    const DURACION = 31.52; // la del archivo (decodificado), hasta que el navegador la lea
    const TEXTO = { quieto: repEstado.textContent, sonando: "Te estamos contando…", pausa: "En pausa · tocá para seguir", cargando: "Cargando el audio…", error: "No pudimos cargar el audio. Escribinos por WhatsApp." };
    const dur = () => (isFinite(audio.duration) && audio.duration > 0 ? audio.duration : DURACION);
    const reloj = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
    let pos = 0; // segundo en el que está, aunque el audio todavía no haya cargado

    audio.removeAttribute("controls");
    const barras = PICOS.map((v, i) => {
      const b = document.createElement("i"), k = i / (PICOS.length - 1);
      b.style.setProperty("--h", `${Math.round(16 + 84 * Math.pow(v / 100, 1.7))}%`);
      // del azul al verde agua de la marca
      b.style.setProperty("--c", `rgb(${Math.round(47 - 47 * k)}, ${Math.round(107 + 87 * k)}, ${Math.round(255 - 87 * k)})`);
      onda.appendChild(b);
      return b;
    });

    const pinta = () => {
      const d = dur(), hasta = Math.round((pos / d) * barras.length);
      barras.forEach((b, i) => b.classList.toggle("on", i < hasta && pos > 0));
      onda.setAttribute("aria-valuemax", Math.round(d));
      onda.setAttribute("aria-valuenow", Math.round(pos));
      onda.setAttribute("aria-valuetext", `${Math.round(pos)} segundos de ${Math.round(d)}`);
      tiempo.textContent = reloj(pos > 0 || !audio.paused ? pos : d);
    };
    const salta = (s) => {
      pos = Math.max(0, Math.min(dur(), s));
      try { audio.currentTime = pos; } catch (e) { /* todavía sin cargar: se aplica cuando carga */ }
      pinta();
    };
    const cartel = (cual) => { repEstado.textContent = TEXTO[cual]; };

    play.addEventListener("click", () => {
      if (!audio.paused) { audio.pause(); return; }
      if (pos >= dur() - 0.05) salta(0);
      const p = audio.play();
      if (p && p.catch) p.catch(() => { rep.classList.remove("suena"); cartel("error"); });
    });
    audio.addEventListener("play", () => {
      rep.classList.add("suena");
      play.setAttribute("aria-label", "Pausar el audio");
      cartel(audio.readyState < 3 ? "cargando" : "sonando");
    });
    audio.addEventListener("loadedmetadata", () => { if (Math.abs(audio.currentTime - pos) > 0.3) audio.currentTime = pos; pinta(); });
    audio.addEventListener("playing", () => cartel("sonando"));
    audio.addEventListener("waiting", () => { if (!audio.paused) cartel("cargando"); });
    audio.addEventListener("timeupdate", () => { if (audio.readyState > 0 && !audio.seeking) { pos = audio.currentTime; pinta(); } });
    audio.addEventListener("pause", () => {
      rep.classList.remove("suena");
      play.setAttribute("aria-label", "Seguir escuchando el audio");
      if (!audio.ended) cartel("pausa");
    });
    audio.addEventListener("ended", () => {
      pos = 0; audio.currentTime = 0;
      play.setAttribute("aria-label", "Volver a escuchar el audio: qué hacemos, en 30 segundos");
      cartel("quieto"); pinta();
    });
    audio.addEventListener("error", () => { rep.classList.remove("suena"); cartel("error"); });

    // La onda: tocar o arrastrar para saltar; con teclado, flechas (2 s), Re Pág / Av Pág (10 s), Inicio y Fin
    const aSegundos = (e) => { const r = onda.getBoundingClientRect(); return ((e.clientX - r.left) / r.width) * dur(); };
    let arrastra = false;
    onda.addEventListener("pointerdown", (e) => {
      if (e.button) return;
      arrastra = true;
      if (onda.setPointerCapture) { try { onda.setPointerCapture(e.pointerId); } catch (err) { /* puntero sin captura */ } }
      salta(aSegundos(e));
    });
    onda.addEventListener("pointermove", (e) => { if (arrastra) salta(aSegundos(e)); });
    ["pointerup", "pointercancel"].forEach((t) => onda.addEventListener(t, () => { arrastra = false; }));
    onda.addEventListener("keydown", (e) => {
      const paso = { ArrowRight: 2, ArrowUp: 2, ArrowLeft: -2, ArrowDown: -2, PageUp: 10, PageDown: -10 }[e.key];
      if (paso) salta(pos + paso);
      else if (e.key === "Home") salta(0);
      else if (e.key === "End") salta(dur());
      else return;
      e.preventDefault();
    });

    // Velocidad: 1× → 1,5× → 2× → 1×
    const VELOCIDADES = [1, 1.5, 2];
    vel.addEventListener("click", () => {
      const v = VELOCIDADES[(VELOCIDADES.indexOf(audio.playbackRate) + 1) % VELOCIDADES.length];
      audio.defaultPlaybackRate = v; // para que no vuelva a 1× cuando el audio termina de cargar
      audio.playbackRate = v;
      const txt = `${String(v).replace(".", ",")}×`;
      vel.textContent = txt;
      vel.setAttribute("aria-label", `Velocidad ${txt}. Tocá para cambiarla`);
    });
    pinta();
  }

  /* ---------- Calculadora ---------- */
  // Calcula siempre en dólares; en pesos solo cambia cómo se muestra y el rango del costo.
  const r = { people: $("#r-people"), hours: $("#r-hours"), cost: $("#r-cost"), auto: $("#r-auto") };
  let currency = "USD";
  let rate = +cfg.usdArs || 1500;
  let costUsd = +r.cost.value;
  const RANGE = { USD: { min: 1, max: 150, step: 1 }, ARS: { min: 1000, max: 200000, step: 500 } };
  const money = (usdValue, compact) => {
    if (currency === "USD") return "US$ " + Math.round(usdValue).toLocaleString("es-AR");
    const ars = usdValue * rate;
    if (compact && ars >= 1e6) return "$ " + (ars / 1e6).toLocaleString("es-AR", { maximumFractionDigits: 1 }) + " M";
    return "$ " + Math.round(ars).toLocaleString("es-AR");
  };
  let lastSaving = "";
  function calc() {
    const p = +r.people.value, h = +r.hours.value, a = +r.auto.value / 100;
    costUsd = currency === "USD" ? +r.cost.value : +r.cost.value / rate;
    $("#o-people").textContent = p;
    $("#o-hours").textContent = `${h} h`;
    $("#o-cost").textContent = currency === "USD" ? `US$ ${r.cost.value}` : `$ ${(+r.cost.value).toLocaleString("es-AR")}`;
    $("#o-auto").textContent = `${Math.round(a * 100)}%`;
    const hoursMonth = p * h * 4.33 * a;
    const month = hoursMonth * costUsd;
    $("#roi-hours").textContent = `${Math.round(hoursMonth).toLocaleString("es-AR")} h`;
    $("#roi-month").textContent = money(month, true);
    $("#roi-year").textContent = money(month * 12, true);
    lastSaving = `${money(month * 12)}/año (${Math.round(hoursMonth)} h/mes)`;
  }
  function setCurrency(cur) {
    const usdNow = costUsd;
    currency = cur;
    Object.assign(r.cost, RANGE[cur]);
    const v = cur === "USD" ? usdNow : usdNow * rate;
    r.cost.value = Math.round(v / RANGE[cur].step) * RANGE[cur].step;
    $$(".cur-sw button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.cur === cur));
    $("#cur-rate").textContent = cur === "ARS" ? `1 USD = $ ${Math.round(rate).toLocaleString("es-AR")} (oficial)` : "";
    calc();
  }
  $$(".cur-sw button").forEach((b) => b.addEventListener("click", () => setCurrency(b.dataset.cur)));
  Object.values(r).forEach((i) => i.addEventListener("input", calc));
  calc();
  // Cotización oficial del día (si no responde, queda la de config.js)
  fetch("https://dolarapi.com/v1/dolares/oficial")
    .then((res) => res.json())
    .then((d) => { if (d && d.venta > 0) { rate = d.venta; if (currency === "ARS") setCurrency("ARS"); } })
    .catch(() => {});

  /* ---------- Formulario ---------- */
  const form = $("#lead-form");
  const msg = $("#form-msg");
  const sb = cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase
    ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey) : null;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    if (data.web) return; // honeypot anti-spam
    if (!data.nombre.trim() || !data.whatsapp.trim() || !data.problema.trim()) {
      msg.className = "form-msg err"; msg.textContent = "Completá nombre, WhatsApp y qué querés resolver.";
      return;
    }
    const btn = form.querySelector("button");
    btn.disabled = true;
    const lead = { nombre: data.nombre, whatsapp: data.whatsapp, empresa: data.empresa, rubro: data.rubro,
      problema: data.problema, ahorro_estimado: lastSaving, origen: location.href };

    if (sb) {
      const { error } = await sb.from("leads").insert(lead);
      btn.disabled = false;
      if (error) { msg.className = "form-msg err"; msg.textContent = "No pudimos enviarlo. Escribinos por WhatsApp."; return; }
      form.reset();
      msg.className = "form-msg ok"; msg.textContent = "¡Listo! Te escribimos por WhatsApp.";
    } else {
      // Sin Supabase configurado: abre WhatsApp con el pedido armado
      const text = `Hola! Soy ${lead.nombre}${lead.empresa ? ` de ${lead.empresa}` : ""} (${lead.rubro}).\nQuiero resolver: ${lead.problema}`;
      open(waUrl(text), "_blank", "noopener");
      btn.disabled = false;
      msg.className = "form-msg ok"; msg.textContent = "Te abrimos WhatsApp con tu consulta lista para enviar.";
    }
  });
})();
