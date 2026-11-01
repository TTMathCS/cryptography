// The "Ask" button in the bottom right corner: opens the guide from www.akadian.ca in a panel over this page. It is the
// same chat as on the Mars site (/guide/?panel&from=crypto), so the question, its key and its limits all stay there
// (Jim, 1 Nov 2026; Mars-Requirements site/guide/README.md). Nothing about the chat runs or is kept on this site.
// Without a script the button is a plain link to the guide's own page.
(function () {
  var GUIDE = "https://www.akadian.ca";
  var a = document.createElement("a");
  a.className = "ask-bubble";
  a.href = GUIDE + "/guide/?from=crypto";
  a.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M12 3C6.5 3 2 6.8 2 11.5c0 2.3 1.1 4.4 2.9 5.9L4 21.5l4.6-2.3c1.1.3 2.2.5 3.4.5 5.5 0 10-3.8 10-8.5S17.5 3 12 3z"/></svg><span class="ask-say">Ask<span class="ask-more"> the guide</span></span>';
  a.setAttribute("aria-label", "Ask the guide, an AI");
  a.setAttribute("aria-expanded", "false");
  a.title = "Ask the guide (an AI)";
  document.body.appendChild(a);

  var p = null;
  function panel(show) {
    if (show && !p) {
      p = document.createElement("div");
      p.className = "guide-panel";
      p.setAttribute("role", "dialog");
      p.setAttribute("aria-label", "Ask the guide");
      var f = document.createElement("iframe");
      f.src = GUIDE + "/guide/?panel&from=crypto";
      f.setAttribute("aria-label", "Ask the guide");
      f.addEventListener("load", function () { p.classList.add("ready"); });
      p.appendChild(f);
      document.body.appendChild(p);
    }
    if (!p) return;
    p.classList.toggle("open", show);
    document.documentElement.classList.toggle("guide-open", show);
    a.setAttribute("aria-expanded", String(show));
    try { sessionStorage.setItem("guidePanel", show ? "1" : ""); } catch (e) { /* blocked */ }
    if (show) p.querySelector("iframe").focus({ preventScroll: true });
    else a.focus({ preventScroll: true });
  }

  a.addEventListener("click", function (e) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return;
    e.preventDefault();
    panel(!(p && p.classList.contains("open")));
  });
  // the guide's minimize and close buttons, and Escape inside it, send "guide-close" from www.akadian.ca
  addEventListener("message", function (e) { if (e.origin === GUIDE && e.data === "guide-close") panel(false); });
  addEventListener("keydown", function (e) { if (e.key === "Escape" && p && p.classList.contains("open")) panel(false); });
  // open on the last page, or a link in the guide on the Mars site led here (#guide), it opens again here (a wide screen
  // only: on a phone it would cover the page just opened)
  var was = location.hash === "#guide" ? "1" : "";
  if (was) history.replaceState(null, "", location.pathname + location.search);
  else try { was = sessionStorage.getItem("guidePanel"); } catch (e) {}
  if (was === "1" && innerWidth > 640) panel(true);
})();
