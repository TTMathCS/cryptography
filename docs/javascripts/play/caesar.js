/* start/02-Caesar.md: a code wheel. Turn the inner ring with the key and type a message: each letter moves that many
   places along the alphabet, Z wrapping round to A. */
PLAY("caesar", function (fig, k) {
  var C = k.C, F = k.F, W = 600, H = 420, st = k.stage(W, H), g = st.g, out = k.out(), key = 3, msg = "HELLO MARS", turn = 0;
  var AB = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  function enc(s, n) { return s.toUpperCase().replace(/[A-Z]/g, function (c) { return AB[(AB.indexOf(c) + n + 26) % 26]; }); }
  function draw() {
    var cx = 210, cy = 215;
    g.fillStyle = C.bg; g.fillRect(0, 0, W, H);
    g.fillStyle = "#2a1a13"; g.beginPath(); g.arc(cx, cy, 190, 0, 7); g.fill(); g.fillStyle = "#3a2117"; g.beginPath(); g.arc(cx, cy, 140, 0, 7); g.fill();
    g.textAlign = "center"; g.textBaseline = "middle";
    for (var i = 0; i < 26; i++) {
      var a = (i / 26) * 2 * Math.PI - Math.PI / 2, b = ((i - turn) / 26) * 2 * Math.PI - Math.PI / 2, used = msg.toUpperCase().indexOf(AB[i]) >= 0, usedIn = enc(msg, key).indexOf(AB[i]) >= 0;
      g.font = F(22, 600, "m"); g.fillStyle = used ? C.gold : C.ink; g.fillText(AB[i], cx + Math.cos(a) * 165, cy + Math.sin(a) * 165);
      g.font = F(20, 600, "m"); g.fillStyle = usedIn ? C.gold : C.rust; g.fillText(AB[i], cx + Math.cos(b) * 115, cy + Math.sin(b) * 115);
    }
    g.textBaseline = "alphabetic"; g.fillStyle = C.ink3; g.font = F(15, 500); g.fillText("plain (outside)", cx, cy - 8); g.fillText("secret (inside)", cx, cy + 14);
    g.textAlign = "left"; g.font = F(16, 500); g.fillStyle = C.ink2; g.fillText("key", 430, 60); g.font = F(64, 600, "d"); g.fillStyle = C.ink; g.fillText(String(key), 430, 124);
  }
  // the inner ring holds the secret letter for each plain letter: the plain letter i sits over secret letter i + key
  function anim() { if (Math.abs(turn - key) < 0.02) { turn = key; draw(); return; } turn += (key - turn) * 0.2; draw(); requestAnimationFrame(anim); }
  st.draw = draw; turn = key; draw();
  k.slider("Key", 1, 25, 1, key, function (v) { return v; }, function (v) { key = v; anim(); say(); });
  k.text("Message", msg, function (v) { msg = v.slice(0, 60); draw(); say(); });
  function say() { out.innerHTML = ""; out.textContent = "Secret: " + enc(msg, key) + "   (to read it, shift back " + key + ")"; }
});
