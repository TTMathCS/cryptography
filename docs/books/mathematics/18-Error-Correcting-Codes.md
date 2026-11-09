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
weight enumerators and the MacWilliams identity, Reed-Solomon decoding with the
Berlekamp-Welch algorithm, binary Goppa codes with two working decoders (Patterson's
among them), a toy McEliece, the information-set decoding attack, the quasi-cyclic
codes of HQC and BIKE with the Reed-Muller codes inside HQC, and list decoding past
half the minimum distance.*

!!! abstract "In this chapter"
    **You will learn:**

    - Hamming distance, decoding radius, and the Hamming [7, 4] code, by hand;
    - linear codes: generator and parity-check matrices, syndromes, duals, and why
      the minimum distance is a property of the columns of $H$;
    - weight distributions and the MacWilliams identity, worked for the Hamming code;
    - the Singleton, Hamming and Gilbert-Varshamov bounds, with proofs, the perfect
      Golay code, and why a random code meets the Gilbert-Varshamov bound;
    - Reed-Solomon codes decoding errors at unknown places (Berlekamp-Welch);
    - binary Goppa codes over $GF(2^m)$, and Patterson's decoder step by step: why it
      corrects $t$ errors where a generic decoder manages $t/2$;
    - McEliece and Niederreiter, Classic McEliece's parameters, and a working toy;
    - syndrome decoding as an NP-hard problem, and Prange's information-set decoding;
    - quasi-cyclic codes as polynomials modulo $x^r - 1$, and the schemes HQC and BIKE;
    - Reed-Muller codes and Reed's majority-logic decoder;
    - list decoding (Sudan, Guruswami-Sudan) and the Johnson bound.

    **You need:** [Chapter 8](08-Rings-Fields-and-Polynomials.md) (finite fields
    $GF(2^m)$, polynomials), [Chapter 9](09-Linear-Algebra.md) (matrices over
    $GF(2)$, elimination) and [Chapter 11](11-Polynomials-at-Work.md) (Reed-Solomon
    codes and interpolation); [Chapter 10](10-Boolean-Functions-and-S-Boxes.md) (the
    Walsh-Hadamard transform) and [Chapter 14](14-Lattices.md) (lattice reduction) help
    in §18.4, §18.11 and §18.12.

    **Levels:** §18.1 to §18.3 are for beginners, §18.4 to §18.6 and §18.11 are
    intermediate, §18.7 to §18.10, §18.12 and §18.13 are expert.

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

### Weight distribution and the MacWilliams identity

The **weight distribution** $A_0, \ldots, A_n$ counts the codewords of each weight $w$,
packed into the **weight enumerator**

$$
W_C(x, y) = \sum_{c \in C} x^{\,n - \mathrm{wt}(c)}\, y^{\,\mathrm{wt}(c)} = \sum_{w=0}^{n} A_w\, x^{n-w} y^w .
$$

The Hamming $[7, 4]$ code has $W_C = x^7 + 7x^4y^3 + 7x^3y^4 + y^7$. Its dual, spanned
by the rows of $H$, is the **simplex code** $[7, 3, 4]$: the zero word and seven words of
weight 4.

Jessie MacWilliams proved in 1963 that the weight distribution of a linear code fixes
that of its dual:

$$
W_{C^\perp}(x, y) = \frac{1}{|C|}\, W_C(x + y,\; x - y).
$$

*Proof.* For a fixed word $u$, the sum $\sum_{c \in C} (-1)^{u \cdot c}$ equals $|C|$ if
$u \in C^\perp$ and 0 otherwise: if some $c_0 \in C$ has $u \cdot c_0 = 1$, then adding
$c_0$ pairs the codewords off with opposite signs. Hence
$\sum_{u \in C^\perp} f(u) = \frac{1}{|C|} \sum_{c \in C} \sum_{u} (-1)^{u \cdot c} f(u)$
for any function $f$. Take $f(u) = x^{n - \mathrm{wt}(u)} y^{\mathrm{wt}(u)}$. The inner sum
splits coordinate by coordinate: a position where $c_i = 0$ contributes $x + y$ (from
$u_i = 0$ and $u_i = 1$) and a position where $c_i = 1$ contributes $x - y$. So the inner
sum is $(x + y)^{n - \mathrm{wt}(c)} (x - y)^{\mathrm{wt}(c)}$, and summing over $c$ gives
the identity. $\blacksquare$ It is the Walsh-Hadamard transform of
[Chapter 10](10-Boolean-Functions-and-S-Boxes.md) applied to a whole code.

**By hand.** Apply it to the Hamming code, $|C| = 16$:

$$
W_{C^\perp} = \tfrac{1}{16}\bigl[(x+y)^7 + 7(x+y)^4(x-y)^3 + 7(x+y)^3(x-y)^4 + (x-y)^7\bigr].
$$

The coefficient of $x^7$ is $(1 + 7 + 7 + 1)/16 = 1$: the zero word. The coefficient of
$x^6 y$ takes $7$ from the first term, $7 \cdot (4 - 3) = 7$ from the second, $7 \cdot (3 -
4) = -7$ from the third and $-7$ from the last: total 0, so the dual has no word of weight
1. For $x^3 y^4$: $(x+y)^7$ gives $\binom74 = 35$; $(x+y)^4(x-y)^3$ gives
$1 - 12 + 18 - 4 = 3$ (take $y$ from $4 - i$ factors of the first bracket and from $i$ of
the second, with sign $(-1)^i$); $(x+y)^3(x-y)^4$ gives 3 the same way; $(x-y)^7$ gives
$+35$. So $A^\perp_4 = (35 + 7 \cdot 3 + 7 \cdot 3 + 35)/16 = 112/16 = 7$: the seven
weight-4 words of the simplex code, counted without listing one of them.

```python
# Uses itertools, encode(), G and H from the Hamming listing above.
# Weight distributions, and the MacWilliams identity checked both ways.
from math import comb

def weight_distribution(Gm):
    A = [0] * (len(Gm[0]) + 1)
    for m in itertools.product([0, 1], repeat=len(Gm)):
        A[sum(encode(list(m), Gm))] += 1
    return A

def krawtchouk(n, j, w):
    """Coefficient of x^(n-j) y^j in (x + y)^(n-w) (x - y)^w."""
    return sum((-1) ** i * comb(w, i) * comb(n - w, j - i) for i in range(j + 1))

def macwilliams(A):
    n, size = len(A) - 1, sum(A)
    return [sum(A[w] * krawtchouk(n, j, w) for w in range(n + 1)) // size for j in range(n + 1)]

A, B = weight_distribution(G), weight_distribution(H)     # Hamming [7,4] and simplex [7,3]
print(A, B, macwilliams(A) == B, macwilliams(B) == A)
p = 0.01                                          # chance that noise turns one codeword into another
print("%.3e" % sum(A[w] * p**w * (1 - p)**(7 - w) for w in range(1, 8)))
```

It prints:

```text
[1, 0, 0, 7, 7, 0, 0, 1] [1, 0, 0, 0, 7, 0, 0, 0] True True
6.792e-06
```

The sums $\sum_i (-1)^i \binom{w}{i}\binom{n-w}{j-i}$ are **Krawtchouk polynomials**. The
last line is a use: with each bit flipped with probability $1/100$, an error goes
*undetected* only if it is a nonzero codeword, with probability $\sum_w A_w p^w
(1-p)^{7-w} \approx 6.8 \times 10^{-6}$.

The dual's weights matter in cryptography through a theorem of Philippe Delsarte
(1973): if $C^\perp$ has minimum distance $d^\perp$, any $d^\perp - 1$ coordinates of a
uniformly random codeword of $C$ are independent and uniform. For the Hamming code
$d^\perp = 4$, so any 3 of the 7 bits of a random codeword are uniform and independent.
That is how codes stretch a few random bits into many $k$-wise independent ones, for
masking against side channels and for code-based secret sharing (James Massey, 1993,
tied who can recover the secret to the minimal codewords of the dual).

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

### Why a random code meets the Gilbert-Varshamov bound

Varshamov's proof builds a good code greedily. A second proof, the one cryptography
needs, shows that almost any code is that good. Choose $H$ uniformly at random. For a fixed nonzero word $x$, the syndrome
$Hx^T$ is a uniformly random vector of length $n - k$ (some column of $H$ that $x$
selects is uniform and independent of the rest), so $x$ is a codeword with probability
exactly $2^{-(n-k)}$. By linearity of expectation, the number of nonzero codewords of
weight below $d$ has mean

$$
\mathbb{E}\bigl[\#\{c \in C: 0 < \mathrm{wt}(c) < d\}\bigr] = \frac{\sum_{i=1}^{d-1} \binom{n}{i}}{2^{\,n-k}},
$$

and when this is below 1, some code (indeed most codes, by Markov's inequality, when it
is well below 1) has minimum distance at least $d$. For long codes write $\delta = d/n$ and
$R = k/n$; since $\sum_{i \le \delta n} \binom{n}{i} \approx 2^{n H(\delta)}$ with the binary
entropy $H(\delta) = -\delta \log_2 \delta - (1 - \delta)\log_2(1-\delta)$ of
[Chapter 17](17-Information-and-Entropy.md), the condition becomes

$$
R < 1 - H(\delta).
$$

That is the asymptotic Gilbert-Varshamov bound: random linear codes reach the curve
$R = 1 - H(\delta)$ with probability tending to 1. Above it nobody has found a family of
long binary codes, random or explicit; whether any exists is one of the oldest open
questions in coding theory. (For alphabets of 49 or more symbols, the algebraic-geometry
codes of Michael Tsfasman, Serge Vlăduţ and Thomas Zink, 1982, beat it.) Binary Goppa
codes sit near the curve too: there are long Goppa codes that meet it, and the designed
distance $2t + 1$ of Classic McEliece's codes puts them right beside it (Figure 18.2).

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Rate against relative distance for binary codes: the Singleton line on top, the Hamming bound curve below it, and the Gilbert-Varshamov curve lowest; random codes lie on the GV curve and the mceliece348864 Goppa code lies just above it" fill="currentColor" font-size="13">
<g stroke="currentColor" fill="none">
<path d="M70 30 V250 H590" stroke-width="1.2"/>
<path d="M70 30 L590 140" stroke-width="1.2" stroke-dasharray="6 4"/>
<polyline stroke-width="1.5" points="70,30 96,51 122,67 148,81 174,93 200,104 226,115 252,124 278,133 304,142 330,150 356,157 382,164 408,171 434,177 460,183 486,189 512,194 538,199 564,204 590,208"/>
<polyline stroke-width="2.5" points="70,30 96,67 122,93 148,115 174,133 200,150 226,164 252,177 278,189 304,199 330,208 356,217 382,224 408,230 434,235 460,240 486,244 512,246 538,248 564,250 590,250"/>
</g>
<circle cx="108" cy="78" r="5"/>
<path d="M110 84 L150 172" stroke="currentColor" stroke-dasharray="3 3"/>
<text x="130" y="186" font-size="12">mceliece348864</text>
<text x="130" y="201" font-size="12">δ = 0.037, R = 0.78</text>
<text x="360" y="82" font-size="12">Singleton: R = 1 − δ</text>
<text x="420" y="160" font-size="12">Hamming: R = 1 − H(δ/2)</text>
<text x="420" y="216" font-size="12" font-weight="700">GV: R = 1 − H(δ)</text>
<text x="420" y="231" font-size="12" fill-opacity=".7">random codes land here</text>
<text x="70" y="270" text-anchor="middle" font-size="12">0</text>
<text x="330" y="270" text-anchor="middle" font-size="12">0.25</text>
<text x="590" y="270" text-anchor="middle" font-size="12">0.5</text>
<text x="330" y="290" text-anchor="middle">relative distance δ = d/n</text>
<text x="60" y="34" text-anchor="end" font-size="12">1</text>
<text x="60" y="254" text-anchor="end" font-size="12">0</text>
<text x="40" y="145" text-anchor="middle" transform="rotate(-90 40 145)">rate R = k/n</text>
</svg>
<figcaption>Figure 18.2. What is possible for long binary codes. Nothing exists above the Hamming curve; random linear codes land on the Gilbert-Varshamov curve. Classic McEliece's smallest Goppa code, with d = 2t + 1 = 129, sits on it.</figcaption>
</figure>

**Why this makes decoding hard.** For a syndrome $s$ and weight $w$, the expected number
of $e$ of weight $w$ with $He^T = s$ is $\binom{n}{w} / 2^{n-k}$. Below the
**Gilbert-Varshamov weight** $w_{GV}$, where $\binom{n}{w} = 2^{n-k}$, a random syndrome
has at most one such $e$; above it, exponentially many. A planted error of weight $t <
w_{GV}$ is the unique answer, hidden in a code that looks random. Information-set
decoding (§18.9) is hardest near $w_{GV}$; McEliece sits at $t \approx w_{GV}/2$, where
decoding is unique and still exponentially hard.

```python
# Uses comb from the listing above.
# Random codes against the Gilbert-Varshamov bound: the first moment, and an experiment.
import random
from collections import Counter
from math import lgamma, log

def min_weight(rows):                             # rows as n-bit integers; a Gray code walks all 2^k - 1 sums
    best, cw = None, 0
    for i in range(1, 1 << len(rows)):
        cw ^= rows[(i & -i).bit_length() - 1]
        w = bin(cw).count("1")
        best = w if best is None else min(best, w)
    return best

n, k = 24, 12
print([round(comb(n, w) / 2 ** (n - k), 2) for w in range(1, 7)])   # expected codewords of weight w
rng = random.Random(1952)
print(sorted(Counter(min_weight([rng.getrandbits(n) for _ in range(k)]) for _ in range(1000)).items()))

def log2_binom(a, b):
    return (lgamma(a + 1) - lgamma(b + 1) - lgamma(a - b + 1)) / log(2)
for name, mm, nn, tt in (("mceliece348864", 12, 3488, 64), ("mceliece6688128", 13, 6688, 128)):
    r = mm * tt                                   # n - k
    w_gv = next(w for w in range(nn) if log2_binom(nn, w) >= r)
    print(name, w_gv, 2 * tt + 1, round(log2_binom(nn, tt) - r, 1))
```

It prints:

```text
[0.01, 0.07, 0.49, 2.59, 10.38, 32.86]
[(1, 5), (2, 67), (3, 366), (4, 531), (5, 31)]
mceliece348864 125 129 -311.7
mceliece6688128 279 257 -755.4
```

For random $[24, 12]$ codes the first moment predicts half a codeword of weight 3 and
two or three of weight 4, so a minimum distance of 3 or 4; 897 of 1,000 random codes
have exactly that. (Short random codes are not the best: the extended Golay code
reaches 8.) For Classic McEliece the designed distance $2t + 1$ is close to the GV weight
(129 against 125, 257 against 279), and with $t$ errors the expected number of *other*
solutions to the syndrome equation is $2^{-312}$ and $2^{-755}$: the planted error is the
only one.

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
Euclidean algorithm, and find the roots of $\sigma$. Section 18.12 works Patterson's
algorithm in full.

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
it in 2025, and ISO added it to ISO/IEC 18033-2 in an amendment published in 2026.

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

The security argument behind those parameters is that the scrambled Goppa code cannot be
told from a random one, so the best attack is generic decoding (§18.9). In 2026 a series
of preprints found new distinguishers for binary Goppa codes, one running in
quasipolynomial time, with conditional key-recovery estimates below the parameter sets'
targets but no full-size key recovered, and in October 2026 Germany's BSI advised against
using Classic McEliece in new developments; the *Post-quantum cryptography* book tells
the story and how to read it in
[§13.10](../post-quantum/13-Code-Based-Encryption-McEliece.md#1310-standards-and-the-attacks-of-2026).

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
<figcaption>Figure 18.3. The McEliece public key is a disguised Goppa code. Without the disguise removed, decrypting means decoding t errors in what looks like a random linear code, the syndrome decoding problem.</figcaption>
</figure>

## 18.9 Syndrome decoding and information-set decoding

*Level: expert.*

The **syndrome decoding problem**: given a parity-check matrix $H$, a syndrome $s$
and a weight $w$, find $e$ with $He^T = s$ and $\mathrm{wt}(e) \le w$. Elwyn Berlekamp, Robert McEliece and Henk van Tilborg proved in 1978 that it is NP-complete. As with
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
<g stroke="currentColor" stroke-width=".8">
<path class="acc-fill" fill="currentColor" fill-opacity=".45" d="M40 30h13v22h-13zM55 30h13v22h-13zM70 30h13v22h-13zM85 30h13v22h-13zM100 30h13v22h-13zM145 30h13v22h-13zM175 30h13v22h-13zM205 30h13v22h-13zM220 30h13v22h-13zM265 30h13v22h-13zM280 30h13v22h-13zM295 30h13v22h-13zM385 30h13v22h-13zM400 30h13v22h-13zM445 30h13v22h-13zM490 30h13v22h-13zM505 30h13v22h-13z
M40 85h13v22h-13zM70 85h13v22h-13zM85 85h13v22h-13zM115 85h13v22h-13zM130 85h13v22h-13zM160 85h13v22h-13zM175 85h13v22h-13zM205 85h13v22h-13zM295 85h13v22h-13zM310 85h13v22h-13zM340 85h13v22h-13zM370 85h13v22h-13zM400 85h13v22h-13zM415 85h13v22h-13zM430 85h13v22h-13zM460 85h13v22h-13zM475 85h13v22h-13z
M70 140h13v22h-13zM100 140h13v22h-13zM130 140h13v22h-13zM145 140h13v22h-13zM160 140h13v22h-13zM190 140h13v22h-13zM205 140h13v22h-13zM235 140h13v22h-13zM265 140h13v22h-13zM280 140h13v22h-13zM295 140h13v22h-13zM310 140h13v22h-13zM325 140h13v22h-13zM355 140h13v22h-13zM385 140h13v22h-13zM400 140h13v22h-13zM475 140h13v22h-13z"/>
<path fill="none" d="M115 30h13v22h-13zM130 30h13v22h-13zM160 30h13v22h-13zM190 30h13v22h-13zM235 30h13v22h-13zM250 30h13v22h-13zM310 30h13v22h-13zM325 30h13v22h-13zM340 30h13v22h-13zM355 30h13v22h-13zM370 30h13v22h-13zM415 30h13v22h-13zM430 30h13v22h-13zM460 30h13v22h-13zM475 30h13v22h-13z
M55 85h13v22h-13zM100 85h13v22h-13zM145 85h13v22h-13zM190 85h13v22h-13zM220 85h13v22h-13zM235 85h13v22h-13zM250 85h13v22h-13zM265 85h13v22h-13zM280 85h13v22h-13zM325 85h13v22h-13zM355 85h13v22h-13zM385 85h13v22h-13zM445 85h13v22h-13zM490 85h13v22h-13zM505 85h13v22h-13z
M40 140h13v22h-13zM55 140h13v22h-13zM85 140h13v22h-13zM115 140h13v22h-13zM175 140h13v22h-13zM220 140h13v22h-13zM250 140h13v22h-13zM340 140h13v22h-13zM370 140h13v22h-13zM415 140h13v22h-13zM430 140h13v22h-13zM445 140h13v22h-13zM460 140h13v22h-13zM490 140h13v22h-13zM505 140h13v22h-13z"/>
</g>
<text x="91" y="46" text-anchor="middle" font-size="13" font-weight="700">×</text>
<text x="256" y="46" text-anchor="middle" font-size="13" font-weight="700">×</text>
<text x="451" y="46" text-anchor="middle" font-size="13" font-weight="700">×</text>
<text x="530" y="45" font-size="12">try 1</text>
<text x="530" y="60" font-size="11">hits an error</text>
<text x="91" y="101" text-anchor="middle" font-size="13" font-weight="700">×</text>
<text x="256" y="101" text-anchor="middle" font-size="13" font-weight="700">×</text>
<text x="451" y="101" text-anchor="middle" font-size="13" font-weight="700">×</text>
<text x="530" y="100" font-size="12">try 2</text>
<text x="530" y="115" font-size="11">hits an error</text>
<text x="91" y="156" text-anchor="middle" font-size="13" font-weight="700">×</text>
<text x="256" y="156" text-anchor="middle" font-size="13" font-weight="700">×</text>
<text x="451" y="156" text-anchor="middle" font-size="13" font-weight="700">×</text>
<text x="530" y="155" font-size="12">try 3</text>
<text x="530" y="170" font-size="11">no error inside: success</text>
<text x="40" y="205" font-size="12">× = error position (t = 3) · shaded = the k = 17 positions chosen as the information set</text>
</svg>
<figcaption>Figure 18.4. Information-set decoding. Choose k positions at random and trust them; the attempt succeeds when none of the t errors falls among them, with probability C(n − t, k)/C(n, k). For the toy code that is about 1 in 11; for Classic McEliece about 1 in 2¹⁴³.</figcaption>
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

### Quasi-cyclic codes as polynomials modulo $x^r - 1$

An $r \times r$ circulant matrix is fixed by its first row, and shifting a row one place
is multiplying $a(x) = \sum a_i x^i$ by $x$ in the ring

$$
\mathcal{R} = GF(2)[x]/(x^r - 1),
$$

where $x^r = 1$ sends the last coefficient back to the front. Sums and products of
circulants are circulants, and the map from a circulant to its polynomial respects
both, so the matrices *are* the ring (the [Post-quantum book](../post-quantum/14-HQC-and-BIKE.md#circulants-by-hand)
checks a product both ways). A **quasi-cyclic** code of index 2 has a
parity-check matrix $[\,H_0 \mid H_1\,]$ of two circulant blocks, and the syndrome of an
error $(e_0, e_1)$ is the ring element $s = e_0 h_0 + e_1 h_1$. BIKE publishes
$h = h_1 h_0^{-1}$, so a syndrome is $e_0 + e_1 h$; HQC publishes $h$ and $s = x + h y$
with sparse secrets $x$ and $y$, the code-based twin of Ring-LWE's $b = as + e$.

The shape of this ring decides what an attacker can do. For odd $r$, $x^r - 1$
has no repeated factors (its derivative $r x^{r-1}$ shares none with it), so by the
Chinese remainder theorem ([Chapter 3](03-Modular-Arithmetic.md),
[Chapter 8](08-Rings-Fields-and-Polynomials.md)) $\mathcal{R}$ is a product of fields, one
for each irreducible factor. The factors are found without factoring. The roots of
$x^r - 1$ are the powers $\zeta^i$ of a primitive $r$-th root of unity, and squaring
(the Frobenius map) permutes them, $\zeta^i \mapsto \zeta^{2i}$. An irreducible factor
over $GF(2)$ collects one orbit, a **cyclotomic coset** $\{i, 2i, 4i, \ldots\} \bmod r$.

**By hand, $r = 7$.** The cosets are $\{0\}$, $\{1, 2, 4\}$ and $\{3, 6, 5\}$, so $x^7 - 1$
has one factor of degree 1 and two of degree 3:

$$
x^7 + 1 = (x + 1)(x^3 + x + 1)(x^3 + x^2 + 1).
$$

Check the last two: $x^3(x^3 + x^2 + 1) + x(x^3 + x^2 + 1) + (x^3 + x^2 + 1) = x^6 + x^5 +
x^4 + x^3 + x^2 + x + 1$, since three $x^3$ terms leave one; times $x + 1$ that is $x^7 +
1$. So $\mathcal{R} \cong GF(2) \times GF(8) \times GF(8)$, and an element is invertible
exactly when its three components are nonzero: $1 \cdot 7 \cdot 7 = 49$ units among the
128 elements. The component in $GF(2)$ is $a(1)$, the parity of the weight, so no
even-weight element is ever invertible; that is why BIKE's secret blocks have odd
weight.

Each small factor $f$ gives a ring map $\mathcal{R} \to GF(2)[x]/(f)$ that folds the
whole public key into a problem of size $\deg f$. So designers pick a prime $r$ with 2 a
primitive root: the cosets are then $\{0\}$ and everything else, $x^r - 1 = (x + 1)\,\Phi_r(x)$ with $\Phi_r = 1 + x + \cdots +
x^{r-1}$ irreducible, and $\mathcal{R} \cong GF(2) \times GF(2^{r-1})$. The only small
image is the parity, which is public anyway. The units are then the odd-weight elements
except $\Phi_r$ itself, $2^{r-1} - 1$ of them.

```python
# The ring GF(2)[x]/(x^r - 1), polynomials stored as integers (bit i = coefficient of x^i).
def pmod2(a, m):                                  # remainder of a modulo m in GF(2)[x]
    while a and a.bit_length() >= m.bit_length():
        a ^= m << (a.bit_length() - m.bit_length())
    return a

def pgcd2(a, b):
    while b:
        a, b = b, pmod2(a, b)
    return a

def cyclotomic_cosets(r):                         # orbits of i -> 2i mod r: one factor of x^r - 1 each
    seen, out = set(), []
    for i in range(r):
        if i not in seen:
            c, j = [], i
            while j not in c:
                c.append(j)
                j = 2 * j % r
            seen.update(c)
            out.append(c)
    return out

for r in (7, 9, 11, 15, 17):
    sizes = [len(c) for c in cyclotomic_cosets(r)]
    predicted = 1
    for s in sizes:
        predicted *= 2 ** s - 1                   # CRT: units of a product of fields GF(2^s)
    units = sum(pgcd2((1 << r) | 1, a) == 1 for a in range(1, 1 << r))
    print(r, sizes, predicted, units)

def order_of_2(r):
    k, v = 1, 2 % r
    while v != 1:
        k, v = k + 1, 2 * v % r
    return k

print([(r, order_of_2(r) == r - 1) for r in (12323, 24659, 40973, 17669, 35851, 57637)])
```

It prints:

```text
7 [1, 3, 3] 49 49
9 [1, 6, 2] 189 189
11 [1, 10] 1023 1023
15 [1, 4, 4, 2, 4] 10125 10125
17 [1, 8, 8] 65025 65025
[(12323, True), (24659, True), (40973, True), (17669, True), (35851, True), (57637, True)]
```

The brute-force count of units agrees with the coset prediction for every $r$, and the
bad cases show at once: $r = 17$ splits into two fields of $2^8$ elements. The last line
checks that 2 is a primitive root modulo BIKE's three block lengths and HQC's three.

One symmetry cannot be removed: multiplying by $x^i$ turns a solution $(e_0, e_1)$ for
$s$ into $(x^i e_0, x^i e_1)$ for $x^i s$, so an attacker gets $r$ instances for one.
Nicolas Sendrier's "decoding one out of many" (2011) turns $N$ instances into a speedup
of about $\sqrt N$, so a quasi-cyclic syndrome is about $\sqrt r$ easier to decode, and the
secret key, any of whose $r$ shifts will do, about $r$ times easier to find. BIKE's parameters are chosen with both factors counted: about 7 and 14 bits at
its smallest block length, $r = 12{,}323$.

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

## 18.11 Reed-Muller codes and majority logic

*Level: intermediate.*

HQC's inner code, which must survive a channel flipping about a third of the bits, is
a Reed-Muller code: the family David Muller found in 1954 while studying switching
circuits, and for which Irving Reed, the same year, gave a decoder that only counts
votes. In 1971 Mariner 9, the first spacecraft to orbit Mars, sent its pictures home in
$RM(1, 5)$, 32 bits for every 6-bit pixel.

**The code.** A Boolean function of $m$ variables has an algebraic normal form, a
polynomial over $GF(2)$ in which no variable appears squared
([Chapter 10](10-Boolean-Functions-and-S-Boxes.md)). The **Reed-Muller code**
$RM(r, m)$ is the set of truth tables, of length $n = 2^m$, of all such polynomials of
degree at most $r$. Its dimension is the number of monomials of degree at most $r$, and
its minimum distance is $2^{m-r}$:

$$
RM(r, m) = \Bigl[\, 2^m,\; \sum_{i=0}^{r} \binom{m}{i},\; 2^{m-r} \Bigr].
$$

*Proof of the distance.* Write a polynomial of degree at most $r$ as $f = g + x_{m-1} h$,
with $g$ of degree at most $r$ and $h$ of degree at most $r - 1$, neither involving
$x_{m-1}$. On the half of the inputs where $x_{m-1} = 0$ the truth table of $f$ is that of
$g$; on the other half it is that of $g + h$. If $h = 0$ the weight is $2\,\mathrm{wt}(g)$,
at least $2 \cdot 2^{m-1-r}$ by induction. Otherwise $\mathrm{wt}(g) + \mathrm{wt}(g + h)
\ge \mathrm{wt}(h) \ge 2^{(m-1)-(r-1)}$, by the triangle inequality and induction. The
monomial $x_0 x_1 \cdots x_{r-1}$ has weight exactly $2^{m-r}$, so the bound is
reached. $\blacksquare$

$RM(0, m)$ is the repetition code, $RM(m-2, m)$ the extended Hamming code, and the dual
of $RM(r, m)$ is $RM(m-r-1, m)$; $RM(1, 3)$, the $[8, 4, 4]$ extended Hamming code, is
its own dual.

**Reed's decoder.** Sum a codeword over a **subcube**: fix all variables outside a set
$S$ of $r$ variables and let those in $S$ run through all $2^r$ values. Every monomial
that misses some variable of $S$ is counted an even number of times and drops out;
every monomial of degree $r$ other than $x_S = \prod_{i \in S} x_i$ misses one. So the sum
is the coefficient of $x_S$. The $2^{m-r}$ subcubes are disjoint, so fewer than
$2^{m-r-1}$ errors leave most votes right. Decode the top-degree coefficients, subtract
that part, and repeat at degree $r - 1$. This corrects up to $2^{m-r-1} - 1$ errors.

**By hand.** In $RM(1, 3)$ number the positions $j = 0, \ldots, 7$ and let bit $i$ of $j$
be the value of $x_i$. The message $f = 1 + x_0 + x_1$ gives the codeword $1001\,1001$.
Flip position 5: $1001\,1101$ arrives. The coefficient of $x_0$ is voted on by the four
pairs that differ only in $x_0$, positions $(0,1), (2,3), (4,5), (6,7)$: sums $1, 1, 0,
1$, so three votes say 1. For $x_1$ the pairs $(0,2), (1,3), (4,6), (5,7)$ give $1, 1, 1,
0$: 1. For $x_2$ the pairs $(0,4), (1,5), (2,6), (3,7)$ give $0, 1, 0, 0$: 0. Subtract
$x_0 + x_1$, whose table is $0110\,0110$, to get $1111\,1011$; seven of eight bits say the
constant is 1. The decoder returns $1 + x_0 + x_1$.

```python
# Reed-Muller RM(r, m): truth tables of Boolean polynomials of degree <= r; Reed's majority decoder.
import itertools, random
from math import comb

def rm_encode(coeffs, m):
    """coeffs maps a monomial (tuple of variables) to a bit; position j is the point with x_i = bit i of j."""
    return [sum(c for S, c in coeffs.items() if all(j >> v & 1 for v in S)) % 2 for j in range(2 ** m)]

def rm_decode(word, r, m):
    word, coeffs = word[:], {}
    for d in range(r, -1, -1):
        for S in itertools.combinations(range(m), d):
            rest = [v for v in range(m) if v not in S]
            votes = 0
            for b in range(2 ** len(rest)):       # one subcube: the variables outside S fixed to b
                base = sum((b >> i & 1) << v for i, v in enumerate(rest))
                pts = [base | sum((a >> i & 1) << v for i, v in enumerate(S)) for a in range(2 ** d)]
                votes += sum(word[q] for q in pts) % 2
            coeffs[S] = int(2 * votes > 2 ** len(rest))
        top = rm_encode({S: c for S, c in coeffs.items() if len(S) == d}, m)
        word = [a ^ b for a, b in zip(word, top)] # peel off the degree-d part
    return coeffs

rng = random.Random(1954)
for r, m in ((1, 3), (2, 5), (1, 7)):
    n, k, d = 2 ** m, sum(comb(m, i) for i in range(r + 1)), 2 ** (m - r)
    t, ok = d // 2 - 1, 0
    for _ in range(200):
        msg = {S: rng.getrandbits(1) for d in range(r + 1) for S in itertools.combinations(range(m), d)}
        y = rm_encode(msg, m)
        for i in rng.sample(range(n), t):
            y[i] ^= 1
        ok += rm_decode(y, r, m) == msg
    print((n, k, d), t, ok)
```

It prints:

```text
(8, 4, 4) 1 200
(32, 16, 8) 3 200
(128, 8, 64) 31 200
```

All 200 random messages come back for $RM(1, 3)$ with one error, $RM(2, 5)$ with three
and $RM(1, 7)$ with 31. $RM(1, 7)$ is HQC's inner code, repeated three or five times;
31 sure corrections in 128 bits are too few there, so HQC decodes by **maximum
likelihood**, scoring all 256 codewords at once with the fast Walsh-Hadamard transform
([Post-quantum book](../post-quantum/14-HQC-and-BIKE.md#the-inner-code-reed-muller-rm17)).

## 18.12 Patterson's algorithm

*Level: expert.*

A binary Goppa code with $g$ of degree $t$ has a syndrome $S(x) \bmod g$ of $t$
coefficients in $GF(2^m)$. A generic decoder that sees $t$ syndrome coefficients
corrects only $\lfloor t/2 \rfloor$ errors, because each error brings two unknowns, a
position and a value. In a binary code every value is 1, so $t$ equations should do.
Section 18.7 got the factor of two back by working modulo $g^2$; Nicholas Patterson's
algorithm of 1975 gets it modulo $g$ alone.

### Why it works

Let $E$ be the set of error positions and $\sigma(x) = \prod_{i \in E}(x - \alpha_i)$ the
**error locator**. Its derivative is $\sigma' = \sum_{i \in E} \prod_{j \ne i}(x - \alpha_j)$,
so the syndrome is a logarithmic derivative:

$$
S(x) = \sum_{i \in E} \frac{1}{x - \alpha_i} = \frac{\sigma'(x)}{\sigma(x)}, \qquad
\sigma(x) S(x) \equiv \sigma'(x) \pmod{g}.
$$

Now characteristic 2 does the work. Every polynomial over $GF(2^m)$ splits into even
and odd parts, $\sigma = a(x)^2 + x\,b(x)^2$, because every element of $GF(2^m)$ is a square
($c = (c^{2^{m-1}})^2$). Then $\sigma' = b^2$, since $(a^2)' = 2aa' = 0$ and $(xb^2)' = b^2$.
Put this into the key equation and multiply by $T = S^{-1} \bmod g$:

$$
(a^2 + x b^2)\,S \equiv b^2 \;\Longrightarrow\; a^2 \equiv b^2\,(T + x)
\;\Longrightarrow\; a \equiv b\,R \pmod g, \qquad R^2 \equiv T + x .
$$

The square root $R$ exists and is unique because $GF(2^m)[x]/(g)$, for irreducible $g$,
is a field of $2^{mt}$ elements, where squaring is a bijection. If there are $e \le t$
errors, $\deg a \le \lfloor t/2 \rfloor$ and $\deg b \le \lfloor (t-1)/2 \rfloor$.

**The lattice step.** The pairs $(a, b)$ with $a \equiv bR \pmod g$ form a lattice over
the polynomial ring, with basis $(g, 0)$ and $(R, 1)$; the decoder needs a vector of low
degree in it. One exists: the conditions are $t$ linear
equations over $GF(2^m)$ in the $(\lfloor t/2 \rfloor + 1) + (\lfloor (t-1)/2 \rfloor + 1)
= t + 1$ coefficients of $a$ and $b$, more unknowns than equations. It is unique up to a
constant: if $(a, b)$ and $(a', b')$ are both short, then $ab' - a'b \equiv bRb' - b'Rb =
0 \pmod g$, and its degree is below $t$, so $ab' = a'b$. The extended Euclidean
algorithm on $g$ and $R$, stopped as soon as the remainder has degree at most $t/2$,
finds it: each division subtracts a multiple of one basis vector from the other, which
is Gauss-Lagrange reduction ([Chapter 14](14-Lattices.md)) with degree in place of
length. Then $\sigma = a^2 + x b^2$, and its roots are the error positions.

**Square roots modulo $g$.** Either $\sqrt{u} = u^{2^{mt-1}}$, $mt - 1$ squarings, or
faster: split $u = u_0(x)^2 + x\, u_1(x)^2$ as above and use $\sqrt u = u_0 + \sqrt{x}\,
u_1$, with $\sqrt{x} \bmod g$ computed once per key.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="Patterson's algorithm as six boxes: syndrome modulo g, its inverse T, the square root R of T plus x, reduction of the lattice basis to a short pair a and b, the locator sigma equals a squared plus x b squared, and its roots; under each box the value from the GF(16) example" fill="currentColor" font-size="13">
<defs><marker id="pat18" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z"/></marker></defs>
<g fill="none" stroke="currentColor" stroke-width="1.5">
<rect x="10" y="20" width="180" height="46" rx="5"/><rect x="230" y="20" width="180" height="46" rx="5"/><rect x="450" y="20" width="180" height="46" rx="5"/>
<rect x="450" y="150" width="180" height="46" rx="5"/><rect x="230" y="150" width="180" height="46" rx="5"/><rect x="10" y="150" width="180" height="46" rx="5"/>
</g>
<g stroke="currentColor" stroke-width="1.5" marker-end="url(#pat18)">
<line x1="190" y1="43" x2="226" y2="43"/><line x1="410" y1="43" x2="446" y2="43"/>
<line x1="540" y1="104" x2="540" y2="146"/><line x1="450" y1="173" x2="414" y2="173"/><line x1="230" y1="173" x2="194" y2="173"/>
</g>
<g text-anchor="middle">
<text x="100" y="48">1. S(x) mod g</text>
<text x="320" y="48">2. T = 1/S mod g</text>
<text x="540" y="48">3. R = √(T + x)</text>
<text x="540" y="170">4. reduce (g, 0), (R, 1)</text><text x="540" y="188" font-size="11">short (a, b): a ≡ bR</text>
<text x="320" y="170">5. σ = a² + x b²</text><text x="320" y="188" font-size="11">deg σ = number of errors</text>
<text x="100" y="178">6. roots of σ</text>
<g font-size="12" fill-opacity=".7">
<text x="100" y="88">α¹²x² + α⁹x + α⁷</text><text x="320" y="88">α³x² + α⁶x + α¹³</text><text x="540" y="88">α¹⁴x² + α⁴x + α¹⁴</text>
<text x="540" y="218">a = α¹⁰x + α¹⁰, b = αx + α⁶</text><text x="320" y="218">α²x³ + α⁵x² + α¹²x + α⁵</text><text x="100" y="218">α², α⁴, α¹²</text>
</g>
</g>
</svg>
<figcaption>Figure 18.5. Patterson's pipeline. Steps 1 to 3 work in the field GF(2^m)[x]/(g), step 4 is a two-dimensional lattice reduction by the Euclidean algorithm; grey values are the GF(16) example below.</figcaption>
</figure>

### By hand over GF(16)

Build $GF(16)$ from $z^4 + z + 1$, with $\alpha = z$. Each element is 4 bits, adding is
XOR, and multiplying adds exponents modulo 15:

| $i$ | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| $\alpha^i$ | 0001 | 0010 | 0100 | 1000 | 0011 | 0110 | 1100 | 1011 | 0101 | 1010 | 0111 | 1110 | 1111 | 1101 | 1001 |

Take $g(x) = x^3 + x + 1$. Its roots lie in $GF(8)$, which is not inside $GF(16)$, so
$g$ is irreducible over $GF(16)$ and the support is all 16 elements: $n = 16$, $t = 3$,
$k \ge 16 - 4 \cdot 3 = 4$. Two short cuts come from $g$. Since
$g(x) + g(a) = (x + a)(x^2 + ax + a^2 + 1)$,

$$
\frac{1}{x + a} \equiv \frac{x^2 + a x + a^2 + 1}{g(a)} \pmod g,
$$

and since $x^3 \equiv x + 1$ gives $x^4 \equiv x^2 + x$, we get $(x^2 + x)^2 = x^4 + x^2
\equiv x$: so $\sqrt{x} = x^2 + x$. Square roots of field elements halve the exponent
modulo 15: $\sqrt{\alpha^{13}} = \alpha^{14}$, $\sqrt{\alpha^3} = \alpha^9$.

Errors hit the positions of $\alpha^2$, $\alpha^4$ and $\alpha^{12}$.

<div class="mars-steps" markdown>

1. **Syndrome.** For $a = \alpha^2$: $g(\alpha^2) = \alpha^6 + \alpha^2 + 1 = 1001 =
   \alpha^{14}$ and $a^2 + 1 = \alpha^4 + 1 = \alpha$, so the term is $\alpha(x^2 + \alpha^2
   x + \alpha) = \alpha x^2 + \alpha^3 x + \alpha^2$. Likewise $\alpha^4$ gives $\alpha^2
   x^2 + \alpha^6 x + \alpha^4$ and $\alpha^{12}$ gives $\alpha^{14} x^2 + \alpha^{11} x +
   \alpha^6$. Adding the columns with the table: $S = \alpha^{12} x^2 + \alpha^9 x +
   \alpha^7$.
2. **Inverse.** The extended Euclidean algorithm gives $T = \alpha^3 x^2 + \alpha^6 x +
   \alpha^{13}$; multiplying back and reducing with $x^3 = x + 1$ returns 1.
3. **Square root.** $T + x = \alpha^3 x^2 + \alpha^{13} x + \alpha^{13}$, since $\alpha^6 + 1
   = \alpha^{13}$. The even part $\alpha^3 x^2 + \alpha^{13}$ has root $\alpha^9 x +
   \alpha^{14}$; the odd part $\alpha^{13} x$ has root $\alpha^{14}\sqrt{x} = \alpha^{14}(x^2
   + x)$. Sum: $R = \alpha^{14} x^2 + \alpha^4 x + \alpha^{14}$.
4. **Lattice step.** One division: $(\alpha x + \alpha^6) R = x^3 + \alpha^5 x + \alpha^5$,
   and adding $g$ leaves $\alpha^{10} x + \alpha^{10}$, of degree $1 \le t/2$. So
   $(g, 0) - (\alpha x + \alpha^6)(R, 1)$ is the short vector $a = \alpha^{10} x +
   \alpha^{10}$, $b = \alpha x + \alpha^6$.
5. **Locator.** $\sigma = a^2 + x b^2 = \alpha^{20} x^2 + \alpha^{20} + \alpha^2 x^3 +
   \alpha^{12} x = \alpha^2 x^3 + \alpha^5 x^2 + \alpha^{12} x + \alpha^5$.
6. **Roots.** Compare with $\alpha^2 (x + \alpha^2)(x + \alpha^4)(x + \alpha^{12})$: its
   $x^2$ coefficient is $\alpha^2(\alpha^2 + \alpha^4 + \alpha^{12}) = \alpha^2 \cdot
   \alpha^3$, its constant $\alpha^2 \cdot \alpha^{18} = \alpha^5$. All three errors found.

</div>

```python
# Patterson's algorithm over GF(16) for the Goppa code with g(x) = x^3 + x + 1, t = 3,
# support = all 16 field elements. Polynomials are coefficient lists, lowest degree first.
import itertools
EXP, LOG = [0] * 30, [0] * 16                     # GF(16) from z^4 + z + 1; alpha = z = 2
v = 1
for i in range(15):
    EXP[i] = EXP[i + 15] = v
    LOG[v] = i
    v = (v << 1) ^ (0b10011 if v & 8 else 0)
def mul(a, b): return 0 if a == 0 or b == 0 else EXP[LOG[a] + LOG[b]]
def inv(a):    return EXP[15 - LOG[a]]
def trim(p):
    while p and p[-1] == 0:
        p = p[:-1]
    return p
def padd(p, q):
    return trim([(p[i] if i < len(p) else 0) ^ (q[i] if i < len(q) else 0) for i in range(max(len(p), len(q)))])
def pmul(p, q):
    r = [0] * (len(p) + len(q))
    for i, a in enumerate(p):
        for j, b in enumerate(q):
            r[i + j] ^= mul(a, b)
    return trim(r)
def pdivmod(p, q):
    p, quo = trim(p[:]), [0] * max(1, len(p))
    while len(p) >= len(q):
        c, s = mul(p[-1], inv(q[-1])), len(p) - len(q)
        quo[s] = c
        p = padd(p, [0] * s + [mul(c, x) for x in q])
    return trim(quo), p
def peval(p, x):
    r = 0
    for c in reversed(p):
        r = mul(r, x) ^ c
    return r
def show(p):
    return " + ".join("a^%d" % LOG[c] + ("x^%d" % i if i > 1 else "x" * i) for i, c in reversed(list(enumerate(p))) if c)

G, T, L = [1, 1, 0, 1], 3, [0] + EXP[:15]         # g = x^3 + x + 1; support 0, 1, a, ..., a^14
def euclid(r0, r1, stop):                         # extended Euclid on (g, r1) until deg r1 <= stop
    s0, s1 = [], [1]
    while len(r1) - 1 > stop:
        q, r = pdivmod(r0, r1)
        r0, r1, s0, s1 = r1, r, s1, padd(s0, pmul(q, s1))
    return r1, s1                                 # r1 = s1 * (input r1) mod g
def pinv(p):
    r, s = euclid(G, pdivmod(p, G)[1], 0)
    return pmul([inv(r[0])], s)
def syndrome(y):
    S = []
    for j, bit in enumerate(y):
        if bit:
            S = padd(S, pinv([L[j], 1]))          # 1/(x - alpha_j) mod g
    return S
def fsqrt(c):                                     # in GF(16), sqrt(a^i) = a^(8i)
    return EXP[LOG[c] * 8 % 15] if c else 0
def psqrt(p):                                     # p = A^2 + x B^2, so sqrt(p) = A + sqrt(x) B
    A, B = trim([fsqrt(c) for c in p[0::2]]), trim([fsqrt(c) for c in p[1::2]])
    return pdivmod(padd(A, pmul([0, 1, 1], B)), G)[1]   # sqrt(x) = x^2 + x mod g

def patterson(y, verbose=False):
    S = syndrome(y)
    if not S:
        return y
    Tinv = pinv(S)
    R = psqrt(padd(Tinv, [0, 1]))                 # R^2 = T + x mod g
    a, b = euclid(G, R, T // 2)                   # the short vector (a, b) with a = b R mod g
    sigma = padd(pmul(a, a), pmul([0, 1], pmul(b, b)))
    if verbose:
        print("S =", show(S), "| T =", show(Tinv), "| R =", show(R))
        print("a =", show(a), "| b =", show(b), "| sigma =", show(sigma))
    return [bit ^ (peval(sigma, L[j]) == 0) for j, bit in enumerate(y)]

def key_equation_mod_g(y):                        # the generic decoder: sigma S = omega mod g
    sigma = euclid(G, syndrome(y), (T - 1) // 2)[1]
    return [bit ^ (peval(sigma, L[j]) == 0) for j, bit in enumerate(y)]

words = [c for c in itertools.product([0, 1], repeat=16) if not syndrome(c)]
print(len(words), "codewords, minimum weight", min(sum(c) for c in words if any(c)))
c = list(words[5])
y = [bit ^ (j in (3, 5, 13)) for j, bit in enumerate(c)]     # errors at a^2, a^4, a^12
print("".join(map(str, c)), "->", "".join(map(str, y)), patterson(y, True) == c)
for w in (1, 2, 3):
    errs = [[int(j in E) for j in range(16)] for E in itertools.combinations(range(16), w)]
    print(w, len(errs), sum(not any(patterson(e)) for e in errs), sum(not any(key_equation_mod_g(e)) for e in errs))
```

It prints:

```text
16 codewords, minimum weight 7
S = a^12x^2 + a^9x + a^7 | T = a^3x^2 + a^6x + a^13 | R = a^14x^2 + a^4x + a^14
a = a^10x + a^10 | b = a^1x + a^6 | sigma = a^2x^3 + a^5x^2 + a^12x + a^5
0101000101111001 -> 0100010101111101 True
1 16 16 16
2 120 120 0
3 560 560 0
```

The code has 16 codewords and minimum distance $7 = 2t + 1$, and the listing
reproduces every value of the hand computation. On every error pattern of weight 1, 2
and 3 (on the zero codeword, enough for a linear code) Patterson corrects all 696. The
key-equation decoder modulo $g$, which ignores that the code is binary, corrects the 16
single errors and none of the 680 others: $\lfloor t/2 \rfloor = 1$. The splitting
$\sigma = a^2 + x b^2$ is the whole difference. Patterson's running time depends on the
error pattern, which is why constant-time code prefers the $g^2$ route with a fixed
number of Berlekamp-Massey steps
([Post-quantum book, §13.6](../post-quantum/13-Code-Based-Encryption-McEliece.md#decoding-in-constant-time)).

## 18.13 List decoding and the Johnson bound

*Level: expert.*

Every decoder so far stops at half the minimum distance: a word halfway between two
codewords is equally far from both. But such words are rare. Peter Elias (1957) and
John Wozencraft (1958) let the decoder answer with a short **list** of all codewords
within a larger radius; a checksum or a signature then picks the right one.

### The Johnson bound

When is the list guaranteed short? Selmer Johnson's bound of 1962, in a form that holds
for any alphabet: let $C$ have length $n$ and minimum distance $d$, let $y$ be any word,
and let $c_1, \ldots, c_L$ be codewords that each agree with $y$ in at least $A$
positions. If $A^2 > n(n - d)$, then

$$
L \le \frac{n\,(A - n + d)}{A^2 - n(n - d)} \le n d .
$$

*Proof.* Let $N_x$ be the number of the $c_i$ that agree with $y$ at position $x$. Then
$\sum_x N_x \ge LA$. Two codewords that both agree with $y$ at $x$ agree with each other
there, and two codewords agree in at most $n - d$ places, so $\sum_x \binom{N_x}{2} \le
\binom{L}{2}(n - d)$. By the Cauchy-Schwarz inequality $\sum_x N_x^2 \ge (LA)^2/n$, so
$L^2A^2/n - LA \le L(L-1)(n-d)$. Divide by $L$ and solve for $L$. $\blacksquare$ So every
ball of radius $e < n - \sqrt{n(n-d)}$ holds only polynomially many codewords. In
relative terms the radius is $1 - \sqrt{1 - \delta} \approx \delta/2 + \delta^2/8$: a little
past half the distance for small $\delta$, far past it for large $\delta$. For binary codes
the sharper form $\tfrac12\bigl(1 - \sqrt{1 - 2\delta}\bigr)$ holds.

### Sudan and Guruswami-Sudan

For a Reed-Solomon code, $d = n - k + 1$, so the Johnson radius is about $n -
\sqrt{n(k-1)}$, a fraction $1 - \sqrt R$ at rate $R$. Madhu Sudan (1997) decoded past
half the distance at low rates, and Venkatesan Guruswami and Sudan (1999) reached the
Johnson radius at every rate. Both extend Berlekamp-Welch (§18.6) from the curve
$E(x)y = Q(x)$ to a general curve:

1. **Interpolate.** Find a nonzero $Q(x, y) = \sum_{j=0}^{\ell} Q_j(x)\,y^j$ with $\deg
   Q_j \le D - j(k-1)$ and $Q(x_i, y_i) = 0$ for every received point. This is a linear
   system, solvable when the unknown coefficients outnumber the $n$ points.
2. **Factor.** If a message polynomial $f$ of degree below $k$ agrees with the word in
   more than $D$ places, then $Q(x, f(x))$ has degree at most $D$ and more than $D$
   roots, so it is zero: $y - f(x)$ divides $Q$, at most $\ell$ such factors.

Guruswami and Sudan make $Q$ vanish at each point with **multiplicity** $s$, so each
agreement counts $s$ times; as $s$ grows the radius rises to $n - \sqrt{n(k-1)}$,
exactly the Johnson bound. Beyond it the
limit for any code is the **list-decoding capacity** $1 - R$; the folded Reed-Solomon
codes of Guruswami and Atri Rudra (2008) reach it.

**Code it.** Take $n = 31$ points of $\mathbb{F}_{31}$ and $k = 2$: the codewords are
lines, $d = 30$, and unique decoding stops at 14 errors. With $\ell = 2$ and $D = 11$
there are $12 + 11 + 10 = 33$ unknowns for 31 equations, so every line agreeing in 12
places is found. The received word mixes 12 points of each of two lines and 7 random
values.

```python
# Sudan's list decoder (1997) for the Reed-Solomon code of lines (degree < 2) over F_31, n = 31.
import random
p = 31

def kernel_vector(M):                             # a nonzero v with M v = 0 mod p, by Gauss-Jordan
    R, piv, r = [row[:] for row in M], [], 0
    for c in range(len(M[0])):
        k = next((i for i in range(r, len(R)) if R[i][c]), None)
        if k is None:
            continue
        R[r], R[k] = R[k], R[r]
        iv = pow(R[r][c], -1, p)
        R[r] = [x * iv % p for x in R[r]]
        for i in range(len(R)):
            if i != r and R[i][c]:
                f = R[i][c]
                R[i] = [(a - f * b) % p for a, b in zip(R[i], R[r])]
        piv.append(c)
        r += 1
    free = next(c for c in range(len(M[0])) if c not in piv)
    v = [0] * len(M[0])
    v[free] = 1
    for i, c in enumerate(piv):
        v[c] = -R[i][free] % p
    return v

def sudan(xs, ys, D=11, ell=2):
    mons = [(a, j) for j in range(ell + 1) for a in range(D - j + 1)]       # monomials x^a y^j
    Q = dict(zip(mons, kernel_vector([[pow(x, a, p) * pow(y, j, p) % p for a, j in mons]
                                      for x, y in zip(xs, ys)])))
    found = []
    for f0 in range(p):                           # root finding by brute force: try every line
        for f1 in range(p):                       # (Q(x, f(x)) has degree <= D < 31, so 31 zeros = zero)
            if all(sum(c * pow(x, a, p) * pow(f0 + f1 * x, j, p) for (a, j), c in Q.items()) % p == 0
                   for x in xs):
                found.append((f0, f1))
    return len(mons), found

rng = random.Random(1997)
xs = list(range(p))
ys = [rng.randrange(p) for _ in xs]
order = rng.sample(xs, p)
for x in order[:12]:
    ys[x] = (5 + 3 * x) % p                       # 12 values on the line 5 + 3x
for x in order[12:24]:
    ys[x] = (17 + 22 * x) % p                     # 12 values on the line 17 + 22x
agree = lambda f0, f1: sum((f0 + f1 * x) % p == y for x, y in zip(xs, ys))
print(sorted(agree(a, b) for a in range(p) for b in range(p))[-4:])
print(sudan(xs, ys))
```

It prints:

```text
[4, 5, 12, 13]
(33, [(5, 3), (17, 22)])
```

Brute force over all 961 lines finds two that agree with the word in 12 and 13 places
(a random value fell on the second) and none other in more than 5. The decoder returns
exactly those two, at distance 19 and 18, past the unique radius of 14; the Johnson
bound with $A = 12$ allows at most $31 \cdot 11/(144 - 31) \approx 3$. Real decoders find
the factors $y - f(x)$ with the algorithm of Ron Roth and Gitit Ruckenstein (2000).

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Fraction of errors corrected against rate for Reed-Solomon codes: unique decoding (1 minus R) over 2, the Guruswami-Sudan and Johnson curve 1 minus the square root of R, and list-decoding capacity 1 minus R; the toy example sits between the unique and Johnson curves" fill="currentColor" font-size="13">
<g stroke="currentColor" fill="none">
<path d="M70 30 V250 H590" stroke-width="1.2"/>
<path d="M70 30 L590 250" stroke-width="1.2" stroke-dasharray="6 4"/>
<path d="M70 140 L590 250" stroke-width="1.5"/>
<polyline stroke-width="2.5" points="70,30 96,79 122,100 148,115 174,128 200,140 226,150 252,160 278,169 304,178 330,186 356,193 382,200 408,207 434,214 460,221 486,227 512,233 538,239 564,244 590,250"/>
</g>
<circle cx="104" cy="115" r="5"/>
<path d="M106 122 L130 188 M240 82 L180 126" stroke="currentColor" stroke-dasharray="3 3"/>
<text x="110" y="202" font-size="12">toy: 19 of 31 errors, R = 2/31</text>
<text x="430" y="150" font-size="12">capacity: 1 − R</text>
<text x="245" y="78" font-size="12" font-weight="700">Johnson, Guruswami-Sudan: 1 − √R</text>
<text x="300" y="232" font-size="12">unique decoding: (1 − R)/2</text>
<text x="70" y="270" text-anchor="middle" font-size="12">0</text>
<text x="330" y="270" text-anchor="middle" font-size="12">0.5</text>
<text x="590" y="270" text-anchor="middle" font-size="12">1</text>
<text x="330" y="290" text-anchor="middle">rate R = k/n</text>
<text x="60" y="34" text-anchor="end" font-size="12">1</text>
<text x="60" y="254" text-anchor="end" font-size="12">0</text>
<text x="40" y="145" text-anchor="middle" transform="rotate(-90 40 145)">errors / n</text>
</svg>
<figcaption>Figure 18.6. How far a Reed-Solomon code can be decoded. Unique decoding stops at half the distance; list decoding with a short list reaches the Johnson radius 1 − √R (Guruswami-Sudan), and no code can be list-decoded past 1 − R.</figcaption>
</figure>

### Where cryptography meets lists

- **Hard-core bits.** The Goldreich-Levin theorem (1989), the hard-core bit of any
  one-way function ([Chapter 19](19-Complexity-and-Reductions.md)), is a list decoder
  for the Hadamard code, essentially $RM(1, m)$ of §18.11.
- **Polynomial reconstruction.** Moni Naor and Benny Pinkas (1999) built oblivious
  polynomial evaluation on noisy polynomial interpolation being hard; Daniel
  Bleichenbacher and Phong Nguyen (2000) broke some parameter choices with
  Guruswami-Sudan and with lattice reduction.
- **Goppa codes.** Daniel Bernstein (2011) list-decodes binary Goppa codes up to about
  $n - \sqrt{n(n - 2t - 2)}$ errors: about 65 instead of 64 for mceliece348864, too
  little to matter; "wild McEliece" (Bernstein, Tanja Lange, Christiane Peters, 2010)
  gains more over larger fields.

## In the real world

- **Error correction everywhere**: Reed-Solomon in QR codes, discs, RAID-6 and deep
  space; LDPC and polar codes in 5G and Wi-Fi; Hamming-style SECDED codes in server
  memory.
- **Classic McEliece** is used in some post-quantum VPN designs (Rosenpass, for
  example) for long-term keys. ISO/IEC 18033-2 added it in 2026; in October 2026 BSI
  advised against it for new developments (§18.8).
- **HQC**, with its Reed-Muller and Reed-Solomon codes (§18.11), is being standardized by
  NIST after its 2025 selection; as of November 2026 no draft standard had appeared.
- **Fuzzy extractors and PUFs** use BCH and Reed-Muller codes to turn noisy readings
  into stable keys (Chapter 17).

## Going deeper

- *BCH codes*: the other classical algebraic family; BCH codes are subfield subcodes
  of Reed-Solomon codes, as Goppa codes are of generalized RS codes.
- *Distinguishers for high-rate Goppa codes*: Jean-Charles Faugère, Valérie
  Gauthier-Umaña, Ayoub Otmani, Ludovic Perret and Jean-Pierre Tillich (2011) showed
  that Goppa codes of very high rate can be told apart from random codes; the 2026
  distinguishers mentioned in §18.8 reach the rates actually used.
- *Rank-metric codes* (Gabidulin codes) give another family of code-based schemes,
  with their own attacks and repairs.
- *Shannon's channel coding theorem*: random codes achieve capacity; turbo codes,
  LDPC codes and polar codes approach it with efficient decoding.

## Check yourself

??? question "1. Decode the Hamming [7, 4] word $0110\,011$."

    Checks: $d_1 + d_2 + d_4 + p_1 = 0 + 1 + 0 + 0 = 1$, $d_1 + d_3 + d_4 + p_2 = 0 + 1 +
    0 + 1 = 0$, $d_2 + d_3 + d_4 + p_3 = 1 + 1 + 0 + 1 = 1$. Syndrome $(1, 0, 1)$
    points to $d_2$ (in checks 1 and 3 only). Corrected: $0010\,011$, message $0010$.

??? question "2. The repetition code $\{000, 111\}$ has $W = x^3 + y^3$. Use the MacWilliams identity to find its dual."

    $\tfrac12\bigl[(x+y)^3 + (x-y)^3\bigr] = \tfrac12(2x^3 + 6xy^2) = x^3 + 3xy^2$: one word
    of weight 0 and three of weight 2. The dual is the even-weight code $\{000, 011, 101,
    110\}$.

??? question "3. Is there a binary $[10, 5, 6]$ code?"

    Singleton allows $k \le 5$, but the Hamming bound with $t = 2$ requires $2^5(1 +
    10 + 45) = 1792 \le 1024$, which fails. No.

??? question "4. What are the parameters of $RM(2, 5)$, and how many errors does Reed's majority decoder correct?"

    $n = 32$, $k = 1 + 5 + 10 = 16$, $d = 2^{5-2} = 8$. Each degree-2 coefficient gets
    $2^{3} = 8$ votes from disjoint subcubes of 4 points, so up to $2^{m-r-1} - 1 = 3$
    errors are corrected.

??? question "5. What relative distance does the Gilbert-Varshamov bound promise at rate 1/2, and what does that mean for a random code of length 1,000?"

    Solve $1 - H(\delta) = 1/2$: $\delta \approx 0.11$. A random $[1000, 500]$ code has
    minimum distance about 110, so it can uniquely decode about 55 errors; near weight 110
    a random syndrome has about one solution, and above it many.

??? question "6. Is $1 + x + \cdots + x^{10}$ invertible modulo $x^{11} - 1$ over $GF(2)$? How many units does the ring have?"

    No. 2 is a primitive root mod 11, so $x^{11} - 1 = (x + 1)\Phi_{11}(x)$ with $\Phi_{11} = 1
    + x + \cdots + x^{10}$ irreducible, and $\Phi_{11}$ shares that factor with the modulus
    although its weight is odd. The ring is $GF(2) \times GF(2^{10})$, with $1 \cdot 1023 =
    1023$ units.

??? question "7. Why does McEliece need the permutation $P$ and the scrambler $S$?"

    Without them the public matrix would be the Goppa code's own generator matrix, in a
    form that reveals its structure (for example a systematic form tied to the
    support). They make the public key look like a random code.

??? question "8. With $n = 32$, $k = 17$, $t = 3$, what is the chance that a random information set avoids every error?"

    $\binom{29}{17}/\binom{32}{17} \approx 0.092$, about one in 10.9.

??? question "9. For mceliece348864 ($m = 12$, $n = 3488$, $t = 64$), what are $k$ and the degree bounds in Patterson's lattice step, and why would the key-equation decoder modulo $g$ stop at 32 errors?"

    $k = 3488 - 12 \cdot 64 = 2720$; $\deg a \le 32$ and $\deg b \le 31$. The generic
    decoder treats each error as two unknowns, a position and a value, and 64 syndrome
    coefficients pay for 32 of them. Patterson uses that every value is 1: the splitting
    $\sigma = a^2 + x b^2$ halves the degrees, so 64 equations suffice for 64 errors.

??? question "10. A Reed-Solomon code has $n = 255$, $k = 33$. How many errors can unique decoding and Guruswami-Sudan list decoding handle?"

    Unique decoding: $\lfloor (n - k)/2 \rfloor = 111$. List decoding up to the Johnson
    radius needs $A$ agreements with $A^2 > n(k - 1) = 8160$, so $A \ge 91$: up to $255 -
    91 = 164$ errors.

## What you learned

- Minimum distance $d$ corrects $\lfloor (d-1)/2 \rfloor$ errors; the Hamming code
  locates a single error by its syndrome.
- Linear codes are given by $G$ or $H$; syndromes depend only on the error; $d$ is the
  smallest number of dependent columns of $H$. The MacWilliams identity gets the dual's
  weight distribution from the code's.
- Singleton ($k \le n - d + 1$), Hamming (sphere packing) and Gilbert-Varshamov
  (existence) bound what is possible; Golay $[23, 12, 7]$ is perfect. Random codes meet
  $R = 1 - H(\delta)$, and below the GV weight a planted error is the unique solution.
- Berlekamp-Welch corrects $(n-k)/2$ Reed-Solomon errors by solving one linear system.
- Binary Goppa codes over $GF(2^m)$ with a square-free $g$ of degree $t$ have
  $k \ge n - mt$ and correct $t$ errors; Patterson's algorithm does it modulo $g$.
- McEliece hides a Goppa code as $SGP$; Classic McEliece has keys of 0.26 to 1.4 MB
  and ciphertexts under 210 bytes.
- Syndrome decoding is NP-complete; information-set decoding is the generic attack;
  HQC and BIKE use quasi-cyclic structure for small keys, and HQC was selected by NIST
  in 2025. Their ring $GF(2)[x]/(x^r - 1)$ splits by cyclotomic cosets.
- $RM(r, m)$ is $[2^m, \sum_{i \le r}\binom mi, 2^{m-r}]$, decoded by majority votes.
- List decoding goes past half the distance to the Johnson radius $1 - \sqrt{1-\delta}$;
  Guruswami-Sudan reaches it for Reed-Solomon codes, $1 - \sqrt R$.

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
- Edgar Gilbert, "A Comparison of Signalling Alphabets", *Bell System Technical Journal*
  (1952); Rom Varshamov, *Doklady Akademii Nauk SSSR* (1957).
- Jessie MacWilliams, "A Theorem on the Distribution of Weights in a Systematic Code",
  *Bell System Technical Journal* (1963); Philippe Delsarte, *Information and Control*
  (1973).
- David Muller and Irving Reed, the two Reed-Muller papers, *IRE Transactions* (1954).
- Nicolas Sendrier, "Decoding One Out of Many", PQCrypto 2011.
- Selmer Johnson, "A New Upper Bound for Error-Correcting Codes", *IRE Transactions on
  Information Theory* (1962).
- Madhu Sudan, *Journal of Complexity* (1997); Venkatesan Guruswami and Madhu Sudan,
  *IEEE Transactions on Information Theory* (1999); Ron Roth and Gitit Ruckenstein, same
  journal (2000); Venkatesan Guruswami and Atri Rudra, same journal (2008).
- Daniel Bleichenbacher and Phong Nguyen, "Noisy Polynomial Interpolation and Noisy
  Chinese Remaindering", EUROCRYPT 2000.
- Daniel Bernstein, "List Decoding for Binary Goppa Codes", IWCC 2011; Bernstein, Lange
  and Peters, "Wild McEliece", SAC 2010.
- In *Post-quantum cryptography*: [chapter 13](../post-quantum/13-Code-Based-Encryption-McEliece.md);
  in *The cryptography book*: [Chapter 22](../../book/22-Hash-and-Code-Based.md).
