# 3. Modular Arithmetic

*Almost all of public-key cryptography happens in a finite world where numbers
wrap around, like the hours on a clock. This chapter builds that world
carefully: congruences, the ring $\mathbb{Z}/n\mathbb{Z}$, which elements have
inverses and why, Euler's function $\varphi$, linear congruences, and the
Chinese remainder theorem, which splits arithmetic modulo $n$ into independent
pieces. Then it shows how computers actually reduce 4,096-bit numbers, with
Montgomery's and Barrett's tricks, and how the Chinese remainder theorem makes
RSA four times faster and, with one flipped bit, gives the key away.*

!!! abstract "In this chapter"
    **You will learn:**

    - congruence as an equivalence relation, and residue classes;
    - why addition and multiplication of classes are well defined, and what
      makes $\mathbb{Z}/n\mathbb{Z}$ a ring;
    - which elements have inverses, the group of units, and zero divisors, and
      how to find an inverse with a one-column Euclid table;
    - Euler's $\varphi$ function and its formula;
    - when $ax \equiv b \pmod n$ has solutions, and how many;
    - the Chinese remainder theorem, its proof, Garner's algorithm, and the
      ring isomorphism behind it;
    - Montgomery and Barrett reduction, what each costs word by word, where
      each wins, and what Python timings can and cannot tell you;
    - a constant-time conditional subtraction written with masks, and the
      cache and branch attacks of 2005 to 2007 that made it standard;
    - three ways to compute an inverse (Fermat, Euclid, the binary gcd) and
      the constant-time safegcd of Bernstein and Yang;
    - RSA with the Chinese remainder theorem, and the Bellcore fault attack.

    **You need:** [Chapter 2](02-Divisibility-Primes-and-Factoring.md) (division
    with remainder, gcd, Bézout). *The cryptography book*,
    [Chapter 3](../../book/03-The-Arithmetic-of-Secrets.md), covers the first
    half of this chapter more briefly.

    **Levels:** §3.1 to §3.4 are for beginners, §3.5 to §3.10 are
    intermediate, §3.11 is expert.

## 3.1 The problem

*Level: beginner.*

Arcadia City keeps Mars time. A Martian solar day, a **sol**, lasts 24 hours,
39 minutes and 35 seconds of Earth time, and the city's clocks divide it into
24 Martian hours. If the night shift at the water plant starts at hour 21 and
lasts 7 hours, it ends at hour 4, not hour 28. Everyone knows how to do this:
add, then subtract 24 if you went past the end of the day. A Mars year is 668
sols and a bit, and the sol-of-year counter wraps in the same way. Figure 3.1
shows the shift on a Martian clock face.

<figure class="mars-fig">
<svg viewBox="0 0 640 290" width="640" role="img" aria-label="A 24-hour Martian clock face with an arrow running 7 hours clockwise from hour 21, past 0, to hour 4" fill="currentColor" font-size="14">
<circle cx="170" cy="150" r="105" fill="none" stroke="currentColor" stroke-width="1.5"/>
<g stroke="currentColor" stroke-width="1.2"><line x1="170.0" y1="52.0" x2="170.0" y2="45.0"/><line x1="195.4" y1="55.3" x2="197.2" y2="48.6"/><line x1="219.0" y1="65.1" x2="222.5" y2="59.1"/><line x1="239.3" y1="80.7" x2="244.2" y2="75.8"/><line x1="254.9" y1="101.0" x2="260.9" y2="97.5"/><line x1="264.7" y1="124.6" x2="271.4" y2="122.8"/><line x1="268.0" y1="150.0" x2="275.0" y2="150.0"/><line x1="264.7" y1="175.4" x2="271.4" y2="177.2"/><line x1="254.9" y1="199.0" x2="260.9" y2="202.5"/><line x1="239.3" y1="219.3" x2="244.2" y2="224.2"/><line x1="219.0" y1="234.9" x2="222.5" y2="240.9"/><line x1="195.4" y1="244.7" x2="197.2" y2="251.4"/><line x1="170.0" y1="248.0" x2="170.0" y2="255.0"/><line x1="144.6" y1="244.7" x2="142.8" y2="251.4"/><line x1="121.0" y1="234.9" x2="117.5" y2="240.9"/><line x1="100.7" y1="219.3" x2="95.8" y2="224.2"/><line x1="85.1" y1="199.0" x2="79.1" y2="202.5"/><line x1="75.3" y1="175.4" x2="68.6" y2="177.2"/><line x1="72.0" y1="150.0" x2="65.0" y2="150.0"/><line x1="75.3" y1="124.6" x2="68.6" y2="122.8"/><line x1="85.1" y1="101.0" x2="79.1" y2="97.5"/><line x1="100.7" y1="80.7" x2="95.8" y2="75.8"/><line x1="121.0" y1="65.1" x2="117.5" y2="59.1"/><line x1="144.6" y1="55.3" x2="142.8" y2="48.6"/></g>
<text x="170.0" y="34.0" text-anchor="middle">0</text>
<text x="255.6" y="69.4" text-anchor="middle">3</text>
<text x="291.0" y="155.0" text-anchor="middle">6</text>
<text x="255.6" y="240.6" text-anchor="middle">9</text>
<text x="170.0" y="276.0" text-anchor="middle">12</text>
<text x="84.4" y="240.6" text-anchor="middle">15</text>
<text x="49.0" y="155.0" text-anchor="middle">18</text>
<text x="84.4" y="69.4" text-anchor="middle" font-weight="bold">21</text>
<text x="274.8" y="94.5" text-anchor="middle" font-weight="bold">4</text>
<circle cx="95.8" cy="75.8" r="5"/><circle cx="260.9" cy="97.5" r="5"/>
<path d="M113.4 93.4 A80 80 0 0 1 239.3 110.0" fill="none" stroke="currentColor" stroke-width="2"/>
<path d="M239.3 110.0 L230.9 104.5 L238.7 100.0 Z"/>
<text x="170" y="112" text-anchor="middle">+7 hours</text>
<text x="170" y="155" text-anchor="middle" fill-opacity=".7" font-size="12">one sol = 24 Martian hours</text>
<text x="470" y="80" text-anchor="middle">the shift starts at hour 21</text>
<text x="470" y="102" text-anchor="middle">and lasts 7 hours:</text>
<text x="470" y="140" text-anchor="middle">21 + 7 = 28 = 1 · 24 + 4,</text>
<text x="470" y="164" text-anchor="middle" font-weight="bold">so 21 + 7 ≡ 4 (mod 24)</text>
<text x="470" y="202" text-anchor="middle">the hand passes 0 once and</text>
<text x="470" y="224" text-anchor="middle">the shift ends at hour 4 of the next sol</text>
</svg>
<figcaption>Figure 3.1. Clock arithmetic on Mars. Adding 7 hours to hour 21 goes once around past 0 and lands on 4: the remainder of 28 on division by 24.</figcaption>
</figure>

Arithmetic that wraps is the arithmetic of cryptography, for three reasons.

**Numbers have to stay a fixed size.** RSA computes $m^e$ where $m$ and $e$
might be 2,048-bit numbers. The exact integer $m^e$ would have more digits than
there are atoms in the universe. Reducing after every multiplication keeps every
intermediate value below the modulus.

**Wrapping destroys order.** On the integers, $x \mapsto 5^x$ is increasing; if
you know $5^x$ is about a million, you know $x$ is about 8.6. Modulo a prime,
the powers jump around (the table in Chapter 1, §1.7), and nothing like a
logarithm can be read off the size. That loss of structure is what makes the
discrete logarithm hard.

**Finite sets can be counted exactly.** A finite world has a fixed number of
elements, and we can prove exact statements about it ("every unit raised to the
power $\varphi(n)$ gives 1"), statements that would be false for ordinary
numbers and are the reason RSA decrypts correctly.

This chapter builds the finite world. It is the most used chapter of the book:
every later chapter computes in it.

## 3.2 Congruence

*Level: beginner.*

### The definition

Fix a positive integer $n$, the **modulus**. Two integers $a$ and $b$ are
**congruent modulo $n$**, written

$$a \equiv b \pmod n,$$

if $n \mid a - b$. Equivalently, $a$ and $b$ leave the same remainder on
division by $n$. (If $a = qn + r$ and $b = q'n + r$, then $a - b = (q - q')n$;
conversely, if $n \mid a - b$, the division theorem forces equal remainders.)

*Examples.* $28 \equiv 4 \pmod{24}$, since $28 - 4 = 24$. $-1 \equiv 23 \pmod{24}$.
$100 \equiv 2 \pmod 7$, since $98 = 14 \cdot 7$. $2^{10} = 1024 \equiv 1 \pmod{11}$,
since $1023 = 93 \cdot 11$.

There are two notations to keep apart:

- $a \equiv b \pmod n$ is a **relation**, a statement that is true or false,
  like $=$ or $<$.
- $a \bmod n$ is an **operation** that produces a number, the remainder in
  $\{0, \dots, n - 1\}$.

They are linked by: $a \equiv b \pmod n$ if and only if $a \bmod n = b \bmod
n$.

### An equivalence relation

Congruence behaves like equality in three ways:

1. **Reflexive:** $a \equiv a$, since $n \mid 0$.
2. **Symmetric:** if $a \equiv b$ then $b \equiv a$, since $n \mid a - b$
   implies $n \mid b - a$.
3. **Transitive:** if $a \equiv b$ and $b \equiv c$ then $a \equiv c$, since
   $a - c = (a - b) + (b - c)$ is a sum of two multiples of $n$.

A relation with these three properties is an **equivalence relation**, and
every equivalence relation splits its set into disjoint **classes** of mutually
related elements. For congruence modulo $n$ the classes are the **residue
classes**

$$[a] = \{\dots, a - 2n, a - n, a, a + n, a + 2n, \dots\} = a + n\mathbb{Z}.$$

There are exactly $n$ of them, $[0], [1], \dots, [n-1]$, one for each possible
remainder. Modulo 4: $[0] = \{\dots, -4, 0, 4, 8, \dots\}$, $[1] = \{\dots, -3,
1, 5, 9, \dots\}$, and so on. Each integer lies in exactly one class.

<figure class="mars-fig">
<svg viewBox="0 0 640 260" width="640" role="img" aria-label="The integers wound around a circle of circumference 7, so that numbers differing by 7 land on the same point" fill="currentColor" font-size="13">
<circle cx="190" cy="130" r="95" fill="none" stroke="currentColor" stroke-width="1.5"/>
<g>
<circle cx="190" cy="35" r="5" class="acc-fill"/><text x="190" y="22" text-anchor="middle" class="acc-fill">0, 7, 14, −7</text>
<circle cx="264.3" cy="70.8" r="5"/><text x="276" y="66">1, 8, 15</text>
<circle cx="282.6" cy="151.1" r="5"/><text x="294" y="156">2, 9, 16</text>
<circle cx="231.2" cy="215.6" r="5"/><text x="240" y="235">3, 10, 17</text>
<circle cx="148.8" cy="215.6" r="5"/><text x="140" y="235" text-anchor="end">4, 11, −3</text>
<circle cx="97.4" cy="151.1" r="5"/><text x="86" y="156" text-anchor="end">5, 12, −2</text>
<circle cx="115.7" cy="70.8" r="5"/><text x="104" y="66" text-anchor="end">6, 13, −1</text>
</g>
<text x="470" y="80" text-anchor="middle">wrap the number line</text>
<text x="470" y="100" text-anchor="middle">around a circle of length 7:</text>
<text x="470" y="130" text-anchor="middle">each point is one residue class,</text>
<text x="470" y="150" text-anchor="middle">and adding 1 moves one step clockwise</text>
</svg>
<figcaption>Figure 3.2. Residue classes modulo 7. Every integer lands on one of seven points; integers on the same point are congruent.</figcaption>
</figure>

## 3.3 Arithmetic on classes

*Level: beginner.*

### By hand

What is $[5] + [4]$ modulo 7? Pick any member of each class, say 5 and 4, add
them, and take the class: $[9] = [2]$. Pick other members, say 12 and $-3$: $12
+ (-3) = 9$, the same class. Multiply: $5 \cdot 4 = 20 \equiv 6$, and $12 \cdot
(-3) = -36 \equiv 6$ (since $-36 = -6 \cdot 7 + 6$). The same again.

### Why the choice does not matter

**Theorem.** If $a \equiv a'$ and $b \equiv b' \pmod n$, then $a + b \equiv a'
+ b'$ and $ab \equiv a'b' \pmod n$.

*Proof.* Write $a' = a + sn$ and $b' = b + tn$. Then $a' + b' = a + b + (s + t)n$,
and

$$a'b' = ab + atn + bsn + stn^2 = ab + (at + bs + stn)\,n.$$

Both differ from $a + b$ and $ab$ by a multiple of $n$. $\blacksquare$

This theorem is what lets us **reduce as we go**: in a long computation mod
$n$, replace any intermediate value by its remainder at any time, and the final
answer is unchanged. It is why computing $m^e \bmod N$ never needs numbers
bigger than $N^2$.

It also gives quick tricks. Is $7^{100} - 1$ divisible by 8? Since $7 \equiv -1
\pmod 8$, $7^{100} \equiv (-1)^{100} = 1$, so yes. What is the last digit of
$3^{2026}$? Modulo 10, $3^4 = 81 \equiv 1$, and $2026 = 4 \cdot 506 + 2$, so
$3^{2026} = (3^4)^{506} \cdot 3^2 \equiv 9$.

One operation does *not* survive: division. $2 \cdot 3 \equiv 2 \cdot 8
\pmod{10}$, since both sides are 6, but $3 \not\equiv 8$. You cannot cancel the
2. Section 3.4 explains exactly when you can.

### The ring $\mathbb{Z}/n\mathbb{Z}$

The set of residue classes with these operations is written
$\mathbb{Z}/n\mathbb{Z}$ ("Z mod n Z") or $\mathbb{Z}_n$. In practice we name
each class by its smallest non-negative member and write
$\mathbb{Z}/n\mathbb{Z} = \{0, 1, \dots, n - 1\}$, with addition and
multiplication followed by reduction mod $n$.

It inherits from the integers all of these laws, for all $a, b, c$:

| Law | Addition | Multiplication |
|---|---|---|
| closure | $a + b$ is in the set | $ab$ is in the set |
| associative | $(a + b) + c = a + (b + c)$ | $(ab)c = a(bc)$ |
| commutative | $a + b = b + a$ | $ab = ba$ |
| identity | $a + 0 = a$ | $a \cdot 1 = a$ |
| inverse | $a + (n - a) = 0$ | *not always* |
| distributive | $a(b + c) = ab + ac$ | |

A set with two operations obeying all of these except the multiplicative
inverse is called a **commutative ring**. So $\mathbb{Z}/n\mathbb{Z}$ is a
finite commutative ring with $n$ elements. Chapter 8 develops rings in general;
for now, the name is simply a label for "you can add, subtract and multiply,
and the usual algebra works".

### Multiplication tables

Here is multiplication modulo 6:

| $\times$ | 0 | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|---|
| **0** | 0 | 0 | 0 | 0 | 0 | 0 |
| **1** | 0 | 1 | 2 | 3 | 4 | 5 |
| **2** | 0 | 2 | 4 | 0 | 2 | 4 |
| **3** | 0 | 3 | 0 | 3 | 0 | 3 |
| **4** | 0 | 4 | 2 | 0 | 4 | 2 |
| **5** | 0 | 5 | 4 | 3 | 2 | 1 |

Look at the rows. The rows of 1 and 5 contain every number once: multiplying by
1 or by 5 is a permutation of $\mathbb{Z}/6\mathbb{Z}$. The rows of 2, 3 and 4
repeat values and contain 0 in a non-zero column: $2 \cdot 3 = 0$, $3 \cdot 4
= 0$. Two non-zero numbers that multiply to 0 are called **zero divisors**, and
they cannot happen in ordinary arithmetic. Modulo 7, a prime, the table has no
zero divisors at all, and every non-zero row is a permutation.

## 3.4 Units and inverses

*Level: beginner.*

An element $a$ of $\mathbb{Z}/n\mathbb{Z}$ is a **unit**, or **invertible**,
if there is a $b$ with $ab \equiv 1 \pmod n$. Then $b$ is the **inverse** of
$a$, written $a^{-1}$, and dividing by $a$ means multiplying by $a^{-1}$. In
the table mod 6, the units are 1 and 5 (each is its own inverse: $5 \cdot 5 =
25 \equiv 1$).

**Theorem.** $a$ is a unit modulo $n$ if and only if $\gcd(a, n) = 1$. The
inverse is unique, and the extended Euclidean algorithm computes it.

*Proof.* If $\gcd(a, n) = 1$, Bézout (Chapter 2) gives $ax + ny = 1$, so $ax
\equiv 1 \pmod n$ and $x$ is an inverse. Conversely, if $ab \equiv 1$ then $ab
- 1 = kn$ for some $k$, so $ab - kn = 1$, and any common divisor of $a$ and $n$
divides 1. For uniqueness, if $ab \equiv ab' \equiv 1$, then $b = b(ab') =
(ba)b' \equiv b'$. $\blacksquare$

*By hand.* Find $17^{-1} \bmod 43$. Euclid: $43 = 2 \cdot 17 + 9$, $17 = 1
\cdot 9 + 8$, $9 = 1 \cdot 8 + 1$. Back-substitute:

$$1 = 9 - 8 = 9 - (17 - 9) = 2 \cdot 9 - 17 = 2(43 - 2 \cdot 17) - 17 = 2 \cdot 43 - 5 \cdot 17.$$

So $17 \cdot (-5) \equiv 1$, and $17^{-1} \equiv -5 \equiv 38 \pmod{43}$. Check:
$17 \cdot 38 = 646 = 15 \cdot 43 + 1$.

A non-unit, on the other hand, is always a zero divisor (when $n > 1$ and $a
\not\equiv 0$): if $d = \gcd(a, n) > 1$, then $a \cdot (n/d) = (a/d) \cdot n
\equiv 0$, while $n/d \not\equiv 0$. So each non-zero element of
$\mathbb{Z}/n\mathbb{Z}$ is exactly one of the two: a unit or a zero divisor.

### Cancellation

**Corollary.** If $\gcd(c, n) = 1$ and $ca \equiv cb \pmod n$, then $a \equiv b$.

Multiply both sides by $c^{-1}$. This is the rule that failed in §3.3, where we
tried to cancel 2 modulo 10.

### Multiplication by a unit is a permutation

If $a$ is a unit, the map $x \mapsto ax$ is a permutation of
$\mathbb{Z}/n\mathbb{Z}$, with inverse $x \mapsto a^{-1}x$. That is the
observation behind the **affine cipher** $x \mapsto ax + b \bmod 26$ of the
classical era, which needs $\gcd(a, 26) = 1$, and it is the key step in the
proof of Euler's theorem in Chapter 4.

### When $n$ is prime

If $n = p$ is prime, every $a$ from 1 to $p - 1$ has $\gcd(a, p) = 1$, so every
non-zero element is a unit. A commutative ring in which every non-zero element
has an inverse is a **field**. So:

**$\mathbb{Z}/p\mathbb{Z}$ is a field, written $\mathbb{F}_p$, exactly when $p$
is prime.**

In a field you can add, subtract, multiply and divide by anything non-zero, and
all of school algebra works: you can solve linear equations, use the quadratic
formula (when square roots exist; Chapter 5), and do Gaussian elimination
(Chapter 9). This is why elliptic-curve cryptography works over $\mathbb{F}_p$
and why lattice schemes choose a prime $q$.

### The group of units

The units of $\mathbb{Z}/n\mathbb{Z}$ form a set closed under multiplication
(if $a$ and $b$ have inverses, $ab$ has inverse $b^{-1}a^{-1}$), and each has
an inverse in the set. Such a structure is a **group** (Chapter 7), and this one
is written $(\mathbb{Z}/n\mathbb{Z})^*$ or $\mathbb{Z}_n^*$. For example

$$(\mathbb{Z}/12\mathbb{Z})^* = \{1, 5, 7, 11\}, \qquad (\mathbb{Z}/15\mathbb{Z})^* = \{1, 2, 4, 7, 8, 11, 13, 14\}.$$

Diffie-Hellman over a prime $p$ works in $(\mathbb{Z}/p\mathbb{Z})^* = \{1,
\dots, p - 1\}$, and RSA's plaintexts and ciphertexts live (almost always) in
$(\mathbb{Z}/N\mathbb{Z})^*$.

### Code it

```python
from math import gcd

def units(n):
    return [a for a in range(1, n) if gcd(a, n) == 1]

print(units(12), units(15))
print(pow(17, -1, 43), 17 * 38 % 43)       # Python 3.8+ computes inverses directly
try:
    pow(6, -1, 15)
except ValueError as e:
    print("no inverse:", e)
```

```text
[1, 5, 7, 11] [1, 2, 4, 7, 8, 11, 13, 14]
38 1
no inverse: base is not invertible for the given modulus
```

### The inverse as a table

Back-substitution, as in the hand example above, is fine for three steps and
easy to get wrong for ten. Chapter 2 runs the extended algorithm forward
instead, as a table with two coefficient columns
([§2.5](02-Divisibility-Primes-and-Factoring.md#the-extended-euclidean-algorithm)).
For an inverse modulo $n$ only one of the two columns is needed, because the
other one multiplies $n$ and vanishes modulo $n$. Keep rows $(r_i, t_i)$ with
the invariant

$$r_i \equiv t_i \cdot a \pmod n.$$

Start with $(r_0, t_0) = (n, 0)$ and $(r_1, t_1) = (a, 1)$, which satisfy it
trivially. At each step take the quotient $q = \lfloor r_{i-1} / r_i \rfloor$
and form

$$r_{i+1} = r_{i-1} - q\,r_i, \qquad t_{i+1} = t_{i-1} - q\,t_i.$$

The new row is the old row two places up minus $q$ times the row just above.
Both of those satisfy the invariant, and a combination of two congruences is a
congruence, so the new row satisfies it too. The $r$ column is exactly
Euclid's sequence of remainders. When $r$ reaches 1 the invariant reads $1
\equiv t \cdot a$, and that $t$ is the inverse. If $r$ jumps to 0 without
passing through 1, the last non-zero $r$ is $\gcd(a, n) > 1$ and there is no
inverse.

*By hand.* The classic small RSA key has $p = 53$ and $q = 61$, so $N =
3233$ and $\varphi(N) = 3120$ (question 6 below runs this backward). With
public exponent $e = 17$, the private exponent is $d = 17^{-1} \bmod 3120$.
Figure 3.3 shows the whole table.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="The one-column extended Euclid table for the inverse of 17 modulo 3120: rows of quotient, remainder and coefficient, with the row where the remainder is 1 highlighted and giving 2753" fill="currentColor" font-size="14">
<text x="320" y="22" text-anchor="middle">each new row = (row two above) − q × (row above); invariant r ≡ t · 17 (mod 3120)</text>
<rect x="40" y="187" width="560" height="28" fill="currentColor" fill-opacity=".12"/>
<g font-weight="bold"><text x="80" y="55" text-anchor="middle">row</text><text x="160" y="55" text-anchor="middle">q</text><text x="250" y="55" text-anchor="middle">r</text><text x="350" y="55" text-anchor="middle">t</text><text x="500" y="55" text-anchor="middle">t · 17 mod 3120</text></g>
<line x1="40" y1="64" x2="600" y2="64" stroke="currentColor"/>
<text x="80" y="86" text-anchor="middle">0</text><text x="160" y="86" text-anchor="middle">–</text><text x="250" y="86" text-anchor="middle">3120</text><text x="350" y="86" text-anchor="middle">0</text><text x="500" y="86" text-anchor="middle">0 ≡ 3120</text>
<text x="80" y="116" text-anchor="middle">1</text><text x="160" y="116" text-anchor="middle">–</text><text x="250" y="116" text-anchor="middle">17</text><text x="350" y="116" text-anchor="middle">1</text><text x="500" y="116" text-anchor="middle">17</text>
<text x="80" y="146" text-anchor="middle">2</text><text x="160" y="146" text-anchor="middle">183</text><text x="250" y="146" text-anchor="middle">9</text><text x="350" y="146" text-anchor="middle">−183</text><text x="500" y="146" text-anchor="middle">9</text>
<text x="80" y="176" text-anchor="middle">3</text><text x="160" y="176" text-anchor="middle">1</text><text x="250" y="176" text-anchor="middle">8</text><text x="350" y="176" text-anchor="middle">184</text><text x="500" y="176" text-anchor="middle">8</text>
<text x="80" y="206" text-anchor="middle">4</text><text x="160" y="206" text-anchor="middle">1</text><text x="250" y="206" text-anchor="middle" font-weight="bold">1</text><text x="350" y="206" text-anchor="middle" font-weight="bold">−367</text><text x="500" y="206" text-anchor="middle">1</text>
<text x="80" y="236" text-anchor="middle">5</text><text x="160" y="236" text-anchor="middle">8</text><text x="250" y="236" text-anchor="middle">0</text><text x="350" y="236" text-anchor="middle">3120</text><text x="500" y="236" text-anchor="middle">0</text>
<path d="M386 116 C420 126 420 136 386 144" fill="none" stroke="currentColor" stroke-opacity=".6"/>
<text x="420" y="134" font-size="12" fill-opacity=".7">t₂ = t₀ − 183 · t₁</text>
<text x="320" y="276" text-anchor="middle">row 4: 1 ≡ −367 · 17, so d = 17⁻¹ ≡ −367 + 3120 = 2753 (mod 3120)</text>
</svg>
<figcaption>Figure 3.3. Euclid's algorithm with one coefficient column, computing the private exponent of a toy RSA key. The r column is Euclid's sequence of remainders; the highlighted row, where r = 1, holds the inverse.</figcaption>
</figure>

Read the steps off the table: $3120 = 183 \cdot 17 + 9$ gives $t_2 = 0 - 183
\cdot 1 = -183$; then $17 = 1 \cdot 9 + 8$ gives $t_3 = 1 - 1 \cdot (-183) =
184$; then $9 = 1 \cdot 8 + 1$ gives $t_4 = -183 - 184 = -367$. So $d \equiv
-367 \equiv 2753 \pmod{3120}$. Check: $17 \cdot 2753 = 46801 = 15 \cdot 3120 +
1$. The last row is a free check of the arithmetic: when $r$ reaches 0, $t$ is
always $\pm n / \gcd(a, n)$, here $3120$.

### How many rows?

The table has one row per division step of Euclid's algorithm, and Chapter 2
counts those exactly
([§2.4](02-Divisibility-Primes-and-Factoring.md#the-worst-case-fibonacci-numbers)).
Gabriel Lamé proved in 1844 that the worst inputs are consecutive Fibonacci
numbers, where every quotient is 1, and that the count is at most about $1.44
\log_2 n$; random inputs need about $0.843 \ln n$. For the 255-bit prime
$p = 2^{255} - 19$ of Curve25519 that is at most about 368 steps and about 149
on average.

The worst case has a pretty inverse. With $F_7 = 13$ and $F_8 = 21$ the table
runs $r = 21, 13, 8, 5, 3, 2, 1$ with every $q = 1$, and $t = 0, 1, -1, 2, -3, 5,
-8$: the coefficients are Fibonacci numbers too. So $13^{-1} \equiv -8 \equiv 13
\pmod{21}$, and indeed $13^2 = 169 = 8 \cdot 21 + 1$. This is Cassini's identity
$F_{k-1}F_{k+1} - F_k^2 = (-1)^k$ read modulo $F_{k+1}$.

The number of rows depends on $a$. That is harmless when $a$ is public, as $e$
is above, and dangerous when $a$ is a secret, because a program whose running
time depends on a secret can leak it. Section 3.10 returns to inverses that
take the same time for every input.

## 3.5 Euler's function

*Level: intermediate.*

The number of units modulo $n$ is **Euler's totient function**,

$$\varphi(n) = \lvert (\mathbb{Z}/n\mathbb{Z})^* \rvert = \#\{a : 1 \leq a \leq n,\ \gcd(a, n) = 1\}.$$

So $\varphi(12) = 4$ and $\varphi(15) = 8$. Leonhard Euler introduced it in 1763
in his proof of what is now called Euler's theorem (Chapter 4); the letter
$\varphi$ came later, from Gauss.

### Computing $\varphi$

**Primes.** If $p$ is prime, every number from 1 to $p - 1$ is coprime to it:
$\varphi(p) = p - 1$.

**Prime powers.** Among $1, \dots, p^k$, the numbers *not* coprime to $p^k$ are
the multiples of $p$, and there are $p^{k-1}$ of them. So $\varphi(p^k) = p^k -
p^{k-1} = p^{k-1}(p - 1)$. For example $\varphi(1024) = \varphi(2^{10}) = 512$.

**Products of coprime numbers.** If $\gcd(m, n) = 1$, then $\varphi(mn) =
\varphi(m)\varphi(n)$. This is called being **multiplicative**, and it follows
from the Chinese remainder theorem in §3.7.

Putting the three together, if $n = p_1^{e_1} \cdots p_r^{e_r}$,

$$\varphi(n) = \prod_{i=1}^{r} p_i^{e_i - 1}(p_i - 1) = n \prod_{p \mid n} \left(1 - \frac1p\right).$$

*By hand.* $1071 = 3^2 \cdot 7 \cdot 17$, so $\varphi(1071) = 3 \cdot 2 \cdot 6
\cdot 16 = 576$. For an RSA modulus $N = pq$,

$$\varphi(N) = (p - 1)(q - 1) = N - p - q + 1.$$

### Knowing $\varphi(N)$ means knowing the factors

That last formula has a consequence worth stating as a theorem, because it
says something about RSA's security.

**Theorem.** Given $N = pq$ and $\varphi(N)$, one can find $p$ and $q$ quickly.

*Proof.* From $\varphi(N) = N - (p + q) + 1$ we get $s = p + q = N - \varphi(N)
+ 1$. Then $p$ and $q$ are the roots of $x^2 - sx + N = 0$:

$$p, q = \frac{s \pm \sqrt{s^2 - 4N}}{2}.$$

One square root of an integer, and done. $\blacksquare$

So computing $\varphi(N)$ is exactly as hard as factoring $N$. RSA's private
exponent is computed from $\varphi(N)$ (or from $\lambda(N)$, Chapter 4), and
that is why it needs the factors.

```python
def phi(n):
    result, m, p = n, n, 2
    while p * p <= m:                 # factor by trial division: fine for small n
        if m % p == 0:
            while m % p == 0:
                m //= p
            result -= result // p     # multiply by (1 - 1/p)
        p += 1
    if m > 1:
        result -= result // m
    return result

print([phi(k) for k in range(1, 21)])
print(phi(1071), phi(2**10), phi(10**12))

from math import isqrt
N, f = 1000003 * 1000033, 1000002 * 1000032      # an RSA-style modulus and its phi
s = N - f + 1
r = isqrt(s * s - 4 * N)
print((s - r) // 2, (s + r) // 2)                 # the factors fall out
```

```text
[1, 1, 2, 2, 4, 2, 6, 4, 6, 4, 10, 4, 12, 6, 8, 8, 16, 6, 18, 8]
576 512 400000000000
1000003 1000033
```

Notice that this `phi` factors its input. There is no known way to compute
$\varphi(n)$ without factoring $n$, and the theorem above shows that for
$N = pq$ there cannot be one, unless factoring is easy.

### A sum

One more fact, due to Gauss, is used in Chapter 4 to count primitive roots:

$$\sum_{d \mid n} \varphi(d) = n.$$

For $n = 12$: $\varphi(1) + \varphi(2) + \varphi(3) + \varphi(4) + \varphi(6) +
\varphi(12) = 1 + 1 + 2 + 2 + 2 + 4 = 12$. *Proof.* Sort the fractions $1/n,
2/n, \dots, n/n$ by their denominator in lowest terms. The fractions with
lowest-terms denominator $d$ are $a/d$ with $\gcd(a, d) = 1$, and there are
$\varphi(d)$ of them. Every one of the $n$ fractions has exactly one such
denominator, a divisor of $n$. $\blacksquare$

## 3.6 Linear congruences

*Level: intermediate.*

To solve $ax \equiv b \pmod n$: if $a$ is a unit, multiply by $a^{-1}$ and $x
\equiv a^{-1}b$, a single solution. If not, there may be no solution or
several.

**Theorem.** Let $d = \gcd(a, n)$. The congruence $ax \equiv b \pmod n$ has a
solution if and only if $d \mid b$, and then it has exactly $d$ solutions
modulo $n$.

*Proof.* A solution means $ax - b = kn$, so $b = ax - kn$ is a multiple of $d$.
Conversely, if $d \mid b$, divide everything by $d$: $(a/d)x \equiv b/d
\pmod{n/d}$, and now $\gcd(a/d, n/d) = 1$, so there is one solution $x_0$ modulo
$n/d$. Modulo $n$ it gives the $d$ solutions $x_0, x_0 + n/d, \dots, x_0 + (d -
1)n/d$. $\blacksquare$

*By hand.* Solve $6x \equiv 4 \pmod{10}$. Here $d = 2$ divides 4, so there are
two solutions. Divide by 2: $3x \equiv 2 \pmod 5$. The inverse of 3 mod 5 is 2,
so $x \equiv 4 \pmod 5$, and modulo 10 the solutions are $x = 4$ and $x = 9$.
Check: $24 \equiv 4$ and $54 \equiv 4 \pmod{10}$. On the other hand $6x \equiv
3 \pmod{10}$ has no solution: the left side is always even, and 10 is even.

This theorem is the whole story of the affine cipher and of the Hill cipher's
key condition; Chapter 9 extends it to systems of equations and matrices.

## 3.7 The Chinese remainder theorem

*Level: intermediate.*

### The oldest puzzle

The Chinese mathematical text *Sunzi Suanjing*, from about the third to fifth
century AD, asks: there are certain things whose number is unknown. Counted by
threes, two are left over; by fives, three are left over; by sevens, two are
left over. How many things are there?

In our notation: find $x$ with

$$x \equiv 2 \pmod 3, \qquad x \equiv 3 \pmod 5, \qquad x \equiv 2 \pmod 7.$$

*By hand.* Work through the conditions one at a time. The numbers $\equiv 2
\pmod 3$ are $2, 5, 8, 11, 14, \dots$. Of these, the first that is $\equiv 3
\pmod 5$ is 8. All solutions of the first two conditions differ by multiples
of $3 \cdot 5 = 15$: $8, 23, 38, 53, \dots$. Of these, the first $\equiv 2
\pmod 7$ is 23 ($23 = 3 \cdot 7 + 2$). So $x = 23$, and every solution is $23 +
105k$. Sunzi's answer is 23.

### The theorem

**Theorem (Chinese remainder theorem, CRT).** If $n_1, \dots, n_k$ are pairwise
coprime and $N = n_1 n_2 \cdots n_k$, then for any $a_1, \dots, a_k$ the system

$$x \equiv a_1 \pmod{n_1}, \quad \dots, \quad x \equiv a_k \pmod{n_k}$$

has exactly one solution $x$ modulo $N$.

*Proof for two moduli* (the general case follows by induction, combining one
modulus at a time). *Existence.* Since $\gcd(n_1, n_2) = 1$, Bézout gives $n_1u
+ n_2v = 1$. Then $e_1 = n_2v$ satisfies $e_1 \equiv 1 \pmod{n_1}$ and $e_1
\equiv 0 \pmod{n_2}$, and $e_2 = n_1u$ satisfies the opposite. So $x = a_1e_1 +
a_2e_2$ satisfies both congruences.

*Uniqueness.* If $x$ and $x'$ both work, then $n_1 \mid x - x'$ and $n_2 \mid x
- x'$. Write $x - x' = n_1 t$; then $n_2 \mid n_1 t$ with $\gcd(n_1, n_2) = 1$,
so $n_2 \mid t$ (multiply $n_1u + n_2v = 1$ by $t$, as in the proof of Euclid's
lemma). So $n_1n_2 \mid x - x'$. $\blacksquare$

The numbers $e_1, e_2$ are like a basis: $e_1$ is "1 in the first coordinate, 0
in the second". For Sunzi's moduli, the three basis numbers modulo 105 are 70,
21 and 15 (70 is $\equiv 1 \pmod 3$ and divisible by 5 and 7, and so on), and
$x = 2 \cdot 70 + 3 \cdot 21 + 2 \cdot 15 = 233 \equiv 23 \pmod{105}$. A Chinese
verse printed by Cheng Dawei in 1592 memorizes exactly these numbers: seventy,
twenty-one and fifteen.

### What the theorem really says

There is a deeper way to read the CRT. The map

$$\mathbb{Z}/N\mathbb{Z} \to \mathbb{Z}/n_1\mathbb{Z} \times \mathbb{Z}/n_2\mathbb{Z}, \qquad x \mapsto (x \bmod n_1,\ x \bmod n_2)$$

is a bijection (that is the theorem), and it respects addition and
multiplication: the remainders of $x + y$ are the sums of the remainders, and
likewise for products. A bijection between two rings that respects both
operations is a **ring isomorphism**. So:

$$\mathbb{Z}/N\mathbb{Z} \cong \mathbb{Z}/n_1\mathbb{Z} \times \mathbb{Z}/n_2\mathbb{Z} \quad\text{when } \gcd(n_1, n_2) = 1.$$

Arithmetic modulo 15 *is* arithmetic modulo 3 and modulo 5 done side by side,
in two independent coordinates. Figure 3.4 shows the 15 numbers laid out on a
3-by-5 grid by their two remainders: every cell is filled exactly once.

<figure class="mars-fig">
<svg viewBox="0 0 640 230" width="640" role="img" aria-label="The numbers 0 to 14 placed on a 3 by 5 grid by their remainders mod 3 and mod 5; each cell holds exactly one number" fill="currentColor" font-size="15">
<g stroke="currentColor" stroke-width="1.2" fill="none">
<rect x="190" y="40" width="300" height="150"/>
<line x1="250" y1="40" x2="250" y2="190"/><line x1="310" y1="40" x2="310" y2="190"/><line x1="370" y1="40" x2="370" y2="190"/><line x1="430" y1="40" x2="430" y2="190"/>
<line x1="190" y1="90" x2="490" y2="90"/><line x1="190" y1="140" x2="490" y2="140"/>
</g>
<text x="340" y="14" text-anchor="middle">x mod 5 →</text>
<text x="220" y="36" text-anchor="middle" font-size="12">0</text><text x="280" y="36" text-anchor="middle" font-size="12">1</text><text x="340" y="36" text-anchor="middle" font-size="12">2</text><text x="400" y="36" text-anchor="middle" font-size="12">3</text><text x="460" y="36" text-anchor="middle" font-size="12">4</text>
<text x="120" y="120" text-anchor="middle">x mod 3 ↓</text>
<text x="180" y="70" text-anchor="end" font-size="12">0</text><text x="180" y="120" text-anchor="end" font-size="12">1</text><text x="180" y="170" text-anchor="end" font-size="12">2</text>
<text x="220" y="71" text-anchor="middle">0</text><text x="280" y="71" text-anchor="middle">6</text><text x="340" y="71" text-anchor="middle">12</text><text x="400" y="71" text-anchor="middle">3</text><text x="460" y="71" text-anchor="middle">9</text>
<text x="220" y="121" text-anchor="middle">10</text><text x="280" y="121" text-anchor="middle">1</text><text x="340" y="121" text-anchor="middle">7</text><text x="400" y="121" text-anchor="middle">13</text><text x="460" y="121" text-anchor="middle">4</text>
<text x="220" y="171" text-anchor="middle">5</text><text x="280" y="171" text-anchor="middle">11</text><text x="340" y="171" text-anchor="middle" class="acc-fill" font-weight="bold">2</text><text x="400" y="171" text-anchor="middle" class="acc-fill" font-weight="bold">8</text><text x="460" y="171" text-anchor="middle">14</text>
<text x="340" y="218" text-anchor="middle" font-size="13">8 ↔ (2, 3): the system x ≡ 2 (mod 3), x ≡ 3 (mod 5) has the one answer 8</text>
</svg>
<figcaption>Figure 3.4. The Chinese remainder theorem for 15 = 3 × 5. Each number 0 to 14 has its own pair of remainders, and every pair occurs once.</figcaption>
</figure>

Two consequences follow at once.

**$\varphi$ is multiplicative.** A number is a unit mod $n_1n_2$ exactly when
both of its coordinates are units (an inverse can be computed coordinate by
coordinate), so the units of $\mathbb{Z}/n_1n_2\mathbb{Z}$ correspond to pairs
of units, and $\varphi(n_1n_2) = \varphi(n_1)\varphi(n_2)$.

**Polynomial equations split.** An equation such as $x^2 \equiv 1 \pmod{15}$
holds exactly when it holds mod 3 and mod 5. Mod 3 the solutions are $\pm 1$;
mod 5, also $\pm 1$. Combining the four pairs gives four square roots of 1 mod
15: 1, 4, 11 and 14. A number with two prime factors has four square roots of 1,
and Chapter 5 shows that finding a "non-obvious" one, such as 4, factors the
modulus: $\gcd(4 - 1, 15) = 3$.

### Garner's algorithm

To compute the CRT solution efficiently, combine one congruence at a time:
keep the solution $x$ so far and the product $M$ of the moduli so far, and for
the next congruence $x' \equiv r \pmod m$ look for $x' = x + Mt$, which needs
$Mt \equiv r - x \pmod m$, so $t = (r - x) M^{-1} \bmod m$. This is **Garner's
algorithm** (Harvey Garner, 1959).

```python
def crt(residues, moduli):
    x, M = 0, 1
    for r, m in zip(residues, moduli):
        t = ((r - x) * pow(M, -1, m)) % m      # solve x + M*t = r (mod m)
        x += M * t
        M *= m
    return x, M

print(crt([2, 3, 2], [3, 5, 7]))               # Sunzi's puzzle
print(crt([1, 2, 3, 4], [5, 7, 9, 11]))
```

```text
(23, 105)
(1731, 3465)
```

### Garner's numbers are digits

The values of $t$ that Garner's loop computes are worth keeping. Each step
adds $t$ times the product of the earlier moduli, so the answer comes out as

$$x = v_1 + v_2\,m_1 + v_3\,m_1m_2 + \cdots + v_k\,m_1m_2\cdots m_{k-1}, \qquad 0 \leq v_i < m_i.$$

This is a **mixed-radix** representation: like decimal, except that each place
has its own base. For Sunzi's puzzle the loop finds $t = 2$, then $(3 - 2)
\cdot 3^{-1} \equiv 1 \cdot 2 = 2 \pmod 5$, then $(2 - 8) \cdot 15^{-1} \equiv
-6 \cdot 1 \equiv 1 \pmod 7$, so the digits are $(2, 2, 1)$ and $23 = 2 + 2
\cdot 3 + 1 \cdot 15$. Residues hide the size of a number (is $(1, 1, 1)$
bigger than $(0, 4, 6)$ modulo $3, 5, 7$?), but mixed-radix digits show it,
because they compare like ordinary digits, most significant first. That is
why hardware that computes in residues (§3.11) converts to mixed radix
whenever it needs to compare or to reduce.

### When the moduli share a factor

The theorem asks for coprime moduli. Without that, a system may have no
solution: $x \equiv 3 \pmod 8$ makes $x$ odd and $x \equiv 6 \pmod{12}$ makes
it even.

**Theorem.** Let $g = \gcd(n_1, n_2)$. The system $x \equiv a_1 \pmod{n_1}$,
$x \equiv a_2 \pmod{n_2}$ has a solution if and only if $a_1 \equiv a_2
\pmod g$, and then the solution is unique modulo $\operatorname{lcm}(n_1, n_2)
= n_1 n_2 / g$.

*Proof.* Both congruences hold modulo $g$, since $g$ divides both moduli, so a
solution forces $a_1 \equiv x \equiv a_2 \pmod g$. Conversely, write $x = a_1
+ n_1 t$; the second congruence becomes $n_1 t \equiv a_2 - a_1 \pmod{n_2}$, a
linear congruence that §3.6 solves exactly when $g \mid a_2 - a_1$. Its
solutions $t$ form one class modulo $n_2 / g$, and $x = a_1 + n_1 t$ then runs
over one class modulo $n_1 n_2 / g$. $\blacksquare$

*By hand.* $x \equiv 3 \pmod 8$, $x \equiv 7 \pmod{12}$. Here $g = 4$ and $3
\equiv 7 \pmod 4$, so there is a solution. Put $x = 3 + 8t$: then $8t \equiv 4
\pmod{12}$, divide by 4: $2t \equiv 1 \pmod 3$, $t \equiv 2$, $x = 19$. The
answer is unique modulo 24: check $19 = 2 \cdot 8 + 3 = 12 + 7$.

```python
from math import gcd

def crt_general(a1, n1, a2, n2):
    """Solve x = a1 (mod n1), x = a2 (mod n2); None if there is no solution."""
    g = gcd(n1, n2)
    if (a2 - a1) % g:
        return None
    m = n2 // g                              # solve (n1/g) t = (a2 - a1)/g  (mod n2/g)
    t = (a2 - a1) // g * pow(n1 // g, -1, m) % m
    return (a1 + n1 * t) % (n1 * m), n1 * m  # unique modulo lcm(n1, n2) = n1 * m

print(crt_general(3, 8, 7, 12), crt_general(3, 8, 6, 12), crt_general(2, 3, 3, 5))
```

It prints:

```text
(19, 24) None (8, 15)
```

Shared factors matter in cryptography for a reason that runs the other way.
Håstad's broadcast attack combines one message encrypted under several RSA
moduli with the CRT and needs those moduli to be coprime
([Cryptanalysis, §13.3](../cryptanalysis/13-Attacks-on-RSA.md#133-one-message-many-keys-hastads-broadcast-attack)).
If two of them are not, the attacker has something better than a CRT: $\gcd(N_1,
N_2)$ is a shared prime, and both keys are factored at once.

## 3.8 How computers reduce

*Level: intermediate.*

Multiplying two 2,048-bit numbers takes a computer about a microsecond. Reducing
the 4,096-bit product modulo $N$ means a long division, which is slower than the
multiplication and, worse, involves trial quotients and corrections whose
number depends on the data. Two tricks avoid ordinary division altogether. Both
are used in serious cryptographic libraries.

### Montgomery multiplication

Peter Montgomery's idea (1985) is to change what we store. Choose $R$, a power of
two larger than $N$ (for 2,048-bit $N$, $R = 2^{2048}$), with $N$ odd so that
$\gcd(R, N) = 1$. Represent each number $a$ by its **Montgomery form** $\bar a =
aR \bmod N$. Then

$$\bar a \cdot \bar b = abR^2, \quad\text{and we want}\quad \overline{ab} = abR,$$

so after multiplying we must divide by $R$ modulo $N$. Dividing by a power of two
is a shift, if the number is a multiple of $R$. The trick is to *make* it a
multiple of $R$ by adding the right multiple of $N$, which does not change it mod
$N$.

**REDC.** Precompute $N' = -N^{-1} \bmod R$. Given $T < NR$:

1. $m = (T \bmod R) \cdot N' \bmod R$. (Low bits only: cheap.)
2. $t = (T + mN) / R$. (Exact division: $T + mN \equiv T - T \equiv 0 \pmod R$. A shift.)
3. If $t \geq N$, subtract $N$. Return $t$, which is $TR^{-1} \bmod N$.

*By hand.* Take $N = 97$, $R = 128$. Then $N^{-1} \bmod 128 = 33$ (since $97
\cdot 33 = 3201 = 25 \cdot 128 + 1$), so $N' = 128 - 33 = 95$. Multiply $a =
45$ by $b = 73$.

<div class="mars-steps" markdown>
1. Montgomery forms: $\bar a = 45 \cdot 128 \bmod 97 = 37$, $\bar b = 73 \cdot
   128 \bmod 97 = 32$.
2. Multiply: $T = 37 \cdot 32 = 1184$.
3. $T \bmod 128 = 32$; $m = 32 \cdot 95 \bmod 128 = 3040 \bmod 128 = 96$.
4. $t = (1184 + 96 \cdot 97)/128 = 10496/128 = 82$. Less than 97, keep it. So
   $\overline{ab} = 82$.
5. To leave Montgomery form, REDC once more: $T = 82$, $m = 82 \cdot 95 \bmod
   128 = 110$, $t = (82 + 110 \cdot 97)/128 = 10752/128 = 84$.
6. Check: $45 \cdot 73 = 3285 = 33 \cdot 97 + 84$.
</div>

In a long exponentiation, numbers enter Montgomery form once at the start, stay
there through thousands of multiplications, and leave once at the end. Every
step uses only multiplication, addition, and shifts by a word size. Figure 3.5 shows
the round trip.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Two bands: ordinary residues mod 97 above and Montgomery forms below. 45 and 73 go down into the Montgomery band as 37 and 32, are multiplied there with REDC to give 82, and 82 comes back up as 84" fill="currentColor" font-size="14">
<defs><marker id="m3a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<rect x="20" y="20" width="600" height="70" rx="8" fill="currentColor" fill-opacity=".06" stroke="currentColor" stroke-opacity=".5"/>
<rect x="20" y="190" width="600" height="70" rx="8" fill="currentColor" fill-opacity=".14" stroke="currentColor" stroke-opacity=".5"/>
<text x="30" y="40" font-size="12" fill-opacity=".7">ordinary residues mod 97</text>
<text x="30" y="210" font-size="12" fill-opacity=".7">Montgomery forms: x̄ = 128 · x mod 97</text>
<text x="100" y="70" text-anchor="middle" font-weight="bold">a = 45</text>
<text x="200" y="70" text-anchor="middle" font-weight="bold">b = 73</text>
<text x="540" y="70" text-anchor="middle" font-weight="bold">ab mod 97 = 84</text>
<text x="100" y="240" text-anchor="middle" font-weight="bold">ā = 37</text>
<text x="200" y="240" text-anchor="middle" font-weight="bold">b̄ = 32</text>
<text x="390" y="236" text-anchor="middle" font-weight="bold">REDC(37 · 32) = 82</text><text x="390" y="253" text-anchor="middle" font-size="12" fill-opacity=".7">the Montgomery form of 84</text>
<g stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#m3a)">
<path d="M100 78 L100 222"/><path d="M200 78 L200 222"/>
<path d="M232 231 L318 231"/>
<path d="M540 222 L540 80"/>
</g>
<text x="150" y="130" text-anchor="middle" font-size="13">enter once:</text>
<text x="150" y="148" text-anchor="middle" font-size="13">x · 128 mod 97</text>
<text x="150" y="166" text-anchor="middle" font-size="13" fill-opacity=".7">(one division)</text>
<text x="555" y="130" font-size="13">leave once:</text>
<text x="555" y="148" font-size="13">REDC(82)</text>
<text x="555" y="166" font-size="13">= 84</text>
<text x="370" y="130" text-anchor="middle" font-size="13">stay below for the whole computation:</text>
<text x="370" y="148" text-anchor="middle" font-size="13">each step is one product and one REDC,</text>
<text x="370" y="166" text-anchor="middle" font-size="13">and REDC needs only masks, shifts and adds</text>
<text x="320" y="285" text-anchor="middle" font-size="13">REDC(x̄ · ȳ) = xR · yR · R⁻¹ = xyR = (xy)‾ : the bar survives multiplication</text>
</svg>
<figcaption>Figure 3.5. The Montgomery domain, with the numbers of the hand example. Values cross into Montgomery form once, are multiplied there as often as needed, and cross back once at the end.</figcaption>
</figure>

```python
def montgomery_setup(N, bits):
    R = 1 << bits
    return R, (-pow(N, -1, R)) % R

def redc(T, N, R, Np, bits):
    m = ((T & (R - 1)) * Np) & (R - 1)       # T mod R, times N', mod R: masks, no division
    t = (T + m * N) >> bits                  # exact division by R: a shift
    return t - N if t >= N else t

N, bits = 97, 7
R, Np = montgomery_setup(N, bits)
abar, bbar = 45 * R % N, 73 * R % N
prod = redc(abar * bbar, N, R, Np, bits)
print(abar, bbar, prod, redc(prod, N, R, Np, bits))
```

```text
37 32 82 84
```

The one data-dependent step is the final subtraction in REDC, and it has
mattered: in 2000 Werner Schindler showed that timing whether that "extra
reduction" happens leaks RSA keys, and in 2003 David Brumley and Dan Boneh
measured timing differences across a network to extract a private key from an
OpenSSL web server. Libraries now compute the subtraction always and select the
result with masks, so that the time does not depend on the data. Such code is
called **constant-time**; §3.10 writes the masked subtraction out.

### Barrett reduction

Paul Barrett's method (1986) keeps numbers in ordinary form and replaces
division by multiplication with a precomputed reciprocal. For a $k$-bit modulus
$n$, precompute $\mu = \lfloor 4^k / n \rfloor$. To reduce $x < n^2$, estimate
the quotient as

$$q = \left\lfloor \frac{\lfloor x / 2^{k-1} \rfloor \cdot \mu}{2^{k+1}} \right\rfloor,$$

which uses only shifts and one multiplication, and set $r = x - qn$. The
estimate is never too big and at most 2 too small, so at most two subtractions
of $n$ finish the job.

*By hand.* $n = 97$ has $k = 7$ bits; $\mu = \lfloor 16384 / 97 \rfloor = 168$.
For $x = 3285$: $\lfloor 3285 / 64 \rfloor = 51$, $51 \cdot 168 = 8568$,
$\lfloor 8568 / 256 \rfloor = 33$, and $3285 - 33 \cdot 97 = 84$. The estimate
was exact.

```python
def barrett_setup(n):
    k = n.bit_length()
    return k, (1 << (2 * k)) // n

def barrett(x, n, k, mu):
    q = ((x >> (k - 1)) * mu) >> (k + 1)     # estimated quotient, no division
    r = x - q * n
    while r >= n:                             # at most two corrections
        r -= n
    return r

k, mu = barrett_setup(97)
print(k, mu, barrett(3285, 97, k, mu))

import random
rng = random.Random(5)
n = rng.getrandbits(256) | 1 << 255 | 1
k, mu = barrett_setup(n)
print(all(barrett(x, n, k, mu) == x % n for x in (rng.randrange(n * n) for _ in range(10000))))
```

```text
7 168 84
True
```

### Counting the cost

Which of the two is faster? Start with a count. Real code stores a big number
as $k$ **words** (limbs) of 64 bits, and the unit of cost is one word
multiplication. A 2,048-bit modulus has $k = 32$ words, and the schoolbook
product of two such numbers costs $k^2$ word multiplications
([Engineering, §6.3](../engineering/06-Big-Numbers-and-Public-Key-Code.md#63-multiplying-faster-karatsuba)
shows how Karatsuba lowers that). Then each method reduces the product:

- **Montgomery, a word at a time.** REDC can clear the low words one by one.
  For each low word $t_i$ it computes $m_i = t_i N' \bmod 2^{64}$ (one
  multiplication, using only the lowest word of $N'$) and adds $m_i N$
  shifted into place ($k$ more), which turns $t_i$ into zero: $k(k + 1)$ in all.
- **Barrett, two half products.** The quotient estimate needs only the top
  words of $\lfloor x / 2^{64(k-1)} \rfloor \cdot \mu$, and the product of
  the estimate with $n$ is needed only modulo $2^{64(k+1)}$, so about half the
  partial products of each can be skipped (at worst one more final
  subtraction). The two halves come to $k^2 + 4k + 1$.

The code below does both reductions word by word and counts every word
multiplication it performs.

```python
import random

W = 64                                       # bits per word
B = 1 << W

def words(x, k):                             # x as k words, low word first
    return [(x >> (W * i)) % B for i in range(k)]

def partial_product(a, b, keep, tally):      # schoolbook, only the a[i]*b[j] with keep(i + j)
    s = 0
    for i, ai in enumerate(a):
        for j, bj in enumerate(b):
            if keep(i + j):
                s += ai * bj << (W * (i + j))
                tally[0] += 1
    return s

def montgomery_words(T, N, k, n0, tally):    # REDC one word at a time; n0 = -1/N mod 2^64
    for i in range(k):
        m = ((T >> (W * i)) % B) * n0 % B
        tally[0] += 1
        T += partial_product([m], words(N, k), lambda s: True, tally) << (W * i)
    T >>= W * k
    return T - N if T >= N else T

def barrett_words(x, n, k, mu, tally):       # mu = floor(2^(128k) / n)
    q1 = x >> (W * (k - 1))
    q3 = partial_product(words(q1, k + 1), words(mu, k + 1), lambda s: s >= k - 1, tally) >> (W * (k + 1))
    r2 = partial_product(words(q3, k + 1), words(n, k), lambda s: s <= k, tally)
    r = (x - r2) % B ** (k + 1)
    while r >= n:
        r -= n
    return r

rng = random.Random(3)
for k in (4, 8, 32):                         # 256-, 512- and 2048-bit moduli
    n = rng.getrandbits(W * k) | 1 << (W * k - 1) | 1
    x = rng.randrange(n * n)
    tm, tb = [0], [0]
    assert montgomery_words(x, n, k, -pow(n, -1, B) % B, tm) == x * pow(B ** k, -1, n) % n
    assert barrett_words(x, n, k, B ** (2 * k) // n, tb) == x % n
    print(f"k = {k:2}: product {k * k:4}, Montgomery {tm[0]:4}, Barrett {tb[0]:4}")

k = 32
mont, barr = k * k + k * (k + 1), k * k + k * k + 4 * k + 1   # one modular multiplication
overhead = mont + k * (k + 1)                # convert in (one Montgomery multiplication), convert out (one REDC)
L = 1
while overhead + L * mont > L * barr:
    L += 1
print("per multiplication:", mont, barr, "  Montgomery wins from L =", L)
```

It prints:

```text
k =  4: product   16, Montgomery   20, Barrett   33
k =  8: product   64, Montgomery   72, Barrett   97
k = 32: product 1024, Montgomery 1056, Barrett 1153
per multiplication: 2080 2177   Montgomery wins from L = 33
```

So for a 2,048-bit modulus a full modular multiplication costs 2,080 word
multiplications with Montgomery and 2,177 with Barrett: Montgomery saves about
4.5 percent per step. But Montgomery has an entry fee. Entering the domain is
itself a Montgomery multiplication, by the precomputed constant $R^2 \bmod N$
($\mathrm{REDC}(a \cdot R^2) = aR$), and leaving is one more REDC; together
3,136 word multiplications. (Both methods also need one long division per
modulus, for $R^2 \bmod N$ or for $\mu$, so that cost cancels.) A chain of $L$
multiplications costs $3136 + 2080L$ one way and $2177L$ the other, and the
lines cross at $L = 33$. Figure 3.6 plots the cost per multiplication.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Cost per modular multiplication against the length of the chain, on a log scale from 1 to 4096. Barrett is flat at 2177 word multiplications. Montgomery starts far higher because of its conversions and falls below Barrett at 33 multiplications, levelling off at 2080." fill="currentColor" font-size="13">
<g stroke="currentColor" stroke-opacity=".25"><line x1="80" y1="50" x2="600" y2="50"/><line x1="80" y1="100" x2="600" y2="100"/><line x1="80" y1="150" x2="600" y2="150"/><line x1="80" y1="200" x2="600" y2="200"/></g>
<line x1="80" y1="250" x2="600" y2="250" stroke="currentColor"/><line x1="80" y1="20" x2="80" y2="250" stroke="currentColor"/>
<g text-anchor="end" font-size="12"><text x="74" y="254">2000</text><text x="74" y="204">2200</text><text x="74" y="154">2400</text><text x="74" y="104">2600</text><text x="74" y="54">2800</text></g>
<g text-anchor="middle" font-size="12"><text x="80" y="267">1</text><text x="166.7" y="267">4</text><text x="253.3" y="267">16</text><text x="340" y="267">64</text><text x="426.7" y="267">256</text><text x="513.3" y="267">1024</text><text x="600" y="267">4096</text></g>
<text x="340" y="290" text-anchor="middle">L, multiplications in the chain (log scale)</text>
<text x="20" y="140" text-anchor="middle" transform="rotate(-90 20 140)">word multiplications per step</text>
<line x1="80" y1="205.8" x2="600" y2="205.8" stroke="currentColor" stroke-width="2" stroke-dasharray="6 4"/>
<polyline fill="none" stroke="currentColor" stroke-width="2.5" points="163.8,24.8 177.7,65.8 191.7,98.6 205.6,124.9 219.6,145.9 233.5,162.7 247.5,176.2 261.4,187.0 275.4,195.6 289.3,202.5 303.3,208.0 345.1,218.7 387.0,224.2 428.8,227.0 470.7,228.5 512.5,229.2 554.4,229.6 596.2,229.8 600.0,229.8"/>
<circle cx="298.6" cy="205.8" r="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
<line x1="298.6" y1="205.8" x2="298.6" y2="250" stroke="currentColor" stroke-dasharray="2 3"/>
<text x="304" y="244" font-size="12">L = 33</text>
<text x="440" y="198" font-size="12">Barrett: 2,177 at every L</text>
<text x="440" y="244" font-size="12">Montgomery → 2,080</text>
<text x="186" y="40" font-size="12">Montgomery, conversions included</text>
<text x="186" y="56" font-size="12" fill-opacity=".7">(5,216 at L = 1, 3,648 at L = 2: off the top)</text>
<line x1="582" y1="250" x2="582" y2="120" stroke="currentColor" stroke-dasharray="2 3"/>
<text x="578" y="114" text-anchor="end" font-size="12">one RSA-2048 power ≈ 3,000</text>
</svg>
<figcaption>Figure 3.6. Average cost of one modular multiplication for a 2,048-bit modulus, in 64-bit word multiplications, as computed by the listing above. Montgomery pays for its conversions after 33 multiplications; a single RSA exponentiation does about 3,000.</figcaption>
</figure>

The count is close, and it leaves out what decides the matter in practice.
Montgomery's quotient word comes from the *lowest* word of the running sum, so
the reduction can be interleaved with the multiplication word by word (the
"coarsely integrated operand scanning" schedule that Çetin Koç, Tolga Acar and
Burton Kaliski compared with four others in 1996), carries flow in one
direction only, and there is no comparison of top words until the single final
subtraction. Barrett has to wait for the top half of the full product before it
can estimate anything, and its correction loop runs zero, one or two times
depending on the data. On the other side, Barrett keeps numbers in their
ordinary form, needs no conversions, and works for any modulus, even an even
one; Montgomery needs $\gcd(R, N) = 1$, so an odd $N$.

### Timing them in Python

The listing below runs a whole 2,048-bit exponentiation, about 3,000 modular
multiplications of random-looking numbers, with each reduction, with Python's
own `%`, and with the built-in `pow`.

```python
import random, timeit

def redc(T, N, R, Np, bits):                 # the two reductions from the listings above,
    m = ((T & (R - 1)) * Np) & (R - 1)       # repeated so that this block runs on its own
    t = (T + m * N) >> bits
    return t - N if t >= N else t

def barrett(x, n, k, mu):
    q = ((x >> (k - 1)) * mu) >> (k + 1)
    r = x - q * n
    while r >= n:
        r -= n
    return r

def power(a, e, n, mul):                     # left-to-right square and multiply
    r = 1
    for bit in bin(e)[2:]:
        r = mul(r, r)
        if bit == "1":
            r = mul(r, a)
    return r

rng = random.Random(7)
bits = 2048
n = rng.getrandbits(bits) | 1 << (bits - 1) | 1
k, mu = bits, (1 << (2 * bits)) // n
R, Np = 1 << bits, -pow(n, -1, 1 << bits) % (1 << bits)
a, e = rng.randrange(n), rng.getrandbits(bits)
am = a * R % n                               # a in Montgomery form; R mod n stands for 1
chain = {"x % n": lambda: power(a, e, n, lambda x, y: x * y % n),
         "Barrett": lambda: power(a, e, n, lambda x, y: barrett(x * y, n, k, mu)),
         "Montgomery": lambda: redc(power(am, e, n, lambda x, y: redc(x * y, n, R, Np, bits)), n, R, Np, bits),
         "pow()": lambda: pow(a, e, n)}
for name, f in chain.items():
    t = min(timeit.repeat(f, number=5, repeat=3)) / 5
    print(f"2048-bit power, {name:10}: {t * 1e3:6.1f} milliseconds")
```

Timings change from machine to machine and run to run, so they are not quoted
as fixed output. Two runs with CPython 3.13 on a 2.3 GHz Xeon server gave these
numbers, which agreed to within 2 percent:

| | `x % n` | Barrett | Montgomery | built-in `pow` |
|---|---|---|---|---|
| 2,048-bit exponentiation | 33.0 ms | 32.6 ms | 33.3 ms | 25.1 ms |

(Timed one reduction at a time on 1,000 random 4,096-bit products, all three
took 8.1 to 8.3 µs.)

In Python the three are indistinguishable, and the built-in `pow`, which runs
the whole exponentiation in C, beats all of them. That is the honest result,
and it says almost nothing about C. CPython stores big integers in 30-bit
digits, its long division of a 4,096-bit number by a 2,048-bit one costs about
as much as the two multiplications that Barrett and Montgomery replace it
with, and every line of Python adds interpreter overhead on top. In C with
64-bit words, where the counts above are what the processor executes and the
interleaving matters, libraries such as OpenSSL use Montgomery for RSA and
finite-field Diffie-Hellman. To measure that, time a C library (for example
`openssl speed rsa2048`), not a Python model of it. Section 3.10 sums up where
each method wins.

!!! note "Life story: Montgomery multiplication"
    **Born:** 1985, Peter Montgomery, "Modular Multiplication Without Trial
    Division", *Mathematics of Computation* 44 · **Purpose:** to reduce modulo
    an odd $N$ using only multiplications and shifts by a power of two ·
    **Helped:** a great many RSA, Diffie-Hellman and elliptic-curve
    implementations since, in software and in hardware; Montgomery also gave the
    Montgomery curves and the Montgomery ladder used in X25519 (Chapter 12) ·
    **Status:** current; the data-dependent final subtraction is done in
    constant time since the timing attacks of 2000 to 2003

## 3.9 RSA and the Chinese remainder theorem

*Level: intermediate.*

### Four times faster

An RSA private-key operation computes $m = c^d \bmod N$ with a 2,048-bit $d$
and $N$. The holder of the private key knows $p$ and $q$, and by the CRT,
computing mod $N$ is the same as computing mod $p$ and mod $q$ side by side:

1. $m_p = c^{d_p} \bmod p$ with $d_p = d \bmod (p - 1)$;
2. $m_q = c^{d_q} \bmod q$ with $d_q = d \bmod (q - 1)$;
3. combine: $m = m_q + q \cdot \big((m_p - m_q) \cdot q^{-1} \bmod p\big)$, which
   is Garner's formula with the precomputed $q^{-1} \bmod p$.

The exponents can be reduced mod $p - 1$ and $q - 1$ because of Fermat's little
theorem (Chapter 4). Each of the two exponentiations has half-size numbers
(multiplications cost a quarter as much) and half-size exponents (half as many
of them), so each costs about one eighth of the full one, and both together a
quarter. That factor of about four is why every RSA private key file stores
$p$, $q$, $d_p$, $d_q$ and $q^{-1} \bmod p$, which PKCS #1 (RFC 8017) names
`prime1`, `prime2`, `exponent1`, `exponent2` and `coefficient`.

### Measured: how much faster?

The factor of four is a prediction from operation counts. Measuring it needs a
real-size key, so the listing below makes two 1,024-bit primes with the
Miller-Rabin test of Chapter 6, builds a 2,048-bit RSA key, and times one
private-key operation both ways.

```python
import random, timeit

def probable_prime(n, rng, rounds=20):       # Miller-Rabin (Chapter 6)
    d, s = n - 1, 0
    while d % 2 == 0:
        d, s = d // 2, s + 1
    for _ in range(rounds):
        x = pow(rng.randrange(2, n - 1), d, n)
        if x in (1, n - 1):
            continue
        for _ in range(s - 1):
            x = x * x % n
            if x == n - 1:
                break
        else:
            return False
    return True

def random_prime(bits, rng):
    while True:
        n = rng.getrandbits(bits) | 3 << (bits - 2) | 1      # top two bits set, odd
        if n % 65537 != 1 and probable_prime(n, rng):
            return n

rng = random.Random(2026)
p, q = random_prime(1024, rng), random_prime(1024, rng)
N, e = p * q, 65537
d = pow(e, -1, (p - 1) * (q - 1))
dp, dq, qinv = d % (p - 1), d % (q - 1), pow(q, -1, p)
c = rng.randrange(N)

def plain():
    return pow(c, d, N)

def with_crt():
    mp, mq = pow(c, dp, p), pow(c, dq, q)
    return mq + q * ((mp - mq) * qinv % p)

print(N.bit_length(), plain() == with_crt())
t1 = min(timeit.repeat(plain, number=10, repeat=3)) / 10
t2 = min(timeit.repeat(with_crt, number=10, repeat=3)) / 10
print(f"plain {t1 * 1000:.1f} ms, CRT {t2 * 1000:.1f} ms, ratio {t1 / t2:.1f}")
```

The first line it prints is `2048 True`: the two ways agree. The second line
is a timing. On the same CPython 3.13 machine as in §3.8, three runs gave
24.7 to 25.2 ms for the plain exponentiation and 7.5 to 7.7 ms with the CRT, a
speed-up of 3.3 each time. Here the measurement is meaningful even in Python,
because both versions spend nearly all their time inside the same C routine
for `pow`, so the ratio compares like with like. It falls a little short of 4,
most likely because not every cost halves: the Garner join and the reduction
of $c$ modulo $p$ and $q$ do not.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="RSA with the Chinese remainder theorem: the message is split into a part mod p and a part mod q, each is exponentiated, and Garner's formula joins them; a fault in one half lets a gcd reveal the other prime" fill="currentColor" font-size="13">
<g stroke="currentColor" stroke-width="1.4" fill="none">
<rect x="20" y="100" width="90" height="40" rx="6"/>
<rect x="170" y="40" width="160" height="40" rx="6"/>
<rect x="170" y="160" width="160" height="40" rx="6" class="acc"/>
<rect x="390" y="100" width="110" height="40" rx="6"/>
<rect x="540" y="100" width="80" height="40" rx="6"/>
<path d="M110 112 L170 64"/><path d="M110 128 L170 176"/>
<path d="M330 60 L390 112"/><path d="M330 180 L390 128"/>
<path d="M500 120 L540 120"/>
</g>
<text x="65" y="125" text-anchor="middle">m</text>
<text x="250" y="65" text-anchor="middle">s_q = m^(d_q) mod q</text>
<text x="250" y="185" text-anchor="middle" class="acc-fill">s_p = m^(d_p) mod p  ⚡</text>
<text x="445" y="125" text-anchor="middle">Garner join</text>
<text x="580" y="125" text-anchor="middle">s′</text>
<text x="250" y="225" text-anchor="middle" class="acc-fill">a fault here makes s′ wrong mod p only</text>
<text x="470" y="180" text-anchor="middle">s′^e − m is still 0 mod q,</text>
<text x="470" y="198" text-anchor="middle">so gcd(s′^e − m, N) = q</text>
</svg>
<figcaption>Figure 3.7. RSA signing with the Chinese remainder theorem. Two half-size exponentiations, one per prime, joined by Garner's formula: about four times faster. If a fault strikes one half, the released signature is right modulo one prime and wrong modulo the other, and one gcd factors N.</figcaption>
</figure>

### Break it: one wrong bit

In 1996 Dan Boneh, Richard DeMillo and Richard Lipton at Bellcore pointed out a
danger in this speed-up. Suppose a fault (a glitch in voltage, a cosmic ray, a
hardware bug, a deliberate laser pulse on a smart card) corrupts the
computation of $m_p$ but not $m_q$, and the device releases the wrong signature
$s'$. Then $s'$ is still correct modulo $q$ but wrong modulo $p$. So $s'^e
\equiv m \pmod q$ but not mod $p$, which means

$$q \mid s'^e - m \quad\text{and}\quad p \nmid s'^e - m, \qquad\text{so}\qquad \gcd(s'^e - m,\ N) = q.$$

Arjen Lenstra noticed this version, which needs just one faulty signature and
the message; the Bellcore paper's original version needed a correct signature
as well. One gcd, and the key is gone.

```python
from math import gcd

p, q = 1000003, 1000033
N, e = p * q, 65537
d = pow(e, -1, (p - 1) * (q - 1))
m = 123456789                                     # in practice, the padded hash of a message

def sign_crt(m, fault=False):
    sp = pow(m, d % (p - 1), p)
    sq = pow(m, d % (q - 1), q)
    if fault:
        sp ^= 1                                   # one flipped bit in the half mod p
    h = (pow(q, -1, p) * (sp - sq)) % p
    return sq + q * h

s = sign_crt(m)
print(s == pow(m, d, N), pow(s, e, N) == m)       # the fast way gives the right answer
bad = sign_crt(m, fault=True)
print(pow(bad, e, N) == m)                        # the faulty signature does not verify...
print(gcd(pow(bad, e, N) - m, N))                 # ...and it factors N
```

```text
True True
False
1000033
```

**Fix it.** Verify before releasing: compute $s^e \bmod N$ and compare with $m$
(cheap, since $e$ is small), and output nothing if they differ. Serious RSA
implementations do this today. It is not a theoretical worry: in 2015 Florian
Weimer of Red Hat found TLS servers in the wild that sent faulty RSA-CRT
signatures, and recovered their private keys this way; a 2022 study by George
Arnold Sullivan, Jackson Sippe, Nadia Heninger and Eric Wustrow found more such
TLS servers, and a 2023 study by Keegan Ryan, Kaiwen He, Sullivan and Heninger
found faulty RSA signatures in SSH traffic and recovered keys from them.
[Cryptanalysis, §13.12](../cryptanalysis/13-Attacks-on-RSA.md#1312-the-crt-fault-attack)
tells the attack from the attacker's side, and
[Engineering, §6.7](../engineering/06-Big-Numbers-and-Public-Key-Code.md#67-rsa-private-key-code-blinding-and-the-fault-check)
builds the check into real key code.

On Mars the check matters more, for two reasons. The surface has a thin
atmosphere and no global magnetic field, so energetic particles reach the
electronics far more often than at sea level on Earth, and particle strikes
are one of the causes of the transient bit flips this attack feeds on. And a
signature from Arcadia City is usually on its way before anyone could object:
a firmware image or a certificate signed in the city reaches Earth 3 to 22
minutes later, and no one on Earth can ask "was that signature right?" and
get an answer in less than 6 to 44 minutes. Whatever leaves the signing device
has to be correct when it leaves, so a Martian signer verifies every RSA-CRT
signature before releasing it, at the cost of one short exponentiation by $e =
65537$.

!!! note "Life story: the Bellcore fault attack"
    **Born:** 1996, announced by Dan Boneh, Richard DeMillo and Richard Lipton
    of Bellcore, published at EUROCRYPT 1997 as "On the Importance of Checking
    Cryptographic Protocols for Faults"; Arjen Lenstra's one-signature variant
    followed soon after · **Purpose:** to show that a single hardware error in
    a CRT computation reveals an RSA key · **Helped:** made "verify before you
    release" and fault countermeasures standard in smart cards and libraries;
    began the field of fault attacks, which Biham and Shamir extended to DES
    within months · **Status:** still finds keys: faulty signatures were caught
    in TLS (2015, 2022) and SSH (2023) traffic

## 3.10 In the real world

*Level: intermediate.*

**Modular arithmetic in hardware.** Modern processors have no "modular
multiply" instruction for big numbers; libraries build it from 64-bit
multiplications. A 2,048-bit number is 32 words, a schoolbook product is $32^2
= 1024$ word multiplications, and Montgomery reduction adds about as many more.
Intel's AVX-512 IFMA instructions, with 52-bit multiply-accumulate lanes, were
designed with this kind of arithmetic in mind, and OpenSSL uses them for RSA on
chips that have them.

**Special moduli.** If you choose the modulus, you can make reduction nearly
free. The prime of Curve25519 is $p = 2^{255} - 19$; since $2^{255} \equiv 19
\pmod p$, the high half of any product can be folded down by multiplying it by
19 and adding. The NIST curve P-256 uses $p = 2^{256} - 2^{224} + 2^{192} +
2^{96} - 1$, a **generalized Mersenne prime** of the kind Jerome Solinas
described in 1999, chosen so that reduction needs only additions and
subtractions of 32-bit words. Chapter 12 returns to these choices.

**Negative remainders, again.** Many bugs in modular code are about the sign of
a remainder or the size of an intermediate value. A classic one in constant-time
code: computing $a - b \bmod p$ as `a - b` and adding $p$ "if negative", where
the "if" is a branch that leaks timing. The constant-time idiom is to compute
`a - b + p` and subtract $p$ under a mask, as below.

### Montgomery or Barrett: which one when

Put together, the count of §3.8, the structure and the conversions give a
simple rule:

- **Long chains with one odd modulus:** Montgomery. An RSA or Diffie-Hellman
  exponentiation does thousands of multiplications modulo the same $N$, far past
  the break-even point of Figure 3.6.
- **One reduction, or a modulus that keeps changing:** Barrett, or plain
  division. Reducing a 512-bit hash modulo a curve's group order, as EdDSA
  signing does twice per signature, is a one-off reduction; converting into
  Montgomery form first would cost more than it saves.
- **Special moduli:** neither. Primes like $2^{255} - 19$ are chosen so that
  reduction is a few additions, as above.
- **Small moduli in vector code:** both, side by side. Many post-quantum
  implementations use small versions of each: ML-KEM's reference code reduces
  modulo $q = 3329$ with a 16-bit Montgomery reduction after products, where
  the stray factor $R^{-1}$ can be folded into precomputed constants, and with
  a Barrett reduction after sums (Chapter 15).

### Fix it: the conditional subtraction, in constant time

The last line of REDC, the correction loop of Barrett and the fix for
negative remainders all have one shape: *subtract $n$ if the value is at least
$n$*. Written the obvious way,

```
if t >= n:
    t -= n
```

it leaks in three separate ways when $t$ depends on a secret. The *time*
differs, because the subtraction runs or does not, and for multi-word numbers
the comparison `t >= n` usually stops at the first word that differs, so even
the test takes a data-dependent time. The *branch predictor* differs: the
processor guesses which way each branch will go and keeps a history that
another program on the same core can probe. And the *instruction cache*
differs, because the two outcomes run different code. Any one of these is
enough to tell an attacker, step by step, whether the extra reduction
happened, and that, as Schindler showed (§3.8), is correlated with the
private key.

The fix is to do the same work every time and choose the answer with
arithmetic instead of a branch. Always compute $d = t - n$. If $t < n$ the
subtraction borrows, and the borrow is a bit that can be turned into a
**mask**: $-1$ in two's complement is a word of all ones, and $-0$ is a word of
zeros. Then select with bit operations: $d \oplus ((d \oplus t) \wedge
\text{mask})$ is $t$ when the mask is all ones and $d$ when it is zero.

```python
W = 64
ALL = (1 << W) - 1                           # a 64-bit word of ones

def reduce_branch(t, n):                     # leaks: the subtraction runs or it does not
    if t >= n:
        t -= n
    return t

def reduce_masked(t, n):                     # needs n < 2^63 and t < 2n
    d = (t - n) & ALL                        # always subtract; wraps around if t < n
    borrow = d >> (W - 1)                    # top bit: 1 exactly when t < n
    mask = -borrow & ALL                     # all ones if t < n, else all zeros
    return d ^ ((d ^ t) & mask)              # select t under the mask, else d

n = 97
print([reduce_masked(t, n) for t in (0, 50, 96, 97, 150, 193)])
print(format(-1 & ALL, "x"), format(-0 & ALL, "x"))

import random
rng = random.Random(4)
ok = True
for _ in range(100000):
    n = rng.randrange(1, 1 << 63)
    t = rng.randrange(2 * n)
    ok = ok and reduce_masked(t, n) == reduce_branch(t, n)
print(ok)
```

It prints:

```text
[0, 50, 96, 0, 53, 96]
ffffffffffffffff 0
True
```

Why is the top bit of $d$ the borrow? If $t \geq n$ then $d = t - n < n <
2^{63}$, so the top bit is 0. If $t < n$ the subtraction wraps to $d = 2^{64} -
(n - t)$, and since $n - t \leq n < 2^{63}$, $d > 2^{63}$ and the top bit is 1.
For a $k$-word number the same idea runs over all the words: subtract word by
word with the borrow carried right to the end (never stopping early), make the
mask from the final borrow, and select every word under it.

Two warnings go with this listing. Python cannot run it in constant time
(its integers have variable length), so the code shows the *logic* of the fix,
not its timing
([Engineering, §5.9](../engineering/05-Constant-Time-Programming.md#59-why-python-cannot-be-constant-time-and-what-it-is-still-for)).
And in C a compiler that recognizes the pattern may turn the masks back into
a branch, which is why libraries check their compiled code
([Engineering, §5.4](../engineering/05-Constant-Time-Programming.md#54-masks-from-comparisons-select-and-swap)
builds the masks and the select properly).

**The attacks that made this the rule.** Kocher's timing attack of 1996 and
the extra-reduction attacks of Schindler (2000) and Brumley and Boneh (2003)
measured total running time
([Cryptanalysis, §17.3](../cryptanalysis/17-Side-Channels-the-Attackers-View.md#173-kochers-timing-attack)).
Between 2005 and 2007 attackers learned to look inside the processor. In May
2005 Colin Percival showed that on a Pentium 4 with Hyper-Threading, a spy
process on the other logical core of the same physical core could watch
which cache lines OpenSSL's RSA code touched and recover much of the private
key. The same year Dag Arne Osvik, Adi Shamir and Eran Tromer, and separately
Daniel Bernstein, pulled AES keys out of the cache through the cipher's table
lookups, and Onur Acıiçmez and Werner Schindler sharpened the Brumley-Boneh
attack on the extra reduction (CCS 2005). Then Acıiçmez, Çetin Koç and
Jean-Pierre Seifert turned the branch predictor into a spy (CT-RSA 2007),
and showed that a popular half-fix, always performing a dummy subtraction but
still choosing the result with a branch, leaks through the predictor anyway; a
follow-up with Shay Gueron found more such branches in OpenSSL. The lesson
that came out of those three years is the rule constant-time code follows
today: no branch and no memory address may depend on a secret
([Cryptanalysis, §17.4](../cryptanalysis/17-Side-Channels-the-Attackers-View.md#174-cache-attacks-primeprobe-and-flushreload)).

### Inverses in practice: Fermat, Euclid and safegcd

Elliptic-curve code inverts a secret-dependent number at least once per
scalar multiplication, to leave projective coordinates (Chapter 12). There are
three ways to do it.

**Fermat.** For a prime $p$, Fermat's little theorem (Chapter 4) gives $a^{p-1}
\equiv 1$, so $a^{-1} \equiv a^{p-2} \pmod p$. This is an exponentiation with a
public, fixed exponent, so a constant-time exponentiation gives a
constant-time inverse with no new code. The price is size: for $p = 2^{255} -
19$ the standard addition chain takes 254 squarings and 11 multiplications,
about 265 modular multiplications for one inverse.

**Euclid.** The table of §3.4 needs about 149 division steps for a 255-bit
modulus, and since nearly all the quotients are small, most steps are far
cheaper than a modular multiplication, so it is much faster.
But the number of steps, the quotients and the branches all depend on the
input; Lamé's bound limits the count, it does not fix it.

**The binary gcd.** Josef Stein observed in 1967 that division can be replaced
by halving and subtracting, using three facts: $\gcd(2a, 2b) = 2\gcd(a, b)$;
$\gcd(a, 2b) = \gcd(a, b)$ when $a$ is odd; and $\gcd(a, b) = \gcd(a, b - a)$,
which for two odd numbers gives an even difference to halve. *By hand,* $\gcd(48,
180)$: both even, twice, so take out $4$ and continue with $(12, 45)$; $12 \to 6
\to 3$; then $(3, 45) \to (3, 42) \to (3, 21) \to (3, 18) \to (3, 9) \to (3, 6)
\to (3, 3) \to (3, 0)$, so the gcd is $4 \cdot 3 = 12$. On a computer, shifts and
subtractions are cheap; but the branches still depend on the data.

**safegcd.** In 2019 Daniel Bernstein and Bo-Yin Yang published a variant
built from one tiny step, the **divstep**, which acts on a counter $\delta$, an
odd $f$ and any $g$:

$$\operatorname{divstep}(\delta, f, g) = \begin{cases} (1 - \delta,\ g,\ (g - f)/2) & \text{if } \delta > 0 \text{ and } g \text{ odd,}\\ (1 + \delta,\ f,\ (g + (g \bmod 2)\, f)/2) & \text{otherwise.} \end{cases}$$

Every divstep keeps $\gcd(f, g)$ unchanged (up to sign and the factor 2, which
cannot divide the odd $f$), and $g$ eventually reaches 0, leaving $\pm\gcd$ in
$f$. The point of the design is that Bernstein and Yang *proved* a bound on how
many divsteps are ever needed for inputs of a given size. So a constant-time
program simply runs that many divsteps every time, whatever the input, and
each divstep becomes masks and selects as above. For 256-bit inputs their bound
is 741 divsteps. Pieter Wuille later brought it down to 724 with a
computer-assisted method, and a variant with $\delta$ starting at $1/2$ needs at
most 590, a bound Russell O'Connor and Andrew Poelstra verified in the Coq proof
assistant; the Bitcoin library libsecp256k1 uses that variant. Real code runs
divsteps in batches of 62 on single 64-bit words and applies them to the big
numbers as a $2 \times 2$ matrix, which is what makes it fast; Bernstein and
Yang report it beating Fermat for Curve25519, which had been thought to be
Fermat's home ground. To get the inverse and not just the gcd, carry two more
numbers $d, e$ with $f \equiv d\,x$ and $g \equiv e\,x \pmod M$ through every
step, exactly the invariant of the one-column table in §3.4.

```python
def binary_gcd(a, b):                        # Stein (1967): shifts and subtractions only
    if a == 0 or b == 0:
        return a | b
    shift = 0
    while (a | b) & 1 == 0:                  # both even: gcd(2a, 2b) = 2 gcd(a, b)
        a, b, shift = a >> 1, b >> 1, shift + 1
    while a & 1 == 0:
        a >>= 1
    while b:
        while b & 1 == 0:                    # b even, a odd: gcd(a, 2b) = gcd(a, b)
            b >>= 1
        if a > b:
            a, b = b, a
        b -= a                               # both odd: gcd(a, b) = gcd(a, b - a)
    return a << shift

def div2(M, x):                              # x / 2 modulo the odd number M
    return (x + M if x & 1 else x) >> 1

def safegcd_inverse(x, M, steps):            # Bernstein-Yang divsteps, a fixed count
    delta, f, g, d, e = 1, M, x, 0, 1        # invariants: f = d*x and g = e*x (mod M)
    for _ in range(steps):
        if delta > 0 and g & 1:
            delta, f, g, d, e = 1 - delta, g, (g - f) >> 1, e, div2(M, e - d)
        elif g & 1:
            delta, f, g, d, e = 1 + delta, f, (g + f) >> 1, d, div2(M, e + d)
        else:
            delta, f, g, d, e = 1 + delta, f, g >> 1, d, div2(M, e)
    assert g == 0 and abs(f) == 1            # f is now +-gcd(x, M)
    return d * f % M

def divsteps_used(x, M):                     # how many divsteps until g first hits 0
    delta, f, g, count = 1, M, x, 0
    while g:
        if delta > 0 and g & 1:
            delta, f, g = 1 - delta, g, (g - f) >> 1
        else:
            delta, g = 1 + delta, (g + (g & 1) * f) >> 1
        count += 1
    return count

def euclid_steps(a, n):
    count = 0
    while a:
        n, a, count = a, n % a, count + 1
    return count

print(binary_gcd(1071, 462), binary_gcd(48, 180), safegcd_inverse(17, 43, 22))
p = 2**255 - 19
print(safegcd_inverse(2, p, 741) == (p + 1) // 2)

import random
rng = random.Random(1)
xs = [rng.randrange(1, p) for _ in range(2000)]
print(all(safegcd_inverse(x, p, 741) * x % p == 1 for x in xs[:100]))
ds, es = [divsteps_used(x, p) for x in xs], [euclid_steps(x, p) for x in xs]
print("divsteps:", min(ds), max(ds), "  Euclid steps:", min(es), max(es))
```

It prints:

```text
21 12 38
True
True
divsteps: 501 556   Euclid steps: 115 183
```

The inverse of 17 modulo 43 comes out as 38 again, after a fixed 22 divsteps
(the bound for 6-bit inputs). The last line is the argument for safegcd: over
2,000 random inputs modulo $2^{255} - 19$, Euclid took from 115 to 183 steps,
a spread an attacker can time; the divsteps needed ranged from 501 to 556, and
the constant-time loop runs 741 regardless, so the spread never shows.

A last comparison, timed in Python with the same caution as before:

```python
# Uses safegcd_inverse() from the listing above.
import random, timeit

p = 2**255 - 19
rng = random.Random(2)
xs = [rng.randrange(1, p) for _ in range(200)]
ways = {"pow(x, -1, p), Euclid in C": lambda: [pow(x, -1, p) for x in xs],
        "pow(x, p - 2, p), Fermat in C": lambda: [pow(x, p - 2, p) for x in xs],
        "safegcd, 741 divsteps in Python": lambda: [safegcd_inverse(x, p, 741) for x in xs]}
for name, f in ways.items():
    t = min(timeit.repeat(f, number=5, repeat=3)) / 1000
    print(f"{name:32} {t * 1e6:7.1f} microseconds per inverse")
```

On the machine of §3.8 two runs gave about 15 µs per inverse for the built-in
`pow(x, -1, p)` (extended Euclid in C), about 113 µs for Fermat's $x^{p-2}$
(also in C) and about 170 µs for safegcd in Python. Euclid is fastest and the
only one not constant time in principle; Fermat pays about seven times as much
for constant time; the Python safegcd is slow only because it is interpreted,
and its speed shows in the batched C versions.

## 3.11 Going deeper

*Level: expert.*

**Ideals and quotient rings.** The set $n\mathbb{Z}$ of multiples of $n$ is an
**ideal** of $\mathbb{Z}$: closed under addition and under multiplication by
any integer. The ring $\mathbb{Z}/n\mathbb{Z}$ is the **quotient** of
$\mathbb{Z}$ by this ideal, and the same construction applied to polynomials
gives the fields of Chapter 8 ($\mathbb{F}_2[x]/(x^8 + x^4 + x^3 + x + 1)$ for
AES) and the rings of Chapter 15 ($\mathbb{Z}_q[x]/(x^{256} + 1)$ for ML-KEM).
The Chinese remainder theorem holds for any commutative ring and coprime ideals
$I + J = R$: $R/(I \cap J) \cong R/I \times R/J$. The number-theoretic transform
of Chapter 11 is exactly this theorem applied to polynomials.

**The structure of $(\mathbb{Z}/n\mathbb{Z})^*$.** By the CRT, the unit group
splits into the unit groups modulo each prime power. Gauss proved that
$(\mathbb{Z}/p^k\mathbb{Z})^*$ is cyclic for odd $p$ (it has an element whose
powers give everything), that $(\mathbb{Z}/2^k\mathbb{Z})^*$ for $k \geq 3$ is
not cyclic but is a product of a group of order 2 and a cyclic group of order
$2^{k-2}$, and hence that $(\mathbb{Z}/n\mathbb{Z})^*$ is cyclic exactly for $n
= 1, 2, 4, p^k, 2p^k$. Chapter 4 proves the prime case.

**Hensel lifting.** To solve a polynomial equation modulo $p^k$, solve it
modulo $p$ and lift the solution one power at a time, using a step like
Newton's method. This computes inverses modulo $2^{64}$ in a handful of
multiplications (used to find $N'$ in Montgomery's method), and square roots
modulo prime powers.

**Residue number systems.** Hardware designers sometimes represent big numbers
permanently by their residues modulo many small coprime moduli, so that
addition and multiplication are done in parallel on small numbers with no
carries between them. Comparison and division become the hard operations. RNS
arithmetic appears in some RSA and lattice accelerators and in fully
homomorphic encryption libraries, which do most of their arithmetic this way.

## Check yourself

??? question "1. Is $-23 \equiv 17 \pmod 8$? What is $-23 \bmod 8$?"

    $-23 - 17 = -40 = -5 \cdot 8$, so yes. $-23 = -3 \cdot 8 + 1$, so $-23
    \bmod 8 = 1$; and $17 \bmod 8 = 1$ too.

??? question "2. Use the one-column Euclid table to find $11^{-1} \bmod 26$, the number that undoes the affine-cipher key $a = 11$."

    Rows $(r, t)$: $(26, 0)$, $(11, 1)$; $26 = 2 \cdot 11 + 4$ gives $(4, -2)$;
    $11 = 2 \cdot 4 + 3$ gives $(3, 5)$; $4 = 1 \cdot 3 + 1$ gives $(1, -7)$. So
    $11^{-1} \equiv -7 \equiv 19 \pmod{26}$. Check: $11 \cdot 19 = 209 = 8
    \cdot 26 + 1$.

??? question "3. Which elements of $\mathbb{Z}/20\mathbb{Z}$ are units? Find the inverse of 13."

    Those coprime to 20: 1, 3, 7, 9, 11, 13, 17, 19, so $\varphi(20) = 8$.
    $13 \cdot 17 = 221 = 11 \cdot 20 + 1$, so $13^{-1} = 17$.

??? question "4. Solve $9x \equiv 6 \pmod{15}$."

    $\gcd(9, 15) = 3$ divides 6, so there are 3 solutions. Divide by 3: $3x
    \equiv 2 \pmod 5$, $x \equiv 2 \cdot 2 = 4 \pmod 5$. Modulo 15: $x = 4, 9,
    14$.

??? question "5. Solve $x \equiv 1 \pmod 4$, $x \equiv 2 \pmod 9$, $x \equiv 3 \pmod{25}$."

    Garner: $x \equiv 1 \pmod 4$; next, $1 + 4t \equiv 2 \pmod 9$ gives $4t \equiv
    1$, $t = 7$, $x = 29 \pmod{36}$; next, $29 + 36t \equiv 3 \pmod{25}$ gives
    $11t \equiv -26 \equiv 24$, $11^{-1} \equiv 16$, $t \equiv 384 \equiv 9$, so $x
    = 29 + 324 = 353 \pmod{900}$. Check: $353 = 88 \cdot 4 + 1 = 39 \cdot 9 + 2 = 14
    \cdot 25 + 3$.

??? question "6. Given $N = 3233$ and $\varphi(N) = 3120$, find the factors."

    $s = N - \varphi(N) + 1 = 114$. $s^2 - 4N = 12996 - 12932 = 64$, square root 8.
    So $p, q = (114 \pm 8)/2 = 53, 61$.

??? question "7. Find all four square roots of 1 modulo 21, and use one to factor 21."

    Mod 3 and mod 7 the roots are $\pm 1$. Combining: 1, 20, and the mixed
    ones 8 ($\equiv 2 \equiv -1 \pmod 3$, $\equiv 1 \pmod 7$) and 13 ($\equiv 1
    \pmod 3$, $\equiv -1 \pmod 7$). Then $\gcd(8 - 1, 21) = 7$ and $\gcd(13 - 1,
    21) = 3$.

??? question "8. In Montgomery's method with $N = 97$, $R = 128$, what is the Montgomery form of 1, and why is it not 1?"

    $\bar 1 = R \bmod N = 128 - 97 = 31$. The form of $a$ is $aR \bmod N$, so the
    number that acts as 1 in Montgomery arithmetic is $R \bmod N$.

??? question "9. Why does `return t - n if t >= n else t` leak in a Montgomery multiplication with a secret operand, and what does the masked version compute instead? Check it by hand for $n = 97$ and $t = 50$ with 8-bit words."

    The branch makes the time, the branch-predictor state and the code fetched
    depend on whether the extra reduction happened, which is correlated with
    the secret. The masked version always computes $d = t - n$ and picks $t$ or
    $d$ with bit operations. With 8-bit words, $d = (50 - 97) \bmod 256 = 209$,
    whose top bit is 1 (since $209 \geq 128$), so the mask is $255$ and the
    result is $209 \oplus ((209 \oplus 50) \wedge 255) = 50$: no subtraction,
    the same operations as when $t \geq n$.

??? question "10. A device computes RSA-CRT signatures and a fault corrupts $m_q$ instead of $m_p$. What does $\gcd(s'^e - m, N)$ give, and why does verifying before output stop the attack?"

    It gives $p$, by the same argument with the roles swapped. Verifying catches
    the faulty $s'$ (since $s'^e \not\equiv m \pmod N$) and the device never
    releases it, so the attacker never sees a value that is right mod one prime
    and wrong mod the other.

## What you learned

- $a \equiv b \pmod n$ means $n \mid a - b$; it is an equivalence relation with
  $n$ classes, and sums and products of classes are well defined, so you can
  reduce at every step.
- $\mathbb{Z}/n\mathbb{Z}$ is a commutative ring. Its units are the $a$ with
  $\gcd(a, n) = 1$, found by the extended Euclidean algorithm; the other non-zero
  elements are zero divisors. For prime $p$ it is the field $\mathbb{F}_p$.
- $\varphi(n)$ counts the units; $\varphi(pq) = (p-1)(q-1)$, and knowing it is
  as good as knowing $p$ and $q$.
- $ax \equiv b \pmod n$ is solvable exactly when $\gcd(a, n) \mid b$.
- The CRT says $\mathbb{Z}/n_1n_2\mathbb{Z} \cong \mathbb{Z}/n_1\mathbb{Z}
  \times \mathbb{Z}/n_2\mathbb{Z}$ for coprime moduli: arithmetic splits into
  independent coordinates. Garner's algorithm computes it.
- An inverse comes from Euclid with one coefficient column, kept so that
  $r \equiv t \cdot a$; the number of steps varies with the input (Lamé's
  bound caps it).
- Without coprime moduli, the CRT system is solvable exactly when the
  residues agree modulo the gcd; Garner's $t$ values are mixed-radix digits.
- Montgomery and Barrett reduction avoid division. Per 2,048-bit modular
  multiplication they cost 2,080 and 2,177 word multiplications; Montgomery's
  conversions pay off after 33 multiplications, so it wins long chains and
  Barrett wins one-off reductions. Python timings cannot show the difference.
- The conditional subtraction must be done with a borrow mask and a select,
  never a branch: the cache and branch-predictor attacks of 2005 to 2007 read
  exactly such branches.
- Inverses: Euclid is fast but variable-time, Fermat's $a^{p-2}$ is constant
  time but slow, and Bernstein-Yang safegcd runs a proven fixed number of
  divsteps and is both.
- RSA-CRT is four times faster, and a single fault in it reveals the key unless
  the result is verified before release.

**Next:** [Chapter 4](04-Powers-and-Primitive-Roots.md), powers modulo $n$:
fast exponentiation, Fermat's and Euler's theorems, orders and generators.

## Further reading

- Carl Friedrich Gauss, *Disquisitiones Arithmeticae* (1801): introduced the
  congruence notation $\equiv$ and the theory of this chapter.
- Victor Shoup, *A Computational Introduction to Number Theory and Algebra*, 2nd
  edition (Cambridge, 2009), chapters 2 and 3.
- Kenneth Ireland and Michael Rosen, *A Classical Introduction to Modern Number
  Theory*, 2nd edition (Springer, 1990).
- Peter Montgomery, "Modular Multiplication Without Trial Division",
  *Mathematics of Computation* 44 (1985).
- Harvey L. Garner, "The Residue Number System", *IRE Transactions on
  Electronic Computers* EC-8 (1959).
- Gabriel Lamé, "Note sur la limite du nombre des divisions dans la recherche
  du plus grand commun diviseur entre deux nombres entiers", *Comptes rendus
  de l'Académie des Sciences* 19 (1844).
- Josef Stein, "Computational Problems Associated with Racah Algebra",
  *Journal of Computational Physics* 1 (1967): the binary gcd.
- Donald Knuth, *The Art of Computer Programming*, volume 2, *Seminumerical
  Algorithms*, 3rd edition (Addison-Wesley, 1997), §4.5.2 and §4.5.3 on the
  binary gcd and the analysis of Euclid's algorithm.
- Paul Barrett, "Implementing the Rivest Shamir and Adleman Public Key
  Encryption Algorithm on a Standard Digital Signal Processor" (CRYPTO 1986).
- Alfred Menezes, Paul van Oorschot and Scott Vanstone, *Handbook of Applied
  Cryptography* (CRC, 1996; free online), chapter 14 on efficient arithmetic.
- Antoon Bosselaers, René Govaerts and Joos Vandewalle, "Comparison of Three
  Modular Reduction Functions" (CRYPTO 1993): classical, Barrett and
  Montgomery side by side.
- Çetin Kaya Koç, Tolga Acar and Burton S. Kaliski Jr., "Analyzing and
  Comparing Montgomery Multiplication Algorithms", *IEEE Micro* 16(3) (1996).
- Daniel J. Bernstein and Bo-Yin Yang, "Fast Constant-Time gcd Computation and
  Modular Inversion", *IACR Transactions on Cryptographic Hardware and
  Embedded Systems* 2019(3); the libsecp256k1 note "The safegcd
  implementation in libsecp256k1 explained" for the 590-divstep variant.
- Dan Boneh, Richard DeMillo and Richard Lipton, "On the Importance of Checking
  Cryptographic Protocols for Faults" (EUROCRYPT 1997).
- Werner Schindler, "A Timing Attack against RSA with the Chinese Remainder
  Theorem" (CHES 2000); David Brumley and Dan Boneh, "Remote Timing Attacks are
  Practical" (USENIX Security 2003).
- Colin Percival, "Cache Missing for Fun and Profit" (BSDCan 2005); Dag Arne
  Osvik, Adi Shamir and Eran Tromer, "Cache Attacks and Countermeasures: the
  Case of AES" (CT-RSA 2006); Daniel J. Bernstein, "Cache-Timing Attacks on
  AES" (2005).
- Onur Acıiçmez and Werner Schindler, "Improving Brumley and Boneh Timing
  Attack on Unprotected SSL Implementations" (CCS 2005); Onur Acıiçmez, Çetin
  Kaya Koç and Jean-Pierre Seifert, "Predicting Secret Keys via Branch
  Prediction" (CT-RSA 2007); Onur Acıiçmez, Shay Gueron and Jean-Pierre
  Seifert, "New Branch Prediction Vulnerabilities in OpenSSL and Necessary
  Software Countermeasures" (IACR ePrint 2007/039).
- Florian Weimer, "Factoring RSA Keys With TLS Perfect Forward Secrecy" (Red Hat,
  2015).
- George Arnold Sullivan, Jackson Sippe, Nadia Heninger and Eric Wustrow, "Open
  to a Fault: On the Passive Compromise of TLS Keys via Transient Errors"
  (USENIX Security 2022); Keegan Ryan, Kaiwen He, George Arnold Sullivan and
  Nadia Heninger, "Passive SSH Key Compromise via Lattices" (CCS 2023).
- RFC 8017, PKCS #1: RSA Cryptography Specifications Version 2.2 (2016).
- In *The cryptography book*: [Chapter 3](../../book/03-The-Arithmetic-of-Secrets.md),
  [Chapter 13](../../book/13-RSA.md), [Chapter 18](../../book/18-Side-Channels.md).
- In the sibling books: [Cryptographic engineering, Chapter 5](../engineering/05-Constant-Time-Programming.md)
  (constant-time code) and [Chapter 6](../engineering/06-Big-Numbers-and-Public-Key-Code.md)
  (limbs, Montgomery and Barrett in word code);
  [Cryptanalysis, Chapter 13](../cryptanalysis/13-Attacks-on-RSA.md) (the CRT fault
  attack) and [Chapter 17](../cryptanalysis/17-Side-Channels-the-Attackers-View.md)
  (side channels).
