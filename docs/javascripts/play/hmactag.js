/* book/10: an HMAC-SHA-256 tag, computed in your browser with a made-up key. Change one letter of the message and
   the tag changes completely; without the key nobody can make the new tag. */
PLAY("hmactag", function (fig, k) {
  var C = k.C, F = k.F, W = 600, H = 220, st = k.stage(W, H), g = st.g, out = k.out(), msg = "Pay Ana 20 dollars", orig = msg, t0 = "", t1 = "", key, enc = new TextEncoder();
  function hex(b) { return Array.from(new Uint8Array(b), function (x) { return x.toString(16).padStart(2, "0"); }).join(""); }
  crypto.subtle.importKey("raw", enc.encode("a made-up shared key"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]).then(function (kk) { key = kk; calc(); });
  function calc() { if (!key) return; Promise.all([crypto.subtle.sign("HMAC", key, enc.encode(orig)), crypto.subtle.sign("HMAC", key, enc.encode(msg))]).then(function (r) { t0 = hex(r[0]); t1 = hex(r[1]); draw(); }); }
  function row(y, lab, t, cmp) { g.fillStyle = C.ink2; g.font = F(15, 700); g.textAlign = "left"; g.fillText(lab, 20, y); g.font = F(17, 700, "m"); for (var i = 0; i < 32 && t; i++) { g.fillStyle = cmp && cmp[i] !== t[i] ? C.red : C.gold; g.fillText(t[i], 20 + i * 17.5, y + 26); } }
  function draw() {
    g.fillStyle = C.bg; g.fillRect(0, 0, W, H); row(26, "tag of \"" + orig + "\" (first half)", t0); row(100, "tag of \"" + msg + "\"", t1, t0);
    var d = 0; for (var i = 0; i < 64; i++) if (t0[i] !== t1[i]) d++;
    out.textContent = msg === orig ? "Edit the message: even one letter." : d + " of the 64 hex digits changed (red: the first 32). The receiver's check fails, so the change is caught.";
  }
  k.text("Message", msg, function (v) { msg = v; calc(); });
  st.draw = draw; draw();
});
