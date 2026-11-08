# The mathematics of cryptography

*A book in 20 chapters about the mathematics underneath every cipher: numbers
and primes, modular arithmetic, groups and fields, elliptic curves, lattices,
probability, information, codes, complexity and quantum algorithms. Each idea is
done by hand on small numbers first, then proved, then coded in a few lines of
Python, then shown where it lives in a real system.*

## Who this book is for

*The cryptography book*, the first book on this site, teaches each cipher and
brings in just enough mathematics to make it work. This book is the other way
round: it teaches the mathematics itself, properly and in order, and shows the
cryptography as the reason to learn it. When you finish it you should be able to
read the "preliminaries" section of a cryptography research paper without
stopping, and to judge for yourself why a scheme is believed secure.

You need school algebra (powers, logarithms, solving an equation) and a little
Python. Nothing else is assumed: proofs, notation and every new idea are
explained when they first appear. Readers who studied mathematics at university
can skim the first sections of each chapter and start at the intermediate ones.

## How the book works

- **Read in order.** Each chapter uses only the ones before it. The Previous /
  Next links at the bottom of every page walk you through.
- **Every chapter opens with a box** saying what you will learn, which chapters
  you need first, and which sections are beginner, intermediate or expert.
- **By hand, then proof, then code.** Each new idea starts with a worked example
  small enough to check on paper. Then comes the general statement and a short
  proof, ending with $\blacksquare$. Then a few lines of Python (3.8 or later,
  standard library only) that you can run; every block in the book has been run
  and its quoted output checked.
- **Do the exercises.** Each chapter ends with *Check yourself*: ten questions
  from easy to hard, each answer folded under the question.
- **Links to the other books.** Chapters link to *The cryptography book* where a
  cipher uses the mathematics, and name the chapters of *Cryptanalysis*, the
  attacker's book, where an attack is carried out in full.

## Contents

| Part | Chapter | Level |
|---|---|---|
| **I. Numbers** | [1. Mathematics for secrets](01-Mathematics-for-Secrets.md) | beginner |
| | [2. Divisibility, primes and factoring](02-Divisibility-Primes-and-Factoring.md) | beginner to intermediate |
| | [3. Modular arithmetic](03-Modular-Arithmetic.md) | beginner to intermediate |
| | [4. Powers, orders and primitive roots](04-Powers-and-Primitive-Roots.md) | beginner to intermediate |
| | [5. Squares and square roots](05-Square-Roots-Mod-p.md) | intermediate |
| | [6. Primality testing and making primes](06-Primality-Testing.md) | intermediate |
| **II. Algebra** | [7. Groups](07-Groups.md) | intermediate |
| | [8. Rings, fields and polynomials](08-Rings-Fields-and-Polynomials.md) | intermediate |
| | [9. Linear algebra over finite fields](09-Linear-Algebra.md) | intermediate |
| | [10. Boolean functions and S-boxes](10-Boolean-Functions-and-S-Boxes.md) | intermediate to expert |
| | 11. Polynomials at work *(coming next)* | intermediate to expert |
| **III. Curves and lattices** | 12. Elliptic curves: the group *(coming)* | intermediate |
| | 13. Elliptic curves: counting points, choosing curves, pairings *(coming)* | expert |
| | 14. Lattices *(coming)* | intermediate to expert |
| | 15. Polynomial rings and learning with errors *(coming)* | expert |
| **IV. Chance, information and codes** | 16. Probability for cryptographers *(coming)* | intermediate |
| | 17. Information and entropy *(coming)* | intermediate |
| | 18. Error-correcting codes *(coming)* | intermediate to expert |
| **V. Hardness** | 19. Complexity, reductions and hard problems *(coming)* | expert |
| | 20. The mathematics of quantum algorithms *(coming)* | expert |

The chapters are published a few at a time; the ones without links are being
written.

## Where each chapter is used

| This book | Used in *The cryptography book* |
|---|---|
| Chapters 2 to 6 (numbers) | [3. The arithmetic of secrets](../../book/03-The-Arithmetic-of-Secrets.md), [12. Diffie-Hellman](../../book/12-Diffie-Hellman.md), [13. RSA](../../book/13-RSA.md), [14. Discrete-log systems](../../book/14-Discrete-Log-Systems.md) |
| Chapters 7 to 11 (algebra) | [7. AES](../../book/07-AES.md), [8. Modes of operation](../../book/08-Modes-of-Operation.md), [6. Block ciphers](../../book/06-Block-Ciphers.md), [23. Advanced protocols](../../book/23-Advanced-Protocols.md) |
| Chapters 12 and 13 (curves) | [15. Elliptic curves](../../book/15-Elliptic-Curves.md) |
| Chapters 14 and 15 (lattices) | [21. Lattice cryptography](../../book/21-Lattice-Cryptography.md) |
| Chapters 16 and 17 (probability, information) | [4. Randomness and perfect secrecy](../../book/04-Randomness-and-Perfect-Secrecy.md), [17. Defining security](../../book/17-Defining-Security.md) |
| Chapter 18 (codes) | [22. Hash- and code-based cryptography](../../book/22-Hash-and-Code-Based.md) |
| Chapters 19 and 20 (hardness, quantum) | [17. Defining security](../../book/17-Defining-Security.md), [20. Quantum computers](../../book/20-Quantum-Computers.md) |
