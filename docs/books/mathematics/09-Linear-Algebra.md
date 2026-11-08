# 9. Linear Algebra over Finite Fields

*Linear algebra is the mathematics of systems of equations in which unknowns are
only added and multiplied by constants. Over a finite field it works exactly as
in school, with one difference that matters enormously: there is no rounding, so
every answer is exact. This chapter does Gaussian elimination, rank, kernels,
inverses and determinants over $\mathbb{F}_p$ and $\mathbb{F}_2$, and turns them
on ciphers. A cipher that is linear in its key or its input is broken by solving
a system; you will break the Hill cipher from a few letters of known text, and a
linear feedback shift register from twice its length in output with the
Berlekamp-Massey algorithm. Then linear algebra changes sides: AES's MixColumns
is a matrix over $\mathrm{GF}(2^8)$ chosen so that its "branch number" is as large
as possible, which is the heart of the proof that AES resists differential and
linear attacks.*

!!! abstract "In this chapter"
    **You will learn:**

    - vectors and matrices over $\mathbb{F}_p$, and why exact arithmetic makes
      them easier than over the reals;
    - Gaussian elimination, rank, kernels and the solutions of a linear system;
    - matrix inverses and determinants mod $p$ and mod 26, and how many
      matrices are invertible;
    - the Hill cipher and its known-plaintext break;
    - linear feedback shift registers as matrices, their characteristic
      polynomials and periods;
    - the Berlekamp-Massey algorithm, with code, and linear complexity;
    - MDS matrices, the branch number and AES MixColumns;
    - why "linear" means "broken", and where linear algebra appears inside
      attacks on factoring and discrete logarithms.

    **You need:** [Chapter 3](03-Modular-Arithmetic.md) (inverses mod $n$) and
    [Chapter 8](08-Rings-Fields-and-Polynomials.md) (fields, polynomials,
    $\mathrm{GF}(2^8)$).

    **Levels:** §9.1 to §9.4 are for beginners, §9.5 to §9.8 are
    intermediate, §9.9 and §9.10 are expert.

## 9.1 The problem

*Level: beginner.*

A rover's telemetry link to Arcadia City uses an old cipher from a vendor's
catalogue. It takes a 32-bit block, and the vendor says the key is "a secret
32 × 32 binary matrix plus a 32-bit offset": over a thousand bits of key, far
too many to search.

The size of the key does not matter. The cipher is **linear** (more precisely
affine): $E(x) = Ax + b$ over $\mathbb{F}_2$. Encrypt the all-zero block and the
answer is $b$. Encrypt the block with a single 1 in position $i$ and the answer,
xor $b$, is the $i$th column of $A$. Thirty-three chosen plaintexts recover the
entire key; with known (not chosen) plaintexts, a few more and one Gaussian
elimination do the same. By §9.9 you will have done it in code.

This chapter teaches the algebra that makes such attacks routine, and shows that
the same algebra, used by the designer instead of the attacker, is what spreads
each bit of an AES block across the whole block.

## 9.2 Vectors, matrices and elimination

*Level: beginner.*

Over any field $F$, a **vector** of length $n$ is a list of $n$ elements of $F$,
and $F^n$ is the set of all of them. Vectors add entry by entry and can be
multiplied by scalars. A **matrix** with $m$ rows and $n$ columns acts on vectors
by $y = Ax$, where $y_i = \sum_j A_{ij} x_j$. Everything is computed in $F$: mod
$p$ for $\mathbb{F}_p$, with exclusive-or and AND for $\mathbb{F}_2$, and with the
operations of Chapter 8 for $\mathrm{GF}(2^8)$.

Over $\mathbb{F}_2$, a vector of length 32 is a 32-bit word, adding two vectors is
xor, and the inner product $\sum_i a_i x_i$ is the parity of the bits of $a \mathbin{\&}
x$. Linear algebra over $\mathbb{F}_2$ is bit manipulation.

### Gaussian elimination

To solve $Ax = b$, write the **augmented matrix** $[A \mid b]$ and use three
moves, none of which changes the solutions: swap two rows; multiply a row by a
nonzero scalar; add a multiple of one row to another. Work column by column: find
a row with a nonzero entry (a **pivot**) in the current column, scale it to 1, and
clear the column in every other row. The result is the **reduced row echelon
form**, from which the solutions can be read.

Over the real numbers, elimination must choose pivots carefully, because dividing
by a tiny number amplifies rounding errors. Over a finite field there is no
rounding: any nonzero pivot will do, and the answer is exact.

### By hand

Over $\mathbb{F}_7$, solve

$$2x + y + 3z = 1, \qquad x + 4y + z = 2, \qquad 3x + 4z = 3.$$

Put the second equation first (its leading coefficient is already 1):
$[1, 4, 1 \mid 2]$. Subtract twice it from the old first equation: $[0, 1 - 8, 3 -
2 \mid 1 - 4] = [0, 0, 1 \mid 4]$ mod 7. Subtract three times it from the third:
$[0, -12, 1 \mid -3] = [0, 2, 1 \mid 4]$. Now $z = 4$ from the second row, then $2y
+ 4 = 4$ gives $y = 0$, then $x + 0 + 4 = 2$ gives $x = -2 = 5$. Check the first
equation: $10 + 0 + 12 = 22 \equiv 1$. Correct.

<figure class="mars-fig">
<svg viewBox="0 0 640 200" width="640" role="img" aria-label="Gaussian elimination over F_7: the augmented matrix with rows 2 1 3 1, 1 4 1 2, 3 0 4 3 becomes the reduced form with rows 1 0 0 5, 0 1 0 0, 0 0 1 4, giving x = 5, y = 0, z = 4" fill="currentColor" font-size="14">
<g stroke="currentColor" stroke-width="1.4" fill="none">
<path d="M40 40 L30 40 L30 160 L40 160"/><path d="M240 40 L250 40 L250 160 L240 160"/>
<path d="M390 40 L380 40 L380 160 L390 160"/><path d="M590 40 L600 40 L600 160 L590 160"/>
<line x1="195" y1="45" x2="195" y2="155" stroke-dasharray="3 3"/><line x1="545" y1="45" x2="545" y2="155" stroke-dasharray="3 3"/>
<path d="M270 100 L360 100" class="acc"/><path d="M360 100 L350 94 M360 100 L350 106" class="acc"/>
</g>
<g text-anchor="middle">
<text x="65" y="70">2</text><text x="110" y="70">1</text><text x="155" y="70">3</text><text x="220" y="70">1</text>
<text x="65" y="105">1</text><text x="110" y="105">4</text><text x="155" y="105">1</text><text x="220" y="105">2</text>
<text x="65" y="140">3</text><text x="110" y="140">0</text><text x="155" y="140">4</text><text x="220" y="140">3</text>
<text x="415" y="70" class="acc-fill">1</text><text x="460" y="70">0</text><text x="505" y="70">0</text><text x="570" y="70">5</text>
<text x="415" y="105">0</text><text x="460" y="105" class="acc-fill">1</text><text x="505" y="105">0</text><text x="570" y="105">0</text>
<text x="415" y="140">0</text><text x="460" y="140">0</text><text x="505" y="140" class="acc-fill">1</text><text x="570" y="140">4</text>
</g>
<text x="315" y="88" text-anchor="middle" font-size="12">row moves mod 7</text>
<text x="140" y="190" text-anchor="middle" font-size="12">[A | b]</text>
<text x="490" y="190" text-anchor="middle" font-size="12">x = 5, y = 0, z = 4</text>
</svg>
<figcaption>Figure 9.1. Gaussian elimination over F₇. Swapping rows, scaling by nonzero numbers and subtracting multiples of rows turns the system into one whose solution can be read off. Every step is exact.</figcaption>
</figure>

### Code it

```python
def rref(M, p):
    """Reduced row echelon form of M over F_p. Returns (R, pivot columns)."""
    R = [row[:] for row in M]
    rows, cols = len(R), len(R[0])
    pivots, r = [], 0
    for c in range(cols):
        pr = next((i for i in range(r, rows) if R[i][c] % p), None)
        if pr is None:
            continue
        R[r], R[pr] = R[pr], R[r]
        inv = pow(R[r][c], -1, p)
        R[r] = [x * inv % p for x in R[r]]
        for i in range(rows):
            if i != r and R[i][c]:
                f = R[i][c]
                R[i] = [(a - f * b) % p for a, b in zip(R[i], R[r])]
        pivots.append(c)
        r += 1
        if r == rows:
            break
    return R, pivots

A = [[2, 1, 3], [1, 4, 1], [3, 0, 4]]          # over F_7
b = [1, 2, 3]
R, piv = rref([row + [bi] for row, bi in zip(A, b)], 7)
for row in R:
    print(row)
x = [row[-1] for row in R]
print(x, [sum(a * xi for a, xi in zip(row, x)) % 7 for row in A])
```

```text
[1, 0, 0, 5]
[0, 1, 0, 0]
[0, 0, 1, 4]
[5, 0, 4] [1, 2, 3]
```

Elimination on an $n \times n$ system takes about $n^3$ field operations. Over
$\mathbb{F}_2$, packing 64 entries in a machine word makes it 64 times faster
again; this is how the linear-algebra step of factoring and discrete-logarithm
records is done (§9.10).

## 9.3 Rank, kernel and the shape of the solutions

*Level: beginner.*

The **rank** of a matrix is the number of pivots in its echelon form: the number
of independent rows, which always equals the number of independent columns. The
**kernel** (or null space) of $A$ is the set of $x$ with $Ax = 0$. Each column
without a pivot is a **free variable**: set it to anything and the pivot variables
are determined. So for an $m \times n$ matrix:

$$\dim \ker A = n - \operatorname{rank} A.$$

This is the **rank-nullity theorem**. Over $\mathbb{F}_q$ the kernel has exactly
$q^{n - \operatorname{rank} A}$ elements, and the solutions of $Ax = b$, if there
are any, are one particular solution plus the kernel. There are three cases:

- no solution, when $b$ is not a combination of the columns;
- exactly one, when the kernel is $\{0\}$ (rank $n$);
- exactly $q^{n - \operatorname{rank} A}$, a translated copy of the kernel.

```python
def rank(M, p):
    return len(rref(M, p)[1])

def kernel(M, p):
    """A basis of the solutions of M x = 0 over F_p."""
    R, piv = rref(M, p)
    n = len(M[0])
    free = [c for c in range(n) if c not in piv]
    basis = []
    for f in free:
        v = [0] * n
        v[f] = 1
        for i, c in enumerate(piv):
            v[c] = -R[i][f] % p
        basis.append(v)
    return basis

B = [[1, 1, 0, 1], [0, 1, 1, 1], [1, 0, 1, 0]]   # over F_2
print(rank(B, 2), kernel(B, 2))
```

```text
2 [[1, 1, 1, 0], [0, 1, 0, 1]]
```

The third row of $B$ is the xor of the first two, so the rank is 2 and the kernel
has dimension $4 - 2 = 2$: the four vectors $0000$, $1110$, $0101$ and $1011$.

Kernels over $\mathbb{F}_2$ have a famous use. In the quadratic sieve and the
number field sieve (*Cryptanalysis*, chapter 11), each relation found gives a
vector of exponent parities, and a kernel vector picks out a set of relations whose
product is a perfect square, $x^2 \equiv y^2 \pmod N$. Then $\gcd(x - y, N)$ is
often a factor. The hard part of factoring is collecting relations; the last step
is a kernel computation over $\mathbb{F}_2$.

## 9.4 Inverses and determinants

*Level: beginner.*

A square matrix $A$ is **invertible** if there is $A^{-1}$ with $AA^{-1} =
A^{-1}A = I$. Over a field, the following are equivalent: $A$ is invertible; its
rank is $n$; its kernel is $\{0\}$; its **determinant** is nonzero. To find the
inverse, reduce $[A \mid I]$; if the left half becomes $I$, the right half is
$A^{-1}$.

The determinant can be defined as the product of the pivots found during
elimination, with a sign change for each row swap; it is the unique function of
the rows that is linear in each row, changes sign when two rows swap, and gives 1
for $I$. The key property is $\det(AB) = \det A \det B$.

```python
def mat_mul(A, B, p):
    return [[sum(a * b for a, b in zip(row, col)) % p for col in zip(*B)] for row in A]

def mat_inv(A, p):
    n = len(A)
    R, piv = rref([row + [int(i == j) for j in range(n)] for i, row in enumerate(A)], p)
    if piv[:n] != list(range(n)):
        return None
    return [row[n:] for row in R]

def det(A, p):
    """Determinant over F_p by elimination."""
    A = [row[:] for row in A]
    n, d = len(A), 1
    for c in range(n):
        pr = next((i for i in range(c, n) if A[i][c] % p), None)
        if pr is None:
            return 0
        if pr != c:
            A[c], A[pr] = A[pr], A[c]
            d = -d
        d = d * A[c][c] % p
        inv = pow(A[c][c], -1, p)
        for i in range(c + 1, n):
            f = A[i][c] * inv % p
            A[i] = [(a - f * b) % p for a, b in zip(A[i], A[c])]
    return d % p

Ainv = mat_inv(A, 7)
print(Ainv, mat_mul(A, Ainv, 7), det(A, 7))
```

```text
[[1, 5, 5], [3, 3, 4], [1, 5, 0]] [[1, 0, 0], [0, 1, 0], [0, 0, 1]] 2
```

### How many matrices are invertible?

Build an invertible $n \times n$ matrix over $\mathbb{F}_q$ row by row. The first
row can be anything but zero: $q^n - 1$ choices. The second must avoid the $q$
multiples of the first: $q^n - q$. The third must avoid the $q^2$ combinations of
the first two, and so on. So

$$|GL_n(\mathbb{F}_q)| = (q^n - 1)(q^n - q)(q^n - q^2) \cdots (q^n - q^{n-1}).$$

The fraction of all $q^{n^2}$ matrices that are invertible is $\prod_{i=1}^{n}(1 -
q^{-i})$. Over $\mathbb{F}_2$ it tends to $0.2888\ldots$: fewer than three binary
matrices in ten are invertible, however large.

```python
import random

def count_invertible(n, q):
    out = 1
    for i in range(n):
        out *= q**n - q**i
    return out

rng = random.Random(1)
trials = 4000
hits = sum(det([[rng.randrange(2) for _ in range(8)] for _ in range(8)], 2) != 0 for _ in range(trials))
print(count_invertible(2, 2), count_invertible(8, 2) / 2**64, hits / trials)
```

```text
6 0.289919117858517 0.29125
```

There are six invertible $2 \times 2$ binary matrices (they permute the three
nonzero vectors, and $GL_2(\mathbb{F}_2)$ is isomorphic to $S_3$). For $8 \times
8$, the exact fraction is 0.2899 and the experiment gives 0.291. Cipher designers
who pick a "random invertible matrix" have to reject about seven candidates in
ten.

## 9.5 The Hill cipher

*Level: intermediate.*

In 1929 Lester Hill, a mathematician at Hunter College in New York, published
"Cryptography in an Algebraic Alphabet" in the *American Mathematical Monthly*.
His cipher treats blocks of $n$ letters as vectors mod 26 (A = 0, ..., Z = 25) and
multiplies them by a secret $n \times n$ key matrix $K$:

$$c = Kp \bmod 26.$$

Decryption multiplies by $K^{-1}$ mod 26, which exists exactly when $\det K$ is
coprime to 26 (odd and not a multiple of 13). It was the first cipher designed
from algebra rather than by hand, and it mixes letters: changing one plaintext
letter changes the whole ciphertext block, which defeats single-letter frequency
counts.

Because 26 is not prime, $\mathbb{Z}/26\mathbb{Z}$ is not a field, and the
elimination code above (which divides by any nonzero pivot) does not apply. For
$3 \times 3$ matrices, the inverse is the **adjugate** (the transposed matrix of
cofactors, the signed $2 \times 2$ determinants) times the inverse of the
determinant, which works over any commutative ring when the determinant is a unit.

```python
# The Hill cipher (1929) mod 26 with a 3x3 key, and its known-plaintext break.
from math import gcd

def text_to_blocks(s, n):
    v = [ord(c) - 65 for c in s]
    return [v[i:i + n] for i in range(0, len(v), n)]

def hill(K, s):
    n = len(K)
    out = []
    for blk in text_to_blocks(s, n):
        out += [sum(k * x for k, x in zip(row, blk)) % 26 for row in K]
    return "".join(chr(c + 65) for c in out)

def det_int(M):
    a, b, c = M[0]; d, e, f = M[1]; g, h, i = M[2]
    return a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g)

def inv_mod26(M):
    """Inverse of a 3x3 matrix mod 26: adjugate times the inverse determinant."""
    D = det_int(M) % 26
    if gcd(D, 26) != 1:
        return None
    Dinv = pow(D, -1, 26)
    # cofactor C[i][j], with its sign, by the cyclic-index rule for 3x3 matrices
    C = [[M[(i + 1) % 3][(j + 1) % 3] * M[(i + 2) % 3][(j + 2) % 3]
          - M[(i + 1) % 3][(j + 2) % 3] * M[(i + 2) % 3][(j + 1) % 3] for j in range(3)]
         for i in range(3)]
    return [[C[j][i] * Dinv % 26 for j in range(3)] for i in range(3)]   # transpose

K = [[6, 24, 1], [13, 16, 10], [20, 17, 15]]
msg = "MEETATTHEDOMEAIRLOCK"
msg += "X" * (-len(msg) % 3)
ct = hill(K, msg)
print(ct, hill(inv_mod26(K), ct))

# Known plaintext: the attacker knows the message and needs three blocks
# whose 3x3 matrix is invertible mod 26.
from itertools import combinations
pb, cb = text_to_blocks(msg, 3), text_to_blocks(ct, 3)
for trio in combinations(range(len(pb)), 3):
    P = [list(c) for c in zip(*[pb[i] for i in trio])]       # columns are blocks
    Pinv = inv_mod26(P)
    if Pinv:
        break
C = [list(c) for c in zip(*[cb[i] for i in trio])]
K_found = mat_mul(C, Pinv, 26)
print(trio, K_found == K)
```

```text
QAEDVPAJNCTKGCSQRJPAJ MEETATTHEDOMEAIRLOCKX
(1, 2, 6) True
```

### Break it

The attack is one line of algebra. Put $n$ known plaintext blocks as the columns
of a matrix $P$ and the matching ciphertext blocks as the columns of $C$. Then $C
= KP$, so if $P$ is invertible,

$$K = C P^{-1} \bmod 26.$$

Nine known letters are enough for a $3 \times 3$ key, if the three blocks they
form are invertible mod 26. In the example, the first three blocks
(MEE, TAT, THE) are not (their determinant shares a factor with 26), so the code
tries other triples and the second, third and seventh blocks work. The key
space has about $26^9 \approx 5 \times 10^{12}$ matrices, but the attack never
searches it.

<figure class="mars-fig">
<svg viewBox="0 0 640 170" width="640" role="img" aria-label="The Hill cipher known-plaintext attack: three known plaintext blocks form the columns of P, the three ciphertext blocks form C, and the key is C times the inverse of P" fill="currentColor" font-size="14">
<g stroke="currentColor" stroke-width="1.3" fill="none">
<rect x="30" y="40" width="110" height="90" rx="6"/>
<rect x="190" y="40" width="110" height="90" rx="6" class="acc"/>
<rect x="350" y="40" width="110" height="90" rx="6"/>
<rect x="510" y="40" width="110" height="90" rx="6"/>
</g>
<text x="85" y="90" text-anchor="middle">C</text><text x="245" y="90" text-anchor="middle" class="acc-fill">K</text>
<text x="405" y="90" text-anchor="middle">P</text><text x="565" y="90" text-anchor="middle">I</text>
<text x="165" y="90" text-anchor="middle">=</text><text x="325" y="90" text-anchor="middle">·</text><text x="485" y="90" text-anchor="middle" font-size="12">P⁻¹ →</text>
<text x="85" y="28" text-anchor="middle" font-size="12">ciphertext blocks</text>
<text x="245" y="28" text-anchor="middle" font-size="12">unknown key</text>
<text x="405" y="28" text-anchor="middle" font-size="12">known plaintext blocks</text>
<text x="320" y="160" text-anchor="middle" class="acc-fill">K = C · P⁻¹ mod 26, once P is invertible</text>
</svg>
<figcaption>Figure 9.2. Breaking the Hill cipher. Encryption of n blocks at once is one matrix equation, C = KP. With n known plaintext blocks forming an invertible P, multiplying by P⁻¹ gives the whole key.</figcaption>
</figure>

The lesson is general: **a cipher that is linear in its input falls to known
plaintext, whatever the size of the key.** Modern block ciphers put nonlinear
S-boxes (Chapter 10) between their linear layers precisely so that no such
equation exists.

## 9.6 Linear feedback shift registers

*Level: intermediate.*

A **linear feedback shift register** (LFSR) of length $L$ holds $L$ bits $s_t,
\dots, s_{t+L-1}$. Each step outputs $s_t$, shifts, and computes a new bit as a
fixed xor of the old ones:

$$s_{t+L} = c_1 s_{t+L-1} + c_2 s_{t+L-2} + \dots + c_L s_t \pmod 2.$$

The $c_i$ are the **taps**. LFSRs are tiny in hardware (a shift register and a
few xor gates), fast, and their output passes many statistical tests, which made
them the building block of stream ciphers from the 1960s to the 2000s: the GSM
phone cipher A5/1 (three LFSRs of 19, 22 and 23 bits), Bluetooth's E0 (four),
and the DVD's Content Scramble System (two). They are also in every CRC checksum
and in the scramblers of Ethernet and Wi-Fi.

### As a matrix

The state $S_t = (s_t, \dots, s_{t+L-1})$ evolves by $S_{t+1} = M S_t$ with the
**companion matrix**

$$M = \begin{pmatrix} 0 & 1 & 0 & \cdots & 0 \\ 0 & 0 & 1 & \cdots & 0 \\ \vdots
& & & \ddots & \vdots \\ 0 & 0 & 0 & \cdots & 1 \\ c_L & c_{L-1} & c_{L-2} &
\cdots & c_1 \end{pmatrix}.$$

So $S_t = M^t S_0$: the whole LFSR is one matrix power. Its **characteristic
polynomial** is

$$f(x) = x^L + c_1 x^{L-1} + \dots + c_{L-1}x + c_L,$$

and $f(M) = 0$ (the Cayley-Hamilton theorem, which here is easy to check
directly). The sequence's behavior is the polynomial's:

- the sequence is periodic, and the period divides the order of $x$ in
  $\mathbb{F}_2[x]/(f)$;
- if $f$ is **primitive** (irreducible, with $x$ a generator of the multiplicative
  group, Chapter 8), every nonzero start gives the maximum period $2^L - 1$, and
  each nonzero $L$-bit pattern appears exactly once per period. Such outputs are
  called **m-sequences**.

<figure class="mars-fig">
<svg viewBox="0 0 640 200" width="640" role="img" aria-label="A 4-bit LFSR: four cells s3, s2, s1, s0 shift right, the output is s0, and the new bit entering on the left is s0 xor s1, giving period 15" fill="currentColor" font-size="13">
<g stroke="currentColor" stroke-width="1.4" fill="none">
<rect x="150" y="70" width="70" height="44"/><rect x="230" y="70" width="70" height="44"/>
<rect x="310" y="70" width="70" height="44"/><rect x="390" y="70" width="70" height="44"/>
<path d="M460 92 L540 92"/><path d="M540 92 L530 86 M540 92 L530 98"/>
<circle cx="380" cy="160" r="12" class="acc"/>
<path d="M425 114 L425 160 L392 160"/>
<path d="M345 114 L345 160 L368 160"/>
<path d="M380 172 L380 186 L110 186 L110 92 L150 92"/><path d="M150 92 L140 86 M150 92 L140 98"/>
</g>
<text x="185" y="97" text-anchor="middle">s₃</text><text x="265" y="97" text-anchor="middle">s₂</text>
<text x="345" y="97" text-anchor="middle">s₁</text><text x="425" y="97" text-anchor="middle">s₀</text>
<text x="380" y="165" text-anchor="middle" class="acc-fill">⊕</text>
<text x="560" y="97">output</text>
<text x="305" y="50" text-anchor="middle">shift right each step; new bit s₄ = s₁ xor s₀</text>
<text x="80" y="140" text-anchor="middle" font-size="12">feedback</text>
</svg>
<figcaption>Figure 9.3. A linear feedback shift register of length 4. Each step outputs the rightmost bit, shifts, and feeds the xor of two tapped bits back in. Its characteristic polynomial x⁴ + x + 1 is primitive, so every nonzero start runs through all 15 nonzero states.</figcaption>
</figure>

```python
# A linear feedback shift register over F_2 and its matrix.
def lfsr(taps, state, n):
    """taps: c_1..c_L, new bit s_{t+L} = sum c_i * s_{t+L-i}. state: s_0..s_{L-1}."""
    s = list(state)
    while len(s) < n:
        s.append(sum(c * s[-i] for i, c in enumerate(taps, 1)) % 2)
    return s[:n]

taps = [0, 0, 1, 1]                 # s_{t+4} = s_{t+1} + s_t: characteristic polynomial x^4 + x + 1
out = lfsr(taps, [1, 0, 0, 0], 40)
print("".join(map(str, out)))
period = next(T for T in range(1, 40) if out[T:T + 4] == out[:4])
print(period)
```

```text
1000100110101111000100110101111000100110
15
```

The output repeats with period 15 = $2^4 - 1$, and each of the 15 nonzero 4-bit
windows appears once per period. Solomon Golomb's 1967 book *Shift Register
Sequences* proved the statistical properties of m-sequences (balance, runs,
two-valued autocorrelation), which is why they were trusted for so long. They are
excellent pseudorandom sequences and terrible keystreams.

## 9.7 Berlekamp-Massey: linear means predictable

*Level: intermediate.*

If the taps are secret but the sequence is linear, how much output reveals them?
The **linear complexity** of a sequence is the length of the shortest LFSR that
generates it. An LFSR of length $L$ has linear complexity at most $L$.

**Theorem (Massey, 1969).** If a sequence has linear complexity $L$, then $2L$
consecutive bits determine the shortest LFSR that generates it, and the
Berlekamp-Massey algorithm finds it in about $L^2$ operations.

The simplest view: with $2L$ bits, the recurrence $s_{t+L} = \sum c_i s_{t+L-i}$
for $t = 0, \dots, L - 1$ gives $L$ linear equations in the $L$ unknown taps, and
Gaussian elimination solves them in $L^3$ steps. Elwyn Berlekamp's algorithm
(1968), designed to decode BCH codes, and James Massey's reading of it as LFSR
synthesis, do better: they process one bit at a time and keep the shortest
recurrence that explains everything so far, adjusting it with an earlier one when
a new bit disagrees.

```python
def berlekamp_massey(s):
    """Shortest LFSR (over F_2) generating the bit list s. Returns (L, taps c_1..c_L)."""
    C, B = [1], [1]
    L, m = 0, 1
    for n in range(len(s)):
        d = s[n]
        for i in range(1, L + 1):
            d ^= C[i] & s[n - i]
        if d == 0:
            m += 1
            continue
        T = C[:]
        C = C + [0] * max(0, len(B) + m - len(C))
        for i, bi in enumerate(B):
            C[i + m] ^= bi
        if 2 * L <= n:
            L, B, m = n + 1 - L, T, 1
        else:
            m += 1
    return L, (C + [0] * (L + 1))[1:L + 1]

secret_taps = [1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]   # 17 bits
rng = random.Random(17)
seed = [rng.randrange(2) for _ in range(17)]
stream = lfsr(secret_taps, seed, 200)
L, found = berlekamp_massey(stream[:34])
print(L, found == secret_taps)
print(lfsr(found, stream[:L], 200) == stream)
```

```text
17 True
True
```

Thirty-four bits of keystream (from, say, a known header in the plaintext) reveal
the taps of a 17-bit register, and the attacker can then generate all the rest.
For a 128-bit LFSR, 256 bits suffice. So a stream cipher must have a linear
complexity far beyond the amount of keystream anyone will ever see, which means
its output cannot come straight from an LFSR.

**The repair, and its limits.** Designers combined several LFSRs through a
nonlinear Boolean function, or filtered one register's state through such a
function, or clocked registers irregularly (A5/1 moves each register only when its
clock bit agrees with the majority). The linear complexity then becomes huge. But
other attacks appear: if the output agrees with one register more often than half
the time, that register can be attacked alone (Thomas Siegenthaler's correlation
attack, 1985). Chapter 10 measures such agreement with the Walsh-Hadamard
transform. A5/1 fell to time-memory trade-offs and correlation attacks (Alex
Biryukov, Adi Shamir and David Wagner, 2000; public rainbow tables by 2009); E0
and CSS fell too. Modern stream ciphers (Salsa20, ChaCha, Trivium) and block
ciphers in counter mode avoid pure LFSRs.

!!! note "Life story: the LFSR"
    **Born:** 1950s, in military and telephone scramblers; theory by Solomon
    Golomb (*Shift Register Sequences*, 1967) · **Purpose:** long, balanced,
    cheap pseudorandom bit streams · **Helped:** CRC checksums, spread-spectrum
    radio and GPS codes, the stream ciphers of GSM (A5/1), Bluetooth (E0) and
    DVDs (CSS), and countless test-pattern generators · **Status:** retired from
    keystreams, since Berlekamp-Massey (1969) predicts any linear sequence;
    alive everywhere randomness is not secret

## 9.8 MDS matrices and AES MixColumns

*Level: intermediate.*

So far linear algebra has been the attacker's tool. In a modern block cipher it
is also the designer's: the linear layer between S-box layers spreads changes
across the block (**diffusion**), and how well it spreads them can be measured.

### Branch number

For a linear map $M$ on vectors of bytes, let $w(v)$ be the number of nonzero
bytes of $v$. The **branch number** of $M$ is

$$\mathcal{B}(M) = \min_{v \ne 0} \big( w(v) + w(Mv) \big).$$

If $M$ acts on 4 bytes, $\mathcal{B} \le 5$: an input with one nonzero byte has
output weight at most 4. A large branch number means a difference in few input
bytes must appear in many output bytes, and vice versa. In a differential attack
(Chapter 10), each byte with a nonzero difference entering an S-box is an
**active S-box**, and each costs the attacker probability. A branch number of 5
forces at least 5 active S-boxes across any two consecutive rounds.

### MDS matrices

A matrix reaches the maximum branch number $n + 1$ exactly when every square
submatrix of it (of every size) is invertible. Such matrices are called **MDS**,
for maximum distance separable, because $[I \mid M]$ is then the generator
matrix of an MDS code, a code meeting the Singleton bound of Chapter 18 (Reed-Solomon
codes are the standard example).

AES's MixColumns multiplies each 4-byte column by the circulant matrix

$$\begin{pmatrix} 2 & 3 & 1 & 1 \\ 1 & 2 & 3 & 1 \\ 1 & 1 & 2 & 3 \\ 3 & 1 & 1
& 2 \end{pmatrix}$$

over $\mathrm{GF}(2^8)$. The entries 1, 2 and 3 were chosen because
multiplying by them is cheap (xtime, and xtime plus xor), and the matrix is MDS.

```python
# MixColumns: a 4x4 matrix over GF(2^8).
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

MC = [[2, 3, 1, 1], [1, 2, 3, 1], [1, 1, 2, 3], [3, 1, 1, 2]]

def mix(col):
    out = []
    for row in MC:
        v = 0
        for m, x in zip(row, col):
            v ^= gmul(m, x)
        out.append(v)
    return out

print([hex(x) for x in mix([0xdb, 0x13, 0x53, 0x45])])
print([hex(x) for x in mix([0x01, 0x01, 0x01, 0x01])])
```

```text
['0x8e', '0x4d', '0xa1', '0xbc']
['0x1', '0x1', '0x1', '0x1']
```

The first line is a standard MixColumns test vector. The second shows that a
column of equal bytes is unchanged, since $2 + 3 + 1 + 1 = 1$ in
$\mathrm{GF}(2^8)$; the S-box and the key prevent this from being exploitable.

Now check the MDS property by computing all 69 square submatrix determinants
over $\mathrm{GF}(2^8)$ (16 of size 1, 36 of size 2, 16 of size 3, 1 of size 4),
and search random sparse inputs for the smallest total weight:

```python
from itertools import combinations

def ginv(a):
    r, e = 1, 254
    while e:
        if e & 1:
            r = gmul(r, a)
        a, e = gmul(a, a), e >> 1
    return r

def gdet(M):
    """Determinant over GF(2^8) by elimination (signs vanish in characteristic 2)."""
    M = [row[:] for row in M]
    n, d = len(M), 1
    for c in range(n):
        pr = next((i for i in range(c, n) if M[i][c]), None)
        if pr is None:
            return 0
        M[c], M[pr] = M[pr], M[c]
        d = gmul(d, M[c][c])
        inv = ginv(M[c][c])
        for i in range(c + 1, n):
            f = gmul(M[i][c], inv)
            M[i] = [a ^ gmul(f, b) for a, b in zip(M[i], M[c])]
    return d

def is_mds(M):
    n = len(M)
    for k in range(1, n + 1):
        for rows in combinations(range(n), k):
            for cols in combinations(range(n), k):
                if gdet([[M[r][c] for c in cols] for r in rows]) == 0:
                    return False
    return True

def weight(v):
    return sum(x != 0 for x in v)

print(is_mds(MC), is_mds([[1, 1, 1, 1], [1, 2, 3, 4], [1, 3, 2, 5], [1, 4, 5, 2]]))
rng = random.Random(5)
best = min(weight(v) + weight(mix(v))
           for v in ([rng.randrange(256) if rng.random() < 0.4 else 0 for _ in range(4)] for _ in range(20000))
           if weight(v))
print(best)
```

```text
True False
5
```

MixColumns is MDS; the second matrix, which looks similar, is not (it has
singular submatrices). The random search never finds a total weight below 5,
as the theory guarantees.

<figure class="mars-fig">
<svg viewBox="0 0 640 220" width="640" role="img" aria-label="Branch number 5 of AES MixColumns: an input column with one nonzero byte becomes an output column with four nonzero bytes, and an input with two nonzero bytes has at least three nonzero output bytes" fill="currentColor" font-size="13">
<g stroke="currentColor" stroke-width="1.2" fill="none">
<rect x="60" y="40" width="40" height="34"/><rect x="60" y="74" width="40" height="34"/><rect x="60" y="108" width="40" height="34"/><rect x="60" y="142" width="40" height="34"/>
<rect x="230" y="40" width="40" height="34"/><rect x="230" y="74" width="40" height="34"/><rect x="230" y="108" width="40" height="34"/><rect x="230" y="142" width="40" height="34"/>
<rect x="370" y="40" width="40" height="34"/><rect x="370" y="74" width="40" height="34"/><rect x="370" y="108" width="40" height="34"/><rect x="370" y="142" width="40" height="34"/>
<rect x="540" y="40" width="40" height="34"/><rect x="540" y="74" width="40" height="34"/><rect x="540" y="108" width="40" height="34"/><rect x="540" y="142" width="40" height="34"/>
<path d="M115 108 L215 108"/><path d="M215 108 L205 102 M215 108 L205 114"/>
<path d="M425 108 L525 108"/><path d="M525 108 L515 102 M525 108 L515 114"/>
</g>
<g class="acc-fill">
<rect x="62" y="76" width="36" height="30"/>
<rect x="232" y="42" width="36" height="30"/><rect x="232" y="76" width="36" height="30"/><rect x="232" y="110" width="36" height="30"/><rect x="232" y="144" width="36" height="30"/>
<rect x="372" y="42" width="36" height="30"/><rect x="372" y="110" width="36" height="30"/>
<rect x="542" y="42" width="36" height="30"/><rect x="542" y="76" width="36" height="30"/><rect x="542" y="144" width="36" height="30"/>
</g>
<text x="165" y="96" text-anchor="middle">MixColumns</text>
<text x="475" y="96" text-anchor="middle">MixColumns</text>
<text x="165" y="205" text-anchor="middle">1 + 4 = 5 active bytes</text>
<text x="475" y="205" text-anchor="middle">2 + at least 3 = 5 or more</text>
</svg>
<figcaption>Figure 9.4. The branch number of MixColumns. Shaded bytes are nonzero (a difference, in a differential attack). Whatever goes in, the nonzero bytes in and out add up to at least 5, the most possible for a 4-byte map.</figcaption>
</figure>

Joan Daemen and Vincent Rijmen's **wide trail strategy** combines this with
ShiftRows, which moves the four bytes of each column into four different columns.
Together they guarantee at least 25 active S-boxes in any four consecutive rounds
of AES. Each active S-box passes a difference with probability at most $2^{-6}$
(Chapter 10), so any four-round differential characteristic has probability at
most $2^{-150}$, far below what an attack on 128-bit blocks could use.

## 9.9 Break it: linear ciphers

*Level: expert.*

Back to the rover's cipher of §9.1: $E(x) = Ax + b$ over $\mathbb{F}_2^{32}$,
with a secret invertible $A$ and offset $b$.

```python
# Why linear means broken: a 32-bit "cipher" that is affine over F_2.
n = 32
rng = random.Random(32)
while True:
    Akey = [[rng.randrange(2) for _ in range(n)] for _ in range(n)]
    if det(Akey, 2):
        break
bkey = [rng.randrange(2) for _ in range(n)]

def bits(x):
    return [(x >> i) & 1 for i in range(n)]

def encrypt(x):
    v = bits(x)
    y = [(sum(a * b for a, b in zip(row, v)) + c) % 2 for row, c in zip(Akey, bkey)]
    return sum(bit << i for i, bit in enumerate(y))

# Attack: E(0) gives b; E(e_i) xor E(0) gives column i of A.  n + 1 queries in all.
b_found = bits(encrypt(0))
cols = [bits(encrypt(1 << i) ^ encrypt(0)) for i in range(n)]
A_found = [list(r) for r in zip(*cols)]
print(A_found == Akey, b_found == bkey)
```

```text
True True
```

The key has $32 \times 32 + 32 = 1056$ bits, and 33 chosen plaintexts recover all
of them. With known random plaintexts $x_0, \dots, x_{32}$ instead, the differences
$x_i \oplus x_0$ are very likely to be independent (§9.4 says a random binary
matrix is invertible with probability about 0.29, and a few extra pairs push the
chance of full rank close to 1); then $A = (E(x_i) \oplus E(x_0))_i \cdot (x_i
\oplus x_0)_i^{-1}$ and $b = E(x_0) \oplus Ax_0$.

**Almost-linear is also broken.** A cipher need not be exactly linear to fall. If
some fixed xor of input, output and key bits equals 0 with probability noticeably
different from 1/2, Mitsuru Matsui's **linear cryptanalysis** (1993) collects
enough plaintext-ciphertext pairs to learn key bits from that bias; it broke DES
with $2^{43}$ known plaintexts. And if the cipher can be written as a system of
polynomial equations of low degree, **linearization** treats every monomial as a
new unknown and solves a linear system; Nicolas Courtois and Josef Pieprzyk's XSL
proposal (2002) tried this on AES, and it does not work: later analysis showed
that the method produces far fewer independent equations than it needs. The measure of how far an S-box
is from every linear function is the subject of Chapter 10.

**Fix it.** Put nonlinear S-boxes between the linear layers, and choose them to be
as far from linear as possible. Use enough rounds that every approximation's bias
vanishes below the data any attacker could collect.

## 9.10 In the real world and going deeper

*Level: expert.*

**The linear algebra of record computations.** The last stage of the number field
sieve, for factoring and for discrete logarithms in prime fields, solves a huge
sparse system: over $\mathbb{F}_2$ for factoring, over $\mathbb{Z}/q\mathbb{Z}$
for logarithms. The matrices have hundreds of millions of rows but only a few
hundred nonzero entries per row. Gaussian elimination would fill them in and run
out of memory, so record computations use iterative methods that only multiply the
matrix by vectors: Peter Montgomery's block Lanczos (1995) and Don Coppersmith's
block Wiedemann (1994). Block Wiedemann finds the kernel through the minimal
polynomial of a matrix sequence, found with a matrix version of
Berlekamp-Massey: this chapter's two halves in one algorithm.

**Linear algebra in post-quantum cryptography.** Code-based schemes (Classic
McEliece, HQC) hide a structured code behind a random-looking generator matrix
(Chapter 18); their security rests on the hardness of decoding a random linear
code, a problem that Gaussian elimination solves only when there are no errors.
Lattice schemes are linear algebra over $\mathbb{Z}_q$ with small errors added
(Chapter 15): without the errors, learning with errors is Gaussian elimination;
with them, it is believed hard even for quantum computers.

**Going deeper.**

- *Strassen and fast matrix multiplication.* Volker Strassen (1969) multiplied
  matrices in $n^{2.81}$ operations; the exponent has since dropped to about
  2.37. Over $\mathbb{F}_2$, the "Method of the Four Russians" saves a log factor
  in practice, and the M4RI library uses both.
- *Linear complexity profiles.* A good keystream's linear complexity grows like
  $n/2$ after $n$ bits, with small deviations; Rainer Rueppel (1986) studied the
  profile as a test of randomness, and it is part of the NIST SP 800-22 test suite.
- *MDS matrices beyond AES.* Lightweight ciphers search for MDS or near-MDS
  matrices with the fewest xor gates; involutory MDS matrices ($M = M^{-1}$) make
  decryption as cheap as encryption.
- *Linear codes and lattices.* Chapter 14 replaces "vectors mod $q$" by "integer
  vectors", where elimination is replaced by lattice reduction.

## Check yourself

??? question "1. Solve $x + y = 1$, $x + 2y = 0$ over $\mathbb{F}_5$."

    Subtract: $y = -1 = 4$, then $x = 1 - 4 = -3 = 2$. Check: $2 + 8 = 10 \equiv 0$.

??? question "2. What is the rank of the $\mathbb{F}_2$ matrix with rows 110, 011, 101? How many solutions does $Mx = 0$ have?"

    The third row is the xor of the first two, so the rank is 2. The kernel has
    $2^{3-2} = 2$ elements: $000$ and $111$.

??? question "3. When is a $2 \times 2$ matrix invertible mod 26?"

    When its determinant $ad - bc$ is coprime to 26, that is, odd and not a
    multiple of 13. Twelve of the 26 residues qualify.

??? question "4. How many invertible $3 \times 3$ matrices are there over $\mathbb{F}_2$?"

    $(8 - 1)(8 - 2)(8 - 4) = 7 \cdot 6 \cdot 4 = 168$.

??? question "5. In a $2 \times 2$ Hill cipher, how many known letters are needed for the attack?"

    Two blocks of two letters, four letters in all, provided the $2 \times 2$
    matrix they form is invertible mod 26; otherwise a few more.

??? question "6. An LFSR has characteristic polynomial $x^3 + x + 1$. What is the period of its output from a nonzero start?"

    $x^3 + x + 1$ is primitive over $\mathbb{F}_2$ ($x$ has order 7 = $2^3 - 1$),
    so the period is 7.

??? question "7. A stream cipher's keystream has linear complexity 64. How many bits of keystream does Berlekamp-Massey need?"

    $2L = 128$ consecutive bits.

??? question "8. What is the largest possible branch number of a linear map on 8 bytes, and what kind of matrix achieves it?"

    $8 + 1 = 9$, achieved by an $8 \times 8$ MDS matrix (every square submatrix
    invertible).

??? question "9. Why does the MixColumns matrix fix a column of four equal bytes?"

    Each output byte is $(2 + 3 + 1 + 1) \cdot a$, and $2 \oplus 3 \oplus 1 \oplus
    1 = 1$ in $\mathrm{GF}(2^8)$, so the output is $a$.

??? question "10. A cipher is affine over $\mathbb{F}_2^{64}$. How many chosen plaintexts recover its key?"

    65: the zero block for the offset, and the 64 unit vectors for the columns of
    the matrix.

## What you learned

- Over a finite field, Gaussian elimination is exact and takes about $n^3$
  operations; rank, kernel, inverse and determinant all come from it.
- Rank-nullity: the solutions of $Ax = b$ are none, one, or a translated kernel
  with $q^{n - \operatorname{rank}}$ elements.
- About 29 percent of large binary matrices are invertible; $|GL_n(\mathbb{F}_q)|
  = \prod (q^n - q^i)$.
- The Hill cipher is linear, so $K = CP^{-1}$ breaks it from a few known letters;
  any linear cipher falls the same way, whatever its key size.
- An LFSR is a companion-matrix power; a primitive characteristic polynomial gives
  period $2^L - 1$. Berlekamp-Massey recovers any LFSR from $2L$ bits.
- MDS matrices have the largest branch number; AES MixColumns is MDS, and the wide
  trail strategy turns that into a bound on differential and linear attacks.

**Next:** [Chapter 10](10-Boolean-Functions-and-S-Boxes.md), the nonlinear
parts: how far a Boolean function or an S-box is from linear, and how AES's
S-box scores.

## Further reading

- Gilbert Strang, *Introduction to Linear Algebra*, 6th edition (Wellesley-Cambridge,
  2023): the ideas, over the reals.
- Rudolf Lidl and Harald Niederreiter, *Introduction to Finite Fields and Their
  Applications* (Cambridge, 1994), chapters 6 and 8 on linear recurring sequences.
- Lester Hill, "Cryptography in an Algebraic Alphabet", *American Mathematical
  Monthly* 36 (1929).
- Solomon Golomb, *Shift Register Sequences* (Holden-Day, 1967; 3rd edition, World
  Scientific, 2017).
- James Massey, "Shift-Register Synthesis and BCH Decoding", *IEEE Transactions on
  Information Theory* 15 (1969).
- Rainer Rueppel, *Analysis and Design of Stream Ciphers* (Springer, 1986).
- Thomas Siegenthaler, "Decrypting a Class of Stream Ciphers Using Ciphertext
  Only", *IEEE Transactions on Computers* 34 (1985).
- Alex Biryukov, Adi Shamir and David Wagner, "Real Time Cryptanalysis of A5/1 on
  a PC", FSE 2000.
- Joan Daemen and Vincent Rijmen, *The Design of Rijndael*, 2nd edition (Springer,
  2020), chapter 9 on the wide trail strategy.
- Mitsuru Matsui, "Linear Cryptanalysis Method for DES Cipher", EUROCRYPT 1993.
- Don Coppersmith, "Solving Homogeneous Linear Equations over GF(2) via Block
  Wiedemann Algorithm", *Mathematics of Computation* 62 (1994).
- In *The cryptography book*: [Chapter 2](../../book/02-Classical-Ciphers.md),
  [Chapter 5](../../book/05-Stream-Ciphers.md) and
  [Chapter 7](../../book/07-AES.md).
