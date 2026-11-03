# Lattices and Learning With Errors

*The math behind ML-KEM, ML-DSA, FN-DSA and fully homomorphic encryption: what
a lattice is, why short vectors are hard to find, and a working toy version of
Regev's LWE encryption in 30 lines.*

You need [Groups and fields](Groups-and-Fields.md) and some comfort with vectors
and matrices.

## What a lattice is

Take $n$ independent vectors $b_1, \ldots, b_n$ in $n$-dimensional space. The
**lattice** they generate is every **whole-number** combination of them:

$$
\mathcal{L} = \{\, x_1 b_1 + \cdots + x_n b_n \;:\; x_i \in \mathbb{Z} \,\}.
$$

In two dimensions it's a grid of points, perhaps slanted. The vectors $b_i$ are
a **basis**. The same lattice has many bases: $(1, 0), (0, 1)$ and
$(1, 0), (5, 1)$ give exactly the same grid of integer points. A **good** basis
has short vectors that are nearly at right angles; a **bad** basis has long,
nearly parallel ones.

## The hard problems

- **Shortest vector problem (SVP):** find the shortest nonzero vector in the
  lattice.
- **Closest vector problem (CVP):** given a point not on the lattice, find the
  lattice point nearest to it.

With a good basis both are easy, at least approximately: round off. With a bad
basis in hundreds of dimensions, every known method, classical or quantum,
takes time exponential in the dimension. That asymmetry is the trapdoor: the
private key is a good basis, the public key a bad one for the same lattice.

## Reduction: turning a bad basis into a good one

In two dimensions it's easy, and the method goes back to Lagrange (1773) and
Gauss (1801), who used it on quadratic forms. Repeatedly subtract the right
multiple of the shorter vector from the longer one:

```python
def reduce2(u, v):                         # Lagrange-Gauss reduction of a 2-D lattice basis
    dot = lambda a, b: a[0] * b[0] + a[1] * b[1]
    if dot(u, u) > dot(v, v):
        u, v = v, u
    while True:
        k = round(dot(u, v) / dot(u, u))
        v = (v[0] - k * u[0], v[1] - k * u[1])
        if dot(v, v) >= dot(u, u):
            return u, v
        u, v = v, u

print(reduce2((201, 37), (1648, 297)))     # ((1, 32), (40, 1)): same lattice, short vectors
```

In 1982 Arjen Lenstra, Hendrik Lenstra and László Lovász gave **LLL**, which does
this in any dimension in polynomial time, but only finds vectors within a factor
of about $2^{n/2}$ of the shortest. Schnorr and Euchner's **BKZ** (1994) trades
time for quality. In the hundreds of dimensions ML-KEM uses, the best BKZ
variants still cost at least as much as a brute-force search for an AES-128 key,
even for the smallest parameter set.

**An early casualty.** The Merkle-Hellman knapsack cryptosystem (1978) was one of
the first public-key schemes. Adi Shamir broke it in 1982, and LLL then broke
almost every knapsack variant. Lattice reduction was an attacker's tool long
before it was a designer's.

## From worst case to average case

In 1996 Miklós Ajtai proved something unusual: solving *random* instances of a
certain lattice problem is as hard as solving the *hardest* instances of an
approximate SVP. For factoring and discrete logs nothing like that is known;
some numbers are much easier to factor than others. Lattices offered the first
cryptography with a worst-case guarantee.

## Learning With Errors

**The story.** Oded Regev defined LWE in 2005 and proved that it is as hard as
worst-case lattice problems, even for quantum computers. He won the Gödel Prize
for it in 2018. Lyubashevsky, Peikert and Regev made a faster **ring** version
in 2010, and Langlois and Stehlé the **module** version (2015) that ML-KEM and
ML-DSA use.

**The problem.** Pick a secret vector $s \in \mathbb{Z}_q^n$. You are given many
random vectors $a_i$ and the numbers

$$
b_i = \langle a_i, s \rangle + e_i \bmod q ,
$$

where each $e_i$ is a small random error, say $-1$, $0$ or $1$. Find $s$.

Without the errors this is a system of linear equations, solved by Gaussian
elimination in seconds. The small errors make it, as far as anyone knows,
exponentially hard: they turn it into a closest-vector problem in a lattice.

## A toy LWE encryption (Regev 2005)

Public key: a random matrix $A$ and $b = A s + e$. To encrypt a bit, add up a
random subset of the rows; for a 1, add $\lfloor q/2 \rfloor$ to the last
number. To decrypt, subtract $\langle u, s \rangle$. What's left is the bit times
$q/2$ plus a sum of small errors, so it's either near 0 or near $q/2$.

```python
import random

n, q, m = 10, 97, 20                       # toy sizes; ML-KEM uses n = 256 per polynomial, q = 3329

def keygen():
    s = [random.randrange(q) for _ in range(n)]
    A = [[random.randrange(q) for _ in range(n)] for _ in range(m)]
    b = [(sum(a * x for a, x in zip(row, s)) + random.choice([-1, 0, 1])) % q for row in A]
    return s, (A, b)                       # private s; public A and b = A s + e

def enc(pub, bit):
    A, b = pub
    S = [i for i in range(m) if random.random() < 0.5]   # a random subset of the rows
    u = [sum(A[i][j] for i in S) % q for j in range(n)]
    v = (sum(b[i] for i in S) + bit * (q // 2)) % q
    return u, v

def dec(s, c):
    u, v = c
    d = (v - sum(a * x for a, x in zip(u, s))) % q       # = bit * q/2 + small error
    return 1 if q // 4 < d < 3 * q // 4 else 0

s, pub = keygen()
bits = [random.randrange(2) for _ in range(1000)]
print(all(dec(s, enc(pub, x)) == x for x in bits))     # True
```

**Why it decrypts.** $v - \langle u, s \rangle = \sum_{i \in S} e_i + \text{bit} \cdot \lfloor q/2 \rfloor$.
The error sum has at most 20 terms of size 1, so it's at most 20 in size, less
than $q/4 \approx 24$. It never pushes the value across the line.

**Why it's secure.** Regev showed that $(A, b)$ looks random to anyone who can't
solve LWE, and then $(u, v)$ is a random subset sum of random-looking rows, which
also looks random. These toy sizes are of course breakable at once.

## From toy to ML-KEM

Regev's scheme is slow and its keys are large: an $m \times n$ matrix for every
key. The real schemes make three changes:

1. **Structure.** Replace numbers with polynomials in
   $R_q = \mathbb{Z}_q[x]/(x^{256} + 1)$ and the matrix with a small $k \times k$
   matrix of them ($k = 2, 3, 4$ for ML-KEM-512, 768, 1024). That is **Module-LWE**.
   One polynomial stands for a $256 \times 256$ block, so keys shrink by about
   256 times.
2. **Speed.** With $q = 3329$, polynomial multiplication can use the **number
   theoretic transform**, a fast Fourier transform mod $q$, so a multiply costs
   about $n \log n$ instead of $n^2$.
3. **CCA security.** The basic scheme is only IND-CPA. The **Fujisaki-Okamoto
   transform** (1999) re-encrypts during decapsulation and rejects anything that
   doesn't match, giving IND-CCA2 (see
   [Security definitions](Security-Definitions.md)).

The same ideas give signatures: [ML-DSA](../02-signatures/ML-DSA.md) proves
knowledge of a short secret without revealing it ("Fiat-Shamir with aborts"),
and [FN-DSA](../02-signatures/FN-DSA.md) uses a good basis of an NTRU lattice as
the trapdoor to sample short vectors. Gentry's 2009 fully
[homomorphic encryption](../11-advanced/Homomorphic-Encryption.md) is built on
lattices too, because the errors can be added and multiplied as long as they
stay small.

## How sizes are chosen

The "lattice estimator" (Albrecht, Player and Scott, 2015, now maintained as an
open project) works out the cost of every known attack for given $n$, $q$ and
error size. Designers pick parameters so that the best attack costs at least as
much as breaking AES-128, AES-192 or AES-256. Because estimates keep improving
slowly, NIST asked for margins, and that ongoing argument is part of why
[NTRU Prime](../01-key-exchange/NTRU-Prime.md) exists.

## Try it

??? question "1. In the toy scheme, what goes wrong if the errors are up to ±5 instead of ±1?"

    The error sum can reach 100, far more than $q/4$, so decryption often gives the
    wrong bit. Bigger errors need a bigger $q$, which is the trade-off every lattice
    scheme tunes.

??? question "2. Why can't you just solve $b = A s + e$ by Gaussian elimination?"

    Elimination combines equations, and each combination adds up their errors.
    After a few steps the accumulated error is as large as $q$ and the result is
    noise.

??? question "3. Does Shor's algorithm break LWE?"

    No. Shor finds hidden periods in groups like $\mathbb{Z}_n^*$; LWE has no such period
    that anyone knows how to use. The best quantum attacks on lattices are only a
    little faster than classical ones.
