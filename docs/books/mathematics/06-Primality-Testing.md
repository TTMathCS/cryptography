# 6. Primality Testing and Making Primes

*An RSA key needs two secret primes of about 1,024 bits each, and every TLS
server, smart card and phone that makes one must find them in a fraction of a
second. No one can factor a 2,048-bit number, yet a laptop can decide whether a
1,024-bit number is prime in about a millisecond. This chapter explains that
gap. It builds the tests one at a time, from trial division through Fermat,
Solovay-Strassen and Miller-Rabin to Baillie-PSW, proves why each works and how
often each can be fooled, shows how a prime can be proved prime rather than
merely trusted, and walks through how a standard says keys should be made. It
ends with two real failures: libraries fooled by composite numbers built to pass
their tests, and a chip whose fast prime generator left a fingerprint in a
quarter of a billion keys.*

!!! abstract "In this chapter"
    **You will learn:**

    - why trial division cannot test big numbers, and what can;
    - the Fermat test, its liars, and the Carmichael numbers that fool it for
      almost every base, with Korselt's criterion and its proof;
    - the Solovay-Strassen test and the proof that it catches a composite at
      least half the time;
    - the Miller-Rabin test, why it is right for primes, why at most a quarter
      of bases lie, and the fixed bases that make it exact below $2^{64}$;
    - the Baillie-PSW test, which no one has ever fooled;
    - how to prove a number prime with a certificate (Pocklington, ECPP), and
      what AKS showed in 2002;
    - how keys are generated in practice, how many candidates it takes, and
      what FIPS 186-5 requires;
    - the "Prime and Prejudice" attack (2018) and the ROCA fingerprint (2017).

    **You need:** [Chapter 2](02-Divisibility-Primes-and-Factoring.md) (the
    prime number theorem), [Chapter 3](03-Modular-Arithmetic.md) (the Chinese
    remainder theorem), [Chapter 4](04-Powers-and-Primitive-Roots.md) (fast
    powers, Fermat's little theorem, orders) and
    [Chapter 5](05-Square-Roots-Mod-p.md) (the Jacobi symbol).

    **Levels:** §6.1 to §6.4 are for beginners, §6.5 to §6.10 are
    intermediate, §6.11 to §6.13 are expert.

## 6.1 The problem

*Level: beginner.*

The Arcadia City key office issues a new RSA identity key to every habitat that
joins the network. Each key is a product $N = pq$ of two primes of 1,024 bits,
chosen at random and never seen by anyone. The office's machine draws a random
1,024-bit number. Is it prime?

The obvious method is to try to divide it by every number up to its square
root. A 1,024-bit number has a square root of about 512 bits, so that means
around $2^{511}$ divisions. At a billion billion divisions a second, longer than
the age of the universe many times over. And a prime is exactly the worst case:
nothing divides it, so the search never stops early.

Here is the surprise that makes public-key cryptography practical. Deciding
*whether* a number has factors is easy, even though *finding* them is hard. A
test can say "composite" without ever naming a factor, by showing that the
number breaks a rule that every prime obeys. Fermat's little theorem from
Chapter 4 is such a rule: for a prime $p$, every $a$ not divisible by $p$ has
$a^{p-1} \equiv 1 \pmod p$. If $2^{n-1} \bmod n$ is not 1, then $n$ is
composite, and we know it after about 1,500 modular multiplications, with no
idea what its factors are.

The difficulty is the other direction. A number that obeys the rule might still
be composite: a **liar**. The history of primality testing is a hunt for rules
that composites cannot fake, and the chapter follows it:

1. Trial division: exact, hopeless for big numbers, essential for small ones.
2. The Fermat test: fast, but fooled by Carmichael numbers.
3. Solovay-Strassen: a stronger rule that every composite fails for at least
   half of all bases.
4. Miller-Rabin: stronger still, at least three quarters; the test the world
   uses.
5. Baillie-PSW: a combination no one has fooled.
6. Certificates: proofs that a number is prime, checkable by anyone.

Figure 6.1 shows how they fit into a real key generator.

<figure class="mars-fig">
<svg viewBox="0 0 640 260" width="640" role="img" aria-label="A key generator as a funnel: random odd 1,024-bit candidates are first sieved by small primes, which removes about nine in ten, then tested with Miller-Rabin, which removes the rest of the composites, leaving a probable prime" fill="currentColor" font-size="13">
<g stroke="currentColor" stroke-width="1.4" fill="none">
<path d="M40 30 L600 30 L500 100 L140 100 Z"/>
<path d="M140 110 L500 110 L430 170 L210 170 Z"/>
<rect x="250" y="190" width="140" height="44" rx="6" class="acc"/>
</g>
<text x="320" y="56" text-anchor="middle">random odd 1,024-bit numbers (about 1 in 355 is prime)</text>
<text x="320" y="80" text-anchor="middle" font-size="12">sieve: divide by the primes below 2,000; about 85 percent fail</text>
<text x="320" y="134" text-anchor="middle">Miller-Rabin, a few rounds</text>
<text x="320" y="154" text-anchor="middle" font-size="12">composites fail in the first round</text>
<text x="320" y="217" text-anchor="middle" class="acc-fill">probable prime</text>
<text x="610" y="70" font-size="12">cheap</text>
<text x="520" y="145" font-size="12">about 1 ms</text>
<text x="410" y="217" font-size="12">optional: a primality proof</text>
</svg>
<figcaption>Figure 6.1. How a prime is made. Cheap divisions by small primes throw out most candidates; Miller-Rabin throws out the remaining composites, almost always at the first try; what survives is a prime with overwhelming probability. A proof is possible but rarely needed.</figcaption>
</figure>

## 6.2 Trial division

*Level: beginner.*

If $n$ is composite, $n = ab$ with $1 < a \le b$, then $a^2 \le ab = n$, so
$a \le \sqrt n$. So a composite always has a factor no larger than its square
root, and to test $n$ it is enough to try every $d$ from 2 to $\lfloor \sqrt n
\rfloor$. It is enough to try 2 and the odd numbers, or better, only primes.

### By hand

Is 221 prime? $\sqrt{221} \approx 14.9$, so try 2, 3, 5, 7, 11, 13. The first
five leave remainders (221 is odd; digit sum 5 is not a multiple of 3; it does
not end in 0 or 5; $7 \cdot 31 = 217$; $11 \cdot 20 = 220$). Then $13 \cdot 17 =
221$. Composite.

Is 1,000,003 prime? $\sqrt{1{,}000{,}003} \approx 1000.0015$, so one needs to try
the 168 primes below 1,000. None divides it, so it is prime: tedious by hand,
instant by machine.

### Code it

```python
def trial_division(n):
    """Return the smallest prime factor of n (n itself if n is prime)."""
    if n % 2 == 0:
        return 2
    d = 3
    while d * d <= n:
        if n % d == 0:
            return d
        d += 2
    return n

print([n for n in range(2, 60) if trial_division(n) == n])
print(trial_division(1_000_003), trial_division(999_999_999_989 * 3))
```

```text
[2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59]
1000003 3
```

The cost is about $\sqrt n / 2$ divisions: about 500 for a six-digit number, a
million for a 12-digit one, and $2^{511}$ for a 1,024-bit one. Trial division
is exponential in the number of digits. It is still in every key generator, for
a different job: dividing a candidate by the first few hundred primes throws out
most composites at almost no cost (Mertens' theorem says that the fraction of
odd numbers with no prime factor below $B$ is about $1.12/\ln B$, so the primes
below 2,000 remove about 85 percent). Only survivors go on to the expensive
test.

## 6.3 The Fermat test

*Level: beginner.*

Fermat's little theorem (Chapter 4) says that if $p$ is prime and $p \nmid a$,
then $a^{p-1} \equiv 1 \pmod p$. Turn it around:

**Fermat test.** To test an odd $n$, pick a base $a$ with $1 < a < n - 1$ and
compute $a^{n-1} \bmod n$. If the result is not 1, $n$ is certainly composite,
and $a$ is a **Fermat witness** for $n$. If it is 1, $n$ is a **probable prime**
to base $a$.

A composite $n$ with $a^{n-1} \equiv 1 \pmod n$ is a **Fermat pseudoprime** to
base $a$, and $a$ is a **Fermat liar** for $n$.

### By hand

Test 221 with base 2. Write $220 = 128 + 64 + 16 + 8 + 4$ and square repeatedly
modulo 221: $2^2 = 4$, $2^4 = 16$, $2^8 = 256 \equiv 35$, $2^{16} \equiv 35^2 =
1225 \equiv 120$, $2^{32} \equiv 120^2 = 14400 \equiv 35$, $2^{64} \equiv 120$,
$2^{128} \equiv 35$. Then $2^{220} = 2^{128} \cdot 2^{64} \cdot 2^{16} \cdot 2^8
\cdot 2^4 \equiv 35 \cdot 120 \cdot 120 \cdot 35 \cdot 16$. Reduce as you go:
$35 \cdot 120 = 4200 \equiv 1$ (since $19 \cdot 221 = 4199$), so the product is
$1 \cdot 120 \cdot 35 \cdot 16 = 67200 \equiv 16$. Not 1: 221 is composite, and
2 is a witness. We learned this without finding 13 or 17.

Now test 341 with base 2. Since $2^{10} = 1024 = 3 \cdot 341 + 1$, we have
$2^{10} \equiv 1 \pmod{341}$, so $2^{340} = (2^{10})^{34} \equiv 1$. The test
says "probably prime", but $341 = 11 \cdot 31$. Base 3 catches it: $3^{340}
\equiv 56 \pmod{341}$.

### Code it

```python
def fermat_test(n, a):
    return pow(a, n - 1, n) == 1

liars = [n for n in range(3, 2000, 2) if fermat_test(n, 2) and trial_division(n) != n]
print(liars)
print([a for a in range(2, 561) if fermat_test(561, a) is False][:8])
```

```text
[341, 561, 645, 1105, 1387, 1729, 1905]
[3, 6, 9, 11, 12, 15, 17, 18]
```

The base-2 pseudoprimes below 2,000 are 341, 561, 645, 1105, 1387, 1729 and
1905: seven, against 302 odd primes in the same range. So base 2 alone is a
good filter; the Chinese mathematicians who were once credited with "$2^n
\equiv 2$ means $n$ is prime" (a story now thought to be a 19th-century
misreading) were nearly right, and 341 was the counterexample that settled it
in 1819 (Pierre Sarrus).

The second line is the strange part. For 561, the only bases that expose it are
multiples of 3, 11 or 17, the number's own prime factors. Every base that shares
no factor with 561 is a liar.

### The liars of a composite form a group

The Fermat liars of $n$ (together with 1) are closed under multiplication: if
$a^{n-1} \equiv 1$ and $b^{n-1} \equiv 1$ then $(ab)^{n-1} \equiv 1$. They are
units, they contain 1, and inverses of liars are liars. So the liars form a
**subgroup** of the units $(\mathbb{Z}/n\mathbb{Z})^*$. By Lagrange's theorem
(proved in Chapter 7), the size of a subgroup divides the size of the group. So
either *every* unit is a liar, or at most half of them are.

That is the dichotomy that drives this chapter. If $n$ has even one Fermat
witness that is a unit, then at least half of all units are witnesses, and $k$
random bases miss them all with probability at most $2^{-k}$. The trouble is the
numbers that have no unit witness at all.

## 6.4 Carmichael numbers

*Level: beginner.*

A **Carmichael number** is a composite $n$ with $a^{n-1} \equiv 1 \pmod n$ for
every $a$ coprime to $n$. Robert Carmichael published the first, 561, in 1910.
They are rare but not too rare: there are 43 below a million and 2,163 below
25 billion (counted by Pomerance, Selfridge and Wagstaff in 1980). In 1994 W. R. (Red) Alford, Andrew
Granville and Carl Pomerance proved that there are infinitely many of them.

The Fermat test with random bases finds a Carmichael number composite only by
landing on a base that shares a factor with it, which for a product of three
large primes is as unlikely as factoring it by luck.

### Korselt's criterion

In 1899, eleven years before anyone found one, Alwin Korselt described exactly
what such a number must look like.

**Theorem (Korselt, 1899).** A composite $n$ is a Carmichael number if and only
if $n$ is squarefree and $p - 1$ divides $n - 1$ for every prime $p$ dividing
$n$.

*Proof.* Suppose $n$ is squarefree and $p - 1 \mid n - 1$ for every prime
$p \mid n$. Take $a$ coprime to $n$. For each prime $p \mid n$, Fermat gives
$a^{p-1} \equiv 1 \pmod p$, and since $n - 1$ is a multiple of $p - 1$, also
$a^{n-1} \equiv 1 \pmod p$. So every prime factor of $n$ divides $a^{n-1} - 1$.
Since $n$ is squarefree, it is the product of those primes, and the Chinese
remainder theorem gives $a^{n-1} \equiv 1 \pmod n$.

Conversely, suppose $n$ is a Carmichael number. If $p^2 \mid n$ for some prime
$p$, then the number $a = 1 + n/p$ is coprime to $n$ and has order $p$ modulo
$n$. By the binomial theorem $(1 + n/p)^k \equiv 1 + k\,n/p
\pmod n$, because every later term contains $(n/p)^2$, which is a multiple of
$n$ when $p^2 \mid n$; and $1 + k\,n/p \equiv 1 \pmod n$ exactly when $p \mid
k$. So $a^{n-1} \equiv 1$ forces $p
\mid n - 1$, impossible since $p \mid n$. So $n$ is squarefree. Now let $p \mid
n$ and let $g$ be a primitive root modulo $p$ (Chapter 4). By the CRT choose $a$
with $a \equiv g \pmod p$ and $a \equiv 1$ modulo the other prime factors. Then
$a$ is coprime to $n$, so $a^{n-1} \equiv 1 \pmod n$, so $g^{n-1} \equiv 1
\pmod p$. The order of $g$ is $p - 1$, so $p - 1 \mid n - 1$. $\blacksquare$

Check 561: $561 = 3 \cdot 11 \cdot 17$, squarefree, and $560 = 2 \cdot 280 = 10
\cdot 56 = 16 \cdot 35$. All three divide. Two more facts fall out of the
criterion: a Carmichael number is odd (if $n$ were even, an odd prime factor
$p$ would make $p - 1$ even divide the odd $n - 1$), and it has at least three
prime factors (if $n = pq$ with $p < q$, then $q - 1 \mid n - 1 = p(q - 1) + p
- 1$ forces $q - 1 \mid p - 1$, impossible).

### Code it

```python
from math import gcd

def factor(n):
    fs = []
    while n > 1:
        p = trial_division(n)
        fs.append(p)
        n //= p
    return fs

def is_carmichael(n):
    fs = factor(n)
    if len(fs) < 2 or len(set(fs)) != len(fs):     # composite and squarefree
        return False
    return all((n - 1) % (p - 1) == 0 for p in fs)  # Korselt

print([n for n in range(3, 20000, 2) if is_carmichael(n)])
print(factor(561), [560 % (p - 1) for p in factor(561)])
```

```text
[561, 1105, 1729, 2465, 2821, 6601, 8911, 10585, 15841]
[3, 11, 17] [0, 0, 0]
```

1729 is on the list, the taxicab number of Hardy and Ramanujan: $7 \cdot 13 \cdot
19$, with $6$, $12$ and $18$ all dividing $1728$. A neat recipe due to Jack
Chernick (1939): if $6k + 1$, $12k + 1$ and $18k + 1$ are all prime, their
product is a Carmichael number ($k = 1$ gives 1729).

!!! note "Life story: the Fermat test"
    **Born:** 1640, Pierre de Fermat's letter stating the little theorem; used
    as a test in the 20th century as soon as fast modular powers were
    understood · **Purpose:** prove a number composite with one exponentiation
    · **Helped:** early PGP versions in the 1990s made primes with Fermat
    tests to a few small bases; it is still a sound pre-filter, because random
    candidates are almost never pseudoprimes · **Status:** retired as a
    stand-alone test because of Carmichael numbers; replaced by Miller-Rabin,
    which costs the same

## 6.5 The Solovay-Strassen test

*Level: intermediate.*

Fermat's rule is too weak. Chapter 5 gave a stronger one: Euler's criterion. If
$p$ is an odd prime and $p \nmid a$, then

$$a^{(p-1)/2} \equiv \left(\frac{a}{p}\right) \pmod p,$$

where the right side is the Legendre symbol, $+1$ or $-1$. For an odd $n$, the
Jacobi symbol $\left(\frac{a}{n}\right)$ can be computed quickly without knowing
the factors of $n$. So test whether the two sides agree.

**Solovay-Strassen test.** Pick a random $a$ with $1 < a < n$. If
$\left(\frac{a}{n}\right) = 0$ or $a^{(n-1)/2} \not\equiv \left(\frac{a}{n}\right)
\pmod n$, then $n$ is composite and $a$ is an **Euler witness**. Otherwise $n$
passes this round.

Robert Solovay and Volker Strassen published it in 1977. It was the first
randomized algorithm with a proved error bound to get wide attention, and with
RSA in the same year it made random primes practical.

### The proof that half the bases are witnesses

**Theorem.** If $n$ is an odd composite, at most half of the units modulo $n$
are Euler liars.

*Proof.* The Euler liars (units $a$ with $a^{(n-1)/2} \equiv \left(\frac{a}{n}
\right)$) form a subgroup, because both sides are multiplicative in $a$. So it is
enough to find one unit that is not a liar; then the subgroup is proper and has
at most half the units.

*Case 1: $p^2 \mid n$ for some prime $p$.* Take $a = 1 + n/p$, as in Korselt's
proof. It is a unit, and $a^k \equiv 1 \pmod n$ only when $p \mid k$. If $a$
were a liar, then $a^{n-1} \equiv \left(\frac{a}{n}\right)^2 = 1$, so $p \mid
n - 1$; but $p \mid n$. So $a$ is a witness.

*Case 2: $n$ is squarefree,* so $n = pm$ with $p$ prime, $m > 1$ and $p \nmid
m$. Let $b$ be a quadratic non-residue modulo $p$, and by the CRT pick $a$ with
$a \equiv b \pmod p$ and $a \equiv 1 \pmod m$. Then
$\left(\frac{a}{n}\right) = \left(\frac{a}{p}\right)\left(\frac{a}{m}\right) =
(-1)(+1) = -1$. If $a$ were a liar, $a^{(n-1)/2} \equiv -1 \pmod n$, hence also
modulo $m$. But $a \equiv 1 \pmod m$ gives $a^{(n-1)/2} \equiv 1 \pmod m$, and
$1 \not\equiv -1$ modulo $m > 2$. So $a$ is a witness. $\blacksquare$

So $k$ rounds with random bases wrongly pass a composite with probability at most
$2^{-k}$, whatever the composite is, Carmichael numbers included.

### Code it

```python
def jacobi(a, n):
    assert n > 0 and n % 2 == 1
    a %= n
    s = 1
    while a:
        while a % 2 == 0:
            a //= 2
            if n % 8 in (3, 5):
                s = -s
        a, n = n, a
        if a % 4 == 3 and n % 4 == 3:
            s = -s
        a %= n
    return s if n == 1 else 0

def euler_witness(a, n):
    """True if a proves n composite (Solovay-Strassen)."""
    j = jacobi(a, n) % n           # -1 becomes n - 1
    return j == 0 or pow(a, (n - 1) // 2, n) != j

n = 561
liars = [a for a in range(1, n) if gcd(a, n) == 1 and not euler_witness(a, n)]
print(len(liars), n - 1, liars[:6])
```

```text
80 560 [1, 2, 4, 8, 16, 25]
```

For 561, the Fermat liars are all 320 units; the Euler liars are only 80, a
quarter of the units. The test catches the Carmichael number three times in
four.

## 6.6 The Miller-Rabin test

*Level: intermediate.*

Miller-Rabin uses the fact behind Chapter 5's square roots: modulo a prime, the
only square roots of 1 are $1$ and $-1$. (If $x^2 \equiv 1 \pmod p$ then $p$
divides $(x - 1)(x + 1)$, so it divides one of them.) Modulo a composite $n$
with two distinct odd prime factors there are at least four square roots of 1,
and finding a "wrong" one factors $n$, just as in Rabin's cryptosystem.

### The test

Write $n - 1 = 2^s d$ with $d$ odd. Pick a base $a$. Compute the chain

$$a^d,\; a^{2d},\; a^{4d},\; \dots,\; a^{2^s d} = a^{n-1} \pmod n,$$

each term the square of the one before. If $n$ is prime, the last term is 1 by
Fermat. Walk back from the end: each 1 is the square of the term before it, so
that term is $\pm 1$. So for a prime, the chain is either all 1s from the start
($a^d \equiv 1$), or it contains a $-1$ followed only by 1s.

**Miller-Rabin test.** Compute $x = a^d \bmod n$. If $x = 1$ or $x = n - 1$,
pass. Otherwise square up to $s - 1$ times; if $n - 1$ appears, pass. If it never
does, $n$ is composite and $a$ is a **strong witness**. A composite that passes
for base $a$ is a **strong pseudoprime** to base $a$, and $a$ is a **strong
liar**.

### By hand

The prime 97: $96 = 2^5 \cdot 3$, so $d = 3$, $s = 5$. Base 5: $5^3 = 125 \equiv
28$, then $28^2 = 784 \equiv 8$, $8^2 = 64$, $64^2 = 4096 \equiv 22$, $22^2 =
484 \equiv 96 = -1$, and finally $1$. The chain $28, 8, 64, 22, -1, 1$ has a
$-1$ just before the 1s. Pass.

The Carmichael number 561: $560 = 2^4 \cdot 35$, so $d = 35$, $s = 4$. Base 2:
$2^{35} \equiv 263$, then $263^2 \equiv 166$, $166^2 \equiv 67$, $67^2 \equiv 1$.
The chain reaches 1 from 67, which is a square root of 1 other than $\pm 1$.
Composite. The Fermat test, which only looked at the last term, saw nothing
wrong; Miller-Rabin looked at the term before it. And the wrong root hands over
factors: $\gcd(67 - 1, 561) = 33$ and $\gcd(67 + 1, 561) = 17$.

<figure class="mars-fig">
<svg viewBox="0 0 640 230" width="640" role="img" aria-label="Two Miller-Rabin chains: for the prime 97 with base 5 the chain 28, 8, 64, 22, minus 1, 1 passes; for 561 with base 2 the chain 263, 166, 67, 1 reaches 1 from 67, a wrong square root of 1, so 561 is composite" fill="currentColor" font-size="13">
<text x="20" y="40">n = 97, a = 5</text>
<g stroke="currentColor" stroke-width="1.4" fill="none">
<rect x="130" y="20" width="56" height="30" rx="5"/><rect x="210" y="20" width="56" height="30" rx="5"/>
<rect x="290" y="20" width="56" height="30" rx="5"/><rect x="370" y="20" width="56" height="30" rx="5"/>
<rect x="450" y="20" width="56" height="30" rx="5" class="acc"/><rect x="530" y="20" width="56" height="30" rx="5"/>
<path d="M186 35 L210 35"/><path d="M266 35 L290 35"/><path d="M346 35 L370 35"/><path d="M426 35 L450 35"/><path d="M506 35 L530 35"/>
<rect x="130" y="120" width="56" height="30" rx="5"/><rect x="210" y="120" width="56" height="30" rx="5"/>
<rect x="290" y="120" width="56" height="30" rx="5" class="acc"/><rect x="370" y="120" width="56" height="30" rx="5"/>
<path d="M186 135 L210 135"/><path d="M266 135 L290 135"/><path d="M346 135 L370 135"/>
</g>
<text x="158" y="40" text-anchor="middle">28</text><text x="238" y="40" text-anchor="middle">8</text>
<text x="318" y="40" text-anchor="middle">64</text><text x="398" y="40" text-anchor="middle">22</text>
<text x="478" y="40" text-anchor="middle" class="acc-fill">−1</text><text x="558" y="40" text-anchor="middle">1</text>
<text x="158" y="72" text-anchor="middle" font-size="11">a^d</text><text x="558" y="72" text-anchor="middle" font-size="11">a^(n−1)</text>
<text x="320" y="96" text-anchor="middle">−1 right before the 1s: consistent with a prime, pass</text>
<text x="20" y="140">n = 561, a = 2</text>
<text x="158" y="140" text-anchor="middle">263</text><text x="238" y="140" text-anchor="middle">166</text>
<text x="318" y="140" text-anchor="middle" class="acc-fill">67</text><text x="398" y="140" text-anchor="middle">1</text>
<text x="158" y="172" text-anchor="middle" font-size="11">a^d</text><text x="398" y="172" text-anchor="middle" font-size="11">a^(n−1)</text>
<text x="320" y="200" text-anchor="middle">67² ≡ 1 but 67 ≢ ±1: a wrong square root of 1, so composite</text>
<text x="320" y="220" text-anchor="middle" font-size="12" class="acc-fill">gcd(66, 561) = 33 and gcd(68, 561) = 17</text>
</svg>
<figcaption>Figure 6.2. The Miller-Rabin chain. Each box is the square of the one before. For a prime, the first 1 can only follow a −1 (or the chain starts at 1). The Fermat test looks only at the last box, so it passes 561; Miller-Rabin catches the 67 before it.</figcaption>
</figure>

### Code it

```python
def strong_witness(a, n):
    """True if a proves the odd number n > 2 composite (Miller-Rabin)."""
    d, s = n - 1, 0
    while d % 2 == 0:
        d //= 2
        s += 1
    x = pow(a, d, n)
    if x == 1 or x == n - 1:
        return False
    for _ in range(s - 1):
        x = x * x % n
        if x == n - 1:
            return False
    return True

def strong_liars(n):
    return [a for a in range(1, n) if not strong_witness(a, n)]

print(len(strong_liars(561)), strong_liars(561))
print([n for n in range(3, 10000, 2) if not strong_witness(2, n) and trial_division(n) != n])
```

```text
10 [1, 50, 101, 103, 256, 305, 458, 460, 511, 560]
[2047, 3277, 4033, 4681, 8321]
```

For 561, only 10 of the 560 bases lie, and the base-2 strong pseudoprimes
below 10,000 are just five numbers, the first being $2047 = 23 \cdot 89$. Even a
small composite has a few strong liars: for $221 = 13 \cdot 17$, base 174 gives
the chain $47, -1, 1$ and passes. A random base is what makes the test safe.

### How often can it be fooled?

**Theorem (Monier; Rabin, 1980).** If $n$ is an odd composite, at most a
quarter of the bases $1 \le a \le n - 1$ are strong liars.

*Proof sketch.* Take $n = pq$ with $p \ne q$ odd primes, the case that comes
closest to the bound. By the CRT, a base $a$ is the same as a pair ($a \bmod p$,
$a \bmod q$), and its chain modulo $n$ is the pair of its chains modulo $p$ and
modulo $q$. A term is $-1$ modulo $n$ only when it is $-1$ modulo *both* primes,
at the *same* step. So a strong liar needs two independent chains, one in each
prime, to reach $-1$ in step with each other (or both to start at 1). Modulo
each prime, the step at which a random base reaches $-1$ is spread out: half the
units reach it at the last possible step, a quarter one step earlier, and so on.
Two independent chains agree on the step with probability at most about a third,
and the bases must also be Fermat liars in the first place, which costs at least
another factor whenever $p - 1$ or $q - 1$ does not divide $n - 1$. Carrying this
through, Louis Monier found the exact count: if $n$ has $\omega$ distinct prime
factors $p_i$, $n - 1 = 2^s d$ with $d$ odd, and $2^k$ is the largest power of 2
dividing every $p_i - 1$, then the number of strong liars is

$$\left(1 + \frac{2^{\omega k} - 1}{2^{\omega} - 1}\right) \prod_{i} \gcd(d, p_i - 1).$$

(For 561: $\omega = 3$, $k = 1$, $d = 35$, giving $2 \cdot 1 \cdot 5 \cdot 1 = 10$,
as the code found.) Bounding this by $(n-1)/4$ for every odd composite is a page
of careful inequalities; see Crandall and Pomerance (Further reading).
$\blacksquare$

The bound is reached:

```python
worst = 0
for n in range(9, 4000, 2):
    if trial_division(n) != n:
        r = len(strong_liars(n)) / (n - 1)
        if r > worst:
            worst, at = r, n
print(at, factor(at), round(worst, 4))
```

```text
9 [3, 3] 0.25
```

For 9, the strong liars are 1 and 8 out of the eight bases 1 to 8: exactly a
quarter. Products $n = p(2p - 1)$ of two primes with $p \equiv 3 \pmod 4$
come close: $19 \cdot 37$ has 23.1 percent liars, $31 \cdot 61$ has 23.8 and
$79 \cdot 157$ has 24.5. For most composites the fraction is tiny.

So $k$ rounds with independent random bases pass a composite with probability at
most $4^{-k}$. Forty rounds give $2^{-80}$, less than the chance that the
computer's memory is flipped by a cosmic ray during the test.

### The cost

One round is one modular exponentiation, the same as a Fermat test: about
$1.5 \log_2 n$ multiplications. For 1,024-bit numbers it takes well under a
millisecond on a laptop. A composite candidate almost always fails the first
round, so a key generator spends most of its time on the few rounds it runs on the
prime it finally keeps.

!!! note "Life story: Miller-Rabin"
    **Born:** 1976, Gary Miller's deterministic test, correct if the extended
    Riemann hypothesis is true; 1980, Michael Rabin's randomized version with an
    unconditional error bound (Louis Monier proved the 1/4 bound the same
    year) · **Purpose:** decide primality of big numbers fast, with any desired
    certainty · **Helped:** every RSA, DSA and Diffie-Hellman key generator,
    in OpenSSL, BoringSSL, Go, Java, Windows and every smart card; FIPS 186
    names it as the required test · **Status:** universal; its one weakness is
    fixed or too few bases against adversarial input (§6.11)

## 6.7 Deterministic bases and Baillie-PSW

*Level: intermediate.*

### Fixed bases for small numbers

For numbers below a fixed bound, people have searched for the smallest composite
that is a strong pseudoprime to all of the first $k$ prime bases. The first few:
2047 fools base 2; 1,373,653 fools bases 2 and 3; 25,326,001 fools 2, 3 and 5;
3,215,031,751 fools 2, 3, 5 and 7; and 341,550,071,728,321 fools every prime base
up to 17. After exhaustive searches by Yupeng Jiang and Yingpu Deng (2014) and
by Jonathan Sorenson and Jonathan Webster (2015), it is known
that the first twelve primes, 2 through 37, are enough for every $n$ below about
$3.18 \times 10^{23}$, which covers all 64-bit numbers. So for 64-bit integers
Miller-Rabin becomes an exact, deterministic test.

```python
import random

def is_probable_prime(n, rounds=40, rng=random.SystemRandom()):
    if n < 2:
        return False
    for p in (2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37):
        if n % p == 0:
            return n == p
    for _ in range(rounds):
        if strong_witness(rng.randrange(2, n - 1), n):
            return False
    return True

def is_prime_64(n):
    """Deterministic for n < 2**64: the first twelve primes as bases."""
    if n < 2:
        return False
    for p in (2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37):
        if n % p == 0:
            return n == p
    return not any(strong_witness(a, n) for a in (2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37))

M61 = 2**61 - 1
print(is_prime_64(M61), is_prime_64(2**64 - 59), is_prime_64(2**64 - 61))
print(is_probable_prime(2**521 - 1), is_probable_prime(2**523 - 1))
```

```text
True True False
True False
```

$2^{61} - 1$ is a Mersenne prime, and $2^{64} - 59$ is the largest prime below
$2^{64}$. $2^{521} - 1$ is the Mersenne prime that defines the field of the NIST
curve P-521.

Gary Miller's 1976 result says more: if the extended Riemann hypothesis is true,
every composite $n$ has a strong witness below $2 (\ln n)^2$ (the constant 2 is
Eric Bach's, 1990). Testing all those bases would be a deterministic
polynomial-time test, but it rests on an unproved conjecture.

### Baillie-PSW

Miller-Rabin to base 2 and a quite different test fail on different numbers. The
second test uses **Lucas sequences** instead of powers. Pick integers $P$ and
$Q$ with $D = P^2 - 4Q$, and define

$$U_0 = 0,\; U_1 = 1,\; U_{k+1} = P U_k - Q U_{k-1}, \qquad V_0 = 2,\; V_1 = P,\;
V_{k+1} = P V_k - Q V_{k-1}.$$

(With $P = 1$, $Q = -1$ these are the Fibonacci and Lucas numbers.) If $p$ is an
odd prime with $\left(\frac{D}{p}\right) = -1$, then $p \mid U_{p+1}$. It is
Fermat's theorem in the field $\mathbb{F}_{p^2}$ built from $\sqrt D$
(Chapter 8): the roots of $x^2 - Px + Q$ live there, and $U_k$ is the difference
of their $k$th powers divided by $\sqrt D$. There is a "strong" version with a
square-root chain, exactly like Miller-Rabin, computed with doubling formulas
like square-and-multiply.

**Baillie-PSW test** (Robert Baillie and Samuel Wagstaff, 1980, building on
Carl Pomerance, John Selfridge and Wagstaff the same year): trial-divide by
small primes, run Miller-Rabin with base 2, then run a strong Lucas test with $D$
the first of $5, -7, 9, -11, 13, \dots$ for which $\left(\frac{D}{n}\right) =
-1$, $P = 1$ and $Q = (1 - D)/4$.

```python
def is_square(n):
    from math import isqrt
    return isqrt(n) ** 2 == n

def strong_lucas(n):
    """Strong Lucas probable-prime test with Selfridge's parameters."""
    if is_square(n):
        return False
    D = 5
    while jacobi(D % n, n) != -1:
        D = -D - 2 if D > 0 else -D + 2
    P, Q = 1, (1 - D) // 4
    d, s = n + 1, 0
    while d % 2 == 0:
        d //= 2
        s += 1
    # compute U_d, V_d by binary method
    U, V, Qk = 0, 2, 1          # U_0, V_0, Q^0
    inv2 = pow(2, -1, n)
    for bit in bin(d)[2:]:
        U, V = U * V % n, (V * V - 2 * Qk) % n          # double
        Qk = Qk * Qk % n
        if bit == "1":                                   # add one
            U, V = (P * U + V) * inv2 % n, (D * U + P * V) * inv2 % n
            Qk = Qk * Q % n
    if U == 0 or V == 0:
        return True
    for _ in range(s - 1):
        V = (V * V - 2 * Qk) % n
        Qk = Qk * Qk % n
        if V == 0:
            return True
    return False

def baillie_psw(n):
    if n < 2:
        return False
    for p in (2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37):
        if n % p == 0:
            return n == p
    return not strong_witness(2, n) and strong_lucas(n)

print([n for n in range(3, 20000, 2) if strong_lucas(n) and trial_division(n) != n])
print(all(baillie_psw(n) == (trial_division(n) == n) for n in range(2, 50000)))
print(baillie_psw(2**89 - 1), baillie_psw(3215031751))
```

```text
[5459, 5777, 10877, 16109, 18971]
True
True False
```

The strong Lucas pseudoprimes below 20,000 (5459, 5777, 10877, 16109, 18971)
share nothing with the base-2 strong pseudoprimes (2047, 3277, 4033, 4681, 8321,
15841, ...). That is the point: the two tests are fooled by numbers of opposite
character (roughly, the Fermat-type test likes $p - 1$ to share factors with
$n - 1$, and the Lucas test likes $p + 1$ to share factors with $n + 1$). The
combination has been checked against every number below $2^{64}$ by Jan Feitsma
and William Galway's list of base-2 pseudoprimes, and no one has ever found a
composite that passes it. Pomerance gave a heuristic argument in 1984 that
infinitely many such composites exist, so it is not a proof; but in 45 years of
looking, none has turned up.

The last line shows 3,215,031,751, which fools Miller-Rabin with bases 2, 3, 5
and 7, failing Baillie-PSW. It is $151 \cdot 751 \cdot 28351$.

!!! note "Life story: Baillie-PSW"
    **Born:** 1980, Robert Baillie and Samuel Wagstaff, "Lucas Pseudoprimes"
    (*Mathematics of Computation*), with Pomerance, Selfridge and Wagstaff's
    "The Pseudoprimes to 25·10⁹" the same year · **Purpose:** a primality test
    with no known counterexample, at the cost of about three Miller-Rabin rounds
    · **Helped:** the default test in Mathematica, PARI/GP, SymPy, FLINT and
    GMP (since 6.2, 2020); allowed as an extra Lucas test after Miller-Rabin in FIPS 186-5
    · **Status:** no counterexample known; Pomerance offered $30 for one in
    1984 (later raised with Selfridge and Wagstaff to $620), still unclaimed
    at the time of writing

## 6.8 Proving primality

*Level: intermediate.*

Every test so far either proves a number *composite* or says "probably prime". To
*prove* primality, one needs a **certificate**: extra data that lets anyone check,
quickly, that the number is prime.

### Pocklington's theorem

**Theorem (Pocklington, 1914).** Let $n - 1 = F R$ where the full factorization
of $F$ is known and $F > \sqrt n$. Suppose there is an $a$ with

1. $a^{n-1} \equiv 1 \pmod n$, and
2. $\gcd(a^{(n-1)/q} - 1, n) = 1$ for every prime $q$ dividing $F$.

Then $n$ is prime.

*Proof.* Let $p$ be any prime factor of $n$, and let $b = a^R \bmod p$. By (1),
$b^F = a^{n-1} \equiv 1 \pmod p$, so the order of $b$ modulo $p$ divides $F$. For
each prime $q \mid F$, $b^{F/q} = a^{(n-1)/q}$, and by (2) $p$ does not divide
$a^{(n-1)/q} - 1$, so $b^{F/q} \not\equiv 1 \pmod p$. An order that divides $F$
but no $F/q$ is $F$ itself. Orders divide the group size $p - 1$ (Chapter 4), so
$F \mid p - 1$ and $p > F > \sqrt n$. Every prime factor of $n$ is bigger than
$\sqrt n$, so $n$ has only one, and $n$ is prime. $\blacksquare$

The certificate is the factorization of $F$ and the number $a$. The factors $q$
must themselves be proved prime, so the certificate is a tree, each node
smaller than its parent. Vaughan Pratt showed in 1975 that such a tree always
exists with polynomial size (taking $F = n - 1$ fully factored), which proved
that primality is in **NP**: a "yes" answer has a short proof (Chapter 19).

```python
def pocklington(n, a, qs):
    """Check a Pocklington certificate: qs are primes whose product F divides
    n - 1 with F > sqrt(n), and a is the witness."""
    F = 1
    for q in qs:
        F *= q
    assert (n - 1) % F == 0 and F * F > n
    if pow(a, n - 1, n) != 1:
        return False
    return all(gcd(pow(a, (n - 1) // q, n) - 1, n) == 1 for q in set(qs))

n = 1_000_003
print(factor(n - 1))
print(pocklington(n, 2, [2, 3, 166667]))
```

```text
[2, 3, 166667]
True
```

By hand: $2^{(n-1)/2} \equiv n - 1$, $2^{(n-1)/3} \equiv 499501$ and
$2^{(n-1)/166667} = 2^6 = 64$, and none of $n - 2$, $499500$, $63$ shares a
factor with $n$. Together with a proof that 166,667 is prime (trial division by
the primes up to 408), that is a complete proof that 1,000,003 is prime.

The catch for random cryptographic primes: one must factor half of $n - 1$,
which is as hard as factoring in general. There are two ways out. Build the prime
so that $n - 1$ has a known factor (Maurer's method, 1995, makes provable primes
this way, and FIPS 186-5 allows it as "provable primes" via Shawe-Taylor's
algorithm); or use a different group whose size *can* be found.

### Elliptic curve primality proving

Shafi Goldwasser and Joe Kilian (1986) replaced the group of units, whose size
$n - 1$ is fixed and may be hard to factor, with the group of points on an
elliptic curve modulo $n$, whose size varies from curve to curve over a range
around $n$ (Chapter 13). Try curves until one has an order $m = kq$ with $q$ a
probable prime bigger than $(n^{1/4} + 1)^2$ and a point of order $q$; then
recurse on $q$. A. O. L. Atkin and François Morain (1993) made it practical by
building curves with known orders from complex multiplication. **ECPP** is how
records are set: numbers of tens of thousands of digits have been proved prime
this way (Andreas Enge's CM and Marcel Martin's Primo are the usual programs).
Its certificates are fast to check.

### AKS

In August 2002, Manindra Agrawal and his students Neeraj Kayal and Nitin Saxena,
at the Indian Institute of Technology Kanpur, posted "PRIMES is in P": the first
primality test that is deterministic, unconditional and polynomial-time. It
rests on a polynomial version of Fermat's theorem: for $a$ coprime to $n$,

$$n \text{ is prime} \iff (x + a)^n \equiv x^n + a \pmod n$$

as polynomials (the binomial coefficients $\binom{n}{k}$ for $0 < k < n$ are all
divisible by $n$ exactly when $n$ is prime). Checking that identity directly is
exponential, so AKS checks it modulo $x^r - 1$ for a small $r$ and a few values
of $a$, and proves that this is enough. The original running time was about
$(\log n)^{12}$; Hendrik Lenstra and Carl Pomerance brought it to about $(\log
n)^6$. It won the 2006 Gödel Prize. It is a theoretical landmark and a practical
footnote: for a 1,024-bit number it is far slower than ECPP.

## 6.9 Making primes

*Level: intermediate.*

### How many candidates?

The prime number theorem (Chapter 2) says that near $x$, about one number in $\ln
x$ is prime. For a random 1,024-bit number, $\ln 2^{1024} \approx 710$; among
odd numbers, one in about 355 is prime. For 2,048 bits, one in about 710 odd
numbers. A generator that tests random odd numbers expects to try a few hundred.
The sieve of small primes throws out most of them for the price of a few
divisions each, so the expensive test runs only on a few dozen.

### Code it

```python
from math import log

def random_prime(bits, rng):
    """FIPS-186-style sketch: top two bits set, odd, sieve, then Miller-Rabin."""
    small = [p for p in range(3, 2000) if trial_division(p) == p]
    tries = 0
    while True:
        n = rng.getrandbits(bits) | (3 << (bits - 2)) | 1
        tries += 1
        if any(n % p == 0 for p in small):
            continue
        if is_probable_prime(n, rounds=5, rng=rng):
            return n, tries

rng = random.Random(2026)
p, tries = random_prime(512, rng)
print(p.bit_length(), tries, round(512 * log(2) / 2))
counts = [random_prime(512, rng)[1] for _ in range(200)]
print(sum(counts) / len(counts))
```

```text
512 281 177
205.375
```

The theory predicts about 177 odd candidates for a 512-bit prime. One run took
281, and the average over 200 primes was about 205. The gap is luck: the number
of tries is a geometric random variable whose standard deviation is about as large
as its mean, so averages of a few hundred runs wander by tens. (The
`random.Random` generator here is for a reproducible demonstration only; real
keys must come from `secrets` or the operating system's generator.)

Setting the top two bits does two things: the prime has exactly the requested
length, and a product of two such primes has exactly twice that length, since
$(3/4)^2 \cdot 2^{2b} > 2^{2b-1}$.

### Why five rounds are enough here

The 1/4 bound is the worst case over *all* composites. A *random* composite is
caught far more easily, because most composites have very few strong liars.
Ivan Damgård, Peter Landrock and Carl Pomerance (1993) proved that a random
$k$-bit odd number that passes $t$ rounds of Miller-Rabin is composite with
probability much smaller than $4^{-t}$; for 512-bit candidates, a handful of
rounds already gives an error below $2^{-80}$. That is why FIPS 186-5 lets key
generators run only a few rounds on random candidates. It is *also* why the
same small number of rounds is dangerous when the candidate is not random but
chosen by an adversary (§6.11).

### What FIPS 186-5 requires

NIST's Digital Signature Standard, FIPS 186-5 (February 2023), sets out how RSA
primes are made for U.S. government use, and most libraries follow it:

- The candidates come from an approved random bit generator with enough
  security strength for the key size.
- Each prime $p$ is at least $\sqrt 2 \cdot 2^{\text{nlen}/2 - 1}$, so the
  modulus has the full length.
- $|p - q| > 2^{\text{nlen}/2 - 100}$, so that Fermat's factoring method
  (Chapter 2), which is fast when $p$ and $q$ are close, does not apply.
- $\gcd(p - 1, e) = 1$, so the public exponent $e$ has an inverse.
- The primality test is Miller-Rabin with a number of rounds from a table in the
  standard's appendices (it depends on the size), optionally followed by a
  Lucas test; or the primes are *provable*, built with the Shawe-Taylor method
  so that each comes with a Pocklington-style certificate.

Older versions required "strong primes" ($p - 1$ and $p + 1$ each with a large
prime factor) to stop Pollard's $p - 1$ method and its relatives
(*Cryptanalysis*, [chapter 11](../cryptanalysis/11-Factoring.md)). For random primes of 1,024 bits or more, such
factors are present with overwhelming probability anyway, and the requirement is
now optional.

## 6.10 Mersenne primes and record primes

*Level: intermediate.*

Numbers of special form have special tests. For a Mersenne number $M_p = 2^p -
1$ ($p$ prime), the **Lucas-Lehmer test** (Édouard Lucas 1878, Derrick Lehmer
1930) is exact and needs only $p - 2$ squarings: set $s_0 = 4$ and $s_{i+1} =
s_i^2 - 2 \bmod M_p$; then $M_p$ is prime if and only if $s_{p-2} \equiv 0$. It
is a Lucas-sequence test like the one in §6.7, made exact because the
factorization of $M_p + 1 = 2^p$ is known. Reduction modulo $2^p - 1$ is free
(add the top half to the bottom half), which is also why cryptographers like
Mersenne-like moduli such as $2^{255} - 19$ and $2^{521} - 1$.

The Great Internet Mersenne Prime Search (GIMPS), started by George Woltman in
1996, has found the largest known prime every time since. As of late 2024 the
record is $2^{136{,}279{,}841} - 1$, with 41,024,320 digits, found in October 2024
by Luke Durant on cloud graphics processors. Record primes play no role in
cryptography, but the arithmetic that finds them (fast squaring with the FFT,
Chapter 11) is the same arithmetic that makes lattice cryptography fast.

## 6.11 Break it: prime and prejudice

*Level: expert.*

Primality tests in cryptographic libraries face two kinds of input. When a
library *generates* a key, the candidate is random, and a few rounds are plenty
(§6.9). When a library *checks* a number someone else sent, such as
Diffie-Hellman group parameters $(p, q, g)$ from a server, the number may have
been built to fool the test.

In 2018, Martin Albrecht, Jake Massimo, Kenneth Paterson and Juraj Somorovsky
published "Prime and Prejudice: Primality Testing Under Adversarial Conditions"
(ACM CCS 2018). They surveyed the primality tests in widely used libraries and
found that many ran Miller-Rabin with a fixed set of bases, or with a small
number of rounds tuned for random input. Against fixed bases, an attacker can
use the method of François Arnault (1995) and of Bleichenbacher to construct a
composite that is a strong pseudoprime to all of them, typically of the shape
$n = p_1 p_2 p_3$ with $p_i = k_i(p_1 - 1) + 1$ chosen so that each base is a
non-residue in the right way modulo each factor. Against a few random rounds,
the attacker builds a composite with close to the maximum quarter of liars, and
wins with probability $4^{-t}$, which for $t = 5$ is one in a thousand.

Here is the idea in miniature, with a composite that is a strong pseudoprime to
every prime base up to 17:

```python
# Prime and Prejudice in miniature: a composite that fools a fixed base set.
bases = (2, 3, 5, 7, 11, 13, 17)
n = 341550071728321                      # = 10670053 * 32010157
print(factor(n), all(not strong_witness(a, n) for a in bases), strong_witness(19, n))
rng = random.Random(1)
print(sum(strong_witness(rng.randrange(2, n - 1), n) for _ in range(20)))
```

```text
[10670053, 32010157] True False
19
```

A library that tested only bases 2 to 17 would accept it. Random bases reject
it 19 times in 20 here.

**Why it matters.** If a client accepts a Diffie-Hellman group whose "prime"
modulus is composite, or whose "prime" subgroup order $q$ is composite, the
discrete logarithm problem in that group falls apart along the factors
(Pohlig-Hellman, Chapter 4). A malicious server, or a backdoored standard, could
then recover the client's secret.

**Fix it.** The paper's recommendations, since adopted widely: use Baillie-PSW
(no known counterexample, and no adversary can build one with today's
knowledge), or Miller-Rabin with enough *random* rounds to bound the
worst case, such as 64 rounds for $2^{-128}$; and never use fixed bases on
input that might be adversarial. OpenSSL 3.0 (2021) raised its rounds to 64
for numbers below 2,048 bits and 128 above; GMP 6.2 (2020) switched to
Baillie-PSW.

## 6.12 Break it: ROCA

*Level: expert.*

In October 2017, Matúš Nemec, Marek Sýs, Petr Švenda, Dušan Klinec and Vashek
Matyáš of Masaryk University published "The Return of Coppersmith's Attack"
(ACM CCS 2017), nicknamed ROCA. They had found that RSA keys made by a widely
used library from Infineon, in smart cards and Trusted Platform Modules, were
not random primes at all.

To make primes faster on small chips, the library built each one as

$$p = k \cdot M + (65537^a \bmod M),$$

where $M$ is the product of the first several dozen primes (39 primes for
512-bit keys, more for larger ones) and $k$, $a$ are random. Such a $p$ is
automatically free of small prime factors (its residue modulo each small prime is
a power of 65537, never 0), which saves sieving. But it has two fatal flaws.

**A fingerprint.** For every small prime $r$ dividing $M$, the residue $p \bmod
r$ lies in the subgroup generated by 65537 modulo $r$. Since that is true for both
$p$ and $q$, it is true for $N = pq$, which is public. For a random modulus, the
chance of landing in all those subgroups by luck is negligible. Anyone can check a
public key in microseconds and know it came from the library.

**Too little entropy.** The pair $(k, a)$ has far fewer bits than a random prime,
and the order of 65537 modulo $M$ is small. The attackers chose a divisor $M'$
of $M$ that keeps the unknown part small enough, guessed $a$ modulo the order,
and for each guess ran Coppersmith's lattice method (Chapter 14 and
*Cryptanalysis*, [chapter 15](../cryptanalysis/15-Lattices-as-a-Weapon.md)) to find $k$. They estimated the worst case for a
1,024-bit key at about 97 CPU-days and for a 2,048-bit key at about 140
CPU-years: expensive, but feasible for a single valuable key and trivially
parallel.

```python
# ROCA in miniature: primes of the form k*M + (65537^a mod M).
Mp = 2 * 3 * 5 * 7 * 11 * 13 * 17 * 19 * 23 * 29 * 31 * 37 * 41 * 43 * 47
def order_mod(g, m):
    x, k = g % m, 1
    while x != 1:
        x, k = x * g % m, k + 1
    return k

def looks_like_roca(N, primes=(3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47)):
    for r in primes:
        powers = {pow(65537, i, r) for i in range(r)}
        if N % r not in powers:
            return False
    return True

rng = random.Random(5)
def roca_prime():
    while True:
        cand = rng.getrandbits(200) * Mp + pow(65537, rng.randrange(1, 10**6), Mp)
        if is_probable_prime(cand, rng=rng):
            return cand

N_bad = roca_prime() * roca_prime()
fair = [random_prime(256, rng)[0] * random_prime(256, rng)[0] for _ in range(1000)]
print(looks_like_roca(N_bad), sum(looks_like_roca(N) for N in fair))
print(order_mod(65537, Mp), Mp.bit_length())
```

```text
True 2
637560 60
```

The fingerprint test flags the bad modulus, and only 2 of 1,000 fair moduli by
chance; the real test uses more primes, and its false-positive rate is far
smaller. The last line shows the weakness behind the fingerprint: modulo the
60-bit number $M$, the powers of 65537 take only 637,560 values, so the "random"
residue carries fewer than 20 bits of choice.

<figure class="mars-fig">
<svg viewBox="0 0 640 230" width="640" role="img" aria-label="The ROCA prime structure: a random prime has a residue modulo M spread over all units, while an Infineon prime's residue lies in the tiny subgroup generated by 65537, which both fingerprints the public key and leaves too little randomness" fill="currentColor" font-size="13">
<g stroke="currentColor" stroke-width="1.4" fill="none">
<rect x="30" y="40" width="260" height="140" rx="8"/>
<rect x="350" y="40" width="260" height="140" rx="8"/>
<circle cx="480" cy="110" r="22" class="acc"/>
</g>
<g fill-opacity="0.55">
<circle cx="70" cy="70" r="3"/><circle cx="120" cy="150" r="3"/><circle cx="180" cy="90" r="3"/><circle cx="240" cy="60" r="3"/><circle cx="260" cy="160" r="3"/><circle cx="90" cy="120" r="3"/><circle cx="210" cy="130" r="3"/><circle cx="150" cy="60" r="3"/><circle cx="60" cy="160" r="3"/><circle cx="230" cy="100" r="3"/>
</g>
<g class="acc-fill">
<circle cx="472" cy="104" r="3"/><circle cx="488" cy="112" r="3"/><circle cx="478" cy="120" r="3"/><circle cx="486" cy="100" r="3"/>
</g>
<text x="160" y="28" text-anchor="middle">a random prime: p mod M anywhere</text>
<text x="480" y="28" text-anchor="middle">Infineon's prime: p mod M = 65537^a</text>
<text x="160" y="205" text-anchor="middle" font-size="12">every unit modulo M is possible</text>
<text x="480" y="160" text-anchor="middle" class="acc-fill" font-size="12">tiny subgroup ⟨65537⟩</text>
<text x="480" y="205" text-anchor="middle" font-size="12">N = pq lands there too: a public fingerprint</text>
</svg>
<figcaption>Figure 6.3. Why ROCA keys were detectable and weak. Each small prime r dividing M sees p only in the subgroup of powers of 65537. The same is true of the public modulus, which gives the keys away, and the small choice of residues left the primes guessable with Coppersmith's method.</figcaption>
</figure>

**Damage.** The library had been in use since about 2012 and had passed
security certifications (Common Criteria and FIPS 140-2), which did not look
inside key generation. Affected were the Estonian national ID card (about
750,000 cards, whose certificates were suspended and renewed), other national ID
and e-health cards, TPM chips in many laptops (with BitLocker relying on them),
YubiKey 4 tokens and code-signing keys. The researchers found hundreds of
thousands of affected keys in public datasets.

**Fix it.** Generate primes from fully random candidates, as FIPS 186-5 describes;
if speed matters, sieve by incrementing a random start, which loses very little
entropy. Infineon issued firmware updates; keys had to be regenerated because the
weakness was in the keys themselves. The episode is the textbook case of a
certification that checked the box marked "uses Miller-Rabin" without asking where
the candidates came from.

## 6.13 In the real world and going deeper

*Level: expert.*

**In the real world.** Prime generation fails far more often through bad
randomness than through a bad test. When the random generator lacks entropy at
boot, many devices produce the same first prime, and two moduli that share a
prime are factored by one gcd; Nadia Heninger, Zakir Durumeric, Eric Wustrow and
J. Alex Halderman found tens of thousands of such keys on the Internet in 2012.
That story, and the Debian OpenSSL bug of 2008, belong to *Cryptanalysis*
(chapters on [random numbers](../cryptanalysis/18-Random-Numbers-Gone-Wrong.md) and on [attacks on RSA](../cryptanalysis/13-Attacks-on-RSA.md)). What this chapter adds is
that the prime itself must also be generated the simple way: random candidate,
sieve, Miller-Rabin or Baillie-PSW, and nothing clever.

Where a library *checks* parameters it did not make (Diffie-Hellman groups in
TLS 1.2, DSA domain parameters, an RSA key imported from a file), it should use
Baillie-PSW or many random Miller-Rabin rounds. TLS 1.3 removed the problem for
Diffie-Hellman by allowing only fixed, named groups (RFC 7919), whose primes
were checked once by everyone.

**Going deeper.**

- *How rare are pseudoprimes?* Paul Erdős (1956) and later Pomerance (1981) showed
  that base-2 pseudoprimes are far rarer than primes: below $x$ there are at most
  $x \cdot L(x)^{-1/2}$ of them, where $L(x) = e^{\ln x \ln \ln \ln x / \ln \ln
  x}$. This is the theory behind Damgård-Landrock-Pomerance.
- *Pratt certificates and complexity.* Pratt (1975) put PRIMES in NP; Miller-Rabin
  put it in co-RP (a composite has many short proofs of compositeness that a
  random search finds); Adleman and Huang (1992) put it in ZPP; AKS (2002) put it
  in P. Chapter 19 explains these classes.
- *The quadratic Frobenius test.* Jon Grantham (2001) combined Fermat and Lucas
  conditions in $\mathbb{F}_{n^2}$ with a proved error bound of $1/7710$ per
  round, at about three times the cost of Miller-Rabin.
- *ECPP in practice.* Fast ECPP runs in about $(\log n)^4$ heuristically.
  Certificates for numbers of tens of thousands of digits are on record in Primo
  and in Andreas Enge's CM software.
- *Lucas sequences.* They return in Chapter 8 as powers in $\mathbb{F}_{p^2}$, and
  the idea "work in a bigger field where the group order is $p + 1$" is the
  basis of Williams' $p + 1$ factoring method.

## Check yourself

??? question "1. Use trial division to decide whether 323 and 331 are prime."

    $\sqrt{323} \approx 17.97$: try 2, 3, 5, 7, 11, 13, 17; $17 \cdot 19 = 323$,
    composite. $\sqrt{331} \approx 18.2$: none of 2, 3, 5, 7, 11, 13, 17 divides
    331, so it is prime.

??? question "2. Show that 2 is a Fermat witness for 15 but 4 is a liar."

    $2^{14} = 16384 = 15 \cdot 1092 + 4$, so $2^{14} \equiv 4 \neq 1$: witness.
    $4^{14} = (4^2)^7 = 16^7 \equiv 1^7 = 1 \pmod{15}$: liar.

??? question "3. Use Korselt's criterion to show 1105 is a Carmichael number."

    $1105 = 5 \cdot 13 \cdot 17$, squarefree. $1104 = 4 \cdot 276 = 12 \cdot 92 =
    16 \cdot 69$, so $4$, $12$ and $16$ all divide $1104$.

??? question "4. Why can't a product of two distinct primes be a Carmichael number?"

    If $n = pq$, $p < q$, Korselt needs $q - 1 \mid n - 1$. But $n - 1 = p(q -
    1) + (p - 1)$, so $q - 1 \mid p - 1$, impossible since $0 < p - 1 < q - 1$.

??? question "5. Run one round of Miller-Rabin on 341 with base 2."

    $340 = 4 \cdot 85$, $d = 85$, $s = 2$. $2^{10} \equiv 1$, so $2^{85} = 2^{80}
    \cdot 2^5 \equiv 32$. Then $32^2 = 1024 \equiv 1$. The chain is $32, 1$: it
    reaches 1 from 32, not from $-1$. Composite, and $\gcd(31, 341) = 31$,
    $\gcd(33, 341) = 11$.

??? question "6. If a composite has the maximum fraction 1/4 of strong liars, how many random rounds are needed for an error below $2^{-128}$?"

    $4^{-t} \le 2^{-128}$ means $2t \ge 128$, so 64 rounds. That is OpenSSL's
    choice below 2,048 bits.

??? question "7. Give a Pocklington certificate for 97."

    $96 = 2^5 \cdot 3$. Take $F = 96$ (fully factored, bigger than $\sqrt{97}$)
    and $a = 5$. From the chain in §6.6, $5^{96} \equiv 1$ and $5^{48} \equiv -1$,
    so $\gcd(5^{48} - 1, 97) = \gcd(95, 97) = 1$. Squaring $5^2 = 25$ up gives
    $5^{32} \equiv 35$, and $\gcd(34, 97) = 1$. So 97 is prime.

??? question "8. About how many random odd 4,096-bit numbers must be tested to find a prime?"

    $\ln 2^{4096} / 2 = 4096 \cdot 0.693 / 2 \approx 1420$.

??? question "9. Why is a fixed base set fine for a 64-bit integer but dangerous for a 2,048-bit Diffie-Hellman prime received from a server?"

    For 64-bit numbers, the first twelve prime bases have been checked against
    every composite in the range, so no counterexample exists. For 2,048-bit
    numbers no such check is possible, and an adversary can build a composite that
    is a strong pseudoprime to any fixed list of bases (Arnault's method).

??? question "10. How does the ROCA fingerprint work, in one sentence?"

    For each small prime $r$ in the library's $M$, both $p$ and $q$, and so $N$,
    are powers of 65537 modulo $r$, which a random $N$ almost never is; checking
    $N \bmod r$ against that small subgroup for each $r$ recognizes the key.

## What you learned

- Trial division is exact but exponential; it survives as a cheap sieve.
- The Fermat test proves compositeness without finding factors. Its liars form a
  subgroup, so either half the units are witnesses or none are; Carmichael
  numbers (Korselt: squarefree, $p - 1 \mid n - 1$) are the "none" case.
- Solovay-Strassen uses Euler's criterion and the Jacobi symbol; at least half
  the bases are witnesses for every odd composite.
- Miller-Rabin looks for a wrong square root of 1; at most a quarter of the bases
  lie, and twelve fixed bases make it exact below $2^{64}$.
- Baillie-PSW (base-2 Miller-Rabin plus a strong Lucas test) has no known
  counterexample.
- Pocklington, Pratt and ECPP give certificates that prove primality; AKS shows
  that primality is in P.
- Key generators test random candidates: about $\ln(2^k)/2$ odd tries for a
  $k$-bit prime, a few rounds each, under the rules of FIPS 186-5.
- Against adversarial input, use random bases and many rounds, or Baillie-PSW
  (Prime and Prejudice). Never make "clever" primes (ROCA).

**Next:** [Chapter 7](07-Groups.md), the language of groups that has been
hiding behind every "the liars form a subgroup" in this chapter.

## Further reading

- Richard Crandall and Carl Pomerance, *Prime Numbers: A Computational
  Perspective*, 2nd edition (Springer, 2005), chapters 3 and 4: the standard
  reference for everything in this chapter.
- Alwin Korselt, "Problème chinois", *L'Intermédiaire des Mathématiciens* 6
  (1899); Robert Carmichael, "Note on a New Number Theory Function", *Bulletin
  of the American Mathematical Society* 16 (1910).
- W. R. Alford, Andrew Granville and Carl Pomerance, "There Are Infinitely Many
  Carmichael Numbers", *Annals of Mathematics* 139 (1994).
- Robert Solovay and Volker Strassen, "A Fast Monte-Carlo Test for Primality",
  *SIAM Journal on Computing* 6 (1977).
- Gary Miller, "Riemann's Hypothesis and Tests for Primality", *Journal of
  Computer and System Sciences* 13 (1976); Michael Rabin, "Probabilistic
  Algorithm for Testing Primality", *Journal of Number Theory* 12 (1980).
- Louis Monier, "Evaluation and Comparison of Two Efficient Probabilistic
  Primality Testing Algorithms", *Theoretical Computer Science* 12 (1980).
- Robert Baillie and Samuel Wagstaff, "Lucas Pseudoprimes", *Mathematics of
  Computation* 35 (1980).
- Ivan Damgård, Peter Landrock and Carl Pomerance, "Average Case Error Estimates
  for the Strong Probable Prime Test", *Mathematics of Computation* 61 (1993).
- Manindra Agrawal, Neeraj Kayal and Nitin Saxena, "PRIMES is in P", *Annals of
  Mathematics* 160 (2004).
- A. O. L. Atkin and François Morain, "Elliptic Curves and Primality Proving",
  *Mathematics of Computation* 61 (1993).
- FIPS 186-5, *Digital Signature Standard* (NIST, 2023), appendices on prime
  generation and primality testing.
- Martin Albrecht, Jake Massimo, Kenneth Paterson and Juraj Somorovsky, "Prime
  and Prejudice: Primality Testing Under Adversarial Conditions", ACM CCS 2018.
- Matúš Nemec, Marek Sýs, Petr Švenda, Dušan Klinec and Vashek Matyáš, "The
  Return of Coppersmith's Attack: Practical Factorization of Widely Used RSA
  Moduli", ACM CCS 2017.
- In *The cryptography book*: [Chapter 3](../../book/03-The-Arithmetic-of-Secrets.md)
  and [Chapter 13](../../book/13-RSA.md).
