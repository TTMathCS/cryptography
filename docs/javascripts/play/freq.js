/* start/03-Cracking-Caesar.md: frequency analysis. The bars are how often each letter appears in the secret message;
   the line is how often it appears in ordinary English (Lewand, Cryptological Mathematics, 2000). Slide the key until
   the bars match the line, and the message reads. */
PLAY("freq", function (fig, k) {
  var C = k.C, F = k.F, W = 600, H = 330, st = k.stage(W, H), g = st.g, out = k.out(), key = 0, text = "";
  var AB = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  var EN = [8.17, 1.49, 2.78, 4.25, 12.70, 2.23, 2.02, 6.09, 6.97, 0.15, 0.77, 4.03, 2.41, 6.75, 7.51, 1.93, 0.10, 5.99, 6.33, 9.06, 2.76, 0.98, 2.36, 0.15, 1.97, 0.07];
  var SECRET = "ZVTLAPTLZ AOL ILZA DHF AV RLLW H ZLJYLA PZ AV ALSS UV VUL. IBA PM FVB TBZA ZOHYL PA, ZOPMA LCLYF SLAALY HUK OVWL UV VUL JVBUAZ AOLT";
  function dec(s, n) { return s.toUpperCase().replace(/[A-Z]/g, function (c) { return AB[(AB.indexOf(c) - n + 26) % 26]; }); }
  function draw() {
    var cnt = new Array(26).fill(0), n = 0;
    dec(text, key).replace(/[A-Z]/g, function (c) { cnt[AB.indexOf(c)]++; n++; });
    g.fillStyle = C.bg; g.fillRect(0, 0, W, H);
    var bw = (W - 40) / 26, base = 260, sc = 9;
    for (var i = 0; i < 26; i++) {
      var p = n ? cnt[i] / n * 100 : 0; g.fillStyle = C.rust; g.fillRect(20 + i * bw + 3, base - p * sc, bw - 6, p * sc);
      g.font = F(14, 600, "m"); g.fillStyle = C.ink2; g.textAlign = "center"; g.fillText(AB[i], 20 + i * bw + bw / 2, base + 20);
    }
    g.strokeStyle = C.ice; g.lineWidth = 2.5; g.beginPath();
    for (i = 0; i < 26; i++) g[i ? "lineTo" : "moveTo"](20 + i * bw + bw / 2, base - EN[i] * sc); g.stroke();
    g.textAlign = "left"; g.font = F(15, 600); g.fillStyle = C.ice; g.fillText("ordinary English", 24, 30); g.fillStyle = C.rust; g.fillText("this message, shifted back " + key, 24, 52);
    var score = 0; for (i = 0; i < 26; i++) score += (n ? cnt[i] / n * 100 : 0) * EN[i];
    out.textContent = dec(text, key) + (score > 600 ? "   ← it reads!" : "");
  }
  st.draw = draw;
  k.text("Secret", SECRET, function (v) { text = v; draw(); });
  k.slider("Shift back", 0, 25, 1, 0, function (v) { return v; }, function (v) { key = v; draw(); });
});
