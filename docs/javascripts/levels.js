// Where each page of cryptography.akadian.ca sits on the shared ladder Beginner, Intermediate, Expert.
// reader.js (the same on cs, math and cryptography) draws the badge; only this file differs per site.
// path: the page's path; ch: its chapter number in the book (0 if not a chapter); n: chapters in the book.
window.akadianLevel = function (path, ch, n) {
  if (/\/start\//.test(path)) return "Beginner";                        // the beginner track
  if (/\/topics\/./.test(path)) return "All";                         // guides: one part per level
  if (/\/book\/\d+-/.test(path) && ch) {
    if (ch <= 2) return "Beginner";                                       // what it is for, classical ciphers
    if (ch <= 16) return "Intermediate";                               // arithmetic to public-key
    return "Expert";                                                   // security proofs, protocols, post-quantum, research
  }
  if (/\/history\/./.test(path) || /\/FAQ\/?$/.test(path)) return "Intermediate";
  if (/\/\d\d-[a-z-]+\/./.test(path) || /\/(protocols|formats|tools)\/./.test(path)) return "Expert";
  return null;
};
