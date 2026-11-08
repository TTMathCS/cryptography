# 11. Polynomials at Work

*Two points fix a line; three points fix a parabola; $k$ points fix a
polynomial of degree less than $k$. That one fact, and its partner that a
nonzero polynomial of degree $d$ has at most $d$ roots, power a surprising share
of modern cryptography. This chapter puts polynomials to work. It interpolates
them (Lagrange and Newton), splits a secret among people so that any $k$ of them
can rebuild it and fewer learn nothing (Shamir), tests whether two huge
polynomials are equal by evaluating them at one random point (Schwartz-Zippel),
turns them into error-correcting codes (Reed-Solomon), multiplies them fast with
the fast Fourier transform and its exact cousin over a finite field, the
number-theoretic transform, and finally commits to a polynomial and opens it at
one point, the trick behind today's zero-knowledge proofs.*

!!! abstract "In this chapter"
    **You will learn:**

    - why $k$ points determine a polynomial of degree below $k$, and two ways
      to find it (Lagrange and Newton);
    - Shamir secret sharing, with a proof that $k - 1$ shares reveal nothing;
    - the Schwartz-Zippel lemma and randomized identity testing;
    - Reed-Solomon codes as evaluations of a polynomial;
    - the fast Fourier transform, and the number-theoretic transform over
      $\mathbb{F}_p$, with code and operation counts;
    - polynomial commitments in outline (KZG), and why succinct
      zero-knowledge proofs are polynomial identities checked at a random
      point;
    - the attacks on careless secret sharing: cheating shareholders and the
      share at zero.

    **You need:** [Chapter 8](08-Rings-Fields-and-Polynomials.md) (polynomials
    over a field, roots) and [Chapter 9](09-Linear-Algebra.md) (linear systems).

    **Levels:** §11.1 to §11.4 are for beginners, §11.5 to §11.8 are
    intermediate, §11.9 and §11.10 are expert.

## 11.1 The problem

*Level: beginner.*

The master key of the Arcadia City archive must survive anything: the loss of a
laptop, the illness of an administrator, the corruption of one staff member. The
council wants five officers to hold pieces of it, so that any three can rebuild the
key when needed, and any two together learn nothing at all, not even a single bit.

Cutting the key into five parts does not work: each part gives away part of the key,
and losing three parts loses it forever. Giving everyone the whole key is worse.
Adi Shamir's 1979 answer is a parabola. Hide the key as the height where a secret
parabola crosses the vertical axis, and give each officer one point on the parabola.
Three points fix a parabola, so three officers find it and read off the key. Two
points fit a parabola through *every* possible height on the axis, so two officers
learn nothing.

The same idea, that a polynomial is pinned down by enough of its values and free
otherwise, gives error-correcting codes, fast multiplication, and the compact proofs
that blockchains use to check a million computations by looking at a few numbers.
This chapter builds them in order.

## 11.2 Interpolation

*Level: beginner.*

**Theorem.** Over a field, for any $k$ points $(x_1, y_1), \dots, (x_k, y_k)$ with
distinct $x_i$, there is exactly one polynomial $f$ of degree less than $k$ with
$f(x_i) = y_i$ for all $i$.

*Proof.* Uniqueness: if $f$ and $g$ both fit, $f - g$ has degree less than $k$ and
$k$ roots, so it is the zero polynomial (Chapter 8). Existence: Lagrange's formula
below writes one down. $\blacksquare$

### Lagrange's formula

For each $i$, the polynomial

$$L_i(x) = \prod_{j \ne i} \frac{x - x_j}{x_i - x_j}$$

has degree $k - 1$, equals 1 at $x_i$, and equals 0 at every other $x_j$. So

$$f(x) = \sum_{i=1}^{k} y_i L_i(x)$$

takes the value $y_i$ at each $x_i$. Over a finite field the divisions are
multiplications by inverses, and everything is exact. The idea is older than
Joseph-Louis Lagrange (1795); Edward Waring published it in 1779.

### By hand

Find the parabola through $(1, 10)$, $(2, 19)$, $(5, 82)$, and its value at 0.

$L_1(0) = \frac{(0-2)(0-5)}{(1-2)(1-5)} = \frac{10}{4} = \frac52$,
$L_2(0) = \frac{(0-1)(0-5)}{(2-1)(2-5)} = -\frac53$,
$L_3(0) = \frac{(0-1)(0-2)}{(5-1)(5-2)} = \frac{2}{12} = \frac16$.

So $f(0) = 10 \cdot \frac52 - 19 \cdot \frac53 + 82 \cdot \frac16 = 25 - \frac{95}{3}
+ \frac{41}{3} = 25 - 18 = 7$. The points come from $f(x) = 3x^2 + 7$.

### Code it

We compute in the field $\mathbb{F}_P$ with the Mersenne prime $P = 2^{61} - 1$.

```python
P = 2**61 - 1                      # a Mersenne prime: our field F_P

def evaluate(coeffs, x, p=P):
    """Horner's rule: coeffs lowest degree first."""
    y = 0
    for c in reversed(coeffs):
        y = (y * x + c) % p
    return y

def lagrange_at(points, x, p=P):
    """Value at x of the unique polynomial of degree < len(points) through the points."""
    total = 0
    for i, (xi, yi) in enumerate(points):
        num, den = 1, 1
        for j, (xj, _) in enumerate(points):
            if j != i:
                num = num * (x - xj) % p
                den = den * (xi - xj) % p
        total = (total + yi * num * pow(den, -1, p)) % p
    return total

f = [7, 0, 3]                          # 3x^2 + 7
pts = [(x, evaluate(f, x)) for x in (1, 2, 5)]
print(pts, lagrange_at(pts, 0), lagrange_at(pts, 10), evaluate(f, 10))
```

```text
[(1, 10), (2, 19), (5, 82)] 7 307 307
```

<figure class="mars-fig">
<svg viewBox="0 0 640 260" width="640" role="img" aria-label="The parabola 3x squared plus 7 through the points (1, 10), (2, 19) and (5, 82), crossing the vertical axis at 7" fill="currentColor" font-size="12">
<g stroke="currentColor" stroke-width="1.2" fill="none">
<line x1="80" y1="230" x2="600" y2="230"/><line x1="80" y1="230" x2="80" y2="20"/>
<path class="acc" stroke-width="2" d="M80.0 216.0 L88.0 215.9 L96.0 215.8 L104.0 215.5 L112.0 215.0 L120.0 214.5 L128.0 213.8 L136.0 213.1 L144.0 212.2 L152.0 211.1 L160.0 210.0 L168.0 208.7 L176.0 207.4 L184.0 205.9 L192.0 204.2 L200.0 202.5 L208.0 200.6 L216.0 198.7 L224.0 196.6 L232.0 194.3 L240.0 192.0 L248.0 189.5 L256.0 187.0 L264.0 184.3 L272.0 181.4 L280.0 178.5 L288.0 175.4 L296.0 172.3 L304.0 169.0 L312.0 165.5 L320.0 162.0 L328.0 158.3 L336.0 154.6 L344.0 150.7 L352.0 146.6 L360.0 142.5 L368.0 138.2 L376.0 133.9 L384.0 129.4 L392.0 124.7 L400.0 120.0 L408.0 115.1 L416.0 110.2 L424.0 105.1 L432.0 99.8 L440.0 94.5 L448.0 89.0 L456.0 83.5 L464.0 77.8 L472.0 71.9 L480.0 66.0 L488.0 59.9 L496.0 53.8 L504.0 47.5 L512.0 41.0"/>
</g>
<g text-anchor="middle">
<text x="80" y="248">0</text><text x="160" y="248">1</text><text x="240" y="248">2</text><text x="400" y="248">4</text><text x="480" y="248">5</text>
</g>
<circle cx="160" cy="210" r="5"/><circle cx="240" cy="192" r="5"/><circle cx="480" cy="66" r="5"/>
<circle cx="80" cy="216" r="6" class="acc-fill"/>
<text x="170" y="200">(1, 10)</text><text x="250" y="184">(2, 19)</text><text x="492" y="70">(5, 82)</text>
<text x="92" y="236" class="acc-fill">f(0) = 7</text>
<text x="330" y="40">f(x) = 3x² + 7</text>
<text x="20" y="30">f(x)</text><text x="610" y="234">x</text>
</svg>
<figcaption>Figure 11.1. Three points fix a parabola. Lagrange's formula finds its value anywhere, including at x = 0, without ever writing the coefficients down. In Shamir's scheme the points are the shares and f(0) is the secret.</figcaption>
</figure>

### Newton's form

Lagrange's formula must be redone from scratch when a point is added. Newton's form
writes

$$f(x) = c_0 + c_1(x - x_1) + c_2(x - x_1)(x - x_2) + \dots,$$

with coefficients from a table of **divided differences**. A new point adds one
term and leaves the old coefficients unchanged. For the example, $f(x) = 10 + 9(x -
1) + 3(x - 1)(x - 2)$; check at 5: $10 + 36 + 36 = 82$.

```python
def newton_coeffs(points, p=P):
    """Divided differences: coefficients of the Newton form."""
    xs = [x for x, _ in points]
    c = [y for _, y in points]
    n = len(points)
    for j in range(1, n):
        for i in range(n - 1, j - 1, -1):
            c[i] = (c[i] - c[i - 1]) * pow(xs[i] - xs[i - j], -1, p) % p
    return xs, c

def newton_eval(xs, c, x, p=P):
    y = 0
    for k in range(len(c) - 1, -1, -1):
        y = (y * (x - xs[k]) + c[k]) % p
    return y

xs, c = newton_coeffs(pts)
print(c, newton_eval(xs, c, 10))
pts4 = pts + [(7, 999)]                # add a fourth point: only one new coefficient
xs4, c4 = newton_coeffs(pts4)
print(c4[:3] == c, newton_eval(xs4, c4, 7))
```

```text
[10, 9, 3] 307
True 999
```

Adding a fourth point, $(7, 999)$, kept the first three coefficients. Either way,
interpolating $k$ points costs about $k^2$ field operations; with the fast transforms
of §11.6 and a subproduct tree, $k \log^2 k$.

### Interpolation is linear algebra

Writing $f(x) = a_0 + a_1x + \dots + a_{k-1}x^{k-1}$, the conditions $f(x_i) = y_i$
are $k$ linear equations in the $k$ unknowns $a_j$, with the **Vandermonde matrix**
$V_{ij} = x_i^{\,j}$. Its determinant is $\prod_{i < j}(x_j - x_i)$, nonzero
exactly when the $x_i$ are distinct: the theorem again, in the language of
Chapter 9. Lagrange's formula is the inverse of the Vandermonde matrix, written out.

## 11.3 Shamir secret sharing

*Level: beginner.*

To split a secret $s$ (a number in $\mathbb{F}_P$) among $n$ people so that any $k$
can recover it:

1. Choose random $a_1, \dots, a_{k-1}$ in $\mathbb{F}_P$ and let $f(x) = s + a_1x +
   \dots + a_{k-1}x^{k-1}$.
2. Give person $i$ the **share** $(i, f(i))$, for $i = 1, \dots, n$.
3. Any $k$ people interpolate and compute $f(0) = s$.

This is a **$(k, n)$ threshold scheme**. The field must have more than $n$ elements
so that the $x$-coordinates are distinct and nonzero.

```python
import secrets

def share(secret, k, n, p=P):
    """Shamir: random polynomial of degree k - 1 with constant term = secret."""
    coeffs = [secret] + [secrets.randbelow(p) for _ in range(k - 1)]
    return [(x, evaluate(coeffs, x, p)) for x in range(1, n + 1)]

def recover(shares, p=P):
    return lagrange_at(shares, 0, p)

key = 123456789012345678
sh = share(key, 3, 5)
print(recover(sh[:3]) == key, recover([sh[0], sh[2], sh[4]]) == key, recover(sh[:2]) == key)
```

```text
True True False
```

Any three of the five shares recover the key; two do not (the third test gives the
value at 0 of the straight line through two points, which is unrelated to the key).

### Fewer than $k$ shares reveal nothing

**Theorem.** For any $k - 1$ shares and any candidate secret $s'$, exactly one
polynomial of degree less than $k$ fits the shares and has $f(0) = s'$. Since the
polynomial's other coefficients were uniformly random, every candidate secret is
equally likely given the $k - 1$ shares.

*Proof.* The $k - 1$ shares and the point $(0, s')$ are $k$ points with distinct
$x$-coordinates, so exactly one polynomial of degree below $k$ passes through them
(§11.2). Each choice of $s'$ thus corresponds to exactly one choice of the random
coefficients $(a_1, \dots, a_{k-1})$, which were uniform; so the shares are equally
compatible with every $s'$. $\blacksquare$

This is **information-theoretic** security, like the one-time pad (Chapter 17): it
holds against an attacker with unlimited computing power, quantum or not. Check it
in a small field:

```python
# Two shares say nothing: for every candidate secret there is exactly one consistent polynomial.
def consistent_polys(two_shares, candidates, p):
    out = []
    for s in candidates:
        pts3 = [(0, s)] + two_shares
        out.append(tuple(lagrange_at(pts3, x, p) for x in range(4)))
    return out

p = 101
two = [(1, 40), (2, 77)]
polys = consistent_polys(two, range(p), p)
print(len(set(polys)), all(q[1] == 40 and q[2] == 77 for q in polys))
```

```text
101 True
```

Modulo 101, two shares fit exactly 101 different parabolas, one for each possible
secret.

<figure class="mars-fig">
<svg viewBox="0 0 640 260" width="640" role="img" aria-label="Two shares, at x = 1 and x = 2, and several different parabolas through them, each crossing the vertical axis at a different height, so two shares say nothing about the secret" fill="currentColor" font-size="12">
<g stroke="currentColor" stroke-width="1.2" fill="none">
<line x1="80" y1="230" x2="600" y2="230"/><line x1="80" y1="230" x2="80" y2="20"/>
<path d="M80 60 Q 210 260 340 40" opacity="0.6"/>
<path d="M80 110 Q 200 170 340 70" opacity="0.6"/>
<path d="M80 160 Q 230 100 340 110" opacity="0.6"/>
<path d="M80 205 Q 220 40 340 160" opacity="0.6"/>
</g>
<circle cx="180" cy="139" r="6" class="acc-fill"/><circle cx="260" cy="118" r="6" class="acc-fill"/>
<text x="180" y="125" text-anchor="middle" class="acc-fill">share 1</text><text x="262" y="104" text-anchor="middle" class="acc-fill">share 2</text>
<circle cx="80" cy="60" r="4"/><circle cx="80" cy="110" r="4"/><circle cx="80" cy="160" r="4"/><circle cx="80" cy="205" r="4"/>
<text x="70" y="64" text-anchor="end">s?</text><text x="70" y="114" text-anchor="end">s?</text><text x="70" y="164" text-anchor="end">s?</text><text x="70" y="209" text-anchor="end">s?</text>
<text x="380" y="80">through two points pass parabolas</text>
<text x="380" y="98">with every possible value at x = 0:</text>
<text x="380" y="116">exactly one for each candidate secret</text>
<text x="380" y="160" class="acc-fill">a third share picks one of them</text>
</svg>
<figcaption>Figure 11.2. Why two shares of a 3-out-of-n scheme reveal nothing. For every possible secret there is one parabola through the two known points, and all of them were equally likely to have been chosen. A third point singles out the real one.</figcaption>
</figure>

**Properties worth knowing.** Shares are as long as the secret, which is optimal for
perfect schemes. New shares can be issued later by evaluating $f$ at new points.
Shares can be **refreshed** without changing the secret, by adding to everyone's
share the value of a random polynomial with constant term 0. And because
interpolation is linear, sums of shared secrets can be computed share by share, the
starting point of multiparty computation and of threshold signatures.

!!! note "Life story: Shamir secret sharing"
    **Born:** November 1979, Adi Shamir, "How to Share a Secret",
    *Communications of the ACM*; George Blakley published an independent scheme
    with hyperplanes the same year · **Purpose:** split a secret so that any $k$
    of $n$ holders can rebuild it and fewer learn nothing · **Helped:** the
    DNSSEC root key's recovery shares, HashiCorp Vault's unsealing keys,
    hardware security module backups, wallet seed backups (SLIP-39), threshold
    signatures and multiparty computation · **Status:** perfect as mathematics;
    most failures are in the code around it (§11.9)

## 11.4 Schwartz-Zippel: one random point is enough

*Level: beginner.*

Are two polynomials equal? If they are given as formulas, say $(x + 1)^{20}$ and a
long sum, expanding both may be expensive; for polynomials in many variables given
as circuits, it may be infeasible. Evaluate both at a random point instead.

**Lemma (Schwartz, 1980; Zippel, 1979; DeMillo and Lipton, 1978).** Let $f$ be a
nonzero polynomial in any number of variables, of total degree $d$, over a field
$F$, and let $S \subseteq F$ be finite. If each variable is chosen independently
and uniformly from $S$, then

$$\Pr[f(r_1, \dots, r_m) = 0] \le \frac{d}{|S|}.$$

*Proof for one variable.* $f$ has at most $d$ roots, so at most $d$ of the $|S|$
choices make it zero. (Several variables: induct, writing $f$ as a polynomial in
$x_1$ whose coefficients are polynomials in the others.) $\blacksquare$

So to test $f = g$, test $f - g = 0$ at a random point. If they differ, the test
catches it with probability at least $1 - d/|S|$. With $|S| = 2^{61}$ and degree a
million, the error is below $2^{-41}$, from one evaluation.

```python
import random

def schwartz_zippel_trial(d, p, trials, rng):
    """A nonzero polynomial of degree d (product of d random linear factors) vanishes at few points."""
    roots = [rng.randrange(p) for _ in range(d)]
    hits = 0
    for _ in range(trials):
        r = rng.randrange(p)
        v = 1
        for a in roots:
            v = v * (r - a) % p
        hits += v == 0
    return hits / trials, d / p

rng = random.Random(11)
print(schwartz_zippel_trial(10, 1009, 100000, rng))

def poly_identity_test(f, g, p, rng):
    r = rng.randrange(p)
    return f(r) % p == g(r) % p

F = lambda x: (x + 1) ** 20
G = lambda x: sum(__import__("math").comb(20, k) * x**k for k in range(21))
H = lambda x: G(x) + x**7               # differs from F in one coefficient
print(poly_identity_test(F, G, P, rng), poly_identity_test(F, H, P, rng))
```

```text
(0.0098, 0.009910802775024777)
True False
```

The first line measures it: a degree-10 polynomial modulo 1009 vanished at 0.98
percent of random points, against the bound $10/1009 \approx 0.99$ percent. The
second line checks the binomial theorem for $(x + 1)^{20}$ at a random point of
$\mathbb{F}_P$, and catches a polynomial that differs in one coefficient.

This lemma is the engine of §11.8. A proof system turns "this computation was done
correctly" into "these two polynomials are equal", and the verifier checks it at one
random point.

## 11.5 Reed-Solomon codes

*Level: intermediate.*

Irving Reed and Gustave Solomon (1960) turned interpolation into error correction.
To protect $k$ symbols of a message in $\mathbb{F}_q$, read them as the coefficients
of a polynomial $m(x)$ of degree less than $k$, and send its values at $n > k$
distinct points:

$$(m(\alpha_1), m(\alpha_2), \dots, m(\alpha_n)).$$

Any $k$ correct values determine $m$, so up to $n - k$ lost symbols (**erasures**) can
be repaired by interpolation. And two different messages give polynomials that agree
in at most $k - 1$ places (their difference has at most $k - 1$ roots), so their
codewords differ in at least $n - k + 1$ places: the **minimum distance** is $n - k +
1$. That is the largest possible for any code with these parameters (the Singleton
bound, Chapter 18); Reed-Solomon codes are MDS, the same property MixColumns had in
Chapter 9. Correcting up to $(n - k)/2$ *errors* at unknown places is harder, and is
what the Berlekamp-Massey algorithm of Chapter 9 was invented for; Chapter 18 does
it.

```python
# Reed-Solomon over F_929: the message is the coefficient list; the codeword is evaluations.
q = 929
def rs_encode(msg, n, q=q):
    return [evaluate(msg, x, q) for x in range(1, n + 1)]

msg = [3, 2, 1]                          # degree < 3
cw = rs_encode(msg, 7)
received = cw[:]
received[1] = None; received[4] = None; received[6] = None     # three erasures
known = [(x, y) for x, y in zip(range(1, 8), received) if y is not None][:3]
print(cw, [lagrange_at(known, x, q) for x in range(1, 8)] == cw)
```

```text
[6, 11, 18, 27, 38, 51, 66] True
```

Seven symbols carry a three-symbol message; three were erased; any three survivors
rebuild the codeword.

Reed-Solomon codes are everywhere: CDs and DVDs, QR codes, RAID-6 disk arrays, deep-space
links (Voyager's images after 1986 and many Mars missions used Reed-Solomon codes
concatenated with convolutional codes), and in cryptography: Shamir shares *are* a
Reed-Solomon codeword whose first symbol is the secret, which is why McEliece and
Sarwate (1981) could add error correction to secret sharing.

## 11.6 The fast Fourier transform

*Level: intermediate.*

Multiplying two polynomials of degree $n$ coefficient by coefficient takes about
$n^2$ multiplications. Values are cheaper: if $f$ and $g$ are known at $2n$ points,
the product $fg$ is known at the same points with $2n$ multiplications, and $2n$
values determine it. So: evaluate, multiply pointwise, interpolate. The catch is that
evaluating at $2n$ points normally costs $n^2$. The **fast Fourier transform** (FFT)
picks the points so that it costs $n \log n$.

### The trick

Choose the points to be the $N$th **roots of unity** $\omega^0, \omega^1, \dots,
\omega^{N-1}$, where $\omega^N = 1$ and $N$ is a power of 2. Split $f$ into even and
odd coefficients:

$$f(x) = f_{\text{even}}(x^2) + x f_{\text{odd}}(x^2).$$

The squares of the $N$th roots of unity are the $(N/2)$th roots of unity, each
appearing twice, and $\omega^{k + N/2} = -\omega^k$. So

$$f(\omega^k) = E_k + \omega^k O_k, \qquad f(\omega^{k + N/2}) = E_k - \omega^k O_k,$$

where $E$ and $O$ are the transforms of the two halves at the $(N/2)$th roots. Two
half-size problems and $N$ more operations: $T(N) = 2T(N/2) + O(N)$, so $T(N) = O(N
\log N)$. The pair of formulas is the **butterfly**, the same shape as the Walsh and
Möbius transforms of Chapter 10. Interpolation is the same transform with $\omega^{-1}$
and a final division by $N$.

James Cooley and John Tukey published the algorithm in 1965, for detecting nuclear
tests from seismometer data; Carl Friedrich Gauss had used it around 1805 to
interpolate the orbits of asteroids, in notes published after his death.

```python
import cmath

def fft(a):
    """Recursive Cooley-Tukey FFT over the complex numbers, len(a) a power of 2."""
    n = len(a)
    if n == 1:
        return a[:]
    even, odd = fft(a[0::2]), fft(a[1::2])
    out = [0] * n
    for k in range(n // 2):
        w = cmath.exp(-2j * cmath.pi * k / n) * odd[k]
        out[k], out[k + n // 2] = even[k] + w, even[k] - w
    return out

def ifft(A):
    n = len(A)
    return [x.conjugate() / n for x in fft([x.conjugate() for x in A])]

def poly_mul_fft(f, g):
    n = 1
    while n < len(f) + len(g) - 1:
        n *= 2
    A, B = fft(f + [0] * (n - len(f))), fft(g + [0] * (n - len(g)))
    c = ifft([x * y for x, y in zip(A, B)])
    return [round(x.real) for x in c[:len(f) + len(g) - 1]]

print(poly_mul_fft([1, 2, 3], [4, 5]), poly_mul_fft([9, 9, 9], [9, 9]))
```

```text
[4, 13, 22, 15] [81, 162, 162, 81]
```

$(1 + 2x + 3x^2)(4 + 5x) = 4 + 13x + 22x^2 + 15x^3$. Over the complex numbers the
FFT rounds, and the code fixes it with `round`; for long inputs with big coefficients,
rounding errors grow and the answer can be wrong. Cryptography needs exact answers.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="The eighth roots of unity on a circle; squaring them gives the fourth roots, each twice; this halving is what makes the fast Fourier transform fast" fill="currentColor" font-size="12">
<g stroke="currentColor" stroke-width="1.2" fill="none">
<circle cx="150" cy="125" r="90"/><circle cx="450" cy="125" r="90"/>
<path d="M265 125 L335 125" class="acc"/><path d="M335 125 L325 119 M335 125 L325 131" class="acc"/>
</g>
<g class="acc-fill">
<circle cx="240" cy="125" r="5"/><circle cx="213.6" cy="61.4" r="5"/><circle cx="150" cy="35" r="5"/><circle cx="86.4" cy="61.4" r="5"/>
<circle cx="60" cy="125" r="5"/><circle cx="86.4" cy="188.6" r="5"/><circle cx="150" cy="215" r="5"/><circle cx="213.6" cy="188.6" r="5"/>
</g>
<circle cx="540" cy="125" r="6"/><circle cx="450" cy="35" r="6"/><circle cx="360" cy="125" r="6"/><circle cx="450" cy="215" r="6"/>
<text x="252" y="120">1</text><text x="222" y="55">ω</text><text x="150" y="25" text-anchor="middle">ω²</text><text x="70" y="55">ω³</text>
<text x="48" y="129" text-anchor="end">−1</text><text x="150" y="235" text-anchor="middle">ω⁶</text>
<text x="300" y="112" text-anchor="middle">square</text>
<text x="552" y="129">1 (from 1 and −1)</text><text x="450" y="25" text-anchor="middle">i (from ω and ω⁵)</text>
<text x="450" y="238" text-anchor="middle">−i</text><text x="348" y="150" text-anchor="end">−1</text>

</svg>
<figcaption>Figure 11.3. Why the FFT is fast. Squaring the eight 8th roots of unity gives the four 4th roots, each twice, so evaluating at 8 points reduces to two evaluations at 4 points, and so on down. Over a finite field, the same picture holds for elements of order 8.</figcaption>
</figure>

## 11.7 The number-theoretic transform

*Level: intermediate.*

The FFT needs only a field with an element $\omega$ of order $N$. In $\mathbb{F}_p$,
the multiplicative group is cyclic of order $p - 1$ (Chapter 8), so such an element
exists exactly when $N$ divides $p - 1$: take $\omega = g^{(p-1)/N}$ for a primitive
root $g$. The FFT over $\mathbb{F}_p$ is the **number-theoretic transform** (NTT). It
is exact, uses only integer arithmetic, and is the workhorse of lattice cryptography.

Primes of the form $c \cdot 2^k + 1$ have roots of unity of every power-of-2 order up
to $2^k$. The prime $998244353 = 119 \cdot 2^{23} + 1$, with primitive root 3, allows
transforms of length up to $2^{23}$ and is a favorite of programming contests. ML-KEM
uses $q = 3329 = 13 \cdot 2^8 + 1$, which has 256th roots of unity, and ML-DSA uses
$q = 8380417 = 2^{23} - 2^{13} + 1$, which has 512th roots; Chapter 15 builds the
"negacyclic" variant they need, modulo $x^n + 1$.

This version works in place: a bit-reversal permutation, then $\log_2 N$ rounds of
butterflies.

```python
# The number-theoretic transform: the FFT with a root of unity in F_p instead of C.
p = 998244353                          # 119 * 2^23 + 1
g = 3                                  # a primitive root mod p

def ntt(a, invert=False, p=p):
    n = len(a)
    a = a[:]
    j = 0
    for i in range(1, n):              # bit-reversal permutation
        bit = n >> 1
        while j & bit:
            j ^= bit
            bit >>= 1
        j |= bit
        if i < j:
            a[i], a[j] = a[j], a[i]
    length = 2
    while length <= n:
        w = pow(g, (p - 1) // length, p)
        if invert:
            w = pow(w, p - 2, p)
        for i in range(0, n, length):
            wn = 1
            for k in range(length // 2):
                u, v = a[i + k], a[i + k + length // 2] * wn % p
                a[i + k], a[i + k + length // 2] = (u + v) % p, (u - v) % p
                wn = wn * w % p
        length *= 2
    if invert:
        ninv = pow(n, p - 2, p)
        a = [x * ninv % p for x in a]
    return a

def poly_mul_ntt(f, g_):
    n = 1
    while n < len(f) + len(g_) - 1:
        n *= 2
    A = ntt(f + [0] * (n - len(f)))
    B = ntt(g_ + [0] * (n - len(g_)))
    return ntt([x * y % p for x, y in zip(A, B)], invert=True)[:len(f) + len(g_) - 1]

print(poly_mul_ntt([1, 2, 3], [4, 5]), poly_mul_ntt([9, 9, 9], [9, 9]))
rng = random.Random(4)
f1 = [rng.randrange(1000) for _ in range(300)]
g1 = [rng.randrange(1000) for _ in range(300)]
school = [0] * 599
for i, a in enumerate(f1):
    for j, b in enumerate(g1):
        school[i + j] += a * b
print(poly_mul_ntt(f1, g1) == school)
```

```text
[4, 13, 22, 15] [81, 162, 162, 81]
True
```

The NTT agrees with the schoolbook product on 300-term polynomials, exactly, with no
rounding. How much does it save? Counting multiplications rather than timing them (a
timing in Python mostly measures the interpreter):

```python
# Count multiplications instead of timing them: schoolbook n^2 against NTT 3 * (N/2) log2 N + N.
from math import log2
for n in (256, 1024, 4096, 65536):
    N = 2 * n
    school_ops = n * n
    ntt_ops = 3 * (N // 2) * int(log2(N)) + N
    print(n, school_ops, ntt_ops, round(school_ops / ntt_ops, 1))
```

```text
256 65536 7424 8.8
1024 1048576 35840 29.3
4096 16777216 167936 99.9
65536 4294967296 3473408 1236.5
```

For two polynomials of 256 coefficients the NTT needs about a ninth of the
multiplications; for 4,096, a hundredth. Real lattice schemes do better still, since
the public key can be stored already transformed, so a product costs one forward
transform, a pointwise product and one inverse.

!!! note "Life story: the fast Fourier transform"
    **Born:** about 1805 in Gauss's unpublished notes; 1965, James Cooley (IBM)
    and John Tukey (Princeton), "An Algorithm for the Machine Calculation of
    Complex Fourier Series" · **Purpose:** evaluate a polynomial at all $N$th
    roots of unity in $N \log N$ steps · **Helped:** signal processing, audio and
    image compression, MRI, radar, the multiplication of huge integers
    (Schönhage-Strassen, 1971; Harvey and van der Hoeven's $n \log n$ algorithm,
    2019), and through the NTT, ML-KEM, ML-DSA and STARK proofs · **Status:**
    named one of the top ten algorithms of the 20th century; in every phone

## 11.8 Commitments and proofs: polynomials as evidence

*Level: intermediate.*

### Polynomial commitments

A **polynomial commitment** lets a prover publish a short value $C$ that binds
them to a polynomial $f$ of large degree, and later prove that $f(z) = y$ for any
point $z$ the verifier asks about, with a short proof. The proof rests on one line
of algebra (the factor theorem, Chapter 8):

$$f(z) = y \iff (x - z) \text{ divides } f(x) - y.$$

So the prover sends the quotient $q(x) = (f(x) - y)/(x - z)$, and the verifier
checks the identity $f(s) - y = q(s)(s - z)$ at one point $s$, which, by
Schwartz-Zippel, convinces it that the identity holds everywhere.

The **KZG scheme** (Aniket Kate, Gregory Zaverucha and Ian Goldberg, 2010) makes
this work when *nobody* knows $s$. A one-time setup publishes $g^{s}, g^{s^2}, \dots,
g^{s^d}$ in an elliptic-curve group and then destroys $s$ (the "toxic waste"). The
prover can compute $C = g^{f(s)}$ and $\pi = g^{q(s)}$ from these, by linear
combination, without knowing $s$. The verifier checks the identity "in the exponent"
with a pairing (Chapter 13): $e(C / g^y, g) = e(\pi, g^{s} / g^{z})$. The commitment
and the proof are one group element each, whatever the degree.

In plain numbers, with $s$ visible, the algebra is:

```python
# A toy polynomial commitment check: the prover claims f(z) = y; then (f(x) - y) is divisible by (x - z).
def poly_divide_by_linear(f, z, p):
    """Synthetic division of f by (x - z): returns (quotient, remainder)."""
    out = []
    acc = 0
    for c in reversed(f):
        acc = (acc * z + c) % p
        out.append(acc)
    rem = out.pop()
    return list(reversed(out)), rem

pp = 2**61 - 1
f = [5, 0, 2, 9, 1]                      # x^4 + 9x^3 + 2x^2 + 5
z = 12345
y = evaluate(f, z, pp)
qf, rem = poly_divide_by_linear([(f[0] - y) % pp] + f[1:], z, pp)
s = random.Random(99).randrange(pp)      # the hidden point (the "toxic waste" in KZG)
lhs = (evaluate(f, s, pp) - y) % pp
rhs = evaluate(qf, s, pp) * (s - z) % pp
print(rem, lhs == rhs)
```

```text
0 True
```

The remainder of $f(x) - y$ divided by $x - z$ is 0, and the identity holds at the
hidden point. In KZG the last check happens inside the pairing, so $s$ is never seen.

Ethereum adopted KZG commitments for data "blobs" in its March 2024 upgrade
(EIP-4844), after a public setup ceremony in 2023 to which more than 140,000 people
contributed randomness; the setup is safe if any single contributor destroyed theirs.

### Why succinct proofs are polynomial tricks

A **succinct proof** convinces a verifier that a long computation was done correctly
by checking far less than the computation itself. All the practical systems (Groth16,
PLONK, STARKs and their descendants) follow the same three steps:

1. **Arithmetize.** Write the computation as a set of polynomial identities: for
   instance, encode the values in each step of the computation as the evaluations of a
   polynomial $T(x)$ on a set $H$ of points, and each rule of the computation as an
   identity like $T(\omega x) - T(x)^2 = 0$ for all $x \in H$.
2. **Reduce to divisibility.** "The identity holds on all of $H$" is the same as "the
   polynomial $Z_H(x) = \prod_{h \in H}(x - h)$ divides it" (factor theorem, many
   times). The prover supplies the quotient.
3. **Check at a random point.** The verifier picks a random $r$, the prover opens the
   committed polynomials at $r$, and the verifier checks the identity there. By
   Schwartz-Zippel, a false claim survives with probability at most degree over field
   size.

When $H$ is the set of $N$th roots of unity, $Z_H(x) = x^N - 1$, and all the
polynomial arithmetic runs on NTTs: this chapter's tools in one pipeline. STARKs replace
KZG by a hash-based commitment (FRI, Eli Ben-Sasson and colleagues, 2018) that
tests closeness to a low-degree polynomial, which is a Reed-Solomon code: §11.5 again.
Zero knowledge (hiding everything but the truth of the claim) is added by blinding
the polynomials with random multiples of $Z_H$. *The cryptography book*,
[Chapter 23](../../book/23-Advanced-Protocols.md), shows what such proofs are used for.

<figure class="mars-fig">
<svg viewBox="0 0 640 220" width="640" role="img" aria-label="The pipeline of a succinct proof: a computation becomes polynomial identities, identities on a set H become divisibility by Z_H, and divisibility is checked by opening committed polynomials at one random point" fill="currentColor" font-size="13">
<g stroke="currentColor" stroke-width="1.3" fill="none">
<rect x="20" y="60" width="130" height="70" rx="8"/>
<rect x="180" y="60" width="130" height="70" rx="8"/>
<rect x="340" y="60" width="130" height="70" rx="8"/>
<rect x="500" y="60" width="120" height="70" rx="8" class="acc"/>
<path d="M150 95 L180 95"/><path d="M310 95 L340 95"/><path d="M470 95 L500 95"/>
</g>
<g text-anchor="middle">
<text x="85" y="90">computation</text><text x="85" y="110" font-size="11">trace of N steps</text>
<text x="245" y="90">identities</text><text x="245" y="110" font-size="11">P(T(x), T(ωx)) = 0 on H</text>
<text x="405" y="90">divisibility</text><text x="405" y="110" font-size="11">Z_H divides P, quotient Q</text>
<text x="560" y="90" class="acc-fill">one point</text><text x="560" y="110" font-size="11" class="acc-fill">check at random r</text>
<text x="245" y="160" font-size="12">arithmetization</text>
<text x="405" y="160" font-size="12">factor theorem</text>
<text x="560" y="160" font-size="12">Schwartz-Zippel</text>
<text x="320" y="200" font-size="12">commitments (KZG or FRI) make the prover answer at r before seeing r</text>
</g>
</svg>
<figcaption>Figure 11.4. How succinct proofs reduce a long computation to a few numbers. Each arrow is a fact from this chapter or Chapter 8; the commitment scheme is what stops the prover from choosing polynomials after seeing the random point.</figcaption>
</figure>

## 11.9 Break it: careless secret sharing

*Level: expert.*

Shamir's scheme is perfect against a passive attacker. Around it, things go wrong.

**The cheating shareholder.** Martin Tompa and Heather Woll (1988) noticed that
shares are not authenticated. At reconstruction, a cheater hands in $y + \delta$
instead of $y$. Since interpolation is linear, the recovered "secret" is off by $\delta
\lambda$, where $\lambda = L_i(0)$ is the cheater's Lagrange weight, which everyone can
compute. The honest holders get garbage; the cheater subtracts $\delta\lambda$ and
alone holds the real secret.

```python
# Tompa and Woll's cheater: shareholder 3 hands in a false share and alone learns the true secret.
p = P
secret_key = 424242424242
shares3 = share(secret_key, 3, 3)
(x1, y1), (x2, y2), (x3, y3) = shares3
lam3 = (0 - x1) * (0 - x2) * pow((x3 - x1) * (x3 - x2), -1, p) % p   # Lagrange weight of share 3 at 0
delta = 1000
fake = [(x1, y1), (x2, y2), (x3, (y3 + delta) % p)]
announced = recover(fake)
true_from_cheater = (announced - delta * lam3) % p
print(announced == secret_key, true_from_cheater == secret_key)
# Implementations must also refuse a share at x = 0, which IS the secret.
print(evaluate([secret_key, 5, 7], 0) == secret_key)
```

```text
False True
True
```

The announced secret is wrong, the cheater recovers the true one, and the last line is
the other classic bug: the value at $x = 0$ *is* the secret, so code that ever creates,
accepts or answers a request for a share at $x = 0$ (or at $x \equiv 0 \bmod p$, such as
$x = p$) gives it away. Trail of Bits reported in 2021 that several threshold-signature
libraries failed to reject such $x$-coordinates, letting a malicious participant
extract secrets.

**Fix it.** Use **verifiable secret sharing**: Paul Feldman (1987) publishes $g^{a_j}$ for
each coefficient, so each share can be checked against the commitments ($g^{f(i)} =
\prod_j (g^{a_j})^{i^j}$); Torben Pedersen (1991) does the same with commitments that
also hide the secret. Validate every $x$-coordinate: nonzero, distinct, in range. Use a
fresh random polynomial for every sharing, and never reuse one with a different secret.

**Two smaller lessons.** Shares must be stored as carefully as the secret's pieces would
be, since $k$ of them *are* the secret. And "any $k$ can recover" includes $k$ colluders
who were not supposed to cooperate; the threshold is a policy decision, not only a
mathematical one.

## 11.10 In the real world and going deeper

*Level: expert.*

**Threshold cryptography.** Since Shamir sharing is linear, it can be used without ever
reconstructing the key. In a **threshold signature**, $k$ of $n$ servers each sign with
their share, and the partial signatures combine, by Lagrange interpolation in the
exponent, into an ordinary signature. Threshold Schnorr and BLS signatures are simple;
threshold ECDSA took two decades of work and is used in cryptocurrency custody. NIST's
multi-party threshold cryptography project published a first call for threshold
schemes in 2023.

**Going deeper.**

- *Packed and ramp schemes.* Share several secrets at once in different evaluation
  points of one polynomial, at the price of a gap between the privacy and recovery
  thresholds (Matthew Franklin and Moti Yung, 1992).
- *Fast multipoint evaluation.* Evaluating a degree-$n$ polynomial at $n$ arbitrary
  points takes $O(n \log^2 n)$ with a subproduct tree and fast division.
- *The polynomial method beyond cryptography.* Schwartz-Zippel underlies randomized
  algorithms for perfect matching and the proof of the PCP theorem; the
  Reed-Solomon proximity tests of STARKs come from this line of work.
- *Chapter 15* builds the negacyclic NTT of ML-KEM and ML-DSA from the transform of
  §11.7, and Chapter 18 decodes Reed-Solomon codes with errors.

## Check yourself

??? question "1. Find the line through $(1, 4)$ and $(3, 10)$ over the rationals, and its value at 0."

    Slope $(10 - 4)/(3 - 1) = 3$, so $f(x) = 3x + 1$ and $f(0) = 1$.

??? question "2. With Lagrange's formula, find $f(0)$ for the parabola through $(1, 2)$, $(2, 5)$, $(3, 10)$."

    $L_1(0) = \frac{(-2)(-3)}{(-1)(-2)} = 3$, $L_2(0) = \frac{(-1)(-3)}{(1)(-1)} =
    -3$, $L_3(0) = \frac{(-1)(-2)}{(2)(1)} = 1$. So $f(0) = 6 - 15 + 10 = 1$
    (it is $x^2 + 1$).

??? question "3. In a $(3, 5)$ Shamir scheme over $\mathbb{F}_{101}$, how many polynomials are consistent with two given shares?"

    101, one for each possible secret, which is why two shares reveal nothing.

??? question "4. Why must the field have more than $n$ elements for $n$ shareholders?"

    Each shareholder needs a distinct nonzero $x$-coordinate; $\mathbb{F}_q$ has
    only $q - 1$ nonzero elements.

??? question "5. Two polynomials of degree at most 1,000 over $\mathbb{F}_p$ with $p \approx 2^{61}$ agree at a random point. How likely is it that they differ?"

    At most $1000/2^{61} < 2^{-51}$, by Schwartz-Zippel.

??? question "6. A Reed-Solomon code has $n = 255$ and $k = 223$. How many erasures can it repair? How many errors?"

    $n - k = 32$ erasures, $16$ errors. (This is the CCSDS standard code used on
    NASA and ESA deep-space links.)

??? question "7. For which $N$ does $\mathbb{F}_{17}$ have an NTT of length $N$?"

    $N$ must divide $p - 1 = 16$: $N = 1, 2, 4, 8, 16$.

??? question "8. What is a primitive 4th root of unity modulo 13?"

    $5$: $5^2 = 25 \equiv -1$, so $5^4 = 1$ and $5^2 \ne 1$. (8 also works.)

??? question "9. In a polynomial commitment, why does $f(z) = y$ imply that $x - z$ divides $f(x) - y$?"

    $f(x) - y$ has a root at $z$, and by the factor theorem a polynomial with a
    root $z$ is divisible by $x - z$.

??? question "10. How does a cheating shareholder in Tompa and Woll's attack learn the secret while others do not?"

    They add $\delta$ to their share; the reconstructed value is $s + \delta\lambda$
    with $\lambda$ their public Lagrange weight. Only the cheater knows $\delta$, so
    only they can subtract $\delta\lambda$.

## What you learned

- $k$ points with distinct $x$ determine one polynomial of degree below $k$;
  Lagrange and Newton find it, and Vandermonde says the same in matrix language.
- Shamir sharing hides the secret at $f(0)$; any $k$ shares recover it and $k - 1$
  reveal nothing, information-theoretically.
- Schwartz-Zippel: a nonzero polynomial of degree $d$ vanishes at a random point with
  probability at most $d/|S|$, so equality is tested at one point.
- Reed-Solomon codewords are polynomial evaluations; minimum distance $n - k + 1$,
  the best possible.
- The FFT evaluates at roots of unity in $N \log N$ steps; over $\mathbb{F}_p$ with $N
  \mid p - 1$ it is the exact NTT, the engine of lattice cryptography.
- Polynomial commitments prove $f(z) = y$ through divisibility by $x - z$; succinct
  proofs are arithmetization, divisibility and one random point.
- Shares need authentication (verifiable secret sharing) and validated
  $x$-coordinates.

**Next:** [Chapter 12](12-Elliptic-Curve-Group.md), elliptic curves: the
group law, scalar multiplication, and the curves used in practice.

## Further reading

- Adi Shamir, "How to Share a Secret", *Communications of the ACM* 22 (1979).
- George Blakley, "Safeguarding Cryptographic Keys", AFIPS National Computer
  Conference (1979).
- Jacob Schwartz, "Fast Probabilistic Algorithms for Verification of Polynomial
  Identities", *Journal of the ACM* 27 (1980).
- Irving Reed and Gustave Solomon, "Polynomial Codes over Certain Finite Fields",
  *Journal of the Society for Industrial and Applied Mathematics* 8 (1960).
- James Cooley and John Tukey, "An Algorithm for the Machine Calculation of Complex
  Fourier Series", *Mathematics of Computation* 19 (1965).
- Joachim von zur Gathen and Jürgen Gerhard, *Modern Computer Algebra*, 3rd edition
  (Cambridge, 2013), chapters 5, 8 and 10.
- Martin Tompa and Heather Woll, "How to Share a Secret with Cheaters", *Journal of
  Cryptology* 1 (1988).
- Paul Feldman, "A Practical Scheme for Non-interactive Verifiable Secret Sharing",
  FOCS 1987.
- Aniket Kate, Gregory Zaverucha and Ian Goldberg, "Constant-Size Commitments to
  Polynomials and Their Applications", ASIACRYPT 2010.
- Ariel Gabizon, Zachary Williamson and Oana Ciobotaru, "PLONK" (2019).
- Eli Ben-Sasson, Iddo Bentov, Yinon Horesh and Michael Riabzev, "Scalable,
  Transparent, and Post-Quantum Secure Computational Integrity" (2018).
- Justin Thaler, *Proofs, Arguments, and Zero-Knowledge* (2022), free online.
- In *The cryptography book*: [Chapter 23](../../book/23-Advanced-Protocols.md).
