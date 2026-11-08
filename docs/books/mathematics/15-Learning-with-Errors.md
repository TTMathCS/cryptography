# 15. Polynomial Rings and Learning with Errors

*Solving a system of linear equations is the easiest problem in algebra: Gaussian
elimination does it in a blink. Add a little noise to each equation, a $+1$ here and
a $-2$ there, and it becomes one of the hardest problems known, hard enough that the
world's new key-exchange standard rests on it. This chapter is the book's reference
for that problem, learning with errors, and for the algebra that makes it fast: the
ring $\mathbb{Z}_q[x]/(x^n + 1)$, cyclotomic polynomials, and the negacyclic
number-theoretic transform, written out in full and checked against schoolbook
multiplication, in both its complete form and the incomplete form of ML-KEM. We
build the small noise distributions, encrypt with plain, ring and module LWE, explain
why deciding is as hard as searching, and end with the parameters of ML-KEM and the
reason its modulus is 3329.*

!!! abstract "In this chapter"
    **You will learn:**

    - the ring $R_q = \mathbb{Z}_q[x]/(x^n + 1)$ and negacyclic multiplication, by
      hand;
    - cyclotomic polynomials, and when $x^n + 1$ splits modulo $q$;
    - the negacyclic NTT, derived from the factorization, with full code for the
      complete transform ($q = 7681$) and for ML-KEM's incomplete one ($q = 3329$);
    - the centered binomial and discrete Gaussian distributions, and ML-KEM's sampler;
    - LWE in search and decision form, Regev's encryption, and Regev's reduction in
      outline;
    - why search and decision LWE are equally hard;
    - Ring-LWE and Module-LWE, with an ML-KEM-style encryption;
    - the parameters of ML-KEM, and why $q = 3329$.

    **You need:** [Chapter 8](08-Rings-Fields-and-Polynomials.md) (polynomial rings,
    quotients, finite fields), [Chapter 9](09-Linear-Algebra.md) (Gaussian
    elimination), [Chapter 11](11-Polynomials-at-Work.md) (the FFT and NTT) and
    [Chapter 14](14-Lattices.md) (lattices, BDD).

    **Levels:** §15.1 to §15.3 are for beginners, §15.4 to §15.7 are intermediate,
    §15.8 to §15.10 are expert.

## 15.1 The problem

*Level: beginner.*

Pick a secret vector $s$ of $n$ numbers modulo $q$. Anyone can hand out equations
$\langle a, s \rangle = b$ with random $a$: after $n$ of them, Gaussian elimination
finds $s$. Now add a small error to each:

$$
b = \langle a, s \rangle + e \pmod q, \qquad e \in \{-2, -1, 0, 1, 2\}.
$$

Elimination combines equations with large coefficients, and the small errors
multiply into large ones: after a few steps the answer is noise. Oded Regev named the
problem **learning with errors** (LWE) in 2005 and proved that, for suitable
parameters, solving it is at least as hard as solving worst-case lattice problems,
with a quantum computer. Ten years of cryptanalysis later, NIST standardized
ML-KEM on a structured form of it, in FIPS 203 (August 2024).

Two facts make LWE practical. The noise must be small enough that the owner of $s$
can still read the messages: decryption rounds the noise away. And the arithmetic
must be fast: ML-KEM replaces vectors of numbers with polynomials, and multiplies them
with a transform that takes $O(n \log n)$ steps. This chapter covers both.

<figure class="mars-fig">
<svg viewBox="0 0 640 220" width="640" role="img" aria-label="The LWE equation: the vector b equals the matrix A times the secret s plus a small error vector e, all modulo q; A and b are public, s and e are secret" fill="currentColor" font-size="13">
<g stroke="currentColor" stroke-width="1.5" fill="none">
<rect x="40" y="30" width="34" height="150" rx="3"/>
<rect x="130" y="30" width="150" height="150" rx="3"/>
<rect x="300" y="55" width="34" height="100" rx="3" class="acc"/>
<rect x="400" y="30" width="34" height="150" rx="3" class="acc"/>
</g>
<rect x="400" y="30" width="34" height="150" rx="3" class="acc-fill" fill-opacity=".18"/>
<rect x="300" y="55" width="34" height="100" rx="3" class="acc-fill" fill-opacity=".18"/>
<g fill-opacity=".35">
<rect x="135" y="35" width="140" height="140" class="soft"/>
</g>
<text x="57" y="200" text-anchor="middle">b</text>
<text x="100" y="110" text-anchor="middle" font-size="18">=</text>
<text x="205" y="200" text-anchor="middle">A (random, public)</text>
<text x="317" y="175" text-anchor="middle" class="acc">s</text>
<text x="367" y="110" text-anchor="middle" font-size="18">+</text>
<text x="417" y="200" text-anchor="middle" class="acc">e</text>
<text x="460" y="70" font-size="12">e: small, secret</text>
<text x="460" y="90" font-size="12">s: secret</text>
<text x="460" y="110" font-size="12">A, b: public</text>
<text x="460" y="130" font-size="12">all modulo q</text>
<text x="460" y="160" font-size="12">without e: elimination</text>
<text x="460" y="176" font-size="12">with e: a lattice problem</text>
</svg>
<figcaption>Figure 15.1. Learning with errors. The public pair (A, b) hides s behind a small error e. Remove e and Gaussian elimination recovers s at once; keep it and recovering s is a bounded-distance decoding problem in a lattice of dimension in the hundreds.</figcaption>
</figure>

## 15.2 The ring $\mathbb{Z}_q[x]/(x^n + 1)$

*Level: beginner.*

An LWE public key is a random $m \times n$ matrix: $n^2$ numbers for $m = n$, too
many when $n$ is in the hundreds. The structured variants replace the matrix with a
few polynomials, in the ring

$$
R_q = \mathbb{Z}_q[x]/(x^n + 1),
$$

the polynomials of degree less than $n$ with coefficients modulo $q$, where products
are reduced using the rule $x^n = -1$. Chapter 8 built quotient rings like this one;
here $n$ is a power of 2 ($n = 256$ in ML-KEM and ML-DSA).

Multiplication by $x$ shifts the coefficients up one place, and the top coefficient
wraps around to the bottom *with its sign flipped*. That is a **negacyclic** shift. A
product $a \cdot b$ is a sum of shifted copies of $a$, so in matrix form it is
multiplication by a negacyclic matrix: each column is the previous one shifted down,
with the wrapped entry negated. One polynomial $a$ with $n$ coefficients thus stands
for an $n \times n$ matrix, which is where the saving comes from.

### By hand

Let $n = 4$, $q = 17$ and $a = 1 + 2x + 3x^2 + 4x^3$.

- $x \cdot a = x + 2x^2 + 3x^3 + 4x^4 = -4 + x + 2x^2 + 3x^3 \equiv 13 + x + 2x^2 +
  3x^3$.
- $x^3 \cdot a = x^3 + 2x^4 + 3x^5 + 4x^6 = x^3 - 2 - 3x - 4x^2 \equiv 15 + 14x + 13x^2 +
  x^3$.
- $(1 + x^3) \cdot a$ is the sum of $a$ and the previous line: $16 + 16x + 16x^2 + 5x^3$.

```python
# The ring R_q = Z_q[x]/(x^n + 1): polynomials of degree < n, with x^n = -1.
def ring_mul(a, b, q):
    """Schoolbook negacyclic product: a term x^(i+j) with i + j >= n wraps around with a minus sign."""
    n = len(a)
    c = [0] * n
    for i, ai in enumerate(a):
        if ai == 0:
            continue
        for j, bj in enumerate(b):
            if i + j < n:
                c[i + j] += ai * bj
            else:
                c[i + j - n] -= ai * bj
    return [x % q for x in c]

q, n = 17, 4
a = [1, 2, 3, 4]                              # 1 + 2x + 3x^2 + 4x^3
print(ring_mul(a, [0, 1, 0, 0], q))           # times x
print(ring_mul(a, [0, 0, 0, 1], q))           # times x^3
print(ring_mul(a, [1, 0, 0, 1], q))           # times 1 + x^3
```

```text
[13, 1, 2, 3]
[15, 14, 13, 1]
[16, 16, 16, 5]
```

Why $x^n + 1$ and not $x^n - 1$? With $x^n - 1$ (cyclic convolution), the polynomial
$1 + x + \cdots + x^{n-1}$ is a zero divisor that kills the "sum of coefficients"
information, and the ring splits off a copy of $\mathbb{Z}_q$, which attacks can
exploit. With $x^n + 1$ for $n$ a power of 2, the polynomial is irreducible over the
rationals (it is a cyclotomic polynomial, next section), and multiplication by $x$
preserves the length of coefficient vectors, so products of small polynomials stay
small: the coefficients of $a \cdot b$ are at most $n \cdot \max|a_i| \cdot
\max|b_j|$ in size, the same bound as in $\mathbb{Z}[x]$.

## 15.3 Cyclotomic polynomials

*Level: beginner.*

The $m$-th **cyclotomic polynomial** $\Phi_m(x)$ is the polynomial whose roots are
the primitive $m$-th roots of unity, the complex numbers $e^{2\pi i k/m}$ with
$\gcd(k, m) = 1$:

$$
\Phi_m(x) = \prod_{\substack{1 \le k \le m \\ \gcd(k, m) = 1}} \left(x - e^{2\pi i k/m}\right).
$$

Its degree is $\varphi(m)$, Euler's function. Every $m$-th root of unity is a
primitive $d$-th root for exactly one $d \mid m$, so

$$
x^m - 1 = \prod_{d \mid m} \Phi_d(x),
$$

and this formula computes $\Phi_m$ recursively by exact division. It shows that
$\Phi_m$ has integer coefficients. Gauss proved $\Phi_p$ irreducible over the
rationals for prime $p$; Leopold Kronecker and Richard Dedekind extended the result
in the 1850s, Dedekind proving it for every $m$ in 1857.

**For $n$ a power of 2, $\Phi_{2n}(x) = x^n + 1$.** Proof: $x^{2n} - 1 = (x^n - 1)(x^n
+ 1)$. The roots of $x^n + 1$ are the $2n$-th roots of unity that are not $n$-th
roots, that is, whose order divides $2n$ but not $n$. Because $2n$ is a power of 2,
every proper divisor of $2n$ divides $n$, so the order is exactly $2n$: the roots of
$x^n + 1$ are exactly the primitive $2n$-th roots. $\blacksquare$

```python
# Cyclotomic polynomials Phi_m, from x^m - 1 = product over d | m of Phi_d.
def poly_divexact(num, den):
    """Exact division of integer polynomials (coefficient lists, lowest degree first)."""
    num = num[:]
    out = [0] * (len(num) - len(den) + 1)
    for i in range(len(out) - 1, -1, -1):
        c = num[i + len(den) - 1] // den[-1]
        out[i] = c
        for j, d in enumerate(den):
            num[i + j] -= c * d
    assert not any(num), "not exact"
    return out

phi = {}
def cyclotomic(m):
    if m not in phi:
        f = [-1] + [0] * (m - 1) + [1]       # x^m - 1
        for d in range(1, m):
            if m % d == 0:
                f = poly_divexact(f, cyclotomic(d))
        phi[m] = f
    return phi[m]

def show(f):
    terms = []
    for i in range(len(f) - 1, -1, -1):
        if f[i]:
            c = "" if abs(f[i]) == 1 and i else str(abs(f[i]))
            terms.append(("- " if f[i] < 0 else "+ ") + c + ("x^%d" % i if i > 1 else "x" if i == 1 else ""))
    return " ".join(terms).lstrip("+ ")

for m in (1, 2, 3, 4, 6, 8, 12, 16):
    print(m, show(cyclotomic(m)))
c512 = cyclotomic(512)
print(c512 == [1] + [0] * 255 + [1])
```

```text
1 x - 1
2 x + 1
3 x^2 + x + 1
4 x^2 + 1
6 x^2 - x + 1
8 x^4 + 1
12 x^4 - x^2 + 1
16 x^8 + 1
True
```

$\Phi_{512} = x^{256} + 1$, the polynomial of ML-KEM and ML-DSA.

### Splitting modulo $q$

Over the rationals $x^n + 1$ is irreducible, but modulo a prime $q$ it may factor.
Its roots modulo $q$ are the elements of order exactly $2n$ in $\mathbb{F}_q^*$,
and since $\mathbb{F}_q^*$ is cyclic of order $q - 1$ ([Chapter 8](08-Rings-Fields-and-Polynomials.md)),
such elements exist exactly when $2n \mid q - 1$. Then there are $\varphi(2n) = n$ of
them, $x^n + 1$ splits into $n$ linear factors, and by the Chinese remainder theorem

$$
R_q \cong \mathbb{F}_q \times \mathbb{F}_q \times \cdots \times \mathbb{F}_q \quad (n
\text{ copies}).
$$

The isomorphism is "evaluate at the $n$ roots". In those coordinates, multiplication
is coordinate by coordinate. That isomorphism is the number-theoretic transform.

If only $n \mid q - 1$, then there are primitive $n$-th roots $\zeta$ but no $2n$-th
roots, and $x^n + 1$ splits into $n/2$ quadratics $x^2 - \gamma$, one for each
$\gamma$ with $\gamma^{n/2} = -1$; the CRT gives $n/2$ copies of a small ring
$\mathbb{F}_q[x]/(x^2 - \gamma)$. This is ML-KEM's situation.

```python
# Roots of x^n + 1 modulo q: they are the primitive 2n-th roots of unity, which exist iff 2n | q - 1.
def mult_order(g, q):
    k, x = 1, g % q
    while x != 1:
        x, k = x * g % q, k + 1
    return k

for q in (7681, 3329):
    roots = [x for x in range(1, q) if pow(x, 256, q) == q - 1]
    print(q, (q - 1) % 512 == 0, len(roots), mult_order(17, q) if q == 3329 else min(roots))
print(pow(17, 128, 3329), pow(17, 256, 3329))
```

```text
7681 True 256 62
3329 False 0 256
3328 1
```

Modulo 7681 there are 256 roots of $x^{256} + 1$ (the smallest is 62), since $512
\mid 7680$. Modulo 3329 there are none; but $17$ has order exactly 256, with
$17^{128} \equiv 3328 \equiv -1$.

## 15.4 The negacyclic NTT

*Level: intermediate.*

Evaluating a polynomial at $n$ points naively takes $n^2$ multiplications. The fast
way follows the factorization one level at a time. If $\zeta^2 = c$, then

$$
x^{2m} - c = (x^m - \zeta)(x^m + \zeta),
$$

and reducing a polynomial $f = f_{\text{lo}} + x^m f_{\text{hi}}$ (with
$f_{\text{lo}}, f_{\text{hi}}$ of degree less than $m$) modulo the two factors is
trivial:

$$
f \bmod (x^m - \zeta) = f_{\text{lo}} + \zeta f_{\text{hi}}, \qquad f \bmod (x^m +
\zeta) = f_{\text{lo}} - \zeta f_{\text{hi}}.
$$

That is the **Cooley-Tukey butterfly**: one multiplication, one addition and one
subtraction per pair of coefficients. Start with $x^n + 1 = x^n - \psi^n$, where
$\psi$ is a primitive $2n$-th root (so $\psi^n = -1$), split into $x^{n/2} \mp
\psi^{n/2}$, split each of those again, and so on. After $\log_2 n$ levels the
factors are linear, $x - \psi^{\text{odd}}$, and the coefficients have become the
values of $f$ at the $n$ roots. The total is $\frac{n}{2}\log_2 n$ multiplications.

The roots used at each level, read in order, are the powers $\psi^{\mathrm{br}(i)}$,
where $\mathrm{br}$ reverses the bits of $i$. That is why FIPS 203 lists its
constants as $\zeta^{\mathrm{BitRev}_7(i)}$, and why the output comes out in
bit-reversed order (which does not matter, as long as both factors of a product use
the same order). The inverse transform runs the levels backwards with the
**Gentleman-Sande butterfly**,

$$
(u, v) \mapsto \left(u + v,\; z\,(v - u)\right), \qquad z = -\zeta^{-1},
$$

and multiplies by $2^{-L}$ at the end, for $L$ layers. Since $-1$ is itself a power
of the root ($\zeta^{128} = -1$ in ML-KEM), $z$ is again a power of $\zeta$, which is
why FIPS 203's inverse reads its constants from the same table, backwards.

<figure class="mars-fig">
<svg viewBox="0 0 640 240" width="640" role="img" aria-label="The splitting tree of the negacyclic NTT for n equal to 8: x to the 8 plus 1 splits into x to the 4 minus and plus psi to the 4, each splits into two quadratics, each into two linear factors x minus an odd power of psi" fill="currentColor" font-size="13">
<g stroke="currentColor" stroke-width="1.2" fill="none">
<path d="M320 40 L 170 85 M320 40 L 470 85"/>
<path d="M170 105 L 95 150 M170 105 L 245 150 M470 105 L 395 150 M470 105 L 545 150"/>
<path d="M95 170 L 58 205 M95 170 L 132 205 M245 170 L 208 205 M245 170 L 282 205 M395 170 L 358 205 M395 170 L 432 205 M545 170 L 508 205 M545 170 L 582 205"/>
</g>
<text x="320" y="32" text-anchor="middle" class="acc">x⁸ + 1 = x⁸ − ψ⁸</text>
<text x="170" y="100" text-anchor="middle">x⁴ − ψ⁴</text>
<text x="470" y="100" text-anchor="middle">x⁴ + ψ⁴</text>
<text x="95" y="165" text-anchor="middle">x² − ψ²</text>
<text x="245" y="165" text-anchor="middle">x² + ψ²</text>
<text x="395" y="165" text-anchor="middle">x² − ψ⁶</text>
<text x="545" y="165" text-anchor="middle">x² + ψ⁶</text>
<g font-size="11" text-anchor="middle">
<text x="58" y="222">x − ψ</text><text x="132" y="222">x + ψ</text>
<text x="208" y="222">x − ψ⁵</text><text x="282" y="222">x + ψ⁵</text>
<text x="358" y="222">x − ψ³</text><text x="432" y="222">x + ψ³</text>
<text x="508" y="222">x − ψ⁷</text><text x="582" y="222">x + ψ⁷</text>
</g>
</svg>
<figcaption>Figure 15.2. The negacyclic NTT for n = 8 as a splitting tree, with ψ a primitive 16th root of unity (ψ⁸ = −1). Each level is one layer of butterflies; the roots used, ψ⁴, then ψ², ψ⁶, then ψ, ψ⁵, ψ³, ψ⁷, are ψ to bit-reversed exponents. Since −ψ = ψ⁹, the leaves are the eight odd powers of ψ. ML-KEM stops one level early, at quadratics.</figcaption>
</figure>

### Code it: the complete NTT

A generic transform, written exactly in the shape of FIPS 203's Algorithms 9 and 10
but with the number of layers as a parameter. With $q = 7681$ (Kyber's original
modulus, 2017) there is a primitive 512th root, so all 8 layers run, and a product
becomes 256 pointwise multiplications. We check it against the schoolbook product.

```python
# The complete negacyclic NTT for q = 7681, n = 256 (8 layers), checked against the schoolbook product.
import random
rng = random.Random(15)

def bitrev(i, bits):
    return int(format(i, "0%db" % bits)[::-1], 2)

def make_ntt(q, n, root, layers):
    """root has order 2^layers * 2 / (n / 2^layers)...: zetas[i] = root^bitrev(i) as in FIPS 203."""
    bits = layers
    zetas = [pow(root, bitrev(i, bits), q) for i in range(1 << bits)]
    inv_count = pow(1 << layers, -1, q)

    def ntt(f):
        f, i, length = f[:], 1, n // 2
        while length >= n >> layers:
            for start in range(0, n, 2 * length):
                z = zetas[i]
                i += 1
                for j in range(start, start + length):
                    t = z * f[j + length] % q
                    f[j + length] = (f[j] - t) % q
                    f[j] = (f[j] + t) % q
            length //= 2
        return f

    def intt(f):
        f, i, length = f[:], (1 << layers) - 1, n >> layers
        while length <= n // 2:
            for start in range(0, n, 2 * length):
                z = zetas[i]
                i -= 1
                for j in range(start, start + length):
                    t = f[j]
                    f[j] = (t + f[j + length]) % q
                    f[j + length] = z * (f[j + length] - t) % q
            length *= 2
        return [x * inv_count % q for x in f]
    return ntt, intt, zetas

q1 = 7681
psi = next(x for x in range(2, q1) if pow(x, 256, q1) == q1 - 1)   # a primitive 512th root of unity
ntt1, intt1, _ = make_ntt(q1, 256, psi, 8)
a = [rng.randrange(q1) for _ in range(256)]
b = [rng.randrange(q1) for _ in range(256)]
pointwise = [x * y % q1 for x, y in zip(ntt1(a), ntt1(b))]
print(psi, intt1(ntt1(a)) == a, intt1(pointwise) == ring_mul(a, b, q1))
```

```text
62 True True
```

### Code it: ML-KEM's incomplete NTT

With $q = 3329$ there is no 512th root, so the transform stops after 7 layers at 128
quadratics $x^2 - \gamma_i$, with $\gamma_i = 17^{2\,\mathrm{BitRev}_7(i) + 1}$, and
products are finished by 128 small multiplications modulo those quadratics:

$$
(a_0 + a_1 x)(b_0 + b_1 x) \equiv (a_0 b_0 + \gamma\, a_1 b_1) + (a_0 b_1 + a_1 b_0)x
\pmod{x^2 - \gamma}.
$$

```python
# ML-KEM's incomplete NTT (FIPS 203, Algorithms 9 to 12): q = 3329, zeta = 17, 7 layers, then
# 128 products of degree-1 polynomials modulo x^2 - zeta^(2 bitrev7(i) + 1).
Q = 3329
ntt, intt, zetas = make_ntt(Q, 256, 17, 7)
gammas = [pow(17, 2 * bitrev(i, 7) + 1, Q) for i in range(128)]

def multiply_ntts(f, g):
    h = [0] * 256
    for i in range(128):
        a0, a1, b0, b1 = f[2 * i], f[2 * i + 1], g[2 * i], g[2 * i + 1]
        h[2 * i] = (a0 * b0 + a1 * b1 * gammas[i]) % Q
        h[2 * i + 1] = (a0 * b1 + a1 * b0) % Q
    return h

print(zetas[:8], pow(128, -1, Q))
a = [rng.randrange(Q) for _ in range(256)]
b = [rng.randrange(Q) for _ in range(256)]
print(intt(ntt(a)) == a, intt(multiply_ntts(ntt(a), ntt(b))) == ring_mul(a, b, Q))
mults_school = 256 * 256
mults_ntt = 2 * 7 * 128 + 128 * 5 + 7 * 128 + 256
print(mults_school, mults_ntt)
```

```text
[1, 1729, 2580, 3289, 2642, 630, 1897, 848] 3303
True True
65536 3584
```

The first eight constants, $1, 1729, 2580, 3289, 2642, 630, 1897, 848$, are those of the
table in FIPS 203 (its Appendix A), and $3303 = 128^{-1} \bmod 3329$ is the final
scaling factor of the inverse. A full product through the NTT (two forward
transforms, the base multiplications and one inverse) costs about 3,584
multiplications against 65,536 for the schoolbook method. In ML-KEM the matrix
$\hat{A}$ is generated directly in NTT form and the secret is kept in NTT form, so
most products cost even less. The *Post-quantum cryptography* book ([chapter 7](../post-quantum/07-Rings-Modules-and-the-NTT.md)) shows the
reduction tricks (Montgomery and Barrett) that make each of these multiplications
cheap in hardware, in its [chapter 7](../post-quantum/07-Rings-Modules-and-the-NTT.md).

## 15.5 Small noise: binomial and Gaussian

*Level: intermediate.*

The errors and secrets of LWE come from a distribution $\chi$ concentrated near 0.
Two are used.

The **discrete Gaussian** $D_{\mathbb{Z}, \sigma}$ gives each integer $x$ probability
proportional to $\exp(-x^2/(2\sigma^2))$. It is the distribution in Regev's proof and
in most theory, because Gaussians behave perfectly under sums and projections.
But sampling it exactly, in constant time, is delicate: table lookups and rejection
loops leak timing.

The **centered binomial distribution** $\mathrm{CBD}_\eta$ is the difference of two
sums of $\eta$ fair coin flips: $\sum_{i=1}^{\eta} a_i - \sum_{i=1}^{\eta} b_i$. It takes
values in $[-\eta, \eta]$, with mean 0 and variance $\eta/2$, and it is trivial to
sample in constant time from random bits. Its shape is already close to a Gaussian
(by the central limit theorem, and for small $\eta$ already within a few percent),
and security analyses only need its variance and its bounded support. ML-KEM uses
$\mathrm{CBD}_2$ and $\mathrm{CBD}_3$, generated from SHAKE256 output by FIPS 203's
Algorithm 8, SamplePolyCBD.

```python
# Small noise: the centered binomial distribution CBD_eta (sum of eta coin flips minus eta more),
# and ML-KEM's SamplePolyCBD from SHAKE256 bytes (FIPS 203, Algorithm 8 with PRF).
import hashlib
from math import comb, exp, pi, sqrt

def cbd_pmf(eta):
    return {k: comb(2 * eta, eta + k) / 4**eta for k in range(-eta, eta + 1)}

for eta in (2, 3):
    pmf = cbd_pmf(eta)
    var = sum(k * k * p for k, p in pmf.items())
    sigma = sqrt(var)
    z = sum(exp(-k * k / (2 * var)) for k in range(-20, 21))
    gauss = {k: exp(-k * k / (2 * var)) / z for k in range(-eta, eta + 1)}
    print(eta, var, {k: round(p, 4) for k, p in pmf.items()}, round(max(abs(pmf[k] - gauss[k]) for k in pmf), 4))

def sample_poly_cbd(seed32, nonce, eta):
    stream = hashlib.shake_256(seed32 + bytes([nonce])).digest(64 * eta)
    bits = [(stream[i // 8] >> (i % 8)) & 1 for i in range(8 * len(stream))]
    f = []
    for i in range(256):
        x = sum(bits[2 * i * eta + j] for j in range(eta))
        y = sum(bits[2 * i * eta + eta + j] for j in range(eta))
        f.append((x - y) % Q)
    return f

seed = bytes(range(32))
coeffs = []
for nonce in range(40):
    coeffs += [c if c < Q // 2 else c - Q for c in sample_poly_cbd(seed, nonce, 2)]
print(min(coeffs), max(coeffs), round(sum(c * c for c in coeffs) / len(coeffs), 3))
```

```text
2 1.0 {-2: 0.0625, -1: 0.25, 0: 0.375, 1: 0.25, 2: 0.0625} 0.0239
3 1.5 {-3: 0.0156, -2: 0.0938, -1: 0.2344, 0: 0.3125, 1: 0.2344, 2: 0.0938, 3: 0.0156} 0.0132
-2 2 1.02
```

$\mathrm{CBD}_2$ takes the values $-2, \ldots, 2$ with probabilities $\frac{1}{16},
\frac{4}{16}, \frac{6}{16}, \frac{4}{16}, \frac{1}{16}$, variance 1, and differs from
the discrete Gaussian of the same variance by at most $0.024$ in any single
probability. Forty sampled polynomials (10,240 coefficients) have variance $1.02$.

<figure class="mars-fig">
<svg viewBox="0 0 640 230" width="640" role="img" aria-label="Bar chart of the centered binomial distribution with eta equal to 2, probabilities one sixteenth, four sixteenths, six sixteenths, four sixteenths, one sixteenth, against a discrete Gaussian of the same variance shown as dots" fill="currentColor" font-size="13">
<g stroke="currentColor" stroke-width="1" opacity=".5"><line x1="40" y1="190" x2="600" y2="190"/></g>
<rect x="180.0" y="166.2" width="40" height="23.8" class="acc-fill" fill-opacity=".55"/>
<text x="200.0" y="230.0" text-anchor="middle" font-size="12">1/16</text>
<rect x="240.0" y="95.0" width="40" height="95.0" class="acc-fill" fill-opacity=".55"/>
<text x="260.0" y="230.0" text-anchor="middle" font-size="12">4/16</text>
<rect x="300.0" y="47.5" width="40" height="142.5" class="acc-fill" fill-opacity=".55"/>
<text x="320.0" y="230.0" text-anchor="middle" font-size="12">6/16</text>
<rect x="360.0" y="95.0" width="40" height="95.0" class="acc-fill" fill-opacity=".55"/>
<text x="380.0" y="230.0" text-anchor="middle" font-size="12">4/16</text>
<rect x="420.0" y="166.2" width="40" height="23.8" class="acc-fill" fill-opacity=".55"/>
<text x="440.0" y="230.0" text-anchor="middle" font-size="12">1/16</text>
<circle cx="80.0" cy="189.9" r="5"/>
<circle cx="140.0" cy="188.3" r="5"/>
<circle cx="200.0" cy="169.5" r="5"/>
<circle cx="260.0" cy="98.1" r="5"/>
<circle cx="320.0" cy="38.4" r="5"/>
<circle cx="380.0" cy="98.1" r="5"/>
<circle cx="440.0" cy="169.5" r="5"/>
<circle cx="500.0" cy="188.3" r="5"/>
<circle cx="560.0" cy="189.9" r="5"/>
<text x="80.0" y="210" text-anchor="middle">-4</text>
<text x="140.0" y="210" text-anchor="middle">-3</text>
<text x="200.0" y="210" text-anchor="middle">-2</text>
<text x="260.0" y="210" text-anchor="middle">-1</text>
<text x="320.0" y="210" text-anchor="middle">0</text>
<text x="380.0" y="210" text-anchor="middle">1</text>
<text x="440.0" y="210" text-anchor="middle">2</text>
<text x="500.0" y="210" text-anchor="middle">3</text>
<text x="560.0" y="210" text-anchor="middle">4</text>
<rect x="440" y="20" width="14" height="14" class="acc-fill" fill-opacity=".55"/><text x="462" y="32" font-size="12">CBD₂</text>
<circle cx="447" cy="50" r="5"/><text x="462" y="54" font-size="12">Gaussian, σ = 1</text>
</svg>
<figcaption>Figure 15.3. The centered binomial distribution CBD₂ (bars) and the discrete Gaussian with the same variance, 1 (dots). ML-KEM samples the binomial, which is exact and constant-time from random bits, and its security analysis uses the variance.</figcaption>
</figure>

## 15.6 LWE and Regev's encryption

*Level: intermediate.*

Fix $n$, a modulus $q$ and an error distribution $\chi$. For a secret $s \in
\mathbb{Z}_q^n$, an **LWE sample** is $(a, b)$ with $a$ uniform in $\mathbb{Z}_q^n$ and
$b = \langle a, s \rangle + e$, $e \leftarrow \chi$. With $m$ samples stacked,
$b = As + e$.

- **Search-LWE**: given samples, find $s$.
- **Decision-LWE**: tell LWE samples from uniformly random pairs $(a, b)$.

Recovering $s$ is a **bounded-distance decoding** problem in the $q$-ary lattice
$\{y : y \equiv Ax \pmod q\}$ of [Chapter 14](14-Lattices.md): $b$ is a point at
distance $\|e\|$ from the lattice point $As$, much closer than the Gaussian heuristic
spacing. A secret drawn from $\chi$ instead of uniformly is no easier: a simple
transformation (Applebaum, Cash, Peikert and Sahai, 2009) turns any LWE instance into
one with a short secret, which is why ML-KEM can use small secrets.

### Regev's encryption

Oded Regev's 2005 paper also gave the first LWE encryption scheme.

- **Key**: secret $s$; public $(A, b = As + e)$ with $m$ samples.
- **Encrypt** a bit $\mu$: choose a random subset $S$ of the samples (a 0/1 vector
  $r$), and send $u = r^T A$ and $v = r^T b + \mu \lfloor q/2 \rfloor$.
- **Decrypt**: compute $d = v - \langle u, s \rangle = r^T e + \mu \lfloor q/2
  \rfloor$. If $d$ is closer to 0 than to $q/2$, output 0, else 1.

Decryption is correct as long as the accumulated noise $|r^T e|$ stays below $q/4$.
With $m = 256$ errors from $\mathrm{CBD}_2$, the sum of about 128 of them has standard
deviation about 11, far below $q/4 = 832$. Security: $(A, b)$ looks uniform by
decision-LWE, and then $(u, v)$ is close to uniform by the **leftover hash lemma**
(a random subset sum of a random matrix is nearly uniform when $m$ is large enough).

```python
# Plain LWE: Regev's encryption of one bit, n = 128, m = 256, q = 3329, CBD_2 noise.
def cbd(eta):
    return sum(rng.getrandbits(1) for _ in range(eta)) - sum(rng.getrandbits(1) for _ in range(eta))

nL, mL = 128, 256
A = [[rng.randrange(Q) for _ in range(nL)] for _ in range(mL)]
s = [cbd(2) for _ in range(nL)]
e = [cbd(2) for _ in range(mL)]
bvec = [(sum(x * y for x, y in zip(row, s)) + ei) % Q for row, ei in zip(A, e)]   # b = A s + e

def regev_encrypt(bit):
    r = [rng.getrandbits(1) for _ in range(mL)]                 # a random subset of the samples
    u = [sum(A[i][j] for i in range(mL) if r[i]) % Q for j in range(nL)]
    v = (sum(bvec[i] for i in range(mL) if r[i]) + bit * (Q // 2)) % Q
    return u, v

def regev_decrypt(u, v):
    d = (v - sum(x * y for x, y in zip(u, s))) % Q              # = sum of r_i e_i + bit * q/2
    return int(Q // 4 < d < 3 * Q // 4)

bits = [rng.getrandbits(1) for _ in range(300)]
print(all(regev_decrypt(*regev_encrypt(bit)) == bit for bit in bits))
u0, v0 = regev_encrypt(0)
d0 = (v0 - sum(x * y for x, y in zip(u0, s))) % Q
print(d0 if d0 < Q // 2 else d0 - Q, Q // 4)
```

```text
True
15 832
```

All 300 bits decrypt correctly; one noise value, 15, shows how much room there is
before the threshold 832.

<figure class="mars-fig">
<svg viewBox="0 0 640 260" width="640" role="img" aria-label="Decoding on the circle of integers modulo q: values within q over 4 of 0 decode to 0, values within q over 4 of q over 2 decode to 1; the noise forms a narrow bump around each center" fill="currentColor" font-size="13">
<g stroke="currentColor" stroke-width="1.5" fill="none">
<circle cx="200" cy="130" r="90"/>
</g>
<path d="M200 40 A 90 90 0 0 1 200 220 Z" class="soft-acc" fill="currentColor" fill-opacity=".15"/>
<path d="M200 220 A 90 90 0 0 1 200 40 Z" class="acc-fill" fill-opacity=".35"/>
<line x1="200" y1="32" x2="200" y2="228" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4"/>
<g stroke="currentColor" stroke-width="5" fill="none" class="acc">
<path d="M 289.4 118.2 A 90 90 0 0 1 289.4 141.8"/>
<path d="M 110.6 141.8 A 90 90 0 0 1 110.6 118.2"/>
</g>
<text x="300" y="135">0</text>
<text x="70" y="135">q/2</text>
<text x="200" y="24" text-anchor="middle">q/4</text><text x="200" y="248" text-anchor="middle">3q/4 = −q/4</text>
<text x="225" y="134" font-size="12">decode 0</text>
<text x="128" y="134" font-size="12">decode 1</text>
<text x="360" y="90" font-size="12">d = noise + bit · ⌊q/2⌋</text>
<text x="360" y="112" font-size="12">noise: a narrow bump (thick arcs)</text>
<text x="360" y="134" font-size="12">error if |noise| > q/4</text>
<text x="360" y="156" font-size="12">ML-KEM: q/4 = 832, noise σ ≈ 39</text>
<text x="360" y="178" font-size="12">before compression</text>
</svg>
<figcaption>Figure 15.4. Decoding a bit. Arithmetic modulo q lives on a circle. The decrypted value is the message (0 or q/2) plus a small noise; anything in the right half decodes to 0, anything in the left half to 1. Correctness is the requirement that the noise stays inside a quarter-circle.</figcaption>
</figure>

### Regev's reduction, in outline

Regev's theorem: if $\chi$ is a discrete Gaussian of width $\alpha q$ with $\alpha q >
2\sqrt{n}$, then any efficient algorithm for decision-LWE gives an efficient
*quantum* algorithm that approximates the worst-case lattice problems GapSVP and SIVP
in dimension $n$ within factors about $n/\alpha$. The proof alternates two steps:

1. **From Gaussian samples on the dual lattice to BDD**: an LWE solver, fed samples
   built from discrete Gaussian vectors of the dual lattice $L^*$, solves BDD on $L$.
2. **From BDD back to narrower Gaussians**: a BDD solver, run on a quantum
   superposition, lets a quantum Fourier transform produce discrete Gaussian samples
   on $L^*$ of smaller width.

Iterating narrows the Gaussian until its samples are short dual-lattice vectors,
which solve the approximate lattice problem. The quantum step is the one place
where the argument needs a quantum computer; Chris Peikert (2009) and Zvika
Brakerski, Adeline Langlois, Chris Peikert, Oded Regev and Damien Stehlé (2013) gave
classical reductions for related parameters. The theorem says nothing about any
particular $n$ and $q$, but it shows that LWE has no "easy average case": a random
instance is as hard as the hardest lattice instance, up to polynomial factors.

## 15.7 Search versus decision

*Level: intermediate.*

Decision looks easier than search: you only have to notice that something is not
random. For LWE with a prime modulus $q$ of polynomial size, the two are equivalent.

**Search reduces to decision.** Suppose we have an oracle that distinguishes LWE
samples from uniform ones. To find $s_1$, the first coordinate of the secret, try
each guess $g \in \mathbb{Z}_q$. Transform each sample $(a, b)$ by picking a random $t
\in \mathbb{Z}_q$ and setting

$$
a' = a + t\,e_1, \qquad b' = b + t\,g,
$$

where $e_1 = (1, 0, \ldots, 0)$. Then $b' - \langle a', s \rangle = e + t(g - s_1)$.

- If $g = s_1$, this is $e$: the new samples are LWE samples with the same secret.
- If $g \ne s_1$, then $t(g - s_1)$ is uniform in $\mathbb{Z}_q$ (because $q$ is
  prime, multiplying the uniform $t$ by the nonzero $g - s_1$ keeps it uniform), so
  $b'$ is uniform and independent of $a'$.

The oracle tells the two cases apart, so it recognizes the right guess. Repeat for
each coordinate: $nq$ guesses in all, polynomial when $q$ is. $\blacksquare$

**Decision reduces to search** trivially: find a candidate $s$, and check whether $b -
As$ is small.

This equivalence is why security proofs can use decision-LWE ("the public key looks
random"), while attacks and parameter estimates think about search ("recover the
secret").

## 15.8 Ring-LWE and Module-LWE

*Level: expert.*

**Ring-LWE** (Vadim Lyubashevsky, Chris Peikert and Oded Regev, 2010) replaces
vectors by elements of $R_q$: the secret is a polynomial $s$, a sample is $(a, b = a
\cdot s + e)$ with $a$ uniform in $R_q$ and $e$ a polynomial with small coefficients.
One ring sample is $n$ ordinary LWE samples whose matrix is negacyclic. Keys shrink
from $n^2$ to $n$ numbers, and the NTT makes the arithmetic $O(n \log n)$. The price
is structure: the hardness proof now goes to *ideal lattices* in the ring of integers
of the cyclotomic field, a special class of lattices.

**Module-LWE** (Adeline Langlois and Damien Stehlé, 2015) sits in between: the secret
is a vector of $k$ ring elements and the public matrix is $k \times k$ over $R_q$.
That is LWE in dimension $kn$ with a block-negacyclic matrix. ML-KEM and ML-DSA use
it with $n = 256$ fixed and $k$ as the security dial: one fast NTT, three security
levels.

| | plain LWE | Ring-LWE | Module-LWE |
|---|---|---|---|
| secret | $n$ numbers | 1 polynomial of degree $< n$ | $k$ polynomials |
| public matrix | $n \times n$ numbers | 1 polynomial | $k \times k$ polynomials |
| lattice dimension | $n$ | $n$ | $kn$ |
| used in | FrodoKEM | NewHope (withdrawn) | ML-KEM, ML-DSA |

### Code it: an ML-KEM-style encryption

The heart of ML-KEM (its internal "K-PKE" encryption) without the compression and
byte encodings: $k = 3$, $n = 256$, $q = 3329$, all products through the NTT of §15.4.

- **Key**: $\hat{A}$ sampled directly in NTT form; $s, e \leftarrow
  \mathrm{CBD}_2^{k}$; $t = As + e$.
- **Encrypt** 256 message bits $m$: $r, e_1 \leftarrow \mathrm{CBD}_2^k$, $e_2
  \leftarrow \mathrm{CBD}_2$; $u = A^T r + e_1$, $v = t^T r + e_2 + \lceil q/2
  \rfloor m$.
- **Decrypt**: $w = v - s^T u = e^T r - s^T e_1 + e_2 + \lceil q/2 \rfloor m$, and
  round each coefficient to 0 or $q/2$.

```python
# Module-LWE, ML-KEM style (without compression or encodings): k = 3, n = 256, q = 3329.
k = 3
def poly_add(f, g):
    return [(x + y) % Q for x, y in zip(f, g)]

def poly_sub(f, g):
    return [(x - y) % Q for x, y in zip(f, g)]

def sample(eta):
    return [cbd(eta) % Q for _ in range(256)]

A_hat = [[[rng.randrange(Q) for _ in range(256)] for _ in range(k)] for _ in range(k)]  # sampled in NTT form
s_vec = [sample(2) for _ in range(k)]
e_vec = [sample(2) for _ in range(k)]
s_hat = [ntt(p) for p in s_vec]
t_vec = []
for i in range(k):
    acc = [0] * 256
    for j in range(k):
        acc = poly_add(acc, multiply_ntts(A_hat[i][j], s_hat[j]))
    t_vec.append(poly_add(intt(acc), e_vec[i]))            # t = A s + e

def mlwe_encrypt(msg_bits):
    r_hat = [ntt(sample(2)) for _ in range(k)]
    e1 = [sample(2) for _ in range(k)]
    e2 = sample(2)
    u = []
    for j in range(k):                                     # u = A^T r + e1
        acc = [0] * 256
        for i in range(k):
            acc = poly_add(acc, multiply_ntts(A_hat[i][j], r_hat[i]))
        u.append(poly_add(intt(acc), e1[j]))
    acc = [0] * 256
    for i in range(k):
        acc = poly_add(acc, multiply_ntts(ntt(t_vec[i]), r_hat[i]))
    v = poly_add(poly_add(intt(acc), e2), [bit * ((Q + 1) // 2) for bit in msg_bits])
    return u, v

def mlwe_decrypt(u, v):
    acc = [0] * 256
    for i in range(k):
        acc = poly_add(acc, multiply_ntts(s_hat[i], ntt(u[i])))
    w = poly_sub(v, intt(acc))                             # = e^T r - s^T e1 + e2 + message
    return [int(Q // 4 < c < 3 * Q // 4) for c in w], w

msg = [rng.getrandbits(1) for _ in range(256)]
got, w = mlwe_decrypt(*mlwe_encrypt(msg))
centered = [(c - (Q + 1) // 2 * m) % Q for c, m in zip(w, msg)]
centered = [c if c < Q // 2 else c - Q for c in centered]
print(got == msg, min(centered), max(centered))
```

```text
True -112 94
```

All 256 bits come back. The noise coefficients range from $-112$ to $94$, well inside
$\pm 832$.

## 15.9 The parameters of ML-KEM, and why 3329

*Level: expert.*

FIPS 203 defines three parameter sets on the same ring:

| | $k$ | $\eta_1$ | $\eta_2$ | $d_u$ | $d_v$ | encapsulation key | decapsulation key | ciphertext | decryption failure |
|---|---|---|---|---|---|---|---|---|---|
| ML-KEM-512 | 2 | 3 | 2 | 10 | 4 | 800 | 1,632 | 768 | $2^{-138.8}$ |
| ML-KEM-768 | 3 | 2 | 2 | 10 | 4 | 1,184 | 2,400 | 1,088 | $2^{-164.8}$ |
| ML-KEM-1024 | 4 | 2 | 2 | 11 | 5 | 1,568 | 3,168 | 1,568 | $2^{-174.8}$ |

(Sizes in bytes.) The sizes follow from the parameters: the encapsulation key is
$k$ polynomials of 256 coefficients at 12 bits ($384k$ bytes) plus a 32-byte seed for
$\hat{A}$; the ciphertext compresses $u$ to $d_u$ bits and $v$ to $d_v$ bits per
coefficient, $32(d_u k + d_v)$ bytes.

```python
# ML-KEM sizes in bytes (FIPS 203): keys, ciphertexts and the parameters behind them.
for name, kk, eta1, du, dv in (("ML-KEM-512", 2, 3, 10, 4), ("ML-KEM-768", 3, 2, 10, 4), ("ML-KEM-1024", 4, 2, 11, 5)):
    ek = 384 * kk + 32
    dk = 768 * kk + 96
    ct = 32 * (du * kk + dv)
    print(name, kk, eta1, du, dv, ek, dk, ct)
```

```text
ML-KEM-512 2 3 10 4 800 1632 768
ML-KEM-768 3 2 10 4 1184 2400 1088
ML-KEM-1024 4 2 11 5 1568 3168 1568
```

### Why $q = 3329$

Three demands meet in the modulus.

1. **The NTT.** For fast multiplication in $\mathbb{Z}_q[x]/(x^{256} + 1)$, $q - 1$
   must be divisible by 512 (complete NTT) or at least by 256 (incomplete NTT, one
   cheap extra step). The primes with $256 \mid q - 1$ below 8,000 are 257, 769, 3329,
   7681 and 7937; only 7681 also has $512 \mid q - 1$.
2. **Correctness.** The noise must stay below $q/4$ with overwhelming probability.
3. **Size and security.** Every coefficient of the public key takes $\lceil \log_2 q
   \rceil$ bits, and for fixed noise a smaller $q$ is both more compact and harder to
   attack (the ratio of noise to modulus is what matters).

So the designers want the smallest $q$ that passes the first two tests. A rough check
of the second, treating the noise of ML-KEM-768 *before compression* as Gaussian
with variance $2kn(\eta/2)^2 + \eta/2$:

```python
# Why q = 3329?  Primes with 256 | q - 1, and the decryption margin (q/4) / sigma for ML-KEM-768's
# noise e^T r - s^T e1 + e2 before compression (sigma^2 = 2kn (eta/2)^2 + eta/2 with eta = 2).
from math import erfc, log2
cands = [qq for qq in range(257, 8000, 256) if all(qq % d for d in range(2, int(qq**0.5) + 1))]
sigma = sqrt(2 * 3 * 256 * 1.0 + 1.0)
for qq in cands[:3]:
    ratio = (qq / 4) / sigma
    per_coeff = erfc(ratio / sqrt(2))
    per_msg = min(1.0, 256 * per_coeff)
    print(qq, round(ratio, 1), round(log2(per_msg), 1))
```

```text
257 1.6 0.0
769 4.9 -12.0
3329 21.2 -321.8
```

The columns are $q$, the margin $(q/4)/\sigma$, and $\log_2$ of the estimated
probability that one of the 256 coefficients fails. With $q = 257$ a message fails
essentially always; with $769$, about once in 4,000 messages, hopeless when the
target is below $2^{-128}$; with $3329$, the margin is 21 standard deviations, and the
estimate is around $2^{-322}$. Compression of the ciphertext then spends most of that
margin to shrink $u$ and $v$, and the exact analysis in FIPS 203 gives the failure
rates in the table. This is why Kyber, which used $q = 7681$ in 2017, moved to
$q = 3329$ in its 2019 revision: the smallest prime of the right shape with room for
the noise, fitting each coefficient into 12 bits, at the cost of the incomplete NTT.

### Break it: LWE without the errors

The errors are not decoration. Without them, $b = As$ is a linear system, and
Gaussian elimination modulo $q$ ([Chapter 9](09-Linear-Algebra.md)) solves it from
$n$ samples. With them, the same elimination returns nothing useful.

```python
# Break it: LWE without noise is just linear algebra.  Gaussian elimination mod q recovers s
# from n samples; with even CBD_2 noise the same computation returns garbage.
def solve_mod(M, y, q):
    """Solve M x = y (M square, invertible mod prime q) by Gauss-Jordan elimination."""
    nn = len(M)
    R = [row[:] + [yy] for row, yy in zip(M, y)]
    for c in range(nn):
        piv = next(r for r in range(c, nn) if R[r][c] % q)
        R[c], R[piv] = R[piv], R[c]
        inv = pow(R[c][c], -1, q)
        R[c] = [x * inv % q for x in R[c]]
        for r in range(nn):
            if r != c and R[r][c]:
                f = R[r][c]
                R[r] = [(x - f * y2) % q for x, y2 in zip(R[r], R[c])]
    return [row[-1] for row in R]

s_true = [x % Q for x in s]
b_clean = [sum(x * y for x, y in zip(row, s)) % Q for row in A[:nL]]
print(solve_mod(A[:nL], b_clean, Q) == s_true)
guess = solve_mod(A[:nL], bvec[:nL], Q)
print(guess == s_true, sum(1 for x, y in zip(guess, s_true) if x == y), guess[:6])
```

```text
True
False 0 [3069, 2453, 246, 461, 1820, 1876]
```

With the noise removed, elimination on 128 samples recovers all 128 secret
coordinates. With $\mathrm{CBD}_2$ noise it gets none of them right: the outputs are
large, essentially random numbers. Errors that are *too structured* are almost as
bad: if every error lies in a known small set such as $\{0, 1\}$, each sample gives a
polynomial equation $\prod_{c}(b - \langle a, s \rangle - c) = 0$ that can be
linearized and solved with enough samples. That is the Arora-Ge attack, worked out
in *Post-quantum cryptography*,
[chapter 5](../post-quantum/05-Lattices-and-Their-Hard-Problems.md).

### Fix it

- Use errors from a distribution with enough entropy and variance (ML-KEM's
  $\mathrm{CBD}_\eta$), never zero or tiny errors, and never reuse one error vector.
- Do not hand out unlimited samples for one secret with structured errors.
- Use the standard's parameters and its Fujisaki-Okamoto transform, which turns the
  encryption into a KEM that is secure against chosen-ciphertext attacks and, by
  re-encrypting during decapsulation, refuses ciphertexts crafted to provoke
  decryption failures.

## 15.10 In the real world

*Level: expert.*

- **ML-KEM** (FIPS 203, 2024) is deployed in hybrid key exchange (X25519MLKEM768) in
  TLS 1.3 by the major browsers and content networks, in OpenSSH (sntrup761 first,
  then mlkem768x25519) and in Signal's PQXDH and later protocols. The
  *Post-quantum cryptography* book walks through
  [ML-KEM](../post-quantum/08-ML-KEM.md) line by line.
- **ML-DSA** (FIPS 204) uses Module-LWE and Module-SIS with $q = 8{,}380{,}417$ and
  the complete NTT.
- **FrodoKEM** uses plain LWE, with no ring structure, for those who distrust it;
  it is several times larger.
- **Homomorphic encryption** (BGV, BFV, CKKS) uses Ring-LWE with much larger
  moduli, products of NTT-friendly primes, and the same transform.

## Going deeper

- *Cyclotomic fields.* $R = \mathbb{Z}[x]/(\Phi_m)$ is the ring of integers of
  $\mathbb{Q}(\zeta_m)$; its canonical embedding into $\mathbb{C}^{\varphi(m)}$ is the
  right geometry for Ring-LWE noise, and for power-of-two $m$ it coincides with the
  coefficient geometry up to scaling.
- *Ideal-lattice attacks.* For Ring-LWE, no attack better than generic lattice
  reduction is known for the parameters used, but for *Ideal-SVP* with large
  approximation factors there are quantum algorithms that exploit the field's unit
  group (Cramer, Ducas, Peikert, Regev 2016; Cramer, Ducas, Wesolowski 2017). They do
  not reach the small factors that LWE needs.
- *Learning with rounding.* Replace random errors by deterministic rounding,
  $b = \lfloor (p/q)\langle a, s \rangle \rceil$ (Banerjee, Peikert and Rosen, 2012).
  The NIST finalist Saber used its module version.
- *NTRU.* The older ring problem (Hoffstein, Pipher and Silverman, 1996), behind
  Falcon and sntrup761: a public key $h = g/f$ with small $f, g$.

## Check yourself

??? question "1. In $\mathbb{Z}_{17}[x]/(x^4 + 1)$, what is $x^5$?"

    $x^5 = x \cdot x^4 = x \cdot (-1) = -x \equiv 16x$.

??? question "2. What is $\Phi_9(x)$?"

    $x^9 - 1 = \Phi_1 \Phi_3 \Phi_9 = (x^3 - 1)\Phi_9$, so $\Phi_9 = x^6 + x^3 + 1$.

??? question "3. Does $x^{256} + 1$ split into linear factors modulo 12289?"

    $12288 = 2^{12} \cdot 3$, so $512 \mid q - 1$: yes. (12289 was NewHope's modulus,
    with $n = 1024$, since $2048 \mid 12288$ too.)

??? question "4. Why does the NTT output come out in bit-reversed order, and why is that harmless?"

    Each layer splits a factor into a "minus" half and a "plus" half and keeps them in
    place, so the leaves are ordered by the bits of their exponent read backwards.
    Pointwise products and the inverse transform use the same order, so the
    permutation cancels.

??? question "5. What are the mean and variance of $\mathrm{CBD}_3$?"

    Mean 0; variance $3/2$ (each of the 6 coin flips contributes $1/4$).

??? question "6. In Regev's scheme, why does a random 0/1 combination of the public samples hide the bit?"

    $(r^T A, r^T b)$ is a random subset sum of many uniformly random-looking vectors,
    which by the leftover hash lemma is nearly uniform; adding $\mu \lfloor q/2
    \rfloor$ to a nearly uniform value hides $\mu$.

??? question "7. In the search-to-decision reduction, where is the primality of $q$ used?"

    To make $t(g - s_1)$ uniform when $g \ne s_1$: multiplication by a nonzero
    element is a bijection of $\mathbb{Z}_q$ only when that element is invertible.

??? question "8. ML-KEM-768 has $k = 3$. What is its lattice dimension, and its public-key size if no seed were used for $A$?"

    $kn = 768$. Without the seed, $\hat{A}$ would add $k^2 \cdot 256 \cdot 12$ bits,
    that is $9 \cdot 384 = 3{,}456$ bytes, almost three times the whole 1,184-byte
    key.

??? question "9. Why does ML-KEM keep $\hat{A}$ and $s$ in NTT form?"

    The NTT is linear, so $A s$ can be computed as $\mathrm{NTT}^{-1}(\hat{A} \circ
    \hat{s})$; generating $\hat{A}$ directly from the seed and storing $\hat{s}$ skips
    their forward transforms entirely.

## What you learned

- $R_q = \mathbb{Z}_q[x]/(x^n + 1)$ multiplies negacyclically; one polynomial stands
  for an $n \times n$ structured matrix.
- $x^n + 1 = \Phi_{2n}$ for $n$ a power of 2; modulo $q$ it splits into linear
  factors iff $2n \mid q - 1$, into quadratics iff $n \mid q - 1$.
- The negacyclic NTT follows that factorization layer by layer with Cooley-Tukey
  butterflies and bit-reversed roots; ML-KEM's 7-layer version ends in 128 base
  multiplications.
- $\mathrm{CBD}_\eta$ has variance $\eta/2$, is easy to sample exactly, and stands in
  for the Gaussian of the theory.
- LWE: $b = As + e$; decryption works while the noise stays under $q/4$; Regev's
  reduction ties average-case LWE to worst-case lattice problems.
- Search and decision LWE are equivalent for prime polynomial $q$.
- Ring- and Module-LWE trade structure for size and speed; ML-KEM is Module-LWE with
  $n = 256$, $q = 3329$, $k = 2, 3, 4$; 3329 is the smallest NTT-friendly prime that
  leaves room for the noise.

**Next:** [Chapter 16](16-Probability.md), probability for
cryptographers: the birthday bound, statistical distance and the advantage
calculations behind every security proof.

## Further reading

- Oded Regev, "On Lattices, Learning with Errors, Random Linear Codes, and
  Cryptography", STOC 2005; journal version in *Journal of the ACM* 56 (2009).
- Oded Regev, "The Learning with Errors Problem" (survey, 2010).
- Chris Peikert, "A Decade of Lattice Cryptography", *Foundations and Trends in
  Theoretical Computer Science* 10 (2016).
- Vadim Lyubashevsky, Chris Peikert and Oded Regev, "On Ideal Lattices and Learning
  with Errors over Rings", EUROCRYPT 2010.
- Adeline Langlois and Damien Stehlé, "Worst-Case to Average-Case Reductions for
  Module Lattices", *Designs, Codes and Cryptography* 75 (2015).
- Joppe Bos and others, "CRYSTALS-Kyber: A CCA-Secure Module-Lattice-Based KEM",
  EuroS&P 2018; and the Kyber round-2 and round-3 specifications.
- NIST FIPS 203, Module-Lattice-Based Key-Encapsulation Mechanism Standard (2024).
- Gregor Seiler, "Faster AVX2 Optimized NTT Multiplication for Ring-LWE Lattice
  Cryptography" (2018), for the merged negacyclic NTT.
- In *Post-quantum cryptography*: [chapter 5](../post-quantum/05-Lattices-and-Their-Hard-Problems.md),
  [chapter 7](../post-quantum/07-Rings-Modules-and-the-NTT.md) and
  [chapter 8](../post-quantum/08-ML-KEM.md).
