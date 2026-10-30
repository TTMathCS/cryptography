// "Mars" in the header goes back to akadian.ca; say so to screen readers (Material labels it with the site name)
document$.subscribe(function () {
  document.querySelectorAll("a.md-logo").forEach(function (a) {
    a.setAttribute("aria-label", "Mars – your new home");
    a.setAttribute("title", "Mars – your new home");
  });
});
