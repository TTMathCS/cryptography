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
linear attacks. The last part returns to the attacker: low-degree nonlinear
equations made linear (a filter generator and a toy block cipher, broken), and the
huge sparse systems at the end of every factoring record, solved by Wiedemann's
and Lanczos's methods.*

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
    - the Berlekamp-Massey algorithm, traced by hand and coded, and linear
      complexity;
    - MDS matrices, the branch number, AES MixColumns and its inverse, over
      $\mathrm{GF}(2^8)$ and as a $32 \times 32$ bit matrix;
    - why "linear" means "broken";
    - linearization, on a filter generator and a toy block cipher;
    - Wiedemann's method and block Lanczos for sparse factoring matrices.

    **You need:** [Chapter 3](03-Modular-Arithmetic.md) (inverses mod $n$) and
    [Chapter 8](08-Rings-Fields-and-Polynomials.md) (fields, polynomials,
    $\mathrm{GF}(2^8)$).

    **Levels:** §9.1 to §9.4 are for beginners, §9.5 to §9.8 are
    intermediate, §9.9 to §9.13 are expert.

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
records is done (§9.12).

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
number field sieve (*Cryptanalysis*, [chapter 11](../cryptanalysis/11-Factoring.md)), each relation found gives a
vector of exponent parities, and a kernel vector picks out a set of relations whose
product is a perfect square, $x^2 \equiv y^2 \pmod N$. Then $\gcd(x - y, N)$ is
often a factor. The hard part of factoring is collecting relations; the last step
is a kernel computation over $\mathbb{F}_2$, on a matrix so large and so sparse that
it needs methods of its own (§9.12).

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

### When the known blocks are singular: work mod 2 and mod 13

The first triple failed, and how it failed is itself linear algebra. Since $26 = 2
\cdot 13$, the Chinese remainder theorem ([Chapter 3](03-Modular-Arithmetic.md))
splits $\mathbb{Z}/26\mathbb{Z}$ into $\mathbb{F}_2 \times \mathbb{F}_{13}$: a
number mod 26 is the pair (its value mod 2, its value mod 13), and sums and
products work on each half separately. So the Hill cipher mod 26 is two Hill
ciphers side by side, one over the field $\mathbb{F}_2$ and one over
$\mathbb{F}_{13}$, and §9.2 to §9.4 apply to each.

**By hand.** The blocks MEE $= (12, 4, 4)$, TAT $= (19, 0, 19)$ and THE $= (19, 7,
4)$, as the columns of $P$, give $\det P = 76 \equiv 24 \pmod{26}$: even, so no
inverse mod 26. Mod 13, $76 \equiv 11 \ne 0$, so the three blocks fix the key mod
13 completely. Mod 2 the blocks are $(0, 0, 0)$, $(1, 0, 1)$ and $(1, 1, 0)$; the
first is zero, so the rank over $\mathbb{F}_2$ is 2.

What does rank 2 cost? Each key row $k$ satisfies $k \cdot p_j \equiv c_j$. The
kernel of $P^{\mathsf T}$ over $\mathbb{F}_2$ has
dimension $3 - 2 = 1$, spanned by $(1, 1, 1)$: each known block has an even letter
sum. So if $k$ is a correct key row, so is $k + 13 \cdot (1, 1, 1)$, because the
extra term adds $13 \times (\text{an even number}) \equiv 0 \pmod{26}$ to every
known product. Each row has two candidates, and $2^3 = 8$ keys fit all nine known
letters. In general an $m \times m$ key leaves $\prod_{p \mid n} p^{\,m(m - r_p)}$
candidates mod a squarefree $n$, where $r_p$ is the rank of $P$ over
$\mathbb{F}_p$.

The repair is a block with an odd letter sum. DOM $= (3, 14, 12)$ sums to 29, so
with it the rank mod 2 becomes 3. The attacker solves mod 13 from three blocks and
mod 2 from four, each with the `rref` of §9.2, and glues the halves: the number
that is $a$ mod 13 and $b$ mod 2 is $a + 13 \cdot ((b - a) \bmod 2)$.

```python
# Uses rref(), rank(), kernel(), det_int(), text_to_blocks(), msg, ct and K from the listings above.
from itertools import product

pb, cb = text_to_blocks(msg, 3), text_to_blocks(ct, 3)
P3 = [list(col) for col in zip(*pb[:3])]           # MEE, TAT, THE as columns
D = det_int(P3)
print("det", D % 26, "mod 2:", D % 2, "mod 13:", D % 13)
for p in (2, 13):
    print("p =", p, "rank", rank(P3, p), "left kernel", kernel([list(r) for r in zip(*P3)], p))

# how many key rows k agree with the three known blocks?
fits = [sum(all(sum(a * b for a, b in zip(k, pb[j])) % 26 == cb[j][r] for j in range(3))
            for k in product(range(26), repeat=3)) for r in range(3)]
print("key rows that fit:", fits, "keys:", fits[0] * fits[1] * fits[2])

def solve_key(blocks, p):
    """Each key row k solves k . p_j = c_j[row] over F_p, one equation per known block."""
    rows = []
    for r in range(3):
        R, piv = rref([pb[j] + [cb[j][r]] for j in blocks], p)
        assert piv == [0, 1, 2], "not enough independent blocks mod %d" % p
        rows.append([R[i][3] for i in range(3)])
    return rows

K13 = solve_key([0, 1, 2], 13)                     # three blocks are enough mod 13
K2 = solve_key([0, 1, 2, 3], 2)                    # mod 2 a fourth block (DOM) is needed
K26 = [[a + 13 * ((b - a) % 2) for a, b in zip(r13, r2)] for r13, r2 in zip(K13, K2)]
print(K13, K2, K26 == K)
```

It prints:

```text
det 24 mod 2: 0 mod 13: 11
p = 2 rank 2 left kernel [[1, 1, 1]]
p = 13 rank 3 left kernel []
key rows that fit: [2, 2, 2] keys: 8
[[6, 11, 1], [0, 3, 10], [7, 4, 2]] [[0, 0, 1], [1, 0, 0], [0, 1, 1]] True
```

The brute-force count agrees with rank-nullity, and the halves combine into the
true key. (A modulus with a repeated prime, such as 4, gives rings, not fields,
and needs Hensel lifting or the Smith normal form.)

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
import random

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

### A trace by hand

The algorithm keeps four things: the **connection polynomial** $C(x) = 1 + c_1 x +
\dots + c_L x^L$ of the current register, which predicts $s_n = c_1 s_{n-1} +
\dots + c_L s_{n-L}$; its length $L$ (which can exceed the degree of $C$ when the
last taps are 0); $B(x)$, a copy of $C$ from just before the last time $L$ grew;
and $m$, the number of steps since then. At step $n$ it computes the
**discrepancy** $d = s_n + c_1 s_{n-1} + \dots + c_L s_{n-L}$, which is 1 exactly
when the register mispredicts $s_n$. If $d = 0$, only $m$ grows. If $d = 1$, then
$C(x) \leftarrow C(x) + x^m B(x)$, and if moreover $2L \le n$ the register must
grow: $L \leftarrow n + 1 - L$, $B \leftarrow$ the old $C$, $m \leftarrow 1$.

Why the update works: $B$ failed $m$ steps ago, so $x^m B$ fails exactly at step
$n$; adding it to $C$ flips that prediction and leaves the earlier ones alone.
(Over a larger field it is first scaled by the ratio of the two discrepancies.) Why $L$ must
grow to $n + 1 - L$ is Massey's lemma: if a register of length $L$ generates
$s_0, \dots, s_{n-1}$ but not $s_n$, every register that generates $s_0, \dots,
s_n$ has length at least $n + 1 - L$.

Take $s = 1, 0, 1, 1, 1, 0, 0, 1$ and start with $C = B = 1$, $L = 0$, $m = 1$.

| $n$ | $s_n$ | prediction | $d$ | update | $L$ | $C(x)$ | $B(x)$ |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | 1 | 0 (empty register) | 1 | $C + x \cdot 1$; grow | 1 | $1 + x$ | $1$ |
| 1 | 0 | $s_0 = 1$ | 1 | $C + x \cdot 1$ | 1 | $1$ | $1$ |
| 2 | 1 | 0 | 1 | $C + x^2 \cdot 1$; grow | 2 | $1 + x^2$ | $1$ |
| 3 | 1 | $s_1 = 0$ | 1 | $C + x \cdot 1$ | 2 | $1 + x + x^2$ | $1$ |
| 4 | 1 | $s_3 + s_2 = 0$ | 1 | $C + x^2 \cdot 1$; grow | 3 | $1 + x$ | $1 + x + x^2$ |
| 5 | 0 | $s_4 = 1$ | 1 | $C + x(1 + x + x^2)$ | 3 | $1 + x^2 + x^3$ | $1 + x + x^2$ |
| 6 | 0 | $s_4 + s_3 = 0$ | 0 | none | 3 | $1 + x^2 + x^3$ | $1 + x + x^2$ |
| 7 | 1 | $s_5 + s_4 = 1$ | 0 | none | 3 | $1 + x^2 + x^3$ | $1 + x + x^2$ |

At $n = 1$ the correction cancels the $x$ in $C$, leaving a length-1 register with
no feedback; since $2L = 2 > 1$ the length stays. At $n = 4$, $C = 1 + x$ while $L
= 3$: a length-3 register whose last two taps are zero, corrected one step later.

The answer $C(x) = 1 + x^2 + x^3$ means $s_{t+3} = s_{t+1} + s_t$: the 3-cell
register with characteristic polynomial $x^3 + x + 1$ (the reverse of $C$) that
produced these bits from the start $1, 0, 1$. It was final after $2L = 6$ bits,
as Massey's theorem promises.

<figure class="mars-fig">
<svg viewBox="0 0 640 280" width="640" role="img" aria-label="Linear complexity profile of the sequence 1 0 1 1 1 0 0 1 under Berlekamp-Massey: the register length L rises from 1 to 2 to 3 at bits 0, 2 and 4 and then stays at 3; six of the eight bits produce a discrepancy and the last two do not" fill="currentColor" font-size="13">
<g stroke="currentColor" stroke-width="1.2" fill="none">
<path d="M70 50 L70 210 L600 210"/>
<path d="M66 170 L70 170"/>
<path d="M66 130 L70 130"/>
<path d="M66 90 L70 90"/>
<path d="M66 50 L70 50"/>
<path d="M70 203 L544 50" stroke-dasharray="4 4" stroke-opacity=".6"/>
<path d="M70 210 L79 210 L79 170 L141 170 L203 170 L203 130 L265 130 L327 130 L327 90 L389 90 L451 90 L513 90 L575 90" stroke-width="2.2"/>
</g>
<circle cx="110" cy="170" r="6"/>
<circle cx="172" cy="170" r="6"/>
<circle cx="234" cy="130" r="6"/>
<circle cx="296" cy="130" r="6"/>
<circle cx="358" cy="90" r="6"/>
<circle cx="420" cy="90" r="6"/>
<circle cx="482" cy="90" r="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<circle cx="544" cy="90" r="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<g text-anchor="middle">
<text x="56" y="215">0</text>
<text x="56" y="175">1</text>
<text x="56" y="135">2</text>
<text x="56" y="95">3</text>
<text x="56" y="55">4</text>
<text x="110" y="232">1</text>
<text x="110" y="252" font-size="12" fill-opacity=".7">n=0</text>
<text x="172" y="232">0</text>
<text x="172" y="252" font-size="12" fill-opacity=".7">n=1</text>
<text x="234" y="232">1</text>
<text x="234" y="252" font-size="12" fill-opacity=".7">n=2</text>
<text x="296" y="232">1</text>
<text x="296" y="252" font-size="12" fill-opacity=".7">n=3</text>
<text x="358" y="232">1</text>
<text x="358" y="252" font-size="12" fill-opacity=".7">n=4</text>
<text x="420" y="232">0</text>
<text x="420" y="252" font-size="12" fill-opacity=".7">n=5</text>
<text x="482" y="232">0</text>
<text x="482" y="252" font-size="12" fill-opacity=".7">n=6</text>
<text x="544" y="232">1</text>
<text x="544" y="252" font-size="12" fill-opacity=".7">n=7</text>
<text x="40" y="40" font-size="12">L</text>
<text x="30" y="232" font-size="12">s_n</text>
</g>
<text x="214" y="116" font-size="12">C(x) = 1 + x + x²</text>
<text x="300" y="76" font-size="12">C(x) = 1 + x² + x³</text>
<text x="514" y="42" font-size="12" fill-opacity=".7">bits read / 2</text>
<circle cx="380" cy="268" r="5"/><text x="390" y="272" font-size="12">discrepancy 1</text>
<circle cx="500" cy="268" r="5" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="510" y="272" font-size="12">discrepancy 0</text>
</svg>
<figcaption>Figure 9.4. The linear complexity profile of the trace. The register length L after each bit (the staircase) climbs at bits 0, 2 and 4, when a discrepancy arrives and 2L is not more than n, and stops at 3. Filled dots are steps with discrepancy 1, open dots steps with discrepancy 0. A random sequence's profile stays near the dashed line, half the bits read; a linear one flattens out.</figcaption>
</figure>

**The repair, and its limits.** Designers combined several LFSRs through a
nonlinear Boolean function, or filtered one register's state through such a
function, or clocked registers irregularly (A5/1 moves each register only when its
clock bit agrees with the majority). The linear complexity then becomes huge. But
other attacks appear: if the output agrees with one register more often than half
the time, that register can be attacked alone (Thomas Siegenthaler's correlation
attack, 1985). Chapter 10 measures such agreement with the Walsh-Hadamard
transform. And a filter of low degree can be undone by linear algebra again
(§9.10). A5/1 fell to time-memory trade-offs and correlation attacks (Alex
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
import random
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
<figcaption>Figure 9.5. The branch number of MixColumns. Shaded bytes are nonzero (a difference, in a differential attack). Whatever goes in, the nonzero bytes in and out add up to at least 5, the most possible for a 4-byte map.</figcaption>
</figure>

Joan Daemen and Vincent Rijmen's **wide trail strategy** combines this with
ShiftRows, which moves the four bytes of each column into four different columns.
Together they guarantee at least 25 active S-boxes in any four consecutive rounds
of AES. Each active S-box passes a difference with probability at most $2^{-6}$
(Chapter 10), so any four-round differential characteristic has probability at
most $2^{-150}$, far below what an attack on 128-bit blocks could use.

### The inverse matrix, and MixColumns as 32 × 32 bits

Decryption needs the inverse. Since $\mathrm{GF}(2^8)$ is a field, Gauss-Jordan on
$[M \mid I]$ works as over $\mathbb{F}_7$ in §9.2, with `gmul`, `ginv` and xor.
The answer is the circulant with first row $(14, 11, 13, 9)$, hexadecimal `0e 0b
0d 09`, the InvMixColumns of FIPS 197.

There is a short reason too. A circulant $4 \times 4$ matrix acts on a column
$(b_0, b_1, b_2, b_3)$ as multiplication of $b_0 + b_1 x + b_2 x^2 + b_3 x^3$ by a
polynomial modulo $x^4 + 1$; for MixColumns it is $a(x) = 3x^3 + x^2 + x + 2$. In
characteristic 2 the fourth power of a sum is the sum of fourth powers, so $a(x)^4
= 3^4 x^{12} + x^8 + x^4 + 2^4$, and modulo $x^4 + 1$ each $x^{4i}$ is 1, leaving
$(3 + 1 + 1 + 2)^4 = 1$. So $a^4 = 1$, and the inverse of MixColumns is
MixColumns applied three times.

Each byte is also 8 bits, and multiplying by a constant of $\mathrm{GF}(2^8)$ is
$\mathbb{F}_2$-linear (xtime and xor). So MixColumns is a $32 \times 32$ matrix
over $\mathbb{F}_2$. That is how hardware sees it, and how algebraic attacks see
it: a layer that is linear over $\mathbb{F}_2$ adds no monomials to the equations
of §9.10 and §9.11; only the S-box does.

```python
# Uses gmul(), ginv(), mix() and MC from the listings above.
def gmat_mul(A, B):
    out = []
    for row in A:
        new = []
        for col in zip(*B):
            v = 0
            for a, b in zip(row, col):
                v ^= gmul(a, b)
            new.append(v)
        out.append(new)
    return out

def ginverse(M):
    n = len(M)
    R = [row[:] + [int(i == j) for j in range(n)] for i, row in enumerate(M)]
    for c in range(n):
        pr = next(i for i in range(c, n) if R[i][c])
        R[c], R[pr] = R[pr], R[c]
        inv = ginv(R[c][c])
        R[c] = [gmul(x, inv) for x in R[c]]
        for i in range(n):
            if i != c and R[i][c]:
                f = R[i][c]
                R[i] = [a ^ gmul(f, b) for a, b in zip(R[i], R[c])]
    return [row[n:] for row in R]

I4 = [[int(i == j) for j in range(4)] for i in range(4)]
INV = ginverse(MC)
print(INV)
print(gmat_mul(MC, INV) == I4, gmat_mul(MC, gmat_mul(MC, MC)) == INV)

def binary_matrix(M):
    """The same map as a 32 x 32 matrix over F_2: column j is M times the j-th unit bit."""
    cols = []
    for j in range(32):
        unit = [[1 << (j % 8) if i == j // 8 else 0] for i in range(4)]
        out = [r[0] for r in gmat_mul(M, unit)]
        cols.append(sum(out[i] << (8 * i) for i in range(4)))
    return cols

for name, M in (("MixColumns", MC), ("InvMixColumns", INV)):
    print(name, "as bits: ones", sum(bin(c).count("1") for c in binary_matrix(M)))
col = [0xdb, 0x13, 0x53, 0x45]
back = gmat_mul(INV, [[x] for x in mix(col)])
print([hex(r[0]) for r in back])
```

It prints:

```text
[[14, 11, 13, 9], [9, 14, 11, 13], [13, 9, 14, 11], [11, 13, 9, 14]]
True True
MixColumns as bits: ones 184
InvMixColumns as bits: ones 472
['0xdb', '0x13', '0x53', '0x45']
```

Gauss-Jordan finds the published inverse, $M^3 = M^{-1}$, and the test vector
comes back. A row of the binary matrix with $w$ ones costs $w - 1$ xor gates, so
MixColumns costs at most $184 - 32 = 152$ two-input xors computed row by row, and
its inverse up to $472 - 32 = 440$: one reason the inverse cipher costs more in
small hardware and table-free software, and why involutory MDS matrices ($M =
M^{-1}$) appeal to lightweight designs. Sharing subexpressions does much better:
Alexander Maximov found a 92-xor circuit for MixColumns (2019), by searching for
short straight-line programs over $\mathbb{F}_2$, itself a hard problem.

## 9.9 Break it: linear ciphers

*Level: expert.*

Back to the rover's cipher of §9.1: $E(x) = Ax + b$ over $\mathbb{F}_2^{32}$,
with a secret invertible $A$ and offset $b$.

```python
# Why linear means broken: a 32-bit "cipher" that is affine over F_2.
import random

def invertible_gf2(rows):
    """Elimination over F_2 on rows packed into integers: True if the rank is full."""
    pivots = {}
    for v in rows:
        while v and (v.bit_length() - 1) in pivots:
            v ^= pivots[v.bit_length() - 1]
        if v == 0:
            return False
        pivots[v.bit_length() - 1] = v
    return True

n = 32
rng = random.Random(32)
while True:
    Akey = [[rng.randrange(2) for _ in range(n)] for _ in range(n)]
    if invertible_gf2([sum(bit << i for i, bit in enumerate(row)) for row in Akey]):
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
new unknown and solves a linear system (§9.10 and §9.11 do it in code); Nicolas
Courtois and Josef Pieprzyk's XSL proposal (2002) tried this on AES, and it does
not work: later analysis showed that the method produces far fewer independent
equations than it needs. The measure of how far an S-box is from every linear
function is the subject of Chapter 10.

**Fix it.** Put nonlinear S-boxes between the linear layers, and choose them to be
as far from linear as possible. Use enough rounds that every approximation's bias
vanishes below the data any attacker could collect.

## 9.10 Linearization: nonlinear equations as a linear system

*Level: expert.*

Section 9.9's fix was to put something nonlinear in the way. This section and the
next show how far linear algebra still reaches when the equations have low degree.

Every Boolean function is a polynomial over $\mathbb{F}_2$ (its algebraic normal
form, [Chapter 10](10-Boolean-Functions-and-S-Boxes.md)), so any cipher gives
polynomial equations in its key. Solving them is NP-hard in general, even for
quadratics (the "MQ" problem behind the multivariate signatures of the
[post-quantum book](../post-quantum/15-Multivariate-Signatures-and-the-On-Ramp.md)),
but a particular system may be easy. The first thing to try is
**linearization**: name every monomial as a new unknown and solve the linear
system by Gaussian elimination.

### Counting monomials

Over $\mathbb{F}_2$ every variable satisfies $x^2 = x$, so a monomial is a set of
distinct variables. The number of nonconstant monomials of degree at most $d$ in
$n$ variables is

$$D(n, d) = \sum_{i=1}^{d} \binom{n}{i}.$$

(Over a larger field, where $x^2 \ne x$, it is $\binom{n + d}{d} - 1$.)
Linearization needs about $D$ independent equations and about $D^3$ operations.
For $n = 128$, $D$ is 128, 8,256 and 349,632 for $d = 1, 2, 3$, and $1.5 \times
10^{12}$ for $d = 8$: **the degree decides.**

<figure class="mars-fig">
<svg viewBox="0 0 640 360" width="640" role="img" aria-label="Bar chart for 128 unknown bits: the number of monomials of degree at most d grows from 2 to the 7 at d = 1 to 2 to the 40.5 at d = 8, and the cost of Gaussian elimination on that many unknowns grows from 2 to the 21 to 2 to the 121, close to the 2 to the 128 of exhaustive search" fill="currentColor" font-size="13">
<g stroke="currentColor" fill="none" stroke-width="1.2"><path d="M70 300 L620 300"/>
<path d="M70 44 L620 44" stroke-dasharray="5 4"/></g>
<text x="74" y="38" text-anchor="start" font-size="12">exhaustive search of a 128-bit key: 2¹²⁸</text>
<text x="94" y="282.0" text-anchor="middle" font-size="11">7</text>
<text x="121" y="254.0" text-anchor="middle" font-size="11">21</text>
<text x="107" y="320" text-anchor="middle">d = 1</text>
<text x="160" y="270.0" text-anchor="middle" font-size="11">13</text>
<text x="187" y="217.9" text-anchor="middle" font-size="11">39</text>
<text x="173" y="320" text-anchor="middle">d = 2</text>
<text x="226" y="259.2" text-anchor="middle" font-size="11">18</text>
<text x="253" y="185.5" text-anchor="middle" font-size="11">55</text>
<text x="239" y="320" text-anchor="middle">d = 3</text>
<text x="292" y="249.2" text-anchor="middle" font-size="11">23</text>
<text x="319" y="155.6" text-anchor="middle" font-size="11">70</text>
<text x="305" y="320" text-anchor="middle">d = 4</text>
<text x="358" y="239.9" text-anchor="middle" font-size="11">28</text>
<text x="385" y="127.8" text-anchor="middle" font-size="11">84</text>
<text x="371" y="320" text-anchor="middle">d = 5</text>
<text x="424" y="231.2" text-anchor="middle" font-size="11">32</text>
<text x="451" y="101.6" text-anchor="middle" font-size="11">97</text>
<text x="437" y="320" text-anchor="middle">d = 6</text>
<text x="490" y="222.9" text-anchor="middle" font-size="11">37</text>
<text x="517" y="76.7" text-anchor="middle" font-size="11">110</text>
<text x="503" y="320" text-anchor="middle">d = 7</text>
<text x="556" y="215.0" text-anchor="middle" font-size="11">40</text>
<text x="583" y="53.1" text-anchor="middle" font-size="11">121</text>
<text x="569" y="320" text-anchor="middle">d = 8</text>
<rect x="90" y="332" width="14" height="12" fill-opacity=".35"/><text x="110" y="343" font-size="12">log₂ of the number of unknowns D</text>
<rect x="350" y="332" width="14" height="12" fill-opacity=".85"/><text x="370" y="343" font-size="12">log₂ of elimination cost D³</text>
<path d="M82 286.0h24v14.0h-24zM148 274.0h24v26.0h-24zM214 263.2h24v36.8h-24zM280 253.2h24v46.8h-24zM346 243.9h24v56.1h-24zM412 235.2h24v64.8h-24zM478 226.9h24v73.1h-24zM544 219.0h24v81.0h-24z" fill-opacity=".35"/>
<path d="M109 258.0h24v42.0h-24zM175 221.9h24v78.1h-24zM241 189.5h24v110.5h-24zM307 159.6h24v140.4h-24zM373 131.8h24v168.2h-24zM439 105.6h24v194.4h-24zM505 80.7h24v219.3h-24zM571 57.1h24v242.9h-24z" fill-opacity=".85"/>
</svg>
<figcaption>Figure 9.6. Linearization for 128 unknown bits. The number of monomials of degree at most d (light bars, log scale) grows like 128 to the d over d factorial, and Gaussian elimination on that many unknowns (dark bars) costs its cube. At degree 3 the attack costs about 2⁵⁵; at degree 8 it costs about 2¹²¹ and is no better than trying every key.</figcaption>
</figure>

### By hand: six equations, three unknowns

Over $\mathbb{F}_2$, three secret bits satisfy

$$
\begin{aligned}
x_1 + x_2 x_3 &= 1, & x_2 + x_1 x_3 &= 1, & x_3 + x_1 x_2 &= 1,\\
x_1 + x_1 x_2 + x_2 x_3 &= 0, & x_2 + x_3 + x_2 x_3 &= 1, & x_1 + x_2 + x_1 x_2 + x_1 x_3 &= 1.
\end{aligned}
$$

Rename $y = x_1 x_2$, $z = x_1 x_3$, $w = x_2 x_3$: six unknowns, six linear
equations,

$$x_1 + w = 1,\quad x_2 + z = 1,\quad x_3 + y = 1,\quad x_1 + y + w = 0,\quad x_2 + x_3 + w = 1,\quad x_1 + x_2 + y + z = 1.$$

The first gives $w = 1 + x_1$; the fourth becomes $x_1 + y + 1 + x_1 = 0$, so $y =
1$; the third gives $x_3 = 0$; the second $z = 1 + x_2$. The fifth becomes $x_2 +
0 + 1 + x_1 = 1$, so $x_2 = x_1$, and the sixth $x_1 + x_2 + 1 + 1 + x_2 = 1$, so
$x_1 = 1$. Then $x_2 = 1$, $w = 0$, $z = 0$: the answer is $(1, 1, 0)$.

Now the check linearization owes: the renamed unknowns must equal the products
they stand for. $y = x_1 x_2 = 1$, $z = x_1 x_3 = 0$, $w = x_2 x_3 = 0$. All three agree.
With too few equations, this check is what weeds out false solutions.

### Filter generators

The classic repair of a bare LFSR (§9.7) is the **nonlinear filter generator**: a
Boolean function $F$ of degree $d$ reads a few cells at each step and outputs one
keystream bit. By §9.6 every cell at time $t$ is a known
linear combination of the $L$ unknown start bits (a row of $M^t$), so each
keystream bit is a polynomial of degree at most $d$ in the start bits: one
equation in at most $D(L, d)$ monomials.

The toy has a 15-cell register with the primitive characteristic polynomial
$x^{15} + x + 1$ and a cubic filter on five cells, $F(a, b, c, d, e) = a + bd + be
+ cde$, so there are $15 + 105 + 455 = 575$ unknowns. A monomial is a bitmask
(so $x \cdot x = x$ is a bitwise OR), and the solver is the `rref` of §9.2 for $p =
2$ with each row packed into one integer, so a row operation is one xor.

```python
# Linearization: a nonlinear filter generator solved as a linear system over F_2.
import random

def solve_gf2(rows):
    """rref over F_2; a row is (mask, rhs), bit j of mask the coefficient of unknown j.
    Returns {pivot column: (mask, rhs)}, or None if inconsistent."""
    piv = {}
    for mask, rhs in rows:
        for c, (pm, pr) in piv.items():          # clear the known pivot columns
            if mask >> c & 1:
                mask, rhs = mask ^ pm, rhs ^ pr
        if mask == 0:
            if rhs:
                return None
            continue
        c = mask.bit_length() - 1                # a new pivot: clear it from the others
        for k, (pm, pr) in list(piv.items()):
            if pm >> c & 1:
                piv[k] = (pm ^ mask, pr ^ rhs)
        piv[c] = (mask, rhs)
    return piv

def mul(f, g):
    """Product of polynomials: sets of monomials, a monomial a bitmask of variables."""
    out = set()
    for a in f:
        for b in g:
            out ^= {a | b}
    return out

L, TAPS = 15, [0, 4, 7, 10, 14]          # register s[t+15] = s[t+1] + s[t]; filter inputs

def F(a, b, c, d, e):                    # the filter, degree 3
    return a ^ (b & d) ^ (b & e) ^ (c & d & e)

def linear(mask):                        # a cell, as a polynomial in the 15 start bits
    return {1 << i for i in range(L) if mask >> i & 1}

def run(key, n):
    """Keystream bits, and each bit as a polynomial in the unknown start bits."""
    cells, out = [1 << i for i in range(L)], []
    for _ in range(n):
        a, b, c, d, e = (linear(cells[i]) for i in TAPS)
        poly = a ^ mul(b, d) ^ mul(b, e) ^ mul(mul(c, d), e)
        bits = [bin(key & cells[i]).count("1") & 1 for i in TAPS]
        out.append((F(*bits), poly))
        cells = cells[1:] + [cells[0] ^ cells[1]]
    return out

key = random.Random(2026).getrandbits(L)      # the secret start state
col, rows = {}, []                             # one column per monomial
for z, poly in run(key, 700):
    mask, rhs = 0, z
    for mono in poly:
        if mono == 0:                          # the constant 1 moves to the right side
            rhs ^= 1
        else:
            mask |= 1 << col.setdefault(mono, len(col))
    rows.append((mask, rhs))
print("unknowns:", len(col))
print("equations", *(n for n in range(100, 701, 100)))
print("rank     ", *(len(solve_gf2(rows[:n])) for n in range(100, 701, 100)))

piv = solve_gf2(rows)
unit = {col[1 << i]: 1 << i for i in range(L)}            # columns of x_0 ... x_14
fixed = [c for c in unit if c in piv and piv[c][0] == 1 << c]  # rows reading "x_i = bit"
found = sum(unit[c] for c in fixed if piv[c][1])
print("start bits fixed:", len(fixed), "of", L, " state found:", found == key)
print("next 2,000 bits predicted:", [z for z, _ in run(found, 2000)] == [z for z, _ in run(key, 2000)])
```

It prints:

```text
unknowns: 575
equations 100 200 300 400 500 600 700
rank      100 200 300 400 500 540 540
start bits fixed: 15 of 15  state found: True
next 2,000 bits predicted: True
```

The rank stops at 540, short of 575, and more equations do not help. The
polynomial for bit $t + 1$ is the one for bit $t$ with the state replaced by $M$
times itself, so all keystream polynomials lie in one space, generated by the
first, that $p \mapsto p \circ M$ maps into itself; here it has dimension 540, and
that is also the length of a recurrence the keystream obeys: `berlekamp_massey`
from §9.7, run on 1,400 bits of it, reports linear complexity exactly 540. In general a filter of
degree $d$ gives linear complexity at most $D(L, d)$, a bound that goes back to
Edwin Key (1976) and Rainer Rueppel (1986). So a filter generator is, at worst,
an LFSR of length $D$; Berlekamp-Massey breaks it with $2D$ bits without knowing
$F$, and linearization, which uses $F$, needs about $D$. The deficit does not
matter anyway: the attacker needs only the 15 degree-1 unknowns, and each ended up
alone in its row.

A 128-bit register with a cubic filter gives 349,632 unknowns and about $2^{55}$
work (Figure 9.6). High degree is not enough either. Nicolas Courtois and Willi Meier (EUROCRYPT 2003) multiplied $F$ by a
low-degree $g$ with $gF = 0$, so every keystream bit 1 gives the low-degree equation
$g = 0$; the least degree reachable this way is the **algebraic immunity** of $F$.
That attack is told, with code, in *Cryptanalysis*
[§8.6](../cryptanalysis/08-Attacks-on-Stream-Ciphers.md#86-algebraic-attacks-and-algebraic-immunity).
In Courtois's **fast algebraic attacks** (CRYPTO 2003) the high-degree parts of
consecutive equations obey a fixed linear recurrence (by the argument above), which
Berlekamp-Massey can find; combining equations along it cancels those parts.

## 9.11 An algebraic attack on a toy block cipher

*Level: expert.*

In a block cipher every known plaintext-ciphertext pair gives fresh equations in
the *same* key. So equations are cheap, and the question is how many unknowns
linearization creates.

### The toy cipher

The block and the key are both 15 bits. One round takes the state $x$ and does
three things:

1. add a round key: $x \leftarrow x \oplus k_r$, where $k_r$ is the key rotated
   left by $5r$ places;
2. apply $\chi$, the nonlinear map of Keccak (the SHA-3 permutation of FIPS 202),
   on a ring of 15 bits: $y_i = x_i \oplus (\lnot x_{i+1}) \, x_{i+2}$, indices
   mod 15. It has degree 2, and Joan Daemen showed in his 1995 thesis that on a
   ring of odd length it is invertible;
3. apply the linear map $A$: $y \oplus \mathrm{rot}_3(y) \oplus \mathrm{rot}_8(y)$,
   which is invertible (its $15 \times 15$ matrix over $\mathbb{F}_2$ has
   rank 15).

After the last round the key, rotated once more, is added: a real SPN's shape,
shrunk.

### One round, by hand

With known plaintext $p$ and $x = p \oplus k$, bit $i$ of $\chi$ is

$$
\begin{aligned}
\chi_i &= (p_i + k_i) + (p_{i+1} + k_{i+1} + 1)(p_{i+2} + k_{i+2}) \\
&= \underbrace{p_i + (p_{i+1} + 1)\,p_{i+2}}_{\text{known}}
 + \underbrace{k_i + (p_{i+1} + 1)\,k_{i+2} + p_{i+2}\,k_{i+1}}_{\text{linear in the key}}
 + \underbrace{k_{i+1} k_{i+2}}_{\text{one product}} .
\end{aligned}
$$

Everything after $\chi$ is linear, so each ciphertext bit is a known constant plus
a combination of the 15 key bits and the 15 products $k_{i+1}k_{i+2}$: **30
unknowns**, 15 equations per pair. With $p_{i+1} = 1$, $p_{i+2} = 0$, bit $i$ is
$p_i + k_i + k_{i+1}k_{i+2}$; with $p_{i+1} = 0$, $p_{i+2} = 1$, it is $p_i + 1 +
k_i + k_{i+1} + k_{i+2} + k_{i+1}k_{i+2}$. The plaintext moves the linear terms
but never touches the products, so it takes several pairs before the system has
full rank.

### Code it: the whole attack

The listing builds the cipher twice, on bits (to make the known pairs) and on
polynomials (to make the equations), then linearizes and solves with `solve_gf2`
for one, two and three rounds.

```python
# Uses solve_gf2() and mul() from the listing above.
N = 15                                        # block and key size; chi needs N odd

def rot(v, r):
    return v[r:] + v[:r]

def round_fn(x, chi_and):
    """chi (Keccak's nonlinear map), then the linear mix A: y + rot3(y) + rot8(y)."""
    y = [x[i] ^ chi_and(x[(i + 1) % N], x[(i + 2) % N]) for i in range(N)]
    return [a ^ b ^ c for a, b, c in zip(y, rot(y, 3), rot(y, 8))]

def encrypt(k, p, rounds):
    s = p
    for r in range(rounds):                   # round key r is the key rotated by 5r
        s = round_fn([a ^ b for a, b in zip(s, rot(k, 5 * r))], lambda u, v: (u ^ 1) & v)
    return [a ^ b for a, b in zip(s, rot(k, 5 * rounds))]

def encrypt_symbolic(p, rounds):
    """The same cipher on polynomials: key bit i is the monomial 1 << i, 0 is the constant 1."""
    k = [{1 << i} for i in range(N)]
    s = [{0} if bit else set() for bit in p]
    for r in range(rounds):
        s = round_fn([a ^ b for a, b in zip(s, rot(k, 5 * r))], lambda u, v: mul(u ^ {0}, v))
    return [a ^ b for a, b in zip(s, rot(k, 5 * rounds))]

rng = random.Random(15)
key = [rng.randrange(2) for _ in range(N)]
for rounds, pairs in ((1, 6), (2, 40), (3, 3)):
    col, rows = {}, []
    for t in range(pairs):
        p = [rng.randrange(2) for _ in range(N)]
        for poly, c in zip(encrypt_symbolic(p, rounds), encrypt(key, p, rounds)):
            mask, rhs = 0, c
            for mono in poly:
                if mono == 0:
                    rhs ^= 1
                else:
                    mask |= 1 << col.setdefault(mono, len(col))
            rows.append((mask, rhs))
    piv = solve_gf2(rows)
    unit = [col.get(1 << i) for i in range(N)]
    got = [piv[c][1] if c in piv and piv[c][0] == 1 << c else None for c in unit]
    print(rounds, "round(s):", pairs, "pairs,", len(col), "unknowns, rank", len(piv),
          " key found:", got == key)
```

It prints:

```text
1 round(s): 6 pairs, 30 unknowns, rank 30  key found: True
2 round(s): 40 pairs, 360 unknowns, rank 270  key found: True
3 round(s): 3 pairs, 9542 unknowns, rank 45  key found: False
```

**One round** falls as the hand count said: 30 unknowns, rank 30 from six pairs.
**Two rounds** have degree 4 and $15 + 105 + 180 + 60 = 360$ monomials (fewer than
$D(15, 4) = 1{,}940$, because $\chi$ only multiplies neighbors); the rank stops at
270, the deficit of §9.10, and again the 15 key bits come out. **Three rounds**
have degree 8, and three pairs already contain 9,542 monomials of the $D(15, 8) =
22{,}818$ possible. Pinning them down needs more than 600 pairs and an elimination
on about $10^4$ unknowns, around $2^{40}$ operations, while trying every key takes
$2^{15}$. At three rounds linearization has lost to brute force.

### What real ciphers do

Each nonlinear layer multiplies the degree, and after a few rounds the linearized
system is larger than the key space. The AES S-box, inversion in
$\mathrm{GF}(2^8)$, has degree 7 in its 8 input bits, so explicit equations for
AES are dense at once.

The attacker's counter is to add unknowns instead of degree: name every
intermediate bit, and each S-box gives *implicit* low-degree equations. Inversion satisfies $x \cdot y = 1$ for $x \ne 0$,
which is bilinear, and the AES S-box satisfies 23 linearly independent quadratic
equations in its 16 input and output bits. Written this way, AES-128 is about
8,000 quadratic equations in about 1,600 unknowns (Nicolas Courtois and Josef
Pieprzyk, 2002). Plain linearization fails on it, with far more monomials than
independent equations; XL multiplies equations by monomials to make more, XSL
tried to use the sparsity, and Gröbner basis algorithms (F4, F5) do the same
elimination with better bookkeeping. All are Gaussian elimination on a matrix
whose columns are monomials (the Macaulay matrix), with a cost set by the degree
they must reach. How the XSL claim against AES came and went is told in
*Cryptanalysis*
[§7.5](../cryptanalysis/07-Algebraic-Integral-and-Structural-Attacks.md#75-algebraic-attacks-the-cipher-as-equations).

**Fix it.** Enough rounds that the ciphertext reaches close to full degree in the
key with a margin to spare, and S-boxes without unusually many low-degree implicit
equations; test the claims on small versions (the small-scale AES variants of
Carlos Cid, Sean Murphy and Matthew Robshaw, 2005, exist for exactly this).

## 9.12 Sparse systems: Wiedemann and block Lanczos

*Level: expert.*

Section 9.3 ended with the last step of factoring by the quadratic or number
field sieve: a kernel vector over $\mathbb{F}_2$ of the matrix of exponent
parities. For a record that matrix has hundreds of millions of rows, and Gaussian
elimination is the wrong tool, for a reason the small examples hid: the matrix is
almost empty, and elimination fills it in.

### A factor-base matrix

The sieves themselves belong to *Cryptanalysis*
([§11.7](../cryptanalysis/11-Factoring.md#117-congruent-squares-and-the-quadratic-sieve-by-hand)
to [§11.9](../cryptanalysis/11-Factoring.md#119-the-number-field-sieve)); here
only the matrix matters. Take $N = 9973 \cdot 12011 = 119{,}785{,}703$ and look at
$Q(a) = a^2 - N$ for $a$ near $\sqrt N \approx 10{,}944.7$. A value is kept, as a
**relation**, when it factors completely over a **factor base** of small primes.
An odd prime can divide $a^2 - N$ only if $N$ is a square mod $p$, so the base is
$-1$, 2 and the odd primes below 200 with $(N/p) = 1$
([Chapter 5](05-Square-Roots-Mod-p.md)): 21 entries.

**By hand**, one relation: $10947^2 - 119{,}785{,}703 = 119{,}836{,}809 -
119{,}785{,}703 = 51{,}106 = 2 \cdot 11 \cdot 23 \cdot 101$. All four primes are in
the base, each to the first power, so this row has 1s in the columns for 2, 11, 23
and 101 and 0s in the other 17. A product of relations is a square exactly when
their rows add to zero over $\mathbb{F}_2$: a kernel vector of the transposed
matrix.

```python
# A factor-base matrix, as the quadratic sieve makes it.
from math import isqrt, gcd
import random

N = 9973 * 12011                              # 119785703
primes = [p for p in range(2, 200) if all(p % d for d in range(2, p))]
base = [-1] + [p for p in primes if p == 2 or pow(N, (p - 1) // 2, p) == 1]

def exponents(q):
    """Exponent vector of q over the factor base, or None if q is not smooth."""
    e = [0] * len(base)
    if q < 0:
        e[0], q = 1, -q
    for k, p in enumerate(base[1:], 1):
        while q % p == 0:
            q, e[k] = q // p, e[k] + 1
    return e if q == 1 else None

rels, r0 = [], isqrt(N)
for d in range(1, 40000):
    for a in (r0 + d, r0 - d + 1):
        e = exponents(a * a - N)
        if e and len(rels) < len(base) + 4:
            rels.append((a, e))
rows = [[k for k, x in enumerate(e) if x % 2] for _, e in rels]   # odd exponents only
print("base:", base)
print(len(rels), "relations; the first: a =", rels[0][0], " a^2 - N =", rels[0][0] ** 2 - N)
print("matrix", len(rows), "x", len(base), "with", sum(map(len, rows)), "ones")
```

It prints:

```text
base: [-1, 2, 7, 11, 23, 37, 41, 43, 59, 61, 67, 73, 89, 101, 113, 131, 149, 151, 163, 173, 179]
25 relations; the first: a = 10947  a^2 - N = 51106
matrix 25 x 21 with 102 ones
```

<figure class="mars-fig">
<svg viewBox="0 0 640 355" width="640" role="img" aria-label="The 25 by 21 relation matrix over F_2 for N = 119785703: each row is a relation, each column a prime of the factor base, and a dot marks an odd exponent; 102 of the 525 entries are 1, and the columns for -1 and 2 are much fuller than the rest" fill="currentColor" font-size="13">
<rect x="66" y="36" width="239" height="283" fill="none" stroke="currentColor" stroke-width="1"/>
<path d="M82 41h9v9h-9zM104 41h9v9h-9zM115 41h9v9h-9zM214 41h9v9h-9zM71 52h9v9h-9zM82 52h9v9h-9zM93 52h9v9h-9zM236 52h9v9h-9zM269 52h9v9h-9zM71 63h9v9h-9zM82 63h9v9h-9zM104 63h9v9h-9zM225 63h9v9h-9zM280 63h9v9h-9zM82 74h9v9h-9zM159 74h9v9h-9zM181 74h9v9h-9zM192 74h9v9h-9zM93 85h9v9h-9zM115 85h9v9h-9zM71 96h9v9h-9zM82 96h9v9h-9zM126 96h9v9h-9zM170 96h9v9h-9zM269 96h9v9h-9zM71 107h9v9h-9zM181 107h9v9h-9zM203 107h9v9h-9zM247 107h9v9h-9zM82 118h9v9h-9zM93 118h9v9h-9zM115 118h9v9h-9zM126 118h9v9h-9zM203 118h9v9h-9zM71 129h9v9h-9zM82 129h9v9h-9zM291 129h9v9h-9zM71 140h9v9h-9zM82 140h9v9h-9zM93 140h9v9h-9zM137 140h9v9h-9zM93 151h9v9h-9zM291 151h9v9h-9zM71 162h9v9h-9zM82 162h9v9h-9zM104 162h9v9h-9zM126 162h9v9h-9zM148 162h9v9h-9zM181 162h9v9h-9zM71 173h9v9h-9zM82 173h9v9h-9zM203 173h9v9h-9zM236 173h9v9h-9zM71 184h9v9h-9zM93 184h9v9h-9zM137 184h9v9h-9zM203 184h9v9h-9zM225 184h9v9h-9zM71 195h9v9h-9zM104 195h9v9h-9zM126 195h9v9h-9zM159 195h9v9h-9zM236 195h9v9h-9zM170 206h9v9h-9zM225 206h9v9h-9zM71 217h9v9h-9zM82 217h9v9h-9zM104 217h9v9h-9zM126 217h9v9h-9zM137 217h9v9h-9zM225 217h9v9h-9zM93 228h9v9h-9zM159 228h9v9h-9zM192 228h9v9h-9zM247 228h9v9h-9zM82 239h9v9h-9zM104 239h9v9h-9zM126 239h9v9h-9zM159 239h9v9h-9zM71 250h9v9h-9zM82 250h9v9h-9zM104 250h9v9h-9zM71 261h9v9h-9zM82 261h9v9h-9zM93 261h9v9h-9zM203 261h9v9h-9zM82 272h9v9h-9zM104 272h9v9h-9zM181 272h9v9h-9zM214 272h9v9h-9zM71 283h9v9h-9zM104 283h9v9h-9zM170 283h9v9h-9zM192 283h9v9h-9zM247 283h9v9h-9zM71 294h9v9h-9zM82 294h9v9h-9zM258 294h9v9h-9zM71 305h9v9h-9zM82 305h9v9h-9zM148 305h9v9h-9zM280 305h9v9h-9z"/>
<text x="75" y="30" text-anchor="middle" font-size="11">−1</text>
<text x="86" y="30" text-anchor="middle" font-size="11">2</text>
<text x="295" y="30" text-anchor="middle" font-size="11">179</text>
<text x="185" y="339" text-anchor="middle" font-size="12">primes of the factor base</text>
<text x="341" y="60">25 relations a² − N, 21 primes</text>
<text x="341" y="82">102 ones of 525: 19 percent</text>
<text x="341" y="126">Columns −1 and 2 are dense; the</text>
<text x="341" y="148">large primes divide few values.</text>
<text x="341" y="192">RSA-250 (2020), after filtering:</text>
<text x="341" y="214">about 405 million rows,</text>
<text x="341" y="236">about 252 ones per row:</text>
<text x="341" y="258">fewer than 1 entry in a million.</text>
</svg>
<figcaption>Figure 9.7. The relation matrix over F₂ for N = 119,785,703: one row per relation, one column per prime of the factor base, a square where the prime divides the value to an odd power. Even at this size four entries in five are zero, and the zeros are concentrated in the columns of the large primes. Record matrices have the same shape, with far fewer than one entry in a million nonzero.</figcaption>
</figure>

### Why not elimination

Elimination clears a column by adding the pivot row to every row with a 1 there.
A sum of two sparse rows has about as many 1s as both together, so each step makes
the remaining rows denser: **fill-in**. Soon the uneliminated part is dense, and
the algorithm needs $n^2$ bits and about $n^3/3$ operations, as if the matrix had
been dense from the start.

So the work has two stages. **Structured Gaussian elimination** (Brian LaMacchia
and Andrew Odlyzko, 1990), called filtering or merging in factoring software, drops
columns with a single 1 and eliminates columns with two or three 1s, shrinking the
matrix while the density grows slowly. Then an **iterative method** finishes: it
only multiplies the fixed matrix by vectors, so each step costs the number of
nonzero entries.

### Wiedemann's method: the kernel from a recurrence

Douglas Wiedemann (1986) turned the kernel problem into the problem of §9.7. Let
$B$ be an $n \times n$ matrix over a finite field and $f(x) = \sum_j f_j x^j$ its
minimal polynomial, the monic polynomial of least degree with $f(B) = 0$. For any
vectors $u$ and $v$, the sequence

$$a_i = u^{\mathsf T} B^i v, \qquad i = 0, 1, 2, \dots$$

satisfies $\sum_j f_j a_{i+j} = u^{\mathsf T} B^i f(B) v = 0$: it is an LFSR
sequence over the field, of linear complexity at most $n$. Berlekamp-Massey on
$2n$ terms finds its shortest recurrence, which for random $u$ and $v$ is, with
reasonable probability, the minimal polynomial of $B$ acting on $v$.

If $B$ is singular, $f(x) = x^r g(x)$ with $g(0) \ne 0$, and $B^r g(B) v = 0$.
Compute $y = g(B) v$ by Horner's rule; if $y \ne 0$, multiply by $B$ until the
result is zero, and the last nonzero vector of $y, By, B^2y, \dots$ is in the
kernel. That is about $3n$ products in all, each one pass over the nonzero
entries. Here $B$ is the transposed relation matrix (primes by relations), padded
with zero rows to $25 \times 25$, so its kernel vectors choose relations.

```python
# Uses rels, rows, base and N from the listing above.
# berlekamp_massey() is the one from section 9.7, repeated so that this listing runs on its own.
def berlekamp_massey(s):
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

n = len(rows)                                # unknowns: one per relation
cols = [[i for i, r in enumerate(rows) if k in r] for k in range(len(base))]
cols += [[] for _ in range(n - len(cols))]   # pad B (base x relations) to n x n
products = 0

def apply(v):                                # B v over F_2; v is an int bitmask
    global products
    products += 1
    out = 0
    for k, c in enumerate(cols):
        out |= (sum(v >> i & 1 for i in c) & 1) << k
    return out

def dot(u, v):
    return bin(u & v).count("1") & 1

def wiedemann(rng):
    """One try of Wiedemann's method: a kernel vector of B, or None."""
    u, v = rng.getrandbits(n), rng.getrandbits(n)
    seq, x = [], v
    for _ in range(2 * n):                   # a_i = u . B^i v, an LFSR sequence
        seq.append(dot(u, x))
        x = apply(x)
    L, c = berlekamp_massey(seq)             # f(x) = x^L + c1 x^(L-1) + ... + cL
    f = [1] + c
    r = 0
    while r < L and f[L - r] == 0:           # f(x) = x^r g(x) with g(0) = 1
        r += 1
    y = 0
    for coef in f[:L + 1 - r]:               # Horner: y = g(B) v
        y = apply(y) ^ (v if coef else 0)
    for _ in range(r + 1):                   # B^r y = 0 if f was right
        z = apply(y)
        if z == 0:
            return y or None                 # the last nonzero vector is in the kernel
        y = z
    return None

rng = random.Random(250)
tries = 0
while True:
    tries += 1
    w = wiedemann(rng)
    if w:
        break
chosen = [i for i in range(n) if w >> i & 1]
print("tries:", tries, " matrix-vector products:", products)
print("relations chosen:", chosen)
X, Q = 1, 1
for i in chosen:
    a = rels[i][0]
    X, Q = X * a % N, Q * (a * a - N)
Y = isqrt(Q)
print("product is a square:", Y * Y == Q, " gcds:", gcd(X - Y, N), gcd(X + Y, N))
```

It prints:

```text
tries: 7  matrix-vector products: 462
relations chosen: [1, 4, 5, 7, 8, 9, 10, 13, 14, 15, 18]
product is a square: True  gcds: 12011 9973
```

Eleven relations multiply to a square, and $\gcd(X \pm Y, N)$ gives both primes.
Notice the seven tries: each $a_i$ is one bit, and the bit sequence often obeys a
shorter recurrence than the matrix, so the scalar method fails often. At this size
its 462 products also cost more than elimination; it pays off only when $n$ is
huge and rows are short.

### Block Wiedemann and block Lanczos

Don Coppersmith's **block Wiedemann** (1994) uses 64 vectors at once: $u$ and $v$
become $n \times 64$ matrices, one pass over $B$ handles all 64 with 64-bit words,
the $a_i$ become $64 \times 64$ matrices, and a matrix Berlekamp-Massey finds
their recurrence. Failures all but vanish, and the first stage splits into
independent pieces for separate clusters.

Peter Montgomery's **block Lanczos** (1995) adapts Cornelius Lanczos's method
(1950), which for a symmetric matrix $A$ builds an $A$-orthogonal basis of the
space spanned by $v, Av, A^2v, \dots$ with a three-term recurrence, storing only a
few vectors. Over $\mathbb{F}_2$ the scalar method breaks down: a nonzero $w$ can
have $w^{\mathsf T} A w = 0$ (about half the time), and the algorithm divides by
that quantity. Montgomery works with 64-dimensional subspaces instead, keeping at
each step the directions that make the needed $64 \times 64$ matrix invertible.
With $A = B^{\mathsf T} B$ it takes about $n/63$
iterations, each one product by $B$ and one by $B^{\mathsf T}$. Msieve uses block
Lanczos; block Wiedemann, easier to spread across sites, is the method of CADO-NFS
and the recent records.

### The numbers at RSA-250's size

RSA-250 (829 bits) was factored on 28 February 2020 by Boudot, Gaudry, Guillevic,
Heninger, Thomé and Zimmermann with CADO-NFS, in about 2,700 core-years. After filtering, the matrix had about 405
million rows with an average of about 252 nonzero entries per row, some 100
billion in all, and block Wiedemann took about 250 of the core-years. The listing
measures fill-in on a small matrix, then compares the methods at that size.

```python
# Fill-in on a random sparse matrix, then dense against sparse at RSA-250's size.
import random

rng = random.Random(9)
n, w = 400, 5
rows = [sum(1 << rng.randrange(n) for _ in range(w)) for _ in range(n)]
print("ones before elimination:", sum(bin(x).count("1") for x in rows))
r = 0
for c in range(n):
    pr = next((i for i in range(r, n) if rows[i] >> c & 1), None)
    if pr is None:
        continue
    rows[r], rows[pr] = rows[pr], rows[r]
    rows = [x ^ rows[r] if i > r and x >> c & 1 else x for i, x in enumerate(rows)]
    r += 1
print("ones after:", sum(bin(x).count("1") for x in rows))

n, w = 405_000_000, 252          # the RSA-250 matrix after filtering (2020)
print("dense storage:  %.1f petabytes" % (n * n / 8 / 1e15))
print("sparse storage: %.0f gigabytes" % (n * w * 4 / 1e9))   # a 4-byte index per entry
dense = n ** 3 / 3               # bit operations, Gaussian elimination
wied = 3 * n * (n * w)           # about 3n products of n * w entries each
print("elimination %.1e, Wiedemann %.1e bit operations, ratio %.0f" % (dense, wied, dense / wied))
```

It prints:

```text
ones before elimination: 1993
ones after: 11970
dense storage:  20.5 petabytes
sparse storage: 408 gigabytes
elimination 2.2e+25, Wiedemann 1.2e+20 bit operations, ratio 178571
```

A $400 \times 400$ matrix with five 1s per row ends elimination with six times as
many 1s; at 405 million rows the fill-in is total. Dense storage would take about
20 petabytes against about 400 gigabytes sparse, and elimination about 180,000
times the bit operations of Wiedemann's method; scaling the real 250 core-years by
that ratio gives tens of millions of core-years.

## 9.13 In the real world and going deeper

*Level: expert.*

**The linear algebra of record computations.** The last stage of the number field
sieve solves a huge sparse system: over $\mathbb{F}_2$ for factoring, as in §9.12,
and over $\mathbb{Z}/q\mathbb{Z}$ for discrete logarithms in prime fields, where
$q$ is the large prime dividing $p - 1$ and the same block Wiedemann method runs
with arithmetic mod $q$ instead of xor
([*Cryptanalysis* §12.7](../cryptanalysis/12-Discrete-Logarithms.md#127-the-number-field-sieve-and-the-records)).
Block Wiedemann finds the kernel through the minimal polynomial of a matrix
sequence, found with a matrix version of Berlekamp-Massey: this chapter's two
halves in one algorithm.

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

??? question "3. How many invertible $3 \times 3$ matrices are there over $\mathbb{F}_2$?"

    $(8 - 1)(8 - 2)(8 - 4) = 7 \cdot 6 \cdot 4 = 168$.

??? question "4. An LFSR has characteristic polynomial $x^3 + x + 1$. What is the period of its output from a nonzero start?"

    $x^3 + x + 1$ is primitive over $\mathbb{F}_2$ ($x$ has order 7 = $2^3 - 1$),
    so the period is 7.

??? question "5. Three known Hill blocks form a matrix $P$ with $\det P \equiv 13 \pmod{26}$. Over which field is $P$ singular, and what does the attacker do?"

    Over $\mathbb{F}_{13}$; the determinant is odd, so mod 2 $P$ is invertible. Mod 13 each key
    row is known only up to the kernel of $P^{\mathsf T}$ (13 candidates per row
    if the rank is 2). One more block not orthogonal to that kernel settles it;
    the Chinese remainder theorem joins the halves.

??? question "6. In a Berlekamp-Massey run over $\mathbb{F}_2$, step $n = 5$ has discrepancy 1 and the current length is $L = 3$. Does the length change? What does $C(x)$ become?"

    $2L = 6 > 5$, so $L$ stays 3, and $C(x) \leftarrow C(x) + x^m B(x)$, with $B$
    the polynomial from before the last length change and $m$ the steps since.

??? question "7. What is the largest possible branch number of a linear map on 8 bytes, and what kind of matrix achieves it?"

    $8 + 1 = 9$, achieved by an $8 \times 8$ MDS matrix (every square submatrix
    invertible).

??? question "8. A filter generator has a 40-cell register and a filter of degree 2. How many unknowns does linearization have, and roughly how much keystream does it need?"

    $D(40, 2) = 40 + 780 = 820$ unknowns, so a little over 820 keystream bits and
    about $820^3 \approx 2^{29}$ operations. Berlekamp-Massey alone would also
    work, with about 1,640 bits.

??? question "9. A cipher is affine over $\mathbb{F}_2^{64}$. How many chosen plaintexts recover its key?"

    65: the zero block for the offset, and the 64 unit vectors for the columns of
    the matrix.

??? question "10. Why do factoring records solve their matrix with block Wiedemann instead of Gaussian elimination?"

    The matrix is huge (about 405 million rows for RSA-250) and sparse (about 252
    nonzeros per row). Elimination fills it in: about 20 petabytes and $2 \times
    10^{25}$ bit operations. Wiedemann's method makes about $3n$ products with the
    fixed sparse matrix, each about $10^{11}$ operations, and splits across
    machines.

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
- Berlekamp-Massey adds $x^m B(x)$ at each discrepancy and lengthens the register
  only when $2L \le n$.
- A Hill system mod 26 splits into systems over $\mathbb{F}_2$ and
  $\mathbb{F}_{13}$; the rank in each counts the keys left.
- MDS matrices have the largest branch number; AES MixColumns is MDS, and the wide
  trail strategy turns that into a bound on differential and linear attacks. Its
  inverse is $M^3$.
- Linearization makes each of $D = \sum_{i \le d} \binom{n}{i}$ monomials an
  unknown; the degree decides its cost.
- Factoring matrices are solved by multiplying the sparse matrix by vectors:
  Wiedemann (via Berlekamp-Massey) and block Lanczos.

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
- Elwyn Berlekamp, *Algebraic Coding Theory* (McGraw-Hill, 1968).
- Douglas Wiedemann, "Solving Sparse Linear Equations over Finite Fields",
  *IEEE Transactions on Information Theory* 32 (1986).
- Peter Montgomery, "A Block Lanczos Algorithm for Finding Dependencies over
  GF(2)", EUROCRYPT 1995.
- Brian LaMacchia and Andrew Odlyzko, "Solving Large Sparse Linear Systems over
  Finite Fields", CRYPTO 1990.
- Fabrice Boudot, Pierrick Gaudry, Aurore Guillevic, Nadia Heninger, Emmanuel
  Thomé and Paul Zimmermann, "Comparing the Difficulty of Factorization and
  Discrete Logarithm: a 240-Digit Experiment", CRYPTO 2020, and their RSA-250
  announcement (28 February 2020).
- Nicolas Courtois and Josef Pieprzyk, "Cryptanalysis of Block Ciphers with
  Overdefined Systems of Equations", ASIACRYPT 2002.
- Nicolas Courtois and Willi Meier, "Algebraic Attacks on Stream Ciphers with
  Linear Feedback", EUROCRYPT 2003; Nicolas Courtois, "Fast Algebraic Attacks on
  Stream Ciphers with Linear Feedback", CRYPTO 2003.
- Carlos Cid, Sean Murphy and Matthew Robshaw, "Small Scale Variants of the AES",
  FSE 2005.
- Joan Daemen, *Cipher and Hash Function Design*, PhD thesis, KU Leuven (1995),
  which analyzes $\chi$ and shows it invertible on rings of odd length.
- Alexander Maximov, "AES MixColumn with 92 XOR Gates", IACR ePrint 2019/833.
- FIPS 197, *Advanced Encryption Standard* (2001, updated 2023), for MixColumns
  and InvMixColumns; FIPS 202 (SHA-3, 2015) for $\chi$.
- In *The cryptography book*: [Chapter 2](../../book/02-Classical-Ciphers.md),
  [Chapter 5](../../book/05-Stream-Ciphers.md) and
  [Chapter 7](../../book/07-AES.md).
