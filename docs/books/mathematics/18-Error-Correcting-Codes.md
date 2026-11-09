# 18. Error-Correcting Codes

*A code adds redundancy to a message so that it survives noise: a scratched disc,
a faint radio signal from Mars, a flipped bit in memory. Coding theory is also one of
the oldest sources of hard problems for public-key cryptography. Robert McEliece's
1978 cryptosystem, which hides a code that is easy to decode inside one that looks
random, has outlived RSA's parameters of the same era without a single change to its
core idea, and its modern form, Classic McEliece, is a leading post-quantum
candidate. This chapter is the book's coding-theory reference. It builds Hamming
distance, the Hamming and Golay codes, linear codes with generator and parity-check
matrices, syndromes, the Singleton, Hamming and Gilbert-Varshamov bounds,
Reed-Solomon decoding with the Berlekamp-Welch algorithm, binary Goppa codes with a
working decoder, a toy McEliece, the information-set decoding attack, and the
quasi-cyclic codes of HQC and BIKE.*

!!! abstract "In this chapter"
    **You will learn:**

    - Hamming distance, decoding radius, and the Hamming [7, 4] code, by hand;
    - linear codes: generator and parity-check matrices, syndromes, duals, and why
      the minimum distance is a property of the columns of $H$;
    - the Singleton, Hamming and Gilbert-Varshamov bounds, with proofs, and the
      perfect Golay code;
    - Reed-Solomon codes decoding errors at unknown places (Berlekamp-Welch);
    - binary Goppa codes over $GF(2^m)$, with a decoder that corrects $t$ errors;
    - McEliece and Niederreiter, Classic McEliece's parameters, and a working toy;
    - syndrome decoding as an NP-hard problem, and Prange's information-set decoding;
    - quasi-cyclic codes and the schemes HQC and BIKE.

    **You need:** [Chapter 8](08-Rings-Fields-and-Polynomials.md) (finite fields
    $GF(2^m)$, polynomials), [Chapter 9](09-Linear-Algebra.md) (matrices over
    $GF(2)$, elimination) and [Chapter 11](11-Polynomials-at-Work.md) (Reed-Solomon
    codes and interpolation).

    **Levels:** §18.1 to §18.3 are for beginners, §18.4 to §18.6 are intermediate,
    §18.7 to §18.10 are expert.

## 18.1 The problem

*Level: beginner.*

A Mars orbiter relays images to Earth across up to 400 million kilometers. The signal
arrives so faint that many of the raw bits are read wrongly. The images are perfect anyway, because the bits carry
structured redundancy: of all possible bit strings, only a sparse set are valid
**codewords**, so a corrupted word can be corrected to the nearest valid one.

Cryptography meets codes in three places. Error correction is part of protocols
(fuzzy extractors for biometrics and physical unclonable functions, the noise in
lattice KEMs, Shamir shares as Reed-Solomon codewords). Decoding a *random* linear
code is a hard problem on which public-key encryption can be built. And some
attacks, from fault attacks to side channels, are decoding problems in disguise.

## 18.2 Distance and decoding

*Level: beginner.*

The **Hamming distance** $d(x, y)$ between two strings of the same length is the
number of positions where they differ; the **weight** $\mathrm{wt}(x)$ is the number of
nonzero positions. A **code** of length $n$ is a set $C$ of strings, and its **minimum
distance** $d$ is the smallest distance between two different codewords.

If $d \ge 2t + 1$, then the spheres of radius $t$ around the codewords do not overlap
(two codewords within $t$ of one word would be within $2t$ of each other). So
**nearest-codeword decoding corrects any $t = \lfloor (d - 1)/2 \rfloor$ errors**,
and a code can *detect* up to $d - 1$ errors.

The simplest example is the **repetition code**: send each bit three times. Its two
codewords, 000 and 111, have distance 3, so a majority vote corrects one error. It
pays for this with a rate of $1/3$: three bits sent per bit of message. The rest of
coding theory is the search for better trade-offs between the **rate** $k/n$ and the
distance $d$.

<figure class="mars-fig">
<svg viewBox="0 0 640 230" width="640" role="img" aria-label="Codewords as points with non-overlapping spheres of radius t around them; a received word inside a sphere decodes to its center; the distance between centers is at least 2t plus 1" fill="currentColor" font-size="13">
<g stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity=".08">
<circle cx="140" cy="110" r="70"/><circle cx="320" cy="110" r="70" class="acc"/><circle cx="500" cy="110" r="70"/>
</g>
<circle cx="140" cy="110" r="6"/><circle cx="320" cy="110" r="6" class="acc-fill"/><circle cx="500" cy="110" r="6"/>
<circle cx="350" cy="80" r="4"/>
<path d="M350 80 L 324 106" stroke="currentColor" stroke-width="1.2" stroke-dasharray="3 3"/>
<text x="358" y="76" font-size="12">received</text>
<line x1="140" y1="200" x2="320" y2="200" stroke="currentColor" stroke-width="1"/>
<text x="230" y="220" text-anchor="middle" font-size="12">distance ≥ d = 2t + 1</text>
<line x1="320" y1="110" x2="390" y2="110" stroke="currentColor" stroke-width="1"/>
<text x="355" y="128" text-anchor="middle" font-size="12">t</text>
<text x="140" y="30" text-anchor="middle">codeword</text><text x="320" y="30" text-anchor="middle" class="acc">codeword</text><text x="500" y="30" text-anchor="middle">codeword</text>
</svg>
<figcaption>Figure 18.1. Decoding by spheres. If codewords are at least 2t + 1 apart, spheres of radius t around them are disjoint, so a word with at most t errors lies in exactly one sphere and decodes to its center.</figcaption>
</figure>

## 18.3 The Hamming code

*Level: beginner.*

Richard Hamming, frustrated by weekend jobs that stopped on single-bit errors in
the Bell Labs relay computers, published his codes in 1950. The [7, 4] code sends 4
data bits $d_1 d_2 d_3 d_4$ with 3 parity bits:

$$
p_1 = d_1 + d_2 + d_4, \qquad p_2 = d_1 + d_3 + d_4, \qquad p_3 = d_2 + d_3 + d_4
\pmod 2.
$$

### By hand

Encode $1011$: $p_1 = 1 + 0 + 1 = 0$, $p_2 = 1 + 1 + 1 = 1$, $p_3 = 0 + 1 + 1 = 0$, so
the codeword is $1011\,010$. Now flip the third bit: $1001\,010$. Recompute the three
checks on the received word:

- check 1, $d_1 + d_2 + d_4 + p_1 = 1 + 0 + 1 + 0 = 0$: passes;
- check 2, $d_1 + d_3 + d_4 + p_2 = 1 + 0 + 1 + 1 = 1$: fails;
- check 3, $d_2 + d_3 + d_4 + p_3 = 0 + 0 + 1 + 0 = 1$: fails.

The pattern of failures, $(0, 1, 1)$, is the **syndrome**. Only $d_3$ is in checks 2
and 3 and not in check 1, so $d_3$ is the bad bit. Each of the 7 positions has a
different nonzero pattern, so every single error is located.

```python
# The Hamming [7,4] code: 4 data bits, 3 parity bits, corrects any single error by its syndrome.
import itertools, random

G = [[1, 0, 0, 0, 1, 1, 0],
     [0, 1, 0, 0, 1, 0, 1],
     [0, 0, 1, 0, 0, 1, 1],
     [0, 0, 0, 1, 1, 1, 1]]                       # G = [I | P]
H = [[1, 1, 0, 1, 1, 0, 0],
     [1, 0, 1, 1, 0, 1, 0],
     [0, 1, 1, 1, 0, 0, 1]]                       # H = [P^T | I]

def encode(msg, G):
    return [sum(m * g for m, g in zip(msg, col)) % 2 for col in zip(*G)]

def syndrome(word, H):
    return tuple(sum(w * h for w, h in zip(word, row)) % 2 for row in H)

columns = {tuple(col): i for i, col in enumerate(zip(*H))}   # each column is a distinct nonzero syndrome

def hamming_decode(word):
    s = syndrome(word, H)
    w = word[:]
    if any(s):
        w[columns[s]] ^= 1                        # the syndrome IS the column of the flipped position
    return w[:4]

print(encode([1, 0, 1, 1], G), syndrome(encode([1, 0, 1, 1], G), H))
ok = all(hamming_decode([b ^ (i == j) for j, b in enumerate(encode(list(m), G))]) == list(m)
         for m in itertools.product([0, 1], repeat=4) for i in range(7))
print(ok, min(sum(encode(list(m), G)) for m in itertools.product([0, 1], repeat=4) if any(m)))
```

```text
[1, 0, 1, 1, 0, 1, 0] (0, 0, 0)
True 3
```

Every one of the 16 messages, with each of the 7 possible single errors, decodes
correctly, and the minimum weight of a nonzero codeword is 3.

## 18.4 Linear codes

*Level: intermediate.*

A **linear code** $[n, k, d]$ over a field $\mathbb{F}_q$ is a $k$-dimensional subspace
of $\mathbb{F}_q^n$ with minimum distance $d$. It can be given two ways:

- by a $k \times n$ **generator matrix** $G$ whose rows are a basis: the codewords are
  $mG$ for messages $m \in \mathbb{F}_q^k$;
- by an $(n - k) \times n$ **parity-check matrix** $H$ of full rank: the codewords are
  the $c$ with $Hc^T = 0$.

If $G = [I_k \mid P]$ (systematic form, reachable by row operations and possibly a
column permutation), then $H = [-P^T \mid I_{n-k}]$ works, since $GH^T = -P + P = 0$.
The code with generator matrix $H$ is the **dual code** $C^\perp$.

Three facts make linear codes manageable:

1. **Minimum distance = minimum weight.** $d(x, y) = \mathrm{wt}(x - y)$, and $x - y$ is a
   codeword.
2. **The syndrome sees only the error.** If $y = c + e$, then $Hy^T = Hc^T + He^T =
   He^T$. Decoding means finding the lowest-weight $e$ with a given syndrome.
3. **Distance from the columns of $H$.** $d$ is the smallest number of columns of $H$
   that are linearly dependent. *Proof*: a codeword of weight $w$ is a vanishing
   combination $\sum c_i h_i = 0$ of exactly $w$ columns $h_i$, and conversely.
   $\blacksquare$

The Hamming code's $H$ has all 7 nonzero 3-bit columns, all different: no two are
dependent, three are (e.g. $001 + 010 = 011$), so $d = 3$. Taking all $2^r - 1$
nonzero columns of length $r$ gives the Hamming code $[2^r - 1, 2^r - 1 - r, 3]$ for
every $r$.

## 18.5 Bounds, and a perfect code

*Level: intermediate.*

How large can $k$ be for given $n$ and $d$? Three classical bounds frame the answer.

**Singleton bound** (Richard Singleton, 1964): $k \le n - d + 1$. *Proof*: delete the
first $d - 1$ coordinates of every codeword. Distinct codewords still differ (they
differed in at least $d$ places), so the $q^k$ shortened words are distinct strings of
length $n - d + 1$: $q^k \le q^{n-d+1}$. $\blacksquare$ Codes that meet it are
**MDS** (maximum distance separable); Reed-Solomon codes are MDS (Chapter 11).

**Hamming bound** (sphere packing): with $t = \lfloor (d-1)/2 \rfloor$, the disjoint
spheres of radius $t$ around the $2^k$ codewords each hold $\sum_{i \le t}
\binom{n}{i}$ words, and all lie among the $2^n$ strings:

$$
2^k \sum_{i=0}^{t} \binom{n}{i} \le 2^n.
$$

Codes meeting it with equality are **perfect**: every string is within $t$ of exactly
one codeword. The binary Hamming codes are perfect ($2^{n-k} = 1 + n$), and so is the
**binary Golay code** $[23, 12, 7]$ (Marcel Golay, 1949): $1 + 23 + 253 + 1771 =
2048 = 2^{11}$. Apart from trivial codes, those are the only perfect binary codes
(Aimo Tietäväinen and, independently, Victor Zinoviev and Vladimir Leontiev, 1973,
building on work by Jacobus van Lint).

**Gilbert-Varshamov bound** (Edgar Gilbert 1952, Rom Varshamov 1957): a linear
$[n, k, \ge d]$ code exists whenever $\sum_{i=0}^{d-2}\binom{n-1}{i} < 2^{n-k}$. *Proof*
(Varshamov's): build $H$ one column at a time, choosing each new column outside the
set of sums of at most $d - 2$ earlier columns. That set has fewer than $2^{n-k}$
elements, so a choice always exists, and then no $d - 1$ columns are dependent.
$\blacksquare$ Random linear codes meet this bound with high probability, which matters
for cryptography: a random code is a good code, and decoding it is hard.

```python
# Linear codes in general: minimum distance by enumeration, and the binary Golay code [23,12,7].
def min_distance(Gm):
    k = len(Gm)
    best = None
    for m in itertools.product([0, 1], repeat=k):
        if any(m):
            w = sum(encode(list(m), Gm))
            best = w if best is None else min(best, w)
    return best

def cyclic_generator(gpoly, n):
    """Rows are x^i g(x) for i < n - deg g: the generator matrix of a cyclic code."""
    deg = len(gpoly) - 1
    return [[0] * i + gpoly + [0] * (n - deg - 1 - i) for i in range(n - deg)]

g_golay = [1, 0, 1, 0, 1, 1, 1, 0, 0, 0, 1, 1]    # 1 + x^2 + x^4 + x^5 + x^6 + x^10 + x^11
G23 = cyclic_generator(g_golay, 23)
d = min_distance(G23)
t = (d - 1) // 2
from math import comb
print(len(G23), d, t, sum(comb(23, i) for i in range(t + 1)), 2**(23 - 12))   # a perfect code
```

```text
12 7 3 2048 2048
```

The Golay code, built from its generator polynomial as a cyclic code, has 12
dimensions, minimum distance 7 (found by checking all 4,095 nonzero codewords),
corrects 3 errors, and its spheres of radius 3 hold exactly $2048 = 2^{23-12}$
words: perfect.

```python
# Bounds on the dimension k of a binary code of length n and minimum distance d.
from math import log2

def singleton(n, d):
    return n - d + 1

def hamming_bound(n, d):
    t = (d - 1) // 2
    return int(n - log2(sum(comb(n, i) for i in range(t + 1))))

def gilbert_varshamov(n, d):
    """A linear [n, k, >= d] code exists if sum_{i < d-1} C(n-1, i) < 2^(n-k)."""
    return max(k for k in range(n + 1) if sum(comb(n - 1, i) for i in range(d - 1)) < 2**(n - k))

for n, dd in ((7, 3), (23, 7), (31, 5), (63, 9), (255, 21)):
    print(n, dd, singleton(n, dd), hamming_bound(n, dd), gilbert_varshamov(n, dd))
```

```text
7 3 5 4 4
23 7 17 12 7
31 5 27 22 18
63 9 55 43 33
255 21 235 197 160
```

The columns are $n$, $d$, and the largest $k$ allowed by Singleton, by Hamming, and
guaranteed by Gilbert-Varshamov. For $[23, \cdot, 7]$ the Hamming bound gives 12, and
the Golay code reaches it. For binary codes the Singleton bound is weak; the truth
lies between the last two columns, and for long codes the exact answer is unknown.

## 18.6 Reed-Solomon codes: decoding errors

*Level: intermediate.*

Chapter 11 built Reed-Solomon codes: the codeword of a message polynomial $m(x)$ of
degree less than $k$ over $\mathbb{F}_q$ is $(m(x_1), \ldots, m(x_n))$, the minimum
distance is $n - k + 1$, and erasures are repaired by interpolation. Errors, at
positions nobody knows, need more.

The **Berlekamp-Welch algorithm** (Elwyn Berlekamp and Lloyd Welch, 1986) turns error
correction into linear algebra. Suppose at most $e = \lfloor (n - k)/2 \rfloor$ of the
received values $y_i$ are wrong. Let $E(x)$ be the monic **error locator** of degree
$e$ whose roots include the bad positions. Then for every $i$,

$$
y_i\,E(x_i) = m(x_i)\,E(x_i),
$$

since either $y_i = m(x_i)$ or $E(x_i) = 0$. Write $Q(x) = m(x)E(x)$, of degree less
than $k + e$. The equations $Q(x_i) = y_i E(x_i)$ are *linear* in the $k + e$
coefficients of $Q$ and the $e$ unknown coefficients of $E$: $n$ equations, $k + 2e
\le n$ unknowns. Solve, then divide: $m = Q/E$.

Any solution works, not only the "true" one: if $(Q, E)$ and $(Q', E')$ both solve
the system, then $Q E' - Q' E$ vanishes at all $n$ points and has degree less than
$k + 2e \le n$, so it is zero and $Q/E = Q'/E'$. $\blacksquare$

```python
# Reed-Solomon decoding of ERRORS: the Berlekamp-Welch algorithm over F_929.
q = 929

def solve_mod(M, y, q):
    """Gauss-Jordan elimination mod a prime; returns one solution (free variables set to 0)."""
    rows, cols = len(M), len(M[0])
    R = [row[:] + [yy] for row, yy in zip(M, y)]
    piv_cols, r = [], 0
    for c in range(cols):
        p = next((i for i in range(r, rows) if R[i][c] % q), None)
        if p is None:
            continue
        R[r], R[p] = R[p], R[r]
        inv = pow(R[r][c], -1, q)
        R[r] = [x * inv % q for x in R[r]]
        for i in range(rows):
            if i != r and R[i][c]:
                f = R[i][c]
                R[i] = [(a - f * b) % q for a, b in zip(R[i], R[r])]
        piv_cols.append(c)
        r += 1
    x = [0] * cols
    for i, c in enumerate(piv_cols):
        x[c] = R[i][-1]
    return x

def poly_eval(p, x):
    acc = 0
    for c in reversed(p):
        acc = (acc * x + c) % q
    return acc

def poly_divmod(a, b):
    a = a[:]
    out = [0] * max(len(a) - len(b) + 1, 1)
    inv = pow(b[-1], -1, q)
    for i in range(len(a) - len(b), -1, -1):
        c = a[i + len(b) - 1] * inv % q
        out[i] = c
        for j, bj in enumerate(b):
            a[i + j] = (a[i + j] - c * bj) % q
    return out, a[:len(b) - 1]

def berlekamp_welch(xs, ys, k):
    """Find the message polynomial of degree < k from n values with at most e = (n-k)//2 errors.
    Unknowns: E(x) monic of degree e (error locator) and Q(x) = m(x) E(x) of degree < k + e,
    with Q(x_i) = y_i E(x_i) for every i: a linear system."""
    n = len(xs)
    e = (n - k) // 2
    M, rhs = [], []
    for x, y in zip(xs, ys):
        row = [pow(x, j, q) for j in range(k + e)] + [(-y * pow(x, j, q)) % q for j in range(e)]
        M.append(row)
        rhs.append(y * pow(x, e, q) % q)
    sol = solve_mod(M, rhs, q)
    Q, E = sol[:k + e], sol[k + e:] + [1]
    m, rem = poly_divmod(Q, E)
    return m[:k] if not any(rem) else None

rng = random.Random(18)
k, n = 5, 15
msg = [rng.randrange(q) for _ in range(k)]
xs = list(range(1, n + 1))
cw = [poly_eval(msg, x) for x in xs]
bad = cw[:]
for i in rng.sample(range(n), 5):                 # (n - k) / 2 = 5 errors
    bad[i] = (bad[i] + rng.randrange(1, q)) % q
print(sum(a != b for a, b in zip(cw, bad)), berlekamp_welch(xs, bad, k) == msg)
```

```text
5 True
```

Fifteen values of a degree-4 polynomial over $\mathbb{F}_{929}$, five of them
corrupted, and the message comes back exactly. Faster decoders (Berlekamp-Massey,
the extended Euclidean method of Yasuo Sugiyama and others, 1975) solve the same
"key equation" in quadratic time, and Venkatesan Guruswami and Madhu Sudan (1999)
showed how to decode beyond half the distance when a short list of candidates is
acceptable.

## 18.7 Binary Goppa codes

*Level: expert.*

Valery Goppa defined his codes in 1970. Fix the field $GF(2^m)$, a **support** of $n$
distinct elements $\alpha_1, \ldots, \alpha_n$, and a **Goppa polynomial** $g(x)$ of
degree $t$ over $GF(2^m)$ with no roots in the support. The binary Goppa code is

$$
\Gamma(L, g) = \Bigl\{\, c \in GF(2)^n : \sum_{i=1}^{n} \frac{c_i}{x - \alpha_i} \equiv 0
\pmod{g(x)} \,\Bigr\}.
$$

Expanding $1/(x - \alpha_i) \bmod g$ gives a parity-check matrix over $GF(2^m)$ with
entries $\alpha_i^j / g(\alpha_i)$ for $0 \le j < t$; writing each entry as $m$ bits
gives a binary $H$ with $mt$ rows, so

$$
k \ge n - mt.
$$

**Distance.** When $g$ is square-free (for example irreducible), $\Gamma(L, g) =
\Gamma(L, g^2)$: for binary $c$, the sum $\sum c_i/(x - \alpha_i)$ is
$\sigma'(x)/\sigma(x)$ with $\sigma = \prod_{c_i = 1}(x - \alpha_i)$, and the
derivative $\sigma'$ of a polynomial over a field of characteristic 2 is a perfect
square, so $g \mid \sigma'$ implies $g^2 \mid \sigma'$. A Goppa code of a degree-$2t$
polynomial has $d \ge 2t + 1$. So binary Goppa codes correct $t$ errors, twice what
the number of parity checks would suggest for a general alternant code.

**Decoding.** Patterson's algorithm (Nicholas Patterson, 1975) works modulo $g$: from
the syndrome $S(x) = \sum_{i \in \text{errors}} 1/(x - \alpha_i)$ it computes a square
root modulo $g$ and runs a half extended Euclidean algorithm to find the error
locator. A simpler route, used below, decodes $\Gamma(L, g^2)$ as an alternant code:
solve the key equation $\sigma(x) S(x) \equiv \omega(x) \pmod{g^2}$ with the extended
Euclidean algorithm, and find the roots of $\sigma$.

### Code it

$GF(32)$ arithmetic, polynomials over it, and a random irreducible Goppa polynomial
of degree $t = 3$ (irreducibility is tested by checking that $g$ shares no factor
with $x^{32^i} - x$ for $i \le t/2$, as in Chapter 8's Rabin test).

```python
# Arithmetic in GF(2^m) and polynomials over it: the setting of binary Goppa codes.
M_BITS, MODPOLY = 5, 0b100101                     # GF(32) = GF(2)[z]/(z^5 + z^2 + 1)
FIELD = 1 << M_BITS

def gf_mul(a, b):
    r = 0
    while b:
        if b & 1:
            r ^= a
        b >>= 1
        a <<= 1
        if a & FIELD:
            a ^= MODPOLY
    return r

def gf_pow(a, e):
    r = 1
    while e:
        if e & 1:
            r = gf_mul(r, a)
        a = gf_mul(a, a)
        e >>= 1
    return r

def gf_inv(a):
    return gf_pow(a, FIELD - 2)

def p_trim(p):
    while len(p) > 1 and p[-1] == 0:
        p = p[:-1]
    return p

def p_add(a, b):
    n = max(len(a), len(b))
    return p_trim([(a[i] if i < len(a) else 0) ^ (b[i] if i < len(b) else 0) for i in range(n)])

def p_mul(a, b):
    r = [0] * (len(a) + len(b) - 1)
    for i, x in enumerate(a):
        if x:
            for j, y in enumerate(b):
                r[i + j] ^= gf_mul(x, y)
    return p_trim(r)

def p_divmod(a, b):
    a, b = p_trim(a[:]), p_trim(b)
    if len(a) < len(b):
        return [0], a
    out = [0] * (len(a) - len(b) + 1)
    inv = gf_inv(b[-1])
    for i in range(len(a) - len(b), -1, -1):
        c = gf_mul(a[i + len(b) - 1], inv)
        out[i] = c
        if c:
            for j, bj in enumerate(b):
                a[i + j] ^= gf_mul(c, bj)
    return p_trim(out), p_trim(a[:len(b) - 1] or [0])

def p_eval(p, x):
    acc = 0
    for c in reversed(p):
        acc = gf_mul(acc, x) ^ c
    return acc

def is_irreducible(g):
    """No roots and no factors: checked by gcd(g, x^(32^i) - x) = 1 for i <= deg/2."""
    def p_gcd(a, b):
        while p_trim(b) != [0]:
            a, b = b, p_divmod(a, b)[1]
        return a
    xp = [0, 1]
    for _ in range(1, (len(g) - 1) // 2 + 1):
        for _ in range(M_BITS):                    # raise to the 2^m-th power by m squarings mod g
            xp = p_divmod(p_mul(xp, xp), g)[1]
        if len(p_trim(p_gcd(g, p_add(xp, [0, 1])))) > 1:
            return False
    return True

T = 3
rng = random.Random(1878)
while True:
    goppa = [rng.randrange(FIELD) for _ in range(T)] + [1]   # monic, degree t
    if is_irreducible(goppa):
        break
support = list(range(FIELD))                     # all 32 field elements (none is a root of g)
print(goppa, is_irreducible(goppa), all(p_eval(goppa, a) for a in support))
```

```text
[19, 6, 26, 1] True True
```

The binary parity-check matrix, and the code as its null space, with the support all
32 field elements:

```python
# The binary Goppa code: c is a codeword iff sum c_i / (x - a_i) = 0 mod g(x).
# Parity checks: H = [ a_i^j / g(a_i) ], expanded from GF(32) into 5 binary rows each.
n_g = len(support)
Hbin = []
for j in range(T):
    entries = [gf_mul(gf_pow(a, j), gf_inv(p_eval(goppa, a))) for a in support]
    for bit in range(M_BITS):
        Hbin.append([(v >> bit) & 1 for v in entries])

def gf2_nullspace(Hm):
    """Basis of {c : H c = 0} over GF(2)."""
    rows = [r[:] for r in Hm]
    ncols = len(rows[0])
    pivots, r = [], 0
    for c in range(ncols):
        p = next((i for i in range(r, len(rows)) if rows[i][c]), None)
        if p is None:
            continue
        rows[r], rows[p] = rows[p], rows[r]
        for i in range(len(rows)):
            if i != r and rows[i][c]:
                rows[i] = [a ^ b for a, b in zip(rows[i], rows[r])]
        pivots.append(c)
        r += 1
    free = [c for c in range(ncols) if c not in pivots]
    basis = []
    for f in free:
        v = [0] * ncols
        v[f] = 1
        for i, pc in enumerate(pivots):
            v[pc] = rows[i][f]
        basis.append(v)
    return basis

Ggop = gf2_nullspace(Hbin)
k_g = len(Ggop)
print(n_g, k_g, n_g - M_BITS * T, min_distance(Ggop))
```

```text
32 17 17 7
```

$n = 32$, $k = 17 = n - mt$, and minimum distance 7 $= 2t + 1$, found by checking all
$2^{17} - 1$ nonzero codewords. Now the decoder, on 300 random codewords with 3
random errors each:

```python
# Decoding t errors with the secret g: syndrome polynomial, then the key equation solved by the
# extended Euclidean algorithm modulo g^2 (a binary Goppa code with square-free g is also the
# Goppa code of g^2, which corrects t errors with this alternant decoder).
g2 = p_mul(goppa, goppa)

def p_inv_mod(a, mod):
    r0, r1, s0, s1 = mod, a, [0], [1]
    while p_trim(r1) != [0]:
        qq, r = p_divmod(r0, r1)
        r0, r1, s0, s1 = r1, r, s1, p_add(s0, p_mul(qq, s1))
    inv0 = gf_inv(r0[0])
    return p_trim([gf_mul(c, inv0) for c in s0])

def goppa_decode(word):
    S = [0]
    for c, a in zip(word, support):
        if c:
            S = p_add(S, p_inv_mod([a, 1], g2))   # 1/(x - a) = 1/(x + a) mod g^2
    if S == [0]:
        return word
    r0, r1, s0, s1 = g2, S, [0], [1]               # stop when deg r < t: then s = sigma (up to a constant)
    while len(p_trim(r1)) - 1 >= T:
        qq, r = p_divmod(r0, r1)
        r0, r1, s0, s1 = r1, r, s1, p_add(s0, p_mul(qq, s1))
    sigma = s1
    out = word[:]
    for i, a in enumerate(support):
        if p_eval(sigma, a) == 0:
            out[i] ^= 1
    return out

def gf2_encode(msg, Gm):
    return [sum(m & g for m, g in zip(msg, col)) % 2 for col in zip(*Gm)]

trials, good = 300, 0
for _ in range(trials):
    m = [rng.getrandbits(1) for _ in range(k_g)]
    c = gf2_encode(m, Ggop)
    e = [0] * n_g
    for i in rng.sample(range(n_g), T):
        e[i] = 1
    good += goppa_decode([a ^ b for a, b in zip(c, e)]) == c
print(good, trials)
```

```text
300 300
```

All 300 decode.

## 18.8 McEliece and Niederreiter

*Level: expert.*

Robert McEliece's 1978 idea: a Goppa code has a fast decoder for those who know $g$
and $L$, but its generator matrix, once scrambled, looks like that of a random linear
code, which nobody can decode.

- **Private key**: a binary Goppa code with generator matrix $G$ (and its $g$, $L$),
  a random invertible $k \times k$ matrix $S$ and a random $n \times n$ permutation
  $P$.
- **Public key**: $G' = SGP$.
- **Encrypt** $m \in GF(2)^k$: choose a random error $e$ of weight exactly $t$ and
  send $c = mG' + e$.
- **Decrypt**: $cP^{-1} = (mS)G + eP^{-1}$, and $eP^{-1}$ still has weight $t$;
  decode with the Goppa decoder to get $mS$, and multiply by $S^{-1}$.

Harald Niederreiter's 1986 variant publishes a parity-check matrix $H'$ instead, and
encrypts a message *encoded as* a weight-$t$ vector $e$ by sending its syndrome
$H'e^T$. It is equivalent in security and has much shorter ciphertexts. **Classic
McEliece**, submitted to NIST's competition in 2017 by Daniel Bernstein, Tung Chou,
Tanja Lange and others, is Niederreiter with binary Goppa codes and a
chosen-ciphertext-secure KEM wrapper. It reached the final round; NIST did not select
it in 2025, and it is being standardized by ISO.

```python
# A toy McEliece: public key G' = S G P (scrambled, permuted); ciphertext = m G' + e with weight t.
def gf2_matmul(A, B):
    Bt = list(zip(*B))
    return [[sum(a & b for a, b in zip(row, col)) % 2 for col in Bt] for row in A]

def gf2_inverse(A):
    n = len(A)
    R = [row[:] + [int(i == j) for j in range(n)] for i, row in enumerate(A)]
    for c in range(n):
        p = next((i for i in range(c, n) if R[i][c]), None)
        if p is None:
            return None
        R[c], R[p] = R[p], R[c]
        for i in range(n):
            if i != c and R[i][c]:
                R[i] = [a ^ b for a, b in zip(R[i], R[c])]
    return [row[n:] for row in R]

while True:
    S = [[rng.getrandbits(1) for _ in range(k_g)] for _ in range(k_g)]
    S_inv = gf2_inverse(S)
    if S_inv:
        break
perm = list(range(n_g))
rng.shuffle(perm)
Gpub = [[row[perm[j]] for j in range(n_g)] for row in gf2_matmul(S, Ggop)]

def mceliece_encrypt(m):
    c = gf2_encode(m, Gpub)
    for i in rng.sample(range(n_g), T):
        c[i] ^= 1
    return c

def mceliece_decrypt(c):
    unperm = [0] * n_g
    for j in range(n_g):
        unperm[perm[j]] = c[j]                    # undo P
    cw = goppa_decode(unperm)                     # = (m S) G
    mS = solve_gf2(Ggop, cw)
    return gf2_encode(mS, S_inv)

def solve_gf2(Gm, cw):
    """Find x with x G = cw (G has full row rank)."""
    A = [list(col) + [b] for col, b in zip(zip(*Gm), cw)]     # equations: sum_i x_i G[i][j] = cw[j]
    rows, ncols = len(A), len(Gm)
    r, piv = 0, []
    for c in range(ncols):
        p = next((i for i in range(r, rows) if A[i][c]), None)
        if p is None:
            continue
        A[r], A[p] = A[p], A[r]
        for i in range(rows):
            if i != r and A[i][c]:
                A[i] = [a ^ b for a, b in zip(A[i], A[r])]
        piv.append(c)
        r += 1
    x = [0] * ncols
    for i, c in enumerate(piv):
        x[c] = A[i][-1]
    return x

m = [rng.getrandbits(1) for _ in range(k_g)]
print(all(mceliece_decrypt(mceliece_encrypt(m)) == m for _ in range(50)))
```

```text
True
```

The toy McEliece decrypts every one of 50 messages. The real parameter sets, with the
public key size computed as $(n - k)$ rows of $k$ bits padded to bytes:

| | $m$ | $n$ | $t$ | $k = n - mt$ | public key | ciphertext |
|---|---|---|---|---|---|---|
| mceliece348864 | 12 | 3,488 | 64 | 2,720 | 261,120 B | 96 B |
| mceliece460896 | 13 | 4,608 | 96 | 3,360 | 524,160 B | 156 B |
| mceliece6688128 | 13 | 6,688 | 128 | 5,024 | 1,044,992 B | 208 B |
| mceliece8192128 | 13 | 8,192 | 128 | 6,528 | 1,357,824 B | 208 B |

The keys are huge, a quarter of a megabyte at the lowest level, and the ciphertexts
are tiny. That trade-off suits some uses (long-lived static keys, VPN servers
distributing a key once) and not others (TLS handshakes).

<figure class="mars-fig">
<svg viewBox="0 0 640 230" width="640" role="img" aria-label="The McEliece key: the public matrix G prime equals S times G times P, where S scrambles rows and P permutes columns of the secret Goppa generator matrix G; encryption adds a weight t error" fill="currentColor" font-size="13">
<g stroke="currentColor" stroke-width="1.5" fill="none">
<rect x="30" y="50" width="150" height="80" rx="4"/>
<rect x="220" y="60" width="60" height="60" rx="4"/>
<rect x="300" y="50" width="150" height="80" rx="4" class="acc"/>
<rect x="470" y="30" width="120" height="120" rx="4"/>
</g>
<rect x="300" y="50" width="150" height="80" rx="4" class="acc-fill" fill-opacity=".15"/>
<text x="105" y="95" text-anchor="middle">G′ (public)</text>
<text x="200" y="96" text-anchor="middle" font-size="16">=</text>
<text x="250" y="95" text-anchor="middle">S</text>
<text x="375" y="88" text-anchor="middle" class="acc">G (Goppa)</text>
<text x="375" y="108" text-anchor="middle" font-size="12" class="acc">secret g, L</text>
<text x="530" y="95" text-anchor="middle">P</text>
<text x="250" y="145" text-anchor="middle" font-size="12">k × k, invertible</text>
<text x="375" y="150" text-anchor="middle" font-size="12">k × n</text>
<text x="530" y="170" text-anchor="middle" font-size="12">n × n permutation</text>
<text x="320" y="210" text-anchor="middle">ciphertext c = m G′ + e, with wt(e) = t: only the owner of g and L can find e</text>
</svg>
<figcaption>Figure 18.2. The McEliece public key is a disguised Goppa code. Without the disguise removed, decrypting means decoding t errors in what looks like a random linear code, the syndrome decoding problem.</figcaption>
</figure>

## 18.9 Syndrome decoding and information-set decoding

*Level: expert.*

The **syndrome decoding problem**: given a parity-check matrix $H$, a syndrome $s$
and a weight $w$, find $e$ with $He^T = s$ and $\mathrm{wt}(e) \le w$. Elwyn Berlekamp,
Elwyn Berlekamp, Robert McEliece and Henk van Tilborg proved in 1978 that it is NP-complete. As with
lattices (Chapter 14), NP-hardness of the worst case is not what cryptography needs;
the evidence that matters is sixty years of attacks on random instances, all
exponential.

The basic attack is **information-set decoding** (Eugene Prange, 1962). Pick $k$
random positions. If none of them carries an error, the received word restricted to
those positions is an error-free copy of the codeword there; if the $k \times k$
submatrix of $G$ on those positions is invertible, it determines the message, and we
can check whether the rest of the word differs from the re-encoded codeword in at most
$t$ places. The chance that $k$ random positions avoid all $t$ errors is
$\binom{n - t}{k}/\binom{n}{k}$, so the expected number of tries is the inverse.

```python
# Break it, slowly: Prange's information-set decoding using only the public key.
def prange(Gp, c, t, rng):
    n, k = len(Gp[0]), len(Gp)
    tries = 0
    while True:
        tries += 1
        info = rng.sample(range(n), k)            # hope: no error among these k positions
        sub = [[row[j] for j in info] for row in Gp]
        inv = gf2_inverse([list(r) for r in zip(*sub)])
        if inv is None:
            continue
        m_guess = [sum(a & b for a, b in zip(row, [c[j] for j in info])) % 2 for row in inv]
        e = [a ^ b for a, b in zip(c, gf2_encode(m_guess, Gp))]
        if sum(e) <= t:
            return m_guess, tries

from math import lgamma, log
def log2_comb(a, b):
    return (lgamma(a + 1) - lgamma(b + 1) - lgamma(a - b + 1)) / log(2)

c = mceliece_encrypt(m)
counts = []
for _ in range(20):
    m_found, tries = prange(Gpub, c, T, rng)
    counts.append(tries)
print(m_found == m, sum(counts) / len(counts), round(2 ** (log2_comb(n_g, k_g) - log2_comb(n_g - T, k_g)), 2))
for name, mm, nn, tt in (("mceliece348864", 12, 3488, 64), ("mceliece460896", 13, 4608, 96),
                         ("mceliece6688128", 13, 6688, 128), ("mceliece8192128", 13, 8192, 128)):
    kk = nn - mm * tt
    pk = (nn - kk) * ((kk + 7) // 8)
    print(name, kk, pk, (nn - kk) // 8, round(log2_comb(nn, kk) - log2_comb(nn - tt, kk), 1))
```

```text
True 21.65 10.9
mceliece348864 2720 261120 96 142.8
mceliece460896 3360 524160 156 184.9
mceliece6688128 5024 1044992 208 262.4
mceliece8192128 6528 1357824 208 300.1
```

<figure class="mars-fig">
<svg viewBox="0 0 640 220" width="640" role="img" aria-label="Information-set decoding: three random choices of 17 of the 32 positions; the first two include an error position and fail, the third avoids all three errors and recovers the message" fill="currentColor" font-size="13">
<rect x="40" y="30" width="13" height="22" class="acc-fill" fill-opacity=".45" stroke="currentColor" stroke-width=".8" fill="currentColor"/>
<rect x="55" y="30" width="13" height="22" class="acc-fill" fill-opacity=".45" stroke="currentColor" stroke-width=".8" fill="currentColor"/>
<rect x="70" y="30" width="13" height="22" class="acc-fill" fill-opacity=".45" stroke="currentColor" stroke-width=".8" fill="currentColor"/>
<rect x="85" y="30" width="13" height="22" class="acc-fill" fill-opacity=".45" stroke="currentColor" stroke-width=".8" fill="currentColor"/>
<text x="91" y="46" text-anchor="middle" font-size="13" font-weight="700">×</text>
<rect x="100" y="30" width="13" height="22" class="acc-fill" fill-opacity=".45" stroke="currentColor" stroke-width=".8" fill="currentColor"/>
<rect x="115" y="30" width="13" height="22" stroke="currentColor" stroke-width=".8" fill="none"/>
<rect x="130" y="30" width="13" height="22" stroke="currentColor" stroke-width=".8" fill="none"/>
<rect x="145" y="30" width="13" height="22" class="acc-fill" fill-opacity=".45" stroke="currentColor" stroke-width=".8" fill="currentColor"/>
<rect x="160" y="30" width="13" height="22" stroke="currentColor" stroke-width=".8" fill="none"/>
<rect x="175" y="30" width="13" height="22" class="acc-fill" fill-opacity=".45" stroke="currentColor" stroke-width=".8" fill="currentColor"/>
<rect x="190" y="30" width="13" height="22" stroke="currentColor" stroke-width=".8" fill="none"/>
<rect x="205" y="30" width="13" height="22" class="acc-fill" fill-opacity=".45" stroke="currentColor" stroke-width=".8" fill="currentColor"/>
<rect x="220" y="30" width="13" height="22" class="acc-fill" fill-opacity=".45" stroke="currentColor" stroke-width=".8" fill="currentColor"/>
<rect x="235" y="30" width="13" height="22" stroke="currentColor" stroke-width=".8" fill="none"/>
<rect x="250" y="30" width="13" height="22" stroke="currentColor" stroke-width=".8" fill="none"/>
<text x="256" y="46" text-anchor="middle" font-size="13" font-weight="700">×</text>
<rect x="265" y="30" width="13" height="22" class="acc-fill" fill-opacity=".45" stroke="currentColor" stroke-width=".8" fill="currentColor"/>
<rect x="280" y="30" width="13" height="22" class="acc-fill" fill-opacity=".45" stroke="currentColor" stroke-width=".8" fill="currentColor"/>
<rect x="295" y="30" width="13" height="22" class="acc-fill" fill-opacity=".45" stroke="currentColor" stroke-width=".8" fill="currentColor"/>
<rect x="310" y="30" width="13" height="22" stroke="currentColor" stroke-width=".8" fill="none"/>
<rect x="325" y="30" width="13" height="22" stroke="currentColor" stroke-width=".8" fill="none"/>
<rect x="340" y="30" width="13" height="22" stroke="currentColor" stroke-width=".8" fill="none"/>
<rect x="355" y="30" width="13" height="22" stroke="currentColor" stroke-width=".8" fill="none"/>
<rect x="370" y="30" width="13" height="22" stroke="currentColor" stroke-width=".8" fill="none"/>
<rect x="385" y="30" width="13" height="22" class="acc-fill" fill-opacity=".45" stroke="currentColor" stroke-width=".8" fill="currentColor"/>
<rect x="400" y="30" width="13" height="22" class="acc-fill" fill-opacity=".45" stroke="currentColor" stroke-width=".8" fill="currentColor"/>
<rect x="415" y="30" width="13" height="22" stroke="currentColor" stroke-width=".8" fill="none"/>
<rect x="430" y="30" width="13" height="22" stroke="currentColor" stroke-width=".8" fill="none"/>
<rect x="445" y="30" width="13" height="22" class="acc-fill" fill-opacity=".45" stroke="currentColor" stroke-width=".8" fill="currentColor"/>
<text x="451" y="46" text-anchor="middle" font-size="13" font-weight="700">×</text>
<rect x="460" y="30" width="13" height="22" stroke="currentColor" stroke-width=".8" fill="none"/>
<rect x="475" y="30" width="13" height="22" stroke="currentColor" stroke-width=".8" fill="none"/>
<rect x="490" y="30" width="13" height="22" class="acc-fill" fill-opacity=".45" stroke="currentColor" stroke-width=".8" fill="currentColor"/>
<rect x="505" y="30" width="13" height="22" class="acc-fill" fill-opacity=".45" stroke="currentColor" stroke-width=".8" fill="currentColor"/>
<text x="530" y="45" font-size="12">try 1</text>
<text x="530" y="60" font-size="11">hits an error</text>
<rect x="40" y="85" width="13" height="22" class="acc-fill" fill-opacity=".45" stroke="currentColor" stroke-width=".8" fill="currentColor"/>
<rect x="55" y="85" width="13" height="22" stroke="currentColor" stroke-width=".8" fill="none"/>
<rect x="70" y="85" width="13" height="22" class="acc-fill" fill-opacity=".45" stroke="currentColor" stroke-width=".8" fill="currentColor"/>
<rect x="85" y="85" width="13" height="22" class="acc-fill" fill-opacity=".45" stroke="currentColor" stroke-width=".8" fill="currentColor"/>
<text x="91" y="101" text-anchor="middle" font-size="13" font-weight="700">×</text>
<rect x="100" y="85" width="13" height="22" stroke="currentColor" stroke-width=".8" fill="none"/>
<rect x="115" y="85" width="13" height="22" class="acc-fill" fill-opacity=".45" stroke="currentColor" stroke-width=".8" fill="currentColor"/>
<rect x="130" y="85" width="13" height="22" class="acc-fill" fill-opacity=".45" stroke="currentColor" stroke-width=".8" fill="currentColor"/>
<rect x="145" y="85" width="13" height="22" stroke="currentColor" stroke-width=".8" fill="none"/>
<rect x="160" y="85" width="13" height="22" class="acc-fill" fill-opacity=".45" stroke="currentColor" stroke-width=".8" fill="currentColor"/>
<rect x="175" y="85" width="13" height="22" class="acc-fill" fill-opacity=".45" stroke="currentColor" stroke-width=".8" fill="currentColor"/>
<rect x="190" y="85" width="13" height="22" stroke="currentColor" stroke-width=".8" fill="none"/>
<rect x="205" y="85" width="13" height="22" class="acc-fill" fill-opacity=".45" stroke="currentColor" stroke-width=".8" fill="currentColor"/>
<rect x="220" y="85" width="13" height="22" stroke="currentColor" stroke-width=".8" fill="none"/>
<rect x="235" y="85" width="13" height="22" stroke="currentColor" stroke-width=".8" fill="none"/>
<rect x="250" y="85" width="13" height="22" stroke="currentColor" stroke-width=".8" fill="none"/>
<text x="256" y="101" text-anchor="middle" font-size="13" font-weight="700">×</text>
<rect x="265" y="85" width="13" height="22" stroke="currentColor" stroke-width=".8" fill="none"/>
<rect x="280" y="85" width="13" height="22" stroke="currentColor" stroke-width=".8" fill="none"/>
<rect x="295" y="85" width="13" height="22" class="acc-fill" fill-opacity=".45" stroke="currentColor" stroke-width=".8" fill="currentColor"/>
<rect x="310" y="85" width="13" height="22" class="acc-fill" fill-opacity=".45" stroke="currentColor" stroke-width=".8" fill="currentColor"/>
<rect x="325" y="85" width="13" height="22" stroke="currentColor" stroke-width=".8" fill="none"/>
<rect x="340" y="85" width="13" height="22" class="acc-fill" fill-opacity=".45" stroke="currentColor" stroke-width=".8" fill="currentColor"/>
<rect x="355" y="85" width="13" height="22" stroke="currentColor" stroke-width=".8" fill="none"/>
<rect x="370" y="85" width="13" height="22" class="acc-fill" fill-opacity=".45" stroke="currentColor" stroke-width=".8" fill="currentColor"/>
<rect x="385" y="85" width="13" height="22" stroke="currentColor" stroke-width=".8" fill="none"/>
<rect x="400" y="85" width="13" height="22" class="acc-fill" fill-opacity=".45" stroke="currentColor" stroke-width=".8" fill="currentColor"/>
<rect x="415" y="85" width="13" height="22" class="acc-fill" fill-opacity=".45" stroke="currentColor" stroke-width=".8" fill="currentColor"/>
<rect x="430" y="85" width="13" height="22" class="acc-fill" fill-opacity=".45" stroke="currentColor" stroke-width=".8" fill="currentColor"/>
<rect x="445" y="85" width="13" height="22" stroke="currentColor" stroke-width=".8" fill="none"/>
<text x="451" y="101" text-anchor="middle" font-size="13" font-weight="700">×</text>
<rect x="460" y="85" width="13" height="22" class="acc-fill" fill-opacity=".45" stroke="currentColor" stroke-width=".8" fill="currentColor"/>
<rect x="475" y="85" width="13" height="22" class="acc-fill" fill-opacity=".45" stroke="currentColor" stroke-width=".8" fill="currentColor"/>
<rect x="490" y="85" width="13" height="22" stroke="currentColor" stroke-width=".8" fill="none"/>
<rect x="505" y="85" width="13" height="22" stroke="currentColor" stroke-width=".8" fill="none"/>
<text x="530" y="100" font-size="12">try 2</text>
<text x="530" y="115" font-size="11">hits an error</text>
<rect x="40" y="140" width="13" height="22" stroke="currentColor" stroke-width=".8" fill="none"/>
<rect x="55" y="140" width="13" height="22" stroke="currentColor" stroke-width=".8" fill="none"/>
<rect x="70" y="140" width="13" height="22" class="acc-fill" fill-opacity=".45" stroke="currentColor" stroke-width=".8" fill="currentColor"/>
<rect x="85" y="140" width="13" height="22" stroke="currentColor" stroke-width=".8" fill="none"/>
<text x="91" y="156" text-anchor="middle" font-size="13" font-weight="700">×</text>
<rect x="100" y="140" width="13" height="22" class="acc-fill" fill-opacity=".45" stroke="currentColor" stroke-width=".8" fill="currentColor"/>
<rect x="115" y="140" width="13" height="22" stroke="currentColor" stroke-width=".8" fill="none"/>
<rect x="130" y="140" width="13" height="22" class="acc-fill" fill-opacity=".45" stroke="currentColor" stroke-width=".8" fill="currentColor"/>
<rect x="145" y="140" width="13" height="22" class="acc-fill" fill-opacity=".45" stroke="currentColor" stroke-width=".8" fill="currentColor"/>
<rect x="160" y="140" width="13" height="22" class="acc-fill" fill-opacity=".45" stroke="currentColor" stroke-width=".8" fill="currentColor"/>
<rect x="175" y="140" width="13" height="22" stroke="currentColor" stroke-width=".8" fill="none"/>
<rect x="190" y="140" width="13" height="22" class="acc-fill" fill-opacity=".45" stroke="currentColor" stroke-width=".8" fill="currentColor"/>
<rect x="205" y="140" width="13" height="22" class="acc-fill" fill-opacity=".45" stroke="currentColor" stroke-width=".8" fill="currentColor"/>
<rect x="220" y="140" width="13" height="22" stroke="currentColor" stroke-width=".8" fill="none"/>
<rect x="235" y="140" width="13" height="22" class="acc-fill" fill-opacity=".45" stroke="currentColor" stroke-width=".8" fill="currentColor"/>
<rect x="250" y="140" width="13" height="22" stroke="currentColor" stroke-width=".8" fill="none"/>
<text x="256" y="156" text-anchor="middle" font-size="13" font-weight="700">×</text>
<rect x="265" y="140" width="13" height="22" class="acc-fill" fill-opacity=".45" stroke="currentColor" stroke-width=".8" fill="currentColor"/>
<rect x="280" y="140" width="13" height="22" class="acc-fill" fill-opacity=".45" stroke="currentColor" stroke-width=".8" fill="currentColor"/>
<rect x="295" y="140" width="13" height="22" class="acc-fill" fill-opacity=".45" stroke="currentColor" stroke-width=".8" fill="currentColor"/>
<rect x="310" y="140" width="13" height="22" class="acc-fill" fill-opacity=".45" stroke="currentColor" stroke-width=".8" fill="currentColor"/>
<rect x="325" y="140" width="13" height="22" class="acc-fill" fill-opacity=".45" stroke="currentColor" stroke-width=".8" fill="currentColor"/>
<rect x="340" y="140" width="13" height="22" stroke="currentColor" stroke-width=".8" fill="none"/>
<rect x="355" y="140" width="13" height="22" class="acc-fill" fill-opacity=".45" stroke="currentColor" stroke-width=".8" fill="currentColor"/>
<rect x="370" y="140" width="13" height="22" stroke="currentColor" stroke-width=".8" fill="none"/>
<rect x="385" y="140" width="13" height="22" class="acc-fill" fill-opacity=".45" stroke="currentColor" stroke-width=".8" fill="currentColor"/>
<rect x="400" y="140" width="13" height="22" class="acc-fill" fill-opacity=".45" stroke="currentColor" stroke-width=".8" fill="currentColor"/>
<rect x="415" y="140" width="13" height="22" stroke="currentColor" stroke-width=".8" fill="none"/>
<rect x="430" y="140" width="13" height="22" stroke="currentColor" stroke-width=".8" fill="none"/>
<rect x="445" y="140" width="13" height="22" stroke="currentColor" stroke-width=".8" fill="none"/>
<text x="451" y="156" text-anchor="middle" font-size="13" font-weight="700">×</text>
<rect x="460" y="140" width="13" height="22" stroke="currentColor" stroke-width=".8" fill="none"/>
<rect x="475" y="140" width="13" height="22" class="acc-fill" fill-opacity=".45" stroke="currentColor" stroke-width=".8" fill="currentColor"/>
<rect x="490" y="140" width="13" height="22" stroke="currentColor" stroke-width=".8" fill="none"/>
<rect x="505" y="140" width="13" height="22" stroke="currentColor" stroke-width=".8" fill="none"/>
<text x="530" y="155" font-size="12">try 3</text>
<text x="530" y="170" font-size="11">no error inside: success</text>
<text x="40" y="205" font-size="12">× = error position (t = 3) · shaded = the k = 17 positions chosen as the information set</text>
</svg>
<figcaption>Figure 18.3. Information-set decoding. Choose k positions at random and trust them; the attempt succeeds when none of the t errors falls among them, with probability C(n − t, k)/C(n, k). For the toy code that is about 1 in 11; for Classic McEliece about 1 in 2¹⁴³.</figcaption>
</figure>

On the toy public key, Prange's attack recovers the message in about 22 tries on
average over 20 runs, against $\binom{32}{17}/\binom{29}{17} \approx 10.9$ predicted:
many random sets of columns give a singular submatrix and count as wasted tries. For
the real parameter sets, the last column gives $\log_2$ of the expected number of
Prange iterations: about $2^{143}$ for mceliece348864 up to $2^{300}$ for
mceliece8192128, each iteration costing a Gaussian elimination. Improvements by
Jacques Stern (1989), by Anja Becker, Antoine Joux, Alexander May and Alexander Meurer
(2012), and others lower the exponent by enumerating a few errors inside the
information set; the parameter sets are chosen against the best of them. Quantum
computers give at most a square-root speedup through Grover's algorithm (Daniel
Bernstein, 2010), which halves the exponent.

## 18.10 Quasi-cyclic codes: HQC and BIKE

*Level: expert.*

Classic McEliece's keys are large because a random-looking $k \times (n-k)$ matrix
takes $k(n-k)$ bits. **Quasi-cyclic** codes shrink it the way Ring-LWE shrinks LWE
(Chapter 15): their matrices are made of **circulant** blocks, each determined by its
first row, so a block is a polynomial in $GF(2)[x]/(x^r - 1)$ and multiplication is
polynomial multiplication.

- **BIKE** (Bit Flipping Key Encapsulation) uses quasi-cyclic moderate-density
  parity-check (QC-MDPC) codes, introduced for McEliece by Rafael Misoczki, Jean-Pierre
  Tillich, Nicolas Sendrier and Paulo Barreto (2013). The secret is a sparse parity
  check; decoding is iterative bit flipping, which fails with a small probability that
  must be pushed below $2^{-128}$ for chosen-ciphertext security.
- **HQC** (Hamming Quasi-Cyclic) has a public code that is quasi-cyclic and random,
  and a public, efficiently decodable code (concatenated Reed-Muller and Reed-Solomon)
  that carries the message; its security rests on quasi-cyclic syndrome decoding in a
  form close to Ring-LWE with Hamming weight in place of small coefficients.

NIST selected HQC in March 2025 as a second post-quantum KEM, based on codes rather
than lattices, so that a break of lattices would not leave the world without a
standard. BIKE was not selected. Both have keys and ciphertexts of a few kilobytes.

### Break it: structure that leaks

- **Reed-Solomon codes in McEliece.** Niederreiter's original 1986 proposal used
  generalized Reed-Solomon codes. Vladimir Sidelnikov and Sergey Shestakov (1992)
  recovered the secret structure from the public matrix in polynomial time: RS codes
  are too structured to disguise. Binary Goppa codes have resisted every such attack
  since 1978.
- **Message resending.** Textbook McEliece is malleable: if the same message is sent
  twice with different errors, the sum of the two ciphertexts reveals the union of the
  error positions, and decoding becomes easy (Thomas Berson, 1997).
- **Decoding failures.** For BIKE-like schemes, an attacker who can submit chosen
  ciphertexts and observe which ones fail to decode learns the secret key's structure
  (Qian Guo, Thomas Johansson and Paul Stankovski, 2016, against QC-MDPC McEliece).

### Fix it

- Use binary Goppa codes for McEliece-style encryption, not RS or other algebraic
  codes with known structural attacks.
- Use a chosen-ciphertext-secure KEM transform (as Classic McEliece and HQC do), so a
  message is never encrypted twice and malformed ciphertexts are rejected.
- For decoders that can fail, prove the failure rate below $2^{-128}$, or design so
  failures do not depend on the secret.

## In the real world

- **Error correction everywhere**: Reed-Solomon in QR codes, discs, RAID-6 and deep
  space; LDPC and polar codes in 5G and Wi-Fi; Hamming-style SECDED codes in server
  memory.
- **Classic McEliece** is used in some post-quantum VPN designs (Rosenpass, for
  example) for long-term keys; ISO standardization is under way.
- **HQC** is being standardized by NIST after its 2025 selection.
- **Fuzzy extractors and PUFs** use BCH and Reed-Muller codes to turn noisy readings
  into stable keys (Chapter 17).

## Going deeper

- *BCH codes and Reed-Muller codes*: the classical algebraic families; BCH codes are
  subfield subcodes of Reed-Solomon codes, as Goppa codes are of generalized RS codes.
- *Distinguishers for high-rate Goppa codes*: Jean-Charles Faugère, Valérie
  Gauthier-Umaña, Ayoub Otmani, Ludovic Perret and Jean-Pierre Tillich (2011) showed
  that Goppa codes of very high rate can be told apart from random codes, though no
  key recovery follows for the parameters in use.
- *Rank-metric codes* (Gabidulin codes) give another family of code-based schemes,
  with their own attacks and repairs.
- *Shannon's channel coding theorem*: random codes achieve capacity; turbo codes,
  LDPC codes and polar codes approach it with efficient decoding.

## Check yourself

??? question "1. What are the distance and decoding radius of the 5-fold repetition code?"

    $d = 5$, $t = 2$.

??? question "2. Decode the Hamming [7, 4] word $0110\,011$."

    Checks: $d_1 + d_2 + d_4 + p_1 = 0 + 1 + 0 + 0 = 1$, $d_1 + d_3 + d_4 + p_2 = 0 + 1 +
    0 + 1 = 0$, $d_2 + d_3 + d_4 + p_3 = 1 + 1 + 0 + 1 = 1$. Syndrome $(1, 0, 1)$
    points to $d_2$ (in checks 1 and 3 only). Corrected: $0010\,011$, message $0010$.

??? question "3. Why is the minimum distance of a linear code equal to its minimum nonzero weight?"

    $d(x, y) = \mathrm{wt}(x - y)$, and $x - y$ is a nonzero codeword whenever
    $x \ne y$ are codewords; conversely $\mathrm{wt}(c) = d(c, 0)$ and $0$ is a
    codeword.

??? question "4. Is there a binary $[10, 5, 6]$ code?"

    Singleton allows $k \le 5$, but the Hamming bound with $t = 2$ requires $2^5(1 +
    10 + 45) = 1792 \le 1024$, which fails. No.

??? question "5. In Berlekamp-Welch with $n = 15$, $k = 5$, how many unknowns and equations are there?"

    $e = 5$: $k + e = 10$ coefficients of $Q$ and $e = 5$ of $E$, so 15 unknowns and 15
    equations.

??? question "6. A binary Goppa code has $m = 12$, $n = 3488$, $t = 64$. What are $k$ and the error-correcting capability?"

    $k = 3488 - 12 \cdot 64 = 2720$; it corrects 64 errors.

??? question "7. Why does McEliece need the permutation $P$ and the scrambler $S$?"

    Without them the public matrix would be the Goppa code's own generator matrix, in a
    form that reveals its structure (for example a systematic form tied to the
    support). They make the public key look like a random code.

??? question "8. With $n = 32$, $k = 17$, $t = 3$, what is the chance that a random information set avoids every error?"

    $\binom{29}{17}/\binom{32}{17} \approx 0.092$, about one in 10.9.

??? question "9. Why are quasi-cyclic keys smaller?"

    A circulant $r \times r$ block is determined by its first row, $r$ bits instead of
    $r^2$.

## What you learned

- Minimum distance $d$ corrects $\lfloor (d-1)/2 \rfloor$ errors; the Hamming code
  locates a single error by its syndrome.
- Linear codes are given by $G$ or $H$; syndromes depend only on the error; $d$ is the
  smallest number of dependent columns of $H$.
- Singleton ($k \le n - d + 1$), Hamming (sphere packing) and Gilbert-Varshamov
  (existence) bound what is possible; Golay $[23, 12, 7]$ is perfect.
- Berlekamp-Welch corrects $(n-k)/2$ Reed-Solomon errors by solving one linear system.
- Binary Goppa codes over $GF(2^m)$ with a square-free $g$ of degree $t$ have
  $k \ge n - mt$ and correct $t$ errors.
- McEliece hides a Goppa code as $SGP$; Classic McEliece has keys of 0.26 to 1.4 MB
  and ciphertexts under 210 bytes.
- Syndrome decoding is NP-complete; information-set decoding is the generic attack;
  HQC and BIKE use quasi-cyclic structure for small keys, and HQC was selected by NIST
  in 2025.

**Next:** [Chapter 19](19-Complexity-and-Reductions.md), complexity, reductions and
hard problems: what "hard" means, and how the assumptions behind cryptography relate.

## Further reading

- F. Jessie MacWilliams and Neil Sloane, *The Theory of Error-Correcting Codes*
  (North-Holland, 1977): the classic reference, including Goppa codes.
- Ron Roth, *Introduction to Coding Theory* (Cambridge, 2006).
- Richard Hamming, "Error Detecting and Error Correcting Codes", *Bell System Technical
  Journal* 29 (1950).
- Robert McEliece, "A Public-Key Cryptosystem Based on Algebraic Coding Theory", DSN
  Progress Report 42-44 (1978).
- Elwyn Berlekamp, Robert McEliece and Henk van Tilborg, "On the Inherent
  Intractability of Certain Coding Problems", *IEEE Transactions on Information Theory*
  24 (1978).
- Nicholas Patterson, "The Algebraic Decoding of Goppa Codes", *IEEE Transactions on
  Information Theory* 21 (1975).
- Daniel Bernstein, Tanja Lange and Christiane Peters, "Attacking and Defending the
  McEliece Cryptosystem", PQCrypto 2008.
- The Classic McEliece, HQC and BIKE specifications (NIST post-quantum project, round 4).
- In *Post-quantum cryptography*: [chapter 13](../post-quantum/13-Code-Based-Encryption-McEliece.md);
  in *The cryptography book*: [Chapter 22](../../book/22-Hash-and-Code-Based.md).
