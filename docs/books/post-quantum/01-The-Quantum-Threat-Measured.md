# 1. The Quantum Threat, Measured

*Every public-key system in daily use, RSA, Diffie-Hellman and the elliptic curves,
rests on a problem that a large enough quantum computer would solve. No such machine
exists yet, and nobody knows when one will. This chapter turns that vague worry into
numbers. You will list exactly which pieces of cryptography fall and which only
bend, run the classical half of Shor's algorithm on real numbers, follow a resource
estimate from logical qubits down to physical ones, read the published estimates
from 2019 to 2026 the way an engineer reads them, and work Mosca's inequality on a
real archive, including one kept on Mars.*

!!! abstract "In this chapter"
    **You will learn:**

    - which algorithms a quantum computer breaks outright, which it weakens, and why
      the line falls where it does;
    - how Shor's algorithm turns factoring into finding a period, with the classical
      steps done by hand and in code;
    - why Grover's algorithm does not halve the strength of AES in practice;
    - how a resource estimate goes from logical qubits and gate counts to physical
      qubits and running time, and how to read the published ones;
    - how far real machines are from the estimates, and how to spot an overblown claim;
    - how to work Mosca's inequality with real numbers and decide what to migrate first.

    **You need:** book 1's [Chapter 20](../../book/20-Quantum-Computers.md) helps but is
    not required; this chapter repeats what it needs. Modular arithmetic from
    [Chapter 3](../../book/03-The-Arithmetic-of-Secrets.md) of book 1, and RSA and
    Diffie-Hellman at the level of [Chapters 12](../../book/12-Diffie-Hellman.md) and
    [13](../../book/13-RSA.md).

    **Levels:** §1.1 to §1.4 are for beginners, §1.5 to §1.10 are intermediate,
    §1.11 is expert.

## 1.1 The problem

*Level: beginner.*

Imagine a hospital that keeps every patient's record for the length of a life and
then some: seventy, eighty, a hundred years. Records travel between clinics,
laboratories and insurers, and on the way they are encrypted with TLS, the protocol
behind the padlock in a browser. The bulk of each message is protected by AES, a
symmetric cipher. The AES key itself was agreed a moment before, by an elliptic-curve
Diffie-Hellman exchange, and the server proved who it was with an RSA or ECDSA
signature.

Now imagine someone records that traffic. They cannot read it today. They do not
need to. Disk space costs a few dollars per terabyte, and a recording made in 2026
will still be on a disk in 2046. If at any point in those twenty years a machine
appears that can solve the elliptic-curve discrete logarithm problem, the recorder
replays the handshake, recovers the Diffie-Hellman secret, derives the AES key and
reads every record. The patients' privacy was meant to last for their lives. It
lasted until the machine was built.

That machine is a **cryptographically relevant quantum computer**, a CRQC for short.
It is not a faster ordinary computer. It is a different kind of device, one that
stores information in quantum states and, for a few special problems, finds answers
with exponentially fewer steps than any known classical method. Factoring large
numbers and computing discrete logarithms are two of those problems, and between
them they hold up nearly all the public-key cryptography in use on Earth.

The same story can be told about a place farther away. A settlement on Mars talks to
Earth through relay satellites and deep-space antennas, with a delay of between
about 3 and 22 minutes each way. Everything it sends home, medical scans, engineering
logs, votes, private letters, crosses open radio links that anyone with a large dish
can record. The settlement will run for generations. If its links use today's
public-key cryptography, every message ever sent is a sealed envelope that opens on
the day a CRQC is switched on, wherever in the solar system that happens.

So the questions of this book are practical ones. Which parts of cryptography does a
quantum computer actually break? How large must the machine be, and how sure can we
be about when it arrives? What replaces the broken parts, how well are the
replacements understood, and how does a whole planet, or two, move over to them?
This chapter answers the first three questions with numbers. The rest of the book
answers the others.

The history is short and fast. Peter Shor, then at AT&T Bell Laboratories, found in
1994 that a quantum computer could factor integers and compute discrete logarithms
in polynomial time. Two years later Lov Grover, also at Bell Labs, found a quantum
search that needs only about the square root of the usual number of guesses. For
twenty years these were theorems about machines that did not exist. Physicists built
devices with a handful of qubits, then dozens, then a hundred and more, and
engineers learned how to correct their errors. In 2015 the US National Security
Agency announced that it planned to move to quantum-resistant algorithms. In
December 2016 the US National Institute of Standards and Technology, NIST, called
for proposals for new public-key standards. In August 2024 it published the first
three: FIPS 203, FIPS 204 and FIPS 205. Figure 1.1 puts the main events on one line.

<figure class="mars-fig">
<svg viewBox="0 0 640 448" width="640" role="img" aria-label="Timeline of the quantum threat from Shor's algorithm in 1994 to NIST's final transition report in 2026" fill="currentColor" font-size="14">
<line x1="92" y1="8" x2="92" y2="440" stroke="currentColor" stroke-width="1.6"/>
<text x="78" y="27" text-anchor="end" font-weight="bold" class="acc-fill">1994</text>
<circle cx="92" cy="22" r="4.5" class="acc-fill"/>
<text x="108" y="27" class="acc-fill">Shor: factoring and discrete logs in polynomial time</text>
<text x="78" y="53" text-anchor="end" font-weight="bold">1996</text>
<circle cx="92" cy="48" r="3.5"/>
<text x="108" y="53">Grover: search in about the square root of the guesses</text>
<text x="78" y="79" text-anchor="end" font-weight="bold">2001</text>
<circle cx="92" cy="74" r="3.5"/>
<text x="108" y="79">IBM factors 15 with Shor's algorithm on 7 NMR qubits</text>
<text x="78" y="105" text-anchor="end" font-weight="bold">2015</text>
<circle cx="92" cy="100" r="3.5"/>
<text x="108" y="105">NSA announces a move to quantum-resistant algorithms</text>
<text x="78" y="131" text-anchor="end" font-weight="bold">2016</text>
<circle cx="92" cy="126" r="3.5"/>
<text x="108" y="131">NIST calls for post-quantum proposals</text>
<text x="78" y="157" text-anchor="end" font-weight="bold">2019</text>
<circle cx="92" cy="152" r="3.5"/>
<text x="108" y="157">Gidney and Ekerå: RSA-2048 with 20 million noisy qubits</text>
<text x="78" y="183" text-anchor="end" font-weight="bold">2022</text>
<circle cx="92" cy="178" r="3.5"/>
<text x="108" y="183">NIST picks Kyber, Dilithium, Falcon, SPHINCS+; CNSA 2.0</text>
<text x="78" y="209" text-anchor="end" font-weight="bold" class="acc-fill">2022</text>
<circle cx="92" cy="204" r="4.5" class="acc-fill"/>
<text x="108" y="209" class="acc-fill">Rainbow and SIKE broken on ordinary computers</text>
<text x="78" y="235" text-anchor="end" font-weight="bold">2023</text>
<circle cx="92" cy="230" r="3.5"/>
<text x="108" y="235">Chrome tests hybrid post-quantum key exchange</text>
<text x="78" y="261" text-anchor="end" font-weight="bold">2024</text>
<circle cx="92" cy="256" r="3.5"/>
<text x="108" y="261">FIPS 203, 204, 205 published (August)</text>
<text x="78" y="287" text-anchor="end" font-weight="bold">2024</text>
<circle cx="92" cy="282" r="3.5"/>
<text x="108" y="287">Google's Willow chip: error correction below threshold</text>
<text x="78" y="313" text-anchor="end" font-weight="bold">2025</text>
<circle cx="92" cy="308" r="3.5"/>
<text x="108" y="313">HQC chosen; Gidney: RSA-2048 under a million qubits</text>
<text x="78" y="339" text-anchor="end" font-weight="bold">2025</text>
<circle cx="92" cy="334" r="3.5"/>
<text x="108" y="339">About half of human web traffic to Cloudflare is hybrid</text>
<text x="78" y="365" text-anchor="end" font-weight="bold">2026</text>
<circle cx="92" cy="360" r="3.5"/>
<text x="108" y="365">Nine signature schemes enter NIST's third round (May)</text>
<text x="78" y="391" text-anchor="end" font-weight="bold">2026</text>
<circle cx="92" cy="386" r="3.5"/>
<text x="108" y="391">NIST IR 8547 final: deprecate after 2030, disallow after 2035</text>
<text x="78" y="417" text-anchor="end" font-weight="bold">?</text>
<circle cx="92" cy="412" r="3.5"/>
<text x="108" y="417">The first cryptographically relevant quantum computer</text>
</svg>
<figcaption>Figure 1.1. Thirty years of the quantum threat. Accent marks the breaks: the theory in 1994, and in 2022 two candidate replacements that fell to ordinary computers, a reminder that new schemes carry their own risk.</figcaption>
</figure>

One line in Figure 1.1 deserves attention before anything else. In 2022, two of the
schemes proposed as replacements were broken, not by quantum computers, but by
ordinary mathematicians with ordinary laptops. That is the second half of the
problem. Moving away from RSA and elliptic curves is necessary; moving to something
new carries its own danger, because new mathematics has had less time to be
attacked. Much of this book is about how the post-quantum schemes earned, or failed
to earn, their trust.

## 1.2 What falls and what bends

*Level: beginner.*

A quantum computer is not a universal code-breaker. It speeds up some problems
enormously, some a little, and most not at all. For cryptography the line is sharp,
and it is worth drawing carefully.

**What falls.** Shor's algorithm solves, in time that grows only polynomially with
the key size, two families of problems:

- **factoring** a large integer $N = pq$, which breaks RSA encryption and RSA
  signatures;
- **discrete logarithms** in a finite cyclic group, which breaks finite-field
  Diffie-Hellman, DSA, ElGamal, elliptic-curve Diffie-Hellman (ECDH, X25519,
  X448), ECDSA, EdDSA (Ed25519, Ed448), Schnorr signatures, and the pairing-based
  schemes such as BLS signatures.

Both are special cases of one mathematical task, the **hidden subgroup problem** for
an abelian (commutative) group. A function on the group is constant on the cosets of
some unknown subgroup, and the task is to find that subgroup. For factoring, the
group is the integers under addition and the hidden subgroup is the multiples of a
period. For discrete logarithms, the group is pairs of integers and the hidden
subgroup is a line whose slope is the logarithm. A quantum computer finds hidden
subgroups of abelian groups efficiently, using the quantum Fourier transform. That is
the whole reason RSA and elliptic curves fall together: under the surface they are
the same kind of problem.

"Falls" here means more than "gets weaker". Larger keys do not help in any useful
way. Doubling an RSA modulus from 2,048 to 4,096 bits makes Shor's algorithm only a
few times more expensive, roughly eight times in the crudest count, because the cost
grows like the cube of the key length. Classical attacks, by contrast, become
astronomically harder. Against a quantum computer, a bigger RSA key buys a few years
at most, and only while machines are small.

**What bends.** Grover's algorithm searches an unstructured space of $N$ possibilities
in about $\sqrt{N}$ steps instead of $N/2$. Applied to a cipher key, it means a $k$-bit
key could in principle be found in about $2^{k/2}$ quantum steps. Applied to finding a
preimage of a hash, the same. For collisions of a hash function there is a quantum
algorithm by Brassard, Høyer and Tapp (1997) that in theory needs about $2^{n/3}$
evaluations instead of the classical $2^{n/2}$, but it needs a huge quantum memory,
and with realistic memory costs no quantum collision attack beats the classical one.
These speed-ups are real but polynomial, and §1.4 shows why they are far weaker in
practice than the square root suggests. The cure, where one is needed at all, is to
use longer keys and longer hashes, which we already know how to do.

**What stands.** Information-theoretic schemes, the one-time pad and Shamir secret
sharing for instance, do not depend on any hard problem and are untouched. So are
message authentication codes with long enough keys and tags.

Table 1.1 puts the common algorithms in their columns. Read it as the shopping list
for the rest of the book: everything in the first column needs a replacement, and
the replacements are what Parts II and III build.

| Algorithm | Used for | Best quantum attack | Effect | What to do |
| --- | --- | --- | --- | --- |
| RSA (any size) | encryption, signatures | Shor (factoring) | broken | replace: ML-KEM, ML-DSA, SLH-DSA |
| Finite-field DH, DSA, ElGamal | key exchange, signatures | Shor (discrete log) | broken | replace: ML-KEM, ML-DSA |
| ECDH, X25519, X448 | key exchange | Shor on the curve group | broken | replace or hybrid with ML-KEM |
| ECDSA, EdDSA, Schnorr | signatures | Shor on the curve group | broken | replace: ML-DSA, SLH-DSA, FN-DSA |
| BLS and other pairings | signatures, aggregation | Shor | broken | no standard replacement yet |
| AES-128 | encryption | Grover | weakened on paper | fine for most uses; AES-256 for margin |
| AES-192, AES-256, ChaCha20 | encryption | Grover | slightly weakened | fine |
| SHA-256, SHA-384, SHA-512, SHA-3 | hashing | Grover; BHT for collisions | slightly weakened | fine; SHA-384 or more for margin |
| HMAC, KMAC with 256-bit keys | authentication | Grover | slightly weakened | fine |
| One-time pad, secret sharing | special uses | none | unaffected | fine |

*Table 1.1. What a quantum computer does to today's algorithms.*

Two features of the table matter for planning. First, the broken column is
precisely the public-key column. Symmetric cryptography survives with, at worst,
a change of key length. Second, the broken algorithms are the ones that let strangers
talk securely: the key exchange at the start of every TLS connection, every SSH
login, every Signal conversation, and the signatures on every certificate, software
update and passport chip. Those are hard to replace precisely because they are
everywhere.

!!! note "Life story: Shor's algorithm"
    **Born:** 1994, Peter Shor at AT&T Bell Laboratories, presented at the IEEE
    Symposium on Foundations of Computer Science (FOCS) that November; the journal
    version appeared in *SIAM Journal on Computing* in 1997 · **Purpose:** to show
    that a quantum computer could solve a problem believed hard for classical
    computers, using the quantum Fourier transform to find periods · **Helped:** turned
    quantum computing from a curiosity into a field with governments and companies
    behind it; started the search for post-quantum cryptography · **Status:** run only
    on tiny numbers so far; the reason RSA, Diffie-Hellman and elliptic curves are
    being retired

## 1.3 Shor's algorithm in one page

*Level: beginner.*

Shor's idea can be told without any quantum mechanics at all, because the quantum
computer does only one step in the middle. The rest is ordinary number theory that
you can run on a laptop.

**Factoring is finding a period.** Take the number to factor, $N$, and pick any $a$
with $1 < a < N$ that shares no factor with $N$. Look at the powers of $a$ modulo $N$:

$$a^0, a^1, a^2, a^3, \dots \pmod N.$$

They must eventually repeat, and once they repeat they cycle. The length of the cycle
is the **order** $r$ of $a$: the smallest $r > 0$ with $a^r \equiv 1 \pmod N$. If $r$
is even, then

$$a^r - 1 = (a^{r/2} - 1)(a^{r/2} + 1) \equiv 0 \pmod N,$$

so $N$ divides the product of two numbers. If $N$ does not divide either one on its
own (which happens unless $a^{r/2} \equiv -1$), then $N$ shares a factor with each,
and $\gcd(a^{r/2} - 1, N)$ is a proper factor of $N$. The greatest common divisor
takes microseconds by Euclid's algorithm.

**By hand, $N = 15$.** Take $a = 7$. The powers of 7 modulo 15 are

$$7^1 = 7,\quad 7^2 = 49 \equiv 4,\quad 7^3 \equiv 28 \equiv 13,\quad 7^4 \equiv 91 \equiv 1.$$

The order is $r = 4$, which is even. Then $7^{2} \equiv 4$, and

$$\gcd(4 - 1, 15) = 3, \qquad \gcd(4 + 1, 15) = 5.$$

So $15 = 3 \times 5$.

**By hand, $N = 21$.** Take $a = 2$. The powers are $2, 4, 8, 16, 32 \equiv 11, 22
\equiv 1$, so $r = 6$. Then $2^3 = 8$, and $\gcd(7, 21) = 7$, $\gcd(9, 21) = 3$. So
$21 = 3 \times 7$.

That is the entire classical part. The catch is that finding $r$ by listing powers
takes about $r$ steps, and for a 2,048-bit $N$ the order is typically a number with
hundreds of digits. No classical method finds it faster than factoring itself.

**What the quantum computer does.** It finds $r$. It prepares a superposition of all
exponents $x$ from 0 to some $Q - 1$ (with $Q$ a power of two a bit larger than
$N^2$), computes $a^x \bmod N$ into a second register for all of them at once, and
applies the quantum Fourier transform to the exponent register. When the register is
measured, the result is, with good probability, an integer $y$ close to a multiple
of $Q/r$:

$$\frac{y}{Q} \approx \frac{j}{r} \quad \text{for some integer } j.$$

From that one number, the **continued fraction** expansion of $y/Q$ recovers $j/r$
in lowest terms, and so, usually, $r$. If $j$ and $r$ share a factor, the denominator
found is a divisor of $r$; repeating the run a few times and taking the least common
multiple fixes that. Figure 1.2 shows the flow: classical work, one quantum step,
classical work again.

<figure class="mars-fig">
<svg viewBox="0 0 640 230" width="640" role="img" aria-label="Flow of Shor's algorithm: classical choice of a, quantum period finding, classical continued fractions and gcd" fill="currentColor" font-size="14">
<rect x="10" y="40" width="140" height="80" rx="8" class="soft" stroke="currentColor"/>
<text x="80" y="70" text-anchor="middle" font-weight="bold">Classical</text>
<text x="80" y="92" text-anchor="middle">pick a, check</text>
<text x="80" y="110" text-anchor="middle">gcd(a, N) = 1</text>
<rect x="190" y="30" width="200" height="100" rx="8" class="soft-acc" stroke="currentColor"/>
<text x="290" y="58" text-anchor="middle" font-weight="bold" class="acc-fill">Quantum</text>
<text x="290" y="80" text-anchor="middle">superpose x, compute a^x mod N,</text>
<text x="290" y="98" text-anchor="middle">Fourier transform, measure y</text>
<text x="290" y="118" text-anchor="middle">y/Q ≈ j/r</text>
<rect x="430" y="40" width="200" height="80" rx="8" class="soft" stroke="currentColor"/>
<text x="530" y="70" text-anchor="middle" font-weight="bold">Classical</text>
<text x="530" y="92" text-anchor="middle">continued fractions give r;</text>
<text x="530" y="110" text-anchor="middle">gcd(a^(r/2) ± 1, N)</text>
<line x1="150" y1="80" x2="186" y2="80" stroke="currentColor" stroke-width="1.6"/>
<polygon points="186,75 190,80 186,85"/>
<line x1="390" y1="80" x2="426" y2="80" stroke="currentColor" stroke-width="1.6"/>
<polygon points="426,75 430,80 426,85"/>
<text x="320" y="170" text-anchor="middle">If r is odd, or a^(r/2) ≡ −1 (mod N), pick another a and repeat.</text>
<text x="320" y="192" text-anchor="middle">For N = pq at least half of all a work, so a few tries suffice.</text>
<text x="320" y="214" text-anchor="middle">Almost all of the qubits and time go into computing a^x mod N.</text>
</svg>
<figcaption>Figure 1.2. Shor's algorithm. Only the middle box needs a quantum computer; the rest is the number theory of §1.3, which runs on any laptop.</figcaption>
</figure>

**Code it.** The program below plays the quantum computer's part honestly but
slowly: it finds the order by listing powers, then simulates what a measurement would
return, an integer $y$ near $jQ/r$, and recovers $r$ from $y/Q$ with continued
fractions, exactly as the classical post-processing would.

```python
from fractions import Fraction
from math import gcd
import random

def order(a, n):
    """The smallest r > 0 with a**r = 1 mod n, by listing powers (slow)."""
    x, r = a % n, 1
    while x != 1:
        x, r = x * a % n, r + 1
    return r

def measurement(r, q):
    """What Shor's quantum step returns: the integer nearest j*q/r."""
    j = random.randrange(1, r)
    return round(j * q / r)

def period_from(y, q, n):
    """Continued fractions: the best fraction j/r near y/q with r < n."""
    return Fraction(y, q).limit_denominator(n - 1).denominator

def shor_classical(n, a):
    if gcd(a, n) != 1:
        return gcd(a, n), "lucky: a shares a factor"
    q = 1 << (2 * n.bit_length())       # a power of two above n squared
    r = 1
    for _ in range(4):                  # a few runs, then take the lcm
        d = period_from(measurement(order(a, n), q), q, n)
        r = r * d // gcd(r, d)
    if r % 2 or pow(a, r // 2, n) == n - 1:
        return None, "bad a, r = %d" % r
    h = pow(a, r // 2, n)
    return gcd(h - 1, n), "r = %d" % r

random.seed(1)
for n, a in [(15, 7), (21, 2), (3127, 2), (10403, 3)]:
    f, note = shor_classical(n, a)
    print(n, "a =", a, note, "factor", f, "cofactor", n // f if f else None)
```

Running it prints:

```
15 a = 7 r = 4 factor 3 cofactor 5
21 a = 2 r = 6 factor 7 cofactor 3
3127 a = 2 r = 1508 factor 59 cofactor 53
10403 a = 3 r = 1700 factor 103 cofactor 101
```

The function `order` is the expensive part: for $3127 = 53 \times 59$ it takes 1,508
multiplications, and for a real RSA modulus it would take longer than the age of the
universe. The quantum computer replaces exactly that function. Everything else in the
program is cheap.

**Discrete logarithms work the same way.** To find $k$ with $g^k = h$ in a group of
order $n$, the quantum computer evaluates $f(x, y) = g^x h^{-y}$ over a superposition
of pairs $(x, y)$. The function repeats whenever $(x, y)$ moves along the line
$x \equiv k y \pmod n$, and a two-dimensional Fourier transform reveals that line's
slope, which is $k$. On an elliptic curve the "multiplication" is point addition,
and the same procedure recovers a private key from a public one. The curve version
needs fewer qubits than RSA at the same classical security, because the numbers are
smaller: a 256-bit curve against a 3,072-bit modulus. That is why elliptic curves,
the modern favorite, are likely to fall before RSA does, not after.

## 1.4 Grover's algorithm, and why AES survives

*Level: beginner.*

Grover's algorithm answers a different question: given a function that says "yes" for
one input in $N$ and "no" for the rest, find the "yes". Classically there is nothing
to do but try inputs, about $N/2$ of them on average. Grover's algorithm does it in
about $\frac{\pi}{4}\sqrt{N}$ evaluations of the function, run on a quantum computer.

For a cipher, the function is "does this key turn this known plaintext into this
known ciphertext?". For AES-128, $N = 2^{128}$, and

$$\frac{\pi}{4}\sqrt{2^{128}} = \frac{\pi}{4}\,2^{64} \approx 1.4 \times 10^{19}$$

evaluations. On paper that halves the key length: AES-128 offers "64-bit quantum
security". It sounds alarming, because 64-bit classical searches have been done. In
practice it is nothing like that, for three reasons.

**The steps are in a row.** Grover's iterations must be done one after another. A
classical key search splits perfectly: a million machines finish a million times
sooner. Split a Grover search across $k$ quantum computers, each searching
$N/k$ keys, and each needs $\sqrt{N/k}$ steps, so the speed-up from $k$ machines is
only $\sqrt{k}$. To finish a 128-bit search in a year, you would need either one
machine doing about $4.5 \times 10^{11}$ Grover iterations per second, each iteration
a full AES circuit on a fault-tolerant quantum computer, or an enormous number of
machines.

**Each step is a whole AES.** One Grover iteration evaluates AES on a superposition of
keys, reversibly, with error correction. Published circuits for AES-128 use thousands
of logical qubits and on the order of $10^4$ to $10^5$ logical gates in depth per
evaluation. A fault-tolerant logical gate takes something like a microsecond on the
superconducting designs of today's estimates. That puts one iteration somewhere
around a tenth of a second, and $2^{64}$ iterations in a row at roughly $10^{11}$
years.

**Error correction is not free.** Every logical qubit is made of hundreds or thousands
of physical qubits (§1.5), and every logical gate costs many physical operations.
Classical hardware, which is cheap and needs no correction, is the right comparison,
and against it the quantum key search loses badly.

Put together, NIST's analysis (which §2 of the next chapter follows in detail) treats
a key search on AES-128 as the yardstick for its lowest security category, not as a
broken cipher, and assumes an attacker limited to a circuit depth of about $2^{40}$
to $2^{96}$ gates in a row. Under such a limit a quantum search for an AES-128 key still
needs from about $2^{117}$ logical gates (at depth $2^{40}$) down to about $2^{79}$ (at
depth $2^{96}$), on NIST's revised figures, and each error-corrected logical gate costs
many physical operations, so in practice the search stays out of reach and loses to cheap
classical hardware ([Chapter 2, §2.4](02-Security-Levels.md#24-maxdepth-why-grover-is-weaker-than-it-looks)). AES-256 is used where people
want a wide margin, as the NSA's CNSA 2.0 suite requires, and that is a matter of
caution, not of need.

Hash functions fare the same way. A preimage search on SHA-256 is a Grover search
over $2^{256}$ inputs, impossible either way. Collisions are found classically in
about $2^{128}$ hash evaluations by the birthday method; the quantum
Brassard-Høyer-Tapp algorithm would need about $2^{85}$ evaluations but also about
$2^{85}$ qubits of quantum-accessible memory, and Daniel Bernstein's 2009 analysis
showed that once memory is paid for, a classical parallel collision search is
cheaper. SHA-256 keeps its collision resistance.

**Code it.** A classical program can simulate Grover's algorithm on a small search
space by keeping the amplitude of every input. The amplitude of the marked input
grows by roughly $2/\sqrt{N}$ each step until it nears 1, then falls again, so
stopping at the right moment matters.

```python
from math import pi, sqrt, floor

def grover(n_bits, marked):
    n = 1 << n_bits
    amp = [1 / sqrt(n)] * n                    # equal superposition
    steps = floor(pi / 4 * sqrt(n))
    history = []
    for _ in range(steps + 3):
        amp[marked] = -amp[marked]             # the oracle flips the sign
        mean = sum(amp) / n
        amp = [2 * mean - a for a in amp]      # inversion about the mean
        history.append(amp[marked] ** 2)       # chance of measuring it
    return steps, history

steps, h = grover(10, marked=777)
print("N = 1024, optimal steps:", steps)
for k in (1, 5, 10, steps, steps + 3):
    print("after %2d steps: P(marked) = %.4f" % (k, h[k - 1]))
```

Running it prints:

```
N = 1024, optimal steps: 25
after  1 steps: P(marked) = 0.0088
after  5 steps: P(marked) = 0.1136
after 10 steps: P(marked) = 0.3724
after 25 steps: P(marked) = 0.9995
after 28 steps: P(marked) = 0.9562
```

Twenty-five steps find one item in 1,024, where a classical search would need 512 on
average. The square root is real. It is just not enough to matter for a 128-bit key.

!!! note "Life story: Grover's algorithm"
    **Born:** 1996, Lov Grover at Bell Laboratories, "A fast quantum mechanical
    algorithm for database search" (STOC 1996) · **Purpose:** to search an unsorted
    list of $N$ items in about $\sqrt N$ quantum steps · **Helped:** a general tool
    inside many quantum algorithms; Bennett, Bernstein, Brassard and Vazirani proved in
    1997 that no quantum algorithm can do unstructured search faster · **Status:**
    proven optimal; the reason long-lived systems choose 256-bit keys, and the reason
    nobody needs to replace AES

## 1.5 From logical qubits to a real machine

*Level: intermediate.*

When a paper says "Shor's algorithm for RSA-2048 needs about 1,400 qubits", and
another says "about a million", both can be right. They are counting different
things. To read any estimate you need three layers in mind.

**Logical qubits** are the perfect qubits of the algorithm's description. They never
make errors. The algorithm is written for them: so many qubits, so many gates of each
kind, in such a depth.

**Physical qubits** are the real devices: superconducting circuits, trapped ions,
neutral atoms held by lasers, photons. Every one of them makes errors. Today's best
two-qubit gates fail somewhere around once in a thousand operations, or a little
better on the best devices. Shor's algorithm for a 2,048-bit number needs billions of
gates, so without correction an error is certain long before the end.

**Error correction** builds logical qubits out of physical ones. The leading scheme for
superconducting chips is the **surface code**: physical qubits sit on a square grid,
half holding data and half repeatedly measuring the parity of their neighbours. The
pattern of parity flips shows where errors happened, and classical software works out
a correction. A surface code of **distance** $d$ uses about $2d^2$ physical qubits per
logical qubit and corrects any $\lfloor (d-1)/2 \rfloor$ errors in a patch. Its key
property is a **threshold**: if the physical error rate $p$ is below a value $p_{th}$
of roughly 1%, the logical error rate falls exponentially as $d$ grows,

$$p_L \approx 0.1\left(\frac{p}{p_{th}}\right)^{(d+1)/2}.$$

**By hand.** Suppose $p = 10^{-3}$ and $p_{th} = 10^{-2}$, so $p / p_{th} = 0.1$. For
a logical error rate of $10^{-15}$ per qubit per round, needed when an algorithm has
around $10^{12}$ qubit-rounds in total, we need $0.1 \times 0.1^{(d+1)/2} \le 10^{-15}$,
that is $(d+1)/2 \ge 14$, so $d = 27$. Each logical qubit then costs
$2 \times 27^2 = 1{,}458$ physical qubits. With 1,400 logical qubits for data, that is
about two million physical qubits before counting anything else. If the hardware
improved to $p = 10^{-4}$, the ratio would be $0.01$ and $d = 13$ would do, about 340
physical qubits per logical one. Hardware quality moves the totals by large factors.

**Magic states.** The surface code makes some gates cheap (the "Clifford" gates) and
others expensive. The expensive ones, T gates and Toffoli gates, need special
**magic states** that are prepared, purified in **distillation factories**, and fed
into the computation. A factory occupies many logical qubits' worth of grid and
produces states at a limited rate. In most resource estimates for cryptanalysis the
count of Toffoli (or T) gates is the number that sets the running time, and the
factories are a large share of the machine.

**Running time.** A round of surface-code error correction takes about a microsecond
on superconducting chips. A logical operation takes about $d$ rounds. With
billions of Toffoli gates and a few factories working in parallel, runs of hours to
days follow. Trapped-ion and neutral-atom machines have better qubits but slower
operations, often by a factor of a hundred to a thousand, and estimates for them trade
fewer qubits for longer runs. Figure 1.3 shows the layers.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Three layers of a resource estimate: the algorithm in logical qubits, the error-correcting code in physical qubits per logical qubit, and the hardware with error rate and speed" fill="currentColor" font-size="14">
<rect x="20" y="20" width="600" height="70" rx="8" class="soft" stroke="currentColor"/>
<text x="40" y="46" font-weight="bold">Algorithm</text>
<text x="40" y="70">logical qubits (about 1,400 for RSA-2048) and Toffoli gates (billions)</text>
<rect x="20" y="115" width="600" height="70" rx="8" class="soft-acc" stroke="currentColor"/>
<text x="40" y="141" font-weight="bold">Error correction</text>
<text x="40" y="165">surface code distance d: about 2d² physical per logical, plus magic-state factories</text>
<rect x="20" y="210" width="600" height="70" rx="8" class="soft" stroke="currentColor"/>
<text x="40" y="236" font-weight="bold">Hardware</text>
<text x="40" y="260">physical error rate (about 10⁻³), cycle time (about 1 µs), connectivity</text>
<line x1="320" y1="90" x2="320" y2="112" stroke="currentColor" stroke-width="1.6"/>
<polygon points="315,108 320,114 325,108"/>
<line x1="320" y1="185" x2="320" y2="207" stroke="currentColor" stroke-width="1.6"/>
<polygon points="315,203 320,209 325,203"/>
</svg>
<figcaption>Figure 1.3. How an estimate is built. A change in any layer, a cleverer circuit, a better code, a quieter qubit, changes the final count of physical qubits and the running time.</figcaption>
</figure>

**Code it.** The calculator below follows the steps above. It is crude, real
estimates lay out the factories and routing in detail, but it reproduces the shape of
the published numbers and shows which inputs matter.

```python
def distance_for(p, target, p_th=1e-2):
    """Smallest odd surface-code distance with logical error below target."""
    d = 3
    while 0.1 * (p / p_th) ** ((d + 1) / 2) > target:
        d += 2
    return d

def estimate(logical, toffolis, p, cycle_us=1.0, factories=4, factory_qubits=0):
    rounds = logical * toffolis          # crude: every qubit lives through every gate
    d = distance_for(p, 0.1 / rounds)    # keep total failure chance near 10%
    per_logical = 2 * d * d
    factory_qubits = factory_qubits or 15 * per_logical   # one factory, roughly
    physical = logical * per_logical + factories * factory_qubits
    hours = toffolis / factories * d * cycle_us / 3.6e9
    return d, physical, hours

for p in (1e-3, 5e-4, 1e-4):
    d, q, h = estimate(logical=1400, toffolis=6.5e9, p=p)
    print("p = %.0e  distance %2d  physical qubits %9d  about %5.1f days"
          % (p, d, q, h / 24))
```

Running it prints:

```
p = 1e-03  distance 25  physical qubits   1825000  about   0.5 days
p = 5e-04  distance 19  physical qubits   1054120  about   0.4 days
p = 1e-04  distance 13  physical qubits    493480  about   0.2 days
```

The inputs (1,400 logical qubits, about 6.5 billion Toffoli gates) are the order of
magnitude in Gidney's 2025 paper. The toy gets the number of physical qubits within a
factor of two of his answer, but it is far too optimistic about time, because his
design uses a very compact layout that keeps most qubits in cold storage and runs
slowly to save space. That is the point of the exercise: the same algorithm can be
built small and slow or large and fast, and published estimates choose a point on
that curve. When you compare two estimates, check that they chose the same point.

## 1.6 The estimates, 2019 to 2026

*Level: intermediate.*

Since 2019 the estimated cost of breaking RSA-2048 has fallen by about a factor of
twenty, while the hardware assumptions stayed roughly the same. Most of the fall came
from better algorithms and better layouts, not from better qubits. Table 1.2 lists the
landmarks for superconducting surface-code machines with a physical error rate of
$10^{-3}$, the assumption most papers share.

| Year | Target | Physical qubits | Time | Source |
| --- | --- | --- | --- | --- |
| 2019 | RSA-2048 | about 20 million | about 8 hours | Gidney and Ekerå |
| 2025 | RSA-2048 | under 1 million | under a week | Gidney |
| 2017 | 256-bit elliptic curve | 2,330 logical qubits (no physical count) | not given | Roetteler, Naehrig, Svore and Lauter |
| 2020 | 256-bit elliptic curve | 2,124 logical qubits, improved gate counts | not given | Häner, Jaques, Naehrig, Roetteler and Soeken |
| 2023 | 256-bit elliptic curve | about 50 million Toffoli gates | not given | Litinski |

*Table 1.2. Published estimates. Each row assumes a different degree of detail; the
logical-qubit rows count only the algorithm.*

The 2019 paper, "How to factor 2048 bit RSA integers in 8 hours using 20 million
noisy qubits", by Craig Gidney of Google and Martin Ekerå of the Swedish NCSA and KTH,
set the standard for how such estimates are done: a full layout on a surface-code
chip, every factory counted, every cost explained. Its tricks included windowed
arithmetic (looking up several bits of the exponent at once in a table) and Ekerå and
Håstad's variant of Shor's algorithm that needs fewer quantum runs.

The 2025 paper, "How to factor 2048 bit RSA integers with less than a million noisy
qubits", by Gidney alone, cut the count by a factor of about twenty. It used an
approximate modular arithmetic method from a 2024 paper by Chevignard, Fouque and
Schrottenloher, which works on residues of the number rather than the whole number at
once and needs far fewer logical qubits; "yoked" surface codes that store idle qubits
more densely; and a cheaper way to make magic states called cultivation. The run
takes longer, under a week rather than eight hours, because the machine is smaller.

Elliptic curves need fewer logical qubits than RSA at the same classical security,
which Table 1.2 shows only indirectly. Roetteler and colleagues gave the first careful
count in 2017: for a 256-bit prime curve, at most 2,330 logical qubits. Later work
reduced both the qubits and the gate counts. Every author agrees on the direction:
P-256 and Curve25519 need a smaller machine than RSA-2048, so they will fall first.

**Estimates for other hardware.** In 2026 several groups published estimates for
machines that are not superconducting surface-code chips: neutral-atom arrays where
atoms can be moved, "cat" qubits whose design suppresses one kind of error, and
quantum low-density parity-check codes that pack logical qubits more tightly than the
surface code. Some of these report RSA-2048 with tens of thousands of physical qubits,
or a 256-bit curve in hours or less. They are reported here with care: each rests on
assumptions about hardware that has not been built at scale, several come from
companies selling that hardware, and they are not directly comparable with Table 1.2.
They do agree with its trend, which is down.

**How to read an estimate.** Five questions sort the serious from the speculative:

1. **What error rate and cycle time are assumed?** $10^{-3}$ and 1 µs are today's
   good superconducting devices. A paper assuming $10^{-5}$ is describing a future
   machine.
2. **Is the count logical or physical?** Logical counts are useful for comparing
   algorithms and useless for predicting when a machine exists.
3. **Are the factories, routing and classical decoding included?** A complete layout
   is far more convincing than a formula.
4. **Is the algorithm the standard one?** Variants that need many runs, or rely on
   an unproven heuristic, should say so.
5. **Who wrote it?** Peer-reviewed or widely checked work from groups without
   something to sell is weighted more heavily than a press release.

!!! note "Life story: the 20-million-qubit estimate"
    **Born:** May 2019, Craig Gidney and Martin Ekerå, posted to arXiv and published
    in *Quantum* in 2021 · **Purpose:** a complete, honest cost for factoring RSA-2048
    on a plausible machine, with every overhead counted · **Helped:** became the number
    quoted in government guidance for five years; showed that clever layout matters as
    much as qubit quality · **Retired:** superseded in May 2025 by Gidney's estimate of
    under a million qubits · **Replaced by:** the 2025 paper, and whatever lowers it next

## 1.7 How far the machines are

*Level: intermediate.*

Between the estimates and the laboratories lies a large gap. At the end of 2026 the
largest machines have from about a hundred to a few thousand physical qubits,
depending on the technology, and the best of them can run small error-corrected
memories and a few logical operations. Nobody has run Shor's algorithm on a number
that a pencil could not factor.

**The factoring records are tiny.** In 2001 a team at IBM and Stanford led by Lieven
Vandersypen factored 15 with Shor's algorithm on a seven-qubit nuclear magnetic
resonance device. In 2012 a group led by Enrique Martín-López factored 21 on a
photonic chip, using a "compiled" circuit that already assumed parts of the answer.
Most later "records" either use such compiled circuits or use a different method that
does not scale. No honest run of Shor's algorithm has factored a number with more than
two digits.

**Error correction crossed a line.** In December 2024 Google described its 105-qubit
Willow chip, on which a distance-7 surface code had a lower logical error rate than
distance 5, and distance 5 lower than distance 3, each step cutting errors by about a
factor of two. That is what "below threshold" means in practice, and it was the first
convincing demonstration on superconducting qubits. Other groups have shown logical
qubits on trapped ions and neutral atoms. The road from a few logical qubits to the
thousands that Shor's algorithm needs is long, but it is now an engineering road.

**Roadmaps are promises.** Companies publish plans: IBM's for a fault-tolerant machine
with about 200 logical qubits by 2029, Google's in milestones, others in their own
units. None of these targets is a CRQC, and roadmaps slip. They are useful as an upper
limit on optimism, not as dates.

**Watch for overblown claims.** In December 2022 a group of Chinese researchers led
by Bao Yan posted a paper claiming that RSA-2048 could be broken with only 372 qubits,
using a hybrid of Schnorr's classical lattice-based factoring idea and a quantum
optimization routine. They had factored a 48-bit number on 10 superconducting qubits.
The claim spread through the news within days. It did not survive inspection: Schnorr's
method had already been shown not to give the claimed speed, the quantum routine has
no proven advantage, and nothing in the paper said how many runs a 2,048-bit number
would take. Quantum annealers, a different kind of machine, are regularly reported as
"breaking RSA" on small numbers by turning factoring into an optimization problem;
these methods have no known advantage over classical computers and do not scale.

!!! note "Life story: the 372-qubit claim"
    **Born:** December 2022, Bao Yan and colleagues, "Factoring integers with sublinear
    resources on a superconducting quantum processor" (arXiv) · **Purpose:** to claim a
    route to RSA-2048 on near-term machines by combining Schnorr's lattice factoring with
    a quantum optimizer · **Helped:** a useful lesson in reading claims; prompted quick
    public rebuttals from quantum computing and cryptography researchers · **Status:**
    not accepted; no evidence that the method scales beyond small numbers

A good habit when reading the news: ask what number was factored, whether Shor's
algorithm was used without shortcuts, and how the cost grows with the size of the
number. If the answers are "a small one", "no" and "not stated", the story is not
about cryptography.

## 1.8 Mosca's inequality, worked

*Level: intermediate.*

Since nobody knows when a CRQC will exist, the useful question is not "when?" but
"are we late?". Michele Mosca of the University of Waterloo put it as an inequality in
2015. Let

- $x$ be the number of years the data must stay secret (its **shelf life**),
- $y$ be the number of years it will take to move the systems that protect it to
  post-quantum cryptography (the **migration time**),
- $z$ be the number of years until a CRQC exists (the **threat time**).

If

$$x + y > z,$$

then some data will be exposed: anything encrypted near the end of the migration,
under the old algorithms, still has to stay secret for $x$ more years, and a CRQC
arrives before that. Figure 1.4 draws the three lengths as bars.

<figure class="mars-fig">
<svg viewBox="0 0 640 210" width="640" role="img" aria-label="Mosca's inequality as bars: migration time y followed by shelf life x, compared with threat time z; the part of x beyond z is exposed" fill="currentColor" font-size="14">
<text x="20" y="44" font-weight="bold">y</text>
<rect x="60" y="28" width="200" height="26" class="soft" stroke="currentColor"/>
<text x="160" y="46" text-anchor="middle">migration, 10 years</text>
<text x="20" y="84" font-weight="bold">x</text>
<rect x="260" y="68" width="300" height="26" class="soft" stroke="currentColor"/>
<text x="410" y="86" text-anchor="middle">shelf life, 15 years</text>
<rect x="460" y="68" width="100" height="26" class="soft-acc" stroke="currentColor"/>
<text x="20" y="134" font-weight="bold">z</text>
<rect x="60" y="118" width="400" height="26" class="soft" stroke="currentColor"/>
<text x="260" y="136" text-anchor="middle">until a CRQC, 20 years</text>
<line x1="460" y1="20" x2="460" y2="160" stroke="currentColor" stroke-dasharray="5 4"/>
<text x="510" y="122" text-anchor="middle" class="acc-fill">exposed:</text>
<text x="510" y="140" text-anchor="middle" class="acc-fill">5 years</text>
<line x1="60" y1="176" x2="580" y2="176" stroke="currentColor"/>
<text x="60" y="196" text-anchor="middle">now</text>
<text x="260" y="196" text-anchor="middle">+10</text>
<text x="460" y="196" text-anchor="middle">+20</text>
<text x="560" y="196" text-anchor="middle">+25</text>
</svg>
<figcaption>Figure 1.4. Mosca's inequality with $x = 15$, $y = 10$, $z = 20$. Data protected the old way at the end of the migration must last until year 25, but the machine arrives in year 20: five years of exposure.</figcaption>
</figure>

**By hand: three archives.**

- *A web shop's session traffic.* Shelf life $x = 1$ year (card numbers expire, tokens
  rotate). Migration $y = 3$ years (a library upgrade and a configuration change).
  $x + y = 4$. Unless a CRQC is less than four years away, this is not urgent.
- *A national health records system.* Shelf life $x = 70$ years. Migration $y = 8$
  years (many vendors, long procurement). $x + y = 78$. Any reasonable estimate of $z$
  is shorter than that. This system is already late: records sent today are at risk.
- *A Mars settlement's archive.* The settlement's charter says medical and personal
  records sent to Earth stay private for 50 years: $x = 50$. Its radios, relay
  satellites and ground equipment are replaced on a long cycle, because every kilogram
  is shipped across interplanetary space; a full migration of the links takes $y = 12$
  years. $x + y = 62$. The settlement must start migrating before it has finished
  building.

The hard part is $z$, and here the honest answer is a probability, not a number. The
Global Risk Institute in Toronto has asked a panel of quantum-computing experts every
year since 2019 how likely a CRQC (defined as breaking RSA-2048 within 24 hours) is
within various horizons. In the edition published in early 2026, by Mosca and Marco
Piani, about half of the 26 experts put the chance within ten years at about 50% or
more, and a large majority put it at 50% or more within fifteen years. Surveys of
experts are not measurements. They are the best summary available of what the people
building the machines believe, and their trend, over several editions, has been
toward shorter times.

**Code it.** With a probability distribution for $z$, Mosca's inequality becomes a
risk: the chance that $z < x + y$. The program below draws $z$ from a simple
distribution, a lognormal with a median of 15 years and a wide spread, chosen as an
illustration rather than a forecast, and reports the exposure for each archive.

```python
import math
import random

def threat_years(median=15.0, spread=0.6):
    """One draw of z: years until a CRQC, lognormal around the median."""
    return math.exp(random.gauss(math.log(median), spread))

def risk(x, y, trials=200000, seed=7):
    random.seed(seed)
    hits = sum(1 for _ in range(trials) if threat_years() < x + y)
    return hits / trials

archives = [("web shop sessions", 1, 3),
            ("health records", 70, 8),
            ("Mars archive", 50, 12),
            ("firmware signing key", 0, 15),
            ("TLS server, 5-year secrets", 5, 5)]
for name, x, y in archives:
    print("%-27s x=%2d y=%2d  P(exposed) = %.2f" % (name, x, y, risk(x, y)))
```

Running it prints:

```
web shop sessions           x= 1 y= 3  P(exposed) = 0.01
health records              x=70 y= 8  P(exposed) = 1.00
Mars archive                x=50 y=12  P(exposed) = 0.99
firmware signing key        x= 0 y=15  P(exposed) = 0.50
TLS server, 5-year secrets  x= 5 y= 5  P(exposed) = 0.25
```

Change the median to 25 years or 8 years and run it again; the ranking of the archives
barely changes, which is the useful lesson. Long-lived secrets are at risk under any
plausible timeline, and short-lived ones are safe under almost any. The decision of
what to migrate first does not wait for a better forecast.

The firmware row needs explaining: its secrets have no shelf life at all, $x = 0$. Its
risk comes from a different direction, the subject of the next section.

## 1.9 Harvest now, decrypt later, and the signature problem

*Level: intermediate.*

**Encryption is at risk today.** The attack on the hospital in §1.1 is called
**harvest now, decrypt later** (or "store now, decrypt later"). It needs no quantum
computer today, only a recorder and patience, and recording traffic at scale is
something intelligence agencies are known to do. Government guidance from the US, the
UK, Canada, Germany, France and others names it explicitly as the reason to start
moving key exchange now. Every key exchange that uses only RSA or elliptic curves
creates a ciphertext that a future CRQC can open.

That is why the first post-quantum algorithm to reach billions of users was a key
exchange, not a signature. Since 2023 and 2024, Chrome, Firefox, Safari and Edge have
added a post-quantum share to the TLS key exchange; OpenSSH made a post-quantum key
exchange its default in 2022 and switched to ML-KEM by default in 2025; Signal added a
post-quantum layer to its first handshake in 2023. Chapter 18 tells that story. Each of
these closes the harvest window for new traffic. None of them helps traffic already
recorded.

**Signatures are at risk later, but take longer.** A signature only has to be
unforgeable while someone relies on it. Today's ECDSA signature on a web server's
handshake is checked once and forgotten, and forging it in 2040 achieves nothing. So
for most signatures, $x$ is close to zero and harvest-now does not apply.

Three kinds of signature break that rule:

- **Roots of trust.** A root certificate authority's key, a hardware vendor's
  firmware signing key, the key that signs a car's or satellite's software updates:
  these sit in devices for 10, 20 or 30 years. If a CRQC can forge with them while the
  devices are still running, it can push malicious updates. For such keys, $y$ includes
  the lifetime of every device that trusts them.
- **Long-lived documents.** Contracts, land registries, court records and diplomas
  signed today may need to be checked in 2060. A forgery possible then undermines all
  of them, unless they are re-signed or time-stamped with post-quantum schemes before
  that.
- **Identities.** Passports, national ID cards and smart cards carry signatures and
  keys that last ten years and are expensive to reissue.

The firmware signing key in the code of §1.8 has $x = 0$ and $y = 15$: no secret to
keep, but fifteen years to replace the key in every device that trusts it. That is why
NSA's CNSA 2.0 put software and firmware signing first in its timetable, and why
stateful hash-based signatures (Chapter 11), which are conservative and suit
firmware, are already required there.

**A Mars example.** A rover or a habitat's life-support controller on Mars accepts
software updates signed on Earth. Its hardware will be in service for decades and is
very expensive to replace. Its root key should be post-quantum from the day it is
built, and the update system should be able to change algorithms in the field. Here
signatures are the urgent problem, not encryption.

## 1.10 In the real world: deadlines and guidance

*Level: intermediate.*

Governments have turned Mosca's inequality into dates. The details differ; the shape
is the same everywhere: inventory now, prioritize long-lived data and long-lived
devices, finish in the first half of the 2030s. As of November 2026:

- **United States, NIST.** FIPS 203 (ML-KEM), FIPS 204 (ML-DSA) and FIPS 205
  (SLH-DSA) were published on 13 August 2024. SP 800-208 (October 2020) covers the
  stateful hash-based signatures LMS and XMSS. SP 800-227 (September 2025) gives
  recommendations for using key-encapsulation mechanisms. HQC was selected as a second
  KEM in March 2025 (NIST IR 8545) and FN-DSA, based on Falcon, is in preparation;
  neither had a public draft standard as of November 2026. NIST IR 8547, "Transition to
  Post-Quantum Cryptography Standards", was published in final form on 27 October 2026
  after a draft in November 2024. It keeps the draft's two dates: quantum-vulnerable
  public-key algorithms are deprecated after 2030 and disallowed after 2035. The draft
  deprecated the 112-bit security strengths (such as RSA-2048 and P-224) after 2030 and
  disallowed all of them after 2035; read the final report itself for the exact
  scope of each date.
- **United States, NSA.** The Commercial National Security Algorithm Suite 2.0 (CNSA
  2.0), announced in September 2022, sets the algorithms for national security
  systems: ML-KEM-1024, ML-DSA-87, LMS and XMSS for firmware, AES-256, SHA-384 and
  SHA-512. Its timetable asks software and firmware signing to prefer CNSA 2.0 by 2025
  and use it exclusively by 2030; networking equipment by 2026 and 2030; browsers,
  servers and cloud services by 2025 and 2033; and the whole transition complete by
  2035, in line with the 2022 National Security Memorandum 10.
- **United Kingdom.** The National Cyber Security Centre's guidance of March 2025
  sets three milestones: discovery and planning by 2028, priority migrations by 2031,
  and migration complete by 2035.
- **European Union.** A coordinated roadmap agreed by member states in June 2025 asks
  them to start transitioning by the end of 2026, protect high-risk uses by the end
  of 2030, and move as many systems as practical by 2035.
- **Others.** Canada, Australia, Germany (BSI), France (ANSSI), the Netherlands and
  others publish their own guidance. Several European agencies recommend hybrid key
  exchange (Chapter 18) during the transition; NSA's CNSA 2.0 does not require it.

Two things in these documents are easy to miss. First, the deadlines are for
*finishing*, and Mosca's inequality says the start must be $y$ years earlier. Second,
almost all of them say the first step is an **inventory**: a list of every place an
organization uses public-key cryptography, which turns out to be very hard to make,
because RSA and elliptic curves hide inside libraries, devices, protocols and
contracts. Chapter 18 returns to how that is done.

!!! note "Life story: Mosca's inequality"
    **Born:** 2015, Michele Mosca, "Cybersecurity in an era with quantum computers: will
    we be ready?" (IACR ePrint 2015/1075; *IEEE Security & Privacy* 2018) · **Purpose:**
    to replace "when will the quantum computer come?" with a question an organization can
    act on · **Helped:** became the standard framing in government and industry
    guidance; the Global Risk Institute's yearly timeline reports are built around it ·
    **Status:** current; the first slide of nearly every migration plan

## 1.11 Going deeper

*Level: expert.*

**Variants of Shor.** Shor's original algorithm for an $n$-bit modulus uses about $2n$
qubits for the exponent and needs one good run. Ekerå and Håstad (2017) gave a variant
for RSA moduli that reduces it to a discrete logarithm of about half the size, the
"short discrete logarithm" approach Gidney and Ekerå used. Seifert's and Ekerå's work
on trading quantum runs for classical post-processing lets each run be shorter at the
cost of more runs and a lattice step at the end. In August 2023 Oded Regev published a
multidimensional version of Shor's algorithm that uses about $n^{3/2}$ gates instead of
$n^2$ per run, at the cost of more qubits and about $\sqrt n$ runs combined by lattice
reduction; Ragavan and Vaikuntanathan reduced its space later the same year. Whether
Regev's approach beats the windowed, approximate arithmetic of Gidney's 2025 design for
real sizes is, as of this writing, an open question; for RSA-2048 the published layouts
still use variants of the original.

**What Shor cannot do.** The hidden subgroup method is efficient for abelian groups.
For non-abelian groups such as the dihedral group, the best known quantum algorithm,
Kuperberg's (2003), takes subexponential time, $2^{O(\sqrt{\log N})}$. This matters
twice in this book: the shortest vector problem in lattices reduces, in one approach, to
a dihedral hidden subgroup problem (Regev, 2002), and the group-action isogeny schemes
such as CSIDH fall exactly into Kuperberg's reach (Chapter 16). No polynomial-time
quantum algorithm is known for any lattice, code or hash problem used in the new
standards. In April 2024 Yilei Chen posted a claimed polynomial-time quantum algorithm
for some lattice problems; within about ten days a bug was found and the claim was
withdrawn. The episode shows both that such breaks are taken seriously and that the
community checks them fast.

**Grover with limits.** Zalka (1999) showed that running Grover's search with $k$
parallel machines gives only a $\sqrt k$ improvement, which is why NIST's categories
(Chapter 2) bound the depth of the attacker's circuit. Jaques, Naehrig, Roetteler and
Virdia (EUROCRYPT 2020) built and costed AES circuits in detail and found that under
depth limits a quantum key search on AES-128 needs more total gates than NIST's
original rough figure, strengthening the case that AES-128 meets category 1.

**Better estimates of $z$.** The physical-qubit count is only one input. A CRQC also
needs classical decoders that keep up with the error-correction cycle (megahertz rates
on millions of qubits), cryogenic wiring, control electronics and power; one 2023 study
estimated the energy a CRQC would draw. These engineering limits are less studied than
the algorithms and could move $z$ in either direction.

## Check yourself

??? question "1. Which of these does Shor's algorithm break: AES-256, RSA-4096, X25519, SHA-256, Ed25519, HMAC-SHA-256?"

    RSA-4096, X25519 and Ed25519. RSA falls to factoring, X25519 and Ed25519 to the
    elliptic-curve discrete logarithm. AES-256, SHA-256 and HMAC are symmetric and are
    only touched by Grover's algorithm, which leaves them strong.

??? question "2. Factor 35 with Shor's classical steps using a = 2."

    Powers of 2 modulo 35: 2, 4, 8, 16, 32, 29, 23, 11, 22, 9, 18, 1. The order is
    $r = 12$. Then $2^6 = 64 \equiv 29$, and $\gcd(28, 35) = 7$, $\gcd(30, 35) = 5$. So
    $35 = 5 \times 7$.

??? question "3. For N = 15 and a = 14, what goes wrong?"

    $14 \equiv -1 \pmod{15}$, so $14^2 \equiv 1$ and $r = 2$. Then $a^{r/2} = 14 \equiv -1$,
    the excluded case: $\gcd(13, 15) = 1$ and $\gcd(15, 15) = 15$ are trivial. Pick
    another $a$.

??? question "4. Why does doubling an RSA key barely slow Shor's algorithm, while it slows classical factoring enormously?"

    Shor's cost grows polynomially, roughly as the cube of the bit length, so doubling
    the length multiplies the work by about eight. The best classical method, the number
    field sieve, grows subexponentially, and doubling from 2,048 to 4,096 bits raises its
    cost by a factor of very roughly $2^{40}$ or more.

??? question "5. Grover's algorithm on a 20-bit search space: about how many iterations, and what happens if you run twice as many?"

    $\frac{\pi}{4}\sqrt{2^{20}} = \frac{\pi}{4} \times 1024 \approx 804$ iterations. Running
    about twice as many rotates the state past the answer, and the chance of measuring the
    marked item falls back toward zero; Grover's algorithm must be stopped at the right
    step.

??? question "6. A surface code with physical error rate 2 × 10⁻³ and threshold 10⁻²: what distance gives a logical error rate below 10⁻¹², using the formula in §1.5?"

    $p / p_{th} = 0.2$. We need $0.1 \times 0.2^{(d+1)/2} \le 10^{-12}$, so
    $0.2^{(d+1)/2} \le 10^{-11}$, $(d+1)/2 \ge 11 / \log_{10} 5 \approx 15.7$, so
    $(d+1)/2 = 16$ and $d = 31$. That is about $2 \times 31^2 = 1{,}922$ physical qubits
    per logical qubit.

??? question "7. A logistics company keeps shipping records secret for 3 years and needs 6 years to migrate. Experts think a CRQC is unlikely within 10 years. What does Mosca's inequality say?"

    $x + y = 9 < 10$: on that belief, the company is not yet exposed, but only by one
    year, and the belief is uncertain. It should start migrating now so that $y$ does not
    grow past the margin.

??? question "8. Why are signatures on TLS handshakes not at risk from harvest now, decrypt later, while firmware signing keys are urgent?"

    A handshake signature is only relied on during the handshake; forging it years later
    gains nothing, so $x \approx 0$. A firmware key is trusted by devices for decades, and
    replacing it means updating every device, a long $y$. If a CRQC arrives while those
    devices still trust the old key, an attacker can sign malicious firmware.

??? question "9. A press release says a quantum computer factored a 50-bit number. Which three questions do you ask?"

    Which algorithm was used, and was it Shor's without a circuit compiled from the known
    answer; how the number of qubits and the run time grow with the size of the number;
    and whether the work was peer reviewed or checked by people with nothing to sell. A
    50-bit number is factored classically in a fraction of a second.

??? question "10. Why do elliptic curves fall before RSA, although both are broken by Shor's algorithm?"

    At the same classical security level the elliptic-curve numbers are much smaller (256
    bits against 3,072 for 128-bit security), and Shor's algorithm on a curve needs fewer
    logical qubits and fewer gates than on the larger RSA modulus. The first CRQC to
    appear will be able to break P-256 and Curve25519 before RSA-2048 or RSA-3072.

## What you learned

- A quantum computer breaks factoring and discrete logarithms, so RSA, Diffie-Hellman,
  DSA, ECDH, ECDSA and EdDSA all fall together. Bigger keys do not save them.
- Symmetric cryptography only bends. Grover's search is a square root on paper and
  much less in practice, because its steps are sequential and each is a costly circuit.
  AES and SHA-2 and SHA-3 stay; AES-256 is used for margin.
- Shor's algorithm is classical number theory around one quantum step that finds a
  period. The classical steps run on any laptop.
- Resource estimates have three layers: the algorithm's logical qubits and gates, the
  error-correcting code, and the hardware's error rate and speed. Published estimates
  for RSA-2048 fell from about 20 million physical qubits (2019) to under a million
  (2025). Elliptic curves need less.
- Real machines are far from those numbers, but error correction now works below
  threshold. Claims of large-number factoring on small machines have not held up.
- Mosca's inequality $x + y > z$ ranks what to migrate first. Long-lived secrets and
  long-lived roots of trust are already late; short-lived traffic is not.
- NIST, NSA, the UK, the EU and others aim to finish the transition by about 2035,
  with NIST IR 8547 deprecating quantum-vulnerable algorithms after 2030 and
  disallowing them after 2035.

**Next:** [Chapter 2](02-Security-Levels.md), how "secure against a quantum computer"
is measured, and what NIST's five security categories mean.

## Further reading

- Peter W. Shor, "Algorithms for Quantum Computation: Discrete Logarithms and
  Factoring" (FOCS 1994); journal version "Polynomial-Time Algorithms for Prime
  Factorization and Discrete Logarithms on a Quantum Computer", *SIAM Journal on
  Computing* 26 (1997).
- Lov K. Grover, "A Fast Quantum Mechanical Algorithm for Database Search" (STOC 1996).
- Charles H. Bennett, Ethan Bernstein, Gilles Brassard and Umesh Vazirani, "Strengths
  and Weaknesses of Quantum Computing", *SIAM Journal on Computing* 26 (1997).
- Gilles Brassard, Peter Høyer and Alain Tapp, "Quantum Cryptanalysis of Hash and
  Claw-Free Functions" (LATIN 1998); Daniel J. Bernstein, "Cost analysis of hash
  collisions: Will quantum computers make SHARCS obsolete?" (SHARCS 2009).
- Lieven Vandersypen and others, "Experimental realization of Shor's quantum factoring
  algorithm using nuclear magnetic resonance", *Nature* 414 (2001).
- Austin G. Fowler, Matteo Mariantoni, John M. Martinis and Andrew N. Cleland, "Surface
  codes: Towards practical large-scale quantum computation", *Physical Review A* 86 (2012).
- Martin Roetteler, Michael Naehrig, Krysta Svore and Kristin Lauter, "Quantum Resource
  Estimates for Computing Elliptic Curve Discrete Logarithms" (ASIACRYPT 2017).
- Craig Gidney and Martin Ekerå, "How to factor 2048 bit RSA integers in 8 hours using
  20 million noisy qubits", *Quantum* 5 (2021; arXiv 2019).
- Thomas Häner, Samuel Jaques, Michael Naehrig, Martin Roetteler and Mathias Soeken,
  "Improved Quantum Circuits for Elliptic Curve Discrete Logarithms" (PQCrypto 2020).
- Samuel Jaques, Michael Naehrig, Martin Roetteler and Fernando Virdia, "Implementing
  Grover oracles for quantum key search on AES and LowMC" (EUROCRYPT 2020).
- Daniel Litinski, "How to compute a 256-bit elliptic curve private key with only 50
  million Toffoli gates" (arXiv 2023).
- Oded Regev, "An Efficient Quantum Factoring Algorithm" (arXiv 2023; *Journal of the
  ACM* 2025).
- Google Quantum AI, "Quantum error correction below the surface code threshold",
  *Nature* (2024).
- Craig Gidney, "How to factor 2048 bit RSA integers with less than a million noisy
  qubits" (arXiv, May 2025).
- Michele Mosca, "Cybersecurity in an era with quantum computers: will we be ready?",
  *IEEE Security & Privacy* 16 (2018); IACR ePrint 2015/1075.
- Michele Mosca and Marco Piani, *Quantum Threat Timeline Report* (Global Risk
  Institute, yearly since 2019).
- NIST IR 8547, *Transition to Post-Quantum Cryptography Standards* (final, October
  2026; draft November 2024).
- NSA, *Announcing the Commercial National Security Algorithm Suite 2.0* (September
  2022) and its FAQ.
- UK National Cyber Security Centre, *Timelines for migration to post-quantum
  cryptography* (March 2025).
- In book 1: [Chapter 20, Quantum computers](../../book/20-Quantum-Computers.md), which
  builds the qubit and the Fourier transform from scratch.
