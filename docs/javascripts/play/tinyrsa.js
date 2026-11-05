/* book/13: RSA with this chapter's numbers, p = 61, q = 53, n = 3233, e = 17, d = 2753. Pick a message number m below
   n: c = m^e mod n locks it, c^d mod n opens it again. */
PLAY("tinyrsa", function (fig, k) {
  var C = k.C, F = k.F, W = 600, H = 220, st = k.stage(W, H), g = st.g, out = k.out(), m = 65, n = 3233, e = 17, d = 2753;
  function pw(b, x, M) { var r = 1n, B = BigInt(b) % BigInt(M), X = BigInt(x), MM = BigInt(M); while (X > 0n) { if (X & 1n) r = r * B % MM; B = B * B % MM; X >>= 1n; } return Number(r); }
  function box(x, y, w, lab, v, col) { g.fillStyle = col; g.globalAlpha = 0.18; g.fillRect(x, y, w, 70); g.globalAlpha = 1; g.strokeStyle = col; g.lineWidth = 2; g.strokeRect(x, y, w, 70); g.fillStyle = C.ink2; g.font = F(15, 700); g.textAlign = "center"; g.fillText(lab, x + w / 2, y + 22); g.fillStyle = C.ink; g.font = F(28, 800); g.fillText(v, x + w / 2, y + 56); }
  function arrow(x1, x2, y, lab) { g.strokeStyle = C.ink3; g.lineWidth = 2; g.beginPath(); g.moveTo(x1, y); g.lineTo(x2, y); g.stroke(); g.fillStyle = C.ink3; g.beginPath(); g.moveTo(x2, y); g.lineTo(x2 - 9, y - 6); g.lineTo(x2 - 9, y + 6); g.fill(); g.font = F(15, 700); g.textAlign = "center"; g.fillText(lab, (x1 + x2) / 2, y - 10); }
  function draw() {
    var c = pw(m, e, n), back = pw(c, d, n); g.fillStyle = C.bg; g.fillRect(0, 0, W, H);
    box(20, 50, 130, "message m", m, C.ice); arrow(155, 225, 85, "^17"); box(230, 50, 130, "locked c", c, C.rust); arrow(365, 435, 85, "^2753"); box(440, 50, 130, "opened", back, C.green);
    g.fillStyle = C.ink3; g.font = F(16, 600); g.textAlign = "left"; g.fillText("everything mod n = 61 × 53 = 3233", 20, 160);
    out.textContent = m + "^17 mod 3233 = " + c + ", and " + c + "^2753 mod 3233 = " + back + ". Only someone who knows d = 2753 can open it.";
  }
  k.slider("Message m", 0, 3232, 1, m, function (v) { return v; }, function (v) { m = +v; draw(); });
  st.draw = draw; draw();
});
