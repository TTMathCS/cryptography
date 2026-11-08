# 15. Multivariate Signatures and the On-Ramp

*Solving a system of quadratic equations in many variables is hard, even over a tiny field,
and no quantum algorithm is known to change that. Multivariate signatures build on it: the
public key is a set of quadratic polynomials, a signature is a solution to them, and only the
signer knows a hidden shortcut for finding one. The idea is almost thirty years old and has
lost some famous schemes along the way, most dramatically Rainbow, a NIST finalist whose
smallest parameters fell in 2022 to a weekend of laptop computation. It has also kept a
survivor, Oil and Vinegar, which is now the backbone of four of the candidates in NIST's
second search for signatures. This chapter builds Oil and Vinegar by hand and in code, breaks
the original "balanced" version the way Kipnis and Shamir did in 1998, explains why the
unbalanced version survives, tells the Rainbow story, and surveys NIST's "on-ramp" for new
signatures as of November 2026.*

!!! abstract "In this chapter"
    **You will learn:**

    - why solving multivariate quadratic equations is hard, and what a trapdoor for it looks like;
    - Oil and Vinegar: the central map, signing by solving a linear system, and the modern view
      of the secret key as a hidden subspace;
    - the Kipnis-Shamir attack on balanced Oil and Vinegar, run in code;
    - UOV and MAYO, the two leading multivariate schemes today, and their key sizes;
    - how Rainbow and GeMSS fell;
    - MPC-in-the-head and FAEST: signatures from zero-knowledge proofs;
    - NIST's additional signatures process, round by round, to November 2026.

    **You need:** [Chapter 3](03-KEMs-and-Signatures.md) (signatures) and
    [Chapter 4](04-A-Field-Guide-to-Hard-Problems.md) (the MQ problem in outline); linear
    algebra over a finite field, as in
    [Chapter 9 of the mathematics book](../mathematics/09-Linear-Algebra.md).

    **Levels:** §15.1 to §15.3 are for beginners, §15.4 to §15.7 are intermediate, §15.8 and
    §15.9 are expert.

## 15.1 The problem

*Level: beginner.*

NIST standardized three signatures in August 2024: ML-DSA (Chapter 9) and SLH-DSA (Chapter
12), with FN-DSA (Chapter 10) still to come. Two of the three rest on structured lattices.
SLH-DSA rests only on hash functions, but its signatures are about 8 to 50 kilobytes. If a
breakthrough weakened lattices, the world would be left with large, slow hash-based signatures
and nothing in between.

There is also a practical gap. Some uses want very short signatures and can live with a large
public key: a certificate chain where each signature is sent many times but the root key is
stored once, or a firmware image whose verification key is burned into a chip. ML-DSA-44's
signature is 2,420 bytes. A scheme with signatures of a hundred or two hundred bytes would be
welcome there.

So in September 2022 NIST issued a second call, for additional signatures, saying it wanted
schemes not based on structured lattices, or with short signatures and fast verification. The
call is often called the **on-ramp**: a way for new signatures to join the standards over time.
Multivariate signatures answer the "short signature" half of that wish better than anything
else: some have signatures under 200 bytes.

## 15.2 Many equations, many unknowns

*Level: beginner.*

The **MQ problem** (multivariate quadratic) is: given $m$ quadratic polynomials $p_1, \dots,
p_m$ in $n$ variables over a finite field $\mathbb{F}_q$, and target values $t_1, \dots, t_m$,
find $x = (x_1, \dots, x_n)$ with $p_i(x) = t_i$ for every $i$.

A single quadratic in one variable is school algebra. A system of linear equations is Gaussian
elimination. But a system of *quadratic* equations in many variables is NP-hard in general
(Garey and Johnson list it), even over the two-element field. The best general methods,
Gröbner basis algorithms such as Faugère's F4 and F5 and their relatives, take time that grows
exponentially once $n$ and $m$ reach the dozens to a hundred. A quantum computer gives at most
a Grover-type square-root speed-up on the exhaustive-search parts.

<div class="mars-steps" markdown>

**A tiny MQ instance over $\mathbb{F}_7$.** Find $(x, y)$ with

$$x^2 + 3xy + y = 2, \qquad 2x^2 + y^2 + x = 3 \pmod 7.$$

1. There is no elimination trick: each equation mixes $x^2$, $xy$ and $y^2$.
2. Try all 49 pairs. $(x, y) = (1, 3)$: $1 + 9 + 3 = 13 \equiv 6$. No.
3. $(x, y) = (3, 4)$: $9 + 36 + 4 = 49 \equiv 0$. No. Keep going.
4. $(x, y) = (4, 0)$: $16 + 0 + 0 = 16 \equiv 2$ ✓, but $32 + 0 + 4 = 36 \equiv 1$ ✗.
5. $(x, y) = (6, 3)$: $36 + 54 + 3 = 93 \equiv 2$ ✓ and $72 + 9 + 6 = 87 \equiv 3$ ✓. Found it,
   and a full search shows it is the only solution.
6. With two unknowns, guessing is cheap: 49 tries. With 100 unknowns over $\mathbb{F}_{256}$
   it would be $256^{100}$, and the clever algorithms do not get anywhere near feasible.

</div>

A signature scheme needs more than a hard problem: the signer must be able to solve the
system for any message, and nobody else. The standard plan, used by every multivariate scheme,
is:

- the **central map** $F$ is a system of quadratics with a special shape that makes it easy to
  invert;
- the public key is $P = F \circ T$ (sometimes $S \circ F \circ T$), where $T$ and $S$ are
  secret invertible linear maps that scramble the variables and the equations;
- to sign a message, hash it to a target $t$ in $\mathbb{F}_q^m$, use the secret shape to
  find $s$ with $P(s) = t$, and publish $s$;
- to verify, evaluate the public polynomials at $s$ and compare with the hash.

Verification is just evaluating quadratics, which is fast and simple. The whole question is
whether the special shape stays hidden. For many proposed shapes it did not: the history of
the field is a long list of central maps that turned out to be visible through $T$.

!!! note "Life story: Oil and Vinegar"
    **Born:** 1997, Jacques Patarin, "The Oil and Vinegar Signature Scheme" (presented at a
    Dagstuhl workshop) · **Broken:** the original balanced version, by Aviad Kipnis and Adi
    Shamir (CRYPTO 1998) · **Fixed:** Unbalanced Oil and Vinegar (UOV), Kipnis, Patarin and
    Goubin (EUROCRYPT 1999) · **Helped:** Rainbow (Ding and Schmidt, 2005), MAYO (Beullens,
    2021), QR-UOV, SNOVA · **Status (Nov 2026):** UOV, MAYO, QR-UOV and SNOVA are all in
    the third round of NIST's additional signatures process; UOV itself has stood for 27 years.

## 15.3 Oil and Vinegar

*Level: beginner.*

Split the $n$ variables into $v$ **vinegar** variables and $o$ **oil** variables, and use $m =
o$ equations. In the central map, every equation may contain vinegar-times-vinegar terms and
vinegar-times-oil terms, but **no oil-times-oil terms**. Oil and vinegar do not mix with
themselves, as the name says; oil does not mix with oil.

$$f_k(x) = \sum_{i,j \in V} \alpha^{(k)}_{ij} x_i x_j + \sum_{i \in V, j \in O} \beta^{(k)}_{ij} x_i x_j
+ (\text{linear terms}).$$

Now the trick. Pick the vinegar variables at random and plug them in. Every
vinegar-times-vinegar term becomes a constant; every vinegar-times-oil term becomes a constant
times an oil variable. With no oil-times-oil terms, what is left is a system of $o$ **linear**
equations in $o$ oil unknowns. Solve it by Gaussian elimination. If it happens to be singular
(probability about $1/q$), pick new vinegar and try again.

<div class="mars-steps" markdown>

**Oil and Vinegar by hand over $\mathbb{F}_7$**, with vinegar $v_1, v_2$, oil $o_1, o_2$ and
two equations:

$$f_1 = v_1^2 + 2 v_1 v_2 + 3 v_1 o_1 + v_2 o_2, \qquad f_2 = v_2^2 + v_1 o_2 + 4 v_2 o_1.$$

Target $t = (5, 3)$.

1. Pick vinegar $v_1 = 1$, $v_2 = 2$.
2. $f_1 = 1 + 4 + 3 o_1 + 2 o_2 = 5 + 3 o_1 + 2 o_2$. Setting it to 5: $3 o_1 + 2 o_2 = 0$.
3. $f_2 = 4 + o_2 + 8 o_1 = 4 + o_1 + o_2 \pmod 7$. Setting it to 3: $o_1 + o_2 = 6$.
4. From step 3, $o_2 = 6 - o_1$. Then $3 o_1 + 12 - 2 o_1 = 0$, so $o_1 = -12 \equiv 2$ and
   $o_2 = 4$.
5. Check: $f_1 = 1 + 4 + 6 + 8 = 19 \equiv 5$ ✓; $f_2 = 4 + 4 + 16 = 24 \equiv 3$ ✓.
6. The signature (before scrambling) is $(v_1, v_2, o_1, o_2) = (1, 2, 2, 4)$.

</div>

The public key hides the split by a secret change of variables $T$: $P = F \circ T$. Someone
holding $P$ sees $m$ dense quadratic polynomials in $n$ variables with no visible oil or
vinegar. To sign, the key holder finds $y$ with $F(y) = t$ as above, then publishes $s =
T^{-1}y$, which satisfies $P(s) = F(Ts) = F(y) = t$.

**The modern view: a hidden subspace.** Since 2020 or so, papers on UOV describe the secret
differently, and the new description is simpler. In the scrambled coordinates, the set of
vectors whose "vinegar part" is zero is a subspace $O$ of dimension $o$, the **oil space**.
Because $F$ has no oil-times-oil terms, the public map vanishes on it: $P(x) = 0$ for every $x
\in O$ (ignoring linear terms, which modern UOV drops). Knowing $O$ is enough to sign:

- pick a random vector $v$;
- look for $s = v + x$ with $x \in O$;
- since $P$ is quadratic, $P(v + x) = P(v) + P'(v, x) + P(x)$, where $P'$ is the bilinear form
  behind $P$. The last term is zero on $O$, and the middle one is linear in $x$;
- so $P(v + x) = t$ is a linear system in the $o$ coordinates of $x$.

The secret key is just the oil space, and the public key is a set of quadratic forms that
vanish on a secret subspace. Breaking UOV means finding that subspace.

**Code it.** A toy UOV over $\mathbb{F}_{31}$ with 8 vinegar and 4 oil variables, built
exactly as above: random central maps with no oil-times-oil terms, scrambled by a secret matrix
$T$. The quadratic forms are stored as symmetric matrices, which is possible because $q$ is odd.

```python
import random, hashlib
q = 31                      # a small prime field, so the arithmetic is easy to follow

def solve(A, b):
    """Solve A x = b over GF(q); return None if A is singular."""
    n = len(A)
    M = [row[:] + [bi] for row, bi in zip(A, b)]
    for c in range(n):
        p = next((r for r in range(c, n) if M[r][c]), None)
        if p is None:
            return None
        M[c], M[p] = M[p], M[c]
        inv = pow(M[c][c], q - 2, q)
        M[c] = [v * inv % q for v in M[c]]
        for r in range(n):
            if r != c and M[r][c]:
                f = M[r][c]
                M[r] = [(a - f * b) % q for a, b in zip(M[r], M[c])]
    return [M[r][n] for r in range(n)]

def quad(S, x):             # x^T S x
    return sum(x[i] * S[i][j] * x[j] for i in range(len(x)) for j in range(len(x))) % q

def bil(S, x, y):           # x^T S y, the bilinear form behind the quadratic one
    return sum(x[i] * S[i][j] * y[j] for i in range(len(x)) for j in range(len(x))) % q

def keygen(v, o, rng):
    n, m = v + o, o
    T = [[rng.randrange(q) for _ in range(n)] for _ in range(n)]   # secret change of variables
    P = []
    for _ in range(m):
        F = [[0] * n for _ in range(n)]
        for i in range(n):
            for j in range(i, n):
                if i < v:                       # vinegar-vinegar and vinegar-oil terms only
                    F[i][j] = F[j][i] = rng.randrange(q)
        # public S = T^T F T
        FT = [[sum(F[i][k] * T[k][j] for k in range(n)) % q for j in range(n)] for i in range(n)]
        P.append([[sum(T[k][i] * FT[k][j] for k in range(n)) % q for j in range(n)] for i in range(n)])
    # the oil space: vectors x with T x in the last o coordinates
    oil = []
    for j in range(v, n):
        e = [0] * n; e[j] = 1
        oil.append(solve(T, e))
    return P, oil

def target(msg, m):
    d = hashlib.shake_256(msg).digest(m)
    return [b % q for b in d]

def sign(P, oil, msg, rng):
    m, n, o = len(P), len(P[0]), len(oil)
    t = target(msg, m)
    while True:
        vin = [rng.randrange(q) for _ in range(n)]            # random vinegar part
        A = [[2 * bil(S, vin, oj) % q for oj in oil] for S in P]
        b = [(ti - quad(S, vin)) % q for S, ti in zip(P, t)]
        y = solve(A, b)                                        # linear, because P vanishes on oil
        if y is not None:
            return [(vin[k] + sum(yj * oj[k] for yj, oj in zip(y, oil))) % q for k in range(n)]

def verify(P, msg, s):
    return [quad(S, s) for S in P] == target(msg, len(P))

rng = random.Random(1997)
P, oil = keygen(v=8, o=4, rng=rng)
print("P vanishes on the oil space:", all(quad(S, x) == 0 for S in P for x in oil))
s = sign(P, oil, b"open the north airlock", rng)
print("signature:", s)
print("valid:", verify(P, b"open the north airlock", s))
print("valid for another message:", verify(P, b"open all airlocks", s))
```

It prints:

```
P vanishes on the oil space: True
signature: [27, 13, 5, 1, 26, 10, 20, 0, 14, 24, 13, 23]
valid: True
valid for another message: False
```

The signing function never touches $T$ or $F$: it uses only the public matrices and the four
oil vectors. That is the "secret key is a subspace" view working in practice.

| | variables $n$ | equations $m$ | field | signature | public key |
|---|---|---|---|---|---|
| toy above | 12 | 4 | $\mathbb{F}_{31}$ | 12 elements | 4 matrices of $12 \times 12$ |
| uov-Ip (level 1) | 119 | 45 | $\mathbb{F}_{256}$ | 135 B | 321,300 B (46,591 B compressed) |
| uov-III (level 3) | 193 | 72 | $\mathbb{F}_{256}$ | 209 B | 1,347,912 B (189,232 B compressed) |
| uov-V (level 5) | 259 | 96 | $\mathbb{F}_{256}$ | 275 B | 3,232,320 B (446,992 B compressed) |

*Table 15.1. UOV sizes from the UOV team's reference code (github.com/pqov/pqov, as of November
2026). A signature is the $n$-byte solution plus a 16-byte salt. The parameters changed between
rounds of NIST's process: the round 1 level-1 set used $n = 112$, $m = 44$.*

Those numbers show the multivariate bargain plainly. A UOV signature at level 1 is about 135
bytes, smaller than any lattice signature (Falcon-512's is 666 bytes). The public key is a
third of a megabyte, or 46 kilobytes compressed. The compressed form stores a seed for most of
the public key and only the part that depends on the secret.

## 15.4 Break it: balanced Oil and Vinegar

*Level: intermediate.*

Patarin's 1997 scheme used as many vinegar variables as oil ones, $v = o$. A year later, Aviad
Kipnis and Adi Shamir found the oil space with linear algebra alone.

Write each public quadratic form as a symmetric matrix $P_i$, so that $P_i(x) = x^\top P_i x$.
In the secret coordinates the central matrices have a zero block where oil meets oil:

$$F_i = \begin{pmatrix} A_i & B_i \\ B_i^\top & 0 \end{pmatrix}.$$

When $v = o$ the blocks $B_i$ are square and usually invertible. Take two of them and form
$F_1^{-1} F_2$. Multiplying out the blocks gives a matrix of the shape

$$F_1^{-1} F_2 = \begin{pmatrix} * & 0 \\ * & B_1^{-1} B_2 \end{pmatrix},$$

which maps every vector of the form $(0, y)$, an oil vector, to another oil vector. The oil
space is an **invariant subspace** of $F_1^{-1} F_2$. The secret change of variables does not
hide this: $P_1^{-1} P_2$ is just $F_1^{-1} F_2$ written in other coordinates, so the oil space
$O$ is an invariant subspace of $P_1^{-1} P_2$, a matrix anyone can compute from the public key.

Invariant subspaces can be found with the eigenvectors of the matrix. Each eigenvalue of $B_1^{-1}
B_2$ shows up twice in $P_1^{-1} P_2$ (once on the oil side and once on the vinegar side), so
each eigenvalue gives a small eigenspace containing one oil vector. Inside that small space, the
oil vector is the one on which every public quadratic vanishes. Repeat with other combinations
of the public matrices until $o$ independent oil vectors are found. With the oil space in hand,
the attacker signs exactly as the key holder does.

**Code it.** The attack on a balanced toy with 4 vinegar and 4 oil variables over
$\mathbb{F}_{31}$. Eigenvalues are found by trying all 31 field elements, which is fine for a
toy; a real attack would factor the characteristic polynomial.

```python
# Uses keygen(), sign(), verify(), solve(), quad() from the UOV code above.
def matmul(A, B):
    return [[sum(a * b for a, b in zip(row, col)) % q for col in zip(*B)] for row in A]

def inverse(A):
    n = len(A)
    cols = [solve(A, [int(i == j) for i in range(n)]) for j in range(n)]
    return None if None in cols else [list(r) for r in zip(*cols)]

def kernel(A):
    """Basis of {x : A x = 0} over GF(q), by row reduction."""
    n = len(A[0]); M = [r[:] for r in A]; piv = []; r = 0
    for c in range(n):
        p = next((i for i in range(r, len(M)) if M[i][c]), None)
        if p is None:
            continue
        M[r], M[p] = M[p], M[r]
        inv = pow(M[r][c], q - 2, q); M[r] = [x * inv % q for x in M[r]]
        for i in range(len(M)):
            if i != r and M[i][c]:
                f = M[i][c]; M[i] = [(a - f * b) % q for a, b in zip(M[i], M[r])]
        piv.append(c); r += 1
    basis = []
    for f in (c for c in range(n) if c not in piv):
        x = [0] * n; x[f] = 1
        for i, c in enumerate(piv):
            x[c] = -M[i][f] % q
        basis.append(x)
    return basis

def rank(vectors):
    return len(vectors[0]) - len(kernel(vectors)) if vectors else 0

def kipnis_shamir(P, o, rng, tries=10**9):
    n = len(P[0]); found = []
    while rank(found) < o and tries:
        tries -= 1
        ca = [rng.randrange(q) for _ in P]
        cb = [rng.randrange(q) for _ in P]
        # two random combinations of the public matrices
        A = [[sum(c * S[i][j] for c, S in zip(ca, P)) % q for j in range(n)] for i in range(n)]
        B = [[sum(c * S[i][j] for c, S in zip(cb, P)) % q for j in range(n)] for i in range(n)]
        Ai = inverse(A)
        if Ai is None:
            continue
        M = matmul(Ai, B)           # the oil space is an invariant subspace of M
        for lam in range(q):
            E = kernel([[(M[i][j] - lam * (i == j)) % q for j in range(n)] for i in range(n)])
            if len(E) != 2:
                continue
            u, w = E
            cands = [u] + [[(a * x + y) % q for x, y in zip(u, w)] for a in range(q)]
            for x in cands:
                if all(quad(S, x) == 0 for S in P) and rank(found + [x]) > rank(found):
                    found.append(x)
    return found

rng = random.Random(1998)
P, oil = keygen(v=4, o=4, rng=rng)        # balanced: as many vinegar as oil variables
stolen = kipnis_shamir(P, 4, rng)
print("recovered", len(stolen), "oil vectors; P vanishes on them:",
      all(quad(S, x) == 0 for S in P for x in stolen))
s = sign(P, stolen, b"open all airlocks", rng)
print("forged signature valid:", verify(P, b"open all airlocks", s))
```

It prints:

```
recovered 4 oil vectors; P vanishes on them: True
forged signature valid: True
```

The forged signature is for a message the key holder never signed. The attack takes a fraction
of a second on the toy and polynomial time at any size: balanced Oil and Vinegar is broken
for every parameter choice.

## 15.5 Fix it: unbalance the oil

*Level: intermediate.*

Kipnis, Patarin and Goubin (EUROCRYPT 1999) noticed that the attack depends on $B_i$ being
square. With more vinegar than oil, $v > o$, the matrix $P_1^{-1} P_2$ no longer has to map
the oil space into itself. It maps it into a larger space of dimension about $v$, and the
attack has to guess its way into the oil space. Its cost becomes about $q^{v - o}$ times a
polynomial. The fix is **Unbalanced Oil and Vinegar**: take $v$ around twice $o$ or more.

**Code it.** The same attack against the unbalanced toy of §15.3, with 8 vinegar and 4 oil
variables, given 500 tries.

```python
# Uses kipnis_shamir() from the attack above.
rng = random.Random(1999)
P, oil = keygen(v=8, o=4, rng=rng)        # unbalanced: twice as many vinegar variables
stolen = kipnis_shamir(P, 4, rng, tries=500)
print("oil vectors recovered from 500 tries:", len(stolen))
```

It prints:

```
oil vectors recovered from 500 tries: 0
```

Not one. The eigenspaces the attack finds no longer contain oil vectors, so its check that
every public form vanishes always fails. Real UOV takes $v$ larger still: for uov-Ip, $v = 74$
and $o = 45$ over $\mathbb{F}_{256}$, so $q^{v-o} = 2^{232}$.

UOV's security today rests on three attacks, all tracked in its parameter choice:

- **Kipnis-Shamir, generalized** to the unbalanced case: cost about $q^{v - o}$ times a
  polynomial.
- **Direct attacks**: solve $P(s) = t$ as a generic MQ system with Gröbner bases or a hybrid of
  guessing and Gröbner bases.
- **Reconciliation and intersection attacks** (Beullens, EUROCRYPT 2021), which look for an oil
  vector satisfying several conditions at once. They forced the parameters up somewhat, which is
  part of why the round 1 sets were retuned.

None of these has broken the scheme since 1999. That record, 27 years in 2026, is why UOV is
the multivariate scheme cryptographers trust most.

## 15.6 MAYO: whipping a small oil space

*Level: intermediate.*

UOV's flaw is its public key: hundreds of kilobytes, or tens of kilobytes compressed. The
public key must describe $m$ quadratic forms in $n$ variables, and $n$ must be large because $v$
must be at least about twice $m$.

**MAYO** (Ward Beullens, SAC 2021) shrinks the key with an unusual trade. It uses an oil space
much *smaller* than the number of equations: for MAYO_1, $o = 8$ while $m = 80$. A map whose
oil space is that small cannot be used to sign directly: the linear system would have 80
equations in 8 unknowns. So MAYO **whips** the map up into a bigger one. It takes $k$ copies
of the input, $s_1, \dots, s_k$, and combines $P$ on all of them and on all pairs:

$$P^*(s_1, \dots, s_k) = \sum_{i} E_{ii}\,P(s_i) + \sum_{i < j} E_{ij}\,P'(s_i, s_j),$$

where the $E_{ij}$ are fixed public matrices. The whipped map has an oil space of dimension
$k\,o$, large enough to solve $m$ linear equations once $k\,o \ge m$. The public key still only
needs to describe the small $P$, and most of it is expanded from a seed. The signature is the
$k$ vectors $s_i$, so it is $k$ times longer than a UOV signature would be.

| | $n$ | $m$ | $o$ | $k$ | public key | signature |
|---|---|---|---|---|---|---|
| MAYO_1 | 88 | 80 | 8 | 10 | 1,456 B | 464 B |
| MAYO_2 | 86 | 64 | 13 | 5 | 2,928 B | 239 B |
| MAYO_3 | 118 | 108 | 10 | 11 | 2,986 B | 681 B |
| MAYO_5 | 154 | 142 | 12 | 12 | 5,554 B | 964 B |

*Table 15.2. MAYO parameter sets over $\mathbb{F}_{16}$, from the MAYO team's reference code
(github.com/PQCMayo/MAYO-C, as of November 2026). MAYO_1 and MAYO_2 are both level 1; MAYO_2
trades a larger key for a shorter signature.*

**Code it.** Both tables follow from the parameters. A UOV public key is $m$ upper-triangular
$n \times n$ matrices; the compressed form keeps only the $o \times o$ block that depends on
the secret, plus a 16-byte seed. A MAYO public key is that compressed form in half-bytes, and
the signature is $k\,n$ half-bytes plus a salt of 24, 32 or 40 bytes at levels 1, 3 and 5.

```python
def tri(k):                      # entries in an upper-triangular k x k matrix
    return k * (k + 1) // 2

def uov(name, n, m):
    o = m
    print(f"{name:8} pk {m * tri(n):>9,} B  compressed {16 + m * tri(o):>7,} B  sig {n + 16} B")

def mayo(name, n, m, o, k, salt):
    print(f"{name:8} pk {16 + m * tri(o) // 2:>5,} B  sig {(k * n + 1) // 2 + salt} B")

uov("uov-Ip", 119, 45); uov("uov-III", 193, 72); uov("uov-V", 259, 96)
mayo("MAYO_1", 88, 80, 8, 10, 24); mayo("MAYO_2", 86, 64, 13, 5, 24)
mayo("MAYO_3", 118, 108, 10, 11, 32); mayo("MAYO_5", 154, 142, 12, 12, 40)
```

It prints:

```
uov-Ip   pk   321,300 B  compressed  46,591 B  sig 135 B
uov-III  pk 1,347,912 B  compressed 189,232 B  sig 209 B
uov-V    pk 3,232,320 B  compressed 446,992 B  sig 275 B
MAYO_1   pk 1,456 B  sig 464 B
MAYO_2   pk 2,928 B  sig 239 B
MAYO_3   pk 2,986 B  sig 681 B
MAYO_5   pk 5,554 B  sig 964 B
```

Every row matches the teams' published sizes. MAYO's key is about 30 times smaller than
compressed UOV's at level 1, and its signature about three times bigger: still smaller than
ML-DSA's 2,420 bytes. Its security rests on the same oil-space problem as UOV plus a new
assumption about the whipped map, which is younger and less studied.

## 15.7 How Rainbow and GeMSS fell

*Level: intermediate.*

**Rainbow** (Jintai Ding and Dieter Schmidt, 2005) stacked Oil and Vinegar in layers. In the
first layer, some variables are vinegar and some oil. In the second layer, all of the first
layer's variables act as vinegar for a new set of oil variables. Signing solves the layers
one by one, each a linear system. The layers let Rainbow use fewer variables than UOV for the
same security, so its keys were smaller and its signatures tiny: 66 bytes at level 1, with a
public key of about 160 kilobytes. It was one of three signature finalists in NIST's third
round (2020-2022), alongside Dilithium and Falcon.

The layers were also extra structure, and structure is what attackers use. In 2021 Ward
Beullens showed new attacks on UOV and Rainbow (EUROCRYPT 2021) that pushed Rainbow's third-round
parameters below their claimed levels. In February 2022 he posted "Breaking Rainbow Takes a
Weekend on a Laptop" (CRYPTO 2022): a key-recovery attack that combines the layered structure
with a **rectangular MinRank** formulation and recovers the secret key for Rainbow's level-1
parameters in about 53 hours on average on a standard laptop. NIST did not select Rainbow
(NIST IR 8413, July 2022).

The lesson is not that multivariate cryptography failed: plain UOV was untouched by the
attack, and Rainbow's own layers carried its weakness. It is that every piece of extra
structure added for efficiency is a new place for an attack to grip. The SIKE story in
[Chapter 16](16-Isogenies.md) has the same moral, more sharply.

**GeMSS** was an alternate candidate in NIST's third round, from the other branch of the
multivariate family: **HFE** (Hidden Field Equations, Patarin 1996). Its central map is a
single polynomial of low degree over a large extension field, which the signer can solve with
root finding; viewed over the base field it becomes a system of quadratics. GeMSS had
signatures of about 32 bytes and public keys of hundreds of kilobytes. In 2021, Chengdong Tao,
Albrecht Petzoldt and Jintai Ding published "Efficient Key Recovery for All HFE Signature
Variants" (CRYPTO 2021), and later MinRank work lowered GeMSS's security further. It was not
selected.

## 15.8 The on-ramp, round by round

*Level: expert.*

NIST's additional signatures process has run in public since 2022. Its rounds:

<figure class="mars-fig">
<svg viewBox="0 0 640 210" width="640" role="img" aria-label="Timeline of NIST's additional signatures process: call in September 2022, 40 round 1 candidates in July 2023, 14 round 2 candidates in October 2024, 9 round 3 candidates in May 2026, HAWK withdrawn in July 2026, round 3 expected to last about two years" fill="currentColor" font-size="13">
<line x1="30" y1="100" x2="610" y2="100" stroke="currentColor" stroke-width="2"/>
<circle cx="60" cy="100" r="6" class="acc-fill"/>
<circle cx="190" cy="100" r="6" class="acc-fill"/>
<circle cx="330" cy="100" r="6" class="acc-fill"/>
<circle cx="480" cy="100" r="6" class="acc-fill"/>
<circle cx="530" cy="100" r="4"/>
<text x="40" y="80">Sep 2022</text><text x="40" y="128">call</text>
<text x="170" y="80">Jul 2023</text><text x="170" y="128">round 1</text><text x="170" y="146" class="acc-fill">40</text>
<text x="310" y="80">Oct 2024</text><text x="310" y="128">round 2</text><text x="310" y="146" class="acc-fill">14</text>
<text x="450" y="60">May 2026</text><text x="450" y="128">round 3</text><text x="450" y="146" class="acc-fill">9</text>
<text x="520" y="80" fill-opacity=".7">Jul 2026</text><text x="520" y="170" fill-opacity=".7">HAWK</text><text x="520" y="186" fill-opacity=".7">withdrawn</text>
<line x1="530" y1="104" x2="530" y2="156" stroke="currentColor" stroke-dasharray="3 3" stroke-opacity=".7"/>
<text x="480" y="30" fill-opacity=".7">about two more years →</text>
</svg>
<figcaption>Figure 15.1. NIST's additional signatures process as of November 2026. Each round cut the field; round 3 is expected to last about two years.</figcaption>
</figure>

- **Call** (September 2022) and **round 1** (July 2023): 40 candidates were accepted, across
  multivariate, code-based, lattice, isogeny, symmetric and MPC-in-the-head designs. Several
  were broken within weeks of publication, some by simple attacks; that is normal for a first
  round and is what public review is for.
- **Round 2** (24 October 2024): 14 candidates: CROSS, FAEST, HAWK, LESS, MAYO, Mirath (a
  merger of MIRA and MiRitH), MQOM, PERK, QR-UOV, RYDE, SDitH, SNOVA, SQIsign and UOV.
- **Round 3** (14 May 2026, NIST IR 8610): nine candidates: FAEST, HAWK, MAYO, MQOM, QR-UOV,
  SDitH, SNOVA, SQIsign and UOV. NIST said the round would last about two years and planned its
  7th PQC Standardization Conference for late spring or early summer 2027. CROSS, LESS, Mirath,
  PERK and RYDE did not advance.
- **HAWK withdrawn** (July 2026): HAWK, the only lattice candidate left, was withdrawn by its
  own team after a new lattice-reduction attack was announced, which press reports said about
  halved the block size its security analysis relied on. NIST's round 3 page lists HAWK as
  withdrawn. The other eight remain as of November 2026.

By family, the eight remaining candidates are:

| family | candidates | in one line |
|---|---|---|
| multivariate | UOV, MAYO, QR-UOV, SNOVA | Oil and Vinegar and three ways to shrink its key |
| MPC-in-the-head | MQOM, SDitH | a zero-knowledge proof of a solution to MQ or to syndrome decoding |
| symmetric | FAEST | a zero-knowledge proof of an AES key |
| isogeny | SQIsign | the smallest signatures of all (Chapter 16) |

*Table 15.3. NIST's round 3 additional signature candidates still in the process, November
2026.*

**QR-UOV** (Furue, Ikematsu, Kiyomura and Takagi, ASIACRYPT 2021) builds the UOV matrices from
blocks that are elements of a quotient ring, so each block is described by one polynomial.
**SNOVA** (Wang, Tseng, Kuan, Chou and others) replaces field elements by small matrices, a
noncommutative ring, to the same end. Both are UOV with smaller keys; both add structure, and
after Rainbow, cryptographers watch such structure closely. SNOVA's parameters have been revised
since its first version in response to published attacks.

**MPC-in-the-head** turns a zero-knowledge proof into a signature. The idea (Ishai,
Kushilevitz, Ostrovsky and Sahai, 2007) is that the prover simulates, in its head, a
multiparty computation in which $N$ parties holding shares of the secret jointly check that it
solves a public instance. It commits to every party's view and the verifier, or a hash in the
signature version, asks to see all but one. A cheating prover is caught unless it guessed the
hidden party, with probability $1/N$ per repetition, so the proof is repeated until the chance
of cheating falls below $2^{-128}$.

```python
import math
for N in (2, 16, 256, 1024):
    tau = math.ceil(128 / math.log2(N))
    print(f"{N:5} parties: {tau:3} repetitions for 2^-128")
```

It prints:

```
    2 parties: 128 repetitions for 2^-128
   16 parties:  32 repetitions for 2^-128
  256 parties:  16 repetitions for 2^-128
 1024 parties:  13 repetitions for 2^-128
```

More parties mean fewer repetitions and shorter signatures but more work, which is the main
tuning knob of every MPC-in-the-head scheme. The security rests only on the problem being
proved (MQ for MQOM, syndrome decoding for SDitH) and on hash functions. The signatures are
several kilobytes, and the public keys are tiny.

**FAEST** (Carsten Baum and a large team) goes further. The secret key is an AES key $k$; the public key is a
block $x$ and its encryption $y = \mathrm{AES}_k(x)$, 32 bytes at level 1. A signature is a
zero-knowledge proof that the signer knows $k$, made with a newer technique called
VOLE-in-the-head (Baum and others, CRYPTO 2023). FAEST's security rests only on AES and hash
functions, among the most studied designs in cryptography, which makes it a natural rival
to SLH-DSA: its signatures are smaller and its signing much faster, though still several
kilobytes.

## 15.9 In the real world

*Level: expert.*

As of November 2026, none of the round 3 candidates is a standard, and NIST has said the
round will last about two years. Multivariate schemes are used mainly in research libraries
and experiments: liboqs, the Open Quantum Safe project's library, includes MAYO and UOV among
others, and Cloudflare and others have published benchmarks of the on-ramp candidates for
use in TLS certificates, where short signatures matter most.

The niche is clear. A TLS handshake carries several signatures and usually two public keys
(the leaf certificate's and an intermediate's). With UOV, every signature in a chain could be
135 bytes; the large public keys are the problem, unless they are the root keys that clients
already store. Some proposals for post-quantum certificates follow exactly this reasoning; [Chapter 18](18-Hybrids-and-the-Migration.md) returns to
certificates.

**Mars.** Arcadia City's water-recycling plant logs a reading every minute from each of 4,000
sensors, 5.76 million readings a day, and each reading is signed so that a faulty or tampered
sensor can be traced. With ML-DSA-44 the signatures alone would be about 14 gigabytes a day;
with UOV at 135 bytes, under 0.8 gigabytes. The public keys, one per sensor, are installed once, when the sensor is.
The city's engineers still keep ML-DSA in the design: UOV is not yet a standard, and the plant
must be able to switch.

## 15.10 Going deeper

*Level: expert.*

- **Oil and Vinegar.** Patarin, "The Oil and Vinegar Signature Scheme" (1997); Kipnis and
  Shamir, "Cryptanalysis of the Oil and Vinegar Signature Scheme" (CRYPTO 1998); Kipnis,
  Patarin and Goubin, "Unbalanced Oil and Vinegar Signature Schemes" (EUROCRYPT 1999).
- **Attacks on UOV and Rainbow.** Beullens, "Improved Cryptanalysis of UOV and Rainbow"
  (EUROCRYPT 2021) and "Breaking Rainbow Takes a Weekend on a Laptop" (CRYPTO 2022).
- **MAYO.** Beullens, "MAYO: Practical Post-Quantum Signatures from Oil-and-Vinegar Maps" (SAC
  2021), and the round 3 specification.
- **HFE.** Patarin, "Hidden Fields Equations (HFE) and Isomorphisms of Polynomials" (EUROCRYPT
  1996); Tao, Petzoldt and Ding, "Efficient Key Recovery for All HFE Signature Variants" (CRYPTO
  2021).
- **MPC-in-the-head and VOLE-in-the-head.** Ishai, Kushilevitz, Ostrovsky and Sahai,
  "Zero-Knowledge from Secure Multiparty Computation" (STOC 2007); Baum and others, "Publicly
  Verifiable Zero-Knowledge and Post-Quantum Signatures from VOLE-in-the-Head" (CRYPTO 2023).
- **The process.** NIST's pages for the additional signatures rounds, and NIST IR 8610 (May
  2026) on the selection of the third round.
- **The other side.** The Cryptanalysis book's chapter on breaking post-quantum candidates
  tells the Rainbow break from the attacker's side.

## Check yourself

??? question "1. State the MQ problem."

    Given $m$ quadratic polynomials in $n$ variables over a finite field and target values,
    find an assignment of the variables that makes every polynomial take its target value.

??? question "2. Why does fixing the vinegar variables make Oil and Vinegar easy to sign?"

    The central map has no oil-times-oil terms, so with the vinegar fixed, every term is a
    constant or a constant times one oil variable: the system becomes linear in the oil
    variables and Gaussian elimination solves it.

??? question "3. In the modern view, what is a UOV secret key?"

    The oil space: a secret subspace on which every public quadratic form vanishes. Knowing it
    lets the signer reduce $P(v + x) = t$ to a linear system in $x$.

??? question "4. Why did Kipnis and Shamir's attack work against balanced Oil and Vinegar?"

    With as many vinegar as oil variables, the oil space is an invariant subspace of $P_1^{-1}
    P_2$, a matrix computed from the public key, so eigenvector computations reveal it.

??? question "5. In the code, how many oil vectors did the attack find against the unbalanced toy?"

    None in 500 tries. With more vinegar than oil, the oil space is no longer invariant and the
    attack's cost grows like $q^{v-o}$.

??? question "6. Give UOV's level-1 signature and public key sizes, and compare with ML-DSA-44."

    uov-Ip: 135-byte signature, 321,300-byte public key (46,591 compressed). ML-DSA-44: 2,420-byte
    signature, 1,312-byte public key.

??? question "7. What does MAYO's whipping achieve?"

    It lets a map with an oil space too small to sign (8 dimensions for 80 equations at MAYO_1)
    be combined over $k$ inputs into a map with a $k\,o$-dimensional oil space, so the public
    key stays small at the cost of a longer signature.

??? question "8. How long did Beullens's attack on Rainbow's level-1 parameters take?"

    About 53 hours on average on a standard laptop, a weekend, as the title of the paper says.

??? question "9. Which candidates were in NIST's third round of additional signatures, and what changed afterwards?"

    FAEST, HAWK, MAYO, MQOM, QR-UOV, SDitH, SNOVA, SQIsign and UOV (14 May 2026). HAWK was then
    withdrawn by its team in July 2026, leaving eight.

??? question "10. In MPC-in-the-head with 256 parties, how many repetitions give $2^{-128}$ soundness?"

    16, since each repetition catches a cheater except with probability $1/256 = 2^{-8}$.

## What you learned

- Multivariate signatures hide an easy-to-invert quadratic map behind a change of variables;
  verification is just evaluating quadratics.
- Oil and Vinegar becomes linear once the vinegar is fixed; its secret is a subspace on which
  the public map vanishes.
- The balanced version falls to the Kipnis-Shamir invariant-subspace attack; unbalanced UOV
  has stood since 1999.
- UOV gives 135-byte signatures with large keys; MAYO trades a longer signature for a key of
  about 1.5 kilobytes.
- Rainbow's layers and GeMSS's HFE structure were what broke; both left NIST's process in 2022.
- As of November 2026, eight candidates remain in round 3 of the on-ramp, four of them
  multivariate, and no decision is expected before about 2028.

**Next:** [Chapter 16](16-Isogenies.md), isogenies: SIKE's spectacular fall and SQIsign's
tiny signatures.

## Further reading

- NIST, "Post-Quantum Cryptography: Additional Digital Signature Schemes", project pages for
  rounds 1 to 3, and NIST IR 8610 (May 2026).
- Aviad Kipnis, Jacques Patarin and Louis Goubin, "Unbalanced Oil and Vinegar Signature
  Schemes" (EUROCRYPT 1999).
- Ward Beullens, "Breaking Rainbow Takes a Weekend on a Laptop" (CRYPTO 2022).
- Ward Beullens, "MAYO: Practical Post-Quantum Signatures from Oil-and-Vinegar Maps" (SAC 2021).
- Jintai Ding, Albrecht Petzoldt and Dieter Schmidt, *Multivariate Public Key Cryptosystems*,
  2nd edition (Springer, 2020).
- NIST IR 8413, *Status Report on the Third Round of the NIST Post-Quantum Cryptography
  Standardization Process* (July 2022).
