/* protocols/FIDO2: why a passkey can't be phished. The browser, not the person, tells the authenticator which site is
   asking (the RP ID, and the origin inside the signed client data). A look-alike site gets no key and no signature.
   The site names are made up. */
PLAY("fidoorigin", function (fig, k) {
  var C = k.C, F = k.F, W = 600, H = 230, st = k.stage(W, H), g = st.g, out = k.out(), site = "example.com";
  function draw() {
    var ok = site === "example.com"; g.fillStyle = C.bg; g.fillRect(0, 0, W, H); g.textAlign = "center";
    g.fillStyle = ok ? C.green : C.red; g.fillRect(20, 40, 160, 70); g.fillStyle = C.bg; g.font = F(18, 800); g.fillText(site, 100, 82);
    g.fillStyle = C.ice; g.fillRect(220, 40, 160, 70); g.fillStyle = C.bg; g.fillText("browser", 300, 82);
    g.fillStyle = C.gold; g.fillRect(420, 40, 160, 70); g.fillStyle = C.bg; g.fillText("passkey", 500, 74); g.font = F(14, 700); g.fillText("for example.com", 500, 96);
    g.strokeStyle = C.ink3; g.lineWidth = 2; [[180, 220], [380, 420]].forEach(function (p) { g.beginPath(); g.moveTo(p[0], 75); g.lineTo(p[1], 75); g.stroke(); });
    g.fillStyle = C.ink2; g.font = F(15, 700); g.fillText("asks for", 200, 132); g.fillText("RP ID " + site, 400, 132);
    g.fillStyle = ok ? C.green : C.red; g.font = F(20, 800); g.fillText(ok ? "signs the challenge ✓" : "no key for this site: nothing to sign", 300, 180);
    out.textContent = ok ? "The real site: the passkey signs, and the signed data names http(s)://example.com as the origin." : "The look-alike can show the same login page, but the browser reports its real name, so the passkey never answers. There is no code to type and pass on.";
  }
  k.buttons([["example.com", function () { site = "example.com"; draw(); }], ["examp1e.com", function () { site = "examp1e.com"; draw(); }]], true);
  st.draw = draw; draw();
});
