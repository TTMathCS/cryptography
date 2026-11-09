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
LLL in full with exact arithmetic and a proof of what it guarantees and why it
stops, Babai's algorithms for the closest vector, the dual lattice, enumeration,
a small working BKZ, and the break of the Merkle-Hellman knapsack.*

!!! abstract "In this chapter"
    **You will learn:**

    - lattices, bases, unimodular matrices, and when two bases give the same
      lattice;
    - the fundamental domain and the determinant (volume) of a lattice;
    - Gram-Schmidt orthogonalization and why it measures the quality of a basis;
    - Minkowski's theorem with its proof, the bound computed for a lattice the size
      of ML-KEM-512's, successive minima, the Hermite constant and the Gaussian
      heuristic;
    - the shortest and closest vector problems and their approximate versions;
    - Gauss-Lagrange reduction, by hand, with a proof that it finds a shortest vector;
    - the LLL algorithm, with full code, a proof of its guarantee, the potential
      function that proves it stops (with numbers), and its behavior in practice;
    - Babai's rounding and nearest-plane methods, by hand and in code, and the GGH
      cryptosystem;
    - the dual lattice, transference, and the mathematics behind the dual attack;
    - enumeration (Kannan, Fincke and Pohst) with its cost, and BKZ built in a
      page of Python, with its root Hermite factor measured block size by block size;
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
<path class="soft-acc" fill="currentColor" fill-opacity=".18" stroke="currentColor" stroke-width="1.5" d="M190.0,300.0L300.5,189.5L453.5,28.0L343.0,138.5Z"/>
<path class="acc acc-fill" fill-opacity=".45" stroke="currentColor" stroke-width="2" d="M190.0,300.0L215.5,291.5L207.0,257.5L181.5,266.0Z"/>
<path fill="none" stroke="currentColor" stroke-width="5.2" stroke-linecap="round" d="M139.0,317.0h0M164.5,308.5h0M156.0,274.5h0M147.5,240.5h0M139.0,206.5h0M190.0,300.0h0M181.5,266.0h0M173.0,232.0h0M164.5,198.0h0M156.0,164.0h0M147.5,130.0h0M139.0,96.0h0M224.0,325.5h0M215.5,291.5h0M207.0,257.5h0M198.5,223.5h0M190.0,189.5h0M181.5,155.5h0M173.0,121.5h0M164.5,87.5h0M156.0,53.5h0M147.5,19.5h0M249.5,317.0h0M241.0,283.0h0M232.5,249.0h0M224.0,215.0h0M215.5,181.0h0M207.0,147.0h0M198.5,113.0h0M190.0,79.0h0M181.5,45.0h0M173.0,11.0h0M275.0,308.5h0M266.5,274.5h0M258.0,240.5h0M249.5,206.5h0M241.0,172.5h0M232.5,138.5h0M224.0,104.5h0M215.5,70.5h0M207.0,36.5h0M300.5,300.0h0M292.0,266.0h0M283.5,232.0h0M275.0,198.0h0M266.5,164.0h0M258.0,130.0h0M249.5,96.0h0M241.0,62.0h0M232.5,28.0h0M334.5,325.5h0M326.0,291.5h0M317.5,257.5h0M309.0,223.5h0M300.5,189.5h0M292.0,155.5h0M283.5,121.5h0M275.0,87.5h0M266.5,53.5h0M258.0,19.5h0M360.0,317.0h0M351.5,283.0h0M343.0,249.0h0M334.5,215.0h0M326.0,181.0h0M317.5,147.0h0M309.0,113.0h0M300.5,79.0h0M292.0,45.0h0M283.5,11.0h0M385.5,308.5h0M377.0,274.5h0M368.5,240.5h0M360.0,206.5h0M351.5,172.5h0M343.0,138.5h0M334.5,104.5h0M326.0,70.5h0M317.5,36.5h0M411.0,300.0h0M402.5,266.0h0M394.0,232.0h0M385.5,198.0h0M377.0,164.0h0M368.5,130.0h0M360.0,96.0h0M351.5,62.0h0M343.0,28.0h0M445.0,325.5h0M436.5,291.5h0M428.0,257.5h0M419.5,223.5h0M411.0,189.5h0M402.5,155.5h0M394.0,121.5h0M385.5,87.5h0M377.0,53.5h0M368.5,19.5h0M470.5,317.0h0M462.0,283.0h0M453.5,249.0h0M445.0,215.0h0M436.5,181.0h0M428.0,147.0h0M419.5,113.0h0M411.0,79.0h0M402.5,45.0h0M394.0,11.0h0M496.0,308.5h0M487.5,274.5h0M479.0,240.5h0M470.5,206.5h0M462.0,172.5h0M453.5,138.5h0M445.0,104.5h0M436.5,70.5h0M428.0,36.5h0M496.0,198.0h0M487.5,164.0h0M479.0,130.0h0M470.5,96.0h0M462.0,62.0h0M453.5,28.0h0M496.0,87.5h0M487.5,53.5h0M479.0,19.5h0"/>
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

### The ball version, and a real case

The cube wastes volume in its corners. A ball of radius $r$ in $\mathbb{R}^n$ is
also convex and symmetric, and its volume is

$$
V_n(r) = \frac{\pi^{n/2}}{\Gamma(n/2 + 1)}\, r^n,
$$

which is $\pi r^2$ for $n = 2$ and $\frac{4}{3}\pi r^3$ for $n = 3$. Minkowski's
theorem applies once $V_n(r) > 2^n \det L$, so

$$
\lambda_1(L) \le 2\left(\frac{\det L}{V_n(1)}\right)^{1/n}.
$$

The quantity in brackets, raised to the power $1/n$, is the radius of a ball whose
volume is exactly $\det L$. That radius is the precise form of the Gaussian
heuristic, $\mathrm{GH}(L) = (\det L / V_n(1))^{1/n}$, and the ball version of
Minkowski says that $\lambda_1$ is at most twice it. Stirling's formula gives
$V_n(1)^{-1/n} \approx \sqrt{n/(2\pi e)}$ for large $n$, which turns the precise
form into the approximate one quoted above, and makes the ball bound about
$0.48\sqrt{n}\,(\det L)^{1/n}$: roughly half the cube bound.

**By hand, in the plane.** For the lattice of $(3, 1)$ and $(-1, 4)$, with
$\det L = 13$:

- the cube (a square of side $2r$, $r^2 = 13$) gives $\lambda_1 \le \sqrt{2}\cdot
  \sqrt{13} \approx 5.10$;
- the ball (a disk with $\pi r^2 = 4 \cdot 13 = 52$) gives $\lambda_1 \le
  \sqrt{52/\pi} \approx 4.07$;
- the Hermite constant $\gamma_2 = 2/\sqrt{3}$, the best possible, gives
  $\lambda_1^2 \le \frac{2}{\sqrt 3} \cdot 13 \approx 15.01$, so $\lambda_1 \le
  3.87$;
- the truth, from §14.7, is $\lambda_1 = \sqrt{10} \approx 3.16$.

The Gaussian heuristic, the radius of a disk of area 13, is $\sqrt{13/\pi} \approx
2.03$, an underestimate: in two dimensions there is no "random" behavior to rely on.
(The approximate formula $\sqrt{n/(2\pi e)}\,(\det L)^{1/n}$ would give 1.23, worse
still; it is meant for dimensions in the hundreds.)

**A real case.** The lattices that attacks on ML-KEM-512 build are $q$-ary lattices
of dimension about 1024 with $q = 3329$ and determinant $q^{512}$ (the
*Post-quantum cryptography* book builds them in
[chapter 5](../post-quantum/05-Lattices-and-Their-Hard-Problems.md)). Here
$(\det L)^{1/n} = \sqrt{3329} \approx 57.7$, and the three numbers are:

```python
# Uses det() and the good basis from the listings above.
# Minkowski's bound with a cube and with a ball, next to the Gaussian heuristic.
import math

def log_ball_volume(n):
    """log of the volume of the unit ball in R^n, pi^(n/2) / Gamma(n/2 + 1)."""
    return (n / 2) * math.log(math.pi) - math.lgamma(n / 2 + 1)

def bounds(n, logdet):
    cube = math.sqrt(n) * math.exp(logdet / n)                 # side 2r cube, r^n = det L
    ball = 2 * math.exp((logdet - log_ball_volume(n)) / n)     # ball of volume 2^n det L
    gh = math.exp((logdet - log_ball_volume(n)) / n)           # ball of volume det L
    return round(cube, 2), round(ball, 2), round(gh, 2)

print(bounds(2, math.log(abs(det(good)))))   # the lattice of (3, 1), (-1, 4): det 13
print(bounds(1024, 512 * math.log(3329)))     # a q-ary lattice the size of ML-KEM-512's
print(round(math.sqrt(1024 * 1.5), 1))        # length of a secret-and-error vector, variance 3/2
```

It prints:

```text
(5.1, 4.07, 2.03)
(1846.32, 897.04, 448.52)
39.2
```

Minkowski guarantees a nonzero vector of length at most about 1,846 (cube) or 897
(ball); the Gaussian heuristic expects the shortest to be near 449; the obvious
vectors $(0, \ldots, 0, q, 0, \ldots, 0)$ have length 3,329. But this lattice is not
random. The secret and the error of an ML-KEM-512 key are 1,024 small coefficients
of variance $3/2$ (the parameter $\eta_1 = 3$ of FIPS 203), and in the lattice the
attacker builds from the public key they form a vector of length about $\sqrt{1024
\cdot 1.5} \approx 39$: more than eleven times shorter than the heuristic predicts
for a random lattice. That gap is a planted short vector, and finding it is the
primal attack ([Post-quantum chapter 5,
§5.7](../post-quantum/05-Lattices-and-Their-Hard-Problems.md#57-kannans-embedding-lwe-as-a-unique-shortest-vector)).
Minkowski and the heuristic say what is normal; cryptography hides its secrets in
the abnormal.

**Minkowski's second theorem** bounds all the successive minima at once:

$$
\frac{2^n}{n!}\cdot\frac{\det L}{V_n(1)} \le \lambda_1 \lambda_2 \cdots \lambda_n \le
\frac{2^n \det L}{V_n(1)}.
$$

The right-hand side is the hard part to prove, and it contains the ball version of
the first theorem, since $\lambda_1^n$ is at most the product. The left-hand side
says that a lattice cannot be short in every direction at once: a very short
$\lambda_1$ forces some later minimum to be long, the same seesaw that Figure 14.4
shows for Gram-Schmidt lengths.

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

### Enumeration: Kannan, Fincke and Pohst

Write a lattice vector in the basis, $v = \sum_i x_i b_i$, and then in the
Gram-Schmidt vectors. Since $b_i = b_i^* + \sum_{j<i}\mu_{ij}b_j^*$,

$$
v = \sum_{j=1}^{n}\Big(x_j + \sum_{i>j}\mu_{ij}x_i\Big)\, b_j^*, \qquad
\|v\|^2 = \sum_{j=1}^{n}\Big(x_j + \sum_{i>j}\mu_{ij}x_i\Big)^2 \|b_j^*\|^2.
$$

The last term involves only $x_n$; the one before only $x_{n-1}$ and $x_n$; and so
on. That triangular shape turns "list every $v$ with $\|v\| \le R$" into a search
tree. Choose $x_n$ with $x_n^2\|b_n^*\|^2 \le R^2$, that is $|x_n| \le
R/\|b_n^*\|$. For each choice, the budget left over bounds $x_{n-1}$ to an interval
centered at $-\mu_{n,n-1}x_n$. Continue down to $x_1$, abandoning any branch whose
partial sum already exceeds $R^2$. The nodes at level $k$ (with $x_n, \ldots,
x_{n-k+1}$ fixed) are exactly the points of the lattice projected orthogonally to
$b_1, \ldots, b_{n-k}$ that lie in the ball of radius $R$.

This is **enumeration**. Ulrich Fincke and Michael Pohst (1985) described it on a
reduced basis; Ravi Kannan (1983) added recursive preprocessing of the basis that
keeps the tree small, and proved a running time of $n^{O(n)}$, which Guillaume Hanrot
and Damien Stehlé (2007) sharpened to $n^{n/(2e) + o(n)}$. On a basis that is only
LLL-reduced the tree can have $2^{O(n^2)}$ nodes. Schnorr and Euchner (1994) added two
practical touches: visit the values of each $x_j$ in zigzag order from the center
outward, and shrink $R$ to the length of each new shortest vector found, so that
the search for SVP tightens as it goes. It needs only polynomial memory.

**By hand.** List the vectors of length at most $\sqrt{10.5}$ in the lattice of
§14.2, from each basis. For the good basis $(3, 1), (-1, 4)$: $\|b_2^*\|^2 = 16.9$, so
$|x_2| \le \sqrt{10.5/16.9} \approx 0.79$ allows only $x_2 = 0$. Then $x_1^2 \cdot
10 \le 10.5$ allows $x_1 \in \{-1, 0, 1\}$. One node at level 1, three at level 2;
the tree finds $\pm(3, 1)$ at once.

For the bad basis $(13, 13), (18, 19)$: $\|b_1^*\|^2 = 338$, $\|b_2^*\|^2 = 1/2$ and
$\mu_{21} = 37/26 \approx 1.423$. Now $|x_2| \le \sqrt{10.5/0.5} \approx 4.58$
allows nine values, $-4$ to $4$. For each, $x_1$ must lie within $\sqrt{(10.5 -
x_2^2/2)/338}$, at most 0.18, of $-1.423\,x_2$. That happens only for $x_2 = 0$ (with
$x_1 = 0$) and $x_2 = \pm 2$, where $-1.423 \cdot 2 = -2.846$ is within $0.154$ of $-3$.
The leaves are $x = (3, -2)$ and $(-3, 2)$, the vectors $\pm(3, 1)$. Nine nodes at
level 1 instead of one: the long first Gram-Schmidt vector and the short last one
made the top of the tree wide.

**The cost.** The Gaussian heuristic, applied to each projected lattice, predicts
the size of each level:

$$
N_k \approx \frac{V_k(R)}{\|b_{n-k+1}^*\|\cdots\|b_n^*\|},
$$

the volume of a $k$-dimensional ball over the volume of the projected lattice. The
denominators are products of the *last* Gram-Schmidt lengths, which are small for a
poorly reduced basis (the right end of the profile in Figure 14.4, §14.8). So the middle levels swell, and
the better the basis, the smaller the tree. This is why BKZ and enumeration are used
together: reduction makes enumeration cheap, and enumeration inside blocks makes
reduction strong (§14.10).

### Code it: enumeration

The search below follows the formula directly, with floating-point Gram-Schmidt
data, and counts the nodes at each level. With `shrink=True` it is an SVP solver; it
can also work on a block $b_k, \ldots, b_{h-1}$ projected away from the earlier
vectors, which is what BKZ needs in §14.10. First, the hand example.

```python
# Uses the good and bad bases from the listings above.
# Enumeration (Fincke-Pohst, Kannan): a depth-first search over x_n, x_(n-1), ..., x_1.
import math, random

def gso_float(B):
    """Squared Gram-Schmidt lengths r_i and coefficients mu_ij, in floating point."""
    n = len(B)
    Bs, r, mu = [], [], [[0.0] * n for _ in range(n)]
    for i in range(n):
        v = [float(a) for a in B[i]]
        for j in range(i):
            mu[i][j] = sum(a * b for a, b in zip(B[i], Bs[j])) / r[j]
            v = [a - mu[i][j] * b for a, b in zip(v, Bs[j])]
        Bs.append(v)
        r.append(sum(a * a for a in v))
    return r, mu

def enum(r, mu, R2, k=0, h=None, shrink=False):
    """Vectors sum x_i b_i (i = k..h-1, projected away from b_0..b_(k-1)) of squared length < R2.
    Returns the shortest nonzero one found (coefficients, squared length) and the nodes per level.
    With shrink=True the radius drops to each new best, which is how an SVP solver runs."""
    h = len(r) if h is None else h
    d = h - k
    best, x, nodes = [R2, None], [0] * d, [0] * d
    def search(i, partial):
        c = -sum(x[j] * mu[k + j][k + i] for j in range(i + 1, d))
        bound = best[0] if shrink else R2
        rad = math.sqrt(max(bound - partial, 0.0) / r[k + i])
        for xi in range(math.ceil(c - rad), math.floor(c + rad) + 1):
            p = partial + (xi - c) ** 2 * r[k + i]
            if p >= (best[0] if shrink else R2):
                continue
            nodes[d - 1 - i] += 1                 # level 1 = the last coefficient
            x[i] = xi
            if i > 0:
                search(i - 1, p)
            elif any(x) and p < best[0]:
                best[:] = [p, x[:]]
        x[i] = 0
    search(d - 1, 0.0)
    return best[1], best[0], nodes

def ball_volume(k, R):
    return math.pi ** (k / 2) / math.gamma(k / 2 + 1) * R ** k

for B in (good, bad):                         # the by-hand tree: radius sqrt(10.5)
    r, mu = gso_float(B)
    x, l, nodes = enum(r, mu, 10.5)
    print(B, x, round(l, 6), nodes)
```

It prints:

```text
[[3, 1], [-1, 4]] [-1, 0] 10.0 [1, 3]
[[13, 13], [18, 19]] [3, -2] 10.0 [9, 3]
```

Each line shows the basis, the coefficients of a shortest vector found, its squared
length 10, and the nodes at levels 1 and 2: one and three for the good basis, nine and
three for the bad one, as by hand.

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
3. $\langle u, v \rangle = 15 + 6 = 21$, and $21/10 = 2.1$, so $m = 2$:
   $v = (5, 6) - (6, 2) = (-1, 4)$, $\|v\|^2 = 17 \ge 10$. Stop.

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

Gauss-Lagrange stops because a length goes down at every step. LLL can lengthen
$b_1$'s neighbors and move vectors back and forth, so it needs a subtler quantity
that only ever falls: a **potential function**. Let

$$
d_i = \|b_1^*\|^2 \|b_2^*\|^2 \cdots \|b_i^*\|^2, \qquad D = d_1 d_2 \cdots d_{n-1}.
$$

$d_i$ is the squared volume of the lattice spanned by the first $i$ vectors. Three
facts about it carry the proof.

1. **$d_i$ is a positive integer** for an integer basis. Write $B_i$ for the first
   $i$ rows. Gram-Schmidt says $B_i = M_i B_i^*$ with $M_i$ lower triangular with ones
   on the diagonal, so $\det(B_i B_i^T) = \det(B_i^* B_i^{*T}) = \prod_{j \le i}
   \|b_j^*\|^2 = d_i$. The left side is the determinant of a matrix of integer dot
   products, hence an integer, and it is positive because the rows are independent.
2. **Size reduction changes no $d_i$.** Subtracting a multiple of $b_j$ ($j < k$)
   from $b_k$ leaves every $b_i^*$ as it was.
3. **A swap at position $k$ changes only $d_{k-1}$, and shrinks it by a factor below
   $\delta$.** For $i \ne k-1$ the first $i$ vectors span the same lattice before and
   after the swap. The new $(k-1)$-th Gram-Schmidt vector is the part of the old
   $b_k$ orthogonal to $b_1, \ldots, b_{k-2}$, which is $b_k^* + \mu_{k,k-1}
   b_{k-1}^*$, of squared length $\|b_k^*\|^2 + \mu_{k,k-1}^2\|b_{k-1}^*\|^2$. The swap
   happened because the Lovász condition failed, which says exactly that this is less
   than $\delta\|b_{k-1}^*\|^2$.

So every swap multiplies the positive integer $D$ by less than $\delta$, and $D$
can never drop below 1. If $D_0$ is its starting value, the number of swaps is at
most $\log_{1/\delta} D_0$. Each $d_i$ is at most $\prod_{j \le i}\|b_j\|^2$ (Gram-
Schmidt never lengthens a vector), so $D_0 \le X^{n(n-1)}$ when every $\|b_j\| \le
X$, and the number of swaps is $O(n^2 \log X)$. Between two swaps the index $k$ only
climbs, so the loop runs at most $2 \cdot (\text{swaps}) + n$ times. With a further
argument that the fractions $\mu_{ij}$ stay of polynomial size, the whole algorithm
runs in polynomial time.

**By hand.** In two dimensions $D = d_1 = \|b_1\|^2$. Run LLL with $\delta = 3/4$ on
the bad basis $(13, 13), (18, 19)$, where $D_0 = 338$:

1. Size reduction: $\mu_{21} = 481/338 \approx 1.42$ rounds to 1, so $b_2 = (5, 6)$.
   Now $\mu_{21} = 143/338$ and $\|b_2^*\|^2 = 13^2/338 = 1/2$. Lovász needs $1/2 \ge
   (3/4 - (143/338)^2)\cdot 338 = 253.5 - 60.5 = 193$: it fails. Swap. The new
   $\|b_1\|^2$ is, by fact 3, $1/2 + (143/338)^2 \cdot 338 = 1/2 + 60.5 = 61$, which is
   indeed $\|(5, 6)\|^2$. $D$: $338 \to 61$, a factor of 0.18.
2. Size reduction: $\mu_{21} = 143/61 \approx 2.34$ rounds to 2, so $b_2 = (13, 13) -
   2(5, 6) = (3, 1)$, with $\mu_{21} = 21/61$ and $\|b_2^*\|^2 = 169/61 \approx 2.77$.
   Lovász needs $2.77 \ge (3/4 - 0.119) \cdot 61 \approx 38.5$: it fails. Swap. $D$:
   $61 \to 10$, a factor of 0.16.
3. Size reduction: $\mu_{21} = 21/10$ rounds to 2, so $b_2 = (5, 6) - 2(3, 1) = (-1,
   4)$, with $\mu_{21} = 1/10$ and $\|b_2^*\|^2 = 16.9$. Lovász needs $16.9 \ge
   (3/4 - 1/100) \cdot 10 = 7.4$: it holds, and LLL stops.

The potential argument allowed $\lfloor \log_{4/3} 338 \rfloor = 20$ swaps; LLL used
two. Each swap cut $D$ by far more than the guaranteed factor $3/4$, which is typical
(Figure 14.3).

### Code it

LLL in full, with exact `Fraction` arithmetic and the standard update formulas for
the Gram-Schmidt data after a swap (so it never recomputes them from scratch). The
optional `trace` list records the squared Gram-Schmidt lengths after each swap, for
watching the potential below. A checker recomputes Gram-Schmidt independently and
tests both conditions. First, the
bad basis; then a classic use, recovering an algebraic number's minimal polynomial
from 36 digits: in the lattice with rows $(e_i, \lfloor N\alpha^i \rceil)$, a vector
$(c_0, \ldots, c_6, \approx N \sum c_i \alpha^i)$ is short exactly when $\sum c_i
\alpha^i \approx 0$.

```python
# LLL (Lenstra, Lenstra, Lovasz 1982), exact arithmetic with fractions.
def lll(B, delta=Fraction(3, 4), trace=None):
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
        if trace is not None:
            trace.append(Bn[:])               # |b_i*|^2 after this swap
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

### Watching the potential fall

The `trace` hook lets us check the termination proof on real runs. First the
two-dimensional example done by hand above; then a scrambled basis of a nearly
square ten-dimensional lattice, made the GGH way (§14.9) with random row operations.
For every step the program confirms that $D$ is an integer and that the swap cut it by
more than the factor $3/4$.

```python
# Uses lll(), gram_schmidt() and dot() from the listings above.
# The potential D = d_1 d_2 ... d_(n-1), where d_i = |b_1*|^2 ... |b_i*|^2, after every swap of LLL.
import math, random

def potential(B=None, Bn=None):
    if Bn is None:
        Bn = [dot(v, v) for v in gram_schmidt(B)[0]]
    D, d = 1, Fraction(1)
    for x in Bn[:-1]:
        d *= x
        D *= d
    return D

steps = []
lll(bad, trace=steps)
print([int(potential(bad))] + [int(potential(Bn=Bn)) for Bn in steps])

rngp = random.Random(1982)                    # a scrambled basis of a nearly square lattice
B = [[(40 if i == j else 0) + rngp.randrange(-5, 6) for j in range(10)] for i in range(10)]
for _ in range(30):
    i, j = rngp.sample(range(10), 2)
    B[i] = [a + rngp.choice([-2, -1, 1, 2]) * b for a, b in zip(B[i], B[j])]
steps = []
lll(B, trace=steps)
Ds = [potential(B)] + [potential(Bn=Bn) for Bn in steps]
print(len(steps), all(D.denominator == 1 for D in Ds), max(b / a for a, b in zip(Ds, Ds[1:])) < 0.75)
print(round(math.log2(Ds[0]), 1), round(math.log2(Ds[-1]), 1), math.floor(math.log(Ds[0] / Ds[-1], 4 / 3)))
```

It prints:

```text
[338, 61, 10]
35 True True
729.6 628.1 244
```

The first line is the hand computation. In ten dimensions LLL made 35 swaps; $D$ was
an integer every time, and every swap cut it by more than a quarter. It fell from
about $2^{730}$ to $2^{628}$. Read backwards, the proof's guarantee is that a drop of
that size could take at most 244 swaps; LLL needed 35, because a typical swap cuts
$D$ by about 3 bits instead of the guaranteed 0.415. Figure 14.3 plots the run.

<figure class="mars-fig">
<svg viewBox="0 0 640 290" width="640" role="img" aria-label="The LLL potential log2 D after each of 35 swaps on a scrambled 10-dimensional basis: it falls from about 730 to 628 bits, always below the guaranteed line that drops by log2(4/3), about 0.415 bits, per swap" fill="currentColor" font-size="14">
<g stroke="currentColor" stroke-width="1" fill="none" opacity=".6"><line x1="80" y1="230" x2="610" y2="230"/><line x1="80" y1="230" x2="80" y2="20"/></g>
<text x="72" y="199.2" text-anchor="end" font-size="12">640</text>
<line x1="80" y1="195.2" x2="600" y2="195.2" stroke="currentColor" stroke-opacity=".15"/>
<text x="72" y="164.4" text-anchor="end" font-size="12">660</text>
<line x1="80" y1="160.4" x2="600" y2="160.4" stroke="currentColor" stroke-opacity=".15"/>
<text x="72" y="129.7" text-anchor="end" font-size="12">680</text>
<line x1="80" y1="125.7" x2="600" y2="125.7" stroke="currentColor" stroke-opacity=".15"/>
<text x="72" y="94.9" text-anchor="end" font-size="12">700</text>
<line x1="80" y1="90.9" x2="600" y2="90.9" stroke="currentColor" stroke-opacity=".15"/>
<text x="72" y="60.1" text-anchor="end" font-size="12">720</text>
<line x1="80" y1="56.1" x2="600" y2="56.1" stroke="currentColor" stroke-opacity=".15"/>
<text x="80" y="248" text-anchor="middle" font-size="12">0</text>
<text x="154.3" y="248" text-anchor="middle" font-size="12">5</text>
<text x="228.6" y="248" text-anchor="middle" font-size="12">10</text>
<text x="302.9" y="248" text-anchor="middle" font-size="12">15</text>
<text x="377.1" y="248" text-anchor="middle" font-size="12">20</text>
<text x="451.4" y="248" text-anchor="middle" font-size="12">25</text>
<text x="525.7" y="248" text-anchor="middle" font-size="12">30</text>
<text x="600" y="248" text-anchor="middle" font-size="12">35</text>
<text x="340" y="270" text-anchor="middle" font-size="12">swap number</text>
<text x="20" y="130" font-size="12" transform="rotate(-90 20 130)" text-anchor="middle">log₂ D (bits)</text>
<line x1="80" y1="39.4" x2="600" y2="64.7" stroke="currentColor" stroke-width="1.5" stroke-dasharray="6 4"/>
<text x="600" y="82.7" font-size="12" text-anchor="end">guaranteed: at least 0.415 bits per swap</text>
<path fill="none" stroke="currentColor" stroke-width="2" d="M80,39.4L94.9,40.6L109.7,41.9L124.6,54.6L139.4,65.9L154.3,77.5L169.1,87.4L184,91.6L198.9,92.9L213.7,95.6L228.6,97.1L243.4,98.1L258.3,110.3L273.1,121.8L288,132.9L302.9,143L317.7,153.9L332.6,165.3L347.4,175.3L362.3,179.3L377.1,182.6L392,184.9L406.9,186L421.7,187.9L436.6,190.3L451.4,196L466.3,199.9L481.1,201.7L496,204.2L510.9,206.8L525.7,208L540.6,209.1L555.4,210L570.3,212.8L585.1,214.7L600,215.8"/>
<path fill="none" stroke="currentColor" stroke-width="5.2" stroke-linecap="round" d="M80,39.4h0M94.9,40.6h0M109.7,41.9h0M124.6,54.6h0M139.4,65.9h0M154.3,77.5h0M169.1,87.4h0M184,91.6h0M198.9,92.9h0M213.7,95.6h0M228.6,97.1h0M243.4,98.1h0M258.3,110.3h0M273.1,121.8h0M288,132.9h0M302.9,143h0M317.7,153.9h0M332.6,165.3h0M347.4,175.3h0M362.3,179.3h0M377.1,182.6h0M392,184.9h0M406.9,186h0M421.7,187.9h0M436.6,190.3h0M451.4,196h0M466.3,199.9h0M481.1,201.7h0M496,204.2h0M510.9,206.8h0M525.7,208h0M540.6,209.1h0M555.4,210h0M570.3,212.8h0M585.1,214.7h0M600,215.8h0"/>
<text x="268.3" y="108.3" font-size="12">actual: 101 bits in 35 swaps</text>
</svg>
<figcaption>Figure 14.3. The LLL potential at work: log₂ D after each swap, for the scrambled 10-dimensional basis above (δ = 3/4). The proof only promises the dashed line, a drop of log₂(4/3) ≈ 0.415 bits per swap; the actual drops average almost 3 bits.</figcaption>
</figure>

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
<path fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="5 4" d="M70.0,60.5L83.6,60.5L97.2,60.5L110.8,60.5L124.4,60.5L137.9,60.5L151.5,60.5L165.1,60.5L178.7,60.5L192.3,60.5L205.9,60.5L219.5,60.5L233.1,60.5L246.7,60.5L260.3,60.5L273.8,60.5L287.4,60.5L301.0,60.5L314.6,60.5L328.2,60.5L341.8,220.0L355.4,220.0L369.0,220.0L382.6,220.0L396.2,220.0L409.7,220.0L423.3,220.0L436.9,220.0L450.5,220.0L464.1,220.0L477.7,220.0L491.3,220.0L504.9,220.0L518.5,220.0L532.1,220.0L545.6,220.0L559.2,220.0L572.8,220.0L586.4,220.0L600.0,220.0"/>
<path fill="none" stroke="currentColor" stroke-width="2" class="acc" d="M70.0,130.1L83.6,129.0L97.2,129.9L110.8,128.8L124.4,129.8L137.9,130.1L151.5,131.5L165.1,131.4L178.7,133.0L192.3,132.8L205.9,134.2L219.5,135.3L233.1,134.8L246.7,136.5L260.3,138.3L273.8,137.3L287.4,139.1L301.0,137.1L314.6,138.8L328.2,139.1L341.8,141.3L355.4,142.5L369.0,141.8L382.6,143.4L396.2,143.7L409.7,145.7L423.3,145.6L436.9,143.3L450.5,144.8L464.1,143.9L477.7,146.0L491.3,147.9L504.9,148.5L518.5,148.3L532.1,150.5L545.6,149.9L559.2,150.7L572.8,151.2L586.4,152.4L600.0,152.5"/>
<path class="acc" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" d="M70.0,130.1h0M83.6,129.0h0M97.2,129.9h0M110.8,128.8h0M124.4,129.8h0M137.9,130.1h0M151.5,131.5h0M165.1,131.4h0M178.7,133.0h0M192.3,132.8h0M205.9,134.2h0M219.5,135.3h0M233.1,134.8h0M246.7,136.5h0M260.3,138.3h0M273.8,137.3h0M287.4,139.1h0M301.0,137.1h0M314.6,138.8h0M328.2,139.1h0M341.8,141.3h0M355.4,142.5h0M369.0,141.8h0M382.6,143.4h0M396.2,143.7h0M409.7,145.7h0M423.3,145.6h0M436.9,143.3h0M450.5,144.8h0M464.1,143.9h0M477.7,146.0h0M491.3,147.9h0M504.9,148.5h0M518.5,148.3h0M532.1,150.5h0M545.6,149.9h0M559.2,150.7h0M572.8,151.2h0M586.4,152.4h0M600.0,152.5h0"/>
<text x="335.0" y="240" text-anchor="middle" font-size="12">index i = 1 … 40</text>
<text x="90" y="48" font-size="12">before LLL</text>
<text x="97.2" y="117.0" class="acc" font-size="12">after LLL</text>
</svg>
<figcaption>Figure 14.4. The Gram-Schmidt profile log₂‖bᵢ*‖ of a 40-dimensional q-ary basis (q = 10007) before LLL (a cliff) and after (a straight slope). Reduction flattens the profile; the product, the determinant, is unchanged, so lowering the left end raises the right.</figcaption>
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

### Nearest plane by hand

Take the good basis $b_1 = (3, 1)$, $b_2 = (-1, 4)$ and the target $t = (4, 7)$.
From §14.4, $b_1^* = (3, 1)$ with $\|b_1^*\|^2 = 10$, and $b_2^* = (-13/10, 39/10)$
with $\|b_2^*\|^2 = 16.9$.

The lattice lies on the lines $c_2 b_2 + \mathbb{R} b_1$, one for each integer
$c_2$, parallel to $b_1$ and $\|b_2^*\| = 13/\sqrt{10} \approx 4.11$ apart
(Figure 14.5). The method picks the nearest line, then the nearest point on it.

1. **Which line?** $\langle t, b_2^* \rangle / \|b_2^*\|^2 = (-5.2 + 27.3)/16.9 =
   22.1/16.9 = 17/13 \approx 1.31$. Round to $c_2 = 1$ and subtract $b_2$: the
   remaining target is $t - b_2 = (5, 3)$.
2. **Which point on it?** $\langle (5, 3), b_1^* \rangle / \|b_1^*\|^2 = 18/10 = 1.8$.
   Round to $c_1 = 2$ and subtract $2b_1$: what is left is $(5, 3) - (6, 2) = (-1,
   1)$, the error.
3. **Answer:** $t - (-1, 1) = (5, 6) = 2b_1 + b_2$, at distance $\sqrt{2}$ from $t$.

Checking every lattice point near $t$ confirms that $(5, 6)$ is the closest; the next
are $(2, 5)$ at distance $\sqrt{8}$ and $(4, 10)$ at distance 3. Rounding agrees here:
$t = \frac{23}{13}b_1 + \frac{17}{13}b_2$, and rounding both coefficients gives
$2b_1 + b_2$ as well. Note that the first coefficient of nearest plane, $17/13$, is the
true coefficient of $b_2$; this always holds for the last vector, because $b_n^*$ is
orthogonal to all the other $b_i$.

**Why the error is at most $\frac{1}{2}\sqrt{\sum\|b_i^*\|^2}$.** At step $i$ the
method makes the remaining target's component along $b_i^*$ at most $\frac{1}{2}\|b_i^*\|$
in length. Later steps subtract multiples of $b_j$ with $j < i$, and those have no
component along $b_i^*$, so they never undo it. The final error therefore has
coordinates of size at most $\frac{1}{2}\|b_i^*\|$ along the orthogonal directions
$b_i^*$, and its squared length is at most $\frac{1}{4}\sum_i \|b_i^*\|^2$. The set of
targets that land on a given lattice point is a box with sides $\|b_i^*\|$, the shaded
rectangle of Figure 14.5. Here the worst error is $\frac{1}{2}\sqrt{10 + 16.9}
\approx 2.59$.

<figure class="mars-fig">
<svg viewBox="0 0 640 410" width="640" role="img" aria-label="Babai nearest plane in the lattice of (3, 1) and (-1, 4): the lattice lies on lines parallel to b1 spaced 4.11 apart; the target (4, 7) is 0.31 of a spacing above the line through b2, so that line is chosen, and rounding along it gives the lattice point (5, 6); the shaded rectangle around (5, 6) is the set of targets that end there" fill="currentColor" font-size="14">
<line x1="345" y1="395" x2="419.7" y2="370.1" stroke="currentColor" stroke-opacity=".35" stroke-width="1"/>
<text x="425.7" y="374.1" font-size="12" fill-opacity=".7">c₂ = -1</text>
<line x1="30.6" y1="369.8" x2="419.4" y2="240.2" stroke="currentColor" stroke-opacity=".35" stroke-width="1"/>
<text x="425.4" y="244.2" font-size="12" fill-opacity=".7">c₂ = 0</text>
<line x1="30.3" y1="239.9" x2="420" y2="110" stroke="currentColor" stroke-opacity=".9" stroke-width="2"/>
<text x="426" y="114" font-size="12" fill-opacity=".7">c₂ = 1</text>
<line x1="30" y1="110" x2="300" y2="20" stroke="currentColor" stroke-opacity=".35" stroke-width="1"/>
<text x="306" y="24" font-size="12" fill-opacity=".7">c₂ = 2</text>
<path fill="currentColor" fill-opacity=".14" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3" d="M259.5,228.5L349.5,198.5L310.5,81.5L220.5,111.5Z"/>
<path fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" d="M45,365h0M135,335h0M105,215h0M75,95h0M225,305h0M195,185h0M165,65h0M345,395h0M315,275h0M285,155h0M255,35h0M405,245h0M375,125h0"/>
<g stroke="currentColor" stroke-width="2"><line x1="135" y1="335" x2="225" y2="305"/><line x1="135" y1="335" x2="105" y2="215"/></g>
<text x="229" y="319" font-size="13">b₁</text>
<text x="83" y="219" font-size="13">b₂</text>
<line x1="255" y1="125" x2="267" y2="161" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 3"/>
<line x1="267" y1="161" x2="285" y2="155" stroke="currentColor" stroke-width="1.5" stroke-dasharray="1 3"/>
<path d="M255 125 l6 6 m0 -6 l-6 6" stroke="currentColor" stroke-width="2" transform="translate(-3 -3)"/>
<text x="185" y="119" font-size="13">t = (4, 7)</text>
<path fill="none" stroke="currentColor" stroke-width="2" d="M279,155a6,6,0,1,0,12,0a6,6,0,1,0,-12,0"/>
<text x="295" y="173" font-size="13">(5, 6)</text>
<text x="478" y="50" font-size="12" xml:space="preserve">Lines 4.11 apart:</text>
<text x="478" y="70" font-size="12" xml:space="preserve">‖b₂*‖ = 13/√10.</text>
<text x="478" y="90" font-size="12" xml:space="preserve">⟨t, b₂*⟩/‖b₂*‖² = 17/13</text>
<text x="478" y="110" font-size="12" xml:space="preserve">≈ 1.31: line c₂ = 1,</text>
<text x="478" y="130" font-size="12" xml:space="preserve">so t − b₂ = (5, 3).</text>
<text x="478" y="150" font-size="12" xml:space="preserve">⟨(5, 3), b₁⟩/10 = 1.8:</text>
<text x="478" y="170" font-size="12" xml:space="preserve">round to c₁ = 2.</text>
<text x="478" y="190" font-size="12" xml:space="preserve">Answer 2b₁ + b₂ = (5, 6),</text>
<text x="478" y="210" font-size="12" xml:space="preserve">error (−1, 1).</text>
<text x="478" y="230" font-size="12" xml:space="preserve"></text>
<text x="478" y="250" font-size="12" xml:space="preserve">Shaded: the targets</text>
<text x="478" y="270" font-size="12" xml:space="preserve">sent to (5, 6).</text>
</svg>
<figcaption>Figure 14.5. Babai's nearest plane by hand. The lattice lies on lines parallel to b₁, spaced ‖b₂*‖ apart; the method first picks the nearest line (c₂ = 1), then the nearest lattice point on it. The shaded rectangle, with sides ‖b₁*‖ and ‖b₂*‖, is the cell of targets that end at (5, 6).</figcaption>
</figure>

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

### The dual lattice

The first step of nearest plane computed $\langle t, b_2^*\rangle/\|b_2^*\|^2$, the
inner product of $t$ with the vector $b_2^*/\|b_2^*\|^2 = (-1, 3)/13$. That vector has
inner product exactly 1 with $b_2$ and 0 with $b_1$, so it has an integer inner
product with every lattice vector. Vectors like it form a second lattice, and much
of lattice cryptanalysis happens there.

The **dual lattice** of $L$ is

$$
L^* = \{\, y \in \operatorname{span}(L) : \langle x, y \rangle \in \mathbb{Z}
\text{ for every } x \in L \,\}.
$$

For a full-rank basis $B$ (rows $b_i$), $y \in L^*$ exactly when $B y^T$ is an
integer vector, that is, $y^T \in B^{-1}\mathbb{Z}^n$. So the rows of

$$
D = (B^{-1})^T
$$

form a basis of $L^*$, the **dual basis**, characterized by $\langle b_i, d_j
\rangle = 1$ if $i = j$ and 0 otherwise. Three facts follow at once:
$\det L^* = |\det D| = 1/\det L$; the dual of $L^*$ is $L$ again; and the last dual
vector is $d_n = b_n^*/\|b_n^*\|^2$, which is what nearest plane used.

**By hand.** For $B = \begin{pmatrix} 3 & 1 \\ -1 & 4 \end{pmatrix}$, $B^{-1} =
\frac{1}{13}\begin{pmatrix} 4 & -1 \\ 1 & 3 \end{pmatrix}$, so $d_1 = \frac{1}{13}(4,
1)$ and $d_2 = \frac{1}{13}(-1, 3)$. Check: $\langle b_1, d_1 \rangle = (12 + 1)/13 =
1$, $\langle b_1, d_2 \rangle = (-3 + 3)/13 = 0$, $\langle b_2, d_1 \rangle = (-4 +
4)/13 = 0$, $\langle b_2, d_2 \rangle = (1 + 12)/13 = 1$; and $\det D = (12 + 1)/169
= 1/13$. In the plane the dual is always the lattice turned through a right angle and
divided by its determinant: $13 d_2 = (-1, 3)$ is $b_1 = (3, 1)$ turned by
$90°$.

**Layers.** Each nonzero $y \in L^*$ slices $L$ into parallel hyperplanes
$\{x : \langle x, y \rangle = k\}$, one for each integer $k$, spaced $1/\|y\|$ apart.
The lines of Figure 14.5 are the layers of $y = d_2$, spaced $13/\sqrt{10} \approx
4.11$. A *short* dual vector means a few, widely spaced layers; a lattice with a very
short dual vector is "flat", and it can be searched layer by layer.

**Transference.** Short vectors of $L$ and of $L^*$ cannot both be very short:

$$
1 \le \lambda_1(L)\,\lambda_n(L^*) \le n.
$$

The left inequality has a three-line proof. Let $x$ be a shortest nonzero vector of
$L$. Take $n$ independent vectors of $L^*$ of length at most $\lambda_n(L^*)$. They
span the whole space, so they cannot all be orthogonal to $x$; for one of them, $y$,
the integer $\langle x, y \rangle$ is nonzero, and $1 \le |\langle x, y \rangle| \le
\|x\|\,\|y\| \le \lambda_1(L)\,\lambda_n(L^*)$. The right inequality is Wojciech
Banaszczyk's theorem (1993), proved with Gaussian measures on lattices, the same tool
behind the worst-case reductions of the next chapter. In the example, $\lambda_1(L)
= \sqrt{10}$ and $\lambda_2(L^*) = \sqrt{17}/13$, with product $\sqrt{170}/13 \approx
1.003$, between 1 and 2.

**The mathematics of the dual attack.** Let $t = v + e$ with $v \in L$ and a small
error $e$. For any $y \in L^*$,

$$
\langle y, t \rangle = \langle y, v \rangle + \langle y, e \rangle \equiv \langle y,
e \rangle \pmod 1,
$$

because $\langle y, v \rangle$ is an integer. If $\|y\|\,\|e\|$ is small, $\langle
y, t\rangle$ is close to an integer; for a random $t$ it is spread evenly modulo 1. When
$e$ has independent Gaussian coordinates of standard deviation $\sigma$, the average
of $\cos(2\pi\langle y, t\rangle)$ is exactly

$$
\varepsilon = \exp\!\left(-2\pi^2\sigma^2\|y\|^2\right),
$$

against 0 for random targets. Telling the two apart takes about $1/\varepsilon^2$
samples, so the attacker wants $\|y\|$ as small as possible: that means reducing the
dual lattice, with LLL or BKZ. The code computes the dual basis of the example and
measures the average for three values of $\sigma$.

```python
# Uses det(), dot() and the good basis from the listings above.
# The dual lattice: its basis is D = (B^-1)^T, so that <b_i, d_j> is 1 when i = j and 0 otherwise.
import math, random

def inverse(M):
    n = len(M)
    A = [[Fraction(x) for x in row] + [Fraction(int(i == j)) for j in range(n)] for i, row in enumerate(M)]
    for i in range(n):
        p = next(r for r in range(i, n) if A[r][i] != 0)
        A[i], A[p] = A[p], A[i]
        A[i] = [x / A[i][i] for x in A[i]]
        for r in range(n):
            f = A[r][i]
            if r != i and f != 0:
                A[r] = [x - f * y for x, y in zip(A[r], A[i])]
    return [row[n:] for row in A]

def dual_basis(B):
    return [list(col) for col in zip(*inverse(B))]

D = dual_basis(good)
print([[str(x) for x in d] for d in D], det(D), [[int(dot(b, d)) for d in D] for b in good])

# A short dual vector y sees how far t is from the lattice: <y, t> = <y, e> mod 1.
y = D[1]                                      # (-1, 3)/13, a shortest vector of the dual
rnd = random.Random(6)
def score(targets):                           # the average of cos(2 pi <y, t>)
    return sum(math.cos(2 * math.pi * float(dot(y, t))) for t in targets) / len(targets)
for sigma in (0.5, 1.0, 2.0):
    near = []
    for _ in range(4000):
        a, b = rnd.randrange(-50, 50), rnd.randrange(-50, 50)
        v = [a * good[0][j] + b * good[1][j] for j in range(2)]
        near.append([x + rnd.gauss(0, sigma) for x in v])
    predicted = math.exp(-2 * math.pi ** 2 * sigma ** 2 * float(dot(y, y)))
    print(sigma, round(score(near), 3), round(predicted, 3))
far = [[rnd.uniform(-200, 200), rnd.uniform(-200, 200)] for _ in range(4000)]
print("uniform", round(score(far), 3))
```

It prints:

```text
[['4/13', '1/13'], ['-1/13', '3/13']] 1/13 [[1, 0], [0, 1]]
0.5 0.74 0.747
1.0 0.297 0.311
2.0 0.001 0.009
uniform -0.002
```

With $\sigma = 0.5$ and $\sigma = 1$ the measured averages match the formula and stand
far above the uniform value. With $\sigma = 2$ the predicted signal, 0.009, is
smaller than the noise of 4,000 samples (about $1/\sqrt{8000} \approx 0.011$), and the
test sees nothing; it would need some $1/0.009^2 \approx 12{,}000$ samples or more,
or a shorter dual vector. At cryptographic sizes this trade, between how much
reduction buys a short $y$ and how many samples the test then needs, is the dual
attack on LWE. The *Post-quantum cryptography* book runs it on LWE samples in
[chapter 6, §6.3](../post-quantum/06-Lattice-Reduction-and-the-Estimator.md#the-other-way-in-a-dual-distinguisher)
and costs it at full size in
[§6.9](../post-quantum/06-Lattice-Reduction-and-the-Estimator.md#69-the-dual-attack).

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
is an exact SVP solver. Step 2 needs an exact SVP solver: the enumeration of §14.6,
whose `enum()` already handles a projected block.

### BKZ in miniature

A small but complete BKZ needs three more pieces.

- **A faster LLL.** The exact LLL of §14.8 is slow in dimension 40 because its
  fractions grow. The version below keeps the basis in integers and only the
  Gram-Schmidt data in floating point, with the same update formulas. For entries
  of a few thousand in dimension 50, double precision is ample; real libraries such as
  fplll switch precision automatically when it is not.
- **Insertion without dependency.** The textbook BKZ inserts the new vector $v =
  \sum x_i b_{k+i}$ in front of the block and runs LLL on $n + 1$ vectors to remove
  the dependency. Since the shortest vector has coefficients with greatest common
  divisor 1, there is a neater way: Euclid's algorithm on the coefficients. Replacing
  $b_j$ by $b_j + q b_i$ keeps the lattice and changes the coefficient $x_i$ into
  $x_i - q x_j$. Repeating with $q = \lfloor x_i/x_j \rfloor$ shrinks the coefficients
  exactly as Euclid shrinks remainders, until only one is left, equal to $\pm 1$. That
  basis vector is now $\pm v$, and it moves to position $k$.
- **Tours.** Run over $k = 1, \ldots, n - 1$, enumerate the block, and insert
  whenever the block holds a projected vector shorter than $b_k^*$ (by a small margin,
  to keep floating-point ties from looping forever). Stop after a tour with no
  insertion.

The test lattices are random $q$-ary lattices of dimension 40 with $q = 10007$, the
kind §14.8 used. For each of six lattices the program runs LLL, then BKZ with block
sizes 3, 4, 6, 8 and 10, each starting from the last (progressive BKZ), and averages
the root Hermite factor $(\|b_1\|/(\det L)^{1/n})^{1/n}$.

```python
# Uses gso_float() and enum() from the listing above.
# BKZ in miniature: LLL with floating-point Gram-Schmidt data, then exact SVP in every block.
def lll_fp(B, delta=0.99):
    """The LLL of section 14.8 with float Gram-Schmidt data: fast, and safe for small entries."""
    B = [list(b) for b in B]
    n = len(B)
    r, mu = gso_float(B)
    k = 1
    while k < n:
        for j in range(k - 1, -1, -1):
            q = round(mu[k][j])
            if q:
                B[k] = [a - q * b for a, b in zip(B[k], B[j])]
                for i in range(j):
                    mu[k][i] -= q * mu[j][i]
                mu[k][j] -= q
        if r[k] >= (delta - mu[k][k - 1] ** 2) * r[k - 1]:
            k += 1
            continue
        B[k], B[k - 1] = B[k - 1], B[k]
        m = mu[k][k - 1]
        new = r[k] + m * m * r[k - 1]
        mu[k][k - 1] = m * r[k - 1] / new
        r[k] = r[k - 1] * r[k] / new
        r[k - 1] = new
        for j in range(k - 1):
            mu[k - 1][j], mu[k][j] = mu[k][j], mu[k - 1][j]
        for i in range(k + 1, n):
            t = mu[i][k]
            mu[i][k] = mu[i][k - 1] - m * t
            mu[i][k - 1] = t + mu[k][k - 1] * mu[i][k]
        k = max(k - 1, 1)
    return B

def insert(B, k, x):
    """Make v = sum x_i b_(k+i) the vector b_k, by Euclid on the coefficients (gcd 1)."""
    while sum(1 for c in x if c) > 1:
        j = min((i for i in range(len(x)) if x[i]), key=lambda i: abs(x[i]))
        for i in range(len(x)):
            if i != j and x[i]:
                q = x[i] // x[j]                  # b_j += q b_i turns x_i into x_i - q x_j
                B[k + j] = [a + q * b for a, b in zip(B[k + j], B[k + i])]
                x[i] -= q * x[j]
    j = next(i for i in range(len(x)) if x[i])
    B.insert(k, B.pop(k + j))

def bkz(B, beta):
    B = lll_fp(B)
    while True:                               # tours, until one changes nothing
        changed = False
        for k in range(len(B) - 1):
            r, mu = gso_float(B)
            x, _, _ = enum(r, mu, 0.999 * r[k], k, min(k + beta, len(B)), shrink=True)
            if x is not None:                 # a projected vector shorter than b_k*
                insert(B, k, x)
                B = lll_fp(B)
                changed = True
        if not changed:
            return B

def qary(n, q, rng):
    A = [[rng.randrange(q) for _ in range(n)] for _ in range(n)]
    return ([[int(i == j) for j in range(n)] + A[i] for i in range(n)] +
            [[0] * n + [q * int(i == j) for j in range(n)] for i in range(n)])

n, q, trials = 40, 10007, 6
logdet = (n // 2) * math.log(q)
gh = math.exp((logdet - math.log(ball_volume(n, 1))) / n)
print("Gaussian heuristic", round(gh, 1), "root Hermite factor", round((gh / math.exp(logdet / n)) ** (1 / n), 4))
total = {}
for s in range(trials):
    B = qary(n // 2, q, random.Random(s))
    for beta in (2, 3, 4, 6, 8, 10):
        B = lll_fp(B) if beta == 2 else bkz(B, beta)   # progressive: each size starts from the last
        b1 = math.sqrt(sum(a * a for a in B[0]))
        total[beta] = total.get(beta, 0) + ((b1 / math.exp(logdet / n)) ** (1 / n)) / trials
print([(beta, round(f, 4)) for beta, f in total.items()])
```

It prints:

```text
Gaussian heuristic 162.6 root Hermite factor 1.0122
[(2, 1.0176), (3, 1.0145), (4, 1.0135), (6, 1.0132), (8, 1.0129), (10, 1.0127)]
```

The first line is the floor: a vector as short as the Gaussian heuristic predicts
would have root Hermite factor 1.0122 in dimension 40. LLL ends at 1.0176. Block size
3 already closes more than half of the gap, block size 4 three quarters of it, and
from then on each step buys less: 1.0132, 1.0129, 1.0127. Figure 14.6 shows the same
program on 20 lattices each in dimensions 40 and 50, with block sizes up to 20.

<figure class="mars-fig">
<svg viewBox="0 0 640 310" width="640" role="img" aria-label="Average root Hermite factor reached by BKZ as the block size grows from 2 (LLL) to 20, on 20 random q-ary lattices in dimension 40 and 20 in dimension 50: it falls from about 1.0175 to about 1.0123, down to the Gaussian-heuristic floor near 1.012, far below the 1.0219 that LLL reaches in high dimension" fill="currentColor" font-size="14">
<g stroke="currentColor" stroke-width="1" fill="none" opacity=".6"><line x1="80" y1="250" x2="610" y2="250"/><line x1="80" y1="250" x2="80" y2="20"/></g>
<text x="72" y="254" text-anchor="end" font-size="12">1.010</text>
<line x1="80" y1="250" x2="600" y2="250" stroke="currentColor" stroke-opacity=".12"/>
<text x="72" y="220.2" text-anchor="end" font-size="12">1.012</text>
<line x1="80" y1="216.2" x2="600" y2="216.2" stroke="currentColor" stroke-opacity=".12"/>
<text x="72" y="186.3" text-anchor="end" font-size="12">1.014</text>
<line x1="80" y1="182.3" x2="600" y2="182.3" stroke="currentColor" stroke-opacity=".12"/>
<text x="72" y="152.5" text-anchor="end" font-size="12">1.016</text>
<line x1="80" y1="148.5" x2="600" y2="148.5" stroke="currentColor" stroke-opacity=".12"/>
<text x="72" y="118.6" text-anchor="end" font-size="12">1.018</text>
<line x1="80" y1="114.6" x2="600" y2="114.6" stroke="currentColor" stroke-opacity=".12"/>
<text x="72" y="84.8" text-anchor="end" font-size="12">1.020</text>
<line x1="80" y1="80.8" x2="600" y2="80.8" stroke="currentColor" stroke-opacity=".12"/>
<text x="72" y="50.9" text-anchor="end" font-size="12">1.022</text>
<line x1="80" y1="46.9" x2="600" y2="46.9" stroke="currentColor" stroke-opacity=".12"/>
<text x="80" y="268" text-anchor="middle" font-size="12">2</text>
<text x="108.9" y="268" text-anchor="middle" font-size="12">3</text>
<text x="137.8" y="268" text-anchor="middle" font-size="12">4</text>
<text x="166.7" y="268" text-anchor="middle" font-size="12">5</text>
<text x="195.6" y="268" text-anchor="middle" font-size="12">6</text>
<text x="253.3" y="268" text-anchor="middle" font-size="12">8</text>
<text x="311.1" y="268" text-anchor="middle" font-size="12">10</text>
<text x="368.9" y="268" text-anchor="middle" font-size="12">12</text>
<text x="484.4" y="268" text-anchor="middle" font-size="12">16</text>
<text x="600" y="268" text-anchor="middle" font-size="12">20</text>
<text x="340" y="290" text-anchor="middle" font-size="12">block size β (2 = LLL)</text>
<line x1="80" y1="48.6" x2="600" y2="48.6" stroke="currentColor" stroke-width="1.5" stroke-dasharray="8 4"/>
<text x="600" y="42.6" font-size="12" text-anchor="end">LLL in high dimension (Gama and Nguyen): 1.0219</text>
<line x1="80" y1="212.8" x2="600" y2="212.8" stroke="currentColor" stroke-opacity=".6" stroke-width="1" stroke-dasharray="2 3"/>
<path fill="none" stroke="currentColor" stroke-width="2"  d="M80,124.8L108.9,155.2L137.8,170.5L166.7,184L195.6,187.4L253.3,199.2L311.1,202.6L368.9,204.3L484.4,207.7L600,211.1"/>
<path fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" d="M80,124.8h0M108.9,155.2h0M137.8,170.5h0M166.7,184h0M195.6,187.4h0M253.3,199.2h0M311.1,202.6h0M368.9,204.3h0M484.4,207.7h0M600,211.1h0"/>
<line x1="80" y1="219.5" x2="600" y2="219.5" stroke="currentColor" stroke-opacity=".6" stroke-width="1" stroke-dasharray="2 3"/>
<path fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="6 4" d="M80,123.1L108.9,158.6L137.8,172.2L166.7,178.9L195.6,182.3L253.3,187.4L311.1,195.8L368.9,197.5L484.4,202.6L600,209.4"/>
<path fill="none" stroke="currentColor" stroke-width="1.4" d="M76.8,123.1a3.2,3.2,0,1,0,6.4,0a3.2,3.2,0,1,0,-6.4,0M105.7,158.6a3.2,3.2,0,1,0,6.4,0a3.2,3.2,0,1,0,-6.4,0M134.6,172.2a3.2,3.2,0,1,0,6.4,0a3.2,3.2,0,1,0,-6.4,0M163.5,178.9a3.2,3.2,0,1,0,6.4,0a3.2,3.2,0,1,0,-6.4,0M192.4,182.3a3.2,3.2,0,1,0,6.4,0a3.2,3.2,0,1,0,-6.4,0M250.1,187.4a3.2,3.2,0,1,0,6.4,0a3.2,3.2,0,1,0,-6.4,0M307.9,195.8a3.2,3.2,0,1,0,6.4,0a3.2,3.2,0,1,0,-6.4,0M365.7,197.5a3.2,3.2,0,1,0,6.4,0a3.2,3.2,0,1,0,-6.4,0M481.2,202.6a3.2,3.2,0,1,0,6.4,0a3.2,3.2,0,1,0,-6.4,0M596.8,209.4a3.2,3.2,0,1,0,6.4,0a3.2,3.2,0,1,0,-6.4,0"/>
<text x="600" y="235.5" font-size="12" text-anchor="end" fill-opacity=".8">Gaussian heuristic: 1.0122 (n = 40), 1.0118 (n = 50)</text>
<text x="166.7" y="128.2" font-size="12">filled, solid: n = 40</text>
<text x="166.7" y="146.8" font-size="12">open, dashed: n = 50</text>
</svg>
<figcaption>Figure 14.6. BKZ in miniature: the average root Hermite factor of b₁ after LLL and after BKZ-β, on 20 random q-ary lattices (q = 10007) in dimension 40 and 20 in dimension 50, each block size starting from the last. Larger blocks walk the factor down to the Gaussian-heuristic floor of these small dimensions (dotted lines). The top line is LLL in high dimension.</figcaption>
</figure>

Three things stand out. First, all the measured factors lie below 1.0219, LLL's
value in high dimension: in dimension 40 even LLL is helped by small-dimension
effects, as Gama and Nguyen observed. Second, the curves flatten onto the heuristic
floor; once BKZ finds a vector near $\mathrm{GH}(L)$ there is nothing shorter to find.
Third, the gains are small only because the dimension is small. The whole gap between
LLL and the floor is, in dimension 40, a factor of $(1.0176/1.0122)^{40} \approx 1.24$
in the length of $b_1$. But it is raised to the power $n$: in dimension 1000 the
difference between LLL (1.0219) and BKZ-400 (1.0040) is a factor of
$(1.0219/1.0040)^{1000}$, more than $2^{25}$. That exponential gap is what large block
sizes buy, and what they cost.

### What a better basis buys the search

The program below enumerates the same 32-dimensional lattice twice, with radius 5
percent above the Gaussian heuristic, once on its LLL-reduced basis and once after
BKZ-10, and compares the node counts with the prediction $\sum_k N_k$.

```python
# Uses bkz(), qary(), enum(), gso_float() and ball_volume() from the listings above.
n = 32
logdet = (n // 2) * math.log(q)
R = 1.05 * math.exp((logdet - math.log(ball_volume(n, 1))) / n)   # 5 percent above the heuristic
B_lll = lll_fp(qary(n // 2, q, random.Random(7)))
for name, B in (("LLL", B_lll), ("BKZ-10", bkz(B_lll, 10))):
    r, mu = gso_float(B)
    x, l, nodes = enum(r, mu, R * R)
    pred = [ball_volume(k, R) / math.prod(math.sqrt(v) for v in r[n - k:]) for k in range(1, n + 1)]
    print(name, sum(nodes), round(sum(pred)), nodes.index(max(nodes)) + 1, round(math.sqrt(l), 1))
```

It prints:

```text
LLL 262292 261962 13 148.8
BKZ-10 100550 100521 14 148.8
```

Each line gives the nodes visited, the nodes predicted, the busiest level, and the
length of the shortest vector found (the same vector both times, just above the
heuristic's 147.2). The prediction is accurate to within a fraction of a percent, and
BKZ-10 cut the search by a factor of 2.6. Figure 14.7 shows where: the hump in the
middle of the tree is lower. At block sizes in the hundreds the same effect is worth
far more, and the best enumeration codes also prune the tree, cutting branches that
are unlikely to lead anywhere (Gama, Nguyen and Regev's extreme pruning, 2010).

<figure class="mars-fig">
<svg viewBox="0 0 640 310" width="640" role="img" aria-label="Nodes per level of the enumeration tree in a 32-dimensional lattice, on a log scale: a hump peaking near level 13 at about 2 to the 14.7 nodes for the LLL-reduced basis and 2 to the 13.3 for the BKZ-10 basis; the Gaussian-heuristic predictions, drawn as lines, pass through the measured points" fill="currentColor" font-size="14">
<g stroke="currentColor" stroke-width="1" fill="none" opacity=".6"><line x1="70" y1="250" x2="610" y2="250"/><line x1="70" y1="250" x2="70" y2="30"/></g>
<text x="62" y="254" text-anchor="end" font-size="12">2^0</text>
<text x="62" y="201.5" text-anchor="end" font-size="12">2^4</text>
<line x1="70" y1="197.5" x2="600" y2="197.5" stroke="currentColor" stroke-opacity=".15"/>
<text x="62" y="149" text-anchor="end" font-size="12">2^8</text>
<line x1="70" y1="145" x2="600" y2="145" stroke="currentColor" stroke-opacity=".15"/>
<text x="62" y="96.5" text-anchor="end" font-size="12">2^12</text>
<line x1="70" y1="92.5" x2="600" y2="92.5" stroke="currentColor" stroke-opacity=".15"/>
<text x="62" y="44" text-anchor="end" font-size="12">2^16</text>
<line x1="70" y1="40" x2="600" y2="40" stroke="currentColor" stroke-opacity=".15"/>
<text x="70" y="268" text-anchor="middle" font-size="12">1</text>
<text x="189.7" y="268" text-anchor="middle" font-size="12">8</text>
<text x="326.5" y="268" text-anchor="middle" font-size="12">16</text>
<text x="463.2" y="268" text-anchor="middle" font-size="12">24</text>
<text x="600" y="268" text-anchor="middle" font-size="12">32</text>
<text x="335" y="290" text-anchor="middle" font-size="12">level k (coefficients fixed, from the last one)</text>
<path fill="none" stroke="currentColor" stroke-width="1.5"  d="M70,219.5L87.1,193.1L104.2,170.4L121.3,150.3L138.4,132.9L155.5,116.4L172.6,101.6L189.7,89.2L206.8,79.1L223.9,72.5L241,65L258.1,59.6L275.2,57.5L292.3,57.5L309.4,58.5L326.5,60.4L343.5,61.3L360.6,64L377.7,66.3L394.8,70.7L411.9,77.9L429,86L446.1,93.2L463.2,102.3L480.3,113.8L497.4,125.4L514.5,137.9L531.6,151.1L548.7,165.6L565.8,182.2L582.9,200.8L600,220.4"/>
<path fill="none" stroke="currentColor" stroke-width="5.6" stroke-linecap="round" d="M70,219.5h0M87.1,192.4h0M104.2,169.3h0M121.3,149h0M138.4,132.6h0M155.5,116.6h0M172.6,102.1h0M189.7,89.3h0M206.8,79h0M223.9,72.3h0M241,64.8h0M258.1,59.5h0M275.2,57.4h0M292.3,57.5h0M309.4,58.6h0M326.5,60.6h0M343.5,61.5h0M360.6,64.1h0M377.7,66.2h0M394.8,70.7h0M411.9,78h0M429,85.4h0M446.1,92.7h0M463.2,101.9h0M480.3,113.9h0M497.4,126h0M514.5,138.3h0M531.6,151.6h0M548.7,167.3h0M565.8,187.6h0M582.9,208.4h0M600,229.2h0"/>
<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="6 4" d="M70,222.3L87.1,198.4L104.2,177.5L121.3,160.9L138.4,144.8L155.5,130.7L172.6,119.4L189.7,108.3L206.8,99.8L223.9,92.9L241,85.3L258.1,80.4L275.2,77.4L292.3,75.6L309.4,75.6L326.5,76.7L343.5,78.2L360.6,81.6L377.7,84.3L394.8,88.3L411.9,94.9L429,101.7L446.1,108.8L463.2,117.8L480.3,127.7L497.4,138.5L514.5,151.2L531.6,164.2L548.7,177.5L565.8,191.4L582.9,205.6L600,220.4"/>
<path fill="none" stroke="currentColor" stroke-width="1.3" d="M67,219.5a3,3,0,1,0,6,0a3,3,0,1,0,-6,0M84.1,198.7a3,3,0,1,0,6,0a3,3,0,1,0,-6,0M101.2,176.3a3,3,0,1,0,6,0a3,3,0,1,0,-6,0M118.3,159.2a3,3,0,1,0,6,0a3,3,0,1,0,-6,0M135.4,144.5a3,3,0,1,0,6,0a3,3,0,1,0,-6,0M152.5,131.6a3,3,0,1,0,6,0a3,3,0,1,0,-6,0M169.6,120a3,3,0,1,0,6,0a3,3,0,1,0,-6,0M186.7,108.6a3,3,0,1,0,6,0a3,3,0,1,0,-6,0M203.8,100a3,3,0,1,0,6,0a3,3,0,1,0,-6,0M220.9,93.2a3,3,0,1,0,6,0a3,3,0,1,0,-6,0M238,85.5a3,3,0,1,0,6,0a3,3,0,1,0,-6,0M255.1,80.4a3,3,0,1,0,6,0a3,3,0,1,0,-6,0M272.2,77.4a3,3,0,1,0,6,0a3,3,0,1,0,-6,0M289.3,75.5a3,3,0,1,0,6,0a3,3,0,1,0,-6,0M306.4,75.6a3,3,0,1,0,6,0a3,3,0,1,0,-6,0M323.5,76.7a3,3,0,1,0,6,0a3,3,0,1,0,-6,0M340.5,78.1a3,3,0,1,0,6,0a3,3,0,1,0,-6,0M357.6,81.7a3,3,0,1,0,6,0a3,3,0,1,0,-6,0M374.7,84.1a3,3,0,1,0,6,0a3,3,0,1,0,-6,0M391.8,88.4a3,3,0,1,0,6,0a3,3,0,1,0,-6,0M408.9,95.3a3,3,0,1,0,6,0a3,3,0,1,0,-6,0M426,101.3a3,3,0,1,0,6,0a3,3,0,1,0,-6,0M443.1,108.6a3,3,0,1,0,6,0a3,3,0,1,0,-6,0M460.2,116.6a3,3,0,1,0,6,0a3,3,0,1,0,-6,0M477.3,127.4a3,3,0,1,0,6,0a3,3,0,1,0,-6,0M494.4,138.1a3,3,0,1,0,6,0a3,3,0,1,0,-6,0M511.5,150.5a3,3,0,1,0,6,0a3,3,0,1,0,-6,0M528.6,164.6a3,3,0,1,0,6,0a3,3,0,1,0,-6,0M545.7,179.7a3,3,0,1,0,6,0a3,3,0,1,0,-6,0M562.8,196.4a3,3,0,1,0,6,0a3,3,0,1,0,-6,0M579.9,208.4a3,3,0,1,0,6,0a3,3,0,1,0,-6,0M597,229.2a3,3,0,1,0,6,0a3,3,0,1,0,-6,0"/>
<text x="76" y="37.4" font-size="12">filled dots, solid line: LLL basis, 262,292 nodes</text>
<text x="76" y="50.5" font-size="12">open dots, dashed line: BKZ-10 basis, 100,550 nodes</text>
<text x="497.4" y="37.4" font-size="12" fill-opacity=".7">dots: counted</text>
<text x="497.4" y="50.5" font-size="12" fill-opacity=".7">lines: predicted</text>
</svg>
<figcaption>Figure 14.7. The enumeration tree of a 32-dimensional q-ary lattice, radius 1.05 times the Gaussian heuristic, level by level. Filled dots: the LLL-reduced basis; open dots: the same lattice after BKZ-10. The lines are the Gaussian-heuristic prediction Vₖ(R) divided by the product of the last k Gram-Schmidt lengths; the better basis lowers the hump.</figcaption>
</figure>

### At full size

The root Hermite factor achieved by BKZ-$\beta$ in high dimension is predicted by

$$
\delta_\beta \approx \left(\frac{\beta}{2\pi e}(\pi\beta)^{1/\beta}\right)^{1/(2(\beta
- 1))},
$$

for example about 1.0121 for $\beta = 50$ and 1.0040 for $\beta = 400$. The formula
comes from the Gaussian heuristic applied to each block, and it is only meant for
$\beta$ above about 50; for the small blocks above it gives nonsense, which is why
Figure 14.6 does not draw it. The cost is dominated by the SVP solver in dimension
$\beta$: enumeration, as above, or sieving (which keeps a huge list of lattice vectors
and repeatedly combines pairs into shorter ones). The **core-SVP** model counts the
cost of one call, $2^{0.292\beta}$ classically and $2^{0.265\beta}$ quantumly in the
original estimates; it is the yardstick in which the security of ML-KEM and ML-DSA is
quoted. Enumeration's $2^{\Theta(\beta\log\beta)}$ loses to sieving's $2^{0.292\beta}$
somewhere between dimension 70 and 100 in practice.

!!! note "Life story: BKZ"
    **Born:** 1987, Claus-Peter Schnorr; the practical form with Martin Euchner, 1994 ·
    **Purpose:** to fill the gap between LLL and exact SVP by solving SVP in blocks ·
    **Helped:** solved low-density subset sums (1994) and, in improved forms (BKZ 2.0
    in 2011, sieving inside BKZ from 2019), set the public lattice records ·
    **Status:** current; its block size is the unit in which ML-KEM and ML-DSA security
    is quoted

The *Post-quantum cryptography* book takes this further: [chapter 5](../post-quantum/05-Lattices-and-Their-Hard-Problems.md)
on the hard problems and [chapter 6](../post-quantum/06-Lattice-Reduction-and-the-Estimator.md)
on BKZ simulators, sieving, memory costs and the lattice estimator at full size.

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
  timing leaks of a few bits. *Cryptanalysis* tells the full story in [chapter 15](../cryptanalysis/15-Lattices-as-a-Weapon.md).
- **Coppersmith's method** (Don Coppersmith, 1996) uses LLL to find small roots of
  polynomials modulo $N$; it breaks RSA with small public exponent in stereotyped
  messages, and with partly known factors (the ROCA attack on Infineon keys in 2017
  used it).
- **Records.** The Darmstadt SVP challenge has been solved up to dimension 180 (Léo
  Ducas, Marc Stevens and Wessel van Woerden, 2021, sieving on GPUs).

## Going deeper

- *Self-dual BKZ.* Reducing the dual basis in reverse order is the same as reducing
  the lattice, so tours can alternate between $L$ and $L^*$ (§14.9). Daniele
  Micciancio and Michael Walter (2016) built a BKZ variant this way whose behavior is
  easier to predict and prove.
- *HKZ and Minkowski reduction.* Stronger notions than LLL, with each $b_i^*$ a
  shortest vector of the projected lattice; BKZ interpolates between LLL and HKZ, and
  Kannan's enumeration (§14.6) computes an HKZ basis recursively.
- *Floating-point LLL.* Exact fractions grow large; practical implementations
  (fplll, NTL) use carefully controlled floating point, as the `lll_fp` of §14.10
  does informally, with provable versions such as the $L^2$ algorithm of Nguyen and
  Damien Stehlé (2005).
- *Sieving in a page.* The Gauss sieve of Micciancio and Panagiotis Voulgaris (2010)
  keeps a list of lattice vectors and reduces each new vector against the list, and
  the list against it, until a shortest vector appears; it fits in about as much
  Python as the enumeration of §14.10, and it is the ancestor of the sieves behind the
  $2^{0.292\beta}$ estimate.
- *Smoothing parameter and Gaussians on lattices.* The discrete Gaussian of the next
  chapter, Banaszczyk's transference bound and the worst-case reductions rest on
  Fourier analysis over $L$ and $L^*$ (Micciancio and Regev, 2004).

## Check yourself

??? question "1. Do $(2, 0), (1, 2)$ and $(1, 0), (0, 4)$ generate the same lattice?"

    Both have determinant 4, so it is possible; check whether each basis vector is an
    integer combination of the other basis. $(1, 0)$ would need $a(2, 0) + b(1, 2)$ with
    $2b = 0$, so $b = 0$ and $a = \frac{1}{2}$: not an integer. No.

??? question "2. Reduce $u = (1, 0)$, $v = (7, 1)$ by Gauss-Lagrange."

    $\langle u, v \rangle / \langle u, u \rangle = 7$, so $v \leftarrow (0, 1)$. Now
    $\|v\| = \|u\|$: stop. The reduced basis is $(1, 0), (0, 1)$.

??? question "3. Find the dual basis of $(2, 0), (1, 2)$, and check its determinant."

    $B^{-1} = \frac{1}{4}\begin{pmatrix} 2 & 0 \\ -1 & 2 \end{pmatrix}$, so the rows of
    $(B^{-1})^T$ are $d_1 = (\frac{1}{2}, -\frac{1}{4})$ and $d_2 = (0, \frac{1}{2})$.
    Check: $\langle b_1, d_1 \rangle = 1$, $\langle b_1, d_2 \rangle = 0$,
    $\langle b_2, d_1 \rangle = \frac{1}{2} - \frac{1}{2} = 0$, $\langle b_2, d_2
    \rangle = 1$. The determinant is $\frac{1}{2}\cdot\frac{1}{2} = \frac{1}{4} =
    1/\det L$.

??? question "4. A lattice in dimension 100 has determinant $2^{500}$. What does Minkowski's bound say, and what does the Gaussian heuristic predict?"

    $\lambda_1 \le \sqrt{100} \cdot 2^{5} = 320$ with the cube, and about half that
    (twice the heuristic, about 154) with the ball. The Gaussian heuristic predicts
    $\sqrt{100/(2\pi e)} \cdot 32 \approx 2.42 \cdot 32 \approx 77$.

??? question "5. LLL with $\delta = 3/4$ starts on an integer basis in the plane with $\|b_1\|^2 = 338$. At most how many swaps can it make, and why?"

    In two dimensions the potential is $D = \|b_1\|^2$, a positive integer. Each swap
    multiplies it by less than $3/4$, so after $s$ swaps $1 \le D < 338 \cdot
    (3/4)^s$, which forces $(4/3)^s < 338$, $s < 20.3$: at most 20 swaps. On the basis
    $(13, 13), (18, 19)$ it made two.

??? question "6. LLL with $\delta = 3/4$ in dimension 60 guarantees $\|b_1\| \le 2^{29.5}\lambda_1$. Is that why lattice cryptography is safe?"

    No. The guarantee is a worst case; in practice LLL achieves about $1.022^{60}
    \approx 3.7$ times the volume bound. Lattice cryptography is safe because the
    dimensions are in the hundreds and the required approximation factors are
    small, so even BKZ with large blocks is needed, at exponential cost.

??? question "7. Run nearest plane with the basis $(3, 1), (-1, 4)$ on $t = (7, 3)$. How far off can the answer be, at worst?"

    $\langle t, b_2^* \rangle/\|b_2^*\|^2 = (-9.1 + 11.7)/16.9 \approx 0.15$, so $c_2 =
    0$. Then $\langle t, b_1 \rangle/10 = 2.4$, so $c_1 = 2$: the answer is $(6, 2)$,
    with error $(1, 1)$ of length $\sqrt{2}$. The worst case for this basis is
    $\frac{1}{2}\sqrt{\|b_1^*\|^2 + \|b_2^*\|^2} = \frac{1}{2}\sqrt{26.9} \approx 2.59$.

??? question "8. What is the density of a knapsack with 100 weights of 200 bits each? Will the CJLOSS attack apply?"

    $100/200 = 0.5 < 0.9408$: yes, in principle. In dimension 101 LLL alone may not
    be enough, but BKZ with moderate blocks is.

??? question "9. Why does GGH need a *bad* public basis but Babai with a *good* private one?"

    Decryption is BDD; it works only when the cells of the basis are round enough
    to contain the error ball. The public basis must be bad so that an attacker
    cannot do the same, and LLL and BKZ are precisely tools for turning bad bases
    into good ones.

??? question "10. Enumerating the same lattice with the same radius visited 262,292 nodes on an LLL basis and 100,550 after BKZ-10. The vectors found at the bottom are the same; what changed?"

    The middle of the tree. Level $k$ holds the points of a projected lattice inside
    the radius, about $V_k(R)$ divided by the product of the last $k$ Gram-Schmidt
    lengths. BKZ leaves the full product (the determinant) alone but flattens the
    profile, which lengthens the last Gram-Schmidt vectors; the denominators grow and
    the hump of the tree shrinks. The bottom level, the lattice vectors themselves
    inside the radius, cannot change.

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
- LLL stops because the potential $D = d_1 \cdots d_{n-1}$, a positive integer, falls
  by a factor below $\delta$ at every swap; in practice it falls much faster.
- The ball version of Minkowski gives $\lambda_1 \le 2\,\mathrm{GH}(L)$; a lattice
  the size of ML-KEM-512's has $\mathrm{GH} \approx 449$, while its planted
  secret-and-error vector has length about 39.
- The dual lattice $L^*$, with basis $(B^{-1})^T$ and determinant $1/\det L$, slices
  $L$ into layers $1/\|y\|$ apart; a short dual vector detects a target near the
  lattice, which is the dual attack.
- Enumeration searches a tree whose level sizes the Gaussian heuristic predicts
  accurately; a better basis shrinks it.
- BKZ-$\beta$ calls an SVP solver in dimension $\beta$; in a page of Python it walks
  the root Hermite factor from LLL's value down to the heuristic floor, and at full
  size its cost is the basis of post-quantum security estimates.
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
- Hermann Minkowski, *Geometrie der Zahlen* (Teubner, 1896; completed 1910).
- Ravi Kannan, "Improved Algorithms for Integer Programming and Related Lattice
  Problems", STOC 1983.
- Ulrich Fincke and Michael Pohst, "Improved Methods for Calculating Vectors of Short
  Length in a Lattice, Including a Complexity Analysis", *Mathematics of Computation*
  44 (1985).
- Claus-Peter Schnorr, "A Hierarchy of Polynomial Time Lattice Basis Reduction
  Algorithms", *Theoretical Computer Science* 53 (1987).
- Wojciech Banaszczyk, "New Bounds in Some Transference Theorems in the Geometry of
  Numbers", *Mathematische Annalen* 296 (1993).
- Guillaume Hanrot and Damien Stehlé, "Improved Analysis of Kannan's Shortest Lattice
  Vector Algorithm", CRYPTO 2007.
- Nicolas Gama, Phong Nguyen and Oded Regev, "Lattice Enumeration Using Extreme
  Pruning", EUROCRYPT 2010.
- Daniele Micciancio and Panagiotis Voulgaris, "Faster Exponential Time Algorithms for
  the Shortest Vector Problem", SODA 2010.
- Daniele Micciancio and Oded Regev, "Lattice-based Cryptography", in *Post-Quantum
  Cryptography* (Springer, 2009): the dual distinguisher in its standard form.
- Daniele Micciancio and Michael Walter, "Practical, Predictable Lattice Basis
  Reduction", EUROCRYPT 2016.
- NIST, FIPS 203, *Module-Lattice-Based Key-Encapsulation Mechanism Standard* (2024),
  for the ML-KEM parameters used in §14.5.
- In *Post-quantum cryptography*: [chapter 5](../post-quantum/05-Lattices-and-Their-Hard-Problems.md)
  and [chapter 6](../post-quantum/06-Lattice-Reduction-and-the-Estimator.md).
