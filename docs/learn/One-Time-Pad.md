# Bits, XOR and the one-time pad

*The only cipher that is proven unbreakable, why almost nobody uses it, and the
one mistake that has broken it again and again.*

## Bits, bytes and hex

Computers store everything as **bits**, 0 or 1. Eight bits make a **byte**,
which holds a number from 0 to 255. The letter `A` is byte 65, `01000001` in
binary. Writing long strings of bits is tiring, so people write bytes in
**hexadecimal**, base 16, using 0 to 9 and a to f: one hex digit is four bits,
so a byte is two hex digits. `A` is `41`, a space is `20`, and the 32-byte keys
on this site are written as 64 hex digits. [Encoding](../formats/Encoding.md)
covers hex, Base64 and the rest.

## XOR

Almost every cipher on this site uses one operation over and over: **XOR**
(exclusive or), written $\oplus$. It compares two bits and gives 1 if they are
different, 0 if they are the same:

| $a$ | $b$ | $a \oplus b$ |
|---|---|---|
| 0 | 0 | 0 |
| 0 | 1 | 1 |
| 1 | 0 | 1 |
| 1 | 1 | 0 |

For longer values XOR each pair of bits: `1010` $\oplus$ `0110` = `1100`.

XOR is addition mod 2 with no carry, and it has the property that makes it
perfect for ciphers: **doing it twice undoes it.**

$$
a \oplus a = 0, \qquad a \oplus 0 = a, \qquad \text{so} \qquad (m \oplus k) \oplus k = m.
$$

The same key that locks also unlocks, and the same circuit does both.

## The one-time pad

**How it works.** The key is a string of truly random bits, as long as the
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

## The story

- **Who made it:** a Sacramento banker, Frank Miller, described a pad of random
  numbers for telegraph codes in 1882; his booklet was forgotten until Steven
  Bellovin found it in 2011. Gilbert Vernam at AT&T built the electrical version
  in 1917, XORing teleprinter tape with a key tape (US patent 1,310,719, 1919).
  Joseph Mauborgne of the US Army saw that the key must be random and never
  reused. In the 1920s the German Foreign Office used one-time pads of random
  digits.
- **What for:** messages that must stay secret forever.
- **What it solved:** every earlier cipher leaked patterns. A one-time pad leaks
  nothing at all. Claude Shannon proved it in a classified report in 1945,
  published in 1949 as "Communication Theory of Secrecy Systems".
- **Where it stands:** still used where the key can be delivered in advance and
  the volume is small: spy numbers stations, and in 1963 the Moscow-Washington
  hotline ran on one-time tape. For everything else it is impractical, and
  modern stream ciphers imitate it (below).
- **Incidents:** **Tunny (1941):** on 30 August 1941 a German operator sent a
  4,000-character message on the Lorenz teleprinter cipher, was asked to repeat
  it, and sent it again with the same key setting. John Tiltman at Bletchley Park
  recovered both messages and the key, and Bill Tutte worked out the whole
  machine from that key. **Venona (1943 to 1980):** under wartime pressure in
  1942, a Soviet factory printed some one-time pad pages twice. US Army
  codebreakers at Arlington Hall, starting with Gene Grabeel and later Meredith
  Gardner, matched the reused pages and read parts of about 3,000 messages,
  exposing Klaus Fuchs, Julius Rosenberg and Donald Maclean.

## Why it's unbreakable

Take any ciphertext $c$ of $n$ bits. For **every** possible message $m$ of $n$
bits there is exactly one key that turns $m$ into $c$, namely $k = m \oplus c$.
All keys are equally likely, so

$$
\Pr[C = c \mid M = m] = \Pr[K = m \oplus c] = 2^{-n} \quad \text{for every } m.
$$

The ciphertext is equally likely whatever the message was, so seeing it tells
you nothing. Intercept `68c342fe6663fe88d0707b8066a9` and it could be
`ATTACK AT DAWN`, `RETREAT AT TEN`, or any other 14 characters. This is
**perfect secrecy**, and it holds against unlimited computing power, quantum
computers included.

Shannon also proved the price: any cipher with perfect secrecy needs at least
as much key as message. You can't do better than the pad.

## Why almost nobody uses it

1. **The key is as long as everything you'll ever send.** Encrypting a 4 GB
   film needs 4 GB of key, delivered securely beforehand. If you could deliver
   that much secretly, you could have delivered the film.
2. **The key must be truly random.** Not from a password, not from a normal
   random function in a program.
3. **It must never be reused.** See below.
4. **It hides but doesn't protect.** Flip a bit of $c$ and the same bit of $m$
   flips, and nobody can tell. If Mallory knows the message says `ATTACK`, she
   can XOR the ciphertext with `ATTACK` $\oplus$ `RETIRE` and Bob will read
   `RETIRE`. This is why modern encryption always comes with a MAC (see
   [AEAD](../05-modes-aead/AEAD.md)).

## The two-time pad

Use the same key twice and the key cancels out:

$$
c_1 \oplus c_2 = (m_1 \oplus k) \oplus (m_2 \oplus k) = m_1 \oplus m_2 .
$$

The attacker now holds the XOR of two messages, with no key in it. Guess a
word in one ("ATTACK", "THE ", "Dear") and the same spot in the other appears.
Every right guess reveals more of both. That is how Tunny and Venona fell.

```python
m1, m2 = b"ATTACK AT DAWN", b"RETREAT AT TEN"
c1, c2 = xor(m1, k), xor(m2, k)
print(xor(c1, c2) == xor(m1, m2))            # True: the key cancels out
print(xor(xor(c1, c2), b"ATTACK AT DAWN"))   # guess one message, read the other: b'RETREAT AT TEN'
```

## From the pad to modern stream ciphers

A **stream cipher** keeps the XOR and replaces the giant random key with a short
one (say 256 bits) and a nonce, stretched into a long **keystream** that looks
random:

$$
c = m \oplus \mathrm{Keystream}(k, \text{nonce}).
$$

It is no longer perfectly secret, since in principle someone could try all
$2^{256}$ keys, but that is far beyond any possible computer.
[ChaCha20](../04-symmetric-ciphers/ChaCha.md) and AES in
[CTR mode](../05-modes-aead/Classic-Modes.md) work this way, and so did the
retired [RC4](../04-symmetric-ciphers/Retired.md#rc4). The two-time-pad rule
lives on as the **nonce rule**: never use the same key and nonce twice. Breaking
it has broken WEP Wi-Fi, WPA2 (KRACK) and many HTTPS servers.

## Try it

??? question "1. What is `11001010` XOR `10101010`?"

    `01100000`. Write them one above the other; a 1 wherever the bits differ.

??? question "2. A spy uses dice to make a one-time pad and rolls only 1 to 6 for each key digit 0 to 9. Is it still perfectly secret?"

    No. Key digits 0, 7, 8 and 9 never appear (or appear in a biased way), so some
    plaintext digits become impossible for a given ciphertext digit. Perfect
    secrecy needs every key value to be equally likely.

??? question "3. Why doesn't the two-time pad attack work on two messages encrypted with ChaCha20 under different nonces?"

    The keystreams are different, so they don't cancel: $c_1 \oplus c_2 = m_1 \oplus m_2
    \oplus s_1 \oplus s_2$, and $s_1 \oplus s_2$ looks random.
