/* history/01: the skytale as Plutarch describes it. Write along the rod, unwind the strip, and the letters come out of
   order. Only a rod of the right thickness (letters per turn) puts them back. The message is made up. */
PLAY("skytale", function (fig, k) {
  var C = k.C, F = k.F, W = 600, H = 240, st = k.stage(W, H), g = st.g, out = k.out(), msg = "SENDMORESHIPSTOTHENORTHGATE", key = 4, tryk = 3;
  function strip() { var rows = key, cols = Math.ceil(msg.length / rows), s = ""; for (var c = 0; c < cols; c++) for (var r = 0; r < rows; r++) { var i = r * cols + c; s += i < msg.length ? msg[i] : "X"; } return s; }
  function read(s, kk) { var cols = Math.ceil(s.length / kk), o = ""; for (var r = 0; r < kk; r++) for (var c = 0; c < cols; c++) { var i = c * kk + r; if (i < s.length) o += s[i]; } return o; }
  function draw() {
    var s = strip(), r = read(s, tryk), ok = tryk === key, cols = Math.ceil(s.length / tryk);
    g.fillStyle = C.bg; g.fillRect(0, 0, W, H); g.textAlign = "left";
    g.fillStyle = C.ink2; g.font = F(16, 700); g.fillText("the strip, unwound", 20, 28);
    g.font = F(17, 700, "m"); for (var i = 0; i < s.length; i++) { g.fillStyle = C.mars; g.fillText(s[i], 20 + i * 19.5, 56); }
    g.fillStyle = C.ink2; g.font = F(16, 700); g.fillText("wound on a rod of " + tryk + " letters a turn", 20, 96);
    var cw = Math.min(30, 540 / cols); g.font = F(17, 700, "m");
    for (var row = 0; row < tryk; row++) for (var c = 0; c < cols; c++) { var j = row * cols + c; if (j < r.length) { g.fillStyle = ok ? C.green : C.ink; g.fillText(r[j], 24 + c * cw, 126 + row * 24); } }
    out.textContent = ok ? "The right rod: the message reads along it. Every letter stayed itself; only the order changed." : "The wrong rod (" + tryk + "): still a jumble. Try other thicknesses.";
  }
  k.slider("Rod thickness", 2, 8, 1, tryk, function (v) { return v + " letters a turn"; }, function (v) { tryk = +v; draw(); });
  st.draw = draw; draw();
});
