# 7. Rings, Modules and the NTT

*Plain LWE needs a large random matrix, and a large matrix makes keys too big for a TLS
handshake. ML-KEM and ML-DSA shrink it by giving the matrix structure: each entry is a
polynomial, and the arithmetic happens in a ring where multiplying two polynomials is fast.
This chapter is short and practical. It shows the ring every NIST lattice scheme uses, how
modules let one ring serve three security levels, and the number-theoretic transform (NTT)
that turns a 65,536-multiplication product into a few thousand. You will multiply in the
ring by hand, build the ML-KEM NTT exactly as FIPS 203 writes it and check it against the
slow way, see why the primes are 3329 and 8,380,417, write the Montgomery and Barrett
reductions that real code uses, and watch an NTT go wrong when a 16-bit register
overflows.*

!!! abstract "In this chapter"
    **You will learn:**

    - why plain LWE keys are too big, and how a polynomial ring shrinks them;
    - how to multiply in $\mathbb{Z}_q[X]/(X^n+1)$, where $X^n = -1$;
    - Ring-LWE and Module-LWE, and why NIST's schemes use modules;
    - the number-theoretic transform, its butterflies, and why ML-KEM's NTT stops one layer
      short;
    - why $q = 3329$ for ML-KEM and $q = 8{,}380{,}417$ for ML-DSA;
    - Montgomery and Barrett reduction, the two tricks inside every fast implementation;
    - how lazy reduction saves time and how it overflows when done carelessly.

    **You need:** [Chapter 5](05-Lattices-and-Their-Hard-Problems.md) (LWE and its forms);
    polynomials and arithmetic modulo $q$. The theory of cyclotomic rings and the proofs
    behind Ring-LWE are in Chapter 15 of the
    mathematics book; this chapter uses the results.

    **Levels:** §7.1 to §7.3 are for beginners, §7.4 to §7.8 are intermediate, §7.9 is
    expert.

## 7.1 The problem

*Level: beginner.*

Take the LWE public key of [Chapter 5](05-Lattices-and-Their-Hard-Problems.md): a matrix
$A$ of size $m \times n$ modulo $q$, and a vector $b = As + e$. FrodoKEM-640, a scheme
built on plain LWE at a level near AES-128, takes $n = 640$ and $q = 2^{15}$. Its matrix
alone is $640 \times 640 \times 15$ bits, 768,000 bytes. FrodoKEM avoids
sending it by sending a 16-byte seed and regenerating $A$ on both sides, and still has public
keys of 9,616 bytes at its first level and spends most of its time regenerating and
multiplying that matrix. For a protocol that runs on every web page, that is too slow and
too big.

The fix is to give the matrix structure. Suppose each row of $A$ is the row above it shifted
one place to the right, with the entry that falls off the end coming back at the front with
its sign flipped. Then one row describes the whole matrix: $n$ numbers instead of $n^2$.
Multiplying such a matrix by a vector is the same as multiplying two polynomials of degree
below $n$ and replacing $X^n$ by $-1$. The key shrinks by a factor of $n$, and, with the
right trick, the multiplication drops from $n^2$ steps to about $n \log n$.

The cost is a new assumption. The rows of $A$ are no longer independent, so an attacker might
use the structure. Fifteen years of study have found no way to do that for the rings and
parameters NIST chose, and §7.9 says what is known. The rest of the chapter is about how
the arithmetic works.

## 7.2 The ring

*Level: beginner.*

The ring is

$$R_q = \mathbb{Z}_q[X] / (X^n + 1),$$

the polynomials with coefficients modulo $q$, where any power $X^n$ or higher is folded back
using $X^n = -1$. Both ML-KEM and ML-DSA take $n = 256$. An element is a list of 256
coefficients. Adding two elements adds coefficient by coefficient. Multiplying is ordinary
polynomial multiplication followed by the fold: the coefficient that would land at
$X^{256+k}$ is subtracted from the one at $X^k$.

<div class="mars-steps" markdown>

**A product by hand.** Take $n = 4$, $q = 17$, and $a = 1 + 2X + 3X^3$.

1. $a \cdot X = X + 2X^2 + 3X^4$.
2. Fold: $3X^4 = 3 \cdot (-1) = -3 \equiv 14$. So $a \cdot X = 14 + X + 2X^2$.
3. Multiplying by $X$ shifts the coefficients up one place, and the top one comes round to
   the bottom with its sign flipped. This is the "negacyclic" shift of §7.1.
4. $X^4 = -1 \equiv 16$: four shifts of the constant 1 bring it back as $-1$.

</div>

**Code it.** The schoolbook product, written directly from the rule.

```python
# Multiply in Z_q[X]/(X^n + 1): the ring of ML-KEM and ML-DSA.
def ring_mul(a, b, q):
    n = len(a)
    c = [0] * n
    for i in range(n):
        for j in range(n):
            k = i + j
            if k < n:
                c[k] = (c[k] + a[i] * b[j]) % q
            else:                       # X^n = -1 wraps with a sign
                c[k - n] = (c[k - n] - a[i] * b[j]) % q
    return c

q = 17
a = [1, 2, 0, 3]          # 1 + 2X + 3X^3
b = [0, 1, 0, 0]          # X
print("a*X     =", ring_mul(a, b, q))
print("a*X^2   =", ring_mul(ring_mul(a, b, q), b, q))
x4 = [0, 0, 0, 0]
xx = b
for _ in range(3):
    xx = ring_mul(xx, b, q)
print("X^4     =", xx)
```

It prints:

```
a*X     = [14, 1, 2, 0]
a*X^2   = [0, 14, 1, 2]
X^4     = [16, 0, 0, 0]
```

Why $X^n + 1$ and not $X^n - 1$? With $X^n - 1$ the polynomial factors as $(X - 1)(\dots)$,
and evaluating at $X = 1$ maps the ring onto plain $\mathbb{Z}_q$, leaking the sum of the
secret's coefficients. That is a real weakness. $X^n + 1$ with $n$ a power of two is the
$2n$-th cyclotomic polynomial: it does not factor over the rationals, and its rings are the
best-studied ones in lattice cryptography. The negacyclic sign is the price of that
irreducibility.

<figure class="mars-fig">
<svg viewBox="0 0 640 230" width="640" role="img" aria-label="A negacyclic matrix: each row is the previous one shifted right, with the wrapped entry negated; one row determines the whole matrix" fill="currentColor" font-size="14">
<text x="20" y="24">Multiplying by a fixed a(X) in Z_q[X]/(X^4+1) is this matrix:</text>
<g font-family="monospace" font-size="16">
<text x="60" y="70">a0</text><text x="120" y="70" class="acc-fill">-a3</text><text x="190" y="70" class="acc-fill">-a2</text><text x="260" y="70" class="acc-fill">-a1</text>
<text x="60" y="110">a1</text><text x="125" y="110">a0</text><text x="190" y="110" class="acc-fill">-a3</text><text x="260" y="110" class="acc-fill">-a2</text>
<text x="60" y="150">a2</text><text x="125" y="150">a1</text><text x="195" y="150">a0</text><text x="260" y="150" class="acc-fill">-a3</text>
<text x="60" y="190">a3</text><text x="125" y="190">a2</text><text x="195" y="190">a1</text><text x="265" y="190">a0</text>
</g>
<path d="M45 48 v152 M45 48 h8 M45 200 h8 M320 48 v152 M320 48 h-8 M320 200 h-8" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="360" y="80">one column = n numbers,</text>
<text x="360" y="102">the rest is shifted copies</text>
<text x="360" y="140" class="acc-fill">accent: wrapped entries,</text>
<text x="360" y="162" class="acc-fill">sign flipped (X^4 = -1)</text>
<text x="360" y="200" fill-opacity=".7">n = 256: 256 numbers, not 65,536</text>
</svg>
<figcaption>Figure 7.1. A ring element acts on vectors as a negacyclic matrix. Storing the first column is enough to rebuild the rest, which is why ring and module schemes have keys hundreds of times smaller than plain LWE.</figcaption>
</figure>

## 7.3 Ring-LWE and Module-LWE

*Level: beginner.*

**Ring-LWE** (Lyubashevsky, Peikert and Regev, 2010) replaces the matrix and vectors of LWE
with single ring elements: pick a uniform $a \in R_q$, a small secret $s$ and a small error $e$
(small coefficients, from the centered binomial distribution of Chapter 5), and publish
$(a, b = a s + e)$. The problem is to find $s$, or to tell $b$ from a uniform ring element.
One sample of Ring-LWE is $n$ samples of LWE whose matrix is the negacyclic matrix of $a$.

Ring-LWE ties the security level to $n$: to go up a level, you change the ring, and every
piece of optimized code changes with it. **Module-LWE** (Langlois and Stehlé, 2015, with
roots in Brakerski, Gentry and Vaikuntanathan, 2012) keeps the ring fixed and uses small
matrices and vectors whose entries are ring elements. The public matrix $\mathbf{A}$ is $k
\times k$ over $R_q$, the secret $\mathbf{s}$ and error $\mathbf{e}$ are vectors of $k$ small
ring elements, and $\mathbf{b} = \mathbf{A}\mathbf{s} + \mathbf{e}$. The underlying LWE
dimension is $kn$.

| Scheme | Ring | Module rank | LWE dimension |
|---|---|---|---|
| ML-KEM-512 | $n = 256$, $q = 3329$ | $k = 2$ | 512 |
| ML-KEM-768 | same | $k = 3$ | 768 |
| ML-KEM-1024 | same | $k = 4$ | 1024 |
| ML-DSA-44 | $n = 256$, $q = 8{,}380{,}417$ | $4 \times 4$ | 1024 secret length |
| ML-DSA-65 | same | $6 \times 5$ | 1280 |
| ML-DSA-87 | same | $8 \times 7$ | 1792 |

*Table 7.1. Module ranks in the NIST lattice standards (FIPS 203 Table 2; FIPS 204 Table 1).
For ML-DSA the matrix is $k \times \ell$ and the "LWE dimension" column gives $\ell n$, the
length of the secret $s_1$.*

One ring, one NTT, one set of carefully checked routines, and the security level is a loop
bound. A chip that runs ML-KEM-512 already has everything needed for ML-KEM-1024. That
flexibility, more than any difference in proven security, is why both NIST lattice standards
are module schemes.

!!! note "Life story: Ring-LWE"
    **Born:** 2010, Vadim Lyubashevsky, Chris Peikert and Oded Regev, "On Ideal Lattices and
    Learning with Errors Over Rings" (EUROCRYPT 2010) · **Purpose:** to make LWE practical by
    using structured matrices, with a quantum reduction from worst-case problems on ideal
    lattices · **Helped:** NewHope, the scheme Google tested in Chrome in 2016, and every
    ring and module scheme since · **Status:** active as a foundation; the standards use its
    module generalization rather than Ring-LWE itself.

## 7.4 Why multiplication is the bottleneck

*Level: intermediate.*

Count the work in ML-KEM-768 key generation: the product $\mathbf{A}\mathbf{s}$ is nine
ring products, and encryption needs nine more for $\mathbf{A}^T\mathbf{r}$ plus three for
$\mathbf{t}^T\mathbf{r}$. Done the schoolbook way, each ring product is $256^2 = 65{,}536$
multiplications, so encryption alone would need over a million. Everything else in the
scheme, the hashing and sampling and compression, is cheaper. Making the product fast is
making the scheme fast.

The tool is the same one that makes signal processing fast: the Fourier transform. A
polynomial can be stored by its coefficients or by its values at chosen points. In the
values form, multiplying two polynomials is multiplying their values point by point, $n$
multiplications instead of $n^2$. The trick is to convert between the forms quickly. The fast
Fourier transform of Cooley and Tukey (1965) does it in $O(n \log n)$ steps using complex roots
of unity. Over $\mathbb{Z}_q$ there are no complex numbers, but there can be roots of unity
modulo $q$, and with them the same algorithm works exactly, with no rounding. That is the
**number-theoretic transform**. John Pollard described it in 1971.

!!! note "Life story: the number-theoretic transform"
    **Born:** 1971, John M. Pollard, "The fast Fourier transform in a finite field",
    *Mathematics of Computation* 25 · **Purpose:** exact fast multiplication of large
    integers and polynomials, with no floating-point error · **Helped:** fast big-number
    arithmetic (Schönhage and Strassen's method, also 1971, is closely related), and from
    the 2010s the speed of every ring- and module-lattice scheme · **Status:** in every
    ML-KEM and ML-DSA implementation; FIPS 203 and FIPS 204 specify it exactly, so all
    implementations agree on the bits.

## 7.5 The NTT, one layer at a time

*Level: intermediate.*

The idea is the Chinese remainder theorem for polynomials. If $X^n + 1 = f_1 f_2$ with $f_1,
f_2$ coprime, then a polynomial modulo $X^n + 1$ is determined by its remainders modulo $f_1$
and modulo $f_2$, and multiplication can be done on the two remainders separately. Keep
splitting, and in the end you multiply many tiny polynomials.

Suppose $\zeta$ is a square root of $-1$ modulo $q$. Then

$$X^{n} + 1 = X^{n} - \zeta^2 = (X^{n/2} - \zeta)(X^{n/2} + \zeta).$$

Write $f = f_{\text{lo}} + X^{n/2} f_{\text{hi}}$. Modulo $X^{n/2} - \zeta$, $X^{n/2}$ becomes
$\zeta$, so the remainder is $f_{\text{lo}} + \zeta f_{\text{hi}}$. Modulo $X^{n/2} + \zeta$ it is
$f_{\text{lo}} - \zeta f_{\text{hi}}$. One multiplication by $\zeta$ per coefficient pair, then an
add and a subtract: that is the **butterfly**,

$$(x, y) \mapsto (x + \zeta y,\; x - \zeta y).$$

Each half is now a ring of the same shape, $X^{n/2} \mp \zeta$, and splits again with a square
root of $\pm\zeta$. After $\log_2 n$ layers of $n/2$ butterflies each, the remainders are
constants, the values of $f$ at the $n$ roots of $X^n + 1$. The full transform needs a
primitive $2n$-th root of unity modulo $q$, which exists exactly when $2n$ divides $q - 1$.

<figure class="mars-fig">
<svg viewBox="0 0 640 260" width="640" role="img" aria-label="The NTT as a tree: X^256+1 splits into two factors of degree 128, then four of degree 64, down to 128 factors of degree 2 for ML-KEM" fill="currentColor" font-size="13">
<rect x="250" y="12" width="140" height="28" rx="4" fill="none" stroke="currentColor"/>
<text x="268" y="31">X^256 + 1</text>
<line x1="320" y1="40" x2="170" y2="72" stroke="currentColor"/><line x1="320" y1="40" x2="470" y2="72" stroke="currentColor"/>
<rect x="100" y="72" width="140" height="28" rx="4" fill="none" stroke="currentColor"/><text x="112" y="91">X^128 − ζ^64</text>
<rect x="400" y="72" width="140" height="28" rx="4" fill="none" stroke="currentColor"/><text x="412" y="91">X^128 + ζ^64</text>
<g stroke="currentColor"><line x1="170" y1="100" x2="95" y2="132"/><line x1="170" y1="100" x2="245" y2="132"/><line x1="470" y1="100" x2="395" y2="132"/><line x1="470" y1="100" x2="545" y2="132"/></g>
<g fill="none" stroke="currentColor"><rect x="45" y="132" width="100" height="26" rx="4"/><rect x="195" y="132" width="100" height="26" rx="4"/><rect x="345" y="132" width="100" height="26" rx="4"/><rect x="495" y="132" width="100" height="26" rx="4"/></g>
<text x="62" y="150">degree 64</text><text x="212" y="150">degree 64</text><text x="362" y="150">degree 64</text><text x="512" y="150">degree 64</text>
<text x="300" y="185" text-anchor="middle">⋮  7 layers in all for ML-KEM, 8 for ML-DSA</text>
<g class="acc" fill="none" stroke-width="1.6"><rect x="20" y="200" width="290" height="30" rx="4"/><rect x="330" y="200" width="290" height="30" rx="4"/></g>
<text x="30" y="220" class="acc-fill">ML-KEM: 128 factors X² − ζ^(2·br(i)+1)</text>
<text x="340" y="220" class="acc-fill">ML-DSA: 256 factors X − ζ^(2·br(i)+1)</text>
<text x="20" y="252" fill-opacity=".7">Each split is one layer of 128 butterflies. A factor of degree 2 cannot split again modulo 3329.</text>
</svg>
<figcaption>Figure 7.2. The NTT splits the ring by the Chinese remainder theorem. ML-DSA's prime allows a complete split into 256 linear factors; ML-KEM's stops at 128 quadratic factors, so its products finish with 128 small degree-1 multiplications (br is the 7-bit bit reversal).</figcaption>
</figure>

**Code it.** This is the ML-KEM NTT exactly as FIPS 203 gives it (Algorithms 9 to 12), with
the precomputed powers $\zeta^{\mathrm{BitRev}_7(i)}$ of $\zeta = 17$. Bit reversal puts the
roots in the order the layers need them. The inverse runs the layers backwards with the
Gentleman-Sande butterfly $(x, y) \mapsto (x + y, \zeta(y - x))$ and divides by 128 at the end
($128^{-1} \equiv 3303 \pmod{3329}$).

```python
# The ML-KEM NTT (FIPS 203 Algorithms 9-12), written plainly.
Q, N = 3329, 256

def bitrev7(i):
    return int(format(i, "07b")[::-1], 2)

ZETAS = [pow(17, bitrev7(i), Q) for i in range(128)]

def ntt(f):
    f = list(f)
    k, length = 1, 128
    while length >= 2:
        for start in range(0, N, 2 * length):
            z = ZETAS[k]; k += 1
            for j in range(start, start + length):
                t = z * f[j + length] % Q
                f[j + length] = (f[j] - t) % Q
                f[j] = (f[j] + t) % Q
        length //= 2
    return f

def ntt_inv(f):
    f = list(f)
    k, length = 127, 2
    while length <= 128:
        for start in range(0, N, 2 * length):
            z = ZETAS[k]; k -= 1
            for j in range(start, start + length):
                t = f[j]
                f[j] = (t + f[j + length]) % Q
                f[j + length] = z * (f[j + length] - t) % Q
        length *= 2
    return [x * 3303 % Q for x in f]          # 3303 = 128^-1 mod 3329

def base_mul(a0, a1, b0, b1, g):
    return (a0 * b0 + a1 * b1 * g) % Q, (a0 * b1 + a1 * b0) % Q

def ntt_mul(fh, gh):
    h = [0] * N
    for i in range(128):
        g = pow(17, 2 * bitrev7(i) + 1, Q)
        h[2*i], h[2*i+1] = base_mul(fh[2*i], fh[2*i+1], gh[2*i], gh[2*i+1], g)
    return h
```

The test multiplies two random ring elements both ways.

```python
# Uses ntt(), ntt_inv() and ntt_mul() from the listing above.
import random
random.seed(7)

def schoolbook(a, b):
    c = [0] * N
    for i in range(N):
        for j in range(N):
            if i + j < N:
                c[i + j] += a[i] * b[j]
            else:
                c[i + j - N] -= a[i] * b[j]
    return [x % Q for x in c]

a = [random.randrange(Q) for _ in range(N)]
b = [random.randrange(Q) for _ in range(N)]
slow = schoolbook(a, b)
fast = ntt_inv(ntt_mul(ntt(a), ntt(b)))
print("round trip ok:", ntt_inv(ntt(a)) == a)
print("same product: ", slow == fast)
print("first coefficients:", fast[:4])
```

It prints:

```
round trip ok: True
same product:  True
first coefficients: [2986, 938, 1846, 2632]
```

The two methods agree on all 256 coefficients. Count the multiplications:

```python
# Count the multiplications each method needs for one product in R_q, n = 256.
n = 256
school = n * n
ntt_one = 7 * (n // 2)               # 7 layers of 128 butterflies, one multiply each
base = 128 * 5                       # 128 degree-1 products, 5 multiplies each
total = 3 * ntt_one + base           # two forward NTTs, one inverse, the base products
print("schoolbook:", school)
print("one NTT:", ntt_one, " product via NTT:", total, " (+256 for the final scaling)")
print("ratio: about", round(school / (total + 256), 1), "times fewer")
# ML-KEM samples A directly in NTT form and keeps s in NTT form, so A*s needs only:
k = 3
print("ML-KEM-768 A*s: NTTs of s:", k, " base products:", k * k, " inverse NTTs:", k)
```

It prints:

```
schoolbook: 65536
one NTT: 896  product via NTT: 3328  (+256 for the final scaling)
ratio: about 18.3 times fewer
ML-KEM-768 A*s: NTTs of s: 3  base products: 9  inverse NTTs: 3
```

The count leaves out additions, which are cheaper, and the real saving is larger still.
ML-KEM never converts the public matrix at all: FIPS 203 samples $\hat{\mathbf{A}}$
directly in NTT form from the seed (SampleNTT), and keeps the secret in NTT form inside the
private key. Only the small vectors are transformed, and only results that leave the
computation are transformed back.

## 7.6 Why 3329 and 8,380,417

*Level: intermediate.*

The prime decides how far the NTT can split. A primitive $m$-th root of unity modulo a prime
$q$ exists exactly when $m$ divides $q - 1$.

```python
# Which roots of unity exist modulo the two NIST lattice primes?
def order(g, q):
    k, x = 1, g
    while x != 1:
        x = x * g % q
        k += 1
    return k

for q in (3329, 8380417):
    f, m = [], q - 1
    p = 2
    while p * p <= m:
        while m % p == 0:
            f.append(p); m //= p
        p += 1
    if m > 1:
        f.append(m)
    print(q, "q-1 =", " * ".join(map(str, f)))
print("order of 17 mod 3329:", order(17, 3329))
print("order of 1753 mod 8380417:", order(1753, 8380417))
print("512 divides 3328?", 3328 % 512 == 0, " 512 divides 8380416?", 8380416 % 512 == 0)
```

It prints:

```
3329 q-1 = 2 * 2 * 2 * 2 * 2 * 2 * 2 * 2 * 13
8380417 q-1 = 2 * 2 * 2 * 2 * 2 * 2 * 2 * 2 * 2 * 2 * 2 * 2 * 2 * 3 * 11 * 31
order of 17 mod 3329: 256
order of 1753 mod 8380417: 512
512 divides 3328? False  512 divides 8380416? True
```

$3328 = 2^8 \cdot 13$. There are 256th roots of unity modulo 3329 (17 is one), but no 512th
roots, so $X^{256} + 1$ splits into 128 quadratics and no further. That is why ML-KEM's NTT
is "incomplete" and finishes with the small degree-1 products of `base_mul`, each needing
its own $\gamma = \zeta^{2\,\mathrm{BitRev}_7(i)+1}$.

Why accept that? Because a smaller $q$ means smaller keys and ciphertexts: every
coefficient of the public key is 12 bits, and 3329 fits in 12 bits ($2^{12} = 4096$). The
search below lists the candidates:

```python
# Primes q with 256 dividing q - 1 (ML-KEM's NTT) and 512 dividing q - 1 (a full NTT).
def is_prime(m):
    if m < 2:
        return False
    d = 2
    while d * d <= m:
        if m % d == 0:
            return False
        d += 1
    return True

print("256 | q-1:", [q for q in range(257, 8000, 256) if is_prime(q)])
print("512 | q-1:", [q for q in range(513, 8000, 512) if is_prime(q)])
q = 2**23 - 2**13 + 1
print("2^23 - 2^13 + 1 =", q, "prime:", is_prime(q))
```

It prints:

```
256 | q-1: [257, 769, 3329, 7681, 7937]
512 | q-1: [7681]
2^23 - 2^13 + 1 = 8380417 prime: True
```

The first version of Kyber, submitted in 2017, used $q = 7681$, the smallest prime that
allows the complete NTT. For the second round (2019) its authors moved to $q = 3329$, the
smallest prime with an incomplete NTT that still leaves room for the noise. 257 and 769
are too small: with errors of the size needed for security, decryption would fail far too
often. The move shrank keys and ciphertexts and cost only the cheap final base
multiplications.

ML-DSA needs a much larger modulus because its signatures must hide the secret behind
masking vectors with coefficients up to about $2^{17}$ to $2^{19}$, and the rejection test of
Chapter 9 needs headroom above that. $q = 8{,}380{,}417 = 2^{23} - 2^{13} + 1$ is a 23-bit prime,
$q - 1$ is divisible by $2^{13}$, and 1753 is a primitive 512th root, so ML-DSA's NTT splits all
the way to 256 linear factors and its products are plain point-by-point multiplications.
The special form $2^{23} - 2^{13} + 1$ also makes reduction cheap on hardware, and every value
fits in a 32-bit word with a 64-bit product.

| | ML-KEM | ML-DSA |
|---|---|---|
| $q$ | 3329 (12 bits) | 8,380,417 (23 bits) |
| $q - 1$ | $2^8 \cdot 13$ | $2^{13} \cdot 3 \cdot 11 \cdot 31$ |
| root of unity | $\zeta = 17$, order 256 | $\zeta = 1753$, order 512 |
| NTT layers | 7 (incomplete) | 8 (complete) |
| product in NTT form | 128 degree-1 products | 256 multiplications |
| word size in fast code | 16-bit lanes | 32-bit lanes |

*Table 7.2. The two NIST lattice moduli and their transforms.*

## 7.7 Reducing without dividing

*Level: intermediate.*

The Python above writes `% Q` after every multiplication. Real code cannot afford that. A
hardware divide is slow on most processors, and on many small ones its running time
depends on the operands, which leaks secrets through timing (Chapter 17). Fast
implementations replace the division with two tricks from the 1980s.

**Montgomery reduction** (Peter Montgomery, 1985) keeps numbers in a scaled form. Pick
$R = 2^{16}$. Given $a$ with $|a| < q \cdot 2^{15}$, compute $t = a \cdot (-q^{-1}) \bmod 2^{16}$ (a
multiplication whose result is simply cut to 16 bits). Then $a + tq$ is divisible by $2^{16}$
by construction, and the shift $(a + tq) \gg 16$ is congruent to $a \cdot 2^{-16}$ modulo $q$,
with absolute value below $q$. Two multiplications, an addition and a shift: no division. The
stray factor $2^{-16}$ is absorbed by storing the twiddle factors $\zeta^i$ multiplied by
$2^{16}$ in advance, so each butterfly multiplication comes out right.

**Barrett reduction** (Paul Barrett, 1986) reduces a value that is already roughly the right
size. Precompute $v = \lfloor 2^{26}/q \rceil = 20{,}159$. Then $\lfloor va / 2^{26} \rceil$ is a very
good estimate of $a/q$, and $a$ minus that many $q$'s is a small representative of $a$. One
multiplication, a shift and a subtraction.

**Code it.** Both, for $q = 3329$, checked against the slow way on the whole range each must
handle (Montgomery on a sample of every 9,973rd input across $\pm q \cdot 2^{15}$; Barrett on
all 65,536 16-bit inputs).

```python
# Montgomery and Barrett reduction for q = 3329, checked on every input they must handle.
Q = 3329
QINV = pow(-Q, -1, 1 << 16)      # -q^-1 mod 2^16

def signed16(x):
    x &= 0xFFFF
    return x - 0x10000 if x >= 0x8000 else x

def montgomery_reduce(a):
    """Return a * 2^-16 mod q, for |a| < q * 2^15, using only shifts and multiplies."""
    t = signed16(a * QINV)       # t = -a * q^-1 mod 2^16
    return (a + t * Q) >> 16     # exactly divisible by 2^16

def barrett_reduce(a):
    """Return the centered representative of a mod q, for 16-bit a."""
    v = ((1 << 26) + Q // 2) // Q   # 20159
    t = (v * a + (1 << 25)) >> 26
    return a - t * Q

R_INV = pow(1 << 16, -1, Q)
bad = 0
for a in range(-Q * (1 << 15) + 1, Q * (1 << 15), 9973):
    r = montgomery_reduce(a)
    if (r - a * R_INV) % Q or not -Q < r < Q:
        bad += 1
print("QINV =", QINV, " Montgomery failures:", bad)
bad = 0
for a in range(-(1 << 15), 1 << 15):
    r = barrett_reduce(a)
    if (r - a) % Q or not -Q // 2 <= r <= Q // 2:
        bad += 1
print("v =", ((1 << 26) + Q // 2) // Q, " Barrett failures over all 65,536 inputs:", bad)
```

It prints:

```
QINV = 3327  Montgomery failures: 0
v = 20159  Barrett failures over all 65,536 inputs: 0
```

The reference implementation of ML-KEM writes the same Montgomery step with the constant
$q^{-1} \bmod 2^{16}$, stored as the signed number $-3327$, and subtracts instead of adding; it
is the same arithmetic with the sign moved. The Barrett result is the centered
representative, between $-1664$ and $1664$, which is what the next layer of butterflies
expects.

!!! note "Life story: Montgomery multiplication"
    **Born:** 1985, Peter L. Montgomery, "Modular Multiplication Without Trial Division",
    *Mathematics of Computation* 44 · **Purpose:** fast modular multiplication with shifts
    in place of division · **Helped:** RSA and elliptic-curve libraries for four decades,
    and now the butterflies of ML-KEM and ML-DSA · **Status:** in nearly every fast
    implementation of public-key cryptography.

## 7.8 Lazy reduction and how it overflows

*Level: intermediate.*

Reducing after every addition is wasteful. In the forward NTT, each layer adds or subtracts
a reduced product $t$ with $0 \le t < q$, so a value grows by less than $q$ per layer. Starting
below $q$, after seven layers it is below $8q = 26{,}632$, which still fits in a signed 16-bit
register (largest 32,767). So the forward transform needs no reductions after its
additions at all. Skipping reductions that cannot be needed is called **lazy reduction**,
and it is one of the main speed-ups in optimized code.

The inverse transform is different. Its butterfly puts $x + y$ in the first slot, so the
first outputs can double in size at every layer. Seven doublings of 3329 is far beyond
16 bits. The code must reduce partway through, and the place it reduces must be worked out
from the worst case, not from tests on random inputs.

**Break it.** The same transforms on simulated 16-bit registers, with the reductions after
additions left out. `wrap16` does what the hardware does on overflow: it silently wraps
round.

```python
# Uses ntt() and ntt_inv() from the listing above.
# Break it: run on 16-bit lanes and leave out the reductions after additions.
import random
random.seed(1)

def wrap16(x):                      # what a 16-bit register really holds
    x &= 0xFFFF
    return x - 0x10000 if x >= 0x8000 else x

def ntt16(f):                       # forward: each layer adds at most q
    f = [wrap16(x) for x in f]
    k, length = 1, 128
    while length >= 2:
        for start in range(0, N, 2 * length):
            z = ZETAS[k]; k += 1
            for j in range(start, start + length):
                t = z * f[j + length] % Q
                f[j + length] = wrap16(f[j] - t)
                f[j] = wrap16(f[j] + t)
        length //= 2
    return [x % Q for x in f], max(abs(x) for x in f)

def ntt_inv16(f, reduce_every):     # inverse: each layer can double the size
    f = [wrap16(x) for x in f]
    k, length, layer, peak = 127, 2, 0, 0
    while length <= 128:
        layer += 1
        for start in range(0, N, 2 * length):
            z = ZETAS[k]; k -= 1
            for j in range(start, start + length):
                t = f[j]
                f[j] = wrap16(t + f[j + length])
                f[j + length] = z * (f[j + length] - t) % Q
        peak = max(peak, max(abs(x) for x in f))
        if layer % reduce_every == 0:
            f = [x % Q for x in f]
        length *= 2
    return [x * 3303 % Q for x in f], peak

a = [random.randrange(Q) for _ in range(N)]
fwd, peak = ntt16(a)
print("forward NTT, no reductions: correct =", fwd == ntt(a), " largest value:", peak)
for every in (1, 3, 4, 7):
    out, peak = ntt_inv16(fwd, every)
    wrong = sum(x != y for x, y in zip(out, a))
    print("inverse, reduce every", every, "layers: largest", peak, "->", wrong, "of 256 wrong")
```

It prints:

```
forward NTT, no reductions: correct = True  largest value: 14099
inverse, reduce every 1 layers: largest 6539 -> 0 of 256 wrong
inverse, reduce every 3 layers: largest 20570 -> 0 of 256 wrong
inverse, reduce every 4 layers: largest 32458 -> 0 of 256 wrong
inverse, reduce every 7 layers: largest 32579 -> 9 of 256 wrong
```

The forward transform is safe, as the bound promised. The inverse survives reductions every
four layers on this input, and fails with nine wrong coefficients when it waits for seven.
The output is not obviously garbage: it is a ring element like any other, and a decryption
built on it simply fails, or a signature fails to verify, perhaps only for rare inputs.
Worse, a mistake that shows only on some inputs is a mistake an attacker can sometimes
trigger on purpose and observe.

**Fix it.** Work out the worst-case bound for every value at every layer, and reduce where
the bound would pass the register size. Careful implementations go further and check the
bounds by machine. The formally verified ML-KEM code in use today, for example the libcrux
implementation and the AWS-LC code built on the mlkem-native project, proves that no
intermediate value can overflow, for every input. Testing with random inputs, as above, can
find a bug but cannot show there is none: this run needed seven skipped layers to fail, and a
real overflow might need a rare input.

## 7.9 Does the structure help an attacker?

*Level: expert.*

A module lattice is a plain lattice with a great deal of symmetry: multiplying by $X$ maps it
to itself. Could an attacker use that symmetry? Three lines of work are worth knowing.

**Evaluation attacks.** If the defining polynomial had a root modulo $q$ at a point where the
error stays small (for $X^n - 1$, the point 1), evaluating there would turn a ring problem
into a tiny one. For $X^n + 1$ the roots modulo $q$ are the $\zeta^{2i+1}$, and evaluating a
small error at such a root gives a uniformly spread value. The attacks of Eisenträger,
Hallgren and Lauter (2014) and Elias and others (2015) work only for special rings, not the
power-of-two cyclotomics used here.

**Ideal-SVP.** In 2014 GCHQ researchers described an approach (the "Soliloquy" note) that
led, through Cramer, Ducas, Peikert and Regev (2016) and Cramer, Ducas and Wesolowski (2017),
to quantum polynomial-time algorithms that find somewhat short vectors in *ideal* lattices,
with approximation factor about $2^{\tilde O(\sqrt n)}$, better than generic algorithms
achieve. That was a real advance and it showed the structure can matter. It does not apply to
Ring-LWE or Module-LWE as used: those problems are not known to reduce to the
Ideal-SVP case the attack handles, and the attack's approximation factor is far too large to
recover a secret. Module-LWE with rank $k \ge 2$ is further still from it, which is one reason
designers preferred modules.

**Concrete attacks.** The best known attacks on ML-KEM and ML-DSA treat them as plain
lattices of dimension $kn$, with the estimator of Chapter 6. Using the ring gives at most
small savings, such as rotating a short vector to get $n$ short vectors for the price of one,
and these are already counted in published estimates. As of November 2026, no published
attack uses the ring structure to break any parameter set in FIPS 203 or FIPS 204 faster
than an attack on an unstructured lattice of the same size.

That is a statement about what is known, not a proof. It is the reason conservative users
keep FrodoKEM (plain LWE) and Classic McEliece (Chapter 13) in view, and the reason NIST
added HQC, which rests on a different problem altogether.

**In the real world.** Arcadia City's habitat controllers are a fair picture of where this
arithmetic ends up. The door locks and air-plant sensors run small 32-bit cores, the kind
that ships today on Earth with no vector unit and a few hundred kilobytes of memory, and each
one opens an ML-KEM session to the city's control net when it wakes. On such a core the 16-bit
butterflies and Montgomery steps are the whole cost: the public benchmark project pqm4, which
times post-quantum code on an Arm Cortex-M4, reports ML-KEM key exchanges in well under a
second's worth of cycles at that clock speed, small enough that a sensor waking once a minute
on battery barely notices. On a laptop the same NTT runs on 16 lanes at once with AVX2, and an
ML-KEM-768 key generation, encapsulation and decapsulation together take tens of
microseconds. The Python in this chapter is thousands of times slower, and that is fine: it
is for understanding and for checking, not for doors.

## 7.10 Going deeper

*Level: expert.*

- **The ring in other bases.** The NTT is the Chinese remainder map for $R_q$; the canonical
  embedding is its complex analogue for the ring over $\mathbb{Q}$, and the right way to
  measure "small" for general cyclotomic rings. For power-of-two rings the coefficient and
  canonical norms agree up to a factor $\sqrt{n}$, which is why the standards can work with
  coefficients. Lyubashevsky, Peikert and Regev's "A Toolkit for Ring-LWE Cryptography"
  (2013) is the reference.
- **Reductions for modules.** Langlois and Stehlé (2015) proved worst-case to average-case
  reductions for Module-LWE over module lattices; Albrecht and Deo (2017) showed
  Module-LWE of rank $k$ over degree-$n$ rings reduces to Ring-LWE over degree-$kn$ rings,
  tying the two together.
- **Other fast multiplications.** When $q$ does not allow an NTT, as in Saber (a NIST
  finalist with $q = 2^{13}$) and NTRU, implementations use Toom-Cook and Karatsuba, or embed
  the product in an NTT over a larger prime. Chung, Hwang, Kannwischer, Seiler, Shih and
  Yang's "NTT Multiplication for NTT-unfriendly Rings" (TCHES 2021) shows the latter often
  wins.
- **Verified arithmetic.** The bounds reasoning of §7.8 is exactly what proof tools check:
  see the HACL* and libcrux work, and the mlkem-native project, which proves the absence of
  overflow and of memory errors in its C code with the CBMC model checker.
- **Precomputed twiddles.** Production code stores $\zeta^i \cdot 2^{16} \bmod q$ tables and, on
  some platforms, a second table of $\zeta^i \cdot q^{-1}$ to save one more multiplication per
  butterfly (Shoup's trick, also known as "Barrett multiplication" in the papers by Becker,
  Hwang, Kannwischer, Yang and Yang, TCHES 2022).

## Check yourself

??? question "1. In Z_17[X]/(X^4 + 1), what is X^5?"

    $X^5 = X \cdot X^4 = X \cdot (-1) = -X$, which is $16X$ modulo 17.

??? question "2. Why does a plain LWE public key at a level near AES-128 take hundreds of kilobytes, and how do module schemes avoid it?"

    The matrix has $n^2$ entries, about 400,000 for $n = 640$, each 15 bits. In a module scheme
    each entry is a ring element that stands for a whole $256 \times 256$ negacyclic block,
    so a $3 \times 3$ matrix of ring elements describes a $768 \times 768$ matrix with 2,304
    numbers instead of 589,824. ML-KEM also sends only a 32-byte seed for it.

??? question "3. Why X^n + 1 and not X^n − 1?"

    $X^n - 1$ has the root 1, and evaluating a small secret or error at 1 just adds its
    coefficients, which stays small and leaks information. $X^n + 1$ for $n$ a power of two
    is irreducible over the rationals, and its roots modulo $q$ give uniformly spread values.

??? question "4. What condition on q lets the full NTT for n = 256 exist, and does 3329 meet it?"

    A primitive 512th root of unity modulo $q$, which exists when 512 divides $q - 1$. $3328 =
    2^8 \cdot 13$, so no: only 256th roots exist, and ML-KEM's NTT stops at quadratic
    factors.

??? question "5. Write the butterfly for one layer of the forward NTT and say how many there are per layer for n = 256."

    $(x, y) \mapsto (x + \zeta y,\, x - \zeta y)$, with $\zeta$ the twiddle factor for that block.
    Each layer has $n/2 = 128$ butterflies.

??? question "6. ML-KEM-768 samples its matrix directly in NTT form. What would it cost if it sampled ordinary coefficients instead?"

    Nine extra forward NTTs (one per matrix entry), about $9 \times 896 = 8{,}064$ more
    multiplications per key generation and per encryption. Sampling in NTT form costs
    nothing extra, since a uniform polynomial is uniform in either form.

??? question "7. In Montgomery reduction with R = 2^16, why is a + tq divisible by 2^16?"

    $t \equiv -a q^{-1} \pmod{2^{16}}$, so $tq \equiv -a$ and $a + tq \equiv 0 \pmod{2^{16}}$.

??? question "8. Why can the forward NTT of ML-KEM skip reductions after additions on 16-bit lanes, while the inverse cannot?"

    Forward: each layer adds a reduced product below $q$, so after seven layers values stay
    below $8q = 26{,}632 < 32{,}768$. Inverse: the sum $x + y$ can double a value each layer, and
    $2^7 \cdot 3329$ is far more than 16 bits, so it must reduce partway.

??? question "9. Name one reason ML-DSA uses a much larger modulus than ML-KEM."

    Its signatures contain masked values with coefficients around $2^{17}$ to $2^{19}$, and the
    rejection-sampling bounds of Chapter 9 need room above that within $q$. (Its prime also
    allows a complete NTT.)

??? question "10. Does the quantum Ideal-SVP algorithm of Cramer, Ducas and Wesolowski break ML-KEM?"

    No. It finds vectors within a large approximation factor in ideal lattices. ML-KEM rests
    on Module-LWE, which is not known to reduce to that case, and the factor is far too large
    to recover a secret. No known attack uses the ring structure to beat generic lattice
    attacks on the FIPS 203 parameters (as of November 2026).

## What you learned

- Plain LWE keys are large because the matrix has $n^2$ entries; a negacyclic matrix is one
  ring element, $n$ numbers.
- $R_q = \mathbb{Z}_q[X]/(X^n+1)$ multiplies polynomials with the fold $X^n = -1$; ML-KEM and
  ML-DSA both use $n = 256$.
- Module-LWE uses small matrices over one fixed ring; the security level is the module rank,
  so one implementation covers every level.
- The NTT is the Chinese remainder theorem done fast: $\log_2 n$ layers of butterflies,
  needing roots of unity modulo $q$.
- $q = 3329$ gives 12-bit coefficients and a seven-layer NTT ending in 128 small products;
  $q = 8{,}380{,}417$ gives ML-DSA room for its masks and a complete NTT.
- Montgomery and Barrett reduction replace division with multiplications and shifts.
- Lazy reduction is safe only where a worst-case bound says so; overflow fails silently.
- No known attack uses the ring structure against the standards' parameters.

**Next:** [Chapter 8](08-ML-KEM.md), where these pieces become ML-KEM.

## Further reading

- Vadim Lyubashevsky, Chris Peikert and Oded Regev, "On Ideal Lattices and Learning with
  Errors Over Rings" (EUROCRYPT 2010), and "A Toolkit for Ring-LWE Cryptography" (EUROCRYPT
  2013).
- Adeline Langlois and Damien Stehlé, "Worst-case to average-case reductions for module
  lattices", *Designs, Codes and Cryptography* 75 (2015).
- John M. Pollard, "The fast Fourier transform in a finite field", *Mathematics of
  Computation* 25 (1971).
- James W. Cooley and John W. Tukey, "An algorithm for the machine calculation of complex
  Fourier series", *Mathematics of Computation* 19 (1965).
- Peter L. Montgomery, "Modular Multiplication Without Trial Division", *Mathematics of
  Computation* 44 (1985).
- Paul Barrett, "Implementing the Rivest Shamir and Adleman Public Key Encryption Algorithm on
  a Standard Digital Signal Processor" (CRYPTO 1986).
- NIST FIPS 203, Section 4.3 (the NTT and its algorithms), and the NTT algorithms of FIPS 204.
- Ronald Cramer, Léo Ducas and Benjamin Wesolowski, "Short Stickelberger Class Relations and
  Application to Ideal-SVP" (EUROCRYPT 2017).
- Martin R. Albrecht and Amit Deo, "Large Modulus Ring-LWE ≥ Module-LWE" (ASIACRYPT 2017).
- The pqm4 project (github.com/mupq/pqm4), benchmarks of post-quantum code on the Arm
  Cortex-M4.
