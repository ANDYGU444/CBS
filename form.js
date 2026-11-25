/* =========================================================
   CBS · PRE-SOLICITUD (una pregunta a la vez) + PDF DE 4 COLORES CON QR
   Naranja = lote propio · Amarillo = terreno familiar · Negro = sin lote · Azul = ya tiene casa
   ========================================================= */
(function () {
  "use strict";
  var form = document.getElementById("sol");
  if (!form) return;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var CONF = { empresa: "Constructora Bien Social CBS", tel: "8718-9634", oficina: "2710-5020", versionAviso: "2026-11", logo: "img/logo_dark_mark.png", limite: 1940000 };
  var SIT = {
    lote: { k: "LOTE PROPIO", c: [255, 100, 16], hex: "#FF6410", f: "NARANJA", fn: "Lote-propio", bono: "Bono Ordinario", e: "🟠" },
    patio: { k: "TERRENO FAMILIAR", c: [242, 169, 0], hex: "#F2A900", f: "AMARILLO", fn: "Terreno-familiar", bono: "Bono Patio", e: "🟡" },
    sinlote: { k: "SIN LOTE", c: [30, 30, 30], hex: "#1E1E1E", f: "NEGRO", fn: "Sin-lote", bono: "Bono Crédito", e: "⚫" },
    casa: { k: "YA TIENE CASA", c: [47, 128, 237], hex: "#2F80ED", f: "AZUL", fn: "Tiene-casa", bono: "Bono RAMT", e: "🔵" }
  };
  var TOTAL = 6, step = 1, consentAt = null, lastPdf = null, STORE = "cbs_presolicitud_v1";
  var qs = $$(".q", form), bar = $("[data-cbar]"), nextB = $("[data-nextq]", form), prevB = $("[data-prevq]", form), err = $("[data-err]", form);
  var nav = $("[data-cnav]", form), done = $("[data-done]", form), enterH = $("[data-enter]", form), conv = $("[data-conv]");
  function toast(m) { if (window.cbsToast) window.cbsToast(m); }

  function val(n) {
    var els = form.elements[n]; if (!els) return "";
    if (els.length !== undefined && !els.tagName) {
      var out = []; for (var i = 0; i < els.length; i++) if (els[i].checked) out.push(els[i].value);
      return els[0].type === "checkbox" ? out.join(", ") : (out[0] || "");
    }
    if (els.type === "checkbox") return els.checked ? (els.value && els.value !== "on" ? els.value : "Sí") : "";
    return (els.value || "").trim();
  }
  function digits(s) { return (s || "").replace(/\D/g, ""); }
  function money(s) { return parseInt(digits(s), 10) || 0; }
  function fm(n) { return "¢" + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "."); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function crTime(d) {
    try { return new Intl.DateTimeFormat("es-CR", { timeZone: "America/Costa_Rica", day: "2-digit", month: "2-digit", year: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true }).format(d).replace(",", " ·"); }
    catch (e) { return d.toLocaleString(); }
  }

  /* pregunta 2 se adapta a la situación ------------------------------ */
  var Q2 = {
    lote: ["Sobre su lote", "¿Dónde está el lote?", "Nos ayuda a preparar la evaluación gratuita."],
    patio: ["Sobre el terreno familiar", "¿Dónde está el terreno?", "Con el Bono Patio puede construir en el lote de su familia."],
    sinlote: ["¿Dónde le gustaría vivir?", "Zona o comunidad de preferencia", "Con el Bono Crédito le ayudamos a conseguir lote y casa."],
    casa: ["Sobre su casa", "¿Dónde está su casa?", "Con el Bono RAMT puede repararla, terminarla o ampliarla."]
  };
  function adaptQ2() {
    var s = val("sit") || "lote", t = Q2[s];
    $("[data-q2t]", form).textContent = t[0]; $("[data-ubl]", form).textContent = t[1]; $("[data-q2h]", form).textContent = t[2];
    $$("[data-only]", form).forEach(function (el) { el.hidden = el.getAttribute("data-only").split(",").indexOf(s) === -1; });
  }

  /* formatos ------------------------------------------------------------ */
  $$("[data-money]", form).forEach(function (i) { i.addEventListener("input", function () { var n = digits(i.value).slice(0, 9); i.value = n ? String(parseInt(n, 10)).replace(/\B(?=(\d{3})+(?!\d))/g, ".") : ""; incWarn(); }); });
  $$("[data-tel]", form).forEach(function (i) { i.addEventListener("input", function () { var d = digits(i.value).slice(0, 8); i.value = d.length > 4 ? d.slice(0, 4) + "-" + d.slice(4) : d; }); });
  $$("[data-ced]", form).forEach(function (i) { i.addEventListener("blur", function () { var d = digits(i.value); if (d.length === 9) i.value = d[0] + "-" + d.slice(1, 5) + "-" + d.slice(5); }); });
  function incWarn() { $("[data-inc-warn]", form).hidden = money(val("ingreso")) <= CONF.limite; }
  var per = form.elements.personas;
  $("[data-up]", form).addEventListener("click", function () { per.value = Math.min(15, (parseInt(per.value, 10) || 1) + 1); save(); });
  $("[data-dn]", form).addEventListener("click", function () { per.value = Math.max(1, (parseInt(per.value, 10) || 1) - 1); save(); });
  form.elements.consent.addEventListener("change", function () { consentAt = this.checked ? new Date() : null; });

  /* validación ----------------------------------------------------------- */
  var MSG = { sit: "Elija la situación que más se parece a la suya.", ubicacion: "Indique dónde está (comunidad y cantón).", nombre: "Escriba su nombre completo.",
    cedula: "Revise la cédula: debe tener 9 números (ej: 7-0123-0456).", telefono: "Revise el teléfono: debe tener 8 números (ej: 8888-1234).", canton: "Elija su cantón.",
    ingreso: "Indique el ingreso mensual aproximado del hogar.", fuente: "Indique de dónde vienen los ingresos.", previo: "Indique si ha recibido un bono antes.",
    consent: "Para continuar, marque la casilla de autorización." };
  function validate() {
    var q = qs[step - 1], bad = null;
    $$(".bad", q).forEach(function (e) { e.classList.remove("bad"); });
    $$("[data-req]", q).forEach(function (el) {
      if (bad) return;
      var n = el.name, v = val(n), ok = !!v;
      if (ok && el.hasAttribute("data-ced")) ok = digits(v).length >= 9 && digits(v).length <= 12;
      if (ok && el.hasAttribute("data-tel")) ok = digits(v).length === 8;
      if (ok && el.hasAttribute("data-money")) ok = money(v) > 0;
      if (!ok) { bad = n; if (/text|tel/.test(el.type) || el.tagName === "SELECT") { el.classList.add("bad"); if (el.hasAttribute("data-money")) $("[data-moneybox]", form).classList.add("bad"); } }
    });
    if (step === 4 && !bad) { /* sin requeridos */ }
    if (bad) {
      showErr(MSG[bad] || "Falta una respuesta.");
      var f = form.elements[bad]; if (f && f.length && !f.tagName) f = f[0];
      if (f && f.focus && f.type !== "radio" && f.type !== "checkbox") f.focus();
      return false;
    }
    showErr(""); return true;
  }
  function showErr(m) { err.textContent = m; err.hidden = !m; }

  /* navegación -------------------------------------------------------------- */
  function go(n, dir) {
    step = n;
    if (n === 2) adaptQ2();
    if (n === TOTAL) { review(); if (window.cbsLoad) window.cbsLoad("lz-pdf").catch(function () {}); }
    qs.forEach(function (q, i) { q.classList.remove("on", "back"); if (i === n - 1) { q.classList.add("on"); if (dir < 0) q.classList.add("back"); } });
    bar.style.width = ((n - 1) / TOTAL * 100 + 100 / TOTAL / 2) + "%";
    prevB.hidden = n === 1;
    nextB.innerHTML = n === TOTAL ? "Crear mi PDF ✓" : 'Continuar <svg><use href="#i-arrow"/></svg>';
    nextB.classList.toggle("btn-ink", n !== TOTAL);
    showErr("");
    var first = qs[n - 1].querySelector("input[type=text],input[type=tel]");
    if (first && dir !== 0 && window.matchMedia("(hover:hover)").matches) setTimeout(function () { first.focus({ preventScroll: true }); }, 350);
  }
  function next() { if (!validate()) return; if (step < TOTAL) { go(step + 1, 1); save(); keepInView(); } else finish(); }
  function keepInView() { var r = conv.getBoundingClientRect(); if (r.top < 0 || r.top > window.innerHeight * .4) conv.scrollIntoView({ behavior: "smooth", block: "start" }); }
  nextB.addEventListener("click", next);
  prevB.addEventListener("click", function () { if (step > 1) { go(step - 1, -1); keepInView(); } });
  form.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey && e.target.tagName !== "TEXTAREA" && e.target.tagName !== "BUTTON" && done.hidden) { e.preventDefault(); next(); }
  });
  form.addEventListener("submit", function (e) { e.preventDefault(); });
  form.addEventListener("change", function (e) {
    save(); if (step === TOTAL) review();
    if (e.target.name === "sit" && step === 1) { showErr(""); setTimeout(function () { if (step === 1 && val("sit")) next(); }, 380); }
  });
  form.addEventListener("input", function (e) {
    save(); if (!err.hidden) showErr("");
    if (e.target.classList) e.target.classList.remove("bad");
    var mb = $("[data-moneybox]", form); if (e.target.name === "ingreso") mb.classList.remove("bad");
  });

  /* rellenar desde otras secciones ------------------------------------------- */
  window.cbsPrefill = function (o) {
    if (o.sit) { $$("input[name=sit]", form).forEach(function (r) { r.checked = r.value === o.sit; }); }
    if (o.esp === "disc") form.elements.disc.checked = true;
    if (o.esp === "adulto") form.elements.adulto.checked = true;
    if (o.diseno) form.elements.diseno.value = o.diseno;
    if (o.color) form.elements.color.value = o.color;
    save();
    if (o.sit && step === 1) setTimeout(function () { go(2, 1); }, 700);
  };

  /* guardar progreso ------------------------------------------------------------ */
  function save() {
    try {
      var d = { step: step };
      $$("input, select", form).forEach(function (el) {
        if (!el.name || el.name === "consent") return;
        if (el.type === "radio") { if (el.checked) d[el.name] = el.value; }
        else if (el.type === "checkbox") { (d["cb_" + el.name] = d["cb_" + el.name] || []); if (el.checked) d["cb_" + el.name].push(el.value); }
        else d[el.name] = el.value;
      });
      localStorage.setItem(STORE, JSON.stringify(d));
    } catch (e) { /* sin almacenamiento */ }
  }
  function restore() {
    try {
      var d = JSON.parse(localStorage.getItem(STORE) || "null"); if (!d) return;
      $$("input, select", form).forEach(function (el) {
        if (el.type === "radio") { if (el.name in d) el.checked = el.value === d[el.name]; }
        else if (el.type === "checkbox") { if (("cb_" + el.name) in d) el.checked = d["cb_" + el.name].indexOf(el.value) !== -1; }
        else if (el.name in d && el.name !== "consent") el.value = d[el.name];
      });
      if (d.step > 1 && d.step <= TOTAL) step = d.step;
    } catch (e) { /* ignorar */ }
  }
  function clearSaved() { try { localStorage.removeItem(STORE); } catch (e) { /* ignorar */ } }

  /* datos -------------------------------------------------------------------- */
  function collect() {
    var d = {};
    ["sit", "ubicacion", "docs", "obra", "diseno", "color", "nombre", "cedula", "telefono", "canton", "adulto", "disc", "jefe", "fuente", "previo"].forEach(function (k) { d[k] = val(k); });
    d.S = SIT[d.sit] || SIT.lote; d.personas = Math.max(1, parseInt(val("personas"), 10) || 1); d.ingreso = money(val("ingreso"));
    if (d.sit === "sinlote" || d.sit === "casa") d.docs = "";
    if (d.sit !== "casa") d.obra = "";
    var a = [];
    if (d.ingreso > CONF.limite) a.push("Ingreso del hogar mayor a ¢1.940.000: revisar opciones disponibles.");
    if ((d.sit === "lote" || d.sit === "patio") && d.docs === "Solo plano") a.push("El terreno tiene solo plano: verificar la escritura.");
    if ((d.sit === "lote" || d.sit === "patio") && (!d.docs || d.docs === "No sé")) a.push("No sabe si tiene plano y escritura: revisar en la evaluación.");
    if (d.sit === "sinlote") a.push("Sin lote: orientar sobre la compra de lote con Bono Crédito.");
    if (d.sit === "casa" && !d.obra) a.push("No indicó qué necesita hacerle a la casa.");
    if (d.previo !== "No") a.push("Bono previo: " + (d.previo || "sin respuesta") + ". Verificar en el BANHVI.");
    if (d.adulto || d.disc) a.push("Adulto mayor o persona con discapacidad: revisar bono para casos especiales.");
    if (d.jefe) a.push("Padre o madre jefe de hogar: revisar beneficios que apliquen.");
    d.alertas = a;
    d.flags = [];
    if (d.adulto) d.flags.push("ADULTO MAYOR"); if (d.disc) d.flags.push("DISCAPACIDAD"); if (d.jefe) d.flags.push("JEFE DE HOGAR");
    if (d.diseno) d.flags.push("DISEÑO: " + d.diseno.toUpperCase() + (d.color ? " · " + d.color.toUpperCase() : ""));
    var now = new Date(), p = function (n) { return (n < 10 ? "0" : "") + n; };
    d.codigo = "CBS-" + String(now.getFullYear()).slice(2) + p(now.getMonth() + 1) + p(now.getDate()) + "-" + p(now.getHours()) + p(now.getMinutes()) + p(now.getSeconds());
    d.fecha = crTime(now); d.consentAt = consentAt ? crTime(consentAt) : d.fecha;
    var corto = d.nombre.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z ]/g, "").trim().split(/\s+/).slice(0, 2).join("-") || "Solicitante";
    d.archivo = d.S.f + "_" + d.S.fn + "_" + corto + ".pdf";
    d.tel506 = "506" + digits(d.telefono);
    return d;
  }
  function review() {
    var d = collect(), box = $("[data-review]", form);
    var rows = [["Situación", d.S.k.charAt(0) + d.S.k.slice(1).toLowerCase()], ["Bono sugerido", d.S.bono], ["Nombre", d.nombre], ["Teléfono", d.telefono], ["Personas", String(d.personas)], ["Ingreso", fm(d.ingreso)]];
    box.innerHTML = '<div class="rv-h" style="background:' + d.S.hex + '"><i></i>' + d.S.k + " · Revise sus datos</div><dl>" +
      rows.map(function (r) { return "<dt>" + r[0] + "</dt><dd>" + esc(r[1] || "—") + "</dd>"; }).join("") + '</dl><button type="button" class="ed">✎ Corregir algo</button>';
    $(".ed", box).addEventListener("click", function () { go(1, -1); });
  }

  /* PDF -------------------------------------------------------------------------- */
  function loadLogo() {
    return fetch(CONF.logo).then(function (r) { if (!r.ok) throw 0; return r.blob(); }).then(function (b) {
      return new Promise(function (res) { var fr = new FileReader(); fr.onload = function () { res(fr.result); }; fr.onerror = function () { res(null); }; fr.readAsDataURL(b); });
    }).catch(function () { return null; });
  }
  function drawQR(doc, text, x, y, size) {
    var m = window.CBSQR.make(text, "M"), n = m.size + 4, c = size / n;
    doc.setFillColor(255, 255, 255); doc.rect(x, y, size, size, "F");
    doc.setFillColor(20, 20, 20);
    for (var r = 0; r < m.size; r++) for (var k = 0; k < m.size; k++) if (m.matrix[r][k]) doc.rect(x + (k + 2) * c, y + (r + 2) * c, c + .02, c + .02, "F");
  }
  function buildPdf(d, logo) {
    var doc = new window.jspdf.jsPDF({ unit: "mm", format: "letter" });
    var W = 215.9, H = 279.4, M = 14, CW = W - 2 * M, C = d.S.c, INK = [20, 20, 20], GR = [120, 114, 108], OR = [255, 100, 16], y;
    var light = d.sit === "patio";
    doc.setProperties({ title: "Pre-solicitud " + d.codigo, subject: "Bono de vivienda · CBS", author: d.nombre, creator: "Sitio web de CBS" });
    function footer() {
      doc.setFillColor.apply(doc, OR); doc.rect(0, H - 11, W, 11, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(8.2); doc.setTextColor(255, 255, 255);
      doc.text("CBS · Constructora Bien Social · WhatsApp " + CONF.tel + " · Tel. " + CONF.oficina, M, H - 4.3);
      doc.setFont("helvetica", "normal"); doc.text(d.codigo + " · Autorizado por el solicitante", W - M, H - 4.3, { align: "right" });
    }
    function ensure(h) { if (y + h > H - 16) { footer(); doc.addPage(); y = 16; } }

    // franja de color
    doc.setFillColor.apply(doc, C); doc.rect(0, 0, W, 30, "F");
    var tc = light ? INK : [255, 255, 255];
    doc.setTextColor.apply(doc, tc); doc.setFont("helvetica", "bold"); doc.setFontSize(26); doc.text(d.S.k, M, 15);
    doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.text("Bono sugerido: " + d.S.bono + (d.ubicacion ? "  ·  " + d.ubicacion : ""), M, 23, { maxWidth: 130 });
    doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.text(d.codigo, W - M, 13, { align: "right" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.6); doc.text("Recibida: " + d.fecha, W - M, 20, { align: "right" });

    // logo y título
    y = 36;
    if (logo) { try { doc.addImage(logo, "PNG", M, y, 30, 11.5, undefined, "FAST"); } catch (e) { /* sin logo */ } }
    doc.setFont("helvetica", "normal"); doc.setFontSize(6.6); doc.setTextColor.apply(doc, GR); doc.text("CONSTRUCTORA BIEN SOCIAL", M, y + 15.5, { charSpace: .5 });
    doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.setTextColor.apply(doc, INK); doc.text("Pre-solicitud de bono de vivienda", W - M, y + 6, { align: "right" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.6); doc.setTextColor.apply(doc, GR); doc.text("Preanálisis orientativo · Uso interno de CBS", W - M, y + 11.5, { align: "right" });
    y += 18; doc.setDrawColor.apply(doc, OR); doc.setLineWidth(.8); doc.line(M, y, W - M, y); y += 4;

    // etiquetas
    if (d.flags.length) {
      var fx = M; doc.setFont("helvetica", "bold"); doc.setFontSize(7.2);
      d.flags.forEach(function (f) {
        var tw = doc.getTextWidth(f) + 7; if (fx + tw > W - M) { fx = M; y += 7.5; }
        doc.setFillColor(255, 235, 221); doc.roundedRect(fx, y, tw, 5.8, 2.9, 2.9, "F"); doc.setTextColor(201, 70, 0); doc.text(f, fx + 3.5, y + 4); fx += tw + 2.5;
      });
      y += 9.5;
    }
    // resumen
    var quick = [["SITUACIÓN", d.S.k.charAt(0) + d.S.k.slice(1).toLowerCase()], ["INGRESO DEL HOGAR", fm(d.ingreso)], ["PERSONAS", String(d.personas)], ["BONO PREVIO", d.previo || "—"]];
    var qw = (CW - 9) / 4;
    quick.forEach(function (q, i) {
      var x = M + i * (qw + 3);
      doc.setFillColor(255, 245, 238); doc.roundedRect(x, y, qw, 12, 2.5, 2.5, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(6.6); doc.setTextColor.apply(doc, GR); doc.text(q[0], x + 3.5, y + 4.8);
      doc.setFontSize(11.5); doc.setTextColor.apply(doc, INK); doc.text(q[1], x + 3.5, y + 9.9, { maxWidth: qw - 6 });
    });
    y += 15;
    // alertas
    if (d.alertas.length) {
      doc.setFontSize(8.6); var lines = []; d.alertas.forEach(function (t) { lines = lines.concat(doc.splitTextToSize("•  " + t, CW - 8)); });
      var ah = 9 + lines.length * 4;
      doc.setFillColor(255, 247, 230); doc.setDrawColor(242, 169, 0); doc.setLineWidth(.3); doc.roundedRect(M, y, CW, ah, 2.5, 2.5, "FD");
      doc.setFont("helvetica", "bold"); doc.setFontSize(7.6); doc.setTextColor(150, 90, 0); doc.text("PUNTOS A REVISAR POR CBS", M + 4, y + 5.5);
      doc.setFont("helvetica", "normal"); doc.setFontSize(8.6); doc.setTextColor(70, 52, 20); doc.text(lines, M + 4, y + 10);
      y += ah + 4;
    }
    // secciones
    function section(title, fields) {
      var rowH = 9, rows = Math.ceil(fields.reduce(function (s, f) { return s + (f[2] || 1); }, 0) / 3);
      ensure(7 + rows * rowH + 4);
      doc.setFillColor.apply(doc, INK); doc.roundedRect(M, y, CW, 7, 1.5, 1.5, "F"); doc.rect(M, y + 4, CW, 3, "F");
      doc.setFillColor.apply(doc, OR); doc.circle(M + 4, y + 3.6, 1.1, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(8.4); doc.setTextColor(255, 255, 255); doc.text(title.toUpperCase(), M + 7, y + 4.8);
      y += 7;
      var cw = CW / 3, col = 0, top = y, start = y;
      doc.setDrawColor(236, 226, 216); doc.setLineWidth(.25);
      fields.forEach(function (f) {
        var sp = f[2] || 1; if (col + sp > 3) { col = 0; top += rowH; }
        var x = M + col * cw, w = cw * sp;
        doc.setFont("helvetica", "normal"); doc.setFontSize(6.6); doc.setTextColor.apply(doc, GR); doc.text(f[0].toUpperCase(), x + 3, top + 3.3);
        doc.setFont("helvetica", "bold"); doc.setFontSize(9.6); doc.setTextColor.apply(doc, INK); doc.text(doc.splitTextToSize(f[1] || "—", w - 5)[0], x + 3, top + 7.3);
        if (col > 0) doc.line(x, top, x, top + rowH);
        col += sp; if (col >= 3) { col = 0; top += rowH; }
      });
      if (col > 0) top += rowH;
      for (var ly = start + rowH; ly < top - .1; ly += rowH) doc.line(M, ly, W - M, ly);
      doc.rect(M, start, CW, top - start, "S"); y = top + 3.5;
    }
    section("1 · Solicitante", [["Nombre completo", d.nombre, 2], ["Cédula", d.cedula], ["Teléfono (WhatsApp)", d.telefono], ["Cantón", d.canton], ["Fuente de ingreso", d.fuente]]);
    section("2 · Hogar", [["Personas", String(d.personas)], ["Adulto mayor", d.adulto || "No"], ["Persona con discapacidad", d.disc || "No"], ["Padre o madre jefe de hogar", d.jefe || "No"], ["Bono de vivienda previo", d.previo], ["Ingreso mensual del hogar", fm(d.ingreso)]]);
    var tf = d.sit === "casa" ? [["Ubicación de la casa", d.ubicacion, 2], ["Necesita", d.obra || "Sin indicar"]]
      : d.sit === "sinlote" ? [["Zona de preferencia", d.ubicacion, 2], ["Bono sugerido", d.S.bono]]
      : [["Ubicación del terreno", d.ubicacion, 2], ["Plano y escritura", d.docs || "Sin respuesta"]];
    tf.push(["Diseño que le gusta", d.diseno || "Todavía no sabe"], ["Color", d.color || "—", 2]);
    section(d.sit === "casa" ? "3 · Su casa" : "3 · Terreno y diseño", tf);

    // códigos QR para el asesor
    ensure(44);
    doc.setFont("helvetica", "bold"); doc.setFontSize(8.4); doc.setTextColor.apply(doc, INK); doc.text("CÓDIGOS PARA EL ASESOR: ESCANEE CON EL CELULAR", M, y + 3.6);
    y += 6;
    var qrs = [["WhatsApp del solicitante", "https://wa.me/" + d.tel506 + "?text=" + encodeURIComponent("Hola " + d.nombre.split(" ")[0] + ", le escribe CBS sobre su pre-solicitud de bono de vivienda (" + d.codigo + ").")],
      ["Llamar al solicitante", "tel:+" + d.tel506]];
    if (d.ubicacion) qrs.push([d.sit === "sinlote" ? "Zona en el mapa" : "Ubicación en el mapa", "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(d.ubicacion + (d.canton && d.canton !== "Otro" ? ", " + d.canton : "") + ", Costa Rica")]);
    var qs2 = 26, gap = (CW - qrs.length * qs2) / Math.max(1, qrs.length);
    qrs.forEach(function (q, i) {
      var x = M + i * (qs2 + gap) + gap / 2;
      doc.setFillColor(255, 245, 238); doc.roundedRect(x - 3, y - 2, qs2 + 6, qs2 + 11, 3, 3, "F");
      try { drawQR(doc, q[1], x, y, qs2); } catch (e) { /* texto largo */ }
      doc.setFont("helvetica", "bold"); doc.setFontSize(7.4); doc.setTextColor.apply(doc, INK); doc.text(q[0], x + qs2 / 2, y + qs2 + 5.5, { align: "center" });
    });
    y += qs2 + 11;

    // declaración y constancia
    ensure(26);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(80, 74, 68);
    doc.text(doc.splitTextToSize("Declaro que la información es verdadera y autorizo a Constructora Bien Social CBS a usarla de forma confidencial, únicamente para evaluar mi trámite de bono de vivienda (Ley 8968). Este preanálisis es orientativo y no garantiza la aprobación; CBS verifica cada dato con los documentos.", 118), M, y + 3);
    doc.setDrawColor.apply(doc, INK); doc.setLineWidth(.3); doc.line(W - M - 58, y + 8, W - M, y + 8); doc.text("Firma del solicitante", W - M - 29, y + 11.5, { align: "center" });
    y += 14;
    doc.setFillColor(255, 245, 238); doc.setDrawColor(255, 178, 133); doc.roundedRect(M, y, CW, 11.5, 2.5, 2.5, "FD");
    doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(201, 70, 0); doc.text("CONSTANCIA DE ACEPTACIÓN", M + 4, y + 4.2);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.4); doc.setTextColor(80, 74, 68);
    doc.text("Marcó la casilla de autorización el " + d.consentAt + " (hora de Costa Rica), en el sitio web de CBS.", M + 4, y + 7.5);
    doc.text("Aviso de privacidad versión " + CONF.versionAviso + " · Código " + d.codigo + " · Teléfono declarado " + d.telefono, M + 4, y + 10.4);
    footer();
    if (window.CBS_CONFIG && window.CBS_CONFIG.modoPropuesta) {
      for (var p = 1; p <= doc.getNumberOfPages(); p++) {
        doc.setPage(p);
        try { doc.setGState(new doc.GState({ opacity: .07 })); } catch (e) { /* */ }
        doc.setFont("helvetica", "bold"); doc.setFontSize(46); doc.setTextColor(20, 20, 20); doc.text("VISTA PREVIA · PROPUESTA", W / 2, H / 2 + 30, { align: "center", angle: 32 });
        try { doc.setGState(new doc.GState({ opacity: 1 })); } catch (e) { /* */ }
      }
    }
    return doc;
  }

  function finish() {
    nextB.disabled = true; nextB.textContent = "Creando su PDF…";
    var d = collect();
    (window.cbsLoad ? window.cbsLoad("lz-pdf") : Promise.resolve()).then(function () {
      if (!window.jspdf || !window.jspdf.jsPDF) throw new Error("jspdf"); return loadLogo();
    }).then(function (logo) {
      var doc = buildPdf(d, logo);
      lastPdf = { blob: doc.output("blob"), name: d.archivo, data: d };
      var pc = $("[data-pdfcard]", form); pc.style.background = d.S.hex; pc.style.color = d.sit === "patio" ? "#141414" : "#fff";
      pc.innerHTML = '<span class="pg">PDF</span><span><b>' + esc(d.archivo) + "</b><small>" + d.S.k + " · " + d.codigo + "</small></span>";
      qs.forEach(function (q) { q.classList.remove("on"); }); nav.hidden = true; enterH.hidden = true; done.hidden = false; bar.style.width = "100%";
      clearSaved(); conv.scrollIntoView({ behavior: "smooth", block: "start" });
    }).catch(function () { showErr("No se pudo crear el PDF. Revise su conexión a Internet e inténtelo de nuevo."); })
      .then(function () { nextB.disabled = false; if (step === TOTAL) nextB.textContent = "Crear mi PDF ✓"; });
  }
  function waText(d) { return d.S.e + " " + d.S.k + " – " + d.nombre + " (" + d.codigo + ")\nHola CBS, les envío mi pre-solicitud de bono de vivienda."; }
  function saveIt() {
    if (!lastPdf) return Promise.resolve("none");
    return window.cbsSave(lastPdf.blob, lastPdf.name).catch(function () { toast("No se pudo guardar el PDF en esta vista."); return "error"; });
  }
  function showWa() { var w = $("[data-wa-open]", form); w.href = window.cbsWa(waText(lastPdf.data) + "\n(Adjunto el PDF " + lastPdf.name + ")"); w.hidden = false; }
  $("[data-send]", form).addEventListener("click", function () {
    if (!lastPdf) return;
    if (window.cbsInClaude && window.cbsInClaude()) { saveIt().then(function (st) { showWa(); if (st === "saved") toast("Elija WhatsApp en el menú, o use el botón negro para abrir el chat."); }); return; }
    var file = null; try { file = new File([lastPdf.blob], lastPdf.name, { type: "application/pdf" }); } catch (e) { /* */ }
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: "Pre-solicitud CBS", text: waText(lastPdf.data) }).catch(function (e) { if (e && e.name === "AbortError") return; saveIt(); showWa(); });
      return;
    }
    saveIt(); showWa();
    var w = null; try { w = window.open($("[data-wa-open]", form).href, "_blank", "noopener"); } catch (e) { /* */ }
    if (!w) toast("El PDF se guardó. Toque el botón negro para abrir WhatsApp y adjuntarlo.");
  });
  $("[data-save]", form).addEventListener("click", function () { saveIt().then(function (st) { if (st === "saved" && window.cbsInClaude && window.cbsInClaude()) toast("PDF guardado."); }); });
  $("[data-again]", form).addEventListener("click", function () {
    form.reset(); clearSaved(); lastPdf = null; consentAt = null; $("[data-wa-open]", form).hidden = true;
    done.hidden = true; nav.hidden = false; enterH.hidden = false; incWarn(); go(1, 0);
  });

  restore(); incWarn(); go(step, 0);
})();
