# 2. Divisibility, Primes and Factoring

*RSA's public key is a number that is the product of two secret primes. Its
security is a bet that nobody can find the primes again. This chapter studies
the ground under that bet: division with remainder, the greatest common divisor
and Euclid's algorithm (the oldest algorithm still in daily use), Bézout's
identity, the theorem that every number factors into primes in exactly one way,
how many primes and how many smooth numbers there are, continued fractions,
and the classical ways to factor. You will prove that Euclid's algorithm is
fast, count the primes below ten million, factor a printer's RSA key the way it
was really done in 2022, and run a quadratic sieve small enough to check by
hand.*

!!! abstract "In this chapter"
    **You will learn:**

    - the division theorem, and how Python's `//` and `%` follow it for
      negative numbers;
    - the greatest common divisor, Euclid's algorithm, why it is correct, and
      Lamé's proof that it takes at most about five steps per decimal digit;
    - Bézout's identity and the extended Euclidean algorithm;
    - the fundamental theorem of arithmetic, with a full proof, and a world
      where it fails;
    - how many primes there are: the sieve of Eratosthenes, the prime number
      theorem, and how many 1,024-bit primes exist;
    - continued fractions and their best approximations;
    - smooth numbers and Dickman's function, the count behind every fast
      factoring method;
    - trial division and Fermat's method, and why keys with close primes break;
    - why Pollard's $p - 1$ and rho methods work, and why "strong primes" are
      no longer needed;
    - the quadratic sieve in miniature.

    **You need:** [Chapter 1](01-Mathematics-for-Secrets.md) (notation and
    proofs). *The cryptography book*, [Chapter 3](../../book/03-The-Arithmetic-of-Secrets.md),
    introduces gcd and primes briefly; this chapter does them fully.

    **Levels:** §2.1 to §2.5 are for beginners, §2.6 to §2.10 are
    intermediate, §2.11 is expert.

## 2.1 The problem

*Level: beginner.*

In August 1977, Martin Gardner's "Mathematical Games" column in *Scientific
American* described a new cipher invented at MIT by Ron Rivest, Adi Shamir and
Leonard Adleman. To show how strong it was, the authors encrypted a short
message with a public key whose modulus was a 129-digit number, now called
RSA-129, and offered \$100 to anyone who could read it. Rivest estimated that
factoring the number would take 40 quadrillion years with the methods and
machines of the day.

It took seventeen. In April 1994 Derek Atkins, Michael Graff, Arjen Lenstra and
Paul Leyland announced the factors, found with the help of about 600 volunteers
whose computers had run a sieving program in their spare time for eight months.
The message read "THE MAGIC WORDS ARE SQUEAMISH OSSIFRAGE". Nothing was wrong
with RSA; what had changed was the mathematics of factoring, which had
improved far faster than anyone expected, and the number of computers.

So the size of an RSA key is a bet about two things: how fast factoring
algorithms are, and how much computing the attacker has. To understand the bet,
we need to understand what factoring even is. That needs answers to questions
that sound childish and are not:

- What does it mean for one number to divide another, and how do we compute
  remainders, including for negative numbers?
- How do we find the largest number dividing two given numbers, without
  factoring either one?
- Is there only one way to write a number as a product of primes? (If $N$ could
  be written as $pq$ and also as $rs$ with different primes, RSA would not even
  be well defined.)
- How many primes are there of a given size? Enough that an attacker cannot
  list them?
- What is the simplest way to factor, and when does it already succeed?

The first four have classical answers, from Euclid around 300 BC to the prime
number theorem of 1896. The fifth is where this book hands over to the
cryptanalysts. The modern factoring algorithms (Pollard's methods, the elliptic
curve method, the quadratic and number field sieves) are attacks, and book 2 of
this shelf, *Cryptanalysis*, runs them at full strength in its [Chapter 11](../cryptanalysis/11-Factoring.md). Here we build the
number theory they rest on, and run the classical methods only far enough to
see *why* each works: trial division, Fermat, Pollard's two methods (one a
fact about groups, the other about birthdays) and a toy quadratic sieve.

## 2.2 Division with remainder

*Level: beginner.*

### By hand

Divide 17 by 5: it goes 3 times, with 2 left over, because $17 = 3 \cdot 5 +
2$. Divide $-17$ by 5: one natural answer is "$-3$ remainder $-2$", and another
is "$-4$ remainder 3", because $-17 = -4 \cdot 5 + 3$. Mathematics and
cryptography choose the second: **the remainder is never negative.**

### The division theorem

**Theorem (division with remainder).** For any integers $a$ and $b$ with $b >
0$, there are unique integers $q$ (the **quotient**) and $r$ (the
**remainder**) with

$$a = qb + r \quad\text{and}\quad 0 \leq r < b.$$

*Proof.* *Existence.* Look at the numbers $a - qb$ for all integers $q$. As $q$
decreases they grow without limit, so some are non-negative; let $r = a - qb$
be the smallest non-negative one. If $r \geq b$, then $r - b = a - (q+1)b$
would be a smaller non-negative one, a contradiction. So $0 \leq r < b$.

*Uniqueness.* Suppose $a = qb + r = q'b + r'$ with both remainders in $[0, b)$.
Then $(q - q')b = r' - r$. The right side lies strictly between $-b$ and $b$;
the left side is a multiple of $b$. The only multiple of $b$ strictly between
$-b$ and $b$ is 0, so $r = r'$ and $q = q'$. $\blacksquare$

The proof used a fact so basic it is easy to miss: every non-empty set of
non-negative integers has a smallest element. This is the **well-ordering
principle**, and it is equivalent to induction. Most proofs about integers rest
on it somewhere.

We write $q = \lfloor a/b \rfloor$ and $r = a \bmod b$. Python follows the
theorem exactly for positive divisors:

```python
print(17 // 5, 17 % 5, -17 // 5, -17 % 5)    # quotient rounds down; remainder never negative
```

```text
3 2 -4 3
```

Not every language does. In C, Java, JavaScript and Go, `-17 % 5` is $-2$,
because their division rounds toward zero. Code that ports modular arithmetic
from Python to C without noticing this can index arrays with negative numbers
or produce wrong results. If you write $a \bmod n$ in C for a possibly negative
$a$, use `((a % n) + n) % n`.

### Divisibility

We say $b$ **divides** $a$, written $b \mid a$, if $a = kb$ for some integer
$k$; equivalently, for $b > 0$, if $a \bmod b = 0$. Then $b$ is a **divisor**
or **factor** of $a$, and $a$ is a **multiple** of $b$. Every integer divides
0; 1 and $-1$ divide everything.

Five rules follow straight from the definition, and between them they carry most
of the chapter. For all integers $a, b, c, x, y$:

1. If $a \mid b$ and $b \mid c$, then $a \mid c$. (If $b = ka$ and $c = lb$,
   then $c = (lk)a$.)
2. If $a \mid b$ and $a \mid c$, then $a \mid bx + cy$ for every $x, y$.
   (Write $b = ka$, $c = la$; then $bx + cy = (kx + ly)a$.)
3. If $a \mid b$ and $b \neq 0$, then $\lvert a \rvert \leq \lvert b \rvert$.
4. If $a \mid b$ and $b \mid a$, then $a = \pm b$.
5. $a \mid b$ if and only if $a \mid b \bmod a$ (for $a > 0$), since $b$ and $b
   \bmod a$ differ by a multiple of $a$.

Rule 2 is the important one. It says that anything dividing two numbers divides
every combination of them. We use it in the next section to prove Euclid's
algorithm correct.

## 2.3 The greatest common divisor

*Level: beginner.*

The **greatest common divisor** $\gcd(a, b)$ of two integers, not both zero, is
the largest integer dividing both. Two numbers with $\gcd(a, b) = 1$ are
**coprime** or **relatively prime**: they share no factor except 1. By
convention $\gcd(a, 0) = \lvert a \rvert$.

Cryptography needs gcds constantly. An RSA exponent $e$ must be coprime to
$(p-1)(q-1)$; an element $a$ has an inverse modulo $n$ exactly when $\gcd(a, n)
= 1$ (Chapter 3); and computing $\gcd(N_1, N_2)$ for two RSA moduli that share a
prime instantly reveals it, which in 2012 broke tens of thousands of real keys
(§2.10).

### By hand: Euclid's algorithm

Find $\gcd(1071, 462)$. The school method factors both numbers: $1071 = 3^2
\cdot 7 \cdot 17$ and $462 = 2 \cdot 3 \cdot 7 \cdot 11$, so the gcd is $3 \cdot
7 = 21$. That works for small numbers and is hopeless for 600-digit ones,
because factoring is exactly the hard problem.

Euclid's method never factors anything. It divides the larger number by the
smaller and keeps the remainder:

<div class="mars-steps" markdown>
1. $1071 = 2 \cdot 462 + 147$. Now find $\gcd(462, 147)$.
2. $462 = 3 \cdot 147 + 21$. Now find $\gcd(147, 21)$.
3. $147 = 7 \cdot 21 + 0$. The remainder is 0, so the answer is the last
   divisor, **21**.
</div>

Three divisions instead of two factorizations.

### Why it works

**Lemma.** For any integers $a$ and $b > 0$, $\gcd(a, b) = \gcd(b, a \bmod b)$.

*Proof.* Write $a = qb + r$ with $r = a \bmod b$. Any $d$ dividing both $a$ and
$b$ divides $r = a - qb$ (rule 2), so it divides both $b$ and $r$. Conversely,
any $d$ dividing both $b$ and $r$ divides $a = qb + r$. So the pairs $(a, b)$
and $(b, r)$ have exactly the same common divisors, and in particular the same
greatest one. $\blacksquare$

Each step replaces $(a, b)$ by $(b, a \bmod b)$, and since $0 \leq a \bmod b <
b$ the second number strictly decreases. A strictly decreasing sequence of
non-negative integers must reach 0, so the algorithm stops, and when it reaches
$(g, 0)$ the answer is $\gcd(g, 0) = g$.

<figure class="mars-fig">
<svg viewBox="0 0 640 270" width="640" role="img" aria-label="Euclid's algorithm as tiling a 1071 by 462 rectangle with squares: two of side 462, three of side 147, seven of side 21" fill="currentColor" font-size="13">
<g stroke="currentColor" stroke-width="1.3" fill="none">
<rect x="40" y="20" width="535.5" height="231" />
<rect x="40" y="20" width="231" height="231"/>
<rect x="271" y="20" width="231" height="231"/>
<rect x="502" y="20" width="73.5" height="73.5" class="soft"/>
<rect x="502" y="93.5" width="73.5" height="73.5"/>
<rect x="502" y="167" width="73.5" height="73.5"/>
</g>
<g stroke="currentColor" stroke-width="1" fill="none" class="acc">
<rect x="502" y="240.5" width="10.5" height="10.5"/><rect x="512.5" y="240.5" width="10.5" height="10.5"/><rect x="523" y="240.5" width="10.5" height="10.5"/><rect x="533.5" y="240.5" width="10.5" height="10.5"/><rect x="544" y="240.5" width="10.5" height="10.5"/><rect x="554.5" y="240.5" width="10.5" height="10.5"/><rect x="565" y="240.5" width="10.5" height="10.5"/>
</g>
<text x="155" y="140" text-anchor="middle">462 × 462</text>
<text x="386" y="140" text-anchor="middle">462 × 462</text>
<text x="539" y="61" text-anchor="middle">147²</text>
<text x="539" y="134" text-anchor="middle">147²</text>
<text x="539" y="208" text-anchor="middle">147²</text>
<text x="584" y="262" class="acc-fill">21²</text>
</svg>
<figcaption>Figure 2.1. Euclid's algorithm as geometry (scale: half size). Cut the largest squares you can from a 1071 × 462 rectangle: two of side 462 leave a 462 × 147 strip; three of side 147 leave 147 × 21; seven of side 21 fill it exactly. The last square, side 21, tiles everything: it is the gcd.</figcaption>
</figure>

### Code it

```python
def gcd_steps(a, b):
    steps = 0
    while b:
        a, b = b, a % b
        steps += 1
    return a, steps

print(gcd_steps(1071, 462))
```

```text
(21, 3)
```

Python has `math.gcd` built in, written in C, and it handles numbers with
thousands of digits in microseconds.

## 2.4 How fast is Euclid?

*Level: beginner.*

A gcd that took as many steps as the numbers are large would be useless. The
remarkable fact is that the number of steps grows only with the number of
*digits*.

### A quick bound

**Claim.** After every two steps of Euclid's algorithm, the larger number has
at least halved.

*Proof.* Let the current pair be $(a, b)$ with $a > b$; two steps later the
larger number is $r = a \bmod b$. If $b \leq a/2$, then $r < b \leq a/2$. If $b
> a/2$, then $a = 1 \cdot b + r$ and $r = a - b < a/2$. Either way $r < a/2$.
$\blacksquare$

So for $n$-bit inputs the algorithm takes at most about $2n$ steps. For
1,024-bit numbers, at most about 2,048 divisions.

### The worst case: Fibonacci numbers

The bound can be sharpened, and the sharpest form is one of the first analyses
of an algorithm's running time ever published. Gabriel Lamé proved in 1844 that
the number of division steps is at most five times the number of decimal digits
of the smaller number.

The slow inputs are consecutive **Fibonacci numbers**, $F_1 = F_2 = 1$ and
$F_{k+1} = F_k + F_{k-1}$: 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, .... Divide $F_{k+1}$
by $F_k$ and the quotient is 1 and the remainder is $F_{k-1}$, the smallest
possible progress. Each step moves one place down the sequence:

$$\gcd(55, 34) \to \gcd(34, 21) \to \gcd(21, 13) \to \cdots \to \gcd(2, 1) \to \gcd(1, 0).$$

**Theorem (Lamé, 1844).** If Euclid's algorithm on $a > b > 0$ takes $k$ steps,
then $b \geq F_{k+1}$.

*Proof sketch.* Run the algorithm backward. The last pair before the end is
$(r, 0)$ with $r \geq 1 = F_2$, and the pair before is $(r', r)$ with $r' > r$,
so $r' \geq 2 = F_3$. Each earlier pair $(x, y)$ has $x = qy + z \geq y + z$,
so the numbers at least add like Fibonacci numbers going back. By induction,
after $k$ steps back the smaller number is at least $F_{k+1}$.
$\blacksquare$

Since $F_k$ grows like $\varphi^k / \sqrt 5$, where $\varphi = (1 + \sqrt 5)/2
\approx 1.618$ is the golden ratio, $b \geq F_{k+1}$ gives $k \leq \log_\varphi b
+ 1 \approx 1.44 \log_2 b + 1$. Since $\log_\varphi 10 \approx 4.785 < 5$, Lamé's
"five steps per decimal digit" follows.

```python
F = [1, 1]
while len(F) < 40:
    F.append(F[-1] + F[-2])
print(gcd_steps(F[31], F[30]), F[31], F[30])    # Fibonacci pair: as slow as it gets

import random
rng = random.Random(1)
runs = [gcd_steps(rng.getrandbits(1024) | 1 << 1023, rng.getrandbits(1024))[1] for _ in range(1000)]
print(max(runs), round(sum(runs) / len(runs)))  # worst and average for 1,024-bit pairs
```

```text
(1, 30) 2178309 1346269
662 597
```

Two seven-digit numbers take 30 steps, about Lamé's limit of $5 \times 7 = 35$.
Random 1,024-bit pairs take about 597 steps on average, close to the value
$\frac{12 \ln 2}{\pi^2} \ln b \approx 0.843 \cdot 1024 \cdot 0.693 \approx 598$
found by Hans Heilbronn and John Dixon around 1969 to 1970, and well under the
worst case of $1.44 \times 1024 \approx 1475$.

!!! note "Life story: Euclid's algorithm"
    **Born:** written down in Euclid's *Elements*, Book VII, Propositions 1 and
    2, around 300 BC, and probably older; Euclid gave it for lengths as well as
    numbers, the geometry of Figure 2.1 · **Purpose:** to find the greatest
    common measure of two quantities · **Helped:** fractions in lowest terms,
    calendars, continued fractions, modular inverses (§2.5), RSA key
    generation, the finding of shared RSA factors in 2012; Lamé's 1844 bound
    was among the first analyses of an algorithm · **Status:** in daily use in
    every cryptographic library; Donald Knuth called it "the granddaddy of all
    algorithms, because it is the oldest nontrivial algorithm that has survived
    to the present day"

## 2.5 Bézout's identity

*Level: beginner.*

Euclid's algorithm can do more than find the gcd. Run it backward and it
writes the gcd as a combination of the two inputs.

### By hand

From §2.3, $1071 = 2 \cdot 462 + 147$ and $462 = 3 \cdot 147 + 21$. Solve the
second line for 21, then replace 147 using the first:

$$21 = 462 - 3 \cdot 147 = 462 - 3 \cdot (1071 - 2 \cdot 462) = 7 \cdot 462 - 3 \cdot 1071.$$

Check: $7 \cdot 462 = 3234$, $3 \cdot 1071 = 3213$, and $3234 - 3213 = 21$.

### The theorem

**Theorem (Bézout's identity).** For integers $a, b$, not both zero, there are
integers $x, y$ with

$$ax + by = \gcd(a, b).$$

Moreover $\gcd(a, b)$ is the smallest positive number of the form $ax + by$.

*Proof.* Let $S = \{ax + by : x, y \in \mathbb{Z}\}$ and let $d$ be the
smallest positive element of $S$ (well-ordering again), say $d = ax_0 + by_0$.
Divide $a$ by $d$: $a = qd + r$ with $0 \leq r < d$. Then $r = a - qd = a(1 -
qx_0) + b(-qy_0)$ is also in $S$, and it is smaller than $d$, so it cannot be
positive: $r = 0$. So $d \mid a$, and the same argument gives $d \mid b$. So
$d$ is a common divisor, $d \leq \gcd(a, b)$. Conversely, $\gcd(a, b)$ divides
$a$ and $b$, so it divides $ax_0 + by_0 = d$ (rule 2), so $\gcd(a, b) \leq d$.
$\blacksquare$

The proof shows that $x, y$ exist; Euclid's algorithm run with bookkeeping
finds them. The identity is named for Étienne Bézout, who proved a version for
polynomials in 1779; the integer version was known to the French mathematician Bachet de
Méziriac in 1624.

Two consequences are used everywhere:

- **Every common divisor divides the gcd.** If $c \mid a$ and $c \mid b$, then $c
  \mid ax + by = \gcd(a, b)$. So "greatest" means greatest in the divisibility
  sense too, not just in size.
- **$\gcd(a, n) = 1$ if and only if $ax + ny = 1$ for some $x, y$.** Reduced mod
  $n$, that says $ax \equiv 1 \pmod n$: $x$ is the **inverse** of $a$ modulo $n$.
  Chapter 3 builds on this.

### The extended Euclidean algorithm

Instead of running backward, carry the coefficients forward. Keep two rows of
the form $r_i = a x_i + b y_i$, starting with $a = a \cdot 1 + b \cdot 0$ and $b
= a \cdot 0 + b \cdot 1$. Each step subtracts $q$ times the second row from the
first, which keeps the form.

| $q$ | $r$ | $x$ | $y$ |
|---|---|---|---|
| | 1071 | 1 | 0 |
| | 462 | 0 | 1 |
| 2 | 147 | 1 | $-2$ |
| 3 | 21 | $-3$ | 7 |
| 7 | 0 | 22 | $-51$ |

The row before the 0 gives $21 = 1071 \cdot (-3) + 462 \cdot 7$.

```python
def egcd(a, b):
    """Return (g, x, y) with a*x + b*y = g = gcd(a, b)."""
    x0, y0, x1, y1 = 1, 0, 0, 1
    while b:
        q, r = divmod(a, b)
        a, b = b, r
        x0, x1 = x1, x0 - q * x1
        y0, y1 = y1, y0 - q * y1
    return a, x0, y0

g, x, y = egcd(1071, 462)
print(g, x, y, 1071 * x + 462 * y)
print(egcd(240, 46))
```

```text
21 -3 7 21
(2, -9, 47)
```

Since Python 3.8, `pow(a, -1, n)` computes the inverse of $a$ modulo $n$
directly, using exactly this algorithm.

## 2.6 Unique factorization

*Level: intermediate.*

### Primes, properly

A **prime** is an integer $p > 1$ whose only positive divisors are 1 and $p$.
An integer $n > 1$ that is not prime is **composite**: it has a divisor $d$ with
$1 < d < n$. The number 1 is neither, by convention, and the next theorem
shows why the convention is wise: if 1 counted as prime, $6 = 2 \cdot 3 = 1
\cdot 2 \cdot 3 = 1 \cdot 1 \cdot 2 \cdot 3$ would have many factorizations.

### Euclid's lemma

**Lemma (Euclid).** If a prime $p$ divides a product $ab$, then $p \mid a$ or $p
\mid b$.

*Proof.* Suppose $p \nmid a$. The only positive divisors of $p$ are 1 and $p$,
and $p$ does not divide $a$, so $\gcd(a, p) = 1$. By Bézout, $ax + py = 1$ for
some $x, y$. Multiply by $b$: $abx + pby = b$. Now $p$ divides $ab$ and $p$
divides $pby$, so $p$ divides their combination $b$ (rule 2). $\blacksquare$

This is where Bézout pays off. Notice that primality was essential: $6 \mid 4
\cdot 9$ but $6$ divides neither 4 nor 9. The lemma extends by induction to
longer products: if $p \mid a_1 a_2 \cdots a_k$ then $p$ divides some $a_i$.

### The fundamental theorem

**Theorem (fundamental theorem of arithmetic).** Every integer $n > 1$ can be
written as a product of primes,

$$n = p_1 p_2 \cdots p_k,$$

and this is unique apart from the order of the factors.

*Proof.* *Existence*, by strong induction. If $n$ is prime, it is its own
product. Otherwise $n = ab$ with $1 < a, b < n$, and by induction $a$ and $b$
are products of primes; put them together.

*Uniqueness.* Suppose $p_1 p_2 \cdots p_k = q_1 q_2 \cdots q_l$ with all $p_i$,
$q_j$ prime. Then $p_1$ divides the right side, so by Euclid's lemma $p_1$
divides some $q_j$. Since $q_j$ is prime and $p_1 > 1$, $p_1 = q_j$. Cancel it
from both sides and repeat with what is left. Each step cancels one prime from
each side, and at the end both sides are 1 at the same moment (if one side ran
out first, a product of primes would equal 1, impossible). So the two lists
held the same primes, the same number of times. $\blacksquare$

Grouping equal primes, we write $n = p_1^{e_1} p_2^{e_2} \cdots p_r^{e_r}$ with
distinct primes, for example $1071 = 3^2 \cdot 7 \cdot 17$. Then $\gcd$ and
$\operatorname{lcm}$ (the least common multiple) are easy to read off the
exponents: take the smaller exponent of each prime for the gcd, the larger for
the lcm. That gives the useful identity $\gcd(a, b) \cdot \operatorname{lcm}(a,
b) = ab$, which RSA key generation uses to compute $\operatorname{lcm}(p-1, q-1)$
with one gcd.

### A world where it fails

Unique factorization sounds obvious, so it is worth seeing that it is not.

Consider only the numbers that leave remainder 1 on division by 4: 1, 5, 9, 13,
17, 21, 25, 29, 33, ..., sometimes called **Hilbert numbers** after David Hilbert,
who used them in lectures. The product of two of them is again one of them
($(4a + 1)(4b + 1) = 4(4ab + a + b) + 1$). Call a Hilbert number "prime" if it
is not a product of two smaller Hilbert numbers other than 1. Then 9, 21 and 49
are all "prime" in this world (9 = 3 · 3, but 3 is not a Hilbert number), and

$$441 = 9 \cdot 49 = 21 \cdot 21$$

has two different factorizations into "primes". What broke? Euclid's lemma:
21 divides $9 \cdot 49$ but divides neither 9 nor 49. And Euclid's lemma broke
because Bézout's identity broke: you cannot do Euclid's algorithm inside the
Hilbert numbers, since subtracting two of them gives a multiple of 4, which is
not in the set.

The same failure happens in number systems mathematicians care about. In the
numbers $a + b\sqrt{-5}$ with integer $a, b$,

$$6 = 2 \cdot 3 = (1 + \sqrt{-5})(1 - \sqrt{-5}),$$

and all four factors are "prime" there. In 1847 Gabriel Lamé announced a proof of
Fermat's Last Theorem to the Paris Academy that quietly assumed unique
factorization in a similar system; Ernst Kummer had already found that it
fails, and repairing it led to ideal theory, one of the foundations of modern
algebra. Cryptography meets this world again in the number field sieve and in
class groups (§2.11).

<figure class="mars-fig">
<svg viewBox="0 0 640 200" width="640" role="img" aria-label="Factor trees: 1071 factors uniquely into 3, 3, 7, 17; among Hilbert numbers 441 factors two ways" fill="currentColor" font-size="14">
<g stroke="currentColor" stroke-width="1.3">
<line x1="150" y1="34" x2="100" y2="80"/><line x1="150" y1="34" x2="200" y2="80"/>
<line x1="100" y1="94" x2="70" y2="140"/><line x1="100" y1="94" x2="130" y2="140"/>
<line x1="200" y1="94" x2="175" y2="140"/><line x1="200" y1="94" x2="225" y2="140"/>
<line x1="420" y1="34" x2="385" y2="80"/><line x1="420" y1="34" x2="455" y2="80"/>
<line x1="560" y1="34" x2="525" y2="80"/><line x1="560" y1="34" x2="595" y2="80"/>
</g>
<text x="150" y="28" text-anchor="middle" font-weight="bold">1071</text>
<text x="100" y="92" text-anchor="middle">9</text><text x="200" y="92" text-anchor="middle">119</text>
<text x="70" y="156" text-anchor="middle" class="acc-fill">3</text><text x="130" y="156" text-anchor="middle" class="acc-fill">3</text>
<text x="175" y="156" text-anchor="middle" class="acc-fill">7</text><text x="225" y="156" text-anchor="middle" class="acc-fill">17</text>
<text x="150" y="190" text-anchor="middle">integers: one way only</text>
<text x="420" y="28" text-anchor="middle" font-weight="bold">441</text>
<text x="385" y="96" text-anchor="middle" class="acc-fill">9</text><text x="455" y="96" text-anchor="middle" class="acc-fill">49</text>
<text x="560" y="28" text-anchor="middle" font-weight="bold">441</text>
<text x="525" y="96" text-anchor="middle" class="acc-fill">21</text><text x="595" y="96" text-anchor="middle" class="acc-fill">21</text>
<text x="490" y="190" text-anchor="middle">Hilbert numbers 1, 5, 9, 13, ...: two ways</text>
</svg>
<figcaption>Figure 2.2. Unique factorization holds in the integers because Euclid's algorithm works there. Among the Hilbert numbers it does not, and 441 has two different "prime" factorizations.</figcaption>
</figure>

### Why RSA needs this

An RSA modulus $N = pq$ is useful only because $p$ and $q$ are *the* prime
factors of $N$, the only ones. The private key is computed from them, and if
another pair of primes multiplied to $N$ the scheme would not be well defined.
The fundamental theorem guarantees it. It also tells us that factoring has a
single right answer, so it makes sense to ask how hard finding it is.

## 2.7 How many primes are there?

*Level: intermediate.*

Euclid proved there are infinitely many primes (Chapter 1). A cryptographer
needs more: how many primes are there of 1,024 bits, and how long does a random
search take to find one?

### The sieve of Eratosthenes

To list every prime up to $n$, write out the numbers from 2 to $n$. The first
one, 2, is prime; cross out its multiples. The next uncrossed number, 3, is
prime; cross out its multiples. Continue. Any number left uncrossed has no
smaller prime factor, so it is prime. You can stop once the next prime exceeds
$\sqrt n$, because every composite $m \leq n$ has a prime factor at most $\sqrt
m$. The method is credited to Eratosthenes of Cyrene, the librarian of
Alexandria who also measured the size of the Earth, in the third century BC.

```python
import math

def sieve(n):
    is_p = bytearray([1]) * (n + 1)
    is_p[0:2] = b"\x00\x00"
    for i in range(2, math.isqrt(n) + 1):
        if is_p[i]:
            is_p[i*i::i] = bytearray(len(range(i*i, n + 1, i)))   # cross out i*i, i*i+i, ...
    return [i for i in range(n + 1) if is_p[i]]

ps = sieve(10**7)
for x in (10**k for k in range(1, 8)):
    count = sum(1 for p in ps if p <= x)
    print(x, count, round(x / math.log(x)), round(count / (x / math.log(x)), 3))
```

```text
10 4 4 0.921
100 25 22 1.151
1000 168 145 1.161
10000 1229 1086 1.132
100000 9592 8686 1.104
1000000 78498 72382 1.084
10000000 664579 620421 1.071
```

Crossing out starts at $i^2$ because smaller multiples of $i$ have a smaller
prime factor and are already crossed. The sieve takes $O(n \log \log n)$ steps,
nearly linear, and is the fastest simple way to list all small primes. It is
used inside prime generation: before testing a large random candidate for
primality, libraries check it against a few thousand small primes, which throws
out most candidates cheaply (Chapter 6).

### The prime number theorem

Write $\pi(x)$ for the number of primes up to $x$. The table's second column
is $\pi(x)$; the third is $x / \ln x$, where $\ln$ is the natural logarithm; the
fourth is their ratio, which creeps toward 1.

**Theorem (prime number theorem).** $\displaystyle \lim_{x \to \infty}
\frac{\pi(x)}{x / \ln x} = 1.$

Gauss guessed it around 1792, at the age of fifteen, from tables of primes.
Chebyshev proved around 1850 that the ratio stays between about 0.92 and 1.11 for
large $x$. Jacques Hadamard and Charles-Jean de la Vallée Poussin proved the
theorem itself independently in 1896, both using the complex-analytic methods
Bernhard Riemann had introduced in 1859. An "elementary" proof, without complex
numbers, came from Atle Selberg and Paul Erdős in 1949.

A better approximation is the logarithmic integral $\operatorname{li}(x) =
\int_0^x dt/\ln t$, which gives about 664,918 for $x = 10^7$ against the true
664,579. How good it is, exactly, is the **Riemann hypothesis**, the most famous
open problem in mathematics: it is equivalent to $\lvert \pi(x) -
\operatorname{li}(x) \rvert < \sqrt{x} \ln x / (8\pi)$ for all $x \geq 2657$
(Lowell Schoenfeld, 1976).

The useful reading of the theorem is a density: **near $x$, about one number in
$\ln x$ is prime.** For 1,024-bit numbers, $\ln 2^{1024} = 1024 \ln 2 \approx 710$,
so about one in 710 is prime, and one *odd* number in 355.

### How many 1,024-bit primes?

The 1,024-bit numbers are those from $2^{1023}$ to $2^{1024} - 1$, and there
are $2^{1023}$ of them. About one in 710 is prime, so there are roughly

$$\frac{2^{1023}}{710} \approx 2^{1023 - 9.47} \approx 2^{1013.5}$$

1,024-bit primes. That is far more than the number of atoms in the observable
universe, raised to the thirteenth power. An attacker cannot list them, store
them, or try them, and two people choosing 1,024-bit primes at random will not
choose the same one, *if their random numbers are really random*. When they
are not, they do collide, which is exactly what happened in 2012 (§2.10).

<figure class="mars-fig">
<svg viewBox="0 0 640 260" width="640" role="img" aria-label="Graph of the prime counting function pi of x as a staircase, with x over ln x below it" fill="currentColor" font-size="13">
<line x1="60" y1="220" x2="610" y2="220" stroke="currentColor" stroke-width="1.3"/>
<line x1="60" y1="220" x2="60" y2="20" stroke="currentColor" stroke-width="1.3"/>
<text x="335" y="252" text-anchor="middle">x (0 to 100)</text>
<text x="54" y="224" text-anchor="end">0</text><text x="54" y="24" text-anchor="end">25</text>
<polyline fill="none" class="acc" stroke-width="2" points="60,220 71,220 71,212 76.5,212 76.5,204 87.5,204 87.5,196 98.5,196 98.5,188 120.5,188 120.5,180 131.5,180 131.5,172 153.5,172 153.5,164 164.5,164 164.5,156 186.5,156 186.5,148 219.5,148 219.5,140 230.5,140 230.5,132 263.5,132 263.5,124 285.5,124 285.5,116 296.5,116 296.5,108 318.5,108 318.5,100 351.5,100 351.5,92 384.5,92 384.5,84 395.5,84 395.5,76 428.5,76 428.5,68 450.5,68 450.5,60 461.5,60 461.5,52 494.5,52 494.5,44 549.5,44 549.5,36 593.5,36 593.5,28 610,28"/>
<polyline fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="6 4" points="137,202 170,189 225,170 280,153 335,137 390,121 445,106 500,92 555,78 610,64"/>
<text x="420" y="160" class="acc-fill">π(x): 25 primes up to 100</text>
<text x="420" y="180">x / ln x ≈ 21.7 at 100</text>
</svg>
<figcaption>Figure 2.3. The primes up to 100 as a staircase: each step is a prime. The curve x / ln x runs a little below; the ratio tends to 1, which is the prime number theorem.</figcaption>
</figure>

### Which approximation is better?

Gauss did not actually guess $x / \ln x$. In a letter of 1849 to Johann Encke
he recalled noticing as a boy that primes near $t$ have density about
$1 / \ln t$, and so he added the density up:

$$\operatorname{li}(x) = \int_0^x \frac{dt}{\ln t}.$$

Integrating by parts gives $\operatorname{li}(x) = x / \ln x + x / (\ln x)^2 +
\cdots$, so the two approximations agree in the limit, but $x / \ln x$ is short
by about $x / (\ln x)^2$, some 6 percent at $x = 10^7$. To compute
$\operatorname{li}$, substitute $t = e^s$ and expand $e^s$ as a series:

$$\operatorname{li}(x) = \gamma + \ln \ln x + \sum_{k=1}^{\infty} \frac{(\ln x)^k}{k \cdot k!},$$

where $\gamma = 0.5772\ldots$ is Euler's constant.

```python
# Uses sieve() and ps from the listing above.
import bisect

def li(x):
    """Logarithmic integral: gamma + ln ln x + sum of (ln x)^k / (k * k!)."""
    L = math.log(x)
    total, term = 0.0, 1.0
    for k in range(1, 200):
        term *= L / k                          # term = L^k / k!
        total += term / k
    return 0.5772156649015329 + math.log(L) + total

print(f"{'x':>9} {'pi(x)':>7} {'x/ln x':>9} {'li(x)':>9} {'pi-x/ln x':>9} {'li-pi':>6}")
for k in range(2, 8):
    x = 10**k
    pi_x = bisect.bisect_right(ps, x)          # how many primes in the list are <= x
    print(f"{x:>9} {pi_x:>7} {x / math.log(x):>9.0f} {li(x):>9.0f} "
          f"{pi_x - x / math.log(x):>9.0f} {li(x) - pi_x:>6.0f}")
```

It prints (after the table of the listing above):

```text
        x   pi(x)    x/ln x     li(x) pi-x/ln x  li-pi
      100      25        22        30         3      5
     1000     168       145       178        23     10
    10000    1229      1086      1246       143     17
   100000    9592      8686      9630       906     38
  1000000   78498     72382     78628      6116    130
 10000000  664579    620421    664918     44158    339
```

At ten million $x / \ln x$ misses by 44,158 and $\operatorname{li}(x)$ by 339,
well under $\sqrt{10^7} \approx 3{,}162$, the size of error the Riemann
hypothesis allows up to a logarithm (Figure 2.4). The last column hides a
surprise: $\operatorname{li}(x) > \pi(x)$ at every $x$ anyone has computed, yet
John Littlewood proved in 1914 that the sign changes infinitely often, and
Carter Bays and Richard Hudson showed in 2000 that a change occurs below about
$1.4 \times 10^{316}$.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Two curves against x from 100 to ten million on a logarithmic axis: pi(x) divided by x over ln x falls slowly from about 1.15 to 1.07, while pi(x) divided by li(x) rises from about 0.83 to 0.9995 and hugs the line at 1" fill="currentColor" font-size="13">
<line x1="70" y1="240" x2="610" y2="240" stroke="currentColor" stroke-width="1.3"/>
<line x1="70" y1="240" x2="70" y2="30" stroke="currentColor" stroke-width="1.3"/>
<text x="64" y="244" text-anchor="end">0.8</text>
<text x="64" y="194" text-anchor="end">0.9</text>
<line x1="70" y1="190" x2="610" y2="190" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="2 4"/>
<text x="64" y="144" text-anchor="end">1.0</text>
<line x1="70" y1="140" x2="610" y2="140" stroke="currentColor" stroke-opacity="0.6"/>
<text x="64" y="94" text-anchor="end">1.1</text>
<line x1="70" y1="90" x2="610" y2="90" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="2 4"/>
<text x="64" y="44" text-anchor="end">1.2</text>
<line x1="70" y1="40" x2="610" y2="40" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="2 4"/>
<line x1="70" y1="240" x2="70" y2="245" stroke="currentColor"/>
<text x="70" y="260" text-anchor="middle">10<tspan dy="-6" font-size="10">2</tspan></text>
<line x1="178" y1="240" x2="178" y2="245" stroke="currentColor"/>
<text x="178" y="260" text-anchor="middle">10<tspan dy="-6" font-size="10">3</tspan></text>
<line x1="286" y1="240" x2="286" y2="245" stroke="currentColor"/>
<text x="286" y="260" text-anchor="middle">10<tspan dy="-6" font-size="10">4</tspan></text>
<line x1="394" y1="240" x2="394" y2="245" stroke="currentColor"/>
<text x="394" y="260" text-anchor="middle">10<tspan dy="-6" font-size="10">5</tspan></text>
<line x1="502" y1="240" x2="502" y2="245" stroke="currentColor"/>
<text x="502" y="260" text-anchor="middle">10<tspan dy="-6" font-size="10">6</tspan></text>
<line x1="610" y1="240" x2="610" y2="245" stroke="currentColor"/>
<text x="610" y="260" text-anchor="middle">10<tspan dy="-6" font-size="10">7</tspan></text>
<text x="340" y="290" text-anchor="middle">x (logarithmic scale)</text>
<polyline fill="none" stroke="currentColor" stroke-width="2" points="70.0,64.4 97.0,57.3 124.0,48.4 151.0,65.7 178.0,59.7 205.0,61.4 232.0,71.7 259.0,72.6 286.0,74.0 313.0,79.0 340.0,82.8 367.0,85.4 394.0,87.8 421.0,91.3 448.0,93.5 475.0,95.6 502.0,97.8 529.0,99.6 556.0,101.3 583.0,102.9 610.0,104.4"/>
<polyline fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="7 4" points="70.0,225.1 97.0,204.9 124.0,183.3 151.0,183.5 178.0,167.1 205.0,158.2 232.0,158.3 259.0,151.9 286.0,146.9 313.0,145.9 340.0,144.8 367.0,143.2 394.0,142.0 421.0,142.1 448.0,141.4 475.0,141.0 502.0,140.8 529.0,140.6 556.0,140.4 583.0,140.3 610.0,140.3"/>
<text x="330" y="55">π(x) ÷ (x / ln x): 1.071 at 10<tspan dy="-6" font-size="10">7</tspan></text>
<text x="330" y="165">π(x) ÷ li(x): 0.9995 at 10<tspan dy="-6" font-size="10">7</tspan></text>
</svg>
<figcaption>Figure 2.4. The prime number theorem in two forms, for x from 100 to ten million. The ratio π(x) ÷ (x / ln x) (solid) creeps down toward 1 and is still 1.071 at ten million; the ratio π(x) ÷ li(x) (dashed) is within 0.05 percent of 1 by then.</figcaption>
</figure>

### Gaps and patterns

Primes thin out, but irregularly. There are arbitrarily long gaps: $n! + 2, n!
+ 3, \dots, n! + n$ are $n - 1$ consecutive composites (each $n! + k$ is
divisible by $k$). Yet primes also come in close pairs: 11 and 13, 101 and 103,
1,000,037 and 1,000,039. Whether there are infinitely many such **twin primes**
is unknown; in 2013 Yitang Zhang proved that infinitely many pairs of primes
differ by at most 70 million, and a collaborative project quickly cut that
bound to 246.

Primes are also spread evenly among the remainders allowed to them. **Dirichlet's
theorem** (1837) says that if $\gcd(a, m) = 1$, there are infinitely many primes
$\equiv a \pmod m$, and asymptotically each such class gets an equal share. So
about half of all odd primes are $\equiv 1 \pmod 4$ and half $\equiv 3 \pmod 4$,
a fact Chapter 5 uses when it computes square roots.

### Smooth numbers and Dickman's function

Primes have no small factors. Factoring cares just as much about their
opposites: a number is **$y$-smooth** if none of its prime factors exceeds $y$.
So $2016 = 2^5 \cdot 3^2 \cdot 7$ is 7-smooth, and $2026 = 2 \cdot 1013$ is
not even 1000-smooth. Write $\Psi(x, y)$ for the number of $y$-smooth integers
from 1 to $x$. Every fast factoring method, from Pollard's $p - 1$ (§2.9) to
the quadratic sieve (§2.11), works by finding smooth numbers, and its running
time is set by how rare they are.

**By hand, for $y = \sqrt x$.** A number $m \leq x$ that is not
$\sqrt x$-smooth has exactly one prime factor $p > \sqrt x$, since two would
multiply to more than $x$. Each such $p$ has $\lfloor x/p \rfloor$ multiples up
to $x$, so the non-smooth numbers number about

$$\sum_{\sqrt x < p \leq x} \frac{x}{p} \approx x \left(\ln \ln x - \ln \ln \sqrt x\right) = x \ln 2,$$

by Mertens' theorem (1874), $\sum_{p \leq x} 1/p = \ln \ln x + 0.2615\ldots +
o(1)$. So about $1 - \ln 2 \approx 30.7$ percent of numbers up to $x$ are
$\sqrt x$-smooth, however large $x$ is.

**Dickman's function.** In 1930 the Swedish actuary Karl Dickman found the
general answer: for fixed $u \geq 1$, $\Psi(x, x^{1/u}) / x \to \rho(u)$, where
$\rho(u) = 1$ on $[0, 1]$ and

$$u\,\rho'(u) = -\rho(u - 1) \quad (u > 1),$$

a **delay differential equation**, whose slope at $u$ depends on the value one
unit earlier. On $[1, 2]$ it gives $\rho(u) = 1 - \ln u$, matching the hand
count. Beyond that $\rho$ has no closed form, but it falls roughly like
$u^{-u}$. Since $u\rho(u)$ and $\int_{u-1}^{u} \rho(t)\,dt$ have the same
derivative and agree at $u = 1$,

$$\rho(u) = \frac{1}{u} \int_{u-1}^{u} \rho(t)\,dt,$$

an average of positive values, which a computer can step forward stably even
when $\rho$ is tiny. The code does that, then counts smooth numbers with a
sieve that records each number's largest prime factor.

```python
def dickman(umax, steps=200):
    """Dickman's rho on a grid of step 1/steps, from u * rho(u) = integral of rho over [u - 1, u]."""
    h = 1 / steps
    r = [1.0] * (steps + 1)                    # rho(u) = 1 for 0 <= u <= 1
    for i in range(steps + 1, umax * steps + 1):
        u = i * h
        inner = sum(r[i - steps + 1:i])        # trapezoid rule; the new end point is solved for
        r.append(h * (r[i - steps] / 2 + inner) / (u - h / 2))
    return lambda u: r[round(u * steps)]

rho = dickman(20)

N = 10**7
big = list(range(N + 1))                       # big[m] ends as the largest prime factor of m
for p in range(2, N + 1):
    if big[p] == p:                            # no smaller prime has marked p, so p is prime
        big[p::p] = [p] * len(range(p, N + 1, p))

print("u  x=10^4  10^5    10^6    10^7    rho(u)")
for u in (2, 3, 4, 5):
    row = []
    for k in (4, 5, 6, 7):
        x = 10**k
        y = x ** (1 / u)                       # count the x^(1/u)-smooth numbers up to x
        row.append(sum(1 for m in range(1, x + 1) if big[m] <= y) / x)
    print(u, " ".join(f"{d:.4f}" for d in row), f"{rho(u):.4f}")
print(f"rho(8) = {rho(8):.3g}, rho(10) = {rho(10):.3g}, rho(16) = {rho(16):.3g}")
```

It prints:

```text
u  x=10^4  10^5    10^6    10^7    rho(u)
2 0.3716 0.3582 0.3443 0.3362 0.3069
3 0.1169 0.0874 0.0723 0.0665 0.0486
4 0.0338 0.0258 0.0181 0.0116 0.0049
5 0.0175 0.0069 0.0041 0.0028 0.0004
rho(8) = 3.23e-08, rho(10) = 2.77e-11, rho(16) = 1.11e-21
```

Each row falls toward $\rho(u)$ as $x$ grows, but slowly, because with small
$y$ numbers are smoother than the limit says (Figure 2.5).

This explains sieving. Halving the size of the numbers that must be smooth
halves $u$, and since $\rho$ falls like $u^{-u}$, that helps enormously. With a
smoothness bound of $10^7$, a 112-digit number has $u = 16$ and is smooth with
probability about $\rho(16) \approx 10^{-21}$; a 56-digit number has $u = 8$
and probability $\rho(8) \approx 3 \times 10^{-8}$, some $10^{13}$ times
likelier. The quadratic sieve wins exactly this way: it needs smooth values of
$x^2 - n$, numbers only a little larger than $\sqrt n$, rather than random
numbers as large as $n$.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Dickman rho function on a logarithmic vertical scale, from 1 at u up to 1 down to about 2 in a hundred thousand at u equal 6; measured densities of smooth numbers up to ten million sit above the curve" fill="currentColor" font-size="13">
<line x1="70" y1="240" x2="610" y2="240" stroke="currentColor" stroke-width="1.3"/>
<line x1="70" y1="240" x2="70" y2="30" stroke="currentColor" stroke-width="1.3"/>
<text x="64" y="44" text-anchor="end">10<tspan dy="-6" font-size="10">0</tspan></text>
<text x="64" y="84" text-anchor="end">10<tspan dy="-6" font-size="10">-1</tspan></text>
<line x1="70" y1="80" x2="610" y2="80" stroke="currentColor" stroke-opacity="0.25" stroke-dasharray="2 4"/>
<text x="64" y="124" text-anchor="end">10<tspan dy="-6" font-size="10">-2</tspan></text>
<line x1="70" y1="120" x2="610" y2="120" stroke="currentColor" stroke-opacity="0.25" stroke-dasharray="2 4"/>
<text x="64" y="164" text-anchor="end">10<tspan dy="-6" font-size="10">-3</tspan></text>
<line x1="70" y1="160" x2="610" y2="160" stroke="currentColor" stroke-opacity="0.25" stroke-dasharray="2 4"/>
<text x="64" y="204" text-anchor="end">10<tspan dy="-6" font-size="10">-4</tspan></text>
<line x1="70" y1="200" x2="610" y2="200" stroke="currentColor" stroke-opacity="0.25" stroke-dasharray="2 4"/>
<text x="64" y="244" text-anchor="end">10<tspan dy="-6" font-size="10">-5</tspan></text>
<line x1="70" y1="240" x2="610" y2="240" stroke="currentColor" stroke-opacity="0.25" stroke-dasharray="2 4"/>
<line x1="70" y1="240" x2="70" y2="245" stroke="currentColor"/>
<text x="70" y="260" text-anchor="middle">0</text>
<line x1="160" y1="240" x2="160" y2="245" stroke="currentColor"/>
<text x="160" y="260" text-anchor="middle">1</text>
<line x1="250" y1="240" x2="250" y2="245" stroke="currentColor"/>
<text x="250" y="260" text-anchor="middle">2</text>
<line x1="340" y1="240" x2="340" y2="245" stroke="currentColor"/>
<text x="340" y="260" text-anchor="middle">3</text>
<line x1="430" y1="240" x2="430" y2="245" stroke="currentColor"/>
<text x="430" y="260" text-anchor="middle">4</text>
<line x1="520" y1="240" x2="520" y2="245" stroke="currentColor"/>
<text x="520" y="260" text-anchor="middle">5</text>
<line x1="610" y1="240" x2="610" y2="245" stroke="currentColor"/>
<text x="610" y="260" text-anchor="middle">6</text>
<text x="340" y="288" text-anchor="middle">u = (digits of x) ÷ (digits of the smoothness bound y)</text>
<polyline fill="none" stroke="currentColor" stroke-width="2" points="70,40 85,40 100,40 115,40 130,40 145,40 160,40 175,43 190,46 205,49 220,52 235,56 250,61 265,65 280,70 295,75 310,81 325,87 340,93 355,99 370,105 385,112 400,118 415,125 430,132 445,140 460,147 475,155 490,162 505,170 520,178 535,186 550,194 565,203 580,211 595,220 610,228"/>
<circle cx="250.0" cy="58.9" r="4.5" fill="none" stroke="currentColor" stroke-width="1.6"/>
<circle cx="340.0" cy="87.1" r="4.5" fill="none" stroke="currentColor" stroke-width="1.6"/>
<circle cx="430.0" cy="117.4" r="4.5" fill="none" stroke="currentColor" stroke-width="1.6"/>
<circle cx="520.0" cy="142.1" r="4.5" fill="none" stroke="currentColor" stroke-width="1.6"/>
<circle cx="250.0" cy="60.5" r="3"/>
<circle cx="340.0" cy="92.5" r="3"/>
<circle cx="430.0" cy="132.4" r="3"/>
<circle cx="520.0" cy="178.0" r="3"/>
<text x="260" y="51">ρ(2) = 1 − ln 2 ≈ 0.307</text>
<text x="466" y="120">ρ(u), roughly u<tspan dy="-6" font-size="10">−u</tspan></text>
<circle cx="92" cy="214" r="4.5" fill="none" stroke="currentColor" stroke-width="1.6"/><text x="104" y="218">counted up to x = 10<tspan dy="-6" font-size="10">7</tspan></text>
</svg>
<figcaption>Figure 2.5. Dickman's function ρ(u), the limiting share of numbers up to x whose prime factors are all at most x^(1/u), on a logarithmic scale. Dots mark ρ(2) to ρ(5); open circles mark the shares counted up to ten million, still above the limit.</figcaption>
</figure>

## 2.8 Continued fractions

*Level: intermediate.*

Euclid's algorithm has a hidden second life: the list of quotients it produces
describes the fraction $a/b$ as a **continued fraction**, and continued fractions
give the best possible approximations to a number by fractions with small
denominators. Two famous attacks need exactly that: Wiener's 1990 attack on RSA
with a small private exponent, and the final step of Shor's quantum factoring
algorithm (Chapter 20).

### By hand

Run Euclid on 415 and 93:

$$415 = 4 \cdot 93 + 43, \quad 93 = 2 \cdot 43 + 7, \quad 43 = 6 \cdot 7 + 1, \quad 7 = 7 \cdot 1 + 0.$$

The quotients are 4, 2, 6, 7. Now read each line as a fraction:

$$\frac{415}{93} = 4 + \frac{43}{93} = 4 + \cfrac{1}{\frac{93}{43}} = 4 + \cfrac{1}{2 + \cfrac{1}{\frac{43}{7}}} = 4 + \cfrac{1}{2 + \cfrac{1}{6 + \cfrac{1}{7}}}.$$

We write this $[4; 2, 6, 7]$. Every rational number has a finite continued
fraction, and its terms are the quotients of Euclid's algorithm.

### Convergents

Cutting the continued fraction short gives the **convergents**:

$$[4] = \tfrac41, \quad [4; 2] = \tfrac92, \quad [4; 2, 6] = \tfrac{58}{13}, \quad [4; 2, 6, 7] = \tfrac{415}{93}.$$

They can be computed with a two-term recurrence instead of simplifying nested
fractions. If the terms are $a_0, a_1, \dots$, set $h_{-1} = 1, h_{-2} = 0$ and
$k_{-1} = 0, k_{-2} = 1$, then

$$h_i = a_i h_{i-1} + h_{i-2}, \qquad k_i = a_i k_{i-1} + k_{i-2},$$

and the $i$-th convergent is $h_i / k_i$.

```python
def cf(a, b):                       # continued fraction terms of a/b
    out = []
    while b:
        q, r = divmod(a, b)
        out.append(q)
        a, b = b, r
    return out

def convergents(terms):
    h0, h1, k0, k1 = 0, 1, 1, 0
    out = []
    for a in terms:
        h0, h1 = h1, a * h1 + h0
        k0, k1 = k1, a * k1 + k0
        out.append((h1, k1))
    return out

print(cf(415, 93))
print(convergents(cf(415, 93)))
print(convergents([3, 7, 15, 1, 292, 1, 1]))   # the start of pi's continued fraction
```

```text
[4, 2, 6, 7]
[(4, 1), (9, 2), (58, 13), (415, 93)]
[(3, 1), (22, 7), (333, 106), (355, 113), (103993, 33102), (104348, 33215), (208341, 66317)]
```

The convergents of $\pi = [3; 7, 15, 1, 292, 1, 1, \dots]$ include $22/7$, known
to Archimedes, and $355/113 = 3.14159292\ldots$, found by the Chinese astronomer
Zu Chongzhi in the fifth century, correct to six decimal places. The large term
292 is why $355/113$ is so good: the next correction is tiny.

### Best approximations

**Theorem (Legendre, 1798).** If $\lvert x - p/q \rvert < 1/(2q^2)$, then $p/q$ is
a convergent of the continued fraction of $x$.

This is the property attacks use. If you know that some unknown fraction $p/q$
is very close to a number $x$ you can compute, then $p/q$ is one of the
convergents of $x$, and there are only about $\log x$ of them to try. In
Wiener's attack, $x = e/N$ is public, and when the private exponent $d$ is
smaller than about $N^{1/4}$, the unknown fraction $k/d$ satisfies Legendre's
condition, so $d$ appears among the convergents of $e/N$. *Cryptanalysis*,
[Chapter 13](../cryptanalysis/13-Attacks-on-RSA.md), carries out the attack; Exercise 9 lets you try the idea.

## 2.9 Factoring: the classical methods

*Level: intermediate.*

### Trial division

The obvious way to factor $n$ is to try dividing by 2, 3, 5, 7, ... up to
$\sqrt n$. Chapter 1 timed it. It finds a factor $p$ after about $p / \ln p$
divisions (one per prime below $p$), so it is excellent at finding small
factors and hopeless for large ones: for a 2,048-bit RSA modulus with two
1,024-bit factors it needs about $2^{1014}$ divisions. Every serious factoring
program still starts with trial division to strip small primes, and every
primality test starts with it too.

### Fermat's method

Pierre de Fermat described a different method in a letter of 1643. If $n = pq$
with $p$ and $q$ odd, write

$$a = \frac{p + q}{2}, \quad b = \frac{q - p}{2}, \qquad\text{so}\qquad n = (a - b)(a + b) = a^2 - b^2.$$

So $n$ is a difference of two squares. Turn it around: search for $a \geq \sqrt
n$ such that $a^2 - n$ is a perfect square $b^2$; then $n = (a - b)(a + b)$.

*By hand.* Factor $n = 5959$. Since $\sqrt{5959} \approx 77.2$, start at $a =
78$:

| $a$ | $a^2 - n$ | square? |
|---|---|---|
| 78 | 125 | no |
| 79 | 282 | no |
| 80 | 441 | yes, $21^2$ |

So $5959 = (80 - 21)(80 + 21) = 59 \cdot 101$.

The method finds the factors after about $(\sqrt q - \sqrt p)^2 / 2$ steps, so it
is fast exactly when $p$ and $q$ are **close together**, and very slow
otherwise. Trial division is fast when one factor is small; Fermat's method when
the two are close. A good RSA key avoids both: its primes are large and
independently random, so they are almost never close. FIPS 186-5, the US
standard for RSA key generation, requires $\lvert p - q \rvert > 2^{\,\text{bits}/2 -
100}$, so for 2,048-bit keys the primes must differ somewhere in their top 100
bits.

```python
from math import isqrt

def fermat_factor(n):
    a = isqrt(n)
    if a * a < n:
        a += 1
    tries = 0
    while True:
        b2 = a * a - n
        b = isqrt(b2)
        tries += 1
        if b * b == b2:
            return a - b, a + b, tries
        a += 1

print(fermat_factor(5959))
print(fermat_factor(200819))
```

```text
(59, 101, 3)
(409, 491, 2)
```

### How close is too close?

Fermat's method starts at $a = \lceil \sqrt n \rceil$ and stops at $a =
(p + q)/2$, so it takes about

$$\frac{p + q}{2} - \sqrt{pq} = \frac{(\sqrt q - \sqrt p)^2}{2} = \frac{(q - p)^2}{2(\sqrt q + \sqrt p)^2} \approx \frac{(q - p)^2}{8 \sqrt n}$$

steps. For a 2,048-bit modulus,
$\sqrt n \approx 2^{1024}$, so the count is about $(q - p)^2 / 2^{1027}$. If
$q - p < 2^{513}$ or so, the first $a$ succeeds; if $q - p \approx
2^{516.8}$, it takes about 100 steps; under the FIPS 186-5 rule $q - p >
2^{924}$, it takes at least $2^{821}$. This matches what Hanno Böck measured
(below): gaps up to about $2^{514}$ fall in the first step, and 100 steps
reliably factor gaps up to about $2^{517}$. Two random 1,024-bit primes come
within $2^{924}$ of each other with probability about $2^{-98}$, so only a
broken generator lands in the danger zone.

### Break it: printers with close primes

In March 2022, the security researcher Hanno Böck published the results of
running Fermat's method over large collections of public RSA keys. He found keys
in Canon and Fujifilm printers, and a few others, whose two primes were so close
that Fermat's method factored the 2,048-bit modulus almost instantly, sometimes
in its first step. The cause was a key generator in the SafeZone library from
Rambus that picked one random starting point and took the next two primes after
it. The bug is CVE-2022-26320. The mathematics in the code above, unchanged
except for larger numbers, is what broke them.

After the disclosure, certificate authorities began testing the keys they
certify: Let's Encrypt added a Fermat check in 2022, and the CA/Browser Forum's
ballot SC-59 (2023) put weak-key checks, including 100 rounds of Fermat's
method, into the rules for publicly trusted authorities. A device in Arcadia
City asking an authority on Earth for a certificate waits 6 to 44 minutes per
round trip, so a rejected key costs a whole extra exchange; running the same
Fermat rounds, and a gcd against known moduli, on Mars before sending costs
milliseconds.

!!! note "Life story: Fermat's factoring method"
    **Born:** 1643, in a letter by Pierre de Fermat, factoring 2,027,651,281 as
    44,021 × 46,061 · **Purpose:** to factor numbers whose two factors are near
    each other · **Helped:** it is the ancestor of the quadratic sieve (1981)
    and number field sieve (1990), which look for *congruences* $a^2 \equiv b^2
    \pmod n$ instead of equalities, and so work for any $n$ · **Status:** still
    used to test keys; it broke the close-prime keys of CVE-2022-26320 in 2022

### Pollard's p − 1: when the group order is smooth

In 1974 John Pollard, then at the research laboratories of the British Post
Office, published a method that needs neither a small factor nor two close
ones, but a factor $p$ for which $p - 1$ is smooth (§2.7), however large $p$
is. By Fermat's little theorem ([Chapter 4](04-Powers-and-Primitive-Roots.md)),
$a^{p-1} \equiv 1 \pmod p$ when $p \nmid a$, so $a^M \equiv 1 \pmod p$ for
every multiple $M$ of $p - 1$. We do not know $p - 1$, but if it is built from
prime powers no larger than $B$, it divides

$$M = \operatorname{lcm}(1, 2, \ldots, B) = \prod_{\ell \leq B \text{ prime}} \ell^{\lfloor \log_\ell B \rfloor},$$

which anyone can compute. Then $p$ divides both $a^M - 1$ and $n$, hence
$\gcd(a^M - 1, n)$, and the power is taken modulo $n$.

In the language of groups ([Chapter 7](07-Groups.md)): the units modulo $p$
form a group of order $p - 1$, and $a^M \equiv 1 \pmod p$ exactly when the
order of $a$ divides $M$. By Lagrange's theorem that order divides $p - 1$. The
method succeeds when the order of $a$ modulo $p$ divides $M$ and the order
modulo $q$ does not; if both do, the gcd is $n$, and a smaller $B$ or more
frequent gcds separate them.

*By hand.* Factor $n = 41087$ with $a = 2$, $B = 10$, so $M = 2^3 \cdot 3^2
\cdot 5 \cdot 7$, raising to one prime power at a time. The last two columns
are hidden from the factorer:

| step | exponent so far | $a \bmod 41087$ | $\gcd(a - 1, n)$ | $a \bmod 181$ | $a \bmod 227$ |
|---|---|---|---|---|---|
| $a \to a^8$ | 8 | 256 | 1 | 75 | 29 |
| $a \to a^9$ | 72 | 20495 | 1 | 42 | 65 |
| $a \to a^5$ | 360 | 24617 | **181** | 1 | 101 |

The order of 2 modulo 181 is $180 = 2^2 \cdot 3^2 \cdot 5$, which divides 360;
modulo 227 it is $226 = 2 \cdot 113$, out of reach. So $41087 = 181 \cdot
227$, after three powers and three gcds, and it would have been the same three
steps if 181 had been a 300-digit prime with an equally smooth $p - 1$.

```python
import random
from math import gcd, prod

def small_primes(B):
    return [l for l in range(2, B + 1) if all(l % d for d in range(2, int(l ** 0.5) + 1))]

def pollard_pm1(n, B, a=2, show=False):
    """Raise a to each prime power l^k <= B in turn; stop when gcd(a - 1, n) > 1."""
    for l in small_primes(B):
        lk = l
        while lk * l <= B:                    # the largest power of l that is at most B
            lk *= l
        a = pow(a, lk, n)
        g = gcd(a - 1, n)
        if show:
            print(f"  ^{lk:<3} a = {a:<6} gcd = {g}")
        if g > 1:
            return g
    return 1

print(pollard_pm1(41087, 10, show=True))      # 41087 = 181 * 227, and 180 = 2^2 * 3^2 * 5

def probable_prime(m):                        # Fermat test to five bases: fine for random numbers
    return all(pow(b, m - 1, m) == 1 for b in (2, 3, 5, 7, 11))

rng = random.Random(1974)
ps = small_primes(1000)
while True:                                   # a prime p with p - 1 built from primes below 1000
    parts = sorted(rng.sample(ps, 14))
    k = 2 * prod(parts)
    if 2**120 < k < 2**136 and probable_prime(k + 1):
        p = k + 1
        break
while True:                                   # a safe prime q = 2r + 1, r prime: q - 1 is not smooth
    r = rng.getrandbits(127) | 1 << 126 | 1
    if probable_prime(r) and probable_prime(2 * r + 1):
        q = 2 * r + 1
        break
n = p * q
print(p, "= 2 *", " * ".join(map(str, parts)), "+ 1")
print(n.bit_length(), p.bit_length(), q.bit_length())
print(pollard_pm1(n, 1000) == p)
```

It prints:

```text
  ^8   a = 256    gcd = 1
  ^9   a = 20495  gcd = 1
  ^5   a = 24617  gcd = 181
181
32487363772142648523347688467208143507 = 2 * 73 * 113 * 311 * 359 * 467 * 491 * 601 * 617 * 631 * 683 * 709 * 719 * 947 * 997 + 1
253 125 128
True
```

The 253-bit $n$ falls to about 1,400 modular squarings. Trial division would
need about $2^{118}$ divisions to reach the 125-bit $p$, and rho (below) about
$2^{62}$ steps. The other prime is a **safe prime**, $q - 1 = 2r$ with $r$
prime, which no feasible bound reaches.

The method uses one group, of order $p - 1$. Hugh
Williams's $p + 1$ method (1982) adds a group of order $p + 1$, and Hendrik
Lenstra's elliptic curve method (1985) uses curve groups modulo $p$, whose
orders vary over $[p + 1 - 2\sqrt p,\ p + 1 + 2\sqrt p]$ from curve to curve;
each curve is a fresh chance of a smooth order, and no choice of $p$ makes them
all bad. *Cryptanalysis*
[§11.5](../cryptanalysis/11-Factoring.md#115-smooth-numbers-and-pollards-p1)
and [§11.6](../cryptanalysis/11-Factoring.md#116-the-elliptic-curve-method)
run both at full strength.

### Pollard's rho: a walk that must repeat

In 1975 Pollard published a second method, which finds any prime factor $p$ in
about $\sqrt p$ steps, whatever its form, with almost no memory. Its engine is
a fact about functions on finite sets.

**Every walk on a finite set ends in a cycle.** Let $f$ map a finite set $S$ to
itself and set $x_{i+1} = f(x_i)$. Among $x_0, \ldots, x_{\lvert S \rvert}$ two
are equal (pigeonhole). Let $x_\mu$ be the first value that recurs and
$x_{\mu + \lambda}$ its first repeat; since each value determines the next, the
walk then circles the same $\lambda$ values forever. A **tail** of $\mu$ steps
into a **cycle** of length $\lambda$: the letter $\rho$ (Figure 2.6). If $f$
behaves like a random function on $p$ elements, the chance that $x_0, \ldots,
x_{k-1}$ are all different is $\prod_{j<k} (1 - j/p) \approx e^{-k^2/2p}$, the
birthday calculation, and the expected $\mu + \lambda$ is $\sqrt{\pi p / 2}
\approx 1.25 \sqrt p$.

**The walk modulo a hidden prime.** Take $f(x) = x^2 + 1 \bmod n$ with $n =
pq$. Because $f(x) \bmod p$ depends only on $x \bmod p$, the walk modulo $n$
casts a *shadow* walk modulo $p$ on only $p$ values, which cycles after about
$\sqrt p$ steps. When the shadow repeats, $x_i \equiv x_j \pmod p$, so
$\gcd(x_i - x_j, n)$ reveals $p$ though nobody knows it. The shadow modulo $q$
usually repeats at a different time, so the gcd is rarely all of $n$.

**Lemma (Floyd).** For $i \geq 1$, $x_i = x_{2i}$ if and only if $i \geq \mu$
and $\lambda \mid i$. So comparing a tortoise at $x_i$ with a hare at $x_{2i}$
finds a repeat at the first multiple of $\lambda$ that is at least $\mu$, which
is at most $\mu + \lambda$, storing nothing.

*Proof.* If $i < \mu$, $x_i$ is on the tail and never recurs, so $x_{2i} \ne
x_i$. If $i \geq \mu$, both are on the cycle, $i$ steps apart, and $i$ steps
round a cycle of length $\lambda$ return to the start exactly when $\lambda
\mid i$. Among $\mu, \ldots, \mu + \lambda - 1$ one number is a multiple of
$\lambda$ (take $\lambda$ itself if $\mu = 0$). $\blacksquare$

*By hand.* Factor $n = 8549$ with $x_0 = 2$. Each round the tortoise takes one
step, the hare two; the last two columns are the hidden shadow modulo 83:

| round $i$ | $x_i$ | $x_{2i}$ | $\gcd(x_i - x_{2i},\ 8549)$ | $x_i \bmod 83$ | $x_{2i} \bmod 83$ |
|---|---|---|---|---|---|
| 1 | 5 | 26 | 1 | 5 | 26 |
| 2 | 26 | 5233 | 1 | 26 | 4 |
| 3 | 677 | 2697 | 1 | 13 | 41 |
| 4 | 5233 | 5797 | 1 | 4 | 70 |
| 5 | 1843 | 5578 | **83** | 17 | 17 |

In round 5, $1843 - 5578 = -3735 = -45 \cdot 83$, so $8549 = 83 \cdot 103$.
Modulo 83 the walk is $2, 5, 26, 13$, then the cycle $4, 17, 41, 22, 70$:
$\mu = 4$, $\lambda = 5$, and Floyd's lemma predicts round 5. Modulo 103 the
tail is 3 and the cycle 14, so that shadow would not meet until round 14.

<figure class="mars-fig">
<svg viewBox="0 0 640 350" width="640" role="img" aria-label="The walk x to x squared plus 1 modulo 83 from 2: a tail 2, 5, 26, 13 leads into the cycle 4, 17, 41, 22, 70 and back to 4; the tortoise and hare meet on 17" fill="currentColor" font-size="14">
<defs><marker id="f2rho-ar" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
<text x="20" y="24" font-weight="bold">x mod 83 for x → x² + 1, starting at 2 (n = 8549 = 83 × 103)</text>
<line x1="91.0" y1="165.0" x2="127.0" y2="165.0" stroke="currentColor" stroke-width="1.4" marker-end="url(#f2rho-ar)"/>
<line x1="171.0" y1="165.0" x2="207.0" y2="165.0" stroke="currentColor" stroke-width="1.4" marker-end="url(#f2rho-ar)"/>
<line x1="251.0" y1="165.0" x2="287.0" y2="165.0" stroke="currentColor" stroke-width="1.4" marker-end="url(#f2rho-ar)"/>
<line x1="331.0" y1="165.0" x2="369.0" y2="165.0" stroke="currentColor" stroke-width="1.4" marker-end="url(#f2rho-ar)"/>
<line x1="404.3" y1="182.0" x2="439.3" y2="230.1" stroke="currentColor" stroke-width="1.4" marker-end="url(#f2rho-ar)"/>
<line x1="472.8" y1="242.2" x2="529.3" y2="223.8" stroke="currentColor" stroke-width="1.4" marker-end="url(#f2rho-ar)"/>
<line x1="551.2" y1="195.7" x2="551.2" y2="136.3" stroke="currentColor" stroke-width="1.4" marker-end="url(#f2rho-ar)"/>
<line x1="531.2" y1="106.8" x2="474.7" y2="88.4" stroke="currentColor" stroke-width="1.4" marker-end="url(#f2rho-ar)"/>
<line x1="440.5" y1="98.3" x2="405.5" y2="146.4" stroke="currentColor" stroke-width="1.4" marker-end="url(#f2rho-ar)"/>
<circle cx="392.0" cy="165.0" r="20" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="392.0" y="170.0" text-anchor="middle">4</text>
<text x="386.0" y="205.0" text-anchor="middle" font-size="12">x₄, x₉</text>
<circle cx="452.8" cy="248.7" r="20" fill="none" stroke="currentColor" stroke-width="2.6"/>
<text x="452.8" y="253.7" text-anchor="middle">17</text>
<text x="439.8" y="292.6" text-anchor="middle" font-size="12">x₅, x₁₀</text>
<circle cx="551.2" cy="216.7" r="20" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="551.2" y="221.7" text-anchor="middle">41</text>
<text x="585.2" y="245.4" text-anchor="middle" font-size="12">x₆</text>
<circle cx="551.2" cy="113.3" r="20" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="551.2" y="118.3" text-anchor="middle">22</text>
<text x="585.2" y="92.6" text-anchor="middle" font-size="12">x₇</text>
<circle cx="452.8" cy="81.3" r="20" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="452.8" y="86.3" text-anchor="middle">70</text>
<text x="439.8" y="45.4" text-anchor="middle" font-size="12">x₈</text>
<circle cx="70.0" cy="165.0" r="20" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="70.0" y="170.0" text-anchor="middle">2</text>
<text x="70.0" y="205.0" text-anchor="middle" font-size="12">x₀</text>
<circle cx="150.0" cy="165.0" r="20" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="150.0" y="170.0" text-anchor="middle">5</text>
<text x="150.0" y="205.0" text-anchor="middle" font-size="12">x₁</text>
<circle cx="230.0" cy="165.0" r="20" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="230.0" y="170.0" text-anchor="middle">26</text>
<text x="230.0" y="205.0" text-anchor="middle" font-size="12">x₂</text>
<circle cx="310.0" cy="165.0" r="20" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="310.0" y="170.0" text-anchor="middle">13</text>
<text x="310.0" y="205.0" text-anchor="middle" font-size="12">x₃</text>
<text x="20" y="320" font-size="13">tail μ = 4, cycle λ = 5. Floyd meets at the first multiple of λ that is at least μ: round 5,</text>
<text x="20" y="340" font-size="13">where x₅ = 1843 and x₁₀ = 5578 are both 17 mod 83, and gcd(1843 − 5578, 8549) = 83.</text>
</svg>
<figcaption>Figure 2.6. The shadow of Pollard's rho walk modulo the hidden factor 83 of 8549. Four tail values lead into a cycle of five; the tortoise (at x₅) and the hare (at x₁₀) first meet on 17, and the gcd of their difference with n exposes 83.</figcaption>
</figure>

```python
from math import gcd, isqrt, sqrt

def rho(n, c=1, x0=2):
    """Pollard's rho with Floyd's tortoise and hare. Returns (gcd found, rounds)."""
    x = y = x0
    rounds = 0
    while True:
        x = (x * x + c) % n                    # the tortoise takes one step
        y = (y * y + c) % n                    # the hare takes two
        y = (y * y + c) % n
        rounds += 1
        g = gcd(x - y, n)
        if g > 1:
            return g, rounds

print(rho(8549))                               # 83 * 103
print(rho(8509), rho(8509, c=2))               # 67 * 127: with c = 1 both primes collide in round 8

# Rounds needed modulo a prime p: run rho with n = p itself, so that the gcd
# is p exactly when the two walkers meet. Average over 300 primes above 10^7.
def is_prime(m):
    return m > 1 and all(m % d for d in range(2, isqrt(m) + 1))

ratios, p = [], 10**7 + 1
while len(ratios) < 300:
    p += 2
    if is_prime(p):
        ratios.append(rho(p)[1] / sqrt(p))
print(round(sum(ratios) / len(ratios), 3))
```

It prints:

```text
(83, 5)
(8509, 8) (127, 6)
1.03
```

For $8509 = 67 \cdot 127$ the two shadows happen to have the same tail and
cycle (8 and 2), both primes divide $x_8 - x_{16}$, and the gcd is $n$; with
$x^2 + 2$ instead, 127 appears in round 6. On primes near $10^7$ the walkers
meet after about $1.03 \sqrt p$ rounds on average, a little under the expected
$\mu + \lambda$, as Floyd's lemma says they should, and in line with the
random-function model.

Nobody has proved that $x^2 + c$ behaves like a random function, so the
$\sqrt p$ running time is a heuristic that every experiment confirms ($c = 0$
and $c = -2$ are avoided as far too structured). And $\sqrt p$ is the limit:
about $2^{512}$ steps for a 1,024-bit prime, so rho is useless against RSA
moduli and excellent at stripping factors of 10 to 20 digits. The same
tortoise and hare compute discrete logarithms in square-root time, which is
why elliptic-curve groups need 256-bit orders for 128-bit security
([Chapter 4](04-Powers-and-Primitive-Roots.md#pollards-rho-with-floyds-cycle-finding)).
*Cryptanalysis* [§11.4](../cryptanalysis/11-Factoring.md#114-pollards-rho)
adds Brent's faster cycle finding.

### What comes next

Fermat's insight, *find two squares that differ by a multiple of $n$*, is the
seed of every fast factoring algorithm. If $a^2 \equiv b^2 \pmod n$ but $a
\not\equiv \pm b$, then $n$ divides $(a - b)(a + b)$ without dividing either
factor, so $\gcd(a - b, n)$ is a proper factor of $n$.
[Chapter 5](05-Square-Roots-Mod-p.md#square-roots-are-as-hard-as-factoring)
proves this carefully, because it also shows why taking square roots modulo
$n$ is as hard as factoring. The quadratic sieve and the number field sieve are
machines for manufacturing such congruences out of smooth numbers. §2.11 builds
a quadratic sieve in miniature on a seven-digit number; *Cryptanalysis*,
[Chapter 11](../cryptanalysis/11-Factoring.md#117-congruent-squares-and-the-quadratic-sieve-by-hand),
builds the full machines.

## 2.10 In the real world

*Level: intermediate.*

**The factoring records.** The RSA challenge numbers track the state of the
art. Milestones for numbers with no special form, with costs in the units each
team reported:

| Date | Number | Bits | Method | Reported cost |
|---|---|---|---|---|
| April 1994 | RSA-129 | 426 | quadratic sieve | about 5,000 MIPS-years |
| August 1999 | RSA-155 | 512 | number field sieve | about 8,000 MIPS-years |
| December 2009 | RSA-768 | 768 | number field sieve | about 2,000 core-years |
| December 2019 | RSA-240 | 795 | number field sieve | about 900 core-years |
| February 2020 | RSA-250 | 829 | number field sieve | about 2,700 core-years |
| September 2026 | RSA-260 | 862 | number field sieve on GPUs | about 13.5 GPU-years |
| September 2026 | RSA-896 | 896 | number field sieve on GPUs | about 30 GPU-years |

RSA-155 ended 512-bit RSA. RSA-768 fell to Thorsten Kleinjung and twelve
colleagues. RSA-250 was factored on 28 February 2020 by Fabrice Boudot,
Pierrick Gaudry, Aurore Guillevic, Nadia Heninger, Emmanuel Thomé and Paul
Zimmermann with the CADO-NFS software, 2,700 years of one processor core spread
over many machines, and it held the record for six and a half years. In
September 2026 two separate teams ported the same algorithm to graphics
processors: RSA-260 fell on 3 September and the 270-digit RSA-896 on 19
September, on up to 2,048 GPUs. As of November 2026 both results come from the
factorers' own announcements, with published factors that multiply to the
challenge numbers; neither used a new algorithm. No 1,024-bit RSA modulus is
publicly known to have been factored as of November 2026. The number field
sieve's running time $L_N[1/3, (64/9)^{1/3}]$ (§2.11), with the $o(1)$
ignored, puts 1,024 bits about 30 times beyond RSA-896 and 2,048 bits about
$3 \times 10^{10}$ times. *Cryptanalysis*
[§11.10](../cryptanalysis/11-Factoring.md#1110-the-records-and-what-they-mean-for-2048-bit-keys)
tells the stories of the records.

**Strong primes, then and now.** Pollard's $p - 1$ method (§2.9) led standards
of the 1980s and 1990s, such as ANSI X9.31, to require **strong primes**: $p -
1$ and $p + 1$ must each have a large prime factor, built in deliberately.
Smooth-number counting (§2.7) shows why this is no longer needed: for a random
1,024-bit prime, the chance that $p - 1$ is $2^{64}$-smooth, far beyond any
feasible bound, is about $\rho(16) \approx 10^{-21}$, and against the elliptic
curve method no form of $p$ helps at all. Ron Rivest and Robert Silverman made
this case in 1999, and it is now the consensus; FIPS 186-5 still describes
primes with conditions on $p \pm 1$, but random primes of the sizes it allows
are safe without them. The real danger runs the other way: a generator that
builds $p$ as one plus a product of small primes hands the key to $p - 1$, as
in the 253-bit example of §2.9.

**Shared primes.** In 2012 two teams independently collected millions of RSA
public keys from the internet and computed gcds between them. Arjen Lenstra and
colleagues ("Ron was wrong, Whit is right") and Nadia Heninger, Zakir Durumeric,
Eric Wustrow and J. Alex Halderman ("Mining Your Ps and Qs") found tens of
thousands of keys sharing a prime with another key, each one instantly factored
by a single gcd. Heninger's team could factor the keys of about 0.5 percent of
the HTTPS hosts they scanned. Most were in embedded devices (routers, firewalls)
that generated keys right after booting, before their random number generators
had gathered any randomness, so different devices picked the same first prime.
Computing all pairwise gcds of millions of numbers directly would be slow; they
used a **product tree** and **remainder tree** (Daniel Bernstein's batch gcd)
that does all of them in nearly linear time. Euclid's algorithm, 2,300 years
old, broke more real keys that year than the number field sieve ever has.

**Taiwan's citizen cards.** In 2013 Daniel Bernstein, Yun-An Chang, Chen-Mou
Cheng, Li-Ping Chou, Nadia Heninger, Tanja Lange and Nicko van Someren factored
184 of the 1,024-bit RSA keys on Taiwan's government-issued smart cards. Some
shared primes (a gcd), and others had primes with long repeated bit patterns
that the team guessed and then confirmed, the result of a faulty hardware
random number generator.

## 2.11 Going deeper

*Level: expert.*

**Faster gcds.** The **binary gcd** (Josef Stein, 1967) replaces division by
shifts and subtraction, using $\gcd(2a, 2b) = 2\gcd(a, b)$ and $\gcd(2a, b) =
\gcd(a, b)$ for odd $b$; it suits hardware and is the basis of constant-time
inversion. Bernstein and Bo-Yin Yang's "safegcd" (2019) gives a fast
constant-time version now used in libsecp256k1 and in some post-quantum
implementations. For huge numbers, the **half-gcd** algorithm of Knuth (1971) and
Schönhage computes gcds in $O(M(n) \log n)$, where $M(n)$ is the cost of
multiplication.

**Factoring complexity in $L$-notation.** Subexponential running times are
written $L_N[\alpha, c] = \exp\left((c + o(1)) (\ln N)^\alpha (\ln \ln
N)^{1-\alpha}\right)$. With $\alpha = 0$ this is polynomial in $\ln N$; with
$\alpha = 1$ it is exponential. The quadratic sieve runs in $L_N[1/2, 1]$, the
elliptic curve method finds a factor $p$ in $L_p[1/2, \sqrt 2]$, and the general
number field sieve in $L_N[1/3, (64/9)^{1/3}]$. Whether factoring can be done in
polynomial time on an ordinary computer is open; on a quantum computer it can
(Chapter 20).

**Smooth numbers.** The sieves work by finding many smooth numbers (§2.7), and
their running times come from the Canfield-Erdős-Pomerance theorem (1983),
which estimates the chance that a random number up to $x$ is $x^{1/u}$-smooth
as $u^{-u(1 + o(1))}$. Choosing the smoothness bound to balance that chance
against the number of relations needed is what produces the shape of every
$L$-function above; the miniature sieve below shows the pieces.

**Unique factorization in other rings.** Rings where Euclid's algorithm works,
the **Euclidean domains**, all have unique factorization: the Gaussian integers
$a + bi$, polynomials over a field (Chapter 8). Rings like $\mathbb{Z}[\sqrt{-5}]$
lose it, and the **class group** measures how badly. Class groups of imaginary
quadratic fields have been proposed as groups of unknown order for
cryptography (Buchmann and Williams, 1988; more recently for verifiable delay
functions), because nobody knows how to compute their size quickly.

### The quadratic sieve in miniature

In the 1920s Maurice Kraitchik saw that Fermat's exact $a^2 - n = b^2$ is more
than needed: any $X^2 \equiv Y^2 \pmod n$ with $X \not\equiv \pm Y$ gives the
factor $\gcd(X - Y, n)$ (§2.9), and such a pair can be assembled from pieces.
For $x$ just above $\sqrt n$, $Q(x) = x^2 - n$ is small and $x^2 \equiv Q(x)
\pmod n$. One $Q(x)$ is rarely a square, but if a product of several is a
square $Y^2$, the product $X$ of their $x$ values satisfies $X^2 \equiv Y^2$.
Carl Pomerance's **quadratic sieve** (1981) does this in five steps, each a
piece of mathematics from this book.

1. **Factor base.** If $p \mid Q(x)$ then $x^2 \equiv n \pmod p$, so $n$ is a
   square modulo $p$. About half of all primes fail this and never divide any
   $Q(x)$. The **factor base** is 2 and the primes $p \leq B$ with
   $\left(\frac{n}{p}\right) = 1$ ([Chapter 5](05-Square-Roots-Mod-p.md)).
2. **Sieve.** If $t^2 \equiv n \pmod p$, then $p$ divides $Q(x)$ for *every* $x
   \equiv t \pmod p$. So step through the list by $p$ from the first such $x$,
   dividing out $p$, exactly like Eratosthenes crossing out multiples. Entries
   divided down to 1 are smooth.
3. **Exponent vectors.** Each smooth $Q(x) = \prod p_j^{e_j}$ gives $(e_1,
   \ldots, e_k)$. A product is a square exactly when the summed exponents are
   even, so only the vectors modulo 2 matter.
4. **Linear algebra.** Find vectors summing to zero modulo 2 by Gaussian
   elimination over the field of two elements ([Chapter 9](09-Linear-Algebra.md)).
   Any $k + 1$ vectors in a space of dimension $k$ are dependent, so $k + 1$
   smooth values guarantee a dependency.
5. **gcd.** $X = \prod x \bmod n$, $Y = \sqrt{\prod Q(x)} \bmod n$ (halve the
   summed exponents), and $\gcd(X - Y, n)$.

**Why it works half the time.** For $n = pq$ a square has four square roots
modulo $n$, $\pm Y$ and two others
([Chapter 5](05-Square-Roots-Mod-p.md#square-roots-are-as-hard-as-factoring)).
Nothing in steps 1 to 4 prefers one root, so heuristically each dependency
gives a factor with probability $\frac12$, and $d$ dependencies all fail with
probability about $2^{-d}$.

*In code, with every step printed*, for $n = 6{,}669{,}713$, $B = 50$, and 120
values of $x$ from $\lceil \sqrt n \rceil = 2583$:

```python
from math import gcd, isqrt, prod

def qs_toy(n, B, M):
    # 1. Factor base: the primes p <= B for which n is a square mod p.
    fb = [p for p in range(2, B + 1) if all(p % d for d in range(2, isqrt(p) + 1))
          and any((t * t - n) % p == 0 for t in range(p))]
    m = isqrt(n) + 1
    print("factor base", fb, " start x =", m)
    # 2. Sieve: if t^2 = n (mod p), p divides Q(x) = x^2 - n at every x = t (mod p).
    left = [(m + i) ** 2 - n for i in range(M)]
    for p in fb:
        for t in range(p):
            if (t * t - n) % p == 0:
                for i in range((t - m) % p, M, p):
                    while left[i] % p == 0:
                        left[i] //= p
    xs = [m + i for i in range(M) if left[i] == 1]       # Q(x) split completely over fb
    # 3. Exponent vectors, and their parities as bits of an integer.
    bits = []
    for x in xs:
        q, e = x * x - n, []
        for p in fb:
            k = 0
            while q % p == 0:
                q, k = q // p, k + 1
            e.append(k)
        bits.append(sum((k % 2) << j for j, k in enumerate(e)))
        print(f"  x = {x}  Q(x) = {x * x - n:>6}  exponents {e}")
    # 4. Gaussian elimination mod 2; 'used' records which relations make up each row.
    pivots = {}
    for i, v in enumerate(bits):
        used = 1 << i
        while v and v.bit_length() in pivots:
            pv, pu = pivots[v.bit_length()]
            v, used = v ^ pv, used ^ pu
        if v:
            pivots[v.bit_length()] = (v, used)
            continue
        # 5. v = 0: the relations in 'used' multiply to a square. Take X, Y and a gcd.
        S = [xs[k] for k in range(len(xs)) if used >> k & 1]
        X = prod(S) % n
        Y = isqrt(prod(x * x - n for x in S)) % n
        g = gcd(X - Y, n)
        print("  dependency", S, " X =", X, " Y =", Y, " gcd =", g)
        if 1 < g < n:
            return g

n = 6669713
p = qs_toy(n, 50, 120)
print(n, "=", p, "*", n // p)
```

It prints:

```text
factor base [2, 7, 17, 23, 31, 47]  start x = 2583
  x = 2583  Q(x) =   2176  exponents [7, 0, 1, 0, 0, 0]
  x = 2585  Q(x) =  12512  exponents [5, 0, 1, 1, 0, 0]
  x = 2617  Q(x) = 178976  exponents [5, 1, 1, 0, 0, 1]
  x = 2631  Q(x) = 252448  exponents [5, 3, 0, 1, 0, 0]
  x = 2636  Q(x) = 278783  exponents [0, 0, 1, 2, 1, 0]
  x = 2647  Q(x) = 336896  exponents [10, 1, 0, 0, 0, 1]
  x = 2687  Q(x) = 550256  exponents [4, 1, 3, 0, 0, 0]
  dependency [2583, 2617, 2647]  X = 4784751  Y = 4784751  gcd = 6669713
  dependency [2585, 2631, 2687]  X = 6305838  Y = 1671706  gcd = 2963
6669713 = 2963 * 2251
```

*Checking it by hand.* $n$ is a non-square modulo 3, 5, 11, 13, 19, 29, 37, 41
and 43, which leaves six primes, and only seven of the 120 values are smooth
(Figure 2.7 shows the first ten being sieved). For $x = 2585, 2631, 2687$,

$$(5, 0, 1, 1, 0, 0) + (5, 3, 0, 1, 0, 0) + (4, 1, 3, 0, 0, 0) = (14, 4, 4, 2, 0, 0),$$

all even, so $Y = 2^7 \cdot 7^2 \cdot 17^2 \cdot 23 = 41{,}689{,}984 \equiv
1{,}671{,}706$. With $X = 2585 \cdot 2631 \cdot 2687 \bmod n = 6{,}305{,}838$,
$X - Y = 4{,}634{,}132 = 1564 \cdot 2963$, so $6{,}669{,}713 = 2251 \cdot
2963$. The first dependency, $x = 2583, 2617, 2647$, was the unlucky case:
$Y = 2^{11} \cdot 7 \cdot 17 \cdot 47 \equiv 4{,}784{,}751$, which is $X$
itself. One failure, one success.

<figure class="mars-fig">
<svg viewBox="0 0 640 290" width="640" role="img" aria-label="Sieve table for n = 6669713, x from 2583 to 2592: for each prime of the factor base the power dividing Q(x) = x squared minus n is marked; only x = 2583 and x = 2585 are divided down to 1" fill="currentColor" font-size="12">
<rect x="100" y="14" width="52" height="216" fill-opacity="0.13"/>
<rect x="204" y="14" width="52" height="216" fill-opacity="0.13"/>
<text x="8" y="30" font-weight="bold">x</text>
<text x="8" y="54" font-weight="bold">Q(x)</text>
<line x1="8" y1="38" x2="620" y2="38" stroke="currentColor" stroke-opacity="0.4"/>
<text x="8" y="78" font-weight="normal">p = 2</text>
<line x1="8" y1="62" x2="620" y2="62" stroke="currentColor" stroke-opacity="0.4"/>
<text x="8" y="102" font-weight="normal">p = 7</text>
<text x="8" y="126" font-weight="normal">p = 17</text>
<text x="8" y="150" font-weight="normal">p = 23</text>
<text x="8" y="174" font-weight="normal">p = 31</text>
<text x="8" y="198" font-weight="normal">p = 47</text>
<text x="8" y="222" font-weight="normal">left over</text>
<line x1="8" y1="206" x2="620" y2="206" stroke="currentColor" stroke-opacity="0.4"/>
<text x="126" y="30" text-anchor="middle" font-weight="bold">2583</text>
<text x="126" y="54" text-anchor="middle">2176</text>
<text x="126" y="78" text-anchor="middle">2⁷</text>
<text x="126" y="126" text-anchor="middle">17</text>
<text x="126" y="222" text-anchor="middle" font-weight="bold">1</text>
<text x="178" y="30" text-anchor="middle" font-weight="bold">2584</text>
<text x="178" y="54" text-anchor="middle">7343</text>
<text x="178" y="102" text-anchor="middle">7</text>
<text x="178" y="222" text-anchor="middle" font-weight="normal">1049</text>
<text x="230" y="30" text-anchor="middle" font-weight="bold">2585</text>
<text x="230" y="54" text-anchor="middle">12512</text>
<text x="230" y="78" text-anchor="middle">2⁵</text>
<text x="230" y="126" text-anchor="middle">17</text>
<text x="230" y="150" text-anchor="middle">23</text>
<text x="230" y="222" text-anchor="middle" font-weight="bold">1</text>
<text x="282" y="30" text-anchor="middle" font-weight="bold">2586</text>
<text x="282" y="54" text-anchor="middle">17683</text>
<text x="282" y="222" text-anchor="middle" font-weight="normal">17683</text>
<text x="334" y="30" text-anchor="middle" font-weight="bold">2587</text>
<text x="334" y="54" text-anchor="middle">22856</text>
<text x="334" y="78" text-anchor="middle">2³</text>
<text x="334" y="222" text-anchor="middle" font-weight="normal">2857</text>
<text x="386" y="30" text-anchor="middle" font-weight="bold">2588</text>
<text x="386" y="54" text-anchor="middle">28031</text>
<text x="386" y="222" text-anchor="middle" font-weight="normal">28031</text>
<text x="438" y="30" text-anchor="middle" font-weight="bold">2589</text>
<text x="438" y="54" text-anchor="middle">33208</text>
<text x="438" y="78" text-anchor="middle">2³</text>
<text x="438" y="102" text-anchor="middle">7</text>
<text x="438" y="222" text-anchor="middle" font-weight="normal">593</text>
<text x="490" y="30" text-anchor="middle" font-weight="bold">2590</text>
<text x="490" y="54" text-anchor="middle">38387</text>
<text x="490" y="150" text-anchor="middle">23</text>
<text x="490" y="222" text-anchor="middle" font-weight="normal">1669</text>
<text x="542" y="30" text-anchor="middle" font-weight="bold">2591</text>
<text x="542" y="54" text-anchor="middle">43568</text>
<text x="542" y="78" text-anchor="middle">2⁴</text>
<text x="542" y="102" text-anchor="middle">7</text>
<text x="542" y="222" text-anchor="middle" font-weight="normal">389</text>
<text x="594" y="30" text-anchor="middle" font-weight="bold">2592</text>
<text x="594" y="54" text-anchor="middle">48751</text>
<text x="594" y="222" text-anchor="middle" font-weight="normal">48751</text>
<text x="8" y="260" font-size="13">2 hits every odd x; 7 hits x ≡ 1, 6 (mod 7); 17 hits x ≡ 1, 16 (mod 17); 23 hits x ≡ 9, 14 (mod 23).</text>
<text x="8" y="278" font-size="13">31 and 47 first hit at x = 2603 and x = 2600, beyond this strip. Shaded: smooth, kept.</text>
</svg>
<figcaption>Figure 2.7. Sieving n = 6,669,713 over its first ten values of x. Each odd prime of the factor base strikes Q(x) = x² − n at two residues modulo p (2 strikes every odd x), so its marks repeat with period p; dividing out the powers it strikes leaves 1 exactly at the smooth values, x = 2583 and 2585 (shaded).</figcaption>
</figure>

At real sizes the steps run with millions of primes, logarithms instead of
divisions, and sparse linear algebra. Balancing $B$ against the smooth-number
estimate of §2.7 for numbers near $\sqrt n$ gives the running time
$L_n[1/2, 1]$. The quadratic sieve factored RSA-129 and
is still the fastest method for general numbers below about 100 digits; above
that the number field sieve takes over. *Cryptanalysis*
[§11.7](../cryptanalysis/11-Factoring.md#117-congruent-squares-and-the-quadratic-sieve-by-hand)
and [§11.9](../cryptanalysis/11-Factoring.md#119-the-number-field-sieve) build
both at full strength.

## Check yourself

??? question "1. Find $q$ and $r$ for $a = -100$, $b = 7$, following the division theorem. What does C's `-100 % 7` give?"

    $-100 = -15 \cdot 7 + 5$, so $q = -15$, $r = 5$. C rounds toward zero:
    $-100 / 7 = -14$ and $-100 \% 7 = -2$.

??? question "2. Find integers $x, y$ with $35x + 22y = 1$, and use them to give the inverse of 35 modulo 22."

    $35 = 1 \cdot 22 + 13$, $22 = 1 \cdot 13 + 9$, $13 = 1 \cdot 9 + 4$, $9 =
    2 \cdot 4 + 1$. Back-substituting gives $1 = 35 \cdot (-5) + 22 \cdot 8$.
    Check: $-175 + 176 = 1$. Mod 22, $35 \cdot (-5) \equiv 1$, so the inverse
    of 35 (that is, of 13) is $-5 \equiv 17$. Check: $13 \cdot 17 = 221 = 10
    \cdot 22 + 1$.

??? question "3. Where does the proof of Euclid's lemma use that $p$ is prime? Give a counterexample for composite $p$."

    In "$p \nmid a$, so $\gcd(a, p) = 1$". For composite $p$ the gcd could be a
    proper divisor. Counterexample: $4 \mid 2 \cdot 6$ but $4 \nmid 2$ and $4
    \nmid 6$.

??? question "4. About how many primes are there with exactly 2,048 bits?"

    About $2^{2047} / (2048 \ln 2) \approx 2^{2047}/1420 \approx 2^{2036.5}$.

??? question "5. Show that about 30.7 percent of the numbers up to $10^{12}$ have no prime factor above $10^6$."

    A number $m \leq x$ that is not $\sqrt x$-smooth has exactly one prime
    factor $p > \sqrt x$, so the non-smooth count is about $\sum_{\sqrt x < p
    \leq x} x/p \approx x(\ln \ln x - \ln \ln \sqrt x) = x \ln 2$ by Mertens'
    theorem. With $x = 10^{12}$, $\sqrt x = 10^6$, the smooth share is about $1 -
    \ln 2 \approx 0.307$, which is $\rho(2)$. (At this finite size the true
    share is a little higher.)

??? question "6. Factor 10,403 with Fermat's method."

    $\sqrt{10403} \approx 101.99$, so start at $a = 102$: $102^2 - 10403 = 1 =
    1^2$. So $10403 = 101 \cdot 103$, found in one step.

??? question "7. Run Pollard's $p - 1$ by hand on $n = 1457$ with $a = 2$ and $M = 60$. Which factor appears, and why not the other one?"

    $1457 = 31 \cdot 47$. The order of 2 modulo 31 is 5 (since $2^5 = 32
    \equiv 1$), which divides 60, so $2^{60} \equiv 1 \pmod{31}$. Modulo 47
    the order of 2 divides $46 = 2 \cdot 23$ and is in fact 23, which does not
    divide 60. So $\gcd(2^{60} - 1, 1457) = 31$. The method needs the order of
    $a$ modulo $p$ to divide $M$; a smooth $p - 1$ guarantees that, and $47 - 1$
    contains the prime 23.

??? question "8. A rho walk modulo $p$ has a tail of $\mu = 7$ steps and a cycle of $\lambda = 3$. In which round do Floyd's tortoise and hare first meet? What if the tail is empty?"

    By Floyd's lemma they meet at the smallest $i \geq 1$ with $i \geq \mu$ and
    $\lambda \mid i$: here $i = 9$, since 7 and 8 are not multiples of 3. With
    $\mu = 0$ the walk is a pure cycle and they meet at $i = \lambda = 3$. In
    every case $i \leq \mu + \lambda$.

??? question "9. In Wiener's attack the unknown fraction $k/d$ is close to $e/N$. Compute the continued fraction of $17993/90581$ and its first convergents. One of them has denominator 5. Why might that be interesting?"

    Euclid gives the terms $[0; 5, 29, 4, 1, 3, 2, 4, 3]$, and the convergents
    begin $0/1, 1/5, 29/146, \dots$. The second convergent, $1/5$, is the guess
    $k = 1$, $d = 5$. For $N = 90581 = 239 \cdot 379$ and $e = 17993$, it is
    right: $ed - 1 = 89964 = (239 - 1)(379 - 1)$, so $d = 5$ is the private
    exponent. *Cryptanalysis*, [Chapter 13](../cryptanalysis/13-Attacks-on-RSA.md), does the full attack.

??? question "10. In the quadratic sieve for $n = 6{,}669{,}713$, why can the prime 3 never divide $Q(x) = x^2 - n$? And why can the relation for $x = 2636$, with exponents $(0, 0, 1, 2, 1, 0)$, never be part of a dependency among the seven relations found?"

    $n \equiv 2 \pmod 3$, and squares modulo 3 are only 0 and 1, so $x^2
    \equiv n \pmod 3$ has no solution: $\left(\frac{n}{3}\right) = -1$. For
    $x = 2636$, the prime 31 appears with exponent 1, and no other relation
    contains 31; any product including it has an odd power of 31 and cannot be
    a square. Collecting more relations might bring another 31 and rescue it.

## What you learned

- Division with remainder gives a unique quotient and a non-negative remainder;
  languages that round toward zero disagree for negative numbers.
- Euclid's algorithm finds $\gcd(a, b)$ without factoring, because $\gcd(a, b)
  = \gcd(b, a \bmod b)$, in at most about $1.44 \log_2 b$ steps; Fibonacci
  numbers are the worst case.
- Bézout: $\gcd(a, b) = ax + by$ for integers found by the extended algorithm.
  This gives modular inverses and proves Euclid's lemma.
- Every integer factors uniquely into primes. The proof needs Euclid's lemma,
  and in number systems without Euclid's algorithm uniqueness can fail.
- Near $x$, about one number in $\ln x$ is prime; there are about $2^{1013.5}$
  primes of 1,024 bits. As a count, $\operatorname{li}(x)$ is far better than
  $x / \ln x$: off by 339 instead of 44,158 at ten million.
- About $\rho(u)$ of the numbers up to $x$ are $x^{1/u}$-smooth; Dickman's
  $\rho$ falls roughly like $u^{-u}$, which is why sieves shrink the numbers
  that must be smooth.
- Continued fractions, built from Euclid's quotients, give the best rational
  approximations, the tool behind Wiener's attack and Shor's algorithm.
- Trial division finds small factors and Fermat's method finds close ones,
  in about $(q - p)^2 / (8\sqrt n)$ steps. Real keys have been broken by both,
  and by a single gcd.
- Pollard's $p - 1$ succeeds when the order of $a$ modulo $p$ divides
  $\operatorname{lcm}(1, \ldots, B)$; random large primes are safe from it, so
  "strong primes" are no longer needed.
- Pollard's rho: every walk on a finite set ends in a cycle, after about
  $\sqrt p$ steps, and Floyd's tortoise and hare find it with no memory.
- The quadratic sieve sieves for smooth $x^2 - n$, finds a dependency mod 2,
  and gets a factor from a gcd about half the time.

**Next:** [Chapter 3](03-Modular-Arithmetic.md), arithmetic that wraps around:
the ring of integers modulo $n$.

## Further reading

- Euclid, *Elements*, Book VII (around 300 BC); the translation by Thomas Heath
  (1908) is free online.
- Donald Knuth, *The Art of Computer Programming*, Volume 2: *Seminumerical
  Algorithms*, 3rd edition (Addison-Wesley, 1997), §4.5.2 and §4.5.3 on Euclid's
  algorithm and its analysis.
- G. H. Hardy and E. M. Wright, *An Introduction to the Theory of Numbers*, 6th
  edition (Oxford, 2008): the classic text.
- Victor Shoup, *A Computational Introduction to Number Theory and Algebra*, 2nd
  edition (Cambridge, 2009; free online): number theory written for
  cryptographers, the closest companion to this book.
- Derek Atkins, Michael Graff, Arjen Lenstra and Paul Leyland, "The Magic Words
  Are Squeamish Ossifrage" (ASIACRYPT 1994).
- Arjen Lenstra and others, "Ron was wrong, Whit is right" (Cryptology ePrint
  Archive 2012/064).
- Nadia Heninger, Zakir Durumeric, Eric Wustrow and J. Alex Halderman, "Mining
  Your Ps and Qs: Detection of Widespread Weak Keys in Network Devices" (USENIX
  Security 2012).
- Daniel Bernstein and others, "Factoring RSA keys from certified smart cards:
  Coppersmith in the wild" (ASIACRYPT 2013).
- [Hanno Böck, "Fermat Factorization in the Wild" (2022)](https://fermatattack.secvuln.info/), on CVE-2022-26320.
- Fabrice Boudot and others, "Comparing the difficulty of factorization and
  discrete logarithm: a 240-digit experiment" (CRYPTO 2020), and the RSA-250
  announcement of February 2020.
- FIPS 186-5, Digital Signature Standard (2023), Appendix A.1 on RSA key
  generation.
- John Pollard, "Theorems on factorization and primality testing",
  *Proceedings of the Cambridge Philosophical Society* 76 (1974): the $p - 1$
  method.
- John Pollard, "A Monte Carlo method for factorization", *BIT* 15 (1975): the
  rho method.
- Carl Pomerance, "A Tale of Two Sieves", *Notices of the AMS* 43 (1996): the
  quadratic sieve's story, told by its inventor.
- Karl Dickman, "On the frequency of numbers containing prime factors of a
  certain relative magnitude", *Arkiv för Matematik, Astronomi och Fysik* 22
  (1930).
- Earl Canfield, Paul Erdős and Carl Pomerance, "On a problem of Oppenheim
  concerning 'factorisatio numerorum'", *Journal of Number Theory* 17 (1983):
  the uniform smooth-number estimate.
- Carter Bays and Richard Hudson, "A new bound for the smallest $x$ with
  $\pi(x) > \operatorname{li}(x)$", *Mathematics of Computation* 69 (2000).
- Ron Rivest and Robert Silverman, "Are 'strong' primes needed for RSA?"
  (1999; Cryptology ePrint Archive 2001/007).
- Richard Crandall and Carl Pomerance, *Prime Numbers: A Computational
  Perspective*, 2nd edition (Springer, 2005).
- CA/Browser Forum, Ballot SC-59, "Weak Key Guidance" (2023).
- The September 2026 records, from the factorers' own posts:
  [Cognition, "Factoring RSA-260"](https://cognition.com/blog/factoring-rsa-260)
  and [Steve Weis, RSA-896 announcement](https://saweis.net/posts/rsa-896.html).
- Michael Wiener, "Cryptanalysis of Short RSA Secret Exponents", *IEEE
  Transactions on Information Theory* 36 (1990).
- In *The cryptography book*: [Chapter 3](../../book/03-The-Arithmetic-of-Secrets.md)
  and [Chapter 13](../../book/13-RSA.md).
