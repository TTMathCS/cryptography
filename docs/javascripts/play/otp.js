/* start/04-One-Time-Pad.md: the one-time pad with dice. Each letter is shifted by its own roll of a die (1 to 6).
   "Roll again" makes a new key: the same message comes out different every time, and the same secret letter can
   stand for different message letters, so counting letters tells nothing. (A die gives only six shifts, so it still
   leaks a little; a real pad uses shifts from 0 to 25, as the page's question explains.) */
PLAY("otp", function (fig, k) {
  var C = k.C, F = k.F, W = 600, H = 250, st = k.stage(W, H), g = st.g, out = k.out(), msg = "HIDE", keyv = [3, 1, 6, 2];
  var AB = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  function letters() { return msg.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 12); }
  function roll() { var m = letters(); keyv = []; for (var i = 0; i < m.length; i++) keyv.push(1 + Math.floor(Math.random() * 6)); }
  function draw() {
    var m = letters(), n = m.length || 1, cw = Math.min(46, (W - 120) / n);
    while (keyv.length < m.length) keyv.push(1 + Math.floor(Math.random() * 6));
    g.fillStyle = C.bg; g.fillRect(0, 0, W, H); g.textAlign = "center";
    [["message", 60, C.ink], ["die", 120, C.gold], ["secret", 180, C.rust]].forEach(function (r) { g.textAlign = "left"; g.font = F(15, 500); g.fillStyle = C.ink3; g.fillText(r[0], 14, r[1]); });
    g.textAlign = "center";
    for (var i = 0; i < m.length; i++) {
      var x = 120 + i * cw + cw / 2, s = AB[(AB.indexOf(m[i]) + keyv[i]) % 26];
      g.font = F(26, 600, "m"); g.fillStyle = C.ink; g.fillText(m[i], x, 62); g.fillStyle = C.gold; g.font = F(22, 600, "m"); g.fillText(keyv[i], x, 122);
      g.font = F(26, 600, "m"); g.fillStyle = C.rust; g.fillText(s, x, 182);
    }
    g.textAlign = "left";
    var sec = m.split("").map(function (c, i) { return AB[(AB.indexOf(c) + keyv[i]) % 26]; }).join("");
    out.textContent = "Secret: " + sec + ". Only someone with the same die rolls can shift it back.";
  }
  st.draw = draw;
  k.text("Message", msg, function (v) { msg = v; keyv = keyv.slice(0, letters().length); draw(); });
  k.buttons([["Roll again", function () { roll(); draw(); }]]);
});
