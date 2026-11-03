# 3. The Arithmetic of Secrets

*Public-key cryptography, from RSA to Diffie-Hellman to elliptic curves, is built
on a small amount of number theory: arithmetic with remainders, prime numbers,
the greatest common divisor, inverses, fast powers and a few theorems from the
17th and 18th centuries. This chapter teaches all of it, with each idea worked
by hand on small numbers and then coded in a few lines of Python. It ends with
the tool every key generator uses to find primes hundreds of digits long.*

!!! abstract "In this chapter"

    **You will learn:**

    - modular arithmetic: congruences, and why you can reduce at every step
    - primes: why there are infinitely many, how common they are, and how to list them
    - Euclid's algorithm for the gcd, and the extended version that computes inverses
    - square-and-multiply, which computes $b^e \bmod n$ for numbers of thousands of bits
    - Fermat's little theorem, Euler's theorem and the Chinese remainder theorem
    - primality testing, from trial division to Miller-Rabin, and how real keys get their primes

    **You need:** [Chapter 1](01-What-Cryptography-Is-For.md) and
    [Chapter 2](02-Classical-Ciphers.md), which used arithmetic mod 26 without
    explaining it. School algebra helps.

    **Levels:** sections 3.1 to 3.5 are for beginners, 3.6 to 3.10 are
    intermediate, and 3.12 is expert.

## 3.1 The problem

In [Chapter 2](02-Classical-Ciphers.md) the affine cipher needed a number
$a^{-1}$ with $a \cdot a^{-1} \equiv 1 \pmod{26}$, and we used Python's
`pow(a, -1, 26)` without asking how it works or why it fails for $a = 13$.
Public-key cryptography needs the same thing at an enormous scale. An RSA key
is built from two primes of about 300 digits each; encrypting raises a
600-digit number to a power and takes the remainder; making the private key
needs an inverse modulo a 600-digit number. None of that can be done by the
methods you learned at school. Multiplying a number by itself $e$ times, with
$e$ of 600 digits, would take longer than the age of the universe.

The tools that make it fast are old, and they come from all over the world.
Euclid's *Elements* (Alexandria, about 300 BC) gives the gcd algorithm and the
proof that primes never run out. Eratosthenes, head of the Library of
Alexandria, gave the sieve. The Chinese *Sunzi Suanjing* (3rd to 5th century)
poses the first remainder puzzle, and Qin Jiushao solved the general case in
1247. The Indian astronomer Aryabhata gave the method for inverses, the
*kuṭṭaka*, in AD 499. Pingala's work on poetic meter (India, about 200 BC)
computed powers of 2 by halving and squaring. Ibn al-Haytham, working in Cairo
around 1000, solved remainder problems of the same kind. Pierre de Fermat, a
lawyer in Toulouse, stated his little theorem in a letter in 1640; Leonhard
Euler proved and generalized it in the 18th century; Carl Friedrich Gauss
organized the whole subject in his *Disquisitiones Arithmeticae* of 1801.

For two thousand years this was the purest of pure mathematics, studied for its
beauty. G. H. Hardy wrote in 1940 that number theory had no warlike use. Since
1977 it has protected most of the world's communication.

## 3.2 Remainders and congruences

$a \bmod n$ is the remainder when $a$ is divided by $n$: $17 \bmod 5 = 2$,
since $17 = 3 \cdot 5 + 2$. On a clock with $n$ hours you only ever see
$0, 1, \ldots, n-1$: 10 o'clock plus 5 hours is 3 o'clock, because
$15 \bmod 12 = 3$. Python writes it `17 % 5`, and always returns a result
between 0 and $n - 1$, even for negative numbers: `-3 % 5` is 2.

Two numbers are **congruent mod $n$** if they leave the same remainder, which
is the same as saying their difference is a multiple of $n$:

$$
a \equiv b \pmod n \quad\Longleftrightarrow\quad n \mid (a - b) .
$$

(The bar $\mid$ means "divides".) So $17 \equiv 2 \equiv -3 \equiv 22 \pmod 5$.
Gauss introduced this notation in 1801.

**The rule that makes everything work.** You can reduce mod $n$ at any step of
adding, subtracting and multiplying, and the final answer mod $n$ doesn't
change:

$$
(a + b) \bmod n = ((a \bmod n) + (b \bmod n)) \bmod n, \qquad
(a b) \bmod n = ((a \bmod n)(b \bmod n)) \bmod n .
$$

*Why:* write $a = qn + r$ and $b = q'n + r'$. Then
$ab = (qq'n + qr' + q'r)\,n + rr'$, so $ab$ and $rr'$ differ by a multiple of
$n$. The same works for sums.

This is why a computer can handle $m^{65537} \bmod n$ for a 2048-bit $n$: it
reduces after every multiplication, so no number ever grows beyond about 4096
bits. It also gives quick mental tricks. What is $2^{100} \bmod 7$? Since
$2^3 = 8 \equiv 1$, we get $2^{99} = (2^3)^{33} \equiv 1$, so
$2^{100} \equiv 2$.

```python
print(17 % 5, -3 % 5, (10 + 5) % 12, 2**100 % 7)    # 2 2 3 2
```

**Division is the odd one out.** There is no "$\div$" mod $n$. Instead you
multiply by an **inverse**, a number $a^{-1}$ with $a \cdot a^{-1} \equiv 1$.
Mod 10, the inverse of 3 is 7, since $3 \cdot 7 = 21 \equiv 1$. But 2 has no
inverse mod 10: $2x$ is always even, and an even number is never 1 more than a
multiple of 10. Which numbers have inverses is decided by the greatest common
divisor ([§3.4](#34-the-greatest-common-divisor-and-euclids-algorithm)).

## 3.3 Primes

A **prime** is a whole number above 1 whose only divisors are 1 and itself: 2,
3, 5, 7, 11, 13, ... Every other number above 1 is **composite**, a product of
smaller numbers.

**Every number is a product of primes, in only one way.** $360 = 2^3 \cdot 3^2 \cdot 5$,
and no other collection of primes multiplies to 360. This is the
**fundamental theorem of arithmetic**. Its key step, that a prime dividing a
product must divide one of the factors, is in Euclid (*Elements* VII.30); Gauss
gave the first complete proof of uniqueness in 1801. RSA rests on the gap
between the two directions: multiplying primes is easy, and finding them again
from the product is, as far as anyone knows, very hard.

**There are infinitely many.** Euclid's proof (*Elements* IX.20) is two lines.
Suppose there were only finitely many primes $p_1, \ldots, p_k$. Look at
$N = p_1 p_2 \cdots p_k + 1$. Dividing $N$ by any $p_i$ leaves remainder 1, so
none of them divides $N$; but $N$ has some prime factor. That prime is not on
the list, a contradiction.

**Listing them: the sieve of Eratosthenes.** Write the numbers from 2 to $n$.
Circle 2 and cross out its multiples; circle the next number not crossed out
(3) and cross out its multiples; and so on. What is never crossed out is prime.
You can stop at $\sqrt{n}$, because a composite number up to $n$ has a factor
no bigger than $\sqrt{n}$.

```python
from math import isqrt, log

def sieve(n):                               # all primes up to n
    is_p = bytearray([1]) * (n + 1)
    is_p[0] = is_p[1] = 0
    for i in range(2, isqrt(n) + 1):
        if is_p[i]:
            is_p[i * i::i] = bytearray(len(is_p[i * i::i]))   # cross out multiples of i
    return [i for i in range(n + 1) if is_p[i]]

print(sieve(50))
# [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47]
for n in (10**3, 10**5, 10**7):
    print(n, len(sieve(n)), round(n / log(n)))
# 1000 168 145
# 100000 9592 8686
# 10000000 664579 620421
```

**How common are they?** The last column is $n / \ln n$. Gauss guessed, as a
teenager around 1792, that the number of primes up to $n$ is about
$n / \ln n$; Jacques Hadamard and Charles de la Vallée Poussin proved it,
independently, in 1896. This **prime number theorem** says that near $x$, about
one number in $\ln x$ is prime. For a random 1024-bit number that is one in
$1024 \ln 2 \approx 710$; for a random *odd* 1024-bit number, one in 355. So a
key generator that picks random odd numbers and tests each finds a 1024-bit
prime after a few hundred tries ([§3.9](#39-primality-testing)). There are about $10^{305}$ primes of
that size, far too many for anyone to list (see the
[FAQ](../FAQ.md#can-an-attacker-just-pre-calculate-everything-and-look-up-the-answer)).

The appendix has more on primes: the [sieve](../10-math-foundations/Sieve-of-Eratosthenes.md),
[Fermat primes](../10-math-foundations/Fermat-Primes.md) such as $65537$, RSA's
favorite exponent, and [Mersenne primes](../10-math-foundations/Mersenne-Primes.md)
such as $2^{127} - 1$.

## 3.4 The greatest common divisor and Euclid's algorithm

$\gcd(a, b)$ is the largest number that divides both $a$ and $b$. If it is 1,
$a$ and $b$ are **coprime**. You could find it by factoring both numbers, but
factoring is exactly what we can't do for big numbers. Euclid's algorithm
(*Elements* VII.2) never factors anything. It uses one fact: any number dividing
$a$ and $b$ also divides $a - qb$ for any $q$, so

$$
\gcd(a, b) = \gcd(b,\; a \bmod b) .
$$

Replace the pair $(a, b)$ by $(b, a \bmod b)$ until the second number is 0; the
first is the answer. Press Step:

<div class="mars-steps" markdown>

1. $\gcd(1071, 462)$: $1071 = 2 \cdot 462 + 147$, so look at $(462, 147)$.
2. $462 = 3 \cdot 147 + 21$, so look at $(147, 21)$.
3. $147 = 7 \cdot 21 + 0$. The remainder is 0, so the answer is $21$.

</div>

```python
def gcd(a, b):
    while b:
        a, b = b, a % b
    return a

print(gcd(1071, 462), gcd(3233, 3599))     # 21 61
```

**It is fast.** In two steps the first number at least halves (if $b \le a/2$
then $a \bmod b < b \le a/2$; otherwise $a \bmod b = a - b < a/2$). So a
2048-bit gcd takes at most about 4,000 steps, and far fewer in practice.
Gabriel Lamé proved in 1844 that the number of steps is at most five times the
number of decimal digits of the smaller number; the worst case is two
consecutive Fibonacci numbers.

That speed has a dark side, and it is in the second example above. $3233$ and
$3599$ are two toy RSA moduli; their gcd, 61, is a prime they share, and then
$3233 = 61 \cdot 53$ and $3599 = 61 \cdot 59$ are both factored. In 2012 a
team collected millions of real RSA public keys from the internet and found,
with a fast all-pairs gcd, tens of thousands that shared a prime with another
key. Section 3.11 tells the story.

## 3.5 Inverses and the extended Euclid algorithm

The **inverse** of $a$ mod $n$ exists **exactly when $\gcd(a, n) = 1$**. Why:
if $d = \gcd(a, n) > 1$, then $a x - 1$ would have to be a multiple of $n$, so
a multiple of $d$; but $d$ divides $a x$, so $d$ would divide 1, which is
impossible. That is why the affine cipher can't use $a = 13$ mod 26, and why
2 has no inverse mod 10.

For the other direction, and to compute the inverse, run Euclid backwards.
**Bézout's identity** says there are always integers $x, y$ with

$$
a x + n y = \gcd(a, n) .
$$

If the gcd is 1, reduce mod $n$: $a x \equiv 1$, so $x$ is the inverse.

**By hand: the inverse of 7 mod 26.** Run Euclid on $(26, 7)$ and keep the
quotients:

$$
\begin{aligned}
26 &= 3 \cdot 7 + 5 \\
7 &= 1 \cdot 5 + 2 \\
5 &= 2 \cdot 2 + 1
\end{aligned}
$$

Now work back up, writing each remainder in terms of the ones above it:

$$
\begin{aligned}
1 &= 5 - 2 \cdot 2 \\
  &= 5 - 2 \cdot (7 - 5) = 3 \cdot 5 - 2 \cdot 7 \\
  &= 3 \cdot (26 - 3 \cdot 7) - 2 \cdot 7 = 3 \cdot 26 - 11 \cdot 7 .
\end{aligned}
$$

So $-11 \cdot 7 \equiv 1 \pmod{26}$, and $7^{-1} \equiv -11 \equiv 15$. Check:
$7 \cdot 15 = 105 = 4 \cdot 26 + 1$.

The code does the same bookkeeping recursively. If
$b x' + (a \bmod b) y' = g$, then since $a \bmod b = a - \lfloor a/b \rfloor b$,
rearranging gives $a y' + b (x' - \lfloor a/b \rfloor y') = g$:

```python
def egcd(a, b):                     # returns g, x, y with a*x + b*y = g
    if b == 0:
        return a, 1, 0
    g, x, y = egcd(b, a % b)
    return g, y, x - a // b * y

def inv(a, n):
    g, x, _ = egcd(a, n)
    if g != 1:
        raise ValueError("no inverse")
    return x % n

print(egcd(26, 7))                  # (1, 3, -11): 26*3 + 7*(-11) = 1
print(inv(7, 26), inv(17, 3120))    # 15 2753
```

Python 3.8 and later has this built in: `pow(7, -1, 26)` is 15. The second
example, $17^{-1} \bmod 3120 = 2753$, is exactly the step that makes an RSA
private key ([Chapter 13](13-RSA.md)).

**The story.** Aryabhata's *Aryabhatiya* (AD 499) gives this method, the
*kuṭṭaka* ("pulverizer"), for solving $a x + b y = c$ in whole numbers, which
astronomers needed to find when planetary cycles line up. Brahmagupta extended
it in 628. Europe met the same method over a thousand years later, through
Claude-Gaspard Bachet in the 17th century.

## 3.6 Fast powers: square and multiply

*Level: intermediate.* Public-key cryptography lives on numbers like
$m^e \bmod n$ with $e$ of hundreds of digits. **Square and multiply** reads $e$
in binary and needs only about $2 \log_2 e$ multiplications. The idea: every
power is built from squarings ($b^{2k} = (b^k)^2$) and one extra multiplication
($b^{2k+1} = (b^k)^2 \cdot b$). Read the bits of $e$ from the left; for each bit,
square what you have; if the bit is 1, also multiply by $b$.

**By hand: $5^{13} \bmod 23$**, with $13 = 1101_2$ in binary.

| Bit | Square | Multiply by 5 if the bit is 1 | Exponent so far |
|---|---|---|---|
| 1 | $1^2 = 1$ | $1 \cdot 5 = 5$ | 1 |
| 1 | $5^2 = 25 \equiv 2$ | $2 \cdot 5 = 10$ | 3 |
| 0 | $10^2 = 100 \equiv 8$ | (none) | 6 |
| 1 | $8^2 = 64 \equiv 18$ | $18 \cdot 5 = 90 \equiv 21$ | 13 |

So $5^{13} \bmod 23 = 21$, after four squarings and three multiplications
instead of twelve multiplications. Press Step to watch it:

<div class="mars-modexp" data-base="5" data-exp="13" data-mod="23" data-label="5¹³ mod 23"></div>

```python
def power(b, e, n):                 # square and multiply, reading e's bits from the top
    r = 1
    for bit in bin(e)[2:]:
        r = r * r % n
        if bit == "1":
            r = r * b % n
    return r

print(power(5, 13, 23), pow(5, 13, 23), power(65, 17, 3233))   # 21 21 2790
```

Python's built-in three-argument `pow(b, e, n)` does the same, much faster. For
a 2048-bit exponent it is about 2048 squarings and on average 1024
multiplications: a few milliseconds.

## 3.7 Fermat's little theorem and Euler's theorem

*Level: intermediate.* **Fermat (1640):** if $p$ is prime and $p$ doesn't divide
$a$, then

$$
a^{p-1} \equiv 1 \pmod p .
$$

Check: $3^{100} \bmod 101 = 1$, and 101 is prime. Fermat stated it in a letter
to Bernard Frénicle de Bessy without proof, as he usually did; Euler published
the first proof in 1736.

**Why it is true.** Take the $p - 1$ numbers $1, 2, \ldots, p - 1$ and multiply
each by $a$. The results $a, 2a, \ldots, (p-1)a$ are all different mod $p$
(if $ia \equiv ja$, multiply by $a^{-1}$ to get $i \equiv j$), and none is 0. So
they are the same $p - 1$ numbers in a different order. Multiply all of them
together both ways:

$$
a^{p-1} \cdot (p-1)! \equiv (p-1)! \pmod p ,
$$

and since $(p-1)!$ is coprime to $p$, cancel it: $a^{p-1} \equiv 1$.

**Euler (1763)** made it work for any modulus. Let $\varphi(n)$, **Euler's
totient**, count the numbers from 1 to $n$ that are coprime to $n$. For
example $\varphi(10) = 4$ (the numbers 1, 3, 7, 9). Then for $\gcd(a, n) = 1$:

$$
a^{\varphi(n)} \equiv 1 \pmod n .
$$

The proof is the same, using only the $\varphi(n)$ numbers coprime to $n$. For
a prime, $\varphi(p) = p - 1$, which gives Fermat back. For a product of two
different primes, $\varphi(pq) = (p-1)(q-1)$: of the $pq$ numbers, the
multiples of $p$ ($q$ of them) and of $q$ ($p$ of them) are not coprime, and
$pq$ itself was counted twice, so $\varphi = pq - p - q + 1$. For
$3233 = 61 \cdot 53$ it is $60 \cdot 52 = 3120$.

```python
from math import gcd as _gcd

def phi(n):                          # Euler's totient, by counting (fine for small n)
    return sum(1 for k in range(1, n + 1) if _gcd(k, n) == 1)

print(pow(3, 100, 101), phi(10), phi(3233))        # 1 4 3120
print([pow(a, phi(10), 10) for a in (1, 3, 7, 9)]) # [1, 1, 1, 1]
```

**Why it matters: exponents work mod $\varphi(n)$.** If $e d \equiv 1 \pmod{\varphi(n)}$,
then $e d = 1 + t \varphi(n)$ for some $t$, and for $m$ coprime to $n$

$$
(m^e)^d = m^{1 + t \varphi(n)} = m \cdot \left(m^{\varphi(n)}\right)^t \equiv m \pmod n .
$$

Raising to $e$ and then to $d$ gives back $m$. That is RSA, entire, in one
line ([Chapter 13](13-RSA.md)). Anyone who knows $p$ and $q$ can compute
$\varphi(n)$ and so $d$; anyone who knows only $n$ is stuck, as far as anyone
knows, because that seems to need factoring.

**A primality test, almost.** Fermat's theorem gives a quick test: if
$a^{n-1} \not\equiv 1 \pmod n$ for some $a$, then $n$ is certainly composite.
The converse fails: $2^{340} \equiv 1 \pmod{341}$, yet $341 = 11 \cdot 31$.
Section 3.9 fixes this.

## 3.8 The Chinese remainder theorem

*Level: intermediate.* **The story.** The *Sunzi Suanjing* (China, 3rd to 5th
century) asks: "There are things whose number is unknown. Counted by threes,
two are left; by fives, three are left; by sevens, two are left. How many
things?" The answer is 23. In 1247 Qin Jiushao's *Mathematical Treatise in Nine
Sections* gave the general method, the *dayan* rule, centuries before it
appeared in Europe.

**The theorem.** If $m_1, \ldots, m_k$ are pairwise coprime, then for any
remainders $r_1, \ldots, r_k$ there is exactly one $x$ with
$0 \le x < M = m_1 m_2 \cdots m_k$ and $x \equiv r_i \pmod{m_i}$ for all $i$.

**Building it.** Let $M_i = M / m_i$, the product of all the *other* moduli.
Then $M_i \equiv 0$ mod every $m_j$ except $m_i$, and it is coprime to $m_i$, so
it has an inverse there. The number $M_i \cdot (M_i^{-1} \bmod m_i)$ is 1 mod
$m_i$ and 0 mod everything else: a "switch" for position $i$. Add the switches,
each weighted by its remainder:

$$
x = \sum_i r_i \, M_i \, (M_i^{-1} \bmod m_i) \bmod M .
$$

**By hand: Sunzi's puzzle.** $M = 105$. $M_1 = 35 \equiv 2 \pmod 3$, inverse 2,
switch $70$. $M_2 = 21 \equiv 1 \pmod 5$, inverse 1, switch $21$.
$M_3 = 15 \equiv 1 \pmod 7$, inverse 1, switch $15$. So
$x = 2 \cdot 70 + 3 \cdot 21 + 2 \cdot 15 = 233 \equiv 23 \pmod{105}$. (The
numbers 70, 21 and 15 appear in a Chinese verse that schoolchildren learned for
this kind of puzzle.)

```python
def crt(rs, ms):                     # x = r_i mod m_i, the m_i pairwise coprime
    M = 1
    for m in ms:
        M *= m
    return sum(r * (M // m) * pow(M // m, -1, m) for r, m in zip(rs, ms)) % M

print(crt([2, 3, 2], [3, 5, 7]), crt([1, 2], [4, 5]))   # 23 17
```

**What it means.** Working mod $M$ is the same as working mod each $m_i$
separately: the map $x \mapsto (x \bmod m_1, \ldots, x \bmod m_k)$ is a
one-to-one correspondence that respects addition and multiplication. Two uses
in cryptography:

- **Speed.** RSA with $n = pq$ can work mod $p$ and mod $q$ separately and join
  the answers. Each half has numbers half as long and exponents half as long,
  so it is about four times faster, and every RSA library decrypts and signs
  this way.
- **Attacks.** An attacker who can solve a problem mod each small factor of a
  number can join the answers. That breaks Diffie-Hellman in groups whose order
  has only small factors ([Chapter 12](12-Diffie-Hellman.md)) and lets one
  message sent to three RSA users with $e = 3$ be read ([Chapter 13](13-RSA.md)).

## 3.9 Primality testing

*Level: intermediate.* A key generator needs a random 1024-bit prime. Trial
division by every number up to $\sqrt{n} \approx 2^{512}$ is hopeless. The
Fermat test is fast but can be fooled.

**Fooling Fermat.** Some composite numbers pass the Fermat test for *every* base
coprime to them. The smallest is $561 = 3 \cdot 11 \cdot 17$: for all 320 bases
$a$ coprime to 561, $a^{560} \equiv 1 \pmod{561}$. These are **Carmichael
numbers** (Robert Carmichael, 1910); the next are 1105, 1729, 2465, 2821 and
6601. In 1994 Alford, Granville and Pomerance proved there are infinitely many.

**The extra fact: square roots of 1.** Mod a prime $p$, the only solutions of
$x^2 \equiv 1$ are $x \equiv \pm 1$, because $p \mid (x - 1)(x + 1)$ forces $p$
to divide one factor. Mod a composite with two different odd prime factors
there are more: mod 15, $4^2 = 16 \equiv 1$. Finding a square root of 1 that
isn't $\pm 1$ proves $n$ composite.

**Miller-Rabin.** Write $n - 1 = d \cdot 2^s$ with $d$ odd, pick a base $a$, and
look at the sequence

$$
a^{d},\; a^{2d},\; a^{4d},\; \ldots,\; a^{2^{s-1} d} \pmod{n} ,
$$

each the square of the one before, ending (one squaring later) at $a^{n-1}$. If
$n$ is prime, $a^{n-1} \equiv 1$, and walking back, the first 1 in the sequence
must come right after a $-1$, unless the sequence starts at 1. So $n$ passes for
base $a$ if

$$
a^{d} \equiv 1 \quad\text{or}\quad a^{2^{j} d} \equiv -1 \pmod{n} \ \text{ for some } 0 \le j < s .
$$

If it fails, $a$ is a **witness** and $n$ is certainly composite.

**By hand: 561 with base 2.** $560 = 35 \cdot 2^4$, so $d = 35$, $s = 4$. The
sequence is $2^{35} \equiv 263$, then $263^2 \equiv 166$, $166^2 \equiv 67$,
$67^2 \equiv 1$. It reached 1 without passing through $560 \equiv -1$. So 67 is
a square root of 1 that is not $\pm 1$, which a prime can't have: 561 is
composite. As a bonus, $\gcd(67 - 1, 561) = 33$ and $\gcd(67 + 1, 561) = 17$
split it. For the prime 97 with base 5, $96 = 3 \cdot 2^5$, and the sequence
28, 8, 64, 22, 96 reaches $-1$, so 97 passes.

<div class="mars-modexp" data-base="2" data-exp="35" data-mod="561" data-label="Miller-Rabin start: 2³⁵ mod 561"></div>

Gary Miller gave the test in 1976, deterministic but relying on an unproved
hypothesis (the generalized Riemann hypothesis); Michael Rabin made it
randomized in 1980 and proved that for an odd composite $n$ (other than 9) at
most a quarter of the bases pass. So $k$ random bases leave a chance of at most
$4^{-k}$ of calling a composite "prime", and 40 rounds give $2^{-80}$.

```python
import secrets

def is_probable_prime(n, rounds=40):
    if n < 2:
        return False
    for p in (2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37):   # quick check for small factors
        if n % p == 0:
            return n == p
    d, s = n - 1, 0
    while d % 2 == 0:
        d, s = d // 2, s + 1
    for _ in range(rounds):
        x = pow(secrets.randbelow(n - 3) + 2, d, n)
        if x in (1, n - 1):
            continue
        for _ in range(s - 1):
            x = x * x % n
            if x == n - 1:
                break
        else:
            return False                 # this base is a witness: n is composite
    return True

print(is_probable_prime(561), is_probable_prime(2**127 - 1), is_probable_prime(2**128 + 1))
# False True False
```

The bases come from `secrets`, not `random`, for a reason given in [§3.11](#311-break-it-when-the-arithmetic-leaks).

## 3.10 Code it: making a prime

*Level: intermediate.* Now the real thing: pick random odd numbers of the right
size and test each one until a prime turns up.

```python
def random_prime(bits):
    while True:
        p = secrets.randbits(bits) | 1 << (bits - 1) | 1     # force full length and odd
        if is_probable_prime(p):
            return p

p = random_prime(1024)
print(p.bit_length(), is_probable_prime(p))                 # 1024 True
```

By the prime number theorem about one odd 1024-bit number in 355 is prime, so
the loop runs a few hundred times and finishes in well under a second. Real
libraries add two refinements. They sieve the candidates first, throwing out
anything divisible by the first few thousand primes before any expensive test,
which removes most candidates for almost nothing. And for RSA they set the top
two bits, so that the product of two such primes has exactly twice the length.
FIPS 186-5 (Appendix B) gives the exact rules, including how many Miller-Rabin
rounds each size needs. Libraries often add a Lucas test on top: the
combination, [Baillie-PSW](../10-math-foundations/Baillie-PSW-Primality-Test.md),
has no known composite that passes.

Here is the whole toolkit of this chapter in one table:

| Tool | What it does | Cost for $b$-bit numbers | Where it's used |
|---|---|---|---|
| $\bmod n$ | keeps numbers small | one division | everything |
| Euclid | $\gcd(a, b)$ | about $b$ steps | key checks, attacks on shared primes |
| Extended Euclid | inverses mod $n$ | about $b$ steps | RSA's $d$, ECDSA's $k^{-1}$, curve arithmetic |
| Square and multiply | $b^e \bmod n$ | about $1.5\,b$ multiplications | RSA, Diffie-Hellman, DSA, primality tests |
| Fermat and Euler | exponents mod $\varphi(n)$ | (theory) | why RSA decrypts |
| CRT | split work across coprime factors | a few inverses | fast RSA, attacks on small subgroups |
| Miller-Rabin | is $n$ prime? | one modular power per round | every key generator |

## 3.11 Break it: when the arithmetic leaks

*Level: intermediate.* The theorems above are as safe as mathematics gets. The
code that uses them is not, and each tool in this chapter has been at the
center of a real attack.

**Shared primes, found by gcd (2012).** Nadia Heninger, Zakir Durumeric, Eric
Wustrow and J. Alex Halderman scanned the whole IPv4 internet for TLS and SSH
keys and ran a fast all-pairs gcd over millions of RSA moduli. They factored
the keys of 0.50% of the TLS hosts they found. Almost all were routers and
other small devices that generated keys at first boot, before their random
generator had collected any randomness, so different devices sometimes picked
the same first prime. One gcd breaks both keys, as $\gcd(3233, 3599) = 61$ did
above. The cause was bad randomness, the subject of
[Chapter 4](04-Randomness-and-Perfect-Secrecy.md).

**Square and multiply leaks its exponent (1996).** The table in [§3.6](#36-fast-powers-square-and-multiply) does an
extra multiplication for every 1 bit. If the exponent is a secret key, the time
and the power drawn depend on its bits. Count the multiplications for two
16-bit exponents:

```python
def power_count(b, e, n):           # square and multiply, counting the multiplications
    r, count = 1, 0
    for bit in bin(e)[2:]:
        r, count = r * r % n, count + 1
        if bit == "1":
            r, count = r * b % n, count + 1
    return r, count

n = 2**127 - 1
print(power_count(3, 0b1000000000000001, n)[1], power_count(3, 0b1111111111111111, n)[1])   # 18 32
```

Paul Kocher showed in 1996 that timing measurements like these recover RSA and
Diffie-Hellman private keys, and later that power traces show each squaring and
multiplication directly. The fix is to do the same operations whatever the
bits are. The **Montgomery ladder** keeps two values and does one multiplication
and one squaring for every bit, so the sequence of operations no longer
depends on the key (real code also avoids secret-dependent branches and memory
access):

```python
def ladder(b, e, n, bits):          # always one multiply and one square per bit
    r0, r1 = 1, b % n
    for i in reversed(range(bits)):
        if (e >> i) & 1:
            r0, r1 = r0 * r1 % n, r1 * r1 % n
        else:
            r0, r1 = r0 * r0 % n, r0 * r1 % n
    return r0

print(ladder(5, 13, 23, 4), ladder(65, 17, 3233, 16))   # 21 2790
```

Python's `pow` is not built to be constant-time. Use it to learn; use a
cryptography library for real keys ([Chapter 18](18-Side-Channels.md)).

**A CRT glitch gives away the key (1996).** Dan Boneh, Richard DeMillo and
Richard Lipton at Bellcore showed that if one of the two halves of an RSA-CRT
signature is computed wrongly, through a hardware glitch or a deliberately
induced fault, then the faulty signature $s'$ satisfies
$s'^e \equiv m \pmod p$ but not mod $q$, and $\gcd(s'^e - m, n) = p$. One bad
signature and one gcd factor the key. Libraries now verify every signature
before releasing it.

**Weak primality tests (2018).** In "Prime and Prejudice", Martin Albrecht, Jake
Massimo, Kenneth Paterson and Juraj Somorovsky built composite numbers that
passed the primality tests in several libraries, which used fixed bases or too
few rounds. That matters when an attacker can supply the "prime", for example
the parameters of a Diffie-Hellman group. With random bases and enough rounds,
as in the code above, no such numbers can be built in advance.

**Primes with a pattern (2017).** The ROCA flaw: a widely used Infineon library
generated RSA primes of a special form to make generation faster. The form
made the keys factorable, and Estonia had to block the certificates on about
750,000 national ID cards. The lesson from all five cases is the same:
**primes must be random, generated and tested by vetted code.**

## 3.12 Going deeper

*Level: expert.* Four topics that connect this chapter to the rest of the book.

**The structure underneath: groups.** The numbers mod $n$ that have inverses
form a set closed under multiplication, written $\mathbb{Z}_n^*$, with
$\varphi(n)$ elements. It is a **group**: multiplication is associative, there
is an identity (1), and every element has an inverse. Euler's theorem is a
special case of **Lagrange's theorem**: in a finite group of order $N$, every
element raised to the power $N$ gives the identity. For a prime $p$,
$\mathbb{Z}_p^*$ is **cyclic**: some element $g$, a generator, has powers that
run through all $p - 1$ elements. Diffie-Hellman lives in such groups, and
[Chapter 12](12-Diffie-Hellman.md) develops them properly.

**How fast is the arithmetic?** For $b$-bit numbers, schoolbook multiplication
costs about $b^2$ word operations; Karatsuba's method (1960) brings it to about
$b^{1.585}$, and big-number libraries switch to it above a few thousand bits.
Modular reduction is the expensive part of a modular power. **Montgomery
multiplication** (Peter Montgomery, 1985) replaces the division by $n$ with
shifts, by working with numbers in the form $x R \bmod n$ where $R$ is a power
of 2. Almost every RSA and Diffie-Hellman implementation uses it. A full
2048-bit modular power therefore costs about $2048 \times 1.5$ multiplications of
2048-bit numbers, each a few thousand word operations.

**Proving primes.** Miller-Rabin says "probably prime". To *prove* primality,
**Pocklington's criterion** (1914) works when the factors of $n - 1$ are partly
known: if $n - 1 = F R$ with $F > \sqrt{n}$ fully factored, and some $a$ has
$a^{n-1} \equiv 1$ and $\gcd(a^{(n-1)/q} - 1, n) = 1$ for each prime $q \mid F$,
then $n$ is prime. That builds certified primes from smaller ones
([Pocklington test](../10-math-foundations/Pocklington-Primality-Test.md)). In
2002 Manindra Agrawal, Neeraj Kayal and Nitin Saxena, at IIT Kanpur, gave the
first deterministic primality test that runs in polynomial time with no
unproved assumption ("PRIMES is in P"). It settled a famous open question, but
it is far slower than Miller-Rabin, which is what everyone uses.

**Why at most a quarter of bases lie.** Call a base that wrongly passes a
**strong liar**. For a composite $n$, the strong liars sit inside a proper
subgroup of $\mathbb{Z}_n^*$ (or a union of cosets with total size at most a
quarter); Monier and Rabin, in 1980, showed that for odd composite $n > 9$
there are at most $\varphi(n)/4$ of them. The bound is reached: $703 = 19 \cdot 37$
has $\varphi(703) = 648$ and exactly 162 strong liars. For a *random* large
candidate the true error is far smaller than $4^{-k}$; Damgård, Landrock and
Pomerance (1993) showed that a few rounds suffice for random 1024-bit numbers.
The $4^{-k}$ bound matters when the number may be chosen by an adversary,
which is the "Prime and Prejudice" case above.

**What is not known.** Nobody has proved that factoring is hard. The best
classical method, the general number field sieve, takes time roughly
$\exp\!\left(1.923\, (\ln n)^{1/3} (\ln \ln n)^{2/3}\right)$, which is why
RSA keys must be thousands of bits for 128-bit security, and Shor's quantum
algorithm would factor in polynomial time
([Chapter 20](20-Quantum-Computers.md)). See
[Hard problems](../10-math-foundations/Hard-Problems.md) for every problem
modern cryptography rests on.

## Exercises

??? question "1. Compute $123 \bmod 7$, $-20 \bmod 7$, and $(123 \cdot 456) \bmod 7$ without multiplying 123 by 456."

    $123 = 17 \cdot 7 + 4$, so 4. $-20 = -3 \cdot 7 + 1$, so 1. $456 = 65 \cdot 7 + 1$, so
    $456 \equiv 1$, and the product is $\equiv 4 \cdot 1 = 4$.

??? question "2. Find $\gcd(252, 198)$ with Euclid's algorithm."

    $252 = 1 \cdot 198 + 54$; $198 = 3 \cdot 54 + 36$; $54 = 1 \cdot 36 + 18$; $36 = 2 \cdot 18 + 0$.
    The gcd is 18.

??? question "3. Find $11^{-1} \bmod 26$ by the extended Euclid algorithm, then check it."

    $26 = 2 \cdot 11 + 4$; $11 = 2 \cdot 4 + 3$; $4 = 1 \cdot 3 + 1$. Back up:
    $1 = 4 - 3 = 4 - (11 - 2 \cdot 4) = 3 \cdot 4 - 11 = 3(26 - 2 \cdot 11) - 11 = 3 \cdot 26 - 7 \cdot 11$.
    So $11^{-1} \equiv -7 \equiv 19$. Check: $11 \cdot 19 = 209 = 8 \cdot 26 + 1$.

??? question "4. Compute $3^{20} \bmod 7$ without a computer."

    7 is prime, so $3^{6} \equiv 1$. $20 = 3 \cdot 6 + 2$, so $3^{20} \equiv 3^{2} = 9 \equiv 2 \pmod 7$.

??? question "5. How many squarings and multiplications does square and multiply need for $e = 65537$?"

    $65537 = 2^{16} + 1$ is $1$ followed by fifteen 0s and a 1 in binary: 17 bits.
    Seventeen squarings (the first, of 1, is trivial) and two multiplications. That is
    why RSA's public operation is so fast.

??? question "6. Find $\varphi(35)$ and check Euler's theorem with $a = 2$."

    $35 = 5 \cdot 7$, so $\varphi(35) = 4 \cdot 6 = 24$. And $2^{24} \bmod 35$: $2^{12} = 4096 = 117 \cdot 35 + 1$,
    so $2^{12} \equiv 1$ and $2^{24} \equiv 1$.

??? question "7. Find the smallest positive $x$ with $x \equiv 1 \pmod 4$, $x \equiv 2 \pmod 5$, $x \equiv 3 \pmod 7$."

    $M = 140$. Switches: $35 \cdot (35^{-1} \bmod 4) = 35 \cdot 3 = 105$; $28 \cdot (28^{-1} \bmod 5) = 28 \cdot 2 = 56$;
    $20 \cdot (20^{-1} \bmod 7) = 20 \cdot 6 = 120$. So $x = 105 + 2 \cdot 56 + 3 \cdot 120 = 577 \equiv 17 \pmod{140}$.
    Check: $17 = 4 \cdot 4 + 1 = 3 \cdot 5 + 2 = 2 \cdot 7 + 3$.

??? question "8. Show that 341 is composite with Miller-Rabin, base 2."

    $340 = 85 \cdot 4$, so $d = 85$, $s = 2$. $2^{85} \bmod 341 = 32$, not $\pm 1$. Square:
    $32^2 = 1024 = 3 \cdot 341 + 1$, so 1, reached without passing $-1$. 341 is composite
    (and $\gcd(31, 341) = 31$, $\gcd(33, 341) = 11$ split it), even though it passes Fermat's
    test with base 2.

??? question "9. A random odd 2048-bit number is tested for primality. Roughly what is the chance it is prime, and how many candidates does a key generator expect to try?"

    Near $x = 2^{2048}$ about one number in $\ln x = 2048 \ln 2 \approx 1420$ is prime, and one odd
    number in about 710. So about 710 candidates on average, fewer after sieving out small factors.

??? question "10. Two RSA public keys are $n_1 = 1{,}022{,}117$ and $n_2 = 1{,}028{,}171$. Factor both."

    $\gcd(1022117, 1028171)$: $1028171 - 1022117 = 6054$; $1022117 = 168 \cdot 6054 + 5045$;
    $6054 = 1 \cdot 5045 + 1009$; $5045 = 5 \cdot 1009 + 0$. The gcd is 1009, a shared prime, so
    $n_1 = 1009 \cdot 1013$ and $n_2 = 1009 \cdot 1019$. At real sizes this is the 2012 attack.

## What you learned

- Arithmetic mod $n$ lets you reduce at every step; division becomes
  multiplication by an inverse, which exists exactly when $\gcd(a, n) = 1$.
- Every number factors uniquely into primes; there are infinitely many, and
  about one in $\ln x$ numbers near $x$ is prime.
- Euclid's algorithm finds gcds in a number of steps proportional to the bit
  length; run backwards, it gives inverses (Aryabhata's *kuṭṭaka*).
- Square and multiply computes $b^e \bmod n$ with about $1.5$ multiplications
  per bit of $e$.
- Fermat's and Euler's theorems make exponents work mod $\varphi(n)$, which is
  exactly why RSA decrypts.
- The Chinese remainder theorem splits work across coprime factors: fast RSA,
  and some attacks.
- Miller-Rabin with random bases finds big primes quickly; real failures came
  from bad randomness, leaky code, faults and fixed bases, not from the
  mathematics.

**Next:** [Chapter 4](04-Randomness-and-Perfect-Secrecy.md) asks what it means
for a key to be random, proves that one cipher is perfectly unbreakable, and
shows why random numbers are where real systems fail most often.

## Further reading

- Euclid, *Elements*, Books VII and IX (about 300 BC); any edition with Heath's
  commentary.
- Carl Friedrich Gauss, *Disquisitiones Arithmeticae* (1801).
- G. H. Hardy and E. M. Wright, *An Introduction to the Theory of Numbers*
  (6th edition, 2008).
- Victor Shoup, *A Computational Introduction to Number Theory and Algebra*
  (2nd edition, 2009), free online from the author.
- Michael O. Rabin, "Probabilistic Algorithm for Testing Primality", *Journal of
  Number Theory* 12 (1980).
- Manindra Agrawal, Neeraj Kayal and Nitin Saxena, "PRIMES is in P", *Annals of
  Mathematics* 160 (2004).
- Nadia Heninger, Zakir Durumeric, Eric Wustrow and J. Alex Halderman, "Mining
  Your Ps and Qs", USENIX Security 2012.
- FIPS 186-5, Appendix B: generating primes for RSA.
- On this site: [Miller-Rabin](../10-math-foundations/Miller-Rabin-Primality-Test.md),
  [Baillie-PSW](../10-math-foundations/Baillie-PSW-Primality-Test.md),
  [Pocklington](../10-math-foundations/Pocklington-Primality-Test.md),
  [Sieve of Eratosthenes](../10-math-foundations/Sieve-of-Eratosthenes.md) and
  [Hard problems](../10-math-foundations/Hard-Problems.md).
