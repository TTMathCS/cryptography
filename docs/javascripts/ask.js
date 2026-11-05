// The guide's chat button in the corner row, the same file on all six course sites (cryptography, cs, math, physics,
// networks, puzzles; Mars-Requirements site/guide/README.md). A tap opens the guide from www.akadian.ca in a panel over
// this page (/guide/?panel&from=<this site>), the same chat as on the Mars site, so the question, its key and its limits
// all stay there; nothing about the chat runs or is kept on this site. Jim C, the AI guide for the courses, answers here
// first; a Mars question goes to Thomas Reed, the AI guide for Mars (Jim, 5 Nov 2026).
// The button joins the corner row (div.dock) the song's buttons use (Mars-Home home-music.js), rightmost, whichever
// script comes first. Without a script it is a plain link to the guide's own page. Until www.akadian.ca takes this
// site's questions (its deploy of 5 Nov 2026 adds /guide/on-courses.svg and lets this site frame the chat), the button
// opens the guide in a new tab instead of the panel.
(function () {
  var GUIDE = "https://www.akadian.ca";
  var host = location.hostname.split(".")[0];
  var FROM = host === "cryptography" ? "crypto" : (/^(cs|math|physics|networks|puzzles)$/.test(host) ? host : "crypto");
  if (document.querySelector(".ask-bubble")) return;
  var dock = document.querySelector(".dock");
  if (!dock) { dock = document.createElement("div"); dock.className = "dock"; document.body.appendChild(dock); }
  var a = document.createElement("a");
  a.className = "ask-bubble";
  a.href = GUIDE + "/guide/?from=" + FROM;
  a.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M12 3C6.5 3 2 6.8 2 11.5c0 2.3 1.1 4.4 2.9 5.9L4 21.5l4.6-2.3c1.1.3 2.2.5 3.4.5 5.5 0 10-3.8 10-8.5S17.5 3 12 3z"/></svg><span class="ask-say">Ask<span class="ask-more"> Jim C</span></span>';
  a.setAttribute("aria-label", "Ask Jim C, an AI guide");
  a.setAttribute("aria-expanded", "false");
  a.title = "Ask Jim C (an AI guide)";
  dock.appendChild(a);
  var ready = FROM === "crypto";
  if (!ready) a.target = "_blank";

  var p = null;
  function panel(show) {
    if (show && !p) {
      p = document.createElement("div");
      p.className = "guide-panel";
      p.setAttribute("role", "dialog");
      p.setAttribute("aria-label", "Ask the guide");
      var f = document.createElement("iframe");
      f.src = GUIDE + "/guide/?panel&from=" + FROM;
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
    if (!ready || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return;
    e.preventDefault();
    panel(!(p && p.classList.contains("open")));
  });
  // the guide's minimize and close buttons, and Escape inside it, send "guide-close" from www.akadian.ca
  addEventListener("message", function (e) { if (e.origin === GUIDE && e.data === "guide-close") panel(false); });
  addEventListener("keydown", function (e) { if (e.key === "Escape" && p && p.classList.contains("open")) panel(false); });
  // open on the last page, or a link in the guide led here (#guide), it opens again here (a wide screen only: on a
  // phone it would cover the page just opened)
  var was = location.hash === "#guide" ? "1" : "";
  if (was) history.replaceState(null, "", location.pathname + location.search);
  else try { was = sessionStorage.getItem("guidePanel"); } catch (e) {}
  function again() { if (was === "1" && innerWidth > 640) panel(true); }
  if (ready) again();
  else {
    var probe = new Image();
    probe.onload = function () { ready = true; a.removeAttribute("target"); again(); };
    probe.src = GUIDE + "/guide/on-courses.svg";
  }
  // a first visit only: it says what it is for a few seconds, then never again
  var told = true; try { told = !!localStorage.getItem("askTold"); localStorage.setItem("askTold", "1"); } catch (e) {}
  if (!told) { setTimeout(function () { a.classList.add("tell"); }, 1200); setTimeout(function () { a.classList.remove("tell"); }, 5600); }
})();
