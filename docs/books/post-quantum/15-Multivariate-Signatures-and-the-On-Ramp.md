# 15. Multivariate Signatures and the On-Ramp

*Solving a system of quadratic equations in many variables is hard, even over a tiny field,
and no quantum algorithm is known to change that. Multivariate signatures build on it: the
public key is a set of quadratic polynomials, a signature is a solution to them, and only the
signer knows a hidden shortcut for finding one. The idea is almost thirty years old and has
lost some famous schemes along the way, most dramatically Rainbow, a NIST finalist whose
smallest parameters fell in 2022 to a weekend of laptop computation. It has also kept a
survivor, Oil and Vinegar, which is now the backbone of four of the eight candidates left in
NIST's second search for signatures. This chapter builds Oil and Vinegar by hand and in code,
breaks the original "balanced" version the way Kipnis and Shamir did in 1998, explains why the
unbalanced version survives, builds a toy MAYO that signs with an oil space too small for
plain Oil and Vinegar, then builds a toy Rainbow and recovers its hidden layer the way Beullens
did in 2022. It ends with NIST's "on-ramp" for new signatures, candidate by candidate, as of
November 2026.*

!!! abstract "In this chapter"
    **You will learn:**

    - why solving multivariate quadratic equations is hard, and what a trapdoor for it looks like;
    - Oil and Vinegar: the central map, signing by solving a linear system, and the modern view
      of the secret key as a hidden subspace, worked by hand;
    - the Kipnis-Shamir attack on balanced Oil and Vinegar, run in code, and the attacks UOV's
      parameters are set against today, including the 2025 wedge attack;
    - UOV and MAYO, the two leading multivariate schemes today, their key sizes, and MAYO's
      whipping in code;
    - the whole Rainbow story, from Ding and Schmidt in 2005 to the 53-hour break, with the
      rectangular MinRank idea worked by hand and the hidden layer recovered in code;
    - QR-UOV and SNOVA, what structure each adds, and the 2024-2026 attacks on SNOVA;
    - MPC-in-the-head, FAEST and the rest of the on-ramp, with a size chart;
    - NIST's additional signatures process, round by round, to November 2026.

    **You need:** [Chapter 3](03-KEMs-and-Signatures.md) (signatures) and
    [Chapter 4](04-A-Field-Guide-to-Hard-Problems.md) (the MQ problem in outline); linear
    algebra over a finite field, as in
    [Chapter 9 of the mathematics book](../mathematics/09-Linear-Algebra.md).

    **Levels:** §15.1 to §15.3 are for beginners, §15.4 to §15.7 are intermediate, §15.8 to
    §15.12 are expert.

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

The price is paid in the public key. Plain Oil and Vinegar (UOV) has signatures of about 100
to 135 bytes at level 1 and public keys of tens of kilobytes or more. Every scheme after it,
from Rainbow in 2005 to MAYO, QR-UOV and SNOVA, adds structure to shrink the key, and every
piece of structure must be checked for a way in: Rainbow's layers were one, found in 2022. The
hard problem underneath is untouched; the danger lies in the shortcuts. The Cryptanalysis
book's [chapter 16](../cryptanalysis/16-Breaking-Post-Quantum-Candidates.md) tells the breaks
from the attacker's side; this chapter builds the schemes.

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

### The shape of a system decides its cost

How hard an MQ instance is depends heavily on the ratio of equations to unknowns, and the
attacks later in the chapter all work by changing that ratio in the attacker's favor.

- **Many more equations than unknowns** is easy. A quadratic in $n$ variables has at most
  $1 + n + n(n+1)/2$ monomials, 561 for $n = 32$. Treat each monomial as a new unknown
  (**linearization**) and 561 equations fall to Gaussian elimination. With fewer equations,
  the **XL** method and Gröbner basis algorithms multiply equations by monomials to make more;
  the degree they need, and so the cost, falls quickly as $m/n$ grows.
- **About as many equations as unknowns** is the hard case, and the one the security of every
  scheme here is measured against.
- **Many more unknowns than equations** is the signature setting: UOV at level 1 has $n = 119$
  unknowns and $m = 45$ equations, so most of the variables are free. An attacker can fix
  $n - m$ of them at random and solve the remaining square system, which has a solution about
  63% of the time ($1 - 1/e$, the chance that a random map hits a given value). Cleverer methods
  do better when $n$ is much larger than $m$, and when $n \ge m(m+1)$ the problem becomes
  solvable in polynomial time (Kipnis, Patarin and Goubin showed this in 1999 for fields of
  characteristic 2, and later work extended it), which is one reason no scheme lets $n$ grow
  without limit.

The designer keeps the system an attacker sees close to square and random; the attacker looks
for an overdetermined corner. Beullens's break of Rainbow (§15.7) found one with twice as many
equations as unknowns.

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
T^{-1}y$, which satisfies $P(s) = F(Ts) = F(y) = t$. Figure 15.1 draws the whole trapdoor.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="The Oil and Vinegar trapdoor: a central matrix with an empty oil-times-oil block becomes a dense public matrix after the secret change of variables T; signing fixes the vinegar, solves a linear system for the oil, and maps back through T inverse" fill="currentColor" font-size="14">
<text x="85" y="30" text-anchor="middle">vinegar</text>
<text x="160" y="30" text-anchor="middle">oil</text>
<text x="26" y="90" text-anchor="middle">V</text>
<text x="26" y="165" text-anchor="middle">O</text>
<rect x="40" y="40" width="90" height="90" fill-opacity=".35"/>
<rect x="130" y="40" width="60" height="90" fill-opacity=".15"/>
<rect x="40" y="130" width="90" height="60" fill-opacity=".15"/>
<rect x="40" y="40" width="150" height="150" fill="none" stroke="currentColor" stroke-width="1.5"/>
<line x1="130" y1="40" x2="130" y2="190" stroke="currentColor"/>
<line x1="40" y1="130" x2="190" y2="130" stroke="currentColor"/>
<text x="160" y="166" text-anchor="middle" font-size="20">0</text>
<text x="115" y="215" text-anchor="middle">central Fᵢ (secret)</text>
<text x="115" y="234" text-anchor="middle" font-size="12" fill-opacity=".7">no oil × oil terms</text>
<line x1="200" y1="115" x2="258" y2="115" stroke="currentColor" stroke-width="1.5"/>
<path d="M258 109 L268 115 L258 121 Z"/>
<text x="232" y="103" text-anchor="middle" font-size="12">Tᵀ Fᵢ T</text>
<rect x="275" y="40" width="150" height="150" fill-opacity=".25" stroke="currentColor" stroke-width="1.5"/>
<text x="350" y="120" text-anchor="middle">dense, no</text>
<text x="350" y="138" text-anchor="middle">visible blocks</text>
<text x="350" y="215" text-anchor="middle">public Pᵢ</text>
<text x="350" y="234" text-anchor="middle" font-size="12" fill-opacity=".7">vanishes on the oil space O</text>
<text x="450" y="58" font-weight="bold">To sign a hash t</text>
<text x="450" y="84" font-size="13">1. pick vinegar at random</text>
<text x="450" y="106" font-size="13">2. each Fᵢ is now linear</text>
<text x="464" y="124" font-size="13">in the oil variables</text>
<text x="450" y="146" font-size="13">3. Gaussian elimination: y</text>
<text x="450" y="168" font-size="13">4. publish s = T⁻¹ y</text>
<text x="450" y="200" font-weight="bold">To verify</text>
<text x="450" y="222" font-size="13">check P(s) = t</text>
</svg>
<figcaption>Figure 15.1. The Oil and Vinegar trapdoor. The secret central matrices have an empty oil-times-oil block; the secret change of variables T turns them into dense public matrices. Only someone who knows where the oil went can make the system linear.</figcaption>
</figure>

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

Here $P'(x, y) = P(x + y) - P(x) - P(y)$ is called the **polar form** of $P$. It is linear in
each argument separately, and every attack and every signing algorithm in this chapter is
built from it.

### Signing with only the oil space, by hand

The smallest example that shows the modern view works with no central map at all, only a
public polynomial and one secret vector. Over $\mathbb{F}_7$ take one equation in three
variables,

$$P(x_1, x_2, x_3) = x_1^2 + 3x_1x_2 + 2x_2^2 + x_1x_3 + 5x_2x_3 + 4x_3^2,$$

and the secret oil vector $o = (1, 2, 3)$. This is UOV with $m = o = 1$ and two vinegar
dimensions.

<div class="mars-steps" markdown>

1. Check the secret: $P(1, 2, 3) = 1 + 6 + 8 + 3 + 30 + 36 = 84 = 7 \cdot 12 \equiv 0$. The
   public polynomial vanishes on the oil vector, and so on every multiple $y\,o$, since
   $P(y\,o) = y^2 P(o)$.
2. To sign the target $t = 3$, pick a random vector, say $v = (1, 1, 0)$, and look for $s = v
   + y\,o$. Then $P(v + y\,o) = P(v) + y\,P'(v, o) + y^2 P(o)$, and the last term is zero.
3. $P(v) = 1 + 3 + 2 = 6$.
4. $P'(v, o) = P(v + o) - P(v) - P(o)$. With $v + o = (2, 3, 3)$: $P(2, 3, 3) = 4 + 18 + 18 +
   6 + 45 + 36 = 127 \equiv 1$, so $P'(v, o) = 1 - 6 - 0 = -5 \equiv 2$.
5. The equation $6 + 2y = 3$ is linear: $2y \equiv -3 \equiv 4$, so $y = 2$.
6. The signature is $s = (1, 1, 0) + 2\,(1, 2, 3) = (3, 5, 6)$.
7. Anyone can verify: $P(3, 5, 6) = 9 + 45 + 50 + 18 + 150 + 144 = 416 = 7 \cdot 59 + 3 \equiv
   3$ ✓.

</div>

Without $o$, the signer would face one quadratic equation in three unknowns, easy here but
hopeless at $n = 119$. With $o$, every signature is one division. Real UOV does the same with
$m$ equations and an $m$-dimensional oil space, so step 5 becomes an $m \times m$ linear
system.

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

```text
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
| uov-Is (level 1) | 160 | 64 | $\mathbb{F}_{16}$ | 96 B | 412,160 B (66,576 B compressed) |
| uov-III (level 3) | 193 | 72 | $\mathbb{F}_{256}$ | 209 B | 1,347,912 B (189,232 B compressed) |
| uov-V (level 5) | 259 | 96 | $\mathbb{F}_{256}$ | 275 B | 3,232,320 B (446,992 B compressed) |

*Table 15.1. UOV sizes from the round 3 specification (2026) and the team's reference code
(github.com/pqov/pqov). A signature is the solution plus a 16-byte salt; over
$\mathbb{F}_{16}$ two entries share a byte. The parameters changed between rounds of NIST's
process: in rounds 1 and 2, uov-Ip used $n = 112$, $m = 44$, and round 3 raised it after
better estimates of the direct and wedge attacks (§15.5).*

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

```text
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

```text
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
  vector satisfying several conditions at once. They forced the parameters up somewhat.
- **The wedge attack** (Lars Ran, "Wedges, Oil, and Vinegar", EUROCRYPT 2026, first posted in
  2025), which studies the oil space in the exterior algebra, the algebra of "wedge products"
  $x \wedge y$ that describe subspaces. It applies when the field has characteristic 2, as
  $\mathbb{F}_{16}$ and $\mathbb{F}_{256}$ do, and later papers generalized it.

None of these has broken the scheme since 1999. That record, 27 years in 2026, is why UOV is
the multivariate scheme cryptographers trust most. But "not broken" is not "unchanged": the
estimates move, and the parameters move with them. The UOV team's round 3 specification lists
the cost of each attack in bit operations for every parameter set:

| attack | uov-Ip $(119, 45, \mathbb{F}_{256})$ | uov-Is $(160, 64, \mathbb{F}_{16})$ | uov-III | uov-V |
|---|---|---|---|---|
| collision (birthday on the hash) | 194 | 143 | 303 | 399 |
| direct (solve $P(s) = t$) | 146 | 162 | 216 | 277 |
| Kipnis-Shamir | 258 | 153 | 420 | 565 |
| intersection | 201 | 176 | 314 | 413 |
| wedge | 144 | 158 | 213 | 272 |

*Table 15.2. Base-2 logarithm of the estimated cost of the best attacks on UOV's round 3
parameter sets, in the standard RAM model, from the UOV round 3 specification (2026). The
targets are about 143 for level 1, 207 for level 3 and 272 for level 5.*

Three things stand out. First, the lowest number in every column is close to the target:
the best attack just clears the bar, as in every post-quantum scheme. Second, an attack first posted in 2025, the wedge attack, is the binding
constraint for three of the four sets. That is why uov-Ip grew from $(112, 44)$ to $(119, 45)$
in round 3. Third, Kipnis-Shamir, the attack of §15.4, is irrelevant at these sizes, except
over $\mathbb{F}_{16}$, where $q^{v-o}$ grows slowly and it comes within ten bits. The
specification adds that the wedge estimates rest on heuristic assumptions, some of which have
counterexamples, so they may be pessimistic; cautious designers size against them anyway.

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

### Why a small oil space means a small key

Modern UOV and MAYO generate keys backwards. Write a vector as $(x_V, x_O)$, its first $n - o$
and last $o$ coordinates, and let the secret oil space be the vectors $(Ox, x)$ for a secret
$(n-o) \times o$ matrix $O$. Each public form is a symmetric matrix with three blocks, $P_1$
(vinegar with vinegar), $P_2$ (vinegar with oil) and $P_3$ (oil with oil). The key generator
expands $P_1$ and $P_2$ from a public seed, then *computes* $P_3$ as the one block that makes
$P$ vanish on the oil space. A compressed public key is the seed plus the $m$ blocks $P_3$, and
each is a symmetric $o \times o$ matrix, so the key holds $m \cdot o(o+1)/2$ field elements.

The numbers explain MAYO at once. For uov-Ip, $45 \cdot 45 \cdot 46/2 = 46{,}575$ bytes, plus a
16-byte seed: the 46,591 of Table 15.1. For MAYO_1, $80 \cdot 8 \cdot 9 / 2 = 2{,}880$ entries
of $\mathbb{F}_{16}$, which pack two to a byte into 1,440 bytes, plus the seed: 1,456. The key
shrinks with $o^2$, and MAYO buys a tiny $o$ by giving up the ability to sign with $P$ alone.

### Whipping, step by step

The whipped map $P^*$ takes $k$ vectors and returns $m$ field elements. The matrices
$E_{ij}$ are what keep it from collapsing. If every $E_{ij}$ were the identity, then since
$P(s_1 + s_2) = P(s_1) + P(s_2) + P'(s_1, s_2)$, the whole sum would be just $P(s_1 + \dots +
s_k)$, and the $k$ vectors would be no better than one. MAYO instead lets $E_{ij}$ be
multiplication by a different power of $z$ in the field $\mathbb{F}_q[z]/(f(z))$, with $f$ an
irreducible polynomial of degree $m$, so each pair of inputs is stirred into the output in its
own way. The parameters must satisfy $k\,o \ge m$ (enough unknowns), $k(k+1)/2 \le m$ (enough
room for $k(k+1)/2$ different powers of $z$) and $k < n - o$.

Signing is Oil and Vinegar again, $k$ times over. Pick random vectors $v_1, \dots, v_k$ and look
for oil vectors $o_1, \dots, o_k$ in the oil space with $P^*(v_1 + o_1, \dots, v_k + o_k) = t$.
Expand every term. $P(v_i + o_i) = P(v_i) + P'(v_i, o_i)$ because $P(o_i) = 0$; and
$P'(v_i + o_i, v_j + o_j) = P'(v_i, v_j) + P'(v_i, o_j) + P'(o_i, v_j)$ because $P'(o_i, o_j)
= 0$ as well (both lie in a subspace on which $P$ vanishes). Every surviving term is constant or
linear in the oil vectors, so the system is $m$ linear equations in $k\,o$ unknowns. For
MAYO_1 that is 80 equations in $10 \cdot 8 = 80$ unknowns. The coefficient matrix has a neat
block form: the block for $o_i$ is $\sum_j E_{ij} M_j$, where $M_j$ is the $m \times o$ matrix
of $y \mapsto P'(v_j, y)$ on the oil space. Figure 15.2 draws the idea.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="MAYO whipping: k input vectors, each with a small oil part, are combined by the whipped map into m equations with k times o oil unknowns, enough to sign when k times o is at least m" fill="currentColor" font-size="14">
<rect x="30" y="40" width="150" height="30" fill="none" stroke="currentColor" stroke-width="1.5"/>
<rect x="150" y="40" width="30" height="30" fill-opacity=".4"/>
<text x="90" y="60" text-anchor="middle">s₁</text>
<rect x="210" y="40" width="150" height="30" fill="none" stroke="currentColor" stroke-width="1.5"/>
<rect x="330" y="40" width="30" height="30" fill-opacity=".4"/>
<text x="270" y="60" text-anchor="middle">s₂</text>
<text x="395" y="61" text-anchor="middle" font-size="18">…</text>
<rect x="430" y="40" width="150" height="30" fill="none" stroke="currentColor" stroke-width="1.5"/>
<rect x="550" y="40" width="30" height="30" fill-opacity=".4"/>
<text x="490" y="60" text-anchor="middle">sₖ</text>
<text x="30" y="90" font-size="12" fill-opacity=".7">n entries; shaded: oil part, o of them</text>
<line x1="105" y1="98" x2="250" y2="130" stroke="currentColor"/>
<line x1="285" y1="74" x2="300" y2="130" stroke="currentColor"/>
<line x1="505" y1="74" x2="350" y2="130" stroke="currentColor"/>
<rect x="60" y="132" width="520" height="40" rx="6" fill-opacity=".12" stroke="currentColor"/>
<text x="320" y="157" text-anchor="middle">P*(s₁, …, sₖ) = Σ Eᵢᵢ P(sᵢ) + Σ Eᵢⱼ P′(sᵢ, sⱼ)</text>
<text x="320" y="200" text-anchor="middle">m equations, linear in k · o oil unknowns: solvable when k · o ≥ m</text>
<text x="320" y="226" text-anchor="middle" font-size="12" fill-opacity=".7">MAYO_1: o = 8, k = 10, m = 80   ·   MAYO_2: o = 13, k = 5, m = 64</text>
</svg>
<figcaption>Figure 15.2. Whipping. One copy of P has an oil space too small to sign with (8 dimensions against 80 equations for MAYO_1). Ten copies, mixed by the matrices E_ij, have 80 oil unknowns between them, and the public key still describes only the one small P.</figcaption>
</figure>

**Code it.** A toy MAYO over $\mathbb{F}_{31}$ with $n = 10$, $m = 6$, $o = 2$ and $k = 3$, so $k\,o
= m$. The key is generated backwards, as described above. With 2 oil unknowns for 6 equations,
plain Oil and Vinegar signing would work for about one target in $31^4$; three whipped copies
work every time. Unlike real MAYO, the toy uses a prime field, the simplest whipping schedule
($E_{ij} = z^0, z^1, z^2, \dots$) and no linear terms.

```python
# Uses solve(), quad(), bil() and target() from the UOV code above.
def oil_keygen(n, m, o, rng):
    """Choose the oil space first, then m quadratic forms that vanish on it."""
    v = n - o
    O = [[rng.randrange(q) for _ in range(o)] for _ in range(v)]   # oil vectors are (O x, x)
    oil = [[O[r][c] for r in range(v)] + [int(i == c) for i in range(o)] for c in range(o)]
    P = []
    for _ in range(m):
        S = [[0] * n for _ in range(n)]
        for i in range(v):                       # P1 and P2: random (a seed, in real MAYO)
            for j in range(i, n):
                S[i][j] = S[j][i] = rng.randrange(q)
        X = [[bil(S, a, b) for b in oil] for a in oil]
        for a in range(o):                       # P3 is forced: it cancels X on the oil space
            for b in range(o):
                S[v + a][v + b] = -X[a][b] % q
        P.append(S)
    return P, oil

def zpow(e, f):                                  # matrix of "multiply by z^e" mod f(z)
    m, cols = len(f), []
    for c in range(m):
        poly = [int(i == c) for i in range(m)]
        for _ in range(e):
            top = poly[-1]
            poly = [(a - top * b) % q for a, b in zip([0] + poly[:-1], f)]
        cols.append(poly)
    return [list(r) for r in zip(*cols)]

def mv(M, x):
    return [sum(a * b for a, b in zip(row, x)) % q for row in M]

def whip(P, E, s):                               # P*(s_1, ..., s_k)
    out = [0] * len(P)
    for i in range(len(s)):
        for j in range(i, len(s)):
            val = [quad(S, s[i]) if i == j else 2 * bil(S, s[i], s[j]) % q for S in P]
            out = [(a + b) % q for a, b in zip(out, mv(E[i, j], val))]
    return out

def mayo_sign(P, oil, E, k, msg, rng):
    m, n, o = len(P), len(P[0]), len(oil)
    t = target(msg, m)
    while True:
        vin = [[rng.randrange(q) for _ in range(n)] for _ in range(k)]
        M = [[[2 * bil(S, vin[j], b) % q for b in oil] for S in P] for j in range(k)]
        A = [[0] * (k * o) for _ in range(m)]
        for i in range(k):                       # block i of A is the sum of E_ij M_j
            for j in range(k):
                for c in range(o):
                    col = mv(E[i, j], [row[c] for row in M[j]])
                    for r in range(m):
                        A[r][i * o + c] = (A[r][i * o + c] + col[r]) % q
        y = solve(A, [(a - b) % q for a, b in zip(t, whip(P, E, vin))])
        if y is not None:                        # s_i = v_i + (its oil part)
            return [[(vin[i][x] + sum(y[i * o + c] * oil[c][x] for c in range(o))) % q
                     for x in range(n)] for i in range(k)]

rng = random.Random(2021)
n, m, o, k = 10, 6, 2, 3
P, oil = oil_keygen(n, m, o, rng)
f = [1, 4, 0, 0, 0, 0]                           # f(z) = z^6 + 4z + 1, irreducible mod 31
E, e = {}, 0
for i in range(k):
    for j in range(i, k):
        E[i, j] = E[j, i] = zpow(e, f); e += 1
print("P vanishes on the oil space:", all(quad(S, x) == 0 for S in P for x in oil))
s = mayo_sign(P, oil, E, k, b"close the south airlock", rng)
print("signature:", len(s), "vectors of", n, "entries")
print("valid:", whip(P, E, s) == target(b"close the south airlock", m))
print("valid for another message:", whip(P, E, s) == target(b"open the south airlock", m))
```

It prints:

```text
P vanishes on the oil space: True
signature: 3 vectors of 10 entries
valid: True
valid for another message: False
```


| | $n$ | $m$ | $o$ | $k$ | public key | signature |
|---|---|---|---|---|---|---|
| MAYO_1 | 88 | 80 | 8 | 10 | 1,456 B | 464 B |
| MAYO_2 | 86 | 64 | 13 | 5 | 2,928 B | 239 B |
| MAYO_3 | 118 | 108 | 10 | 11 | 2,986 B | 681 B |
| MAYO_5 | 154 | 142 | 12 | 12 | 5,554 B | 964 B |

*Table 15.3. MAYO parameter sets over $\mathbb{F}_{16}$, from the MAYO team's reference code
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

```text
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

### What changed in round 3

MAYO's round 3 specification (2026) is a good record of how a scheme lives through a
standardization round. Four changes matter.

- **MAYO_2 was resized because of the wedge attack.** In round 2 it was $(n, m, o, k) = (81,
  64, 17, 4)$, with a 4,912-byte public key and a 186-byte signature. The wedge attack cost
  about $2^{112}$ against it, below the $2^{143}$ target. The team argued that the attack is
  much less practical than the number suggests, because it needs about $2^{49}$ matrix-vector
  products one after another, but changed the set anyway. The new set has a smaller oil space
  and more copies, $(86, 64, 13, 5)$: the key fell by 40% to 2,928 bytes and the signature grew
  by 28% to 239 bytes. The team first chose $n = 82$, then, days before the deadline, was told
  privately by Lars Ran and Simon-Philipp Merz of a further key-recovery attack on UOV-like
  keys, not yet published, and raised $n$ to 86 to stay above $2^{143}$ against it.
- **MAYO_1 grew slightly**, from $(86, 78, 8, 10)$ to $(88, 80, 8, 10)$, against direct attacks,
  for about 2% in sizes.
- **Linear terms were added** to the verification equation: $P^*(s) + L(s)$, where $L$ is
  derived from the hash of the message and salt. Without them, an attacker can compute $P^*$
  on many random inputs and the hash on many salts and look for a collision, at a cost of about
  $q^{m/2}$. With $L$ depending on the message, the two sides can no longer be computed apart.
  The idea is in the 1999 UOV paper; the team adopted it after hearing in August 2026 of
  improved claw-finding attacks.
- **The whipping schedule became MDS.** The round 2 order of the powers of $z$ left some
  sub-blocks of the schedule with unusually low rank, which gave collision attacks a small
  speed-up; round 3 reorders them so that every square sub-block has full rank.

None of this is a break. All of it is the ordinary cost of being studied, and it shows why NIST
gives each round about two years.

## 15.7 How Rainbow and GeMSS fell

*Level: intermediate.*

The Cryptanalysis book's [chapter 16](../cryptanalysis/16-Breaking-Post-Quantum-Candidates.md)
retells this attack from the attacker's chair; here it is told from the design to the break.

### Rainbow's layers

**Rainbow** (Jintai Ding and Dieter Schmidt, ACNS 2005) stacked Oil and Vinegar in layers. In
the first layer, some variables are vinegar and some oil. In the second layer, all of the first
layer's variables act as vinegar for a new set of oil variables. Signing solves the layers one
by one, each a linear system. The layers let Rainbow use fewer variables than UOV for the same
security, so its keys were smaller and its signatures tiny. Its round 3 level-1 set, over
$\mathbb{F}_{16}$, had $v_1 = 36$ vinegar variables and two oil layers of $o_1 = o_2 = 32$, so
$n = 100$ variables and $m = 64$ equations: a 66-byte signature (100 half-bytes plus a 16-byte
salt) and a 161,600-byte public key ($64 \cdot 100 \cdot 101 / 2$ half-bytes). It was one of
three signature finalists in NIST's third round (2020-2022), alongside Dilithium and Falcon.

<div class="mars-steps" markdown>

**Rainbow by hand over $\mathbb{F}_7$**, with one vinegar variable $v$, a first-layer oil
variable $a$ and a second-layer oil variable $b$:

$$f_1 = 2v^2 + 3va, \qquad f_2 = v^2 + 4va + a^2 + 5vb + 2ab.$$

The first layer has no $a^2$ and never mentions $b$; the second may square $v$ and $a$, which
are its vinegar, but has no $b^2$. Target $t = (4, 5)$.

1. Pick the vinegar: $v = 1$.
2. Layer 1: $f_1 = 2 + 3a = 4$, so $3a = 2$ and $a = 2 \cdot 3^{-1} = 2 \cdot 5 = 10 \equiv 3$.
3. Layer 2, with $v = 1$ and $a = 3$ now known: $f_2 = 1 + 12 + 9 + 5b + 6b = 22 + 11b \equiv 1
   + 4b$. Setting it to 5 gives $4b = 4$, so $b = 1$.
4. Check: $f_1(1, 3) = 2 + 9 = 11 \equiv 4$ ✓ and $f_2(1, 3, 1) = 1 + 12 + 9 + 5 + 6 = 33 \equiv
   5$ ✓. The central solution is $(v, a, b) = (1, 3, 1)$.
5. Now look at the structure an attacker will use. Take the pure second-layer vector $x = (0,
   0, 1)$. Both equations vanish on it: $f_1$ never sees $b$, and $f_2$ has no $b^2$. That is
   the second oil space $O_2$.
6. Write the polar forms of $f_1$ and $f_2$ at $x$ as rows, one entry per variable $(v, a, b)$.
   For $f_1$, $f_1'(x, y) = 4x_vy_v + 3(x_vy_a + x_ay_v)$, which is $0$ at $x = (0, 0, 1)$: the
   row is $(0, 0, 0)$. For $f_2$ the row is $(5, 2, 0)$. So the $2 \times 3$ matrix $D_x =
   \begin{pmatrix} 0 & 0 & 0 \\ 5 & 2 & 0 \end{pmatrix}$ has rank 1.
7. Compare a vector outside $O_2$, say $x = (1, 0, 0)$: the rows are $(4, 3, 0)$ and $(2, 4,
   5)$, and $D_x$ has rank 2.

</div>

Steps 5 to 7 are the whole weakness in miniature: at a vector of $O_2$ the first layer's polar
forms vanish, and $D_x$ loses $o_1$ of its rank. The secret maps $S$ and $T$ hide *which* rows
vanish, but cannot change a rank.

The layers drew attacks from the start: a MinRank attack by Olivier Billet and Henri Gilbert
in 2006 and the "Rainbow band separation" attack of Ding, Yang and colleagues in 2008, both
absorbed by larger parameters. Rainbow's round 2 level-1 set used $v_1 = o_1 = o_2 = 32$: 96
variables, 64 equations, a 64-byte signature and a 148,992-byte public key.

### Beullens 2020: the rectangular MinRank attack

In October 2020 Ward Beullens, then at IBM Research Zurich, posted "Improved Cryptanalysis of
UOV and Rainbow" (EUROCRYPT 2021). It simplified the description of both schemes to the
oil-space view of §15.3 and gave two new attacks. The **intersection attack** looks for a
vector that lies in the oil spaces of several combinations of the public maps at once, and
applies to UOV and Rainbow alike. The **rectangular MinRank attack** applies to Rainbow only,
and it is the hand example's step 6 at full size.

For any vector $x$, let $D_x$ be the $m \times n$ matrix whose row $i$ is the linear map $y
\mapsto P_i'(x, y)$. Because $P'$ is bilinear, $D_x = \sum_j x_j L_j$, where $L_j = D_{e_j}$ are
$n$ public $m \times n$ matrices. For a random $x$, $D_x$ has rank $m$. For $x$ in $O_2$, all
its rows lie in an $o_2$-dimensional space $W$, the outputs the second layer can reach, so its
rank is at most $o_2$. Finding such an $x$ is a **MinRank** problem: find coefficients $x_j$
that make $\sum_j x_j L_j$ have rank at most $o_2$, with rectangular rather than square
matrices, hence the name. Figure 15.3 draws it.

<figure class="mars-fig">
<svg viewBox="0 0 640 270" width="640" role="img" aria-label="Rectangular MinRank in Rainbow: for a random vector x the m by n matrix of polar forms has full rank m; for x in the second oil space the layer 1 rows vanish in the right basis and the rank drops to o2" fill="currentColor" font-size="14">
<text x="150" y="28" text-anchor="middle" font-weight="bold">x random</text>
<text x="150" y="46" text-anchor="middle" font-size="12" fill-opacity=".7">n columns</text>
<rect x="40" y="56" width="220" height="112" fill-opacity=".25" stroke="currentColor" stroke-width="1.5"/>
<text x="150" y="117" text-anchor="middle">Dₓ</text>
<text x="150" y="192" text-anchor="middle">rank m (64)</text>
<text x="450" y="28" text-anchor="middle" font-weight="bold">x in O₂</text>
<text x="450" y="46" text-anchor="middle" font-size="12" fill-opacity=".7">n columns</text>
<rect x="340" y="56" width="220" height="56" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="450" y="89" text-anchor="middle">0</text>
<rect x="340" y="112" width="220" height="56" fill-opacity=".25" stroke="currentColor" stroke-width="1.5"/>
<text x="450" y="145" text-anchor="middle">Dₓ</text>
<text x="568" y="80" font-size="12">layer 1</text>
<text x="568" y="95" font-size="12">rows (o₁)</text>
<text x="568" y="136" font-size="12">layer 2</text>
<text x="568" y="151" font-size="12">rows (o₂)</text>
<text x="450" y="192" text-anchor="middle">rank ≤ o₂ (32)</text>
<text x="320" y="230" text-anchor="middle" font-size="13">find x with rank(Σ xⱼ Lⱼ) ≤ o₂: MinRank with n matrices of size m × n</text>
<text x="320" y="252" text-anchor="middle" font-size="12" fill-opacity=".7">the zero block is visible only after undoing S; the rank drop is visible to everyone</text>
</svg>
<figcaption>Figure 15.3. The rectangular MinRank attack on Rainbow (round 3 level-1 sizes). In the secret basis, a vector of the second oil space makes the first layer's rows of D_x vanish; in the public basis the zeros are mixed away, but the rank stays at most o₂. Plain UOV has no second layer and no such drop.</figcaption>
</figure>

Beullens estimated that the two attacks cut the cost of key recovery by factors of $2^{17}$,
$2^{53}$ and $2^{73}$ for the round 2 parameter sets at levels 1, 3 and 5, and by $2^{20}$,
$2^{40}$ and $2^{55}$ for the round 3 sets, leaving all of them below NIST's requirements on
paper. Nothing was broken in practice, and the Rainbow team disputed parts of the cost model.

### Beullens 2022: a weekend on a laptop

On 25 February 2022 Beullens posted "Breaking Rainbow Takes a Weekend on a Laptop" (IACR ePrint
2022/214; CRYPTO 2022). Its simplest attack needs only the observation behind Figure 15.3,
turned around. Pick a random $x$ and look at the vectors $o$ of $O_2$ with $D_x\,o = 0$, that
is, $P'(x, o) = 0$ for every public equation. Since $P'(x, o) = P'(o, x)$ and for $o \in O_2$
that value lies in the $o_2$-dimensional space $W$, the map $o \mapsto D_x\,o$ sends the
$o_2$-dimensional $O_2$ into the $o_2$-dimensional $W$: a square linear map, singular about
once in $q$ tries. When it is singular, some nonzero $o \in O_2$ lies in the kernel of $D_x$,
which is a public subspace of dimension about $n - m$. Inside that kernel, the conditions $P(o)
= 0$ give $m$ quadratic equations in about $n - m$ unknowns, which for Rainbow's parameters is
roughly twice as many equations as unknowns: exactly the overdetermined shape that §15.2 said
is easy. (Over $\mathbb{F}_{16}$, $P'(x, x) = 0$, so $x$ itself also lies in the kernel and is
removed first.)

One vector of $O_2$ unlocks the rest. Its matrix $D_o$ has rank $o_2$, and its columns span
$W$. Combinations of the public equations that are zero on $W$ are the first layer in disguise,
and their common kernel is all of $O_2$. What remains is a smaller Oil and Vinegar system with
about as much vinegar as oil, $v_1 = 32$ and $o_1 = 32$ in round 2, which is the balanced case
that Kipnis and Shamir broke in 1998 (§15.4).

The paper's attacks use the layer structure directly, alone or combined with the rectangular
MinRank formulation, and beat every earlier attack on every Rainbow parameter set. On the round
2 level-1 parameters, the secret key came out after on average 53 hours, a weekend, on a
standard laptop. Repairing Rainbow would have meant parameters so large that it lost its
advantage over plain UOV. NIST did not select it (NIST IR 8413, July 2022).

**Break it.** A toy Rainbow over $\mathbb{F}_{31}$ with $v_1 = o_1 = o_2 = 3$, so $n = 9$ and $m
= 6$, built as $P = S \circ F \circ T$ with random secret $S$ and $T$. The code checks the rank
drop, runs the simple attack (search the 3-dimensional kernel of $D_x$ for a vector on which
all six public equations vanish, trying new $x$ until one exists), then recovers $W$ and all of
$O_2$ from the one vector found.

```python
import random, itertools
q = 31

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

def rank(rows):
    return len(rows[0]) - len(kernel(rows))

def congruent(T, M):                    # T^T M T
    n = len(T)
    MT = [[sum(M[i][k] * T[k][j] for k in range(n)) % q for j in range(n)] for i in range(n)]
    return [[sum(T[k][i] * MT[k][j] for k in range(n)) % q for j in range(n)] for i in range(n)]

def rainbow_keygen(v1, o1, o2, rng):
    n, m = v1 + o1 + o2, o1 + o2
    F = []
    for e in range(m):
        seen = v1 + o1 if e < o1 else n         # layer 1 never sees the o2 variables
        vin = v1 if e < o1 else v1 + o1         # within a layer, no oil-times-oil terms
        M = [[0] * n for _ in range(n)]
        for i in range(vin):
            for j in range(i, seen):
                M[i][j] = M[j][i] = rng.randrange(q)
        F.append(M)
    while True:                                 # secret invertible maps T (inputs), S (outputs)
        T = [[rng.randrange(q) for _ in range(n)] for _ in range(n)]
        S = [[rng.randrange(q) for _ in range(m)] for _ in range(m)]
        if rank(T) == n and rank(S) == m:
            break
    FT = [congruent(T, M) for M in F]
    P = [[[sum(S[i][e] * FT[e][a][b] for e in range(m)) % q for b in range(n)]
          for a in range(n)] for i in range(m)]
    O2 = kernel(T[:v1 + o1])                    # T x is zero outside the o2 part
    W = [[S[i][j] for i in range(m)] for j in range(o1, m)]   # where layer 2's outputs land
    return P, O2, W

def D(P, x):                                    # the m x n matrix of y -> P'(x, y)
    n = len(x)
    return [[2 * sum(x[a] * Pi[a][b] for a in range(n)) % q for b in range(n)] for Pi in P]

def points(d):                                  # one nonzero vector per line through 0
    for lead in range(d):
        for tail in itertools.product(range(q), repeat=d - lead - 1):
            yield [0] * lead + [1] + list(tail)

def simple_attack(P, rng):
    n, tries = len(P[0]), 0
    while True:
        tries += 1
        x = [rng.randrange(q) for _ in range(n)]
        K = kernel(D(P, x))                     # about n - m dimensions
        R = [[[sum(K[a][i] * Pi[i][j] * K[b][j] for i in range(n) for j in range(n)) % q
               for b in range(len(K))] for a in range(len(K))] for Pi in P]   # P restricted to K
        for c in points(len(K)):
            if all(sum(c[a] * Ri[a][b] * c[b] for a in range(len(c)) for b in range(len(c))) % q == 0
                   for Ri in R):
                return [sum(ci * Kc[i] for ci, Kc in zip(c, K)) % q for i in range(n)], tries

rng = random.Random(2022)
P, O2, W = rainbow_keygen(v1=3, o1=3, o2=3, rng=rng)
x = [rng.randrange(q) for _ in range(9)]
print("rank of D_x, random x:", rank(D(P, x)), "  x in O2:", rank(D(P, O2[0])))
o, tries = simple_attack(P, rng)
print("found a vector of O2 after", tries, "random choices of x:", rank(O2 + [o]) == 3)
Wfound = [list(col) for col in zip(*D(P, o))]
print("its D_o spans W:", rank(Wfound) == 3 and rank(W + Wfound) == 3)
L = kernel(W)                                   # functionals that kill W pick out layer 1
layer1 = [[[sum(l[i] * P[i][a][b] for i in range(6)) % q for b in range(9)] for a in range(9)]
          for l in L]
O2found = kernel([row for Q in layer1 for row in Q])
print("all of O2 recovered:", len(O2found) == 3 and rank(O2 + O2found) == 3)
```

It prints:

```text
rank of D_x, random x: 6   x in O2: 3
found a vector of O2 after 24 random choices of x: True
its D_o spans W: True
all of O2 recovered: True
```

Twenty-four tries, close to the $q = 31$ that the "singular once in $q$" argument predicts.
The first layer, modulo $O_2$, is now a balanced Oil and Vinegar system with 3 vinegar and 3 oil
variables, which §15.4's code finishes.

!!! note "Life story: Rainbow"
    **Born:** 2005, Jintai Ding and Dieter Schmidt (ACNS 2005), layered Oil and Vinegar ·
    **Purpose:** UOV's security with fewer variables, smaller keys and signatures of about 64
    bytes · **Helped:** a NIST round 3 finalist (2020-2022); taught the field that every layer
    is a hidden subspace with extra constraints · **Retired:** 2022, after Beullens's attacks;
    not selected (NIST IR 8413) · **Replaced by:** plain UOV and MAYO in the additional
    signatures process

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

NIST's additional signatures process has run in public since 2022. Figure 15.4 draws it.

<figure class="mars-fig">
<svg viewBox="0 0 640 240" width="640" role="img" aria-label="Timeline of NIST's additional signatures process: call in September 2022, 40 round 1 candidates in July 2023, 14 round 2 candidates in October 2024, 9 round 3 candidates in May 2026, HAWK withdrawn in July 2026 leaving 8, updated specifications due August 2026, a conference planned for 2027 and the end of round 3 expected around 2028" fill="currentColor" font-size="13">
<line x1="30" y1="110" x2="428" y2="110" stroke="currentColor" stroke-width="2"/>
<line x1="428" y1="110" x2="615" y2="110" stroke="currentColor" stroke-width="2" stroke-dasharray="6 5" stroke-opacity=".7"/>
<circle cx="55" cy="110" r="6"/>
<circle cx="132" cy="110" r="6"/>
<circle cx="245" cy="110" r="6"/>
<circle cx="384" cy="110" r="6"/>
<circle cx="402" cy="110" r="4"/>
<circle cx="480" cy="110" r="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<circle cx="565" cy="110" r="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="55" y="92" text-anchor="middle">Sep 2022</text>
<text x="132" y="92" text-anchor="middle">Jul 2023</text>
<text x="245" y="92" text-anchor="middle">Oct 2024</text>
<text x="378" y="92" text-anchor="middle">May 2026</text>
<text x="480" y="92" text-anchor="middle">2027</text>
<text x="565" y="92" text-anchor="middle">~2028</text>
<line x1="428" y1="56" x2="428" y2="104" stroke="currentColor" stroke-dasharray="2 3"/>
<text x="434" y="60" font-size="12" fill-opacity=".7">today (Nov 2026)</text>
<text x="55" y="136" text-anchor="middle">call</text>
<text x="132" y="136" text-anchor="middle">round 1</text>
<text x="132" y="154" text-anchor="middle" font-weight="bold">40</text>
<text x="245" y="136" text-anchor="middle">round 2</text>
<text x="245" y="154" text-anchor="middle" font-weight="bold">14</text>
<text x="372" y="136" text-anchor="middle">round 3</text>
<text x="372" y="154" text-anchor="middle" font-weight="bold">9</text>
<text x="480" y="136" text-anchor="middle">7th PQC</text>
<text x="480" y="154" text-anchor="middle">conference</text>
<text x="565" y="136" text-anchor="middle">round 3</text>
<text x="565" y="154" text-anchor="middle">ends</text>
<line x1="402" y1="116" x2="402" y2="186" stroke="currentColor" stroke-dasharray="3 3" stroke-opacity=".7"/>
<text x="402" y="204" text-anchor="middle">Jul 2026: HAWK withdrawn, 8 left</text>
<text x="402" y="222" text-anchor="middle" fill-opacity=".7">Aug 2026: updated specifications due</text>
</svg>
<figcaption>Figure 15.4. NIST's additional signatures process as of November 2026. Filled points have happened; hollow ones are NIST's stated plans. Each round cut the field, and round 3 is expected to last about two years.</figcaption>
</figure>

- **Call** (September 2022) and **round 1** (July 2023): NIST received 50 submissions by the
  June 2023 deadline and accepted 40 as complete and proper, across multivariate, code-based,
  lattice, isogeny, symmetric and MPC-in-the-head designs. Several were broken within weeks, which is
  what a first round is for.
- **Round 2** (24 October 2024, NIST IR 8528): 14 candidates: CROSS, FAEST, HAWK, LESS, MAYO,
  Mirath (a merger of MIRA and MiRitH), MQOM, PERK, QR-UOV, RYDE, SDitH, SNOVA, SQIsign and UOV.
- **Round 3** (14 May 2026, NIST IR 8610): nine candidates: FAEST, HAWK, MAYO, MQOM, QR-UOV,
  SDitH, SNOVA, SQIsign and UOV. CROSS, LESS, Mirath, PERK and RYDE did not advance; the report
  explains each decision. NIST said the round would last about two years, set 14 August 2026 as
  the deadline for updated specifications, and planned its 7th PQC Standardization Conference
  for late spring or early summer 2027.
- **HAWK withdrawn** (July 2026): HAWK, the only lattice candidate left, was withdrawn by its
  own team after a new key-recovery attack (§15.10). NIST's round 3 page lists it as withdrawn.

As of November 2026 the eight remaining candidates are:

| family | candidates | in one line |
|---|---|---|
| multivariate | UOV, MAYO, QR-UOV, SNOVA | Oil and Vinegar and three ways to shrink its key |
| MPC-in-the-head | MQOM, SDitH | a zero-knowledge proof of a solution to MQ or to syndrome decoding |
| symmetric | FAEST | a zero-knowledge proof of an AES key |
| isogeny | SQIsign | the smallest public key plus signature of all ([Chapter 16](16-Isogenies.md)) |

*Table 15.4. NIST's round 3 additional signature candidates still in the process, November
2026.*

**What happens next.** The round 3 specifications answer two rounds of cryptanalysis: UOV,
MAYO, QR-UOV and SNOVA all changed parameters or algorithms, and SQIsign grew after a 2026
algorithm for its underlying problem. NIST plans a conference in 2027, and the round is
expected to end around 2028. A scheme chosen then still needs a draft standard, public comments and a final standard,
which took ML-KEM and ML-DSA two years (selected 2022, FIPS 203 and FIPS 204 in August 2024),
so a standard from the on-ramp is unlikely before 2029. Until then engineers use ML-DSA, FN-DSA
once published and SLH-DSA, and keep room in their formats for a later swap.

## 15.9 Structured oil: QR-UOV and SNOVA

*Level: expert.*

QR-UOV and SNOVA shrink UOV's key the same way at heart: they build each public matrix from
small blocks that each stand for one element of a bigger algebra, so a few stored values
describe a whole block. Both are UOV underneath, and after Rainbow their added structure is the
first thing reviewers attack.

### QR-UOV: blocks from a quotient ring

**QR-UOV** (Hiroki Furue, Yasuhiko Ikematsu, Yutaro Kiyomura and Tsuyoshi Takagi, ASIACRYPT
2021) chooses a small $\ell$ and a polynomial $f(x)$ of degree $\ell$, and builds every public
matrix from $\ell \times \ell$ blocks, each of which represents multiplication by an element of
the ring $\mathbb{F}_q[x]/(f(x))$ (twisted by a fixed matrix so that the whole thing stays
symmetric). A block needs $\ell$ field elements instead of $\ell^2$, so the key shrinks by a
factor of about $\ell$. The round 3 parameters use $q = 127$ and either $\ell = 3$, with $f(x)
= x^3 - x - 1$, or $\ell = 10$:

| level 1 set | $(q, v, m, \ell)$ | $n$ | public key | signature |
|---|---|---|---|---|
| QR-UOV, $\ell = 3$ | (127, 156, 54, 3) | 210 | 24,256 B | 200 B |
| QR-UOV, $\ell = 10$ | (127, 540, 60, 10) | 600 | 11,041 B | 541 B |
| uov-Ip, for comparison | (256, 74, 45, 1) | 119 | 46,591 B | 135 B |

*Table 15.5. QR-UOV round 3 sizes at level 1, from the QR-UOV round 3 specification (2026).*

The round 3 version also fixed two small things worth knowing. Signing now resamples whenever the
linear system's rank falls more than $\Delta = 2$ below full, because a system of low rank can
cost exponentially many retries.
And it closes a trivial forgery that every homogeneous quadratic scheme shares: since $P(-s) =
P(s)$, anyone holding a signature $s$ also holds a second one, $-s$. In the hand example of
§15.3, $s = (3, 5, 6)$ and $-s = (4, 2, 1)$ over $\mathbb{F}_7$, and $P(4, 2, 1) = 16 + 24 + 8 +
4 + 10 + 4 = 66 \equiv 3$, the same target. That breaks strong unforgeability (SUF-CMA,
[Chapter 3](03-KEMs-and-Signatures.md)) though not ordinary unforgeability, and QR-UOV now
outputs whichever of $s$ and $-s$ comes first in lexicographic order and rejects the other.

### SNOVA: a noncommutative ring, whipped

**SNOVA**, the "simple noncommutative UOV" of Lih-Chung Wang, Po-En Tseng, Yen-Liang Kuan and
Chun-Yen Chou (2022), goes further. Its variables and coefficients are $\ell \times \ell$ matrices over
$\mathbb{F}_q$, elements of a noncommutative ring, and fixed public matrices mix them so that
the noncommutativity does not get in the signer's way. Its round 3 specification describes the
result plainly: SNOVA is a MAYO-style whipping applied to a structured UOV key, and its
structure is close to QR-UOV's, because the matrices it uses generate a ring isomorphic to the
field with $q^\ell$ elements. It is the most aggressive of the four multivariate candidates, and
its sizes show the gain: at level 1 over $\mathbb{F}_{16}$, SNOVA_I_K has a 376-byte public key
and a 528-byte signature, SNOVA_I_B 656 and 388, SNOVA_I_S 1,016 and 272. Those are the smallest
public keys of any multivariate candidate.

They have been bought with the longest attack record of the eight. In order:

- **January 2024.** Yasuhiko Ikematsu and Rika Akiyama, and independently Peigen Li and Jintai
  Ding, showed that the known key-recovery attacks on SNOVA are attacks on an underlying UOV
  instance, and that the original analysis had overestimated SNOVA's security against them.
- **August 2024.** Ward Beullens, "Improved Cryptanalysis of SNOVA" (IACR ePrint 2024/1297),
  found that SNOVA implicitly whips a structured key, and that the extra structure allows
  forgery attacks. They cut the security margin of the parameter sets by factors between $2^8$
  and $2^{39}$. Worse, some keys were weak: for SNOVA-37-17-2, a level 1 set of the time, about one public
  key in 500 allowed a universal forgery at about $2^{97}$ operations, and about one in 143,000
  could be broken in practice within minutes.
- **October 2024.** Daniel Cabarcas, Peigen Li, Javier Verbel and Ricardo Villanueva-Polanco
  (ePrint 2024/1770) used SNOVA's stability under a commutative group of matrices to solve its
  systems faster, speeding up the reconciliation attack on every parameter set by factors from
  about 2 to about $2^{20}$, and gave experimental evidence that a forgery attack brings some
  sets below NIST's threshold.
- **2025-2026.** The wedge attack (§15.5) pressed on the characteristic-2 members of the whole
  UOV family, and NIST IR 8610 suggested that teams consider odd characteristic. SNOVA's round
  3 version was reformulated with seven parameters $(v, o, q, \ell, r, m_1, m_2)$, rectangular
  signatures, fixed mixing matrices, and alternative parameter sets over prime fields.
- **September 2026.** Ward Beullens and Basil Hess (ePrint 2026/2154) found that SNOVA's round 3
  code makes its secret vinegar values by reducing random bytes modulo a power of $q$, which is
  slightly biased when $q$ is odd. The leak is at most about 0.086 bits per variable, but it
  turns key recovery into a learning-parity-with-noise problem over $\mathbb{F}_q$. For four of
  the six odd-characteristic alternative sets, the secret key came out from 9 to 180 million
  signatures in at most 16 minutes. The recommended sets, all over $\mathbb{F}_{16}$, are not
  affected, since a byte splits evenly into two elements of $\mathbb{F}_{16}$, and the fix is
  simply to sample uniformly.

The last item is an implementation flaw, not a mathematical one, and it is easy to see in
miniature. A byte is uniform on 0 to 255, but 256 is not a multiple of $13^2 = 169$, so "byte
mod 169" makes the values 0 to 86 twice as likely as the values 87 to 168.

```python
import math
counts = [0] * 169
for byte in range(256):
    counts[byte % 169] += 1                  # 0..86 hit twice, 87..168 once
entropy = -sum(c / 256 * math.log2(c / 256) for c in counts)
print("values hit twice:", counts.count(2), " once:", counts.count(1))
print(f"entropy {entropy:.4f} bits of a possible {math.log2(169):.4f}")
print(f"each pair of F_13 digits leaks {math.log2(169) - entropy:.4f} bits")
```

It prints:

```text
values hit twice: 87  once: 82
entropy 7.3203 bits of a possible 7.4009
each pair of F_13 digits leaks 0.0806 bits
```

This toy is not SNOVA's exact sampler, but it is the same kind of leak and about the same size:
less than a tenth of a bit per sample. Rejection sampling (draw again whenever the byte is 169
or more) removes it entirely, which is what FIPS 203 and FIPS 204 do for the same reason. A
tenth of a bit sounds like nothing; multiplied by millions of signatures, it was a key.

## 15.10 Proofs, AES and isogenies: the rest of the on-ramp

*Level: expert.*

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

```text
    2 parties: 128 repetitions for 2^-128
   16 parties:  32 repetitions for 2^-128
  256 parties:  16 repetitions for 2^-128
 1024 parties:  13 repetitions for 2^-128
```

More parties mean fewer repetitions and shorter signatures but more work, which is the main
tuning knob of every MPC-in-the-head scheme. The round 3 schemes add a second knob,
**grinding**: the signer must find a counter that makes the challenge hash start with $w$ zero
bits, which costs it about $2^w$ hashes once per signature. A forger who tries challenges one
by one must pay the same price for every try, so $w$ bits of grinding replace $w$ bits of
soundness, and the number of repetitions $\tau$ only has to satisfy $\tau \log_2 N + w \ge 128$.
SDitH's round 3 level-1 sets use $N = 2^{11}$ with $w = 9$ ("short") and $N = 2^7$ with $w = 4$
("fast"):

```python
import math
for name, logN, w in (("short", 11, 9), ("fast", 7, 4)):
    tau = math.ceil((128 - w) / logN)
    print(f"SDitH {name}: N = {2 ** logN}, w = {w}: tau = {tau}, bits = {tau * logN + w}")
```

It prints:

```text
SDitH short: N = 2048, w = 9: tau = 11, bits = 130
SDitH fast: N = 128, w = 4: tau = 18, bits = 130
```

Those are the repetition counts in the SDitH round 3 specification: 11 repetitions give a
3,721-byte signature and 18 give 4,914 bytes, with a 70-byte public key either way.

The security of an MPC-in-the-head scheme rests only on the problem being proved and on hash
functions. **SDitH** (Thibauld Feneuil, Antoine Joux and Matthieu Rivain, CRYPTO 2022, now a
larger team) proves knowledge of a low-weight solution to a random syndrome decoding instance,
the problem under McEliece ([Chapter 13](13-Code-Based-Encryption-McEliece.md)). **MQOM** ("MQ
on my Mind") proves knowledge of a solution to a random MQ system, the problem of §15.2 with no
trapdoor at all; its round 3 level-1 sets have 52- or 64-byte public keys and signatures of
2,492 to 3,316 bytes. Round 2 had three more of the kind, and none advanced: **Mirath**
(MinRank in the head, a merger of MIRA and MiRitH), **RYDE** (rank-metric syndrome decoding)
and **PERK** (the permuted kernel problem). Two code-based schemes built on Fiat-Shamir
identification protocols also stopped at round 2: **CROSS** (restricted syndrome decoding) and
**LESS** (linear code equivalence).

**FAEST** (Carsten Baum and others) goes further. The secret key is an AES key $k$; the
public key is a block $x$ and its encryption $y = \mathrm{AES}_k(x)$, 32 bytes at level 1. A
signature is a zero-knowledge proof that the signer knows $k$, made with a newer technique
called VOLE-in-the-head (Baum and others, CRYPTO 2023), which replaces the $N$ simulated parties
with vector oblivious linear evaluations and proves the AES circuit far more compactly. FAEST's
security rests only on AES and hash functions, among the most studied designs in cryptography,
which makes it a natural rival to SLH-DSA. At level 1 its round 3 signatures are 4,066 bytes
(FAEST-128s) or 5,170 bytes (FAEST-128f), against 7,856 bytes for SLH-DSA-SHA2-128s; on a recent
Intel notebook processor FAEST-128f signs in about 0.35 ms and verifies in about 0.24 ms. A variant,
FAEST-EM, computes $\mathrm{AES}_x(k) \oplus k$ with the public block as the key, which keeps
the key schedule out of the proof and shortens signatures to 3,466 and 4,170 bytes.

**SQIsign** is the isogeny candidate, and [Chapter 16](16-Isogenies.md) tells its story. Its
round 3 specification (2026) gives an 83-byte public key and a 200-byte signature at level 1,
up from 65 and 148 bytes in round 2: the parameters were raised in response to Benjamin
Wesolowski's 2026 algorithm for the supersingular isogeny problem, and the signature format
changed. Its total of 283 bytes is the smallest in the process; its signing, at about 94
million cycles, is among the slowest.

**HAWK** (Léo Ducas, Eamonn Postlethwaite, Ludo Pulles and Wessel van Woerden, ASIACRYPT 2022)
was the lattice candidate, built on the lattice isomorphism problem and designed to be a simpler
Falcon ([Chapter 10](10-NTRU-Falcon-and-FN-DSA.md)). In mid-2026 an attack posted to NIST's
pqc-forum, titled "HAWK-n Key Recovery Reduces to SVP in Dimension n/2 + 1", showed that
recovering a HAWK-n key reduces to a shortest-vector problem in dimension $n/2 + 1$. The HAWK
team withdrew the scheme in July 2026, writing that the attack roughly halves the
lattice-reduction block size needed and that doubling the parameters would make HAWK
uncompetitive. According to the attack's authors and to NIST, it does not affect ML-DSA, Falcon
or the published standards, which rest on different problems.

Figure 15.5 puts the eight remaining candidates and three NIST signatures on one chart.
<figure class="mars-fig">
<svg viewBox="0 0 640 400" width="640" role="img" aria-label="Scatter chart on log scales of public key size against signature size at level 1: UOV 135 B signature and 46,591 B key; QR-UOV 200 and 24,256; MAYO_2 239 and 2,928; SNOVA_I_S 272 and 1,016; SQIsign 200 and 83; MQOM 2,492 and 52; SDitH 3,721 and 70; FAEST-128s 4,066 and 32; for comparison ML-DSA-44 2,420 and 1,312, Falcon-512 666 and 897, SLH-DSA-128s 7,856 and 32" fill="currentColor" font-size="13">
<line x1="80" y1="340" x2="605" y2="340" stroke="currentColor"/>
<line x1="80" y1="40" x2="80" y2="340" stroke="currentColor"/>
<line x1="127" y1="340" x2="127" y2="346" stroke="currentColor"/>
<line x1="363" y1="340" x2="363" y2="346" stroke="currentColor"/>
<line x1="599" y1="340" x2="599" y2="346" stroke="currentColor"/>
<text x="127" y="362" text-anchor="middle" font-size="12">100 B</text>
<text x="363" y="362" text-anchor="middle" font-size="12">1 KB</text>
<text x="599" y="362" text-anchor="middle" font-size="12">10 KB</text>
<text x="340" y="388" text-anchor="middle">signature size (log scale)</text>
<line x1="74" y1="340" x2="80" y2="340" stroke="currentColor"/>
<line x1="74" y1="265" x2="80" y2="265" stroke="currentColor"/>
<line x1="74" y1="190" x2="80" y2="190" stroke="currentColor"/>
<line x1="74" y1="115" x2="80" y2="115" stroke="currentColor"/>
<line x1="74" y1="40" x2="80" y2="40" stroke="currentColor"/>
<text x="70" y="344" text-anchor="end" font-size="12">10 B</text>
<text x="70" y="269" text-anchor="end" font-size="12">100 B</text>
<text x="70" y="194" text-anchor="end" font-size="12">1 KB</text>
<text x="70" y="119" text-anchor="end" font-size="12">10 KB</text>
<text x="70" y="44" text-anchor="end" font-size="12">100 KB</text>
<text x="80" y="26">public key (log scale)</text>
<circle cx="158" cy="65" r="5"/><text x="166" y="69">UOV</text>
<circle cx="198" cy="86" r="5"/><text x="206" y="90">QR-UOV</text>
<circle cx="217" cy="155" r="5"/><text x="209" y="159" text-anchor="end">MAYO_2</text>
<circle cx="230" cy="189" r="5"/><text x="222" y="193" text-anchor="end">SNOVA</text>
<circle cx="198" cy="271" r="5"/><text x="206" y="275">SQIsign</text>
<circle cx="457" cy="286" r="5"/><text x="449" y="290" text-anchor="end">MQOM</text>
<circle cx="498" cy="277" r="5"/><text x="498" y="264" text-anchor="middle">SDitH</text>
<circle cx="507" cy="302" r="5"/><text x="500" y="324" text-anchor="middle">FAEST</text>
<circle cx="454" cy="181" r="5" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="462" y="185">ML-DSA-44</text>
<circle cx="322" cy="194" r="5" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="330" y="198">Falcon-512</text>
<circle cx="574" cy="302" r="5" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="568" y="324" text-anchor="middle">SLH-DSA</text>
<circle cx="420" cy="52" r="5"/><text x="430" y="56" font-size="12">round 3 candidate</text>
<circle cx="420" cy="74" r="5" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="430" y="78" font-size="12">standard (FN-DSA to come)</text>
</svg>
<figcaption>Figure 15.5. Level 1 sizes of the eight round 3 candidates (filled) and three NIST signatures for comparison (hollow), on log scales. Multivariate schemes sit at the top left (short signatures, larger keys); proof-based schemes at the bottom right (tiny keys, kilobyte signatures); SQIsign alone is small on both axes. UOV is uov-Ip with a compressed key, SNOVA is SNOVA_I_S, MQOM and SDitH their shortest level-1 sets, FAEST is FAEST-128s, SLH-DSA is SLH-DSA-SHA2-128s.</figcaption>
</figure>

Only SQIsign and SNOVA beat ML-DSA-44 on both axes at once: SQIsign pays in signing time,
SNOVA in a short and eventful attack record. Every other candidate wins on one axis and loses
on the other.

## 15.11 In the real world

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
certificates. A simple rule of thumb from Figure 15.5: if a key is sent once and used for
thousands of signatures, count the signature; if every message carries a fresh key, as with
the leaf certificate in a handshake, count the sum.

**Mars.** Arcadia City's water-recycling plant logs a reading every minute from each of 4,000
sensors, 5.76 million readings a day, and each reading is signed so that a faulty or tampered
sensor can be traced. With ML-DSA-44 the signatures alone would be about 14 gigabytes a day;
with UOV at 135 bytes, under 0.8 gigabytes. The public keys, one per sensor, are installed once, when the sensor is.
The city's engineers still keep ML-DSA in the design: UOV is not yet a standard, and the plant
must be able to switch.

The SNOVA story adds a second rule: one key per sensor, not one per plant. A plant-wide key
would sign 5.76 million readings a day and hand an attacker the 9 to 180 million signatures of
the Beullens-Hess attack in two to thirty-one days; a sensor's own key signs 1,440 a day and
would need about 17 years to reach the smallest of those numbers. Per-device keys also keep
revocation local, which matters when a notice from an Earth-side authority takes 3 to 22
minutes to arrive: the plant runs its own small authority on site, certified by Earth's root.
Sensor firmware is signed twice, with ML-DSA and with a hash-based signature, so that a break
of either family does not leave the city unable to push a fix.

## 15.12 Going deeper

*Level: expert.*

- **The oil-space view.** Beullens's "Improved Cryptanalysis of UOV and Rainbow" (2021) is the
  clearest modern description of UOV and Rainbow; section 4 of the UOV round 3 specification
  then derives every cost in Table 15.2, including the wedge attack of Ran (EUROCRYPT 2026).
- **MinRank.** The Support-Minors modeling (Bardet and others, 2020) and the
  Cryptanalysis book's [chapter 16](../cryptanalysis/16-Breaking-Post-Quantum-Candidates.md),
  which also tells the GeMSS and HFE breaks.
- **MAYO's assumption.** The MAYO round 3 specification states the "multi-target whipped MQ"
  problem its proof relies on, and explains the MDS whipping schedule and the linear terms.
- **Proof-based signatures.** Ishai, Kushilevitz, Ostrovsky and Sahai (STOC 2007) for
  MPC-in-the-head; Baum and others (CRYPTO 2023) for VOLE-in-the-head, the engine of FAEST.
- **HFE.** Patarin (EUROCRYPT 1996) and Tao, Petzoldt and Ding (CRYPTO 2021).

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

??? question "5. In the hand example of §15.3, sign the target $t = 0$ instead of 3, with the same $v$ and $o$."

    $P(v + y\,o) = 6 + 2y$, so $2y \equiv -6 \equiv 1$ and $y = 4$ (since $2 \cdot 4 = 8 \equiv
    1$). Then $s = (1, 1, 0) + 4\,(1, 2, 3) = (5, 9, 12) \equiv (5, 2, 5)$, and $P(5, 2, 5) = 25 +
    30 + 8 + 25 + 50 + 100 = 238 = 7 \cdot 34 \equiv 0$ ✓.

??? question "6. Give UOV's level-1 signature and public key sizes, and compare with ML-DSA-44."

    uov-Ip: 135-byte signature, 321,300-byte public key (46,591 compressed). ML-DSA-44: 2,420-byte
    signature, 1,312-byte public key.

??? question "7. What does MAYO's whipping achieve?"

    It lets a map with an oil space too small to sign (8 dimensions for 80 equations at MAYO_1)
    be combined over $k$ inputs into a map with a $k\,o$-dimensional oil space, so the public
    key stays small at the cost of a longer signature.

??? question "8. Why does the matrix $D_x$ of polar forms have rank at most $o_2$ for $x$ in Rainbow's second oil space, and why does plain UOV not have this weakness?"

    Rainbow's first-layer equations never mention the second-layer oil variables, so their
    polar forms vanish identically at such an $x$; only the $o_2$ second-layer rows survive,
    and the secret maps cannot change a rank. In UOV there is one layer, and for an oil vector
    $x$ every equation still has vinegar-times-oil terms, so $D_x$ keeps full rank $m$. Beullens
    turned the Rainbow rank drop into a key recovery in about 53 hours on a laptop.

??? question "9. Which candidates remain in NIST's third round of additional signatures as of November 2026?"

    Eight: FAEST, MAYO, MQOM, QR-UOV, SDitH, SNOVA, SQIsign and UOV. Nine were chosen on 14 May
    2026 (NIST IR 8610); HAWK's team withdrew it in July 2026 after a key-recovery attack.

??? question "10. The Beullens-Hess attack on SNOVA's odd-characteristic sets needs 9 to 180 million signatures from one key. Why does giving each of Arcadia's 4,000 sensors its own key defeat it in practice, and what fixes the flaw itself?"

    A sensor signs 1,440 readings a day, so even 9 million signatures from one key would take
    about 17 years, while one plant-wide key would supply them in under two days. The flaw itself
    is biased sampling of the secret vinegar values (random bytes reduced modulo a power of $q$);
    sampling uniformly, for example by rejection, removes it.

## What you learned

- Multivariate signatures hide an easy-to-invert quadratic map behind a change of variables;
  verification is just evaluating quadratics.
- Oil and Vinegar becomes linear once the vinegar is fixed; its secret is a subspace on which
  the public map vanishes.
- The balanced version falls to the Kipnis-Shamir invariant-subspace attack; unbalanced UOV
  has stood since 1999.
- UOV gives 96- to 135-byte signatures with large keys, and its parameters still move with
  new attacks such as the 2025 wedge attack; MAYO whips $k$ copies of a map with a tiny oil
  space and trades a longer signature for a key of 1.5 to 3 kilobytes.
- Rainbow's second layer made every vector of its second oil space drop the rank of the polar
  matrix $D_x$; Beullens turned that into a rectangular MinRank attack (2020) and a 53-hour key
  recovery (2022). GeMSS's HFE structure fell to MinRank too; both left NIST's process in 2022.
- QR-UOV and SNOVA shrink UOV's key with ring structure; SNOVA has paid for its small keys with
  forgery attacks, weak keys and, in 2026, a vinegar-sampling bias.
- MPC-in-the-head and FAEST give tiny keys and kilobyte signatures; SQIsign is small on both
  axes; HAWK was withdrawn in July 2026.
- As of November 2026, eight candidates remain in round 3 of the on-ramp, four of them
  multivariate, and no decision is expected before about 2028.

**Next:** [Chapter 16](16-Isogenies.md), isogenies: SIKE's spectacular fall and SQIsign's
tiny signatures.

## Further reading

- NIST, "Post-Quantum Cryptography: Additional Digital Signature Schemes", project pages for
  rounds 1 to 3 (round 3 page updated October 2026); NIST IR 8528 (October 2024) and NIST IR
  8610 (May 2026), the status reports on rounds 1 and 2.
- The round 3 specifications of UOV, MAYO, QR-UOV, SNOVA, MQOM, SDitH, FAEST and SQIsign
  (2026), on NIST's round 3 page: the source of every size and attack cost quoted here.
- Aviad Kipnis, Jacques Patarin and Louis Goubin, "Unbalanced Oil and Vinegar Signature
  Schemes" (EUROCRYPT 1999).
- Jintai Ding and Dieter Schmidt, "Rainbow, a New Multivariable Polynomial Signature Scheme"
  (ACNS 2005).
- Ward Beullens, "Improved Cryptanalysis of UOV and Rainbow" (EUROCRYPT 2021; ePrint 2020/1343).
- Ward Beullens, "Breaking Rainbow Takes a Weekend on a Laptop" (CRYPTO 2022; ePrint 2022/214).
- Lars Ran, "Wedges, Oil, and Vinegar: An Analysis of UOV in the Exterior Algebra" (EUROCRYPT
  2026).
- Hiroki Furue, Yasuhiko Ikematsu, Yutaro Kiyomura and Tsuyoshi Takagi, "A New Variant of
  Unbalanced Oil and Vinegar Using Quotient Ring: QR-UOV" (ASIACRYPT 2021).
- Ward Beullens, "Improved Cryptanalysis of SNOVA" (ePrint 2024/1297, 2024, revised 2025);
  Daniel Cabarcas, Peigen Li, Javier Verbel and Ricardo Villanueva-Polanco, "Improved Attacks
  for SNOVA by Exploiting Stability under a Group Action" (ePrint 2024/1770); Ward Beullens and
  Basil Hess, "Recovering SNOVA Secret Keys from Biased Vinegar Sampling" (ePrint 2026/2154).
- Thibauld Feneuil, Antoine Joux and Matthieu Rivain, "Syndrome Decoding in the Head: Shorter
  Signatures from Zero-Knowledge Proofs" (CRYPTO 2022).
- Léo Ducas, Eamonn Postlethwaite, Ludo Pulles and Wessel van Woerden, "Hawk: Module LIP Makes
  Lattice Signatures Fast, Compact and Simple" (ASIACRYPT 2022).
- Ward Beullens, "MAYO: Practical Post-Quantum Signatures from Oil-and-Vinegar Maps" (SAC 2021).
- Jintai Ding, Albrecht Petzoldt and Dieter Schmidt, *Multivariate Public Key Cryptosystems*,
  2nd edition (Springer, 2020).
- NIST IR 8413, *Status Report on the Third Round of the NIST Post-Quantum Cryptography
  Standardization Process* (July 2022).
