# What cryptography does

*The four jobs, the cast of characters, the rule that the method is never the
secret, and the ways an attacker can come at you.*

## Four jobs

People reach for cryptography to get one or more of these:

| Job | The question it answers | Tool |
|---|---|---|
| **Confidentiality** | Can anyone else read this? | a cipher: [AES](../04-symmetric-ciphers/AES.md), [ChaCha20](../04-symmetric-ciphers/ChaCha.md) |
| **Integrity** | Was it changed on the way? | a hash or MAC: [SHA-2](../07-hash/SHA-2.md), [HMAC](../06-mac/HMAC.md) |
| **Authenticity** | Did it really come from them? | a MAC (shared key) or a signature (public key): [Ed25519](../02-signatures/EdDSA.md) |
| **Non-repudiation** | Can they later deny sending it? | a signature only, since a MAC key is shared and either side could have made the tag |

Older cryptography was almost all about the first job. A general sent orders,
and the worry was the enemy reading them. Today the other three matter just as
much. When your phone installs an update, nobody cares if the update is
secret; what matters is that it really came from the maker and nobody changed
it. That is a signature's job.

## The cast

Papers since the RSA paper of 1978 tell the story with the same names:

- **Alice** and **Bob** want to talk.
- **Eve** eavesdrops: she sees every message but can't change them.
- **Mallory** is the active attacker: she can drop, change, replay and invent
  messages.

Most of the trouble comes from Mallory. Plenty of systems that keep Eve out
fall to someone who can change a few bytes in flight.

## Two kinds of keys

**Secret-key (symmetric) cryptography.** Alice and Bob share one key. The same
key locks and unlocks. It is fast, and it is how almost all data is actually
encrypted. Its problem is getting the key to both sides in the first place:
for most of history that meant a courier.

**Public-key (asymmetric) cryptography.** Each person has a pair: a public key
anyone can have and a private key only they hold. Anyone can lock a box with
Bob's public key, only Bob can open it. Bob can sign with his private key and
anyone can check with his public one. It was discovered in the 1970s (twice:
once in secret at GCHQ, once in public at Stanford and MIT), and it solved
the courier problem. It is slow, so real systems use it only to agree on a
secret key, then switch to symmetric ciphers.

Every protocol on this site, from [TLS](../protocols/TLS-1.3.md) to
[Signal](../protocols/Signal.md), is a mix of the two.

## The method is not the secret

In 1883 Auguste Kerckhoffs, a Dutch-born language teacher in Paris, wrote
*La cryptographie militaire*, with six rules for field ciphers. The second is
the one that lasted: the system must not need to be secret, and it must be no
problem if it falls into the enemy's hands. Claude Shannon put it more bluntly
in 1949: "the enemy knows the system".

The reason is practical. A method is built into thousands of machines and
programs; sooner or later one is captured, copied or reverse-engineered. A key
can be changed in a second. So all the secrecy goes into the key, and the
method is published for everyone to attack. AES, SHA-3 and ML-KEM were all
chosen in open competitions where anyone could try to break the entries.

History is full of secret designs that failed once someone looked: the GSM
phone ciphers A5/1 and A5/2 (reverse-engineered in 1999), the MIFARE Classic
transit card cipher (2008), the DVD's CSS (1999). See the
[FAQ](../FAQ.md#can-i-keep-the-algorithm-secret-instead-of-the-key).

## How attackers come at you

Attacks are sorted by what the attacker gets to see or do. Each step down the
list is a stronger attacker, and modern ciphers must survive all of them.

| Attack | The attacker has | A real case |
|---|---|---|
| **Ciphertext only** | intercepted messages | al-Kindi's frequency analysis, 9th century |
| **Known plaintext** | some messages with their decryptions | Bletchley Park's "cribs": German weather reports always said *WETTER* in the same place |
| **Chosen plaintext** | the power to get messages of their choice encrypted | Midway, 1942: US codebreakers had a base send a fake message that its water plant had failed, and Japan's encrypted report of it confirmed that "AF" meant Midway |
| **Chosen ciphertext** | the power to get ciphertexts of their choice decrypted, or at least to learn if decryption failed | Bleichenbacher's 1998 attack on RSA in SSL, which needed only "padding OK" or "padding bad" |

Bletchley also forced chosen plaintext: the RAF laid mines in particular spots
("gardening") so the German warnings about them would contain known place
names.

## How strong is strong?

Strength is measured in **bits of security**: a scheme has $n$-bit security if
the best known attack takes about $2^n$ operations. Each extra bit doubles the
work.

| Bits | Work | Meaning |
|---|---|---|
| 56 | $7 \times 10^{16}$ | DES; broken by a $250,000 machine in 1998 |
| 80 | $10^{24}$ | within reach of a large organization; retired |
| 112 | $5 \times 10^{33}$ | the minimum NIST allows today |
| 128 | $3 \times 10^{38}$ | the normal target: AES-128, X25519, ML-KEM-512 |
| 256 | $10^{77}$ | for the long term; close to the number of atoms in the visible universe |

A useful picture: a billion computers, each trying a billion keys a second,
would need about 10 trillion years to try every 128-bit key, some 800 times
the age of the universe.

Key length and security are not the same thing. A 3072-bit RSA key gives about
128 bits of security, the same as a 256-bit elliptic-curve key, because the
best attacks on each are very different. The main table on the
[home page](../index.md) lists both numbers for every algorithm.

## Try it

??? question "1. A bank sends you \"Your balance is $500\" with an HMAC tag. Which of the four jobs does that give you, and which not?"

    Integrity and authenticity: you know it came from someone with the shared key
    and wasn't changed. Not confidentiality (anyone on the line can read it) and
    not non-repudiation (you hold the same key, so you could have made the tag
    yourself, and the bank could deny it in court).

??? question "2. A company sells a \"military-grade\" cipher but won't say how it works, \"for security\". What does Kerckhoffs say?"

    Be suspicious. A good cipher loses nothing when its design is public. Keeping
    it secret means nobody outside has checked it, and the design will leak sooner
    or later anyway.

??? question "3. How many times harder is a 128-bit search than a 64-bit one?"

    $2^{128} / 2^{64} = 2^{64}$, about $1.8 \times 10^{19}$ times harder. Not twice
    as hard: each bit doubles the work.

## Where to go next

The next lesson, [Classical ciphers](Classical-Ciphers.md), builds the first
ciphers people used and then breaks every one of them, which is the fastest way
to see what a good cipher needs.
