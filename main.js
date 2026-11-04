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
    { kw: ["sistema", "software", "stock", "pedido", "gestion", "gestión", "panel", "tablero", "app", "control", "cliente"],
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

  /* ---------- Demo del bot de WhatsApp (charla de ejemplo) ---------- */
  const chat = $("#chat");
  const waStatus = $("#wa-status");
  const script = [
    ["in", "Hola! Hacen envíos a Córdoba?"],
    ["out", "¡Hola! 😊 Sí, enviamos a todo el país. ¿Qué producto estás buscando?"],
    ["in", "Las zapatillas negras, talle 42"],
    ["out", "Tengo talle 42 en stock. ¿Me pasás tu nombre y localidad así te armo el pedido?"],
    ["in", "Lucía, Villa Carlos Paz"],
    ["sys", "✓ Datos guardados · pedido armado"],
    ["out", "¡Gracias, Lucía! Te paso con Martín del equipo para cerrar el envío 👋"],
  ];
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  async function runChat() {
    while (true) {
      chat.innerHTML = "";
      for (const [kind, text] of script) {
        if (kind === "out") {
          waStatus.textContent = "escribiendo…";
          const t = document.createElement("div");
          t.className = "typing"; t.innerHTML = "<span></span><span></span><span></span>";
          chat.appendChild(t);
          await wait(reduced ? 200 : 1100);
          t.remove();
          waStatus.textContent = "en línea";
        } else await wait(reduced ? 200 : 900);
        const m = document.createElement("div");
        m.className = `msg ${kind}`;
        m.textContent = text;
        chat.appendChild(m);
        while (chat.scrollHeight > chat.clientHeight && chat.children.length > 1) chat.firstElementChild.remove();
      }
      await wait(4500);
    }
  }
  onView(chat, runChat, 0.2);

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
