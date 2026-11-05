/* (5 Nov 2026) Things that move, things to try and things to hear, on the pages. The same file on cs, math,
   cryptography, networks and puzzles (and, as science/play/play.js, on akadian.ca): change one, copy to all.
   A page marks one with
     <figure class="play" data-play="caesar"><span class="ai-tag">AI-created</span><figcaption>…</figcaption></figure>
   When the figure first comes into view this file loads javascripts/play/<name>.js, which
   calls PLAY("drop", function (fig, kit) { … }) to draw it. Nothing moves or sounds until the visitor presses Play;
   a visitor who asks for less motion gets the finished picture and can still step through it with the slider.
   kit: stage(w, h) a canvas w×h in drawing units, loop(seconds, draw) a play button and a time slider,
   slider(…), buttons(…), text(…) a line to type in, out() a line of text, audio() the page's sound, C the colours, F(size, weight) a font,
   orbit("mars", date) where a planet is. */
(function () {
  var me = document.currentScript && document.currentScript.src, makers = {}, waiting = {};
  var reduced = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var C = { bg: "#1b110d", bg2: "#241712", ink: "#f4e6d4", ink2: "#cdb096", ink3: "#a58a73", line: "rgba(244,230,212,0.16)",
    rust: "#eea66f", ice: "#9cc9ea", gold: "#f6c453", red: "#d9603b", green: "#9fc98a", mars: "#c1673f", earth: "#5b8fc9" };
  function F(px, w, fam) { return (w || 500) + " " + px + "px " + (fam === "d" ? '"Saira Condensed", "Arial Narrow", sans-serif' : fam === "m" ? '"IBM Plex Mono", monospace' : '"IBM Plex Sans", system-ui, sans-serif'); }
  var ac = null;
  function audio() {   // one sound context for the page, made on the first tap (browsers allow sound only after one)
    if (!ac) { var A = window.AudioContext || window.webkitAudioContext; if (!A) return null; ac = new A(); }
    if (ac.state === "suspended") ac.resume();
    return ac;
  }
  // where Earth and Mars are on a date: their orbits from NASA JPL's mean elements (J2000), solved with Kepler's equation.
  // Returns x, y, z in AU, the Sun at 0, 0, 0 and the plane of Earth's orbit at z = 0 (Mars's tilts 1.85°).
  // Good to about a degree for these years.
  var EL = { earth: [1.00000261, 0.01671123, 100.46457166, 102.93768193, 0.98560028, 0, 0],
    mars: [1.52371034, 0.09339410, 355.44656, 336.05637, 0.52402068, 1.84969, 49.55954] };
  function orbit(name, date) {
    var o = EL[name], d = (date - Date.UTC(2000, 0, 1, 12)) / 864e5, R = Math.PI / 180;
    var M = ((o[2] + o[4] * d - o[3]) % 360) * R, E = M;
    for (var i = 0; i < 8; i++) E -= (E - o[1] * Math.sin(E) - M) / (1 - o[1] * Math.cos(E));
    var x = o[0] * (Math.cos(E) - o[1]), y = o[0] * Math.sqrt(1 - o[1] * o[1]) * Math.sin(E);
    var w = (o[3] - o[6]) * R, inc = o[5] * R, node = o[6] * R;   // turn by the perihelion, tilt, turn by the node
    var x1 = x * Math.cos(w) - y * Math.sin(w), y1 = x * Math.sin(w) + y * Math.cos(w);
    var y2 = y1 * Math.cos(inc), z = y1 * Math.sin(inc);
    return { x: x1 * Math.cos(node) - y2 * Math.sin(node), y: x1 * Math.sin(node) + y2 * Math.cos(node), z: z };
  }
  window.PLAY = function (name, make) { makers[name] = make; (waiting[name] || []).forEach(build); delete waiting[name]; };

  function kit(fig) {
    var cap = fig.querySelector("figcaption"), k = { C: C, F: F, reduced: reduced, audio: audio, fig: fig, orbit: orbit };
    function put(el) { fig.insertBefore(el, cap); return el; }
    var ctl = null;
    function controls() { if (!ctl) { ctl = document.createElement("div"); ctl.className = "ctl"; put(ctl); } return ctl; }
    k.stage = function (w, h, onTap) {   // a canvas that keeps its shape and redraws sharp at any width
      var box = put(document.createElement("div")); box.className = "stage";
      box.style.aspectRatio = w + " / " + h;
      var c = document.createElement("canvas"); box.appendChild(c);
      var tag = fig.querySelector(":scope > .ai-tag"); if (tag) box.appendChild(tag);   // the label sits in the picture's corner
      var g = c.getContext("2d"), s = { canvas: c, g: g, w: w, h: h, draw: null };
      function fit() {
        var r = window.devicePixelRatio || 1, cw = box.clientWidth || 1;
        c.width = Math.round(cw * r); c.height = Math.round(cw * h / w * r);
        g.setTransform(c.width / w, 0, 0, c.height / h, 0, 0);
        if (s.draw) s.draw();
      }
      if (window.ResizeObserver) new ResizeObserver(fit).observe(box); else window.addEventListener("resize", fit);
      if (onTap) {
        c.style.cursor = "pointer";
        c.addEventListener("pointerdown", function (e) {
          var b = c.getBoundingClientRect(); onTap((e.clientX - b.left) / b.width * w, (e.clientY - b.top) / b.height * h, e);
        });
      }
      s.fit = fit; fit();
      return s;
    };
    k.loop = function (secs, draw, opts) {   // like a short film: Play / Pause, and a slider to scrub through it
      opts = opts || {};
      var row = document.createElement("div"); row.className = "film"; controls().appendChild(row);
      var b = document.createElement("button"); b.type = "button"; b.className = "pp"; row.appendChild(b);
      var r = document.createElement("input"); r.type = "range"; r.min = 0; r.max = 1000; r.value = reduced && !opts.start0 ? 1000 : 0;
      r.setAttribute("aria-label", opts.label || "Time"); row.appendChild(r);
      var t = +r.value / 1000, on = false, last = 0, raf = 0, self = {};
      function label() { b.textContent = on ? "Pause" : t >= 1 ? "Again" : "Play"; b.setAttribute("aria-pressed", on); }
      function frame(now) {
        if (!on) return;
        var dt = last ? (now - last) / 1000 : 0; last = now;
        t += dt / secs;
        if (t >= 1) { if (opts.repeat) t -= 1; else { t = 1; on = false; } }
        r.value = Math.round(t * 1000); draw(t, true); label();
        if (on) raf = requestAnimationFrame(frame);
      }
      self.play = function () { if (t >= 1) t = 0; on = true; last = 0; label(); if (opts.onPlay) opts.onPlay(t); raf = requestAnimationFrame(frame); };
      self.pause = function () { on = false; cancelAnimationFrame(raf); label(); if (opts.onPause) opts.onPause(); };
      self.set = function (v) { t = Math.max(0, Math.min(1, v)); r.value = Math.round(t * 1000); draw(t, false); label(); };
      self.t = function () { return t; }; self.on = function () { return on; };
      b.addEventListener("click", function () { on ? self.pause() : self.play(); });
      r.addEventListener("input", function () { if (on) self.pause(); t = +r.value / 1000; draw(t, false); label(); });
      // stop when scrolled away, so nothing runs unseen
      if (window.IntersectionObserver) new IntersectionObserver(function (es) { if (!es[0].isIntersecting && on) self.pause(); }).observe(fig);
      label(); setTimeout(function () { draw(t, false); }, 0);
      return self;
    };
    k.slider = function (text, min, max, step, value, show, onInput) {
      var lab = document.createElement("label"); lab.className = "sl"; controls().appendChild(lab);
      var name = document.createElement("span"); name.textContent = text; lab.appendChild(name);
      var r = document.createElement("input"); r.type = "range"; r.min = min; r.max = max; r.step = step; r.value = value; lab.appendChild(r);
      var o = document.createElement("b"); lab.appendChild(o);
      function upd() { o.textContent = show(+r.value); onInput(+r.value); }
      r.addEventListener("input", upd); setTimeout(upd, 0);
      return r;
    };
    k.buttons = function (list, pick) {   // a row of buttons; with pick, one stays chosen like a tab
      var row = document.createElement("div"); row.className = "btns"; controls().appendChild(row);
      list.forEach(function (it, i) {
        var b = document.createElement("button"); b.type = "button"; b.textContent = it[0]; row.appendChild(b);
        if (pick) b.setAttribute("aria-pressed", i === 0);
        b.addEventListener("click", function () {
          if (pick) row.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", x === b); });
          it[1](b);
        });
      });
      return row;
    };
    k.text = function (label, value, onInput) {   // a line to type in
      var lab = document.createElement("label"); lab.className = "sl tx"; controls().appendChild(lab);
      var name = document.createElement("span"); name.textContent = label; lab.appendChild(name);
      var i = document.createElement("input"); i.type = "text"; i.value = value; i.spellcheck = false; i.setAttribute("autocomplete", "off"); lab.appendChild(i);
      i.addEventListener("input", function () { onInput(i.value); }); setTimeout(function () { onInput(i.value); }, 0);
      return i;
    };
    k.out = function () { var p = document.createElement("p"); p.className = "out"; p.setAttribute("aria-live", "polite"); controls().appendChild(p); return p; };
    return k;
  }
  function build(fig) {
    if (fig.getAttribute("data-built")) return;
    fig.setAttribute("data-built", "1");
    try { makers[fig.getAttribute("data-play")](fig, kit(fig)); } catch (e) { fig.removeAttribute("data-built"); if (window.console) console.error(e); }
  }
  function want(fig) {
    var n = fig.getAttribute("data-play");
    if (makers[n]) return build(fig);
    if (waiting[n]) { waiting[n].push(fig); return; }
    waiting[n] = [fig];
    var s = document.createElement("script"); s.src = new URL("play/" + n + ".js", me).href; document.head.appendChild(s);
  }
  var figs = document.querySelectorAll("figure.play[data-play]");
  if (!window.IntersectionObserver) { figs.forEach(want); return; }
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { io.unobserve(e.target); want(e.target); } });
  }, { rootMargin: "300px" });
  figs.forEach(function (f) { io.observe(f); });
})();
