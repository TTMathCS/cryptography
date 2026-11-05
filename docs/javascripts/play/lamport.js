/* book/22: Lamport's one-time signature with this chapter's 4-bit example. Signing 1011 reveals one secret per
   position; signing 0110 as well leaves only position 2 with a hidden secret, so anyone can forge 8 of the 16 messages. */
PLAY("lamport", function (fig, k) {
  var C = k.C, F = k.F, W = 600, H = 250, st = k.stage(W, H), g = st.g, out = k.out(), signed = [];
  function draw() {
    g.fillStyle = C.bg; g.fillRect(0, 0, W, H); g.textAlign = "center";
    var rev = [[0, 0, 0, 0], [0, 0, 0, 0]]; signed.forEach(function (m) { for (var i = 0; i < 4; i++) rev[+m[i]][i] = 1; });
    g.font = F(16, 700); g.fillStyle = C.ink2; for (var i = 0; i < 4; i++) g.fillText("position " + i, 180 + i * 110, 30);
    g.textAlign = "left"; g.fillText("secret for 0", 20, 78); g.fillText("secret for 1", 20, 148); g.textAlign = "center";
    for (var b = 0; b < 2; b++) for (i = 0; i < 4; i++) { var x = 135 + i * 110, y = 50 + b * 70; g.fillStyle = rev[b][i] ? C.rust : C.line; g.fillRect(x, y, 90, 44); g.fillStyle = rev[b][i] ? C.bg : C.ink3; g.font = F(16, 800); g.fillText(rev[b][i] ? "public" : "hidden", x + 45, y + 28); }
    var forge = 0; for (var m = 0; m < 16; m++) { var ok = true; for (i = 0; i < 4; i++) if (!rev[(m >> (3 - i)) & 1][i]) ok = false; if (ok) forge++; }
    g.textAlign = "left"; g.fillStyle = C.ink; g.font = F(19, 700); g.fillText("signed: " + (signed.join(", ") || "nothing yet"), 20, 205);
    out.textContent = signed.length < 2 ? (signed.length ? "One signature: each position shows one secret. Only " + forge + " message can be signed with what is public: the one you signed." : "Sign a message: each bit reveals one of its two secrets.") : "Two signatures with one key: anyone can now sign " + forge + " of the 16 messages. That is why the key is used once.";
  }
  k.buttons([["Sign 1011", function () { if (signed.indexOf("1011") < 0) signed.push("1011"); draw(); }], ["Sign 0110", function () { if (signed.indexOf("0110") < 0) signed.push("0110"); draw(); }], ["New key", function () { signed = []; draw(); }]]);
  st.draw = draw; draw();
});
