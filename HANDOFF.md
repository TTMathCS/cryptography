# Handoff: turning the site into a tutorial book

Written 3 November 2026 for whoever picks this up next. Read all of it before
changing anything.

## The goal

Jim wants cryptography.akadian.ca to be a **tutorial from beginner to expert**,
written the way a textbook is written, not a reference. His words, in order:

- "re org it like a tutorial, you can start from the history ... with details on
  history facts and details of each algo, with its math foundations"
- for every algorithm: "who created it, for what purpose, what issue was solved
  because of it, and why it is deprecated for what reason, and any accident
  related to the issues"
- "a tutorial explain and teach things from easy, and gradually to very deep",
  "and covers complete aspects"
- "not for a specific algo. but from structure side you are not in the right
  direction. you can reference how a tutorial book is written"

The last point is the important one. The site is still one page per algorithm,
grouped by category. That is a reference layout, even with lessons added. It
has to become a **book of chapters** where each chapter teaches an idea and
brings in algorithms as the answers to problems the chapter has just raised.

## Where things stand

Done and live (commits `e9cdf48`, `2ee1362`):

- Every algorithm page (63 of them, in `docs/0*` and `docs/1*`) has a
  `## The story` section: who made it, what for, what it solved, where it stands
  or why it was retired, incidents. Subheadings in those sections carry
  `{#story-...}` ids so they don't steal anchors like `#rc4` from the page.
- Eleven lessons in `docs/learn/` plus a Start here page (`learn/index.md`):
  What cryptography does, Classical ciphers, One-time pad, Modular arithmetic,
  Groups and fields, Probability and security levels, Block cipher design,
  Security definitions, Side channels, Quantum computing, Lattices and LWE. All
  their Python runs and the quoted outputs match.
- `mkdocs.yml` nav is a nine-part course; `navigation.footer` gives
  Previous/Next links; the home hero says "Start learning".

In the last commit of this handoff:

- `docs/02-signatures/RSA.md` rewritten as a lesson (the problem, the idea, by
  hand, why it works, code it, break it, real world, exercises, what you
  learned, reference at the end). Jim said keep it. Treat it as a draft of one
  **section** of the RSA chapter, not as the model for the book's structure.
- Two links that pointed at `RSA.md#going-deeper` now point at
  `RSA.md#3-build-it-by-hand`.

Not done: everything in the plan below.

## Status, 3 November 2026 (later the same day)

The book is written and live. All 23 chapters are in `docs/book/` with the
layout below (opening box, numbered sections with level tags, by hand, code,
break it, real world, going deeper, exercises with folded answers, what you
learned, further reading), plus `docs/book/index.md` (Start here, the
contents) and `docs/book/Glossary.md`. Decisions taken and told to Jim:

- History option B: each chapter opens with its own history; `docs/history/`
  is Appendix E.
- The 63 algorithm pages stay at their URLs as Appendix A (algorithm
  reference), so no redirects were needed for them. Protocols, formats and
  tools are Appendices B to D, the glossary F.
- The `docs/learn/` lessons were folded into the chapters; each old lesson
  URL now forwards to its chapter through `overrides/redirect.html`
  (front matter `template: redirect.html`, `redirect: book/...`), so no
  plugin was added.

Next: Jim's review of the chapters; fact spot-checks flagged by the writers
are in the website lane thread.

## The agreed plan: a book in five parts

Jim said "ok" to this outline.

**Part I: Foundations**

1. What cryptography is for (goals, Kerckhoffs, attack models, a history overview)
2. Classical ciphers and how they were broken
3. The arithmetic of secrets (modular arithmetic, primes, Euclid)
4. Randomness and perfect secrecy (probability, entropy, the one-time pad, random generators)

**Part II: Secret-key cryptography**

5. Stream ciphers (from the pad to RC4 and its failure, then ChaCha20)
6. Block ciphers: design principles, with DES as the case study
7. AES (finite fields taught inside the chapter)
8. Using a block cipher: modes of operation
9. Hash functions (MD5 and SHA-1's fall, SHA-2, SHA-3, BLAKE)
10. Message authentication and authenticated encryption (HMAC, CMAC, Poly1305, GCM)
11. Passwords and key derivation

**Part III: Public-key cryptography**

12. The key distribution problem and Diffie-Hellman (groups taught here)
13. RSA
14. Discrete-log systems: ElGamal, DSA, Schnorr
15. Elliptic curves: ECDH, ECDSA, EdDSA
16. Certificates, PKI and key establishment (X.509, HPKE, PAKE)

**Part IV: Cryptography in practice**

17. Defining and proving security
18. Side channels and implementation attacks
19. Protocols as case studies: TLS, SSH, Signal, Wi-Fi

**Part V: The frontier**

20. Quantum computers and what they break
21. Lattice cryptography: ML-KEM, ML-DSA, FN-DSA
22. Hash-based and code-based schemes
23. Advanced protocols: secret sharing, commitments, zero-knowledge, MPC, homomorphic encryption

**Appendices:** A. algorithm tables and status (the current home page table),
B. standards, C. tools (openssl, ssh-keygen, gpg, age, keytool), D. formats
(encoding, ASN.1, X.509, file formats), E. detailed world history of
cryptography (the current ten chapters in `docs/history/`).

## Open decisions: ask Jim first

1. **History.** Option A: keep the ten history chapters as Part 0 at the front
   (he once said "you can start from the history"). Option B: open each chapter
   with its own history and keep the full history as Appendix E. B was
   recommended to him; he hasn't chosen.
2. **Order of work.** Recommended: write Part I, publish, let Jim review the
   style, then do the rest. He hasn't confirmed.

## How a chapter should be written

This is how tutorial books (Paar and Pelzl's *Understanding Cryptography*,
Aumasson's *Serious Cryptography*, Wong's *Real-World Cryptography*) are laid out.
Copy the layout, never their text.

- **Numbered chapter, numbered sections** (`# 7. AES`, `## 7.1 ...`). Readers go
  in order; each chapter assumes only the ones before it.
- **Opening:** what you'll learn, why it matters, what you need first.
- **Start from the simplest version of the problem** and build up. Algorithms
  appear as solutions: the weakness of one motivates the next (DES's key
  length leads to AES; one block leads to modes; ECB's patterns lead to CBC and
  CTR; malleability leads to MACs and AEAD).
- **Math is taught where it's first needed**, inside the chapter (GF(2^8) in the
  AES chapter, groups in the Diffie-Hellman chapter), not in a separate section.
- **Easy to very deep inside each chapter:** plain idea, worked example by hand,
  full algorithm and why it's correct, code, attacks and fixes, real-world use
  and incidents, then expert material (proofs, best attacks, parameter choices).
- **History told as part of the story**, not as a bullet list. The current
  `## The story` bullets are raw material to rewrite as prose.
- **End of chapter:** lessons learned, exercises from easy to hard (answers in
  `??? question` boxes), history and further reading.
- **Status tables, standards and sizes** belong in the appendices, linked from
  the chapter.
- "Complete aspects": every chapter covers history, math, how it works,
  implementation, attacks, correct use and parameters, standards and status,
  and where it's used.

## Moving the content

- Nothing is thrown away. The algorithm pages, `docs/learn/` lessons, FAQ and
  history hold the math, worked examples, code, stories and incidents; move
  each piece into the chapter where it's taught.
- Suggested layout: `docs/book/01-What-Cryptography-Is-For.md` and so on, one file
  per chapter (split a very long chapter into section files in a folder),
  `docs/appendix/...` for the appendices.
- **Old URLs must keep working.** Many external links point at pages like
  `02-signatures/RSA/`. Add the `mkdocs-redirects` plugin (and add it to the
  `pip install` line in `.github/workflows/pages.yml`) with a `redirect_maps`
  entry for every old page.
- The home page anchors (`index.md#1-key-exchange` and so on) are linked from
  about 200 places. If the table moves to Appendix A, update those links with
  a script, then check with `--strict`.

## Rules for writing (from Jim's instructions)

- Write like a person, plain and direct. No AI-sounding phrases, no filler, no
  hype. Comments in code read the same way.
- Code: Python 3.8+, standard library unless stated, short and simple
  (competitive-programming style), the most efficient algorithm that stays
  readable. **Never `sys.stdin`, `sys.stdout` or any `sys.std*`**; use `input()`
  and `print()`.
- Run every code block before publishing and make sure any output quoted on the
  page matches what the code prints.
- US spelling (the site uses "standardized", "behavior").
- **History covers the whole world**: China, India, Persia, the Islamic world,
  Byzantium, Japan, Korea, Africa, the Americas, Russia and others, each given
  its due, not Europe with side trips. Where sources are thin, say so on the page.
- Facts: the story sections and lessons were written from memory and spot
  checked. Check dates and numbers against sources as chapters are written.
- Math typeset with `$...$` and `$$...$$` (KaTeX through `pymdownx.arithmatex`).

## Technical notes

- Build: `python3 -m venv .venv && ./.venv/bin/pip install "mkdocs-material>=9.6,<9.7"`,
  then `./.venv/bin/mkdocs build --strict`. Strict fails on any broken link or
  anchor, which is the check to rely on. `.venv/` is excluded locally in
  `.git/info/exclude`, not in `.gitignore`.
- Preview: `./.venv/bin/mkdocs serve -a 127.0.0.1:8765`.
- **A push to `main` publishes at once** (GitHub Pages workflow
  `.github/workflows/pages.yml`). Jim asked for direct pushes to `main` for
  this work; still tell him what is about to go live.
- Commits: author `Jim C <cntourit@gmail.com>` (`git config user.name/user.email` in the clone); the Claude
  model trailer lines may follow (Jim, 8 Nov 2026; Mars-Requirements RULES.md).
- Commits without permission prompts (Jim is tired of them, 8 Nov 2026): write the commit message to a file with
  the Write tool, then run plain, separate commands, no `&&` chains, redirects or heredocs: `git add <paths>`;
  `git -c user.name="Jim C" -c user.email=cntourit@gmail.com commit -q -F /path/msg.txt`; `git pull --rebase origin
  main`; `git push origin HEAD:main`. The tracked `hooks/__pycache__/*.pyc` changes on every build; `git checkout
  hooks/__pycache__/` before the pull.
- `hooks/standard_links.py` turns names like "RFC 8446" or "FIPS 197" into links
  at build time; NIST names must be in `hooks/standards.json`, and
  `tools/check-standards.sh` lists missing ones.
- Widgets: `<div class="mars-modexp" data-base="65" data-exp="17" data-mod="3233"
  data-label="...">` (step-by-step modular powers) and
  `<div class="mars-steps" markdown>` around an ordered list (step-through box).
  Both do nothing until the reader presses Play or Step.
- `tools/sync-from-mars.sh` syncs fonts and holiday themes from akadian.ca;
  don't edit those files by hand.

## The shelf, 8 November 2026: eight books

Jim chose (8 Nov 2026) to complete cryptography first, one subject at a time, deep until complete. This book stays
as book 1, the main road. Seven more books follow, one at a time, each about 20 chapters in the same format, under
`docs/books/<slug>/` (this book keeps `docs/book/`), listed under `Books:` in `mkdocs.yml` after it:

2. Cryptanalysis: how ciphers are broken (`books/cryptanalysis/`, 20)
3. The mathematics of cryptography (`books/mathematics/`, 20)
4. Protocols (`books/protocols/`, 20; the pages in `docs/protocols/` fold in and redirect)
5. Post-quantum cryptography (`books/post-quantum/`, 18)
6. Advanced protocols and privacy (`books/advanced/`, 18)
7. Cryptographic engineering (`books/engineering/`, 18; `docs/formats/` and `docs/tools/` fold in)
8. History of cryptography (`books/history/`, 20; the ten pages in `docs/history/` become its chapters)

The brief every writer follows and one outline per book are in the project files, `cryptography/books/`
(`book-brief.md`, `cryptanalysis-outline.md`, ...). The requirements log is Mars-Requirements
`site/review/2026-11-08-school-books.md`. Pace: a part of 4 to 5 chapters at a time, published when
`mkdocs build --strict` is clean and every code block has run; about one book a week, starting after Jim's weekly
budget resets on 9 Nov 2026.
