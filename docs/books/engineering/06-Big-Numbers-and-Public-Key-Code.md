# 6. Big Numbers and Public-Key Code

*Public-key cryptography is arithmetic on numbers hundreds or thousands of bits long, and
no processor has an instruction for that. Every RSA signature and every elliptic-curve key
exchange runs on code that someone wrote to break those numbers into machine words, carry
between them, multiply, reduce, and walk a secret exponent or scalar bit by bit. Each of
those steps has failed in the field: a carry dropped once in four billion additions, a
subtraction that happened only for some inputs, a loop that ran shorter for some nonces, a
point that was not on the curve, a key image with a stowaway of order 2. This chapter
builds the arithmetic from the bottom, in standard-library Python, and checks every layer:
multiprecision numbers on 16-bit limbs against Python's own integers, Karatsuba,
Montgomery and Barrett reduction, the Montgomery ladder, X25519 against the test vectors of
RFC 7748, an RSA signer with blinding and a fault check, point validation, a CryptoNote
double spend and its fix, complete addition formulas, fixed-length scalars, and an ECDSA
signer that reproduces RFC 6979. The attacks are told in the Cryptanalysis book; here is
how to write the code so they fail.*

!!! abstract "In this chapter"
    **You will learn:**

    - how big numbers are stored as limbs, and how addition, subtraction and
      multiplication carry between them, with the carry bugs that shipped in OpenSSL;
    - how Karatsuba trades one multiplication for a few additions, and where it pays;
    - how Montgomery multiplication works word by word, how Barrett reduction estimates a
      quotient, and how to do the final subtraction without a timing leak;
    - why square-and-multiply leaks its exponent and how the Montgomery ladder does not;
    - how to write X25519 from RFC 7748 and check it against the RFC's vectors;
    - how base blinding and "verify before release" protect an RSA private key against
      timing and fault attacks;
    - how to validate a received point, what cofactors do, and how a missing subgroup
      check let CryptoNote coins be spent twice;
    - why complete addition formulas remove a class of bugs, and how fixed-length scalars
      defeat the leaks behind Minerva and TPM-Fail;
    - how deterministic nonces (RFC 6979) remove the random generator from signing.

    **You need:** [Chapter 5](05-Constant-Time-Programming.md) (masks, select and swap
    without branches; why Python itself is not constant time). The theory is in the
    Mathematics book: [modular arithmetic, Montgomery and Barrett](../mathematics/03-Modular-Arithmetic.md),
    [powers and exponentiation](../mathematics/04-Powers-and-Primitive-Roots.md) and
    [the elliptic-curve group](../mathematics/12-Elliptic-Curve-Group.md). RSA and
    elliptic curves themselves are in book 1, [Chapter 13](../../book/13-RSA.md) and
    [Chapter 15](../../book/15-Elliptic-Curves.md). The attacks this chapter defends
    against are in Cryptanalysis [Chapter 13](../cryptanalysis/13-Attacks-on-RSA.md),
    [Chapter 14](../cryptanalysis/14-Attacks-on-Signatures-and-Nonces.md) and
    [Chapter 17](../cryptanalysis/17-Side-Channels-the-Attackers-View.md).

    **Levels:** §6.1 and §6.2 are for beginners, §6.3 to §6.12 are intermediate,
    §6.13 is expert.

## 6.1 The problem

*Level: beginner.*

In the spring of 2003 David Brumley and Dan Boneh, at Stanford, set up an ordinary web
server running Apache with OpenSSL 0.9.7 and a 1024-bit RSA key. From another machine on
the campus network they sent it carefully chosen messages during the TLS handshake and
timed how long it took to answer. They did not break RSA, and they did not exploit a
memory bug. They measured, to a few microseconds, how long the server's arithmetic took.
After about a million queries, about two hours of work, they had the server's private
key.

The leak was in code that every textbook describes as correct. OpenSSL multiplied numbers
modulo a secret prime $p$ using Montgomery's method, which ends with a subtraction that
happens for some inputs and not others. It chose between two multiplication routines
depending on how many machine words its operands had. Both choices depended on the input
modulo $p$. As the attacker's chosen value crept up toward $p$, the server's work changed
in a way a clock could see, and a binary search turned that into the bits of $p$. OpenSSL
had a defense, RSA blinding, but it was an option that the common applications did not
switch on. Within weeks it was on by default.

That is the shape of almost every failure in public-key code. The mathematics of RSA and
of elliptic curves has held up for decades (Cryptanalysis
[Chapter 13](../cryptanalysis/13-Attacks-on-RSA.md) is the record of attacks on RSA that
needed something extra). The failures are in the layers of code underneath, shown in
Figure 6.1: limbs that drop a carry on rare inputs, reductions whose correction step is a
branch, point formulas with special cases and points that are not on the curve, loops
whose work depends on secret bits or secret lengths, and protocol operations that release
a faulty result or reuse a nonce.

<figure class="mars-fig">
<svg viewBox="0 0 640 320" width="640" role="img" aria-label="The five layers of public-key code, from limbs at the bottom to the protocol operation at the top, with the kind of failure that has hit each one" fill="currentColor" font-size="14">
<rect x="20" y="16" width="230" height="48" rx="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="135" y="36" text-anchor="middle" font-weight="bold">Protocol operation</text>
<text x="135" y="55" text-anchor="middle" font-size="12">sign, decrypt, key exchange</text>
<rect x="20" y="76" width="230" height="48" rx="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="135" y="96" text-anchor="middle" font-weight="bold">Exponent or scalar loop</text>
<text x="135" y="115" text-anchor="middle" font-size="12">ladder, square-and-multiply</text>
<rect x="20" y="136" width="230" height="48" rx="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="135" y="156" text-anchor="middle" font-weight="bold">Group</text>
<text x="135" y="175" text-anchor="middle" font-size="12">point addition and doubling</text>
<rect x="20" y="196" width="230" height="48" rx="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="135" y="216" text-anchor="middle" font-weight="bold">Field</text>
<text x="135" y="235" text-anchor="middle" font-size="12">multiply and reduce mod p</text>
<rect x="20" y="256" width="230" height="48" rx="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="135" y="276" text-anchor="middle" font-weight="bold">Limbs</text>
<text x="135" y="295" text-anchor="middle" font-size="12">add with carry, multiply words</text>
<line x1="250" y1="40" x2="290" y2="40" stroke="currentColor" stroke-width="1.2" stroke-dasharray="4 3"/>
<line x1="250" y1="100" x2="290" y2="100" stroke="currentColor" stroke-width="1.2" stroke-dasharray="4 3"/>
<line x1="250" y1="160" x2="290" y2="160" stroke="currentColor" stroke-width="1.2" stroke-dasharray="4 3"/>
<line x1="250" y1="220" x2="290" y2="220" stroke="currentColor" stroke-width="1.2" stroke-dasharray="4 3"/>
<line x1="250" y1="280" x2="290" y2="280" stroke="currentColor" stroke-width="1.2" stroke-dasharray="4 3"/>
<text x="298" y="36">CRT faults (1996, still in 2023)</text>
<text x="298" y="54" font-size="12" opacity="0.8">repeated nonces: PS3 (2010)</text>
<text x="298" y="96">secret-dependent steps and lengths</text>
<text x="298" y="114" font-size="12" opacity="0.8">Minerva, TPM-Fail (2019)</text>
<text x="298" y="156">points off the curve, small subgroups</text>
<text x="298" y="174" font-size="12" opacity="0.8">TLS-ECDH (2015), Bluetooth (2018), CryptoNote (2017)</text>
<text x="298" y="216">a correction that happens or not</text>
<text x="298" y="234" font-size="12" opacity="0.8">Schindler (2000), Brumley and Boneh (2003)</text>
<text x="298" y="276">a carry dropped on rare inputs</text>
<text x="298" y="294" font-size="12" opacity="0.8">OpenSSL (2011, 2015, 2016, 2017)</text>
</svg>
<figcaption>Figure 6.1. The layers of public-key code and the failures that have hit each one. Every layer sits on the one below, so a wrong carry at the bottom becomes a wrong point, and a wrong point becomes a leaked key at the top.</figcaption>
</figure>

This chapter climbs the stack from the bottom. Each section builds one layer in Python,
checks it against something independent (Python's own integers, `pow`, an RFC's test
vectors), breaks it the way it was broken in practice, and fixes it.

One warning holds for the whole chapter. Python's integers are themselves big numbers,
implemented in C with 30-bit digits, and their running time depends on their size and,
for some operations, their value. Nothing written in Python is constant time
([§5.9](05-Constant-Time-Programming.md) explains why). The code here is written *in the
shape* of constant-time code, with masks instead of branches and fixed loop counts, so
that you can see what the C or assembly of a real library does, and so that the operation
counts, which is what a timing attacker measures, come out right. Where the code uses a
Python feature that a real library would not, such as `pow` for an inverse, a comment
says so. For production, use a library whose arithmetic was written for this
([Chapter 17](17-Choosing-Testing-and-Verifying.md) says how to choose one).

!!! note "Life story: the remote timing attack on OpenSSL"
    **Born:** 2003, David Brumley and Dan Boneh, "Remote Timing Attacks are Practical"
    (USENIX Security 2003), building on Paul Kocher's timing attacks (1996) and Werner
    Schindler's analysis of Montgomery's extra reduction (2000) · **Purpose:** to show
    that timing leaks in RSA decryption can be measured across a network, not only on the
    same machine · **Helped:** made RSA blinding the default in OpenSSL (versions 0.9.7b
    and 0.9.6j, 2003) and in other libraries; made "the network is too noisy" an
    argument no one uses any more · **Status:** the attack is stopped by blinding; its
    successors (cache attacks, Minerva, TPM-Fail) keep finding code where the same kind
    of leak survives

## 6.2 Limbs and carries

*Level: beginner.*

A 2048-bit RSA modulus does not fit in a register. A 64-bit processor holds it as 32
**limbs**, words of 64 bits each; a 32-bit microcontroller needs 64 limbs; an 8- or
16-bit smart-card core needs hundreds. The number is

$$
x = \sum_{i=0}^{n-1} x_i \, B^i, \qquad B = 2^w, \quad 0 \le x_i < B,
$$

with $w$ the limb size in bits. Almost every library stores the limbs **little-endian**,
$x_0$ first, because carries move from low limbs to high ones and loops run upward.

This chapter uses $w = 16$. That is what a 16-bit core would use, and it keeps the
products of two limbs within 32 bits, small enough to read. The algorithms are the same
for 32 and 64 bits; only $B$ changes.

### Adding and subtracting

Adding two limb arrays is the schoolroom method in base $B$: add the limbs and the carry
from below, keep the low $w$ bits, pass the rest up. The sum of two limbs and a carry is
at most $2(B - 1) + 1 = 2B - 1$, so the carry is always 0 or 1, and the sum fits in
$w + 1$ bits. Processors have an add-with-carry instruction (`adc` on x86, `adcs` on Arm)
for exactly this.

*By hand.* Add $x = \texttt{0x0001FFFFFFFF}$ and $y = 1$ with 16-bit limbs. Little-endian,
$x = [\texttt{FFFF}, \texttt{FFFF}, \texttt{0001}]$ and $y = [\texttt{0001}, 0, 0]$.

<div class="mars-steps" markdown>

1. Limb 0: $\texttt{FFFF} + \texttt{0001} = \texttt{1 0000}$. Keep $\texttt{0000}$, carry 1.
2. Limb 1: $\texttt{FFFF} + 0 + 1 = \texttt{1 0000}$. Keep $\texttt{0000}$, carry 1.
3. Limb 2: $\texttt{0001} + 0 + 1 = \texttt{0002}$. Keep it, carry 0.
4. The sum is $[\texttt{0000}, \texttt{0000}, \texttt{0002}] = \texttt{0x000200000000}$.

</div>

One carry rippled through two limbs. That is the case that matters: a long run of
all-ones limbs makes one carry travel the whole length of the number.

Subtraction is the same with a **borrow**: subtract the limbs and the borrow from below;
if the result is negative, add $B$ and borrow 1 from the next limb. The borrow out of the
top limb says whether $x < y$, which is how libraries compare big numbers without a
branch: subtract, and look at the final borrow.

### Multiplying

Schoolbook multiplication multiplies every limb of $x$ by every limb of $y$ and adds each
product into the right column. For $n$-limb numbers that is $n^2$ limb products. The step
at the heart of it computes

$$
t = r_{i+j} + x_i \, y_j + c ,
$$

where $r_{i+j}$ is the partial result in that column and $c$ the carry from the previous
column. Each of the three terms is less than $B$ (or less than $B^2$ for the product), and

$$
(B-1) + (B-1)^2 + (B-1) = B^2 - 1,
$$

so $t$ always fits in exactly two limbs. That identity is why a $w \times w \to 2w$-bit
multiply instruction is all a big-number library needs: the low half of $t$ goes into the
column, the high half becomes the next carry.

*By hand.* Multiply $x = \texttt{0x3FFFF}$ by $y = \texttt{0x20005}$, which are
$[\texttt{FFFF}, \texttt{0003}]$ and $[\texttt{0005}, \texttt{0002}]$.

<div class="mars-steps" markdown>

1. Row $i = 0$, $x_0 = \texttt{FFFF}$. Column 0: $\texttt{FFFF} \cdot 5 = \texttt{4 FFFB}$;
   keep $\texttt{FFFB}$, carry 4. Column 1: $\texttt{FFFF} \cdot 2 + 4 = \texttt{2 0002}$;
   keep $\texttt{0002}$, carry 2, which goes into column 2.
2. Row $i = 1$, $x_1 = 3$. Column 1: $\texttt{0002} + 3 \cdot 5 = \texttt{0011}$, carry 0.
   Column 2: $\texttt{0002} + 3 \cdot 2 = \texttt{0008}$, carry 0, so column 3 is 0.
3. The product is $[\texttt{FFFB}, \texttt{0011}, \texttt{0008}, \texttt{0000}]$, that is
   $\texttt{0x80011FFFB} = 34{,}360{,}918{,}011$. Check: $262{,}143 \cdot 131{,}077 =
   34{,}360{,}918{,}011$.

</div>

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="Schoolbook multiplication of two three-limb numbers: nine limb products, each two limbs wide, placed in shifted rows and added column by column with carries" fill="currentColor" font-size="14">
<text x="20" y="28" font-weight="bold">x = [x0, x1, x2], y = [y0, y1, y2]: each product is two limbs wide</text>
<g fill="none" stroke="currentColor" stroke-width="1.3">
<rect x="380" y="50" width="120" height="30" rx="3"/>
<rect x="320" y="90" width="120" height="30" rx="3"/>
<rect x="260" y="130" width="120" height="30" rx="3"/>
</g>
<g fill="none" stroke="currentColor" stroke-width="1.3" opacity="0.75">
<rect x="320" y="50" width="56" height="30" rx="3" stroke-dasharray="4 3"/>
<rect x="260" y="90" width="56" height="30" rx="3" stroke-dasharray="4 3"/>
<rect x="200" y="130" width="56" height="30" rx="3" stroke-dasharray="4 3"/>
</g>
<text x="440" y="70" text-anchor="middle">x0·y0</text>
<text x="380" y="110" text-anchor="middle">x0·y1 (row 0)</text>
<text x="320" y="150" text-anchor="middle">x0·y2</text>
<text x="348" y="70" text-anchor="middle" font-size="12">carry</text>
<text x="288" y="110" text-anchor="middle" font-size="12">carry</text>
<text x="228" y="150" text-anchor="middle" font-size="12">carry</text>
<text x="520" y="110" font-size="13">row 0: x0 times each yj,</text>
<text x="520" y="128" font-size="13">shifted one limb each</text>
<text x="20" y="190" font-size="13">rows 1 and 2 (x1·yj and x2·yj) are added in the same way, one and two limbs further left</text>
<line x1="80" y1="205" x2="560" y2="205" stroke="currentColor" stroke-width="1.4"/>
<g fill="none" stroke="currentColor" stroke-width="1.3">
<rect x="140" y="214" width="60" height="28" rx="3"/>
<rect x="200" y="214" width="60" height="28" rx="3"/>
<rect x="260" y="214" width="60" height="28" rx="3"/>
<rect x="320" y="214" width="60" height="28" rx="3"/>
<rect x="380" y="214" width="60" height="28" rx="3"/>
<rect x="440" y="214" width="60" height="28" rx="3"/>
</g>
<text x="170" y="233" text-anchor="middle">r5</text>
<text x="230" y="233" text-anchor="middle">r4</text>
<text x="290" y="233" text-anchor="middle">r3</text>
<text x="350" y="233" text-anchor="middle">r2</text>
<text x="410" y="233" text-anchor="middle">r1</text>
<text x="470" y="233" text-anchor="middle">r0</text>
<text x="520" y="233" font-size="13">6 limbs</text>
</svg>
<figcaption>Figure 6.2. Schoolbook multiplication on limbs. Each limb product <i>x<sub>i</sub>y<sub>j</sub></i> is two limbs wide and lands in columns <i>i</i> + <i>j</i> and <i>i</i> + <i>j</i> + 1; the high half travels up as the carry. Three-limb numbers need nine products and give a six-limb result.</figcaption>
</figure>

### Code it

The three operations on 16-bit limbs, checked against Python's integers on 2,000 random
inputs of random lengths:

```python
import random

W = 16                       # bits per limb, as on a 16-bit microcontroller
MASK = (1 << W) - 1

def to_limbs(x, n):          # little-endian: limb 0 holds the lowest 16 bits
    return [(x >> (W * i)) & MASK for i in range(n)]

def from_limbs(a):
    return sum(limb << (W * i) for i, limb in enumerate(a))

def add(a, b):               # same length; returns (sum limbs, carry out)
    out, carry = [], 0
    for x, y in zip(a, b):
        s = x + y + carry    # at most 2 * (2^16 - 1) + 1: fits in 17 bits
        out.append(s & MASK)
        carry = s >> W
    return out, carry

def sub(a, b):               # returns (difference limbs, borrow out)
    out, borrow = [], 0
    for x, y in zip(a, b):
        d = x - y - borrow
        out.append(d & MASK)     # wraps modulo 2^16, as the hardware does
        borrow = (d >> W) & 1    # 1 when the limb went below zero
    return out, borrow

def mul(a, b):               # schoolbook: every limb of a times every limb of b
    out = [0] * (len(a) + len(b))
    for i, x in enumerate(a):
        carry = 0
        for j, y in enumerate(b):
            t = out[i + j] + x * y + carry   # < 2^32: one double-width register
            out[i + j] = t & MASK
            carry = t >> W
        out[i + len(b)] = carry
    return out

rng = random.Random(7)
for trial in range(2000):
    n = rng.randrange(1, 20)
    x, y = rng.getrandbits(W * n), rng.getrandbits(W * n)
    a, b = to_limbs(x, n), to_limbs(y, n)
    s, c = add(a, b)
    assert from_limbs(s) + (c << (W * n)) == x + y
    d, br = sub(a, b)
    assert from_limbs(d) - (br << (W * n)) == x - y
    assert from_limbs(mul(a, b)) == x * y
print("2000 random sizes: add, sub and mul agree with Python ints")
print(to_limbs(0xFFFF_FFFF, 2), add(to_limbs(0xFFFF_FFFF, 2), to_limbs(1, 2)))
```

```text
2000 random sizes: add, sub and mul agree with Python ints
[65535, 65535] ([0, 0], 1)
```

Notice what the loops do *not* do. They never stop early when the carry becomes zero, and
they never skip a limb that is zero. A number's length in limbs is treated as public (it
is the key size), and every limb is processed the same way whatever its value. Real
libraries go one step further and keep secret numbers at a fixed length, padded with zero
limbs, so that even "how many limbs is this value after reduction?" cannot leak. That was
one of the two leaks Brumley and Boneh measured: OpenSSL picked its multiplication routine
by the operands' current lengths in words.

### Break it: the carry that is almost never there

Carries are the classic big-number bug, because the case that needs them is rare. A carry
out of a 16-bit limb sum of random limbs happens about half the time, but a carry that
must travel *two* limbs needs the next limb to be exactly $\texttt{FFFF}$, which happens
once in 65,536 tries; with 64-bit limbs, once in $2^{64}$. Code that handles the first
carry and forgets the second passes every random test anyone will ever run.

Here is such an adder. It is the kind of shortcut an optimizer writes by hand: compute all
the limb sums at once, then add each limb's carry into the limb above in one pass, without
letting that addition carry further.

```python
import random

W, MASK = 16, 0xFFFF

def to_limbs(x, n):
    return [(x >> (W * i)) & MASK for i in range(n)]

def from_limbs(a):
    return sum(limb << (W * i) for i, limb in enumerate(a))

def add_fast(a, b):          # BROKEN: each carry moves one limb up, and no further
    sums = [x + y for x, y in zip(a, b)] + [0]
    out = [s & MASK for s in sums]
    for i in range(1, len(out)):
        out[i] = (out[i] + (sums[i - 1] >> W)) & MASK   # the carry out of this add is lost
    return out

def add(a, b):               # correct: the carry runs through every limb
    out, carry = [], 0
    for x, y in zip(a + [0], b + [0]):
        s = x + y + carry
        out.append(s & MASK)
        carry = s >> W
    return out

rng = random.Random(2011)
bad = 0
for _ in range(1000):
    x, y = rng.getrandbits(128), rng.getrandbits(128)
    if from_limbs(add_fast(to_limbs(x, 8), to_limbs(y, 8))) != x + y:
        bad += 1
print("random tests that fail:", bad, "of 1000")

edges = [(2**128 - 1, 1), (2**64 - 1, 1), (0xFFFF0001, 0xFFFF), (2**127, 2**127)]
for x, y in edges:
    got = from_limbs(add_fast(to_limbs(x, 8), to_limbs(y, 8)))
    print(hex(x), "+", hex(y), "fast:", hex(got), "right:", got == x + y,
          "| fixed:", from_limbs(add(to_limbs(x, 8), to_limbs(y, 8))) == x + y)
```

```text
random tests that fail: 0 of 1000
0xffffffffffffffffffffffffffffffff + 0x1 fast: 0xffffffffffffffffffffffff00000000 right: False | fixed: True
0xffffffffffffffff + 0x1 fast: 0xffffffff00000000 right: False | fixed: True
0xffff0001 + 0xffff fast: 0x0 right: False | fixed: True
0x80000000000000000000000000000000 + 0x80000000000000000000000000000000 fast: 0x100000000000000000000000000000000 right: True | fixed: True
```

A thousand random tests pass. The first three hand-picked edge cases fail at once. That
is the whole lesson of testing arithmetic: random inputs test the common path, and the
bugs live on the paths that need runs of all-ones limbs, values just below the modulus,
and the largest possible carries. Good test suites (Wycheproof, Cryptofuzz,
[Chapter 17](17-Choosing-Testing-and-Verifying.md)) build such inputs on purpose.

**In the real world.** This is not a toy failure. OpenSSL 0.9.8g had a fast reduction
routine for the NIST P-256 prime that, on 32-bit builds, mishandled a carry in extremely
rare cases. In 2011 Billy Bob Brumley, Manuel Barbosa, Dan Page and Frederik Vercauteren
turned it into a **bug attack**: they sent a TLS server elliptic-curve points chosen so
that the bug would or would not trigger depending on bits of the server's static ECDH key,
watched whether the handshake succeeded, and recovered the whole key in 633 queries. It
was the first bug attack carried out against a real system. Between 2015 and 2017
OpenSSL published five more advisories for carry and overflow bugs in its hand-written
x86-64 assembly for Montgomery multiplication, squaring and exponentiation (listed in the
card below). Several were found by OSS-Fuzz, Google's continuous fuzzing service, running
a fuzzer that checks OpenSSL's fast routines against slower, simpler ones. Most were
judged hard to exploit; for Diffie-Hellman, the advisory for CVE-2017-3736 rated an attack
"just feasible (although very difficult)".

!!! note "Life story: the carry bugs in OpenSSL"
    **Born:** 2011 (P-256 reduction in OpenSSL 0.9.8g, CVE-2011-4354; key recovery by
    Brumley, Barbosa, Page and Vercauteren, CT-RSA 2012), then a series in the x86-64
    assembly from 2015 to 2017 (CVE-2015-3193, CVE-2016-7055, CVE-2017-3732,
    CVE-2017-3736, CVE-2017-3738) · **Purpose:** none; they were speed-ups that dropped
    a carry or overflowed on inputs too rare for random tests · **Helped:** made
    differential fuzzing of big-number code against a second implementation routine
    (OSS-Fuzz, Cryptofuzz), and pushed libraries toward formally verified field arithmetic
    (Fiat-Crypto in BoringSSL, HACL* in NSS) · **Status:** all fixed; the pattern recurs
    wherever arithmetic is hand-optimized and tested only on random inputs

**What to do.**

- Store secret numbers at a fixed number of limbs and process every limb, every time.
  Never let a loop end early on a zero carry or a short value.
- Test arithmetic on edge cases on purpose: all-ones limbs, values just below and above
  the modulus, the largest products. Compare against an independent implementation (here,
  Python's integers) on millions of such inputs.
- Do not hand-write assembly for big-number arithmetic unless you will also fuzz it
  differentially and, ideally, verify it. Use a library that did.

## 6.3 Multiplying faster: Karatsuba

*Level: intermediate.*

In 1960 Andrey Kolmogorov, the leading Soviet mathematician of his day, ran a seminar at
Moscow State University on the complexity of computation, and in it he conjectured that
multiplying two $n$-digit numbers needs on the order of $n^2$ digit operations: the
schoolbook method, in other words, could not be beaten by more than a constant. Within a
week, a 23-year-old student in the seminar, Anatoly Karatsuba, found a way to do it with
about $n^{1.585}$. Kolmogorov wrote the method up himself and published it in 1962 under
the names of Karatsuba and Yuri Ofman, and the student found out when he saw the reprints.
It was the first algorithm to multiply faster than the schoolroom, and the start of a line
of work that reached $n \log n$ in 2019.

### The trick

Split each number into a high and a low half of $h$ limbs, $x = x_1 B^h + x_0$ and
$y = y_1 B^h + y_0$. Then

$$
xy = x_1 y_1 \, B^{2h} + (x_1 y_0 + x_0 y_1) \, B^h + x_0 y_0 ,
$$

which looks like four half-size products. Karatsuba's observation is that the middle
coefficient can be had from one product and two you already have:

$$
x_1 y_0 + x_0 y_1 = (x_0 + x_1)(y_0 + y_1) - x_0 y_0 - x_1 y_1 .
$$

So three half-size products and a few additions replace four products. Applied
recursively, the cost obeys $T(n) = 3\,T(n/2) + O(n)$, which gives
$T(n) = O(n^{\log_2 3}) \approx O(n^{1.585})$.

*By hand.* Multiply $1234 \times 5678$ in base 100, so $x_1 = 12$, $x_0 = 34$, $y_1 = 56$,
$y_0 = 78$.

<div class="mars-steps" markdown>

1. $z_2 = x_1 y_1 = 12 \cdot 56 = 672$ and $z_0 = x_0 y_0 = 34 \cdot 78 = 2652$.
2. $z_1 = (12 + 34)(56 + 78) - z_2 - z_0 = 46 \cdot 134 - 672 - 2652 = 6164 - 3324 = 2840$.
3. $xy = 672 \cdot 100^2 + 2840 \cdot 100 + 2652 = 6{,}720{,}000 + 284{,}000 + 2{,}652 =
   7{,}006{,}652$, which is $1234 \times 5678$.

</div>

Three two-digit products instead of four. The sums $x_0 + x_1 = 46$ and $y_0 + y_1 = 134$
show the one wrinkle: a sum of two halves can be one digit (or one bit) longer than a
half, so the middle product is slightly bigger than the other two.

<figure class="mars-fig">
<svg viewBox="0 0 640 210" width="640" role="img" aria-label="Schoolbook needs four half-size products for a two-part split; Karatsuba needs three, computing the middle term from the product of the sums minus the outer products" fill="currentColor" font-size="14">
<text x="150" y="24" text-anchor="middle" font-weight="bold">schoolbook: 4 products</text>
<text x="480" y="24" text-anchor="middle" font-weight="bold">Karatsuba: 3 products</text>
<g fill="none" stroke="currentColor" stroke-width="1.3">
<rect x="40" y="44" width="100" height="34" rx="4"/>
<rect x="160" y="44" width="100" height="34" rx="4"/>
<rect x="40" y="92" width="100" height="34" rx="4"/>
<rect x="160" y="92" width="100" height="34" rx="4"/>
<rect x="360" y="44" width="110" height="34" rx="4"/>
<rect x="490" y="44" width="110" height="34" rx="4"/>
<rect x="390" y="104" width="180" height="34" rx="4" stroke-width="2"/>
</g>
<text x="90" y="66" text-anchor="middle">x1·y1</text>
<text x="210" y="66" text-anchor="middle">x0·y0</text>
<text x="90" y="114" text-anchor="middle">x1·y0</text>
<text x="210" y="114" text-anchor="middle">x0·y1</text>
<text x="415" y="66" text-anchor="middle">z2 = x1·y1</text>
<text x="545" y="66" text-anchor="middle">z0 = x0·y0</text>
<text x="480" y="126" text-anchor="middle">(x0 + x1)·(y0 + y1)</text>
<text x="480" y="166" text-anchor="middle" font-size="13">z1 = that product − z2 − z0</text>
<text x="150" y="160" text-anchor="middle" font-size="13">middle term = x1·y0 + x0·y1</text>
<text x="320" y="198" text-anchor="middle" font-size="13">result = z2·B^2h + z1·B^h + z0, the same in both</text>
</svg>
<figcaption>Figure 6.3. One level of Karatsuba. The two cross products are never computed; their sum comes out of one product of sums, from which the outer products are subtracted. Recursing on each of the three products gives the <i>n</i><sup>1.585</sup> cost.</figcaption>
</figure>

### Code it

Karatsuba on 16-bit limbs, falling back to schoolbook below a cutoff, with a counter for
the limb products each method does. Every result is checked against Python's own product:

```python
import random, time

W = 16
count = 0                     # limb-by-limb multiplications done

def schoolbook(x, y, n):      # n limbs each; counts the n * n small products
    global count
    out = 0
    for i in range(n):
        xi = (x >> (W * i)) & 0xFFFF
        for j in range(n):
            out += (xi * ((y >> (W * j)) & 0xFFFF)) << (W * (i + j))
            count += 1
    return out

def karatsuba(x, y, n, cutoff=4):
    if n <= cutoff:
        return schoolbook(x, y, n)
    h = n // 2                                # split each number into high and low halves
    mask = (1 << (W * h)) - 1
    x0, x1 = x & mask, x >> (W * h)
    y0, y1 = y & mask, y >> (W * h)
    m = n - h + 1                             # the sums can be one bit longer: give them a limb
    z0 = karatsuba(x0, y0, h, cutoff)
    z2 = karatsuba(x1, y1, n - h, cutoff)
    z1 = karatsuba(x0 + x1, y0 + y1, m, cutoff) - z0 - z2
    return z0 + (z1 << (W * h)) + (z2 << (2 * W * h))

rng = random.Random(1962)
for n in (8, 16, 32, 64, 128):
    x, y = rng.getrandbits(W * n), rng.getrandbits(W * n)
    count = 0
    assert schoolbook(x, y, n) == x * y
    school = count
    count = 0
    assert karatsuba(x, y, n) == x * y
    print(f"{n:4} limbs ({W * n:5} bits): schoolbook {school:6}  Karatsuba {count:6}  ratio {count / school:.2f}")
```

```text
   8 limbs (  128 bits): schoolbook     64  Karatsuba     61  ratio 0.95
  16 limbs (  256 bits): schoolbook    256  Karatsuba    201  ratio 0.79
  32 limbs (  512 bits): schoolbook   1024  Karatsuba    634  ratio 0.62
  64 limbs ( 1024 bits): schoolbook   4096  Karatsuba   1951  ratio 0.48
 128 limbs ( 2048 bits): schoolbook  16384  Karatsuba   5933  ratio 0.36
```

For 2048-bit numbers on 16-bit limbs, Karatsuba does about a third of the limb products.
The counter leaves out the extra additions and subtractions, and the bookkeeping, which
is why the crossover in practice sits well above the cutoff of 4 used here. GMP measures
its thresholds on each processor when it is built, and on 64-bit machines the switch to
Karatsuba typically comes at a few dozen limbs. For cryptographic sizes on 64-bit
processors (4 limbs for a 256-bit field element, 16 for each half of a 2048-bit RSA key
in CRT form, 32 for a full 2048-bit number) that means elliptic-curve code almost always
uses schoolbook or a hand-scheduled product, and RSA code uses one or two levels of
Karatsuba at most.

### What it means for constant time

Karatsuba's control flow depends only on the sizes, which are public, so the recursion
itself leaks nothing. Two details can leak:

- **The sizes must be fixed.** OpenSSL's choice of routine in 2003 depended on whether the
  two operands had the same number of words, and after reduction modulo a secret prime
  that number depended on the secret. Pad secret operands to a fixed length and the choice
  disappears.
- **The sign in the subtractive form.** Many implementations compute the middle term as
  $x_1 y_1 + x_0 y_0 - (x_1 - x_0)(y_1 - y_0)$, which keeps the operands half-size
  instead of half-size plus one bit. The differences can be negative, and a branch on
  their signs is a branch on the data. Constant-time code takes absolute values with masks
  and fixes the sign of the product with a mask too, exactly as
  [§5.4](05-Constant-Time-Programming.md) selects without branching.

!!! note "Life story: Karatsuba multiplication"
    **Born:** 1960, Anatoly Karatsuba, a student in Kolmogorov's seminar at Moscow State
    University; published 1962 as "Multiplication of Many-Digital Numbers by Automatic
    Computers" (Karatsuba and Ofman, *Doklady Akademii Nauk SSSR*) · **Purpose:** to
    refute Kolmogorov's conjecture that multiplication needs $n^2$ steps · **Helped:**
    every big-number library (GMP, OpenSSL's BN, Java's BigInteger), and the line of
    faster methods after it: Toom-Cook (1963), Schönhage-Strassen (1971), and Harvey and
    van der Hoeven's $n \log n$ algorithm (2019) · **Status:** current, used above a
    tuned threshold; below it, schoolbook wins

**What to do.**

- Treat the choice of multiplication algorithm as a function of public sizes only, and
  keep secret operands padded to a fixed length.
- In the subtractive form, handle signs with masks.
- Do not chase asymptotics at cryptographic sizes: measure. For curve arithmetic a
  carefully scheduled schoolbook product usually wins.

## 6.4 Reducing without dividing: Montgomery and Barrett

*Level: intermediate.*

A product modulo $N$ is up to twice as long as $N$ and must be reduced. Long division is
slow, and its trial quotients depend on the data, so libraries use Peter Montgomery's
method (1985) or Paul Barrett's (1986). The Mathematics book derives both on whole numbers
([§3.8 there](../mathematics/03-Modular-Arithmetic.md)); here they are built on limbs, as
a library builds them, with the final step done without a branch.

### Montgomery, one word at a time

Recall the idea. With $N$ odd and $R = B^n > N$, numbers are kept in **Montgomery form**
$\bar a = aR \bmod N$, and the operation is

$$
\text{MontMul}(\bar a, \bar b) = \bar a \, \bar b \, R^{-1} \bmod N = \overline{ab}.
$$

Dividing by $R$ is a shift of $n$ limbs, as long as the number is a multiple of $R$. The
whole-number version adds the multiple $mN$ that makes the product divisible by $R$ in one
go. A library does it one limb at a time, which needs only the constant

$$
n_0' = -N^{-1} \bmod B ,
$$

one limb, computed from the lowest limb of $N$. At each of $n$ steps it adds
$a \cdot b_i$ to a running total $t$, picks the one-limb $m = t_0 \, n_0' \bmod B$ that
makes $t + mN$ end in a zero limb, adds $mN$, and shifts $t$ down one limb. After $n$
steps it has divided by $B^n = R$. This is the **CIOS** method (coarsely integrated
operand scanning) named in Çetin Koç, Tolga Acar and Burton Kaliski's 1996 survey of the
variants. The running total stays below $2N$, so one final conditional subtraction of $N$
finishes the job.

*By hand,* in base 10, so that every step is visible: $N = 97$, two digits, $R = 100$.
Since $97 \equiv 7 \pmod{10}$ and $7 \cdot 3 = 21 \equiv 1$, $N^{-1} \equiv 3$ and
$n_0' = -3 \bmod 10 = 7$. Compute $\text{MontMul}(45, 73)$ with $a = 45$ and the digits of
$b$ taken low first, $b_0 = 3$, $b_1 = 7$.

<div class="mars-steps" markdown>

1. Step 0: $t = 0 + 45 \cdot 3 = 135$. $m = 5 \cdot 7 \bmod 10 = 5$, chosen so that
   $5 + 5 \cdot 7 = 40$ ends in 0. $t + 5 \cdot 97 = 135 + 485 = 620$; shift: $t = 62$.
2. Step 1: $t = 62 + 45 \cdot 7 = 377$. $m = 7 \cdot 7 \bmod 10 = 9$ ($7 + 9 \cdot 7 = 70$).
   $t + 9 \cdot 97 = 377 + 873 = 1250$; shift: $t = 125$.
3. $125 \ge 97$, so subtract: $t = 28$.
4. Check: $45 \cdot 73 = 3285 \equiv 84 \pmod{97}$, and $100^{-1} \equiv 65 \pmod{97}$
   (since $3 \cdot 65 = 195 = 2 \cdot 97 + 1$), so $84 \cdot 65 = 5460 \equiv 28$.

</div>

Step 3 is the one this section is about. For these inputs the subtraction was needed; for
others it is not. Whether it happens depends on the operands and on $N$.

**Code it.** The word-by-word method on 16-bit limbs. The final subtraction is always
computed, and the result is chosen by a mask built from the borrow, the select of
[§5.4](05-Constant-Time-Programming.md):

```python
import random

W, MASK = 16, 0xFFFF

def to_limbs(x, n):
    return [(x >> (W * i)) & MASK for i in range(n)]

def from_limbs(a):
    return sum(limb << (W * i) for i, limb in enumerate(a))

def select(flag, a, b):       # flag 1 -> a, flag 0 -> b, with masks instead of a branch
    m = (-flag) & MASK
    return [(x & m) | (y & ~m & MASK) for x, y in zip(a, b)]

def mont_mul(a, b, N, n0):    # a * b / 2^(16n) mod N, word by word (CIOS)
    n = len(N)
    t = [0] * (n + 2)
    for i in range(n):
        c = 0
        for j in range(n):                    # t += a * b[i]
            s = t[j] + a[j] * b[i] + c
            t[j], c = s & MASK, s >> W
        s = t[n] + c
        t[n], t[n + 1] = s & MASK, s >> W
        m = (t[0] * n0) & MASK                # chosen so the low limb becomes zero
        c = (t[0] + m * N[0]) >> W
        for j in range(1, n):                 # t = (t + m * N) / 2^16
            s = t[j] + m * N[j] + c
            t[j - 1], c = s & MASK, s >> W
        s = t[n] + c
        t[n - 1], c = s & MASK, s >> W
        t[n] = t[n + 1] + c
    t = t[:n + 1]                             # now t < 2N
    d, borrow = [], 0                         # d = t - N, always computed
    for x, y in zip(t, N + [0]):
        v = x - y - borrow
        d.append(v & MASK)
        borrow = (v >> W) & 1
    return select(borrow, t, d)[:n]           # borrow means t < N: keep t

rng = random.Random(1985)
for trial in range(300):
    n = rng.randrange(1, 12)
    N = rng.getrandbits(W * n) | 1 | (1 << (W * n - 1))   # odd, full length
    n0 = (-pow(N, -1, 1 << W)) & MASK                     # -N^-1 mod 2^16, from the low limb only
    a, b = rng.randrange(N), rng.randrange(N)
    got = from_limbs(mont_mul(to_limbs(a, n), to_limbs(b, n), to_limbs(N, n), n0))
    assert got == a * b * pow(2, -W * n, N) % N
print("300 random moduli: word-by-word Montgomery agrees with a*b*R^-1 mod N")
print("n0 for N = 97:", (-pow(97, -1, 1 << W)) & MASK)
```

```text
300 random moduli: word-by-word Montgomery agrees with a*b*R^-1 mod N
n0 for N = 97: 23647
```

The check, $\bar a \bar b R^{-1} \bmod N$, is computed by Python's integers and its
built-in modular inverse, an implementation that shares no code with the one under test.

### Barrett, one estimate at a time

Barrett reduction keeps numbers in ordinary form. For a modulus $m$ of $k$ limbs it
precomputes one constant, $\mu = \lfloor B^{2k} / m \rfloor$, and estimates the quotient
of $x < B^{2k}$ as

$$
\hat q = \left\lfloor \frac{\lfloor x / B^{k-1} \rfloor \cdot \mu}{B^{k+1}} \right\rfloor ,
$$

which is two shifts by whole limbs and one multiplication. Then $r = x - \hat q m$, with
both terms needed only modulo $B^{k+1}$ (the low $k + 1$ limbs). The estimate is never too
large and at most 2 too small (Menezes, van Oorschot and Vanstone's *Handbook of Applied
Cryptography*, Algorithm 14.42, proves it), so at most two subtractions of $m$ finish.
Constant-time code does both subtractions every time and keeps each by mask. The code
also counts how short the estimate really was:

```python
import random

W = 16                                   # limb size; b = 2^16 is the base

def barrett_setup(m):
    k = -(-m.bit_length() // W)          # number of limbs in m
    mu = (1 << (2 * W * k)) // m         # floor(b^(2k) / m), computed once per modulus
    return k, mu

def barrett(x, m, k, mu):                # x < b^(2k); returns x mod m with no division
    q = ((x >> (W * (k - 1))) * mu) >> (W * (k + 1))   # quotient estimate: shifts and one product
    top = 1 << (W * (k + 1))
    r = ((x % top) - (q * m) % top) % top   # "% top" is keeping the low k+1 limbs: a mask
    for _ in range(2):                   # the estimate is at most 2 short: always two
        d = r - m                        # trial subtractions, kept or dropped by a mask
        keep = (d >> (W * (k + 1))) & 1  # 1 if d went negative
        r = (r & -keep) | (d & (keep - 1))
    return r

rng = random.Random(1986)
seen = [0, 0, 0]
for trial in range(20000):
    n = rng.randrange(1, 10)
    m = rng.getrandbits(W * n) | (1 << (W * n - 1))
    k, mu = barrett_setup(m)
    x = rng.randrange(m * m)
    assert barrett(x, m, k, mu) == x % m
    q = ((x >> (W * (k - 1))) * mu) >> (W * (k + 1))
    seen[x // m - q] += 1                # how far short the estimate fell
print("20000 random cases agree with %; estimate short by 0, 1, 2:", seen)
```

```text
20000 random cases agree with %; estimate short by 0, 1, 2: [17089, 2911, 0]
```

In about 15% of these cases one correction was needed, and in none of them two; the
bound of 2 is a worst case. A version with a `while r >= m` loop would be correct and would
leak which case it was in. Montgomery is the usual choice for long exponentiations, where
the conversion into and out of Montgomery form is paid once; Barrett suits a single
reduction, a fixed small modulus, or a modulus that changes often. Post-quantum code uses
16-bit versions of both for its small moduli (ML-KEM reduces modulo 3329 with each); its
pitfalls are in Post-quantum [Chapter 17](../post-quantum/17-Implementing-Post-Quantum-Safely.md).

### Break it: the extra reduction

In 2000 Werner Schindler worked out how often Montgomery's final subtraction, the **extra
reduction**, happens. When an exponentiation repeatedly multiplies a running value $x$ by
a fixed $\bar g$ (in Montgomery form), the chance of an extra reduction in each of those
multiplications is close to $\bar g / (2R)$. A larger $\bar g$ means more extra
reductions, and more time.

Now put that inside RSA with the CRT, where the server computes modulo a secret prime $p$.
The attacker sends a value whose Montgomery form, after the server reduces it modulo $p$,
is $\bar g = g \bmod p$ (Brumley and Boneh arranged this by sending $gR^{-1} \bmod N$).
While $g$ is below $p$, $g \bmod p = g$ is large, and extra reductions are frequent. The
moment $g$ passes $p$, $g \bmod p$ is tiny, and extra reductions from the multiplications
nearly vanish. The time drops off a cliff exactly at $p$. The code models time as the
number of extra reductions, which is what the clock measures:

```python
import random

rng = random.Random(2003)

def prime(bits):                         # a probable prime with the top bit set
    while True:
        p = rng.getrandbits(bits) | (1 << (bits - 1)) | 1
        if all(pow(a, p - 1, p) == 1 for a in (2, 3, 5, 7, 11, 13)):
            return p

p = prime(512)                           # the server's secret prime
d = rng.getrandbits(512) | 1             # and its secret exponent mod p - 1
BITS = 512
R = 1 << BITS
Np = (-pow(p, -1, R)) % R
extra = 0                                # the "time": extra subtractions done

def redc_leaky(T):
    global extra
    t = (T + ((T * Np) % R) * p) >> BITS
    if t >= p:                           # data-dependent: happens or not
        extra += 1
        t -= p
    return t

def modexp_leaky(g):                     # g is already in Montgomery form
    x = R % p                            # 1 in Montgomery form
    for bit in bin(d)[2:]:
        x = redc_leaky(x * x)
        if bit == "1":
            x = redc_leaky(x * g)
    return x

def time_of(g, samples=8):               # the server reduces the input mod p first
    global extra
    extra = 0
    for i in range(samples):             # average over a few neighbors, as the attack does
        modexp_leaky((g + i) % p)
    return extra / samples

for e in (-500, -300, -20, 20, 300, 500):
    g = p + (1 << abs(e)) * (1 if e > 0 else -1)
    print(f"g = p {'+' if e > 0 else '-'} 2^{abs(e):<4} extra reductions: {time_of(g):6.1f}")
```

```text
g = p - 2^500  extra reductions:  187.9
g = p - 2^300  extra reductions:  180.1
g = p - 2^20   extra reductions:  183.4
g = p + 2^20   extra reductions:  106.6
g = p + 2^300  extra reductions:  100.0
g = p + 2^500  extra reductions:  107.8
```

Every value below $p$ costs about 180 extra reductions, every value just above it about
105. An attacker who can tell those apart, even through network noise and with many
repetitions, can ask "is $p$ above or below $g$?" for any $g$ it likes, which is a binary
search for $p$. Brumley and Boneh recovered the top half of $p$ bit by bit this way and
finished with Coppersmith's method (Cryptanalysis [§13.7](../cryptanalysis/13-Attacks-on-RSA.md)).

### Fix it: always subtract

The fix at this layer is the one `mont_mul` above already used: compute $t - N$ every
time, and keep $t$ or $t - N$ by a mask built from the borrow. In the leaky
exponentiation, replacing `redc_leaky` by such a reduction, and doing the multiplication
for every bit and keeping it by mask, makes the count the same for every input: two
subtractions per exponent bit, whether $g$ sits below $p$ or above it.

There is a second, cleverer fix. Colin Walter showed in 1999 that if $R > 4N$ and the
inputs are allowed to stay below $2N$ instead of below $N$, the output of REDC is always
below $2N$ too, and the extra reduction can be dropped altogether until the very end.
Many libraries use this "lazy" or "almost Montgomery" form, which is both faster and free
of the branch. Either way, the defense in depth for RSA is blinding (§6.7), which makes
the value being exponentiated unknown to the attacker in the first place.

**What to do.**

- Never write `if t >= N: t -= N` on secret data. Subtract always and select by mask, or
  use the lazy bound so no correction is needed until the end.
- Do Barrett's corrections the same way: a fixed number, each kept by mask.
- Test against an independent implementation, including values just below and above the
  modulus and its multiples.

## 6.5 Exponents and the Montgomery ladder

*Level: intermediate.*

A private-key operation raises a number to a secret power: $m^d \bmod N$ in RSA, $g^x$ in
finite-field Diffie-Hellman, and in elliptic-curve code the same thing written additively,
$kP$. The Mathematics book gives the methods
([§4.2 there](../mathematics/04-Powers-and-Primitive-Roots.md)); the engineering question
is what the sequence of operations reveals.

Left-to-right **square-and-multiply** squares for every bit of the exponent and multiplies
for every 1 bit. A power trace shows squarings and multiplications as different shapes
(a multiplication by a fixed $g$ draws differently from a squaring of a changing value), so
one trace spells out the exponent, as Paul Kocher, Joshua Jaffe and Benjamin Jun showed
with simple power analysis (1999).
The number of multiplications, the Hamming weight of $d$, is visible in total time too.
And the loop starts at the top set bit, so a shorter exponent finishes sooner: the length
leak that returns in §6.11.

**Windows** make it faster, not safer. A sliding-window method precomputes $g^1, g^3,
g^5, \dots$ and multiplies by one of them every few squarings; *which* one it reads is a
secret-dependent memory address, and the pattern of squarings between multiplications is
secret-dependent too. Colin Percival used the cache to read OpenSSL's RSA windows across
hyper-threads in 2005, and OpenSSL answered with a fixed-window exponentiation
(`BN_mod_exp_mont_consttime`) that multiplies after every fixed group of bits and reads its
table by touching every entry ([§5.5](05-Constant-Time-Programming.md)). In 2017 Daniel
Bernstein and seven colleagues showed, in "Sliding right into disaster", that the
left-to-right sliding window still used in Libgcrypt leaked enough through the cache to
recover full 1024-bit RSA keys (CVE-2017-7526).

### The ladder

Peter Montgomery's **ladder** (1987, from his work on factoring with elliptic curves) does
the same work for every bit. It keeps two values $R_0$ and $R_1$ with the invariant
$R_1 = R_0 \cdot g$. For each bit, from the top:

$$
\text{bit } 0: \; (R_0, R_1) \leftarrow (R_0^2, \; R_0 R_1), \qquad
\text{bit } 1: \; (R_0, R_1) \leftarrow (R_0 R_1, \; R_1^2).
$$

Both cases do one multiplication and one squaring, and both keep the invariant. The only
difference is which register goes where, and that is done with a conditional swap by mask
before and after a fixed step. Run it over a fixed number of bits, including leading
zeros, and the operation sequence is the same for every exponent of that length.

<figure class="mars-fig">
<svg viewBox="0 0 640 230" width="640" role="img" aria-label="One step of the Montgomery ladder: a conditional swap by the secret bit, then the same multiply and square, then the swap again" fill="currentColor" font-size="14">
<g fill="none" stroke="currentColor" stroke-width="1.3">
<rect x="20" y="40" width="90" height="34" rx="4"/>
<rect x="20" y="130" width="90" height="34" rx="4"/>
<rect x="160" y="70" width="100" height="64" rx="6" stroke-dasharray="5 3"/>
<rect x="310" y="40" width="130" height="34" rx="4"/>
<rect x="310" y="130" width="130" height="34" rx="4"/>
<rect x="490" y="70" width="100" height="64" rx="6" stroke-dasharray="5 3"/>
</g>
<text x="65" y="62" text-anchor="middle">R0</text>
<text x="65" y="152" text-anchor="middle">R1 = R0·g</text>
<text x="210" y="98" text-anchor="middle">cswap</text>
<text x="210" y="117" text-anchor="middle" font-size="12">by secret bit</text>
<text x="375" y="62" text-anchor="middle">R0 · R1</text>
<text x="375" y="152" text-anchor="middle">R0²</text>
<text x="540" y="98" text-anchor="middle">cswap</text>
<text x="540" y="117" text-anchor="middle" font-size="12">same bit</text>
<g stroke="currentColor" stroke-width="1.2">
<line x1="110" y1="57" x2="160" y2="90"/>
<line x1="110" y1="147" x2="160" y2="114"/>
<line x1="260" y1="90" x2="310" y2="57"/>
<line x1="260" y1="114" x2="310" y2="147"/>
<line x1="440" y1="57" x2="490" y2="90"/>
<line x1="440" y1="147" x2="490" y2="114"/>
</g>
<text x="320" y="200" text-anchor="middle" font-size="13">every bit: one multiply, one square, two swaps by mask; only the swap depends on the secret</text>
<text x="375" y="30" text-anchor="middle" font-size="12">one multiply</text>
<text x="375" y="185" text-anchor="middle" font-size="12">one square</text>
</svg>
<figcaption>Figure 6.4. One step of the Montgomery ladder as constant-time code writes it. The swap is done with masks, so the secret bit never chooses a branch or an address; the multiply and the square are the same for both values of the bit.</figcaption>
</figure>

**Code it.** Both methods, recording what a power probe would see (`S` for a squaring, `M`
for a multiplication), and the ladder checked against `pow`:

```python
import random

trace = []                                # what a power probe would see, one letter per operation

def mul(a, b, n):
    trace.append("M")
    return a * b % n

def sqr(a, n):
    trace.append("S")
    return a * a % n

def square_and_multiply(g, d, n):         # BROKEN: the operation sequence spells out d
    x = 1
    for bit in bin(d)[2:]:
        x = sqr(x, n)
        if bit == "1":
            x = mul(x, g, n)
    return x

def cswap(bit, a, b):                     # swap by mask, no branch on the secret bit
    t = -bit & (a ^ b)
    return a ^ t, b ^ t

def ladder(g, d, n, bits):                # FIXED: same two operations for every bit, fixed length
    r0, r1 = 1, g % n                     # invariant: r1 = r0 * g
    for i in range(bits - 1, -1, -1):
        bit = (d >> i) & 1
        r0, r1 = cswap(bit, r0, r1)
        r1 = mul(r0, r1, n)               # r0 * r1 = the next r1 (or r0, after the swap back)
        r0 = sqr(r0, n)
        r0, r1 = cswap(bit, r0, r1)
    return r0

n, g = 1000003 * 1000033, 5
for d in (0b10110011, 0b10000001, 0b00111111):
    trace.clear(); x = square_and_multiply(g, d, n); t1 = "".join(trace)
    trace.clear(); y = ladder(g, d, n, 8); t2 = "".join(trace)
    assert x == y == pow(g, d, n)
    print(f"d = {d:08b}  square-and-multiply: {t1:<16} ladder: {t2}")

rng = random.Random(1)
assert all(ladder(g, d, n, 64) == pow(g, d, n) for d in (rng.getrandbits(64) for _ in range(500)))
print("ladder agrees with pow on 500 random 64-bit exponents")
```

```text
d = 10110011  square-and-multiply: SMSSMSMSSSMSM    ladder: MSMSMSMSMSMSMSMS
d = 10000001  square-and-multiply: SMSSSSSSSM       ladder: MSMSMSMSMSMSMSMS
d = 00111111  square-and-multiply: SMSMSMSMSMSM     ladder: MSMSMSMSMSMSMSMS
ladder agrees with pow on 500 random 64-bit exponents
```

Split the first trace before each `S`: `SM`, `S`, `SM`, `SM`, `S`, `S`, `SM`, `SM`. A
squaring alone is a 0 bit and a squaring with a multiplication is a 1, so the trace reads
1, 0, 1, 1, 0, 0, 1, 1, which is $d$. The third exponent also gives away its two leading
zero bits by producing a shorter trace. The ladder's traces are identical.

The ladder is not the only uniform method. A fixed-window exponentiation with a
constant-time table scan is uniform too and faster for RSA, which is why OpenSSL uses it;
the ladder's special virtue shows on elliptic curves, where Montgomery's $x$-only formulas
make it both uniform and cheap (§6.6). What matters is the property, not the algorithm:
the sequence of operations, the memory addresses and the number of iterations must not
depend on secret bits.

**What to do.**

- Exponentiate secrets with a ladder or a fixed window, over a fixed bit length, with
  table reads that touch every entry.
- Swap and select by mask. Check the compiled code, since compilers turn masks back into
  branches ([§5.8](05-Constant-Time-Programming.md)).
- Never start the loop at the top set bit of a secret.

## 6.6 X25519, from the RFC

*Level: intermediate.*

Daniel Bernstein designed Curve25519 in 2006 with the implementer in mind. The prime
$p = 2^{255} - 19$ makes reduction cheap; the Montgomery form of the curve gives an
$x$-only ladder that is uniform by construction; every 32-byte string is accepted as a
public key, and the curve's twist is secure too, so there is no point validation to forget;
the secret scalar is "clamped" so that the cofactor and the ladder length take care of
themselves. RFC 7748 (Adam Langley, Mike Hamburg and Sean Turner, January 2016) fixed the
function, named **X25519**, down to the byte. The Mathematics book derives the curve and
the ladder ([§12.7 there](../mathematics/12-Elliptic-Curve-Group.md)); this section writes
X25519 the way the RFC asks for it to be written, and checks it against every X25519
vector the RFC gives.

### The pieces

**Field arithmetic.** Since $2^{255} \equiv 19 \pmod p$, the part of a number above bit
255 can be folded down: $x = h \cdot 2^{255} + l \equiv 19h + l$. A product of two values
below $2^{256}$ is below $2^{512}$; three folds always bring it below $2^{255}$. Doing
exactly three, every time, is the constant-time version of "reduce until small". Values
stay in this almost-reduced range (below $2^{255}$, possibly not below $p$) through the
whole ladder, and one masked subtraction at the very end gives the unique result below
$p$. Real implementations hold a field element in five 51-bit limbs (on 64-bit
processors) or ten limbs of 25 and 26 bits (on 32-bit ones), so that products and sums
have room to spare and carries can wait; the fold is the same idea.

**Decoding.** The scalar is 32 bytes, little-endian, clamped: clear the low three bits
(so the scalar is a multiple of the cofactor 8), clear bit 255 and set bit 254 (so every
scalar has the same top bit and the ladder always runs 255 steps). The $u$-coordinate is
32 bytes, little-endian, with bit 255 masked off; RFC 7748 says implementations "MUST
accept non-canonical values and process them as if they had been reduced modulo the field
prime."

**The ladder.** The RFC gives the ladder step in pseudocode, with a conditional swap
`cswap` that it asks to be done in constant time with a mask, and the constant
$a_{24} = 121665 = (486662 - 2)/4$.

**The inverse.** The result is $x_2 / z_2$. The RFC computes $z_2^{p-2}$, Fermat's
inverse, which is an exponentiation by a *public* exponent, so a fixed chain of 254
squarings and 11 multiplications does it in constant time.

### Code it

```python
# X25519 as RFC 7748 describes it, written the way constant-time code is written.
P = 2**255 - 19
M255 = (1 << 255) - 1

def fold(x):                     # x mod p, almost: 2^255 = 19 (mod p), so fold the top down
    for _ in range(3):           # three folds always, whatever the value (x < 2^512)
        x = (x & M255) + 19 * (x >> 255)
    return x                     # < 2^255, maybe not below p yet

def canon(x):                    # one masked subtraction gives the unique value below p
    d = x - P
    keep = (d >> 256) & 1        # 1 if d is negative
    return (x & -keep) | (d & (keep - 1))

def mul(a, b): return fold(a * b)
def add(a, b): return fold(a + b)
def sub(a, b): return fold(a + 2 * P - b)

def cswap(swap, a, b):           # swap a and b when swap is 1, with no branch
    mask = -swap                 # all ones or all zeros
    t = mask & (a ^ b)
    return a ^ t, b ^ t

def decode_scalar(k):            # clamping, RFC 7748 section 5
    k = bytearray(k)
    k[0] &= 248; k[31] &= 127; k[31] |= 64
    return int.from_bytes(k, "little")

def decode_u(u):                 # ignore bit 255; non-canonical values are allowed
    return int.from_bytes(u, "little") & M255

def x25519(k_bytes, u_bytes):
    k, x1 = decode_scalar(k_bytes), decode_u(u_bytes)
    x2, z2, x3, z3, swap = 1, 0, x1, 1, 0
    for t in range(254, -1, -1):             # always 255 steps
        kt = (k >> t) & 1
        swap ^= kt
        x2, x3 = cswap(swap, x2, x3)
        z2, z3 = cswap(swap, z2, z3)
        swap = kt
        A, B = add(x2, z2), sub(x2, z2)
        AA, BB = mul(A, A), mul(B, B)
        E = sub(AA, BB)
        C, D = add(x3, z3), sub(x3, z3)
        DA, CB = mul(D, A), mul(C, B)
        x3 = mul(add(DA, CB), add(DA, CB))
        z3 = mul(x1, mul(sub(DA, CB), sub(DA, CB)))
        x2 = mul(AA, BB)
        z2 = mul(E, add(AA, mul(121665, E)))
    x2, x3 = cswap(swap, x2, x3)
    z2, z3 = cswap(swap, z2, z3)
    # Python's pow is not constant time; real code inverts with a fixed chain of squarings.
    return canon(mul(x2, pow(z2, P - 2, P))).to_bytes(32, "little")

h = bytes.fromhex
# RFC 7748 section 5.2, the two single vectors
print(x25519(h("a546e36bf0527c9d3b16154b82465edd62144c0ac1fc5a18506a2244ba449ac4"),
             h("e6db6867583030db3594c1a424b15f7c726624ec26b3353b10a903a6d0ab1c4c")).hex()
      == "c3da55379de9c6908e94ea4df28d084f32eccf03491c71f754b4075577a28552")
print(x25519(h("4b66e9d4d1b4673c5ad22691957d6af5c11b6421e0ea01d42ca4169e7918ba0d"),
             h("e5210f12786811d3f4b7959d0538ae2c31dbe7106fc03c3efc4cd549c715a493")).hex()
      == "95cbde9476e8907d7aade45cb4b873f88b595a68799fa152e6f8f7647aac7957")
# section 5.2, the iterated test: k = u = 9 to start
k = u = (9).to_bytes(32, "little")
for i in range(1, 1001):
    k, u = x25519(k, u), k
    if i == 1:
        print(k.hex() == "422c8e7a6227d7bca1350b3e2bb7279f7897b87bb6854b783c60e80311ae3079")
print(k.hex() == "684cf59ba83309552800ef566f2f4d3c1c3887c49360e3875f2eb94d99532c51")

# RFC 7748 section 6.1, the Diffie-Hellman vector
a = h("77076d0a7318a57d3c16c17251b26645df4c2f87ebc0992ab177fba51db92c2a")
b = h("5dab087e624a8a4b79e17f8b83800ee66f3bb1292618b6fd1c2f8b27ff88e0eb")
nine = (9).to_bytes(32, "little")
KA, KB = x25519(a, nine), x25519(b, nine)
print(KA.hex() == "8520f0098930a754748b7ddcb43ef75a0dbf3a0d26381af4eba4a98eaa9b4e6a")
print(KB.hex() == "de9edb7d7b7dc1b4d35b61c2ece435373f8343c85b78674dadfc7e146f882b4f")
K = x25519(a, KB)
print(K == x25519(b, KA), K.hex() == "4a5d9d5ba4ce2de1728e3bf480350f25e07e21c947d19e3376f09b3c1e161742")

def shared_secret(my_key, their_pub):    # the all-zero check of section 6.1, without a branch per byte
    K = x25519(my_key, their_pub)
    acc = 0
    for byte in K:
        acc |= byte
    if acc == 0:
        raise ValueError("peer sent a small-order point")
    return K

small = [0, 1, 325606250916557431795983626356110631294008115727848805560023387167927233504,
         39382357235489614581723060781553021112529911719440698176882885853963445705823, P - 1]
for u in small:
    try:
        shared_secret(a, u.to_bytes(32, "little"))
        print("accepted", u)
    except ValueError as err:
        print(str(u)[:12], "->", err)
```

```text
True
True
True
True
True
True
True True
0 -> peer sent a small-order point
1 -> peer sent a small-order point
325606250916 -> peer sent a small-order point
393823572354 -> peer sent a small-order point
578960446186 -> peer sent a small-order point
```

Every `True` is one vector from RFC 7748, copied into the code exactly as the RFC prints
it: the two single vectors of section 5.2, its iterated values after one and 1,000 rounds,
and Alice's and Bob's keys and shared secret from section 6.1. The RFC's third iterated
value, after 1,000,000 rounds, is
`7c3911e0ab2586fd864497297e575e6f3bc601c0883c30df5f4dd2d24f665424`, which this code would
reach in about half an hour.

The iterated test is the useful one for an implementer. Each output becomes the next
scalar, so after a thousand rounds every bit of the field arithmetic, the clamping and the
decoding has been exercised on inputs no one chose, and a single wrong carry anywhere
would have changed the final value. The second single vector has a $u$-coordinate with
bit 255 set ($\texttt{93}$ in the last byte), so it checks that the decoder masks that bit.

**The all-zero check.** The last five lines feed X25519 points of small order: $u = 0$
(order 2), $u = 1$ (order 4), the two $u$-values of the points of order 8, and $u = p - 1$ (order 4 on the curve's
twist, which the $x$-only ladder treats the same way).
Because the clamped scalar is a multiple of 8, the result is the identity, which X25519
returns as zero. A protocol that needs both parties to contribute to the secret (most do)
should reject that, and RFC 7748 §6.1 says how: OR all the bytes together and check the
result, rather than comparing byte by byte with an early exit. TLS 1.3 requires the check
(RFC 8446 §7.4.2), and so does WireGuard's implementation in the Linux kernel.

!!! note "Life story: X25519 and RFC 7748"
    **Born:** 2006, Daniel Bernstein, "Curve25519: New Diffie-Hellman Speed Records"
    (PKC 2006); specified byte for byte as X25519 in RFC 7748 (Langley, Hamburg, Turner,
    January 2016), alongside X448 · **Purpose:** Diffie-Hellman that is fast and hard to
    implement wrongly: no point validation, no special cases in the ladder, the cofactor
    handled by clamping · **Helped:** became the default key exchange of TLS 1.3, SSH,
    Signal, WireGuard and many others, and the classical half of the hybrid
    X25519MLKEM768 · **Status:** current; formally verified implementations (HACL*,
    Fiat-Crypto) ship in Firefox, Chrome and the Linux kernel

**What to do.**

- Implement a specified function to its RFC exactly, including the decoding rules, and
  run every vector it gives, including the iterated ones.
- Keep field elements in a fixed representation with a fixed number of reduction steps;
  canonicalize once, at the output.
- Reject the all-zero shared secret when the protocol needs contributory behavior, and do
  it without an early exit.

## 6.7 RSA private-key code: blinding and the fault check

*Level: intermediate.*

An RSA private-key operation is one exponentiation, $s = m^d \bmod N$, almost always done
with the Chinese remainder theorem as two half-size exponentiations modulo $p$ and $q$
joined by Garner's formula (book 1 [§13.9](../../book/13-RSA.md); Mathematics
[§3.9](../mathematics/03-Modular-Arithmetic.md)). Two attacks aim at it, and each has its
own defense. They are independent, and production code needs both.

### Base blinding, against timing

Brumley and Boneh's attack (§6.1, §6.4) worked because the attacker chose the number being
exponentiated. **Base blinding**, which Kocher proposed in 1996 using an idea from David
Chaum's blind signatures, takes that choice away. Before exponentiating, pick a fresh
random $r$ and compute

$$
m' = m \cdot r^e \bmod N, \qquad s' = (m')^d = m^d \cdot r^{ed} = m^d \cdot r \pmod N,
\qquad s = s' \cdot r^{-1} \bmod N .
$$

The exponentiation now works on $m'$, a uniformly random number that the attacker does not
know, so its timing, its extra reductions and its cache pattern are no longer correlated
with anything the attacker controls. The cost is one exponentiation by the small public
$e$ and one inverse; Kocher noted that the pair $(r^e, r^{-1})$ can be updated by squaring
both instead of drawn afresh each time, and OpenSSL does that and refreshes the pair
periodically.

**Exponent blinding** protects the other input. Using $d_p + k(p - 1)$ with a fresh random
$k$ of 32 to 64 bits gives the same result (Fermat's little theorem) with a different bit
pattern every time, which defeats attacks that average many power traces of the same
exponent. Smart cards do both.

### The fault check, against glitches

If a fault corrupts one CRT half, the released signature is right modulo one prime and
wrong modulo the other, and one gcd factors $N$: Boneh, DeMillo and Lipton's attack of
1996, with Lenstra's one-signature version (Cryptanalysis
[§13.12](../cryptanalysis/13-Attacks-on-RSA.md) works it in full). The defense is short:
**verify the signature with the public key before releasing it**, $s^e \equiv m \pmod N$,
which with $e = 65537$ costs 17 modular multiplications, a few percent of the cost of
signing.
OpenSSL's RSA code has done this for years, and on a mismatch it does not return an error
but recomputes the result the slow way, without the CRT.

<figure class="mars-fig">
<svg viewBox="0 0 640 200" width="640" role="img" aria-label="The RSA signing pipeline: blind the input, compute the two CRT halves, join them, unblind, verify with the public key, and release only if the check passes" fill="currentColor" font-size="13">
<g fill="none" stroke="currentColor" stroke-width="1.3">
<rect x="10" y="70" width="70" height="40" rx="5"/>
<rect x="100" y="70" width="80" height="40" rx="5"/>
<rect x="200" y="30" width="100" height="36" rx="5"/>
<rect x="200" y="114" width="100" height="36" rx="5"/>
<rect x="320" y="70" width="70" height="40" rx="5"/>
<rect x="410" y="70" width="80" height="40" rx="5"/>
<rect x="510" y="70" width="120" height="40" rx="5" stroke-width="2"/>
</g>
<text x="45" y="95" text-anchor="middle">m</text>
<text x="140" y="88" text-anchor="middle">blind</text>
<text x="140" y="104" text-anchor="middle" font-size="11">m·r^e</text>
<text x="250" y="53" text-anchor="middle">^dp mod p</text>
<text x="250" y="137" text-anchor="middle">^dq mod q</text>
<text x="355" y="95" text-anchor="middle">join</text>
<text x="450" y="88" text-anchor="middle">unblind</text>
<text x="450" y="104" text-anchor="middle" font-size="11">·r^-1</text>
<text x="570" y="88" text-anchor="middle">s^e = m mod N ?</text>
<text x="570" y="104" text-anchor="middle" font-size="11">verify</text>
<g stroke="currentColor" stroke-width="1.2">
<line x1="80" y1="90" x2="100" y2="90"/>
<line x1="180" y1="84" x2="200" y2="52"/>
<line x1="180" y1="96" x2="200" y2="130"/>
<line x1="300" y1="52" x2="320" y2="84"/>
<line x1="300" y1="130" x2="320" y2="96"/>
<line x1="390" y1="90" x2="410" y2="90"/>
<line x1="490" y1="90" x2="510" y2="90"/>
<line x1="570" y1="110" x2="570" y2="140"/>
</g>
<text x="570" y="158" text-anchor="middle">yes: release s</text>
<text x="570" y="176" text-anchor="middle">no: release nothing</text>
<text x="250" y="180" text-anchor="middle" font-size="12">blinding hides the input from timing; the check stops a faulty half</text>
</svg>
<figcaption>Figure 6.5. A careful RSA signer. Blinding makes the exponentiations work on a random value the attacker cannot choose; the final check, with the public key, makes sure a signature wrong modulo one prime never leaves the device.</figcaption>
</figure>

**Code it.** A signer with both defenses, a simulated bit flip in the half modulo $p$,
and the gcd an attacker would compute if the check were missing:

```python
import hashlib, secrets
from math import gcd

def is_probable_prime(n, rounds=32):         # Miller-Rabin with random bases
    if n % 2 == 0:
        return n == 2
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
            return False
    return True

def random_prime(bits, e):
    while True:
        p = secrets.randbits(bits) | (3 << (bits - 2)) | 1
        if gcd(p - 1, e) == 1 and is_probable_prime(p):
            return p

class Signer:
    def __init__(self, bits=2048, e=65537):
        self.e = e
        self.p, self.q = random_prime(bits // 2, e), random_prime(bits // 2, e)
        self.n = self.p * self.q
        d = pow(e, -1, (self.p - 1) * (self.q - 1))
        self.dp, self.dq = d % (self.p - 1), d % (self.q - 1)
        self.qinv = pow(self.q, -1, self.p)
        self.glitch = False                  # set by the test to simulate a hardware fault

    def raw_sign(self, m):                   # m^d mod n by the CRT, with base blinding
        p, q, n = self.p, self.q, self.n
        r = secrets.randbelow(n - 2) + 2     # fresh blinding factor each time
        mb = m * pow(r, self.e, n) % n       # the exponentiation never sees m itself
        sp, sq = pow(mb, self.dp, p), pow(mb, self.dq, q)
        if self.glitch:
            sp ^= 1 << secrets.randbelow(p.bit_length())
        s = sq + q * (self.qinv * (sp - sq) % p)
        return s * pow(r, -1, n) % n         # unblind: (m r^e)^d / r = m^d

    def sign(self, m, check=True):
        s = self.raw_sign(m)
        if check and pow(s, self.e, self.n) != m:    # verify before release
            raise RuntimeError("signature failed its check; nothing released")
        return s

key = Signer()
m = int.from_bytes(hashlib.sha256(b"release 7.1").digest(), "big")  # stands in for a padded hash
s = key.sign(m)
print("good signature verifies:", pow(s, key.e, key.n) == m)

key.glitch = True
bad = key.sign(m, check=False)                       # the bug: no check
f = gcd(pow(bad, key.e, key.n) - m, key.n)
print("unchecked faulty signature factors n:", f in (key.p, key.q))
try:
    key.sign(m)                                      # the fix
except RuntimeError as err:
    print("checked:", err)
```

```text
good signature verifies: True
unchecked faulty signature factors n: True
checked: signature failed its check; nothing released
```

Look at what blinding did *not* do. The faulty signature was blinded and unblinded, and it
still factored $n$: unblinding multiplies by $r^{-1}$, which is the same correct value
modulo both primes, so the signature stays right modulo $q$ and wrong modulo $p$. Blinding
is a defense against timing, the check is a defense against faults, and neither replaces
the other.

**In the real world.** Faulty CRT signatures are not only a laboratory effect. Florian
Weimer of Red Hat found TLS servers sending them in 2015, from bad hardware and buggy
accelerators; scans in 2022 and an analysis of years of SSH data in 2023 found more, and
the 2023 study recovered 189 RSA host keys (Cryptanalysis
[§13.12](../cryptanalysis/13-Attacks-on-RSA.md) has the details). Every one of those
implementations lacked the check.

Two engineering details make the check work:

- **Check with independent data.** Verify with $e$ and $N$ as stored with the public key,
  not with values recomputed from $p$ and $q$ during the same operation, which a fault
  could have corrupted the same way.
- **A fault can skip the check.** On a smart card, an attacker with a laser or a voltage
  glitch can aim at the comparison itself. Hardened code computes the check twice, stores
  the result in a form where a single fault cannot turn "fail" into "pass", or uses
  infective countermeasures that turn a fault into a random, useless output.
  [Chapter 7](07-Masking-and-Fault-Resistance.md) builds those.

!!! note "Life story: RSA blinding"
    **Born:** 1996, Paul Kocher, "Timing Attacks on Implementations of Diffie-Hellman,
    RSA, DSS, and Other Systems" (CRYPTO 1996), adapting David Chaum's blind signatures
    (1983) · **Purpose:** to make the value being exponentiated unknown to the attacker,
    so that timing cannot be correlated with chosen inputs · **Helped:** on by default in
    OpenSSL since 2003, after Brumley and Boneh; standard in every serious RSA
    implementation, usually together with constant-time exponentiation · **Status:**
    current; it does not stop fault attacks, which need the verify-before-release check

**What to do.**

- Blind the base of every RSA private-key operation with a fresh or freshly updated
  random value; on hardware exposed to power analysis, blind the exponent too.
- Verify every RSA signature (and the result of every CRT decryption, by re-encrypting)
  with the public key before it leaves the function. Release nothing if it fails.
- Treat a failed check as a hardware alarm: log it and stop using the device until it is
  understood.

## 6.8 Points from strangers: validation and invalid curves

*Level: intermediate.*

An elliptic-curve Diffie-Hellman server multiplies a point it received from someone else
by its own secret scalar. The addition and doubling formulas for a short Weierstrass curve
$y^2 = x^3 + ax + b$ never use $b$. So if the received point is not on the server's curve,
the formulas compute happily on whichever curve with the same $a$ the point does lie on,
and the attacker can pick that curve to have a subgroup of small order. The server's reply
then reveals its secret modulo that small order; a few dozen such points and the Chinese
remainder theorem give the whole key. Ingrid Biehl, Bernd Meyer and Volker Müller
described this **invalid-curve attack** in 2000, and the Mathematics book runs it on a
toy curve ([§12.10 there](../mathematics/12-Elliptic-Curve-Group.md)). The defender's
side is a few lines of checks, which keep being left out.

### What to check

SP 800-56A (section 5.6.2.3) and SEC 1 give the same list for a received public key $Q$:

1. $Q$ is not the point at infinity.
2. Its coordinates are integers in $[0, p - 1]$: no value of $p$ or above, so each point
   has exactly one encoding.
3. $Q$ satisfies the curve equation, with *this* curve's $a$ and $b$.
4. $nQ = \mathcal{O}$, where $n$ is the order of the base point. For curves of cofactor 1,
   such as P-256, P-384 and secp256k1, step 3 already implies it.

The same goes for the curve itself. A protocol should name its curve and never accept
parameters from the peer; a certificate or key file that carries explicit curve
parameters is a request to compute on the sender's curve.

```python
p = 2**256 - 2**224 + 2**192 + 2**96 - 1          # NIST P-256
a, b = p - 3, 0x5AC635D8AA3A93E7B3EBBD55769886BC651D06B0CC53B0F63BCE3C3E27D2604B
G = (0x6B17D1F2E12C4247F8BCE6E563A440F277037D812DEB33A0F4A13945D898C296,
     0x4FE342E2FE1A7F9B8EE7EB4A7C0F9E162BCE33576B315ECECBB6406837BF51F5)

def careless(Q):                                  # BROKEN: checks only that x is a field element
    return Q is not None and 0 <= Q[0] < p

def validate(Q):                                  # FIXED: SP 800-56A's checks, for a cofactor-1 curve
    if Q is None:                                 # 1. not the identity
        return "rejected: identity"
    x, y = Q
    if not (0 <= x < p and 0 <= y < p):           # 2. both coordinates in range
        return "rejected: coordinate out of range"
    if (y * y - (x * x * x + a * x + b)) % p:     # 3. on this curve, not on a neighbor
        return "rejected: not on the curve"
    return "accepted"                             # 4. n*Q = O is automatic when the cofactor is 1

x = 1                                             # find a point on y^2 = x^3 - 3x + 7: same a, other b
while pow((x**3 + a * x + 7) % p, (p - 1) // 2, p) != 1:
    x += 1
other = (x, pow((x**3 + a * x + 7) % p, (p + 1) // 4, p))   # p = 3 mod 4, so this is a square root
tests = {"the base point": G,
         "on another curve": other,
         "Bluetooth-style (x, 0)": (G[0], 0),
         "y + p (non-canonical)": (G[0], G[1] + p),
         "identity": None}
for name, Q in tests.items():
    print(f"{name:24} careless: {str(careless(Q)):6} validate: {validate(Q)}")
```

```text
the base point           careless: True   validate: accepted
on another curve         careless: True   validate: rejected: not on the curve
Bluetooth-style (x, 0)   careless: True   validate: rejected: not on the curve
y + p (non-canonical)    careless: True   validate: rejected: coordinate out of range
identity                 careless: False  validate: rejected: identity
```

### In the real world

The checks are cheap, and the history of leaving them out is long.

- **TLS-ECDH, 2015.** Tibor Jager, Jörg Schwenk and Juraj Somorovsky tested TLS libraries
  with invalid points and found that Bouncy Castle and the Java standard library's SunEC
  provider did not validate them. A server using static ECDH keys (the TLS_ECDH cipher
  suites) gave its private key away to a client that sent crafted points. Both libraries
  were fixed.
- **Bluetooth, 2018.** Eli Biham and Lior Neumann found that the Bluetooth pairing
  protocol authenticated only the $x$-coordinate of each device's public key, and that
  the specification recommended but did not require point validation. An attacker in
  radio range could set both $y$-coordinates to zero. A point $(x, 0)$ has order 2 on
  whatever curve it lies on, so the shared secret became either the point itself or the
  identity, something the attacker could guess. Their fully active attack succeeded in
  half of all pairings between vulnerable devices (CVE-2018-5383); the Bluetooth SIG
  made validation mandatory.
- **CurveBall, 2020.** The US National Security Agency reported (CVE-2020-0601, patched
  January 14, 2020) that Windows' CryptoAPI accepted certificates with explicit curve
  parameters and checked only that the public key matched a trusted root's, not that the
  base point did. An attacker took a root CA's public key $Q$, chose a secret $k$ and set
  the base point to $G' = k^{-1} Q$; then $k$ was the "private key" of $Q$ on the
  attacker's version of the curve, and Windows accepted the forged certificates for TLS
  and code signing. This was parameter validation, the step before point validation.

!!! note "Life story: the invalid-curve attack"
    **Born:** 2000, Ingrid Biehl, Bernd Meyer and Volker Müller, "Differential Fault
    Attacks on Elliptic Curve Cryptosystems" (CRYPTO 2000); the validation rules in
    Antipa, Brown, Menezes, Struik and Vanstone (PKC 2003) · **Purpose:** to compute on a
    weaker curve of the attacker's choosing, by sending a point that is not on the real
    one · **Helped:** made public-key validation a required step in SP 800-56A and SEC 1;
    found in Java and Bouncy Castle (2015), Bluetooth pairing (2018, CVE-2018-5383) and,
    for parameters, Windows CryptoAPI (2020, CVE-2020-0601) · **Status:** stopped by four
    checks; X25519 and other $x$-only Montgomery designs avoid it by having secure
    twists, so that no input is a dangerous one

**What to do.**

- Validate every received point: not the identity, coordinates in range, on the curve,
  and in the prime-order subgroup when the cofactor is not 1. Do it in the decoding
  function, so that no code can hold an unvalidated point.
- Accept only named curves. Reject explicit parameters in keys and certificates.
- Prefer designs (X25519, Ed25519 with its decoder, ristretto255) where every input the
  decoder accepts is safe to use.

## 6.9 Cofactors and the key-image bug

*Level: intermediate.*

The number of points on an elliptic curve is $h \cdot \ell$, with $\ell$ a large prime and
$h$ the **cofactor**. NIST's prime curves and secp256k1 have $h = 1$: every point except
the identity has order $\ell$. Curve25519 and its Edwards form, the curve of Ed25519, have
$h = 8$. Besides the large subgroup of order $\ell$ where all honest keys live, there are
eight points of small order (dividing 8), and every point on the curve is an honest point
plus one of those eight. The Mathematics book has the group theory
([§7.11 there](../mathematics/07-Groups.md)).

For Diffie-Hellman, clamping handles this: the scalar is a multiple of 8, so the
small-order part of any input is multiplied away (§6.6). The trouble starts when a point
is used for something other than a multiplication by a clamped scalar, such as an
identifier that must be unique. Then $I$ and $I + T$, with $T$ of small order, are
different encodings of "the same" key, and code that compares encodings sees two.

<figure class="mars-fig">
<svg viewBox="0 0 640 230" width="640" role="img" aria-label="A curve with cofactor 8 drawn as eight cosets of the prime-order subgroup; a key image I lies in the subgroup and I plus a point of order 2 lies in another coset; multiplying by l sends the first to the identity and the second to the small point" fill="currentColor" font-size="13">
<g fill="none" stroke="currentColor" stroke-width="1.3">
<rect x="20" y="30" width="600" height="110" rx="6"/>
<rect x="24" y="34" width="72" height="102" rx="4" stroke-width="2"/>
<line x1="170" y1="30" x2="170" y2="140" opacity="0.5"/>
<line x1="245" y1="30" x2="245" y2="140" opacity="0.5"/>
<line x1="320" y1="30" x2="320" y2="140" opacity="0.5"/>
<line x1="395" y1="30" x2="395" y2="140" opacity="0.5"/>
<line x1="470" y1="30" x2="470" y2="140" opacity="0.5"/>
<line x1="545" y1="30" x2="545" y2="140" opacity="0.5"/>
<line x1="100" y1="30" x2="100" y2="140" opacity="0.5"/>
</g>
<text x="320" y="20" text-anchor="middle">all 8ℓ points: the prime-order subgroup and its 7 shifted copies</text>
<text x="60" y="58" text-anchor="middle" font-size="12">order ℓ</text>
<circle cx="60" cy="96" r="4"/>
<text x="60" y="118" text-anchor="middle">I</text>
<circle cx="135" cy="96" r="4"/>
<text x="135" y="118" text-anchor="middle">I + T</text>
<text x="135" y="58" text-anchor="middle" font-size="12">+ T</text>
<text x="160" y="172" text-anchor="middle">ℓ · I = O: accept</text>
<text x="470" y="172" text-anchor="middle">ℓ · (I + T) = T ≠ O: reject</text>
<text x="320" y="210" text-anchor="middle">T has order 2 (or 4, or 8); ℓ is odd, so multiplying by ℓ keeps T and kills the rest</text>
</svg>
<figcaption>Figure 6.6. Why the subgroup check works. Every point is an honest point plus one of eight small-order points. Multiplying by the prime ℓ sends an honest point to the identity and leaves the small part behind, so ℓ·<i>I</i> = O holds exactly for points in the prime-order subgroup.</figcaption>
</figure>

### The CryptoNote double spend

CryptoNote, the protocol under Monero, Bytecoin and a family of other currencies, hides
which coin a transaction spends with a **one-time ring signature**: it proves that the
spender knows the secret key of one of several public keys $P_i$, without saying which.
To stop the same coin being spent twice, every spend also publishes a **key image**
$I = x \cdot H_p(P)$, where $x$ is the real key, $P = xG$ and $H_p$ hashes to a point. The
key image is the same every time the same coin is spent, so the network keeps a list of
spent key images and rejects any repeat.

The ring signature's verification computes, for each ring member, $r_i G + c_i P_i$ and
$r_i H_p(P_i) + c_i I$, and checks that the challenges $c_i$ sum to a hash of all of them.
Now let the spender publish $I' = I + T$ with $T$ of order 2. For the real member $s$,
the verifier's second value becomes

$$
r_s H_p(P_s) + c_s (I + T) = q_s H_p(P_s) + c_s T ,
$$

where $q_s$ is the value the signer used. If $c_s$ is even, $c_s T = \mathcal{O}$ and the
signature verifies. The signer tries fresh randomness until $c_s$ comes out even, which
takes two tries on average. $I'$ is a different string from $I$, so the spent-list does
not match it, and the coin is spent a second time. With the eight small-order points of
the curve, one coin could be spent up to eight times.

On February 19, 2017, a member of the Monero Research Lab found the bug. Monero patched it
quietly, scanned its blockchain, found no sign that it had been used, and gave the other
CryptoNote projects time before publishing the disclosure on May 17, 2017. The fix was the
check of Figure 6.6: reject any key image with $\ell \cdot I \ne \mathcal{O}$. Not every
project had been so lucky. Jonas Nick's analysis a week later reported that the bug had
been used on Bytecoin to create about 700 million coins out of nothing; that figure is his
estimate and has not been confirmed by the project.

**Code it.** A ring of two keys on the real Ed25519 curve, a spend with the honest key
image, a second spend with $I + T$, and the same two spends with the subgroup check. The
hash-to-point is a simple try-and-increment that multiplies by 8 at the end, as
CryptoNote's does, so that honest key images lie in the prime-order subgroup:

```python
import hashlib, secrets

# Ed25519's curve: -x^2 + y^2 = 1 + d x^2 y^2 over p = 2^255 - 19, with 8 * l points.
p = 2**255 - 19
d = -121665 * pow(121666, -1, p) % p
l = 2**252 + 27742317777372353535851937790883648493
G = (15112221349535400772501151409588531511454012693041857206046113283949847762202,
     46316835694926478169428394003475163141307993866256225615783033603165251855960)
O = (0, 1)                                   # the identity
T2 = (0, p - 1)                              # a point of order 2: the trouble

def add(P, Q):                               # one formula for every case (complete, since d is not a square)
    (x1, y1), (x2, y2) = P, Q
    t = d * x1 * x2 * y1 * y2 % p
    return ((x1 * y2 + y1 * x2) * pow(1 + t, -1, p) % p,
            (y1 * y2 + x1 * x2) * pow(1 - t, -1, p) % p)

def mul(k, P):
    R = O
    for bit in bin(k)[2:]:
        R = add(R, R)
        if bit == "1":
            R = add(R, P)
    return R

def H(*parts):                               # hash to a scalar
    data = b"".join(x.to_bytes(32, "little") if isinstance(x, int) else repr(x).encode() for x in parts)
    return int.from_bytes(hashlib.sha512(data).digest(), "little") % l

def hash_to_point(P):                        # try-and-increment, then clear the cofactor
    i = 0
    while True:
        y = H(P, i) % p
        u = (y * y - 1) * pow(d * y * y + 1, -1, p) % p
        x = pow(u, (p + 3) // 8, p)
        if x * x % p != u:
            x = x * pow(2, (p - 1) // 4, p) % p
        if x * x % p == u:
            return mul(8, (x, y))
        i += 1

def ring_sign(msg, ring, s, x, I, forge=False):   # CryptoNote's one-time ring signature
    while True:
        q = [secrets.randbelow(l) for _ in ring]
        w = [secrets.randbelow(l) for _ in ring]
        L, R = [], []
        for i, P in enumerate(ring):
            Hp = hash_to_point(P)
            if i == s:
                L.append(mul(q[i], G)); R.append(mul(q[i], Hp))
            else:
                L.append(add(mul(q[i], G), mul(w[i], P)))
                R.append(add(mul(q[i], Hp), mul(w[i], I)))
        c = H(msg, L, R)
        cs = [w[i] if i != s else 0 for i in range(len(ring))]
        cs[s] = (c - sum(cs)) % l
        r = [q[i] if i != s else (q[s] - cs[s] * x) % l for i in range(len(ring))]
        if not forge or cs[s] % 2 == 0:      # the forger retries until c_s kills T2: half the time
            return cs, r

def ring_verify(msg, ring, I, sig, check_subgroup):
    if check_subgroup and mul(l, I) != O:    # THE FIX: the key image must lie in the prime-order group
        return False
    cs, r = sig
    L = [add(mul(r[i], G), mul(cs[i], P)) for i, P in enumerate(ring)]
    R = [add(mul(r[i], hash_to_point(P)), mul(cs[i], I)) for i, P in enumerate(ring)]
    return sum(cs) % l == H(msg, L, R)

x = secrets.randbelow(l)                     # the spender's one-time key
P = mul(x, G)
decoy = mul(secrets.randbelow(l), G)
ring = [decoy, P]
I = mul(x, hash_to_point(P))                 # the key image: one per output, so a second spend is seen
I2 = add(I, T2)                              # the same output, a different-looking key image

for check in (False, True):
    spent = set()
    for image in (I, I2):
        sig = ring_sign(b"pay someone", ring, 1, x, image, forge=image is I2)
        ok = ring_verify(b"pay someone", ring, image, sig, check) and image not in spent
        spent.add(image)
        print("subgroup check" if check else "no check      ", "| spend accepted:", ok)
```

```text
no check       | spend accepted: True
no check       | spend accepted: True
subgroup check | spend accepted: True
subgroup check | spend accepted: False
```

Without the check, the network accepts the same coin twice; with it, the second spend is
refused. (The toy uses a variable-time `mul` and Python's `pow` for inverses, which is
fine for public verification and not for signing; the point here is the algebra.)

The same class of bug turns up wherever a cofactor-8 point is treated as a unique
identifier or compared by its bytes. Ed25519 verifiers even disagree on whether to multiply the
verification equation by 8, so a signature with small-order components can pass in one
library and fail in another (Chalkias, Garillot and Nikolaenko, "Taming the many EdDSAs",
2020). The cleanest fix is
to remove the cofactor from the interface: Mike Hamburg's Decaf (2015) and its descendant
**ristretto255** (RFC 9496, 2023) encode the prime-order group of Curve25519 so that each
element has exactly one encoding and no small-order points exist at all.

!!! note "Life story: the CryptoNote key-image bug"
    **Born:** the CryptoNote protocol (2012 to 2013) used Ed25519's curve for one-time
    ring signatures without checking that key images lie in the prime-order subgroup;
    found by the Monero Research Lab on February 19, 2017, disclosed May 17, 2017 ·
    **Purpose:** none; a key image plus a point of small order verified as a new key
    image, so one output could be spent up to eight times · **Helped:** the check
    $\ell \cdot I = \mathcal{O}$ in Monero and other CryptoNote coins; wider awareness of
    cofactor pitfalls, and the case for prime-order encodings such as ristretto255 ·
    **Status:** fixed in Monero before disclosure; reported as exploited on Bytecoin
    (about 700 million coins, Jonas Nick's estimate)

**What to do.**

- On a curve with a cofactor, decide for every point in the protocol whether it must lie
  in the prime-order subgroup, and check $\ell P = \mathcal{O}$ wherever it must.
- Never use the encoding of a cofactor-curve point as a unique identifier without that
  check, or without first multiplying by the cofactor.
- For new designs, use a prime-order group: a prime-order curve, or ristretto255 on top of
  Curve25519.

## 6.10 Complete addition formulas

*Level: intermediate.*

The chord-and-tangent rule taught in every textbook is not one formula but several: a
chord for two different points, a tangent for a point added to itself, and special
answers when one point is the identity or the two are negatives. Code that implements it
has branches on the points, which are secret during a scalar multiplication, and code
that forgets a case computes garbage: the chord formula applied to $P + P$ divides by
zero, which in a field library usually means "multiply by the inverse of 0", which is 0.
Tetsuya Izu and Tsuyoshi Takagi showed in 2003 that an attacker who can steer a scalar
multiplication into such an **exceptional case** can learn scalar bits from whether the
result is wrong. Implementations that use incomplete formulas must argue that no
exceptional case can arise inside their ladder, and such arguments are easy to get wrong.

A **complete** formula gives the right answer for every pair of points on the curve, with
no case analysis. Edwards curves had one from the start: Harold Edwards's form, as Daniel
Bernstein and Tanja Lange showed in 2007, has a single addition law that also doubles and
handles the identity, whenever the constant $d$ is not a square. That is one reason
Ed25519 is pleasant to implement (the `add` of §6.9 is that law). For the prime-order
short Weierstrass curves in use everywhere (P-256, P-384, secp256k1), Joost Renes, Craig
Costello and Lejla Batina gave complete formulas in 2016, in projective coordinates
$(X : Y : Z)$ with the identity as $(0 : 1 : 0)$: twelve general multiplications plus a few
by the curve constants, for any $a$, with cheaper versions for $a = -3$ and $a = 0$. They are slower
than the best incomplete formulas, and in exchange the whole class of exceptional-case
bugs disappears.

**Code it.** Renes, Costello and Batina's Algorithm 1 (its 40 steps grouped into
expressions), next to the textbook chord rule, on P-256:

```python
# NIST P-256: y^2 = x^3 - 3x + b over p, a prime number of points (cofactor 1)
p = 2**256 - 2**224 + 2**192 + 2**96 - 1
a = p - 3
b = 0x5AC635D8AA3A93E7B3EBBD55769886BC651D06B0CC53B0F63BCE3C3E27D2604B
G = (0x6B17D1F2E12C4247F8BCE6E563A440F277037D812DEB33A0F4A13945D898C296,
     0x4FE342E2FE1A7F9B8EE7EB4A7C0F9E162BCE33576B315ECECBB6406837BF51F5)

def add_affine(P, Q):                    # the textbook chord rule: INCOMPLETE
    (x1, y1), (x2, y2) = P, Q
    lam = (y2 - y1) * pow(x2 - x1, -1, p) % p   # x2 = x1 has no inverse
    x3 = (lam * lam - x1 - x2) % p
    return x3, (lam * (x1 - x3) - y1) % p

def add_complete(P, Q):                  # Renes, Costello, Batina 2016, Algorithm 1 (any a)
    X1, Y1, Z1 = P                       # projective (X : Y : Z); the identity is (0 : 1 : 0)
    X2, Y2, Z2 = Q
    b3 = 3 * b % p
    t0, t1, t2 = X1 * X2 % p, Y1 * Y2 % p, Z1 * Z2 % p
    t3 = ((X1 + Y1) * (X2 + Y2) - t0 - t1) % p
    t4 = ((X1 + Z1) * (X2 + Z2) - t0 - t2) % p
    t5 = ((Y1 + Z1) * (Y2 + Z2) - t1 - t2) % p
    Z3 = (a * t4 + b3 * t2) % p
    X3 = (t1 - Z3) % p
    Z3 = (t1 + Z3) % p
    Y3 = X3 * Z3 % p
    t1 = (3 * t0 + a * t2) % p
    t2 = a * (t0 - a * t2) % p
    t4 = (b3 * t4 + t2) % p
    Y3 = (Y3 + t1 * t4) % p
    X3 = (t3 * X3 - t5 * t4) % p
    Z3 = (t5 * Z3 + t3 * t1) % p
    return X3, Y3, Z3

def to_affine(P):
    X, Y, Z = P
    if Z == 0:
        return None                      # the identity
    zi = pow(Z, -1, p)
    return X * zi % p, Y * zi % p

def double_affine(P):                    # the tangent rule, a separate formula
    x1, y1 = P
    lam = (3 * x1 * x1 + a) * pow(2 * y1, -1, p) % p
    x3 = (lam * lam - 2 * x1) % p
    return x3, (lam * (x1 - x3) - y1) % p

ID = (0, 1, 0)
Gp = (G[0], G[1], 1)
P = to_affine(add_complete(Gp, add_complete(Gp, Gp)))   # 3G
Q = to_affine(add_complete(Gp, Gp))                     # 2G
cases = [("P + Q", P, Q, add_affine(P, Q)),
         ("P + P", P, P, double_affine(P)),
         ("P + (-P)", P, (P[0], p - P[1]), None),
         ("P + identity", P, None, P)]
for name, A, B, want in cases:
    try:
        chord = "no identity to add" if B is None else ("ok" if add_affine(A, B) == want else "wrong")
    except ValueError:
        chord = "fails (no inverse)"
    got = to_affine(add_complete(A + (1,), ID if B is None else B + (1,)))
    print(f"{name:13} chord rule: {chord:20} complete formula right: {got == want}")
```

```text
P + Q         chord rule: ok                   complete formula right: True
P + P         chord rule: fails (no inverse)   complete formula right: True
P + (-P)      chord rule: fails (no inverse)   complete formula right: True
P + identity  chord rule: no identity to add   complete formula right: True
```

One function handles all four cases, with the same sequence of field operations each
time. A ladder built on it (§6.12 does this) needs no special treatment of its starting
value, the identity, and no argument about which cases can arise. The signer of §6.12
also reproduces an RFC 6979 vector through hundreds of these additions, which is a far
stronger check of the formula than four cases.

!!! note "Life story: complete addition formulas"
    **Born:** for Edwards curves, Bernstein and Lange, "Faster Addition and Doubling on
    Elliptic Curves" (ASIACRYPT 2007); for prime-order Weierstrass curves, Renes,
    Costello and Batina, "Complete Addition Formulas for Prime Order Elliptic Curves"
    (EUROCRYPT 2016) · **Purpose:** one addition law, correct for every input, so that
    implementations need no branches on points and have no exceptional cases ·
    **Helped:** used in constant-time P-256 and P-384 code, in Rust's `p256` crate and
    other modern libraries, and in formally verified implementations · **Status:**
    current; the usual choice when correctness matters more than the last 30 percent of
    speed

**What to do.**

- Use complete formulas, or a curve whose natural law is complete (Edwards,
  ristretto255). If you must use incomplete formulas, write down why every exceptional
  case is impossible in your ladder and test the boundary scalars ($1$, $2$, $n - 1$,
  $n - 2$).
- Represent the identity explicitly, never as a special flag that code branches on.

## 6.11 Scalar-length leaks: Minerva and TPM-Fail

*Level: intermediate.*

An ECDSA signature is one linear equation in two secrets, the private key and the nonce
$k$. Knowing a few bits of $k$ for each of a few hundred signatures is enough for a lattice
to solve for the key: the hidden number problem of Cryptanalysis
[§14.6](../cryptanalysis/14-Attacks-on-Signatures-and-Nonces.md). The cheapest bits to
leak are the top ones, because a scalar multiplication that starts at the top set bit of
$k$ runs one step shorter for every leading zero. Half of all nonces have a leading zero,
a quarter two, one in 256 eight. An attacker who times signatures and keeps the fastest
has a set of nonces with known zero bits at the top.

**Minerva (2019).** Jan Jančár, Vladimír Sedláček, Petr Švenda and Marek Sýs, at Masaryk
University in Brno, found this leak first in a smart card on an Atmel AT90SC chip, certified
under FIPS 140-2 and Common Criteria, and then in five libraries: libgcrypt, wolfSSL,
MatrixSSL, the SunEC provider of Java, and Crypto++. Each computed $kG$ in a time that
grew with the bit length of $k$. With an improved lattice step that used each signature's
estimated length, they recovered keys from a few hundred to a couple of thousand
signatures. The libraries were patched; the certified card could not be. The full attack
is in Cryptanalysis [§14.7](../cryptanalysis/14-Attacks-on-Signatures-and-Nonces.md).

**TPM-Fail (2019).** The same year Daniel Moghimi, Berk Sunar, Thomas Eisenbarth and Nadia
Heninger found the same leak in trusted platform modules, the chips that hold keys for
disk encryption and attestation. Intel's firmware TPM leaked the nonce length in ECDSA and
EC-Schnorr signing and gave up its key after about 1,300 signatures; a hardware TPM from
STMicroelectronics, certified at Common Criteria EAL 4+, fell to fewer than 40,000. They
also recovered the key of a strongSwan VPN server held in the Intel TPM by timing about
45,000 handshakes over the network. Intel and STMicroelectronics shipped fixes
(CVE-2019-11090, CVE-2019-16863).

The fix is the same in both cases and costs almost nothing: make every scalar the same
length before the loop sees it. Since $kG = (k + n)G = (k + 2n)G$, add $n$, and if the sum
is still short, add $2n$ instead; for P-256, one of the two always has exactly 257 bits.
The choice is made with a mask:

```python
import random
from collections import Counter

n = 0xFFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551   # P-256's group order

def steps_leaky(k):          # double-and-add from the top set bit: one doubling per bit of k
    return k.bit_length()

def fixed_length(k):         # k + n or k + 2n: same point, always n.bit_length() + 1 bits
    k1, k2 = k + n, k + 2 * n
    short = 1 - (k1 >> n.bit_length())        # 1 when k + n is still a 256-bit number
    return (k1 & (short - 1)) | (k2 & -short)  # pick by mask, not by branch

rng = random.Random(2019)                   # a simulation; real nonces come from secrets or RFC 6979
nonces = [rng.randrange(1, n) for _ in range(100000)]
leaky = Counter(steps_leaky(k) for k in nonces)
print("double-and-add steps, leaky:", sorted(leaky.items(), reverse=True)[:6])
fast = [k for k in nonces if steps_leaky(k) <= 248]     # the fastest signatures...
print(len(fast), "nonces with 8 or more known zero bits, all below 2^248:", all(k < 2**248 for k in fast))
fixed = Counter(fixed_length(k).bit_length() for k in nonces)
print("steps, fixed length:", dict(fixed))
print("same nonce mod n:", all(fixed_length(k) % n == k for k in nonces))
```

```text
double-and-add steps, leaky: [(256, 49880), (255, 24968), (254, 12561), (253, 6339), (252, 3177), (251, 1554)]
398 nonces with 8 or more known zero bits, all below 2^248: True
steps, fixed length: {257: 100000}
same nonce mod n: True
```

In the leaky version, a timing attacker who keeps the fastest 0.4 percent of 100,000
signatures holds 398 nonces each known to start with at least eight zero bits, more than
enough for the lattice. With the fixed length, every scalar multiplication runs 257 steps.
The ladders of §6.5 and §6.6 already run a fixed number of steps; X25519 gets the same
effect from clamping, which sets bit 254 of every scalar.

!!! note "Life story: Minerva"
    **Born:** 2019, Jančár, Sedláček, Švenda and Sýs (Masaryk University); "Minerva: The
    curse of ECDSA nonces", CHES 2020 · **Purpose:** to show that the time of $kG$ still
    gave away the nonce length in a certified smart card and five libraries · **Helped:**
    patches to libgcrypt, wolfSSL, MatrixSSL, SunEC and Crypto++; a public test tool ·
    **Status:** the standard test for nonce-length leaks in ECDSA implementations

!!! note "Life story: TPM-Fail"
    **Born:** November 2019, Moghimi, Sunar, Eisenbarth and Heninger; USENIX Security 2020
    · **Purpose:** to show that certified TPMs leaked ECDSA nonce lengths through signing
    time, locally and over a network · **Helped:** firmware fixes for Intel's fTPM
    (CVE-2019-11090) and STMicroelectronics' TPM (CVE-2019-16863) · **Status:** patched;
    a reminder that certification did not test for timing

**What to do.**

- Fix the length of every secret scalar before multiplying: $k + n$ or $k + 2n$ chosen by
  mask, or a ladder over a fixed number of bits with leading zeros included.
- Do the same for the modular inverse of $k$ and every other operation on the nonce: use
  a constant-time inversion, such as Fermat's $k^{n-2}$ with a fixed ladder.
- Test with a timing harness that groups signatures by nonce length
  ([§5.12](05-Constant-Time-Programming.md) builds one style of test).

## 6.12 Nonces you cannot get wrong: RFC 6979, and a signer put together

*Level: intermediate.*

The most famous nonce failure had nothing subtle about it. Sony signed PlayStation 3
software with ECDSA and used the same $k$ for every signature. At the 27th Chaos
Communication Congress, on December 29, 2010, the fail0verflow group showed that two
signatures with one nonce give the private key by simple algebra, and on January 2, 2011
George Hotz published a root signing key computed that way. Cryptanalysis
[§14.4](../cryptanalysis/14-Attacks-on-Signatures-and-Nonces.md) tells the story and
works the algebra; the Android Bitcoin wallets of 2013 lost coins the same way, through a
broken random generator ([Chapter 4](04-Randomness-in-Practice.md)).

**RFC 6979** (Thomas Pornin, August 2013) takes the random generator out of signing. It
derives $k$ from the private key and the message hash with HMAC_DRBG
([Chapter 4](04-Randomness-in-Practice.md) builds that generator), drawing candidates
until one falls in $[1, n - 1]$. The same key and message always give the same $k$; a
different message gives an unrelated one; and since rejection sampling, not reduction,
picks $k$, there is no bias. Verifiers see ordinary ECDSA. FIPS 186-5 (2023) approves this
deterministic ECDSA, and EdDSA builds the same idea into its definition. A deterministic
nonce has one weakness of its own: signing the same message twice with a fault in one of
the runs leaks the key, so hardware exposed to glitches mixes in fresh randomness as well
("hedged" signing, which RFC 6979 §3.6 permits; Cryptanalysis
[§14.8](../cryptanalysis/14-Attacks-on-Signatures-and-Nonces.md)).

**Code it.** Everything in this chapter's second half, in one signer: RFC 6979 nonces,
fixed-length scalars, a ladder with swaps by mask, complete addition, and verification
before release. It reproduces the P-256, SHA-256 vector for the message "sample" from
RFC 6979 appendix A.2.5:

```python
import hashlib, hmac

# P-256
p = 2**256 - 2**224 + 2**192 + 2**96 - 1
a, b = p - 3, 0x5AC635D8AA3A93E7B3EBBD55769886BC651D06B0CC53B0F63BCE3C3E27D2604B
n = 0xFFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551
G = (0x6B17D1F2E12C4247F8BCE6E563A440F277037D812DEB33A0F4A13945D898C296,
     0x4FE342E2FE1A7F9B8EE7EB4A7C0F9E162BCE33576B315ECECBB6406837BF51F5, 1)

def add(P, Q):                               # complete addition (Renes, Costello, Batina 2016)
    X1, Y1, Z1 = P
    X2, Y2, Z2 = Q
    b3 = 3 * b % p
    t0, t1, t2 = X1 * X2 % p, Y1 * Y2 % p, Z1 * Z2 % p
    t3 = ((X1 + Y1) * (X2 + Y2) - t0 - t1) % p
    t4 = ((X1 + Z1) * (X2 + Z2) - t0 - t2) % p
    t5 = ((Y1 + Z1) * (Y2 + Z2) - t1 - t2) % p
    Z3 = (a * t4 + b3 * t2) % p
    X3, Z3 = (t1 - Z3) % p, (t1 + Z3) % p
    Y3 = X3 * Z3 % p
    t1 = (3 * t0 + a * t2) % p
    t2 = a * (t0 - a * t2) % p
    t4 = (b3 * t4 + t2) % p
    return (t3 * X3 - t5 * t4) % p, (Y3 + t1 * t4) % p, (t5 * Z3 + t3 * t1) % p

def cswap(bit, P, Q):
    m = -bit
    pairs = [(x, y, m & (x ^ y)) for x, y in zip(P, Q)]
    return tuple(x ^ t for x, _, t in pairs), tuple(y ^ t for _, y, t in pairs)

def scalar_mul(k, P):                        # fixed-length ladder: 257 identical steps
    k1, k2 = k + n, k + 2 * n
    short = 1 - (k1 >> 256)
    k = (k1 & (short - 1)) | (k2 & -short)   # same point, always 257 bits
    R0, R1 = (0, 1, 0), P
    for i in range(256, -1, -1):
        bit = (k >> i) & 1
        R0, R1 = cswap(bit, R0, R1)
        R0, R1 = add(R0, R0), add(R0, R1)
        R0, R1 = cswap(bit, R0, R1)
    return R0

def x_affine(P):
    return P[0] * pow(P[2], -1, p) % p

def rfc6979_nonce(x, h1):                    # RFC 6979 section 3.2, SHA-256, qlen = 256
    mac = lambda key, data: hmac.new(key, data, hashlib.sha256).digest()
    xb = x.to_bytes(32, "big")
    hb = (int.from_bytes(h1, "big") % n).to_bytes(32, "big")
    V, K = b"\x01" * 32, b"\x00" * 32
    K = mac(K, V + b"\x00" + xb + hb); V = mac(K, V)
    K = mac(K, V + b"\x01" + xb + hb); V = mac(K, V)
    while True:
        V = mac(K, V)
        k = int.from_bytes(V, "big")
        if 1 <= k < n:
            return k
        K = mac(K, V + b"\x00"); V = mac(K, V)

def verify(U, h, r, s):
    if not (1 <= r < n and 1 <= s < n):
        return False
    w = pow(s, -1, n)
    R = add(scalar_mul(h * w % n, G), scalar_mul(r * w % n, U))
    return R[2] != 0 and x_affine(R) % n == r

def sign(x, U, msg):
    h1 = hashlib.sha256(msg).digest()
    h = int.from_bytes(h1, "big") % n
    k = rfc6979_nonce(x, h1)
    r = x_affine(scalar_mul(k, G)) % n
    s = pow(k, -1, n) * (h + r * x) % n
    if r == 0 or s == 0 or not verify(U, h, r, s):   # verify before release
        raise RuntimeError("signing failed its check")
    return k, r, s

# RFC 6979 appendix A.2.5: P-256, SHA-256, message "sample"
x = 0xC9AFA9D845BA75166B5C215767B1D6934E50C3DB36E89B127B8A622B120F6721
U = scalar_mul(x, G)
print(x_affine(U) == 0x60FED4BA255A9D31C961EB74C6356D68C049B8923B61FA6CE669622E60F29FB6)
k, r, s = sign(x, U, b"sample")
print(k == 0xA6E3C57DD01ABE90086538398355DD4C3B17AA873382B0F24D6129493D8AAD60)
print(r == 0xEFD48B2AACB6A8FD1140DD9CD45E81D69D2C877B56AAF991C34D0EA84EAF3716)
print(s == 0xF7CB1C942D657C41D436C7A1B6E29F65F3E900DBB9AFF4064DC4AB2F843ACDA8)
```

```text
True
True
True
True
```

The four lines are the public key's $x$-coordinate, the nonce, $r$ and $s$, each equal to
the value printed in RFC 6979. The nonce matching means HMAC_DRBG is right; $r$ matching
means about 500 complete additions inside the ladder were right; $s$ matching means the
modular arithmetic of the signing equation was right; and `sign` ran `verify` on the
result before returning it. What Python cannot fix is `pow` for the inverses and the
variable-time integers underneath; a real library replaces both with constant-time code.

!!! note "Life story: RFC 6979, deterministic nonces"
    **Born:** August 2013, Thomas Pornin, RFC 6979 "Deterministic Usage of the Digital
    Signature Algorithm (DSA) and Elliptic Curve Digital Signature Algorithm (ECDSA)",
    after the PS3 key (2010) and the Android wallet thefts (2013) · **Purpose:** nonces
    that cannot repeat, be predicted or be biased, with no random generator at signing
    time and no change for verifiers · **Helped:** adopted by Bitcoin's libsecp256k1
    and many other libraries, others use hedged variants; approved in FIPS 186-5 (2023) ·
    **Status:** current; hedged variants that add randomness are preferred where fault
    attacks are a threat

**What to do.**

- Generate ECDSA nonces with RFC 6979, or hedged RFC 6979 on hardware exposed to faults.
  Never with a plain call to a random generator, never by reducing a too-short random
  number modulo $n$.
- Use EdDSA (Ed25519) for new designs that do not need ECDSA.
- Put the defenses together: fixed-length scalars, uniform ladder, complete formulas,
  constant-time inversion, and verification of every signature before release.

## 6.13 Going deeper

*Level: expert.*

**Unsaturated limbs and lazy carries.** Fast field code on 64-bit processors does not
fill its limbs. Curve25519 implementations hold a field element in five 51-bit limbs, so
that sums of several products fit in 128-bit accumulators and carries can be propagated
once per multiplication instead of after every step. The price is that "is this value
reduced?" stops having a simple answer, and every function has a precondition on the
size of its limbs. Getting those bounds right by hand is where the carry bugs of §6.2 came
from.

**Verified arithmetic.** That is why field arithmetic has become the most successful target
of formal verification in cryptography. Fiat-Crypto (Andres Erbsen, Jade Philipoom, Jason
Gross, Robert Sloan and Adam Chlipala, 2019) generates C and assembly for any prime from a
proof in Coq, and its code runs in BoringSSL for Curve25519 and P-256; HACL* generates
verified C, in Firefox and the Linux kernel; AWS's s2n-bignum proves its assembly
correct in HOL Light. [Chapter 17](17-Choosing-Testing-and-Verifying.md) covers them.

**Hashing to curves.** The try-and-increment `hash_to_point` of §6.9 runs a number of
loops that depends on its input. For a public input that is harmless; for a secret, it is
a timing leak, and it broke WPA3: the Dragonblood attacks of Mathy Vanhoef and Eyal Ronen
(2019) recovered Wi-Fi passwords from the timing and cache behavior of SAE's
"hunting and pecking" loop ([Protocols, Chapter 9](../protocols/09-Wi-Fi-Security.md)).
RFC 9380 (2023) standardizes constant-time maps from strings to curve points.

**Fault-resistant CRT.** Verify-before-release (§6.7) is the simplest countermeasure.
Adi Shamir proposed in 1997 to compute modulo $pr$ and $qr$ for a small random $r$ and
compare the results modulo $r$; Christian Aumüller and colleagues (CHES 2002) measured
real fault attacks on smart cards and showed which checks survive them. Infective
countermeasures go further and make a faulty result random instead of withholding it,
so that a fault on the check itself gains nothing. [Chapter 7](07-Masking-and-Fault-Resistance.md)
builds them.

**Constant-time inversion.** Fermat inversion costs a full exponentiation. Daniel
Bernstein and Bo-Yin Yang's "safegcd" (2019) gives a constant-time extended-gcd that is
several times faster, and has been adopted (and formally checked) in libsecp256k1.

## Check yourself

??? question "1. With 64-bit limbs, why is the carry out of $x_i + y_i + c$ always 0 or 1?"

    Each limb is at most $2^{64} - 1$ and the incoming carry at most 1, so the sum is at
    most $2(2^{64} - 1) + 1 = 2^{65} - 1$, which is below $2 \cdot 2^{64}$. The part above
    the low 64 bits is therefore 0 or 1.

??? question "2. Ten million random additions of 256-bit numbers on 64-bit limbs all agree with a reference. Why is that weak evidence against a bug like `add_fast` in §6.2?"

    That bug shows only when a carry must cross two limbs, which needs a limb sum of
    exactly $2^{64} - 1$ before the incoming carry: a chance of about $2^{-64}$ per limb.
    Ten million tests come nowhere near it. Edge cases such as $(2^{256} - 1) + 1$ find it
    at once.

??? question "3. Multiply $21 \times 43$ by Karatsuba in base 10."

    $x_1 = 2$, $x_0 = 1$, $y_1 = 4$, $y_0 = 3$. $z_2 = 8$, $z_0 = 3$, and
    $z_1 = (1 + 2)(3 + 4) - 8 - 3 = 10$. The product is $8 \cdot 100 + 10 \cdot 10 + 3 = 903$.

??? question "4. In word-by-word Montgomery, why does $m = t_0 \, n_0' \bmod B$ make $t + mN$ divisible by $B$?"

    Modulo $B$, $t + mN \equiv t_0 + t_0 n_0' N_0 \equiv t_0 (1 + n_0' N) \equiv
    t_0 (1 - N^{-1} N) \equiv 0$, since $n_0' = -N^{-1} \bmod B$ and only the low limb of
    $N$ matters modulo $B$.

??? question "5. Base blinding leaves the data-dependent extra reduction in place. Why does it still stop Brumley and Boneh's attack?"

    The attack needs the value being exponentiated to be one the attacker chose, so that
    the timing can be compared across chosen values near $p$. With blinding the
    exponentiation works on $m r^e$ for a fresh random $r$, a value unknown to the
    attacker and unrelated to its choice, so the timing carries no information about
    where $p$ lies. (Constant-time reduction is still wise, as defense in depth.)

??? question "6. Why does base blinding not protect against the CRT fault attack?"

    Unblinding multiplies by $r^{-1} \bmod N$, which is correct modulo both $p$ and $q$.
    A signature that a fault made wrong modulo $p$ and right modulo $q$ stays that way, and
    $\gcd(s'^e - m, N)$ still gives $q$. Only checking the signature before release stops it.

??? question "7. What do the two parts of X25519's clamping achieve?"

    Clearing the low three bits makes the scalar a multiple of the cofactor 8, so any
    small-order component of the received point is multiplied away. Clearing bit 255 and
    setting bit 254 gives every scalar the same top bit, so the ladder always runs the
    same number of steps and no implementation is tempted to start at the top set bit.

??? question "8. A service uses the 32-byte encoding of an Ed25519 public key as an account ID. What can go wrong, and what are two fixes?"

    $A$ and $A + T$, with $T$ of small order, are different encodings, and a verifier that
    multiplies its equation by the cofactor accepts signatures for both, so one key can
    own two accounts (or two keys can look like one, depending on the verifier). Fixes:
    reject points with $\ell A \ne \mathcal{O}$ (or with a small-order component) at
    registration, or use ristretto255, where each group element has one encoding.

??? question "9. For P-256, show that one of $k + n$ and $k + 2n$ always has exactly 257 bits, for $0 < k < n$."

    $2^{255} < n < 2^{256}$. If $k + n \ge 2^{256}$, it has 257 bits, since
    $k + n < 2n < 2^{257}$. Otherwise $k + n < 2^{256}$, and then
    $2^{256} < 2n \le k + 2n = (k + n) + n < 2^{256} + 2^{256} = 2^{257}$, so $k + 2n$ has
    257 bits. Both are congruent to $k$ modulo $n$, so the point is the same.

??? question "10. RFC 6979 removes the random generator from ECDSA. Why does that make a single fault more dangerous than before?"

    Signing the same message twice gives the same nonce twice. If one of the two runs is
    faulted after $k$ is fixed (in the computation of $r$ or of $s$), the attacker has two
    equations with the same unknown nonce and can solve for the key. With a random nonce
    the two runs would be unrelated. Hedged signing, which mixes fresh randomness into
    the RFC 6979 derivation, and verifying before release both answer it.

## What you learned

- Big numbers are arrays of limbs. Addition, subtraction and multiplication carry between
  them, a $w \times w \to 2w$-bit multiply is all they need, and carries that must cross
  several limbs are the classic bug: rare, invisible to random tests, and found in OpenSSL
  from 2011 to 2017.
- Karatsuba replaces four half-size products with three, which pays above a tuned
  threshold; its control flow depends only on sizes, which must be public and fixed.
- Montgomery reduction works one limb at a time with one precomputed limb, and Barrett
  with one precomputed reciprocal; both end in a correction that must be done always and
  kept by mask, because the conditional version leaked RSA keys across a network.
- Square-and-multiply spells its exponent in a power trace; a ladder or fixed window over
  a fixed length does the same work for every bit.
- X25519 is a Montgomery ladder on $2^{255} - 19$ with clamping and $x$-only inputs; write
  it to RFC 7748 and check it on every vector, including the iterated ones.
- RSA private-key code needs base blinding against timing and a verify-before-release
  check against faults; neither replaces the other.
- Every received point must be validated (identity, range, curve, subgroup). On cofactor
  curves, missing subgroup checks let CryptoNote coins be spent twice; prime-order groups
  such as ristretto255 remove the problem.
- Complete addition formulas end exceptional-case bugs; fixed-length scalars end the
  length leaks of Minerva and TPM-Fail; RFC 6979 ends nonce reuse and bias. A careful
  signer uses all of them and checks its own output.

**Next:** [Chapter 7](07-Masking-and-Fault-Resistance.md), where the attacker holds a
probe or a laser: masking against power analysis, and fault resistance beyond the
verify-before-release check.

## Further reading

- A. Karatsuba and Yu. Ofman, "Multiplication of Many-Digital Numbers by Automatic
  Computers", *Doklady Akademii Nauk SSSR* 145 (1962).
- Peter Montgomery, "Modular Multiplication Without Trial Division", *Mathematics of
  Computation* 44 (1985); "Speeding the Pollard and Elliptic Curve Methods of
  Factorization", *Mathematics of Computation* 48 (1987), for the ladder.
- Paul Barrett, "Implementing the Rivest Shamir and Adleman Public Key Encryption
  Algorithm on a Standard Digital Signal Processor" (CRYPTO 1986).
- Çetin Koç, Tolga Acar and Burton Kaliski, "Analyzing and Comparing Montgomery
  Multiplication Algorithms", *IEEE Micro* 16 (1996).
- Alfred Menezes, Paul van Oorschot and Scott Vanstone, *Handbook of Applied Cryptography*
  (CRC Press, 1996), Chapter 14.
- Paul Kocher, "Timing Attacks on Implementations of Diffie-Hellman, RSA, DSS, and Other
  Systems" (CRYPTO 1996).
- Colin Walter, "Montgomery Exponentiation Needs No Final Subtractions", *Electronics
  Letters* 35 (1999).
- Werner Schindler, "A Timing Attack against RSA with the Chinese Remainder Theorem"
  (CHES 2000).
- [David Brumley and Dan Boneh, "Remote Timing Attacks are Practical" (USENIX Security
  2003)](https://crypto.stanford.edu/~dabo/papers/ssl-timing.pdf).
- Colin Percival, "Cache Missing for Fun and Profit" (BSDCan 2005).
- Daniel J. Bernstein and others, "Sliding Right into Disaster: Left-to-Right Sliding
  Windows Leak" (CHES 2017).
- [Billy Bob Brumley, Manuel Barbosa, Dan Page and Frederik Vercauteren, "Practical
  Realisation and Elimination of an ECC-Related Software Bug Attack" (CT-RSA
  2012)](https://eprint.iacr.org/2011/633).
- [OpenSSL security advisories](https://openssl-library.org/news/vulnerabilities/), for
  CVE-2015-3193, CVE-2016-7055, CVE-2017-3732, CVE-2017-3736 and CVE-2017-3738.
- Daniel J. Bernstein, "Curve25519: New Diffie-Hellman Speed Records" (PKC 2006).
- RFC 7748, Elliptic Curves for Security (Langley, Hamburg, Turner, 2016).
- Dan Boneh, Richard DeMillo and Richard Lipton, "On the Importance of Checking
  Cryptographic Protocols for Faults" (EUROCRYPT 1997).
- Ingrid Biehl, Bernd Meyer and Volker Müller, "Differential Fault Attacks on Elliptic
  Curve Cryptosystems" (CRYPTO 2000); Adrian Antipa, Daniel Brown, Alfred Menezes, René
  Struik and Scott Vanstone, "Validation of Elliptic Curve Public Keys" (PKC 2003).
- SP 800-56A Rev. 3, Recommendation for Pair-Wise Key-Establishment Schemes Using
  Discrete Logarithm Cryptography (2018), section 5.6.2.3.
- Tibor Jager, Jörg Schwenk and Juraj Somorovsky, "Practical Invalid Curve Attacks on
  TLS-ECDH" (ESORICS 2015).
- [Eli Biham and Lior Neumann, "Breaking the Bluetooth Pairing: The Fixed Coordinate
  Invalid Curve Attack" (SAC 2019)](https://biham.cs.technion.ac.il/BT/bt-fixed-coordinate-invalid-curve-attack.pdf).
- National Security Agency, "Patch Critical Cryptographic Vulnerability in Microsoft
  Windows Clients and Servers" (CVE-2020-0601, January 2020).
- [Monero, "Disclosure of a Major Bug in CryptoNote Based Currencies" (May 17,
  2017)](https://web.getmonero.org/2017/05/17/disclosure-of-a-major-bug-in-cryptonote-based-currencies.html);
  Jonas Nick, "Exploiting Low Order Generators in One-Time Ring Signatures" (May 2017).
- Mike Hamburg, "Decaf: Eliminating Cofactors through Point Compression" (CRYPTO 2015);
  RFC 9496, The ristretto255 and decaf448 Groups (2023).
- Konstantinos Chalkias, François Garillot and Valeria Nikolaenko, "Taming the Many
  EdDSAs" (SSR 2020).
- Tetsuya Izu and Tsuyoshi Takagi, "Exceptional Procedure Attack on Elliptic Curve
  Cryptosystems" (PKC 2003).
- Daniel J. Bernstein and Tanja Lange, "Faster Addition and Doubling on Elliptic Curves"
  (ASIACRYPT 2007).
- Joost Renes, Craig Costello and Lejla Batina, "Complete Addition Formulas for Prime
  Order Elliptic Curves" (EUROCRYPT 2016).
- Jan Jančár, Vladimír Sedláček, Petr Švenda and Marek Sýs, "Minerva: The Curse of ECDSA
  Nonces" (CHES 2020).
- Daniel Moghimi, Berk Sunar, Thomas Eisenbarth and Nadia Heninger, "TPM-Fail: TPM meets
  Timing and Lattice Attacks" (USENIX Security 2020).
- RFC 6979, Deterministic Usage of the Digital Signature Algorithm (DSA) and Elliptic
  Curve Digital Signature Algorithm (ECDSA) (Pornin, 2013); FIPS 186-5, Digital Signature
  Standard (2023).
- fail0verflow, "Console Hacking 2010: PS3 Epic Fail" (27th Chaos Communication
  Congress, December 2010).
- Andres Erbsen, Jade Philipoom, Jason Gross, Robert Sloan and Adam Chlipala, "Simple
  High-Level Code for Cryptographic Arithmetic, with Proofs, without Compromises" (IEEE
  Symposium on Security and Privacy 2019).
- Mathy Vanhoef and Eyal Ronen, "Dragonblood: Analyzing the Dragonfly Handshake of WPA3
  and EAP-pwd" (IEEE Symposium on Security and Privacy 2020); RFC 9380, Hashing to
  Elliptic Curves (2023).
- Daniel J. Bernstein and Bo-Yin Yang, "Fast Constant-Time GCD Computation and Modular
  Inversion" (CHES 2019).
