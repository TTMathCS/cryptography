/* start/06-Passwords.md: how long guessing takes. Words picked with dice from a list of 7,776; on average a guesser
   finds the password after trying half of all the choices. Online, a website lets through maybe a few guesses a
   second; offline, with a stolen file of fast hashes, a big rig might try a hundred billion a second. Both rates are
   round illustrative numbers, not measurements. */
PLAY("guess", function (fig, k) {
  var C = k.C, F = k.F, W = 600, H = 260, st = k.stage(W, H), g = st.g, out = k.out(), n = 4, rate = 1e11;
  function t(sec) { var Y = 3.156e7; return sec < 60 ? Math.round(sec) + " seconds" : sec < 3600 ? Math.round(sec / 60) + " minutes" : sec < 86400 ? Math.round(sec / 3600) + " hours" :
    sec < Y ? Math.round(sec / 86400) + " days" : sec < 1e3 * Y ? Math.round(sec / Y) + " years" : sec < 1e6 * Y ? Math.round(sec / Y / 1e3) + " thousand years" : sec < 1e9 * Y ? Math.round(sec / Y / 1e6) + " million years" : (sec / Y / 1e9).toPrecision(2) + " billion years"; }
  function draw() {
    var choices = Math.pow(7776, n), sec = choices / 2 / rate;
    g.fillStyle = C.bg; g.fillRect(0, 0, W, H);
    g.font = F(18, 500); g.fillStyle = C.ink2; g.fillText(n + " dice word" + (n > 1 ? "s" : "") + ": " + choices.toExponential(1).replace("e+", " × 10^") + " choices", 24, 40);
    g.font = F(44, 600, "d"); g.fillStyle = sec > 3.156e7 * 100 ? C.green : sec > 86400 * 30 ? C.gold : C.red; g.fillText(t(sec), 24, 104);
    g.font = F(17, 500); g.fillStyle = C.ink2; g.fillText("on average, to guess it", 24, 132);
    var lx = Math.min(1, Math.log10(Math.max(1, sec)) / 18); g.fillStyle = "rgba(244,230,212,0.08)"; g.fillRect(24, 170, 552, 22);
    g.fillStyle = C.rust; g.fillRect(24, 170, 552 * lx, 22);
    g.font = F(14, 500); g.fillStyle = C.ink3; ["1 s", "1 day", "1,000 yr", "age of universe"].forEach(function (s, i) { var v = [0, 4.94, 10.5, 17.6][i]; g.textAlign = i === 3 ? "right" : "left"; g.fillText(s, 24 + 552 * v / 18 + (i === 3 ? 10 : 0), 214); });
    g.textAlign = "left";
  }
  st.draw = draw;
  k.slider("Dice words", 1, 7, 1, n, function (v) { return v; }, function (v) { n = v; draw(); out.textContent = "Each extra word multiplies the guesses by 7,776."; });
  k.buttons([["Stolen file, 100 billion a second", function () { rate = 1e11; draw(); }], ["Website, 10 a second", function () { rate = 10; draw(); }]], true);
});
