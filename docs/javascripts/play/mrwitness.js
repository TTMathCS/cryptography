/* 10-math-foundations/Miller-Rabin: each square is a base a. Gold: a says "probably prime"; red: a proves n composite.
   Unlike the plain Fermat test, Miller-Rabin is not fooled by Carmichael numbers such as 561: at most a quarter of the
   bases lie for any odd composite n. */
PLAY("mrwitness", function (fig, k) {
  var C = k.C, F = k.F, W = 600, H = 250, st = k.stage(W, H), g = st.g, out = k.out(), n = 561, box;
  function pw(b, e, m) { var r = 1n; b = BigInt(b) % BigInt(m); e = BigInt(e); m = BigInt(m); while (e > 0n) { if (e & 1n) r = r * b % m; b = b * b % m; e >>= 1n; } return r; }
  function mr(a, n) { var d = n - 1, s = 0; while (d % 2 === 0) { d /= 2; s++; } var x = pw(a, d, n), N = BigInt(n); if (x === 1n || x === N - 1n) return true; for (var i = 1; i < s; i++) { x = x * x % N; if (x === N - 1n) return true; } return false; }
  function draw() {
    g.fillStyle = C.bg; g.fillRect(0, 0, W, H); var B = Math.min(n - 3, 400), cols = 40, sz = 13.5, liar = 0, fl = 0;
    for (var a = 2; a < 2 + B; a++) { var i = a - 2, ok = mr(a, n); if (ok) liar++; if (pw(a, n - 1, n) === 1n) fl++; g.fillStyle = ok ? C.gold : C.red; g.fillRect(20 + (i % cols) * sz, 20 + Math.floor(i / cols) * sz, sz - 2, sz - 2); }
    var prime = true; for (var d = 2; d * d <= n; d++) if (n % d === 0) { prime = false; break; }
    out.textContent = prime ? n + " is prime: every base says probably prime." : n + " is composite. Miller-Rabin: " + liar + " of " + B + " bases lie (" + (100 * liar / B).toFixed(1) + "%). The plain Fermat test: " + fl + " lie.";
  }
  box = k.text("Odd number n", n, function (v) { var m = parseInt(v, 10); if (m >= 5 && m % 2 && m < 1e7) { n = m; draw(); } });
  function pick(m) { return function () { n = m; box.value = m; draw(); }; }
  k.buttons([["561", pick(561)], ["1105", pick(1105)], ["91", pick(91)], ["997", pick(997)]]);
  st.draw = draw; draw();
});
