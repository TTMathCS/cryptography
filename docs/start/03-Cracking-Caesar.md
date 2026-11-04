# 3. Cracking Caesar

*About 5 minutes · You need: paper, a pencil*

## Try it

You found this secret message, but not the key:

```
PHHW PH DW WKH SDUN
```

**Way 1: try every key.** Shift each letter back by 1, then 2, then 3... Stop when you see real words. (It won't take long.)

**Way 2: count letters.** In English, **E** is the most common letter. Which letter appears most in the message? If `H` stands for `E`, how far is the shift?

??? question "Answer"
    `H` appears four times, more than any other letter. `H` is three places after `E`, so the key is 3: `MEET ME AT THE PARK`.

## What's happening

Way 1 is called **brute force**: try every key. It works when there are only a few keys. Real codes today have more keys than there are grains of sand on Earth, so trying them all is impossible.

Way 2 is **frequency analysis**, invented by the Arab scholar **al-Kindi** more than 1,100 years ago. Letters in a language are not equally common, and a simple swap code keeps that pattern. For hundreds of years, it broke almost every code.

??? question "Why does counting work better on a long message than on a short one?"
    A long message shows the usual pattern clearly. A short one, like "OK", has too few letters to tell which is the most common.

**Next:** [4. A code nobody can break](04-One-Time-Pad.md) · Going further: [History: Arab cryptanalysis](../history/02-Arab-Cryptanalysis.md)
