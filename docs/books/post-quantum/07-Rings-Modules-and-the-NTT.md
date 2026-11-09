# 7. Rings, Modules and the NTT

*Plain LWE needs a large random matrix, and a large matrix makes keys too big for a TLS
handshake. ML-KEM and ML-DSA shrink it by giving the matrix structure: each entry is a
polynomial, and the arithmetic happens in a ring where multiplying two polynomials is fast.
This chapter is the engineer's view; the theory behind it lives in the mathematics book. It
shows the ring every NIST lattice scheme uses, how modules let one ring serve three security
levels, and the number-theoretic transform (NTT) that turns a 65,536-multiplication product
into a few thousand. You will multiply in the ring by hand, trace a small NTT forward and back,
build the ML-KEM and ML-DSA transforms as FIPS 203 and FIPS 204 write them, see why the primes
are 3329 and 8,380,417, work Montgomery and Barrett reduction with the reference code's
constants, bound every intermediate value, watch an NTT overflow a 16-bit register, and see
where the time goes on AVX2 and on a Cortex-M4.*

!!! abstract "In this chapter"
    **You will learn:**

    - why plain LWE keys are too big, and how a polynomial ring shrinks them;
    - how to multiply in $\mathbb{Z}_q[X]/(X^n+1)$, where $X^n = -1$;
    - Ring-LWE and Module-LWE, and why NIST's schemes use modules rather than bigger rings;
    - the NTT's history, from 1970s Fermat number transforms to NewHope in 2016;
    - Cooley-Tukey and Gentleman-Sande butterflies and bit-reversed order, by hand for $n = 8$;
    - why $q = 3329$ for ML-KEM and $q = 8{,}380{,}417$ for ML-DSA, why ML-KEM's NTT stops one
      layer short, and how BaseCaseMultiply finishes the job;
    - Montgomery and Barrett reduction, with the constants of the reference code worked by hand;
    - how lazy reduction saves time, how to bound it layer by layer, and how it overflows when
      done carelessly;
    - how the same arithmetic runs on AVX2 and on a Cortex-M4, and why hashing, not the NTT,
      now dominates the running time.

    **You need:** [Chapter 5](05-Lattices-and-Their-Hard-Problems.md) (LWE and its forms);
    polynomials and arithmetic modulo $q$. The theory is in the mathematics book: rings,
    fields and the cyclic group of units in [Chapter 8](../mathematics/08-Rings-Fields-and-Polynomials.md),
    the FFT and NTT in general in [Chapter 11](../mathematics/11-Polynomials-at-Work.md),
    lattices in [Chapter 14](../mathematics/14-Lattices.md), and cyclotomic rings, the
    negacyclic NTT and the proofs behind Ring-LWE in
    [Chapter 15](../mathematics/15-Learning-with-Errors.md). This chapter uses the results.

    **Levels:** §7.1 to §7.3 are for beginners, §7.4 to §7.10 are intermediate, §7.11 and
    §7.12 are expert.

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
parameters NIST chose, and §7.11 says what is known. The rest of the chapter is about how
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

```text
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

### Why modules and not bigger rings

The other way to raise the level is to keep Ring-LWE and make the ring bigger. NewHope, the
scheme that made ring lattices practical in 2016 (§7.4 tells its story), did exactly that:
$n = 512$ for its lower level, $n = 1024$ for its higher one, both with $q = 12{,}289$. Three
things decided the matter for modules.

The first is the level in between. A power-of-two cyclotomic ring has degree 256, 512, 1024
and nothing between them. NIST's category 3, the level of ML-KEM-768 and of most hybrid TLS
deployments, would need $n = 768$, and $X^{768} + 1$ is not irreducible: it factors as
$(X^{256} + 1)(X^{512} - X^{256} + 1)$, so the ring falls apart into two smaller rings. A good
ring of degree 768 does exist, $\mathbb{Z}_q[X]/(X^{768} - X^{384} + 1)$, and Lyubashevsky and
Seiler built NTTRU on it in 2019, but its NTT has a different shape, a second implementation to
write, test and protect. With modules, category 3 is $k = 3$: the loop runs once more.

The second is one code path: the NTT, the reductions and the bounds of §7.9 are written,
hardened and verified (Chapter 17) once, for $n = 256$. The third is structure: a rank-$k$
module is built from $k$ independent ring elements, and the quantum algorithms for ideal
lattices of §7.11 do not reach it.
No concrete attack is known to exploit the difference, so this is a hedge, not a measured
gain.

The price is paid in the matrix. Counting the multiplications for $\mathbf{b} =
\mathbf{A}\mathbf{s}$ with $\mathbf{A}$ already in NTT form, as in the listing of §7.5: at rank
4, ML-KEM needs four forward transforms, sixteen sets of base multiplications and four
inverses, $4 \cdot 896 + 16 \cdot 640 + 4 \cdot 896 = 17{,}408$ multiplications, while one ring
of degree 1024 with a complete NTT needs $2 \cdot 5120 + 1024 = 11{,}264$. Worse, the module's
matrix has $k^2 n = 4096$ coefficients to generate from the seed, against 1024 for the ring.
The multiplications hardly matter, as §7.10 shows; the sampling is SHAKE output, and on small
chips hashing is already most of the running time. That is the real cost of modules, and NIST
judged it worth paying. The sizes came out close, and depend more on $q$ and on compression
than on the choice between ring and module:

| Scheme | Ring degree × rank | $q$ | Public key (bytes) | Ciphertext (bytes) |
|---|---|---|---|---|
| NewHope512-CCA-KEM | $512 \times 1$ | 12,289 | 928 | 1,120 |
| ML-KEM-512 | $256 \times 2$ | 3329 | 800 | 768 |
| ML-KEM-768 | $256 \times 3$ | 3329 | 1,184 | 1,088 |
| NewHope1024-CCA-KEM | $1024 \times 1$ | 12,289 | 1,824 | 2,208 |
| ML-KEM-1024 | $256 \times 4$ | 3329 | 1,568 | 1,568 |

*Table 7.2. A ring scheme and a module scheme side by side (NewHope's NIST round 2
specification, 2019; FIPS 203). NewHope's 14-bit coefficients cost it more than its ring did.*

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

### From Fermat number transforms to NewHope

The NTT's first working life was in signal processing, not cryptography. A digital filter is
a convolution, and in the early 1970s engineers wanted convolutions without floating-point
rounding and with fewer hardware multipliers. Charles Rader
proposed transforms modulo Mersenne numbers $2^p - 1$ in 1972, and Ramesh Agarwal and Sidney
Burrus worked out transforms modulo Fermat numbers $F_t = 2^{2^t} + 1$ in 1974. A Fermat
modulus has two gifts: 2 is a root of unity of order $2^{t+1}$ modulo $F_t$, so every twiddle
multiplication is a shift, and reducing modulo $2^b + 1$ is a subtraction of the high half from
the low half. The catch was that the
transform length is tied to the word size, and only five Fermat numbers are known to be prime:
3, 5, 17, 257 and 65,537.

Lattice cryptography picked the idea up through hash functions. SWIFFT (Lyubashevsky,
Micciancio, Peikert and Rosen, 2008) computed its compression function as a product in
$\mathbb{Z}_{257}[X]/(X^{64} + 1)$; 257 is the Fermat prime $F_3$, and the paper's speed came
from an FFT over it. From 2012 a run of papers put Ring-LWE on FPGAs and microcontrollers
(Göttert and others, Pöppelmann and Güneysu, both 2012; Roy and others, 2014), and the
signature BLISS (Ducas, Durmus, Lepoint and Lyubashevsky, 2013) used $q = 12{,}289$ with an
NTT. Early code computed a
negacyclic product by scaling the coefficients by powers of $\psi$, running a cyclic
transform and scaling back; the Chinese remainder view of §7.5 folds those powers into the
twiddle factors, which is how both standards write it.

The turning point was NewHope. Erdem Alkim, Léo Ducas, Thomas Pöppelmann and Peter Schwabe
posted it in 2015 and presented it at USENIX Security in August 2016: Ring-LWE key exchange
with $n = 1024$ and $q = 12{,}289 = 3 \cdot 2^{12} + 1$, a prime with 2048th roots of unity, so
the NTT splits completely. It was fast and constant time, and it generated its public polynomial
directly in NTT form from a seed, a trick Kyber kept. In July 2016 Google ran NewHope
alongside X25519 in some Chrome connections to its servers (CECPQ1); in November Adam Langley
reported no unexpected problems and switched it off, so that an experiment would not become
a standard by default. The same summer the paper won the Internet Defense Prize. After NewHope, an NTT-friendly
prime was close to a requirement for any lattice scheme that wanted to be fast: Kyber (2017),
Dilithium (2017) and Falcon (2017) all chose one.

!!! note "Life story: NewHope"
    **Born:** 2015 (paper), 2016 (USENIX Security), Erdem Alkim, Léo Ducas, Thomas Pöppelmann
    and Peter Schwabe · **Purpose:** practical post-quantum key exchange for TLS from Ring-LWE
    · **Helped:** Google's CECPQ1 experiment (July to November 2016), and Kyber's design
    habits: public values sampled in NTT form from a seed, centered binomial noise ·
    **Retired:** NewHope reached the second round of the NIST process and was not carried
    into the third in July 2020 · **Replaced by:** ML-KEM (FIPS 203).

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

```text
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

```text
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

## 7.6 The butterflies by hand

*Level: intermediate.*

A 256-point transform is too big to follow by eye, but its structure is the same at any size.
Take $n = 8$ and $q = 17$. Since 16 divides $17 - 1$, there are primitive 16th roots of unity
modulo 17; $\psi = 3$ is one, as $3^8 = 6561 = 386 \cdot 17 - 1$. So $X^8 + 1$ splits completely,
in three layers of four butterflies, the shape of ML-DSA's transform. The twiddle table, written as FIPS 203 and FIPS 204
write theirs, is $\text{zetas}[k] = \psi^{\mathrm{br}_3(k)}$, where $\mathrm{br}_3$ reverses the
three bits of $k$:

$$\text{zetas}[1..7] = 3^4, 3^2, 3^6, 3^1, 3^5, 3^3, 3^7 = 13, 9, 15, 3, 5, 10, 11 \pmod{17}.$$

### Forward: Cooley-Tukey

The input is $f = 1 + 2X + 3X^2 + \dots + 8X^7$, stored as $[1, 2, 3, 4, 5, 6, 7, 8]$. Each
butterfly takes a pair $(x, y)$, multiplies $y$ by the twiddle, and returns the sum and the
difference: $(x + \zeta y,\ x - \zeta y)$. Multiply first, then add and subtract: that is the
Cooley-Tukey butterfly.

<div class="mars-steps" markdown>

1. **Layer 1, length 4, $\zeta = 13$.** Since $13^2 = 169 = 10 \cdot 17 - 1$, 13 is a square
   root of $-1$, and this layer splits $X^8 + 1 = (X^4 - 13)(X^4 + 13)$. The pairs are slots
   $(0,4), (1,5), (2,6), (3,7)$, holding the values $(1,5), (2,6), (3,7), (4,8)$. First pair:
   $13 \cdot 5 = 65 \equiv 14$, so the outputs are $1 + 14 = 15$ and $1 - 14 = -13 \equiv 4$.
   Second: $13 \cdot 6 = 78 \equiv 10$, giving 12 and 9. Third: $91 \equiv 6$, giving 9 and
   14. Fourth: $104 \equiv 2$, giving 6 and 2. The array is now $[15, 12, 9, 6 \mid 4, 9, 14, 2]$. The left half is $f$ modulo
   $X^4 - 13$, the right half $f$ modulo $X^4 + 13$.
2. **Layer 2, length 2, $\zeta = 9$ on the left half and $15$ on the right.** $9^2 = 81 \equiv
   13$ and $15^2 = 225 \equiv 4 \equiv -13$, the square roots this layer needs. Left, the values
   $(15, 9)$: $9 \cdot 9 = 81 \equiv 13$, so $28 \equiv 11$ and $2$; $(12, 6)$: $54 \equiv 3$, so
   15 and 9. Right, $(4, 14)$: $15 \cdot 14 = 210 \equiv 6$, so 10 and $-2 \equiv 15$; $(9, 2)$:
   $30 \equiv 13$, so $22 \equiv 5$ and $-4 \equiv 13$. Now $[11, 15, 2, 9, 10, 5,
   15, 13]$.
3. **Layer 3, length 1, $\zeta = 3, 5, 10, 11$.** $(11, 15)$: $3 \cdot 15 = 45 \equiv 11$, so
   $22 \equiv 5$ and 0. $(2, 9)$: $5 \cdot 9 = 45 \equiv 11$, so 13 and $-9 \equiv 8$. $(10, 5)$:
   $10 \cdot 5 = 50 \equiv 16$, so $26 \equiv 9$ and $-6 \equiv 11$. $(15, 13)$: $11 \cdot 13 =
   143 \equiv 7$, so $22 \equiv 5$ and 8. The result is $\hat f = [5, 0, 13, 8, 9, 11, 5, 8]$.
4. **Check one value.** Slot 0 should hold $f$ at the root $\psi^1 = 3$. The powers of 3
   modulo 17 are $1, 3, 9, 10, 13, 5, 15, 11$, so $f(3) \equiv 1 + 2 \cdot 3 + 3 \cdot 9 + 4
   \cdot 10 + 5 \cdot 13 + 6 \cdot 5 + 7 \cdot 15 + 8 \cdot 11 = 362 = 21 \cdot 17 + 5$. Slot 0
   holds 5, as it should.

</div>

Twelve multiplications did the work of 56 in a direct evaluation at eight points. Figure 7.3
shows why this is called a butterfly network.

<figure class="mars-fig">
<svg viewBox="0 0 640 400" width="640" role="img" aria-label="Butterfly network of the forward NTT for n = 8 and q = 17: three layers of four Cooley-Tukey butterflies take the coefficients 1 to 8 to the values 5, 0, 13, 8, 9, 11, 5, 8 at the eight roots of X^8 + 1" fill="currentColor" font-size="13">
<g font-weight="bold" text-anchor="middle"><text x="70" y="30">input f</text><text x="250" y="30">length 4, ζ = 13</text><text x="430" y="30">length 2, ζ = 9, 15</text><text x="610" y="30" text-anchor="end">length 1</text></g>
<path d="M84,70H236M84,104H236M84,138H236M84,172H236M84,206H236M84,240H236M84,274H236M84,308H236M264,70H416M264,104H416M264,138H416M264,172H416M264,206H416M264,240H416M264,274H416M264,308H416M444,70H596M444,104H596M444,138H596M444,172H596M444,206H596M444,240H596M444,274H596M444,308H596" fill="none" stroke="currentColor" stroke-width="1.2"/>
<path d="M84,70L236,206M84,104L236,240M84,138L236,274M84,172L236,308M84,206L236,70M84,240L236,104M84,274L236,138M84,308L236,172M264,70L416,138M264,104L416,172M264,138L416,70M264,172L416,104M264,206L416,274M264,240L416,308M264,274L416,206M264,308L416,240M444,70L596,104M444,104L596,70M444,138L596,172M444,172L596,138M444,206L596,240M444,240L596,206M444,274L596,308M444,308L596,274" fill="none" stroke="currentColor" stroke-width="1.2" stroke-opacity=".55"/>
<g text-anchor="middle" font-family="monospace" font-size="14">
<text x="70" y="75">1</text>
<text x="70" y="109">2</text>
<text x="70" y="143">3</text>
<text x="70" y="177">4</text>
<text x="70" y="211">5</text>
<text x="70" y="245">6</text>
<text x="70" y="279">7</text>
<text x="70" y="313">8</text>
<text x="250" y="75">15</text>
<text x="250" y="109">12</text>
<text x="250" y="143">9</text>
<text x="250" y="177">6</text>
<text x="250" y="211">4</text>
<text x="250" y="245">9</text>
<text x="250" y="279">14</text>
<text x="250" y="313">2</text>
<text x="430" y="75">11</text>
<text x="430" y="109">15</text>
<text x="430" y="143">2</text>
<text x="430" y="177">9</text>
<text x="430" y="211">10</text>
<text x="430" y="245">5</text>
<text x="430" y="279">15</text>
<text x="430" y="313">13</text>
<text x="610" y="75">5</text>
<text x="610" y="109">0</text>
<text x="610" y="143">13</text>
<text x="610" y="177">8</text>
<text x="610" y="211">9</text>
<text x="610" y="245">11</text>
<text x="610" y="279">5</text>
<text x="610" y="313">8</text>
</g>
<g font-size="11" fill-opacity=".7">
<text x="88" y="201">×13</text>
<text x="88" y="235">×13</text>
<text x="88" y="269">×13</text>
<text x="88" y="303">×13</text>
<text x="268" y="133">×9</text>
<text x="268" y="167">×9</text>
<text x="268" y="269">×15</text>
<text x="268" y="303">×15</text>
<text x="448" y="99">×3</text>
<text x="448" y="167">×5</text>
<text x="448" y="235">×10</text>
<text x="448" y="303">×11</text>
</g>
<g font-size="12" fill-opacity=".7"><text x="20" y="350">Butterfly: (x, y) → (x + ζy, x − ζy) mod 17; ×ζ marks the input that is multiplied.</text>
<text x="20" y="368">The last layer uses ζ = 3, 5, 10, 11. Slot i ends up holding f(3^(2·br(i)+1)):</text>
<text x="20" y="386">f(3) = 5, f(14) = 0, f(5) = 13, f(12) = 8, f(10) = 9, f(7) = 11, f(11) = 5, f(6) = 8.</text></g>
</svg>
<figcaption>Figure 7.3. The forward NTT for n = 8, q = 17, as a network of Cooley-Tukey butterflies pairing slots 4, then 2, then 1 apart. The numbers are those traced by hand above.</figcaption>
</figure>

### Bit-reversed order

Slot $i$ holds $f$ at the root $\psi^{2\,\mathrm{br}_3(i) + 1}$, so the slots hold the values
at $3^1, 3^9, 3^5, 3^{13}, 3^3, 3^{11}, 3^7, 3^{15}$. The first layer sends the roots with $r^4 =
13$ left and those with $r^4 = -13$ right; that choice is the lowest bit of the root's index
in natural order, written into the highest bit of the slot. Each later layer decides the next
bit and writes it one place lower, so the slot number is the root's index reversed.

Nothing in either standard undoes this. A pointwise product does not care about the order
of the points as long as both inputs share it, and the inverse reads bit-reversed input and
returns natural order. The order leaks out in one place: ML-KEM stores $\hat{\mathbf{s}}$ and
samples $\hat{\mathbf{A}}$ in NTT form, so FIPS 203 fixes the slot order of the encoded bytes,
and a fast implementation that uses another internal order (some vectorized ones do) must
permute before it encodes, or its keys will not work with anyone else's. The twiddle table is
stored bit-reversed too, so that the loop can read it straight through with `k += 1`.

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="Bit-reversed order for n = 8: output slot i of the NTT holds the value at the root 3 to the power 2 times br(i) plus 1, where br reverses the three bits of i; lines connect each slot to the position of its root in the natural order of odd powers" fill="currentColor" font-size="13">
<g font-weight="bold"><text x="20" y="30">slot i</text><text x="130" y="30">bits reversed</text><text x="270" y="30">root in slot</text><text x="470" y="30">roots in natural order</text></g>
<g font-family="monospace" font-size="13">
<text x="20" y="62">0 = 000</text>
<text x="130" y="62">000 = 0</text>
<text x="270" y="62">3^1 = 3</text>
<text x="480" y="62">3^1 = 3</text>
<text x="20" y="92">1 = 001</text>
<text x="130" y="92">100 = 4</text>
<text x="270" y="92">3^9 = 14</text>
<text x="480" y="92">3^3 = 10</text>
<text x="20" y="122">2 = 010</text>
<text x="130" y="122">010 = 2</text>
<text x="270" y="122">3^5 = 5</text>
<text x="480" y="122">3^5 = 5</text>
<text x="20" y="152">3 = 011</text>
<text x="130" y="152">110 = 6</text>
<text x="270" y="152">3^13 = 12</text>
<text x="480" y="152">3^7 = 11</text>
<text x="20" y="182">4 = 100</text>
<text x="130" y="182">001 = 1</text>
<text x="270" y="182">3^3 = 10</text>
<text x="480" y="182">3^9 = 14</text>
<text x="20" y="212">5 = 101</text>
<text x="130" y="212">101 = 5</text>
<text x="270" y="212">3^11 = 7</text>
<text x="480" y="212">3^11 = 7</text>
<text x="20" y="242">6 = 110</text>
<text x="130" y="242">011 = 3</text>
<text x="270" y="242">3^7 = 11</text>
<text x="480" y="242">3^13 = 12</text>
<text x="20" y="272">7 = 111</text>
<text x="130" y="272">111 = 7</text>
<text x="270" y="272">3^15 = 6</text>
<text x="480" y="272">3^15 = 6</text>
</g>
<path d="M372,57L468,57M372,87L468,177M372,117L468,117M372,147L468,237M372,177L468,87M372,207L468,207M372,237L468,147M372,267L468,267" fill="none" stroke="currentColor" stroke-width="1.2"/>
<g font-size="12" fill-opacity=".7"><text x="20" y="300">Palindromes (000, 010, 101, 111) stay put; the other slots swap in pairs.</text>
<text x="20" y="318">The zetas table is stored in the same order, so the code reads it straight through.</text></g>
</svg>
<figcaption>Figure 7.4. Bit-reversed order for n = 8: slot i holds the value at the root 3^(2·br(i)+1). Lines join each slot to its root's place among the odd powers of 3. ML-KEM does the same with 7 bits, ML-DSA with 8.</figcaption>
</figure>

### Backward: Gentleman-Sande

Solving $x' = x + \zeta y$, $y' = x - \zeta y$ gives $x = (x' + y')/2$ and $y = (x' -
y')/(2\zeta)$: add and subtract first, then multiply. That is the Gentleman-Sande butterfly
(Morven Gentleman and Gordon Sande, 1966). The halves are collected into one multiplication by
$n^{-1}$ at the end: $8^{-1} \equiv 15 \pmod{17}$, and for ML-KEM's seven layers $128^{-1}
\equiv 3303$.

The inverse needs $\zeta^{-1}$, yet FIPS 203 reads the forward table backwards and writes the
butterfly as $(x + y,\ \zeta(y - x))$. The negacyclic sign makes this work. With $\zeta = \psi^e$ and $\psi^8 = -1$, the value needed is $-\zeta^{-1} =
\psi^{8 - e}$, and reading the bit-reversed table from the end supplies exactly that. Here,
the last forward layer used $3, 5, 10, 11$; the first inverse layer uses $11, 10, 5, 3$; and
indeed $-3^{-1} = -6 \equiv 11$ and $-5^{-1} = -7 \equiv 10$ modulo 17.

<div class="mars-steps" markdown>

1. **Inverse layer 1, length 1, $\zeta = 11, 10, 5, 3$.** $(5, 0)$: sum 5, and $11 \cdot (0 - 5)
   = -55 \equiv 13$. $(13, 8)$: sum $21 \equiv 4$, and $10 \cdot (8 - 13) = -50 \equiv 1$. $(9,
   11)$: sum $20 \equiv 3$, and $5 \cdot 2 = 10$. $(5, 8)$: sum 13, and $3 \cdot 3 = 9$. Now
   $[5, 13, 4, 1, 3, 10, 13, 9]$.
2. **Inverse layers 2 and 3** run the same way with lengths 2 and 4, and give $[9, 14, 2, 7, 16,
   2, 5, 8]$ and then $[8, 16, 7, 15, 6, 14, 5, 13]$.
3. **Scale by $8^{-1} = 15$.** $8 \cdot 15 = 120 \equiv 1$, $16 \cdot 15 = 240 \equiv 2$, $7 \cdot
   15 = 105 \equiv 3$, and so on: $[1, 2, 3, 4, 5, 6, 7, 8]$, the polynomial we started with.

</div>

The pairing pays: Cooley-Tukey takes natural order to bit-reversed and Gentleman-Sande takes
it back, so no separate bit-reversal pass, a costly shuffle on a vector machine, is needed. It also explains the asymmetry of §7.9: the Gentleman-Sande
butterfly adds before it multiplies, so its sum leaves the layer unreduced and can grow.

**Code it.** The same two transforms for $n = 8$, printing the array after each forward layer
so you can compare it with the steps above, then checking every slot against direct
evaluation.

```python
# Cooley-Tukey forward and Gentleman-Sande inverse for n = 8, q = 17, psi = 3.
q, n, psi = 17, 8, 3

def bitrev(i, bits):
    return int(format(i, "0%db" % bits)[::-1], 2)

zetas = [pow(psi, bitrev(i, 3), q) for i in range(n)]

def ntt8(f):
    f, k, length = list(f), 1, n // 2
    while length >= 1:
        for start in range(0, n, 2 * length):
            z = zetas[k]; k += 1
            for j in range(start, start + length):
                t = z * f[j + length] % q
                f[j], f[j + length] = (f[j] + t) % q, (f[j] - t) % q
        print("  after the layer with length", length, ":", f)
        length //= 2
    return f

def intt8(f):
    f, k, length = list(f), n - 1, 1
    while length <= n // 2:
        for start in range(0, n, 2 * length):
            z = zetas[k]; k -= 1
            for j in range(start, start + length):
                x, y = f[j], f[j + length]
                f[j], f[j + length] = (x + y) % q, z * (y - x) % q
        length *= 2
    inv = pow(n, -1, q)                       # 8^-1 = 15 mod 17
    return [x * inv % q for x in f]

print("zetas[1..7]:", zetas[1:])
f = [1, 2, 3, 4, 5, 6, 7, 8]
fh = ntt8(f)
roots = [pow(psi, 2 * bitrev(i, 3) + 1, q) for i in range(n)]
print("root for each slot: ", roots)
print("f at those roots:   ", [sum(c * pow(r, e, q) for e, c in enumerate(f)) % q for r in roots])
print("inverse gives back: ", intt8(fh))
```

It prints:

```text
zetas[1..7]: [13, 9, 15, 3, 5, 10, 11]
  after the layer with length 4 : [15, 12, 9, 6, 4, 9, 14, 2]
  after the layer with length 2 : [11, 15, 2, 9, 10, 5, 15, 13]
  after the layer with length 1 : [5, 0, 13, 8, 9, 11, 5, 8]
root for each slot:  [3, 14, 5, 12, 10, 7, 11, 6]
f at those roots:    [5, 0, 13, 8, 9, 11, 5, 8]
inverse gives back:  [1, 2, 3, 4, 5, 6, 7, 8]
```

The ML-KEM code of §7.5 is this program with $n = 256$, $q = 3329$, $\psi = 17$, seven bits
instead of three, and one layer fewer, for the reason the next section gives.

## 7.7 Why 3329 and 8,380,417

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

```text
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

```text
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

*Table 7.3. The two NIST lattice moduli and their transforms.*

### The layer ML-KEM cannot do

After seven layers, slots $2i$ and $2i+1$ of an ML-KEM NTT hold $f$ modulo $X^2 - \gamma_i$,
with $\gamma_i = \zeta^{2\,\mathrm{BitRev}_7(i) + 1}$ and $\zeta = 17$. The first few are $\gamma_0 =
17$, $\gamma_1 = -17 \equiv 3312$, $\gamma_2 = 2761$ and $\gamma_3 = 568$. Splitting $X^2 - \gamma_i$ again
needs a square root of $\gamma_i$, an odd power of 17 and so of order 256; the root would have
order 512, which nothing modulo 3329 has. Euler's criterion confirms it for the
first one: $17^{(3329-1)/2} = 17^{1664} \equiv -1$, so 17 is not a square modulo 3329.

The top of the tree, by contrast, is easy. The first layer multiplies by $\zeta^{64} = 17^{64}
\equiv 1729$, and $1729^2 = 2{,}989{,}441 = 898 \cdot 3329 - 1$: 1729 is a square root of $-1$,
and the first layer is the split $X^{256} + 1 = (X^{128} - 1729)(X^{128} + 1729)$ (Hardy and
Ramanujan's taxicab number, by coincidence).

What remains is to multiply two degree-1 polynomials modulo $X^2 - \gamma$:

$$(a_0 + a_1 X)(b_0 + b_1 X) = a_0 b_0 + (a_0 b_1 + a_1 b_0) X + a_1 b_1 X^2,$$

and $X^2 = \gamma$ folds the last term into the first. That is BaseCaseMultiply, Algorithm 12 of
FIPS 203: $c_0 = a_0 b_0 + \gamma a_1 b_1$ and $c_1 = a_0 b_1 + a_1 b_0$, five multiplications.

<div class="mars-steps" markdown>

**BaseCaseMultiply by hand.** Take the first pair, $\gamma_0 = 17$, with $(a_0, a_1) = (1000,
2000)$ and $(b_0, b_1) = (3000, 50)$, modulo 3329.

1. $a_0 b_0 = 3{,}000{,}000 = 901 \cdot 3329 + 571$, so 571.
2. $a_1 b_1 = 100{,}000 = 30 \cdot 3329 + 130$, so 130, and $\gamma \cdot 130 = 2210$.
3. $c_0 = 571 + 2210 = 2781$.
4. $c_1 = 1000 \cdot 50 + 2000 \cdot 3000 = 6{,}050{,}000 = 1817 \cdot 3329 + 1207$, so 1207.
5. Karatsuba's trick gets $c_1$ with one multiplication instead of two: $(a_0 + a_1)(b_0 + b_1)
   = 3000 \cdot 3050 = 9{,}150{,}000 \equiv 1908$, and $1908 - 571 - 130 = 1207$, the same.

</div>

The simplest case shows what the pairs mean: $X$ itself has every one of its 128 pairs equal
to $(0, 1)$, and $(0,1) \cdot (0,1) = (\gamma_i, 0)$, which is right, since $X^2 \equiv \gamma_i$
modulo $X^2 - \gamma_i$.

**Code it.** BaseCaseMultiply, the Karatsuba form, the non-square check, and a test that
needs no NTT at all: reduce two random ring elements modulo each $X^2 - \gamma_i$ directly,
multiply the remainders pair by pair, and compare with the remainders of the schoolbook
product.

```python
# ML-KEM's last step: 128 products modulo X^2 - gamma, checked against the whole ring.
import random
Q = 3329
GAMMAS = [pow(17, 2 * int(format(i, "07b")[::-1], 2) + 1, Q) for i in range(128)]

def base_case_multiply(a0, a1, b0, b1, g):    # FIPS 203 Algorithm 12: 5 multiplications
    return (a0 * b0 + a1 * b1 * g) % Q, (a0 * b1 + a1 * b0) % Q

def karatsuba(a0, a1, b0, b1, g):             # the same with 4 multiplications
    p0, p1 = a0 * b0, a1 * b1
    return (p0 + p1 * g) % Q, ((a0 + a1) * (b0 + b1) - p0 - p1) % Q

def rem(f, g):                                # f mod (X^2 - g): X^2 becomes g
    return (sum(c * pow(g, j, Q) for j, c in enumerate(f[0::2])) % Q,
            sum(c * pow(g, j, Q) for j, c in enumerate(f[1::2])) % Q)

def ring_mul(a, b):                           # schoolbook product mod X^256 + 1
    c = [0] * 512
    for i, x in enumerate(a):
        for j, y in enumerate(b):
            c[i + j] += x * y
    return [(c[i] - c[i + 256]) % Q for i in range(256)]

print("first four gammas:", GAMMAS[:4])
print("by hand:", base_case_multiply(1000, 2000, 3000, 50, 17), karatsuba(1000, 2000, 3000, 50, 17))
print("is 17 a square mod 3329?", pow(17, (Q - 1) // 2, Q) == 1)
random.seed(3)
f = [random.randrange(Q) for _ in range(256)]
h = [random.randrange(Q) for _ in range(256)]
fh = ring_mul(f, h)
ok = all(base_case_multiply(*rem(f, g), *rem(h, g), g) == rem(fh, g) for g in GAMMAS)
print("all 128 pair products match the ring product:", ok)
```

It prints:

```text
first four gammas: [17, 3312, 2761, 568]
by hand: (2781, 1207) (2781, 1207)
is 17 a square mod 3329? False
all 128 pair products match the ring product: True
```

Is the incomplete transform a loss? For one ring product, a complete transform costs $3 \cdot
1024 + 256 = 3328$ multiplications (two forward, one inverse, 256 pointwise) and the
seven-layer one $3 \cdot 896 + 128 \cdot 5 = 3328$: exactly the same. In ML-KEM-768's
matrix-vector product, where base multiplications dominate, a complete transform would need
8,448 against 11,136, so the 12-bit modulus costs a third more multiplications there, a good
trade for smaller keys since multiplication is a minor part of the running time (§7.10). Optimized code also trims the base case: in $\hat{\mathbf{A}}\hat{\mathbf{s}}$ the
same $\hat{\mathbf{s}}$ meets every row, so a value like $b_1 \gamma_i$ can be computed once and
reused, a trick the Cortex-M4 papers call asymmetric multiplication.

### ML-DSA's complete NTT

ML-DSA's transform has no base case. With $\zeta = 1753$ of order 512, the eighth layer
splits every $X^2 - \gamma$ into two linear factors, the output is 256 values, and a product
in NTT form is 256 plain multiplications. FIPS 204 writes the transform as Algorithms 41 and
42. Below they are in Python, checked against the schoolbook product with one factor small, as
in $c\,\mathbf{s}_1$ inside signing.

```python
# ML-DSA's complete NTT (FIPS 204 Algorithms 41 and 42), checked against the schoolbook product.
# Uses ring_mul() from the listing above (it reads the new Q).
import random
Q, N = 8380417, 256

def bitrev8(i):
    return int(format(i, "08b")[::-1], 2)

ZETAS = [pow(1753, bitrev8(i), Q) for i in range(256)]

def ntt(w):
    w, m, length = list(w), 0, 128
    while length >= 1:
        for start in range(0, N, 2 * length):
            m += 1
            z = ZETAS[m]
            for j in range(start, start + length):
                t = z * w[j + length] % Q
                w[j + length] = (w[j] - t) % Q
                w[j] = (w[j] + t) % Q
        length //= 2
    return w

def ntt_inv(w):
    w, m, length = list(w), 256, 1
    while length < N:
        for start in range(0, N, 2 * length):
            m -= 1
            z = -ZETAS[m]
            for j in range(start, start + length):
                t = w[j]
                w[j] = (t + w[j + length]) % Q
                w[j + length] = z * (t - w[j + length]) % Q
        length *= 2
    return [x * 8347681 % Q for x in w]          # 8347681 = 256^-1 mod q

random.seed(11)
a = [random.randrange(Q) for _ in range(N)]
b = [random.randrange(-4, 5) % Q for _ in range(N)]    # small, like a secret s1
fast = ntt_inv([x * y % Q for x, y in zip(ntt(a), ntt(b))])
print("ZETAS[1] = 1753^128 =", ZETAS[1], " its square:", ZETAS[1] ** 2 % Q)
print("round trip ok:", ntt_inv(ntt(a)) == a)
print("pointwise product = ring product:", fast == ring_mul(a, b))
print("256 * 8347681 mod q =", 256 * 8347681 % Q)
```

It prints:

```text
ZETAS[1] = 1753^128 = 4808194  its square: 8380416
round trip ok: True
pointwise product = ring product: True
256 * 8347681 mod q = 1
```

$1753^{128} = 4{,}808{,}194$ is the square root of $-1$ that the first layer uses, and
$8{,}347{,}681$ is the $256^{-1}$ that ends the inverse. The structure is otherwise identical to
the $n = 8$ toy: Cooley-Tukey forward, Gentleman-Sande inverse with the table read backwards
and negated (FIPS 204 writes the negation out, $z = -\text{zetas}[m]$, and the butterfly as
$z(t - w_{j+\ell})$), no bit-reversal pass. ML-DSA's twiddle factors are 23-bit numbers, so
each multiplication needs a 64-bit product, and its reductions are the 32-bit versions of the
ones in the next section.

## 7.8 Reducing without dividing

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

```text
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

### The reference code, line by line

Here are both reductions from the ML-KEM reference implementation (pq-crystals
`ref/reduce.c`, lightly condensed), with `QINV = -3327` ($q^{-1} \bmod 2^{16}$, signed) and
`MONT = -1044` ($2^{16} \bmod q$, centered):

```c
int16_t montgomery_reduce(int32_t a) {          /* |a| <= q 2^15, result in (-q, q) */
  int16_t t = (int16_t)a * QINV;                /* t = a q^-1 mod 2^16 */
  return (a - (int32_t)t * KYBER_Q) >> 16;
}
int16_t barrett_reduce(int16_t a) {
  const int16_t v = ((1 << 26) + KYBER_Q / 2) / KYBER_Q;      /* 20159 */
  int16_t t = ((int32_t)v * a + (1 << 25)) >> 26;
  return a - t * KYBER_Q;                       /* within (q-1)/2 of zero */
}
```

Every twiddle factor in the table is stored premultiplied by $2^{16}$, so a butterfly computes
`t = montgomery_reduce(zeta * r[j + len])` and gets $\zeta \cdot x$ with no stray factor. The
first entry used, `zetas[1] = -758`, is $1729 \cdot 2^{16} \bmod 3329$ written centered, and
1729 is the $17^{64}$ of the first layer.

<div class="mars-steps" markdown>

**Montgomery by hand.** The first butterfly of the first layer, on a coefficient $x = 1000$.

1. The product: $a = -758 \cdot 1000 = -758{,}000$, a 32-bit value.
2. Its low 16 bits, read as signed: $-758{,}000 + 12 \cdot 65{,}536 = 28{,}432$.
3. $t = 28{,}432 \cdot (-3327) \bmod 2^{16}$, read as signed: $-24{,}816$ (a 16-bit multiply).
4. $a - tq = -758{,}000 + 82{,}612{,}464 = 81{,}854{,}464 = 1249 \cdot 65{,}536$: the low 16 bits
   are zero, because $tq \equiv a \pmod{2^{16}}$ by the choice of $t$.
5. The shift gives 1249. Check: $1729 \cdot 1000 = 1{,}729{,}000 = 519 \cdot 3329 + 1249$.

</div>

<figure class="mars-fig">
<svg viewBox="0 0 640 340" width="640" role="img" aria-label="Montgomery reduction as five steps, with the ML-KEM reference constants and a worked example: the product minus 1000 times 758, the 16-bit value t, the subtraction that clears the low 16 bits, the shift, and the result 1249" fill="currentColor" font-size="13">
<text x="20" y="24" font-weight="bold">Montgomery reduction, ML-KEM reference code (q = 3329, R = 2^16, QINV = −3327)</text>
<text x="32" y="68">a = ζ · x, a 32-bit product</text>
<text x="345" y="68" font-family="monospace" font-size="12">−758 · 1000 = −758,000</text>
<text x="32" y="126">t = low16(a · QINV), signed 16 bits</text>
<text x="345" y="126" font-family="monospace" font-size="12">low16(a) = 28,432; t = −24,816</text>
<text x="32" y="184">a − t·q: the low 16 bits become 0</text>
<text x="345" y="184" font-family="monospace" font-size="12">−758,000 + 82,612,464 = 81,854,464</text>
<text x="32" y="242">shift right by 16: exact division</text>
<text x="345" y="242" font-family="monospace" font-size="12">81,854,464 / 65,536 = 1,249</text>
<text x="32" y="300">r ≡ a · 2^−16 (mod q), with |r| &lt; q</text>
<text x="345" y="300" font-family="monospace" font-size="12">1,249 ≡ 1729 · 1000 (mod 3329)</text>
<path d="M20,44h300v38h-300zM170,82v18m-5,-7l5,7l5,-7M20,102h300v38h-300zM170,140v18m-5,-7l5,7l5,-7M20,160h300v38h-300zM170,198v18m-5,-7l5,7l5,-7M20,218h300v38h-300zM170,256v18m-5,-7l5,7l5,-7M20,276h300v38h-300z" fill="none" stroke="currentColor"/>
<text x="20" y="332" font-size="12" fill-opacity=".7">The entry −758 is 1729 · 2^16 mod q (1729 = 17^64); the shift removes the 2^16.</text>
</svg>
<figcaption>Figure 7.5. Montgomery reduction in the ML-KEM reference code, with the numbers of the worked example. The low half cancels exactly, so the shift divides by 2^16 with no remainder and nothing divides by q.</figcaption>
</figure>

<div class="mars-steps" markdown>

**Barrett by hand.** Reduce $a = 10{,}000$ with $v = 20{,}159$ (since $2^{26}/3329 \approx
20{,}159.04$).

1. $v a = 201{,}590{,}000$; add $2^{25} = 33{,}554{,}432$ for rounding: $235{,}144{,}432$.
2. Shift right by 26: $235{,}144{,}432 / 2^{26} = 3.50\ldots$, so $t = 3$, the rounded value of
   $10{,}000/3329$.
3. $a - 3q = 10{,}000 - 9987 = 13$.
4. At the extremes, $32{,}767$ gives $-523$ and $-32{,}768$ gives $522$: every 16-bit input
   lands within $\pm 1664$.

</div>

**Where the factors of $2^{16}$ go.** Every `montgomery_reduce` divides by $R = 2^{16}$. In
the butterflies the $R$ stored in the table cancels it. The base multiplication of two
ordinary values gives $ab R^{-1}$, one factor short, so the inverse transform ends by
multiplying by `f = 1441` $= R^2/128 \bmod q$: one Montgomery step with it multiplies by
$R/128$, removing the 128 that seven Gentleman-Sande layers put in and restoring the missing
$R$ (hence the name `invntt_tomont`). Where a product stays in NTT form, as for the public key
$\hat{\mathbf{t}}$, one more Montgomery step multiplies by $R$ instead. A wrong factor crashes
nothing; it scales every result, and only known-answer tests catch it.

**The ML-DSA versions.** ML-DSA's reference code uses $R = 2^{32}$ with `QINV = 58728449`
($q^{-1} \bmod 2^{32}$) and `MONT = -4186625` ($2^{32} \bmod q$, centered); its
`montgomery_reduce` takes a 64-bit product and returns a 32-bit value below $q$ in absolute
value. It needs no Barrett constant. Because $q = 2^{23} - 2^{13} + 1$ is so close to
$2^{23}$, its `reduce32` estimates $a/q$ as $(a + 2^{22}) \gg 23$, a Barrett reduction whose
magic number is 1, and returns $a - tq$. For $a = 30{,}000{,}000$: $(30{,}000{,}000 +
4{,}194{,}304) \gg 23 = 4$, and $30{,}000{,}000 - 4q = -3{,}521{,}668$: not fully reduced, since
`reduce32` promises only a result within $\pm 6{,}283{,}008$, about $0.75q$. A separate `caddq` adds $q$ to negative
values without a branch, `a += (a >> 31) & Q`, using the sign bit as a mask.

**Code it.** Every constant above, rebuilt from its definition. The printed values are the
ones in the reference source.

```python
# Rebuild the reference code's constants from their definitions.
def centered(x, m):
    x %= m
    return x - m if x > m // 2 else x

def bitrev(i, bits):
    return int(format(i, "0%db" % bits)[::-1], 2)

q = 3329                                     # ML-KEM, R = 2^16
mont = centered(1 << 16, q)
print("ML-KEM  MONT =", mont, " QINV =", centered(pow(q, -1, 1 << 16), 1 << 16))
print("        zetas[0..7] =", [centered(pow(17, bitrev(i, 7), q) << 16, q) for i in range(8)])
print("        f = mont^2/128 =", mont * mont * pow(128, -1, q) % q)
Q = 8380417                                  # ML-DSA, R = 2^32
mont = centered(1 << 32, Q)
print("ML-DSA  MONT =", mont, " QINV =", pow(Q, -1, 1 << 32))
print("        zetas[1..4] =", [centered(pow(1753, bitrev(i, 8), Q) << 32, Q) for i in range(1, 5)])
print("        f = mont^2/256 =", mont * mont * pow(256, -1, Q) % Q)
```

It prints:

```text
ML-KEM  MONT = -1044  QINV = -3327
        zetas[0..7] = [-1044, -758, -359, -1517, 1493, 1422, 287, 202]
        f = mont^2/128 = 1441
ML-DSA  MONT = -4186625  QINV = 58728449
        zetas[1..4] = [25847, -2608894, -518909, 237124]
        f = mont^2/256 = 41978
```

## 7.9 Lazy reduction and how it overflows

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
# Break it: run on 16-bit lanes and leave out the reductions after additions.
import random
random.seed(1)
Q, N = 3329, 256
ZETAS = [pow(17, int(format(i, "07b")[::-1], 2), Q) for i in range(128)]

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
print("forward NTT, no reductions: correct =", ntt_inv16(fwd, 1)[0] == a, " largest value:", peak)
for every in (1, 3, 4, 7):
    out, peak = ntt_inv16(fwd, every)
    wrong = sum(x != y for x, y in zip(out, a))
    print("inverse, reduce every", every, "layers: largest", peak, "->", wrong, "of 256 wrong")
```

It prints:

```text
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

### Worst-case bounds, layer by layer

The fix is arithmetic that fits on one page. Let $B_\ell$ bound the absolute value of every
coefficient after $\ell$ layers, and follow one butterfly.

- **Forward (Cooley-Tukey).** The product $\zeta y$ goes through Montgomery reduction, so it is
  below $q$ whatever $y$ was, and the outputs $x \pm \zeta y$ give $B_{\ell+1} \le B_\ell + q$.
  From $B_0 = q$, seven layers give $8q = 26{,}632$ for ML-KEM, inside a signed 16-bit lane,
  and eight give $9q = 75{,}423{,}753$ for ML-DSA, far inside 32 bits. Neither reference
  forward transform reduces after any addition; ML-KEM's Barrett-reduces each coefficient
  once at the end.
- **Inverse (Gentleman-Sande).** The output $\zeta(y - x)$ is reduced; the sum $x + y$ is not,
  so $B_\ell = 2^\ell q$ in the slots that keep receiving sums. On 16-bit lanes that passes
  32,767 after the fourth layer ($16q = 53{,}264$). The ML-KEM reference code simply
  Barrett-reduces every sum; optimized code reduces only the slots whose bound requires it.

ML-DSA's inverse is the instructive one. The reference code reduces nothing after any
addition, and the largest value it can hold is the first coefficient at the end, the sum of all
256 inputs: at most $256(q - 1)$ for inputs below $q$. Since $q - 1 = 2^{23} - 2^{13}$, that is
exactly $2^{31} - 2^{21} = 2{,}145{,}386{,}496$, against a signed 32-bit limit of $2^{31} - 1$:
a margin of $2^{21} - 1$, under a tenth of a percent. The shape of the prime is doing real
work; one a little above $2^{23}$ would have forced reductions into the inverse. The code also
relies on a precondition, inputs below $q$, that no type system checks. A caller that passes
the unreduced sum of two vectors breaks it, and only rare large inputs would show it.

<figure class="mars-fig">
<svg viewBox="0 0 640 400" width="640" role="img" aria-label="Bar chart of worst-case coefficient size after each layer on 16-bit lanes for ML-KEM: the forward NTT grows by q per layer and stays under 32767 after all seven layers; the inverse without reductions doubles each layer and passes 32767 after the fourth layer" fill="currentColor" font-size="13">
<text x="20" y="22" font-weight="bold">Worst case after each layer, ML-KEM on 16-bit lanes (inputs below q = 3329)</text>
<g stroke="currentColor"><line x1="80" y1="40" x2="80" y2="280"/><line x1="80" y1="280" x2="620" y2="280"/></g>
<text x="72" y="284.0" text-anchor="end" font-size="11" fill-opacity=".7">0</text>
<text x="72" y="204.0" text-anchor="end" font-size="11" fill-opacity=".7">20,000</text>
<text x="72" y="124.0" text-anchor="end" font-size="11" fill-opacity=".7">40,000</text>
<text x="72" y="44.0" text-anchor="end" font-size="11" fill-opacity=".7">60,000</text>
<line x1="80" y1="148.9" x2="620" y2="148.9" stroke="currentColor" stroke-dasharray="6 4"/>
<text x="616" y="142.9" text-anchor="end" font-size="12">16-bit limit 32,767</text>
<text x="115" y="296" text-anchor="middle" font-size="12">0</text>
<text x="182" y="296" text-anchor="middle" font-size="12">1</text>
<text x="249" y="296" text-anchor="middle" font-size="12">2</text>
<text x="316" y="296" text-anchor="middle" font-size="12">3</text>
<text x="383" y="296" text-anchor="middle" font-size="12">4</text>
<text x="463" y="36" text-anchor="middle" font-size="11">106k</text>
<text x="450" y="296" text-anchor="middle" font-size="12">5</text>
<text x="530" y="36" text-anchor="middle" font-size="11">213k</text>
<text x="517" y="296" text-anchor="middle" font-size="12">6</text>
<text x="597" y="36" text-anchor="middle" font-size="11">426k</text>
<text x="584" y="296" text-anchor="middle" font-size="12">7</text>
<path d="M92,280v-13.3h22v13.3zM159,280v-26.6h22v26.6zM226,280v-39.9h22v39.9zM293,280v-53.3h22v53.3zM360,280v-66.6h22v66.6zM427,280v-79.9h22v79.9zM494,280v-93.2h22v93.2zM561,280v-106.5h22v106.5z" fill-opacity=".3"/>
<path d="M117,280v-13.3h22v13.3zM184,280v-26.6h22v26.6zM251,280v-53.3h22v53.3zM318,280v-106.5h22v106.5zM385,280v-213.1h22v213.1zM452,280v-240.0h22v240.0zM519,280v-240.0h22v240.0zM586,280v-240.0h22v240.0z" fill-opacity=".75"/>
<text x="350" y="314" text-anchor="middle" font-size="12">layers done</text>
<rect x="20" y="324" width="14" height="12" fill-opacity=".3"/><text x="40" y="335" font-size="12">forward: grows by q per layer, 8q = 26,632 at the end</text>
<rect x="20" y="342" width="14" height="12" fill-opacity=".75"/><text x="40" y="353" font-size="12">inverse with no reductions: doubles per layer, 16q = 53,264 after 4</text>
<text x="20" y="376" font-size="12" fill-opacity=".7">ML-DSA on 32-bit words: forward at most 9q = 75,423,753; inverse at most 256(q − 1)</text>
<text x="20" y="394" font-size="12" fill-opacity=".7">= 2^31 − 2^21, which is 2,097,151 below 2^31 − 1: no reduction after any addition.</text>
</svg>
<figcaption>Figure 7.6. Worst-case coefficient size after each layer for ML-KEM on 16-bit lanes: the forward transform grows linearly and stays under the limit; the inverse doubles and must be reduced by its fourth layer. ML-DSA's bounds are below the chart.</figcaption>
</figure>

**Code it.** The bounds, and ML-DSA's inverse additions run on the worst input of all, every
coefficient $q - 1$, with each reduced slot also at its worst.

```python
# Worst-case size of the values, layer by layer, against the register that holds them.
q, Q = 3329, 8380417
fwd = [(l + 1) * q for l in range(8)]      # ML-KEM forward: + q per layer
inv = [2 ** l * q for l in range(8)]       # ML-KEM inverse, no reductions: doubles
print("ML-KEM forward: ", fwd[-1], "after 7 layers; fits 16 bits:", fwd[-1] <= 32767)
print("ML-KEM inverse: passes 32767 after layer", min(l for l in range(8) if inv[l] > 32767))
print("ML-DSA forward: 9q =", 9 * Q)
w = [Q - 1] * 256                          # ML-DSA inverse on the worst input
length = 1
while length < 256:                        # sums unreduced; the other slot reduced, at its worst
    for start in range(0, 256, 2 * length):
        for j in range(start, start + length):
            w[j], w[j + length] = w[j] + w[j + length], Q - 1
    length *= 2
print("ML-DSA inverse: largest", max(w), "= 2^31 - 2^21:", max(w) == 2 ** 31 - 2 ** 21)
print("room below 2^31 - 1:", 2 ** 31 - 1 - max(w))
```

It prints:

```text
ML-KEM forward:  26632 after 7 layers; fits 16 bits: True
ML-KEM inverse: passes 32767 after layer 4
ML-DSA forward: 9q = 75423753
ML-DSA inverse: largest 2145386496 = 2^31 - 2^21: True
room below 2^31 - 1: 2097151
```

Verified implementations (Chapter 17) check exactly this reasoning, by machine, for all inputs.

## 7.10 Fast in practice: vectors and microcontrollers

*Level: intermediate.*

The standards fix the algorithm; machines differ in how many coefficients one instruction
touches. Two bracket the range: a desktop core with 256-bit vectors and a Cortex-M4 with none.

### Sixteen lanes at once: AVX2

An AVX2 register holds sixteen 16-bit ML-KEM coefficients or eight 32-bit ML-DSA ones. One
`vpaddw` adds sixteen pairs and one `vpsubw` subtracts them. Multiplication is the awkward
part: no instruction turns sixteen 16-bit pairs into sixteen 32-bit products in place;
`vpmullw` returns the low 16 bits of each product and `vpmulhw` the high 16 bits. Montgomery reduction as written in §7.8 wants the full 32-bit
product.

Gregor Seiler's 2018 paper rewrote it in halves. Since $tq \equiv ab \pmod{2^{16}}$ by the
choice of $t$, the low halves of $ab$ and $tq$ are equal, so the high half of their
difference is just the difference of their high halves, with no borrow to worry about:

$$\left\lfloor \frac{ab - tq}{2^{16}} \right\rfloor = \mathrm{hi}(ab) - \mathrm{hi}(tq),
\qquad t = \mathrm{lo}\big(a \cdot (b\,q^{-1} \bmod 2^{16})\big).$$

With $b\,q^{-1} \bmod 2^{16}$ stored next to each twiddle factor $b$, a Montgomery
multiplication is three 16-bit multiplications and a subtraction, on sixteen lanes. Seiler reported that
this made polynomial multiplication 6.3 times faster than the previous AVX2 code for Kyber,
and 4.2 times faster for NewHope, whose earlier vector code had used floating-point units, on
an Intel Skylake core. The pq-crystals AVX2 code for ML-KEM is built on it.

**Code it.** The lane version against the reference `fqmul`, on every 16-bit input and four
table constants.

```python
# Montgomery multiplication by a constant the way 16-bit vector lanes do it (AVX2, Neon).
Q, QINV = 3329, -3327                     # QINV = q^-1 mod 2^16, as in the reference code

def s16(x):                                # low 16 bits, read as signed
    x &= 0xFFFF
    return x - 0x10000 if x >= 0x8000 else x

def fqmul(a, b):                           # reference code: 32-bit product, then reduce
    t = s16(s16(a * b) * QINV)
    return (a * b - t * Q) >> 16

def fqmul_lanes(a, b, b_qinv):             # three 16-bit multiplies, nothing wider
    t = s16(a * b_qinv)                    # vpmullw: low half
    return ((a * b) >> 16) - ((t * Q) >> 16)   # vpmulhw twice: high halves

bad = 0
for b in (-758, -1044, 1729, 17):
    b_qinv = s16(b * QINV)                 # stored next to b in the twiddle table
    bad += sum(fqmul_lanes(a, b, b_qinv) != fqmul(a, b) for a in range(-32768, 32768))
print("inputs tried:", 4 * 65536, " disagreements:", bad)
print("fqmul(1000, -758) =", fqmul(1000, -758), " lanes:", fqmul_lanes(1000, -758, s16(-758 * QINV)))
```

It prints:

```text
inputs tried: 262144  disagreements: 0
fqmul(1000, -758) = 1249  lanes: 1249
```

A rough count shows where an AVX2 NTT ends up: seven layers of 128 butterflies on sixteen
lanes is 56 vector butterflies of about six arithmetic instructions each, plus loads, stores
and the shuffles the last three layers need, where partners sit inside one register. At two
to four vector instructions per cycle that is a few hundred cycles per transform, a fraction
of a microsecond. (The estimate is ours, not a benchmark.) The whole ML-KEM-768 exchange takes
tens of microseconds, most of it in SHAKE. Arm's Neon, with eight 16-bit lanes and a "doubling
multiply, high half" instruction, gets the same treatment (Becker and others, 2022).

### Two coefficients per register: Cortex-M4

The Cortex-M4 is a 32-bit core with sixteen registers, no vector unit and no data cache,
found in meters, locks, sensors and hardware wallets. Its DSP extension gives it something
like two lanes: `smulbb` and its siblings multiply chosen 16-bit halves of two registers,
`sadd16` and `ssub16` add and subtract both halves at once, and `pkhbt` packs halves together.
Two ML-KEM coefficients share a register. For ML-DSA's 32-bit coefficients there are
single-cycle `smull` and `smlal`, 32 by 32 bits into 64, just what a 32-bit Montgomery
reduction needs.

Here memory traffic costs more than arithmetic. A naive NTT loads and stores all 256
coefficients in every layer; optimized code keeps as many as fit in registers and runs
several layers on them before storing (layer merging). Alkim, Bilgin, Cenk and Gérard (2020)
did this aggressively for Kyber; Greconici, Kannwischer and Sprenkels (2021) made Dilithium's
transforms about 20 percent faster than the earlier records; Abdulrahman, Hwang, Kannwischer
and Sprenkels (2022) took another 5 to 6 percent off them and sped up Kyber's matrix-vector
product by about 16 to 18 percent; and Huang and others (2022) adapted Thomas Plantard's 2021
reduction, cheaper still for multiplying by a precomputed twiddle factor. A forward ML-KEM NTT
on the M4 now costs several thousand cycles. The pqm4 project measures all these
implementations the same way:

| Operation | Portable C (cycles) | Cortex-M4 assembly (cycles) | Share spent hashing (assembly) |
|---|---|---|---|
| ML-KEM-768 key generation | 988,722 | 642,096 | 74.5% |
| ML-KEM-768 encapsulation | 1,138,225 | 658,754 | 74.4% |
| ML-KEM-768 decapsulation | 1,387,984 | 707,827 | 69.2% |
| ML-DSA-65 key generation | 3,205,533 | 2,516,006 | 82.3% |
| ML-DSA-65 signing (average) | 12,359,056 | 6,193,171 | 60.6% |
| ML-DSA-65 verification | 3,377,305 | 2,415,944 | 79.2% |

*Table 7.4. pqm4 benchmarks on an Arm Cortex-M4 ("clean" against "m4fspeed" for ML-KEM and
"m4f" for ML-DSA), from the project's published tables as of November 2026. The last column is
the share of cycles spent in SHA-3 and SHAKE. Signing is an average over 1,000 runs.*

The last column is the lesson. With the arithmetic optimized, about three quarters of an
ML-KEM operation on the M4 is Keccak, the permutation inside SHA-3 and SHAKE. Of a
707,827-cycle decapsulation, only about 218,000 cycles remain for the transforms, base
multiplications, compression, encoding and the final comparison. The NTT made itself a minor
cost. That is why the extra matrix coefficients of modules (§7.3) matter more than their
extra multiplications, why chip designers add Keccak accelerators to hardware meant for
post-quantum code (OpenTitan's KMAC block is one), and why a further ten percent off the NTT
changes a whole key exchange by only a percent or two.

**In the real world.** Arcadia City's habitat controllers show where this arithmetic ends
up. Door locks and air-plant sensors run small 32-bit cores and open an ML-KEM-768
session to the city's control net when they wake. As the client it does one encapsulation: about 660,000 cycles from Table 7.4,
roughly 10 milliseconds at 64 MHz, which a sensor waking once a minute on battery barely
notices. The Python in this chapter is thousands of times slower than any of this, and that is
fine: it is for understanding and checking, not for doors.

## 7.11 Does the structure help an attacker?

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

## 7.12 Going deeper

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
- **Verified arithmetic.** The bounds reasoning of §7.9 is exactly what proof tools check:
  see the HACL* and libcrux work, and the mlkem-native project, which proves the absence of
  overflow and of memory errors in its C code with the CBMC model checker.
- **Fermat transforms, again.** In ML-DSA signing, $c\,\mathbf{s}_1$ has coefficients far
  below $q$, so it can be computed exactly modulo a much smaller number. Abdulrahman, Hwang,
  Kannwischer and Sprenkels (2022) did this on the Cortex-M4 with a modulus that allows a
  Fermat number transform, and report a speed-up of about a third for those operations.
- **Precomputed twiddles.** Production code stores $\zeta^i \cdot 2^{16} \bmod q$ tables and, on
  some platforms, a second table of $\zeta^i \cdot q^{-1}$ to save one more multiplication per
  butterfly (Shoup's trick, also known as "Barrett multiplication" in the papers by Becker,
  Hwang, Kannwischer, Yang and Yang, TCHES 2022).

## Check yourself

??? question "1. In Z_17[X]/(X^4 + 1), what is X^5?"

    $X^5 = X \cdot X^4 = X \cdot (-1) = -X$, which is $16X$ modulo 17.

??? question "2. Why X^n + 1 and not X^n − 1?"

    $X^n - 1$ has the root 1, and evaluating a small secret or error at 1 just adds its
    coefficients, which stays small and leaks information. $X^n + 1$ for $n$ a power of two
    is irreducible over the rationals, and its roots modulo $q$ give uniformly spread values.

??? question "3. What condition on q lets the full NTT for n = 256 exist, and does 3329 meet it?"

    A primitive 512th root of unity modulo $q$, which exists when 512 divides $q - 1$. $3328 =
    2^8 \cdot 13$, so no: only 256th roots exist, and ML-KEM's NTT stops at quadratic
    factors.

??? question "4. Modulo 17, apply one Cooley-Tukey butterfly with ζ = 13 to the pair (x, y) = (2, 6), then undo it."

    $\zeta y = 78 \equiv 10$, so the outputs are $(12, -8) \equiv (12, 9)$. Undo: $x = (12 + 9)/2
    = 21 \cdot 9 \equiv 2$ (as $2^{-1} \equiv 9$), and $y = (12 - 9)/(2 \cdot 13) = 3 \cdot
    9^{-1} = 3 \cdot 2 = 6$: add and subtract first, multiply after, as Gentleman-Sande does.

??? question "5. In ML-KEM's NTT domain, multiply the pairs (0, 1) and (0, 1) modulo X^2 − 17. What polynomial is this, and why is the answer right?"

    BaseCaseMultiply gives $c_0 = 0 + 17 \cdot 1 \cdot 1 = 17$ and $c_1 = 0$, so $(17, 0)$. The
    pair $(0, 1)$ is $X$ modulo $X^2 - 17$, and $X^2 \equiv 17$ modulo $X^2 - 17$.

??? question "6. Why do the NTT outputs come out in bit-reversed order, and why does no implementation reorder them?"

    Each layer decides one bit of the root's index, lowest bit first, and writes it into the
    slot's highest unused bit. Pointwise products do not care about order, and the
    Gentleman-Sande inverse returns natural order, so reordering would be wasted work. The
    order matters only for encoding, which FIPS 203 fixes for keys stored in NTT form.

??? question "7. Why did NIST's lattice KEM use a module of rank 3 over n = 256 rather than one ring of degree 768?"

    $X^{768} + 1 = (X^{256} + 1)(X^{512} - X^{256} + 1)$ is not irreducible, and a different
    ring such as $X^{768} - X^{384} + 1$ needs a different NTT. A module keeps one ring, one NTT
    and one set of hardened routines for every level, at the price of sampling $k^2$ ring
    elements for the matrix.

??? question "8. In Montgomery reduction with R = 2^16, why is a − tq divisible by 2^16 when t = a·q^(−1) mod 2^16?"

    $tq \equiv a q^{-1} q = a \pmod{2^{16}}$, so $a - tq \equiv 0 \pmod{2^{16}}$. The version
    with $-q^{-1}$ and $a + tq$ is the same with the sign moved.

??? question "9. Why can the forward NTT of ML-KEM skip reductions after additions on 16-bit lanes, while the inverse cannot?"

    Forward: each layer adds a reduced product below $q$, so after seven layers values stay
    below $8q = 26{,}632 < 32{,}768$. Inverse: the sum $x + y$ can double a value each layer, and
    after four layers $16q = 53{,}264$ already passes 16 bits, so it must reduce partway.

??? question "10. ML-DSA's reference inverse NTT does no reduction after any addition on 32-bit words. Why is that safe, and what would break it?"

    With inputs below $q$, the largest value is the sum of all 256 inputs: at most $256(q - 1)
    = 2^{31} - 2^{21}$, which is $2^{21} - 1$ below the signed 32-bit limit. Unreduced inputs,
    such as the sum of two reduced vectors, could overflow, and only for rare large inputs.

## What you learned

- Plain LWE keys are large because the matrix has $n^2$ entries; a negacyclic matrix is one
  ring element, $n$ numbers.
- $R_q = \mathbb{Z}_q[X]/(X^n+1)$ multiplies polynomials with the fold $X^n = -1$; ML-KEM and
  ML-DSA both use $n = 256$.
- Module-LWE uses small matrices over one fixed ring, so the security level is the module rank
  and one implementation covers every level; a power-of-two ring has no degree 768. Modules
  cost extra matrix sampling, not much else.
- The NTT is the Chinese remainder theorem done fast: $\log_2 n$ layers of butterflies, needing
  roots of unity modulo $q$. It came from 1970s signal processing and became standard in
  lattice cryptography with NewHope in 2016.
- Cooley-Tukey butterflies multiply then add; Gentleman-Sande butterflies add then multiply.
  As a pair they go to bit-reversed order and back with no reordering pass.
- $q = 3329$ gives 12-bit coefficients and a seven-layer NTT ending in 128 BaseCaseMultiply
  steps modulo $X^2 - \gamma_i$; $q = 8{,}380{,}417$ gives ML-DSA room for its masks and a
  complete eight-layer NTT.
- Montgomery and Barrett reduction replace division with multiplications and shifts; every
  constant in the reference code follows from its definition.
- Lazy reduction is safe only where a worst-case bound says so; ML-DSA's inverse fits in 32 bits
  with $2^{21} - 1$ to spare. Overflow fails silently.
- AVX2 runs Montgomery in high halves on sixteen lanes; a Cortex-M4 packs two coefficients per
  register. Once the NTT is fast, Keccak takes about three quarters of ML-KEM's time.
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
- W. Morven Gentleman and Gordon Sande, "Fast Fourier Transforms: for fun and profit", AFIPS
  Fall Joint Computer Conference (1966).
- Charles M. Rader, "Discrete Convolutions via Mersenne Transforms", *IEEE Transactions on
  Computers* C-21 (1972).
- Ramesh C. Agarwal and C. Sidney Burrus, "Fast Convolution Using Fermat Number Transforms
  with Applications to Digital Filtering", *IEEE Transactions on Acoustics, Speech, and Signal
  Processing* 22 (1974).
- Peter L. Montgomery, "Modular Multiplication Without Trial Division", *Mathematics of
  Computation* 44 (1985).
- Paul Barrett, "Implementing the Rivest Shamir and Adleman Public Key Encryption Algorithm on
  a Standard Digital Signal Processor" (CRYPTO 1986).
- Vadim Lyubashevsky, Daniele Micciancio, Chris Peikert and Alon Rosen, "SWIFFT: A Modest
  Proposal for FFT Hashing" (FSE 2008).
- Erdem Alkim, Léo Ducas, Thomas Pöppelmann and Peter Schwabe, "Post-quantum key exchange: a
  new hope" (USENIX Security 2016); Adam Langley, "CECPQ1 results" (blog post, 2016).
- Vadim Lyubashevsky and Gregor Seiler, "NTTRU: Truly Fast NTRU Using NTT", *IACR TCHES*
  2019(3).
- NIST FIPS 203, Section 4.3 (the NTT and Algorithms 9 to 12), and FIPS 204, Algorithms 41
  and 42.
- The CRYSTALS reference implementations (github.com/pq-crystals/kyber and
  github.com/pq-crystals/dilithium), files `ref/reduce.c` and `ref/ntt.c`.
- Gregor Seiler, "Faster AVX2 optimized NTT multiplication for Ring-LWE lattice
  cryptography", IACR ePrint 2018/039 (2018).
- Erdem Alkim, Yusuf Alper Bilgin, Murat Cenk and François Gérard, "Cortex-M4 optimizations
  for {R,M}LWE schemes", *IACR TCHES* 2020(3).
- Denisa O. C. Greconici, Matthias J. Kannwischer and Amber Sprenkels, "Compact Dilithium
  Implementations on Cortex-M3 and Cortex-M4", *IACR TCHES* 2021(1).
- Amin Abdulrahman, Vincent Hwang, Matthias J. Kannwischer and Amber Sprenkels, "Faster Kyber
  and Dilithium on the Cortex-M4" (ACNS 2022).
- Hanno Becker, Vincent Hwang, Matthias J. Kannwischer, Bo-Yin Yang and Shang-Yi Yang, "Neon
  NTT: Faster Dilithium, Kyber, and Saber on Cortex-A72 and Apple M1", *IACR TCHES* 2022(1).
- Junhao Huang and others, "Improved Plantard Arithmetic for Lattice-based Cryptography",
  *IACR TCHES* 2022(4).
- Ronald Cramer, Léo Ducas and Benjamin Wesolowski, "Short Stickelberger Class Relations and
  Application to Ideal-SVP" (EUROCRYPT 2017).
- Martin R. Albrecht and Amit Deo, "Large Modulus Ring-LWE ≥ Module-LWE" (ASIACRYPT 2017).
- The pqm4 project (github.com/mupq/pqm4): Cortex-M4 benchmarks; Table 7.4 is from its
  published tables as of November 2026.
