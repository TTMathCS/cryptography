// Where each page of cryptography.akadian.ca sits on the shared ladder Start, Student, University, Expert, Research.
// reader.js (the same on cs, math and cryptography) draws the badge; only this file differs per site.
// path: the page's path; ch: its chapter number in the book (0 if not a chapter); n: chapters in the book.
window.akadianLevel = function (path, ch, n) {
  if (/\/start\//.test(path)) return "Start";                        // the beginner track
  if (/\/topics\/./.test(path)) return "All";                         // guides: one part per level
  if (/\/book\/\d+-/.test(path) && ch) {
    if (ch <= 2) return "Start";                                       // what it is for, classical ciphers
    if (ch <= 4) return "Student";                                     // arithmetic, randomness
    if (ch <= 16) return "University";                                 // secret-key and public-key
    if (ch <= 22) return "Expert";                                     // security proofs, side channels, protocols, post-quantum
    return "Research";                                                 // advanced protocols
  }
  if (/\/history\/./.test(path) || /\/FAQ\/?$/.test(path)) return "Student";
  if (/\/\d\d-[a-z-]+\/./.test(path) || /\/(protocols|formats|tools)\/./.test(path)) return "Expert";
  return null;
};
