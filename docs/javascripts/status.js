// colour every table's Status column; strike the algorithm in Broken rows
var STATUS = {
  recommended: "st-good",
  acceptable: "st-good",
  legacy: "st-old",
  "quantum-vulnerable": "st-old",
  draft: "st-draft",
  broken: "st-bad"
};

document$.subscribe(function () {
  document.querySelectorAll(".md-typeset table").forEach(function (table) {
    var heads = Array.from(table.querySelectorAll("thead th")).map(function (th) {
      return th.textContent.trim();
    });
    var s = heads.indexOf("Status");
    if (s < 0) return;
    var a = heads.indexOf("Algorithm");
    if (a < 0) a = 0;
    table.querySelectorAll("tbody tr").forEach(function (tr) {
      var cell = tr.children[s];
      if (!cell) return;
      var word = cell.textContent.trim().split(/[ (]/)[0].toLowerCase();
      var cls = STATUS[word];
      if (!cls) return;
      cell.classList.add(cls);
      if (cls === "st-bad" && tr.children[a]) tr.children[a].classList.add("st-strike");
    });
  });
});
