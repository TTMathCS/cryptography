# Start here

*A book in 23 chapters, from a shift cipher you can do in your head to lattices
and zero-knowledge proofs. Each chapter starts from a problem, teaches the math
it needs on the spot, builds the answer by hand, codes it, breaks it, and ends
with exercises.*

## How the book works

- **Read in order.** Each chapter assumes only the ones before it. The
  **Previous / Next** links at the bottom of every page walk you through.
- **Every chapter opens with a box** saying what you'll learn, which chapters
  you need first, and which sections are beginner, intermediate or expert.
- **Levels inside a chapter.** The first sections need nothing but the earlier
  chapters. Sections marked *Level: intermediate* or *Level: expert* go
  further; skip them on a first read and come back later.
- **Do the exercises.** They run from easy to hard. Each answer is folded
  under the question; try first, then open it.
- **Run the code.** Every example is short Python 3.8 or later, using only the
  standard library unless it says otherwise. These are toy versions to show
  the math, never to protect real data.
- **The reference is under Topics.** The [Algorithm reference](../algorithms/index.md)
  has one page per algorithm with sizes, standards, status and closed "Going
  deeper" boxes; [Protocols, formats and tools](../protocols/index.md) covers the
  rest. The [history of secret writing](../history/index.md), next to this book
  under Books, tells the whole story. The chapters link to them.

## Contents

| Part | Chapter | Level |
|---|---|---|
| **I. Foundations** | [1. What cryptography is for](01-What-Cryptography-Is-For.md) | beginner |
| | [2. Classical ciphers and how they were broken](02-Classical-Ciphers.md) | beginner |
| | [3. The arithmetic of secrets](03-The-Arithmetic-of-Secrets.md) | beginner to intermediate |
| | [4. Randomness and perfect secrecy](04-Randomness-and-Perfect-Secrecy.md) | beginner to intermediate |
| **II. Secret-key cryptography** | [5. Stream ciphers](05-Stream-Ciphers.md) | intermediate |
| | [6. Block ciphers](06-Block-Ciphers.md) | intermediate |
| | [7. AES](07-AES.md) | intermediate |
| | [8. Modes of operation](08-Modes-of-Operation.md) | intermediate |
| | [9. Hash functions](09-Hash-Functions.md) | intermediate |
| | [10. Message authentication](10-Message-Authentication.md) | intermediate |
| | [11. Passwords and key derivation](11-Passwords-and-Key-Derivation.md) | intermediate |
| **III. Public-key cryptography** | [12. Diffie-Hellman](12-Diffie-Hellman.md) | intermediate |
| | [13. RSA](13-RSA.md) | intermediate |
| | [14. Discrete-log systems](14-Discrete-Log-Systems.md) | intermediate to advanced |
| | [15. Elliptic curves](15-Elliptic-Curves.md) | intermediate to advanced |
| | [16. PKI and key establishment](16-PKI-and-Key-Establishment.md) | intermediate |
| **IV. Cryptography in practice** | [17. Defining security](17-Defining-Security.md) | advanced |
| | [18. Side channels](18-Side-Channels.md) | advanced |
| | [19. Protocols](19-Protocols.md) | intermediate to advanced |
| **V. The frontier** | [20. Quantum computers](20-Quantum-Computers.md) | advanced |
| | [21. Lattice cryptography](21-Lattice-Cryptography.md) | advanced to expert |
| | [22. Hash-based and code-based schemes](22-Hash-and-Code-Based.md) | advanced to expert |
| | [23. Advanced protocols](23-Advanced-Protocols.md) | expert |

**Look things up:** the [algorithm table](../index.md) with every algorithm's
size, standard, year and status; the [algorithm reference](../algorithms/index.md),
one page per algorithm; the [protocols](../protocols/index.md),
[formats](../formats/Encoding.md) and [tools](../tools/openssl.md); the full
[world history of cryptography](../history/index.md); the [glossary](Glossary.md); and the [FAQ](../FAQ.md).

## Three ways in

- **New to all of it?** Start at [Chapter 1](01-What-Cryptography-Is-For.md)
  and read straight through Part I. You need school arithmetic and nothing
  else.
- **You program but never studied cryptography?** Skim Chapters 1 and 2, read
  [Chapter 3](03-The-Arithmetic-of-Secrets.md) carefully, then go on in order.
- **You know the basics?** Jump to [Part IV](17-Defining-Security.md) and open
  every *Level: expert* section on the way back through the book.
