/* 07-hash/SHA-2.md: the avalanche. SHA-256 of your text and of the same text with its last letter changed by one
   (worked out by the browser's own SHA-256). Each square is one of the 256 output bits; gold squares differ. About
   half of them change, and nothing about the change shows where in the input it came from. */
PLAY("avalanche", function (fig, k) {
  var C = k.C, F = k.F, W = 600, H = 330, st = k.stage(W, H), g = st.g, out = k.out(), A = null, B = null, a = "", b = "";
  function bits(buf) { var v = new Uint8Array(buf), r = []; v.forEach(function (x) { for (var i = 7; i >= 0; i--) r.push(x >> i & 1); }); return r; }
  function hex(buf) { return Array.from(new Uint8Array(buf)).map(function (x) { return ("0" + x.toString(16)).slice(-2); }).join(""); }
  function draw() {
    g.fillStyle = C.bg; g.fillRect(0, 0, W, H);
    if (!A) { g.font = F(18, 500); g.fillStyle = C.ink2; g.fillText(window.crypto && crypto.subtle ? "working…" : "This browser cannot work out SHA-256 here.", 20, 40); return; }
    var x = bits(A.buf), y = bits(B.buf), d = 0, s = 17;
    for (var i = 0; i < 256; i++) { var diff = x[i] !== y[i]; if (diff) d++;
      g.fillStyle = diff ? C.gold : x[i] ? "rgba(244,230,212,0.35)" : "rgba(244,230,212,0.08)"; g.fillRect(28 + (i % 32) * s, 70 + Math.floor(i / 32) * s, s - 3, s - 3); }
    g.font = F(26, 600, "d"); g.fillStyle = C.ink; g.fillText(d + " of 256 bits changed", 24, 44);
    g.font = F(13, 500, "m"); g.fillStyle = C.ink2; g.fillText(A.hex.slice(0, 32), 28, 236); g.fillText(A.hex.slice(32), 28, 254);
    g.fillStyle = C.gold; g.fillText(B.hex.slice(0, 32), 28, 284); g.fillText(B.hex.slice(32), 28, 302);
    out.textContent = "“" + a + "” and “" + b + "” differ in one letter; their SHA-256 hashes differ in " + d + " of 256 bits.";
  }
  function run(v) {
    a = v; b = v.length ? v.slice(0, -1) + String.fromCharCode(v.charCodeAt(v.length - 1) ^ 1) : "\u0001";
    if (!(window.crypto && crypto.subtle)) return draw();
    var e = new TextEncoder();
    Promise.all([crypto.subtle.digest("SHA-256", e.encode(a)), crypto.subtle.digest("SHA-256", e.encode(b))]).then(function (r) {
      if (v !== a) return; A = { buf: r[0], hex: hex(r[0]) }; B = { buf: r[1], hex: hex(r[1]) }; draw(); });
  }
  st.draw = draw;
  k.text("Your text", "abc", run);
});
