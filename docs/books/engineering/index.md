# Cryptographic engineering

*The builder's and defender's book, in 18 chapters: how a correct algorithm
becomes a safe program, and how that program is run for years. Bytes and
encodings, random numbers, constant-time code, masking, hostile input, APIs that
are hard to misuse, keys and the hardware that guards them, secrets in
operations, passwords on the server, encrypted data, the command-line tools,
signed software, testing and verification, and what to do when something
breaks.*

## What this book is

[The cryptography book](../../book/index.md) explains how each cipher, hash and
signature works. [Cryptanalysis](../cryptanalysis/index.md) shows how they are
broken, and [Protocols](../protocols/index.md) shows how they are put together
on the wire. This book is about everything around them: the code that
implements an algorithm, the library that wraps it, the interface a programmer
calls, the keys and passwords a system keeps, and the people who run it.

That is where most real failures happen. The mathematics of AES, SHA-256 and
elliptic curves has held for decades, while Heartbleed, the PlayStation 3
signing key, a Microsoft signing key found in a crash dump and thousands of
keys pasted into public code repositories all failed in the engineering. Each
chapter here starts from failures like these, builds the safe version, and shows
the broken version beside it.

It is written for programmers, students and anyone who builds or looks after
systems that use cryptography: people who will never design a cipher but will
call one every day. You need to know what a block cipher, a hash and a
signature are; [the cryptography book](../../book/index.md) teaches that.

## How the book works

- **Read chapter 1 first.** [Chapter 1](01-What-Cryptographic-Engineering-Is.md)
  sets out the layers where cryptography fails in practice and the principles
  the rest of the book uses. After it, each part can be read on its own.
- **Every chapter opens with a box** saying what you'll learn, which chapters
  (in this book or another book on the shelf) you need first, and which sections
  are beginner, intermediate or expert.
- **Break it, then fix it.** Each mistake is shown as working code that goes
  wrong, then as the code that does not. The examples are short Python 3.8 or
  later, standard library only. Python is not how production cryptography is
  written (it cannot be made constant time, for one thing), so where the real
  code is C or Rust the chapter says so and shows the shape of it.
- **Real incidents, with sources.** Each named incident, library and standard
  has a "Life story" card: when it was born, what it was for, what it helped or
  broke, and where it stands. Dates and numbers are checked against the sources
  listed at the end of each chapter; where a figure is disputed or was never
  published, the text says so.
- **What to do.** The main sections end with a short practical list.
- **Check yourself.** Each chapter ends with 8 to 10 questions, easy to hard,
  with the answers folded underneath, then a summary and a reading list.

## Contents

| Part | Chapter | Level |
|---|---|---|
| **I. Bytes and randomness** | [1. What cryptographic engineering is](01-What-Cryptographic-Engineering-Is.md) | beginner |
| | [2. Bytes, encodings and text](02-Bytes-Encodings-and-Text.md) | beginner to intermediate |
| | [3. ASN.1, DER and key files](03-ASN1-DER-and-Key-Files.md) | intermediate |
| | [4. Randomness in practice](04-Randomness-in-Practice.md) | intermediate |
| **II. Writing it safely** | [5. Constant-time programming](05-Constant-Time-Programming.md) | intermediate to expert |
| | [6. Big numbers and public-key code](06-Big-Numbers-and-Public-Key-Code.md) | intermediate to expert |
| | [7. Masking and fault resistance](07-Masking-and-Fault-Resistance.md) | expert |
| | [8. Hostile input: memory, parsing and denial of service](08-Hostile-Input.md) | intermediate |
| | [9. APIs that resist misuse](09-APIs-That-Resist-Misuse.md) | intermediate |
| **III. Keys and secrets** | [10. The life of a key](10-The-Life-of-a-Key.md) | intermediate |
| | [11. Hardware for keys: HSMs, TPMs, enclaves and tokens](11-Hardware-for-Keys.md) | intermediate |
| | [12. Secrets in operations](12-Secrets-in-Operations.md) | beginner to intermediate |
| | [13. Passwords on the server](13-Passwords-on-the-Server.md) | beginner to intermediate |
| **IV. Building and running systems** | 14. Encrypting application data | intermediate |
| | 15. The command-line tools | beginner to intermediate |
| | 16. Signing software and the supply chain | intermediate |
| | 17. Choosing, testing and verifying | intermediate to expert |
| | 18. Running cryptography for years | intermediate |

The glossary collects the terms of the whole book.

## Where else to look

- The attacker's side of chapters 5 to 7 is
  [Cryptanalysis, chapter 17](../cryptanalysis/17-Side-Channels-the-Attackers-View.md);
  the stories behind chapter 4 are
  [Cryptanalysis, chapter 18](../cryptanalysis/18-Random-Numbers-Gone-Wrong.md).
- Certificates, TLS, SSH, disk encryption and the rest of the wire are in
  [Protocols](../protocols/index.md); safe post-quantum code and the move to it
  are in [Post-quantum cryptography](../post-quantum/index.md).
- The site's quick reference cards stay where they were: the command recipes for
  [openssl](../../tools/openssl.md), [ssh-keygen](../../tools/ssh-keygen.md),
  [gpg](../../tools/gpg.md), [age](../../tools/age.md) and
  [keytool](../../tools/keytool.md), and the
  [algorithm reference](../../algorithms/index.md).
