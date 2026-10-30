// the site name in the header goes back to the main page, like the logo beside it
var logo = document.querySelector(".md-header__button.md-logo");
var name = document.querySelector(".md-header__topic .md-ellipsis");
if (logo && name) {
  var a = document.createElement("a");
  a.href = logo.href;
  a.className = "home-link";
  a.textContent = name.textContent.trim();
  name.textContent = "";
  name.appendChild(a);
}
