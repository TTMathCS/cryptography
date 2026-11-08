# 14. Lattices

*A lattice is a grid of points in space, as regular as the corners of graph paper,
but tilted and stretched. Given a few vectors, it is every point you can reach by
adding and subtracting whole copies of them. Lattices are easy to define, easy to
draw in two dimensions, and very hard to search in five hundred. That difficulty
carries the post-quantum standards ML-KEM and ML-DSA, and the same geometry, used
the other way, breaks knapsack ciphers, leaky ECDSA signatures and RSA with small
exponents or partly known keys. This chapter is the book's lattice reference. It
builds lattices from the ground up: bases, volume, Gram-Schmidt, Minkowski's
theorem, the shortest and closest vector problems, Gauss's algorithm in the plane,
LLL in full with exact arithmetic and a proof of what it guarantees, Babai's
algorithms for the closest vector, BKZ in outline, and the break of the
Merkle-Hellman knapsack.*

!!! abstract "In this chapter"
    **You will learn:**

    - lattices, bases, unimodular matrices, and when two bases give the same
      lattice;
    - the fundamental domain and the determinant (volume) of a lattice;
    - Gram-Schmidt orthogonalization and why it measures the quality of a basis;
    - Minkowski's theorem, successive minima, the Hermite constant and the
      Gaussian heuristic;
    - the shortest and closest vector problems and their approximate versions;
    - Gauss-Lagrange reduction, by hand, with a proof that it finds a shortest vector;
    - the LLL algorithm, with full code, a proof of its guarantee and its behavior in
      practice;
    - Babai's rounding and nearest-plane methods, and the GGH cryptosystem;
    - BKZ, enumeration and sieving, in outline;
    - the low-density attack that breaks the Merkle-Hellman knapsack.

    **You need:** [Chapter 9](09-Linear-Algebra.md) (vectors, matrices, determinants,
    elimination) and [Chapter 2](02-Divisibility-Primes-and-Factoring.md)
    (the Euclidean algorithm, which Gauss-Lagrange reduction generalizes).

    **Levels:** §14.1 to §14.4 are for beginners, §14.5 to §14.8 are intermediate,
    §14.9 to §14.11 are expert.

## 14.1 The problem

*Level: beginner.*

Here is a puzzle. Take the vectors $b_1 = (13, 13)$ and $b_2 = (18, 19)$. Which
nonzero point of the form $x b_1 + y b_2$, with whole numbers $x$ and $y$, is
closest to the origin?

The vectors themselves have lengths about 18.4 and 26.2, and their combinations
can be much shorter: $(18, 19) - (13, 13) = (5, 6)$ has length about 7.8. The
shortest of all turns out to be $(3, 1) = 3 b_1 - 2 b_2$ (or its negative), of length
$\sqrt{10} \approx 3.16$, but that is not obvious from the numbers. In two
dimensions, a few steps of a Euclid-like algorithm always solve the puzzle (§14.7).
In 500 dimensions, nobody knows how to solve it in fewer than about $2^{0.29 \cdot 500}$
steps, and in a sense made precise below, that is what keeps ML-KEM secure.

## 14.2 Lattices and bases

*Level: beginner.*

Let $b_1, \ldots, b_n$ be linearly independent vectors in $\mathbb{R}^m$. The
**lattice** they generate is

$$
L(b_1, \ldots, b_n) = \{\, x_1 b_1 + \cdots + x_n b_n : x_i \in \mathbb{Z} \,\}.
$$

The vectors form a **basis**, $n$ is the **rank** (or dimension) of the lattice, and
we write the basis as an $n \times m$ matrix $B$ whose rows are the $b_i$. Then the
lattice is $\{xB : x \in \mathbb{Z}^n\}$. Most of this chapter takes $n = m$ (full
rank) and integer entries.

Examples:

- $\mathbb{Z}^n$ itself, with the standard basis.
- The **$q$-ary lattices** of post-quantum cryptography: for a matrix $A$ with
  entries modulo $q$, the set of integer vectors $(y, yA \bmod q)$, or the set of $x$
  with $xA \equiv 0 \pmod q$. Every vector with all entries divisible by $q$ lies in
  them, so they are full-rank lattices that contain $q\mathbb{Z}^m$.

A lattice has many bases. If $U$ is an $n \times n$ integer matrix with
$\det U = \pm 1$ (a **unimodular** matrix), then $U^{-1}$ is also an integer matrix
(its entries are cofactors divided by $\det U = \pm 1$), so $UB$ and $B$ generate
the same lattice: every row of $UB$ is an integer combination of rows of $B$ and vice
versa. Conversely, any two bases of the same lattice differ by a unimodular matrix.

### By hand

Take the **good** basis $b_1 = (3, 1)$, $b_2 = (-1, 4)$ and the unimodular
$U = \begin{pmatrix} 5 & 2 \\ 7 & 3 \end{pmatrix}$, $\det U = 15 - 14 = 1$. Then

$$
UB = \begin{pmatrix} 5 \cdot 3 + 2 \cdot (-1) & 5 \cdot 1 + 2 \cdot 4 \\ 7 \cdot 3 + 3
\cdot (-1) & 7 \cdot 1 + 3 \cdot 4 \end{pmatrix} = \begin{pmatrix} 13 & 13 \\ 18 & 19
\end{pmatrix},
$$

the **bad** basis of §14.1. Both have determinant $3 \cdot 4 - 1 \cdot (-1) = 13$
and $13 \cdot 19 - 13 \cdot 18 = 13$.

```python
# A lattice is all integer combinations of the rows of a basis matrix.  Two bases give the
# same lattice exactly when one is a unimodular matrix (integer entries, det +-1) times the other.
from fractions import Fraction
from itertools import product

def det(M):
    """Determinant by fraction-exact Gaussian elimination."""
    A = [[Fraction(x) for x in row] for row in M]
    n, d = len(A), Fraction(1)
    for i in range(n):
        piv = next((r for r in range(i, n) if A[r][i] != 0), None)
        if piv is None:
            return Fraction(0)
        if piv != i:
            A[i], A[piv], d = A[piv], A[i], -d
        d *= A[i][i]
        for r in range(i + 1, n):
            f = A[r][i] / A[i][i]
            A[r] = [x - f * y for x, y in zip(A[r], A[i])]
    return d

def matmul(A, B):
    return [[sum(a * b for a, b in zip(row, col)) for col in zip(*B)] for row in A]

good = [[3, 1], [-1, 4]]
U = [[5, 2], [7, 3]]                          # det U = 15 - 14 = 1
bad = matmul(U, good)
print(bad, det(good), det(bad), det(U))
```

```text
[[13, 13], [18, 19]] 13 13 1
```

## 14.3 The fundamental domain and the determinant

*Level: beginner.*

The **fundamental parallelepiped** of a basis is

$$
\mathcal{P}(B) = \{\, t_1 b_1 + \cdots + t_n b_n : 0 \le t_i < 1 \,\}.
$$

Translating it by every lattice vector tiles space without gaps or overlaps: every
point $v$ of $\mathbb{R}^n$ is uniquely a lattice point plus a point of
$\mathcal{P}(B)$ (write $v$ in the basis and split each coefficient into its integer
part and fractional part). So the volume of $\mathcal{P}(B)$ is the "space per lattice
point", which cannot depend on the basis. It is the **determinant** (or covolume) of
the lattice:

$$
\det L = |\det B| \quad\text{(full rank)}, \qquad \det L = \sqrt{\det(B B^{T})}
\quad\text{(in general)}.
$$

Changing basis by $U$ multiplies $\det B$ by $\det U = \pm 1$, so the two formulas
agree for every basis. The good and the bad basis above have the same determinant 13,
but their parallelograms look completely different (Figure 14.1).

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="The lattice generated by (3, 1) and (-1, 4), with two fundamental parallelograms of area 13: a nearly square one from the good basis and a long thin one from the bad basis (13, 13), (18, 19)" fill="currentColor" font-size="13">
<g stroke="currentColor" stroke-width="1" opacity=".35"><line x1="139.0" y1="300.0" x2="496.0" y2="300.0"/><line x1="190.0" y1="325.5" x2="190.0" y2="11.0"/></g>
<path class="soft-acc" fill="currentColor" fill-opacity=".18" stroke="currentColor" stroke-width="1.5" d="M190.0 300.0 L300.5 189.5 L453.5 28.0 L343.0 138.5 Z"/>
<path class="acc acc-fill" fill-opacity=".45" stroke="currentColor" stroke-width="2" d="M190.0 300.0 L215.5 291.5 L207.0 257.5 L181.5 266.0 Z"/>
<circle cx="139.0" cy="317.0" r="2.6"/>
<circle cx="164.5" cy="308.5" r="2.6"/>
<circle cx="156.0" cy="274.5" r="2.6"/>
<circle cx="147.5" cy="240.5" r="2.6"/>
<circle cx="139.0" cy="206.5" r="2.6"/>
<circle cx="190.0" cy="300.0" r="2.6"/>
<circle cx="181.5" cy="266.0" r="2.6"/>
<circle cx="173.0" cy="232.0" r="2.6"/>
<circle cx="164.5" cy="198.0" r="2.6"/>
<circle cx="156.0" cy="164.0" r="2.6"/>
<circle cx="147.5" cy="130.0" r="2.6"/>
<circle cx="139.0" cy="96.0" r="2.6"/>
<circle cx="224.0" cy="325.5" r="2.6"/>
<circle cx="215.5" cy="291.5" r="2.6"/>
<circle cx="207.0" cy="257.5" r="2.6"/>
<circle cx="198.5" cy="223.5" r="2.6"/>
<circle cx="190.0" cy="189.5" r="2.6"/>
<circle cx="181.5" cy="155.5" r="2.6"/>
<circle cx="173.0" cy="121.5" r="2.6"/>
<circle cx="164.5" cy="87.5" r="2.6"/>
<circle cx="156.0" cy="53.5" r="2.6"/>
<circle cx="147.5" cy="19.5" r="2.6"/>
<circle cx="249.5" cy="317.0" r="2.6"/>
<circle cx="241.0" cy="283.0" r="2.6"/>
<circle cx="232.5" cy="249.0" r="2.6"/>
<circle cx="224.0" cy="215.0" r="2.6"/>
<circle cx="215.5" cy="181.0" r="2.6"/>
<circle cx="207.0" cy="147.0" r="2.6"/>
<circle cx="198.5" cy="113.0" r="2.6"/>
<circle cx="190.0" cy="79.0" r="2.6"/>
<circle cx="181.5" cy="45.0" r="2.6"/>
<circle cx="173.0" cy="11.0" r="2.6"/>
<circle cx="275.0" cy="308.5" r="2.6"/>
<circle cx="266.5" cy="274.5" r="2.6"/>
<circle cx="258.0" cy="240.5" r="2.6"/>
<circle cx="249.5" cy="206.5" r="2.6"/>
<circle cx="241.0" cy="172.5" r="2.6"/>
<circle cx="232.5" cy="138.5" r="2.6"/>
<circle cx="224.0" cy="104.5" r="2.6"/>
<circle cx="215.5" cy="70.5" r="2.6"/>
<circle cx="207.0" cy="36.5" r="2.6"/>
<circle cx="300.5" cy="300.0" r="2.6"/>
<circle cx="292.0" cy="266.0" r="2.6"/>
<circle cx="283.5" cy="232.0" r="2.6"/>
<circle cx="275.0" cy="198.0" r="2.6"/>
<circle cx="266.5" cy="164.0" r="2.6"/>
<circle cx="258.0" cy="130.0" r="2.6"/>
<circle cx="249.5" cy="96.0" r="2.6"/>
<circle cx="241.0" cy="62.0" r="2.6"/>
<circle cx="232.5" cy="28.0" r="2.6"/>
<circle cx="334.5" cy="325.5" r="2.6"/>
<circle cx="326.0" cy="291.5" r="2.6"/>
<circle cx="317.5" cy="257.5" r="2.6"/>
<circle cx="309.0" cy="223.5" r="2.6"/>
<circle cx="300.5" cy="189.5" r="2.6"/>
<circle cx="292.0" cy="155.5" r="2.6"/>
<circle cx="283.5" cy="121.5" r="2.6"/>
<circle cx="275.0" cy="87.5" r="2.6"/>
<circle cx="266.5" cy="53.5" r="2.6"/>
<circle cx="258.0" cy="19.5" r="2.6"/>
<circle cx="360.0" cy="317.0" r="2.6"/>
<circle cx="351.5" cy="283.0" r="2.6"/>
<circle cx="343.0" cy="249.0" r="2.6"/>
<circle cx="334.5" cy="215.0" r="2.6"/>
<circle cx="326.0" cy="181.0" r="2.6"/>
<circle cx="317.5" cy="147.0" r="2.6"/>
<circle cx="309.0" cy="113.0" r="2.6"/>
<circle cx="300.5" cy="79.0" r="2.6"/>
<circle cx="292.0" cy="45.0" r="2.6"/>
<circle cx="283.5" cy="11.0" r="2.6"/>
<circle cx="385.5" cy="308.5" r="2.6"/>
<circle cx="377.0" cy="274.5" r="2.6"/>
<circle cx="368.5" cy="240.5" r="2.6"/>
<circle cx="360.0" cy="206.5" r="2.6"/>
<circle cx="351.5" cy="172.5" r="2.6"/>
<circle cx="343.0" cy="138.5" r="2.6"/>
<circle cx="334.5" cy="104.5" r="2.6"/>
<circle cx="326.0" cy="70.5" r="2.6"/>
<circle cx="317.5" cy="36.5" r="2.6"/>
<circle cx="411.0" cy="300.0" r="2.6"/>
<circle cx="402.5" cy="266.0" r="2.6"/>
<circle cx="394.0" cy="232.0" r="2.6"/>
<circle cx="385.5" cy="198.0" r="2.6"/>
<circle cx="377.0" cy="164.0" r="2.6"/>
<circle cx="368.5" cy="130.0" r="2.6"/>
<circle cx="360.0" cy="96.0" r="2.6"/>
<circle cx="351.5" cy="62.0" r="2.6"/>
<circle cx="343.0" cy="28.0" r="2.6"/>
<circle cx="445.0" cy="325.5" r="2.6"/>
<circle cx="436.5" cy="291.5" r="2.6"/>
<circle cx="428.0" cy="257.5" r="2.6"/>
<circle cx="419.5" cy="223.5" r="2.6"/>
<circle cx="411.0" cy="189.5" r="2.6"/>
<circle cx="402.5" cy="155.5" r="2.6"/>
<circle cx="394.0" cy="121.5" r="2.6"/>
<circle cx="385.5" cy="87.5" r="2.6"/>
<circle cx="377.0" cy="53.5" r="2.6"/>
<circle cx="368.5" cy="19.5" r="2.6"/>
<circle cx="470.5" cy="317.0" r="2.6"/>
<circle cx="462.0" cy="283.0" r="2.6"/>
<circle cx="453.5" cy="249.0" r="2.6"/>
<circle cx="445.0" cy="215.0" r="2.6"/>
<circle cx="436.5" cy="181.0" r="2.6"/>
<circle cx="428.0" cy="147.0" r="2.6"/>
<circle cx="419.5" cy="113.0" r="2.6"/>
<circle cx="411.0" cy="79.0" r="2.6"/>
<circle cx="402.5" cy="45.0" r="2.6"/>
<circle cx="394.0" cy="11.0" r="2.6"/>
<circle cx="496.0" cy="308.5" r="2.6"/>
<circle cx="487.5" cy="274.5" r="2.6"/>
<circle cx="479.0" cy="240.5" r="2.6"/>
<circle cx="470.5" cy="206.5" r="2.6"/>
<circle cx="462.0" cy="172.5" r="2.6"/>
<circle cx="453.5" cy="138.5" r="2.6"/>
<circle cx="445.0" cy="104.5" r="2.6"/>
<circle cx="436.5" cy="70.5" r="2.6"/>
<circle cx="428.0" cy="36.5" r="2.6"/>
<circle cx="496.0" cy="198.0" r="2.6"/>
<circle cx="487.5" cy="164.0" r="2.6"/>
<circle cx="479.0" cy="130.0" r="2.6"/>
<circle cx="470.5" cy="96.0" r="2.6"/>
<circle cx="462.0" cy="62.0" r="2.6"/>
<circle cx="453.5" cy="28.0" r="2.6"/>
<circle cx="496.0" cy="87.5" r="2.6"/>
<circle cx="487.5" cy="53.5" r="2.6"/>
<circle cx="479.0" cy="19.5" r="2.6"/>
<g stroke="currentColor" stroke-width="2" fill="none"><line x1="190.0" y1="300.0" x2="300.5" y2="189.5"/><line x1="190.0" y1="300.0" x2="343.0" y2="138.5"/></g>
<text x="308.5" y="201.5">(13, 13)</text>
<text x="335.0" y="134.5" text-anchor="end">(18, 19)</text>
<text x="228.0" y="297.0" class="acc">good cell</text>
<text x="404.0" y="102.0">bad cell</text>
<text x="20" y="40" font-size="12">area of each cell = 13</text>
</svg>
<figcaption>Figure 14.1. One lattice, two bases. The good basis (3, 1), (−1, 4) has a nearly square cell; the bad basis (13, 13), (18, 19) has a long thin cell. Both cells have area 13, and both tile the plane with one lattice point per cell.</figcaption>
</figure>

## 14.4 Gram-Schmidt orthogonalization

*Level: beginner.*

The Gram-Schmidt process turns a basis into orthogonal vectors, one at a time:

$$
b_1^* = b_1, \qquad b_i^* = b_i - \sum_{j < i} \mu_{ij} b_j^*, \qquad \mu_{ij} =
\frac{\langle b_i, b_j^* \rangle}{\langle b_j^*, b_j^* \rangle}.
$$

$b_i^*$ is the part of $b_i$ perpendicular to $b_1, \ldots, b_{i-1}$. The $b_i^*$ are
generally *not* in the lattice (the $\mu_{ij}$ are fractions), but they measure it:

- $\det L = \|b_1^*\| \cdot \|b_2^*\| \cdots \|b_n^*\|$, because the matrix that
  changes $b$ into $b^*$ is triangular with ones on the diagonal;
- every nonzero lattice vector has length at least $\min_i \|b_i^*\|$ (proved in
  §14.8).

**Hadamard's inequality** says $\det L \le \|b_1\| \cdots \|b_n\|$, with equality
exactly for orthogonal bases. The **Hadamard ratio** $\left(\det L / \prod \|b_i\|
\right)^{1/n}$, between 0 and 1, is a simple measure of how orthogonal, and so how
good, a basis is.

<figure class="mars-fig">
<svg viewBox="0 0 640 240" width="640" role="img" aria-label="Gram-Schmidt in the plane: b2 star is the component of b2 perpendicular to b1, and mu times b1 is its projection onto b1" fill="currentColor" font-size="13">
<g stroke="currentColor" stroke-width="2" fill="none">
<line x1="120" y1="190" x2="420" y2="190" class="acc"/>
<line x1="120" y1="190" x2="300" y2="50"/>
<line x1="120" y1="190" x2="120" y2="50" stroke-dasharray="6 4"/>
<line x1="300" y1="50" x2="120" y2="50" stroke-dasharray="2 4" stroke-width="1.2"/>
<line x1="300" y1="50" x2="300" y2="190" stroke-dasharray="2 4" stroke-width="1.2"/>
</g>
<path d="M420 190 l -10 -5 v 10 z" class="acc-fill"/>
<path d="M300 50 l -5 9 l -4 -7 z"/>
<path d="M120 50 l -5 10 h 10 z"/>
<rect x="120" y="178" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="430" y="195" class="acc">b₁ = b₁*</text>
<text x="310" y="48">b₂</text>
<text x="60" y="120">b₂*</text>
<text x="210" y="212" text-anchor="middle">μ₂₁ b₁</text>
<line x1="120" y1="200" x2="300" y2="200" stroke="currentColor" stroke-width="1"/>
<text x="470" y="100" font-size="12">b₂* = b₂ − μ₂₁ b₁</text>
<text x="470" y="120" font-size="12">μ₂₁ = ⟨b₂, b₁⟩ / ⟨b₁, b₁⟩</text>
<text x="470" y="140" font-size="12">area = ‖b₁*‖ · ‖b₂*‖</text>
</svg>
<figcaption>Figure 14.2. Gram-Schmidt in two dimensions. b₂* is the part of b₂ perpendicular to b₁; the parallelogram of b₁, b₂ and the rectangle of b₁*, b₂* have the same area, the determinant.</figcaption>
</figure>

### Code it

Exact Gram-Schmidt with Python's `Fraction`, for the good and the bad basis. We
print $b_2^*$, $\mu_{21}$, the product of the $\|b_i^*\|$ (always 13) and the Hadamard
ratio.

```python
# Gram-Schmidt: b_i* = b_i - sum_{j<i} mu_ij b_j*, with mu_ij = <b_i, b_j*> / <b_j*, b_j*>.
def dot(u, v):
    return sum(a * b for a, b in zip(u, v))

def gram_schmidt(B):
    Bs, mu = [], [[Fraction(0)] * len(B) for _ in B]
    for i, b in enumerate(B):
        v = [Fraction(x) for x in b]
        for j in range(i):
            mu[i][j] = dot(b, Bs[j]) / dot(Bs[j], Bs[j])
            v = [x - mu[i][j] * y for x, y in zip(v, Bs[j])]
        Bs.append(v)
    return Bs, mu

def norm(v):
    return float(dot(v, v)) ** 0.5

for B in (good, bad):
    Bs, mu = gram_schmidt(B)
    prod_gs = 1.0
    for v in Bs:
        prod_gs *= norm(v)
    hadamard = (abs(float(det(B))) / (norm(B[0]) * norm(B[1]))) ** 0.5
    print([str(x) for x in Bs[1]], str(mu[1][0]), round(prod_gs, 6), round(hadamard, 4))
```

```text
['-13/10', '39/10'] 1/10 13.0 0.9985
['-1/2', '1/2'] 37/26 13.0 0.1644
```

The good basis has Hadamard ratio $0.9985$, almost orthogonal; the bad one $0.1644$.
Same lattice, same determinant: the difference is all in the basis.

## 14.5 Minkowski's theorem and successive minima

*Level: intermediate.*

The **first minimum** $\lambda_1(L)$ is the length of a shortest nonzero vector of
$L$. More generally the $i$-th **successive minimum** $\lambda_i(L)$ is the smallest
$r$ such that $L$ contains $i$ linearly independent vectors of length at most $r$. So
$\lambda_1 \le \lambda_2 \le \cdots \le \lambda_n$. In $\mathbb{Z}^n$ all of them are 1.

How short can the shortest vector be forced to be? Hermann Minkowski answered in his
*Geometrie der Zahlen* (1896).

!!! tip "Minkowski's first theorem"
    If $C \subset \mathbb{R}^n$ is convex, symmetric about the origin ($x \in C
    \Rightarrow -x \in C$) and $\operatorname{vol}(C) > 2^n \det L$, then $C$
    contains a nonzero point of $L$.

**Proof.** First, **Blichfeldt's lemma**: if a region $S$ has volume greater than
$\det L$, two distinct points of $S$ differ by a lattice vector. Cut $S$ into the
pieces lying in each translate $v + \mathcal{P}$ of the fundamental parallelepiped,
and slide each piece back into $\mathcal{P}$ by subtracting $v$. The pieces have
total volume more than $\operatorname{vol}(\mathcal{P}) = \det L$, so two of them
overlap: some $x - v = y - w$ with $x \ne y$ in $S$, and $x - y = v - w \in L$.

Now apply it to $S = \frac{1}{2}C$, whose volume is $2^{-n}\operatorname{vol}(C) >
\det L$. We get distinct $x, y \in \frac{1}{2}C$ with $x - y \in L$. Since $2x$ and
$-2y$ are in $C$ (symmetry), so is their midpoint $\frac{1}{2}(2x) + \frac{1}{2}(-2y)
= x - y$ (convexity). It is a nonzero lattice point in $C$. $\blacksquare$

Apply the theorem to a cube $[-r, r]^n$ of volume $(2r)^n$: once $r^n > \det L$ (and
by a limiting argument also for $r^n = \det L$), the cube holds a nonzero lattice
vector, whose length is at most $r\sqrt{n}$. Hence

$$
\lambda_1(L) \le \sqrt{n}\,(\det L)^{1/n}.
$$

Using a ball instead of a cube gives a slightly better constant. The best constant
$\gamma_n$ in $\lambda_1^2 \le \gamma_n (\det L)^{2/n}$ is the **Hermite constant**;
it is known exactly only for $n \le 8$ and $n = 24$ ($\gamma_2 = 2/\sqrt{3}$, reached
by the hexagonal lattice), and it grows roughly like $n/(2\pi e)$ for large $n$.

Minkowski's bound is an upper bound; a random lattice usually comes close to it.
The **Gaussian heuristic** predicts that a ball of volume $V$ contains about $V/\det L$
lattice points, so the first minimum is near the radius of a ball of volume $\det L$:

$$
\lambda_1(L) \approx \mathrm{GH}(L) = \sqrt{\frac{n}{2\pi e}}\,(\det L)^{1/n}.
$$

This is the yardstick of every lattice-attack estimate. It is a heuristic, not a
theorem, and it fails for lattices with structure (such as $\mathbb{Z}^n$), but for
the random-looking lattices of cryptography it is accurate in dimensions above about
50.

### Code it

Minkowski's bound against the true shortest vector, found by brute-force search, in
three random three-dimensional lattices.

```python
# Minkowski's bound lambda_1 <= sqrt(n) det^(1/n), against the true shortest vector, in dimension 3.
import random
rng = random.Random(14)

def shortest_by_search(B, r=6):
    n = len(B)
    best = None
    for c in product(range(-r, r + 1), repeat=n):
        if any(c):
            w = [sum(ci * B[i][j] for i, ci in enumerate(c)) for j in range(n)]
            if best is None or dot(w, w) < dot(best, best):
                best = w
    return best

for _ in range(3):
    B = [[rng.randrange(-20, 21) for _ in range(3)] for _ in range(3)]
    d = abs(det(B))
    if d == 0:
        continue
    s = shortest_by_search(B)
    print(B, int(d), round(norm(s), 3), round(3**0.5 * float(d) ** (1 / 3), 3))
```

```text
[[-14, 19, 13], [-5, -3, -4], [-2, -16, 8]] 3106 7.071 25.271
[[-1, 9, 5], [5, -13, -4], [-6, 0, 2]] 238 5.385 10.734
[[-4, 3, 20], [20, 13, -11], [-10, 15, -3]] 8606 18.276 35.495
```

The bound always holds, usually with room to spare: $7.07 \le 25.27$, $5.39 \le
10.73$, $18.28 \le 35.50$.

## 14.6 The shortest and closest vector problems

*Level: intermediate.*

The central problems:

- **SVP** (shortest vector problem): given a basis, find a nonzero lattice vector
  of length $\lambda_1$.
- **CVP** (closest vector problem): given a basis and a target $t$, find the lattice
  vector closest to $t$.
- **Approximate versions**, SVP$_\gamma$ and CVP$_\gamma$: find a vector within a
  factor $\gamma$ of the optimum.
- **BDD** (bounded distance decoding): CVP when the target is promised to be
  unusually close to the lattice. LWE, the subject of the next chapter, is a BDD
  problem.

How hard? Peter van Emde Boas showed in 1981 that exact CVP is NP-hard; Miklós Ajtai
showed in 1998 that exact SVP is NP-hard under randomized reductions. Hardness is
known for approximation factors up to about $n^{c/\log\log n}$ (Haviv and Regev,
2007, for SVP). Cryptography lives at polynomial factors like $\gamma = n$, where the
problems are believed hard but are *not* NP-hard (they lie in NP ∩ coNP for $\gamma$
around $\sqrt{n}$, by Aharonov and Regev, 2005). The evidence for their hardness is
forty years of algorithms that all take exponential time, by classical or quantum
computers.

The best algorithms:

| method | time | memory |
|---|---|---|
| enumeration (Kannan 1983; Fincke and Pohst 1985) | $2^{O(n \log n)}$ | polynomial |
| sieving (Ajtai, Kumar and Sivakumar 2001; practical since Nguyen and Vidick 2008) | $2^{0.292n + o(n)}$ heuristically (Becker, Ducas, Gama, Laarhoven 2016) | $2^{0.2075n}$ |
| quantum sieving | about $2^{0.257n}$ (Chailloux and Loyer, 2021) | similar |

The constant $0.292$ is why, for example, a block size of 500 is quoted as about
$2^{146}$ classical operations.

## 14.7 Gauss-Lagrange reduction

*Level: intermediate.*

In two dimensions the shortest vector problem is easy. The algorithm, due to
Joseph-Louis Lagrange (1773) and published by Carl Friedrich Gauss in the
*Disquisitiones Arithmeticae* (1801) as reduction of binary quadratic forms, is the
Euclidean algorithm for vectors:

1. Order the vectors so that $\|u\| \le \|v\|$.
2. Replace $v$ by $v - mu$, where $m$ is the integer closest to $\langle u, v
   \rangle / \langle u, u \rangle$. This makes $v$ as short as possible by
   subtracting multiples of $u$.
3. If now $\|v\| < \|u\|$, swap and go to 2. Otherwise stop.

The lengths strictly decrease, so it stops.

**Why the result is a shortest vector.** At the end, $\|u\| \le \|v\|$ and
$|\langle u, v \rangle| \le \frac{1}{2}\|u\|^2$ (because $m$ was the nearest integer,
the new $\langle u, v \rangle / \langle u, u \rangle$ lies in $[-\frac{1}{2},
\frac{1}{2}]$). For any lattice vector $au + bv$ with integers $a, b$ not both zero,

$$
\|au + bv\|^2 = a^2\|u\|^2 + 2ab\langle u, v\rangle + b^2\|v\|^2 \ge (a^2 - |ab| +
b^2)\,\|u\|^2 \ge \|u\|^2,
$$

since $a^2 - |ab| + b^2 \ge 1$ for integers not both zero. So $u$ is a shortest
vector. $\blacksquare$ The same computation shows $\|v\| = \lambda_2$.

### By hand

Start from the bad basis: $u = (13, 13)$ with $\|u\|^2 = 338$, $v = (18, 19)$ with
$\|v\|^2 = 685$.

1. $\langle u, v \rangle = 234 + 247 = 481$, and $481/338 \approx 1.42$, so $m = 1$:
   $v = (18, 19) - (13, 13) = (5, 6)$, $\|v\|^2 = 61 < 338$. Swap: $u = (5, 6)$,
   $v = (13, 13)$.
2. $\langle u, v \rangle = 65 + 78 = 143$, and $143/61 \approx 2.34$, so $m = 2$:
   $v = (13, 13) - (10, 12) = (3, 1)$, $\|v\|^2 = 10 < 61$. Swap: $u = (3, 1)$,
   $v = (5, 6)$.
3. $\langle u, v \rangle = 15 + 6 = 21$, and $21/10 = 2.1$, so $m = 2$: $v = (5, 6)
   - (6, 2) = (-1, 4)$, $\|v\|^2 = 17 \ge 10$. Stop.

The reduced basis is $(3, 1)$, $(-1, 4)$: the good basis, recovered. Tracing back,
$(3, 1) = 3 \cdot (13, 13) - 2 \cdot (18, 19)$.

```python
# Gauss-Lagrange reduction: the two-dimensional algorithm, which always finds a shortest vector.
def gauss_reduce(u, v, trace=False):
    u, v = list(u), list(v)
    if dot(u, u) > dot(v, v):
        u, v = v, u
    while True:
        m = round(Fraction(dot(u, v), dot(u, u)))
        v = [a - m * b for a, b in zip(v, u)]
        if trace:
            print("  m =", m, " u =", u, " v =", v)
        if dot(v, v) >= dot(u, u):
            return u, v
        u, v = v, u

u, v = gauss_reduce(*bad, trace=True)
print(u, v, dot(u, u), dot(v, v))
shortest = min((dot(w, w), w) for c in product(range(-30, 31), repeat=2) if c != (0, 0)
               for w in [[c[0] * bad[0][i] + c[1] * bad[1][i] for i in range(2)]])
print(shortest)
```

```text
  m = 1  u = [13, 13]  v = [5, 6]
  m = 2  u = [5, 6]  v = [3, 1]
  m = 2  u = [3, 1]  v = [-1, 4]
[3, 1] [-1, 4] 10 17
(10, [-3, -1])
```

The search over all $x, y$ between $-30$ and $30$ confirms that no lattice vector is
shorter than $(3, 1)$ (the search finds its negative, $(-3, -1)$).

## 14.8 The LLL algorithm

*Level: intermediate.*

Arjen Lenstra, Hendrik Lenstra and László Lovász published their algorithm in 1982,
in a paper on factoring polynomials with rational coefficients. It generalizes
Gauss-Lagrange to any dimension, settling for a vector that is short, not shortest,
in exchange for polynomial running time. It is the most important algorithm in
public-key cryptanalysis.

A basis is **LLL-reduced** (with parameter $\delta \in (\frac{1}{4}, 1)$, classically
$\frac{3}{4}$) when

1. **size-reduced**: $|\mu_{ij}| \le \frac{1}{2}$ for all $j < i$; and
2. **Lovász condition**: $\|b_k^*\|^2 \ge (\delta - \mu_{k,k-1}^2)\,
   \|b_{k-1}^*\|^2$ for $k = 2, \ldots, n$.

The second condition says the Gram-Schmidt lengths do not drop too fast: the
projection of $b_k$ orthogonal to $b_1, \ldots, b_{k-2}$ is not much shorter than
that of $b_{k-1}$.

The algorithm keeps an index $k$, starting at 2:

1. Size-reduce $b_k$: for $j = k-1, \ldots, 1$, subtract $\lfloor \mu_{kj} \rceil b_j$
   (the nearest integer to $\mu_{kj}$ times $b_j$) and update the $\mu$.
2. If the Lovász condition holds at $k$, increase $k$. Otherwise swap $b_k$ and
   $b_{k-1}$ and decrease $k$ (but not below 2).
3. Stop when $k > n$.

For $n = 2$ and $\delta = 1$ this is exactly Gauss-Lagrange.

### What LLL guarantees

!!! tip "Theorem (LLL)"
    If $b_1, \ldots, b_n$ is LLL-reduced with $\delta = \frac{3}{4}$, then
    $$\|b_1\| \le 2^{(n-1)/2}\,\lambda_1(L) \quad\text{and}\quad \|b_1\| \le
    2^{(n-1)/4}\,(\det L)^{1/n}.$$

**Proof.** From the Lovász condition and $|\mu_{k,k-1}| \le \frac{1}{2}$,
$\|b_k^*\|^2 \ge (\frac{3}{4} - \frac{1}{4})\|b_{k-1}^*\|^2 =
\frac{1}{2}\|b_{k-1}^*\|^2$. By induction $\|b_1\|^2 = \|b_1^*\|^2 \le 2^{i-1}
\|b_i^*\|^2$ for every $i$.

Now take any nonzero lattice vector $v = \sum_i c_i b_i$, and let $j$ be the largest
index with $c_j \ne 0$. Written in the Gram-Schmidt vectors, $v = c_j b_j^* +$
(combination of $b_1^*, \ldots, b_{j-1}^*$), because $b_j = b_j^* + \sum_{i<j}
\mu_{ji} b_i^*$ and $b_i$ for $i < j$ only involve $b_1^*, \ldots, b_i^*$. The
$b_i^*$ are orthogonal, so $\|v\| \ge |c_j|\,\|b_j^*\| \ge \|b_j^*\|$. Hence
$\lambda_1 \ge \min_j \|b_j^*\|$, and

$$
\|b_1\|^2 \le 2^{j-1}\|b_j^*\|^2 \le 2^{n-1}\lambda_1^2.
$$

For the second bound, multiply $\|b_1\|^2 \le 2^{i-1}\|b_i^*\|^2$ over $i = 1, \ldots,
n$: $\|b_1\|^{2n} \le 2^{n(n-1)/2} \prod \|b_i^*\|^2 = 2^{n(n-1)/2} (\det L)^2$.
$\blacksquare$

### Why it terminates

Let $d_i = \prod_{j \le i} \|b_j^*\|^2$, the squared volume of the lattice spanned by
the first $i$ vectors; for an integer basis it is a positive integer (a Gram
determinant). Size reduction changes no $b_j^*$. A swap at position $k$ changes only
$d_{k-1}$, and because the Lovász condition failed, it multiplies $d_{k-1}$ by less than
$\delta$. So the product $D = d_1 d_2 \cdots d_{n-1}$, a positive integer, drops by a
factor $\delta$ at each swap. If the entries of the basis are at most $X$ in size,
$D \le X^{n^2}$ roughly, so there are $O(n^2 \log X)$ swaps. With care for the size of
the fractions, the whole algorithm runs in polynomial time.

### Code it

LLL in full, with exact `Fraction` arithmetic and the standard update formulas for
the Gram-Schmidt data after a swap (so it never recomputes them from scratch). A
checker recomputes Gram-Schmidt independently and tests both conditions. First, the
bad basis; then a classic use, recovering an algebraic number's minimal polynomial
from 36 digits: in the lattice with rows $(e_i, \lfloor N\alpha^i \rceil)$, a vector
$(c_0, \ldots, c_6, \approx N \sum c_i \alpha^i)$ is short exactly when $\sum c_i
\alpha^i \approx 0$.

```python
# LLL (Lenstra, Lenstra, Lovasz 1982), exact arithmetic with fractions.
def lll(B, delta=Fraction(3, 4)):
    B = [list(map(int, b)) for b in B]
    n = len(B)
    Bs, mu = gram_schmidt(B)
    Bn = [dot(v, v) for v in Bs]              # |b_i*|^2
    k = 1
    while k < n:
        for j in range(k - 1, -1, -1):        # size-reduce b_k against b_j
            q = round(mu[k][j])
            if q:
                B[k] = [a - q * b for a, b in zip(B[k], B[j])]
                for i in range(j):
                    mu[k][i] -= q * mu[j][i]
                mu[k][j] -= q
        if Bn[k] >= (delta - mu[k][k - 1] ** 2) * Bn[k - 1]:
            k += 1                            # Lovasz condition holds: move on
            continue
        B[k], B[k - 1] = B[k - 1], B[k]       # swap, then update the Gram-Schmidt data
        m = mu[k][k - 1]
        new = Bn[k] + m * m * Bn[k - 1]
        mu[k][k - 1] = m * Bn[k - 1] / new
        Bn[k] = Bn[k - 1] * Bn[k] / new
        Bn[k - 1] = new
        for j in range(k - 1):
            mu[k - 1][j], mu[k][j] = mu[k][j], mu[k - 1][j]
        for i in range(k + 1, n):
            t = mu[i][k]
            mu[i][k] = mu[i][k - 1] - m * t
            mu[i][k - 1] = t + mu[k][k - 1] * mu[i][k]
        k = max(k - 1, 1)
    return B

def is_lll_reduced(B, delta=Fraction(3, 4)):
    Bs, mu = gram_schmidt(B)
    size = all(abs(mu[i][j]) <= Fraction(1, 2) for i in range(len(B)) for j in range(i))
    lovasz = all(dot(Bs[k], Bs[k]) >= (delta - mu[k][k - 1] ** 2) * dot(Bs[k - 1], Bs[k - 1])
                 for k in range(1, len(B)))
    return size and lovasz

print(lll(bad))
# A classic use: recover the minimal polynomial of alpha = 2^(1/3) + 3^(1/2) from 36 digits.
from decimal import Decimal, getcontext
getcontext().prec = 60
alpha = Decimal(2) ** (Decimal(1) / 3) + Decimal(3).sqrt()
N = 10**36
rows = [[int(i == j) for j in range(7)] + [int((alpha**i * N).to_integral_value())] for i in range(7)]
R = lll(rows)
print(R[0], is_lll_reduced(R), abs(det(R)) == abs(det(rows)))
c = R[0][:7]
print(" + ".join("%d x^%d" % (ci, i) for i, ci in enumerate(c) if ci))
```

```text
[[3, 1], [-1, 4]]
[-23, -36, 27, -4, -9, 0, 1, -12] True True
-23 x^0 + -36 x^1 + 27 x^2 + -4 x^3 + -9 x^4 + 1 x^6
```

LLL turns the bad basis back into the good one, and finds the polynomial
$x^6 - 9x^4 - 4x^3 + 27x^2 - 36x - 23$, which is indeed the minimal polynomial of
$\sqrt[3]{2} + \sqrt{3}$ (the vector's last entry, $-12$, is $N$ times the tiny
rounding error).

### LLL in practice

The worst-case factor $2^{(n-1)/2}$ is far too pessimistic. Nicolas Gama and Phong
Nguyen measured in 2008 that LLL on random lattices finds $\|b_1\| \approx
1.0219^n (\det L)^{1/n}$ in high dimensions: the **root Hermite factor** of LLL is
about 1.022, against the worst case $2^{1/4} \approx 1.19$. Our runs, with
$\delta = 0.99$, on $q$-ary lattices of growing dimension:

```python
# How good is LLL in practice?  The root Hermite factor (|b_1| / det^(1/n))^(1/n) on random q-ary lattices.
def qary_basis(n, m, q, rng):
    """The lattice {x in Z^(n+m) : x = (y, yA mod q)}: rows (I | A) and (0 | qI)."""
    A = [[rng.randrange(q) for _ in range(m)] for _ in range(n)]
    rows = [[int(i == j) for j in range(n)] + A[i] for i in range(n)]
    rows += [[0] * n + [q * int(i == j) for j in range(m)] for i in range(m)]
    return rows

import math
for dim in (10, 20, 30, 40):
    q = 10007
    Bq = qary_basis(dim // 2, dim - dim // 2, q, rng)
    R = lll(Bq, Fraction(99, 100))
    logdet = (dim - dim // 2) * math.log(q)
    rhf = math.exp((math.log(norm(R[0])) - logdet / dim) / dim)
    gh = math.sqrt(dim / (2 * math.pi * math.e)) * math.exp(logdet / dim)
    print(dim, round(norm(R[0]), 2), round(gh, 2), round(rhf, 4))
```

```text
10 77.45 76.54 0.9747
20 136.67 108.25 1.0157
30 143.96 132.58 1.0122
40 211.79 153.09 1.0189
```

The columns are dimension, $\|b_1\|$ after LLL, the Gaussian heuristic, and the root
Hermite factor $(\|b_1\|/(\det L)^{1/n})^{1/n}$. In dimension 10, LLL finds a vector
about as short as the Gaussian heuristic predicts (that is, essentially a shortest
vector). By dimension 40 it is 38 percent longer than the prediction, and the gap
grows exponentially with the dimension: that gap is the room between "short" and
"shortest" in which lattice cryptography lives. (In these small dimensions the root
Hermite factor is below its asymptotic 1.022, as Gama and Nguyen also observed.)

<figure class="mars-fig">
<svg viewBox="0 0 640 260" width="640" role="img" aria-label="Gram-Schmidt log lengths of a 40-dimensional q-ary lattice basis before and after LLL: before, the first 20 equal log q and the last 20 are near 0, a cliff; after, they decrease along a gentle straight slope" fill="currentColor" font-size="13">
<g stroke="currentColor" stroke-width="1" opacity=".5"><line x1="60" y1="220" x2="610" y2="220"/><line x1="60" y1="220" x2="60" y2="30"/></g>
<text x="52" y="224.0" text-anchor="end" font-size="12">0</text>
<text x="52" y="164.0" text-anchor="end" font-size="12">5</text>
<text x="52" y="104.0" text-anchor="end" font-size="12">10</text>
<text x="52" y="64.4" text-anchor="end" font-size="12">log₂q</text>
<path fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="5 4" d="M70.0 60.5 L83.6 60.5 L97.2 60.5 L110.8 60.5 L124.4 60.5 L137.9 60.5 L151.5 60.5 L165.1 60.5 L178.7 60.5 L192.3 60.5 L205.9 60.5 L219.5 60.5 L233.1 60.5 L246.7 60.5 L260.3 60.5 L273.8 60.5 L287.4 60.5 L301.0 60.5 L314.6 60.5 L328.2 60.5 L341.8 220.0 L355.4 220.0 L369.0 220.0 L382.6 220.0 L396.2 220.0 L409.7 220.0 L423.3 220.0 L436.9 220.0 L450.5 220.0 L464.1 220.0 L477.7 220.0 L491.3 220.0 L504.9 220.0 L518.5 220.0 L532.1 220.0 L545.6 220.0 L559.2 220.0 L572.8 220.0 L586.4 220.0 L600.0 220.0"/>
<path fill="none" stroke="currentColor" stroke-width="2" class="acc" d="M70.0 130.1 L83.6 129.0 L97.2 129.9 L110.8 128.8 L124.4 129.8 L137.9 130.1 L151.5 131.5 L165.1 131.4 L178.7 133.0 L192.3 132.8 L205.9 134.2 L219.5 135.3 L233.1 134.8 L246.7 136.5 L260.3 138.3 L273.8 137.3 L287.4 139.1 L301.0 137.1 L314.6 138.8 L328.2 139.1 L341.8 141.3 L355.4 142.5 L369.0 141.8 L382.6 143.4 L396.2 143.7 L409.7 145.7 L423.3 145.6 L436.9 143.3 L450.5 144.8 L464.1 143.9 L477.7 146.0 L491.3 147.9 L504.9 148.5 L518.5 148.3 L532.1 150.5 L545.6 149.9 L559.2 150.7 L572.8 151.2 L586.4 152.4 L600.0 152.5"/>
<circle cx="70.0" cy="130.1" r="2.5" class="acc-fill"/>
<circle cx="83.6" cy="129.0" r="2.5" class="acc-fill"/>
<circle cx="97.2" cy="129.9" r="2.5" class="acc-fill"/>
<circle cx="110.8" cy="128.8" r="2.5" class="acc-fill"/>
<circle cx="124.4" cy="129.8" r="2.5" class="acc-fill"/>
<circle cx="137.9" cy="130.1" r="2.5" class="acc-fill"/>
<circle cx="151.5" cy="131.5" r="2.5" class="acc-fill"/>
<circle cx="165.1" cy="131.4" r="2.5" class="acc-fill"/>
<circle cx="178.7" cy="133.0" r="2.5" class="acc-fill"/>
<circle cx="192.3" cy="132.8" r="2.5" class="acc-fill"/>
<circle cx="205.9" cy="134.2" r="2.5" class="acc-fill"/>
<circle cx="219.5" cy="135.3" r="2.5" class="acc-fill"/>
<circle cx="233.1" cy="134.8" r="2.5" class="acc-fill"/>
<circle cx="246.7" cy="136.5" r="2.5" class="acc-fill"/>
<circle cx="260.3" cy="138.3" r="2.5" class="acc-fill"/>
<circle cx="273.8" cy="137.3" r="2.5" class="acc-fill"/>
<circle cx="287.4" cy="139.1" r="2.5" class="acc-fill"/>
<circle cx="301.0" cy="137.1" r="2.5" class="acc-fill"/>
<circle cx="314.6" cy="138.8" r="2.5" class="acc-fill"/>
<circle cx="328.2" cy="139.1" r="2.5" class="acc-fill"/>
<circle cx="341.8" cy="141.3" r="2.5" class="acc-fill"/>
<circle cx="355.4" cy="142.5" r="2.5" class="acc-fill"/>
<circle cx="369.0" cy="141.8" r="2.5" class="acc-fill"/>
<circle cx="382.6" cy="143.4" r="2.5" class="acc-fill"/>
<circle cx="396.2" cy="143.7" r="2.5" class="acc-fill"/>
<circle cx="409.7" cy="145.7" r="2.5" class="acc-fill"/>
<circle cx="423.3" cy="145.6" r="2.5" class="acc-fill"/>
<circle cx="436.9" cy="143.3" r="2.5" class="acc-fill"/>
<circle cx="450.5" cy="144.8" r="2.5" class="acc-fill"/>
<circle cx="464.1" cy="143.9" r="2.5" class="acc-fill"/>
<circle cx="477.7" cy="146.0" r="2.5" class="acc-fill"/>
<circle cx="491.3" cy="147.9" r="2.5" class="acc-fill"/>
<circle cx="504.9" cy="148.5" r="2.5" class="acc-fill"/>
<circle cx="518.5" cy="148.3" r="2.5" class="acc-fill"/>
<circle cx="532.1" cy="150.5" r="2.5" class="acc-fill"/>
<circle cx="545.6" cy="149.9" r="2.5" class="acc-fill"/>
<circle cx="559.2" cy="150.7" r="2.5" class="acc-fill"/>
<circle cx="572.8" cy="151.2" r="2.5" class="acc-fill"/>
<circle cx="586.4" cy="152.4" r="2.5" class="acc-fill"/>
<circle cx="600.0" cy="152.5" r="2.5" class="acc-fill"/>
<text x="335.0" y="240" text-anchor="middle" font-size="12">index i = 1 … 40</text>
<text x="90" y="48" font-size="12">before LLL</text>
<text x="97.2" y="117.0" class="acc" font-size="12">after LLL</text>
</svg>
<figcaption>Figure 14.3. The Gram-Schmidt profile log₂‖bᵢ*‖ of a 40-dimensional q-ary basis (q = 10007) before LLL (a cliff) and after (a straight slope). Reduction flattens the profile; the product, the determinant, is unchanged, so lowering the left end raises the right.</figcaption>
</figure>

## 14.9 Babai's algorithms and the closest vector

*Level: expert.*

For CVP, László Babai (1986) gave two methods that work well with a good basis.

**Rounding.** Write the target in the basis, $t = \sum c_i b_i$ with real $c_i$,
and round each $c_i$ to the nearest integer. The answer is the lattice point whose
translated parallelepiped, centered, contains $t$. If the basis is nearly orthogonal,
those cells are nearly round, and the answer is close to optimal.

**Nearest plane.** Work from the last basis vector to the first: project the
remaining target onto $b_i^*$, round that coefficient, subtract that multiple of
$b_i$, and continue. The cells are now boxes with sides $\|b_i^*\|$, and the error is
at most $\frac{1}{2}\sqrt{\sum \|b_i^*\|^2}$. On an LLL-reduced basis, nearest plane
finds a vector within a factor $2^{n/2}$ of the closest.

Both methods solve BDD exactly when the error is small compared with the cells, which
is why the shape of the basis is everything. A bad basis has long thin cells, and a
small error can push the target into a neighboring cell.

```python
# Babai: rounding, and the nearest-plane method, for the closest vector problem.
def babai_round(B, t):
    """Write t in the basis (over the rationals), round the coefficients."""
    n = len(B)
    # solve c B = t by Cramer's rule (small n)
    d = det(B)
    c = []
    for i in range(n):
        Bi = [row[:] for row in B]
        Bi[i] = list(t)
        c.append(round(det(Bi) / d))
    return [sum(c[i] * B[i][j] for i in range(n)) for j in range(n)]

def babai_nearest_plane(B, t):
    Bs, _ = gram_schmidt(B)
    b = [Fraction(x) for x in t]
    for i in range(len(B) - 1, -1, -1):
        c = round(dot(b, Bs[i]) / dot(Bs[i], Bs[i]))
        b = [x - c * y for x, y in zip(b, B[i])]
    return [int(x - y) for x, y in zip(t, b)]

t = [41, -17]
for B in (good, bad):
    w1, w2 = babai_round(B, t), babai_nearest_plane(B, t)
    print(B, w1, round(norm([a - b for a, b in zip(t, w1)]), 3), w2,
          round(norm([a - b for a, b in zip(t, w2)]), 3))
```

```text
[[3, 1], [-1, 4]] [40, -17] 1.0 [40, -17] 1.0
[[13, 13], [18, 19]] [35, -23] 8.485 [35, -23] 8.485
```

With the good basis, both methods find $(40, -17)$, at distance 1 from the target
$(41, -17)$. With the bad basis, both return $(35, -23)$, at distance $8.49$: a
correct lattice point, but the wrong one.

### GGH, and a cryptosystem that did not survive

Oded Goldreich, Shafi Goldwasser and Shai Halevi (1997) built a public-key scheme on
exactly this asymmetry. The private key is a good basis; the public key is a bad
basis of the same lattice. To encrypt, encode the message as a lattice point using
the public basis and add a small error. To decrypt, run Babai rounding with the good
basis.

```python
# GGH-style: a secret good basis decodes; the public bad basis does not.
n = 8
G = [[(4 * n if i == j else 0) + rng.randrange(-3, 4) for j in range(n)] for i in range(n)]
V = [row[:] for row in G]
for _ in range(40):                           # scramble with random unimodular row operations
    i, j = rng.sample(range(n), 2)
    c = rng.choice([-3, -2, -1, 1, 2, 3])
    V[i] = [a + c * b for a, b in zip(V[i], V[j])]
msg = [rng.randrange(-5, 6) for _ in range(n)]
point = [sum(msg[i] * V[i][j] for i in range(n)) for j in range(n)]
err = [rng.choice([-2, -1, 1, 2]) for _ in range(n)]
cipher = [a + e for a, e in zip(point, err)]
print(babai_round(G, cipher) == point, babai_round(V, cipher) == point)
print(max(abs(x) for row in V for x in row), babai_nearest_plane(lll(V, Fraction(99, 100)), cipher) == point)
```

```text
True False
214789 True
```

The private basis decodes; the public basis, with entries up to 214,789, does not;
but LLL applied to the public basis produces a basis good enough to decode in
dimension 8. That is the general fate of GGH: Phong Nguyen (1999) solved four of the
five GGH challenge ciphertexts, up to dimension 350, using both lattice reduction and
a structural leak in the error vectors. GGH's idea survived in a different form: the
signature scheme Falcon (FN-DSA, FIPS 206 in preparation) uses a good NTRU basis as a
trapdoor, with careful Gaussian sampling so that signatures leak nothing about it.

## 14.10 BKZ, enumeration and sieving, in outline

*Level: expert.*

LLL looks at pairs of consecutive vectors. **BKZ** (block Korkine-Zolotarev,
Claus-Peter Schnorr 1987, and Schnorr and Martin Euchner 1994) looks at blocks of
$\beta$ consecutive vectors:

1. For each position $k$, take the projected block $b_k, \ldots, b_{k+\beta-1}$
   (projected orthogonally to $b_1, \ldots, b_{k-1}$), a lattice of dimension
   $\beta$.
2. Find a shortest vector in that block, exactly, with an SVP solver.
3. Insert it at position $k$ and run LLL to remove the resulting linear dependency.
4. Sweep over $k$ repeatedly until nothing changes (or for a fixed number of tours).

The block size trades time for quality: $\beta = 2$ is essentially LLL, $\beta = n$
is an exact SVP solver. The root Hermite factor achieved by BKZ-$\beta$ is predicted
by

$$
\delta_\beta \approx \left(\frac{\beta}{2\pi e}(\pi\beta)^{1/\beta}\right)^{1/(2(\beta
- 1))},
$$

for example about 1.0121 for $\beta = 50$ and 1.0040 for $\beta = 400$. The cost is
dominated by the SVP solver in dimension $\beta$: enumeration (a depth-first search
over the coefficients, pruned by the Gram-Schmidt lengths) or sieving (which keeps a
huge list of lattice vectors and repeatedly combines pairs into shorter ones). The
**core-SVP** model counts the cost of one call, $2^{0.292\beta}$ classically and
$2^{0.265\beta}$ quantumly in the original estimates; it is the yardstick in which
the security of ML-KEM and ML-DSA is quoted.

The *Post-quantum cryptography* book takes this further: [chapter 5](../post-quantum/05-Lattices-and-Their-Hard-Problems.md)
on the hard problems and [chapter 6](../post-quantum/06-Lattice-Reduction-and-the-Estimator.md)
on BKZ, sieving and the lattice estimator at full size.

## 14.11 Break it: the knapsack

*Level: expert.*

The **subset-sum** (knapsack) problem: given weights $a_1, \ldots, a_n$ and a target
$s$, find bits $x_i$ with $\sum x_i a_i = s$. It is NP-complete in general. In 1978
Ralph Merkle and Martin Hellman built a public-key cipher on it:

- **Private key**: a *superincreasing* sequence $w_1, w_2, \ldots$ (each larger than
  the sum of the earlier ones), a modulus $M > \sum w_i$ and a multiplier $W$
  coprime to $M$. Subset sums of a superincreasing sequence are easy: go from the
  largest weight down, taking each weight that still fits.
- **Public key**: $a_i = W w_i \bmod M$, which looks random.
- **Encrypt** bits $x_i$ as $s = \sum x_i a_i$. **Decrypt**: $W^{-1}s \bmod M =
  \sum x_i w_i$, then solve the easy problem.

Adi Shamir broke the basic scheme in 1982 by recovering a trapdoor directly. The
general tool came three years later. Jeffrey Lagarias and Andrew Odlyzko (1985)
showed that subset-sum problems of low **density** $n / \log_2 \max a_i$ are solved by
lattice reduction, and Matthijs Coster, Antoine Joux, Brian LaMacchia, Andrew Odlyzko,
Claus-Peter Schnorr and Jacques Stern (1992) raised the density limit to 0.9408. The
lattice has rows

$$
(2e_i,\; N a_i) \quad (i = 1, \ldots, n), \qquad (1, 1, \ldots, 1,\; N s),
$$

with a large $N$. The combination $\sum x_i (\text{row } i) - (\text{last row})$
equals $(2x_1 - 1, \ldots, 2x_n - 1, 0)$: a vector of $\pm 1$ entries and length
$\sqrt{n}$, much shorter than the Gaussian heuristic predicts for a low-density
lattice. LLL finds it.

```python
# Break it: a Merkle-Hellman knapsack falls to LLL (the low-density attack, CJLOSS 1992 form).
def mh_keygen(n, rng):
    w, total = [], 0
    for _ in range(n):                        # superincreasing private weights
        x = total + rng.randrange(1, 2**n)
        w.append(x)
        total += x
    M = total + rng.randrange(1, 2**n)
    while True:
        W = rng.randrange(2, M)
        if math.gcd(W, M) == 1:
            break
    return [W * x % M for x in w], (w, M, W)

n = 24
pub, priv = mh_keygen(n, rng)
bits = [rng.randrange(2) for _ in range(n)]
s = sum(b * a for b, a in zip(bits, pub))
density = n / math.log2(max(pub))
N = 2**20
rows = [[2 * int(i == j) for j in range(n)] + [N * pub[i]] for i in range(n)]
rows.append([1] * n + [N * s])
for v in lll(rows, Fraction(99, 100)):
    if v[-1] == 0 and all(x in (-1, 1) for x in v[:-1]):
        guess = [(1 - x) // 2 for x in v[:-1]]
        if sum(g * a for g, a in zip(guess, pub)) != s:
            guess = [1 - g for g in guess]
        print(round(density, 3), guess == bits)
        break
```

```text
0.516 True
```

A 24-bit Merkle-Hellman key has density about 0.52, and LLL recovers the plaintext
bits in a few seconds. Merkle-Hellman knapsacks have density near 0.5 by
construction (the public weights have about $2n$ bits), so the attack covers them in
every size. Several later knapsack schemes, such as Chor-Rivest, survived longer, but
the low-density attack ended the knapsack as a mainstream design.

### Fix it

There is no fix for Merkle-Hellman. The modern lesson is the one ML-KEM follows:
build on a problem whose hard instances are *average-case* instances, with a
worst-case reduction behind them (Ajtai 1996, Regev 2005; next chapter), choose
parameters by the best known attack (BKZ with sieving), and leave a margin.

## In the real world

- **ML-KEM** (FIPS 203) and **ML-DSA** (FIPS 204) rest on module lattices; their
  parameter choices are BKZ block sizes translated into core-SVP costs.
- **Falcon** uses an NTRU lattice and a trapdoor basis, the descendant of GGH.
- **Lattice attacks on ECDSA.** If a few bits of each signing nonce leak, the private
  key is the solution of a *hidden number problem*, a CVP instance (Dan Boneh and
  Ramarathnam Venkatesan, 1996; Nick Howgrave-Graham and Nigel Smart, 2001). TPM-Fail
  (2019) and Minerva (2020) recovered keys from smart cards and TPMs this way, from
  timing leaks of a few bits. *Cryptanalysis* tells the full story.
- **Coppersmith's method** (Don Coppersmith, 1996) uses LLL to find small roots of
  polynomials modulo $N$; it breaks RSA with small public exponent in stereotyped
  messages, and with partly known factors (the ROCA attack on Infineon keys in 2017
  used it).
- **Records.** The Darmstadt SVP challenge has been solved up to dimension 180 (Léo
  Ducas, Marc Stevens and Wessel van Woerden, 2021, sieving on GPUs).

## Going deeper

- *Dual lattices.* $L^* = \{y : \langle x, y \rangle \in \mathbb{Z} \text{ for all }
  x \in L\}$ has $\det L^* = 1/\det L$, and transference theorems tie $\lambda_1(L^*)$
  to $\lambda_n(L)$ (Banaszczyk, 1993). The dual attack on LWE works in $L^*$.
- *HKZ and Minkowski reduction.* Stronger notions than LLL, with each $b_i^*$ a
  shortest vector of the projected lattice; BKZ interpolates between LLL and HKZ.
- *Floating-point LLL.* Exact fractions grow large; practical implementations
  (fplll, NTL) use carefully controlled floating point, with provable versions such
  as the $L^2$ algorithm of Nguyen and Damien Stehlé (2005).
- *Smoothing parameter and Gaussians on lattices.* The discrete Gaussian of the next
  chapter, and the worst-case reductions, rest on Fourier analysis over $L$ and
  $L^*$ (Micciancio and Regev, 2004).

## Check yourself

??? question "1. Do $(2, 0), (1, 2)$ and $(1, 0), (0, 4)$ generate the same lattice?"

    Both have determinant 4, so it is possible; check whether each basis vector is an
    integer combination of the other basis. $(1, 0)$ would need $a(2, 0) + b(1, 2)$ with
    $2b = 0$, so $b = 0$ and $a = \frac{1}{2}$: not an integer. No.

??? question "2. What is the determinant of the lattice with basis $(1, 1, 0), (0, 1, 1)$ in $\mathbb{R}^3$?"

    $BB^T = \begin{pmatrix} 2 & 1 \\ 1 & 2 \end{pmatrix}$ has determinant 3, so
    $\det L = \sqrt{3}$.

??? question "3. Reduce $u = (1, 0)$, $v = (7, 1)$ by Gauss-Lagrange."

    $\langle u, v \rangle / \langle u, u \rangle = 7$, so $v \leftarrow (0, 1)$. Now
    $\|v\| = \|u\|$: stop. The reduced basis is $(1, 0), (0, 1)$.

??? question "4. A lattice in dimension 100 has determinant $2^{500}$. What does Minkowski's bound say, and what does the Gaussian heuristic predict?"

    $\lambda_1 \le \sqrt{100} \cdot 2^{5} = 320$. The Gaussian heuristic predicts
    $\sqrt{100/(2\pi e)} \cdot 32 \approx 2.42 \cdot 32 \approx 77$.

??? question "5. Why must LLL size-reduce before testing the Lovász condition?"

    The condition involves $\mu_{k,k-1}$, and the guarantee needs $|\mu_{k,k-1}| \le
    \frac{1}{2}$ to turn it into $\|b_k^*\|^2 \ge (\delta - \frac{1}{4})
    \|b_{k-1}^*\|^2$. Size reduction does not change any $b_i^*$, only the $\mu$.

??? question "6. LLL with $\delta = 3/4$ in dimension 60 guarantees $\|b_1\| \le 2^{29.5}\lambda_1$. Is that why lattice cryptography is safe?"

    No. The guarantee is a worst case; in practice LLL achieves about $1.022^{60}
    \approx 3.7$ times the volume bound. Lattice cryptography is safe because the
    dimensions are in the hundreds and the required approximation factors are
    small, so even BKZ with large blocks is needed, at exponential cost.

??? question "7. In Babai's nearest-plane method, what is the largest possible error?"

    $\frac{1}{2}\sqrt{\sum_i \|b_i^*\|^2}$: half the diagonal of the box with sides
    $\|b_i^*\|$.

??? question "8. What is the density of a knapsack with 100 weights of 200 bits each? Will the CJLOSS attack apply?"

    $100/200 = 0.5 < 0.9408$: yes, in principle. In dimension 101 LLL alone may not
    be enough, but BKZ with moderate blocks is.

??? question "9. Why does GGH need a *bad* public basis but Babai with a *good* private one?"

    Decryption is BDD; it works only when the cells of the basis are round enough
    to contain the error ball. The public basis must be bad so that an attacker
    cannot do the same, and LLL and BKZ are precisely tools for turning bad bases
    into good ones.

## What you learned

- A lattice is the integer span of a basis; bases differ by unimodular matrices,
  and the determinant (volume of a fundamental domain) is basis-independent.
- Gram-Schmidt lengths $\|b_i^*\|$ multiply to the determinant and bound the
  shortest vector from below; the Hadamard ratio measures basis quality.
- Minkowski: $\lambda_1 \le \sqrt{n}(\det L)^{1/n}$; the Gaussian heuristic
  $\sqrt{n/(2\pi e)}(\det L)^{1/n}$ is the practical prediction.
- SVP and CVP are hard in high dimension; the best algorithms (sieving) take about
  $2^{0.292n}$.
- Gauss-Lagrange solves dimension 2 exactly. LLL finds, in polynomial time, a vector
  within $2^{(n-1)/2}$ of the shortest, and in practice within about $1.022^n$ of the
  volume bound.
- Babai's rounding and nearest plane solve CVP well with a good basis; GGH used this
  as a trapdoor and fell to reduction.
- BKZ-$\beta$ calls an SVP solver in dimension $\beta$; its cost is the basis of
  post-quantum security estimates.
- Low-density knapsacks, Merkle-Hellman included, are broken by LLL.

**Next:** [Chapter 15](15-Learning-with-Errors.md), polynomial rings and
learning with errors: the algebra on top of these lattices, and the NTT in full.

## Further reading

- Daniele Micciancio and Shafi Goldwasser, *Complexity of Lattice Problems: A
  Cryptographic Perspective* (Kluwer, 2002).
- Jeffrey Hoffstein, Jill Pipher and Joseph Silverman, *An Introduction to
  Mathematical Cryptography*, 2nd edition (Springer, 2014), chapter 7.
- Phong Nguyen and Brigitte Vallée (editors), *The LLL Algorithm: Survey and
  Applications* (Springer, 2010).
- Arjen Lenstra, Hendrik Lenstra and László Lovász, "Factoring Polynomials with
  Rational Coefficients", *Mathematische Annalen* 261 (1982).
- László Babai, "On Lovász' Lattice Reduction and the Nearest Lattice Point Problem",
  *Combinatorica* 6 (1986).
- Claus-Peter Schnorr and Martin Euchner, "Lattice Basis Reduction: Improved
  Practical Algorithms and Solving Subset Sum Problems", *Mathematical Programming*
  66 (1994).
- Nicolas Gama and Phong Nguyen, "Predicting Lattice Reduction", EUROCRYPT 2008.
- Matthijs Coster and others, "Improved Low-Density Subset Sum Algorithms",
  *Computational Complexity* 2 (1992).
- Oded Regev, lecture notes "Lattices in Computer Science" (Tel Aviv University,
  2004), free online.
- In *Post-quantum cryptography*: [chapter 5](../post-quantum/05-Lattices-and-Their-Hard-Problems.md)
  and [chapter 6](../post-quantum/06-Lattice-Reduction-and-the-Estimator.md).
