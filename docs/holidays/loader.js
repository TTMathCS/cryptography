// Picks today's holiday theme (holidays/README.md): reads the list, holidays/index.json, with each theme's date, finds the
// switched-on theme whose run takes in the visitor's own date and ends first, and only then reads that one theme's theme.json
// (one small file on most days, instead of every theme's: 2 Nov 2026, for a faster homepage). Gives null when none is on.
// The homepage (holidays/home.js), every page's badge (holidays/site.js) and the campus (blk_holiday.js) use it.
// For testing: ?holiday=<name> (even one switched off), ?holiday=none for no theme, ?date=2026-12-24 to see a day.
import { ends } from "./rules.js";
const get = (u) => fetch(u).then((r) => (r.ok ? r.json() : null)).catch(() => null);

export async function activeTheme(search = "", base = "/holidays/") {
  const q = new URLSearchParams(search), want = q.get("holiday"), at = /^(\d{4})-(\d\d)-(\d\d)$/.exec(q.get("date") || "");
  if (want === "none") return null;
  const idx = await get(base + "index.json");
  if (!idx || !Array.isArray(idx.themes)) return null;
  const n = new Date(), [y, m, d] = at ? [+at[1], +at[2], +at[3]] : [n.getFullYear(), n.getMonth() + 1, n.getDate()];
  // the switched-on theme whose run takes in today and ends first: overlapping holidays follow each other (2 Nov 2026)
  let t = null, best = Infinity;
  for (const x of idx.themes) {
    const e = want ? (x.name === want ? 0 : null) : x.on ? ends(x.date, y, m, d) : null;
    if (e !== null && e < best) { t = x; best = e; }
  }
  if (!t) return null;
  const j = await get(base + t.name + "/theme.json");
  return j && Object.assign(j, { date: t.date, id: t.name, base: base + t.name + "/" });
}
