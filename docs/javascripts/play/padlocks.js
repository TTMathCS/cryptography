/* start/05: the two-padlock trick from this page. The box crosses three times and always carries at least one lock;
   no key ever travels. Press Play. */
PLAY("padlocks", function (fig, k) {
  var C = k.C, F = k.F, W = 600, H = 250, st = k.stage(W, H), g = st.g, out = k.out();
  var S = [{ x: 0, L: [], msg: "Alice puts the secret in the box." }, { x: 0, L: ["A"], msg: "1. She locks it with her own padlock." }, { x: 1, L: ["A"], msg: "She sends it. The post office can't open it." },
    { x: 1, L: ["A", "B"], msg: "2. Bob adds his own padlock." }, { x: 0, L: ["A", "B"], msg: "He sends it back." }, { x: 0, L: ["B"], msg: "3. Alice takes her padlock off." },
    { x: 1, L: ["B"], msg: "She sends it again. Only Bob's lock is on it." }, { x: 1, L: [], open: true, msg: "4. Bob opens it. No key ever travelled." }];
  function lock(x, y, col, t) { g.strokeStyle = col; g.lineWidth = 5; g.beginPath(); g.arc(x, y - 8, 11, Math.PI, 0); g.stroke(); g.fillStyle = col; g.fillRect(x - 16, y - 8, 32, 26); g.fillStyle = C.bg; g.font = F(16, 800); g.textAlign = "center"; g.fillText(t, x, y + 11); }
  function draw(t) {
    var p = t * (S.length - 1), i = Math.floor(p), f = p - i, a = S[i], b = S[Math.min(S.length - 1, i + 1)], x = a.x + (b.x - a.x) * Math.min(1, f * 1.6), bx = 120 + x * 300;
    var cur = f > 0.6 ? b : a; g.fillStyle = C.bg; g.fillRect(0, 0, W, H);
    g.fillStyle = C.ink; g.font = F(20, 800); g.textAlign = "center"; g.fillText("Alice", 100, 34); g.fillText("Bob", 480, 34);
    g.fillStyle = C.ink3; g.font = F(15, 600); g.fillText("post office", 290, 34); g.setLineDash([4, 5]); g.strokeStyle = C.line; g.beginPath(); g.moveTo(290, 46); g.lineTo(290, 200); g.stroke(); g.setLineDash([]);
    g.fillStyle = cur.open ? C.green : C.mars; g.fillRect(bx, 100, 120, 70); if (cur.open) { g.fillStyle = C.gold; g.font = F(18, 800); g.fillText("secret", bx + 60, 142); }
    cur.L.forEach(function (l, j) { lock(bx + 35 + j * 50, 186, l === "A" ? C.ice : C.rust, l); });
    out.textContent = cur.msg;
  }
  var film = k.loop(12, draw, { label: "Steps" }); st.draw = function () { draw(film.t()); };
});
