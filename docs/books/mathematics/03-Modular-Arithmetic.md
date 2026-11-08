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
    - which elements have inverses, the group of units, and zero divisors;
    - Euler's $\varphi$ function and its formula;
    - when $ax \equiv b \pmod n$ has solutions, and how many;
    - the Chinese remainder theorem, its proof, Garner's algorithm, and the
      ring isomorphism behind it;
    - Montgomery and Barrett reduction, and why constant time matters;
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
sols and a bit, and the sol-of-year counter wraps in the same way.

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
<figcaption>Figure 3.1. Residue classes modulo 7. Every integer lands on one of seven points; integers on the same point are congruent.</figcaption>
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
in two independent coordinates. Figure 3.2 shows the 15 numbers laid out on a
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
<figcaption>Figure 3.2. The Chinese remainder theorem for 15 = 3 × 5. Each number 0 to 14 has its own pair of remainders, and every pair occurs once.</figcaption>
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
step uses only multiplication, addition, and shifts by a word size.

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
called **constant-time**.

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

Montgomery is usually faster for long exponentiations; Barrett suits a single
reduction or a fixed modulus where conversion costs would not pay off. Many
post-quantum implementations use small versions of both: ML-KEM's reference code
reduces modulo $q = 3329$ with a 16-bit Montgomery reduction and a Barrett
reduction (Chapter 15).

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
<figcaption>Figure 3.3. RSA signing with the Chinese remainder theorem. Two half-size exponentiations, one per prime, joined by Garner's formula: about four times faster. If a fault strikes one half, the released signature is right modulo one prime and wrong modulo the other, and one gcd factors N.</figcaption>
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
`a - b + p` and subtract $p$ under a mask.

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

??? question "2. Find the last two digits of $7^{100}$ without a computer."

    Work mod 100. $7^2 = 49$, $7^4 = 2401 \equiv 1$. So $7^{100} = (7^4)^{25}
    \equiv 1$. The last two digits are 01.

??? question "3. Which elements of $\mathbb{Z}/20\mathbb{Z}$ are units? Find the inverse of 13."

    Those coprime to 20: 1, 3, 7, 9, 11, 13, 17, 19, so $\varphi(20) = 8$.
    $13 \cdot 17 = 221 = 11 \cdot 20 + 1$, so $13^{-1} = 17$.

??? question "4. Compute $\varphi(2^{16})$, $\varphi(10^6)$ and $\varphi(77)$."

    $2^{15} = 32768$; $10^6 = 2^6 5^6$ gives $2^5 \cdot 5^5 \cdot 4 = 400000$;
    $77 = 7 \cdot 11$ gives $6 \cdot 10 = 60$.

??? question "5. Solve $9x \equiv 6 \pmod{15}$."

    $\gcd(9, 15) = 3$ divides 6, so there are 3 solutions. Divide by 3: $3x
    \equiv 2 \pmod 5$, $x \equiv 2 \cdot 2 = 4 \pmod 5$. Modulo 15: $x = 4, 9,
    14$.

??? question "6. Solve $x \equiv 1 \pmod 4$, $x \equiv 2 \pmod 9$, $x \equiv 3 \pmod{25}$."

    Garner: $x \equiv 1 \pmod 4$; next, $1 + 4t \equiv 2 \pmod 9$ gives $4t \equiv
    1$, $t = 7$, $x = 29 \pmod{36}$; next, $29 + 36t \equiv 3 \pmod{25}$ gives
    $11t \equiv -26 \equiv 24$, $11^{-1} \equiv 16$, $t \equiv 384 \equiv 9$, so $x
    = 29 + 324 = 353 \pmod{900}$. Check: $353 = 88 \cdot 4 + 1 = 39 \cdot 9 + 2 = 14
    \cdot 25 + 3$.

??? question "7. Given $N = 3233$ and $\varphi(N) = 3120$, find the factors."

    $s = N - \varphi(N) + 1 = 114$. $s^2 - 4N = 12996 - 12932 = 64$, square root 8.
    So $p, q = (114 \pm 8)/2 = 53, 61$.

??? question "8. Find all four square roots of 1 modulo 21, and use one to factor 21."

    Mod 3 and mod 7 the roots are $\pm 1$. Combining: 1, 20, and the mixed
    ones 8 ($\equiv 2 \equiv -1 \pmod 3$, $\equiv 1 \pmod 7$) and 13 ($\equiv 1
    \pmod 3$, $\equiv -1 \pmod 7$). Then $\gcd(8 - 1, 21) = 7$ and $\gcd(13 - 1,
    21) = 3$.

??? question "9. In Montgomery's method with $N = 97$, $R = 128$, what is the Montgomery form of 1, and why is it not 1?"

    $\bar 1 = R \bmod N = 128 - 97 = 31$. The form of $a$ is $aR \bmod N$, so the
    number that acts as 1 in Montgomery arithmetic is $R \bmod N$.

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
- Montgomery and Barrett reduction avoid division; their data-dependent steps
  must run in constant time.
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
- Paul Barrett, "Implementing the Rivest Shamir and Adleman Public Key
  Encryption Algorithm on a Standard Digital Signal Processor" (CRYPTO 1986).
- Alfred Menezes, Paul van Oorschot and Scott Vanstone, *Handbook of Applied
  Cryptography* (CRC, 1996; free online), chapter 14 on efficient arithmetic.
- Dan Boneh, Richard DeMillo and Richard Lipton, "On the Importance of Checking
  Cryptographic Protocols for Faults" (EUROCRYPT 1997).
- Werner Schindler, "A Timing Attack against RSA with the Chinese Remainder
  Theorem" (CHES 2000); David Brumley and Dan Boneh, "Remote Timing Attacks are
  Practical" (USENIX Security 2003).
- Florian Weimer, "Factoring RSA Keys With TLS Perfect Forward Secrecy" (Red Hat,
  2015).
- George Arnold Sullivan, Jackson Sippe, Nadia Heninger and Eric Wustrow, "Open
  to a Fault: On the Passive Compromise of TLS Keys via Transient Errors"
  (USENIX Security 2022); Keegan Ryan, Kaiwen He, George Arnold Sullivan and
  Nadia Heninger, "Passive SSH Key Compromise via Lattices" (CCS 2023).
- RFC 8017, PKCS #1: RSA Cryptography Specifications Version 2.2 (2016).
- In *The cryptography book*: [Chapter 3](../../book/03-The-Arithmetic-of-Secrets.md),
  [Chapter 13](../../book/13-RSA.md), [Chapter 18](../../book/18-Side-Channels.md).
