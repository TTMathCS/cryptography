// Picks today's holiday theme (holidays/README.md): reads the list, holidays/index.json, then each switched-on theme's
// theme.json, and gives the first whose date takes in the visitor's own date, or null. The homepage (holidays/home.js)
// and the campus (myarcadia/site-ttmath, blk_holiday.js) both use it. For testing: ?holiday=<name> (even one switched off),
// ?holiday=none for no theme, ?date=2026-12-24 to see a day.
import { matches } from "./rules.js";
const get = (u) => fetch(u).then((r) => (r.ok ? r.json() : null)).catch(() => null);

export async function activeTheme(search = "", base = "/holidays/") {
  const q = new URLSearchParams(search), want = q.get("holiday"), at = /^(\d{4})-(\d\d)-(\d\d)$/.exec(q.get("date") || "");
  if (want === "none") return null;
  const idx = await get(base + "index.json");
  if (!idx || !Array.isArray(idx.themes)) return null;
  const list = idx.themes.filter((t) => (want ? t.name === want : t.on));
  const themes = await Promise.all(list.map((t) => get(base + t.name + "/theme.json").then((j) => j && Object.assign(j, { id: t.name, base: base + t.name + "/" }))));
  if (want) return themes[0] || null;
  const n = new Date(), [y, m, d] = at ? [+at[1], +at[2], +at[3]] : [n.getFullYear(), n.getMonth() + 1, n.getDate()];
  return themes.find((t) => t && matches(t.date, y, m, d)) || null;
}
