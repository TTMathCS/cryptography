// history timeline: click "Region" to group the rows by region, "Year" to put them back in date order
document$.subscribe(function () {
  var h = document.getElementById("timeline");
  if (!h) return;
  var t = null;
  for (var el = h.nextElementSibling; el && el.tagName !== "H2" && !t; el = el.nextElementSibling)
    t = el.tagName === "TABLE" ? el : el.querySelector("table");
  if (!t || t.dataset.sortable) return;
  t.dataset.sortable = "1";
  var body = t.tBodies[0], rows = Array.from(body.rows), th = t.tHead.rows[0].cells;
  var pos = new Map(rows.map(function (r, i) { return [r, i]; }));

  function sortBy(col) {
    var r = rows.slice();
    if (col === 1) r.sort(function (a, b) {
      return a.cells[1].textContent.localeCompare(b.cells[1].textContent) || pos.get(a) - pos.get(b);
    });
    r.forEach(function (x) { body.appendChild(x); });
    th[0].setAttribute("aria-sort", col === 0 ? "ascending" : "none");
    th[1].setAttribute("aria-sort", col === 1 ? "ascending" : "none");
  }

  [0, 1].forEach(function (i) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "timeline-sort";
    b.textContent = th[i].textContent;
    b.title = i ? "Group the rows by region" : "Back to date order";
    b.addEventListener("click", function () { sortBy(i); });
    th[i].textContent = "";
    th[i].appendChild(b);
  });
  th[0].setAttribute("aria-sort", "ascending");

  var p = document.createElement("p");
  p.className = "timeline-hint";
  p.textContent = "Click Region to group the rows by part of the world, or Year to go back to date order.";
  var wrap = t.closest(".md-typeset__scrollwrap") || t;
  wrap.parentNode.insertBefore(p, wrap);
});
