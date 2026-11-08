# 10. NTRU, Falcon and FN-DSA

*NTRU is the oldest lattice cryptosystem still standing. It was presented in 1996, two years
before anyone called lattice cryptography practical, and its ring is the one Falcon, NIST's
compact signature, is built on. This chapter tells both stories. You will encrypt and decrypt
with textbook NTRU, see why its key is a short vector in a lattice, watch an early lattice
signature give away its secret basis to anyone who collects its signatures, fix it with the
random Gaussian sampling of Gentry, Peikert and Vaikuntanathan, and then build a small
working Falcon: an NTRU trapdoor found by solving $fG - gF = q$, signatures sampled with
Klein's algorithm, and verification in a few lines. Falcon is standardized as FN-DSA in
FIPS 206; as of 8 November 2026 no public draft of FIPS 206 has been released.*

!!! abstract "In this chapter"
    **You will learn:**

    - textbook NTRU encryption, and why decryption works;
    - the NTRU lattice, and how its secret key is a short vector in it;
    - why the first lattice signatures (GGH and NTRUSign) leaked their keys;
    - trapdoor sampling: the GPV framework and Klein's sampler;
    - how Falcon combines NTRU lattices with fast Fourier sampling, and a small working
      version of it;
    - Falcon's sizes, its floating-point problem, and the status of FN-DSA;
    - where NTRU-family schemes are used today.

    **You need:** [Chapter 5](05-Lattices-and-Their-Hard-Problems.md) (lattices, bases, CVP),
    [Chapter 7](07-Rings-Modules-and-the-NTT.md) (rings) and
    [Chapter 9](09-ML-DSA.md) (lattice signatures).

    **Levels:** §10.1 to §10.3 are for beginners, §10.4 to §10.8 are intermediate, §10.9
    to §10.11 are expert.

## 10.1 The problem

*Level: beginner.*

ML-DSA's smallest signature is 2,420 bytes and its public key 1,312. In a TLS handshake that
carries five or six signatures and keys, those kilobytes add up, and on a slow mobile link
they cost real time. Some uses are tighter still: a certificate transparency log stores
billions of signatures, and a small device may have to keep a signature in a few hundred
bytes of flash.

Falcon-512 has 666-byte signatures and an 897-byte public key, the smallest of any lattice
scheme NIST chose, with security at the same level as ML-DSA-44 or better. The price is
complexity: Falcon's signer samples from a Gaussian distribution over a lattice using
floating-point arithmetic, which is slow to get right and hard to protect against side
channels. Understanding why it is built that way means going back to NTRU and to a mistake
made by the first lattice signatures.

## 10.2 Textbook NTRU

*Level: beginner.*

Jeffrey Hoffstein, Jill Pipher and Joseph Silverman presented NTRU at the rump session of
CRYPTO '96 and published it at ANTS-III in 1998. It works in the ring $\mathbb{Z}[X]/(X^N -
1)$ with two moduli: a small one, $p = 3$, and a larger one, $q$.

- **Key generation.** Pick two polynomials $f$ and $g$ with small coefficients ($-1$, $0$ or
  $1$), with $f$ invertible modulo $p$ and modulo $q$. The public key is $h = p\, f^{-1} g \bmod
  q$, which looks random. The private key is $f$ (and $f^{-1} \bmod p$).
- **Encryption** of a message $m$ with small coefficients: pick a small random $r$ and send
  $e = r h + m \bmod q$.
- **Decryption.** Compute $a = f e = p\, r g + f m \pmod q$. All of $r, g, f, m$ are small, so
  $p\,rg + fm$ has coefficients smaller than $q/2$, and taking the centered representative
  modulo $q$ gives the exact integer polynomial. Reduce it modulo $p$: the $p\,rg$ term
  vanishes and $f m$ remains. Multiply by $f^{-1} \bmod p$ to get $m$.

**Code it.** NTRU with toy sizes $N = 11$, $p = 3$, $q = 32$. The inverses are found by
linear algebra (modulo 3) and by Newton's iteration (modulo powers of 2).

```python
# Textbook NTRU encryption (Hoffstein, Pipher and Silverman, 1998) with toy sizes.
import random
random.seed(11)
N, P, Q = 11, 3, 32

def mul(a, b, m):                       # product in Z_m[X]/(X^N - 1)
    c = [0] * N
    for i in range(N):
        for j in range(N):
            c[(i + j) % N] = (c[(i + j) % N] + a[i] * b[j]) % m
    return c

def inv_prime(f, p):
    """Inverse of f in Z_p[X]/(X^N - 1) for a prime p, by Gaussian elimination."""
    A = [[f[(i - j) % N] % p for j in range(N)] + [1 if i == 0 else 0] for i in range(N)]
    for col in range(N):
        piv = next((r for r in range(col, N) if A[r][col] % p), None)
        if piv is None:
            return None
        A[col], A[piv] = A[piv], A[col]
        inv = pow(A[col][col], -1, p)
        A[col] = [x * inv % p for x in A[col]]
        for r in range(N):
            if r != col and A[r][col]:
                A[r] = [(x - A[r][col] * y) % p for x, y in zip(A[r], A[col])]
    return [A[i][N] for i in range(N)]

def inverse(f, m):
    """Inverse mod 3, or mod a power of 2 by Newton's iteration g <- g(2 - fg)."""
    if m == P:
        return inv_prime(f, P)
    g, mod = inv_prime(f, 2), 2
    if g is None:
        return None
    while mod < m:
        mod *= mod
        t = [(-x) % mod for x in mul(f, g, mod)]
        t[0] = (t[0] + 2) % mod
        g = mul(g, t, mod)
    return [x % m for x in g]

def ternary(ones, minus):
    v = [1] * ones + [-1] * minus + [0] * (N - ones - minus)
    random.shuffle(v)
    return v

def centered(a, m):
    return [x - m if x > m // 2 else x for x in (y % m for y in a)]

while True:
    f = ternary(4, 3)
    fp, fq = inverse(f, P), inverse(f, Q)
    if fp and fq:
        break
g = ternary(3, 3)
h = mul([P * x for x in fq], g, Q)       # public key h = p * f^-1 * g mod q
print("public key h:", h)

msg = [1, 0, -1, 1, 1, 0, 0, -1, 0, 1, 0]
r = ternary(3, 3)
e = [(x + y) % Q for x, y in zip(mul(r, h, Q), msg)]   # e = r*h + m mod q
a = centered(mul(f, e, Q), Q)            # a = p*r*g + f*m, small, so no wrap mod q
m2 = centered(mul(fp, [x % P for x in a], P), P)
print("ciphertext:  ", e)
print("decrypted:   ", m2, " correct:", m2 == msg)
```

It prints:

```
public key h: [22, 0, 4, 30, 1, 21, 23, 30, 4, 31, 26]
ciphertext:   [23, 3, 16, 2, 29, 14, 28, 1, 18, 18, 10]
decrypted:    [1, 0, -1, 1, 1, 0, 0, -1, 0, 1, 0]  correct: True
```

Real NTRU parameters have $N$ between about 500 and 900. NTRU was patented, and for many years
the patents kept it out of free software. They have since expired.

!!! note "Life story: NTRU"
    **Born:** 1996, Jeffrey Hoffstein, Jill Pipher and Joseph H. Silverman, presented at the
    CRYPTO '96 rump session; "NTRU: A Ring-Based Public Key Cryptosystem" (ANTS-III, 1998) ·
    **Purpose:** fast public-key encryption from polynomial arithmetic · **Helped:** standards
    such as IEEE 1363.1 (2008) and ANSI X9.98; Google's CECPQ2 experiment in Chrome (2019,
    with NTRU-HRSS); OpenSSH's default key exchange from version 9.0 (2022) to 9.9, the hybrid
    sntrup761x25519, using the NTRU Prime variant; Falcon's lattices · **Status:** NTRU and
    NTRU Prime reached the final and alternate lists of NIST's third round (2020) but were not
    standardized; NTRU encryption lives on in sntrup761 and in the NTRU lattices of Falcon.

## 10.3 The NTRU lattice

*Level: beginner.*

Why is NTRU secure, and how would you break it? Look at all pairs $(u, v)$ of polynomials
with $u h \equiv v \pmod q$. They form a lattice of dimension $2N$, with basis

$$\begin{pmatrix} I & H \\ 0 & qI \end{pmatrix},$$

where $H$ is the matrix of multiplication by $h$. The determinant is $q^N$, so the Gaussian
heuristic (Chapter 5) predicts shortest vectors of length about $\sqrt{Nq/(\pi e)}$. But this
lattice contains the private key: $f \cdot h = p\,g \pmod q$, so $(f, p\,g)$ is in it, and its
length is only about $\sqrt{N}$ times small numbers. The NTRU lattice has an unusually short
vector planted in it, and finding that vector is the key-recovery problem.

With $q$ small compared with $N$, the planted vector hides among the many vectors of similar
length and lattice reduction must reach a block size like those of Chapter 6. When $q$ is
very large relative to the key (an "overstretched" NTRU, as in some early homomorphic
encryption schemes), the planted vector stands out and much cheaper attacks find it (Albrecht,
Bai and Ducas, CRYPTO 2016; Kirchner and Fouque, EUROCRYPT 2017). Falcon's parameters are far
from that regime.

NTRU and LWE are close cousins. Modern NTRU variants use $X^n + 1$ or prime-degree rings, and
their security is analyzed with the same estimator as ML-KEM's.

## 10.4 Hash-and-sign, and how it leaked

*Level: intermediate.*

A lattice with a secret short basis suggests a signature scheme, proposed by Goldreich,
Goldwasser and Halevi (GGH, CRYPTO 1997) and adapted to NTRU lattices as NTRUSign
(Hoffstein and others, CT-RSA 2003):

- The public key is a bad basis of a lattice; the private key is a good, short basis.
- To sign, hash the message to a point $t$ in space. Using the good basis, find a lattice
  point $s$ close to $t$ (with Babai's rounding: write $t$ in the good basis, round each
  coordinate). The signature is $s$.
- To verify, check that $s$ is in the lattice (easy with any basis) and close to $t$.

With only the bad basis, finding a close lattice point is a hard CVP instance. That part is
fine. The flaw is in what the signatures reveal. Rounding with basis $B$ always leaves a
difference $t - s$ inside the parallelepiped $\{u\,\mathbf{b}_1 + v\,\mathbf{b}_2 : -\tfrac12 \le u, v
< \tfrac12\}$, and each signature is a uniform point in it. Phong Nguyen and Oded Regev
("Learning a Parallelepiped", EUROCRYPT 2006) showed how to recover the parallelepiped, and so
the secret basis, from a few hundred NTRUSign signatures.

**Break it.** In two dimensions the shape is visible to the eye. Collect 20,000 signatures,
find the extreme points of the differences, and read off the basis.

```python
# Break it: a GGH-style hash-and-sign that rounds with the secret basis leaks that basis.
import random
random.seed(5)
B = [[7, 2], [-3, 8]]                    # secret good basis (rows), the public one is a bad basis
det = B[0][0] * B[1][1] - B[0][1] * B[1][0]

def sign(t):
    """Babai rounding: write t in the secret basis, round, return the lattice point."""
    x = (t[0] * B[1][1] - t[1] * B[1][0]) / det
    y = (-t[0] * B[0][1] + t[1] * B[0][0]) / det
    a, b = round(x), round(y)
    return [a * B[0][0] + b * B[1][0], a * B[0][1] + b * B[1][1]]

# Each signature s is a lattice point near the hashed message t. The difference t - s lies
# in the parallelepiped {u*b1 + v*b2 : -1/2 <= u, v < 1/2}, whose shape is the secret basis.
diffs = []
for _ in range(20000):
    t = [random.uniform(-1000, 1000), random.uniform(-1000, 1000)]
    s = sign(t)
    diffs.append((t[0] - s[0], t[1] - s[1]))
# The corners of the parallelepiped are (+-b1 +- b2)/2: find them as the extreme points.
corners = []
for dx, dy in ((1, 1), (1, -1), (-1, 1), (-1, -1)):
    corners.append(max(diffs, key=lambda d: dx * d[0] + dy * d[1]))
c = sorted(corners)
print("extreme points:", [(round(x, 1), round(y, 1)) for x, y in c])
# Adjacent corners differ by a basis vector.
cands = set()
for p in c:
    for q in c:
        v = (round(q[0] - p[0]), round(q[1] - p[1]))
        if v != (0, 0) and v[0] >= 0:
            cands.add(v)
print("differences of corners:", sorted(cands))
print("secret basis rows:     ", B)
```

It prints:

```
extreme points: [(-5.0, 2.9), (-1.9, -4.9), (2.0, 5.0), (4.9, -3.0)]
differences of corners: [(3, -8), (4, 10), (7, 2), (10, -6)]
secret basis rows:      [[7, 2], [-3, 8]]
```

Two of the four differences are the secret basis vectors, $(7, 2)$ and $(3, -8) = -(-3, 8)$;
the other two are their sum and difference. In hundreds of dimensions the extreme points are
not visible by eye, but Nguyen and Regev's method, which looks at the covariance of the
differences and then at their fourth moments, works there too. NTRUSign added
"perturbations" to hide the shape; Ducas and Nguyen ("Learning a Zonotope", ASIACRYPT 2012)
broke that version as well.

## 10.5 Trapdoor sampling

*Level: intermediate.*

The cure, found by Craig Gentry, Chris Peikert and Vinod Vaikuntanathan (GPV, STOC 2008), is
to make the signature's distribution independent of the basis used to compute it. Instead of
rounding deterministically, the signer **samples** a lattice point near $t$ at random, from a
discrete Gaussian distribution centered at $t$. If the Gaussian is wide enough compared with
the secret basis, every good basis produces the same distribution, so signatures say nothing
about which basis made them. The one sampled point reveals only that $t$ was hashed and that
the signer could find a close point, which is exactly what a signature should say.

How do you sample? Philip Klein's algorithm (SODA 2000), adapted by GPV, works through the
basis from the last vector to the first, using its Gram-Schmidt vectors $\tilde{\mathbf{b}}_i$:
at each step, project the remaining target on $\tilde{\mathbf{b}}_i$, choose an integer near
that coordinate from a one-dimensional discrete Gaussian of width $\sigma/\|\tilde{\mathbf{b}}_i\|$,
and subtract that multiple of $\mathbf{b}_i$. It is Babai's nearest-plane algorithm with
the rounding replaced by a random choice. For the output to be basis-independent, $\sigma$
must exceed the longest Gram-Schmidt vector by a small factor, so a basis with short and
balanced Gram-Schmidt vectors gives short signatures.

**Fix it.** Sign the same 20,000 hashed points with Klein's sampler, and compare the
covariance of the differences $t - s$ with deterministic rounding.

```python
# Uses sign() from the listing above.
# Fix it: sample the lattice point at random near t (Klein's sampler, as in GPV and Falcon),
# with a Gaussian wide enough that the result no longer shows the basis.
import math
b1, b2 = B[0], B[1]
mu21 = (b2[0] * b1[0] + b2[1] * b1[1]) / (b1[0] ** 2 + b1[1] ** 2)
g2 = [b2[0] - mu21 * b1[0], b2[1] - mu21 * b1[1]]        # Gram-Schmidt vectors b1*, b2*
gs = [b1, g2]
SIGMA = 12.0                                              # wider than the longest b_i*

def gauss_int(center, s):
    """Discrete Gaussian on the integers, by rejection from a uniform window."""
    lo, hi = math.floor(center - 10 * s), math.ceil(center + 10 * s)
    while True:
        x = random.randint(lo, hi)
        if random.random() < math.exp(-((x - center) ** 2) / (2 * s * s)):
            return x

def klein_sign(t):
    v, rest = [0.0, 0.0], [t[0], t[1]]
    for i in (1, 0):                                      # last Gram-Schmidt vector first
        g = gs[i]
        gg = g[0] ** 2 + g[1] ** 2
        c = (rest[0] * g[0] + rest[1] * g[1]) / gg
        z = gauss_int(c, SIGMA / math.sqrt(gg))
        rest = [rest[0] - z * B[i][0], rest[1] - z * B[i][1]]
        v = [v[0] + z * B[i][0], v[1] + z * B[i][1]]
    return v

def covariance(ds):
    n = len(ds)
    sxx = sum(x * x for x, _ in ds) / n
    syy = sum(y * y for _, y in ds) / n
    sxy = sum(x * y for x, y in ds) / n
    return [round(sxx, 1), round(sxy, 1), round(syy, 1)]

random.seed(6)
klein = []
for _ in range(20000):
    t = [random.uniform(-1000, 1000), random.uniform(-1000, 1000)]
    s = klein_sign(t)
    klein.append((t[0] - s[0], t[1] - s[1]))
print("rounding: covariance [xx, xy, yy] =", covariance(diffs))
print("Klein:    covariance [xx, xy, yy] =", covariance(klein), " (sigma^2 =", SIGMA ** 2, ")")
```

It prints:

```
rounding: covariance [xx, xy, yy] = [4.8, -0.8, 5.6]
Klein:    covariance [xx, xy, yy] = [144.2, 0.6, 142.6]  (sigma^2 = 144.0 )
```

With rounding, the covariance is $B^T B / 12$: $(49 + 9)/12 \approx 4.8$, $(14 - 24)/12
\approx -0.8$ and $(4 + 64)/12 \approx 5.7$. That is the first step of Nguyen and Regev's attack,
and it already gives the Gram matrix of the secret basis. With Klein's sampler the covariance
is $\sigma^2$ times the identity, a round cloud, the same for any basis. The signatures are
longer (about $\sigma$ instead of about half a basis vector), which is the price of hiding the
shape.

## 10.6 Falcon's design

*Level: intermediate.*

GPV signatures in a general lattice are big: the public basis is a large matrix. Falcon,
designed by Pierre-Alain Fouque, Jeffrey Hoffstein, Paul Kirchner, Vadim Lyubashevsky, Thomas
Pornin, Thomas Prest, Thomas Ricosset, Gregor Seiler, William Whyte and Zhenfei Zhang, puts
GPV in an NTRU lattice, following Ducas, Lyubashevsky and Prest (ASIACRYPT 2014):

- **The lattice** is $\{(s_1, s_2) : s_1 + s_2 h \equiv 0 \pmod q\}$ in $R = \mathbb{Z}[x]/(x^n
  + 1)$, with $n = 512$ or $1024$ and $q = 12{,}289$. The public key is $h = g f^{-1} \bmod q$:
  one polynomial, 897 or 1,793 bytes.
- **The trapdoor** is a short basis of that lattice, the rows $(g, -f)$ and $(G, -F)$, where
  $f, g$ are small and $F, G$ satisfy the **NTRU equation**
  $$fG - gF = q.$$
  The determinant of the basis is then $q^n$, the lattice's, so these rows generate the whole
  lattice.
- **Signing**: hash a 40-byte random salt and the message to a point $c \in \mathbb{Z}_q^n$
  (HashToPoint). Sample a lattice point $\mathbf{v}$ near $(c, 0)$ with the trapdoor. The
  difference $(s_1, s_2) = (c, 0) - \mathbf{v}$ is short and satisfies $s_1 + s_2 h \equiv c
  \pmod q$. The signature is the salt and a compressed $s_2$.
- **Verification**: recompute $c$, set $s_1 = c - s_2 h \bmod q$ (centered), and accept if
  $\|(s_1, s_2)\|^2 \le \beta^2$.

Verification is one polynomial product and a norm: cheap and simple. All the difficulty is in
key generation and signing.

**Solving the NTRU equation.** $f$ and $g$ are drawn small; finding $F$ and $G$ is the hard
part of key generation. The method used in Falcon (Pornin and Prest, PKC 2019) recurses
through smaller rings. The field norm $N(f)$, defined by $N(f)(x^2) = f(x) f(-x)$, maps $f$
to a ring of half the degree. Solve the equation for $N(f)$ and $N(g)$ there, lift the answer
back with $F(x) = F'(x^2)\, g(-x)$ and $G(x) = G'(x^2)\, f(-x)$, and reduce $(F, G)$ against $(f,
g)$ to keep it short. At degree 1 the equation is the extended Euclidean algorithm on two
integers.

## 10.7 A small Falcon

*Level: intermediate.*

**Code it.** A toy Falcon with $n = 16$ and Falcon's $q = 12{,}289$: key generation with the
recursive NTRU solver, then signing with Klein's sampler over the $32$-dimensional basis, and
verification. It has the structure of Falcon but none of its engineering: no fast Fourier
sampling, no compression, exact fractions where Falcon uses floating point.

```python
# A toy Falcon: NTRU trapdoor, NTRUSolve, and hash-and-sign with Klein's sampler.
# Same structure as Falcon, with n = 16 instead of 512 and none of its speed tricks.
import hashlib, math, random
from fractions import Fraction
random.seed(2024)
N, Q = 16, 12289

def pmul(a, b):                          # product in Z[x]/(x^n + 1), any n
    n = len(a)
    c = [0] * n
    for i in range(n):
        for j in range(n):
            if i + j < n:
                c[i + j] += a[i] * b[j]
            else:
                c[i + j - n] -= a[i] * b[j]
    return c

def adjoint(a):                          # a(1/x) in Z[x]/(x^n + 1)
    return [a[0]] + [-x for x in a[:0:-1]]

def field_norm(a):                       # N(a)(x^2) = a(x) * a(-x), as a polynomial in y = x^2
    ae, ao = a[0::2], a[1::2]
    sq_o = pmul(ao, ao)
    return [x - (sq_o[i - 1] if i else -sq_o[-1]) for i, x in enumerate(pmul(ae, ae))]

def lift(a):                             # a(y) -> a(x^2)
    out = [0] * (2 * len(a))
    out[0::2] = a
    return out

def neg_x(a):                            # a(-x)
    return [x if i % 2 == 0 else -x for i, x in enumerate(a)]

def divide_round(num, den):
    """Round num/den in Q[x]/(x^n + 1), by solving den * k = num exactly."""
    n = len(den)
    M = [[Fraction(0)] * n + [Fraction(num[i])] for i in range(n)]
    for j in range(n):                   # column j holds the coefficients of x^j * den
        col = pmul(den, [1 if k == j else 0 for k in range(n)])
        for i in range(n):
            M[i][j] = Fraction(col[i])
    for c in range(n):
        p = next(r for r in range(c, n) if M[r][c] != 0)
        M[c], M[p] = M[p], M[c]
        M[c] = [x / M[c][c] for x in M[c]]
        for r in range(n):
            if r != c and M[r][c] != 0:
                M[r] = [x - M[r][c] * y for x, y in zip(M[r], M[c])]
    return [round(M[i][n]) for i in range(n)]

def xgcd(a, b):
    if b == 0:
        return a, 1, 0
    d, x, y = xgcd(b, a % b)
    return d, y, x - (a // b) * y

def ntru_solve(f, g):
    """Find F, G with f*G - g*F = q in Z[x]/(x^n + 1) (Pornin and Prest's recursion)."""
    if len(f) == 1:
        d, u, v = xgcd(f[0], g[0])
        if abs(d) != 1:
            return None
        return [-v * Q * d], [u * Q * d]
    sub = ntru_solve(field_norm(f), field_norm(g))
    if sub is None:
        return None
    F = pmul(lift(sub[0]), neg_x(g))
    G = pmul(lift(sub[1]), neg_x(f))
    while True:                          # Babai-reduce (F, G) against (f, g)
        num = [a + b for a, b in zip(pmul(F, adjoint(f)), pmul(G, adjoint(g)))]
        den = [a + b for a, b in zip(pmul(f, adjoint(f)), pmul(g, adjoint(g)))]
        k = divide_round(num, den)
        if not any(k):
            return F, G
        F = [a - b for a, b in zip(F, pmul(k, f))]
        G = [a - b for a, b in zip(G, pmul(k, g))]

def keygen():
    s = 1.17 * math.sqrt(Q / (2 * N))
    while True:
        f = [round(random.gauss(0, s)) for _ in range(N)]
        g = [round(random.gauss(0, s)) for _ in range(N)]
        try:
            f_inv = inverse_mod_q(f)
        except ZeroDivisionError:
            continue
        sol = ntru_solve(f, g)
        if sol:
            h = [x % Q for x in pmul(g, f_inv)]
            return (f, g) + sol, h

def inverse_mod_q(f):                    # solve f * x = 1 modulo q, as a linear system
    M = [[0] * N + [1 if i == 0 else 0] for i in range(N)]
    for j in range(N):
        col = pmul(f, [1 if k == j else 0 for k in range(N)])
        for i in range(N):
            M[i][j] = col[i] % Q
    for c in range(N):
        p = next((r for r in range(c, N) if M[r][c]), None)
        if p is None:
            raise ZeroDivisionError
        M[c], M[p] = M[p], M[c]
        inv = pow(M[c][c], -1, Q)
        M[c] = [x * inv % Q for x in M[c]]
        for r in range(N):
            if r != c and M[r][c]:
                M[r] = [(x - M[r][c] * y) % Q for x, y in zip(M[r], M[c])]
    return [M[i][N] for i in range(N)]

(f, g, F, G), h = keygen()
check = [a - b for a, b in zip(pmul(f, G), pmul(g, F))]
print("f*G - g*F =", check[0], "and the other coefficients are all zero:", not any(check[1:]))
print("h = g/f mod q starts", h[:6])
print("longest coefficient of f, g:", max(map(abs, f + g)), "  of F, G:", max(map(abs, F + G)))
```

It prints:

```
f*G - g*F = 12289 and the other coefficients are all zero: True
h = g/f mod q starts [8685, 6433, 432, 7153, 121, 9166]
longest coefficient of f, g: 74   of F, G: 93
```

The trapdoor is found, and $F, G$ come out about as short as $f, g$ after reduction. Now sign
and verify:

```python
# Uses keygen() from the listing above.
# Sign and verify with the toy Falcon key.
def rot_rows(a, b):                      # rows x^i * (a, b) of the 2n-dimensional basis
    rows = []
    for i in range(N):
        e = [1 if k == i else 0 for k in range(N)]
        rows.append(pmul(e, a) + pmul(e, b))
    return rows

basis = rot_rows(g, [-x for x in f]) + rot_rows(G, [-x for x in F])
gs = []                                  # Gram-Schmidt (floating point, as Falcon also uses)
for b in basis:
    v = [float(x) for x in b]
    for u in gs:
        mu = sum(x * y for x, y in zip(v, u)) / sum(y * y for y in u)
        v = [x - mu * y for x, y in zip(v, u)]
    gs.append(v)
gs_norm = [math.sqrt(sum(x * x for x in v)) for v in gs]
SIGMA = 1.5 * max(gs_norm)
BOUND = (1.1 * SIGMA * math.sqrt(2 * N)) ** 2

def gauss_int(center, s):
    lo, hi = math.floor(center - 8 * s), math.ceil(center + 8 * s)
    while True:
        x = random.randint(lo, hi)
        if random.random() < math.exp(-((x - center) ** 2) / (2 * s * s)):
            return x

def hash_to_point(salt, msg):
    out, c, j = hashlib.shake_256(salt + msg).digest(4 * N * 4), [], 0
    while len(c) < N:
        x = int.from_bytes(out[j:j + 2], "big"); j += 2
        if x < 5 * Q:
            c.append(x % Q)
    return c

def sign(msg):
    salt = random.getrandbits(320).to_bytes(40, "big")
    c = hash_to_point(salt, msg)
    rest, v = [float(x) for x in c] + [0.0] * N, [0] * (2 * N)
    for i in reversed(range(2 * N)):     # Klein: one coordinate at a time, last first
        d = sum(x * y for x, y in zip(rest, gs[i])) / gs_norm[i] ** 2
        z = gauss_int(d, SIGMA / gs_norm[i])
        rest = [x - z * y for x, y in zip(rest, basis[i])]
        v = [x + z * y for x, y in zip(v, basis[i])]
    s2 = [-x for x in v[N:]]             # (s1, s2) = (c, 0) - v; only s2 is sent
    return salt, s2

def verify(msg, sig):
    salt, s2 = sig
    c = hash_to_point(salt, msg)
    s1 = [(a - b) % Q for a, b in zip(c, pmul(s2, h))]
    s1 = [x - Q if x > Q // 2 else x for x in s1]
    return sum(x * x for x in s1 + s2) <= BOUND

sig = sign(b"open the north airlock")
print("signature verifies:          ", verify(b"open the north airlock", sig))
print("on another message:          ", verify(b"open the south airlock", sig))
print("largest coefficient of s2:   ", max(map(abs, sig[1])), " (q =", Q, ")")
fake = (sig[0], [random.randrange(-Q // 2, Q // 2) for _ in range(N)])
print("random s2 instead (a forgery):", verify(b"open the north airlock", fake))
```

It prints:

```
signature verifies:           True
on another message:           False
largest coefficient of s2:    413  (q = 12289 )
random s2 instead (a forgery): False
```

The signature's coefficients are a few hundred, far below $q$, while a random $s_2$ gives a
random $s_1$ of size about $q/4$ and a norm far over the bound. Forging means finding a short
$(s_1, s_2)$ with $s_1 + s_2 h = c$ for a hash-chosen $c$, which is an approximate CVP problem in
the NTRU lattice (in the real scheme, of dimension 1,024 or 2,048).

## 10.8 The real Falcon

*Level: intermediate.*

Klein's sampler on a $2n$-dimensional basis costs $O(n^2)$ operations per signature, too slow
for $n = 1{,}024$. Falcon uses the **fast Fourier sampler** of Ducas and Prest ("Fast Fourier
Orthogonalization", ISSAC 2016): the ring structure lets the Gram-Schmidt decomposition be
stored as a tree (the "Falcon tree"), and sampling walks the tree in $O(n \log n)$ steps, like
an FFT. Everything in it is done on complex numbers in floating point, because the
Gram-Schmidt values are irrational.

| | Falcon-512 | Falcon-1024 |
|---|---|---|
| NIST category | 1 | 5 |
| $n$, $q$ | 512, 12,289 | 1,024, 12,289 |
| public key | 897 B | 1,793 B |
| private key | 1,281 B | 2,305 B |
| signature (padded format) | 666 B | 1,280 B |
| signature bound $\beta^2$ | 34,034,726 | 70,265,242 |

*Table 10.1. Falcon parameters from the round 3 specification (version 1.2). FIPS 206 may
change details; as of 8 November 2026 there is no public draft to check against.*

Next to ML-DSA-44's 1,312-byte key and 2,420-byte signature, Falcon-512 is about 3.6 times
smaller in signature and 1.5 times in key. Public key plus signature is 1,563 bytes against
3,732. Signing is fast on a computer with a floating-point unit (thousands of signatures per
second on one core) and verification is faster than ML-DSA's.

Signatures are compressed: the coefficients of $s_2$ are small and roughly Gaussian, so
Falcon codes each with a sign bit, the low 7 bits in plain binary, and the high bits in unary.
That is close to the entropy of the distribution and is why signature lengths vary; the
"padded" format fixes them at the sizes above.

## 10.9 The floating-point problem

*Level: expert.*

Falcon's sampler needs floating-point numbers with 53-bit precision, and that is its
practical weakness.

- **Portability.** Results must not depend on how a compiler or processor rounds. The
  specification fixes the operations precisely, and the reference code includes an emulation
  of IEEE double arithmetic with integers (by Thomas Pornin) for platforms without a reliable
  floating-point unit. It is several times slower.
- **Constant time.** On some processors floating-point operations take variable time for
  special values (for example subnormal numbers), and the Gaussian sampler's rejection loop
  must not leak its inputs. Writing it so that timing reveals nothing is delicate.
- **Power and electromagnetic leaks.** "FALCON Down" (Karabulut and Aysu, DAC 2021) recovered
  keys from electromagnetic measurements of the floating-point multiplications in signing;
  later work by Guerreau, Martinelli, Ricosset and Rossi, and by Zhang, Lin, Yu and Wang,
  improved power-analysis attacks. Masking Gaussian sampling is much harder than masking
  ML-DSA's uniform arithmetic.

None of this affects verification, which is integer-only and simple. So the practical advice
is: verify Falcon anywhere; sign with it only where the implementation and the hardware have
been chosen carefully. NIST's choice of ML-DSA as the primary signature, with Falcon for size-
critical uses, follows from this.

## 10.10 FN-DSA and the real world

*Level: expert.*

**Status.** NIST selected Falcon in July 2022 and announced that it would be standardized as
FIPS 206, FN-DSA ("FFT over NTRU-Lattice-Based Digital Signature Algorithm"). On 8 November
2026, NIST's site had no public draft of FIPS 206 (the page where an initial public draft
would appear returns "not found"). Until a draft appears, the details that implementations
must match, such as the exact encoding, the hashing of the message and whether a pre-hash
variant exists, are not known; this chapter follows the round 3 specification.

**Uses.** Falcon's small size makes it attractive for certificates and for systems that store
many signatures. Several TLS experiments have measured Falcon in certificate chains, and some
libraries ship it under its round 3 name. Large deployments are waiting for FIPS 206.

**HAWK.** A newer lattice signature, HAWK, uses the same kind of NTRU-module trapdoor but
samples over the integers lattice $\mathbb{Z}^{2n}$ instead of a Gaussian over a skewed
lattice, avoiding floating point. Its security rests on a lattice isomorphism problem, and it
is in round 3 of NIST's additional signature process (Chapter 15).

**Mars.** Arcadia City's habitat sensors log readings with a signature each, kept for years.
With Falcon-512 a signed reading costs about 700 bytes of storage instead of about 2,500, and
the city's archive verifies old logs with integer arithmetic only. The signing happens in
one secured server, not on the sensors themselves, so the hard part of Falcon stays where it
can be done carefully.

## 10.11 Going deeper

*Level: expert.*

- **The Falcon specification** (version 1.2, 2020) explains the tree sampler, the base sampler
  and the encoding in detail; Pornin's implementation notes cover constant-time floating
  point.
- **Gaussian sampling.** Micciancio and Walter's "Gaussian Sampling over the Integers" (CRYPTO
  2017) and Howe, Prest, Ricosset and Rossi's "Isochronous Gaussian Sampling" (PQCrypto 2020)
  show how to sample without leaks.
- **Trapdoors in general lattices.** Micciancio and Peikert's "Trapdoors for Lattices"
  (EUROCRYPT 2012) gives the standard construction outside NTRU, used in identity-based
  encryption and advanced protocols.
- **Mitaka and Antrag.** Variants of Falcon that use a simpler hybrid sampler, avoiding
  some of the floating-point trouble at a small cost in size.
- **Breaking NTRU-like lattices.** Ducas and van Woerden, "NTRU Fatigue" (ASIACRYPT 2021),
  maps exactly where the overstretched regime begins.

## Check yourself

??? question "1. In textbook NTRU, why does reducing a = f·e mod q to the centered range give the exact integer polynomial p·r·g + f·m?"

    Because $f, g, r, m$ have tiny coefficients, every coefficient of $p\,rg + fm$ is smaller
    than $q/2$ in absolute value, so the centered representative modulo $q$ is the integer
    itself.

??? question "2. Show that (f, p·g) lies in the NTRU lattice {(u, v) : u·h ≡ v mod q}."

    $f \cdot h = f \cdot p f^{-1} g = p\,g \pmod q$.

??? question "3. What did Nguyen and Regev's attack learn from GGH and NTRUSign signatures?"

    The differences between the hashed points and the signatures are uniform in the
    parallelepiped spanned by the secret basis. From enough of them (a few hundred for
    NTRUSign) the attack recovers the parallelepiped and so the basis.

??? question "4. With deterministic rounding, the covariance of t − s is BᵀB/12. Why 12?"

    Each coordinate in the secret basis is uniform on $[-\tfrac12, \tfrac12)$, whose variance is
    $1/12$; transforming by $B$ gives $B^T B / 12$.

??? question "5. Why must σ in Klein's sampler exceed the longest Gram-Schmidt vector?"

    So that the one-dimensional Gaussians at each step are wide enough for the output
    distribution to be (statistically close to) the discrete Gaussian on the lattice, which
    does not depend on the basis. A narrower $\sigma$ lets the basis shape show through.

??? question "6. What equation must Falcon's trapdoor polynomials satisfy, and why?"

    $fG - gF = q$. Then the rows $(g, -f)$ and $(G, -F)$ have determinant $q^n$, the same as
    the lattice $\{(s_1, s_2) : s_1 + s_2 h \equiv 0\}$, so they are a basis of it.

??? question "7. What does a Falcon verifier compute?"

    $c = \mathrm{HashToPoint}(\text{salt} \,\|\, \text{message})$, $s_1 = c - s_2 h \bmod q$
    (centered), and checks $\|(s_1, s_2)\|^2 \le \beta^2$.

??? question "8. Why is Falcon's signing harder to protect against side channels than ML-DSA's?"

    It samples from Gaussians using 53-bit floating-point arithmetic, whose timing and power
    use can depend on the values; masking Gaussian sampling is much harder than masking
    ML-DSA's uniform integer arithmetic.

??? question "9. What is the status of FN-DSA as of 8 November 2026?"

    Selected in 2022 and to be FIPS 206, but no public draft had been released; the
    details may differ from the round 3 Falcon specification.

??? question "10. Falcon-512 public key plus signature, against ML-DSA-44's?"

    $897 + 666 = 1{,}563$ bytes against $1{,}312 + 2{,}420 = 3{,}732$: less than half.

## What you learned

- NTRU (1996) encrypts with $h = p f^{-1} g$; decryption works because $p\,rg + fm$ is small.
- The NTRU private key is a planted short vector in a $2N$-dimensional lattice; overstretched
  parameters make it easy to find.
- Hash-and-sign with deterministic rounding leaks the secret basis (Nguyen and Regev, 2006).
- GPV trapdoor sampling with Klein's algorithm makes signatures independent of the basis.
- Falcon is GPV over NTRU lattices: trapdoor $fG - gF = q$, fast Fourier sampling,
  compressed signatures of 666 and 1,280 bytes.
- Its floating-point sampler is its weak spot for portability and side channels; verification
  is simple.
- FN-DSA will be FIPS 206; as of 8 November 2026 no public draft exists.

**Next:** [Chapter 11](11-Stateful-Hash-Based-Signatures.md), stateful hash-based signatures, which need no hard problem beyond the
hash function itself.

## Further reading

- Jeffrey Hoffstein, Jill Pipher and Joseph H. Silverman, "NTRU: A Ring-Based Public Key
  Cryptosystem" (ANTS-III, 1998).
- Oded Goldreich, Shafi Goldwasser and Shai Halevi, "Public-Key Cryptosystems from Lattice
  Reduction Problems" (CRYPTO 1997).
- Phong Q. Nguyen and Oded Regev, "Learning a Parallelepiped: Cryptanalysis of GGH and NTRU
  Signatures" (EUROCRYPT 2006).
- Craig Gentry, Chris Peikert and Vinod Vaikuntanathan, "Trapdoors for Hard Lattices and New
  Cryptographic Constructions" (STOC 2008).
- Philip Klein, "Finding the Closest Lattice Vector When It's Unusually Close" (SODA 2000).
- Léo Ducas, Vadim Lyubashevsky and Thomas Prest, "Efficient Identity-Based Encryption over
  NTRU Lattices" (ASIACRYPT 2014).
- Léo Ducas and Thomas Prest, "Fast Fourier Orthogonalization" (ISSAC 2016).
- Thomas Pornin and Thomas Prest, "More Efficient Algorithms for the NTRU Key Generation using
  the Field Norm" (PKC 2019).
- Pierre-Alain Fouque and others, *Falcon: Fast-Fourier Lattice-based Compact Signatures over
  NTRU*, specification version 1.2 (2020).
- Emre Karabulut and Aydin Aysu, "FALCON Down: Breaking FALCON Post-Quantum Signature Scheme
  through Side-Channel Attacks" (DAC 2021).
