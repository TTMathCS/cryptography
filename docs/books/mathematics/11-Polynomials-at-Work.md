# 11. Polynomials at Work

*Two points fix a line; three points fix a parabola; $k$ points fix a
polynomial of degree less than $k$. That one fact, and its partner that a
nonzero polynomial of degree $d$ has at most $d$ roots, power a surprising share
of modern cryptography. This chapter puts polynomials to work. It interpolates
them (Lagrange and Newton), splits a secret among people so that any $k$ of them
can rebuild it and fewer learn nothing (Shamir), tests whether two huge
polynomials are equal by evaluating them at one random point (Schwartz-Zippel),
turns them into error-correcting codes that unmask a lying shareholder
(Reed-Solomon, Berlekamp-Welch), multiplies them fast (Karatsuba, the fast Fourier
transform and the number-theoretic transform), commits to them and folds them to
prove low degree (KZG, FRI), and signs with a key nobody holds, by interpolating in
the exponent.*

!!! abstract "In this chapter"
    **You will learn:**

    - why $k$ points determine a polynomial of degree below $k$, how to find it
      (Lagrange, Newton, the barycentric form), and the closed-form Lagrange basis
      on roots of unity;
    - Shamir secret sharing, with a proof that $k - 1$ shares reveal nothing;
    - the Schwartz-Zippel lemma with its full proof, worked probabilities, and
      batched identity testing;
    - Reed-Solomon codes, and Berlekamp-Welch decoding of a share set with a
      corrupted share, by hand and in code;
    - Karatsuba, the FFT and the NTT as three answers to "evaluate, multiply,
      interpolate";
    - polynomial commitments in outline (KZG), succinct proofs as identities
      checked at a random point, and FRI folding;
    - the attacks on careless secret sharing;
    - Lagrange interpolation in the exponent, the mathematics of threshold BLS.

    **You need:** [Chapter 8](08-Rings-Fields-and-Polynomials.md) (polynomials
    over a field, roots) and [Chapter 9](09-Linear-Algebra.md) (linear systems).

    **Levels:** §11.1 to §11.4 are for beginners (the several-variable proof
    and the batching in §11.4 are intermediate), §11.5 to §11.8 are intermediate (FRI's soundness argument is
    expert), §11.9 and §11.10 are expert.

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

### The Lagrange basis, drawn

Lagrange's formula has a picture. For fixed nodes $x_1, \dots, x_k$, the polynomials
$L_1, \dots, L_k$ form a **basis** of the space of polynomials of degree less than
$k$: every such polynomial is a combination of them, and the coefficients are simply
its values at the nodes. Figure 11.2 draws the basis for the nodes 1, 2 and 5 of the
hand example:

$$L_1(x) = \frac{(x-2)(x-5)}{4}, \qquad L_2(x) = -\frac{(x-1)(x-5)}{3}, \qquad
L_3(x) = \frac{(x-1)(x-2)}{12}.$$

<figure class="mars-fig">
<svg viewBox="0 0 640 310" width="640" role="img" aria-label="The three Lagrange basis polynomials for the nodes 1, 2 and 5. Each equals 1 at its own node and 0 at the other two; at x = 0 they take the values 5/2, minus 5/3 and 1/6, the weights that recover a Shamir secret" fill="currentColor" font-size="13">
<g stroke="currentColor" fill="none">
<line x1="70" y1="175" x2="570" y2="175" stroke-width="1.2"/><line x1="70" y1="30" x2="70" y2="280" stroke-width="1.2"/>
<line x1="70" y1="125" x2="570" y2="125" stroke-opacity=".3" stroke-dasharray="3 3"/>
<line x1="150" y1="30" x2="150" y2="280" stroke-opacity=".2"/><line x1="230" y1="30" x2="230" y2="280" stroke-opacity=".2"/><line x1="470" y1="30" x2="470" y2="280" stroke-opacity=".2"/>
<path stroke-width="2" d="M70,50.0L90,71.1L110,90.6L130,108.6L150,125.0L170,139.8L190,153.1L210,164.8L230,175.0L250,183.6L270,190.6L290,196.1L310,200.0L330,202.3L350,203.1L370,202.3L390,200.0L410,196.1L430,190.6L450,183.6L470,175.0L490,164.8L510,153.1L530,139.8L550,125.0"/>
<path stroke-width="2" stroke-dasharray="7 5" d="M70,258.3L90,234.4L110,212.5L130,192.7L150,175.0L170,159.4L190,145.8L210,134.4L230,125.0L250,117.7L270,112.5L290,109.4L310,108.3L330,109.4L350,112.5L370,117.7L390,125.0L410,134.4L430,145.8L450,159.4L470,175.0L490,192.7L510,212.5L530,234.4L550,258.3"/>
<path stroke-width="2.4" stroke-dasharray="2 4" d="M70,166.7L90,169.5L110,171.9L130,173.7L150,175.0L170,175.8L190,176.0L210,175.8L230,175.0L250,173.7L270,171.9L290,169.5L310,166.7L330,163.3L350,159.4L370,154.9L390,150.0L410,144.5L430,138.5L450,132.0L470,125.0L490,117.4L510,109.4L530,100.8L550,91.7"/>
</g>
<circle cx="150" cy="125" r="4.5"/><circle cx="230" cy="125" r="4.5"/><circle cx="470" cy="125" r="4.5"/>
<circle cx="70" cy="50" r="5" fill-opacity=".6"/><circle cx="70" cy="258.3" r="5" fill-opacity=".6"/><circle cx="70" cy="166.7" r="5" fill-opacity=".6"/>
<g text-anchor="end">
<text x="62" y="55">5/2</text><text x="62" y="263">−5/3</text><text x="62" y="163">1/6</text><text x="62" y="129" fill-opacity=".7">1</text>
</g>
<g text-anchor="middle">
<text x="150" y="298">x₁ = 1</text><text x="230" y="298">x₂ = 2</text><text x="470" y="298">x₃ = 5</text><text x="70" y="298">0</text>
</g>
<text x="560" y="129">L₁</text><text x="560" y="262">L₂</text><text x="560" y="92">L₃</text>
<text x="290" y="44">L₁ solid, L₂ dashed, L₃ dotted</text>
</svg>
<figcaption>Figure 11.2. The Lagrange basis for the nodes 1, 2 and 5. Each curve is 1 at its own node and 0 at the other two, so any parabola through the three nodes is 10 L₁ + 19 L₂ + 82 L₃ for the values 10, 19 and 82 of §11.2. The values at x = 0 (the dots on the axis) are the weights a Shamir reconstruction multiplies the shares by.</figcaption>
</figure>

**The basis sums to one.** $\sum_i L_i(x) = 1$ for every $x$. The constant
polynomial 1 has degree $0 < k$ and takes the value 1 at every node, so by uniqueness
it equals its own Lagrange expansion $\sum_i 1 \cdot L_i(x)$. At $x = 0$ in the
example: $\frac52 - \frac53 + \frac16 = \frac{15 - 10 + 1}{6} = 1$.

**The weights at zero depend only on who shows up.** With $x$-coordinates $1, 2,
\dots$, share $i$'s weight in a reconstruction by the set $S$ is

$$\lambda_i = L_i(0) = \prod_{j \in S,\, j \ne i} \frac{j}{j - i}.$$

For $S = \{1, 2, 3\}$ that is $\lambda_1 = \frac{2 \cdot 3}{1 \cdot 2} = 3$,
$\lambda_2 = \frac{1 \cdot 3}{(-1) \cdot 1} = -3$ and $\lambda_3 = \frac{1 \cdot 2}{(-2)
\cdot (-1)} = 1$, so the secret is $3y_1 - 3y_2 + y_3$, whatever the polynomial.
The weights are public, and they return in the cheater's attack of §11.9 and the
signatures of §11.10.

### Barycentric form, and the basis on roots of unity

Lagrange's formula as written costs about $k^2$ operations per point. Let $\ell(x) = \prod_j (x - x_j)$ and let the
**barycentric weights** be $w_i = 1/\prod_{j \ne i}(x_i - x_j)$. Then $L_i(x) = \ell(x)
\, w_i / (x - x_i)$, and

$$f(x) = \ell(x) \sum_{i=1}^{k} \frac{w_i\, y_i}{x - x_i}.$$

The $w_i$ depend only on the nodes and are computed once; after that each new
point costs about $3k$ operations. Jean-Paul Berrut and Lloyd
Trefethen's 2004 survey argues that, written this way, Lagrange's formula deserves to
be the standard method of interpolation.

When the nodes are the $N$th roots of unity $1, \omega, \dots, \omega^{N-1}$ (as
in §11.6 and §11.8), both pieces have closed forms: $\ell(x) = x^N - 1$, whose
derivative is $N x^{N-1}$, and $\prod_{j \ne i}(\omega^i - \omega^j) =
\ell'(\omega^i) = N\omega^{-i}$, so $w_i = \omega^i / N$. Hence

$$L_i(x) = \frac{\omega^i\,(x^N - 1)}{N\,(x - \omega^i)}.$$

One power and one inverse give $L_i$ anywhere off the domain, whatever $N$ is. A PLONK verifier uses exactly this to get the first Lagrange
polynomial at its random point, with $N$ in the millions.

```python
# Uses lagrange_at() from the listing above.
q97 = 97                                 # 96 = 8 * 12, so F_97 has 8th roots of unity
N = 8
w = pow(5, 96 // N, q97)                 # 5 is a primitive root mod 97; w has order 8
H = [pow(w, i, q97) for i in range(N)]   # the evaluation domain: all 8th roots of unity

def lagrange_basis_root_of_unity(i, x, p=q97):
    """L_i(x) on the domain of N-th roots of unity: w^i (x^N - 1) / (N (x - w^i))."""
    wi = H[i]
    return wi * (pow(x, N, p) - 1) * pow(N * (x - wi), -1, p) % p

zeta = 40                                # any point outside the domain
slow = [lagrange_at([(h, int(j == i)) for j, h in enumerate(H)], zeta, q97) for i in range(N)]
fast = [lagrange_basis_root_of_unity(i, zeta) for i in range(N)]
print(w, H)
print(slow == fast, sum(fast) % q97)
```

It prints:

```text
64 [1, 64, 22, 50, 96, 33, 75, 47]
True 1
```

The first line lists the 8th roots of unity modulo 97 (note $\omega^4 = 96 = -1$).
The closed form agrees with the full Lagrange computation for all eight basis
polynomials at $\zeta = 40$, and the eight values sum to 1.

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
<figcaption>Figure 11.3. Why two shares of a 3-out-of-n scheme reveal nothing. For every possible secret there is one parabola through the two known points, and all of them were equally likely to have been chosen. A third point singles out the real one.</figcaption>
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

### The proof for several variables

*Intermediate.* With several variables there is no root count ($xy - 1$ has
infinitely many zeros over the rationals), so the proof inducts on the number of
variables $m$. The case $m = 1$ is done.

For $m > 1$, collect the powers of $x_1$:

$$f(x_1, \dots, x_m) = \sum_{i=0}^{t} x_1^{\,i}\, g_i(x_2, \dots, x_m),$$

where $t$ is the highest power of $x_1$ that occurs, so $g_t \ne 0$ and $g_t$ has
total degree at most $d - t$. Draw $r_2, \dots, r_m$ first, and let $B$ be the event
that $g_t(r_2, \dots, r_m) = 0$. By the induction hypothesis (with $m - 1$
variables), $\Pr[B] \le (d - t)/|S|$. If $B$ does not happen, then $f(x_1, r_2,
\dots, r_m)$ is a one-variable polynomial whose leading coefficient
$g_t(r_2, \dots, r_m)$ is not zero, so it has degree exactly $t$ and at most $t$
roots; the fresh random $r_1$ hits one with probability at most $t/|S|$. Adding the
two cases,

$$\Pr[f(r) = 0] \le \Pr[B] + \Pr[f(r) = 0 \mid \text{not } B] \le \frac{d - t}{|S|}
+ \frac{t}{|S|} = \frac{d}{|S|}. \qquad \blacksquare$$

### A worked probability

Over $\mathbb{F}_7$, with $S$ the whole field, the lemma promises that a polynomial
of total degree 2 vanishes at no more than $2/7 = 14/49$ of the 49 points.

- $f = xy - 1$ is zero exactly when $y = x^{-1}$, so at six points: $6/49$. In the
  proof, $t = 1$ and $g_1 = y$; $B$ is $y = 0$ (probability $1/7$), and otherwise one
  $x$ in seven is a root. The proof adds $1/7 + 1/7$, but when $B$ happens $f = -1$
  is not zero, so the truth is $\frac67 \cdot \frac17 = \frac{6}{49}$.
- $f = (x - 1)(y - 1)$ is zero when $x = 1$ or $y = 1$: $7 + 7 - 1 = 13$ points,
  just under 14, because the bound counts $(1, 1)$ twice.
- $f = x^2 + y^2 + 1$ vanishes on a conic with $p + 1 = 8$ points, since $-1$ is not
  a square modulo 7 (Chapter 5): $8/49$.

In one variable the bound is met exactly: $(x - 1)(x - 2)$ vanishes at 2 of the 7
points. So the field must be much larger than the degree. Over $\mathbb{F}_2$ the
nonzero polynomial $x^2 + x$ vanishes at both elements, and the bound $2/2$ says
nothing. Systems that compute in a small field, such as the 64-bit "Goldilocks" prime
$2^{64} - 2^{32} + 1$ or the 31-bit "BabyBear" prime $15 \cdot 2^{27} + 1$, draw their
random point from an extension field of degree 2 to 4. Repetition also works: $t$
independent tests all pass on a false identity with probability at most
$(d/|S|)^t$.

### Many identities, one check

PLONK must show that every gate is right, that wires agree where they should, and
that the computation starts in the right state. A second random number folds all the
checks into one. To check $h_1 = 0, \dots, h_m = 0$ (each $h_j = f_j - g_j$ of degree at most $d$),
draw $\alpha$ and $r$ and test

$$\sum_{j=0}^{m-1} \alpha^{j}\, h_{j+1}(r) = 0.$$

If some $h_j$ is not the zero polynomial, then $H(\alpha, x) = \sum_j \alpha^j
h_{j+1}(x)$ is a nonzero polynomial in the two variables $\alpha$ and $x$, of total
degree at most $m - 1 + d$, so the test passes with probability at most $(m - 1 +
d)/|F|$: one evaluation instead of $m$.

```python
# Count the zeros of three degree-2 polynomials on all 49 points of F_7 x F_7.
def zero_fraction(f, p):
    zeros = sum(f(x, y) % p == 0 for x in range(p) for y in range(p))
    return zeros, p * p

polys = {"xy - 1": lambda x, y: x * y - 1,
         "(x - 1)(y - 1)": lambda x, y: (x - 1) * (y - 1),
         "x^2 + y^2 + 1": lambda x, y: x * x + y * y + 1}
for name, f in polys.items():
    print(name, zero_fraction(f, 7), "bound", "2/7 = 14/49")

# Batching: check several claimed identities f_j(x) = g_j(x) with one random point and one random alpha.
def batched_check(pairs, p, rng):
    r, alpha = rng.randrange(p), rng.randrange(p)
    total = sum(pow(alpha, j, p) * (f(r) - g(r)) for j, (f, g) in enumerate(pairs)) % p
    return total == 0

rng = random.Random(2026)
claims = [(lambda x: (x + 2) ** 2, lambda x: x * x + 4 * x + 4),
          (lambda x: (x - 1) * (x + 1), lambda x: x * x - 1),
          (lambda x: (x + 1) ** 3, lambda x: x**3 + 3 * x * x + 3 * x + 1)]
wrong = claims[:2] + [(lambda x: (x + 1) ** 3, lambda x: x**3 + 3 * x * x + 2 * x + 1)]
print(batched_check(claims, P, rng), batched_check(wrong, P, rng))
```

It prints:

```text
xy - 1 (6, 49) bound 2/7 = 14/49
(x - 1)(y - 1) (13, 49) bound 2/7 = 14/49
x^2 + y^2 + 1 (8, 49) bound 2/7 = 14/49
True False
```

The counts are the hand counts, and the batched test passes three true identities
and rejects a list with one false one.

### Where the test lives: KZG and PLONK in outline

In a KZG-based system such as PLONK, the prover commits to its polynomials (one
curve point each); the random point $\zeta$ is a hash of those commitments
(Fiat-Shamir), so the polynomials are fixed before $\zeta$ exists; the prover opens
them at $\zeta$; and the verifier checks one batched identity on the opened numbers,
built around the gate equation $q_L a + q_R b + q_O c + q_M ab + q_C = Z_H \cdot t$.
Two things can fail: the commitment, which rests on a computational assumption, and
the random point, which Schwartz-Zippel bounds. For $2^{24}$ gates over the 255-bit
scalar field of BLS12-381 the second is below $2^{24}/2^{254} = 2^{-230}$. The
advanced protocols book applies the lemma to a whole circuit in
[§7.5](../advanced/07-SNARKs.md#75-one-random-point-is-enough).

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
what the Berlekamp-Massey algorithm of Chapter 9 was invented for; the end of this
section does it for a set of Shamir shares, and Chapter 18 for codes in general.

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

### Errors, not only erasures: Berlekamp-Welch on a share set

A lost share is an erasure: we know which one is missing. A wrong share is an error,
and nobody knows which one it is; Tompa and Woll's cheater (§11.9) hands one in on
purpose, a flipped bit in storage by accident. Because a list of Shamir shares is a
Reed-Solomon codeword, $n$ shares of a polynomial of degree below $k$ can find and
remove up to $e = \lfloor (n - k)/2 \rfloor$ wrong ones. The method is Lloyd Welch
and Elwyn Berlekamp's (patented in 1986), and its trick is to make the unknown
positions part of a linear system. Chapter 18 treats it for codes in general; here
the positions it finds are the names of the people who handed in bad values.

**The idea.** Let $f$ be the true polynomial, $y_i$ the value handed in by holder
$x_i$, and let the **error locator** $E(x)$ be the monic polynomial of degree $e$ whose
roots are the $x_i$ of the bad shares (padded with arbitrary roots if there are fewer
than $e$ of them). For every holder,

$$y_i\, E(x_i) = f(x_i)\, E(x_i),$$

because either $y_i = f(x_i)$, or $x_i$ is a bad share and both sides are 0. Name
the product $Q(x) = f(x)E(x)$, a polynomial of degree below $k + e$. The equations

$$Q(x_i) = y_i\, E(x_i), \qquad i = 1, \dots, n,$$

are linear in the unknown coefficients: $k + e$ of $Q$ and $e$ of $E$ (its leading
coefficient is 1). That is $k + 2e \le n$ unknowns and $n$ equations. Solve, divide,
and $f = Q/E$; the roots of $E$ that are share coordinates name the cheaters.

#### By hand: four shares, one of them wrong

Work in $\mathbb{F}_{13}$. A $(2, 4)$ scheme shares the secret 5 with the line $f(x) =
5 + 3x$, so the shares are $(1, 8)$, $(2, 11)$, $(3, 1)$ and $(4, 4)$ (since $14 \equiv
1$ and $17 \equiv 4$). At reconstruction holder 3 hands in 9 instead of 1. The
received values are $8, 11, 9, 4$. With $n = 4$ and $k = 2$ we can correct $e = 1$
error.

The unknowns are $Q(x) = q_0 + q_1 x + q_2 x^2$ and $E(x) = x - a$, where $a$ is the
position of the bad share. The equation at holder $i$ is $q_0 + q_1 x_i + q_2 x_i^2 =
y_i (x_i - a)$, or, with the unknowns on the left,

$$q_0 + q_1 x_i + q_2 x_i^2 + a\, y_i = x_i y_i.$$

The four holders give, modulo 13 (with $16 \equiv 3$, $22 \equiv 9$, $27 \equiv 1$):

$$\begin{aligned}
q_0 + q_1 + q_2 + 8a &= 8,\\
q_0 + 2q_1 + 4q_2 + 11a &= 9,\\
q_0 + 3q_1 + 9q_2 + 9a &= 1,\\
q_0 + 4q_1 + 3q_2 + 4a &= 3.
\end{aligned}$$

Subtract each equation from the next to remove $q_0$:

$$q_1 + 3q_2 + 3a = 1, \qquad q_1 + 5q_2 + 11a = 5, \qquad q_1 + 7q_2 + 8a = 2.$$

(In the second, $9 - 11 = -2 \equiv 11$ and $1 - 9 = -8 \equiv 5$; in the third, $3 -
9 = -6 \equiv 7$, $4 - 9 = -5 \equiv 8$, $3 - 1 = 2$.) Subtract again to remove $q_1$:

$$2q_2 + 8a = 4, \qquad 2q_2 + 10a = 10.$$

The difference is $2a = 6$, so $a = 3$: **the bad share is holder 3's**. Back
substitution gives $2q_2 = 4 - 24 = -20 \equiv 6$, so $q_2 = 3$; then $q_1 = 1 - 9 - 9
= -17 \equiv 9$; then $q_0 = 8 - 9 - 3 - 24 = -28 \equiv 11$. So $Q(x) = 3x^2 + 9x +
11$ and $E(x) = x - 3$. Divide by synthetic division: bring down 3; $3 \cdot 3 + 9 =
18 \equiv 5$; $5 \cdot 3 + 11 = 26 \equiv 0$. The remainder is 0 and the quotient is
$3x + 5$. The secret is $f(0) = 5$. Figure 11.4 lays the computation out as a table.

<figure class="mars-fig">
<svg viewBox="0 0 640 292" width="640" role="img" aria-label="Berlekamp-Welch on four shares over F_13: share 3 was changed from 1 to 9; the error locator E(i) = i minus 3 is zero only there, so y_i times E(i) equals Q(i) at every share" fill="currentColor" font-size="14">
<rect x="430" y="18" width="80" height="214" rx="6" fill-opacity=".12"/>
<g stroke="currentColor" fill="none">
<line x1="20" y1="52" x2="600" y2="52" stroke-width="1.2"/>
<line x1="20" y1="166" x2="600" y2="166" stroke-opacity=".4" stroke-dasharray="4 3"/>
</g>
<g font-weight="bold"><text x="24" y="40">share i</text><g text-anchor="middle"><text x="300" y="40">1</text><text x="385" y="40">2</text><text x="470" y="40">3</text><text x="555" y="40">4</text></g></g>
<text x="24" y="76">received yᵢ</text>
<text x="24" y="112">true f(i) = 5 + 3i</text>
<text x="24" y="148">E(i) = i − 3</text>
<text x="24" y="190">yᵢ · E(i)</text>
<text x="24" y="226">Q(i) = 3i² + 9i + 11</text>
<g text-anchor="middle">
<text x="300" y="76">8</text><text x="385" y="76">11</text><text x="470" y="76">9</text><text x="555" y="76">4</text>
<text x="300" y="112">8</text><text x="385" y="112">11</text><text x="470" y="112">1</text><text x="555" y="112">4</text>
<text x="300" y="148">11</text><text x="385" y="148">12</text><text x="470" y="148">0</text><text x="555" y="148">1</text>
<text x="300" y="190">10</text><text x="385" y="190">2</text><text x="470" y="190">0</text><text x="555" y="190">4</text>
<text x="300" y="226">10</text><text x="385" y="226">2</text><text x="470" y="226">0</text><text x="555" y="226">4</text>
<text x="470" y="250" font-size="13">the bad share</text>
</g>
<text x="24" y="280" font-size="13">All values mod 13; Q / E = 3x + 5, so the secret is 5.</text>
</svg>
<figcaption>Figure 11.4. The error locator at work on the hand example. E is chosen to vanish where the share is wrong, so multiplying by E(i) erases the difference between the received value and the true one. The equations Q(i) = yᵢ E(i) then hold at every share, and they are linear in the unknown coefficients of Q and E.</figcaption>
</figure>

Why does any solution give the right answer? If $(Q, E)$ and $(Q', E')$ both solve the system, the polynomial
$QE' - Q'E$ has degree below $k + 2e \le n$ and vanishes at all $n$ share
coordinates (at each, both products equal $y_i E(x_i) E'(x_i)$), so it is zero and
$Q/E = Q'/E'$. The true pair is one solution, so every solution divides out to $f$.

#### Code it

The code builds the same system for any $n$ and $k$, solves it by Gauss-Jordan
elimination modulo the prime (Chapter 9), divides, and reports the secret together
with the $x$-coordinates of the shares that disagree with the decoded polynomial. If
the division leaves a remainder, or more than $e$ shares disagree, there were too many
errors and it says so rather than return a wrong secret.

```python
# Uses evaluate() and share() from the listings above.
def solve_mod(M, rhs, p):
    """Gauss-Jordan elimination mod p; free variables (if any) are set to 0."""
    A = [row[:] + [b] for row, b in zip(M, rhs)]
    rows, cols = len(A), len(M[0])
    pivots, r = [], 0
    for c in range(cols):
        piv = next((i for i in range(r, rows) if A[i][c] % p), None)
        if piv is None:
            continue
        A[r], A[piv] = A[piv], A[r]
        inv = pow(A[r][c], -1, p)
        A[r] = [v * inv % p for v in A[r]]
        for i in range(rows):
            if i != r and A[i][c]:
                t = A[i][c]
                A[i] = [(u - t * v) % p for u, v in zip(A[i], A[r])]
        pivots.append(c)
        r += 1
    sol = [0] * cols
    for i, c in enumerate(pivots):
        sol[c] = A[i][-1]
    return sol

def divide(num, den, p):
    """Long division of polynomials (lowest degree first): quotient and remainder."""
    num, out = num[:], [0] * (len(num) - len(den) + 1)
    inv = pow(den[-1], -1, p)
    for i in range(len(out) - 1, -1, -1):
        out[i] = num[i + len(den) - 1] * inv % p
        for j, d in enumerate(den):
            num[i + j] = (num[i + j] - out[i] * d) % p
    return out, num[:len(den) - 1]

def robust_recover(shares, k, p=P):
    """Berlekamp-Welch on Shamir shares: the secret and the x of every bad share, or None."""
    e = (len(shares) - k) // 2
    M, rhs = [], []
    for x, y in shares:   # unknowns: Q's k + e coefficients, then E's e low coefficients
        M.append([pow(x, j, p) for j in range(k + e)] + [-y * pow(x, j, p) % p for j in range(e)])
        rhs.append(y * pow(x, e, p) % p)
    sol = solve_mod(M, rhs, p)
    Q, E = sol[:k + e], sol[k + e:] + [1]
    f, rem = divide(Q, E, p)
    bad = [x for x, y in shares if evaluate(f, x, p) != y]
    if any(rem) or len(bad) > e:
        return None
    return f[0], bad

# The hand example: F_13, f(x) = 5 + 3x, holder 3 hands in 9 instead of 1.
print(robust_recover([(1, 8), (2, 11), (3, 9), (4, 4)], 2, 13))
# A (3, 7) sharing over F_P with two shares corrupted, then with three.
key = 31415926535897932
sh7 = share(key, 3, 7)
two_bad = [(x, (y + 777) % P) if x in (2, 6) else (x, y) for x, y in sh7]
three_bad = [(x, (y + 777) % P) if x in (2, 5, 6) else (x, y) for x, y in sh7]
print(robust_recover(two_bad, 3) == (key, [2, 6]), robust_recover(three_bad, 3))
```

It prints:

```text
(5, [3])
True None
```

The first line is the hand computation: secret 5, bad share at $x = 3$. With seven
shares of a degree-2 polynomial, $e = 2$: two corrupted shares are found by name and
the key comes back; three are too many, and the decoder refuses instead of guessing.

**What it costs.** Correcting $e$ errors needs $2e$ shares beyond the threshold,
twice what $e$ erasures need: each error costs one unknown for where it is and one for
what it should have been. Detection is cheaper: up to $n - k$ wrong shares are always
*detected*, since the $n$ values then do not lie on one polynomial of degree below
$k$, but beyond $e$ they cannot be located. Tompa and Woll's cheater in §11.9 hands in
exactly $k$ shares, so there is nothing to decode; one extra share would detect the
lie, two would name the liar. This does not replace verifiable secret sharing (§11.9,
Fix it), but it needs no commitments and no extra round.

**A Mars note.** Suppose the Arcadia City archive's key is shared 3 of 7, with two
holders on Earth. Asking an Earth holder to check and resend a share costs a round
trip of 6 to 44 minutes per retry. Decoding all seven shares with errors finds up to
two bad ones in one pass, with no second message across the gap.

## 11.6 The fast Fourier transform

*Level: intermediate.*

Multiplying two polynomials of degree $n$ coefficient by coefficient takes about
$n^2$ multiplications. Values are cheaper: if $f$ and $g$ are known at $2n$ points,
the product $fg$ is known at the same points with $2n$ multiplications, and $2n$
values determine it. So: evaluate, multiply pointwise, interpolate. The catch is that
evaluating at $2n$ points normally costs $n^2$. The **fast Fourier transform** (FFT)
picks the points so that it costs $n \log n$.

### A first step below $n^2$: Karatsuba

In 1960 Andrey Kolmogorov conjectured at his Moscow seminar that multiplying two
$n$-digit numbers needs on the order of $n^2$ operations. Within a week Anatoly
Karatsuba, a 23-year-old student, did it with about $n^{1.585}$; the method appeared
in 1962 under the names of Karatsuba and Yuri Ofman. It is easiest to see on
polynomials.

Split each factor into a low and a high half: $f = f_0 + f_1 x^h$ and $g = g_0 + g_1
x^h$. Then

$$fg = f_0 g_0 + (f_0 g_1 + f_1 g_0)\, x^h + f_1 g_1\, x^{2h},$$

four half-size products. But the middle term is

$$f_0 g_1 + f_1 g_0 = (f_0 + f_1)(g_0 + g_1) - f_0 g_0 - f_1 g_1,$$

so three products are enough.

**By hand.** $(3 + 5x)(4 + 7x)$: the low product is $3 \cdot 4 = 12$, the high
product is $5 \cdot 7 = 35$, and the middle is $(3 + 5)(4 + 7) - 12 - 35 = 88 - 47 =
41$. So the product is $12 + 41x + 35x^2$, with three multiplications instead of four
(check: $3 \cdot 7 + 5 \cdot 4 = 41$).

Applied recursively, $M(n) = 3M(n/2)$, so $M(n) = 3^{\log_2 n} = n^{\log_2 3}
\approx n^{1.585}$ multiplications.

```python
# Uses random from the listings above.
def karatsuba(f, g, count):
    """Product of two coefficient lists of the same power-of-2 length; count[0] tallies multiplications."""
    n = len(f)
    if n == 1:
        count[0] += 1
        return [f[0] * g[0]]
    h = n // 2
    f0, f1, g0, g1 = f[:h], f[h:], g[:h], g[h:]
    low = karatsuba(f0, g0, count)
    high = karatsuba(f1, g1, count)
    mid = karatsuba([a + b for a, b in zip(f0, f1)], [a + b for a, b in zip(g0, g1)], count)
    mid = [m - a - b for m, a, b in zip(mid, low, high)]       # f0 g1 + f1 g0
    out = [0] * (2 * n - 1)
    for i in range(2 * h - 1):
        out[i] += low[i]
        out[i + h] += mid[i]
        out[i + 2 * h] += high[i]
    return out

print(karatsuba([3, 5], [4, 7], [0]))
rng6 = random.Random(6)
fk = [rng6.randrange(100) for _ in range(64)]
gk = [rng6.randrange(100) for _ in range(64)]
school = [0] * 127
for i, a in enumerate(fk):
    for j, b in enumerate(gk):
        school[i + j] += a * b
count = [0]
print(karatsuba(fk, gk, count) == school, count[0], 64 * 64)
for n in (16, 256, 1024, 4096):
    count = [0]
    karatsuba([1] * n, [1] * n, count)
    print(n, n * n, count[0], round(n * n / count[0], 1))
```

It prints:

```text
[12, 41, 35]
True 729 4096
16 256 81 3.2
256 65536 6561 10.0
1024 1048576 59049 17.8
4096 16777216 531441 31.6
```

For 64-term polynomials Karatsuba matches the schoolbook product with 729
multiplications instead of 4,096; the saving is a factor of 10 at 256 terms and 32 at
4,096. Each level also adds a linear number of additions, so real libraries switch to
the schoolbook method below a cutoff; CPython multiplies its own integers this way
once both exceed about 70 of its 30-bit digits.

**Evaluate, multiply, interpolate.** Karatsuba is this section's strategy in
disguise. Read $f_0 + f_1 y$ and $g_0 + g_1 y$ as polynomials of degree 1 in $y =
x^h$ and multiply their values at three points: $y = 0$ gives $f_0 g_0$, $y = 1$ gives
$(f_0 + f_1)(g_0 + g_1)$, and "$y = \infty$" (the leading coefficients) gives $f_1
g_1$. The product has degree 2 in $y$, so three values fix it, and the subtraction is
the interpolation. Andrei Toom (1963) and Stephen Cook (1966) cut each factor into
three parts and use five points ($0, 1, -1, 2, \infty$): five products instead of
nine, $n^{\log_3 5} \approx n^{1.465}$. The FFT is the end of this road: it uses the
roots of unity, at which evaluation and interpolation are themselves fast.

| Method | Points | Recurrence | Cost |
| --- | --- | --- | --- |
| Schoolbook | none | $M(n) = 4M(n/2) + O(n)$ | $n^2$ |
| Karatsuba | $0, 1, \infty$ | $M(n) = 3M(n/2) + O(n)$ | $n^{1.585}$ |
| Toom-3 | $0, 1, -1, 2, \infty$ | $M(n) = 5M(n/3) + O(n)$ | $n^{1.465}$ |
| FFT and NTT | roots of unity | $T(n) = 2T(n/2) + O(n)$ | $n \log n$ |

When a level splits into more pieces than it shrinks by (3 or 4 pieces of half the
size), the bottom of the recursion dominates and the cost is a power of $n$ above 1.
When it splits into exactly as many pieces as it shrinks by, as the FFT does, every
one of the $\log_2 n$ levels costs the same $O(n)$: hence $n \log n$.

Lattice cryptography uses both ends of the table. ML-KEM's $q = 3329$ has roots of
unity of order 256 but not 512, so its NTT stops one layer short and finishes with
128 products of degree-1 polynomials, where Karatsuba's trick can save a
multiplication; schemes with a power-of-2 modulus (Saber, NTRU) have no NTT at all and
use Toom-Cook and Karatsuba. The post-quantum book works both through in its chapter
on
[rings, modules and the NTT](../post-quantum/07-Rings-Modules-and-the-NTT.md).

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
# Uses karatsuba(), fk and gk from the Karatsuba listing.
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
print(poly_mul_fft(fk, gk) == karatsuba(fk, gk, [0]))   # the 64-term test of the Karatsuba listing
```

```text
[4, 13, 22, 15] [81, 162, 162, 81]
True
```

$(1 + 2x + 3x^2)(4 + 5x) = 4 + 13x + 22x^2 + 15x^3$, and on the 64-term polynomials
of the Karatsuba listing the FFT gives the same product. Over the complex numbers the
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
<text x="300" y="112">square</text>
<text x="552" y="129">1 (from 1 and −1)</text><text x="450" y="25" text-anchor="middle">i (from ω and ω⁵)</text>
<text x="450" y="238" text-anchor="middle">−i</text><text x="348" y="150" text-anchor="end">−1</text>

</svg>
<figcaption>Figure 11.5. Why the FFT is fast. Squaring the eight 8th roots of unity gives the four 4th roots, each twice, so evaluating at 8 points reduces to two evaluations at 4 points, and so on down. Over a finite field, the same picture holds for elements of order 8.</figcaption>
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
# Uses random from the listings above.
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
# Uses p from the NTT listing above.
# Count multiplications instead of timing them: schoolbook n^2 against NTT 3 * (N/2) log2 N + N.
from math import log2
for n in (256, 1024, 4096, 65536):
    N = 2 * n
    school_ops = n * n
    ntt_ops = 3 * (N // 2) * int(log2(N)) + N
    print(n, school_ops, ntt_ops, round(school_ops / ntt_ops, 1), (p - 1) % N == 0)
```

```text
256 65536 7424 8.8 True
1024 1048576 35840 29.3 True
4096 16777216 167936 99.9 True
65536 4294967296 3473408 1236.5 True
```

For two polynomials of 256 coefficients the NTT needs about a ninth of the
multiplications; for 4,096, a hundredth (Karatsuba managed a thirty-second). The last
column checks that the prime $p = 998244353$ of the listing above has a root of unity
of each transform length $N = 2n$. Real lattice schemes do better still, since
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
# Uses evaluate() and random from the listings above.
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

The advanced protocols book owns KZG in depth: its
[Chapter 3](../advanced/03-Commitments.md) builds the commitment, its setup and its
batch openings, and its [Chapter 7](../advanced/07-SNARKs.md) builds SNARKs on top
(Groth16 and PLONK). This chapter keeps to the algebra underneath.

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
<figcaption>Figure 11.6. How succinct proofs reduce a long computation to a few numbers. Each arrow is a fact from this chapter or Chapter 8; the commitment scheme is what stops the prover from choosing polynomials after seeing the random point.</figcaption>
</figure>

### FRI: testing low degree by folding

KZG needs a pairing and a trusted setup. STARKs commit with a hash function only:
the prover puts the values of $f$ on a large domain $D$ (the $N$th roots of unity, or
a coset of them) under a Merkle tree, and the verifier asks for a few of them. The
question is then a coding question: are the committed values a Reed-Solomon codeword,
the values of a polynomial of degree below $d$, with a "blowup" $N/d$ of 2 to 16? FRI,
the **Fast Reed-Solomon Interactive Oracle Proof of Proximity** of Eli Ben-Sasson,
Iddo Bentov, Yinon Horesh and Michael Riabzev (2018), answers it by reading about
$2\log_2 N$ values per query. The protocol, with Merkle trees and a round by hand, is
in the advanced protocols book,
[§8.6](../advanced/08-STARKs-Bulletproofs-and-Recursion.md#86-fri-folding-a-polynomial-in-half);
here is the mathematics underneath.

**The fold.** Split $f$ into even and odd powers, exactly as the FFT does in §11.6:
$f(x) = f_E(x^2) + x f_O(x^2)$. If $f$ has degree below $d$, both $f_E$ and $f_O$
have degree below $d/2$. Given a random $\beta$ from the verifier, the **fold** is

$$f'(y) = f_E(y) + \beta f_O(y),$$

again of degree below $d/2$, and it lives on $D^2 = \{x^2 : x \in D\}$, which has half
as many points because $x$ and $-x$ have the same square (Figure 11.5). The verifier
never needs the coefficients: from $f(x) = f_E(x^2) + x f_O(x^2)$ and $f(-x) =
f_E(x^2) - x f_O(x^2)$,

$$f'(x^2) = \frac{f(x) + f(-x)}{2} + \beta\, \frac{f(x) - f(-x)}{2x}.$$

Two values of $f$ give one value of $f'$. Folding $\log_2 d$ times brings the degree
bound down to 1: a constant, which the prover sends in the clear.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="FRI folding on 16 points. Each pair of values at x and minus x folds into one value at x squared, so 16 values of degree below 4 become 8 values of degree below 2, then 4 equal values. One query path is drawn bold: it opens a pair in each layer and checks each fold" fill="currentColor" font-size="13">
<g stroke="currentColor" fill="none" stroke-linecap="round">
<path stroke-opacity=".22" d="M30,66L44,144M254,66L44,144M58,66L100,144M282,66L100,144M114,66L212,144M338,66L212,144M142,66L268,144M366,66L268,144M170,66L324,144M394,66L324,144M198,66L380,144M422,66L380,144M226,66L436,144M450,66L436,144M44,156L72,234M268,156L72,234M100,156L184,234M324,156L184,234M212,156L408,234M436,156L408,234"/>
<path stroke-width="2.2" d="M86,66L156,144M310,66L156,144M156,156L296,234M380,156L296,234"/>
<path stroke-width="10" stroke-opacity=".45" d="M30,60h0M58,60h0M114,60h0M142,60h0M170,60h0M198,60h0M226,60h0M254,60h0M282,60h0M338,60h0M366,60h0M394,60h0M422,60h0M450,60h0M44,150h0M100,150h0M212,150h0M268,150h0M324,150h0M436,150h0M72,240h0M184,240h0M408,240h0"/>
<path stroke-width="10" d="M86,60h0M310,60h0M156,150h0M380,150h0M296,240h0"/>
</g>
<text x="86" y="48" text-anchor="middle">x</text>
<text x="310" y="48" text-anchor="middle">−x</text>
<text x="146" y="154" text-anchor="end">x²</text>
<text x="390" y="154">−x²</text>
<text x="296" y="264" text-anchor="middle">x⁴</text>
<text x="480" y="56">f₀: 16 values</text><text x="480" y="74" fill-opacity=".7">degree &lt; 4</text>
<text x="480" y="146">f₁: 8 values</text><text x="480" y="164" fill-opacity=".7">degree &lt; 2</text>
<text x="480" y="236">f₂: 4 values</text><text x="480" y="254" fill-opacity=".7">all equal</text>
<text x="480" y="108" font-size="12">fold with β₀</text>
<text x="480" y="198" font-size="12">fold with β₁</text>
<text x="20" y="290" font-size="12">Bold: one query. It opens a pair in each layer and checks that the pair folds to the value below.</text>
</svg>
<figcaption>Figure 11.7. FRI folding. The points x and −x have the same square, so each pair of values in one layer determines one value in the next, through f₁(x²) = (f₀(x) + f₀(−x))/2 + β (f₀(x) − f₀(−x))/(2x). Each fold halves both the number of points and the degree bound; after two folds a polynomial of degree below 4 has become a constant.</figcaption>
</figure>

**Why a cheater gains almost nothing from one fold.** Suppose the committed values
are *not* those of any polynomial of degree below $d$. A fold can still be of low
degree, but for at most one $\beta$. Write $u(y) = (f(x) + f(-x))/2$ and $v(y) =
(f(x) - f(-x))/(2x)$ for $y = x^2$; these are just functions on $D^2$, computed from
the committed values, and the fold is $u + \beta v$. If two different challenges
$\beta \ne \beta'$ both gave folds $g$ and $g'$ of degree below $d/2$, then $v = (g -
g')/(\beta - \beta')$ and $u = g - \beta v$ would both be of degree below $d/2$, and
then $f(x) = u(x^2) + x\,v(x^2)$ would be of degree below $d$ on all of $D$, which we
assumed it is not. So a random $\beta$ from a field of size $|F|$ makes a non-codeword
fold into a codeword with probability at most $1/|F|$. $\blacksquare$

That is the exact version. A clever cheater commits instead to values that are
*close* to a low-degree polynomial, wrong in only a few places, so the real protocol
needs more: the FRI paper proves, and Ben-Sasson, Dan Carmon, Yuval Ishai, Swastik
Kopparty and Shubhangi Saraf sharpened in 2020 ("proximity gaps"), that folding
preserves distance. If $f$ differs from every polynomial of degree below $d$ on a
fraction $\delta$ of $D$, then for all but a tiny fraction of $\beta$ the fold is
still about $\delta$-far from degree below $d/2$. In plain words, folding with a
random number does not average the lies away. Either some layer stays far from low
degree, and the last layer is not constant, or the prover swaps in a nearby codeword
at some layer, and then that layer disagrees with the fold of the one above at about
a $\delta$ fraction of points. Each query checks one path of folds from top to bottom
and hits a disagreement with probability about $\delta$, so $s$ queries leave a
cheater about $(1 - \delta)^s$: with $\delta = 1/2$, 100 queries leave $2^{-100}$.
Real systems tune the blowup and the number of queries together, and the exact bounds
are still being sharpened.

```python
# Uses evaluate() and ntt() from the listings above; p = 998244353 as in the NTT listing.
N = 32                                    # domain: the 32nd roots of unity
w32 = pow(3, (p - 1) // N, p)
domain = [pow(w32, i, p) for i in range(N)]   # domain[i + N/2] = -domain[i]
half = pow(2, -1, p)

def fold(vals, xs, beta):
    """One FRI fold: from values at x and -x, the values of f_E + beta f_O at x^2."""
    h = len(vals) // 2
    out = [((vals[i] + vals[i + h]) * half
            + beta * (vals[i] - vals[i + h]) * half * pow(xs[i], -1, p)) % p for i in range(h)]
    return out, [x * x % p for x in xs[:h]]

def degree(vals):
    """Degree of the polynomial through the values (inverse NTT, then the last nonzero coefficient)."""
    coeffs = ntt(vals, invert=True)
    return max((i for i, c in enumerate(coeffs) if c), default=-1)

def fri_degrees(vals, betas):
    xs, out = domain, [degree(vals)]
    for beta in betas:
        vals, xs = fold(vals, xs, beta)
        out.append(degree(vals))
    return out, len(set(vals)) == 1

rng = random.Random(32)
betas = [rng.randrange(p) for _ in range(3)]
honest = [rng.randrange(p) for _ in range(8)]                 # degree < 8: rate 1/4
print(fri_degrees([evaluate(honest, x, p) for x in domain], betas))
too_high = [rng.randrange(p) for _ in range(13)]              # degree 12
print(fri_degrees([evaluate(too_high, x, p) for x in domain], betas))
one_wrong = [evaluate(honest, x, p) for x in domain]
one_wrong[5] = (one_wrong[5] + 1) % p                          # a single changed value
print(fri_degrees(one_wrong, betas))
# The one bad challenge: even part of low degree, odd part x^17 = x * (x^2)^8 too high.
tricky = [(evaluate(honest[::2], x * x % p, p) + pow(x, 17, p)) % p for x in domain]
print(fri_degrees(tricky, [0] + betas[1:]), fri_degrees(tricky, betas))
```

It prints:

```text
([7, 3, 1, 0], True)
([12, 6, 3, 1], False)
([31, 15, 7, 3], False)
([17, 3, 1, 0], True) ([17, 8, 4, 2], False)
```

Each line gives the degree of every layer (by the inverse NTT of §11.7) and whether
the last 4 values are equal. The honest degree-7 polynomial folds to degrees 3, 1, 0.
Degree 12 ends at degree 1, not constant. One changed value out of 32 makes the
degree 31, and every fold stays as high as its layer allows. The last line is the
lemma at work: an honest even part with a too-high odd part passes only for the one
bad challenge, $\beta = 0$.

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
# Uses share(), recover() and evaluate() from the listings above.
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

### Lagrange in the exponent

The mathematics under every such scheme is one observation. Shamir reconstruction is
a linear combination with public coefficients, $x = \sum_{i \in S} \lambda_i x_i$, and
the map $t \mapsto h^t$ from exponents to a group turns sums into products and
multiples into powers. So

$$h^{x} = h^{\sum_i \lambda_i x_i} = \prod_{i \in S} \left(h^{x_i}\right)^{\lambda_i}.$$

Anyone holding the values $h^{x_i}$ can compute $h^x$ without seeing $x$ or any
$x_i$. Yvo Desmedt and Yair Frankel built threshold cryptosystems on this in 1989,
and it is the whole of threshold BLS (analyzed by Alexandra Boldyreva in 2003). A BLS
signature is $\sigma = H(m)^x$, with $H$ hashing onto a pairing-friendly curve
(Chapter 13). Holder $i$ signs alone, $\sigma_i = H(m)^{x_i}$, and any $k$ partial
signatures combine into an ordinary BLS signature under the group's one public key.

**One rule matters.** Exponents live modulo the group order $q$, not modulo the
prime $p$ that defines the group, so the weights $\lambda_i = \prod_{j \ne i}
x_j/(x_j - x_i)$ must use inverses modulo $q$. When $q$ is secret, as with RSA's
$\varphi(n)$, the divisions cannot be done at all, which is why threshold RSA needs
Victor Shoup's detour through $\Delta = \ell!$ for $\ell$ holders (advanced
protocols book, [Chapter 4](../advanced/04-Threshold-Cryptography.md)).

#### By hand: two of three, in a group you can see

Pairings are out of reach by hand, but the interpolation is the same in any group of
prime order. Take $p = 23$; the squares modulo 23 form a
subgroup of order $q = 11$, and $h = 3$ is one of them ($7^2 = 49 \equiv 3$). Let it
stand for $H(m)$. The key is $x = 7$, shared 2 of 3 with $f(t) = 7 + 3t$ over
$\mathbb{F}_{11}$:

$$x_1 = 10, \qquad x_2 = 13 \equiv 2, \qquad x_3 = 16 \equiv 5.$$

The real signature would be $h^x = 3^7 \bmod 23$. Since $3^3 = 27 \equiv 4$, $3^6
\equiv 16$ and $3^7 \equiv 48 \equiv 2$, it is $\sigma = 2$.

Holders 1 and 3 sign:

- $\sigma_1 = 3^{10} = 3^7 \cdot 3^3 \equiv 2 \cdot 4 = 8$;
- $\sigma_3 = 3^5 = 3^3 \cdot 3^2 \equiv 4 \cdot 9 = 36 \equiv 13$.

The weights for $S = \{1, 3\}$, modulo 11: $\lambda_1 = \frac{3}{3 - 1} = \frac32
\equiv 3 \cdot 6 = 18 \equiv 7$ (since $2 \cdot 6 = 12 \equiv 1$), and $\lambda_3 =
\frac{1}{1 - 3} = -\frac12 \equiv -6 \equiv 5$. Check in the exponent: $7 \cdot 10 + 5
\cdot 5 = 95 \equiv 7 \pmod{11}$, the key.

Combine, modulo 23: $8^2 = 64 \equiv 18$, $8^4 \equiv 18^2 = 324 \equiv 2$, so $8^7 =
8^4 \cdot 8^2 \cdot 8 \equiv 2 \cdot 18 \cdot 8 = 288 \equiv 12$. And $13^2 = 169
\equiv 8$, $13^4 \equiv 64 \equiv 18$, $13^5 \equiv 18 \cdot 13 = 234 \equiv 4$. So

$$\sigma = \sigma_1^{\lambda_1}\sigma_3^{\lambda_3} \equiv 12 \cdot 4 = 48 \equiv 2.$$

The combiner has produced $h^x$ without knowing $x$ (Figure 11.8). With the weights
computed modulo 23 instead, it would have used $\lambda_1 = 3 \cdot 12
\equiv 13$ and $\lambda_3 = -12 \equiv 11$, and got $8^{13} \cdot 13^{11} \equiv 8^2
\cdot 1 = 64 \equiv 18$, since every element of the subgroup has order 11: a wrong
signature.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Threshold signing with the hand example. Holders 1 and 3 raise h = 3 to their key shares 10 and 5, giving partial signatures 8 and 13 modulo 23. The combiner raises them to the Lagrange weights 7 and 5, computed modulo the group order 11, and multiplies, getting 2, which equals h to the full key 7. Holder 2 is not needed" fill="currentColor" font-size="14">
<text x="20" y="26" font-size="13">h = H(m) = 3 in the subgroup of order 11 mod 23; the key x = 7 is never assembled</text>
<g stroke="currentColor" fill="none" stroke-width="1.3">
<rect x="20" y="50" width="170" height="64" rx="8"/>
<rect x="20" y="130" width="170" height="64" rx="8" stroke-dasharray="5 4" stroke-opacity=".5"/>
<rect x="20" y="210" width="170" height="64" rx="8"/>
<rect x="260" y="110" width="200" height="104" rx="8"/>
<rect x="510" y="130" width="110" height="64" rx="8" stroke-width="2"/>
<path d="M190 82 L258 140"/><path d="M250 130 L258 140 L246 138"/>
<path d="M190 242 L258 186"/><path d="M246 186 L258 186 L251 195"/>
<path d="M460 162 L508 162"/><path d="M498 156 L508 162 L498 168"/>
</g>
<text x="32" y="74">holder 1: x₁ = 10</text><text x="32" y="98">σ₁ = 3¹⁰ = 8</text>
<text x="32" y="154" fill-opacity=".6">holder 2: x₂ = 2</text><text x="32" y="178" fill-opacity=".6">not needed</text>
<text x="32" y="234">holder 3: x₃ = 5</text><text x="32" y="258">σ₃ = 3⁵ = 13</text>
<text x="272" y="134">combiner (public)</text>
<text x="272" y="158">λ₁ = 7, λ₃ = 5 (mod 11)</text>
<text x="272" y="182">σ₁^λ₁ · σ₃^λ₃</text>
<text x="272" y="204">= 12 · 4 = 2 (mod 23)</text>
<text x="522" y="156">σ = 2</text><text x="522" y="180">= 3⁷ = hˣ</text>
</svg>
<figcaption>Figure 11.8. Lagrange in the exponent, with the numbers of the hand example. Each holder raises h to its share; the combiner, who knows no secret, raises the partial signatures to the public Lagrange weights and multiplies. The exponents add up to λ₁x₁ + λ₃x₃ = 7 (mod 11), the key, which appears only as an exponent and never as a number.</figcaption>
</figure>

On a real curve the combiner checks the result with a pairing, $e(\sigma, g) =
e(H(m), g^x)$, and can check each partial first against the holder's public share
$g^{x_i}$ and drop a bad one. Decoding with errors (§11.5) is no help here:
Berlekamp-Welch multiplies the received values by unknowns, which cannot be done to a
value known only as $h^{x_i}$. Without a pairing, each holder attaches a short proof
that its partial uses the exponent of its public share
([§4.2](../advanced/04-Threshold-Cryptography.md#42-threshold-decryption-with-elgamal)
of the advanced protocols book).

#### Code it

The first part repeats the hand example, wrong weights included; the second shares
a key 3 of 5 in the subgroup of order $q = 509$ modulo the safe prime $p = 1019 = 2q
+ 1$.

```python
# Uses evaluate() and random from the listings above.
# Lagrange in the exponent: threshold signing in the order-q subgroup of (Z/pZ)*, with no pairing.
from itertools import combinations

def weights_at_zero(xs, q):
    """Lagrange weights lambda_i = prod_{j != i} x_j / (x_j - x_i), computed mod the group order q."""
    lam = {}
    for i in xs:
        num, den = 1, 1
        for j in xs:
            if j != i:
                num, den = num * j % q, den * (j - i) % q
        lam[i] = num * pow(den, -1, q) % q
    return lam

def combine(partials, p, q):
    lam = weights_at_zero(list(partials), q)
    sigma = 1
    for i, s in partials.items():
        sigma = sigma * pow(s, lam[i], p) % p
    return sigma

# The hand example: p = 23, q = 11, h = 3, key x = 7 shared with f(t) = 7 + 3t mod 11.
p, q, h = 23, 11, 3
x_shares = {t: (7 + 3 * t) % q for t in (1, 2, 3)}
partials = {t: pow(h, x_shares[t], p) for t in (1, 3)}
print(x_shares, partials, weights_at_zero([1, 3], q), combine(partials, p, q), pow(h, 7, p))
lam_wrong = weights_at_zero([1, 3], p)                  # the bug: weights mod p instead of mod q
print(lam_wrong, partials[1] ** lam_wrong[1] * partials[3] ** lam_wrong[3] % p)

# 3 of 5 in a larger group: p = 2q + 1 with q = 509; every 3-subset gives the same signature.
p, q = 1019, 509
h = pow(2, 2, p)                                        # a square, so it lies in the subgroup of order q
rng = random.Random(1979)
coeffs = [rng.randrange(q) for _ in range(3)]           # coeffs[0] is the signing key
x_shares = {t: evaluate(coeffs, t, q) for t in range(1, 6)}
sigs = {t: pow(h, x_shares[t], p) for t in x_shares}
results = {combine({t: sigs[t] for t in S}, p, q) for S in combinations(x_shares, 3)}
print(results == {pow(h, coeffs[0], p)}, len(list(combinations(x_shares, 3))))
```

It prints:

```text
{1: 10, 2: 2, 3: 5} {1: 8, 3: 13} {1: 7, 3: 5} 2 2
{1: 13, 3: 11} 18
True 10
```

Every number of the hand computation is there, and in the larger group all ten
choices of three holders out of five agree on the one signature $h^x$.

**Why it suits Mars.** Suppose Arcadia City holds its firmware-signing key 3 of 5,
three holders in the city and two on Earth. With threshold BLS each holder sends one
partial signature, one trip across a light delay of 3 to 22 minutes with no reply
needed. Threshold Schnorr as FROST (RFC 9591) needs two rounds, so a signature
involving an Earth holder costs a 6 to 44 minute round trip, unless the first round's
commitments are sent ahead of time, as FROST allows.

### Going deeper

- *Packed and ramp schemes.* Share several secrets at once in different evaluation
  points of one polynomial, at the price of a gap between the privacy and recovery
  thresholds (Matthew Franklin and Moti Yung, 1992).
- *Fast multipoint evaluation.* Evaluating a degree-$n$ polynomial at $n$ arbitrary
  points takes $O(n \log^2 n)$ with a subproduct tree and fast division.
- *The polynomial method beyond cryptography.* Schwartz-Zippel underlies randomized
  algorithms for perfect matching and the proof of the PCP theorem; the
  Reed-Solomon proximity tests of STARKs come from this line of work.
- *Decoding beyond half the distance.* Berlekamp-Welch stops at $(n - k)/2$ errors.
  Madhu Sudan (1997) and Venkatesan Guruswami with Sudan (1999) showed how to return a
  short list of every polynomial close to the received word, up to about $n -
  \sqrt{nk}$ errors; for shares, that means a short list of candidate secrets even
  when more than half of all shares are wrong, as long as the threshold is below a
  quarter of the number of shares.
- *Robust secret sharing.* With fewer than $2e$ spare shares, authentication tags
  (Tal Rabin and Michael Ben-Or, 1989) still let an honest majority win.
- *Chapter 15* builds the negacyclic NTT of ML-KEM and ML-DSA from the transform of
  §11.7, and Chapter 18 decodes Reed-Solomon codes with errors in general, with
  faster decoders than the linear system of §11.5.

## Check yourself

??? question "1. With Lagrange's formula, find $f(0)$ for the parabola through $(1, 2)$, $(2, 5)$, $(3, 10)$."

    $L_1(0) = \frac{(-2)(-3)}{(-1)(-2)} = 3$, $L_2(0) = \frac{(-1)(-3)}{(1)(-1)} =
    -3$, $L_3(0) = \frac{(-1)(-2)}{(2)(1)} = 1$. So $f(0) = 6 - 15 + 10 = 1$
    (it is $x^2 + 1$).

??? question "2. In a $(3, 5)$ Shamir scheme over $\mathbb{F}_{101}$, how many polynomials are consistent with two given shares?"

    101, one for each possible secret, which is why two shares reveal nothing.

??? question "3. Two polynomials of degree at most 1,000 over $\mathbb{F}_p$ with $p \approx 2^{61}$ agree at a random point. How likely is it that they differ?"

    At most $1000/2^{61} < 2^{-51}$, by Schwartz-Zippel.

??? question "4. Over $\mathbb{F}_5$, at how many of the 25 points does $(x - 1)(y - 2)$ vanish? Compare with the Schwartz-Zippel bound."

    It vanishes when $x = 1$ (5 points) or $y = 2$ (5 points), counting $(1, 2)$
    once: $5 + 5 - 1 = 9$ points, probability $9/25$, against the bound $2/5 =
    10/25$, which counts the crossing point twice.

??? question "5. How many multiplications does Karatsuba use for two polynomials of 16 coefficients, and how many does the schoolbook method use? Which points does Karatsuba evaluate at?"

    $3^4 = 81$ against $16^2 = 256$. Each level evaluates the halves, read as
    polynomials of degree 1 in $y = x^h$, at $y = 0$, $y = 1$ and $y = \infty$.

??? question "6. A Reed-Solomon code has $n = 255$ and $k = 223$. How many erasures can it repair? How many errors?"

    $n - k = 32$ erasures, $16$ errors. (This is the CCSDS standard code used on
    NASA and ESA deep-space links.)

??? question "7. Nine holders of a 3-out-of-9 Shamir sharing hand in their shares. How many wrong shares can Berlekamp-Welch correct, and how many unknowns does its linear system have?"

    $e = \lfloor (9 - 3)/2 \rfloor = 3$. The unknowns are the $k + e = 6$
    coefficients of $Q$ and the 3 non-leading coefficients of $E$: 9 unknowns, 9
    equations.

??? question "8. How does a cheating shareholder in Tompa and Woll's attack learn the secret while others do not, and why does one extra honest share stop it?"

    They add $\delta$ to their share; the reconstructed value is $s + \delta\lambda$
    with $\lambda$ their public Lagrange weight. Only the cheater knows $\delta$, so
    only they can subtract $\delta\lambda$. With $k + 1$ shares the values no longer
    lie on one polynomial of degree below $k$, so the lie is detected; with $k + 2$,
    Berlekamp-Welch names the liar.

??? question "9. In threshold signing in a group of prime order $q$ inside $(\mathbb{Z}/p\mathbb{Z})^*$, why must the Lagrange weights be computed modulo $q$ and not modulo $p$?"

    $h^{a} = h^{b}$ exactly when $a \equiv b \pmod q$, so the exponent identity
    $\sum \lambda_i x_i \equiv x$ is needed modulo $q$, with inverses modulo $q$.
    In the hand example, weights modulo 23 gave 18 instead of 2.

??? question "10. In FRI, a cheater commits to values that are not those of any polynomial of degree below $d$. Show that at most one challenge $\beta$ makes the fold a polynomial of degree below $d/2$."

    The fold is $u + \beta v$, with $u$ and $v$ computed from pairs of committed
    values. If $\beta \ne \beta'$ both gave low-degree folds $g$ and $g'$, then $v =
    (g - g')/(\beta - \beta')$ and $u = g - \beta v$ are of degree below $d/2$, so
    $f(x) = u(x^2) + x v(x^2)$ has degree below $d$, a contradiction. A random
    $\beta$ is the bad one with probability at most $1/|F|$.

## What you learned

- $k$ points with distinct $x$ determine one polynomial of degree below $k$;
  Lagrange and Newton find it, and Vandermonde says the same in matrix language.
  On the $N$th roots of unity, $L_i(x) = \omega^i (x^N - 1)/(N(x - \omega^i))$.
- Shamir sharing hides the secret at $f(0)$; any $k$ shares recover it and $k - 1$
  reveal nothing, information-theoretically.
- Schwartz-Zippel: a nonzero polynomial of degree $d$ vanishes at a random point with
  probability at most $d/|S|$, so equality is tested at one point, and many
  identities at once with powers of a random $\alpha$.
- Reed-Solomon codewords are polynomial evaluations; minimum distance $n - k + 1$,
  the best possible. On Shamir shares, Berlekamp-Welch (one linear system for $Q =
  fE$ and the error locator $E$) corrects up to $(n - k)/2$ bad shares and names them.
- Fast multiplication is evaluate, multiply pointwise, interpolate: Karatsuba uses 3
  points ($n^{1.585}$), Toom-3 uses 5 ($n^{1.465}$), the FFT uses roots of unity
  ($n \log n$).
- The FFT evaluates at roots of unity in $N \log N$ steps; over $\mathbb{F}_p$ with $N
  \mid p - 1$ it is the exact NTT, the engine of lattice cryptography.
- Polynomial commitments prove $f(z) = y$ through divisibility by $x - z$; succinct
  proofs are arithmetization, divisibility and one random point. FRI folds $f_E +
  \beta f_O$, halving degree and domain; a non-codeword folds to a codeword for at
  most one $\beta$.
- Shares need authentication (verifiable secret sharing) and validated
  $x$-coordinates.
- Interpolation works in the exponent: $\prod_i (h^{x_i})^{\lambda_i} = h^x$, with
  weights modulo the group order. That is threshold BLS.

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
- Richard Zippel, "Probabilistic Algorithms for Sparse Polynomials", EUROSAM 1979.
- Jean-Paul Berrut and Lloyd Trefethen, "Barycentric Lagrange Interpolation",
  *SIAM Review* 46 (2004).
- Lloyd Welch and Elwyn Berlekamp, "Error Correction for Algebraic Block Codes",
  US Patent 4,633,470 (1986).
- Robert McEliece and Dilip Sarwate, "On Sharing Secrets and Reed-Solomon Codes",
  *Communications of the ACM* 24 (1981).
- Venkatesan Guruswami and Madhu Sudan, "Improved Decoding of Reed-Solomon and
  Algebraic-Geometry Codes", *IEEE Trans. Information Theory* 45 (1999).
- Anatoly Karatsuba and Yuri Ofman, "Multiplication of Many-Digital Numbers by
  Automatic Computers", *Doklady Akademii Nauk SSSR* 145 (1962).
- Andrei Toom, *Soviet Mathematics Doklady* 3 (1963), and Stephen Cook's Harvard
  PhD thesis (1966): the Toom-Cook method.
- Eli Ben-Sasson, Iddo Bentov, Yinon Horesh and Michael Riabzev, "Fast Reed-Solomon
  Interactive Oracle Proofs of Proximity", ICALP 2018.
- Eli Ben-Sasson, Dan Carmon, Yuval Ishai, Swastik Kopparty and Shubhangi Saraf,
  "Proximity Gaps for Reed-Solomon Codes", FOCS 2020.
- Yvo Desmedt and Yair Frankel, "Threshold Cryptosystems", CRYPTO 1989.
- Dan Boneh, Ben Lynn and Hovav Shacham, "Short Signatures from the Weil Pairing",
  ASIACRYPT 2001; Alexandra Boldyreva on threshold BLS, PKC 2003.
- Tal Rabin and Michael Ben-Or, "Verifiable Secret Sharing and Multiparty Protocols
  with Honest Majority", STOC 1989.
- RFC 9591, the FROST protocol for two-round threshold Schnorr signatures (2024).
- In this shelf: the advanced protocols book's chapters on
  [secret sharing](../advanced/02-Secret-Sharing.md),
  [threshold cryptography](../advanced/04-Threshold-Cryptography.md),
  [SNARKs](../advanced/07-SNARKs.md) and
  [STARKs](../advanced/08-STARKs-Bulletproofs-and-Recursion.md); the post-quantum
  book's [rings, modules and the NTT](../post-quantum/07-Rings-Modules-and-the-NTT.md).
- In *The cryptography book*: [Chapter 23](../../book/23-Advanced-Protocols.md).
