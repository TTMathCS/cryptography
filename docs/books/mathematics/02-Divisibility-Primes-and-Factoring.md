# 2. Divisibility, Primes and Factoring

*RSA's public key is a number that is the product of two secret primes. Its
security is a bet that nobody can find the primes again. This chapter studies
the ground under that bet: division with remainder, the greatest common divisor
and Euclid's algorithm (the oldest algorithm still in daily use), Bézout's
identity, the theorem that every number factors into primes in exactly one way,
how many primes there are, continued fractions, and the two simplest ways to
factor. You will prove that Euclid's algorithm is fast, count the primes below
ten million, and factor a printer's RSA key the way it was really done in
2022.*

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
    - trial division and Fermat's method, and why keys with close primes break.

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
this shelf, *Cryptanalysis*, runs them in its [Chapter 11](../cryptanalysis/11-Factoring.md). Here we build the
number theory they rest on and stop at the two simplest methods, which are
already enough to break badly made keys.

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
polynomials in 1779; the integer version was known to Claude Gaspard Bachet de
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

## 2.9 Factoring: the two simplest methods

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

### Break it: printers with close primes

In March 2022, the security researcher Hanno Böck published the results of
running Fermat's method over large collections of public RSA keys. He found keys
in Canon and Fujifilm printers, and a few others, whose two primes were so close
that Fermat's method factored the 2,048-bit modulus almost instantly, sometimes
in its first step. The cause was a key generator in the SafeZone library from
Rambus that picked one random starting point and took the next two primes after
it. The bug is CVE-2022-26320. The mathematics in the code above, unchanged
except for larger numbers, is what broke them.

!!! note "Life story: Fermat's factoring method"
    **Born:** 1643, in a letter by Pierre de Fermat, factoring 2,027,651,281 as
    44,021 × 46,061 · **Purpose:** to factor numbers whose two factors are near
    each other · **Helped:** it is the ancestor of the quadratic sieve (1981)
    and number field sieve (1990), which look for *congruences* $a^2 \equiv b^2
    \pmod n$ instead of equalities, and so work for any $n$ · **Status:** still
    used to test keys; it broke the close-prime keys of CVE-2022-26320 in 2022

### What comes next

Fermat's insight, *find two squares that differ by a multiple of $n$*, is the
seed of every fast factoring algorithm. If $a^2 \equiv b^2 \pmod n$ but $a
\not\equiv \pm b$, then $n$ divides $(a - b)(a + b)$ without dividing either
factor, so $\gcd(a - b, n)$ is a proper factor of $n$. Chapter 5 proves this
carefully, because it also shows why taking square roots modulo $n$ is as hard
as factoring. The quadratic sieve and the number field sieve are machines for
manufacturing such congruences; *Cryptanalysis*, [Chapter 11](../cryptanalysis/11-Factoring.md), builds them.

## 2.10 In the real world

*Level: intermediate.*

**The factoring records.** Public records for factoring RSA challenge numbers
track the state of the art. RSA-129 (426 bits) fell in 1994 with the quadratic
sieve; RSA-155 (512 bits) in 1999 with the number field sieve, which ended
512-bit RSA; RSA-768 (232 digits) in December 2009, by Thorsten Kleinjung and
colleagues, with about 2,000 core-years of computing; and RSA-250 (829 bits)
in February 2020, by Fabrice Boudot, Pierrick Gaudry, Aurore Guillevic, Nadia
Heninger, Emmanuel Thomé and Paul Zimmermann, with about 2,700 core-years. No
1,024-bit RSA modulus is publicly known to have been factored as of 2026.

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

**Smooth numbers.** A number is **$B$-smooth** if all its prime factors are at
most $B$. The sieves work by finding many smooth numbers, and their running times
come from the Canfield-Erdős-Pomerance theorem (1983), which estimates the chance
that a random number up to $x$ is $x^{1/u}$-smooth as about $u^{-u}$. This one
estimate explains the shape of every $L$-function above.

**Unique factorization in other rings.** Rings where Euclid's algorithm works,
the **Euclidean domains**, all have unique factorization: the Gaussian integers
$a + bi$, polynomials over a field (Chapter 8). Rings like $\mathbb{Z}[\sqrt{-5}]$
lose it, and the **class group** measures how badly. Class groups of imaginary
quadratic fields have been proposed as groups of unknown order for
cryptography (Buchmann and Williams, 1988; more recently for verifiable delay
functions), because nobody knows how to compute their size quickly.

## Check yourself

??? question "1. Find $q$ and $r$ for $a = -100$, $b = 7$, following the division theorem. What does C's `-100 % 7` give?"

    $-100 = -15 \cdot 7 + 5$, so $q = -15$, $r = 5$. C rounds toward zero:
    $-100 / 7 = -14$ and $-100 \% 7 = -2$.

??? question "2. Use Euclid's algorithm to find $\gcd(2026, 1105)$."

    $2026 = 1 \cdot 1105 + 921$; $1105 = 1 \cdot 921 + 184$; $921 = 5 \cdot 184
    + 1$; $184 = 184 \cdot 1 + 0$. The gcd is 1.

??? question "3. Find integers $x, y$ with $35x + 22y = 1$, and use them to give the inverse of 35 modulo 22."

    $35 = 1 \cdot 22 + 13$, $22 = 1 \cdot 13 + 9$, $13 = 1 \cdot 9 + 4$, $9 =
    2 \cdot 4 + 1$. Back-substituting gives $1 = 35 \cdot (-5) + 22 \cdot 8$.
    Check: $-175 + 176 = 1$. Mod 22, $35 \cdot (-5) \equiv 1$, so the inverse
    of 35 (that is, of 13) is $-5 \equiv 17$. Check: $13 \cdot 17 = 221 = 10
    \cdot 22 + 1$.

??? question "4. Where does the proof of Euclid's lemma use that $p$ is prime? Give a counterexample for composite $p$."

    In "$p \nmid a$, so $\gcd(a, p) = 1$". For composite $p$ the gcd could be a
    proper divisor. Counterexample: $4 \mid 2 \cdot 6$ but $4 \nmid 2$ and $4
    \nmid 6$.

??? question "5. Which pair of numbers below 100 makes Euclid's algorithm take the most steps?"

    Consecutive Fibonacci numbers: $(89, 55)$, which takes 9 steps.

??? question "6. About how many primes are there with exactly 2,048 bits?"

    About $2^{2047} / (2048 \ln 2) \approx 2^{2047}/1420 \approx 2^{2036.5}$.

??? question "7. Factor 10,403 with Fermat's method."

    $\sqrt{10403} \approx 101.99$, so start at $a = 102$: $102^2 - 10403 = 1 =
    1^2$. So $10403 = 101 \cdot 103$, found in one step.

??? question "8. Show that $\gcd(a, b) \cdot \operatorname{lcm}(a, b) = ab$ for positive $a, b$, using factorizations."

    For each prime, the gcd takes $\min(e, f)$ and the lcm $\max(e, f)$ of the
    exponents $e, f$ in $a$ and $b$. Since $\min(e, f) + \max(e, f) = e + f$,
    the product has exponent $e + f$, the same as $ab$.

??? question "9. In Wiener's attack the unknown fraction $k/d$ is close to $e/N$. Compute the continued fraction of $17993/90581$ and its first convergents. One of them has denominator 5. Why might that be interesting?"

    Euclid gives the terms $[0; 5, 29, 4, 1, 3, 2, 4, 3]$, and the convergents
    begin $0/1, 1/5, 29/146, \dots$. The second convergent, $1/5$, is the guess
    $k = 1$, $d = 5$. For $N = 90581 = 239 \cdot 379$ and $e = 17993$, it is
    right: $ed - 1 = 89964 = (239 - 1)(379 - 1)$, so $d = 5$ is the private
    exponent. *Cryptanalysis*, [Chapter 13](../cryptanalysis/13-Attacks-on-RSA.md), does the full attack.

??? question "10. Two RSA moduli $N_1, N_2$ share a prime $p$. How does an attacker find it, and how much work is it?"

    Compute $\gcd(N_1, N_2) = p$ with Euclid's algorithm, about $1.44 \times
    2048$ steps at most for 2,048-bit numbers: microseconds. Then $N_1 / p$ and
    $N_2 / p$ give the other primes.

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
  primes of 1,024 bits.
- Continued fractions, built from Euclid's quotients, give the best rational
  approximations, the tool behind Wiener's attack and Shor's algorithm.
- Trial division finds small factors and Fermat's method finds close ones.
  Real keys have been broken by both, and by a single gcd.

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
- Michael Wiener, "Cryptanalysis of Short RSA Secret Exponents", *IEEE
  Transactions on Information Theory* 36 (1990).
- In *The cryptography book*: [Chapter 3](../../book/03-The-Arithmetic-of-Secrets.md)
  and [Chapter 13](../../book/13-RSA.md).
