// Typeset math with KaTeX (Jim, 2 Nov 2026: "I need math symbols instead of messy strings").
// Markdown writes math as $...$ (inline) or $$...$$ (display); pymdownx.arithmatex wraps it in .arithmatex
// elements, and this renders only those, so code blocks and hex values are never touched. KaTeX is served
// from this site (docs/katex/), not a CDN.
(function () {
  function render() {
    if (!window.renderMathInElement) return;
    // the "On this page" list repeats heading text as plain \(...\), so it is typeset too
    document.querySelectorAll(".arithmatex:not([data-ready]), .md-nav--secondary:not([data-ready])").forEach(function (el) {
      el.dataset.ready = "1";
      window.renderMathInElement(el, {
        delimiters: [
          { left: "\\(", right: "\\)", display: false },
          { left: "\\[", right: "\\]", display: true }
        ],
        throwOnError: false
      });
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", render); else render();
})();
