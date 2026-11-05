/* protocols/Signal: the symmetric ratchet. Each message key comes from the chain key with HMAC-SHA-256, and the chain
   key moves on and the old one is deleted, so a key stolen today cannot open earlier messages. The inputs 01 and 02
   follow the Double Ratchet specification; the starting key is made up. Press Next message. */
PLAY("ratchet", function (fig, k) {
  var C = k.C, F = k.F, W = 600, H = 250, st = k.stage(W, H), g = st.g, out = k.out(), chain = [], msgs = [];
  function hex(b) { return Array.from(new Uint8Array(b), function (x) { return x.toString(16).padStart(2, "0"); }).join(""); }
  function hmac(kb, d) { return crypto.subtle.importKey("raw", kb, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]).then(function (kk) { return crypto.subtle.sign("HMAC", kk, new Uint8Array([d])); }); }
  var ck = new TextEncoder().encode("made-up starting chain key, 32B!");
  chain.push(hex(ck.buffer));
  function next() { if (msgs.length >= 4) return; Promise.all([hmac(ck, 1), hmac(ck, 2)]).then(function (r) { msgs.push(hex(r[0])); ck = new Uint8Array(r[1]); chain.push(hex(r[1])); draw(); }); }
  function draw() {
    g.fillStyle = C.bg; g.fillRect(0, 0, W, H); g.textAlign = "center";
    for (var i = 0; i < chain.length; i++) { var x = 20 + i * 110, last = i === chain.length - 1; g.fillStyle = last ? C.gold : C.line; g.fillRect(x, 30, 96, 50); g.fillStyle = last ? C.bg : C.ink3; g.font = F(14, 700); g.fillText(last ? "chain key" : "deleted", x + 48, 50); g.font = F(14, 700, "m"); g.fillText(chain[i].slice(0, 8), x + 48, 70);
      if (i < msgs.length) { g.strokeStyle = C.ink3; g.lineWidth = 2; g.beginPath(); g.moveTo(x + 96, 55); g.lineTo(x + 110, 55); g.stroke(); g.beginPath(); g.moveTo(x + 48, 82); g.lineTo(x + 48, 120); g.stroke();
        g.fillStyle = C.green; g.fillRect(x, 124, 96, 50); g.fillStyle = C.bg; g.font = F(14, 700); g.fillText("message " + (i + 1), x + 48, 144); g.font = F(14, 700, "m"); g.fillText(msgs[i].slice(0, 8), x + 48, 164); } }
    g.textAlign = "left"; g.fillStyle = C.ink3; g.font = F(15, 600); g.fillText("first 8 hex digits of each key", 20, 206);
    out.textContent = msgs.length ? msgs.length + " message key" + (msgs.length > 1 ? "s" : "") + " made. Only the gold chain key is kept; one-way HMAC means it cannot be run backwards." : "Press Next message.";
  }
  k.buttons([["Next message", next], ["Start again", function () { ck = new TextEncoder().encode("made-up starting chain key, 32B!"); chain = [hex(ck.buffer)]; msgs = []; draw(); }]]);
  st.draw = draw; draw();
});
