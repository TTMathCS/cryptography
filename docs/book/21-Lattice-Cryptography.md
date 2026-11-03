# 21. Lattice cryptography

*Chapter 20 showed that a quantum computer would break every public-key system
built on factoring or discrete logs. This chapter builds the replacements that
NIST chose: ML-KEM for key exchange, and ML-DSA and FN-DSA for signatures. They
rest on lattices, regular grids of points in hundreds of dimensions, and on one
idea, learning with errors: linear equations made hard by a little noise. You
will solve a lattice problem by hand, encrypt with LWE using numbers small
enough to check on paper, build a working toy of ML-KEM in 60 lines, and see
how the parameters are chosen against the best known attacks.*

!!! abstract "In this chapter"
    **You will learn:**

    - what a lattice is, why a good basis is a trapdoor and a bad one is a lock;
    - learning with errors (LWE), worked by hand with $q = 23$, and Regev's encryption built on it;
    - how rings and modules shrink keys 256-fold, and how ML-KEM is put together, with a working toy;
    - how ML-DSA signs with "Fiat-Shamir with aborts", and how FN-DSA signs with an NTRU trapdoor;
    - the best attacks on lattices and how ML-KEM's and ML-DSA's parameters are chosen.

    **You need:** [Chapter 3](03-The-Arithmetic-of-Secrets.md) (modular arithmetic),
    [Chapter 14](14-Discrete-Log-Systems.md) (Schnorr signatures and Fiat-Shamir),
    [Chapter 17](17-Defining-Security.md) (IND-CPA and IND-CCA),
    [Chapter 20](20-Quantum-Computers.md) (why we need this). Vectors and matrices help.

    **Levels:** 21.1 to 21.6 are intermediate; 21.7 to 21.11 are intermediate to advanced; 21.12 and
    21.14 are expert.

## 21.1 The problem

We need a new trapdoor: a calculation that is easy to do, hard to undo, and easy
again with a secret, where "hard" holds against quantum computers too. Shor's
algorithm wins by finding hidden periods in a group. So the new problem should
have no group structure of that kind for it to grab.

Lattices had a long history before anyone used them for secrets. Joseph-Louis
Lagrange (1773) and Carl Friedrich Gauss (1801) studied two-dimensional
lattices through quadratic forms, and Hermann Minkowski's *Geometry of Numbers*
(1896) made them a field of mathematics. In cryptography they first appeared
as a **weapon**. Ralph Merkle and Martin Hellman's knapsack cryptosystem (1978)
was one of the first public-key schemes; in 1982 Adi Shamir broke it, and the
lattice reduction algorithm of Arjen Lenstra, Hendrik Lenstra and László
Lovász, published that same year, then broke almost every knapsack variant.

The turn came in 1996. Miklós Ajtai at IBM proved that some *random* lattice
problems are as hard as the *hardest* instances of a related problem, a
guarantee nothing in factoring offers. The same year Jeffrey Hoffstein, Jill
Pipher and Joseph Silverman of Brown University presented **NTRU**, a fast
lattice cryptosystem that is still standing. In 2005 Oded Regev defined
**learning with errors** and proved it as hard as worst-case lattice problems,
even for quantum computers; he received the Gödel Prize for it in 2018. Faster
structured versions followed (ring LWE in 2010, module LWE in 2015), and in 2017
the CRYSTALS team submitted Kyber and Dilithium to NIST. In August 2024 they
became FIPS 203 (ML-KEM) and FIPS 204 (ML-DSA).

## 21.2 Lattices

*Level: intermediate.* Take two vectors $b_1, b_2$ in the plane that don't point
the same way. The **lattice** they generate is every whole-number combination:

$$
\mathcal{L} = \{\, x_1 b_1 + x_2 b_2 \;:\; x_1, x_2 \in \mathbb{Z} \,\}.
$$

It is a grid of points, perhaps slanted. The same idea works with $n$ vectors in
$n$ dimensions. The vectors $b_i$ are a **basis**, and a lattice has infinitely
many bases.

**By hand.** These two bases generate exactly the same lattice:

$$
\text{good: } b_1 = (1, 32),\ b_2 = (40, 1) \qquad\qquad \text{bad: } b_1' = (201, 37),\ b_2' = (1648, 297).
$$

You can check it two ways. Each bad vector is a whole-number combination of the
good ones ($(201, 37) = 1 \cdot (1, 32) + 5 \cdot (40, 1)$, and you can find the
other), and the **determinant**, the area of the parallelogram the basis spans,
is the same for both:

$$
1 \cdot 1 - 32 \cdot 40 = -1279, \qquad 201 \cdot 297 - 37 \cdot 1648 = 59697 - 60976 = -1279.
$$

Same area, same lattice. But the good basis has short vectors (lengths 32.0 and
40.0) nearly at right angles. The bad one has long vectors (204 and 1,675)
pointing almost the same way.

## 21.3 The hard problems

*Level: intermediate.* Two questions about a lattice are the basis of everything
in this chapter.

- **Shortest vector problem (SVP):** find the shortest nonzero lattice point.
- **Closest vector problem (CVP):** given a point $t$ that is not on the lattice,
  find the lattice point nearest to it.

With a good basis CVP is easy, at least approximately: write $t$ in terms of
the basis, round the coefficients to whole numbers, and multiply back. This is
**Babai's rounding** method (1986).

**By hand.** Find the lattice point closest to $t = (100, 200)$.

With the good basis, $t = 6.177 \cdot (1, 32) + 2.346 \cdot (40, 1)$. Round to
$6$ and $2$: the point $6 \cdot (1, 32) + 2 \cdot (40, 1) = (86, 194)$, at
distance 15.2. A search over thousands of nearby points confirms it is the
closest.

With the bad basis, $t = 234.48 \cdot (201, 37) - 28.538 \cdot (1648, 297)$.
Round to $234$ and $-29$: the point $(-758, 45)$, at distance **872**. Same
lattice, same target, same method, and an answer 57 times too far away.
Because the bad vectors are long and almost parallel, a tiny rounding error in
the coefficients turns into a huge error in the plane.

That asymmetry is the trapdoor. **The private key is a good basis; the public
key is a bad basis of the same lattice.** In two dimensions anyone can turn a
bad basis into a good one (next section). In 500 or 1,000 dimensions nobody
knows how, on any computer.

## 21.4 Lattice reduction: turning bad bases into good

*Level: intermediate.* In two dimensions, Lagrange and Gauss's method is a kind
of Euclid's algorithm for vectors: subtract the right multiple of the shorter
vector from the longer, swap, repeat.

```python
def reduce2(u, v):                      # Lagrange-Gauss reduction of a 2-D lattice basis
    dot = lambda a, b: a[0] * b[0] + a[1] * b[1]
    if dot(u, u) > dot(v, v):
        u, v = v, u
    while True:
        k = round(dot(u, v) / dot(u, u))
        v = (v[0] - k * u[0], v[1] - k * u[1])
        if dot(v, v) >= dot(u, u):
            return u, v
        u, v = v, u

print(reduce2((201, 37), (1648, 297)))
```

Output:

```
((1, 32), (40, 1))
```

Two steps do it: $(1648, 297) - 8 \cdot (201, 37) = (40, 1)$, then
$(201, 37) - 5 \cdot (40, 1) = (1, 32)$. The trapdoor in two dimensions lasts
two subtractions.

In 1982 Lenstra, Lenstra and Lovász gave **LLL**, which does this in any
dimension in polynomial time, but only promises a vector within a factor of
about $2^{n/2}$ of the shortest. In practice it does better, about $1.02^n$,
which is enough to break knapsacks and many badly designed schemes, but useless
against a well-chosen lattice in dimension 500. Claus-Peter Schnorr and M.
Euchner's **BKZ** (1994) trades time for quality: it solves exact SVP in
blocks of $\beta$ dimensions at a time, sliding along the basis. Bigger blocks
give shorter vectors at a cost that grows exponentially in $\beta$. Every
serious attack on the schemes in this chapter is BKZ with a large block size,
and their parameters are set so the needed $\beta$ is out of reach (section 21.12).

## 21.5 Learning with errors, by hand

*Level: intermediate.* Here is the problem ML-KEM and ML-DSA rest on. Pick a
secret vector $s$ with entries mod $q$. You are given many random vectors $a_i$
and the numbers

$$
b_i = \langle a_i, s \rangle + e_i \bmod q,
$$

where each **error** $e_i$ is small, say $-1$, $0$ or $1$. Find $s$.

**By hand, with $q = 23$ and a secret of two numbers, $s = (3, 15)$.** Six
samples:

| $i$ | $a_i$ | $\langle a_i, s \rangle \bmod 23$ | $e_i$ | $b_i$ |
|---|---|---|---|---|
| 1 | (4, 9) | $12 + 135 = 147 \equiv 9$ | $+1$ | 10 |
| 2 | (13, 2) | $39 + 30 = 69 \equiv 0$ | $-1$ | 22 |
| 3 | (7, 20) | $21 + 300 = 321 \equiv 22$ | 0 | 22 |
| 4 | (18, 11) | $54 + 165 = 219 \equiv 12$ | $+1$ | 13 |
| 5 | (10, 5) | $30 + 75 = 105 \equiv 13$ | $-1$ | 12 |
| 6 | (2, 16) | $6 + 240 = 246 \equiv 16$ | $+1$ | 17 |

The public sees only the columns $a_i$ and $b_i$.

**Without errors it is school algebra.** Two equations, two unknowns: solve the
first two rows by elimination (mod 23) and you get $s = (3, 15)$ at once.

**With errors, elimination lies.** Solve rows 1 and 2 as if they were exact and
you get $s = (1, 16)$. It fits those two rows perfectly, and it is wrong. Test
it on the others: the leftovers $b_i - \langle a_i, (1, 16) \rangle$ are
$-6, 3, -9, -11$, not small. The true secret leaves $1, -1, 0, 1, -1, 1$.
Every time elimination combines equations it adds their errors, and after a few
steps the accumulated error is as large as $q$: noise.

**What works at this size is brute force.** Try all $23^2 = 529$ candidates and
keep those that leave every leftover in $\{-1, 0, 1\}$. With all six samples
only $(3, 15)$ survives; with the first three, two candidates do. At real size
the secret has 768 coefficients (ML-KEM-768), each between $-2$ and $2$, so
there are $5^{768} \approx 2^{1783}$ candidates. The best attacks do far better
than brute force, by turning the problem into a closest-vector problem in a
lattice, but still need about $2^{180}$ operations for those parameters.

Why is it a lattice problem? The vectors $(\langle a_1, x \rangle, \ldots,
\langle a_m, x \rangle) \bmod q$ for all $x$ form a lattice, and $b$ is a point
just off it, displaced by the small error $e$. Finding $s$ means finding the
lattice point closest to $b$: CVP with a bad basis.

## 21.6 Encrypting with LWE

*Level: intermediate.* Regev's 2005 encryption follows straight from the
problem. To see every step, shrink it to single numbers. This toy is not
secure; it shows why noise does not stop decryption. Work mod $q = 3329$, the
modulus of ML-KEM.

<div class="mars-steps" markdown>

1. Bob picks a public random $a = 1234$, a small secret $s = 2$ and a small error $e = 1$. He publishes $t = a s + e = 2469$.
2. Alice wants to send the bit 1. She picks small random $r = 3$, $e_1 = -1$, $e_2 = 1$.
3. She sends $u = a r + e_1 = 3702 - 1 \equiv 372 \pmod{3329}$.
4. She sends $v = t r + e_2 + 1665 \cdot \text{bit} = 7407 + 1 + 1665 \equiv 2415$. The 1665, about $q/2$, carries the bit.
5. Bob computes $w = v - s u = 2415 - 744 = 1671$.
6. 1671 is 6 away from 1665 and far from 0, so the bit is 1.

</div>

**Why it works.** Expand: $v - s u = (as + e) r + e_2 + 1665 \cdot \text{bit} - s(ar + e_1) =
1665 \cdot \text{bit} + (e r + e_2 - s e_1)$. The $a s r$ terms cancel exactly, and
what's left is the bit times $q/2$ plus $1 \cdot 3 + 1 - 2 \cdot (-1) = 6$.
Every secret and error is small, so their products are small, and the noise
stays far below $q/4 \approx 832$. To anyone without $s$, $u$ and $v$ look like
random numbers mod 3329.

In Regev's actual scheme the numbers are vectors: the public key is a random
matrix $A$ and $b = As + e$, and to encrypt Alice adds up a random subset of the
rows. Here it is with $n = 10$, $q = 97$ and 20 rows:

```python
import random

n, q, m = 10, 97, 20                    # toy sizes; ML-KEM works with 256 coefficients per polynomial, q = 3329

def keygen():
    s = [random.randrange(q) for _ in range(n)]
    A = [[random.randrange(q) for _ in range(n)] for _ in range(m)]
    b = [(sum(a * x for a, x in zip(row, s)) + random.choice([-1, 0, 1])) % q for row in A]
    return s, (A, b)                    # private s; public A and b = A s + e

def enc(pub, bit):
    A, b = pub
    S = [i for i in range(m) if random.random() < 0.5]       # a random subset of the rows
    u = [sum(A[i][j] for i in S) % q for j in range(n)]
    v = (sum(b[i] for i in S) + bit * (q // 2)) % q
    return u, v

def dec(s, c):
    u, v = c
    d = (v - sum(a * x for a, x in zip(u, s))) % q           # bit * 48 plus a small error
    return 1 if q // 4 < d < 3 * q // 4 else 0

s, pub = keygen()
bits = [random.randrange(2) for _ in range(1000)]
print(all(dec(s, enc(pub, x)) == x for x in bits))
```

Output:

```
True
```

Decryption leaves the bit times 48 plus the sum of at most 20 errors of size 1,
so at most 20 away, less than $q/4 \approx 24$. It can never cross the line.
(The toy uses `random`; real keys need `secrets`. At these sizes it is breakable
in a moment anyway.)

**Why it is secure.** Regev showed that if LWE is hard, $(A, b)$ looks
uniformly random. Then a random subset sum of random-looking rows looks random
too, so $(u, v)$ hides the bit. This is **IND-CPA** security
([Chapter 17](17-Defining-Security.md)).

## 21.7 Rings and modules: small and fast

*Level: intermediate to advanced.* Regev's scheme is slow and its keys are huge:
a full $m \times n$ matrix per key. The practical schemes replace numbers with
**polynomials** in the ring

$$
R_q = \mathbb{Z}_q[x] / (x^n + 1).
$$

Elements are polynomials with $n$ coefficients mod $q$. You multiply as usual,
then replace $x^n$ by $-1$ wherever it appears. The ring is called
**negacyclic**: multiplying by $x$ shifts the coefficients up one place, and the
top one wraps around to the bottom with its sign flipped.

**By hand, with $n = 4$ and $q = 17$.** Take $a = 1 + 2x + 3x^2 + 4x^3$.

$$
a \cdot x = x + 2x^2 + 3x^3 + 4x^4 = -4 + x + 2x^2 + 3x^3 \equiv 13 + x + 2x^2 + 3x^3 .
$$

And $a \cdot (2 + x^3)$: $2a = 2 + 4x + 6x^2 + 8x^3$, while
$a \cdot x^3 = x^3 + 2x^4 + 3x^5 + 4x^6 = x^3 - 2 - 3x - 4x^2$. Adding gives
$0 + x + 2x^2 + 9x^3$.

Multiplying by a fixed $a$ is a linear map, so it is a $4 \times 4$ matrix,
each column the previous one shifted with a sign flip:

$$
\begin{pmatrix} 1 & -4 & -3 & -2 \\ 2 & 1 & -4 & -3 \\ 3 & 2 & 1 & -4 \\ 4 & 3 & 2 & 1 \end{pmatrix}.
$$

So **one polynomial stands for a whole structured matrix**. With $n = 256$, a
public key that was a $256 \times 256$ matrix of numbers becomes a single
polynomial: 256 numbers instead of 65,536. That is **ring LWE** (Lyubashevsky,
Peikert and Regev, 2010).

**Modules** sit in between. ML-KEM uses a small $k \times k$ matrix whose entries
are polynomials in $R_q$ with $n = 256$, and secrets that are vectors of $k$
small polynomials. This is **module LWE** (Langlois and Stehlé, 2015). Raising
$k$ from 2 to 3 to 4 raises the lattice dimension from 512 to 768 to 1,024 and
gives the three security levels, while the arithmetic underneath, polynomials of
degree 256 mod 3329, stays the same. Keeping $k$ small also keeps less algebraic
structure than a single huge ring would, which is part of why the designers
chose modules.

**Fast multiplication.** Multiplying two polynomials the schoolbook way costs
$n^2$ products. ML-KEM's modulus was picked so a faster way works:
$3329 = 13 \cdot 256 + 1$, so mod 3329 there is a 256th root of unity, $\zeta = 17$
($17^{128} \equiv -1$ and $17^{256} \equiv 1 \pmod{3329}$). That makes the
**number-theoretic transform** possible: a Fourier transform with whole numbers
mod $q$, which turns one polynomial product into 128 tiny ones, about
$n \log n$ work.

## 21.8 ML-KEM

*Level: intermediate to advanced.* ML-KEM (FIPS 203) is the module version of
section 21.6, plus three engineering steps.

**The core encryption (K-PKE).** Everything is polynomials in $R_{3329}$ with
$n = 256$; bold letters are vectors or matrices of them.

$$
\begin{aligned}
\text{Key:}\quad & \mathbf{A} \text{ random } k \times k,\quad \mathbf{s}, \mathbf{e} \text{ small},\quad \mathbf{t} = \mathbf{A}\mathbf{s} + \mathbf{e} \\
\text{Encrypt } m:\quad & \mathbf{r}, \mathbf{e}_1, e_2 \text{ small},\quad \mathbf{u} = \mathbf{A}^\mathsf{T}\mathbf{r} + \mathbf{e}_1,\quad v = \mathbf{t}^\mathsf{T}\mathbf{r} + e_2 + 1665 \cdot m \\
\text{Decrypt:}\quad & v - \mathbf{s}^\mathsf{T}\mathbf{u} = 1665 \cdot m + (\mathbf{e}^\mathsf{T}\mathbf{r} + e_2 - \mathbf{s}^\mathsf{T}\mathbf{e}_1)
\end{aligned}
$$

The message $m$ is 256 bits, one per coefficient of $v$. "Small" means
coefficients from $-2$ to $2$ (or $-3$ to $3$ for the key in ML-KEM-512),
drawn from a **centered binomial distribution**: add two coin flips, subtract
two others. It is cheap to sample in constant time.

**Code it.** This is that core with ML-KEM-768's sizes ($k = 3$) but without
the compression and the fast transform:

```python
import hashlib, random, secrets

n, q, k = 256, 3329, 3                  # ML-KEM-768's ring and rank; no compression, no NTT

def mul(a, b):                          # multiply in Z_q[x]/(x^256 + 1): x^256 wraps around to -1
    c = [0] * n
    for i, ai in enumerate(a):
        for j, bj in enumerate(b):
            if i + j < n: c[i + j] += ai * bj
            else: c[i + j - n] -= ai * bj
    return [x % q for x in c]

def add(*ps): return [sum(cs) % q for cs in zip(*ps)]
def dot(u, v): return add(*[mul(a, b) for a, b in zip(u, v)])
def ones(x): return bin(x).count("1")
def small(rng): return [ones(rng.getrandbits(2)) - ones(rng.getrandbits(2)) for _ in range(n)]   # -2..2

def keygen(rng):
    A = [[[rng.randrange(q) for _ in range(n)] for _ in range(k)] for _ in range(k)]
    s = [small(rng) for _ in range(k)]
    t = [add(dot(row, s), small(rng)) for row in A]                                 # t = A s + e
    return (A, t), s

def encrypt(pk, m, rng):                # m is a list of 256 bits; rng supplies r, e1, e2
    A, t = pk
    r = [small(rng) for _ in range(k)]
    u = [add(dot([A[i][j] for i in range(k)], r), small(rng)) for j in range(k)]   # A^T r + e1
    v = add(dot(t, r), small(rng), [b * 1665 for b in m])                           # t.r + e2 + bit * q/2
    return u, v

def decrypt(s, c):
    u, v = c
    w = add(v, [-x for x in dot(s, u)]) # bit * 1665 plus small noise
    return [int(832 < x < 2497) for x in w], w

rng = random.Random(2024)               # fixed seed so the run repeats; real keys need secrets
pk, sk = keygen(rng)
m = [rng.getrandbits(1) for _ in range(n)]
got, w = decrypt(sk, encrypt(pk, m, rng))
noise = [(x - b * 1665 + q // 2) % q - q // 2 for x, b in zip(w, m)]
print(got == m, max(map(abs, noise)))
```

Output:

```
True 143
```

All 256 bits come back, and the largest noise in any coefficient is 143,
far below the 832 that would flip a bit.

**Engineering step 1: the matrix from a seed.** $\mathbf{A}$ is $k^2 \cdot 256$
random numbers. ML-KEM doesn't send it; it sends a 32-byte seed and both sides
expand it with SHAKE128. That also means nobody chose $\mathbf{A}$ with a
hidden structure.

**Engineering step 2: compression.** The low bits of $\mathbf{t}$'s and the
ciphertext's coefficients are mostly noise anyway, so ML-KEM rounds them off:
$\mathbf{u}$ keeps 10 bits per coefficient and $v$ keeps 4 (for ML-KEM-768).
The rounding adds a little more noise, which the parameters allow for. Now the
sizes follow by arithmetic. A public key is $k$ polynomials of 256 coefficients
at 12 bits each, plus the 32-byte seed:
$3 \cdot 256 \cdot 12 / 8 + 32 = 1{,}184$ bytes. A ciphertext is
$3 \cdot 256 \cdot 10/8 + 256 \cdot 4/8 = 960 + 128 = 1{,}088$ bytes.

**Engineering step 3: the Fujisaki-Okamoto transform.** K-PKE is only IND-CPA.
An attacker who can send modified ciphertexts and watch whether decryption
"works" can learn the secret bit by bit; that is exactly the kind of
chosen-ciphertext attack [Chapter 17](17-Defining-Security.md) defines. The fix
(Fujisaki and Okamoto, 1999; adapted to KEMs by Hofheinz, Hövelmanns and Kiltz,
2017) makes encryption deterministic from a hash of the message, and makes the
receiver **re-encrypt** what it decrypted and compare:

```python
def G(*xs):                             # one hash gives the key and the encryption's coins
    d = hashlib.sha3_512(repr(xs).encode()).digest()
    return d[:32], d[32:]

def bits(m): return [m[i // 8] >> i % 8 & 1 for i in range(256)]

def encaps(pk):
    m = secrets.token_bytes(32)
    key, coins = G(m, pk)
    return key, encrypt(pk, bits(m), random.Random(coins))   # encryption made deterministic by the coins

def decaps(pk, s, z, c):
    got, _ = decrypt(s, c)
    m = bytes(sum(b << j for j, b in enumerate(got[i:i + 8])) for i in range(0, 256, 8))
    key, coins = G(m, pk)
    if encrypt(pk, got, random.Random(coins)) == c:          # re-encrypt and compare
        return key
    return G(z, c)[0]                                        # wrong ciphertext: a random-looking key

pk, s = keygen(random.Random(secrets.randbits(128)))
z = secrets.token_bytes(32)
key, c = encaps(pk)
print(decaps(pk, s, z, c) == key)
u, v = c
bad = (u, [v[0] + 1] + v[1:])                                # nudge one coefficient
print(decaps(pk, s, z, bad) == key, decrypt(s, bad)[0] == decrypt(s, c)[0])
```

Added to the end of the program above, it prints two more lines:

```
True
False True
```

The last line is the point. Nudging one coefficient still decrypts to the same
message (the noise absorbs it), so plain K-PKE would accept the tampered
ciphertext and give the attacker a signal. The re-encryption doesn't match, so
`decaps` returns a key derived from the secret $z$ instead: random-looking, and
the same whether the tampering was detected early or late. This "implicit
rejection" gives the attacker nothing to measure. ML-KEM also hashes the public
key into $G$, and must compare in constant time.

**The real thing.** A recent `cryptography` package (version 50 was used here)
includes ML-KEM and ML-DSA:

```python
# pip install cryptography
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.mldsa import MLDSA65PrivateKey
from cryptography.hazmat.primitives.asymmetric.mlkem import MLKEM768PrivateKey

kem = MLKEM768PrivateKey.generate()
secret, ct = kem.public_key().encapsulate()
print(len(kem.public_key().public_bytes_raw()), len(ct), kem.decapsulate(ct) == secret)

key = MLDSA65PrivateKey.generate()
sig = key.sign(b"release v2.1")
print(len(key.public_key().public_bytes_raw()), len(sig), key.sign(b"release v2.1") == sig)
key.public_key().verify(sig, b"release v2.1")          # returns quietly when valid
try:
    key.public_key().verify(sig, b"release v2.2")
except InvalidSignature:
    print("forgery rejected")
```

Output:

```
1184 1088 True
1952 3309 False
forgery rejected
```

The 1,184 and 1,088 bytes match the arithmetic above. The `False` on the
second line is not an error: ML-DSA signing mixes in fresh randomness by
default, so two signatures of the same message differ (section 21.9).

| Parameter set | $k$ | Security category | Public key | Ciphertext | Failure chance |
|---|---|---|---|---|---|
| ML-KEM-512 | 2 | 1 (like AES-128) | 800 B | 768 B | $2^{-139}$ |
| ML-KEM-768 | 3 | 3 (like AES-192) | 1,184 B | 1,088 B | $2^{-165}$ |
| ML-KEM-1024 | 4 | 5 (like AES-256) | 1,568 B | 1,568 B | $2^{-175}$ |

The shared secret is always 32 bytes. The **failure chance** is the probability
that the noise crosses $q/4$ and decryption gives the wrong message; FIPS 203
puts it far below anything that will ever happen. Full details:
[ML-KEM reference](../01-key-exchange/ML-KEM.md).

## 21.9 ML-DSA: Fiat-Shamir with aborts

*Level: intermediate to advanced.* Recall Schnorr's signature from
[Chapter 14](14-Discrete-Log-Systems.md): commit to a random $k$, get a challenge
$c$ from a hash, answer $z = k + c x$. The random $k$ hides the secret $x$
perfectly because everything is mod the group order. ML-DSA (FIPS 204, from
Dilithium) does the same with lattices, and runs into one new problem.

**The scheme in outline.** Work in $R_q$ with $q = 8{,}380{,}417 = 2^{23} - 2^{13} + 1$
and $n = 256$.

- **Key:** a public matrix $\mathbf{A}$ (from a seed), small secrets
  $\mathbf{s}_1, \mathbf{s}_2$, public $\mathbf{t} = \mathbf{A}\mathbf{s}_1 + \mathbf{s}_2$.
- **Sign:** pick a random mask $\mathbf{y}$ with coefficients below $\gamma_1$;
  compute $\mathbf{w} = \mathbf{A}\mathbf{y}$ and keep only its high bits
  $\mathbf{w}_1$. Hash the message with $\mathbf{w}_1$ into a sparse challenge
  $c$ (a polynomial with a few dozen coefficients $\pm 1$). Answer
  $\mathbf{z} = \mathbf{y} + c\,\mathbf{s}_1$.
- **Verify:** compute $\mathbf{A}\mathbf{z} - c\,\mathbf{t} = \mathbf{A}\mathbf{y} - c\,\mathbf{s}_2$.
  That differs from $\mathbf{w}$ only by the small $c\,\mathbf{s}_2$, so its high
  bits are $\mathbf{w}_1$ again. Rehash and compare $c$; check $\mathbf{z}$ is short.

**By hand, with single numbers mod 97.** Public $a = 33$, small secrets
$s_1 = 2$, $s_2 = 1$, so $t = 33 \cdot 2 + 1 = 67$. To sign: mask $y = 20$,
$w = 33 \cdot 20 = 660 \equiv 78 \pmod{97}$; its "high bits" (the tens digit) are 7.
Say the hash of 7 and the message gives $c = 1$. Then $z = 20 + 1 \cdot 2 = 22$.
To verify: $33 \cdot 22 - 1 \cdot 67 = 659 \equiv 77$, high bits 7. It matches,
even though $77 \ne 78$: the rounding to high bits hides the small $s_2$.

**The new problem: the answer leaks.** In Schnorr, $z$ is uniform mod $q$
whatever $x$ is. Here $\mathbf{z}$ must be *short*, or verification can't
distinguish it from a forgery, so $\mathbf{y}$ can't be uniform over everything,
and $\mathbf{z} = \mathbf{y} + c\,\mathbf{s}_1$ is shifted toward $c\,\mathbf{s}_1$. Collect
enough signatures and the shift gives away the secret. Vadim Lyubashevsky's fix
(2009, 2012) is **rejection sampling**: if any coefficient of $\mathbf{z}$ falls
outside a slightly smaller range, throw the attempt away and start again with a
new $\mathbf{y}$. What survives is uniform on that range, independent of the
secret. This simulation shows one coefficient, with $y$ from $-20$ to $20$ and a
secret $s = \pm 2$:

```python
import random

rng = random.Random(7)                  # fixed seed so the run repeats
gamma, beta = 20, 2                     # mask range, and the largest c*s can be

def respond(s, reject):                 # one coefficient of z = y + c*s, with the challenge c = 1
    while True:
        z = rng.randint(-gamma, gamma) + s
        if not reject or abs(z) <= gamma - beta:
            return z

for reject in (False, True):
    for s in (2, -2):
        zs = [respond(s, reject) for _ in range(100000)]
        print("reject" if reject else "keep all", s, min(zs), max(zs), round(sum(zs) / len(zs)))
```

Output:

```
keep all 2 -18 22 2
keep all -2 -22 18 -2
reject 2 -18 18 0
reject -2 -18 18 0
```

Without rejection, the range and the average of $z$ both reveal $s$: a single
$z = 22$ proves $s = 2$. With rejection, both secrets give the same
distribution. Here 37 of 41 attempts survive. In ML-DSA all coefficients must
pass at once, so a signature takes about 4 tries on average (4.25, 5.1 and 3.85
for the three sizes).

**Randomness.** By default ML-DSA is **hedged**: the mask comes from a hash of
the key, the message and fresh random bytes. A broken random generator then
can't leak the key the way it does with ECDSA's nonce (Chapter 14), and two
signatures of the same message differ, as the output above showed.

| Parameter set | $(k, l)$ | Category | Public key | Signature |
|---|---|---|---|---|
| ML-DSA-44 | (4, 4) | 2 | 1,312 B | 2,420 B |
| ML-DSA-65 | (6, 5) | 3 | 1,952 B | 3,309 B |
| ML-DSA-87 | (8, 7) | 5 | 2,592 B | 4,627 B |

Compare Ed25519's 32-byte key and 64-byte signature. Security rests on module
LWE (recovering the key) and on **module SIS**, the short integer solution
problem (finding short $\mathbf{z}$ that satisfy the equations without the key,
which is forging). Full details: [ML-DSA reference](../02-signatures/ML-DSA.md).

## 21.10 NTRU and FN-DSA

*Level: intermediate to advanced.* NTRU is the other branch of lattice
cryptography, older than LWE and built differently: the trapdoor is a pair of
short polynomials, and there is no separate error term. Hoffstein, Pipher and
Silverman presented it at the CRYPTO '96 rump session and published it in 1998.
It was patented until 2017, which kept it out of many products.

**NTRU encryption by hand** (their textbook example). Work with polynomials of
7 coefficients mod $x^7 - 1$, a small modulus $p = 3$ and a big one $q = 41$.
Coefficients are listed from $x^0$ up.

| Step | Value |
|---|---|
| Secret $f$ (small, invertible) | $[-1, 0, 1, 1, -1, 0, 1]$ |
| Secret $g$ (small) | $[0, -1, -1, 0, 1, 0, 1]$ |
| $f^{-1} \bmod 41$ | $[37, 2, 40, 21, 31, 26, 8]$ |
| $f^{-1} \bmod 3$ | $[1, 1, 1, 1, 0, -1, 1]$ |
| Public $h = 3 \cdot f^{-1} \cdot g \bmod 41$ | $[8, 37, 24, 32, 6, 38, 19]$ |
| Message $m$, random small $r$ | $m = [1, 0, 0, -1, 1, 0, -1]$, $r = [-1, 1, 0, 0, 0, -1, 1]$ |
| Ciphertext $e = r \cdot h + m \bmod 41$ | $[25, 4, 39, 0, 5, 20, 30]$ |
| Bob: $a = f \cdot e \bmod 41$, centered | $[4, -2, -4, 4, -8, 4, 2]$ |
| Bob: $f^{-1} \cdot a \bmod 3$ | $[1, 0, 0, -1, 1, 0, -1] = m$ |

**Why it works.** $f \cdot e = 3 \cdot r \cdot g + f \cdot m$, since
$f \cdot h = 3g$. Both terms on the right have small coefficients, so the true
integer result is below $q/2$ in size and reducing mod 41 changes nothing.
Reducing mod 3 then kills $3 r g$, and multiplying by $f^{-1} \bmod 3$ leaves
$m$. The secret $(f, g)$ is an unusually short vector in the lattice of pairs
$(x, y)$ with $y \equiv x h \pmod q$; finding it from $h$ is a shortest-vector
problem. **Streamlined NTRU Prime**, the version OpenSSH used as its first
post-quantum default, uses the same idea in the ring $\mathbb{Z}_{4591}[x]/(x^{761} - x - 1)$,
chosen to have as little extra structure as possible
([NTRU Prime reference](../01-key-exchange/NTRU-Prime.md)).

**FN-DSA (Falcon): hash and sign.** Falcon, submitted in 2017 by a team of ten
including Thomas Pornin and Thomas Prest and selected by NIST in 2022, signs the
way RSA does: hash the message to a target, then use the trapdoor to find a
**short** solution. It follows Gentry, Peikert and Vaikuntanathan (2008), over
an NTRU lattice with $q = 12{,}289$ and $n = 512$ or 1,024. The public key is
$h = g/f$; a signature is a short pair $(s_1, s_2)$ with
$s_1 + s_2 h \equiv c \pmod q$, where $c$ is the hash of a salt and the message.

**By hand, mod 97.** With $h = 40$ and $c = 55$, anyone can pick an $s_2$ and
solve for $s_1$: $s_2 = 30$ gives $s_1 = 19$ (size $19^2 + 30^2 = 1{,}261$),
$s_2 = 4$ gives $s_1 = -8$ (size 80), and $s_2 = -1$ gives $s_1 = -2$ (size 5,
the shortest). Check: $-2 + (-1) \cdot 40 = -42 \equiv 55$. Every $s_2$ satisfies
the equation; only the holder of the short basis can find a *short* pair when
there are $12{,}289^{512}$ candidates. The verifier checks the equation and
the length.

**Why Falcon is hard to implement.** The short pair must be drawn from a
discrete Gaussian distribution, or each signature leaks a little of the secret
basis. That is exactly how **NTRUSign** (2003) was broken: Phong Nguyen and
Oded Regev showed in 2006 that a few hundred signatures reveal the shape of the
secret basis ("learning a parallelepiped"). Falcon's "fast Fourier sampler"
gets the distribution right, but it runs on floating-point numbers, which are
hard to make constant-time and differ subtly between processors.

| Parameter set | Category | Public key | Signature |
|---|---|---|---|
| FN-DSA-512 (Falcon-512) | 1 | 897 B | 666 B |
| FN-DSA-1024 (Falcon-1024) | 5 | 1,793 B | 1,280 B |

Falcon's signatures are a quarter of ML-DSA's, which matters for certificate
chains. Its standard, FIPS 206, was still in preparation when this chapter was
written. Full details: [FN-DSA reference](../02-signatures/FN-DSA.md).

## 21.11 Break it

*Level: intermediate to advanced.* Lattice cryptography has a long list of
casualties, and each taught something.

- **Knapsacks (1982 onward).** Merkle-Hellman and its variants hid a trapdoor
  in a subset-sum problem with a low-density structure. Shamir's attack and
  LLL found short vectors that exposed it. Lesson: structure added for the
  trapdoor is what the attacker hunts.
- **GGH (1997).** Goldreich, Goldwasser and Halevi's scheme used the "good basis,
  bad basis" idea of section 21.3 directly. Nguyen broke the proposed
  parameters in 1999: the errors were too small and the dimension too low.
- **NTRUSign (2003 to 2006).** Signatures leaked the secret basis, as described
  above. Lesson: a signature's distribution must not depend on the key.
  Rejection sampling (ML-DSA) and Gaussian sampling (Falcon) are the two fixes.
- **Errors too small or too structured.** Arora and Ge (2011) showed that if
  the errors come from a tiny set and there are many samples, LWE can be turned
  into a large system of linear equations and solved. Real schemes give few
  samples per key and wide enough errors.
- **Decryption failures.** If decryption fails occasionally, an attacker who
  can submit many ciphertexts and notice failures learns about the secret. The
  FO transform and failure rates around $2^{-140}$ or lower close this.
- **KyberSlash (2023 to 2024).** Several Kyber implementations, the reference
  code among them, computed a division whose operands depended on secret data.
  On many processors division time depends on the value, and researchers
  recovered keys from timing measurements. It was patched quickly. Lesson: the
  code fails before the mathematics, as in [Chapter 18](18-Side-Channels.md).
- **Side channels on Falcon and ML-DSA.** "Falcon Down" (Karabulut and Aysu,
  2021) recovered Falcon keys from the electromagnetic emissions of an
  unprotected chip; power and fault attacks on unprotected Dilithium hardware
  followed. Masking (splitting secrets into random shares during computation)
  is the defense.
- **A false alarm.** In April 2024 Yilei Chen posted a quantum algorithm for
  LWE that, if correct, would have threatened lattice schemes (though not
  ML-KEM's parameters directly). Within about ten days other researchers found
  a bug, and the claim was withdrawn. The episode showed both the worry about
  young assumptions and how fast the field checks claims.

**The attacks that set the parameters** are not breaks but costs. The **primal
attack** embeds an LWE instance into a lattice where $(\mathbf{s}, \mathbf{e})$
becomes an unusually short vector, and runs BKZ until it shows up. The **dual
attack** finds short vectors in a related lattice and uses them to tell LWE
samples from random. Both need BKZ with a block size $\beta$ in the several
hundreds for ML-KEM.

## 21.12 Choosing parameters

*Level: expert.* Every lattice scheme balances three numbers: the dimension
($n k$), the modulus $q$, and the size of the secrets and errors.

- **Bigger errors** make the lattice problem harder, but the noise in
  decryption grows, so $q$ must grow, and a bigger $q$ relative to the errors
  makes the problem easier again. The scheme is a tightrope between
  "decryption fails" and "the attacker wins".
- **Bigger dimension** makes attacks harder and keys longer, in direct
  proportion.

The cost model starts from the best way to solve SVP inside BKZ, **lattice
sieving**: about $2^{0.292\beta}$ operations classically (Becker, Ducas, Gama and
Laarhoven, 2016) and about $2^{0.257\beta}$ on a quantum computer (Chailloux and
Loyer, 2021). Counting a single sieve call in dimension $\beta$ is the **core-SVP**
measure. For Kyber the round-3 designers estimated $\beta$ values that give
core-SVP hardness of about $2^{118}$ for the smallest set and over $2^{180}$ and
$2^{250}$ for the larger two. The first is below 128. The designers and NIST argued that the real cost of a
sieve, with its enormous memory and the gates each step needs, adds many bits,
putting ML-KEM-512 above AES-128 key search; Daniel Bernstein disputed NIST's
arithmetic in 2023, and NIST kept the parameter set. That argument is why many
deployments use ML-KEM-768, and why NSA's CNSA 2.0 asks for ML-KEM-1024.

The open-source **lattice estimator** (begun by Martin Albrecht, Rachel Player
and Sam Scott in 2015) computes the cost of every known attack for given $n$,
$q$ and error distribution; designers pick parameters where the cheapest attack
still clears the target. NIST also wanted a backup that needs less trust in
structure: **FrodoKEM** uses plain, unstructured LWE with public keys of about 10 to
21 KB and is recommended by Germany's BSI and France's ANSSI, though NIST did
not standardize it.

## 21.13 In the real world

- **Key exchange.** ML-KEM-768 in the TLS hybrid `X25519MLKEM768` (Chrome,
  Firefox, Cloudflare, Apple, OpenSSL 3.5) and the SSH hybrid
  `mlkem768x25519-sha256` (OpenSSH 10.0's default); Kyber-1024 in Signal's
  PQXDH and Apple's PQ3. [Chapter 20](20-Quantum-Computers.md) tells the
  deployment story; [Chapter 19](19-Protocols.md) the protocols.
- **Signatures.** ML-DSA in HSMs, code signing, operating systems and private
  certificate authorities; composite certificates pairing ML-DSA with ECDSA or
  Ed25519 are being standardized. FN-DSA waits for FIPS 206.
- **Standards.** FIPS 203 (ML-KEM), FIPS 204 (ML-DSA), FIPS 206 to come
  (FN-DSA). Status and NIST IR 8547 dates in the [algorithm table](../index.md).
- **Use a vetted library.** Constant-time code, masked hardware where attackers
  have physical access, and hybrids while confidence builds.
- **Beyond KEMs and signatures.** Lattices also give fully homomorphic
  encryption ([Chapter 23](23-Advanced-Protocols.md)), because LWE noise can be
  added and multiplied as long as it stays small.

## 21.14 Going deeper

*Level: expert.*

??? abstract "Worst case to average case: what Ajtai and Regev proved"

    For most cryptography, a random instance might be much easier than the hardest one: some numbers are
    easy to factor. Ajtai (1996) showed that finding short vectors in random lattices of a certain form (the
    SIS problem: short nonzero $x$ with $Ax \equiv 0 \pmod q$) is at least as hard as approximating SVP to within a
    polynomial factor in **every** lattice of a related dimension. Regev (2005) proved the same for LWE, through
    a quantum reduction: an algorithm for random LWE would give a quantum algorithm for worst-case
    approximate SVP and related problems (Peikert gave a classical reduction for some parameters in 2009).
    Caveats: the approximation factors in the proofs are polynomial, while cryptographic parameters are
    set from concrete attacks, not from the reductions; and the ring and module versions reduce only from
    ideal and module lattices, which have extra structure.

??? abstract "Search, decision, and why the public key looks random"

    **Search LWE** asks for $s$; **decision LWE** asks only to tell $(A, As + e)$ from uniform $(A, b)$. For prime $q$
    of polynomial size they are equivalent: guess one coordinate of $s$ at a time and use a decision oracle to
    check each guess. Encryption proofs need the decision version: if $(A, b)$ is indistinguishable from uniform,
    replace it by uniform in the proof, and then the ciphertext is a leftover-hash or a fresh LWE sample that
    hides the message. Secrets can be taken from the error distribution instead of uniform mod $q$ without
    losing security (Applebaum, Cash, Peikert and Sahai, 2009), which is why ML-KEM's $\mathbf{s}$ is small.

??? abstract "The number-theoretic transform in ML-KEM"

    Over $\mathbb{Z}_{3329}$, $x^{256} + 1$ factors into 128 quadratics $x^2 - \zeta^{2\,\mathrm{br}(i) + 1}$, where $\zeta = 17$ is a primitive
    256th root of unity and $\mathrm{br}$ reverses 7-bit numbers. (There is no 512th root of unity mod 3329, so
    the factorization stops at degree 2.) The NTT maps a polynomial to its 128 residues, computed by a
    Cooley-Tukey butterfly network in $7 \cdot 128$ multiplications; a product becomes 128 multiplications of
    degree-1 polynomials. ML-KEM generates $\mathbf{A}$ directly in the NTT domain, so it never transforms it. ML-DSA's
    $q = 8{,}380{,}417$ has a 512th root of unity (1753), so its ring splits all the way into linear factors.

??? abstract "Fujisaki-Okamoto with implicit rejection"

    FIPS 203's ML-KEM.Decaps computes $m' = \mathrm{Dec}(c)$, $(K', r') = G(m' \,\Vert\, H(\mathit{ek}))$, $\bar K = J(z \,\Vert\, c)$ and
    $c' = \mathrm{Enc}(\mathit{ek}, m'; r')$, and returns $K'$ if $c = c'$ and $\bar K$ otherwise. In the random-oracle model this turns an
    IND-CPA scheme with negligible decryption-failure probability into an IND-CCA2 KEM; proofs in the quantum
    random-oracle model exist with somewhat looser bounds (Hofheinz, Hövelmanns and Kiltz, 2017, and later
    work). Hashing $H(\mathit{ek})$ in prevents multi-target attacks across many public keys. The comparison $c = c'$
    must be constant-time, and so must the choice between $K'$ and $\bar K$, or the rejection is no longer implicit.

??? abstract "Why ML-DSA publishes only the high bits of t"

    ML-DSA splits $\mathbf{t} = \mathbf{t}_1 2^d + \mathbf{t}_0$ with $d = 13$ and publishes only $\mathbf{t}_1$, cutting the public key nearly in half. The
    verifier then computes $\mathbf{A}\mathbf{z} - c\,\mathbf{t}_1 2^d$, which differs from $\mathbf{w}$ by $c\,\mathbf{s}_2 - c\,\mathbf{t}_0$, sometimes enough to change a high
    bit. The signer, who knows $\mathbf{t}_0$, includes a short **hint** vector $\mathbf{h}$ that marks the coefficients where a
    carry happens, and `UseHint` fixes them. The second rejection condition (on the low bits of $\mathbf{w} - c\,\mathbf{s}_2$)
    makes sure the hint is valid and leaks nothing. Forgery reduces to module SIS, and also to the
    "SelfTargetMSIS" problem that arises from Fiat-Shamir in the quantum random-oracle model.

## Check yourself

??? question "1. Are (2, 0), (0, 3) and (2, 3), (2, 6) bases of the same lattice?"

    Compare determinants: $2 \cdot 3 - 0 = 6$ and $2 \cdot 6 - 3 \cdot 2 = 6$. Same area. And $(2, 3) = 1 \cdot (2, 0) + 1 \cdot (0, 3)$,
    $(2, 6) = 1 \cdot (2, 0) + 2 \cdot (0, 3)$, with an integer change of basis of determinant 1. So yes.

??? question "2. Reduce the basis (5, 8), (7, 11) with the Lagrange-Gauss method."

    $(7, 11) - 1 \cdot (5, 8) = (2, 3)$. Swap: now reduce $(5, 8)$ by $(2, 3)$: $\mathrm{round}(34/13) = 3$, giving $(5, 8) - 3 \cdot (2, 3) = (-1, -1)$.
    Swap again: reduce $(2, 3)$ by $(-1, -1)$: $\mathrm{round}(-5/2) = -2$ (Python rounds half to even), giving $(0, 1)$.
    Then $(-1, -1)$ reduced by $(0, 1)$: round$(-1) = -1$, giving $(-1, 0)$, the same length, so stop. The lattice is all of
    $\mathbb{Z}^2$ (determinant $5 \cdot 11 - 8 \cdot 7 = -1$), with basis $(0, 1)$, $(-1, 0)$.

??? question "3. In the q = 23 LWE example, check sample 4 by hand."

    $\langle (18, 11), (3, 15) \rangle = 54 + 165 = 219 = 9 \cdot 23 + 12$, so 12; plus the error 1 gives $b_4 = 13$.

??? question "4. In the single-number encryption of section 21.6, encrypt the bit 0 with the same r, e1, e2. What does Bob get?"

    $u = 372$ as before, $v = 7407 + 1 \equiv 750 \pmod{3329}$, and $w = 750 - 2 \cdot 372 = 6$. That is near 0, so the bit is 0.
    The noise is 6 in both cases: it doesn't depend on the bit.

??? question "5. Multiply x^3 by x^2 in Z_17[x]/(x^4 + 1)."

    $x^5 = x \cdot x^4 = -x$, which is $16x$ mod 17.

??? question "6. Check the ML-KEM-1024 sizes: k = 4, 11 bits for u, 5 for v."

    Public key: $4 \cdot 256 \cdot 12/8 + 32 = 1{,}536 + 32 = 1{,}568$ bytes. Ciphertext: $4 \cdot 256 \cdot 11/8 + 256 \cdot 5/8 = 1{,}408 + 160 = 1{,}568$ bytes.

??? question "7. In the toy ML-DSA of section 21.9, what goes wrong if the signer uses the same mask y for two messages that get challenges c = 1 and c = 2?"

    $z = 20 + 1 \cdot 2 = 22$ and $z' = 20 + 2 \cdot 2 = 24$, so $z' - z = (c' - c)\, s_1$ gives $s_1 = 2$ at once. The same mistake
    that breaks Schnorr and ECDSA with a reused nonce. ML-DSA derives $\mathbf{y}$ from the message and randomness so
    it never repeats.

??? question "8. Why can't the toy Regev scheme use errors up to plus or minus 5 with q = 97 and 20 rows?"

    The decryption noise is a sum of up to 20 errors, so it can reach 100, far more than $q/4 \approx 24$. Decryption would
    often return the wrong bit. Larger errors need a larger $q$ or fewer rows in the sum: the trade-off every lattice scheme
    tunes.

??? question "9. Why does nudging a ciphertext coefficient by 1 still decrypt to the same message, and why is that dangerous without the FO transform?"

    The noise budget is about 832 and the real noise is a few hundred at most, so a change of 1 doesn't cross the line.
    An attacker can nudge by larger and larger amounts and watch where decryption starts to fail; the point where it
    fails reveals the size of the noise in that coefficient, which depends on the secret. With FO, any change is
    rejected and answered with a pseudorandom key, so there is nothing to watch.

??? question "10. ML-KEM-512's core-SVP estimate is about 2^118. Why does NIST still put it in category 1?"

    Core-SVP counts only the operations of one sieve call and ignores memory and the cost of each operation. A
    sieve in dimension around 400 needs about $2^{80}$ or more stored vectors and many gates per operation; counting
    those, NIST and the designers estimated the attack at more than AES-128 key search. Critics argued the
    accounting; the margin is thinner than for the larger sets, which is why many choose ML-KEM-768.

## What you learned

- A **lattice** is all whole-number combinations of a basis. A short,
  nearly orthogonal basis makes closest-vector problems easy; a long, skewed
  one makes them hard. That is the trapdoor.
- **Learning with errors** is linear algebra made hard by small noise. Without
  noise, elimination solves it; with noise, it is a closest-vector problem in
  hundreds of dimensions.
- **Rings and modules** replace matrices with polynomials in
  $\mathbb{Z}_q[x]/(x^{256} + 1)$, cutting key sizes by 256 and allowing the fast NTT.
- **ML-KEM** is module-LWE encryption, plus a seed for the matrix,
  compression, and the Fujisaki-Okamoto transform for CCA security.
- **ML-DSA** is Schnorr-style Fiat-Shamir with **rejection sampling** so
  signatures don't leak the key; **FN-DSA** is hash-and-sign over NTRU lattices,
  smaller but hard to implement.
- Parameters come from the cost of BKZ with lattice sieving; the code (KyberSlash,
  side channels) has failed more often than the mathematics.

**Next:** [Chapter 22](22-Hash-and-Code-Based.md) builds post-quantum schemes on
two other foundations, hash functions and error-correcting codes, and tells how
two newer families were broken.

## Further reading

- Oded Regev, "On Lattices, Learning with Errors, Random Linear Codes, and
  Cryptography", STOC 2005; *Journal of the ACM* 56 (2009).
- Chris Peikert, "A Decade of Lattice Cryptography", *Foundations and Trends in
  Theoretical Computer Science* 10 (2016): the standard survey.
- Daniele Micciancio and Shafi Goldwasser, *Complexity of Lattice Problems: A
  Cryptographic Perspective* (Kluwer, 2002).
- Jeffrey Hoffstein, Jill Pipher and Joseph H. Silverman, *An Introduction to
  Mathematical Cryptography* (Springer, 2nd edition 2014): chapter 7 covers
  lattices, NTRU, GGH and LLL with worked examples.
- Joppe Bos et al., "CRYSTALS-Kyber: A CCA-Secure Module-Lattice-Based KEM"
  (EuroS&P 2018); Léo Ducas et al., "CRYSTALS-Dilithium: A Lattice-Based
  Digital Signature Scheme" (TCHES 2018); the
  [Falcon specification](https://falcon-sign.info/).
- FIPS 203 and FIPS 204 (August 2024).
- Martin Albrecht, Rachel Player and Sam Scott, "On the Concrete Hardness of
  Learning with Errors", *Journal of Mathematical Cryptology* 9 (2015).
- The reference pages: [ML-KEM](../01-key-exchange/ML-KEM.md),
  [ML-DSA](../02-signatures/ML-DSA.md), [FN-DSA](../02-signatures/FN-DSA.md),
  [NTRU Prime](../01-key-exchange/NTRU-Prime.md),
  and [Hard problems](../10-math-foundations/Hard-Problems.md).
