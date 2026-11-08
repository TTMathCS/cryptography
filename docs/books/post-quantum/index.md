# Post-quantum cryptography

*A book in 18 chapters about the cryptography that replaces RSA and elliptic curves: what a
quantum computer threatens and how that threat is measured, the lattice, hash and code-based
schemes NIST standardized, the ones still under evaluation, the two that fell in 2022, and
how the Internet, and a settlement on Mars, move over to them.*

## Who this book is for

For readers who know the basics of public-key cryptography, at the level of the first
cryptography book on this site, and want to go deep on the new schemes. Book 1's
[Chapter 20](../../book/20-Quantum-Computers.md), [Chapter 21](../../book/21-Lattice-Cryptography.md)
and [Chapter 22](../../book/22-Hash-and-Code-Based.md) are the gentle start: what a qubit is,
learning with errors by hand, Lamport and McEliece. This book picks up from there and goes
all the way to the standards themselves, line by line.

## How the book works

- **Read Part I first.** It sets up the yardsticks (security levels, KEMs, signatures) that
  every later chapter uses. Parts II and III can be read in either order; Part IV needs both.
- **Every chapter opens with a box** listing what you will learn, what you need first and
  which sections are beginner, intermediate or expert.
- **Every chapter builds something.** A toy version of each scheme is written in short
  Python 3.8 or later using only the standard library, run, and checked. Toys teach the
  mathematics; never use them to protect real data.
- **Facts are dated.** Standards are still being written. Where something was true "as of
  November 2026", the page says so; where a fact is unknown or disputed, the page says that
  too.
- **Do the exercises.** Each chapter ends with ten, easy to hard, answers folded underneath.

## Contents

| Part | Chapter | Level |
|---|---|---|
| **I. The threat and the yardsticks** | [1. The quantum threat, measured](01-The-Quantum-Threat-Measured.md) | beginner to intermediate |
| | [2. Security levels and how they are measured](02-Security-Levels.md) | beginner to intermediate |
| | [3. KEMs, signatures and what "secure" means now](03-KEMs-and-Signatures.md) | intermediate |
| | [4. A field guide to hard problems](04-A-Field-Guide-to-Hard-Problems.md) | beginner to intermediate |
| **II. Lattices** | [5. Lattices and their hard problems](05-Lattices-and-Their-Hard-Problems.md) | intermediate |
| | [6. Lattice reduction and the estimator](06-Lattice-Reduction-and-the-Estimator.md) | intermediate to expert |
| | [7. Rings, modules and the number-theoretic transform](07-Rings-Modules-and-the-NTT.md) | intermediate |
| | [8. ML-KEM, FIPS 203](08-ML-KEM.md) | intermediate |
| | [9. ML-DSA, FIPS 204](09-ML-DSA.md) | intermediate |
| | 10. NTRU, Falcon and FN-DSA (coming) | intermediate to expert |
| **III. Hashes, codes and the rest** | 11. Stateful hash-based signatures: LMS and XMSS (coming) | intermediate |
| | 12. SLH-DSA, FIPS 205 (coming) | intermediate |
| | 13. Code-based encryption: McEliece (coming) | intermediate |
| | 14. HQC and BIKE (coming) | intermediate |
| | 15. Multivariate signatures and the on-ramp (coming) | intermediate |
| | 16. Isogenies: SIKE's fall and what lived (coming) | intermediate to expert |
| **IV. Into the real world** | 17. Implementing post-quantum safely (coming) | intermediate |
| | 18. Hybrids and the migration (coming) | intermediate |

Chapters are published in parts of four or five as they are finished and checked.

## Where this book fits

This is book 5 of the cryptography shelf. Book 1, [The cryptography book](../../book/index.md),
is the main road. The cryptanalysis book tells the 2022 breaks of Rainbow and SIKE from the
attacker's side; this book tells them in full from the designer's. The mathematics book
proves the lattice and coding-theory results this book uses, and the protocols book carries
each protocol's own post-quantum details, which Chapter 18 here links to.
