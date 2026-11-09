# 4. Powers, Orders and Primitive Roots

*RSA raises a number to a power to encrypt and to another power to decrypt.
Diffie-Hellman raises a fixed number to a secret power. Both need three things
from mathematics: a way to compute huge powers fast, a reason why decryption
undoes encryption, and an understanding of how the powers of a number cycle.
This chapter supplies all three: square-and-multiply and the Montgomery ladder,
Fermat's little theorem and Euler's theorem with full proofs, the order of an
element, Carmichael's function, primitive roots and how to find them, and the
Pohlig-Hellman decomposition that explains why the groups used in practice are
built around safe primes. You will prove RSA correct, count what each way of
exponentiating costs, solve a discrete logarithm by splitting it into three
small ones, and take one with Pollard's rho using almost no memory.*

!!! abstract "In this chapter"
    **You will learn:**

    - how to compute $g^e \bmod n$ with about $1.5$ multiplications per bit of
      $e$, three ways, and which one leaks; fixed and sliding windows, and
      what each method costs for a 2,048-bit exponent;
    - Fermat's little theorem and Euler's theorem, with proofs, and the full
      proof that RSA decrypts correctly;
    - the order of an element, and why it divides $\varphi(n)$;
    - Carmichael's function $\lambda(n)$, and exactly which private exponents
      make RSA decrypt;
    - primitive roots: when they exist, how many there are, how to find one;
    - discrete logarithms, how Pohlig and Hellman reduce them to the prime
      factors of the group order, and how baby-step giant-step and Pollard's
      rho solve each piece in square-root time;
    - safe primes, Schnorr groups, how to find a generator of a prime-order
      subgroup, the standard Diffie-Hellman groups, and Logjam.

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

### Why the ladder is right

The ladder looks like a trick, so here is the proof. Write $k$ for the number
whose binary digits are the bits read so far ($k = 0$ before the first bit).

**Claim.** After each step, $R_0 = g^k$ and $R_1 = g^{k+1}$.

*Proof.* Before the first bit, $k = 0$, $R_0 = 1 = g^0$ and $R_1 = g$. Reading
one more bit $b$ turns $k$ into $2k + b$. If $b = 0$, the new pair is $R_0^2 =
g^{2k}$ and $R_0R_1 = g^{2k+1}$. If $b = 1$, it is $R_0R_1 = g^{2k+1}$ and
$R_1^2 = g^{2k+2}$. Either way the claim holds for $2k + b$. After the last
bit, $k = e$, so $R_0 = g^e$. $\blacksquare$

The proof uses only that powers of one element multiply by adding exponents,
so the ladder works in every group, including elliptic curves with "multiply"
read as "add" (Chapter 12), where the by-product $R_1 = g^{e+1}$ is what
Montgomery's $x$-only formulas need. Figure 4.2 runs it on $e = 45$.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="The Montgomery ladder on exponent 45: the exponents of R0 and R1 go 0 and 1, then 1 and 2, 2 and 3, 5 and 6, 11 and 12, 22 and 23, 45 and 46, always one apart" fill="currentColor" font-size="14">
<text x="20" y="30">exponent 45 = 101101, read from the left; boxes show the exponents of R0 and R1</text>
<text x="4" y="97">R0</text><text x="4" y="187">R1</text>
<g stroke="currentColor" stroke-width="1.3" fill="none">
<path d="M34 77h52v30h-52zM34 167h52v30h-52zM122 77h52v30h-52zM122 167h52v30h-52zM210 77h52v30h-52zM210 167h52v30h-52zM298 77h52v30h-52zM298 167h52v30h-52zM386 77h52v30h-52zM386 167h52v30h-52zM474 77h52v30h-52zM474 167h52v30h-52zM562 77h52v30h-52zM562 167h52v30h-52z"/>
<path d="M86 92L122 92M86 182L122 100M174 103L210 175M174 182L210 182M262 92L298 92M262 182L298 100M350 92L386 92M350 182L386 100M438 103L474 175M438 182L474 182M526 92L562 92M526 182L562 100"/>
<path d="M86 188L122 188M174 98L210 98M262 188L298 188M350 188L386 188M438 98L474 98M526 188L562 188" stroke-dasharray="4 3"/>
<path d="M20 232 L50 232"/><path d="M300 232 L330 232" stroke-dasharray="4 3"/>
</g>
<g font-size="12" text-anchor="middle" fill-opacity=".7">
<text x="60" y="60">start</text><text x="148" y="60">bit 1</text><text x="236" y="60">bit 0</text><text x="324" y="60">bit 1</text>
<text x="412" y="60">bit 1</text><text x="500" y="60">bit 0</text><text x="588" y="60">bit 1</text>
</g>
<g text-anchor="middle">
<text x="60" y="97">0</text><text x="60" y="187">1</text>
<text x="148" y="97">1</text><text x="148" y="187">2</text>
<text x="236" y="97">2</text><text x="236" y="187">3</text>
<text x="324" y="97">5</text><text x="324" y="187">6</text>
<text x="412" y="97">11</text><text x="412" y="187">12</text>
<text x="500" y="97">22</text><text x="500" y="187">23</text>
<text x="588" y="97" font-weight="bold">45</text><text x="588" y="187">46</text>
</g>
<text x="58" y="237" font-size="13">two solid lines meet: the product R0·R1</text>
<text x="338" y="237" font-size="13">dashed: a square (R0² or R1²)</text>
</svg>
<figcaption>Figure 4.2. The Montgomery ladder computing $g^{45}$. A 1 bit sends the product to $R_0$ and squares $R_1$; a 0 bit sends the product to $R_1$ and squares $R_0$. The two exponents stay exactly one apart, and every column costs one product and one square.</figcaption>
</figure>

### Fix it: a fixed window that reads the whole table

Paul Kocher's 1996 paper showed that the leak does not need an oscilloscope,
only the **total** time of many private-key operations on known inputs. A
modular multiplication takes slightly longer on some operands than on others
(an extra final subtraction in Montgomery reduction is the classic cause). The
attacker, knowing the inputs, simulates the steps under each guess for the
next exponent bit; the right guess makes the simulated timings correlate with
the measured totals, and the exponent falls out one bit at a time. In 2003 David
Brumley and Dan Boneh ran the same idea against OpenSSL across a local network.
*Cryptanalysis*,
[Chapter 17](../cryptanalysis/17-Side-Channels-the-Attackers-View.md#173-kochers-timing-attack),
works the attack through with code; here the question is what an exponentiation
that gives nothing away looks like, mathematically.

The ladder is one answer, at two multiplications per bit. The cheaper one RSA
libraries use is the **fixed window**. Choose a
width $w$, say 4, and write the exponent in base $2^w = 16$:

$$e = d_{t-1} 16^{t-1} + \dots + d_1 16 + d_0, \qquad 0 \le d_i < 16.$$

Precompute the table $g^0, g^1, \dots, g^{15}$. Then Horner's rule in the
exponent gives

$$g^e = \Bigl( \cdots \bigl( (g^{d_{t-1}})^{16} \cdot g^{d_{t-2}} \bigr)^{16} \cdots \Bigr)^{16} \cdot g^{d_0},$$

which is four squarings and one multiplication per digit, *whatever the digit
is*, including 0 (multiply by $g^0 = 1$). The sequence of operations is fixed
by the length of $e$ alone. The remaining leak is the table lookup: which entry
is read depends on the secret digit, and a cache attack can see which memory
line was touched. The fix is to read every entry, every time, and keep the
right one with a mask, so that the memory addresses touched do not depend on
the digit either.

By hand, for $3^{45} \bmod 101$ again: $45 = 0010\,1101_2$, so the digits are
$d_1 = 2$ and $d_0 = 13$. The table holds $3^0, \dots, 3^{15}$ modulo 101;
$3^2 = 9$ and $3^{13} = 1594323 \equiv 38$. Start from $3^2 = 9$, square four
times ($9 \to 81 \to 97 \to 16 \to 54$, which is $3^{32}$), then multiply by
$3^{13}$: $54 \cdot 38 = 2052 \equiv 32$. The same 32 as before, in 4 squarings
and 1 multiplication after the table. (The code below starts from 1 and squares
it four times before the first lookup: wasted work, but it keeps every digit's
pattern the same.)

```python
import random

def ct_select(table, idx):
    """table[idx], reading every entry, with no branch on idx."""
    r = 0
    for i, v in enumerate(table):
        d = i ^ idx                          # 0 exactly when i == idx
        eq = 1 ^ ((d | -d) >> 63 & 1)        # 1 if d == 0, else 0
        r |= v & -eq                         # -1 keeps v, 0 wipes it
    return r

def pow_window_ct(g, e, n, bits, w=4):
    table = [1]
    for _ in range(2 ** w - 1):              # g^0, g^1, ..., g^(2^w - 1)
        table.append(table[-1] * g % n)
    r, trace = 1, ""
    for i in reversed(range(0, bits, w)):    # bits must be a multiple of w
        for _ in range(w):
            r = r * r % n
        digit = (e >> i) & (2 ** w - 1)
        r = r * ct_select(table, digit) % n  # multiply even when the digit is 0
        trace += "S" * w + "M"
    return r, trace

for e in (0b00101101, 0b11110000):
    print(format(e, "08b"), pow_window_ct(3, e, 101, 8))
rng = random.Random(4)
n = rng.getrandbits(1024) | 1
ok = all(pow_window_ct(7, e, n, 1024)[0] == pow(7, e, n)
         for e in (rng.getrandbits(1024) for _ in range(20)))
print("agrees with pow on 20 random 1024-bit exponents:", ok)
```

It prints:

```text
00101101 (32, 'SSSSMSSSSM')
11110000 (87, 'SSSSMSSSSM')
agrees with pow on 20 random 1024-bit exponents: True
```

Two different exponents, the same trace. The mask works because Python
integers act like two's complement numbers of unlimited width: $-1$ is all
ones, so `v & -1` is `v`. The code models the arithmetic; it is not itself
constant-time, since Python's integers take time that depends on their
values; *Cryptographic engineering*,
[Chapter 6](../engineering/06-Big-Numbers-and-Public-Key-Code.md), writes it
for real. §4.10 counts what each method costs.

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
<figcaption>Figure 4.3. Orders modulo 13. The powers of 2 visit every unit before returning to 1, so 2 is a primitive root. The powers of 3 return after three steps. Every cycle length divides 12.</figcaption>
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

### By hand: one key, two private exponents

The example $N = 3233$ hides how far apart the two choices can be, because
$\gcd(60, 52) = 4$ is small. Take instead $p = 241$ and $q = 337$, with $e =
17$. Then $N = 81217$, and

$$\varphi(N) = 240 \cdot 336 = 80640, \qquad \gcd(240, 336) = 48, \qquad \lambda(N) = \frac{80640}{48} = 1680.$$

Compute $17^{-1} \bmod 1680$ with the extended Euclidean algorithm (Chapter 2):

$$1680 = 98 \cdot 17 + 14, \quad 17 = 1 \cdot 14 + 3, \quad 14 = 4 \cdot 3 + 2, \quad 3 = 1 \cdot 2 + 1.$$

Back-substituting, $1 = 3 - 2 = 5 \cdot 3 - 14 = 5 \cdot 17 - 6 \cdot 14 = 593
\cdot 17 - 6 \cdot 1680$. So $d_\lambda = 593$; check: $17 \cdot 593 = 10081 = 6
\cdot 1680 + 1$. The same computation modulo $\varphi(N)$ gives $d_\varphi =
71153$, and indeed $71153 = 593 + 42 \cdot 1680$. The private exponent a
textbook computes from $\varphi$ is 120 times larger than it needs to be, and
decryption by square-and-multiply costs 16 squarings instead of 9.

For random RSA primes $\gcd(p - 1, q - 1)$ is usually tiny, so the two
exponents differ by a small factor. FIPS 186-5 asks for $d_\lambda$ and also
requires $d > 2^{\text{nlen}/2}$, which rules out the short exponents that
Wiener's attack and its successors break (Chapter 2).

### Which exponents decrypt

Both 593 and 71153 work. So do others: exactly which ones?

**Theorem.** Let $N = pq$ with $p \ne q$ odd primes, and $\gcd(e, \lambda(N)) =
1$. Then $m^{ed} \equiv m \pmod N$ for every $m$ if and only if $ed \equiv 1
\pmod{\lambda(N)}$.

*Proof.* If $ed = 1 + k\lambda(N)$, the proof of §4.4 goes through with
$\lambda$ in place of $\varphi$: modulo $p$, either $p \mid m$ or $m^{p-1}
\equiv 1$, and $p - 1$ divides $\lambda(N)$; the same for $q$; then the CRT.
Conversely, pick a primitive root $g_p$ modulo $p$ and $g_q$ modulo $q$
(§4.7), and let $a$ be the unit with $a \equiv g_p \pmod p$ and $a \equiv g_q
\pmod q$. The order of $a$ modulo $N$ is the least $m$ with $(p - 1) \mid m$
and $(q - 1) \mid m$, which is $\operatorname{lcm}(p - 1, q - 1) = \lambda(N)$.
If $a^{ed} \equiv a$, then $a^{ed - 1} \equiv 1$, so $\lambda(N) \mid ed - 1$ by
§4.5, fact 1. $\blacksquare$

The proof also shows that some unit has order exactly $\lambda(N)$. Among the
numbers $1, \dots, \varphi(N) - 1$, the working private exponents are the
$\varphi(N)/\lambda(N) = \gcd(p - 1, q - 1)$ numbers congruent to $d_\lambda$:
48 of them for $N = 81217$, and 4 for $N = 3233$.

```python
from math import gcd

def lam_brute(n):          # the lcm of the orders of all units
    best = 1
    for a in range(2, n):
        if gcd(a, n) == 1:
            k, x = 1, a
            while x != 1:
                x, k = x * a % n, k + 1
            best = best * k // gcd(best, k)
    return best

def phi(n):
    return sum(1 for a in range(1, n + 1) if gcd(a, n) == 1)

print([(n, phi(n), lam_brute(n)) for n in (15, 21, 35, 63, 65, 105, 3233)])

p, q, e = 241, 337, 17
N, f = p * q, (p - 1) * (q - 1)
L = f // gcd(p - 1, q - 1)
d_phi, d_lam = pow(e, -1, f), pow(e, -1, L)
print(N, f, L, d_phi, d_lam, d_phi % L == d_lam)

# Which d in [1, phi(N)) decrypt every message modulo 3233?
N, e = 3233, 17
good = [d for d in range(1, 3120) if pow(2, e * d, N) == 2
        and all(pow(m, e * d, N) == m for m in range(N))]
print(good, [d % 780 for d in good])
```

It prints:

```text
[(15, 8, 4), (21, 12, 6), (35, 24, 12), (63, 36, 6), (65, 48, 12), (105, 48, 12), (3233, 3120, 780)]
81217 80640 1680 71153 593 True
[413, 1193, 1973, 2753] [413, 413, 413, 413]
```

The brute-force $\lambda$ agrees with the formula, including $\lambda(63) =
\operatorname{lcm}(\lambda(9), \lambda(7)) = 6$, a sixth of $\varphi(63) = 36$.
The last line checks the theorem by exhaustion: of 3,119 candidates, exactly
four decrypt all 3,233 messages, all $\equiv 413 \pmod{780}$. (The quick filter
$m = 2$ already removes every wrong $d$, since 2 has order 780 modulo 3233.)

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="Bar chart of Euler's phi and Carmichael's lambda for n = 15, 21, 35, 63, 65 and 105: phi is 8, 12, 24, 36, 48, 48 and lambda is 4, 6, 12, 6, 12, 12" fill="currentColor" font-size="13">
<g stroke="currentColor" stroke-width="1.2">
<path d="M40 200 L620 200" fill="none"/>
<path d="M60 175h28v25h-28zM155 162.5h28v37.5h-28zM250 125h28v75h-28zM345 87.5h28v112.5h-28zM440 50h28v150h-28zM535 50h28v150h-28z" fill-opacity=".25"/>
<path d="M92 187.5h28v12.5h-28zM187 181.25h28v18.75h-28zM282 162.5h28v37.5h-28zM377 181.25h28v18.75h-28zM472 162.5h28v37.5h-28zM567 162.5h28v37.5h-28z"/>
</g>
<g text-anchor="middle" font-size="12">
<text x="74" y="170">8</text><text x="106" y="182">4</text>
<text x="169" y="157">12</text><text x="201" y="176">6</text>
<text x="264" y="120">24</text><text x="296" y="157">12</text>
<text x="359" y="82">36</text><text x="391" y="176">6</text>
<text x="454" y="45">48</text><text x="486" y="157">12</text>
<text x="549" y="45">48</text><text x="581" y="157">12</text>
</g>
<g text-anchor="middle">
<text x="90" y="220">n = 15</text><text x="185" y="220">21</text><text x="280" y="220">35</text>
<text x="375" y="220">63</text><text x="470" y="220">65</text><text x="565" y="220">105</text>
</g>
<rect x="40" y="18" width="14" height="12" fill-opacity=".25" stroke="currentColor"/><text x="60" y="29">φ(n): the number of units</text>
<rect x="250" y="18" width="14" height="12"/><text x="270" y="29">λ(n): the largest order any unit reaches</text>
</svg>
<figcaption>Figure 4.4. Euler's $\varphi$ and Carmichael's $\lambda$ side by side. Modulo a composite, no unit reaches order $\varphi(n)$; $\lambda(n)$ is the true exponent of the group, and the gap can be large ($\lambda(63) = 6$ against $\varphi(63) = 36$).</figcaption>
</figure>

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

### Gauss's table and the decimal periods

Gauss did more than prove existence. At the end of the *Disquisitiones* is a
table: for every prime power below 100 other than 2, 4 and 8 it names a
primitive root and lists the **index**, the discrete logarithm, of each prime
to that base. With it, a multiplication modulo 97 becomes an addition modulo
96, and $x^5 \equiv 13 \pmod{97}$ becomes a linear congruence for the index of
$x$ (Chapter 3, §3.6). Jacobi's *Canon Arithmeticus* of 1839 (§4.8) extended
the idea to every prime below 1,000.

Gauss did not always pick the smallest primitive root. When 10 was one, he
chose 10; when it was not, he chose the root that gave 10 the smallest index.
The reason was decimal fractions. Divide 1 by 7 by long division: the
remainders are $1, 3, 2, 6, 4, 5, 1, \dots$, which are the powers $10^k \bmod 7$,
so the digits repeat with period exactly the order of 10 modulo 7:

$$\tfrac17 = 0.\overline{142857}, \qquad \operatorname{ord}_7(10) = 6 = 7 - 1.$$

In general, for a prime $p \ne 2, 5$, the decimal expansion of $1/p$ repeats
with period $\operatorname{ord}_p(10)$, which divides $p - 1$, and the period is
the longest possible, $p - 1$, exactly when 10 is a primitive root modulo $p$.
So $1/13 = 0.\overline{076923}$ has period 6 (10 has order 6 modulo 13, since $13
\mid 999999$), while $1/17$ runs 16 digits before repeating.

How often is a given number a primitive root? The question of whether 10 is a
primitive root for infinitely many primes is often attributed to Gauss, though
no written statement of it by him is known. Emil Artin made it precise in 1927,
with a predicted proportion (§4.11). Counting is easy:

```python
# Uses prime_factors() from the listing above.
def is_primitive_root(g, p):
    return all(pow(g, (p - 1) // q, p) != 1 for q in prime_factors(p - 1))

def period_of_one_over(p):              # length of the repeating block of 1/p in decimal
    k, x = 1, 10 % p
    while x != 1:
        x, k = x * 10 % p, k + 1
    return k

print([(p, period_of_one_over(p)) for p in (7, 11, 13, 17, 19, 37)])

LIMIT = 200000
sieve = bytearray([1]) * LIMIT
sieve[0] = sieve[1] = 0
for i in range(2, int(LIMIT ** 0.5) + 1):
    if sieve[i]:
        sieve[i * i::i] = bytearray(len(sieve[i * i::i]))
primes = [p for p in range(7, LIMIT) if sieve[p]]
for g in (2, 10):
    hits = sum(1 for p in primes if is_primitive_root(g, p))
    print(g, hits, "of", len(primes), "primes:", round(hits / len(primes), 4))
print("Artin's constant: 0.3740")
```

It prints:

```text
[(7, 6), (11, 2), (13, 6), (17, 16), (19, 18), (37, 3)]
2 6705 of 17981 primes: 0.3729
10 6737 of 17981 primes: 0.3747
Artin's constant: 0.3740
```

Among the primes from 7 to 200,000, 2 is a primitive root for 37.3 percent and
10 for 37.5 percent, both within about a tenth of a percentage point of Artin's
prediction. (The count starts at 7, past the primes that divide 10 and the
tiny prime 3.) For cryptography the practical reading is the one behind the
search above: a small candidate such as 2 is a primitive root for more than a
third of all primes, so a search through $2, 3, 5, \dots$ ends after a few
tries.

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
(Chapter 7). *Cryptanalysis*, [Chapter 12](../cryptanalysis/12-Discrete-Logarithms.md), runs all these algorithms. Here we
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
<figcaption>Figure 4.5. Pohlig-Hellman on the example of §4.8. Raising both sides to the powers 8100/4, 8100/81 and 8100/25 lands in three small groups, where the logarithm is found by trying; the Chinese remainder theorem joins the three answers. The cost depends on the largest prime factor of the group order, not on the group's size.</figcaption>
</figure>

**The lesson.** The discrete logarithm is only as hard as the largest prime
factor of the group order. A 3,072-bit prime $p$ for which $p - 1$ happens to be
a product of small primes gives no security at all, however large $p$ is. The
order of the group, or of the subgroup actually used, must have a large prime
factor, at least 256 bits for 128-bit security.

### Baby steps and giant steps for one piece

Inside Pohlig-Hellman, each small logarithm above was found by trying every
exponent. For a piece of order $m^2$, Daniel Shanks's **baby-step giant-step**
method (1971) needs only about $2m$ operations, and Chapter 7 proves why no
generic method can do much better. The idea is division with remainder: any
$x < m^2$ can be written $x = im + j$ with $0 \le i, j < m$, and

$$g^x = h \iff g^j = h \cdot (g^{-m})^i.$$

So store the $m$ **baby steps** $g^j$, then walk the **giant steps** $h,
hg^{-m}, hg^{-2m}, \dots$ until one lands in the table.

*By hand*, on the mod-81 piece of the example. The element of order 81 is $g_3
= 6^{100} \bmod 8101 = 8057$, the target is $h_3 = 437^{100} \bmod 8101 = 5883$,
and $m = 9$.

| $j$ | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|---|
| $g_3^j \bmod 8101$ | 1 | 8057 | 1936 | 3927 | 5434 | 3934 | 5126 | 1284 | 211 |

The giant stride is $g_3^{-9} \equiv 315$ (check: $g_3^9 \equiv 6918$, and
$6918 \cdot 315 = 2179170 = 269 \cdot 8101 + 1$). The giant steps are

$$5883 \xrightarrow{\cdot 315} 6117 \xrightarrow{\cdot 315} 6918 \xrightarrow{\cdot 315} 1,$$

and 1 is the baby step $j = 0$, reached at $i = 3$. So $x \equiv 3 \cdot 9 + 0 =
27 \pmod{81}$, as before, after 9 baby steps and 4 giant ones instead of up to
81 trials. The price is memory: $m$ stored elements. §4.11 shows Pollard's
rho, which gets the same square-root running time with almost no memory. *Cryptanalysis*,
[Chapter 12](../cryptanalysis/12-Discrete-Logarithms.md), runs both methods as
attacks, at larger sizes, with the time-memory trade-off between them.

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

### Finding a generator of the prime-order subgroup

A protocol usually wants a generator of the subgroup of prime order $q$, not a
primitive root. Finding one is easier than finding a primitive root, because
the test needs no factoring at all.

**Test.** If $q$ is prime and $q \mid p - 1$, an element $g \ne 1$ has order
$q$ exactly when $g^q \equiv 1 \pmod p$.

*Why.* By §4.5 the order divides $q$, and the only divisors of a prime are 1
and $q$. Order 1 would mean $g = 1$. $\blacksquare$

For a Schnorr group this justifies the recipe above: $g = h^{(p-1)/q}$ has $g^q
= h^{p-1} \equiv 1$ by Fermat, so it works whenever $g \ne 1$.

For a safe prime $p = 2q + 1$ the subgroup of order $q$ is the set of squares,
so any square other than 1 generates it: $g = 4 = 2^2$ always works. *By hand*
with $p = 23$, $q = 11$: $2^{11} = 2048 = 89 \cdot 23 + 1$, so 2 has order 11
and generates the squares $\{1, 2, 4, 8, 16, 9, 18, 13, 3, 6, 12\}$. But $5^{11}
\equiv 22 \equiv -1$, so 5 has order 22 and is a primitive root.

The standard groups all use $g = 2$, which is cheap (multiplying by 2 is a
shift), and they arrange for 2 to be a square. Chapter 5's **second
supplement** ([§5.4](05-Square-Roots-Mod-p.md#54-the-legendre-symbol)) says
that 2 is a square modulo $p$ exactly when $p \equiv \pm 1 \pmod 8$. The RFC
3526 and RFC 7919 primes have their lowest 64 bits all ones, so $p \equiv -1
\pmod{2^{64}}$, in particular $p \equiv 7 \pmod 8$, and 2 lies in the
subgroup of order $q$. This matters: with a primitive root as generator, $g^x$
is a square exactly when $x$ is even, which the Legendre symbol reveals, so
every public value leaks a bit of its secret and the decision Diffie-Hellman
assumption fails ([Chapter 7](07-Groups.md), §7.7).

You can rebuild RFC 7919's 2,048-bit prime from its published formula,

$$p = 2^{2048} - 2^{1984} + \bigl(\lfloor 2^{1918} e \rfloor + 560316\bigr) \cdot 2^{64} - 1,$$

and check every claim about it:

```python
import random

def e_times_2_to(k):                   # floor(e * 2^k), from e = sum of 1/j!
    guard = 64
    term, total, j = 1 << (k + guard), 0, 0
    while term:
        total += term
        j += 1
        term //= j
    return total >> guard

def probably_prime(n, rounds=24):      # Miller-Rabin (Chapter 6)
    if n % 2 == 0:
        return n == 2
    s, d = 0, n - 1
    while d % 2 == 0:
        s, d = s + 1, d // 2
    rng = random.Random(n)
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

p = 2**2048 - 2**1984 + (e_times_2_to(1918) + 560316) * 2**64 - 1
q = (p - 1) // 2
print(hex(p)[2:34].upper())
print("p prime:", probably_prime(p), " q prime:", probably_prime(q))
print("p mod 8 =", p % 8, " 2^q mod p == 1:", pow(2, q, p) == 1)
```

It prints:

```text
FFFFFFFFFFFFFFFFADF85458A2BB4A9A
p prime: True  q prime: True
p mod 8 = 7  2^q mod p == 1: True
```

The first 32 hex digits match the RFC's listing (`FFFFFFFF FFFFFFFF ADF85458
A2BB4A9A ...`). The prime is safe, and 2 generates the subgroup of order $q$,
a 2,047-bit prime. The constant 560316 is the offset the designers added to
$\lfloor 2^{1918} e \rfloor$ to land on a safe prime; anyone can rerun the
check, which is the point of a "nothing up my sleeve" construction.

The safe-prime shape also makes checking a received value cheap. RFC 7919
(§5.1) asks each side only to check $1 < Y < p - 1$, which is enough because
the only subgroups of order below $q$ are $\{1\}$ and $\{1, -1\}$. (A $Y$
outside the order-$q$ subgroup can still cost the parity bit of the secret, the
one bit Pohlig-Hellman splits off a safe-prime group.) With an unknown,
server-chosen group, the same assurance would need the factors of $p - 1$.

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

### Counting multiplications

How much do windows save? Count, for one random 2,048-bit exponent, every
modular product each method makes, table included, and check each result
against Python's `pow`:

```python
import random

count = {"S": 0, "M": 0}

def mul(a, b, n):                      # every modular product goes through here
    count["S" if a is b else "M"] += 1
    return a * b % n

def pow_binary(g, e, n):
    r = g
    for bit in bin(e)[3:]:             # the leading 1 is the starting value
        r = mul(r, r, n)
        if bit == "1":
            r = mul(r, g, n)
    return r

def pow_fixed(g, e, n, w):
    table = [1, g]
    for _ in range(2**w - 2):
        table.append(mul(table[-1], g, n))
    digits = []
    while e:
        digits.append(e & (2**w - 1))
        e >>= w
    r = table[digits.pop()]
    for d in reversed(digits):
        for _ in range(w):
            r = mul(r, r, n)
        r = mul(r, table[d], n)        # multiply by g^0 = 1 too: uniform
    return r

def pow_sliding(g, e, n, w):
    g2 = mul(g, g, n)
    odd = {1: g}                       # g, g^3, g^5, ..., g^(2^w - 1)
    for k in range(3, 2**w, 2):
        odd[k] = mul(odd[k - 2], g2, n)
    bits, i, r = bin(e)[2:], 0, None
    while i < len(bits):
        if bits[i] == "0":
            r, i = mul(r, r, n), i + 1
            continue
        j = min(i + w, len(bits))      # the longest window from here that ends in a 1
        while bits[j - 1] == "0":
            j -= 1
        if r is None:
            r = odd[int(bits[i:j], 2)]
        else:
            for _ in range(j - i):
                r = mul(r, r, n)
            r = mul(r, odd[int(bits[i:j], 2)], n)
        i = j
    return r

rng = random.Random(2048)
n = rng.getrandbits(2048) | (1 << 2047) | 1
e = rng.getrandbits(2048) | (1 << 2047)
g = rng.randrange(2, n)
print("ones in e:", bin(e).count("1"))
runs = [("binary", lambda: pow_binary(g, e, n))]
runs += [(f"fixed w={w}", lambda w=w: pow_fixed(g, e, n, w)) for w in (4, 5, 6)]
runs += [(f"sliding w={w}", lambda w=w: pow_sliding(g, e, n, w)) for w in (4, 5, 6, 7)]
for name, run in runs:
    count["S"] = count["M"] = 0
    assert run() == pow(g, e, n)
    S, M = count["S"], count["M"]
    print(f"{name:12} squarings {S:5}  multiplications {M:4}  total {S + M}")
```

It prints:

```text
ones in e: 1007
binary       squarings  2047  multiplications 1006  total 3053
fixed w=4    squarings  2045  multiplications  524  total 2569
fixed w=5    squarings  2046  multiplications  438  total 2484
fixed w=6    squarings  2047  multiplications  402  total 2449
sliding w=4  squarings  2045  multiplications  407  total 2452
sliding w=5  squarings  2045  multiplications  355  total 2400
sliding w=6  squarings  2045  multiplications  320  total 2365
sliding w=7  squarings  2045  multiplications  320  total 2365
```

The squarings never change: about one per bit, whatever the method. Windows
cut the multiplications. Binary multiplies once per 1 bit, about $n/2$. A
fixed window of width $w$ multiplies once per window plus about $2^w$ times
for the table: $512 + 14 = 526$ for $w = 4$, against 524 counted (the table's
$g^2$ counts as a squaring). A sliding window multiplies only by odd powers,
so each window starts at a 1 bit and the zeros between windows cost nothing
extra; that gives about $n/(w + 1)$ multiplications after a table of
$2^{w-1}$ entries, or $2048/6 + 16 \approx 357$ for $w = 5$, against 355
counted. Beyond $w = 6$ the table eats the saving. The Montgomery ladder spends
one squaring and one multiplication on every bit, 4,096 products: the price of
its uniformity, and the reason RSA code hides its exponent with a
constant-time fixed window (2,569 here) instead.

How far is this from the best possible? An exponentiation by multiplications
alone is an **addition chain** for $e$ (§4.11), and a chain for a 2,048-bit
number has at least 2,047 steps, since each step at most doubles the largest
exponent so far. The asymptotic optimum, $\log_2 e + \log_2 e/\log_2 \log_2 e$,
is about $2048 + 2048/11 \approx 2{,}230$ (up to a $1 + o(1)$ factor on the
second term), so a 6-bit sliding window is within about 6 percent of it, and
nobody searches for optimal chains for one-time secret exponents. They do for fixed public ones: the exponent
$65537 = 2^{16} + 1$ needs 16 squarings and 1 multiplication, and the chain
$1, 2, 4, \dots, 2^{16}, 2^{16} + 1$ is optimal.

The biggest saving is a shorter exponent. RFC 7919 notes that a peer in the
3,072-bit group (estimated strength about 125 bits) may draw a secret of just
275 bits: the square-root attacks of §4.11 would still need about $2^{137}$
steps, and the number field sieve ignores the exponent's length. Its own count
is $2 \cdot 2 \cdot 275$ multiplications per handshake instead of $2 \cdot 2
\cdot 3072$, about eleven times less. This is safe only when Pohlig-Hellman has
no small factors of the group order to split off, as with a safe prime.

<figure class="mars-fig">
<svg viewBox="0 0 640 290" width="640" role="img" aria-label="Fixed 4-bit window for exponent 45: the windows 0010 and 1101 select table entries g squared and g to the 13th from a table of 16 entries; every lookup reads all 16; the operations are four squarings and a multiplication per window" fill="currentColor" font-size="14">
<text x="20" y="28">exponent 45 = 0010 1101, cut into 4-bit windows (digits in base 16)</text>
<g stroke="currentColor" stroke-width="1.3" fill="none">
<rect x="150" y="45" width="110" height="34" rx="5"/>
<rect x="400" y="45" width="110" height="34" rx="5"/>
<path d="M205 79 L124 118"/><path d="M455 79 L516 118"/>
</g>
<g text-anchor="middle">
<text x="205" y="67">0010 → 2</text>
<text x="455" y="67">1101 → 13</text>
</g>
<g stroke="currentColor" stroke-width="1.2" fill="none">
<rect x="32" y="120" width="576" height="34"/>
<path d="M68 120v34M104 120v34M140 120v34M176 120v34M212 120v34M248 120v34M284 120v34M320 120v34M356 120v34M392 120v34M428 120v34M464 120v34M500 120v34M536 120v34M572 120v34"/>
</g>
<rect x="104" y="120" width="36" height="34" fill-opacity=".25"/>
<rect x="500" y="120" width="36" height="34" fill-opacity=".25"/>
<g text-anchor="middle" font-size="13">
<text x="50" y="142">g⁰</text>
<text x="86" y="142">g¹</text>
<text x="122" y="142">g²</text>
<text x="158" y="142">g³</text>
<text x="194" y="142">g⁴</text>
<text x="230" y="142">g⁵</text>
<text x="266" y="142">g⁶</text>
<text x="302" y="142">g⁷</text>
<text x="338" y="142">g⁸</text>
<text x="374" y="142">g⁹</text>
<text x="410" y="142">g¹⁰</text>
<text x="446" y="142">g¹¹</text>
<text x="482" y="142">g¹²</text>
<text x="518" y="142">g¹³</text>
<text x="554" y="142">g¹⁴</text>
<text x="590" y="142">g¹⁵</text>
</g>
<path d="M32 162 L32 170 L608 170 L608 162" stroke="currentColor" fill="none" stroke-width="1.2"/>
<text x="320" y="190" text-anchor="middle" font-size="13" fill-opacity=".7">the constant-time lookup reads all 16 entries and keeps one by mask</text>
<text x="320" y="232" text-anchor="middle" font-family="monospace">sq sq sq sq ×g²  sq sq sq sq ×g¹³</text>
<text x="20" y="275" font-size="13">per window: four squarings, then one multiplication, whatever the digit (0 included)</text>
</svg>
<figcaption>Figure 4.6. A fixed window of width 4 on the exponent 45. The table holds $g^0$ to $g^{15}$; each window costs four squarings and one multiplication by the selected entry, and the selection touches the whole table, so neither the operations nor the memory addresses depend on the secret digits.</figcaption>
</figure>

### Named groups across the light delay

Arcadia City's link to Earth has a one-way delay of 3 to 22 minutes, so a full round trip costs 6 to 44 minutes.
In TLS 1.3, a client guesses the server's group and sends its key share
$g^x$ in its first message; if the guess is wrong, the server answers with a
retry request and the handshake loses a whole round trip, up to 44 minutes on
the Mars link. Short fixed lists of named groups (RFC 7919's safe primes, or
X25519) make a right first guess easy: both sides know the prime and generator
in advance. A safe-prime group also lets the receiver validate $Y$ alone, with
$1 < Y < p - 1$ (§4.9), without asking the other side anything. And a key
share made with a short exponent is cheap enough for the station's small
controllers to make a fresh one for every session rather than reuse one for
hours. Reuse is what
made OpenSSL's 2016 small-subgroup bug (CVE-2016-0701) exploitable, in
non-safe-prime groups of the RFC 5114 kind.

## 4.11 Going deeper

*Level: expert.*

**Addition chains.** The fewest multiplications needed to compute $g^e$ is the
length of the shortest **addition chain** for $e$: a sequence $1 = a_0, a_1,
\dots, a_r = e$ where each term is a sum of two earlier ones. Square-and-multiply
gives a chain of length at most $2\log_2 e$; the optimum is $\log_2 e + (1 +
o(1)) \log_2 e / \log_2 \log_2 e$ (Brauer 1939, Erdős 1960). Finding the shortest
chain is believed hard in general, but for fixed exponents such as $p - 2$
people search for good chains once and hard-code them. §4.10 measured how close
the everyday methods come: a 6-bit sliding window is within about 6 percent of
the asymptotic optimum for a 2,048-bit exponent.

**Artin's conjecture.** Is 2 a primitive root for infinitely many primes? Emil
Artin conjectured in 1927 that every integer other than $-1$ and squares is a
primitive root for infinitely many primes, and that for 2 the proportion of such
primes is Artin's constant, about 0.3740 (§4.7 counted 37.3 percent below
200,000). Christopher Hooley proved it in 1967
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

### Pollard's rho, with Floyd's cycle finding

Baby-step giant-step (§4.8) takes about $\sqrt n$ steps in a group of order
$n$, but it also stores $\sqrt n$ elements, and for $n \approx 2^{256}$ no
memory is that large. John Pollard's rho method (1978) keeps the running time
and drops the memory to a few numbers. *Cryptanalysis*,
[Chapter 12](../cryptanalysis/12-Discrete-Logarithms.md#123-pollards-rho-for-logarithms),
tells it as an attack and gives the parallel version with distinguished points
that every record uses. Here we take the mathematics apart: the walk, the
cycle finding, and the linear congruence at the end.

**The walk.** Let $g$ have order $n$ and $h = g^x$. Split the group into three
parts by the residue of $y$ modulo 3 and define

$$f(y) = \begin{cases} h\,y & y \equiv 1 \pmod 3, \\ y^2 & y \equiv 0 \pmod 3, \\ g\,y & y \equiv 2 \pmod 3. \end{cases}$$

Start at $y_0 = 1$ and set $y_{i+1} = f(y_i)$. Every $y_i$ has the form $g^{a_i}
h^{b_i}$ with known exponents: multiplying by $h$ adds 1 to $b$, by $g$ adds 1
to $a$, and squaring doubles both, all modulo $n$.

**The shape.** The group is finite, so some value repeats, and since each
value determines the next, the sequence from the first repeat on is periodic.
The picture is the Greek letter $\rho$: a tail of length $\mu$ leading into a
cycle of length $\lambda$ (Figure 4.7). If $f$ behaved like a random function,
the birthday argument
([Chapter 16](16-Probability.md#165-the-union-bound-and-the-birthday-problem))
gives a first repeat
after about $\sqrt{\pi n/2} \approx 1.25\sqrt n$ steps, split on average evenly
between tail and cycle.

**Floyd's cycle finding.** To detect the repeat without storing the walk, run
two copies: the tortoise $T_i = y_i$ and the hare $H_i = y_{2i}$, which takes
two steps per round. Knuth attributes the idea to Robert Floyd, who did not
publish it.

**Claim.** $y_i = y_{2i}$ for some $i \ge 1$, and the first such $i$ is the
smallest positive multiple of $\lambda$ that is at least $\mu$; in particular $i \le \mu
+ \lambda$.

*Proof.* A tail element occurs only once in the walk, so $y_i = y_{2i}$ with
$i \ne 2i$ forces $y_i$ into the cycle, that is $i \ge \mu$. On the cycle,
$y_j = y_k$ (for $j, k \ge \mu$) exactly when $\lambda \mid k - j$; with $j = i$
and $k = 2i$, that is $\lambda \mid i$. The smallest positive multiple of
$\lambda$ that is at least $\mu$ is at most $\mu + \lambda$. $\blacksquare$

**The congruence.** At the meeting, $g^{a_i} h^{b_i} = g^{a_{2i}} h^{b_{2i}}$,
so with $h = g^x$ and $g$ of order $n$,

$$(b_i - b_{2i})\,x \equiv a_{2i} - a_i \pmod n.$$

This is a linear congruence $ux \equiv v \pmod n$, solved in Chapter 3
([§3.6](03-Modular-Arithmetic.md#36-linear-congruences)): with $d = \gcd(u, n)$,
there is a solution only if $d \mid v$, and then exactly $d$ of them modulo $n$,
spaced $n/d$ apart. If $n$ is prime, $d = 1$ unless $u \equiv 0$ (a useless
collision, probability about $1/n$, after which one restarts from another
point), and $x$ is unique. If $n$ is composite, test the $d$ candidates against
$h$.

*By hand*, in the subgroup of prime order $q = 53$ modulo the safe prime $p =
107$, with $g = 4$ (a square, so of order 53) and $h = 86$. The plain walk is

$$1 \to 86 \to 23 \to 92 \to 47 \to \mathbf{81} \to 34 \to 35 \to 33 \to 19 \to 29 \to 9 \to \mathbf{81},$$

so $\mu = 5$ and $\lambda = 7$, and Floyd should stop at $i = 7$, the first
multiple of 7 that is at least 5. The tortoise and hare, with their exponents
$(y, a, b)$:

| $i$ | tortoise $y_i$, $(a, b)$ | hare $y_{2i}$, $(a, b)$ |
|---|---|---|
| 1 | 86, (0, 1) | 23, (1, 1) |
| 2 | 23, (1, 1) | 47, (3, 1) |
| 3 | 92, (2, 1) | 34, (8, 2) |
| 4 | 47, (3, 1) | 33, (9, 3) |
| 5 | 81, (4, 1) | 29, (18, 7) |
| 6 | 34, (8, 2) | 81, (38, 14) |
| 7 | **35**, (8, 3) | **35**, (23, 29) |

So $g^8h^3 = g^{23}h^{29}$, giving $(3 - 29)x \equiv 23 - 8$, that is $-26x
\equiv 15$, or $27x \equiv 15 \pmod{53}$. Since $27 \cdot 2 = 54 \equiv 1$, the
inverse of 27 is 2, and $x \equiv 30$. Check: $4^{30} \bmod 107 = 86$.

Now the whole group, of composite order $n = 106 = 2 \cdot 53$, with the
primitive root $g = 2$ and $h = 32$. Floyd meets at $i = 10$ with $y = 3 = g^{10}
h^{12} = g^{16}h^{32}$. The congruence is $(12 - 32)x \equiv 6$, that is $86x
\equiv 6 \pmod{106}$, and $\gcd(86, 106) = 2$ divides 6. Divide through: $43x
\equiv 3 \pmod{53}$; the inverse of 43 modulo 53 is 37 ($43 \cdot 37 = 1591 = 30
\cdot 53 + 1$), so $x \equiv 111 \equiv 5 \pmod{53}$. The two candidates modulo
106 are 5 and 58. Since $2^5 = 32 = h$, the answer is 5 (and $2^{58} \equiv -32$).

<figure class="mars-fig">
<svg viewBox="0 0 640 390" width="640" role="img" aria-label="The rho shape for the walk with g = 4, h = 86 modulo 107: a tail 1, 86, 23, 92, 47 leads into the cycle 81, 34, 35, 33, 19, 29, 9; tortoise and hare meet at 35" fill="currentColor" font-size="14">
<defs><marker id="ar4r" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<circle cx="250" cy="115" r="80" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="4 4" stroke-opacity=".6"/>
<g stroke="currentColor" stroke-width="1.3">
<line x1="250" y1="359" x2="250" y2="338" marker-end="url(#ar4r)"/>
<line x1="250" y1="323" x2="250" y2="302" marker-end="url(#ar4r)"/>
<line x1="250" y1="287" x2="250" y2="266" marker-end="url(#ar4r)"/>
<line x1="250" y1="251" x2="250" y2="230" marker-end="url(#ar4r)"/>
<line x1="250" y1="215" x2="250" y2="204" marker-end="url(#ar4r)"/>
</g>
<circle cx="250" cy="365" r="5"/><text x="262" y="370">1 (start)</text>
<circle cx="250" cy="329" r="5"/><text x="262" y="334">86</text>
<circle cx="250" cy="293" r="5"/><text x="262" y="298">23</text>
<circle cx="250" cy="257" r="5"/><text x="262" y="262">92</text>
<circle cx="250" cy="221" r="5"/><text x="262" y="226">47</text>
<circle cx="250" cy="195" r="5"/><text x="264" y="200" font-weight="bold">81</text>
<circle cx="187.5" cy="164.9" r="5"/><text x="173.5" y="169.9" text-anchor="end">34</text>
<circle cx="172" cy="97.2" r="8" fill-opacity=".35" stroke="currentColor"/><text x="158" y="102.2" text-anchor="end" font-weight="bold">35</text>
<circle cx="215.3" cy="42.9" r="5"/><text x="201.3" y="47.9" text-anchor="end">33</text>
<circle cx="284.7" cy="42.9" r="5"/><text x="298.7" y="47.9">19</text>
<circle cx="328" cy="97.2" r="5"/><text x="342" y="102.2">29</text>
<circle cx="312.5" cy="164.9" r="5"/><text x="326.5" y="169.9">9</text>
<text x="70" y="300" font-size="13" fill-opacity=".7">tail, μ = 5</text>
<text x="250" y="120" text-anchor="middle" font-size="13" fill-opacity=".7">cycle, λ = 7</text>
<text x="250" y="138" text-anchor="middle" font-size="12" fill-opacity=".7">(clockwise from 81)</text>
<rect x="395" y="150" width="235" height="150" rx="6" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="407" y="175">tortoise y₇ = 35 = g⁸ h³</text>
<text x="407" y="199">hare y₁₄ = 35 = g²³ h²⁹</text>
<text x="407" y="227">(3 − 29) x ≡ 23 − 8</text>
<text x="407" y="251">27 x ≡ 15 (mod 53)</text>
<text x="407" y="279" font-weight="bold">x = 2 · 15 mod 53 = 30</text>
</svg>
<figcaption>Figure 4.7. The rho of §4.11 for $g = 4$, $h = 86$ modulo 107. The walk runs up the tail into the cycle; Floyd's tortoise and hare first meet at step 7, the first multiple of the cycle length past the tail, and the two exponent pairs they carry give one linear congruence for $x$.</figcaption>
</figure>

The code follows the hand computation, then measures the running time over 200
random targets in each of three subgroups of prime order, from about $10^4$ to
about $10^8$:

```python
from math import gcd

def step(y, a, b, g, h, p, n):
    """One step of Pollard's walk. Keeps y = g^a h^b, exponents mod n."""
    if y % 3 == 1:
        return y * h % p, a, (b + 1) % n
    if y % 3 == 0:
        return y * y % p, 2 * a % n, 2 * b % n
    return y * g % p, (a + 1) % n, b

def rho_log(g, h, p, n, show=False):
    """x with g^x = h mod p, where g has order n; Floyd's cycle finding."""
    T = H = (1, 0, 0)                      # tortoise and hare, as (y, a, b)
    i = 0
    while True:
        T = step(*T, g, h, p, n)
        H = step(*step(*H, g, h, p, n), g, h, p, n)
        i += 1
        if show:
            print(i, T, H)
        if T[0] == H[0]:
            break
    (_, a1, b1), (_, a2, b2) = T, H
    u, v = (b1 - b2) % n, (a2 - a1) % n    # g^a1 h^b1 = g^a2 h^b2 gives u x = v mod n
    d = gcd(u, n)
    if u == 0 or v % d:
        return None, i                     # useless collision: start elsewhere
    x0 = (v // d) * pow(u // d, -1, n // d) % (n // d)
    for k in range(d):                     # d solutions mod n; keep the right one
        x = x0 + k * (n // d)
        if pow(g, x, p) == h:
            return x, i

print(rho_log(4, 86, 107, 53, show=True))  # the subgroup of order 53 mod 107
print(rho_log(2, 32, 107, 106))            # the whole group, order 106 = 2 * 53
```

It prints:

```text
1 (86, 0, 1) (23, 1, 1)
2 (23, 1, 1) (47, 3, 1)
3 (92, 2, 1) (34, 8, 2)
4 (47, 3, 1) (33, 9, 3)
5 (81, 4, 1) (29, 18, 7)
6 (34, 8, 2) (81, 38, 14)
7 (35, 8, 3) (35, 23, 29)
(30, 7)
(5, 10)
```

```python
# Uses step() and rho_log() from the listing above.
import random

def is_prime(n):                          # trial division: fine below 10^9
    return n > 1 and all(n % d for d in range(2, int(n ** 0.5) + 1))

rng = random.Random(1978)
for k in (4, 6, 8):
    q = 10 ** k + 1
    while not (is_prime(q) and is_prime(2 * q + 1)):
        q += 2
    p, g = 2 * q + 1, 4                   # 4 is a square, so it has order q
    steps = []
    for _ in range(200):
        x = rng.randrange(1, q)
        found, i = rho_log(g, pow(g, x, p), p, q)
        if found == x:
            steps.append(i)
    mean = sum(steps) / len(steps)
    print(f"q = {q}: {len(steps)} solved, mean {mean:.0f} rounds = {mean / q ** 0.5:.2f} sqrt(q)")
```

It prints:

```text
q = 10061: 200 solved, mean 134 rounds = 1.33 sqrt(q)
q = 1000151: 200 solved, mean 1317 rounds = 1.32 sqrt(q)
q = 100000223: 200 solved, mean 13551 rounds = 1.36 sqrt(q)
```

Each time $q$ grows a hundredfold, the work grows tenfold: the running time is
proportional to $\sqrt q$, at about 1.33 rounds of three walk steps each. A
truly random function would do a little better (a simulation of Floyd's method
on random functions gives about $1.0\sqrt q$ rounds); Pollard's three-way walk
is not quite random, which Edlyn Teske's walks with about 20 random
multipliers fix. For a 256-bit group order, $\sqrt q = 2^{128}$: the reason a
256-bit elliptic curve, or the 256-bit subgroup of a Schnorr group, gives
128-bit security, and the reason no Pohlig-Hellman piece may be smaller.

## Check yourself

??? question "1. Compute $5^{13} \bmod 23$ by square-and-multiply, showing each step."

    $13 = 1101_2$. Bits: 1: $5$; 1: $5^2 \cdot 5 = 125 \equiv 10$; 0: $10^2 = 100
    \equiv 8$; 1: $8^2 \cdot 5 = 320 \equiv 21$. So $5^{13} \equiv 21$. (Chapter 1's
    table gives $5^{13} \equiv 21$ too.)

??? question "2. Run the Montgomery ladder on the exponent $13 = 1101_2$: give the exponents of $(R_0, R_1)$ after each bit."

    Start $(0, 1)$. Bit 1: $(0 + 1, 2 \cdot 1) = (1, 2)$. Bit 1: $(3, 4)$. Bit 0:
    $(2 \cdot 3, 3 + 4) = (6, 7)$. Bit 1: $(13, 14)$. The pair always differs by 1,
    and every bit cost one product and one square.

??? question "3. What are the possible orders of units modulo 31? How many primitive roots are there?"

    Divisors of 30: 1, 2, 3, 5, 6, 10, 15, 30. There are $\varphi(30) = 8$
    primitive roots.

??? question "4. Show that 3 is a primitive root modulo 7, and say what that means for the expansion of 1/7 in base 3."

    $7 - 1 = 6 = 2 \cdot 3$. Check $3^{6/2} = 27 \equiv 6 \neq 1$ and $3^{6/3} =
    9 \equiv 2 \neq 1$. So the order is 6. The digits of $1/7$ in base 3 repeat
    with period $\operatorname{ord}_7(3) = 6$, the longest possible, just as the
    decimal digits do because 10 is also a primitive root modulo 7.

??? question "5. About how many modular multiplications (squarings included) does a 2,048-bit exponent cost with binary square-and-multiply, the Montgomery ladder, and a 5-bit sliding window?"

    Binary: about $2048 + 1024 \approx 3{,}070$. Ladder: one of each per bit,
    4,096. Sliding window: about $2048 + 2048/6 + 16 \approx 2{,}400$. (§4.10
    counted 3,053 and 2,400 on one random exponent.)

??? question "6. For $N = 241 \cdot 337$ and $e = 17$, find $\lambda(N)$, the smallest private exponent, and how many private exponents below $\varphi(N)$ decrypt correctly."

    $\lambda(N) = \operatorname{lcm}(240, 336) = 1680$, and $17^{-1} \bmod 1680 = 593$
    (since $17 \cdot 593 = 10081 = 6 \cdot 1680 + 1$). By the theorem of §4.6, the
    working exponents are exactly $d \equiv 593 \pmod{1680}$; below $\varphi(N) =
    80640$ there are $80640 / 1680 = 48 = \gcd(240, 336)$ of them.

??? question "7. Why is a 2,048-bit prime $p$ with $p - 1 = 2 \cdot 3 \cdot 5 \cdot 7 \cdots$ (a product of small primes) useless for Diffie-Hellman?"

    Pohlig-Hellman splits the discrete logarithm into one small logarithm for
    each prime power factor of $p - 1$ and glues them with the CRT. If all the
    factors are small, every piece is easy, so the whole logarithm is easy.

??? question "8. A rho walk in a group of prime order 53 finds $g^3h^7 = g^{10}h^2$. What is $\log_g h$? What changes if the group order is 106 instead?"

    $(7 - 2)x \equiv 10 - 3$, so $5x \equiv 7 \pmod{53}$. The inverse of 5 is 32
    ($5 \cdot 32 = 160 = 3 \cdot 53 + 1$), so $x \equiv 224 \equiv 12$. Modulo 106,
    $\gcd(5, 106) = 1$ still gives one solution, $x \equiv 7 \cdot 85 \equiv 65$; a
    coefficient sharing a factor $d$ with the order would give $d$ candidates to
    test against $h$.

??? question "9. For a safe prime $p = 2q + 1$, what are the possible orders of elements, and how many have each? Why does $g = 2$ lie in the subgroup of order $q$ for the RFC 7919 primes?"

    Orders divide $2q$: order 1 (one element, 1), order 2 (one element, $-1$),
    order $q$ ($\varphi(q) = q - 1$ elements, the squares other than 1), order
    $2q$ ($\varphi(2q) = q - 1$ elements, the primitive roots). The RFC 7919
    primes end in 64 one bits, so $p \equiv 7 \pmod 8$; by the second supplement 2
    is then a square, hence of order $q$ (it is not 1).

??? question "10. In the proof that RSA decrypts correctly, where is it used that $p \neq q$?"

    In the last step: from $m^{ed} \equiv m$ modulo $p$ and modulo $q$, the CRT
    concludes it modulo $pq$, which needs $\gcd(p, q) = 1$. With $p = q$ the
    modulus would be $p^2$, $\varphi(p^2) = p(p - 1)$, and multiples of $p$ would
    fail to decrypt; besides, $N = p^2$ is trivially factored by a square root.

## What you learned

- Square-and-multiply computes $g^e \bmod n$ with about $1.5\log_2 e$
  multiplications. Its pattern of operations leaks the exponent (Kocher, 1996);
  the Montgomery ladder does the same work for every bit, and its invariant
  $R_1 = gR_0$ proves it correct in any group.
- Windows cut multiplications, not squarings: for a 2,048-bit exponent, about
  3,050 products by binary, 2,400 by a 5-bit sliding window, 2,570 by a
  constant-time fixed window, 4,096 by the ladder.
- Fermat: $a^{p-1} \equiv 1 \pmod p$. Euler: $a^{\varphi(n)} \equiv 1 \pmod n$
  for units. Both are proved by multiplying all units by $a$. They prove that RSA
  decrypts correctly, for every message.
- The order of $a$ is the least $k$ with $a^k \equiv 1$; it divides
  $\varphi(n)$, and the powers of $a$ cycle with period $k$.
- Carmichael's $\lambda(pq) = \operatorname{lcm}(p-1, q-1)$ is the exponent that
  kills every unit; FIPS 186-5 computes RSA's $d$ modulo it. The private
  exponents that work are exactly $d \equiv e^{-1} \pmod{\lambda(N)}$, so $d$
  computed modulo $\varphi(N)$ also works, only larger.
- Every prime has $\varphi(p - 1)$ primitive roots; finding one needs the factors
  of $p - 1$. About 37 percent of primes have 2 as a primitive root, as Artin
  predicted.
- A generator of a subgroup of prime order $q$ needs no factoring: $g \ne 1$ and
  $g^q = 1$. The RFC 7919 primes satisfy $p \equiv 7 \pmod 8$, so $g = 2$ is a
  square and generates the subgroup of order $q$.
- Pohlig-Hellman reduces a discrete logarithm to the prime factors of the group
  order, so the order must have a large prime factor: safe primes, Schnorr
  groups, and checks on received elements.
- Baby-step giant-step and Pollard's rho take about $\sqrt q$ steps in a group
  of prime order $q$; rho needs almost no memory, finds its collision with
  Floyd's cycle finding, and ends with a linear congruence.
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
- Daniel Shanks, "Class Number, a Theory of Factorization, and Genera",
  *Proceedings of Symposia in Pure Mathematics* 20 (1971): baby-step
  giant-step.
- John Pollard, "Monte Carlo Methods for Index Computation (mod p)",
  *Mathematics of Computation* 32 (1978): the rho method for logarithms.
- Edlyn Teske, "On Random Walks for Pollard's Rho Method", *Mathematics of
  Computation* 70 (2001).
- Donald Knuth, *The Art of Computer Programming*, volume 2, 3rd edition
  (Addison-Wesley, 1997): §4.6.3 on evaluating powers and addition chains, and
  §3.1 for Floyd's cycle finding.
- Alfred Brauer, "On Addition Chains", *Bulletin of the American Mathematical
  Society* 45 (1939).
- Marc Joye and Sung-Ming Yen, "The Montgomery Powering Ladder" (CHES 2002).
- David Brumley and Dan Boneh, "Remote Timing Attacks Are Practical" (USENIX
  Security 2003).
- Christopher Hooley, "On Artin's Conjecture", *Journal für die reine und
  angewandte Mathematik* 225 (1967).
- In *Cryptanalysis*: [Chapter 12](../cryptanalysis/12-Discrete-Logarithms.md)
  (baby-step giant-step, rho, kangaroo, index calculus, Logjam) and
  [Chapter 17](../cryptanalysis/17-Side-Channels-the-Attackers-View.md)
  (Kocher's timing attack worked through).
- In *The cryptography book*: [Chapter 12](../../book/12-Diffie-Hellman.md),
  [Chapter 13](../../book/13-RSA.md), [Chapter 14](../../book/14-Discrete-Log-Systems.md).
