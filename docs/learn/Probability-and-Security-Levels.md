# Probability and security levels

*How long a key search takes, why a 256-bit hash gives only 128-bit collision
security, how much a password is worth in bits, and what "negligible" means.*

## Searching for a key

A key of $n$ random bits has $2^n$ values. Trying them in any order, you hit
the right one after $2^{n-1}$ tries on average and $2^n$ at worst. Cryptographers
just say "about $2^n$ work". With a 128-bit key the expected search is $2^{127}$,
which is still far out of reach (see
[How strong is strong?](What-Cryptography-Does.md#how-strong-is-strong)).

Two things make real attacks faster than that, and every security level on this
site already accounts for them:

- **A shortcut in the math.** RSA-2048 has a 2048-bit key, but factoring with
  the number field sieve takes about $2^{112}$ work, so it counts as 112-bit.
- **Many targets.** If an attacker wants *any one* of a million keys, each try
  has a million chances to hit, so the work drops by about $2^{20}$. This is why
  salts matter for passwords and why NIST sizes some schemes with a margin.

## The birthday paradox

How many people do you need in a room for a better-than-even chance that two
share a birthday? Not 183, but **23**. With 70 people the chance is 99.9%.

The reason: what matters is the number of **pairs**, and $k$ people make
$k(k-1)/2$ pairs. With 23 people that's 253 pairs, each with a 1-in-365 chance.

```python
def p_clash(k, N):                  # chance that k random values out of N are not all different
    q = 1.0
    for i in range(k):
        q *= (N - i) / N
    return 1 - q

print(round(p_clash(23, 365), 3))   # 0.507
```

In general, among $N$ equally likely values, a repeat is expected after about

$$
\sqrt{\frac{\pi}{2} N} \approx 1.25 \sqrt{N}
$$

draws. With $N = 2^n$ that is about $2^{n/2}$. **Halve the bits.**

### What it means for hashes

Finding *two* inputs with the same hash (a collision) needs only $2^{n/2}$
tries, not $2^n$. So:

| Hash | Output | Collision security | Status |
|---|---|---|---|
| MD5 | 128 bits | 64 at best, and its design is broken | Broken |
| SHA-1 | 160 bits | 80 at best; real collisions since 2017 | Broken |
| SHA-256 | 256 bits | 128 | Recommended |

That's why a 128-bit security level needs a 256-bit hash. You can see it with
your own computer by cutting SHA-256 down to 32 bits. A collision turns up after
a little over $2^{16}$ tries, usually under a second:

```python
import hashlib, os

seen = {}
while True:
    m = os.urandom(8)
    h = hashlib.sha256(m).digest()[:4]      # only 32 bits of the hash
    if h in seen and seen[h] != m:
        print(seen[h].hex(), m.hex(), "both hash to", h.hex())
        break
    seen[h] = m
```

### What it means for ciphers

A block cipher encrypts $b$-bit blocks. After about $2^{b/2}$ blocks under one
key, two ciphertext blocks start to repeat, and in CBC mode a repeat leaks the
XOR of two plaintext blocks. For 64-bit ciphers like 3DES and Blowfish that is
$2^{32}$ blocks, 32 GB: a busy HTTPS connection gets there in hours. That was
the **Sweet32** attack (2016), and it's why 64-bit ciphers are
[retired](../04-symmetric-ciphers/Retired.md). AES's 128-bit blocks push the
limit to $2^{64}$ blocks, 256 exabytes.

The same bound limits random nonces: GCM's 96-bit random nonces should not be
used for more than about $2^{32}$ messages under one key.

## Entropy

Claude Shannon defined **entropy** in "A Mathematical Theory of Communication"
(1948): the average number of bits of genuine surprise in a value. For a value
drawn uniformly from $N$ possibilities it is $\log_2 N$ bits. A fair coin is one
bit; a fair six-sided die is $\log_2 6 \approx 2.58$ bits.

Keys must have full entropy: a 128-bit key needs 128 bits of real randomness,
which is why systems use the [OS random generator](../09-random/OS-RNG.md) and
never the time of day. A 128-bit key generated from a 32-bit seed has only 32
bits of entropy, and that's how the [Debian bug](../09-random/Retired.md) of
2008 left every key on affected machines guessable among about 32,768.

### What passwords are worth

| Password | Choices | Entropy |
|---|---|---|
| 8 random printable characters | $95^8$ | 52.6 bits |
| 12 random lowercase letters | $26^{12}$ | 56.4 bits |
| 6 random words from a 7,776-word list (Diceware) | $7776^6$ | 77.5 bits |
| 12 random words from 2,048 (a Bitcoin BIP-39 phrase) | $2048^{12}$ | 132 bits, of which 128 are entropy and 4 a checksum |
| one common English word | about 20,000 | 14 bits |

Those numbers hold only if the choice is **truly random**. People choosing for
themselves are predictable: leaked password lists show "123456" on top year
after year. So passwords are always far weaker than keys, and that is why
password storage uses deliberately slow functions like
[Argon2](../08-kdf-password-hashing/Argon2.md): if each guess costs a second of
a GPU's time, 40 bits of entropy goes a long way.

## "Negligible"

Security proofs don't say "impossible". They say that an attacker running for
time $t$ succeeds with a probability so small it doesn't matter, about
$t / 2^{n}$ for an $n$-bit security level. With $n = 128$, even $2^{64}$ steps
of computation give a chance of $2^{-64}$, smaller than the chance of a cosmic
ray flipping a bit in your computer during the attack.

In theory books, a function is **negligible** if it shrinks faster than one over
any polynomial in the key length, like $2^{-n}$. A scheme is secure if every
attacker who runs in polynomial time succeeds with only negligible probability.
[Security definitions](Security-Definitions.md) builds on this.

## Try it

??? question "1. A website gives each session a random 32-bit ID. After how many sessions is a repeat likely?"

    About $1.25 \sqrt{2^{32}} = 1.25 \cdot 2^{16} \approx 82{,}000$ sessions. Session IDs need
    at least 128 bits.

??? question "2. A hash with 384-bit output: what collision security?"

    About 192 bits, half the output length. That's SHA-384's level.

??? question "3. Which is stronger: a random 10-character password from 62 letters and digits, or 5 random Diceware words?"

    $10 \log_2 62 \approx 59.5$ bits against $5 \log_2 7776 \approx 64.6$ bits. The five words, and
    they are easier to remember.
