# Cryptanalysis: how ciphers are broken

*The attacker's book, in 20 chapters: from counting letters in a ninth-century
ciphertext to lattice reduction, side channels and the 2022 breaks of
post-quantum candidates. Each chapter takes one family of attacks, does it by
hand on a small example, codes it, and then tells how it was used on real
systems, with the dates, costs and people.*

## What this book is

[The cryptography book](../../book/index.md) shows how each cipher, hash and
protocol is built, and closes each chapter with a short "Break it". This book
turns that section into the subject. It teaches the breaking itself: how an
attacker thinks, what they measure, and the methods that have opened ciphers for
twelve centuries, from al-Kindi's frequency analysis and Rejewski's permutations
to differential and linear cryptanalysis, Wang's hash collisions, the number field
sieve, Coppersmith's method, and the timing and power measurements that read keys
out of chips.

It is written for readers who have met the systems and want to know how they
fail: students, programmers, security engineers, and anyone who has read "AES is
unbroken" or "SHA-1 is broken" and wondered what exactly those sentences mean.
Every chapter links to the chapter of the cryptography book that builds the
system under attack, so you can read the two side by side.

## How the book works

- **Read Part I first.** [Chapter 1](01-What-Cryptanalysis-Is.md) sets the rules
  the whole book uses: attack models, the three costs of an attack, and what
  counts as a break. After Part I the parts can be read in any order.
- **Every chapter opens with a box** saying what you'll learn, which chapters
  (in this book or the cryptography book) you need first, and which sections are
  beginner, intermediate or expert.
- **The problem comes first.** Each attack starts from what the attacker has and
  wants, then the idea, then a worked example with real numbers, then the full
  method with the math it needs.
- **Run the attacks.** Every example is short Python 3.8 or later, standard
  library only, on toy versions small enough to break in seconds. They show the
  method; they are not tools for attacking anyone's systems.
- **The history is part of the story.** Each named attack has a "Life story"
  card: when it was born, what it was for, what it broke, and where it stands.
  Where a date or a number is disputed or was kept secret, the text says so.
- **Check yourself.** Each chapter ends with 8 to 10 questions, easy to hard,
  with the answers folded underneath, then a summary and a reading list of the
  original papers.

## Contents

| Part | Chapter | Level |
|---|---|---|
| **I. The craft** | [1. What cryptanalysis is](01-What-Cryptanalysis-Is.md) | beginner |
| | [2. Breaking classical ciphers](02-Breaking-Classical-Ciphers.md) | beginner |
| | [3. Machines and the war](03-Machines-and-the-War.md) | beginner to intermediate |
| | [4. Brute force, birthdays and trade-offs](04-Brute-Force-Birthdays-and-Trade-offs.md) | intermediate |
| **II. Breaking secret-key cryptography** | [5. Differential cryptanalysis](05-Differential-Cryptanalysis.md) | intermediate to expert |
| | [6. Linear cryptanalysis and its relatives](06-Linear-Cryptanalysis.md) | intermediate to expert |
| | [7. Algebraic, integral and structural attacks](07-Algebraic-Integral-and-Structural-Attacks.md) | expert |
| | [8. Attacks on stream ciphers](08-Attacks-on-Stream-Ciphers.md) | intermediate to expert |
| | [9. Breaking hash functions](09-Breaking-Hash-Functions.md) | intermediate to expert |
| | [10. Attacks on modes and message authentication](10-Attacks-on-Modes-and-MACs.md) | intermediate |
| **III. Breaking public-key cryptography** | 11. Factoring | intermediate |
| | 12. Discrete logarithms | intermediate to expert |
| | 13. Attacks on RSA | intermediate to expert |
| | 14. Attacks on signatures and nonces | intermediate to expert |
| | 15. Lattices as a weapon | expert |
| | 16. Breaking post-quantum candidates | expert |
| **IV. Breaking implementations and systems** | 17. Side channels, the attacker's view | intermediate to expert |
| | 18. Random numbers gone wrong | intermediate |
| | 19. Protocol breaks | intermediate |
| | 20. Where cryptanalysis goes | intermediate |

## Three ways in

- **New to cryptanalysis?** Read [Chapter 1](01-What-Cryptanalysis-Is.md) to
  [Chapter 4](04-Brute-Force-Birthdays-and-Trade-offs.md) in order. You need
  Chapters 1 and 2 of the cryptography book and school arithmetic.
- **You know how ciphers are built?** Read Chapter 1, then go to the part that
  attacks what you use: Part II for block ciphers, stream ciphers, hashes and
  modes; Part III for RSA, Diffie-Hellman, elliptic curves and post-quantum
  schemes; Part IV for the implementations.
- **You build or review real systems?** Start with Part IV. Most keys that are
  stolen in practice are lost to side channels, bad random numbers and protocol
  mistakes, not to clever mathematics, and those chapters say how.

**Look things up:** the glossary for every term of the trade, and
[the cryptography book](../../book/index.md), book 1, for how each system is built.
