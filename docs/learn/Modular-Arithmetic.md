# Modular arithmetic

*Clock arithmetic: the one piece of math every public-key algorithm is built
on. Remainders, the greatest common divisor, inverses, fast powers and the
Chinese remainder theorem, each with a few lines of Python.*

## Remainders

$a \bmod n$ is the remainder when $a$ is divided by $n$: $17 \bmod 5 = 2$,
since $17 = 3 \cdot 5 + 2$. Python writes it `17 % 5`. On a clock with $n$
hours you only ever see $0, 1, \ldots, n-1$: 10 o'clock plus 5 hours is 3
o'clock, because $15 \bmod 12 = 3$.

Two numbers are **congruent mod $n$** if they leave the same remainder, written

$$
a \equiv b \pmod n \quad\Longleftrightarrow\quad n \text{ divides } a - b .
$$

So $17 \equiv 2 \equiv -3 \pmod 5$. Gauss introduced this notation in
*Disquisitiones Arithmeticae* (1801), the book that made number theory a subject
of its own.

The useful fact: you can reduce **at any step** of adding, subtracting and
multiplying, and the answer mod $n$ doesn't change.

$$
(a + b) \bmod n = ((a \bmod n) + (b \bmod n)) \bmod n, \qquad
(a b) \bmod n = ((a \bmod n)(b \bmod n)) \bmod n .
$$

That is why a computer can work with $m^{65537} \bmod n$ for a 2048-bit $n$:
it reduces after every multiplication, so numbers never grow beyond about
4096 bits.

Division is the odd one out. There is no "$\div$" mod $n$; instead you multiply
by an **inverse**, which may not exist. Getting it needs the gcd.

## The greatest common divisor

$\gcd(a, b)$ is the largest number dividing both. **Euclid's algorithm**
(*Elements*, Book VII, about 300 BC) finds it by replacing the pair
$(a, b)$ with $(b, a \bmod b)$ until the second number is 0:

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

print(gcd(1071, 462))   # 21
```

It is fast: the numbers at least halve every two steps, so a 2048-bit gcd takes
at most about 3,000 steps. That speed matters for an odd reason: in 2012 a team
ran gcd on millions of public RSA keys from the internet and found tens of
thousands that shared a prime with another key, which gave away both
("Mining your Ps and Qs", see [Retired RNGs](../09-random/Retired.md)).

## Inverses and the extended Euclid algorithm

The **inverse** of $a$ mod $n$ is a number $a^{-1}$ with $a \cdot a^{-1} \equiv 1 \pmod n$.
For example $3 \cdot 7 = 21 \equiv 1 \pmod{10}$, so $3^{-1} = 7$ mod 10. An inverse
exists **exactly when $\gcd(a, n) = 1$**. (Try to find $2^{-1}$ mod 10: $2x$ is
always even, never $\equiv 1$.)

To find it, run Euclid backwards. **Bézout's identity** says there are always
integers $x, y$ with

$$
a x + n y = \gcd(a, n).
$$

If the gcd is 1, reduce mod $n$: $a x \equiv 1$, so $x$ is the inverse.

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

print(egcd(240, 46))   # (2, -9, 47): 240*(-9) + 46*47 = 2
print(inv(17, 3120))   # 2753, the RSA private exponent in the RSA page's example
```

Python 3.8+ has this built in: `pow(17, -1, 3120)`.

**The story.** The Indian astronomer Aryabhata gave this method, the
*kuṭṭaka* ("pulveriser"), in the *Aryabhatiya* of AD 499, to solve
$a x + b y = c$ in whole numbers for calendar calculations. Brahmagupta
extended it in 628. Europe met the same method over a thousand years later, through
Claude Bachet in the 17th century.

## Fast powers

Public-key cryptography lives on numbers like $m^e \bmod n$ with $e$ of
hundreds of digits. Multiplying $m$ by itself $e$ times would take longer than
the age of the universe. **Square and multiply** reads $e$ in binary and
needs only about $2 \log_2 e$ multiplications:

$$
5^{13} = 5^{8} \cdot 5^{4} \cdot 5^{1}, \quad 13 = 1101_2 .
$$

Start with 1. For each bit from the left, square; if the bit is 1, also
multiply by the base. Press Step to watch it:

<div class="mars-modexp" data-base="5" data-exp="13" data-mod="23" data-label="5¹³ mod 23"></div>

```python
def power(b, e, n):                 # square and multiply, right to left
    r = 1
    b %= n
    while e:
        if e & 1:
            r = r * b % n
        b = b * b % n
        e >>= 1
    return r

print(power(5, 13, 23), pow(5, 13, 23))   # 21 21
```

The idea is old. Pingala's *Chandaḥśāstra* (India, about 200 BC), a work on
poetic meter, computes powers of 2 by halving and squaring.

The order in which it squares and multiplies depends on the secret exponent's
bits, and that has been measured from timing and power use to steal keys.
Real libraries use a fixed sequence of operations; see
[Side channels](Side-Channels.md).

## Fermat's little theorem and Euler's theorem

**Fermat (1640):** if $p$ is prime and $p$ doesn't divide $a$, then

$$
a^{p-1} \equiv 1 \pmod p .
$$

Check: $3^{100} \bmod 101 = 1$, and 101 is prime. Pierre de Fermat stated it
in a letter to Frénicle de Bessy without proof, as he usually did; Euler
published the first proof in 1736.

**Euler (1763)** made it work for any $n$. Let $\varphi(n)$, **Euler's totient**,
count the numbers from 1 to $n$ that share no factor with $n$. Then for
$\gcd(a, n) = 1$:

$$
a^{\varphi(n)} \equiv 1 \pmod n .
$$

For a prime, $\varphi(p) = p - 1$, which gives Fermat back. For $n = p q$ with
two primes, $\varphi(n) = (p-1)(q-1)$: for $3233 = 61 \cdot 53$ it is
$60 \cdot 52 = 3120$.

This is the engine of [RSA](../02-signatures/RSA.md): choose $e$ and $d$ with
$e d \equiv 1 \pmod{\varphi(n)}$, so $e d = 1 + t \varphi(n)$, and

$$
(m^e)^d = m^{1 + t \varphi(n)} = m \cdot \left(m^{\varphi(n)}\right)^t \equiv m \pmod n .
$$

Anyone who knows $p$ and $q$ can compute $\varphi(n)$ and so $d$; anyone who
only knows $n$ is stuck, as far as we know, because factoring is hard.

Fermat's theorem also gives a quick **primality test**: if
$a^{n-1} \not\equiv 1 \pmod n$, then $n$ is certainly not prime. The converse
fails: $2^{340} \equiv 1 \pmod{341}$, yet $341 = 11 \cdot 31$. Fixing that
weakness is what [Miller-Rabin](../10-math-foundations/Miller-Rabin-Primality-Test.md) does.

## The Chinese remainder theorem

**The story.** The *Sunzi Suanjing* (China, 3rd to 5th century) asks: "There
are things whose number is unknown. Counted by threes, two are left; by fives,
three are left; by sevens, two are left. How many things?" The answer is 23.
In 1247 Qin Jiushao's *Mathematical Treatise in Nine Sections* gave the general
method, the *dayan* rule, centuries before it appeared in Europe.

**The theorem.** If $m_1, \ldots, m_k$ share no factors pairwise, then for any
remainders $r_1, \ldots, r_k$ there is exactly one $x$ below $M = m_1 m_2 \cdots m_k$
with $x \equiv r_i \pmod{m_i}$ for all $i$:

$$
x = \sum_i r_i \, M_i \, (M_i^{-1} \bmod m_i) \bmod M, \qquad M_i = M / m_i .
$$

```python
def crt(rs, ms):                    # x = r_i mod m_i, the m_i pairwise coprime
    x, M = 0, 1
    for m in ms:
        M *= m
    for r, m in zip(rs, ms):
        Mi = M // m
        x += r * Mi * inv(Mi, m)
    return x % M

print(crt([2, 3, 2], [3, 5, 7]))   # 23
```

**Why cryptographers care.** Working mod $p$ and mod $q$ separately and joining
the answers is about four times faster than working mod $n = pq$ directly, so
every RSA library decrypts and signs this way (RSA-CRT). It has a famous trap:
in 1996 Boneh, DeMillo and Lipton at Bellcore showed that if one of the two
halves is computed wrongly, through a glitch or a deliberate fault, the faulty
signature reveals a factor of $n$ with a single gcd. Libraries now check each
signature before releasing it.

## Summary

| Tool | What it does | Where it's used |
|---|---|---|
| $\bmod n$ | keeps numbers small | everything |
| Euclid | $\gcd$ | key checks, attacks on shared primes |
| Extended Euclid | inverses | RSA's $d$, ECDSA's $k^{-1}$, curve arithmetic |
| Square and multiply | $b^e \bmod n$ fast | RSA, Diffie-Hellman, DSA, primality tests |
| Fermat and Euler | why RSA decrypts | RSA, primality tests |
| CRT | split a problem across factors | fast RSA, attacks on small subgroups |

## Try it

??? question "1. Find $7^{-1} \bmod 26$ (needed to decrypt an affine cipher with $a = 7$)."

    $7 \cdot 15 = 105 = 4 \cdot 26 + 1$, so $7^{-1} = 15$. In Python: `pow(7, -1, 26)`.

??? question "2. Compute $3^{20} \bmod 7$ without a computer."

    7 is prime, so $3^{6} \equiv 1$. $20 = 3 \cdot 6 + 2$, so $3^{20} \equiv 3^{2} = 9 \equiv 2 \pmod 7$.

??? question "3. With $p = 5$, $q = 11$, $e = 3$: what is RSA's $d$?"

    $n = 55$, $\varphi(n) = 4 \cdot 10 = 40$, and $3 d \equiv 1 \pmod{40}$ gives $d = 27$
    ($3 \cdot 27 = 81 = 2 \cdot 40 + 1$). Check: encrypt $m = 2$: $2^3 = 8$; decrypt
    $8^{27} \bmod 55$ = `pow(8, 27, 55)` $= 2$.

??? question "4. What is the smallest positive $x$ with $x \equiv 1 \pmod 4$, $x \equiv 2 \pmod 5$?"

    17. Try the numbers $\equiv 2 \pmod 5$: 2, 7, 12, 17, and 17 leaves 1 when divided by 4.
    Or `crt([1, 2], [4, 5])`.
