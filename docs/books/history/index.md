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
| | [6. Italy: ambassadors, nomenclators and the disk](06-Italy-Ambassadors-and-Nomenclators.md) | beginner to intermediate |
| | [7. Printed ciphers: Trithemius to Vigenère](07-Printed-Ciphers.md) | beginner to intermediate |
| | [8. The world beyond Europe, from ancient China to the Ottomans](08-The-World-Beyond-Europe.md) | beginner |
| | [9. Queens, spies and black chambers](09-Queens-Spies-and-Black-Chambers.md) | beginner to intermediate |
| **III. Wires, radio and machines** | [10. The telegraph: codes by the word, and the keyword falls](10-The-Telegraph.md) | beginner to intermediate |
| | [11. Radio, the First World War and the one-time pad](11-Radio-War-and-the-One-Time-Pad.md) | beginner to intermediate |
| | [12. Rotors and Enigma, and the Poles who broke it](12-Rotors-and-Enigma.md) | intermediate |
| | [13. Bletchley Park, Lorenz and Colossus](13-Bletchley-Park.md) | intermediate |
| | [14. The rest of the war](14-The-Rest-of-the-War.md) | beginner to intermediate |
| **IV. Mathematics, openness and the present** | [15. Shannon and the secret agencies](15-Shannon-and-the-Agencies.md) | intermediate |
| | [16. Feistel, Lucifer and DES](16-Feistel-Lucifer-and-DES.md) | intermediate |
| | [17. Public keys and the crypto wars](17-Public-Keys-and-the-Crypto-Wars.md) | intermediate |
| | [18. The internet era](18-The-Internet-Era.md) | intermediate |
| | [19. Hardware, quantum and the long view](19-Hardware-Quantum-and-the-Long-View.md) | intermediate |
| | [Glossary](Glossary.md) | |

## Timeline of the whole story

The turning points, in date order, with the part of the world each one
belongs to and a link to the chapter that tells the story.

| Year | Region | Event | Why it mattered |
|---|---|---|---|
| c. 1900 BC | Africa | A scribe uses unusual hieroglyphs in the tomb of [Khnumhotep II](02-Egypt-Mesopotamia-and-the-Bible.md) in Egypt | The oldest known deliberate change to a script |
| 1600s–1200s BC | Middle East | A Babylonian [glaze or glass recipe](02-Egypt-Mesopotamia-and-the-Bible.md) is written in rare sign values | The oldest writing known to guard a secret, a trade one |
| 600s BC on (disputed) | Europe | Spartans wind messages round a rod, the [skytale](03-Greece-and-Rome.md) | Transposition: the letters stay, their order changes |
| 600s–500s BC or later | Middle East | The Book of Jeremiah hides names with [Atbash](02-Egypt-Mesopotamia-and-the-Bible.md), swapping the alphabet end to end | Substitution: each letter stands for another |
| c. 499 BC | Middle East | Histiaeus, at the Persian court, sends a message [tattooed on a slave's scalp](03-Greece-and-Rome.md) | Steganography: hiding that a message exists at all |
| 400s–200s BC | China | Chinese military texts describe [secret tallies and three-part letters](08-The-World-Beyond-Europe.md) | Codes, and a secret split so no single messenger can read it |
| 350s BC | Europe | [Aeneas Tacticus](03-Greece-and-Rome.md) writes a chapter on sending secret messages in a siege | The first known writer to collect methods on purpose |
| 100s BC | Europe | Polybius describes a [5 × 5 grid for torch signals](03-Greece-and-Rome.md) | Letters as pairs of numbers, an idea reused for 2,000 years |
| 50s BC | Europe | Julius Caesar [shifts each letter three places](03-Greece-and-Rome.md) | The best-known substitution cipher, with only a couple of dozen keys |
| AD 224–651 (reported later) | Middle East | Sasanian kings are said to write secret letters in a [script of their own](08-The-World-Beyond-Europe.md) | Known only from later Arabic writers, and vaguely |
| c. AD 300 (date uncertain) | India | The *Kama Sutra* lists [secret writing](08-The-World-Beyond-Europe.md) among the 64 arts | Ciphers for private letters, not only for kings and generals |
| 300s–700s | Africa | Coptic and Greek scribes in Egypt use [letter swaps and number codes](02-Egypt-Mesopotamia-and-the-Bible.md) | A cipher alphabet written out on a potsherd at Djeme |
| 700s | Middle East | [Al-Khalil](04-Baghdad-and-Cairo.md), in Basra, writes the first known Arabic book on cryptograms (now lost) | The start of a written tradition of codebreaking |
| c. 780 | Europe | The nun Hygeburg hides her name in a [vowel cipher](05-The-Medieval-World.md) | Monks' and nuns' letter games: most of what survives from early medieval Europe |
| 800s | Middle East | [Al-Kindi](04-Baghdad-and-Cairo.md), in Baghdad, writes the first known account of frequency analysis | The first general method for breaking substitution ciphers |
| 800s | Europe | Sweden's Rök runestone is carved, partly in [cipher runes](05-The-Medieval-World.md) | Ciphers far from any royal office, cut in stone |
| 1040–1044 | China | The Song military encyclopedia *Wujing Zongyao* describes a [code built on a poem](08-The-World-Beyond-Europe.md) (details from a weaker source) | Agreed signs for fixed messages, as with the older tallies |
| 1150s | Europe | Hildegard of Bingen invents her [unknown letters](05-The-Medieval-World.md) | A private alphabet: a substitution under new shapes |
| 1200s | Middle East | [Ibn 'Adlan](04-Baghdad-and-Cairo.md) asks how long a message must be for letter counts to work | How much ciphertext an attack needs, still a central question |
| 1300s | Middle East | [Ibn ad-Durayhim](04-Baghdad-and-Cairo.md), in Damascus, works through a real solution | Homophones: several substitutes for one letter |
| 1379 | Europe | Gabriele de Lavinde puts together [cipher keys](06-Italy-Ambassadors-and-Nomenclators.md) for the Avignon pope | The oldest surviving European set of cipher keys |
| c. 1390 | Europe | The Book of Ballymote copies the Irish [Ogam Tract](05-The-Medieval-World.md), with some 100 secret forms of ogham | Secret writing as part of a poet's learning |
| 1412 | Africa | [Al-Qalqashandi's encyclopedia](04-Baghdad-and-Cairo.md), written in Cairo, sums up three centuries of Arab cryptology | The most complete treatment of ciphers and codebreaking of its time |
| 1400s–1532 | Americas | The Inca state keeps its records on [knotted cords, khipu](08-The-World-Beyond-Europe.md) | Not a cipher, but still not fully read |
| c. 1467 | Europe | Leon Battista Alberti describes his [cipher disk](06-Italy-Ambassadors-and-Nomenclators.md) | The first polyalphabetic cipher in Europe |
| 1474 | Europe | Cicco Simonetta, in Milan, writes [rules for solving ciphers](06-Italy-Ambassadors-and-Nomenclators.md) without the key | Europe's first written codebreaking |
| 1500s (attributed) | Japan | Uesugi Kenshin is said to use an [iroha cipher square](08-The-World-Beyond-Europe.md) | Polybius's idea with kana, if it was used at all |
| 1518 | Europe | Trithemius's *Polygraphia* is printed, with the [tabula recta](07-Printed-Ciphers.md) | The first printed book on cryptography |
| 1553 | Europe | Giovan Battista Bellaso publishes the [keyword cipher](07-Printed-Ciphers.md) later called "Vigenère" | Called unbreakable for three centuries |
| 1586 | Europe | Blaise de Vigenère describes a true [autokey cipher](07-Printed-Ciphers.md) | Stronger than the cipher that carries his name |
| 1587 | Europe | [Mary, Queen of Scots](09-Queens-Spies-and-Black-Chambers.md), is executed after her ciphered letters are read | Codebreaking decides the fate of a queen |
| 1590 | Europe | François Viète [reads Philip II's cipher](09-Queens-Spies-and-Black-Chambers.md) for Henri IV | A mathematician as codebreaker; Philip blames black magic |
| 1600s | Europe | The Rossignols build Louis XIV's [Great Cipher](09-Queens-Spies-and-Black-Chambers.md) | A code that stayed unread for 200 years |
| 1640s | Europe | John Wallis [deciphers royalist letters](09-Queens-Spies-and-Black-Chambers.md) for Parliament | His job passed to the Willes family, and England kept a Decipherer until 1844 |
| 1700s | Europe | Vienna's [black chamber](09-Queens-Spies-and-Black-Chambers.md) opens, copies and reseals the embassies' mail every morning | Reading other states' letters as a daily routine |
| 1744 | Russia | A French envoy's [intercepted letters](09-Queens-Spies-and-Black-Chambers.md) are deciphered, and he is expelled | Russia's chancellor reads the mail like the rest of Europe |
| 1778–1783 | Americas | Washington's [Culper Ring](09-Queens-Spies-and-Black-Chambers.md) uses a numbered code book and invisible ink | Spying with codes in the American Revolution |
| 1779–1780 | Americas | Benedict Arnold plots treason in a [book code](09-Queens-Spies-and-Black-Chambers.md) | Page, line and word: strong only while the book is secret |
| 1790s (date uncertain) | Americas | Thomas Jefferson describes a [wheel cypher](10-The-Telegraph.md) of 36 disks | Reinvented by Bazeries in 1891; the US Army's M-94 from 1922 |
| 1796–1800 | Korea | King Jeongjo runs politics through [secret letters](08-The-World-Beyond-Europe.md), sometimes in code | Almost the only Korean record found for this book before modern times |
| 1797 | Middle East | Selim III's new embassies begin [Ottoman diplomatic ciphers](08-The-World-Beyond-Europe.md) | A late start, through diplomacy |
| 1800s–1900s (described) | Africa | Drums and slit-gongs [carry spoken messages](10-The-Telegraph.md) for miles | Long stock phrases make tonal messages clear |
| 1854 | Europe | Charles Wheatstone invents the [Playfair cipher](10-The-Telegraph.md) | Encrypting letters in pairs, by hand |
| 1854–1863 | Europe | Charles Babbage, then Friedrich Kasiski, [break the Vigenère cipher](10-The-Telegraph.md) | The "indecipherable cipher" falls |
| 1861–1865 | Americas | The [US Civil War](10-The-Telegraph.md) is fought partly over the telegraph | Union route ciphers hold; Confederate keyword ciphers are read |
| 1869–1879 | Japan | The telegraph arrives, then government [code charts and a cipher wheel](10-The-Telegraph.md) | Japan's first official ciphers |
| 1871–1872 | China | The [Chinese telegraph code](10-The-Telegraph.md) gives each character four digits | Chinese on the wire, and an easy way to add a secret key |
| 1881–1917 | Russia | The Okhrana's [black chambers](10-The-Telegraph.md) read the empire's mail | Mass mail reading by the political police |
| 1883 | Europe | Auguste Kerckhoffs publishes [*La cryptographie militaire*](10-The-Telegraph.md) | The rule that only the key, not the method, may be secret |
| 1914–1918 | Europe | [Room 40](11-Radio-War-and-the-One-Time-Pad.md) in London reads German naval and diplomatic codes | Radio lets the enemy hear every message |
| 1917 | Europe | British codebreakers read the [Zimmermann telegram](11-Radio-War-and-the-One-Time-Pad.md) | Helps bring the United States into the First World War |
| 1917–1919 | Americas | Gilbert Vernam's teleprinter cipher leads to the [one-time pad](11-Radio-War-and-the-One-Time-Pad.md) | The only cipher that can be proven unbreakable |
| 1917–1919 | Europe | Hebern, Scherbius, Koch and Damm invent [rotor machines](12-Rotors-and-Enigma.md); Scherbius's becomes Enigma | Cipher machines go commercial |
| 1918 | Europe | Georges Painvin breaks Germany's [ADFGVX](11-Radio-War-and-the-One-Time-Pad.md) field cipher | A decoded order points to where the next German attack will fall |
| 1918 | Americas | Choctaw soldiers become the first [code talkers](11-Radio-War-and-the-One-Time-Pad.md) | A language the enemy doesn't know, on the field telephone |
| 1920 | Americas | William Friedman's [index of coincidence](11-Radio-War-and-the-One-Time-Pad.md) | Statistics find a keyword's length with no guessing |
| c. 1923 | Japan | A Polish officer teaches Japanese officers [codebreaking](14-The-Rest-of-the-War.md) | The start of Japan's codebreaking services |
| 1932 | Europe | Marian Rejewski [reconstructs the wiring](12-Rotors-and-Enigma.md) of the military Enigma | Mathematics enters codebreaking |
| 1938–1939 | Europe | The Poles build the *bomba*, then [share everything](12-Rotors-and-Enigma.md) with Britain and France | Five weeks before the war, the Allies learn how Enigma can be broken |
| 1938–1940 | China | Herbert Yardley works on Japanese army codes in [Chongqing](14-The-Rest-of-the-War.md) | China builds its own codebreaking bureau |
| 1940 | Americas | The US Army breaks Japan's [Purple](14-The-Rest-of-the-War.md) machine | "Magic" intelligence through the Pacific war |
| 1940–1944 | Europe | [Bletchley Park's](13-Bletchley-Park.md) bombes break Enigma; [Colossus](13-Bletchley-Park.md) attacks the Lorenz cipher | Codebreaking at industrial scale, and the first electronic computers |
| 1942 | Americas | US Navy codebreakers read [JN-25](14-The-Rest-of-the-War.md) before Midway | A code read in time turns a battle |
| 1942 | Russia | The Soviet pad office prints [key pages twice](14-The-Rest-of-the-War.md) | The flaw that Venona later found |
| 1942–1945 | India | The [Wireless Experimental Centre](14-The-Rest-of-the-War.md) near Delhi works on Japanese army codes | One of Bletchley Park's two overseas outposts |
| 1940s | Americas | SIGABA, and Navajo, Comanche and Meskwaki [code talkers](14-The-Rest-of-the-War.md) | Systems the enemy never read |
| 1943–1980 | Americas | The [Venona](14-The-Rest-of-the-War.md) project reads reused Soviet one-time pads | The one-time pad is only as safe as its key handling |
| 1949 | Americas | Claude Shannon publishes ["Communication Theory of Secrecy Systems"](15-Shannon-and-the-Agencies.md) | Cryptography becomes a mathematical science |
| 1952 | Americas | The [National Security Agency](15-Shannon-and-the-Agencies.md) is created | Codebreaking becomes a permanent peacetime industry |
| c. 1956 | Russia | The Soviet [Fialka](15-Shannon-and-the-Agencies.md) rotor machine enters service across the Warsaw Pact | Rotor machines last into the 1990s |
| late 1960s–1971 | Americas | Horst Feistel at IBM designs the [Feistel network and Lucifer](16-Feistel-Lucifer-and-DES.md) | The structure inside DES and many later ciphers |
| 1970 | Europe | The CIA and West Germany's BND secretly buy [Crypto AG](15-Shannon-and-the-Agencies.md), supplier to more than 120 countries | Rigged machines read the world's diplomatic traffic for decades |
| 1974 | Americas | Ralph Merkle's [puzzles](17-Public-Keys-and-the-Crypto-Wars.md), in a rejected student project | The first public-key idea in the open |
| 1976–1977 | Americas | [Diffie–Hellman](17-Public-Keys-and-the-Crypto-Wars.md) key exchange, then [RSA](17-Public-Keys-and-the-Crypto-Wars.md) | Public-key cryptography: strangers agree on secrets in the open |
| 1977 | Americas | [DES](16-Feistel-Lucifer-and-DES.md) becomes the first public standard cipher | Strong encryption for business, and a fight over key length |
| 1985 | Americas | Neal Koblitz and Victor Miller propose [elliptic-curve cryptography](17-Public-Keys-and-the-Crypto-Wars.md) | The same security as RSA with much shorter keys |
| late 1980s | Africa | The ANC's [Operation Vula](17-Public-Keys-and-the-Crypto-Wars.md) sends encrypted messages by laptop, tape and phone | Strong encryption for a liberation movement, and for Mandela in prison |
| 1991–2000 | Americas | PGP, the Clipper chip and the US export fights | The [crypto wars](17-Public-Keys-and-the-Crypto-Wars.md) over who may use strong encryption |
| 1994 | Americas | Peter Shor's [quantum algorithm](19-Hardware-Quantum-and-the-Long-View.md) for factoring | A future quantum computer would break RSA and elliptic curves |
| 1995 | Worldwide | [SSL](18-The-Internet-Era.md) ships in Netscape Navigator; in Finland, Tatu Ylönen writes [SSH](18-The-Internet-Era.md) | Encryption for everyone's network traffic |
| 1996–1999 | Americas | [Timing and power-analysis attacks](19-Hardware-Quantum-and-the-Long-View.md) | Hardware leaks keys even when the math is sound |
| 1997 | Europe | [GCHQ reveals](17-Public-Keys-and-the-Crypto-Wars.md) that its staff found public-key methods in 1970–1974 | The same ideas, discovered first in secret |
| 1998 | Americas | The EFF's [Deep Crack](16-Feistel-Lucifer-and-DES.md) finds a DES key in 56 hours | Proof that 56-bit keys were too short |
| 2000 | Japan | NTT and Mitsubishi Electric publish the [Camellia](../../04-symmetric-ciphers/National-Ciphers.md) cipher | A national cipher with the same shape as AES |
| 2001 | Worldwide | [AES](18-The-Internet-Era.md), designed in Belgium, is published as a US standard, FIPS 197 | A cipher chosen in an open, worldwide competition |
| 2003–2004 | Korea | The [ARIA](../../04-symmetric-ciphers/National-Ciphers.md) cipher becomes a Korean standard | Korea's own block cipher, used in government services |
| 2004–2017 | Worldwide | [MD5, then SHA-1, collisions](18-The-Internet-Era.md), starting with Wang Xiaoyun's team in China | Hash functions break in practice |
| 2006–2012 | China | SMS4 is published, later renamed [SM4](../../04-symmetric-ciphers/National-Ciphers.md); with SM2 and SM3 it forms China's national suite | China's own standard algorithms |
| 2008–2009 | Worldwide | The Bitcoin paper, then the network: [cryptography as money](18-The-Internet-Era.md) | Hashes and signatures keep a public ledger honest with no bank |
| 2012 | Worldwide | Keccak is chosen as [SHA-3](18-The-Internet-Era.md) | A second standard hash that works in a completely different way |
| 2013 | Americas | The [Snowden documents](18-The-Internet-Era.md) | Mass surveillance, and a random number generator that was almost certainly backdoored |
| 2014 | Worldwide | [Heartbleed](18-The-Internet-Era.md) | One bug in OpenSSL exposes much of the web |
| 2015 | Russia | GOST R 34.12-2015 adds the [Kuznyechik](../../04-symmetric-ciphers/National-Ciphers.md) cipher | Russia's own block cipher standard |
| 2015–2016 | Worldwide | [Let's Encrypt](18-The-Internet-Era.md) starts issuing free certificates | Encrypted web traffic becomes the default |
| 2016 | Worldwide | WhatsApp switches a billion users to the [Signal protocol](18-The-Internet-Era.md) | End-to-end encryption for ordinary messaging |
| 2016–2024 | Worldwide | NIST's [post-quantum competition](19-Hardware-Quantum-and-the-Long-View.md), with entries from around the world | ML-KEM, ML-DSA and SLH-DSA become standards in August 2024 |
| 2018 | Worldwide | [TLS 1.3](18-The-Internet-Era.md) is published | A faster, cleaner protocol with forward secrecy built in |
| 2020 | China | China's [Cryptography Law](19-Hardware-Quantum-and-the-Long-View.md) comes into force | Core, common and commercial cryptography in law |
| 2022–2026 | Worldwide | [Hybrid post-quantum key exchange](19-Hardware-Quantum-and-the-Long-View.md) becomes the default in SSH, browsers and Signal | Recorded traffic stays safe if a quantum computer arrives |
| 2025 | Korea | Korea's own competition, KpqC, picks [four post-quantum algorithms](19-Hardware-Quantum-and-the-Long-View.md) | Post-quantum standards beyond NIST |
| 2025 | China | China opens a [worldwide call](19-Hardware-Quantum-and-the-Long-View.md) for new national algorithms, post-quantum ones among them | Post-quantum standards beyond NIST |
| 2026 | Americas | [NIST IR 8547](19-Hardware-Quantum-and-the-Long-View.md) sets 2030 and 2035 as the end dates for RSA and elliptic curves | The old public-key algorithms get a retirement date |

The table picks out turning points; each chapter opens with a fuller timeline
of its own. Some parts of the world have far fewer rows than others, and
mostly that is about what survives and what has been studied, not about
what people did. The thinnest stretches are early medieval Europe,
Byzantium, Persia before Islam, Mughal India, Korea before modern times,
Southeast Asia and Ethiopia, where the research for this book found
little or nothing in reliable sources that describes actual ciphers. Where a chapter says a record is
thin, that is the reason.

