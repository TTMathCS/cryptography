# 5. Lattices and Their Hard Problems

*Three of the four algorithms NIST has standardized or is standardizing rest on lattices,
and so does most of what is under evaluation. This chapter sets out the lattice problems the
schemes depend on, as an engineer needs them: the q-ary lattices that hide inside every LWE
and SIS instance, the shortest and closest vector problems, the short integer solution
problem behind lattice signatures, and the forms of learning with errors behind lattice
encryption. You will reduce a two-dimensional basis by hand, measure how short a "short"
secret is compared with the lattice around it, find a collision in Ajtai's lattice hash,
watch noise decide whether LWE can be told from random, and break LWE outright with the
Arora-Ge attack when a scheme hands out too many samples with too little noise.*

!!! abstract "In this chapter"
    **You will learn:**

    - what a lattice, a basis and a determinant are, and why some bases are good and others
      bad, with a reduction done by hand and in code;
    - the shortest and closest vector problems and their approximate forms, and the
      Gaussian heuristic that predicts how short the shortest vector is;
    - q-ary lattices, and how SIS and LWE are problems about them;
    - SIS, Ajtai's hash function, and why a collision is a short vector;
    - the search, decision and normal forms of LWE, and the error distributions used;
    - what Regev's and Peikert's reductions prove and what they do not;
    - how the Arora-Ge attack breaks LWE with small errors and many samples, and why ML-KEM
      is out of its reach.

    **You need:** [Chapters 2](02-Security-Levels.md) and [4](04-A-Field-Guide-to-Hard-Problems.md);
    vectors, matrices and arithmetic modulo $q$. Book 1's
    [Chapter 21](../../book/21-Lattice-Cryptography.md) is a gentler first look.
    [Chapter 14 of the mathematics book](../mathematics/14-Lattices.md) proves the lattice
    facts used here and builds LLL in full; this chapter uses them.

    **Levels:** §5.1 to §5.3 are for beginners, §5.4 to §5.10 are intermediate, §5.11 is
    expert.

## 5.1 The problem

*Level: beginner.*

In 1982 Arjen Lenstra, Hendrik Lenstra and László Lovász published an algorithm for a
problem that sounded obscure: given a few vectors with integer coordinates, find short
combinations of them. They needed it to factor polynomials with rational coefficients. Their
algorithm, LLL, turned out to be one of the most useful tools in computational mathematics,
and its first famous use in cryptography was destructive. In 1982 Adi Shamir broke the
Merkle-Hellman knapsack cryptosystem, one of the first public-key schemes, and over the next
years LLL and its descendants broke most of the knapsack schemes that followed. For a decade,
lattices were where public-key cryptosystems went to die.

The turn came in 1996. Miklós Ajtai of IBM Almaden proved that a particular lattice problem
had a property no factoring or discrete-log problem has: if you could solve it for randomly
chosen instances, you could solve a related problem for *every* instance, including the
hardest. Lattices stopped being a weapon only and became a foundation. Within a decade Oded
Regev had defined learning with errors, and within two the foundation carried the main
post-quantum standards.

This chapter is about that foundation as the standards use it. It skips the proofs, which
the mathematics book gives, and concentrates on three questions an engineer must answer
before Chapters 6 to 10 make sense. What is a lattice problem, concretely? How do LWE and
SIS, the problems ML-KEM and ML-DSA cite, become lattice problems? And what goes wrong when
parameters are chosen badly?

## 5.2 Lattices, bases and good bases

*Level: beginner.*

A **lattice** is the set of all integer combinations of some linearly independent vectors
$b_1, \dots, b_n$ in $\mathbb{R}^m$:

$$\mathcal{L}(B) = \{\, x_1 b_1 + \dots + x_n b_n : x_i \in \mathbb{Z} \,\}.$$

The vectors $b_i$, written as the columns (or rows) of a matrix $B$, form a **basis**; $n$ is
the lattice's **rank**. Picture the points of a crystal, or the corners of an infinite sheet
of graph paper that has been stretched and skewed.

**One lattice, many bases.** The same lattice has infinitely many bases. In two dimensions,
$b_1 = (1, 2)$, $b_2 = (6, -3)$ generate a lattice; so do $b_1' = (1001, 1987)$ and
$b_2' = (1002, 1989)$, because each pair is an integer combination of the other with a
matrix of determinant $\pm 1$. The first basis is **good**: short, nearly perpendicular
vectors. The second is **bad**: long vectors pointing almost the same way. Both describe
exactly the same set of points.

**The determinant.** The area (in general, volume) of the parallelogram spanned by a basis
is the same for every basis of the lattice: $\det \mathcal{L} = |\det B|$ for a square basis.
For both bases above it is 15. The determinant measures how dense the lattice is: one point
per 15 units of area.

**Why it matters.** With a good basis, many questions about a lattice are easy: finding a
short vector (it is probably $b_1$) or the lattice point nearest a given point (round off in
the basis coordinates). With a bad basis, the same questions are hard, because rounding in
skewed coordinates lands far from the true answer. Lattice cryptography lives in that gap:
the private key is, in effect, a good basis or a short vector, and the public key is a bad
description of the same lattice. Figure 5.1 shows the two bases.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="A two-dimensional lattice drawn as dots, with a short nearly orthogonal good basis and a long thin bad basis generating the same points" fill="currentColor" font-size="13">
<g fill-opacity=".55">
<circle cx="80" cy="240" r="3"/><circle cx="110" cy="180" r="3"/><circle cx="140" cy="120" r="3"/><circle cx="170" cy="60" r="3"/>
<circle cx="260" cy="285" r="3"/><circle cx="290" cy="225" r="3"/><circle cx="320" cy="165" r="3"/><circle cx="350" cy="105" r="3"/><circle cx="380" cy="45" r="3"/>
<circle cx="200" cy="270" r="3"/><circle cx="230" cy="210" r="3"/><circle cx="260" cy="150" r="3"/><circle cx="290" cy="90" r="3"/><circle cx="320" cy="30" r="3"/>
<circle cx="140" cy="255" r="3"/><circle cx="170" cy="195" r="3"/><circle cx="200" cy="135" r="3"/><circle cx="230" cy="75" r="3"/><circle cx="260" cy="15" r="3"/>
<circle cx="440" cy="240" r="3"/><circle cx="470" cy="180" r="3"/><circle cx="500" cy="120" r="3"/><circle cx="530" cy="60" r="3"/>
<circle cx="380" cy="225" r="3"/><circle cx="410" cy="165" r="3"/><circle cx="440" cy="105" r="3"/><circle cx="470" cy="45" r="3"/>
<circle cx="320" cy="270" r="3"/><circle cx="350" cy="210" r="3"/><circle cx="380" cy="150" r="3"/><circle cx="410" cy="90" r="3"/><circle cx="440" cy="30" r="3"/>
<circle cx="500" cy="255" r="3"/><circle cx="530" cy="195" r="3"/><circle cx="560" cy="135" r="3"/><circle cx="590" cy="75" r="3"/>
</g>
<circle cx="320" cy="165" r="5"/>
<line x1="320" y1="165" x2="350" y2="105" stroke="currentColor" stroke-width="2.6"/>
<line x1="320" y1="165" x2="500" y2="255" stroke="currentColor" stroke-width="2.6"/>
<text x="356" y="100">b₁ (short)</text>
<text x="505" y="275">b₂</text>
<line x1="320" y1="165" x2="560" y2="135" class="acc" stroke-width="2.2"/>
<line x1="320" y1="165" x2="590" y2="75" class="acc" stroke-width="2.2"/>
<text x="566" y="152" class="acc-fill">b₁′</text>
<text x="596" y="70" class="acc-fill">b₂′</text>
<text x="20" y="22">same points, two bases:</text>
<text x="20" y="40">good (black) and bad (accent)</text>
</svg>
<figcaption>Figure 5.1. One lattice, two bases. The bad basis (accent) spans the same points as the good one, but its vectors are long and nearly parallel, so rounding in its coordinates goes badly wrong. Real cryptographic lattices have hundreds of dimensions, where finding a good basis from a bad one is the hard part.</figcaption>
</figure>

**Code it.** In two dimensions a bad basis can always be made good by an algorithm known to
Lagrange and Gauss: repeatedly subtract the nearest integer multiple of the shorter vector
from the longer, and swap, until the longer one stops shrinking. It is the Euclidean
algorithm for vectors.

```python
from math import sqrt

def norm2(v):
    return v[0] * v[0] + v[1] * v[1]

def gauss_reduce(b1, b2):
    """Lagrange-Gauss reduction: returns a basis whose first vector is a shortest vector."""
    steps = 0
    if norm2(b1) > norm2(b2):
        b1, b2 = b2, b1
    while True:
        mu = round((b1[0] * b2[0] + b1[1] * b2[1]) / norm2(b1))
        b2 = (b2[0] - mu * b1[0], b2[1] - mu * b1[1])
        steps += 1
        if norm2(b2) >= norm2(b1):
            return b1, b2, steps
        b1, b2 = b2, b1

bad = ((1001, 1987), (1002, 1989))       # a long, thin basis
good, other, steps = gauss_reduce(*bad)
det = abs(bad[0][0] * bad[1][1] - bad[0][1] * bad[1][0])
print("bad basis lengths: %.1f %.1f" % (sqrt(norm2(bad[0])), sqrt(norm2(bad[1]))))
print("reduced basis:", good, other, "after", steps, "steps")
print("lengths: %.2f %.2f   determinant %d (unchanged)" % (sqrt(norm2(good)), sqrt(norm2(other)), det))
```

Running it prints:

```
bad basis lengths: 2224.9 2227.1
reduced basis: (1, 2) (6, -3) after 2 steps
lengths: 2.24 6.71   determinant 15 (unchanged)
```

Two steps turn vectors of length 2,225 into vectors of length 2.2 and 6.7. In two
dimensions this always works and always finds a shortest vector. LLL generalizes the idea
to any dimension, but in high dimensions it only finds vectors that are short up to an
exponential factor; better reduction costs exponentially more (Chapter 6). That
exponential cost, with nothing like Shor's algorithm to shortcut it, is the whole security
of lattice cryptography.

## 5.3 The shortest and closest vector problems

*Level: beginner.*

Two problems sit at the center.

**The shortest vector problem (SVP).** Given a basis of a lattice, find a nonzero lattice
vector of minimal length. That length is called $\lambda_1(\mathcal{L})$, the first
**successive minimum**.

**The closest vector problem (CVP).** Given a basis and a target point $t$, find the lattice
point closest to $t$.

Both are NP-hard in their exact forms (CVP since 1981, SVP under randomized reductions since
Ajtai in 1998). Cryptography uses **approximate** versions with a factor $\gamma \ge 1$:
$\text{SVP}_\gamma$ asks for a nonzero vector at most $\gamma \lambda_1$ long, and the
**bounded distance decoding** problem (BDD), a CVP variant, promises that the target is
unusually close to the lattice and asks for the nearest point. LWE is a BDD problem; SIS is
an approximate shortest-vector problem in a particular lattice. For the approximation factors
cryptography needs, polynomial in the dimension, these problems are not believed NP-hard,
but no algorithm, classical or quantum, solves them in less than exponential time.

**How short is the shortest vector?** Minkowski's theorem (1889) guarantees that
$\lambda_1 \le \sqrt{n}\, (\det \mathcal{L})^{1/n}$. For a "random" lattice there is a much
sharper prediction, the **Gaussian heuristic**: the number of lattice points in a ball is
about the ball's volume divided by the determinant, so the shortest vector has length about
the radius of the ball whose volume equals $\det \mathcal{L}$:

$$\lambda_1 \approx \text{GH}(\mathcal{L}) = \left(\frac{\det \mathcal{L}}{V_n}\right)^{1/n}
\approx \sqrt{\frac{n}{2\pi e}}\,(\det \mathcal{L})^{1/n},$$

where $V_n$ is the volume of the unit ball in $n$ dimensions. The heuristic is remarkably
accurate for the lattices cryptography uses, and it is the reference point for every
attack: a secret is "planted" if it is much shorter than the Gaussian heuristic, and the
attacker's job is to find a vector that short.

## 5.4 q-ary lattices: where LWE and SIS live

*Level: intermediate.*

Cryptographic lattices are almost never given by an arbitrary basis. They are defined by a
random matrix $A$ modulo $q$, and they come in two kinds.

$$\Lambda_q(A) = \{\, y \in \mathbb{Z}^m : y \equiv A x \pmod q \text{ for some } x \,\},$$

$$\Lambda_q^\perp(A) = \{\, z \in \mathbb{Z}^m : A z \equiv 0 \pmod q \,\}.$$

The first is the set of vectors that are, modulo $q$, combinations of the columns of $A$:
LWE lives there. The second is the set of integer solutions of the homogeneous system $A z
= 0$ modulo $q$: SIS lives there. Both contain every multiple of $q$ in every coordinate,
which is why they are called **q-ary**. They are dual to each other, up to scaling by $q$.

**Their determinants are easy.** For $A$ of size $m \times n$ (with $m > n$ and $A$ of full
rank modulo a prime $q$), $\Lambda_q(A)$ has determinant $q^{m-n}$ and $\Lambda_q^\perp(A^T)$
has determinant $q^n$. So the Gaussian heuristic gives the length of their shortest vectors
directly, without knowing a good basis.

**LWE as a lattice problem.** An LWE instance $b = As + e \pmod q$ says that $b$ is within
distance $\|e\|$ of the lattice point $As \bmod q$ in $\Lambda_q(A)$. Since $e$ is small,
recovering $s$ is a BDD problem in $\Lambda_q(A)$. Equivalently (Kannan's embedding), the
vector $(e, s, 1)$, or a variant of it, is an unusually short vector in a lattice built from
$A$ and $b$: the **primal attack** of Chapter 2 looks for it.

**By hand.** Take $q = 17$, $A = \begin{pmatrix} 5 & 3 \\ 9 & 14 \\ 2 & 11 \end{pmatrix}$,
$s = (1, -1)$ and $e = (1, -1, 0)$. Then $As = (2, -5, -9) \equiv (2, 12, 8)$ and $b = (3, 11,
8)$. The point $(2, 12, 8)$ is in $\Lambda_{17}(A)$; $b$ is at distance $\sqrt 2$ from it.
Meanwhile $\Lambda_{17}(A)$ has determinant $17^{3-2} = 17$ in three dimensions, so its
points are typically about $17^{1/3} \cdot \sqrt{3/(2\pi e)} \approx 1.1$ apart in the
Gaussian-heuristic sense. At this tiny size the error is not small compared with the lattice
spacing, so the instance is not even uniquely solvable; real instances are built so that it
is, with room to spare.

**Code it.** The program computes the Gaussian heuristic for the lattice in which the
primal attack looks for the LWE secret, at a toy size and at the sizes of ML-KEM, and
compares it with the length of the planted vector, whose coefficients are about 1 in size.

```python
from math import pi, e, sqrt, lgamma, exp, log

def gaussian_heuristic(dim, log_det):
    """Expected shortest length in a random lattice: (vol of unit ball)^(-1/n) * det^(1/n)."""
    log_ball = (dim / 2) * log(pi) - lgamma(dim / 2 + 1)
    return exp((log_det - log_ball) / dim)

q = 3329
for name, n, m in [("toy", 20, 40), ("ML-KEM-512 sized", 512, 512), ("ML-KEM-768 sized", 768, 768)]:
    dim = n + m                          # the lattice {(x, y): y = A x mod q}, rank n + m
    log_det = m * log(q)                 # determinant q^m
    gh = gaussian_heuristic(dim, log_det)
    secret_len = sqrt(dim * 1.0)         # secret and error coefficients of size about 1
    print("%-17s dim %4d  shortest expected %.1f  planted short vector %.1f"
          % (name, dim, gh, secret_len))
```

Running it prints:

```
toy               dim   60  shortest expected 436.5  planted short vector 7.7
ML-KEM-512 sized  dim 1024  shortest expected 448.5  planted short vector 32.0
ML-KEM-768 sized  dim 1536  shortest expected 548.7  planted short vector 39.2
```

In every case the planted vector is much shorter than a typical shortest vector, so it *is*
the shortest vector, by a wide margin. The attacker knows exactly what to look for. The
problem is purely one of finding it: in dimension 1,024 the lattice has astronomically many
vectors of length up to the Gaussian heuristic, and reduction algorithms must work through
the geometry to find the one that is much shorter. The ratio between the two columns
controls how much reduction is needed, which is what the block-size calculation of
Chapter 2 measures.

## 5.5 SIS: short integer solutions

*Level: intermediate.*

**The problem.** Given a random matrix $A \in \mathbb{Z}_q^{n \times m}$ with $m$ much larger
than $n$, find a nonzero integer vector $z$ with $Az \equiv 0 \pmod q$ and $\|z\| \le \beta$.
Without the length bound the problem is linear algebra; with it, it is an approximate
shortest vector problem in $\Lambda_q^\perp(A)$.

**Ajtai's hash.** Ajtai's 1996 paper defined, in effect, the function

$$h_A(x) = A x \bmod q \quad \text{for } x \in \{0, 1\}^m.$$

If $m > n \log_2 q$, there are more inputs ($2^m$) than outputs ($q^n$), so collisions
exist. A collision $h_A(x) = h_A(x')$ with $x \ne x'$ gives $A(x - x') \equiv 0$, and $z = x -
x'$ has entries in $\{-1, 0, 1\}$: a short SIS solution. So finding collisions is at least as
hard as SIS, and Ajtai proved SIS is at least as hard as approximating lattice problems in the
worst case. It was the first cryptographic function with such a guarantee.

**Code it.** With $q = 17$, $n = 3$ and $m = 14$, there are $2^{14} = 16{,}384$ inputs and only
$17^3 = 4{,}913$ outputs, so a collision must exist. Finding one by storing outputs is easy at
this size.

```python
import itertools, random

Q, N, M = 17, 3, 14                       # SIS: A is N x M mod Q; find short z with A z = 0

rnd = random.Random(1)
A = [[rnd.randrange(Q) for _ in range(M)] for _ in range(N)]

def h(x):
    """Ajtai's hash: a 0/1 vector of length M to a vector mod Q of length N."""
    return tuple(sum(a * b for a, b in zip(row, x)) % Q for row in A)

seen = {}
for x in itertools.product((0, 1), repeat=M):
    y = h(x)
    if y in seen:
        z = [a - b for a, b in zip(x, seen[y])]
        print("collision:", seen[y], "and", x)
        print("short SIS solution z =", z, " A z mod q =", h(z))
        break
    seen[y] = x
print("inputs %d, outputs %d: a collision must exist" % (2 ** M, Q ** N))
```

Running it prints:

```
collision: (0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1) and (0, 0, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0, 1, 0)
short SIS solution z = [0, 0, 0, 0, 0, 1, 1, 0, 1, 0, 0, -1, 1, -1]  A z mod q = (0, 0, 0)
inputs 16384, outputs 4913: a collision must exist
```

At real sizes the outputs number $q^n$ with $n$ in the hundreds, and the birthday search
needs about $q^{n/2}$ steps; lattice reduction does better but is still exponential.

**Where SIS appears.** Directly, SIS is the hardness assumption behind lattice hash functions
and behind the unforgeability of many lattice signatures. ML-DSA's security proof uses a
variant called **SelfTargetMSIS**, a module version of SIS in which the target is produced
by a hash function; forging a signature is shown to require solving it (Chapter 9). Falcon's
security also reduces to an SIS problem over its NTRU lattice (Chapter 10).

## 5.6 LWE in its several forms

*Level: intermediate.*

**Search LWE.** Given $(A, b = As + e)$ with $A$ uniform in $\mathbb{Z}_q^{m \times n}$, $s$
uniform or small, and $e$ drawn from an error distribution $\chi$, find $s$.

**Decision LWE.** Given $(A, b)$, decide whether $b = As + e$ or $b$ is uniformly random.
Encryption needs the decision form: a ciphertext must look random. For prime $q$ of
polynomial size, decision and search are equivalent (Regev showed a search-to-decision
reduction), so neither is easier in principle.

**Normal form.** The secret may be drawn from the same small distribution as the errors
instead of uniformly, with no loss of hardness (Applebaum, Cash, Peikert and Sahai, 2009).
Every practical scheme does this: ML-KEM's secrets come from the same centered binomial
distribution as its errors. Small secrets make the schemes smaller and their noise easier to
manage.

**Error distributions.** Theory likes the discrete Gaussian: integers $x$ drawn with
probability proportional to $\exp(-x^2/2\sigma^2)$. Practice likes something easier to sample
in constant time. ML-KEM uses the **centered binomial distribution** $\text{CBD}_\eta$: the
difference of two sums of $\eta$ coin flips. It has variance $\eta/2$ and support
$[-\eta, \eta]$; $\eta = 2$ and $\eta = 3$ give the distributions of FIPS 203. ML-DSA's
secrets are uniform in a small range, $[-\eta, \eta]$ with $\eta = 2$ or $4$. Falcon samples
genuine discrete Gaussians, with all the care that requires (Chapter 10).

**How much noise?** The error must be large enough to hide the secret and small enough to
let the owner decrypt. Too little noise and LWE is easy; too much and decryption fails.
Regev's theory asks for $\sigma \ge 2\sqrt n$ roughly; practical schemes use far less, around
1, and rely on the concrete hardness estimates of Chapter 2 rather than the reduction.

**Code it.** In one dimension a distinguisher can try every secret and measure how well the
best one explains the samples. With little noise, real LWE samples fit some secret almost
exactly; uniformly random samples fit nothing. As the noise grows toward $q/2$, the real
samples look as random as random ones.

```python
import random

Q = 3329

def samples(n, m, noise, real, rnd):
    s = [rnd.randrange(Q) for _ in range(n)]
    out = []
    for _ in range(m):
        a = [rnd.randrange(Q) for _ in range(n)]
        b = (sum(x * y for x, y in zip(a, s)) + rnd.randint(-noise, noise)) % Q if real else rnd.randrange(Q)
        out.append((a, b))
    return out

def distinguish(n, sample_set):
    """Guess s's first coordinate by brute force on n = 1: real samples fit some s well."""
    best = None
    for s in range(Q):
        err = sum(min((b - a[0] * s) % Q, (a[0] * s - b) % Q) for a, b in sample_set)
        best = err if best is None or err < best else best
    return best / len(sample_set)

rnd = random.Random(2)
for noise in (2, 50, 400, 1600):
    real = distinguish(1, samples(1, 30, noise, True, rnd))
    fake = distinguish(1, samples(1, 30, noise, False, rnd))
    print("noise +-%4d: best average error, LWE %7.1f   uniform %7.1f" % (noise, real, fake))
```

Running it prints:

```
noise +-   2: best average error, LWE     1.2   uniform   510.0
noise +-  50: best average error, LWE    31.0   uniform   525.4
noise +- 400: best average error, LWE   217.0   uniform   514.6
noise +-1600: best average error, LWE   507.5   uniform   483.4
```

At noise $\pm 2$ the difference is overwhelming; at $\pm 1600$, nearly half the modulus,
the two are indistinguishable. In one dimension the attacker can try every secret; in
hundreds of dimensions it cannot, so the noise needed for security is tiny compared with
$q$, about 1 against 3,329 in ML-KEM. Figure 5.2 shows the picture.

<figure class="mars-fig">
<svg viewBox="0 0 640 230" width="640" role="img" aria-label="Two number lines modulo q: LWE samples clustered near a line through the secret when noise is small, and spread uniformly when noise is large" fill="currentColor" font-size="13">
<text x="20" y="30" font-weight="bold">small noise: b − a·s clusters near 0</text>
<line x1="40" y1="70" x2="600" y2="70" stroke="currentColor"/>
<text x="40" y="92" text-anchor="middle">0</text><text x="320" y="92" text-anchor="middle">q/2</text><text x="600" y="92" text-anchor="middle">q</text>
<g class="acc-fill"><circle cx="44" cy="62" r="3"/><circle cx="48" cy="56" r="3"/><circle cx="41" cy="50" r="3"/><circle cx="596" cy="62" r="3"/><circle cx="592" cy="56" r="3"/><circle cx="52" cy="62" r="3"/><circle cx="598" cy="50" r="3"/><circle cx="46" cy="44" r="3"/></g>
<text x="20" y="140" font-weight="bold">large noise or random b: b − a·s spreads over all of Z_q</text>
<line x1="40" y1="180" x2="600" y2="180" stroke="currentColor"/>
<text x="40" y="202" text-anchor="middle">0</text><text x="320" y="202" text-anchor="middle">q/2</text><text x="600" y="202" text-anchor="middle">q</text>
<g><circle cx="70" cy="172" r="3"/><circle cx="150" cy="172" r="3"/><circle cx="215" cy="166" r="3"/><circle cx="290" cy="172" r="3"/><circle cx="360" cy="166" r="3"/><circle cx="420" cy="172" r="3"/><circle cx="480" cy="166" r="3"/><circle cx="555" cy="172" r="3"/></g>
</svg>
<figcaption>Figure 5.2. Decision LWE in one picture. With the right secret, real samples leave small remainders (accent); random samples leave remainders anywhere. In high dimensions the attacker cannot try every secret, so even small noise hides the cluster.</figcaption>
</figure>

## 5.7 What the reductions prove

*Level: intermediate.*

**Regev (2005).** If an efficient algorithm solves LWE with modulus $q$ and Gaussian error of
width $\alpha q \ge 2\sqrt n$, then an efficient *quantum* algorithm solves the approximate
shortest vector problem (in a form called GapSVP or SIVP) in *every* $n$-dimensional lattice,
to within factors about $n / \alpha$. The quantum step is used inside the proof, to turn a
BDD solver into samples of a discrete Gaussian on the dual lattice. It is not an attack; it
is the reason the reduction speaks of quantum algorithms at all.

**Peikert (2009)** and **Brakerski, Langlois, Peikert, Regev and Stehlé (2013)** gave
classical reductions, with some loss: Peikert's needs an exponentially large modulus for the
GapSVP version; the 2013 paper removed that at the cost of a larger dimension.

**What they mean.** A reduction says: *if* worst-case lattice problems are hard, *then*
random LWE instances are hard, for parameters satisfying the theorem's conditions. It rules
out a whole class of attacks, those that exploit the randomness of the instance. It does not
say how hard: the worst-case problems are believed to need time $2^{\Theta(n)}$, but the
constants are not known, and the theorem's parameter conditions (Gaussian error of width at
least $2\sqrt n$, for one) are not met by ML-KEM's small binomial noise.

So the practical position, accepted by NIST and by the designers, is this. The reductions
show that LWE is a sound *kind* of problem, with no hidden weakness of the sort that killed
knapsacks. The concrete parameters come from the best known attacks, analysed with the
estimators of Chapter 6, with a margin. This is the same epistemic position as RSA, whose key
sizes come from the number field sieve and not from any proof.

!!! note "Life story: Ajtai's worst-case to average-case reduction"
    **Born:** 1996, Miklós Ajtai at IBM Almaden, "Generating hard instances of lattice
    problems" (STOC 1996) · **Purpose:** to show that random instances of a lattice problem
    (what became SIS) are as hard as the hardest instances of approximate lattice problems ·
    **Helped:** the first public-key-relevant problem with such a guarantee; with Ajtai and
    Dwork's 1997 encryption scheme, started the theory that led to LWE, ML-KEM and ML-DSA ·
    **Status:** foundational; the reduction's parameters are far from practical ones, and
    real parameters come from attacks

## 5.8 Structure: rings, modules and NTRU

*Level: intermediate.*

Plain LWE has a cost: the matrix $A$ has $mn$ entries. For $n = m = 768$ and $q = 3329$,
that is 590,000 numbers of 12 bits each, about 880 kilobytes, far too large for a public
key. (FrodoKEM, which uses plain LWE, regenerates $A$ from a short seed, but still has
ciphertexts and keys of 10 to 20 kilobytes and is slower.)

The fix is structure. In **Ring-LWE** (Lyubashevsky, Peikert and Regev, 2010) each element is
a polynomial in $\mathbb{Z}_q[x]/(x^n + 1)$, and one random polynomial $a$ stands for an
$n \times n$ matrix whose rows are its "negacyclic" rotations. In **Module-LWE** (Langlois and
Stehlé, 2015) the matrix is a small $k \times k$ matrix of such polynomials, giving a
dial between plain LWE ($n = 1$) and Ring-LWE ($k = 1$). ML-KEM and ML-DSA are Module-LWE
schemes with polynomials of degree 256 and $k$ from 2 to 8. **NTRU** (1996) uses a different
structure, a quotient of two small polynomials, and is the basis of Falcon.

The reductions carry over, to worst-case problems on *ideal* and *module* lattices, which
have extra symmetry. Whether that symmetry helps an attacker is the main open question of
lattice cryptography. For some ideal lattices with unusually small errors, quantum attacks
are known (Cramer, Ducas, Peikert and Regev, 2016, and follow-ups), but they do not reach
Ring-LWE or Module-LWE at the parameters used. Module-LWE, with its smaller degree of
symmetry, was chosen partly as a hedge. Chapter 7 builds the rings, and
[Chapter 15 of the mathematics book](../mathematics/15-Learning-with-Errors.md) proves their
properties.

## 5.9 Break it: the Arora-Ge attack

*Level: intermediate.*

LWE's security depends on three things together: the dimension, the noise, and the number
of samples the attacker sees. Sanjeev Arora and Rong Ge showed in 2011 that if the noise
takes only a few values and the attacker has many samples, LWE becomes linear algebra.

**The idea.** If each error $e$ lies in $\{-1, 0, 1\}$, then every sample $(a, b)$ satisfies

$$(b - \langle a, s\rangle)(b - \langle a, s\rangle - 1)(b - \langle a, s\rangle + 1) = 0
\pmod q,$$

because one of the three factors is zero. That is a polynomial equation of degree 3 in the
unknowns $s_1, \dots, s_n$, with no error at all. Expand it and treat every monomial
($s_1$, $s_1 s_2$, $s_1^2 s_3$, and so on) as a separate unknown: this **linearization** turns
the system into linear equations in about $\binom{n+3}{3}$ unknowns. With that many samples,
Gaussian elimination solves it, and the linear monomials give $s$ directly.

**Code it.** With $n = 4$ there are 34 monomials of degree 1 to 3. The program shows that 20
samples are not enough, that 34 are, and that the secret can be any vector modulo $q$; the
attack does not care how large $s$ is, only how few values the error takes.

```python
import itertools, random

Q, N = 3329, 4

def monomials(n, deg):
    """All monomials of degree <= deg in n variables, as tuples of variable indices."""
    out = []
    for d in range(deg + 1):
        out += list(itertools.combinations_with_replacement(range(n), d))
    return out

def poly_mul(p, r):
    out = {}
    for a, ca in p.items():
        for b, cb in r.items():
            key = tuple(sorted(a + b))
            out[key] = (out.get(key, 0) + ca * cb) % Q
    return out

def equation(a, b):
    """(b - <a,s>) * (b - <a,s> - 1) * (b - <a,s> + 1) = 0, expanded in the s_i."""
    lin = {(): b % Q}
    for i, ai in enumerate(a):
        lin[(i,)] = -ai % Q
    p = {(): 1}
    for shift in (0, -1, 1):
        f = dict(lin); f[()] = (f[()] + shift) % Q
        p = poly_mul(p, f)
    return p

def solve_mod(rows, rhs):
    """Gaussian elimination modulo the prime Q; returns one solution."""
    m, n = len(rows), len(rows[0])
    M = [rows[i] + [rhs[i]] for i in range(m)]
    piv_cols, r = [], 0
    for c in range(n):
        p = next((i for i in range(r, m) if M[i][c]), None)
        if p is None:
            continue
        M[r], M[p] = M[p], M[r]
        inv = pow(M[r][c], Q - 2, Q)
        M[r] = [x * inv % Q for x in M[r]]
        for i in range(m):
            if i != r and M[i][c]:
                f = M[i][c]
                M[i] = [(x - f * y) % Q for x, y in zip(M[i], M[r])]
        piv_cols.append(c); r += 1
    x = [0] * n
    for i, c in enumerate(piv_cols):
        x[c] = M[i][n]
    return x, len(piv_cols)

rnd = random.Random(7)
s = [rnd.randrange(Q) for _ in range(N)]          # any secret, even a large one
mons = monomials(N, 3)
for samples in (20, 34, 60):
    rows, rhs = [], []
    for _ in range(samples):
        a = [rnd.randrange(Q) for _ in range(N)]
        b = (sum(x * y for x, y in zip(a, s)) + rnd.choice((-1, 0, 1))) % Q
        p = equation(a, b)
        rows.append([p.get(mn, 0) for mn in mons[1:]])
        rhs.append(-p.get((), 0) % Q)
    x, rank = solve_mod(rows, rhs)
    guess = [x[mons[1:].index((i,))] for i in range(N)]
    print("%2d samples: %d unknowns, rank %2d, secret found: %s"
          % (samples, len(mons) - 1, rank, guess == s))
```

Running it prints:

```
20 samples: 34 unknowns, rank 20, secret found: False
34 samples: 34 unknowns, rank 34, secret found: True
60 samples: 34 unknowns, rank 34, secret found: True
```

**Why ML-KEM is safe from it.** For errors with $d$ possible values the equations have degree
$d$ and the number of monomials grows like $n^d$. ML-KEM-768's errors take 5 values
($\eta = 2$) in dimension 768, so Arora-Ge would need on the order of $768^5 / 5! \approx 2^{41}$
samples and the elimination would cost far more, about $2^{120}$ or worse with the best
variants using Gröbner bases. And the attacker does not get those samples: an ML-KEM public
key is exactly $768$ samples (Chapter 8), and ciphertexts add only a few hundred more per
encapsulation, each with fresh secrets. The general rule: **never let an attacker collect
many LWE samples with the same secret**. Schemes that leak samples, through key reuse
without the FO transform for instance (Chapter 3), can fall to this and related attacks.

**Fix it.** Wider error distributions (more possible values), fewer samples per secret, and
the FO transform's protection against crafted queries. Every standardized scheme does all
three.

## 5.10 In the real world

*Level: intermediate.*

**Challenges and records.** Since 2010 the Technische Universität Darmstadt has run public
lattice challenges: SVP in random lattices, approximate SVP in ideal lattices, and LWE
instances of growing size. They calibrate attack estimates the way RSA challenge numbers
calibrate factoring. The record exact SVP computations reached about dimension 180 around
2021, using the G6K sieving framework on GPUs (Ducas, Stevens and van Woerden); cryptographic
attacks would need effective dimensions of 400 and more. The extrapolation from 180 to 400
is the uncertainty behind every security estimate in Chapter 2, and it shrinks as records
are set.

**Parameter history.** Lattice parameters have moved, slowly and in one direction. NTRU's
original 1996 parameters were raised several times as lattice reduction and hybrid attacks
improved; NewHope (2016) and Kyber (2017) were designed with deliberately conservative
core-SVP estimates; and in the NIST process several submissions adjusted parameters after
the dual attack and its variants were refined. None of these adjustments was a break. They
were the slow drift that Chapter 2 warned about, and the reason designers leave margins.

**The NIST picture.** Of the KEMs and signatures NIST selected or is evaluating, ML-KEM and
ML-DSA rest on Module-LWE and Module-SIS, Falcon on NTRU and SIS over NTRU lattices, and HAWK
(in the signature on-ramp) on a lattice isomorphism problem. FrodoKEM, recommended by some
European agencies, rests on plain LWE. The breadth of lattice use is both the strength of
the family, since many experts study it, and its concentration risk.

## 5.11 Going deeper

*Level: expert.*

**Dual lattices and transference.** The dual of a lattice $\mathcal{L}$ is $\mathcal{L}^* =
\{y : \langle y, x\rangle \in \mathbb{Z} \text{ for all } x \in \mathcal{L}\}$. For q-ary
lattices, $\Lambda_q^\perp(A) = q \cdot \Lambda_q(A^T)^*$. Banaszczyk's transference theorems
bound $\lambda_1(\mathcal{L}) \cdot \lambda_n(\mathcal{L}^*) \le n$, which links short vectors
in one lattice to the covering behavior of the other. The **dual attack** on LWE uses a short
vector $w$ of $\Lambda_q^\perp(A^T)$ (that is, $w^T A \equiv 0$): then $\langle w, b\rangle =
\langle w, e\rangle$ is small for LWE samples and uniform for random ones. Refinements in 2021
to 2023 (by Guo and Johansson, and by MATZOV, the Israeli Defense Forces' cryptography unit)
claimed the dual attack beat the primal on Kyber by several bits; Ducas and Pulles (2023)
showed that some of these analyses relied on a heuristic that fails in the relevant regime.
The matter was still debated in 2026; the estimator reports both attacks.

**Smoothing and discrete Gaussians.** The **smoothing parameter** $\eta_\varepsilon
(\mathcal{L})$ (Micciancio and Regev, 2004) is the Gaussian width above which a discrete
Gaussian on $\mathcal{L}$ looks like a continuous one modulo the lattice. It appears in every
reduction and in GPV signatures: sampling above the smoothing parameter of the private basis
makes signatures independent of that basis (Chapter 10).

**Hardness of the module problems.** Langlois and Stehlé proved worst-case to average-case
reductions for Module-LWE from module lattice problems; Albrecht and Deo (2017) showed that
Module-LWE in rank $k$ and degree $n$ reduces to Ring-LWE in degree $kn$ with a larger
modulus, so the module family is at least as hard as ring problems of the same total
dimension, with some care about parameters. Whether module structure costs any concrete
security against the best attacks is, as far as public knowledge goes, no: the estimates
treat ML-KEM's lattices as unstructured of dimension $kn$.

**Arora-Ge with Gröbner bases.** Albrecht, Cid, Faugère, Fitzpatrick and Perret (2015)
analysed Arora-Ge with Gröbner basis algorithms, which need fewer samples than plain
linearization, and found it competitive only for very small error widths or binary errors
with many samples. Binary-error LWE with $m = O(n)$ samples remains hard (Micciancio and
Peikert, 2013), but with $m = \Omega(n^2)$ samples it falls, which is why schemes with very
narrow noise limit samples strictly.

## Check yourself

??? question "1. Show that (1001, 1987), (1002, 1989) and (1, 2), (6, -3) have the same determinant up to sign."

    $1001 \times 1989 - 1987 \times 1002 = 1{,}990{,}989 - 1{,}990{,}974 = 15$, and $1 \times
    (-3) - 2 \times 6 = -15$. Same absolute value, as it must be for two bases of one lattice.

??? question "2. Use the approximation GH ≈ sqrt(n / 2πe) · det^(1/n) for a 100-dimensional lattice of determinant 2^300. About how long is its shortest vector?"

    $\det^{1/n} = 2^3 = 8$ and $\sqrt{100/(2\pi e)} \approx \sqrt{5.86} \approx 2.42$, so about
    $19.4$.

??? question "3. Why is a collision in Ajtai's hash a short SIS solution?"

    If $Ax \equiv Ax' \pmod q$ with $x \ne x'$ in $\{0,1\}^m$, then $A(x - x') \equiv 0$ and
    $z = x - x'$ is a nonzero vector with entries in $\{-1, 0, 1\}$, so $\|z\| \le \sqrt m$.

??? question "4. What does the normal form of LWE change, and why do practical schemes use it?"

    The secret is drawn from the small error distribution instead of uniformly modulo $q$. It
    keeps the same hardness (Applebaum and others, 2009) and lets keys and noise stay small,
    which simplifies decryption and shrinks parameters.

??? question "5. What are the mean, variance and support of the centered binomial distribution with η = 3?"

    Mean 0, variance $\eta/2 = 1.5$, support $\{-3, \dots, 3\}$. The probabilities are
    $\binom{6}{3+k}/64$ for $k = -3, \dots, 3$: $1, 6, 15, 20, 15, 6, 1$ over 64.

??? question "6. Regev's reduction is 'quantum'. Does that mean a quantum computer can break LWE?"

    No. The reduction uses a quantum algorithm inside the proof to turn an LWE solver into a
    lattice solver. It says that a classical or quantum LWE solver would give a quantum
    algorithm for worst-case lattice problems, which nobody knows how to build. It is evidence
    of hardness, not an attack.

??? question "7. In the Arora-Ge attack with errors in {-2, ..., 2}, what is the degree of each equation?"

    Five: the product $\prod_{e=-2}^{2}(b - \langle a, s\rangle - e)$ vanishes for every sample,
    a polynomial of degree 5 in the $s_i$.

??? question "8. Why does the Arora-Ge attack not care whether the secret is small?"

    Because the equations are exact polynomial identities in $s$ over $\mathbb{Z}_q$; solving
    the linearized system gives the values of the monomials, including $s_i$ themselves,
    whatever their size. Only the error's set of values matters.

??? question "9. Plain LWE with n = m = 768 and q = 3329 needs a matrix of how many bytes, and how does FrodoKEM avoid sending it?"

    $768 \times 768 = 589{,}824$ entries of 12 bits, about 885,000 bytes. FrodoKEM sends a short
    seed and both parties regenerate the matrix from it with AES or SHAKE.

??? question "10. What did Ducas and Pulles show about the 2021-23 dual-attack estimates?"

    That some of them relied on an independence heuristic that does not hold in the regime
    used, so the claimed advantage of the dual attack over the primal attack on Kyber was not
    established. The question of the exact best attack stayed open.

## What you learned

- A lattice is the set of integer combinations of a basis; one lattice has many bases, and a
  good (short, nearly orthogonal) basis makes hard problems easy. Gauss reduction does it in
  two dimensions; in high dimensions it is exponentially costly.
- SVP and CVP and their approximate forms are the hard problems. The Gaussian heuristic
  predicts the length of the shortest vector, and cryptographic secrets are planted far below
  it.
- LWE and SIS are problems in q-ary lattices: LWE a bounded distance decoding problem in
  $\Lambda_q(A)$, SIS a short vector problem in $\Lambda_q^\perp(A)$. A collision in Ajtai's hash
  is an SIS solution.
- LWE comes in search, decision and normal forms; practical schemes use small secrets and
  centered binomial or uniform small errors.
- Regev's and Peikert's reductions show LWE is a sound kind of problem; concrete parameters
  come from attacks.
- Ring, module and NTRU structure make keys small; whether the structure helps attackers is
  the main open question, and so far the answer is no at standard parameters.
- Arora-Ge breaks LWE with few error values and many samples; schemes limit samples and use
  the FO transform.

**Next:** [Chapter 6](06-Lattice-Reduction-and-the-Estimator.md), the attacks: LLL, BKZ,
sieving, and how the security estimates for ML-KEM are made.

## Further reading

- Arjen K. Lenstra, Hendrik W. Lenstra Jr. and László Lovász, "Factoring polynomials with
  rational coefficients", *Mathematische Annalen* 261 (1982).
- Adi Shamir, "A polynomial time algorithm for breaking the basic Merkle-Hellman
  cryptosystem" (CRYPTO 1982; *IEEE Transactions on Information Theory* 1984).
- Miklós Ajtai, "Generating hard instances of lattice problems" (STOC 1996); "The shortest
  vector problem in L2 is NP-hard for randomized reductions" (STOC 1998).
- Oded Regev, "On lattices, learning with errors, random linear codes, and cryptography",
  *Journal of the ACM* 56 (2009).
- Chris Peikert, "Public-key cryptosystems from the worst-case shortest vector problem" (STOC
  2009); "A Decade of Lattice Cryptography", *Foundations and Trends in Theoretical Computer
  Science* 10 (2016).
- Zvika Brakerski, Adeline Langlois, Chris Peikert, Oded Regev and Damien Stehlé, "Classical
  hardness of learning with errors" (STOC 2013).
- Benny Applebaum, David Cash, Chris Peikert and Amit Sahai, "Fast cryptographic primitives
  and circular-secure encryption based on hard learning problems" (CRYPTO 2009).
- Vadim Lyubashevsky, Chris Peikert and Oded Regev, "On ideal lattices and learning with
  errors over rings" (EUROCRYPT 2010).
- Adeline Langlois and Damien Stehlé, "Worst-case to average-case reductions for module
  lattices", *Designs, Codes and Cryptography* 75 (2015).
- Sanjeev Arora and Rong Ge, "New algorithms for learning in presence of errors" (ICALP 2011).
- Martin Albrecht, Carlos Cid, Jean-Charles Faugère, Robert Fitzpatrick and Ludovic Perret,
  "Algebraic algorithms for LWE problems", *ACM Communications in Computer Algebra* (2015).
- Daniele Micciancio and Oded Regev, "Worst-case to average-case reductions based on Gaussian
  measures" (FOCS 2004); "Lattice-based Cryptography", in *Post-Quantum Cryptography*
  (Springer, 2009).
- Léo Ducas, Marc Stevens and Wessel van Woerden, "Advanced lattice sieving on GPUs, with
  tensor cores" (EUROCRYPT 2021).
- Léo Ducas and Ludo Pulles, "Does the dual-sieve attack on learning with errors even work?"
  (CRYPTO 2023).
- Ronald Cramer, Léo Ducas, Chris Peikert and Oded Regev, "Recovering short generators of
  principal ideals in cyclotomic rings" (EUROCRYPT 2016).
