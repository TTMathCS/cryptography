# 6. Strong passwords

*About 5 minutes · You need: dice (or a phone's random number), a word list*

## Try it

Which is harder to guess?

- `Tr0ub4dor&3`
- `correct horse battery staple`

??? question "Answer"
    The four random words. A guessing program tries common words with letters swapped for numbers very early. Four words picked truly at random from a list of 7,776 give about 3.7 thousand million million possibilities, and they are easier to remember.

**Make your own:**

1. Roll five dice and write the numbers in order, for example `4 3 1 6 2`.
2. Look up `43162` in a dice word list (the EFF list has 7,776 words, one for each roll).
3. Do it four or five times. Put the words together.

## What's happening

A guesser doesn't try every letter one by one; it tries likely passwords first: names, pets, `123456`, words with `@` for `a`. What protects you is how many **equally likely** choices there were. Dice make every choice equally likely, and each extra word multiplies the guesses needed by 7,776.

Two more rules matter as much:

- **Never reuse a password.** When one website is broken into, attackers try the same password everywhere else.
- **Use a password manager** so you only need to remember one strong password, and turn on a second step (a code or a security key) where you can.

??? question "Five dice words or four? How many times harder is five?"
    7,776 times harder to guess, because each new word can be any of 7,776.

**You finished the start!** Next: the [Book](../book/index.md) from chapter 1, or the [Passwords guide](../topics/Passwords.md) for the full story.
