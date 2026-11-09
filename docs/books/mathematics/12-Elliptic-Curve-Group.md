# 12. Elliptic Curves: the Group

*An elliptic curve is the set of solutions of an equation like $y^2 = x^3 + ax +
b$. Its points can be added: draw a line through two of them, find where it meets
the curve a third time, and reflect. That strange addition makes the points a
group, and over a finite field it is a group in which discrete logarithms are, as
far as anyone knows, as hard as the generic bound of Chapter 7 allows. That is why
a 256-bit elliptic-curve key is as strong as a 3,072-bit RSA key. This chapter
derives every formula of the group law, gives an honest account of why it is
associative, makes it fast with projective coordinates, and then builds the two
curve shapes that modern protocols use: Montgomery curves with the ladder of X25519,
and twisted Edwards curves with the complete formulas of Ed25519, checked against
the official test vectors. It shows the attack on code that forgets to check that a
point is on the curve, hashes strings to points as RFC 9380 does, and verifies ECDSA
and EdDSA signatures by hand.*

!!! abstract "In this chapter"
    **You will learn:**

    - elliptic curves over the real numbers and over $\mathbb{F}_p$, and the
      point at infinity;
    - the chord-and-tangent addition law, with every formula derived, and
      addition and doubling by hand on a small curve;
    - why the law is associative, honestly: what is easy, what is hard, and
      how it is proved;
    - scalar multiplication, orders of points, and the structure of the group;
    - projective and Jacobian coordinates, which remove inversions;
    - Montgomery curves and the $x$-only ladder, by hand and as X25519
      (RFC 7748);
    - twisted Edwards curves, a proof that their formulas are complete, and
      why that matters for side channels;
    - point compression, the invalid-curve attack and twist attacks;
    - hashing to a curve with the simplified SWU map of RFC 9380;
    - ECDSA and EdDSA by hand, and how a repeated nonce gives away the key.

    **You need:** [Chapter 4](04-Powers-and-Primitive-Roots.md) (square and
    multiply, the Montgomery ladder for powers),
    [Chapter 5](05-Square-Roots-Mod-p.md) (square roots mod $p$) and
    [Chapter 7](07-Groups.md) (groups, orders, cofactors).

    **Levels:** §12.1 to §12.4 are for beginners, §12.5 to §12.8 and §12.12
    are intermediate, §12.9 to §12.11 and §12.13 are expert.

## 12.1 The problem

*Level: beginner.*

Every message between Arcadia City's habitats starts with a Diffie-Hellman key
exchange. In Chapter 4 it ran in the units modulo a prime. To resist the
index-calculus attacks of *Cryptanalysis* [chapter 12](../cryptanalysis/12-Discrete-Logarithms.md), that prime has to be at least
3,072 bits long for 128-bit security, which makes each key exchange slow and each
public key 384 bytes. On a rover's radio link, every byte costs power.

Diffie-Hellman needs only a group in which exponentiation is fast and discrete
logarithms are hard (Chapter 7). In 1985 Neal Koblitz and Victor Miller, independently,
proposed the group of points of an elliptic curve over a finite field. No
index-calculus attack is known for it: the best general attack is Pollard's rho, at
about $\sqrt q$ operations for a group of prime order $q$. So a 256-bit curve gives
128-bit security, with 32-byte public keys and much faster arithmetic. Today almost
every TLS connection, every Signal message and every SSH login starts with an
elliptic-curve key exchange, usually X25519.

To use it, we need to know what the group is, why it is a group, and how to compute
in it quickly and safely. That is this chapter. Chapter 13 counts the points and
chooses the curves.

## 12.2 Curves and the point at infinity

*Level: beginner.*

Over a field whose characteristic is not 2 or 3, an **elliptic curve** in
**short Weierstrass form** is

$$E: \; y^2 = x^3 + ax + b, \qquad 4a^3 + 27b^2 \ne 0.$$

The condition says that the cubic $x^3 + ax + b$ has no repeated root, so the curve
has no cusp or self-crossing (it is **smooth**), and every point has a well-defined
tangent line. The curve is symmetric about the $x$-axis: if $(x, y)$ is on it, so is
$(x, -y)$.

To the solutions $(x, y)$ we add one more point, $\mathcal{O}$, the **point at
infinity**, imagined as the point where all vertical lines meet, far up (and far
down) the $y$-axis. It will be the group's identity. (In projective coordinates,
§12.6, it is an ordinary point, $(0 : 1 : 0)$.)

Over the real numbers the curve is a smooth curve with one or two pieces. Over
$\mathbb{F}_p$ it is a scatter of points, symmetric about the line $y = p/2$, with no
visible shape, but the same algebra applies.

## 12.3 The chord-and-tangent law

*Level: beginner.*

**Geometric rule.** To add $P$ and $Q$: draw the line through them (the tangent line
if $P = Q$). A line meets a cubic curve in exactly three points, counted properly, so
it meets $E$ in a third point $R$. Reflect $R$ across the $x$-axis: $P + Q = -R$.

Equivalently: **three points on a line add up to $\mathcal{O}$.** The vertical line
through $P$ and $-P$ meets the curve "at infinity", so $P + (-P) = \mathcal{O}$, and
$-P$ is the reflection of $P$.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="The chord-and-tangent law on the real curve y squared = x cubed minus x plus 1: the line through P and Q meets the curve again at R, and P plus Q is the reflection of R across the x-axis" fill="currentColor" font-size="13">
<g stroke="currentColor" stroke-width="1" opacity=".5">
<line x1="40" y1="150" x2="600" y2="150"/><line x1="220" y1="14" x2="220" y2="286"/>
</g>
<text x="606" y="154">x</text><text x="226" y="22">y</text>
<path class="acc" fill="none" stroke="currentColor" stroke-width="2.2" d="M558.0,17.6L552.1,21.1L546.3,24.6L540.5,28.1L534.8,31.4L529.1,34.8L523.4,38.1L517.7,41.3L512.1,44.5L506.6,47.6L501.0,50.7L495.5,53.7L490.1,56.7L484.7,59.6L479.3,62.5L473.9,65.3L468.6,68.0L463.3,70.8L458.1,73.4L452.9,76.0L447.7,78.6L442.6,81.1L437.5,83.6L432.5,86.0L427.4,88.4L422.5,90.7L417.5,92.9L412.6,95.1L407.7,97.3L402.9,99.4L398.1,101.5L393.4,103.5L388.6,105.4L383.9,107.3L379.3,109.1L374.7,110.9L370.1,112.7L365.6,114.3L361.1,115.9L356.6,117.5L352.2,119.0L347.8,120.4L343.4,121.8L339.1,123.1L334.8,124.3L330.6,125.4L326.4,126.5L322.2,127.5L318.1,128.4L314.0,129.2L309.9,130.0L305.9,130.6L301.9,131.2L297.9,131.7L294.0,132.1L290.1,132.3L286.3,132.6L282.5,132.7L278.7,132.7L275.0,132.7L271.3,132.6L267.6,132.5L264.0,132.3L260.4,132.1L256.9,131.8L253.4,131.5L249.9,131.2L246.5,130.9L243.1,130.6L239.7,130.2L236.4,129.8L233.1,129.5L229.8,129.1L226.6,128.7L223.5,128.4L220.3,128.0L217.2,127.7L214.1,127.4L211.1,127.0L208.1,126.7L205.1,126.5L202.2,126.2L199.3,125.9L196.5,125.7L193.7,125.5L190.9,125.2L188.2,125.1L185.5,124.9L182.8,124.7L180.2,124.6L177.6,124.5L175.0,124.4L172.5,124.3L170.0,124.2L167.6,124.2L165.2,124.1L162.8,124.1L160.5,124.1L158.2,124.1L155.9,124.2L153.7,124.2L151.5,124.3L149.4,124.4L147.2,124.5L145.2,124.6L143.1,124.8L141.1,124.9L139.2,125.1L137.2,125.3L135.3,125.5L133.5,125.7L131.7,126.0L129.9,126.2L128.1,126.5L126.4,126.8L124.7,127.1L123.1,127.4L121.5,127.7L119.9,128.0L118.4,128.4L116.9,128.7L115.5,129.1L114.1,129.5L112.7,129.9L111.3,130.3L110.0,130.7L108.8,131.1L107.5,131.6L106.3,132.0L105.2,132.5L104.1,132.9L103.0,133.4L101.9,133.9L100.9,134.4L100.0,134.9L99.0,135.4L98.1,135.9L97.3,136.5L96.4,137.0L95.6,137.6L94.9,138.1L94.2,138.7L93.5,139.2L92.8,139.8L92.2,140.4L91.7,140.9L91.1,141.5L90.6,142.1L90.2,142.7L89.8,143.3L89.4,143.9L89.0,144.5L88.7,145.1L88.4,145.7L88.2,146.3L88.0,146.9L87.8,147.5L87.7,148.2L87.6,148.8L87.5,149.4L87.5,150.0L87.5,150.6L87.6,151.2L87.7,151.8L87.8,152.5L88.0,153.1L88.2,153.7L88.4,154.3L88.7,154.9L89.0,155.5L89.4,156.1L89.8,156.7L90.2,157.3L90.6,157.9L91.1,158.5L91.7,159.1L92.2,159.6L92.8,160.2L93.5,160.8L94.2,161.3L94.9,161.9L95.6,162.4L96.4,163.0L97.3,163.5L98.1,164.1L99.0,164.6L100.0,165.1L100.9,165.6L101.9,166.1L103.0,166.6L104.1,167.1L105.2,167.5L106.3,168.0L107.5,168.4L108.8,168.9L110.0,169.3L111.3,169.7L112.7,170.1L114.1,170.5L115.5,170.9L116.9,171.3L118.4,171.6L119.9,172.0L121.5,172.3L123.1,172.6L124.7,172.9L126.4,173.2L128.1,173.5L129.9,173.8L131.7,174.0L133.5,174.3L135.3,174.5L137.2,174.7L139.2,174.9L141.1,175.1L143.1,175.2L145.2,175.4L147.2,175.5L149.4,175.6L151.5,175.7L153.7,175.8L155.9,175.8L158.2,175.9L160.5,175.9L162.8,175.9L165.2,175.9L167.6,175.8L170.0,175.8L172.5,175.7L175.0,175.6L177.6,175.5L180.2,175.4L182.8,175.3L185.5,175.1L188.2,174.9L190.9,174.8L193.7,174.5L196.5,174.3L199.3,174.1L202.2,173.8L205.1,173.5L208.1,173.3L211.1,173.0L214.1,172.6L217.2,172.3L220.3,172.0L223.5,171.6L226.6,171.3L229.8,170.9L233.1,170.5L236.4,170.2L239.7,169.8L243.1,169.4L246.5,169.1L249.9,168.8L253.4,168.5L256.9,168.2L260.4,167.9L264.0,167.7L267.6,167.5L271.3,167.4L275.0,167.3L278.7,167.3L282.5,167.3L286.3,167.4L290.1,167.7L294.0,167.9L297.9,168.3L301.9,168.8L305.9,169.4L309.9,170.0L314.0,170.8L318.1,171.6L322.2,172.5L326.4,173.5L330.6,174.6L334.8,175.7L339.1,176.9L343.4,178.2L347.8,179.6L352.2,181.0L356.6,182.5L361.1,184.1L365.6,185.7L370.1,187.3L374.7,189.1L379.3,190.9L383.9,192.7L388.6,194.6L393.4,196.5L398.1,198.5L402.9,200.6L407.7,202.7L412.6,204.9L417.5,207.1L422.5,209.3L427.4,211.6L432.5,214.0L437.5,216.4L442.6,218.9L447.7,221.4L452.9,224.0L458.1,226.6L463.3,229.2L468.6,232.0L473.9,234.7L479.3,237.5L484.7,240.4L490.1,243.3L495.5,246.3L501.0,249.3L506.6,252.4L512.1,255.5L517.7,258.7L523.4,261.9L529.1,265.2L534.8,268.6L540.5,271.9L546.3,275.4L552.1,278.9L558.0,282.4"/>
<line x1="160.0" y1="198.4" x2="560.0" y2="22.4" class="soft-acc" stroke="currentColor" stroke-width="1.5"/>
<line x1="520.0" y1="40.0" x2="520.0" y2="260.0" stroke="currentColor" stroke-width="1.2" stroke-dasharray="5 4"/>
<circle cx="220.0" cy="172.0" r="5"/>
<text x="230.0" y="190.0">P</text>
<circle cx="320.0" cy="128.0" r="5"/>
<text x="298.0" y="120.0">Q</text>
<circle cx="520.0" cy="40.0" r="5"/>
<text x="530.0" y="44.0">R</text>
<circle cx="520.0" cy="260.0" r="5" class="acc-fill"/>
<text x="530.0" y="264.0">P + Q</text>
<text x="40" y="280" font-size="12">y² = x³ − x + 1 · line y = 2x − 1 through P and Q</text>
</svg>
<figcaption>Figure 12.1. Adding points on the real curve y² = x³ − x + 1. The line through P and Q meets the curve at a third point R; P + Q is R reflected in the x-axis. The same algebra, with every division done modulo p, adds points over a finite field.</figcaption>
</figure>

### The formulas

Let $P = (x_1, y_1)$ and $Q = (x_2, y_2)$, with $Q \ne -P$. The line through them is
$y = \lambda x + \nu$, with slope

$$\lambda = \frac{y_2 - y_1}{x_2 - x_1} \quad (P \ne Q), \qquad \lambda = \frac{3x_1^2 +
a}{2y_1} \quad (P = Q).$$

The tangent slope comes from differentiating $y^2 = x^3 + ax + b$ implicitly: $2y\,y' =
3x^2 + a$. (Over a finite field there is no calculus, but the formula still gives the
line that meets the curve twice at $P$, which is what we need.)

Substitute the line into the curve: $(\lambda x + \nu)^2 = x^3 + ax + b$, that is,

$$x^3 - \lambda^2 x^2 + (a - 2\lambda\nu)x + (b - \nu^2) = 0.$$

This cubic has roots $x_1$, $x_2$ and $x_3$ (the third point). For a monic cubic, the
sum of the roots is minus the coefficient of $x^2$, so $x_1 + x_2 + x_3 = \lambda^2$:

$$x_3 = \lambda^2 - x_1 - x_2, \qquad y_3 = \lambda(x_1 - x_3) - y_1.$$

The $y_3$ formula takes the third point's height on the line, $\lambda x_3 + \nu$,
and negates it. That is the whole group law: one slope (one field inversion), then a
few multiplications. Note that $b$ appears nowhere; §12.10 exploits that.

### By hand

Take $E: y^2 = x^3 + 2x + 3$ over $\mathbb{F}_{97}$, and $P = (3, 6)$: indeed $27 + 6 +
3 = 36 = 6^2$.

**Doubling.** $\lambda = (3 \cdot 9 + 2)/(2 \cdot 6) = 29/12$. The inverse of 12 mod 97
is 89 (since $12 \cdot 89 = 1068 = 11 \cdot 97 + 1$), so $\lambda = 29 \cdot 89 =
2581 \equiv 59$. Then $x_3 = 59^2 - 6 = 3475 \equiv 80$ and $y_3 = 59(3 - 80) - 6 =
-4549 \equiv 10$. So $2P = (80, 10)$. Check: $80 \equiv -17$, so $80^3 \equiv -4913 \equiv 34$,
and $80^3 + 2 \cdot 80 + 3 \equiv 34 + 160 + 3 = 197 \equiv 3$, while $10^2 = 100 \equiv 3$ modulo 97.

**Adding.** With $R = (0, 10)$ (on the curve, since $0 + 0 + 3 = 3$ and $10^2 = 100
\equiv 3$): $\lambda = (10 - 6)/(0 - 3) = -4 \cdot 3^{-1} = -4 \cdot 65 = -260 \equiv
31$. Then $x_3 = 31^2 - 3 - 0 = 958 \equiv 85$ and $y_3 = 31(3 - 85) - 6 = -2548 \equiv
71$. So $P + R = (85, 71)$.

### Code it

```python
# Points on y^2 = x^3 + a x + b over F_p, in affine coordinates; None is the point at infinity O.
p, a, b = 97, 2, 3

def on_curve(P):
    if P is None:
        return True
    x, y = P
    return (y * y - (x**3 + a * x + b)) % p == 0

def add(P, Q):
    if P is None:
        return Q
    if Q is None:
        return P
    x1, y1 = P
    x2, y2 = Q
    if x1 == x2 and (y1 + y2) % p == 0:
        return None                                   # P + (-P) = O
    if P == Q:
        lam = (3 * x1 * x1 + a) * pow(2 * y1, -1, p) % p    # tangent slope
    else:
        lam = (y2 - y1) * pow(x2 - x1, -1, p) % p           # chord slope
    x3 = (lam * lam - x1 - x2) % p
    y3 = (lam * (x1 - x3) - y1) % p
    return (x3, y3)

def neg(P):
    return None if P is None else (P[0], -P[1] % p)

points = [None] + [(x, y) for x in range(p) for y in range(p) if on_curve((x, y))]
print(len(points), points[1:6])
P, Q = (3, 6), (80, 10)
R = (0, 10)
print(on_curve(P), on_curve(R), add(P, R), add(P, P), add(P, neg(P)))
```

```text
100 [(0, 10), (0, 87), (1, 43), (1, 54), (3, 6)]
True True (85, 71) (80, 10) None
```

The curve has 100 points, counting $\mathcal{O}$. The code confirms both hand
calculations and that $P + (-P) = \mathcal{O}$ (printed as `None`).

## 12.4 Why it is a group: an honest account

*Level: beginner.*

Check the axioms of Chapter 7.

- **Closure.** The formulas give a point on the curve whenever they apply (the
  third root of a cubic with coefficients in $\mathbb{F}_p$ and two roots in
  $\mathbb{F}_p$ is in $\mathbb{F}_p$), and $\mathcal{O}$ otherwise.
- **Identity.** $P + \mathcal{O} = P$: the vertical line through $P$ meets the curve
  again at $-P$, whose reflection is $P$.
- **Inverses.** $P + (-P) = \mathcal{O}$.
- **Commutativity.** The line through $P$ and $Q$ is the line through $Q$ and $P$.
- **Associativity.** $(P + Q) + R = P + (Q + R)$. This is the hard one.

Associativity is not visible in the picture, and checking it directly with the
formulas is a famous slog: the expressions are rational functions with many special
cases ($P = Q$, $P + Q = R$, and so on), and expanding $(P + Q) + R$ and $P + (Q + R)$
by hand fills pages. A computer algebra system can do it in a few seconds, and that is
a valid proof. There are three conceptual proofs:

1. **Cayley-Bacharach.** Two cubic curves meet in nine points; any cubic through eight
   of them passes through the ninth. Draw the lines used to compute $(P + Q) + R$
   and $P + (Q + R)$; they form two "cubics" (products of three lines) through eight
   common points, and the theorem forces the ninth points to agree.
2. **Divisors and the Picard group.** Algebraic geometry associates to each point $P$
   the "divisor class" of $(P) - (\mathcal{O})$, and shows (with the Riemann-Roch
   theorem) that this matches the curve with a group that is associative by
   construction. The chord-and-tangent law is that group's addition, written out.
3. **Complex analysis.** Over $\mathbb{C}$, the curve is a torus $\mathbb{C}/\Lambda$
   for a lattice $\Lambda$, and the group law is addition of complex numbers modulo
   the lattice (Weierstrass's $\wp$ function gives the map). This does not directly
   prove the finite-field case, but it explains why the law is so natural.

For this book, a machine check on a small curve is a fine sanity test:

```python
from itertools import product
ok = all(add(add(P, Q), R) == add(P, add(Q, R)) for P, Q, R in product(points[:40], points[:40], points[:40]))
comm = all(add(P, Q) == add(Q, P) for P, Q in product(points, points))
print(ok, comm)
```

```text
True True
```

All 64,000 triples from the first 40 points pass, and the law is commutative on all
$100^2$ pairs.

## 12.5 Scalar multiplication and the structure of the group

*Level: intermediate.*

Repeated addition, $kP = P + P + \dots + P$, is **scalar multiplication**, the
elliptic-curve version of exponentiation. It is computed by **double-and-add**,
exactly square-and-multiply (Chapter 4) in additive notation: about $\log_2 k$
doublings and half as many additions. The **elliptic-curve discrete logarithm
problem** (ECDLP) is to find $k$ from $P$ and $kP$.

```python
def mul(k, P):
    """Double-and-add, left to right."""
    R = None
    for bit in bin(k)[2:]:
        R = add(R, R)
        if bit == "1":
            R = add(R, P)
    return R

def point_order(P):
    k, R = 1, P
    while R is not None:
        R, k = add(R, P), k + 1
    return k

print([mul(k, P) for k in range(1, 6)])
print(point_order(P), mul(point_order(P), P), sorted({point_order(T) for T in points[1:]}))
```

```text
[(3, 6), (80, 10), (80, 87), (3, 91), None]
5 None [2, 5, 10, 25, 50]
```

$P = (3, 6)$ has order 5: $5P = \mathcal{O}$. The orders of points on this curve are
2, 5, 10, 25 and 50, and no point has order 100. So the group of 100 points is not
cyclic: by the structure theorem of Chapter 7 it is $\mathbb{Z}/2 \times
\mathbb{Z}/50$. In general the group of an elliptic curve over $\mathbb{F}_p$ is
always $\mathbb{Z}/n_1 \times \mathbb{Z}/n_2$ with $n_1 \mid n_2$ and $n_1 \mid p - 1$;
it is usually cyclic. Cryptographic curves are chosen so that the group has a large
prime-order subgroup, and, ideally, prime order (cofactor 1) or a tiny cofactor
(Chapter 7). Counting the points is Chapter 13's job: the number is always close to
$p + 1$ (Hasse).

## 12.6 Projective and Jacobian coordinates

*Level: intermediate.*

Each affine addition needs a field inversion, which costs as much as dozens of
multiplications. The fix is to carry a denominator along. In **Jacobian coordinates** a
point is a triple $(X : Y : Z)$ standing for $(X/Z^2, Y/Z^3)$; scaling all three by
$(\mu^2, \mu^3, \mu)$ gives the same point. The point at infinity is any triple with $Z =
0$. Rewriting the formulas over a common denominator removes every division:

- **doubling**: $S = 4XY^2$, $M = 3X^2 + aZ^4$, $X_3 = M^2 - 2S$, $Y_3 = M(S - X_3) -
  8Y^4$, $Z_3 = 2YZ$;
- **mixed addition** of $(X_1 : Y_1 : Z_1)$ and an affine $(x_2, y_2)$: with $U_2 =
  x_2Z_1^2$, $S_2 = y_2Z_1^3$, $H = U_2 - X_1$, $r = S_2 - Y_1$: $X_3 = r^2 - H^3 - 2X_1H^2$,
  $Y_3 = r(X_1H^2 - X_3) - Y_1H^3$, $Z_3 = Z_1H$.

A single inversion at the end converts back. The NIST curves take $a = -3$, so that $M
= 3(X - Z^2)(X + Z^2)$ saves two multiplications per doubling. (Plain **projective
coordinates** $(X/Z, Y/Z)$ work too, with different costs; Daniel Bernstein and Tanja
Lange's Explicit-Formulas Database lists dozens of variants with exact operation
counts.)

```python
# Jacobian coordinates (X, Y, Z) stand for (X/Z^2, Y/Z^3): no inversions until the end.
def jac_double(T):
    X, Y, Z = T
    if Y == 0:
        return (1, 1, 0)
    S = 4 * X * Y * Y % p
    M = (3 * X * X + a * pow(Z, 4, p)) % p
    X3 = (M * M - 2 * S) % p
    Y3 = (M * (S - X3) - 8 * pow(Y, 4, p)) % p
    Z3 = 2 * Y * Z % p
    return (X3, Y3, Z3)

def jac_add_affine(T, Q):
    """Add an affine point Q = (x2, y2) to a Jacobian point T (mixed addition)."""
    X1, Y1, Z1 = T
    if Z1 == 0:
        return (Q[0], Q[1], 1)
    x2, y2 = Q
    Z1Z1 = Z1 * Z1 % p
    U2, S2 = x2 * Z1Z1 % p, y2 * Z1 * Z1Z1 % p
    H, r = (U2 - X1) % p, (S2 - Y1) % p
    if H == 0:
        return jac_double(T) if r == 0 else (1, 1, 0)
    HH = H * H % p
    HHH = H * HH % p
    X3 = (r * r - HHH - 2 * X1 * HH) % p
    Y3 = (r * (X1 * HH - X3) - Y1 * HHH) % p
    Z3 = Z1 * H % p
    return (X3, Y3, Z3)

def to_affine(T):
    X, Y, Z = T
    if Z == 0:
        return None
    zi = pow(Z, -1, p)
    return (X * zi * zi % p, Y * zi * zi * zi % p)

def mul_jac(k, P):
    R = (1, 1, 0)
    for bit in bin(k)[2:]:
        R = jac_double(R)
        if bit == "1":
            R = jac_add_affine(R, P)
    return to_affine(R)

print(all(mul_jac(k, P) == mul(k, P) for k in range(1, 200)))
```

```text
True
```

The Jacobian version agrees with the affine one for every $k$ below 200.

## 12.7 Montgomery curves and the ladder

*Level: intermediate.*

Peter Montgomery (1987), working on factoring with elliptic curves, used curves of the
form

$$E_M: \; By^2 = x^3 + Ax^2 + x.$$

Their special gift: the $x$-coordinate of $P + Q$ can be computed from the
$x$-coordinates of $P$, $Q$ and $P - Q$, without any $y$. So if we always keep two
points whose difference is the base point, $R_0 = kP$ and $R_1 = (k + 1)P$, each step
can either double $R_0$ and add to get $R_1$, or the reverse, depending on one bit of
the scalar. That is the **Montgomery ladder** (Chapter 4 had it for powers), with
formulas in projective $(X : Z)$ coordinates costing 5 multiplications, 4 squarings and
one multiplication by the constant $(A - 2)/4$ per bit.

Two properties make it ideal for Diffie-Hellman:

- **Uniform.** Every bit does the same operations; only a conditional *swap* of the two
  points depends on the secret, and it can be done with arithmetic masks instead of a
  branch. That defeats the timing attacks of Chapter 4.
- **$x$ only.** Public keys are 32-byte $x$-coordinates, and there is nothing to
  validate about $y$.

### Where the $x$-only formulas come from

Take $B = 1$ to keep the algebra short. The chord law works as in §12.3; the cubic
now has an $x^2$ term, so the three roots sum to $\lambda^2 - A$, and

$$x(P + Q) = \lambda^2 - A - x_P - x_Q, \qquad \lambda = \frac{y_Q - y_P}{x_Q - x_P}.$$

Replacing $Q$ by $-Q$ flips the sign of $y_Q$ and nothing else, and the same formula
gives $x(P - Q)$. The squared slopes are $(y_Q^2 \mp 2y_Py_Q + y_P^2)/(x_Q - x_P)^2$,
so the two cases differ only in the sign of $y_Py_Q$. In the sum and the product of
$x(P + Q)$ and $x(P - Q)$ that sign cancels, $y_Py_Q$ appears only squared, and the
curve equation turns $y_P^2$ and $y_Q^2$ into cubics in $x$. After a page of
cancellation (or a few seconds of computer algebra) the product collapses to

$$x(P + Q) \cdot x(P - Q) = \left( \frac{x_Px_Q - 1}{x_P - x_Q} \right)^2.$$

That is **differential addition**: knowing $x(P - Q)$, divide and get $x(P + Q)$,
with no $y$ anywhere. The tangent case gives

$$x(2P) = \frac{(x_P^2 - 1)^2}{4x_P(x_P^2 + Ax_P + 1)}.$$

To avoid the divisions, carry each point as a fraction $(X : Z)$ with $x = X/Z$, as
in §12.6. Then, for points $R_0 = (X_0 : Z_0)$ and $R_1 = (X_1 : Z_1)$ whose
difference $R_1 - R_0$ has known $x$-coordinate $x_1$,

$$\begin{aligned}
X_{R_0 + R_1} &= \bigl[(X_1 - Z_1)(X_0 + Z_0) + (X_1 + Z_1)(X_0 - Z_0)\bigr]^2, \\
Z_{R_0 + R_1} &= x_1 \bigl[(X_1 - Z_1)(X_0 + Z_0) - (X_1 + Z_1)(X_0 - Z_0)\bigr]^2.
\end{aligned}$$

The brackets multiply out to $2(X_0X_1 - Z_0Z_1)$ and $2(X_1Z_0 - X_0Z_1)$, the
product formula with denominators cleared; written with the sums and differences $X
\pm Z$, each used twice, they cost fewer multiplications. For doubling, with $AA = (X + Z)^2$, $BB = (X -
Z)^2$ and $E = AA - BB = 4XZ$,

$$X_{2R} = AA \cdot BB, \qquad Z_{2R} = E \cdot \Bigl(AA + \tfrac{A - 2}{4} E\Bigr).$$

(The textbook bracket is $BB + \tfrac{A + 2}{4}E$, the same since $AA = BB + E$.)
Hence X25519's constant $121665 = (486662 - 2)/4$; `DA`, `CB`, `AA`, `BB` and `E` in
the RFC 7748 code below are these quantities.

### The ladder by hand

Take the small curve

$$E_M: \; y^2 = x^3 + 6x^2 + x \quad \text{over } \mathbb{F}_{101},$$

with $104 = 8 \cdot 13$ points, like Curve25519's $8\ell$, and $(A - 2)/4 = 1$. The
point $P$ with $x = 14$ has order 13; we compute $x(6P)$, with $6 = 110_2$. Start with
$R_0 = \mathcal{O} = (1 : 0)$ and $R_1 = P = (14 : 1)$; always $R_1 - R_0 = P$, so
$x_1 = 14$. A bit 1 replaces $(R_0, R_1)$ by $(R_0 + R_1, 2R_1)$, a bit 0 by $(2R_0,
R_0 + R_1)$.

**Bit 1.** $R_0 + R_1 = \mathcal{O} + P = P$, and $2R_1 = 2P$. Doubling $(14 : 1)$:
$AA = 15^2 = 225 \equiv 23$, $BB = 13^2 = 169 \equiv 68$, $E = 23 - 68 \equiv 56$, so
$X = 23 \cdot 68 = 1564 \equiv 49$ and $Z = 56 \cdot (23 + 56) = 4424 \equiv 81$. So
$x(2P) = 49/81 \equiv 43$. (Check: $43 \cdot 81 = 3483 = 34 \cdot 101 + 49$.)

**Bit 1.** Now $R_0 = (14 : 1)$ and $R_1 = (43 : 1)$, and we need $R_0 + R_1 = 3P$
and $2R_1 = 4P$. For the addition, $X_0 \pm Z_0 = 15, 13$ and $X_1 \pm Z_1 = 44,
42$, so $DA = 42 \cdot 15 = 630 \equiv 24$ and $CB = 44 \cdot 13 = 572 \equiv 67$.
Then $X = (24 + 67)^2 = 8281 \equiv 100$ and $Z = 14 \cdot (24 - 67)^2 = 14 \cdot
1849 \equiv 14 \cdot 31 = 434 \equiv 30$: $x(3P) = 100/30 \equiv 37$. For the
doubling, $AA = 44^2 \equiv 17$, $BB = 42^2 \equiv 47$, $E = 17 - 47 \equiv 71$, $X =
17 \cdot 47 = 799 \equiv 92$, $Z = 71 \cdot (17 + 71) = 6248 \equiv 87$: $x(4P) =
92/87 \equiv 80$.

**Bit 0.** Now $R_0 + R_1 = 7P$ and $2R_0 = 6P$ both come out with $x = 30$. That is
no mistake: $7P = -6P$ since $P$ has order 13, and Diffie-Hellman needs only $x(kP)$.
Every step did one addition and one doubling; the bit chose only which register got
which, the swap in the X25519 code.

<figure class="mars-fig">
<svg viewBox="0 0 640 270" width="640" role="img" aria-label="The Montgomery ladder for k = 6 on the curve y squared = x cubed + 6 x squared + x over F 101: two rails R0 and R1, starting at O and P, then P and 2P, 3P and 4P, 6P and 7P; at every rung the difference R1 minus R0 is P" fill="currentColor" font-size="13">
<g stroke="currentColor" stroke-width="1.5" fill="none">
<line x1="150" y1="40" x2="150" y2="230"/><line x1="470" y1="40" x2="470" y2="230"/>
</g>
<g stroke="currentColor" stroke-width="1.2" fill="none" stroke-dasharray="5 4">
<line x1="150" y1="60" x2="470" y2="60"/><line x1="150" y1="115" x2="470" y2="115"/><line x1="150" y1="170" x2="470" y2="170"/><line x1="150" y1="225" x2="470" y2="225"/>
</g>
<g fill="currentColor" fill-opacity=".12" stroke="currentColor" stroke-width="1.2">
<rect x="95" y="45" width="110" height="30" rx="6"/><rect x="415" y="45" width="110" height="30" rx="6"/>
<rect x="95" y="100" width="110" height="30" rx="6"/><rect x="415" y="100" width="110" height="30" rx="6"/>
<rect x="95" y="155" width="110" height="30" rx="6"/><rect x="415" y="155" width="110" height="30" rx="6"/>
<rect x="95" y="210" width="110" height="30" rx="6"/><rect x="415" y="210" width="110" height="30" rx="6"/>
</g>
<g text-anchor="middle">
<text x="150" y="28">R0</text><text x="470" y="28">R1</text>
<text x="150" y="65">O</text><text x="470" y="65">P   (x = 14)</text>
<text x="150" y="120">P   (x = 14)</text><text x="470" y="120">2P   (x = 43)</text>
<text x="150" y="175">3P   (x = 37)</text><text x="470" y="175">4P   (x = 80)</text>
<text x="150" y="230">6P   (x = 30)</text><text x="470" y="230">7P   (x = 30)</text>
<text x="310" y="54" font-size="12" fill-opacity=".7">difference P</text>
</g>
<g font-size="12">
<text x="20" y="92">bit 1</text><text x="20" y="147">bit 1</text><text x="20" y="202">bit 0</text>
<text x="545" y="92">R0 ← R0 + R1</text><text x="545" y="108">R1 ← 2·R1</text>
<text x="545" y="147">R0 ← R0 + R1</text><text x="545" y="163">R1 ← 2·R1</text>
<text x="545" y="202">R1 ← R0 + R1</text><text x="545" y="218">R0 ← 2·R0</text>
</g>
</svg>
<figcaption>Figure 12.2. The Montgomery ladder computing 6P on y² = x³ + 6x² + x over F₁₀₁. The two registers climb together, and every rung keeps R1 − R0 = P, which is what lets the x-only addition work. Each bit costs one addition and one doubling; the bit decides only which register receives which result. At the end 6P and 7P = −6P share x = 30.</figcaption>
</figure>

### Code it

The ladder, checked against §12.3's law: $x = t - A/3$ turns $y^2 = x^3 + Ax^2 + x$
into $y^2 = t^3 + at + b$ with $a = 1 - A^2/3$, $b = 2A^3/27 - A/3$.

```python
# Uses add(), mul() and on_curve() from §12.3 and §12.5 (they read the globals p, a, b).
p, A = 101, 6                                  # Montgomery curve y^2 = x^3 + 6x^2 + x over F_101
a24 = (A - 2) * pow(4, -1, p) % p              # (A - 2)/4 = 1

def xdbl(X, Z):
    AA, BB = (X + Z) ** 2 % p, (X - Z) ** 2 % p
    E = (AA - BB) % p                          # E = 4XZ
    return AA * BB % p, E * (AA + a24 * E) % p

def xadd(X0, Z0, X1, Z1, x1):
    """x of R0 + R1, given x1 = x(R1 - R0)."""
    DA = (X1 - Z1) * (X0 + Z0) % p
    CB = (X1 + Z1) * (X0 - Z0) % p
    return (DA + CB) ** 2 % p, x1 * (DA - CB) ** 2 % p

def ladder(k, x1):
    R0, R1 = (1, 0), (x1, 1)                   # O and P
    for bit in bin(k)[2:]:
        if bit == "1":
            R0, R1 = xadd(*R0, *R1, x1), xdbl(*R1)
        else:
            R0, R1 = xdbl(*R0), xadd(*R0, *R1, x1)
    X, Z = R0
    return None if Z == 0 else X * pow(Z, -1, p) % p

third = pow(3, -1, p)                          # the same curve in Weierstrass form
a = (1 - A * A * third) % p
b = (2 * A**3 * pow(27, -1, p) - A * third) % p
P = ((14 + A * third) % p, 46)                 # the point with x = 14, moved by A/3
print(a, b, on_curve(P))
print([ladder(k, 14) for k in range(1, 14)])
print(all(ladder(k, 14) == (None if mul(k, P) is None else (mul(k, P)[0] - A * third) % p)
          for k in range(1, 300)))
```

It prints:

```text
90 14 True
[14, 43, 37, 80, 31, 30, 30, 31, 80, 37, 43, 14, None]
True
```

In Weierstrass form the curve is $y^2 = t^3 + 90t + 14$. The $x$-coordinates of $P,
\dots, 12P$ read the same backwards, as $kP = -(13 - k)P$, and for every $k$ below 300
the ladder agrees with the full law.

### Every $x$ is on the curve or on its twist

An $x$-only receiver never sees $y$. For any $x$, the value $x^3 + Ax^2 + x$ is
either a square, and $x$ belongs to a point of $E_M$, or not, and $x$ belongs to a
point of the **quadratic twist** $cy^2 = x^3 + Ax^2 + x$ for a non-square $c$ (Chapter 13, [§13.3](13-Counting-Points-and-Pairings.md#133-twists)).
The ladder never mentions $B$ or $c$, so it computes correctly on the twist too, and
if the twist's order has small factors, an attacker gets the small-subgroup attack of
Chapter 7.

```python
# Uses ladder() and the curve from the listing above.
def on_curve_x(u):
    r = (u**3 + A * u * u + u) % p
    return r == 0 or pow(r, (p - 1) // 2, p) == 1

n_curve = 1 + sum(2 if on_curve_x(u) and (u**3 + A * u * u + u) % p else 1 if on_curve_x(u) else 0
                  for u in range(p))
n_twist = 2 * p + 2 - n_curve
u5 = next(u for u in range(2, p) if not on_curve_x(u) and ladder(5, u) is None)
secret = 8 * 37                                # clamped: a multiple of the cofactor 8
reply = ladder(secret, u5)
print(n_curve, n_twist, u5, reply)
print([j for j in range(5) if ladder(j, u5) == reply], secret % 5)
```

It prints:

```text
104 100 2 2
[1, 4] 1
```

The curve has $104 = 8 \cdot 13$ points but its twist has $100 = 4 \cdot 5^2$. The
attacker sends $x = 2$, which is not on the curve but belongs to a twist point $T$ of
order 5. The server answers 2 again, and the only multiples $jT$ with that $x$ are
$j = 1$ and $j = 4$, so $k \equiv \pm 1 \pmod 5$. Clamping does not help, as 5 does
not divide 8.
Curve25519's twist has order $4\ell'$ with $\ell'$ a 253-bit prime, so there the
trick learns nothing that clamping did not already fix: **twist security**
(Chapter 13).

### X25519

Daniel Bernstein's **Curve25519** (2006) is the Montgomery curve

$$y^2 = x^3 + 486662x^2 + x \quad \text{over } \mathbb{F}_p, \; p = 2^{255} - 19,$$

with base point $x = 9$ and $8\ell$ points, $\ell$ a prime of about $2^{252}$
(Chapter 7). The **X25519** function, specified in RFC 7748 (Adam Langley, Mike Hamburg
and Sean Turner, 2016), clamps the 32-byte secret (clear the low 3 bits, the cofactor
8; clear bit 255; set bit 254, so every ladder has the same length), runs the ladder,
and returns $x$ as 32 little-endian bytes. Here it is, transcribed from the RFC:

```python
# X25519 (RFC 7748): the Montgomery ladder on Curve25519, x-coordinates only.
P25519 = 2**255 - 19
A24 = 121665                                  # (486662 - 2) / 4

def x25519(k_bytes, u_bytes):
    k = bytearray(k_bytes)
    k[0] &= 248; k[31] &= 127; k[31] |= 64        # clamping
    k = int.from_bytes(k, "little")
    u = int.from_bytes(u_bytes, "little") & ((1 << 255) - 1)
    p = P25519
    x1, x2, z2, x3, z3, swap = u, 1, 0, u, 1, 0
    for t in reversed(range(255)):
        kt = (k >> t) & 1
        swap ^= kt
        if swap:
            x2, x3, z2, z3 = x3, x2, z3, z2
        swap = kt
        A, B = (x2 + z2) % p, (x2 - z2) % p
        AA, BB = A * A % p, B * B % p
        E = (AA - BB) % p
        C, D = (x3 + z3) % p, (x3 - z3) % p
        DA, CB = D * A % p, C * B % p
        x3 = (DA + CB) ** 2 % p
        z3 = x1 * (DA - CB) ** 2 % p
        x2 = AA * BB % p
        z2 = E * (AA + A24 * E) % p
    if swap:
        x2, z2 = x3, z3
    return (x2 * pow(z2, p - 2, p) % p).to_bytes(32, "little")

k = bytes.fromhex("a546e36bf0527c9d3b16154b82465edd62144c0ac1fc5a18506a2244ba449ac4")
u = bytes.fromhex("e6db6867583030db3594c1a424b15f7c726624ec26b3353b10a903a6d0ab1c4c")
print(x25519(k, u).hex())
alice = bytes.fromhex("77076d0a7318a57d3c16c17251b26645df4c2f87ebc0992ab177fba51db92c2a")
bob = bytes.fromhex("5dab087e624a8a4b79e17f8b83800ee66f3bb1292618b6fd1c2f8b27ff88e0eb")
nine = (9).to_bytes(32, "little")
A_pub, B_pub = x25519(alice, nine), x25519(bob, nine)
print(A_pub.hex())
print(x25519(alice, B_pub) == x25519(bob, A_pub), x25519(alice, B_pub).hex()[:16])
```

```text
c3da55379de9c6908e94ea4df28d084f32eccf03491c71f754b4075577a28552
8520f0098930a754748b7ddcb43ef75a0dbf3a0d26381af4eba4a98eaa9b4e6a
True 4a5d9d5ba4ce2de1
```

The first line is RFC 7748's first test vector (§5.2). The second is Alice's public
key from its Diffie-Hellman example (§6.1), and the third confirms that Alice and Bob
derive the same shared secret, which begins `4a5d9d5b`, as in the RFC.

!!! note "Life story: X25519"
    **Born:** 2006, Daniel Bernstein, "Curve25519: New Diffie-Hellman Speed
    Records" (PKC 2006); named X25519 and standardized in RFC 7748 (2016)
    · **Purpose:** fast, constant-time elliptic-curve Diffie-Hellman with no
    traps for the implementer: every 32-byte string is a valid public key, and
    clamping handles the cofactor · **Helped:** TLS 1.3 (the most used key
    exchange), SSH, Signal, WhatsApp, WireGuard, Tor, iMessage; since 2024,
    the hybrid X25519MLKEM768 that browsers use for post-quantum safety
    · **Status:** the default key exchange of the Internet

## 12.8 Twisted Edwards curves and complete formulas

*Level: intermediate.*

Harold Edwards (2007) wrote elliptic curves in a strikingly symmetric form, and Bernstein
and Lange (2007), and then Bernstein, Peter Birkner, Marc Joye, Lange and Christiane
Peters (2008), turned it into the **twisted Edwards** form

$$E_{a,d}: \; ax^2 + y^2 = 1 + dx^2y^2.$$

The identity is $(0, 1)$, the negative of $(x, y)$ is $(-x, y)$, and addition is

$$(x_1, y_1) + (x_2, y_2) = \left( \frac{x_1y_2 + y_1x_2}{1 + dx_1x_2y_1y_2},\;
\frac{y_1y_2 - ax_1x_2}{1 - dx_1x_2y_1y_2} \right).$$

The same formula doubles a point. And when $a$ is a square and $d$ is not a square in
$\mathbb{F}_p$, the denominators are never zero: the formulas are **complete**, with no
special cases at all, not for doubling, not for the identity, not for $P + (-P)$. Code
with no special cases has no branches for an attacker to time and no forgotten corner
for a bug to hide in.

### A squeezed circle

Compare the unit circle $x^2 + y^2 = 1$, with points $(\sin\alpha, \cos\alpha)$.
Adding angles gives

$$\bigl(\sin(\alpha + \beta), \cos(\alpha + \beta)\bigr) = (x_1y_2 + y_1x_2,\; y_1y_2 - x_1x_2),$$

the Edwards law with $a = 1$, $d = 0$: a group with identity $(0, 1)$, negation $(x,
y) \mapsto (-x, y)$, $(0, -1)$ of order 2 and $(\pm 1, 0)$ of order 4. It is not an elliptic curve: over
$\mathbb{F}_p$ its group is cyclic of order $p \pm 1$, and discrete logarithms in it
are no harder than in a field. The term $dx^2y^2$ bends the circle into a curve of
genus 1, and the denominators are the price of the bend. Edwards generalized a curve
Euler and Gauss had studied, $x^2 + y^2 = 1 - x^2y^2$. The points of order 2 and 4
remain, so every Edwards curve has cofactor at least 4.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Two real curves side by side. Left: the Weierstrass curve y squared = x cubed minus x, an oval and an open branch, with three points of order 2 on the x-axis and the identity O at infinity. Right: the Edwards curve x squared + y squared = 1 minus 30 x squared y squared, a closed curve with fourfold symmetry inside the unit circle, with the identity at (0, 1), a point of order 2 at (0, -1) and points of order 4 at (1, 0) and (-1, 0)" fill="currentColor" font-size="13">
<g stroke="currentColor" stroke-width="1" opacity=".5"><line x1="20" y1="150" x2="305" y2="150"/><line x1="141.1" y1="25" x2="141.1" y2="275"/><line x1="345" y1="150" x2="635" y2="150"/><line x1="490" y1="20" x2="490" y2="280"/></g>
<path fill="none" stroke="currentColor" stroke-width="2.2" d="M65.4,150.0L65.4,148.6L65.5,147.2L65.7,145.8L65.9,144.5L66.1,143.1L66.5,141.8L66.8,140.4L67.3,139.1L67.7,137.9L68.3,136.6L68.9,135.4L69.5,134.2L70.2,133.0L71.0,131.9L71.8,130.8L72.6,129.7L73.5,128.7L74.5,127.7L75.5,126.8L76.5,125.9L77.6,125.1L78.7,124.3L79.8,123.6L81.0,122.9L82.2,122.3L83.5,121.7L84.8,121.2L86.1,120.7L87.4,120.3L88.8,120.0L90.1,119.7L91.6,119.4L93.0,119.2L94.4,119.1L95.9,119.0L97.3,119.0L98.8,119.0L100.3,119.1L101.8,119.2L103.2,119.4L104.7,119.6L106.2,119.9L107.7,120.2L109.2,120.6L110.6,121.0L112.1,121.4L113.5,121.9L114.9,122.4L116.3,123.0L117.7,123.6L119.1,124.2L120.4,124.9L121.7,125.6L123.0,126.3L124.3,127.0L125.5,127.8L126.7,128.6L127.8,129.4L128.9,130.2L130.0,131.1L131.0,131.9L132.0,132.8L133.0,133.7L133.9,134.6L134.7,135.5L135.5,136.5L136.3,137.4L137.0,138.3L137.6,139.3L138.2,140.3L138.7,141.2L139.2,142.2L139.7,143.2L140.0,144.1L140.4,145.1L140.6,146.1L140.8,147.1L141.0,148.0L141.1,149.0L141.1,150.0L141.1,150.0L141.1,151.0L141.0,152.0L140.8,152.9L140.6,153.9L140.4,154.9L140.0,155.9L139.7,156.8L139.2,157.8L138.7,158.8L138.2,159.7L137.6,160.7L137.0,161.7L136.3,162.6L135.5,163.5L134.7,164.5L133.9,165.4L133.0,166.3L132.0,167.2L131.0,168.1L130.0,168.9L128.9,169.8L127.8,170.6L126.7,171.4L125.5,172.2L124.3,173.0L123.0,173.7L121.7,174.4L120.4,175.1L119.1,175.8L117.7,176.4L116.3,177.0L114.9,177.6L113.5,178.1L112.1,178.6L110.6,179.0L109.2,179.4L107.7,179.8L106.2,180.1L104.7,180.4L103.2,180.6L101.8,180.8L100.3,180.9L98.8,181.0L97.3,181.0L95.9,181.0L94.4,180.9L93.0,180.8L91.6,180.6L90.1,180.3L88.8,180.0L87.4,179.7L86.1,179.3L84.8,178.8L83.5,178.3L82.2,177.7L81.0,177.1L79.8,176.4L78.7,175.7L77.6,174.9L76.5,174.1L75.5,173.2L74.5,172.3L73.5,171.3L72.6,170.3L71.8,169.2L71.0,168.1L70.2,167.0L69.5,165.8L68.9,164.6L68.3,163.4L67.7,162.1L67.3,160.9L66.8,159.6L66.5,158.2L66.1,156.9L65.9,155.5L65.7,154.2L65.5,152.8L65.4,151.4L65.4,150.0Z"/>
<path fill="none" stroke="currentColor" stroke-width="2.2" d="M294.7,24.1L292.8,27.0L290.9,29.9L289.0,32.6L287.1,35.4L285.3,38.1L283.4,40.7L281.7,43.3L279.9,45.9L278.2,48.4L276.4,50.8L274.7,53.3L273.1,55.6L271.4,58.0L269.8,60.3L268.2,62.5L266.6,64.7L265.1,66.9L263.6,69.0L262.1,71.1L260.6,73.2L259.2,75.2L257.7,77.2L256.3,79.1L255.0,81.0L253.6,82.9L252.3,84.8L251.0,86.6L249.7,88.3L248.4,90.1L247.2,91.8L246.0,93.5L244.8,95.1L243.7,96.7L242.5,98.3L241.4,99.9L240.3,101.4L239.3,102.9L238.2,104.4L237.2,105.8L236.2,107.3L235.3,108.6L234.3,110.0L233.4,111.4L232.5,112.7L231.7,114.0L230.8,115.3L230.0,116.5L229.2,117.8L228.5,119.0L227.7,120.2L227.0,121.4L226.3,122.5L225.6,123.7L225.0,124.8L224.4,125.9L223.8,127.0L223.2,128.1L222.7,129.1L222.1,130.2L221.6,131.2L221.2,132.2L220.7,133.2L220.3,134.2L219.9,135.2L219.5,136.2L219.1,137.1L218.8,138.1L218.5,139.0L218.2,140.0L218.0,140.9L217.7,141.8L217.5,142.8L217.4,143.7L217.2,144.6L217.1,145.5L217.0,146.4L216.9,147.3L216.8,148.2L216.8,149.1L216.8,150.0L216.8,150.9L216.8,151.8L216.9,152.7L217.0,153.6L217.1,154.5L217.2,155.4L217.4,156.3L217.5,157.2L217.7,158.2L218.0,159.1L218.2,160.0L218.5,161.0L218.8,161.9L219.1,162.9L219.5,163.8L219.9,164.8L220.3,165.8L220.7,166.8L221.2,167.8L221.6,168.8L222.1,169.8L222.7,170.9L223.2,171.9L223.8,173.0L224.4,174.1L225.0,175.2L225.6,176.3L226.3,177.5L227.0,178.6L227.7,179.8L228.5,181.0L229.2,182.2L230.0,183.5L230.8,184.7L231.7,186.0L232.5,187.3L233.4,188.6L234.3,190.0L235.3,191.4L236.2,192.7L237.2,194.2L238.2,195.6L239.3,197.1L240.3,198.6L241.4,200.1L242.5,201.7L243.7,203.3L244.8,204.9L246.0,206.5L247.2,208.2L248.4,209.9L249.7,211.7L251.0,213.4L252.3,215.2L253.6,217.1L255.0,219.0L256.3,220.9L257.7,222.8L259.2,224.8L260.6,226.8L262.1,228.9L263.6,231.0L265.1,233.1L266.6,235.3L268.2,237.5L269.8,239.7L271.4,242.0L273.1,244.4L274.7,246.7L276.4,249.2L278.2,251.6L279.9,254.1L281.7,256.7L283.4,259.3L285.3,261.9L287.1,264.6L289.0,267.4L290.9,270.1L292.8,273.0L294.7,275.9"/>
<circle cx="490" cy="150" r="110" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="5 4" opacity=".6"/>
<path fill="none" stroke="currentColor" stroke-width="2.2" d="M600.0,150.0L597.6,145.8L591.9,142.0L585.4,138.7L579.2,135.9L573.7,133.3L568.9,131.1L564.6,129.0L560.8,127.0L557.4,125.2L554.3,123.4L551.5,121.7L548.9,120.0L546.5,118.4L544.2,116.8L542.1,115.2L540.1,113.6L538.2,112.0L536.4,110.4L534.6,108.7L532.9,107.1L531.3,105.4L529.6,103.6L528.0,101.8L526.4,99.9L524.8,97.9L523.2,95.8L521.6,93.5L520.0,91.1L518.3,88.5L516.6,85.7L514.8,82.6L513.0,79.2L511.0,75.4L508.9,71.1L506.7,66.3L504.1,60.8L501.3,54.6L498.0,48.1L494.2,42.4L490.0,40.0L485.8,42.4L482.0,48.1L478.7,54.6L475.9,60.8L473.3,66.3L471.1,71.1L469.0,75.4L467.0,79.2L465.2,82.6L463.4,85.7L461.7,88.5L460.0,91.1L458.4,93.5L456.8,95.8L455.2,97.9L453.6,99.9L452.0,101.8L450.4,103.6L448.7,105.4L447.1,107.1L445.4,108.7L443.6,110.4L441.8,112.0L439.9,113.6L437.9,115.2L435.8,116.8L433.5,118.4L431.1,120.0L428.5,121.7L425.7,123.4L422.6,125.2L419.2,127.0L415.4,129.0L411.1,131.1L406.3,133.3L400.8,135.9L394.6,138.7L388.1,142.0L382.4,145.8L380.0,150.0L382.4,154.2L388.1,158.0L394.6,161.3L400.8,164.1L406.3,166.7L411.1,168.9L415.4,171.0L419.2,173.0L422.6,174.8L425.7,176.6L428.5,178.3L431.1,180.0L433.5,181.6L435.8,183.2L437.9,184.8L439.9,186.4L441.8,188.0L443.6,189.6L445.4,191.3L447.1,192.9L448.7,194.6L450.4,196.4L452.0,198.2L453.6,200.1L455.2,202.1L456.8,204.2L458.4,206.5L460.0,208.9L461.7,211.5L463.4,214.3L465.2,217.4L467.0,220.8L469.0,224.6L471.1,228.9L473.3,233.7L475.9,239.2L478.7,245.4L482.0,251.9L485.8,257.6L490.0,260.0L494.2,257.6L498.0,251.9L501.3,245.4L504.1,239.2L506.7,233.7L508.9,228.9L511.0,224.6L513.0,220.8L514.8,217.4L516.6,214.3L518.3,211.5L520.0,208.9L521.6,206.5L523.2,204.2L524.8,202.1L526.4,200.1L528.0,198.2L529.6,196.4L531.3,194.6L532.9,192.9L534.6,191.3L536.4,189.6L538.2,188.0L540.1,186.4L542.1,184.8L544.2,183.2L546.5,181.6L548.9,180.0L551.5,178.3L554.3,176.6L557.4,174.8L560.8,173.0L564.6,171.0L568.9,168.9L573.7,166.7L579.2,164.1L585.4,161.3L591.9,158.0L597.6,154.2L600.0,150.0Z"/>
<circle cx="65.4" cy="150.0" r="4.5"/>
<circle cx="141.1" cy="150.0" r="4.5"/>
<circle cx="216.8" cy="150.0" r="4.5"/>
<circle cx="490.0" cy="40.0" r="4.5"/>
<circle cx="490.0" cy="260.0" r="4.5"/>
<circle cx="600.0" cy="150.0" r="4.5"/>
<circle cx="380.0" cy="150.0" r="4.5"/>
<path d="M246.5 40 L246.5 22 M240.5 28 L246.5 22 L252.5 28" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="196.5" y="55" font-size="12">O, at infinity</text>
<text x="26" y="215" font-size="12">on the x-axis:</text><text x="26" y="231" font-size="12">three points of order 2</text>
<text x="20" y="292" font-size="12">Weierstrass: y² = x³ − x</text>
<text x="498" y="34" font-size="12">O = (0, 1)</text>
<text x="498" y="276" font-size="12">(0, −1), order 2</text>
<text x="590" y="174" font-size="12">order 4</text>
<text x="352" y="174" font-size="12">order 4</text>
<text x="345" y="292" font-size="12">Edwards: x² + y² = 1 − 30x²y² (dashed: the circle, d = 0)</text>
</svg>
<figcaption>Figure 12.3. The same kind of object in two shapes, over the real numbers. A Weierstrass curve keeps its identity at infinity and needs separate formulas for doubling, for O and for P + (−P). An Edwards curve is a squeezed circle: its identity (0, 1) is an ordinary point, and when d = 0 its addition law becomes the sine and cosine addition formulas.</figcaption>
</figure>

### Why the denominators never vanish

The proof, for $a = 1$ (Bernstein and Lange, 2007): take two points on $x^2 + y^2 = 1
+ dx^2y^2$, $d$ not a square, and suppose a denominator is zero: $\varepsilon = dx_1x_2y_1y_2 = \pm 1$. Then none of $x_1, x_2,
y_1, y_2$ is zero, and $d^2x_1^2y_1^2x_2^2y_2^2 = \varepsilon^2 = 1$. Using the curve
equation for the second point, then this fact, then the curve equation for the first,

$$dx_1^2y_1^2(x_2^2 + y_2^2) = dx_1^2y_1^2(1 + dx_2^2y_2^2) = dx_1^2y_1^2 + 1 = x_1^2 + y_1^2.$$

Now look at $(x_1 + \varepsilon y_1)^2 = x_1^2 + y_1^2 + 2\varepsilon x_1y_1$. Replace
$x_1^2 + y_1^2$ by the left side above, and $\varepsilon$ by $dx_1x_2y_1y_2$:

$$(x_1 + \varepsilon y_1)^2 = dx_1^2y_1^2(x_2^2 + 2x_2y_2 + y_2^2) = dx_1^2y_1^2(x_2 + y_2)^2.$$

If $x_2 + y_2 \ne 0$, divide: $d = \bigl((x_1 + \varepsilon y_1)/(x_1y_1(x_2 +
y_2))\bigr)^2$ is a square, which it is not. The same computation with $x_1 -
\varepsilon y_1$ gives $dx_1^2y_1^2(x_2 - y_2)^2$, so $x_2 - y_2 = 0$ as well. Then
$x_2 = y_2 = 0$, contradicting $x_2 \ne 0$. So no denominator is ever zero, for any
two points on the curve, equal or not, identity or not.

For $ax^2 + y^2 = 1 + dx^2y^2$ with $a$ a square, $x' = \sqrt{a}\,x$ gives $x'^2 +
y^2 = 1 + (d/a)x'^2y^2$, so the condition is again that $d$ is not a square. Ed25519
has $a = -1$, a square as $p \equiv 1 \pmod 4$, and a non-square $d$: complete. If
$d$ is a square, pairs with a zero denominator exist; they come from points at
infinity that the affine equation does not show.

Every Montgomery curve is birationally equivalent to a twisted Edwards curve (the
same group, with coordinates changed by a rational map). Curve25519's Edwards twin is

$$-x^2 + y^2 = 1 - \tfrac{121665}{121666}x^2y^2,$$

the curve of **Ed25519** signatures (Bernstein, Niels Duif, Lange, Peter Schwabe and
Bo-Yin Yang, 2011; RFC 8032). Its base point $B$ has $y = 4/5$ and an even $x$. Recover
$x$ by decompression (§12.9) and check that $\ell B = \mathcal{O}$:

```python
# Ed25519's curve: -x^2 + y^2 = 1 + d x^2 y^2, with complete addition formulas.
q = P25519
d = -121665 * pow(121666, -1, q) % q

def ed_add(P1, P2):
    x1, y1 = P1
    x2, y2 = P2
    t = d * x1 * x2 * y1 * y2 % q
    x3 = (x1 * y2 + y1 * x2) * pow(1 + t, -1, q) % q
    y3 = (y1 * y2 + x1 * x2) * pow(1 - t, -1, q) % q
    return (x3, y3)

def ed_mul(k, P1):
    R = (0, 1)                                   # the identity is (0, 1)
    for bit in bin(k)[2:]:
        R = ed_add(R, R)
        if bit == "1":
            R = ed_add(R, P1)
    return R

def recover_x(y, sign):
    """Point decompression: x^2 = (y^2 - 1) / (d y^2 + 1); q = 5 mod 8."""
    x2 = (y * y - 1) * pow(d * y * y + 1, -1, q) % q
    x = pow(x2, (q + 3) // 8, q)
    if (x * x - x2) % q:
        x = x * pow(2, (q - 1) // 4, q) % q
    if (x * x - x2) % q:
        return None
    return q - x if (x & 1) != sign else x

By = 4 * pow(5, -1, q) % q
B = (recover_x(By, 0), By)
ell = 2**252 + 27742317777372353535851937790883648493
print(B[0])
print(ed_mul(ell, B) == (0, 1), ed_mul(8, B) != (0, 1))
print(ed_add(B, (0, 1)) == B, ed_add(B, (q - B[0], B[1])) == (0, 1))
```

```text
15112221349535400772501151409588531511454012693041857206046113283949847762202
True True
True True
```

The recovered $x$ is the RFC's value, $\ell B$ is the identity $(0, 1)$, $8B$ is not,
and the complete formula handles $B + \mathcal{O}$ and $B + (-B)$ with no special case.
Real implementations use extended coordinates $(X : Y : Z : T)$ with $T = XY/Z$, which
need about 8 multiplications per addition and no inversion (Hüseyin Hışıl, Kenneth Wong,
Gary Carter and Ed Dawson, 2008).

### Code it: no exceptional cases

On a small curve every pair can be tried. $-x^2 + y^2 = 1 + 7x^2y^2$ over
$\mathbb{F}_{97}$ has Ed25519's shape ($97 \equiv 1 \pmod 4$, and 7 is not a square
mod 97).

```python
# Uses ed_add() from the listing above. It reads the globals q and d, so point them at a small curve.
q, d = 97, 7                                   # -x^2 + y^2 = 1 + 7x^2y^2 over F_97

def edwards_points():
    return [(x, y) for x in range(q) for y in range(q)
            if (-x * x + y * y - 1 - d * x * x * y * y) % q == 0]

def exceptional(pts):
    """Pairs for which 1 + t or 1 - t, the denominators of ed_add(), is zero."""
    return sum(1 for (x1, y1) in pts for (x2, y2) in pts
               if (1 - (d * x1 * x2 * y1 * y2) ** 2) % q == 0)

ed = edwards_points()
print(len(ed), pow(d, (q - 1) // 2, q) == q - 1, exceptional(ed))
print(all(ed_add(ed_add(P1, P2), P3) == ed_add(P1, ed_add(P2, P3))
          for P1 in ed[:20] for P2 in ed[:20] for P3 in ed[:20]))
d = 4                                          # a square: now the formula has holes
print(len(edwards_points()), exceptional(edwards_points()))
d = 7
```

It prints:

```text
104 True 0
True
108 832
```

Of the $104^2 = 10{,}816$ pairs, not one hits a zero denominator, and the law is
associative on the 8,000 triples tried. With $d = 4$, a square, the affine curve has 108 points, and 832 of its pairs
make the formula divide by zero.

Compare the Weierstrass law of §12.3 on its curve of 100 points. Here it is again,
with each case named, so we can count how often each one is taken:

```python
# Uses ed and exceptional() from the listing above.
from collections import Counter
p, a, b = 97, 2, 3                             # y^2 = x^3 + 2x + 3 over F_97, as in §12.3

def case(P, Q):
    if P is None or Q is None:
        return "identity"
    if P[0] == Q[0] and (P[1] + Q[1]) % p == 0:
        return "P + (-P)"
    return "doubling" if P == Q else "chord"

def add(P, Q):
    c = case(P, Q)
    if c == "identity":
        return Q if P is None else P
    if c == "P + (-P)":
        return None
    (x1, y1), (x2, y2) = P, Q
    if c == "doubling":
        lam = (3 * x1 * x1 + a) * pow(2 * y1, -1, p) % p
    else:
        lam = (y2 - y1) * pow(x2 - x1, -1, p) % p
    x3 = (lam * lam - x1 - x2) % p
    return (x3, (lam * (x1 - x3) - y1) % p)

def mul(k, P):
    R = None
    for bit in bin(k)[2:]:
        R = add(R, R)
        if bit == "1":
            R = add(R, P)
    return R

W = [None] + [(x, y) for x in range(p) for y in range(p) if (y * y - x**3 - a * x - b) % p == 0]
print(sorted(Counter(case(P, Q) for P in W for Q in W).items()))
print("Edwards:", exceptional(ed), "exceptional pairs of", len(ed) ** 2)
```

It prints:

```text
[('P + (-P)', 99), ('chord', 9606), ('doubling', 96), ('identity', 199)]
Edwards: 0 exceptional pairs of 10816
```

Of the 10,000 Weierstrass pairs, 9,606 take the chord formula and 394 need a special
branch: 199 involve $\mathcal{O}$, 99 are $P + (-P)$ (including the three points of
order 2 added to themselves), and 96 are doublings. Rare cases are the dangerous
ones: tests seldom reach them, and an attacker can steer a computation into them.

### Why completeness matters for side channels

A scalar multiplication runs the addition law hundreds of times on points derived
from the secret, and every `if` in the law is a question about those points whose
answer can show in the running time or the power drawn. With the incomplete law there
are two bad options. Branch, and leak whether a doubling happened inside an addition
(an attacker who chooses the input point can arrange one for a guess of the key bits,
and watch). Or leave out the branches and compute garbage on the rare pairs that
divide by zero: Tetsuya Izu and Tsuyoshi Takagi (2003) showed that an attacker who
triggers such **exceptional procedures** learns key bits from whether the result is
wrong. Code with incomplete formulas must prove that no exceptional case can arise in
its ladder, and such proofs have been wrong before.

A complete formula removes the question: the same arithmetic for every pair, nothing
to branch on, no corner that no test reaches. That is why the constant-time
discipline of *Cryptographic engineering*
[chapter 5](../engineering/05-Constant-Time-Programming.md) is easy to follow for
Ed25519. Prime-order curves such as P-256 have no Edwards form, but Joost Renes, Craig
Costello and Lejla Batina (2016) gave complete formulas for them too (§12.13, and
[chapter 6](../engineering/06-Big-Numbers-and-Public-Key-Code.md) of that book).
Completeness covers the formulas only: a table lookup indexed by secret bits still
leaks through the cache.

<figure class="mars-fig">
<svg viewBox="0 0 640 230" width="640" role="img" aria-label="Three shapes of the same curve family: Weierstrass with general addition formulas and special cases, Montgomery with the x-only ladder used by X25519, and twisted Edwards with complete formulas used by Ed25519; birational maps connect them" fill="currentColor" font-size="13">
<g stroke="currentColor" stroke-width="1.3" fill="none">
<rect x="20" y="30" width="180" height="150" rx="8"/>
<rect x="230" y="30" width="180" height="150" rx="8" class="acc"/>
<rect x="440" y="30" width="180" height="150" rx="8" class="acc"/>
<path d="M200 105 L230 105"/><path d="M410 105 L440 105"/>
</g>
<g text-anchor="middle">
<text x="110" y="55">Weierstrass</text><text x="110" y="80" font-size="12">y² = x³ + ax + b</text>
<text x="110" y="110" font-size="12">general formulas,</text><text x="110" y="128" font-size="12">special cases for doubling,</text><text x="110" y="146" font-size="12">O and P + (−P)</text>
<text x="110" y="168" font-size="12">P-256, P-384, secp256k1</text>
<text x="320" y="55" class="acc-fill">Montgomery</text><text x="320" y="80" font-size="12">By² = x³ + Ax² + x</text>
<text x="320" y="110" font-size="12">x-only ladder,</text><text x="320" y="128" font-size="12">uniform steps,</text><text x="320" y="146" font-size="12">Diffie-Hellman</text>
<text x="320" y="168" font-size="12">X25519, X448</text>
<text x="530" y="55" class="acc-fill">twisted Edwards</text><text x="530" y="80" font-size="12">ax² + y² = 1 + dx²y²</text>
<text x="530" y="110" font-size="12">complete formulas,</text><text x="530" y="128" font-size="12">no special cases,</text><text x="530" y="146" font-size="12">signatures</text>
<text x="530" y="168" font-size="12">Ed25519, Ed448</text>
<text x="320" y="215">Montgomery and twisted Edwards curves always have a point of order 4: cofactor at least 4</text>
</g>
</svg>
<figcaption>Figure 12.4. Three forms of elliptic curves. Every curve has a Weierstrass form; those with a point of order 4 also have Montgomery and twisted Edwards forms, which give faster and safer formulas. Curve25519 and Edwards25519 are one group in two coordinate systems.</figcaption>
</figure>

## 12.9 Point compression

*Level: expert.*

A point $(x, y)$ is determined by $x$ and the sign of $y$, since $y = \pm\sqrt{x^3 + ax +
b}$. So it can be sent as $x$ plus one bit, halving its size. To decompress, compute
the square root (Chapter 5) and pick the root with the right parity; if the right-hand
side is not a square, the input is not a valid point and must be rejected.

```python
# Uses p, a and b (the curve of §12.3) from the listing above.
# Point compression on the small curve: send x and one bit of y.  p = 97 is 1 mod 4,
# so we find square roots by search here; Chapter 5 gives Tonelli-Shanks.
Q = (80, 10)                                     # 2P from §12.3

def compress(P):
    return (P[0], P[1] & 1)

def decompress(x, bit):
    rhs = (x**3 + a * x + b) % p
    ys = [y for y in range(p) if y * y % p == rhs]
    if not ys:
        return None
    y = ys[0] if ys[0] & 1 == bit else ys[-1]
    return (x, y)

print(compress(Q), decompress(*compress(Q)) == Q, decompress(5, 0))
```

```text
(80, 0) True None
```

$(80, 10)$ compresses to $x = 80$ and the bit 0, and decompresses correctly; $x = 5$ is
not the $x$-coordinate of any point, and decompression returns `None` instead of a
point. SEC 1 encodes compressed points with a prefix byte `02` or `03` (the parity of
$y$); Ed25519 stores $y$ and the parity of $x$ in 32 bytes; X25519 sends only $x$.
Decompression must check its square root. RFC 8032's decoding does, and the code above
does too: a decoder that skips the check can be fed an $x$ for which the "root" is not a
root, and compute on a point that is not on the curve, which is the attack of the next
section.

## 12.10 Break it: the invalid-curve attack

*Level: expert.*

The formulas of §12.3 never use $b$. So if a server receives a point $Q = (x, y)$ that is
*not* on its curve $E: y^2 = x^3 + ax + b$, the formulas still run, and they compute
$kQ$ on the curve $E': y^2 = x^3 + ax + b'$ with $b' = y^2 - x^3 - ax$, whichever curve
$Q$ happens to lie on. Ingrid Biehl, Bernd Meyer and Volker Müller (2000) pointed out
the consequence. The attacker picks curves $E'$ (same $a$, different $b'$) whose orders
have small prime factors $r$, takes a point $T$ of order $r$ on each, sends it as an
ephemeral public key, and learns $k \bmod r$ from the server's reply (by trying all $r$
values, as in the small-subgroup attack of Chapter 7). The CRT does the rest.

```python
# Uses add() and mul() from the listings above.
# Invalid-curve attack: the addition formulas never use b.  A server that does not check
# that a received point is on ITS curve will compute k*Q on whatever curve Q lies on.
import random
p, a = 10007, 5
b_real = 7

def count_points(bb):
    n = 1
    for x in range(p):
        r = (x**3 + a * x + bb) % p
        n += 1 if r == 0 else (2 if pow(r, (p - 1) // 2, p) == 1 else 0)
    return n

def find_point_of_order(r):
    """Search curves y^2 = x^3 + 5x + b' for a point of prime order r."""
    for bb in range(1, p):
        n = count_points(bb)
        if n % r:
            continue
        for x in range(p):
            rhs = (x**3 + a * x + bb) % p
            if pow(rhs, (p - 1) // 2, p) != 1:
                continue
            y = next(y for y in range(p) if y * y % p == rhs)
            T = mul(n // r, (x, y))
            if T is not None:
                return bb, T

secret = random.Random(6).randrange(1, count_points(b_real))
def careless_server(Qpt):
    return mul(secret, Qpt)                       # no on_curve check

residues, moduli = [], []
for r in (5, 7, 11, 13, 17):
    bb, T = find_point_of_order(r)
    reply = careless_server(T)
    kr = next(j for j in range(r) if mul(j, T) == reply)
    residues.append(kr)
    moduli.append(r)

M, x = 1, 0
for rr, m in zip(residues, moduli):
    x += M * ((rr - x) * pow(M, -1, m) % m)
    M *= m
print(count_points(b_real), M, secret % M == x)
```

```text
10196 85085 True
```

The real curve has 10,196 points; five invalid points, of orders 5, 7, 11, 13 and 17,
reveal the secret modulo 85,085, which is more than enough to determine it completely.

<figure class="mars-fig">
<svg viewBox="0 0 640 220" width="640" role="img" aria-label="The invalid-curve attack: the server's curve E with b and a family of curves E prime with the same a and other b values; the attacker sends points of small order on the E prime curves, and the server's replies leak the secret modulo each small order" fill="currentColor" font-size="13">
<g stroke="currentColor" stroke-width="1.3" fill="none">
<rect x="20" y="40" width="180" height="120" rx="8" class="acc"/>
<rect x="250" y="20" width="160" height="40" rx="6"/><rect x="250" y="70" width="160" height="40" rx="6"/><rect x="250" y="120" width="160" height="40" rx="6"/>
<rect x="460" y="70" width="160" height="40" rx="6"/>
<path d="M410 40 L460 85"/><path d="M410 90 L460 90"/><path d="M410 140 L460 95"/>
</g>
<g text-anchor="middle">
<text x="110" y="70" class="acc-fill">server's curve E</text><text x="110" y="95" font-size="12">y² = x³ + 5x + 7</text><text x="110" y="120" font-size="12">secret k, never checks</text><text x="110" y="138" font-size="12">that Q is on E</text>
<text x="330" y="45" font-size="12">E′: b′ = …, T of order 5</text><text x="330" y="95" font-size="12">E″: b″ = …, T of order 7</text><text x="330" y="145" font-size="12">… orders 11, 13, 17</text>
<text x="540" y="95">CRT: k mod 85,085</text>
<text x="320" y="200">the formulas never use b, so k·T is computed on whatever curve T lies on</text>
</g>
</svg>
<figcaption>Figure 12.5. The invalid-curve attack. Same a, different b: each fake curve has a point of small order, and the server's answer to it reveals the secret modulo that order.</figcaption>
</figure>

**In the wild.** Tibor Jager, Jörg Schwenk and Juraj Somorovsky (2015) sent invalid
points to TLS servers and found two libraries, Bouncy Castle and the SunEC provider of
the Java standard library, that never checked them. Against servers with a static
ECDH key (the TLS_ECDH cipher suites) they extracted the private key as in the
listing above, with real handshakes. The attack needs one secret used many times, so
an ephemeral key loses little; but any code that multiplies a received point by a
long-lived secret must validate it. In
2018 Eli Biham and Lior Neumann showed that Bluetooth pairing validated only the
$x$-coordinate of the peer's key (CVE-2018-5383), so an attacker could substitute an
invalid point and learn the pairing key with good probability. In January 2020
Microsoft fixed CVE-2020-0601 ("CurveBall"), in which Windows' certificate validation
accepted certificates that specified their own curve parameters, including a
different generator, letting an attacker forge certificates for a trusted public key.

**Fix it.**

- **Validate every received point**: check that it is on the curve (and, for curves with
  a cofactor, in the right subgroup, or clear the cofactor), and reject the point at
  infinity.
- **Use $x$-only Montgomery arithmetic** as in X25519: an $x$-coordinate lies either on
  the curve or on its quadratic **twist**, so the only "invalid curve" available is
  the twist (§12.7 ran that attack on a small curve whose twist has order 100), and
  Curve25519 was chosen so that its twist also has a large prime-order subgroup
  (twist security, Chapter 13).
- **Check the subgroup when the cofactor is not 1**: check $\ell Q = \mathcal{O}$, or
  multiply by the cofactor as X25519's clamping does, or use a prime-order encoding
  such as Ristretto (§12.13). Decompression must check its square root (§12.9). The
  full list of checks, as SP 800-56A states it, is coded in *Cryptographic engineering*
  [§6.8](../engineering/06-Big-Numbers-and-Public-Key-Code.md#68-points-from-strangers-validation-and-invalid-curves).
- **Never accept curve parameters from the other side**; use named curves only.

## 12.11 Hashing to a curve

*Level: expert.*

Many protocols need a point made from a string. BLS signatures sign $H(m)$ (§13.8), password exchanges such as WPA3's SAE
and CPace turn the password into a generator, and oblivious PRFs hash their inputs to
the group. The point must behave like a random point **whose discrete logarithm nobody
knows**. The shortcut $H(m) = h(m) \cdot G$, for an ordinary hash $h$ to the integers,
fails exactly there: a BLS signature $x \cdot H(m) = h(m) \cdot X$ could then be
computed from the public key $X$ by anyone, and in a password exchange the password
would stop mattering.

### Try and increment, and why it leaks

The obvious honest method: hash the message with a counter to get a candidate $x$,
test whether $x^3 + ax + b$ is a square, and if not, increase the counter and try
again; then multiply by the cofactor. About half of all $x$ values work, so the
expected number of tries is 2, and nobody knows the logarithm of the result.

```python
# Uses mul() from the listings above (it reads the globals p and a).
import hashlib
from collections import Counter
p, a, b = 103, 1, 7                            # y^2 = x^3 + x + 7 over F_103: 92 = 4 * 23 points

def try_and_increment(msg):
    for ctr in range(1, 256):
        x = int.from_bytes(hashlib.sha256(bytes([ctr]) + msg).digest(), "big") % p
        r = (x**3 + a * x + b) % p
        if pow(r, (p - 1) // 2, p) == 1:                     # r is a nonzero square
            return mul(4, (x, pow(r, (p + 1) // 4, p))), ctr  # clear the cofactor 4
    return None, ctr

tries = Counter(try_and_increment(b"password %d" % i)[1] for i in range(1000))
print(sorted(tries.items()))
```

It prints:

```text
[(1, 433), (2, 250), (3, 153), (4, 75), (5, 43), (6, 23), (7, 10), (8, 6), (9, 6), (13, 1)]
```

Of a thousand passwords, 433 find a point at once and one needs 13 tries. An attacker
who times the computation learns the count for the secret password, computes it
offline for every guess, and discards the guesses that disagree. This is
**Dragonblood** (Mathy Vanhoef and Eyal Ronen, 2019), which recovered WPA3 passwords
from SAE's "hunting and pecking" loop through timing and cache side channels;
*Protocols* [§9.8](../protocols/09-Wi-Fi-Security.md#98-dragonblood-saes-side-channels)
runs the attack. Padding the loop to a fixed count helps only if every iteration does
the same work and touches the same memory, which implementations kept getting wrong.
The lasting fix is a map with no loop.

### The simplified SWU map

Andrew Shallue and Christiaan van de Woestijne (2006) found the first deterministic
map from $\mathbb{F}_p$ to the points of any elliptic curve; Maciej Ulas (2007) and
then Éric Brier and five coauthors (2010) simplified it for curves $y^2 = g(x) = x^3 +
Ax + B$ with $A \ne 0$ and $B \ne 0$. RFC 9380 (August 2023) calls it the
**simplified SWU** map and builds its suites for the NIST curves on it.

The idea fits in one line of algebra. Fix a non-square $Z$ in $\mathbb{F}_p$. For an
input $u$, let $t = Zu^2$, and look for an $x_1$ with

$$g(t x_1) = t^3 g(x_1).$$

Expanding, $t^3x_1^3 + Atx_1 + B = t^3x_1^3 + At^3x_1 + Bt^3$: the cubes cancel and
$Ax_1(t - t^3) = B(t^3 - 1)$, so

$$x_1 = -\frac{B}{A} \cdot \frac{t^2 + t + 1}{t^2 + t} = -\frac{B}{A}\left(1 + \frac{1}{t^2 + t}\right).$$

Set $x_2 = tx_1$. As $t^3 = Z^3u^6$ is a non-square, $g(x_2) = t^3g(x_1)$ is a square
exactly when $g(x_1)$ is not (Chapter 5). One of the two candidates always works, so
there is no loop: compute both, keep the right one with a constant-time select, take
a square root, and give $y$ the parity of $u$, so that $u$ and $-u$ give different
points. Inputs with $t^2 + t = 0$, such as $u = 0$, go to $x_1 = B/(ZA)$, and $Z$ is
chosen so that $g(B/(ZA))$ is a square; RFC 9380 lists four conditions on $Z$ and a
program that finds the smallest.

<figure class="mars-fig">
<svg viewBox="0 0 640 340" width="640" role="img" aria-label="Hashing to a curve as RFC 9380 does it. Top: the message and a domain tag go through expand_message_xmd to two field elements u0 and u1; each is mapped to a point, the two points are added, and the sum is multiplied by the cofactor. Bottom: the simplified SWU map. From u compute t = Z u squared and x1; if g(x1) is a square use x1, otherwise use x2 = t x1, whose g value is t cubed times g(x1) and therefore a square; finally match the sign of y to the sign of u" fill="currentColor" font-size="12">
<g stroke="currentColor" stroke-width="1.2" fill="none">
<rect x="4" y="20" width="104" height="50" rx="6"/>
<rect x="132" y="20" width="118" height="50" rx="6"/>
<rect x="274" y="20" width="104" height="50" rx="6"/>
<rect x="402" y="20" width="104" height="50" rx="6"/>
<rect x="530" y="20" width="106" height="50" rx="6"/>
<path d="M108 45 L128 45 M122 40 L128 45 L122 50"/>
<path d="M250 45 L270 45 M264 40 L270 45 L264 50"/>
<path d="M378 45 L398 45 M392 40 L398 45 L392 50"/>
<path d="M506 45 L526 45 M520 40 L526 45 L520 50"/>
</g>
<g text-anchor="middle">
<text x="56" y="41">message,</text><text x="56" y="57">domain tag</text>
<text x="191" y="41">expand_message</text><text x="191" y="57">_xmd → u0, u1</text>
<text x="326" y="41">map_to_curve:</text><text x="326" y="57">Q0, Q1</text>
<text x="454" y="41">Q0 + Q1,</text><text x="454" y="57">then × h_eff</text>
<text x="583" y="41">point P in the</text><text x="583" y="57">prime subgroup</text>
</g>
<text x="4" y="104" font-size="13">inside map_to_curve: the simplified SWU map</text>
<g stroke="currentColor" stroke-width="1.2" fill="none">
<rect x="4" y="120" width="56" height="40" rx="6"/>
<rect x="80" y="120" width="100" height="40" rx="6"/>
<rect x="200" y="120" width="230" height="40" rx="6"/>
<rect x="450" y="120" width="186" height="40" rx="6"/>
<rect x="300" y="210" width="160" height="44" rx="6"/>
<rect x="476" y="210" width="160" height="44" rx="6"/>
<rect x="300" y="290" width="336" height="36" rx="6"/>
<path d="M60 140 L76 140 M70 135 L76 140 L70 145"/>
<path d="M180 140 L196 140 M190 135 L196 140 L190 145"/>
<path d="M430 140 L446 140 M440 135 L446 140 L440 145"/>
<path d="M500 160 L400 206 M392 202 L400 206 L394 199"/>
<path d="M556 160 L556 206 M551 200 L556 206 L561 200"/>
<path d="M380 254 L380 286 M375 280 L380 286 L385 280"/>
<path d="M556 254 L556 286 M551 280 L556 286 L561 280"/>
</g>
<g text-anchor="middle">
<text x="32" y="145">u</text>
<text x="130" y="145">t = Z·u²</text>
<text x="315" y="145">x1 = −(B/A)·(1 + 1/(t² + t))</text>
<text x="543" y="145">is g(x1) a square?</text>
<text x="380" y="228">x = x1</text><text x="380" y="245">y = √g(x1)</text>
<text x="556" y="228">x = x2 = t·x1</text><text x="556" y="245">y = √g(x2)</text>
<text x="468" y="313">flip y if needed so that sgn0(y) = sgn0(u)</text>
</g>
<text x="430" y="186">yes</text><text x="564" y="186">no</text>
</svg>
<figcaption>Figure 12.6. Hashing to a curve as RFC 9380 does it. Top: the message becomes two field elements, each is mapped to a point, and the sum is moved into the prime-order subgroup. Bottom: the simplified SWU map. Because g(x2) = Z³u⁶·g(x1) and Z is not a square, one of the two candidates always works, so the map runs the same steps for every input.</figcaption>
</figure>

### By hand

On $y^2 = x^3 + x + 7$ over $\mathbb{F}_{103}$ (92 points) the RFC's procedure picks
$Z = 3$. Map $u = 5$:

- $t = Zu^2 = 3 \cdot 25 = 75$, and $t^2 + t = 5625 + 75 = 5700 \equiv 35$. The inverse
  of 35 is 53 ($35 \cdot 53 = 1855 = 18 \cdot 103 + 1$), so $x_1 = -7 \cdot (1 + 53) =
  -378 \equiv 34$.
- $g(34) = 34^3 + 34 + 7$. Since $34^2 = 1156 \equiv 23$ and $34^3 \equiv 23 \cdot 34 =
  782 \equiv 61$, $g(34) \equiv 61 + 34 + 7 = 102 \equiv -1$. As $103 \equiv 3 \pmod
  4$, $-1$ is not a square: $x_1$ fails.
- $x_2 = tx_1 = 2550 \equiv 78$, and $g(78) = t^3 \cdot (-1)$: $75^2 \equiv 63$, $75^3
  \equiv 63 \cdot 75 = 4725 \equiv 90$, so $g(78) \equiv -90 \equiv 13$.
- $13^{(p+1)/4} = 13^{26} \equiv 61$, and $61^2 = 3721 = 36 \cdot 103 + 13$. Like $u$,
  61 is odd, so $u = 5$ maps to $(78, 61)$: one test, one square root, no loop.

### Code it: hash_to_curve following RFC 9380

RFC 9380 has three layers. **hash_to_field** stretches the message with
**expand_message_xmd** (SHA-256 run in a chain under a domain separation tag) and
reduces chunks of $L = \lceil (\lceil \log_2 p \rceil + 128)/8 \rceil$ bytes modulo
$p$; the extra 128 bits remove the modulo bias of Chapter 16. **map_to_curve** is the
simplified SWU map. **hash_to_curve** hashes to *two* field elements, maps both, adds
the points and clears the cofactor. One map's image covers only part of the curve, so
a single map gives a visibly nonuniform point; the sum of two is, in the technical
sense, indifferentiable from a random oracle to the curve (Brier and others, 2010).
The listing follows the RFC's names and checks its expander against the RFC's first
test vector.

```python
# Uses add() and mul() from the listings above, and p, a, b from the try-and-increment listing.
h_eff = 4                                      # the cofactor: 92 = 4 * 23

def is_square(v):
    return pow(v % p, (p - 1) // 2, p) != p - 1        # 0 counts as a square

def sqrt(v):
    return pow(v % p, (p + 1) // 4, p)                 # valid because p = 3 mod 4

def find_z():                                          # RFC 9380, appendix H.2
    g = lambda x: (x**3 + a * x + b) % p
    ctr = 1
    while True:
        for z in (ctr % p, -ctr % p):
            if is_square(z) or z == p - 1:
                continue
            if any(g(x) == z for x in range(p)):       # g(x) - Z has a root: reducible
                continue
            if is_square(g(b * pow(z * a, -1, p))):
                return z
        ctr += 1

Z = find_z()

def map_to_curve(u):                                   # simplified SWU, RFC 9380 section 6.6.2
    tv1 = (Z * Z * u**4 + Z * u * u) % p
    tv1 = pow(tv1, -1, p) if tv1 else 0                # inv0: the inverse, or 0 for 0
    x1 = -b * pow(a, -1, p) * (1 + tv1) % p
    if tv1 == 0:
        x1 = b * pow(Z * a, -1, p) % p
    gx1 = (x1**3 + a * x1 + b) % p
    x2 = Z * u * u * x1 % p
    gx2 = (x2**3 + a * x2 + b) % p
    x, y = (x1, sqrt(gx1)) if is_square(gx1) else (x2, sqrt(gx2))
    if u % 2 != y % 2:                                 # sgn0(u) != sgn0(y)
        y = -y % p
    return (x, y)

def expand_message_xmd(msg, dst, n):                   # RFC 9380 section 5.3.1, with SHA-256
    H = lambda data: hashlib.sha256(data).digest()
    dst_prime = dst + bytes([len(dst)])
    b0 = H(bytes(64) + msg + n.to_bytes(2, "big") + b"\x00" + dst_prime)
    bi = H(b0 + b"\x01" + dst_prime)
    out = bi
    for i in range(2, -(-n // 32) + 1):
        bi = H(bytes(x ^ y for x, y in zip(b0, bi)) + bytes([i]) + dst_prime)
        out += bi
    return out[:n]

def hash_to_field(msg, dst, count):
    L = (p.bit_length() + 128 + 7) // 8                # 17 bytes here; 48 for P-256
    data = expand_message_xmd(msg, dst, count * L)
    return [int.from_bytes(data[i * L:(i + 1) * L], "big") % p for i in range(count)]

def hash_to_curve(msg, dst):
    u0, u1 = hash_to_field(msg, dst, 2)
    return mul(h_eff, add(map_to_curve(u0), map_to_curve(u1)))

print(expand_message_xmd(b"", b"QUUX-V01-CS02-with-expander-SHA256-128", 32).hex())
print(Z, map_to_curve(5), len({map_to_curve(u) for u in range(p)}))
dst = b"ARCADIA-TOY-V01-CS02-with-toy103_XMD:SHA-256_SSWU_RO_"
Pm = hash_to_curve(b"Arcadia", dst)
print(Pm, mul(23, Pm))
```

It prints:

```text
68a985b87eb6b46952128911f2a4412bbc302a9d759667f87f7a21d803f07235
3 (78, 61) 38
(63, 41) None
```

The first line is the RFC's test vector for expand_message_xmd (appendix K.1, the
empty message). The procedure of appendix H.2 picks $Z = 3$, and $u = 5$ maps to
$(78, 61)$, as by hand. The map has only 38 different outputs for 103 inputs, on a
curve of 92 points: the nonuniformity that the sum of two maps repairs. The string
`Arcadia` hashes to $(63, 41)$, and $23 \cdot (63, 41) = \mathcal{O}$, so the point
lies in the subgroup of order 23. (Python's `pow` and `if` are not constant time; what
matters is that the algorithm has no data-dependent loop, so careful code can be.)

For P-256 the RFC's suite P256_XMD:SHA-256_SSWU_RO_ uses this map with $Z = -10$, $L
= 48$ and cofactor 1. Curves with $A = 0$, such as secp256k1 and BLS12-381, map to a
related curve with $A \ne 0$ and carry the point across by an **isogeny**, a rational
map between curves that preserves the group law (Riad Wahby and Dan Boneh, 2019).
Curve25519 uses a different map, Elligator 2. WPA3's **hash-to-element** computes
SAE's password element with the simplified SWU map instead of a loop.

## 12.12 Signatures on a curve

*Level: intermediate.*

Software updates, certificates, SSH host keys and Bitcoin transactions carry ECDSA or
EdDSA signatures. Here is their arithmetic, checked by hand. How they fail in practice is *Cryptanalysis*
[chapter 14](../cryptanalysis/14-Attacks-on-Signatures-and-Nonces.md); how to write a
signer that cannot get its nonces wrong is *Cryptographic engineering*
[chapter 6](../engineering/06-Big-Numbers-and-Public-Key-Code.md). Throughout, $G$ has
prime order $n$, the private key is $d$, the public key is $Q = dG$, and $h$ is the
message hash as an integer.

### ECDSA

Scott Vanstone proposed ECDSA in 1992, adapting NIST's proposed Digital Signature
Algorithm; it became ANSI X9.62 in 1999, part of FIPS 186-2 in 2000, and is now in
FIPS 186-5 (2023). To sign:

1. pick a secret nonce $k$, uniformly in $[1, n - 1]$, and compute $R = kG$;
2. set $r = x(R) \bmod n$ (restart if $r = 0$);
3. set $s = k^{-1}(h + rd) \bmod n$ (restart if $s = 0$).

The signature is $(r, s)$. To verify: check $0 < r, s < n$, compute $w = s^{-1}$,
$u_1 = hw$, $u_2 = rw$ modulo $n$ and $X = u_1G + u_2Q$, and accept if $X \ne
\mathcal{O}$ and $x(X) \bmod n = r$. It works because

$$u_1G + u_2Q = (u_1 + u_2d)G = (h + rd)\,w\,G = (h + rd) \cdot k\,(h + rd)^{-1} G = kG = R,$$

as $w = k(h + rd)^{-1}$: the verifier rebuilds $R$ from public values. The step $x(R)
\bmod n$, which turns a point into a number through a coordinate unrelated to the
group structure, is why ECDSA's security proofs need stronger idealizations than
Schnorr's.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="ECDSA: the signer computes R = kG, r = x(R) mod n and s = k inverse times (h + r d); the verifier computes X = u1 G + u2 Q with u1 = h/s and u2 = r/s and accepts if x(X) mod n = r, which works because X = kG" fill="currentColor" font-size="12">
<g stroke="currentColor" stroke-width="1.3" fill="none">
<rect x="10" y="30" width="270" height="200" rx="8"/>
<rect x="360" y="30" width="270" height="200" rx="8"/>
<path d="M280 130 L354 130 M347 125 L354 130 L347 135"/>
</g>
<g fill="currentColor" fill-opacity=".12">
<rect x="10" y="250" width="620" height="40" rx="8"/>
</g>
<text x="145" y="22" text-anchor="middle" font-size="13">signer: private key d</text>
<text x="495" y="22" text-anchor="middle" font-size="13">verifier: public key Q = dG</text>
<g>
<text x="26" y="62">h = hash of the message</text>
<text x="26" y="90">k = fresh secret nonce, 1 ≤ k &lt; n</text>
<text x="26" y="118">R = kG</text>
<text x="26" y="146">r = x(R) mod n</text>
<text x="26" y="174">s = k⁻¹ · (h + r·d) mod n</text>
<text x="26" y="210">send (r, s)</text>
<text x="376" y="62">check 0 &lt; r, s &lt; n</text>
<text x="376" y="90">w = s⁻¹ mod n</text>
<text x="376" y="118">u1 = h·w,  u2 = r·w  (mod n)</text>
<text x="376" y="146">X = u1·G + u2·Q</text>
<text x="376" y="174">accept if x(X) mod n = r</text>
<text x="376" y="210">no secret needed</text>
</g>
<text x="317" y="122" text-anchor="middle">(r, s)</text>
<text x="320" y="274" text-anchor="middle">why it works: u1·G + u2·Q = (h + r·d)·w·G = (h + r·d)·k·(h + r·d)⁻¹·G = k·G = R</text>
</svg>
<figcaption>Figure 12.7. ECDSA. The signer combines the hash, the private key and a one-time nonce in one equation modulo n; the verifier recombines the public values and lands on the same point R. The nonce must be secret, unpredictable and never reused.</figcaption>
</figure>

### ECDSA by hand

Take $y^2 = x^3 + x + 4$ over $\mathbb{F}_{97}$, which has a prime number of points,
89, so $G = (0, 2)$ has order $n = 89$. The private key is $d = 13$, and the code of
§12.3 gives $Q = 13G = (41, 75)$.

**Signing** a message whose hash is $h = 30$, with nonce $k = 11$: $R = 11G = (93, 18)$,
so $r = 93 \bmod 89 = 4$. The inverse of 11 mod 89 is 81 ($11 \cdot 81 = 891 = 10 \cdot 89 +
1$), and $h + rd = 30 + 52 = 82$, so $s = 81 \cdot 82 = 6642 \equiv 56 \pmod{89}$. The
signature is $(4, 56)$.

**Verifying.** $w = 56^{-1} \bmod 89 = 62$ ($56 \cdot 62 = 3472 = 39 \cdot 89 + 1$).
Then $u_1 = 30 \cdot 62 \equiv 80$ and $u_2 = 4 \cdot 62 \equiv 70$. Double-and-add
gives $80G = (32, 42)$ and $70Q = (61, 58)$, and §12.3's formulas add them in
$\mathbb{F}_{97}$:

- $\lambda = (58 - 42)/(61 - 32) = 16/29$. The inverse of 29 mod 97 is 87 ($29 \cdot
  87 = 2523 = 26 \cdot 97 + 1$), so $\lambda = 16 \cdot 87 = 1392 \equiv 34$.
- $x_3 = 34^2 - 32 - 61 = 1063 \equiv 93$ and $y_3 = 34(32 - 93) - 42 = -2116 \equiv 18$.

So $X = (93, 18) = R$ and $93 \bmod 89 = r$: valid. Indeed $u_1 + u_2d = 990 \equiv
11 = k$. Note that $(4, n - 56) = (4, 33)$ verifies too: negating $s$ turns $X$ into
$-R$, with the same $x$. ECDSA signatures are **malleable**, and Bitcoin's relay rules
accept only the "low" $s \le n/2$.

### EdDSA

EdDSA (Daniel Bernstein, Niels Duif, Tanja Lange, Peter Schwabe and Bo-Yin Yang, 2011)
is a Schnorr signature on a twisted Edwards curve. Hashing the 32-byte secret gives the
scalar $a$ (the public key is $A = aB$) and a second secret, the prefix. To sign $M$:

1. $r = H(\text{prefix} \parallel M) \bmod \ell$, and $R = rB$;
2. $k = H(R \parallel A \parallel M) \bmod \ell$;
3. $S = (r + ka) \bmod \ell$. The signature is $(R, S)$, 64 bytes.

To verify, check $SB = R + kA$, which holds since $SB = rB + k(aB)$: no inversion,
no $x(R) \bmod n$. The nonce is a hash, so no random generator is consulted, and $k$
covers the public key, tying each signature to one key. With cofactor 8 a
verifier may instead check the **cofactored** equation $8SB = 8R + 8kA$; the two agree
on honest signatures but not on crafted ones with small-order components, and RFC 8032
allows either (§12.13).

### EdDSA by hand

On the curve $-x^2 + y^2 = 1 + 7x^2y^2$ over $\mathbb{F}_{97}$ of §12.8, $B = (1, 41)$
has order $\ell = 13$, with multiples:

| $j$ | 1 | 2 | 3 | 4 | 5 | 6 |
| --- | --- | --- | --- | --- | --- | --- |
| $jB$ | (1, 41) | (84, 39) | (86, 81) | (72, 90) | (71, 74) | (45, 3) |
| $(13 - j)B$ | (96, 41) | (13, 39) | (11, 81) | (25, 90) | (26, 74) | (52, 3) |

The bottom row negates $x$, since $(13 - j)B = -jB$.

Let the secret scalar be $a = 6$, so $A = 6B = (45, 3)$. Suppose the nonce hash gives
$r = 9$, so $R = 9B = (25, 90)$, and the challenge hash gives $k = 7$. Then $S = 9 + 7
\cdot 6 = 51 \equiv 12 \pmod{13}$. The signature is $(R, S) = ((25, 90), 12)$.

The verifier finds $SB = 12B = (96, 41)$, and $7A = (86, 81)$ by double-and-add (it
is $42B = 3B$, though the verifier cannot know that). Then one Edwards addition,
$(25, 90) + (86, 81)$, with $a = -1$ and $d = 7$:

- $x_1y_2 + y_1x_2 = 25 \cdot 81 + 90 \cdot 86 = 9765 \equiv 65$;
- $y_1y_2 + x_1x_2 = 90 \cdot 81 + 25 \cdot 86 = 9440 \equiv 31$;
- $t = dx_1x_2y_1y_2$: $25 \cdot 86 \equiv 16$ and $90 \cdot 81 \equiv 15$, so $t = 7
  \cdot 16 \cdot 15 = 1680 \equiv 31$;
- $x_3 = 65/(1 + 31) = 65/32$ and $y_3 = 31/(1 - 31) = 31/67$.

Since $96 \cdot 32 = 3072 = 31 \cdot 97 + 65$ and $41 \cdot 67 = 2747 = 28 \cdot 97 +
31$, the sum is $(96, 41) = SB$: the signature verifies.

### Code it: Ed25519 against RFC 8032

The same steps on the real curve, with SHA-512, the clamping of §12.7 and the
encoding of §12.9, on RFC 8032's first test key (the empty message).

```python
# Uses ed_add(), ed_mul(), recover_x(), B, ell and P25519 from §12.8; resets q and d to Ed25519's.
import hashlib
q = P25519
d = -121665 * pow(121666, -1, q) % q

def encode(P1):
    return (P1[1] | (P1[0] & 1) << 255).to_bytes(32, "little")

def H(*parts):
    return int.from_bytes(hashlib.sha512(b"".join(parts)).digest(), "little")

def ed25519_sign(secret, msg):
    h = hashlib.sha512(secret).digest()
    a_ = int.from_bytes(h[:32], "little") & ((1 << 254) - 8) | (1 << 254)   # clamp
    A = encode(ed_mul(a_, B))
    r = H(h[32:], msg) % ell                     # the nonce: a hash, not a random number
    R = encode(ed_mul(r, B))
    S = (r + H(R, A, msg) * a_) % ell
    return A, R + S.to_bytes(32, "little")

A, sig = ed25519_sign(bytes.fromhex("9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60"), b"")
print(A.hex())
print(sig.hex()[:64])
print(sig.hex()[64:])
```

It prints:

```text
d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a
e5564300c360ac729086e2cc806e828a84877f1eb8e5d974d873e06522490155
5fb8821590a33bacc61e39701cf9b46bd25bf5f0595bbe24655141438e7a100b
```

The public key and both halves of the signature are the values printed in RFC 8032,
§7.1, TEST 1.

### One nonce, two signatures

Everything rests on $k$. Suppose an ECDSA signer uses the same $k$ for two messages
with hashes $h_1$ and $h_2$. Then $R$ and $r$ are the same, and

$$s_1 - s_2 = k^{-1}(h_1 + rd) - k^{-1}(h_2 + rd) = k^{-1}(h_1 - h_2),$$

so anyone holding both signatures computes

$$k = \frac{h_1 - h_2}{s_1 - s_2} \bmod n, \qquad d = \frac{s_1k - h_1}{r} \bmod n.$$

Two lines, no search. On the small curve, a second hash $h_2 = 50$ signed with the
same $k = 11$ gives $s_2 = 81 \cdot (50 + 52) \equiv 74$. From $(4, 56)$ and $(4,
74)$: $s_1 - s_2 = -18 \equiv 71$, whose inverse is 84 ($71 \cdot 84 = 5964 = 67
\cdot 89 + 1$), so $k = -20 \cdot 84 \equiv 69 \cdot 84 = 5796 \equiv 11$, and $d =
(56 \cdot 11 - 30)/4 = 586/4 \equiv 52/4 = 13$. Sony's PlayStation 3 signer used one
constant $k$, and in December 2010 the fail0verflow group presented its key this way
([Cryptanalysis §14.2 to §14.5](../cryptanalysis/14-Attacks-on-Signatures-and-Nonces.md));
with many signatures, even a few known bits of each nonce suffice, through a lattice
(§14.6 there). EdDSA falls the same way if two signatures share $r$ but not $k$:
$S_1 - S_2 = (k_1 - k_2)a$. Deterministic nonces prevent that, but not **fault
attacks**, where a glitch corrupts one signature but not its nonce (§14.8 there).

```python
# Uses add() and mul() from the listings above, on the small curve of the hand examples.
def ecdsa_sign(sk, h, k):
    r = mul(k, G)[0] % n
    return r, pow(k, -1, n) * (h + r * sk) % n

def ecdsa_verify(Q, h, sig):
    r, s = sig
    if not (0 < r < n and 0 < s < n):
        return False
    w = pow(s, -1, n)
    X = add(mul(h * w % n, G), mul(r * w % n, Q))
    return X is not None and X[0] % n == r

def recover(h1, sig1, h2, sig2):                 # two signatures, one nonce
    (r, s1), (_, s2) = sig1, sig2
    k = (h1 - h2) * pow(s1 - s2, -1, n) % n
    return (s1 * k - h1) * pow(r, -1, n) % n

p, a, b, n, G = 97, 1, 4, 89, (0, 2)
sig1, sig2 = ecdsa_sign(13, 30, 11), ecdsa_sign(13, 50, 11)
print(sig1, sig2, ecdsa_verify(mul(13, G), 30, sig1), ecdsa_verify(mul(13, G), 30, (4, 33)),
      recover(30, sig1, 50, sig2))
```

It prints:

```text
(4, 56) (4, 74) True True 13
```

The two signatures of the hand example, the first one valid, its malleated twin $(4,
33)$ valid too, and the private key 13 recovered. At full size the code is the same with
bigger numbers; *Cryptanalysis* §14.3 runs it on secp256k1, Bitcoin's curve. Nothing here is a weakness of the
curve: every signature of this family (DSA, ECDSA, Schnorr, EdDSA) is a linear
equation in the key and the nonce, and a second equation with the same nonce solves
it.

### Signing for a city 22 light-minutes away

Arcadia City's habitats run firmware signed on Earth, a 6- to 44-minute round trip
away; a signature needs none, since the habitat checks each update against a key it
already holds. The signer should use EdDSA or deterministic ECDSA, because one
repeated nonce (after a virtual machine snapshot restored the random generator, say)
gives the key to anyone holding two public updates. And the habitat should verify
with exactly the signer's rules (canonical encodings, $S < \ell$, the same equation),
or an attacker will find the gap.

## 12.13 Going deeper

*Level: expert.*

- **Removing the cofactor.** The cofactor of Montgomery and Edwards curves keeps
  causing trouble, from verification disagreements to protocols that assumed every
  element lay in the prime-order subgroup. Mike Hamburg's **Decaf** (2015) and its
  successor **Ristretto** build a prime-order group out of such a curve, as a quotient
  by the small subgroup, with exactly one encoding per element; RFC 9496 (2023)
  specifies ristretto255 and decaf448.
- **Which signatures are valid.** Ed25519 libraries differ on the cofactored or
  cofactorless equation, non-canonical encodings and small-order keys; Konstantinos
  Chalkias, François Garillot and Valeria Nikolaenko (2020) found wide disagreement.
  For a blockchain, where all nodes must agree, that is a fork waiting to happen;
  Zcash fixed its rules precisely in ZIP 215 (2020).
- **Hiding that a string is a point.** Elligator (Daniel Bernstein, Mike Hamburg, Anna
  Krasnova and Tanja Lange, 2013) can be inverted on about half of the points, so a
  public key can travel as bytes indistinguishable from random; censorship-resistant
  transports use it.
- **Complete Weierstrass formulas.** Renes, Costello and Batina (2016) start from the
  addition laws that Wieb Bosma and Hendrik Lenstra classified in 1995; the
  exceptional pairs of the one they use need a point of order 2, which a curve of odd
  order lacks.
- **Maps between curves.** Isogenies, like the one in §12.11, are also the basis of a
  family of post-quantum schemes: *Post-quantum cryptography*
  [chapter 16](../post-quantum/16-Isogenies.md), including the 2022 break of SIKE.

## Check yourself

??? question "1. Derive $x_3 = \lambda^2 - x_1 - x_2$ in one sentence."

    Substituting the line into the curve gives a monic cubic in $x$ whose
    $x^2$-coefficient is $-\lambda^2$, and the sum of its three roots $x_1 + x_2 +
    x_3$ is minus that coefficient.

??? question "2. Why is $4a^3 + 27b^2 \ne 0$ required?"

    It says the cubic has no repeated root, so the curve is smooth; otherwise some
    point has no well-defined tangent and the group law fails (the "curve" is then
    singular, and its discrete logarithm reduces to an easy problem in a field).

??? question "3. The curve of §12.5 has 100 points and no point of order 100. What does that tell you about its group?"

    It is not cyclic; with 100 = 2 · 50 and point orders up to 50, it is $\mathbb{Z}/2
    \times \mathbb{Z}/50$.

??? question "4. Why does X25519 clear the three lowest bits of the scalar?"

    The curve has cofactor 8; a multiple of 8 kills any component of order dividing
    8, so small-subgroup points reveal nothing (Chapter 7).

??? question "5. In the ladder of §12.7, $6P$ and $7P$ came out with the same $x$-coordinate. Why, and why does X25519 not care?"

    $P$ has order 13, so $7P = -6P$, and a point and its negative share their $x$.
    Diffie-Hellman needs only $x(kP)$: both parties end with the same $x$ whichever
    sign their computation would have given.

??? question "6. What makes the twisted Edwards formulas 'complete', and what goes wrong if $d$ is a square?"

    When $a$ is a square and $d$ is not, the denominators $1 \pm dx_1x_2y_1y_2$ are
    never zero on the curve, so one formula serves every pair, doubling and the
    identity included. With $d$ square some pairs divide by zero (832 of them on the
    small curve of §12.8 with $d = 4$).

??? question "7. Try-and-increment needs only two tries on average. Why is it still unsafe for hashing a password to a point?"

    The number of tries depends on the password, and timing reveals it. The attacker
    computes the count for every guess offline and discards those that do not match;
    a few dozen observations leave one password. That is Dragonblood.

??? question "8. Which number in the curve equation does the invalid-curve attack change, and why does the server not notice?"

    $b$. The addition and doubling formulas use only $a$ and the coordinates, so a
    server that does not check the curve equation computes on the attacker's curve.

??? question "9. In the simplified SWU map, $x_2 = tx_1$ with $t = Zu^2$, and $g(x_2) = t^3g(x_1)$. Show that if $g(x_1)$ is not a square, $g(x_2)$ is."

    $Z$ is a non-square and $u^6$ a nonzero square, so $t^3 = Z^3u^6 = Z \cdot (Zu^3)^2$
    is a non-square. If $g(x_1)$ is also a non-square, $g(x_2)$ is a product of two
    non-squares, and by Euler's criterion
    $(t^3g(x_1))^{(p-1)/2} = (-1)(-1) = 1$, so it is a square.

??? question "10. An ECDSA signer on the curve of §12.12 ($n = 89$) signs the hashes 30 and 31 and outputs $(4, 56)$ and $(4, 48)$. Find the nonce and the private key."

    The equal $r$ gives away a shared nonce. $k = (h_1 - h_2)/(s_1 - s_2) = -1/8 \bmod
    89$; since $8 \cdot 78 = 624 = 7 \cdot 89 + 1$, $k = -78 \equiv 11$. Then $d =
    (s_1k - h_1)/r = (616 - 30)/4 = 586/4$, and $586 \equiv 52$, so $d = 13$.

## What you learned

- An elliptic curve $y^2 = x^3 + ax + b$ with $4a^3 + 27b^2 \ne 0$, plus the point at
  infinity, is an abelian group under the chord-and-tangent law.
- One slope, $x_3 = \lambda^2 - x_1 - x_2$ and $y_3 = \lambda(x_1 - x_3) - y_1$: the
  whole law. Associativity is true but not obvious; it follows from Cayley-Bacharach or
  the Picard group, or from a computer check.
- Scalar multiplication is double-and-add; the ECDLP is the discrete logarithm in this
  group. The group is $\mathbb{Z}/n_1 \times \mathbb{Z}/n_2$, usually cyclic.
- Jacobian coordinates remove inversions. Montgomery curves give the uniform, $x$-only
  ladder of X25519, through differential addition; every $x$ is on the curve or its
  twist, so the twist must be secure too. Twisted Edwards curves are bent circles
  whose formulas, when $d$ is not a square, are complete: nothing to branch on.
- Points compress to $x$ and one bit; decompression must check the square root.
- Unchecked points let an attacker move the computation to a weak curve; validate
  points, use $x$-only ladders on twist-secure curves, and never accept curve
  parameters from outside.
- Hashing to a curve needs a point of unknown logarithm, in constant time:
  try-and-increment leaks; the simplified SWU map uses $g(tx_1) = t^3g(x_1)$ with $t$ a
  non-square, so one of two candidates always works.
- ECDSA's $s = k^{-1}(h + rd)$ and EdDSA's $S = r + ka$ are linear in key and nonce:
  one nonce used twice gives the key in two lines.

**Next:** [Chapter 13](13-Counting-Points-and-Pairings.md), how many points a curve has,
how curves are chosen, and pairings.

## Further reading

- Joseph Silverman and John Tate, *Rational Points on Elliptic Curves*, 2nd edition
  (Springer, 2015): the gentlest real introduction.
- Lawrence Washington, *Elliptic Curves: Number Theory and Cryptography*, 2nd edition
  (CRC Press, 2008), chapters 2 and 3, with a full proof of associativity.
- Neal Koblitz, "Elliptic Curve Cryptosystems", *Mathematics of Computation* 48 (1987);
  Victor Miller, "Use of Elliptic Curves in Cryptography", CRYPTO 1985.
- Peter Montgomery, "Speeding the Pollard and Elliptic Curve Methods of Factorization",
  *Mathematics of Computation* 48 (1987).
- Daniel Bernstein, "Curve25519: New Diffie-Hellman Speed Records", PKC 2006.
- Harold Edwards, "A Normal Form for Elliptic Curves", *Bulletin of the AMS* 44 (2007);
  Daniel Bernstein and Tanja Lange, "Faster Addition and Doubling on Elliptic Curves",
  ASIACRYPT 2007.
- Craig Costello and Benjamin Smith, "Montgomery Curves and Their Arithmetic", *Journal
  of Cryptographic Engineering* 8 (2018).
- RFC 7748, Elliptic Curves for Security (2016); RFC 8032, Edwards-Curve Digital
  Signature Algorithm (2017).
- Daniel Bernstein and Tanja Lange, Explicit-Formulas Database,
  hyperelliptic.org/EFD.
- Tibor Jager, Jörg Schwenk and Juraj Somorovsky, "Practical Invalid Curve Attacks on
  TLS-ECDH", ESORICS 2015.
- Bernstein, Birkner, Joye, Lange and Peters, "Twisted Edwards Curves", AFRICACRYPT
  2008; Renes, Costello and Batina, "Complete Addition Formulas for Prime Order
  Elliptic Curves", EUROCRYPT 2016; Izu and Takagi, "Exceptional Procedure Attack on
  Elliptic Curve Cryptosystems", PKC 2003.
- Shallue and van de Woestijne, "Construction of Rational Points on Elliptic Curves
  over Finite Fields", ANTS 2006; Brier, Coron, Icart, Madore, Randriam and Tibouchi,
  "Efficient Indifferentiable Hashing into Ordinary Elliptic Curves", CRYPTO 2010;
  Wahby and Boneh, "Fast and Simple Constant-Time Hashing to the BLS12-381 Elliptic
  Curve", CHES 2019.
- RFC 9380, Hashing to Elliptic Curves (2023).
- Vanhoef and Ronen, "Dragonblood: Analyzing the Dragonfly Handshake of WPA3 and
  EAP-pwd", IEEE S&P 2020 (published 2019).
- Johnson, Menezes and Vanstone, "The Elliptic Curve Digital Signature Algorithm
  (ECDSA)", *International Journal of Information Security* 1 (2001); Bernstein, Duif,
  Lange, Schwabe and Yang, "High-Speed High-Security Signatures", CHES 2011.
- FIPS 186-5, Digital Signature Standard (2023); RFC 6979, Deterministic Usage of DSA
  and ECDSA (2013).
- Hamburg, "Decaf: Eliminating Cofactors through Point Compression", CRYPTO 2015;
  RFC 9496 (2023); Bernstein, Hamburg, Krasnova and Lange, "Elligator", ACM CCS 2013;
  Chalkias, Garillot and Nikolaenko, "Taming the Many EdDSAs", SSR 2020.
- In *The cryptography book*: [Chapter 15](../../book/15-Elliptic-Curves.md).
