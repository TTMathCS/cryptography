# 2. The Caesar shift

*About 5 minutes · You need: paper, a pencil, a partner*

## Try it

Write the alphabet, then write it again underneath, **shifted three places**:

```
plain:   A B C D E F G H I J K L M
secret:  D E F G H I J K L M N O P

plain:   N O P Q R S T U V W X Y Z
secret:  Q R S T U V W X Y Z A B C
```

To hide a message, swap each letter for the one under it. `HELLO MARS` becomes `KHOOR PDUV`.

To read a secret message, go the other way, from the bottom row to the top.

Now decode this one: `WKLV LV IXQ`

??? question "Answer"
    `THIS IS FUN`. Each letter moves back three places: W→T, K→H, L→I...

## What's happening

Julius Caesar used this code about 2,000 years ago to send orders to his generals. The **key** is the number of places you shift: here, 3. Your partner needs to know the key to read your message.

Make a **code wheel**: cut two paper circles, one a little smaller, write the alphabet around the edge of each, and pin them together in the middle. Turn the inner one to choose a key.

<figure class="play" data-play="caesar"><span class="ai-tag">AI-created</span><figcaption><b>A code wheel to turn.</b> Slide the key to turn the inner ring and type a message: the outer ring is the plain letter, the inner ring the secret one under it.</figcaption></figure>

??? question "There are only 25 useful keys. Is that a problem?"
    Yes. Someone could just try all 25 in a few minutes. That is the subject of the next lesson.

<figure class="sketch"><span class="ai-tag">AI-created</span><svg viewBox="0 0 640 400" role="img" aria-labelledby="sk-c-wheel-t"><title id="sk-c-wheel-t">Two alphabet rings on a code wheel, the inner one turned three places, so A lines up with D and X with A</title><defs><filter id="sk-c-wheel-pen"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="3.2"/></filter><filter id="sk-c-wheel-paper"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="7"/><feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 .10 0"/></filter><pattern id="sk-c-wheel-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="7" stroke="#8a4a2a" stroke-width="1.1" opacity=".55"/></pattern><pattern id="sk-c-wheel-dots" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2" cy="3" r="1" fill="#8a4a2a" opacity=".5"/><circle cx="6.5" cy="7" r=".8" fill="#8a4a2a" opacity=".4"/></pattern><marker id="sk-c-wheel-ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1L9 5L1 9" fill="none" stroke="#3a2a1e" stroke-width="1.6" stroke-linecap="round"/></marker></defs><rect width="640" height="400" filter="url(#sk-c-wheel-paper)"/><g filter="url(#sk-c-wheel-pen)"><text x="30" y="44" class="h">A code wheel set to 3</text><circle cx="230" cy="220" r="160" class="p room"/><circle cx="230" cy="220" r="118" class="p gold"/><circle cx="230" cy="220" r="6" class="p"/><text x="230.0" y="86.0" text-anchor="middle" class="l">A</text><text x="230.0" y="127.0" text-anchor="middle" class="s">D</text><text x="263.5" y="90.1" text-anchor="middle" class="l">B</text><text x="253.5" y="129.8" text-anchor="middle" class="s">E</text><text x="295.1" y="102.0" text-anchor="middle" class="l">C</text><text x="275.5" y="138.2" text-anchor="middle" class="s">F</text><text x="322.8" y="121.2" text-anchor="middle" class="l">D</text><text x="295.0" y="151.6" text-anchor="middle" class="s">G</text><text x="345.2" y="146.5" text-anchor="middle" class="l">E</text><text x="310.7" y="169.3" text-anchor="middle" class="s">H</text><text x="360.9" y="176.4" text-anchor="middle" class="l">F</text><text x="321.6" y="190.2" text-anchor="middle" class="s">I</text><text x="369.0" y="209.1" text-anchor="middle" class="l">G</text><text x="327.3" y="213.2" text-anchor="middle" class="s">J</text><text x="369.0" y="242.9" text-anchor="middle" class="l">H</text><text x="327.3" y="236.8" text-anchor="middle" class="s">K</text><text x="360.9" y="275.6" text-anchor="middle" class="l">I</text><text x="321.6" y="259.8" text-anchor="middle" class="s">L</text><text x="345.2" y="305.5" text-anchor="middle" class="l">J</text><text x="310.7" y="280.7" text-anchor="middle" class="s">M</text><text x="322.8" y="330.8" text-anchor="middle" class="l">K</text><text x="295.0" y="298.4" text-anchor="middle" class="s">N</text><text x="295.1" y="350.0" text-anchor="middle" class="l">L</text><text x="275.5" y="311.8" text-anchor="middle" class="s">O</text><text x="263.5" y="361.9" text-anchor="middle" class="l">M</text><text x="253.5" y="320.2" text-anchor="middle" class="s">P</text><text x="230.0" y="366.0" text-anchor="middle" class="l">N</text><text x="230.0" y="323.0" text-anchor="middle" class="s">Q</text><text x="196.5" y="361.9" text-anchor="middle" class="l">O</text><text x="206.5" y="320.2" text-anchor="middle" class="s">R</text><text x="164.9" y="350.0" text-anchor="middle" class="l">P</text><text x="184.5" y="311.8" text-anchor="middle" class="s">S</text><text x="137.2" y="330.8" text-anchor="middle" class="l">Q</text><text x="165.0" y="298.4" text-anchor="middle" class="s">T</text><text x="114.8" y="305.5" text-anchor="middle" class="l">R</text><text x="149.3" y="280.7" text-anchor="middle" class="s">U</text><text x="99.1" y="275.6" text-anchor="middle" class="l">S</text><text x="138.4" y="259.8" text-anchor="middle" class="s">V</text><text x="91.0" y="242.9" text-anchor="middle" class="l">T</text><text x="132.7" y="236.8" text-anchor="middle" class="s">W</text><text x="91.0" y="209.1" text-anchor="middle" class="l">U</text><text x="132.7" y="213.2" text-anchor="middle" class="s">X</text><text x="99.1" y="176.4" text-anchor="middle" class="l">V</text><text x="138.4" y="190.2" text-anchor="middle" class="s">Y</text><text x="114.8" y="146.5" text-anchor="middle" class="l">W</text><text x="149.3" y="169.3" text-anchor="middle" class="s">Z</text><text x="137.2" y="121.2" text-anchor="middle" class="l">X</text><text x="165.0" y="151.6" text-anchor="middle" class="s">A</text><text x="164.9" y="102.0" text-anchor="middle" class="l">Y</text><text x="184.5" y="138.2" text-anchor="middle" class="s">B</text><text x="196.5" y="90.1" text-anchor="middle" class="l">Z</text><text x="206.5" y="129.8" text-anchor="middle" class="s">C</text><path class="p red" d="M230 50 L230 140"/><text x="420" y="130" class="s">outer ring: the plain letter</text><text x="420" y="150" class="s">inner ring: its secret letter</text><text x="420" y="200" class="s">A becomes D, B becomes E …</text><text x="420" y="220" class="s">and X, Y, Z wrap round to A, B, C.</text><text x="420" y="270" class="s">Turn the inner wheel to</text><text x="420" y="290" class="s">choose a new key.</text></g></svg><figcaption>Sketched for this page.</figcaption></figure>

**Next:** [3. Cracking Caesar](03-Cracking-Caesar.md) · Going further: [Book, chapter 2](../book/02-Classical-Ciphers.md)
