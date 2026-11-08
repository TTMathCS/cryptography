# 8. Rings, Fields and Polynomials

*A group has one operation. Most of cryptography needs two, adding and
multiplying, that fit together the way they do for ordinary numbers. Structures
with two such operations are rings, and rings in which every nonzero element can
be divided by are fields. This chapter builds the finite fields that cryptography
runs on: the integers modulo a prime, and the fields of $2^8$ and $2^{128}$
elements that AES and GCM compute in, made from polynomials the same way
$\mathbb{Z}/p\mathbb{Z}$ is made from integers. You will learn to divide
polynomials, recognize irreducible ones, prove that every finite field has a
prime-power number of elements and a cyclic group of units, and compute the AES
S-box and GCM's GHASH from first principles. The chapter ends with the attack
that follows when GCM reuses a nonce, solved with one division and one square
root in $\mathrm{GF}(2^{128})$.*

!!! abstract "In this chapter"
    **You will learn:**

    - what rings and fields are, with integers, residues, polynomials and
      matrices as examples;
    - division with remainder and Euclid's algorithm for polynomials;
    - irreducible polynomials, how to find and count them, and Rabin's test;
    - how to build $\mathrm{GF}(p^n)$ from an irreducible polynomial, and why
      every finite field has prime-power size;
    - why the nonzero elements of a finite field form a cyclic group;
    - $\mathrm{GF}(2^8)$ as AES uses it: xtime, multiplication, inverses and
      the S-box;
    - the Frobenius map and subfields;
    - $\mathrm{GF}(2^{128})$ as GCM uses it, with its bit-reflected
      convention, and the forbidden attack on nonce reuse.

    **You need:** [Chapter 3](03-Modular-Arithmetic.md) (arithmetic mod $n$
    and Euclid's algorithm) and [Chapter 7](07-Groups.md) (groups, orders,
    Lagrange's theorem).

    **Levels:** §8.1 to §8.4 are for beginners, §8.5 to §8.9 are
    intermediate, §8.10 and §8.11 are expert.

## 8.1 The problem

*Level: beginner.*

The Arcadia City data vault encrypts every file with AES. Inside AES, each byte
of the block is, sixteen times per round, replaced by its "inverse", and columns
of bytes are mixed by "multiplying" them by fixed constants. A byte is eight
bits, a number from 0 to 255. What can "the inverse of a byte" mean?

Not the inverse modulo 256: half of the bytes (the even ones) have none, since
256 is not prime. Not the inverse modulo the nearest prime, 257: then 256 would
be a possible answer, and that is not a byte. AES needs a number system with
exactly 256 elements in which adding, subtracting, multiplying and dividing (by
anything but zero) all work, and in which adding is the cheapest operation a
processor has, the bitwise exclusive-or.

Such a system exists, and is unique: the finite field $\mathrm{GF}(2^8)$. Its
elements are not numbers but polynomials with coefficients 0 and 1, of degree
less than 8; a byte is the list of their coefficients. Multiplication is done
modulo a fixed polynomial, just as arithmetic in $\mathbb{Z}/p\mathbb{Z}$ is done
modulo a fixed prime. This chapter builds it, and its larger cousin
$\mathrm{GF}(2^{128})$, which authenticates almost every HTTPS connection through
AES-GCM.

## 8.2 Rings and fields

*Level: beginner.*

A **ring** is a set with two operations, $+$ and $\cdot$, such that:

1. under $+$ it is an abelian group, with identity 0;
2. $\cdot$ is associative and has an identity 1;
3. $\cdot$ distributes over $+$: $a(b + c) = ab + ac$ and $(b + c)a = ba + ca$.

If also $ab = ba$ always, the ring is **commutative**. (Some books do not require
a 1; every ring in this book has one.) A **unit** is an element with a
multiplicative inverse. A **field** is a commutative ring with $1 \ne 0$ in which
every nonzero element is a unit. A **zero divisor** is a nonzero $a$ with $ab = 0$
for some nonzero $b$; fields have none, since $ab = 0$ with $a \ne 0$ gives $b =
a^{-1}ab = 0$.

Examples:

- $\mathbb{Z}$ is a commutative ring; its only units are $\pm 1$, so it is not a
  field. $\mathbb{Q}$, $\mathbb{R}$ and $\mathbb{C}$ are fields.
- $\mathbb{Z}/n\mathbb{Z}$ is a commutative ring. It is a field exactly when $n$
  is prime (Chapter 3): if $n = ab$ with $1 < a, b < n$, then $a$ and $b$ are zero
  divisors; if $n$ is prime, every nonzero $a$ is coprime to $n$ and has an
  inverse by Bézout. The field $\mathbb{Z}/p\mathbb{Z}$ is written $\mathbb{F}_p$
  or $\mathrm{GF}(p)$, for Galois field.
- **Polynomials.** If $R$ is a ring, $R[x]$ is the ring of polynomials $a_0 +
  a_1x + \dots + a_nx^n$ with coefficients in $R$, added and multiplied as in
  school.
- **Square matrices** with entries in a ring form a ring that is not commutative.
- **The ring of a lattice scheme.** $\mathbb{Z}_q[x]/(x^{256} + 1)$, polynomials
  of degree below 256 with coefficients mod $q$, multiplied modulo $x^{256} +
  1$, is the ring in which ML-KEM (Kyber) and ML-DSA (Dilithium) compute
  (Chapter 15). It has many zero divisors, and that is fine: lattice schemes need
  a ring, not a field.

<figure class="mars-fig">
<svg viewBox="0 0 640 260" width="640" role="img" aria-label="Nested boxes: groups contain rings, which contain fields, with examples in each layer: permutations and curve points are groups, the integers and polynomial rings are rings, and the fields include F_p, GF(2^8), GF(2^128) and the real numbers" fill="currentColor" font-size="13">
<g stroke="currentColor" stroke-width="1.4" fill="none">
<rect x="20" y="20" width="600" height="220" rx="12"/>
<rect x="60" y="70" width="520" height="160" rx="10"/>
<rect x="110" y="125" width="420" height="95" rx="8" class="acc"/>
</g>
<text x="40" y="45">groups: one operation</text>
<text x="600" y="45" text-anchor="end" font-size="12">permutations Sₙ, curve points, (ℤ/nℤ)*</text>
<text x="80" y="95">commutative rings: + and ×, no division needed</text>
<text x="560" y="115" text-anchor="end" font-size="12">ℤ, ℤ/nℤ, F[x], (ℤ/qℤ)[x]/(x²⁵⁶ + 1)</text>
<text x="130" y="150" class="acc-fill">fields: every nonzero element has an inverse</text>
<text x="320" y="180" text-anchor="middle" font-size="13">ℚ, ℝ, ℂ, Fₚ = ℤ/pℤ</text>
<text x="320" y="204" text-anchor="middle" font-size="13" class="acc-fill">GF(2⁸) in AES, GF(2¹²⁸) in GCM, GF(p) for curves</text>
</svg>
<figcaption>Figure 8.1. Each structure adds rules to the one outside it. Every ring is a group under addition; every field is a ring in which division works. Cryptography uses all three layers.</figcaption>
</figure>

### Characteristic

In a ring, add 1 to itself: $1, 1+1, 1+1+1, \dots$. If this never reaches 0 the
ring has **characteristic** 0. Otherwise the characteristic is the smallest $n$
with $n \cdot 1 = 0$.

**Lemma.** The characteristic of a field is 0 or a prime.

*Proof.* If $n = ab$ with $1 < a, b < n$, then $(a \cdot 1)(b \cdot 1) = n \cdot 1
= 0$, so one of $a \cdot 1$, $b \cdot 1$ is 0 (fields have no zero divisors), which
contradicts the minimality of $n$. $\blacksquare$

In characteristic 2, $1 + 1 = 0$, so $a + a = 0$ for every $a$, and addition is
the same as subtraction. That is the property that makes computer arithmetic in
$\mathrm{GF}(2^n)$ so cheap: adding is exclusive-or, bit by bit, with no carries.

## 8.3 Polynomials: division and Euclid

*Level: beginner.*

Over a field $F$, polynomials behave much like integers. The **degree** of a
nonzero polynomial is the highest power with a nonzero coefficient; that
coefficient is the **leading coefficient**, and the polynomial is **monic** if it
is 1. Over a field, $\deg(fg) = \deg f + \deg g$ (the leading coefficients
multiply to something nonzero).

**Division with remainder.** If $g \ne 0$, then for every $f$ there are unique
$q$ and $r$ with

$$f = qg + r, \qquad r = 0 \text{ or } \deg r < \deg g.$$

The proof is long division: repeatedly subtract a multiple of $g$ that cancels
the leading term of what is left. It needs to divide by the leading coefficient of
$g$, which is why the coefficients must come from a field.

### By hand

Over $\mathbb{F}_5$, divide $f = 2x^4 + 3x^2 + 1$ by $g = x^2 + x + 2$.

1. $2x^4 / x^2 = 2x^2$. Subtract $2x^2 g = 2x^4 + 2x^3 + 4x^2$: what is left is
   $-2x^3 - x^2 + 1 = 3x^3 + 4x^2 + 1$.
2. $3x^3 / x^2 = 3x$. Subtract $3x g = 3x^3 + 3x^2 + 6x = 3x^3 + 3x^2 + x$: left
   is $x^2 - x + 1 = x^2 + 4x + 1$.
3. $x^2 / x^2 = 1$. Subtract $g$: left is $3x - 1 = 3x + 4$, of degree 1 < 2.

So $q = 2x^2 + 3x + 1$ and $r = 3x + 4$.

### Code it

Polynomials are lists of coefficients, lowest degree first.

```python
# Polynomials over F_p as lists of coefficients, lowest degree first.
def trim(f):
    while f and f[-1] == 0:
        f = f[:-1]
    return f

def padd(f, g, p):
    n = max(len(f), len(g))
    return trim([((f[i] if i < len(f) else 0) + (g[i] if i < len(g) else 0)) % p for i in range(n)])

def pmul(f, g, p):
    if not f or not g:
        return []
    out = [0] * (len(f) + len(g) - 1)
    for i, a in enumerate(f):
        for j, b in enumerate(g):
            out[i + j] = (out[i + j] + a * b) % p
    return trim(out)

def pdivmod(f, g, p):
    f, g = trim(f), trim(g)
    q = [0] * max(len(f) - len(g) + 1, 0)
    inv = pow(g[-1], -1, p)
    r = f[:]
    while len(r) >= len(g):
        c = r[-1] * inv % p
        k = len(r) - len(g)
        q[k] = c
        r = trim([(r[i] - c * g[i - k]) % p if i >= k else r[i] for i in range(len(r))])
    return trim(q), r

def show(f):
    terms = []
    for i in range(len(f) - 1, -1, -1):
        c = f[i]
        if c:
            mon = "" if i == 0 else ("x" if i == 1 else "x^%d" % i)
            terms.append((str(c) if (c != 1 or i == 0) else "") + mon)
    return " + ".join(terms) or "0"

f = [1, 0, 3, 0, 2]              # 2x^4 + 3x^2 + 1 over F_5
g = [2, 1, 1]                    # x^2 + x + 2
q, r = pdivmod(f, g, 5)
print(show(q), "|", show(r))
print(padd(pmul(q, g, 5), r, 5) == trim(f))
```

```text
2x^2 + 3x + 1 | 3x + 4
True
```

### Euclid's algorithm

Division gives Euclid's algorithm, exactly as for integers (Chapter 2): $\gcd(f,
g) = \gcd(g, f \bmod g)$, until the remainder is 0. The result is made monic to be
unique. The extended version gives Bézout's identity $uf + vg = \gcd(f, g)$, and
so inverses modulo a polynomial.

```python
def pgcd(f, g, p):
    f, g = trim(f), trim(g)
    while g:
        f, g = g, pdivmod(f, g, p)[1]
    inv = pow(f[-1], -1, p)
    return [c * inv % p for c in f]       # monic

a = pmul([1, 1], [2, 0, 1], 7)           # (x + 1)(x^2 + 2)
b = pmul([1, 1], [3, 1], 7)              # (x + 1)(x + 3)
print(show(a), "|", show(b), "|", show(pgcd(a, b, 7)))
```

```text
x^3 + x^2 + 2x + 2 | x^2 + 4x + 3 | x + 1
```

Two more facts carry over from integers. **The factor theorem:** $f(a) = 0$
exactly when $x - a$ divides $f$ (divide by $x - a$; the remainder is the
constant $f(a)$). So **a nonzero polynomial of degree $n$ over a field has at
most $n$ roots**: each root splits off a factor of degree 1. This innocent fact
is behind the cyclic group theorem of §8.6, the Schwartz-Zippel lemma of
Chapter 11 and Shamir's secret sharing.

The bound needs a field. Over $\mathbb{Z}/8\mathbb{Z}$, the polynomial $x^2 - 1$
of degree 2 has four roots: 1, 3, 5 and 7.

## 8.4 Irreducible polynomials

*Level: beginner.*

A polynomial of degree at least 1 is **irreducible** if it is not the product of
two polynomials of smaller degree. Irreducible polynomials are to polynomials what
primes are to integers: every monic polynomial over a field factors uniquely into
monic irreducibles, by the same proof as for integers (Chapter 2).

Irreducibility depends on the field. $x^2 + 1$ is irreducible over $\mathbb{R}$
but factors as $(x + i)(x - i)$ over $\mathbb{C}$, as $(x + 1)^2$ over
$\mathbb{F}_2$, and as $(x + 2)(x + 3)$ over $\mathbb{F}_5$ (since $2^2 = 4 = -1$).
Over $\mathbb{F}_3$ it is irreducible, since none of 0, 1, 2 squares to $-1 = 2$.

A polynomial of degree 2 or 3 is irreducible exactly when it has no root (a
factorization would include a factor of degree 1). For degree 4 and more, that is
not enough: $(x^2 + x + 1)^2 = x^4 + x^2 + 1$ over $\mathbb{F}_2$ has no root but
is reducible.

### Code it: find them all

For small cases, list every product of smaller monic polynomials and keep what is
left, like the sieve of Eratosthenes:

```python
from itertools import product

def irreducibles(p, n):
    """All monic irreducible polynomials of degree n over F_p, by elimination."""
    monic = lambda d: [list(c) + [1] for c in product(range(p), repeat=d)]
    reducible = set()
    for d in range(1, n // 2 + 1):
        for f in monic(d):
            for g in monic(n - d):
                reducible.add(tuple(pmul(f, g, p)))
    return [f for f in monic(n) if tuple(f) not in reducible]

print([show(f) for f in irreducibles(2, 2)], [show(f) for f in irreducibles(2, 3)])
print([len(irreducibles(2, n)) for n in range(1, 9)])
print([show(f) for f in irreducibles(3, 2)])
```

```text
['x^2 + x + 1'] ['x^3 + x^2 + 1', 'x^3 + x + 1']
[2, 1, 2, 3, 6, 9, 18, 30]
['x^2 + 1', 'x^2 + x + 2', 'x^2 + 2x + 2']
```

Over $\mathbb{F}_2$ there are 30 monic irreducible polynomials of degree 8. AES
uses one of them, $x^8 + x^4 + x^3 + x + 1$.

### Counting them

Gauss found a formula. Let $N_p(n)$ be the number of monic irreducible
polynomials of degree $n$ over $\mathbb{F}_p$. Then

$$\sum_{d \mid n} d \, N_p(d) = p^n, \qquad\text{so}\qquad N_p(n) = \frac{1}{n}
\sum_{d \mid n} \mu(d)\, p^{n/d},$$

where $\mu$ is the Möbius function ($\mu(d) = (-1)^k$ if $d$ is a product of $k$
distinct primes, 0 if $d$ has a square factor). The left identity comes from §8.8:
the polynomial $x^{p^n} - x$ is the product of all monic irreducibles whose degree
divides $n$, and counting degrees on both sides gives it; Möbius inversion turns it
around.

```python
def mobius(n):
    m, d = 1, 2
    while d * d <= n:
        if n % d == 0:
            n //= d
            if n % d == 0:
                return 0
            m = -m
        d += 1
    return -m if n > 1 else m

def count_irreducible(p, n):
    return sum(mobius(d) * p ** (n // d) for d in range(1, n + 1) if n % d == 0) // n

print([count_irreducible(2, n) for n in range(1, 9)], count_irreducible(2, 128))
```

```text
[2, 1, 2, 3, 6, 9, 18, 30] 2658455991569831745663498932484833280
```

The main term is $p^n / n$. So a random monic polynomial of degree $n$ is
irreducible with probability about $1/n$, the polynomial version of the prime
number theorem (about one integer in $\ln x$ near $x$ is prime). There are about
$2^{121}$ irreducible polynomials of degree 128 over $\mathbb{F}_2$; No trinomial of degree
128 is irreducible over $\mathbb{F}_2$, so GCM uses a pentanomial whose middle
terms all have low degree, which makes reduction cheap: $x^{128} + x^7 + x^2 + x
+ 1$.

## 8.5 Building $\mathrm{GF}(p^n)$

*Level: intermediate.*

Integers modulo a prime form a field. Polynomials modulo an irreducible
polynomial do too, by the same argument.

**Construction.** Let $m(x)$ be irreducible of degree $n$ over $\mathbb{F}_p$.
The **quotient ring** $\mathbb{F}_p[x]/(m)$ has as elements the polynomials of
degree less than $n$ (the possible remainders modulo $m$); add them normally, and
multiply them and then take the remainder modulo $m$.

**Theorem.** $\mathbb{F}_p[x]/(m)$ is a field with $p^n$ elements.

*Proof.* There are $p$ choices for each of $n$ coefficients, so $p^n$ elements.
The ring rules hold because they hold for polynomials, and reducing modulo $m$
respects addition and multiplication (as for integers mod $n$). For inverses: if
$a(x) \ne 0$ has degree less than $n$, then $\gcd(a, m) = 1$, since $m$ is
irreducible and $a$ is not a multiple of it. Extended Euclid gives $u a + v m =
1$, so $u a \equiv 1 \pmod m$. $\blacksquare$

The result is written $\mathrm{GF}(p^n)$ or $\mathbb{F}_{p^n}$. The variable $x$
becomes a root of $m$ inside the new field: we have built a field in which the
"impossible" equation $m(x) = 0$ has a solution, as the complex numbers are built
from the reals by adding a root of $x^2 + 1$.

### By hand: $\mathrm{GF}(4)$

Over $\mathbb{F}_2$, $m = x^2 + x + 1$ is irreducible. The field has four
elements $0, 1, x, x + 1$; write $\omega$ for $x$. Since $\omega^2 + \omega + 1 =
0$, we have $\omega^2 = \omega + 1$ (in characteristic 2, minus is plus). Then
$\omega(\omega + 1) = \omega^2 + \omega = 1$, so $\omega$ and $\omega + 1$ are each
other's inverses, and $(\omega + 1)^2 = \omega^2 + 1 = \omega$.

<figure class="mars-fig">
<svg viewBox="0 0 640 230" width="640" role="img" aria-label="Addition and multiplication tables of GF(4) with elements 0, 1, omega and omega plus 1, built from x squared plus x plus 1 over F_2" fill="currentColor" font-size="13">
<text x="160" y="20" text-anchor="middle">+ in GF(4)</text>
<text x="480" y="20" text-anchor="middle">× in GF(4)</text>
<g stroke="currentColor" stroke-width="1" fill="none">
<rect x="40" y="30" width="240" height="185"/><line x1="90" y1="30" x2="90" y2="215"/><line x1="40" y1="67" x2="280" y2="67"/>
<rect x="360" y="30" width="240" height="185"/><line x1="410" y1="30" x2="410" y2="215"/><line x1="360" y1="67" x2="600" y2="67"/>
</g>
<g text-anchor="middle">
<text x="65" y="54">+</text><text x="117" y="54">0</text><text x="165" y="54">1</text><text x="210" y="54">ω</text><text x="255" y="54">ω+1</text>
<text x="65" y="92">0</text><text x="117" y="92">0</text><text x="165" y="92">1</text><text x="210" y="92">ω</text><text x="255" y="92">ω+1</text>
<text x="65" y="129">1</text><text x="117" y="129">1</text><text x="165" y="129" class="acc-fill">0</text><text x="210" y="129">ω+1</text><text x="255" y="129">ω</text>
<text x="65" y="166">ω</text><text x="117" y="166">ω</text><text x="165" y="166">ω+1</text><text x="210" y="166" class="acc-fill">0</text><text x="255" y="166">1</text>
<text x="65" y="203">ω+1</text><text x="117" y="203">ω+1</text><text x="165" y="203">ω</text><text x="210" y="203">1</text><text x="255" y="203" class="acc-fill">0</text>
<text x="385" y="54">×</text><text x="437" y="54">0</text><text x="485" y="54">1</text><text x="530" y="54">ω</text><text x="575" y="54">ω+1</text>
<text x="385" y="92">0</text><text x="437" y="92">0</text><text x="485" y="92">0</text><text x="530" y="92">0</text><text x="575" y="92">0</text>
<text x="385" y="129">1</text><text x="437" y="129">0</text><text x="485" y="129" class="acc-fill">1</text><text x="530" y="129">ω</text><text x="575" y="129">ω+1</text>
<text x="385" y="166">ω</text><text x="437" y="166">0</text><text x="485" y="166">ω</text><text x="530" y="166">ω+1</text><text x="575" y="166" class="acc-fill">1</text>
<text x="385" y="203">ω+1</text><text x="437" y="203">0</text><text x="485" y="203">ω+1</text><text x="530" y="203" class="acc-fill">1</text><text x="575" y="203">ω</text>
</g>
</svg>
<figcaption>Figure 8.2. The field with four elements. Addition is bitwise exclusive-or of the coefficient pairs (every element is its own negative); multiplication uses ω² = ω + 1. Every nonzero element has an inverse (highlighted 1s), unlike in ℤ/4ℤ, where 2 has none.</figcaption>
</figure>

Note that $\mathrm{GF}(4)$ is not $\mathbb{Z}/4\mathbb{Z}$: in $\mathbb{Z}/4
\mathbb{Z}$, $2 \cdot 2 = 0$, so it is not a field. A field of size $p^n$ with $n >
1$ is never the integers modulo $p^n$.

### Every finite field has prime-power size

**Theorem.** A finite field $F$ has $p^n$ elements, where the prime $p$ is its
characteristic.

*Proof.* $F$ is finite, so its characteristic is a prime $p$ (§8.2), and the
multiples of 1 form a copy of $\mathbb{F}_p$ inside $F$. Then $F$ is a vector
space over $\mathbb{F}_p$: elements can be added and multiplied by scalars from
$\mathbb{F}_p$. A finite vector space has a finite basis $b_1, \dots, b_n$, and
every element is uniquely $c_1 b_1 + \dots + c_n b_n$ with $c_i \in \mathbb{F}_p$.
That gives $p^n$ elements. $\blacksquare$

So there is no field with 6, 10 or 12 elements. There is one with $p^n$ elements
for every prime power, and only one up to isomorphism (§8.8): a different
irreducible polynomial of the same degree gives the same field with different
names for its elements. This is why AES could have used any of the 30
irreducible octics and still be "computing in $\mathrm{GF}(2^8)$", though the
S-box bytes would differ.

## 8.6 The multiplicative group is cyclic

*Level: intermediate.*

**Theorem.** In a finite field $F$ with $q$ elements, the nonzero elements form a
cyclic group of order $q - 1$.

*Proof.* The nonzero elements form an abelian group $F^*$ of order $q - 1$, so
by the structure theorem (Chapter 7) it is $\mathbb{Z}/n_1 \times \dots \times
\mathbb{Z}/n_r$ with $n_1 \mid \dots \mid n_r$ and exponent $n_r$. Every element
then satisfies $x^{n_r} = 1$. That polynomial has at most $n_r$ roots in a
field, but all $q - 1$ elements are roots, so $q - 1 \le n_r$. Since $n_r$ divides
$q - 1$, $n_r = q - 1$, the group has an element of order $q - 1$, and it is
cyclic. $\blacksquare$

A generator of $F^*$ is a **primitive element**. When the root $x$ of $m$ is
itself primitive, $m$ is a **primitive polynomial**, and every nonzero element is
a power of $x$, which is convenient for tables of logarithms. This theorem is why
Diffie-Hellman can work in $\mathbb{F}_p^*$ (Chapter 4's primitive roots are its
generators), and why discrete logarithms in $\mathbb{F}_{2^n}^*$ were studied, and
then abandoned for cryptography after the quasi-polynomial algorithms of 2013 and
2014 (*Cryptanalysis*, [chapter 12](../cryptanalysis/12-Discrete-Logarithms.md)).

## 8.7 $\mathrm{GF}(2^8)$: the field inside AES

*Level: intermediate.*

AES (FIPS 197) writes a byte $b_7 b_6 \dots b_0$ as the polynomial
$b_7x^7 + \dots + b_1 x + b_0$ over $\mathbb{F}_2$, and computes modulo

$$m(x) = x^8 + x^4 + x^3 + x + 1 \qquad (\text{hex } \mathtt{11B}).$$

**Addition** of two bytes is exclusive-or. **Multiplication by $x$**, called
**xtime**, shifts left one bit; if a bit falls off the top (the result has an
$x^8$ term), it is replaced by $x^4 + x^3 + x + 1$, that is, exclusive-or with
$\mathtt{1B}$. **General multiplication** is shift and add, like the
square-and-multiply of Chapter 4 with xtime in place of squaring.

<figure class="mars-fig">
<svg viewBox="0 0 640 245" width="640" role="img" aria-label="The byte 0x57 as the polynomial x^6 + x^4 + x^2 + x + 1, its bits shifted left by xtime to 0xAE, and a carried-out top bit folded back as 0x1B" fill="currentColor" font-size="13">
<g stroke="currentColor" stroke-width="1.2" fill="none">
<rect x="120" y="30" width="400" height="40"/>
<line x1="170" y1="30" x2="170" y2="70"/><line x1="220" y1="30" x2="220" y2="70"/><line x1="270" y1="30" x2="270" y2="70"/><line x1="320" y1="30" x2="320" y2="70"/><line x1="370" y1="30" x2="370" y2="70"/><line x1="420" y1="30" x2="420" y2="70"/><line x1="470" y1="30" x2="470" y2="70"/>
<rect x="120" y="140" width="400" height="40"/>
<line x1="170" y1="140" x2="170" y2="180"/><line x1="220" y1="140" x2="220" y2="180"/><line x1="270" y1="140" x2="270" y2="180"/><line x1="320" y1="140" x2="320" y2="180"/><line x1="370" y1="140" x2="370" y2="180"/><line x1="420" y1="140" x2="420" y2="180"/><line x1="470" y1="140" x2="470" y2="180"/>
<path d="M195 72 L145 138"/><path d="M295 72 L245 138"/><path d="M395 72 L345 138"/><path d="M445 72 L395 138"/><path d="M495 72 L445 138"/>
</g>
<g text-anchor="middle">
<text x="145" y="56">0</text><text x="195" y="56">1</text><text x="245" y="56">0</text><text x="295" y="56">1</text><text x="345" y="56">0</text><text x="395" y="56">1</text><text x="445" y="56">1</text><text x="495" y="56">1</text>
<text x="145" y="166">1</text><text x="195" y="166">0</text><text x="245" y="166">1</text><text x="295" y="166">0</text><text x="345" y="166">1</text><text x="395" y="166">1</text><text x="445" y="166">1</text><text x="495" y="166">0</text>
<text x="145" y="22" font-size="11">x⁷</text><text x="495" y="22" font-size="11">1</text>
</g>
<text x="60" y="56" text-anchor="middle">0x57</text>
<text x="60" y="166" text-anchor="middle">0xAE</text>
<text x="590" y="50" text-anchor="middle" font-size="12">x⁶ + x⁴ + x²</text>
<text x="590" y="66" text-anchor="middle" font-size="12">+ x + 1</text>
<text x="590" y="160" text-anchor="middle" font-size="12">x⁷ + x⁵ + x³</text>
<text x="590" y="176" text-anchor="middle" font-size="12">+ x² + x</text>
<text x="320" y="206" text-anchor="middle" class="acc-fill">xtime: shift left; if bit x⁸ appears, XOR with 0x1B</text>
<text x="320" y="232" text-anchor="middle" font-size="12">next: xtime(0xAE) = 0x15C, keep 0x5C, then 0x5C xor 0x1B = 0x47</text>
</svg>
<figcaption>Figure 8.3. A byte is a polynomial. Multiplying by x shifts the bits left; when the x⁸ bit appears, it is replaced using x⁸ = x⁴ + x³ + x + 1, an exclusive-or with 0x1B. These are the steps of FIPS 197's worked example.</figcaption>
</figure>

### Code it

```python
# GF(2^8) as AES uses it: bytes are polynomials, reduced by x^8 + x^4 + x^3 + x + 1.
def xtime(a):
    a <<= 1
    return a ^ 0x11B if a & 0x100 else a

def gmul(a, b):
    r = 0
    while b:
        if b & 1:
            r ^= a
        a, b = xtime(a), b >> 1
    return r

print(hex(gmul(0x57, 0x83)), hex(gmul(0x57, 0x13)))
print([hex(xtime(x)) for x in (0x57, 0xAE, 0x47, 0x8E)])
```

```text
0xc1 0xfe
['0xae', '0x47', '0x8e', '0x7']
```

These are the examples in FIPS 197 itself: $\{57\} \cdot \{83\} = \{c1\}$,
$\{57\} \cdot \{13\} = \{fe\}$, and the xtime chain $\{57\} \to \{ae\} \to \{47\}
\to \{8e\} \to \{07\}$.

### Inverses and the order of elements

The nonzero bytes form a cyclic group of order 255, so $a^{255} = 1$ and $a^{-1} =
a^{254}$ for $a \ne 0$. (Extended Euclid on polynomials is faster, and real
implementations avoid both, as §8.10 explains.)

```python
def gpow(a, e):
    r = 1
    while e:
        if e & 1:
            r = gmul(r, a)
        a, e = gmul(a, a), e >> 1
    return r

def ginv(a):
    return gpow(a, 254) if a else 0           # a^(2^8 - 2) = a^(-1)

def gorder(a):
    k, x = 1, a
    while x != 1:
        x, k = gmul(x, a), k + 1
    return k

print(hex(ginv(0x53)), hex(gmul(0x53, ginv(0x53))))
print(gorder(0x02), gorder(0x03))
```

```text
0xca 0x1
51 255
```

The inverse of $\{53\}$ is $\{ca\}$. And a surprise: $x$ itself, the byte
$\{02\}$, has order 51, not 255. The AES polynomial is irreducible but *not*
primitive. The byte $\{03\} = x + 1$ is a generator, and table-driven
implementations of AES build their logarithm tables on it. Nothing in AES needs
$\{02\}$ to be a generator, since the field is the same whichever irreducible
polynomial names it; Reed-Solomon codes such as those in QR codes use the
primitive $x^8 + x^4 + x^3 + x^2 + 1$ (hex $\mathtt{11D}$) instead.

### The S-box

The AES S-box (SubBytes) maps a byte $a$ to

$$S(a) = A \cdot a^{-1} \oplus \mathtt{63},$$

where $a^{-1}$ is the inverse in $\mathrm{GF}(2^8)$ (with $0^{-1}$ defined as 0),
and $A$ is a fixed linear map on bits: each output bit is the exclusive-or of
five input bits, which can be written $b \oplus (b \lll 1) \oplus (b \lll 2)
\oplus (b \lll 3) \oplus (b \lll 4)$ with left rotations of the byte.

```python
def rotl8(x, k):
    return ((x << k) | (x >> (8 - k))) & 0xFF

def sbox(a):
    b = ginv(a)
    return b ^ rotl8(b, 1) ^ rotl8(b, 2) ^ rotl8(b, 3) ^ rotl8(b, 4) ^ 0x63

S = [sbox(a) for a in range(256)]
print(hex(S[0x00]), hex(S[0x01]), hex(S[0x53]), hex(S[0xFF]))
print(len(set(S)) == 256, all(S[a] != a and S[a] != a ^ 0xFF for a in range(256)))
```

```text
0x63 0x7c 0xed 0x16
True True
```

$S(\{53\}) = \{ed\}$, as in FIPS 197. The S-box is a permutation (all 256
values appear), with no fixed points and no "opposite fixed points" ($S(a) \ne
\bar a$), which is what the constant $\mathtt{63}$ was chosen for. Why inversion?
Because, among all maps on bytes, it is about as far from linear as possible:
Chapter 10 measures that and finds it has the best possible scores. The affine
map $A$ is there to break the clean algebraic description of inversion alone.

!!! note "Life story: the AES field"
    **Born:** 1998, in Joan Daemen and Vincent Rijmen's Rijndael submission;
    the idea of building an S-box from inversion in $\mathrm{GF}(2^n)$ is
    Kaisa Nyberg's (EUROCRYPT 1993) · **Purpose:** an S-box with optimal
    resistance to differential and linear attacks, and a MixColumns matrix
    with maximum diffusion, both described in one small field · **Helped:**
    AES (FIPS 197, 2001), now in every processor as dedicated instructions
    (AES-NI since 2010); the same field appears in SM4 and Camellia's
    S-boxes, built on inversion too · **Status:** unbroken; the algebraic
    attacks it seemed to invite (XSL, 2002) never worked

## 8.8 The Frobenius map and subfields

*Level: intermediate.*

In characteristic $p$, the binomial theorem has a surprise. Every binomial
coefficient $\binom{p}{k}$ with $0 < k < p$ is divisible by $p$, so

$$(a + b)^p = a^p + b^p.$$

This is sometimes called the "freshman's dream", because here it is true. So the
map $\phi(a) = a^p$, the **Frobenius map**, respects both addition and
multiplication. In a finite field it is one-to-one ($a^p = 0$ only for $a = 0$),
hence a bijection: an **automorphism** of the field.

Its fixed points are the roots of $x^p - x$, of which there are at most $p$; the
$p$ elements of $\mathbb{F}_p$ are roots by Fermat. So **$\phi$ fixes exactly the
base field**. More generally, the elements fixed by $\phi^d$ (that is, $a^{p^d} =
a$) form a subfield with $p^d$ elements, when $d$ divides $n$.

**Theorem.** $\mathrm{GF}(p^n)$ contains a subfield with $p^d$ elements exactly
when $d$ divides $n$, and exactly one. Every element of $\mathrm{GF}(p^n)$ is a
root of $x^{p^n} - x$, and that polynomial is the product of all monic irreducible
polynomials over $\mathbb{F}_p$ of degree dividing $n$.

(Sketch: the $p^n$ elements are the $p^n$ roots of $x^{p^n} - x$ by Lagrange in
the multiplicative group. An irreducible $f$ of degree $d$ gives a field
$\mathbb{F}_p[x]/(f)$ with $p^d$ elements, whose $x$ is a root of $x^{p^d} - x$;
so $f$ divides $x^{p^d} - x$, which divides $x^{p^n} - x$ when $d \mid n$. A
subfield of size $p^d$ makes $\mathrm{GF}(p^n)$ a vector space over it, so $p^n
= (p^d)^k$ and $d \mid n$.) The same argument shows that any two fields of size
$p^n$ are isomorphic: both are "the roots of $x^{p^n} - x$".

```python
def frob_fixed():
    return [a for a in range(256) if gmul(a, a) == a]

def is_additive(f):
    return all(f(a ^ b) == f(a) ^ f(b) for a in range(256) for b in range(256))

print(frob_fixed(), is_additive(lambda a: gmul(a, a)), is_additive(lambda a: gmul(gmul(a, a), a)))
print(sorted({gpow(a, 17) for a in range(1, 256)})[:8], len({gpow(a, 17) for a in range(1, 256)}))
```

```text
[0, 1] True False
[1, 12, 13, 80, 81, 92, 93, 176] 15
```

In $\mathrm{GF}(2^8)$, squaring fixes only 0 and 1 (the base field
$\mathbb{F}_2$), and squaring is additive while cubing is not. The 17th powers
$a^{17}$ land in a set of 15 nonzero elements: $\{0\}$ plus those 15 is the
subfield $\mathrm{GF}(16)$, since $255 / 17 = 15$. The subfields of
$\mathrm{GF}(2^8)$ form a chain $\mathrm{GF}(2) \subset \mathrm{GF}(4) \subset
\mathrm{GF}(16) \subset \mathrm{GF}(256)$.

**Why cryptographers care.** Squaring is linear over $\mathbb{F}_2$, so a square
root is also linear and easy: in $\mathrm{GF}(2^n)$, $\sqrt a = a^{2^{n-1}}$. And
a *tower* of subfields gives a fast way to invert: write $\mathrm{GF}(2^8)$ as
$\mathrm{GF}(16)$ extended by a quadratic polynomial, and $\mathrm{GF}(16)$ as
$\mathrm{GF}(4)$ extended again. David Canright's compact AES S-box (2005) for
hardware is built this way, and so are constant-time bitsliced software versions.

### Rabin's irreducibility test

The theorem gives a fast test. A polynomial $m$ of degree $n$ over $\mathbb{F}_p$
is irreducible exactly when

1. $m$ divides $x^{p^n} - x$ (so all its irreducible factors have degree dividing
   $n$), and
2. $\gcd(m, x^{p^{n/r}} - x) = 1$ for every prime $r$ dividing $n$ (so none has
   degree dividing a proper divisor $n/r$).

Michael Rabin gave it in 1980. Powers $x^{p^k} \bmod m$ come from repeated
$p$th powering, so the test takes polynomial time.

```python
# Rabin's irreducibility test over F_2, with polynomials as integers (bit i = coefficient of x^i).
def p2mod(a, m):
    dm = m.bit_length() - 1
    while a.bit_length() - 1 >= dm:
        a ^= m << (a.bit_length() - 1 - dm)
    return a

def p2mulmod(a, b, m):
    r = 0
    while b:
        if b & 1:
            r ^= a
        a, b = p2mod(a << 1, m), b >> 1
    return p2mod(r, m)

def p2gcd(a, b):
    while b:
        a, b = b, p2mod(a, b)
    return a

def x_to_2k(k, m):
    """x^(2^k) mod m, by squaring x k times."""
    r = 2
    for _ in range(k):
        r = p2mulmod(r, r, m)
    return r

def prime_factors(n):
    fs, d = set(), 2
    while d * d <= n:
        while n % d == 0:
            fs.add(d)
            n //= d
        d += 1
    return fs | ({n} if n > 1 else set())

def rabin_irreducible(m):
    n = m.bit_length() - 1
    if x_to_2k(n, m) != 2:                         # m must divide x^(2^n) - x
        return False
    return all(p2gcd(m, x_to_2k(n // r, m) ^ 2) == 1 for r in prime_factors(n))

AES = 0x11B                                          # x^8 + x^4 + x^3 + x + 1
GCM = (1 << 128) | 0x87                              # x^128 + x^7 + x^2 + x + 1
print(rabin_irreducible(AES), rabin_irreducible(0x11D), rabin_irreducible(0x11F))
print(rabin_irreducible(GCM), sum(rabin_irreducible(m) for m in range(256, 512)))
```

```text
True True False
True 30
```

The test confirms the AES and GCM polynomials, rejects $\mathtt{11F}$, and finds
all 30 irreducible octics again. To *find* an irreducible polynomial of a given
degree, try random ones; about one in $n$ succeeds.

## 8.9 $\mathrm{GF}(2^{128})$: the field inside GCM

*Level: intermediate.*

Galois/Counter Mode (David McGrew and John Viega, 2004; NIST SP 800-38D, 2007)
encrypts with AES in counter mode and authenticates with **GHASH**, a polynomial
evaluated in $\mathrm{GF}(2^{128})$ built from

$$x^{128} + x^7 + x^2 + x + 1.$$

The key $H = \mathrm{AES}_K(0^{128})$ is a field element. The ciphertext and
associated data are cut into 128-bit blocks $X_1, \dots, X_m$ (with a final
block giving their lengths), and

$$\mathrm{GHASH}_H(X_1, \dots, X_m) = X_1 H^m + X_2 H^{m-1} + \dots + X_m H,$$

computed by Horner's rule: $Y_0 = 0$, $Y_i = (Y_{i-1} + X_i) \cdot H$. The tag is
GHASH xor $\mathrm{AES}_K(J_0)$, where $J_0$ is derived from the nonce. So the
tag is a polynomial in $H$ whose coefficients are the message: a forger who
changes the message must guess the value of a different polynomial at an unknown
point, and two different polynomials of degree $m$ agree at most at $m$ points
(§8.3). That is the whole security proof of GHASH, in one line: forgery succeeds
with probability about $m / 2^{128}$ per try.

### The bit-reflected convention

GCM writes field elements in an unusual order. The leftmost bit of the 16-byte
block (the most significant bit of byte 0) is the coefficient of $x^0$, and the
rightmost bit is the coefficient of $x^{127}$. So "multiply by $x$" is a *right*
shift of the 128-bit integer, and the reduction constant $x^7 + x^2 + x + 1$,
read in this order, becomes the byte $\mathtt{E1}$ at the left end
($11100001$). The specification's multiplication algorithm, transcribed:

```python
# GHASH multiplication in GF(2^128), exactly as in NIST SP 800-38D (bit-reflected).
R = 0xE1 << 120

def gcm_mul(X, Y):
    Z, V = 0, Y
    for i in range(127, -1, -1):          # bit 0 of the spec is the leftmost bit
        if (X >> i) & 1:
            Z ^= V
        V = (V >> 1) ^ R if V & 1 else V >> 1
    return Z

H = 0x66e94bd4ef8a2c3b884cfa59ca342b2e    # AES_K(0) for the all-zero key
C = 0x0388dace60b6a392f328c2b971b2fe78    # test case 2 ciphertext
L = 128                                   # len(A) = 0, len(C) = 128 bits
X1 = gcm_mul(C, H)
X2 = gcm_mul(X1 ^ L, H)
print(hex(X1))
print(hex(X2))
```

```text
0x5e2ec746917062882c85b0685353deb7
0xf38cbb1ad69223dcc3457ae5b6b0f885
```

Both values match the intermediate results printed in McGrew and Viega's test
case 2 (all-zero key, one zero block of plaintext). Getting the bit order wrong is
the most common bug in a new GHASH implementation; checking against these
vectors catches it.

<figure class="mars-fig">
<svg viewBox="0 0 640 200" width="640" role="img" aria-label="Bit order conventions: in AES a byte's most significant bit is the coefficient of x to the 7, while in GCM the leftmost bit of a 128-bit block is the coefficient of x to the 0, so multiplying by x is a left shift in AES and a right shift in GCM" fill="currentColor" font-size="13">
<text x="20" y="40">AES byte</text>
<g stroke="currentColor" stroke-width="1.2" fill="none">
<rect x="130" y="20" width="320" height="34"/>
<rect x="130" y="120" width="480" height="34"/>
<path d="M300 72 L200 72" class="acc"/><path d="M200 72 L210 66 M200 72 L210 78" class="acc"/>
<path d="M300 172 L420 172" class="acc"/><path d="M420 172 L410 166 M420 172 L410 178" class="acc"/>
</g>
<text x="150" y="42" text-anchor="middle">x⁷</text><text x="190" y="42" text-anchor="middle">x⁶</text><text x="290" y="42" text-anchor="middle">…</text><text x="430" y="42" text-anchor="middle">1</text>
<text x="20" y="140">GCM block</text>
<text x="150" y="142" text-anchor="middle">1</text><text x="190" y="142" text-anchor="middle">x</text><text x="230" y="142" text-anchor="middle">x²</text><text x="370" y="142" text-anchor="middle">…</text><text x="585" y="142" text-anchor="middle">x¹²⁷</text>
<text x="470" y="77" class="acc-fill">× x = shift toward the left</text>
<text x="430" y="196" class="acc-fill">× x = shift toward the right</text>
<text x="320" y="105" text-anchor="middle" font-size="12">AES reduces with 0x1B at the low end; GCM with 0xE1 at the high end</text>
</svg>
<figcaption>Figure 8.4. Two conventions for the same idea. In AES the most significant bit of a byte is the top coefficient; in GCM the first bit of the block is the constant term. The mathematics is identical; the bit order is reversed, and implementations must follow each standard's choice exactly.</figcaption>
</figure>

## 8.10 In the real world

*Level: expert.*

**Constant time.** The textbook way to multiply in $\mathrm{GF}(2^8)$ is a pair
of logarithm and antilogarithm tables, and the fast way to compute GHASH is a
table of multiples of $H$. Both read memory at addresses that depend on secret
data. Daniel Bernstein showed in 2005 that the cache timing of table lookups in
AES software leaks the key over a network, and table-based GHASH leaks $H$ in the
same way. The cures are arithmetic without secret-dependent lookups: bitsliced
AES (Emilia Käsper and Peter Schwabe, 2009) and, above all, hardware. Intel's
AES-NI and the carry-less multiplication instruction PCLMULQDQ (from 2010), and
ARM's equivalents, compute the S-box and $\mathrm{GF}(2^{128})$ products directly
in a few cycles, with no tables. A "carry-less" multiplication is exactly
polynomial multiplication over $\mathbb{F}_2$: the schoolbook product with
exclusive-or instead of addition.

**Other fields in use.** The NIST curves and Curve25519 work in prime fields
$\mathbb{F}_p$ with $p$ of special form ($2^{255} - 19$ makes reduction cheap).
Pairing-based cryptography (Chapter 13) needs extension fields such as
$\mathbb{F}_{p^{12}}$, built as towers. Binary-field elliptic curves over
$\mathrm{GF}(2^{163})$ or $\mathrm{GF}(2^{283})$ were standardized in the 2000s
and have since fallen out of favor. Lattice cryptography (Chapter 15) works in
the ring $\mathbb{Z}_q[x]/(x^{256} + 1)$, which is not a field.

## 8.11 Break it: the forbidden attack on GCM

*Level: expert.*

GCM's security proof assumes each nonce is used once with each key. Antoine Joux
pointed out in 2006, in comments to NIST, what happens otherwise, and called it
the "forbidden attack". With a repeated nonce, the mask $S = \mathrm{AES}_K(J_0)$
is the same for both messages, so it cancels in the exclusive-or of two tags:

$$T_1 \oplus T_2 = \mathrm{GHASH}_H(C_1) \oplus \mathrm{GHASH}_H(C_2),$$

a known polynomial in the unknown $H$. Finding its roots in $\mathrm{GF}(2^{128})$
(with a general root-finding algorithm such as Cantor-Zassenhaus for long messages)
gives a short list of candidates for $H$. With $H$ and one tag, the attacker can
compute $S$ and forge a valid tag for any ciphertext under that nonce.

For one-block messages without associated data the polynomial is so simple that
the root is a division and a square root. The tag of a block $C$ is $T = C H^2
\oplus L H \oplus S$, with $L$ the length block, so

$$T_1 \oplus T_2 = (C_1 \oplus C_2) H^2, \qquad H = \sqrt{(T_1 \oplus T_2)/(C_1
\oplus C_2)},$$

and the square root is the inverse Frobenius map, $\sqrt y = y^{2^{127}}$ (§8.8):

```python
import random
# The "forbidden attack" on GCM with a repeated nonce (one-block messages, no AAD).
rng = random.Random(8)
H, S = rng.getrandbits(128), rng.getrandbits(128)   # secret: H = E_K(0), S = E_K(J0)

def tag(C):
    return gcm_mul(gcm_mul(C, H) ^ L, H) ^ S          # GHASH(C) xor E_K(J0)

def gcm_pow(a, e):
    r = 1 << 127                                      # the field's 1 (bit-reflected)
    while e:
        if e & 1:
            r = gcm_mul(r, a)
        a, e = gcm_mul(a, a), e >> 1
    return r

C1, C2 = rng.getrandbits(128), rng.getrandbits(128)
T1, T2 = tag(C1), tag(C2)
# T1 ^ T2 = (C1 ^ C2) * H^2, so H^2 = (T1 ^ T2) / (C1 ^ C2) and H = sqrt(H^2)
inv = gcm_pow(C1 ^ C2, 2**128 - 2)
H2 = gcm_mul(T1 ^ T2, inv)
H_found = gcm_pow(H2, 2**127)                         # square root: the inverse Frobenius
S_found = T1 ^ gcm_mul(gcm_mul(C1, H_found) ^ L, H_found)
C3 = rng.getrandbits(128)
print(H_found == H, S_found == S)
print(gcm_mul(gcm_mul(C3, H_found) ^ L, H_found) ^ S_found == tag(C3))
```

```text
True True
True
```

Note the field's "1" is `1 << 127` in the bit-reflected convention. Two messages
with the same nonce give away the authentication key, and the attacker can then
sign anything under that nonce. And because counter mode with a repeated nonce
reuses the keystream, $C_1 \oplus C_2 = P_1 \oplus P_2$: confidentiality is lost
too.

**In the wild.** In 2016 Hanno Böck, Aaron Zauner, Sean Devlin, Juraj Somorovsky
and Philipp Jovanovic scanned HTTPS servers and found 184 that repeated GCM
nonces, among them sites of the credit card company VISA, and about 70,000 more
that chose random 64-bit nonces, where repeats become likely after billions of
messages ("Nonce-Disrespecting Adversaries", USENIX WOOT 2016). They demonstrated
the forgery against real servers.

**Fix it.** Use a counter for the nonce, never random 64-bit values; TLS 1.3
builds each nonce from the record sequence number. Where nonces cannot be
guaranteed unique, use a nonce-misuse-resistant mode such as AES-GCM-SIV (RFC
8452, 2019), whose tag also depends on the whole message through a field
polynomial (POLYVAL, GHASH with the bit order reversed back).

## Check yourself

??? question "1. Is $\mathbb{Z}/9\mathbb{Z}$ a field? Is $\mathrm{GF}(9)$? What is the difference?"

    $\mathbb{Z}/9\mathbb{Z}$ is not a field: $3 \cdot 3 = 0$. $\mathrm{GF}(9)$ is
    a field, built as $\mathbb{F}_3[x]/(x^2 + 1)$, with elements $a + bi$ for
    $a, b \in \mathbb{F}_3$ and $i^2 = -1$. Both have nine elements; only the
    second has inverses.

??? question "2. Divide $x^3 + x + 1$ by $x + 1$ over $\mathbb{F}_2$."

    $x^3 + x + 1 = (x^2 + x)(x + 1) + 1$: quotient $x^2 + x$, remainder 1. So $x
    + 1$ is not a factor, consistent with $1^3 + 1 + 1 = 1 \ne 0$.

??? question "3. Is $x^4 + x + 1$ irreducible over $\mathbb{F}_2$?"

    It has no roots ($0 \mapsto 1$, $1 \mapsto 1$), and the only irreducible
    quadratic is $x^2 + x + 1$, whose square is $x^4 + x^2 + 1 \ne x^4 + x + 1$.
    So it has no factor of degree 1 or 2 and is irreducible. (It is also
    primitive.)

??? question "4. How many monic irreducible polynomials of degree 5 are there over $\mathbb{F}_2$? Over $\mathbb{F}_3$?"

    5 is prime, so $N_p(5) = (p^5 - p)/5$: $(32 - 2)/5 = 6$ and $(243 - 3)/5 =
    48$.

??? question "5. In $\mathrm{GF}(2^8)$ with the AES polynomial, compute $\{02\} \cdot \{87\}$."

    $\{87\} = 10000111$. Shift left: $1\,00001110$; the top bit is set, so
    exclusive-or with $\mathtt{1B}$: $\mathtt{0E} \oplus \mathtt{1B} =
    \mathtt{15}$. So $\{02\} \cdot \{87\} = \{15\}$.

??? question "6. Why is there no field with 6 elements?"

    A finite field has prime characteristic $p$ and is a vector space over
    $\mathbb{F}_p$, so its size is a power of $p$. 6 is not a prime power.

??? question "7. In $\mathrm{GF}(2^8)$, what are the possible orders of nonzero elements?"

    The divisors of 255 = 3 · 5 · 17: 1, 3, 5, 15, 17, 51, 85, 255.

??? question "8. Which subfields does $\mathrm{GF}(2^{128})$ have?"

    One of size $2^d$ for each $d$ dividing 128: $d = 1, 2, 4, 8, 16, 32, 64,
    128$. In particular $\mathrm{GF}(2^8)$ sits inside it.

??? question "9. In GCM, why does a repeated nonce reveal $H$ but a fresh nonce does not?"

    The tag is GHASH plus the mask $\mathrm{AES}_K(J_0)$. With a fresh nonce each
    tag has a new, unknown mask, which hides GHASH completely. With a repeated
    nonce the same mask appears twice and cancels, leaving a known polynomial in
    $H$ whose roots can be found.

??? question "10. Show that squaring is additive in characteristic 2."

    $(a + b)^2 = a^2 + 2ab + b^2 = a^2 + b^2$ because $2ab = ab + ab = 0$.

## What you learned

- Rings have $+$ and $\times$; fields also have division. $\mathbb{Z}/n\mathbb{Z}$
  is a field exactly when $n$ is prime. The characteristic of a field is 0 or
  prime.
- Polynomials over a field have division with remainder, Euclid's algorithm,
  unique factorization into irreducibles, and at most $\deg f$ roots.
- About one monic polynomial in $n$ of degree $n$ is irreducible (Gauss's count);
  Rabin's test checks irreducibility quickly.
- $\mathbb{F}_p[x]/(m)$, with $m$ irreducible of degree $n$, is the field
  $\mathrm{GF}(p^n)$. Every finite field has prime-power size, there is one of
  each such size, and its nonzero elements form a cyclic group.
- AES computes in $\mathrm{GF}(2^8)$ modulo $x^8 + x^4 + x^3 + x + 1$; its S-box is
  inversion followed by an affine map.
- The Frobenius map $a \mapsto a^p$ is a field automorphism; subfields of
  $\mathrm{GF}(p^n)$ correspond to divisors of $n$; square roots in
  $\mathrm{GF}(2^n)$ are free.
- GCM's GHASH evaluates a polynomial at the secret $H$ in $\mathrm{GF}(2^{128})$,
  in a bit-reflected convention. A repeated nonce reveals $H$ (the forbidden
  attack).

**Next:** [Chapter 9](09-Linear-Algebra.md), linear algebra over these fields:
solving systems, breaking linear ciphers, and the matrices inside AES.

## Further reading

- Rudolf Lidl and Harald Niederreiter, *Introduction to Finite Fields and Their
  Applications*, revised edition (Cambridge, 1994): the standard reference.
- Gary Mullen and Daniel Panario, eds., *Handbook of Finite Fields* (CRC Press,
  2013).
- Joan Daemen and Vincent Rijmen, *The Design of Rijndael*, 2nd edition
  (Springer, 2020), chapters 2 and 3.
- FIPS 197, *Advanced Encryption Standard* (NIST, 2001; updated 2023), section 4.
- Kaisa Nyberg, "Differentially Uniform Mappings for Cryptography", EUROCRYPT 1993.
- David McGrew and John Viega, "The Galois/Counter Mode of Operation (GCM)"
  (2004), with its test vectors; NIST SP 800-38D (2007).
- Michael Rabin, "Probabilistic Algorithms in Finite Fields", *SIAM Journal on
  Computing* 9 (1980).
- David Canright, "A Very Compact S-box for AES", CHES 2005.
- Antoine Joux, "Authentication Failures in NIST version of GCM", comments to
  NIST (2006).
- Hanno Böck, Aaron Zauner, Sean Devlin, Juraj Somorovsky and Philipp Jovanovic,
  "Nonce-Disrespecting Adversaries: Practical Forgery Attacks on GCM in TLS",
  USENIX WOOT 2016.
- RFC 8452, AES-GCM-SIV: Nonce Misuse-Resistant Authenticated Encryption (2019).
- In *The cryptography book*: [Chapter 7](../../book/07-AES.md) and
  [Chapter 8](../../book/08-Modes-of-Operation.md).
