/* 05-modes-aead/Classic-Modes.md: why ECB leaks. A small picture is cut into 4 × 4 blocks and each block is replaced by
   a toy "cipher" output, a colour worked out from the block and a key (a stand-in, not AES). In ECB the same block
   always gives the same output, so the picture's shape survives; in CBC each block is first mixed with the output
   before it, so equal blocks come out different and the picture turns to noise. */
PLAY("ecb", function (fig, k) {
  var C = k.C, F = k.F, W = 600, H = 340, st = k.stage(W, H), g = st.g, out = k.out(), N = 48, B = 4, mode = "ecb";
  var img = []; for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {   // a planet with a ring, drawn in three tones
    var dx = x - 24, dy = y - 24, r = Math.hypot(dx, dy), ring = Math.abs(dy * 1.0 - dx * 0.35) < 2.2 && r < 22;
    img.push(ring ? 2 : r < 14 ? 1 : 0); }
  function mixh(h) { h ^= h >>> 16; h = Math.imul(h, 0x45d9f3b); h ^= h >>> 16; h = Math.imul(h, 0x45d9f3b); h ^= h >>> 16; return h >>> 0; }
  function blocks() { var res = [], prev = 0x1234567;
    for (var by = 0; by < N / B; by++) for (var bx = 0; bx < N / B; bx++) { var h = 0x9e3779b9;
      for (var y = 0; y < B; y++) for (var x = 0; x < B; x++) h = mixh(h ^ (img[(by * B + y) * N + bx * B + x] + 7 * (y * B + x)));
      if (mode === "cbc") h = mixh(h ^ prev); h = mixh(h ^ 0xabcdef); prev = h; res.push(h); }
    return res; }
  function draw() {
    g.fillStyle = C.bg; g.fillRect(0, 0, W, H); var px = 5, ox = 30, oy = 50, ox2 = 330;
    var TONE = ["#1b110d", "#c1673f", "#f6c453"];
    for (var i = 0; i < N * N; i++) { g.fillStyle = TONE[img[i]]; g.fillRect(ox + (i % N) * px, oy + Math.floor(i / N) * px, px, px); }
    var bl = blocks(), nb = N / B;
    bl.forEach(function (h, j) { g.fillStyle = "hsl(" + (h % 360) + "," + (30 + (h >> 9) % 50) + "%," + (25 + (h >> 17) % 45) + "%)";
      g.fillRect(ox2 + (j % nb) * B * px, oy + Math.floor(j / nb) * B * px, B * px, B * px); });
    g.font = F(17, 600); g.fillStyle = C.ink; g.fillText("picture", ox, 36); g.fillText(mode === "ecb" ? "encrypted, ECB" : "encrypted, CBC", ox2, 36);
    out.textContent = mode === "ecb" ? "ECB: every plain black block becomes the same coloured block, so the outline shows through." : "CBC: each block is mixed with the one before, so the same plain block never gives the same output.";
  }
  st.draw = draw;
  k.buttons([["ECB", function () { mode = "ecb"; draw(); }], ["CBC", function () { mode = "cbc"; draw(); }]], true);
});
