/* protocols/JWT: an HS256 token made in your browser with a made-up secret. The third part is HMAC-SHA-256 over
   header.payload. Change the payload and the old signature no longer fits; only the secret's holder can make a new one. */
PLAY("jwtsign", function (fig, k) {
  var C = k.C, F = k.F, W = 600, H = 260, st = k.stage(W, H), g = st.g, out = k.out(), role = "user", sig = "", good = "", key, enc = new TextEncoder();
  function b64u(s) { return btoa(s).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_"); }
  function bytes(b) { var s = ""; new Uint8Array(b).forEach(function (x) { s += String.fromCharCode(x); }); return s; }
  var hd = b64u('{"alg":"HS256","typ":"JWT"}');
  function pl(r) { return b64u('{"sub":"ana","role":"' + r + '"}'); }
  crypto.subtle.importKey("raw", enc.encode("made-up server secret"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]).then(function (kk) { key = kk; crypto.subtle.sign("HMAC", key, enc.encode(hd + "." + pl("user"))).then(function (s) { sig = b64u(bytes(s)); good = sig; draw(); }); });
  function wrapc(t, col, x, y, n) { g.fillStyle = col; for (var i = 0; i * n < t.length && i < 3; i++) g.fillText(t.slice(i * n, i * n + n), x, y + i * 22); }
  function draw() {
    g.fillStyle = C.bg; g.fillRect(0, 0, W, H); g.textAlign = "left"; g.font = F(16, 700, "m");
    g.fillStyle = C.ink2; g.font = F(15, 700); g.fillText("header", 20, 24); g.fillText("payload: {\"sub\":\"ana\",\"role\":\"" + role + "\"}", 20, 84); g.fillText("signature", 20, 156);
    g.font = F(16, 700, "m"); wrapc(hd, C.ice, 20, 46, 52); wrapc(pl(role), role === "admin" ? C.red : C.gold, 20, 106, 52); wrapc(sig, C.green, 20, 178, 52);
    crypto.subtle && key && crypto.subtle.sign("HMAC", key, enc.encode(hd + "." + pl(role))).then(function (s) { var ok = b64u(bytes(s)) === sig; out.textContent = ok ? "The server recomputes the HMAC: it matches, so the token is accepted." : "Payload changed to role \"admin\" but the signature is the old one: the server's HMAC differs, so the token is refused."; });
  }
  k.buttons([["Make me admin", function () { role = "admin"; draw(); }], ["Back to user", function () { role = "user"; sig = good; draw(); }]]);
  st.draw = draw; draw();
});
