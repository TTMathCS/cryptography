# What quantum computers break

*Shor's algorithm, Grover's algorithm, what each does to the algorithms on this
site, and why the switch to post-quantum cryptography started years before
anyone has a machine big enough.*

## The two algorithms

**Shor (1994).** Peter Shor, at Bell Labs, showed that a quantum computer can
find the **period** of a function, the $r$ with $f(x + r) = f(x)$, in
polynomial time. Factoring and discrete logarithms both reduce to finding a
period. So RSA, Diffie-Hellman, DSA, ECDH, ECDSA and EdDSA all fall, at every
key size. Making the key bigger only slows the attack a little.

**Grover (1996).** Lov Grover, also at Bell Labs, showed that a quantum computer
can search $N$ possibilities in about $\sqrt{N}$ steps. That speeds up key
search for ciphers and preimage search for hashes, but only by a square root.

## How Shor's algorithm factors

The quantum part does one thing: find the period $r$ of $a^x \bmod N$. The rest
is ordinary number theory, which you can run now. Here the period is found by
the slow classical loop that a quantum computer replaces:

```python
from math import gcd

def period(a, N):                   # the step a quantum computer does fast; here, slowly
    r, x = 1, a % N
    while x != 1:
        x, r = x * a % N, r + 1
    return r

def shor_classical(N, a):
    g = gcd(a, N)
    if g > 1:
        return g                    # lucky guess
    r = period(a, N)
    if r % 2 or pow(a, r // 2, N) == N - 1:
        return None                 # try another a
    return gcd(pow(a, r // 2, N) - 1, N)

print(period(7, 15), shor_classical(15, 7))     # 4 3
print(shor_classical(3233, 3))                  # 61, and 3233 = 61 * 53
```

**Why it works.** If $a^r \equiv 1 \pmod N$ with $r$ even, then
$(a^{r/2} - 1)(a^{r/2} + 1) \equiv 0 \pmod N$. Neither factor is a multiple of
$N$ (unless $a^{r/2} \equiv -1$, the case we skip), so each shares a prime with
$N$, and a gcd pulls it out. A random $a$ works at least half the time.

The classical loop above takes up to $N$ steps, hopeless for a 2048-bit $N$.
Shor's quantum circuit puts all exponents $x$ in superposition, computes
$a^x \bmod N$ for all of them at once, and uses the **quantum Fourier
transform** to make the period show up when the register is measured. The cost
grows like $(\log N)^3$, roughly the size of the number cubed.

Discrete logs, mod $p$ or on an elliptic curve, are found the same way, as the
period of $(x, y) \mapsto g^x h^y$.

## What it does to each family

| Family | Classical security | Against a large quantum computer | What replaces it |
|---|---|---|---|
| RSA, DH, DSA | 112 to 128 bits | broken (Shor) | [ML-KEM](../01-key-exchange/ML-KEM.md), [ML-DSA](../02-signatures/ML-DSA.md) |
| ECDH, ECDSA, EdDSA | 128 bits | broken (Shor) | the same, often as a hybrid |
| AES-128 | 128 bits | 64 in theory (Grover), more in practice | still acceptable per NIST; AES-256 for the long term |
| AES-256 | 256 bits | 128 (Grover) | nothing needed |
| SHA-256 | 128 collision, 256 preimage | about the same collision cost; 128 preimage | nothing needed |
| Lattices, hashes, codes | 128+ bits | no known big speed-up | they are the replacement |

Grover is weaker in practice than the table suggests. Its $\sqrt{N}$ steps must
be done **one after another**, so splitting the search across many machines
helps much less than for classical search, and every step needs a long,
error-corrected circuit. That's why NIST still counts AES-128 as safe, while
security-sensitive users like the NSA's CNSA 2.0 suite ask for AES-256 anyway.

## How big a machine

- **2001:** IBM used a 7-qubit nuclear magnetic resonance machine to run Shor's
  algorithm on $N = 15$.
- **2019:** Craig Gidney and Martin Ekerå estimated that RSA-2048 could be
  factored in about 8 hours with 20 million noisy physical qubits.
- **2025:** Gidney revised that to under a million noisy qubits running for under
  a week.

Today's machines have hundreds to a few thousand physical qubits with error
rates far too high to run that circuit. The gap is large, but each estimate has
come down sharply, and building a machine takes years, not decades, once the
engineering problems are solved. Nobody knows when; serious estimates for a
machine able to break RSA-2048 range from the 2030s to never.

## Why the switch is happening now

**Harvest now, decrypt later.** Encrypted traffic recorded today can be stored
and decrypted when a big enough machine exists. Anything that must stay secret
for 15 years, such as medical records, diplomatic cables or industrial secrets,
is already at risk if it travels under RSA or ECDH.

Michele Mosca (University of Waterloo, 2015) put it as an inequality. Let

- $x$ = how many years your data must stay secret,
- $y$ = how many years it takes you to switch your systems,
- $z$ = how many years until a quantum computer breaks your keys.

If $x + y > z$, you are already too late.

That's why the timeline runs ahead of the hardware:

- **2016:** NIST opened its post-quantum competition.
- **2022:** NIST picked Kyber, Dilithium, Falcon and SPHINCS+.
- **2024:** FIPS 203, 204 and 205 published; Chrome and Cloudflare turned on
  hybrid post-quantum key exchange for a large share of web traffic.
- **2025:** OpenSSH 10.0 made the ML-KEM hybrid its default.
- **2030 / 2035:** NIST IR 8547 deprecates, then disallows, RSA and elliptic
  curves in US federal systems.

Signatures are less urgent than key exchange, since a signature can't be "decrypted
later", but certificates, firmware keys and identity documents last for many
years, so their switch is under way too. The full story is in
[Quantum and post-quantum](../history/10-Quantum-and-Post-Quantum.md).

## Try it

??? question "1. With $N = 21$ and $a = 2$, find the period and a factor."

    Powers of 2 mod 21: 2, 4, 8, 16, 11, 1, so $r = 6$. $2^3 = 8$, and $\gcd(8 - 1, 21) = 7$.
    So $21 = 7 \times 3$.

??? question "2. Would doubling RSA keys to 4096 bits protect against Shor?"

    No. Shor's cost grows only polynomially, roughly the cube of the key length, so a
    4096-bit key needs about twice the qubits and eight times the steps of a 2048-bit
    one. It buys very little.

??? question "3. Why isn't AES-256 replaced by a post-quantum cipher?"

    Grover only halves its security bits, to 128, which is still out of reach. No
    better quantum attack on AES is known.
