---
template: home.html
hide:
  - navigation
title: Cryptography
---

# Learn cryptography

<div class="start-band" markdown>

New here? Start with secret codes

Six short lessons, about five minutes each, with something to try on paper. No math needed.

1. [**Why keep secrets?** *hiding and checking*](start/01-Why-Secrets.md)
2. [**The Caesar shift** *make a code wheel*](start/02-Caesar.md)
3. [**Cracking Caesar** *break a code by counting letters*](start/03-Cracking-Caesar.md)
4. [**A code nobody can break** *perfect secrets with dice*](start/04-One-Time-Pad.md)
5. [**Locks and keys** *a secret for someone you never met*](start/05-Locks-and-Keys.md)
6. [**Strong passwords** *roll dice for a password*](start/06-Passwords.md)

[Begin lesson 1 →](start/01-Why-Secrets.md)

</div>

A book in 23 chapters, from no background at all to the
algorithms being standardized now. [Start here](book/index.md) shows the
contents and how to use them; the **Next** link at the foot of every page
takes you through in order.

## Find your level

| Level | For whom | Where to go |
|---|---|---|
| **Beginner** | new to secret codes, young learners, a class | [Start](start/index.md): the six lessons above |
| **Intermediate** | students who want to learn it properly | the [Book](book/index.md), chapters 1 to 16: secret-key and public-key cryptography, built by hand and in code |
| **Expert** | professionals, university and beyond | [Topics](topics/index.md) (SSH, HTTPS, passwords, encrypting files, post-quantum), the [Algorithms](algorithms/index.md) reference and [full table](algorithms/table.md), Book chapters 17 to 23, and [What's new](new.md) for the latest research |

Every page shows its level under the title.

## The book in five parts

1. [Foundations](book/01-What-Cryptography-Is-For.md): what cryptography is
   for, the old ciphers and how they were broken, the arithmetic of secrets,
   randomness and the one-time pad.
2. [Secret-key cryptography](book/05-Stream-Ciphers.md): stream ciphers,
   block ciphers, AES, modes, hash functions, MACs and authenticated
   encryption, passwords and key derivation.
3. [Public-key cryptography](book/12-Diffie-Hellman.md): Diffie-Hellman,
   RSA, discrete-log systems, elliptic curves, certificates and key
   establishment.
4. [Cryptography in practice](book/17-Defining-Security.md): defining
   security, side channels, and real protocols (TLS, SSH, Signal, Wi-Fi).
5. [The frontier](book/20-Quantum-Computers.md): quantum computers, lattices,
   hash-based and code-based schemes, and advanced protocols.

Every chapter starts from a problem, works the answer by hand, codes it,
breaks it and ends with exercises.

## Also here

- [FAQ](FAQ.md): brute force, precomputation, rainbow tables, and why they fail.
- [Encoding and decoding](formats/Encoding.md): hex, Base64, Base32, Base58, Bech32 and URL encoding, and why encoding is not encryption.
