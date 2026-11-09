# 5. Lattices and Their Hard Problems

*Three of the four algorithms NIST has standardized or is standardizing rest on lattices,
and so does most of what is under evaluation. This chapter sets out the lattice problems the
schemes depend on, as an engineer needs them: the q-ary lattices that hide inside every LWE
and SIS instance, the shortest and closest vector problems, the short integer solution
problem behind lattice signatures, the forms of learning with errors behind lattice
encryption, and the structured versions the standards actually use. You will reduce a
basis by hand, write down q-ary lattices, test the Gaussian heuristic, find a collision in
Ajtai's hash, turn a decision oracle for LWE into a secret-finder, recover an LWE error with
Kannan's embedding and LLL, rebuild a short generator as the 2016 ideal-lattice attacks do,
and break LWE with Arora-Ge when a scheme hands out too many samples with too little noise.*

!!! abstract "In this chapter"
    **You will learn:**

    - what a lattice, a basis and a determinant are, and why some bases are good and others
      bad, with a reduction done by hand and in code;
    - the shortest and closest vector problems and their approximate forms, and the
      Gaussian heuristic: how well it predicts in small dimensions, and what it says at the
      sizes of ML-KEM and ML-DSA;
    - q-ary lattices $\Lambda_q(A)$ and $\Lambda_q^\perp(A)$, worked by hand with their bases
      and determinants, and how SIS and LWE are problems about them;
    - SIS, Ajtai's hash function, the Hermite bound on how short an SIS solution can be found,
      and why forging an ML-DSA signature means solving SIS;
    - the search, decision and normal forms of LWE, the error distributions used, and how a
      decision oracle finds the secret;
    - Kannan's embedding, which turns LWE into a unique shortest vector problem;
    - what Regev's and Peikert's reductions prove and what they do not, and how the field got
      from Ajtai (1996) to the standards;
    - Ring-LWE, Module-LWE and the NTRU problem, and what is and is not proved about each;
    - the 2014 to 2021 attacks on ideal lattices, and why they stop short of Module-LWE;
    - how the Arora-Ge attack breaks LWE with small errors and many samples, and why ML-KEM
      is out of its reach.

    **You need:** [Chapters 2](02-Security-Levels.md) and [4](04-A-Field-Guide-to-Hard-Problems.md);
    vectors, matrices and arithmetic modulo $q$. Book 1's
    [Chapter 21](../../book/21-Lattice-Cryptography.md) is a gentler first look.
    [Chapter 14 of the mathematics book](../mathematics/14-Lattices.md) proves the lattice
    facts used here and builds LLL in full, and
    [Chapter 15 of the mathematics book](../mathematics/15-Learning-with-Errors.md) builds LWE,
    its rings and the outline of Regev's proof; this chapter uses them.
    [Chapter 15 of the cryptanalysis book](../cryptanalysis/15-Lattices-as-a-Weapon.md) shows
    the same tools used against older schemes.

    **Levels:** §5.1 to §5.3 are for beginners; §5.4 to §5.9, §5.11 and §5.12 are
    intermediate; §5.10 and §5.13 are expert.

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

### Testing the heuristic

The heuristic is an argument about volume, not a theorem, so it is worth checking against
lattices small enough to search completely. The shortcut $\sqrt{n/(2\pi e)}$ for
$V_n^{-1/n}$ comes from Stirling's formula and is poor in small dimensions (0.42 in
dimension 3, where the exact value is 0.62), so code should use $V_n = \pi^{n/2}/\Gamma(n/2 +
1)$ through the log-gamma function. And the heuristic describes an average: one lattice can
sit well above or below it.

**By hand.** Take $q = 10{,}007$, a prime, and the lattice of integer vectors $z \in
\mathbb{Z}^4$ with $a \cdot z \equiv 0 \pmod q$ for a fixed random vector $a$. One congruence
keeps one integer point in $q$, so the determinant is $q$ (§5.4 says why). The unit ball in
four dimensions has volume $\pi^2/2 \approx 4.935$, so

$$\text{GH} = \left(\frac{10{,}007}{4.935}\right)^{1/4} = 2{,}027.8^{1/4} \approx 6.71.$$

Minkowski's bound for the same lattice is $\sqrt 4 \cdot 10{,}007^{1/4} \approx 2 \times 10.0
= 20.0$. That one is a guarantee, but it is three times looser than the estimate.

**Code it.** The program draws random $a$ in dimensions 2 to 7, finds the exact shortest
vector of each lattice, and compares the average with the heuristic. The search fixes the
first $m - 1$ coordinates in a box $[-R, R]$ and solves the congruence for the last one. If
the best vector it finds is no longer than $R$, every shorter vector would have all its
coordinates inside the box too, so the answer is exact; if not, the box grows.

```python
import itertools, random
from math import pi, lgamma, log, exp, sqrt

def gh(dim, log_det):
    log_ball = (dim / 2) * log(pi) - lgamma(dim / 2 + 1)
    return exp((log_det - log_ball) / dim)

def shortest(a, q):
    """Exact shortest nonzero z with a.z = 0 mod q, by search in a growing box."""
    m, inv = len(a), pow(a[-1], q - 2, q)
    R = 1
    while True:
        best = None
        for z in itertools.product(range(-R, R + 1), repeat=m - 1):
            last = -inv * sum(x * y for x, y in zip(a, z)) % q
            last = last - q if last > q // 2 else last
            n2 = sum(x * x for x in z) + last * last
            if n2 and (best is None or n2 < best):
                best = n2
        if best is not None and sqrt(best) <= R:   # every shorter vector lies in the box
            return sqrt(best)
        R += 1

q, rnd = 10007, random.Random(5)
print("dim  Gaussian heuristic  actual (mean of 12)  ratio")
for m in range(2, 8):
    act = [shortest([rnd.randrange(1, q) for _ in range(m)], q) for _ in range(12)]
    g = gh(m, log(q))
    print("%3d  %18.2f  %18.2f  %5.2f" % (m, g, sum(act) / 12, sum(act) / 12 / g))
```

It prints:

```text
dim  Gaussian heuristic  actual (mean of 12)  ratio
  2               56.44               70.02   1.24
  3               13.37               14.54   1.09
  4                6.71                7.08   1.05
  5                4.53                4.79   1.06
  6                3.53                3.59   1.02
  7                2.99                3.21   1.08
```

From dimension 3 on, the prediction is within 10 percent of the truth even at these tiny
sizes (Figure 5.2); in dimension 2 the volume argument is too coarse. Experiments on random
lattices of 50 dimensions and more agree with it closely, which is why the estimators of
Chapter 6 use it without correction. LWE lattices are where it fails on purpose: a short
vector has been planted, and the heuristic describes everything *except* that vector.

<figure class="mars-fig">
<svg viewBox="0 0 640 310" width="640" role="img" aria-label="Chart: for random q-ary lattices of dimension 2 to 7 with q = 10007, the Gaussian heuristic and the true average shortest length are close, with the true value 2 to 24 percent above the prediction" fill="currentColor" font-size="13">
<line x1="80" y1="40" x2="80" y2="250" stroke="currentColor"/><line x1="80" y1="250" x2="600" y2="250" stroke="currentColor"/>
<line x1="76" y1="250" x2="600" y2="250" stroke="currentColor" stroke-opacity=".15"/><text x="70" y="254" text-anchor="end">2</text>
<line x1="76" y1="200" x2="600" y2="200" stroke="currentColor" stroke-opacity=".15"/><text x="70" y="204" text-anchor="end">5</text>
<line x1="76" y1="163" x2="600" y2="163" stroke="currentColor" stroke-opacity=".15"/><text x="70" y="167" text-anchor="end">10</text>
<line x1="76" y1="125" x2="600" y2="125" stroke="currentColor" stroke-opacity=".15"/><text x="70" y="129" text-anchor="end">20</text>
<line x1="76" y1="75" x2="600" y2="75" stroke="currentColor" stroke-opacity=".15"/><text x="70" y="79" text-anchor="end">50</text>
<circle cx="121" cy="69" r="5" fill="none" stroke="currentColor" stroke-width="2"/>
<circle cx="139" cy="57" r="5"/>
<text x="130" y="45" text-anchor="middle" fill-opacity=".7">1.24</text>
<text x="130" y="270" text-anchor="middle">2</text>
<circle cx="206" cy="147" r="5" fill="none" stroke="currentColor" stroke-width="2"/>
<circle cx="224" cy="142" r="5"/>
<text x="215" y="130" text-anchor="middle" fill-opacity=".7">1.09</text>
<text x="215" y="270" text-anchor="middle">3</text>
<circle cx="291" cy="184" r="5" fill="none" stroke="currentColor" stroke-width="2"/>
<circle cx="309" cy="181" r="5"/>
<text x="300" y="169" text-anchor="middle" fill-opacity=".7">1.06</text>
<text x="300" y="270" text-anchor="middle">4</text>
<circle cx="376" cy="206" r="5" fill="none" stroke="currentColor" stroke-width="2"/>
<circle cx="394" cy="203" r="5"/>
<text x="385" y="191" text-anchor="middle" fill-opacity=".7">1.06</text>
<text x="385" y="270" text-anchor="middle">5</text>
<circle cx="461" cy="219" r="5" fill="none" stroke="currentColor" stroke-width="2"/>
<circle cx="479" cy="218" r="5"/>
<text x="470" y="206" text-anchor="middle" fill-opacity=".7">1.02</text>
<text x="470" y="270" text-anchor="middle">6</text>
<circle cx="546" cy="228" r="5" fill="none" stroke="currentColor" stroke-width="2"/>
<circle cx="564" cy="224" r="5"/>
<text x="555" y="212" text-anchor="middle" fill-opacity=".7">1.07</text>
<text x="555" y="270" text-anchor="middle">7</text>
<text x="340" y="292" text-anchor="middle">dimension m (lattice of z with a·z ≡ 0 mod 10007)</text>
<text x="20" y="28">shortest length (log scale)</text>
<circle cx="430" cy="24" r="5" fill="none" stroke="currentColor" stroke-width="2"/><text x="442" y="28">Gaussian heuristic</text>
<circle cx="430" cy="44" r="5"/><text x="442" y="48">actual, mean of 12</text>
</svg>
<figcaption>Figure 5.2. The Gaussian heuristic (rings) against the true average shortest length (dots) for random lattices of vectors z with a·z ≡ 0 mod 10,007, twelve per dimension; the numbers are the ratios of truth to prediction.</figcaption>
</figure>

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
has determinant $q^n$. The reason is counting: $\Lambda_q(A)$ contains $q^n$ of the $q^m$
points of each $q \times q \times \dots \times q$ box (one for each $x$ modulo $q$), so it
has one point per $q^{m-n}$ units of volume; $\Lambda_q^\perp(A^T)$ is cut out by $n$
independent congruences, each of which keeps one point in $q$. So the Gaussian heuristic
gives the length of their shortest vectors directly, without knowing a good basis.

### By hand: two q-ary lattices in the plane

Take $q = 7$, $m = 2$, $n = 1$ and the single column $A = (1, 3)^T$.

$\Lambda_7(A)$ is the set of integer vectors congruent modulo 7 to a multiple of $(1, 3)$:
$(0, 0)$, $(1, 3)$, $(2, 6)$, $(3, 2)$, $(4, 5)$, $(5, 1)$, $(6, 4)$, and everything obtained
from these by adding multiples of 7 to either coordinate. A basis is $(1, 3)$ and $(0, 7)$:
any $y$ in the lattice equals $y_1 \cdot (1, 3)$ plus a multiple of $(0, 7)$, because
$y_2 \equiv 3 y_1$. Its determinant is $|1 \cdot 7 - 3 \cdot 0| = 7 = q^{m-n}$, one point in
every 7 units of area, as you can count in the shaded square of Figure 5.3. The shortest
vectors are $\pm(2, -1)$, of length $\sqrt 5$, because $2 \cdot 3 = 6 \equiv -1$.

$\Lambda_7^\perp(A^T)$ is the set of integer $z$ with $z_1 + 3 z_2 \equiv 0 \pmod 7$. A basis
is $(7, 0)$ and $(4, 1)$, with determinant $7 = q^n$, and its shortest vectors are $\pm(1, 2)$,
again of length $\sqrt 5$. The two are duals up to a factor of 7: the dual basis of $(1, 3),
(0, 7)$ is $(1, 0), (-3/7, 1/7)$, and 7 times that generates the same lattice as $(7, 0), (4,
1)$. Short vectors of one are perpendicular to short vectors of the other: $(2, -1) \cdot (1,
2) = 0$.

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="Two q-ary lattices for q = 7 and A = (1, 3): on the left the points y congruent to x times (1, 3) mod 7, on the right the points z with z1 + 3 z2 divisible by 7; both repeat in every 7 by 7 square and both have determinant 7" fill="currentColor" font-size="13">
<text x="50" y="22" font-weight="bold">Λ₇(A): y ≡ x·(1, 3)</text>
<rect x="50" y="158" width="112" height="112" fill="currentColor" fill-opacity=".07" stroke="currentColor" stroke-dasharray="4 3"/>
<line x1="50" y1="270" x2="274" y2="270" stroke="currentColor" stroke-opacity=".4"/><line x1="50" y1="270" x2="50" y2="46" stroke="currentColor" stroke-opacity=".4"/>
<path d="M50,270h0M50,158h0M50,46h0M66,222h0M66,110h0M82,174h0M82,62h0M98,238h0M98,126h0M114,190h0M114,78h0M130,254h0M130,142h0M146,206h0M146,94h0M162,270h0M162,158h0M162,46h0M178,222h0M178,110h0M194,174h0M194,62h0M210,238h0M210,126h0M226,190h0M226,78h0M242,254h0M242,142h0M258,206h0M258,94h0M274,270h0M274,158h0M274,46h0" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>
<line x1="50" y1="270" x2="66" y2="222" stroke="currentColor" stroke-width="2.4"/>
<line x1="50" y1="270" x2="50" y2="158" stroke="currentColor" stroke-width="2.4"/>
<line x1="162" y1="158" x2="194" y2="174" class="acc" stroke-width="3"/>
<text x="200" y="170" class="acc-fill">(2, −1)</text>
<text x="166" y="286" fill-opacity=".7">7</text><text x="270" y="286" fill-opacity=".7">14</text>
<text x="370" y="22" font-weight="bold">Λ₇⊥(Aᵀ): z₁ + 3z₂ ≡ 0</text>
<rect x="370" y="158" width="112" height="112" fill="currentColor" fill-opacity=".07" stroke="currentColor" stroke-dasharray="4 3"/>
<line x1="370" y1="270" x2="594" y2="270" stroke="currentColor" stroke-opacity=".4"/><line x1="370" y1="270" x2="370" y2="46" stroke="currentColor" stroke-opacity=".4"/>
<path d="M370,270h0M370,158h0M370,46h0M386,238h0M386,126h0M402,206h0M402,94h0M418,174h0M418,62h0M434,254h0M434,142h0M450,222h0M450,110h0M466,190h0M466,78h0M482,270h0M482,158h0M482,46h0M498,238h0M498,126h0M514,206h0M514,94h0M530,174h0M530,62h0M546,254h0M546,142h0M562,222h0M562,110h0M578,190h0M578,78h0M594,270h0M594,158h0M594,46h0" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>
<line x1="370" y1="270" x2="482" y2="270" stroke="currentColor" stroke-width="2.4"/>
<line x1="370" y1="270" x2="434" y2="254" stroke="currentColor" stroke-width="2.4"/>
<line x1="482" y1="158" x2="498" y2="126" class="acc" stroke-width="3"/>
<text x="504" y="122" class="acc-fill">(1, 2)</text>
<text x="486" y="286" fill-opacity=".7">7</text><text x="590" y="286" fill-opacity=".7">14</text>
<text x="50" y="318" fill-opacity=".7">bold: a basis, (1, 3) and (0, 7); shaded: one period</text>
<text x="370" y="318" fill-opacity=".7">bold: a basis, (7, 0) and (4, 1)</text>
</svg>
<figcaption>Figure 5.3. The two q-ary lattices of A = (1, 3)ᵀ with q = 7. Each repeats in every 7 by 7 square (shaded), which is what "q-ary" means, and each has one point per 7 units of area. The accent arrows are the shortest vectors, (2, −1) and (1, 2); they are perpendicular, a sign of the duality between the two lattices.</figcaption>
</figure>

**LWE as a lattice problem.** An LWE instance $b = As + e \pmod q$ says that $b$ is within
distance $\|e\|$ of the lattice point $As \bmod q$ in $\Lambda_q(A)$. Since $e$ is small,
recovering $s$ is a BDD problem in $\Lambda_q(A)$. Equivalently (Kannan's embedding, §5.7),
the vector $(e, 1)$, or the longer $(s, -e, 1)$, is an unusually short vector in a lattice
built from $A$ and $b$: the **primal attack** of Chapters 2 and 6 looks for it.

**By hand.** Take $q = 17$, $A = \begin{pmatrix} 5 & 3 \\ 9 & 14 \\ 2 & 11 \end{pmatrix}$,
$s = (1, -1)$ and $e = (1, -1, 0)$. Then $As = (2, -5, -9) \equiv (2, 12, 8)$ and $b = (3, 11,
8)$. The point $(2, 12, 8)$ is in $\Lambda_{17}(A)$; $b$ is at distance $\sqrt 2$ from it.
Meanwhile $\Lambda_{17}(A)$ has determinant $17^{3-2} = 17$ in three dimensions, and (as the
next subsection shows) its shortest vector has length $\sqrt 6 \approx 2.45$. The error, of
length $\sqrt 2 \approx 1.41$, is more than half of that, so nothing guarantees that $(2, 12,
8)$ is the nearest lattice point to $b$. Here it happens to be (the next nearest, $(3, 11,
6)$, is at distance 2), but only just. Real instances are built so that the error is far
inside half the shortest distance, with room to spare.

### By hand: the 3 × 3 bases of an LWE matrix

To find a basis of $\Lambda_{17}(A)$ for the matrix above, use its top $2 \times 2$ block.
Its determinant is $5 \cdot 14 - 3 \cdot 9 = 43 \equiv 9 \pmod{17}$, which is invertible
($9 \cdot 2 = 18 \equiv 1$), so some combinations of the columns of $A$ have first two entries
$(1, 0)$ and $(0, 1)$. The inverse of the block modulo 17 is

$$2 \begin{pmatrix} 14 & -3 \\ -9 & 5 \end{pmatrix} \equiv \begin{pmatrix} 11 & 11 \\ 16 & 10
\end{pmatrix} \pmod{17}.$$

Its first column, $x = (11, 16)$, gives $Ax \equiv (1, 0, 2 \cdot 11 + 11 \cdot 16) = (1, 0,
198) \equiv (1, 0, 11)$; its second, $x = (11, 10)$, gives $(0, 1, 132) \equiv (0, 1, 13)$.
Add $(0, 0, 17)$ for the multiples of $q$ in the last coordinate, and a basis is the rows of

$$B = \begin{pmatrix} 1 & 0 & 11 \\ 0 & 1 & 13 \\ 0 & 0 & 17 \end{pmatrix}, \qquad
\det B = 17 = q^{m-n}.$$

This triangular shape is the **Hermite normal form** of a q-ary lattice. Check: $2 \cdot (1,
0, 11) + 12 \cdot (0, 1, 13) = (2, 12, 178) \equiv (2, 12, 8)$, the point $As$ from before.

For $\Lambda_{17}^\perp(A^T)$, take the vectors orthogonal modulo 17 to the rows of $B$,
which span the same space modulo 17 as the columns of $A$: $z_1 + 11 z_3 \equiv 0$ and $z_2 +
13 z_3 \equiv 0$. So $z_3$ is free, $z_1 \equiv 6 z_3$ and $z_2 \equiv 4 z_3$, and a basis
is $(17, 0, 0)$, $(0, 17, 0)$, $(6, 4, 1)$, with determinant $17^2 = q^n$. Check against $A$
directly: $5 \cdot 6 + 9 \cdot 4 + 2 \cdot 1 = 68 = 4 \cdot 17$ and $3 \cdot 6 + 14 \cdot 4 +
11 \cdot 1 = 85 = 5 \cdot 17$. Neither basis is short, but small multiples reduce well:
$3 \cdot (6, 4, 1) = (18, 12, 3) \equiv (1, -5, 3)$, of length $\sqrt{35} \approx 5.92$.

A brute-force search over all small vectors confirms the rest: the shortest vector of
$\Lambda_{17}(A)$ is $\pm(2, 1, 1)$, of length $\sqrt 6$, and that of $\Lambda_{17}^\perp(A^T)$
is $\pm(1, -5, 3)$, of length $\sqrt{35}$. The exact Gaussian heuristic predicts 1.6 and 4.1: a
single small lattice can sit far from the average, as §5.3 warned.

### The Gaussian heuristic at real sizes

The program computes the Gaussian heuristic for the lattice in which the primal attack of
Chapter 6 looks for the LWE secret (dimension $n + m + 1$, determinant $q^m$) and compares it
with the expected length of the planted vector $(s, -e, 1)$, using each scheme's true
coefficient variance. For ML-DSA it treats all of $t = As_1 + s_2$ as public, as the
designers' analysis does.

```python
from math import pi, e, sqrt, lgamma, exp, log

def gaussian_heuristic(dim, log_det):
    """Expected shortest length in a random lattice: (vol of unit ball)^(-1/n) * det^(1/n)."""
    log_ball = (dim / 2) * log(pi) - lgamma(dim / 2 + 1)
    return exp((log_det - log_ball) / dim)

# name, LWE dimension n, samples m, modulus q, variance of secret and error coefficients
sets = [("toy", 20, 40, 3329, 1.0),
        ("ML-KEM-512", 512, 512, 3329, 1.5),     # CBD with eta = 3
        ("ML-KEM-768", 768, 768, 3329, 1.0),     # CBD with eta = 2
        ("ML-KEM-1024", 1024, 1024, 3329, 1.0),
        ("ML-DSA-44", 1024, 1024, 8380417, 2.0), # uniform in [-2, 2]
        ("ML-DSA-65", 1280, 1536, 8380417, 60 / 9),  # uniform in [-4, 4]
        ("ML-DSA-87", 1792, 2048, 8380417, 2.0)]
print("%-12s %5s %10s %8s %6s" % ("lattice", "dim", "GH", "planted", "gap"))
for name, n, m, q, var in sets:
    dim = n + m + 1                      # Kannan's lattice of Chapter 6: (s, -e, 1)
    gh = gaussian_heuristic(dim, m * log(q))
    planted = sqrt((n + m) * var + 1)
    print("%-12s %5d %10.1f %8.1f %6.1f" % (name, dim, gh, planted, gh / planted))
```

It prints:

```text
lattice        dim         GH  planted    gap
toy             61      402.6      7.8   51.5
ML-KEM-512    1025      447.0     39.2   11.4
ML-KEM-768    1537      547.4     39.2   14.0
ML-KEM-1024   2049      632.1     45.3   14.0
ML-DSA-44     2049    31652.4     64.0  494.5
ML-DSA-65     2817    76620.1    137.0  559.2
ML-DSA-87     3841    73784.2     87.6  841.9
```

In every case the planted vector is much shorter than a typical shortest vector, so it *is*
the shortest vector, by a wide margin. The attacker knows exactly what to look for. The
problem is purely one of finding it: in dimension 1,025 the lattice has astronomically many
vectors of length up to the Gaussian heuristic, and reduction algorithms must work through
the geometry to find the one that is much shorter. The ratio between the two columns
controls how much reduction is needed, which is what the block-size calculation of
Chapter 2 measures.

The gap column alone does not rank the schemes. ML-DSA's gaps are larger because its
modulus is about 2,500 times ML-KEM's, but so are its dimensions, and the attacker may use
fewer samples. Gap and dimension together decide the cost (Chapter 6).

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

### The Hermite bound: how short is short enough?

**Existence.** $\Lambda_q^\perp(A)$ has rank $m$ and determinant at most $q^n$ (exactly $q^n$
when $A$ has full rank $n$ modulo the prime $q$). Minkowski's theorem then promises a nonzero
solution with

$$\|z\| \le \sqrt m \, q^{n/m}.$$

In the toy above that is $\sqrt{14} \cdot 17^{3/14} \approx 6.9$; the collision found has
length $\sqrt 6 \approx 2.45$.

**Finding one.** An attacker need not use all $m$ columns. Setting all but $d$ coordinates of
$z$ to zero gives SIS in a lattice of rank $d$ and the same determinant $q^n$, and a
reduction algorithm that reaches root Hermite factor $\delta$ (Chapter 6) finds a vector of
length about $\delta^d q^{n/d}$ in it. The first factor grows with $d$ and the second
shrinks. The minimum, at $d = \sqrt{n \ln q / \ln \delta}$, is

$$\min_d \; \delta^d q^{n/d} = 2^{2\sqrt{n \log_2 q \, \log_2 \delta}}.$$

This is the bound in Micciancio and Regev's 2009 survey: reduction of quality $\delta$ buys
solutions this short and no shorter. An SIS instance is hard when $\beta$ is below this
length for every affordable $\delta$, yet above the Minkowski bound, so that solutions exist.

**By hand, at ML-DSA-44's size.** Over the integers, ML-DSA-44's matrix $[A \mid I]$ has $n =
1{,}024$ rows and $m = 2{,}048$ columns, with $q = 8{,}380{,}417 \approx 2^{23}$. Minkowski's
bound is $\sqrt{2{,}048} \cdot q^{1/2} \approx 131{,}000$. BKZ with block size 388 reaches
$\delta \approx 1.00407$ ($\log_2 \delta \approx 0.005856$); the best $d$ is about $2{,}005$,
and the shortest solution found has length

$$2^{2\sqrt{1{,}024 \times 22.998 \times 0.005856}} = 2^{2 \times 11.74} \approx 2^{23.5}
\approx 11.7 \text{ million}.$$

**Code it.** The calculation for all three ML-DSA sets. ML-DSA's proof bounds each
coefficient of the forger's solution (the maximum norm); a stand-in generous to the forger
allows each up to $2\gamma_1$, the range of a difference of two signature vectors $z$, and
asks only for Euclidean length at most $2\gamma_1 \sqrt m$.

```python
from math import pi, e, sqrt, log, exp

def delta(beta):
    """Root Hermite factor reached by BKZ with block size beta (Chapter 6)."""
    return ((pi * beta) ** (1 / beta) * beta / (2 * pi * e)) ** (1 / (2 * (beta - 1)))

def sis_attack(n, m, q, bound):
    """Smallest block size whose best sublattice d <= m reaches length <= bound."""
    for beta in range(40, 2000):
        ld = log(delta(beta))
        if min(d * ld + n * log(q) / d for d in range(n + 1, m + 1)) <= log(bound):
            return beta
    return None

q = 8380417
print("%-10s %6s %6s %14s %12s %6s" % ("set", "rows", "cols", "Minkowski", "target", "beta"))
for name, k, l, g1 in [("ML-DSA-44", 4, 4, 2 ** 17), ("ML-DSA-65", 6, 5, 2 ** 19),
                       ("ML-DSA-87", 8, 7, 2 ** 19)]:
    n, m = 256 * k, 256 * (k + l)          # [A | I] is (256k) x (256(k + l)) over Z_q
    mink = sqrt(m) * q ** (n / m)          # a solution this short always exists
    target = 2 * g1 * sqrt(m)              # every entry up to 2*gamma1: generous l2 stand-in
    print("%-10s %6d %6d %14.0f %12.0f %6s" % (name, n, m, mink, target, sis_attack(n, m, q, target)))
```

It prints:

```text
set          rows   cols      Minkowski       target   beta
ML-DSA-44    1024   2048         131008     11863283    388
ML-DSA-65    1536   2816         317061     55643730    533
ML-DSA-87    2048   3840         305193     64977878    772
```

Read the last column with care. Even with the easier Euclidean bound, the forger needs BKZ
with block size about 390 for the smallest set, close to the key-recovery attack on
ML-KEM-512 in Chapter 6 (406). The designers' analysis treats the maximum norm properly and
is the one to quote; the crude version shows the shape: the cost grows with $n \log q$, and a
looser bound helps the forger only through a square root in the exponent.

### Forging ML-DSA means solving SIS

Ignoring the public key's compression (Chapter 9), ML-DSA's public key is $A$ and $t = As_1 +
s_2$ with $s_1, s_2$ short. A signature on $\mu$ is a short $z$ and a sparse challenge $c$
such that hashing $\mu$ with the high bits of $Az - ct$ gives back $c$. The signer can do it
because $Az - ct = Ay - cs_2$ for its random $y$, and $cs_2$ rarely disturbs the high bits.

A forger without $s_1$ must find short $z$, a challenge $c$, and a small correction $u$ with
$H(\mu, Az - ct + u) = c$. That is **SelfTargetMSIS**: a short vector $(z, c, u)$ whose image
under $[A \mid t \mid I]$ hashes to part of itself. In the classical random oracle model a
forger can be run twice with the same commitment and different hash answers, and two
forgeries $(z, c, u)$ and $(z', c', u')$ with the same $Az - ct + u$ give

$$[A \mid t \mid I] \begin{pmatrix} z - z' \\ c' - c \\ u - u' \end{pmatrix} = 0,$$

a short nonzero solution to plain Module-SIS. Rewinding fails against a quantum
attacker, so the quantum random oracle proof (Kiltz, Lyubashevsky and Schaffner, 2018)
assumes SelfTargetMSIS directly, plus Module-LWE to make $t$ look random. Falcon's security
reduces in the same spirit to SIS over its NTRU lattice (Chapter 10).

**On Mars.** Arcadia City's habitat controllers take firmware from Earth signed with ML-DSA.
A controller cannot ask Earth whether an update is genuine and wait 6 to 44 minutes while an
air plant is down, and news of a revoked key takes a round trip to arrive. So it checks the
signature locally and acts, and everything rests on SIS: anyone who could find short vectors
of $[A \mid t \mid I]$ for the city's key could write firmware the doors accept. Keys that
sign firmware for decades deserve a parameter set with margin.

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
$q$, about 1 against 3,329 in ML-KEM. Figure 5.4 shows the picture.

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
<figcaption>Figure 5.4. Decision LWE in one picture. With the right secret, real samples leave small remainders (accent); random samples leave remainders anywhere. In high dimensions the attacker cannot try every secret, so even small noise hides the cluster.</figcaption>
</figure>

### Search from decision, in code

The mathematics book (§15.7 of
[Chapter 15](../mathematics/15-Learning-with-Errors.md)) proves that for prime $q$ of
polynomial size a decision oracle finds the secret. To test a guess $g$ for $s_1$, add a
random multiple $t$ of the first unit vector to each $a$ and $tg$ to each $b$. If $g = s_1$
the samples are still LWE; if not, each $b'$ gains $t(g - s_1)$, uniform modulo the prime
$q$. Here a brute-force distinguisher stands in for the oracle, and the search only asks it
yes-or-no questions.

```python
import itertools, random

Q, N, M = 17, 3, 20          # tiny LWE: secret in Z_17^3, errors in {-1, 0, 1}
rnd = random.Random(4)
calls = 0

def decision_oracle(samples):
    """A distinguisher used as a black box: True if some secret fits every sample."""
    global calls
    calls += 1
    for s in itertools.product(range(Q), repeat=N):
        if all((b - sum(x * y for x, y in zip(a, s)) + 1) % Q <= 2 for a, b in samples):
            return True
    return False

def search_from_decision(samples):
    """Recover s coordinate by coordinate, asking only the decision oracle."""
    s = []
    for i in range(N):
        for g in range(Q):
            moved = []
            for a, b in samples:
                t = rnd.randrange(Q)                       # fresh randomness per sample
                a2 = a[:i] + [(a[i] + t) % Q] + a[i + 1:]
                moved.append((a2, (b + t * g) % Q))        # LWE again only if g = s_i
            if decision_oracle(moved):
                s.append(g)
                break
    return s

secret = [rnd.randrange(Q) for _ in range(N)]
samples = []
for _ in range(M):
    a = [rnd.randrange(Q) for _ in range(N)]
    samples.append((a, (sum(x * y for x, y in zip(a, secret)) + rnd.choice((-1, 0, 1))) % Q))
found = search_from_decision(samples)
print("secret", secret, " found", found, " oracle calls", calls)
```

It prints:

```text
secret [7, 9, 3]  found [7, 9, 3]  oracle calls 22
```

It stops at the first guess the oracle accepts, so it spent 8, 10 and 4 questions on the
three coordinates. In the worst case it needs $nq$, about 2.6 million for ML-KEM-768's sizes:
polynomial, which is all the reduction needs. Anyone who can tell LWE from random can solve
it, so the decision form used in proofs is no weaker than the search form attacks aim at.

Two details carry the proof. The randomizer $t$ must be fresh for every sample, or a wrong
guess shifts every sample by the same constant. And $g - s_1$ must be invertible, which a
prime $q$ guarantees; for composite moduli the reduction needs more care. For Ring-LWE the
same argument works one ring "slot" at a time, which in Lyubashevsky, Peikert and Regev's
2010 version needs a modulus that splits the ring completely, $q \equiv 1 \pmod{2n}$; §5.9
says how that requirement was later removed.

## 5.7 Kannan's embedding: LWE as a unique shortest vector

*Level: intermediate.*

LWE asks for the lattice point nearest to $b$, but lattice reduction finds short vectors,
not close ones. In 1987 Ravi Kannan, working on integer programming, gave the bridge: add the
target to the basis as one more vector, with one more coordinate to track it. If the target
is close to the lattice, the new lattice has an unusually short vector, and finding it solves
the original problem. Almost every lattice attack on LWE-based schemes, including the primal
attack that sets ML-KEM's parameters, is a version of this **Kannan's embedding**.

**The construction.** Let $B$ be a basis of $\Lambda_q(A)$, as rows of $m$ coordinates, and
let $b = As + e \bmod q$. Form the $(m + 1) \times (m + 1)$ basis

$$B' = \begin{pmatrix} B & 0 \\ b & M \end{pmatrix}$$

with an embedding constant $M$, usually 1. Since $As \bmod q$ is a point of $\Lambda_q(A)$,
subtracting it, and multiples of $q$, from the last row leaves $(e, M)$. So $(e, M)$ is in the
lattice generated by $B'$, and it is short.

**Why it is unusually short.** The new lattice has dimension $m + 1$ and determinant $M \cdot
\det \Lambda_q(A) = M q^{m-n}$. By the Gaussian heuristic, a typical shortest vector of such
a lattice has length about $\sqrt{(m+1)/(2\pi e)} \; q^{(m-n)/(m+1)}$, which grows with $q$.
The vector $(e, M)$ has length about $\sqrt{m\sigma^2 + M^2}$, where $\sigma$ is the error's
standard deviation, and that does not depend on $q$ at all. When the error is small and $q$
large, $(e, M)$ is much shorter than anything else: up to sign, the lattice has a **unique**
shortest vector, with a gap $\gamma = \lambda_2/\lambda_1$ well above 1. Finding it is the
**unique shortest vector problem**, uSVP$_\gamma$, which gets easier as the gap grows.
Lyubashevsky and Micciancio proved in 2009 that bounded distance decoding and uSVP are
equivalent up to small factors in the gap. Vectors with last coordinate 0 are ordinary
vectors of $\Lambda_q(A)$, and those with last coordinate $\pm M$ are exactly the ways of
writing $b$ as a lattice point plus an error; $M = 1$ makes the extra coordinate cost almost
nothing.

**By hand.** Take $q = 17$, $n = 1$, $m = 4$, the column $A = (5, 9, 2, 11)^T$, the secret $s
= 3$ and the error $e = (1, 0, -1, 1)$. Then $As = (15, 27, 6, 33) \equiv (15, 10, 6, 16)$
and $b = (16, 10, 5, 17) \equiv (16, 10, 5, 0)$. The inverse of 5 modulo 17 is 7, so the
Hermite normal form of $\Lambda_{17}(A)$ has the rows $(1, 9 \cdot 7, 2 \cdot 7, 11 \cdot 7)
\equiv (1, 12, 14, 9)$, $(0, 17, 0, 0)$, $(0, 0, 17, 0)$ and $(0, 0, 0, 17)$, with
determinant $17^3 = 4{,}913$. The embedded basis puts a 0 after each of these rows and adds
the row $(16, 10, 5, 0, 1)$.

Subtract 15 times the first row, because 15 is the first coordinate of $As$:

$$(16, 10, 5, 0, 1) - (15, 180, 210, 135, 0) = (1, -170, -205, -135, 1).$$

Add 10, 12 and 8 times the rows containing 17 to clear the multiples of $q$:

$$(1, -170 + 170, -205 + 204, -135 + 136, 1) = (1, 0, -1, 1, 1) = (e, 1),$$

of length 2. The unit ball in five dimensions has volume $8\pi^2/15 \approx 5.264$, so the
Gaussian heuristic is $(4{,}913 / 5.264)^{1/5} \approx 3.9$: the planted vector is half that,
a gap that widens quickly as $q$ and $m$ grow.

**Code it.** A textbook LLL in exact rational arithmetic is enough for an 11-dimensional
lattice. The program takes the matrix in the form $A = \begin{pmatrix} I \\ A_2
\end{pmatrix}$, which any $A$ can be brought to by inverting its top block as in the hand
example (that changes $s$ but not the lattice), builds the embedded basis for $q = 97$, $n =
4$, $m = 10$, and runs LLL for errors of growing width.

```python
import random
from fractions import Fraction
from math import sqrt, pi, lgamma, log, exp

def lll(B, delta=Fraction(3, 4)):
    """Textbook LLL on integer row vectors, exact arithmetic (fine up to ~20 dimensions)."""
    B = [list(r) for r in B]
    dot = lambda u, v: sum(x * y for x, y in zip(u, v))
    def gso():
        Bs, mu = [], [[Fraction(0)] * len(B) for _ in B]
        for i, b in enumerate(B):
            v = [Fraction(x) for x in b]
            for j in range(i):
                mu[i][j] = dot(b, Bs[j]) / dot(Bs[j], Bs[j])
                v = [x - mu[i][j] * y for x, y in zip(v, Bs[j])]
            Bs.append(v)
        return Bs, mu
    Bs, mu = gso()
    k = 1
    while k < len(B):
        for j in range(k - 1, -1, -1):
            c = round(mu[k][j])
            if c:
                B[k] = [x - c * y for x, y in zip(B[k], B[j])]
                Bs, mu = gso()
        if dot(Bs[k], Bs[k]) >= (delta - mu[k][k - 1] ** 2) * dot(Bs[k - 1], Bs[k - 1]):
            k += 1
        else:
            B[k], B[k - 1] = B[k - 1], B[k]
            Bs, mu = gso()
            k = max(k - 1, 1)
    return B

def embedding_basis(A2, b, q, n):
    """Rows [I | A2^T | 0], [0 | qI | 0] and [b | 1]: Lambda_q(A) for A = [I; A2], plus b."""
    m = n + len(A2)
    rows = [[int(j == i) for j in range(n)] + [r[i] for r in A2] + [0] for i in range(n)]
    rows += [[q * (j == r) for j in range(m)] + [0] for r in range(n, m)]
    return rows + [list(b) + [1]]

def gh(dim, log_det):
    return exp((log_det - ((dim / 2) * log(pi) - lgamma(dim / 2 + 1))) / dim)

q, n, m = 97, 4, 10
rnd = random.Random(3)
A2 = [[rnd.randrange(q) for _ in range(n)] for _ in range(m - n)]
A = [[int(i == j) for j in range(n)] for i in range(n)] + A2    # top block already inverted
s = [rnd.randrange(q) for _ in range(n)]
print("lattice dimension %d, Gaussian heuristic %.1f" % (m + 1, gh(m + 1, (m - n) * log(q))))
for width in (1, 2, 4, 8):
    e = [rnd.randint(-width, width) for _ in range(m)]
    b = [(sum(x * y for x, y in zip(row, s)) + ei) % q for row, ei in zip(A, e)]
    R = lll(embedding_basis(A2, b, q, n))
    target = e + [1]
    hit = any(r == target or r == [-x for x in target] for r in R)
    print("errors in [-%d, %d]: |(e, 1)| = %5.1f   LLL's first vector %5.1f   (e, 1) found: %s"
          % (width, width, sqrt(sum(x * x for x in target)), sqrt(sum(x * x for x in R[0])), hit))
```

It prints:

```text
lattice dimension 11, Gaussian heuristic 11.4
errors in [-1, 1]: |(e, 1)| =   3.0   LLL's first vector   3.0   (e, 1) found: True
errors in [-2, 2]: |(e, 1)| =   4.4   LLL's first vector   4.4   (e, 1) found: True
errors in [-4, 4]: |(e, 1)| =   7.0   LLL's first vector   7.0   (e, 1) found: True
errors in [-8, 8]: |(e, 1)| =  14.0   LLL's first vector   9.5   (e, 1) found: False
```

For errors in $[-1, 1]$, $[-2, 2]$ and even $[-4, 4]$, the vector $(e, 1)$ is well below the
Gaussian heuristic of 11.4, and LLL returns it as the first vector of the reduced basis. At
width 8 it has length 14.0, longer than a typical shortest vector; the lattice now has other
vectors shorter than it (LLL finds one of length 9.5), and the embedding no longer singles
out the error. Figure 5.5 draws the comparison.


At full size the picture changes in one respect. The gap stays large, a factor of 11 to 14
for ML-KEM (§5.4), so the planted vector is still the unique shortest vector by far. What
protects it is the dimension: in a thousand dimensions LLL's first vector is longer than the
shortest by an exponential factor, and closing the distance to a vector 11 times below the
Gaussian heuristic takes BKZ with block size around 400 (Chapter 6).

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="Kannan embedding: the basis matrix with the LWE vector b appended as an extra row with a 1, and a bar chart comparing the length of (e, 1) with the Gaussian heuristic 11.4 for error widths 1, 2, 4 and 8; LLL finds (e, 1) for the first three and not for width 8" fill="currentColor" font-size="13">
<text x="20" y="24" font-weight="bold">the embedded basis (rows)</text>
<path d="M30 40 v120 M30 40 h8 M30 160 h8 M250 40 v120 M250 40 h-8 M250 160 h-8" stroke="currentColor" fill="none" stroke-width="1.6"/>
<text x="60" y="80">B</text><text x="200" y="80">0</text>
<text x="40" y="100" fill-opacity=".7">basis of Λ_q(A)</text>
<line x1="34" y1="118" x2="246" y2="118" stroke="currentColor" stroke-dasharray="3 3"/><line x1="180" y1="44" x2="180" y2="156" stroke="currentColor" stroke-dasharray="3 3"/>
<text x="60" y="145">b = As + e</text><text x="200" y="145">1</text>
<text x="20" y="190">(b, 1) − (As mod q, 0) − q·k = (e, 1)</text>
<text x="20" y="212" fill-opacity=".7">dimension m + 1, determinant q^(m−n)</text>
<text x="20" y="250" fill-opacity=".7">q = 97, n = 4, m = 10:</text><text x="20" y="268" fill-opacity=".7">dimension 11, Gaussian</text><text x="20" y="286" fill-opacity=".7">heuristic 11.4</text>
<text x="300" y="24" font-weight="bold">length of (e, 1) against the heuristic</text>
<line x1="360" y1="40" x2="360" y2="250" stroke="currentColor"/>
<line x1="496.8" y1="36" x2="496.8" y2="250" stroke="currentColor" stroke-dasharray="5 4"/><text x="496.8" y="266" text-anchor="middle">GH 11.4</text>
<rect x="360" y="55" width="36" height="24" class="acc-fill"/>
<text x="352" y="72" text-anchor="end">±1</text>
<text x="402" y="72">3.0 found</text>
<rect x="360" y="103" width="53" height="24" class="acc-fill"/>
<text x="352" y="120" text-anchor="end">±2</text>
<text x="419" y="120">4.4 found</text>
<rect x="360" y="151" width="84" height="24" class="acc-fill"/>
<text x="352" y="168" text-anchor="end">±4</text>
<text x="450" y="168">7.0 found</text>
<rect x="360" y="199" width="168" height="24" fill-opacity=".35"/>
<text x="352" y="216" text-anchor="end">±8</text>
<text x="534" y="216">14.0 missed</text>
<text x="300" y="300" fill-opacity=".7">LLL finds (e, 1) while it is well below the</text><text x="300" y="318" fill-opacity=".7">heuristic, and loses it once it is longer</text>
</svg>
<figcaption>Figure 5.5. Kannan's embedding. Left: the basis of Λ_q(A) with b appended as one more row; subtracting As and multiples of q leaves (e, 1). Right: the length of (e, 1) in the program's instance at four error widths, against the Gaussian heuristic of the embedded lattice.</figcaption>
</figure>

**Two versions.** The embedding above lives in $\Lambda_q(A)$, with short vector $(e, 1)$.
Chapter 6 builds its lattice from $A$ directly, in dimension $n + m + 1$, with short vector
$(s, -e, 1)$; Bai and Galbraith (2014) tuned it for small secrets. The difference matters:
with only $m = n$ samples, all an ML-KEM public key provides, $\Lambda_q(A)$ is all of
$\mathbb{Z}^m$ and the first version sees nothing, while the second also uses the smallness
of $s$. The same move breaks ECDSA with leaked nonce bits and old knapsack schemes
([Cryptanalysis, Chapter 15](../cryptanalysis/15-Lattices-as-a-Weapon.md)).

## 5.8 What the reductions prove

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
knapsacks. The concrete parameters come from the best known attacks, analyzed with the
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

### From Ajtai to the standards

Ajtai's 1996 paper gave a one-way function and a collision-resistant hash, but no
encryption. In 1997 Ajtai and Cynthia Dwork built the first public-key scheme resting on a
worst-case lattice problem; its keys were enormous and it never left the page. The same
years produced two practical designs with no proofs at all. NTRU, by Jeffrey Hoffstein, Jill
Pipher and Joseph Silverman, was presented at the CRYPTO 1996 rump session and published in
1998; it has survived, with its parameters raised several times. GGH, by Oded Goldreich,
Shafi Goldwasser and Shai Halevi (1997), used a good basis as the private key and a bad one
as the public key, the picture of §5.2; Phong Nguyen broke its proposed parameters in 1999.

Oded Regev's 2005 paper is the turning point. It defined learning with errors, built a
simple encryption scheme on it, and proved, through the quantum reduction above, that LWE is
as hard as worst-case lattice problems. Within a few years LWE supported signatures and
identity-based encryption (Gentry, Peikert and Vaikuntanathan, 2008) and fully homomorphic
encryption (from 2011). In 2018 the paper won the Gödel Prize, given each year for
outstanding papers in theoretical computer science. Peikert's 2009 paper removed the quantum
step for one version of the problem, and Brakerski, Langlois, Peikert, Regev and Stehlé
(2013) made the classical reduction work with polynomial moduli. The structured versions of
§5.9 made keys small, and Lyubashevsky's Fiat-Shamir with aborts (2009, 2012) made lattice
signatures without trapdoors practical. Kyber and Dilithium, submitted to NIST in 2017,
combined all of this; in August 2024 they became FIPS 203 and FIPS 204.

!!! note "Life story: learning with errors"
    **Born:** 2005, Oded Regev, "On lattices, learning with errors, random linear codes, and
    cryptography" (STOC 2005; *Journal of the ACM*, 2009) · **Purpose:** a problem simple
    enough to build encryption on, as hard as worst-case lattice problems for quantum
    computers · **Helped:** Regev encryption, lattice trapdoors and signatures, homomorphic
    encryption, and in structured form ML-KEM (FIPS 203) and ML-DSA (FIPS 204) ·
    **Status:** the central assumption of post-quantum cryptography; 2018 Gödel Prize; no
    attack better than generic lattice reduction is known at the parameters in use, as of
    November 2026

## 5.9 Structure: rings, modules and NTRU

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
lattice cryptography. For ideal lattices it sometimes does: §5.10 tells how quantum
algorithms found short vectors in them from 2016 on, and why those algorithms stop short of
Ring-LWE and Module-LWE. Module-LWE, with less symmetry than Ring-LWE, was chosen partly as a
hedge. Chapter 7 builds the rings, and
[Chapter 15 of the mathematics book](../mathematics/15-Learning-with-Errors.md) proves their
properties.

### What is proved, rung by rung

Figure 5.6 sets the variants side by side: each step to the right adds structure, shrinks
keys, and narrows the class of lattices the security proof starts from.

**Ring-SIS came first.** Micciancio showed in 2002 that a "compact knapsack" hash over
polynomials modulo $x^n - 1$ is one-way if worst-case problems on cyclic lattices are hard.
In 2006 Lyubashevsky and Micciancio, and independently Peikert and Rosen, showed that this
ring does not give collision resistance, because $x^n - 1$ has the factor $x - 1$, and that
an irreducible polynomial such as $x^n + 1$ does. The ring must be chosen with care.

**Ring-LWE (2010).** Lyubashevsky, Peikert and Regev gave a quantum reduction from worst-case
approximate SVP on ideal lattices to *search* Ring-LWE, and a search-to-decision reduction
when $q$ splits the ring completely. ML-KEM's $q = 3329$ does not quite: $3329 \equiv 1
\pmod{256}$ but not modulo 512, so $x^{256} + 1$ splits only into quadratics (Chapter 7). In
2017 Peikert, Regev and Stephens-Davidowitz proved decision Ring-LWE hard directly, for any
number field and any modulus.

**Module-LWE (2012 to 2015).** Brakerski, Gentry and Vaikuntanathan defined the general
problem in 2012, with plain LWE and Ring-LWE as its two ends; Langlois and Stehlé (posted
2012, published 2015) proved it hard from worst-case problems on module lattices. Albrecht
and Deo (2017) showed that Module-LWE of rank $k$ over degree $n$ reduces to Ring-LWE over
degree $kn$ with a much larger modulus. Neither family is known to be weaker at the sizes
used.

**The NTRU problem.** Given $h = g/f \bmod q$ with $f, g$ small, find them (search), or tell
$h$ from uniform (decision). Stehlé and Steinfeld (2011) showed that with $f, g$ drawn from
Gaussians of width around $\sqrt q$, $h$ is statistically close to uniform and an NTRU-style
scheme is provably secure from Ring-LWE; the schemes in use pick much smaller keys, outside
the theorem. Pellet-Mary and Stehlé (2021) reduced worst-case Ideal-SVP to an average-case
search NTRU problem, and another search variant to decision NTRU; the two variants differ,
so no chain reaches decision NTRU. Decision NTRU is known to be no harder than search
Ring-LWE.

**NTRU's known weakness.** When $q$ is very large compared with $f$ and $g$, the NTRU lattice
contains an unusually dense sublattice spanned by the rotations of $(f, g)$, and reduction
finds it early. Albrecht, Bai and Ducas (2016) and Kirchner and Fouque (2017) used this to
break "overstretched" NTRU parameters in homomorphic encryption, and Ducas and van Woerden
(2021) put the threshold for keys in $\{-1, 0, 1\}$ at about $q \approx 0.004 \,
n^{2.484}$: about 47,000 for NTRU-HRSS's $n = 701$, against its $q = 8{,}192$. The NTRU
schemes in NIST's process use moduli below that regime.

<figure class="mars-fig">
<svg viewBox="0 0 640 420" width="640" role="img" aria-label="The structured variants of LWE as a ladder: plain LWE, Module-LWE, Ring-LWE and NTRU, each with its year, the worst-case problem it is proved from, the known structural attacks, and the schemes that use it" fill="currentColor" font-size="13">
<rect x="20" y="60" width="140" height="300" rx="6" fill="currentColor" fill-opacity="0.05" stroke="currentColor"/>
<text x="90" y="84" text-anchor="middle" font-weight="bold">LWE</text>
<text x="90" y="102" text-anchor="middle" fill-opacity=".7">Regev 2005</text>
<text x="28" y="130" font-weight="bold" font-size="12">proved from</text>
<text x="28" y="148" font-size="12">any lattice:</text>
<text x="28" y="164" font-size="12">GapSVP, SIVP</text>
<text x="28" y="180" font-size="12">(quantum 2005,</text>
<text x="28" y="196" font-size="12">classical 2009/13)</text>
<text x="28" y="236" font-weight="bold" font-size="12">structural attacks</text>
<text x="28" y="254" font-size="12">none known</text>
<text x="28" y="310" font-weight="bold" font-size="12">used in</text>
<text x="28" y="328" font-size="12">FrodoKEM</text>
<rect x="175" y="60" width="140" height="300" rx="6" fill="currentColor" fill-opacity="0.10" stroke="currentColor"/>
<text x="245" y="84" text-anchor="middle" font-weight="bold">Module-LWE</text>
<text x="245" y="102" text-anchor="middle" fill-opacity=".7">BGV 2012, LS 2015</text>
<text x="183" y="130" font-weight="bold" font-size="12">proved from</text>
<text x="183" y="148" font-size="12">module lattices</text>
<text x="183" y="164" font-size="12">(LS 2015); reduces</text>
<text x="183" y="180" font-size="12">to Ring-LWE of</text>
<text x="183" y="196" font-size="12">degree kn (AD 2017)</text>
<text x="183" y="236" font-weight="bold" font-size="12">structural attacks</text>
<text x="183" y="254" font-size="12">none known</text>
<text x="183" y="310" font-weight="bold" font-size="12">used in</text>
<text x="183" y="328" font-size="12">ML-KEM, ML-DSA</text>
<rect x="330" y="60" width="140" height="300" rx="6" fill="currentColor" fill-opacity="0.15" stroke="currentColor"/>
<text x="400" y="84" text-anchor="middle" font-weight="bold">Ring-LWE</text>
<text x="400" y="102" text-anchor="middle" fill-opacity=".7">LPR 2010</text>
<text x="338" y="130" font-weight="bold" font-size="12">proved from</text>
<text x="338" y="148" font-size="12">ideal lattices</text>
<text x="338" y="164" font-size="12">(quantum, LPR 2010;</text>
<text x="338" y="180" font-size="12">any ring and</text>
<text x="338" y="196" font-size="12">modulus, PRS 2017)</text>
<text x="338" y="236" font-weight="bold" font-size="12">structural attacks</text>
<text x="338" y="254" font-size="12">Ideal-SVP, 2^Õ(√n)</text>
<text x="338" y="270" font-size="12">(not RLWE itself)</text>
<text x="338" y="310" font-weight="bold" font-size="12">used in</text>
<text x="338" y="328" font-size="12">NewHope (dropped)</text>
<rect x="485" y="60" width="140" height="300" rx="6" fill="currentColor" fill-opacity="0.20" stroke="currentColor"/>
<text x="555" y="84" text-anchor="middle" font-weight="bold">NTRU</text>
<text x="555" y="102" text-anchor="middle" fill-opacity=".7">HPS 1996</text>
<text x="493" y="130" font-weight="bold" font-size="12">proved from</text>
<text x="493" y="148" font-size="12">search: from</text>
<text x="493" y="164" font-size="12">Ideal-SVP (PS 2021);</text>
<text x="493" y="180" font-size="12">decision with small</text>
<text x="493" y="196" font-size="12">keys: none</text>
<text x="493" y="236" font-weight="bold" font-size="12">structural attacks</text>
<text x="493" y="254" font-size="12">overstretched q</text>
<text x="493" y="270" font-size="12">(2016-2021)</text>
<text x="493" y="310" font-weight="bold" font-size="12">used in</text>
<text x="493" y="328" font-size="12">Falcon, sntrup761</text>
<line x1="20" y1="30" x2="600" y2="30" stroke="currentColor" stroke-width="1.6"/><path d="M600 30 l-10 -5 v10 z"/>
<text x="20" y="22">less structure, bigger keys</text><text x="610" y="22" text-anchor="end">more structure, smaller keys</text>
<text x="20" y="386" fill-opacity=".7">The Ideal-SVP attacks hit the bottom of the Ring-LWE chain. The reductions run from</text><text x="20" y="406" fill-opacity=".7">Ideal-SVP up to Ring-LWE, so an easier Ideal-SVP does not make Ring-LWE easier.</text>
</svg>
<figcaption>Figure 5.6. The structured variants of LWE as a ladder: each step right shrinks keys and narrows the worst-case problem behind the proof. The structural attacks on Ideal-SVP hit the bottom of the Ring-LWE chain and do not climb it. Initials are the authors named in the text.</figcaption>
</figure>

## 5.10 Break it: when structure bit back, ideal lattices 2014 to 2021

*Level: expert.*

An **ideal lattice** is a lattice that is also an ideal of a ring of integers, so in
$\mathbb{Z}[x]/(x^n + 1)$ it is closed under the negacyclic rotation. A **principal** ideal
$(g)$ is the set of multiples of one generator $g$. Every other generator has the form $gu$
for a unit $u$ (an element with an inverse in the ring), and most generators are long even
when $g$ is short.

Some schemes used a short generator $g$ as the private key and a bad basis of $(g)$ as the
public key: Smart and Vercauteren's 2010 homomorphic scheme, and Soliloquy, a design from
GCHQ, the British signals agency. In 2014 three GCHQ researchers, Peter Campbell, Michael
Groves and Dan Shepherd, explained in "Soliloquy: a cautionary tale" why they had abandoned
it. Their attack had two steps.

1. **Find any generator** $h$ of the ideal: the principal ideal problem. Classical algorithms
   take subexponential time; Campbell, Groves and Shepherd sketched a quantum
   polynomial-time algorithm, and Jean-François Biasse and Fang Song published one in 2016.
2. **Shorten it.** Map each field element to the logarithms of the absolute values of its
   embeddings (the map Log). Then $\text{Log}(h) = \text{Log}(g) + \text{Log}(u)$, the
   vectors $\text{Log}(u)$ form the **log-unit lattice**, and $\text{Log}(g)$ is small because
   a short $g$ has embeddings of about equal size. Round $\text{Log}(h)$ to the nearest point
   of the log-unit lattice and divide that unit out.

Cramer, Ducas, Peikert and Regev made step 2 rigorous in 2016: in cyclotomic rings of
prime-power conductor, the cyclotomic units give a basis of the log-unit lattice (of
dimension $n/2 - 1$) good enough for simple rounding to succeed. With Biasse and Song, that recovers the key of any scheme
whose secret is a short generator in such a ring, in quantum polynomial time.

**By hand.** The smallest example with infinitely many units is $\mathbb{Z}[\sqrt 2]$, with
embeddings $\sigma_{1,2}(x + y\sqrt 2) = x \pm y\sqrt 2$ and units $\pm(1 + \sqrt 2)^k$. Since
$\sigma_1(1 + \sqrt 2) = 2.414$ and $\sigma_2(1 + \sqrt 2) = -0.414$, the log-unit lattice is
the line generated by $(0.8814, -0.8814)$. Let the secret be $g = 5 + \sqrt 2$, with
embeddings 6.414 and 3.586 and $\text{Log}(g) = (1.859, 1.277)$, both near $\ln\sqrt{23} =
1.568$ (23 is its norm). The public sees $h = g(1 + \sqrt 2)^{37}$, with fifteen-digit
coefficients. Project onto the unit direction:

$$\frac{L_1 - L_2}{2 \times 0.8814} = 37 + \frac{1.859 - 1.277}{1.7627} = 37.33,$$

round to $k = 37$, and $h(1 + \sqrt 2)^{-37} = g$. Rounding works because $g$'s own share,
0.33, is below one half.

**From generators to every ideal.** Cramer, Ducas and Wesolowski (2017) used short class-group
relations from Stickelberger's theorem to handle any ideal in a prime-power cyclotomic ring:
their quantum algorithm finds, in polynomial time, a vector within a factor $e^{\tilde
O(\sqrt n)}$ of the shortest, a factor for which BKZ needs time $2^{\tilde O(\sqrt n)}$.
Pellet-Mary, Hanrot and Stehlé (2019) extended it to any number field, with a heuristic
algorithm that does an exponential precomputation once per field and then answers each ideal
quickly. Ducas, Plançon and Wesolowski (2019) measured the hidden constants: the quantum
algorithm beats LLL only for cyclotomic rings of rank above about 4,000, and BKZ with block
size 300 only above about 24,000.

**Why none of this touches ML-KEM or ML-DSA.**

- **Wrong direction.** The reductions run from Ideal-SVP to Ring-LWE. An easier Ideal-SVP
  removes the bottom rung of the proof, but gives no algorithm for Ring-LWE.
- **Wrong shape.** LWE secrets are not generators of principal ideals, and the lattices an
  attacker reduces are not ideals: Ring-LWE's primal lattice, the pairs $(x, y)$ with $y
  \equiv ax$, is a module of rank 2, and ML-KEM's has rank $2k$, from 4 to 8.
- **Rank 2 is the floor.** Module versions of LLL (Lee, Pellet-Mary, Stehlé and Wallet, 2019;
  Mukherjee and Stephens-Davidowitz, 2020) reduce rank-$k$ module problems to rank 2. The
  attacks above live in rank 1; nothing comparable is known for rank 2.
- **Wrong factor.** The crossover with BKZ-300 is at ranks about a hundred times ML-KEM's 256.

The lesson stuck: ideal lattices have extra weaknesses as well as extra symmetry, and it is
one reason the structured schemes NIST standardized are all module schemes.

!!! note "Life story: the short-generator attack"
    **Born:** 2014, Campbell, Groves and Shepherd of GCHQ, "Soliloquy: a cautionary tale";
    made rigorous by Cramer, Ducas, Peikert and Regev (EUROCRYPT 2016), with Biasse and
    Song's quantum principal-ideal algorithm (SODA 2016) · **Purpose:** recover a short
    generator of a principal ideal from any generator · **Helped:** recovered keys of
    Soliloquy and of the Smart-Vercauteren scheme in quantum polynomial time; led to the
    Ideal-SVP algorithms of 2017 and 2019 · **Status:** a working attack on schemes whose key
    is a short generator; no effect on Ring-LWE, Module-LWE, ML-KEM or ML-DSA, as of November
    2026

## 5.11 Break it: the Arora-Ge attack

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

## 5.12 In the real world

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

## 5.13 Going deeper

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

**Module structure in the estimates.** The reductions of §5.9 aside, does module structure
cost any concrete security against the best attacks? As far as public knowledge goes, no: the
estimates treat ML-KEM's lattices as unstructured of dimension $kn$.

**Arora-Ge with Gröbner bases.** Albrecht, Cid, Faugère, Fitzpatrick and Perret (2015)
analyzed Arora-Ge with Gröbner basis algorithms, which need fewer samples than plain
linearization, and found it competitive only for very small error widths or binary errors
with many samples. Binary-error LWE with $m = O(n)$ samples remains hard (Micciancio and
Peikert, 2013), but with $m = \Omega(n^2)$ samples it falls, which is why schemes with very
narrow noise limit samples strictly.

## Check yourself

??? question "1. For q = 7 and A = (1, 3)ᵀ, give a basis and the determinant of Λ_q(A) and of Λ_q⊥(Aᵀ). What are their shortest vectors?"

    $\Lambda_7(A)$: $(1, 3), (0, 7)$, determinant $7 = q^{m-n}$. $\Lambda_7^\perp(A^T)$: $(7, 0),
    (4, 1)$, determinant $7 = q^n$. Shortest vectors $\pm(2, -1)$ and $\pm(1, 2)$, both of
    length $\sqrt 5$.

??? question "2. Use the approximation GH ≈ sqrt(n / 2πe) · det^(1/n) for a 100-dimensional lattice of determinant 2^300. About how long is its shortest vector?"

    $\det^{1/n} = 2^3 = 8$ and $\sqrt{100/(2\pi e)} \approx \sqrt{5.86} \approx 2.42$, so about
    $19.4$ (the exact ball volume gives 19.9).

??? question "3. Why is a collision in Ajtai's hash a short SIS solution?"

    If $Ax \equiv Ax' \pmod q$ with $x \ne x'$ in $\{0,1\}^m$, then $A(x - x') \equiv 0$ and
    $z = x - x'$ is a nonzero vector with entries in $\{-1, 0, 1\}$, so $\|z\| \le \sqrt m$.

??? question "4. Minkowski's theorem says an SIS solution of length at most √m · q^(n/m) exists. Compute it for n = 1,024, m = 2,048, q = 8,380,417. Why does that not make the problem easy?"

    $\sqrt{2048} \times q^{1/2} \approx 45.3 \times 2{,}895 \approx 131{,}000$. It proves a
    solution exists, not how to find one: a reduction of quality $\delta$ finds about
    $2^{2\sqrt{n \log_2 q \log_2 \delta}}$, millions for any affordable $\delta$.

??? question "5. What are the mean, variance and support of the centered binomial distribution with η = 3?"

    Mean 0, variance $\eta/2 = 1.5$, support $\{-3, \dots, 3\}$. The probabilities are
    $\binom{6}{3+k}/64$ for $k = -3, \dots, 3$: $1, 6, 15, 20, 15, 6, 1$ over 64.

??? question "6. In the search-to-decision reduction, why does each sample need its own random t, and at most how many oracle calls does it make for n = 768 and q = 3,329?"

    A shared $t$ shifts every $b$ by the same constant $t(g - s_1)$, giving samples that are
    neither LWE nor uniform, about which the oracle promises nothing. At most $nq = 768
    \times 3{,}329 = 2{,}556{,}672$ calls.

??? question "7. In Kannan's embedding of b = As + e with A of size m × n, what is the determinant of the embedded lattice, and why does the (e, 1) version fail with only m = n samples?"

    $M q^{m-n}$. When $m = n$ it is $M$: $\Lambda_q(A)$ is all of $\mathbb{Z}^m$, and $(e, 1)$
    is no shorter than countless other vectors. The $(s, -e, 1)$ version of Chapter 6 works
    because it also uses the smallness of $s$.

??? question "8. Regev's reduction is 'quantum'. Does that mean a quantum computer can break LWE?"

    No. The reduction uses a quantum algorithm inside the proof to turn an LWE solver into a
    lattice solver. It says that a classical or quantum LWE solver would give a quantum
    algorithm for worst-case lattice problems, which nobody knows how to build. It is evidence
    of hardness, not an attack.

??? question "9. In the Arora-Ge attack with errors in {-2, ..., 2}, what is the degree of each equation, and why does the size of the secret not matter?"

    Five: the product $\prod_{e=-2}^{2}(b - \langle a, s\rangle - e)$ vanishes for every sample,
    a polynomial of degree 5 in the $s_i$. The equations are exact identities over
    $\mathbb{Z}_q$, so the linearized system gives the monomials, including the $s_i$
    themselves, whatever their size; only the error's set of values matters.

??? question "10. The 2016 to 2019 quantum algorithms find short vectors in ideal lattices faster than generic methods. Give three reasons they do not threaten ML-KEM."

    The reductions run from Ideal-SVP to Ring-LWE, so an easy Ideal-SVP gives no algorithm
    for Ring-LWE. ML-KEM's lattices are modules of rank $2k \ge 4$, not ideals, and nothing is
    known for rank 2. And the factor $e^{\tilde O(\sqrt n)}$ beats BKZ-300 only for rings of
    rank above about 24,000.

## What you learned

- A lattice is the set of integer combinations of a basis; one lattice has many bases, and a
  good (short, nearly orthogonal) basis makes hard problems easy. Gauss reduction does it in
  two dimensions; in high dimensions it is exponentially costly.
- SVP and CVP and their approximate forms are the hard problems. The Gaussian heuristic
  predicts the shortest length, within 10 percent even in three dimensions, and
  cryptographic secrets are planted far below it.
- LWE and SIS are problems in q-ary lattices, $\Lambda_q(A)$ and $\Lambda_q^\perp(A)$, of
  determinants $q^{m-n}$ and $q^n$. A collision in Ajtai's hash is an SIS solution.
- Minkowski's bound says when SIS solutions exist; $2^{2\sqrt{n \log q \log \delta}}$ says
  how short reduction can find them. Forging ML-DSA means solving SelfTargetMSIS.
- LWE comes in search, decision and normal forms; for prime $q$ a decision oracle finds the
  secret with at most $nq$ questions.
- Kannan's embedding turns LWE into uSVP: $(e, 1)$ is far below the Gaussian heuristic, and
  only the dimension protects it.
- Regev's (2005, Gödel Prize 2018) and Peikert's reductions show LWE is a sound kind of
  problem; concrete parameters come from attacks.
- Ring-LWE, Module-LWE and NTRU make keys small, each with a narrower proof. The 2014 to
  2021 attacks on ideal lattices do not reach Ring-LWE or modules.
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

- Ravi Kannan, "Minkowski's convex body theorem and integer programming", *Mathematics of
  Operations Research* 12 (1987).
- Miklós Ajtai and Cynthia Dwork, "A public-key cryptosystem with worst-case/average-case
  equivalence" (STOC 1997).
- Jeffrey Hoffstein, Jill Pipher and Joseph H. Silverman, "NTRU: a ring-based public key
  cryptosystem" (ANTS 1998).
- Oded Goldreich, Shafi Goldwasser and Shai Halevi, "Public-key cryptosystems from lattice
  reduction problems" (CRYPTO 1997); Phong Q. Nguyen, "Cryptanalysis of the
  Goldreich-Goldwasser-Halevi cryptosystem from Crypto '97" (CRYPTO 1999).
- Daniele Micciancio, "Generalized compact knapsacks, cyclic lattices, and efficient one-way
  functions" (FOCS 2002).
- Vadim Lyubashevsky and Daniele Micciancio, "Generalized compact knapsacks are collision
  resistant" (ICALP 2006); Chris Peikert and Alon Rosen, "Efficient collision-resistant hashing
  from worst-case assumptions on cyclic lattices" (TCC 2006).
- Craig Gentry, Chris Peikert and Vinod Vaikuntanathan, "Trapdoors for hard lattices and new
  cryptographic constructions" (STOC 2008).
- Vadim Lyubashevsky and Daniele Micciancio, "On bounded distance decoding, unique shortest
  vectors, and the minimum distance problem" (CRYPTO 2009).
- Vadim Lyubashevsky, "Fiat-Shamir with aborts" (ASIACRYPT 2009); "Lattice signatures without
  trapdoors" (EUROCRYPT 2012).
- Damien Stehlé and Ron Steinfeld, "Making NTRU as secure as worst-case problems over ideal
  lattices" (EUROCRYPT 2011).
- Zvika Brakerski, Craig Gentry and Vinod Vaikuntanathan, "(Leveled) fully homomorphic
  encryption without bootstrapping" (ITCS 2012).
- Shi Bai and Steven D. Galbraith, "Lattice decoding attacks on binary LWE" (ACISP 2014).
- Peter Campbell, Michael Groves and Dan Shepherd, "Soliloquy: a cautionary tale" (ETSI/IQC
  Quantum-Safe Cryptography Workshop, 2014).
- Jean-François Biasse and Fang Song, "Efficient quantum algorithms for computing class groups
  and unit groups of number fields" (SODA 2016).
- Martin Albrecht, Shi Bai and Léo Ducas, "A subfield lattice attack on overstretched NTRU
  assumptions" (CRYPTO 2016); Paul Kirchner and Pierre-Alain Fouque, "Revisiting lattice
  attacks on overstretched NTRU parameters" (EUROCRYPT 2017).
- Ronald Cramer, Léo Ducas and Benjamin Wesolowski, "Short Stickelberger class relations and
  application to Ideal-SVP" (EUROCRYPT 2017).
- Martin R. Albrecht and Amit Deo, "Large modulus Ring-LWE ≥ Module-LWE" (ASIACRYPT 2017).
- Chris Peikert, Oded Regev and Noah Stephens-Davidowitz, "Pseudorandomness of Ring-LWE for
  any ring and modulus" (STOC 2017).
- Eike Kiltz, Vadim Lyubashevsky and Christian Schaffner, "A concrete treatment of
  Fiat-Shamir signatures in the quantum random-oracle model" (EUROCRYPT 2018).
- Léo Ducas, Eike Kiltz, Tancrède Lepoint, Vadim Lyubashevsky, Peter Schwabe, Gregor Seiler
  and Damien Stehlé, "CRYSTALS-Dilithium: a lattice-based digital signature scheme" (TCHES
  2018), and the round 3 specification (2021) for the SIS and LWE estimates.
- Alice Pellet-Mary, Guillaume Hanrot and Damien Stehlé, "Approx-SVP in ideal lattices with
  pre-processing" (EUROCRYPT 2019).
- Léo Ducas, Maxime Plançon and Benjamin Wesolowski, "On the shortness of vectors to be found
  by the Ideal-SVP quantum algorithm" (CRYPTO 2019).
- Changmin Lee, Alice Pellet-Mary, Damien Stehlé and Alexandre Wallet, "An LLL algorithm for
  module lattices" (ASIACRYPT 2019); Tamalika Mukherjee and Noah Stephens-Davidowitz, "Lattice
  reduction for modules, or how to reduce ModuleSVP to ModuleSVP" (CRYPTO 2020).
- Alice Pellet-Mary and Damien Stehlé, "On the hardness of the NTRU problem" (ASIACRYPT 2021).
- Léo Ducas and Wessel van Woerden, "NTRU fatigue: how stretched is overstretched?"
  (ASIACRYPT 2021).
