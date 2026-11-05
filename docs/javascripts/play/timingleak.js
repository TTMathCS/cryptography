/* history/09: a timing side channel. A careless PIN check compares digit by digit and stops at the first wrong one, so
   a guess with more right digits takes a little longer. The times here are simulated, with made-up noise, and the PIN is
   random. Time all ten digits, keep the slowest, move on. */
PLAY("timingleak", function (fig, k) {
  var C = k.C, F = k.F, W = 600, H = 250, st = k.stage(W, H), g = st.g, out = k.out(), pin, known, times, tries;
  function reset() { pin = ""; for (var i = 0; i < 4; i++) pin += Math.floor(Math.random() * 10); known = ""; times = null; tries = 0; draw(); }
  function check(guess) { var t = 1; for (var i = 0; i < 4; i++) { if (guess[i] !== pin[i]) break; t += 1; } return t + Math.random() * 0.35; }
  function measure() { if (known.length >= 4) return; times = []; for (var d = 0; d < 10; d++) { var gs = (known + d + "0000").slice(0, 4); times.push(check(gs)); tries++; } draw(); }
  function keep() { if (!times) return; var b = 0; times.forEach(function (t, i) { if (t > times[b]) b = i; }); known += b; times = null; draw(); }
  function draw() {
    g.fillStyle = C.bg; g.fillRect(0, 0, W, H); g.textAlign = "left";
    g.fillStyle = C.ink; g.font = F(26, 800, "m"); g.fillText("PIN: " + (known + "????").slice(0, 4), 20, 40);
    g.fillStyle = C.ink3; g.font = F(16, 600); g.fillText("guesses so far: " + tries + " (trying all would take up to 10,000)", 20, 70);
    if (times) { var mx = Math.max.apply(0, times); g.textAlign = "center"; times.forEach(function (t, d) { var x = 34 + d * 44, h = 110 * t / 5; g.fillStyle = t === mx ? C.gold : C.ice; g.fillRect(x - 16, 210 - h, 32, h); g.fillStyle = C.ink; g.font = F(18, 800); g.fillText(d, x, 232); }); }
    out.textContent = known.length >= 4 ? (known === pin ? "Found " + pin + " in " + tries + " guesses. The fix: compare every digit, always, in the same time." : "Noise fooled us: start again.") : times ? "One digit stands out as slower: that one matched. Keep it." : "Time the ten digits for position " + (known.length + 1) + ".";
  }
  k.buttons([["Time 10 digits", measure], ["Keep slowest", keep], ["New PIN", reset]]);
  st.draw = draw; reset();
});
