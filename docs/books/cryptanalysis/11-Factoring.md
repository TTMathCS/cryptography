# 11. Factoring

*RSA is safe exactly as long as nobody can split its modulus into its two
primes. This chapter is about the people and the methods that try. You will
start with the obvious method, trial division, and see why it stops at a few
dozen digits; then factor numbers by hand with Fermat's difference of squares,
Pollard's rho walk and Pollard's p−1; turn p−1 into the elliptic curve method;
run the quadratic sieve by hand on a five-digit number, with every relation and
the linear algebra mod 2 in one table, and then in code on a 23-digit number.
After that come the number field sieve, the method behind every record since
1996, the records themselves from RSA-129 to RSA-250, the special numbers that
fall faster, and what all of it means for a 2048-bit key today and for Shor's
algorithm tomorrow.*

!!! abstract "In this chapter"
    **You will learn:**

    - why factoring the modulus is the question that decides RSA, and how the
      cost of a method is measured in the size of the factor or of the number;
    - trial division, Fermat's method and why close primes are a disaster
      (with the 2022 printer keys);
    - Pollard's rho with Floyd's and Brent's cycle finding, worked by hand;
    - smooth numbers, Pollard's p−1, Williams' p+1 and the elliptic curve
      method, each coded;
    - the congruence of squares, and the quadratic sieve done by hand and in
      code, with the factor base, the sieve and Gaussian elimination mod 2;
    - the number field sieve in outline, the L-notation and the records
      (RSA-129, RSA-155, RSA-768, RSA-240, RSA-250, the kilobit SNFS);
    - what Shor's algorithm would change, and how far quantum factoring really
      is today.

    **You need:** RSA from book 1's [Chapter 13](../../book/13-RSA.md) (how the
    modulus is made and why knowing $p$ breaks it), modular arithmetic and gcd
    from [Chapter 3](../../book/03-The-Arithmetic-of-Secrets.md), elliptic curve
    point addition from [Chapter 15](../../book/15-Elliptic-Curves.md), and the
    birthday bound and the rho shape from this book's
    [Chapter 4](04-Brute-Force-Birthdays-and-Trade-offs.md).

    **Levels:** §11.1 to §11.4 are for beginners, §11.5 to §11.8 and §11.12 are
    intermediate, §11.9 to §11.11 and §11.13 are expert.

## 11.1 The problem

*Level: beginner.*

An RSA public key is a pair $(n, e)$. The modulus $n$ is the product of two
primes $p$ and $q$, each about half as long as $n$, and the private exponent $d$
is the inverse of $e$ modulo $(p-1)(q-1)$. Book 1's
[Chapter 13](../../book/13-RSA.md) builds all of this and shows the other half
of the story too: anyone who knows $d$ can factor $n$, so recovering the key and
factoring the modulus are the same problem. Every attack on a properly padded
RSA key that does not exploit a mistake in the implementation comes down to one
question. Given $n$, find $p$.

Multiplying two 1024-bit primes takes a laptop a few microseconds. Undoing it is
the hardest problem anyone has paid to have solved in public. In August 1977
Martin Gardner's column in *Scientific American* printed a challenge from Ron
Rivest, Adi Shamir and Leonard Adleman: a message encrypted under a 129-digit
modulus, with a \$100 prize. Rivest estimated that factoring it with the best
methods then known would take 40 quadrillion years. It took seventeen. The
computers of 1994 were faster than those of 1977, but not by the factor of
$10^{15}$ the gap needed. What closed it was mathematics: the quadratic sieve,
invented in 1981, did not exist when the estimate was made.

That is the pattern of this whole chapter. The hardware has improved steadily
and predictably. The algorithms have improved in jumps, each one a new idea
about where to look for a factor, and each jump has moved the safe key size.
The 512-bit keys that were standard in the early 1990s fell in 1999; the
768-bit keys some people used as a compromise fell in 2009; 1024-bit keys are
now assumed to be within reach of a large government. Today's 2048-bit keys
rest on the bet that no further jump of the same size is coming, and on the
second bet that a large quantum computer is not about to be built. Both bets
are examined at the end of the chapter.

### Two kinds of method

The methods fall into two families, and it helps to see them apart from the
start (Figure 11.1).

The **special-purpose** methods find a factor $p$ in a time that depends on $p$,
or on some property of $p$, and hardly at all on $n$. Trial division, Pollard's
rho, Pollard's $p-1$, Williams' $p+1$ and the elliptic curve method are of this
kind. They are the right tools for numbers with a smallish factor, which is
most numbers. They are useless against a well-made RSA modulus, whose smallest
factor is as large as it can be, unless the key generator did something wrong:
put $p$ and $q$ too close together, or picked a $p$ for which $p-1$ has only
small factors.

The **general-purpose** methods take a time that depends only on the size of
$n$. The continued fraction method, the quadratic sieve and the number field
sieve are of this kind, and they are what an attacker uses against a modulus
with two primes of equal size. All three share one idea, older than any of
them: find two numbers whose squares are equal modulo $n$, and take a gcd.

<figure class="mars-fig">
<svg viewBox="0 0 640 310" width="640" role="img" aria-label="Horizontal bars showing which factoring method reaches which size: trial division and rho find small factors, ECM factors up to about 80 digits, the quadratic sieve whole numbers to about 130 digits, the number field sieve beyond" fill="currentColor" font-size="14">
<line x1="190.0" y1="24.0" x2="190.0" y2="270.0" stroke="currentColor" stroke-width="1.4" stroke-opacity="0.25"/>
<text x="190" y="282" text-anchor="middle" font-size="12">0</text>
<line x1="243.8" y1="24.0" x2="243.8" y2="270.0" stroke="currentColor" stroke-width="1.4" stroke-opacity="0.25"/>
<text x="244" y="282" text-anchor="middle" font-size="12">40</text>
<line x1="297.5" y1="24.0" x2="297.5" y2="270.0" stroke="currentColor" stroke-width="1.4" stroke-opacity="0.25"/>
<text x="298" y="282" text-anchor="middle" font-size="12">80</text>
<line x1="351.2" y1="24.0" x2="351.2" y2="270.0" stroke="currentColor" stroke-width="1.4" stroke-opacity="0.25"/>
<text x="351" y="282" text-anchor="middle" font-size="12">120</text>
<line x1="405.0" y1="24.0" x2="405.0" y2="270.0" stroke="currentColor" stroke-width="1.4" stroke-opacity="0.25"/>
<text x="405" y="282" text-anchor="middle" font-size="12">160</text>
<line x1="458.8" y1="24.0" x2="458.8" y2="270.0" stroke="currentColor" stroke-width="1.4" stroke-opacity="0.25"/>
<text x="459" y="282" text-anchor="middle" font-size="12">200</text>
<line x1="512.5" y1="24.0" x2="512.5" y2="270.0" stroke="currentColor" stroke-width="1.4" stroke-opacity="0.25"/>
<text x="512" y="282" text-anchor="middle" font-size="12">240</text>
<line x1="566.2" y1="24.0" x2="566.2" y2="270.0" stroke="currentColor" stroke-width="1.4" stroke-opacity="0.25"/>
<text x="566" y="282" text-anchor="middle" font-size="12">280</text>
<line x1="620.0" y1="24.0" x2="620.0" y2="270.0" stroke="currentColor" stroke-width="1.4" stroke-opacity="0.25"/>
<text x="620" y="282" text-anchor="middle" font-size="12">320</text>
<text x="405" y="302" text-anchor="middle" font-size="12">digits</text>
<text x="10" y="40" text-anchor="start" font-weight="bold" font-size="13">Trial division</text>
<text x="10" y="56" text-anchor="start" font-size="11">smallest factor</text>
<rect x="190.0" y="34.0" width="12.1" height="22.0" fill-opacity="0.9" rx="3"/>
<text x="10" y="74" text-anchor="start" font-weight="bold" font-size="13">Pollard's rho</text>
<text x="10" y="90" text-anchor="start" font-size="11">smallest factor</text>
<rect x="190.0" y="68.0" width="29.6" height="22.0" fill-opacity="0.9" rx="3"/>
<text x="10" y="108" text-anchor="start" font-weight="bold" font-size="13">Pollard's p−1</text>
<text x="10" y="124" text-anchor="start" font-size="11">factor p, if p−1 is smooth</text>
<rect x="190.0" y="102.0" width="80.6" height="22.0" fill-opacity="0.45" rx="3"/>
<text x="10" y="142" text-anchor="start" font-weight="bold" font-size="13">Elliptic curves</text>
<text x="10" y="158" text-anchor="start" font-size="11">smallest factor (record 83)</text>
<rect x="190.0" y="136.0" width="111.5" height="22.0" fill-opacity="0.9" rx="3"/>
<text x="10" y="176" text-anchor="start" font-weight="bold" font-size="13">Quadratic sieve</text>
<text x="10" y="192" text-anchor="start" font-size="11">whole number n</text>
<rect x="190.0" y="170.0" width="181.4" height="22.0" fill-opacity="0.6" rx="3"/>
<text x="10" y="210" text-anchor="start" font-weight="bold" font-size="13">Number field sieve</text>
<text x="10" y="226" text-anchor="start" font-size="11">whole number n (record 250)</text>
<rect x="324.4" y="204.0" width="201.6" height="22.0" fill-opacity="0.9" rx="3"/>
<text x="10" y="244" text-anchor="start" font-weight="bold" font-size="13">Special NFS</text>
<text x="10" y="260" text-anchor="start" font-size="11">n of special form</text>
<rect x="324.4" y="238.0" width="295.6" height="22.0" fill-opacity="0.45" rx="3"/>
</svg>
<figcaption>Figure 11.1. The factoring toolbox, by reach. The top four methods find a factor whose size is shown, whatever the size of n; the bottom three factor the whole number n. The bar for p−1 is lighter because it works only when p−1 happens to be smooth. Reaches are rough working ranges, with the records named.</figcaption>
</figure>

### How cost is measured

For trial division the cost is easy: up to $p$ divisions to find the factor $p$.
For the other methods the cost is a function of the number of digits, and the
functions are of three shapes. **Exponential** methods take time like
$n^{c}$ or $p^{c}$, which doubles with every few more bits. **Polynomial**
methods take time like $(\log n)^c$, which a multiplication or a modular
exponentiation does; no factoring method of this kind is known for an ordinary
computer. In between sit the **subexponential** methods, and to compare them
cryptographers use the **L-notation**:

$$L_n[\alpha, c] = \exp\!\Big( (c + o(1))\, (\ln n)^{\alpha} (\ln \ln n)^{1-\alpha} \Big).$$

With $\alpha = 0$ this is $(\ln n)^{c}$, polynomial; with $\alpha = 1$ it is
$n^{c}$, exponential. The quadratic sieve runs in $L_n[1/2, 1]$ and the number
field sieve in $L_n[1/3, 1.923]$. The step from $1/2$ to $1/3$ in the exponent is
the reason every record since 1996 belongs to the number field sieve, and the
reason a 2048-bit key is "only" worth about 112 bits of symmetric security in
NIST's SP 800-57, not 1024.

The $o(1)$ hides a lot: real running times are calibrated against real
factorizations, as §11.10 does. But the shape of the formula is what tells you
how a method will scale, and the shapes are where this chapter starts.

## 11.2 Trial division and its limit

*Level: beginner.*

The first method anyone thinks of is to try dividing $n$ by 2, 3, 5, 7 and so
on. It is correct, and it is the right first step for any number: about 88
percent of all integers have a prime factor below 100, so a few divisions
usually find something. You only need to try divisors up to $\sqrt n$, because
if $n = ab$ with $a \le b$ then $a \le \sqrt n$.

**By hand.** Take $n = 27619$, the number this chapter will factor five
different ways. Its square root is just over 166. Try the primes in order:
27619 is odd, its digit sum 25 is not a multiple of 3, it does not end in 0 or
5, and $27619 = 7 \cdot 3945 + 4$. Carry on through 11, 13, 17, and so on. The
twentieth prime is 71, and $27619 = 71 \cdot 389$. Twenty divisions.

**Code it.** Dividing only by primes is a little faster than dividing by every
number, but generating the primes costs time too. A common middle way is to
skip multiples of 2 and 3: after 2 and 3, every prime has the form $6k \pm 1$.

```python
def trial_division(n):
    factors = []
    for d in (2, 3):
        while n % d == 0:
            factors.append(d)
            n //= d
    d, step, tries = 5, 2, 2
    while d * d <= n:            # only up to the square root of what is left
        tries += 1
        while n % d == 0:
            factors.append(d)
            n //= d
        d += step
        step = 6 - step          # 5, 7, 11, 13, 17, 19, ...: skip multiples of 2 and 3
    if n > 1:
        factors.append(n)        # what is left has no factor below its square root
    return factors, tries

print(trial_division(27619))
print(trial_division(2 ** 64 + 1))       # Landry's factorization of 1880
print(trial_division(600851475143))
```

It prints:

```text
([71, 389], 25)
([274177, 67280421310721], 2734156)
([71, 839, 1471, 6857], 492)
```

The second line is the sixth Fermat number, $F_6 = 2^{64} + 1$. Fermat had
guessed in 1640 that every number $2^{2^k} + 1$ is prime. Euler found the factor
641 of $F_5$ in 1732. Fortuné Landry, an amateur then in his eighties, factored $F_6$ in 1880
by hand, with methods he never fully published. The count of 25 for 27619
is the number of trial divisors used, which includes non-primes such as 25 and
35 that the $6k \pm 1$ rule lets through. For $F_6$ the count is 2.7 million:
reaching 274177 is quick, but proving that the cofactor 67280421310721 is prime
means trying every candidate up to its square root, about 8.2 million. A
second or two in Python.

### The limit

Trial division needs about $p / \ln p$ divisions (one per prime below $p$) to
find a factor $p$, or about $p/3$ with the $6k \pm 1$ wheel. A computer does
about $10^9$ divisions of word-sized numbers a second. So trial division finds
factors of 9 or 10 digits in a second, 15 digits in a few days, and for a
modulus whose smallest factor has 309 digits, as a 2048-bit RSA key does, it
needs around $10^{308}$ divisions. There are about $10^{80}$ atoms in the
observable universe. The method is exponential in the length of $p$: each extra
digit of the factor multiplies the work by ten.

That is still useful. Every factoring program starts with trial division up to
some bound, often $10^5$ or $10^6$, to strip off the small factors that the
other methods find less efficiently, and every RSA key generator runs trial
division by the first few hundred primes on each candidate before the much more
expensive Miller-Rabin test. But against an RSA modulus it is a joke, and the
interesting methods begin when you stop dividing.

## 11.3 Fermat's method and close primes

*Level: beginner.*

Suppose $n$ is odd and $n = pq$. Put $a = (p+q)/2$ and $b = (q-p)/2$. Then

$$n = pq = (a - b)(a + b) = a^2 - b^2,$$

so every odd composite is a difference of two squares. Turn this around: if you
can find $a$ and $b$ with $a^2 - n = b^2$, you have the factors $a - b$ and
$a + b$. Pierre de Fermat described the search in a letter of 1643, probably to
Marin Mersenne: start at $a = \lceil \sqrt n \rceil$, compute $a^2 - n$, and
step $a$ up by one until $a^2 - n$ is a perfect square.

**By hand, Fermat's own example.** In the letter Fermat factored
$n = 2027651281$. The square root is 45029.4..., so start at $a = 45030$:

| $a$ | $a^2 - n$ | square? |
|---|---|---|
| 45030 | 49619 | no ($222^2 = 49284$, $223^2 = 49729$) |
| 45031 | 139680 | no |
| 45032 | 229743 | no |
| ... | ... | ... |
| 45040 | 950319 | no |
| 45041 | 1040400 | yes, $1020^2$ |

So $n = (45041 - 1020)(45041 + 1020) = 44021 \cdot 46061$. Twelve steps, each a
subtraction and a square test. Trial division would have needed over 4,500
divisions to reach 44021. Fermat also noted a short cut by hand: squares end in
only certain digits (in base 10, a square ends in 0, 1, 4, 5, 6 or 9, and
modulo 100 there are only 22 possible endings), so most values of $a^2 - n$ can
be rejected at a glance.

**Why it works only sometimes.** The method succeeds at $a = (p+q)/2$, and it
starts at about $\sqrt{pq}$. The number of steps is the gap between the
arithmetic mean and the geometric mean of $p$ and $q$:

$$\frac{p+q}{2} - \sqrt{pq} = \frac{(\sqrt q - \sqrt p)^2}{2} \approx \frac{(q-p)^2}{8\sqrt n}.$$

For Fermat's example, $q - p = 2040$ and $\sqrt n \approx 45029$, and the formula
gives $2040^2 / (8 \cdot 45029) \approx 11.6$: twelve steps. For $27619 = 71
\cdot 389$, the gap $q - p = 318$ gives about $318^2 / (8 \cdot 166) \approx 76$,
and the true count is 64. For primes picked independently at random, $q - p$ is
about as large as $p$ itself and the method is slower than trial division. But
when the primes are close, it is the fastest method there is.

**Code it.**

```python
from math import isqrt

def fermat(n, limit=10 ** 7):
    a = isqrt(n - 1) + 1                 # the first a with a*a >= n
    for steps in range(1, limit + 1):
        b2 = a * a - n
        b = isqrt(b2)
        if b * b == b2:
            return a - b, a + b, steps
        a += 1
    return None                          # p and q are not close enough

print(fermat(2027651281))                # Fermat's example of 1643
print(fermat(27619))
```

```text
(44021, 46061, 12)
(71, 389, 64)
```

### Break it: the 2022 printer keys

The formula says the danger is not only $q = p + 2$. Any pair with
$(q-p)^2$ not much larger than $\sqrt n$ falls quickly. For a 2048-bit modulus,
$\sqrt n \approx 2^{1024}$; if the two primes agree in their top 500 or so bits,
so that $q - p \approx 2^{520}$, the count is about $2^{1040}/2^{1027} = 2^{13}$
steps. The next block makes such a key, deliberately, and factors it.

```python
from math import isqrt

def is_prime(n):                         # Miller-Rabin with fixed bases
    if n < 2:
        return False
    for p in (2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37):
        if n % p == 0:
            return n == p
    d, s = n - 1, 0
    while d % 2 == 0:
        d, s = d // 2, s + 1
    for a in (2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37):
        x = pow(a, d, n)
        if x in (1, n - 1):
            continue
        for _ in range(s - 1):
            x = x * x % n
            if x == n - 1:
                break
        else:
            return False
    return True

def next_prime(n):
    n |= 1
    while not is_prime(n):
        n += 2
    return n

def fermat(n, limit=10 ** 7):
    a = isqrt(n - 1) + 1
    for steps in range(1, limit + 1):
        b2 = a * a - n
        b = isqrt(b2)
        if b * b == b2:
            return a - b, a + b, steps
        a += 1

p = next_prime(3 ** 646)                 # some 1024-bit prime
q = next_prime(p + 2 ** 520)             # a second prime "nearby": same top 500 bits
n = p * q
print(n.bit_length())
x, y, steps = fermat(n)
print(x == p and y == q, steps)
```

```text
2048
True 8867
```

A 2048-bit RSA modulus, factored in 8,867 steps, well under a second. This is
not a classroom fantasy. In 2022 Hanno Böck, scanning public keys for exactly
this weakness, found RSA keys in Canon and Fujifilm printers whose primes were
neighbors: a library from Rambus (SafeZone, earlier Inside Secure) made $p$ at
random and then took $q$ as the next prime after $p$. The flaw became
CVE-2022-26320. Böck also found a handful of PGP keys with the same defect,
apparently made by unusual software. Book 1's
[§13.12](../../book/13-RSA.md) shows the simplest case, $q$ the next prime
after $p$; the code above shows that "close" reaches much further than that.

### Fix it

FIPS 186-5, the US standard for making RSA keys, requires
$|p - q| > 2^{n_{\text{len}}/2 - 100}$: for a 2048-bit key the primes must differ
somewhere in their top 100 bits. Then $(q - p)^2 / (8\sqrt n)$ is at least about
$2^{1848 - 1027} = 2^{821}$ steps, and Fermat's method is hopeless. Primes chosen
independently and at random pass this test with overwhelming probability; the
check is there to catch generators that, like the printer library, do not
choose independently.

!!! note "Life story: the close-primes keys (CVE-2022-26320)"
    **Born:** a key generator in the Rambus SafeZone library that searched for
    $q$ upward from $p$ · **Purpose:** save time by reusing the first prime's
    search as the start of the second · **Helped:** Hanno Böck's 2022 scan, which
    factored keys from Canon and Fujifilm printers with Fermat's method of 1643,
    and showed that 380-year-old mathematics still finds new victims ·
    **Status:** fixed in the library and the printers' firmware; the FIPS 186-5
    distance rule is the standing defense

## 11.4 Pollard's rho

*Level: beginner.*

In 1975 John Pollard, a British mathematician working at the Plessey company's
research laboratories, published a method that finds a factor $p$ in about
$\sqrt p$ steps instead of $p$, using almost no memory. It rests on the birthday
paradox, which this book derived in
[Chapter 4](04-Brute-Force-Birthdays-and-Trade-offs.md): among about $\sqrt p$
random numbers modulo $p$, two are likely to be equal.

### The idea

Pick a simple function that scrambles numbers modulo $n$, the usual choice
being $f(x) = x^2 + 1 \bmod n$, and walk: $x_0 = 2$, $x_1 = f(x_0)$,
$x_2 = f(x_1)$, and so on. Now look at the same walk through glasses that see
only the remainders modulo the unknown factor $p$. Because
$f(x) \bmod p$ depends only on $x \bmod p$, the remainders follow their own
walk on a set of only $p$ values. That walk must repeat, and by the birthday
bound it repeats after about $\sqrt{\pi p / 2}$ steps. From then on it goes
round a cycle, and the picture of a tail leading into a loop is the Greek
letter $\rho$ that gives the method its name.

When $x_i \equiv x_j \pmod p$, the difference $x_i - x_j$ is a multiple of $p$.
You cannot see the remainders modulo $p$, since you do not know $p$, but you
can compute $\gcd(x_i - x_j, n)$, and that gcd is $p$ (or a multiple of $p$
that divides $n$). Modulo the other factor $q$ the walk usually has a different
cycle, so the gcd is rarely all of $n$.

How do you find a pair $i, j$ that collide without storing the whole walk?
Robert Floyd's trick, the tortoise and the hare, which
[Chapter 4](04-Brute-Force-Birthdays-and-Trade-offs.md) used to find hash
collisions: run two copies, one at single speed ($x_i$) and one at double
speed ($x_{2i}$), and compare them after every step. Once both are on the
cycle, the hare gains one step per round on the tortoise and must land on it
within one lap. The first $i$ with $x_i \equiv x_{2i} \pmod p$ is at most the
tail length plus the cycle length.

### By hand

Factor $n = 3431$ with $f(x) = x^2 + 1$ and $x_0 = 2$. Each round, the tortoise
$x$ takes one step and the hare $y$ takes two; then take $\gcd(x - y, n)$.

| round $i$ | $x = x_i$ | $y = x_{2i}$ | $\gcd(x - y,\ 3431)$ |
|---|---|---|---|
| 1 | 5 | 26 | 1 |
| 2 | 26 | 2007 | 1 |
| 3 | 677 | 3137 | 1 |
| 4 | 2007 | 2508 | 1 |
| 5 | 56 | 1569 | 1 |
| 6 | 3137 | 1239 | 73 |

So $3431 = 73 \cdot 47$. To see why round 6 worked, reduce the walk modulo
73: it runs $2, 5, 26, 20, 36, 56, 71, 5, 26, \ldots$, a tail of one step and
a cycle of six (Figure 11.2). Round 6 compares $x_6$ and $x_{12}$, which are
both 71 modulo 73. Modulo 47 the same walk has a tail of 8 and a cycle of 4,
$2, 5, 26, 19, 33, 9, 35, 4, 17, 8, 18, 43, 17, \ldots$, and Floyd's method
would catch that at round 8. The smaller collision time wins, and the gcd
shows 73.

<figure class="mars-fig">
<svg viewBox="0 0 640 316" width="640" role="img" aria-label="The rho sequence modulo 73: 2 leads into the cycle 5, 26, 20, 36, 56, 71 and back to 5" fill="currentColor" font-size="14">
<defs><marker id="f11-ar" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
<circle cx="170.0" cy="140.0" r="20" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="170" y="145" text-anchor="middle">2</text>
<text x="170" y="180" text-anchor="middle" font-size="12">x₀</text>
<line x1="191.0" y1="140.0" x2="332.0" y2="140.0" stroke="currentColor" stroke-width="1.4" marker-end="url(#f11-ar)"/>
<circle cx="355.0" cy="140.0" r="20" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="355" y="145" text-anchor="middle">5</text>
<line x1="365.5" y1="121.8" x2="386.0" y2="86.3" stroke="currentColor" stroke-width="1.4" marker-end="url(#f11-ar)"/>
<circle cx="397.5" cy="66.4" r="20" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="397" y="71" text-anchor="middle">26</text>
<line x1="418.5" y1="66.4" x2="459.5" y2="66.4" stroke="currentColor" stroke-width="1.4" marker-end="url(#f11-ar)"/>
<circle cx="482.5" cy="66.4" r="20" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="482" y="71" text-anchor="middle">20</text>
<line x1="493.0" y1="84.6" x2="513.5" y2="120.1" stroke="currentColor" stroke-width="1.4" marker-end="url(#f11-ar)"/>
<circle cx="525.0" cy="140.0" r="20" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="525" y="145" text-anchor="middle">36</text>
<line x1="514.5" y1="158.2" x2="494.0" y2="193.7" stroke="currentColor" stroke-width="1.4" marker-end="url(#f11-ar)"/>
<circle cx="482.5" cy="213.6" r="20" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="483" y="219" text-anchor="middle">56</text>
<line x1="461.5" y1="213.6" x2="420.5" y2="213.6" stroke="currentColor" stroke-width="1.4" marker-end="url(#f11-ar)"/>
<circle cx="397.5" cy="213.6" r="20" fill="none" stroke="currentColor" stroke-width="2.4"/>
<text x="397" y="219" text-anchor="middle">71</text>
<line x1="387.0" y1="195.4" x2="366.5" y2="159.9" stroke="currentColor" stroke-width="1.4" marker-end="url(#f11-ar)"/>
<text x="347" y="182" text-anchor="middle" font-size="12">x₁, x₇, x₁₃</text>
<text x="376" y="39" text-anchor="middle" font-size="12">x₂, x₈</text>
<text x="503" y="39" text-anchor="middle" font-size="12">x₃, x₉</text>
<text x="567" y="144" text-anchor="middle" font-size="12">x₄, x₁₀</text>
<text x="504" y="249" text-anchor="middle" font-size="12">x₅, x₁₁</text>
<text x="376" y="249" text-anchor="middle" font-size="12">x₆, x₁₂</text>
<text x="20" y="30" text-anchor="start" font-weight="bold">x mod 73, for x → x² + 1, starting at 2</text>
<text x="20" y="285" text-anchor="start" font-size="13">Floyd: x₆ ≡ x₁₂ ≡ 71 (mod 73), so 73 divides x₆ − x₁₂ = 3137 − 1239 = 1898</text>
<text x="20" y="305" text-anchor="start" font-size="13">and gcd(1898, 3431) = 73. Tail length 1, cycle length 6.</text>
</svg>
<figcaption>Figure 11.2. The rho of the worked example. Seen modulo the hidden factor 73, the walk x → x² + 1 from 2 enters a cycle of six values after one step. The tortoise at x₆ and the hare at x₁₂ meet on 71; the gcd of their difference with n reveals 73 without anyone knowing it in advance.</figcaption>
</figure>

### Brent's improvement

Floyd's method evaluates $f$ three times a round (once for the tortoise, twice
for the hare) and takes a gcd every round. In 1980 Richard Brent, at the
Australian National University, published a faster way to find the cycle. Park
the tortoise; let the hare run $r$ steps, comparing with the parked tortoise
after each; if no match, move the tortoise to the hare's position and double
$r$. The tortoise is parked at positions $1, 2, 4, 8, \ldots$, and once $r$ is
at least the cycle length and the tortoise is on the cycle, the hare must land
on it within $r$ steps. Brent's method needs only one evaluation of $f$ per
comparison, and Brent measured it about 24 percent faster than Floyd's for
factoring. Pollard had already suggested the second trick: a gcd costs much
more than a multiplication, so multiply about a hundred differences together
modulo $n$ and take one gcd of the product. A factor of any one difference is a
factor of the product.

That same year Brent and Pollard used the method to factor the eighth Fermat
number, $F_8 = 2^{256} + 1$, finding the 16-digit factor
1238926361552897 in about two hours on a Univac 1100/42. The method's running
time depends on the size of the smallest factor, not of $F_8$, a 78-digit
number that no general method of 1980 could have touched.

**Code it.** Both versions, counting evaluations of $f$:

```python
from math import gcd

def rho_floyd(n, c=1):
    f = lambda x: (x * x + c) % n
    x = y = 2
    calls = 0
    while True:
        x = f(x)                         # the tortoise takes one step
        y = f(f(y))                      # the hare takes two
        calls += 3
        d = gcd(x - y, n)
        if d > 1:
            return d, calls              # d == n means: try another c

def rho_brent(n, c=1, batch=100):
    f = lambda x: (x * x + c) % n
    y, r, q, calls = 2, 1, 1, 0
    while True:
        x = y                            # park the tortoise where the hare is
        for _ in range(r):
            y = f(y)
        calls += r
        k = 0
        while k < r:
            ys = y
            for _ in range(min(batch, r - k)):
                y = f(y)
                q = q * (x - y) % n      # multiply the differences: one gcd per batch
            calls += min(batch, r - k)
            d = gcd(q, n)
            if d > 1:
                if d == n:               # overshot inside the batch: redo it step by step
                    while True:
                        ys = f(ys)
                        d = gcd(x - ys, n)
                        if d > 1:
                            break
                return d, calls
            k += batch
        r *= 2

print(rho_floyd(3431), rho_brent(3431))
print(rho_floyd(2 ** 64 + 1), rho_brent(2 ** 64 + 1))
n = 1000000007 * 10000000019
print(rho_floyd(n), rho_brent(n))
```

```text
(73, 18) (73, 14)
(274177, 2424) (274177, 1834)
(1000000007, 82719) (1000000007, 60350)
```

Landry's factor 274177, which trial division reached after about 91,000
divisions, falls to rho in under 2,500 steps; the square root of 274177 is about 524, and the constant in front
is the birthday constant times the cost per round. A ten-digit factor takes
under 100,000 steps. Brent's version uses about a quarter fewer evaluations of
$f$ on each example, and far fewer gcds.

### Why the function is $x^2 + c$

Any function that behaves "randomly enough" modulo $p$ would do, but it must be
a polynomial, so that $f(x) \bmod p$ depends only on $x \bmod p$; that is the
property that lets the walk modulo $p$ run in the dark. Linear functions
$ax + b$ are too regular: they make long cycles that do not behave like random
maps. $x^2 + c$ is the cheapest nonlinear polynomial. Two values of $c$ are
avoided: $c = 0$ and $c = -2$, for which the walk has algebraic structure
($x \mapsto x^2$ just repeats squaring) and collides badly. If the gcd ever
comes out as $n$ itself, both factors collided at once; start again with
another $c$.

Nobody has proved that $x^2 + c$ behaves like a random map, and the
$\sqrt p$ running time of rho is a heuristic, supported by fifty years of
experience. The same walk, with a function built from the group operation,
is the best known attack on elliptic curve discrete logarithms, and
[Chapter 12](12-Discrete-Logarithms.md) uses it there.

!!! note "Life story: Pollard's rho method"
    **Born:** 1975, John Pollard, "A Monte Carlo method for factorization", *BIT*
    15 · **Purpose:** find a factor $p$ in about $\sqrt p$ steps with almost no
    memory, by waiting for a birthday collision modulo the unknown factor ·
    **Helped:** Brent's faster cycle finding (1980), and the Brent-Pollard
    factorization of the 78-digit Fermat number $F_8$ in 1980; its discrete-log
    form (1978) is still the best attack on elliptic curves · **Status:** in every
    factoring program, for factors up to about 20 digits; overtaken beyond that
    by the elliptic curve method

### Rho against RSA

For a 2048-bit modulus, $\sqrt p \approx 2^{512}$: no better than any other
exponential method. Rho is a tool for numbers with a medium-sized factor, for
finishing off what trial division leaves, and for factoring the auxiliary
numbers that turn up inside the big sieves. Its importance to cryptography is
the idea, not the reach: a walk that runs modulo an unknown number and a gcd
that detects when it repeats. Pollard's next method uses the gcd differently.

## 11.5 Smooth numbers and Pollard's p−1

*Level: intermediate.*

A year before rho, in 1974, Pollard published a method of a quite different
kind. It finds a prime factor $p$ of $n$ quickly whenever $p - 1$ is made only
of small primes, however large $p$ itself is. It is the first method in this
chapter whose success depends on a property of the factor rather than its size,
and the property it depends on, smoothness, runs through everything that
follows.

### Smooth numbers

A number is **$B$-smooth** if none of its prime factors exceeds $B$. So
$5040 = 2^4 \cdot 3^2 \cdot 5 \cdot 7$ is 7-smooth, and
$1000170 = 2 \cdot 3^2 \cdot 5 \cdot 11113$ is not 1000-smooth. Smooth numbers
are rarer than you might hope but not rare enough to be useless. The
proportion of numbers up to $x$ that are $x^{1/u}$-smooth is about $u^{-u}$, the
Dickman function's rough size: about 30 percent of numbers are
$x^{1/2}$-smooth, about 5 percent are $x^{1/3}$-smooth, and about 1 in 3,000
are $x^{1/5}$-smooth. Every subexponential factoring method in this chapter is
a way of finding smooth numbers with a structure that lets them be combined,
and its running time is set by how rare they are.

### The method

Fermat's little theorem says $a^{p-1} \equiv 1 \pmod p$ for any $a$ not
divisible by $p$. So $a^{k(p-1)} \equiv 1$ too, for every multiple $k(p-1)$.
You do not know $p - 1$, but if it is $B$-smooth it divides

$$M = \prod_{\text{primes } \ell \le B} \ell^{\lfloor \log_\ell B \rfloor},$$

the product of the largest power of each prime that stays at or below $B$
(this is $\operatorname{lcm}(1, 2, \ldots, B)$). Compute $x = a^M \bmod n$.
Then $x \equiv 1 \pmod p$, so $p$ divides $x - 1$, and $\gcd(x - 1, n)$ reveals
$p$. The other prime $q$ survives unless $q - 1$ also happens to divide $M$
(more exactly, unless the order of $a$ modulo $q$ does), and then the gcd is
$n$ and you lower $B$ or try again.

**By hand.** Back to $n = 27619 = 71 \cdot 389$. Here $71 - 1 = 70 =
2 \cdot 5 \cdot 7$ is 7-smooth, and $389 - 1 = 388 = 2^2 \cdot 97$ is not. A
hand-friendly way to build up the exponent is to raise to each $k$ in turn,
$x_k = x_{k-1}^k$, so that $x_k = 2^{k!}$; $7! = 5040$ is a multiple of 70.

| $k$ | $x_k = x_{k-1}^k \bmod 27619$ | $\gcd(x_k - 1,\ n)$ |
|---|---|---|
| 1 | 2 | |
| 2 | 4 | 1 |
| 3 | 64 | 1 |
| 4 | 12483 | 1 |
| 5 | 3374 | 1 |
| 6 | 7503 | 1 |
| 7 | 18745 | 71 |

At $k = 6$ the exponent $720$ is not yet a multiple of 70; at $k = 7$ it is,
and $18745 \equiv 1 \pmod{71}$, while modulo 389 it is 73, nowhere near 1.

**The cost.** Computing $a^M$ takes about $\log_2 M \approx 1.44 B$ modular
squarings, so the method is fast exactly when $B$ is small. With $B = 10^6$ it
takes a second or two on a 2048-bit number. It finds $p$ whenever
$p - 1$ is $10^6$-smooth, whatever size $p$ is.

**Stage 2.** Most numbers are not smooth, but many are smooth except for one
larger prime. After stage 1 has computed $x = a^M$, stage 2 tries each prime
$\ell$ between $B$ and a second bound $B_2$, typically 100 times larger, by
checking $\gcd(x^{\ell} - 1, n)$. Done naively that costs one exponentiation per
prime; done properly it costs one multiplication per prime, since the gaps
between consecutive primes are small and $x^{\ell_{i+1}} = x^{\ell_i} \cdot
x^{\ell_{i+1} - \ell_i}$ with the small powers precomputed. Modern programs
use fast polynomial arithmetic and reach $B_2$ in the trillions.

**Code it.** Stage 1, on a 35-digit number built so that one prime is
weak:

```python
from math import gcd

def primes_upto(b):
    sieve = bytearray([1]) * (b + 1)
    sieve[0:2] = b"\x00\x00"
    for i in range(2, int(b ** 0.5) + 1):
        if sieve[i]:
            sieve[i * i::i] = bytearray(len(sieve[i * i::i]))
    return [i for i in range(b + 1) if sieve[i]]

def pminus1(n, B, a=2):
    for l in primes_upto(B):
        lk = l
        while lk * l <= B:               # the largest power of l that is at most B
            lk *= l
        a = pow(a, lk, n)
    return gcd(a - 1, n)

p = 1000000000056151                     # p - 1 = 2 * 3^2 * 5^2 * 149 * 157 * 193 * 509 * 967
q = 10000000000000000051                 # q - 1 has the prime factor 2187161
n = p * q
print(pminus1(n, 500))                   # 967 is missing from M: nothing
print(pminus1(n, 1000))                  # p - 1 divides M
print(pminus1(27619, 7))
```

```text
1
1000000000056151
71
```

With $B = 500$ the prime 967 is missing from $M$ and the gcd is 1; with
$B = 1000$ the 16-digit factor falls at once. Rho would have needed about
$\sqrt{10^{15}} \approx 3 \times 10^7$ steps to find the same factor.

### Williams' p+1, in outline

The $p - 1$ method works in the multiplicative group modulo $p$, which has
$p - 1$ elements. In 1982 Hugh Williams, at the University of Manitoba, gave a
version that works in a group of order $p + 1$ instead: the elements of norm 1
in the field with $p^2$ elements, reached through **Lucas sequences**
$V_0 = 2$, $V_1 = A$, $V_k = A V_{k-1} - V_{k-2}$, which can be computed
modulo $n$ with a ladder much like square-and-multiply. If $A^2 - 4$ is a
non-square modulo $p$, then $V_M \equiv 2 \pmod p$ whenever $p + 1$ divides
$M$, and $\gcd(V_M - 2, n)$ reveals $p$. Since you cannot tell in advance
whether $A^2 - 4$ is a square modulo the unknown $p$, you try two or three
values of $A$; with the wrong kind you have just run a slow $p - 1$.

Our running example shows why a second group helps: $389 + 1 = 390 = 2 \cdot 3
\cdot 5 \cdot 13$ is 13-smooth, so $p + 1$ with $B = 13$ finds the factor 389
that $p - 1$ cannot reach with any small bound. Each group is one more chance
that the factor's group order is smooth. With two groups you have two chances.
The elliptic curve method, next, gives you as many as you like.

### Strong primes

In the 1980s the $p - 1$ and $p + 1$ methods led standards to demand
**strong primes** for RSA: primes $p$ such that $p - 1$ and $p + 1$ each have a
large prime factor (and, for a further attack by repeated encryption, that
$p - 1$'s large factor $r$ has $r - 1$ with a large factor too). ANSI X9.31
required them. In 1999 Ron Rivest and Robert Silverman argued in "Are 'strong'
primes needed for RSA?" that the requirement had become pointless: for random
primes of 512 bits or more, the chance that $p - 1$ is smooth enough for
$p - 1$ to succeed is negligible, and the elliptic curve method, which no choice
of $p$ can defend against, makes $p - 1$ a special case of something better.
FIPS 186-5 still describes a way to generate primes with large factors of
$p \pm 1$ for those who want it, but random primes of the sizes it allows are
safe without it. The method is still a good first try against careless keys:
some key generators of the past built $p$ as one plus a product of small
primes, to make primality easy to prove, and such keys fall to $p - 1$ at once.

!!! note "Life story: Pollard's p−1 method"
    **Born:** 1974, John Pollard, "Theorems on factorization and primality
    testing", *Proceedings of the Cambridge Philosophical Society* 76 ·
    **Purpose:** find a prime factor $p$ of any size when $p - 1$ is smooth ·
    **Helped:** introduced smoothness as the engine of factoring; Williams' $p+1$
    (1982) and Lenstra's elliptic curve method (1985) are its descendants; it
    caused the strong-prime rules of the 1980s · **Status:** run as a cheap first
    pass in every factoring package; harmless against random RSA primes

## 11.6 The elliptic curve method

*Level: intermediate.*

The weakness of $p - 1$ is that the group is fixed. For a given $p$ the group
modulo $p$ has exactly $p - 1$ elements, and if $p - 1$ has a large prime
factor, no choice of $a$ and no amount of luck helps. In 1985 Hendrik Lenstra,
then at the University of Amsterdam, saw how to keep the method and change the
group. An elliptic curve $E$ modulo a prime $p$ is a group too (book 1,
[Chapter 15](../../book/15-Elliptic-Curves.md)), and Hasse's theorem says its
number of points lies in the interval

$$p + 1 - 2\sqrt p \le \#E(\mathbb{F}_p) \le p + 1 + 2\sqrt p.$$

Different curves give different orders, spread across that interval roughly
like random numbers of that size. If one curve's order is $B$-smooth, running
the $p - 1$ idea on that curve finds $p$. If not, pick another curve. Each curve
is a fresh lottery ticket, and a ticket costs about as much as one run of
$p - 1$.

### How the factor shows itself

Work modulo $n$, with the usual formulas for adding points
$(x_1, y_1) + (x_2, y_2)$ on $y^2 = x^3 + ax + b$: the slope is
$(y_2 - y_1)/(x_2 - x_1)$, or $(3x_1^2 + a)/(2y_1)$ for doubling, and dividing
means multiplying by an inverse modulo $n$. Pick a curve and a point $P$ on it,
and compute $M \cdot P$ for the same smooth $M$ as in $p - 1$.

Seen modulo $p$, the point $P$ has some order $r$ dividing $\#E(\mathbb{F}_p)$.
If that order divides $M$, then somewhere during the computation of $M \cdot P$
a partial result becomes the point at infinity modulo $p$. In the formulas, that
happens when two points with the same $x$-coordinate modulo $p$ are added, so the
denominator $x_2 - x_1$ is divisible by $p$. Modulo $n$, the denominator is not
zero, but it has no inverse: the inversion fails, and the gcd of the
denominator with $n$ is the factor. The method finds $p$ by crashing: it
tries to compute $M \cdot P$ modulo $n$, and it succeeds in factoring exactly
when that computation turns out to be impossible.

Picking a random curve with a known point is easy without square roots: choose
the point $(x_0, y_0)$ and the coefficient $a$ first, then set
$b = y_0^2 - x_0^3 - a x_0$. The code uses the point $(0, 1)$ and the curves
$y^2 = x^3 + cx + 1$ for $c = 1, 2, 3, \ldots$.

**Code it.** In short form: affine coordinates, double-and-add, and an
exception that carries the factor out of the arithmetic when an inverse fails.

```python
from math import gcd

def primes_upto(b):
    return [p for p in range(2, b + 1) if all(p % d for d in range(2, int(p ** 0.5) + 1))]

class Found(Exception):
    pass

def inverse(x, n):
    d = gcd(x, n)
    if d != 1:
        raise Found(d)                   # no inverse: d is a factor of n (maybe n itself)
    return pow(x, -1, n)

def add(P, Q, a, n):                     # points are (x, y); None is the point at infinity
    if P is None:
        return Q
    if Q is None:
        return P
    (x1, y1), (x2, y2) = P, Q
    if x1 == x2 and (y1 + y2) % n == 0:
        return None
    if P == Q:
        s = (3 * x1 * x1 + a) * inverse(2 * y1, n) % n
    else:
        s = (y2 - y1) * inverse(x2 - x1, n) % n
    x3 = (s * s - x1 - x2) % n
    return x3, (s * (x1 - x3) - y1) % n

def multiply(k, P, a, n):
    R = None
    while k:
        if k & 1:
            R = add(R, P, a, n)
        P = add(P, P, a, n)
        k >>= 1
    return R

def ecm(n, B, curves):
    for c in range(1, curves + 1):
        a, P = c, (0, 1)                 # the curve y^2 = x^3 + c*x + 1 passes through (0, 1)
        try:
            for l in primes_upto(B):
                lk = l
                while lk * l <= B:
                    lk *= l
                P = multiply(lk, P, a, n)
                if P is None:
                    break
        except Found as e:
            if e.args[0] < n:
                return e.args[0], c      # the factor, and which curve found it
    return None

def count_points(a, b, p):               # only to check the answer: counts E mod p directly
    N = 1
    for x in range(p):
        r = (x ** 3 + a * x + b) % p
        N += 1 if r == 0 else (2 if pow(r, (p - 1) // 2, p) == 1 else 0)
    return N

n = 1000171 * 10000000000000000051       # p - 1 = 2*3^2*5*11113, p + 1 = 2^2*250043
print(ecm(n, 200, 50))
print(count_points(29, 1, 1000171))      # 2 * 3 * 23 * 53 * 137: 200-smooth
n = 100000000003 * 10000000000000000051  # a 12-digit factor
print(ecm(n, 2000, 300))
```

```text
(1000171, 29)
1002018
(100000000003, 20)
```

The first number is built so that both $p - 1$ and $p + 1$ fail for its
seven-digit factor with any bound below 11113. The elliptic curve method tries
curve after curve; the 29th has $1{,}002{,}018 = 2 \cdot 3 \cdot 23 \cdot 53
\cdot 137$ points modulo $p$, all of whose prime factors are below 200, and
the factor falls out. Figure 11.3 shows the lottery: for most curves the
largest prime factor of the order is in the thousands or beyond. The second
number has a 12-digit factor and needs a larger bound; the 20th curve finds it
in under a second.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Bar chart on a log scale of the largest prime factor of the group order for curves 1 to 29 modulo p = 1000171; only curve 29 falls below the bound 200" fill="currentColor" font-size="14">
<line x1="70.0" y1="250.0" x2="570.0" y2="250.0" stroke="currentColor" stroke-width="1.4" stroke-opacity="0.2"/>
<text x="64" y="255" text-anchor="end" font-size="12">100</text>
<line x1="70.0" y1="195.0" x2="570.0" y2="195.0" stroke="currentColor" stroke-width="1.4" stroke-opacity="0.2"/>
<text x="64" y="200" text-anchor="end" font-size="12">1,000</text>
<line x1="70.0" y1="140.0" x2="570.0" y2="140.0" stroke="currentColor" stroke-width="1.4" stroke-opacity="0.2"/>
<text x="64" y="145" text-anchor="end" font-size="12">10⁴</text>
<line x1="70.0" y1="85.0" x2="570.0" y2="85.0" stroke="currentColor" stroke-width="1.4" stroke-opacity="0.2"/>
<text x="64" y="90" text-anchor="end" font-size="12">10⁵</text>
<line x1="70.0" y1="30.0" x2="570.0" y2="30.0" stroke="currentColor" stroke-width="1.4" stroke-opacity="0.2"/>
<text x="64" y="35" text-anchor="end" font-size="12">10⁶</text>
<rect x="72.0" y="151.3" width="13.2" height="98.7" fill-opacity="0.45"/>
<text x="79" y="266" text-anchor="middle" font-size="11">1</text>
<rect x="89.2" y="206.0" width="13.2" height="44.0" fill-opacity="0.45"/>
<rect x="106.5" y="184.5" width="13.2" height="65.5" fill-opacity="0.45"/>
<rect x="123.7" y="187.3" width="13.2" height="62.7" fill-opacity="0.45"/>
<rect x="141.0" y="163.9" width="13.2" height="86.1" fill-opacity="0.45"/>
<text x="148" y="266" text-anchor="middle" font-size="11">5</text>
<rect x="158.2" y="145.2" width="13.2" height="104.8" fill-opacity="0.45"/>
<rect x="175.4" y="191.6" width="13.2" height="58.4" fill-opacity="0.45"/>
<rect x="192.7" y="133.5" width="13.2" height="116.5" fill-opacity="0.45"/>
<rect x="209.9" y="72.8" width="13.2" height="177.2" fill-opacity="0.45"/>
<text x="217" y="266" text-anchor="middle" font-size="11">9</text>
<rect x="227.2" y="46.5" width="13.2" height="203.5" fill-opacity="0.45"/>
<rect x="244.4" y="217.6" width="13.2" height="32.4" fill-opacity="0.45"/>
<rect x="261.7" y="158.8" width="13.2" height="91.2" fill-opacity="0.45"/>
<rect x="278.9" y="190.3" width="13.2" height="59.7" fill-opacity="0.45"/>
<text x="286" y="266" text-anchor="middle" font-size="11">13</text>
<rect x="296.1" y="93.0" width="13.2" height="157.0" fill-opacity="0.45"/>
<rect x="313.4" y="82.5" width="13.2" height="167.5" fill-opacity="0.45"/>
<rect x="330.6" y="178.5" width="13.2" height="71.5" fill-opacity="0.45"/>
<rect x="347.9" y="157.4" width="13.2" height="92.6" fill-opacity="0.45"/>
<text x="354" y="266" text-anchor="middle" font-size="11">17</text>
<rect x="365.1" y="115.6" width="13.2" height="134.4" fill-opacity="0.45"/>
<rect x="382.3" y="164.5" width="13.2" height="85.5" fill-opacity="0.45"/>
<rect x="399.6" y="30.0" width="13.2" height="220.0" fill-opacity="0.45"/>
<rect x="416.8" y="89.4" width="13.2" height="160.6" fill-opacity="0.45"/>
<text x="423" y="266" text-anchor="middle" font-size="11">21</text>
<rect x="434.1" y="87.3" width="13.2" height="162.7" fill-opacity="0.45"/>
<rect x="451.3" y="46.6" width="13.2" height="203.4" fill-opacity="0.45"/>
<rect x="468.6" y="30.0" width="13.2" height="220.0" fill-opacity="0.45"/>
<rect x="485.8" y="89.3" width="13.2" height="160.7" fill-opacity="0.45"/>
<text x="492" y="266" text-anchor="middle" font-size="11">25</text>
<rect x="503.0" y="221.4" width="13.2" height="28.6" fill-opacity="0.45"/>
<rect x="520.3" y="117.5" width="13.2" height="132.5" fill-opacity="0.45"/>
<rect x="537.5" y="130.1" width="13.2" height="119.9" fill-opacity="0.45"/>
<rect x="554.8" y="242.5" width="13.2" height="7.5" fill-opacity="1"/>
<text x="561" y="266" text-anchor="middle" font-size="11">29</text>
<line x1="70.0" y1="233.4" x2="570.0" y2="233.4" stroke="currentColor" stroke-width="1.4" stroke-dasharray="6 4" stroke-width="1.8"/>
<text x="576" y="238" text-anchor="start" font-size="12" font-weight="bold">B = 200</text>
<text x="320" y="284" text-anchor="middle" font-size="12">curve number c (the curve y² = x³ + cx + 1)</text>
<text x="570" y="20" text-anchor="end" font-size="12" font-weight="bold">curve 29: 1,002,018 = 2·3·23·53·137</text>
<text x="16" y="20" text-anchor="start" font-size="12">largest prime factor of the curve's order mod p</text>
</svg>
<figcaption>Figure 11.3. The elliptic curve lottery for p = 1000171. Each bar is the largest prime factor of the number of points on the curve y² = x³ + cx + 1 modulo p, on a log scale. Curves 2, 11 and 26 come close; curve 29 is the first whose order is 200-smooth, and it is the one that factors n.</figcaption>
</figure>

### How far it reaches

The analysis, which Lenstra made rigorous up to a plausible conjecture about
smooth numbers in short intervals, gives a running time of

$$L_p\big[1/2, \sqrt 2\big] \cdot (\log n)^2,$$

subexponential in the size of the **factor** $p$, not of $n$. That is what
makes ECM the method of choice for factors of 20 to 60 digits, and the
reason it is run on every number before a sieve is started. Peter Montgomery
made it practical with curves of the form $By^2 = x^3 + Ax^2 + x$ (1987), on
which $k \cdot P$ can be computed with $x$-coordinates alone and no inversions,
and with a fast stage 2. Later work added Edwards curves and the GMP-ECM
program of Paul Zimmermann and his colleagues, the standard tool. The largest
factor ever found by ECM, as of the records kept by Zimmermann, has 83 digits;
Ryan Propper found it in September 2013, in $7^{337} + 1$.

For RSA, ECM is no threat to a well-made key: a 1024-bit prime factor is far
beyond its reach, and its cost against a balanced modulus is worse than the
sieves'. But it is the reason **multi-prime RSA** has a limit. RFC 8017 allows a
modulus with more than two primes, which speeds up decryption; with $k$ primes,
each is $1/k$ of the modulus, and ECM's cost depends on that size. A 2048-bit
modulus with three primes of about 683 bits is still safe; with eight primes of
256 bits, ECM would find them. The usual advice keeps a 2048-bit modulus to
at most three primes.

!!! note "Life story: the elliptic curve method"
    **Born:** 1985, Hendrik Lenstra (University of Amsterdam), circulated that
    year and published as "Factoring integers with elliptic curves" in the
    *Annals of Mathematics* 126 (1987) · **Purpose:** keep the $p - 1$ idea but
    let the attacker choose a new group, and so a new group order, as often as
    needed · **Helped:** made factors of 40 to 80 digits routine (Montgomery's
    curves, GMP-ECM); taught cryptographers what elliptic curves could do,
    the same year that Koblitz and Miller proposed them for cryptography ·
    **Status:** the standard method for medium-sized factors, record 83 digits
    (2013); sets the limit on how many primes a multi-prime RSA modulus may have

## 11.7 Congruent squares and the quadratic sieve by hand

*Level: intermediate.*

Fermat looked for $a^2 - b^2 = n$ exactly. The general-purpose methods ask for
much less: two numbers $X$ and $Y$ with

$$X^2 \equiv Y^2 \pmod n, \qquad X \not\equiv \pm Y \pmod n.$$

Then $n$ divides $X^2 - Y^2 = (X - Y)(X + Y)$ but divides neither factor, so
some of $n$'s primes go into $X - Y$ and the others into $X + Y$, and
$\gcd(X - Y, n)$ is a proper factor. For $n = pq$, a random pair with
$X^2 \equiv Y^2$ gives a factor half the time: each square modulo $pq$ has four
square roots, $\pm Y$ and two others, and only two of the four are useless.

Maurice Kraitchik, a Belgian mathematician, saw in the 1920s how to build such a
pair from many small pieces instead of finding it in one go. Take numbers $a$
just above $\sqrt n$, so that $Q(a) = a^2 - n$ is small. Each one gives a
congruence $a^2 \equiv Q(a) \pmod n$. One $Q(a)$ is rarely a square. But if you
find several whose product is a square, then the product of the $a$'s, squared,
is congruent to that square. To find such a set, keep only the $Q(a)$ that are
smooth, factored completely over a small set of primes, and look at their
exponents. A product is a square exactly when every prime appears to an even
power, which is a question about exponents **modulo 2**: linear algebra over
the field with two elements, $\mathrm{GF}(2)$.

So the method has three steps. **Collect** relations: values $a$ for which
$Q(a)$ is smooth over a **factor base** of small primes. **Combine** them: find
a subset whose exponent vectors add up to zero mod 2. **Finish**: compute $X$
and $Y$ and a gcd. Michael Morrison and John Brillhart built the first fast
version in 1970, using the continued fraction of $\sqrt n$ to produce small
$Q$ values, and with it factored the seventh Fermat number, $F_7 = 2^{128} + 1$,
39 digits, published in 1975. John Dixon proved in 1981 that the random-squares
version runs in subexponential time. The step that made it fast came the same
year.

### The factor base

Which primes can divide $Q(a) = a^2 - n$? If $p$ divides it, then
$a^2 \equiv n \pmod p$, so $n$ must be a square modulo $p$. For about half of
all primes it is not, and those primes never divide any $Q(a)$. The factor base
is therefore 2 plus the odd primes $p \le B$ with Legendre symbol
$\left(\frac{n}{p}\right) = 1$, which Euler's criterion tests as
$n^{(p-1)/2} \equiv 1 \pmod p$.

### By hand: $n = 27619$

The square root of 27619 is 166.19..., so the first $a$ is 167. Take
$B = 11$. Is 27619 a square modulo 3, 5, 7 and 11? $27619 \equiv 1 \pmod 3$,
$\equiv 4 \pmod 5$, $\equiv 4 \pmod 7$ and $\equiv 9 \pmod{11}$: all squares. So
the factor base is $\{2, 3, 5, 7, 11\}$. (It happens that 27619 is a non-square
modulo every prime from 13 to 29, so raising $B$ to 29 would add nothing.)

Now look at $Q(a) = a^2 - 27619$ for $a = 167, 168, \ldots, 206$ and keep the
ones that factor completely over the factor base. Six of the forty do
(Figure 11.4):

| $a$ | $Q(a) = a^2 - n$ | factored | vector mod 2 (2, 3, 5, 7, 11) |
|---|---|---|---|
| 167 | 270 | $2 \cdot 3^3 \cdot 5$ | 1 1 1 0 0 |
| 168 | 605 | $5 \cdot 11^2$ | 0 0 1 0 0 |
| 173 | 2310 | $2 \cdot 3 \cdot 5 \cdot 7 \cdot 11$ | 1 1 1 1 1 |
| 184 | 6237 | $3^4 \cdot 7 \cdot 11$ | 0 0 0 1 1 |
| 187 | 7350 | $2 \cdot 3 \cdot 5^2 \cdot 7^2$ | 1 1 0 0 0 |
| 205 | 14406 | $2 \cdot 3 \cdot 7^4$ | 1 1 0 0 0 |

Six vectors in a space of dimension five must be linearly dependent, so at
least one subset sums to zero. That is why every sieve collects a few more
relations than there are primes in the factor base.

<figure class="mars-fig">
<svg viewBox="0 0 640 244" width="640" role="img" aria-label="A grid of 40 sieve positions for n = 27619 and the primes 2, 3, 5, 7, 11; the six fully smooth positions 167, 168, 173, 184, 187 and 205 are shaded" fill="currentColor" font-size="14">
<text x="56" y="58" text-anchor="end" font-size="12">p = 2</text>
<text x="56" y="82" text-anchor="end" font-size="12">p = 3</text>
<text x="56" y="106" text-anchor="end" font-size="12">p = 5</text>
<text x="56" y="130" text-anchor="end" font-size="12">p = 7</text>
<text x="56" y="154" text-anchor="end" font-size="12">p = 11</text>
<rect x="66.0" y="38.0" width="13.0" height="124.0" fill-opacity="0.15"/>
<circle cx="72.5" cy="54" r="4.2"/>
<circle cx="72.5" cy="78" r="6.6"/>
<circle cx="72.5" cy="102" r="4.2"/>
<text x="72" y="190" text-anchor="middle" font-size="11">167</text>
<line x1="72.5" y1="168.0" x2="72.5" y2="176.0" stroke="currentColor" stroke-width="1.4" stroke-opacity="0.5"/>
<rect x="79.0" y="38.0" width="13.0" height="124.0" fill-opacity="0.15"/>
<circle cx="85.5" cy="102" r="4.2"/>
<circle cx="85.5" cy="150" r="5.4"/>
<circle cx="98.5" cy="54" r="4.2"/>
<circle cx="98.5" cy="78" r="4.2"/>
<circle cx="111.5" cy="78" r="4.2"/>
<circle cx="111.5" cy="126" r="4.2"/>
<circle cx="124.5" cy="54" r="4.2"/>
<circle cx="137.5" cy="78" r="4.2"/>
<circle cx="137.5" cy="102" r="4.2"/>
<text x="138" y="190" text-anchor="middle" font-size="11">172</text>
<line x1="137.5" y1="168.0" x2="137.5" y2="176.0" stroke="currentColor" stroke-width="1.4" stroke-opacity="0.5"/>
<rect x="144.0" y="38.0" width="13.0" height="124.0" fill-opacity="0.15"/>
<circle cx="150.5" cy="54" r="4.2"/>
<circle cx="150.5" cy="78" r="4.2"/>
<circle cx="150.5" cy="102" r="4.2"/>
<circle cx="150.5" cy="126" r="4.2"/>
<circle cx="150.5" cy="150" r="4.2"/>
<circle cx="176.5" cy="54" r="4.2"/>
<circle cx="176.5" cy="78" r="5.4"/>
<circle cx="189.5" cy="78" r="5.4"/>
<circle cx="202.5" cy="54" r="4.2"/>
<circle cx="202.5" cy="102" r="4.2"/>
<circle cx="202.5" cy="126" r="4.2"/>
<text x="202" y="190" text-anchor="middle" font-size="11">177</text>
<line x1="202.5" y1="168.0" x2="202.5" y2="176.0" stroke="currentColor" stroke-width="1.4" stroke-opacity="0.5"/>
<circle cx="215.5" cy="78" r="4.2"/>
<circle cx="215.5" cy="102" r="4.2"/>
<circle cx="228.5" cy="54" r="4.2"/>
<circle cx="228.5" cy="78" r="4.2"/>
<circle cx="228.5" cy="150" r="4.2"/>
<circle cx="241.5" cy="126" r="4.2"/>
<circle cx="254.5" cy="54" r="4.2"/>
<circle cx="254.5" cy="78" r="4.2"/>
<circle cx="267.5" cy="78" r="4.2"/>
<circle cx="267.5" cy="102" r="4.2"/>
<text x="268" y="190" text-anchor="middle" font-size="11">182</text>
<line x1="267.5" y1="168.0" x2="267.5" y2="176.0" stroke="currentColor" stroke-width="1.4" stroke-opacity="0.5"/>
<circle cx="280.5" cy="54" r="4.2"/>
<circle cx="280.5" cy="102" r="4.2"/>
<rect x="287.0" y="38.0" width="13.0" height="124.0" fill-opacity="0.15"/>
<circle cx="293.5" cy="78" r="7.8"/>
<circle cx="293.5" cy="126" r="4.2"/>
<circle cx="293.5" cy="150" r="4.2"/>
<circle cx="306.5" cy="54" r="4.2"/>
<circle cx="306.5" cy="78" r="5.4"/>
<rect x="326.0" y="38.0" width="13.0" height="124.0" fill-opacity="0.15"/>
<circle cx="332.5" cy="54" r="4.2"/>
<circle cx="332.5" cy="78" r="4.2"/>
<circle cx="332.5" cy="102" r="5.4"/>
<circle cx="332.5" cy="126" r="5.4"/>
<text x="332" y="190" text-anchor="middle" font-size="11">187</text>
<line x1="332.5" y1="168.0" x2="332.5" y2="176.0" stroke="currentColor" stroke-width="1.4" stroke-opacity="0.5"/>
<circle cx="345.5" cy="78" r="4.2"/>
<circle cx="345.5" cy="102" r="5.4"/>
<circle cx="358.5" cy="54" r="4.2"/>
<circle cx="371.5" cy="78" r="4.2"/>
<circle cx="371.5" cy="150" r="4.2"/>
<circle cx="384.5" cy="54" r="4.2"/>
<circle cx="384.5" cy="78" r="4.2"/>
<circle cx="384.5" cy="126" r="4.2"/>
<circle cx="397.5" cy="102" r="4.2"/>
<text x="398" y="190" text-anchor="middle" font-size="11">192</text>
<line x1="397.5" y1="168.0" x2="397.5" y2="176.0" stroke="currentColor" stroke-width="1.4" stroke-opacity="0.5"/>
<circle cx="410.5" cy="54" r="4.2"/>
<circle cx="410.5" cy="78" r="5.4"/>
<circle cx="410.5" cy="102" r="4.2"/>
<circle cx="423.5" cy="78" r="6.6"/>
<circle cx="423.5" cy="126" r="4.2"/>
<circle cx="436.5" cy="54" r="4.2"/>
<circle cx="436.5" cy="150" r="5.4"/>
<circle cx="449.5" cy="78" r="4.2"/>
<circle cx="462.5" cy="54" r="4.2"/>
<circle cx="462.5" cy="78" r="4.2"/>
<circle cx="462.5" cy="102" r="4.2"/>
<text x="462" y="190" text-anchor="middle" font-size="11">197</text>
<line x1="462.5" y1="168.0" x2="462.5" y2="176.0" stroke="currentColor" stroke-width="1.4" stroke-opacity="0.5"/>
<circle cx="475.5" cy="102" r="4.2"/>
<circle cx="475.5" cy="126" r="4.2"/>
<circle cx="488.5" cy="54" r="4.2"/>
<circle cx="488.5" cy="78" r="4.2"/>
<circle cx="501.5" cy="78" r="4.2"/>
<circle cx="514.5" cy="54" r="4.2"/>
<circle cx="514.5" cy="126" r="4.2"/>
<circle cx="514.5" cy="150" r="4.2"/>
<circle cx="527.5" cy="78" r="5.4"/>
<circle cx="527.5" cy="102" r="4.2"/>
<text x="528" y="190" text-anchor="middle" font-size="11">202</text>
<line x1="527.5" y1="168.0" x2="527.5" y2="176.0" stroke="currentColor" stroke-width="1.4" stroke-opacity="0.5"/>
<circle cx="540.5" cy="54" r="4.2"/>
<circle cx="540.5" cy="78" r="5.4"/>
<circle cx="540.5" cy="102" r="4.2"/>
<rect x="560.0" y="38.0" width="13.0" height="124.0" fill-opacity="0.15"/>
<circle cx="566.5" cy="54" r="4.2"/>
<circle cx="566.5" cy="78" r="4.2"/>
<circle cx="566.5" cy="126" r="7.8"/>
<circle cx="579.5" cy="78" r="4.2"/>
<circle cx="579.5" cy="150" r="4.2"/>
<line x1="66.0" y1="172.0" x2="586.0" y2="172.0" stroke="currentColor" stroke-width="1.4" stroke-opacity="0.5"/>
<text x="326" y="208" text-anchor="middle" font-size="12">a, from 167 to 206; Q(a) = a² − 27619</text>
<text x="66" y="22" text-anchor="start" font-size="12">A dot where p divides Q(a); a bigger dot for a higher power. Shaded: Q(a) is 11-smooth.</text>
<text x="66" y="232" text-anchor="start" font-size="12" font-weight="bold">smooth: 167, 168, 173, 184, 187, 205</text>
</svg>
<figcaption>Figure 11.4. The sieve for n = 27619. Each prime of the factor base divides Q(a) at a regular pattern of positions, p apart (the prime 2 at every odd a). Where enough dots stack up, Q(a) is smooth: six of the forty values factor completely and become relations.</figcaption>
</figure>

**The linear algebra, by hand.** Write the six vectors as rows and eliminate,
column by column, keeping track of which original rows each new row is made of.

1. Column 2: take row 167 as the pivot. Rows 173, 187 and 205 also have a 1
   here; add row 167 to each. Row 173 becomes 0 0 0 1 1 (= 173 + 167), row 187
   becomes 0 0 1 0 0 (= 187 + 167), row 205 becomes 0 0 1 0 0 (= 205 + 167).
2. Column 3: no remaining row has a 1. Nothing to do.
3. Column 5: take row 168 as the pivot. Add it to the two rows that now have a
   1 here: row 187 becomes 0 0 0 0 0 (= 187 + 167 + 168), row 205 becomes
   0 0 0 0 0 (= 205 + 167 + 168).
4. Column 7: take the row 173 + 167 (0 0 0 1 1) as the pivot. Add it to row
   184: 0 0 0 0 0 (= 184 + 173 + 167).
5. Column 11: no row left with a 1.

Three rows have become zero, and each is a dependency:
$\{167, 168, 187\}$, $\{167, 168, 205\}$ and $\{167, 173, 184\}$. (Their sums
are dependencies too; $\{187, 205\}$, for instance, is visible at a glance, since
the two rows are equal.)

**Finishing.** Take $\{167, 168, 187\}$. The product of the $Q$ values is

$$270 \cdot 605 \cdot 7350 = 2^2 \cdot 3^4 \cdot 5^4 \cdot 7^2 \cdot 11^2,$$

a square, with square root $Y = 2 \cdot 3^2 \cdot 5^2 \cdot 7 \cdot 11 = 34650
\equiv 7031 \pmod{27619}$. The product of the $a$ values is
$X = 167 \cdot 168 \cdot 187 \equiv 26481$. Then $X^2 \equiv Y^2$, and

$$\gcd(26481 - 7031,\ 27619) = \gcd(19450,\ 27619) = 389.$$

The dependency $\{167, 173, 184\}$ gives $X = 13096$, $Y = 7132$ and
$\gcd(5964, 27619) = 71$, the other factor. And the dependency
$\{167, 168, 205\}$ shows the bad case: it gives $X = 6728$ and $Y = 20891$,
and $6728 + 20891 = 27619$, so $X \equiv -Y$ and the gcd is trivial. A real
sieve collects enough extra relations to have dozens of dependencies, and each
one is an independent coin toss with a one-in-two chance of failure.

### What the sieve adds

The method so far is Dixon's or Kraitchik's. Carl Pomerance's contribution, in
1981, was to notice that testing each $Q(a)$ for smoothness by trial division
is wasteful, because divisibility of $Q(a)$ by $p$ is periodic in $a$. If $t$ is
a square root of $n$ modulo $p$, then $p$ divides $Q(a)$ exactly when
$a \equiv \pm t \pmod p$. For $p = 7$ and $n = 27619 \equiv 4$, the roots are
$\pm 2$, so 7 divides $Q(a)$ for $a \equiv 2$ and $a \equiv 5 \pmod 7$: at 170,
173, 177, 180, 184, 187, ..., every seventh position starting from each root.
That is the regular pattern of dots in Figure 11.4, and it means a sieve, like
Eratosthenes', can mark all the multiples of every prime in an array of length
$M$ with about $M \sum_p 2/p \approx 2M \ln\ln B$ additions, no divisions at all.
Instead of marking, add $\log p$ to each position; at the end, the positions
whose total is close to $\log Q(a)$ are smooth, and only those are factored.
That is the **quadratic sieve**, and the sieve is why the method is fast.

!!! note "Life story: the congruence of squares"
    **Born:** the 1920s, Maurice Kraitchik, generalizing Fermat's difference of
    squares from $a^2 - b^2 = n$ to $X^2 \equiv Y^2 \pmod n$ built from many small
    pieces · **Purpose:** factor numbers with no special structure, in time that
    depends only on their size · **Helped:** Morrison and Brillhart's continued
    fraction method (1970, $F_7$), Dixon's proof (1981), the quadratic sieve and
    the number field sieve: every general-purpose record since 1970 ·
    **Status:** the idea behind all the record factorizations; only Shor's
    algorithm works differently

## 11.8 The quadratic sieve in code, and RSA-129

*Level: intermediate.*

The code follows the three steps. It builds the factor base with Euler's
criterion, sieves an interval with logarithms, factors the positions that look
smooth, and runs Gaussian elimination mod 2 with each row stored as the bits of
a Python integer, so that adding two rows is one XOR. Each row carries a second
integer that records which relations it is made of, exactly as in the hand
elimination.

```python
from math import gcd, isqrt, log

def primes_upto(b):
    sieve = bytearray([1]) * (b + 1)
    sieve[0:2] = b"\x00\x00"
    for i in range(2, isqrt(b) + 1):
        if sieve[i]:
            sieve[i * i::i] = bytearray(len(sieve[i * i::i]))
    return [i for i in range(b + 1) if sieve[i]]

def sqrt_mod(n, p):                      # a square root of n mod a small prime p, by search
    n %= p
    for t in range(p):
        if t * t % p == n:
            return t

def quadratic_sieve(n, B, M):
    m = isqrt(n) + 1
    # the factor base: 2 and the odd primes p <= B for which n is a square mod p
    fb = [p for p in primes_upto(B) if p == 2 or pow(n, (p - 1) // 2, p) == 1]
    # the sieve: add log p at every x where p divides Q(x) = (m + x)^2 - n
    logs = [0.0] * M
    for p in fb:
        t = sqrt_mod(n, p)
        for r in {t, p - t}:
            for x in range((r - m) % p, M, p):
                logs[x] += log(p)
    rels = []
    for x in range(M):
        q = (m + x) ** 2 - n
        if logs[x] > log(q) - 3 * log(B):    # close enough to smooth: factor it
            v, vec = q, 0
            for i, p in enumerate(fb):
                while v % p == 0:
                    v //= p
                    vec ^= 1 << i            # the exponent vector mod 2, as bits
            if v == 1:
                rels.append((m + x, q, vec))
        if len(rels) > len(fb) + 10:
            break
    return fb, rels

def dependencies(rels, width):
    # Gaussian elimination mod 2; each row remembers which relations it is made of
    rows = [(vec, 1 << i) for i, (_, _, vec) in enumerate(rels)]
    for col in range(width):
        pivot = next((r for r in rows if r[0] >> col & 1), None)
        if pivot is None:
            continue
        rows.remove(pivot)
        rows = [(v ^ pivot[0], h ^ pivot[1]) if v >> col & 1 else (v, h) for v, h in rows]
    return [h for v, h in rows if v == 0]

def factor(n, B, M):
    fb, rels = quadratic_sieve(n, B, M)
    deps = dependencies(rels, len(fb))
    print(len(fb), "primes in the factor base,", len(rels), "relations,", len(deps), "dependencies")
    for h in deps:
        chosen = [rels[i] for i in range(len(rels)) if h >> i & 1]
        X, Y2 = 1, 1
        for a, q, _ in chosen:
            X = X * a % n
            Y2 *= q
        Y = isqrt(Y2) % n                # Y2 is a perfect square by construction
        d = gcd(X - Y, n)
        if 1 < d < n:
            return d, n // d
    return None

print(factor(27619, 11, 40))
print(factor(100000000003 * 300000000077, 2000, 2000000))   # 23 digits
```

```text
5 primes in the factor base, 6 relations, 3 dependencies
(71, 389)
143 primes in the factor base, 149 relations, 13 dependencies
(100000000003, 300000000077)
```

The first line repeats the hand calculation: five primes, the same six
relations, the same three dependencies. By hand, $\{167, 168, 187\}$ gave 389;
the code tries the dependencies in the order its elimination leaves them and
happens to reach 71 first. The second is a 23-digit
number with two 12-digit factors that are not close, so Fermat is useless, and
too large for rho to be quick in Python. The sieve finds it in about a second.

The threshold `log(q) - 3 * log(B)` is generous: it lets through positions where
a prime power such as $7^4$ was counted only once by the sieve, at the cost of
trial-dividing a few positions that turn out not to be smooth. Real sieves
also skip the smallest primes (2, 3, 5, 7 contribute little to the logarithm
and cost the most to sieve) and allow for it in the threshold.

### Why it runs in $L_n[1/2, 1]$

The values $Q(a)$ near $\sqrt n$ are about $2M\sqrt n$, a little more than
$\sqrt n$. If the factor base goes up to $B$, a $Q(a)$ is $B$-smooth with
probability about $u^{-u}$ with $u = \ln \sqrt n / \ln B$, and you need about
$\pi(B) \approx B/\ln B$ relations. Make $B$ bigger and smooth values become
more common but you need more of them, and the matrix grows. Balancing the two
gives

$$B = L_n[1/2, 1/2], \qquad \text{total time } L_n[1/2, 1].$$

§11.13 does the calculation. The point to take away is the source of the
$1/2$: the numbers that must be smooth are about $\sqrt n$ in size. The number
field sieve wins by making them smaller.

### Making it practical

Three improvements turned the quadratic sieve into a record-setter.

- **Multiple polynomials.** As $a$ moves away from $\sqrt n$, $Q(a)$ grows, and
  smooth values thin out. Peter Montgomery's idea, published by Robert Silverman
  in 1987 as the **multiple polynomial quadratic sieve** (MPQS), uses many
  polynomials $Q(x) = (Ax + B)^2 - n$ with $B^2 \equiv n \pmod A$, each sieved
  only over a short interval where its values are smallest. It also splits the
  work naturally: each machine sieves its own polynomials. The **self-initializing**
  variant (SIQS) switches polynomials very cheaply and is the version used today
  for numbers up to about 100 digits.
- **Large primes.** A $Q(a)$ that is smooth except for one prime a little above
  $B$ is a **partial relation**. One partial is useless, but two partials with
  the same large prime multiply into a full relation, and by the birthday
  bound such pairs become common once many partials are collected. With two
  large primes per relation the yield rises again.
- **Sparse linear algebra.** The matrix is huge but almost empty: each row has a
  few dozen ones among hundreds of thousands of columns. Structured Gaussian
  elimination first shrinks it; then iterative methods built for sparse
  matrices over $\mathrm{GF}(2)$, Montgomery's block Lanczos and Coppersmith's
  block Wiedemann, finish it in time about the square of the dimension instead
  of the cube.

### RSA-129

RSA-129 was the number in Gardner's 1977 column: 129 decimal digits, 426 bits,
with $e = 9007$. In 1993 Derek Atkins (MIT), Michael Graff (Iowa State), Arjen
Lenstra (then at Bellcore) and Paul Leyland (Oxford) organized an attack with
MPQS and two large primes, by electronic mail. Lenstra had written software
that let any volunteer's workstation sieve its own share of polynomials and
mail back the relations. About 600 volunteers in more than twenty countries,
running some 1,600 machines from PCs to a supercomputer, sieved for about eight
months, an effort later put at about 5,000 MIPS-years (a MIPS-year is a year on
a machine doing a million instructions a second, roughly a 1980 minicomputer).
The relations, with the partials combined, made a matrix that was reduced to
about 188,000 columns and solved in two days on a MasPar parallel computer at
Bellcore. On 26 April 1994 they announced the factors, one of 64 digits and one
of 65, and the message.

The factors and the ciphertext are public. Check the result yourself:

```python
p = 3490529510847650949147849619903898133417764638493387843990820577
q = 32769132993266709549961988190834461413177642967992942539798288533
n = p * q                                # RSA-129
e = 9007
c = int("96869613754622061477140922254355882905759991124574319874695120930816298"
        "225145708356931476622883989628013391990551829945157815154")
d = pow(e, -1, (p - 1) * (q - 1))        # the private key, from the factors
m = str(pow(c, d, n))
m = "0" * (len(m) % 2) + m               # two digits a letter: 00 is a space, 01 is A
print(len(str(n)), "digits")
print("".join(" " if m[i:i + 2] == "00" else chr(64 + int(m[i:i + 2])) for i in range(0, len(m), 2)))
```

```text
129 digits
THE MAGIC WORDS ARE SQUEAMISH OSSIFRAGE
```

An ossifrage is a bearded vulture, a "bone-breaker". The phrase was chosen
by the inventors to be impossible to guess. Rivest's estimate of 40
quadrillion years had been made for the best algorithm known in 1977 on the
computers of 1977, and it was reasonable for both. Seventeen years of algorithm
design (the sieve, multiple polynomials, large primes, sparse linear algebra)
and the internet as a computer had together removed a factor of about
$10^{15}$.

!!! note "Life story: the quadratic sieve"
    **Born:** 1981, Carl Pomerance (University of Georgia), in "Analysis and
    comparison of some integer factoring algorithms" (published 1982) ·
    **Purpose:** find smooth values of $a^2 - n$ by sieving instead of trial
    division, turning Kraitchik's congruence of squares into a fast general
    method · **Helped:** with Montgomery and Silverman's multiple polynomials
    (1987), factored RSA-100 (1991), RSA-120 (1993) and RSA-129 (1994); it held
    every general-purpose record until 1996 · **Status:** the fastest method
    for numbers below about 100 digits; above that, the number field sieve
    wins

!!! note "Life story: RSA-129"
    **Born:** August 1977, Martin Gardner's "Mathematical Games" column in
    *Scientific American*, with a \$100 prize · **Purpose:** show how secure RSA
    was thought to be: 40 quadrillion years, by Rivest's estimate ·
    **Helped:** factored on 26 April 1994 by Atkins, Graff, Lenstra and Leyland
    with about 600 volunteers and MPQS, about 5,000 MIPS-years; it made
    distributed factoring by volunteers a standard technique and showed that
    estimates of hardness age with the algorithms · **Status:** solved; the
    prize went to the Free Software Foundation

## 11.9 The number field sieve

*Level: expert.*

The quadratic sieve needs numbers of size about $\sqrt n$ to be smooth. The
**number field sieve** (NFS) needs two numbers of size about
$n^{1/d}$ each, for a degree $d$ of 4 to 6, to be smooth at once. Two smaller
numbers are much more likely to be smooth than one large one, and for large
$n$ the gain outweighs every extra cost the method has.

### How it started

In 1988 John Pollard wrote to Andrew Odlyzko and
others with an idea for factoring numbers of the special form $x^3 + k$, using
arithmetic in the ring $\mathbb{Z}[\sqrt[3]{-k}]$. Arjen Lenstra, Hendrik
Lenstra and Mark Manasse took it up, and in 1990, with Pollard, they factored
the ninth Fermat number $F_9 = 2^{512} + 1$, 155 digits, by the method now
called the **special number field sieve** (SNFS). Joe Buhler, Hendrik Lenstra
and Carl Pomerance extended it to numbers of no special form, the **general
number field sieve** (GNFS), and the collection *The development of the number
field sieve* (1993) gathered the papers. In April 1996 GNFS factored RSA-130,
and from then on it has held every general-purpose record.

### The two sides

Pick a degree $d$ and an integer $m$ near $n^{1/d}$, and write $n$ in base $m$:
$n = c_d m^d + c_{d-1} m^{d-1} + \cdots + c_0$, with each $c_i$ smaller than $m$.
That gives a polynomial

$$f(x) = c_d x^d + \cdots + c_0, \qquad f(m) = n \equiv 0 \pmod n.$$

Let $\alpha$ be a root of $f$ (a complex number, not an integer). The ring
$\mathbb{Z}[\alpha]$ consists of the expressions $a_0 + a_1\alpha + \cdots +
a_{d-1}\alpha^{d-1}$, and the map $\varphi$ that sends $\alpha$ to $m$ and then
reduces modulo $n$ respects addition and multiplication, because $f(\alpha) = 0$
and $f(m) \equiv 0$. That map is the bridge between two worlds (Figure 11.5).

For a pair of small coprime integers $(a, b)$, look at two numbers:

- on the **rational side**, the integer $a - bm$, which has size about $m$,
  that is about $n^{1/d}$;
- on the **algebraic side**, the algebraic number $a - b\alpha$, whose **norm**
  is the integer $b^d f(a/b)$ (up to sign), also of size about $n^{1/d}$ times
  a power of the size of $a$ and $b$.

A pair is a relation when both are smooth: $a - bm$ over the small primes, and
the norm of $a - b\alpha$ over the small primes, which (with some care) means
$a - b\alpha$ factors into small **prime ideals** of the ring. Sieving works on
both sides, because divisibility of $a - bm$ and of $b^d f(a/b)$ by a prime $p$
is again periodic in $a$ for fixed $b$. Collect more relations than there are
primes and ideals in the two factor bases, find by linear algebra mod 2 a set
$S$ of pairs for which both products are squares,

$$\prod_{(a,b) \in S} (a - bm) = y^2, \qquad \prod_{(a,b) \in S} (a - b\alpha) = \beta^2,$$

and apply the bridge. $\varphi(a - b\alpha) = a - bm \bmod n$, so
$\varphi(\beta)^2 \equiv y^2 \pmod n$, and $\gcd(\varphi(\beta) - y, n)$ is a
factor with probability one half.

<figure class="mars-fig">
<svg viewBox="0 0 640 390" width="640" role="img" aria-label="The two sides of the number field sieve: each pair (a, b) gives a number a − bm and an algebraic number a − bα; both must be smooth; linear algebra picks a set whose products are squares on both sides; the map from alpha to m joins them into a congruence of squares mod n" fill="currentColor" font-size="14">
<defs><marker id="f11-ar2" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
<rect x="230.0" y="20.0" width="180.0" height="44.0" fill="none" stroke="currentColor" stroke-width="1.4" rx="6"/>
<text x="320" y="40" text-anchor="middle" font-weight="bold">pairs (a, b)</text>
<text x="320" y="57" text-anchor="middle" font-size="12">coprime, small</text>
<rect x="20.0" y="110.0" width="250.0" height="70.0" fill="none" stroke="currentColor" stroke-width="1.4" rx="6"/>
<text x="145" y="132" text-anchor="middle" font-weight="bold">rational side: Z</text>
<text x="145" y="152" text-anchor="middle">a − bm</text>
<text x="145" y="170" text-anchor="middle" font-size="12">must be smooth over small primes</text>
<rect x="370.0" y="110.0" width="250.0" height="70.0" fill="none" stroke="currentColor" stroke-width="1.4" rx="6"/>
<text x="495" y="132" text-anchor="middle" font-weight="bold">algebraic side: Z[α]</text>
<text x="495" y="152" text-anchor="middle">a − bα, norm b^d·f(a/b)</text>
<text x="495" y="170" text-anchor="middle" font-size="12">norm must be smooth over prime ideals</text>
<line x1="280.0" y1="64.0" x2="160.0" y2="108.0" stroke="currentColor" stroke-width="1.4" marker-end="url(#f11-ar2)"/>
<line x1="360.0" y1="64.0" x2="480.0" y2="108.0" stroke="currentColor" stroke-width="1.4" marker-end="url(#f11-ar2)"/>
<rect x="20.0" y="230.0" width="250.0" height="54.0" fill="none" stroke="currentColor" stroke-width="1.4" rx="6"/>
<text x="145" y="252" text-anchor="middle">product over a set S</text>
<text x="145" y="272" text-anchor="middle">= a square y² in Z</text>
<rect x="370.0" y="230.0" width="250.0" height="54.0" fill="none" stroke="currentColor" stroke-width="1.4" rx="6"/>
<text x="495" y="252" text-anchor="middle">product over the same S</text>
<text x="495" y="272" text-anchor="middle">= a square β² in Z[α]</text>
<line x1="145.0" y1="182.0" x2="145.0" y2="228.0" stroke="currentColor" stroke-width="1.4" marker-end="url(#f11-ar2)"/>
<line x1="495.0" y1="182.0" x2="495.0" y2="228.0" stroke="currentColor" stroke-width="1.4" marker-end="url(#f11-ar2)"/>
<text x="320" y="210" text-anchor="middle" font-size="12">linear algebra mod 2</text>
<text x="320" y="226" text-anchor="middle" font-size="12">picks S</text>
<rect x="170.0" y="320.0" width="300.0" height="54.0" fill="none" stroke="currentColor" stroke-width="2" rx="6"/>
<text x="320" y="342" text-anchor="middle">φ: α ↦ m (mod n) sends β to x</text>
<text x="320" y="362" text-anchor="middle" font-weight="bold">x² ≡ y² (mod n), then gcd(x − y, n)</text>
<line x1="145.0" y1="286.0" x2="240.0" y2="318.0" stroke="currentColor" stroke-width="1.4" marker-end="url(#f11-ar2)"/>
<line x1="495.0" y1="286.0" x2="400.0" y2="318.0" stroke="currentColor" stroke-width="1.4" marker-end="url(#f11-ar2)"/>
</svg>
<figcaption>Figure 11.5. The number field sieve's two sides. Each candidate pair (a, b) must be smooth twice, once as an ordinary integer and once in the number ring; linear algebra picks a set of pairs that is a square on both sides; the ring map α ↦ m turns the algebraic square into a number mod n, and the two squares are congruent.</figcaption>
</figure>

The hard part hidden in "with some care" is that a product of ideals being a
square does not quite make the element a square, because the ring may lack
unique factorization and have units. The fix, due to Leonard Adleman, adds a
few dozen extra columns to the matrix, **quadratic characters**, that detect
the obstruction with high probability. The last step, computing $\beta$ from
$\beta^2$, is an algebraic square root; Montgomery and Phong Nguyen gave the
methods that are used.

### The steps of a real run

A record NFS factorization has five stages, and they are worth knowing because
the published records report their cost stage by stage.

1. **Polynomial selection.** Search for a pair of polynomials (base-$m$ is the
   simplest; Kleinjung's 2006 method is the standard) whose values are small
   and have many small prime factors. A few percent of the total time, and a
   good choice saves far more than that.
2. **Sieving.** Find the relations: billions of them for a 768-bit number. This
   is most of the work, and it splits into independent pieces, one per range
   of special primes (lattice sieving, Pollard 1993), across as many machines
   as you have.
3. **Filtering.** Remove duplicates and singletons (relations with an ideal that
   appears nowhere else), and merge relations to shrink the matrix.
4. **Linear algebra.** Find dependencies in a sparse matrix over
   $\mathrm{GF}(2)$ with hundreds of millions of rows, by block Wiedemann. This
   part needs fast networks between the machines and is the hardest to spread
   out.
5. **Square root.** Compute $\beta$ and the gcd. Minutes.

Free software does all of this: CADO-NFS, from the French research institute
Inria, used for the 2019 and 2020 records, and Msieve with GGNFS, used by
volunteers.

### The complexity

The numbers that must be smooth have size about $n^{2/d}$ in total for the
best pairs. Choosing $d$ about $(3 \ln n / \ln\ln n)^{1/3}$ to balance the two
sides, and the factor bases as in the quadratic sieve, gives

$$L_n\Big[\tfrac13, \sqrt[3]{64/9}\Big] = L_n[1/3, 1.923]$$

for the general number field sieve, and

$$L_n\Big[\tfrac13, \sqrt[3]{32/9}\Big] = L_n[1/3, 1.526]$$

for the special one, where the polynomial's coefficients are tiny because $n$
has a short algebraic description. The exponent $1/3$ is the whole story: in
the formula it multiplies $\ln n$ under a cube root rather than a square root,
so doubling the length of $n$ multiplies the exponent of the cost by about
$2^{1/3} \approx 1.26$, not $2^{1/2} \approx 1.41$. The crossover with the
quadratic sieve sits near 100 digits; at 155 digits the NFS is several times
faster, and at 300 digits the quadratic sieve is out of the question.

!!! note "Life story: the number field sieve"
    **Born:** 1988, John Pollard's letter on factoring $x^3 + k$; special form
    by Lenstra, Lenstra, Manasse and Pollard (1990, $F_9$); general form by
    Buhler, Lenstra and Pomerance (1993) · **Purpose:** make the numbers that
    must be smooth smaller than $\sqrt n$ by working in a number ring as well
    as in the integers · **Helped:** every general-purpose factoring record since
    RSA-130 (1996), and the discrete logarithm records of
    [Chapter 12](12-Discrete-Logarithms.md) · **Status:** the best known
    classical method for factoring RSA moduli; its cost formula sets RSA key
    sizes in SP 800-57 and every other key-size table

## 11.10 The records, and what they mean for 2048-bit keys

*Level: expert.*

RSA Laboratories ran a public factoring challenge from 1991 to 2007, with
numbered moduli whose factors nobody knew, because the key generator that made
them was destroyed. The numbers are still the yardstick, though the prizes were
withdrawn in 2007. Figure 11.6 puts the main records next to a 2048-bit key.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Bar chart of factoring records in bits: RSA-129 426, RSA-155 512, RSA-768 768, RSA-240 795, RSA-250 829, the special number 2 to the 1039 minus 1 at 1039, against an unfactored 2048-bit bar" fill="currentColor" font-size="14">
<line x1="200.0" y1="20.0" x2="200.0" y2="252.0" stroke="currentColor" stroke-width="1.4" stroke-opacity="0.25"/>
<text x="200" y="270" text-anchor="middle" font-size="12">0</text>
<line x1="300.0" y1="20.0" x2="300.0" y2="252.0" stroke="currentColor" stroke-width="1.4" stroke-opacity="0.25"/>
<text x="300" y="270" text-anchor="middle" font-size="12">512</text>
<line x1="400.0" y1="20.0" x2="400.0" y2="252.0" stroke="currentColor" stroke-width="1.4" stroke-opacity="0.25"/>
<text x="400" y="270" text-anchor="middle" font-size="12">1,024</text>
<line x1="500.0" y1="20.0" x2="500.0" y2="252.0" stroke="currentColor" stroke-width="1.4" stroke-opacity="0.25"/>
<text x="500" y="270" text-anchor="middle" font-size="12">1,536</text>
<line x1="600.0" y1="20.0" x2="600.0" y2="252.0" stroke="currentColor" stroke-width="1.4" stroke-opacity="0.25"/>
<text x="600" y="270" text-anchor="middle" font-size="12">2,048</text>
<text x="400" y="290" text-anchor="middle" font-size="12">bits</text>
<text x="192" y="42" text-anchor="end" font-size="13">RSA-129, 1994 (QS)</text>
<rect x="200.0" y="26.0" width="83.2" height="22.0" fill-opacity="0.6" rx="3"/>
<text x="289" y="42" text-anchor="start" font-size="12">426</text>
<text x="192" y="74" text-anchor="end" font-size="13">RSA-155, 1999</text>
<rect x="200.0" y="58.0" width="100.0" height="22.0" fill-opacity="0.6" rx="3"/>
<text x="306" y="74" text-anchor="start" font-size="12">512</text>
<text x="192" y="106" text-anchor="end" font-size="13">RSA-768, 2009</text>
<rect x="200.0" y="90.0" width="150.0" height="22.0" fill-opacity="0.6" rx="3"/>
<text x="356" y="106" text-anchor="start" font-size="12">768</text>
<text x="192" y="138" text-anchor="end" font-size="13">RSA-240, 2019</text>
<rect x="200.0" y="122.0" width="155.3" height="22.0" fill-opacity="0.6" rx="3"/>
<text x="361" y="138" text-anchor="start" font-size="12">795</text>
<text x="192" y="170" text-anchor="end" font-size="13">RSA-250, 2020</text>
<rect x="200.0" y="154.0" width="161.9" height="22.0" fill-opacity="0.9" rx="3"/>
<text x="368" y="170" text-anchor="start" font-size="12">829</text>
<text x="192" y="202" text-anchor="end" font-size="13">2<tspan dy="-6" font-size="10">1039</tspan><tspan dy="6"> − 1, 2007 (SNFS)</tspan></text>
<rect x="200.0" y="186.0" width="202.9" height="22.0" fill-opacity="0.35" rx="3"/>
<text x="409" y="202" text-anchor="start" font-size="12">1039</text>
<text x="192" y="234" text-anchor="end" font-size="13">RSA-2048: not factored</text>
<rect x="200.0" y="218.0" width="400.0" height="22.0" fill-opacity="0.12" rx="3" stroke="currentColor" stroke-dasharray="5 3"/>
</svg>
<figcaption>Figure 11.6. Factoring records in bits, against a 2048-bit modulus. The general-purpose record has grown from 426 to 829 bits in 26 years; the special number 2¹⁰³⁹ − 1 shows how much further a number with a short description can be pushed. Neither is close to 2048.</figcaption>
</figure>

**RSA-155, 1999.** On 22 August 1999 a team led by Herman te Riele of CWI in
Amsterdam, with Stefania Cavallar, Bruce Dodson, Arjen Lenstra, Walter Lioen,
Peter Montgomery, Brian Murphy, Paul Zimmermann and others, factored the
512-bit RSA-155 by GNFS. Sieving ran for about three and a half months on some
300 workstations and PCs, the matrix of about 6.7 million rows was solved on a
Cray C916 at SARA in Amsterdam, and the total was estimated at 8,000
MIPS-years. 512 bits was then the size of most keys protecting web commerce,
and of all exported US software's keys. Sixteen years later the "Factoring as a
Service" project of Luke Valenta, Nadia Heninger and colleagues factored
512-bit keys in about four hours for about \$75 of rented cloud computing,
which is what made the FREAK attack on export-grade TLS practical.

**RSA-768, 2009.** On 12 December 2009 Thorsten Kleinjung, Kazumaro Aoki, Jens
Franke, Arjen Lenstra, Emmanuel Thomé, Joppe Bos, Pierrick Gaudry, Alexander
Kruppa, Peter Montgomery, Dag Arne Osvik, Herman te Riele, Andrey Timofeev and
Paul Zimmermann finished factoring the 232-digit RSA-768. Polynomial
selection took about half a year, sieving about two years on hundreds of
machines across several countries, and the matrix had 192,796,550 rows; the
whole effort was put at almost 2,000 years of one core of a 2.2 GHz AMD
Opteron. The authors expected 1024-bit moduli to fall to an academic effort within
the next decade and advised phasing them out, which NIST had already scheduled
for 2010.

**RSA-240 and RSA-250, 2019 and 2020.** Fabrice Boudot, Pierrick Gaudry, Aurore
Guillevic, Nadia Heninger, Emmanuel Thomé and Paul Zimmermann factored the
795-bit RSA-240 on 2 December 2019 and the 829-bit RSA-250 on 28 February 2020,
with CADO-NFS. RSA-240 took about 900 core-years, measured on 2.1 GHz Intel
Xeon Gold 6130 cores, and RSA-250 about 2,700. At the same time they computed a
795-bit discrete logarithm, about 3,100 core-years, and showed in their paper
that the two problems now cost about the same at equal size. Their RSA-240 run
took less time than an extrapolation from RSA-768 on the same hardware
predicted for that size: better software, not only faster cores.

!!! note "Life story: RSA-250"
    **Born:** the RSA Factoring Challenge (1991), number RSA-250 (829 bits) ·
    **Purpose:** measure the state of the art against moduli with no special
    form · **Helped:** factored on 28 February 2020 by Boudot, Gaudry,
    Guillevic, Heninger, Thomé and Zimmermann, about 2,700 core-years, with open
    software; with RSA-240 it gave the best calibration yet of the number field
    sieve's real cost · **Status:** the general-purpose record as of this
    writing; RSA-260 and every larger challenge number remain unfactored

### Extrapolating to 2048 bits

How much harder is 2048 bits? Take the L-formula, drop the $o(1)$, and scale it
so that 829 bits costs 2,700 core-years:

```python
from math import exp, log

def L(bits, alpha=1/3, c=(64 / 9) ** (1 / 3)):
    ln_n = bits * log(2)
    return exp(c * ln_n ** alpha * log(ln_n) ** (1 - alpha))

base = L(829)                            # RSA-250: about 2,700 core-years in 2020
for bits in (512, 768, 829, 1024, 2048, 3072, 4096):
    years = 2700 * L(bits) / base
    print(f"{bits:5} bits: L = 2^{log(L(bits), 2):5.1f}, about {years:.1e} core-years")
```

```text
  512 bits: L = 2^ 63.9, about 7.2e-02 core-years
  768 bits: L = 2^ 76.5, about 4.4e+02 core-years
  829 bits: L = 2^ 79.1, about 2.7e+03 core-years
 1024 bits: L = 2^ 86.8, about 5.4e+05 core-years
 2048 bits: L = 2^116.9, about 6.3e+14 core-years
 3072 bits: L = 2^138.7, about 2.4e+21 core-years
 4096 bits: L = 2^156.5, about 5.3e+26 core-years
```

The crude model is not bad where it can be checked: about a month of core time
for 512 bits fits the four-hour cloud runs on a few hundred cores, and its 440
core-years for 768 bits is below the 2009 figure of 2,000 because the 2009
software was slower. Its prediction for 1024 bits, about half a million
core-years, is within the budget of a national agency with a dedicated
machine, which is why 1024-bit RSA was disallowed for new signatures after 2013
and is assumed broken by well-funded attackers. For 2048 bits it says about
$6 \times 10^{14}$ core-years: if every one of the world's billions of CPU cores
worked on one key, it would take tens of thousands of years.

NIST's SP 800-57 Part 1 turns the same formula into security levels: 1024-bit
RSA gives about 80 bits, 2048-bit about 112, 3072-bit about 128, 7680-bit about
192 and 15360-bit about 256. SP 800-56B, for RSA key establishment, and FIPS
186-5, for signatures, allow 2048 bits and larger. NIST's transition plan of
2024 deprecates 112-bit RSA after 2030 and all RSA after 2035, and the reason is
not the number field sieve. It is Shor's algorithm (§11.12). Absent a new
classical idea, 2048-bit keys are safe from factoring by sieves for decades;
what has moved the deadline is the quantum risk to data that must stay secret
for a long time.

## 11.11 Special-form numbers

*Level: expert.*

The special number field sieve needs a polynomial with tiny coefficients, and
numbers like $2^{1039} - 1$ or $b^k \pm 1$ have one for free: $2^{1039} - 1 =
2 \cdot (2^{173})^6 - 1$ gives $f(x) = 2x^6 - 1$ with $m = 2^{173}$. Its cost is
$L[1/3, 1.526]$ instead of $1.923$, which at a thousand bits is a factor of
many thousands. So special numbers are factored at sizes far beyond the
general record, and their records are a separate list.

The oldest customers are the **Mersenne numbers** $2^k - 1$ and the **Cunningham
numbers** $b^k \pm 1$ for small $b$. The Cunningham project, begun in 1925 by
Allan Cunningham and H. J. Woodall and kept since 1983 by John Brillhart, Sam
Wagstaff and colleagues, publishes tables of their factors; it has been the
proving ground for every factoring method in this chapter, and $F_7$, $F_8$ and
$F_9$ were all Cunningham numbers. Mersenne primes themselves are found by the
Lucas-Lehmer test, a different problem; the factoring side is the composite
$2^k - 1$ with prime $k$.

**The kilobit SNFS, 2007.** Kazumaro Aoki (NTT), Jens Franke and Thorsten
Kleinjung (University of Bonn), Arjen Lenstra and Dag Arne Osvik (EPFL)
factored $2^{1039} - 1$ by SNFS, announced in May 2007. A factor of 23 bits,
5080711, was already known; they split the remaining 307-digit cofactor into
primes of 80 and 227 digits, using machines at the three institutions for most
of a year. It was the first factorization of a number of more than 1,000 bits
by a sieve. In 2014 Kleinjung, Bos and Lenstra described a "factorization
factory" that reuses one expensive precomputation across many Mersenne numbers
of similar size and factored seventeen of them between $2^{1007} - 1$ and
$2^{1199} - 1$.

What this means for RSA is twofold. An RSA modulus is a random number with no
short algebraic description, so SNFS does not apply and the 1,039-bit record
says nothing about 1024-bit keys directly. But it says the sieving and linear
algebra of a kilobit problem were within an academic budget in 2007, and that
the extra difficulty of a 1024-bit RSA modulus is "only" the gap between the
two constants. The related danger for cryptography is a prime or modulus that
*does* have a special form. In
[Chapter 12](12-Discrete-Logarithms.md) the same trick, a special number field
sieve for discrete logarithms, makes it possible to hide a trapdoor in a
Diffie-Hellman prime that looks ordinary.

!!! note "Life story: the kilobit SNFS factorization"
    **Born:** 2006 to 2007, Aoki, Franke, Kleinjung, Lenstra and Osvik at NTT,
    Bonn and EPFL · **Purpose:** show that sieving and linear algebra on a
    thousand-bit problem were within an academic budget, using a number of
    special form, $2^{1039} - 1$ · **Helped:** the first factorization past
    1,000 bits (ASIACRYPT 2007); its methods fed directly into RSA-768 two years
    later · **Status:** surpassed for special numbers by $2^{1061} - 1$ (2012)
    and the Mersenne factorization factory (2014); the general-purpose record
    is still below 830 bits

## 11.12 Shor's algorithm: factoring's future

*Level: intermediate.*

Every method so far is a clever search, and the best is subexponential. In 1994
Peter Shor, at Bell Labs, showed that a quantum computer could factor in
polynomial time: about $O((\log n)^3)$ operations with schoolbook arithmetic.
Book 1's [Chapter 20](../../book/20-Quantum-Computers.md) explains the quantum
part; here is what the algorithm asks the quantum computer to do, and how
little of it is quantum.

Pick a random $a$ coprime to $n$ and let $r$ be its **order**: the smallest
$r > 0$ with $a^r \equiv 1 \pmod n$. If $r$ is even, then
$(a^{r/2} - 1)(a^{r/2} + 1) \equiv 0 \pmod n$, a congruence of squares in
disguise ($a^{r/2}$ squared is 1, which is $1^2$), and
$\gcd(a^{r/2} - 1, n)$ is a factor unless $a^{r/2} \equiv -1$. At least half
of all $a$ work. Finding $r$ is the hard part, and for a classical computer it
is as hard as factoring. Shor's quantum circuit finds it: it puts the
exponents $x$ into superposition, computes $a^x \bmod n$, and a quantum Fourier
transform reads off the period $r$ of that function. The classical part, which
is everything else, fits in a few lines; here the order is found by brute force,
which is the step the quantum computer replaces:

```python
from math import gcd

def order(a, n):                         # the quantum computer's job, done slowly
    r, x = 1, a % n
    while x != 1:
        x = x * a % n
        r += 1
    return r

def shor_classical(n, a):
    if gcd(a, n) > 1:
        return gcd(a, n)                 # lucky: a shares a factor already
    r = order(a, n)
    if r % 2 or pow(a, r // 2, n) == n - 1:
        return None                      # a bad choice of a: pick another
    return gcd(pow(a, r // 2, n) - 1, n)

for n, a in ((15, 7), (21, 2), (27619, 2), (27619, 3)):
    print(n, a, order(a, n), shor_classical(n, a))
```

```text
15 7 4 3
21 2 6 7
27619 2 13580 71
27619 3 13580 71
```

### The honest state of quantum factoring

The demonstrations on real quantum hardware are tiny. IBM factored 15 with
Shor's algorithm in 2001, on a seven-qubit nuclear magnetic resonance device
(Lieven Vandersypen and colleagues). In 2012 a photonic experiment by Enrique
Martín-López and colleagues factored 21. Both, like most later runs, used
circuits **compiled** with knowledge of the answer, and John Smolin, Graeme
Smith and Alexander Vargo showed in 2013 that such compiled circuits can
"factor" numbers of any size while doing nothing quantum at all. Reviews of the
field in 2024 and 2025 put the largest number honestly factored by Shor's
algorithm on a quantum computer at 21 or, with looser standards, 35. Larger
"records" come from other methods: quantum annealers, or hybrid schemes such as
the 2022 claim of a route to RSA-2048 with 372 qubits based on Schnorr's lattice
method, which other researchers found no evidence would scale. The largest
genuine run of Shor's algorithm is a classical simulation: a 39-bit number
factored in 2023 on 2,048 GPUs of the JUWELS Booster supercomputer.

The estimates of what a real attack needs have fallen fast, and that is the
part to watch. In 2012 Austin Fowler and colleagues estimated about a billion
physical qubits for RSA-2048. In 2019 Craig Gidney and Martin Ekerå brought it
to about 20 million noisy qubits running for eight hours. In 2025 Gidney put it
under a million noisy qubits in under a week. The largest machines of 2025 have
on the order of a thousand to a few thousand physical qubits, with error rates near the limit of
what error correction needs, and no logical qubit has yet run the long, deep
circuits that factoring requires. Whether the gap closes in ten years or forty
is disputed among serious people, and nobody outside the laboratories, and
possibly not inside them, knows. That uncertainty, and the fact that traffic
recorded today can be decrypted later, is why the migration to post-quantum
algorithms (book 1, Chapters 20 to 22) has a fixed deadline while the factoring
record does not.

!!! note "Life story: Shor's algorithm"
    **Born:** 1994, Peter Shor at Bell Labs, "Algorithms for quantum
    computation: discrete logarithms and factoring" (FOCS 1994) · **Purpose:**
    find the order of $a$ modulo $n$ with a quantum Fourier transform, turning
    factoring and discrete logarithms into polynomial-time problems on a quantum
    computer · **Helped:** created the field of post-quantum cryptography and
    NIST's 2016 to 2024 standardization; resource estimates for RSA-2048 fell
    from about a billion qubits (2012) to under a million (2025) ·
    **Status:** proven on paper, demonstrated only on 15 and 21; the reason RSA
    is scheduled for retirement

## 11.13 Going deeper

*Level: expert.*

### Where the quadratic sieve's $L[1/2, 1]$ comes from

Let the factor base run to $B = L_n[1/2, \beta]$ and the values to be smooth
be about $x = n^{1/2 + o(1)}$. The probability that $x$ is $B$-smooth is
$u^{-u(1 + o(1))}$ with $u = \ln x / \ln B$ (the theorem of Canfield, Erdős and
Pomerance, 1983). Here $\ln x = \tfrac12 \ln n$ and
$\ln B = \beta \sqrt{\ln n \ln\ln n}$, so

$$u = \frac{1}{2\beta}\sqrt{\frac{\ln n}{\ln\ln n}}, \qquad u \ln u \approx \frac{1}{4\beta}\sqrt{\ln n \ln\ln n},$$

and the probability is $L_n[1/2, -1/(4\beta)]$. You need about $B$ relations,
so you must test about $L_n[1/2, \beta + 1/(4\beta)]$ values, each in constant
amortized time thanks to the sieve. The linear algebra on a sparse $B \times B$
matrix costs $L_n[1/2, 2\beta]$. Minimizing $\beta + 1/(4\beta)$ gives
$\beta = 1/2$ and a sieving cost of $L_n[1/2, 1]$, the same as the linear
algebra at that $\beta$. Dixon's random squares, with values of size $n$ rather
than $\sqrt n$ and trial division instead of sieving, gets only
$L_n[1/2, 2\sqrt 2]$.

### Why the number field sieve reaches $1/3$

With a base-$m$ polynomial of degree $d$, $m \approx n^{1/(d+1)}$, and pairs
bounded by $A$, the rational value $a - bm$ is about $A n^{1/(d+1)}$ and the
norm about $A^d n^{1/(d+1)}$, so the product of the two values that must be
smooth is about $A^{d+1} n^{2/(d+1)}$, far below $\sqrt n$ when $d$ grows with
$n$. With $d \approx (\ln n / \ln\ln n)^{1/3}$,
both $\ln$ of the values and $\ln B$ scale as $(\ln n)^{2/3}(\ln\ln n)^{1/3}$
instead of $(\ln n)^{1/2}(\ln\ln n)^{1/2}$, and the same balancing gives the
exponent $1/3$. Nobody knows an algorithm with $\alpha < 1/3$ for factoring,
and nobody has proved that one cannot exist. In 2014 a quasi-polynomial
algorithm was found for discrete logarithms in fields of small characteristic
([Chapter 12](12-Discrete-Logarithms.md)), a reminder that these constants are
not laws of nature; no comparable breakthrough has come for integers.

### What is proved, and what is not

- Factoring is in NP and co-NP, so it is unlikely to be NP-complete. It is not
  known to be outside P. Every running time above except trial division's rests
  on heuristics about the smoothness of special values; the fastest
  *rigorously* proved method, by Lenstra and Pomerance (1992), runs in
  $L_n[1/2, 1]$.
- Breaking RSA is not proved equivalent to factoring. Recovering $d$ is
  (book 1, [Chapter 13](../../book/13-RSA.md)), but computing $e$-th roots
  modulo $n$ might, in principle, be easier. Dan Boneh and Ramarathnam
  Venkatesan gave evidence in 1998 that for small $e$ it might be.
- Keys that are badly made fall to cheaper methods than any in this chapter:
  shared primes across many keys to batch gcd, and partly known or structured
  primes to Coppersmith's lattice method (ROCA). These are the subject of
  [Chapter 13](13-Attacks-on-RSA.md) and Chapter 18,
  and the lattice machinery is in [Chapter 15](15-Lattices-as-a-Weapon.md).

### The hardware question

Several designs for special sieving hardware have been published: Shamir's
optical TWINKLE (1999), TWIRL by Shamir and Eran Tromer (2003), which they
estimated could do the sieving for a 1024-bit key in a year for about \$10
million of custom chips, and Bernstein's 2001 proposal for mesh-based linear
algebra, which reopened the question of how memory cost should be counted. None
is known to have been built. Whether any national agency has built
something like them is not public; the published estimates are the reason
1024-bit RSA has been treated as breakable by a large government since the
mid-2000s.

## Check yourself

??? question "1. Why does trial division only need to try divisors up to √n?"

    If $n = ab$ with $1 < a \le b$, then $a^2 \le ab = n$, so $a \le \sqrt n$. A
    composite always has a factor at or below its square root; if none is found
    there, $n$ is prime.

??? question "2. Factor 5959 by Fermat's method."

    $\sqrt{5959} \approx 77.2$. Try $a = 78$: $78^2 - 5959 = 125$, not a
    square. $a = 79$: $6241 - 5959 = 282$, no. $a = 80$: $6400 - 5959 = 441 =
    21^2$. So $5959 = (80 - 21)(80 + 21) = 59 \cdot 101$.

??? question "3. A key generator picks a random 1024-bit p and sets q to the next prime after p + 2^600. Is the key safe from Fermat's method?"

    Fermat needs about $(q - p)^2 / (8\sqrt n) \approx 2^{1200} / 2^{1027} =
    2^{173}$ steps, which is far too many. But the key breaks FIPS 186-5's rule
    $|p - q| > 2^{924}$, and the structure (q determined by p) is a gift to
    other attacks; it is not a safe generator, only a safe distance from this
    one attack.

??? question "4. In Pollard's rho, why does a collision modulo p happen long before a collision modulo n?"

    The walk modulo $p$ lives in a set of $p$ values, so by the birthday bound it
    repeats after about $\sqrt p$ steps. Modulo $n$ it lives in a set of $n$
    values and would need about $\sqrt n$. Because $f$ is a polynomial, the walk
    modulo $p$ is a shadow of the walk modulo $n$, and the gcd detects the
    shadow's collision.

??? question "5. Is 1000170 smooth enough for p−1 with B = 1000? Which method would you try on n if p = 1000171?"

    $1000170 = 2 \cdot 3^2 \cdot 5 \cdot 11113$, so it is not 1000-smooth; $p - 1$
    needs $B \ge 11113$. And $p + 1 = 2^2 \cdot 250043$ is worse. The elliptic
    curve method, which in §11.6 finds this $p$ on the 29th curve with
    $B = 200$.

??? question "6. Why does ECM give the attacker an advantage that p−1 and p+1 do not?"

    $p - 1$ and $p + 1$ each work in one group whose order is fixed by $p$. If
    that order has a large prime factor, the method fails, and nothing can be
    done. ECM can choose a new curve, and so a new group order somewhere in
    $[p + 1 - 2\sqrt p, p + 1 + 2\sqrt p]$, as often as it likes, until one is
    smooth.

??? question "7. For n = 27619, show that {187, 205} is a dependency and that it factors n."

    $Q(187) = 7350 = 2 \cdot 3 \cdot 5^2 \cdot 7^2$ and $Q(205) = 14406 = 2
    \cdot 3 \cdot 7^4$. The product is $2^2 \cdot 3^2 \cdot 5^2 \cdot 7^6$, a
    square with root $Y = 2 \cdot 3 \cdot 5 \cdot 7^3 = 10290$. $X = 187 \cdot
    205 = 38335 \equiv 10716$. $\gcd(10716 - 10290, 27619) = \gcd(426, 27619) =
    71$.

??? question "8. Why does the factor base of the quadratic sieve leave out the primes p for which n is not a square mod p?"

    If $p$ divides $Q(a) = a^2 - n$, then $a^2 \equiv n \pmod p$, so $n$ is a
    square modulo $p$. For the other primes this never happens, so they never
    appear in any relation and would only add empty columns to the matrix.

??? question "9. Using the L-formula, why is doubling an RSA key from 1024 to 2048 bits worth only about 30 more bits of security, not 1024?"

    The number field sieve's cost is $L_n[1/3, 1.923]$, which grows like
    $\exp(c (\ln n)^{1/3} (\ln\ln n)^{2/3})$. Doubling $\ln n$ multiplies the
    exponent by about $2^{1/3} \cdot (1.1)^{2/3} \approx 1.35$, and the code of
    §11.10 gives $2^{86.8}$ for 1024 bits and $2^{116.9}$ for 2048: about 30
    bits more. Subexponential means that key length buys security slowly.

??? question "10. In Shor's algorithm, a = 2 has order 13580 modulo 27619. Show how the factor 71 follows, and say which step needs the quantum computer."

    $r = 13580$ is even, so compute $x = 2^{6790} \bmod 27619 = 17893$. Then $x^2 \equiv
    1$, $x \not\equiv -1$ (the code checked), and $\gcd(x - 1, 27619) = 71$.
    Everything here is classical except finding $r$: computing the order of 2
    is as hard as factoring for a classical computer, and it is the step Shor's
    quantum Fourier transform does in polynomial time.

## What you learned

- RSA is as strong as factoring its modulus. Special-purpose methods find a
  factor in time set by the factor (trial division, rho, $p - 1$, $p + 1$,
  ECM); general-purpose methods take time set by $n$ (QS, NFS), and those are
  the ones that matter against a well-made key.
- Fermat's method factors $n$ instantly when $p$ and $q$ are close, and it broke
  real printer keys in 2022; FIPS 186-5 requires $|p - q| > 2^{n_{\text{len}}/2 - 100}$.
- Pollard's rho finds $p$ in about $\sqrt p$ steps with constant memory, by a
  birthday collision modulo the unknown $p$; Brent's cycle finding and batched
  gcds make it faster.
- Smoothness drives everything else: $p - 1$ needs $p - 1$ smooth; ECM gets a
  new group order with every curve and reaches factors of 80 digits.
- The quadratic sieve collects smooth values of $a^2 - n$ with a sieve, combines
  them by linear algebra over $\mathrm{GF}(2)$ into $X^2 \equiv Y^2$, and finishes
  with a gcd; it runs in $L_n[1/2, 1]$ and factored RSA-129 in 1994.
- The number field sieve makes the smooth values smaller by working on two
  sides, the integers and a number ring, and runs in $L_n[1/3, 1.923]$. It
  holds the records: RSA-155 (512 bits, 1999), RSA-768 (2009), RSA-240 (2019)
  and RSA-250 (829 bits, 2020, about 2,700 core-years).
- Extrapolated, 2048 bits is about $10^{14}$ to $10^{15}$ core-years away by sieve;
  special forms such as $2^{1039} - 1$ fall far sooner but do not apply to RSA.
- Shor's algorithm would factor in polynomial time; on real quantum hardware it
  has factored 21. Estimates for RSA-2048 fell to under a million noisy qubits
  in 2025, and that, not the sieve, sets RSA's retirement date.

**Next:** [Chapter 12](12-Discrete-Logarithms.md), where rho, index calculus and
the number field sieve return to attack discrete logarithms.

## Further reading

- John Pollard, "Theorems on factorization and primality testing",
  *Proceedings of the Cambridge Philosophical Society* 76 (1974): the $p - 1$
  method.
- John Pollard, "A Monte Carlo method for factorization", *BIT* 15 (1975): rho.
- Richard Brent, "An improved Monte Carlo factorization algorithm", *BIT* 20
  (1980); Richard Brent and John Pollard, "Factorization of the eighth Fermat
  number", *Mathematics of Computation* 36 (1981).
- Michael Morrison and John Brillhart, "A method of factoring and the
  factorization of $F_7$", *Mathematics of Computation* 29 (1975).
- Hugh Williams, "A $p + 1$ method of factoring", *Mathematics of Computation*
  39 (1982).
- Carl Pomerance, "Analysis and comparison of some integer factoring
  algorithms", in *Computational Methods in Number Theory* (1982): the
  quadratic sieve.
- Hendrik Lenstra, "Factoring integers with elliptic curves", *Annals of
  Mathematics* 126 (1987); Peter Montgomery, "Speeding the Pollard and elliptic
  curve methods of factorization", *Mathematics of Computation* 48 (1987).
- Robert Silverman, "The multiple polynomial quadratic sieve", *Mathematics of
  Computation* 48 (1987).
- Derek Atkins, Michael Graff, Arjen Lenstra and Paul Leyland, "The magic words
  are squeamish ossifrage" (ASIACRYPT 1994).
- Arjen Lenstra and Hendrik Lenstra (eds.), *The Development of the Number
  Field Sieve*, Lecture Notes in Mathematics 1554 (Springer, 1993).
- Carl Pomerance, "A tale of two sieves", *Notices of the AMS* 43 (1996): the
  best short history of QS and NFS.
- Ron Rivest and Robert Silverman, "Are 'strong' primes needed for RSA?" (1999).
- Stefania Cavallar et al., "Factorization of a 512-bit RSA modulus"
  (EUROCRYPT 2000): RSA-155.
- Kazumaro Aoki, Jens Franke, Thorsten Kleinjung, Arjen Lenstra and Dag Arne
  Osvik, "A kilobit special number field sieve factorization" (ASIACRYPT 2007).
- Thorsten Kleinjung et al., "Factorization of a 768-bit RSA modulus" (CRYPTO
  2010).
- Fabrice Boudot, Pierrick Gaudry, Aurore Guillevic, Nadia Heninger, Emmanuel
  Thomé and Paul Zimmermann, "Comparing the difficulty of factorization and
  discrete logarithm: a 240-digit experiment" (CRYPTO 2020), and their RSA-250
  announcement (February 2020).
- Luke Valenta et al., "Factoring as a Service" (Financial Cryptography 2016).
- Hanno Böck, "Fermat Factorization in the Wild" (2022), on CVE-2022-26320.
- Peter Shor, "Algorithms for quantum computation: discrete logarithms and
  factoring" (FOCS 1994).
- John Smolin, Graeme Smith and Alexander Vargo, "Oversimplifying quantum
  factoring", *Nature* 499 (2013).
- Craig Gidney and Martin Ekerå, "How to factor 2048 bit RSA integers in 8
  hours using 20 million noisy qubits", *Quantum* 5 (2021); Craig Gidney, "How
  to factor 2048 bit RSA integers with less than a million noisy qubits" (2025).
- Richard Crandall and Carl Pomerance, *Prime Numbers: A Computational
  Perspective*, 2nd edition (Springer, 2005): the textbook for every method in
  this chapter.
- Paul Zimmermann's pages of factoring and ECM records (loria.fr).
- Standards: FIPS 186-5 (key generation and the $|p - q|$ rule), SP 800-56B
  (RSA key establishment), SP 800-57 Part 1 (the security levels of RSA key
  sizes).
