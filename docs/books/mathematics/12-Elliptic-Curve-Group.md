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
and twisted Edwards curves with the complete formulas of Ed25519. It checks both
against the official test vectors, and ends with the attack on code that forgets
to check that a point is on the curve.*

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
    - Montgomery curves and the Montgomery ladder, with an X25519
      implementation that matches RFC 7748;
    - twisted Edwards curves and complete addition, with the Ed25519 base
      point;
    - point compression, and the invalid-curve attack.

    **You need:** [Chapter 4](04-Powers-and-Primitive-Roots.md) (square and
    multiply, the Montgomery ladder for powers),
    [Chapter 5](05-Square-Roots-Mod-p.md) (square roots mod $p$) and
    [Chapter 7](07-Groups.md) (groups, orders, cofactors).

    **Levels:** §12.1 to §12.4 are for beginners, §12.5 to §12.8 are
    intermediate, §12.9 and §12.10 are expert.

## 12.1 The problem

*Level: beginner.*

Every message between Arcadia City's habitats starts with a Diffie-Hellman key
exchange. In Chapter 4 it ran in the units modulo a prime. To resist the
index-calculus attacks of *Cryptanalysis* chapter 12, that prime has to be at least
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
<path class="acc" fill="none" stroke="currentColor" stroke-width="2.2" d="M558.0 17.6 L552.1 21.1 L546.3 24.6 L540.5 28.1 L534.8 31.4 L529.1 34.8 L523.4 38.1 L517.7 41.3 L512.1 44.5 L506.6 47.6 L501.0 50.7 L495.5 53.7 L490.1 56.7 L484.7 59.6 L479.3 62.5 L473.9 65.3 L468.6 68.0 L463.3 70.8 L458.1 73.4 L452.9 76.0 L447.7 78.6 L442.6 81.1 L437.5 83.6 L432.5 86.0 L427.4 88.4 L422.5 90.7 L417.5 92.9 L412.6 95.1 L407.7 97.3 L402.9 99.4 L398.1 101.5 L393.4 103.5 L388.6 105.4 L383.9 107.3 L379.3 109.1 L374.7 110.9 L370.1 112.7 L365.6 114.3 L361.1 115.9 L356.6 117.5 L352.2 119.0 L347.8 120.4 L343.4 121.8 L339.1 123.1 L334.8 124.3 L330.6 125.4 L326.4 126.5 L322.2 127.5 L318.1 128.4 L314.0 129.2 L309.9 130.0 L305.9 130.6 L301.9 131.2 L297.9 131.7 L294.0 132.1 L290.1 132.3 L286.3 132.6 L282.5 132.7 L278.7 132.7 L275.0 132.7 L271.3 132.6 L267.6 132.5 L264.0 132.3 L260.4 132.1 L256.9 131.8 L253.4 131.5 L249.9 131.2 L246.5 130.9 L243.1 130.6 L239.7 130.2 L236.4 129.8 L233.1 129.5 L229.8 129.1 L226.6 128.7 L223.5 128.4 L220.3 128.0 L217.2 127.7 L214.1 127.4 L211.1 127.0 L208.1 126.7 L205.1 126.5 L202.2 126.2 L199.3 125.9 L196.5 125.7 L193.7 125.5 L190.9 125.2 L188.2 125.1 L185.5 124.9 L182.8 124.7 L180.2 124.6 L177.6 124.5 L175.0 124.4 L172.5 124.3 L170.0 124.2 L167.6 124.2 L165.2 124.1 L162.8 124.1 L160.5 124.1 L158.2 124.1 L155.9 124.2 L153.7 124.2 L151.5 124.3 L149.4 124.4 L147.2 124.5 L145.2 124.6 L143.1 124.8 L141.1 124.9 L139.2 125.1 L137.2 125.3 L135.3 125.5 L133.5 125.7 L131.7 126.0 L129.9 126.2 L128.1 126.5 L126.4 126.8 L124.7 127.1 L123.1 127.4 L121.5 127.7 L119.9 128.0 L118.4 128.4 L116.9 128.7 L115.5 129.1 L114.1 129.5 L112.7 129.9 L111.3 130.3 L110.0 130.7 L108.8 131.1 L107.5 131.6 L106.3 132.0 L105.2 132.5 L104.1 132.9 L103.0 133.4 L101.9 133.9 L100.9 134.4 L100.0 134.9 L99.0 135.4 L98.1 135.9 L97.3 136.5 L96.4 137.0 L95.6 137.6 L94.9 138.1 L94.2 138.7 L93.5 139.2 L92.8 139.8 L92.2 140.4 L91.7 140.9 L91.1 141.5 L90.6 142.1 L90.2 142.7 L89.8 143.3 L89.4 143.9 L89.0 144.5 L88.7 145.1 L88.4 145.7 L88.2 146.3 L88.0 146.9 L87.8 147.5 L87.7 148.2 L87.6 148.8 L87.5 149.4 L87.5 150.0 L87.5 150.6 L87.6 151.2 L87.7 151.8 L87.8 152.5 L88.0 153.1 L88.2 153.7 L88.4 154.3 L88.7 154.9 L89.0 155.5 L89.4 156.1 L89.8 156.7 L90.2 157.3 L90.6 157.9 L91.1 158.5 L91.7 159.1 L92.2 159.6 L92.8 160.2 L93.5 160.8 L94.2 161.3 L94.9 161.9 L95.6 162.4 L96.4 163.0 L97.3 163.5 L98.1 164.1 L99.0 164.6 L100.0 165.1 L100.9 165.6 L101.9 166.1 L103.0 166.6 L104.1 167.1 L105.2 167.5 L106.3 168.0 L107.5 168.4 L108.8 168.9 L110.0 169.3 L111.3 169.7 L112.7 170.1 L114.1 170.5 L115.5 170.9 L116.9 171.3 L118.4 171.6 L119.9 172.0 L121.5 172.3 L123.1 172.6 L124.7 172.9 L126.4 173.2 L128.1 173.5 L129.9 173.8 L131.7 174.0 L133.5 174.3 L135.3 174.5 L137.2 174.7 L139.2 174.9 L141.1 175.1 L143.1 175.2 L145.2 175.4 L147.2 175.5 L149.4 175.6 L151.5 175.7 L153.7 175.8 L155.9 175.8 L158.2 175.9 L160.5 175.9 L162.8 175.9 L165.2 175.9 L167.6 175.8 L170.0 175.8 L172.5 175.7 L175.0 175.6 L177.6 175.5 L180.2 175.4 L182.8 175.3 L185.5 175.1 L188.2 174.9 L190.9 174.8 L193.7 174.5 L196.5 174.3 L199.3 174.1 L202.2 173.8 L205.1 173.5 L208.1 173.3 L211.1 173.0 L214.1 172.6 L217.2 172.3 L220.3 172.0 L223.5 171.6 L226.6 171.3 L229.8 170.9 L233.1 170.5 L236.4 170.2 L239.7 169.8 L243.1 169.4 L246.5 169.1 L249.9 168.8 L253.4 168.5 L256.9 168.2 L260.4 167.9 L264.0 167.7 L267.6 167.5 L271.3 167.4 L275.0 167.3 L278.7 167.3 L282.5 167.3 L286.3 167.4 L290.1 167.7 L294.0 167.9 L297.9 168.3 L301.9 168.8 L305.9 169.4 L309.9 170.0 L314.0 170.8 L318.1 171.6 L322.2 172.5 L326.4 173.5 L330.6 174.6 L334.8 175.7 L339.1 176.9 L343.4 178.2 L347.8 179.6 L352.2 181.0 L356.6 182.5 L361.1 184.1 L365.6 185.7 L370.1 187.3 L374.7 189.1 L379.3 190.9 L383.9 192.7 L388.6 194.6 L393.4 196.5 L398.1 198.5 L402.9 200.6 L407.7 202.7 L412.6 204.9 L417.5 207.1 L422.5 209.3 L427.4 211.6 L432.5 214.0 L437.5 216.4 L442.6 218.9 L447.7 221.4 L452.9 224.0 L458.1 226.6 L463.3 229.2 L468.6 232.0 L473.9 234.7 L479.3 237.5 L484.7 240.4 L490.1 243.3 L495.5 246.3 L501.0 249.3 L506.6 252.4 L512.1 255.5 L517.7 258.7 L523.4 261.9 L529.1 265.2 L534.8 268.6 L540.5 271.9 L546.3 275.4 L552.1 278.9 L558.0 282.4"/>
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
<figcaption>Figure 12.2. Three forms of elliptic curves. Every curve has a Weierstrass form; those with a point of order 4 also have Montgomery and twisted Edwards forms, which give faster and safer formulas. Curve25519 and Edwards25519 are one group in two coordinate systems.</figcaption>
</figure>

## 12.9 Point compression

*Level: expert.*

A point $(x, y)$ is determined by $x$ and the sign of $y$, since $y = \pm\sqrt{x^3 + ax +
b}$. So it can be sent as $x$ plus one bit, halving its size. To decompress, compute
the square root (Chapter 5) and pick the root with the right parity; if the right-hand
side is not a square, the input is not a valid point and must be rejected.

```python
# Point compression on the small curve: send x and one bit of y.  p = 97 is 1 mod 4,
# so we find square roots by search here; Chapter 5 gives Tonelli-Shanks.
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
<figcaption>Figure 12.3. The invalid-curve attack. Same a, different b: each fake curve has a point of small order, and the server's answer to it reveals the secret modulo that order.</figcaption>
</figure>

**In the wild.** Tibor Jager, Jörg Schwenk and Juraj Somorovsky (2015) found TLS
libraries that accepted invalid points in static ECDH, and extracted server keys. In
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
  the twist, and Curve25519 was chosen so that its twist also has a large prime-order
  subgroup (twist security, Chapter 13).
- **Never accept curve parameters from the other side**; use named curves only.

## Check yourself

??? question "1. Is $(1, 2)$ on $y^2 = x^3 + 2x + 1$ over $\mathbb{F}_5$?"

    $1 + 2 + 1 = 4 = 2^2$. Yes.

??? question "2. On the curve of §12.3, what is $-(85, 71)$?"

    $(85, -71 \bmod 97) = (85, 26)$.

??? question "3. Derive $x_3 = \lambda^2 - x_1 - x_2$ in one sentence."

    Substituting the line into the curve gives a monic cubic in $x$ whose
    $x^2$-coefficient is $-\lambda^2$, and the sum of its three roots $x_1 + x_2 +
    x_3$ is minus that coefficient.

??? question "4. Why is $4a^3 + 27b^2 \ne 0$ required?"

    It says the cubic has no repeated root, so the curve is smooth; otherwise some
    point has no well-defined tangent and the group law fails (the "curve" is then
    singular, and its discrete logarithm reduces to an easy problem in a field).

??? question "5. The curve of §12.5 has 100 points and no point of order 100. What does that tell you about its group?"

    It is not cyclic; with 100 = 2 · 50 and point orders up to 50, it is $\mathbb{Z}/2
    \times \mathbb{Z}/50$.

??? question "6. How many field inversions does double-and-add with a 256-bit scalar need in affine coordinates? In Jacobian coordinates?"

    About 256 doublings and 128 additions, each with one inversion: about 384.
    In Jacobian coordinates, one, at the end.

??? question "7. Why does X25519 clear the three lowest bits of the scalar?"

    The curve has cofactor 8; a multiple of 8 kills any component of order dividing
    8, so small-subgroup points reveal nothing (Chapter 7).

??? question "8. What makes the twisted Edwards formulas 'complete'?"

    When $a$ is a square and $d$ is not, the denominators $1 \pm dx_1x_2y_1y_2$ are
    never zero for points on the curve, so one formula works for every pair of
    points, including doubling and the identity.

??? question "9. Why does compressing a point to $x$ and one bit lose nothing?"

    For a given $x$ there are at most two points, $(x, y)$ and $(x, -y)$, and they
    differ in the parity of $y$ (as $p$ is odd, $y$ and $p - y$ have different
    parities, unless $y = 0$).

??? question "10. Which number in the curve equation does the invalid-curve attack change, and why does the server not notice?"

    $b$. The addition and doubling formulas use only $a$ and the coordinates, so a
    server that does not check the curve equation computes on the attacker's curve.

## What you learned

- An elliptic curve $y^2 = x^3 + ax + b$ with $4a^3 + 27b^2 \ne 0$, plus the point at
  infinity, is an abelian group under the chord-and-tangent law.
- One slope, $x_3 = \lambda^2 - x_1 - x_2$ and $y_3 = \lambda(x_1 - x_3) - y_1$: the
  whole law. Associativity is true but not obvious; it follows from Cayley-Bacharach or
  the Picard group, or from a computer check.
- Scalar multiplication is double-and-add; the ECDLP is the discrete logarithm in this
  group. The group is $\mathbb{Z}/n_1 \times \mathbb{Z}/n_2$, usually cyclic.
- Jacobian coordinates remove inversions; Montgomery curves give the uniform, $x$-only
  ladder of X25519; twisted Edwards curves give complete formulas for Ed25519. Our
  X25519 code matches RFC 7748.
- Points compress to $x$ and one bit; decompression must check the square root.
- Unchecked points let an attacker move the computation to a weak curve; validate
  points, use $x$-only ladders on twist-secure curves, and never accept curve
  parameters from outside.

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
- In *The cryptography book*: [Chapter 15](../../book/15-Elliptic-Curves.md).
