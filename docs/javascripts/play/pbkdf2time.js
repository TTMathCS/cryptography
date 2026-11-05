/* book/11: key stretching. Your own browser runs PBKDF2-HMAC-SHA-256 with the number of rounds you pick and times it.
   Every guess an attacker makes costs the same work; this page's figure uses 600,000 rounds. */
PLAY("pbkdf2time", function (fig, k) {
  var C = k.C, F = k.F, W = 600, H = 200, st = k.stage(W, H), g = st.g, out = k.out(), it = 600000, ms = null, busy = false, enc = new TextEncoder();
  function draw() {
    g.fillStyle = C.bg; g.fillRect(0, 0, W, H); g.textAlign = "left";
    g.fillStyle = C.ink2; g.font = F(17, 600); g.fillText("rounds: " + it.toLocaleString("en"), 20, 34);
    g.fillStyle = C.ink; g.font = F(36, 800); g.fillText(busy ? "working…" : ms === null ? "press Time it" : ms.toFixed(0) + " ms per guess", 20, 90);
    if (ms !== null && !busy) { var gps = 1000 / ms; g.fillStyle = C.gold; g.font = F(18, 700); g.fillText("≈ " + (gps < 10 ? gps.toFixed(1) : Math.round(gps).toLocaleString("en")) + " guesses a second on this device", 20, 134);
      g.fillStyle = C.ink3; g.font = F(16, 600); g.fillText("one SHA-256 alone: millions a second", 20, 166); }
  }
  function run() { if (busy) return; busy = true; draw(); var t0 = performance.now();
    crypto.subtle.importKey("raw", enc.encode("correct horse"), "PBKDF2", false, ["deriveBits"]).then(function (key) {
      return crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: enc.encode("salt1234salt1234"), iterations: it }, key, 256); }).then(function () {
      ms = performance.now() - t0; busy = false; draw(); out.textContent = it.toLocaleString("en") + " rounds took " + ms.toFixed(0) + " ms here. The attacker pays that for every single guess, which adds log₂ " + it.toLocaleString("en") + " ≈ " + Math.log2(it).toFixed(1) + " bits of work."; }); }
  k.slider("Rounds", 3, 6.3, 0.01, Math.log10(it), function (v) { return Number(Math.pow(10, v).toPrecision(2)).toLocaleString("en"); }, function (v) { it = Number(Math.pow(10, +v).toPrecision(2)); ms = null; draw(); });
  k.buttons([["Time it", run], ["600,000", function () { it = 600000; ms = null; run(); }]]);
  out.textContent = "Press Time it: your browser does the work."; st.draw = draw; draw();
});
