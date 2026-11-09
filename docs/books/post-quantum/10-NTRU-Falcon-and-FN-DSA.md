# 10. NTRU, Falcon and FN-DSA

*NTRU is the oldest lattice cryptosystem still standing. It was presented in 1996, two years
before anyone called lattice cryptography practical, and its ring is the one Falcon, NIST's
compact signature, is built on. This chapter tells both stories. You will encrypt and decrypt
with textbook NTRU, see why its key is a short vector in a lattice, watch an early lattice
signature give away its secret basis to anyone who collects its signatures, fix it with the
random Gaussian sampling of Gentry, Peikert and Vaikuntanathan, and then build a small
working Falcon: an NTRU trapdoor found by solving $fG - gF = q$, signatures sampled with
Klein's algorithm, and verification in a few lines. Then you will replace Klein's slow sampler
with Falcon's own tree, the fast Fourier sampler, and squeeze a signature into 666 bytes.
Falcon is being standardized as FN-DSA in FIPS 206; as of November 2026 no public draft of
FIPS 206 has been released.*

!!! abstract "In this chapter"
    **You will learn:**

    - textbook NTRU encryption, why decryption works, and NTRU's long road from a rump
      session to OpenSSH;
    - the NTRU lattice, and how its secret key is a short vector in it;
    - why the first lattice signatures (GGH and NTRUSign) leaked their keys;
    - trapdoor sampling: the GPV framework, why it hides the key, why the same point must
      never be signed twice, and how Falcon's $\sigma$ is computed;
    - Falcon key generation: the NTRU equation solved by hand for $n = 2$;
    - fast Fourier sampling: the Falcon tree, built and walked in code;
    - Falcon's sizes, speeds and signature compression;
    - its floating-point problem and the side-channel attacks on its sampler (2019 to 2025);
    - what is known about FN-DSA (FIPS 206) as of November 2026, and where NTRU-family schemes
      are used today.

    **You need:** [Chapter 5](05-Lattices-and-Their-Hard-Problems.md) (lattices, bases, CVP),
    [Chapter 7](07-Rings-Modules-and-the-NTT.md) (rings) and
    [Chapter 9](09-ML-DSA.md) (lattice signatures). Gram-Schmidt and Babai's algorithms are
    explained in [Mathematics, Chapter 14](../mathematics/14-Lattices.md).

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

The road runs in order: NTRU and its lattice (§10.2, §10.3), the mistake (§10.4), the cure
(§10.5), Falcon itself (§10.6 to §10.8), and what it costs to run it safely (§10.9, §10.10).

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

```text
public key h: [22, 0, 4, 30, 1, 21, 23, 30, 4, 31, 26]
ciphertext:   [23, 3, 16, 2, 29, 14, 28, 1, 18, 18, 10]
decrypted:    [1, 0, -1, 1, 1, 0, 0, -1, 0, 1, 0]  correct: True
```

Real NTRU parameters have $N$ between about 500 and 900.

### When decryption fails

The proof of decryption had one condition: every coefficient of $p\,rg + fm$ must lie
strictly between $-q/2$ and $q/2$. Check it for the toy. $r$ and $g$ each have six nonzero
entries $\pm 1$, so a coefficient of $rg$ is a sum of at most 6 products of $\pm 1$, and
$|3\,(rg)_i| \le 18$. $f$ has seven nonzero entries and $m$ six, so $|(fm)_i| \le 6$. The
worst case is $18 + 6 = 24$, but $q/2 = 16$: the toy can fail. A typical coefficient of
$p\,rg + fm$ has a standard deviation of only about 6, but eleven coefficients each get a
chance, and a simulation with 200,000 random keys, $r$ and messages fails about 6 percent of the
time. The listing above happened to pick a message that works.

The original NTRU parameters made the same bet at full size: decryption failed with a tiny
probability, not never. Howgrave-Graham, Nguyen, Pointcheval, Proos, Silverman, Singer and
Whyte showed at CRYPTO 2003 that an attacker who learns which chosen ciphertexts fail to decrypt
learns about $f$. Failures were a leak, the kind the Fujisaki-Okamoto transform of [Chapter
3](03-KEMs-and-Signatures.md) must guard against in every lattice KEM. NTRU-HRSS and NTRU Prime
took the simple way out: $q$ large enough that the worst case fits, so decryption never fails.

### NTRU's long road

Jeffrey Hoffstein, a number theorist at Brown University, worked the idea out with his
colleagues Jill Pipher and Joseph Silverman. They presented it at the CRYPTO '96 rump
session, founded a company, NTRU Cryptosystems, and patented it (US patents 6,081,597 and
6,298,137). NTRU was much faster than RSA, but the patents kept it out of most free software
for twenty years, and the signature schemes built on it (NSS in 2001, NTRUSign in 2003) were
broken one after another. The encryption itself was never broken; its parameters were raised
as lattice attacks improved. It was standardized in IEEE 1363.1 (2008) and ANSI X9.98 (2010).

Security Innovation bought NTRU Cryptosystems in 2009, and on 28 March 2017 placed the two
encryption patents in the public domain, a few months before the first would have expired. In
November 2017 NIST's post-quantum call received three NTRU-style submissions: NTRUEncrypt,
NTRU-HRSS-KEM and NTRU Prime (authors in Further reading); the first two merged into "NTRU" in
round 2. In round 3 (July 2020) NTRU was one of four KEM
finalists and NTRU Prime an alternate. In July 2022 NIST chose Kyber; its report, NIST IR 8413,
said in a footnote that it might pick NTRU instead if the patent licenses it was negotiating for
Kyber were not signed by the end of 2022. They were signed, and NTRU left the process.

NTRU Prime made a different bet on structure. Its ring is $\mathbb{Z}[x]/(x^p - x - 1)$ with $p$
prime, which is a field modulo the prime $q$: no small subrings, no automorphisms of the kind
$x \mapsto x^k$ that cyclotomic rings have, so fewer handholds for algebraic attacks, at some
cost in speed. Its "streamlined" member sntrup761 ($p = 761$, $q = 4{,}591$; public key 1,158
bytes, ciphertext 1,039) is the one that reached production: OpenSSH 9.0 (April 2022) made the
hybrid sntrup761x25519 its default key exchange, the first post-quantum default in a widely
used protocol. Figure 10.1 puts the whole road on one line.

<figure class="mars-fig">
<svg viewBox="0 0 640 220" width="640" role="img" aria-label="Timeline of NTRU and Falcon: 1996 NTRU presented, 2003 NTRUSign, 2006 parallelepiped attack, 2008 GPV trapdoor sampling, 2014 to 2016 GPV over NTRU and fast Fourier sampling, 2017 Falcon submitted and NTRU patents freed, 2022 Falcon selected and sntrup761 default in OpenSSH, 2025 to 2026 FIPS 206 draft awaiting approval" fill="currentColor" font-size="12">
  <line x1="20" y1="110" x2="620" y2="110" stroke="currentColor" stroke-width="2"/>
  <path d="M45,80V110M201,80V110M357,80V110M513,80V110M123,110V138M279,110V138M435,110V138M591,110V138" stroke="currentColor"/>
  <path d="M41,110a4,4 0 1,0 8,0a4,4 0 1,0 -8,0M119,110a4,4 0 1,0 8,0a4,4 0 1,0 -8,0M197,110a4,4 0 1,0 8,0a4,4 0 1,0 -8,0M275,110a4,4 0 1,0 8,0a4,4 0 1,0 -8,0M353,110a4,4 0 1,0 8,0a4,4 0 1,0 -8,0M431,110a4,4 0 1,0 8,0a4,4 0 1,0 -8,0M509,110a4,4 0 1,0 8,0a4,4 0 1,0 -8,0M587,110a4,4 0 1,0 8,0a4,4 0 1,0 -8,0"/>
  <g text-anchor="middle">
    <text x="60" y="40" font-weight="bold">1996</text><text x="60" y="56">NTRU presented</text><text x="60" y="72" fill-opacity=".7">CRYPTO rump</text>
    <text x="201" y="40" font-weight="bold">2006</text><text x="201" y="56">parallelepiped</text><text x="201" y="72" fill-opacity=".7">attack</text>
    <text x="357" y="40" font-weight="bold">2014-16</text><text x="357" y="56">GPV over NTRU,</text><text x="357" y="72" fill-opacity=".7">fast Fourier</text>
    <text x="513" y="40" font-weight="bold">2022</text><text x="513" y="56">Falcon selected;</text><text x="513" y="72" fill-opacity=".7">sntrup761 in SSH</text>
    <text x="123" y="156" font-weight="bold">2003</text><text x="123" y="172">NTRUSign</text><text x="123" y="188" fill-opacity=".7">(NSS 2001)</text>
    <text x="279" y="156" font-weight="bold">2008</text><text x="279" y="172">GPV trapdoor</text><text x="279" y="188" fill-opacity=".7">sampling</text>
    <text x="435" y="156" font-weight="bold">2017</text><text x="435" y="172">Falcon submitted;</text><text x="435" y="188" fill-opacity=".7">patents freed</text>
    <text x="578" y="156" font-weight="bold">2025-26</text><text x="578" y="172">FIPS 206 draft</text><text x="578" y="188" fill-opacity=".7">awaits approval</text>
  </g>
</svg>
<figcaption>Figure 10.1. NTRU and Falcon, 1996 to 2026. The encryption scheme survived thirty years
of cryptanalysis; the first signatures built on it did not, and Falcon is what came out of
learning why. Milestones are evenly spaced, not to scale.</figcaption>
</figure>

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

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="The NTRU lattice basis as a block matrix with identity and H on top and zero and q times identity below; the private key (f, p g) is a combination of rows; bars compare the length of a Falcon-512 key, about 130, with the expected shortest vector of a random lattice of the same size, about 858" fill="currentColor" font-size="13">
  <rect x="40" y="40" width="90" height="90" fill="none" stroke="currentColor"/>
  <rect x="130" y="40" width="90" height="90" fill="currentColor" fill-opacity=".15" stroke="currentColor"/>
  <rect x="40" y="130" width="90" height="90" fill="none" stroke="currentColor"/>
  <rect x="130" y="130" width="90" height="90" fill="none" stroke="currentColor"/>
  <line x1="45" y1="45" x2="125" y2="125" stroke="currentColor" stroke-width="2"/>
  <line x1="135" y1="135" x2="215" y2="215" stroke="currentColor" stroke-width="2"/>
  <text x="62" y="98" font-size="16">I</text><text x="160" y="90" font-size="16">H</text>
  <text x="80" y="180" font-size="16">0</text><text x="175" y="188" font-size="16">qI</text>
  <text x="130" y="28" text-anchor="middle">N columns + N columns</text>
  <text x="130" y="242" text-anchor="middle" fill-opacity=".7">public basis, det = q^N</text>
  <text x="250" y="70">(f, p·g) = f·[I | H] − k·[0 | qI]</text>
  <text x="250" y="90" fill-opacity=".7">a short vector planted in the lattice</text>
  <text x="250" y="135">Falcon-512 (dimension 1,024):</text>
  <rect x="250" y="150" width="45" height="18" fill="currentColor" fill-opacity=".6"/>
  <text x="302" y="164">key (g, −f): about 130</text>
  <rect x="250" y="182" width="300" height="18" fill="currentColor" fill-opacity=".2" stroke="currentColor"/>
  <text x="556" y="196">858</text>
  <text x="250" y="222" fill-opacity=".7">expected shortest vector, random lattice</text>
</svg>
<figcaption>Figure 10.2. The NTRU lattice. The public basis is made of the identity and the
matrix $H$ of multiplication by $h$, over $q$ times the identity. The private key is a
combination of its rows that is far shorter than a random lattice of the same determinant
should contain: for Falcon-512, about 6.6 times shorter.</figcaption>
</figure>

### How short is the planted vector?

Put Falcon-512's numbers into the picture. Its lattice has dimension $2n = 1{,}024$ and
determinant $q^n$ with $q = 12{,}289$. The Gaussian heuristic of Chapter 5 says a random lattice
like that has shortest vectors of length about

$$\sqrt{\frac{2n}{2\pi e}}\;\det{}^{1/2n} = \sqrt{\frac{512}{\pi e}}\,\sqrt{q} \approx 7.74 \times
110.86 \approx 858.$$

Falcon's key generation keeps $\|(g, -f)\|$ below $1.17\sqrt{q} \approx 129.7$. So the secret
is about 6.6 times shorter than "random" would predict, and that gap is what the primal attack
of [Chapter 6](06-Lattice-Reduction-and-the-Estimator.md) exploits: BKZ finds the planted
vector once its block size is large enough to see the gap. In dimension 1,024 that block size
is in the hundreds, far beyond anything that has been run; the round 3 specification puts
Falcon-512 at NIST level 1 and Falcon-1024 at level 5 by such estimates, whose workings belong to
[Cryptanalysis, Chapter 15](../cryptanalysis/15-Lattices-as-a-Weapon.md#1510-how-estimators-set-post-quantum-parameters).
A shorter key would widen the gap; a longer one, as §10.6 shows, makes the other half of the
trapdoor worse. $1.17\sqrt q$ is the balance point.

NTRU and LWE are close cousins. Modern NTRU variants use $X^n + 1$ or prime-degree rings, and
their security is analyzed with the same estimator as ML-KEM's. One difference matters for
signatures: an NTRU public key is a single polynomial $h$ with no error term, so a trapdoor for
the whole lattice comes with the key for free, once $F$ and $G$ are found. An LWE key gives no
compact basis; trapdoors for LWE-style lattices exist (Micciancio and Peikert, §10.11) but are
much larger, which is one reason ML-DSA uses Fiat-Shamir instead of hash-and-sign.

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

```text
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

### The lesson, stated carefully

The hard problem was never in doubt: forging a GGH or NTRUSign signature with only the public
basis is a CVP instance as hard as the designers hoped. What failed was the assumption that a
signature reveals only "this message was signed". It also reveals *how* it was computed,
through its distribution: the error $t - s$ is the fractional part of $t$ written in the secret
basis. The attacker never inverts anything; they just average.

The patches of the 2000s (perturbations, larger dimensions) changed the shape of that
distribution without making it independent of the key, and each was eventually learned; the
full story is in [Cryptanalysis, Chapter
15](../cryptanalysis/15-Lattices-as-a-Weapon.md#159-early-lattice-schemes-that-fell). The fix
that worked changed the question: not "how do we hide the shape?" but "how do we make the
distribution provably independent of the key?" Figure 10.3 shows the two answers side by
side.

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

```text
rounding: covariance [xx, xy, yy] = [4.8, -0.8, 5.6]
Klein:    covariance [xx, xy, yy] = [144.2, 0.6, 142.6]  (sigma^2 = 144.0 )
```

With rounding, the covariance is $B^T B / 12$: $(49 + 9)/12 \approx 4.8$, $(14 - 24)/12
\approx -0.8$ and $(4 + 64)/12 \approx 5.7$. That is the first step of Nguyen and Regev's attack,
and it already gives the Gram matrix of the secret basis. With Klein's sampler the covariance
is $\sigma^2$ times the identity, a round cloud, the same for any basis. The signatures are
longer (about $\sigma$ instead of about half a basis vector), which is the price of hiding the
shape.

<figure class="mars-fig">
<svg viewBox="0 0 640 290" width="640" role="img" aria-label="Two scatter plots of signature errors t minus s. Left, deterministic rounding: 400 points fill a parallelogram whose sides are the secret basis vectors (7, 2) and (-3, 8). Right, Gaussian sampling: the points form a round cloud with no trace of the basis" fill="currentColor" font-size="13">
  <rect x="20" y="20" width="290" height="220" fill="none" stroke="currentColor" stroke-opacity=".4"/>
  <rect x="335" y="20" width="290" height="220" fill="none" stroke="currentColor" stroke-opacity=".4"/>
  <polygon points="205,30 265,190 125,230 65,70" fill="currentColor" fill-opacity=".08" stroke="currentColor" stroke-dasharray="4 3"/>
  <path d="M126,133h0M141,119h0M209,194h0M77,95h0M147,182h0M236,115h0M214,120h0M205,180h0M162,66h0M154,90h0M215,193h0M196,105h0M165,213h0M218,120h0M173,61h0M170,54h0M132,86h0M131,63h0M242,179h0M131,190h0M234,122h0M195,157h0M173,148h0M139,122h0M153,62h0M165,54h0M185,37h0M209,177h0M188,41h0M218,103h0M212,168h0M207,105h0M161,208h0M185,37h0M89,98h0M173,189h0M120,95h0M245,188h0M208,198h0M206,148h0M189,38h0M136,50h0M164,205h0M207,201h0M128,157h0M201,181h0M79,89h0M111,64h0M228,134h0M158,128h0M179,109h0M166,108h0M226,111h0M142,98h0M140,172h0M231,108h0M201,206h0M148,121h0M91,131h0M210,195h0M185,130h0M199,146h0M180,84h0M124,219h0M162,49h0M133,147h0M189,155h0M157,165h0M141,120h0M144,158h0M232,195h0M161,90h0M155,182h0M223,160h0M125,153h0M217,186h0M150,164h0M215,127h0M235,169h0M133,112h0M222,122h0M149,202h0M188,178h0M188,64h0M134,178h0M199,95h0M217,143h0M126,178h0M220,155h0M148,149h0M159,148h0M245,168h0M69,79h0M189,37h0M129,61h0M242,157h0M179,66h0M187,120h0M145,164h0M153,210h0M190,161h0M236,190h0M210,83h0M201,50h0M216,102h0M82,110h0M131,175h0M186,119h0M127,63h0M190,151h0M109,82h0M145,86h0M162,184h0M151,78h0M101,96h0M206,64h0M240,196h0M161,67h0M116,185h0M131,135h0M156,137h0M234,199h0M125,208h0M138,214h0M210,54h0M107,146h0M150,167h0M135,112h0M185,149h0M132,170h0M109,136h0M202,141h0M125,198h0M141,118h0M212,138h0M200,98h0M163,153h0M152,98h0M142,102h0M175,172h0M158,97h0M110,159h0M132,72h0M234,133h0M203,68h0M134,145h0M93,95h0M164,62h0M196,91h0M194,110h0M104,132h0M117,207h0M231,192h0M132,210h0M238,166h0M78,94h0M91,90h0M169,69h0M224,99h0M235,192h0M202,117h0M219,184h0M174,51h0M114,176h0M154,75h0M148,192h0M123,121h0M207,137h0M153,152h0M149,149h0M107,147h0M236,125h0M220,174h0M176,81h0M188,120h0M154,108h0M242,170h0M94,106h0M222,111h0M144,97h0M135,180h0M118,128h0M155,180h0M165,50h0M124,105h0M132,77h0M191,164h0M154,218h0M169,150h0M127,165h0M124,93h0M86,66h0M156,115h0M140,78h0M207,108h0M149,95h0M221,132h0M170,47h0M177,175h0M115,106h0M162,50h0M230,157h0M136,181h0M109,110h0M191,52h0M109,81h0M143,150h0M222,187h0M88,93h0M144,161h0M166,99h0M106,176h0M157,135h0M119,128h0M235,129h0M194,189h0M124,113h0M88,84h0M246,178h0M234,132h0M188,78h0M126,110h0M168,75h0M117,99h0M219,84h0M193,190h0M173,154h0M185,93h0M193,178h0M178,103h0M97,80h0M209,184h0M247,170h0M128,101h0M175,117h0M188,131h0M158,189h0M92,113h0M198,113h0M207,143h0M139,158h0M245,188h0M181,170h0M211,143h0M147,152h0M155,85h0M124,80h0M124,182h0M132,208h0M190,82h0M140,192h0M139,94h0M194,78h0M199,183h0M169,183h0M165,118h0M138,182h0M233,194h0M184,55h0M235,131h0M167,115h0M155,48h0M203,155h0M216,118h0M166,90h0M79,107h0M188,125h0M171,135h0M120,138h0M100,148h0M189,133h0M147,54h0M242,173h0M199,99h0M110,170h0M153,208h0M145,60h0M118,78h0M214,181h0M209,99h0M212,78h0M208,145h0M182,49h0M219,126h0M202,122h0M138,219h0M124,195h0M118,144h0M191,116h0M145,109h0M140,144h0M207,135h0M96,79h0M204,143h0M145,130h0M195,170h0M113,196h0M226,176h0M178,180h0M144,194h0M171,187h0M122,211h0M119,145h0M132,224h0M163,147h0M220,194h0M158,150h0M71,74h0M150,206h0M182,185h0M191,150h0M139,217h0M210,157h0M207,124h0M238,145h0M144,177h0M201,97h0M168,201h0M162,48h0M208,206h0M124,214h0M147,217h0M93,123h0M239,162h0M233,115h0M182,51h0M255,187h0M131,121h0M252,178h0M115,82h0M118,163h0M131,108h0M245,165h0M185,83h0M209,108h0M233,135h0M169,177h0M205,122h0M153,192h0M190,104h0M201,140h0M184,186h0M223,198h0M145,90h0M214,187h0M108,86h0M162,64h0M220,123h0M207,77h0M150,157h0M111,163h0M252,175h0M198,190h0M97,123h0M156,213h0M108,121h0M206,205h0M99,66h0M122,131h0M137,88h0M162,80h0M189,178h0M145,210h0M234,179h0M70,74h0M99,79h0M109,152h0M106,88h0M173,103h0M179,60h0M137,120h0M181,194h0M206,101h0M227,164h0M173,134h0M222,189h0M144,139h0M102,139h0M203,133h0M179,107h0M134,165h0M244,137h0M180,199h0M146,195h0M212,77h0M188,37h0M155,56h0M175,142h0M204,48h0M229,115h0M209,134h0M209,43h0M110,69h0M145,207h0M208,154h0M159,107h0M86,109h0M138,150h0M129,97h0M212,154h0" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" fill="none" stroke-opacity=".75"/>
  <path d="M509,108h0M465,121h0M522,70h0M568,141h0M462,112h0M462,85h0M427,139h0M426,65h0M469,83h0M539,181h0M471,99h0M482,136h0M516,91h0M455,136h0M508,121h0M486,178h0M555,140h0M491,132h0M483,124h0M444,114h0M531,113h0M511,109h0M481,52h0M451,114h0M524,118h0M435,177h0M547,171h0M480,107h0M484,206h0M399,135h0M447,141h0M484,123h0M423,202h0M520,157h0M430,216h0M503,184h0M435,103h0M493,106h0M438,143h0M452,92h0M495,175h0M504,136h0M459,82h0M408,86h0M527,218h0M472,137h0M431,155h0M445,127h0M456,222h0M531,91h0M444,92h0M567,197h0M462,152h0M504,143h0M420,76h0M466,99h0M579,162h0M462,91h0M475,108h0M507,115h0M485,113h0M410,142h0M512,182h0M482,134h0M458,22h0M511,116h0M446,126h0M467,134h0M538,56h0M452,185h0M489,119h0M482,157h0M510,55h0M490,140h0M532,143h0M465,116h0M382,48h0M476,108h0M494,112h0M422,53h0M505,117h0M616,185h0M512,134h0M415,46h0M413,124h0M477,122h0M440,71h0M491,185h0M428,118h0M430,111h0M494,155h0M397,186h0M496,152h0M561,149h0M497,100h0M484,116h0M524,136h0M495,145h0M567,122h0M459,178h0M482,149h0M435,142h0M515,83h0M457,84h0M454,103h0M443,85h0M581,142h0M533,192h0M477,108h0M410,130h0M446,78h0M433,116h0M394,147h0M533,134h0M424,108h0M521,111h0M523,191h0M559,99h0M389,49h0M460,108h0M395,157h0M401,94h0M470,170h0M464,81h0M446,105h0M429,202h0M459,142h0M488,89h0M462,146h0M513,111h0M478,120h0M385,154h0M411,145h0M519,203h0M520,154h0M471,150h0M511,159h0M390,116h0M474,103h0M506,182h0M489,125h0M477,126h0M494,154h0M474,88h0M434,133h0M436,176h0M462,122h0M546,139h0M520,107h0M485,128h0M435,124h0M544,180h0M458,91h0M402,175h0M493,89h0M533,97h0M580,113h0M424,138h0M507,114h0M396,113h0M446,139h0M543,137h0M451,135h0M452,42h0M516,91h0M451,158h0M491,224h0M524,185h0M484,115h0M446,115h0M510,48h0M497,51h0M500,138h0M517,152h0M487,103h0M529,118h0M417,74h0M487,143h0M445,105h0M494,101h0M474,64h0M469,112h0M489,84h0M450,143h0M471,159h0M452,182h0M512,66h0M438,97h0M430,165h0M466,125h0M500,213h0M423,126h0M469,38h0M468,158h0M453,127h0M472,168h0M474,187h0M521,97h0M509,170h0M396,151h0M432,113h0M410,170h0M486,112h0M484,185h0M450,44h0M520,166h0M562,136h0M480,166h0M545,126h0M476,170h0M425,123h0M480,63h0M441,146h0M522,95h0M451,67h0M500,92h0M495,88h0M462,139h0M527,113h0M495,81h0M490,113h0M385,153h0M515,168h0M467,120h0M474,93h0M500,138h0M527,146h0M449,116h0M507,136h0M433,152h0M490,101h0M556,137h0M470,223h0M535,91h0M480,161h0M367,99h0M446,65h0M513,75h0M474,79h0M419,67h0M478,181h0M462,172h0M491,161h0M425,146h0M470,121h0M510,76h0M498,59h0M373,133h0M520,187h0M471,121h0M413,155h0M506,144h0M546,28h0M477,180h0M478,155h0M418,148h0M460,146h0M519,84h0M498,146h0M498,129h0M489,172h0M347,92h0M454,152h0M479,133h0M467,64h0M485,120h0M442,134h0M500,134h0M494,171h0M496,174h0M461,163h0M488,83h0M492,168h0M486,86h0M511,109h0M431,154h0M451,151h0M490,128h0M465,106h0M449,144h0M484,188h0M443,190h0M435,136h0M474,115h0M494,179h0M560,72h0M427,160h0M459,122h0M506,130h0M517,95h0M448,126h0M520,150h0M529,126h0M548,128h0M544,199h0M542,111h0M464,84h0M469,95h0M521,85h0M575,71h0M587,100h0M486,113h0M478,183h0M486,181h0M468,143h0M456,176h0M485,131h0M539,103h0M520,150h0M467,184h0M443,99h0M472,136h0M456,64h0M478,81h0M478,89h0M438,188h0M527,143h0M491,93h0M510,119h0M429,160h0M481,103h0M502,114h0M447,130h0M522,167h0M455,91h0M548,113h0M480,171h0M475,164h0M486,99h0M499,74h0M436,184h0M539,85h0M438,124h0M434,131h0M493,89h0M438,184h0M504,144h0M540,179h0M528,73h0M498,143h0M393,189h0M457,48h0M518,156h0M498,106h0M502,170h0M461,87h0M510,144h0M585,118h0M463,91h0M515,135h0M558,84h0M481,99h0M509,142h0M512,153h0M470,102h0M427,145h0M439,99h0M455,51h0M546,159h0M487,145h0M480,101h0M544,36h0M559,184h0M460,138h0M467,123h0M508,149h0M455,29h0M510,37h0M456,71h0M552,73h0M448,106h0M447,178h0M480,108h0M471,134h0M507,159h0M499,96h0M508,105h0M437,142h0M462,99h0M405,124h0M412,102h0M458,128h0M520,57h0M438,124h0M397,138h0M451,101h0M476,125h0" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" fill="none" stroke-opacity=".75"/>
  <text x="165" y="262" text-anchor="middle">rounding with the secret basis</text>
  <text x="165" y="280" text-anchor="middle" fill-opacity=".7">uniform in the parallelepiped: leaks B</text>
  <text x="480" y="262" text-anchor="middle">Klein / Falcon sampling</text>
  <text x="480" y="280" text-anchor="middle" fill-opacity=".7">round Gaussian: the same for every basis</text>
</svg>
<figcaption>Figure 10.3. Four hundred signature errors $t - s$ for the two-dimensional lattice of the
listings above. Left, Babai rounding: every error lies in the parallelepiped spanned by the
secret basis $(7, 2)$ and $(-3, 8)$ (dashed), and its corners can be read off. Right, Gaussian
sampling with $\sigma = 12$, drawn at a smaller scale: a round cloud that any good basis would
produce.</figcaption>
</figure>

### The GPV framework

Gentry, Peikert and Vaikuntanathan did more than swap rounding for sampling. They built a
general framework, **hash-and-sign with a preimage-sampleable function**, and proved it secure.
Take a public matrix (for Falcon, the NTRU key $h$) and the function

$$f_h(s_1, s_2) = s_1 + s_2 h \bmod q,$$

defined on *short* vectors. Three facts make it a signature scheme:

1. **Uniform outputs.** If $(s_1, s_2)$ is drawn from a wide enough discrete Gaussian over
   $\mathbb{Z}^{2n}$, then $f_h(s_1, s_2)$ is statistically close to uniform in
   $\mathbb{Z}_q^n$.
2. **Sampling preimages with the trapdoor.** Given a uniform target $c$, the trapdoor (a short
   basis) samples a short preimage, and the preimage has the same distribution as in fact 1:
   a Gaussian $(s_1, s_2)$ conditioned on $f_h(s_1, s_2) = c$.
3. **Collisions are hard.** Two different short preimages of the same $c$ give a short nonzero
   vector $(s_1 - s_1', s_2 - s_2')$ of the lattice, a solution to the short integer solution
   problem (SIS) for $h$, which is assumed hard.

A signature on $m$ is a short preimage of $c = H(m)$, with $H$ modeled as a random oracle. In
the security proof a simulator who does *not* know the trapdoor must answer the forger's
signing queries. It works backwards: it
samples a short $(s_1, s_2)$ from the Gaussian, computes $c = f_h(s_1, s_2)$, and programs the
random oracle so that $H(m) = c$. By fact 1, $c$ looks uniform, as a real hash would; by fact 2,
$(s_1, s_2)$ has exactly the distribution a real signer would produce. The forger cannot tell
the simulation from the real thing. When it finally outputs a forgery on a new message, the
simulator has, with good probability, already chosen its own short preimage of that $c$, and
the forgery is a second one: a collision, so a short lattice vector.

The Babai signer fails this proof at fact 2. Its signatures are a deterministic function of
the basis, and no simulator without the basis can reproduce their distribution. The
parallelepiped is that distribution; Nguyen and Regev simply measured it.

### Never sign the same point twice

Fact 3 has a dark side. If a signer is ever asked for two preimages of the *same* target, it
produces two independent samples, and their difference is a short lattice vector: the signer has
just done the attacker's work. With enough such pairs an attacker collects many short vectors,
and short vectors in high dimension are exactly what the key is made of.

**Break it.** Ask the Klein signer of the listing above to sign one hashed point 200 times.

```python
# Uses klein_sign() from the listing above.
# Break it: sign the SAME hashed point many times. Every pair of answers differs by a lattice
# vector, and those differences are short: they hand out short vectors of the secret lattice.
random.seed(7)
t = [314.6, -271.8]                       # one hashed message, signed again and again
sigs = [klein_sign(t) for _ in range(200)]
diffs2 = {(round(a[0] - b[0]), round(a[1] - b[1])) for a in sigs for b in sigs if a != b}
short = sorted(diffs2, key=lambda v: v[0] ** 2 + v[1] ** 2)[:6]
print("distinct signatures of one point:", len({tuple(map(round, s)) for s in sigs}))
print("shortest differences:", short)
print("their lengths:       ", [round(math.hypot(*v), 2) for v in short])
```

It prints:

```text
distinct signatures of one point: 55
shortest differences: [(7, 2), (-7, -2), (-3, 8), (3, -8), (4, 10), (-4, -10)]
their lengths:        [7.28, 7.28, 8.54, 8.54, 10.77, 10.77]
```

The shortest differences are $\pm(7, 2)$ and $\pm(-3, 8)$, the secret basis itself. In two
dimensions anyone could find those from the public basis, but in dimension 1,024 the same
leak hands out vectors that lattice reduction could never reach. There are two standard
cures. **Derandomize**: make the sampler's randomness a pseudorandom function of the key and
the message, so the same message always gets the same signature. Or **salt**: hash a fresh
random value with the message, so no two signing requests share a target. Falcon salts, with
40 random bytes ($2^{320}$ possible salts) per signature, and NIST's FN-DSA status presentation
of September 2025 said FIPS 206 would allow only randomized signing (§10.10). The reason is
floating point: a deterministic signer whose arithmetic differs by one rounding between two
runs would produce two different signatures of one target, the leak above. Section 10.9 comes
back to this.

### How wide is wide enough?

Fact 1 and fact 2 hold when $\sigma$ is at least the **smoothing parameter** of the lattice
times the largest Gram-Schmidt norm of the basis. The smoothing parameter
$\eta_\varepsilon(\mathbb{Z}^{2n})$ is the width at which a Gaussian over the integers looks,
up to a statistical distance $\varepsilon$, like a continuous one. For $\mathbb{Z}^{2n}$ it is
close to

$$\eta_\varepsilon(\mathbb{Z}^{2n}) \approx \frac{1}{\pi}\sqrt{\frac{\ln\bigl(4n(1 + 1/\varepsilon)\bigr)}{2}}.$$

Falcon allows an attacker up to $2^{64}$ signatures and targets $\lambda = 128$ bits
(Falcon-512), and sets $\varepsilon = 1/\sqrt{2^{64} \cdot \lambda}$; the security argument,
which uses the Rényi divergence, then loses only a few bits over all those signatures.

Work it for Falcon-512 by hand. $1/\varepsilon = \sqrt{2^{64} \cdot 2^7} = 2^{35.5}$. Then
$\ln(4 \cdot 512 \cdot (1 + 2^{35.5})) \approx \ln 2^{11} + 35.5 \ln 2 = 7.62 + 24.61 = 32.23$;
half of that is $16.12$, its square root is $4.015$, and divided by $\pi$ it is $1.278$. That
is Falcon's $\sigma_{\min}$. Multiply by the largest Gram-Schmidt norm the key generator
allows, $1.17\sqrt{q} = 129.70$: $\sigma = 1.278 \times 129.70 \approx 165.7$. The verifier's
bound is a little above the expected length of a $2n$-dimensional Gaussian vector, $\beta =
1.1\,\sigma\sqrt{2n} = 1.1 \times 165.7 \times 32 \approx 5{,}834$, and $\beta^2 \approx 34$
million. The same arithmetic in code, for both parameter sets:

```python
# Falcon's sigma and signature bound, from the smoothing parameter.
import math
Q = 12289
for n, lam in ((512, 128), (1024, 256)):
    eps = 1 / math.sqrt(2 ** 64 * lam)          # 2^64 signatures, lambda-bit security
    sigma_min = math.sqrt(math.log(4 * n * (1 + 1 / eps)) / 2) / math.pi
    sigma = sigma_min * 1.17 * math.sqrt(Q)     # times the largest allowed Gram-Schmidt norm
    beta2 = math.floor((1.1 * sigma * math.sqrt(2 * n)) ** 2)
    print(f"n = {n:4}: sigma_min = {sigma_min:.6f}  sigma = {sigma:.4f}  beta^2 = {beta2:,}")
```

It prints:

```text
n =  512: sigma_min = 1.277834  sigma = 165.7366  beta^2 = 34,034,726
n = 1024: sigma_min = 1.298280  sigma = 168.3886  beta^2 = 70,265,242
```

These are exactly the constants in the Falcon specification (Table 10.1 below). Every
number in Falcon's signature follows from three choices: $q$, the $1.17\sqrt q$ limit on the
key, and the budget of $2^{64}$ signatures.

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
key generation and signing. Figure 10.4 shows the two sides.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="Falcon hash-and-sign flow. Signer: message and 40-byte salt, HashToPoint gives c, fast Fourier sampling with the private tree gives a lattice point v near (c, 0), s = (c, 0) minus v, compress s2, signature is salt and compressed s2. Verifier: recompute c, s1 = c minus s2 h mod q, accept if the norm of (s1, s2) squared is at most beta squared" fill="currentColor" font-size="12">
  <text x="10" y="22" font-weight="bold">sign (private tree)</text>
  <g fill="none" stroke="currentColor">
    <rect x="10" y="32" width="112" height="62"/><rect x="138" y="32" width="112" height="62"/>
    <rect x="266" y="32" width="112" height="62" fill="currentColor" fill-opacity=".12"/>
    <rect x="394" y="32" width="112" height="62"/><rect x="522" y="32" width="112" height="62"/>
    <rect x="10" y="160" width="112" height="62"/><rect x="138" y="160" width="112" height="62"/>
    <rect x="266" y="160" width="112" height="62"/><rect x="394" y="160" width="112" height="62"/>
    <rect x="522" y="160" width="112" height="62"/>
  </g>
  <path d="M122,63L136,63M250,63L264,63M378,63L392,63M506,63L520,63M122,191L136,191M250,191L264,191M378,191L392,191M506,191L520,191M578,94L578,128M578,128L66,128M66,128L66,158" stroke="currentColor" stroke-width="1.5" fill="none"/>
  <g text-anchor="middle">
    <text x="66" y="56">message +</text><text x="66" y="72">40-byte salt</text>
    <text x="194" y="56">HashToPoint</text><text x="194" y="72">c in Z_q^n</text>
    <text x="322" y="52">ffSampling:</text><text x="322" y="68">lattice point v</text><text x="322" y="84">near (c, 0)</text>
    <text x="450" y="56">(s1, s2) =</text><text x="450" y="72">(c, 0) − v</text>
    <text x="578" y="56">compress s2;</text><text x="578" y="72">send salt, s2</text>
    <text x="300" y="119" fill-opacity=".7">signature: 666 bytes (Falcon-512)</text>
    <text x="66" y="184">salt, s2,</text><text x="66" y="200">message</text>
    <text x="194" y="184">HashToPoint</text><text x="194" y="200">c again</text>
    <text x="322" y="184">s1 = c − s2·h</text><text x="322" y="200">mod q, centered</text>
    <text x="450" y="184">|(s1, s2)|²</text><text x="450" y="200">≤ β² ?</text>
    <text x="578" y="184">accept or</text><text x="578" y="200">reject</text>
  </g>
  <text x="10" y="244" font-weight="bold">verify (public h, integers only)</text>
</svg>
<figcaption>Figure 10.4. Falcon as hash-and-sign. The only secret step is the shaded sampler; the
verifier needs one polynomial product modulo $q$ and a norm, all in integers.</figcaption>
</figure>

**Solving the NTRU equation.** $f$ and $g$ are drawn small; finding $F$ and $G$ is the hard
part of key generation. The method used in Falcon (Pornin and Prest, PKC 2019) recurses
through smaller rings. The field norm $N(f)$, defined by $N(f)(x^2) = f(x) f(-x)$, maps $f$
to a ring of half the degree. Solve the equation for $N(f)$ and $N(g)$ there, lift the answer
back with $F(x) = F'(x^2)\, g(-x)$ and $G(x) = G'(x^2)\, f(-x)$, and reduce $(F, G)$ against $(f,
g)$ to keep it short. At degree 1 the equation is the extended Euclidean algorithm on two
integers. For $n = 512$ there are nine halvings down to integers and nine lifts back up.

### Key generation in full

Putting the pieces in order, Falcon's key generation is:

<div class="mars-steps" markdown>

1. Draw $f$ and $g$ with coefficients from a discrete Gaussian of width $1.17\sqrt{q/2n}$
   (about 4.05 for $n = 512$), so that $\|(g, -f)\|$ is about $1.17\sqrt q$.
2. Check the first Gram-Schmidt norm, $\|(g, -f)\| \le 1.17\sqrt q$, and the last one, the norm
   of $\bigl(q\bar f/(f\bar f + g\bar g),\; q\bar g/(f\bar f + g\bar g)\bigr)$, against the same
   bound. If either is too long, start again.
3. Check that $f$ is invertible modulo $q$ (in the NTT domain: no coefficient of $\mathrm{NTT}(f)$
   is zero). Otherwise start again.
4. Solve $fG - gF = q$ with NTRUSolve. If the integer resultants at the bottom are not coprime,
   or the coefficients of $F$ and $G$ come out too large to encode, start again.
5. Output the public key $h = g f^{-1} \bmod q$ and the private key $(f, g, F, G)$. $G$ can
   be dropped and recomputed as $G = (q + gF)/f$, which is how the private key is stored.

</div>

Step 2 needs explaining. Of the $2n$ Gram-Schmidt vectors, the first $n$ (from the rows
$x^i(g, -f)$) are no longer than $\|(g, -f)\|$; the last $n$ (from $x^i(G, -F)$) have length
about $q/\|(g, -f)\|$, because the determinant is fixed at $q^n$. The longest is smallest when
both equal $\sqrt q$: that is the $1.17\sqrt q$ of §10.3, and why one bound covers both ends.
NIST's September 2025 presentation said FIPS 206 would tighten it to $0.9999 \cdot 1.17\sqrt q$
to leave room for floating-point error.

### The NTRU equation by hand

Take $n = 2$, so the ring is $\mathbb{Z}[x]/(x^2 + 1)$ (the Gaussian integers, with $x$ playing
$i$), Falcon's $q = 12{,}289$, and the tiny key $f = 2 + x$, $g = 1 + x$.

**Down.** For $a + bx$, $N(a + bx)(x^2) = (a + bx)(a - bx) = a^2 - b^2x^2$; with $y = x^2 = -1$
that is the integer $a^2 + b^2$. So $N(f) = 5$ and $N(g) = 2$.

**Bottom.** Solve $5G' - 2F' = 12{,}289$. The extended Euclidean algorithm gives
$5 \cdot 1 + 2 \cdot (-2) = 1$; multiply by $q$: $G' = 12{,}289$, $F' = 24{,}578$. Check:
$5 \times 12{,}289 - 2 \times 24{,}578 = 61{,}445 - 49{,}156 = 12{,}289$.

**Up.** $F = F' \cdot g(-x) = 24{,}578(1 - x)$ and $G = G' \cdot f(-x) = 12{,}289(2 - x)$. Then
$fG = 12{,}289(2 + x)(2 - x) = 12{,}289 \times 5$ and $gF = 24{,}578(1 + x)(1 - x) = 24{,}578 \times
2$, so $fG - gF = q$ already holds. But $F$ and $G$ are huge.

**Reduce.** Babai's step subtracts the multiple $k(f, g)$ that best approximates $(F, G)$:
$k = \mathrm{round}\bigl((F\bar f + G\bar g)/(f\bar f + g\bar g)\bigr)$, where $\bar f = f(1/x)$ is
the adjoint ($\bar f = 2 - x$ here, since $1/x = -x$). Compute $f\bar f = 5$, $g \bar g = 2$, and

$$F\bar f + G\bar g = 24{,}578(1 - x)(2 - x) + 12{,}289(2 - x)(1 - x) = 36{,}867(1 - 3x),$$

using $(1 - x)(2 - x) = 2 - 3x + x^2 = 1 - 3x$. Divided by 7 that is $5{,}266.71 - 15{,}800.14x$,
so $k = 5{,}267 - 15{,}800x$. Subtracting,

$$F - kf = -1{,}756 + 1{,}755x, \qquad G - kg = 3{,}511 - 1{,}756x.$$

Check the equation once more: $f \cdot (3{,}511 - 1{,}756x) = 8{,}778 - x$ and $g \cdot (-1{,}756 +
1{,}755x) = -3{,}511 - x$, and their difference is $12{,}289$. A second reduction round gives
$(F\bar f + G\bar g)/7 = (-2 - x)/7$, which rounds to $0$: done.

The reduced $(F, G)$ has length $4{,}644.8$, which is exactly $q/\sqrt 7$, $q$ over the length
of $(f, g)$. Nothing better is possible: the determinant forces it. This toy key solves the
equation perfectly and would still make a terrible Falcon key, because its Gram-Schmidt norms
are $\sqrt 7 \approx 2.6$ and $4{,}645$, wildly unbalanced, so $\sigma$ would have to exceed
$4{,}645$. Step 2 above rejects it. The listing in the next section checks these numbers with
the toy's own solver.

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

```text
f*G - g*F = 12289 and the other coefficients are all zero: True
h = g/f mod q starts [8685, 6433, 432, 7153, 121, 9166]
longest coefficient of f, g: 74   of F, G: 93
```

The trapdoor is found, and $F, G$ come out about as short as $f, g$ after reduction: the key
generator drew $f, g$ with norm near $1.17\sqrt q$, so the two halves balance. The same solver
reproduces the hand computation of §10.6, where they do not:

```python
# Uses ntru_solve() from the listing above.
# The worked example of Section 10.6: n = 2, f = 2 + x, g = 1 + x.
F2, G2 = ntru_solve([2, 1], [1, 1])
print("F =", F2, " G =", G2)
print("f*G - g*F =", [a - b for a, b in zip(pmul([2, 1], G2), pmul([1, 1], F2))])
print("|(F, G)| =", round(math.sqrt(sum(x * x for x in F2 + G2)), 1), "  q/sqrt(7) =", round(Q / math.sqrt(7), 1))
```

It prints:

```text
F = [-1756, 1755]  G = [3511, -1756]
f*G - g*F = [12289, 0]
|(F, G)| = 4644.8   q/sqrt(7) = 4644.8
```

Now sign and verify with the $n = 16$ key:

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

```text
signature verifies:           True
on another message:           False
largest coefficient of s2:    413  (q = 12289 )
random s2 instead (a forgery): False
```

The signature's coefficients are a few hundred, far below $q$, while a random $s_2$ gives a
random $s_1$ of size about $q/4$ and a norm far over the bound. Forging means finding a short
$(s_1, s_2)$ with $s_1 + s_2 h = c$ for a hash-chosen $c$, which is an approximate CVP problem in
the NTRU lattice (in the real scheme, of dimension 1,024 or 2,048).

## 10.8 Fast Fourier sampling

*Level: intermediate.*

Klein's sampler on a $2n$-dimensional basis costs $O(n^2)$ operations per signature, too slow
for $n = 1{,}024$. It also needs the full Gram-Schmidt matrix: for Falcon-1024 that is
$2{,}048 \times 2{,}048$ floating-point numbers, about 34 megabytes, for one key. Falcon uses
the **fast Fourier sampler** of Ducas and Prest ("Fast Fourier Orthogonalization", ISSAC
2016): the ring structure lets the Gram-Schmidt decomposition be stored as a tree (the "Falcon
tree"), and sampling walks the tree in $O(n \log n)$ steps, like an FFT. Everything in it is
done on complex numbers in floating point, because the Gram-Schmidt values are irrational.

### Gram-Schmidt over the ring

Think of the basis as a $2 \times 2$ matrix whose entries are polynomials:

$$\mathbf{B} = \begin{pmatrix} g & -f \\ G & -F \end{pmatrix}, \qquad
\mathbf{G} = \mathbf{B}\mathbf{B}^* = \begin{pmatrix} g\bar g + f \bar f & g\bar G + f\bar F \\
G \bar g + F \bar f & G\bar G + F\bar F \end{pmatrix},$$

where $\bar a = a(1/x)$ is the adjoint of §10.6, the ring's version of a transpose. Gram-Schmidt
on two rows is one step: write $\mathbf{G} = \mathbf{L}\mathbf{D}\mathbf{L}^*$ with

$$\mathbf{L} = \begin{pmatrix} 1 & 0 \\ L_{10} & 1 \end{pmatrix}, \quad
L_{10} = \frac{G_{10}}{G_{00}}, \quad D_{00} = G_{00}, \quad D_{11} = G_{11} - \frac{G_{10}\,\bar
G_{10}}{G_{00}}.$$

$L_{10}$ says how much of the first row to subtract from the second; $D_{00}$ and $D_{11}$ are
the squared lengths of the two orthogonalized rows. In the FFT domain, where a polynomial is
stored as its values at the $n$ complex roots of $x^n + 1$, the "$2 \times 2$ matrix of
polynomials" is $n$ independent $2 \times 2$ problems on complex numbers.

But this is not yet the full Gram-Schmidt of the $2n$ integer rows. $D_{00}$ is a polynomial, and
the $n$ rows $x^i(g, -f)$ it describes are not orthogonal to each other. Ducas and Prest's
second idea finishes the job recursively. Split any polynomial into its even and odd parts,
$d(x) = d_0(x^2) + x\, d_1(x^2)$. Seen over the ring of degree $n/2$, where every polynomial
becomes such a pair, a self-adjoint $d$ (one with $\bar d = d$, as every $D$ is) becomes the
$2 \times 2$ Gram matrix

$$\begin{pmatrix} d_0 & d_1 \\ \bar d_1 & d_0 \end{pmatrix},$$

which has its own $\mathbf{L}\mathbf{D}\mathbf{L}^*$, whose $D$ entries split again, down to
degree 1, where everything is a number. In the FFT domain
the split is cheap: the values at a pair of roots $\pm\zeta$ give the values of $d_0$ and $d_1$ at
$\zeta^2$.

### The Falcon tree

The result is a binary tree (Figure 10.5). Each internal node stores one $L_{10}$, as a
polynomial whose degree halves at each level; each leaf stores one squared Gram-Schmidt norm, and
there are $2n$ leaves, one per row of the integer basis. Falcon precomputes the tree once per
key and replaces each leaf $d$ by $\sigma/\sqrt d$, the width of the one-dimensional Gaussian
that Klein's algorithm would use at that step. The whole tree holds a little over $n \log_2 n$
numbers; Pornin's implementation reports a signing context of about 114 kB for Falcon-1024
(about 82 kB in a compact mode), against tens of megabytes for Klein's matrix.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="The Falcon tree for n = 4: the root holds L10 with 4 values; two children, from splitting D00 and D11, hold 2 values each; four nodes below hold 1 value each; eight leaves hold sigma over the Gram-Schmidt norms; leaves are sampled from right to left" fill="currentColor" font-size="12">
  <path d="M320,52L160,100M320,52L480,100M160,128L80,170M160,128L240,170M480,128L400,170M480,128L560,170M80,194L40,236M80,194L120,236M240,194L200,236M240,194L280,236M400,194L360,236M400,194L440,236M560,194L520,236M560,194L600,236" stroke="currentColor" stroke-width="1.2" fill="none"/>
  <g fill="currentColor" fill-opacity=".08" stroke="currentColor">
    <rect x="245" y="20" width="150" height="32"/>
    <rect x="100" y="100" width="120" height="28"/><rect x="420" y="100" width="120" height="28"/>
    <rect x="45" y="170" width="70" height="24"/><rect x="205" y="170" width="70" height="24"/>
    <rect x="365" y="170" width="70" height="24"/><rect x="525" y="170" width="70" height="24"/>
  </g>
  <g text-anchor="middle">
    <text x="320" y="41">root: L₁₀ (4 values)</text>
    <text x="160" y="119">L (2 values)</text><text x="480" y="119">L (2 values)</text>
    <text x="80" y="187">L (1)</text><text x="240" y="187">L (1)</text>
    <text x="400" y="187">L (1)</text><text x="560" y="187">L (1)</text>
    <text x="160" y="90" fill-opacity=".7">split D₀₀</text><text x="480" y="90" fill-opacity=".7">split D₁₁</text>
  </g>
  <path d="M28,248a12,12 0 1,0 24,0a12,12 0 1,0 -24,0M108,248a12,12 0 1,0 24,0a12,12 0 1,0 -24,0M188,248a12,12 0 1,0 24,0a12,12 0 1,0 -24,0M268,248a12,12 0 1,0 24,0a12,12 0 1,0 -24,0M348,248a12,12 0 1,0 24,0a12,12 0 1,0 -24,0M428,248a12,12 0 1,0 24,0a12,12 0 1,0 -24,0M508,248a12,12 0 1,0 24,0a12,12 0 1,0 -24,0M588,248a12,12 0 1,0 24,0a12,12 0 1,0 -24,0" fill="none" stroke="currentColor"/>
  <text x="40,120,200,280,360,440,520,600" y="252" text-anchor="middle" font-size="11">87654321</text>
  <text x="320" y="284" text-anchor="middle" fill-opacity=".7">leaves: σ/‖b̃ᵢ‖, one per basis row; numbers give the order in which ffSampling draws them</text>
</svg>
<figcaption>Figure 10.5. The Falcon tree for $n = 4$ (a basis of 8 integer rows). Internal nodes
hold the $L_{10}$ factors of each $\mathbf{L}\mathbf{D}\mathbf{L}^*$ step, as polynomials with 4, 2
and 1 coefficients; the 8 leaves hold the Gaussian widths. Sampling works right to left, like Klein's
algorithm from the last Gram-Schmidt vector to the first.</figcaption>
</figure>

**Sampling.** To sign, compute the target $\mathbf{t} = (c, 0)\,\mathbf{B}^{-1}$. Since $\det
\mathbf{B} = q$, $\mathbf{B}^{-1} = \frac{1}{q}\begin{pmatrix} -F & f \\ -G & g\end{pmatrix}$ and
$\mathbf{t} = (-cF/q,\; cf/q)$, two polynomials with real coefficients. Then

<div class="mars-steps" markdown>

1. Sample the second half first: $z_1 \leftarrow \mathrm{ffSampling}(t_1, \text{right subtree})$.
2. Correct the first half for what that choice did: $t_0' = t_0 + (t_1 - z_1)\,L_{10}$.
3. Sample $z_0 \leftarrow \mathrm{ffSampling}(t_0', \text{left subtree})$.
4. At a subtree, split the target into its even and odd halves and repeat steps 1 to 3 one level
   down; at a leaf, draw one integer from a discrete Gaussian centered at the target with the
   leaf's width.

</div>

The output $\mathbf{z} = (z_0, z_1)$ has integer coefficients, $\mathbf{v} = \mathbf{z}\mathbf{B}$ is
a lattice point near $(c, 0)$, and $(s_1, s_2) = (c, 0) - \mathbf{v}$. Step 2 is Klein's
"subtract that multiple and move on" for half the coordinates at once. Each of the $\log_2 n$
levels costs $O(n)$: $O(n \log n)$ in all.

### The tree by hand, $n = 2$

The key of §10.6, $f = 2 + x$, $g = 1 + x$, $F = -1{,}756 + 1{,}755x$, $G = 3{,}511 - 1{,}756x$,
is small enough to build its tree by hand. The FFT domain for $x^2 + 1$ is evaluation at
$x = i$ and $x = -i$.

- $G_{00} = g\bar g + f\bar f = 2 + 5 = 7$, a constant (for $n = 2$, $a\bar a = a_0^2 + a_1^2$).
- $G_{10} = G\bar g + F\bar f$, which was computed in the last reduction round of §10.6: $-2 - x$.
- The root stores $L_{10} = (-2 - x)/7$, that is, the values $(-2 - i)/7 \approx -0.286 - 0.143i$
  and $(-2 + i)/7$.
- $D_{00} = 7$. Split: $d_0 = 7$, $d_1 = 0$, so the left child's Gram matrix is diagonal, its
  $L$ is $0$ and its leaves are $7$ and $7$: the rows $(g, -f)$ and $x(g, -f)$ are already
  orthogonal, each of length $\sqrt 7$.
- $D_{11} = G_{11} - |G_{10}|^2 / 7$. At $x = i$, $|G(i)|^2 + |F(i)|^2 = 15{,}410{,}657 +
  6{,}163{,}561 = 21{,}574{,}218$ and $|G_{10}(i)|^2 = 5$, so $D_{11} = 21{,}574{,}218 - 5/7 =
  21{,}574{,}217.29$, the same at $x = -i$. That is $q^2/7$ exactly, and the right child's leaves
  are $q^2/7$ twice.

The four leaves, $7, 7, q^2/7, q^2/7$, are the squared Gram-Schmidt norms; their product is
$q^4 = (\det \mathbf{B})^2$, as it must be. And there is the unbalanced key of §10.6 again, now
in the tree: leaf widths $\sigma/\sqrt 7$ and $\sigma\sqrt 7/q$ differ by a factor of $q/7 \approx
1{,}756$.

**Code it.** The fast Fourier sampler on the $n = 16$ toy key of §10.7, with a real FFT,
the split and merge maps, the tree, and ffSampling. It checks the leaves against Klein's
Gram-Schmidt norms, signs with the tree, verifies with the verifier of §10.7, and compares the
average signature size of the two samplers.

```python
# Uses sign() and verify() from the listing above.
# Fast Fourier sampling: the Falcon tree (ffLDL) and ffSampling, on the same toy key.
import cmath

ROOTS = {1: [-1 + 0j]}                   # roots of x^n + 1, ordered so that pairs (z, -z) sit side by side
def roots(n):
    if n not in ROOTS:
        ROOTS[n] = [s * z for r in roots(n // 2) for z in (1, -1) for s in [cmath.sqrt(r)]]
    return ROOTS[n]

def merge(a0, a1):                       # values of f0, f1 at the half-size roots -> values of f
    out = []
    for i, z in enumerate(roots(2 * len(a0))[0::2]):
        out += [a0[i] + z * a1[i], a0[i] - z * a1[i]]
    return out

def split(a):                            # the inverse: f(x) = f0(x^2) + x f1(x^2)
    zs = roots(len(a))[0::2]
    return ([(a[2 * i] + a[2 * i + 1]) / 2 for i in range(len(zs))],
            [(a[2 * i] - a[2 * i + 1]) / (2 * zs[i]) for i in range(len(zs))])

def fft(p):
    return [complex(p[0])] if len(p) == 1 else merge(fft(p[0::2]), fft(p[1::2]))

def ifft(a):
    if len(a) == 1:
        return [a[0].real]
    a0, a1 = split(a)
    out = [0.0] * len(a)
    out[0::2], out[1::2] = ifft(a0), ifft(a1)
    return out

def ffldl(G00, G01, G11):
    """The Falcon tree of a 2x2 Gram matrix (entries in FFT form): G = L D L*."""
    L10 = [b.conjugate() / a for a, b in zip(G00, G01)]
    D11 = [c - abs(b) ** 2 / a for a, b, c in zip(G00, G01, G11)]
    if len(G00) == 1:
        return (L10, G00[0].real, D11[0].real)          # leaves: squared Gram-Schmidt norms
    kids = []
    for d in (G00, D11):
        d0, d1 = split(d)
        kids.append(ffldl(d0, d1, d0))
    return (L10, kids[0], kids[1])

def leaves(T):
    return [T] if isinstance(T, float) else leaves(T[1]) + leaves(T[2])

def ffsampling(t0, t1, T):
    L10, T0, T1 = T
    z1 = sample_half(t1, T1)             # right half first, as Klein does with the last vector
    t0 = [a + (b - c) * l for a, b, c, l in zip(t0, t1, z1, L10)]
    return sample_half(t0, T0), z1

def sample_half(t, T):
    if isinstance(T, float):             # a leaf: one integer, as in Klein's algorithm
        return [complex(gauss_int(t[0].real, SIGMA / math.sqrt(T)))]
    a0, a1 = split(t)
    return merge(*ffsampling(a0, a1, T))

fg, ff, fG, fF = fft(g), fft(f), fft(G), fft(F)       # basis rows (g, -f) and (G, -F)
tree = ffldl([abs(a) ** 2 + abs(b) ** 2 for a, b in zip(fg, ff)],
             [a * c.conjugate() + b * d.conjugate() for a, b, c, d in zip(fg, ff, fG, fF)],
             [abs(a) ** 2 + abs(b) ** 2 for a, b in zip(fG, fF)])
lv = sorted(math.sqrt(x) for x in leaves(tree))
print("leaves:", len(lv), " smallest", round(lv[0], 1), " largest", round(lv[-1], 1),
      " (Klein's largest:", round(max(gs_norm), 1), ")")
print("product of leaves / q^n =", round(math.prod(lv) / Q ** N, 6))

def ff_sign(msg):
    salt = random.getrandbits(320).to_bytes(40, "big")
    fc = fft(hash_to_point(salt, msg))
    t0 = [-c * F_ / Q for c, F_ in zip(fc, fF)]        # (t0, t1) = (c, 0) * B^-1
    t1 = [c * f_ / Q for c, f_ in zip(fc, ff)]
    z0, z1 = (list(map(round, ifft(z))) for z in ffsampling(t0, t1, tree))
    return salt, [a + b for a, b in zip(pmul(z0, f), pmul(z1, F))]   # s2 = z0*f + z1*F

random.seed(1)
sig = ff_sign(b"open the north airlock")
print("ffSampling signature verifies:", verify(b"open the north airlock", sig))
norms = lambda sg: sum(x * x for x in sg[1])
a = sum(norms(sign(b"m%d" % i)) for i in range(300)) / 300
b = sum(norms(ff_sign(b"m%d" % i)) for i in range(300)) / 300
print("mean |s2|^2, Klein:", round(a), "  ffSampling:", round(b), "  expected N*sigma^2:", round(N * SIGMA ** 2))
```

It prints:

```text
leaves: 32  smallest 89.1  largest 137.9  (Klein's largest: 137.9 )
product of leaves / q^n = 1.0
ffSampling signature verifies: True
mean |s2|^2, Klein: 685379   ffSampling: 672164   expected N*sigma^2: 684396
```

The tree has $2n = 32$ leaves, and they are the Gram-Schmidt norms of the basis taken in a
different order than Klein's: the largest is the same, and their product is $q^n$, the
determinant. Signatures from the tree verify, and their average size matches Klein's and the
prediction $N\sigma^2$ within the noise of 300 samples. The two samplers draw from the same
distribution; the tree just gets there in $O(n \log n)$ steps instead of $O(n^2)$. The real
Falcon adds what the toy lacks: an FFT ordered for speed, a precomputed tree with the leaves
already normalized, and a constant-time integer sampler at the leaves.

## 10.9 The real Falcon

*Level: expert.*

The toy has Falcon's structure; the real scheme adds parameters chosen to the last bit, an
encoding, and a great deal of care in the sampler. Table 10.1 gives the numbers.

| | Falcon-512 | Falcon-1024 |
|---|---|---|
| NIST category | 1 | 5 |
| $n$, $q$ | 512, 12,289 | 1,024, 12,289 |
| $\sigma$ (signing) | 165.74 | 168.39 |
| $\sigma_{\min}$ (smallest leaf width) | 1.2778 | 1.2983 |
| public key | 897 B | 1,793 B |
| private key | 1,281 B | 2,305 B |
| signature (padded format) | 666 B | 1,280 B |
| signature bound $\beta^2$ | 34,034,726 | 70,265,242 |

*Table 10.1. Falcon parameters from the round 3 specification (version 1.2); §10.5 derives
$\sigma$, $\sigma_{\min}$ and $\beta^2$. FIPS 206 may change details; as of 9 November 2026 there
is no public draft to check against.*

Next to ML-DSA-44's 1,312-byte key and 2,420-byte signature, Falcon-512 is about 3.6 times
smaller in signature and 1.5 times in key. Public key plus signature is 1,563 bytes against
3,732. The public key is just $h$: 512 coefficients of 14 bits each ($2^{14} > 12{,}289$) is
896 bytes, plus one header byte. The private key stores $f$ and $g$ in 6 bits per coefficient
and $F$ in 8, plus a header: $1 + 384 + 384 + 512 = 1{,}281$ bytes.

### Speed

Thomas Pornin's Rust implementation of FN-DSA (rust-fn-dsa, as of November 2026) reports these
counts on an Intel Core i5-8259U, a 2018 laptop processor:

| clock cycles | key generation | sign | verify |
|---|---|---|---|
| Falcon-512 | 8.91 million | 1.13 million | 63,300 |
| Falcon-1024 | 34.5 million | 2.14 million | 124,000 |

At the chip's 2.3 GHz base clock that is about 0.5 ms to sign and 28 µs to verify with
Falcon-512: roughly 2,000 signatures and 36,000 verifications per second on one core, and
signing again with the same expanded tree is nearly 20 percent faster. Pornin's notes put
verification at about the speed of RSA-2048's and signing at about 2.5 times faster. Without a
floating-point unit, signing slows down a lot (the arithmetic must be emulated); verification
does not.

### Compressing a signature

The coefficients of $s_2$ are roughly Gaussian with standard deviation $\sigma \approx 166$, so
most fit in 9 bits, a few need 10 or 11. Falcon writes each coefficient as:

- one **sign bit** (1 for negative),
- the **low 7 bits** of $|s|$ in binary,
- the **high bits**, $|s| \gg 7$, in **unary**: that many 0s, then a 1.

By hand: $s = 5$ is `0`, `0000101`, then $5 \gg 7 = 0$ so just `1`: nine bits, `000001011`.
$s = -300$: $300 = 2 \cdot 128 + 44$, so `1`, `0101100` (44), then `001` for the 2: eleven bits,
`10101100001`. Unary is the right code for the high part because large values are
exponentially rare: a Gaussian with $\sigma = 166$ puts about 56 percent of its coefficients
below 128 in absolute value, 32 percent between 128 and 255, 10 percent between 256 and 383,
and almost nothing above. Figure 10.6 draws the two examples.

<figure class="mars-fig">
<svg viewBox="0 0 640 200" width="640" role="img" aria-label="Falcon compression of two coefficients. 5 becomes sign 0, low bits 0000101, unary 1: nine bits. Minus 300 becomes sign 1, low bits 0101100, unary 001: eleven bits" fill="currentColor" font-size="13">
  <g text-anchor="middle" fill-opacity=".7" font-size="12">
    <text x="155" y="28">sign</text><text x="263" y="28">low 7 bits of |s|</text><text x="470" y="28">|s| ≫ 7 in unary (0s, then 1)</text>
  </g>
  <text x="20" y="72">s = 5</text><text x="20" y="132">s = −300</text>
  <g fill="none" stroke="currentColor">
    <rect x="140" y="50" width="30" height="34" fill="currentColor" fill-opacity=".15"/>
    <rect x="180" y="50" width="168" height="34"/>
    <rect x="358" y="50" width="24" height="34" fill="currentColor" fill-opacity=".08"/>
    <rect x="140" y="110" width="30" height="34" fill="currentColor" fill-opacity=".15"/>
    <rect x="180" y="110" width="168" height="34"/>
    <rect x="358" y="110" width="72" height="34" fill="currentColor" fill-opacity=".08"/>
  </g>
  <path d="M204,50v34M228,50v34M252,50v34M276,50v34M300,50v34M324,50v34M204,110v34M228,110v34M252,110v34M276,110v34M300,110v34M324,110v34M382,110v34M406,110v34" stroke="currentColor" stroke-opacity=".4"/>
  <g text-anchor="middle" font-family="monospace" font-size="15">
    <text x="155,192,216,240,264,288,312,336,370" y="73">000001011</text>
    <text x="155,192,216,240,264,288,312,336,370,394,418" y="133">10101100001</text>
  </g>
  <text x="450" y="73" fill-opacity=".7">9 bits</text><text x="450" y="133" fill-opacity=".7">11 bits (300 = 2·128 + 44)</text>
  <text x="20" y="180" fill-opacity=".7">Falcon-512: about 9.6 bits per coefficient on average; entropy 9.42.</text>
</svg>
<figcaption>Figure 10.6. Falcon's compressed encoding of a signature coefficient. The sign and
low seven bits are written as they are; the rare high part is written in unary, so a typical
coefficient costs 9 or 10 bits.</figcaption>
</figure>

**Code it.** Compress 512 Gaussian coefficients with Falcon-512's $\sigma$ and count.

```python
# Falcon's signature compression: sign bit, 7 low bits, the high bits in unary.
import math, random
random.seed(512)

def compress(s):
    bits = ""
    for x in s:
        a = abs(x)
        bits += ("1" if x < 0 else "0") + format(a & 127, "07b") + "0" * (a >> 7) + "1"
    return bits

def decompress(bits, n):
    s, i = [], 0
    for _ in range(n):
        neg, low, i = bits[i] == "1", int(bits[i + 1:i + 8], 2), i + 8
        high = 0
        while bits[i] == "0":
            high, i = high + 1, i + 1
        i += 1
        a = (high << 7) + low
        if neg and a == 0:
            return None                  # "minus zero" is refused: one encoding per signature
        s.append(-a if neg else a)
    return s

print("by hand:", compress([5]), compress([-300]))
SIGMA = 165.736617183                    # Falcon-512's signing sigma
s2 = [round(random.gauss(0, SIGMA)) for _ in range(512)]
bits = compress(s2)
print("round trip ok:", decompress(bits, 512) == s2)
print("bits per coefficient:", round(len(bits) / 512, 2),
      "  entropy of the Gaussian:", round(math.log2(SIGMA * math.sqrt(2 * math.pi * math.e)), 2))
print("signature bytes: 1 header + 40 salt +", math.ceil(len(bits) / 8), "=", 41 + math.ceil(len(bits) / 8),
      " (padded format: 666)")
```

It prints:

```text
by hand: 000001011 10101100001
round trip ok: True
bits per coefficient: 9.6   entropy of the Gaussian: 9.42
signature bytes: 1 header + 40 salt + 615 = 656  (padded format: 666)
```

The code spends 9.6 bits where an ideal code would spend 9.42: within 2 percent of the entropy,
with a decoder of ten lines. The decoder refuses "minus zero" (sign bit 1 on a zero value) so that
every $s_2$ has exactly one encoding; otherwise one signature could be turned into a second,
different-looking valid one, which breaks strong unforgeability. A full signature is a header
byte, the 40-byte salt and the compressed $s_2$. Compressed lengths vary from signature to
signature; the padded format reserves 625 bytes for $s_2$ in Falcon-512, pads shorter ones with
zeros, and makes the signer start again in the rare case that the compressed $s_2$ does not fit.

### The floating-point problem

Falcon's sampler needs floating-point numbers with 53-bit precision, and that is its
practical weakness.

- **Portability.** Results must not depend on how a compiler or processor rounds. The
  specification fixes the operations precisely, and the reference code includes an emulation
  of IEEE double arithmetic with integers (by Thomas Pornin) for platforms without a reliable
  floating-point unit. It is several times slower.
- **Constant time.** On some processors floating-point operations take variable time for
  special values (for example subnormal numbers), and the Gaussian sampler's rejection loop
  must not leak its inputs. Writing it so that timing reveals nothing is delicate. Even
  hardware that looks safe may not be: Pornin's FN-DSA code lets the user switch off the
  hardware division and square root on the SiFive U74 RISC-V core, whose division time depends
  on its operands.
- **Exactness.** A floating-point mistake that would be harmless in a physics simulation can
  be fatal here, because the distribution of the signatures is the security property. NIST's
  September 2025 presentation said FIPS 206 will require signing to match the known-answer tests
  exactly, and will fix the order of operations and forbid fused multiply-add, so that two
  correct implementations produce bit-identical signatures from the same randomness. Key
  generation, by contrast, will not have to match exactly, since small differences in how keys
  are distributed cost little security.

Verification has none of these problems: it is integer-only and simple. So the practical
advice is: verify Falcon anywhere; sign with it only where the implementation and the hardware
have been chosen carefully. NIST's choice of ML-DSA as the primary signature, with Falcon for
size-critical uses, follows from this.

### Side channels on the sampler, 2019 to 2025

Each physical attack on Falcon found a new place where the key leaks, and two brought back the
parallelepiped of §10.4. The attacker's methods (power traces, electromagnetic probes, faults)
are explained in [Cryptanalysis, Chapter 17](../cryptanalysis/17-Side-Channels-the-Attackers-View.md).

- **2019, faults.** Sarah McCarthy, James Howe, Neil Smyth, Séamus Brannigan and Máire O'Neill
  ("BEARZ Attack FALCON", SECRYPT 2019) gave the first fault analysis of Falcon and found its
  trapdoor sampler as vulnerable to faults as earlier GPV samplers: their simulated attack
  recovered the key every time. Countermeasures cost up to 30 percent in key generation and
  about 5 percent in signing.
- **2020, timing.** Pierre-Alain Fouque, Paul Kirchner, Mehdi Tibouchi, Alexandre Wallet and
  Yang Yu (EUROCRYPT 2020) noticed that a sampler whose running time depends on its width
  $\sigma/\|\tilde{\mathbf b}_i\|$ leaks the Gram-Schmidt norms, the leaves of the tree, and that
  the whole key can be rebuilt from those norms. They demonstrated it on the earlier DLP scheme
  (about $2^{35}$ timing traces); for Falcon the recovery was left open. Falcon's round 3 code
  closed the leak with the isochronous sampler of Howe, Prest, Ricosset and Rossi (PQCrypto
  2020), whose running time does not depend on the width.
- **2021, the FFT.** Emre Karabulut and Aydin Aysu ("FALCON Down", DAC 2021) measured the
  electromagnetic leak of the floating-point multiplications in the FFT that combine the secret
  basis with the hashed message, recovering sign, exponent and mantissa of the secret values,
  and so the key, from about 10,000 measurements of the reference code on an ARM Cortex-M4.
- **2022, the base sampler.** Morgane Guerreau, Ange Martinelli, Thomas Ricosset and Mélissa
  Rossi ("The Hidden Parallelepiped Is Back Again", TCHES 2022) read the output of the base
  sampler, the integer draw at the leaves, by simple power analysis. Those values are not the
  key, but keeping only the signatures with particular sampler outputs leaves a distribution
  shaped by a hidden parallelepiped, and Nguyen and Regev's learning attack applies. They recovered a full Falcon-512 key with as few
  as 5,000 traces on a ChipWhisperer board with a Cortex-M4.
- **2023, the sign bit.** Shiduo Zhang, Xiuhan Lin, Yang Yu and Weijia Wang ("Improved Power
  Analysis Attacks on Falcon", EUROCRYPT 2023) used the random sign flip inside the integer
  sampler: 170,000 traces recovered a Falcon-512 key in about half an hour, and 45,000 sufficed
  with the base-sampler leak added. Their key recovery uses covariance statistics, like the first
  step of §10.5's Fix it, instead of fourth moments. A 2025 follow-up by the same group reports
  needing at least 85 percent fewer traces.
- **2025, floating-point error.** Xiuhan Lin, Mehdi Tibouchi, Yang Yu and Shiduo Zhang ("Do Not
  Disturb a Sleeping Falcon", EUROCRYPT 2025) showed that the fast Fourier sampler is unusually
  sensitive to tiny floating-point discrepancies: run twice on the same target with slightly
  different arithmetic (for example Falcon's own "dynamic" and "tree" signing paths), about once
  in a few thousand calls it returns two lattice points whose difference reveals the key. Salted
  Falcon is protected because targets never repeat; derandomized variants are not. It is the
  rule of §10.5, never sign the same point twice, broken by rounding error.

The defenses are constant-time samplers, masking (much harder for Gaussian sampling and
floating point than for ML-DSA's integer arithmetic), and design changes: Mitaka and Antrag
(§10.11) use samplers that are easier to protect, and HAWK avoided floating point altogether. For the engineering side of constant-time code see
[Chapter 17](17-Implementing-Post-Quantum-Safely.md) and [Engineering, Chapter
5](../engineering/05-Constant-Time-Programming.md).

## 10.10 FN-DSA and the real world

*Level: expert.*

**Status, dated.** What is publicly known, as of 9 November 2026:

- **July 2022.** NIST selected Falcon for standardization, alongside Kyber, Dilithium and
  SPHINCS+, and later named the coming standard FIPS 206, FN-DSA ("FFT over NTRU-Lattice-Based
  Digital Signature Algorithm").
- **August 2024.** FIPS 203, 204 and 205 were published as final standards. FN-DSA was not
  among them; NIST said its draft would follow.
- **28 August 2025.** Dustin Moody of NIST wrote on the public pqc-forum list that the draft
  FN-DSA standard was essentially complete and had been submitted up the chain for approval
  for publication.
- **25 September 2025.** At NIST's 6th PQC Standardization Conference, Ray Perlner's "FIPS 206
  Status Update" said NIST expected to release an initial public draft "soon", that it was
  "basically written, awaiting approval", and previewed the planned changes listed below,
  marked provisional.
- **November 2026.** No initial public draft of FIPS 206 has been published. NIST's address where
  it would appear (csrc.nist.gov/pubs/fips/206/ipd) returns "not found", and no comment period
  has been announced. Some commercial websites describe FIPS 206 as published in draft; no NIST
  source confirms that.

Until a draft appears, implementations follow the round 3 specification, as this chapter
does, and should expect changes. The September 2025 presentation listed these, all marked
provisional:

- **Like FIPS 204 and 205:** "pure" and pre-hash versions, little-endian encodings, SHAKE for
  sampling, and the BUFF transform, which binds a signature to its public key ([Chapter
  3](03-KEMs-and-Signatures.md)).
- **Unlike them:** randomized signing only (the reason is in §10.5); no export of seeds, since
  key generation need not expand a seed identically everywhere; the FFT basis and tree may be
  cached but should not be exported.
- **Small changes:** an infinity-norm bound on signatures as well as the Euclidean one; 79
  random bits per base-sampler draw instead of 72; the key bound lowered to $0.9999 \cdot
  1.17\sqrt q$; signing fails if any tree leaf falls outside $[\sigma_{\min}, \sigma_{\max}]$; the
  private key stored as $f, g, F$ and a hash of the public key.
- **Validation:** verification and signing must match the known-answer tests exactly; key
  generation need only pass its checks. NIST also asked whether to add a message-recovery mode
  and a fixed-point signer.

**Uses.** Falcon's small size makes it attractive for certificates and for systems that store
many signatures. Several TLS experiments have measured Falcon in certificate chains, and
open-source libraries such as liboqs ship it under its round 3 name. Its split personality,
hard to sign safely and easy to verify anywhere, suggests a natural division of labor: signatures
made rarely, offline, on carefully chosen hardware (a certificate authority's intermediate
certificates, a firmware vendor's releases), and checked by millions of devices. Large
deployments are waiting for FIPS 206.

**HAWK.** A newer lattice signature, HAWK, used the same kind of NTRU-module trapdoor but
sampled over the integer lattice $\mathbb{Z}^{2n}$ instead of a Gaussian over a skewed
lattice, avoiding floating point. Its security rested on a lattice isomorphism problem. It
reached round 3 of NIST's additional signature process in May 2026 and was withdrawn by its
team in July 2026 after a new lattice-reduction attack ([Chapter
15](15-Multivariate-Signatures-and-the-On-Ramp.md) tells the story). As of November 2026 no
lattice candidate remains in that process, so FN-DSA is the only compact lattice
hash-and-sign signature on NIST's path.

!!! note "Life story: Falcon"
    **Born:** submitted to NIST's post-quantum call in November 2017 by Pierre-Alain Fouque,
    Jeffrey Hoffstein, Paul Kirchner, Vadim Lyubashevsky, Thomas Pornin, Thomas Prest, Thomas
    Ricosset, Gregor Seiler, William Whyte and Zhenfei Zhang, on the GPV framework (2008), the
    NTRU instantiation of Ducas, Lyubashevsky and Prest (2014) and fast Fourier sampling
    (Ducas and Prest, 2016) · **Purpose:** the smallest public key plus signature of any
    practical lattice signature · **Helped:** showed that hash-and-sign over lattices can be
    made provably leak-free and fast; a model for Mitaka, Antrag and HAWK · **Status:** round 3
    finalist (2020), selected in July 2022, to become FN-DSA in FIPS 206; no public draft as of
    November 2026.

**Mars.** Arcadia City's habitat sensors log readings with a signature each, kept for years.
With Falcon-512 a signed reading costs about 700 bytes of storage instead of about 2,500, and
the city's archive verifies old logs with integer arithmetic only. The signing happens in
one secured server, not on the sensors themselves, so the hard part of Falcon stays where it
can be done carefully.

The same split fits the city's firmware. Updates for the airlock controllers are signed on Earth
and arrive 3 to 22 minutes later; asking Earth anything takes a 6 to 44 minute round trip, so
each controller must decide alone whether an update is genuine. Falcon-512 verification needs
only $h$, one product modulo $12{,}289$ and a norm, with no floating point. The signing key stays
in the vendor's hardened signing room. And a signing service that retries after a slow
acknowledgment must draw a fresh salt each time, never recompute "the same signature" (§10.5).

## 10.11 Going deeper

*Level: expert.*

- **The Falcon specification** (version 1.2, 2020) explains the tree sampler, the base sampler
  and the encoding in detail; Pornin's implementation notes ("New Efficient, Constant-Time
  Implementations of Falcon", 2019) cover constant-time floating point.
- **Gaussian sampling.** Micciancio and Walter's "Gaussian Sampling over the Integers" (CRYPTO
  2017) and Howe, Prest, Ricosset and Rossi's "Isochronous Gaussian Sampling" (PQCrypto 2020)
  show how to sample without leaks. Peikert's "An Efficient and Parallel Gaussian Sampler for
  Lattices" (CRYPTO 2010) gives the other classic sampler, a convolution instead of Klein's
  nearest-plane walk; it needs a wider $\sigma$ but is simpler and, as "Do Not Disturb a
  Sleeping Falcon" showed, stable under small floating-point errors.
- **Trapdoors in general lattices.** Micciancio and Peikert's "Trapdoors for Lattices"
  (EUROCRYPT 2012) gives the standard construction outside NTRU, used in identity-based
  encryption and advanced protocols.
- **Mitaka and Antrag.** Mitaka (Espitau and others, EUROCRYPT 2022) replaces the fast Fourier
  sampler with Prest's simpler hybrid sampler, easier to mask and free of the tree, at a small
  cost in signature size; Antrag (ASIACRYPT 2023) generates NTRU trapdoors with better-balanced
  Gram-Schmidt norms, which wins back most of that cost.
- **Breaking NTRU-like lattices.** Ducas and van Woerden, "NTRU Fatigue" (ASIACRYPT 2021),
  maps exactly where the overstretched regime begins; the attacks on lattice parameters in
  general are in [Cryptanalysis, Chapter
  16](../cryptanalysis/16-Breaking-Post-Quantum-Candidates.md#168-lattices-attacks-that-moved-the-parameters).

## Check yourself

??? question "1. In textbook NTRU, why does reducing a = f·e mod q to the centered range give the exact integer polynomial p·r·g + f·m, and when does it fail?"

    Because $f, g, r, m$ have tiny coefficients, every coefficient of $p\,rg + fm$ is usually
    smaller than $q/2$ in absolute value, so the centered representative is the integer itself.
    If one reaches $q/2$ it wraps and decryption fails (about 6 percent of the time for the
    toy), which leaks information about $f$. Modern NTRU picks $q$ so that it never happens.

??? question "2. What did Nguyen and Regev's attack learn from GGH and NTRUSign signatures?"

    The differences between the hashed points and the signatures are uniform in the
    parallelepiped spanned by the secret basis. From enough of them (a few hundred for
    NTRUSign) the attack recovers the parallelepiped and so the basis.

??? question "3. With deterministic rounding, the covariance of t − s is BᵀB/12. Why 12?"

    Each coordinate in the secret basis is uniform on $[-\tfrac12, \tfrac12)$, whose variance is
    $1/12$; transforming by $B$ gives $B^T B / 12$.

??? question "4. In the GPV security proof, how does the simulator answer signing queries without the trapdoor?"

    Backwards: it samples a short $(s_1, s_2)$ from the Gaussian, sets $c = s_1 + s_2 h$, and
    programs the random oracle so that $H(m) = c$. A wide Gaussian makes $c$ look uniform and
    $(s_1, s_2)$ look exactly like a real signature. A forgery then gives a second short preimage
    of some $c$: a short lattice vector.

??? question "5. Why must Falcon never produce two signatures for the same hashed point, and what stops it?"

    Two samples near the same target differ by a short lattice vector; enough of them reveal the
    secret basis (the listing in §10.5 does it). Falcon hashes a fresh 40-byte salt with every
    message, so targets never repeat.

??? question "6. Falcon-512 uses σ = 165.74. Where does that number come from?"

    $\sigma = \eta_\varepsilon(\mathbb{Z}^{2n}) \cdot 1.17\sqrt q$: the smoothing parameter
    $\frac{1}{\pi}\sqrt{\ln(4n(1 + 1/\varepsilon))/2} = 1.2778$ for $n = 512$ and $\varepsilon =
    1/\sqrt{2^{64} \cdot 128}$, times the largest Gram-Schmidt norm key generation allows,
    $1.17\sqrt{12{,}289} = 129.70$.

??? question "7. The key f = 2 + x, g = 1 + x (n = 2) solves fG − gF = q perfectly. Why would Falcon reject it?"

    Its Gram-Schmidt norms are $\sqrt 7 \approx 2.6$ for the rows from $(g, -f)$ and $q/\sqrt 7
    \approx 4{,}645$ for the rows from $(G, -F)$, because their product is fixed by the
    determinant. $\sigma$ must exceed the largest, so signatures would be enormous. Falcon
    requires both to be at most $1.17\sqrt q \approx 129.7$, which forces $\|(f, g)\|$ close to
    $\sqrt q$.

??? question "8. What does the Falcon tree store, and what must the product of its leaves be?"

    Each internal node stores the $L_{10}$ factor of one $\mathbf{L}\mathbf{D}\mathbf{L}^*$
    decomposition, as a polynomial whose degree halves at each level; the $2n$ leaves store the
    squared Gram-Schmidt norms of the basis (in Falcon, already turned into widths
    $\sigma/\|\tilde{\mathbf b}_i\|$). The product of the Gram-Schmidt norms is the determinant,
    $q^n$.

??? question "9. Encode s = −300 and s = 5 in Falcon's compressed format. Why unary for the high part?"

    $-300$: sign `1`, low seven bits of 300 = 44 = `0101100`, high part $300 \gg 7 = 2$ as `001`:
    `10101100001`. $5$: `0`, `0000101`, `1`: `000001011`. Large values are exponentially rare
    in a Gaussian, so a unary code, short for 0 and 1, is close to optimal (9.6 bits against an
    entropy of 9.42).

??? question "10. Why is Falcon's signing harder to protect than ML-DSA's, and what is FN-DSA's status as of November 2026?"

    It samples Gaussians in 53-bit floating point, whose leaks have been exploited in the FFT
    (2021), the base sampler (2022) and its sign bit (2023), and masking Gaussian sampling is much
    harder than masking ML-DSA's integer arithmetic. FN-DSA is to be FIPS 206: NIST submitted the
    draft for approval in August 2025, but no public draft had appeared by November 2026.

## What you learned

- NTRU (1996) encrypts with $h = p f^{-1} g$; decryption works because $p\,rg + fm$ is small.
  Its patents were freed in 2017; it lives on in sntrup761 (OpenSSH) and Falcon's lattices.
- The NTRU private key is a planted short vector in a $2n$-dimensional lattice, about 6.6 times
  shorter than chance for Falcon-512; overstretched parameters make it easy to find.
- Hash-and-sign with deterministic rounding leaks the secret basis (Nguyen and Regev, 2006).
- GPV trapdoor sampling makes signatures independent of the basis, provably, as long as
  $\sigma$ exceeds the smoothing parameter times the largest Gram-Schmidt norm and the same
  target is never signed twice.
- Falcon is GPV over NTRU lattices: trapdoor $fG - gF = q$ found by NTRUSolve, a key balanced at
  $1.17\sqrt q$, the fast Fourier sampler walking a tree of $\mathbf{L}\mathbf{D}\mathbf{L}^*$
  factors, and compressed signatures of 666 and 1,280 bytes.
- Its floating-point sampler is its weak spot for portability and side channels, attacked through
  timing, faults, power and electromagnetic leaks from 2019 to 2025; verification is simple.
- FN-DSA will be FIPS 206; NIST previewed the draft in September 2025, and as of November 2026
  no public draft exists.

**Next:** [Chapter 11](11-Stateful-Hash-Based-Signatures.md), stateful hash-based signatures, which need no hard problem beyond the
hash function itself.

## Further reading

- Jeffrey Hoffstein, Jill Pipher and Joseph H. Silverman, "NTRU: A Ring-Based Public Key
  Cryptosystem" (ANTS-III, 1998).
- Nick Howgrave-Graham, Phong Q. Nguyen, David Pointcheval, John Proos, Joseph H. Silverman, Ari
  Singer and William Whyte, "The Impact of Decryption Failures on the Security of NTRU
  Encryption" (CRYPTO 2003).
- Andreas Hülsing, Joost Rijneveld, John Schanck and Peter Schwabe, "High-Speed Key
  Encapsulation from NTRU" (CHES 2017).
- Daniel J. Bernstein, Chitchanok Chuengsatiansup, Tanja Lange and Christine van Vredendaal, "NTRU
  Prime: Reducing Attack Surface at Low Cost" (SAC 2017).
- NIST IR 8413, *Status Report on the Third Round of the NIST Post-Quantum Cryptography
  Standardization Process* (2022).
- Oded Goldreich, Shafi Goldwasser and Shai Halevi, "Public-Key Cryptosystems from Lattice
  Reduction Problems" (CRYPTO 1997).
- Phong Q. Nguyen and Oded Regev, "Learning a Parallelepiped: Cryptanalysis of GGH and NTRU
  Signatures" (EUROCRYPT 2006).
- Craig Gentry, Chris Peikert and Vinod Vaikuntanathan, "Trapdoors for Hard Lattices and New
  Cryptographic Constructions" (STOC 2008).
- Philip Klein, "Finding the Closest Lattice Vector When It's Unusually Close" (SODA 2000).
- Chris Peikert, "An Efficient and Parallel Gaussian Sampler for Lattices" (CRYPTO 2010).
- Léo Ducas, Vadim Lyubashevsky and Thomas Prest, "Efficient Identity-Based Encryption over
  NTRU Lattices" (ASIACRYPT 2014).
- Léo Ducas and Thomas Prest, "Fast Fourier Orthogonalization" (ISSAC 2016).
- Thomas Pornin and Thomas Prest, "More Efficient Algorithms for the NTRU Key Generation using
  the Field Norm" (PKC 2019).
- Pierre-Alain Fouque and others, *Falcon: Fast-Fourier Lattice-based Compact Signatures over
  NTRU*, specification version 1.2 (2020).
- Thomas Pornin, "New Efficient, Constant-Time Implementations of Falcon" (IACR ePrint 2019/893),
  and the rust-fn-dsa implementation and its performance notes (as of November 2026).
- James Howe, Thomas Prest, Thomas Ricosset and Mélissa Rossi, "Isochronous Gaussian Sampling:
  From Inception to Implementation" (PQCrypto 2020).
- Sarah McCarthy, James Howe, Neil Smyth, Séamus Brannigan and Máire O'Neill, "BEARZ Attack
  FALCON: Implementation Attacks with Countermeasures on the FALCON Signature Scheme" (SECRYPT
  2019).
- Pierre-Alain Fouque, Paul Kirchner, Mehdi Tibouchi, Alexandre Wallet and Yang Yu, "Key Recovery
  from Gram-Schmidt Norm Leakage in Hash-and-Sign Signatures over NTRU Lattices" (EUROCRYPT 2020).
- Emre Karabulut and Aydin Aysu, "FALCON Down: Breaking FALCON Post-Quantum Signature Scheme
  through Side-Channel Attacks" (DAC 2021).
- Morgane Guerreau, Ange Martinelli, Thomas Ricosset and Mélissa Rossi, "The Hidden
  Parallelepiped Is Back Again: Power Analysis Attacks on Falcon" (TCHES 2022, issue 3).
- Shiduo Zhang, Xiuhan Lin, Yang Yu and Weijia Wang, "Improved Power Analysis Attacks on Falcon"
  (EUROCRYPT 2023).
- Xiuhan Lin, Mehdi Tibouchi, Yang Yu and Shiduo Zhang, "Do Not Disturb a Sleeping Falcon:
  Floating-Point Error Sensitivity of the Falcon Sampler and Its Consequences" (EUROCRYPT 2025).
- Thomas Espitau and others, "Mitaka: A Simpler, Parallelizable, Maskable Variant of Falcon"
  (EUROCRYPT 2022).
- Ray Perlner (NIST), "FIPS 206 Status Update", 6th NIST PQC Standardization Conference
  (25 September 2025), and Dustin Moody's pqc-forum message of 28 August 2025.
