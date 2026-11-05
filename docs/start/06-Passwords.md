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

<figure class="sketch"><span class="ai-tag">AI-created</span><svg viewBox="0 0 640 410" role="img" aria-labelledby="sk-c-dicewords-t"><title id="sk-c-dicewords-t">Possible passwords from dice words: 7,776 for one word, about 60 million for two, up to about 28 million million million for five</title><defs><filter id="sk-c-dicewords-pen"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="3.2"/></filter><filter id="sk-c-dicewords-paper"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="7"/><feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 .10 0"/></filter><pattern id="sk-c-dicewords-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="7" stroke="#8a4a2a" stroke-width="1.1" opacity=".55"/></pattern><pattern id="sk-c-dicewords-dots" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2" cy="3" r="1" fill="#8a4a2a" opacity=".5"/><circle cx="6.5" cy="7" r=".8" fill="#8a4a2a" opacity=".4"/></pattern><marker id="sk-c-dicewords-ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1L9 5L1 9" fill="none" stroke="#3a2a1e" stroke-width="1.6" stroke-linecap="round"/></marker></defs><rect width="640" height="410" filter="url(#sk-c-dicewords-paper)"/><g filter="url(#sk-c-dicewords-pen)"><text x="30" y="44" class="h">Each word multiplies the guesses by 7,776</text><path class="p room" d="M150 90 L180 90 L180 124 L150 124Z"/><text x="30" y="113" class="l">1 word</text><text x="190" y="113" class="s">7,776</text><path class="p room" d="M150 146 L245 146 L245 180 L150 180Z"/><text x="30" y="169" class="l">2 words</text><text x="255" y="169" class="s">60 million</text><path class="p room" d="M150 202 L310 202 L310 236 L150 236Z"/><text x="30" y="225" class="l">3 words</text><text x="320" y="225" class="s">470 thousand million</text><path class="p gold" d="M150 258 L375 258 L375 292 L150 292Z"/><text x="30" y="281" class="l">4 words</text><text x="385" y="281" class="s">3.7 thousand million million</text><path class="p room" d="M150 314 L440 314 L440 348 L150 348Z"/><text x="30" y="337" class="l">5 words</text><text x="450" y="337" class="s">28 million million million</text><text x="30" y="395" class="s">Each bar is one step of ×7,776, so the bars are drawn as equal steps, not to scale.</text></g></svg><figcaption>Sketched for this page.</figcaption></figure>

**You finished the start!** Next: the [Book](../book/index.md) from chapter 1, or the [Passwords guide](../topics/Passwords.md) for the full story.
