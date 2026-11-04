# 1. Why keep secrets?

*About 5 minutes · You need: a partner, paper*

## Try it

Write a note to your partner: "Meet me at the swings at 3". Now imagine the note passes through five other hands on its way across the class.

Two things could go wrong:

1. Someone **reads** it. Now everyone is at the swings.
2. Someone **changes** it to "at 4". Your partner waits for an hour.

## What's happening

Cryptography is the art of protecting messages from both problems:

- **Hiding** (keeping it secret): only the right person can read it.
- **Checking** (keeping it true): the reader can tell if anyone changed it, and who really sent it.

Every time you open a website with a padlock, send a chat message or unlock a phone, cryptography does both jobs, millions of times a second, without you noticing.

People have hidden messages for thousands of years. Spartan soldiers wound a strip of leather around a stick and wrote along it; unwound, the letters were jumbled. Only someone with a stick of the same thickness could read it. It was called a **scytale**.

??? question "Which job does a signature on a birthday card do: hiding or checking?"
    Checking. Anyone can read the card, but the signature tells you who it is from.

**Next:** [2. The Caesar shift](02-Caesar.md) · Going further: [Book, chapter 1](../book/01-What-Cryptography-Is-For.md)
