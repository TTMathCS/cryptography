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

<figure class="play" data-play="otp"><span class="ai-tag">AI-created</span><figcaption><b>Try it.</b> Type a message and roll the dice again and again: the secret changes every time, and the same secret letter can stand for different message letters.</figcaption></figure>

## What's happening

This is the **one-time pad**. If the key is truly random, as long as the message, and **never used again**, it cannot be broken, ever. Not by a computer, not by anyone. Claude Shannon proved this in 1949.

So why doesn't everyone use it? Because the key is as long as the message, and you must get it to your partner secretly first. Spies carried pads of random numbers; leaders' hotlines used them. But for the internet, with billions of messages, it doesn't work.

The rule "never use it again" matters. In the 1940s, Soviet spies reused some pages, and American codebreakers read thousands of their messages (the **Venona** project).

??? question "With a real die, why does a shift of 1 to 6 still leak a little?"
    Each letter can only move 1 to 6 places, so `K` must have come from one of E, F, G, H, I or J. A perfect pad uses random shifts from 0 to 25.

<figure class="sketch"><span class="ai-tag">AI-created</span><svg viewBox="0 0 640 430" role="img" aria-labelledby="sk-c-pad-t"><title id="sk-c-pad-t">The secret letter K with lines from all 26 letters: with a truly random one-time pad, any of them could have produced it</title><defs><filter id="sk-c-pad-pen"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="3.2"/></filter><filter id="sk-c-pad-paper"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="7"/><feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 .10 0"/></filter><pattern id="sk-c-pad-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="7" stroke="#8a4a2a" stroke-width="1.1" opacity=".55"/></pattern><pattern id="sk-c-pad-dots" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2" cy="3" r="1" fill="#8a4a2a" opacity=".5"/><circle cx="6.5" cy="7" r=".8" fill="#8a4a2a" opacity=".4"/></pattern><marker id="sk-c-pad-ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1L9 5L1 9" fill="none" stroke="#3a2a1e" stroke-width="1.6" stroke-linecap="round"/></marker></defs><rect width="640" height="430" filter="url(#sk-c-pad-paper)"/><g filter="url(#sk-c-pad-pen)"><text x="30" y="44" class="h">K could have been any letter</text><circle cx="520" cy="225" r="34" class="p gold"/><text x="520" y="235" text-anchor="middle" class="h" style="font-size:30px">K</text><text x="407" y="89" text-anchor="middle" class="s">A</text><path class="p dash" d="M417 84 L508 205" opacity=".45"/><text x="377" y="95" text-anchor="middle" class="s">B</text><path class="p dash" d="M387 90 L504 206" opacity=".45"/><text x="349" y="102" text-anchor="middle" class="s">C</text><path class="p dash" d="M359 97 L501 207" opacity=".45"/><text x="322" y="110" text-anchor="middle" class="s">D</text><path class="p dash" d="M332 105 L498 208" opacity=".45"/><text x="297" y="119" text-anchor="middle" class="s">E</text><path class="p dash" d="M307 114 L496 209" opacity=".45"/><text x="275" y="130" text-anchor="middle" class="s">F</text><path class="p dash" d="M285 125 L493 211" opacity=".45"/><text x="254" y="141" text-anchor="middle" class="s">G</text><path class="p dash" d="M264 136 L491 212" opacity=".45"/><text x="237" y="153" text-anchor="middle" class="s">H</text><path class="p dash" d="M247 148 L489 214" opacity=".45"/><text x="221" y="166" text-anchor="middle" class="s">I</text><path class="p dash" d="M231 161 L487 216" opacity=".45"/><text x="209" y="180" text-anchor="middle" class="s">J</text><path class="p dash" d="M219 175 L486 218" opacity=".45"/><text x="200" y="194" text-anchor="middle" class="s">K</text><path class="p dash" d="M210 189 L485 220" opacity=".45"/><text x="194" y="208" text-anchor="middle" class="s">L</text><path class="p dash" d="M204 203 L484 222" opacity=".45"/><text x="190" y="223" text-anchor="middle" class="s">M</text><path class="p dash" d="M200 218 L484 224" opacity=".45"/><text x="190" y="237" text-anchor="middle" class="s">N</text><path class="p dash" d="M200 232 L484 226" opacity=".45"/><text x="194" y="252" text-anchor="middle" class="s">O</text><path class="p dash" d="M204 247 L484 228" opacity=".45"/><text x="200" y="266" text-anchor="middle" class="s">P</text><path class="p dash" d="M210 261 L485 230" opacity=".45"/><text x="209" y="280" text-anchor="middle" class="s">Q</text><path class="p dash" d="M219 275 L486 232" opacity=".45"/><text x="221" y="294" text-anchor="middle" class="s">R</text><path class="p dash" d="M231 289 L487 234" opacity=".45"/><text x="237" y="307" text-anchor="middle" class="s">S</text><path class="p dash" d="M247 302 L489 236" opacity=".45"/><text x="254" y="319" text-anchor="middle" class="s">T</text><path class="p dash" d="M264 314 L491 238" opacity=".45"/><text x="275" y="330" text-anchor="middle" class="s">U</text><path class="p dash" d="M285 325 L493 239" opacity=".45"/><text x="297" y="341" text-anchor="middle" class="s">V</text><path class="p dash" d="M307 336 L496 241" opacity=".45"/><text x="322" y="350" text-anchor="middle" class="s">W</text><path class="p dash" d="M332 345 L498 242" opacity=".45"/><text x="349" y="358" text-anchor="middle" class="s">X</text><path class="p dash" d="M359 353 L501 243" opacity=".45"/><text x="377" y="365" text-anchor="middle" class="s">Y</text><path class="p dash" d="M387 360 L504 244" opacity=".45"/><text x="407" y="371" text-anchor="middle" class="s">Z</text><path class="p dash" d="M417 366 L508 245" opacity=".45"/><text x="30" y="395" class="s">With a random shift from 0 to 25, every letter is equally likely to have become K.</text><text x="30" y="415" class="s">Nothing to count, nothing to guess from: unbreakable, if the pad is never used twice.</text></g></svg><figcaption>Sketched for this page.</figcaption></figure>

**Next:** [5. Locks and keys](05-Locks-and-Keys.md) · Going further: [Book, chapter 4](../book/04-Randomness-and-Perfect-Secrecy.md)
