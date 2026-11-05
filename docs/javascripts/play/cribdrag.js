/* book/04: the two-time pad, with this chapter's messages. Both were sent with the same key, so c1 ⊕ c2 = m1 ⊕ m2 and the
   key is gone. Slide a guessed word along it: where the guess is right, the other message shows through. */
PLAY("cribdrag", function (fig, k) {
  var C = k.C, F = k.F, W = 600, H = 220, st = k.stage(W, H), g = st.g, out = k.out(), m1 = "ATTACK AT DAWN", m2 = "RETREAT AT TEN", crib = "ATTACK", pos = 3;
  var x = []; for (var i = 0; i < m1.length; i++) x.push(m1.charCodeAt(i) ^ m2.charCodeAt(i));
  function draw() {
    var cw = 38, x0 = 30; g.fillStyle = C.bg; g.fillRect(0, 0, W, H); g.textAlign = "center";
    g.fillStyle = C.ink2; g.font = F(15, 700); g.textAlign = "left"; g.fillText("c1 ⊕ c2 (bytes, hex)", x0, 24); g.fillText("your guess", x0, 92); g.fillText("what shows through", x0, 160); g.textAlign = "center";
    var shown = "", readable = true;
    for (i = 0; i < x.length; i++) { g.fillStyle = C.ink3; g.font = F(15, 700, "m"); g.fillText(x[i].toString(16).padStart(2, "0"), x0 + i * cw + 15, 50); }
    for (i = 0; i < crib.length && pos + i < x.length; i++) { var j = pos + i, ch = String.fromCharCode(x[j] ^ crib.charCodeAt(i)); shown += ch; if (!/[A-Z ]/.test(ch)) readable = false;
      g.fillStyle = C.gold; g.font = F(20, 800, "m"); g.fillText(crib[i], x0 + j * cw + 15, 118); g.fillStyle = /[A-Z ]/.test(ch) ? C.green : C.red; g.fillText(/[ -~]/.test(ch) ? ch : "·", x0 + j * cw + 15, 188); }
    out.textContent = (readable ? "Readable: \"" + shown + "\". " : "Gibberish here: the guess is in the wrong place. ") + "Guess \"" + crib + "\" at position " + pos + ".";
  }
  k.slider("Position", 0, 8, 1, pos, function (v) { return v; }, function (v) { pos = +v; draw(); });
  k.buttons([["ATTACK", function () { crib = "ATTACK"; draw(); }], ["AT ", function () { crib = " AT "; draw(); }], ["DAWN", function () { crib = "DAWN"; draw(); }]], true);
  st.draw = draw; draw();
});
