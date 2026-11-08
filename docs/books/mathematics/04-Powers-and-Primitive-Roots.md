# 4. Powers, Orders and Primitive Roots

*RSA raises a number to a power to encrypt and to another power to decrypt.
Diffie-Hellman raises a fixed number to a secret power. Both need three things
from mathematics: a way to compute huge powers fast, a reason why decryption
undoes encryption, and an understanding of how the powers of a number cycle.
This chapter supplies all three: square-and-multiply and the Montgomery ladder,
Fermat's little theorem and Euler's theorem with full proofs, the order of an
element, Carmichael's function, primitive roots and how to find them, and the
Pohlig-Hellman decomposition that explains why the groups used in practice are
built around safe primes. You will prove RSA correct, and solve a discrete
logarithm by splitting it into three small ones.*

!!! abstract "In this chapter"
    **You will learn:**

    - how to compute $g^e \bmod n$ with about $1.5$ multiplications per bit of
      $e$, three ways, and which one leaks;
    - Fermat's little theorem and Euler's theorem, with proofs, and the full
      proof that RSA decrypts correctly;
    - the order of an element, and why it divides $\varphi(n)$;
    - Carmichael's function $\lambda(n)$ and where it appears in RSA;
    - primitive roots: when they exist, how many there are, how to find one;
    - discrete logarithms, and how Pohlig and Hellman reduce them to the
      prime factors of the group order;
    - safe primes, Schnorr groups, the standard Diffie-Hellman groups, and
      Logjam.

    **You need:** [Chapter 3](03-Modular-Arithmetic.md) (units, $\varphi$, the
    Chinese remainder theorem). *The cryptography book*,
    [Chapter 12](../../book/12-Diffie-Hellman.md) and
    [Chapter 13](../../book/13-RSA.md), use the results of this chapter.

    **Levels:** §4.1 to §4.4 are for beginners, §4.5 to §4.10 are
    intermediate, §4.11 is expert.

## 4.1 The problem

*Level: beginner.*

The city water plant in Arcadia City reports its tank levels to the
operations office every hour, signed so that nobody can fake a reading. The
signature is RSA: the plant computes $s = m^d \bmod N$ for a 3,072-bit modulus
and private exponent. Done naively, $m^d$ means multiplying $m$ by itself $d - 1$
times, and $d$ is a number with about 925 digits. The universe is too young for
that. Yet the plant's small processor signs in a fraction of a second.

Then the office checks the signature by computing $s^e \bmod N$ with $e =
65537$, and gets $m$ back. Why? Nothing in ordinary arithmetic says that
raising to the power $d$ and then to the power $e$ should return where you
started. It does so only because of a theorem about the finite world of Chapter
3, a theorem Fermat stated in 1640 and Euler proved and generalized.

And when the plant and the office first agreed on the key for their encrypted
channel, they used Diffie-Hellman: each raised a public number $g$ to a secret
power modulo a public prime $p$. That only works well if the powers of $g$ run
through a very large set before repeating. Choosing $p$ and $g$ so that they do,
and so that no shortcut splits the problem into easy pieces, is the subject of
the second half of this chapter.

## 4.2 Square and multiply

*Level: beginner.*

### By hand

Compute $3^{45} \bmod 101$. Write the exponent in binary: $45 = 101101_2 = 32 +
8 + 4 + 1$. Start from 1 and read the bits from the left. For each bit,
**square** the running value, and if the bit is 1, also **multiply** by 3.

| bit | step | value mod 101 |
|---|---|---|
| 1 | $1^2 \cdot 3$ | 3 |
| 0 | $3^2$ | 9 |
| 1 | $9^2 \cdot 3 = 243$ | 41 |
| 1 | $41^2 \cdot 3 = 5043$ | 94 |
| 0 | $94^2 = 8836$ | 49 |
| 1 | $49^2 \cdot 3 = 7203$ | 32 |

So $3^{45} \equiv 32 \pmod{101}$. Why it works: after reading the bits $b_1 b_2
\dots b_k$ the value is $3^{(b_1 b_2 \dots b_k)_2}$. Squaring doubles the
exponent (appends a 0 bit) and multiplying by 3 adds 1 (turns that 0 into a
1). After all six bits the exponent is $101101_2 = 45$.

That took 6 squarings and 4 multiplications instead of 44 multiplications. For
an exponent of $n$ bits, the method needs $n$ squarings and on average $n/2$
multiplications, about $1.5n$ in all. A 3,072-bit exponent needs about 4,600
modular multiplications, each a few microseconds: a few tens of milliseconds.
This **square-and-multiply** algorithm (also called binary exponentiation) is
very old; a version appears in the Indian mathematician Pingala's work on
poetic meters, around 200 BC, and al-Kāshī described it in the fifteenth
century.

### Three ways to do it

**Left to right**, as above: scan the bits from the most significant.

**Right to left**: scan from the least significant bit, squaring the base each
time: $g, g^2, g^4, g^8, \dots$, and multiply into the result the powers whose
bit is 1. Same count, slightly different memory use.

**The Montgomery ladder** (Peter Montgomery, 1987): keep two values $R_0 =
g^k$ and $R_1 = g^{k+1}$, where $k$ is the part of the exponent read so far. On
each bit, do one multiplication and one squaring, *whichever the bit is*:

$$\text{bit } 0: (R_0, R_1) \leftarrow (R_0^2,\ R_0R_1), \qquad \text{bit } 1: (R_0, R_1) \leftarrow (R_0R_1,\ R_1^2).$$

The gap $R_1 / R_0 = g$ is kept at every step, and $R_0$ ends at $g^e$.

```python
def pow_ltr(g, e, n):
    r = 1
    for bit in bin(e)[2:]:            # most significant bit first
        r = r * r % n                 # square: append a 0 to the exponent
        if bit == "1":
            r = r * g % n             # multiply: turn it into a 1
    return r

def pow_rtl(g, e, n):
    r = 1
    while e:
        if e & 1:
            r = r * g % n
        g = g * g % n                 # g, g^2, g^4, g^8, ...
        e >>= 1
    return r

def pow_ladder(g, e, n, bits):
    r0, r1 = 1, g
    for i in reversed(range(bits)):   # the same two operations for every bit
        if (e >> i) & 1:
            r0, r1 = r0 * r1 % n, r1 * r1 % n
        else:
            r0, r1 = r0 * r0 % n, r0 * r1 % n
    return r0

print(pow_ltr(3, 45, 101), pow_rtl(3, 45, 101), pow_ladder(3, 45, 101, 8), pow(3, 45, 101))
```

```text
32 32 32 32
```

### Break it: the exponent in the power trace

The first two methods do a multiplication only when a bit is 1. On a smart card
or a microcontroller, a squaring and a multiplication take slightly different
time and draw slightly different power, and an oscilloscope on the power line
shows the sequence: "square, square-multiply, square-multiply, ...". Paul
Kocher described timing attacks on modular exponentiation in 1996, and with
Joshua Jaffe and Benjamin Jun the power analysis attacks of 1999 that read
exponents this way, sometimes from a single trace. The ladder does the same
work for every bit, which removes the most obvious leak (though the
`if` that selects which pair to update must itself be written without a branch,
using masks or a conditional swap). This is why the ladder is used for X25519
(Chapter 12) and in many smart cards. *The cryptography book*,
[Chapter 18](../../book/18-Side-Channels.md), tells the full story of side channels.

<figure class="mars-fig">
<svg viewBox="0 0 640 210" width="640" role="img" aria-label="Two power traces: square and multiply shows a different pattern for each bit, the ladder shows the same pattern every bit" fill="currentColor" font-size="13">
<text x="20" y="30">square-and-multiply, exponent 101101:</text>
<g stroke="currentColor" stroke-width="1.4" fill="none">
<path d="M20 70 h20 v-22 h20 v22 h10 v-30 h20 v30 h10 v-22 h20 v22 h10 v-22 h20 v22 h10 v-30 h20 v30 h10 v-22 h20 v22 h10 v-30 h20 v30 h10 v-22 h20 v22 h10 v-22 h20 v22 h10 v-30 h20 v30 h10"/>
</g>
<g font-size="12" text-anchor="middle" class="acc-fill">
<text x="65" y="88">1</text><text x="125" y="88">0</text><text x="160" y="88">1</text><text x="220" y="88">1</text><text x="280" y="88">0</text><text x="320" y="88">1</text>
</g>
<text x="20" y="130">Montgomery ladder, same exponent:</text>
<g stroke="currentColor" stroke-width="1.4" fill="none">
<path d="M20 175 h20 v-26 h20 v26 h10 v-26 h20 v26 h10 v-26 h20 v26 h10 v-26 h20 v26 h10 v-26 h20 v26 h10 v-26 h20 v26 h10 v-26 h20 v26 h10 v-26 h20 v26 h10 v-26 h20 v26 h10 v-26 h20 v26 h10 v-26 h20 v26 h10 v-26 h20 v26 h10"/>
</g>
<text x="440" y="64">tall pulse = multiply,</text>
<text x="440" y="80">short = square: the bits show</text>
<text x="440" y="166">every bit: one multiply,</text>
<text x="440" y="182">one square: nothing shows</text>
</svg>
<figcaption>Figure 4.1. Why the ladder exists. In square-and-multiply, a 1 bit costs an extra operation that a power probe can see. The ladder spends the same on every bit. (Schematic, not a real measurement.)</figcaption>
</figure>

## 4.3 Fermat's little theorem

*Level: beginner.*

### By hand

Raise each number from 1 to 12 to the twelfth power modulo 13:

```python
print([pow(a, 12, 13) for a in range(1, 13)])
```

```text
[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
```

Every one gives 1. Try another prime: $2^{100} \bmod 101 = 1$, $3^{100} \bmod 101
= 1$. That is not a coincidence.

**Theorem (Fermat's little theorem).** If $p$ is prime and $p \nmid a$, then

$$a^{p-1} \equiv 1 \pmod p.$$

Equivalently, $a^p \equiv a \pmod p$ for every integer $a$ (this form includes
$a \equiv 0$).

Fermat stated it in a letter to Bernard Frénicle de Bessy dated 18 October 1640,
adding that he would send the proof "if I did not fear going on too long". He
never did. Leibniz had a proof in unpublished notes before 1683, and Euler
published one in 1736.

### First proof: shuffle the units

*Proof.* Consider the $p - 1$ numbers $a, 2a, 3a, \dots, (p-1)a$ modulo $p$.
Since $a$ is a unit, multiplication by $a$ is a permutation of $\{1, \dots, p -
1\}$ (Chapter 3, §3.4), so these are the numbers $1, 2, \dots, p - 1$ in some
order. Multiply them all together:

$$a \cdot 2a \cdot 3a \cdots (p-1)a \equiv 1 \cdot 2 \cdot 3 \cdots (p - 1) \pmod p,$$

that is, $a^{p-1} (p-1)! \equiv (p-1)! \pmod p$. Each factor of $(p - 1)!$ is a
unit, so we may cancel it: $a^{p-1} \equiv 1$. $\blacksquare$

*Check with $p = 7$, $a = 3$:* the multiples $3, 6, 9, 12, 15, 18$ reduce to $3,
6, 2, 5, 1, 4$, a reshuffle of $1, \dots, 6$. Their product is $3^6 \cdot 6!$
and also $6!$, so $3^6 \equiv 1$; indeed $3^6 = 729 = 104 \cdot 7 + 1$.

### Second proof: necklaces

There is a lovely counting proof. Make necklaces of $p$ beads, each bead one of
$a$ colors. There are $a^p$ strings of beads; remove the $a$ strings of a single
color. The remaining $a^p - a$ strings fall into groups of rotations of each
other, and because $p$ is prime, each group has exactly $p$ members (a string
that returned to itself after rotating $k < p$ places would have to be one
color). So $p \mid a^p - a$. $\blacksquare$ (Solomon Golomb published this in
1956.)

### What it gives

**Reducing exponents.** Modulo a prime $p$, exponents can be reduced modulo $p -
1$: if $e \equiv e' \pmod{p - 1}$ then $a^e \equiv a^{e'}$ (for $p \nmid a$),
because the difference is a power of $a^{p-1} = 1$. This is why RSA-CRT, in
Chapter 3, could use $d_p = d \bmod (p - 1)$.

**Inverses without Euclid.** $a \cdot a^{p-2} = a^{p-1} \equiv 1$, so $a^{-1}
\equiv a^{p-2} \pmod p$. This is slower than the extended Euclidean algorithm,
but it is a fixed sequence of multiplications with no data-dependent branches,
so it is easy to make constant-time. Curve25519 implementations invert this
way, raising to $p - 2 = 2^{255} - 21$.

**A test for compositeness.** If $a^{n-1} \not\equiv 1 \pmod n$, then $n$ is not
prime. Exercise: $2^{340} \bmod 341 = 1$, yet $341 = 11 \cdot 31$; $3^{340}
\bmod 341 = 56$, which proves 341 composite without factoring it. The test is
the start of Chapter 6.

## 4.4 Euler's theorem and why RSA works

*Level: beginner.*

Fermat's theorem is for prime moduli. RSA works modulo $N = pq$. Euler
generalized the theorem to any modulus in 1763, and in doing so invented the
function $\varphi$.

**Theorem (Euler).** If $\gcd(a, n) = 1$, then

$$a^{\varphi(n)} \equiv 1 \pmod n.$$

*Proof.* The same shuffle. Let $u_1, \dots, u_{\varphi(n)}$ be the units mod
$n$. Multiplying each by the unit $a$ permutes them, so

$$\prod (a u_i) \equiv \prod u_i, \qquad a^{\varphi(n)} \prod u_i \equiv \prod u_i \pmod n,$$

and the product of units is a unit, so it cancels. $\blacksquare$

For a prime, $\varphi(p) = p - 1$ and this is Fermat's theorem.

### RSA, proved

RSA chooses primes $p, q$, sets $N = pq$, picks $e$ coprime to $\varphi(N) = (p
- 1)(q - 1)$, and computes $d = e^{-1} \bmod \varphi(N)$, so that

$$ed = 1 + k\varphi(N) \quad\text{for some integer } k \geq 0.$$

Encryption is $c = m^e \bmod N$ and decryption $c^d \bmod N$.

**Theorem.** For every $m$ with $0 \leq m < N$, $(m^e)^d \equiv m \pmod N$.

*Proof.* If $\gcd(m, N) = 1$, Euler gives

$$m^{ed} = m^{1 + k\varphi(N)} = m \cdot \left(m^{\varphi(N)}\right)^k \equiv m \cdot 1^k = m \pmod N.$$

If $\gcd(m, N) \neq 1$ (that is, $p$ or $q$ divides $m$; this almost never
happens with random messages, but the theorem should cover it), argue modulo
each prime separately. Modulo $p$: if $p \mid m$, both sides are 0. If not,
Fermat gives $m^{ed} = m \cdot (m^{p-1})^{k(q-1)} \equiv m$. So $m^{ed} \equiv m
\pmod p$ in all cases, and likewise mod $q$. Since $p$ and $q$ are distinct
primes, the Chinese remainder theorem gives $m^{ed} \equiv m \pmod N$.
$\blacksquare$

*By hand,* the classic small example: $p = 61$, $q = 53$, $N = 3233$, $\varphi(N)
= 3120$, $e = 17$. Then $d = 17^{-1} \bmod 3120 = 2753$ (check: $17 \cdot 2753 =
46801 = 15 \cdot 3120 + 1$). Encrypt $m = 65$: $c = 65^{17} \bmod 3233 = 2790$.
Decrypt: $2790^{2753} \bmod 3233 = 65$.

The proof shows the role of every piece. $e$ must be a unit mod $\varphi(N)$ so
that $d$ exists. The secrecy of $d$ rests on the secrecy of $\varphi(N)$, which
rests on the factors (Chapter 3). And the theorem behind it all is Euler's.

## 4.5 The order of an element

*Level: intermediate.*

Euler's theorem says that $a^{\varphi(n)} = 1$. Often a smaller power already
gives 1. The **order** of a unit $a$ modulo $n$, written $\operatorname{ord}_n(a)$,
is the smallest positive $k$ with $a^k \equiv 1 \pmod n$.

### By hand: the powers modulo 13

| $a$ | powers $a, a^2, a^3, \dots$ until 1 | order |
|---|---|---|
| 1 | 1 | 1 |
| 2 | 2, 4, 8, 3, 6, 12, 11, 9, 5, 10, 7, 1 | 12 |
| 3 | 3, 9, 1 | 3 |
| 4 | 4, 3, 12, 9, 10, 1 | 6 |
| 5 | 5, 12, 8, 1 | 4 |
| 12 | 12, 1 | 2 |

The orders that occur, computed for every $a$, are:

```python
def order(a, n):
    k, x = 1, a % n
    while x != 1:
        x = x * a % n
        k += 1
    return k

print([order(a, 13) for a in range(1, 13)])
print([a for a in range(1, 13) if order(a, 13) == 12])
```

```text
[1, 12, 3, 6, 4, 12, 12, 4, 3, 6, 12, 2]
[2, 6, 7, 11]
```

Every order is a divisor of 12: 1, 2, 3, 4, 6 or 12. Four elements, 2, 6, 7 and
11, have the largest possible order.

### The basic facts

**Theorem.** Let $a$ have order $k$ modulo $n$. Then:

1. $a^m \equiv 1$ if and only if $k \mid m$;
2. $k \mid \varphi(n)$;
3. $a^i \equiv a^j$ if and only if $i \equiv j \pmod k$, so the powers of $a$
   cycle with period exactly $k$;
4. $a^t$ has order $k / \gcd(k, t)$.

*Proof.* (1) Write $m = qk + r$ with $0 \leq r < k$. Then $a^m = (a^k)^q a^r
\equiv a^r$. If $a^m \equiv 1$ then $a^r \equiv 1$ with $r < k$, so $r = 0$ by
the minimality of $k$. The converse is clear. (2) Euler says $a^{\varphi(n)}
\equiv 1$; apply (1). (3) $a^i \equiv a^j$ means $a^{i-j} \equiv 1$; apply (1).
(4) $(a^t)^m \equiv 1$ iff $k \mid tm$ iff $\frac{k}{\gcd(k,t)} \mid m$, so the
smallest such $m$ is $k / \gcd(k, t)$. $\blacksquare$

Fact 2 is a special case of **Lagrange's theorem** about groups, proved in
Chapter 7: the order of an element divides the size of the group. Fact 3 is
why Diffie-Hellman exponents live modulo the order of $g$: $g^x$ only depends
on $x \bmod k$.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="The powers of 2 modulo 13 go around a 12-step cycle; the powers of 3 go around a 3-step cycle" fill="currentColor" font-size="13">
<circle cx="180" cy="125" r="95" fill="none" stroke="currentColor" stroke-width="1.2"/>
<g>
<circle cx="180" cy="30" r="13" class="acc-fill"/><text x="180" y="35" text-anchor="middle" fill="var(--md-default-bg-color, #fff)">1</text>
<circle cx="227.5" cy="42.7" r="12" fill="none" stroke="currentColor"/><text x="227.5" y="47.7" text-anchor="middle">2</text>
<circle cx="262.3" cy="77.5" r="12" fill="none" stroke="currentColor"/><text x="262.3" y="82.5" text-anchor="middle">4</text>
<circle cx="275" cy="125" r="12" fill="none" stroke="currentColor"/><text x="275" y="130" text-anchor="middle">8</text>
<circle cx="262.3" cy="172.5" r="12" fill="none" stroke="currentColor"/><text x="262.3" y="177.5" text-anchor="middle">3</text>
<circle cx="227.5" cy="207.3" r="12" fill="none" stroke="currentColor"/><text x="227.5" y="212.3" text-anchor="middle">6</text>
<circle cx="180" cy="220" r="12" fill="none" stroke="currentColor"/><text x="180" y="225" text-anchor="middle">12</text>
<circle cx="132.5" cy="207.3" r="12" fill="none" stroke="currentColor"/><text x="132.5" y="212.3" text-anchor="middle">11</text>
<circle cx="97.7" cy="172.5" r="12" fill="none" stroke="currentColor"/><text x="97.7" y="177.5" text-anchor="middle">9</text>
<circle cx="85" cy="125" r="12" fill="none" stroke="currentColor"/><text x="85" y="130" text-anchor="middle">5</text>
<circle cx="97.7" cy="77.5" r="12" fill="none" stroke="currentColor"/><text x="97.7" y="82.5" text-anchor="middle">10</text>
<circle cx="132.5" cy="42.7" r="12" fill="none" stroke="currentColor"/><text x="132.5" y="47.7" text-anchor="middle">7</text>
</g>
<text x="180" y="248" text-anchor="middle">powers of 2 mod 13: all twelve units</text>
<polygon points="490,40 560,170 420,170" fill="none" class="acc" stroke-width="1.6"/>
<circle cx="490" cy="40" r="13" class="acc-fill"/><text x="490" y="45" text-anchor="middle" fill="var(--md-default-bg-color, #fff)">1</text>
<circle cx="560" cy="170" r="12" fill="none" stroke="currentColor"/><text x="560" y="175" text-anchor="middle">3</text>
<circle cx="420" cy="170" r="12" fill="none" stroke="currentColor"/><text x="420" y="175" text-anchor="middle">9</text>
<text x="490" y="215" text-anchor="middle">powers of 3 mod 13: a cycle of 3</text>
</svg>
<figcaption>Figure 4.2. Orders modulo 13. The powers of 2 visit every unit before returning to 1, so 2 is a primitive root. The powers of 3 return after three steps. Every cycle length divides 12.</figcaption>
</figure>

## 4.6 Carmichael's function

*Level: intermediate.*

Modulo a composite $n$, no element may reach order $\varphi(n)$. The largest
order that does occur is **Carmichael's function** $\lambda(n)$, introduced by
Robert Carmichael in 1910: the smallest $m > 0$ with $a^m \equiv 1 \pmod n$ for
*every* unit $a$.

By the Chinese remainder theorem, $a^m \equiv 1 \pmod{pq}$ exactly when it holds
mod $p$ and mod $q$, that is, when $m$ is a multiple of both orders. So for
distinct odd primes,

$$\lambda(pq) = \operatorname{lcm}(p - 1, q - 1) = \frac{(p-1)(q-1)}{\gcd(p - 1, q - 1)}.$$

Since $p - 1$ and $q - 1$ are both even, the gcd is at least 2, and $\lambda(N)$
is at most $\varphi(N)/2$. For the example above, $\lambda(3233) = \operatorname{lcm}(60,
52) = 780$, a quarter of $\varphi(3233) = 3120$.

RSA works just as well with $d = e^{-1} \bmod \lambda(N)$, since every unit
satisfies $m^{\lambda(N)} \equiv 1$; the proof of §4.4 goes through unchanged.
FIPS 186-5 in fact specifies this choice, which gives the smallest valid $d$.
For the example, $17^{-1} \bmod 780 = 413$, and $65^{17 \cdot 413} \equiv 65$.
Both 413 and 2753 work as private exponents; they differ by a multiple of 780.

For prime powers and 2, $\lambda$ is: $\lambda(p^k) = \varphi(p^k)$ for odd
primes; $\lambda(2) = 1$, $\lambda(4) = 2$, and $\lambda(2^k) = 2^{k-2}$ for $k
\geq 3$. Then $\lambda(n)$ is the lcm over the prime powers of $n$. Chapter 6
uses $\lambda$ to describe the composite numbers that fool Fermat's test.

## 4.7 Primitive roots

*Level: intermediate.*

A **primitive root** modulo $n$ is a unit whose order is $\varphi(n)$: its
powers run through every unit. Modulo 13 the primitive roots are 2, 6, 7 and
11. If $g$ is a primitive root mod $p$, then

$$\{g^1, g^2, \dots, g^{p-1}\} = \{1, 2, \dots, p - 1\},$$

and every unit is a power of $g$. Diffie-Hellman needs this, or something like
it: the secret $g^{ab}$ should be able to be any of a huge number of values.

### Primitive roots modulo primes exist

**Theorem (Gauss, 1801).** For every prime $p$ there is a primitive root mod
$p$, and there are exactly $\varphi(p - 1)$ of them.

The proof needs one fact about polynomials over a field:

**Lemma (Lagrange).** A non-zero polynomial of degree $d$ with coefficients in
$\mathbb{F}_p$ has at most $d$ roots in $\mathbb{F}_p$.

*Proof of the lemma.* By induction on $d$. If $r$ is a root of $f$, divide: $f(x)
= (x - r)g(x) + c$, and putting $x = r$ gives $c = 0$. Any other root $s \neq r$
satisfies $(s - r)g(s) = 0$, and since $\mathbb{F}_p$ has no zero divisors, $g(s)
= 0$. So the other roots are roots of $g$, which has degree $d - 1$ and at most
$d - 1$ roots. $\blacksquare$

(The lemma fails modulo composites: $x^2 - 1$ has four roots modulo 15, as
Chapter 3 found. Zero divisors are exactly what breaks it.)

*Proof of the theorem.* For each divisor $d$ of $p - 1$, let $\psi(d)$ be the
number of units of order exactly $d$. Every unit has some order dividing $p - 1$,
so

$$\sum_{d \mid p-1} \psi(d) = p - 1.$$

Now fix $d$ and suppose some $a$ has order $d$. Its powers $1, a, \dots,
a^{d-1}$ are $d$ distinct roots of $x^d - 1$, and by Lagrange's lemma that
polynomial has no others, so *every* element of order $d$ is among these
powers. By §4.5, $a^t$ has order $d$ exactly when $\gcd(t, d) = 1$, so there
are $\varphi(d)$ of them. Hence $\psi(d)$ is either 0 or $\varphi(d)$, and in all
cases $\psi(d) \leq \varphi(d)$. But Chapter 3 (§3.5) showed

$$\sum_{d \mid p-1} \varphi(d) = p - 1 = \sum_{d \mid p-1} \psi(d).$$

Two sums of terms with $\psi(d) \leq \varphi(d)$ are equal only if every term
is equal. So $\psi(d) = \varphi(d)$ for every $d$, and in particular $\psi(p - 1)
= \varphi(p - 1) \geq 1$. $\blacksquare$

The proof gives more than it promised: for every divisor $d$ of $p - 1$ there
are exactly $\varphi(d)$ elements of order $d$. Modulo 13: $\varphi(12) = 4$
primitive roots, $\varphi(6) = 2$ elements of order 6 (4 and 10), $\varphi(4) =
2$ of order 4 (5 and 8), $\varphi(3) = 2$ of order 3 (3 and 9), one of order 2
(12), one of order 1. Compare with the table in §4.5.

Euler believed this theorem and Legendre published an incomplete proof; the
first complete proof is in Gauss's *Disquisitiones Arithmeticae* of 1801.
Chapter 3, §3.11, gave the full list of moduli that have primitive roots: 1, 2,
4, $p^k$ and $2p^k$.

### Finding one

The theorem says a primitive root exists, not which number it is, and no
formula is known. But a test is easy if we know the prime factors of $p - 1$:

**Test.** $g$ is a primitive root mod $p$ if and only if $g^{(p-1)/q} \not\equiv
1 \pmod p$ for every prime $q$ dividing $p - 1$.

*Why.* If the order $k$ of $g$ is less than $p - 1$, it is a proper divisor, so
$k$ divides $(p - 1)/q$ for some prime $q$, and then $g^{(p-1)/q} \equiv 1$.
Conversely, if the order is $p - 1$, no smaller power is 1.

Since a fraction $\varphi(p-1)/(p-1)$ of all units are primitive roots (at
least about $1/(e^\gamma \ln \ln p)$, and in practice around a third), trying
$g = 2, 3, 5, \dots$ succeeds quickly.

```python
def prime_factors(n):
    f, d = [], 2
    while d * d <= n:
        while n % d == 0:
            f.append(d)
            n //= d
        d += 1
    if n > 1:
        f.append(n)
    return sorted(set(f))

def primitive_root(p):
    qs = prime_factors(p - 1)
    for g in range(2, p):
        if all(pow(g, (p - 1) // q, p) != 1 for q in qs):
            return g

print(prime_factors(1000002), primitive_root(1000003))
print(primitive_root(23), primitive_root(101), primitive_root(10007))
```

```text
[2, 3, 166667] 2
5 2 5
```

The catch is that the test needs the factors of $p - 1$, and for a random
3,072-bit prime, factoring $p - 1$ is a hard factoring problem. That is one of
the reasons cryptographers build $p$ so that $p - 1$ has a known shape
(§4.9).

!!! note "Life story: the primitive root"
    **Born:** the name is Euler's (1773, *radix primitiva*); the existence
    theorem was proved completely by Gauss in *Disquisitiones Arithmeticae*
    (1801) · **Purpose:** to describe the units modulo a prime as the powers of
    one element, making multiplication into addition of exponents ·
    **Helped:** tables of "indices" (discrete logarithms) used for hand
    calculation in the nineteenth century, Diffie-Hellman (1976), ElGamal
    (1985), and DSA (1991) · **Status:** current; modern protocols usually use
    a generator of a large prime-order subgroup instead of a full primitive
    root (§4.9)

## 4.8 Discrete logarithms

*Level: intermediate.*

If $g$ is a primitive root mod $p$, every unit $h$ is $g^x$ for exactly one $x$
in $\{0, \dots, p - 2\}$. That $x$ is the **discrete logarithm** of $h$ to the
base $g$, written $\log_g h$. It obeys the familiar rules, but modulo $p - 1$:

$$\log_g(h_1h_2) \equiv \log_g h_1 + \log_g h_2, \qquad \log_g(h^k) \equiv k \log_g h \pmod{p - 1}.$$

So the discrete logarithm turns multiplication mod $p$ into addition mod $p - 1$.
In the nineteenth century this was a practical tool: Carl Jacobi published a
*Canon Arithmeticus* in 1839 with tables of discrete logarithms ("indices") for
every prime below 1,000, and people used them to multiply and take roots modulo
primes by hand. For cryptography, the point is the opposite: for a large prime
nobody can build the table, and no fast method of computing $\log_g h$ is
known. The forward direction $x \mapsto g^x$ takes milliseconds (§4.2).

How hard is "hard"? The best general methods for $(\mathbb{Z}/p\mathbb{Z})^*$
are index calculus and the number field sieve for discrete logarithms, which run
in the same subexponential time as factoring. That is why finite-field
Diffie-Hellman needs moduli as long as RSA's (3,072 bits for 128-bit security).
In a group with no such special structure, such as a well-chosen elliptic curve,
the best methods take about $\sqrt{q}$ steps for a group of prime order $q$
(Chapter 7). *Cryptanalysis*, Chapter 12, runs all these algorithms. Here we
look at the one piece of structure that makes the problem *easy*, because
avoiding it is the main rule for choosing groups.

### Pohlig-Hellman: split the logarithm

Suppose the group order $n = p - 1$ factors as $n = \prod q_i^{e_i}$. Then the
discrete logarithm can be computed separately modulo each $q_i^{e_i}$ and glued
together with the Chinese remainder theorem.

**Why.** Let $h = g^x$. Raise both sides to the power $n / q^e$:

$$h^{n/q^e} = \left(g^{n/q^e}\right)^x.$$

The element $g_q = g^{n/q^e}$ has order exactly $q^e$, so the right side depends
only on $x \bmod q^e$ (§4.5, fact 3). Solving this small logarithm, in a group of
size $q^e$, gives $x \bmod q^e$. Do it for every prime power and combine with the
CRT. Stephen Pohlig and Martin Hellman published the method in 1978.

*By hand*, at a size where each piece is small. Take $p = 8101$, so $p - 1 = 8100
= 2^2 \cdot 3^4 \cdot 5^2$, with primitive root $g = 6$. Let $h = 6^x \bmod 8101
= 437$; we want $x$.

<div class="mars-steps" markdown>
1. Mod 4: compute $6^{2025}$ and $437^{2025}$ (since $8100/4 = 2025$), and find
   which power $k$ of the first gives the second, for $k = 0, 1, 2, 3$. It is
   $k = 1$, so $x \equiv 1 \pmod 4$.
2. Mod 81: with exponent $8100/81 = 100$, search $k = 0, \dots, 80$. The answer
   is $x \equiv 27 \pmod{81}$.
3. Mod 25: with exponent $8100/25 = 324$, search $k = 0, \dots, 24$: $x \equiv
   20 \pmod{25}$.
4. CRT: $x \equiv 1 \pmod 4$, $27 \pmod{81}$, $20 \pmod{25}$ gives $x = 6345$.
</div>

At most $4 + 81 + 25 = 110$ trials instead of up to 8,100. (Each prime power can
be split further, one base-$q$ digit at a time, so the real cost is about $\sum
e_i q_i$ trials, or $\sum e_i \sqrt{q_i}$ with the methods of Chapter 7.)

```python
def dlog_small(g, h, p, n):              # try every exponent below n: fine when n is small
    x = 1
    for k in range(n):
        if x == h:
            return k
        x = x * g % p

def pohlig_hellman(g, h, p, factors):    # factors of p - 1, as {q: e}
    residues, moduli = [], []
    for q, e in factors.items():
        qe = q ** e
        gq = pow(g, (p - 1) // qe, p)    # an element of order q^e
        hq = pow(h, (p - 1) // qe, p)
        residues.append(dlog_small(gq, hq, p, qe))
        moduli.append(qe)
    x, M = 0, 1
    for r, m in zip(residues, moduli):   # glue with the CRT (Chapter 3)
        x += M * ((r - x) * pow(M, -1, m) % m)
        M *= m
    return x, residues, moduli

p, g = 8101, 6
h = pow(g, 6345, p)
print(h, pohlig_hellman(g, h, p, {2: 2, 3: 4, 5: 2}))
```

```text
437 (6345, [1, 27, 20], [4, 81, 25])
```

<figure class="mars-fig">
<svg viewBox="0 0 640 230" width="640" role="img" aria-label="Pohlig-Hellman: a discrete logarithm modulo 8101 is split into three small logarithms modulo 4, 81 and 25 and joined with the Chinese remainder theorem" fill="currentColor" font-size="13">
<g stroke="currentColor" stroke-width="1.4" fill="none">
<rect x="20" y="90" width="150" height="50" rx="6"/>
<rect x="250" y="20" width="160" height="44" rx="6"/>
<rect x="250" y="93" width="160" height="44" rx="6"/>
<rect x="250" y="166" width="160" height="44" rx="6"/>
<rect x="490" y="90" width="130" height="50" rx="6" class="acc"/>
<path d="M170 105 L250 42"/><path d="M170 115 L250 115"/><path d="M170 125 L250 188"/>
<path d="M410 42 L490 105"/><path d="M410 115 L490 115"/><path d="M410 188 L490 125"/>
</g>
<text x="95" y="112" text-anchor="middle">6^x ≡ 437</text>
<text x="95" y="130" text-anchor="middle" font-size="12">group of order 8100</text>
<text x="330" y="40" text-anchor="middle">x mod 4 = 1</text><text x="330" y="56" text-anchor="middle" font-size="11">at most 4 tries</text>
<text x="330" y="113" text-anchor="middle">x mod 81 = 27</text><text x="330" y="129" text-anchor="middle" font-size="11">at most 81 tries</text>
<text x="330" y="186" text-anchor="middle">x mod 25 = 20</text><text x="330" y="202" text-anchor="middle" font-size="11">at most 25 tries</text>
<text x="555" y="112" text-anchor="middle" class="acc-fill">CRT:</text>
<text x="555" y="130" text-anchor="middle" class="acc-fill">x = 6345</text>
</svg>
<figcaption>Figure 4.3. Pohlig-Hellman on the example of §4.8. Raising both sides to the powers 8100/4, 8100/81 and 8100/25 lands in three small groups, where the logarithm is found by trying; the Chinese remainder theorem joins the three answers. The cost depends on the largest prime factor of the group order, not on the group's size.</figcaption>
</figure>

**The lesson.** The discrete logarithm is only as hard as the largest prime
factor of the group order. A 3,072-bit prime $p$ for which $p - 1$ happens to be
a product of small primes gives no security at all, however large $p$ is. The
order of the group, or of the subgroup actually used, must have a large prime
factor, at least 256 bits for 128-bit security.

## 4.9 Safe primes and the groups in use

*Level: intermediate.*

### Safe primes

The cleanest way to control the factors of $p - 1$ is to choose $p = 2q + 1$
with $q$ also prime. Such a $p$ is a **safe prime**, and $q$ is a **Sophie
Germain prime**, after Sophie Germain, who studied them around 1823 in her work
on Fermat's Last Theorem. Examples: $q = 11$, $p = 23$; $q = 83$, $p = 167$.

For a safe prime, the units mod $p$ have order $2q$, so every element has order
1, 2, $q$ or $2q$. The element of order 2 is $-1$. The elements of order $q$ are
exactly the **squares** (quadratic residues, Chapter 5), and there are $q - 1$ of
them; together with 1 they form a subgroup of prime order $q$. Pohlig-Hellman can
split off only a factor of 2, which leaks one bit of the exponent (whether it is
even), and nothing more.

Generating safe primes is slow, because both $q$ and $2q + 1$ must be prime: by
the prime number theorem the chance is about $1/(\ln q)^2$, so for 3,072 bits
you test millions of candidates. That is why standard groups are published once
and reused.

### Schnorr groups

An alternative, introduced by Claus Schnorr in 1989 for his signatures and
adopted by DSA, uses a prime $p$ with $p - 1 = kq$ for a much smaller prime $q$
(say 256 bits, with $p$ of 3,072 bits). One works in the subgroup of order $q$,
generated by $g = h^{(p-1)/q}$ for any $h$ with $g \neq 1$. Exponents are then
only 256 bits long, so exponentiation is much faster, while the number field
sieve still faces the full 3,072-bit $p$, and generic attacks face the 256-bit $q$.

The danger in Schnorr groups is the other factors of $p - 1$: an attacker who
sends an element of small order can learn the secret exponent modulo that order,
a **small-subgroup attack** (Chim Hung Lim and Pil Joong Lee, 1997). The defense
is to check that every received element $y$ satisfies $y^q \equiv 1$, or to use
safe primes, where the only small subgroup has order 2. Chapter 7 returns to this.

### The standard groups

| Groups | Year | Construction |
|---|---|---|
| RFC 2409 (Oakley groups 1, 2) | 1998 | safe primes of 768 and 1,024 bits from the digits of $\pi$ |
| RFC 3526 (MODP groups 14 to 18) | 2003 | safe primes of 2,048 to 8,192 bits from the digits of $\pi$, generator 2 |
| RFC 5114 | 2008 | Schnorr groups with 160- to 256-bit subgroups (later deprecated) |
| RFC 7919 (ffdhe2048 to ffdhe8192) | 2016 | safe primes from the digits of $e$, generator 2, for TLS |

The primes are built from the digits of $\pi$ or $e$ so that anyone can check
they were not chosen with a hidden weakness: these are "nothing up my sleeve"
numbers. RFC 3526's 2,048-bit prime is

$$p = 2^{2048} - 2^{1984} - 1 + 2^{64} \cdot \left( \lfloor 2^{1918} \pi \rfloor + 124476 \right),$$

with the top and bottom 64 bits all ones, which helps reduction, and the
middle bits taken from $\pi$, adjusted by the smallest offset that makes $p$ a
safe prime.

### Break it: Logjam

Reusing a few standard groups has a cost that was not appreciated until 2015.
The number field sieve for discrete logarithms has a huge precomputation that
depends only on $p$, after which individual logarithms in that group are cheap.
In May 2015, David Adrian, Karthikeyan Bhargavan, Zakir Durumeric, Pierrick
Gaudry, Matthew Green, J. Alex Halderman, Nadia Heninger and six colleagues
published **Logjam**. They showed that TLS servers still accepting the 1990s
"export" Diffie-Hellman groups of 512 bits could be attacked live: after a
week-long precomputation for the most common 512-bit prime, each connection's
logarithm took about a minute. They also estimated that a precomputation for
a single common 1,024-bit prime, within reach of a national agency, would allow
passive decryption of connections to 18 percent of the top million HTTPS
websites. The responses were to drop export groups, move to 2,048-bit groups
(RFC 7919) or to elliptic curves, and, in TLS 1.3, to allow only the named
groups with no server-chosen primes.

!!! note "Life story: Logjam"
    **Born:** May 2015, "Imperfect Forward Secrecy: How Diffie-Hellman Fails in
    Practice" by Adrian, Bhargavan, Durumeric, Gaudry, Green, Halderman,
    Heninger and others, ACM CCS 2015 best paper · **Purpose:** to show that
    shared Diffie-Hellman primes plus the number field sieve's precomputation
    make 512-bit groups breakable live and 1,024-bit groups a target for
    nation-state attackers · **Helped:** removed export cryptography from
    browsers; pushed TLS to 2,048-bit named groups and elliptic curves; shaped
    TLS 1.3's fixed list of groups · **Status:** a closed chapter for TLS; old
    VPN and SSH configurations with 1,024-bit groups still turn up in scans

## 4.10 In the real world

*Level: intermediate.*

**RSA exponents.** Nearly every RSA public key uses $e = 65537 = 2^{16} + 1$,
the fourth Fermat number, which is prime. In binary it is a 1, fifteen 0s and a
1, so encryption and signature checking take 16 squarings and one multiplication.
Smaller choices such as $e = 3$ are faster and were once common, but they make
some padding mistakes catastrophic (Bleichenbacher's 2006 signature forgery
needed $e = 3$; *The cryptography book*, Chapter 13). The private exponent is
around the size of $N$; making it small for speed is dangerous (Wiener's attack,
Chapter 2).

**Windows.** Libraries speed up exponentiation further with **sliding
windows**: precompute $g^1, g^3, g^5, \dots, g^{2^w - 1}$ and process the
exponent $w$ bits at a time, cutting the multiplications to about $n/(w + 1)$.
The table lookups must themselves be constant-time; in 2016 the CacheBleed attack
by Yuval Yarom, Daniel Genkin and Nadia Heninger recovered RSA keys from
OpenSSL's window lookups through cache-bank conflicts.

**Inversion by Fermat.** As §4.3 noted, elliptic-curve libraries often invert
modulo $p$ by computing $a^{p-2}$ with a fixed addition chain, about 265
multiplications for Curve25519, because a fixed sequence of operations is
constant-time without effort.

## 4.11 Going deeper

*Level: expert.*

**Addition chains.** The fewest multiplications needed to compute $g^e$ is the
length of the shortest **addition chain** for $e$: a sequence $1 = a_0, a_1,
\dots, a_r = e$ where each term is a sum of two earlier ones. Square-and-multiply
gives a chain of length at most $2\log_2 e$; the optimum is $\log_2 e + (1 +
o(1)) \log_2 e / \log_2 \log_2 e$ (Brauer 1939, Erdős 1960). Finding the shortest
chain is believed hard in general, but for fixed exponents such as $p - 2$
people search for good chains once and hard-code them.

**Artin's conjecture.** Is 2 a primitive root for infinitely many primes? Emil
Artin conjectured in 1927 that every integer other than $-1$ and squares is a
primitive root for infinitely many primes, and that for 2 the proportion of such
primes is Artin's constant, about 0.3740. Christopher Hooley proved it in 1967
assuming the generalized Riemann hypothesis; unconditionally, Roger Heath-Brown
showed in 1986 that at most two primes (whatever they are) fail the
conjecture. Nobody knows a single specific number proven to be a primitive root
for infinitely many primes.

**The least primitive root.** The smallest primitive root mod $p$ is usually
tiny (2, 3, 5, 6, ...), and assuming the generalized Riemann hypothesis Victor
Shoup proved in 1992 that it is $O((\log p)^6)$. Unconditionally the bounds are
much weaker.

**Structure as an attack surface.** Pohlig-Hellman generalizes to any group: the
discrete logarithm problem in a group of order $n$ is only as hard as in its
largest prime-order subgroup. This one fact explains why elliptic curves are
chosen with prime order or a tiny cofactor (Chapter 13), why invalid-curve
attacks work, and why every protocol must validate received group elements. The
general study of these groups is the subject of Chapter 7.

## Check yourself

??? question "1. Compute $5^{13} \bmod 23$ by square-and-multiply, showing each step."

    $13 = 1101_2$. Bits: 1: $5$; 1: $5^2 \cdot 5 = 125 \equiv 10$; 0: $10^2 = 100
    \equiv 8$; 1: $8^2 \cdot 5 = 320 \equiv 21$. So $5^{13} \equiv 21$. (Chapter 1's
    table gives $5^{13} \equiv 21$ too.)

??? question "2. Use Fermat's little theorem to find $2^{1000} \bmod 13$."

    $2^{12} \equiv 1$ and $1000 = 83 \cdot 12 + 4$, so $2^{1000} \equiv 2^4 = 16
    \equiv 3$.

??? question "3. Find $3^{-1} \bmod 101$ using Fermat, and check it."

    $3^{-1} \equiv 3^{99}$. Euclid is quicker: $101 = 33 \cdot 3 + 2$, $3 = 2 + 1$,
    so $1 = 3 - 2 = 3 - (101 - 33 \cdot 3) = 34 \cdot 3 - 101$, giving 34. Check:
    $3 \cdot 34 = 102 \equiv 1$. Both methods agree: `pow(3, 99, 101)` is 34.

??? question "4. What are the possible orders of units modulo 31? How many primitive roots are there?"

    Divisors of 30: 1, 2, 3, 5, 6, 10, 15, 30. There are $\varphi(30) = 8$
    primitive roots.

??? question "5. Show that 3 is a primitive root modulo 7."

    $7 - 1 = 6 = 2 \cdot 3$. Check $3^{6/2} = 27 \equiv 6 \neq 1$ and $3^{6/3} =
    9 \equiv 2 \neq 1$. So the order is 6.

??? question "6. For $N = 3233 = 61 \cdot 53$ and $e = 17$, compute $\lambda(N)$ and the smallest private exponent."

    $\lambda = \operatorname{lcm}(60, 52) = 780$, and $17^{-1} \bmod 780 = 413$
    (since $17 \cdot 413 = 7021 = 9 \cdot 780 + 1$).

??? question "7. If $g$ has order 12, what is the order of $g^8$? Of $g^5$?"

    $12/\gcd(12, 8) = 3$ and $12/\gcd(12, 5) = 12$.

??? question "8. Why is a 2,048-bit prime $p$ with $p - 1 = 2 \cdot 3 \cdot 5 \cdot 7 \cdots$ (a product of small primes) useless for Diffie-Hellman?"

    Pohlig-Hellman splits the discrete logarithm into one small logarithm for
    each prime power factor of $p - 1$ and glues them with the CRT. If all the
    factors are small, every piece is easy, so the whole logarithm is easy.

??? question "9. For a safe prime $p = 2q + 1$, what are the possible orders of elements, and how many elements have each?"

    Orders divide $2q$: order 1 (one element, 1), order 2 (one element, $-1$),
    order $q$ ($\varphi(q) = q - 1$ elements, the squares other than 1), order
    $2q$ ($\varphi(2q) = q - 1$ elements, the primitive roots).

??? question "10. In the proof that RSA decrypts correctly, where is it used that $p \neq q$?"

    In the last step: from $m^{ed} \equiv m$ modulo $p$ and modulo $q$, the CRT
    concludes it modulo $pq$, which needs $\gcd(p, q) = 1$. With $p = q$ the
    modulus would be $p^2$, $\varphi(p^2) = p(p - 1)$, and multiples of $p$ would
    fail to decrypt; besides, $N = p^2$ is trivially factored by a square root.

## What you learned

- Square-and-multiply computes $g^e \bmod n$ with about $1.5\log_2 e$
  multiplications. Its pattern of operations leaks the exponent; the Montgomery
  ladder does the same work for every bit.
- Fermat: $a^{p-1} \equiv 1 \pmod p$. Euler: $a^{\varphi(n)} \equiv 1 \pmod n$
  for units. Both are proved by multiplying all units by $a$. They prove that RSA
  decrypts correctly, for every message.
- The order of $a$ is the least $k$ with $a^k \equiv 1$; it divides
  $\varphi(n)$, and the powers of $a$ cycle with period $k$.
- Carmichael's $\lambda(pq) = \operatorname{lcm}(p-1, q-1)$ is the exponent that
  kills every unit; FIPS 186-5 computes RSA's $d$ modulo it.
- Every prime has $\varphi(p - 1)$ primitive roots; finding one needs the factors
  of $p - 1$.
- Pohlig-Hellman reduces a discrete logarithm to the prime factors of the group
  order, so the order must have a large prime factor: safe primes, Schnorr
  groups, and checks on received elements.
- Shared groups invite precomputation: Logjam broke 512-bit Diffie-Hellman in
  2015 and showed 1,024-bit groups were within reach of large agencies.

**Next:** [Chapter 5](05-Square-Roots-Mod-p.md), squares and square roots modulo
primes and composites, and why square roots modulo $N$ are as hard as factoring.

## Further reading

- Leonhard Euler, "Theoremata arithmetica nova methodo demonstrata" (1763):
  introduces $\varphi$ and proves Euler's theorem.
- Carl Friedrich Gauss, *Disquisitiones Arithmeticae* (1801), section III on
  powers and primitive roots.
- Victor Shoup, *A Computational Introduction to Number Theory and Algebra*, 2nd
  edition (Cambridge, 2009), chapters 7 and 11.
- Stephen Pohlig and Martin Hellman, "An Improved Algorithm for Computing
  Logarithms over GF(p) and Its Cryptographic Significance", *IEEE Transactions
  on Information Theory* 24 (1978).
- Peter Montgomery, "Speeding the Pollard and Elliptic Curve Methods of
  Factorization", *Mathematics of Computation* 48 (1987): the ladder.
- Claus Schnorr, "Efficient Identification and Signatures for Smart Cards"
  (CRYPTO 1989).
- Paul Kocher, "Timing Attacks on Implementations of Diffie-Hellman, RSA, DSS,
  and Other Systems" (CRYPTO 1996).
- Chim Hung Lim and Pil Joong Lee, "A Key Recovery Attack on Discrete Log-based
  Schemes Using a Prime Order Subgroup" (CRYPTO 1997).
- David Adrian and others, "Imperfect Forward Secrecy: How Diffie-Hellman Fails
  in Practice" (CCS 2015), [weakdh.org](https://weakdh.org/).
- RFC 3526, More Modular Exponential (MODP) Diffie-Hellman groups for Internet
  Key Exchange (2003); RFC 7919, Negotiated Finite Field Diffie-Hellman Ephemeral
  Parameters for TLS (2016).
- FIPS 186-5, Digital Signature Standard (2023), on RSA key generation with
  $\lambda(N)$.
- Yuval Yarom, Daniel Genkin and Nadia Heninger, "CacheBleed: A Timing Attack on
  OpenSSL Constant Time RSA" (CHES 2016).
- In *The cryptography book*: [Chapter 12](../../book/12-Diffie-Hellman.md),
  [Chapter 13](../../book/13-RSA.md), [Chapter 14](../../book/14-Discrete-Log-Systems.md).
