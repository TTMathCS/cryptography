# 4. A code nobody can break

*About 5 minutes · You need: a die (or a phone's random number), paper, a partner*

## Try it

Instead of shifting every letter by the same amount, shift **each letter by a different random amount**.

1. Roll a die once for each letter of your message and write the numbers down. This list is the **key**. Make a copy for your partner, secretly.
2. Shift each letter forward by its number.

```
message:  H  I  D  E
key:      3  1  6  2
secret:   K  J  J  G
```

3. Your partner shifts each letter **back** by the same numbers.

??? question "Notice anything about the two J's?"
    They stand for different letters (I and D). Counting letters is useless now: the pattern is gone.

## What's happening

This is the **one-time pad**. If the key is truly random, as long as the message, and **never used again**, it cannot be broken, ever. Not by a computer, not by anyone. Claude Shannon proved this in 1949.

So why doesn't everyone use it? Because the key is as long as the message, and you must get it to your partner secretly first. Spies carried pads of random numbers; leaders' hotlines used them. But for the internet, with billions of messages, it doesn't work.

The rule "never use it again" matters. In the 1940s, Soviet spies reused some pages, and American codebreakers read thousands of their messages (the **Venona** project).

??? question "With a real die, why does a shift of 1 to 6 still leak a little?"
    Each letter can only move 1 to 6 places, so `K` must have come from one of E, F, G, H, I or J. A perfect pad uses random shifts from 0 to 25.

**Next:** [5. Locks and keys](05-Locks-and-Keys.md) · Going further: [Book, chapter 4](../book/04-Randomness-and-Perfect-Secrecy.md)
