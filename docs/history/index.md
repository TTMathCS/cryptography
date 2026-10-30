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
| 1854–1863 | Charles Babbage, then Friedrich Kasiski, [break the Vigenère cipher](04-Telegraph-Age.md#the-keyword-cipher-falls) | The "indecipherable cipher" falls |
| 1883 | Auguste Kerckhoffs publishes [*La cryptographie militaire*](04-Telegraph-Age.md#kerckhoffss-rules) | The rule that only the key, not the method, may be secret |
| 1917 | British codebreakers read the [Zimmermann telegram](04-Telegraph-Age.md#the-zimmermann-telegram) | Helps bring the United States into the First World War |
| 1917–1919 | Gilbert Vernam's teleprinter cipher leads to the [one-time pad](04-Telegraph-Age.md#vernam-and-the-one-time-pad) | The only cipher that can be proven unbreakable |
| 1918 | Arthur Scherbius files his patent for the [rotor machine](05-Machines-and-WWII.md#rotor-machines) that becomes Enigma | Cipher machines go commercial |
| 1932 | Marian Rejewski [reconstructs the wiring](05-Machines-and-WWII.md#poland-the-first-break) of the military Enigma | Mathematics enters codebreaking |
| 1940–1944 | [Bletchley Park's](05-Machines-and-WWII.md#bletchley-park) bombes break Enigma; [Colossus](05-Machines-and-WWII.md#lorenz-and-colossus) attacks the Lorenz cipher | Codebreaking at industrial scale, and the first electronic computers |
| 1943–1980 | The [Venona](05-Machines-and-WWII.md#venona) project reads reused Soviet one-time pads | The one-time pad is only as safe as its key handling |
| 1949 | Claude Shannon publishes ["Communication Theory of Secrecy Systems"](06-Shannon-to-DES.md#shannon-secrecy-becomes-mathematics) | Cryptography becomes a mathematical science |
| 1977 | [DES](06-Shannon-to-DES.md#des) becomes the first public standard cipher | Strong encryption for business, and a fight over key length |
| 1976–1977 | [Diffie–Hellman](07-Public-Key.md#diffie-and-hellman) key exchange, then [RSA](07-Public-Key.md#rsa) | Public-key cryptography: strangers agree on secrets in the open |
| 1997 | [GCHQ reveals](07-Public-Key.md#gchqs-secret) that its staff found public-key methods in 1970–1974 | The same ideas, discovered first in secret |
| 1991–2000 | PGP, the Clipper chip and the US export fights: the [crypto wars](07-Public-Key.md#the-crypto-wars) | The "crypto wars" over who may use strong encryption |
| 1994 | Peter Shor's [quantum algorithm](10-Quantum-and-Post-Quantum.md#shors-algorithm-1994) for factoring | A future quantum computer would break RSA and elliptic curves |
| 1995 | [SSL](08-Internet-Era.md#ssl-at-netscape) ships in Netscape Navigator; [SSH](08-Internet-Era.md#ssh) is written | Encryption for everyone's network traffic |
| 1996–1999 | [Timing and power-analysis attacks](09-Hardware-and-Engineering.md#side-channels) | Hardware leaks keys even when the math is sound |
| 1998 | The EFF's [Deep Crack](09-Hardware-and-Engineering.md#deep-crack) finds a DES key in 56 hours | Proof that 56-bit keys were too short |
| 2001 | [AES](08-Internet-Era.md#aes-a-cipher-chosen-in-public) is published as FIPS 197 | A cipher chosen in an open, worldwide competition |
| 2004–2017 | [MD5, then SHA-1, collisions](08-Internet-Era.md#md5-and-sha-1) | Hash functions break in practice |
| 2013 | The [Snowden documents](08-Internet-Era.md#snowden-and-dual_ec_drbg) | Mass surveillance, and a backdoored random number generator |
| 2014 | [Heartbleed](08-Internet-Era.md#heartbleed-2014) | One bug in OpenSSL exposes much of the web |
| 2015–2016 | [Let's Encrypt](08-Internet-Era.md#lets-encrypt-and-https-everywhere) starts issuing free certificates | Encrypted web traffic becomes the default |
| 2016 | WhatsApp switches a billion users to the [Signal protocol](08-Internet-Era.md#from-otr-to-signal) | End-to-end encryption for ordinary messaging |
| 2018 | [TLS 1.3](08-Internet-Era.md#from-ssl-to-tls-13) is published | A faster, cleaner protocol with forward secrecy built in |
| 2016–2024 | NIST's [post-quantum competition](10-Quantum-and-Post-Quantum.md#the-nist-competition-20162024) | ML-KEM, ML-DSA and SLH-DSA become standards in August 2024 |
| 2022–2026 | [Hybrid post-quantum key exchange](10-Quantum-and-Post-Quantum.md#the-move-hybrids) becomes the default in SSH, browsers and Signal | Recorded traffic stays safe if a quantum computer arrives |
| 2026 | [NIST IR 8547](10-Quantum-and-Post-Quantum.md#deadlines) sets 2030 and 2035 as the end dates for RSA and elliptic curves | The old public-key algorithms get a retirement date |

## How to read this section

The pages run in time order, and each one stands on its own:

1. [The ancient world](01-Ancient.md): Egyptian and Babylonian scribes, the
   Spartan skytale, Polybius, Caesar, Atbash, hidden messages
2. [Arab cryptanalysis](02-Arab-Cryptanalysis.md): al-Kindi and frequency
   analysis, and the scholars who built on it
3. [The Renaissance](03-Renaissance.md): cipher disks, the "Vigenère"
   cipher, nomenclators, Mary Queen of Scots, the black chambers
4. [The telegraph age](04-Telegraph-Age.md): Vigenère broken, Playfair,
   Kerckhoffs, Room 40 and the Zimmermann telegram, the one-time pad
5. [Machines and World War II](05-Machines-and-WWII.md): rotor machines,
   Enigma, Poland and Bletchley Park, Colossus, Purple, Venona
6. [From Shannon to DES](06-Shannon-to-DES.md): Shannon's theory, NSA and
   GCHQ, Crypto AG, Feistel and Lucifer, DES and its key
7. [Public-key cryptography](07-Public-Key.md): Merkle, Diffie–Hellman,
   RSA, GCHQ's secret, elliptic curves, PGP, Clipper and the crypto wars
8. [The internet era](08-Internet-Era.md): SSL to TLS 1.3, SSH, the AES
   competition, broken hashes, famous bugs, Snowden and Dual_EC, Let's
   Encrypt, Signal and end-to-end messaging
9. [Hardware and engineering](09-Hardware-and-Engineering.md): HSMs, smart
   cards, TPMs and secure enclaves, AES instructions, side channels,
   cracking machines, security keys, quantum key distribution
10. [Quantum and post-quantum](10-Quantum-and-Post-Quantum.md): Shor and
    Grover, the machines, the NIST competition, ML-KEM, ML-DSA, SLH-DSA,
    FN-DSA and HQC, hybrid rollouts, deadlines, and what is still open

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
