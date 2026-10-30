# History of cryptography

*Four thousand years of hiding, scrambling and breaking messages, from a
scribe's odd hieroglyphs to the post-quantum algorithms now in every web
browser.*

The rest of this site describes the algorithms that run today. This section
tells how we got them. The story has a clear shape. For most of history
cryptography was a craft: clever tricks, kept secret, used by kings,
generals and lovers, and broken by patient people with pen and paper. Then
came machines, then a war fought partly by codebreakers, then a theory that
turned the craft into mathematics. In 1976 two researchers showed that
strangers could agree on a secret key in public, and that idea is what made
online shopping, messaging and software updates safe. The newest chapter is
about quantum computers and the algorithms built to survive them.

Two threads run through every page. Each new cipher was trusted until
someone found a way to break it, so the breakers drive the story as much
as the makers. And the weak point was rarely the mathematics. It was a
reused key, a careless clerk, a predictable message or a leaky chip.

## Timeline

The turning points, with a link to the page that tells each story.

| Year | Event | Why it mattered |
|---|---|---|
| c. 1900 BC | A scribe uses unusual hieroglyphs in the tomb of [Khnumhotep II](01-Ancient.md#egypt-the-scribe-who-changed-the-signs) in Egypt | The oldest known deliberate change to a script |
| 1600s–1200s BC | A Babylonian [glaze or glass recipe](01-Ancient.md#mesopotamia-a-potters-recipe) is written in rare sign values | The oldest writing known to guard a secret, a trade one |
| c. 499 BC | Histiaeus sends a message [tattooed on a slave's scalp](01-Ancient.md#herodotuss-stories) | Steganography: hiding that a message exists at all |
| 100s BC | Polybius describes a [5 × 5 grid for torch signals](01-Ancient.md#greece-polybius-and-his-square) | Letters as pairs of numbers, an idea reused for 2,000 years |
| 50s BC | Julius Caesar [shifts each letter three places](01-Ancient.md#rome-caesar-and-augustus) | The best-known substitution cipher, with only a couple of dozen keys |
| 800s | [Al-Kindi](02-Arab-Cryptanalysis.md#al-kindi-counting-letters), in Baghdad, writes the first known account of frequency analysis | The first general method for breaking substitution ciphers |
| 1412 | [Al-Qalqashandi's encyclopedia](02-Arab-Cryptanalysis.md#ibn-ad-durayhim-and-al-qalqashandi) sums up three centuries of Arab cryptology | The most complete treatment of ciphers and codebreaking of its time |
| c. 1467 | Leon Battista Alberti describes his [cipher disk](03-Renaissance.md#albertis-cipher-disk) | The first polyalphabetic cipher in Europe |
| 1553 | Giovan Battista Bellaso publishes the [keyword cipher](03-Renaissance.md#bellaso-and-the-keyword) later called "Vigenère" | Called unbreakable for three centuries |
| 1587 | [Mary, Queen of Scots](03-Renaissance.md#mary-queen-of-scots), is executed after her ciphered letters are read | Codebreaking decides the fate of a queen |
| 1600s | The Rossignols build Louis XIV's [Great Cipher](03-Renaissance.md#france-the-rossignols-and-the-great-cipher) | A code that stayed unread for 200 years |
| 1854–1863 | Charles Babbage, then Friedrich Kasiski, break the Vigenère cipher | The "indecipherable cipher" falls |
| 1883 | Auguste Kerckhoffs publishes *La cryptographie militaire* | The rule that only the key, not the method, may be secret |
| 1917 | British codebreakers read the Zimmermann telegram | Helps bring the United States into the First World War |
| 1917–1919 | Gilbert Vernam's teleprinter cipher leads to the one-time pad | The only cipher that can be proven unbreakable |
| 1918 | Arthur Scherbius files his patent for the rotor machine that becomes Enigma | Cipher machines go commercial |
| 1932 | Marian Rejewski reconstructs the wiring of the military Enigma | Mathematics enters codebreaking |
| 1940–1944 | Bletchley Park's bombes break Enigma; Colossus attacks the Lorenz cipher | Codebreaking at industrial scale, and the first electronic computers |
| 1943–1980 | The Venona project reads reused Soviet one-time pads | The one-time pad is only as safe as its key handling |
| 1949 | Claude Shannon publishes "Communication Theory of Secrecy Systems" | Cryptography becomes a mathematical science |
| 1977 | DES becomes the first public standard cipher | Strong encryption for business, and a fight over key length |
| 1976–1977 | Diffie–Hellman key exchange, then RSA | Public-key cryptography: strangers agree on secrets in the open |
| 1997 | GCHQ reveals that its staff found public-key methods in 1970–1974 | The same ideas, discovered first in secret |
| 1991–1999 | PGP, the Clipper chip and the US export fights | The "crypto wars" over who may use strong encryption |
| 1994 | Peter Shor's quantum algorithm for factoring | A future quantum computer would break RSA and elliptic curves |
| 1995 | SSL ships in Netscape Navigator; SSH is written | Encryption for everyone's network traffic |
| 1996–1999 | Timing and power-analysis attacks | Hardware leaks keys even when the math is sound |
| 1998 | The EFF's Deep Crack finds a DES key in 56 hours | Proof that 56-bit keys were too short |
| 2001 | AES is published as FIPS 197 | A cipher chosen in an open, worldwide competition |
| 2004–2017 | MD5, then SHA-1, collisions | Hash functions break in practice |
| 2013 | The Snowden documents | Mass surveillance, and a backdoored random number generator |
| 2014 | Heartbleed | One bug in OpenSSL exposes much of the web |
| 2015–2016 | Let's Encrypt starts issuing free certificates | Encrypted web traffic becomes the default |
| 2018 | TLS 1.3 is published | A faster, cleaner protocol with forward secrecy built in |
| 2016–2024 | NIST's post-quantum competition | ML-KEM, ML-DSA and SLH-DSA become standards in August 2024 |

## How to read this section

The pages run in time order, and each one stands on its own:

1. [The ancient world](01-Ancient.md): Egyptian and Babylonian scribes, the
   Spartan skytale, Polybius, Caesar, Atbash, hidden messages
2. [Arab cryptanalysis](02-Arab-Cryptanalysis.md): al-Kindi and frequency
   analysis, and the scholars who built on it
3. [The Renaissance](03-Renaissance.md): cipher disks, the "Vigenère"
   cipher, nomenclators, Mary Queen of Scots, the black chambers
4. The telegraph age: Vigenère broken, Kerckhoffs, Zimmermann, the one-time
   pad
5. Machines and World War II: rotor machines, Enigma, Bletchley Park,
   Colossus, Venona
6. From Shannon to DES: the theory, the agencies, the first public standard
7. Public-key cryptography: Diffie–Hellman, RSA, GCHQ's secret, the crypto
   wars
8. The internet era: SSL and TLS, AES, broken hashes, famous bugs,
   Snowden, end-to-end messaging
9. Hardware and engineering: smart cards to secure enclaves, side
   channels, cracking machines, quantum key distribution
10. Quantum and post-quantum: Shor, the NIST competition, the new
    standards and the move to them

Each page opens with a short summary and an at-a-glance table, then tells
the story in sections you can skip between. Where an idea from history
lives on in a modern algorithm, the text links to that algorithm's page.

**The Python examples** use only the standard library and print their
results, so you can paste them into `python3` and see the same output
shown under each one. They are toys for understanding the idea, never for
protecting anything.

**Sources.** History of secret work is full of myths, and some famous
stories are told with more confidence than the evidence allows. The pages
lean on primary sources (the ancient texts, the original papers, NIST
documents, declassified agency histories) and serious historians,
above all David Kahn's *The Codebreakers*. Where a story is disputed, the
text says so. Each page's references end with a line marked *Weaker
sources*, listing anything that rests on news reports, blogs, encyclopedia
articles or search summaries, so you can judge it for yourself.
