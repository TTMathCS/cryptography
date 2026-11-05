/* history/05: one rotor and a reflector, a simplified Enigma (the real machine had three or four rotors and a plugboard).
   The wiring is the historical rotor I and reflector B. The rotor steps before every letter, so pressing the same key
   gives a new letter each time, and because of the reflector a letter never becomes itself. */
PLAY("rotor", function (fig, k) {
  var C = k.C, F = k.F, W = 600, H = 220, st = k.stage(W, H), g = st.g, out = k.out(), R = "EKMFLGDQVZNTOWYHXUSPAIBRCJ", RF = "YRUHQSLDPXNGOKMIEBFZCWVJAT", pos = 0, log = [];
  function A(c) { return c.charCodeAt(0) - 65; } function L(n) { return String.fromCharCode((n % 26 + 26) % 26 + 65); }
  function press(ch) { pos = (pos + 1) % 26; var x = A(ch); x = (A(R[(x + pos) % 26]) - pos + 26) % 26; x = A(RF[x]); x = (R.indexOf(L(x + pos)) - pos + 26) % 26; log.push([ch, L(x)]); if (log.length > 12) log.shift(); draw(); }
  function draw() {
    g.fillStyle = C.bg; g.fillRect(0, 0, W, H); g.textAlign = "left";
    g.fillStyle = C.ink2; g.font = F(17, 700); g.fillText("rotor position: " + L(pos), 20, 34);
    g.textAlign = "center"; for (var i = 0; i < log.length; i++) { var x = 40 + i * 44; g.fillStyle = C.ink; g.font = F(22, 800, "m"); g.fillText(log[i][0], x, 90); g.fillStyle = C.ink3; g.font = F(16, 700); g.fillText("↓", x, 118); g.fillStyle = C.gold; g.font = F(22, 800, "m"); g.fillText(log[i][1], x, 148); }
    out.textContent = log.length ? "The last " + log.length + " key presses. No letter ever came out as itself." : "Press a key, and press it again.";
  }
  k.buttons(["A", "E", "T"].map(function (c) { return ["Press " + c, function () { press(c); }]; }).concat([["Reset", function () { pos = 0; log = []; draw(); }]]));
  st.draw = draw; draw();
});
