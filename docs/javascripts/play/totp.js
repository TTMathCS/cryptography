/* protocols/TOTP: the code your app shows. Counter = floor(Unix time / 30), HMAC-SHA-1 with the secret, cut to 31
   bits, mod 10^6 (RFC 6238 and RFC 4226). The secret is RFC 6238's own test secret, "12345678901234567890", never a
   real account. Move the time and watch the code change every 30 seconds. */
PLAY("totp", function (fig, k) {
  var C = k.C, F = k.F, W = 600, H = 240, st = k.stage(W, H), g = st.g, out = k.out(), off = 0, fixed = null, code = "······", ctr = 0, key = null;
  var enc = new TextEncoder();
  crypto.subtle.importKey("raw", enc.encode("12345678901234567890"), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]).then(function (kk) { key = kk; calc(); });
  function now() { return fixed !== null ? fixed : Math.floor(Date.now() / 1000) + off; }
  function calc() {
    if (!key) return; var T = now(), c = Math.floor(T / 30), b = new Uint8Array(8), x = c;
    for (var i = 7; i >= 0; i--) { b[i] = x % 256; x = Math.floor(x / 256); }
    crypto.subtle.sign("HMAC", key, b).then(function (s) { var h = new Uint8Array(s), o = h[19] & 15, v = ((h[o] & 127) << 24 | h[o + 1] << 16 | h[o + 2] << 8 | h[o + 3]) >>> 0; ctr = c; code = String(v % 1000000).padStart(6, "0"); draw(); });
  }
  function draw() {
    var T = now(), left = 30 - T % 30; g.fillStyle = C.bg; g.fillRect(0, 0, W, H);
    g.strokeStyle = C.line; g.lineWidth = 12; g.beginPath(); g.arc(100, 110, 62, 0, 7); g.stroke();
    g.strokeStyle = left <= 5 ? C.rust : C.green; g.beginPath(); g.arc(100, 110, 62, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * left / 30); g.stroke();
    g.fillStyle = C.ink; g.textAlign = "center"; g.font = F(30, 800); g.fillText(left + " s", 100, 121);
    g.textAlign = "left"; g.fillStyle = C.ink2; g.font = F(17, 600); g.fillText("Unix time " + T, 200, 50); g.fillText("counter = " + T + " ÷ 30 = " + ctr, 200, 80);
    g.fillStyle = C.gold; g.font = F(52, 800, "m"); g.fillText(code.slice(0, 3) + " " + code.slice(3), 200, 150);
    g.fillStyle = C.ink3; g.font = F(15, 600); g.fillText("test secret from RFC 6238, not a real account", 20, 220);
    out.textContent = fixed === 59 ? "RFC 6238's test at time 59 expects 94287082 in 8 digits; the last six, 287082, are the 6-digit code." : "Code " + code + " for counter " + ctr + ". It changes in " + left + " s; the server also accepts the step before for a slow clock.";
  }
  k.slider("Seconds from now", -120, 120, 1, 0, function (v) { return (v > 0 ? "+" : "") + v; }, function (v) { off = +v; fixed = null; calc(); draw(); });
  k.buttons([["RFC test: time 59", function () { fixed = 59; calc(); }], ["Now", function () { fixed = null; calc(); }]]);
  st.draw = draw; draw();
});
