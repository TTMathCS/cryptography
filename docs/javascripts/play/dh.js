/* 01-key-exchange/Diffie-Hellman.md: the paint picture of Diffie-Hellman, then the same with small numbers.
   Mixing paint is easy and unmixing it is hard, as g^a mod p is easy to work out and a is hard to get back.
   The numbers are the textbook example p = 23, g = 5, a = 6, b = 15: A = 8, B = 19, and both get 2. */
PLAY("dh", function (fig, k) {
  var C = k.C, F = k.F, W = 600, H = 440, st = k.stage(W, H), g = st.g, out = k.out();
  var YEL = [240, 200, 70], RED = [200, 60, 50], TEA = [40, 140, 150];
  function mix(a, b) { return [Math.round((a[0] + b[0]) / 2), Math.round((a[1] + b[1]) / 2), Math.round((a[2] + b[2]) / 2)]; }
  function rgb(c) { return "rgb(" + c.join(",") + ")"; }
  var AY = mix(YEL, RED), BY = mix(YEL, TEA), S1 = mix(BY, RED), S2 = mix(AY, TEA);
  var STEPS = [
    ["Both agree in public on a starting colour (p = 23, g = 5)", ""],
    ["Each mixes in a secret colour: Alice a = 6, Bob b = 15", "A = 5⁶ mod 23 = 8     B = 5¹⁵ mod 23 = 19"],
    ["They swap the mixtures in public; Eve sees them", "Eve sees 23, 5, 8 and 19"],
    ["Each adds their own secret to what they got", "Alice: 19⁶ mod 23 = 2     Bob: 8¹⁵ mod 23 = 2"],
    ["Same colour, same number: a shared secret Eve cannot unmix", "shared secret = 2"]];
  function pot(x, y, c, label, show) { if (!show) return; g.fillStyle = rgb(c); g.beginPath(); g.arc(x, y, 30, 0, 7); g.fill();
    g.font = F(15, 500); g.fillStyle = C.ink2; g.textAlign = "center"; g.fillText(label, x, y + 50); g.textAlign = "left"; }
  function draw(t) {
    var s = Math.min(4, Math.floor(t * 5)), u = t * 5 - s;
    g.fillStyle = C.bg; g.fillRect(0, 0, W, H);
    g.font = F(22, 600); g.fillStyle = C.ink; g.textAlign = "center"; g.fillText("Alice", 110, 36); g.fillText("Eve listens", 300, 36); g.fillText("Bob", 490, 36); g.textAlign = "left";
    g.strokeStyle = C.line; g.setLineDash([4, 6]); g.beginPath(); g.moveTo(300, 50); g.lineTo(300, 340); g.stroke(); g.setLineDash([]);
    pot(110, 90, YEL, "public", true); pot(490, 90, YEL, "public", true);
    pot(60, 180, RED, "secret", s >= 1); pot(540, 180, TEA, "secret", s >= 1);
    var sw = s === 2 ? u : s > 2 ? 1 : 0;
    pot(150 + (440 - 150) * sw, 180, AY, s >= 2 ? "" : "mix", s >= 1); pot(450 + (160 - 450) * sw, 180, BY, s >= 2 ? "" : "mix", s >= 1);
    if (s >= 2) { pot(300, 260, AY, "", true); pot(300, 260 - 1, AY, "", false); g.fillStyle = rgb(BY); g.beginPath(); g.arc(300, 260, 30, Math.PI / 2, 3 * Math.PI / 2); g.fill(); }
    pot(110, 290, S1, "shared", s >= 3); pot(490, 290, S2, "shared", s >= 3);
    g.font = F(18, 600); g.fillStyle = C.ink; wrap(STEPS[s][0], 20, 380); g.font = F(16, 500, "m"); g.fillStyle = C.gold; g.fillText(STEPS[s][1], 20, 426);
    out.textContent = STEPS[s][0] + (STEPS[s][1] ? ". " + STEPS[s][1] + "." : ".");
  }
  function wrap(text, x, y) { var line = ""; text.split(" ").forEach(function (w) { var t = line ? line + " " + w : w; if (g.measureText(t).width > W - 40) { g.fillText(line, x, y); y += 22; line = w; } else line = t; }); g.fillText(line, x, y); }
  st.draw = function () { draw(film.t()); };
  var film = k.loop(15, draw, { start0: true, label: "Step" });
});
