// The Mars site's holiday badge (themes copied from akadian.ca by tools/sync-from-mars.sh): while a theme is on,
// its greeting sits in the corner in its accent colour; × hides it for the visit. ?holiday=halloween or
// ?date=2026-12-24 to test, ?holiday=none for no theme.
import { activeTheme } from "./loader.js";

const base = new URL("./", import.meta.url).href;

const run = async () => {
  let hid = false; try { hid = sessionStorage.getItem("holiday-hide") === "1"; } catch (e) { /* storage blocked */ }
  if (hid) return;
  const t = await activeTheme(location.search, base);
  if (!t) return;
  const css = document.createElement("link"); css.rel = "stylesheet"; css.href = base + "site.css"; document.head.append(css);
  const b = document.createElement("aside"); b.className = "holiday-badge"; b.style.setProperty("--holiday", t.accent || "#e8b04a");
  const words = document.createElement("span"); words.textContent = (t.icon ? t.icon + " " : "") + t.greet;
  const x = document.createElement("button"); x.type = "button"; x.setAttribute("aria-label", "Hide"); x.textContent = "×";
  x.onclick = () => { b.remove(); try { sessionStorage.setItem("holiday-hide", "1"); } catch (e) { /* fine */ } };
  b.append(words, x); document.body.append(b);
};

if (document.readyState === "complete") run(); else addEventListener("load", run);
