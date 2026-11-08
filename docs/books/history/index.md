# History of secret writing

*The history of cryptography in 19 chapters: four thousand years of hiding,
scrambling and breaking messages, from a scribe's odd hieroglyphs to the
post-quantum standards now in every web browser. It tells who made each secret,
who broke it, why it mattered and what changed, in every part of the world.*

## What this book is

[The cryptography book](../../book/index.md) teaches how each cipher, hash and
protocol works, and [Cryptanalysis](../cryptanalysis/index.md) teaches how each
one is broken. This book tells the story around them: the people, the
institutions, the wars and trade, and the mistakes. It begins with writing that
hides, which came long before anything we would now call cryptography, and ends
with the algorithms of 2024 and the question every one of them faces, how long
it will last.

Two threads run through every chapter. Each new cipher was trusted until someone
found a way to break it, so the breakers drive the story as much as the makers.
And the weak point was rarely the mathematics. It was a reused key, a careless
clerk, a predictable message or a leaky chip.

It is written for anyone who is curious how we got here: students, programmers,
teachers, and readers of the other books who want the people behind the
algorithms. No mathematics is needed; where a chapter teaches a method, it does so
by hand on a small example and then in short Python.

## How the book works

- **Read it in order, or jump.** The chapters run in time order, and each stands
  on its own. [Chapter 1](01-Why-People-Hid-Writing.md) sets out the words and the
  problem; the rest can be read in any order.
- **Every chapter opens with a box** saying what you'll learn, which chapters you
  need first, and which sections are beginner, intermediate or expert.
- **The story comes first.** A chapter opens with a situation and the people in it.
  The technique appears as the answer to their problem.
- **The whole world.** China, India, Persia, the Islamic world, Byzantium, Japan,
  Korea, Africa, the Americas and Russia each get their due. Where the sources are
  thin, or a date or an attribution is disputed, the sentence says so.
- **Try the old ciphers.** Every historical method is shown by hand and in short
  Python (3.8 or later, standard library only), and many chapters ask you to break
  a message the way its first readers did.
- **Life stories.** Each person, cipher, machine or event has a card: when it was
  born, what it was for, what it helped, where it stands.
- **Check yourself.** Each chapter ends with 8 to 10 questions with the answers
  folded underneath, a summary and a reading list with years.

For the technical detail behind a story, the chapters link to the book that owns
it: [Cryptanalysis](../cryptanalysis/index.md) for attack methods,
[Protocols](../protocols/index.md) for TLS and the rest, and
[Post-quantum cryptography](../post-quantum/index.md) for the algorithms that
replace RSA and elliptic curves.

## Contents

| Part | Chapter | Level |
|---|---|---|
| **I. Beginnings** | [1. Why people hid writing](01-Why-People-Hid-Writing.md) | beginner |
| | [2. Egypt, Mesopotamia and the Bible](02-Egypt-Mesopotamia-and-the-Bible.md) | beginner |
| | [3. Greece and Rome](03-Greece-and-Rome.md) | beginner |
| | [4. Baghdad and Cairo: the first codebreakers](04-Baghdad-and-Cairo.md) | beginner to intermediate |
| **II. Europe's courts and the wider world** | [5. The medieval world](05-The-Medieval-World.md) | beginner |
| | 6. Italy: ambassadors, nomenclators and the disk | beginner to intermediate |
| | 7. Printed ciphers: Trithemius to Vigenère | beginner to intermediate |
| | 8. The world beyond Europe, from ancient China to the Ottomans | beginner |
| | 9. Queens, spies and black chambers | beginner to intermediate |
| **III. Wires, radio and machines** | 10. The telegraph: codes by the word, and the keyword falls | beginner to intermediate |
| | 11. Radio, the First World War and the one-time pad | beginner to intermediate |
| | 12. Rotors and Enigma, and the Poles who broke it | intermediate |
| | 13. Bletchley Park, Lorenz and Colossus | intermediate |
| | 14. The rest of the war | beginner to intermediate |
| **IV. Mathematics, openness and the present** | 15. Shannon and the secret agencies | intermediate |
| | 16. Feistel, Lucifer and DES | intermediate |
| | 17. Public keys and the crypto wars | intermediate |
| | 18. The internet era | intermediate |
| | 19. Hardware, quantum and the long view | intermediate |
| | Glossary | |
