# 4. Randomness and Perfect Secrecy

*Every key, nonce and salt in this book must be unpredictable, and "unpredictable"
can be measured. This chapter teaches the probability cryptographers use:
entropy, the birthday bound and security levels. Then it builds the one cipher
that is provably unbreakable, the one-time pad, proves Shannon's theorem about
it, and shows the one mistake that has broken it again and again. It ends with
where random numbers actually come from, and the long list of systems that fell
because theirs weren't random enough.*

!!! abstract "In this chapter"

    **You will learn:**

    - the probability you need: uniform choices, independence and expected search time
    - entropy and min-entropy: how many bits of real uncertainty a key or password has
    - the birthday bound, and why it halves the security of hashes, nonces and 64-bit blocks
    - XOR, the one-time pad, and Shannon's proof of perfect secrecy and of its price
    - the two-time pad, Tunny and Venona
    - how operating systems and DRBGs make random numbers, and how Netscape, Debian, Android and Dual_EC got it wrong

    **You need:** [Chapter 1](01-What-Cryptography-Is-For.md) (security levels),
    [Chapter 2](02-Classical-Ciphers.md) (the Vigenère cipher and unicity
    distance) and a little of [Chapter 3](03-The-Arithmetic-of-Secrets.md).

    **Levels:** sections 4.1 to 4.6 are for beginners, 4.7 to 4.11 are
    intermediate, and 4.12 is expert.

## 4.1 The problem

In September 1995 two Berkeley graduate students, Ian Goldberg and David
Wagner, looked at how Netscape Navigator, the most popular browser of the day,
chose the secret keys that protected credit card numbers on the web. The cipher
was fine. The key was not. Netscape seeded its random generator with the time
of day, its own process ID and its parent's process ID. An attacker who knew
roughly when a connection was made could try the few possible seeds and recover
the key, often in under a minute. A 128-bit key had a few tens of bits of real
uncertainty.

That is the lesson of this chapter in one story. Every security level in
[Chapter 1](01-What-Cryptography-Is-For.md) assumes the key was chosen
**uniformly at random** from all possible keys. If it wasn't, the key length
means nothing.

People have needed randomness for a long time: astragali (knucklebones) and
dice in the ancient Mediterranean, yarrow stalks for divination in China, lots
drawn to choose officials in Athens. Machines came late. In 1955 the RAND
Corporation published *A Million Random Digits with 100,000 Normal Deviates*, a
book of random numbers made from an electronic noise source, for scientists who
needed them. In 1957 Britain's Premium Bonds lottery began drawing winners
with ERNIE, a machine built by Tommy Flowers and Harry Fensom, who had built
Colossus at Bletchley Park; it used noise in neon tubes. John von Neumann, who
used random numbers in the first computer simulations, warned in 1949:
"Anyone who considers arithmetical methods of producing random digits is, of
course, in a state of sin." Computers are deterministic machines, and turning
them into sources of secrets is harder than it looks.

## 4.2 The probability you need

A **random experiment** has outcomes, each with a probability between 0 and 1,
adding up to 1. A choice is **uniform** if every one of $N$ outcomes has
probability $1/N$: a fair die, a fair coin, a properly made 128-bit key
($N = 2^{128}$).

Three rules do almost all the work in this book:

- **Independent events multiply.** Two fair coins both land heads with
  probability $\frac12 \cdot \frac12 = \frac14$; $n$ random bits all match a
  guess with probability $2^{-n}$.
- **The complement.** $\Pr[\text{at least one}] = 1 - \Pr[\text{none}]$. The
  chance that a 6 turns up in 4 rolls of a die is
  $1 - (5/6)^4 \approx 0.518$.
- **The union bound.** $\Pr[A \text{ or } B] \le \Pr[A] + \Pr[B]$. If an attacker
  makes $q$ guesses, each right with probability $2^{-n}$, the chance any is
  right is at most $q \cdot 2^{-n}$.

**Searching for a key.** A uniform $n$-bit key, searched in any order, is found
after $2^{n-1}$ tries on average and $2^n$ at worst. Cryptographers just say
"about $2^n$ work". After $q$ tries the chance of success is $q / 2^n$, which
is the union bound again.

**Many targets.** If an attacker wants *any one* of $T$ keys (say a million
users' keys) and each try can be checked against all of them, each try succeeds
with probability $T / 2^n$, and the work drops by a factor of $T$: a million
targets cost about 20 bits. That is why password hashes need salts
([Chapter 11](11-Passwords-and-Key-Derivation.md)) and why standards size some
keys with a margin.

## 4.3 Entropy: measuring uncertainty

Claude Shannon defined **entropy** in "A Mathematical Theory of Communication"
(1948): the average number of bits of genuine surprise in a value. For a value
$X$ that takes outcome $x$ with probability $p_x$,

$$
H(X) = -\sum_x p_x \log_2 p_x \quad \text{bits}.
$$

For a uniform choice among $N$ outcomes every $p_x = 1/N$, and $H = \log_2 N$:
a fair coin is 1 bit, a fair die is $\log_2 6 \approx 2.58$ bits, a uniform
128-bit key is 128 bits. Any bias lowers it. A coin that lands heads 90% of the
time has only 0.47 bits.

```python
from math import log2

def entropy(ps):                     # Shannon entropy in bits
    return -sum(p * log2(p) for p in ps if p > 0)

F = [8.2, 1.5, 2.8, 4.3, 12.7, 2.2, 2.0, 6.1, 7.0, 0.15, 0.77, 4.0, 2.4,
     6.7, 7.5, 1.9, 0.095, 6.0, 6.3, 9.1, 2.8, 0.98, 2.4, 0.15, 2.0, 0.074]   # English letters, per cent
print(entropy([0.5, 0.5]), round(entropy([1/6] * 6), 3), round(entropy([0.9, 0.1]), 3))   # 1.0 2.585 0.469
print(round(entropy([f / sum(F) for f in F]), 2), round(log2(26), 2))                     # 4.18 4.7
```

A single English letter, judged only by its frequency, carries 4.18 bits, not
the 4.7 a uniform letter would. Taking context into account (after TH, an E is
very likely) Shannon estimated in 1951 that English carries only about 1 bit
per letter. The gap is the **redundancy** that made frequency analysis and the
unicity distance of [Chapter 2](02-Classical-Ciphers.md) work.

**Min-entropy.** Average surprise is not the right measure for an attacker, who
guesses the most likely value first. **Min-entropy** looks only at that:

$$
H_\infty(X) = -\log_2 \max_x p_x .
$$

For the 90% coin it is $-\log_2 0.9 \approx 0.15$ bits. For a uniform value it
equals the ordinary entropy. NIST's rules for entropy sources (SP 800-90B) are
stated in min-entropy, and so is the rule for keys: **a $k$-bit key needs $k$
bits of min-entropy.**

**What passwords are worth.** If a password is chosen uniformly from $N$
possibilities, its entropy is $\log_2 N$:

| Password | Choices | Entropy |
|---|---|---|
| 8 random printable characters | $95^8$ | 52.6 bits |
| 12 random lowercase letters | $26^{12}$ | 56.4 bits |
| 6 random words from a 7,776-word list (Diceware) | $7776^6$ | 77.5 bits |
| 12 random words from 2,048 (a BIP-39 wallet phrase) | $2048^{12}$ | 132 bits, of which 128 are entropy and 4 a checksum |
| one common English word | about 20,000 | 14.3 bits |

These numbers hold only if the choice is **truly random**. People choosing for
themselves are predictable, and leaked password lists show the same favorites
year after year. A password picked by a person might have 20 or 30 bits of
min-entropy however long it looks. That gap is why passwords are stored with
deliberately slow functions ([Chapter 11](11-Passwords-and-Key-Derivation.md)).

## 4.4 The birthday bound

How many people do you need in a room for a better-than-even chance that two
share a birthday? Not 183, but **23**. With 70 people the chance is 99.9%.

The reason: what matters is the number of **pairs**, and $k$ people make
$k(k-1)/2$ pairs. With 23 people that is 253 pairs, each with a 1-in-365
chance. Exactly, using the complement rule, the chance that all $k$ birthdays
differ is

$$
\Pr[\text{no repeat}] = \frac{N}{N} \cdot \frac{N-1}{N} \cdots \frac{N-k+1}{N}
= \prod_{i=0}^{k-1} \left(1 - \frac{i}{N}\right) \approx e^{-k(k-1)/2N},
$$

using $1 - x \approx e^{-x}$ for small $x$.

```python
def p_clash(k, N):                  # chance that k random values out of N are not all different
    q = 1.0
    for i in range(k):
        q *= (N - i) / N
    return 1 - q

print(round(p_clash(23, 365), 3), round(p_clash(70, 365), 4))   # 0.507 0.9992
```

Setting $e^{-k^2/2N} = \frac12$ gives $k \approx 1.18\sqrt{N}$ for a 50% chance,
and the expected number of draws until the first repeat is
$\sqrt{\pi N / 2} \approx 1.25\sqrt{N}$. With $N = 2^n$ that is about $2^{n/2}$.
**Repeats appear after the square root.**

**Hashes.** Finding *two* inputs with the same $n$-bit hash (a collision) needs
only about $2^{n/2}$ tries, so a 128-bit security level needs a 256-bit hash.
MD5's 128-bit output gives at best 64-bit collision security, which is one
reason it was doomed ([Chapter 9](09-Hash-Functions.md)). You can watch it
happen by cutting SHA-256 down to 32 bits; a collision turns up after a little
over $2^{16}$ tries, usually in well under a second:

```python
import hashlib, os

seen = {}
while True:
    m = os.urandom(8)
    h = hashlib.sha256(m).digest()[:4]      # only 32 bits of the hash
    if h in seen and seen[h] != m:
        print(len(seen), "tries:", seen[h].hex(), m.hex(), "both hash to", h.hex())
        break
    seen[h] = m
```

The values change every run. The number of tries is around 80,000 on average,
and nine runs in ten land between about 20,000 and 160,000.

**Nonces and IDs.** A random 32-bit session ID repeats after about
$1.25 \cdot 2^{16} \approx 82{,}000$ sessions. GCM's 96-bit random nonces must not
be used for more than about $2^{32}$ messages under one key
([Chapter 8](08-Modes-of-Operation.md)).

**Block ciphers.** A cipher with $b$-bit blocks starts showing repeated
ciphertext blocks after about $2^{b/2}$ blocks under one key, and in common modes
a repeat leaks information about the plaintext. For the 64-bit blocks of 3DES
and Blowfish that is $2^{32}$ blocks, 32 GiB, which a busy HTTPS connection sends
in hours. Karthikeyan Bhargavan and Gaëtan Leurent demonstrated it in 2016 as
the **Sweet32** attack, and 64-bit ciphers were retired. AES's 128-bit blocks
push the limit to $2^{64}$ blocks, about $3 \times 10^{20}$ bytes.

## 4.5 Security levels

Put [§4.2](#42-the-probability-you-need) to [§4.4](#44-the-birthday-bound) together and you get the security levels of this book. A
scheme has **$n$-bit security** if every known attack needs about $2^n$
operations (or succeeds with probability about $t / 2^n$ after $t$ operations).
Generic attacks fix the minimum sizes:

| To get $n$-bit security against | you need | because |
|---|---|---|
| key search on a cipher | an $n$-bit key | [§4.2](#42-the-probability-you-need): $2^n$ tries |
| collisions in a hash | a $2n$-bit output | [§4.4](#44-the-birthday-bound): the birthday bound |
| repeats among random nonces | a nonce well over $2n$ bits, or a counter | [§4.4](#44-the-birthday-bound) |
| key search by a quantum computer (Grover) | a $2n$-bit key | [Chapter 20](20-Quantum-Computers.md) |
| attacks on RSA or discrete logs | far larger numbers | [Chapter 13](13-RSA.md), [Chapter 15](15-Elliptic-Curves.md) |

NIST allows 112-bit security as the minimum today and recommends 128 bits; for
data that must stay secret for decades, or against future quantum computers,
256-bit keys for symmetric ciphers are common. The main
[algorithm table](../index.md) lists the level of every algorithm on this site.

Security proofs don't say "impossible". They say an attacker running for time
$t$ succeeds with probability about $t / 2^n$. With $n = 128$, even $2^{64}$
operations give a chance of $2^{-64}$, smaller than the chance of a cosmic ray
flipping a bit in the attacker's computer during the run.

## 4.6 Bits, XOR and the one-time pad

Computers store everything as **bits**, 0 or 1; eight make a **byte**, a number
from 0 to 255. The letter `A` is byte 65, `01000001` in binary, written `41` in
hexadecimal, where each hex digit is four bits.

**XOR.** Almost every cipher in this book uses one operation over and over:
**exclusive or**, written $\oplus$. It gives 1 if two bits differ and 0 if they
are the same:

| $a$ | $b$ | $a \oplus b$ |
|---|---|---|
| 0 | 0 | 0 |
| 0 | 1 | 1 |
| 1 | 0 | 1 |
| 1 | 1 | 0 |

For longer values XOR each pair of bits: `1010` $\oplus$ `0110` = `1100`. XOR is
addition mod 2 without carries, and doing it twice undoes it:

$$
a \oplus a = 0, \qquad a \oplus 0 = a, \qquad \text{so} \qquad (m \oplus k) \oplus k = m.
$$

It is the Vigenère cipher of [Chapter 2](02-Classical-Ciphers.md) with an
alphabet of two letters.

**The one-time pad.** Take the Vigenère cipher and remove its weakness, the
repeating key. The key is a string of truly random bits, as long as the
message, used only once. Encrypt with $c = m \oplus k$; decrypt with
$m = c \oplus k$.

```python
import secrets

def xor(a, b):
    return bytes(x ^ y for x, y in zip(a, b))

m = b"ATTACK AT DAWN"
k = secrets.token_bytes(len(m))          # truly random, as long as the message, used once
c = xor(m, k)
print(c.hex(), xor(c, k))                # random-looking hex, then b'ATTACK AT DAWN'
```

**The story.** A Sacramento banker, Frank Miller, described a pad of random
numbers for telegraph codes in 1882; his booklet was forgotten until Steven
Bellovin found it in 2011. In 1917 Gilbert Vernam at AT&T built the electrical
version, XORing teleprinter tape with a key tape (US patent 1,310,719, 1919).
Joseph Mauborgne of the US Army saw that the key tape must be random and never
reused. In the 1920s the German Foreign Office used pads of random digits, and
in the Second World War and after, Soviet agents carried pads printed on tiny
sheets. In 1963 the new Moscow-Washington hotline ran on one-time tape.

## 4.7 Perfect secrecy

*Level: intermediate.* Shannon wrote a classified report in 1945, published in
1949 as "Communication Theory of Secrecy Systems", that turned "unbreakable"
into a theorem.

**The definition.** A cipher has **perfect secrecy** if the ciphertext tells
the attacker nothing about the message: for every message $m$ and every
ciphertext $c$,

$$
\Pr[M = m \mid C = c] = \Pr[M = m] .
$$

Whatever the attacker believed about the message before seeing $c$ (say, 70%
"attack", 30% "retreat"), they believe exactly the same after. An equivalent
form, easier to check: the distribution of the ciphertext is the same whatever
the message,

$$
\Pr[C = c \mid M = m] = \Pr[C = c \mid M = m'] \quad \text{for all } m, m', c .
$$

**The one-time pad has it.** Fix an $n$-bit ciphertext $c$. For **every**
$n$-bit message $m$ there is exactly one key that turns $m$ into $c$, namely
$k = m \oplus c$. Keys are uniform, so

$$
\Pr[C = c \mid M = m] = \Pr[K = m \oplus c] = 2^{-n} \quad \text{for every } m .
$$

The ciphertext is equally likely whatever the message was. Intercept 14 bytes
and they could be ATTACK AT DAWN, RETREAT AT TEN or any other 14 characters, each
under exactly one key. This holds against unlimited computing power, quantum
computers included; there is nothing to search, because every answer is
equally consistent with what you see.

**By hand, and by computer.** Take 3-bit messages. With a uniform 3-bit key,
XOR sends any message to each of the 8 ciphertexts with probability $1/8$:
the same table for every message. Now weaken the cipher: add the key mod 8, but
choose the key from only 4 values. Message 0 can then only become 0, 1, 2 or 3,
and message 5 only 5, 6, 7 or 0. Seeing ciphertext 2 rules out message 5
entirely: information has leaked.

```python
from collections import Counter
from fractions import Fraction

def dist(enc, keys, m):              # Pr[C = c | M = m] for every c, keys uniform
    cnt = Counter(enc(m, k) for k in keys)
    return {c: Fraction(n, len(keys)) for c, n in sorted(cnt.items())}

otp = lambda m, k: m ^ k             # 3-bit messages, 3-bit keys
short = lambda m, k: (m + k) % 8     # 3-bit messages, but only 4 keys
print(dist(otp, range(8), 0) == dist(otp, range(8), 5))   # True: the same for every message
print(dist(short, range(4), 0))      # ciphertexts 0, 1, 2, 3, each with probability 1/4
print(dist(short, range(4), 5))      # ciphertexts 5, 6, 7, 0: a different set
```

Notice that a one-letter Caesar cipher with a uniformly random shift is also
perfectly secret: 26 keys for 26 messages. What broke Caesar in
[Chapter 2](02-Classical-Ciphers.md) was reusing the key for every letter.

**Shannon's theorem: the price.** Any cipher with perfect secrecy needs at
least as many keys as messages: $\lvert \mathcal{K} \rvert \ge \lvert \mathcal{M} \rvert$.

*Proof.* Fix a ciphertext $c$ that can occur. If there were fewer keys than
messages, then decrypting $c$ under every key would give fewer than
$\lvert \mathcal{M} \rvert$ messages, so some message $m'$ could never produce
$c$: $\Pr[C = c \mid M = m'] = 0$. But some other message does produce $c$ with
positive probability, so the two conditional distributions differ, and the
cipher is not perfectly secret. $\square$

In bits: to send $n$ bits with perfect secrecy you need $n$ bits of key, used
once. You can't do better than the pad, and every perfectly secret cipher is,
in effect, a one-time pad.

## 4.8 Break it: the two-time pad and malleability

*Level: intermediate.* The pad's proof says nothing about using the key
**twice**. Do that and the key cancels out:

$$
c_1 \oplus c_2 = (m_1 \oplus k) \oplus (m_2 \oplus k) = m_1 \oplus m_2 .
$$

The attacker now holds the XOR of two messages with no key in it. Guess a word
that might be in one message ("ATTACK", "THE ", "Dear") at some position, XOR it
in, and if the guess is right, readable text from the other message appears at
the same spot. This is called **crib dragging**, and every right guess reveals
more of both.

```python
m1, m2 = b"ATTACK AT DAWN", b"RETREAT AT TEN"
c1, c2 = xor(m1, k), xor(m2, k)
print(xor(c1, c2) == xor(m1, m2))            # True: the key cancels out
print(xor(xor(c1, c2), b"ATTACK"))           # b'RETREA': guess six letters of one, read six of the other
```

**Tunny, 1941.** On 30 August 1941 a German operator sent a message of about
4,000 characters on the Lorenz teleprinter cipher, a machine that XORed each
character with a machine-made key stream. The receiver asked for it again, and
the operator re-sent it with the same key setting, with small changes in the
text. At Bletchley Park John Tiltman recovered both messages and the key
stream. From that key stream alone, Bill Tutte worked out the structure of the
whole machine, which nobody at Bletchley had seen.

**Venona, 1943 to 1980.** Under wartime pressure in 1942, the Soviet office
that printed one-time pads printed some pages twice. In February 1943 Gene
Grabeel began studying Soviet diplomatic traffic for the US Army at Arlington
Hall; she and her colleagues found the reused pages, and Meredith Gardner and
others went on to read parts of about 3,000 messages. They exposed Soviet
agents including Klaus Fuchs, Julius Rosenberg and Donald Maclean. The pad was
mathematically perfect; the pad factory was not.

**Malleability.** The pad hides; it doesn't protect. Flip a bit of $c$ and the
same bit of $m$ flips, and nobody can tell. If Mallory knows (or guesses) that
the message starts with ATTACK, she can XOR the ciphertext with
ATTACK $\oplus$ RETIRE without knowing the key, and Bob reads RETIRE:

```python
c = xor(b"ATTACK AT DAWN", k)
forged = xor(c, xor(b"ATTACK", b"RETIRE") + bytes(8))   # Mallory never sees k
print(xor(forged, k))                                   # b'RETIRE AT DAWN'
```

Perfect secrecy and integrity are different jobs ([§1.2](01-What-Cryptography-Is-For.md#12-four-jobs)). This is why every
modern cipher in this book is paired with a MAC
([Chapter 10](10-Message-Authentication.md)).

**Why almost nobody uses the pad.** The key is as long as everything you will
ever send, must be truly random, must reach the other side secretly in advance,
and must be destroyed after use. To encrypt a 4 GB film you need 4 GB of key
delivered by courier, and if you have a secure courier you could have sent the
film. The pad survives where volume is tiny and keys can be carried by hand:
spies' number stations, some diplomatic and military links, and in the late
1980s the ANC's Operation Vula, which carried long random keys into South
Africa on floppy disks.

**What replaced it.** A **stream cipher** keeps the XOR and replaces the giant
random key with a short key (say 256 bits) and a nonce, stretched into a long
keystream that only *looks* random:

$$
c = m \oplus \mathrm{Keystream}(k, \text{nonce}).
$$

It gives up perfect secrecy, since in principle someone could try all $2^{256}$
keys, in exchange for a key you can actually manage.
[Chapter 5](05-Stream-Ciphers.md) builds them. The two-time-pad rule lives on
as the **nonce rule**: never use the same key and nonce twice. Breaking it has
broken WEP Wi-Fi and WPA2 (the KRACK attack of 2017), among many others.

## 4.9 Where random numbers come from

*Level: intermediate.* There are two kinds of generator, and real systems use
both.

**True random generators** measure something physically unpredictable: thermal
noise in a resistor, jitter in the timing of a free-running oscillator, the
exact moments of disk and network interrupts, radioactive decay. They are slow,
and their output is biased and correlated, so it has fewer bits of min-entropy
than bits. They are used to make **seeds**.

**Pseudorandom generators** are deterministic algorithms that stretch a short
seed into a long output. A **cryptographically secure** one has two properties:
nobody who doesn't know the state can predict the next output better than by
guessing, and nobody who steals today's state can work out yesterday's output
(forward secrecy). Statistical randomness is not enough; Python's `random`
passes many statistical tests and is completely predictable ([§4.10](#410-famous-failures)).

**The operating system does both.** Every major OS collects entropy from
hardware events, hashes it into a seed, and runs a fast cipher-based generator:

| System | Ask for bytes with | Generator behind it |
|---|---|---|
| Linux | `getrandom()`, `/dev/urandom` | ChaCha20 since 4.8 (2016), seeded through BLAKE2s |
| OpenBSD, FreeBSD, macOS | `arc4random()`, `getentropy()` | ChaCha20 on the BSDs; AES on macOS |
| Windows | `BCryptGenRandom` | CTR_DRBG from NIST SP 800-90A |

Once such a generator holds 256 bits of secret seed, reading more output
doesn't "use up" its entropy, any more than encrypting more data with AES uses up
a key. The one dangerous moment is right after boot, before the seed has
collected enough entropy, and `getrandom()` waits through it. Details:
[OS random number generators](../09-random/OS-RNG.md).

**In Python, use `secrets`** (3.6 and later), which reads the OS generator:

```python
import secrets, string

key = secrets.token_bytes(32)             # 256-bit key
token = secrets.token_urlsafe(32)         # password-reset link token, 32 random bytes
pin = f"{secrets.randbelow(10**6):06d}"   # 6-digit code, with no bias
abc = string.ascii_letters + string.digits
pw = "".join(secrets.choice(abc) for _ in range(16))
print(len(key), len(token), len(pin), len(pw))   # 32 43 6 16
```

**Modulo bias.** Why `randbelow(10**6)` and not `random_number % 10**6`? Take a
random byte (0 to 255) mod 10. The 256 values don't split evenly into 10 groups:

```python
from collections import Counter
print(sorted(Counter(b % 10 for b in range(256)).items()))
# [(0, 26), (1, 26), (2, 26), (3, 26), (4, 26), (5, 26), (6, 25), (7, 25), (8, 25), (9, 25)]
```

Digits 0 to 5 come up 26 times in 256, the others 25. Small biases like this
have broken real systems: ECDSA signatures with nonces biased by a fraction of a
bit leak the private key through lattice attacks
([Chapter 14](14-Discrete-Log-Systems.md)). `randbelow` throws away values
beyond the last full group and tries again.

**DRBGs.** NIST's SP 800-90A defines three **deterministic random bit
generators**: Hash_DRBG, HMAC_DRBG and CTR_DRBG, which certified products must
use, seeded from an entropy source tested under SP 800-90B. HMAC_DRBG is the
simplest. It keeps a key $K$ and a value $V$; output is $V$ HMACed again and
again under $K$; after every request both are replaced, so a stolen state can't
rebuild earlier output. Here it is, checked against the first SHA-256 test
vector from NIST's validation program:

```python
import hmac, hashlib

def H(K, data):
    return hmac.new(K, data, hashlib.sha256).digest()

def update(K, V, data=b""):
    K = H(K, V + b"\x00" + data)
    V = H(K, V)
    if data:
        K = H(K, V + b"\x01" + data)
        V = H(K, V)
    return K, V

def instantiate(entropy, nonce, pers=b""):
    return update(bytes(32), b"\x01" * 32, entropy + nonce + pers)

def generate(K, V, n):
    out = b""
    while len(out) < n:
        V = H(K, V)
        out += V
    K, V = update(K, V)                  # move on, so old output can't be rebuilt
    return out[:n], K, V

e = bytes.fromhex("ca851911349384bffe89de1cbdc46e6831e44d34a4fb935ee285dd14b71a7488")
nonce = bytes.fromhex("659ba96c601dc69fc902940805ec0ca8")
K, V = instantiate(e, nonce)
_, K, V = generate(K, V, 128)            # the test throws the first call away
out, K, V = generate(K, V, 128)
print(out[:16].hex())                    # e528e9abf2dece54d47c7e75e5fe3021
print(out[-16:].hex())                   # 1f50d476aa0458bdaba806f48be9dcb8
```

This is for learning how it works. In real code call the OS generator, which is
already a well-seeded generator of this kind. Full details:
[NIST DRBGs](../09-random/NIST-DRBG.md).

## 4.10 Famous failures

*Level: intermediate.* More real systems have been broken through their random
numbers than through their ciphers. The pattern is always one of four: a
generator whose output reveals its state, a sound generator with a guessable
seed, a seed that never got any entropy, or a generator someone holds a key to.

**A generator that reveals its state: Mersenne Twister.** Python's `random`
uses MT19937 (Makoto Matsumoto and Takuji Nishimura, 1997), an excellent
generator for simulations. Its state is 624 words of 32 bits; each output is
one state word passed through a few shift-and-XOR steps that are easy to undo.
So 624 outputs give away the whole state, and from it every future output:

```python
import random

def unshift_right(y, s):
    x = y
    for _ in range(32 // s):
        x = y ^ (x >> s)
    return x

def unshift_left(y, s, mask):
    x = y
    for _ in range(32 // s):
        x = y ^ ((x << s) & mask)
    return x

def untemper(y):                     # MT19937's output step, backwards
    y = unshift_right(y, 18)
    y = unshift_left(y, 15, 0xefc60000)
    y = unshift_left(y, 7, 0x9d2c5680)
    return unshift_right(y, 11)

victim = random.Random()             # seeded from the OS; we never see the seed
seen = [victim.getrandbits(32) for _ in range(624)]
clone = random.Random()
clone.setstate((3, tuple(untemper(y) for y in seen) + (624,), None))
print(clone.getrandbits(32) == victim.getrandbits(32))     # True: the next output
print(clone.getrandbits(128) == victim.getrandbits(128))   # True: a 128-bit "token"
```

Web applications that made password-reset tokens this way (PHP's `mt_rand` was
a common culprit) let attackers predict them. Never use `random` for secrets.

**A guessable seed: Netscape (1995).** Section 4.1. Fixing it meant gathering
real entropy, which is what operating systems took over. Linux's `/dev/random`,
written by Theodore Ts'o, had appeared in 1994.

**A seed with no entropy: Debian (2006 to 2008).** In September 2006 a Debian
maintainer commented out two lines in OpenSSL to silence warnings from a
memory-checking tool. One of them mixed the seed into the generator. For the
next twenty months OpenSSL on Debian and Ubuntu was seeded by little more than
the process ID, at most 32,768 values, so every SSH, TLS and VPN key it made
came from a list small enough to precompute. Luciano Bello found it in May 2008.

**A seed that came too early: Mining your Ps and Qs (2012).** Routers and other
small devices generated their keys at first boot, before the kernel had
collected entropy; different devices sometimes chose the same prime, and one
gcd broke both keys ([Chapter 3](03-The-Arithmetic-of-Secrets.md)). The same
survey found DSA keys exposed by repeated signature nonces. `getrandom()`,
added to Linux in 2014, waits until the generator is seeded.

**A nonce that wasn't random: PlayStation 3 (2010) and Android (2013).** An ECDSA
signature needs a fresh random number for each signature; two signatures with
the same one reveal the private key by simple algebra
([Chapter 14](14-Discrete-Log-Systems.md)). Sony signed PlayStation 3 software
with the same number every time, and the fail0verflow group extracted the
signing key in December 2010. In August 2013 Android's Java `SecureRandom`
turned out to be badly seeded; Bitcoin wallets on Android repeated nonces and
coins were stolen.

**A generator with a back door: Dual_EC_DRBG (2006 to 2015).** One of the four
generators in NIST's 2006 standard was built on elliptic curves, with a fixed
point $Q$ given without explanation. In 2007 Dan Shumow and Niels Ferguson of
Microsoft showed that whoever knew a secret number linking $Q$ to the curve's
generator could predict all its output from about 32 bytes. The Snowden
documents of 2013 indicated that the NSA had promoted it; NIST withdrew it. In
2015 Juniper found that someone had replaced $Q$ in its firewalls, which let
them decrypt VPN traffic. A random generator is the most valuable place to hide
a back door, because its output looks random either way.

The fix in every case is the same: **ask the operating system, through your
language's secure API, for every secret value**, and never invent your own
generator. More cases are on [Retired generators](../09-random/Retired.md).

## 4.11 In the real world

- **Keys, nonces, IVs, salts, tokens:** from the OS generator (`secrets`,
  `os.urandom`, `getrandom()`, `crypto/rand` in Go, `randombytes_buf` in
  libsodium).
- **FIPS 140-3 products:** an SP 800-90A DRBG seeded from an SP 800-90B entropy
  source, often with a hardware source such as Intel's RDRAND/RDSEED mixed in.
  Operating systems mix hardware sources with others rather than trusting any
  one of them.
- **Virtual machines and containers:** a snapshot restored twice runs twice with
  the same generator state. Hypervisors expose a "VM generation ID", and Linux
  reseeds when it changes (since 5.18).
- **The one-time pad today:** diplomatic and military links with tiny volume and
  couriers, and quantum key distribution, which uses physics to deliver pad-like
  keys and is covered with the rest of the frontier in
  [Chapter 20](20-Quantum-Computers.md).
- **Everything else:** stream ciphers and block ciphers in Part II, which are the
  pad's practical descendants.

## 4.12 Going deeper

*Level: expert.* Four ideas that connect this chapter to the theory of Part IV.

**From perfect to computational secrecy.** Shannon's theorem says perfect
secrecy is impractical. Modern cryptography relaxes "the ciphertext tells you
nothing" to "no *efficient* attacker can tell the ciphertext from random". A
**pseudorandom generator** $G$ stretches an $s$-bit seed to $\ell > s$ bits such
that for every attacker $\mathcal{D}$ running in reasonable time,

$$
\left\lvert \Pr[\mathcal{D}(G(\text{seed})) = 1] - \Pr[\mathcal{D}(\text{uniform}) = 1] \right\rvert
$$

is negligible. Encrypting with $m \oplus G(k)$ is then secure in the
indistinguishability sense of [§1.11](01-What-Cryptography-Is-For.md#111-going-deeper): an attacker who could tell two
encryptions apart would be a distinguisher for $G$. This **reduction** is the
pattern of every security proof in [Chapter 17](17-Defining-Security.md). The
existence of PRGs can't be proved outright (it would imply P $\ne$ NP), so
practice relies on concrete designs like ChaCha20 that have survived years of
attack.

**Extracting randomness.** Physical sources are biased. John von Neumann gave
the simplest fix in 1951: read bits in pairs, output 0 for "01", 1 for "10", and
discard "00" and "11". If the bits are independent with any fixed bias $p$, the
two kept pairs each have probability $p(1-p)$, so the output is exactly
unbiased, at the cost of throwing most bits away.

```python
import random

def von_neumann(bits):
    return [a for a, b in zip(bits[0::2], bits[1::2]) if a != b]

rnd = random.Random(2026)                                # a simulated biased source, not for secrets
raw = [1 if rnd.random() < 0.7 else 0 for _ in range(100000)]
out = von_neumann(raw)
print(sum(raw) / len(raw), len(out), round(sum(out) / len(out), 3))   # 0.70082 21084 0.499
```

With $p = 0.7$ you keep $2 \cdot 0.7 \cdot 0.3 = 42\%$ of the pairs, 21% of the
bits. Von Neumann's trick fails if the bits are correlated. The general tool is a
**randomness extractor**: the **leftover hash lemma** (Impagliazzo, Levin and
Luby, 1989) shows that hashing a source with $k$ bits of min-entropy through a
randomly chosen universal hash gives nearly $k - 2\log_2(1/\varepsilon)$ bits
that are within $\varepsilon$ of uniform. In practice systems use a cryptographic
hash or HKDF as a "computational extractor": Linux hashes its input pool with
BLAKE2s ([Chapter 11](11-Passwords-and-Key-Derivation.md) covers HKDF).

**Statistical tests don't prove randomness.** Test suites such as NIST SP 800-22
and TestU01 catch broken generators, but every deterministic generator,
including a back-doored one, can pass them. Dual_EC_DRBG's output passed. Only
an argument about the design, its seed and its source can show that output is
unpredictable to an attacker.

**How big is $2^{128}$, physically?** Landauer's principle says erasing one
bit of information costs at least $kT \ln 2$ of energy, where $k$ is
Boltzmann's constant and $T$ the temperature. At 3.2 kelvin, a little above the
background temperature of the universe, that is about $3.1 \times 10^{-23}$
joules. Merely stepping a counter through $2^{128}$ states, with one bit erased
per step, would need about $10^{16}$ joules: a lot, but not impossible. For
$2^{192}$ it is about $1.9 \times 10^{35}$ joules, sixteen years of the Sun's
entire output (about $1.2 \times 10^{34}$ joules a year). For $2^{256}$ it is
about $3.5 \times 10^{54}$ joules, far more than the Sun will emit in its whole
life. So 128-bit keys are safe because of time, cost and engineering; 256-bit
keys are safe against brute force by physics, at least for computers that
erase bits as they go. (Bruce Schneier made this argument in *Applied
Cryptography* in 1996. Reversible computing would escape Landauer's bound in
principle, and quantum search changes the count; see
[Chapter 20](20-Quantum-Computers.md).)

## Exercises

??? question "1. What is 11001010 XOR 10101010?"

    `01100000`. Write them one above the other; a 1 wherever the bits differ.

??? question "2. A 4-digit PIN is chosen uniformly at random. What is its entropy? An attacker gets 3 guesses: what is the chance of success?"

    $\log_2 10^4 \approx 13.3$ bits. Three guesses succeed with probability $3/10{,}000 = 0.03\%$.
    If people choose their own PINs the min-entropy is far lower: "1234" alone is
    chosen by a large share of people.

??? question "3. A website gives each session a random 40-bit ID. After how many sessions is a repeat likely?"

    About $1.25 \sqrt{2^{40}} = 1.25 \cdot 2^{20} \approx 1.3$ million sessions. Session IDs need
    at least 128 bits.

??? question "4. A hash has 384-bit output. What collision security does it give?"

    About 192 bits, half the output length. That is SHA-384's level.

??? question "5. Which is stronger: a random 10-character password from 62 letters and digits, or 5 random Diceware words?"

    $10 \log_2 62 \approx 59.5$ bits against $5 \log_2 7776 \approx 64.6$ bits. The five words, and
    they are easier to remember.

??? question "6. A spy uses dice to make a one-time pad of decimal digits, rolling one die for each key digit 0 to 9. Is it still perfectly secret?"

    No. A die gives only six values, so some key digits never appear and some
    plaintext digits become impossible for a given ciphertext digit. Perfect secrecy
    needs every key value to be equally likely.

??? question "7. Two messages were encrypted with the same one-time pad. You guess that one of them contains \" the \" somewhere. How do you use that?"

    XOR the two ciphertexts to get $m_1 \oplus m_2$. Slide `" the "` along it, XORing at each
    position. Where the guess is right, the result is five readable characters of the
    other message; elsewhere it is mostly gibberish. Extend from there by guessing
    the words around it (crib dragging).

??? question "8. Why doesn't the two-time pad attack work on two messages encrypted with ChaCha20 under the same key but different nonces?"

    The keystreams are different, so they don't cancel: $c_1 \oplus c_2 = m_1 \oplus m_2
    \oplus s_1 \oplus s_2$, and $s_1 \oplus s_2$ looks random to anyone without the key.

??? question "9. Prove that a cipher whose keys are 100 bits long can't have perfect secrecy for 101-bit messages."

    There are $2^{100}$ keys and $2^{101}$ messages. Fix a possible ciphertext $c$.
    Decrypting it under all keys gives at most $2^{100}$ messages, so at least half
    the messages can never produce $c$. For such an $m'$, $\Pr[C = c \mid M = m'] = 0$,
    while for the message that did produce it the probability is positive, so the
    ciphertext carries information about the message. This is Shannon's theorem.

??? question "10. A device makes its RSA key at first boot from a generator seeded with the time in seconds and a 16-bit counter. The attacker knows the boot happened within one day. How many keys must they try?"

    $86{,}400 \cdot 65{,}536 \approx 5.7 \times 10^{9}$, about $2^{32.4}$. That is a few hours on
    one computer, whatever the size of the RSA key. The seed's entropy, not the key's
    length, sets the security.

## What you learned

- Security levels assume uniformly random keys; $n$-bit keys take about $2^n$
  tries, and many targets lower the cost.
- Entropy measures uncertainty in bits; min-entropy, set by the most likely
  value, is what matters against a guessing attacker. Human choices have little
  of it.
- The birthday bound: repeats appear after about $\sqrt{N}$ draws, so hashes
  need twice the bits, and 64-bit blocks and short random nonces wear out.
- The one-time pad is perfectly secret, and Shannon proved that any perfectly
  secret cipher needs as much key as message.
- Reusing a pad cancels the key (Tunny, Venona), and the pad alone gives no
  integrity.
- Use the OS generator through `secrets` or your library for every secret;
  bad randomness broke Netscape, Debian, routers, the PlayStation 3 and
  Android wallets, and Dual_EC_DRBG hid a back door.

**Next:** Part II begins with [Chapter 5](05-Stream-Ciphers.md), which turns the
one-time pad into practical stream ciphers, from RC4 and its failure to
ChaCha20.

## Further reading

- Claude Shannon, "A Mathematical Theory of Communication", *Bell System
  Technical Journal* 27 (1948), and "Communication Theory of Secrecy Systems",
  *Bell System Technical Journal* 28 (1949).
- Jonathan Katz and Yehuda Lindell, *Introduction to Modern Cryptography* (3rd
  edition, 2020), chapters 2 and 3: perfect secrecy and pseudorandomness.
- Steven M. Bellovin, "Frank Miller: Inventor of the One-Time Pad",
  *Cryptologia* 35 (2011).
- Robert L. Benson, *The Venona Story*, NSA Center for Cryptologic History.
- Ian Goldberg and David Wagner, "Randomness and the Netscape Browser",
  *Dr. Dobb's Journal* (January 1996).
- Nadia Heninger, Zakir Durumeric, Eric Wustrow and J. Alex Halderman, "Mining
  Your Ps and Qs", USENIX Security 2012.
- NIST SP 800-90A Rev. 1, SP 800-90B and SP 800-90C.
- On this site: [OS random number generators](../09-random/OS-RNG.md),
  [NIST DRBGs](../09-random/NIST-DRBG.md),
  [Retired generators](../09-random/Retired.md) and the
  [FAQ on randomness](../FAQ.md#why-does-randomness-matter-so-much).
