/* =========================================================
   Generador de códigos QR (modo byte, corrección L o M, versiones 1–15)
   Escrito para el sitio de CBS. Uso:
     var m = CBSQR.make("https://wa.me/...", "M");  // m.size, m.dark(r, c)
     CBSQR.svg("texto", {ec:"M", fg:"#111", bg:"#fff", margin:2})
   ========================================================= */
(function (root) {
  "use strict";

  // [bloques, total, datos] por versión; L y M
  var RS = {
    L: [null, [1, 26, 19], [1, 44, 34], [1, 70, 55], [1, 100, 80], [1, 134, 108], [2, 86, 68], [2, 98, 78], [2, 121, 97], [2, 146, 116],
      [2, 86, 68, 2, 87, 69], [4, 101, 81], [2, 116, 92, 2, 117, 93], [4, 133, 107], [3, 145, 115, 1, 146, 116], [5, 109, 87, 1, 110, 88]],
    M: [null, [1, 26, 16], [1, 44, 28], [1, 70, 44], [2, 50, 32], [2, 67, 43], [4, 43, 27], [4, 49, 31], [2, 60, 38, 2, 61, 39], [3, 58, 36, 2, 59, 37],
      [4, 69, 43, 1, 70, 44], [1, 80, 50, 4, 81, 51], [6, 58, 36, 2, 59, 37], [8, 59, 37, 1, 60, 38], [4, 64, 40, 5, 65, 41], [5, 65, 41, 5, 66, 42]]
  };
  var ALIGN = [null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50],
    [6, 30, 54], [6, 32, 58], [6, 34, 62], [6, 26, 46, 66], [6, 26, 48, 70]];
  var EC_BITS = { L: 1, M: 0 };

  // Campo de Galois GF(256)
  var EXP = new Array(512), LOG = new Array(256);
  (function () { var x = 1; for (var i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 256) x ^= 0x11d; } for (i = 255; i < 512; i++) EXP[i] = EXP[i - 255]; })();
  function gmul(a, b) { return (a === 0 || b === 0) ? 0 : EXP[LOG[a] + LOG[b]]; }
  function genPoly(n) {
    var p = [1];
    for (var i = 0; i < n; i++) {
      var q = new Array(p.length + 1).fill(0);
      for (var j = 0; j < p.length; j++) { q[j] ^= p[j]; q[j + 1] ^= gmul(p[j], EXP[i]); }
      p = q;
    }
    return p;
  }
  function rsEncode(data, n) {
    var g = genPoly(n), res = data.concat(new Array(n).fill(0));
    for (var i = 0; i < data.length; i++) {
      var c = res[i]; if (c === 0) continue;
      for (var j = 0; j < g.length; j++) res[i + j] ^= gmul(g[j], c);
    }
    return res.slice(data.length);
  }

  function utf8(str) {
    var out = [];
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      if (c >= 0xd800 && c < 0xdc00 && i + 1 < str.length) { c = 0x10000 + ((c - 0xd800) << 10) + (str.charCodeAt(++i) - 0xdc00); }
      if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xc0 | c >> 6, 0x80 | c & 63);
      else if (c < 0x10000) out.push(0xe0 | c >> 12, 0x80 | c >> 6 & 63, 0x80 | c & 63);
      else out.push(0xf0 | c >> 18, 0x80 | c >> 12 & 63, 0x80 | c >> 6 & 63, 0x80 | c & 63);
    }
    return out;
  }

  function blocksOf(v, ec) {
    var t = RS[ec][v], out = [];
    for (var i = 0; i < t.length; i += 3) for (var k = 0; k < t[i]; k++) out.push({ total: t[i + 1], data: t[i + 2] });
    return out;
  }
  function dataCap(v, ec) { return blocksOf(v, ec).reduce(function (s, b) { return s + b.data; }, 0); }

  function encodeData(bytes, v, ec) {
    var bits = [], cap = dataCap(v, ec) * 8;
    function put(val, len) { for (var i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); }
    put(4, 4); put(bytes.length, v < 10 ? 8 : 16);
    bytes.forEach(function (b) { put(b, 8); });
    for (var t = 0; t < 4 && bits.length < cap; t++) bits.push(0);
    while (bits.length % 8) bits.push(0);
    var cw = [];
    for (var i = 0; i < bits.length; i += 8) { var b = 0; for (var j = 0; j < 8; j++) b = (b << 1) | bits[i + j]; cw.push(b); }
    for (var p = 0; cw.length < cap / 8; p++) cw.push(p % 2 ? 0x11 : 0xec);
    // bloques + corrección
    var bl = blocksOf(v, ec), pos = 0, dB = [], eB = [];
    bl.forEach(function (b) { var d = cw.slice(pos, pos + b.data); pos += b.data; dB.push(d); eB.push(rsEncode(d, b.total - b.data)); });
    var out = [], maxD = Math.max.apply(null, dB.map(function (d) { return d.length; })), maxE = eB[0].length;
    for (i = 0; i < maxD; i++) dB.forEach(function (d) { if (i < d.length) out.push(d[i]); });
    for (i = 0; i < maxE; i++) eB.forEach(function (e) { out.push(e[i]); });
    return out;
  }

  function bch(data, gen, genBits) {
    var d = data << (genBits - 1);
    for (var i = 31; i >= genBits - 1; i--) if ((d >>> i) & 1) d ^= gen << (i - genBits + 1);
    return d;
  }

  var MASKS = [
    function (r, c) { return (r + c) % 2 === 0; }, function (r) { return r % 2 === 0; }, function (r, c) { return c % 3 === 0; },
    function (r, c) { return (r + c) % 3 === 0; }, function (r, c) { return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0; },
    function (r, c) { return (r * c) % 2 + (r * c) % 3 === 0; }, function (r, c) { return ((r * c) % 2 + (r * c) % 3) % 2 === 0; },
    function (r, c) { return ((r + c) % 2 + (r * c) % 3) % 2 === 0; }
  ];

  function build(v, ec, codewords, maskNo) {
    var n = v * 4 + 17, m = [], fn = [];
    for (var r = 0; r < n; r++) { m.push(new Array(n).fill(false)); fn.push(new Array(n).fill(false)); }
    function set(r, c, d) { m[r][c] = d; fn[r][c] = true; }
    function finder(r0, c0) {
      for (var r = -1; r <= 7; r++) for (var c = -1; c <= 7; c++) {
        var rr = r0 + r, cc = c0 + c; if (rr < 0 || rr >= n || cc < 0 || cc >= n) continue;
        var d = (r >= 0 && r <= 6 && (c === 0 || c === 6)) || (c >= 0 && c <= 6 && (r === 0 || r === 6)) || (r >= 2 && r <= 4 && c >= 2 && c <= 4);
        set(rr, cc, d);
      }
    }
    finder(0, 0); finder(0, n - 7); finder(n - 7, 0);
    for (var i = 8; i < n - 8; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
    var al = ALIGN[v];
    var last = al.length - 1;
    al.forEach(function (ar, ai) {
      al.forEach(function (ac, aj) {
        if ((ai === 0 && aj === 0) || (ai === 0 && aj === last) || (ai === last && aj === 0)) return;
        for (var r = -2; r <= 2; r++) for (var c = -2; c <= 2; c++) set(ar + r, ac + c, Math.max(Math.abs(r), Math.abs(c)) !== 1);
      });
    });
    // reservar formato y versión
    for (i = 0; i < 9; i++) { if (!fn[8][i]) set(8, i, false); if (!fn[i][8]) set(i, 8, false); }
    for (i = 0; i < 8; i++) { set(8, n - 1 - i, false); set(n - 1 - i, 8, false); }
    set(n - 8, 8, true); // módulo oscuro
    if (v >= 7) {
      var vi = (v << 12) | bch(v, 0x1f25, 13);
      for (i = 0; i < 18; i++) { var b = ((vi >>> i) & 1) === 1, a = Math.floor(i / 3), cc2 = n - 11 + i % 3; set(a, cc2, b); set(cc2, a, b); }
    }
    // datos en zigzag
    var bitIdx = 0, total = codewords.length * 8;
    for (var col = n - 1; col >= 1; col -= 2) {
      if (col === 6) col = 5;
      var up = ((col + 1) & 2) === 0;
      for (var k = 0; k < n; k++) {
        var row = up ? n - 1 - k : k;
        for (var j = 0; j < 2; j++) {
          var cx = col - j;
          if (fn[row][cx]) continue;
          var bit = false;
          if (bitIdx < total) bit = ((codewords[bitIdx >>> 3] >>> (7 - (bitIdx & 7))) & 1) === 1;
          bitIdx++;
          if (MASKS[maskNo](row, cx)) bit = !bit;
          m[row][cx] = bit;
        }
      }
    }
    // información de formato
    var fmt = (EC_BITS[ec] << 3) | maskNo, f = ((fmt << 10) | bch(fmt, 0x537, 11)) ^ 0x5412;
    function fb(i) { return ((f >>> i) & 1) === 1; }
    for (i = 0; i <= 5; i++) m[i][8] = fb(i);
    m[7][8] = fb(6); m[8][8] = fb(7); m[8][7] = fb(8);
    for (i = 9; i < 15; i++) m[8][14 - i] = fb(i);
    for (i = 0; i < 8; i++) m[8][n - 1 - i] = fb(i);
    for (i = 8; i < 15; i++) m[n - 15 + i][8] = fb(i);
    m[n - 8][8] = true;
    return m;
  }

  function penalty(m) {
    var n = m.length, p = 0, r, c, k;
    for (r = 0; r < n; r++) { // filas y columnas con 5+ iguales
      var runR = 1, runC = 1;
      for (c = 1; c < n; c++) {
        if (m[r][c] === m[r][c - 1]) { runR++; if (runR === 5) p += 3; else if (runR > 5) p++; } else runR = 1;
        if (m[c][r] === m[c - 1][r]) { runC++; if (runC === 5) p += 3; else if (runC > 5) p++; } else runC = 1;
      }
    }
    for (r = 0; r < n - 1; r++) for (c = 0; c < n - 1; c++) { var d = m[r][c]; if (d === m[r][c + 1] && d === m[r + 1][c] && d === m[r + 1][c + 1]) p += 3; }
    var pat1 = [true, false, true, true, true, false, true, false, false, false, false], pat2 = pat1.slice().reverse();
    for (r = 0; r < n; r++) for (c = 0; c <= n - 11; c++) {
      var h1 = true, h2 = true, v1 = true, v2 = true;
      for (k = 0; k < 11; k++) {
        if (m[r][c + k] !== pat1[k]) h1 = false; if (m[r][c + k] !== pat2[k]) h2 = false;
        if (m[c + k][r] !== pat1[k]) v1 = false; if (m[c + k][r] !== pat2[k]) v2 = false;
      }
      p += 40 * ((h1 ? 1 : 0) + (h2 ? 1 : 0) + (v1 ? 1 : 0) + (v2 ? 1 : 0));
    }
    var dark = 0; for (r = 0; r < n; r++) for (c = 0; c < n; c++) if (m[r][c]) dark++;
    p += Math.floor(Math.abs(dark * 20 - n * n * 10) / (n * n)) * 10;
    return p;
  }

  function make(text, ec, forceMask) {
    ec = ec === "L" ? "L" : "M";
    var bytes = utf8(String(text)), v;
    for (v = 1; v <= 15; v++) { var need = 4 + (v < 10 ? 8 : 16) + bytes.length * 8; if (need <= dataCap(v, ec) * 8) break; }
    if (v > 15) { if (ec === "M") return make(text, "L"); throw new Error("Texto demasiado largo para el QR"); }
    var cw = encodeData(bytes, v, ec), best = null, bestP = Infinity;
    for (var k = 0; k < 8; k++) {
      if (forceMask != null && k !== forceMask) continue;
      var mm = build(v, ec, cw, k), pp = penalty(mm); if (pp < bestP) { bestP = pp; best = mm; }
    }
    return { version: v, size: best.length, matrix: best, dark: function (r, c) { return best[r][c]; } };
  }

  function svg(text, o) {
    o = o || {};
    var q = make(text, o.ec), mg = o.margin == null ? 2 : o.margin, n = q.size + mg * 2, d = "";
    for (var r = 0; r < q.size; r++) for (var c = 0; c < q.size; c++) if (q.matrix[r][c]) d += "M" + (c + mg) + " " + (r + mg) + "h1v1h-1z";
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + n + " " + n + '" shape-rendering="crispEdges"' + (o.cls ? ' class="' + o.cls + '"' : "") + ">" +
      '<rect width="' + n + '" height="' + n + '" fill="' + (o.bg || "#fff") + '"/><path d="' + d + '" fill="' + (o.fg || "#111") + '"/></svg>';
  }

  root.CBSQR = { make: make, svg: svg };
  if (typeof module !== "undefined") module.exports = root.CBSQR;
})(typeof window !== "undefined" ? window : globalThis);
