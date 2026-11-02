// "Watch it step by step" boxes on algorithm pages (Jim, 2 Nov 2026: animations that do not play by default).
// A box is <div class="mars-steps" markdown> holding an ordered list; each list item is one step. Nothing shows
// past the first step and nothing moves until the reader presses Play or Step.
(function () {
  function btn(text) { var b = document.createElement("button"); b.type = "button"; b.className = "mars-modexp__btn"; b.textContent = text; return b; }
  function build(box) {
    var list = box.querySelector("ol");
    if (!list) return;
    var items = Array.prototype.slice.call(list.children), shown = 1, timer = null;
    var bar = document.createElement("p"), play = btn("Play"), step = btn("Step"), reset = btn("Reset");
    var count = document.createElement("span");
    bar.className = "mars-modexp__bar"; count.className = "mars-steps__count";
    bar.append(play, step, reset, count);
    box.insertBefore(bar, list);
    function draw() {
      items.forEach(function (li, k) { li.hidden = k >= shown; li.classList.toggle("is-now", k === shown - 1); });
      count.textContent = "step " + shown + " of " + items.length;
      step.disabled = shown === items.length;
    }
    function stop() { clearInterval(timer); timer = null; play.textContent = "Play"; }
    function next() { if (shown < items.length) { shown++; draw(); } if (shown === items.length) stop(); }
    play.addEventListener("click", function () {
      if (timer) { stop(); return; }
      if (shown === items.length) { shown = 1; draw(); }
      play.textContent = "Pause";
      timer = setInterval(next, 1400);
    });
    step.addEventListener("click", function () { stop(); next(); });
    reset.addEventListener("click", function () { stop(); shown = 1; draw(); });
    draw();
  }
  function init() { document.querySelectorAll(".mars-steps:not([data-ready])").forEach(function (b) { b.dataset.ready = "1"; build(b); }); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
