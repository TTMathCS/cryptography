/* history/04: Wheatstone's Playfair cipher (1854). The keyword fills a 5 × 5 square (I and J share a cell); letters go in
   pairs. Same row: take the letters to the right. Same column: the letters below. Otherwise: the other corners of
   their rectangle. Tap a pair to see it. */
PLAY("playfair", function (fig, k) {
  var C = k.C, F = k.F, W = 600, H = 300, out, msg = "MEET AT THE BRIDGE", key = "PLAYFAIR EXAMPLE", sel = 0, sq, pairs;
  var st = k.stage(W, H, function (x, y) { if (y > 230) { var i = Math.floor((x - 20) / 58); if (i >= 0 && i < Math.min(pairs.length, 7)) { sel = i; draw(); } } }), g = st.g; out = k.out();
  function build() { var s = ""; (key.toUpperCase() + "ABCDEFGHIKLMNOPQRSTUVWXYZ").replace(/J/g, "I").replace(/[^A-Z]/g, "").split("").forEach(function (c) { if (s.indexOf(c) < 0) s += c; }); sq = s;
    var m = msg.toUpperCase().replace(/J/g, "I").replace(/[^A-Z]/g, ""), p = []; for (var i = 0; i < m.length;) { var a = m[i], b = m[i + 1]; if (!b || a === b) { p.push(a + "X"); i++; } else { p.push(a + b); i += 2; } } pairs = p; if (sel >= p.length) sel = 0; }
  function enc(pr) { var a = sq.indexOf(pr[0]), b = sq.indexOf(pr[1]), ra = a / 5 | 0, ca = a % 5, rb = b / 5 | 0, cb = b % 5;
    if (ra === rb) return [sq[ra * 5 + (ca + 1) % 5] + sq[rb * 5 + (cb + 1) % 5], "same row: one to the right"]; if (ca === cb) return [sq[((ra + 1) % 5) * 5 + ca] + sq[((rb + 1) % 5) * 5 + cb], "same column: one below"]; return [sq[ra * 5 + cb] + sq[rb * 5 + ca], "rectangle: swap the corners"]; }
  function draw() {
    build(); var pr = pairs[sel] || "XX", e = enc(pr), s = 40; g.fillStyle = C.bg; g.fillRect(0, 0, W, H); g.textAlign = "center";
    for (var i = 0; i < 25; i++) { var r = i / 5 | 0, c = i % 5, x = 20 + c * s, y = 14 + r * s, L = sq[i]; g.fillStyle = pr.indexOf(L) >= 0 ? C.gold : e[0].indexOf(L) >= 0 ? C.green : C.line; g.fillRect(x, y, s - 4, s - 4); g.fillStyle = pr.indexOf(L) >= 0 || e[0].indexOf(L) >= 0 ? C.bg : C.ink; g.font = F(20, 800); g.fillText(L, x + 18, y + 26); }
    g.textAlign = "left"; g.fillStyle = C.gold; g.font = F(28, 800, "m"); g.fillText(pr, 260, 80); g.fillStyle = C.ink3; g.fillText("→", 320, 80); g.fillStyle = C.green; g.fillText(e[0], 360, 80);
    g.fillStyle = C.ink2; g.font = F(16, 600); g.fillText(e[1], 260, 116);
    for (i = 0; i < Math.min(pairs.length, 7); i++) { g.fillStyle = i === sel ? C.gold : C.ink3; g.font = F(18, 800, "m"); g.fillText(pairs[i], 24 + i * 58, 262); }
    out.textContent = "Cipher: " + pairs.map(function (p) { return enc(p)[0]; }).join(" ") + ". Tap a pair at the bottom.";
  }
  k.text("Keyword", key, function (v) { key = v; draw(); });
  k.text("Message", msg, function (v) { msg = v; draw(); });
  st.draw = draw; draw();
});
