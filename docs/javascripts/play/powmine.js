/* protocols/Bitcoin: proof of work in miniature. Try nonce after nonce until the SHA-256 of the block text starts with
   enough zeros. Each extra hex zero means about 16 times more tries. The block text is made up; Bitcoin itself hashes
   an 80-byte header twice and needs far more zeros. */
PLAY("powmine", function (fig, k) {
  var C = k.C, F = k.F, W = 600, H = 220, st = k.stage(W, H), g = st.g, out = k.out(), z = 3, run = 0, tries = 0, best = "", found = null, enc = new TextEncoder();
  function hex(b) { return Array.from(new Uint8Array(b), function (x) { return x.toString(16).padStart(2, "0"); }).join(""); }
  function draw() {
    g.fillStyle = C.bg; g.fillRect(0, 0, W, H); g.textAlign = "left";
    g.fillStyle = C.ink2; g.font = F(17, 600); g.fillText("block: \"Pay Ana 2 coins\" + nonce", 20, 34);
    g.fillStyle = C.ink; g.font = F(22, 800); g.fillText("tries: " + tries.toLocaleString("en"), 20, 76);
    g.fillStyle = C.ink3; g.font = F(16, 600); g.fillText("expected about " + Math.pow(16, z).toLocaleString("en") + " for " + z + " zeros", 20, 104);
    var h = found ? found[1] : best; g.font = F(17, 700, "m");
    for (var i = 0; i < 32 && h; i++) { g.fillStyle = i < z ? (h[i] === "0" ? C.green : C.red) : C.ink3; g.fillText(h[i], 20 + i * 17, 150); }
    g.fillStyle = C.ink3; g.font = F(15, 600); g.fillText("first half of the SHA-256 hash", 20, 178);
  }
  function mine() {
    var my = ++run; tries = 0; found = null; out.textContent = "Mining…";
    (function batch() {
      if (my !== run) return; var P = [];
      for (var j = 0; j < 200; j++) { var n = tries + j; P.push(crypto.subtle.digest("SHA-256", enc.encode("Pay Ana 2 coins" + n)).then((function (n) { return function (b) { return [n, hex(b)]; }; })(n))); }
      Promise.all(P).then(function (R) { if (my !== run) return; tries += R.length; best = R[R.length - 1][1];
        for (var r = 0; r < R.length; r++) if (/^0+/.test(R[r][1]) && R[r][1].match(/^0*/)[0].length >= z) { found = R[r]; tries = R[r][0] + 1; break; }
        draw(); if (found) out.textContent = "Nonce " + found[0].toLocaleString("en") + " works after " + tries.toLocaleString("en") + " tries. Anyone can check it with one hash."; else setTimeout(batch, 0); });
    })();
  }
  k.slider("Zeros needed", 1, 5, 1, z, function (v) { return v; }, function (v) { z = +v; run++; tries = 0; found = null; best = ""; draw(); out.textContent = "Press Mine."; });
  k.buttons([["Mine", mine]]);
  out.textContent = "Press Mine."; st.draw = draw; draw();
});
