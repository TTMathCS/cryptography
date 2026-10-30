// the site name in the header goes back to the main page, like the logo beside it
(function () {
  var logo = document.querySelector(".md-header__button.md-logo");
  var title = document.querySelector(".md-header__topic .md-ellipsis");
  if (!logo || !title) return;
  var a = document.createElement("a");
  a.href = logo.href;
  a.className = "home-link";
  a.textContent = title.textContent.trim();
  title.textContent = "";
  title.appendChild(a);
})();
