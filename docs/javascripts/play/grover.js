/* history/10: Grover's search (1996) finds a key among N in about √N steps instead of N/2, which halves the bits of
   security of a key. That is why AES-256 is the choice for the long run. */
PLAY("grover", function (fig, k) {
  var C = k.C, F = k.F, W = 600, H = 200, st = k.stage(W, H), g = st.g, out = k.out(), bits = 128;
  function draw() {
    g.fillStyle = C.bg; g.fillRect(0, 0, W, H); g.textAlign = "left";
    g.fillStyle = C.ink2; g.font = F(18, 700); g.fillText("ordinary search", 20, 40); g.fillText("Grover's search", 20, 110);
    g.fillStyle = C.rust; g.fillRect(20, 52, 560 * bits / 256, 22); g.fillStyle = C.ice; g.fillRect(20, 122, 560 * bits / 2 / 256, 22);
    g.fillStyle = C.ink; g.font = F(17, 700); g.textAlign = "right"; g.fillText("about 2^" + (bits - 1) + " tries", 580, 40); g.fillText("about 2^" + bits / 2 + " steps", 580, 110); g.textAlign = "left";
    out.textContent = "A " + bits + "-bit key gives about " + bits / 2 + " bits of security against Grover. " + (bits / 2 >= 128 ? "Still far out of reach." : bits / 2 >= 64 ? "NIST still counts AES-128 as safe: Grover's steps can't be spread over many machines." : "Too weak.");
  }
  k.buttons([["DES 56", function () { bits = 56; draw(); }], ["AES-128", function () { bits = 128; draw(); }], ["AES-256", function () { bits = 256; draw(); }]], true);
  st.draw = draw; draw();
});
