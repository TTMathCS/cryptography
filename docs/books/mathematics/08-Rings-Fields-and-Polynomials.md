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
    - irreducible polynomials, how to find and count them, and the tests of
      Rabin and Ben-Or;
    - how to build $\mathrm{GF}(p^n)$ from an irreducible polynomial, and why
      every finite field has prime-power size;
    - why the nonzero elements of a finite field form a cyclic group;
    - $\mathrm{GF}(2^8)$ as AES uses it: xtime, multiplication, inverses and
      the S-box;
    - the Frobenius map and subfields;
    - towers of fields, norms and fast inversion, as in pairing libraries and
      compact AES hardware;
    - Eisenstein's criterion, and why $x^n + 1$ is irreducible over the
      rationals exactly when $n$ is a power of 2, yet factors modulo every prime;
    - reduction polynomials: why trinomials and pentanomials, Swan's theorem,
      and the NIST binary fields;
    - fast and constant-time multiplication in $\mathrm{GF}(2^{128})$:
      Karatsuba, carry-less instructions and GCM's one-bit shift;
    - $\mathrm{GF}(2^{128})$ as GCM uses it, with its bit-reflected
      convention, and the forbidden attack on nonce reuse.

    **You need:** [Chapter 3](03-Modular-Arithmetic.md) (arithmetic mod $n$
    and Euclid's algorithm) and [Chapter 7](07-Groups.md) (groups, orders,
    Lagrange's theorem).

    **Levels:** §8.1 to §8.4 are for beginners, §8.5 to §8.13 are
    intermediate, §8.14 to §8.16 are expert.

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
$2^{121}$ irreducible polynomials of degree 128 over $\mathbb{F}_2$. No trinomial of degree
128 is irreducible over $\mathbb{F}_2$, so GCM uses a pentanomial whose middle
terms all have low degree, which makes reduction cheap: $x^{128} + x^7 + x^2 + x
+ 1$ (§8.12 explains the choice).

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
implementations avoid both, as §8.13 and §8.14 explain.)

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

### Ben-Or's test, and Gauss's count checked

Rabin's test always does $n$ squarings, though most polynomials have a small
factor. Michael Ben-Or (1981) looks for that small factor first. For $i = 1, 2, \dots, \lfloor n/2 \rfloor$, compute

$$g_i = \gcd\left(m,\; x^{p^i} - x\right).$$

By the theorem above, $x^{p^i} - x$ is the product of every monic irreducible of
degree dividing $i$, so $g_i \ne 1$ exactly when $m$ has an irreducible factor of
degree dividing $i$. If $g_1 = \dots = g_{i-1} = 1$ and $g_i \ne 1$, the smallest
factor of $m$ has degree exactly $i$. If every $g_i$ up to $n/2$ is 1, then $m$
has no factor of degree at most $n/2$, and a reducible polynomial of degree $n$
always has one, so $m$ is irreducible.

**By hand.** Take $m = x^4 + x^2 + 1$ over $\mathbb{F}_2$, the square of $x^2 + x
+ 1$ (§8.4). First $x^2 - x = x^2 + x = x(x + 1)$, and $m$ has no root, so $g_1 = 1$.
Next $x^4 \equiv x^2 + 1$, so $x^4 - x \equiv x^2 + x + 1$, and $g_2 = x^2 + x +
1$: the test stops at $i = 2$ and names the factor's degree. For $x^4 + x + 1$ the
second step gives $x^4 + x \equiv 1$, so both gcds are 1 and it is irreducible.

The code reuses the listing above, counts irreducibles by brute force, and
compares with Gauss's formula in its first form, $\sum_{d \mid n} d\,N(d) = 2^n$,
solved for $N(n)$ one degree at a time:

```python
# Uses p2mulmod, p2gcd and rabin_irreducible from the listing above.
from collections import Counter

def ben_or(m):
    """0 if m is irreducible over F_2, else the degree of its smallest irreducible factor."""
    n, x = m.bit_length() - 1, 2                    # x stands for x^(2^i) mod m, from i = 0
    for i in range(1, n // 2 + 1):
        x = p2mulmod(x, x, m)
        if p2gcd(m, x ^ 2) != 1:                    # gcd(m, x^(2^i) - x)
            return i
    return 0

def gauss_count(n):
    """N(n) from the identity: the sum of d * N(d) over d dividing n is 2^n."""
    return (2 ** n - sum(d * gauss_count(d) for d in range(1, n) if n % d == 0)) // n

found = [sum(ben_or(m) == 0 for m in range(2 ** n, 2 ** (n + 1))) for n in range(1, 15)]
print(found)
print(found == [gauss_count(n) for n in range(1, 15)])
print(all((ben_or(m) == 0) == rabin_irreducible(m) for m in range(4, 2 ** 13)))
print(sorted(Counter(ben_or(m) for m in range(2 ** 12, 2 ** 13)).items()))
```

It prints:

```text
[2, 1, 2, 3, 6, 9, 18, 30, 56, 99, 186, 335, 630, 1161]
True
True
[(0, 335), (1, 3072), (2, 256), (3, 180), (4, 100), (5, 108), (6, 45)]
```

Ben-Or and Rabin give the same verdict on every polynomial of degree 2 to 12, and
the counts for degrees 1 to 14 match Gauss. For degree 13, a prime, the formula is
just $(2^{13} - 2)/13 = 630$: the roots of $x^{2^{13}} - x$ other than 0 and 1 fall
into groups of 13 conjugates, one group per irreducible polynomial. The last line shows why Ben-Or wins in practice. Of the 4,096
polynomials of degree 12, 3,072 (three quarters, those with 0 or 1 as a root) are
rejected after a single squaring, 256 after two, and only the 335 irreducible ones
need all six rounds. Rabin's test spends twelve squarings on every one of them.

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

## 8.10 Towers of fields

*Level: intermediate.*

Pairing-based signatures (Chapter 13) need arithmetic in $\mathbb{F}_{p^{12}}$,
where $p$ is a prime of 381 bits. §8.5 says: compute modulo an irreducible
polynomial of degree 12. Real libraries instead build $\mathbb{F}_{p^{12}}$ in
three short steps, each by a polynomial with two terms: a **tower of fields**.

### Extending an extension

Nothing in §8.5 needed the base field to be $\mathbb{F}_p$. If $K$ is any finite
field with $q$ elements and $f$ is irreducible of degree $k$ over $K$, then
$K[y]/(f)$ is a field with $q^k$ elements, by the same proof. By §8.8 the result
is the same field however it was built; only the names of the elements differ.

Degrees multiply up a tower. If $L \supset K \supset F$, a basis of $L$ over $K$
times a basis of $K$ over $F$ is a basis of $L$ over $F$ (the **tower law**), so
$[L : F] = [L : K]\,[K : F]$: here $2 \cdot 3 \cdot 2 = 12$.

### By hand: $\mathbb{F}_{49}$ over $\mathbb{F}_7$

Since $7 \equiv
3 \pmod 4$, $-1$ is not a square mod 7 (the squares are 1, 2 and 4; Chapter 5), so
$i^2 + 1$ is irreducible and $\mathbb{F}_{49} = \mathbb{F}_7[i]/(i^2 + 1)$. Its
elements are $a + bi$ with $a, b \in \mathbb{F}_7$, multiplied as complex numbers.

**Frobenius is conjugation.** By the freshman's dream (§8.8), $(a + bi)^7 = a^7 +
b^7 i^7 = a + b\,i^7$, and $i^7 = i^4 \cdot i^3 = -i$. So $(a + bi)^7 = a - bi$. For
example $(2 + 3i)^7 = 2 - 3i = 2 + 4i$, and the elements fixed by Frobenius are those with $b = 0$: the
base field, as §8.8 promised.

**Inversion through the norm.** The **norm** of $u = a + bi$ is $N(u) = u \cdot
\bar u = a^2 + b^2$. It is fixed by Frobenius (it equals $u \cdot u^7 = u^8$, and
$u^{8 \cdot 7} = u^{56} = u^{8}$ since $u^{48} = 1$), so it lies in $\mathbb{F}_7$.
Then

$$u^{-1} = \frac{\bar u}{N(u)},$$

one inversion in the small field and two multiplications. For $u = 2 + 3i$: $N(u)
= 4 + 9 = 13 \equiv 6$, and $6^{-1} = 6$ (since $36 = 35 + 1$), so $u^{-1} = 6(2 -
3i) = 12 - 18i \equiv 5 + 3i$. Check: $(2 + 3i)(5 + 3i) = 10 + 6i + 15i + 9i^2 =
1 + 21i \equiv 1$.

```python
# F_49 = F_7[i]/(i^2 + 1): pairs (a, b) stand for a + b i, with i^2 = -1.
p = 7

def f2mul(u, v):
    return ((u[0] * v[0] - u[1] * v[1]) % p, (u[0] * v[1] + u[1] * v[0]) % p)

def f2pow(u, e):
    r = (1, 0)
    while e:
        if e & 1:
            r = f2mul(r, u)
        u, e = f2mul(u, u), e >> 1
    return r

def conj(u):
    return (u[0], -u[1] % p)

def f2inv(u):
    n = (u[0] * u[0] + u[1] * u[1]) % p            # the norm u * conj(u), an element of F_7
    t = pow(n, -1, p)                               # one inversion in the base field
    return (u[0] * t % p, -u[1] * t % p)

F49 = [(a, b) for a in range(p) for b in range(p)]
print(all(f2pow(u, p) == conj(u) for u in F49))                 # Frobenius = conjugation
print([u for u in F49 if f2pow(u, p) == u] == [(a, 0) for a in range(p)])
print(f2inv((2, 3)), f2mul((2, 3), f2inv((2, 3))))
```

It prints:

```text
True
True
(5, 3) (1, 0)
```

Frobenius is conjugation on all 49 elements, it fixes exactly the seven elements of
$\mathbb{F}_7$, and the norm formula inverts $2 + 3i$ to $5 + 3i$.

### The Galois group and the general norm

In $\mathrm{GF}(p^n)$ the powers of Frobenius $\phi, \phi^2, \dots, \phi^n =
\mathrm{id}$ are $n$ different automorphisms, and they are all the automorphisms
that fix $\mathbb{F}_p$: they form the **Galois group**, cyclic of order $n$ and
generated by $\phi$. The product of the **conjugates** $u, u^p, \dots,
u^{p^{n-1}}$ is the norm and their sum the **trace**; both are fixed by $\phi$, so
both lie in $\mathbb{F}_p$.

The inversion trick generalizes:

$$u^{-1} = \frac{u^{p} \cdot u^{p^2} \cdots u^{p^{n-1}}}{N(u)}.$$

In a tower, Frobenius is cheap: a sign change in $\mathbb{F}_{p^2}$, and higher up
a multiplication of each coordinate by a precomputed constant. Toshiya Itoh and Shigeo Tsujii (1988)
used this for $\mathrm{GF}(2^m)$, and pairing libraries use it to invert in
$\mathbb{F}_{p^{12}}$ with one inversion in $\mathbb{F}_p$.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Two towers of fields: GF(2) to GF(256) in three quadratic steps, and F_p to F_p^12 in steps of 2, 3 and 2 as in BLS12-381" fill="currentColor" font-size="13">
<text x="160" y="20" text-anchor="middle">binary tower (compact AES S-box)</text>
<text x="480" y="20" text-anchor="middle">pairing tower (BLS12-381)</text>
<g stroke="currentColor" stroke-width="1.3" fill="none">
<rect x="70" y="35" width="180" height="36" rx="6" class="acc"/>
<rect x="70" y="105" width="180" height="36" rx="6"/>
<rect x="70" y="175" width="180" height="36" rx="6"/>
<rect x="70" y="245" width="180" height="36" rx="6"/>
<rect x="390" y="35" width="180" height="36" rx="6" class="acc"/>
<rect x="390" y="105" width="180" height="36" rx="6"/>
<rect x="390" y="175" width="180" height="36" rx="6"/>
<rect x="390" y="245" width="180" height="36" rx="6"/>
<path d="M160 243 L160 213 M160 173 L160 143 M160 103 L160 73"/>
<path d="M480 243 L480 213 M480 173 L480 143 M480 103 L480 73"/>
</g>
<g text-anchor="middle">
<text x="160" y="58" class="acc-fill">GF(256) = GF(2⁸)</text>
<text x="160" y="128">GF(16)</text>
<text x="160" y="198">GF(4)</text>
<text x="160" y="268">GF(2)</text>
<text x="480" y="58" class="acc-fill">F_p¹²</text>
<text x="480" y="128">F_p⁶</text>
<text x="480" y="198">F_p²</text>
<text x="480" y="268">F_p, p of 381 bits</text>
</g>
<g font-size="12">
<text x="168" y="233">× 2: ω² = ω + 1</text>
<text x="168" y="163">× 2: y² = y + ω</text>
<text x="168" y="93">× 2: z² = z + λ</text>
<text x="488" y="233">× 2: u² = −1</text>
<text x="488" y="163">× 3: v³ = u + 1</text>
<text x="488" y="93">× 2: w² = v</text>
</g>
</svg>
<figcaption>Figure 8.5. Two towers. Each floor is the one below extended by a short irreducible polynomial, and the degrees multiply. On the left, GF(256) as a quadratic over GF(16), over GF(4), over GF(2), with λ some element of GF(16) that makes the top quadratic irreducible: the shape of compact hardware S-boxes. On the right, the tower that BLS12-381 libraries use for pairings.</figcaption>
</figure>

### The two towers in use

**AES in hardware.** §8.8 found that the 17th powers in $\mathrm{GF}(256)$ form
the subfield $\mathrm{GF}(16)$. That is the norm: $u^{17} = u \cdot u^{16}$ is $u$
times its conjugate over $\mathrm{GF}(16)$. So an inverse in $\mathrm{GF}(256)$
costs one in $\mathrm{GF}(16)$, which costs one in $\mathrm{GF}(4)$, where $u^{-1}
= u^2$. Bytes move into the tower basis and back by $8 \times 8$ bit matrices,
merged with the S-box's affine map. Akashi Satoh and colleagues (2001) and David
Canright (2005) built small hardware S-boxes this way.

**Pairings.** The BLS12-381 curve, used in Ethereum's proof-of-stake signatures and
in Zcash, builds
$\mathbb{F}_{p^2} = \mathbb{F}_p[u]/(u^2 + 1)$ (fine because $p \equiv 3 \pmod
4$), then $\mathbb{F}_{p^6} = \mathbb{F}_{p^2}[v]/(v^3 - (u + 1))$, then
$\mathbb{F}_{p^{12}} = \mathbb{F}_{p^6}[w]/(w^2 - v)$. The element $u + 1$ is
chosen to be neither a square nor a cube in $\mathbb{F}_{p^2}$, which makes the
cubic and the top quadratic irreducible (BN254 uses $9 + u$). Multiplying in $\mathbb{F}_{p^2}$
takes three multiplications in $\mathbb{F}_p$ instead of four, by the Karatsuba
trick of §8.13, and the savings compound up the tower.

## 8.11 Over the rationals: Eisenstein and $x^n + 1$

*Level: intermediate.*

ML-KEM and ML-DSA compute in $\mathbb{Z}_q[x]/(x^{256} + 1)$, and Falcon in
$\mathbb{Z}_q[x]/(x^{512} + 1)$ or $(x^{1024} + 1)$. The degree is always a power
of 2. Part of the reason is the fast transform of Chapter 15, but there is a
reason underneath it: for $n$ a power of 2, $x^n + 1$ is irreducible over the
rationals, so $\mathbb{Q}[x]/(x^n + 1)$ is a field (a *number field*), and the
security proofs of Ring-LWE and Module-LWE are statements about lattices in that
field (*The cryptography book*, [chapter 21](../../book/21-Lattice-Cryptography.md),
shows the schemes themselves). For other $n$ the polynomial falls apart. Chapter 15 identifies $x^n +
1$ as a cyclotomic polynomial and cites Dedekind's theorem that those are
irreducible; this section gives a direct proof that uses only the arithmetic of this chapter, and then shows the same
polynomial breaking up modulo every prime.

### Gauss's lemma and Eisenstein's criterion

Over $\mathbb{Q}$ there is no finite list of polynomials to test, so irreducibility
needs a different kind of argument. Two classical facts supply it.

**Gauss's lemma.** If a monic polynomial with integer coefficients factors over
$\mathbb{Q}$, it factors into monic polynomials with integer coefficients. (The key
step is that $\mathbb{F}_\ell[x]$ has no zero divisors, §8.3.)

**Eisenstein's criterion** (Theodor Schönemann 1846, Gotthold Eisenstein 1850).
Let $f = x^n + a_{n-1}x^{n-1} + \dots + a_0$ have integer coefficients, and let
$\ell$ be a prime that divides every $a_i$ but whose square does not divide $a_0$.
Then $f$ is irreducible over $\mathbb{Q}$.

*Proof.* Suppose $f = gh$ with $g, h$ monic integer polynomials of positive degree
(Gauss's lemma). Reduce everything modulo $\ell$: since $\ell$ divides all the
lower coefficients, $\bar f = x^n$ in $\mathbb{F}_\ell[x]$. Factorization in
$\mathbb{F}_\ell[x]$ is unique (§8.4), and $x$ is irreducible, so $\bar g = x^r$
and $\bar h = x^s$ with $r, s \ge 1$ (reducing a monic polynomial keeps its degree).
So the constant terms of $g$ and $h$ are both multiples of $\ell$, and their
product $a_0$ is a multiple of $\ell^2$, a contradiction. $\blacksquare$

### $x^n + 1$ for $n$ a power of 2

**Theorem.** If $n = 2^k$, then $x^n + 1$ is irreducible over $\mathbb{Q}$.

*Proof.* A polynomial $f(x)$ factors exactly when $f(x + 1)$ does (substitute back
$x - 1$), so it is enough to show that $(x + 1)^n + 1$ is irreducible. Modulo 2,
the freshman's dream (§8.8) applied $k$ times gives $(x + 1)^{2^k} \equiv x^{2^k} +
1$, so every binomial coefficient $\binom{n}{j}$ with $0 < j < n$ is even. The
constant term is $1 + 1 = 2$, divisible by 2 but not by 4. Eisenstein at $\ell = 2$
applies. $\blacksquare$

**By hand,** $n = 4$: $(x + 1)^4 + 1 = x^4 + 4x^3 + 6x^2 + 4x + 2$. The lower
coefficients 4, 6, 4, 2 are even and 2 is not a multiple of 4, so $x^4 + 1$ is
irreducible over $\mathbb{Q}$.

**Every other $n$ fails.** Write $n = 2^a m$ with $m$ odd and $m > 1$, and put $y =
x^{2^a}$. Since $m$ is odd, $y = -1$ is a root of $y^m + 1$, so

$$x^n + 1 = y^m + 1 = (y + 1)(y^{m-1} - y^{m-2} + \dots - y + 1).$$

For example $x^3 + 1 = (x + 1)(x^2 - x + 1)$ and $x^{768} + 1 = (x^{256} + 1)(x^{512} - x^{256} + 1)$, the obstacle to a
"degree 768" ring that *Post-quantum cryptography*,
[chapter 7](../post-quantum/07-Rings-Modules-and-the-NTT.md), describes; ML-KEM gets its in-between sizes from modules of $k = 2, 3, 4$
degree-256 rings instead.

### The same polynomial modulo primes

Irreducible over $\mathbb{Q}$ does not mean irreducible modulo $q$. In fact:

**Theorem.** $x^4 + 1$ is reducible modulo every prime.

*First proof, by structure.* Modulo 2 it is $(x + 1)^4$. For odd $p$, its roots are
the elements of order 8 (they satisfy $x^4 = -1$, so $x^8 = 1$ but $x^4 \ne 1$).
Since $p^2 - 1 = (p - 1)(p + 1)$ is a product of two consecutive even numbers, 8
divides it, and the cyclic group $\mathbb{F}_{p^2}^*$ (§8.6) has elements of order 8.
So all four roots lie in $\mathbb{F}_{p^2}$, and every irreducible factor has degree
at most 2.

*Second proof, by hand.* Among $-1$, $2$ and $-2$, at least one is a square mod
$p$, because the product of two non-squares is a square (Chapter 5). Then

$$x^4 + 1 = (x^2 + c)(x^2 - c) \text{ if } c^2 = -1, \quad (x^2 + sx + 1)(x^2 - sx
+ 1) \text{ if } s^2 = 2, \quad (x^2 + tx - 1)(x^2 - tx - 1) \text{ if } t^2 = -2.$$

Modulo 3, $-2 \equiv 1 = 1^2$, so $x^4 + 1 = (x^2 + x + 2)(x^2 + 2x + 2)$; expand it
to check: $x^4 + 3x^3 + 6x^2 + 6x + 4 \equiv x^4 + 1$.

```python
# x^n + 1 over the rationals (Eisenstein at 2) and modulo primes (x^4 + 1 always factors).
from math import comb

def eisenstein_at_2(n):
    """Does (x + 1)^n + 1 satisfy Eisenstein's criterion at the prime 2?"""
    c = [comb(n, j) for j in range(n + 1)]      # coefficients, constant term first
    c[0] += 1
    return all(v % 2 == 0 for v in c[:-1]) and c[0] % 4 != 0

print([n for n in range(1, 100) if eisenstein_at_2(n)])

def mul_quadratics(f, g, q):                    # (x^2 + f1 x + f0)(x^2 + g1 x + g0) mod q
    (f0, f1), (g0, g1) = f, g
    return [f0 * g0 % q, (f0 * g1 + f1 * g0) % q, (f0 + g0 + f1 * g1) % q, (f1 + g1) % q, 1]

def split_x4_plus_1(q):
    """x^4 + 1 = (x^2 + s x + t)(x^2 - s x + t) or (x^2 + c)(x^2 - c), from a square root mod q."""
    for a, shape in ((q - 1, "-1"), (2, "2"), (q - 2, "-2")):
        s = next((y for y in range(q) if y * y % q == a), None)
        if s is not None:
            f, g = {"-1": ((s, 0), (q - s, 0)), "2": ((1, s), (1, q - s)),
                    "-2": ((q - 1, s), (q - 1, q - s))}[shape]
            return shape, f, g, mul_quadratics(f, g, q) == [1, 0, 0, 0, 1]

primes = [q for q in range(3, 1000) if all(q % d for d in range(2, int(q ** 0.5) + 1))]
print(all(split_x4_plus_1(q)[3] for q in primes), len(primes))
def show2(f):
    mid = "" if f[1] == 0 else " + x" if f[1] == 1 else " + %dx" % f[1]
    return "x^2" + mid + (" + %d" % f[0] if f[0] else "")

for q in (3, 5, 7, 17):
    a, f, g, ok = split_x4_plus_1(q)
    print(q, "square root of", a, ":", "(%s)(%s)" % (show2(f), show2(g)))
```

It prints:

```text
[1, 2, 4, 8, 16, 32, 64]
True 167
3 square root of -2 : (x^2 + x + 2)(x^2 + 2x + 2)
5 square root of -1 : (x^2 + 2)(x^2 + 3)
7 square root of 2 : (x^2 + 3x + 1)(x^2 + 4x + 1)
17 square root of -1 : (x^2 + 4)(x^2 + 13)
```

Eisenstein at 2 works for $(x + 1)^n + 1$ exactly when $n$ is a power of 2 (for any
other $n$ some binomial coefficient is odd, by Lucas's theorem), and the explicit
splitting works for all 167 odd primes below 1,000.

In general, for $n$ a power of 2 and $q$ an odd prime, every irreducible factor of
$x^n + 1$ modulo $q$ has degree equal to the order of $q$ modulo $2n$, which is at
most $n/2$ because $(\mathbb{Z}/2n\mathbb{Z})^*$ is not cyclic for $2n \ge 8$
(Chapter 4). For the lattice standards:
$3329 \equiv 257 \pmod{512}$ and $257^2 \equiv 1$, so modulo ML-KEM's $q$ the
polynomial $x^{256} + 1$ splits into 128 quadratics; $8380417 \equiv 1 \pmod{512}$,
so modulo ML-DSA's $q$ it splits into 256 linear factors. Those splittings are the
number-theoretic transform, which [Chapter 15](15-Learning-with-Errors.md) builds
and *Post-quantum cryptography*,
[chapter 7](../post-quantum/07-Rings-Modules-and-the-NTT.md), runs at full size. Lattice cryptography uses both facts at once: a field over
$\mathbb{Q}$, a product of small fields modulo $q$.

## 8.12 Reduction polynomials: trinomials and pentanomials

*Level: intermediate.*

Any of the $2^{121}$ or so irreducible polynomials of degree 128 builds
$\mathrm{GF}(2^{128})$ (§8.4, §8.8), but they are not equally fast. Every
multiplication ends by cutting a product of degree up to $2n - 2$ back below $n$,
and the cost of that depends on the shape of the modulus.

### Reduction by folding

Write the modulus as $m = x^n + r(x)$, with $r$ of degree $d < n$. Modulo $m$,
$x^n \equiv r$. Split a product $c$ into its high and low halves, $c = h \cdot x^n +
l$ with $\deg l < n$; then

$$c \equiv h \cdot r + l \pmod m.$$

That is one **fold**. The high half is multiplied by $r$, not by anything large, and
if $r$ has $t$ terms, $h \cdot r$ is just $t$ shifted copies of $h$, exclusive-ored
together. One fold lowers the degree from $\deg c$ to at most $\deg c - (n - d)$, so
starting from degree $2n - 2$ it takes

$$\left\lceil \frac{n - 1}{n - d} \right\rceil$$

folds to finish. When $d$ is below about $n/2$ that is two: one big fold and one
small one for the few bits that spill over. Figure 8.6 shows it for GCM's
polynomial, where $r = x^7 + x^2 + x + 1$: four shifted copies of the high half,
then a second fold of at most six bits.

So the modulus should have **few terms** (each term of $r$ is one more shift and
exclusive-or per fold, or one more row of gates in hardware) and **low middle
terms**, so that two folds suffice.

<figure class="mars-fig">
<svg viewBox="0 0 640 280" width="640" role="img" aria-label="Folding reduction: the high half h of a 255-bit product is added to the low half four times, shifted by 0, 1, 2 and 7 bits, and a few overflow bits fold once more" fill="currentColor" font-size="13">
<g stroke="currentColor" stroke-width="1.3" fill="none">
<rect x="60" y="30" width="270" height="30"/>
<rect x="330" y="30" width="280" height="30" class="acc"/>
<rect x="330" y="95" width="280" height="24" class="acc"/>
<rect x="332" y="125" width="278" height="24"/>
<rect x="326" y="155" width="278" height="24"/>
<rect x="320" y="185" width="278" height="24"/>
<rect x="298" y="215" width="278" height="24"/>
<path d="M60 248 L610 248" stroke-dasharray="4 3"/>
<path d="M330 22 L330 270" stroke-dasharray="2 3"/>
</g>
<rect x="298" y="215" width="32" height="24" fill-opacity=".25"/>
<rect x="320" y="185" width="10" height="24" fill-opacity=".25"/>
<g text-anchor="middle">
<text x="195" y="50">h: bits 128 to 254</text>
<text x="470" y="50" class="acc-fill">l: bits 0 to 127</text>
<text x="470" y="112">l</text>
<text x="470" y="142">h · 1</text>
<text x="465" y="172">h · x</text>
<text x="459" y="202">h · x²</text>
<text x="437" y="232">h · x⁷</text>
<text x="470" y="268" class="acc-fill">sum = c mod m, after one more small fold</text>
</g>
<g font-size="12">
<text x="20" y="85">x¹²⁸ ≡ x⁷ + x² + x + 1, so h·x¹²⁸ ≡ h·(x⁷ + x² + x + 1):</text>
<text x="60" y="232" text-anchor="start">overflow, up to 6 bits:</text>
<text x="60" y="246" text-anchor="start" fill-opacity=".7">fold it again</text>
</g>
</svg>
<figcaption>Figure 8.6. Reducing a product modulo x¹²⁸ + x⁷ + x² + x + 1. The high half is added back four times, shifted by 0, 1, 2 and 7 places, one copy per term of x⁷ + x² + x + 1. Only the shaded bits that spill past position 127 need a second, tiny fold. Shifts are drawn larger than scale.</figcaption>
</figure>

### By hand: AES's product $\{57\} \cdot \{83\}$

FIPS 197's example multiplies $\{57\} = x^6 + x^4 + x^2 + x + 1$ by $\{83\} = x^7 +
x + 1$. The carry-less product is

$$c = x^{13} + x^{11} + x^9 + x^8 + x^6 + x^5 + x^4 + x^3 + 1 = \mathtt{2B79}.$$

With $m = x^8 + x^4 + x^3 + x + 1$, $r = x^4 + x^3 + x + 1 = \mathtt{1B}$.

1. Split: $h = x^5 + x^3 + x + 1$ ($\mathtt{2B}$), $l = x^6 + x^5 + x^4 + x^3 + 1$
   ($\mathtt{79}$).
2. First fold: $h \cdot r = (x^5 + x^3 + x + 1)(x^4 + x^3 + x + 1)$. The four
   shifted copies are $x^9 + x^8 + x^6 + x^5$, $x^7 + x^6 + x^4 + x^3$, $x^5 + x^4 +
   x^2 + x$ and $x^4 + x^3 + x + 1$; pairs cancel, leaving $x^9 + x^8 + x^7 + x^4 +
   x^2 + 1$ ($\mathtt{395}$). It still reaches $x^9$.
3. Second fold: its high part is $x + 1$, and $(x + 1) \cdot r = x^5 + x^3 + x^2 + 1$
   ($\mathtt{2D}$). Its low part is $x^7 + x^4 + x^2 + 1$ ($\mathtt{95}$).
4. Add up the low pieces: $\mathtt{79} \oplus \mathtt{95} \oplus \mathtt{2D} =
   \mathtt{C1}$, that is $x^7 + x^6 + 1$.

Two folds, and the answer $\{c1\}$ agrees with §8.7's shift-and-add.

### Why not a trinomial, and why five terms

The cheapest possible modulus would be a **trinomial** $x^n + x^k + 1$: two copies
per fold. A polynomial with an even number of terms is useless, since it vanishes
at $x = 1$ and so has the factor $x + 1$. So after three terms the next choice is
five, a **pentanomial**.

For degree 128 there is no choice. Richard Swan proved in 1962 that over
$\mathbb{F}_2$ a trinomial $x^n + x^k + 1$ with $n$ a multiple of 8 has an even
number of irreducible factors, so it is never irreducible. (The proof uses Stickelberger's theorem on
discriminants.) Degrees 8 and 128 both fall
under it, which is why AES and GCM both use pentanomials. Among pentanomials,
$x^{128} + x^7 + x^2 + x + 1$ is the one whose middle terms are lowest: no
irreducible pentanomial of degree 128 has all its middle exponents below 7, and
with top middle exponent 7 this is the only one. AES's $x^8 + x^4 + x^3 + x + 1$
is likewise the first irreducible octic pentanomial in that order.

Binary elliptic curves needed fields of other sizes. FIPS 186-2 (2000) fixed five,
with a trinomial wherever one exists and otherwise a pentanomial with low middle
terms:

| Degree | Reduction polynomial | Terms |
| --- | --- | --- |
| 163 | $x^{163} + x^7 + x^6 + x^3 + 1$ | 5 |
| 233 | $x^{233} + x^{74} + 1$ | 3 |
| 283 | $x^{283} + x^{12} + x^7 + x^5 + 1$ | 5 |
| 409 | $x^{409} + x^{87} + 1$ | 3 |
| 571 | $x^{571} + x^{10} + x^5 + x^2 + 1$ | 5 |

The degrees are all prime, so these fields have no subfields except
$\mathrm{GF}(2)$ (§8.8). That later mattered: Weil descent attacks (Gaudry,
Hess and Smart, 2002) weaken some curves when $n$ is composite. NIST's curve guidance SP 800-186 (2023)
still lists the binary curves from degree 233 up but marks them deprecated, and
new systems use prime-field curves.

### Code it

The listing checks the claims of this section: the hand example, the table
(irreducible, two folds each), Swan's theorem up to degree 64, and high middle
terms. The irreducibility test is Ben-Or's (§8.8).

```python
# Polynomials over F_2 as integers (bit i = coefficient of x^i); m = x^n + r with r of low degree.
import random

def clmul(a, b):
    """Carry-less product: polynomial multiplication over F_2, shift and exclusive-or."""
    out = 0
    while b:
        if b & 1:
            out ^= a
        a, b = a << 1, b >> 1
    return out

def fold_reduce(c, n, r):
    """Reduce c modulo x^n + r by replacing x^n with r. Returns (remainder, number of folds)."""
    folds = 0
    while c >> n:
        c = (c & ((1 << n) - 1)) ^ clmul(c >> n, r)
        folds += 1
    return c, folds

def gcd2(a, b):
    while b:
        while a and a.bit_length() >= b.bit_length():
            a ^= b << (a.bit_length() - b.bit_length())
        a, b = b, a
    return a

def irreducible(n, r):
    """Ben-Or's test for x^n + r, with squaring done by clmul and fold_reduce."""
    m, x = (1 << n) | r, 2
    for _ in range(n // 2):
        x = fold_reduce(clmul(x, x), n, r)[0]
        if gcd2(m, x ^ 2) != 1:
            return False
    return True

def poly(*exps):
    return sum(1 << e for e in exps)

c = clmul(0x57, 0x83)
res, folds = fold_reduce(c, 8, 0x1B)
print(hex(c), hex(res), folds)

LOW = {8: poly(4, 3, 1, 0), 128: poly(7, 2, 1, 0), 163: poly(7, 6, 3, 0), 233: poly(74, 0),
       283: poly(12, 7, 5, 0), 409: poly(87, 0), 571: poly(10, 5, 2, 0)}
rng = random.Random(12)
for n, r in LOW.items():
    folds = max(fold_reduce(clmul(rng.getrandbits(n), rng.getrandbits(n)), n, r)[1] for _ in range(100))
    print(n, bin(r).count("1") + 1, irreducible(n, r), folds)

no_tri = [n for n in range(2, 65) if not any(irreducible(n, poly(k, 0)) for k in range(1, n))]
print(no_tri)
print(all(n in no_tri for n in range(8, 65, 8)))
POLYVAL = poly(127, 126, 121, 0)                   # GCM's polynomial read backwards
print(irreducible(128, POLYVAL), fold_reduce(clmul(rng.getrandbits(128), rng.getrandbits(128)), 128, POLYVAL)[1])
```

It prints:

```text
0x2b79 0xc1 2
8 5 True 2
128 5 True 2
163 5 True 2
233 3 True 2
283 5 True 2
409 3 True 2
571 5 True 2
[8, 13, 16, 19, 24, 26, 27, 32, 37, 38, 40, 43, 45, 48, 50, 51, 53, 56, 59, 61, 64]
True
True 126
```

Up to degree 64, the degrees with no irreducible trinomial include every
multiple of 8, as Swan proved. The last line is POLYVAL's polynomial from
AES-GCM-SIV (RFC 8452), $x^{128} + x^{127} + x^{126} + x^{121} + 1$: GCM's with
the exponents reversed (the *reciprocal* polynomial, irreducible whenever the
original is). Its middle terms are as high as possible, and folding from the top
takes 126 steps. So RFC 8452 does not ask for the
plain product: it defines POLYVAL's multiplication as $a \cdot b \cdot x^{-128}$,
a Montgomery-style product (Chapter 3's idea, carried over to $\mathbb{F}_2[x]$)
that is reduced from the low end, where the reciprocal polynomial is cheap again. 

## 8.13 Multiplying in $\mathrm{GF}(2^{128})$ fast and in constant time

*Level: intermediate.*

GHASH does one multiplication in $\mathrm{GF}(2^{128})$ for every 16 bytes it
authenticates (*The cryptography book*,
[chapter 8](../../book/08-Modes-of-Operation.md), shows GCM): about 80 million per second for 10 gigabits per second of
traffic. The SP 800-38D loop of §8.9 takes 128 steps, each with a branch on a
secret bit: too slow and too leaky to ship. Real code uses carry-less products of
64-bit pieces, combined by Karatsuba's trick and reduced by folding (§8.12).

### Schoolbook on 64-bit words

A processor multiplies 64-bit words. Split each 128-bit element into halves,
$a = a_1 X + a_0$ and $b = b_1 X + b_0$ with $X = x^{64}$. Then

$$ab = a_1 b_1 X^2 + (a_1 b_0 + a_0 b_1) X + a_0 b_0,$$

four $64 \times 64$ products: schoolbook multiplication, except that nothing
carries. A **carry-less multiplication** of two words is polynomial multiplication
with coefficients mod 2.

### Karatsuba

In 1960 Anatoly Karatsuba, a student at Moscow State University, found that three products are
enough (published with Yuri Ofman in 1962). Compute

$$\mathrm{hi} = a_1 b_1, \qquad \mathrm{lo} = a_0 b_0, \qquad M = (a_1 + a_0)(b_1 +
b_0),$$

and get the middle term as $M - \mathrm{hi} - \mathrm{lo} = a_1 b_0 + a_0 b_1$.
Over $\mathbb{F}_2$ the trick is even cleaner than for integers: the minus signs
are exclusive-ors, and $a_1 + a_0$ still fits in 64 bits, because adding without
carries never makes a number longer. Applied recursively, Karatsuba multiplies
$n$-bit polynomials in about $n^{\log_2 3} \approx n^{1.585}$ word operations
instead of $n^2$.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Karatsuba: three 64-bit carry-less products hi, lo and M give the 255-bit product, with M xor hi xor lo added in the middle" fill="currentColor" font-size="13">
<g stroke="currentColor" stroke-width="1.3" fill="none">
<rect x="60" y="25" width="120" height="30"/><rect x="180" y="25" width="120" height="30"/>
<rect x="340" y="25" width="120" height="30"/><rect x="460" y="25" width="120" height="30"/>
<rect x="40" y="100" width="170" height="40" rx="6"/>
<rect x="235" y="100" width="170" height="40" rx="6" class="acc"/>
<rect x="430" y="100" width="170" height="40" rx="6"/>
<rect x="80" y="190" width="240" height="26"/>
<rect x="320" y="190" width="240" height="26"/>
<rect x="200" y="222" width="240" height="26" class="acc"/>
<rect x="80" y="262" width="480" height="26"/>
<path d="M120 57 L125 98 M400 57 L135 98"/>
<path d="M520 57 L515 98 M240 57 L505 98"/>
<path d="M240 57 L300 98 M520 57 L340 98" class="acc"/>
<path d="M125 142 L200 188 M515 142 L440 188 M320 142 L320 220" class="acc"/>
</g>
<g text-anchor="middle">
<text x="120" y="45">a₁</text><text x="240" y="45">a₀</text>
<text x="400" y="45">b₁</text><text x="520" y="45">b₀</text>
<text x="125" y="125">hi = a₁·b₁</text>
<text x="320" y="125" class="acc-fill">M = (a₁⊕a₀)(b₁⊕b₀)</text>
<text x="515" y="125">lo = a₀·b₀</text>
<text x="200" y="208">hi (bits 128 to 254)</text>
<text x="440" y="208">lo (bits 0 to 126)</text>
<text x="320" y="240" class="acc-fill">mid = M ⊕ hi ⊕ lo, at bit 64</text>
<text x="320" y="280">a · b, 255 bits, then fold (Figure 8.6)</text>
</g>
<text x="20" y="175" font-size="12" fill-opacity=".7">3 products of 64 × 64 bits instead of 4</text>
</svg>
<figcaption>Figure 8.7. Karatsuba's split for a 128-bit carry-less product. Three word products replace four; the middle term costs only exclusive-ors. In characteristic 2 the sums a₁ ⊕ a₀ and b₁ ⊕ b₀ stay 64 bits wide, so no extra carry bit appears as it does for integers.</figcaption>
</figure>

**By hand, in miniature.** Take 4-bit polynomials split into 2-bit halves: $a =
\mathtt{1011} = x^3 + x + 1$ and $b = \mathtt{1101} = x^3 + x^2 + 1$, with $X =
x^2$. Then $a_1 = \mathtt{10} = x$, $a_0 = \mathtt{11} = x + 1$, $b_1 = \mathtt{11}
= x + 1$, $b_0 = \mathtt{01} = 1$.

1. $\mathrm{hi} = x(x + 1) = x^2 + x = \mathtt{110}$.
2. $\mathrm{lo} = (x + 1) \cdot 1 = \mathtt{011}$.
3. $M = (a_1 + a_0)(b_1 + b_0) = 1 \cdot x = \mathtt{010}$.
4. $\mathrm{mid} = M \oplus \mathrm{hi} \oplus \mathrm{lo} = \mathtt{010} \oplus
   \mathtt{110} \oplus \mathtt{011} = \mathtt{111}$.
5. $ab = \mathrm{hi} \cdot x^4 + \mathrm{mid} \cdot x^2 + \mathrm{lo} =
   \mathtt{1100000} \oplus \mathtt{0011100} \oplus \mathtt{0000011} =
   \mathtt{1111111}$.

Schoolbook agrees: $(x^3 + x + 1)(x^3 + x^2 + 1) = x^6 + x^5 + x^4 + 3x^3 + x^2 + x
+ 1$, and $3 \equiv 1$, so every coefficient is 1.

### The bit order, and the one-bit shift

GCM numbers its bits backwards (§8.9). The simple fix is to reverse both operands,
multiply, and reverse the result. The fast one notices that reversal and
multiplication almost commute. Multiply $a$ and $b$ each read backwards, and you get
$ab$ read backwards over its 255 bits: as a 256-bit number, the reversed product
shifted right by one place. So an implementation can multiply
GCM's blocks exactly as they come, shift the 256-bit result left by one bit, and
then reduce "from the other end". Shay Gueron and Michael Kounavis worked this out
for Intel's instruction (white paper, revision 2.0, 2010), and nearly every fast
GHASH has that one-bit shift in it.

The code wraps the natural-order multiplication in reversals and checks it against
McGrew and Viega's test case 2 (§8.9's values) and the full GHASH of test case 3,
then checks Karatsuba and the one-bit shift on random inputs.

```python
# Uses clmul and fold_reduce from the listing above.
import random
M64 = (1 << 64) - 1

def karatsuba128(a, b):
    """128 x 128-bit carry-less product from three 64 x 64-bit ones."""
    a1, a0, b1, b0 = a >> 64, a & M64, b >> 64, b & M64
    hi, lo = clmul(a1, b1), clmul(a0, b0)
    mid = clmul(a1 ^ a0, b1 ^ b0) ^ hi ^ lo
    return (hi << 128) ^ (mid << 64) ^ lo

def rev(v, bits=128):
    return int(format(v, "0%db" % bits)[::-1], 2)

def gf128_mul(a, b):
    """Natural order (bit i = coefficient of x^i), reduced by x^128 + x^7 + x^2 + x + 1."""
    return fold_reduce(karatsuba128(a, b), 128, 0x87)[0]

def ghash_mul(X, Y):
    """GCM's bit-reflected order: reverse both blocks, multiply, reverse back."""
    return rev(gf128_mul(rev(X), rev(Y)))

def ghash(H, data, len_a, len_c):
    Y = 0
    for i in range(0, len(data), 16):
        Y = ghash_mul(Y ^ int.from_bytes(data[i:i + 16], "big"), H)
    return ghash_mul(Y ^ (len_a << 64 | len_c), H)

# McGrew-Viega test case 2: all-zero key, one zero block of plaintext.
H2, C2 = 0x66e94bd4ef8a2c3b884cfa59ca342b2e, 0x0388dace60b6a392f328c2b971b2fe78
print(hex(ghash_mul(C2, H2)))
print(hex(ghash(H2, C2.to_bytes(16, "big"), 0, 128)))
# Test case 3: key feffe992..., four blocks of ciphertext, no associated data.
H3 = 0xb83b533708bf535d0aa6e52980d53b78
C3 = bytes.fromhex("42831ec2217774244b7221b784d0d49ce3aa212f2c02a4e035c17e2329aca12e"
                   "21d514b25466931c7d8f6a5aac84aa051ba30b396a0aac973d58e091473f5985")
print(hex(ghash(H3, C3, 0, 512)))
rng = random.Random(13)
pairs = [(rng.getrandbits(128), rng.getrandbits(128)) for _ in range(300)]
print(all(karatsuba128(a, b) == clmul(a, b) for a, b in pairs))
# Multiplying the reflected blocks directly gives the reflected product, one bit short.
print(all(clmul(a, b) << 1 == rev(clmul(rev(a), rev(b)), 256) for a, b in pairs))
```

It prints:

```text
0x5e2ec746917062882c85b0685353deb7
0xf38cbb1ad69223dcc3457ae5b6b0f885
0x7f1b32b81b820d02614f8895ac1d4eac
True
True
```

The first two lines repeat §8.9's values from an independent algorithm, and the
third is the GHASH printed in the GCM specification for test case 3.

### In hardware: carry-less multiply instructions

Intel added **PCLMULQDQ** with its Westmere processors in 2010. It computes one carry-less $64 \times 64 \to 128$-bit product;
an immediate operand picks which 64-bit halves to multiply. A GHASH
multiplication becomes three or four PCLMULQDQs plus the fold of §8.12, which can
itself use two more. ARMv8 has
the same operation as PMULL and PMULL2, and the RISC-V bit-manipulation extension
Zbc (ratified 2021) has clmul, clmulh and clmulr, where the last returns the
reversed-order product bits that GCM wants.

Fast code also **aggregates**: four Horner steps expand to $(Y + X_1)H^4 + X_2 H^3
+ X_3 H^2 + X_4 H$, so with $H^2, H^3, H^4$ stored, four products share one
reduction and run in parallel.

### Constant time without the instruction

Code that must run without PCLMULQDQ (small microcontrollers, old processors) should
still never branch on secret bits or index tables by them (§8.14 tells why, and
*The cryptography book*, [chapter 18](../../book/18-Side-Channels.md), shows the
attacks). The
standard trick turns each "if bit is set, add" into arithmetic with a mask: in
two's complement, $-1$ is all ones and $-0$ is all zeros, so `a & -bit` is $a$ or
0 without a branch. Here is the AES field's multiplication written that way, with
a fixed eight rounds:

```python
# Uses clmul and fold_reduce from the listings above.
def xtime_ct(a):
    return ((a << 1) ^ (0x1B & -(a >> 7))) & 0xFF      # -(top bit) is 0 or all ones

def gmul_ct(a, b):
    r = 0
    for i in range(8):                                  # always eight rounds
        r ^= a & -((b >> i) & 1)                        # add a when bit i of b is set
        a = xtime_ct(a)
    return r

print(hex(gmul_ct(0x57, 0x83)), hex(gmul_ct(0x53, 0xCA)))
print(all(gmul_ct(a, b) == fold_reduce(clmul(a, b), 8, 0x1B)[0] for a in range(256) for b in range(256)))
```

It prints:

```text
0xc1 0x1
True
```

It agrees with the fold-based product on all 65,536 pairs. Python makes no timing
promises; the point is the shape, which carries over line for line to C (checking
the compiled result is the subject of *Cryptographic engineering*,
[chapter 5](../engineering/05-Constant-Time-Programming.md)). For GHASH without
PCLMULQDQ, the faster table-free options are bitslicing (Käsper and Schwabe, 2009)
or ordinary integer multiplications with the bits spaced apart so carries cannot
collide, as BearSSL does.

## 8.14 In the real world

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
exclusive-or instead of addition (§8.13 builds GHASH from it).

**Other fields in use.** The NIST curves and Curve25519 work in prime fields
$\mathbb{F}_p$ with $p$ of special form ($2^{255} - 19$ makes reduction cheap).
Pairing-based cryptography (Chapter 13) needs extension fields such as
$\mathbb{F}_{p^{12}}$, built as towers (§8.10). Binary-field elliptic curves over
$\mathrm{GF}(2^{163})$ or $\mathrm{GF}(2^{283})$ were standardized in the 2000s
and have since fallen out of favor. Lattice cryptography (Chapter 15) works in
the ring $\mathbb{Z}_q[x]/(x^{256} + 1)$, which is not a field.

## 8.15 Break it: the forbidden attack on GCM

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
# Uses ghash_mul from §8.13; the bit-serial gcm_mul of §8.9 gives the same products.
import random
gcm_mul, L = ghash_mul, 128     # L is the length block: len(A) = 0, len(C) = 128 bits
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

**On Mars.** Arcadia City's link to Earth has a one-way delay of 3 to 22 minutes,
so agreeing a fresh GCM key takes a round trip of 6 to 44 minutes, and a relay
cannot stop to ask whenever it reboots. Keys live long and nonces come from counters,
so the counter is security-critical: a relay that loses it in a power failure and
restarts from zero repeats nonces, and §8.15's attack applies. The fix: store the
next counter value *before* using it, and skip ahead after any restart. Random 96-bit nonces avoid the stored counter but are
limited: SP 800-38D caps a key used that way at $2^{32}$ messages. Where neither can be
guaranteed, AES-GCM-SIV fails gracefully: a repeated nonce reveals only that the
same message was sent twice.

## 8.16 Going deeper

*Level: expert.*

**Normal bases.** A basis of $\mathrm{GF}(2^n)$ of the form $\beta, \beta^2,
\beta^4, \dots, \beta^{2^{n-1}}$ (the conjugates of one element) is a **normal
basis**. In it, squaring is a cyclic rotation of the coordinates, free in hardware;
James Massey and Jim Omura built a multiplier on it in the 1980s, and ANSI X9.62
and IEEE 1363 allowed binary curves in "Gaussian normal bases".

**Factoring polynomials.** Elwyn Berlekamp (1967) reduced factoring to linear
algebra (the kernel of $\phi - \mathrm{id}$, Chapter 9), and David Cantor and Hans
Zassenhaus (1981) gave the randomized method behind §8.15's root-finding: the gcds
of Ben-Or's test, then random gcds to split equal degrees. Kedlaya and Umans
(2008) brought the cost close to $n^{1.5}$ coefficient operations. Finding an irreducible
polynomial of degree $n$ over $\mathbb{F}_p$ *deterministically* in polynomial time
is still open in general; it is known under the generalized Riemann hypothesis,
and for small $p$ (Victor Shoup, 1990).

**Discrete logarithms in small characteristic.** The cyclic group of §8.6 made
$\mathrm{GF}(2^n)^*$ look like a good home for Diffie-Hellman. Antoine Joux (2013)
and Razvan Barbulescu, Pierrick Gaudry, Joux and Emmanuel Thomé (2014) found
quasi-polynomial discrete logarithm algorithms in small characteristic, built on
this chapter's subfields, Frobenius and $x^{q} - x$. Prime fields and elliptic curves are not affected; see *Cryptanalysis*,
[chapter 12](../cryptanalysis/12-Discrete-Logarithms.md).

**Further.** Lidl and Niederreiter cover the finite fields of this chapter in full;
Lawrence Washington's *Introduction to Cyclotomic Fields* covers the number fields
of §8.11.

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

??? question "6. In $\mathrm{GF}(2^8)$, what are the possible orders of nonzero elements?"

    The divisors of 255 = 3 · 5 · 17: 1, 3, 5, 15, 17, 51, 85, 255.

??? question "7. Which subfields does $\mathrm{GF}(2^{128})$ have?"

    One of size $2^d$ for each $d$ dividing 128: $d = 1, 2, 4, 8, 16, 32, 64,
    128$. In particular $\mathrm{GF}(2^8)$ sits inside it.

??? question "8. In $\mathrm{GF}(2^{233})$ built from $x^{233} + x^{74} + 1$, reduce $x^{300}$. How many folds did it take?"

    $x^{300} = x^{67} \cdot x^{233}$ and $x^{233} \equiv x^{74} + 1$, so $x^{300}
    \equiv x^{67}(x^{74} + 1) = x^{141} + x^{67}$. Its degree is below 233, so
    one fold was enough.

??? question "9. Why is $x^6 + 1$ reducible over $\mathbb{Q}$ while $x^8 + 1$ is not? Does $x^8 + 1$ stay irreducible modulo 17?"

    With $y = x^2$, $x^6 + 1 = y^3 + 1 = (y + 1)(y^2 - y + 1) = (x^2 + 1)(x^4 -
    x^2 + 1)$. For $x^8 + 1$, $(x + 1)^8 + 1 = x^8 + 8x^7 + 28x^6 + 56x^5 +
    70x^4 + 56x^3 + 28x^2 + 8x + 2$: every lower coefficient is even and 2 is not
    a multiple of 4, so Eisenstein at 2 proves it irreducible. Modulo 17 it
    splits completely: $\mathbb{F}_{17}^*$ is cyclic of order 16, so it has
    $\varphi(16) = 8$ elements of order 16, and those are exactly the 8 roots of
    $x^8 + 1$.

??? question "10. In GCM, why does a repeated nonce reveal $H$ but a fresh nonce does not?"

    The tag is GHASH plus the mask $\mathrm{AES}_K(J_0)$. With a fresh nonce each
    tag has a new, unknown mask, which hides GHASH completely. With a repeated
    nonce the same mask appears twice and cancels, leaving a known polynomial in
    $H$ whose roots can be found.

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
- Ben-Or's test finds the smallest factor first; both tests reproduce Gauss's
  count.
- Towers build fields in steps; the norm reduces inversion to the base field
  (BLS12-381's $\mathbb{F}_{p^{12}}$, compact AES S-boxes).
- $x^n + 1$ is irreducible over $\mathbb{Q}$ exactly when $n$ is a power of 2
  (Eisenstein), yet for $n \ge 4$ it factors modulo every prime.
- Good reduction polynomials have few terms and low middle exponents (two
  folds); Swan's theorem rules out trinomials when 8 divides $n$.
- Karatsuba needs three 64-bit carry-less products, PCLMULQDQ (2010) does them in
  hardware, GCM's bit order costs a one-bit shift, and masks replace secret
  branches.
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
- Michael Ben-Or, "Probabilistic Algorithms in Finite Fields", 22nd IEEE
  Symposium on Foundations of Computer Science (FOCS 1981).
- Richard G. Swan, "Factorization of Polynomials over Finite Fields", *Pacific
  Journal of Mathematics* 12 (1962).
- Anatoly Karatsuba and Yuri Ofman, "Multiplication of Multidigit Numbers on
  Automata", *Doklady Akademii Nauk SSSR* 145 (1962).
- Toshiya Itoh and Shigeo Tsujii, "A Fast Algorithm for Computing Multiplicative
  Inverses in GF($2^m$) Using Normal Bases", *Information and Computation* 78
  (1988).
- Akashi Satoh, Sumio Morioka, Kohji Takano and Seiji Munetoh, "A Compact
  Rijndael Hardware Architecture with S-Box Optimization", ASIACRYPT 2001.
- Shay Gueron and Michael Kounavis, "Intel Carry-Less Multiplication Instruction
  and its Usage for Computing the GCM Mode", Intel white paper, revision 2.0
  (2010).
- Emilia Käsper and Peter Schwabe, "Faster and Timing-Attack Resistant AES-GCM",
  CHES 2009.
- FIPS 186-2, *Digital Signature Standard* (NIST, 2000), appendix 6 (the binary
  fields); SP 800-186, *Recommendations for Discrete Logarithm-based
  Cryptography: Elliptic Curve Domain Parameters* (NIST, 2023).
- Pierrick Gaudry, Florian Hess and Nigel Smart, "Constructive and Destructive
  Facets of Weil Descent on Elliptic Curves", *Journal of Cryptology* 15 (2002).
- Elwyn Berlekamp, "Factoring Polynomials over Finite Fields", *Bell System
  Technical Journal* 46 (1967); David Cantor and Hans Zassenhaus, "A New
  Algorithm for Factoring Polynomials over Finite Fields", *Mathematics of
  Computation* 36 (1981).
- Razvan Barbulescu, Pierrick Gaudry, Antoine Joux and Emmanuel Thomé, "A
  Heuristic Quasi-Polynomial Algorithm for Discrete Logarithm in Finite Fields of
  Small Characteristic", EUROCRYPT 2014.
- Lawrence Washington, *Introduction to Cyclotomic Fields*, 2nd edition
  (Springer, 1997).
- In *Post-quantum cryptography*: [chapter 7](../post-quantum/07-Rings-Modules-and-the-NTT.md),
  rings, modules and the NTT.
- In *The cryptography book*: [Chapter 7](../../book/07-AES.md),
  [Chapter 8](../../book/08-Modes-of-Operation.md),
  [Chapter 18](../../book/18-Side-Channels.md) and
  [Chapter 21](../../book/21-Lattice-Cryptography.md).
