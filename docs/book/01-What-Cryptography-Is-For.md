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

That is the oldest problem in this book. Two people want to talk; the only
channel between them passes through hostile hands. Histiaeus solved it by
hiding the message's existence, which is called **steganography** (Greek for
"covered writing"). It works until the guards learn the trick. Then it fails
completely: a shaved head gives up everything.

**Cryptography** ("hidden writing") takes the other road. It lets the enemy see
the message and makes it useless to them. The message, the **plaintext**, is
transformed by a **cipher** into a **ciphertext**, under the control of a
**key** that only the intended reader holds. Turning plaintext into ciphertext
is **encryption**; turning it back is **decryption**. Breaking a cipher without
the key is **cryptanalysis**, and the whole field, making and breaking, is
**cryptology**.

Today the hostile channel is the internet. Every message you send crosses
dozens of machines that belong to other people: your café's Wi-Fi router, your
internet provider, the backbone networks, the data center at the far end. Any
of them could read or change what passes through. Cryptography is the reason
that, in practice, they can't.

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

## 1.4 Two kinds of keys

**Secret-key (symmetric) cryptography.** Alice and Bob share one key. The same
key locks and unlocks. It is fast, and it is how almost all data is actually
encrypted. Its problem is getting the key to both sides in the first place:
for most of history that meant a trusted courier, and for an army or an
embassy it meant printing, guarding and distributing books of keys. With $n$
people who all want to talk privately in pairs, you need $n(n-1)/2$ keys: a
company of 10,000 people would need about 50 million.

**Public-key (asymmetric) cryptography.** Each person has a pair of keys: a
public key anyone may have and a private key only its owner holds. Anyone can
lock a box with Bob's public key; only Bob can open it. Bob can sign with his
private key and anyone can check the signature with his public one. It was
discovered in the 1970s twice: in secret at GCHQ in Britain (1970 to 1974) and
in public at Stanford and MIT (1976 and 1977). It solved the courier problem.
It is also much slower, so real systems use it only to agree on a secret key
or to sign, then switch to symmetric ciphers for the data.

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

Kerckhoffs doesn't say a method must be published, only that its security
must not depend on staying unpublished. Governments still keep some military
algorithms classified, but they design them to survive capture. See the
[FAQ](../FAQ.md#can-i-keep-the-algorithm-secret-instead-of-the-key).

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

**Chosen plaintext at Midway.** In May 1942 US Navy codebreakers in Hawaii were
reading parts of the Japanese naval code JN-25 and saw that the next target was
called "AF". They suspected Midway. On their suggestion, the base at Midway sent
an unencrypted message saying its water plant had broken down. Soon an
intercepted Japanese message reported that "AF" was short of water. The
Japanese had encrypted a plaintext the Americans had chosen, and in doing so
confirmed the target. Bletchley Park did the same in Europe: the RAF sometimes
laid mines in particular spots ("gardening") so that German warnings would
contain place names the codebreakers knew.

**Why the strongest model matters.** "Chosen ciphertext" sounds far-fetched:
why would anyone decrypt messages for an attacker? But a server that answers
"error" to a badly formed message *is* telling the attacker something about
the decryption. Bleichenbacher's attack sent about a million crafted messages to
an SSL server and read off a session key from the pattern of errors. The same
flaw was found again in 2017 (ROBOT) in products from many vendors. So modern
ciphers are designed to be safe even against the strongest model.

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
| 56 | $7.2 \times 10^{16}$ | DES; a $250,000 machine found a key in 56 hours in 1998 |
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
science and proved what perfect secrecy costs. IBM's work led to DES, the first
public standard cipher, in 1977. Then in 1976 Whitfield Diffie and Martin
Hellman showed that two strangers could agree on a secret in public, and RSA
followed in 1977; GCHQ revealed in 1997 that its staff had found both first.
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
