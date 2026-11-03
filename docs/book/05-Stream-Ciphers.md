# 5. Stream Ciphers

*The one-time pad of [Chapter 4](04-Randomness-and-Perfect-Secrecy.md) is
perfect and almost useless, because its key is as long as the message. A stream
cipher keeps the pad's XOR and replaces the giant key with a short one,
stretched into a long keystream. This chapter builds that idea three times: with
linear shift registers, which are fast and fatally predictable; with RC4, which
was everywhere for twenty years and then failed in Wi-Fi and the web; and with
ChaCha20, the design that replaced it. Along the way you will break each of the
first two with a few lines of Python, and learn the one rule every stream cipher
user must follow.*

!!! abstract "In this chapter"
    **You will learn:**

    - what a keystream generator is, and what "looks random" has to mean for one;
    - how linear feedback shift registers work, and how Berlekamp-Massey and
      correlation attacks break them;
    - how RC4 works, why its output is biased, and how WEP Wi-Fi was broken in minutes;
    - how ChaCha20 is built from add, rotate and XOR, and how to code it from RFC 8439;
    - why reusing a key and nonce is fatal, and why a stream cipher alone never
      protects a message from being changed.

    **You need:** [Chapter 4](04-Randomness-and-Perfect-Secrecy.md) (XOR, the
    one-time pad, randomness) and the bit operations from
    [Chapter 3](03-The-Arithmetic-of-Secrets.md).

    **Levels:** §5.1 to §5.3 are for beginners, §5.4 to §5.9 are intermediate,
    §5.10 is expert.

## 5.1 The problem

In 1917 Gilbert Vernam, an engineer at AT&T, built a teleprinter that XORed each
5-bit character of a message with a character from a paper tape of key. The
receiver's machine XORed the same tape again and the message came back. Joseph
Mauborgne of the US Army Signal Corps saw that if the key tape was random and
never used twice, nobody could read the traffic. That is the one-time pad, and
Claude Shannon proved in 1949 that it is perfectly secret.

It also has a cost that no cleverness removes: the key is as long as everything
you will ever send, and it has to reach the other side in secret beforehand.
Armies and embassies did this with couriers and pads of paper. For a phone call,
a video stream or a disk, it is hopeless.

So engineers asked a different question. What if the key tape were not random,
but **generated** by a machine from a short secret setting? Both ends set their
machines the same way, both produce the same long tape, and only the short
setting has to be shared. The tape is no longer perfectly random, so the
security is no longer perfect. The hope is that it is random-looking enough that
nobody can tell.

The German army tried exactly this in the Second World War. The Lorenz SZ40 and
SZ42 machines, used for teleprinter traffic between Hitler's high command and
army groups, produced their key from twelve wheels with cams around their rims.
Britain called the traffic "Tunny". On 30 August 1941 a German operator sent a
message of about 4,000 characters, was asked to repeat it, and sent it again with
the same wheel settings and small changes to the text. The two ciphertexts used
the same key. John Tiltman at Bletchley Park recovered both texts and the key,
and from that key alone the young mathematician Bill Tutte worked out how the
machine must be wired, without ever seeing one. By 1944 Tommy Flowers's Colossus
computers were finding the wheel settings by machine.

Two lessons from Tunny run through this chapter. A generated key can be attacked
through its **structure**, since the machine that makes it has far fewer states
than a truly random tape. And using the same key twice is fatal however good the
generator is.

## 5.2 The idea: a keystream generator

A **stream cipher** has two parts:

1. A **keystream generator** $G$: from a short key $k$ (today 128 or 256 bits)
   and a **nonce** $n$ (a "number used once", public), it produces a long string
   of bits $G(k, n)$.
2. The pad's XOR: encrypt with $c = m \oplus G(k, n)$, decrypt with
   $m = c \oplus G(k, n)$.

$$
c_i = m_i \oplus z_i, \qquad z = z_1 z_2 z_3 \ldots = G(k, n).
$$

Decryption is the same operation as encryption, because XORing the same bit
twice cancels it: $(m_i \oplus z_i) \oplus z_i = m_i$.

Why the nonce? The key is meant to last a long time, for many messages. If the
generator took only the key, every message would get the same keystream, and
that is the two-time pad that broke Tunny. The nonce makes each message's
keystream different, and since it does not have to be secret, it is sent in the
clear next to the ciphertext.

What must the generator achieve? Three things, in rising order of difficulty:

- **A long period.** A generator has a finite number of internal states, so it
  must eventually repeat. The cycle must be far longer than any message.
- **Good statistics.** Zeros and ones equally often, pairs and runs as often as
  chance predicts.
- **Unpredictability.** Someone who has seen any amount of keystream must not be
  able to predict the next bit, or say anything about the key, better than by
  guessing.

The third is the real requirement, and the first two do not imply it. A
generator can pass every statistical test in a textbook and still be predicted
perfectly, as the next section shows. In [Chapter 17](17-Defining-Security.md)
this becomes a precise definition: a **pseudorandom generator** is one whose
output no efficient algorithm can tell apart from truly random bits.

## 5.3 Linear feedback shift registers

The simplest keystream generator in hardware is a **linear feedback shift
register** (LFSR): a row of bit cells. At each clock tick the leftmost bit comes
out as keystream, every bit moves one place left, and a new bit enters on the
right. The new bit is the XOR of a few fixed cells, called the **taps**.

**By hand.** Take four cells $s_0 s_1 s_2 s_3$ and the rule "the new bit is
$s_0 \oplus s_1$", which as a recurrence is

$$
s_{n+4} = s_{n+1} \oplus s_n .
$$

Start from the state `1000`. Each line shows the register, the bit that comes
out, and the new bit computed from the first two cells:

| Step | Register $s_n \ldots s_{n+3}$ | Output | New bit $s_n \oplus s_{n+1}$ |
|---|---|---|---|
| 0 | `1000` | 1 | $1 \oplus 0 = 1$ |
| 1 | `0001` | 0 | $0 \oplus 0 = 0$ |
| 2 | `0010` | 0 | $0 \oplus 0 = 0$ |
| 3 | `0100` | 0 | $0 \oplus 1 = 1$ |
| 4 | `1001` | 1 | $1 \oplus 0 = 1$ |
| 5 | `0011` | 0 | $0 \oplus 0 = 0$ |
| 6 | `0110` | 0 | $0 \oplus 1 = 1$ |

Carry on and the output is

$$
\underbrace{1\,0\,0\,0\,1\,0\,0\,1\,1\,0\,1\,0\,1\,1\,1}_{15 \text{ bits}}\;1\,0\,0\,0\,1\,0\,0\,1 \ldots
$$

It repeats after 15 bits. A 4-bit register has 16 states, and the all-zero state
is useless (it only ever produces zeros), so 15 is the longest cycle possible.
Every nonzero 4-bit state appears exactly once in it. Within one period there are
eight ones and seven zeros, and runs of each length appear as often as in a fair
coin's flips. Statistically, it is a fine-looking random sequence.

**How long can the period be?** Write the recurrence as a polynomial over bits:
$s_{n+4} = s_{n+1} + s_n$ becomes $x^4 = x + 1$, that is, $x^4 + x + 1$. An
$L$-cell LFSR reaches the maximum period $2^L - 1$ exactly when this polynomial
is **primitive**, a property from the theory of finite fields that
[Chapter 7](07-AES.md) begins to explain. Primitive polynomials exist for every
length (two for $L = 4$, about 67 million for $L = 32$) and tables of them have
been published since Solomon Golomb's book *Shift Register Sequences* (1967). So
a 64-cell register gives a period of $2^{64} - 1$ with a handful of XOR gates.

That made LFSRs the stream cipher of choice wherever hardware was small:
military radios, the GSM phone cipher A5/1 (three LFSRs of 19, 22 and 23 cells),
Bluetooth's E0, and the DVD's Content Scramble System. Every one of them was
broken, for a reason the next section makes concrete.

## 5.4 Why linear fails

*Level: intermediate.* An LFSR's output is **linear**: every output bit is an XOR
of bits of the starting state. Linear equations are easy to solve. If you know
the taps and see $L$ output bits of an $L$-cell register, you have $L$ linear
equations in the $L$ unknown state bits, and Gaussian elimination solves them.
The output bits are in fact the starting state, shifted out one at a time.

Hiding the taps does not help. In 1968 Elwyn Berlekamp published an algorithm for
decoding BCH error-correcting codes, and in 1969 James Massey showed it finds the
**shortest LFSR that produces any given sequence**. Give the
**Berlekamp-Massey algorithm** $2L$ bits from an unknown $L$-cell LFSR and it
returns the taps, after which the attacker runs the register forward and
predicts everything. The length of that shortest LFSR is called the sequence's
**linear complexity**, and a good keystream must have a huge one.

Here a 32-bit LFSR with secret taps and a secret start state produces 1,000 bits.
The attacker sees the first 64:

```python
def lfsr(state, taps, n):              # state: list of bits; taps: cells XORed into the new bit
    s, out = state[:], []
    for _ in range(n):
        out.append(s[0])
        s = s[1:] + [sum(s[t] for t in taps) % 2]
    return out

def berlekamp_massey(bits):            # shortest LFSR that makes these bits
    c, b = [1], [1]                    # connection polynomials, lowest degree first
    L, m = 0, 1
    for n in range(len(bits)):
        d = bits[n]                    # does the current LFSR predict bit n?
        for i in range(1, L + 1):
            d ^= c[i] & bits[n - i]
        if d == 0:
            m += 1
            continue
        t = c[:]                       # no: correct c with a shifted copy of b
        c += [0] * (len(b) + m - len(c))
        for i, x in enumerate(b):
            c[i + m] ^= x
        if 2 * L <= n:
            L, b, m = n + 1 - L, t, 1
        else:
            m += 1
    return L, c[:L + 1]

def predict(bits, c, n):               # run the recovered LFSR forward
    s = bits[:]
    while len(s) < n:
        s.append(sum(c[i] & s[-i] for i in range(1, len(c))) % 2)
    return s

key = [int(b) for b in format(0xC0FFEE42, "032b")]   # the secret start state
taps = [0, 1, 2, 22]                                   # s[n+32] = s[n] + s[n+1] + s[n+2] + s[n+22]
stream = lfsr(key, taps, 1000)

L, c = berlekamp_massey(stream[:64])   # the attacker sees 64 bits
print(L, [i for i in range(len(c)) if c[i]])
print(predict(stream[:64], c, 1000) == stream)
```

It prints

```
32 [0, 10, 30, 31, 32]
True
```

The attacker found a 32-cell register with the rule
$s_n = s_{n-10} \oplus s_{n-30} \oplus s_{n-31} \oplus s_{n-32}$, which is the
secret rule written backwards, and predicted all 936 bits it had not seen.

### Adding nonlinearity, and the correlation attack

Designers responded by combining several LFSRs through a **nonlinear** function.
A classic example is the Geffe generator (1973): three registers, where the
second one chooses which of the other two to output,

$$
z = \begin{cases} x_1 & \text{if } x_2 = 1 \\ x_3 & \text{if } x_2 = 0 \end{cases}
\qquad\text{that is}\qquad z = x_1 x_2 \oplus (1 \oplus x_2)\, x_3 .
$$

Its linear complexity is large, so Berlekamp-Massey no longer works. But look at
how often $z$ agrees with $x_1$: whenever $x_2 = 1$ (half the time), and by
chance half of the remaining time. So $z = x_1$ about 75% of the time. In 1985
Thomas Siegenthaler turned that into the **correlation attack**: guess the start
state of register 1 alone, and keep the guess whose output agrees with the
keystream far more than half the time. The registers fall one at a time, so the
work is the **sum** of their sizes, not the product.

```python
def bits(x, k):
    return [x >> i & 1 for i in range(k)]

R = [(7, [0, 1]), (9, [0, 4]), (11, [0, 2])]   # lengths and taps of the three registers
N = 200

def geffe(keys, n):
    x1, x2, x3 = (lfsr(bits(k, L), t, n) for k, (L, t) in zip(keys, R))
    return [a if b else c for a, b, c in zip(x1, x2, x3)]   # x2 picks x1 or x3

secret = [80, 131, 1520]               # 7 + 9 + 11 = 27 key bits
z = geffe(secret, N)

def best(L, taps):                     # the start state whose output agrees with z most often
    score = lambda k: sum(a == b for a, b in zip(lfsr(bits(k, L), taps, N), z))
    return max(range(1, 2 ** L), key=score)

k1, k3 = best(*R[0]), best(*R[2])      # 2^7 + 2^11 guesses instead of 2^27
k2 = next(k for k in range(1, 2 ** 9) if geffe([k1, k, k3], N) == z)
print([k1, k2, k3])                    # [80, 131, 1520]
```

About 2,700 guesses replace 134 million. Real ciphers are bigger, but the same
idea, improved into "fast correlation attacks" and algebraic attacks, broke most
LFSR-based designs.

### A5/1 and the GSM phone

The best-known casualty is **A5/1**, the cipher that protected GSM mobile calls
in Europe and much of the world from the early 1990s. It was kept secret, and a
weaker export version, A5/2, was used in other markets. In 1999 Marc Briceno, Ian
Goldberg and David Wagner reverse-engineered both from a phone. A5/2 was broken
almost at once. For A5/1, Alex Biryukov, Adi Shamir and David Wagner showed in
2000 how to find the key from a few minutes of conversation after a large
precomputation, and in 2009 Karsten Nohl and his collaborators computed public
tables that made the attack practical with ordinary equipment. A5/1 has only 64
bits of state, the same as its key, and §5.10 explains why a state that small
lets an attacker trade memory for time. Later phone networks moved to block
ciphers and to newer stream ciphers designed with these attacks in mind (see
§5.9).

## 5.5 RC4: fast, simple and biased

*Level: intermediate.* In 1987 Ron Rivest designed a stream cipher for RSA Data
Security with no shift registers at all. **RC4** ("Rivest Cipher 4") keeps a
permutation of the 256 byte values, shuffles it with the key, and then keeps
shuffling while it reads out bytes. It was a trade secret until September 1994,
when its source code was posted anonymously to the Cypherpunks mailing list. It
went into Lotus Notes, Netscape's SSL, Wi-Fi (WEP and
WPA's TKIP), Microsoft's Kerberos and Office, PDF encryption, and TLS. Its appeal
is that it fits in ten lines and runs fast on any processor, with no special
hardware.

**The algorithm.** The state is a permutation $S$ of $0, 1, \ldots, 255$ and two
indexes $i, j$.

$$
\begin{aligned}
&\textbf{Key schedule (KSA):} && S = [0, 1, \ldots, 255],\ j = 0; \text{ for } i = 0 \ldots 255:\ j \leftarrow j + S[i] + K[i \bmod \ell],\ \text{swap } S[i], S[j] \\
&\textbf{Output (PRGA):} && i \leftarrow i + 1,\ j \leftarrow j + S[i],\ \text{swap } S[i], S[j],\ \text{output } S[S[i] + S[j]]
\end{aligned}
$$

All additions are $\bmod 256$, and $\ell$ is the key length in bytes (5 to 256).

**By hand, with 8 entries.** Shrink everything from 256 to 8 (all arithmetic
$\bmod 8$) and use the key $K = [2, 5, 1]$. The key schedule:

| $i$ | $j \leftarrow j + S[i] + K[i \bmod 3]$ | $S$ after the swap |
|---|---|---|
| 0 | $0 + 0 + 2 = 2$ | `2 1 0 3 4 5 6 7` |
| 1 | $2 + 1 + 5 = 8 \to 0$ | `1 2 0 3 4 5 6 7` |
| 2 | $0 + 0 + 1 = 1$ | `1 0 2 3 4 5 6 7` |
| 3 | $1 + 3 + 2 = 6$ | `1 0 2 6 4 5 3 7` |
| 4 | $6 + 4 + 5 = 15 \to 7$ | `1 0 2 6 7 5 3 4` |
| 5 | $7 + 5 + 1 = 13 \to 5$ | `1 0 2 6 7 5 3 4` |
| 6 | $5 + 3 + 2 = 10 \to 2$ | `1 0 3 6 7 5 2 4` |
| 7 | $2 + 4 + 5 = 11 \to 3$ | `1 0 3 4 7 5 2 6` |

Then output, starting again from $i = j = 0$:

| $i$ | $j \leftarrow j + S[i]$ | $S$ after the swap | $t = S[i] + S[j]$ | Output $S[t]$ |
|---|---|---|---|---|
| 1 | $0 + 0 = 0$ | `0 1 3 4 7 5 2 6` | $1 + 0 = 1$ | 1 |
| 2 | $0 + 3 = 3$ | `0 1 4 3 7 5 2 6` | $4 + 3 = 7$ | 6 |
| 3 | $3 + 3 = 6$ | `0 1 4 2 7 5 3 6` | $2 + 3 = 5$ | 5 |

The keystream starts 1, 6, 5, 5, 7. Real RC4 is the same with 256 entries and
whole bytes.

**Code it.** This version is checked against the test vectors of RFC 6229, then
used to count how often the **second** output byte is zero over 65,536 different
keys. A fair byte would be zero $65536 / 256 = 256$ times.

```python
import hashlib

def rc4(key, n):
    S, j = list(range(256)), 0
    for i in range(256):                  # key schedule: shuffle S with the key
        j = (j + S[i] + key[i % len(key)]) % 256
        S[i], S[j] = S[j], S[i]
    i = j = 0
    out = []
    for _ in range(n):                    # keystream: one swap, one byte out
        i = (i + 1) % 256
        j = (j + S[i]) % 256
        S[i], S[j] = S[j], S[i]
        out.append(S[(S[i] + S[j]) % 256])
    return bytes(out)

print(rc4(bytes([1, 2, 3, 4, 5]), 8).hex())   # b2396305f03dc027, as in RFC 6229

N = 65536
keys = (hashlib.sha256(i.to_bytes(4, "big")).digest()[:16] for i in range(N))
print(sum(rc4(k, 2)[1] == 0 for k in keys), N // 256)   # 480 256
```

The second byte is zero almost twice as often as it should be. Itsik Mantin and
Adi Shamir proved in 2001 that the probability is about $2/256$, not $1/256$. That
one bias is enough to tell RC4 from random after a few hundred keys, and it is
far from the only one: the first 256 bytes are full of smaller biases, and some
pairs of bytes appear together too often throughout the stream.

## 5.6 How RC4 failed: WEP and TLS

*Level: intermediate.*

### WEP

The first Wi-Fi standard, IEEE 802.11 (1997), protected wireless traffic with
**WEP**, "Wired Equivalent Privacy". Every device on a network shared one secret
key, 40 bits (later 104). For each packet, the sender picked a 24-bit
**initialization vector** (IV), sent it in the clear, and used the RC4 key

$$
K = \mathit{IV} \,\Vert\, \mathit{secret}.
$$

That is a nonce, so far so good. It went wrong in three ways.

1. **The IV was too short.** With $2^{24}$ possible IVs, a busy network repeats
   one after about 5,000 packets by the birthday bound ($\sqrt{2 \ln 2 \cdot 2^{24}} \approx 4{,}823$),
   and every repeat is a two-time pad.
2. **The integrity check was linear.** WEP appended a CRC-32 checksum, which is
   linear in the message, so an attacker could flip message bits and fix the
   checksum without knowing anything.
3. **RC4's key schedule leaks related keys.** In 2001 Scott Fluhrer, Itsik Mantin
   and Adi Shamir found that when the first key bytes are public and follow a
   pattern, the first output byte depends on the first secret key byte far more
   than it should. Every WEP packet begins with the same header byte, `0xAA`, so
   its first keystream byte is known.

The **FMS attack** works like this. Take IVs of the form $(A + 3, 255, x)$. The
attacker knows the first $A + 3$ key bytes (the IV plus the secret bytes already
found), so it can run the first $A + 3$ steps of the key schedule itself. In
about 5% of cases, the rest of the key schedule leaves those entries alone, and
then the first output byte gives away the next key byte directly. Each IV casts
a vote; the right byte gets about 5% of the votes and the others share the rest.

```python
secret = b"\x1f\x9a\x42\xc3\x07"          # the network's 40-bit WEP key

def sniff(iv):                            # one packet: the IV, and its first keystream byte
    return rc4(iv + secret, 1)[0]         # (known, because every packet starts with 0xAA)

known = []
for A in range(len(secret)):              # recover key byte A
    votes = [0] * 256
    for x in range(256):
        iv = bytes([A + 3, 255, x])       # a "weak" IV
        K = iv + bytes(known)
        S, j = list(range(256)), 0
        for i in range(A + 3):            # run the key schedule as far as we know the key
            j = (j + S[i] + K[i]) % 256
            S[i], S[j] = S[j], S[i]
        votes[(S.index(sniff(iv)) - j - S[A + 3]) % 256] += 1
    known.append(max(range(256), key=votes.__getitem__))
print(bytes(known).hex(), bytes(known) == secret)   # 1f9a42c307 True
```

Here 256 packets per key byte were enough (for the second byte, by 7 votes to 6,
a narrow win; a real attacker collects more weak IVs and tries the runners-up).
Adam Stubblefield, John Ioannidis and Aviel Rubin carried out the attack against
a real network within weeks of the paper. In 2007 Erik Tews, Ralf-Philipp
Weinmann and Andrei Pyshkin used more of RC4's biases to recover a 104-bit key
from about 40,000 packets, collected in about a minute, with probability one
half.

It had real victims. The breach of the American retailer TJX, disclosed in 2007,
began with attackers breaking the WEP network of one of its stores, and ended
with about 45 million payment card numbers stolen. Wi-Fi moved first to **WPA**
(2003), which kept RC4 but mixed a fresh key for every packet (TKIP) as a stopgap
for old hardware, and then to **WPA2** (2004), which uses AES in a mode you will
meet in [Chapter 8](08-Modes-of-Operation.md).

### TLS

RC4 did not depend on WEP's mistakes to fail. In TLS each connection gets a
fresh, unrelated key, so the FMS attack does not apply. But the browser sends
the same secret, a cookie or a password, in many connections, and RC4's biases
in the first 256 bytes pull each encrypted copy slightly toward particular
values. In 2013 Nadhem AlFardan, Daniel J. Bernstein, Kenneth Paterson, Bertram
Poettering and Jacob Schuldt showed that with enough copies, on the order of
$2^{24}$ to $2^{32}$ connections, the plaintext can be recovered byte by byte. In
2015 Mathy Vanhoef and Frank Piessens ("RC4 NOMORE") recovered a website cookie
in 75 hours. RFC 7465 (2015) forbade RC4 in TLS, and the major browsers removed it
in early 2016.

The lesson: a stream cipher whose output can be told from random, even slightly,
will eventually leak plaintext when the same secret is encrypted often enough.

## 5.7 ChaCha20: a modern stream cipher

*Level: intermediate.* From 2004 to 2008 the European network ECRYPT ran
**eSTREAM**, a competition for new stream ciphers. Its final portfolio had
two lists: for software, HC-128, Rabbit, Salsa20/12 and SOSEMANUK; for small
hardware, Grain, MICKEY and Trivium. The design that went furthest was Daniel J.
Bernstein's **Salsa20** (2005), and its refinement **ChaCha** (2008).

Salsa20 and ChaCha are not shift registers and do not keep a changing state at
all. They are **counter-based**: a function takes the key, the nonce and a block
number, and returns 64 bytes of keystream for that block. Block 7 can be
computed without computing blocks 1 to 6, which makes the cipher parallel and
lets a receiver decrypt any part of a stream directly.

### The state

ChaCha20 (as specified in RFC 8439) arranges sixteen 32-bit words in a
$4 \times 4$ grid:

$$
\begin{bmatrix}
\text{"expa"} & \text{"nd 3"} & \text{"2-by"} & \text{"te k"} \\
k_0 & k_1 & k_2 & k_3 \\
k_4 & k_5 & k_6 & k_7 \\
\mathit{counter} & n_0 & n_1 & n_2
\end{bmatrix}
$$

The first row is the constant text "expand 32-byte k", then the 256-bit key in
eight words, then a 32-bit block counter and a 96-bit nonce.

### The quarter round

All the mixing is done by one small function on four words $a, b, c, d$. It uses
only three operations: **A**ddition $\bmod 2^{32}$, **R**otation of the bits of
a word, and **X**OR. Designs built this way are called **ARX**.

$$
\begin{aligned}
a &\leftarrow a + b, & d &\leftarrow (d \oplus a) \lll 16 \\
c &\leftarrow c + d, & b &\leftarrow (b \oplus c) \lll 12 \\
a &\leftarrow a + b, & d &\leftarrow (d \oplus a) \lll 8 \\
c &\leftarrow c + d, & b &\leftarrow (b \oplus c) \lll 7
\end{aligned}
$$

Why these three? XOR and rotation are linear over bits, and addition is not: the
carries make each output bit depend on all lower input bits in a nonlinear way.
Alternating them destroys the linear structure that killed LFSRs, and it costs
only a few instructions with no table lookups, so no secret-dependent memory
access for an attacker to time (see [Chapter 18](18-Side-Channels.md)).

**By hand: one quarter round.** RFC 8439 §2.1.1 gives a test. All values are
hexadecimal.

<div class="mars-steps" markdown>

1. Start with $a$ = `11111111`, $b$ = `01020304`, $c$ = `9b8d6f43`, $d$ = `01234567`.
2. $a \leftarrow a + b$ = `12131415`. Then $d \oplus a$ = `13305172`, rotated left 16 bits: $d$ = `51721330`.
3. $c \leftarrow c + d$ = `ecff8273` (the carry out of the top is dropped). Then $b \oplus c$ rotated left 12: $b$ = `d8177edf`.
4. $a \leftarrow a + b$ = `ea2a92f4`. Then $d \oplus a$ rotated left 8: $d$ = `5881c4bb`.
5. $c \leftarrow c + d$ = `4581472e`. Then $b \oplus c$ rotated left 7: $b$ = `cb1cf8ce`.
6. Result: $a, b, c, d$ = `ea2a92f4`, `cb1cf8ce`, `4581472e`, `5881c4bb`.

</div>

### Rounds and the final addition

A **round** applies four quarter rounds. ChaCha20 alternates **column rounds**
(the four columns of the grid) and **diagonal rounds** (the four diagonals),
ten of each, 20 rounds in all. After two rounds every word depends on every
input word.

Then the original input grid is **added** back, word by word. Without that step
every operation could be run backwards, and the keystream block would lead
straight back to the key. With it, an attacker who knows the output still needs
the input to undo the addition, and the input contains the key.

### Code it

```python
import struct

M = 0xffffffff

def rotl(x, n):
    return (x << n | x >> (32 - n)) & M

def qr(s, a, b, c, d):                    # the quarter round, RFC 8439 section 2.1
    s[a] = (s[a] + s[b]) & M; s[d] = rotl(s[d] ^ s[a], 16)
    s[c] = (s[c] + s[d]) & M; s[b] = rotl(s[b] ^ s[c], 12)
    s[a] = (s[a] + s[b]) & M; s[d] = rotl(s[d] ^ s[a], 8)
    s[c] = (s[c] + s[d]) & M; s[b] = rotl(s[b] ^ s[c], 7)

def block(key, counter, nonce):           # 32-byte key, 12-byte nonce -> 64 bytes of keystream
    init = [0x61707865, 0x3320646e, 0x79622d32, 0x6b206574]   # "expand 32-byte k"
    init += [*struct.unpack("<8I", key), counter, *struct.unpack("<3I", nonce)]
    s = init[:]
    for _ in range(10):                   # 10 double rounds = 20 rounds
        qr(s, 0, 4, 8, 12); qr(s, 1, 5, 9, 13); qr(s, 2, 6, 10, 14); qr(s, 3, 7, 11, 15)   # columns
        qr(s, 0, 5, 10, 15); qr(s, 1, 6, 11, 12); qr(s, 2, 7, 8, 13); qr(s, 3, 4, 9, 14)   # diagonals
    return struct.pack("<16I", *[(x + y) & M for x, y in zip(s, init)])

def chacha20(key, counter, nonce, data):  # encrypting and decrypting are the same
    out = bytearray()
    for i in range(0, len(data), 64):
        ks = block(key, counter + i // 64, nonce)
        out += bytes(a ^ b for a, b in zip(data[i:i + 64], ks))
    return bytes(out)

s = [0x11111111, 0x01020304, 0x9b8d6f43, 0x01234567]
qr(s, 0, 1, 2, 3)
print(" ".join("%08x" % x for x in s))    # ea2a92f4 cb1cf8ce 4581472e 5881c4bb

key = bytes(range(32))                    # the test vector in RFC 8439 section 2.3.2
nonce = bytes.fromhex("000000090000004a00000000")
print(block(key, 1, nonce)[:16].hex())    # 10f1e7e4d13b5915500fdd1fa32071c4

ct = chacha20(key, 1, nonce, b"see you at noon")
print(ct.hex())                           # 639482c4a8542c35317bfd71cc4f1f
print(chacha20(key, 1, nonce, ct))        # b'see you at noon'
```

The ciphertext was also checked against the ChaCha20 in the `cryptography`
library. Change one bit of the key and about half of the 512 keystream bits in
a block change (255 of them, in a quick test): the avalanche you want from a
generator whose output must look unrelated for related inputs.

This is a teaching copy. Python's integers give no promise of constant time, and
a real implementation processes several blocks at once with vector instructions.

## 5.8 Break it: nonce reuse and malleability

*Level: intermediate.* ChaCha20 has no known weakness. Systems that use it, and
every other stream cipher, still fail in two ways that have nothing to do with
the cipher.

### Using a nonce twice

If two messages are encrypted under the same key **and** the same nonce, they
get the same keystream $z$, and

$$
c_1 \oplus c_2 = (m_1 \oplus z) \oplus (m_2 \oplus z) = m_1 \oplus m_2 .
$$

The key is gone. What is left is the XOR of two texts, and text has so much
structure that both usually come out. The classic method is **crib dragging**:
guess a common word, XOR it in at every position, and look for positions where
the other message turns into readable text.

```python
def xor(a, b):
    return bytes(x ^ y for x, y in zip(a, b))

key = bytes.fromhex("8f" * 32)            # one key, and one nonce used twice: the mistake
nonce = bytes(12)
m1 = b"Meet at the north gate at nine. Do bring the documents."
m2 = b"Transfer 5000 dollars to account 4471-2209 on Friday."
c1, c2 = chacha20(key, 1, nonce, m1), chacha20(key, 1, nonce, m2)

x = xor(c1, c2)                           # the key cancels: this is m1 XOR m2
for i in range(len(x) - 4):               # slide the guess " the " along it
    piece = xor(x[i:i + 5], b" the ")
    if all(ch == 32 or chr(ch).isalnum() for ch in piece):
        print(i, piece)
print(xor(x, m1))                         # know one message, read the other
```

Among the eight positions that look like letters and digits, two are right.
Position 7 shows `b'r 500'` and position 40 shows `b'09 on'`, real pieces of the
second message, and extending those guesses a few characters at a time reads
both. Knowing one message outright gives the other at once:

```
4 b'ssy7t'
7 b'r 500'
13 b'obsal'
21 b'e f1a'
25 b'aybd0'
36 b'c0400'
40 b'09 on'
47 b'1haa7'
b'Transfer 5000 dollars to account 4471-2209 on Friday.'
```

This is how Tunny fell in 1941 and how the Soviet one-time pads reused in the
1940s were read in the Venona project. It returned in 2017 as **KRACK**: Mathy
Vanhoef and Frank Piessens found that by replaying one handshake message, an
attacker could make WPA2 devices install the same key again and reset the
packet counter used as the nonce, so packets were encrypted with keystream
already used.

The rules that follow:

- Never encrypt two messages with the same key and nonce. Use a counter as the
  nonce if you can keep one; RFC 8439's 96-bit nonce leaves room for it.
- A **random** 96-bit nonce is safe for about $2^{32}$ messages per key; after
  that the chance of a repeat stops being negligible. For random nonces with no
  limit to worry about, **XChaCha20** stretches the nonce to 192 bits.
- One nonce covers at most $2^{32}$ blocks of 64 bytes, 256 GiB, before the
  32-bit counter wraps.

### Changing a message without the key

A stream cipher hides the message but does nothing to protect it. Flip a bit of
the ciphertext and the same bit of the plaintext flips when it is decrypted, and
nothing tells the receiver. An attacker who knows or guesses what a message says
can change it to anything of the same length:

```python
c2 = bytearray(c2)
pos = m2.index(b"5000")                   # the attacker guesses where the amount is
c2[pos] ^= ord("5") ^ ord("9")            # turn "5" into "9" without the key
print(chacha20(key, 1, nonce, bytes(c2)))
# b'Transfer 9000 dollars to account 4471-2209 on Friday.'
```

This property is called **malleability**, and every cipher in this chapter has
it, the one-time pad included. The cure is a **message authentication code**,
a keyed checksum the receiver verifies before trusting anything.
[Chapter 10](10-Message-Authentication.md) builds one, Poly1305, and joins it
with ChaCha20 into **ChaCha20-Poly1305**, the form in which ChaCha20 is almost
always used.

## 5.9 In the real world

*Level: intermediate.*

**ChaCha20.** Google's Adam Langley moved Chrome and Android connections to
ChaCha20-Poly1305 in TLS from 2013 to 2014, because phones of the time had no
AES instructions and software AES was slow and leaked timing. RFC 7539 (2015)
standardized the cipher, and RFC 8439 (2018) replaced it; RFC 7905 (2016) added
it to TLS 1.2, and it is one of the cipher suites of TLS 1.3 (RFC 8446). OpenSSH
has offered `chacha20-poly1305@openssh.com` since version 6.5 (2014), and the
WireGuard VPN uses it for all traffic. Since Linux 4.8 (2016) the kernel random
number generator produces its output with ChaCha20, and OpenBSD replaced RC4 in
its `arc4random` with ChaCha20 in 2014. Full details: [ChaCha
reference](../04-symmetric-ciphers/ChaCha.md).

**Mobile networks.** After A5/1, 3G and 4G networks use the block ciphers
KASUMI and AES and two stream ciphers designed for the job: **SNOW 3G**, ETSI's
adaptation of SNOW 2.0 by Patrik Ekdahl and Thomas Johansson of Lund University
in Sweden, and **ZUC**, designed at the Chinese Academy of Sciences and named
after the fifth-century mathematician Zu Chongzhi, which 3GPP adopted for LTE in
2011. Both use word-oriented LFSRs, but feed them through nonlinear finite-state machines built to resist
the attacks of §5.4.

**Small hardware.** Trivium and Grain, from the eSTREAM hardware portfolio, need
only a few thousand logic gates. Grain-128AEAD was one of the ten finalists in
NIST's lightweight cryptography competition, which chose Ascon in 2023.

**RC4.** Banned in TLS (RFC 7465, 2015), Kerberos (RFC 8429, 2018) and SSH
(RFC 8758, 2020). It lingers in old Windows Kerberos settings and old PDF files.
Full details: [Retired ciphers](../04-symmetric-ciphers/Retired.md#rc4).

**Block ciphers as stream ciphers.** Most stream encryption today does not use a
dedicated stream cipher at all. It runs a block cipher such as AES in
**counter mode**, which turns it into a keystream generator exactly like
ChaCha20's block function. That is [Chapter 8](08-Modes-of-Operation.md).

| | Key | Nonce | Status |
|---|---|---|---|
| One-time pad | as long as the data | none | perfect, impractical |
| A5/1 | 64 bits | 22-bit frame number | broken |
| RC4 | 40 to 2048 bits | none (WEP glued one on) | broken, banned |
| ChaCha20 (RFC 8439) | 256 bits | 96 bits | recommended |
| XChaCha20 | 256 bits | 192 bits | recommended, no RFC |

## 5.10 Going deeper

*Level: expert.*

**What "pseudorandom" means.** A generator $G: \{0,1\}^k \to \{0,1\}^\ell$ with
$\ell > k$ is a **pseudorandom generator** (PRG) if no efficient algorithm,
given a string, can tell whether it came from $G$ on a random seed or is truly
random, with advantage better than negligible. Andrew Yao showed in 1982 that
this is equivalent to the **next-bit test**: no efficient algorithm, shown the
first $i$ bits, predicts bit $i + 1$ with probability noticeably above $1/2$.
Berlekamp-Massey is a next-bit predictor for any LFSR; the RC4 biases are
distinguishers. A stream cipher whose keystream is pseudorandom gives
**semantic security** for one message per key and nonce, by a short reduction:
an attacker who learns anything about $m$ from $m \oplus G(k)$ can be turned
into a distinguisher for $G$. [Chapter 17](17-Defining-Security.md) does this
properly.

**Why the state must be twice the key.** Steve Babbage (1995) and Jovan Golić
(1997) independently described a time-memory trade-off against any generator with
an $S$-bit state. Precompute the first output bits of $M$ random states and
store them sorted. Observe $D$ windows of keystream. If $M \cdot D \approx 2^S$,
one window probably matches a stored state, and the cipher runs on from there.
With $S = 64$, as in A5/1, $M = D = 2^{32}$ is within reach; that is what the 2009
A5/1 tables did, with refinements. The rule since then: the state should be at
least twice the security level. ChaCha20's state is 512 bits, Trivium's 288 for
an 80-bit key.

**Correlation immunity.** Siegenthaler (1984) defined a combining function to be
$t$-th order **correlation immune** if its output is statistically independent of
every set of $t$ inputs. The Geffe function is not even first-order immune. He
also proved the trade-off that makes design hard: for $n$ inputs, correlation
immunity of order $t$ forces the algebraic degree down to at most $n - t$, and
low degree invites **algebraic attacks** (Courtois and Meier, 2003), which write
the keystream as low-degree equations in the key and solve them.

**The state of ChaCha and Salsa20 cryptanalysis.** The main tool is
differential: flip a bit of the nonce or counter, run a few rounds forward, and
look for an output bit that still depends on the input difference with a bias;
then guess some key bits and run backwards from the output to meet the bias.
Aumasson, Fischer, Khazaei, Meier and Rechberger (2008) used this to attack
Salsa20 with 8 rounds and ChaCha with 7. Later work has lowered the costs, but
the best published attacks still reach 7 rounds of ChaCha at a cost far above
any practical budget, and nobody has an attack on 8. ChaCha20 runs 20. The
security margin is the reason ChaCha8 and ChaCha12 are sometimes proposed for
speed, and the reason standards stay with 20.

??? info "Why the nonce is 96 bits in RFC 8439 but 64 in the original"

    Bernstein's ChaCha has a 64-bit nonce and a 64-bit block counter, so one key
    and nonce can produce $2^{64}$ blocks. The IETF version moved 32 bits from the
    counter to the nonce, because protocols such as TLS build the nonce from a
    per-connection value and a sequence number and wanted more room for it. The
    price is 256 GiB per nonce, plenty for one packet or one TLS record. The two
    versions produce different keystreams for the same inputs, so check which
    one a library means.

??? info "XChaCha20 in one paragraph"

    HChaCha20 runs the 20 rounds on the key and the first 16 bytes of a 24-byte
    nonce, skips the final addition, and outputs 8 of the 16 words as a new key.
    ChaCha20 then runs under that key with the last 8 nonce bytes. A random
    192-bit nonce can be drawn $2^{80}$ times before the chance of a repeat
    reaches $2^{-32}$. libsodium, WireGuard's cookie messages and Go's x/crypto
    ship it, but the IETF draft expired without becoming an RFC.

## Check yourself

??? question "1. A stream cipher encrypts $m$ = `1011` with keystream $z$ = `0110`. What is the ciphertext, and how do you decrypt it?"

    $c = m \oplus z$ = `1101`. Decrypt by XORing the same keystream again:
    `1101` $\oplus$ `0110` = `1011`.

??? question "2. Run the LFSR $s_{n+3} = s_{n+1} \oplus s_n$ from the state `100`. What is its period?"

    The output is `1001011` and then it repeats: period 7, the maximum $2^3 - 1$.
    Its polynomial $x^3 + x + 1$ is primitive.

??? question "3. Why can't an LFSR's all-zero state be used?"

    Every new bit is an XOR of zeros, so the register stays all zero and outputs
    only zeros forever.

??? question "4. An LFSR has 128 cells and secret taps. How many output bits does Berlekamp-Massey need to recover it, and what does that cost?"

    $2L = 256$ bits. The algorithm runs in about $L^2$ simple steps, a fraction
    of a second. A long register does not help: the weakness is the linearity.

??? question "5. In the Geffe generator, the attacker guesses register 1 and checks agreement with the keystream. Why does the wrong guess agree only about half the time?"

    A wrong start state produces a sequence unrelated to $x_1$, so where $z = x_1$
    it matches $z$ only by chance, half the time, and where $z = x_3$ also half the
    time. The right guess agrees about 75% of the time, which stands out after a
    few hundred bits.

??? question "6. A WEP network sends 1,000 packets a second. Roughly how long until an IV repeats, and why is that bad?"

    With $2^{24}$ IVs, the birthday bound gives a 50% chance of a repeat after
    about 4,800 packets, under five seconds. Two packets with the same IV use the
    same RC4 key and keystream, so their XOR is the XOR of the two plaintexts.

??? question "7. Why does ChaCha20 add the input state to the output at the end?"

    Every round step is invertible. Without the addition, anyone who saw a
    keystream block could run the rounds backwards to the input, which contains
    the key. The addition mixes in the unknown input, so the output alone is not
    enough.

??? question "8. Two ChaCha20 messages were sent with the same key and nonce. You know the first is a standard 40-byte header followed by text. What can you read of the second?"

    Its first 40 bytes, at once: $c_1 \oplus c_2 \oplus \text{header}$. The rest
    falls to crib dragging, since you then have the XOR of two texts.

??? question "9. A protocol encrypts with ChaCha20 and puts a CRC-32 checksum of the plaintext inside the encryption. Does that stop the bit-flipping attack?"

    No. CRC-32 is linear up to a constant: for strings of equal length,
    $\mathrm{CRC}(m \oplus \Delta) = \mathrm{CRC}(m) \oplus \mathrm{CRC}(\Delta) \oplus \mathrm{CRC}(0)$,
    where $0$ is the all-zero string. The attacker flips $\Delta$
    in the message and $\mathrm{CRC}(\Delta)$ in the encrypted checksum, which is
    exactly what broke WEP's integrity. A keyed MAC is needed.

??? question "10. A design has a 128-bit key and a 128-bit internal state. Explain why that is a problem even if no other weakness is known."

    The Babbage-Golić trade-off: store $2^{64}$ states with their outputs,
    observe $2^{64}$ keystream windows, and expect a match, recovering the state
    in about $2^{64}$ time and memory, far below the $2^{128}$ the key promises.
    The state should be at least 256 bits.

## What you learned

- A stream cipher XORs the message with a keystream generated from a short key
  and a public nonce. It is the one-time pad with the key made small, and it is
  only as good as the keystream is unpredictable.
- LFSRs give long periods and good statistics, but they are linear:
  Berlekamp-Massey recovers one from $2L$ bits, and correlation attacks split
  nonlinear combinations into their parts.
- RC4 is simple and fast but biased. The biases and WEP's key construction let
  attackers recover Wi-Fi keys in about a minute and, later, TLS cookies.
- ChaCha20 mixes a $4 \times 4$ grid of words with 20 rounds of add, rotate and
  XOR, adds the input back, and is counter-based. It is fast in software, has no
  timing leaks from tables, and no attack reaches more than 7 of its rounds.
- Never reuse a key and nonce pair: the keystream cancels and the plaintexts
  leak. KRACK showed that the protocol around a cipher can force this.
- A stream cipher is malleable. Real systems always pair it with a MAC, as
  ChaCha20-Poly1305 does.

**Next:** [Chapter 6](06-Block-Ciphers.md) turns to the other kind of symmetric
cipher, which encrypts fixed-size blocks, through the story of DES.

## Further reading

- Claude Shannon, "Communication Theory of Secrecy Systems", *Bell System
  Technical Journal* 28 (1949).
- Solomon Golomb, *Shift Register Sequences* (Holden-Day, 1967).
- James Massey, "Shift-Register Synthesis and BCH Decoding", *IEEE Transactions
  on Information Theory* 15 (1969).
- Thomas Siegenthaler, "Decrypting a Class of Stream Ciphers Using Ciphertext
  Only", *IEEE Transactions on Computers* 34 (1985).
- Scott Fluhrer, Itsik Mantin and Adi Shamir, "Weaknesses in the Key Scheduling
  Algorithm of RC4" (SAC 2001); Itsik Mantin and Adi Shamir, "A Practical Attack
  on Broadcast RC4" (FSE 2001).
- Erik Tews, Ralf-Philipp Weinmann and Andrei Pyshkin, "Breaking 104 bit WEP in
  less than 60 seconds" (WISA 2007).
- Nadhem AlFardan, Daniel J. Bernstein, Kenneth Paterson, Bertram Poettering and
  Jacob Schuldt, "On the Security of RC4 in TLS" (USENIX Security 2013).
- [Daniel J. Bernstein, "ChaCha, a variant of Salsa20" (2008)](https://cr.yp.to/chacha/chacha-20080128.pdf).
- RFC 8439, ChaCha20 and Poly1305 for IETF Protocols.
- Mathy Vanhoef and Frank Piessens, "Key Reinstallation Attacks: Forcing Nonce
  Reuse in WPA2" (CCS 2017).
- Jack Copeland (ed.), *Colossus: The Secrets of Bletchley Park's Codebreaking
  Computers* (Oxford, 2006), for Tunny.
- Reference pages: [ChaCha and Salsa20](../04-symmetric-ciphers/ChaCha.md),
  [Retired ciphers: RC4](../04-symmetric-ciphers/Retired.md#rc4),
  [AEAD](../05-modes-aead/AEAD.md), and the history appendix
  [From Shannon to DES](../history/06-Shannon-to-DES.md).
