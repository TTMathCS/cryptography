# 13. Counting Points, Choosing Curves, and Pairings

*Chapter 12 built the group of points on an elliptic curve. This chapter asks how
big that group is, and why the answer decides whether a curve is safe. Hasse's
theorem pins the number of points to a narrow window around $p + 1$; the twist of a
curve sits on the other side of that window. Counting points exactly takes real
mathematics, and we write a counter that works for 40-bit primes in seconds. Then come
the curves that fail: curves whose discrete logarithm moves into a finite field
through a pairing, and curves with exactly $p$ points, whose discrete logarithm
collapses to a single division. We turn the first failure into a tool, build the Tate
pairing from scratch, and use it for BLS signatures that can be added together. The
chapter ends with the rules a curve must pass, and the stories of how P-256,
Curve25519 and BLS12-381 were chosen.*

!!! abstract "In this chapter"
    **You will learn:**

    - Hasse's theorem, the trace of Frobenius, and a short proof of the bound;
    - quadratic twists and why $N + N' = 2p + 2$;
    - how points are counted: by brute force, by baby-step giant-step inside the
      Hasse interval, and by Schoof's algorithm;
    - the structure of the group, cofactors and the embedding degree;
    - pairings, Miller's algorithm, and the MOV attack, with a working Tate pairing;
    - BLS signatures and aggregation, BN and BLS12 curves, and why BN254 lost bits
      in 2016;
    - anomalous curves and Smart's attack, with working code;
    - the rules for choosing a curve, and where the constants of P-256 and
      Curve25519 came from.

    **You need:** [Chapter 12](12-Elliptic-Curve-Group.md) (the group law and scalar
    multiplication), [Chapter 7](07-Groups.md) (orders, Lagrange, baby-step
    giant-step) and [Chapter 8](08-Rings-Fields-and-Polynomials.md) (the fields
    $\mathbb{F}_{p^k}$).

    **Levels:** §13.1 to §13.3 are for beginners, §13.4 to §13.7 are intermediate,
    §13.8 to §13.11 are expert.

## 13.1 The problem

*Level: beginner.*

A curve is useful for cryptography only if its group has a large prime-order
subgroup. The Pohlig-Hellman method of [Chapter 7](07-Groups.md) solves a discrete
logarithm one prime factor of the group order at a time, so a group of order
$2^{10} \cdot 3^{20} \cdot \ldots$ is no stronger than its largest prime factor. To
know whether a curve is good, we must know $N = \#E(\mathbb{F}_p)$, the number of
its points, and factor it.

For $y^2 = x^3 + ax + b$ the count is easy to state: for each $x$ in $\mathbb{F}_p$,
the right-hand side is either a nonzero square (two points), zero (one point) or a
non-square (no points). With the Legendre symbol $\left(\frac{r}{p}\right)$ of
[Chapter 5](05-Square-Roots-Mod-p.md), which is $1$, $0$ or $-1$ in those three
cases, and one more point for $\mathcal{O}$:

$$
N = 1 + \sum_{x \in \mathbb{F}_p} \left(1 + \left(\frac{x^3 + ax + b}{p}\right)\right)
  = p + 1 + \sum_{x} \left(\frac{x^3 + ax + b}{p}\right).
$$

That sum has $p$ terms, which for a 256-bit $p$ is $2^{256}$ terms. This chapter is
about doing better, and about what the answer tells us.

## 13.2 Hasse's theorem

*Level: beginner.*

The sum above adds $p$ values of $\pm 1$. If they were coin flips, the sum would be
around $\sqrt{p}$ in size. Helmut Hasse proved in 1933 (in full in 1936) that it never strays much
further:

!!! tip "Hasse's theorem"
    If $E$ is an elliptic curve over $\mathbb{F}_p$ and $N = \#E(\mathbb{F}_p)$, then
    $$N = p + 1 - t \quad\text{with}\quad |t| \le 2\sqrt{p}.$$
    The number $t$ is the **trace of Frobenius**.

So a curve over a 256-bit prime has $p + 1 - t$ points with $t$ at most about
$2^{129}$: the group order is as large as the field, to within a tiny relative error.

### By hand

Take $y^2 = x^3 + 2x + 3$ over $\mathbb{F}_7$. The squares modulo 7 are $0, 1, 2, 4$.

| $x$ | 0 | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|---|
| $x^3 + 2x + 3 \bmod 7$ | 3 | 6 | 1 | 1 | 5 | 5 | 0 |
| points | 0 | 0 | 2 | 2 | 0 | 0 | 1 |

That gives $5$ affine points, $(2, \pm 1)$, $(3, \pm 1)$ and $(6, 0)$, plus
$\mathcal{O}$: $N = 6$, so $t = 7 + 1 - 6 = 2$, and indeed $|2| \le 2\sqrt{7} \approx
5.29$. A group of order 6 is cyclic, $\mathbb{Z}/6$; the point $(6, 0)$ has order 2.

### Why the bound holds

The proof is short if we accept two facts from the theory of curves. The
**Frobenius map** $\pi(x, y) = (x^p, y^p)$ sends the curve to itself (the coefficients
are in $\mathbb{F}_p$, and raising to the $p$-th power is a field automorphism of the
algebraic closure). It fixes exactly the points with coordinates in $\mathbb{F}_p$,
so $E(\mathbb{F}_p)$ is the kernel of the map $1 - \pi$.

The facts:

1. Every map $\alpha$ from the curve to itself that is a group homomorphism given by
   rational functions has a **degree**, and if $\alpha$ is separable its kernel has
   exactly $\deg \alpha$ points. The map $1 - \pi$ is separable, so
   $\deg(1 - \pi) = N$.
2. The degree is a positive definite quadratic form: for integers $m, n$,
   $\deg(m - n\pi) = m^2 - t\,mn + p\,n^2$ with $\deg \pi = p$, and it is never negative.

The second fact with $m = n = 1$ gives $N = 1 - t + p$, which defines $t$. And a
quadratic form $m^2 - tmn + pn^2$ that is never negative must have discriminant
$t^2 - 4p \le 0$. That is Hasse's bound. $\blacksquare$

The same argument shows that Frobenius satisfies $\pi^2 - t\pi + p = 0$ as a map on
the curve: this characteristic equation is what Schoof's algorithm in §13.4
exploits.

### Code it

We count every curve $y^2 = x^3 + 5x + b$ over $\mathbb{F}_{10007}$, with a table of
squares in place of the Legendre symbol, and look at the traces.

```python
# Counting points naively: for each x, the Legendre symbol of x^3 + a x + b says how many y.
def legendre(r, p):
    r %= p
    return 0 if r == 0 else (1 if pow(r, (p - 1) // 2, p) == 1 else -1)

def count_naive(a, b, p):
    return p + 1 + sum(legendre(x**3 + a * x + b, p) for x in range(p))

p = 10007
chi = [0] + [-1] * (p - 1)                    # chi[r] = Legendre symbol of r, from a table of squares
for y in range(1, p):
    chi[y * y % p] = 1
cubes = [(x**3 + 5 * x) % p for x in range(p)]
traces = []
for b in range(1, p):
    if (4 * 5**3 + 27 * b * b) % p == 0:
        continue
    traces.append(-sum(chi[(c3 + b) % p] for c3 in cubes))
bound = 2 * p**0.5
print(min(traces), max(traces), round(bound, 2), all(abs(t) <= bound for t in traces))
print(sum(1 for t in traces if t == 0), len(set(traces)))
```

```text
-200 200 200.07 True
88 401
```

Every trace lies within $2\sqrt{p} \approx 200.07$, and the extremes are reached:
$t = -200$ and $t = 200$ both occur. In fact all 401 integers between $-200$ and
$200$ occur as traces, even with $a$ fixed. (Max Deuring proved in 1941 that every
$t$ allowed by Hasse occurs for some curve over $\mathbb{F}_p$.) Eighty-eight of the
curves have $t = 0$: these are **supersingular**, and they will matter in §13.6.

<figure class="mars-fig">
<svg viewBox="0 0 640 260" width="640" role="img" aria-label="Histogram of the traces of Frobenius of the curves y squared = x cubed + 5x + b over the field with 10007 elements: the counts form a half-ellipse between minus 200 and 200" fill="currentColor" font-size="13">
<g stroke="currentColor" stroke-width="1" opacity=".5"><line x1="50" y1="210" x2="590" y2="210"/></g>
<rect x="61.0" y="166.5" width="24.0" height="43.5" class="acc-fill" fill-opacity=".55"/>
<rect x="87.0" y="125.6" width="24.0" height="84.4" class="acc-fill" fill-opacity=".55"/>
<rect x="113.0" y="96.9" width="24.0" height="113.1" class="acc-fill" fill-opacity=".55"/>
<rect x="139.0" y="88.9" width="24.0" height="121.1" class="acc-fill" fill-opacity=".55"/>
<rect x="165.0" y="69.5" width="24.0" height="140.5" class="acc-fill" fill-opacity=".55"/>
<rect x="191.0" y="60.7" width="24.0" height="149.3" class="acc-fill" fill-opacity=".55"/>
<rect x="217.0" y="54.0" width="24.0" height="156.0" class="acc-fill" fill-opacity=".55"/>
<rect x="243.0" y="56.8" width="24.0" height="153.2" class="acc-fill" fill-opacity=".55"/>
<rect x="269.0" y="44.1" width="24.0" height="165.9" class="acc-fill" fill-opacity=".55"/>
<rect x="295.0" y="54.0" width="24.0" height="156.0" class="acc-fill" fill-opacity=".55"/>
<rect x="321.0" y="40.0" width="24.0" height="170.0" class="acc-fill" fill-opacity=".55"/>
<rect x="347.0" y="45.2" width="24.0" height="164.8" class="acc-fill" fill-opacity=".55"/>
<rect x="373.0" y="59.9" width="24.0" height="150.1" class="acc-fill" fill-opacity=".55"/>
<rect x="399.0" y="49.6" width="24.0" height="160.4" class="acc-fill" fill-opacity=".55"/>
<rect x="425.0" y="58.4" width="24.0" height="151.6" class="acc-fill" fill-opacity=".55"/>
<rect x="451.0" y="76.2" width="24.0" height="133.8" class="acc-fill" fill-opacity=".55"/>
<rect x="477.0" y="79.1" width="24.0" height="130.9" class="acc-fill" fill-opacity=".55"/>
<rect x="503.0" y="99.8" width="24.0" height="110.2" class="acc-fill" fill-opacity=".55"/>
<rect x="529.0" y="126.9" width="24.0" height="83.1" class="acc-fill" fill-opacity=".55"/>
<rect x="555.0" y="159.3" width="24.0" height="50.7" class="acc-fill" fill-opacity=".55"/>
<path transform="translate(0 210) scale(1 0.9696) translate(0 -210)" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 4" d="M60.0 210.0 L60.1 204.7 L60.5 199.3 L61.2 194.0 L62.1 188.7 L63.2 183.4 L64.6 178.1 L66.3 172.9 L68.2 167.7 L70.3 162.6 L72.7 157.5 L75.4 152.4 L78.3 147.4 L81.4 142.5 L84.7 137.6 L88.3 132.8 L92.2 128.1 L96.2 123.5 L100.5 118.9 L105.0 114.4 L109.7 110.1 L114.6 105.8 L119.7 101.6 L125.0 97.6 L130.5 93.6 L136.2 89.8 L142.0 86.1 L148.1 82.5 L154.3 79.0 L160.6 75.7 L167.2 72.5 L173.9 69.4 L180.7 66.5 L187.6 63.7 L194.7 61.0 L202.0 58.5 L209.3 56.2 L216.7 54.0 L224.3 51.9 L231.9 50.1 L239.7 48.3 L247.5 46.8 L255.3 45.3 L263.3 44.1 L271.3 43.0 L279.3 42.1 L287.4 41.3 L295.5 40.8 L303.7 40.3 L311.8 40.1 L320.0 40.0 L328.2 40.1 L336.3 40.3 L344.5 40.8 L352.6 41.3 L360.7 42.1 L368.7 43.0 L376.7 44.1 L384.7 45.3 L392.5 46.8 L400.3 48.3 L408.1 50.1 L415.7 51.9 L423.3 54.0 L430.7 56.2 L438.0 58.5 L445.3 61.0 L452.4 63.7 L459.3 66.5 L466.1 69.4 L472.8 72.5 L479.4 75.7 L485.7 79.0 L491.9 82.5 L498.0 86.1 L503.8 89.8 L509.5 93.6 L515.0 97.6 L520.3 101.6 L525.4 105.8 L530.3 110.1 L535.0 114.4 L539.5 118.9 L543.8 123.5 L547.8 128.1 L551.7 132.8 L555.3 137.6 L558.6 142.5 L561.7 147.4 L564.6 152.4 L567.3 157.5 L569.7 162.6 L571.8 167.7 L573.7 172.9 L575.4 178.1 L576.8 183.4 L577.9 188.7 L578.8 194.0 L579.5 199.3 L579.9 204.7 L580.0 210.0"/>
<text x="60.0" y="230" text-anchor="middle">-200</text>
<text x="190.0" y="230" text-anchor="middle">-100</text>
<text x="320.0" y="230" text-anchor="middle">0</text>
<text x="450.0" y="230" text-anchor="middle">100</text>
<text x="580.0" y="230" text-anchor="middle">200</text>
<text x="320" y="252" text-anchor="middle" font-size="12">trace t (bins of 20); dashed: a semicircle of the same area</text>
</svg>
<figcaption>Figure 13.1. The traces of all 10,005 curves y² = x³ + 5x + b over 𝔽₁₀₀₀₇, in bins of 20. They fill the Hasse interval |t| ≤ 2√p and pile up in the middle, roughly in the semicircle shape that Bryan Birch showed in 1968 to be the limit as p grows.</figcaption>
</figure>

The limiting shape is the **Sato-Tate** (or Birch) distribution: as the curve
varies over a field $\mathbb{F}_p$ and $p$ grows, $t/(2\sqrt{p})$ behaves like $\cos\theta$ with $\theta$
spread with density proportional to $\sin^2\theta$. For a single curve without
complex multiplication and varying $p$, the same law is the Sato-Tate conjecture,
proved by Laurent Clozel, Michael Harris, Nicholas Shepherd-Barron and Richard
Taylor in 2008 (with Thomas Barnet-Lamb, David Geraghty, Harris and Taylor
finishing the general case in 2011). For cryptographers the practical consequence is simple:
for a random curve, $N$ behaves like a random number near $p$, so a few hundred
random curves give one of prime order.

## 13.3 Twists

*Level: beginner.*

For each $x$, the value $r = x^3 + ax + b$ is either a square (two points on $E$) or a
non-square. A non-square becomes a square after multiplying by a fixed non-square
$c$. So consider the curve

$$
E' : \; c\,y^2 = x^3 + ax + b,
$$

which a change of variables ($x \mapsto x/c$, $y \mapsto y/c^2$, then clearing
denominators) turns into the ordinary Weierstrass form $y^2 = x^3 + c^2 a x + c^3 b$.
For every $x$ with $r \ne 0$, exactly one of $E$ and $E'$ has two points above $x$
and the other has none. Counting, $\#E + \#E' = 2p + 2$, so

$$
\#E' = p + 1 + t.
$$

$E'$ is the **quadratic twist** of $E$. It does not depend on which non-square $c$
we choose, up to isomorphism.

```python
# Twists: replacing b by c^3 b (and a by c^2 a) for a non-square c gives the curve whose trace is -t.
c = next(c for c in range(2, p) if legendre(c, p) == -1)
N = count_naive(5, 7, p)
N_tw = count_naive(5 * c * c % p, 7 * c**3 % p, p)
print(N, N_tw, N + N_tw == 2 * p + 2)
```

```text
10196 9820 True
```

The curve $y^2 = x^3 + 5x + 7$ over $\mathbb{F}_{10007}$, the one attacked in
Chapter 12, has 10,196 points; its twist has 9,820; the two add to $2 \cdot 10007 + 2$.

<figure class="mars-fig">
<svg viewBox="0 0 640 200" width="640" role="img" aria-label="The Hasse interval from p plus 1 minus 2 root p to p plus 1 plus 2 root p, centred on p plus 1; a curve with N equal to p plus 1 minus t and its twist with p plus 1 plus t sit symmetrically on either side" fill="currentColor" font-size="13">
<g stroke="currentColor" stroke-width="1.5" fill="none">
<line x1="60" y1="100" x2="580" y2="100"/>
<line x1="60" y1="90" x2="60" y2="110"/><line x1="580" y1="90" x2="580" y2="110"/>
<line x1="320" y1="88" x2="320" y2="112"/>
</g>
<g class="acc" stroke="currentColor" stroke-width="1.5" fill="none">
<path d="M220 80 Q 270 40 320 80"/><path d="M320 80 Q 370 40 420 80"/>
</g>
<circle cx="220" cy="100" r="7" class="acc-fill"/><circle cx="420" cy="100" r="7"/>
<text x="60" y="135" text-anchor="middle">p + 1 − 2√p</text>
<text x="580" y="135" text-anchor="middle">p + 1 + 2√p</text>
<text x="320" y="135" text-anchor="middle">p + 1</text>
<text x="220" y="160" text-anchor="middle" class="acc">#E = p + 1 − t</text>
<text x="420" y="160" text-anchor="middle">#E′ = p + 1 + t</text>
<text x="270" y="38" text-anchor="middle">t</text><text x="370" y="38" text-anchor="middle">t</text>
<text x="320" y="190" text-anchor="middle" font-size="12">example: p = 10007, #E = 10196, #E′ = 9820, t = −188</text>
</svg>
<figcaption>Figure 13.2. A curve and its quadratic twist sit symmetrically in the Hasse interval. Every x-coordinate belongs to a point of one of them (or of both, when x³ + ax + b = 0).</figcaption>
</figure>

Twists matter because of the Montgomery ladder of Chapter 12. X25519 works with
$x$-coordinates only, and never looks at $y$. If an attacker sends an $x$ for which
$x^3 + Ax^2 + x$ is not a square, there is no point on the curve with that $x$; but
there is one on the twist, and the ladder happily computes $k$ times it there. The
secret $k$ is then exposed to the discrete logarithm on the twist. Curve25519 was
chosen so that the twist is safe too (§13.11).

## 13.4 Counting points quickly

*Level: intermediate.*

There are three generations of point-counting.

**Brute force**, as in §13.2, takes $p$ Legendre symbols. It is fine for $p$ up to
about $10^8$ and useless beyond.

**Baby-step giant-step in the Hasse interval** (an idea usually credited to Daniel Shanks and
Jean-François Mestre). Pick a random point $P$. Its order divides $N$, and $N$ lies in an interval of
width $4\sqrt{p}$, so search that interval for an $m$ with $mP = \mathcal{O}$, using the
baby-step giant-step method of [Chapter 7](07-Groups.md): $O(p^{1/4})$ operations.
From one such $m$ we get the exact order of $P$ by dividing out prime factors. If the
order of $P$ (or the least common multiple of several point orders) has only one
multiple in the interval, that multiple is $N$.

**Schoof's algorithm** (René Schoof, 1985) runs in time polynomial in $\log p$. The
idea is to compute $t$ modulo many small primes $\ell$ and combine the results by the
Chinese remainder theorem, stopping when the product of the $\ell$ exceeds $4\sqrt{p}$
(about 130 bits for a 256-bit $p$, so the primes up to 103 suffice). To find
$t \bmod \ell$, work on the $\ell$-torsion points $E[\ell]$, the points with
$\ell P = \mathcal{O}$. They live in an extension field, but they are the roots of an
explicit **division polynomial** $\psi_\ell(x)$ of degree about $\ell^2/2$, so we can
compute with "a generic point of $E[\ell]$" by working modulo $\psi_\ell$. On those
points Frobenius satisfies $\pi^2 - t\pi + p = 0$, that is,

$$
(x^{p^2}, y^{p^2}) + (p \bmod \ell)(x, y) = (t \bmod \ell)\,(x^p, y^p),
$$

and trying $t \bmod \ell = 0, 1, \ldots, \ell - 1$ until both sides agree gives the
residue. Noam Elkies and A. O. L. Atkin improved the method in the early 1990s (the
SEA algorithm) by working with factors of degree $(\ell - 1)/2$ of $\psi_\ell$ when
they exist. With SEA, counting the points of a random 256-bit curve takes seconds in
PARI/GP or SageMath, which is what makes "pick random curves until one has prime
order" practical.

A fourth method skips counting altogether: the **complex multiplication (CM) method**
of Atkin and François Morain builds a curve with a chosen number of points from a
chosen trace $t$ and a small discriminant $D$ with $4p - t^2 = Dv^2$. It is how
pairing-friendly curves are made (§13.9). The price is that such curves have a small
CM discriminant, an extra structure that SafeCurves treats with suspicion for
ordinary use.

### Code it

The baby-step giant-step counter. It finds the order of random points and stops when
the Hasse interval contains a single multiple of their least common multiple. We
check it against brute force at $p = 10007$, and then count a curve over a 40-bit
prime, which brute force could not do in reasonable time in Python.

```python
# Order of a point, and of the group, by baby-step giant-step inside the Hasse interval.
import random
from math import isqrt, gcd

def ec_add(P, Q, a, p):
    if P is None:
        return Q
    if Q is None:
        return P
    if P[0] == Q[0] and (P[1] + Q[1]) % p == 0:
        return None
    if P == Q:
        lam = (3 * P[0] * P[0] + a) * pow(2 * P[1], -1, p) % p
    else:
        lam = (Q[1] - P[1]) * pow(Q[0] - P[0], -1, p) % p
    x3 = (lam * lam - P[0] - Q[0]) % p
    return (x3, (lam * (P[0] - x3) - P[1]) % p)

def ec_mul(k, P, a, p):
    R = None
    if k < 0:
        k, P = -k, (P[0], -P[1] % p)
    for bit in bin(k)[2:]:
        R = ec_add(R, R, a, p)
        if bit == "1":
            R = ec_add(R, P, a, p)
    return R

def sqrt_mod(r, p):
    """Tonelli-Shanks (Chapter 5)."""
    r %= p
    if r == 0:
        return 0
    q, s = p - 1, 0
    while q % 2 == 0:
        q, s = q // 2, s + 1
    z = next(z for z in range(2, p) if pow(z, (p - 1) // 2, p) == p - 1)
    m, c, t, x = s, pow(z, q, p), pow(r, q, p), pow(r, (q + 1) // 2, p)
    while t != 1:
        i, t2 = 0, t
        while t2 != 1:
            t2, i = t2 * t2 % p, i + 1
        bb = pow(c, 1 << (m - i - 1), p)
        m, c, t, x = i, bb * bb % p, t * bb * bb % p, x * bb % p
    return x

def random_point(a, b, p, rng):
    while True:
        x = rng.randrange(p)
        r = (x**3 + a * x + b) % p
        if legendre(r, p) == 1:
            return (x, sqrt_mod(r, p))

def prime_factors(n):
    fs, q = [], 2
    while q * q <= n:
        while n % q == 0:
            fs.append(q)
            n //= q
        q += 1
    return fs + ([n] if n > 1 else [])

def point_order(P, a, p):
    """Baby-step giant-step finds some m in the Hasse interval with mP = O; then trim m to the order."""
    w = 2 * isqrt(p) + 2
    lo = p + 1 - w
    s = isqrt(2 * w) + 1
    baby, R = {}, None
    for j in range(s):                         # baby steps: j*P for 0 <= j < s
        baby.setdefault(R, j)
        R = ec_add(R, P, a, p)
    sP = ec_mul(s, P, a, p)
    G = ec_mul(lo, P, a, p)                    # giant steps: G = (lo + i*s) P
    for i in range(2 * w // s + 2):
        if G in baby and lo + i * s - baby[G] > 0:
            m = lo + i * s - baby[G]           # (lo + i*s - j) P = O
            break
        G = ec_add(G, sP, a, p)
    for q in set(prime_factors(m)):
        while m % q == 0 and ec_mul(m // q, P, a, p) is None:
            m //= q
    return m

def group_order(a, b, p, rng):
    """lcm of point orders, until exactly one multiple of it lies in the Hasse interval."""
    L, w = 1, 2 * isqrt(p) + 2
    while True:
        o = point_order(random_point(a, b, p, rng), a, p)
        L = L * o // gcd(L, o)
        cands = [m for m in range((p + 1 - w + L - 1) // L * L, p + 2 + w, L)]
        if len(cands) == 1:
            return cands[0]

rng = random.Random(13)
print(group_order(5, 7, 10007, rng) == count_naive(5, 7, 10007))
big = 1000000000039
Nbig = group_order(5, 7, big, rng)
print(Nbig, big + 1 - Nbig, abs(big + 1 - Nbig) <= 2 * isqrt(big) + 2)
```

```text
True
1000001558752 -1558712 True
```

The curve $y^2 = x^3 + 5x + 7$ over $p = 1000000000039$ has $1000001558752$ points,
with trace $t = -1558712$, inside the bound $2\sqrt{p} \approx 2000000$.

## 13.5 The structure of the group

*Level: intermediate.*

Chapter 12 showed that $E(\mathbb{F}_p)$ is always $\mathbb{Z}/n_1 \times
\mathbb{Z}/n_2$ with $n_1 \mid n_2$. One more fact: **$n_1$ divides $p - 1$.** The
reason is the Weil pairing of §13.7: if $E[n_1]$, all $n_1^2$ points of order
dividing $n_1$, lies in $E(\mathbb{F}_p)$, then the pairing maps it onto the
$n_1$-th roots of unity, which must then lie in $\mathbb{F}_p$, so $n_1 \mid p - 1$.
On the curve of Chapter 12 over $\mathbb{F}_{97}$ the group was $\mathbb{Z}/2 \times
\mathbb{Z}/50$, and indeed $2 \mid 96$.

In practice, standards ask for $N = h \cdot n$ with $n$ a large prime and a small
**cofactor** $h$:

| curve | cofactor $h$ | prime order $n$ |
|---|---|---|
| P-256, P-384, secp256k1 | 1 | about $2^{256}$, $2^{384}$, $2^{256}$ |
| Curve25519 / Ed25519 | 8 | $\ell = 2^{252} + \ldots$ |
| Curve448 / Ed448 | 4 | about $2^{446}$ |
| BLS12-381 ($\mathbb{G}_1$) | about $2^{126}$ | $r$, 255 bits |

A cofactor bigger than 1 is not a weakness by itself, but every protocol must then
deal with the small subgroup, by clamping, by multiplying by $h$, or by working in a
prime-order quotient such as Ristretto ([Chapter 7](07-Groups.md)). BLS12-381's huge
$\mathbb{G}_1$ cofactor is a side effect of how the curve is built; points are always
multiplied into the subgroup of order $r$.

## 13.6 The embedding degree and the MOV attack

*Level: intermediate.*

Let $r$ be the large prime dividing $N$, and suppose $r \ne p$. The **embedding
degree** of the curve (with respect to $r$) is the smallest $k \ge 1$ with

$$
r \mid p^k - 1.
$$

In words: $\mathbb{F}_{p^k}$ is the smallest extension field containing the $r$-th
roots of unity. In 1993 Alfred Menezes, Tatsuaki Okamoto and Scott Vanstone showed
how to use the Weil pairing (§13.7) to map the discrete logarithm problem in the
order-$r$ subgroup of the curve into the multiplicative group of $\mathbb{F}_{p^k}$:

$$
Q = kP \quad\Longrightarrow\quad e(Q, S) = e(P, S)^k
$$

for a suitable auxiliary point $S$. Gerhard Frey and Hans-Georg Rück gave the same
reduction with the Tate pairing in 1994. Discrete logarithms in finite fields fall to
the index-calculus and number field sieve methods of *Cryptanalysis* [chapter 12](../cryptanalysis/12-Discrete-Logarithms.md),
which are subexponential; on a curve, only the generic $\sqrt{r}$ methods are known.
So if $k$ is small, the curve is only as strong as the field $\mathbb{F}_{p^k}$.

How small? For a 256-bit $p$ and $k = 2$, the field has 512 bits, and a 512-bit
discrete logarithm is within reach of a well-funded attacker. The **supersingular**
curves, those with $t \equiv 0 \pmod p$ (for $p > 3$, $t = 0$), always have $k \le 2$
over a prime field. For a random curve, by contrast, $k$ is about as big as $r$
itself (R. Balasubramanian and Neal Koblitz, 1998): the pairing exists, but it lands in
a field with $2^{256}$-bit elements, which cannot even be written down.

### Code it

Embedding degrees. We build a supersingular curve $y^2 = x^3 + x$ over a prime
$p \equiv 3 \pmod 4$ with $p + 1 = 4r$ and $r$ prime (such a curve has exactly $p + 1$
points), and compare it with Curve25519.

```python
# Embedding degree: the smallest k with r | p^k - 1, where r is the large prime factor of N.
def embedding_degree(p, r, limit=1000):
    x = 1
    for k in range(1, limit + 1):
        x = x * p % r
        if x == 1:
            return k
    return None

def is_probable_prime(n, rounds=30):
    if n < 2:
        return False
    for q in (2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37):
        if n % q == 0:
            return n == q
    d, s = n - 1, 0
    while d % 2 == 0:
        d, s = d // 2, s + 1
    rr = random.Random(n)
    for _ in range(rounds):
        x = pow(rr.randrange(2, n - 1), d, n)
        if x in (1, n - 1):
            continue
        for _ in range(s - 1):
            x = x * x % n
            if x == n - 1:
                break
        else:
            return False
    return True

# A supersingular curve: y^2 = x^3 + x over p = 3 mod 4 has p + 1 points.
r = 2**61 - 1                                  # a Mersenne prime
while not (is_probable_prime(r) and is_probable_prime(4 * r - 1)):
    r -= 2
p = 4 * r - 1
print(r, p, p % 4, embedding_degree(p, r))
q25519 = 2**255 - 19
ell = 2**252 + 27742317777372353535851937790883648493
print(embedding_degree(q25519, ell))
```

```text
2305843009213693613 9223372036854774451 3 2
None
```

The toy curve has $r = 2305843009213693613$ (61 bits), $p = 4r - 1 =
9223372036854774451$, and embedding degree $2$: its discrete logarithm reduces to one
in $\mathbb{F}_{p^2}$. For Curve25519, no $k$ up to 1,000 works (the actual value is
astronomically large).

<figure class="mars-fig">
<svg viewBox="0 0 640 230" width="640" role="img" aria-label="The embedding degree scale: k equal to 1 or 2 for supersingular and some special curves, which the MOV attack breaks; k from 6 to 24 for pairing-friendly curves such as BN and BLS12 with k equal to 12, which are balanced; and k about as large as r for ordinary curves such as P-256 and Curve25519, where pairings cannot be computed" fill="currentColor" font-size="13">
<g stroke="currentColor" stroke-width="1.5" fill="none">
<line x1="40" y1="110" x2="600" y2="110"/>
<rect x="40" y="70" width="130" height="80" rx="6"/>
<rect x="210" y="70" width="190" height="80" rx="6" class="acc"/>
<rect x="440" y="70" width="160" height="80" rx="6"/>
</g>
<text x="105" y="60" text-anchor="middle">k = 1, 2</text>
<text x="305" y="60" text-anchor="middle" class="acc">k = 6 … 24</text>
<text x="520" y="60" text-anchor="middle">k ≈ r</text>
<text x="105" y="95" text-anchor="middle">supersingular</text>
<text x="105" y="135" text-anchor="middle">MOV breaks it</text>
<text x="305" y="95" text-anchor="middle">pairing-friendly</text>
<text x="305" y="135" text-anchor="middle">BN, BLS12: k = 12</text>
<text x="520" y="95" text-anchor="middle">ordinary</text>
<text x="520" y="135" text-anchor="middle">P-256, Curve25519</text>
<text x="105" y="180" text-anchor="middle" font-size="12">field too small</text>
<text x="305" y="180" text-anchor="middle" font-size="12">curve and field equally hard</text>
<text x="520" y="180" text-anchor="middle" font-size="12">no pairing to use</text>
<text x="320" y="215" text-anchor="middle" font-size="12">embedding degree k: the smallest k with r dividing p^k − 1</text>
</svg>
<figcaption>Figure 13.3. Three regimes of the embedding degree. A pairing moves the discrete logarithm from the curve to the field 𝔽ₚᵏ. Small k makes that a weakness; moderate k makes pairings a tool; for ordinary curves the target field is far too big to use.</figcaption>
</figure>

## 13.7 Pairings

*Level: intermediate.*

A **pairing** is a map

$$
e : G_1 \times G_2 \to G_T
$$

between groups of prime order $r$ (written additively for the curve groups $G_1$,
$G_2$ and multiplicatively for $G_T \subset \mathbb{F}_{p^k}^*$) that is

- **bilinear**: $e(aP, bQ) = e(P, Q)^{ab}$ for all integers $a, b$;
- **non-degenerate**: $e(P, Q) \ne 1$ for generators $P$, $Q$;
- **efficiently computable**.

André Weil defined the pairing that bears his name in 1940, as a tool in the proof of
the Riemann hypothesis for curves over finite fields; John Tate and Stephen
Lichtenbaum defined the Tate pairing. Neither was meant for computing. Victor Miller
found the efficient algorithm in 1986, in an unpublished note that circulated for
years and finally appeared in the *Journal of Cryptology* in 2004.

### Miller's algorithm, in one paragraph

A rational function on the curve has zeros and poles, counted with multiplicity; its
**divisor** records them. For a point $P$ of order $r$ there is a function $f_{r,P}$
with a zero of order $r$ at $P$ and a pole of order $r$ at $\mathcal{O}$, and the
Tate pairing is, up to a final power, $f_{r,P}(Q)$. Miller's insight is that
$f_{r,P}$ can be built by double-and-add, exactly like $rP$: if $f_{i,P}$ is the
function with divisor $i(P) - (iP) - (i - 1)(\mathcal{O})$, then

$$
f_{i+j,P} = f_{i,P} \cdot f_{j,P} \cdot \frac{\ell_{iP,jP}}{v_{(i+j)P}},
$$

where $\ell$ is the line through $iP$ and $jP$ (the very line used to add them) and
$v$ is the vertical line through their sum. Each step of the scalar multiplication
contributes one line, evaluated at $Q$. The result is raised to $(p^k - 1)/r$, the
**final exponentiation**, which makes the answer an $r$-th root of unity and removes
everything that lies in a proper subfield. For even $k$ the vertical lines take
values in such a subfield and can be dropped (**denominator elimination**).

### The distortion map

On a supersingular curve both arguments can come from $E(\mathbb{F}_p)$, but then
$e(P, P) = 1$ for the plain pairing. The trick is a **distortion map**: on $y^2 = x^3
+ x$ with $p \equiv 3 \pmod 4$, the map $\phi(x, y) = (-x, iy)$, with $i^2 = -1$ in
$\mathbb{F}_{p^2}$, sends the curve to itself but moves $\mathbb{F}_p$-points to
points that are not over $\mathbb{F}_p$. (Check: $(iy)^2 = -y^2 = -(x^3 + x) =
(-x)^3 + (-x)$.) The **modified pairing** $\hat e(P, Q) = e(P, \phi(Q))$ is then
symmetric and non-degenerate on the single group $E(\mathbb{F}_p)[r]$. Steven
Galbraith, Kenneth Paterson and Nigel Smart (2008) sorted pairings into types: this
symmetric one is Type 1; the BN and BLS12 curves of §13.9 use the asymmetric Type 3,
with $G_1 \ne G_2$ and no efficient map between them.

### Code it

$\mathbb{F}_{p^2}$ as pairs $u + vi$, Miller's loop with the tangent and chord lines
of Chapter 12, and the final exponentiation. We test non-degeneracy, that the values
are $r$-th roots of unity, and bilinearity with random $x$ and $y$.

```python
# The Tate pairing on y^2 = x^3 + x, p = 3 mod 4, with the distortion map (x, y) -> (-x, i y).
# Elements of F_{p^2} are pairs (u, v) meaning u + v i, with i^2 = -1.
def f2_mul(s, t):
    return ((s[0] * t[0] - s[1] * t[1]) % p, (s[0] * t[1] + s[1] * t[0]) % p)

def f2_pow(s, e):
    out = (1, 0)
    for bit in bin(e)[2:]:
        out = f2_mul(out, out)
        if bit == "1":
            out = f2_mul(out, s)
    return out

def pairing(P, Q):
    """Reduced Tate pairing e(P, phi(Q)) for P, Q of order r, by Miller's algorithm."""
    xq, yq = (-Q[0]) % p, Q[1]                 # phi(Q) = (xq, yq * i)
    f, T = (1, 0), P
    for bit in bin(r)[3:]:
        lam = (3 * T[0] * T[0] + 1) * pow(2 * T[1], -1, p) % p
        line = ((-T[1] - lam * (xq - T[0])) % p, yq)        # y - yT - lam (x - xT) at phi(Q)
        f = f2_mul(f2_mul(f, f), line)
        T = ec_add(T, T, 1, p)
        if bit == "1":
            if T[0] == P[0]:                   # T = -P: the line is vertical, its value lies in F_p
                T = None
                continue
            lam = (P[1] - T[1]) * pow(P[0] - T[0], -1, p) % p
            line = ((-T[1] - lam * (xq - T[0])) % p, yq)
            f = f2_mul(f, line)
            T = ec_add(T, P, 1, p)
    return f2_pow(f, (p * p - 1) // r)         # final exponentiation kills every F_p factor

rng = random.Random(5)
def point_of_order_r():
    while True:
        T = ec_mul(4, random_point(1, 0, p, rng), 1, p)
        if T is not None:
            return T

P, Q = point_of_order_r(), point_of_order_r()
e = pairing(P, Q)
x, y = rng.randrange(1, r), rng.randrange(1, r)
print(e != (1, 0), f2_pow(e, r) == (1, 0))
print(pairing(ec_mul(x, P, 1, p), ec_mul(y, Q, 1, p)) == f2_pow(e, x * y % r))
```

```text
True True
True
```

And here is the MOV reduction itself. A discrete logarithm $K = kP$ on the curve
becomes $h = g^k$ in $\mathbb{F}_{p^2}^*$, with $g = \hat e(P, P)$ and
$h = \hat e(K, P)$.

```python
# MOV: a discrete logarithm on the curve becomes one in F_{p^2}.
k = rng.randrange(1, r)
K = ec_mul(k, P, 1, p)
g, h = pairing(P, P), pairing(K, P)            # h = g^k in the order-r subgroup of F_{p^2}*
print(g != (1, 0), h == f2_pow(g, k))
```

```text
True True
```

For our 61-bit $r$ the field $\mathbb{F}_{p^2}$ has 126-bit elements, and its
discrete logarithms fall to the number field sieve in moments. A curve with a 61-bit
group would of course be weak anyway; the point is that a supersingular curve with a
256-bit group is no stronger than discrete logarithms in a 512-bit field.

<figure class="mars-fig">
<svg viewBox="0 0 640 220" width="640" role="img" aria-label="A pairing maps a pair of curve points P and Q to an element of the finite field; multiplying P by a and Q by b raises the result to the power a b" fill="currentColor" font-size="13">
<g stroke="currentColor" stroke-width="1.4" fill="none">
<rect x="30" y="40" width="160" height="60" rx="8"/>
<rect x="30" y="120" width="160" height="60" rx="8"/>
<rect x="430" y="80" width="180" height="60" rx="8" class="acc"/>
<path d="M190 70 L 300 105 M190 150 L 300 115"/>
<path d="M330 110 L 425 110"/>
</g>
<circle cx="315" cy="110" r="18" class="acc-fill" fill-opacity=".25"/>
<text x="315" y="115" text-anchor="middle">e</text>
<path d="M425 110 l -9 -5 v 10 z"/>
<text x="110" y="66" text-anchor="middle">G₁ (curve)</text>
<text x="110" y="86" text-anchor="middle" font-size="12">P, aP</text>
<text x="110" y="146" text-anchor="middle">G₂ (curve)</text>
<text x="110" y="166" text-anchor="middle" font-size="12">Q, bQ</text>
<text x="520" y="106" text-anchor="middle" class="acc">Gₜ ⊂ 𝔽ₚᵏ*</text>
<text x="520" y="126" text-anchor="middle" font-size="12">e(aP, bQ) = e(P, Q)^(ab)</text>
<text x="320" y="210" text-anchor="middle" font-size="12">one multiplication "inside the exponent": the reason pairings enable BLS, IBE and SNARKs</text>
</svg>
<figcaption>Figure 13.4. A bilinear pairing takes two curve points to a root of unity in 𝔽ₚᵏ. Scalars on either side come out as one exponent, so a product of two secrets can be checked without knowing either.</figcaption>
</figure>

### What pairings made possible

The MOV attack showed pairings as a threat. From 2000 they became a tool:

- **Tripartite Diffie-Hellman** (Antoine Joux, 2000): Alice, Bob and Carol publish
  $aP$, $bP$, $cP$, and each computes $\hat e(P, P)^{abc}$, for example Alice as
  $\hat e(bP, cP)^a$. One round, three parties.
- **Identity-based encryption** (Dan Boneh and Matt Franklin, 2001; and,
  independently, Ryuichi Sakai, Kiyoshi Ohgishi and Masao Kasahara, 2000): a public
  key can be an email address.
- **Short signatures** (Dan Boneh, Ben Lynn and Hovav Shacham, 2001): BLS, below.
- **Polynomial commitments and succinct proofs**: the KZG commitment of
  [Chapter 11](11-Polynomials-at-Work.md) checks a polynomial identity with one
  pairing equation, and pairing-based SNARKs such as Groth16 (Jens Groth, 2016) verify
  any computation with three pairings.

## 13.8 BLS signatures

*Level: expert.*

A BLS key pair is a secret scalar $sk$ and the public point $pk = sk \cdot G$. To sign
a message $m$, hash it to a curve point $H(m)$ and output

$$
\sigma = sk \cdot H(m).
$$

To verify, check $e(G, \sigma) = e(pk, H(m))$. Both sides equal $e(G, H(m))^{sk}$.
A signature is a single curve point: 48 bytes on BLS12-381 in the compressed form
with signatures in $\mathbb{G}_1$, or 96 bytes with signatures in $\mathbb{G}_2$, the
choice Ethereum made.

The remarkable property is **aggregation**. Signatures by different signers on
different messages add up: with $\sigma = \sum \sigma_i$,

$$
e(G, \sigma) = \prod_i e(pk_i, H(m_i)),
$$

because $e(G, \sigma_i) = e(pk_i, H(m_i))$ for each $i$ and the pairing is linear in
its second argument. Thousands of signatures compress into one point. Ethereum's
proof-of-stake chain, running since December 2020, aggregates the votes of its
validators in exactly this way.

### Code it

BLS on the toy curve, with three signers. The hash to the curve here is the simple
**try-and-increment** method: hash the message with a counter until the result is
the $x$-coordinate of a point, then multiply by the cofactor 4.

```python
# BLS signatures on the toy curve: sign = sk * H(m); verify e(G, sig) == e(pk, H(m)).
import hashlib

def hash_to_point(msg):
    ctr = 0
    while True:
        x = int.from_bytes(hashlib.sha256(msg + bytes([ctr])).digest(), "big") % p
        rhs = (x**3 + x) % p
        if legendre(rhs, p) == 1:
            T = ec_mul(4, (x, pow(rhs, (p + 1) // 4, p)), 1, p)   # clear the cofactor 4
            if T is not None:
                return T
        ctr += 1

G = P
keys = [rng.randrange(1, r) for _ in range(3)]
pubs = [ec_mul(s, G, 1, p) for s in keys]
msgs = [b"launch window 12", b"dust storm, hold", b"all clear"]
sigs = [ec_mul(s, hash_to_point(m), 1, p) for s, m in zip(keys, msgs)]
print(all(pairing(G, s) == pairing(pk, hash_to_point(m)) for s, pk, m in zip(sigs, pubs, msgs)))
print(pairing(G, sigs[0]) == pairing(pubs[0], hash_to_point(b"dust storm, hold")))
agg = None
for s in sigs:
    agg = ec_add(agg, s, 1, p)
rhs = (1, 0)
for pk, m in zip(pubs, msgs):
    rhs = f2_mul(rhs, pairing(pk, hash_to_point(m)))
print(pairing(G, agg) == rhs)
```

```text
True
False
True
```

All three signatures verify; a signature does not verify for a different message;
and the sum of the three signatures verifies against the product of three pairings.

### Break it: rogue keys and slow hashing

**Rogue keys.** If several signers sign the *same* message, the aggregate check is
$e(G, \sigma) = e(\sum pk_i, H(m))$. Mallory, who sees Alice's $pk_A$, can publish
$pk_M = x G - pk_A$ for an $x$ she knows. Then $pk_A + pk_M = xG$, and Mallory alone
can produce $\sigma = x H(m)$, which verifies as a joint signature by Alice and
Mallory. Alice never signed.

**Try-and-increment** takes a number of steps that depends on the message, so it
leaks timing information, and its output is not uniformly distributed in a way that
is easy to analyse.

### Fix it

- Require a **proof of possession**: each signer must sign its own public key when
  registering it, which Mallory cannot do for $pk_M$. Ethereum does this; the
  alternatives are distinct messages per signer, or randomizing each key by a hash
  of all the keys (the method of Dan Boneh, Manu Drijvers and Gregory Neven, 2018).
- Hash to the curve with a standard constant-time method: RFC 9380, *Hashing to
  Elliptic Curves* (2023), specifies the simplified SWU map used for BLS12-381.
- Check that every received point is on the curve and in the subgroup of order $r$;
  with cofactors this large, an unchecked point is the invalid-curve attack of
  Chapter 12 again.

## 13.9 Pairing-friendly curves

*Level: expert.*

Pairing-based protocols need a curve that is neither of the extremes of Figure 13.3:
$k$ small enough that the pairing can be computed, large enough that discrete logs
in $\mathbb{F}_{p^k}$ are as hard as on the curve. Such curves are rare and must be
constructed, usually by the CM method from polynomial families.

**BN curves** (Paulo Barreto and Michael Naehrig, 2005) have embedding degree 12 and
prime order, with

$$
p(u) = 36u^4 + 36u^3 + 24u^2 + 6u + 1, \qquad r(u) = 36u^4 + 36u^3 + 18u^2 + 6u + 1,
$$

for an integer $u$ that makes both prime; the trace is $t = 6u^2 + 1$. The curve
is $y^2 = x^3 + b$. The curve called BN254 or alt_bn128, with
$u = 4965661367192848881$, has been built into Ethereum since 2017 (EIP-196 and
EIP-197), which is why so many zero-knowledge systems use it.

**BLS12 curves** (Paulo Barreto, Ben Lynn and Michael Scott, 2002) also have $k = 12$,
with $r(z) = z^4 - z^2 + 1$ and $p(z) = (z - 1)^2 r(z)/3 + z$. **BLS12-381**, chosen by
Sean Bowe in 2017 for the Zcash cryptocurrency, takes $z = -\texttt{0xd201000000010000}$,
a value with very few nonzero bits so that Miller's loop is short. It is now used by
Ethereum's consensus layer, Zcash, Filecoin and many others, and Ethereum added
precompiled contracts for it in 2025 (EIP-2537).

### Code it

We rebuild both curves from their polynomials and check the claims: bit lengths,
primality, and embedding degree 12.

```python
# Real pairing-friendly curves: the BN254 curve of Ethereum and BLS12-381.
u = 4965661367192848881
p_bn = 36 * u**4 + 36 * u**3 + 24 * u**2 + 6 * u + 1
r_bn = 36 * u**4 + 36 * u**3 + 18 * u**2 + 6 * u + 1
print(p_bn.bit_length(), r_bn.bit_length(), is_probable_prime(p_bn), is_probable_prime(r_bn),
      embedding_degree(p_bn, r_bn))
print(str(p_bn)[:20], str(r_bn)[:20])
z = -0xd201000000010000
r_bls = z**4 - z**2 + 1
p_bls = (z - 1)**2 * r_bls // 3 + z
print(p_bls.bit_length(), r_bls.bit_length(), is_probable_prime(p_bls), is_probable_prime(r_bls),
      embedding_degree(p_bls, r_bls))
print(hex(p_bls)[:18])
```

```text
254 254 True True 12
21888242871839275222 21888242871839275222
381 255 True True 12
0x1a0111ea397fe69a
```

### Why "BN254" lost bits in 2016

When BN254 was chosen, the best attack on discrete logarithms in $\mathbb{F}_{p^{12}}$,
a 3,048-bit field, was believed to cost about $2^{128}$, matching the
$2^{127}$ cost of Pollard's rho in the 254-bit group. In 2016 Taechan Kim and Razvan
Barbulescu published the **extended tower number field sieve** (exTNFS), which
exploits the fact that $p^{12}$ is a power of a prime with a special polynomial
form. Later estimates (Razvan Barbulescu and Sylvain Duquesne, 2019) put BN254 at
around 100 bits of security. Nobody has broken it, but it no longer meets a
128-bit target. BLS12-381 was designed with the new attacks in mind, with a larger
$p$ (381 bits, so $p^{12}$ has about 4,572 bits); estimates put it close to, though
by some counts slightly below, 128 bits. The lesson generalizes: a pairing-based
system is only as strong as the weaker of the curve and the field, and the field is
where the progress has been.

## 13.10 Break it: anomalous curves and Smart's attack

*Level: expert.*

The opposite extreme from $N = p + 1$ (supersingular) is $N = p$: the **anomalous**
curves, with trace $t = 1$. Their discrete logarithm is easy. Nigel Smart (1999),
Takakazu Satoh and Kiyomichi Araki (1998) and Igor Semaev (1998) independently found
the attack.

The idea, without the full theory. Lift the curve and the points from $\mathbb{F}_p$
to the $p$-adic numbers, here simply to integers modulo $p^2$. On the lifted curve,
$P$ no longer has order $p$, but $pP$ reduces to $\mathcal{O}$ modulo $p$. The points
that reduce to $\mathcal{O}$ form a group that is isomorphic, through the parameter
$t = -x/y$ (which is divisible by $p$ there), to the *additive* group $p\mathbb{Z}_p$.
So the map

$$
\psi(P) = \frac{t(p\,\tilde P)}{p} \bmod p
$$

is a group homomorphism from $E(\mathbb{F}_p)$ to $(\mathbb{F}_p, +)$. It turns
$Q = kP$ into $\psi(Q) = k\,\psi(P)$, and the discrete logarithm becomes a
division: $k = \psi(Q)/\psi(P) \bmod p$. (It fails only if the lift happens to be the
"canonical lift", which has probability about $1/p$; a different lift then works.)

### Code it

We search for an anomalous curve over a prime near 1,000, lift with Hensel's lemma
(Chapter 5), multiply by $p$ in Jacobian coordinates modulo $p^2$, where the $Z$
coordinate comes out divisible by $p$ but not by $p^2$, and read off $\psi$.

```python
# Smart's attack: on an anomalous curve (exactly p points) the discrete logarithm is easy.
def find_anomalous(lo):
    for pp in range(lo, lo + 5000):
        if not is_probable_prime(pp):
            continue
        for aa in range(1, 40):
            for bb in range(1, 40):
                if (4 * aa**3 + 27 * bb * bb) % pp and count_naive(aa, bb, pp) == pp:
                    return pp, aa, bb

pa, aa, ba = find_anomalous(1000)
print(pa, aa, ba, count_naive(aa, ba, pa))

def jac_add_mod(T, U, a, m):
    """General Jacobian addition and doubling over Z/m (here m = p^2)."""
    if T is None:
        return U
    if U is None:
        return T
    X1, Y1, Z1 = T
    X2, Y2, Z2 = U
    if T is U:
        S = 4 * X1 * Y1 * Y1 % m
        M = (3 * X1 * X1 + a * pow(Z1, 4, m)) % m
        X3 = (M * M - 2 * S) % m
        return (X3, (M * (S - X3) - 8 * pow(Y1, 4, m)) % m, 2 * Y1 * Z1 % m)
    U1, U2 = X1 * Z2 * Z2 % m, X2 * Z1 * Z1 % m
    S1, S2 = Y1 * pow(Z2, 3, m) % m, Y2 * pow(Z1, 3, m) % m
    H, R = (U2 - U1) % m, (S2 - S1) % m
    X3 = (R * R - H**3 - 2 * U1 * H * H) % m
    Y3 = (R * (U1 * H * H - X3) - S1 * H**3) % m
    return (X3, Y3, Z1 * Z2 * H % m)

def smart_psi(Pt, a, b, pp):
    """Lift Pt to Z/p^2 (Hensel), multiply by p, read off the formal-group parameter / p."""
    m = pp * pp
    x, y = Pt
    t = (x**3 + a * x + b - y * y) // pp * pow(2 * y, -1, pp) % pp
    T = (x, (y + pp * t) % m, 1)               # y^2 = x^3 + a x + b now holds mod p^2
    R = None
    for bit in bin(pp)[2:]:
        R = jac_add_mod(R, R, a, m) if R is not None else None
        if bit == "1":
            R = jac_add_mod(R, T, a, m)
    X, Y, Z = R
    assert Z % pp == 0 and Z % m != 0
    tval = -X * Z * pow(Y, -1, m) % m          # t = -x/y = -X Z / Y, divisible by p
    return tval // pp % pp

rng = random.Random(9)
Pa = random_point(aa, ba, pa, rng)
secret = rng.randrange(1, pa)
Qa = ec_mul(secret, Pa, aa, pa)
k_found = smart_psi(Qa, aa, ba, pa) * pow(smart_psi(Pa, aa, ba, pa), -1, pa) % pa
print(secret, k_found, ec_mul(k_found, Pa, aa, pa) == Qa)
```

```text
1009 10 25 1009
383 383 True
```

The curve $y^2 = x^3 + 10x + 25$ over $\mathbb{F}_{1009}$ has exactly 1,009 points,
and the secret 383 comes back from one division. The same code works unchanged for a
256-bit anomalous curve; nothing in it depends on the size of $p$ except the cost of
one scalar multiplication.

### Fix it

Check that $N \ne p$. Every standard does. The lesson is wider: the security of an
elliptic curve rests on the absence of extra structure, and each kind of structure
(small embedding degree, trace 1, a smooth group order) is a known way in.

## 13.11 Choosing a curve

*Level: expert.*

Put together, the rules for a curve over a prime field are:

1. **Large prime subgroup.** $N = h \cdot n$ with $n$ prime and $\sqrt{\pi n/4}$ (the
   cost of Pollard's rho) at least $2^{128}$, and a small cofactor $h$.
2. **Not anomalous**: $N \ne p$.
3. **Large embedding degree**, unless pairings are wanted.
4. **Twist security**, for $x$-only implementations: the twist's order should also
   have a large prime factor (§13.3).
5. **A large CM discriminant**, to avoid unknown attacks that use the extra
   endomorphisms (secp256k1, with $D = -3$, deliberately fails this one to gain
   speed).
6. **Rigidity**: the reasons for every constant should be explained, so that the
   designer had no room to choose a curve with a hidden weakness.
7. **Implementation safety**: a Montgomery ladder or complete formulas, constant
   time, point validation that is hard to get wrong.

Daniel Bernstein and Tanja Lange collected rules like these on their **SafeCurves**
site (2013 to 2014), and checked the standard curves against them.

### The seeds of P-256

The NIST curves of 1999, including P-256, were generated by the US National Security
Agency (Jerry Solinas's work) following the method of the ANSI X9.62 standard: the
coefficient $b$ is derived from a SHA-1 hash of a **seed**, so that the designer
supposedly could not choose $b$. For P-256 the seed is
`c49d360886e704936a6678e1139d26b7819f7e90`. The method proves that $b$ came from the
seed, but nothing explains where the seed came from. After the Dual_EC_DRBG affair
(told in *Cryptanalysis*, [chapter 18](../cryptanalysis/18-Random-Numbers-Gone-Wrong.md)), that gap mattered to many people. No attack on P-256 is
known, and it remains the most widely deployed curve on the internet; but "verifiably
random" is weaker than it sounds. The 2015 paper "How to Manipulate Curve Standards"
by Bernstein and colleagues (the "BADA55" paper) generated curves that pass such
procedures but carry chosen patterns, to show how much freedom remains.

### The constants of Curve25519

Bernstein's Curve25519 (2006) was chosen by explained rules. The prime $2^{255} - 19$
is the largest prime below $2^{255}$, and its form $2^{255} - c$ with small $c$ gives
fast reduction. The curve is $y^2 = x^3 + Ax^2 + x$, with $A$ the smallest positive
integer such that $(A - 2)/4$ is an integer (for the ladder's constant) and both the
curve and its twist have orders $8 \times$ prime and $4 \times$ prime. That $A$ is
486,662. Brainpool (2005, RFC 5639) took another route to rigidity, deriving its
constants from $\pi$ and $e$.

### Code it

We check Curve25519's twist and the trace of P-256 from their published constants.

```python
# Twist security: Curve25519 has 8 * ell points; its twist has 4 * (a prime).
N25519 = 8 * ell
t25519 = q25519 + 1 - N25519
N_twist = 2 * q25519 + 2 - N25519
print(t25519.bit_length(), N_twist % 4, is_probable_prime(N_twist // 4), (N_twist // 4).bit_length())
p256 = 2**256 - 2**224 + 2**192 + 2**96 - 1
n256 = 0xFFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551
t256 = p256 + 1 - n256
print(is_probable_prime(n256), t256.bit_length(), t256 * t256 <= 4 * p256, embedding_degree(p256, n256))
```

```text
128 0 True 253
True 127 True None
```

Curve25519's trace has only 128 bits, as Hasse demands. Its twist has $4 \times$ a
253-bit prime points, so an $x$-only ladder fed a point on the twist still faces a
discrete logarithm in a group of 253-bit prime order. P-256 has prime order, a 127-bit trace, and no small
embedding degree.

## In the real world

- **Point counting** with SEA is routine; SageMath, PARI/GP and Magma count 256-bit
  curves in seconds, and every new curve proposal publishes its order.
- **P-256** carries much of the TLS key exchange that is not X25519, and most WebAuthn
  and smart-card signatures. **secp256k1** (cofactor 1, $j$-invariant 0) signs
  Bitcoin and Ethereum transactions.
- **Curve25519** is in TLS 1.3, SSH, Signal, WireGuard and many more; RFC 7748 and
  RFC 8032 specify it.
- **BLS12-381** carries Ethereum's validator signatures and many zero-knowledge
  systems; **BN254** remains in older SNARK deployments because Ethereum's original
  precompiles support only it.
- **Supersingular curves** reappear in post-quantum cryptography, in isogeny-based
  schemes; their story, including the 2022 break of SIKE, is told in *Post-quantum
  cryptography*.

## Going deeper

- *The $\ell$-adic picture.* Frobenius acts on the $\ell$-torsion $E[\ell] \cong
  (\mathbb{Z}/\ell)^2$ as a $2 \times 2$ matrix with trace $t$ and determinant $p$;
  Schoof's algorithm computes that trace. Over $\mathbb{F}_{p^n}$ the count is
  $p^n + 1 - (\alpha^n + \beta^n)$ where $\alpha, \beta$ are the roots of $X^2 - tX + p$.
- *Isogenies.* Curves with the same number of points over $\mathbb{F}_p$ are
  exactly those connected by isogenies (Tate's theorem); the isogeny graph is the
  stage for the isogeny-based cryptography mentioned above.
- *Ate and optimal pairings.* Practical pairings on BN and BLS12 curves shorten
  Miller's loop from $\log r$ to about $\log r / \varphi(k)$ bits (Frederik
  Vercauteren, 2010).
- *Weil descent.* Curves over extension fields $\mathbb{F}_{2^n}$ with composite
  $n$ can sometimes be attacked by moving to a higher-genus curve over a subfield
  (the GHS attack of Gaudry, Hess and Smart, 2002); this is why prime fields and
  prime-degree binary fields became the norm.

## Check yourself

??? question "1. A curve over $\mathbb{F}_{101}$ has 120 points. Is that possible?"

    $2\sqrt{101} \approx 20.1$, so $N$ must lie between $82$ and $122$. Yes; its
    trace is $t = 102 - 120 = -18$.

??? question "2. The curve has 120 points. How many does its twist have?"

    $2 \cdot 101 + 2 - 120 = 84$.

??? question "3. Count the points of $y^2 = x^3 + 1$ over $\mathbb{F}_5$."

    The right-hand sides for $x = 0, \ldots, 4$ are $1, 2, 4, 3, 0$. Squares mod 5
    are $0, 1, 4$. So $x = 0$ and $x = 2$ give two points each, $x = 4$ one, plus
    $\mathcal{O}$: $N = 6 = 5 + 1$. The trace is 0: this curve is supersingular.

??? question "4. Why does a supersingular curve over $\mathbb{F}_p$ ($p > 3$) have embedding degree at most 2?"

    $N = p + 1$, so $r \mid p + 1$, and then $r \mid (p + 1)(p - 1) = p^2 - 1$.

??? question "5. A curve has $N = 2^{20} \cdot 3^{30} \cdot 5^{40}$. How hard is its discrete logarithm?"

    Easy: by Pohlig-Hellman it splits into problems in groups of order 2, 3 and 5,
    whatever the size of $N$.

??? question "6. In BLS, why can't anyone forge $\sigma$ for a new message from old signatures?"

    $\sigma = sk \cdot H(m)$ for a new $m$ requires multiplying a fresh,
    unpredictable point by $sk$; with only $pk = sk \cdot G$ and previous
    $sk \cdot H(m_i)$, that is the computational Diffie-Hellman problem in the
    group (hashing makes $H(m)$ unrelated to earlier points).

??? question "7. What does the final exponentiation in the Tate pairing do?"

    It raises Miller's value to $(p^k - 1)/r$, which maps it to an $r$-th root of
    unity, makes the result independent of choices made along the way, and kills
    every factor lying in a proper subfield (which is why vertical lines can be
    dropped).

??? question "8. An implementation uses the $x$-only ladder on a curve whose twist has order $2 \cdot 3 \cdot 7 \cdot q$ with $q$ of 40 bits. What can an attacker learn?"

    By sending $x$-coordinates of twist points of orders 2, 3, 7 and $q$, the
    secret modulo $2 \cdot 3 \cdot 7$ and then modulo $q$ (with $2^{20}$ work
    by rho), about 45 bits of the key, which shortens any remaining search by that
    much. A secure twist leaves nothing to learn.

??? question "9. Why does Smart's attack need the lift modulo $p^2$ and not just $\mathbb{F}_p$?"

    Over $\mathbb{F}_p$, $pP = \mathcal{O}$ and carries no information. Modulo
    $p^2$, $p\tilde P$ is a point close to $\mathcal{O}$ whose parameter $t$ is
    $p$ times a value in $\mathbb{F}_p$, and that value is linear in $P$.

## What you learned

- Hasse: $N = p + 1 - t$ with $|t| \le 2\sqrt{p}$, because the degree is a positive
  definite quadratic form; every such $t$ occurs, distributed roughly like a semicircle.
- The quadratic twist has $p + 1 + t$ points; $x$-only code must be safe on it.
- Points are counted by brute force ($p$), baby-step giant-step ($p^{1/4}$), or
  Schoof and SEA (polynomial in $\log p$); the CM method builds curves with a chosen
  count.
- $E(\mathbb{F}_p) \cong \mathbb{Z}/n_1 \times \mathbb{Z}/n_2$ with $n_1 \mid
  \gcd(n_2, p - 1)$; standards want a large prime order and a small cofactor.
- The embedding degree $k$ decides whether a pairing maps the discrete logarithm to
  a field: small $k$ breaks supersingular curves (MOV), moderate $k$ makes pairing
  cryptography possible, and ordinary curves have astronomically large $k$.
- Miller's algorithm computes pairings by double-and-add; BLS signatures and their
  aggregation follow in a few lines. BN254 dropped to about 100 bits after exTNFS;
  BLS12-381 replaced it.
- Anomalous curves ($N = p$) fall to Smart's attack by one division.
- Curve choice: prime order, twist security, large $k$, not anomalous, explained
  constants. P-256's seed is unexplained; Curve25519's $A$ is the smallest that works.

**Next:** [Chapter 14](14-Lattices.md), lattices: the geometry
behind post-quantum cryptography, with LLL in full.

## Further reading

- Lawrence Washington, *Elliptic Curves: Number Theory and Cryptography*, 2nd edition
  (CRC Press, 2008), chapters 4 (Hasse, point counting), 5 (MOV, anomalous curves) and
  11 (pairings).
- Joseph Silverman, *The Arithmetic of Elliptic Curves*, 2nd edition (Springer, 2009),
  chapter V for Hasse's theorem and supersingular curves.
- René Schoof, "Elliptic Curves over Finite Fields and the Computation of Square Roots
  mod p", *Mathematics of Computation* 44 (1985); "Counting Points on Elliptic Curves
  over Finite Fields", *Journal de Théorie des Nombres de Bordeaux* 7 (1995).
- Alfred Menezes, Tatsuaki Okamoto and Scott Vanstone, "Reducing Elliptic Curve
  Logarithms to Logarithms in a Finite Field", *IEEE Transactions on Information Theory*
  39 (1993).
- Nigel Smart, "The Discrete Logarithm Problem on Elliptic Curves of Trace One",
  *Journal of Cryptology* 12 (1999).
- Victor Miller, "The Weil Pairing, and Its Efficient Calculation", *Journal of
  Cryptology* 17 (2004).
- Dan Boneh, Ben Lynn and Hovav Shacham, "Short Signatures from the Weil Pairing",
  ASIACRYPT 2001.
- Paulo Barreto and Michael Naehrig, "Pairing-Friendly Elliptic Curves of Prime Order",
  SAC 2005; David Freeman, Michael Scott and Edlyn Teske, "A Taxonomy of
  Pairing-Friendly Elliptic Curves", *Journal of Cryptology* 23 (2010).
- Taechan Kim and Razvan Barbulescu, "Extended Tower Number Field Sieve", CRYPTO 2016.
- Craig Costello, "Pairings for Beginners" (2012), a free tutorial with worked examples.
- Daniel Bernstein and Tanja Lange, SafeCurves, safecurves.cr.yp.to.
- RFC 9380, Hashing to Elliptic Curves (2023).
- In *Cryptanalysis*: [chapter 12](../cryptanalysis/12-Discrete-Logarithms.md), for the index calculus and number field sieve that
  the MOV attack hands the problem to.
