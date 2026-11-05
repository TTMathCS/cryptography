/* formats/Encoding: one text, several encodings. Type and see its UTF-8 bytes as hex, as Base64 and as percent-encoding.
   None of these hides anything: anyone can turn them back. */
PLAY("encode", function (fig, k) {
  var C = k.C, F = k.F, W = 600, H = 250, st = k.stage(W, H), g = st.g, out = k.out(), s = "Mars ♥";
  function wrap(t, x, y, n, lh) { for (var i = 0; i < 3 && i * n < t.length; i++) g.fillText(t.slice(i * n, (i + 1) * n) + (i === 2 && t.length > 3 * n ? "…" : ""), x, y + i * lh); }
  function draw() {
    var b = new TextEncoder().encode(s), hx = Array.from(b, function (x) { return x.toString(16).padStart(2, "0"); }).join(" "), bin = ""; b.forEach(function (x) { bin += String.fromCharCode(x); });
    var b64 = btoa(bin), pc = encodeURIComponent(s);
    g.fillStyle = C.bg; g.fillRect(0, 0, W, H); g.textAlign = "left";
    [["hex", hx, C.gold, 40], ["Base64", b64, C.ice, 40], ["URL", pc, C.green, 40]].forEach(function (r, i) { var y = 34 + i * 74; g.fillStyle = C.ink2; g.font = F(16, 700); g.fillText(r[0], 20, y); g.fillStyle = r[2]; g.font = F(18, 600, "m"); wrap(r[1], 110, y, 25, 22); });
    out.textContent = s.length + " characters → " + b.length + " bytes in UTF-8 → " + b64.length + " Base64 characters (4 for every 3 bytes).";
  }
  k.text("Your text", s, function (v) { s = v.slice(0, 60); draw(); });
  st.draw = draw; draw();
});
