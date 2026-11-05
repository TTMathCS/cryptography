/* history/03: Bellaso's keyword cipher (later called Vigenère). Each letter is shifted by the matching letter of the
   keyword, repeated along the message, so one plain letter can come out as several different ones. */
PLAY("vigenere", function (fig, k) {
  var C = k.C, F = k.F, W = 600, H = 220, st = k.stage(W, H), g = st.g, out = k.out(), msg = "ATTACKATDAWN", key = "LEMON";
  function clean(s) { return s.toUpperCase().replace(/[^A-Z]/g, ""); }
  function draw() {
    var m = clean(msg).slice(0, 18), kk = clean(key) || "A", c = "", cw = 31; g.fillStyle = C.bg; g.fillRect(0, 0, W, H);
    g.fillStyle = C.ink2; g.font = F(15, 700); g.textAlign = "left"; g.fillText("message", 20, 30); g.fillText("keyword", 20, 90); g.fillText("cipher", 20, 150); g.textAlign = "center";
    for (var i = 0; i < m.length; i++) { var s = kk.charCodeAt(i % kk.length) - 65, ch = String.fromCharCode((m.charCodeAt(i) - 65 + s) % 26 + 65); c += ch; var x = 30 + i * cw;
      g.font = F(20, 800, "m"); g.fillStyle = C.ink; g.fillText(m[i], x, 58); g.fillStyle = C.gold; g.fillText(kk[i % kk.length], x, 118); g.fillStyle = C.rust; g.fillText(ch, x, 178); }
    var tA = {}; for (i = 0; i < m.length; i++) if (m[i] === "A") tA[c[i]] = 1;
    out.textContent = "Cipher: " + c + ". " + (Object.keys(tA).length > 1 ? "The letter A became " + Object.keys(tA).join(", ") + ": no single letter count gives it away." : "");
  }
  k.text("Message", msg, function (v) { msg = v; draw(); });
  k.text("Keyword", key, function (v) { key = v; draw(); });
  st.draw = draw; draw();
});
