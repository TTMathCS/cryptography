// Step-by-step modular exponentiation, for the "Watch it step by step" boxes on algorithm pages (Jim, 2 Nov 2026:
// animations that do not play by default). A box is <div class="mars-modexp" data-base="65" data-exp="17"
// data-mod="3233" data-label="c = 65^17 mod 3233">. Nothing moves until the reader presses Play or Step.
(function () {
  function rows(base, exp, mod) {
    var out = [], r = 1n, bits = exp.toString(2);
    for (var i = 0; i < bits.length; i++) {
      var sq = (r * r) % mod, bit = bits[i], next = bit === "1" ? (sq * base) % mod : sq;
      out.push({ bit: bit, before: r, sq: sq, next: next });
      r = next;
    }
    return out;
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function build(box) {
    var base = BigInt(box.dataset.base), exp = BigInt(box.dataset.exp), mod = BigInt(box.dataset.mod);
    var steps = rows(base, exp, mod), shown = 0, timer = null;
    var bits = exp.toString(2);

    var head = el("p", "mars-modexp__head", box.dataset.label || "");
    var bitRow = el("p", "mars-modexp__bits");
    bitRow.append("exponent " + exp + " in binary: ");
    var bitSpans = [];
    for (var i = 0; i < bits.length; i++) { var s = el("span", "mars-modexp__bit", bits[i]); bitSpans.push(s); bitRow.append(s); }

    var table = el("table", "mars-modexp__table");
    var thead = el("thead"), tr = el("tr");
    ["Bit", "Square", "Multiply by " + base + "?", "Result mod " + mod].forEach(function (h) { tr.append(el("th", "", h)); });
    thead.append(tr); table.append(thead);
    var tbody = el("tbody"); table.append(tbody);
    var trs = steps.map(function (st) {
      var row = el("tr");
      row.append(el("td", "", st.bit));
      row.append(el("td", "", st.before + "² mod " + mod + " = " + st.sq));
      row.append(el("td", "", st.bit === "1" ? st.sq + " × " + base + " mod " + mod + " = " + st.next : "no (bit is 0)"));
      row.append(el("td", "mars-modexp__res", String(st.next)));
      row.hidden = true;
      tbody.append(row);
      return row;
    });

    var result = el("p", "mars-modexp__out");
    var bar = el("p", "mars-modexp__bar");
    var play = el("button", "mars-modexp__btn", "Play"), step = el("button", "mars-modexp__btn", "Step"),
        reset = el("button", "mars-modexp__btn", "Reset");
    [play, step, reset].forEach(function (b) { b.type = "button"; bar.append(b); });

    function draw() {
      trs.forEach(function (row, k) { row.hidden = k >= shown; row.classList.toggle("is-now", k === shown - 1); });
      bitSpans.forEach(function (s, k) { s.classList.toggle("is-now", k === shown - 1); s.classList.toggle("is-done", k < shown - 1); });
      result.textContent = shown === steps.length ? "Answer: " + steps[steps.length - 1].next : "Steps shown: " + shown + " of " + steps.length;
      step.disabled = shown === steps.length;
    }
    function stop() { clearInterval(timer); timer = null; play.textContent = "Play"; }
    function next() { if (shown < steps.length) { shown++; draw(); } if (shown === steps.length) stop(); }
    play.addEventListener("click", function () {
      if (timer) { stop(); return; }
      if (shown === steps.length) { shown = 0; draw(); }
      play.textContent = "Pause";
      timer = setInterval(next, 900);
    });
    step.addEventListener("click", function () { stop(); next(); });
    reset.addEventListener("click", function () { stop(); shown = 0; draw(); });

    box.append(head, bitRow, bar, table, result);
    draw();
  }

  function init() { document.querySelectorAll(".mars-modexp:not([data-ready])").forEach(function (b) { b.dataset.ready = "1"; build(b); }); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
  // the box sits inside a closed section: build it anyway, it is hidden until the reader opens it
})();
