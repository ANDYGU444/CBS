/* =========================================================
   CBS · interacciones del sitio
   ========================================================= */
(function () {
  "use strict";

  var CONFIG = window.CBS_CONFIG = {
    whatsapp: "50687189634",   // WhatsApp de CBS
    telefono: "8718-9634",
    oficina: "2710-5020",
    sitioUrl: "",              // dirección final del sitio (para el QR de la pre-solicitud)
    // Mientras sea propuesta, WhatsApp abre el selector de contactos y no el chat de CBS
    modoPropuesta: true
  };
  window.cbsWa = function (text, num) {
    var t = encodeURIComponent(text || "Hola CBS");
    if (num) return "https://wa.me/" + num + "?text=" + t;
    return CONFIG.modoPropuesta ? "https://wa.me/?text=" + t : "https://wa.me/" + CONFIG.whatsapp + "?text=" + t;
  };

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  function toast(msg) {
    var t = document.createElement("div"); t.className = "toast"; t.textContent = msg; document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 3400);
  }
  window.cbsToast = toast;

  /* Guardar archivos: navegador normal o función de Claude ---------- */
  var dlNs = null;
  if (window.claude && typeof window.claude.use === "function") {
    try { window.claude.use("downloads").then(function (ns) { dlNs = ns; }, function () {}); } catch (e) { /* sin capacidad */ }
  }
  window.cbsInClaude = function () { return !!dlNs; };
  window.cbsSave = function (blob, name) {
    if (dlNs) return dlNs.save({ filename: name, data: blob }).then(function () { return "saved"; }, function (e) {
      if (e && e.code === "declined") return "declined"; throw e;
    });
    var url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    return Promise.resolve("saved");
  };

  /* Carga diferida de librerías ------------------------------------ */
  var loaded = {};
  window.cbsLoad = function (id) {
    if (loaded[id]) return loaded[id];
    var el = document.getElementById(id);
    loaded[id] = new Promise(function (res, rej) {
      if (!el) return rej(new Error("no " + id));
      if (el.getAttribute("data-src")) {
        var s = document.createElement("script"); s.src = el.getAttribute("data-src");
        s.onload = function () { res(); }; s.onerror = function () { loaded[id] = null; rej(new Error(id)); };
        document.body.appendChild(s);
      } else { try { (0, eval)(el.textContent); res(); } catch (e) { loaded[id] = null; rej(e); } }
    });
    return loaded[id];
  };

  /* Enlaces de WhatsApp -------------------------------------------- */
  $$("[data-wa]").forEach(function (a) { a.href = window.cbsWa(a.getAttribute("data-wa")); });
  $$("[data-year]").forEach(function (e) { e.textContent = new Date().getFullYear(); });
  if (CONFIG.modoPropuesta) $$("[data-wa]").forEach(function (a) {
    a.addEventListener("click", function () { setTimeout(function () { toast("Vista previa: en el sitio final este botón abre directo el chat de CBS."); }, 60); });
  });

  /* Encabezado flotante, menú y botón de WhatsApp ------------------ */
  var top = $("#top"), waf = $(".wa-f");
  function onScroll() { var y = window.pageYOffset; top.classList.toggle("float", y > 30); waf.classList.toggle("show", y > 600); }
  window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
  var solSec = document.getElementById("solicitud");
  if ("IntersectionObserver" in window) {
    var hideIn = {}, wo = new IntersectionObserver(function (es) {
      es.forEach(function (e) { hideIn[e.target.id] = e.isIntersecting; });
      waf.classList.toggle("off", Object.keys(hideIn).some(function (k) { return hideIn[k]; }));
    }, { threshold: .05 });
    [solSec, document.getElementById("qr")].forEach(function (s) { if (s) wo.observe(s); });
  }

  var menuB = $(".menu-b");
  function menu(open) {
    document.body.classList.toggle("menu-open", open); document.body.classList.toggle("lock", open);
    menuB.setAttribute("aria-expanded", open);
  }
  menuB.addEventListener("click", function () { menu(true); });
  $$("[data-close-menu]").forEach(function (b) { b.addEventListener("click", function () { menu(false); }); });
  $$("#msheet a").forEach(function (a) { a.addEventListener("click", function () { menu(false); }); });

  var navA = $$(".nav a");
  if ("IntersectionObserver" in window) {
    var so = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) navA.forEach(function (a) { a.classList.toggle("on", a.getAttribute("href") === "#" + e.target.id); }); });
    }, { rootMargin: "-45% 0px -50% 0px" });
    ["bonos", "pinte", "proceso", "experiencias", "qr", "contacto"].forEach(function (id) { var s = document.getElementById(id); if (s) so.observe(s); });
  }

  /* Entradas animadas ---------------------------------------------- */
  var rev = $$(".rv, .clip, .pop, [data-house]");
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -10% 0px", threshold: .1 });
    rev.forEach(function (el) { io.observe(el); });
  } else rev.forEach(function (el) { el.classList.add("in"); });
  requestAnimationFrame(function () { $$(".hero .rv, .hero .pop, [data-house]").forEach(function (e) { e.classList.add("in"); }); });

  /* ¿Qué bono es para mí? ------------------------------------------ */
  var quiz = $("[data-quiz]"), ans = {}, qs = $$(".qz", quiz), dots = $$(".dots i", quiz), res = $("[data-result]", quiz), qstep = $("[data-qstep]", quiz);
  var BONOS = {
    casa: { n: "Bono RAMT", t: "Para reparar, terminar, ampliar o mejorar la casa que ya tiene. Renueve su hogar con el respaldo de CBS.", sit: "casa" },
    lote: { n: "Bono Ordinario", t: "Si tiene lote, ya inició el camino. Construya su casa en su propio terreno con un trámite accesible y la mejor guía.", sit: "lote" },
    patio: { n: "Bono Patio", t: "Le permite construir su casa en el terreno familiar, cerca de los suyos y en su propio espacio.", sit: "patio" },
    sinlote: { n: "Bono Crédito", t: "¿No tiene lote? Hay solución: con el Bono Crédito le ayudamos a comprar lote y casa, y paga menos que un alquiler.", sit: "sinlote" }
  };
  function showQ(n) {
    qs.forEach(function (q) { q.classList.toggle("on", +q.getAttribute("data-q") === n); });
    res.classList.remove("on");
    dots.forEach(function (d, i) { d.classList.toggle("on", i < n); });
    qstep.textContent = "Pregunta " + n + " de 3";
  }
  function showResult() {
    var key = ans.q1 === "casa" ? "casa" : ans.q2, b = BONOS[key];
    $("[data-rname]", res).textContent = b.n; $("[data-rtext]", res).textContent = b.t;
    var ex = $("[data-rextra]", res);
    if (ans.q3 === "especial") { ex.hidden = false; ex.textContent = "Además, como en su hogar vive un adulto mayor o una persona con discapacidad, revisaremos el bono por discapacidad o adulto mayor, que permite una vivienda adaptada."; }
    else ex.hidden = true;
    $("[data-rgo]", res).setAttribute("data-sit", b.sit);
    if (ans.q3 === "especial") $("[data-rgo]", res).setAttribute("data-esp", "1"); else $("[data-rgo]", res).removeAttribute("data-esp");
    qs.forEach(function (q) { q.classList.remove("on"); });
    dots.forEach(function (d) { d.classList.add("on"); });
    qstep.textContent = "Resultado"; res.classList.add("on");
  }
  $$(".qopt", quiz).forEach(function (b) {
    b.addEventListener("click", function () {
      var q = +b.closest(".qz").getAttribute("data-q"), a = b.getAttribute("data-a");
      ans["q" + q] = a;
      if (q === 1) showQ(a === "casa" ? 3 : 2);
      else if (q === 2) showQ(3);
      else showResult();
    });
  });
  $$("[data-qback]", quiz).forEach(function (b) {
    b.addEventListener("click", function () { var q = +b.closest(".qz").getAttribute("data-q"); showQ(q === 3 && ans.q1 === "casa" ? 1 : q - 1); });
  });
  $("[data-qreset]", quiz).addEventListener("click", function () { ans = {}; showQ(1); });

  /* Botones que llevan a la pre-solicitud con datos ---------------- */
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("[data-sit]");
    if (!a || !window.cbsPrefill) return;
    window.cbsPrefill({ sit: a.getAttribute("data-sit"), esp: a.getAttribute("data-esp") });
  });

  /* Bonos: desplazamiento horizontal fijo -------------------------- */
  var hs = $("[data-hs]"), track = $("[data-track]"), bar = $("[data-hsbar]");
  function hsSetup() {
    var pin = window.innerWidth >= 900 && !reduce;
    hs.classList.toggle("pinned", pin);
    if (!pin) { hs.style.height = ""; track.style.transform = ""; return; }
    var extra = Math.max(0, track.scrollWidth - window.innerWidth);
    hs.style.height = (window.innerHeight + extra) + "px";
    hsMove();
  }
  function hsMove() {
    if (!hs.classList.contains("pinned")) {
      var m = track.scrollWidth - track.clientWidth; bar.style.width = (m > 0 ? track.scrollLeft / m * 100 : 0) + "%"; return;
    }
    var r = hs.getBoundingClientRect(), total = hs.offsetHeight - window.innerHeight;
    var p = Math.min(1, Math.max(0, -r.top / (total || 1))), extra = Math.max(0, track.scrollWidth - window.innerWidth);
    track.style.transform = "translate3d(" + (-p * extra) + "px,0,0)"; bar.style.width = (p * 100) + "%";
  }
  window.addEventListener("scroll", hsMove, { passive: true }); track.addEventListener("scroll", hsMove, { passive: true });
  window.addEventListener("resize", hsSetup); window.addEventListener("load", hsSetup); hsSetup();

  /* Pinte su casa --------------------------------------------------- */
  var stage = $("[data-stage]"), cname = $("[data-cname]"), cdot = $("[data-cdot]");
  var paint = { design: "clasica", wall: "#F7B47E", wallN: "Melocotón", roof: "#6B3F2A", roof2: "#4E2D1E", roofN: "Café", fam: "calido" };
  function applyPaint() {
    stage.setAttribute("data-design", paint.design);
    $$(".wall", stage).forEach(function (w) { w.style.fill = paint.wall; });
    $$(".roof", stage).forEach(function (w) { w.style.fill = paint.roof; });
    $$(".fascia", stage).forEach(function (w) { w.style.fill = paint.roof2; });
    cname.textContent = paint.wallN + " · " + (paint.design === "clasica" ? "Clásica" : "Moderna con block");
    cdot.style.background = paint.wall;
  }
  $$("[data-design]", $(".seg")).forEach(function (b) {
    b.addEventListener("click", function () { paint.design = b.getAttribute("data-design"); $$(".seg button").forEach(function (x) { x.classList.toggle("on", x === b); }); applyPaint(); });
  });
  $$("[data-walls] .sw").forEach(function (b) {
    b.addEventListener("click", function () {
      $$("[data-walls] .sw").forEach(function (x) { x.classList.toggle("on", x === b); });
      paint.wall = b.getAttribute("data-c"); paint.wallN = b.getAttribute("data-n"); paint.fam = b.getAttribute("data-f");
      applyPaint(); filterFam(paint.fam);
    });
  });
  $$("[data-roofs] .sw").forEach(function (b) {
    b.addEventListener("click", function () {
      $$("[data-roofs] .sw").forEach(function (x) { x.classList.toggle("on", x === b); });
      paint.roof = b.getAttribute("data-c"); paint.roof2 = b.getAttribute("data-c2"); paint.roofN = b.getAttribute("data-n"); applyPaint();
    });
  });
  $("[data-paint-go]").addEventListener("click", function () {
    if (window.cbsPrefill) window.cbsPrefill({ diseno: paint.design === "clasica" ? "Clásica" : "Moderna con block", color: paint.wallN + ", techo " + paint.roofN.toLowerCase() });
    setTimeout(function () { toast("Guardamos su diseño: " + cname.textContent + ". Complete su pre-solicitud."); }, 500);
  });
  applyPaint();

  var tiles = $$("[data-mosaic] .tile"), fchips = $$(".fchips button");
  function filterFam(f) {
    fchips.forEach(function (c) { c.classList.toggle("on", c.getAttribute("data-fam") === f); });
    tiles.forEach(function (t) { t.classList.toggle("dim", f !== "all" && t.getAttribute("data-fam") !== f); });
  }
  fchips.forEach(function (c) { c.addEventListener("click", function () { filterFam(c.getAttribute("data-fam")); }); });
  var lb = $("[data-lb]"), lbImg = $("[data-lbimg]");
  tiles.forEach(function (t) {
    t.addEventListener("click", function () { var i = $("img", t); lbImg.src = i.src; lbImg.alt = i.alt; lb.classList.add("open"); document.body.classList.add("lock"); $("[data-lbx]").focus(); });
  });
  function closeLb() { lb.classList.remove("open"); document.body.classList.remove("lock"); }
  $("[data-lbx]").addEventListener("click", closeLb);
  lb.addEventListener("click", function (e) { if (e.target === lb) closeLb(); });

  /* Su casa en 5 pasos: la llave recorre el camino ----------------- */
  var pathWrap = $("[data-path]"), prog = $("[data-prog]"), pkey = $("[data-pkey]"), stops = $$(".stop", pathWrap), sns = $$(".sn", pathWrap);
  var cards = $$("[data-cards] .scard"), cardsM = $("[data-cards-m]");
  cards.forEach(function (c) { cardsM.appendChild(c.cloneNode(true)); });
  var mcards = $$(".scard", cardsM), vsteps = $("[data-vsteps]"), vfill = $("[data-vfill]"), vkey = $("[data-vkey]");
  var L = prog.getTotalLength(), stopAt = [];
  prog.style.strokeDasharray = L; prog.style.strokeDashoffset = L;
  stops.forEach(function (s) {
    var cx = +s.getAttribute("cx"), cy = +s.getAttribute("cy"), best = 0, bd = 1e9;
    for (var l = 0; l <= L; l += 4) { var pt = prog.getPointAtLength(l), d = Math.hypot(pt.x - cx, pt.y - cy); if (d < bd) { bd = d; best = l; } }
    stopAt.push(best / L);
  });
  function stepsMove() {
    var sec = document.getElementById("proceso"), r = sec.getBoundingClientRect(), vh = window.innerHeight;
    var p = Math.min(1, Math.max(0, (vh * .75 - r.top) / (r.height * .7)));
    if (pathWrap.offsetParent) {
      prog.style.strokeDashoffset = L * (1 - p);
      var pt = prog.getPointAtLength(L * p), box = pathWrap.getBoundingClientRect(), sc = box.width / 1000;
      var ahead = prog.getPointAtLength(Math.min(L, L * p + 2)), ang = Math.atan2(ahead.y - pt.y, ahead.x - pt.x) * 180 / Math.PI;
      pkey.style.transform = "translate(" + (pt.x * sc) + "px," + (pt.y * sc) + "px) rotate(" + ang + "deg)";
      stopAt.forEach(function (s, i) { var on = p >= s - .005; stops[i].classList.toggle("on", on); sns[i].classList.toggle("on", on); cards[i].classList.toggle("on", on && (i === stopAt.length - 1 || p < stopAt[i + 1])); });
    } else {
      var vr = vsteps.getBoundingClientRect(), vp = Math.min(1, Math.max(0, (vh * .6 - vr.top) / vr.height)), h = vr.height - 16;
      vfill.style.height = (vp * h) + "px"; vkey.style.top = (8 + vp * h) + "px";
      mcards.forEach(function (c) { var cr = c.getBoundingClientRect(); c.classList.toggle("on", cr.top < vh * .6 && cr.bottom > vh * .3); });
    }
  }
  window.addEventListener("scroll", stepsMove, { passive: true }); window.addEventListener("resize", stepsMove); stepsMove();

  /* Mitos: tarjetas que giran -------------------------------------- */
  $$(".flip").forEach(function (f) { f.addEventListener("click", function () { f.classList.toggle("on"); f.setAttribute("aria-pressed", f.classList.contains("on")); }); });

  /* Experiencias: historias ---------------------------------------- */
  var STORIES = [
    { img: "img/s-gris20.jpg", s: "Historias reales", t: "Nuestros clientes hablan por nosotros", v: "20 mil" },
    { img: "img/s-verde11.jpg", s: "Su bono, su hogar", t: "Convierta su bono en un hogar", v: "11 mil" },
    { img: "img/s-vidrio16.jpg", s: "Con respaldo", t: "Construya con respaldo", v: "16 mil" },
    { img: "img/s-blanca23.jpg", s: "A su medida", t: "Diseños pensados para su familia", v: "2,3 mil" },
    { img: "img/s-lila1.jpg", s: "Un sueño cumplido", t: "Un hogar digno para su familia", v: "1 mil" },
    { img: "img/s-block24.jpg", s: "Para todos los gustos", t: "Variedad de diseños", v: "2,4 mil" }
  ];
  var screen = $("[data-screen]"), barsEl = $("[data-bars]"), list = $("[data-xplist]"), phone = $("[data-stories]");
  STORIES.forEach(function (st, i) {
    var sl = document.createElement("div"); sl.className = "slide";
    sl.innerHTML = '<img src="' + st.img + '" alt="" loading="lazy"><div class="st-cap"><span class="s">' + st.s + "</span><p>" + st.t +
      '</p><span class="v"><svg><use href="#i-eye"/></svg>' + st.v + " reproducciones en Facebook</span></div>";
    screen.insertBefore(sl, $(".tap.l", screen));
    var b = document.createElement("i"); b.innerHTML = "<span></span>"; barsEl.appendChild(b);
    var li = document.createElement("li");
    li.innerHTML = '<button type="button"><span class="ring"><img src="' + st.img + '" alt="" loading="lazy"></span><span><b>' + st.t + "</b><small>" + st.v + " reproducciones</small></span></button>";
    li.firstChild.addEventListener("click", function () {
      go(i);
      var r = phone.getBoundingClientRect();
      if (r.top < 0 || r.bottom > window.innerHeight) phone.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    });
    list.appendChild(li);
  });
  var slides = $$(".slide", screen), barI = $$("i", barsEl), items = $$("button", list), cur = 0, t0 = 0, DUR = 5500, paused = false, visible = false, pausedAt = 0;
  function go(i) {
    cur = (i + STORIES.length) % STORIES.length; t0 = performance.now(); pausedAt = 0;
    slides.forEach(function (s, k) { s.classList.toggle("on", k === cur); });
    barI.forEach(function (b, k) { b.classList.toggle("done", k < cur); b.firstChild.style.width = k < cur ? "100%" : "0"; });
    items.forEach(function (b, k) { b.classList.toggle("on", k === cur); b.firstChild.style.setProperty("--p", k < cur ? 100 : 0); });
    $("[data-st-sub]").textContent = "Historia " + (cur + 1) + " de " + STORIES.length;
  }
  function tick(now) {
    if (visible && !paused) {
      var p = Math.min(1, (now - t0) / DUR);
      barI[cur].firstChild.style.width = (p * 100) + "%"; items[cur].firstChild.style.setProperty("--p", p * 100);
      if (p >= 1) go(cur + 1);
    }
    requestAnimationFrame(tick);
  }
  $("[data-prev]").addEventListener("click", function () { go(cur - 1); });
  $("[data-next]").addEventListener("click", function () { go(cur + 1); });
  var holdT = null;
  screen.addEventListener("pointerdown", function () { holdT = setTimeout(function () { paused = true; pausedAt = performance.now(); phone.classList.add("paused"); }, 260); });
  ["pointerup", "pointerleave", "pointercancel"].forEach(function (ev) {
    screen.addEventListener(ev, function () { clearTimeout(holdT); if (paused) { paused = false; t0 += performance.now() - pausedAt; phone.classList.remove("paused"); } });
  });
  if ("IntersectionObserver" in window) new IntersectionObserver(function (es) {
    es.forEach(function (e) { var was = visible; visible = e.isIntersecting; if (visible && !was) t0 = performance.now() - (parseFloat(barI[cur].firstChild.style.width) || 0) / 100 * DUR; });
  }, { threshold: .4 }).observe(phone); else visible = true;
  go(0); if (!reduce) requestAnimationFrame(tick);

  /* Comparta su experiencia ---------------------------------------- */
  var stars = 0, starBtns = $$("[data-star]"), xsend = $("[data-xsend]"), xmsg = $("[data-xmsg]");
  starBtns.forEach(function (b) {
    b.addEventListener("click", function () { stars = +b.getAttribute("data-star"); starBtns.forEach(function (x) { x.classList.toggle("on", +x.getAttribute("data-star") <= stars); }); updX(); });
  });
  function xText() {
    var n = $("[data-xn]").value.trim(), c = $("[data-xc]").value.trim(), t = $("[data-xt]").value.trim();
    return "Hola CBS, quiero compartir mi experiencia.\n" + "★".repeat(stars) + "☆".repeat(5 - stars) + " (" + stars + "/5)\n" +
      "Nombre: " + n + (c ? "\nComunidad: " + c : "") + "\n\n" + t + ($("[data-xok]").checked ? "\n\nAutorizo a CBS a publicar mi comentario con mi nombre y comunidad." : "\n\n(No autorizo publicar mi nombre.)");
  }
  function updX() { xsend.href = window.cbsWa(xText()); xmsg.hidden = true; }
  ["[data-xn]", "[data-xc]", "[data-xt]", "[data-xok]"].forEach(function (s) { $(s).addEventListener("input", updX); $(s).addEventListener("change", updX); });
  xsend.addEventListener("click", function (e) {
    var miss = !stars ? "Elija de 1 a 5 estrellas." : !$("[data-xn]").value.trim() ? "Escriba su nombre." : $("[data-xt]").value.trim().length < 10 ? "Cuéntenos un poco más de su experiencia." : "";
    if (miss) { e.preventDefault(); xmsg.textContent = miss; xmsg.hidden = false; return; }
    updX();
  });
  updX();

  /* Códigos QR ------------------------------------------------------ */
  var QRS = {
    wa: { t: "Escríbanos por WhatsApp", d: "WhatsApp 8718-9634 · con mensaje listo", u: function () { return CONFIG.modoPropuesta ? "https://wa.me/?text=" + encodeURIComponent("Hola CBS, vi su código QR y quiero información sobre el bono de vivienda.") : "https://wa.me/" + CONFIG.whatsapp + "?text=" + encodeURIComponent("Hola CBS, vi su código QR y quiero información sobre el bono de vivienda."); }, f: "QR-CBS-WhatsApp.png",
      n: function () { return CONFIG.modoPropuesta ? "Vista previa: en el sitio final abre el chat del 8718-9634." : "Abre el chat del 8718-9634."; } },
    form: { t: "Haga su pre-solicitud", d: "Pre-solicitud de bono en línea", u: function () { return (CONFIG.sitioUrl || location.href.split("#")[0]) + "#solicitud"; }, f: "QR-CBS-Pre-solicitud.png",
      n: function () { return CONFIG.sitioUrl ? "Lleva a la pre-solicitud del sitio." : "En el sitio final apunta a la dirección de su página."; } },
    map: { t: "Visítenos en Guápiles", d: "125 norte del Almacén 3R, Guápiles", u: function () { return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent("125 norte del Almacén 3R, Guápiles"); }, f: "QR-CBS-Ubicacion.png", n: function () { return "125 norte del Almacén 3R, Guápiles."; } },
    ig: { t: "Síganos en Instagram", d: "instagram.com/constructoracbs", u: function () { return "https://www.instagram.com/constructoracbs/"; }, f: "QR-CBS-Instagram.png", n: function () { return "@constructoracbs"; } }
  };
  var qbox = $("[data-qbox]"), curQ = "wa";
  function drawQR(k) {
    curQ = k; var q = QRS[k], url = q.u(), m = window.CBSQR.make(url, "M"), n = m.size + 8, rects = "";
    for (var r = 0; r < m.size; r++) for (var c = 0; c < m.size; c++) if (m.matrix[r][c]) rects += '<rect x="' + (c + 4) + '" y="' + (r + 4) + '" width="1.02" height="1.02" style="--k:' + (r + c) + '"/>';
    qbox.innerHTML = '<svg viewBox="0 0 ' + n + " " + n + '" shape-rendering="crispEdges" class="' + (reduce ? "" : "qwave") + '" role="img" aria-label="Código QR: ' + q.t + '"><rect width="' + n + '" height="' + n + '" fill="#fff"/><g fill="#141414">' + rects + "</g></svg>";
    $("[data-qtitle]").textContent = q.t;
    $("[data-qurl]").textContent = q.d;
    $("[data-qnote]").textContent = q.n();
    $$(".qtabs button").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-qr") === k); });
  }
  $$(".qtabs button").forEach(function (b) { b.addEventListener("click", function () { drawQR(b.getAttribute("data-qr")); }); });
  $("[data-qcopy]").addEventListener("click", function () {
    var url = QRS[curQ].u();
    try { navigator.clipboard.writeText(url).then(function () { toast("Enlace copiado."); }, function () { toast(url); }); } catch (e) { toast(url); }
  });
  var logoImg = new Image(); logoImg.src = "img/logo_dark_mark.png";
  $("[data-qsave]").addEventListener("click", function () {
    var go = function () { drawCard(); };
    if (document.fonts && document.fonts.load) Promise.all([document.fonts.load("66px Anton"), document.fonts.load("700 56px Caveat")]).then(go, go); else go();
  });
  function drawCard() {
    var q = QRS[curQ], m = window.CBSQR.make(q.u(), "M"), W = 1000, H = 1250, cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    var g = cv.getContext("2d");
    g.fillStyle = "#FF6410"; g.fillRect(0, 0, W, H);
    g.fillStyle = "#fff"; roundRect(g, 60, 60, W - 120, H - 120, 60); g.fill();
    try { var lw = 260, lh = lw * logoImg.naturalHeight / logoImg.naturalWidth; g.drawImage(logoImg, 110, 110, lw, lh); } catch (e) { /* sin logo */ }
    g.fillStyle = "#FF6410"; g.font = "700 56px Caveat, 'Segoe Script', cursive"; g.textAlign = "right"; g.fillText("¡Escanéeme!", W - 110, 175);
    var size = 720, cell = size / (m.size + 4), ox = (W - size) / 2, oy = 240;
    g.fillStyle = "#141414";
    for (var r = 0; r < m.size; r++) for (var c = 0; c < m.size; c++) if (m.matrix[r][c]) g.fillRect(Math.floor(ox + (c + 2) * cell), Math.floor(oy + (r + 2) * cell), Math.ceil(cell), Math.ceil(cell));
    g.textAlign = "center"; g.fillStyle = "#141414";
    var fs = 66, title = q.t.toUpperCase();
    do { g.font = fs + "px Anton, Impact, sans-serif"; fs -= 2; } while (g.measureText(title).width > 780 && fs > 28);
    g.fillText(title, W / 2, 1050);
    g.fillStyle = "#7B7671"; g.font = "500 32px Outfit, Poppins, sans-serif"; g.fillText("WhatsApp 8718-9634 · Tel. 2710-5020", W / 2, 1105);
    cv.toBlob(function (blob) {
      window.cbsSave(blob, q.f).then(function (st) { if (st === "saved") toast("Imagen lista para imprimir o compartir."); }).catch(function () { toast("No se pudo guardar la imagen en esta vista."); });
    }, "image/png");
  }
  function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  drawQR("wa");

  /* Escape ---------------------------------------------------------- */
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (lb.classList.contains("open")) closeLb(); else if (document.body.classList.contains("menu-open")) menu(false);
  });
})();
