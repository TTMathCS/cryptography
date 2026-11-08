# 5. Squares and Square Roots

*Which numbers are perfect squares modulo a prime, and how do you find their
square roots? The question is two thousand years old in its integer form and
two hundred in its modular one, and its answers run through cryptography: they
let an elliptic-curve point be sent in half the space, they gave the first
encryption scheme proved as hard as factoring, and they gave the first
encryption scheme that was randomized by design. This chapter teaches quadratic
residues, Euler's criterion, the Legendre and Jacobi symbols, Gauss's law of
quadratic reciprocity, the Tonelli-Shanks algorithm, and the theorem that taking
square roots modulo $pq$ is exactly as hard as factoring $pq$. You will build
Rabin's and Goldwasser and Micali's cryptosystems, and see one bit leak out of
Diffie-Hellman.*

!!! abstract "In this chapter"
    **You will learn:**

    - quadratic residues and why exactly half the units modulo an odd prime are
      squares;
    - Euler's criterion, and the Legendre symbol with its rules;
    - quadratic reciprocity, with Gauss's lemma and a sketch of a proof;
    - the Jacobi symbol, how to compute it as fast as a gcd, and what it does
      not tell you;
    - square roots modulo a prime: the easy case $p \equiv 3 \pmod 4$ and the
      Tonelli-Shanks algorithm for the rest;
    - why square roots modulo $N = pq$ are as hard as factoring $N$, with proof;
    - Rabin encryption, Goldwasser-Micali encryption, and point compression.

    **You need:** [Chapter 3](03-Modular-Arithmetic.md) (the Chinese remainder
    theorem) and [Chapter 4](04-Powers-and-Primitive-Roots.md) (Fermat, orders,
    primitive roots).

    **Levels:** §5.1 to §5.4 are for beginners, §5.5 to §5.10 are
    intermediate, §5.11 is expert.

## 5.1 The problem

*Level: beginner.*

Every rover and habitat in the Arcadia City network has an identity key on the
elliptic curve P-256, and every status message carries the sender's public key
so that the receiver can check the signature. A public key on this curve is a
point $(x, y)$, two numbers of 256 bits each, 64 bytes in all. The link to the
far side of the Erebus Montes runs over a low-power radio where every byte
counts. Can the key be sent in 33 bytes instead?

Yes, because $y$ is almost determined by $x$. On the curve, $y^2 = x^3 - 3x + b
\pmod p$. Given $x$, compute the right-hand side, and $y$ is one of its two
square roots, $y$ or $p - y$. Send $x$ and one bit saying which root, and the
receiver recovers $y$, *provided it can take square roots modulo a 256-bit
prime*. That is called **point compression**, and it is used in every
certificate and protocol that sends curve points.

This is the friendly side of square roots. There is a hostile side. Modulo a
composite $N = pq$, everyone can square, but taking a square root requires
knowing $p$ and $q$. In 1979 Michael Rabin turned that into the first
public-key encryption scheme whose security was *proved* equivalent to
factoring: breaking it would factor the modulus. RSA, published two years
earlier, has never had such a proof.

And there is a subtle side. Whether a number is a square modulo $p$ can be
decided quickly by anyone, so a number's "squareness" is public information.
That means one bit of information about a secret exponent leaks from any value
$g^x \bmod p$, a fact that shapes how Diffie-Hellman groups are chosen.

All three rest on the mathematics of this chapter.

## 5.2 Quadratic residues

*Level: beginner.*

### By hand

Square every unit modulo 11:

| $x$ | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| $x^2 \bmod 11$ | 1 | 4 | 9 | 5 | 3 | 3 | 5 | 9 | 4 | 1 |

Only five values appear: 1, 3, 4, 5, 9. Each appears twice, from $x$ and $11 -
x$, since $(-x)^2 = x^2$. The other five units, 2, 6, 7, 8, 10, are not squares
modulo 11 at all.

<figure class="mars-fig">
<svg viewBox="0 0 640 210" width="640" role="img" aria-label="Squaring the units mod 11: each pair x and minus x lands on the same square; five squares are hit twice, five non-squares never" fill="currentColor" font-size="14">
<g text-anchor="middle">
<text x="60" y="30">1</text><text x="120" y="30">2</text><text x="180" y="30">3</text><text x="240" y="30">4</text><text x="300" y="30">5</text><text x="360" y="30">6</text><text x="420" y="30">7</text><text x="480" y="30">8</text><text x="540" y="30">9</text><text x="600" y="30">10</text>
<text x="80" y="175" class="acc-fill">1</text><text x="180" y="175" class="acc-fill">3</text><text x="280" y="175" class="acc-fill">4</text><text x="380" y="175" class="acc-fill">5</text><text x="480" y="175" class="acc-fill">9</text>
<text x="330" y="202" font-size="13">non-squares 2, 6, 7, 8, 10: never hit</text>
</g>
<g stroke="currentColor" stroke-width="1.1">
<line x1="60" y1="38" x2="80" y2="160"/><line x1="600" y1="38" x2="80" y2="160"/>
<line x1="120" y1="38" x2="280" y2="160"/><line x1="540" y1="38" x2="280" y2="160"/>
<line x1="180" y1="38" x2="480" y2="160"/><line x1="480" y1="38" x2="480" y2="160"/>
<line x1="240" y1="38" x2="380" y2="160"/><line x1="420" y1="38" x2="380" y2="160"/>
<line x1="300" y1="38" x2="180" y2="160"/><line x1="360" y1="38" x2="180" y2="160"/>
</g>
</svg>
<figcaption>Figure 5.1. Squaring modulo 11. The ten units (top) pair off as x and 11 − x, and each pair lands on one square (bottom). Exactly half the units are squares.</figcaption>
</figure>

A unit $a$ modulo $n$ is a **quadratic residue** if $a \equiv x^2 \pmod n$ for
some $x$, and a **quadratic non-residue** otherwise. ("Quadratic" means
"square", and "residue" is the old word for a remainder.) The number 0 is
usually left out of both classes.

**Theorem.** For an odd prime $p$, exactly half of the $p - 1$ units are
quadratic residues, and each residue has exactly two square roots.

*Proof.* The map $x \mapsto x^2$ sends $x$ and $-x$ to the same place, and $x
\neq -x$ because $2x \not\equiv 0$ for odd $p$. Could more than two values of
$x$ square to the same $a$? Then the polynomial $x^2 - a$ would have more than
two roots in the field $\mathbb{F}_p$, which Lagrange's lemma (Chapter 4)
forbids. So the $p - 1$ units pair off into $(p-1)/2$ pairs $\{x, -x\}$, each
pair giving a different square. $\blacksquare$

Primitive roots give another view. If $g$ is a primitive root, every unit is
$g^k$ for some $k$, and $g^k$ is a square exactly when $k$ is even (if $k = 2j$
then $g^k = (g^j)^2$; and an odd power cannot be a square, since $(g^j)^2 =
g^{2j}$ always has an even exponent mod the even number $p - 1$). The residues
are the even powers of $g$, the non-residues the odd powers. Modulo 11 with $g =
2$: the powers $2^0, 2^2, 2^4, 2^6, 2^8$ are 1, 4, 5, 9, 3.

So for residues the arithmetic is like signs: residue times residue is a
residue, residue times non-residue is a non-residue, and non-residue times
non-residue is a residue (even + even = even, even + odd = odd, odd + odd =
even). Modulo 11: $2 \cdot 6 = 12 \equiv 1$, a residue made of two non-residues.

## 5.3 Euler's criterion

*Level: beginner.*

How can we tell whether $a$ is a square modulo a 256-bit prime without listing
squares?

**Theorem (Euler's criterion).** For an odd prime $p$ and a unit $a$,

$$a^{(p-1)/2} \equiv \begin{cases} +1 & \text{if } a \text{ is a quadratic residue,} \\ -1 & \text{if } a \text{ is a non-residue.} \end{cases} \pmod p$$

*Proof.* Let $b = a^{(p-1)/2}$. Then $b^2 = a^{p-1} \equiv 1$ by Fermat, so $b$ is
a root of $x^2 - 1$, which in a field has only the roots $\pm 1$. If $a = x^2$,
then $b = x^{p-1} \equiv 1$. Conversely, the residues are $(p-1)/2$ roots of the
polynomial $x^{(p-1)/2} - 1$, which has at most $(p-1)/2$ roots, so the residues
are all of them; every non-residue therefore gives $b \neq 1$, so $b = -1$.
$\blacksquare$

*Check modulo 11:* $(p - 1)/2 = 5.$

```python
p = 11
print(sorted(set(x * x % p for x in range(1, p))))     # the residues
print([pow(a, (p - 1) // 2, p) for a in range(1, p)])  # Euler: 1 for residues, p-1 = -1 for the rest
```

```text
[1, 3, 4, 5, 9]
[1, 10, 1, 1, 1, 10, 10, 10, 1, 10]
```

Positions 1, 3, 4, 5, 9 give 1 and the others give $10 \equiv -1$. With fast
exponentiation, Euler's criterion decides squareness modulo a 256-bit prime in
microseconds.

## 5.4 The Legendre symbol

*Level: beginner.*

Adrien-Marie Legendre introduced a compact notation in 1798. For an odd prime
$p$,

$$\left(\frac{a}{p}\right) = \begin{cases} 0 & \text{if } p \mid a, \\ +1 & \text{if } a \text{ is a quadratic residue mod } p, \\ -1 & \text{if } a \text{ is a non-residue.} \end{cases}$$

It is read "*a* on *p*" and is not a fraction. Euler's criterion becomes the
formula $\left(\frac{a}{p}\right) \equiv a^{(p-1)/2} \pmod p$, and from it come
the rules:

1. **It depends only on $a \bmod p$:** if $a \equiv b$, then
   $\left(\frac{a}{p}\right) = \left(\frac{b}{p}\right)$.
2. **It is multiplicative:** $\left(\frac{ab}{p}\right) =
   \left(\frac{a}{p}\right)\left(\frac{b}{p}\right)$, since $(ab)^{(p-1)/2} =
   a^{(p-1)/2} b^{(p-1)/2}$. This is the "rule of signs" of §5.2.
3. **Squares are residues:** $\left(\frac{a^2}{p}\right) = 1$ for $p \nmid a$.
4. **The first supplement:** $\left(\frac{-1}{p}\right) = (-1)^{(p-1)/2}$, so $-1$
   is a square modulo $p$ exactly when $p \equiv 1 \pmod 4$. (Directly from
   Euler.) Modulo 13, $5^2 = 25 \equiv -1$; modulo 11, $-1 = 10$ is not in the
   list of squares.
5. **The second supplement:** $\left(\frac{2}{p}\right) = (-1)^{(p^2-1)/8}$, so
   2 is a square modulo $p$ exactly when $p \equiv \pm 1 \pmod 8$. (Proved in
   §5.5 with Gauss's lemma.) Modulo 7, $3^2 = 9 \equiv 2$; modulo 11, 2 is not a
   square.

By the multiplicative rule, to know $\left(\frac{a}{p}\right)$ for all $a$, it
is enough to know it for $a = -1$, $a = 2$, and odd primes $a = q$. The first two
are the supplements. For odd primes we need the next section.

## 5.5 Quadratic reciprocity

*Level: intermediate.*

### The law

Is 5 a square modulo 11? Modulo 11, the squares are 1, 3, 4, 5, 9: yes. Now
turn it around: is 11 a square modulo 5? $11 \equiv 1$, and 1 is a square: yes.
Is 3 a square modulo 7? The squares mod 7 are 1, 2, 4: no. Is 7 a square modulo
3? $7 \equiv 1$: yes. Something links the two questions, with a twist when both
primes are $\equiv 3 \pmod 4$.

**Theorem (law of quadratic reciprocity).** For distinct odd primes $p$ and $q$,

$$\left(\frac{p}{q}\right)\left(\frac{q}{p}\right) = (-1)^{\frac{p-1}{2}\cdot\frac{q-1}{2}}.$$

In words: the two questions have the same answer, unless *both* primes are
$\equiv 3 \pmod 4$, in which case they have opposite answers. (5 and 11: 5 is
$\equiv 1$, same answer. 3 and 7: both $\equiv 3$, opposite answers.)

Euler found the law by experiment and stated it in various forms from 1744
onward; Legendre gave it its modern shape and an incomplete proof in 1785 and
1798. Gauss, who rediscovered it at eighteen, gave the first complete proof on 8
April 1796 and called it the *theorema aureum*, the golden theorem. He published
six proofs in his lifetime and two more were found in his papers; hundreds of
proofs have been published since. It is one of the most surprising facts in
elementary mathematics: why should squareness modulo $q$ have anything to do
with squareness modulo $p$?

### Using it

Reciprocity plus the rules of §5.4 compute any Legendre symbol by repeatedly
flipping and reducing, like Euclid's algorithm. Is 1001 a square modulo the
prime 9907? Factor $1001 = 7 \cdot 11 \cdot 13$, then

- $\left(\frac{7}{9907}\right)$: both $\equiv 3 \pmod 4$ ($9907 = 4 \cdot 2476 + 3$),
  so flip with a minus sign: $-\left(\frac{9907}{7}\right) = -\left(\frac{2}{7}\right)
  = -1$, since $7 \equiv -1 \pmod 8$ makes 2 a square mod 7.
- $\left(\frac{11}{9907}\right)$: both $\equiv 3 \pmod 4$: $-\left(\frac{9907}{11}\right)
  = -\left(\frac{7}{11}\right)$. Again both $\equiv 3$: $\left(\frac{7}{11}\right) =
  -\left(\frac{11}{7}\right) = -\left(\frac{4}{7}\right) = -1$. So the symbol is
  $-(-1) = +1$.
- $\left(\frac{13}{9907}\right)$: $13 \equiv 1 \pmod 4$, so flip freely:
  $\left(\frac{9907}{13}\right) = \left(\frac{1}{13}\right) = 1$, since $9907 = 762
  \cdot 13 + 1$.

So $\left(\frac{1001}{9907}\right) = (-1)(+1)(+1) = -1$: 1001 is not a square
modulo 9907. That took a few small divisions and no exponentiation.

### Gauss's lemma

The standard proof goes through a lemma of Gauss (1808) that counts signs.

**Lemma (Gauss).** Let $p$ be an odd prime and $p \nmid a$. Reduce each of $a, 2a,
3a, \dots, \frac{p-1}{2}a$ modulo $p$ into the range $(-p/2, p/2)$. If $\mu$ of
them are negative, then $\left(\frac{a}{p}\right) = (-1)^\mu$.

*Proof.* The reduced values have distinct absolute values, all in $\{1, \dots,
\frac{p-1}{2}\}$: if $ia \equiv \pm ja$ then $i \equiv \pm j$, impossible for
distinct $i, j$ in the first half. So their absolute values are exactly $1, 2,
\dots, \frac{p-1}{2}$ in some order. Multiplying all of them,

$$a^{(p-1)/2} \left(\tfrac{p-1}{2}\right)! \equiv (-1)^\mu \left(\tfrac{p-1}{2}\right)! \pmod p.$$

Cancel the factorial and apply Euler's criterion. $\blacksquare$

*Check: $a = 2$, $p = 11$.* The multiples $2, 4, 6, 8, 10$ reduce to $2, 4, -5,
-3, -1$: three negatives, so $\left(\frac{2}{11}\right) = -1$. In general, for $a
= 2$ the negatives are the even numbers between $p/2$ and $p$, and counting them
gives the second supplement $(-1)^{(p^2 - 1)/8}$.

### The idea of the proof

From Gauss's lemma, Gotthold Eisenstein (1844) found a beautiful picture.
For odd $a$, the count $\mu$ has the same parity as

$$\sum_{k=1}^{(p-1)/2} \left\lfloor \frac{ka}{p} \right\rfloor,$$

the number of points with whole-number coordinates under the line $y = (a/p)x$
for $0 < x < p/2$. So $\left(\frac{q}{p}\right) = (-1)^{N_1}$ and
$\left(\frac{p}{q}\right) = (-1)^{N_2}$, where $N_1$ counts lattice points in the
rectangle $0 < x < p/2$, $0 < y < q/2$ below the diagonal and $N_2$ the points
above it (the same count with the roles of $x$ and $y$ swapped). No lattice
point lies on the diagonal, since $p$ and $q$ are distinct primes, so $N_1 + N_2$
is all the points in the rectangle:

$$N_1 + N_2 = \frac{p-1}{2} \cdot \frac{q-1}{2}.$$

That is quadratic reciprocity. Figure 5.2 shows the count for $p = 11$, $q = 7$.

<figure class="mars-fig">
<svg viewBox="0 0 640 280" width="640" role="img" aria-label="Eisenstein's lattice-point proof of quadratic reciprocity for p equals 11 and q equals 7: 15 points in a 5 by 3 rectangle split by the diagonal into 7 below and 8 above" fill="currentColor" font-size="13">
<line x1="80" y1="240" x2="420" y2="240" stroke="currentColor" stroke-width="1.2"/>
<line x1="80" y1="240" x2="80" y2="30" stroke="currentColor" stroke-width="1.2"/>
<rect x="80" y="44" width="330" height="196" fill="none" stroke="currentColor" stroke-dasharray="5 4"/>
<line x1="80" y1="240" x2="410" y2="44" class="acc" stroke-width="2"/>
<text x="414" y="276" text-anchor="start" font-size="12">p/2 = 5.5</text>
<text x="70" y="48" text-anchor="end">q/2 = 3.5</text>
<g>
<circle cx="140" cy="184" r="5" class="acc-fill"/><circle cx="200" cy="184" r="5"/><circle cx="260" cy="184" r="5"/><circle cx="320" cy="184" r="5"/><circle cx="380" cy="184" r="5"/>
<circle cx="140" cy="128" r="5" class="acc-fill"/><circle cx="200" cy="128" r="5" class="acc-fill"/><circle cx="260" cy="128" r="5" class="acc-fill"/><circle cx="320" cy="128" r="5"/><circle cx="380" cy="128" r="5"/>
<circle cx="140" cy="72" r="5" class="acc-fill"/><circle cx="200" cy="72" r="5" class="acc-fill"/><circle cx="260" cy="72" r="5" class="acc-fill"/><circle cx="320" cy="72" r="5" class="acc-fill"/><circle cx="380" cy="72" r="5"/>
</g>
<text x="140" y="258" text-anchor="middle" font-size="12">1</text><text x="200" y="258" text-anchor="middle" font-size="12">2</text><text x="260" y="258" text-anchor="middle" font-size="12">3</text><text x="320" y="258" text-anchor="middle" font-size="12">4</text><text x="380" y="258" text-anchor="middle" font-size="12">5</text>
<text x="70" y="188" text-anchor="end" font-size="12">1</text><text x="70" y="132" text-anchor="end" font-size="12">2</text><text x="70" y="76" text-anchor="end" font-size="12">3</text>
<text x="440" y="110">below the line y = 7x/11:</text>
<text x="440" y="128">7 points, so (7/11) = −1</text>
<text x="440" y="160" class="acc-fill">above the line:</text>
<text x="440" y="178" class="acc-fill">8 points, so (11/7) = +1</text>
<text x="440" y="214">total 5 × 3 = 15, odd:</text>
<text x="440" y="232">the two symbols differ</text>
</svg>
<figcaption>Figure 5.2. Eisenstein's proof of quadratic reciprocity, for p = 11, q = 7. The diagonal from the corner splits the 5 × 3 points of the rectangle into two counts whose parities give the two Legendre symbols. Their product is (−1)¹⁵ = −1.</figcaption>
</figure>

(The count below the line is $\lfloor 7/11 \rfloor + \lfloor 14/11 \rfloor +
\lfloor 21/11 \rfloor + \lfloor 28/11 \rfloor + \lfloor 35/11 \rfloor = 0 + 1 +
1 + 2 + 3 = 7$, and $(-1)^7 = -1$; indeed 7 is not among the squares 1, 3, 4, 5, 9
modulo 11. The count above is 8, and 11 ≡ 4 is a square modulo 7.)

## 5.6 The Jacobi symbol

*Level: intermediate.*

The calculation for 1001 and 9907 needed the factors of 1001. Carl Jacobi
removed that need in 1837 by extending the symbol to odd composite "denominators".
For odd positive $n = p_1 p_2 \cdots p_k$ (primes, possibly repeated),

$$\left(\frac{a}{n}\right) = \left(\frac{a}{p_1}\right)\left(\frac{a}{p_2}\right)\cdots\left(\frac{a}{p_k}\right).$$

This **Jacobi symbol** obeys all the same rules: multiplicativity in $a$ and in
$n$, the two supplements, and reciprocity for odd coprime $m, n$:
$\left(\frac{m}{n}\right)\left(\frac{n}{m}\right) =
(-1)^{\frac{m-1}{2}\frac{n-1}{2}}$. So it can be computed *without factoring
anything*, by the same flip-and-reduce steps, pulling out factors of 2 with the
second supplement:

```python
def jacobi(a, n):
    """The Jacobi symbol (a/n) for odd positive n."""
    assert n > 0 and n % 2 == 1
    a %= n
    result = 1
    while a:
        while a % 2 == 0:                 # pull out factors of 2: second supplement
            a //= 2
            if n % 8 in (3, 5):
                result = -result
        a, n = n, a                       # flip: reciprocity
        if a % 4 == 3 and n % 4 == 3:
            result = -result
        a %= n
    return result if n == 1 else 0        # 0 when gcd(a, n) > 1

print(jacobi(1001, 9907))
print(jacobi(2, 15), [x for x in range(15) if x * x % 15 == 2])
```

```text
-1
1 []
```

The algorithm runs in the same time as Euclid's, $O(n^2)$ bit operations for
$n$-bit inputs, and is faster than Euler's criterion. That is what libraries use
to test squareness modulo a prime.

### What the Jacobi symbol does not say

The second line is the warning. $\left(\frac{2}{15}\right) = \left(\frac{2}{3}\right)
\left(\frac{2}{5}\right) = (-1)(-1) = 1$, yet 2 is not a square modulo 15 (the
empty list). A Jacobi symbol of $-1$ proves $a$ is a non-residue modulo $n$; a
symbol of $+1$ means only that $a$ is a residue modulo both primes **or modulo
neither**. Modulo $N = pq$, the units split into four kinds:

| mod $p$ | mod $q$ | $\left(\frac{a}{N}\right)$ | square mod $N$? |
|---|---|---|---|
| residue | residue | $+1$ | yes |
| non-residue | non-residue | $+1$ | no: a "pseudosquare" |
| residue | non-residue | $-1$ | no |
| non-residue | residue | $-1$ | no |

Each kind has a quarter of the units. Anyone can tell the bottom half from the
top half with the Jacobi symbol. Telling the first row from the second, without
the factors, is the **quadratic residuosity problem**, and nobody knows how to do
it faster than factoring $N$. Goldwasser and Micali built an encryption scheme on
exactly this gap (§5.10).

## 5.7 Square roots modulo a prime

*Level: intermediate.*

Euler's criterion says *whether* $a$ has a square root mod $p$. Finding it is
another matter. For half of all primes it is a single exponentiation.

### The easy case: $p \equiv 3 \pmod 4$

**Theorem.** If $p \equiv 3 \pmod 4$ and $a$ is a quadratic residue, then $x =
a^{(p+1)/4} \bmod p$ is a square root of $a$.

*Proof.* $(p+1)/4$ is an integer, and $x^2 = a^{(p+1)/2} = a \cdot a^{(p-1)/2}
\equiv a \cdot 1 = a$ by Euler's criterion. $\blacksquare$

*By hand.* Square root of 5 mod 11: $(11 + 1)/4 = 3$, $5^3 = 125 = 11 \cdot 11 +
4$, so $x = 4$; check $16 \equiv 5$. The other root is $11 - 4 = 7$.

The NIST curve P-256's prime $p = 2^{256} - 2^{224} + 2^{192} + 2^{96} - 1$ is
$\equiv 3 \pmod 4$, so its point decompression is one exponentiation. The same
holds for P-384, P-521 and secp256k1 (Bitcoin's curve).

### The harder case: Tonelli-Shanks

If $p \equiv 1 \pmod 4$ the exponent trick fails. For $p \equiv 5 \pmod 8$ there
is a short special formula (Atkin, 1992; Curve25519's prime $2^{255} - 19$ is
of this kind and uses a variant). The general method was found by Alberto
Tonelli in 1891 and rediscovered by Daniel Shanks in 1973.

**The idea.** Write $p - 1 = 2^s q$ with $q$ odd. The units form a cyclic group
of order $2^s q$; its "2-part" is a cyclic subgroup of order $2^s$. Start with a
guess $r = a^{(q+1)/2}$. Then $r^2 = a \cdot a^q$, so the guess is off by the
factor $t = a^q$, an element of the 2-part (its order is a power of 2, since
$t^{2^{s-1}} = a^{(p-1)/2} = 1$). Repeatedly fix the guess by multiplying it by
powers of a generator $c$ of the 2-part, chosen to cancel $t$'s order one
halving at a time. A generator of the 2-part comes from any non-residue $z$:
$c = z^q$.

**The algorithm.** Given a residue $a$:

1. Write $p - 1 = 2^s q$, $q$ odd. Find a non-residue $z$ (try 2, 3, 4, ...
   with Euler's criterion; half of all numbers work).
2. Set $m = s$, $c = z^q$, $t = a^q$, $r = a^{(q+1)/2}$. (Invariant: $r^2 = at$,
   $t$ has order dividing $2^{m-1}$, $c$ has order $2^m$.)
3. While $t \neq 1$: find the least $i$ with $t^{2^i} = 1$; set $b =
   c^{2^{m-i-1}}$, then $m \leftarrow i$, $c \leftarrow b^2$, $t \leftarrow tb^2$,
   $r \leftarrow rb$.
4. Return $r$.

Each pass strictly lowers the order of $t$, so there are at most $s$ passes.

*By hand.* Square root of 10 mod 13. $p - 1 = 12 = 2^2 \cdot 3$: $s = 2$, $q =
3$. The number 2 is a non-residue mod 13 ($2^6 = 64 \equiv -1$).

<div class="mars-steps" markdown>
1. $m = 2$, $c = 2^3 = 8$, $t = 10^3 = 1000 \equiv 12$, $r = 10^2 = 100 \equiv 9$.
   Check the invariant: $r^2 = 81 \equiv 3$ and $at = 120 \equiv 3$.
2. $t = 12 \neq 1$. $t^2 = 144 \equiv 1$, so $i = 1$. $b = c^{2^{2-1-1}} = c = 8$.
   Now $m = 1$, $c = 64 \equiv 12$, $t = 12 \cdot 12 = 144 \equiv 1$, $r = 9
   \cdot 8 = 72 \equiv 7$.
3. $t = 1$: return $r = 7$. Check: $49 = 3 \cdot 13 + 10$.
</div>

```python
def sqrt_mod(a, p):
    """A square root of a modulo an odd prime p, or None if there is none."""
    a %= p
    if a == 0:
        return 0
    if pow(a, (p - 1) // 2, p) != 1:          # Euler's criterion: not a square
        return None
    if p % 4 == 3:                            # the easy case
        return pow(a, (p + 1) // 4, p)
    q, s = p - 1, 0                           # Tonelli-Shanks
    while q % 2 == 0:
        q //= 2
        s += 1
    z = 2
    while pow(z, (p - 1) // 2, p) != p - 1:   # find a non-residue
        z += 1
    m, c, t, r = s, pow(z, q, p), pow(a, q, p), pow(a, (q + 1) // 2, p)
    while t != 1:
        i, t2 = 0, t
        while t2 != 1:                        # least i with t^(2^i) = 1
            t2 = t2 * t2 % p
            i += 1
        b = pow(c, 1 << (m - i - 1), p)
        m, c, t, r = i, b * b % p, t * b * b % p, r * b % p
    return r

print(sqrt_mod(5, 11), sqrt_mod(10, 13), sqrt_mod(2, 41), sqrt_mod(3, 41))
p = 2**255 - 19
y2 = (9**3 + 486662 * 9**2 + 9) % p           # Curve25519's base point has x = 9
y = sqrt_mod(y2, p)
print(y * y % p == y2, p % 8)
```

```text
4 7 17 None
True 5
```

(3 is not a square mod 41: $41 \equiv 1 \pmod 4$ and $41 \equiv 2 \pmod 3$, so by
reciprocity $\left(\frac{3}{41}\right) = \left(\frac{41}{3}\right) =
\left(\frac{2}{3}\right) = -1$.)

The last lines find the $y$-coordinate of Curve25519's base point, whose $x$ is
9, on the curve $y^2 = x^3 + 486662x^2 + x$, modulo a prime $\equiv 5 \pmod 8$,
where Tonelli-Shanks does a little real work.

The non-residue search in step 1 is the one random-looking part: no
deterministic polynomial-time way to find a non-residue is known without
assuming the generalized Riemann hypothesis (under which one is below $2(\ln
p)^2$, by Eric Bach in 1990). In practice the first few small numbers always
work.

## 5.8 Square roots modulo $pq$

*Level: intermediate.*

### Four roots

Modulo $N = pq$, a square $a$ (a residue mod both primes) has two roots mod $p$,
$\pm x_p$, and two mod $q$, $\pm x_q$. The Chinese remainder theorem combines
each pair into a root mod $N$, giving **four** square roots: $\pm x$ and $\pm y$,
where $x \equiv x_p$, $x \equiv x_q$ and $y \equiv x_p$, $y \equiv -x_q$. Chapter
3 met the four square roots of 1 modulo 15: 1, 4, 11, 14.

Whoever knows $p$ and $q$ can find all four quickly with §5.7 and the CRT. What
about someone who does not?

### Square roots are as hard as factoring

**Theorem (Rabin, 1979).** If there is an efficient algorithm that, given $N =
pq$ and a random square $a$ modulo $N$, outputs some square root of $a$, then
there is an efficient algorithm that factors $N$ with probability at least $1/2$
per attempt.

*Proof.* Use the root-finder as a subroutine:

1. Pick a random unit $x$ modulo $N$ and compute $a = x^2 \bmod N$.
2. Give $a$ to the root-finder and get back a root $y$.
3. If $y \not\equiv \pm x$, output $\gcd(x - y, N)$.

The root-finder sees only $a$, and $a$ has four roots, of which $x$ is one chosen
uniformly at random, so whatever root $y$ the finder returns, the chance that $y
\equiv \pm x$ is exactly $2/4 = 1/2$. When $y \not\equiv \pm x$, we have $x^2
\equiv y^2$, so $N \mid (x - y)(x + y)$, while $N$ divides neither factor. So $p$
divides one factor and $q$ the other, and $\gcd(x - y, N)$ is $p$ or $q$. Repeat
until it works; after $k$ tries the chance of failure is $2^{-k}$.
$\blacksquare$

<figure class="mars-fig">
<svg viewBox="0 0 640 240" width="640" role="img" aria-label="The four square roots of a square mod pq combine the two roots mod p with the two roots mod q; the root-finder returns one, and if it is not plus or minus x, a gcd factors N" fill="currentColor" font-size="13">
<g stroke="currentColor" stroke-width="1.3" fill="none">
<rect x="180" y="40" width="300" height="160"/>
<line x1="330" y1="40" x2="330" y2="200"/><line x1="180" y1="120" x2="480" y2="120"/>
</g>
<text x="255" y="30" text-anchor="middle">+x mod q</text><text x="405" y="30" text-anchor="middle">−x mod q</text>
<text x="170" y="84" text-anchor="end">+x mod p</text><text x="170" y="164" text-anchor="end">−x mod p</text>
<text x="255" y="86" text-anchor="middle" font-weight="bold">x</text>
<text x="405" y="86" text-anchor="middle" class="acc-fill" font-weight="bold">y</text>
<text x="255" y="166" text-anchor="middle" class="acc-fill" font-weight="bold">−y</text>
<text x="405" y="166" text-anchor="middle" font-weight="bold">−x</text>
<text x="500" y="90">we chose x at random;</text>
<text x="500" y="108">the finder sees only x²</text>
<text x="500" y="150" class="acc-fill">if it returns ±y:</text>
<text x="500" y="168" class="acc-fill">gcd(x − y, N) = p</text>
<text x="330" y="226" text-anchor="middle">x ≡ y mod p, x ≢ y mod q: so p divides x − y and q does not</text>
</svg>
<figcaption>Figure 5.3. Why square roots modulo N = pq factor N. A square has four roots, from the sign choices modulo p and modulo q. Half of them are "mixed" (±y), and any mixed root together with x reveals a prime factor through one gcd.</figcaption>
</figure>

The converse is also true (knowing the factors gives roots), so **computing
square roots modulo $N$ is equivalent to factoring $N$**. This is a reduction in
the sense of Chapter 1 and Chapter 19: an attacker on square roots is turned
into a factoring algorithm. It is also the precise form of Fermat's idea from
Chapter 2: two squares congruent modulo $N$ factor it.

## 5.9 Rabin encryption

*Level: intermediate.*

Michael Rabin's scheme is RSA with exponent 2. The public key is $N = pq$ with
$p \equiv q \equiv 3 \pmod 4$ (so roots are easy for the owner). To encrypt a
message $m < N$, compute

$$c = m^2 \bmod N.$$

To decrypt, the owner computes $m_p = c^{(p+1)/4} \bmod p$ and $m_q =
c^{(q+1)/4} \bmod q$, combines the four sign choices $\pm m_p$, $\pm m_q$ with the
CRT, and gets four candidates, one of which is $m$.

```python
p, q = 10007, 10039                           # both are 3 mod 4
N = p * q
m = 1234567
c = m * m % N                                 # encryption: one squaring

def crt2(a, p, b, q):
    return (a + p * ((b - a) * pow(p, -1, q) % q)) % (p * q)

mp, mq = pow(c, (p + 1) // 4, p), pow(c, (q + 1) // 4, q)
roots = sorted({crt2(s, p, t, q) for s in (mp, p - mp) for t in (mq, q - mq)})
print(c, roots, m in roots)

from math import gcd
print(gcd(roots[0] - roots[1], N), gcd(roots[0] + roots[1], N))
```

```text
72875806 [1234567, 36581886, 63878387, 99225706] True
10039 10007
```

Three practical points:

**Which root?** Decryption gives four candidates. In practice the message is
padded with a recognizable pattern (repeated bits, or a hash), so only one
candidate fits. The Rabin-Williams variant (Hugh Williams, 1980) avoids the
ambiguity with a small change to the modulus.

**Speed.** Encryption is one squaring, the cheapest public-key operation there
is, faster than RSA with $e = 65537$ by a factor of about 17. Rabin-Williams
signatures have been used where verification must be very cheap.

**Break it.** The proof of §5.8 is also an attack. An attacker who can get
*any* ciphertext decrypted (a chosen-ciphertext attack) picks a random $x$,
submits $c = x^2$, and receives one of the four roots; half the time it is not
$\pm x$, and the last line of the code above factors $N$. The very property that
makes the scheme provably as hard as factoring against passive attackers makes it
catastrophically weak against active ones. Padding that forces a valid format,
and refusal to decrypt anything else, is the cure. Hugh Williams noted the
danger in 1980, and it is a standard example in courses on chosen-ciphertext
security (*The cryptography book*, [Chapter 17](../../book/17-Defining-Security.md)).

!!! note "Life story: Rabin's cryptosystem"
    **Born:** January 1979, Michael Rabin, MIT technical report
    "Digitalized Signatures and Public-Key Functions as Intractable as
    Factorization" · **Purpose:** a public-key system whose security is provably
    equivalent to factoring · **Helped:** the first security reduction in
    public-key cryptography, the model for every later proof; Rabin-Williams
    signatures; the Blum-Blum-Shub generator (1986) that iterates squaring
    modulo $N$ · **Status:** rarely deployed, because of the four-root
    ambiguity and the chosen-ciphertext attack; its ideas are everywhere

## 5.10 Goldwasser-Micali encryption

*Level: intermediate.*

Every public-key scheme before 1982, RSA and Rabin included, was
**deterministic**: encrypting the same message twice gives the same ciphertext.
Then an eavesdropper can always test a guess: encrypt "YES" and "NO" with the
public key and compare. Shafi Goldwasser and Silvio Micali saw that a secure
scheme must be randomized, defined what security should mean (an attacker should
learn not even one bit about the message), and gave the first scheme that
achieves it, provably, under a number-theoretic assumption.

**Keys.** $N = pq$, and a pseudosquare $y$: a non-residue mod both $p$ and $q$,
so $\left(\frac{y}{N}\right) = +1$ but $y$ is not a square. Public key $(N, y)$;
private key $p$.

**Encrypt one bit $b$:** pick a random unit $r$ and send $c = y^b r^2 \bmod N$.
So a 0 becomes a random square, and a 1 becomes a random pseudosquare.

**Decrypt:** check whether $c$ is a square mod $p$ with Euler's criterion. Squares
mean 0; non-squares mean 1.

<figure class="mars-fig">
<svg viewBox="0 0 640 220" width="640" role="img" aria-label="Goldwasser-Micali: the units mod N with Jacobi symbol plus one split into true squares, which encrypt 0, and pseudosquares, which encrypt 1; nobody without the factors can tell them apart" fill="currentColor" font-size="13">
<g stroke="currentColor" stroke-width="1.3" fill="none">
<rect x="30" y="30" width="580" height="160" rx="8"/>
<line x1="320" y1="30" x2="320" y2="190"/>
<rect x="40" y="40" width="270" height="140" rx="6" class="soft"/>
<line x1="175" y1="40" x2="175" y2="180" stroke-dasharray="5 4" class="acc"/>
</g>
<text x="175" y="22" text-anchor="middle">Jacobi symbol +1 (half the units)</text>
<text x="465" y="22" text-anchor="middle">Jacobi symbol −1</text>
<text x="107" y="100" text-anchor="middle">squares</text><text x="107" y="120" text-anchor="middle" class="acc-fill">encrypt 0</text>
<text x="242" y="100" text-anchor="middle">pseudosquares</text><text x="242" y="120" text-anchor="middle" class="acc-fill">encrypt 1</text>
<text x="465" y="100" text-anchor="middle">never used:</text><text x="465" y="120" text-anchor="middle">anyone can spot them</text>
<text x="175" y="210" text-anchor="middle" class="acc-fill">the dashed line is visible only with p and q</text>
</svg>
<figcaption>Figure 5.4. Goldwasser-Micali encryption. A 0 is sent as a random square and a 1 as a random pseudosquare. Both have Jacobi symbol +1, so the public computation reveals nothing; telling them apart is the quadratic residuosity problem.</figcaption>
</figure>

Both kinds of ciphertext have Jacobi symbol $+1$, so the public Jacobi
computation gives nothing away. Telling them apart is exactly the quadratic
residuosity problem of §5.6, and Goldwasser and Micali proved that an attacker
who could learn anything at all about $b$ from $c$ could solve that problem.

```python
import random
rng = random.Random(7)
p, q = 10007, 10039
N = p * q
y = next(y for y in range(2, N)                           # a pseudosquare
         if pow(y, (p - 1) // 2, p) == p - 1 and pow(y, (q - 1) // 2, q) == q - 1)

def enc(bit):
    r = rng.randrange(1, N)
    return pow(y, bit, N) * r * r % N

def dec(c):
    return 0 if pow(c, (p - 1) // 2, p) == 1 else 1

bits = [1, 0, 1, 1, 0, 0, 1, 0]
cs = [enc(b) for b in bits]
print(y, [dec(c) for c in cs], [jacobi(c, N) for c in cs])
print(dec(cs[0] * cs[2] % N), dec(cs[0] * cs[1] % N))     # multiplying ciphertexts XORs the bits
```

```text
7 [1, 0, 1, 1, 0, 0, 1, 0] [1, 1, 1, 1, 1, 1, 1, 1]
0 1
```

The last line shows a bonus: multiplying two ciphertexts gives an encryption of
the XOR of their bits ($y^{b_1}r_1^2 \cdot y^{b_2}r_2^2 = y^{b_1+b_2}(r_1r_2)^2$,
and $y^2$ is a square). Schemes where operations on ciphertexts act on the
hidden messages are called **homomorphic**, and this was the first.

The drawback is size: every bit of message costs a full 2,048-bit ciphertext.
The scheme's importance is the idea. Goldwasser and Micali's paper, "Probabilistic
Encryption" (1982, journal version 1984), defined semantic security and proved
it for a concrete scheme; it is the foundation of modern provable security, and
they received the 2012 Turing Award for it.

## 5.11 In the real world

*Level: intermediate.*

**Point compression.** SEC 1, the elliptic-curve standard from Certicom (2000,
version 2 in 2009), encodes a point as `02` or `03` followed by $x$, the prefix
giving the parity of $y$; uncompressed points start with `04`. Decompression is
one square root, done with the $p \equiv 3 \pmod 4$ formula for the NIST curves.
Ed25519 always compresses: a public key is 32 bytes, the $y$-coordinate plus one
bit for the sign of $x$, and decoding takes a square root modulo $2^{255} - 19$
with the $p \equiv 5 \pmod 8$ method. A decoder must also reject an $x$ for which
the square root does not exist, or it may accept a point on the wrong curve, the
start of an **invalid-curve attack**.

**One bit of Diffie-Hellman leaks.** In the full group $(\mathbb{Z}/p\mathbb{Z})^*$,
the Legendre symbol of $g^x$ is $(-1)^x$ when $g$ is a primitive root (§5.2), so
anyone can read the last bit of every secret exponent from the public values
$A = g^a$ and $B = g^b$, and from those, the Legendre symbol of the shared
secret $g^{ab}$. That breaks the **decisional Diffie-Hellman** assumption
(Chapter 7) in the full group: an eavesdropper can tell the real shared secret
from a random number half the time. It is one reason protocols work in a
prime-order subgroup, such as the squares modulo a safe prime, where every
element has Legendre symbol $+1$ and the leak disappears.

**Blum-Blum-Shub.** Lenore Blum, Manuel Blum and Michael Shub proposed in 1986 a
random-bit generator that repeatedly squares modulo $N = pq$ (with $p \equiv q
\equiv 3 \pmod 4$) and outputs the last bit of each result. Predicting its
output is as hard as the quadratic residuosity problem. It is far too slow for
practical use, but it is the textbook example of a generator with a proof, and
it shows up in courses and proofs to this day.

## 5.12 Going deeper

*Level: expert.*

**Cipolla's algorithm.** Michele Cipolla (1907) gave a second square-root method
that works well when $p - 1$ is divisible by a high power of 2. Find $t$ with $t^2
- a$ a non-residue, work in the field $\mathbb{F}_{p^2} = \mathbb{F}_p(\omega)$
with $\omega^2 = t^2 - a$ (Chapter 8), and compute $(t + \omega)^{(p+1)/2}$, which
lands in $\mathbb{F}_p$ and is a root of $a$. Its cost does not depend on $s$.

**Square roots in other fields.** The same questions arise in $\mathbb{F}_{p^k}$.
Pairing-based cryptography (Chapter 13) needs square roots in $\mathbb{F}_{p^2}$
for hashing to curves; RFC 9380 (2023), "Hashing to Elliptic Curves", specifies
constant-time square roots for each field it covers, and constant-time quadratic
residue tests, because these steps run on secret data.

**Higher residues.** One can ask which numbers are cubes, or $k$-th powers,
modulo $p$. When $k \mid p - 1$ exactly a $1/k$ fraction of the units are $k$-th
powers, and Euler's criterion becomes $a^{(p-1)/k} = 1$. Reciprocity laws for
cubes and fourth powers (Eisenstein, Jacobi, Gauss) live in rings like
$\mathbb{Z}[i]$ and $\mathbb{Z}[\omega]$. Benaloh's and Naccache-Stern's
encryption schemes generalize Goldwasser-Micali to higher residues so that each
ciphertext carries more than one bit, and Paillier's scheme (1999) uses $N$-th
residues modulo $N^2$ to get additive homomorphic encryption of whole numbers,
used in electronic voting.

**Reciprocity and beyond.** Quadratic reciprocity was the first step of a long
road: Artin's reciprocity law (1927) and class field theory, then the Langlands
program, which seeks to unify reciprocity laws across number theory. Some of the
mathematics behind the isogeny-based post-quantum schemes, such as the class
group action in CSIDH (2018), grows directly from this theory.

## Check yourself

??? question "1. List the quadratic residues modulo 13."

    $1^2, \dots, 6^2$ give 1, 4, 9, 3, 12, 10. The residues are 1, 3, 4, 9, 10,
    12; the non-residues are 2, 5, 6, 7, 8, 11.

??? question "2. Use Euler's criterion to decide whether 3 is a square mod 23."

    $3^{11} \bmod 23$: $3^2 = 9$, $3^4 = 81 \equiv 12$, $3^8 \equiv 144 \equiv 6$,
    $3^{11} = 3^8 \cdot 3^2 \cdot 3 \equiv 6 \cdot 9 \cdot 3 = 162 \equiv 1$. So 3
    is a square; indeed $7^2 = 49 \equiv 3$.

??? question "3. For which primes is $-1$ a square? Is $-1$ a square mod 29? Find a root."

    For $p = 2$ and $p \equiv 1 \pmod 4$. $29 \equiv 1 \pmod 4$, so yes;
    $12^2 = 144 = 4 \cdot 29 + 28 \equiv -1$.

??? question "4. Compute $\left(\frac{3}{101}\right)$ with reciprocity."

    $101 \equiv 1 \pmod 4$, so $\left(\frac{3}{101}\right) =
    \left(\frac{101}{3}\right) = \left(\frac{2}{3}\right) = -1$.

??? question "5. Find both square roots of 2 modulo 23, using $p \equiv 3 \pmod 4$."

    $23 \equiv 7 \pmod 8$, so 2 is a square. $2^{(23+1)/4} = 2^6 = 64 \equiv 18$.
    Check: $18^2 = 324 = 14 \cdot 23 + 2$. The roots are 18 and 5.

??? question "6. Why can't you just compute $a^{(p+1)/4}$ when $p \equiv 1 \pmod 4$?"

    Then $(p + 1)/4$ is not an integer. And the analogous trick fails: $x =
    a^{(p+3)/8}$ (for $p \equiv 5 \pmod 8$) gives $x^2 = \pm a$, and fixing the
    sign needs a square root of $-1$. The general case needs Tonelli-Shanks or
    Cipolla.

??? question "7. Find the four square roots of 4 modulo 77, and factor 77 from two of them."

    Mod 7: $\pm 2$; mod 11: $\pm 2$. CRT gives 2, 75, and the mixed roots: $x
    \equiv 2 \pmod 7$, $x \equiv -2 \pmod{11}$ gives 9; and its negative, 68.
    $\gcd(9 - 2, 77) = 7$.

??? question "8. Compute $\left(\frac{5}{21}\right)$. Is 5 a square modulo 21?"

    $\left(\frac{5}{3}\right)\left(\frac{5}{7}\right) = \left(\frac{2}{3}\right)
    \left(\frac{5}{7}\right) = (-1)(-1) = 1$. But 5 is not a square modulo 3, so
    it is not a square modulo 21: a pseudosquare.

??? question "9. In Goldwasser-Micali, why must $y$ have Jacobi symbol $+1$ rather than $-1$?"

    If $\left(\frac{y}{N}\right) = -1$, ciphertexts of 1 would have Jacobi symbol
    $-1$ and ciphertexts of 0 would have $+1$. Anyone could compute the Jacobi
    symbol without the factors and read every bit.

??? question "10. In Rabin's reduction, why is the chance that the root-finder returns $\pm x$ exactly one half, whatever the root-finder does?"

    The root-finder is given only $a = x^2$. Given $a$, the four roots are
    equally likely to have been our $x$, because $x$ was chosen uniformly. So
    whichever root it returns, it coincides with $\pm x$ for two of the four
    equally likely choices of $x$.

## What you learned

- Modulo an odd prime, exactly half the units are squares, each with two roots;
  they are the even powers of a primitive root.
- Euler's criterion: $a^{(p-1)/2}$ is $+1$ for squares and $-1$ for non-squares.
  The Legendre symbol records the answer and is multiplicative.
- Quadratic reciprocity links squareness mod $p$ and mod $q$; Eisenstein's
  lattice-point count proves it.
- The Jacobi symbol extends the Legendre symbol to odd composites and is
  computed like a gcd, without factoring; but a Jacobi symbol of $+1$ does not
  mean "square".
- Square roots mod $p$: $a^{(p+1)/4}$ when $p \equiv 3 \pmod 4$, Tonelli-Shanks
  otherwise. They make point compression work.
- Modulo $N = pq$ there are four roots, and finding square roots is equivalent
  to factoring (Rabin). The same proof is a chosen-ciphertext attack on Rabin
  encryption.
- Goldwasser-Micali encrypts bits as squares and pseudosquares: the first
  probabilistic, semantically secure, homomorphic encryption.
- In the full group mod $p$, the Legendre symbol leaks one bit of every
  Diffie-Hellman exponent; prime-order subgroups remove the leak.

**Next:** [Chapter 6](06-Primality-Testing.md), how to tell whether a 1,024-bit
number is prime, and how keys are made.

## Further reading

- Kenneth Ireland and Michael Rosen, *A Classical Introduction to Modern Number
  Theory*, 2nd edition (Springer, 1990), chapter 5 on quadratic reciprocity.
- Franz Lemmermeyer, *Reciprocity Laws: From Euler to Eisenstein* (Springer,
  2000), with its list of published proofs.
- Carl Friedrich Gauss, *Disquisitiones Arithmeticae* (1801), section IV.
- Daniel Shanks, "Five Number-theoretic Algorithms", *Proceedings of the Second
  Manitoba Conference on Numerical Mathematics* (1973): Tonelli-Shanks.
- Henri Cohen, *A Course in Computational Algebraic Number Theory* (Springer,
  1993), §1.5 on square roots and the Jacobi symbol.
- Michael Rabin, "Digitalized Signatures and Public-Key Functions as Intractable
  as Factorization" (MIT/LCS/TR-212, 1979).
- Hugh Williams, "A Modification of the RSA Public-Key Encryption Procedure",
  *IEEE Transactions on Information Theory* 26 (1980).
- Shafi Goldwasser and Silvio Micali, "Probabilistic Encryption", *Journal of
  Computer and System Sciences* 28 (1984; STOC 1982).
- Lenore Blum, Manuel Blum and Michael Shub, "A Simple Unpredictable
  Pseudo-Random Number Generator", *SIAM Journal on Computing* 15 (1986).
- SEC 1: Elliptic Curve Cryptography, version 2.0 (Certicom Research, 2009),
  §2.3.3 and §2.3.4 on point compression.
- RFC 8032, Edwards-Curve Digital Signature Algorithm (2017), §5.1.3 on decoding.
- RFC 9380, Hashing to Elliptic Curves (2023).
- In *The cryptography book*: [Chapter 15](../../book/15-Elliptic-Curves.md),
  [Chapter 17](../../book/17-Defining-Security.md).
