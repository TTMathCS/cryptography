# 20. Quantum computers

*Every public-key system in Part III rests on factoring or discrete logarithms.
In 1994 Peter Shor showed that a quantum computer would solve both quickly. This
chapter explains what a quantum computer is without the hype, works Shor's and
Grover's algorithms by hand, measures how large a machine would have to be, and
follows the world's response: an open competition for new algorithms and the
largest change of cryptography ever made, started before the threat exists.*

!!! abstract "In this chapter"
    **You will learn:**

    - what a qubit is, what superposition and interference mean, and why a quantum computer is not "trying every answer at once";
    - how Shor's algorithm turns factoring into finding a period, with a full run on $N = 21$;
    - what Grover's search does to keys and hashes, and why AES survives;
    - how many qubits it would take to break RSA-2048 and elliptic curves, and how those estimates have moved;
    - why encrypted data recorded today is already at risk, and how the post-quantum migration is being done.

    **You need:** [Chapter 3](03-The-Arithmetic-of-Secrets.md) (modular arithmetic, gcd),
    [Chapter 12](12-Diffie-Hellman.md), [Chapter 13](13-RSA.md) and
    [Chapter 15](15-Elliptic-Curves.md) (what Shor breaks), [Chapter 7](07-AES.md) and
    [Chapter 9](09-Hash-Functions.md) (what Grover weakens).

    **Levels:** 20.1 to 20.3 and 20.7 to 20.9 are for beginners; 20.4 to 20.6 and 20.10 to 20.13
    are intermediate; 20.14 is expert.

## 20.1 The problem

In 1981 the physicist Richard Feynman pointed out that ordinary computers are
hopeless at simulating quantum physics. To describe 300 interacting particles
you need more numbers than there are atoms in the universe, because the
description doubles with every particle you add. Why not, he asked, build a
computer out of quantum parts and let nature do the bookkeeping? Paul Benioff
and Yuri Manin had sketched similar ideas a year earlier, and in 1985 David
Deutsch at Oxford described a universal quantum computer in exact terms.

For almost a decade nobody knew what such a machine would be good for beyond
physics. David Deutsch and Richard Jozsa (1992) and Daniel Simon (1994) found
problems where it was provably faster, but the problems were artificial. Then
in 1994 Peter Shor, a mathematician at AT&T Bell Labs, showed that a quantum
computer could **factor integers and compute discrete logarithms in polynomial
time**. Every public-key algorithm you met in Part III, RSA, Diffie-Hellman,
DSA, ECDH, ECDSA and EdDSA, rests on one of those two problems. Two years
later Lov Grover, also at Bell Labs, found a quantum method for unstructured
search that speeds up the brute-force attack on any key.

No machine big enough to run Shor's algorithm on a real key exists, as of late
2026. But a message recorded today can be decrypted whenever one does. That is
why, for the first time in the history this book has followed, the world is
replacing its main algorithms *before* they are broken. This chapter explains
the threat precisely enough that you can judge the headlines yourself.

## 20.2 Qubits, plainly

A classical bit is 0 or 1. A **qubit** is described by two numbers called
**amplitudes**, one for 0 and one for 1, written $\alpha$ and $\beta$. (In
general they are complex numbers; real ones are enough to see the ideas.) Two
rules govern it.

**Rule 1: measuring gives one answer at random.** When you look at a qubit you
get 0 with probability $\alpha^2$ and 1 with probability $\beta^2$, and
$\alpha^2 + \beta^2 = 1$. After the measurement the qubit *is* what you saw;
the amplitudes are gone.

**Rule 2: between measurements, amplitudes change by rotations.** A quantum
gate is a fixed linear map that keeps $\alpha^2 + \beta^2 = 1$. The most useful
one, the **Hadamard gate** $H$, does

$$
(\alpha, \beta) \;\mapsto\; \left(\tfrac{\alpha + \beta}{\sqrt 2},\; \tfrac{\alpha - \beta}{\sqrt 2}\right).
$$

**By hand.** Start with a qubit that is surely 0: $(1, 0)$. Apply $H$ and you
get $(0.707, 0.707)$, a **superposition**: measure now and you see 0 or 1 with
probability $0.707^2 = 0.5$ each. That is just a fair coin so far. Now apply $H$
a second time instead of measuring:

$$
\left(\tfrac{0.707 + 0.707}{\sqrt 2},\; \tfrac{0.707 - 0.707}{\sqrt 2}\right) = (1, 0).
$$

The qubit is surely 0 again. A coin flipped twice is still random; a qubit
"flipped" twice is not. The two paths that lead to 1 had amplitudes $+0.5$ and
$-0.5$, and they **cancelled**. That is **interference**, and it is the whole
source of a quantum computer's power: amplitudes can be negative, so wrong
answers can be made to cancel while right ones add up.

```python
from math import sqrt

h = 1 / sqrt(2)
def hadamard(state):                    # state = [amplitude of 0, amplitude of 1]
    a, b = state
    return [h * (a + b), h * (a - b)]

zero = [1.0, 0.0]
once = hadamard(zero)
twice = hadamard(once)
print([round(x, 3) for x in once], [round(x * x, 3) for x in once])
print([round(x, 3) for x in twice])
```

Output:

```
[0.707, 0.707] [0.5, 0.5]
[1.0, 0.0]
```

**Many qubits.** A register of $n$ qubits has one amplitude for each of the
$2^n$ bit strings. With $n = 3$ that is 8 amplitudes; with $n = 300$, more
numbers than atoms in the universe. A gate on one qubit changes all $2^n$
amplitudes at once. This is where the phrase "a quantum computer tries every
answer at once" comes from, and why it misleads: you can *prepare* a
superposition of every input and compute a function on all of them in one run,
but measuring gives you **one** random output. Nothing is gained unless the
algorithm first arranges, by interference, for the useful answers to carry
nearly all the probability. Only problems with special structure allow that,
and factoring happens to be one.

**Why it is hard to build.** Amplitudes are fragile. Heat, stray fields and
imperfect gates nudge them, and the cancellations that the algorithm depends
on stop being exact. Today's best qubits make an error roughly once in every
thousand operations. Shor's algorithm on a 2048-bit number needs billions of
operations in a row, so the errors must be corrected as they happen (section
20.8).

## 20.3 Shor's algorithm: factoring is finding a period

The idea is older than quantum computing and needs only
[Chapter 3](03-The-Arithmetic-of-Secrets.md). Pick a number $a$ that shares no
factor with $N$, and look at its powers mod $N$. They must eventually repeat.
The **period** $r$ is the smallest positive number with $a^r \equiv 1 \pmod N$.

**By hand, $N = 15$, $a = 7$.**

$$
7^1 \equiv 7, \quad 7^2 = 49 \equiv 4, \quad 7^3 \equiv 4 \cdot 7 = 28 \equiv 13, \quad 7^4 \equiv 13 \cdot 7 = 91 \equiv 1 \pmod{15}.
$$

So $r = 4$. Now the trick. Since $7^4 - 1 \equiv 0$, the product

$$
(7^2 - 1)(7^2 + 1) = 48 \cdot 50
$$

is a multiple of 15. Neither 48 nor 50 is a multiple of 15 on its own, so each
must share a prime with it: $\gcd(48, 15) = 3$ and $\gcd(50, 15) = 5$. We have
factored 15.

**In general.** If $r$ is even, then $a^r - 1 = (a^{r/2} - 1)(a^{r/2} + 1)$ is a
multiple of $N$. The first factor is not a multiple of $N$ (otherwise the period
would be $r/2$). If the second isn't either, that is, if
$a^{r/2} \not\equiv -1 \pmod N$, then $\gcd(a^{r/2} - 1, N)$ is a proper factor.
For an RSA modulus $N = pq$ a random $a$ works at least half the time; if it
fails, pick another.

<div class="mars-steps" markdown>

1. Choose $N = 21$ and a random $a = 2$. Check $\gcd(2, 21) = 1$.
2. Powers of 2 mod 21: 2, 4, 8, 16, 11, 1. The period is $r = 6$.
3. $r$ is even, so look at $a^{r/2} = 2^3 = 8$. It is not $-1 \equiv 20$, so this $a$ is good.
4. $\gcd(8 - 1, 21) = \gcd(7, 21) = 7$.
5. $\gcd(8 + 1, 21) = \gcd(9, 21) = 3$.
6. $21 = 7 \times 3$. Only step 2 was hard, and only step 2 needs a quantum computer.

</div>

Here is the whole method in Python. The function `period` finds $r$ by trying
$a, a^2, a^3, \ldots$ one after another. That loop is the **only** part a
quantum computer replaces:

```python
from math import gcd

def period(a, N):                       # the step a quantum computer does fast; here, the slow way
    r, x = 1, a % N
    while x != 1:
        x, r = x * a % N, r + 1
    return r

def shor_classical(N, a):
    g = gcd(a, N)
    if g > 1:
        return g                        # a lucky guess already shares a factor
    r = period(a, N)
    if r % 2 or pow(a, r // 2, N) == N - 1:
        return None                     # unlucky a: try another
    return gcd(pow(a, r // 2, N) - 1, N)

for N, a in ((15, 7), (21, 2), (3233, 3)):
    print(N, a, period(a, N), shor_classical(N, a))
print(shor_classical(15, 14))
```

Output:

```
15 7 4 3
21 2 6 7
3233 3 260 61
None
```

The third line factors the toy RSA modulus $3233 = 61 \times 53$ from
[Chapter 13](13-RSA.md). The last line shows a bad choice: $14 \equiv -1$, so
its period is 2 and $14^1 \equiv -1$, and the method gives nothing.

For a 2048-bit $N$ the period can have hundreds of digits, and the loop would
outlast the universe. Classically, finding the period is as hard as factoring.
Shor's contribution is a quantum way to find it.

## 20.4 Where the quantum computer comes in

*Level: intermediate.* The quantum part of Shor's algorithm has four steps. Let
$Q$ be a power of 2 with $Q \ge N^2$; for $N = 21$, $Q = 512$.

1. **Superpose every exponent.** Put a register of $\log_2 Q = 9$ qubits into
   an even superposition of all $x$ from 0 to 511 (a Hadamard on each qubit
   does it).
2. **Compute $a^x \bmod N$ into a second register, for all $x$ at once.** This
   is ordinary modular exponentiation, the square-and-multiply of
   [Chapter 13](13-RSA.md), built from reversible gates. It is by far the
   most expensive step.
3. **Apply the quantum Fourier transform** to the first register. Like the
   Fourier transform in signal processing, it turns a pattern that repeats every
   $r$ steps into sharp peaks at multiples of $Q/r$. The waves from different
   $x$ interfere: at most places they cancel, and at the peaks they add.
4. **Measure** the first register. You get one number $y$, almost always close
   to $k \cdot Q / r$ for some whole $k$.

You can't run a quantum computer here, but for small numbers you can compute
exactly what its measurement would give, by summing the waves directly. This
program does that for $N = 21$, $a = 2$, then recovers $r$ from a few possible
measurements with **continued fractions**: if $y/Q \approx k/r$, the
fraction with the smallest denominator near $y/Q$ reveals $r$.

```python
import cmath
from fractions import Fraction
from math import gcd

def measure_probs(N, a, Q):             # what the quantum measurement would give, computed the slow way
    f = [pow(a, x, N) for x in range(Q)]
    P = [0.0] * Q
    for v in set(f):                    # each value of a^x mod N contributes its own wave
        xs = [x for x in range(Q) if f[x] == v]
        for y in range(Q):
            P[y] += abs(sum(cmath.exp(2j * cmath.pi * x * y / Q) for x in xs)) ** 2 / Q ** 2
    return P

N, a, Q = 21, 2, 512                    # Q is a power of 2 with Q >= N^2
P = measure_probs(N, a, Q)
print([y for y in range(Q) if P[y] > 0.1])
print(round(sum(P[y] for y in range(Q) if P[y] > 0.1), 3))
for y in (85, 171, 427):
    guess = Fraction(y, Q).limit_denominator(N)   # continued fractions: nearest fraction with a small denominator
    r = guess.denominator
    print(y, guess, r, pow(a, r, N) == 1)
r = 6
print(gcd(pow(a, r // 2, N) - 1, N), gcd(pow(a, r // 2, N) + 1, N))
```

Output:

```
[0, 85, 171, 256, 341, 427]
0.789
85 1/6 6 True
171 1/3 3 False
427 5/6 6 True
7 3
```

Read it line by line. Out of 512 possible results, six values carry 79% of the
probability, and they sit at $0, 85.3, 170.7, 256, 341.3, 426.7$: the multiples
of $512/6$, rounded. A measurement of 85 or 427 gives $1/6$ or $5/6$, so
$r = 6$. A measurement of 171 gives $1/3$, which only reveals a divisor of $r$;
$2^3 \not\equiv 1$ shows it is wrong, and you run again (or combine several
runs with a least common multiple). A result of 0 tells you nothing. In
practice a handful of runs is enough.

**Why this is fast.** The summing loop above costs about $Q^2$ steps, which is
hopeless for big $N$. A quantum computer does the Fourier transform with about
$(\log_2 Q)^2$ gates, and the modular exponentiation with about $(\log_2 N)^3$
gates using schoolbook multiplication. The whole algorithm grows like the cube
of the key length. Doubling an RSA key from 2048 to 4096 bits makes the attack
about eight times longer and needs about twice the qubits: a nuisance, not a
defense.

## 20.5 Discrete logarithms and elliptic curves

*Level: intermediate.* Diffie-Hellman, DSA and every elliptic-curve scheme rest
on the discrete logarithm: given $g$ and $h = g^x$ in a group, find $x$.
Shor's paper solved this too. Look at the function of two exponents

$$
f(u, v) = g^u \cdot h^v = g^{u + x v}.
$$

It has the same value whenever $u + xv$ is the same mod the group order $q$, so
it repeats along the direction $(-x, 1)$: $f(u - x, v + 1) = f(u, v)$. That
hidden direction is a period in two dimensions, and a two-dimensional quantum
Fourier transform finds it, giving $x$.

Nothing in the argument uses what the group is. It works mod $p$ and on
elliptic curves alike. In fact elliptic curves fall *sooner*. A 256-bit curve
key gives the same classical security as 3072-bit RSA because the best
classical attack on curves is so much weaker, but Shor's cost depends only on
the size of the numbers, and 256 is much smaller than 3072. Roetteler, Naehrig,
Svore and Lauter estimated in 2017 that a 256-bit curve needs about 2,330
error-corrected (logical) qubits, against about 4,100 for factoring a 2048-bit
modulus with the standard circuit. The smaller keys that made elliptic curves
attractive in [Chapter 15](15-Elliptic-Curves.md) make them the first target.

## 20.6 Grover's algorithm: search in a square root

*Level: intermediate.* Grover's problem is the dumbest possible one: $N$ boxes,
one holds the prize, and the only way to check a box is to open it. Classically
you open $N/2$ boxes on average. Grover's algorithm needs about
$\frac{\pi}{4} \sqrt{N}$ steps.

**How.** Start with every box at the same amplitude $1/\sqrt N$. Each step does
two things:

1. The **oracle** flips the sign of the right box's amplitude. (The oracle is a
   circuit that runs the check, such as "does this key decrypt the message to
   something sensible?", on every box in superposition.)
2. **Inversion about the mean**: replace each amplitude $x$ by $2m - x$, where $m$
   is the average amplitude.

The flipped box sits far below the mean, so the reflection throws it far above.
Every step adds roughly $2/\sqrt N$ to its amplitude. This simulation uses 64
boxes:

```python
from math import pi, sqrt

N, target = 64, 42                      # 64 boxes; the key is in box 42
amp = [1 / sqrt(N)] * N                 # start with every box equally likely
for step in range(1, 9):
    amp[target] = -amp[target]          # the oracle flips the sign of the right answer
    mean = sum(amp) / N
    amp = [2 * mean - x for x in amp]   # reflect every amplitude about the mean
    print(step, round(amp[target] ** 2, 3))
print(round(pi / 4 * sqrt(N)))
```

Output:

```
1 0.135
2 0.344
3 0.591
4 0.816
5 0.964
6 0.997
7 0.907
8 0.718
6
```

After 6 steps the right box comes up 99.7% of the time, against 32 openings on
average for a classical search. Keep going and the probability falls again: the
amplitude rotates past its peak, so the number of steps must be right.

**What it does to keys and hashes.** An $n$-bit key has $2^n$ possibilities, so
Grover needs about $2^{n/2}$ steps. On paper AES-128 drops to 64-bit security
and AES-256 to 128. For a hash preimage the same square root applies. For
collisions, the classical birthday attack already costs only $2^{n/2}$, and the
best quantum collision algorithm (Brassard, Høyer and Tapp, 1998) needs so much
quantum memory that, once that is counted, it does no better than a classical
machine of the same cost.

**Why it is weaker in practice than on paper.** Three reasons.

- **The steps are sequential.** Classical key search splits across a million
  machines for a million-fold speed-up. Split Grover's search across $k$ quantum
  machines and each still needs $\sqrt{N/k}$ steps in a row, so $k$ machines
  gain only $\sqrt k$.
- **Each step is a whole AES circuit**, run fault-tolerantly. $2^{64}$ of those
  in a row is far beyond any foreseeable machine; at a million steps per second
  it would take over half a million years.
- **It is optimal.** Bennett, Bernstein, Brassard and Vazirani proved in 1997
  that no quantum algorithm can search an unstructured space faster than about
  $\sqrt N$ steps. There is no better Grover around the corner.

So symmetric cryptography survives with at most longer keys. NIST still counts
AES-128 as acceptable; users who want a wide margin, such as NSA's CNSA 2.0
suite, choose AES-256 and SHA-384.

## 20.7 What falls and what stands

| Family | Today's security | Against a large quantum computer | What replaces it |
|---|---|---|---|
| RSA, finite-field Diffie-Hellman, DSA | 112 to 128 bits | broken by Shor at every key size | ML-KEM ([Chapter 21](21-Lattice-Cryptography.md)), ML-DSA, SLH-DSA |
| ECDH, ECDSA, EdDSA | 128 bits | broken by Shor, on a smaller machine than RSA | the same, usually as a hybrid |
| AES-128 | 128 bits | 64 on paper (Grover), far more in practice | acceptable; AES-256 for the long term |
| AES-256, ChaCha20 | 256 bits | 128 on paper | nothing needed |
| SHA-256, SHA-3 | 128 collision, 256 preimage | collisions about the same; preimages 128 | nothing needed |
| HMAC, HKDF, Argon2 | as their hash | as their hash | nothing needed |
| Lattices, hash-based, code-based | 128 bits and up | no known large speed-up | they are the replacement |

The pattern is simple. **Public-key cryptography built on factoring or discrete
logs must be replaced. Symmetric cryptography and hashes stay.** Since every
TLS, SSH or Signal session uses public-key cryptography only to agree on a
symmetric key, replacing the key agreement protects everything after it.

## 20.8 How big a machine?

*Level: intermediate.* Raw qubit counts in press releases mislead, because
qubits make errors. A useful machine groups many noisy **physical qubits** into
each reliable **logical qubit** with a quantum error-correcting code. The most
studied, the **surface code**, spreads one logical qubit over a square patch of
physical ones and measures their parities constantly to catch errors without
looking at the data. At error rates near one in a thousand, a logical qubit
good enough for billions of operations costs hundreds to a thousand or more
physical qubits.

**The toy factorizations.** In 2001 a team from IBM's Almaden lab and Stanford,
led by Isaac Chuang with Lieven Vandersypen as first author, ran Shor's
algorithm on $N = 15$ using seven nuclear spins in a specially made molecule. A
photonic experiment did 21 in 2012. Both were real experiments, but to fit the
hardware the circuits were simplified using knowledge of the answer. In 2013
John Smolin, Graeme Smith and Alexander Vargo showed that with such shortcuts
you could "factor" enormous numbers with almost no quantum hardware. No
quantum computer has yet run Shor's algorithm without shortcuts on anything
larger than a classroom example.

**The chips.** Google's 53-qubit Sycamore (2019) performed a random sampling
task it estimated would take a supercomputer 10,000 years; later classical
simulations closed much of that gap. IBM's Condor passed 1,000 physical qubits
in 2023. In December 2024 Google's 105-qubit Willow chip showed that its error
rate **fell** as it used more qubits for error correction: the "below
threshold" behavior that large machines need. That was a milestone for
engineering, not for breaking keys.

**The estimates.** What it would take to break real keys has fallen sharply:

| Year | Target | Estimate | Who |
|---|---|---|---|
| 2003 | RSA with an $n$-bit modulus | $2n + 3$ logical qubits (4,099 for 2048 bits) | Beauregard |
| 2017 | 256-bit elliptic curve | about 2,330 logical qubits | Roetteler, Naehrig, Svore, Lauter |
| 2019 | RSA-2048 | about 20 million noisy qubits, 8 hours | Gidney and Ekerå |
| 2025 | RSA-2048 | under a million noisy qubits, under a week | Gidney |

Each estimate assumes about one error per thousand operations and a complete
fault-tolerant design. The largest machines in 2026 have hundreds to a few
thousand physical qubits, so the gap is still a factor of hundreds or more.
But it closes from both sides: hardware improves, and better circuits need less
of it. Newer preprints, which use other error-correcting codes and hardware
that can move qubits around, claim lower numbers still for both RSA and
elliptic curves; those are not yet checked by others. The history appendix's
[quantum chapter](../history/10-Quantum-and-Post-Quantum.md#how-big-must-it-be)
lists them with their sources.

**When?** Nobody knows. Serious opinions range from the early 2030s to never.
Surveys of researchers, such as the Global Risk Institute's yearly report, show
a wide spread, with a growing share expecting a cryptographically relevant
quantum computer within fifteen years. For planning, the date matters less than
the next section's argument.

## 20.9 Harvest now, decrypt later

An adversary with access to network links can record encrypted traffic today,
store it, and decrypt it the day a large quantum computer exists. Storage is
cheap, and intelligence agencies are known to keep intercepted traffic for
years. Anything sent today under RSA or elliptic-curve key exchange is only as
secret as that future machine allows.

Michele Mosca of the University of Waterloo turned this into a rule of thumb
(2015). Let

- $x$ = how many years your data must stay secret,
- $y$ = how many years it takes you to move your systems to new algorithms,
- $z$ = how many years until a quantum computer can break your keys.

If $x + y > z$, you are already too late: data sent near the end of your
migration still has to be secret after the machine arrives.

**A worked example.** A hospital's records must stay private for $x = 10$
years. Replacing every system, device and vendor contract takes $y = 5$ years.
If the machine comes in $z = 12$ years, then $x + y = 15 > 12$: records sent
in the last three years before the switch, and some before, are exposed.
Nobody knows $z$, but for medical, diplomatic, financial and industrial
secrets, $x$ alone is often 15 to 25 years.

The inequality also explains the order of the migration. **Key exchange first**,
because recorded traffic is the harvest. **Signatures later**, because a
signature can't be forged retroactively: a quantum computer in 2040 can forge
a 2040 signature, not make a 2026 one invalid. But anything that must still be
trusted when the machine arrives, root certificates, firmware keys in cars and
satellites, passports and smart cards built today and used for fifteen years,
needs quantum-safe signatures in its design now.

## 20.10 The NIST competition

*Level: intermediate.* Several families of public-key cryptography were known
long before anyone worried about quantum computers, and none of them uses
factoring or discrete logs:

- **Codes.** Robert McEliece's 1978 system hides a message among deliberate
  errors in an error-correcting code ([Chapter 22](22-Hash-and-Code-Based.md)).
- **Hashes.** Leslie Lamport's and Ralph Merkle's 1979 signatures need only a
  hash function ([Chapter 22](22-Hash-and-Code-Based.md)).
- **Lattices.** Miklós Ajtai's 1996 worst-case guarantee, the NTRU cryptosystem
  of Jeffrey Hoffstein, Jill Pipher and Joseph Silverman (1996), and Oded
  Regev's learning with errors (2005) ([Chapter 21](21-Lattice-Cryptography.md)).
- **Multivariate equations** (from the late 1980s) and **isogenies** between
  elliptic curves (from the 2000s), both with small keys and, as it turned out,
  more risk.

In August 2015 the NSA announced that it planned to move to quantum-resistant
algorithms, a surprise from the agency that had made elliptic curves the center
of its Suite B ten years earlier. In 2016 NIST published a report on the threat
(NIST IR 8105) and, in December, a call for proposals. It avoided the word
"competition" because it might pick several winners, but it ran like the AES
and SHA-3 contests: open submissions, public attacks, several rounds.

NIST defined five **security categories** by the cost of attacks on existing
primitives: category 1 is at least as hard as finding an AES-128 key, 2 a
SHA-256 collision, 3 an AES-192 key, 4 a SHA-384 collision, and 5 an AES-256 key.
Grover is already counted in those yardsticks, so the categories hold against
quantum attackers too.

| Date | Step |
|---|---|
| November 2017 | 82 submissions; 69 complete enough for round 1 |
| January 2019 | 26 go to round 2 |
| July 2020 | round 3: 7 finalists and 8 alternates |
| February 2022 | Ward Beullens breaks the finalist Rainbow in a weekend on a laptop |
| 5 July 2022 | NIST selects Kyber (key encapsulation) and Dilithium, Falcon and SPHINCS+ (signatures); four KEMs go to a fourth round |
| July 2022 | Wouter Castryck and Thomas Decru break the fourth-round KEM SIKE in about an hour on one core |
| August 2023 | draft standards |
| 13 August 2024 | FIPS 203 (ML-KEM), FIPS 204 (ML-DSA) and FIPS 205 (SLH-DSA) published |
| 11 March 2025 | HQC, a code-based KEM, chosen as a backup to ML-KEM (NIST IR 8545) |

Falcon, renamed FN-DSA, is to become FIPS 206; it was still in preparation when
this chapter was written. Because nearly every new signature was lattice-based
and large, NIST opened a second call for **additional signatures** in 2022: 40
entered the first round in 2023 and 14 the second in October 2024, most of them
multivariate, code-based or built from symmetric primitives. Other countries
ran their own processes (South Korea's KpqC chose its algorithms in January 2025),
and Germany's BSI and France's ANSSI recommend using the new algorithms only in
hybrid form for now, hash-based signatures excepted.

The two 2022 breaks shaped the outcome. Neither touched lattices or hashes, but
both showed that a problem studied for ten or fifteen years can still collapse.
NIST deliberately kept backups from different families: SLH-DSA (hashes) next to
ML-DSA, HQC (codes) next to ML-KEM. [Chapter 22](22-Hash-and-Code-Based.md)
tells the two breaks in detail.

## 20.11 Migrating: hybrids

*Level: intermediate.* Switching the world's key exchange to an algorithm a few
years old is itself a risk: ML-KEM could hide a flaw, as SIKE and Rainbow did.
So the first deployments are **hybrid**. Run a classical key exchange (X25519)
and a post-quantum one (ML-KEM) side by side, and feed **both** shared secrets
into the key derivation. An attacker must break both. A flaw in ML-KEM leaves
you with today's security; a quantum computer leaves you with ML-KEM's.

The TLS hybrid `X25519MLKEM768` does exactly this. The client's key share is an
ML-KEM-768 public key (1,184 bytes) followed by an X25519 public key (32 bytes).
The server encapsulates to the first and does ordinary X25519 with the second,
replying with an ML-KEM ciphertext (1,088 bytes) and its own X25519 key. The
two 32-byte secrets are concatenated and go into TLS's key schedule. This
program does the same with the real algorithms; it needs a recent version of
the `cryptography` package (it was run with version 50), which includes ML-KEM:

```python
# pip install cryptography
import hashlib
from cryptography.hazmat.primitives.asymmetric.mlkem import MLKEM768PrivateKey, MLKEM768PublicKey
from cryptography.hazmat.primitives.asymmetric.x25519 import X25519PrivateKey, X25519PublicKey

# client: one ML-KEM key and one X25519 key, sent together as its key share
kem, ec = MLKEM768PrivateKey.generate(), X25519PrivateKey.generate()
share = kem.public_key().public_bytes_raw() + ec.public_key().public_bytes_raw()

# server: encapsulate to the ML-KEM half, do ordinary X25519 with the other half
ss_kem, ct = MLKEM768PublicKey.from_public_bytes(share[:1184]).encapsulate()
ec2 = X25519PrivateKey.generate()
reply = ct + ec2.public_key().public_bytes_raw()
server = hashlib.sha3_256(ss_kem + ec2.exchange(X25519PublicKey.from_public_bytes(share[1184:]))).hexdigest()

# client: undo both and combine the same way
ss_kem2 = kem.decapsulate(reply[:1088])
client = hashlib.sha3_256(ss_kem2 + ec.exchange(X25519PublicKey.from_public_bytes(reply[1088:]))).hexdigest()
print(len(share), len(reply), client == server)
```

Output:

```
1216 1120 True
```

Compare 1,216 and 1,120 bytes with 32 each way for X25519 alone. The cost of
post-quantum key exchange is about 2 KB per handshake and a fraction of a
millisecond of computing, which the web turned out to absorb easily. Google's
first experiment, CECPQ1 in 2016, paired X25519 with the lattice scheme
NewHope in a test version of Chrome; CECPQ2 with Cloudflare in 2019 tried
NTRU-HRSS. They showed the larger messages mostly worked, and that some old
network equipment broke on unusually large handshakes, which had to be fixed
before a default switch.

**Who switched, and when.**

- **SSH went first.** OpenSSH 9.0 (April 2022) made the hybrid of Streamlined
  NTRU Prime and X25519 its default. OpenSSH 10.0 (April 2025) made
  `mlkem768x25519-sha256` the default.
- **Messaging.** Signal added PQXDH, with Kyber-1024 next to X25519, in
  September 2023. Apple's iMessage followed with PQ3 in iOS 17.4 (March 2024).
- **The web.** Chrome turned on a hybrid of X25519 and draft Kyber for desktop
  users in April 2024 and moved to the standard `X25519MLKEM768` with Chrome 131
  in November 2024. Firefox, Cloudflare and Apple's systems followed, and
  OpenSSL 3.5 (April 2025) ships ML-KEM, ML-DSA and SLH-DSA. By 2026 a large
  share of web traffic used post-quantum key exchange.

**Signatures and certificates are the hard part.** A TLS handshake carries
several signatures and public keys. Swapping a 64-byte Ed25519 signature for a
2,420-byte ML-DSA-44 one, several times over, adds kilobytes and slows
connections on poor networks. Public web certificates were still RSA and ECDSA
in late 2026, and new designs that need fewer signatures per handshake are being
worked out at the IETF. Firmware signing moved faster, with the hash-based LMS
and XMSS ([Chapter 22](22-Hash-and-Code-Based.md)).

**Deadlines.** NSA's CNSA 2.0 suite (September 2022) asks national security
systems to use ML-KEM-1024, ML-DSA-87, LMS or XMSS for firmware, AES-256 and
SHA-384 or SHA-512, with the transition complete by 2035. NIST IR 8547 sets the
same shape for US federal systems: quantum-vulnerable public-key algorithms are
deprecated after 2030 and disallowed after 2035. The UK's NCSC and a European
Union roadmap point to 2035 as well.

**How an organization migrates.** The algorithms are the easy part. The work is:

1. **Inventory.** Find every place that uses RSA or elliptic curves: protocols,
   certificates, code-signing keys, hardware tokens, file formats, partners.
2. **Prioritize** by Mosca's $x$: long-lived secrets and long-lived devices first.
3. **Turn on hybrid key exchange** wherever libraries support it (TLS, SSH,
   VPNs). This is usually a configuration change.
4. **Build crypto agility**: code that names its algorithms in one place and can
   change them without a redesign, so the next migration is cheaper.
5. **Plan signatures** for roots and firmware with long lifetimes, then for the
   rest as standards and certificates arrive.

## 20.12 Break it: myths and mistakes

*Level: intermediate.* Most failures around quantum computing so far are of
judgment, not mathematics.

**"Quantum computer breaks RSA" headlines.** In December 2022 a group of
Chinese researchers claimed that RSA-2048 could be broken with 372 qubits by
combining Schnorr's lattice factoring method with a quantum optimization
routine. Experts showed quickly that the method gives no real speed-up and the
estimate was empty. Factoring "records" on quantum annealers, such as D-Wave
machines, use methods that don't scale like Shor's. A claim deserves attention
only if it runs Shor's algorithm (or a successor) without using the answer to
simplify the circuit.

**"Quantum key distribution will save us."** QKD uses photons to agree on a key,
with security from physics instead of mathematics. It needs special hardware
and dedicated fiber or satellite links, works only point to point over limited
distances, and still needs a classical signature or pre-shared key to know who
is at the other end. Real QKD systems have been attacked through their hardware.
NSA, the UK's NCSC and France's ANSSI advise post-quantum cryptography instead
for nearly all uses.

**"Use bigger RSA keys."** Shor's cost grows only like the cube of the key size.
A 16,384-bit key buys a factor of a few hundred in time; it costs much more than
that in everyday performance.

**"Our data is boring, so we can wait."** Mosca's inequality is about how long
the data must stay secret, not about how interesting it is today.

**Real implementation bugs in the replacements.** The new algorithms bring new
code, and code fails as it always has. In 2023 and 2024 the **KyberSlash**
timing leaks, a division whose duration depended on secret data, turned up in
many Kyber libraries, including the reference code, and allowed key recovery.
[Chapter 21](21-Lattice-Cryptography.md) returns to it. This is one more reason
for hybrids during the transition.

## 20.13 In the real world

- **Standards.** FIPS 203 (ML-KEM), FIPS 204 (ML-DSA), FIPS 205 (SLH-DSA), with
  FN-DSA and HQC to follow; SP 800-208 for LMS and XMSS. NIST IR 8547 for the
  transition dates. The reference pages, [ML-KEM](../01-key-exchange/ML-KEM.md),
  [ML-DSA](../02-signatures/ML-DSA.md), [SLH-DSA](../02-signatures/SLH-DSA.md),
  [FN-DSA](../02-signatures/FN-DSA.md) and
  [code-based KEMs](../01-key-exchange/Code-Based-KEMs.md), have the sizes.
- **What to do today.** Turn on hybrid key exchange (`X25519MLKEM768` in TLS,
  `mlkem768x25519-sha256` in SSH); keep AES-256 or ChaCha20 and SHA-256 or
  better; plan post-quantum signatures for anything that must be trusted past
  2035.
- **Status.** The [algorithm table](../index.md) gives every algorithm's NIST IR
  8547 dates. The [FAQ](../FAQ.md#will-quantum-computers-break-all-of-this) has a
  short answer for non-specialists.

## 20.14 Going deeper

*Level: expert.*

??? abstract "The quantum Fourier transform and why the peaks appear"

    After the modular exponentiation, measuring the second register (or just ignoring it) leaves the
    first in an even superposition of the $M \approx Q/r$ exponents with one value of $a^x \bmod N$:

    $$
    \frac{1}{\sqrt M} \sum_{j=0}^{M-1} \lvert x_0 + j r \rangle .
    $$

    The quantum Fourier transform maps $\lvert x \rangle$ to $\frac{1}{\sqrt Q} \sum_y e^{2\pi i x y / Q} \lvert y \rangle$, so the
    amplitude of $y$ becomes

    $$
    \frac{e^{2\pi i x_0 y / Q}}{\sqrt{MQ}} \sum_{j=0}^{M-1} e^{2\pi i j r y / Q} .
    $$

    The sum is a geometric series of unit vectors. When $ry/Q$ is close to a whole number they all point
    the same way and add to about $M$; otherwise they spin around and cancel. So the probability
    concentrates on $y$ with $\lvert y - kQ/r \rvert \le 1/2$, with total probability at least $4/\pi^2 \approx 0.405$ for
    each run (more when $r$ divides $Q$). The QFT itself is a product of $O((\log Q)^2)$ Hadamard and controlled
    phase gates, the quantum version of the FFT's butterfly.

??? abstract "Continued fractions: from a measurement to the period"

    A measurement $y$ satisfies $\lvert y/Q - k/r \rvert \le 1/(2Q)$. With $Q \ge N^2 > r^2$, that gives
    $\lvert y/Q - k/r \rvert < 1/(2r^2)$, and a theorem of Legendre says any fraction that close to $y/Q$ is one of
    its continued-fraction convergents. Expanding $427/512$:

    $$
    \frac{427}{512} = 0 + \cfrac{1}{1 + \cfrac{1}{5 + \cfrac{1}{42 + \cfrac{1}{2}}}}
    $$

    with convergents $0,\ 1,\ 5/6,\ 211/253,\ 427/512$; the last one with denominator below $N = 21$ is $5/6$. If $k$ and $r$
    share a factor, the denominator is a proper divisor of $r$ (the $171 \to 1/3$ case). Taking the least common
    multiple of the denominators from a few runs gives $r$ with high probability. Python's
    `Fraction.limit_denominator` does exactly this search.

??? abstract "Counting the cost: logical qubits, T gates and magic states"

    Resource estimates count two things. **Logical qubits**: Beauregard's circuit uses $2n + 3$ for an $n$-bit
    modulus; Gidney and Ekerå's 2019 design used more qubits but far fewer operations, through windowed
    arithmetic and the Ekerå-Håstad variant that needs fewer runs. **Non-Clifford gates** (T or Toffoli
    gates): the surface code does Clifford gates cheaply, but each T gate consumes a **magic state** that must
    be "distilled" in separate factories of qubits. For RSA-2048 the count is in the billions, and the
    factories dominate the physical qubit count. Gidney's 2025 estimate cut the total mainly through
    approximate residue arithmetic (building on Chevignard, Fouque and Schrottenloher, 2024), which needs far
    fewer qubits at a time, denser storage for idle qubits, and a cheaper way to make magic states. At an error rate of $10^{-3}$ per physical operation and a code distance $d$ around 25, each
    logical qubit costs about $2d^2 \approx 1{,}250$ physical qubits. All such estimates depend heavily on the
    assumed error rates and on the cycle time of the hardware.

??? abstract "Grover's limits and NIST's MAXDEPTH"

    Grover's algorithm is a rotation in the plane spanned by the target and the even superposition: each
    iteration turns the state by about $2/\sqrt N$ radians, so after $\frac{\pi}{4}\sqrt N$ iterations it points at the target.
    Bennett, Bernstein, Brassard and Vazirani (1997) proved that $\Omega(\sqrt N)$ oracle calls are necessary. With $k$
    machines each searching $N/k$ items, the depth is $\sqrt{N/k}$, so the total work is $k \sqrt{N/k} = \sqrt{kN}$:
    parallelism costs extra work. NIST's call for proposals therefore bounded quantum attacks by
    **MAXDEPTH**, the longest circuit an attacker can run in sequence, with plausible values from $2^{40}$ to $2^{96}$
    gates. Under any of those, a Grover attack on AES-128 must be split so widely that its total cost stays far
    above $2^{64}$, which is why NIST keeps AES-128 in category 1.

??? abstract "Which problems a quantum computer helps with"

    Shor's algorithm generalizes to the **hidden subgroup problem** in commutative (abelian) groups: find a
    subgroup $H$ given a function that is constant exactly on its cosets. Factoring, discrete logs in any
    group, and Simon's problem are all of this kind. Lattice problems relate instead to hidden subgroups
    in non-commutative groups (the dihedral group), where the best quantum algorithm, Kuperberg's (2003), still
    takes subexponential time and gives only small gains at cryptographic sizes. Graph isomorphism, NP-complete
    problems and generic search have no known exponential quantum speed-up. Post-quantum cryptography is
    the bet that the hard problems in Chapters 21 and 22 belong to this second group.

## Check yourself

??? question "1. A qubit is in the state (0.6, 0.8). What are the chances of measuring 0 and 1?"

    $0.6^2 = 0.36$ for 0 and $0.8^2 = 0.64$ for 1. They add to 1, as they must.

??? question "2. Apply the Hadamard gate to (0, 1), then again. What do you get each time?"

    First $(0.707, -0.707)$: measuring gives 0 or 1 with probability one half each. Then
    $\left(\frac{0.707 - 0.707}{\sqrt 2}, \frac{0.707 + 0.707}{\sqrt 2}\right) = (0, 1)$. The minus sign is what lets the 0 paths cancel.

??? question "3. Factor 35 by hand with a = 2, using the period."

    Powers of 2 mod 35: 2, 4, 8, 16, 32, 29, 23, 11, 22, 9, 18, 1. So $r = 12$. Then $2^6 = 64 \equiv 29$, which is not
    $-1 \equiv 34$. $\gcd(28, 35) = 7$ and $\gcd(30, 35) = 5$. So $35 = 7 \times 5$.

??? question "4. With N = 15 and a = 4, what goes wrong, and is the run wasted?"

    Powers of 4 mod 15: 4, 1, so $r = 2$ and $4^1 = 4$, which is not $-1 \equiv 14$. $\gcd(3, 15) = 3$ and $\gcd(5, 15) = 5$:
    it works. Now try $a = 14$: $r = 2$ but $14 \equiv -1$, so the method gives only the trivial factors 1 and 15.
    The run is wasted; pick another $a$.

??? question "5. Grover on 1,024 boxes: about how many steps, and how many for a classical search?"

    $\frac{\pi}{4}\sqrt{1024} = \frac{\pi}{4} \cdot 32 \approx 25$ steps, against 512 openings on average classically.

??? question "6. Data must stay secret for 20 years and migration takes 7. When must the quantum computer not yet exist?"

    Mosca's inequality needs $z \ge x + y = 27$ years. If a quantum computer is possible within 27 years, the
    migration should already have started.

??? question "7. Why is an elliptic-curve key at more risk from Shor than an RSA key of the same classical strength?"

    Shor's cost depends on the size of the numbers, not on the best classical attack. A 256-bit curve and
    3072-bit RSA both give 128-bit classical security, but the curve's numbers are twelve times shorter, so
    it needs far fewer logical qubits (about 2,330 against several thousand) and fewer operations.

??? question "8. Why does a hybrid of X25519 and ML-KEM need both secrets in the key derivation, not just one?"

    If the key came from only one of them, breaking that one would be enough. Hashing both together means
    an attacker must know both secrets, so the session is at least as strong as the stronger of the two.

??? question "9. A vendor offers 'quantum-safe' 8192-bit RSA. What do you tell them?"

    Shor's algorithm breaks RSA at any size in polynomial time; 8192 bits needs roughly four times the
    qubits and 64 times the operations of 2048 bits. It is not quantum-safe, and it is slow today. Use ML-KEM
    or ML-DSA, ideally in a hybrid.

??? question "10. In the simulation for N = 21, why do the peaks near 85 and 171 hold less probability than those at 0 and 256?"

    $Q/r = 512/6 \approx 85.33$ is not a whole number, so the multiples $kQ/r$ fall between integers, and the
    probability leaks to neighbors (84, 86, 170, 172 and so on). At $k = 0$ and $k = 3$, $kQ/r$ is exactly 0 and 256,
    so all the waves line up perfectly there.

## What you learned

- A qubit holds two amplitudes; measuring gives one random answer. Quantum
  algorithms work by **interference**, making wrong answers cancel.
- **Shor's algorithm** factors $N$ by finding the period of $a^x \bmod N$ with a
  quantum Fourier transform. The same method solves discrete logs, mod $p$ and
  on elliptic curves. Larger keys don't help.
- **Grover's algorithm** searches in $\sqrt N$ steps, sequentially. It halves
  key and preimage security on paper and much less in practice: AES and SHA-2
  survive.
- Breaking RSA-2048 was estimated in 2025 at under a million noisy qubits;
  today's machines have a few thousand at most. The gap is shrinking from both
  sides.
- **Harvest now, decrypt later** and Mosca's $x + y > z$ explain why key
  exchange is being replaced now.
- NIST's open process (2016 to 2024) produced ML-KEM, ML-DSA and SLH-DSA, with
  FN-DSA and HQC to follow. Deployment is **hybrid**: classical and
  post-quantum together.

**Next:** [Chapter 21](21-Lattice-Cryptography.md) opens up the lattices behind
ML-KEM and ML-DSA.

## Further reading

- Peter W. Shor, "Polynomial-Time Algorithms for Prime Factorization and
  Discrete Logarithms on a Quantum Computer", *SIAM Journal on Computing* 26
  (1997); first version at FOCS 1994.
- Lov K. Grover, "A Fast Quantum Mechanical Algorithm for Database Search",
  STOC 1996.
- Michael A. Nielsen and Isaac L. Chuang, *Quantum Computation and Quantum
  Information* (Cambridge University Press, 2000; 10th anniversary edition
  2010): the standard textbook.
- Scott Aaronson, *Quantum Computing Since Democritus* (Cambridge University
  Press, 2013): a readable tour of what quantum computers can and cannot do.
- Craig Gidney and Martin Ekerå, "How to Factor 2048 Bit RSA Integers in 8
  Hours Using 20 Million Noisy Qubits", *Quantum* 5 (2021);
  [Craig Gidney, "How to Factor 2048 Bit RSA Integers with Less than a Million Noisy Qubits" (2025)](https://arxiv.org/abs/2505.15917).
- Martin Roetteler, Michael Naehrig, Krysta Svore and Kristin Lauter, "Quantum
  Resource Estimates for Computing Elliptic Curve Discrete Logarithms",
  ASIACRYPT 2017.
- Michele Mosca, "Cybersecurity in an Era with Quantum Computers: Will We Be
  Ready?", *IEEE Security & Privacy* 16, no. 5 (2018).
- NIST IR 8105 (2016), NIST IR 8413 (round 3 report, 2022), NIST IR 8547
  (transition), and the [NIST post-quantum project](https://csrc.nist.gov/projects/post-quantum-cryptography).
- The appendix chapter [Quantum and post-quantum](../history/10-Quantum-and-Post-Quantum.md)
  for the full timeline, and the earlier lesson
  [What quantum computers break](../learn/Quantum-Computing.md).
