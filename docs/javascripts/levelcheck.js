// The level check (level-check page on cs, math and cryptography; the same file on all three).
// Each answer carries a score (0, 1 or 2); when every question is answered the total picks Beginner,
// Intermediate or Expert and shows that result. Runs in the browser only: nothing is saved or sent.
(function () {
  function init() {
    var form = document.querySelector("form.level-check");
    if (!form || form.dataset.ready) return;
    form.dataset.ready = "1";
    var qs = form.querySelectorAll("fieldset.lcq");
    var box = document.querySelector(".lc-result");
    function update() {
      var total = 0, answered = 0;
      qs.forEach(function (q) {
        var c = q.querySelector("input:checked");
        if (c) { answered++; total += +c.value; }
      });
      if (answered < qs.length) { if (box) box.hidden = true; return; }
      var max = qs.length * 2;
      var lv = total <= max / 4 ? "Beginner" : total < max * 3 / 4 ? "Intermediate" : "Expert";
      box.querySelectorAll(".lc-out").forEach(function (o) { o.hidden = o.getAttribute("data-level") !== lv; });
      var was = box.hidden;
      box.hidden = false;
      if (was) box.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    form.addEventListener("change", update);
    form.addEventListener("reset", function () { setTimeout(update, 0); });
  }
  if (window.document$ && document$.subscribe) document$.subscribe(init); else document.addEventListener("DOMContentLoaded", init);
})();
