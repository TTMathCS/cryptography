// The date rules of the holiday themes (holidays/README.md). A theme's "date" in its theme.json names its holiday, a fixed
// day {"on": "10-31"} or a moving Ontario holiday {"day": "thanksgiving"} (the list below), and the theme is on from LEAD
// days before it through the day itself (Jim, 26 Oct 2026: "themes should be switched 1 week before the holiday ... so it
// is celebrated for a week"). A theme may change that: "lead" (days before) and "after" (days after, 0 when not given).
export const LEAD = 7;
export const day = (y, m, d) => Date.UTC(y, m - 1, d) / 864e5;                 // a date as a whole day number: no time zones
const dow = (y, m, d) => new Date(Date.UTC(y, m - 1, d)).getUTCDay();       // 0 Sunday ... 6 Saturday
const monday = (y, m, n) => day(y, m, 1 + ((8 - dow(y, m, 1)) % 7) + 7 * (n - 1));   // the n-th Monday of a month

// Easter Sunday (the Gregorian rule, Meeus/Jones/Butcher)
function easter(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451), n = h + l - 7 * m + 114;
  return day(y, Math.floor(n / 31), (n % 31) + 1);
}

export const DAYS = {
  family: (y) => monday(y, 2, 3),                              // Family Day: the third Monday of February
  easter,                                                       // Good Friday is easter - 2, Easter Monday easter + 1
  victoria: (y) => day(y, 5, 24 - ((dow(y, 5, 24) + 6) % 7)),   // Victoria Day: the Monday on or before 24 May
  civic: (y) => monday(y, 8, 1),                                // the Civic Holiday: the first Monday of August
  labour: (y) => monday(y, 9, 1),                               // Labour Day: the first Monday of September
  thanksgiving: (y) => monday(y, 10, 2),                        // Thanksgiving: the second Monday of October
};

// whether a theme's date rule takes in this date (year, month 1-12, day)
export function matches(rule, y, m, d) {
  if (!rule) return false;
  const t = day(y, m, d), lead = rule.lead ?? LEAD, after = rule.after || 0, on = /^(\d\d)-(\d\d)$/.exec(rule.on || "");
  return [y - 1, y, y + 1].some((s) => {
    const c = on ? day(s, +on[1], +on[2]) : DAYS[rule.day] ? DAYS[rule.day](s) : NaN;
    return t >= c - lead && t <= c + after;
  });
}
