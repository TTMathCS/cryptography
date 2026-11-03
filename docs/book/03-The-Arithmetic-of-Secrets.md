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

<figure class="mars-fig">
<svg viewBox="0 0 560 590" width="560" role="img" aria-label="Timeline from Euclid around 300 BC to the ROCA flaw of 2017" xmlns="http://www.w3.org/2000/svg">
<text x="280" y="22" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">From Alexandria to the key generator</text>
<line x1="114" y1="36" x2="114" y2="558" stroke="currentColor" stroke-width="1.5"/>
<text x="100" y="49" font-size="13" text-anchor="end" fill="currentColor" class="acc-fill" font-weight="bold">c. 300 BC</text>
<circle cx="114" cy="44" r="5" fill="currentColor" class="acc-fill"/>
<text x="128" y="49" font-size="13" text-anchor="start" fill="currentColor">Euclid's Elements: gcd, infinitely many primes</text>
<text x="100" y="79" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">c. 240 BC</text>
<circle cx="114" cy="74" r="4" fill="currentColor"/>
<text x="128" y="79" font-size="13" text-anchor="start" fill="currentColor">Eratosthenes' sieve</text>
<text x="100" y="109" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">3rd–5th c.</text>
<circle cx="114" cy="104" r="4" fill="currentColor"/>
<text x="128" y="109" font-size="13" text-anchor="start" fill="currentColor">Sunzi's remainder puzzle</text>
<text x="100" y="139" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">499</text>
<circle cx="114" cy="134" r="4" fill="currentColor"/>
<text x="128" y="139" font-size="13" text-anchor="start" fill="currentColor">Aryabhata's kuṭṭaka (inverses)</text>
<text x="100" y="169" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">1247</text>
<circle cx="114" cy="164" r="4" fill="currentColor"/>
<text x="128" y="169" font-size="13" text-anchor="start" fill="currentColor">Qin Jiushao's general remainder method</text>
<text x="100" y="199" font-size="13" text-anchor="end" fill="currentColor" class="acc-fill" font-weight="bold">1640</text>
<circle cx="114" cy="194" r="5" fill="currentColor" class="acc-fill"/>
<text x="128" y="199" font-size="13" text-anchor="start" fill="currentColor">Fermat's little theorem, in a letter</text>
<text x="100" y="229" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">1736</text>
<circle cx="114" cy="224" r="4" fill="currentColor"/>
<text x="128" y="229" font-size="13" text-anchor="start" fill="currentColor">Euler's first proof of it</text>
<text x="100" y="259" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">1763</text>
<circle cx="114" cy="254" r="4" fill="currentColor"/>
<text x="128" y="259" font-size="13" text-anchor="start" fill="currentColor">Euler's theorem with φ(n)</text>
<text x="100" y="289" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">1801</text>
<circle cx="114" cy="284" r="4" fill="currentColor"/>
<text x="128" y="289" font-size="13" text-anchor="start" fill="currentColor">Gauss's Disquisitiones: congruences</text>
<text x="100" y="319" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">1896</text>
<circle cx="114" cy="314" r="4" fill="currentColor"/>
<text x="128" y="319" font-size="13" text-anchor="start" fill="currentColor">prime number theorem proved</text>
<text x="100" y="349" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">1910</text>
<circle cx="114" cy="344" r="4" fill="currentColor"/>
<text x="128" y="349" font-size="13" text-anchor="start" fill="currentColor">Carmichael numbers</text>
<text x="100" y="379" font-size="13" text-anchor="end" fill="currentColor" class="acc-fill" font-weight="bold">1976–80</text>
<circle cx="114" cy="374" r="5" fill="currentColor" class="acc-fill"/>
<text x="128" y="379" font-size="13" text-anchor="start" fill="currentColor">Miller and Rabin's primality test</text>
<text x="100" y="409" font-size="13" text-anchor="end" fill="currentColor" class="acc-fill" font-weight="bold">1977</text>
<circle cx="114" cy="404" r="5" fill="currentColor" class="acc-fill"/>
<text x="128" y="409" font-size="13" text-anchor="start" fill="currentColor">RSA puts it all to work</text>
<text x="100" y="439" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">1985</text>
<circle cx="114" cy="434" r="4" fill="currentColor"/>
<text x="128" y="439" font-size="13" text-anchor="start" fill="currentColor">Montgomery multiplication</text>
<text x="100" y="469" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">1996</text>
<circle cx="114" cy="464" r="4" fill="currentColor"/>
<text x="128" y="469" font-size="13" text-anchor="start" fill="currentColor">Kocher's timing attacks; Bellcore faults</text>
<text x="100" y="499" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">2002</text>
<circle cx="114" cy="494" r="4" fill="currentColor"/>
<text x="128" y="499" font-size="13" text-anchor="start" fill="currentColor">AKS: PRIMES is in P</text>
<text x="100" y="529" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">2012</text>
<circle cx="114" cy="524" r="4" fill="currentColor"/>
<text x="128" y="529" font-size="13" text-anchor="start" fill="currentColor">Mining your Ps and Qs</text>
<text x="100" y="559" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">2017</text>
<circle cx="114" cy="554" r="4" fill="currentColor"/>
<text x="128" y="559" font-size="13" text-anchor="start" fill="currentColor">ROCA</text>
</svg>
<figcaption>Figure 3.1. Two thousand years of pure mathematics, then forty years in which every result became engineering, and every engineering slip became an attack.</figcaption>
</figure>

## 3.2 Remainders and congruences

$a \bmod n$ is the remainder when $a$ is divided by $n$: $17 \bmod 5 = 2$,
since $17 = 3 \cdot 5 + 2$. On a clock with $n$ hours you only ever see
$0, 1, \ldots, n-1$: 10 o'clock plus 5 hours is 3 o'clock, because
$15 \bmod 12 = 3$. Python writes it `17 % 5`, and always returns a result
between 0 and $n - 1$, even for negative numbers: `-3 % 5` is 2.

<figure class="mars-fig">
<svg viewBox="0 0 560 300" width="560" role="img" aria-label="A twelve-hour clock with an arrow from 10 going five hours forward to 3" xmlns="http://www.w3.org/2000/svg">
<circle cx="150" cy="150" r="110" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<circle cx="150" cy="40" r="3" fill="currentColor"/>
<text x="150" y="25" font-size="14" text-anchor="middle" fill="currentColor">0</text>
<circle cx="205" cy="54.7" r="3" fill="currentColor"/>
<text x="215" y="42.4" font-size="14" text-anchor="middle" fill="currentColor">1</text>
<circle cx="245.3" cy="95" r="3" fill="currentColor"/>
<text x="262.6" y="90" font-size="14" text-anchor="middle" fill="currentColor">2</text>
<circle cx="260" cy="150" r="5" fill="currentColor" class="acc-fill"/>
<text x="280" y="155" font-size="14" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">3</text>
<circle cx="245.3" cy="205" r="3" fill="currentColor"/>
<text x="262.6" y="220" font-size="14" text-anchor="middle" fill="currentColor">4</text>
<circle cx="205" cy="245.3" r="3" fill="currentColor"/>
<text x="215" y="267.6" font-size="14" text-anchor="middle" fill="currentColor">5</text>
<circle cx="150" cy="260" r="3" fill="currentColor"/>
<text x="150" y="285" font-size="14" text-anchor="middle" fill="currentColor">6</text>
<circle cx="95" cy="245.3" r="3" fill="currentColor"/>
<text x="85" y="267.6" font-size="14" text-anchor="middle" fill="currentColor">7</text>
<circle cx="54.7" cy="205" r="3" fill="currentColor"/>
<text x="37.4" y="220" font-size="14" text-anchor="middle" fill="currentColor">8</text>
<circle cx="40" cy="150" r="3" fill="currentColor"/>
<text x="20" y="155" font-size="14" text-anchor="middle" fill="currentColor">9</text>
<circle cx="54.7" cy="95" r="5" fill="currentColor" class="acc-fill"/>
<text x="37.4" y="90" font-size="14" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">10</text>
<circle cx="95" cy="54.7" r="3" fill="currentColor"/>
<text x="85" y="42.4" font-size="14" text-anchor="middle" fill="currentColor">11</text>
<path d="M73.8 106 L77.9 99.5 L82.6 93.4 L87.8 87.8 L93.4 82.6 L99.5 77.9 L106 73.8 L112.8 70.2 L119.9 67.3 L127.2 65 L134.7 63.3 L142.3 62.3 L150 62 L157.7 62.3 L165.3 63.3 L172.8 65 L180.1 67.3 L187.2 70.2 L194 73.8 L200.5 77.9 L206.6 82.6 L212.2 87.8 L217.4 93.4 L222.1 99.5 L226.2 106 L229.8 112.8 L232.7 119.9 L235 127.2 L236.7 134.7 L237.7 142.3 L237.7 143" stroke="currentColor" stroke-width="2.2" fill="none" class="acc"/>
<polygon points="238,150 234.1,142.2 241.2,141.9" fill="currentColor" class="acc-fill"/>
<text x="150" y="155" font-size="15" text-anchor="middle" fill="currentColor" font-weight="bold">10 + 5 = 3</text>
<text x="150" y="175" font-size="13" text-anchor="middle" fill="currentColor">(mod 12)</text>
<text x="320" y="60" font-size="15" text-anchor="start" fill="currentColor">15 = 1 · 12 + 3</text>
<text x="320" y="88" font-size="15" text-anchor="start" fill="currentColor">so  15 mod 12 = 3</text>
<text x="320" y="140" font-size="15" text-anchor="start" fill="currentColor">17 mod 5 = 2</text>
<text x="320" y="168" font-size="15" text-anchor="start" fill="currentColor">−3 mod 5 = 2</text>
<text x="320" y="220" font-size="13" text-anchor="start" fill="currentColor" font-style="italic">on a clock with n hours</text>
<text x="320" y="238" font-size="13" text-anchor="start" fill="currentColor" font-style="italic">only 0 … n − 1 ever show</text>
</svg>
<figcaption>Figure 3.2. Arithmetic mod 12 is clock arithmetic: five hours after 10 o'clock is 3 o'clock. Every modulus works the same way with a different number of hours.</figcaption>
</figure>

Two numbers are **congruent mod $n$** if they leave the same remainder, which
is the same as saying their difference is a multiple of $n$:

$$
a \equiv b \pmod n \quad\Longleftrightarrow\quad n \mid (a - b) .
$$

(The bar $\mid$ means "divides".) So $17 \equiv 2 \equiv -3 \equiv 22 \pmod 5$.
Gauss introduced this notation in 1801.

<figure class="mars-fig">
<svg viewBox="0 0 520 300" width="520" role="img" aria-label="The integers from -5 to 24 laid out in five columns by remainder mod 5; the column for remainder 2 holds -3, 2, 7, 12, 17 and 22" xmlns="http://www.w3.org/2000/svg">
<text x="147" y="36" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">r = 0</text>
<text x="221" y="36" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">r = 1</text>
<text x="295" y="36" font-size="13" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">r = 2</text>
<text x="369" y="36" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">r = 3</text>
<text x="443" y="36" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">r = 4</text>
<rect x="262" y="46" width="66" height="208" rx="4" class="soft-acc" fill="currentColor"/>
<rect x="262" y="46" width="66" height="208" rx="4" fill="none" stroke="currentColor" class="acc" stroke-width="1.5"/>
<text x="147" y="70" font-size="15" text-anchor="middle" fill="currentColor">−5</text>
<text x="221" y="70" font-size="15" text-anchor="middle" fill="currentColor">−4</text>
<text x="295" y="70" font-size="15" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">−3</text>
<text x="369" y="70" font-size="15" text-anchor="middle" fill="currentColor">−2</text>
<text x="443" y="70" font-size="15" text-anchor="middle" fill="currentColor">−1</text>
<text x="147" y="104" font-size="15" text-anchor="middle" fill="currentColor">0</text>
<text x="221" y="104" font-size="15" text-anchor="middle" fill="currentColor">1</text>
<text x="295" y="104" font-size="15" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">2</text>
<text x="369" y="104" font-size="15" text-anchor="middle" fill="currentColor">3</text>
<text x="443" y="104" font-size="15" text-anchor="middle" fill="currentColor">4</text>
<text x="147" y="138" font-size="15" text-anchor="middle" fill="currentColor">5</text>
<text x="221" y="138" font-size="15" text-anchor="middle" fill="currentColor">6</text>
<text x="295" y="138" font-size="15" text-anchor="middle" fill="currentColor">7</text>
<text x="369" y="138" font-size="15" text-anchor="middle" fill="currentColor">8</text>
<text x="443" y="138" font-size="15" text-anchor="middle" fill="currentColor">9</text>
<text x="147" y="172" font-size="15" text-anchor="middle" fill="currentColor">10</text>
<text x="221" y="172" font-size="15" text-anchor="middle" fill="currentColor">11</text>
<text x="295" y="172" font-size="15" text-anchor="middle" fill="currentColor">12</text>
<text x="369" y="172" font-size="15" text-anchor="middle" fill="currentColor">13</text>
<text x="443" y="172" font-size="15" text-anchor="middle" fill="currentColor">14</text>
<text x="147" y="206" font-size="15" text-anchor="middle" fill="currentColor">15</text>
<text x="221" y="206" font-size="15" text-anchor="middle" fill="currentColor">16</text>
<text x="295" y="206" font-size="15" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">17</text>
<text x="369" y="206" font-size="15" text-anchor="middle" fill="currentColor">18</text>
<text x="443" y="206" font-size="15" text-anchor="middle" fill="currentColor">19</text>
<text x="147" y="240" font-size="15" text-anchor="middle" fill="currentColor">20</text>
<text x="221" y="240" font-size="15" text-anchor="middle" fill="currentColor">21</text>
<text x="295" y="240" font-size="15" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">22</text>
<text x="369" y="240" font-size="15" text-anchor="middle" fill="currentColor">23</text>
<text x="443" y="240" font-size="15" text-anchor="middle" fill="currentColor">24</text>
<text x="96" y="70" font-size="15" text-anchor="end" fill="currentColor">…</text>
<text x="260" y="285" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">17 ≡ 2 ≡ −3 ≡ 22 (mod 5): same column, differences are multiples of 5</text>
</svg>
<figcaption>Figure 3.3. Congruence mod 5 sorts all whole numbers into five columns. Numbers in the same column are congruent: they differ by a multiple of 5, and arithmetic only cares which column you are in.</figcaption>
</figure>

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

<figure class="mars-fig">
<svg viewBox="0 0 500 530" width="500" role="img" aria-label="A 10 by 10 grid of the numbers 1 to 100 with the 25 primes boxed and each composite marked with its smallest prime factor" xmlns="http://www.w3.org/2000/svg">
<rect x="12" y="12" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="34" y="36" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">1</text>
<rect x="60" y="12" width="44" height="44" rx="4" class="soft-acc" fill="currentColor"/>
<rect x="60" y="12" width="44" height="44" rx="4" fill="none" stroke="currentColor" class="acc" stroke-width="1.5"/>
<text x="82" y="40" font-size="16" text-anchor="middle" fill="currentColor" font-weight="bold">2</text>
<rect x="108" y="12" width="44" height="44" rx="4" class="soft-acc" fill="currentColor"/>
<rect x="108" y="12" width="44" height="44" rx="4" fill="none" stroke="currentColor" class="acc" stroke-width="1.5"/>
<text x="130" y="40" font-size="16" text-anchor="middle" fill="currentColor" font-weight="bold">3</text>
<rect x="156" y="12" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="178" y="36" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">4</text>
<text x="178" y="51" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷2</text>
<rect x="204" y="12" width="44" height="44" rx="4" class="soft-acc" fill="currentColor"/>
<rect x="204" y="12" width="44" height="44" rx="4" fill="none" stroke="currentColor" class="acc" stroke-width="1.5"/>
<text x="226" y="40" font-size="16" text-anchor="middle" fill="currentColor" font-weight="bold">5</text>
<rect x="252" y="12" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="274" y="36" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">6</text>
<text x="274" y="51" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷2</text>
<rect x="300" y="12" width="44" height="44" rx="4" class="soft-acc" fill="currentColor"/>
<rect x="300" y="12" width="44" height="44" rx="4" fill="none" stroke="currentColor" class="acc" stroke-width="1.5"/>
<text x="322" y="40" font-size="16" text-anchor="middle" fill="currentColor" font-weight="bold">7</text>
<rect x="348" y="12" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="370" y="36" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">8</text>
<text x="370" y="51" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷2</text>
<rect x="396" y="12" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="418" y="36" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">9</text>
<text x="418" y="51" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷3</text>
<rect x="444" y="12" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="466" y="36" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">10</text>
<text x="466" y="51" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷2</text>
<rect x="12" y="60" width="44" height="44" rx="4" class="soft-acc" fill="currentColor"/>
<rect x="12" y="60" width="44" height="44" rx="4" fill="none" stroke="currentColor" class="acc" stroke-width="1.5"/>
<text x="34" y="88" font-size="16" text-anchor="middle" fill="currentColor" font-weight="bold">11</text>
<rect x="60" y="60" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="82" y="84" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">12</text>
<text x="82" y="99" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷2</text>
<rect x="108" y="60" width="44" height="44" rx="4" class="soft-acc" fill="currentColor"/>
<rect x="108" y="60" width="44" height="44" rx="4" fill="none" stroke="currentColor" class="acc" stroke-width="1.5"/>
<text x="130" y="88" font-size="16" text-anchor="middle" fill="currentColor" font-weight="bold">13</text>
<rect x="156" y="60" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="178" y="84" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">14</text>
<text x="178" y="99" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷2</text>
<rect x="204" y="60" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="226" y="84" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">15</text>
<text x="226" y="99" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷3</text>
<rect x="252" y="60" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="274" y="84" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">16</text>
<text x="274" y="99" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷2</text>
<rect x="300" y="60" width="44" height="44" rx="4" class="soft-acc" fill="currentColor"/>
<rect x="300" y="60" width="44" height="44" rx="4" fill="none" stroke="currentColor" class="acc" stroke-width="1.5"/>
<text x="322" y="88" font-size="16" text-anchor="middle" fill="currentColor" font-weight="bold">17</text>
<rect x="348" y="60" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="370" y="84" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">18</text>
<text x="370" y="99" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷2</text>
<rect x="396" y="60" width="44" height="44" rx="4" class="soft-acc" fill="currentColor"/>
<rect x="396" y="60" width="44" height="44" rx="4" fill="none" stroke="currentColor" class="acc" stroke-width="1.5"/>
<text x="418" y="88" font-size="16" text-anchor="middle" fill="currentColor" font-weight="bold">19</text>
<rect x="444" y="60" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="466" y="84" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">20</text>
<text x="466" y="99" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷2</text>
<rect x="12" y="108" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="34" y="132" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">21</text>
<text x="34" y="147" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷3</text>
<rect x="60" y="108" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="82" y="132" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">22</text>
<text x="82" y="147" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷2</text>
<rect x="108" y="108" width="44" height="44" rx="4" class="soft-acc" fill="currentColor"/>
<rect x="108" y="108" width="44" height="44" rx="4" fill="none" stroke="currentColor" class="acc" stroke-width="1.5"/>
<text x="130" y="136" font-size="16" text-anchor="middle" fill="currentColor" font-weight="bold">23</text>
<rect x="156" y="108" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="178" y="132" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">24</text>
<text x="178" y="147" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷2</text>
<rect x="204" y="108" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="226" y="132" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">25</text>
<text x="226" y="147" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷5</text>
<rect x="252" y="108" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="274" y="132" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">26</text>
<text x="274" y="147" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷2</text>
<rect x="300" y="108" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="322" y="132" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">27</text>
<text x="322" y="147" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷3</text>
<rect x="348" y="108" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="370" y="132" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">28</text>
<text x="370" y="147" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷2</text>
<rect x="396" y="108" width="44" height="44" rx="4" class="soft-acc" fill="currentColor"/>
<rect x="396" y="108" width="44" height="44" rx="4" fill="none" stroke="currentColor" class="acc" stroke-width="1.5"/>
<text x="418" y="136" font-size="16" text-anchor="middle" fill="currentColor" font-weight="bold">29</text>
<rect x="444" y="108" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="466" y="132" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">30</text>
<text x="466" y="147" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷2</text>
<rect x="12" y="156" width="44" height="44" rx="4" class="soft-acc" fill="currentColor"/>
<rect x="12" y="156" width="44" height="44" rx="4" fill="none" stroke="currentColor" class="acc" stroke-width="1.5"/>
<text x="34" y="184" font-size="16" text-anchor="middle" fill="currentColor" font-weight="bold">31</text>
<rect x="60" y="156" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="82" y="180" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">32</text>
<text x="82" y="195" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷2</text>
<rect x="108" y="156" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="130" y="180" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">33</text>
<text x="130" y="195" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷3</text>
<rect x="156" y="156" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="178" y="180" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">34</text>
<text x="178" y="195" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷2</text>
<rect x="204" y="156" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="226" y="180" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">35</text>
<text x="226" y="195" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷5</text>
<rect x="252" y="156" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="274" y="180" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">36</text>
<text x="274" y="195" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷2</text>
<rect x="300" y="156" width="44" height="44" rx="4" class="soft-acc" fill="currentColor"/>
<rect x="300" y="156" width="44" height="44" rx="4" fill="none" stroke="currentColor" class="acc" stroke-width="1.5"/>
<text x="322" y="184" font-size="16" text-anchor="middle" fill="currentColor" font-weight="bold">37</text>
<rect x="348" y="156" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="370" y="180" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">38</text>
<text x="370" y="195" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷2</text>
<rect x="396" y="156" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="418" y="180" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">39</text>
<text x="418" y="195" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷3</text>
<rect x="444" y="156" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="466" y="180" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">40</text>
<text x="466" y="195" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷2</text>
<rect x="12" y="204" width="44" height="44" rx="4" class="soft-acc" fill="currentColor"/>
<rect x="12" y="204" width="44" height="44" rx="4" fill="none" stroke="currentColor" class="acc" stroke-width="1.5"/>
<text x="34" y="232" font-size="16" text-anchor="middle" fill="currentColor" font-weight="bold">41</text>
<rect x="60" y="204" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="82" y="228" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">42</text>
<text x="82" y="243" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷2</text>
<rect x="108" y="204" width="44" height="44" rx="4" class="soft-acc" fill="currentColor"/>
<rect x="108" y="204" width="44" height="44" rx="4" fill="none" stroke="currentColor" class="acc" stroke-width="1.5"/>
<text x="130" y="232" font-size="16" text-anchor="middle" fill="currentColor" font-weight="bold">43</text>
<rect x="156" y="204" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="178" y="228" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">44</text>
<text x="178" y="243" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷2</text>
<rect x="204" y="204" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="226" y="228" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">45</text>
<text x="226" y="243" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷3</text>
<rect x="252" y="204" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="274" y="228" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">46</text>
<text x="274" y="243" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷2</text>
<rect x="300" y="204" width="44" height="44" rx="4" class="soft-acc" fill="currentColor"/>
<rect x="300" y="204" width="44" height="44" rx="4" fill="none" stroke="currentColor" class="acc" stroke-width="1.5"/>
<text x="322" y="232" font-size="16" text-anchor="middle" fill="currentColor" font-weight="bold">47</text>
<rect x="348" y="204" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="370" y="228" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">48</text>
<text x="370" y="243" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷2</text>
<rect x="396" y="204" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="418" y="228" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">49</text>
<text x="418" y="243" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷7</text>
<rect x="444" y="204" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="466" y="228" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">50</text>
<text x="466" y="243" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷2</text>
<rect x="12" y="252" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="34" y="276" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">51</text>
<text x="34" y="291" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷3</text>
<rect x="60" y="252" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="82" y="276" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">52</text>
<text x="82" y="291" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷2</text>
<rect x="108" y="252" width="44" height="44" rx="4" class="soft-acc" fill="currentColor"/>
<rect x="108" y="252" width="44" height="44" rx="4" fill="none" stroke="currentColor" class="acc" stroke-width="1.5"/>
<text x="130" y="280" font-size="16" text-anchor="middle" fill="currentColor" font-weight="bold">53</text>
<rect x="156" y="252" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="178" y="276" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">54</text>
<text x="178" y="291" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷2</text>
<rect x="204" y="252" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="226" y="276" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">55</text>
<text x="226" y="291" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷5</text>
<rect x="252" y="252" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="274" y="276" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">56</text>
<text x="274" y="291" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷2</text>
<rect x="300" y="252" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="322" y="276" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">57</text>
<text x="322" y="291" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷3</text>
<rect x="348" y="252" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="370" y="276" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">58</text>
<text x="370" y="291" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷2</text>
<rect x="396" y="252" width="44" height="44" rx="4" class="soft-acc" fill="currentColor"/>
<rect x="396" y="252" width="44" height="44" rx="4" fill="none" stroke="currentColor" class="acc" stroke-width="1.5"/>
<text x="418" y="280" font-size="16" text-anchor="middle" fill="currentColor" font-weight="bold">59</text>
<rect x="444" y="252" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="466" y="276" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">60</text>
<text x="466" y="291" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷2</text>
<rect x="12" y="300" width="44" height="44" rx="4" class="soft-acc" fill="currentColor"/>
<rect x="12" y="300" width="44" height="44" rx="4" fill="none" stroke="currentColor" class="acc" stroke-width="1.5"/>
<text x="34" y="328" font-size="16" text-anchor="middle" fill="currentColor" font-weight="bold">61</text>
<rect x="60" y="300" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="82" y="324" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">62</text>
<text x="82" y="339" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷2</text>
<rect x="108" y="300" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="130" y="324" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">63</text>
<text x="130" y="339" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷3</text>
<rect x="156" y="300" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="178" y="324" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">64</text>
<text x="178" y="339" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷2</text>
<rect x="204" y="300" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="226" y="324" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">65</text>
<text x="226" y="339" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷5</text>
<rect x="252" y="300" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="274" y="324" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">66</text>
<text x="274" y="339" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷2</text>
<rect x="300" y="300" width="44" height="44" rx="4" class="soft-acc" fill="currentColor"/>
<rect x="300" y="300" width="44" height="44" rx="4" fill="none" stroke="currentColor" class="acc" stroke-width="1.5"/>
<text x="322" y="328" font-size="16" text-anchor="middle" fill="currentColor" font-weight="bold">67</text>
<rect x="348" y="300" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="370" y="324" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">68</text>
<text x="370" y="339" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷2</text>
<rect x="396" y="300" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="418" y="324" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">69</text>
<text x="418" y="339" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷3</text>
<rect x="444" y="300" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="466" y="324" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">70</text>
<text x="466" y="339" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷2</text>
<rect x="12" y="348" width="44" height="44" rx="4" class="soft-acc" fill="currentColor"/>
<rect x="12" y="348" width="44" height="44" rx="4" fill="none" stroke="currentColor" class="acc" stroke-width="1.5"/>
<text x="34" y="376" font-size="16" text-anchor="middle" fill="currentColor" font-weight="bold">71</text>
<rect x="60" y="348" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="82" y="372" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">72</text>
<text x="82" y="387" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷2</text>
<rect x="108" y="348" width="44" height="44" rx="4" class="soft-acc" fill="currentColor"/>
<rect x="108" y="348" width="44" height="44" rx="4" fill="none" stroke="currentColor" class="acc" stroke-width="1.5"/>
<text x="130" y="376" font-size="16" text-anchor="middle" fill="currentColor" font-weight="bold">73</text>
<rect x="156" y="348" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="178" y="372" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">74</text>
<text x="178" y="387" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷2</text>
<rect x="204" y="348" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="226" y="372" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">75</text>
<text x="226" y="387" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷3</text>
<rect x="252" y="348" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="274" y="372" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">76</text>
<text x="274" y="387" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷2</text>
<rect x="300" y="348" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="322" y="372" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">77</text>
<text x="322" y="387" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷7</text>
<rect x="348" y="348" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="370" y="372" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">78</text>
<text x="370" y="387" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷2</text>
<rect x="396" y="348" width="44" height="44" rx="4" class="soft-acc" fill="currentColor"/>
<rect x="396" y="348" width="44" height="44" rx="4" fill="none" stroke="currentColor" class="acc" stroke-width="1.5"/>
<text x="418" y="376" font-size="16" text-anchor="middle" fill="currentColor" font-weight="bold">79</text>
<rect x="444" y="348" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="466" y="372" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">80</text>
<text x="466" y="387" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷2</text>
<rect x="12" y="396" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="34" y="420" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">81</text>
<text x="34" y="435" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷3</text>
<rect x="60" y="396" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="82" y="420" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">82</text>
<text x="82" y="435" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷2</text>
<rect x="108" y="396" width="44" height="44" rx="4" class="soft-acc" fill="currentColor"/>
<rect x="108" y="396" width="44" height="44" rx="4" fill="none" stroke="currentColor" class="acc" stroke-width="1.5"/>
<text x="130" y="424" font-size="16" text-anchor="middle" fill="currentColor" font-weight="bold">83</text>
<rect x="156" y="396" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="178" y="420" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">84</text>
<text x="178" y="435" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷2</text>
<rect x="204" y="396" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="226" y="420" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">85</text>
<text x="226" y="435" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷5</text>
<rect x="252" y="396" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="274" y="420" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">86</text>
<text x="274" y="435" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷2</text>
<rect x="300" y="396" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="322" y="420" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">87</text>
<text x="322" y="435" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷3</text>
<rect x="348" y="396" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="370" y="420" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">88</text>
<text x="370" y="435" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷2</text>
<rect x="396" y="396" width="44" height="44" rx="4" class="soft-acc" fill="currentColor"/>
<rect x="396" y="396" width="44" height="44" rx="4" fill="none" stroke="currentColor" class="acc" stroke-width="1.5"/>
<text x="418" y="424" font-size="16" text-anchor="middle" fill="currentColor" font-weight="bold">89</text>
<rect x="444" y="396" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="466" y="420" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">90</text>
<text x="466" y="435" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷2</text>
<rect x="12" y="444" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="34" y="468" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">91</text>
<text x="34" y="483" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷7</text>
<rect x="60" y="444" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="82" y="468" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">92</text>
<text x="82" y="483" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷2</text>
<rect x="108" y="444" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="130" y="468" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">93</text>
<text x="130" y="483" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷3</text>
<rect x="156" y="444" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="178" y="468" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">94</text>
<text x="178" y="483" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷2</text>
<rect x="204" y="444" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="226" y="468" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">95</text>
<text x="226" y="483" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷5</text>
<rect x="252" y="444" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="274" y="468" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">96</text>
<text x="274" y="483" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷2</text>
<rect x="300" y="444" width="44" height="44" rx="4" class="soft-acc" fill="currentColor"/>
<rect x="300" y="444" width="44" height="44" rx="4" fill="none" stroke="currentColor" class="acc" stroke-width="1.5"/>
<text x="322" y="472" font-size="16" text-anchor="middle" fill="currentColor" font-weight="bold">97</text>
<rect x="348" y="444" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="370" y="468" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">98</text>
<text x="370" y="483" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷2</text>
<rect x="396" y="444" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="418" y="468" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">99</text>
<text x="418" y="483" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷3</text>
<rect x="444" y="444" width="44" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="0.5"/>
<text x="466" y="468" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.55">100</text>
<text x="466" y="483" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic" fill-opacity="0.7">÷2</text>
<text x="250" y="518" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">boxed: the 25 primes up to 100; small print: the prime that crossed each number out</text>
</svg>
<figcaption>Figure 3.4. The sieve of Eratosthenes up to 100. Crossing out multiples of 2, 3, 5 and 7 is enough, because 11 × 11 is already past 100; whatever survives is prime.</figcaption>
</figure>

Eratosthenes of Cyrene (about 276 to 194 BC) was a scholar of everything: he
ran the Library of Alexandria, drew maps of the known world, and measured the
size of the Earth from the angle of the noon sun in two cities. His sieve
reached us through Nicomachus of Gerasa's *Introduction to Arithmetic* in the
2nd century AD. Two thousand years later it is still the fastest simple way to
list all small primes, and key generators use a version of it to throw out
candidates with small factors before testing them ([§3.10](#310-code-it-making-a-prime)).

!!! note "Life story: the sieve of Eratosthenes"
    **Born:** about 240 BC, Alexandria; known through Nicomachus (2nd century AD) · **Purpose:** list every prime
    up to a bound · **Helped:** prime tables for two millennia; its segmented form finds primes into the
    trillions · **Status:** current; key generators sieve out small factors before the expensive tests

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

<figure class="mars-fig">
<svg viewBox="0 0 600 320" width="600" role="img" aria-label="Two rising curves up to n = 10,000: the true number of primes, ending at 1,229, and n over ln n, ending at 1,086" xmlns="http://www.w3.org/2000/svg">
<line x1="60" y1="270" x2="580" y2="270" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 3"/>
<text x="54" y="274" font-size="12" text-anchor="end" fill="currentColor">0</text>
<line x1="60" y1="193.1" x2="580" y2="193.1" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 3"/>
<text x="54" y="197.1" font-size="12" text-anchor="end" fill="currentColor">400</text>
<line x1="60" y1="116.2" x2="580" y2="116.2" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 3"/>
<text x="54" y="120.2" font-size="12" text-anchor="end" fill="currentColor">800</text>
<line x1="60" y1="39.2" x2="580" y2="39.2" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 3"/>
<text x="54" y="43.2" font-size="12" text-anchor="end" fill="currentColor">1200</text>
<text x="60" y="288" font-size="12" text-anchor="middle" fill="currentColor">0</text>
<text x="190" y="288" font-size="12" text-anchor="middle" fill="currentColor">2,500</text>
<text x="320" y="288" font-size="12" text-anchor="middle" fill="currentColor">5,000</text>
<text x="450" y="288" font-size="12" text-anchor="middle" fill="currentColor">7,500</text>
<text x="580" y="288" font-size="12" text-anchor="middle" fill="currentColor">10,000</text>
<path d="M60.1 269.8 L62.7 267.1 L65.3 265.0 L67.9 263.1 L70.5 261.2 L73.1 259.6 L75.7 258.1 L78.3 256.5 L80.9 254.8 L83.5 253.3 L86.1 251.7 L88.7 250.6 L91.3 248.8 L93.9 247.3 L96.5 245.8 L99.1 244.4 L101.7 243.3 L104.3 241.9 L106.9 240.4 L109.5 239.0 L112.1 237.7 L114.7 236.0 L117.3 234.6 L119.9 233.5 L122.5 232.1 L125.1 230.8 L127.7 229.2 L130.3 228.3 L132.9 227.3 L135.5 225.8 L138.1 224.0 L140.7 223.1 L143.3 221.5 L145.9 220.2 L148.5 218.8 L151.1 217.7 L153.7 216.3 L156.3 215.6 L158.9 214.0 L161.5 212.9 L164.1 211.7 L166.7 210.6 L169.3 209.0 L171.9 207.7 L174.5 207.1 L177.1 205.6 L179.7 204.2 L182.3 202.9 L184.9 201.3 L187.5 200.2 L190.1 199.4 L192.7 198.1 L195.3 197.3 L197.9 196.3 L200.5 194.4 L203.1 192.9 L205.7 191.5 L208.3 190.4 L210.9 189.4 L213.5 188.5 L216.1 187.1 L218.7 186.0 L221.3 185.0 L223.9 184.2 L226.5 183.1 L229.1 181.9 L231.7 180.8 L234.3 179.2 L236.9 178.1 L239.5 177.3 L242.1 176.0 L244.7 174.4 L247.3 173.3 L249.9 171.9 L252.5 170.6 L255.1 169.6 L257.7 168.5 L260.3 167.3 L262.9 166.3 L265.5 164.6 L268.1 164.0 L270.7 162.5 L273.3 161.3 L275.9 160.4 L278.5 159.4 L281.1 158.1 L283.7 156.5 L286.3 155.8 L288.9 154.8 L291.5 153.7 L294.1 152.7 L296.7 151.3 L299.3 150.4 L301.9 149.0 L304.5 148.1 L307.1 146.9 L309.7 145.6 L312.3 145.0 L314.9 144.2 L317.5 142.7 L320.1 141.3 L322.7 140.0 L325.3 138.8 L327.9 138.1 L330.5 136.9 L333.1 136.0 L335.7 135.0 L338.3 133.8 L340.9 133.1 L343.5 131.3 L346.1 130.4 L348.7 129.2 L351.3 128.1 L353.9 127.1 L356.5 125.6 L359.1 124.4 L361.7 123.7 L364.3 122.1 L366.9 120.8 L369.5 120.0 L372.1 119.4 L374.7 118.3 L377.3 116.9 L379.9 115.8 L382.5 115.0 L385.1 113.8 L387.7 112.3 L390.3 111.2 L392.9 109.6 L395.5 108.8 L398.1 108.1 L400.7 107.3 L403.3 106.0 L405.9 105.4 L408.5 103.8 L411.1 102.9 L413.7 101.7 L416.3 100.6 L418.9 99.4 L421.5 98.5 L424.1 96.7 L426.7 95.8 L429.3 95.2 L431.9 94.0 L434.5 93.3 L437.1 91.7 L439.7 91.2 L442.3 89.8 L444.9 89.4 L447.5 88.7 L450.1 87.3 L452.7 85.8 L455.3 84.4 L457.9 83.3 L460.5 82.1 L463.1 81.2 L465.7 80.2 L468.3 79.4 L470.9 78.1 L473.5 76.7 L476.1 76.3 L478.7 75.6 L481.3 74.0 L483.9 73.3 L486.5 72.3 L489.1 71.0 L491.7 69.6 L494.3 69.0 L496.9 67.9 L499.5 66.7 L502.1 66.2 L504.7 65.0 L507.3 64.0 L509.9 62.9 L512.5 61.5 L515.1 60.2 L517.7 59.4 L520.3 57.9 L522.9 56.9 L525.5 56.0 L528.1 55.0 L530.7 53.7 L533.3 53.1 L535.9 51.9 L538.5 50.8 L541.1 49.6 L543.7 48.7 L546.3 47.3 L548.9 46.5 L551.5 45.0 L554.1 43.7 L556.7 42.5 L559.3 42.1 L561.9 40.8 L564.5 39.8 L567.1 38.7 L569.7 37.7 L572.3 36.3 L574.9 35.2 L577.5 34.0 L580.0 33.7" stroke="currentColor" stroke-width="2.5" fill="none" class="acc"/>
<path d="M60.2 269.5 L62.8 267.4 L65.4 265.7 L68.0 264.2 L70.6 262.7 L73.2 261.2 L75.8 259.8 L78.4 258.4 L81.0 257.1 L83.6 255.8 L86.2 254.4 L88.8 253.2 L91.4 251.9 L94.0 250.6 L96.6 249.4 L99.2 248.1 L101.8 246.9 L104.4 245.7 L107.0 244.5 L109.6 243.3 L112.2 242.1 L114.8 240.9 L117.4 239.7 L120.0 238.5 L122.6 237.4 L125.2 236.2 L127.8 235.1 L130.4 233.9 L133.0 232.8 L135.6 231.6 L138.2 230.5 L140.8 229.4 L143.4 228.2 L146.0 227.1 L148.6 226.0 L151.2 224.9 L153.8 223.8 L156.4 222.6 L159.0 221.5 L161.6 220.4 L164.2 219.3 L166.8 218.2 L169.4 217.1 L172.0 216.1 L174.6 215.0 L177.2 213.9 L179.8 212.8 L182.4 211.7 L185.0 210.6 L187.6 209.6 L190.2 208.5 L192.8 207.4 L195.4 206.3 L198.0 205.3 L200.6 204.2 L203.2 203.2 L205.8 202.1 L208.4 201.0 L211.0 200.0 L213.6 198.9 L216.2 197.9 L218.8 196.8 L221.4 195.8 L224.0 194.7 L226.6 193.7 L229.2 192.6 L231.8 191.6 L234.4 190.6 L237.0 189.5 L239.6 188.5 L242.2 187.5 L244.8 186.4 L247.4 185.4 L250.0 184.4 L252.6 183.3 L255.2 182.3 L257.8 181.3 L260.4 180.3 L263.0 179.2 L265.6 178.2 L268.2 177.2 L270.8 176.2 L273.4 175.2 L276.0 174.1 L278.6 173.1 L281.2 172.1 L283.8 171.1 L286.4 170.1 L289.0 169.1 L291.6 168.1 L294.2 167.1 L296.8 166.1 L299.4 165.1 L302.0 164.0 L304.6 163.0 L307.2 162.0 L309.8 161.0 L312.4 160.0 L315.0 159.0 L317.6 158.0 L320.2 157.0 L322.8 156.1 L325.4 155.1 L328.0 154.1 L330.6 153.1 L333.2 152.1 L335.8 151.1 L338.4 150.1 L341.0 149.1 L343.6 148.1 L346.2 147.1 L348.8 146.1 L351.4 145.2 L354.0 144.2 L356.6 143.2 L359.2 142.2 L361.8 141.2 L364.4 140.2 L367.0 139.3 L369.6 138.3 L372.2 137.3 L374.8 136.3 L377.4 135.4 L380.0 134.4 L382.6 133.4 L385.2 132.4 L387.8 131.5 L390.4 130.5 L393.0 129.5 L395.6 128.5 L398.2 127.6 L400.8 126.6 L403.4 125.6 L406.0 124.7 L408.6 123.7 L411.2 122.7 L413.8 121.8 L416.4 120.8 L419.0 119.8 L421.6 118.9 L424.2 117.9 L426.8 116.9 L429.4 116.0 L432.0 115.0 L434.6 114.0 L437.2 113.1 L439.8 112.1 L442.4 111.2 L445.0 110.2 L447.6 109.3 L450.2 108.3 L452.8 107.3 L455.4 106.4 L458.0 105.4 L460.6 104.5 L463.2 103.5 L465.8 102.6 L468.4 101.6 L471.0 100.7 L473.6 99.7 L476.2 98.8 L478.8 97.8 L481.4 96.9 L484.0 95.9 L486.6 95.0 L489.2 94.0 L491.8 93.1 L494.4 92.1 L497.0 91.2 L499.6 90.2 L502.2 89.3 L504.8 88.3 L507.4 87.4 L510.0 86.4 L512.6 85.5 L515.2 84.6 L517.8 83.6 L520.4 82.7 L523.0 81.7 L525.6 80.8 L528.2 79.9 L530.8 78.9 L533.4 78.0 L536.0 77.0 L538.6 76.1 L541.2 75.2 L543.8 74.2 L546.4 73.3 L549.0 72.3 L551.6 71.4 L554.2 70.5 L556.8 69.5 L559.4 68.6 L562.0 67.7 L564.6 66.7 L567.2 65.8 L569.8 64.9 L572.4 63.9 L575.0 63.0 L577.6 62.1 L580.0 61.2" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="6 4"/>
<line x1="60" y1="270" x2="580" y2="270" stroke="currentColor" stroke-width="1.5"/>
<text x="576" y="23.7" font-size="13" text-anchor="end" fill="currentColor" class="acc-fill" font-weight="bold">π(n), the count of primes: 1,229</text>
<rect x="465.8" y="92.9" width="113.3" height="16.9" style="fill: var(--md-default-bg-color)"/>
<text x="576" y="105.2" font-size="13" text-anchor="end" fill="currentColor">n / ln n: 1,086</text>
<text x="320" y="312" font-size="13" text-anchor="middle" fill="currentColor" font-style="italic">n</text>
</svg>
<figcaption>Figure 3.5. The prime number theorem in a picture. The number of primes up to n (solid) and Gauss's estimate n / ln n (dashed) grow together; their ratio tends to 1, so near x about one number in ln x is prime.</figcaption>
</figure>

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

<figure class="mars-fig">
<svg viewBox="0 0 619 308" width="619" role="img" aria-label="A 1071 by 462 rectangle cut into two 462-squares, three 147-squares and seven tiny 21-squares" xmlns="http://www.w3.org/2000/svg">
<rect x="10" y="10" width="599.8" height="258.7" rx="0" fill="none" stroke="currentColor" stroke-width="2"/>
<rect x="10" y="10" width="258.7" height="258.7" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.2"/>
<text x="139.4" y="145.4" font-size="16" text-anchor="middle" fill="currentColor" font-weight="bold">462</text>
<rect x="268.7" y="10" width="258.7" height="258.7" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.2"/>
<text x="398.1" y="145.4" font-size="16" text-anchor="middle" fill="currentColor" font-weight="bold">462</text>
<rect x="527.4" y="10" width="82.3" height="82.3" rx="0" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="568.6" y="56.2" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">147</text>
<rect x="527.4" y="92.3" width="82.3" height="82.3" rx="0" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="568.6" y="138.5" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">147</text>
<rect x="527.4" y="174.6" width="82.3" height="82.3" rx="0" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="568.6" y="220.8" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">147</text>
<rect x="527.4" y="257" width="11.8" height="11.8" rx="0" class="soft-acc" fill="currentColor"/>
<rect x="527.4" y="257" width="11.8" height="11.8" rx="0" fill="none" stroke="currentColor" class="acc" stroke-width="1"/>
<rect x="539.2" y="257" width="11.8" height="11.8" rx="0" class="soft-acc" fill="currentColor"/>
<rect x="539.2" y="257" width="11.8" height="11.8" rx="0" fill="none" stroke="currentColor" class="acc" stroke-width="1"/>
<rect x="551" y="257" width="11.8" height="11.8" rx="0" class="soft-acc" fill="currentColor"/>
<rect x="551" y="257" width="11.8" height="11.8" rx="0" fill="none" stroke="currentColor" class="acc" stroke-width="1"/>
<rect x="562.7" y="257" width="11.8" height="11.8" rx="0" class="soft-acc" fill="currentColor"/>
<rect x="562.7" y="257" width="11.8" height="11.8" rx="0" fill="none" stroke="currentColor" class="acc" stroke-width="1"/>
<rect x="574.5" y="257" width="11.8" height="11.8" rx="0" class="soft-acc" fill="currentColor"/>
<rect x="574.5" y="257" width="11.8" height="11.8" rx="0" fill="none" stroke="currentColor" class="acc" stroke-width="1"/>
<rect x="586.2" y="257" width="11.8" height="11.8" rx="0" class="soft-acc" fill="currentColor"/>
<rect x="586.2" y="257" width="11.8" height="11.8" rx="0" fill="none" stroke="currentColor" class="acc" stroke-width="1"/>
<rect x="598" y="257" width="11.8" height="11.8" rx="0" class="soft-acc" fill="currentColor"/>
<rect x="598" y="257" width="11.8" height="11.8" rx="0" fill="none" stroke="currentColor" class="acc" stroke-width="1"/>
<text x="309.9" y="302.7" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">1071 × 462: two squares of 462, three of 147, seven of 21; 21 tiles it all</text>
<line x1="613.8" y1="287" x2="581" y2="272.7" stroke="currentColor" stroke-width="1.2" class="acc"/>
<polygon points="574.6,270 583.4,269.8 580.5,276.4" fill="currentColor" class="acc-fill"/>
<text x="615.8" y="301" font-size="12" text-anchor="end" fill="currentColor" class="acc-fill" font-weight="bold">21 × 21</text>
</svg>
<figcaption>Figure 3.6. Euclid's algorithm as geometry. Cut the largest possible squares off a 1071 by 462 rectangle, then off the leftover strip, and so on. The last square size, 21, divides every side along the way, so it is the gcd.</figcaption>
</figure>

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

Euclid wrote the method down in Book VII of the *Elements*, around 300 BC in
Alexandria, probably collecting it from earlier Greek mathematicians rather
than inventing it. He described it with line segments, taking the shorter
from the longer again and again, which is the picture above. Donald Knuth
called it the oldest nontrivial algorithm that has survived to the present day.
Lamé's 1844 analysis of its running time is often counted as the start of the
study of how fast algorithms are.

!!! note "Life story: Euclid's algorithm"
    **Born:** about 300 BC, Alexandria, *Elements* VII.1 to VII.2 · **Purpose:** find the largest common measure
    of two lengths or numbers · **Helped:** fractions in lowest terms for two millennia; today, inverses for RSA,
    checks on keys, and the attack on shared primes · **Status:** current, in every cryptographic library

That speed has a dark side, and it is in the second example above. $3233$ and
$3599$ are two toy RSA moduli; their gcd, 61, is a prime they share, and then
$3233 = 61 \cdot 53$ and $3599 = 61 \cdot 59$ are both factored. In 2012 a
team collected millions of real RSA public keys from the internet and found,
with a fast all-pairs gcd, tens of thousands that shared a prime with another
key. Section 3.11 tells the story.

<figure class="mars-fig">
<svg viewBox="0 0 600 200" width="600" role="img" aria-label="Two RSA moduli 3233 and 3599 share the prime factor 61, which their gcd reveals; the cofactors are 53 and 59" xmlns="http://www.w3.org/2000/svg">
<rect x="30" y="20" width="200" height="44" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="30" y="20" width="200" height="44" rx="6" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="130" y="47.2" font-size="15" text-anchor="middle" fill="currentColor" font-weight="bold">n₁ = 3233</text>
<rect x="370" y="20" width="200" height="44" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="370" y="20" width="200" height="44" rx="6" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="470" y="47.2" font-size="15" text-anchor="middle" fill="currentColor" font-weight="bold">n₂ = 3599</text>
<rect x="30" y="120" width="90" height="40" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="30" y="120" width="90" height="40" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="75" y="145.2" font-size="15" text-anchor="middle" fill="currentColor">53</text>
<rect x="250" y="120" width="100" height="40" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="250" y="120" width="100" height="40" rx="6" class="soft-acc" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<rect x="250" y="120" width="100" height="40" rx="6" fill="none" stroke="currentColor" class="acc" stroke-width="2"/>
<text x="300" y="145.6" font-size="16" text-anchor="middle" fill="currentColor" font-weight="bold">61</text>
<rect x="480" y="120" width="90" height="40" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="480" y="120" width="90" height="40" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="525" y="145.2" font-size="15" text-anchor="middle" fill="currentColor">59</text>
<line x1="90" y1="64" x2="75" y2="120" stroke="currentColor" stroke-width="1.5"/>
<line x1="170" y1="64" x2="270" y2="120" stroke="currentColor" stroke-width="2" class="acc"/>
<line x1="430" y1="64" x2="330" y2="120" stroke="currentColor" stroke-width="2" class="acc"/>
<line x1="510" y1="64" x2="525" y2="120" stroke="currentColor" stroke-width="1.5"/>
<rect x="213" y="86.7" width="174" height="18.2" style="fill: var(--md-default-bg-color)"/>
<text x="300" y="100" font-size="14" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">gcd(3233, 3599) = 61</text>
<text x="300" y="190" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">one cheap gcd factors both keys; the 2012 survey did this for millions</text>
</svg>
<figcaption>Figure 3.7. Why a shared prime is fatal. Factoring either modulus alone is hard at real sizes, but Euclid finds the common prime instantly, and division gives the rest.</figcaption>
</figure>

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

<figure class="mars-fig">
<svg viewBox="0 0 600 260" width="600" role="img" aria-label="A table of Euclid's steps on 26 and 7 with Bezout coefficients filled in from the bottom up, ending with x = 3, y = -11" xmlns="http://www.w3.org/2000/svg">
<text x="70" y="30" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold" font-style="italic">a</text>
<text x="140" y="30" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold" font-style="italic">b</text>
<text x="230" y="30" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">q = a // b</text>
<text x="330" y="30" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">a mod b</text>
<text x="430" y="30" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold" font-style="italic">x</text>
<text x="500" y="30" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold" font-style="italic">y</text>
<line x1="30" y1="40" x2="560" y2="40" stroke="currentColor" stroke-width="1"/>
<text x="70" y="66" font-size="15" text-anchor="middle" fill="currentColor">26</text>
<text x="140" y="66" font-size="15" text-anchor="middle" fill="currentColor">7</text>
<text x="230" y="66" font-size="15" text-anchor="middle" fill="currentColor">3</text>
<text x="330" y="66" font-size="15" text-anchor="middle" fill="currentColor">5</text>
<text x="430" y="66" font-size="15" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">3</text>
<text x="500" y="66" font-size="15" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">−11</text>
<text x="70" y="100" font-size="15" text-anchor="middle" fill="currentColor">7</text>
<text x="140" y="100" font-size="15" text-anchor="middle" fill="currentColor">5</text>
<text x="230" y="100" font-size="15" text-anchor="middle" fill="currentColor">1</text>
<text x="330" y="100" font-size="15" text-anchor="middle" fill="currentColor">2</text>
<text x="430" y="100" font-size="15" text-anchor="middle" fill="currentColor">−2</text>
<text x="500" y="100" font-size="15" text-anchor="middle" fill="currentColor">3</text>
<text x="70" y="134" font-size="15" text-anchor="middle" fill="currentColor">5</text>
<text x="140" y="134" font-size="15" text-anchor="middle" fill="currentColor">2</text>
<text x="230" y="134" font-size="15" text-anchor="middle" fill="currentColor">2</text>
<text x="330" y="134" font-size="15" text-anchor="middle" fill="currentColor">1</text>
<text x="430" y="134" font-size="15" text-anchor="middle" fill="currentColor">1</text>
<text x="500" y="134" font-size="15" text-anchor="middle" fill="currentColor">−2</text>
<text x="70" y="168" font-size="15" text-anchor="middle" fill="currentColor">2</text>
<text x="140" y="168" font-size="15" text-anchor="middle" fill="currentColor">1</text>
<text x="230" y="168" font-size="15" text-anchor="middle" fill="currentColor">2</text>
<text x="330" y="168" font-size="15" text-anchor="middle" fill="currentColor">0</text>
<text x="430" y="168" font-size="15" text-anchor="middle" fill="currentColor">0</text>
<text x="500" y="168" font-size="15" text-anchor="middle" fill="currentColor">1</text>
<line x1="30" y1="60" x2="30" y2="163" stroke="currentColor" stroke-width="1.5"/>
<polygon points="30,170 26.4,162 33.6,162" fill="currentColor"/>
<text x="18" y="120" font-size="12" text-anchor="middle" fill="currentColor" transform="rotate(-90 18 120)">down: Euclid</text>
<line x1="570" y1="170" x2="570" y2="67" stroke="currentColor" stroke-width="1.5" class="acc"/>
<polygon points="570,60 573.6,68 566.4,68" fill="currentColor" class="acc-fill"/>
<text x="588" y="115" font-size="12" text-anchor="middle" fill="currentColor" class="acc-fill" transform="rotate(90 588 115)">up: back-substitute</text>
<text x="300" y="210" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">each row: a·x + b·y = 1, with x, y taken from the row below:</text>
<text x="300" y="230" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">x = y′ and y = x′ − q·y′</text>
<text x="300" y="252" font-size="13" text-anchor="middle" fill="currentColor" class="acc-fill">top row: 26·3 + 7·(−11) = 1, so 7⁻¹ ≡ −11 ≡ 15 (mod 26)</text>
</svg>
<figcaption>Figure 3.8. The extended Euclid algorithm as a table. Go down doing ordinary Euclid; at the bottom, 2·0 + 1·1 = 1; then climb back up, each row's coefficients computed from the row below. This is exactly what the recursive code does.</figcaption>
</figure>

Python 3.8 and later has this built in: `pow(7, -1, 26)` is 15. The second
example, $17^{-1} \bmod 3120 = 2753$, is exactly the step that makes an RSA
private key ([Chapter 13](13-RSA.md)).

**The story.** Aryabhata's *Aryabhatiya* (AD 499) gives this method, the
*kuṭṭaka* ("pulverizer"), for solving $a x + b y = c$ in whole numbers, which
astronomers needed to find when planetary cycles line up. Brahmagupta extended
it in 628. Europe met the same method over a thousand years later, through
Claude-Gaspard Bachet in the 17th century.

!!! note "Life story: the extended Euclid algorithm"
    **Born:** AD 499, Aryabhata's *kuṭṭaka*, for astronomy; extended by Brahmagupta (628); in Europe through
    Claude-Gaspard Bachet (17th century) · **Purpose:** solve $a x + b y = c$ in whole numbers · **Helped:**
    calendars and planetary cycles; since 1977, every RSA private key and every modular inverse in elliptic
    curve code · **Status:** current, built into Python as `pow(a, -1, n)`

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

<figure class="mars-fig">
<svg viewBox="0 0 680 210" width="680" role="img" aria-label="A chain of boxes: start at 1, then for bits 1, 1, 0, 1 square and multiply by 5, giving 5, 10, 8, 21" xmlns="http://www.w3.org/2000/svg">
<rect x="10" y="70" width="50" height="40" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="10" y="70" width="50" height="40" rx="6" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="35" y="94.5" font-size="13" text-anchor="middle" fill="currentColor">1</text>
<text x="35" y="130" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">start</text>
<text x="138" y="30" font-size="14" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">bit 1</text>
<line x1="60" y1="90" x2="79" y2="90" stroke="currentColor" stroke-width="1.5"/>
<polygon points="86,90 78,93.6 78,86.4" fill="currentColor"/>
<rect x="86" y="70" width="52" height="40" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="86" y="70" width="52" height="40" rx="6" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="112" y="94.5" font-size="13" text-anchor="middle" fill="currentColor">1</text>
<text x="73" y="82" font-size="14" text-anchor="middle" fill="currentColor">²</text>
<text x="112" y="130" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">square</text>
<line x1="138" y1="90" x2="157" y2="90" stroke="currentColor" stroke-width="1.5" class="acc"/>
<polygon points="164,90 156,93.6 156,86.4" fill="currentColor" class="acc-fill"/>
<rect x="164" y="70" width="52" height="40" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="164" y="70" width="52" height="40" rx="6" class="soft-acc" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<rect x="164" y="70" width="52" height="40" rx="6" fill="none" stroke="currentColor" class="acc" stroke-width="2"/>
<text x="190" y="94.5" font-size="13" text-anchor="middle" fill="currentColor">5</text>
<text x="151" y="82" font-size="12" text-anchor="middle" fill="currentColor" class="acc-fill">×5</text>
<text x="190" y="130" font-size="12" text-anchor="middle" fill="currentColor" class="acc-fill" font-style="italic">multiply</text>
<text x="294" y="30" font-size="14" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">bit 1</text>
<line x1="216" y1="90" x2="235" y2="90" stroke="currentColor" stroke-width="1.5"/>
<polygon points="242,90 234,93.6 234,86.4" fill="currentColor"/>
<rect x="242" y="70" width="52" height="40" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="242" y="70" width="52" height="40" rx="6" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="268" y="94.5" font-size="13" text-anchor="middle" fill="currentColor">2</text>
<text x="229" y="82" font-size="14" text-anchor="middle" fill="currentColor">²</text>
<text x="268" y="130" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">square</text>
<line x1="294" y1="90" x2="313" y2="90" stroke="currentColor" stroke-width="1.5" class="acc"/>
<polygon points="320,90 312,93.6 312,86.4" fill="currentColor" class="acc-fill"/>
<rect x="320" y="70" width="52" height="40" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="320" y="70" width="52" height="40" rx="6" class="soft-acc" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<rect x="320" y="70" width="52" height="40" rx="6" fill="none" stroke="currentColor" class="acc" stroke-width="2"/>
<text x="346" y="94.5" font-size="13" text-anchor="middle" fill="currentColor">10</text>
<text x="307" y="82" font-size="12" text-anchor="middle" fill="currentColor" class="acc-fill">×5</text>
<text x="346" y="130" font-size="12" text-anchor="middle" fill="currentColor" class="acc-fill" font-style="italic">multiply</text>
<text x="414" y="30" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">bit 0</text>
<line x1="372" y1="90" x2="391" y2="90" stroke="currentColor" stroke-width="1.5"/>
<polygon points="398,90 390,93.6 390,86.4" fill="currentColor"/>
<rect x="398" y="70" width="52" height="40" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="398" y="70" width="52" height="40" rx="6" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="424" y="94.5" font-size="13" text-anchor="middle" fill="currentColor">8</text>
<text x="385" y="82" font-size="14" text-anchor="middle" fill="currentColor">²</text>
<text x="424" y="130" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">square</text>
<text x="534" y="30" font-size="14" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">bit 1</text>
<line x1="456" y1="90" x2="475" y2="90" stroke="currentColor" stroke-width="1.5"/>
<polygon points="482,90 474,93.6 474,86.4" fill="currentColor"/>
<rect x="482" y="70" width="52" height="40" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="482" y="70" width="52" height="40" rx="6" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="508" y="94.5" font-size="13" text-anchor="middle" fill="currentColor">18</text>
<text x="469" y="82" font-size="14" text-anchor="middle" fill="currentColor">²</text>
<text x="508" y="130" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">square</text>
<line x1="534" y1="90" x2="553" y2="90" stroke="currentColor" stroke-width="1.5" class="acc"/>
<polygon points="560,90 552,93.6 552,86.4" fill="currentColor" class="acc-fill"/>
<rect x="560" y="70" width="52" height="40" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="560" y="70" width="52" height="40" rx="6" class="soft-acc" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<rect x="560" y="70" width="52" height="40" rx="6" fill="none" stroke="currentColor" class="acc" stroke-width="2"/>
<text x="586" y="94.5" font-size="13" text-anchor="middle" fill="currentColor">21</text>
<text x="547" y="82" font-size="12" text-anchor="middle" fill="currentColor" class="acc-fill">×5</text>
<text x="586" y="130" font-size="12" text-anchor="middle" fill="currentColor" class="acc-fill" font-style="italic">multiply</text>
<text x="340" y="175" font-size="13" text-anchor="middle" fill="currentColor">13 = 1101 in binary: four squarings, three multiplications, all mod 23</text>
<text x="340" y="198" font-size="14" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">5¹³ mod 23 = 21</text>
</svg>
<figcaption>Figure 3.9. Square and multiply on 5¹³ mod 23, the table above as a chain. Each bit costs a squaring; each 1 bit also costs a multiplication.</figcaption>
</figure>

**The story.** Doubling is one of the oldest tricks in arithmetic. The
Egyptian scribe of the Rhind Mathematical Papyrus (about 1550 BC) multiplied
by doubling and adding the doublings he needed, which is square and multiply
with addition in place of multiplication. Pingala's rules for counting poetic
meters (India, about 200 BC) compute $2^n$ by halving $n$ and squaring, and
Indian and Arabic arithmetic books passed the idea on. It became central only
when exponents grew to hundreds of digits: without it, RSA and Diffie-Hellman
would be useless, because the honest user would need as much time as the
attacker.

!!! note "Life story: square and multiply"
    **Born:** doubling in Egypt (Rhind Papyrus, about 1550 BC); repeated squaring in Pingala's work (India,
    about 200 BC) · **Purpose:** reach a huge power in a few steps · **Helped:** makes every RSA, Diffie-Hellman
    and DSA operation fast · **Status:** current, but the plain version leaks its exponent through timing
    (Kocher, 1996), so secret exponents use constant-time versions such as the Montgomery ladder
    ([§3.11](#311-break-it-when-the-arithmetic-leaks))

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

<figure class="mars-fig">
<svg viewBox="0 0 560 230" width="560" role="img" aria-label="Arrows from 1 to 6 to their multiples by 3 mod 7, which hit every number 1 to 6 exactly once" xmlns="http://www.w3.org/2000/svg">
<text x="40" y="64" font-size="14" text-anchor="end" fill="currentColor" font-style="italic">i</text>
<text x="40" y="174" font-size="13" text-anchor="end" fill="currentColor">3·i mod 7</text>
<circle cx="110" cy="60" r="18" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="110" y="65" font-size="15" text-anchor="middle" fill="currentColor" font-weight="bold">1</text>
<line x1="110" y1="80" x2="263.6" y2="147.2" stroke="currentColor" stroke-width="1.3" class="acc"/>
<polygon points="270,150 261.2,150.1 264.1,143.5" fill="currentColor" class="acc-fill"/>
<circle cx="190" cy="60" r="18" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="190" y="65" font-size="15" text-anchor="middle" fill="currentColor" font-weight="bold">2</text>
<line x1="190" y1="80" x2="503.2" y2="148.5" stroke="currentColor" stroke-width="1.3" class="acc"/>
<polygon points="510,150 501.4,151.8 503,144.8" fill="currentColor" class="acc-fill"/>
<circle cx="270" cy="60" r="18" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="270" y="65" font-size="15" text-anchor="middle" fill="currentColor" font-weight="bold">3</text>
<line x1="270" y1="80" x2="195.3" y2="145.4" stroke="currentColor" stroke-width="1.3" class="acc"/>
<polygon points="190,150 193.6,142 198.4,147.4" fill="currentColor" class="acc-fill"/>
<circle cx="350" cy="60" r="18" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="350" y="65" font-size="15" text-anchor="middle" fill="currentColor" font-weight="bold">4</text>
<line x1="350" y1="80" x2="424.7" y2="145.4" stroke="currentColor" stroke-width="1.3" class="acc"/>
<polygon points="430,150 421.6,147.4 426.4,142" fill="currentColor" class="acc-fill"/>
<circle cx="430" cy="60" r="18" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="430" y="65" font-size="15" text-anchor="middle" fill="currentColor" font-weight="bold">5</text>
<line x1="430" y1="80" x2="116.8" y2="148.5" stroke="currentColor" stroke-width="1.3" class="acc"/>
<polygon points="110,150 117,144.8 118.6,151.8" fill="currentColor" class="acc-fill"/>
<circle cx="510" cy="60" r="18" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="510" y="65" font-size="15" text-anchor="middle" fill="currentColor" font-weight="bold">6</text>
<line x1="510" y1="80" x2="356.4" y2="147.2" stroke="currentColor" stroke-width="1.3" class="acc"/>
<polygon points="350,150 355.9,143.5 358.8,150.1" fill="currentColor" class="acc-fill"/>
<circle cx="110" cy="170" r="18" class="soft-acc" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="110" y="175" font-size="15" text-anchor="middle" fill="currentColor" font-weight="bold">1</text>
<circle cx="190" cy="170" r="18" class="soft-acc" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="190" y="175" font-size="15" text-anchor="middle" fill="currentColor" font-weight="bold">2</text>
<circle cx="270" cy="170" r="18" class="soft-acc" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="270" y="175" font-size="15" text-anchor="middle" fill="currentColor" font-weight="bold">3</text>
<circle cx="350" cy="170" r="18" class="soft-acc" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="350" y="175" font-size="15" text-anchor="middle" fill="currentColor" font-weight="bold">4</text>
<circle cx="430" cy="170" r="18" class="soft-acc" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="430" y="175" font-size="15" text-anchor="middle" fill="currentColor" font-weight="bold">5</text>
<circle cx="510" cy="170" r="18" class="soft-acc" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="510" y="175" font-size="15" text-anchor="middle" fill="currentColor" font-weight="bold">6</text>
<text x="280" y="216" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">1·2·3·4·5·6 = 3⁶ · (1·2·3·4·5·6) mod 7,  so 3⁶ ≡ 1</text>
</svg>
<figcaption>Figure 3.10. The proof of Fermat's little theorem for p = 7 and a = 3. Multiplying by 3 only shuffles the numbers 1 to 6, so their product is unchanged, and cancelling it leaves 3⁶ ≡ 1 (mod 7).</figcaption>
</figure>

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

**The people.** Pierre de Fermat was a magistrate in Toulouse who did
mathematics in his spare time and shared it in letters, usually without
proofs. He stated the little theorem in a letter to Bernard Frénicle de Bessy
dated 18 October 1640, adding that he would send the proof if it were not too
long. Leibniz proved it in unpublished notes around 1683; Euler published the
first proof in 1736 and, in 1763, the version with $\varphi(n)$ for any modulus.
For more than two centuries it was a curiosity of number theory. In 1977 it
became the reason RSA works.

!!! note "Life story: Fermat's little theorem and Euler's theorem"
    **Born:** 1640, Fermat's letter to Frénicle; proved by Euler (1736) and generalized by him with
    $\varphi(n)$ (1763) · **Purpose:** pure number theory · **Helped:** the correctness of RSA, the Fermat and
    Miller-Rabin primality tests, and fast inverses ($a^{p-2} \bmod p$) in elliptic curve code ·
    **Status:** current; a theorem doesn't retire

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

<figure class="mars-fig">
<svg viewBox="0 0 520 250" width="520" role="img" aria-label="A 3 by 5 grid placing each number 0 to 14 by its remainders mod 3 and mod 5; every cell holds exactly one number" xmlns="http://www.w3.org/2000/svg">
<text x="300" y="22" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">x mod 5</text>
<text x="40" y="126" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold" transform="rotate(-90 40 126)">x mod 3</text>
<text x="148" y="48" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">0</text>
<text x="224" y="48" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">1</text>
<text x="300" y="48" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">2</text>
<text x="376" y="48" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">3</text>
<text x="452" y="48" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">4</text>
<text x="94" y="88" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">0</text>
<rect x="110" y="60" width="76" height="44" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.8"/>
<text x="148" y="89" font-size="17" text-anchor="middle" fill="currentColor">0</text>
<rect x="186" y="60" width="76" height="44" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.8"/>
<text x="224" y="89" font-size="17" text-anchor="middle" fill="currentColor">6</text>
<rect x="262" y="60" width="76" height="44" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.8"/>
<text x="300" y="89" font-size="17" text-anchor="middle" fill="currentColor">12</text>
<rect x="338" y="60" width="76" height="44" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.8"/>
<text x="376" y="89" font-size="17" text-anchor="middle" fill="currentColor">3</text>
<rect x="414" y="60" width="76" height="44" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.8"/>
<text x="452" y="89" font-size="17" text-anchor="middle" fill="currentColor">9</text>
<text x="94" y="132" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">1</text>
<rect x="110" y="104" width="76" height="44" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.8"/>
<text x="148" y="133" font-size="17" text-anchor="middle" fill="currentColor">10</text>
<rect x="186" y="104" width="76" height="44" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.8"/>
<text x="224" y="133" font-size="17" text-anchor="middle" fill="currentColor">1</text>
<rect x="262" y="104" width="76" height="44" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.8"/>
<text x="300" y="133" font-size="17" text-anchor="middle" fill="currentColor">7</text>
<rect x="338" y="104" width="76" height="44" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.8"/>
<text x="376" y="133" font-size="17" text-anchor="middle" fill="currentColor">13</text>
<rect x="414" y="104" width="76" height="44" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.8"/>
<text x="452" y="133" font-size="17" text-anchor="middle" fill="currentColor">4</text>
<text x="94" y="176" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">2</text>
<rect x="110" y="148" width="76" height="44" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.8"/>
<text x="148" y="177" font-size="17" text-anchor="middle" fill="currentColor">5</text>
<rect x="186" y="148" width="76" height="44" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.8"/>
<text x="224" y="177" font-size="17" text-anchor="middle" fill="currentColor">11</text>
<rect x="262" y="148" width="76" height="44" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.8"/>
<text x="300" y="177" font-size="17" text-anchor="middle" fill="currentColor">2</text>
<rect x="338" y="148" width="76" height="44" rx="0" class="soft-acc" fill="currentColor"/>
<rect x="338" y="148" width="76" height="44" rx="0" fill="none" stroke="currentColor" class="acc" stroke-width="0.8"/>
<text x="376" y="177" font-size="17" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">8</text>
<rect x="414" y="148" width="76" height="44" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.8"/>
<text x="452" y="177" font-size="17" text-anchor="middle" fill="currentColor">14</text>
<text x="260" y="222" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">every pair (x mod 3, x mod 5) appears exactly once among 0 … 14</text>
<text x="260" y="242" font-size="12" text-anchor="middle" fill="currentColor" class="acc-fill" font-style="italic">8 is the only number below 15 with 8 ≡ 2 (mod 3) and 8 ≡ 3 (mod 5)</text>
</svg>
<figcaption>Figure 3.11. The Chinese remainder theorem for 3 × 5 = 15. Each number below 15 has its own pair of remainders, and each pair belongs to exactly one number, so working mod 15 is the same as working mod 3 and mod 5 side by side.</figcaption>
</figure>

- **Speed.** RSA with $n = pq$ can work mod $p$ and mod $q$ separately and join
  the answers. Each half has numbers half as long and exponents half as long,
  so it is about four times faster, and every RSA library decrypts and signs
  this way.
- **Attacks.** An attacker who can solve a problem mod each small factor of a
  number can join the answers. That breaks Diffie-Hellman in groups whose order
  has only small factors ([Chapter 12](12-Diffie-Hellman.md)) and lets one
  message sent to three RSA users with $e = 3$ be read ([Chapter 13](13-RSA.md)).

!!! note "Life story: the Chinese remainder theorem"
    **Born:** the puzzle in the *Sunzi Suanjing* (3rd to 5th century); the general *dayan* method in Qin
    Jiushao's *Mathematical Treatise in Nine Sections* (1247); in Europe through Euler and Gauss · **Purpose:**
    calendar calculations, and counting things known only by their remainders · **Helped:** makes RSA
    decryption and signing about four times faster; also powers attacks on small subgroups · **Status:**
    current, in every RSA library, together with checks against fault attacks

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

<figure class="mars-fig">
<svg viewBox="0 0 660 250" width="660" role="img" aria-label="Two squaring chains: for 561 base 2 the values 263, 166, 67, 1 reach 1 without -1; for 97 base 5 the chain 28, 8, 64, 22, 96 reaches -1" xmlns="http://www.w3.org/2000/svg">
<text x="10" y="28" font-size="14" text-anchor="start" fill="currentColor" font-weight="bold">n = 561, base 2</text>
<rect x="20" y="40" width="70" height="40" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="20" y="40" width="70" height="40" rx="6" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="55" y="65.2" font-size="15" text-anchor="middle" fill="currentColor">263</text>
<text x="55" y="98" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">2³⁵</text>
<line x1="90" y1="60" x2="121" y2="60" stroke="currentColor" stroke-width="1.5"/>
<polygon points="128,60 120,63.6 120,56.4" fill="currentColor"/>
<text x="109" y="52" font-size="13" text-anchor="middle" fill="currentColor">²</text>
<rect x="128" y="40" width="70" height="40" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="128" y="40" width="70" height="40" rx="6" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="163" y="65.2" font-size="15" text-anchor="middle" fill="currentColor">166</text>
<line x1="198" y1="60" x2="229" y2="60" stroke="currentColor" stroke-width="1.5"/>
<polygon points="236,60 228,63.6 228,56.4" fill="currentColor"/>
<text x="217" y="52" font-size="13" text-anchor="middle" fill="currentColor">²</text>
<rect x="236" y="40" width="70" height="40" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="236" y="40" width="70" height="40" rx="6" class="soft-acc" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<rect x="236" y="40" width="70" height="40" rx="6" fill="none" stroke="currentColor" class="acc" stroke-width="2"/>
<text x="271" y="65.2" font-size="15" text-anchor="middle" fill="currentColor" font-weight="bold">67</text>
<line x1="306" y1="60" x2="337" y2="60" stroke="currentColor" stroke-width="1.5"/>
<polygon points="344,60 336,63.6 336,56.4" fill="currentColor"/>
<text x="325" y="52" font-size="13" text-anchor="middle" fill="currentColor">²</text>
<rect x="344" y="40" width="70" height="40" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="344" y="40" width="70" height="40" rx="6" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="379" y="65.2" font-size="15" text-anchor="middle" fill="currentColor">1</text>
<text x="271" y="98" font-size="12" text-anchor="middle" fill="currentColor" class="acc-fill">67² ≡ 1, yet 67 ≢ ±1</text>
<text x="432" y="65" font-size="13" text-anchor="start" fill="currentColor" font-style="italic">→ composite (witness 2)</text>
<text x="10" y="138" font-size="14" text-anchor="start" fill="currentColor" font-weight="bold">n = 97, base 5</text>
<rect x="20" y="150" width="70" height="40" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="20" y="150" width="70" height="40" rx="6" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="55" y="175.2" font-size="15" text-anchor="middle" fill="currentColor">28</text>
<text x="55" y="208" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">5³</text>
<line x1="90" y1="170" x2="121" y2="170" stroke="currentColor" stroke-width="1.5"/>
<polygon points="128,170 120,173.6 120,166.4" fill="currentColor"/>
<text x="109" y="162" font-size="13" text-anchor="middle" fill="currentColor">²</text>
<rect x="128" y="150" width="70" height="40" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="128" y="150" width="70" height="40" rx="6" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="163" y="175.2" font-size="15" text-anchor="middle" fill="currentColor">8</text>
<line x1="198" y1="170" x2="229" y2="170" stroke="currentColor" stroke-width="1.5"/>
<polygon points="236,170 228,173.6 228,166.4" fill="currentColor"/>
<text x="217" y="162" font-size="13" text-anchor="middle" fill="currentColor">²</text>
<rect x="236" y="150" width="70" height="40" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="236" y="150" width="70" height="40" rx="6" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="271" y="175.2" font-size="15" text-anchor="middle" fill="currentColor">64</text>
<line x1="306" y1="170" x2="337" y2="170" stroke="currentColor" stroke-width="1.5"/>
<polygon points="344,170 336,173.6 336,166.4" fill="currentColor"/>
<text x="325" y="162" font-size="13" text-anchor="middle" fill="currentColor">²</text>
<rect x="344" y="150" width="70" height="40" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="344" y="150" width="70" height="40" rx="6" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="379" y="175.2" font-size="15" text-anchor="middle" fill="currentColor">22</text>
<line x1="414" y1="170" x2="445" y2="170" stroke="currentColor" stroke-width="1.5"/>
<polygon points="452,170 444,173.6 444,166.4" fill="currentColor"/>
<text x="433" y="162" font-size="13" text-anchor="middle" fill="currentColor">²</text>
<rect x="452" y="150" width="70" height="40" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="452" y="150" width="70" height="40" rx="6" class="soft-acc" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<rect x="452" y="150" width="70" height="40" rx="6" fill="none" stroke="currentColor" class="acc" stroke-width="2"/>
<text x="487" y="175.2" font-size="15" text-anchor="middle" fill="currentColor" font-weight="bold">96</text>
<text x="487" y="208" font-size="12" text-anchor="middle" fill="currentColor" class="acc-fill">= 96 ≡ −1</text>
<text x="540" y="175" font-size="13" text-anchor="start" fill="currentColor" font-style="italic">→ passes: probably prime</text>
<text x="330" y="242" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">a prime can reach 1 only straight after −1; 561 = 3 · 11 · 17 skips it</text>
</svg>
<figcaption>Figure 3.12. The Miller-Rabin test, worked by hand above, as two chains of squarings. For the Carmichael number 561, 67 is a square root of 1 other than ±1, which no prime has. For the prime 97, the chain hits −1 as it must.</figcaption>
</figure>

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

**The story.** Gary Miller found his test in 1976 while studying how hard it
is to recognize primes; it was fast and deterministic, but its proof needed
the generalized Riemann hypothesis, which nobody has proved. Michael Rabin, who
would win the Turing Award with Dana Scott for earlier work on automata, saw
in 1976 that by choosing the bases at random he could prove a bound with no
hypothesis at all, and published the analysis in 1980. It was one of the first
algorithms to use randomness as a tool, and it changed how computer scientists
thought about "proof": a number that passes 40 random rounds is not *proved*
prime, but the chance of error is smaller than the chance of a hardware fault
during the computation. Robert Solovay and Volker Strassen published a
similar randomized test in 1977. Within a decade Miller-Rabin was in every key
generator.

!!! note "Life story: the Fermat test and Carmichael numbers"
    **Born:** the test follows from Fermat's theorem of 1640; Alwin Korselt characterized the numbers that fool
    it in 1899, and Robert Carmichael found the first, 561, in 1910 · **Purpose:** a quick check for
    compositeness · **Helped:** a fast filter, still used as a first step · **Retired** as a test on its own,
    because Carmichael numbers fool it for every base (and there are infinitely many, 1994) ·
    **Replaced by:** Miller-Rabin

!!! note "Life story: Miller-Rabin"
    **Born:** 1976, Gary Miller (deterministic, assuming the generalized Riemann hypothesis); 1976 to 1980,
    Michael Rabin (randomized, with a proof) · **Purpose:** decide primality fast for numbers far too big to
    factor · **Helped:** every RSA and Diffie-Hellman key generator since the 1980s; FIPS 186-5 sets its rounds ·
    **Status:** current, often paired with a Lucas test as Baillie-PSW

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

<figure class="mars-fig">
<svg viewBox="0 0 680 250" width="680" role="img" aria-label="Two stylized power traces: for square and multiply the pattern of short and tall blocks reveals the key bits; for the ladder every bit looks the same" xmlns="http://www.w3.org/2000/svg">
<text x="10" y="42" font-size="13" text-anchor="start" fill="currentColor" font-weight="bold">square and multiply: the pattern spells the key</text>
<rect x="10" y="68" width="14" height="22" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="27" y="52" width="14" height="38" rx="1" class="soft-acc" fill="currentColor"/>
<rect x="27" y="52" width="14" height="38" rx="1" fill="none" stroke="currentColor" class="acc" stroke-width="1"/>
<rect x="44" y="68" width="14" height="22" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="61" y="68" width="14" height="22" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="78" y="52" width="14" height="38" rx="1" class="soft-acc" fill="currentColor"/>
<rect x="78" y="52" width="14" height="38" rx="1" fill="none" stroke="currentColor" class="acc" stroke-width="1"/>
<rect x="95" y="68" width="14" height="22" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="112" y="52" width="14" height="38" rx="1" class="soft-acc" fill="currentColor"/>
<rect x="112" y="52" width="14" height="38" rx="1" fill="none" stroke="currentColor" class="acc" stroke-width="1"/>
<rect x="129" y="68" width="14" height="22" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="146" y="68" width="14" height="22" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="163" y="68" width="14" height="22" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="180" y="52" width="14" height="38" rx="1" class="soft-acc" fill="currentColor"/>
<rect x="180" y="52" width="14" height="38" rx="1" fill="none" stroke="currentColor" class="acc" stroke-width="1"/>
<rect x="197" y="68" width="14" height="22" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="214" y="52" width="14" height="38" rx="1" class="soft-acc" fill="currentColor"/>
<rect x="214" y="52" width="14" height="38" rx="1" fill="none" stroke="currentColor" class="acc" stroke-width="1"/>
<rect x="231" y="68" width="14" height="22" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="248" y="52" width="14" height="38" rx="1" class="soft-acc" fill="currentColor"/>
<rect x="248" y="52" width="14" height="38" rx="1" fill="none" stroke="currentColor" class="acc" stroke-width="1"/>
<rect x="265" y="68" width="14" height="22" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="282" y="68" width="14" height="22" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="299" y="68" width="14" height="22" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="316" y="68" width="14" height="22" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="333" y="52" width="14" height="38" rx="1" class="soft-acc" fill="currentColor"/>
<rect x="333" y="52" width="14" height="38" rx="1" fill="none" stroke="currentColor" class="acc" stroke-width="1"/>
<rect x="350" y="68" width="14" height="22" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="367" y="68" width="14" height="22" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="384" y="52" width="14" height="38" rx="1" class="soft-acc" fill="currentColor"/>
<rect x="384" y="52" width="14" height="38" rx="1" fill="none" stroke="currentColor" class="acc" stroke-width="1"/>
<rect x="401" y="68" width="14" height="22" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="418" y="52" width="14" height="38" rx="1" class="soft-acc" fill="currentColor"/>
<rect x="418" y="52" width="14" height="38" rx="1" fill="none" stroke="currentColor" class="acc" stroke-width="1"/>
<text x="25.5" y="108" font-size="13" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">1</text>
<text x="51" y="108" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">0</text>
<text x="76.5" y="108" font-size="13" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">1</text>
<text x="110.5" y="108" font-size="13" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">1</text>
<text x="136" y="108" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">0</text>
<text x="153" y="108" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">0</text>
<text x="178.5" y="108" font-size="13" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">1</text>
<text x="212.5" y="108" font-size="13" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">1</text>
<text x="246.5" y="108" font-size="13" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">1</text>
<text x="272" y="108" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">0</text>
<text x="289" y="108" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">0</text>
<text x="306" y="108" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">0</text>
<text x="331.5" y="108" font-size="13" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">1</text>
<text x="357" y="108" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">0</text>
<text x="382.5" y="108" font-size="13" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">1</text>
<text x="416.5" y="108" font-size="13" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">1</text>
<text x="10" y="152" font-size="13" text-anchor="start" fill="currentColor" font-weight="bold">Montgomery ladder: one multiply and one square per bit, whatever the bit</text>
<rect x="10" y="162" width="14" height="38" rx="1" class="soft-acc" fill="currentColor"/>
<rect x="10" y="162" width="14" height="38" rx="1" fill="none" stroke="currentColor" class="acc" stroke-width="1"/>
<rect x="27" y="178" width="14" height="22" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="44" y="162" width="14" height="38" rx="1" class="soft-acc" fill="currentColor"/>
<rect x="44" y="162" width="14" height="38" rx="1" fill="none" stroke="currentColor" class="acc" stroke-width="1"/>
<rect x="61" y="178" width="14" height="22" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="78" y="162" width="14" height="38" rx="1" class="soft-acc" fill="currentColor"/>
<rect x="78" y="162" width="14" height="38" rx="1" fill="none" stroke="currentColor" class="acc" stroke-width="1"/>
<rect x="95" y="178" width="14" height="22" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="112" y="162" width="14" height="38" rx="1" class="soft-acc" fill="currentColor"/>
<rect x="112" y="162" width="14" height="38" rx="1" fill="none" stroke="currentColor" class="acc" stroke-width="1"/>
<rect x="129" y="178" width="14" height="22" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="146" y="162" width="14" height="38" rx="1" class="soft-acc" fill="currentColor"/>
<rect x="146" y="162" width="14" height="38" rx="1" fill="none" stroke="currentColor" class="acc" stroke-width="1"/>
<rect x="163" y="178" width="14" height="22" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="180" y="162" width="14" height="38" rx="1" class="soft-acc" fill="currentColor"/>
<rect x="180" y="162" width="14" height="38" rx="1" fill="none" stroke="currentColor" class="acc" stroke-width="1"/>
<rect x="197" y="178" width="14" height="22" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="214" y="162" width="14" height="38" rx="1" class="soft-acc" fill="currentColor"/>
<rect x="214" y="162" width="14" height="38" rx="1" fill="none" stroke="currentColor" class="acc" stroke-width="1"/>
<rect x="231" y="178" width="14" height="22" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="248" y="162" width="14" height="38" rx="1" class="soft-acc" fill="currentColor"/>
<rect x="248" y="162" width="14" height="38" rx="1" fill="none" stroke="currentColor" class="acc" stroke-width="1"/>
<rect x="265" y="178" width="14" height="22" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="282" y="162" width="14" height="38" rx="1" class="soft-acc" fill="currentColor"/>
<rect x="282" y="162" width="14" height="38" rx="1" fill="none" stroke="currentColor" class="acc" stroke-width="1"/>
<rect x="299" y="178" width="14" height="22" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="316" y="162" width="14" height="38" rx="1" class="soft-acc" fill="currentColor"/>
<rect x="316" y="162" width="14" height="38" rx="1" fill="none" stroke="currentColor" class="acc" stroke-width="1"/>
<rect x="333" y="178" width="14" height="22" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="350" y="162" width="14" height="38" rx="1" class="soft-acc" fill="currentColor"/>
<rect x="350" y="162" width="14" height="38" rx="1" fill="none" stroke="currentColor" class="acc" stroke-width="1"/>
<rect x="367" y="178" width="14" height="22" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="384" y="162" width="14" height="38" rx="1" class="soft-acc" fill="currentColor"/>
<rect x="384" y="162" width="14" height="38" rx="1" fill="none" stroke="currentColor" class="acc" stroke-width="1"/>
<rect x="401" y="178" width="14" height="22" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="418" y="162" width="14" height="38" rx="1" class="soft-acc" fill="currentColor"/>
<rect x="418" y="162" width="14" height="38" rx="1" fill="none" stroke="currentColor" class="acc" stroke-width="1"/>
<rect x="435" y="178" width="14" height="22" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="452" y="162" width="14" height="38" rx="1" class="soft-acc" fill="currentColor"/>
<rect x="452" y="162" width="14" height="38" rx="1" fill="none" stroke="currentColor" class="acc" stroke-width="1"/>
<rect x="469" y="178" width="14" height="22" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="486" y="162" width="14" height="38" rx="1" class="soft-acc" fill="currentColor"/>
<rect x="486" y="162" width="14" height="38" rx="1" fill="none" stroke="currentColor" class="acc" stroke-width="1"/>
<rect x="503" y="178" width="14" height="22" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="520" y="162" width="14" height="38" rx="1" class="soft-acc" fill="currentColor"/>
<rect x="520" y="162" width="14" height="38" rx="1" fill="none" stroke="currentColor" class="acc" stroke-width="1"/>
<rect x="537" y="178" width="14" height="22" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="10" y="236" font-size="12" text-anchor="start" fill="currentColor" font-style="italic">short block: squaring · tall block: multiplication</text>
</svg>
<figcaption>Figure 3.13. What Kocher's attacks see, drawn schematically for a 16-bit key. Square and multiply does an extra multiplication for each 1 bit, so the trace of operations reads off the key. The Montgomery ladder does the same two operations for every bit.</figcaption>
</figure>

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

!!! note "Life story: the Montgomery ladder"
    **Born:** 1987, Peter Montgomery, as a way to compute on elliptic curves while factoring numbers ·
    **Purpose:** speed, at first; the same steps for every key bit was a side effect · **Helped:** after
    Kocher's timing attacks (1996) it became the standard defense; X25519 key exchange is built around it ·
    **Status:** current

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

<figure class="mars-fig">
<svg viewBox="0 0 520 320" width="520" role="img" aria-label="A table of a to the power k mod 7 for a and k from 1 to 6; the last column is all ones, and rows 3 and 5 contain every value" xmlns="http://www.w3.org/2000/svg">
<text x="290" y="20" font-size="14" text-anchor="middle" fill="currentColor" font-style="italic">k</text>
<text x="30" y="158" font-size="14" text-anchor="middle" fill="currentColor" font-style="italic">a</text>
<text x="140" y="40" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">1</text>
<text x="200" y="40" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">2</text>
<text x="260" y="40" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">3</text>
<text x="320" y="40" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">4</text>
<text x="380" y="40" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">5</text>
<text x="440" y="40" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">6</text>
<rect x="413" y="48" width="54" height="220" rx="4" class="soft-acc" fill="currentColor"/>
<rect x="413" y="48" width="54" height="220" rx="4" fill="none" stroke="currentColor" class="acc" stroke-width="1.5"/>
<text x="94" y="73" font-size="14" text-anchor="end" fill="currentColor" font-weight="bold">1</text>
<text x="140" y="73" font-size="15" text-anchor="middle" fill="currentColor">1</text>
<text x="200" y="73" font-size="15" text-anchor="middle" fill="currentColor">1</text>
<text x="260" y="73" font-size="15" text-anchor="middle" fill="currentColor">1</text>
<text x="320" y="73" font-size="15" text-anchor="middle" fill="currentColor">1</text>
<text x="380" y="73" font-size="15" text-anchor="middle" fill="currentColor">1</text>
<text x="440" y="73" font-size="15" text-anchor="middle" fill="currentColor">1</text>
<text x="94" y="109" font-size="14" text-anchor="end" fill="currentColor" font-weight="bold">2</text>
<text x="140" y="109" font-size="15" text-anchor="middle" fill="currentColor">2</text>
<text x="200" y="109" font-size="15" text-anchor="middle" fill="currentColor">4</text>
<text x="260" y="109" font-size="15" text-anchor="middle" fill="currentColor">1</text>
<text x="320" y="109" font-size="15" text-anchor="middle" fill="currentColor">2</text>
<text x="380" y="109" font-size="15" text-anchor="middle" fill="currentColor">4</text>
<text x="440" y="109" font-size="15" text-anchor="middle" fill="currentColor">1</text>
<text x="94" y="145" font-size="14" text-anchor="end" fill="currentColor" class="acc-fill" font-weight="bold">3</text>
<text x="140" y="145" font-size="15" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">3</text>
<text x="200" y="145" font-size="15" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">2</text>
<text x="260" y="145" font-size="15" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">6</text>
<text x="320" y="145" font-size="15" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">4</text>
<text x="380" y="145" font-size="15" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">5</text>
<text x="440" y="145" font-size="15" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">1</text>
<text x="94" y="181" font-size="14" text-anchor="end" fill="currentColor" font-weight="bold">4</text>
<text x="140" y="181" font-size="15" text-anchor="middle" fill="currentColor">4</text>
<text x="200" y="181" font-size="15" text-anchor="middle" fill="currentColor">2</text>
<text x="260" y="181" font-size="15" text-anchor="middle" fill="currentColor">1</text>
<text x="320" y="181" font-size="15" text-anchor="middle" fill="currentColor">4</text>
<text x="380" y="181" font-size="15" text-anchor="middle" fill="currentColor">2</text>
<text x="440" y="181" font-size="15" text-anchor="middle" fill="currentColor">1</text>
<text x="94" y="217" font-size="14" text-anchor="end" fill="currentColor" class="acc-fill" font-weight="bold">5</text>
<text x="140" y="217" font-size="15" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">5</text>
<text x="200" y="217" font-size="15" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">4</text>
<text x="260" y="217" font-size="15" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">6</text>
<text x="320" y="217" font-size="15" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">2</text>
<text x="380" y="217" font-size="15" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">3</text>
<text x="440" y="217" font-size="15" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">1</text>
<text x="94" y="253" font-size="14" text-anchor="end" fill="currentColor" font-weight="bold">6</text>
<text x="140" y="253" font-size="15" text-anchor="middle" fill="currentColor">6</text>
<text x="200" y="253" font-size="15" text-anchor="middle" fill="currentColor">1</text>
<text x="260" y="253" font-size="15" text-anchor="middle" fill="currentColor">6</text>
<text x="320" y="253" font-size="15" text-anchor="middle" fill="currentColor">1</text>
<text x="380" y="253" font-size="15" text-anchor="middle" fill="currentColor">6</text>
<text x="440" y="253" font-size="15" text-anchor="middle" fill="currentColor">1</text>
<text x="260" y="290" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">last column: a⁶ ≡ 1 for every a (Fermat)</text>
<text x="260" y="308" font-size="12" text-anchor="middle" fill="currentColor" class="acc-fill" font-style="italic">rows 3 and 5 run through all of 1 … 6: generators</text>
</svg>
<figcaption>Figure 3.14. Powers mod 7. Fermat's theorem is the column of 1s on the right. Some rows repeat early (2 cycles 2, 4, 1), but 3 and 5 run through every non-zero value: they generate the whole group, the property Diffie-Hellman is built on.</figcaption>
</figure>

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

Kayal and Saxena were undergraduates when they began working on the problem
with Agrawal, their professor. The paper went online in August 2002, and
within days specialists around the world had checked it: a question open
since Gauss, who had called the problem of telling primes from composites one
of the most important in arithmetic, had a short answer that used little more
than the polynomial version of Fermat's theorem.

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
