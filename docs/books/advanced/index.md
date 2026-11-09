# Advanced protocols and privacy

*What cryptography can do beyond hiding and signing, in 19 chapters: share a
key so no one person holds it, prove a fact without showing why it is true,
compute on data nobody may see, vote, pay and talk without being tracked, and
agree on a shared record with strangers. Each chapter works one protocol by hand
with small numbers, codes a working toy, shows how real deployments broke, and
ends with where the idea is used today.*

## What this book is

[The cryptography book](../../book/index.md) builds the pieces: ciphers, hashes,
signatures, key exchange. Its last chapter,
[Advanced protocols](../../book/23-Advanced-Protocols.md), is a one-chapter tour
of the ideas in this book. Here each idea gets the full treatment.

Most of cryptography protects a message from outsiders. The protocols in this
book solve a harder kind of problem: the people taking part do not fully trust
each other. A city wants six wardens to hold its master key so that no single
one can open the vault. A hospital wants to learn an average without seeing
anyone's record. A voter wants to check that their ballot was counted without
being able to prove to anyone how they voted. A thousand strangers want to agree
on who paid whom without a bank in the middle. Each of these looked impossible
once, and each has a protocol that does it, with a cost and a set of
assumptions that this book spells out.

It is written for readers who know the basics (a hash, a signature, modular
arithmetic, Diffie-Hellman) and want to understand the tools behind
zero-knowledge proofs, threshold wallets, private contact discovery,
encrypted machine learning, Tor, election verification, blockchains and
privacy statistics, from first idea to current research.

## How the book works

- **Read Chapter 1 first.** [Chapter 1](01-Computing-With-Secrets.md) sets up
  the words the whole book uses: parties, trust models, the ideal world and the
  simulator, and the different things "private" can mean. After that the parts
  can be read in any order, though each part builds on its own first chapter.
- **Every chapter opens with a box** saying what you'll learn, which chapters
  (in this book, the cryptography book or a sister book) you need first, and
  which sections are beginner, intermediate or expert.
- **The problem comes first.** Each protocol starts from what the parties want
  and what they will not reveal, then the idea, then a run by hand with real
  numbers, then the full method and why it is correct.
- **Run the protocols.** Every example is short Python 3.8 or later, standard
  library only, in groups and fields small enough to follow by hand. Real
  systems use 256-bit groups or elliptic curves; the steps are the same.
- **The history is part of the story.** Each named scheme or incident has a
  "Life story" card: when it was born, what it was for, what it made possible,
  and where it stands. Where a date or a figure is disputed, the text says so.
- **Check yourself.** Each chapter ends with 8 to 10 questions, easy to hard,
  with the answers folded underneath, then a summary and a reading list of the
  original papers.

## Contents

| Part | Chapter | Level |
|---|---|---|
| **I. Sharing and committing** | [1. Computing with secrets](01-Computing-With-Secrets.md) | beginner |
| | [2. Secret sharing](02-Secret-Sharing.md) | beginner to intermediate |
| | [3. Commitments and coin flipping](03-Commitments.md) | beginner to intermediate |
| | [4. Threshold cryptography and shared randomness](04-Threshold-Cryptography.md) | intermediate to expert |
| **II. Proving without revealing** | [5. Zero-knowledge proofs](05-Zero-Knowledge-Proofs.md) | intermediate |
| | [6. Sigma protocols and Fiat-Shamir](06-Sigma-Protocols-and-Fiat-Shamir.md) | intermediate |
| | [7. SNARKs: short proofs about any computation](07-SNARKs.md) | expert |
| | [8. STARKs, Bulletproofs and recursion](08-STARKs-Bulletproofs-and-Recursion.md) | expert |
| **III. Computing on hidden data** | [9. Oblivious transfer and garbled circuits](09-Oblivious-Transfer-and-Garbled-Circuits.md) | intermediate |
| | [10. Multi-party computation in practice](10-Multi-Party-Computation-in-Practice.md) | intermediate to expert |
| | [11. Private set intersection, OPRFs and private information retrieval](11-Private-Set-Intersection-OPRFs-and-PIR.md) | intermediate |
| | [12. Homomorphic encryption](12-Homomorphic-Encryption.md) | intermediate to expert |
| | [13. Identity-based, attribute-based and functional encryption](13-Identity-Attribute-and-Functional-Encryption.md) | intermediate to expert |
| **IV. Privacy for people** | [14. Blind signatures and anonymous credentials](14-Blind-Signatures-and-Anonymous-Credentials.md) | intermediate |
| | [15. Anonymous communication: mixes, onion routing and Tor](15-Anonymous-Communication.md) | intermediate |
| | [16. Electronic voting](16-Electronic-Voting.md) | intermediate |
| | [17. Consensus and smart contracts](17-Consensus-and-Smart-Contracts.md) | intermediate |
| | [18. Privacy on ledgers, and its limits](18-Privacy-on-Ledgers.md) | intermediate |
| | [19. Differential privacy and private statistics](19-Differential-Privacy.md) | beginner to intermediate |

The [Glossary](Glossary.md) defines 240 terms, each with a link to the section that teaches it.

## Three ways in

- **New to these ideas?** Read Part I in order: [Chapter 1](01-Computing-With-Secrets.md)
  to [Chapter 4](04-Threshold-Cryptography.md). You need Chapters 3 and 12 of
  the cryptography book (modular arithmetic and Diffie-Hellman).
- **Here for zero-knowledge?** Read Chapter 1 and
  [Chapter 3](03-Commitments.md), then Part II in order.
- **Here for privacy in everyday systems?** Read Chapter 1, then Part IV:
  credentials, Tor, voting, ledgers and private statistics. Each chapter there
  points back to the tools it borrows from Parts I to III.

## The sister books

- [Protocols](../protocols/index.md) is the home of the everyday secure channels
  (TLS, SSH, Signal, MLS), password-authenticated key exchange and the Bitcoin
  protocol itself. This book picks up where those stop: consensus, smart
  contracts, privacy coins, anonymity networks.
- [The mathematics of cryptography](../mathematics/index.md) proves what this
  book uses: polynomial interpolation, pairings, lattices and learning with
  errors.
- [Post-quantum cryptography](../post-quantum/index.md) builds the lattice and
  hash-based schemes; this book says which advanced tools survive a quantum
  computer.
- [Cryptanalysis](../cryptanalysis/index.md) has the attack mathematics behind
  the incidents told here.

## Arcadia City

The examples often come back to Arcadia City, a settlement on Mars imagined on
this site, three to twenty-two minutes of light delay from Earth. A small,
closed town with its own council, clinics and records, linked to a home planet
it cannot fully trust or quickly reach, needs almost every tool in this book:
shared keys for its vault, fair lotteries, private medical statistics, an
election everyone can check.
