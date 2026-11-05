/* history/06: brute force at Deep Crack's speed, about 90 billion keys a second (EFF, 1998). On average the key turns
   up after trying half of all keys. Move the key length. */
PLAY("desbrute", function (fig, k) {
  var C = k.C, F = k.F, W = 600, H = 200, st = k.stage(W, H), g = st.g, out = k.out(), bits = 56, rate = 9e10;
  function time(s) { if (s < 120) return s.toFixed(1) + " seconds"; if (s < 7200) return (s / 60).toFixed(0) + " minutes"; if (s < 172800 * 2) return (s / 3600).toFixed(0) + " hours"; if (s < 3.156e7 * 2) return (s / 86400).toFixed(0) + " days"; var y = s / 3.156e7; return y < 1e9 ? Math.round(y).toLocaleString("en") + " years" : "about 10^" + Math.floor(Math.log10(y)) + " years"; }
  function draw() {
    var avg = Math.pow(2, bits - 1) / rate; g.fillStyle = C.bg; g.fillRect(0, 0, W, H); g.textAlign = "left";
    g.fillStyle = C.ink2; g.font = F(17, 600); g.fillText(bits + "-bit key: 2^" + bits + " keys", 20, 34);
    g.fillStyle = bits <= 64 ? C.red : C.green; g.font = F(34, 800); g.fillText(time(avg), 20, 86);
    g.fillStyle = C.ink3; g.font = F(16, 600); g.fillText("on average, at 90 billion keys a second", 20, 116);
    g.fillStyle = C.gold; g.fillRect(20, 140, Math.max(4, 560 * Math.min(1, Math.log10(avg + 1) / 30)), 18);
    out.textContent = bits === 56 ? "DES's 56 bits: about " + time(avg) + " on average. Deep Crack found its 1998 key in 56 hours." : bits + " bits: " + time(avg) + " on average. Every extra bit doubles it.";
  }
  k.slider("Key length (bits)", 40, 128, 1, bits, function (v) { return v; }, function (v) { bits = +v; draw(); });
  st.draw = draw; draw();
});
