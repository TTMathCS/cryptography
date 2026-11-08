# 6. Lattice Reduction and the Estimator

*Every number in a lattice standard, the dimension 768, the modulus 3329, the noise of size
2, comes out of one question: how much does the best attack cost? This chapter is about
those attacks. You will run LLL and watch it recover the secret of a small LWE instance in
seconds, measure the quality of a reduced basis with the root Hermite factor, see how BKZ
trades time for quality block by block, compare enumeration with sieving, and follow the
primal, dual and hybrid attacks into the lattice estimator that produced ML-KEM's security
claims. At the end you will know what those claims mean, where their uncertainty lies, and
why experts argued about them in public.*

!!! abstract "In this chapter"
    **You will learn:**

    - how LLL works and what it guarantees, with a short implementation;
    - how to break small LWE instances with LLL by embedding the secret as a short vector;
    - the root Hermite factor and the geometric series assumption, the two numbers that
      describe what reduction achieves;
    - how BKZ works and how its block size sets both quality and cost;
    - the costs of enumeration and sieving, and why sieving now sets the estimates;
    - the primal, dual and hybrid attacks, and what the lattice estimator does with them;
    - the open debates: memory costs, the dual attack, and the 2024 quantum claim.

    **You need:** [Chapter 5](05-Lattices-and-Their-Hard-Problems.md) and
    [Chapter 2](02-Security-Levels.md), §2.5.
    Chapter 14 of the mathematics book proves LLL's
    guarantees.

    **Levels:** §6.1 to §6.3 are for beginners, §6.4 to §6.10 are intermediate, §6.11 is
    expert.

## 6.1 The problem

*Level: beginner.*

Suppose you are designing a lattice KEM. You can choose the dimension, the modulus and the
noise. A larger dimension makes attacks harder and keys bigger. A smaller modulus makes keys
smaller and decryption failures likelier. More noise makes attacks harder and failures
likelier still. Every choice trades security for size or reliability, and to choose you must
know, in bits, what each setting costs an attacker.

For RSA that question has a settled answer, the number field sieve, refined over thirty
years and calibrated by record factorizations. For lattices the answer is younger and has
more moving parts: a reduction algorithm (BKZ) with a tunable block size, two very
different ways (enumeration and sieving) to solve the small problems inside it, several
ways (primal, dual, hybrid) to turn an LWE instance into a lattice problem, and cost models
that disagree about memory. The designers of Kyber, Dilithium and the other lattice
submissions, and their critics, spent years assembling these parts into estimates.

This chapter assembles them again, from the bottom: first LLL, which you can run; then BKZ,
which you can simulate; then the attacks; then the estimator. The goal is not to reproduce
every refinement, but to be able to read a security estimate and know which assumptions it
rests on.

## 6.2 LLL

*Level: beginner.*

The Lenstra-Lenstra-Lovász algorithm (1982) generalizes the two-dimensional reduction of
Chapter 5 to any dimension. It works with the **Gram-Schmidt** vectors $b_1^*, \dots, b_n^*$
of the basis: $b_i^*$ is the part of $b_i$ perpendicular to all earlier basis vectors, and
$\mu_{i,j} = \langle b_i, b_j^*\rangle / \langle b_j^*, b_j^*\rangle$ measures how much of
$b_j^*$ is in $b_i$. It repeats two operations until neither applies:

1. **Size reduction.** Subtract integer multiples of earlier vectors from $b_k$ so that every
   $|\mu_{k,j}| \le 1/2$. This is the "nearest integer multiple" step of Gauss's algorithm.
2. **Swap.** If the **Lovász condition**
   $\|b_k^*\|^2 \ge (\delta - \mu_{k,k-1}^2)\,\|b_{k-1}^*\|^2$ fails (with $\delta$ usually
   $0.99$), swap $b_k$ and $b_{k-1}$ and step back.

The Lovász condition says, roughly, that the Gram-Schmidt lengths do not fall too fast from
one vector to the next. When it holds everywhere, the basis is **LLL-reduced**, and the
first vector satisfies

$$\|b_1\| \le \left(\tfrac{4}{4\delta - 1}\right)^{(n-1)/2} \lambda_1(\mathcal{L}),$$

an approximation factor exponential in $n$. LLL runs in polynomial time. In practice it does
much better than the guarantee, a fact that Nguyen and Stehlé measured in 2006 and that §6.4
makes precise.

**Code it.** The implementation below keeps the Gram-Schmidt data in floating point and
recomputes only the rows a swap disturbs. It is far slower than the libraries (fplll, used by
the experts, is written in C++ with careful numerics), but it reduces lattices of a few dozen
dimensions in seconds.

```python
def lll(B, delta=0.99):
    """LLL reduction of integer row vectors, floating-point Gram-Schmidt (fine for small examples)."""
    B = [list(b) for b in B]
    n = len(B)
    def dot(u, v):
        return sum(x * y for x, y in zip(u, v))
    Bs, mu, norms = [], [[0.0] * n for _ in range(n)], []
    def update(i):                       # recompute Gram-Schmidt for row i from rows before it
        v = [float(x) for x in B[i]]
        for j in range(i):
            mu[i][j] = dot(B[i], Bs[j]) / norms[j]
            v = [a - mu[i][j] * b for a, b in zip(v, Bs[j])]
        if i < len(Bs):
            Bs[i], norms[i] = v, dot(v, v)
        else:
            Bs.append(v); norms.append(dot(v, v))
    for i in range(n):
        update(i)
    k = 1
    while k < n:
        for j in range(k - 1, -1, -1):               # size reduction
            r = round(mu[k][j])
            if r:
                B[k] = [a - r * b for a, b in zip(B[k], B[j])]
                for l in range(j + 1):
                    mu[k][l] -= r * (mu[j][l] if l < j else 1.0)
        if norms[k] >= (delta - mu[k][k - 1] ** 2) * norms[k - 1]:
            k += 1                                   # Lovasz condition holds
        else:
            B[k], B[k - 1] = B[k - 1], B[k]          # swap and recompute the affected rows
            for i in range(k - 1, n):
                update(i)
            k = max(k - 1, 1)
    return B
```

The listing defines `lll` and prints nothing. The next two listings use it.

## 6.3 Break it: LWE falls to LLL in small dimensions

*Level: beginner.*

Chapter 5 showed that an LWE secret is a planted short vector. Here is the attack in full.
Take $b = As + e \pmod q$ with $A$ of size $m \times n$. Build the lattice generated by the rows

$$\begin{pmatrix} I_n & A^T & 0 \\ 0 & qI_m & 0 \\ 0 & -b^T & 1 \end{pmatrix}.$$

Taking $s$ times the first block of rows, adding the right multiples of $q$, and adding the
last row once gives the lattice vector $(s, As - b \bmod q, 1) = (s, -e, 1)$, whose
coordinates are all in $\{-1, 0, 1\}$. That vector is far shorter than the Gaussian
heuristic predicts for this lattice, so it is the shortest vector, and LLL, in small
dimensions, finds it. This construction is called **Kannan's embedding**, after Ravi Kannan's
1987 work on the closest vector problem; the attack is the **primal attack**.

```python
# Uses lll() from the listing above.
import random


def lwe(n, m, q, seed):
    rnd = random.Random(seed)
    s = [rnd.choice((-1, 0, 1)) for _ in range(n)]
    A = [[rnd.randrange(q) for _ in range(n)] for _ in range(m)]
    e = [rnd.choice((-1, 0, 1)) for _ in range(m)]
    b = [(sum(a * x for a, x in zip(row, s)) + ei) % q for row, ei in zip(A, e)]
    return A, b, s, e

def primal_basis(A, b, q):
    """Rows generate {(x, A x - b t + q k, t)}; the vector (s, -e, 1) lies in this lattice."""
    m, n = len(A), len(A[0])
    rows = [[1 if j == i else 0 for j in range(n)] + [A[r][i] for r in range(m)] + [0]
            for i in range(n)]
    rows += [[0] * n + [q if j == r else 0 for j in range(m)] + [0] for r in range(m)]
    rows.append([0] * n + [-x for x in b] + [1])
    return rows

q = 97
for n, m in [(6, 12), (9, 18), (12, 24)]:
    A, b, s, e = lwe(n, m, q, seed=n)
    R = lll(primal_basis(A, b, q))
    want = s + [-x for x in e] + [1]
    found = any(r == want or r == [-x for x in want] for r in R)
    print("n=%2d m=%2d lattice dimension %2d: secret found by LLL: %s" % (n, m, n + m + 1, found))
```

Running it prints:

```
n= 6 m=12 lattice dimension 19: secret found by LLL: True
n= 9 m=18 lattice dimension 28: secret found by LLL: True
n=12 m=24 lattice dimension 37: secret found by LLL: True
```

Three instances, three secrets, in about ten seconds of pure Python. The same attack, with
the same code, does nothing useful at ML-KEM's sizes: there the lattice has dimension around
1,000, LLL's output is far too long, and a much stronger reduction is needed. How much
stronger is the subject of the rest of the chapter.

## 6.4 Measuring reduction: the root Hermite factor

*Level: intermediate.*

To compare reduction algorithms, cryptographers use one number. For a reduced basis of an
$n$-dimensional lattice whose first vector is $b_1$, the **root Hermite factor** is

$$\delta = \left(\frac{\|b_1\|}{(\det \mathcal{L})^{1/n}}\right)^{1/n}.$$

It measures how short $b_1$ is relative to the lattice's natural scale, per dimension. A
smaller $\delta$ means a better basis. Gama and Nguyen's experiments (2008) found that in
practice LLL reaches $\delta \approx 1.0219$ in high dimensions, regardless of the lattice,
and that BKZ with block size 20 reaches about 1.0128. Reaching $\delta = 1.005$ in a few
hundred dimensions is out of reach of any public computation; ML-KEM needs an attacker to
reach about 1.004.

**Code it.** On random q-ary lattices in small dimensions, LLL does better than its
asymptotic value, because in small dimensions it often finds a nearly shortest vector.

```python
# Uses lll() from the listing above.
import random
from math import log, exp, sqrt

def qary_basis(n, m, q, seed):
    """A basis of the q-ary lattice {y : y = A x mod q} of dimension m, in upper form."""
    rnd = random.Random(seed)
    rows = [[1 if j == i else 0 for j in range(n)] + [rnd.randrange(q) for _ in range(m - n)]
            for i in range(n)]
    rows += [[0] * n + [q if j == i else 0 for j in range(m - n)] for i in range(m - n)]
    return rows

q = 3329
for m in (20, 28, 36):
    B = lll(qary_basis(m // 2, m, q, seed=m))
    b1 = min(sqrt(sum(x * x for x in r)) for r in B)
    log_det = (m - m // 2) * log(q)
    delta = exp((log(b1) - log_det / m) / m)
    print("dimension %d: shortest vector found %.1f, root Hermite factor %.4f" % (m, b1, delta))
```

Running it prints:

```
dimension 20: shortest vector found 72.8, root Hermite factor 1.0117
dimension 28: shortest vector found 77.5, root Hermite factor 1.0106
dimension 36: shortest vector found 95.1, root Hermite factor 1.0140
```

**The geometric series assumption.** Schnorr observed in 2003 that after good reduction the
Gram-Schmidt lengths decrease roughly geometrically: $\log \|b_i^*\|$ falls along a straight
line, with slope set by $\delta$. This **GSA** lets one predict the whole shape of a reduced
basis from one number, and it is what makes the success condition of the primal attack
(Chapter 2, §2.5) computable: the attack succeeds when the projected secret is shorter than
the predicted $\|b^*_{d-\beta+1}\|$. Figure 6.1 shows a basis profile before and after
reduction.

<figure class="mars-fig">
<svg viewBox="0 0 640 280" width="640" role="img" aria-label="Logarithm of Gram-Schmidt norms against index: a q-ary basis before reduction is a step from log q to 0; after BKZ it is a straight descending line" fill="currentColor" font-size="13">
<line x1="60" y1="240" x2="610" y2="240" stroke="currentColor"/>
<line x1="60" y1="30" x2="60" y2="240" stroke="currentColor"/>
<text x="335" y="270" text-anchor="middle">index i of the Gram-Schmidt vector</text>
<text x="24" y="135" text-anchor="middle" transform="rotate(-90 24 135)">log ‖bᵢ*‖</text>
<polyline points="60,60 330,60 330,220 610,220" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="6 4"/>
<text x="120" y="52">before: log q</text>
<text x="470" y="212">before: 0</text>
<line x1="60" y1="90" x2="610" y2="190" class="acc" stroke-width="2.6"/>
<text x="400" y="132" class="acc-fill">after BKZ-β: slope set by δ</text>
<circle cx="560" cy="181" r="4" class="acc-fill"/>
<text x="560" y="168" text-anchor="middle" font-size="12">the attack needs the</text>
<text x="560" y="155" text-anchor="middle" font-size="12">tail above the secret</text>
</svg>
<figcaption>Figure 6.1. A q-ary basis starts as a cliff: half the Gram-Schmidt vectors have length $q$ and half length 1. Reduction tilts it into a slope. The better the reduction (the smaller δ), the flatter the line and the longer the last vectors, until the projected secret drops below the tail and is found.</figcaption>
</figure>

## 6.5 BKZ: reduction block by block

*Level: intermediate.*

LLL works on pairs of neighbouring vectors. Claus-Peter Schnorr's **block Korkine-Zolotarev**
algorithm, BKZ (1987, refined with Euchner in 1994), works on blocks of $\beta$ neighbouring
vectors. In each step it takes the projected block $b_k, \dots, b_{k+\beta-1}$ (projected
orthogonally to the earlier vectors), finds a *shortest* vector in it with an exact SVP
solver, inserts that vector into the basis, and runs LLL to clean up. A **tour** does this for
every $k$ from 1 to $n$; BKZ repeats tours until the basis stops improving.

The block size is the dial. BKZ-2 is essentially LLL. BKZ-$n$ is a full SVP solution. In
between, the quality improves and the cost rises: each tour makes about $n$ calls to an SVP
solver in dimension $\beta$, and that solver's cost is exponential in $\beta$. The achieved
root Hermite factor follows, for $\beta$ above about 50, the formula already used in Chapter 2:

$$\delta_\beta \approx \left(\frac{\beta}{2\pi e}(\pi\beta)^{1/\beta}\right)^{1/(2(\beta-1))}.$$

Table 6.1 evaluates it, together with the cost of one SVP call by sieving.

| Block size β | δ | Factor $\delta^{1000}$ in dimension 1,000 | Sieve cost $2^{0.292\beta}$ |
| --- | --- | --- | --- |
| 50 | 1.0121 | $2^{17}$ | $2^{15}$ |
| 100 | 1.0093 | $2^{13}$ | $2^{29}$ |
| 200 | 1.0063 | $2^{9}$ | $2^{58}$ |
| 300 | 1.0048 | $2^{7}$ | $2^{88}$ |
| 400 | 1.0040 | $2^{6}$ | $2^{117}$ |
| 600 | 1.0030 | $2^{4}$ | $2^{175}$ |
| 800 | 1.0024 | $2^{3}$ | $2^{234}$ |

*Table 6.1. What each block size buys and costs.*

Each row halves the remaining gap a little and doubles the cost a lot. Breaking ML-KEM-512
needs a block size around 400 (Chapter 2), and the cost column shows why that is out of
reach. Public BKZ computations with full sieving have reached effective block sizes a little
under 200.

**Improvements.** Chen and Nguyen's **BKZ 2.0** (2011) added early termination, extreme
pruning in the enumeration, and a **simulator** that predicts the basis profile tour by tour
without running the algorithm; such simulators are how attack costs are computed for block
sizes nobody can run. **Progressive BKZ** starts with small blocks and raises $\beta$ gradually,
which costs less overall. Ducas's **dimensions for free** (2018) showed that a sieve in
dimension $\beta - d$ with $d \approx \beta\ln(4/3)/\ln(\beta/2\pi e)$ recovers the shortest vector
of a $\beta$-dimensional block by "lifting" its list of short vectors, saving some 20 to 30
dimensions at cryptographic sizes.

!!! note "Life story: the LLL algorithm"
    **Born:** 1982, Arjen Lenstra, Hendrik Lenstra and László Lovász, "Factoring polynomials
    with rational coefficients" · **Purpose:** to factor polynomials over the rationals in
    polynomial time; lattice reduction was the tool · **Helped:** broke the Merkle-Hellman
    knapsack (Shamir, 1982) and most later knapsacks; powers Coppersmith's attacks on RSA;
    the first step of every lattice attack; a whole book, *The LLL Algorithm* (2010), surveys
    its uses ·
    **Status:** current; used everywhere in computational number theory and cryptanalysis

## 6.6 Inside the block: enumeration and sieving

*Level: intermediate.*

BKZ needs an exact SVP solver for its blocks. Two families of algorithms compete.

**Enumeration** searches a tree. To find all lattice vectors shorter than a radius $R$, it
fixes the last coordinate (in the Gram-Schmidt basis) to each value that keeps the vector
within $R$, then the next-to-last, and so on, pruning any branch whose partial length already
exceeds $R$. It needs only polynomial memory. Its time grows **superexponentially**, like
$2^{\Theta(\beta \log \beta)}$, and good pruning (Gama, Nguyen and Regev's "extreme pruning",
2010) cuts the constant a great deal by accepting a small chance of missing the answer and
repeating with re-randomized bases. Fincke, Pohst and Kannan described the basic algorithms in
the early 1980s; for decades enumeration was the method of choice.

**Sieving** works on a list. It starts with a large list of random lattice vectors, then
repeatedly replaces vectors by shorter differences $v - w$ of pairs that are close to each
other, until the list contains the shortest vectors. Ajtai, Kumar and Sivakumar's 2001 sieve
proved it could be done in $2^{O(n)}$ time; Nguyen and Vidick (2008) and Micciancio and
Voulgaris (2010) made it practical; locality-sensitive filtering (Becker, Ducas, Gama and
Laarhoven, 2016) reached $2^{0.292n + o(n)}$ time with $2^{0.2075n + o(n)}$ memory. The
General Sieve Kernel, G6K (Albrecht, Ducas, Herold, Kirshanova, Postlethwaite and Stevens,
2019), combined sieving with BKZ-style progressive tricks and dimensions for free, and in
2019 to 2021 it overtook enumeration in practice, setting SVP records from dimension about
150 up to about 180 on GPUs.

**The crossover.** In small dimensions enumeration is faster; in large ones sieving wins,
because its exponent is linear in $\beta$. In practice the crossover is somewhere around
dimension 70 to 100, depending on hardware. At the block sizes that matter for cryptography,
400 and above, sieving is far cheaper in time, which is why security estimates are made with
sieving costs. Enumeration's appeal is its tiny memory, and that matters once memory is
costed honestly.

**The memory wall.** A sieve in dimension $\beta$ stores about $2^{0.2075\beta}$ vectors of
$\beta$ coordinates each. The program below turns that into bytes, at two bytes per coordinate.

```python
from math import log2

def sieve_memory_bytes(beta, bytes_per_coordinate=2):
    vectors = 2 ** (0.2075 * beta)            # list size of the best classical sieves
    return vectors * beta * bytes_per_coordinate

def scale(bits):
    if bits <= 50:
        return "a rack of disks (up to a petabyte)"
    if bits <= 60:
        return "a large data center (up to an exabyte)"
    if bits <= 78:
        return "more than any organization owns"
    return "more than all data created on Earth in a year"

for beta in (100, 150, 200, 300, 406, 624):
    bits = log2(sieve_memory_bytes(beta))
    print("beta %3d: about 2^%3.0f bytes, %s" % (beta, bits, scale(bits)))
```

Running it prints:

```
beta 100: about 2^ 28 bytes, a rack of disks (up to a petabyte)
beta 150: about 2^ 39 bytes, a rack of disks (up to a petabyte)
beta 200: about 2^ 50 bytes, a large data center (up to an exabyte)
beta 300: about 2^ 71 bytes, more than any organization owns
beta 406: about 2^ 94 bytes, more than all data created on Earth in a year
beta 624: about 2^140 bytes, more than all data created on Earth in a year
```

At block size 406, the one ML-KEM-512 requires, the list alone would hold about $2^{94}$
bytes. Variants that trade memory for time (tuple sieves, sieving with smaller lists and
more passes) exist and move the numbers, but every known approach either needs storage on a
scale no civilization has, or more time than the gate-count estimates assume. That is the
argument of Chapter 2, §2.7, seen from inside the algorithm.

## 6.7 The primal attack at full size

*Level: intermediate.*

The primal attack of §6.3 scales up in a straightforward way. Use $m$ of the available LWE
samples, embed as before in dimension $d = n + m + 1$, run BKZ with block size $\beta$, and
succeed when the projection of the planted vector onto the last $\beta$ Gram-Schmidt
directions is shorter than the GSA's prediction for $\|b^*_{d-\beta+1}\|$. That is the
condition of Alkim, Ducas, Pöppelmann and Schwabe (2016), checked experimentally by Albrecht,
Göpfert, Virdia and Wunderer (2017) and refined by Dachman-Soled, Ducas, Gong and Rossi
(2020) into a probabilistic version.

**How many samples?** More samples make the lattice larger, which helps up to a point and then
hurts. The attacker picks the best $m$. For ML-KEM-512 the public key provides $n = 512$
samples (the $k \cdot 256$ coefficients of $t$); the program sweeps $m$ and reports the block
size the attack needs.

```python
from math import pi, e, sqrt, log

def delta(beta):
    return ((pi * beta) ** (1 / beta) * beta / (2 * pi * e)) ** (1 / (2 * (beta - 1)))

def beta_for(n, m, q, sigma):
    """Smallest beta meeting the 2016 primal condition with m samples, or None."""
    d = n + m + 1
    for beta in range(50, d):
        if sigma * sqrt(beta) <= delta(beta) ** (2 * beta - d - 1) * q ** (m / d):
            return beta
    return None

n, q, sigma = 512, 3329, sqrt(1.5)          # ML-KEM-512: k = 2, eta1 = 3
print("samples m   block size needed")
for m in (256, 320, 384, 448, 488, 512):
    print("%9d   %s" % (m, beta_for(n, m, q, sigma)))
```

Running it prints:

```
samples m   block size needed
      256   466
      320   434
      384   417
      448   408
      488   406
      512   406
```

The curve flattens near $m \approx n$: the attacker gains nothing from more samples than the
key provides, and ML-KEM never provides more with the same secret. The minimum, $\beta \approx
406$, is the figure behind ML-KEM-512's core-SVP estimate of about $2^{118}$ to $2^{119}$.

**Guessing and the hybrid.** Secrets with small, discrete coefficients invite a **hybrid
attack**, introduced by Nick Howgrave-Graham in 2007 against NTRU: guess some coordinates of the
secret (or meet in the middle on them), and run the lattice attack on the rest, which is now a
smaller lattice. The guesses cost exponentially in the number of guessed coordinates, the
lattice part costs less, and an optimum exists in between. For ML-KEM's binomial secrets the
hybrid gives little; for very sparse or binary secrets, as in some homomorphic encryption
parameters, it can save many bits.

## 6.8 The dual attack

*Level: intermediate.*

The dual attack solves decision LWE. Find many short vectors $w$ with $w^T A \equiv 0 \pmod q$
(short vectors in the lattice $\Lambda_q^\perp(A^T)$). For an LWE sample vector $b = As + e$,

$$\langle w, b\rangle \equiv w^T A s + \langle w, e\rangle \equiv \langle w, e\rangle \pmod q,$$

which is small if $w$ and $e$ are both short; for random $b$ it is uniform. Each short $w$ gives
a weak distinguisher; many together give a strong one. The vectors $w$ are found by BKZ on the
dual lattice, and then by a sieve that outputs many short vectors at once.

Refinements around 2017 to 2022 combined the dual attack with guessing parts of the secret
and with fast Fourier transforms over the guesses. In 2022 MATZOV, the Israel Defense Forces'
cryptology unit, published a report claiming that a refined dual-hybrid attack reduced the
estimated security of Kyber-512, Kyber-768 and Kyber-1024 by several bits below the primal
estimates, enough that Kyber-512 might sit slightly below category 1 in some cost models.
In 2023 Léo Ducas and Ludo Pulles showed that these analyses rested on a heuristic, that the
distinguisher's scores for different guesses behave independently, which fails in exactly the
regime the attacks used: the predicted gains could not be confirmed and may not exist.
Later work explored corrected versions. As of November 2026 the community's position, as far
as published work shows, is that the primal attack remains the reference and that dual-attack
claims need experimental support before they lower estimates. Both are reported by the
estimator.

## 6.9 The lattice estimator

*Level: intermediate.*

In 2015 Martin Albrecht, Rachel Player and Sam Scott published "On the concrete hardness of
Learning with Errors" together with a program, the LWE estimator, that encoded every known
attack and its cost under several models. It became the shared instrument of the field. Its
successor, the **lattice estimator**, is an open-source SageMath library maintained on GitHub
by a group of contributors and used by nearly every lattice submission to the NIST process.
Given an LWE instance, it runs the primal, dual, hybrid, Arora-Ge and other attacks with the
chosen cost model for BKZ and reports the cheapest.

It cannot run in plain Python (it needs SageMath), so this book shows its use as text. A
typical session for ML-KEM-512 looks like this:

```text
sage: from estimator import *
sage: params = schemes.Kyber512
sage: LWE.estimate.rough(params)
usvp                 :: rop: ≈2^118.6, red: ≈2^118.6, δ: 1.003941, β: 406, d: 998, tag: usvp
dual_hybrid          :: rop: ≈2^121.4, ...
```

The `rough` mode uses core-SVP; the full `estimate` uses more detailed cost models and gives
higher numbers. The exact output depends on the estimator's version, because its models are
updated as research moves. The lines above illustrate the format and the published order of
magnitude; they are not a run made for this book.

**How ML-KEM's claims were built.** The Kyber team's documentation for the third round
combined: core-SVP figures (about 118, 182 and 256 bits classically for the three sets); a
gate-count model for sieving, including the many BKZ calls and the cost of the sieve's inner
loop; and a discussion of memory costs. Their conclusion, accepted by NIST, was that
ML-KEM-512 meets category 1 under realistic memory costs, with some uncertainty in the pure
gate model, and that ML-KEM-768 and ML-KEM-1024 meet categories 3 and 5 with margin. Chapter 2
told the story of the disagreement about the first claim.

**Using the estimator well.** Three habits make estimates meaningful. State the cost model
(core-SVP, gate count, memory-aware). Report the attack that wins and the block size it
needs, so others can check it against the GSA by hand. And rerun estimates with the current
version before relying on them, since a new attack paper can move the result by a few bits.

## 6.10 In the real world

*Level: intermediate.*

**The 2024 quantum scare.** On 10 April 2024 Yilei Chen of Tsinghua University posted a paper
claiming a polynomial-time quantum algorithm for LWE with certain parameters, through a new
kind of quantum Fourier transform with complex Gaussian windows. If correct, it would not
have broken ML-KEM directly (its parameter range did not cover ML-KEM's), but it would have
shaken the foundation of lattice cryptography. Experts read it closely within days. On 18
April Chen added a note that a bug had been found, by Hongxun Wu and, independently, Thomas
Vidick, in a step of the algorithm, and that he did not know how to fix it. The episode lasted
about a week. It showed how quickly a serious claim is checked, and also how much depends on
the absence of exactly such an algorithm.

**Records as calibration.** The Darmstadt SVP challenge and the newer LWE challenges, the G6K
GPU records, and the published BKZ runs on Kyber-like instances with tiny parameters together
form the experimental base under the estimates. Each extends the range over which models have
been checked. The gap that remains, from block sizes around 180 run in practice to block sizes
above 400 that would be needed, is the reason every estimate carries error bars of several
bits.

**Side information.** Real attacks may know something extra: a few coefficients of the secret
from a side channel, or hints like "this coefficient is small". Dachman-Soled, Ducas, Gong and
Rossi (CRYPTO 2020) built a framework, with its own estimator ("leaky-LWE"), that folds such
hints into the lattice and recomputes the block size. It turns, for example, a power-analysis
leak of a few bits per coefficient into an exact count of how much security remains, and is
the standard tool for evaluating side-channel attacks on ML-KEM (Chapter 17).

## 6.11 Going deeper

*Level: expert.*

**Why the GSA bends.** The geometric series assumption fails at the ends of the basis. At the
head, BKZ's first vectors are slightly shorter than predicted ("head concavity"); at the tail,
the last $\beta$ vectors are HKZ-reduced and follow the profile of a random $\beta$-dimensional
lattice instead of the straight line. The Chen-Nguyen simulator models both and is used by the
estimator; for the primal attack the difference matters by a few block sizes.

**Probabilistic success.** The 2016 condition treats the projected secret's length as fixed at
its expectation $\sigma\sqrt\beta$; in reality it varies, and the attack can succeed early with
some probability. Dachman-Soled and others (2020) and Postlethwaite and Virdia (2021) computed
the success probability as a function of $\beta$ through progressive BKZ, giving slightly lower
expected costs and a sharper picture of how the attack behaves near the threshold.

**Quantum sieving.** Laarhoven's $2^{0.265\beta}$ quantum sieve uses Grover's search to find
close pairs and assumes quantum random access memory over the whole list. With the list size
$2^{0.2075\beta}$, that is a quantum memory of astronomical size, accessible in superposition at
unit cost. Albrecht, Gheorghiu, Postlethwaite and Schanck (2020) costed quantum sieves with
realistic overheads and found the speed-up at cryptographic dimensions to be modest; later work
by Chailloux and Loyer (2021) and others refined the asymptotic exponents. Combined with
MAXDEPTH, these analyses explain why the lattice standards' quantum security levels follow their
classical ones closely.

**Beyond BKZ.** Self-dual BKZ, slide reduction (Gama and Nguyen, 2008), and "Pump and Jump"
strategies in G6K are alternatives with better theoretical guarantees or practical constants.
None has changed the asymptotic picture: for a target root Hermite factor $\delta$, the cost is
$2^{\Theta(1/\log\delta)}$ up to lower-order terms, the relation all estimators share.

## Check yourself

??? question "1. What do the two steps of LLL do, and what does the Lovász condition prevent?"

    Size reduction subtracts integer multiples of earlier vectors to make every $|\mu_{k,j}| \le
    1/2$; the swap exchanges neighbours when the later one's Gram-Schmidt length is much shorter
    than the earlier one's. The Lovász condition prevents the Gram-Schmidt lengths from falling
    too quickly along the basis, which is what makes the first vector short.

??? question "2. In Kannan's embedding, which lattice vector reveals the LWE secret, and why is it short?"

    $(s, -e, 1)$, obtained from the rows by taking $s$ times the identity block, adding multiples
    of $q$, and adding the target row once. Its entries are the secret's and error's
    coefficients and a 1, all small, so its length is about $\sqrt{n + m}$, far below the Gaussian
    heuristic.

??? question "3. LLL achieves δ ≈ 1.0219 in high dimension. In a lattice of dimension 500 and determinant 1, how long is the vector it finds?"

    $\delta^{500} = 1.0219^{500} \approx e^{500 \times 0.02166} \approx e^{10.8} \approx 50{,}000$.
    Far from the shortest vector, whose length the Gaussian heuristic puts at about
    $\sqrt{500/(2\pi e)} \approx 5.4$.

??? question "4. Why does BKZ's quality improve with the block size, and why does its cost grow exponentially?"

    Each block is reduced optimally by an exact SVP solver, so larger blocks see more of the
    lattice's geometry and produce flatter profiles (smaller δ). The SVP solver's cost is
    exponential in the block dimension (about $2^{0.292\beta}$ for sieving), and BKZ calls it many
    times.

??? question "5. Why do security estimates use sieving costs rather than enumeration costs?"

    At the block sizes that matter (several hundred), sieving's $2^{0.292\beta}$ is far below
    enumeration's superexponential cost. Using the faster algorithm gives the attacker the
    benefit of the doubt. Enumeration's advantage, tiny memory, matters only in models that
    charge heavily for memory.

??? question "6. How much memory, in bytes, would a sieve in dimension 300 need by the formula of §6.6?"

    $2^{0.2075 \times 300} \approx 2^{62}$ vectors, times $300 \times 2$ bytes $\approx 2^{9.2}$, about
    $2^{71}$ bytes: around two zettabytes.

??? question "7. In the sweep of §6.7, why does adding samples beyond m ≈ n not help the attacker?"

    More samples enlarge the lattice and its determinant in a way that eventually stops improving
    the ratio between the planted vector and the reduced basis's tail; the optimum lies near
    $m \approx n$. ML-KEM's key provides about that many samples with one secret and no more.

??? question "8. What heuristic did Ducas and Pulles question in the dual attack analyses?"

    That the distinguisher's scores for different guessed secret parts are independent. In the
    regime used, they are not, so predictions of how many false positives appear, and hence the
    claimed advantage, were unreliable.

??? question "9. What did the April 2024 quantum LWE claim do to ML-KEM's security, in the end?"

    Nothing. A bug was found in the algorithm about a week after posting, and the author withdrew
    the claim of a working algorithm. Even had it worked, its parameter range did not directly
    cover ML-KEM.

??? question "10. A side channel leaks the exact value of 50 of ML-KEM-768's 1,536 secret coefficients. How would you estimate the security left?"

    Feed the hints into the leaky-LWE framework of Dachman-Soled, Ducas, Gong and Rossi: perfect
    hints reduce the lattice dimension (and adjust its volume), after which the usual block-size
    computation gives the remaining cost. Roughly, the attack behaves like one in a lattice about
    50 dimensions smaller.

## What you learned

- LLL reduces any basis in polynomial time with an exponential approximation factor; in small
  dimensions it recovers LWE secrets through Kannan's embedding in seconds.
- The root Hermite factor measures reduction quality; under the geometric series assumption it
  predicts the whole basis profile, which is what attack conditions need.
- BKZ with block size β reaches $\delta_\beta$ at a cost of many SVP calls in dimension β; ML-KEM
  forces β of about 400 to 900.
- Enumeration is superexponential with little memory; sieving is $2^{0.292\beta}$ with
  $2^{0.2075\beta}$ memory and sets today's estimates, which run into a memory wall at
  cryptographic sizes.
- The primal attack is the reference; the dual and hybrid attacks are competitive in some
  regimes, and the 2022 dual-attack claims were shown to rest on a failing heuristic.
- The lattice estimator encodes all known attacks; good practice states the cost model, the
  winning attack and its block size, and reruns with the current version.
- Public scares, like the April 2024 quantum claim, are checked within days; side information
  is folded into estimates with the leaky-LWE framework.

**Next:** [Chapter 7](07-Rings-Modules-and-the-NTT.md), the polynomial rings and the
number-theoretic transform that make ML-KEM small and fast.

## Further reading

- Arjen K. Lenstra, Hendrik W. Lenstra Jr. and László Lovász, "Factoring polynomials with
  rational coefficients", *Mathematische Annalen* 261 (1982).
- Phong Q. Nguyen and Brigitte Vallée, editors, *The LLL Algorithm: Survey and Applications*
  (Springer, 2010).
- Claus-Peter Schnorr and Martin Euchner, "Lattice basis reduction: Improved practical
  algorithms and solving subset sum problems", *Mathematical Programming* 66 (1994).
- Ravi Kannan, "Minkowski's convex body theorem and integer programming", *Mathematics of
  Operations Research* 12 (1987).
- Nicolas Gama and Phong Q. Nguyen, "Predicting Lattice Reduction" (EUROCRYPT 2008).
- Yuanmi Chen and Phong Q. Nguyen, "BKZ 2.0: Better Lattice Security Estimates" (ASIACRYPT 2011).
- Nicolas Gama, Phong Q. Nguyen and Oded Regev, "Lattice Enumeration Using Extreme Pruning"
  (EUROCRYPT 2010).
- Miklós Ajtai, Ravi Kumar and D. Sivakumar, "A sieve algorithm for the shortest lattice vector
  problem" (STOC 2001).
- Martin R. Albrecht, Léo Ducas, Gottfried Herold, Elena Kirshanova, Eamonn W. Postlethwaite
  and Marc Stevens, "The General Sieve Kernel and New Records in Lattice Reduction" (EUROCRYPT
  2019).
- Nick Howgrave-Graham, "A hybrid lattice-reduction and meet-in-the-middle attack against NTRU"
  (CRYPTO 2007).
- Martin R. Albrecht, Florian Göpfert, Fernando Virdia and Thomas Wunderer, "Revisiting the
  Expected Cost of Solving uSVP and Applications to LWE" (ASIACRYPT 2017).
- Dana Dachman-Soled, Léo Ducas, Huijing Gong and Mélissa Rossi, "LWE with Side Information:
  Attacks and Concrete Security Estimation" (CRYPTO 2020).
- MATZOV, "Report on the Security of LWE: Improved Dual Lattice Attack" (2022).
- Léo Ducas and Ludo Pulles, "Does the dual-sieve attack on learning with errors even work?"
  (CRYPTO 2023).
- Yilei Chen, "Quantum Algorithms for Lattice Problems" (IACR ePrint 2024/555, with the
  author's note on the bug).
- Martin R. Albrecht, Rachel Player and Sam Scott, "On the concrete hardness of Learning with
  Errors", *Journal of Mathematical Cryptology* 9 (2015), and the lattice estimator on GitHub.
