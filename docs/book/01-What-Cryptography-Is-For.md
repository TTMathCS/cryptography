# 1. What Cryptography Is For

*Cryptography is the study of keeping communication safe when someone else is
listening, and possibly interfering. This chapter sets out what "safe" means:
the four jobs cryptography does, the rule that only the key may be secret, the
ways an attacker can come at a system, and how strength is measured in bits.
It ends with a tour of four thousand years of secret writing around the world,
which the rest of the book picks up chapter by chapter.*

!!! abstract "In this chapter"

    **You will learn:**

    - the four jobs: confidentiality, integrity, authenticity and non-repudiation, and which tool does which
    - the difference between secret-key and public-key cryptography
    - Kerckhoffs's principle, and why secret algorithms keep failing
    - the attack models, from ciphertext-only to chosen-ciphertext, with a real case for each
    - what "128-bit security" means and how to turn bits into years
    - the shape of the history, from Egypt and Baghdad to Bletchley Park and the post-quantum standards

    **You need:** nothing. School arithmetic is enough for the whole chapter.

    **Levels:** sections 1.1 to 1.5 are for beginners, 1.6 to 1.9 are intermediate,
    and 1.11 is expert.

## 1.1 The problem

Around 499 BC, Herodotus tells us, Histiaeus of Miletus was held at the
Persian court and wanted to tell his son-in-law to revolt. Every road was
watched. He shaved the head of his most trusted slave, tattooed the message
on his scalp, waited for the hair to grow back and sent him off with one
instruction: "tell Aristagoras to shave your head." The guards searched the
man and found nothing.

Herodotus has a second story of the same kind. Around 480 BC Demaratus, a
Spartan exile at the Persian court, learned that Xerxes was preparing to invade
Greece. He scraped the wax off a wooden writing tablet, wrote his warning on the
wood, and covered it with fresh wax. The blank tablet passed every guard; in
Sparta, it was Gorgo, the wife of King Leonidas, who guessed that the wood
should be scraped.

That is the oldest problem in this book. Two people want to talk; the only
channel between them passes through hostile hands. Histiaeus solved it by
hiding the message's existence, which is called **steganography** (Greek for
"covered writing"). It works until the guards learn the trick. Then it fails
completely: a shaved head gives up everything.

Hiding never went away. Spies of the American Revolution wrote between the
lines in invisible ink; German agents in the Second World War shrank whole
pages to **microdots** the size of a printed full stop; today data can be
hidden in the least important bits of a photograph's pixels. But every one of
these tricks has the same weakness: the secret is the method, and once the
guards know the method, they read everything.

!!! note "Life story: steganography"
    **Born:** antiquity; the oldest stories are Herodotus's (Histiaeus around 499 BC, Demaratus around 480 BC) ·
    **Purpose:** get a message past people who search the messenger · **Helped:** spies for 2,500 years, from
    invisible ink to Second World War microdots · **Status:** current in niches (watermarks, data hidden in
    images), never trusted alone, because knowing the method gives up every message ·
    **Replaced by:** cryptography, which keeps working when the method is known

**Cryptography** ("hidden writing") takes the other road. It lets the enemy see
the message and makes it useless to them. The message, the **plaintext**, is
transformed by a **cipher** into a **ciphertext**, under the control of a
**key** that only the intended reader holds. Turning plaintext into ciphertext
is **encryption**; turning it back is **decryption**. Breaking a cipher without
the key is **cryptanalysis**, and the whole field, making and breaking, is
**cryptology**.

<figure class="mars-fig">
<svg viewBox="0 0 620 250" width="620" role="img" aria-label="Two ways to beat a watched road: hide the message, or let it be seen and make it unreadable" xmlns="http://www.w3.org/2000/svg">
<text x="16" y="22" font-size="14" text-anchor="start" fill="currentColor" font-weight="bold">Steganography: hide that there is a message</text>
<rect x="16" y="62" width="120" height="36" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="16" y="62" width="120" height="36" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="76" y="84.5" font-size="13" text-anchor="middle" fill="currentColor">Histiaeus</text>
<rect x="484" y="62" width="120" height="36" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="484" y="62" width="120" height="36" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="544" y="84.5" font-size="13" text-anchor="middle" fill="currentColor">Aristagoras</text>
<line x1="136" y1="80" x2="275" y2="80" stroke="currentColor" stroke-width="1.5"/>
<polygon points="282,80 274,83.6 274,76.4" fill="currentColor"/>
<line x1="338" y1="80" x2="477" y2="80" stroke="currentColor" stroke-width="1.5"/>
<polygon points="484,80 476,83.6 476,76.4" fill="currentColor"/>
<circle cx="310" cy="80" r="22" fill="none" stroke="currentColor" stroke-width="1.5"/>
<path d="M288 74 Q310 44 332 74" stroke="currentColor" stroke-width="3" fill="none"/>
<text x="310" y="86" font-size="12" text-anchor="middle" fill="currentColor" class="acc-fill" font-style="italic">msg</text>
<text x="310" y="118" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">message tattooed under the hair</text>
<text x="310" y="44" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">guard: sees only a traveler</text>
<text x="16" y="142" font-size="14" text-anchor="start" fill="currentColor" font-weight="bold">Cryptography: hide what the message says</text>
<rect x="16" y="182" width="120" height="36" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="16" y="182" width="120" height="36" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="76" y="204.6" font-size="13" text-anchor="middle" fill="currentColor">Alice</text>
<rect x="484" y="182" width="120" height="36" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="484" y="182" width="120" height="36" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="544" y="204.6" font-size="13" text-anchor="middle" fill="currentColor">Bob</text>
<line x1="136" y1="200" x2="223" y2="200" stroke="currentColor" stroke-width="1.5"/>
<polygon points="230,200 222,203.6 222,196.4" fill="currentColor"/>
<line x1="390" y1="200" x2="477" y2="200" stroke="currentColor" stroke-width="1.5"/>
<polygon points="484,200 476,203.6 476,196.4" fill="currentColor"/>
<rect x="232" y="184" width="156" height="32" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="232" y="184" width="156" height="32" rx="6" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="310" y="204.6" font-size="13" text-anchor="middle" fill="currentColor">DWWDFN DW GDZQ</text>
<text x="310" y="164" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">Eve: sees the message, can't read it</text>
</svg>
<figcaption>Figure 1.1. Steganography hides that a message exists, so it fails completely once the trick is known. Cryptography lets the enemy see the message and still keeps its meaning.</figcaption>
</figure>

Today the hostile channel is the internet. Every message you send crosses
dozens of machines that belong to other people: your café's Wi-Fi router, your
internet provider, the backbone networks, the data center at the far end. Any
of them could read or change what passes through. Cryptography is the reason
that, in practice, they can't.

<figure class="mars-fig">
<svg viewBox="0 0 700 230" width="700" role="img" aria-label="Plaintext goes through encrypt with a key, crosses the internet as ciphertext watched by Eve, and decrypt with the key gives it back" xmlns="http://www.w3.org/2000/svg">
<text x="70" y="30" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">plaintext</text>
<rect x="10" y="40" width="120" height="40" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="10" y="40" width="120" height="40" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="70" y="64.2" font-size="12" text-anchor="middle" fill="currentColor">ATTACK AT DAWN</text>
<line x1="130" y1="60" x2="163" y2="60" stroke="currentColor" stroke-width="1.5"/>
<polygon points="170,60 162,63.6 162,56.4" fill="currentColor"/>
<rect x="170" y="40" width="100" height="40" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="170" y="40" width="100" height="40" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="220" y="64.5" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">encrypt</text>
<line x1="270" y1="60" x2="293" y2="60" stroke="currentColor" stroke-width="1.5"/>
<polygon points="300,60 292,63.6 292,56.4" fill="currentColor"/>
<rect x="300" y="20" width="100" height="120" rx="4" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 4"/>
<text x="350" y="36" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">the internet</text>
<rect x="305" y="44" width="90" height="32" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="305" y="44" width="90" height="32" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="350" y="64.2" font-size="12" text-anchor="middle" fill="currentColor">DWWDFN…</text>
<text x="350" y="98" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">ciphertext</text>
<line x1="400" y1="60" x2="423" y2="60" stroke="currentColor" stroke-width="1.5"/>
<polygon points="430,60 422,63.6 422,56.4" fill="currentColor"/>
<rect x="430" y="40" width="100" height="40" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="430" y="40" width="100" height="40" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="480" y="64.5" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">decrypt</text>
<line x1="530" y1="60" x2="563" y2="60" stroke="currentColor" stroke-width="1.5"/>
<polygon points="570,60 562,63.6 562,56.4" fill="currentColor"/>
<text x="630" y="30" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">plaintext</text>
<rect x="570" y="40" width="120" height="40" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="570" y="40" width="120" height="40" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="630" y="64.2" font-size="12" text-anchor="middle" fill="currentColor">ATTACK AT DAWN</text>
<circle cx="206" cy="120" r="6" fill="none" stroke="currentColor" stroke-width="2" class="acc"/>
<line x1="212" y1="120" x2="230" y2="120" stroke="currentColor" stroke-width="2" class="acc"/>
<line x1="224" y1="120" x2="224" y2="126" stroke="currentColor" stroke-width="2" class="acc"/>
<line x1="229" y1="120" x2="229" y2="125" stroke="currentColor" stroke-width="2" class="acc"/>
<line x1="220" y1="112" x2="220" y2="89" stroke="currentColor" stroke-width="1.5" class="acc"/>
<polygon points="220,82 223.6,90 216.4,90" fill="currentColor" class="acc-fill"/>
<text x="220" y="146" font-size="12" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">key</text>
<circle cx="466" cy="120" r="6" fill="none" stroke="currentColor" stroke-width="2" class="acc"/>
<line x1="472" y1="120" x2="490" y2="120" stroke="currentColor" stroke-width="2" class="acc"/>
<line x1="484" y1="120" x2="484" y2="126" stroke="currentColor" stroke-width="2" class="acc"/>
<line x1="489" y1="120" x2="489" y2="125" stroke="currentColor" stroke-width="2" class="acc"/>
<line x1="480" y1="112" x2="480" y2="89" stroke="currentColor" stroke-width="1.5" class="acc"/>
<polygon points="480,82 483.6,90 476.4,90" fill="currentColor" class="acc-fill"/>
<text x="480" y="146" font-size="12" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">key</text>
<line x1="350" y1="140" x2="350" y2="175" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 3"/>
<circle cx="350" cy="181" r="8" fill="none" stroke="currentColor" stroke-width="1.5"/>
<path d="M337 205 Q350 187 363 205" stroke="currentColor" stroke-width="1.5" fill="none"/>
<text x="350" y="221" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold"></text>
<text x="392" y="200" font-size="13" text-anchor="start" fill="currentColor" font-weight="bold">Eve</text>
<text x="350" y="226" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">sees only ciphertext</text>
<text x="70" y="110" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">Alice</text>
<text x="630" y="110" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">Bob</text>
</svg>
<figcaption>Figure 1.2. The words of this chapter in one picture. The method (encrypt, decrypt) is public; the key is the only secret. Eve sees everything that crosses the network and still learns nothing useful.</figcaption>
</figure>

## 1.2 Four jobs

People reach for cryptography to get one or more of these:

| Job | The question it answers | Tool |
|---|---|---|
| **Confidentiality** | Can anyone else read this? | a cipher: [AES](../04-symmetric-ciphers/AES.md), [ChaCha20](../04-symmetric-ciphers/ChaCha.md) |
| **Integrity** | Was it changed on the way? | a hash or a MAC: [SHA-2](../07-hash/SHA-2.md), [HMAC](../06-mac/HMAC.md) |
| **Authenticity** | Did it really come from them? | a MAC (shared key) or a signature (public key): [Ed25519](../02-signatures/EdDSA.md) |
| **Non-repudiation** | Can they later deny sending it? | a signature only, since a MAC key is shared and either side could have made the tag |

For most of history cryptography meant the first job. A general sent orders,
and the worry was the enemy reading them. Today the other three matter at
least as much. When your phone installs an update, nobody cares if the update
is secret; what matters is that it really came from the maker and that nobody
changed it on the way. That is a signature's job, and confidentiality plays no
part.

The jobs are separate, and getting one does not give you another. This is the
most common beginner's mistake, so it is worth two examples:

- **Encryption without integrity.** In [Chapter 4](04-Randomness-and-Perfect-Secrecy.md)
  you will meet the one-time pad, a cipher that is mathematically perfect at
  hiding. Yet anyone who flips a bit of its ciphertext flips the same bit of
  the plaintext, and the receiver can't tell. A bank transfer encrypted this
  way can have its amount changed by someone who can't read it.
- **Integrity without confidentiality.** A message with a MAC tag can't be
  changed without detection, but anyone on the line can read it.

Real systems therefore combine tools. Modern encryption comes as
**authenticated encryption**, which gives confidentiality, integrity and
authenticity in one step ([Chapter 10](10-Message-Authentication.md)).

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="A grid of five tools against four jobs: cipher gives confidentiality; MAC integrity and authenticity; authenticated encryption three; signature integrity, authenticity and non-repudiation" xmlns="http://www.w3.org/2000/svg">
<text x="254" y="36" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">Confidential</text>
<text x="362" y="36" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">Integrity</text>
<text x="470" y="36" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">Authentic</text>
<text x="578" y="36" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">Non-repud.</text>
<rect x="8" y="50" width="624" height="44" rx="0" class="soft" fill="currentColor"/>
<text x="16" y="70" font-size="13" text-anchor="start" fill="currentColor" font-weight="bold">Cipher</text>
<text x="16" y="86" font-size="12" text-anchor="start" fill="currentColor" font-style="italic">AES, ChaCha20</text>
<path d="M245.0 72.0 L251.0 79.0 L264.0 64.0" stroke="currentColor" stroke-width="3" fill="none" class="acc"/>
<line x1="357" y1="72" x2="367" y2="72" stroke="currentColor" stroke-width="1"/>
<line x1="465" y1="72" x2="475" y2="72" stroke="currentColor" stroke-width="1"/>
<line x1="573" y1="72" x2="583" y2="72" stroke="currentColor" stroke-width="1"/>
<text x="16" y="114" font-size="13" text-anchor="start" fill="currentColor" font-weight="bold">Hash</text>
<text x="16" y="130" font-size="12" text-anchor="start" fill="currentColor" font-style="italic">SHA-256</text>
<line x1="249" y1="116" x2="259" y2="116" stroke="currentColor" stroke-width="1"/>
<path d="M353.0 116.0 L359.0 123.0 L372.0 108.0" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="3 2"/>
<line x1="465" y1="116" x2="475" y2="116" stroke="currentColor" stroke-width="1"/>
<line x1="573" y1="116" x2="583" y2="116" stroke="currentColor" stroke-width="1"/>
<rect x="8" y="138" width="624" height="44" rx="0" class="soft" fill="currentColor"/>
<text x="16" y="158" font-size="13" text-anchor="start" fill="currentColor" font-weight="bold">MAC</text>
<text x="16" y="174" font-size="12" text-anchor="start" fill="currentColor" font-style="italic">HMAC</text>
<line x1="249" y1="160" x2="259" y2="160" stroke="currentColor" stroke-width="1"/>
<path d="M353.0 160.0 L359.0 167.0 L372.0 152.0" stroke="currentColor" stroke-width="3" fill="none" class="acc"/>
<path d="M461.0 160.0 L467.0 167.0 L480.0 152.0" stroke="currentColor" stroke-width="3" fill="none" class="acc"/>
<line x1="573" y1="160" x2="583" y2="160" stroke="currentColor" stroke-width="1"/>
<text x="16" y="202" font-size="13" text-anchor="start" fill="currentColor" font-weight="bold">Authenticated enc.</text>
<text x="16" y="218" font-size="12" text-anchor="start" fill="currentColor" font-style="italic">AES-GCM</text>
<path d="M245.0 204.0 L251.0 211.0 L264.0 196.0" stroke="currentColor" stroke-width="3" fill="none" class="acc"/>
<path d="M353.0 204.0 L359.0 211.0 L372.0 196.0" stroke="currentColor" stroke-width="3" fill="none" class="acc"/>
<path d="M461.0 204.0 L467.0 211.0 L480.0 196.0" stroke="currentColor" stroke-width="3" fill="none" class="acc"/>
<line x1="573" y1="204" x2="583" y2="204" stroke="currentColor" stroke-width="1"/>
<rect x="8" y="226" width="624" height="44" rx="0" class="soft" fill="currentColor"/>
<text x="16" y="246" font-size="13" text-anchor="start" fill="currentColor" font-weight="bold">Signature</text>
<text x="16" y="262" font-size="12" text-anchor="start" fill="currentColor" font-style="italic">Ed25519</text>
<line x1="249" y1="248" x2="259" y2="248" stroke="currentColor" stroke-width="1"/>
<path d="M353.0 248.0 L359.0 255.0 L372.0 240.0" stroke="currentColor" stroke-width="3" fill="none" class="acc"/>
<path d="M461.0 248.0 L467.0 255.0 L480.0 240.0" stroke="currentColor" stroke-width="3" fill="none" class="acc"/>
<path d="M569.0 248.0 L575.0 255.0 L588.0 240.0" stroke="currentColor" stroke-width="3" fill="none" class="acc"/>
<text x="320" y="296" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">dashed: only if the hash itself reaches you safely, since anyone can compute one</text>
</svg>
<figcaption>Figure 1.3. Which tool does which job. No single row is ticked in every column, and only a signature gives non-repudiation. That is why real protocols combine several tools.</figcaption>
</figure>

There are goals cryptography doesn't cover. It can't keep a server running
when someone floods it with traffic (**availability**), and it doesn't hide
*that* two people are talking, or how much, unless a protocol is built for it
(Tor and mixnets try). It can't protect a message on a phone that has
malware on it. Keep those limits in mind; attackers do.

## 1.3 The cast

The 1978 paper that introduced RSA described its protocol as messages between
"Alice" and "Bob", and the names stuck. Later writers added more characters:

- **Alice** and **Bob** want to talk.
- **Eve** eavesdrops: she sees every message but can't change them. She is a
  **passive** attacker.
- **Mallory** (sometimes Mallet) is the **active** attacker: she can drop,
  change, replay, reorder and invent messages, and pretend to be Alice to Bob
  and Bob to Alice at the same time (a **man-in-the-middle**).
- **Trent** is a trusted third party, such as a certificate authority.

Most of the real trouble comes from Mallory. Plenty of systems that keep Eve
out fall to someone who can change a few bytes in flight. When you read about
an attack, the first question is always which of the two it needs.

<figure class="mars-fig">
<svg viewBox="0 0 620 260" width="620" role="img" aria-label="Top: Eve copies traffic between Alice and Bob. Bottom: Mallory sits between them and forwards altered messages" xmlns="http://www.w3.org/2000/svg">
<text x="16" y="20" font-size="14" text-anchor="start" fill="currentColor" font-weight="bold">Eve, passive: listens</text>
<circle cx="60" cy="56" r="8" fill="none" stroke="currentColor" stroke-width="1.5"/>
<path d="M47 80 Q60 62 73 80" stroke="currentColor" stroke-width="1.5" fill="none"/>
<text x="60" y="96" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">Alice</text>
<circle cx="560" cy="56" r="8" fill="none" stroke="currentColor" stroke-width="1.5"/>
<path d="M547 80 Q560 62 573 80" stroke="currentColor" stroke-width="1.5" fill="none"/>
<text x="560" y="96" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">Bob</text>
<line x1="90" y1="66" x2="523" y2="66" stroke="currentColor" stroke-width="1.5"/>
<polygon points="530,66 522,69.6 522,62.4" fill="currentColor"/>
<line x1="310" y1="66" x2="310" y2="92" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 3"/>
<rect x="250" y="92" width="120" height="28" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="250" y="92" width="120" height="28" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="310" y="110.2" font-size="12" text-anchor="middle" fill="currentColor">Eve: a copy</text>
<text x="16" y="150" font-size="14" text-anchor="start" fill="currentColor" font-weight="bold">Mallory, active: sits in the middle</text>
<circle cx="60" cy="186" r="8" fill="none" stroke="currentColor" stroke-width="1.5"/>
<path d="M47 210 Q60 192 73 210" stroke="currentColor" stroke-width="1.5" fill="none"/>
<text x="60" y="226" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">Alice</text>
<circle cx="560" cy="186" r="8" fill="none" stroke="currentColor" stroke-width="1.5"/>
<path d="M547 210 Q560 192 573 210" stroke="currentColor" stroke-width="1.5" fill="none"/>
<text x="560" y="226" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">Bob</text>
<line x1="90" y1="196" x2="233" y2="196" stroke="currentColor" stroke-width="1.5"/>
<polygon points="240,196 232,199.6 232,192.4" fill="currentColor"/>
<rect x="242" y="176" width="136" height="40" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="242" y="176" width="136" height="40" rx="6" class="soft-acc" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<rect x="242" y="176" width="136" height="40" rx="6" fill="none" stroke="currentColor" class="acc" stroke-width="2"/>
<text x="310" y="200.6" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">Mallory</text>
<line x1="378" y1="196" x2="523" y2="196" stroke="currentColor" stroke-width="1.5" class="acc"/>
<polygon points="530,196 522,199.6 522,192.4" fill="currentColor" class="acc-fill"/>
<text x="310" y="236" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">reads, changes, drops, replays, invents</text>
<text x="310" y="252" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">and pretends to be each side to the other</text>
</svg>
<figcaption>Figure 1.4. Eve can only listen. Mallory controls the line: everything Bob receives has passed through her hands. Many systems that keep Eve out fall to Mallory.</figcaption>
</figure>

The names have their own small history. Ron Rivest, Adi Shamir and Leonard
Adleman needed two parties for the paper describing RSA, and instead of "A"
and "B" wrote Alice and Bob. Later writers added Eve, Mallory, Trent and the
rest, and Bruce Schneier's *Applied Cryptography* (1994) made the whole cast
familiar. Today it is a shared language: say "Mallory" and every cryptographer
knows the attacker can change messages.

## 1.4 Two kinds of keys

**Secret-key (symmetric) cryptography.** Alice and Bob share one key. The same
key locks and unlocks. It is fast, and it is how almost all data is actually
encrypted. Its problem is getting the key to both sides in the first place:
for most of history that meant a trusted courier, and for an army or an
embassy it meant printing, guarding and distributing books of keys. With $n$
people who all want to talk privately in pairs, you need $n(n-1)/2$ keys: a
company of 10,000 people would need about 50 million.

<figure class="mars-fig">
<svg viewBox="0 0 600 260" width="600" role="img" aria-label="Left: six dots with every pair joined, fifteen lines. Right: six dots each linked once to a public directory" xmlns="http://www.w3.org/2000/svg">
<text x="150" y="22" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">6 people, shared keys: 15</text>
<line x1="150" y1="50" x2="223.6" y2="92.5" stroke="currentColor" stroke-width="1.2" class="acc"/>
<line x1="150" y1="50" x2="223.6" y2="177.5" stroke="currentColor" stroke-width="1.2" class="acc"/>
<line x1="150" y1="50" x2="150" y2="220" stroke="currentColor" stroke-width="1.2" class="acc"/>
<line x1="150" y1="50" x2="76.4" y2="177.5" stroke="currentColor" stroke-width="1.2" class="acc"/>
<line x1="150" y1="50" x2="76.4" y2="92.5" stroke="currentColor" stroke-width="1.2" class="acc"/>
<line x1="223.6" y1="92.5" x2="223.6" y2="177.5" stroke="currentColor" stroke-width="1.2" class="acc"/>
<line x1="223.6" y1="92.5" x2="150" y2="220" stroke="currentColor" stroke-width="1.2" class="acc"/>
<line x1="223.6" y1="92.5" x2="76.4" y2="177.5" stroke="currentColor" stroke-width="1.2" class="acc"/>
<line x1="223.6" y1="92.5" x2="76.4" y2="92.5" stroke="currentColor" stroke-width="1.2" class="acc"/>
<line x1="223.6" y1="177.5" x2="150" y2="220" stroke="currentColor" stroke-width="1.2" class="acc"/>
<line x1="223.6" y1="177.5" x2="76.4" y2="177.5" stroke="currentColor" stroke-width="1.2" class="acc"/>
<line x1="223.6" y1="177.5" x2="76.4" y2="92.5" stroke="currentColor" stroke-width="1.2" class="acc"/>
<line x1="150" y1="220" x2="76.4" y2="177.5" stroke="currentColor" stroke-width="1.2" class="acc"/>
<line x1="150" y1="220" x2="76.4" y2="92.5" stroke="currentColor" stroke-width="1.2" class="acc"/>
<line x1="76.4" y1="177.5" x2="76.4" y2="92.5" stroke="currentColor" stroke-width="1.2" class="acc"/>
<circle cx="150" cy="50" r="9" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<circle cx="223.6" cy="92.5" r="9" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<circle cx="223.6" cy="177.5" r="9" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<circle cx="150" cy="220" r="9" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<circle cx="76.4" cy="177.5" r="9" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<circle cx="76.4" cy="92.5" r="9" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="450" y="22" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">6 people, key pairs: 6</text>
<line x1="450" y1="96.8" x2="450" y2="59" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3"/>
<line x1="483.1" y1="115.9" x2="515.8" y2="97" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3"/>
<line x1="483.1" y1="154.1" x2="515.8" y2="173" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3"/>
<line x1="450" y1="173.2" x2="450" y2="211" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3"/>
<line x1="416.9" y1="154.1" x2="384.2" y2="173" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3"/>
<line x1="416.9" y1="115.9" x2="384.2" y2="97" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3"/>
<rect x="410" y="120" width="80" height="30" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="410" y="120" width="80" height="30" rx="6" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="450" y="139.2" font-size="12" text-anchor="middle" fill="currentColor">directory</text>
<circle cx="450" cy="50" r="9" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<circle cx="523.6" cy="92.5" r="9" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<circle cx="523.6" cy="177.5" r="9" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<circle cx="450" cy="220" r="9" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<circle cx="376.4" cy="177.5" r="9" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<circle cx="376.4" cy="92.5" r="9" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="150" y="250" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">n(n−1)/2 keys: 10,000 people need 49,995,000</text>
<text x="450" y="250" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">n pairs; public halves can be listed openly</text>
</svg>
<figcaption>Figure 1.5. Why secret keys don't scale. Every pair of people needs its own key, so the count grows like the square of the group; with public keys each person needs one pair.</figcaption>
</figure>

**Public-key (asymmetric) cryptography.** Each person has a pair of keys: a
public key anyone may have and a private key only its owner holds. Anyone can
lock a box with Bob's public key; only Bob can open it. Bob can sign with his
private key and anyone can check the signature with his public one. It was
discovered in the 1970s twice: in secret at GCHQ in Britain (1970 to 1974) and
in public at Stanford and MIT (1976 and 1977). It solved the courier problem.
It is also much slower, so real systems use it only to agree on a secret key
or to sign, then switch to symmetric ciphers for the data.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="Left: Alice and Bob hold copies of one key. Right: Bob publishes a padlock and keeps the only key that opens it" xmlns="http://www.w3.org/2000/svg">
<text x="150" y="22" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">Secret key: one shared key</text>
<circle cx="60" cy="66" r="8" fill="none" stroke="currentColor" stroke-width="1.5"/>
<path d="M47 90 Q60 72 73 90" stroke="currentColor" stroke-width="1.5" fill="none"/>
<text x="60" y="106" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">Alice</text>
<circle cx="240" cy="66" r="8" fill="none" stroke="currentColor" stroke-width="1.5"/>
<path d="M227 90 Q240 72 253 90" stroke="currentColor" stroke-width="1.5" fill="none"/>
<text x="240" y="106" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">Bob</text>
<circle cx="42" cy="128" r="6" fill="none" stroke="currentColor" stroke-width="2" class="acc"/>
<line x1="48" y1="128" x2="66" y2="128" stroke="currentColor" stroke-width="2" class="acc"/>
<line x1="60" y1="128" x2="60" y2="134" stroke="currentColor" stroke-width="2" class="acc"/>
<line x1="65" y1="128" x2="65" y2="133" stroke="currentColor" stroke-width="2" class="acc"/>
<circle cx="222" cy="128" r="6" fill="none" stroke="currentColor" stroke-width="2" class="acc"/>
<line x1="228" y1="128" x2="246" y2="128" stroke="currentColor" stroke-width="2" class="acc"/>
<line x1="240" y1="128" x2="240" y2="134" stroke="currentColor" stroke-width="2" class="acc"/>
<line x1="245" y1="128" x2="245" y2="133" stroke="currentColor" stroke-width="2" class="acc"/>
<text x="150" y="150" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">the same key on both sides</text>
<text x="150" y="168" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">it must be delivered secretly</text>
<line x1="320" y1="10" x2="320" y2="240" stroke="currentColor" stroke-width="0.8" stroke-dasharray="3 4"/>
<text x="480" y="22" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">Public key: a pair per person</text>
<circle cx="400" cy="66" r="8" fill="none" stroke="currentColor" stroke-width="1.5"/>
<path d="M387 90 Q400 72 413 90" stroke="currentColor" stroke-width="1.5" fill="none"/>
<text x="400" y="106" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">Alice</text>
<circle cx="560" cy="66" r="8" fill="none" stroke="currentColor" stroke-width="1.5"/>
<path d="M547 90 Q560 72 573 90" stroke="currentColor" stroke-width="1.5" fill="none"/>
<text x="560" y="106" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">Bob</text>
<rect x="430" y="120" width="20" height="15" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/>
<path d="M434 120 V113 A6 6 0 0 1 446 113 V116" stroke="currentColor" stroke-width="1.5" fill="none"/>
<text x="440" y="152" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">Bob's public key</text>
<text x="440" y="168" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">anyone may have it</text>
<circle cx="548" cy="128" r="6" fill="none" stroke="currentColor" stroke-width="2" class="acc"/>
<line x1="554" y1="128" x2="572" y2="128" stroke="currentColor" stroke-width="2" class="acc"/>
<line x1="566" y1="128" x2="566" y2="134" stroke="currentColor" stroke-width="2" class="acc"/>
<line x1="571" y1="128" x2="571" y2="133" stroke="currentColor" stroke-width="2" class="acc"/>
<text x="570" y="152" font-size="12" text-anchor="middle" fill="currentColor" class="acc-fill" font-style="italic">Bob's private key</text>
<text x="570" y="168" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">never leaves Bob</text>
<text x="480" y="210" font-size="12" text-anchor="middle" fill="currentColor">anyone locks with the public key;</text>
<text x="480" y="228" font-size="12" text-anchor="middle" fill="currentColor">only the private key opens</text>
<text x="150" y="210" font-size="12" text-anchor="middle" fill="currentColor">fast: used for almost all data</text>
<text x="150" y="228" font-size="12" text-anchor="middle" fill="currentColor">problem: getting the key there</text>
</svg>
<figcaption>Figure 1.6. The two kinds of cryptography. A shared key is fast but has to travel; a key pair lets the public half travel in the open.</figcaption>
</figure>

**How public keys were found.** The story is a good one, because it happened
twice. In 1970 James Ellis, an engineer at GCHQ, Britain's signals
intelligence agency, asked whether two people could communicate secretly
without first sharing a secret, and convinced himself it was possible in
principle. In 1973 Clifford Cocks, a young mathematician who had just joined,
heard the problem and, by his own account in a single evening, found a working
method: essentially RSA.
In 1974 his friend Malcolm Williamson found what is now called Diffie-Hellman
key exchange. All of it stayed classified. In public, Whitfield Diffie and
Martin Hellman at Stanford published "New Directions in Cryptography" in
November 1976, building on Ralph Merkle's idea of key agreement through
puzzles, and in April 1977 Rivest, Shamir and Adleman at MIT found RSA. GCHQ
told its side of the story only in 1997. The public discovery is the one that
changed the world: within twenty years every web browser carried it.

!!! note "Life story: public-key cryptography"
    **Born:** 1970 to 1974 in secret at GCHQ (Ellis, Cocks, Williamson); 1976 to 1977 in public at Stanford
    (Diffie, Hellman, Merkle) and MIT (Rivest, Shamir, Adleman) · **Purpose:** let strangers set up a secret and
    sign messages without a courier · **Helped:** made secure web shopping, software updates, SSH and messaging
    possible · **Status:** current, but RSA and elliptic curves fall to a large quantum computer, so the
    post-quantum standards of 2024 are taking over ([Chapter 20](20-Quantum-Computers.md))

Real systems put the two together, as in the next figure.

<figure class="mars-fig">
<svg viewBox="0 0 640 150" width="640" role="img" aria-label="Public-key step produces a fresh secret key, which a fast secret-key cipher then uses for the data" xmlns="http://www.w3.org/2000/svg">
<rect x="10" y="40" width="180" height="56" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="10" y="40" width="180" height="56" rx="6" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="100" y="65" font-size="13" text-anchor="middle" fill="currentColor">public key</text>
<text x="100" y="80" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic">slow, used once</text>
<line x1="190" y1="68" x2="233" y2="68" stroke="currentColor" stroke-width="1.5"/>
<polygon points="240,68 232,71.6 232,64.4" fill="currentColor"/>
<circle cx="248" cy="68" r="6" fill="none" stroke="currentColor" stroke-width="2" class="acc"/>
<line x1="254" y1="68" x2="272" y2="68" stroke="currentColor" stroke-width="2" class="acc"/>
<line x1="266" y1="68" x2="266" y2="74" stroke="currentColor" stroke-width="2" class="acc"/>
<line x1="271" y1="68" x2="271" y2="73" stroke="currentColor" stroke-width="2" class="acc"/>
<text x="262" y="100" font-size="12" text-anchor="middle" fill="currentColor" class="acc-fill" font-style="italic">fresh secret key</text>
<line x1="280" y1="68" x2="323" y2="68" stroke="currentColor" stroke-width="1.5"/>
<polygon points="330,68 322,71.6 322,64.4" fill="currentColor"/>
<rect x="330" y="40" width="180" height="56" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="330" y="40" width="180" height="56" rx="6" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="420" y="65" font-size="13" text-anchor="middle" fill="currentColor">secret-key cipher</text>
<text x="420" y="80" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic">fast, all the data</text>
<line x1="510" y1="68" x2="553" y2="68" stroke="currentColor" stroke-width="1.5"/>
<polygon points="560,68 552,71.6 552,64.4" fill="currentColor"/>
<rect x="560" y="40" width="70" height="56" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="560" y="40" width="70" height="56" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="595" y="72.5" font-size="13" text-anchor="middle" fill="currentColor">data</text>
<text x="320" y="24" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">agree on (or send) a key, then switch</text>
<text x="320" y="134" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">TLS, SSH, Signal and PGP all work this way</text>
</svg>
<figcaption>Figure 1.7. Hybrid encryption: the slow public-key step runs once to set up a key, and a fast cipher does the bulk work.</figcaption>
</figure>

Part II of this book is about secret-key cryptography and Part III about
public-key. Every protocol in Part IV, from [TLS](../protocols/TLS-1.3.md) to
[Signal](../protocols/Signal.md), is a mix of the two.

## 1.5 The method is not the secret

In 1883 Auguste Kerckhoffs, a Dutch-born professor of languages working in
France, published *La cryptographie militaire*. The telegraph had changed what
a military cipher had to do: a cipher used by a whole army, with equipment in
thousands of hands, would certainly be captured. He set out six requirements.
The second is the one that lasted: the system must not need to be secret, and
it must be able to fall into the enemy's hands without harm. Claude Shannon
put it more bluntly in 1949: "the enemy knows the system."

This is **Kerckhoffs's principle**: all the secrecy goes into the key, and the
method is assumed known. The reasons are practical.

1. **Methods leak.** A cipher built into millions of phones or cards will be
   captured, copied, disassembled or explained by a former employee. A key can
   be changed in a second; a method takes years to replace.
2. **One key per user is manageable.** A method shared by everyone is a single
   point of failure.
3. **Only public methods get tested.** A cipher that thousands of experts
   have attacked for years and failed to break is far more trustworthy than one
   that four people at one company believe in.

The third point is why the main modern algorithms were chosen in open
competitions where anyone could try to break the entries: AES (1997 to 2000),
SHA-3 (2007 to 2012) and the post-quantum standards (2016 to 2024).

History has a long list of secret designs that failed once someone looked:

- the GSM phone ciphers A5/1 and A5/2, reverse-engineered in 1999 and then
  broken (A5/2 in real time);
- the DVD's Content Scramble System, whose 40-bit key fell the same year to
  DeCSS;
- the MIFARE Classic transit-card cipher, reverse-engineered from the chip in
  2008, after which cards could be cloned in seconds.

<figure class="mars-fig">
<svg viewBox="0 0 660 230" width="660" role="img" aria-label="Timeline 1995 to 2025: bars for the AES, SHA-3 and post-quantum competitions; crosses for A5/1, CSS and MIFARE Classic broken after being reverse-engineered" xmlns="http://www.w3.org/2000/svg">
<line x1="40" y1="180" x2="640" y2="180" stroke="currentColor" stroke-width="1.5"/>
<line x1="40" y1="180" x2="40" y2="185" stroke="currentColor" stroke-width="1.5"/>
<text x="40" y="200" font-size="12" text-anchor="middle" fill="currentColor">1995</text>
<line x1="140" y1="180" x2="140" y2="185" stroke="currentColor" stroke-width="1.5"/>
<text x="140" y="200" font-size="12" text-anchor="middle" fill="currentColor">2000</text>
<line x1="240" y1="180" x2="240" y2="185" stroke="currentColor" stroke-width="1.5"/>
<text x="240" y="200" font-size="12" text-anchor="middle" fill="currentColor">2005</text>
<line x1="340" y1="180" x2="340" y2="185" stroke="currentColor" stroke-width="1.5"/>
<text x="340" y="200" font-size="12" text-anchor="middle" fill="currentColor">2010</text>
<line x1="440" y1="180" x2="440" y2="185" stroke="currentColor" stroke-width="1.5"/>
<text x="440" y="200" font-size="12" text-anchor="middle" fill="currentColor">2015</text>
<line x1="540" y1="180" x2="540" y2="185" stroke="currentColor" stroke-width="1.5"/>
<text x="540" y="200" font-size="12" text-anchor="middle" fill="currentColor">2020</text>
<line x1="640" y1="180" x2="640" y2="185" stroke="currentColor" stroke-width="1.5"/>
<text x="640" y="200" font-size="12" text-anchor="middle" fill="currentColor">2025</text>
<text x="10" y="34" font-size="13" text-anchor="start" fill="currentColor" font-weight="bold">open competitions</text>
<rect x="80" y="48" width="60" height="20" rx="3" class="soft-acc" fill="currentColor"/>
<rect x="80" y="48" width="60" height="20" rx="3" fill="none" stroke="currentColor" class="acc" stroke-width="1.5"/>
<text x="146" y="63" font-size="12" text-anchor="start" fill="currentColor">AES 1997–2000</text>
<rect x="280" y="78" width="100" height="20" rx="3" class="soft-acc" fill="currentColor"/>
<rect x="280" y="78" width="100" height="20" rx="3" fill="none" stroke="currentColor" class="acc" stroke-width="1.5"/>
<text x="386" y="93" font-size="12" text-anchor="start" fill="currentColor">SHA-3 2007–2012</text>
<rect x="460" y="108" width="160" height="20" rx="3" class="soft-acc" fill="currentColor"/>
<rect x="460" y="108" width="160" height="20" rx="3" fill="none" stroke="currentColor" class="acc" stroke-width="1.5"/>
<text x="454" y="123" font-size="12" text-anchor="end" fill="currentColor">post-quantum 2016–2024</text>
<text x="10" y="146" font-size="13" text-anchor="start" fill="currentColor" font-weight="bold">secret designs, broken once seen</text>
<path d="M114.0 174 L126.0 186 M114.0 186 L126.0 174" stroke="currentColor" stroke-width="2.5" fill="none"/>
<text x="130" y="170" font-size="12" text-anchor="start" fill="currentColor" font-style="italic">A5/1, A5/2 and CSS (1999)</text>
<path d="M294.0 174 L306.0 186 M294.0 186 L306.0 174" stroke="currentColor" stroke-width="2.5" fill="none"/>
<text x="310" y="170" font-size="12" text-anchor="start" fill="currentColor" font-style="italic">MIFARE Classic (2008)</text>
</svg>
<figcaption>Figure 1.8. Kerckhoffs in practice. The algorithms everyone relies on today were chosen in public contests where anyone could attack them; the secret designs of the same years fell as soon as someone looked inside.</figcaption>
</figure>

Kerckhoffs doesn't say a method must be published, only that its security
must not depend on staying unpublished. Governments still keep some military
algorithms classified, but they design them to survive capture. See the
[FAQ](../FAQ.md#can-i-keep-the-algorithm-secret-instead-of-the-key).

!!! note "Life story: Kerckhoffs's principle"
    **Born:** 1883, Paris, in Auguste Kerckhoffs's *La cryptographie militaire* · **Purpose:** rules for field
    ciphers in the telegraph age, when equipment would surely be captured · **Helped:** restated by Shannon in
    1949 ("the enemy knows the system"); it is why AES, SHA-3 and the post-quantum algorithms were chosen in
    public contests · **Status:** current; every system that ignored it (A5/1, CSS, MIFARE Classic) paid for it

## 1.6 How attackers come at you

*Level: intermediate.* Attacks are sorted by what the attacker gets to see or
do. Each step down the list is a stronger attacker, and a modern cipher must
survive all of them.

| Attack | The attacker has | A real case |
|---|---|---|
| **Ciphertext only** | intercepted messages | al-Kindi's frequency analysis, 9th century Baghdad ([Chapter 2](02-Classical-Ciphers.md)) |
| **Known plaintext** | some messages together with their decryptions | Bletchley Park's "cribs": German weather reports said *WETTER* in a predictable place |
| **Chosen plaintext** | the power to get messages of their choice encrypted | Midway, 1942 (below) |
| **Chosen ciphertext** | the power to get ciphertexts of their choice decrypted, or just to learn whether decryption failed | Daniel Bleichenbacher's 1998 attack on RSA in SSL, which needed only "padding good" or "padding bad" |

<figure class="mars-fig">
<svg viewBox="0 0 640 260" width="640" role="img" aria-label="A staircase of four attack models, rising from ciphertext only to chosen ciphertext, each with a historical case" xmlns="http://www.w3.org/2000/svg">
<rect x="20" y="190" width="600" height="40" rx="4" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="28" y="208" font-size="13" text-anchor="start" fill="currentColor" font-weight="bold">Ciphertext only</text>
<rect x="160" y="146" width="460" height="84" rx="4" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="168" y="164" font-size="13" text-anchor="start" fill="currentColor" font-weight="bold">Known plaintext</text>
<rect x="300" y="102" width="320" height="128" rx="4" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="308" y="120" font-size="13" text-anchor="start" fill="currentColor" font-weight="bold">Chosen plaintext</text>
<rect x="440" y="58" width="180" height="172" rx="4" class="soft-acc" fill="currentColor"/>
<rect x="440" y="58" width="180" height="172" rx="4" fill="none" stroke="currentColor" class="acc" stroke-width="1.5"/>
<text x="448" y="76" font-size="13" text-anchor="start" fill="currentColor" font-weight="bold">Chosen ciphertext</text>
<line x1="30" y1="250" x2="603" y2="250" stroke="currentColor" stroke-width="1.5" class="acc"/>
<polygon points="610,250 602,253.6 602,246.4" fill="currentColor" class="acc-fill"/>
<rect x="231.2" y="232.6" width="177.6" height="15.6" style="fill: var(--md-default-bg-color)"/>
<text x="320" y="244" font-size="12" text-anchor="middle" fill="currentColor" class="acc-fill">more power to the attacker</text>
<text x="28" y="224" font-size="12" text-anchor="start" fill="currentColor" font-style="italic">al-Kindi, 9th c.</text>
<text x="168" y="180" font-size="12" text-anchor="start" fill="currentColor" font-style="italic">Bletchley cribs</text>
<text x="308" y="136" font-size="12" text-anchor="start" fill="currentColor" font-style="italic">Midway, 1942</text>
<text x="448" y="92" font-size="12" text-anchor="start" fill="currentColor" font-style="italic">Bleichenbacher, 1998</text>
<text x="20" y="20" font-size="13" text-anchor="start" fill="currentColor" font-style="italic">each step adds a power to the one below</text>
</svg>
<figcaption>Figure 1.9. The attack models as a staircase: each attacker can do everything the one below can, and more. A modern cipher must hold at the top step.</figcaption>
</figure>

**Chosen plaintext at Midway.** In May 1942 US Navy codebreakers in Hawaii were
reading parts of the Japanese naval code JN-25 and saw that the next target was
called "AF". They suspected Midway. On their suggestion, the base at Midway sent
an unencrypted message saying its water plant had broken down. Soon an
intercepted Japanese message reported that "AF" was short of water. The
Japanese had encrypted a plaintext the Americans had chosen, and in doing so
confirmed the target. Bletchley Park did the same in Europe: the RAF sometimes
laid mines in particular spots ("gardening") so that German warnings would
contain place names the codebreakers knew.

<figure class="mars-fig">
<svg viewBox="0 0 640 320" width="640" role="img" aria-label="Message sequence: codebreakers ask Midway by cable to radio a false water shortage; Japan reports AF short of water; so AF is Midway" xmlns="http://www.w3.org/2000/svg">
<rect x="30" y="10" width="140" height="30" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="30" y="10" width="140" height="30" rx="6" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="100" y="29.6" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">US codebreakers</text>
<line x1="100" y1="40" x2="100" y2="225" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4"/>
<rect x="250" y="10" width="140" height="30" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="250" y="10" width="140" height="30" rx="6" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="320" y="29.6" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">Midway base</text>
<line x1="320" y1="40" x2="320" y2="225" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4"/>
<rect x="470" y="10" width="140" height="30" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="470" y="10" width="140" height="30" rx="6" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="540" y="29.6" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">Japanese navy</text>
<line x1="540" y1="40" x2="540" y2="225" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4"/>
<line x1="100" y1="80" x2="313" y2="80" stroke="currentColor" stroke-width="1.5"/>
<polygon points="320,80 312,83.6 312,76.4" fill="currentColor"/>
<rect x="147.6" y="46.6" width="124.8" height="15.6" style="fill: var(--md-default-bg-color)"/>
<text x="210" y="58" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">by undersea cable:</text>
<rect x="124.5" y="60.6" width="171" height="15.6" style="fill: var(--md-default-bg-color)"/>
<text x="210" y="72" font-size="12" text-anchor="middle" fill="currentColor">say the water plant broke</text>
<line x1="320" y1="140" x2="533" y2="140" stroke="currentColor" stroke-width="1.5" class="acc"/>
<polygon points="540,140 532,143.6 532,136.4" fill="currentColor" class="acc-fill"/>
<rect x="361" y="106.6" width="138" height="15.6" style="fill: var(--md-default-bg-color)"/>
<text x="430" y="118" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">radio, in the clear:</text>
<rect x="367.6" y="120.6" width="124.8" height="15.6" style="fill: var(--md-default-bg-color)"/>
<text x="430" y="132" font-size="12" text-anchor="middle" fill="currentColor">water plant broken</text>
<line x1="540" y1="200" x2="107" y2="200" stroke="currentColor" stroke-width="1.5" class="acc" stroke-dasharray="6 4"/>
<polygon points="100,200 108,196.4 108,203.6" fill="currentColor" class="acc-fill"/>
<rect x="188.3" y="166.6" width="263.4" height="15.6" style="fill: var(--md-default-bg-color)"/>
<text x="320" y="178" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">encrypted report, intercepted and read:</text>
<rect x="244.4" y="180.6" width="151.2" height="15.6" style="fill: var(--md-default-bg-color)"/>
<text x="320" y="192" font-size="12" text-anchor="middle" fill="currentColor">“AF is short of water”</text>
<rect x="30" y="230" width="140" height="44" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="30" y="230" width="140" height="44" rx="6" class="soft-acc" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<rect x="30" y="230" width="140" height="44" rx="6" fill="none" stroke="currentColor" class="acc" stroke-width="2"/>
<text x="100" y="256.6" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">AF = Midway</text>
</svg>
<figcaption>Figure 1.10. Chosen plaintext at Midway, May 1942. The Americans chose a plaintext, the Japanese encrypted it, and the codebreakers recognized it in the ciphertext.</figcaption>
</figure>

**Why the strongest model matters.** "Chosen ciphertext" sounds far-fetched:
why would anyone decrypt messages for an attacker? But a server that answers
"error" to a badly formed message *is* telling the attacker something about
the decryption. Bleichenbacher's attack sent about a million crafted messages to
an SSL server and read off a session key from the pattern of errors. The same
flaw was found again in 2017 (ROBOT) in products from many vendors. So modern
ciphers are designed to be safe even against the strongest model.

<figure class="mars-fig">
<svg viewBox="0 0 600 300" width="600" role="img" aria-label="Sequence chart: the attacker sends a million altered ciphertexts to an SSL server and from the yes or no answers recovers the session key" xmlns="http://www.w3.org/2000/svg">
<rect x="50" y="10" width="140" height="30" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="50" y="10" width="140" height="30" rx="6" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="120" y="29.6" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">Attacker</text>
<line x1="120" y1="40" x2="120" y2="225" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4"/>
<rect x="410" y="10" width="140" height="30" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="410" y="10" width="140" height="30" rx="6" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="480" y="29.6" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">SSL server</text>
<line x1="480" y1="40" x2="480" y2="225" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4"/>
<line x1="120" y1="70" x2="473" y2="70" stroke="currentColor" stroke-width="1.5" class="acc"/>
<polygon points="480,70 472,73.6 472,66.4" fill="currentColor" class="acc-fill"/>
<text x="300" y="62" font-size="12" text-anchor="middle" fill="currentColor">altered copy of a recorded ciphertext</text>
<line x1="480" y1="105" x2="127" y2="105" stroke="currentColor" stroke-width="1.5"/>
<polygon points="120,105 128,101.4 128,108.6" fill="currentColor"/>
<text x="300" y="97" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">“bad padding”</text>
<line x1="120" y1="140" x2="473" y2="140" stroke="currentColor" stroke-width="1.5" class="acc"/>
<polygon points="480,140 472,143.6 472,136.4" fill="currentColor" class="acc-fill"/>
<text x="300" y="132" font-size="12" text-anchor="middle" fill="currentColor">another altered copy</text>
<line x1="480" y1="175" x2="127" y2="175" stroke="currentColor" stroke-width="1.5"/>
<polygon points="120,175 128,171.4 128,178.6" fill="currentColor"/>
<text x="300" y="167" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">“padding OK”</text>
<text x="300" y="205" font-size="13" text-anchor="middle" fill="currentColor">⋮  about a million times  ⋮</text>
<rect x="30" y="230" width="180" height="44" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="30" y="230" width="180" height="44" rx="6" class="soft-acc" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<rect x="30" y="230" width="180" height="44" rx="6" fill="none" stroke="currentColor" class="acc" stroke-width="2"/>
<text x="120" y="256.6" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">the session key</text>
</svg>
<figcaption>Figure 1.11. Bleichenbacher's chosen-ciphertext attack (1998). The server never decrypts anything for the attacker; its one-word error messages are enough.</figcaption>
</figure>

Daniel Bleichenbacher, a Swiss cryptographer then at Bell Labs, presented the
attack at the CRYPTO conference in 1998. Its target was the "PKCS #1 v1.5"
way of padding a message before RSA encryption, which SSL used to send the
session key. Vendors patched it by making the error messages identical, but
the patch was easy to get subtly wrong: in 2017 Hanno Böck, Juraj Somorovsky
and Craig Young found the same oracle, under the name ROBOT, in products from
many vendors, nearly twenty years later.

!!! note "Life story: Bleichenbacher's attack"
    **Born:** 1998, Daniel Bleichenbacher at Bell Labs, against RSA with PKCS #1 v1.5 padding in SSL ·
    **Purpose:** show that an error message is a decryption oracle · **Helped:** made chosen-ciphertext security
    a requirement, and pushed the field to padding with a proof (OAEP) and to key exchange instead of key
    transport · **Retired:** largely with TLS 1.3 (RFC 8446, 2018), which removed RSA key transport, though
    ROBOT (2017) showed old servers still vulnerable · **Replaced by:** ephemeral Diffie-Hellman key exchange
    and RSA-OAEP

Two more kinds of attack don't fit the table:

- **Side channels.** The attacker measures the time, power, sound or
  electromagnetic noise of a device while it works with the key. A cipher with
  perfect mathematics can leak its key this way ([Chapter 18](18-Side-Channels.md)).
- **Attacks on people and procedures.** Stolen keys, bribed clerks, bad
  random numbers, reused keys and buggy code. Most real breaks are of this
  kind, and you will see dozens in this book.

## 1.7 How strong is strong?

*Level: intermediate.* Strength is measured in **bits of security**: a scheme
has $n$-bit security if the best known attack takes about $2^n$ basic
operations. Each extra bit doubles the attacker's work.

The simplest attack on any cipher is to try every key, a **brute-force** or
**exhaustive search**. A key of $n$ random bits has $2^n$ possible values, so
brute force costs $2^n$ trials at worst and $2^{n-1}$ on average. A cipher with
an $n$-bit key can therefore offer at most $n$-bit security; it offers exactly
that when nobody knows anything faster than brute force.

| Bits | Work | Meaning |
|---|---|---|
| 56 | $7.2 \times 10^{16}$ | DES; a machine costing 250,000 dollars found a key in 56 hours in 1998 |
| 80 | $1.2 \times 10^{24}$ | within reach of a large organization; retired |
| 112 | $5.2 \times 10^{33}$ | the minimum NIST allows today |
| 128 | $3.4 \times 10^{38}$ | the normal target: AES-128, X25519, ML-KEM-512 |
| 256 | $1.2 \times 10^{77}$ | for the long term; about a thousandth of the number of atoms in the observable universe ($10^{80}$) |

Turning bits into time is a one-line calculation. Suppose an attacker has a
billion computers, each trying a billion keys a second:

```python
YEAR = 365.25 * 24 * 3600
for bits in (40, 56, 64, 80, 112, 128):
    seconds = 2 ** bits / 1e18          # a billion computers, each trying a billion keys a second
    print(bits, f"{seconds:.3g} seconds", f"{seconds / YEAR:.3g} years")
```

```
40 1.1e-06 seconds 3.48e-14 years
56 0.0721 seconds 2.28e-09 years
64 18.4 seconds 5.85e-07 years
80 1.21e+06 seconds 0.0383 years
112 5.19e+15 seconds 1.65e+08 years
128 3.4e+20 seconds 1.08e+13 years
```

At 80 bits such an attacker needs two weeks. At 128 bits they need about 11
trillion years, nearly 800 times the age of the universe (13.8 billion years).
Nobody has a billion billion key-trials a second, but the whole Bitcoin network
came close to $10^{21}$ SHA-256 computations a second in 2025, so 80 bits is no
longer a safe margin against a determined, rich attacker. 128 bits is.

<figure class="mars-fig">
<svg viewBox="0 0 660 300" width="660" role="img" aria-label="Log-scale bars of years to search all keys at a billion billion tries a second: 40 bits a microsecond, 80 bits two weeks, 128 bits 11 trillion years" xmlns="http://www.w3.org/2000/svg">
<line x1="90" y1="24" x2="90" y2="226" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 3"/>
<text x="90" y="244" font-size="12" text-anchor="middle" fill="currentColor">10⁻¹⁵</text>
<line x1="183.1" y1="24" x2="183.1" y2="226" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 3"/>
<text x="183.1" y="244" font-size="12" text-anchor="middle" fill="currentColor">10⁻¹⁰</text>
<line x1="276.2" y1="24" x2="276.2" y2="226" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 3"/>
<text x="276.2" y="244" font-size="12" text-anchor="middle" fill="currentColor">10⁻⁵</text>
<line x1="369.3" y1="24" x2="369.3" y2="226" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 3"/>
<text x="369.3" y="244" font-size="12" text-anchor="middle" fill="currentColor">1</text>
<line x1="462.4" y1="24" x2="462.4" y2="226" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 3"/>
<text x="462.4" y="244" font-size="12" text-anchor="middle" fill="currentColor">10⁵</text>
<line x1="555.5" y1="24" x2="555.5" y2="226" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 3"/>
<text x="555.5" y="244" font-size="12" text-anchor="middle" fill="currentColor">10¹⁰</text>
<text x="80" y="49" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">40 bits</text>
<rect x="90" y="34" width="28.7" height="22" rx="2" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="124.7" y="49" font-size="12" text-anchor="start" fill="currentColor" font-style="italic">1 microsecond</text>
<text x="80" y="81" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">56 bits</text>
<rect x="90" y="66" width="118.4" height="22" rx="2" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="214.4" y="81" font-size="12" text-anchor="start" fill="currentColor" font-style="italic">0.07 seconds</text>
<text x="80" y="113" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">64 bits</text>
<rect x="90" y="98" width="163.3" height="22" rx="2" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="259.3" y="113" font-size="12" text-anchor="start" fill="currentColor" font-style="italic">18 seconds</text>
<text x="80" y="145" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">80 bits</text>
<rect x="90" y="130" width="252.9" height="22" rx="2" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="348.9" y="145" font-size="12" text-anchor="start" fill="currentColor" font-style="italic">2 weeks</text>
<text x="80" y="177" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">112 bits</text>
<rect x="90" y="162" width="432.3" height="22" rx="2" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="528.3" y="177" font-size="12" text-anchor="start" fill="currentColor" font-style="italic">165 million years</text>
<text x="80" y="209" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">128 bits</text>
<rect x="90" y="194" width="522" height="22" rx="2" class="soft-acc" fill="currentColor"/>
<rect x="90" y="194" width="522" height="22" rx="2" fill="none" stroke="currentColor" class="acc" stroke-width="1"/>
<text x="606" y="209" font-size="12" text-anchor="end" fill="currentColor" font-style="italic">11 trillion years</text>
<line x1="369.3" y1="20" x2="369.3" y2="226" stroke="currentColor" stroke-width="1.5" class="acc" stroke-dasharray="6 4"/>
<text x="369.3" y="16" font-size="12" text-anchor="middle" fill="currentColor" class="acc-fill">1 year</text>
<line x1="558.1" y1="20" x2="558.1" y2="226" stroke="currentColor" stroke-width="1.5" class="acc" stroke-dasharray="6 4"/>
<text x="558.1" y="16" font-size="12" text-anchor="middle" fill="currentColor" class="acc-fill">age of the universe</text>
<text x="360" y="294" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">years to try every key, at 10¹⁸ keys a second (log scale)</text>
</svg>
<figcaption>Figure 1.12. Bits into years, from the table in the code above. Every 10 bits multiply the time by about a thousand, so the bars climb steadily on a log scale; 128 bits passes the age of the universe by a factor of nearly 800.</figcaption>
</figure>

**The race against DES.** Brute force has a history of its own, and DES was
its great test. When DES was proposed with a 56-bit key, Diffie and Hellman
argued in 1977 that a special machine costing about 20 million dollars could
search its keys in about a day, and that the key should be longer. The
government disagreed, and DES became the standard anyway. Twenty years later
the argument was settled in public. In June 1997 the DESCHALL project, run by
volunteers over the internet, found a DES key after searching about a quarter
of the key space. In July 1998 the Electronic Frontier Foundation's machine
"Deep Crack", built for about 250,000 dollars, found one in 56 hours, and in
January 1999 Deep Crack and the volunteers of distributed.net together took
22 hours. DES was withdrawn as a standard in 2005, and AES, with keys of at
least 128 bits, took its place ([Chapter 6](06-Block-Ciphers.md)).

!!! note "Life story: exhaustive key search"
    **Born:** as old as keys; made a science by Diffie and Hellman's 1977 estimate for DES · **Purpose:** the
    attack that works on every cipher, so it sets the minimum key size · **Helped:** forced keys up from 40 and
    56 bits to 128 and 256; Deep Crack (1998) ended DES · **Status:** current as the yardstick: "$n$-bit
    security" means no attack does better than searching $2^n$ keys

Two warnings, both developed in later chapters:

- **Key length and security level are different things.** A 3072-bit RSA key
  gives about 128 bits of security, the same as a 256-bit elliptic-curve key,
  because the best attacks on each are very different ([Chapter 13](13-RSA.md),
  [Chapter 15](15-Elliptic-Curves.md)). A simple substitution cipher has about
  $2^{88}$ keys and falls to a pencil ([Chapter 2](02-Classical-Ciphers.md)).
- **Some attacks halve the bits.** Finding any two inputs with the same hash
  takes about $2^{n/2}$ work for an $n$-bit hash (the birthday bound,
  [Chapter 4](04-Randomness-and-Perfect-Secrecy.md)), and a large quantum
  computer would halve the security of key search
  ([Chapter 20](20-Quantum-Computers.md)).

The main [algorithm table](../index.md) lists the key size and the security
level of every algorithm on this site.

## 1.8 Code it: the four jobs in Python

*Level: intermediate.* You will build each of these tools from the inside in
later chapters. Here is what using them looks like.

**Integrity and authenticity with a shared key.** A MAC takes a key and a
message and produces a short **tag**. Only someone with the key can make a
valid tag, and any change to the message makes the old tag fail. Python's
standard library has HMAC ([Chapter 10](10-Message-Authentication.md)):

```python
import hmac, hashlib, secrets

key = secrets.token_bytes(32)                      # shared by the bank and you
msg = b"pay 100 dollars to Bob"
tag = hmac.new(key, msg, hashlib.sha256).digest()

def check(m, t):
    return hmac.compare_digest(hmac.new(key, m, hashlib.sha256).digest(), t)

print(check(msg, tag))                             # True: unchanged, and from someone with the key
print(check(b"pay 900 dollars to Bob", tag))       # False: Mallory changed it
print(check(msg, bytes(32)))                       # False: a made-up tag
```

Notice what it doesn't do: the message travels in the clear. Notice also
`compare_digest`. Comparing tags with `==` can stop at the first wrong byte,
and the time it takes tells an attacker how many bytes they have right
([Chapter 18](18-Side-Channels.md)).

**All four jobs with a real library.** Encryption and signatures need the
`cryptography` package (`pip install cryptography`). AES-GCM is authenticated
encryption: it hides the message and rejects any change. Ed25519 is a
signature scheme: Alice signs with her private key, and anyone with her public
key can check, which also means she can't later deny it.

```python
# pip install cryptography
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.exceptions import InvalidTag, InvalidSignature
import os

k = AESGCM.generate_key(bit_length=256)            # confidentiality + integrity, shared key
nonce = os.urandom(12)
box = AESGCM(k).encrypt(nonce, b"meet at the old mill", None)
print(AESGCM(k).decrypt(nonce, box, None))         # b'meet at the old mill'
bad = bytes([box[0] ^ 1]) + box[1:]                # flip one bit in transit
try:
    AESGCM(k).decrypt(nonce, bad, None)
except InvalidTag:
    print("tampering detected")

alice = Ed25519PrivateKey.generate()               # authenticity + non-repudiation, key pair
sig = alice.sign(b"I owe Bob 100 dollars")
alice.public_key().verify(sig, b"I owe Bob 100 dollars")   # passes silently
try:
    alice.public_key().verify(sig, b"I owe Bob 900 dollars")
except InvalidSignature:
    print("signature does not match")
```

It prints the message, then `tampering detected`, then `signature does not
match`. The `nonce` is a number used once; [Chapter 8](08-Modes-of-Operation.md)
explains why reusing it is a disaster.

## 1.9 Break it: where systems really fail

*Level: intermediate.* Strong mathematics is the part of cryptography that
usually holds. A few patterns account for most real failures, and each has a
chapter of its own later:

| Failure | A real case | Chapter |
|---|---|---|
| a secret, home-made design | A5/1 and A5/2 in GSM phones; MIFARE Classic | [2](02-Classical-Ciphers.md), [5](05-Stream-Ciphers.md) |
| a key too short | DES, found in 56 hours in 1998; 512-bit "export" RSA, factored in hours in 2015 (FREAK) | [6](06-Block-Ciphers.md), [13](13-RSA.md) |
| a key or nonce used twice | Venona (Soviet one-time pads printed twice, 1942); WEP Wi-Fi (2001); the PlayStation 3 signing key (2010) | [4](04-Randomness-and-Perfect-Secrecy.md), [14](14-Discrete-Log-Systems.md) |
| bad random numbers | Netscape SSL (1995); Debian OpenSSL (2008); Android Bitcoin wallets (2013) | [4](04-Randomness-and-Perfect-Secrecy.md) |
| encryption without integrity | padding-oracle attacks on CBC in TLS and web frameworks (2002 to 2013) | [8](08-Modes-of-Operation.md), [10](10-Message-Authentication.md) |
| an implementation that leaks | timing attacks on RSA (1996); Heartbleed (2014) | [18](18-Side-Channels.md) |
| a broken hash still in use | the Flame malware's forged Microsoft certificate, made with an MD5 collision (2012) | [9](09-Hash-Functions.md) |

The lesson is the one Enigma's history teaches ([Chapter 2](02-Classical-Ciphers.md)):
a system is broken through its weakest use, not its strongest theory. That
is why this book spends as long on how things fail as on how they work, and
why its first rule for practice is: **use well-tested libraries and standard
algorithms, and never invent your own** (see the
[FAQ](../FAQ.md#should-i-write-my-own-encryption-algorithm)).

## 1.10 Four thousand years in one page

The full story is in the [history appendix](../history/index.md); each
chapter of this book opens with the part of it that belongs there. Here is
the shape of the whole.

<figure class="mars-fig">
<svg viewBox="0 0 560 650" width="560" role="img" aria-label="Vertical timeline of twenty events from Egypt around 1900 BC to the post-quantum standards of 2024" xmlns="http://www.w3.org/2000/svg">
<text x="280" y="22" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">Four thousand years of secret writing (not to scale)</text>
<line x1="114" y1="36" x2="114" y2="618" stroke="currentColor" stroke-width="1.5"/>
<text x="100" y="49" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">c. 1900 BC</text>
<circle cx="114" cy="44" r="4" fill="currentColor"/>
<text x="128" y="49" font-size="13" text-anchor="start" fill="currentColor">Khnumhotep II's tomb: altered hieroglyphs</text>
<text x="100" y="79" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">c. 500 BC</text>
<circle cx="114" cy="74" r="4" fill="currentColor"/>
<text x="128" y="79" font-size="13" text-anchor="start" fill="currentColor">Atbash in the Hebrew Bible; Spartan skytale</text>
<text x="100" y="109" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">c. 50 BC</text>
<circle cx="114" cy="104" r="4" fill="currentColor"/>
<text x="128" y="109" font-size="13" text-anchor="start" fill="currentColor">Caesar shifts letters by three</text>
<text x="100" y="139" font-size="13" text-anchor="end" fill="currentColor" class="acc-fill" font-weight="bold">9th c.</text>
<circle cx="114" cy="134" r="5" fill="currentColor" class="acc-fill"/>
<text x="128" y="139" font-size="13" text-anchor="start" fill="currentColor">al-Kindi, Baghdad: frequency analysis</text>
<text x="100" y="169" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">1412</text>
<circle cx="114" cy="164" r="4" fill="currentColor"/>
<text x="128" y="169" font-size="13" text-anchor="start" fill="currentColor">al-Qalqashandi's encyclopedia</text>
<text x="100" y="199" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">c. 1467</text>
<circle cx="114" cy="194" r="4" fill="currentColor"/>
<text x="128" y="199" font-size="13" text-anchor="start" fill="currentColor">Alberti's cipher disk</text>
<text x="100" y="229" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">1553</text>
<circle cx="114" cy="224" r="4" fill="currentColor"/>
<text x="128" y="229" font-size="13" text-anchor="start" fill="currentColor">Bellaso's keyword cipher ("Vigenère")</text>
<text x="100" y="259" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">1587</text>
<circle cx="114" cy="254" r="4" fill="currentColor"/>
<text x="128" y="259" font-size="13" text-anchor="start" fill="currentColor">Mary, Queen of Scots, executed</text>
<text x="100" y="289" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">1863</text>
<circle cx="114" cy="284" r="4" fill="currentColor"/>
<text x="128" y="289" font-size="13" text-anchor="start" fill="currentColor">Kasiski publishes the Vigenère break</text>
<text x="100" y="319" font-size="13" text-anchor="end" fill="currentColor" class="acc-fill" font-weight="bold">1883</text>
<circle cx="114" cy="314" r="5" fill="currentColor" class="acc-fill"/>
<text x="128" y="319" font-size="13" text-anchor="start" fill="currentColor">Kerckhoffs: only the key is secret</text>
<text x="100" y="349" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">1917</text>
<circle cx="114" cy="344" r="4" fill="currentColor"/>
<text x="128" y="349" font-size="13" text-anchor="start" fill="currentColor">Zimmermann telegram read; Vernam's tape</text>
<text x="100" y="379" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">1932</text>
<circle cx="114" cy="374" r="4" fill="currentColor"/>
<text x="128" y="379" font-size="13" text-anchor="start" fill="currentColor">Rejewski reconstructs Enigma</text>
<text x="100" y="409" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">1939–45</text>
<circle cx="114" cy="404" r="4" fill="currentColor"/>
<text x="128" y="409" font-size="13" text-anchor="start" fill="currentColor">Bletchley Park, Colossus; code talkers</text>
<text x="100" y="439" font-size="13" text-anchor="end" fill="currentColor" class="acc-fill" font-weight="bold">1949</text>
<circle cx="114" cy="434" r="5" fill="currentColor" class="acc-fill"/>
<text x="128" y="439" font-size="13" text-anchor="start" fill="currentColor">Shannon: secrecy becomes a science</text>
<text x="100" y="469" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">1976–77</text>
<circle cx="114" cy="464" r="4" fill="currentColor"/>
<text x="128" y="469" font-size="13" text-anchor="start" fill="currentColor">Diffie–Hellman, RSA, DES</text>
<text x="100" y="499" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">1995</text>
<circle cx="114" cy="494" r="4" fill="currentColor"/>
<text x="128" y="499" font-size="13" text-anchor="start" fill="currentColor">SSL and SSH bring encryption to all</text>
<text x="100" y="529" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">2000</text>
<circle cx="114" cy="524" r="4" fill="currentColor"/>
<text x="128" y="529" font-size="13" text-anchor="start" fill="currentColor">AES chosen in an open contest</text>
<text x="100" y="559" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">2004</text>
<circle cx="114" cy="554" r="4" fill="currentColor"/>
<text x="128" y="559" font-size="13" text-anchor="start" fill="currentColor">Wang Xiaoyun's team breaks MD5</text>
<text x="100" y="589" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">2013</text>
<circle cx="114" cy="584" r="4" fill="currentColor"/>
<text x="128" y="589" font-size="13" text-anchor="start" fill="currentColor">Snowden documents; Dual_EC exposed</text>
<text x="100" y="619" font-size="13" text-anchor="end" fill="currentColor" class="acc-fill" font-weight="bold">2024</text>
<circle cx="114" cy="614" r="5" fill="currentColor" class="acc-fill"/>
<text x="128" y="619" font-size="13" text-anchor="start" fill="currentColor">NIST's first post-quantum standards</text>
</svg>
<figcaption>Figure 1.13. The shape of the story. Long stretches of hand ciphers, a burst of machines in the world wars, then mathematics and the internet in the last eighty years. Highlighted: the four turning points this chapter leans on.</figcaption>
</figure>

**Hiding and scrambling (before 800).** Around 1900 BC a scribe in the tomb of
[Khnumhotep II](../history/01-Ancient.md#egypt-the-scribe-who-changed-the-signs)
at Beni Hasan in Egypt swapped ordinary hieroglyphs for rare ones: the oldest
known deliberate change to a script, though not yet meant to hide anything.
A few centuries later a Mesopotamian potter wrote a glaze recipe in rare sign
values to guard a trade secret. The Hebrew Bible hides names with
[Atbash](../history/01-Ancient.md#the-hebrew-bible-atbash), which swaps the
alphabet end to end. Greek writers describe the Spartan skytale and hidden
messages; Polybius describes a 5 by 5 grid that turns letters into pairs of
numbers; Julius Caesar shifts letters three places. In China, military texts
of the Warring States period describe tallies whose lengths stand for fixed
messages, and letters cut into three parts carried by three messengers so
that no one of them could read it. In India the *Kama Sutra* lists secret
writing among the 64 arts. Sasanian Persian kings are said to have had a
secret script, though the sources are late and vague. These ciphers were
weak, and they mostly didn't need to be strong: few people could read at
all.

**The first science of breaking (800 to 1500).** In 9th-century Baghdad the
philosopher al-Kindi wrote the oldest surviving text on breaking ciphers. He
counted how often each letter appears and matched the counts to the
language: [frequency analysis](../history/02-Arab-Cryptanalysis.md#al-kindi-counting-letters).
Scholars in Damascus and Cairo built on it for five centuries, ending in
al-Qalqashandi's encyclopedia of 1412. For Byzantium, the neighbor and rival,
almost nothing has been studied, and the record is silent.

**Diplomats and black chambers (1400 to 1850).** Permanent embassies in the
Italian city-states created a daily need for ciphers. Leon Battista Alberti
built a cipher disk around 1467 that changed alphabets in mid-message;
Giovan Battista Bellaso's keyword cipher of 1553, later called "Vigenère",
was thought unbreakable for three centuries. Codebreaking became a government
office: Mary, Queen of Scots, was executed in 1587 after her ciphered letters
were read; France, Spain, England, Vienna and Russia ran "black chambers"
that opened, copied and resealed foreign mail. Korea's King Jeongjo ran
politics through secret letters in the 1790s; the Ottomans began diplomatic
ciphers in 1797; Washington's spies in the American Revolution used numbered
code books and invisible ink.

**Wires and radio (1850 to 1918).** The telegraph sent messages through
strangers' hands by the million. Charles Babbage, then Friedrich Kasiski in
1863, broke the Vigenère cipher. China's telegraph code of 1871 gave each
character a four-digit number, and Japan built its first official ciphers for
the new telegraph. Kerckhoffs wrote his rules in 1883. Radio in the First World
War let every side hear every message: British codebreakers read the
Zimmermann telegram in 1917, and Choctaw soldiers in 1918 became the first
code talkers. In 1917 Gilbert Vernam built the cipher that became the
one-time pad, the only one that can be proved unbreakable.

**Machines and the Second World War (1918 to 1945).** Rotor machines automated
the polyalphabetic cipher. In Warsaw in 1932, the mathematician Marian Rejewski
reconstructed the German army's Enigma from its messages; the Poles shared
everything with Britain and France five weeks before the war. Bletchley Park
then read Enigma at industrial scale, and built Colossus, one of the first
electronic computers, to break the Lorenz teleprinter cipher. The US read
Japan's Purple machine and naval code JN-25; Britain ran a codebreaking
center near Delhi; China ran a black chamber in Chongqing; Navajo, Comanche
and Meskwaki code talkers served in the US forces. After the war, the Venona
project read Soviet messages because some one-time pad pages had been printed
twice.

**Mathematics (1945 to 1990).** In 1949 Claude Shannon turned the craft into a
science and proved what perfect secrecy costs. In 1976 Whitfield Diffie and
Martin Hellman showed that two strangers could agree on a secret in public, and
RSA followed in 1977, the same year IBM's work became DES, the first public
standard cipher; GCHQ revealed in 1997 that its staff had found public keys
first.
Governments fought to keep strong cryptography for themselves (the "crypto
wars" over export rules, PGP and the Clipper chip), while a liberation movement,
the ANC in South Africa, ran its own encrypted network to reach Nelson Mandela
in prison.

**The internet (1990 to today).** SSL and SSH brought encryption to everyone's
traffic in 1995. AES, designed in Belgium, won an open worldwide competition
in 2000. Wang Xiaoyun's team in China broke MD5 and showed the way to break
SHA-1. National standards appeared in Japan (Camellia), Korea (ARIA), China
(the SM algorithms) and Russia (Kuznyechik). The Snowden documents of 2013
exposed a backdoored random generator; Let's Encrypt and the Signal protocol
made encryption the default for the web and for messaging.

**The quantum frontier.** Peter Shor showed in 1994 that a large quantum
computer would break RSA and elliptic curves. In August 2024 NIST published the
first post-quantum standards, Korea and China launched their own processes,
and hybrid post-quantum key exchange is now the default in SSH, major browsers
and Signal. [Chapter 20](20-Quantum-Computers.md) and the
[last history chapter](../history/10-Quantum-and-Post-Quantum.md) tell that
story.

Two threads run through all of it. Every cipher was trusted until someone
broke it, so the breakers drive the story as much as the makers. And the weak
point was rarely the mathematics; it was a reused key, a careless clerk, a
predictable message or a leaky machine.

## 1.11 Going deeper

*Level: expert.* Three ideas that sharpen everything above. Chapter 17 builds
them into proper definitions.

**How much has an attacker won?** "Broken" covers very different outcomes.
Lars Knudsen sorted attacks on ciphers, in the 1990s, roughly like this, from
worst to mildest:

1. **Total break:** the key is found.
2. **Global deduction:** a way to encrypt and decrypt like the key holder,
   without the key itself.
3. **Instance deduction:** one particular plaintext or ciphertext is
   recovered.
4. **Information deduction:** some partial information about the key or a
   plaintext (one bit, its length, whether two messages are equal).
5. **Distinguishing:** the attacker can tell the cipher's output from random
   data with better than even odds.

Modern designs aim to stop even the last one. That sounds pedantic, until you
see how often "a little information" grows into a full break: a cipher that
leaks one bit per message eventually leaks everything.

<figure class="mars-fig">
<svg viewBox="0 0 600 280" width="600" role="img" aria-label="Five stacked bars from total break at the top to distinguishing at the bottom, narrowing as the attack gets milder" xmlns="http://www.w3.org/2000/svg">
<rect x="20" y="20" width="560" height="40" rx="4" class="soft-acc" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="300" y="38" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">Total break</text>
<text x="300" y="54" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">the key is found</text>
<rect x="55" y="68" width="490" height="40" rx="4" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="300" y="86" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">Global deduction</text>
<text x="300" y="102" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">encrypt and decrypt without the key</text>
<rect x="90" y="116" width="420" height="40" rx="4" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="300" y="134" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">Instance deduction</text>
<text x="300" y="150" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">one message recovered</text>
<rect x="125" y="164" width="350" height="40" rx="4" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="300" y="182" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">Information deduction</text>
<text x="300" y="198" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">a bit, a length, an equality</text>
<rect x="160" y="212" width="280" height="40" rx="4" class="soft" fill="currentColor"/>
<rect x="160" y="212" width="280" height="40" rx="4" fill="none" stroke="currentColor" class="acc" stroke-width="1.5"/>
<text x="300" y="230" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">Distinguishing</text>
<text x="300" y="246" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">output told apart from random</text>
<text x="300" y="272" font-size="12" text-anchor="middle" fill="currentColor" class="acc-fill" font-style="italic">modern ciphers must resist even the bottom row</text>
</svg>
<figcaption>Figure 1.14. Knudsen's ladder of breaks, worst at the top. A modern design counts as broken if an attacker can reach even the narrowest rung.</figcaption>
</figure>

**Information-theoretic and computational security.** Shannon's 1949 paper
split security into two kinds. A cipher is **information-theoretically**
(or unconditionally) secure if an attacker with unlimited computing power still
learns nothing; the one-time pad is the main example, and
[Chapter 4](04-Randomness-and-Perfect-Secrecy.md) proves it. Shannon also
proved the price: the key must be at least as long as all the messages it ever
protects. Everything else in practice is **computationally** secure: breaking
it is possible in principle, but would take more work than anyone can do.
Almost all of this book is about computational security, and its claims always
have the form "no attacker with fewer than about $2^{128}$ operations
succeeds".

**Advantage.** To say "learns nothing" precisely, cryptographers play a game.
The challenger picks a secret bit $b$ at random, encrypts one of two messages
chosen by the attacker depending on $b$, and the attacker guesses $b$. Guessing
blindly wins half the time, so what counts is the **advantage**

$$
\mathrm{Adv}(\mathcal{A}) = \left\lvert \Pr[\mathcal{A} \text{ guesses } b] - \tfrac{1}{2} \right\rvert .
$$

A scheme with 128-bit security is one where every attacker running in time $t$
has advantage at most about $t / 2^{128}$. A cipher that let you guess right 51%
of the time, with no key and little work, would count as broken, even though it
reveals no message. This game, called **indistinguishability**, is the
foundation of [Chapter 17](17-Defining-Security.md).

<figure class="mars-fig">
<svg viewBox="0 0 600 300" width="600" role="img" aria-label="Sequence chart of the indistinguishability game: attacker sends two messages, challenger encrypts one chosen by a secret bit, attacker guesses the bit" xmlns="http://www.w3.org/2000/svg">
<rect x="50" y="10" width="140" height="30" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="50" y="10" width="140" height="30" rx="6" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="120" y="29.6" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">Attacker</text>
<line x1="120" y1="40" x2="120" y2="240" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4"/>
<rect x="410" y="10" width="140" height="30" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="410" y="10" width="140" height="30" rx="6" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="480" y="29.6" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">Challenger</text>
<line x1="480" y1="40" x2="480" y2="240" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4"/>
<line x1="120" y1="75" x2="473" y2="75" stroke="currentColor" stroke-width="1.5"/>
<polygon points="480,75 472,78.6 472,71.4" fill="currentColor"/>
<text x="300" y="67" font-size="12" text-anchor="middle" fill="currentColor">two messages m₀, m₁ of the same length</text>
<rect x="410" y="92" width="140" height="30" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="410" y="92" width="140" height="30" rx="6" class="soft-acc" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="480" y="111.2" font-size="12" text-anchor="middle" fill="currentColor">pick b = 0 or 1</text>
<line x1="480" y1="150" x2="127" y2="150" stroke="currentColor" stroke-width="1.5" class="acc"/>
<polygon points="120,150 128,146.4 128,153.6" fill="currentColor" class="acc-fill"/>
<text x="300" y="142" font-size="12" text-anchor="middle" fill="currentColor">c = Enc(k, m₀) if b = 0, Enc(k, m₁) if b = 1</text>
<rect x="50" y="170" width="140" height="30" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="50" y="170" width="140" height="30" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="120" y="189.2" font-size="12" text-anchor="middle" fill="currentColor">think …</text>
<line x1="120" y1="225" x2="473" y2="225" stroke="currentColor" stroke-width="1.5"/>
<polygon points="480,225 472,228.6 472,221.4" fill="currentColor"/>
<text x="300" y="217" font-size="12" text-anchor="middle" fill="currentColor">guess b′</text>
<line x1="120" y1="240" x2="120" y2="290" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4"/>
<line x1="480" y1="240" x2="480" y2="290" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4"/>
<text x="300" y="270" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">advantage = | Pr[b′ = b] − ½ |</text>
</svg>
<figcaption>Figure 1.15. The indistinguishability game. Guessing blindly wins half the time; a secure scheme leaves every efficient attacker only a negligible edge over that.</figcaption>
</figure>

The game was invented by Shafi Goldwasser and Silvio Micali, two graduate
students at Berkeley, in their 1982 paper "Probabilistic Encryption". Their
starting point was a flaw in the textbook RSA of the day: encrypting the same
message twice gives the same ciphertext, so an attacker can at least test
guesses. They argued that encryption must be randomized and that security must
mean "no partial information at all", and they gave the first scheme that
could be proved to meet it. The idea took over the field, and in 2012 it won
them the Turing Award.

!!! note "Life story: indistinguishability"
    **Born:** 1982, Shafi Goldwasser and Silvio Micali, "Probabilistic Encryption" · **Purpose:** say exactly
    what "learns nothing" means, and prove schemes meet it · **Helped:** made encryption randomized (nonces,
    padding with random bytes) and turned security into theorems; Turing Award 2012 · **Status:** current, the
    standard definition behind every modern cipher and protocol

**Attacks only get better.** A saying from inside the NSA, made public by Bruce
Schneier, sums up the rest: attacks always get better, never worse. MD5's
first weakness appeared in 1993 and practical collisions in 2004; SHA-1's first
theoretical attack came in 2005 and a real collision in 2017. Key sizes are
chosen with a margin for that drift, and for "harvest now, decrypt later":
anything recorded today can be attacked with tomorrow's computers, so data that
must stay secret for 30 years needs keys chosen for 30 years from now.

## Exercises

??? question "1. A bank sends you \"Your balance is 500 dollars\" with an HMAC tag. Which of the four jobs does that give you, and which not?"

    Integrity and authenticity: you know it came from someone with the shared key
    and wasn't changed. Not confidentiality (anyone on the line can read it) and
    not non-repudiation (you hold the same key, so you could have made the tag
    yourself, and the bank could deny it in court).

??? question "2. A software update is signed with the vendor's private key but not encrypted. What does that protect against?"

    Against anyone changing the update or making a fake one (integrity and
    authenticity), and the vendor can't later deny shipping it. It does not hide
    the update's contents, and doesn't need to.

??? question "3. A company sells a \"military-grade\" cipher but won't say how it works, \"for security\". What does Kerckhoffs say?"

    Be suspicious. A good cipher loses nothing when its design is public. Keeping
    it secret means nobody outside has checked it, and the design will leak sooner
    or later anyway, as A5/1, CSS and MIFARE Classic did.

??? question "4. How many times harder is a 128-bit key search than a 64-bit one?"

    $2^{128} / 2^{64} = 2^{64}$, about $1.8 \times 10^{19}$ times harder. Not twice
    as hard: each bit doubles the work.

??? question "5. Which attack model fits each: (a) a spy steals a pile of encrypted telegrams; (b) a codebreaker knows every message starts \"TO THE COMMANDER\"; (c) an attacker uploads files to your cloud drive, which encrypts them with your key; (d) an attacker sends forged messages to a server and watches which ones it rejects."

    (a) ciphertext only, (b) known plaintext, (c) chosen plaintext, (d) chosen
    ciphertext (the rejections are information about decryption).

??? question "6. A team of 200 people want every pair to share a separate secret key. How many keys is that? With public keys, how many key pairs?"

    $200 \cdot 199 / 2 = 19{,}900$ shared keys, each delivered secretly. With
    public keys, 200 pairs, and only the public halves need to be distributed,
    which can be done in the open (as long as people can tell whose key is whose;
    that is [Chapter 16](16-PKI-and-Key-Establishment.md)).

??? question "7. An attacker can test $2^{40}$ keys a second. How long, on average, to find a random 72-bit key?"

    On average half the keys: $2^{71} / 2^{40} = 2^{31}$ seconds, about 68 years.
    A large enough team or a few years of hardware progress would bring it down
    a lot, which is why 72 bits is not considered safe.

??? question "8. Why can a MAC never give non-repudiation, however strong it is?"

    Both sides hold the same key, so anything Alice could produce, Bob could too.
    A judge shown a valid tag can't tell which of them made it. A signature is
    different: only the holder of the private key can make it, and the public key
    lets anyone check.

??? question "9. A cipher lets an attacker tell, with 60% accuracy and no key, whether two ciphertexts hide the same message. No message is ever recovered. Is it broken?"

    Yes, in the modern sense. Its distinguishing advantage is 0.1, far from
    negligible, and "are these two the same?" is exactly the kind of information
    that leaks real secrets (a repeated order, a yes or no vote). Modern
    definitions demand that no efficient attacker gets any noticeable advantage.

## What you learned

- Cryptography does four separate jobs: confidentiality, integrity,
  authenticity and non-repudiation. Having one never gives you another.
- Secret-key cryptography is fast but needs a shared key; public-key
  cryptography solves key distribution and signing but is slow, so real
  systems combine them.
- Kerckhoffs's principle: assume the enemy knows the method; only the key is
  secret. Secret designs have failed again and again.
- Attack models range from ciphertext-only to chosen-ciphertext; modern
  ciphers must survive all of them, plus side channels.
- $n$-bit security means about $2^n$ work for the best attack; 128 bits is the
  normal target, and key length is not the same as security level.
- Most real breaks come from misuse: short keys, reused keys, bad randomness,
  missing integrity and leaky code.

**Next:** [Chapter 2](02-Classical-Ciphers.md) builds the ciphers people used by
hand for two thousand years, and breaks every one of them.

## Further reading

- David Kahn, *The Codebreakers* (1967; revised 1996). The standard history.
- Simon Singh, *The Code Book* (1999). A readable history from Mary, Queen of
  Scots, to quantum cryptography.
- Auguste Kerckhoffs, "La cryptographie militaire", *Journal des sciences
  militaires* IX (1883).
- Claude Shannon, "Communication Theory of Secrecy Systems", *Bell System
  Technical Journal* 28 (1949).
- Jean-Philippe Aumasson, *Serious Cryptography* (2nd edition, 2024), chapter 1.
- Christof Paar and Jan Pelzl, *Understanding Cryptography* (2010), chapter 1.
- The [history appendix](../history/index.md) and the [FAQ](../FAQ.md) on this site.
