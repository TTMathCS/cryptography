# 12. Discrete Logarithms

*Diffie-Hellman, DSA and ElGamal all hand the attacker the same puzzle: here is
$g$, here is $g^x$, find $x$. This chapter is about solving it. You will take
logarithms by hand with baby-step giant-step and Pollard's rho, catch a
logarithm hidden in a known window with two kangaroos, split a 119-bit problem
into pieces small enough to finish in a blink with Pohlig-Hellman, and run index
calculus, the method behind every record, on a 37-bit prime. Then you will see
how the number field sieve made Logjam possible, recover a server's elliptic-curve
key from six invalid points, and break two kinds of weak curve outright: one by
carrying its logarithm into a finite field with a pairing, one by lifting it to
the $p$-adic numbers. Along the way you will see why good curves leave the
attacker nothing better than $\sqrt n$.*

!!! abstract "In this chapter"
    **You will learn:**

    - what the discrete logarithm problem is, in a group of prime order, and
      why the security of Diffie-Hellman, DSA and ElGamal rests on it;
    - baby-step giant-step by hand and in code, and its cost in time and memory;
    - Pollard's rho for logarithms, with distinguished points so that many
      machines can share one search, and the kangaroo method for a logarithm
      known to lie in an interval;
    - Pohlig-Hellman, and why every serious group has prime order;
    - index calculus in a prime field, by hand with a factor base and linear
      algebra modulo $p-1$, and in code;
    - the number field sieve in outline, the records (795 bits in 2019, a
      trapdoored 1,024-bit prime in 2017), and why the work splits into a
      precomputation and a cheap final step;
    - Logjam: the one-week precomputation, the 70-second logarithm, and the
      argument about 1,024-bit groups;
    - small-subgroup and invalid-curve attacks, coded on a toy server;
    - why only generic attacks work on good elliptic curves, the records they
      reached, and the MOV, Frey-Rück and Smart attacks on the curves that are
      not good.

    **You need:** [Chapter 1](01-What-Cryptanalysis-Is.md) of this book (attack
    models and how cost is counted) and [Chapter 11](11-Factoring.md), whose
    sieves are close cousins of the ones here. From the cryptography book,
    [Chapter 12](../../book/12-Diffie-Hellman.md) (groups, generators, Lagrange's
    theorem, Diffie-Hellman), [Chapter 14](../../book/14-Discrete-Log-Systems.md)
    (ElGamal, Schnorr groups and DSA) and, for the last three sections,
    [Chapter 15](../../book/15-Elliptic-Curves.md) (point addition and the
    curves in use). Modular arithmetic and the Chinese remainder theorem.

    **Levels:** §12.1 and §12.2 are for beginners; §12.3 to §12.6 and §12.8 to
    §12.10 are intermediate; §12.7, §12.11 and §12.12 are expert.

## 12.1 The problem

*Level: beginner.*

In 1976 Whitfield Diffie and Martin Hellman published a way for two strangers to
agree on a key over an open line. Alice sends $g^a$, Bob sends $g^b$, and both
compute $g^{ab}$. Everything an eavesdropper sees is a power of $g$. If she could
take one of those powers back to its exponent, she would have $a$, and from $a$
and Bob's $g^b$ the key. The whole protocol stands on one assumption: that going
back is hard. Book 1 built the protocol in
[Chapter 12](../../book/12-Diffie-Hellman.md) and its relatives in
[Chapter 14](../../book/14-Discrete-Log-Systems.md); this chapter is about the
going back.

Here is the problem in the form an attacker meets it. There is a finite group,
written with multiplication, and in it an element $g$ of **prime order** $q$:
$g^q = 1$ and no smaller positive power of $g$ is 1. The powers
$1, g, g^2, \ldots, g^{q-1}$ are all different, and they form a subgroup of $q$
elements. Given an element $h$ of that subgroup, find the exponent $x$ with

$$
g^x = h, \qquad 0 \le x < q .
$$

That $x$ is the **discrete logarithm** of $h$ to the base $g$, written
$\log_g h$. "Discrete" because $x$ is a whole number and there is no smooth
curve to follow: in the integers modulo a prime the powers of $g$ jump about
with no visible order. With $p = 263$ and $g = 4$, which has order $q = 131$,
the first powers are 1, 4, 16, 64, 256, 235, 151, 78, 49, 196: nothing about
196 says that it is $4^9$.

Each of the systems book 1 built gives away something different when the log
falls.

- **Diffie-Hellman.** The log of one public value gives the shared secret, and
  with it every session key derived from it. If a server reuses its exponent,
  one log opens every past and future session that used it.
- **DSA and Schnorr signatures.** The public key is $y = g^x$ in a subgroup of
  prime order $q$ of $\mathbb{Z}_p^*$ (FIPS 186-5 keeps DSA only for verifying
  old signatures; its elliptic-curve form ECDSA is current). The log is the
  private key, and with it the attacker signs anything.
- **ElGamal.** The log of the public key decrypts every message ever sent to it.

In every case the attacker needs one logarithm, of a value they can see. The
attack model is the weakest one of [Chapter 1](01-What-Cryptanalysis-Is.md):
public data only, no chosen anything. That is part of why these attacks matter
so much. Nobody has to be tricked; the numbers are on the wire.

### Not every group is hard

The problem depends on the group, not only on its size. In the additive group
of integers modulo $n$, "powers" of $g$ are multiples, $x \cdot g \bmod n$, and
the logarithm of $h$ is $h \cdot g^{-1} \bmod n$, one inversion with Euclid's
algorithm. That group has exactly the same shape as any other cyclic group of
$n$ elements; only the way its elements are written down differs. The hardness
lives in the representation. The multiplicative group of a prime field is
harder, and the group of points on a well-chosen elliptic curve harder still.

That gives this chapter its plan. Some attacks treat the group as a black box:
they only multiply elements and compare them, so they work in every group. They
are called **generic**, and their cost is about $\sqrt q$ operations. Others
look inside: they use the fact that integers factor into primes, or that a curve
can be mapped into a finite field. Those can be far faster, and they decide how
big a group must be. Figure 12.1 is the map.

<figure class="mars-fig">
<svg viewBox="0 0 640 360" width="640" role="img" aria-label="Map of discrete logarithm attacks: generic attacks that work in any group on the left, attacks that use the group's structure on the right" fill="currentColor" font-size="14">
<rect x="130" y="10" width="380" height="52" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="320" y="32" text-anchor="middle" font-weight="bold">Given g and h = gˣ, find x</text>
<text x="320" y="52" text-anchor="middle" font-size="13">a group of order n, largest prime factor q</text>
<line x1="320" y1="62" x2="160" y2="100" stroke="currentColor" stroke-width="1.4"/>
<line x1="320" y1="62" x2="480" y2="100" stroke="currentColor" stroke-width="1.4"/>
<rect x="10" y="100" width="300" height="250" rx="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<rect x="330" y="100" width="300" height="250" rx="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="160" y="124" text-anchor="middle" font-weight="bold">Generic: any group</text>
<text x="480" y="124" text-anchor="middle" font-weight="bold">Structure: some groups</text>
<line x1="20" y1="134" x2="300" y2="134" stroke="currentColor" stroke-width="1" opacity="0.5"/>
<line x1="340" y1="134" x2="620" y2="134" stroke="currentColor" stroke-width="1" opacity="0.5"/>
<text x="24" y="160">Baby-step giant-step</text>
<text x="24" y="178" font-size="13" opacity="0.8">√q steps and √q memory (§12.2)</text>
<text x="24" y="210">Pollard rho</text>
<text x="24" y="228" font-size="13" opacity="0.8">√q steps, almost no memory (§12.3)</text>
<text x="24" y="260">Kangaroo</text>
<text x="24" y="278" font-size="13" opacity="0.8">√w steps when x is in a window w (§12.4)</text>
<text x="24" y="310">Pohlig-Hellman</text>
<text x="24" y="328" font-size="13" opacity="0.8">splits n into its prime factors (§12.5)</text>
<text x="344" y="160">Index calculus, number field sieve</text>
<text x="344" y="178" font-size="13" opacity="0.8">subexponential, prime fields (§12.6, §12.7)</text>
<text x="344" y="210">Small subgroups, invalid curves</text>
<text x="344" y="228" font-size="13" opacity="0.8">the victim computes in the wrong group (§12.9)</text>
<text x="344" y="260">MOV and Frey-Rück</text>
<text x="344" y="278" font-size="13" opacity="0.8">a pairing moves the log into a field (§12.11)</text>
<text x="344" y="310">Smart's attack</text>
<text x="344" y="328" font-size="13" opacity="0.8">curves with exactly p points (§12.11)</text>
</svg>
<figcaption>Figure 12.1. The attacker's map. Everything on the left costs about the square root of the largest prime factor of the group order; everything on the right exists only because of what the group is made of, and each has a defense in how the group is chosen.</figcaption>
</figure>

### How the cost is counted

The unit of work is a **group operation**: one modular multiplication, or one
point addition on a curve. Brute force tries $x = 0, 1, 2, \ldots$ and costs up
to $q$ operations. The generic methods cost about $\sqrt q$, so a group whose
order is a 256-bit prime offers about $2^{128}$ operations of resistance, the
same as AES-128. That equation, "security is half the bits of the group order",
holds for good elliptic curves, and it is why a 256-bit curve key is enough.

For the multiplicative group of a prime field it fails badly. Index calculus and
the number field sieve run in **subexponential** time, measured with the
notation

$$
L_p[\alpha, c] = \exp\!\Big( (c + o(1)) \, (\ln p)^{\alpha} \, (\ln \ln p)^{1-\alpha} \Big).
$$

With $\alpha = 1$ this is fully exponential in the size of $p$; with
$\alpha = 0$ it is polynomial. The number field sieve achieves
$\alpha = 1/3$. That is why a prime-field group needs a 3,072-bit $p$ for the
same 128-bit security a 256-bit curve gives (the equivalences of SP 800-57
Part 1), and why the generic $\sqrt q$ attacks set only the size of the
*subgroup*, while the sieve sets the size of the *field*.

A last point about costs. Some attacks spend most of their effort on the group
and very little on the particular $h$. The number field sieve is the extreme
case: a precomputation that depends only on the prime, then a cheap step for each
logarithm. When millions of servers share one prime, that difference decides
whether an attack is a research result or a surveillance program. Section 12.8 is
the story of the one time it became visible.

## 12.2 Baby-step giant-step

*Level: beginner.*

Daniel Shanks, an American number theorist who had worked for years at the US
Navy's research laboratories and later taught at the University of Maryland,
published this method in 1971 for computing class numbers, a question in pure
number theory with no cryptography in sight. It applies to any group, and it
was the first algorithm to take logarithms in about $\sqrt q$ steps instead of
$q$. Book 1 ran it once in
[§12.6](../../book/12-Diffie-Hellman.md#126-how-hard-is-the-discrete-logarithm);
here it is the first tool in the box, taken apart a little further.

### The idea

Choose $m = \lceil \sqrt q \, \rceil$ and write the unknown exponent with two
digits in base $m$:

$$
x = i\,m + j, \qquad 0 \le i, j < m .
$$

Then $g^x = h$ is the same as $g^{j} = h \cdot (g^{-m})^{i}$. The left side
takes only $m$ values, so make a table of them, the **baby steps**
$g^0, g^1, \ldots, g^{m-1}$, each stored with its exponent. The right side is
another walk of length $m$, the **giant steps**: start at $h$ and multiply by
$g^{-m}$ again and again, and look each value up in the table. Since some pair
$(i, j)$ is the right one, a match is guaranteed, and a match at $(i, j)$ says
$x = im + j$.

Cost: $m$ multiplications to build the table, at most $m$ more for the giant
steps, and a table of $m$ entries. About $2\sqrt q$ time and $\sqrt q$ memory.
The memory is what limits it. A table for a 64-bit group has four billion
entries; for a 128-bit group, $2^{64}$, more storage than exists.

### By hand

Take $p = 263$, which is $2 \cdot 131 + 1$, and $g = 4$. Since 4 is a square
and not 1, its order is the prime $q = 131$. Find $x$ with $4^x \equiv 172
\pmod{263}$.

$m = 12$, since $12^2 = 144 \ge 131$. The baby steps $4^j \bmod 263$ for
$j = 0, \ldots, 11$:

| $j$ | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| $4^j$ | 1 | 4 | 16 | 64 | 256 | 235 | 151 | 78 | 49 | 196 | 258 | 243 |

The giant-step multiplier is $4^{-12} \bmod 263$. Since $4^{12} \equiv 183$ and
$183 \cdot 23 = 4209 = 16 \cdot 263 + 1$, it is 23. Now walk from $h = 172$,
multiplying by 23 each time:

| $i$ | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|---|
| $172 \cdot 23^i$ | 172 | 11 | 253 | 33 | 233 | 99 | 173 | 34 | **256** |

At $i = 8$ the value 256 is in the table at $j = 4$. So
$x = 8 \cdot 12 + 4 = 100$, and indeed $4^{100} \equiv 172 \pmod{263}$. Twelve
table entries and nine giant-step values, about twenty multiplications, where
counting would have taken a hundred.

### Code it

```python
import math, random

def bsgs(g, h, q, p):
    """Find x in [0, q) with g^x = h mod p, where g has order q."""
    m = math.isqrt(q - 1) + 1
    table = {}
    y = 1
    for j in range(m):                  # baby steps: g^0 .. g^(m-1)
        table.setdefault(y, j)
        y = y * g % p
    giant = pow(g, -m, p)               # g^(-m)
    y = h
    for i in range(m):                  # giant steps: h, h g^-m, h g^-2m, ...
        if y in table:
            return i * m + table[y]
        y = y * giant % p
    return None

p = 137438954447                        # p = 2q + 1, a 37-bit safe prime
q = 68719477223                         # a 36-bit prime
g = 4                                   # a square, so its order is q
random.seed(2)
x = random.randrange(q)                 # the secret
found = bsgs(g, pow(g, x, p), q, p)
print(found == x, "with a table of", math.isqrt(q - 1) + 1, "entries")
print("by hand:", bsgs(4, 172, 131, 263))
```

It prints:

```
True with a table of 262145 entries
by hand: 100
```

The 36-bit group falls in about a tenth of a second on a laptop. Two details in
the code are worth a look. `setdefault` keeps the first exponent stored for a
value, which matters only if the table runs past the order of $g$. And the
giant step $g^{-m}$ is one call, `pow(g, -m, p)`, since Python 3.8 computes
modular inverses with a negative exponent.

### What it costs, and the trade

Halve the memory and the time doubles: with a table of $m/2$ baby steps the
giant steps must cover twice as much ground. More generally a table of $T$
entries costs about $q/T$ giant steps, the same time-memory curve as the
trade-offs of [Chapter 4](04-Brute-Force-Birthdays-and-Trade-offs.md). For
groups up to 50 or 60 bits, on a machine with plenty of memory, baby-step
giant-step is simple, deterministic and quick. Above that the table no longer
fits, and rho, which needs no table at all, takes over.

Baby-step giant-step also has a variant for a logarithm known to lie in an
interval $[a, a + w)$: shift by $g^{a}$ and use $m = \lceil\sqrt w\,\rceil$. It
costs $\sqrt w$ whatever the size of the group, which is the first hint of
something the kangaroo method of §12.4 will make cheap in memory too.

Is $\sqrt q$ the best any method can do? For methods that use only the group
operations, yes. Vassily Nechaev (1994) and Victor Shoup (1997) proved that an
algorithm that sees group elements only as opaque labels, multiplies them and
compares them for equality, needs about $\sqrt q$ operations to find a
logarithm with good probability. The idea of the proof: until two of its
computed elements collide, such an algorithm learns nothing except that they are
all different, and with $k$ elements the chance of a collision is about
$k^2/q$. Every attack faster than $\sqrt q$ must therefore look at how the
elements are written down. Index calculus does, and so do MOV and Smart. On a
good elliptic curve nothing does, and Shoup's bound becomes the security level.

!!! note "Life story: baby-step giant-step"
    **Born:** 1971, Daniel Shanks, as a tool for class numbers of quadratic
    fields · **Purpose:** find a group logarithm in about $\sqrt q$ steps by
    meeting in the middle of the exponent · **Helped:** the first generic
    square-root attack; with Shoup's 1997 lower bound it fixes how big every
    discrete-log group must be; still used for small and interval problems ·
    **Status:** current, limited by its memory, which rho removes

## 12.3 Pollard's rho for logarithms

*Level: intermediate.*

In 1978 John Pollard, a British mathematician working at the research
laboratories of the British Post Office (later British Telecom), published "Monte Carlo
methods for index computation (mod $p$)". He had already given factoring his
$p-1$ method and, in 1975, his rho method
([Chapter 11](11-Factoring.md)). The 1978 paper did for logarithms what the
earlier one had done for factors: it replaced a table with a random walk, and
memory with patience. It contained two methods, rho and lambda. This section is
rho; the next is lambda, the kangaroo.

### A walk that remembers its own exponents

The key observation is that the attacker can make elements whose logarithm is
known *in terms of* $x$. Any element of the form $g^a h^b$, with $a$ and $b$ known,
has logarithm $a + bx$. If two such elements turn out to be equal,

$$
g^{a} h^{b} = g^{a'} h^{b'} \quad\Longrightarrow\quad a + bx \equiv a' + b'x \pmod q
\quad\Longrightarrow\quad x \equiv \frac{a - a'}{b' - b} \pmod q ,
$$

provided $b \ne b'$, which fails only with probability about $1/q$. So the
attacker needs a collision among elements of this form, and the birthday bound
of [Chapter 4](04-Brute-Force-Birthdays-and-Trade-offs.md) says that among
random elements of a group of size $q$ one appears after about
$\sqrt{\pi q / 2} \approx 1.25 \sqrt q$ of them.

Storing them all would bring back the memory problem. Pollard's trick is to
make the sequence **deterministic**: each element decides the next. Then the
sequence, in a finite group, must eventually repeat, and once it repeats it
cycles forever. Drawn on paper it looks like the Greek letter $\rho$: a tail
leading into a loop. A cycle can be detected with constant memory (Floyd's
method runs two walkers, one twice as fast as the other, until they meet), or,
better, with the distinguished points below.

Pollard's walk splits the group into three sets by some easy rule, here the
residue of the element mod 3:

$$
y \mapsto \begin{cases}
y \cdot h & \text{if } y \equiv 0 \pmod 3 \quad (b \mathrel{+}= 1) \\
y^2 & \text{if } y \equiv 1 \pmod 3 \quad (a, b \text{ doubled}) \\
y \cdot g & \text{if } y \equiv 2 \pmod 3 \quad (a \mathrel{+}= 1)
\end{cases}
$$

Each step updates $a$ and $b$ modulo $q$ so that $y = g^a h^b$ stays true.

### By hand

Same group and target as before: $p = 263$, $g = 4$, $q = 131$, $h = 172$.
Start at $y_0 = g h = 688 \bmod 263 = 162$, so $(a, b) = (1, 1)$.

| step | $y$ | $y \bmod 3$ | move | $(a, b)$ |
|---|---|---|---|---|
| 0 | 162 | 0 | times $h$ | (1, 1) |
| 1 | 249 | 0 | times $h$ | (1, 2) |
| 2 | 222 | 0 | times $h$ | (1, 3) |
| 3 | **49** | 1 | square | (1, 4) |
| 4 | 34 | 1 | square | (2, 8) |
| 5 | 104 | 2 | times $g$ | (4, 16) |
| 6 | 153 | 0 | times $h$ | (5, 16) |
| 7 | 16 | 1 | square | (5, 17) |
| 8 | 256 | 1 | square | (10, 34) |
| 9 | **49** | | | (20, 68) |

Step 9 lands on 49 again. Two expressions for the same element:

$$
g^{1} h^{4} = g^{20} h^{68} \quad\Longrightarrow\quad g^{-19} = h^{64}
\quad\Longrightarrow\quad x \equiv \frac{-19}{64} \pmod{131}.
$$

$-19 \equiv 112$, and $64^{-1} \equiv 43 \pmod{131}$ (since $64 \cdot 43 =
2752 = 21 \cdot 131 + 1$). So $x \equiv 112 \cdot 43 = 4816 \equiv 100$. The
same answer as baby-step giant-step, after ten elements instead of 21, and
nothing stored but the walk itself. Figure 12.2 shows the shape that gives the
method its name.

<figure class="mars-fig">
<svg viewBox="0 0 640 360" width="640" role="img" aria-label="The rho shape of the walk: a tail 162, 249, 222 leads into the cycle 49, 34, 104, 153, 16, 256 and back to 49" fill="currentColor" font-size="14">
<defs><marker id="ar12b" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<circle cx="220" cy="125" r="85" fill="none" stroke="currentColor" stroke-width="1.4" stroke-dasharray="4 4" opacity="0.6"/>
<line x1="220" y1="335" x2="220" y2="297" stroke="currentColor" stroke-width="1.4" marker-end="url(#ar12b)"/>
<line x1="220" y1="290" x2="220" y2="252" stroke="currentColor" stroke-width="1.4" marker-end="url(#ar12b)"/>
<line x1="220" y1="245" x2="220" y2="216" stroke="currentColor" stroke-width="1.4" marker-end="url(#ar12b)"/>
<circle cx="220" cy="340" r="5"/><text x="232" y="345">162 = g¹h¹ (start)</text>
<circle cx="220" cy="293" r="5"/><text x="232" y="298">249</text>
<circle cx="220" cy="248" r="5"/><text x="232" y="253">222</text>
<circle cx="220" cy="210" r="7"/><text x="234" y="206" font-weight="bold">49</text>
<circle cx="146.4" cy="167.5" r="5"/><text x="134" y="172" text-anchor="end">34</text>
<circle cx="146.4" cy="82.5" r="5"/><text x="134" y="87" text-anchor="end">104</text>
<circle cx="220" cy="40" r="5"/><text x="220" y="26" text-anchor="middle">153</text>
<circle cx="293.6" cy="82.5" r="5"/><text x="306" y="87">16</text>
<circle cx="293.6" cy="167.5" r="5"/><text x="306" y="172">256</text>
<text x="70" y="125" text-anchor="middle" font-size="13" opacity="0.8">the cycle</text>
<text x="160" y="300" text-anchor="end" font-size="13" opacity="0.8">the tail</text>
<rect x="370" y="150" width="260" height="120" rx="6" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="384" y="176">step 3: 49 = g¹ h⁴</text>
<text x="384" y="200">step 9: 49 = g²⁰ h⁶⁸</text>
<text x="384" y="228">so g⁻¹⁹ = h⁶⁴, and</text>
<text x="384" y="252" font-weight="bold">x = −19 / 64 mod 131 = 100</text>
</svg>
<figcaption>Figure 12.2. Pollard's rho on the worked example. The walk is fixed by its starting point, so the first repeat closes a loop; the two exponent pairs recorded at the repeated element give one linear equation for x.</figcaption>
</figure>

### Better walks and distinguished points

Two improvements turned Pollard's idea into the tool every record uses.

The first is the walk. Pollard's three-way rule is not random enough: the
squaring step and the small number of branches make collisions arrive a little
later than the birthday bound promises. Edlyn Teske (1998) showed that an
**$r$-adding walk**, with about 20 precomputed multipliers $M_s = g^{a_s}
h^{b_s}$ and the step $y \mapsto y \cdot M_{s(y)}$, behaves almost like a truly
random walk and meets the birthday bound.

The second is the way collisions are found. Paul van Oorschot and Michael Wiener
(1994, published in the *Journal of Cryptology* in 1999) gave **parallel
collision search**. Call an element **distinguished** if it has some rare,
easy-to-test property, say its last 8 bits are zero. Start many walkers from
random points $g^a h^b$. Each walks until it hits a distinguished point, reports
it with its $(a, b)$ to a central list, and starts again. Two walks that ever
touch the same element follow the same path from then on, so they reach the same
distinguished point, and the central list sees the collision. Only one element
in 256 is stored, the walkers never talk to each other, and $k$ machines finish
$k$ times faster. Every large elliptic-curve record has been run this way.

### Code it

```python
import random

def rho_log(g, h, q, p, r=20, dbits=8):
    """Pollard rho with an r-adding walk and distinguished points."""
    # The walk: y -> y * M[s], where s depends on y and M[s] = g^a[s] h^b[s].
    a = [random.randrange(q) for _ in range(r)]
    b = [random.randrange(q) for _ in range(r)]
    M = [pow(g, a[s], p) * pow(h, b[s], p) % p for s in range(r)]
    mask = (1 << dbits) - 1
    seen = {}                                  # distinguished point -> (A, B)
    steps = 0
    while True:
        A, B = random.randrange(q), random.randrange(q)   # a fresh walker
        y = pow(g, A, p) * pow(h, B, p) % p
        for _ in range(40 << dbits):           # give up on a walk that loops
            if y & mask == 0:                  # distinguished: report it
                break
            s = y % r
            y = y * M[s] % p
            A, B = (A + a[s]) % q, (B + b[s]) % q
            steps += 1
        else:
            continue
        if y in seen and seen[y][1] != B:
            A2, B2 = seen[y]                   # g^A h^B = g^A2 h^B2
            return (A2 - A) * pow(B - B2, -1, q) % q, steps
        seen[y] = (A, B)

random.seed(12)
p, q, g = 137438954447, 68719477223, 4
x = random.randrange(q)
found, steps = rho_log(g, pow(g, x, p), q, p)
print(found == x, steps, "steps; sqrt(q) is", int(q ** 0.5))
```

It prints:

```
True 149732 steps; sqrt(q) is 262144
```

Over forty runs with different secrets the average was $1.18\sqrt q$ steps,
right at the birthday estimate of $1.25\sqrt q$ (this run was a little lucky).
The memory used was one dictionary of a few hundred distinguished points. The
`for ... else` with `continue` throws away a walker that wanders too long
without meeting a distinguished point, which protects against a walk stuck in a
short loop.

Nothing in `rho_log` knows it is working modulo a prime except the two
multiplications. Replace them with point addition and it attacks an elliptic
curve, with the same cost. That is the whole content of §12.10 in one sentence,
and the reason Pollard's method is the measuring stick for every curve.

!!! note "Life story: Pollard's rho for logarithms"
    **Born:** 1978, John Pollard, "Monte Carlo methods for index computation
    (mod $p$)", *Mathematics of Computation* · **Purpose:** take a logarithm in
    $\sqrt q$ steps with no table, by waiting for a deterministic walk to
    collide with itself · **Helped:** Teske's $r$-adding walks (1998) and van
    Oorschot and Wiener's distinguished points (1994) made it parallel; it
    solved every public elliptic-curve challenge from 79 bits to the 112-bit
    and 117-bit records · **Status:** current; the attack that sets the size of
    every elliptic-curve key

## 12.4 The kangaroo: logarithms in an interval

*Level: intermediate.*

Sometimes the attacker knows more than "$x$ is somewhere below $q$". A
protocol may use **short exponents**: a 2,048-bit Diffie-Hellman group with a
secret exponent of only 224 or 256 bits, to save time. A homomorphic voting
scheme may encrypt a vote count as $g^m$, where $m$ is at most the number of
voters. A key may have been generated by a broken program that set most of its
bits to zero. In each case $x$ lies in a known window $[a, a + w)$ with $w$ much
smaller than $q$, and the right cost is $\sqrt w$, not $\sqrt q$.

Rho cannot use the window: its walk scatters exponents over the whole group.
Baby-step giant-step can, but needs a table of $\sqrt w$ entries. Pollard's
second 1978 method, which he called **lambda** and everyone since has called the
**kangaroo method**, gets $\sqrt w$ time with almost no memory.

### Two kangaroos

Fix a small set of jump lengths $d_0, d_1, \ldots, d_{k-1}$, say powers of two,
chosen so their average is about $\sqrt w / 2$. A kangaroo standing on a group
element $y$ jumps to $y \cdot g^{d_{s(y)}}$, where $s(y)$ is a hash of $y$ into
$\{0, \ldots, k-1\}$; on the exponent line it moves forward by $d_{s(y)}$. The
jump depends only on where the kangaroo stands, so two kangaroos that ever land
on the same element jump together from then on.

- The **tame** kangaroo starts at a known exponent, the middle of the window,
  $g^{a + w/2}$. It always knows its own exponent.
- The **wild** kangaroo starts at $h = g^x$. It does not know where it is, but it
  knows how far it has travelled.

Both hop forward. Whichever is behind is crossing ground the other has already
covered, and each of its jumps lands on one of the other's footprints with
probability about one over the mean jump length, $2/\sqrt w$. Once it lands on
one, the two paths merge. Both kangaroos leave a marker at distinguished points,
as in §12.3, and when the wild one reaches a point where the tame one left a
marker,

$$
x + D_{\text{wild}} = \text{exponent of the tame marker}, \qquad
x = \text{tame exponent} - D_{\text{wild}} .
$$

Figure 12.3 draws one run. The name "lambda" comes from the shape of the two
paths: two lines that meet and run on together, like the letter $\lambda$.

<figure class="mars-fig">
<svg viewBox="0 0 640 270" width="640" role="img" aria-label="Two kangaroos on the exponent line: the tame one starts in the middle of the window and jumps right; the wild one starts at the unknown x, lands on a spot the tame one used, and from there both follow the same jumps to a distinguished point" fill="currentColor" font-size="14">
<line x1="20" y1="140" x2="625" y2="140" stroke="currentColor" stroke-width="1.5"/>
<line x1="60" y1="130" x2="60" y2="150" stroke="currentColor" stroke-width="1.5"/>
<line x1="460" y1="130" x2="460" y2="150" stroke="currentColor" stroke-width="1.5"/>
<text x="60" y="168" text-anchor="middle">a</text>
<text x="460" y="168" text-anchor="middle">a + w</text>
<path d="M 260 140 Q 285 95 310 140" fill="none" stroke="currentColor" stroke-width="1.6"/>
<path d="M 310 140 Q 330 105 350 140" fill="none" stroke="currentColor" stroke-width="1.6"/>
<path d="M 350 140 Q 375 95 400 140" fill="none" stroke="currentColor" stroke-width="1.6"/>
<path d="M 400 140 Q 440 75 480 140" fill="none" stroke="currentColor" stroke-width="1.6"/>
<path d="M 480 140 Q 505 95 530 140" fill="none" stroke="currentColor" stroke-width="1.6"/>
<path d="M 530 140 Q 560 90 590 140" fill="none" stroke="currentColor" stroke-width="1.6"/>
<circle cx="260" cy="140" r="5"/>
<text x="260" y="60" text-anchor="middle">tame starts at a + w/2</text>
<line x1="260" y1="66" x2="260" y2="128" stroke="currentColor" stroke-width="1" opacity="0.5"/>
<path d="M 110 140 Q 140 190 170 140" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="5 3"/>
<path d="M 170 140 Q 210 205 250 140" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="5 3"/>
<path d="M 250 140 Q 280 190 310 140" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="5 3"/>
<path d="M 310 140 Q 330 175 350 140" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="5 3"/>
<path d="M 350 140 Q 375 185 400 140" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="5 3"/>
<path d="M 400 140 Q 440 205 480 140" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="5 3"/>
<circle cx="110" cy="140" r="5" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="110" y="232" text-anchor="middle">wild starts at x</text>
<text x="110" y="250" text-anchor="middle" font-size="13" opacity="0.8">(unknown)</text>
<line x1="110" y1="214" x2="110" y2="152" stroke="currentColor" stroke-width="1" opacity="0.5"/>
<rect x="303" y="133" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="312" y="34" text-anchor="middle" font-size="13">wild lands on a tame spot:</text>
<text x="312" y="50" text-anchor="middle" font-size="13">from here they jump together</text>
<rect x="472" y="132" width="16" height="16"/>
<text x="560" y="200" text-anchor="middle" font-size="13">distinguished point:</text>
<text x="560" y="216" text-anchor="middle" font-size="13">both left a marker here,</text>
<text x="560" y="232" text-anchor="middle" font-size="13">so x = tame − wild distance</text>
<line x1="530" y1="188" x2="486" y2="150" stroke="currentColor" stroke-width="1" opacity="0.5"/>
<text x="600" y="100" font-size="13" opacity="0.8">tame (above)</text>
<text x="20" y="200" font-size="13" opacity="0.8">wild (below)</text>
</svg>
<figcaption>Figure 12.3. The kangaroo method. Jumps depend only on the current element, so once the wild kangaroo lands where the tame one has been, it repeats the tame one's jumps; the first shared distinguished point gives x. Nothing is stored except the markers.</figcaption>
</figure>

### Why $2\sqrt w$

With mean jump $m$, the tame kangaroo leaves about one footprint per $m$ units
of ground. The kangaroo that starts behind needs about $w/(2m)$ jumps on average
to reach the other's starting area (the two starts are on average $w/4$
apart), and then about $m$ more jumps to land on a footprint. Counting the jumps
of both kangaroos, the total is smallest near $m = \sqrt w / 2$, at about
$2\sqrt w$ jumps. Van
Oorschot and Wiener's version runs a herd of tame and wild kangaroos on many
machines, again with distinguished points, and gets a linear speed-up.

### Code it

```python
import math, random

def kangaroo(g, h, lo, hi, p, dbits=6):
    """Find x in [lo, hi] with g^x = h mod p, in about 2 sqrt(hi - lo) steps."""
    w = hi - lo
    k = 1                                   # jumps 1, 2, 4, ..., 2^(k-1):
    while (2**k - 1) / k < math.isqrt(w) / 2:   # pick k so the mean is about sqrt(w)/2
        k += 1
    jump = [2**i for i in range(k)]
    G = [pow(g, d, p) for d in jump]
    mask = (1 << dbits) - 1
    traps = {}                              # distinguished point -> (which, exponent)
    tame = [pow(g, lo + w // 2, p), lo + w // 2]     # value, exponent (known)
    wild = [h, 0]                           # value, distance from the unknown x
    steps = 0
    while True:
        for which, roo in (("tame", tame), ("wild", wild)):
            y = roo[0]
            if y & mask == 0:               # leave a footprint on distinguished points
                if y in traps and traps[y][0] != which:
                    other = traps[y][1]
                    if which == "tame":
                        return roo[1] - other, steps
                    return other - roo[1], steps
                traps[y] = (which, roo[1])
            s = y % k
            roo[0], roo[1] = y * G[s] % p, roo[1] + jump[s]
            steps += 1

random.seed(4)
p, q, g = 562949953422839, 281474976711419, 4
lo = random.randrange(q - 2**40)
x = lo + random.randrange(2**40)            # a 40-bit secret inside a known window
found, steps = kangaroo(g, pow(g, x, p), lo, lo + 2**40, p)
print(found == x, steps, "steps; 2 sqrt(w) is", 2 * 2**20)
```

It prints:

```
True 2745156 steps; 2 sqrt(w) is 2097152
```

A 40-bit secret inside a 48-bit group, in about 2.7 million jumps and about a
second. Over thirty runs on 32-bit windows the average was about $2.7\sqrt w$:
the theory's $2\sqrt w$, plus the wait for the next distinguished point and the
spread of the starting distance. The group's own size never enters the cost. A
256-bit exponent in a 2,048-bit group, or on a 256-bit curve, costs about
$2^{129}$ jumps, which is why short exponents of twice the security level are
acceptable in a group of prime order.

### Break it: short exponents in the wrong group

Short exponents are safe only when the group has prime order. In 1996 van
Oorschot and Wiener pointed out what happens otherwise. Suppose the prime $p$ is
not a safe prime, so $p - 1$ has a pile of small factors whose product is $s$,
and the exponent $x$ is 160 bits. Pohlig-Hellman (next section) finds
$x \bmod s$ cheaply in the small subgroups. Then $x = x_s + s\,t$ for a known
$x_s$ and an unknown $t$ below $2^{160}/s$, and $t$ is a logarithm in an
interval: the kangaroo finds it in $\sqrt{2^{160}/s}$ steps. If $s$ is around
$2^{60}$, the total is about $2^{50}$, a weekend on a cluster.

Twenty years later Luke Valenta and coauthors went looking for this in the wild
("Measuring small subgroup attacks against Diffie-Hellman", NDSS 2017). They
found servers using the non-safe primes of RFC 5114 with short exponents and no
check on received values. A year before, Antonio Sanso had found that OpenSSL
reused a server's exponent with exactly such groups (CVE-2016-0701, fixed in
January 2016), which turned the measurement into a key-recovery attack. §12.9
tells the rest.

The kangaroo is also a legitimate tool. Voting schemes built on "exponential
ElGamal" decrypt a tally to $g^m$ and then take a short logarithm on purpose,
and public "puzzle" transactions in Bitcoin, with keys hidden in published
ranges, are hunted by hobbyists running kangaroo programs on graphics cards.

!!! note "Life story: the kangaroo (lambda) method"
    **Born:** 1978, John Pollard, in the same paper as rho · **Purpose:** find a
    logarithm known to lie in an interval of width $w$ in about $2\sqrt w$
    steps and constant memory · **Helped:** van Oorschot and Wiener's parallel
    herds (1996, 1999); the attack on short exponents in groups with small
    factors; decoding exponential-ElGamal tallies; Galbraith, Pollard and
    Ruprai's refinements (2013) brought the constant below 2 · **Status:**
    current, both as an attack and as a tool

## 12.5 Pohlig-Hellman, and why prime order matters

*Level: intermediate.*

Up to here the group had prime order. Diffie and Hellman's original proposal did
not: it used all of $\mathbb{Z}_p^*$, of order $p - 1$, which is even and often
has many small factors. In 1978 Stephen Pohlig, Hellman's student at Stanford,
and Hellman published the algorithm that shows why that is a mistake. Roland
Silver had found the same method independently but did not publish it, which is
why it is sometimes called Silver-Pohlig-Hellman. Book 1 sketched it in
[§12.11](../../book/12-Diffie-Hellman.md#1211-going-deeper); here it is in
full, including the case book 1 skipped, a prime *power* in the order.

### The idea

Let $g$ have order $n = r_1^{e_1} r_2^{e_2} \cdots r_k^{e_k}$. The Chinese
remainder theorem says that $x$ is determined by its residues modulo each
$r_i^{e_i}$. Each residue can be found in a subgroup of order $r_i$, using only
$e_i$ small logarithms.

**One prime.** Raise both sides of $g^x = h$ to the power $n/r$:

$$
\left(g^{n/r}\right)^{x} = h^{n/r}.
$$

The element $\gamma = g^{n/r}$ has order $r$, so the left side depends only on
$x \bmod r$. The logarithm of $h^{n/r}$ to the base $\gamma$ is a logarithm in a
group of $r$ elements: try them all, or use baby-step giant-step for $\sqrt r$.

**A prime power.** Write $x \bmod r^e$ in base $r$, as
$x_0 + x_1 r + \cdots + x_{e-1} r^{e-1}$. The step above gives $x_0$. Then
divide $h$ by $g^{x_0}$, which removes the lowest digit, and raise to
$n/r^2$: what is left has order $r$ again and reveals $x_1$. Each digit costs
one small logarithm, so a factor $r^e$ costs $e\sqrt r$, not $\sqrt{r^e}$.

The total cost is about $\sum_i e_i \sqrt{r_i}$, which is dominated by the
**largest prime factor** of the order. A group of order $2^{400}$ with nothing
but factors of 2 is as weak as a group of order 2, four hundred times over.

### By hand

$p = 433$, and $p - 1 = 432 = 2^4 \cdot 3^3$: about as smooth as an order can
be. $g = 5$ generates the whole group. Solve $5^x \equiv 63 \pmod{433}$.

*Modulo 16.* $\gamma = 5^{216} \equiv 432 = -1$, of order 2.

| digit | element | power | result | digit value |
|---|---|---|---|---|
| $x_0$ | $63$ | $^{216}$ | $432 = \gamma$ | 1 |
| $x_1$ | $63 \cdot 5^{-1} = 359$ | $^{108}$ | $1$ | 0 |
| $x_2$ | $359$ | $^{54}$ | $432 = \gamma$ | 1 |
| $x_3$ | $63 \cdot 5^{-5} = 383$ | $^{27}$ | $432 = \gamma$ | 1 |

So $x \equiv 1 + 0 \cdot 2 + 1 \cdot 4 + 1 \cdot 8 = 13 \pmod{16}$. At each row
the element is $h$ divided by $g$ to the digits found so far (1, then 1 again,
then $1 + 4 = 5$), and the power is $432/2^{k+1}$.

*Modulo 27.* $\gamma = 5^{144} \equiv 198$, of order 3, with $\gamma^2 \equiv
234$.

| digit | element | power | result | digit value |
|---|---|---|---|---|
| $x_0$ | $63$ | $^{144}$ | $198 = \gamma$ | 1 |
| $x_1$ | $63 \cdot 5^{-1} = 359$ | $^{48}$ | $198 = \gamma$ | 1 |
| $x_2$ | $63 \cdot 5^{-4} = 183$ | $^{16}$ | $1$ | 0 |

So $x \equiv 1 + 1 \cdot 3 + 0 \cdot 9 = 4 \pmod{27}$.

*Joining.* $x = 13 + 16t$ with $13 + 16t \equiv 4 \pmod{27}$, so $16t \equiv 18$.
The inverse of 16 modulo 27 is 22 ($16 \cdot 22 = 352 = 13 \cdot 27 + 1$), so
$t \equiv 18 \cdot 22 = 396 \equiv 18$, and $x = 13 + 16 \cdot 18 = 301$.
Check: $5^{301} \bmod 433 = 63$. Seven tiny logarithms, each in a group of 2 or
3 elements, replaced one search over 432.

### Code it

```python
import math, random

def bsgs(g, h, n, p):                       # x in [0, n) with g^x = h, g of order n
    m = math.isqrt(n - 1) + 1
    table = {pow(g, j, p): j for j in range(m - 1, -1, -1)}
    giant, y = pow(g, -m, p), h
    for i in range(m):
        if y in table:
            return i * m + table[y]
        y = y * giant % p

def pohlig_hellman(g, h, p, factors):
    """g has order n = product of r^e over factors {r: e}. Returns x mod n."""
    n = math.prod(r**e for r, e in factors.items())
    x, mod = 0, 1
    for r, e in factors.items():
        gamma = pow(g, n // r, p)           # an element of order r
        xr = 0
        for k in range(e):                  # find x mod r^e one base-r digit at a time
            hk = pow(pow(g, -xr, p) * h % p, n // r**(k + 1), p)
            xr += bsgs(gamma, hk, r, p) * r**k
        # join x = xr (mod r^e) to what we have, by the Chinese remainder theorem
        x += mod * ((xr - x) * pow(mod, -1, r**e) % r**e)
        mod *= r**e
    return x

p = 376826787151614015252004640895842233      # a 119-bit prime with smooth p - 1
factors = {2: 3, 3: 2, 91229: 1, 483577: 1, 490367: 1,
           538411: 1, 569057: 1, 789623: 1}
assert math.prod(r**e for r, e in factors.items()) == p - 1
g = 5                                       # a generator of the whole group
random.seed(3)
x = random.randrange(p - 1)
print(pohlig_hellman(g, pow(g, x, p), p, factors) == x)
print("by hand:", pohlig_hellman(5, 63, 433, {2: 4, 3: 3}))
```

It prints:

```
True
by hand: 301
```

The prime is 119 bits, larger than any group in which a generic attack could
hope to succeed, and the logarithm takes a few hundredths of a second, because
the largest prime factor of $p - 1$ is 789,623 and baby-step giant-step needs a
table of only 889 entries for it. Pohlig-Hellman composes with everything else
in this chapter: inside each subgroup it can call rho, the kangaroo, or index
calculus.

### Fix it: work in a group of prime order

The defense is to make sure the order has one huge prime factor and to stay in
the subgroup it defines.

- **Safe primes.** Take $p = 2q + 1$ with $q$ prime. Then $\mathbb{Z}_p^*$ has
  subgroups of orders 1, 2, $q$ and $2q$ only. Use $g$ of order $q$ (any square
  other than 1 will do); with a generator of the whole group, the only leak is
  one bit, whether $x$ is even. The
  groups of RFC 3526 and RFC 7919 are all safe primes.
- **Schnorr groups.** Take a prime $q$ of 256 bits and a prime $p$ of 3,072
  bits with $q \mid p - 1$, and work in the subgroup of order $q$. DSA does
  this ([§14.4](../../book/14-Discrete-Log-Systems.md#144-schnorr-groups-and-dsa)),
  and so do the "FIPS 186-type" domain parameters of SP 800-56A. Exponents are
  short and fast, but $p - 1$ has other factors, so received values must be
  checked to lie in the subgroup: $y^q \equiv 1 \pmod p$.
- **Elliptic curves.** Use a curve whose order is a prime $n$, or $h \cdot n$
  with a tiny cofactor $h$ (4 or 8 for the Edwards curves) that the protocol
  clears or checks.

Prime order is not a nicety. The cost of every attack in this chapter except the
sieve is set by the largest prime factor of the order, and the attacks of §12.9
show what happens when a party can be tricked into computing outside the
prime-order subgroup.

!!! note "Life story: the Pohlig-Hellman algorithm"
    **Born:** 1978, Stephen Pohlig and Martin Hellman, *IEEE Transactions on
    Information Theory* (found independently by Roland Silver, unpublished) ·
    **Purpose:** reduce a logarithm in a group of composite order to
    logarithms in its prime-order subgroups · **Helped:** made "use a group of
    prime order" the first rule of discrete-log cryptography; it is the engine
    inside small-subgroup and invalid-curve attacks · **Status:** current;
    harmless against groups of prime order, decisive against everything else

## 12.6 Index calculus

*Level: intermediate.*

Everything so far would work as well on a curve as modulo a prime. Index
calculus does not. It uses one fact about the integers that no black-box group
has: they factor into primes, and many of them factor into *small* primes. That
fact turns logarithms into linear algebra and drops the cost from exponential to
subexponential. It is the reason prime-field keys are ten times longer than
curve keys.

The idea is old. Maurice Kraitchik used it in the 1920s to build tables of
logarithms by hand, and A. E. Western and J. C. P. Miller used related ideas for their 1968
*Tables of Indices and Primitive Roots* ("index" is the old
word for a discrete logarithm, hence the name). Its cryptographic history starts
in 1979, when Leonard Adleman showed that a careful version runs in
subexponential time, three years after Diffie and Hellman's paper. Don Coppersmith,
Andrew Odlyzko and Richard Schroeppel refined it for prime fields in 1986.

### The idea

Work in $\mathbb{Z}_p^*$ with a generator $g$ of order $p - 1$. Choose a
**factor base**: the primes up to a bound $B$, say $\{2, 3, 5, 7\}$. Write $L_f$
for $\log_g f$.

1. **Collect relations.** Pick a random $k$ and compute $g^k \bmod p$ as an
   ordinary integer below $p$. If it happens to factor completely over the
   factor base, $g^k \equiv \prod f^{e_f}$, then taking logarithms,
   $$ k \equiv \sum_f e_f \, L_f \pmod{p-1}. $$
   That is one linear equation in the unknowns $L_f$. A number that factors over
   the base is called **$B$-smooth**.
2. **Linear algebra.** With a few more equations than unknowns, solve the
   system modulo $p - 1$. Now the logarithm of every prime in the base is known.
3. **Descent.** For the target $h$, pick random $s$ until $h \cdot g^{s}
   \bmod p$ is smooth: $h g^s \equiv \prod f^{e_f}$. Then
   $\log_g h = \sum e_f L_f - s$.

Steps 1 and 2 never look at $h$. They are a precomputation for the prime $p$,
and once done, every logarithm modulo $p$ costs only step 3. Keep that in mind
for Logjam. Figure 12.4 shows the shape, which the number field sieve keeps.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="The phases of index calculus and the number field sieve: polynomial selection, relation collection and linear algebra are done once per prime; the descent is done once per target" fill="currentColor" font-size="14">
<defs><marker id="ar12d" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<path d="M 14 40 L 14 26 L 470 26 L 470 40" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="242" y="18" text-anchor="middle" font-weight="bold">once per prime p (the precomputation)</text>
<path d="M 490 40 L 490 26 L 626 26 L 626 40" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="558" y="18" text-anchor="middle" font-weight="bold">once per target</text>
<rect x="10" y="50" width="140" height="70" rx="6" fill="none" stroke="currentColor" stroke-width="1.4" stroke-dasharray="5 3"/>
<text x="80" y="78" text-anchor="middle">1. Choose</text>
<text x="80" y="98" text-anchor="middle">polynomials</text>
<rect x="170" y="50" width="140" height="70" rx="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="240" y="78" text-anchor="middle">2. Collect</text>
<text x="240" y="98" text-anchor="middle">smooth relations</text>
<rect x="330" y="50" width="140" height="70" rx="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="400" y="78" text-anchor="middle">3. Linear algebra</text>
<text x="400" y="98" text-anchor="middle">mod q</text>
<rect x="490" y="50" width="140" height="70" rx="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="560" y="78" text-anchor="middle">4. Descent:</text>
<text x="560" y="98" text-anchor="middle">log of h</text>
<line x1="150" y1="85" x2="168" y2="85" stroke="currentColor" stroke-width="1.4" marker-end="url(#ar12d)"/>
<line x1="310" y1="85" x2="328" y2="85" stroke="currentColor" stroke-width="1.4" marker-end="url(#ar12d)"/>
<line x1="470" y1="85" x2="488" y2="85" stroke="currentColor" stroke-width="1.4" marker-end="url(#ar12d)"/>
<text x="80" y="140" text-anchor="middle" font-size="13" opacity="0.8">(sieve only)</text>
<text x="240" y="140" text-anchor="middle" font-size="13" opacity="0.8">the bulk of the work</text>
<text x="400" y="140" text-anchor="middle" font-size="13" opacity="0.8">a huge sparse system</text>
<text x="560" y="140" text-anchor="middle" font-size="13" opacity="0.8">small, fast</text>
<line x1="10" y1="160" x2="630" y2="160" stroke="currentColor" stroke-width="1" opacity="0.4"/>
<text x="20" y="186" font-weight="bold">Logjam, 512 bits:</text>
<text x="242" y="186" text-anchor="middle">about a week on a few thousand cores</text>
<text x="560" y="186" text-anchor="middle">about 70 seconds</text>
<text x="20" y="214" font-weight="bold">By hand, 227:</text>
<text x="242" y="214" text-anchor="middle">four relations, three unknowns</text>
<text x="560" y="214" text-anchor="middle">one smooth value</text>
<text x="20" y="240" font-weight="bold">Code below, 37 bits:</text>
<text x="242" y="240" text-anchor="middle">72 relations, 62 primes</text>
<text x="560" y="240" text-anchor="middle">a few hundred tries</text>
</svg>
<figcaption>Figure 12.4. Index calculus and its descendant the number field sieve split the work. Everything up to the linear algebra depends only on the prime; the target enters at the last step. A shared prime is a shared precomputation.</figcaption>
</figure>

### By hand

Take the safe prime $p = 227 = 2 \cdot 113 + 1$. Since $227 \equiv 3 \pmod 8$,
2 is not a square modulo 227, so its order is not 113 and must be the full 226:
$g = 2$ is a generator. The factor base is $\{2, 3, 5, 7\}$, and $L_2 = 1$ for
free. Computing powers of 2 and keeping the smooth ones gives, among others:

| $k$ | $2^k \bmod 227$ | factored | relation (mod 226) |
|---|---|---|---|
| 21 | 126 | $2 \cdot 3^2 \cdot 7$ | $21 = 1 + 2L_3 + L_7$ |
| 60 | 120 | $2^3 \cdot 3 \cdot 5$ | $60 = 3 + L_3 + L_5$ |
| 69 | 150 | $2 \cdot 3 \cdot 5^2$ | $69 = 1 + L_3 + 2L_5$ |
| 84 | 196 | $2^2 \cdot 7^2$ | $84 = 2 + 2L_7$ |

Now the linear algebra, modulo 226. The second and third relations say
$L_3 + L_5 \equiv 57$ and $L_3 + 2L_5 \equiv 68$. Subtract: $L_5 \equiv 11$.
Then $L_3 \equiv 57 - 11 = 46$. The first relation gives
$L_7 \equiv 20 - 2 \cdot 46 = -72 \equiv 154$. Check: $2^{46} \bmod 227 = 3$,
$2^{11} = 2048 = 9 \cdot 227 + 5$, and $2^{154} \bmod 227 = 7$.

The fourth relation shows the one real difficulty. On its own it says
$2L_7 \equiv 82 \pmod{226}$, and since 2 has no inverse modulo 226 it has two
solutions, 41 and 154. Arithmetic modulo $p - 1$ is not arithmetic in a field.
The cure is the Chinese remainder theorem again: $226 = 2 \cdot 113$, so solve
modulo the prime 113, where every nonzero number has an inverse, and find each
logarithm modulo 2 separately. Modulo 2 is easy here: $\log_g f$ is even exactly
when $f$ is a square, which one exponentiation, $f^{113} \bmod 227$, decides.
3 and 7 are squares and 5 is not, matching 46, 154 and 11. (For a $p$ whose
$p - 1$ has other small factors, those factors are handled by Pohlig-Hellman.)

*Descent.* Find $\log_2 197$. Multiply 197 by powers of 2 until the result is
smooth: $197 \cdot 2^5 = 6304 \equiv 175 = 5^2 \cdot 7 \pmod{227}$. So

$$
\log_2 197 = 2L_5 + L_7 - 5 = 22 + 154 - 5 = 171,
$$

and indeed $2^{171} \bmod 227 = 197$.

### Code it

The program follows the hand method on a 37-bit safe prime: relations from
random powers, elimination modulo $q = (p-1)/2$, the parity from the quadratic
character, then the descent.

```python
import random

def primes_up_to(b):
    return [n for n in range(2, b + 1) if all(n % d for d in range(2, int(n**0.5) + 1))]

def exponents(n, base):
    """Exponent vector of n over the factor base, or None if n is not smooth."""
    e = [0] * len(base)
    for i, f in enumerate(base):
        while n % f == 0:
            n //= f
            e[i] += 1
    return e if n == 1 else None

def solve_mod(rows, rhs, q):
    """Gaussian elimination mod the prime q; returns one solution (or None)."""
    m = [r[:] + [v] for r, v in zip(rows, rhs)]
    cols = len(rows[0])
    r = 0
    for c in range(cols):
        k = next((i for i in range(r, len(m)) if m[i][c] % q), None)
        if k is None:
            return None                          # not enough relations yet
        m[r], m[k] = m[k], m[r]
        inv = pow(m[r][c], -1, q)
        m[r] = [v * inv % q for v in m[r]]
        for i in range(len(m)):
            if i != r and m[i][c] % q:
                f = m[i][c]
                m[i] = [(a - f * b) % q for a, b in zip(m[i], m[r])]
        r += 1
    return [m[i][-1] for i in range(cols)]

def index_calculus(g, h, p, bound):
    q = (p - 1) // 2                             # p = 2q + 1 is a safe prime
    base = primes_up_to(bound)
    rows, rhs = [], []
    want = len(base) + 10
    # 1. Relations: g^k that factor over the base give k = sum e_i log(f_i) mod p - 1.
    while True:
        k = random.randrange(1, p - 1)
        e = exponents(pow(g, k, p), base)
        if not e:
            continue
        rows.append(e)
        rhs.append(k)
        if len(rows) == want:
            logs = solve_mod(rows, rhs, q)       # 2. Linear algebra, mod q
            if logs:
                break
            want += 10                           # some prime never showed up: get more
    # The log mod 2 is 0 exactly for squares; join it to the log mod q.
    def full(v, lq):
        even = pow(v, q, p) == 1
        return lq if (lq % 2 == 0) == even else lq + q
    logs = [full(f, lq) for f, lq in zip(base, logs)]
    # 3. Descent: find s with h * g^s smooth, then add up the logs.
    while True:
        s = random.randrange(p - 1)
        e = exponents(h * pow(g, s, p) % p, base)
        if e:
            return (sum(a * b for a, b in zip(e, logs)) - s) % (p - 1), len(base), len(rows)

random.seed(1)
p = 137438954447                              # a 37-bit safe prime, p = 2q + 1
g = 5                                         # 5 is not a square, so it generates everything
x = random.randrange(p - 1)
found, nbase, nrel = index_calculus(g, pow(g, x, p), p, 300)
print(found == x, "factor base of", nbase, "primes,", nrel, "relations")
```

It prints:

```
True factor base of 62 primes, 72 relations
```

### How fast, and why not on curves

The cost is a balance. A bigger factor base makes smooth numbers more common but
means more unknowns, more relations to find and a bigger system to solve. The
probability that a random number below $p$ is $B$-smooth is about $u^{-u}$, with
$u = \ln p / \ln B$ (the Dickman estimate). Choosing $B = L_p[1/2, 1/\sqrt 2]$
balances the two and gives a total of about

$$
L_p\!\left[\tfrac12, \sqrt2\right],
$$

subexponential: for a 1,024-bit prime that is around $2^{139}$ by this crude
formula, against $2^{512}$ for rho in the full group. Sieving to find smooth
values in bulk, and the better methods of Coppersmith, Odlyzko and Schroeppel,
lower the constant; the number field sieve of the next section lowers the
exponent from $1/2$ to $1/3$.

Why does none of this work on an elliptic curve? Index calculus needs a notion
of "small" elements that most elements can be written in terms of. Integers have
it: size, and unique factorization. Points on a curve over a prime field have no
known analogue. Victor Miller argued in his 1985 paper proposing elliptic-curve
cryptography that lifting points to curves over the rationals, where heights do
measure size, would fail, and Joseph Silverman and Joe Suzuki made the
argument precise in 1998; Silverman's own "xedni calculus" (index calculus run
backwards) was analyzed in 2000 and found to fail. The open exception is curves over extension
fields $\mathbb{F}_{p^k}$, where Igor Semaev's summation polynomials (2004)
give a kind of factor base; §12.12 returns to it.

!!! note "Life story: index calculus"
    **Born:** the 1920s (Kraitchik) as a way to build tables; 1979 (Adleman) as a
    subexponential attack · **Purpose:** find logarithms in a prime field by
    collecting smooth relations, solving for the logarithms of small primes, and
    expressing any target through them · **Helped:** Coppersmith's 1984 attack
    on fields of characteristic 2; the Coppersmith-Odlyzko-Schroeppel methods
    (1986); every sieve since · **Status:** current in its descendant, the number
    field sieve; the reason prime-field groups need thousands of bits

## 12.7 The number field sieve and the records

*Level: expert.*

Index calculus looks for smooth numbers below $p$. A 1,024-bit $p$ means
1,024-bit candidates, and those are rarely smooth. The **number field sieve**
makes the candidates smaller by working on two sides at once, each of about half
the size, and the gain is the drop from $L_p[1/2]$ to $L_p[1/3]$. It was
invented for factoring by John Pollard, Hendrik Lenstra, Arjen Lenstra and Mark
Manasse between 1988 and 1990 ([Chapter 11](11-Factoring.md) tells that
story), and Daniel Gordon adapted it to discrete logarithms in 1993. Oliver
Schirokauer made the logarithm version practical the same year, and Antoine
Joux and Reynald Lercier gave the modern form in 2003.

### The outline

1. **Polynomial selection.** Choose two irreducible integer polynomials $f$ and
   $g$ with a common root $m$ modulo $p$. The classical choice is $g(X) = X - m$
   and $f$ of degree 4 to 6 with small coefficients; then $f(m) \equiv 0
   \pmod p$. Let $\alpha$ be a root of $f$, and $K = \mathbb{Q}(\alpha)$ the
   number field it generates.
2. **Sieving.** For many coprime pairs $(a, b)$ of small integers, look at the
   integer $a - bm$ on one side and the algebraic number $a - b\alpha$ on the
   other. Both map to the same element $a - bm$ of $\mathbb{F}_p$. When both
   are smooth (the integer over small primes, the algebraic number over prime
   ideals of small norm), their factorizations are two products that are equal
   in $\mathbb{F}_p$: a relation. The sieve finds these pairs in bulk, the way
   the quadratic sieve does.
3. **Linear algebra.** Each relation is a linear equation among the logarithms
   of the small primes and prime ideals, modulo the large prime $q$ dividing
   $p - 1$. Units and the class group of $K$ get in the way of turning ideals
   into numbers; Schirokauer's maps add a few columns that take care of them.
   The matrix has tens of millions of rows, almost all zero, and is solved with
   block Wiedemann or block Lanczos on a cluster.
4. **Descent.** For a target $h$, find an expression of $h$ (times a known
   power of $g$) as a product of medium-sized primes, then write each of those
   through smaller ones by more small sieves ("special-$q$" descent), until
   everything is in the factor base.

With $m$ about $p^{1/(d+1)}$ for a polynomial $f$ of degree $d$, both numbers
tested for smoothness are about $p^{1/(d+1)}$ times a power of the sieve range:
far smaller than $p$, and that is where the speed comes from. The heuristic running time is

$$
L_p\!\left[\tfrac13, \sqrt[3]{64/9}\,\right] \approx
\exp\!\Big(1.923\,(\ln p)^{1/3}(\ln\ln p)^{2/3}\Big),
$$

the same as factoring a number of the same size, though in practice a discrete
log costs several times more, mostly because the linear algebra is modulo a
large $q$ instead of modulo 2. If $p$ has a special form, for example close to a
power of 2 or equal to the value of a polynomial with tiny coefficients, the
**special number field sieve** applies, with constant $\sqrt[3]{32/9}
\approx 1.526$: far cheaper at the same size.

### Precomputation

Look again at Figure 12.4. Phases 1 to 3 depend only on $p$. Phase 4 depends on
the target and is cheap: seconds to minutes. For 512-bit primes, the whole
precomputation was a week of a modest cluster in 2015. For 1,024-bit primes it
is out of academic reach, but not out of reach for an attacker with a budget of
hundreds of millions of dollars, and it is paid **once per prime**. If one prime
protects millions of servers, that attacker pays once and reads them all. That
asymmetry between the prime and the target is the reason to use many primes, or
primes big enough that even one precomputation is out of reach. In 2015 neither
was true of the Internet.

### The records

Public records for logarithms in prime fields have moved with the factoring
records, a little behind them. Figure 12.5 shows the main steps.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Bar chart of discrete logarithm computations in prime fields: 530 bits in 2007, 596 bits in 2014, 512-bit Logjam primes in 2015, 768 bits in 2016, a trapdoored 1024-bit prime in 2017, 795 bits in 2019" fill="currentColor" font-size="14">
<line x1="150" y1="20" x2="150" y2="262" stroke="currentColor" stroke-width="1.4"/>
<line x1="150" y1="262" x2="620" y2="262" stroke="currentColor" stroke-width="1.4"/>
<text x="150" y="282" text-anchor="middle" font-size="12">0</text>
<line x1="263" y1="258" x2="263" y2="266" stroke="currentColor"/><text x="263" y="282" text-anchor="middle" font-size="12">256</text>
<line x1="377" y1="258" x2="377" y2="266" stroke="currentColor"/><text x="377" y="282" text-anchor="middle" font-size="12">512</text>
<line x1="490" y1="258" x2="490" y2="266" stroke="currentColor"/><text x="490" y="282" text-anchor="middle" font-size="12">768</text>
<line x1="604" y1="258" x2="604" y2="266" stroke="currentColor"/><text x="604" y="282" text-anchor="middle" font-size="12">1024 bits</text>
<text x="140" y="42" text-anchor="end">2007</text>
<rect x="150" y="28" width="235" height="22"/>
<text x="393" y="44">160 digits (530 bits)</text>
<text x="140" y="82" text-anchor="end">2014</text>
<rect x="150" y="68" width="264" height="22"/>
<text x="422" y="84">180 digits (596 bits)</text>
<text x="140" y="122" text-anchor="end">2015</text>
<rect x="150" y="108" width="227" height="22" opacity="0.25"/>
<text x="385" y="124">512 bits: Logjam's primes</text>
<text x="140" y="162" text-anchor="end">2016</text>
<rect x="150" y="148" width="340" height="22"/>
<text x="498" y="164">232 digits (768 bits)</text>
<text x="140" y="202" text-anchor="end">2017</text>
<rect x="150" y="188" width="454" height="22" opacity="0.25"/>
<text x="160" y="204" font-size="13">1024 bits, trapdoored special prime</text>
<text x="140" y="242" text-anchor="end">2019</text>
<rect x="150" y="228" width="352" height="22"/>
<text x="510" y="244">240 digits (795 bits)</text>
</svg>
<figcaption>Figure 12.5. Discrete logarithms computed in prime fields. Solid bars are records for general primes; pale bars are special cases: Logjam's two export primes (not a record, but the first done as an attack) and a 1,024-bit prime built with a hidden special form.</figcaption>
</figure>

- **2007:** Thorsten Kleinjung, a 160-digit (530-bit) prime.
- **2014:** Cyril Bouvier, Pierrick Gaudry, Laurent Imbert, Hamza Jeljeli and
  Emmanuel Thomé, 180 digits (596 bits).
- **2016:** Thorsten Kleinjung, Claus Diem, Arjen Lenstra, Christine Priplata
  and Colin Stahlke, 232 digits (768 bits), finished in June 2016 after about
  5,300 core-years, several times the cost of factoring a 768-bit RSA modulus.
- **2019:** Fabrice Boudot, Pierrick Gaudry, Aurore Guillevic, Nadia Heninger,
  Emmanuel Thomé and Paul Zimmermann, 240 digits (795 bits), announced on 2
  December 2019 together with the factorization of RSA-240, using the open
  CADO-NFS software. The logarithm took about 3,100 core-years (counted on
  2.1 GHz Intel Xeon Gold 6130 cores) against about 900 for the factorization.
  The prime was a safe prime just above the RSA-240 number, so nobody could
  have given it a special form.

The pale bar for 2017 is the warning. Joshua Fried, Pierrick Gaudry, Nadia
Heninger and Emmanuel Thomé built a 1,024-bit prime that looks random but has a
hidden polynomial that makes the *special* number field sieve apply, then
computed a discrete logarithm in it in about two months of calendar time on a
few thousand cores, published at EUROCRYPT 2017 as "A kilobit hidden SNFS
discrete logarithm computation". Daniel Gordon had described such trapdoors in
1992. Whoever generates a prime can do this, and nobody else can easily tell.
Several 1,024-bit primes hard-coded in software had no published origin. The
defense is a prime whose digits come from a public recipe: the groups of
RFC 3526 and RFC 7919 take theirs from $\pi$ and $e$.

No 1,024-bit general prime has a public logarithm. Extrapolations from the
2016 and 2019 computations put one at many times the 795-bit effort, beyond any
public project so far; estimates differ, and the capability of national agencies
is not public.

!!! note "Life story: the number field sieve for discrete logarithms"
    **Born:** 1993, Daniel Gordon, from the factoring sieve of Pollard, the
    Lenstras and Manasse (1988 to 1990); made practical by Schirokauer (1993)
    and Joux and Lercier (2003) · **Purpose:** logarithms in large prime fields
    in time $L_p[1/3, 1.923]$, with most of the work done once per prime ·
    **Helped:** every prime-field record (768 bits in 2016, 795 bits in 2019),
    the Logjam precomputation, the trapdoored 1,024-bit prime of 2017 ·
    **Status:** current; it sets the size of every finite-field group (2,048
    bits at least, 3,072 for 128-bit security)

## 12.8 Logjam

*Level: intermediate.*

In the 1990s the United States treated strong cryptography as a munition. Software
sold abroad had to use "export grade" settings, and TLS (then SSL) grew cipher
suites to match: RSA keys of 512 bits for key exchange, and Diffie-Hellman with
primes of 512 bits. The rules were relaxed in 2000, the export suites fell out of
use, and almost everyone forgot about them. They stayed in the code.

On 20 May 2015 fourteen researchers from Inria, the CNRS and the Université de
Lorraine in Nancy, Microsoft Research, Johns Hopkins University, the University
of Michigan and the University of Pennsylvania, with David Adrian as first
author, published "Imperfect Forward Secrecy: How Diffie-Hellman Fails in
Practice". It won the best paper award at ACM CCS that October. Earlier that
year the FREAK attack had shown that export-grade *RSA* could be forced on
some clients. Logjam did the same for Diffie-Hellman, and then asked what the
same arithmetic meant for 1,024-bit groups. The protocol half, the downgrade, is
drawn in book 1's
[§12.8](../../book/12-Diffie-Hellman.md#attack-4-logjam-weak-and-shared-primes)
and analyzed in Chapter 19. This section is the
cryptanalysis half.

### The downgrade, in one paragraph

A server that still accepted the `DHE_EXPORT` suites would, if asked, send a
512-bit group and sign it. The signature covered the group and the nonces but
not the choice of cipher suite, so a man in the middle could change the client's
request to export grade and pass the server's 512-bit group to a client that had
asked for normal DHE. The client, seeing a correctly signed group, used it. Now
the session key depended on a discrete logarithm modulo a 512-bit prime. If the
attacker could find it before the handshake timed out, they could finish the
handshake themselves and read or change everything.

### The arithmetic

A 512-bit discrete logarithm from scratch was within academic reach in 2015, but
it took days, not seconds. Logjam's point was that it did not need to be from
scratch. The team scanned the Internet and found that about 8.4% of the top
million HTTPS domains accepted export DHE, and that the great majority of those
servers used one of just two 512-bit primes, both hard-coded in widely used
software. So they ran the number field sieve precomputation (phases 1 to 3 of
Figure 12.4) for each of the two primes, with the CADO-NFS software. Each took
about a week of wall time on a few thousand cores. After that, the descent for
any individual logarithm took a median of about 70 seconds.

Seventy seconds is long for a handshake, but not impossibly long. The paper
showed ways to keep a connection waiting, and noted that some clients would wait.
And a 512-bit prime is no harder to precompute twice than once: with the
precomputation done, every server using those primes was open to anyone with
the tables and a laptop.

### The argument about 1,024 bits

The second half of the paper is an estimate, not an attack, and it is the half
that changed policy. In 2015 the overwhelming majority of servers that did not
offer export groups used 1,024-bit Diffie-Hellman, and most of them used a small
set of standard or hard-coded primes. The authors scanned and found that a
precomputation for the single most common 1,024-bit prime would allow passive
decryption of connections to about 18% of the top million HTTPS sites, and that a
second prime would open about 66% of the IPsec VPN servers and 26% of the SSH
servers they measured.

What would that precomputation cost? Extrapolating from their 512-bit and 768-bit
experience, they put it at tens of millions of core-years, and estimated that
special-purpose hardware able to do one 1,024-bit prime per year would cost a few
hundred million dollars: far beyond academics, comfortably inside the budget of a
national signals intelligence agency. They then set this beside documents
published from the Edward Snowden archive in 2014, which showed the NSA
decrypting VPN traffic at large scale without explaining how. A 1,024-bit
precomputation for the standard IKE group would fit those descriptions. The paper
was careful to call this a plausible explanation, not a proof. It has never been
confirmed or denied, and the true capability remains secret.

### What changed

- Browsers refused export suites and then, within months, any group under
  1,024 bits; Chrome later dropped finite-field DHE from TLS entirely in favor of
  elliptic-curve Diffie-Hellman.
- TLS 1.3 (RFC 8446, 2018) allows finite-field Diffie-Hellman only with the named
  groups of RFC 7919, safe primes of 2,048 to 8,192 bits from a public recipe,
  and signs the whole handshake transcript, which kills the downgrade.
- SP 800-56A (Revision 3, 2018) approves safe-prime groups from RFC 3526 and
  RFC 7919 of 2,048 bits and up, and SP 800-57 has treated 1,024-bit
  finite-field groups as too weak for new use since 2013.
- SSH and IPsec moved, more slowly, to larger groups and to elliptic curves.

The lesson for a cryptanalyst is the one Figure 12.4 draws. A precomputation
amortized over every target is a different attack from one logarithm, and its
real cost is divided by the number of victims who share the prime.

!!! note "Life story: Logjam"
    **Born:** 20 May 2015, David Adrian and thirteen coauthors, "Imperfect
    Forward Secrecy" (ACM CCS 2015) · **Purpose:** show that export-grade
    Diffie-Hellman could be forced and broken live, and that shared 1,024-bit
    primes put whole protocols within a nation's reach · **Helped:** removed
    export suites and sub-2,048-bit groups from TLS, led to RFC 7919 groups in
    TLS 1.3 and to elliptic curves for key exchange · **Status:** fixed in
    current software; the 1,024-bit question is still open, and still a reason
    to retire 1,024-bit groups everywhere

## 12.9 Small subgroups and invalid curves

*Level: intermediate.*

The attacks so far take a logarithm the hard way, in the group the designer
chose. These take it in a group the attacker chose, by sending the victim an
element that does not belong where the victim thinks it does. The victim does
the work. Each answer leaks a few bits of a long-term secret, and Pohlig-Hellman
assembles them.

### Small-subgroup confinement

Chae Hoon Lim and Pil Joong Lee described the attack at CRYPTO 1997, building
on remarks by Ross Anderson and Serge Vaudenay the year before. The setting: a
server with a **static** Diffie-Hellman exponent $b$ in $\mathbb{Z}_p^*$, used
for many connections. Bob raises whatever he receives to $b$, and then uses the
result in a way an attacker can test, for example to key a MAC on his reply.

If $p - 1$ has a small prime factor $r$, the attacker sends an element $z$ of
order $r$ (take any element and raise it to $(p-1)/r$). Bob computes $z^b$, which
can take only $r$ values: $z^{b \bmod r}$. The attacker tries each of the $r$
candidates against Bob's MAC and learns $b \bmod r$. Repeat for other small
factors of $p - 1$, then join the residues with the Chinese remainder theorem.
If the product of the factors exceeds the size of $b$, that is all of $b$; if
not, the kangaroo of §12.4 finishes the job in a shortened interval.

Book 1 coded this against a deliberately weak prime in
[§12.8](../../book/12-Diffie-Hellman.md#attack-3-small-subgroups). The
defenses are the two of §12.5: a safe prime, where the only small subgroup has
order 2 and leaks one bit, or a Schnorr group plus a check that the received
$y$ satisfies $y^q \equiv 1 \pmod p$, which SP 800-56A calls full public-key
validation. Ephemeral exponents, used once and thrown away, leave nothing to
accumulate.

This is not a museum piece. In January 2016 Antonio Sanso found that OpenSSL,
when configured with the RFC 5114 groups (whose primes are *not* safe, so
$p - 1$ has many small factors), reused the server's exponent and did not check
received values: CVE-2016-0701. The Valenta survey of §12.4 found many more
servers in the same position.

### Invalid curves

On an elliptic curve the same idea needs one more observation, and it is in the
formulas. On $y^2 = x^3 + ax + b$, adding and doubling points uses $a$ (in the
tangent slope) and never uses $b$. A function that computes $dQ$ for a received
point $Q$ will therefore happily compute on *whatever* curve
$y^2 = x^3 + ax + b'$ the point $Q$ actually lies on. If the victim does not
check that $Q$ is on the right curve, the attacker can choose $b'$ to make a
curve whose order has a small factor $r$, send a point of order $r$ on it, and
learn $d \bmod r$ from the answer. Ingrid Biehl, Bernd Meyer and Volker Müller
described this at CRYPTO 2000; Adrian Antipa, Daniel Brown, Alfred Menezes,
René Struik and Scott Vanstone made validation of public keys a standard
requirement in 2003.

### Code it: an invalid-curve attack on a toy server

The server below holds a long-term key $d$ on a curve of prime order 65,699
over $\mathbb{F}_{65539}$, answers each request with a tag computed from $dQ$,
and never checks $Q$. The attacker looks for nearby curves with small factors in
their order, sends one point on each, and matches the tag.

```python
import hashlib, math, random

p, a, b = 65539, 65539 - 3, 7       # y^2 = x^3 - 3x + 7 over F_65539 (p = 3 mod 4)
n = 65699                           # the number of points: a prime

def add(P, Q):                      # the textbook formulas; note that b never appears
    if P is None: return Q
    if Q is None: return P
    (x1, y1), (x2, y2) = P, Q
    if x1 == x2 and (y1 + y2) % p == 0:
        return None
    if P == Q:
        lam = (3 * x1 * x1 + a) * pow(2 * y1, -1, p) % p
    else:
        lam = (y2 - y1) * pow(x2 - x1, -1, p) % p
    x3 = (lam * lam - x1 - x2) % p
    return (x3, (lam * (x1 - x3) - y1) % p)

def mul(k, P):
    R = None
    while k:
        if k & 1: R = add(R, P)
        P, k = add(P, P), k >> 1
    return R

def count(b2):                      # count points on y^2 = x^3 - 3x + b2, the slow way
    total = 1
    for x in range(p):
        r = (x**3 + a * x + b2) % p
        total += 1 if r == 0 else (2 if pow(r, (p - 1) // 2, p) == 1 else 0)
    return total

def random_point(b2):
    while True:
        x = random.randrange(p)
        r = (x**3 + a * x + b2) % p
        if pow(r, (p - 1) // 2, p) == 1:
            return (x, pow(r, (p + 1) // 4, p))   # a square root, as p = 3 mod 4

# The victim: a server with a long-term key d that answers every ECDH request
# with a tag computed from the shared point. It never checks the point it gets.
d = random.Random(2024).randrange(1, n)
def server(Q):
    return hashlib.sha256(repr(mul(d, Q)).encode()).hexdigest()[:16]

# The attacker: find curves with the same a and a different b that have a small
# prime factor r in their order, and send the server a point of order r.
random.seed(1)
residues, moduli, b2 = [], [], 7
while math.prod(moduli) <= n:
    b2 += 1
    order = count(b2)
    for r in (f for f in range(2, 400) if order % f == 0 and all(f % s for s in range(2, f))):
        if r in moduli:
            continue
        Q = mul(order // r, random_point(b2))
        if Q is None:
            continue                    # unlucky point; skip this r
        tag = server(Q)                 # one query
        t = next(t for t in range(r) if hashlib.sha256(repr(mul(t, Q)).encode()).hexdigest()[:16] == tag)
        residues.append(t)
        moduli.append(r)
        print(f"b' = {b2:3}: order {order} has factor {r:3}, so d = {t} mod {r}")

# Chinese remainder theorem: join the pieces.
x, M = 0, 1
for t, r in zip(residues, moduli):
    x += M * ((t - x) * pow(M, -1, r) % r)
    M *= r
print("recovered", x % n, "; the server's key is", d)
```

It prints:

```
b' =   8: order 65796 has factor   3, so d = 2 mod 3
b' =   9: order 65398 has factor   2, so d = 0 mod 2
b' =   9: order 65398 has factor  19, so d = 18 mod 19
b' =  10: order 65815 has factor   5, so d = 1 mod 5
b' =  14: order 65380 has factor   7, so d = 2 mod 7
b' =  16: order 65749 has factor  37, so d = 11 mod 37
recovered 61616 ; the server's key is 61616
```

Six queries. On a real 256-bit curve the attacker needs residues whose product
passes $2^{256}$; with factors up to a few thousand that is a few dozen curves
and, since each residue costs up to $r$ guesses, some thousands of handshakes.
The point counting that is slow here is done once, offline, by the attacker.
Two refinements matter in practice: if the server's answer depends only on the
$x$-coordinate of $dQ$, each query gives $d$ only up to sign modulo $r$, which
costs a few more queries to resolve; and an attacker who can find points of
larger order $r$ can use a kangaroo or baby-step giant-step on the guesses
instead of trying them one at a time.

### In the real world

In 2015 Tibor Jager, Jörg Schwenk and Juraj Somorovsky took the attack to TLS
("Practical Invalid Curve Attacks on TLS-ECDH", ESORICS 2015). They found two
widely used Java implementations, the Bouncy Castle library and the elliptic-curve
provider shipped with Oracle's Java, that did not check received points in
static ECDH cipher suites, and extracted servers' long-term private keys
through ordinary handshakes. In 2017 Antonio Sanso found the same missing check
in several JSON Web Encryption libraries, where the key at stake signed or
decrypted web tokens. In 2018 Eli Biham and Lior Neumann found that the Bluetooth
pairing specification had validated only the $x$-coordinate of exchanged points,
so a man in the middle could substitute points of small order and learn the
pairing key with good probability (CVE-2018-5383).

The defense has three forms, and good libraries use all of them:

- **Validate.** Check that coordinates are in range, that $Q$ satisfies the
  curve equation, and that $Q \ne O$; on curves with a cofactor, also that
  $nQ = O$. SP 800-56A spells out this full validation for ECDH.
- **Leave nothing to accumulate.** Ephemeral keys, used once, turn each leak
  into a leak about a key that no longer matters.
- **Design it away.** X25519 uses only $x$-coordinates and a curve whose
  quadratic twist (where an invalid $x$ lands) also has a large prime factor, so
  any 32-byte string is a safe input
  ([§15.10](../../book/15-Elliptic-Curves.md#twist-security)).

!!! note "Life story: the small-subgroup attack"
    **Born:** 1997, Chae Hoon Lim and Pil Joong Lee (after Anderson and Vaudenay,
    1996) · **Purpose:** recover a static Diffie-Hellman exponent by sending
    elements of small order and testing the answers · **Helped:** made safe primes,
    Schnorr groups and public-key validation standard; found again in OpenSSL in
    2016 (CVE-2016-0701) · **Status:** defeated by prime-order groups with
    validation, or by ephemeral keys

!!! note "Life story: the invalid-curve attack"
    **Born:** 2000, Ingrid Biehl, Bernd Meyer and Volker Müller · **Purpose:**
    the small-subgroup attack on elliptic curves, using the fact that the
    addition formulas never use $b$ · **Helped:** TLS server keys from two Java
    libraries (2015), JSON Web Encryption libraries (2017), Bluetooth pairing
    (2018) · **Status:** defeated by point validation, or by $x$-only designs on
    twist-secure curves such as X25519

## 12.10 Elliptic curves: only the generic attacks

*Level: intermediate.*

On a well-chosen elliptic curve over a prime field the attacker's menu shrinks to
the left half of Figure 12.1. No index calculus, no sieve, no transfer to a
field: only rho and its relatives, at the full square root of the group order.
That is the whole reason a 256-bit curve key gives the security that a 3,072-bit
prime-field key gives, and why book 1's
[Chapter 15](../../book/15-Elliptic-Curves.md) could say that a curve's
security is half its size in bits.

### Rho on a curve

Pollard's rho with distinguished points runs on a curve exactly as in §12.3,
with point additions in place of multiplications. A curve adds one free gift:
negation is almost free ($-(x, y) = (x, -y)$), and $P$ and $-P$ share an
$x$-coordinate. A walk defined on the class $\{P, -P\}$ instead of on points
works in a set half the size, and the expected number of steps drops by a factor
of $\sqrt 2$:

$$
\sqrt{\frac{\pi n}{4}} \approx 0.886\sqrt n .
$$

Getting the factor in practice took care, because such walks fall into short
useless cycles that must be detected and escaped (Bos, Kleinjung and Lenstra,
2010). Curves with other cheap automorphisms give more: the Koblitz curves over
$\mathbb{F}_{2^m}$, whose Frobenius map $(x, y) \mapsto (x^2, y^2)$ costs almost
nothing, lose a further factor of $\sqrt m$. For P-256 and Curve25519 the best
known attack is this rho, at about $2^{128}$ point additions; for secp256k1,
whose extra endomorphism of order 3 gives a factor of $\sqrt 3$, slightly less.

### The challenges and the records

In November 1997 Certicom, a Canadian company that held many elliptic-curve
patents, published the **ECC challenge**: a list of curves over prime fields
(ECCp) and binary fields (ECC2, and the Koblitz curves ECC2K), from 79 to 359
bits, with prize money for the logarithms. The small ones fell quickly: ECCp-79
and ECCp-89 in 1997 and 1998, ECCp-97 in 1998, ECC2K-108 in 2000. ECCp-109 fell
in November 2002 to Chris Monico's team after 549 days on about ten thousand
volunteers' computers; ECC2-109 followed in 2004. Then the jump to 130 bits
proved too large.

In 2009 a team of more than twenty researchers from Europe, the United States and
Taiwan published "Breaking ECC2K-130", a design for an attack on the 130-bit
Koblitz challenge with carefully tuned code for Cell processors, graphics cards
and FPGAs. They estimated it at around a year on a few thousand such devices
and began running it. As far as published records show it was never completed,
and the 130-bit and 131-bit challenges remain open. (This estimate and the
challenge's status are from published reports; if a solution has been announced
since, it was not widely publicized.)

The record for a curve over a prime field came the same year, by a different
route. Joppe Bos, Marcelo Kaihara, Thorsten Kleinjung, Arjen Lenstra and Peter
Montgomery at EPFL in Lausanne solved a logarithm on secp112r1, a standard
112-bit curve from SEC 2, using a cluster of more than 200 PlayStation 3 game
consoles, whose Cell processors were cheap and fast at the multiprecision
arithmetic rho needs. The computation ran from January to July 2009. Binary
curves have since been pushed a little further, to about 117 bits on FPGAs in
2016. Each step of 16 bits multiplies the work by 256; a 256-bit curve is about
$2^{72}$ times harder than the 112-bit record.

!!! note "Life story: the ECC challenges and the PlayStation record"
    **Born:** November 1997, Certicom's ECC challenge; July 2009, the 112-bit
    record of Bos, Kaihara, Kleinjung, Lenstra and Montgomery · **Purpose:**
    measure what parallel rho can actually do against elliptic curves ·
    **Helped:** calibrated curve sizes (ECCp-109 in 2002 took 549 days on about
    ten thousand machines; secp112r1 took half a year on 200 game consoles);
    showed that rho's negation and Frobenius speed-ups work in practice ·
    **Status:** the 130-bit challenges are unsolved; no practical rho threat to
    256-bit curves exists

## 12.11 Weak curves: MOV, Frey-Rück and anomalous curves

*Level: expert.*

Good curves leave only rho. Two families of bad curves leave much more, and both
were found in the decade after elliptic-curve cryptography was proposed. Each
attack maps the curve's group into a group where logarithms are easier, using a
map that respects the group law.

### The pairing idea

A **pairing** on a curve is a map that takes two points of order $n$ to an
$n$-th root of unity in a finite field, and is linear in each argument:

$$
e(aP, bR) = e(P, R)^{ab}.
$$

The Weil pairing and the Tate pairing are the two classical ones. Their values
lie in $\mathbb{F}_{p^k}^*$, where $k$, the **embedding degree**, is the smallest
integer with $n \mid p^k - 1$: the smallest field that contains the $n$-th roots
of unity. Pairings are computed with Victor Miller's algorithm (1986, published
in 2004), a double-and-add loop that multiplies together the values of the lines
used in computing $nP$.

Linearity is the attack. Given $P$ and $Q = dP$, choose any point $S$ with
$e(P, S) \ne 1$, and compute

$$
\alpha = e(P, S), \qquad \beta = e(Q, S) = e(dP, S) = \alpha^d .
$$

The elliptic-curve logarithm $d$ is now a logarithm in $\mathbb{F}_{p^k}^*$,
where index calculus and the number field sieve work. Figure 12.6 shows the
transfer.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="The MOV transfer: a pairing maps the points P and Q = dP on the curve to alpha and beta = alpha to the d in a finite field, where the sieve works; it helps only when the embedding degree k is small" fill="currentColor" font-size="14">
<defs><marker id="ar12f" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<rect x="20" y="20" width="230" height="100" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="135" y="46" text-anchor="middle" font-weight="bold">curve E over F_p</text>
<text x="135" y="72" text-anchor="middle">P, and Q = dP</text>
<text x="135" y="98" text-anchor="middle" font-size="13" opacity="0.8">best attack: rho, √n</text>
<rect x="390" y="20" width="230" height="100" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="505" y="46" text-anchor="middle" font-weight="bold">field F_pᵏ</text>
<text x="505" y="72" text-anchor="middle">α, and β = αᵈ</text>
<text x="505" y="98" text-anchor="middle" font-size="13" opacity="0.8">best attack: the sieve</text>
<line x1="250" y1="70" x2="388" y2="70" stroke="currentColor" stroke-width="1.6" marker-end="url(#ar12f)"/>
<text x="320" y="58" text-anchor="middle">pairing</text>
<text x="320" y="90" text-anchor="middle" font-size="13">e(·, S)</text>
<line x1="20" y1="150" x2="620" y2="150" stroke="currentColor" stroke-width="1" opacity="0.4"/>
<text x="20" y="176" font-weight="bold">supersingular, k = 2:</text>
<text x="230" y="176">a 256-bit curve becomes a 512-bit field. Broken.</text>
<text x="20" y="204" font-weight="bold">pairing-friendly, k = 12:</text>
<text x="230" y="204">a 381-bit curve becomes a 4,572-bit field. Chosen so.</text>
<text x="20" y="232" font-weight="bold">random curve:</text>
<text x="230" y="232">k is about as large as n. The field cannot be written down.</text>
</svg>
<figcaption>Figure 12.6. The MOV and Frey-Rück reduction. The pairing turns the curve logarithm into a logarithm in a finite field. It is an attack only when the embedding degree k is small enough that the sieve in F_pᵏ beats rho on the curve.</figcaption>
</figure>

### When it matters

For a random curve the embedding degree is enormous, about the size of $n$
itself (Ramachandran Balasubramanian and Neal Koblitz proved in 1998 that small
$k$ is very rare), so the field $\mathbb{F}_{p^k}$ is too large to write down and
the reduction is useless. But two kinds of curve have small $k$.

- **Supersingular curves.** Over a prime field with $p > 3$ they have $p + 1$
  points and embedding degree 2; in general their embedding degree is at most 6.
  In the late 1980s they were attractive because their arithmetic was fast. In
  1991 Alfred Menezes, Tatsuaki Okamoto and Scott Vanstone showed at STOC that
  the Weil pairing reduces their logarithms to a field only twice as large in
  bits: a 256-bit supersingular curve is no stronger than a 512-bit prime field,
  which Logjam broke. That was the end of supersingular curves for ordinary
  Diffie-Hellman.
- **Curves with $n \mid p - 1$ or $n \mid p^k - 1$ for small $k$.** Gerhard
  Frey and Hans-Georg Rück (1994) used the Tate pairing, which works whenever
  the embedding degree is small, supersingular or not, including $k = 1$.

### Code it: the MOV attack

The curve $y^2 = x^3 + x$ over a prime $p \equiv 3 \pmod 4$ is supersingular with
$p + 1$ points. Here $p + 1 = 4n$ with $n$ a 34-bit prime. The program computes
the reduced Tate pairing with Miller's loop, using the **distortion map**
$(x, y) \mapsto (-x, iy)$, where $i^2 = -1$ in $\mathbb{F}_{p^2}$: it sends a
point to one that is "independent" of it, so that $e(P, \phi(P)) \ne 1$. Then it
solves the logarithm in $\mathbb{F}_{p^2}^*$.

```python
import math, random

p = 68719487467                     # p = 3 mod 4, and p + 1 = 4n
n = 17179871867                     # a prime: the subgroup we attack
# E: y^2 = x^3 + x over F_p is supersingular, with p + 1 points.

def add(P, Q):
    if P is None: return Q
    if Q is None: return P
    (x1, y1), (x2, y2) = P, Q
    if x1 == x2 and (y1 + y2) % p == 0:
        return None
    if P == Q:
        lam = (3 * x1 * x1 + 1) * pow(2 * y1, -1, p) % p
    else:
        lam = (y2 - y1) * pow(x2 - x1, -1, p) % p
    x3 = (lam * lam - x1 - x2) % p
    return (x3, (lam * (x1 - x3) - y1) % p)

def mul(k, P):
    R = None
    while k:
        if k & 1: R = add(R, P)
        P, k = add(P, P), k >> 1
    return R

# F_{p^2} = F_p[i] with i^2 = -1; an element is a pair (a, b) meaning a + b i.
def fmul(u, v):
    return ((u[0] * v[0] - u[1] * v[1]) % p, (u[0] * v[1] + u[1] * v[0]) % p)

def fpow(u, k):
    r = (1, 0)
    while k:
        if k & 1: r = fmul(r, u)
        u, k = fmul(u, u), k >> 1
    return r

def line(T, U, S):
    """The line through T and U (tangent if equal), evaluated at the point S of E(F_p^2)."""
    (x1, y1), (x2, y2) = T, U
    if T == U:
        lam = (3 * x1 * x1 + 1) * pow(2 * y1, -1, p) % p
    else:
        lam = (y2 - y1) * pow(x2 - x1, -1, p) % p
    xs, ys = S                      # y_S - y1 - lam (x_S - x1)
    return ((ys[0] - y1 - lam * (xs[0] - x1)) % p, (ys[1] - lam * xs[1]) % p)

def tate(P, Q):
    """Reduced Tate pairing of P with the distorted point (-x_Q, i y_Q)."""
    S = ((-Q[0] % p, 0), (0, Q[1]))
    f, T = (1, 0), P
    for bit in bin(n)[3:]:          # Miller's loop over the bits of n
        f = fmul(fmul(f, f), line(T, T, S))
        T = add(T, T)
        if bit == "1":
            if add(T, P) is not None:       # the last line is vertical: it drops out
                f = fmul(f, line(T, P, S))
            T = add(T, P)
    return fpow(f, (p * p - 1) // n)        # vertical lines land in F_p and die here

def bsgs(g, h, order):              # the same baby-step giant-step, in F_{p^2}
    m = math.isqrt(order) + 1
    table, y = {}, (1, 0)
    for j in range(m):
        table.setdefault(y, j)
        y = fmul(y, g)
    giant, y = fpow(g, order - m), h
    for i in range(m):
        if y in table:
            return i * m + table[y]
        y = fmul(y, giant)

random.seed(4)
while True:                         # a point of order n: take a random point, times 4
    x = random.randrange(p)
    r = (x**3 + x) % p
    if pow(r, (p - 1) // 2, p) == 1:
        P = mul(4, (x, pow(r, (p + 1) // 4, p)))
        if P: break
d = random.randrange(1, n)
Q = mul(d, P)                       # the elliptic-curve problem: find d from P and Q
alpha, beta = tate(P, P), tate(Q, P)        # beta = alpha^d in F_{p^2}
print("alpha =", alpha)
found = bsgs(alpha, beta, n)        # a finite-field problem now
print(found == d)
```

It prints:

```
alpha = (19555811585, 48913837098)
True
```

Here the logarithm in $\mathbb{F}_{p^2}$ was solved with baby-step giant-step,
which costs the same as rho on the curve, so on this toy the transfer gains
nothing. The gain appears at real sizes: for a 256-bit supersingular curve the
target field has 512 bits, where the number field sieve needs about a week of a
cluster (§12.8), while rho on the curve would need $2^{128}$ steps. Two details
in the code are the ones every pairing implementation has: the vertical lines of
Miller's loop are left out, because their values lie in $\mathbb{F}_p$ and the
final exponent $(p^2 - 1)/n$, a multiple of $p - 1$, sends them to 1; and the
last step of the loop, $T + P = O$, is itself a vertical line.

### Anomalous curves and Smart's attack

The second family is stranger. A curve over $\mathbb{F}_p$ with **exactly $p$
points**, trace of Frobenius 1, is called **anomalous**. Its logarithms fall in
polynomial time. Igor Semaev (1998), Takakazu Satoh and Kiyomichi Araki (1998)
and Nigel Smart (1999) found the attack independently; Smart's version is the
simplest to state.

Lift the curve and the points from $\mathbb{F}_p$ to the $p$-adic numbers, which
in practice means to integers modulo $p^2$: keep each $x$, correct each $y$ by a
multiple of $p$ so the lifted equation holds (Hensel's lemma). On the lifted
curve, multiplying a point by $p$ lands in the subgroup of points that reduce to
$O$ modulo $p$. Points in that subgroup are close to $O$ in the $p$-adic sense,
and near $O$ the function $t = -x/y$ is a **logarithm**: it turns point addition
into ordinary addition, modulo $p^2$. Since $p$ times the lift of $Q$ and $d$
times $p$ times the lift of $P$ differ by a point even closer to $O$,

$$
t(p\tilde Q) \equiv d \cdot t(p\tilde P) \pmod{p^2},
$$

and both sides are multiples of $p$. Divide by $p$ and $d$ is a quotient modulo
$p$: one division. The work is two scalar multiplications by $p$ modulo $p^2$.

### Code it: Smart's attack

The curve below was made with the theory of complex multiplication so that it has
exactly $p$ points, with a 62-bit $p$ (the program checks the count by testing
that $p P = O$; by Hasse's theorem that forces $p$ points).

```python
import random

p = 3458764755412455547             # a 62-bit prime
A, B = 0, 3                         # E: y^2 = x^3 + 3 over F_p has exactly p points

def add(P, Q, a, m):                # affine addition mod m (m = p or p^2)
    if P is None: return Q
    if Q is None: return P
    (x1, y1), (x2, y2) = P, Q
    if x1 == x2 and (y1 + y2) % m == 0:
        return None
    if P == Q:
        lam = (3 * x1 * x1 + a) * pow(2 * y1, -1, m) % m
    else:
        lam = (y2 - y1) * pow(x2 - x1, -1, m) % m
    x3 = (lam * lam - x1 - x2) % m
    return (x3, (lam * (x1 - x3) - y1) % m)

def mul(k, P, a, m):
    R = None
    while k:
        if k & 1: R = add(R, P, a, m)
        P, k = add(P, P, a, m), k >> 1
    return R

def lift(P, a2):
    """Lift P to y^2 = x^3 + a2 x + B mod p^2, keeping x and adjusting y (Hensel)."""
    x, y = P
    f = (x**3 + a2 * x + B) % p**2
    k = (f - y * y) // p * pow(2 * y, -1, p) % p
    return (x, y + k * p)

def smart_attack(P, Q):
    a2 = A + p                      # a lift of the curve that is not the canonical one
    def t_over_p(R):
        R2 = lift(R, a2)
        x1, y1 = mul(p - 1, R2, a2, p**2)     # (p-1)R, which is -R mod p
        x2, y2 = R2
        w = (x2 - x1) // p          # the x's agree mod p: their gap is p times w
        u = (y2 - y1) % p
        return w * pow(u, -1, p) % p          # p R has parameter t = p w / u
    return t_over_p(Q) * pow(t_over_p(P), -1, p) % p

random.seed(5)
while True:                         # a random point P
    x = random.randrange(p)
    r = (x**3 + A * x + B) % p
    if pow(r, (p - 1) // 2, p) == 1:
        P = (x, pow(r, (p + 1) // 4, p))
        break
assert mul(p, P, A, p) is None      # p P = O: the group has order p
d = random.randrange(1, p)
Q = mul(d, P, A, p)
print(smart_attack(P, Q) == d)
```

It prints:

```
True
```

The last multiplication by $p$ is done by hand in `t_over_p`: the sum of
$(p-1)\tilde R$ and $\tilde R$ has a denominator divisible by $p$, so instead of
dividing, the code reads $t \approx 1/\lambda$ straight from the slope. One
subtlety is visible in the line `a2 = A + p`. Lifting with the curve's own
equation, $a = 0$, gives for this particular curve its **canonical lift**, the one
lift on which the method fails: change the line to `a2 = A` and the program stops
with a division by zero. Any other lift works, which is why the attack is
described as succeeding "with overwhelming probability".

Anomalous curves were never popular, but the attack is a reason for a check in
every curve standard: $n \ne p$. (Koblitz's "anomalous binary curves" are
anomalous over $\mathbb{F}_2$, not over the large field where they are used, and
are not affected.)

### What makes a curve safe

Putting this chapter together, a curve for Diffie-Hellman or signatures needs:

| Requirement | Defeats |
|---|---|
| Order $n$ (or $hn$ with tiny $h$) with $n$ prime and $\sqrt n \ge 2^{128}$ | rho, Pohlig-Hellman |
| $n \ne p$ | Smart, Semaev, Satoh-Araki |
| $n \nmid p^k - 1$ for every small $k$ | MOV, Frey-Rück |
| a prime field, or an extension of prime degree | Weil descent (§12.12) |
| twist with a large prime factor; point validation | invalid curves, twist attacks |
| constants with an explanation | trapdoored parameters |

The first three are arithmetic and are checked by every standard; the
embedding-degree check is usually written as "$p^k \not\equiv 1 \pmod n$ for
$k$ up to some bound" (SEC 1 uses 100). The last two are about implementations
and trust, the criteria of Bernstein and Lange's SafeCurves list that book 1
discusses in [§15.8](../../book/15-Elliptic-Curves.md#158-choosing-a-curve).
P-256 and Curve25519 meet all the arithmetic ones; they differ on the last two.

!!! note "Life story: the MOV and Frey-Rück attacks"
    **Born:** 1991, Alfred Menezes, Tatsuaki Okamoto and Scott Vanstone (Weil
    pairing, STOC 1991; IEEE Transactions on Information Theory, 1993); 1994,
    Gerhard Frey and Hans-Georg Rück (Tate pairing) · **Purpose:** move an
    elliptic-curve logarithm into $\mathbb{F}_{p^k}$ along a pairing ·
    **Helped:** ended supersingular curves for Diffie-Hellman; put the
    embedding-degree check into every curve standard; turned into the
    constructive pairing-based cryptography of the 2000s · **Status:** current
    as a constraint; it sizes every pairing-friendly curve

!!! note "Life story: Smart's attack on anomalous curves"
    **Born:** 1997 to 1999, Igor Semaev, Takakazu Satoh and Kiyomichi Araki, and
    Nigel Smart, independently · **Purpose:** solve the logarithm on a curve with
    exactly $p$ points in polynomial time, by lifting to the $p$-adic numbers ·
    **Helped:** added the check $n \ne p$ to curve standards; a standard example
    of how a curve's group order alone can be fatal · **Status:** complete; no
    deployed curve is anomalous

## 12.12 Going deeper

*Level: expert.*

**Beyond Shoup's bound.** The generic lower bound is for an attacker who starts
from nothing. An attacker who must solve many logarithms in one group does
better: after the first, rho's stored distinguished points help with the next,
and $L$ logarithms cost about $\sqrt{2Ln}$ steps in total, not $L\sqrt n$ (Fabian
Kuhn and René Struik, 2001). Daniel Bernstein and Tanja Lange (2012) showed that
with a precomputation of about $n^{2/3}$ steps, stored as a table of $n^{1/3}$
distinguished points, each later logarithm costs only about $n^{1/3}$. That does
not break anything (the precomputation is larger than one rho), but it means
"128-bit security" in a non-uniform model is weaker than the number suggests,
and it is one more argument against everyone sharing one group, as Logjam showed
for the sieve.

**Pairing-friendly curves.** The pairings of §12.11 are now a tool. BLS signatures, identity-based encryption and
many zero-knowledge proof systems ([§15.10](../../book/15-Elliptic-Curves.md#pairings))
need curves with small $k$ on purpose, and then the MOV reduction is a design
constraint: $\mathbb{F}_{p^k}$ must resist the sieve as well as the curve resists
rho. In 2016 Taechan Kim and Razvan Barbulescu's extended tower number field
sieve lowered the cost of logarithms in fields $\mathbb{F}_{p^{12}}$ and
similar, and the Barreto-Naehrig curve of 256 bits, used as "128-bit" in many
systems, fell to roughly 100-bit security by later estimates. BLS12-381, chosen
in 2017 for the Zcash project, was sized with the new attack in view.

**Small characteristic.** In fields $\mathbb{F}_{2^m}$ and $\mathbb{F}_{3^m}$,
logarithms have collapsed. Coppersmith's 1984 algorithm already ran in
$L[1/3]$ there; in 2013 Antoine Joux reached $L[1/4]$, and later that year Razvan
Barbulescu, Pierrick Gaudry, Joux and Emmanuel Thomé gave a heuristic
quasi-polynomial algorithm, $n^{O(\log n)}$ for a field of $n$ bits. Records
followed in fields of thousands of bits; one of 2019 reached a field of
$2^{30750}$ elements. The casualties were the supersingular pairing curves over
binary and ternary fields, whose embedding fields were suddenly easy.

**Weil descent and curves over extension fields.** A curve over
$\mathbb{F}_{q^m}$ can sometimes be "restricted" to a higher-genus curve over
$\mathbb{F}_q$, where index calculus works. Pierrick Gaudry, Florian Hess and
Nigel Smart (2002) made this an attack on some binary curves with composite $m$.
Semaev's summation polynomials (2004) gave a kind of factor base for curves over
extension fields, and Claus Diem proved subexponential results for some families.
None of this touches curves over prime fields, or over $\mathbb{F}_{2^m}$ with $m$
prime, which is why standards use those.

**Equivalences.** Diffie-Hellman needs the computational problem (find
$g^{ab}$), not the logarithm. Ueli Maurer and Stefan Wolf (1999) showed the two
are equivalent for many groups, given an auxiliary elliptic curve of smooth
order; Bert den Boer had done a special case in 1988. So in practice the
logarithm is the right target, and no one has found a way to compute
Diffie-Hellman secrets without it.

**Shor's algorithm.** A large quantum computer finds discrete logarithms in
polynomial time, in any group, curves included
([Chapter 20](../../book/20-Quantum-Computers.md)). Estimates of the resources
favor attacking curves over RSA of equal classical strength: a 256-bit curve
needs fewer logical qubits than a 3,072-bit modulus. That, not any classical
attack, is why key exchange is moving to post-quantum schemes; the attacker's
side is in [Chapter 16](16-Breaking-Post-Quantum-Candidates.md).

## Check yourself

??? question "1. In the additive group of integers modulo 101, find the 'discrete logarithm' of 37 to the base 7. Why does this not contradict the claim that Diffie-Hellman is secure in a group of 101 elements?"
    The "power" $x \cdot 7$ must equal 37, so $x \equiv 37 \cdot 7^{-1}$. Since
    $7 \cdot 29 = 203 = 2 \cdot 101 + 1$, $7^{-1} \equiv 29$ and
    $x \equiv 37 \cdot 29 = 1073 \equiv 63 \pmod{101}$. Check:
    $63 \cdot 7 = 441 = 4 \cdot 101 + 37$. Diffie-Hellman's security depends on
    the representation of the group, not only its size; the additive
    representation makes logarithms a division. A multiplicative group or a
    curve of the same size hides the structure.

??? question "2. Solve $4^x \equiv 49 \pmod{263}$ (with $g = 4$ of order 131) by baby-step giant-step with $m = 12$. How many group operations did you use?"
    49 is in the baby-step table of §12.2 at $j = 8$, so at $i = 0$ the first
    giant-step value, $h$ itself, already matches: $x = 0 \cdot 12 + 8 = 8$.
    Building the table took 11 multiplications, plus one lookup. In general a
    match can come at any $i$ from 0 to 11.

??? question "3. In Pollard's rho, the walk meets an element twice with exponent pairs $(a, b) = (7, 3)$ and $(a', b') = (12, 8)$ modulo $q = 131$. What is $x$? When would the method fail?"
    $g^7 h^3 = g^{12} h^8$ gives $g^{-5} = h^{5}$, so $5x \equiv -5$ and
    $x \equiv -1 \equiv 130 \pmod{131}$. It fails when $b \equiv b'$, since then
    the equation says nothing about $x$; that happens with probability about
    $1/q$, and the cure is to restart from a new random point.

??? question "4. Why do distinguished points make rho parallel with a linear speed-up, when Floyd's cycle-finding does not?"
    Floyd's method detects a walker colliding with *itself*, so each machine
    waits for its own rho to close, about $\sqrt q$ steps each: $k$ machines are
    no faster than one. With distinguished points, a collision between *any*
    two walks anywhere is seen at the central list as soon as the merged path
    reaches its next distinguished point. All $k$ walks together contribute
    points to one birthday problem, so the total work stays $\sqrt q$ and the
    time drops to $\sqrt q / k$, plus the short wait to the next distinguished
    point.

??? question "5. A server uses a 2,048-bit safe prime and a 160-bit secret exponent. Another uses a 2,048-bit prime with $p - 1$ having small factors whose product is about $2^{100}$, also with a 160-bit exponent, and does not validate inputs. Estimate the work to recover each key."
    Safe prime: the kangaroo on a 160-bit interval, about $2^{81}$ steps (the
    sieve on 2,048 bits is far more), so the key is safe, though below
    128-bit strength. The second: small-subgroup queries give $x \bmod s$ with
    $s \approx 2^{100}$; the remaining unknown is below $2^{160}/2^{100} =
    2^{60}$, and the kangaroo finds it in about $2^{31}$ steps. The weak group
    turns an infeasible attack into minutes.

??? question "6. Use Pohlig-Hellman to find $x$ with $5^x \equiv 40 \pmod{433}$, given that $x \equiv 11 \pmod{16}$. (Find $x \bmod 27$ digit by digit, as in §12.5.)"
    $\gamma = 5^{144} \equiv 198$, $\gamma^2 \equiv 234$. Digit 0:
    $40^{144} \equiv 198 = \gamma$, so $x_0 = 1$. Digit 1: $40 \cdot 5^{-1}
    \equiv 8$, and $8^{48} \equiv 1$, so $x_1 = 0$. Digit 2: still $8$ (the
    digits so far add up to 1), and $8^{16} \equiv 234 = \gamma^2$, so
    $x_2 = 2$. So $x \equiv 1 + 0 \cdot 3 + 2 \cdot 9 = 19 \pmod{27}$. Joining:
    $x = 11 + 16t$ with $16t \equiv 8 \pmod{27}$, so $t \equiv 8 \cdot 22 =
    176 \equiv 14$ and $x = 11 + 224 = 235$. Check: $5^{235} \bmod 433 = 40$.

??? question "7. In the index calculus example modulo 227, find $\log_2 113$ by the descent, using $113 \cdot 2^2 \equiv 225 = 3^2 \cdot 5^2$."
    $\log_2 113 = 2L_3 + 2L_5 - 2 = 92 + 22 - 2 = 112$. Check: $2^{112} \bmod
    227 = 113$. The parity agrees with the quadratic character: 112 is even,
    and 113 is a square modulo 227, since $113^{113} \bmod 227 = 1$.

??? question "8. Logjam's precomputation for a 512-bit prime took about a week, and each logarithm about 70 seconds. If 10,000 servers share that prime, what is the cost per server? What if each had its own prime?"
    Shared: one week plus $10{,}000 \times 70$ seconds, about 8 days more of
    descent time, so roughly 70 seconds of descent plus about one minute's share
    of the precomputation per server. Separate primes: 10,000 weeks of
    precomputation, nearly 200 years of the same cluster. The sharing makes the
    attack ten thousand times cheaper per victim.

??? question "9. Why does the invalid-curve attack work against code that computes $dQ$ with the standard Weierstrass formulas, and why does checking that $Q$ satisfies the curve equation stop it?"
    The addition and doubling formulas use $a$ but never $b$, so for a point
    off the curve they compute correctly on the curve $y^2 = x^3 + ax + b'$
    through that point, whose order the attacker chose to have small factors.
    The answer $dQ$ then lies in a small subgroup and reveals $d$ modulo its
    order. Checking the equation rejects every point not on the intended curve,
    and with a prime-order curve every valid point other than $O$ has the full
    large order.

??? question "10. A curve over a 256-bit prime field has embedding degree 2. Another has order exactly $p$. A third has prime order of 256 bits and huge embedding degree. Rank them by the best known attack."
    The anomalous curve (order $p$) falls in polynomial time to Smart's
    attack: weakest. The embedding-degree-2 curve reduces by MOV to a logarithm
    in a 512-bit field, which the number field sieve solves with a large but
    feasible effort (Logjam-scale). The third leaves only rho, about $2^{128}$
    steps: the only secure one.

## What you learned

- The discrete logarithm problem asks for $x$ from $g$ and $g^x$; Diffie-Hellman,
  DSA, Schnorr and ElGamal all fall with it. Its difficulty depends on how the
  group is represented, not only on its size.
- Generic methods use only the group operations. Baby-step giant-step meets in
  the middle with a table of $\sqrt q$; Pollard's rho needs the same time and no
  table, and with distinguished points runs on any number of machines. Shoup's
  bound says no generic method beats $\sqrt q$.
- The kangaroo finds a logarithm in an interval of width $w$ in about
  $2\sqrt w$ steps, which is fine for short exponents in prime-order groups and
  fatal when combined with small subgroups.
- Pohlig-Hellman reduces any group to its prime-order pieces; the largest prime
  factor of the order is what counts. Hence safe primes, Schnorr groups and
  prime-order curves.
- Index calculus collects smooth relations, solves for the logarithms of small
  primes modulo $p - 1$ (a prime at a time), and descends to the target. The
  number field sieve does the same with two number fields, in $L_p[1/3, 1.923]$.
  Records: 768 bits (2016), 795 bits (2019), and a trapdoored 1,024-bit prime
  (2017).
- The precomputation depends only on the prime. Logjam broke 512-bit export
  groups with a week of precomputation and 70 seconds per logarithm, and argued
  that a 1,024-bit prime shared by millions of servers was within a nation's
  budget.
- Small-subgroup and invalid-curve attacks make a victim compute in a group the
  attacker chose; validation, prime-order groups and ephemeral keys stop them.
- On good elliptic curves only rho applies, at $0.886\sqrt n$ with the negation
  map; the public records stand at 112 bits for prime-field curves. Curves with
  small embedding degree fall to the MOV and Frey-Rück pairings, and anomalous
  curves to Smart's $p$-adic lift.

## Further reading

- Daniel Shanks, "Class number, a theory of factorization, and genera",
  *Proceedings of Symposia in Pure Mathematics* 20, 1971. Baby-step giant-step.
- John Pollard, "Monte Carlo methods for index computation (mod $p$)",
  *Mathematics of Computation* 32, 1978. Rho and lambda for logarithms.
- Edlyn Teske, "Speeding up Pollard's rho method for computing discrete
  logarithms", ANTS 1998.
- Paul van Oorschot and Michael Wiener, "Parallel collision search with
  cryptanalytic applications", *Journal of Cryptology* 12(1), 1999; and "On
  Diffie-Hellman key agreement with short exponents", EUROCRYPT 1996.
- Steven Galbraith, John Pollard and Raminder Ruprai, "Computing discrete
  logarithms in an interval", *Mathematics of Computation* 82, 2013.
- Stephen Pohlig and Martin Hellman, "An improved algorithm for computing
  logarithms over GF(p) and its cryptographic significance", *IEEE Transactions
  on Information Theory* 24(1), 1978.
- Victor Shoup, "Lower bounds for discrete logarithms and related problems",
  EUROCRYPT 1997. Vassily Nechaev, "Complexity of a determinate algorithm for
  the discrete logarithm", *Mathematical Notes* 55, 1994.
- Leonard Adleman, "A subexponential algorithm for the discrete logarithm
  problem with applications to cryptography", FOCS 1979. Don Coppersmith,
  Andrew Odlyzko and Richard Schroeppel, "Discrete logarithms in GF(p)",
  *Algorithmica* 1, 1986. Andrew Odlyzko, "Discrete logarithms in finite fields
  and their cryptographic significance", EUROCRYPT 1984 (the classic survey).
- Daniel Gordon, "Discrete logarithms in GF(p) using the number field sieve",
  *SIAM Journal on Discrete Mathematics* 6(1), 1993; and "Designing and
  detecting trapdoors for discrete log cryptosystems", CRYPTO 1992. Oliver
  Schirokauer, "Discrete logarithms and local units", *Philosophical
  Transactions of the Royal Society A* 345, 1993. Antoine Joux and Reynald
  Lercier, "Improvements to the general number field sieve for discrete
  logarithms in prime fields", *Mathematics of Computation* 72, 2003.
- Thorsten Kleinjung, Claus Diem, Arjen Lenstra, Christine Priplata and Colin
  Stahlke, "Computation of a 768-bit prime field discrete logarithm",
  EUROCRYPT 2017.
- Fabrice Boudot, Pierrick Gaudry, Aurore Guillevic, Nadia Heninger, Emmanuel
  Thomé and Paul Zimmermann, "Comparing the difficulty of factorization and
  discrete logarithm: a 240-digit experiment", CRYPTO 2020.
- Joshua Fried, Pierrick Gaudry, Nadia Heninger and Emmanuel Thomé, "A kilobit
  hidden SNFS discrete logarithm computation", EUROCRYPT 2017.
- David Adrian and others, "Imperfect forward secrecy: how Diffie-Hellman fails
  in practice", ACM CCS 2015 (weakdh.org).
- Chae Hoon Lim and Pil Joong Lee, "A key recovery attack on discrete log-based
  schemes using a prime order subgroup", CRYPTO 1997. Luke Valenta and others,
  "Measuring small subgroup attacks against Diffie-Hellman", NDSS 2017.
- Ingrid Biehl, Bernd Meyer and Volker Müller, "Differential fault attacks on
  elliptic curve cryptosystems", CRYPTO 2000. Adrian Antipa, Daniel Brown,
  Alfred Menezes, René Struik and Scott Vanstone, "Validation of elliptic curve
  public keys", PKC 2003. Tibor Jager, Jörg Schwenk and Juraj Somorovsky,
  "Practical invalid curve attacks on TLS-ECDH", ESORICS 2015.
- Joppe Bos, Marcelo Kaihara, Thorsten Kleinjung, Arjen Lenstra and Peter
  Montgomery, "Solving a 112-bit prime elliptic curve discrete logarithm problem
  on game consoles using sloppy reduction", *International Journal of Applied
  Cryptography* 2(3), 2012. Daniel Bailey and others, "Breaking ECC2K-130",
  2009. Joppe Bos, Thorsten Kleinjung and Arjen Lenstra, "On the use of the
  negation map in Pollard rho", ANTS 2010.
- Alfred Menezes, Tatsuaki Okamoto and Scott Vanstone, "Reducing elliptic curve
  logarithms to logarithms in a finite field", STOC 1991 and *IEEE Transactions
  on Information Theory* 39(5), 1993. Gerhard Frey and Hans-Georg Rück, "A
  remark concerning m-divisibility and the discrete logarithm in the divisor
  class group of curves", *Mathematics of Computation* 62, 1994. Victor Miller,
  "The Weil pairing, and its efficient calculation", *Journal of Cryptology*
  17(4), 2004.
- Nigel Smart, "The discrete logarithm problem on elliptic curves of trace one",
  *Journal of Cryptology* 12(3), 1999. Igor Semaev, "Evaluation of discrete
  logarithms in a group of p-torsion points of an elliptic curve in
  characteristic p", *Mathematics of Computation* 67, 1998. Takakazu Satoh and
  Kiyomichi Araki, "Fermat quotients and the polynomial time discrete log
  algorithm for anomalous elliptic curves", *Commentarii Mathematici
  Universitatis Sancti Pauli* 47, 1998.
- Taechan Kim and Razvan Barbulescu, "Extended tower number field sieve: a new
  complexity for the medium prime case", CRYPTO 2016. Razvan Barbulescu,
  Pierrick Gaudry, Antoine Joux and Emmanuel Thomé, "A heuristic
  quasi-polynomial algorithm for discrete logarithm in finite fields of small
  characteristic", EUROCRYPT 2014.
- Daniel Bernstein and Tanja Lange, "Computing small discrete logarithms
  faster", INDOCRYPT 2012, and "Non-uniform cracks in the concrete", ASIACRYPT
  2013. Daniel Bernstein and Tanja Lange, SafeCurves (safecurves.cr.yp.to).
- Standards: FIPS 186-5 (2023, digital signatures), SP 800-56A (key establishment
  with discrete-log groups, including public-key validation), SP 800-57 Part 1
  (security strengths), RFC 3526 (MODP groups, 2003) and RFC 7919 (FFDHE groups
  for TLS, 2016).
- Steven Galbraith, *Mathematics of Public Key Cryptography*, Cambridge
  University Press, 2012. Chapters 13 to 15 cover every algorithm in this
  chapter in depth.
