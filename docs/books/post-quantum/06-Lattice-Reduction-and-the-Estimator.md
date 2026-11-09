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
    - how to break small LWE instances with LLL by embedding the secret as a short vector,
      and how a few short dual vectors tell LWE samples from random ones;
    - the root Hermite factor and the geometric series assumption, the two numbers that
      describe what reduction achieves;
    - how BKZ works and how its block size sets both quality and cost, and how to simulate
      it in thirty lines of Python;
    - the costs of enumeration and sieving, and why sieving now sets the estimates;
    - the primal, dual and hybrid attacks, and what the lattice estimator does with them;
    - the estimate for ML-KEM-768 worked by hand, compared with the published numbers, and
      the margin it leaves over category 3;
    - what the sieving records (dimension 180 in 2021, 200 in 2025) say about the gap;
    - the open debates: memory costs, the dual attack, and the 2024 quantum claim.

    **You need:** [Chapter 5](05-Lattices-and-Their-Hard-Problems.md) and
    [Chapter 2](02-Security-Levels.md), §2.5.
    [Chapter 14 of the mathematics book](../mathematics/14-Lattices.md) proves LLL's
    guarantees, and [chapter 15 of the cryptanalysis book](../cryptanalysis/15-Lattices-as-a-Weapon.md)
    uses lattices as an attack tool on older systems.

    **Levels:** §6.1 to §6.3 are for beginners, §6.4 to §6.11 are intermediate, §6.12 is
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
makes precise. The proof that LLL terminates in polynomial time, and the derivation of the
bound above, are in [§14.8 of the mathematics book](../mathematics/14-Lattices.md#148-the-lll-algorithm); this
chapter takes them as given and asks what LLL and its successors can do to the lattices that
ML-KEM builds.

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

```text
n= 6 m=12 lattice dimension 19: secret found by LLL: True
n= 9 m=18 lattice dimension 28: secret found by LLL: True
n=12 m=24 lattice dimension 37: secret found by LLL: True
```

Three instances, three secrets, in about ten seconds of pure Python. The same attack, with
the same code, does nothing useful at ML-KEM's sizes: there the lattice has dimension around
1,000, LLL's output is far too long, and a much stronger reduction is needed. How much
stronger is the subject of the rest of the chapter.

### The other way in: a dual distinguisher

The primal attack hunts for the secret itself. A second family, the **dual attack** of §6.9,
starts with a smaller ambition: decide whether a vector $b$ came from LWE or is uniformly
random. A good enough decision procedure can later be turned into key recovery by guessing
parts of the secret, and its tool is a short vector on the other side of the problem.

Take any integer vector $w$ of length $m$ with $w^T A \equiv 0 \pmod q$. Then
$\langle w, b\rangle \equiv w^T A s + \langle w, e\rangle \equiv \langle w, e\rangle \pmod q$:
the secret drops out, and what is left is a sum of $m$ small error terms weighted by $w$. If
$w$ is short, that sum is a small number modulo $q$. If $b$ is random, $\langle w, b\rangle$
is a random residue. The test measures closeness to zero smoothly, with
$\cos(2\pi\langle w, b\rangle/q)$, which is 1 at zero and averages 0 over random residues.

How close to 1 does it get for LWE? If the error coefficients have standard deviation
$\sigma$, then $\langle w, e\rangle$ is roughly Gaussian with standard deviation
$\sigma\|w\|$, and the average of the cosine over such a Gaussian is

$$\varepsilon(w) = \exp\!\left(-2\pi^2\sigma^2\|w\|^2/q^2\right).$$

That is the **advantage** of one dual vector. A vector much shorter than $q/(\pi\sigma)$ gives an
advantage near 1; one of about that length gives almost nothing. The vectors $w$ form a lattice
of dimension $m$ and volume $q^n$ (one condition modulo $q$ for each of the $n$ columns of
$A$), and a basis of it can be written down by linear algebra modulo $q$. LLL then shortens it.

**Code it.** The listing builds that basis by inverting the top $n \times n$ block of $A$
modulo $q$, reduces it with `lll`, and averages the cosine over all the reduced vectors, once
for an LWE vector $b$ and once for a random one. The column "predicted" is the average of
$\varepsilon(w)$, with $\sigma^2 = 2/3$ for errors drawn from $\{-1, 0, 1\}$.

```python
# Uses lll() from the listing above.
import random
from math import cos, pi, sqrt, exp

def dual_basis(A, q):
    """Basis of {w : w A = 0 mod q}, assuming the first n rows of A are invertible mod q."""
    m, n = len(A), len(A[0])
    M = [[A[i][j] for i in range(n)] + [1 if k == j else 0 for k in range(n)] for j in range(n)]
    for c in range(n):                            # Gauss-Jordan on A1 transposed, mod q
        p = next(r for r in range(c, n) if M[r][c])
        M[c], M[p] = M[p], M[c]
        inv = pow(M[c][c], q - 2, q)
        M[c] = [x * inv % q for x in M[c]]
        for r in range(n):
            if r != c and M[r][c]:
                M[r] = [(x - M[r][c] * y) % q for x, y in zip(M[r], M[c])]
    T = [row[n:] for row in M]                    # T = (A1 transposed) inverse
    rows = [[q if k == i else 0 for k in range(m)] for i in range(n)]
    for j in range(n, m):                         # w = (-A_j A1^-1, e_j)
        c = [-sum(A[j][k] * T[i][k] for k in range(n)) % q for i in range(n)]
        rows.append(c + [1 if k == j else 0 for k in range(n, m)])
    return rows

def score(W, b, q):
    """Average of cos(2 pi <w, b> / q): near 1 for LWE samples, near 0 for random ones."""
    return sum(cos(2 * pi * sum(x * y for x, y in zip(w, b)) / q) for w in W) / len(W)

q, rnd = 97, random.Random(1)
print(" n   m   mean |w|   predicted   score LWE   score random")
for n, m in [(8, 24), (16, 40), (24, 52), (32, 48)]:
    A = [[rnd.randrange(q) for _ in range(n)] for _ in range(m)]
    s = [rnd.choice((-1, 0, 1)) for _ in range(n)]
    e = [rnd.choice((-1, 0, 1)) for _ in range(m)]
    b_lwe = [(sum(a * x for a, x in zip(row, s)) + ei) % q for row, ei in zip(A, e)]
    b_rnd = [rnd.randrange(q) for _ in range(m)]
    W = lll(dual_basis(A, q))
    assert all(sum(w[i] * A[i][j] for i in range(m)) % q == 0 for w in W for j in range(n))
    size = sum(sqrt(sum(x * x for x in w)) for w in W) / m
    predicted = sum(exp(-2 * pi ** 2 * (2 / 3) * sum(x * x for x in w) / q ** 2) for w in W) / m
    print("%2d  %2d   %6.1f      %6.2f      %6.2f       %6.2f"
          % (n, m, size, predicted, score(W, b_lwe, q), score(W, b_rnd, q)))
```

It prints:

```text
 n   m   mean |w|   predicted   score LWE   score random
 8  24      7.2        0.93        0.96         0.23
16  40     13.8        0.77        0.83        -0.09
24  52     24.0        0.45        0.49        -0.15
32  48     56.8        0.01        0.09         0.04
```

The measured scores follow the prediction. In the first row 24 vectors of average length 7
separate LWE from random easily; the random column's 0.23 is noise, since the mean of 24
cosines of random angles wanders by about $1/\sqrt{48} \approx 0.14$. As $n$ grows, the dual
lattice's volume $q^n$ grows faster than LLL can compensate, the vectors get longer, and at
$n = 32$ they are about 57 long, more than half of $q$: the predicted advantage is 0.01 and the
test is blind. To go on, an attacker needs shorter dual vectors, which means BKZ or a sieve,
and more of them, since $N$ vectors of advantage $\varepsilon$ distinguish only once $N$ is
around $1/\varepsilon^2$. That trade, between how short the vectors are and how many are
needed, is the whole game of the dual attack at full size, and §6.9 shows where its analysis
went wrong.

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

```text
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

LLL works on pairs of neighboring vectors. Claus-Peter Schnorr's **block Korkine-Zolotarev**
algorithm, BKZ (1987, refined with Euchner in 1994), works on blocks of $\beta$ neighboring
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

### Simulating BKZ

Nobody can run BKZ-624 on a lattice of dimension 1,433, which is what an attack on ML-KEM-768
would take. What designers do instead is predict what it would produce. The GSA predicts a
straight line. Chen and Nguyen's 2011 simulator predicts something closer to what BKZ really
does, and it is short enough to write out in full.

The simulator never touches a vector. It tracks only the **profile**, the list of
$\log\|b_i^*\|$, and plays BKZ's tours on it. When a tour reaches position $k$, BKZ would
call its SVP solver on the projected block $k, \dots, k+\beta-1$ and put a shortest vector
of that block at position $k$. The simulator does not know that vector, but it knows its
expected length. By the **Gaussian heuristic**, a random lattice of dimension $\beta$ and
volume $V$ has shortest vectors of length about

$$\mathrm{GH}(\beta)\, V^{1/\beta}, \qquad \mathrm{GH}(\beta) = \frac{\Gamma(\beta/2 + 1)^{1/\beta}}{\sqrt{\pi}},$$

and the volume of the projected block is the product of its Gram-Schmidt lengths, which the
profile holds. So the simulator sets position $k$ to that prediction if it is shorter than the
value already there, and moves on. Three details make it work:

1. Once one position changes, every later block in the tour has changed too, so from then on
   each position is recomputed from its block, whether or not it gets shorter.
2. The volume of the whole lattice never changes, so the last position takes whatever volume
   is left over.
3. In dimensions below about 45 the Gaussian heuristic is visibly wrong, so for small blocks
   the simulator uses averages that Chen and Nguyen measured on HKZ-reduced (fully reduced)
   random lattices of dimension 45, the 45 numbers in `RK` below.

**Code it.** The listing follows the compact form of the simulator in the fpylll library. It
starts from the profile LLL leaves behind (a straight line with $\delta = 1.0219$) in
dimension 300, runs the simulator for several block sizes, and reads the root Hermite factor
off the first vector.

```python
from math import lgamma, log, log2, pi, e, sqrt

# Chen and Nguyen's averages of log2 ||b_i*|| for HKZ-reduced random
# 45-dimensional lattices of volume 1 (rounded; fpylll has them in full).
RK = (0.790, 0.780, 0.751, 0.707, 0.696, 0.661, 0.626, 0.581, 0.553, 0.521,
      0.488, 0.460, 0.415, 0.393, 0.339, 0.307, 0.276, 0.237, 0.196, 0.161,
      0.111, 0.068, 0.027, -0.023, -0.032, -0.094, -0.129, -0.177, -0.209,
      -0.266, -0.299, -0.349, -0.380, -0.427, -0.475, -0.530, -0.562, -0.612,
      -0.669, -0.714, -0.754, -0.809, -0.860, -0.884, -0.887)

def log_gh(d):
    """log2 of the expected shortest length in a d-dimensional lattice of volume 1."""
    if d <= 45:
        return RK[-d] - sum(RK[-d:]) / d
    return (lgamma(d / 2 + 1) / d - log(sqrt(pi))) / log(2)

def simulate(profile, beta, tours=20):
    """Chen-Nguyen BKZ simulator: profile is the list of log2 ||b_i*||."""
    p, n = list(profile), len(profile)
    gh = [0] + [log_gh(d) for d in range(1, beta + 1)]
    for _ in range(tours):
        vol, changed = sum(p[:beta]), False
        for k in range(n - 1):
            f = min(k + beta, n)                 # the block is k .. f-1
            new = vol / (f - k) + gh[f - k]      # its predicted shortest vector
            if changed or new < p[k]:
                p[k], changed = new, True
            vol -= p[k]
            if f < n:
                vol += p[f]
        p[-1] = vol                              # the volume is unchanged
        if not changed:
            break
    return p

def delta(beta):
    return ((pi * beta) ** (1 / beta) * beta / (2 * pi * e)) ** (1 / (2 * (beta - 1)))

d = 300                                          # an LLL-reduced basis, volume 1
lll_profile = [(d - 1 - 2 * i) * log2(1.0219) for i in range(d)]
print("beta  simulated delta  formula delta")
for beta in (60, 80, 100, 150, 200):
    p = simulate(lll_profile, beta)
    print("%4d      %.5f        %.5f" % (beta, 2 ** (p[0] / d), delta(beta)))
```

It prints:

```text
beta  simulated delta  formula delta
  60      1.01167        1.01145
  80      1.01027        1.01026
 100      1.00928        1.00926
 150      1.00755        1.00746
 200      1.00652        1.00628
```

For block sizes from 80 to 150 the two columns agree to the fourth decimal. That is no
coincidence: the formula for $\delta_\beta$ is what you get by demanding that every block's
first vector sit at the Gaussian heuristic on a perfectly straight line, which is the
simulator's rule with the ends ignored. The ends are where they differ. At $\beta = 60$ the
formula's approximation of the Gamma function is at its roughest, and at
$\beta = 200$ in dimension 300 the block covers two thirds of the basis, so the bent tail
reaches all the way to the first vector.

The simulator earns its place on the shape, not on $\delta$. Figure 6.2 runs it on the real
target, the primal lattice of ML-KEM-768 with 664 samples, whose basis starts as a cliff: 664
Gram-Schmidt vectors of length $q$ and 769 of length 1. At small block sizes the reduced
profile keeps a flat run of vectors of length $q$ at the start, because the straight line
would put the first vectors above $q$, and the lattice already contains the much shorter
vectors $q e_i$; only the middle tilts, in a Z shape. By $\beta = 624$ the flat run is gone.
At the other end, the last $\beta$ positions form one block that BKZ reduces completely, and
their lengths fall faster than the line.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Simulated Gram-Schmidt profiles of the ML-KEM-768 primal lattice, dimension 1,433: the starting cliff from log q to zero, then BKZ-150, BKZ-350 and BKZ-624, which keep a flat run of q-vectors at the start for small block sizes, slope down in the middle and bend down in the last positions" fill="currentColor" font-size="13">
<line x1="70" y1="250" x2="610" y2="250" stroke="currentColor"/>
<line x1="70" y1="30" x2="70" y2="250" stroke="currentColor"/>
<text x="62" y="254" text-anchor="end" font-size="12">-8</text>
<text x="62" y="210" text-anchor="end" font-size="12">-4</text>
<line x1="70" y1="206" x2="610" y2="206" stroke="currentColor" stroke-opacity=".12"/>
<text x="62" y="166" text-anchor="end" font-size="12">0</text>
<line x1="70" y1="162" x2="610" y2="162" stroke="currentColor" stroke-opacity=".12"/>
<text x="62" y="122" text-anchor="end" font-size="12">4</text>
<line x1="70" y1="118" x2="610" y2="118" stroke="currentColor" stroke-opacity=".12"/>
<text x="62" y="78" text-anchor="end" font-size="12">8</text>
<line x1="70" y1="74" x2="610" y2="74" stroke="currentColor" stroke-opacity=".12"/>
<text x="62" y="34" text-anchor="end" font-size="12">12</text>
<line x1="70" y1="30" x2="610" y2="30" stroke="currentColor" stroke-opacity=".12"/>
<text x="70" y="266" text-anchor="middle" font-size="12">1</text>
<text x="320" y="266" text-anchor="middle" font-size="12">665</text>
<text x="610" y="266" text-anchor="middle" font-size="12">1,433</text>
<text x="340" y="290" text-anchor="middle">index i in the basis</text>
<text x="22" y="140" text-anchor="middle" transform="rotate(-90 22 140)">log₂ ‖bᵢ*‖</text>
<polyline points="70,33.3 320,33.3 320,162.0 610,162.0" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="6 4"/>
<polyline points="70,33.3 79,33.3 88,33.3 97,33.3 106,33.3 115,33.3 124,33.3 133,33.3 142,33.3 151,33.3 161,33.3 170,33.3 179,33.3 188,33.3 197,33.3 206,33.3 215,33.3 224,33.3 233,38.3 242,43.9 251,49.5 260,55.0 269,60.4 278,65.7 287,70.9 296,75.9 305,80.8 314,85.6 323,90.1 332,94.6 342,98.8 351,102.9 360,106.9 369,110.7 378,114.5 387,118.1 396,121.6 405,125.1 414,128.5 423,132.0 432,135.4 441,138.9 450,142.5 459,146.1 468,149.8 477,153.6 486,157.6 495,161.8 504,166.1 513,170.5 523,175.0 532,179.7 541,184.8 550,190.4 559,195.6 568,200.2 577,205.5 586,211.8 595,219.1 604,229.0 610,236.5" fill="none" stroke="currentColor" stroke-width="1.2" stroke-opacity=".55"/>
<polyline points="70,33.3 79,33.3 88,33.3 97,33.3 106,33.3 115,33.3 124,33.3 133,33.3 142,33.3 151,33.3 161,35.5 170,38.8 179,42.0 188,45.3 197,48.5 206,51.7 215,55.0 224,58.2 233,61.4 242,64.6 251,67.8 260,71.0 269,74.2 278,77.4 287,80.5 296,83.7 305,86.8 314,90.0 323,93.2 332,96.4 342,99.7 351,103.0 360,106.2 369,109.4 378,112.6 387,115.7 396,118.8 405,121.9 414,125.1 423,128.2 432,131.5 441,134.8 450,138.2 459,141.9 468,145.8 477,150.1 486,152.7 495,155.0 504,157.5 513,160.2 523,163.1 532,166.1 541,169.5 550,173.2 559,177.2 568,181.8 577,187.1 586,193.4 595,200.7 604,210.7 610,218.1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-opacity=".8"/>
<polyline points="70,35.2 79,37.4 88,39.6 97,41.8 106,44.0 115,46.2 124,48.4 133,50.7 142,53.0 151,55.3 161,57.6 170,59.8 179,62.0 188,64.2 197,66.3 206,68.5 215,70.6 224,72.7 233,74.9 242,77.0 251,79.1 260,81.2 269,83.4 278,85.5 287,87.7 296,89.9 305,92.1 314,94.4 323,96.8 332,99.2 342,101.7 351,104.4 360,107.2 369,110.2 378,112.9 387,114.3 396,115.8 405,117.4 414,119.0 423,120.6 432,122.3 441,124.1 450,125.9 459,127.9 468,129.9 477,132.0 486,134.3 495,136.6 504,139.1 513,141.8 523,144.6 532,147.7 541,151.1 550,154.7 559,158.8 568,163.4 577,168.7 586,175.0 595,182.3 604,192.3 610,199.7" fill="none" stroke="currentColor" stroke-width="2.6"/>
<text x="330" y="25" font-size="12">start: 664 vectors of length q, then 769 of length 1</text>
<text x="80" y="104" font-size="12" fill-opacity=".7">flat start: q-vectors kept</text>
<text x="380" y="100" font-size="12">thick line, β = 624: one slope</text>
<text x="470" y="244" font-size="12" fill-opacity=".7">tails bend down</text>
</svg>
<figcaption>Figure 6.2. The Chen-Nguyen simulator run on the primal lattice of ML-KEM-768 with 664 samples (dimension 1,433). The dashed cliff is the starting basis; the thin line is BKZ-150, the medium one BKZ-350, the thick one BKZ-624. Small block sizes leave the first vectors at length $q$ and tilt only the middle, a Z shape; at β = 624 the q-vectors are gone and the profile is one slope, except in the last β positions, which are fully reduced and fall faster than the line.</figcaption>
</figure>

The second listing asks the question that matters: with the simulated profile instead of the
GSA line, which block size makes the planted vector's projection, of length $\sigma\sqrt\beta$,
shorter than the Gram-Schmidt vector at the start of the last block? It sweeps the number of
samples $m$ for ML-KEM-768 ($n = 768$, $\sigma = 1$) and finds the smallest $\beta$ both ways by
binary search, since a larger block only helps.

```python
# Uses simulate() and delta() from the listing above.
from math import log2, sqrt

q, n, sigma = 3329, 768, 1.0                 # ML-KEM-768: k = 3, eta = 2

def tail_gsa(m, beta):
    """log2 of ||b*_(d-beta+1)|| predicted by the GSA."""
    d = n + m + 1
    return (2 * beta - d - 1) * log2(delta(beta)) + m / d * log2(q)

def tail_sim(m, beta):
    """The same length, read off the simulated profile."""
    d = n + m + 1
    p = simulate([log2(q)] * m + [0.0] * (n + 1), beta)
    return p[d - beta]

def smallest_beta(tail, m):
    lo, hi = 300, 1200                       # binary search: success is monotone in beta
    while lo < hi:
        mid = (lo + hi) // 2
        if log2(sigma * sqrt(mid)) <= tail(m, mid):
            hi = mid
        else:
            lo = mid + 1
    return lo

print("   m   beta (GSA)   beta (simulator)")
for m in (600, 632, 664, 696, 728, 768):
    print("%4d   %6d       %6d" % (m, smallest_beta(tail_gsa, m), smallest_beta(tail_sim, m)))
```

It prints:

```text
   m   beta (GSA)   beta (simulator)
 600      628          645
 632      626          643
 664      624          642
 696      624          642
 728      624          642
 768      625          642
```

Both columns bottom out near $m = 664$ to 728, but the simulator asks for about 18 more
block-size units than the GSA, 642 instead of 624, or about five bits of core-SVP. The
reason is visible in Figure 6.2: the simulated profile is not quite straight, and near the
start of the last block, where the attack's condition is read, it sits about a tenth of a bit
(in $\log_2$, so about 10 percent in length) below the GSA line. Which picture is closer to
reality at $\beta = 624$ nobody can check by experiment; the published refinements (§6.12)
move ML-KEM's block sizes by a few percent in either direction, depending on how the tail and
the success probability are modeled. The lesson is the size of the effect. Model choices of
this kind move the estimate by a handful of bits, not by tens, and §6.8 follows the GSA
numbers because they are what the published documentation uses.

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

```text
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

```text
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

## 6.8 ML-KEM-768, step by step

*Level: intermediate.*

ML-KEM-768 is the parameter set NIST and the designers recommend as the default and the one
most deployments use (Chapter 18). This section follows one estimate for it from the
instance to the margin: first the 2016 condition by hand, then the published numbers and why
they differ from ours, then the attack on the ciphertext instead of the key, and finally the
step from core-SVP to the question a user asks, which is how much room there is.

### The instance

Seen as plain LWE, ML-KEM-768 has a secret of $n = 3 \times 256 = 768$ coefficients modulo
$q = 3329$. Secret and error coefficients come from the centered binomial distribution with
$\eta = 2$: the values $-2, -1, 0, 1, 2$ with probabilities $1/16, 4/16, 6/16, 4/16, 1/16$,
whose variance is $\eta/2 = 1$, so $\sigma = 1$. The public key $t = As + e$ supplies 768
samples, all with the same secret. The attacker uses $m$ of them, builds Kannan's embedding of
§6.3 in dimension $d = n + m + 1$ with volume $q^m$, and looks for the planted vector
$(s, -e, 1)$, of length about $\sqrt{n + m}$.

### By hand: β = 624 with m = 664

The sweep in §6.5 says the best $m$ is about 664, so $d = 1{,}433$. Here is the 2016
condition $\sigma\sqrt\beta \le \delta_\beta^{\,2\beta-d-1}\, q^{m/d}$ evaluated with a
calculator.

<div class="mars-steps" markdown>

1. **The root Hermite factor.** $\beta/(2\pi e) = 624/17.079 = 36.535$. Next
   $(\pi\beta)^{1/\beta} = 1960.4^{1/624} = e^{7.5809/624} = e^{0.012149} = 1.01222$. Their
   product is $36.981$, and $\delta_{624} = 36.981^{1/1246} = e^{3.6104/1246} = e^{0.0028976}
   = 1.0029018$.
2. **The exponent.** $2\beta - d - 1 = 1248 - 1434 = -186$, so
   $\delta^{-186} = e^{-186 \times 0.0028976} = e^{-0.53895} = 0.5833$.
3. **The volume term.** $q^{m/d} = 3329^{664/1433} = e^{0.46336 \times 8.11043} = e^{3.75806}
   = 42.866$.
4. **Compare.** The right side is $0.5833 \times 42.866 = 25.01$. The left side is
   $\sigma\sqrt{624} = 24.98$. The condition holds, by three hundredths.
5. **One step down.** At $\beta = 623$, $\delta = 1.0029052$, the exponent is $-188$, and the
   right side is $24.85$ against $\sqrt{623} = 24.96$. It fails. So $\beta = 624$.
6. **Costs.** Core-SVP is $0.292 \times 624 = 182.2$ bits classically and
   $0.265 \times 624 = 165.4$ bits with the quantum sieve exponent. The sieve's list would hold
   about $2^{0.2075 \times 624} = 2^{129.5}$ vectors.

</div>

A sanity check on the GSA: it puts the first reduced vector at
$\delta^{d}\, q^{m/d} = 1.0029018^{1433} \times 42.866 \approx 2{,}712$, below $q = 3329$, so
the straight line never rises above the $q$-vectors and the simple condition applies.
Figure 6.3 draws the comparison of step 4.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Close-up of the ML-KEM-768 primal attack at block size 624, indices 700 to 950: the GSA line meets the secret level exactly at index 810, the start of the last block, while the simulated profile passes about 10 percent lower there" fill="currentColor" font-size="13">
<line x1="70" y1="250" x2="610" y2="250" stroke="currentColor"/>
<line x1="70" y1="30" x2="70" y2="250" stroke="currentColor"/>
<text x="62" y="254" text-anchor="end" font-size="12">3</text>
<text x="62" y="191" text-anchor="end" font-size="12">4</text>
<text x="62" y="128" text-anchor="end" font-size="12">5</text>
<text x="62" y="65" text-anchor="end" font-size="12">6</text>
<text x="70" y="266" text-anchor="middle" font-size="12">700</text>
<text x="178" y="266" text-anchor="middle" font-size="12">750</text>
<text x="286" y="266" text-anchor="middle" font-size="12">800</text>
<text x="394" y="266" text-anchor="middle" font-size="12">850</text>
<text x="502" y="266" text-anchor="middle" font-size="12">900</text>
<text x="610" y="266" text-anchor="middle" font-size="12">950</text>
<text x="340" y="290" text-anchor="middle">index i in the reduced basis (d = 1,433, β = 624)</text>
<text x="22" y="140" text-anchor="middle" transform="rotate(-90 22 140)">log₂ ‖bᵢ*‖</text>
<line x1="70" y1="146.7" x2="610" y2="146.7" stroke="currentColor" stroke-width="1.4" stroke-dasharray="6 4"/>
<line x1="305.4" y1="30" x2="305.4" y2="250" stroke="currentColor" stroke-opacity=".5" stroke-dasharray="2 3"/>
<line x1="70" y1="89.4" x2="610" y2="220.7" stroke="currentColor" stroke-width="1.6" stroke-opacity=".6"/>
<polyline points="70,82.1 92,88.0 113,94.1 135,100.3 156,106.6 178,113.1 200,119.8 221,126.6 243,133.6 264,140.9 286,148.5 308,156.0 329,159.4 351,162.8 372,166.2 394,169.7 416,173.3 437,176.9 459,180.5 480,184.2 502,188.0 524,191.8 545,195.7 567,199.6 588,203.6 610,207.6" fill="none" stroke="currentColor" stroke-width="2.6"/>
<circle cx="305.4" cy="146.6" r="5" fill="none" stroke="currentColor" stroke-width="1.6"/>
<circle cx="305.4" cy="155.7" r="5"/>
<text x="318" y="138" font-size="12">GSA line: exactly at the level</text>
<text x="298" y="176" text-anchor="end" font-size="12">simulated profile: about 10% lower</text>
<text x="80" y="200" font-size="12" fill-opacity=".7">dashed: σ√β ≈ 24.98, the</text>
<text x="80" y="216" font-size="12" fill-opacity=".7">secret's projected length</text>
<text x="312" y="242" font-size="12">i = d − β + 1 = 810</text>
<text x="470" y="160" font-size="12" fill-opacity=".7">thin: GSA</text>
<text x="470" y="232" font-size="12">thick: simulator</text>
</svg>
<figcaption>Figure 6.3. The primal attack on ML-KEM-768 at β = 624, seen up close. The 2016 condition compares the secret's projected length (dashed) with the Gram-Schmidt length at the start of the last block (dotted line). On the GSA line the two meet almost exactly, which is why 624 is the answer by hand; the simulated profile passes about a tenth of a bit lower there, and the simulator needs β = 642 before its point reaches the level.</figcaption>
</figure>

### What the documentation says, and why it differs

The Kyber team published a short script with its round-3 documentation that does the same
computation. For Kyber-768, the version quoted in NIST's correspondence about the round-3
numbers reports a primal attack with block size 626, using 650 samples in dimension 1,419,
and a core-SVP of 183 bits classically and 166 quantumly. Our 624 with 664 samples gives
182.2 and 165.4. Three things account for the gap of two block-size units, and none of them is
a disagreement about the attack:

- **The optimum is flat.** The table in §6.5 shows the same $\beta$ for every $m$ from 664 to
  728, and only 2 more at $m = 632$. A sweep with a different step, or one that stops at the
  first $m$ that reaches the minimum, lands on a different $m$ with a $\beta$ a unit or two
  away.
- **The exact form of the condition.** Some write the exponent as $2\beta - d$, others as
  $2\beta - d - 1$ (the "+1" coordinate of the embedding counted or not), and some measure the
  planted vector's projection with a slightly different expectation. [Chapter 15 of the
  cryptanalysis book](../cryptanalysis/15-Lattices-as-a-Weapon.md#1510-how-estimators-set-post-quantum-parameters)
  runs the version with $2\beta - d$ and gets 623.
- **Rounding.** $0.292 \times 626 = 182.8$, printed as 183; $0.292 \times 624 = 182.2$, printed
  as 182. Both numbers appear in the literature for the same parameter set, and both are
  right to the precision the model deserves.

The larger differences come from the model, not the arithmetic. The simulator of §6.5 asks for
642. The lattice estimator's default model for the primal attack charges for the many BKZ
tours, not one sieve call, so its headline cost ("rop") is well above core-SVP even when its
block size is close to ours. When someone quotes a single number for ML-KEM-768, the first
question is which of these it is.

### Key or ciphertext?

The public key is not the only LWE instance an attacker sees. Every ciphertext contains
$u = A^T r + e_1$, compressed to $d_u$ bits per coefficient, which is another LWE instance
with secret $r$ (the encryption randomness) and error $e_1$ plus the rounding error of the
compression. Recovering $r$ from one ciphertext decrypts that ciphertext. If that instance
were easier than the key, it would set the security level.

The listing computes both. When secret and error have different sizes, the attacker rescales
the secret's coordinates by $\sigma_e/\sigma_s$ so that the planted vector is balanced, which
multiplies the lattice volume by $(\sigma_e/\sigma_s)^n$. The rounding error of compressing to
$d_u$ bits is close to uniform on an interval of width $q/2^{d_u}$, so it adds variance
$(q/2^{d_u})^2/12$ to the error, about 0.88 for $d_u = 10$.

```python
from math import pi, e, sqrt, log2

def delta(beta):
    return ((pi * beta) ** (1 / beta) * beta / (2 * pi * e)) ** (1 / (2 * (beta - 1)))

def primal(n, q, sigma_s, sigma_e):
    """Smallest beta meeting the 2016 condition when secret and error differ in size.
    The secret's coordinates are scaled by sigma_e / sigma_s to balance the planted vector."""
    c, best = sigma_e / sigma_s, None
    for m in range(n // 2, n + 1, 4):
        d = n + m + 1
        log_vol = m * log2(q) + n * log2(c)
        for beta in range(100, d):
            if log2(sigma_e * sqrt(beta)) <= (2 * beta - d - 1) * log2(delta(beta)) + log_vol / d:
                best = beta if best is None else min(best, beta)
                break
    return best

q = 3329
print("set            public key   ciphertext   ciphertext + rounding")
for name, k, eta1, eta2, du in [("ML-KEM-512", 2, 3, 2, 10), ("ML-KEM-768", 3, 2, 2, 10),
                                ("ML-KEM-1024", 4, 2, 2, 11)]:
    n, s1, s2 = 256 * k, sqrt(eta1 / 2), sqrt(eta2 / 2)
    rounding = (q / 2 ** du) ** 2 / 12             # variance of the compression error in u
    betas = [primal(n, q, s1, s1), primal(n, q, s1, s2), primal(n, q, s1, sqrt(s2 ** 2 + rounding))]
    print("%-12s" % name + "".join("   %4d (%3.0f)" % (b, 0.292 * b) for b in betas))
```

It prints, with core-SVP bits in brackets:

```text
set            public key   ciphertext   ciphertext + rounding
ML-KEM-512      406 (119)    394 (115)    413 (121)
ML-KEM-768      624 (182)    624 (182)    651 (190)
ML-KEM-1024     874 (255)    874 (255)    885 (258)
```

For ML-KEM-768 and ML-KEM-1024 the key is the weakest instance: secret and error of the
ciphertext have the same size as the key's, and the rounding only makes the ciphertext harder.
ML-KEM-512 is different. Its secrets use $\eta_1 = 3$ but its ciphertext error uses
$\eta_2 = 2$, so without the rounding the ciphertext is the easier target, by about 12 block
sizes. That is exactly the point the Kyber team made in round 3: Kyber-512 has 112 bits of
core-SVP without any assumption about the rounding, and 118 if the rounding noise is counted
as error under a weak learning-with-rounding assumption. Our simple model lands about three
bits higher in both columns, because the documentation's script handles the unbalanced
instance differently in its details, but it shows the same thing: for the smallest set, about
six bits of the published figure rest on treating deterministic rounding as if it were random
noise. Critics argued on NIST's forum during round 3 that this changed the metric rather than
the scheme; for ML-KEM-768 the question does not arise.

### From core-SVP to the margin

Category 3 is defined by AES-192: an attack must cost at least as much as a key search on it,
which NIST puts at $2^{207}$ classical gates. Core-SVP's 182 is not comparable with that
number, since it counts one sieve call in abstract operations. The round-3 Kyber documentation
therefore also gave a gate-count estimate that adds what core-SVP leaves out: the many
SVP calls of BKZ (with progressive BKZ and dimensions for free), the gates in one sieve
operation, and the lower-order terms. For Kyber-768 it came to about $2^{215}$ gates; for
Kyber-512, $2^{151.5}$ in the middle of a stated range of $2^{135.5}$ to $2^{165.5}$, against
category 1's $2^{143}$. Figure 6.4 puts these numbers on one chart.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Security in bits against BKZ block size from 300 to 900: the classical core-SVP line 0.292 beta and the quantum line 0.265 beta, the three ML-KEM block sizes 406, 624 and 874 marked on the classical line, the Kyber documentation gate-count estimates above them, and the NIST category thresholds 143, 207 and 272 as horizontal dashed lines" fill="currentColor" font-size="13">
<line x1="70" y1="250" x2="610" y2="250" stroke="currentColor"/>
<line x1="70" y1="30" x2="70" y2="250" stroke="currentColor"/>
<text x="62" y="234" text-anchor="end" font-size="12">100</text>
<text x="62" y="184" text-anchor="end" font-size="12">150</text>
<text x="62" y="134" text-anchor="end" font-size="12">200</text>
<text x="62" y="84" text-anchor="end" font-size="12">250</text>
<text x="62" y="34" text-anchor="end" font-size="12">300</text>
<text x="70" y="266" text-anchor="middle" font-size="12">300</text>
<text x="160" y="266" text-anchor="middle" font-size="12">400</text>
<text x="250" y="266" text-anchor="middle" font-size="12">500</text>
<text x="340" y="266" text-anchor="middle" font-size="12">600</text>
<text x="430" y="266" text-anchor="middle" font-size="12">700</text>
<text x="520" y="266" text-anchor="middle" font-size="12">800</text>
<text x="610" y="266" text-anchor="middle" font-size="12">900</text>
<text x="340" y="290" text-anchor="middle">BKZ block size β</text>
<text x="22" y="140" text-anchor="middle" transform="rotate(-90 22 140)">bits (log₂ of cost)</text>
<line x1="70" y1="187" x2="610" y2="187" stroke="currentColor" stroke-opacity=".5" stroke-dasharray="6 4"/>
<text x="180" y="182" font-size="12" fill-opacity=".7">category 1</text>
<line x1="70" y1="123" x2="610" y2="123" stroke="currentColor" stroke-opacity=".5" stroke-dasharray="6 4"/>
<text x="76" y="118" font-size="12" fill-opacity=".7">category 3</text>
<line x1="70" y1="58" x2="610" y2="58" stroke="currentColor" stroke-opacity=".5" stroke-dasharray="6 4"/>
<text x="76" y="53" font-size="12" fill-opacity=".7">category 5</text>
<line x1="70.0" y1="242.4" x2="610.0" y2="67.2" stroke="currentColor" stroke-width="2.4"/>
<line x1="71.8" y1="250.0" x2="610.0" y2="91.5" stroke="currentColor" stroke-width="1.4" stroke-opacity=".6"/>
<circle cx="165.4" cy="211.4" r="5"/>
<text x="157.4" y="208" text-anchor="end" font-size="12">512: β 406</text>
<circle cx="361.6" cy="147.8" r="5"/>
<text x="353.6" y="144" text-anchor="end" font-size="12">768: β 624</text>
<circle cx="586.6" cy="74.8" r="5"/>
<text x="578.6" y="50" text-anchor="end" font-size="12">1024: β 874</text>
<line x1="165.4" y1="194.5" x2="165.4" y2="164.5" stroke="currentColor" stroke-width="1.4"/>
<rect x="161.4" y="174.5" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1.6"/>
<rect x="357.6" y="111.0" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="173.4" y="162.0" font-size="12">gates 2^151.5</text>
<text x="369.6" y="109.0" font-size="12">gates ≈ 2^215</text>
</svg>
<figcaption>Figure 6.4. Block size against bits for the three ML-KEM parameter sets (2016 primal estimate). The thick line is classical core-SVP, $0.292\beta$, and the thin line quantum core-SVP, $0.265\beta$; filled dots mark the three sets. Hollow squares are the round-3 Kyber documentation's gate-count estimates, with Kyber-512's range of $2^{135.5}$ to $2^{165.5}$ drawn as a bar. Core-SVP sits well below the category lines because it counts one sieve call in abstract operations; the gate counts, which add the many calls and the cost of each operation, sit some 8 bits above categories 1 and 3 before any charge for memory.</figcaption>
</figure>

So the margin of ML-KEM-768 over category 3 depends on what you charge for:

- **Gates in the RAM model** (memory free and instant): about 8 bits, from $2^{215}$ to
  $2^{207}$. This is the accounting most attack papers use, and the one the dual-attack
  claims of 2021 and 2022 aimed at. Guo and Johansson (ASIACRYPT 2021) estimated a dual attack
  on Kyber-768 at about $2^{205}$ gates in this model, just under the line; MATZOV (2022) moved
  Kyber-512 from $2^{151.5}$ to $2^{137.5}$. Both rest on the independence heuristic that §6.9
  explains and that Ducas and Pulles showed fails in the regime used.
- **Gates plus memory.** A sieve at $\beta = 624$ keeps a list of some $2^{120}$ to $2^{130}$
  vectors, depending on how many dimensions come for free. In any model that charges for
  moving data, that list costs tens of bits more: the cube-root and square-root models of
  [Chapter 2, §2.7](02-Security-Levels.md#27-memory-the-hidden-cost) put the attack at
  $2^{225}$ to $2^{247}$, a margin of 18 to 40 bits.
- **Against what has been computed.** The largest SVP instances solved in public are in
  dimension 200 to 210 (§6.11). ML-KEM-768 needs SVP calls in dimension about 624, minus a few
  dozen for free. At $2^{0.292}$ per dimension, the gap of over 400 dimensions is a factor of
  more than $2^{100}$.
- **Quantum.** The quantum sieve exponent gives 165, but category 3's quantum bar is a Grover
  search on AES-192 under MAXDEPTH (Chapter 2, §2.4), and quantum sieving with realistic
  memory gains little (§6.12). The classical numbers bind.

The honest one-line summary is the one the designers gave: ML-KEM-768 sits above category 3
by a few bits in the attacker's most generous model and by tens of bits in any model that
charges for memory, and the uncertainty in each figure is a few bits. That is thin enough
that a single new idea could matter for ML-KEM-512, which is why ML-KEM-768 is the default,
and wide enough that the published claims that dipped below the line rested on a heuristic
that did not hold.

## 6.9 The dual attack

*Level: intermediate.*

The dual attack solves decision LWE. Find many short vectors $w$ with $w^T A \equiv 0 \pmod q$
(short vectors in the lattice $\Lambda_q^\perp(A^T)$). For an LWE sample vector $b = As + e$,

$$\langle w, b\rangle \equiv w^T A s + \langle w, e\rangle \equiv \langle w, e\rangle \pmod q,$$

which is small if $w$ and $e$ are both short; for random $b$ it is uniform. Each short $w$ gives
a weak distinguisher; many together give a strong one. The toy in §6.3 did exactly this with
LLL and watched the advantage $\varepsilon(w) = \exp(-2\pi^2\sigma^2\|w\|^2/q^2)$ vanish as the
vectors grew. At full size the vectors $w$ are found by BKZ on the dual lattice, followed by a
sieve, which outputs not one short vector but an exponential list of them at once, all of
about the same length.

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
estimator. [Chapter 15 of the cryptanalysis
book](../cryptanalysis/15-Lattices-as-a-Weapon.md#1511-the-dual-attack-controversy) tells the
story of the controversy from the attacker's side; the rest of this section explains the
statistics at its center.

### The count that went wrong

The modern dual attack splits the secret in two, $s = (s_g, s_r)$. It guesses the first part,
$k$ coefficients with, say, $T = 5^k$ possible values for ML-KEM's $\eta = 2$, and for each
guess removes its contribution from $b$. Dual vectors for the matrix of the remaining columns
then score each guess: for the right guess what is left is an LWE sample in $s_r$, and the
score averages $N\varepsilon$ over $N$ vectors; for a wrong guess, what is left looks random,
and the score averages zero with a spread of about $\sqrt{N/2}$. A fast Fourier transform
computes all $T$ scores at once, which was MATZOV's main gain.

How many vectors are needed? The right guess must beat the best of $T - 1$ wrong ones. If the
wrong scores are independent Gaussians, the largest of $T$ of them is about
$\sqrt{N/2}\cdot\sqrt{2\ln T}$, so the attack needs roughly

$$N\varepsilon \gtrsim \sqrt{N\ln T}, \qquad\text{that is}\qquad N \approx \frac{\ln T}{\varepsilon^2}.$$

Each extra guessed coefficient costs only a factor $\ln T$ in $N$, which is what made guessing
cheap and the improved attacks attractive. The step "if the wrong scores are independent" is
the **independence heuristic**.

Ducas and Pulles looked at what the score is as a function of the target. It is
$f(t) = \sum_w \cos(2\pi\langle w, t\rangle/q)$, and because every $w$ is in the dual
lattice, $f$ is periodic over the primal lattice: it peaks at every lattice point, not only at
the planted one. It is a smoothed test of "is $t$ close to the lattice?". A wrong guess gives
an essentially random target, and a random target scores high exactly when it happens to fall
close to some lattice point. The Gaussian heuristic says how often that happens: a random
target lies within distance $r$ of the lattice with probability about
$\mathrm{vol}(B_r)/\det\mathcal{L}$, the volume of a ball of radius $r$ over the lattice's
volume. If $T$ times that probability is much larger than 1, where $r$ is the length of the
real error, then among the wrong guesses there are many targets as close to the lattice as the
right one, and no score that measures closeness can tell them apart, whatever $N$ is. They
called this the **contradictory regime**: the heuristic analysis predicts success in a region
where success would contradict the Gaussian heuristic itself. The parameters behind the
claimed gains for Kyber sat in it, and their experiments showed the wrong guesses' scores
with far heavier tails than independent Gaussians allow.

The repairs came quickly. Ducas and Pulles followed with a way to predict the scores
accurately from a weaker assumption, that a sieve's output vectors are spread uniformly in a
ball (IACR ePrint 2023/1850). Amaury Pouly and Yixin Shen (EUROCRYPT 2024) proved a dual
attack correct with no statistical assumption at all, by an argument from geometry, and found
that the regime where their proof works and the contradictory regime are complementary,
separated by about a factor of 2 in the length of the target. Further work has built on their
framework. What none of it has done, as far as published work shows, is restore the full
gains claimed in 2021 and 2022 at ML-KEM's sizes, which is why the margin in §6.8 is quoted
from the primal attack.

## 6.10 The lattice estimator

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

**Reading one line by hand.** The `usvp` line above can be checked with nothing but §6.7.
The block size 406 is the one our sweep found for ML-KEM-512. The root Hermite factor is the
formula of §6.5 at $\beta = 406$, which gives $1.003941$ to six decimals. The dimension
$d = 998 = 512 + 485 + 1$ says the estimator used $m = 485$ samples, inside the flat optimum of
§6.7's sweep (488 there). And `rop` and `red`, the total cost and the cost of the reduction,
are both $2^{118.6} = 2^{0.292 \times 406}$: in `rough` mode the cost of the attack is one sieve
call, which is core-SVP. A full `estimate` replaces that last number with a cost model that
counts the BKZ tours and the sieve's operations, and the gap between the two lines is the gap
between the dots and the squares of Figure 6.4.

**How ML-KEM's claims were built.** The Kyber team's documentation for the third round
combined: core-SVP figures (about 118, 182 and 256 bits classically for the three sets); a
gate-count model for sieving, including the many BKZ calls and the cost of the sieve's inner
loop; and a discussion of memory costs. Their conclusion, accepted by NIST, was that
ML-KEM-512 meets category 1 under realistic memory costs, with some uncertainty in the pure
gate model, and that ML-KEM-768 and ML-KEM-1024 meet categories 3 and 5 with margin. Chapter 2
told the story of the disagreement about the first claim, and §6.8 follows the numbers for
ML-KEM-768.

**Using the estimator well.** Three habits make estimates meaningful. State the cost model
(core-SVP, gate count, memory-aware). Report the attack that wins and the block size it
needs, so others can check it against the GSA by hand. And rerun estimates with the current
version before relying on them, since a new attack paper can move the result by a few bits.

## 6.11 In the real world

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

**Side information.** Real attacks may know something extra: a few coefficients of the secret
from a side channel, or hints like "this coefficient is small". Dachman-Soled, Ducas, Gong and
Rossi (CRYPTO 2020) built a framework, with its own estimator ("leaky-LWE"), that folds such
hints into the lattice and recomputes the block size. It turns, for example, a power-analysis
leak of a few bits per coefficient into an exact count of how much security remains, and is
the standard tool for evaluating side-channel attacks on ML-KEM (Chapter 17).
### Sieving records and what they calibrate

The Darmstadt SVP challenge, run since 2010, publishes random lattices in every dimension and
a hall of fame for anyone who finds a vector within 5 percent of the Gaussian heuristic's
prediction. It is the closest thing lattice cryptography has to RSA's factoring records, and
its recent history is a history of sieving.

| Year | Dimension | Team | Machine and time |
| --- | --- | --- | --- |
| 2019 | 155 | Albrecht, Ducas, Herold, Kirshanova, Postlethwaite and Stevens, with G6K | CPUs |
| 2021 | 180 | Ducas, Stevens and van Woerden, G6K on GPUs | 4 NVIDIA Turing GPUs, 1.5 TB of RAM, 51.6 days |
| March 2025 | 200 | Jintai Ding's group, Xi'an Jiaotong-Liverpool University | not given in the announcement |
| January 2026 | 210 | the same group, as announced by the university | not given in the announcement |

*Table 6.2. Public SVP challenge records from sieving, as of November 2026.*

The 2021 record is the best documented. Ducas, Stevens and van Woerden rewrote the inner loop
of G6K to run on the tensor cores of graphics cards, units built for low-precision matrix
products in machine learning, and reported a gain of about two orders of magnitude in time and
energy over the CPU records. Their dimension-180 run filled the machine's 1.5 terabytes of
memory: at that size memory, not arithmetic, was already the limit. The 2025 and 2026 records
were announced by the university. The first announcement says that each 10 extra dimensions
multiply the work by roughly ten, and a later talk by Ding described breaking the computation
into cache-sized pieces to get around the memory wall. As of November 2026 the full technical details of
those runs are not something this book has been able to check, so the table gives only what
was announced.

**Code it.** How far are these records from ML-KEM? The listing extrapolates from the 2021
run, the one with published time and memory. It assumes the sieve in a block of size $\beta$
runs in dimension $\beta - f$ with $f$ from Ducas's dimensions-for-free formula of §6.5, that
time grows as $2^{0.292}$ and memory as $2^{0.2075}$ per sieving dimension, and that the same
four GPUs do the work.

```python
from math import log, log2, pi, e

def free_dims(beta):
    """Ducas's dimensions for free: how much smaller the sieve can be than the block."""
    return round(beta * log(4 / 3) / log(beta / (2 * pi * e)))

days0, bytes0 = 51.6, 1.5e12                 # the 2021 GPU record: SVP-180, 4 GPUs, 1.5 TB
s0 = 180 - free_dims(180)
print("block  sieve dim   time on the same machine   memory")
for beta in (180, 200, 300, 406, 624):
    s = beta - free_dims(beta)
    days = days0 * 2 ** (0.292 * (s - s0))
    years = days / 365.25
    if days < 1000:
        when = "%.0f days" % days
    elif years < 1000:
        when = "%.0f years" % years
    else:
        when = "2^%.0f years" % log2(years)
    memory = bytes0 * 2 ** (0.2075 * (s - s0))
    print("%5d  %6d      %-26s 2^%.0f bytes" % (beta, s, when, log2(memory)))
```

It prints:

```text
block  sieve dim   time on the same machine   memory
  180     158      52 days                    2^40 bytes
  200     177      7 years                    2^44 bytes
  300     270      2^30 years                 2^64 bytes
  406     369      2^59 years                 2^84 bytes
  624     574      2^119 years                2^127 bytes
```

The row for 200 says that the 2021 machine would have needed about seven years for the 2025
record, so the 2025 team must have had better code, more hardware or both, which is what
records are for. The rows for 406 and 624 are one SVP call each, not a whole BKZ reduction,
and they still ask for $2^{59}$ and $2^{119}$ years. The memory column repeats §6.6's warning
from the other side: with dimensions for free and compact storage the list is about
$2^{10}$ times smaller than the plain formula gives, but $2^{84}$ bytes for ML-KEM-512 is still
far beyond all the storage on Earth, which is counted in zettabytes (around $2^{73}$ bytes),
and $2^{127}$ bytes for
ML-KEM-768 is beyond any physical meaning. Figure 6.5 puts the records and the targets on one
axis.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Public SVP challenge records by year: dimension 155 in 2019, 180 in 2021, 200 in 2025 and 210 reported in 2026, far below the block sizes 406 and 624 that ML-KEM-512 and ML-KEM-768 would require" fill="currentColor" font-size="13">
<line x1="70" y1="250" x2="610" y2="250" stroke="currentColor"/>
<line x1="70" y1="30" x2="70" y2="250" stroke="currentColor"/>
<text x="62" y="254" text-anchor="end" font-size="12">100</text>
<text x="62" y="214" text-anchor="end" font-size="12">200</text>
<text x="62" y="174" text-anchor="end" font-size="12">300</text>
<text x="62" y="134" text-anchor="end" font-size="12">400</text>
<text x="62" y="94" text-anchor="end" font-size="12">500</text>
<text x="62" y="54" text-anchor="end" font-size="12">600</text>
<text x="70" y="266" text-anchor="middle" font-size="12">2018</text>
<text x="190" y="266" text-anchor="middle" font-size="12">2020</text>
<text x="310" y="266" text-anchor="middle" font-size="12">2022</text>
<text x="430" y="266" text-anchor="middle" font-size="12">2024</text>
<text x="550" y="266" text-anchor="middle" font-size="12">2026</text>
<text x="610" y="266" text-anchor="middle" font-size="12">2027</text>
<text x="340" y="290" text-anchor="middle">year</text>
<text x="22" y="140" text-anchor="middle" transform="rotate(-90 22 140)">SVP dimension</text>
<line x1="70" y1="127.6" x2="610" y2="127.6" stroke="currentColor" stroke-width="1.6" stroke-dasharray="6 4"/>
<text x="76" y="121.6" font-size="12">β ≈ 406: ML-KEM-512 (primal, core-SVP)</text>
<line x1="70" y1="40.4" x2="610" y2="40.4" stroke="currentColor" stroke-width="1.6" stroke-dasharray="6 4"/>
<text x="76" y="34.4" font-size="12">β ≈ 624: ML-KEM-768</text>
<polyline points="136,228.0 256,218.0 502,210.0 553,206.0" fill="none" stroke="currentColor" stroke-width="2"/>
<circle cx="136" cy="228.0" r="5"/>
<circle cx="256" cy="218.0" r="5"/>
<circle cx="502" cy="210.0" r="5"/>
<circle cx="553" cy="206.0" r="5"/>
<text x="136" y="216.0" text-anchor="middle" font-size="12">155, G6K on CPUs</text>
<text x="256" y="206.0" text-anchor="middle" font-size="12">180, GPUs</text>
<text x="502" y="198.0" text-anchor="middle" font-size="12">200</text>
<text x="553" y="226.0" text-anchor="middle" font-size="12">210 (reported)</text>
<line x1="586" y1="204.4" x2="586" y2="42.8" stroke="currentColor" stroke-opacity=".6"/>
<text x="578" y="82.0" text-anchor="end" font-size="12" fill-opacity=".8">gap: about 414 dimensions,</text>
<text x="578" y="98.0" text-anchor="end" font-size="12" fill-opacity=".8">a factor of about 2^121 at 2^0.292 per dimension</text>
</svg>
<figcaption>Figure 6.5. Public records in the Darmstadt SVP challenge against the block sizes the primal estimates assign to ML-KEM. Twenty-five dimensions in seven years of records, against a gap of more than 400 dimensions to ML-KEM-768. The 2026 point is the university's announcement; the block sizes are core-SVP figures, and dimensions for free would lower each SVP call by a few dozen dimensions.</figcaption>
</figure>

Records calibrate the models in a narrow way. They confirm that the sieve's cost grows at
about the rate the estimates assume, over the range that can be run, and they show how much
engineering (GPUs, tensor cores, cache blocking) can shift the constant in front. They cannot
confirm the exponent hundreds of dimensions further on, nor the cost of memory at sizes no
machine has. The gap between dimension 210 and dimension 400 or 600 is the reason every
estimate carries error bars of several bits, and the reason designers pick parameters that
survive even if the error bars are wrong by a few bits in the attacker's favor.

**Memory, priced.** Chapter 2, §2.7 compared three ways of charging for memory. The records
add a practical point. The 2021 run was bounded by its RAM, and the 2025 team's stated trick
was to make memory access local. Every serious large sieve so far has spent its effort on
moving data, not on arithmetic. That is the strongest practical argument that the RAM model,
which charges nothing for a memory access, flatters the attacker at cryptographic sizes, and
it is why the Kyber team's and NIST's discussions of ML-KEM-512 always came back to memory.

## 6.12 Going deeper

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

**Better simulators.** The simulator of §6.5 is deterministic: every block's first vector gets
exactly its Gaussian-heuristic length. Real SVP calls return lengths that vary around that
value, and the variation is what produces head concavity. Bai, Stehlé and Wen (ASIACRYPT 2018)
measured the effect and built a probabilistic simulator that draws each block's shortest
length from its distribution; fpylll ships both simulators. For the primal attack the two
differ by a few block sizes, the same order as the gap between the GSA and simulator columns
of §6.5.

**Beyond BKZ.** Self-dual BKZ, slide reduction (Gama and Nguyen, 2008), and "Pump and Jump"
strategies in G6K are alternatives with better theoretical guarantees or practical constants.
None has changed the asymptotic picture: for a target root Hermite factor $\delta$, the cost is
$2^{\Theta(1/\log\delta)}$ up to lower-order terms, the relation all estimators share.

## Check yourself

??? question "1. In Kannan's embedding, which lattice vector reveals the LWE secret, and why is it short?"

    $(s, -e, 1)$, obtained from the rows by taking $s$ times the identity block, adding multiples
    of $q$, and adding the target row once. Its entries are the secret's and error's
    coefficients and a 1, all small, so its length is about $\sqrt{n + m}$, far below the Gaussian
    heuristic.

??? question "2. LLL achieves δ ≈ 1.0219 in high dimension. In a lattice of dimension 500 and determinant 1, how long is the vector it finds?"

    $\delta^{500} = 1.0219^{500} \approx e^{500 \times 0.02166} \approx e^{10.8} \approx 50{,}000$.
    Far from the shortest vector, whose length the Gaussian heuristic puts at about
    $\sqrt{500/(2\pi e)} \approx 5.4$.

??? question "3. Why does BKZ's quality improve with the block size, and why does its cost grow exponentially?"

    Each block is reduced optimally by an exact SVP solver, so larger blocks see more of the
    lattice's geometry and produce flatter profiles (smaller δ). The SVP solver's cost is
    exponential in the block dimension (about $2^{0.292\beta}$ for sieving), and BKZ calls it many
    times.

??? question "4. How much memory, in bytes, would a sieve in dimension 300 need by the formula of §6.6?"

    $2^{0.2075 \times 300} \approx 2^{62}$ vectors, times $300 \times 2$ bytes $\approx 2^{9.2}$, about
    $2^{71}$ bytes: around two zettabytes.

??? question "5. For ML-KEM-768 with m = 664, the right side of the 2016 condition is 24.85 at β = 623 and 25.01 at β = 624. Which block size does the attack need, and what are its core-SVP costs?"

    The left side is $\sigma\sqrt\beta$ with $\sigma = 1$: $\sqrt{623} = 24.96 > 24.85$, so 623
    fails, and $\sqrt{624} = 24.98 \le 25.01$, so 624 succeeds. Core-SVP is
    $0.292 \times 624 = 182.2$ bits classically and $0.265 \times 624 = 165.4$ bits with the quantum
    sieve exponent. The Kyber team's script reports 626, 183 and 166; the difference is the
    flat optimum in $m$, the exact form of the exponent, and rounding.

??? question "6. Why can a ciphertext be an easier target than the public key in ML-KEM-512, but not in ML-KEM-768?"

    The ciphertext's $u = A^T r + e_1$ is an LWE instance with secret $r$ and error $e_1$. In
    ML-KEM-512, $r$ comes from $\eta_1 = 3$ but $e_1$ from $\eta_2 = 2$, so the error is smaller
    than in the key and the instance is easier (block size about 394 against 406 in §6.8's
    model), unless the rounding error of compression is counted as extra noise. In ML-KEM-768
    both use $\eta = 2$, the same as the key, and rounding only adds noise, so the key stays the
    weakest instance.

??? question "7. A dual vector has length 1,000 for an LWE instance with q = 3329 and σ = 1. What is its advantage, and how many such vectors would the independence heuristic say are needed against 5^10 guesses?"

    $\varepsilon = \exp(-2\pi^2 \times 1000^2/3329^2) = \exp(-1.78) \approx 0.168$. With
    $T = 5^{10}$, $\ln T \approx 16.1$, so $N \approx \ln T/\varepsilon^2 \approx 16.1/0.0284 \approx 570$
    vectors. That count is exactly what Ducas and Pulles showed can be wrong when the guesses'
    scores are not independent.

??? question "8. What heuristic did Ducas and Pulles question, and why can no scoring function rescue the attack in their contradictory regime?"

    The heuristic that the scores of wrong guesses are independent random variables. The score
    is a periodic function over the primal lattice that is high near every lattice point, so a
    wrong guess scores high whenever its random target falls close to the lattice. In the
    contradictory regime the number of guesses times the chance that a random target lies as
    close to the lattice as the real error is much larger than 1: many wrong targets are as
    close as the right one, so any test of closeness, with any number of dual vectors, ranks
    them alongside it.

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
  dimensions it recovers LWE secrets through Kannan's embedding in seconds, and its short dual
  vectors tell LWE samples from random ones with advantage $\exp(-2\pi^2\sigma^2\|w\|^2/q^2)$.
- The root Hermite factor measures reduction quality; under the geometric series assumption it
  predicts the whole basis profile, which is what attack conditions need.
- BKZ with block size β reaches $\delta_\beta$ at a cost of many SVP calls in dimension β; ML-KEM
  forces β of about 400 to 900. The Chen-Nguyen simulator predicts the reduced profile from the
  Gaussian heuristic in thirty lines, and its answers differ from the GSA's by a few percent.
- For ML-KEM-768 the 2016 condition holds first at β = 624 (core-SVP 182 bits), within two of
  the Kyber team's 626; the key, not the ciphertext, is the weakest instance, unlike in
  ML-KEM-512. Over category 3 the margin is about 8 bits in the RAM gate model and tens of bits
  once memory is charged.
- Enumeration is superexponential with little memory; sieving is $2^{0.292\beta}$ with
  $2^{0.2075\beta}$ memory and sets today's estimates, which run into a memory wall at
  cryptographic sizes.
- The primal attack is the reference; the dual and hybrid attacks are competitive in some
  regimes, and the 2021-22 dual-attack claims were shown to rest on a failing heuristic: in the
  contradictory regime, wrong guesses land as close to the lattice as the right one.
- Public SVP records rose from dimension 155 (2019) to 180 (2021, GPUs) and 200 (2025), with
  210 announced in 2026; ML-KEM-768 sits more than 400 dimensions beyond them, and every large
  sieve so far has been limited by memory.
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
- Erdem Alkim, Léo Ducas, Thomas Pöppelmann and Peter Schwabe, "Post-quantum key exchange: a
  new hope" (USENIX Security 2016): the primal condition and core-SVP.
- Roberto Avanzi, Joppe Bos, Léo Ducas and others, "CRYSTALS-Kyber: Algorithm Specifications
  and Supporting Documentation" (round 3, 2021): the core-SVP, gate-count and memory estimates
  quoted in §6.8.
- Anja Becker, Léo Ducas, Nicolas Gama and Thijs Laarhoven, "New directions in nearest
  neighbor searching with applications to lattice sieving" (SODA 2016).
- Léo Ducas, "Shortest Vector from Lattice Sieving: a Few Dimensions for Free" (EUROCRYPT 2018).
- Shi Bai, Damien Stehlé and Weiqiang Wen, "Measuring, simulating and exploiting the head
  concavity phenomenon in BKZ" (ASIACRYPT 2018).
- Léo Ducas, Marc Stevens and Wessel van Woerden, "Advanced Lattice Sieving on GPUs, with
  Tensor Cores" (EUROCRYPT 2021): the dimension-180 record.
- Eamonn W. Postlethwaite and Fernando Virdia, "On the Success Probability of Solving Unique
  SVP via BKZ" (PKC 2021).
- Qian Guo and Thomas Johansson, "Faster Dual Lattice Attacks for Solving LWE with Applications
  to CRYSTALS" (ASIACRYPT 2021).
- Léo Ducas and Ludo Pulles, "Accurate Score Prediction for Dual-Sieve Attacks" (IACR ePrint
  2023/1850).
- Amaury Pouly and Yixin Shen, "Provable Dual Attacks on Learning with Errors" (EUROCRYPT 2024).
- Xi'an Jiaotong-Liverpool University, announcements of the SVP-200 record (March 2025) and the
  SVP-210 record (January 2026).
- The fpylll library's BKZ simulator (`fpylll.tools.bkz_simulator`), the source of the compact
  simulator in §6.5.
