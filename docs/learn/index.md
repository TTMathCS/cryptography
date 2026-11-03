# Start here

*A path through the whole site, from a shift cipher you can do in your head to
lattices and threshold signatures. Read it in order or jump in where you are.*

This site began as a reference: a table of every algorithm SSH, TLS and PKI use.
The pages are still there, but now they sit on a path. Each part builds on the
one before it, and the **Previous / Next** links at the bottom of every page
walk you through in order.

## How the path works

| Part | Level | What you get | You need |
|---|---|---|---|
| **1. The story** | anyone | Four thousand years of secret writing, all over the world, told in ten chapters | nothing |
| **2. First steps** | beginner | What cryptography is for, the old ciphers and how to break them, the one-time pad | school arithmetic |
| **3. The math toolkit** | beginner to intermediate | Modular arithmetic, groups and fields, primes, probability | Part 2 |
| **4. Secret-key cryptography** | intermediate | Block cipher design, AES, ChaCha, modes, MACs, hashes, KDFs, randomness | Part 3 |
| **5. Public-key cryptography** | intermediate | Hard problems, elliptic curves, Diffie-Hellman, RSA, ElGamal, signatures | Part 3 |
| **6. Thinking like a cryptographer** | advanced | Security definitions, proofs by reduction, side channels | Parts 4 and 5 |
| **7. Post-quantum** | advanced | Quantum algorithms, lattices and LWE, ML-KEM, ML-DSA, hash and code-based schemes | Part 6 |
| **8. Advanced primitives** | expert | Secret sharing, threshold signatures, zero-knowledge, MPC, homomorphic encryption | Parts 5 to 7 |
| **9. Real systems** | all levels | How TLS, SSH, Signal, Wi-Fi and the rest put the pieces together; formats and tools | as far as you've got |

The main table on the [home page](../index.md) stays as the quick reference:
every algorithm with its size, standard, release year and status.

## What every algorithm page has

Each algorithm page follows the same plan, so once you've read one you know
where to look on the others:

- **What it is**: the job it does, in a paragraph.
- **The story**: who made it, what for, what problem it solved, where it stands
  today (or why it was retired), and the incidents connected with it.
- **How it works**: the steps, with the formulas.
- **Example (Python)**: a short program you can run. These are toy versions to
  show the math. For real data use a tested library.
- **Going deeper**: closed boxes with worked examples, the full math and proofs.
  Beginners can skip them; experts should open them.
- **Security notes**, **See also** and **References** to the standards and papers.

## Three ways in

- **New to all of it?** Read [The story](../history/index.md) for the big
  picture, then [What cryptography does](What-Cryptography-Does.md). Try every
  "Try it" box; the answers are folded underneath.
- **You program but never studied crypto?** Skim Part 2, read
  [Modular arithmetic](Modular-Arithmetic.md) carefully, then go straight to
  [AES](../04-symmetric-ciphers/AES.md) and [RSA](../02-signatures/RSA.md).
- **You know the basics?** Start at
  [Security definitions](Security-Definitions.md), then
  [Lattices and LWE](Lattices-and-LWE.md), and open every "Going deeper" box.

## A word on running the code

The examples are in Python 3.8 or later and use nothing outside the standard
library unless they say so. They are short on purpose: one idea, a few lines.
Real cryptographic code has to resist timing attacks, bad inputs and much more,
which is why you should never use these toy versions to protect anything.
[Side channels](Side-Channels.md) explains why.
