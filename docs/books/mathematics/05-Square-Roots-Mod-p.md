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
    - quadratic reciprocity, with Gauss's lemma and Eisenstein's lattice-point proof;
    - the Jacobi symbol, how to compute it as fast as a gcd, and what it does
      not tell you;
    - square roots modulo a prime: the easy case $p \equiv 3 \pmod 4$, the case
      $p \equiv 5 \pmod 8$, and the Tonelli-Shanks algorithm, traced on a prime
      with $2^{12} \mid p - 1$;
    - Cipolla's algorithm, and square roots in $\mathbb{F}_{p^2}$ for pairing curves;
    - why square roots modulo $N = pq$ are as hard as factoring $N$, with proof and
      the reduction run as a program;
    - Rabin encryption, Goldwasser-Micali encryption with its security argument,
      and point decompression on P-256 and Ed25519.

    **You need:** [Chapter 3](03-Modular-Arithmetic.md) (the Chinese remainder
    theorem) and [Chapter 4](04-Powers-and-Primitive-Roots.md) (Fermat, orders,
    primitive roots).

    **Levels:** §5.1 to §5.4 are for beginners, §5.5 to §5.11 are
    intermediate, §5.12 is expert.

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

### Where the squares sit

Put the units modulo $p$ around a circle, like the hours on a clock, and mark the
squares (Figure 5.2). Modulo 13 the marks are symmetric about the vertical axis:
$a$ and $13 - a$ are always both squares or both non-squares. Modulo 11 the
picture is the opposite: wherever $a$ is a square, $11 - a$ is not. The rule of
signs explains it. Since $-a = (-1) \cdot a$, the numbers $a$ and $-a$ are of the
same kind exactly when $-1$ is a square, and $-1$ is a square modulo 13 ($5^2 = 25
\equiv -1$) but not modulo 11. The picture already shows a theorem, the "first
supplement" of §5.4: $-1$ is a square modulo $p$ exactly when $p \equiv 1 \pmod 4$.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="The units modulo 13 and modulo 11 on two circles, squares filled: symmetric about the vertical axis for 13, opposite across it for 11" fill="currentColor" font-size="13">
<text x="165" y="26" text-anchor="middle">p = 13, which is 1 mod 4</text>
<circle cx="165" cy="150" r="90" fill="none" stroke="currentColor" stroke-opacity=".35"/>
<line x1="165" y1="46" x2="165" y2="254" stroke="currentColor" stroke-dasharray="4 4" stroke-opacity=".6"/>
<circle cx="165.0" cy="60.0" r="2.5"/>
<text x="165.0" y="47.5" text-anchor="middle" fill-opacity=".7">0</text>
<circle cx="206.8" cy="70.3" r="6.5"/>
<text x="214.7" y="59.8" text-anchor="middle">1</text>
<circle cx="239.1" cy="98.9" r="6" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="253.1" y="93.7" text-anchor="middle">2</text>
<circle cx="254.3" cy="139.2" r="6.5"/>
<text x="271.2" y="141.6" text-anchor="middle">3</text>
<circle cx="249.2" cy="181.9" r="6.5"/>
<text x="265.0" y="192.4" text-anchor="middle">4</text>
<circle cx="224.7" cy="217.4" r="6" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="236.0" y="234.6" text-anchor="middle">5</text>
<circle cx="186.5" cy="237.4" r="6" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="190.6" y="258.4" text-anchor="middle">6</text>
<circle cx="143.5" cy="237.4" r="6" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="139.4" y="258.4" text-anchor="middle">7</text>
<circle cx="105.3" cy="217.4" r="6" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="94.0" y="234.6" text-anchor="middle">8</text>
<circle cx="80.8" cy="181.9" r="6.5"/>
<text x="65.0" y="192.4" text-anchor="middle">9</text>
<circle cx="75.7" cy="139.2" r="6.5"/>
<text x="58.8" y="141.6" text-anchor="middle">10</text>
<circle cx="90.9" cy="98.9" r="6" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="76.9" y="93.7" text-anchor="middle">11</text>
<circle cx="123.2" cy="70.3" r="6.5"/>
<text x="115.3" y="59.8" text-anchor="middle">12</text>
<text x="475" y="26" text-anchor="middle">p = 11, which is 3 mod 4</text>
<circle cx="475" cy="150" r="90" fill="none" stroke="currentColor" stroke-opacity=".35"/>
<line x1="475" y1="46" x2="475" y2="254" stroke="currentColor" stroke-dasharray="4 4" stroke-opacity=".6"/>
<circle cx="475.0" cy="60.0" r="2.5"/>
<text x="475.0" y="47.5" text-anchor="middle" fill-opacity=".7">0</text>
<circle cx="523.7" cy="74.3" r="6.5"/>
<text x="532.8" y="64.5" text-anchor="middle">1</text>
<circle cx="556.9" cy="112.6" r="6" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="572.3" y="110.1" text-anchor="middle">2</text>
<circle cx="564.1" cy="162.8" r="6.5"/>
<text x="580.9" y="169.7" text-anchor="middle">3</text>
<circle cx="543.0" cy="208.9" r="6.5"/>
<text x="555.9" y="224.6" text-anchor="middle">4</text>
<circle cx="500.4" cy="236.4" r="6.5"/>
<text x="505.1" y="257.2" text-anchor="middle">5</text>
<circle cx="449.6" cy="236.4" r="6" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="444.9" y="257.2" text-anchor="middle">6</text>
<circle cx="407.0" cy="208.9" r="6" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="394.1" y="224.6" text-anchor="middle">7</text>
<circle cx="385.9" cy="162.8" r="6" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="369.1" y="169.7" text-anchor="middle">8</text>
<circle cx="393.1" cy="112.6" r="6.5"/>
<text x="377.7" y="110.1" text-anchor="middle">9</text>
<circle cx="426.3" cy="74.3" r="6" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="417.2" y="64.5" text-anchor="middle">10</text>
<circle cx="190" cy="285" r="6"/><text x="202" y="290">square (residue)</text>
<circle cx="360" cy="285" r="6" fill="none" stroke="currentColor" stroke-width="1.6"/><text x="372" y="290">non-square</text>
</svg>
<figcaption>Figure 5.2. The units modulo 13 and modulo 11 around a circle, squares filled. Modulo 13 the picture is mirror-symmetric, because −1 is a square; modulo 11 every square faces a non-square across the axis, because −1 is not.</figcaption>
</figure>

Apart from that symmetry, the squares look scattered, and for large $p$ they behave
much like a random half of the units: the Pólya-Vinogradov inequality (1918) says that
over any stretch of consecutive numbers the squares and non-squares never get ahead
of each other by more than about $\sqrt p \ln p$. Ivan Damgård proposed in 1988 to
use this sequence as a pseudorandom generator. The scattering also has a cost: no fast
rule is known that points to a non-square without trying candidates (§5.7).

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
gives the second supplement $(-1)^{(p^2 - 1)/8}$ (the parity argument below proves
it in one line).

*By hand: is 5 a square modulo 13?* Half of 12 is 6, so take $5, 10, 15, 20, 25,
30$. Modulo 13 they are 5, 10, 2, 7, 12, 4, and moved into the range from $-6$ to
$6$ they are $5, -3, 2, -6, -1, 4$ (Figure 5.3). Their sizes are 5, 3, 2, 6, 1, 4:
each of 1 to 6 exactly once, as the proof says. Three are negative, so
$\left(\frac{5}{13}\right) = (-1)^3 = -1$. Check against the list: the squares
modulo 13 are 1, 3, 4, 9, 10, 12, and 5 is not among them.

<figure class="mars-fig">
<svg viewBox="0 0 640 210" width="640" role="img" aria-label="Gauss&#39;s lemma for a equals 5 and p equals 13: the multiples 5, 10, 15, 20, 25, 30 reduce to 5, minus 3, 2, minus 6, minus 1, 4; three land on the negative side, so 5 is not a square modulo 13" fill="currentColor" font-size="13">
<rect x="70" y="40" width="250" height="90" fill="currentColor" fill-opacity=".08"/>
<text x="195" y="30" text-anchor="middle" fill-opacity=".7">negative half: counted in μ</text>
<text x="445" y="30" text-anchor="middle" fill-opacity=".7">positive half</text>
<line x1="60" y1="110" x2="580" y2="110" stroke="currentColor" stroke-width="1.2"/>
<line x1="80" y1="105" x2="80" y2="115" stroke="currentColor"/><text x="80" y="132" text-anchor="middle" font-size="12">-6</text>
<line x1="120" y1="105" x2="120" y2="115" stroke="currentColor"/><text x="120" y="132" text-anchor="middle" font-size="12">-5</text>
<line x1="160" y1="105" x2="160" y2="115" stroke="currentColor"/><text x="160" y="132" text-anchor="middle" font-size="12">-4</text>
<line x1="200" y1="105" x2="200" y2="115" stroke="currentColor"/><text x="200" y="132" text-anchor="middle" font-size="12">-3</text>
<line x1="240" y1="105" x2="240" y2="115" stroke="currentColor"/><text x="240" y="132" text-anchor="middle" font-size="12">-2</text>
<line x1="280" y1="105" x2="280" y2="115" stroke="currentColor"/><text x="280" y="132" text-anchor="middle" font-size="12">-1</text>
<line x1="320" y1="105" x2="320" y2="115" stroke="currentColor"/><text x="320" y="132" text-anchor="middle" font-size="12">0</text>
<line x1="360" y1="105" x2="360" y2="115" stroke="currentColor"/><text x="360" y="132" text-anchor="middle" font-size="12">1</text>
<line x1="400" y1="105" x2="400" y2="115" stroke="currentColor"/><text x="400" y="132" text-anchor="middle" font-size="12">2</text>
<line x1="440" y1="105" x2="440" y2="115" stroke="currentColor"/><text x="440" y="132" text-anchor="middle" font-size="12">3</text>
<line x1="480" y1="105" x2="480" y2="115" stroke="currentColor"/><text x="480" y="132" text-anchor="middle" font-size="12">4</text>
<line x1="520" y1="105" x2="520" y2="115" stroke="currentColor"/><text x="520" y="132" text-anchor="middle" font-size="12">5</text>
<line x1="560" y1="105" x2="560" y2="115" stroke="currentColor"/><text x="560" y="132" text-anchor="middle" font-size="12">6</text>
<circle cx="520" cy="110" r="7" fill="none" stroke="currentColor" stroke-width="1.8"/>
<text x="520" y="88" text-anchor="middle">1·5</text>
<circle cx="200" cy="110" r="7"/>
<text x="200" y="88" text-anchor="middle">2·5</text>
<circle cx="400" cy="110" r="7" fill="none" stroke="currentColor" stroke-width="1.8"/>
<text x="400" y="88" text-anchor="middle">3·5</text>
<circle cx="80" cy="110" r="7"/>
<text x="80" y="88" text-anchor="middle">4·5</text>
<circle cx="280" cy="110" r="7"/>
<text x="280" y="88" text-anchor="middle">5·5</text>
<circle cx="480" cy="110" r="7" fill="none" stroke="currentColor" stroke-width="1.8"/>
<text x="480" y="88" text-anchor="middle">6·5</text>
<text x="320" y="165" text-anchor="middle">5, 10, 15, 20, 25, 30 reduce to 5, −3, 2, −6, −1, 4: sizes 1 to 6, each once</text>
<text x="320" y="190" text-anchor="middle">three negatives, so (5/13) = (−1)³ = −1: 5 is not a square modulo 13</text>
</svg>
<figcaption>Figure 5.3. Gauss's lemma for a = 5, p = 13. The six multiples 5, 10, …, 30, moved into the range −6 to 6, cover the sizes 1 to 6 once each; three land on the negative side, so 5 is not a square modulo 13.</figcaption>
</figure>

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

That is quadratic reciprocity. Figure 5.4 shows the count for $p = 11$, $q = 7$.

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
<figcaption>Figure 5.4. Eisenstein's proof of quadratic reciprocity, for p = 11, q = 7. The diagonal from the corner splits the 5 × 3 points of the rectangle into two counts whose parities give the two Legendre symbols. Their product is (−1)¹⁵ = −1.</figcaption>
</figure>

(The count below the line is $\lfloor 7/11 \rfloor + \lfloor 14/11 \rfloor +
\lfloor 21/11 \rfloor + \lfloor 28/11 \rfloor + \lfloor 35/11 \rfloor = 0 + 1 +
1 + 2 + 3 = 7$, and $(-1)^7 = -1$; indeed 7 is not among the squares 1, 3, 4, 5, 9
modulo 11. The count above is 8, and 11 ≡ 4 is a square modulo 7.)

### Why the count has the right parity

The step from Gauss's lemma to the lattice count was stated, not proved. It takes
three lines of bookkeeping. Let $p \nmid a$ and, for $k = 1, \dots, \frac{p-1}{2}$,
divide with remainder: $ka = p \lfloor ka/p \rfloor + r_k$ with $0 < r_k < p$. Call
the remainders below $p/2$ the small ones and those above $p/2$ the large ones; the
large ones are exactly the multiples Gauss's lemma counts as negative, since a
large $r$ moves to $r - p < 0$. So there are $\mu$ large remainders. Write $S$ and
$L$ for the sums of the small and the large remainders, $T = \sum_k \lfloor ka/p
\rfloor$, and $K = 1 + 2 + \dots + \frac{p-1}{2} = \frac{p^2-1}{8}$.

1. Adding up the divisions: $aK = pT + S + L$.
2. The proof of Gauss's lemma showed that the small remainders and the numbers $p -
   r$ for the large ones are $1, \dots, \frac{p-1}{2}$ in some order, so $K = S +
   \mu p - L$.
3. Subtracting: $(a - 1)K = p(T - \mu) + 2L$.

Now read the last line modulo 2. If $a$ is odd, $a - 1$ is even and $p$ is odd, so
$T \equiv \mu \pmod 2$: the lattice count and Gauss's count have the same parity,
which is what Eisenstein's picture needs. If $a = 2$, every $\lfloor 2k/p \rfloor$
is 0, so $T = 0$ and the line says $K \equiv \mu \pmod 2$, that is,
$\left(\frac{2}{p}\right) = (-1)^{(p^2-1)/8}$: the second supplement again, this
time without the table. $\blacksquare$

**Code it.** The three statements of this section, Gauss's lemma, the parity of
the lattice count and the law itself, checked on every ordered pair of distinct odd
primes below 300:

```python
def gauss_mu(a, p):
    """Gauss's lemma: how many of a, 2a, ..., ((p-1)/2)a reduce into the upper half."""
    return sum(1 for k in range(1, (p + 1) // 2) if k * a % p > p // 2)

def lattice_count(a, p):
    """Eisenstein: points (k, j) with 0 < k < p/2 and 0 < j < ka/p."""
    return sum(k * a // p for k in range(1, (p + 1) // 2))

def euler(a, p):
    return 1 if pow(a, (p - 1) // 2, p) == 1 else -1

print(gauss_mu(5, 13), lattice_count(5, 13), euler(5, 13))

primes = [n for n in range(3, 300) if all(n % d for d in range(2, int(n ** 0.5) + 1))]
pairs = agree = 0
for p in primes:
    for q in primes:
        if p != q:
            pairs += 1
            lemma = (-1) ** gauss_mu(q, p) == euler(q, p)
            parity = gauss_mu(q, p) % 2 == lattice_count(q, p) % 2
            law = euler(p, q) * euler(q, p) == (-1) ** ((p - 1) // 2 * (q - 1) // 2)
            agree += lemma and parity and law
print(pairs, agree)
```

It prints:

```text
3 5 -1
3660 3660
```

The first line is the example of Figure 5.3: three negatives, five lattice points
(the same parity), and Euler's criterion agrees. The second line says that all
3,660 ordered pairs from the 61 odd primes below 300 pass all three tests. A check
is not a proof, but it is how Euler found the law in the first place.

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

### What the Jacobi symbol does not say

The second line of the output is the warning. $\left(\frac{2}{15}\right) = \left(\frac{2}{3}\right)
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

The algorithm runs in the same time as Euclid's, $O(n^2)$ bit operations for
$n$-bit inputs, and is faster than Euler's criterion. That is what libraries use
to test squareness modulo a prime.

### By hand: the algorithm at work

Here is `jacobi(1001, 9907)` done by hand, without factoring 1001. Each step pulls
out factors of 2 (each one costs a sign when the bottom number is $\equiv 3$ or $5
\pmod 8$), then flips the symbol (which costs a sign when both numbers are $\equiv
3 \pmod 4$), then reduces the new top number modulo the new bottom one.

<div class="mars-steps" markdown>
1. $\left(\frac{1001}{9907}\right)$: no 2s. $1001 \equiv 1 \pmod 4$, so flip with no
   sign: $\left(\frac{9907}{1001}\right) = \left(\frac{898}{1001}\right)$, since
   $9907 = 9 \cdot 1001 + 898$.
2. $898 = 2 \cdot 449$, and $1001 \equiv 1 \pmod 8$, so the 2 costs nothing. $449
   \equiv 1 \pmod 4$: flip, and reduce $1001 = 2 \cdot 449 + 103$:
   $\left(\frac{103}{449}\right)$.
3. $449 \equiv 1 \pmod 4$: flip freely, $449 = 4 \cdot 103 + 37$:
   $\left(\frac{37}{103}\right)$.
4. $37 \equiv 1 \pmod 4$: $103 = 2 \cdot 37 + 29$, so $\left(\frac{29}{37}\right)$.
5. $29 \equiv 1 \pmod 4$: $37 = 29 + 8$, so $\left(\frac{8}{29}\right)$.
6. $8 = 2^3$ and $29 \equiv 5 \pmod 8$, so each 2 costs a sign: $(-1)^3 = -1$. What
   is left is $\left(\frac{1}{29}\right) = 1$. The answer is $-1$.
</div>

That agrees with §5.5, where we factored $1001 = 7 \cdot 11 \cdot 13$ first. The
middle numbers 898, 449, 103, 37 are whatever the divisions produce, some prime and
some not, and the algorithm does not care.

### Why the rules survive for composites

The Jacobi symbol is defined as a product of Legendre symbols, so multiplicativity
is immediate. Reciprocity needs one more fact. For odd $m = \prod p_i$ and $n =
\prod q_j$, apply the law to every pair:

$$\left(\frac{m}{n}\right)\left(\frac{n}{m}\right) = \prod_{i,j} \left(\frac{p_i}{q_j}\right)\left(\frac{q_j}{p_i}\right) = (-1)^{\sum_{i,j} \frac{p_i - 1}{2} \cdot \frac{q_j - 1}{2}}.$$

The exponent factors as $\left(\sum_i \frac{p_i-1}{2}\right)\left(\sum_j
\frac{q_j-1}{2}\right)$, and for odd $u, v$,

$$\frac{uv - 1}{2} - \frac{u - 1}{2} - \frac{v - 1}{2} = \frac{(u-1)(v-1)}{2} \equiv 0 \pmod 2,$$

because $(u-1)(v-1)$ is a multiple of 4. So $\sum_i \frac{p_i - 1}{2} \equiv \frac{m
- 1}{2} \pmod 2$, and likewise for $n$: the composite law has the same form as the
prime one. The same trick with $\frac{u^2v^2 - 1}{8}$ carries over the second
supplement. A shared prime factor makes some $\left(\frac{a}{p_i}\right) = 0$, which
is why the code returns 0 when the gcd is not 1.

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

Each pass strictly lowers the order of $t$, so there are at most $s$ passes (in
fact at most $s - 1$, as the proof below shows).

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

### Why the loop is correct

The invariant of step 2 does all the work: $r^2 = at$, the order of $t$ divides
$2^{m-1}$, and $c$ has order exactly $2^m$.

*At the start.* $r^2 = a^{q+1} = at$, and $t^{2^{s-1}} = a^{(p-1)/2} = 1$ by Euler's
criterion. And $c^{2^{s-1}}
= z^{(p-1)/2} = -1$ because $z$ is a non-square, so $c$ has order exactly $2^s$.

*One pass.* If $t \neq 1$, its order is exactly $2^i$ with $1 \le i < m$, so
$t^{2^{i-1}} = -1$ (the only element of order 2 in a field is $-1$). The element
$b = c^{2^{m-i-1}}$ has order $2^{i+1}$, so $b^2$ has order exactly $2^i$ and also
$(b^2)^{2^{i-1}} = -1$. Then $(tb^2)^{2^{i-1}} = (-1)(-1) = 1$: the new $t$ has
order dividing $2^{i-1}$, which is the invariant for the new $m = i$; the new $c =
b^2$ has order exactly $2^i$; and $(rb)^2 = r^2 b^2 = a \cdot tb^2$. The invariant
holds again, and $m$ has dropped.

*At the end.* When $t = 1$, the invariant reads $r^2 = a$. $\blacksquare$

The first $i$ is at most $s - 1$ and $i$ falls on every pass, so there are at most
$s - 1$ passes, each costing at most about $m$ squarings: the loop adds up to about
$s^2/2$ multiplications to the exponentiations. Nothing when $s = 2$; a great deal
when $s$ is large.

### A long run: the square root of 2 modulo 12289

Some primes are chosen *because* $p - 1$ has a high power of 2: the number-theoretic
transform ([Chapter 11](11-Polynomials-at-Work.md), [Chapter
15](15-Learning-with-Errors.md)) needs roots of unity of order $2^k$, which exist
only when $2^k \mid p - 1$. The prime $12289 = 3 \cdot 2^{12} + 1$ is the modulus of
the NewHope key exchange (2016) and of the Falcon signature scheme, and $7681 = 15
\cdot 2^9 + 1$ was the modulus of the first version of Kyber (2017). For
Tonelli-Shanks these are the awkward primes: for 12289, $s = 12$ and $q = 3$.

Take $a = 2$, a square because $12289 \equiv 1 \pmod 8$. First find a non-square.
Reciprocity does it without any exponentiation: $12289 \equiv 1 \pmod 4$, so
$\left(\frac{\ell}{12289}\right) = \left(\frac{12289}{\ell}\right)$ for odd primes
$\ell$, and $12289$ leaves remainder 1 modulo 3, 4 modulo 5 and 4 modulo 7 (all
squares), but 2 modulo 11, and 2 is not a square modulo 11. So $z = 11$, and the start
is

$$c = 11^3 = 1331, \qquad t = 2^3 = 8, \qquad r = 2^2 = 4, \qquad m = 12,$$

with $r^2 = 16 = 2 \cdot 8 = at$ as the invariant says.

*Pass 1.* Square $t$ until it reaches 1: $8 \to 64 \to 4096 \to 2731 \to 11227 \to
9545 \to 8668 \to 11567 \to 5146 \to 10810 \to 12288 \to 1$. The tenth square is
$12288 = -1$ and the eleventh is 1, so $i = 11$ and $b = c^{2^{12-11-1}} = c = 1331$.
Then $c \leftarrow 1331^2 = 1771561 = 144 \cdot 12289 + 1945$, so $c = 1945$; $t
\leftarrow 8 \cdot 1945 = 15560 \equiv 3271$; $r \leftarrow 4 \cdot 1331 = 5324$.
Check: $5324^2 \equiv 6542 = 2 \cdot 3271$.

The other passes go the same way (in pass 2, nine squarings bring $t = 3271$ to 1, so
$i = 9$ and $b = 1945^2 \equiv 10302$), and the code below prints the whole run. So $\sqrt 2 \equiv 9189$, and the other root is $12289 - 9189 = 3100$; indeed $3100^2
= 9610000 = 782 \cdot 12289 + 2$. Nine passes: the order of $t$ went $2^{11}, 2^9,
2^8, 2^6, 2^5, 2^4, 2^3, 2^2, 2, 1$, skipping $2^{10}$ and $2^7$ (Figure 5.5).

```python
def tonelli_shanks_trace(a, p):
    """Tonelli-Shanks, printing one row per pass of the loop."""
    q, s = p - 1, 0
    while q % 2 == 0:
        q, s = q // 2, s + 1
    z = 2
    while pow(z, (p - 1) // 2, p) != p - 1:
        z += 1
    m, c, t, r = s, pow(z, q, p), pow(a, q, p), pow(a, (q + 1) // 2, p)
    print(f"s = {s}, q = {q}, z = {z}")
    print("pass   i      b      c      t      r")
    print(f"{0:4} {'':>3} {'':>6} {c:6} {t:6} {r:6}")
    n = 0
    while t != 1:
        i, t2 = 0, t
        while t2 != 1:                    # least i with t^(2^i) = 1
            t2 = t2 * t2 % p
            i += 1
        b = pow(c, 1 << (m - i - 1), p)
        m, c, t, r = i, b * b % p, t * b * b % p, r * b % p
        n += 1
        print(f"{n:4} {i:3} {b:6} {c:6} {t:6} {r:6}")
        assert r * r % p == a * t % p     # the invariant holds on every pass
    return r

r = tonelli_shanks_trace(2, 12289)
print(r, r * r % 12289)
```

It prints:

```text
s = 12, q = 3, z = 11
pass   i      b      c      t      r
   0              1331      8      4
   1  11   1331   1945   3271   5324
   2   9  10302   3400  12144   2041
   3   8   3400   8340   7311   8404
   4   6  12149   7311   5860   3184
   5   5   7311   5860   4134   2858
   6   4   5860   4134   8246  10262
   7   3   4134   8246   1479   1480
   8   2   8246   1479  12288   1103
   9   1   1479  12288      1   9189
9189 2
```

<figure class="mars-fig">
<svg viewBox="0 0 640 320" width="640" role="img" aria-label="The Tonelli-Shanks loop, and the order of t falling from 2 to the 11 to 1 in nine passes for the square root of 2 modulo 12289" fill="currentColor" font-size="13">
<g fill="none" stroke="currentColor" stroke-width="1.3">
<rect x="20" y="30" width="250" height="40" rx="6"/>
<rect x="20" y="95" width="250" height="40" rx="6"/>
<rect x="20" y="160" width="250" height="40" rx="6"/>
<rect x="20" y="225" width="250" height="40" rx="6"/>
<path d="M145 70 L145 95"/><path d="M145 135 L145 160"/><path d="M145 200 L145 225"/>
<path d="M145 265 L145 285 L290 285 L290 115 L270 115"/>
</g>
<g fill="currentColor"><path d="M141 89 L145 95 L149 89 Z"/><path d="M141 154 L145 160 L149 154 Z"/><path d="M141 219 L145 225 L149 219 Z"/><path d="M276 111 L270 115 L276 119 Z"/></g>
<g text-anchor="middle">
<text x="145" y="55">r = a^((q+1)/2), t = a^q, m = s</text>
<text x="145" y="120">t = 1? then r² = a: stop</text>
<text x="155" y="152" text-anchor="start" font-size="12" fill-opacity=".7">no</text>
<text x="145" y="185">least i with t^(2^i) = 1</text>
<text x="145" y="250">b = c^(2^(m−i−1))</text>
<text x="145" y="303" font-size="12">r ← rb, t ← tb², c ← b², m ← i</text>
</g>
<line x1="337" y1="270" x2="625" y2="270" stroke="currentColor"/>
<line x1="337" y1="270" x2="337" y2="54" stroke="currentColor"/>
<text x="332" y="274" text-anchor="end" font-size="11">1</text>
<text x="332" y="220" text-anchor="end" font-size="11">2³</text>
<text x="332" y="166" text-anchor="end" font-size="11">2⁶</text>
<text x="332" y="112" text-anchor="end" font-size="11">2⁹</text>
<text x="332" y="76" text-anchor="end" font-size="11">2¹¹</text>
<rect x="345" y="72" width="20" height="198" fill-opacity=".55"/>
<text x="355" y="286" text-anchor="middle" font-size="11">0</text>
<text x="355" y="67" text-anchor="middle" font-size="11">11</text>
<rect x="373" y="108" width="20" height="162" fill-opacity=".55"/>
<text x="383" y="286" text-anchor="middle" font-size="11">1</text>
<text x="383" y="103" text-anchor="middle" font-size="11">9</text>
<rect x="401" y="126" width="20" height="144" fill-opacity=".55"/>
<text x="411" y="286" text-anchor="middle" font-size="11">2</text>
<text x="411" y="121" text-anchor="middle" font-size="11">8</text>
<rect x="429" y="162" width="20" height="108" fill-opacity=".55"/>
<text x="439" y="286" text-anchor="middle" font-size="11">3</text>
<text x="439" y="157" text-anchor="middle" font-size="11">6</text>
<rect x="457" y="180" width="20" height="90" fill-opacity=".55"/>
<text x="467" y="286" text-anchor="middle" font-size="11">4</text>
<text x="467" y="175" text-anchor="middle" font-size="11">5</text>
<rect x="485" y="198" width="20" height="72" fill-opacity=".55"/>
<text x="495" y="286" text-anchor="middle" font-size="11">5</text>
<text x="495" y="193" text-anchor="middle" font-size="11">4</text>
<rect x="513" y="216" width="20" height="54" fill-opacity=".55"/>
<text x="523" y="286" text-anchor="middle" font-size="11">6</text>
<text x="523" y="211" text-anchor="middle" font-size="11">3</text>
<rect x="541" y="234" width="20" height="36" fill-opacity=".55"/>
<text x="551" y="286" text-anchor="middle" font-size="11">7</text>
<text x="551" y="229" text-anchor="middle" font-size="11">2</text>
<rect x="569" y="252" width="20" height="18" fill-opacity=".55"/>
<text x="579" y="286" text-anchor="middle" font-size="11">8</text>
<text x="579" y="247" text-anchor="middle" font-size="11">1</text>
<text x="607" y="286" text-anchor="middle" font-size="11">9</text>
<text x="607" y="265" text-anchor="middle" font-size="11">0</text>
<text x="480" y="304" text-anchor="middle" font-size="12">pass</text>
<text x="485" y="24" text-anchor="middle">order of t, square root of 2 mod 12289</text>
</svg>
<figcaption>Figure 5.5. The Tonelli-Shanks loop (left) and its run for the square root of 2 modulo 12289 (right): each pass cancels t's top power of 2, and its order falls from 2¹¹ to 1 in nine passes.</figcaption>
</figure>

Two things stand out. First, every $b$ and every $c$ in the run comes from one
list, the repeated squares of the first $c$: 1331, 1945, 10302, 3400, 8340, 12149,
7311, 5860, 4134, 8246, 1479, 12288. The list depends on $p$ only, not on $a$, so a
library can compute it once per prime and look up $b$. Daniel Bernstein (2001) and
Palash Sarkar (2020) extended the idea with tables that also shorten the search for
$i$; the Pasta curves of Zcash's Halo 2, whose primes both have $s = 32$, use Sarkar's
method.

Second, the number of passes follows a simple rule. Over all 6,144 squares modulo
12289 it ranges from 0 to 11, with counts $3\binom{11}{k}$: $t = a^q$ can be written as
$c^{-2e}$ with $0 \le e < 2^{11}$, each pass clears the lowest 1 bit of $e$, and so
the passes are the 1 bits of $e$ (for $a = 2$, $e = 2029 = 11111101101_2$, nine of
them). A random square needs about $(s - 1)/2$ passes, and at most $s - 1$.

A constant-time implementation cannot stop early, since a secret-dependent number of
passes leaks timing. RFC 9380 (Appendix I.4) gives a Tonelli-Shanks that always runs
the same steps, with conditional moves in place of each "if": the worst case becomes
the only case.

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

*By hand.* Take $N = 253 = 11 \cdot 23$ and pretend not to know the factors. Pick $x =
20$ and send $a = 400 - 253 = 147$ to the root-finder. The square 147 has four roots
modulo 253: 20, 112, 141 and 233 (they are $\pm 2$ or $\pm 9$ modulo 11, combined
with $\pm 3$ or $\pm 20$ modulo 23). If the finder answers 20 or $233 = -20$, we
learned nothing and try another $x$. If it answers 141, then $\gcd(20 - 141, 253) =
\gcd(121, 253) = 11$, and $253 / 11 = 23$. If it answers 112, $\gcd(20 - 112, 253) =
\gcd(92, 253) = 23$.

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
<figcaption>Figure 5.6. Why square roots modulo N = pq factor N. A square has four roots, from the sign choices modulo p and modulo q. Half of them are "mixed" (±y), and any mixed root together with x reveals a prime factor through one gcd.</figcaption>
</figure>

The converse is also true (knowing the factors gives roots), so **computing
square roots modulo $N$ is equivalent to factoring $N$**. This is a reduction in
the sense of Chapter 1 and Chapter 19: an attacker on square roots is turned
into a factoring algorithm. It is also the precise form of Fermat's idea from
Chapter 2: two squares congruent modulo $N$ factor it.

### Code it: the reduction

The proof is an algorithm, so it can be run. The square-root box below knows $p$ and
$q$ and answers with the smallest of the four roots, a rule as good as any other. The
reducer gets only $N$ and the box, and follows the proof (Figure 5.7):

<figure class="mars-fig">
<svg viewBox="0 0 640 260" width="640" role="img" aria-label="Rabin's reduction as a loop: pick a random x, send its square to the square-root box, get back a root y; if y is plus or minus x, try again, which happens half the time; otherwise the gcd of x minus y and N is a prime factor. The example N equals 253, x equals 20, square 147, returned root 141, gcd 11" fill="currentColor" font-size="13">
<g fill="none" stroke="currentColor" stroke-width="1.3">
<rect x="20" y="40" width="250" height="150" rx="8"/>
<rect x="420" y="40" width="200" height="90" rx="8" stroke-dasharray="6 4"/>
<path d="M270 75 L420 75"/>
<path d="M420 110 L270 110"/>
<path d="M145 190 L145 215 L20 215"/>
<path d="M10 215 L10 60 L20 60"/>
</g>
<g fill="currentColor">
<path d="M414 71 L420 75 L414 79 Z"/><path d="M276 106 L270 110 L276 114 Z"/><path d="M14 56 L20 60 L14 64 Z"/>
</g>
<text x="145" y="30" text-anchor="middle">the reducer: knows only N</text>
<text x="520" y="30" text-anchor="middle">square-root box: knows p, q</text>
<text x="40" y="66">1. random x</text>
<text x="40" y="98">2. a = x² mod N</text>
<text x="40" y="130">3. receive y with y² = a</text>
<text x="40" y="162">4. y = ±x ? try again</text>
<text x="40" y="182" font-weight="bold">5. else gcd(x − y, N)</text>
<text x="345" y="68" text-anchor="middle">a</text>
<text x="345" y="128" text-anchor="middle">y</text>
<text x="520" y="80" text-anchor="middle">returns one of the</text>
<text x="520" y="100" text-anchor="middle">four roots of a</text>
<text x="40" y="232" font-size="12" fill-opacity=".7">probability 1/2 each time</text>
<text x="300" y="170">N = 253: x = 20, a = 147,</text>
<text x="300" y="190">box returns y = 141,</text>
<text x="300" y="210" font-weight="bold">gcd(20 − 141, 253) = 11</text>
<text x="300" y="230">and 253 = 11 · 23</text>
</svg>
<figcaption>Figure 5.7. Rabin's reduction as a program. The reducer never learns p or q; it only squares, asks, compares and takes one gcd. Half of the answers are useless and half factor N, whatever rule the box uses to pick a root.</figcaption>
</figure>

```python
import random
from math import gcd

def make_oracle(p, q):
    """A square-root box for N = pq. It knows p and q; its caller does not."""
    def oracle(a):
        rp, rq = pow(a, (p + 1) // 4, p), pow(a, (q + 1) // 4, q)  # p, q are 3 mod 4
        roots = [s + p * ((t - s) * pow(p, -1, q) % q)
                 for s in (rp, p - rp) for t in (rq, q - rq)]
        return min(roots)                 # any rule at all for choosing a root
    return p * q, oracle

def factor_with(N, oracle, rng):
    """Rabin's reduction: factor N using only N and the oracle."""
    tries = 0
    while True:
        tries += 1
        x = rng.randrange(2, N)
        if gcd(x, N) > 1:                 # never happens in practice
            return gcd(x, N), tries
        y = oracle(x * x % N)
        if y != x and y != N - x:
            return gcd(x - y, N), tries

rng = random.Random(2026)
N, oracle = make_oracle(10007, 10039)
print([factor_with(N, oracle, rng) for _ in range(6)])
tries = [factor_with(N, oracle, rng)[1] for _ in range(10000)]
print(sum(tries) / len(tries), max(tries))
```

It prints:

```text
[(10007, 2), (10007, 1), (10007, 1), (10007, 3), (10039, 3), (10039, 1)]
1.9897 19
```

Each run finds a prime factor of $N = 100{,}460{,}273$, after 1 to 3 calls to the box.
Over 10,000 runs the average is 1.99 calls, as a success chance of $1/2$ per call
predicts (the expected number of tries is 2), and the worst run needed 19. Nothing in
`factor_with` depends on how the box chooses its root, which is the whole point of
the theorem: the box cannot avoid helping.

The same congruence $x^2 \equiv y^2$ with $x \not\equiv \pm y$ is what the quadratic
sieve and the number field sieve produce in bulk, without any box, by multiplying
many small relations together ([*Cryptanalysis*,
§11.7](../cryptanalysis/11-Factoring.md#117-congruent-squares-and-the-quadratic-sieve-by-hand)).

### More primes, prime powers

Nothing above needs exactly two primes. If $N$ has $k$ distinct odd prime factors,
the CRT gives $2^k$ square roots of each square, and a random root differs from $\pm x$
with probability $1 - 2^{1-k}$, so the reduction works even better. Modulo a prime
power $p^e$ a square still has just two roots, and they are found by **Hensel
lifting**: from a root modulo $p$, correct it one power of $p$ at a time. *By hand:*
modulo 7, $3^2 = 9 \equiv 2$. Look for a root of 2 modulo 49 of the form $3 + 7k$:
$(3 + 7k)^2 = 9 + 42k + 49k^2 \equiv 9 + 42k \pmod{49}$, and $9 + 42k \equiv 2$ means
$42k \equiv -7$, that is $6k \equiv -1 \equiv 6 \pmod 7$, so $k = 1$ and the root is
10. Check: $100 = 2 \cdot 49 + 2$. Each lift solves one linear congruence, so roots
modulo $p^e$ cost little more than roots modulo $p$.

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

*By hand, with $N = 77 = 7 \cdot 11$.* The squares modulo 7 are 1, 2, 4 and modulo
11 they are 1, 3, 4, 5, 9. The number $y = 24$ is $3 \bmod 7$ and $2 \bmod 11$, a
non-square modulo both, so it is a pseudosquare: $\left(\frac{24}{77}\right) =
(-1)(-1) = +1$. To encrypt the bit 1 with $r = 5$: $c = 24 \cdot 25 = 600 \equiv 61$.
To encrypt the bit 0 with $r = 13$: $c = 169 \equiv 15$. The owner decrypts with
Euler's criterion modulo 7: $61 \equiv 5$ and $5^3 = 125 \equiv 6 = -1$, a
non-square, so the bit is 1; $15 \equiv 1$ and $1^3 = 1$, a square, so the bit is 0.
An outsider computes $\left(\frac{61}{77}\right) = \left(\frac{5}{7}\right)
\left(\frac{6}{11}\right) = (-1)(-1) = +1$ and $\left(\frac{15}{77}\right) = +1$, the
same for both.

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
<figcaption>Figure 5.8. Goldwasser-Micali encryption. A 0 is sent as a random square and a 1 as a random pseudosquare. Both have Jacobi symbol +1, so the public computation reveals nothing; telling them apart is the quadratic residuosity problem.</figcaption>
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

def jacobi(c, n):                        # here from the factors, for brevity; the
    lp = 1 if pow(c, (p - 1) // 2, p) == 1 else -1   # public jacobi() of §5.6 gives
    lq = 1 if pow(c, (q - 1) // 2, q) == 1 else -1   # the same without p and q
    return lp * lq

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

### Why it is secure, in outline

The proof is a reduction in the style of §5.8. Suppose an attacker $A$, given a public
key $(N, y)$ and a ciphertext, guesses the bit with probability $\frac12 +
\varepsilon$. Use $A$ to decide whether a number $z$ with Jacobi symbol $+1$ is a
square modulo $N$: hand $A$ the "public key" $(N, z)$, choose a bit $b$ and a random
$r$, and give it $c = z^b r^2$.

- If $z$ is a pseudosquare, $(N, z)$ is a genuine key and $c$ a genuine encryption of
  $b$, so $A$ finds $b$ with probability $\frac12 + \varepsilon$.
- If $z$ is a square, then $c$ is a uniformly random square whatever $b$ is. Nothing
  $A$ sees depends on $b$, and it is right with probability exactly $\frac12$.

So "$A$ was right" is evidence that $z$ is a pseudosquare, with an edge of
$\varepsilon$: an attack on the encryption becomes, at the same cost, an algorithm for
the quadratic residuosity problem. That is the shape of every later proof of
semantic security, which is why this small scheme matters so much more than its
deployment. The *Advanced protocols and privacy* book takes it up as the first
homomorphic scheme and goes on to Paillier ([*Advanced*,
§12.3](../advanced/12-Homomorphic-Encryption.md#123-goldwasser-micali-encrypted-bits-that-add)).

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
start of an **invalid-curve attack**. Chapter 12 treats compression as part of the
curve's encoding ([§12.9](12-Elliptic-Curve-Group.md#129-point-compression)); here
is the square root inside it.

### Decompression in code

Here is SEC 1 decompression on P-256 itself, applied to the standard base point $G$,
whose compressed form starts with `03` because its $y$ is odd. The decoder rejects a
prefix other than `02` or `03`, an $x$ that is not reduced, and an $x$ for which
$x^3 - 3x + b$ has no square root:

```python
# Decompress a SEC 1 point on P-256: prefix 02 or 03, then 32 bytes of x.
p = 2**256 - 2**224 + 2**192 + 2**96 - 1
b = 0x5ac635d8aa3a93e7b3ebbd55769886bc651d06b0cc53b0f63bce3c3e27d2604b

def decompress(blob):
    if len(blob) != 33 or blob[0] not in (2, 3):
        return None
    x = int.from_bytes(blob[1:], "big")
    if x >= p:
        return None
    rhs = (x**3 - 3 * x + b) % p
    y = pow(rhs, (p + 1) // 4, p)         # p = 3 mod 4: one exponentiation
    if y * y % p != rhs:                  # not a square: no point has this x
        return None
    if y % 2 != blob[0] % 2:              # 02 means y even, 03 means y odd
        y = p - y
    return x, y

G = bytes.fromhex("03" "6b17d1f2e12c4247f8bce6e563a440f277037d812deb33a0f4a13945d898c296")
x, y = decompress(G)
print(hex(y))
bad = next(x for x in range(1, 100) if decompress(bytes([2]) + x.to_bytes(32, "big")) is None)
print(bad, decompress(bytes([2]) + (bad + 1).to_bytes(32, "big")) is not None)
valid = sum(decompress(bytes([2]) + x.to_bytes(32, "big")) is not None for x in range(1, 1001))
print(valid)
```

It prints:

```text
0x4fe342e2fe1a7f9b8ee7eb4a7c0f9e162bce33576b315ececbb6406837bf51f5
1 False
515
```

The first line is the $y$-coordinate of $G$ as printed in SP 800-186.
The second shows that neither $x = 1$ nor $x = 2$ is the $x$-coordinate of any point:
their right-hand sides are non-squares. The third counts the valid $x$ among $1,
\dots, 1000$: 515, close to half, as §5.2 predicts for the right-hand side behaving
like a random number. The line `if y * y % p != rhs` is the whole defense against
being handed an $x$ that is not on the curve. Without it, the decoder returns a
"point" with $y^2 = -\text{rhs}$, which is not on P-256 at all. The addition formulas
never look at $b$, so the device goes on computing in the group of some other curve
$y^2 = x^3 - 3x + b'$, picked by the attacker, whose order may have small factors;
Chapter 12 builds that attack
([§12.10](12-Elliptic-Curve-Group.md#1210-break-it-the-invalid-curve-attack)), and
the *Cryptanalysis* book shows it against real protocols ([*Cryptanalysis*,
§12.9](../cryptanalysis/12-Discrete-Logarithms.md#129-small-subgroups-and-invalid-curves)).

### The case $p \equiv 5 \pmod 8$: Ed25519

For $p = 2^{255} - 19$ the prime is $\equiv 5 \pmod 8$, and two short formulas
replace Tonelli-Shanks.

*The one RFC 8032 uses.* Let $x = a^{(p+3)/8}$. Then $x^4 = a^{(p+3)/2} = a^2 \cdot
a^{(p-1)/2} = a^2$, so $x^2 = \pm a$. If $x^2 = a$, done. If $x^2 = -a$, multiply by a
square root of $-1$: since $p \equiv 5 \pmod 8$, 2 is a non-square (the second
supplement), so $i = 2^{(p-1)/4}$ satisfies $i^2 = 2^{(p-1)/2} = -1$, and $(xi)^2 =
-x^2 = a$. That is the `recover_x` function of
[§12.8](12-Elliptic-Curve-Group.md#128-twisted-edwards-curves-and-complete-formulas),
where the $a$ is $(y^2 - 1)/(dy^2 + 1)$.

*Atkin's (1992).* Let $v = (2a)^{(p-5)/8}$ and $i = 2av^2$. Then $i^2 = 4a^2 v^4 =
(2a)^2 (2a)^{(p-5)/2} = (2a)^{(p-1)/2} = \left(\frac{2}{p}\right)\left(\frac{a}{p}
\right) = -1$, so $i$ is a square root of $-1$, and $x = av(i - 1)$ has $x^2 = a^2v^2
(i^2 - 2i + 1) = -2i \cdot a^2 v^2 = -i^2 a = a$, using $av^2 = i/2$. One exponentiation
and no branch at all.

*By hand, $p = 13$, $a = 10$.* $(p + 3)/8 = 2$: $x = 10^2 = 100 \equiv 9$, and $9^2 =
81 \equiv 3 = -10$, the wrong sign. The square root of $-1$ is $2^{(13-1)/4} = 8$, and
$9 \cdot 8 = 72 \equiv 7$, with $7^2 = 49 \equiv 10$. Atkin: $(p - 5)/8 = 1$, $v = 20
\equiv 7$, $i = 2 \cdot 10 \cdot 49 = 980 \equiv 5$ (and $5^2 = 25 \equiv -1$), $x = 10
\cdot 7 \cdot 4 = 280 \equiv 7$. Both give 7, the root that Tonelli-Shanks found in
§5.7. RFC 9380 (Appendix I.2) writes the first method in constant time: compute both
$x$ and $xi$, and keep the right one with a conditional move instead of a branch.

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

### Cipolla's algorithm

Michele Cipolla (in the early 1900s; sources give dates from 1903 to 1907) gave a
second square-root method whose cost does not depend on $s$. It steps out of
$\mathbb{F}_p$ into a field twice as large and comes back with the answer.

**The method.** Given a square $a$ modulo $p$:

1. Find $t$ with $t^2 - a$ a non-square (try $t = 0, 1, 2, \dots$; about half work).
2. Let $w = t^2 - a$ and work in $\mathbb{F}_{p^2} = \mathbb{F}_p(\omega)$, the numbers
   $u_0 + u_1\omega$ with $\omega^2 = w$ ([Chapter 8](08-Rings-Fields-and-Polynomials.md)
   builds such fields; this one exists because $w$ has no square root in
   $\mathbb{F}_p$).
3. Return $x = (t + \omega)^{(p+1)/2}$, which turns out to lie in $\mathbb{F}_p$.

*Why it works.* First, $\omega^p = \omega \cdot (\omega^2)^{(p-1)/2} = \omega \cdot
w^{(p-1)/2} = -\omega$, by Euler's criterion for the non-square $w$. Next, raising to
the power $p$ is additive in characteristic $p$ (the binomial coefficients
$\binom{p}{k}$ for $0 < k < p$ are multiples of $p$), so $(t + \omega)^p = t^p +
\omega^p = t - \omega$, using Fermat for $t$. Therefore

$$x^2 = (t + \omega)^{p+1} = (t + \omega)(t - \omega) = t^2 - w = a.$$

Finally, $a$ already has two square roots in $\mathbb{F}_p$, and the polynomial $X^2 -
a$ has only two roots in the larger field too, so $x$ is one of them: its
$\omega$-part is 0. $\blacksquare$

*By hand: the square root of 10 modulo 13 again.* $t = 0$ gives $-10 \equiv 3$, a
square; $t = 1$ gives $-9 \equiv 4$, a square; $t = 2$ gives $4 - 10 \equiv 7$, a
non-square. So $\omega^2 = 7$ and we need $(2 + \omega)^7$:

- $(2 + \omega)^2 = 4 + 4\omega + 7 = 11 + 4\omega$;
- $(2 + \omega)^4 = (11 + 4\omega)^2 = 121 + 88\omega + 16 \cdot 7 = 233 + 88\omega \equiv
  12 + 10\omega$;
- $(2 + \omega)^6 = (12 + 10\omega)(11 + 4\omega) = 132 + 280 + (48 + 110)\omega = 412 +
  158\omega \equiv 9 + 2\omega$;
- $(2 + \omega)^7 = (9 + 2\omega)(2 + \omega) = 18 + 14 + (9 + 4)\omega = 32 + 13\omega
  \equiv 6 + 0\omega$.

The $\omega$-part vanished, as promised, and $6^2 = 36 \equiv 10$. (Tonelli-Shanks found
7, the other root.)

```python
def cipolla(a, p):
    """A square root of the residue a modulo the odd prime p, by Cipolla's method."""
    t = 0
    while pow(t * t - a, (p - 1) // 2, p) != p - 1:   # t^2 - a must be a non-residue
        t += 1
    w = (t * t - a) % p                   # F_p^2 = F_p(omega) with omega^2 = w

    def mul(u, v):                        # (u0 + u1 omega)(v0 + v1 omega)
        return ((u[0] * v[0] + u[1] * v[1] * w) % p, (u[0] * v[1] + u[1] * v[0]) % p)

    result, base, e = (1, 0), (t, 1), (p + 1) // 2
    while e:                              # (t + omega)^((p+1)/2)
        if e & 1:
            result = mul(result, base)
        base, e = mul(base, base), e >> 1
    assert result[1] == 0                 # the answer lies in F_p
    return t, w, result[0]

print(cipolla(10, 13))
print(cipolla(2, 12289), 12289 - 9189)
```

It prints:

```text
(2, 7, 6)
(5, 23, 9189) 3100
```

For $\sqrt 2$ modulo 12289 Cipolla needs no loop at all: $t = 5$ makes $25 - 2 = 23$ a
non-square, and one exponentiation in $\mathbb{F}_{p^2}$ lands on 9189, the root of the
long Tonelli-Shanks run in §5.7.

### When Cipolla wins

Each multiplication in $\mathbb{F}_{p^2}$ costs about five in $\mathbb{F}_p$ the way
the code does it (three or four with care), so Cipolla's exponentiation is several
times dearer than one in $\mathbb{F}_p$. Tonelli-Shanks pays one exponentiation in
$\mathbb{F}_p$ plus up to about $s^2/2$ for the loop. So Tonelli-Shanks wins when $s$ is
small and Cipolla wins when $s^2$ grows past a few times $\log_2 p$. Counting
multiplications in plain Python versions of both, averaged over 20 random squares
for each of three real primes (Tonelli-Shanks shares one exponentiation between $r$
and $t$: $w = a^{(q-1)/2}$, $r = aw$, $t = rw$; Cipolla's search for $t$ is not
counted):

| prime | $s$ | Tonelli-Shanks | Cipolla |
|---|---|---|---|
| $2^{255} - 19$ | 2 | 505 | 2,525 |
| Pallas (Pasta) | 32 | 575 | 1,495 |
| P-224 | 96 | 2,763 | 1,750 |

For Curve25519's prime Tonelli-Shanks is five times cheaper (and the formulas of
§5.11 cheaper still). For the Pasta prime with $s = 32$ it still wins on average,
though an input that needs all 31 passes costs it far more than the average. For P-224, whose prime $2^{224} - 2^{96} + 1$
has $p - 1 = 2^{96}(2^{128} - 1)$ and so $s = 96$, Cipolla is cheaper, and a
constant-time Tonelli-Shanks, which must always pay the worst case of about $96^2/2
\approx 4{,}600$ squarings, is far worse. Cipolla has its own catch: its search for $t$
depends on $a$, which constant-time code must hide. Siguna Müller (2004) and later work
refine both families for the awkward cases.

### Square roots in $\mathbb{F}_{p^2}$

Pairing-friendly curves ([Chapter 13](13-Counting-Points-and-Pairings.md#139-pairing-friendly-curves))
put their second group, $G_2$, on a curve over $\mathbb{F}_{p^2}$. For BN254 and
BLS12-381 the prime is $\equiv 3 \pmod 4$, so $-1$ is a non-square and $\mathbb{F}_{p^2} =
\mathbb{F}_p(i)$ with $i^2 = -1$: the "complex numbers" modulo $p$. A compressed
$G_2$ point (96 bytes on BLS12-381, against 192 uncompressed) is decompressed with a
square root in this field, and hashing to $G_2$ (RFC 9380) needs one too. Since
$p^2 \equiv 1 \pmod 8$ always, the easy formulas do not apply in $\mathbb{F}_{p^2}$, but
the "complex method" (used in 2007 by Augusto Jun Devegili, Michael Scott and
Ricardo Dahab for BN curves; Gora Adj and Francisco Rodríguez-Henríquez studied it and
its relatives in 2014) reduces the problem to two
square roots in $\mathbb{F}_p$, exactly as one takes square roots of complex numbers by
hand.

**Which elements are squares.** The **norm** $N(a_0 + a_1 i) = a_0^2 + a_1^2 = (a_0 + a_1
i)(a_0 - a_1 i)$ lies in $\mathbb{F}_p$ and is multiplicative. It equals $\alpha^{p+1}$
for $\alpha = a_0 + a_1 i$, because $\alpha^p = a_0 - a_1 i$ (the same Frobenius step
as in Cipolla). So $\alpha^{(p^2 - 1)/2} = (\alpha^{p+1})^{(p-1)/2} = N(\alpha)^{(p-1)/2}$,
and by Euler's criterion in both fields, $\alpha$ is a square in $\mathbb{F}_{p^2}$
exactly when its norm is a square in $\mathbb{F}_p$. That is the `is_square` of RFC
9380, Appendix I.5: a test in the big field done with one Legendre symbol in the small
one.

**The root.** Want $x_0 + x_1 i$ with $(x_0 + x_1 i)^2 = a_0 + a_1 i$, that is $x_0^2 -
x_1^2 = a_0$ and $2x_0x_1 = a_1$. Taking norms, $x_0^2 + x_1^2 = \alpha$ with $\alpha^2 =
a_0^2 + a_1^2$. Add the two equations: $x_0^2 = (a_0 + \alpha)/2$. So:

1. Compute $\alpha = \sqrt{a_0^2 + a_1^2}$ in $\mathbb{F}_p$ (if there is none, $a$ is
   not a square).
2. Compute $x_0 = \sqrt{(a_0 + \alpha)/2}$; if that is not a square, use $-\alpha$
   instead. Exactly one of the two works, because their product is $(a_0^2 -
   \alpha^2)/4 = -a_1^2/4$, a non-square when $a_1 \neq 0$.
3. Set $x_1 = a_1 / (2x_0)$. (If $a_1 = 0$, the root is $\sqrt{a_0}$ or $i\sqrt{-a_0}$.)

*Check:* $x_0^2 - x_1^2 = \frac{a_0 + \alpha}{2} - \frac{a_1^2}{2(a_0 + \alpha)} =
\frac{(a_0 + \alpha)^2 - a_1^2}{2(a_0 + \alpha)} = \frac{2a_0^2 + 2a_0\alpha}{2(a_0 +
\alpha)} = a_0$, using $\alpha^2 = a_0^2 + a_1^2$.

*By hand, $p = 11$, $a = 3 + 5i$.* The norm is $9 + 25 = 34 \equiv 1$, a square, with
$\alpha = \pm 1$. With $\alpha = 1$: $(3 + 1)/2 = 2$, not a square modulo 11. With
$\alpha = -1$: $(3 - 1)/2 = 1$, so $x_0 = 1$. Then $x_1 = 5/2 = 5 \cdot 6 = 30 \equiv
8$. Check: $(1 + 8i)^2 = 1 - 64 + 16i = -63 + 16i \equiv 3 + 5i$.

```python
# Square roots in F_p^2 = F_p(i), i^2 = -1, for p = 3 mod 4: the "complex method".
import random

def sqrt_fp(a, p):                        # p = 3 mod 4
    x = pow(a, (p + 1) // 4, p)
    return x if x * x % p == a % p else None

def sqrt_fp2(a0, a1, p):
    """A square root of a0 + a1 i in F_p(i), or None."""
    if a1 % p == 0:                       # a lies in F_p: its root is x or x i
        x = sqrt_fp(a0, p)
        return (x, 0) if x is not None else (0, sqrt_fp(-a0, p))
    alpha = sqrt_fp(a0 * a0 + a1 * a1, p) # the norm must be a square in F_p
    if alpha is None:
        return None
    half = pow(2, -1, p)
    x0 = sqrt_fp((a0 + alpha) * half, p)
    if x0 is None:                        # the other sign of alpha works instead
        x0 = sqrt_fp((a0 - alpha) * half, p)
    x1 = a1 * pow(2 * x0, -1, p) % p
    return x0, x1

def square(x0, x1, p):
    return (x0 * x0 - x1 * x1) % p, 2 * x0 * x1 % p

print(sqrt_fp2(3, 5, 11), square(1, 8, 11))

p = 0x1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaaab
rng = random.Random(381)
ok = found = 0
for _ in range(1000):
    a = (rng.randrange(p), rng.randrange(p))
    r = sqrt_fp2(*a, p)
    if r is not None:
        found += 1
        ok += square(*r, p) == a
print(p % 4, found, ok)
```

It prints:

```text
(1, 8) (3, 5)
3 513 513
```

The second line runs on the 381-bit prime of BLS12-381: of 1,000 random elements of
$\mathbb{F}_{p^2}$, 513 had a square root (about half, as in every finite field of odd
size), and every root found squares back correctly. The whole computation is two
exponentiations and one inversion in $\mathbb{F}_p$, instead of one exponentiation in
$\mathbb{F}_{p^2}$, where $p^2 - 1$ is divisible by at least 8 and Tonelli-Shanks
would have work to do. Production code also fixes which of the two roots it returns
(RFC 9380 uses a "sign" bit, `sgn0`), because a compressed point names its root by
that bit, and RFC 9380 writes every square root and square test in constant time,
because in hashing to a curve they run on secret data.

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

??? question "2. Use Gauss's lemma to decide whether 3 is a square modulo 13."

    The multiples $3, 6, 9, 12, 15, 18$ reduce to $3, 6, 9, 12, 2, 5$, and into the
    range $-6$ to $6$ as $3, 6, -4, -1, 2, 5$. Two are negative, so
    $\left(\frac{3}{13}\right) = (-1)^2 = +1$: 3 is a square. Indeed $4^2 = 16
    \equiv 3$.

??? question "3. Compute $\left(\frac{3}{101}\right)$ with reciprocity."

    $101 \equiv 1 \pmod 4$, so $\left(\frac{3}{101}\right) =
    \left(\frac{101}{3}\right) = \left(\frac{2}{3}\right) = -1$.

??? question "4. Find both square roots of 2 modulo 23, using $p \equiv 3 \pmod 4$."

    $23 \equiv 7 \pmod 8$, so 2 is a square. $2^{(23+1)/4} = 2^6 = 64 \equiv 18$.
    Check: $18^2 = 324 = 14 \cdot 23 + 2$. The roots are 18 and 5.

??? question "5. A P-256 decoder receives `02` followed by an $x$ for which $x^3 - 3x + b$ is not a square modulo $p$. What should it do, and what goes wrong if it just returns $(x, \text{rhs}^{(p+1)/4})$?"

    Reject the input: no point on the curve has that $x$. The value $y =
    \text{rhs}^{(p+1)/4}$ then satisfies $y^2 = \text{rhs} \cdot
    \text{rhs}^{(p-1)/2} = -\text{rhs}$, so $(x, y)$ is not on P-256. Since the
    addition formulas never use $b$, the device would compute in the group of another
    curve $y^2 = x^3 - 3x + b'$, chosen by the attacker, which may have small subgroups
    that leak the secret key piece by piece (the invalid-curve attack).

??? question "6. Run Tonelli-Shanks for the square root of 5 modulo 41, with the non-residue $z = 3$."

    $40 = 2^3 \cdot 5$, so $s = 3$, $q = 5$. Start: $c = 3^5 = 243 \equiv 38$, $t = 5^5
    = 3125 \equiv 9$, $r = 5^3 = 125 \equiv 2$, $m = 3$. Pass 1: $9^2 = 81 \equiv -1$
    and $(-1)^2 = 1$, so $i = 2$, $b = c = 38$; then $c = 38^2 \equiv 9$, $t = 9 \cdot 9
    \equiv 40$, $r = 2 \cdot 38 = 76 \equiv 35$. Pass 2: $t = -1$, so $i = 1$, $b = c =
    9$; then $c = 81 \equiv 40$, $t = 40 \cdot 40 \equiv 1$, $r = 35 \cdot 9 = 315
    \equiv 28$. Answer 28 (and 13): $28^2 = 784 = 19 \cdot 41 + 5$.

??? question "7. Find the four square roots of 4 modulo 77, and factor 77 from two of them."

    Mod 7: $\pm 2$; mod 11: $\pm 2$. CRT gives 2, 75, and the mixed roots: $x
    \equiv 2 \pmod 7$, $x \equiv -2 \pmod{11}$ gives 9; and its negative, 68.
    $\gcd(9 - 2, 77) = 7$.

??? question "8. Use Cipolla's method to find a square root of 2 modulo 17."

    $t = 0, 1, 2$ give $t^2 - 2 \equiv 15, 16, 2$, all squares mod 17; $t = 3$ gives 7,
    a non-square. With $\omega^2 = 7$: $(3 + \omega)^2 = 16 + 6\omega$, $(3 +
    \omega)^4 = 15 + 5\omega$, $(3 + \omega)^8 = 9 + 14\omega$, and $(3 + \omega)^9 =
    (9 + 14\omega)(3 + \omega) = 125 + 51\omega \equiv 6$. Check: $36 = 2 \cdot 17 +
    2$. The roots are 6 and 11.

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
- Quadratic reciprocity links squareness mod $p$ and mod $q$. Gauss's lemma counts
  negative multiples, and Eisenstein's lattice-point count, which has the same parity,
  proves the law.
- The Jacobi symbol extends the Legendre symbol to odd composites and is
  computed like a gcd, without factoring; but a Jacobi symbol of $+1$ does not
  mean "square".
- Square roots mod $p$: $a^{(p+1)/4}$ when $p \equiv 3 \pmod 4$, a short formula
  when $p \equiv 5 \pmod 8$, Tonelli-Shanks otherwise. Tonelli-Shanks keeps $r^2 =
  at$ and halves the order of $t$ until it is 1; it needs up to $s - 1$ passes, where
  $2^s$ is the power of 2 in $p - 1$, so NTT primes like 12289 are its hard cases.
- Cipolla's method computes $(t + \omega)^{(p+1)/2}$ in $\mathbb{F}_{p^2}$; its cost
  does not depend on $s$, and it beats Tonelli-Shanks when $s$ is large (P-224).
- Point decompression is a square root plus a check that it squares back; skipping
  the check opens the invalid-curve attack. In $\mathbb{F}_{p^2}$ (pairing curves)
  the complex method reduces a root to two roots in $\mathbb{F}_p$.
- Modulo $N = pq$ there are four roots, and finding square roots is equivalent
  to factoring (Rabin). The proof runs as a program that factors $N$ in about two
  calls to any square-root box, and the same proof is a chosen-ciphertext attack on
  Rabin encryption.
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
- Alberto Tonelli, "Bemerkung über die Auflösung quadratischer Congruenzen",
  *Nachrichten von der Königlichen Gesellschaft der Wissenschaften zu Göttingen*
  (1891).
- Michele Cipolla, "Un metodo per la risoluzione della congruenza di secondo grado",
  *Rendiconto dell'Accademia delle Scienze Fisiche e Matematiche di Napoli* (1903).
- Daniel Shanks, "Five Number-theoretic Algorithms", *Proceedings of the Second
  Manitoba Conference on Numerical Mathematics* (1973): Tonelli-Shanks.
- Henri Cohen, *A Course in Computational Algebraic Number Theory* (Springer,
  1993), §1.5 on square roots and the Jacobi symbol.
- Daniel J. Bernstein, "Faster Square Roots in Annoying Finite Fields" (draft, 2001):
  table lookups for Tonelli-Shanks.
- Siguna Müller, "On the Computation of Square Roots in Finite Fields", *Designs,
  Codes and Cryptography* 31 (2004): Atkin's method and its extensions.
- Palash Sarkar, "Computing Square Roots Faster than the Tonelli-Shanks/Bernstein
  Algorithm", Cryptology ePrint Archive 2020/1407 (journal version 2024).
- Augusto Jun Devegili, Michael Scott and Ricardo Dahab, "Implementing Cryptographic
  Pairings over Barreto-Naehrig Curves", *Pairing 2007*: the complex method in
  $\mathbb{F}_{p^2}$.
- Gora Adj and Francisco Rodríguez-Henríquez, "Square Root Computation over Even
  Extension Fields", *IEEE Transactions on Computers* 63 (2014).
- Ivan Damgård, "On the Randomness of Legendre and Jacobi Sequences", *CRYPTO 1988*.
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
- RFC 9380, Hashing to Elliptic Curves (2023), Appendix I on square roots and
  `is_square`.
- SP 800-186, Recommendations for Discrete Logarithm-based Cryptography: Elliptic
  Curve Domain Parameters (NIST, 2023): the P-256 base point.
- In *The cryptography book*: [Chapter 15](../../book/15-Elliptic-Curves.md),
  [Chapter 17](../../book/17-Defining-Security.md). In this book: [Chapter
  12](12-Elliptic-Curve-Group.md) (compression), [Chapter
  13](13-Counting-Points-and-Pairings.md) (pairing curves). Elsewhere on the shelf:
  [*Cryptanalysis*, Chapter 11](../cryptanalysis/11-Factoring.md) (congruent squares
  in factoring), [*Advanced*, Chapter 12](../advanced/12-Homomorphic-Encryption.md)
  (Goldwasser-Micali and Paillier).
