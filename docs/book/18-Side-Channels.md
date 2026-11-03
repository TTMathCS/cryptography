# 18. Side Channels

*A cipher can be mathematically sound and still give its key away through the
machine that runs it: through how long it takes, how much power it draws, which
memory it touches, what happens when it is glitched, or which error message it
returns. This chapter shows each of these channels with a small attack you can
run, explains the incidents that made them famous, and teaches the defenses,
above all constant-time code.*

!!! abstract "In this chapter"
    **You will learn:**

    - what a side channel is, and why security proofs say nothing about it
    - how timing leaks a password check and an RSA exponent, and how to write code that doesn't leak
    - how power analysis and cache attacks recover AES keys, and how hardware and masking stop them
    - how one fault in an RSA-CRT signature reveals the private key (the Bellcore attack)
    - padding oracles and Bleichenbacher's attack: implementation errors that decrypt everything
    - what Spectre-class attacks changed

    **You need:** [Chapter 7](07-AES.md) (the S-box), [Chapter 8](08-Modes-of-Operation.md) (CBC and padding),
    [Chapter 13](13-RSA.md) (RSA, square and multiply, CRT) and [Chapter 17](17-Defining-Security.md)
    (what the definitions cover).

    **Levels:** 18.1 to 18.3 are for beginners, 18.4 to 18.9 intermediate, 18.10 and 18.11 expert.

## 18.1 The problem

[Chapter 17](17-Defining-Security.md) defined security as a game in which the
attacker sees inputs and outputs and nothing else. Real attackers are not so
polite. A computer is a physical object: it takes time, draws current, gets
warm, makes radio noise and sometimes even sound. A **side channel** is any
such signal that depends on secret data. The math can be perfect and the key
can still walk out through the side.

The idea is older than computers. In 1943 an engineer at Bell Telephone noticed
that whenever the US Army's 131-B2 encryption device, used for teleprinter
traffic, stepped, a spike appeared on an oscilloscope across the lab, and from
the spikes he could read the plaintext. The US government's long study of such
leaks became the program later code-named **TEMPEST**: rules for shielding and
spacing equipment so its emissions carry nothing. According to the memoir of
the MI5 officer Peter Wright (*Spycatcher*, 1987), British intelligence used a
related trick in 1956, during the Suez crisis: a microphone hidden near the
Hagelin cipher machine in the Egyptian embassy in London let them work out the
machine's settings from the sound of its rotors (operation ENGULF). In 1985 the
Dutch researcher Wim van Eck showed that a modified TV set could rebuild the
image on a computer screen from its radio emissions, so this was not a problem
for governments only.

The modern field began in 1996, when Paul Kocher, a 22-year-old cryptography
consultant, published "Timing Attacks on Implementations of Diffie-Hellman,
RSA, DSS, and Other Systems". He showed that the small differences in how long
a private-key operation takes reveal the key bit by bit. The same year,
researchers at Bellcore showed that a single computing fault in an RSA
signature hands over the key. In 1998 Kocher, with Joshua Jaffe and Benjamin
Jun, announced **differential power analysis**, which pulled keys out of
almost every smart card of the time from a few hundred power measurements. Each
of these attacks is the subject of a section below. The common lesson: the
security of a system is the security of its implementation, and
implementations leak.

## 18.2 Timing: the simplest leak

Here is the obvious way to check a password, a MAC tag or any secret string:
compare byte by byte and stop at the first difference.

```python
def check(tag, good):           # leaks: returns at the first wrong byte
    if len(tag) != len(good):
        return False
    for a, b in zip(tag, good):
        if a != b:
            return False
    return True
```

It is correct, and it leaks. The more leading bytes of the guess are right, the
longer it runs. An attacker who can time it does not need to guess the whole
8-byte tag at once ($2^{64}$ tries). It can try all 256 values of the first
byte, keep the one that takes slightly longer, then move to the second byte:
at most $8 \times 256 = 2048$ tries.

**By hand.** Say the secret is `9e 4a 1f ...`. Guesses `00 00 ...`, `01 00 ...`,
... all stop after comparing 1 byte, except `9e 00 ...`, which compares 2 bytes
before failing. The attacker keeps `9e` and continues with the second byte: now
`9e 4a ...` is the only guess that compares 3 bytes. And so on.

**Code it.** Real timing is noisy, and an attacker repeats each measurement many
times and averages. To keep the idea clear, this simulation counts compared
bytes as the "time":

```python
SECRET = bytes.fromhex("9e4a1fc2770b35d8")     # the tag the server expects

def check(tag):                  # returns (time, accepted); time = bytes compared
    t = 0
    for a, b in zip(tag, SECRET):
        t += 1
        if a != b:
            return t, False
    return t, True

guess = bytearray(8)
for i in range(8):               # the slowest answer (or the accepted one) wins
    guess[i] = max(range(256), key=lambda v: check(guess[:i] + bytes([v]) + guess[i + 1:]))
print(guess.hex(), check(guess))
print("tries:", 8 * 256, "instead of", 2 ** 64)
```

Output:

```
9e4a1fc2770b35d8 (8, True)
tries: 2048 instead of 18446744073709551616
```

This is not a classroom curiosity. In 2007 hackers used exactly this kind of
leak, in a `memcmp` that checked an HMAC, to load unsigned code on the Xbox 360.
In 2009 Nate Lawson found the same mistake in Google's Keyczar crypto library.
The attack works over a network too, given enough repetitions: in 2009 Scott
Crosby, Dan Wallach and Rudolf Riedi measured differences of a few tens of
microseconds across the internet and as small as 100 nanoseconds on a local network.

**The fix: compare everything, every time.** Combine the differences with OR
and decide only at the end, so the running time depends on the length only:

```python
import hmac

def check_ct(tag, good):        # the same time whatever the bytes are
    if len(tag) != len(good):
        return False
    d = 0
    for a, b in zip(tag, good):
        d |= a ^ b
    return d == 0

print(check_ct(b"abc", b"abd"), hmac.compare_digest(b"abc", b"abc"))   # False True
```

In real code use the library's function: `hmac.compare_digest` in Python,
`CRYPTO_memcmp` in OpenSSL, `subtle.ConstantTimeCompare` in Go. Python itself
promises nothing about timing (its integers and loops have data-dependent
speed), so the code above illustrates the idea; constant-time code that
matters is written in C, assembly or Rust and checked with tools (section 18.9).

## 18.3 Timing in exponentiation

RSA, Diffie-Hellman and DSA all compute $x^d \bmod n$ with a secret $d$.
The fast way, **square and multiply** ([Chapter 3](03-The-Arithmetic-of-Secrets.md)),
reads the bits of $d$ from the top: for every bit it squares, and for every 1
bit it also multiplies. The work done, and so the time and the power, depends
on the bits of the key.

Take the toy RSA key from [Chapter 13](13-RSA.md): $n = 3233$, $d = 2753$, and
decrypt $c = 2790$. In binary, $d = 101011000001_2$: 12 bits, five of them 1.
Press Step and watch where the extra multiplications fall:

<div class="mars-modexp" data-base="2790" data-exp="2753" data-mod="3233" data-label="Decrypting c = 2790: m = 2790²⁷⁵³ mod 3233"></div>

If an attacker can see the sequence of operations, the key is simply written
in it. Record S for square and M for multiply:

```python
def power_trace(c, d, n):         # square and multiply, logging each operation
    r, trace = 1, ""
    for bit in bin(d)[2:]:
        r = r * r % n; trace += "S"
        if bit == "1":
            r = r * c % n; trace += "M"
    return r, trace

m, trace = power_trace(2790, 2753, 3233)
print(m, trace)
bits = trace.replace("SM", "1").replace("S", "0")
print(bits, int(bits, 2))
```

Output:

```
65 SMSSMSSMSMSSSSSSM
101011000001 2753
```

An "SM" is a 1 bit and a lone "S" is a 0 bit. On a smart card, a single power
trace often shows the two operations as visibly different shapes; reading them
off is **simple power analysis**.

**Kocher's statistical attack.** Timing gives only the *total* time, not the
sequence. Kocher's insight was statistical. The time of each multiplication
depends a little on the numbers involved (for example, whether a final
subtraction is needed in Montgomery multiplication). The attacker knows the top
bits of $d$ already found and guesses the next one. For each of many inputs it
simulates the computation under both guesses and predicts how long the next
step would take. Under the right guess, the predicted times correlate with the
measured totals; under the wrong guess they do not. One bit at a time, the whole
exponent falls out. In 2003 David Brumley and Dan Boneh made it work against an
OpenSSL web server over a local network, recovering a 1024-bit RSA key from
about a million queries.

**Defense 1: the Montgomery ladder.** Do the same operations for every bit: one
multiplication and one squaring, always. The ladder keeps two values,
$r_0 = x^k$ and $r_1 = x^{k+1}$ for the bits $k$ read so far, and for each new bit
updates both. To avoid an `if` on the secret bit, it swaps the two registers
with arithmetic:

```python
def cswap(bit, a, b):            # swap a and b when bit is 1, with no branch
    mask = -bit                  # 0 or ...1111 (all ones)
    t = mask & (a ^ b)
    return a ^ t, b ^ t

def ladder(c, d, n, bits=12):    # Montgomery ladder: one multiply and one square per bit
    r0, r1, trace = 1, c, ""
    for i in reversed(range(bits)):
        bit = d >> i & 1
        r0, r1 = cswap(bit, r0, r1)
        r1 = r0 * r1 % n
        r0 = r0 * r0 % n
        r0, r1 = cswap(bit, r0, r1)
        trace += "MS"
    return r0, trace

print(ladder(2790, 2753, 3233))
print(ladder(2790, 4095, 3233)[1] == ladder(2790, 1, 3233)[1])
```

Output:

```
(65, 'MSMSMSMSMSMSMSMSMSMSMSMS')
True
```

The trace is the same for every key. X25519 ([Chapter 15](15-Elliptic-Curves.md))
is specified with exactly this ladder and conditional swap, which is one reason
it is easy to implement safely.

**Defense 2: blinding.** Randomize the input so the attacker cannot predict the
intermediate values. For RSA decryption, pick a random $r$, decrypt
$c' = c \cdot r^e$ instead of $c$, and divide out $r$ at the end, since
$(c \, r^e)^d = m \cdot r$. With the toy key and $r = 7$:

$$
\begin{aligned}
c' &= 2790 \cdot 7^{17} \bmod 3233 = 2790 \cdot 2369 \bmod 3233 = 1258 \\
m' &= 1258^{2753} \bmod 3233 = 455 = 65 \times 7 \\
m &= 455 \cdot 7^{-1} \bmod 3233 = 455 \cdot 462 \bmod 3233 = 65 .
\end{aligned}
$$

Each decryption now works on a different, random-looking number, so timing
statistics have nothing to correlate with. After Brumley and Boneh's paper,
OpenSSL turned blinding on by default. Libraries also blind the exponent,
using $d + k\,\varphi(n)$ for a random $k$.

## 18.4 Power and electromagnetic analysis

*Level: intermediate.*

A chip's power draw changes with every bit that flips inside it. With a small
resistor in the power line and an oscilloscope, an attacker records a
**trace**: thousands of samples per operation. Electromagnetic probes held near
the chip give similar traces without touching it.

**Differential and correlation power analysis.** Kocher, Jaffe and Jun's 1998
attack (published at CRYPTO 1999) does not need to read operations off a trace.
It uses statistics over many traces, and it attacks one key byte at a time,
which turns a $2^{128}$ search into sixteen searches of 256. The version used
most today, **correlation power analysis** (Éric Brier, Christophe Clavier and
Francis Olivier, 2004), works like this for the first round of AES
([Chapter 7](07-AES.md)):

<div class="mars-steps" markdown>

1. Record the power during $N$ encryptions with known, varied plaintext bytes $p_1, \ldots, p_N$.
2. For a guess $g$ of the key byte, predict an intermediate value for each trace: the S-box output $S(p_i \oplus g)$.
3. Turn each prediction into predicted power with a simple model: the **Hamming weight**, the number of 1 bits, since each 1 bit costs a little current.
4. Compute the correlation between the predicted power and the measured power over all traces.
5. Repeat for all 256 guesses. The right guess correlates clearly; wrong guesses give values near zero, because the S-box scrambles them.

</div>

**Code it.** This simulation builds the AES S-box (inverse in $\mathrm{GF}(2^8)$
followed by the affine map, as in [Chapter 7](07-AES.md)), makes 300 "traces"
whose power is the Hamming weight of the S-box output plus Gaussian noise
larger than the signal, and recovers the key byte:

```python
import random

def gmul(a, b):                    # multiply in GF(2^8), the AES field
    r = 0
    while b:
        if b & 1:
            r ^= a
        a = (a << 1) ^ (0x11B if a & 0x80 else 0)
        b >>= 1
    return r

def sbox(x):                       # the AES S-box: inverse, then an affine map
    inv = next((y for y in range(256) if gmul(x, y) == 1), 0)
    s = inv
    for i in range(1, 5):
        s ^= (inv << i | inv >> (8 - i)) & 0xFF
    return s ^ 0x63

S = [sbox(x) for x in range(256)]
HW = [bin(x).count("1") for x in range(256)]

rng = random.Random(1998)          # simulated measurements, repeatable
KEY = 0x3C
plain = [rng.randrange(256) for _ in range(300)]
power = [HW[S[p ^ KEY]] + rng.gauss(0, 2.0) for p in plain]   # leak plus noise

def corr(xs, ys):
    mx, my = sum(xs) / len(xs), sum(ys) / len(ys)
    sxy = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    sxx = sum((x - mx) ** 2 for x in xs)
    syy = sum((y - my) ** 2 for y in ys)
    return sxy / (sxx * syy) ** 0.5

scores = sorted(((corr([HW[S[p ^ k]] for p in plain], power), k) for k in range(256)), reverse=True)
for c, k in scores[:3]:
    print(hex(k), round(c, 2))
```

Output:

```
0x3c 0.56
0x92 0.21
0x36 0.21
```

The right byte, `0x3c`, stands out. Its correlation is close to what theory
predicts: the Hamming weight of a random byte has variance 2, the noise has
variance 4, so the best possible correlation is $\sqrt{2/(2+4)} \approx 0.58$.
Real traces have thousands of samples, and the attacker computes the correlation
at every sample to find *when* the S-box is computed, too.

**Defenses.**

- **Masking** splits every secret value into random shares: instead of $x$, the
  chip handles $x \oplus r$ and $r$ for a fresh random $r$, and computes on the
  shares so that no single wire or instruction ever depends on $x$ alone. Then
  each measurement is independent of the key, and the attacker has to combine
  several points of a trace, which multiplies the noise. Masking is cheap for
  XOR and costly for the S-box, which is not linear.
- **Hiding**: random delays, shuffled order of S-box operations, and circuits
  built so every operation draws the same power.
- **Protected hardware**: smart cards, secure elements and HSMs combine all of
  these, and certification labs attack them as part of evaluation.

Masking post-quantum schemes such as ML-KEM and ML-DSA ([Chapter 21](21-Lattice-Cryptography.md))
is harder than masking AES, because they mix arithmetic modulo $q$ with bit
operations, and it is an active research area.

## 18.5 Cache attacks

*Level: intermediate.*

A program does not need a probe on the power line to measure another program.
On a shared CPU, it can measure the **cache**, the small fast memory that holds
recently used data. If the victim has just read a memory line, that line is in
the cache, and reading it again is fast; if not, it is slow. The difference is
about a hundred processor cycles, easy to time.

Fast software AES used **T-tables**: four tables of 256 four-byte entries that
combine SubBytes and MixColumns, indexed by bytes of state. In the first round
the index is $p_i \oplus k_i$, plaintext byte XOR key byte. Which part of the
table gets loaded into cache therefore depends on the key. In 2005 Daniel
Bernstein recovered a full AES key from the timing of a server running
OpenSSL's AES, and Dag Arne Osvik, Adi Shamir and Eran Tromer showed attacks in
which a spy process on the same machine **primes** the cache with its own data,
lets the victim encrypt, then **probes** which of its lines were evicted. They
recovered the AES key of Linux disk encryption in 65 milliseconds of
measurement. Colin Percival showed the same year that a process on one
hyperthread could watch OpenSSL's RSA through the cache.

In 2014 Yuval Yarom and Katrina Falkner made the attack precise with
**Flush+Reload**: when two programs share a library in memory (as programs
using the same OpenSSL do), the spy flushes a line of the victim's code from
the cache, waits, and times reloading it. A fast reload means the victim ran
that code. Applied to the square-and-multiply loop in GnuPG, it reads the
exponent's bits directly, like the trace in 18.3. Cloud servers, where strangers
share hardware, made this a practical threat.

**Defenses.**

- **No secret-dependent memory addresses.** Never index a table with a secret.
- **AES in hardware**: AES-NI instructions on Intel and AMD processors (shipping
  from 2010) and Arm's cryptography extensions take the same time for every
  input and touch no tables.
- **Bitsliced** software AES computes the S-box as a fixed circuit of AND, XOR and
  NOT on many blocks at once, with no lookups.
- **Ciphers without tables.** ChaCha20 ([Chapter 5](05-Stream-Ciphers.md)) uses
  only addition, rotation and XOR, which is part of why Google chose it for
  phones without AES instructions.

## 18.6 Speculative execution: Spectre and Meltdown

*Level: intermediate.*

On 3 January 2018 two classes of attack were disclosed together, found
independently by several teams, among them Jann Horn of Google Project Zero,
Paul Kocher, and researchers at Graz University of Technology. They showed that
the cache could leak not just *which* data the victim used, but data the victim
**never meant to use at all**.

Modern processors guess. When they reach a branch whose condition is not yet
known, they predict the outcome and run ahead **speculatively**; if the guess
was wrong, they throw the results away. But the cache lines loaded during the
wrong guess stay loaded.

- **Spectre (variant 1)** trains the branch predictor so that a bounds check
  like `if (i < len) y = table[secret_array[i] * 64]` is predicted true for an
  out-of-bounds `i`. During speculation the processor reads a secret byte and
  uses it as an index, loading one cache line that depends on it. The attacker
  then finds that line with Flush+Reload. Variant 2 poisons the prediction of
  indirect jumps instead.
- **Meltdown** exploited the fact that some processors, mainly Intel's, checked
  permissions on a kernel memory read only after speculatively using the value,
  so user programs could read kernel memory.

For cryptography, the shock was that **constant-time code is not enough**:
code that has no secret-dependent branches can still be made to access a
secret speculatively by *other* code. Meltdown was fixed by separating kernel
and user page tables (KPTI) and in later hardware. Spectre is a family that
keeps growing; the defenses are compiler barriers and "retpolines", hardware
changes, and isolation: browsers moved each site into its own process (Chrome's
site isolation, 2018) and made timers coarser, so JavaScript cannot keep secrets
of another site in its own address space.

In 2022 **Hertzbleed** added another twist: modern CPUs change their clock
frequency with power draw, and power draw depends on the data. So even
constant-*cycle* code can take different wall-clock time. Its authors used it to
recover keys from an implementation of the post-quantum scheme SIKE, remotely.

## 18.7 Fault attacks

*Level: intermediate.*

Instead of watching the computation, an attacker can **disturb** it: a brief
drop in supply voltage, a glitch on the clock, a laser flash on the chip, or an
electromagnetic pulse. A well-timed fault changes one value, and the wrong
answer can reveal more than the right one.

**The Bellcore attack on RSA-CRT.** RSA implementations sign with the Chinese
remainder theorem ([Chapter 13](13-RSA.md)): they compute $s_p = m^{d_p} \bmod p$
and $s_q = m^{d_q} \bmod q$ separately and combine them, which is about four
times faster. In September 1996 Dan Boneh, Richard DeMillo and Richard Lipton,
at Bellcore (Bell Communications Research), announced that a fault in one of
the two halves breaks the key. Their paper needed a correct and a faulty
signature on the same message; Arjen Lenstra observed in a note soon after that
a single faulty signature on a known message is enough.

Why it works: suppose the fault hits only the mod-$q$ half. Then the faulty
signature $s'$ is still correct modulo $p$, so $s'^e \equiv m \pmod p$, but
$s'^e \not\equiv m \pmod q$. So $s'^e - m$ is a multiple of $p$ but not of $q$,
and

$$
\gcd(s'^e - m,\; n) = p .
$$

**By hand** with $p = 61$, $q = 53$, $n = 3233$, $e = 17$, $d = 2753$, and
message $m = 65$. The CRT exponents are $d_p = 2753 \bmod 60 = 53$ and
$d_q = 2753 \bmod 52 = 49$, and $q^{-1} \bmod p = 38$.

$$
\begin{aligned}
s_p &= 65^{53} \bmod 61 = 39, \qquad s_q = 65^{49} \bmod 53 = 5 \\
s &= s_q + q \cdot \big(q^{-1} (s_p - s_q) \bmod p\big) = 588 \qquad \text{(correct)} \\
s_q' &= 4 \qquad \text{(a fault flips the lowest bit)} \\
s' &= 4 + 53 \cdot \big(38 \cdot (39 - 4) \bmod 61\big) = 2601 \\
s'^{17} \bmod 3233 &= 2871 \ne 65 \\
\gcd(2871 - 65,\; 3233) &= \gcd(2806,\; 3233) = 61 = p .
\end{aligned}
$$

**Code it** at a more realistic size, with two known Mersenne primes of 521 and
607 bits standing in for random ones:

```python
from math import gcd

p, q = 2 ** 521 - 1, 2 ** 607 - 1        # two known primes, for a quick demo
n, e = p * q, 65537
d = pow(e, -1, (p - 1) * (q - 1))
dp, dq, qinv = d % (p - 1), d % (q - 1), pow(q, -1, p)

def sign_crt(m, glitch=False):
    sp, sq = pow(m, dp, p), pow(m, dq, q)
    if glitch:
        sq ^= 1 << 100                    # one flipped bit in the mod-q half
    return sq + q * (qinv * (sp - sq) % p)

m = 0x5EED
s = sign_crt(m, glitch=True)
print(pow(s, e, n) == m)                  # the signature is wrong...
f = gcd(pow(s, e, n) - m, n)
print(f == p, n % f == 0)                 # ...and it hands over a prime factor

def sign_safe(m):                         # the fix: check before releasing
    s = sign_crt(m)
    if pow(s, e, n) != m:
        raise ValueError("fault detected")
    return s
print(pow(sign_safe(m), e, n) == m)
```

Output:

```
False
True True
True
```

The fix is in the last function: **verify every signature before releasing
it**. Verification with $e = 65537$ is cheap. Randomized padding (PSS) also
helps, because the attacker no longer knows the exact $m$ that was signed.

**Other faults.**

- **Differential fault analysis** (Eli Biham and Adi Shamir, 1997) extends the
  idea to symmetric ciphers: compare correct and faulty encryptions of the same
  block. For AES, a single byte fault before the last MixColumns, with two
  faulty ciphertexts, is enough to cut the key search to something trivial
  (Gilles Piret and Jean-Jacques Quisquater, 2003).
- **Rowhammer** (Yoongu Kim and colleagues, 2014) showed that software alone can
  cause faults: reading two rows of DRAM over and over flips bits in the row
  between them. In 2016 the "Flip Feng Shui" attack used it to corrupt an RSA
  public key held in another virtual machine's memory, making it factorable.
- **Plundervolt** (2019) used the software interface for undervolting Intel
  processors to fault computations inside SGX enclaves and extract RSA and AES keys.
- **Deterministic signatures** like Ed25519 sign the same message with the same
  nonce every time. A fault that changes the computation once then gives two
  different signatures with one nonce, which reveals the key. Libraries for
  exposed hardware add fresh randomness to the nonce ("hedged" signatures).

**Defenses.** Verify results, compute twice and compare, add integrity checks
on keys, and in secure chips use sensors that wipe keys when voltage, clock,
light or temperature look wrong.

## 18.8 Error messages as oracles

*Level: intermediate.*

Some of the most damaging "side channels" are not physical at all. They are a
server telling the attacker, through an error code or a slightly different
response time, one fact about a decryption it should not have revealed. In the
language of [Chapter 17](17-Defining-Security.md), the server becomes a partial
decryption oracle, and the scheme was never secure against chosen-ciphertext
attack in the first place.

### Padding oracles in CBC

CBC mode ([Chapter 8](08-Modes-of-Operation.md)) encrypts whole 16-byte blocks,
so messages are **padded**. In PKCS#7 padding, if $k$ bytes are missing, $k$
bytes each of value $k$ are added: `...01`, `...02 02`, up to 16 bytes of `10`.
On decryption the receiver checks the padding and strips it.

In 2002 Serge Vaudenay showed that if the receiver reveals whether the padding
was valid, an attacker can decrypt anything. Recall how CBC decrypts:
$P_i = D_k(C_i) \oplus C_{i-1}$. The attacker sends a fake previous block $X$
followed by the target block $C_i$. The receiver computes $D_k(C_i) \oplus X$
and checks its padding.

<div class="mars-steps" markdown>

1. Try all 256 values for the last byte of $X$. One of them makes the last plaintext byte `01`, which is valid padding. Call it $g$.
2. Then $D_k(C_i)$ ends in $g \oplus \texttt{01}$: one byte of the block cipher's output, learned without the key.
3. Set the last byte of $X$ so the last plaintext byte becomes `02`, and search the second-last byte for valid `02 02` padding.
4. Continue to the first byte: at most $16 \times 256 = 4096$ queries give all of $D_k(C_i)$.
5. XOR with the real previous block $C_{i-1}$ to get the plaintext $P_i$. Repeat for every block.

</div>

**Code it.** This needs a real block cipher, so it uses the `cryptography`
package for AES. The server never reveals anything but "padding valid or not":

```python
# pip install cryptography
import os
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

KEY = os.urandom(16)

def encrypt(m):                          # AES-CBC with PKCS#7 padding, no MAC
    pad = 16 - len(m) % 16
    m += bytes([pad]) * pad
    iv = os.urandom(16)
    e = Cipher(algorithms.AES(KEY), modes.CBC(iv)).encryptor()
    return iv + e.update(m) + e.finalize()

def oracle(c):                           # the server: "is the padding valid?"
    d = Cipher(algorithms.AES(KEY), modes.CBC(c[:16])).decryptor()
    m = d.update(c[16:]) + d.finalize()
    pad = m[-1]
    return 1 <= pad <= 16 and m[-pad:] == bytes([pad]) * pad

def attack_block(prev, block):           # find D(block), byte by byte from the end
    inter = bytearray(16)
    for pos in range(15, -1, -1):
        pad = 16 - pos
        for g in range(256):
            fake = bytearray(16)
            fake[pos] = g
            for j in range(pos + 1, 16):
                fake[j] = inter[j] ^ pad
            if oracle(bytes(fake) + block):
                if pos == 15:            # rule out a lucky 0x02 0x02 ending
                    fake[14] ^= 1
                    if not oracle(bytes(fake) + block):
                        continue
                inter[pos] = g ^ pad
                break
    return bytes(a ^ b for a, b in zip(inter, prev))

c = encrypt(b"PIN 4071, send to account 22-9182")
blocks = [c[i:i + 16] for i in range(0, len(c), 16)]
plain = b"".join(attack_block(blocks[i], blocks[i + 1]) for i in range(len(blocks) - 1))
print(plain[:-plain[-1]])
```

Output:

```
b'PIN 4071, send to account 22-9182'
```

The attack never touches AES itself. The history of TLS shows how hard it was to
close this hole while keeping MAC-then-encrypt:

- TLS checked the MAC *after* the padding, so different error messages, or
  different timing, told the attacker which check failed. Brice Canvel and
  colleagues stole an email password this way in 2003, using timing.
- **Lucky Thirteen** (Nadhem AlFardan and Kenneth Paterson, 2013): even with
  identical errors, the MAC computation took slightly longer or shorter
  depending on how much padding was removed, because HMAC's work changes with
  the message length. The name comes from the 13 bytes of record header that
  go into the MAC, which made the timing difference just big enough.
- **POODLE** (Bodo Möller, Thai Duong and Krzysztof Kotowicz, 2014): SSL 3.0 did
  not check padding bytes at all, only the length byte, so about one tampered
  record in 256 was accepted, and each acceptance leaked a byte of a cookie.
  POODLE ended SSL 3.0 (RFC 7568).

The real fix is **encrypt-then-MAC** or an AEAD mode: check the MAC over the
ciphertext first, and never look at padding or plaintext of a forged message.
TLS 1.3 removed CBC entirely.

### Bleichenbacher's attack on RSA padding

The same idea works on RSA. PKCS#1 v1.5 encryption pads a message $M$ to the
size of $n$ as

$$
\texttt{00} \;\Vert\; \texttt{02} \;\Vert\; \text{at least 8 random nonzero bytes} \;\Vert\; \texttt{00} \;\Vert\; M .
$$

A decrypted value that starts with `00 02` is called **conforming**. In SSL, the
client encrypted the session's premaster secret this way to the server's RSA
key, and servers answered differently when the padding was wrong.

In 1998 Daniel Bleichenbacher, at Bell Labs, showed how to use that one bit.
Textbook RSA is malleable ([Chapter 17](17-Defining-Security.md)): multiplying
the target ciphertext $c$ by $s^e$ multiplies the hidden plaintext by $s$. With
$k$ the length of $n$ in bytes and $B = 2^{8(k-2)}$, "conforming" means
$2B \le m \cdot s \bmod n < 3B$. Each conforming answer for some $s$ narrows
the interval where $m$ can lie, and after enough answers only one value is left.
It took about a million queries in 1998, hence its nickname, the "million
message attack".

The idea is easiest to see with an even more generous oracle, one that reveals
only whether the plaintext is odd. Doubling the plaintext ($c \cdot 2^e$) either
keeps $2m$ below $n$ (then $2m$ is even) or wraps past $n$ (then $2m - n$ is
odd, since $n$ is odd). So each answer tells whether $m$ is in the lower or
upper half of its range, and $\log_2 n$ answers find $m$ exactly:

```python
from fractions import Fraction

p, q = 2 ** 127 - 1, 2 ** 521 - 1       # two known primes, for a quick demo
n, e = p * q, 65537
d = pow(e, -1, (p - 1) * (q - 1))

def parity_oracle(c):                   # the leak: "was the plaintext odd?"
    return pow(c, d, n) & 1

m = int.from_bytes(b"one bit at a time", "big")
c = pow(m, e, n)

lo, hi = Fraction(0), Fraction(n)       # m is somewhere in [lo, hi)
two = pow(2, e, n)
for _ in range(n.bit_length()):
    c = c * two % n                     # doubles the hidden plaintext
    if parity_oracle(c):                # odd means 2m wrapped past n
        lo = (lo + hi) / 2
    else:
        hi = (lo + hi) / 2
print(int(hi).to_bytes(17, "big"), n.bit_length(), "queries")
```

Output:

```
b'one bit at a time' 648 queries
```

Bleichenbacher's oracle is weaker (it answers "yes" rarely), so it needs more
queries, but the principle is the same: **one bit of leakage per query is
enough to decrypt everything**.

The TLS fix was to hide the error: if the padding is bad, continue with a random
premaster secret, so the handshake fails later in exactly the same way (RFC
5246 §7.4.7.1). Implementations kept getting it wrong:

- **DROWN** (Nimrod Aviram and colleagues, 2016): servers that still supported
  SSL 2.0 with the same RSA key as their TLS servers served as a Bleichenbacher
  oracle against the modern TLS connections.
- **ROBOT** ("Return Of Bleichenbacher's Oracle Threat", Hanno Böck, Juraj
  Somorovsky and Craig Young, 2017): products from several major vendors, and
  sites including Facebook and PayPal, still leaked through different error
  behavior. The researchers signed a message with Facebook's private key to
  prove it.
- **Marvin** (Hubert Kario, 2023): tiny timing differences in many libraries'
  RSA decryption still leaked conformance.

TLS 1.3 removed RSA key transport altogether. For new designs, RSA-OAEP or a KEM
with **implicit rejection** (ML-KEM returns a pseudorandom key for an invalid
ciphertext instead of an error, [Chapter 21](21-Lattice-Cryptography.md)) is the
answer.

## 18.9 Writing constant-time code

*Level: intermediate.*

"Constant-time" does not literally mean that every call takes the same time. It
means that **the sequence of instructions executed and the memory addresses
accessed do not depend on secret data**. Then timing, cache state and branch
prediction carry no information about secrets. The rules:

1. **No secret-dependent branches.** No `if`, loop exit or early return that
   depends on a secret.
2. **No secret-dependent memory addresses.** No table lookup indexed by a secret.
3. **No variable-time instructions on secrets.** On many CPUs, division and
   sometimes multiplication take a time that depends on the operands. In
   December 2023, **KyberSlash** showed that reference code for Kyber (the
   basis of ML-KEM) divided a secret-dependent value by a constant, and some
   compilers and CPUs turned that into a variable-time division; key recovery
   was demonstrated.
4. **Compare secrets in constant time** and fail the same way for every error:
   same message, same code path, same time.

Rule 1 needs a way to choose between two values without `if`. The standard
trick builds a mask of all ones or all zeros from the secret bit:

```python
def select(bit, a, b):             # returns a if bit == 1 else b, without branching
    mask = -bit & 0xFFFFFFFF       # 0xFFFFFFFF or 0
    return (a & mask) | (b & ~mask & 0xFFFFFFFF)

def is_zero(x):                    # 1 if a 32-bit x is 0, else 0, without comparing
    return 1 ^ (((x | -x) & 0xFFFFFFFF) >> 31)

print(select(1, 7, 9), select(0, 7, 9), is_zero(0), is_zero(5), is_zero(0x80000000))
# 7 9 1 0 0
```

This is how the conditional swap in the Montgomery ladder (18.3) and
`compare_digest` are written in C. Python is only a sketch: its integers grow
and its interpreter branches internally.

**The compiler is not your friend.** An optimizing compiler may see that
`select` is a choice and turn it back into a branch. Constant-time C code is
therefore checked on the compiled machine code. Tools include Adam Langley's
**ctgrind** (2010), which uses Valgrind to flag branches on "secret" memory;
**dudect** (Oscar Reparaz, Josep Balasch and Ingrid Verbauwhede, 2017), which
runs the code on two classes of inputs and tests the timing distributions
statistically; and formally verified code generators such as HACL\* and
Fiat-Crypto, whose output ships in Firefox, Chrome and the Linux kernel.

**The practical rules for everyone else:**

1. Use a well-reviewed library. Almost every attack in this chapter was found in
   code written by experts.
2. Prefer primitives that are easy to implement safely: ChaCha20 or AES with
   hardware support, X25519 and Ed25519, AEAD modes.
3. Check every input (lengths, ranges, points on the curve) before using it.
4. Verify signatures before releasing them.
5. Keys that face physical attackers belong in protected hardware (smart cards,
   secure elements, HSMs).

## 18.10 In the real world

*Level: expert.*

**A timeline of the main results.**

| Year | Attack | What leaked |
|---|---|---|
| 1943 | Bell Telephone, 131-B2 | plaintext, from electromagnetic spikes |
| 1985 | van Eck | screen contents, from radio emissions |
| 1996 | Kocher | RSA and DH exponents, from timing |
| 1996 | Boneh, DeMillo, Lipton | RSA-CRT key, from one fault |
| 1998 | Kocher, Jaffe, Jun (DPA) | smart card keys, from power |
| 1998 | Bleichenbacher | RSA-encrypted session keys, from padding errors |
| 2002 | Vaudenay | CBC plaintext, from padding errors |
| 2003 | Brumley and Boneh | OpenSSL RSA key, over a network |
| 2005 | Bernstein; Osvik, Shamir, Tromer; Percival | AES and RSA keys, from the cache |
| 2008 | Halderman and colleagues (cold boot) | disk keys, from RAM that keeps data for seconds after power-off |
| 2013 | Genkin, Shamir, Tromer | GnuPG RSA keys, from the sound of a laptop, within an hour |
| 2013 | Lucky Thirteen | TLS CBC plaintext, from MAC timing |
| 2014 | Flush+Reload; POODLE | GnuPG keys; SSL 3.0 cookies |
| 2016 | DROWN; Flip Feng Shui | TLS sessions via SSL 2.0; RSA keys via Rowhammer |
| 2017 | ROBOT | TLS RSA keys at major sites |
| 2018 | Spectre, Meltdown | any memory in the same process or kernel |
| 2019 | Minerva, TPM-Fail; Plundervolt | ECDSA keys from nonce-length timing; SGX keys from undervolting |
| 2022 | Hertzbleed | SIKE keys, from CPU frequency |
| 2023 | KyberSlash; Marvin | Kyber keys from division timing; RSA conformance from timing |

**Certification.** Smart cards and secure elements are evaluated under Common
Criteria, where labs mount power, electromagnetic and fault attacks as part of
the test. FIPS 140-3 asks modules at its higher security levels to address
non-invasive attacks such as timing and power analysis. Payment cards, SIM cards
and passports are all built to survive these tests.

**Where you meet the defenses.** OpenSSL and BoringSSL use blinding for RSA,
constant-time code for elliptic curves, and AES-NI where present. Every
mainstream TLS library has removed or hardened its CBC and RSA-decryption code.
X25519 and Ed25519 were designed by Daniel Bernstein and colleagues with
constant-time implementation in mind. ML-KEM's implicit rejection exists so the
decapsulation step returns no error to leak. Browsers changed their timers and
process model after Spectre.

Full details and more incidents: [RSA reference](../02-signatures/RSA.md), [AES reference](../04-symmetric-ciphers/AES.md),
[Classic modes reference](../05-modes-aead/Classic-Modes.md).

## 18.11 Going deeper

*Level: expert.*

### How many traces?

For correlation power analysis, the number of traces needed grows with the
inverse square of the correlation $\rho$ of the right guess: to separate
a correlation of $\rho$ from 0 with confidence, the standard error
$1/\sqrt{N}$ must be several times smaller than $\rho$, so

$$
N \approx \frac{c}{\rho^2}
$$

for a small constant $c$ that depends on the confidence wanted. Halving the
signal-to-noise ratio roughly quadruples the traces. With masking of order $d$
(each secret split into $d + 1$ shares), the attacker must combine $d + 1$
points of the trace, and under enough noise the number of traces grows like
$\sigma^{2(d+1)}$ for noise standard deviation $\sigma$: exponentially in the
masking order. Suresh Chari, Charanjit Jutla, Josyula Rao and Pankaj Rohatgi
gave the first analysis of this in 1999, and later work on "probing security"
(Yuval Ishai, Amit Sahai and David Wagner, 2003) gave masking a proper security
definition, bringing [Chapter 17](17-Defining-Security.md)'s methods to side channels.

### Partial nonce leaks and lattices

ECDSA and DSA need a fresh secret nonce $k$ per signature
([Chapter 14](14-Discrete-Log-Systems.md)). Repeating it reveals the key; less
obviously, leaking **a few bits** of it does too. Each signature gives a linear
equation $s \, k \equiv h + x\,r \pmod q$ with unknown key $x$ and nonce $k$.
If the top few bits of each $k$ are known to be zero, the equations become an
instance of Dan Boneh and Ramarathnam Venkatesan's **hidden number problem**
(1996), and lattice reduction ([Chapter 21](21-Lattice-Cryptography.md)) solves
it with a few hundred to a few thousand signatures. Minerva and TPM-Fail
(2019) did exactly this: scalar multiplication took slightly less time for
nonces with leading zero bits, so timing told the attacker which signatures had
short nonces. The defense is a scalar multiplication whose time does not depend
on the bit length of $k$, such as a ladder over a fixed number of bits.

### Fault attacks against verification

Faults can also skip instructions. A glitch timed to skip the comparison at the
end of signature verification makes a secure boot loader accept unsigned code.
This is how many game consoles and phones have been opened, and it is why
secure boot code checks results twice, in different ways, and uses values that
are unlikely to arise from a single glitch (for example, `0x3CA5965A` instead
of 1 for "true").

### Constant time after Spectre

Spectre broke the assumption that only the instructions a program *commits*
matter. Research since 2018 defines "speculative constant time", in which
secrets must not reach memory addresses or branches even on mis-speculated paths,
and builds compilers and checkers for it. Cryptographic libraries also avoid
holding secrets in the same address space as untrusted code where they can:
browsers isolate sites, and servers keep long-term keys in a separate process or
an HSM, which can sign or decrypt but never hands out the key.

## Check yourself

??? question "1. A server compares a 16-byte token with an early-exit loop. How many guesses does the timing attack need at most, compared with brute force?"

    $16 \times 256 = 4096$ guesses (times the repetitions needed to average out noise), against
    $2^{128}$ for brute force.

??? question "2. Write the square-and-multiply trace (S and M) for the exponent $d = 13$, and read it back."

    $13 = 1101_2$. For each bit: S, then M if the bit is 1: SM SM S SM, so the trace is `SMSMSSM`.
    Reading "SM" as 1 and a lone "S" as 0 gives 1101, which is 13.

??? question "3. Why does the Montgomery ladder use a conditional swap instead of `if bit: ...`?"

    The `if` makes the instructions executed depend on the secret bit, which shows up in timing and
    in the branch predictor. The masked swap runs exactly the same instructions for 0 and 1; only
    the values change.

??? question "4. With the toy key ($n = 3233$, $e = 17$), a faulty CRT signature on $m = 65$ is $s' = 2601$. Show how to factor $n$."

    $s'^{17} \bmod 3233 = 2871$, and $\gcd(2871 - 65, 3233) = \gcd(2806, 3233) = 61$. So $p = 61$ and
    $q = 3233 / 61 = 53$.

??? question "5. A server returns \"bad MAC\" in 2 ms but \"bad padding\" in 1 ms, with the same error text. What is wrong, and how should it be fixed?"

    It is a padding oracle by timing: the attacker learns whether the padding was valid, which is all
    Vaudenay's attack needs. The fix is encrypt-then-MAC or an AEAD: verify the MAC over the ciphertext
    first and reject forgeries before padding is ever looked at.

??? question "6. In the padding oracle attack, why does the code double-check when the last byte gives valid padding?"

    Valid padding ending in `01` is what we want, but if the second-last decrypted byte happens to be
    `02`, the guess that makes the last byte `02` is valid too (`02 02`). Changing the second-last byte
    of the fake block and asking again tells the two cases apart: only `01` padding stays valid.

??? question "7. Why does an AES implementation with T-tables leak through the cache, and why doesn't AES-NI?"

    The first-round table index is plaintext byte XOR key byte, so which cache line is loaded depends
    on the key. AES-NI computes the round in a hardware unit with no memory lookups and fixed timing.

??? question "8. In correlation power analysis with signal variance 2 and noise variance 4, the best correlation is about 0.58. If the noise variance grows to 16, what is it, and roughly how many more traces are needed?"

    $\rho = \sqrt{2/(2 + 16)} = \sqrt{1/9} \approx 0.33$. Traces grow like $1/\rho^2$: from $3$ to $9$, so about three
    times as many.

??? question "9. Ed25519 signatures are deterministic. Why is that good against bad random generators but a risk against fault attacks?"

    No random nonce means no nonce reuse from a broken RNG. But the same message always uses the same
    nonce, so if a fault corrupts one signing of a message, the attacker has a correct and a faulty
    signature with the same nonce and can solve for the key. Hedged signing mixes in fresh randomness
    to get both protections.

??? question "10. Explain in one sentence why constant-time code was not enough after Spectre."

    Spectre makes the processor run, speculatively, code paths that the program never commits to,
    including other code that can be steered into touching the secret, so the secret can reach the
    cache even though the constant-time code itself never branches on it.

## What you learned

- A side channel is any measurable effect of secret data: time, power,
  radiation, sound, cache state, faults, and error behavior. Security proofs do
  not cover them.
- Early-exit comparisons and square and multiply leak their secrets through
  timing; constant-time comparison, the Montgomery ladder and blinding fix them.
- Power analysis and cache attacks recover AES keys from S-box and table
  lookups; masking, hardware AES and table-free designs are the answers.
- One fault in an RSA-CRT signature reveals a prime factor; verify before you release.
- Padding oracles and Bleichenbacher's attack turn one bit of error information
  into full decryption; authenticated encryption and implicit rejection end them.
- Constant-time code means no secret-dependent branches, addresses or
  variable-time instructions, checked on the compiled code; and since Spectre,
  isolation matters too.

**Next:** [Chapter 19](19-Protocols.md), where everything in the book comes
together in TLS, SSH, Signal and Wi-Fi, and where many of these attacks happened.

## Further reading

- Paul Kocher, "Timing Attacks on Implementations of Diffie-Hellman, RSA, DSS,
  and Other Systems", CRYPTO 1996.
- Paul Kocher, Joshua Jaffe and Benjamin Jun, "Differential Power Analysis",
  CRYPTO 1999.
- Dan Boneh, Richard DeMillo and Richard Lipton, "On the Importance of Checking
  Cryptographic Protocols for Faults", EUROCRYPT 1997.
- Stefan Mangard, Elisabeth Oswald and Thomas Popp, *Power Analysis Attacks:
  Revealing the Secrets of Smart Cards* (Springer, 2007).
- Serge Vaudenay, "Security Flaws Induced by CBC Padding: Applications to SSL,
  IPSEC, WTLS...", EUROCRYPT 2002.
- Daniel Bleichenbacher, "Chosen Ciphertext Attacks Against Protocols Based on
  the RSA Encryption Standard PKCS #1", CRYPTO 1998.
- Yuval Yarom and Katrina Falkner, "FLUSH+RELOAD: a High Resolution, Low Noise,
  L3 Cache Side-Channel Attack", USENIX Security 2014.
- Paul Kocher and colleagues, "Spectre Attacks: Exploiting Speculative
  Execution", IEEE Symposium on Security and Privacy 2019.
- Ross Anderson, *Security Engineering* (3rd edition, Wiley, 2020), the chapters
  on emission security and physical tamper resistance.
