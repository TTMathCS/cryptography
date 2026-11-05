/* formats/ASN.1-DER: how DER writes a whole number. Tag 02 (INTEGER), then the length, then the value in two's
   complement in the fewest bytes, so a number whose top bit is set gets an extra 00 in front, as this page says of 127
   and 128. Type a number. */
PLAY("derint", function (fig, k) {
  var C = k.C, F = k.F, W = 600, H = 200, st = k.stage(W, H), g = st.g, out = k.out(), v = 128n;
  function der(n) { var b = []; if (n === 0n) b = [0]; else { var x = n; while (x > 0n) { b.unshift(Number(x & 255n)); x >>= 8n; } if (b[0] & 128) b.unshift(0); } return b; }
  function draw() {
    var val = der(v), all = [[2, "tag"]].concat([[val.length, "length"]]).concat(val.map(function (x, i) { return [x, i === 0 && x === 0 && val.length > 1 ? "pad" : "value"]; })), cw = 52;
    g.fillStyle = C.bg; g.fillRect(0, 0, W, H); g.textAlign = "center";
    all.slice(0, 11).forEach(function (b, i) { var x = 20 + i * cw, col = b[1] === "tag" ? C.ice : b[1] === "length" ? C.gold : b[1] === "pad" ? C.rust : C.green;
      g.fillStyle = col; g.fillRect(x, 40, cw - 6, 46); g.fillStyle = C.bg; g.font = F(20, 800, "m"); g.fillText(b[0].toString(16).padStart(2, "0"), x + (cw - 6) / 2, 71);
      g.fillStyle = C.ink3; g.font = F(14, 700); g.fillText(b[1], x + (cw - 6) / 2, 106); });
    if (all.length > 11) { g.fillStyle = C.ink3; g.font = F(20, 800); g.fillText("…", 20 + 11 * cw, 70); }
    out.textContent = v + " → " + all.map(function (b) { return b[0].toString(16).padStart(2, "0"); }).join(" ") + (val[0] === 0 && val.length > 1 ? ". The 00 keeps it positive: its next byte starts with a 1 bit." : ".");
  }
  var box = k.text("Whole number (0 or more)", "128", function (s) { if (/^\d{1,40}$/.test(s.trim())) { v = BigInt(s.trim()); draw(); } });
  k.buttons([["127", function () { box.value = "127"; v = 127n; draw(); }], ["128", function () { box.value = "128"; v = 128n; draw(); }], ["65537", function () { box.value = "65537"; v = 65537n; draw(); }]]);
  st.draw = draw; draw();
});
