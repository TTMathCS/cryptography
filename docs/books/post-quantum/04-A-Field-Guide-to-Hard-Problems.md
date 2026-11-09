# 4. A Field Guide to Hard Problems

*A post-quantum scheme is only as strong as the problem it hides behind, and the new
schemes hide behind six quite different kinds of problem: lattices, error-correcting codes,
hash functions, systems of quadratic equations, isogenies between elliptic curves, and
proofs that simulate a multi-party computation "in the head". This chapter is a tour of all
six. For each you will solve a tiny instance by brute force, see why the real instance is out
of reach, learn its history and its record of attacks, and see the sizes it leads to. By the
end you will be able to draw the chart every engineer draws when choosing a scheme, and to
explain why the standards deliberately rest on more than one family.*

!!! abstract "In this chapter"
    **You will learn:**

    - the hard problem behind each family of post-quantum schemes, with a small instance
      solved in code;
    - where each family came from, which schemes use it, and how it has fared under attack;
    - a working toy for each family's trapdoor: one-bit LWE encryption, Hamming decoding,
      Winternitz signatures, Oil and Vinegar, an isogeny walk, MPC-in-the-head's commitments;
    - the sizes and speeds of each family, for the final standards and the eight signature
      candidates still in NIST's third round;
    - how the best attack on each family grows with its parameters, with numbers;
    - why NIST and others standardized more than one family, told through Rainbow and SIKE;
    - which families each country has chosen, and what each costs on the Mars-Earth link.

    **You need:** [Chapters 1 to 3](01-The-Quantum-Threat-Measured.md); matrices and vectors
    modulo a number; the idea of a hash function. Every family returns in its own chapters
    later; this one gives the map.

    **Levels:** §4.1 to §4.3 are for beginners, §4.4 to §4.13 are intermediate, §4.14 is
    expert.

## 4.1 The problem

*Level: beginner.*

RSA and Diffie-Hellman were never chosen from a list of candidates in the way the new
schemes were. They arrived in the late 1970s, were attacked by everyone for decades, and
earned trust slowly: the best attacks on factoring improved in jumps until about 1990 and
then settled. By the time quantum computers forced a change, cryptographers had nearly
fifty years of experience with those two problems and little with anything else.

What else is there? The requirements are strict. A problem must be easy to set up with a
secret (a trapdoor or a short key), hard to solve without the secret for a classical
computer, and hard for a quantum computer too, which rules out anything Shor's algorithm
can reach: no hidden structure of an abelian group. It must lead to keys and messages small
enough to send over a network and computations fast enough to run on a phone. And it must
have been studied long enough that a sudden break is unlikely.

Six families meet most of those requirements. Figure 4.1 places them by their age and by
how they have weathered attack.

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="Six families of post-quantum problems placed on a timeline by the year their first scheme appeared: codes 1978, hashes 1979, multivariate 1988, lattices 1996, isogenies 1997 and 2011, MPC-in-the-head 2007" fill="currentColor" font-size="14">
<line x1="40" y1="280" x2="620" y2="280" stroke="currentColor"/>
<text x="40" y="300" text-anchor="middle">1975</text>
<text x="185" y="300" text-anchor="middle">1990</text>
<text x="330" y="300" text-anchor="middle">2005</text>
<text x="475" y="300" text-anchor="middle">2020</text>
<line x1="40" y1="276" x2="40" y2="284" stroke="currentColor"/>
<line x1="185" y1="276" x2="185" y2="284" stroke="currentColor"/>
<line x1="330" y1="276" x2="330" y2="284" stroke="currentColor"/>
<line x1="475" y1="276" x2="475" y2="284" stroke="currentColor"/>
<rect x="69" y="40" width="551" height="28" class="soft" stroke="currentColor"/>
<text x="76" y="59">codes: McEliece 1978 → Classic McEliece, HQC</text>
<rect x="79" y="76" width="541" height="28" class="soft" stroke="currentColor"/>
<text x="86" y="95">hashes: Lamport, Merkle 1979 → LMS, XMSS, SLH-DSA</text>
<rect x="166" y="112" width="454" height="28" class="soft-acc" stroke="currentColor"/>
<text x="173" y="131">multivariate: 1988 → UOV, MAYO (Rainbow fell 2022)</text>
<rect x="243" y="148" width="377" height="28" class="soft" stroke="currentColor"/>
<text x="250" y="167">lattices: Ajtai, NTRU 1996 → ML-KEM, ML-DSA, Falcon</text>
<rect x="253" y="184" width="367" height="28" class="soft-acc" stroke="currentColor"/>
<text x="260" y="203">isogenies: 1997, SIDH 2011 (SIKE fell 2022) → SQIsign</text>
<rect x="349" y="220" width="271" height="28" class="soft" stroke="currentColor"/>
<text x="356" y="239">MPC-in-the-head: 2007 → FAEST, SDitH</text>
<text x="40" y="24" font-size="12">Bars start at the first scheme of each family; accent marks families that lost a NIST finalist or candidate to a classical attack in 2022.</text>
</svg>
<figcaption>Figure 4.1. The six families by age. Age is not everything (lattice cryptography is younger than multivariate and is trusted more), but a long, quiet record of attack is the best evidence there is.</figcaption>
</figure>

The sections that follow take them one at a time, from the one that carries most of the
standards to the newest.

## 4.2 Lattices: learning with errors

*Level: beginner.*

**The problem.** Pick a modulus $q$, a secret vector $s$ of small numbers, and a public
random matrix $A$. Publish $A$ and

$$b = A s + e \pmod q,$$

where $e$ is a vector of small random "errors". The **learning with errors** problem (LWE)
is to recover $s$ from $(A, b)$. Without the errors it would be a system of linear
equations, solved in an instant by Gaussian elimination. With them, every equation is a
little wrong, elimination amplifies the wrongness until it covers the whole range of
values, and the best known attacks, classical and quantum, take time exponential in the
dimension of $s$.

**By hand.** With $q = 17$, a secret $s = (1, -1)$ and one row of $A$ equal to $(5, 3)$,
the exact value is $5 \cdot 1 + 3 \cdot (-1) = 2$; with error $+1$ the published value is
$b = 3$. A second row $(9, 14)$ gives $9 - 14 = -5 \equiv 12$, published with error $-1$ as
$11$. Seeing only $(5, 3, 3)$ and $(9, 14, 11)$, can you find $s$? Try each of the nine
small secrets in $\{-1, 0, 1\}^2$: compute $b - As$ for each and see whether both
coordinates come out in $\{-1, 0, 1\}$. Only $(1, -1)$ does. In two dimensions guessing is
easy. In 768 dimensions there are $3^{768}$ guesses, about $10^{366}$.

**Code it.** The program builds random LWE instances with secrets and errors in
$\{-1, 0, 1\}$ and finds the secret by trying every candidate in order. Watch the number of
candidates grow by three times per added dimension.

```python
import itertools, random

def lwe_instance(n, m, q, seed):
    rnd = random.Random(seed)
    s = [rnd.choice((-1, 0, 1)) for _ in range(n)]
    A = [[rnd.randrange(q) for _ in range(n)] for _ in range(m)]
    b = [(sum(a * x for a, x in zip(row, s)) + rnd.choice((-1, 0, 1))) % q for row in A]
    return A, b, s

def fits(A, b, guess, q):
    """True if b - A*guess is small (in -1..1) in every coordinate."""
    for row, bi in zip(A, b):
        r = (bi - sum(a * x for a, x in zip(row, guess))) % q
        if r not in (0, 1, q - 1):
            return False
    return True

def brute_force(A, b, n, q):
    tried = 0
    for guess in itertools.product((-1, 0, 1), repeat=n):
        tried += 1
        if fits(A, b, guess, q):
            return list(guess), tried

q = 3329
for n in (4, 6, 8, 10):
    A, b, s = lwe_instance(n, 2 * n, q, seed=n)
    found, tried = brute_force(A, b, n, q)
    print("n = %2d: tried %6d of %6d secrets, correct: %s" % (n, tried, 3 ** n, found == s))
```

Running it prints:

```text
n =  4: tried     12 of     81 secrets, correct: True
n =  6: tried    523 of    729 secrets, correct: True
n =  8: tried    991 of   6561 secrets, correct: True
n = 10: tried  42782 of  59049 secrets, correct: True
```

Brute force is the worst attack, not the best. The real attacks, lattice reduction (Chapter
6), do far better, but still take time $2^{c n}$ for a constant $c$ that, at ML-KEM's sizes,
works out to the figures of Chapter 2. No quantum algorithm is known that does more than
shave the constant.

**Why "lattice".** The set of all integer combinations of the columns of a matrix, together
with all multiples of $q$, forms a regular grid of points in space, a **lattice**. LWE asks
for the lattice point nearest to $b$ (the "closest vector problem" in disguise), and the
attacks are algorithms for finding short or close vectors in lattices. Chapter 5 makes this
precise.

**History in brief.** Miklós Ajtai showed in 1996 that a lattice problem has a rare and
precious property: solving random instances is as hard as solving the *hardest* instances
of a related problem, a **worst-case to average-case reduction**. That same year Jeffrey
Hoffstein, Jill Pipher and Joseph Silverman presented NTRU, a fast lattice encryption
scheme without such a proof. Oded Regev defined LWE in 2005 and proved a quantum reduction
from worst-case lattice problems to it, for which he received the Gödel Prize in 2018.
Structured versions over polynomial rings (Lyubashevsky, Peikert and Regev, 2010) and
modules (Langlois and Stehlé, 2015) made the schemes small and fast. ML-KEM and ML-DSA are
module-lattice schemes; Falcon is an NTRU-lattice scheme.

**Record.** Lattice schemes have been broken, early ones such as GGH (Nguyen, 1999) and
some NTRU signature variants, and parameter estimates have moved down by a few bits at a
time as reduction algorithms improved. The core problems, LWE and its module and ring
forms at standard parameters, have no significant classical or quantum break. A claimed
quantum algorithm in April 2024 was withdrawn within days after a bug was found
(Chapter 1).

**Sizes.** About one kilobyte for keys and ciphertexts, two to five kilobytes for
signatures, with fast operations: tens of microseconds on a laptop.

### A toy LWE encryption

A hard problem is only half a scheme; the other half is a way for the owner of the secret to
use it. Regev's 2005 paper gave the first and simplest. The public key is the LWE instance
itself, the rows $(a_i, b_i)$ with $b_i = a_i \cdot s + e_i$. To encrypt one bit, add up a
random subset of the rows, and add $\lfloor q/2 \rfloor$ to the last coordinate if the bit is 1:

$$u = \sum_{i \in S} a_i, \qquad v = \sum_{i \in S} b_i + \text{bit} \cdot \lfloor q/2 \rfloor \pmod q.$$

The owner of $s$ computes $d = v - u \cdot s$. Every $a_i \cdot s$ cancels, and what is left
is $\sum_{i \in S} e_i + \text{bit} \cdot \lfloor q/2 \rfloor$: a small number if the bit was
0, a number near $q/2$ if it was 1. Anyone without $s$ sees $(u, v)$, which looks like one
more random LWE sample, so the bit is hidden by the same problem that hides the key.

**By hand.** Use the two rows above, $(5, 3; 3)$ and $(9, 14; 11)$ with $q = 17$ and
$s = (1, -1)$.

<div class="mars-steps" markdown>

1. **Encrypt 1 with both rows.** $u = (5 + 9, 3 + 14) = (14, 17) \equiv (14, 0)$ and
   $v = 3 + 11 + 8 = 22 \equiv 5$, where $8 = \lfloor 17/2 \rfloor$. The ciphertext is
   $((14, 0), 5)$.
2. **Decrypt it.** $d = 5 - (14 \cdot 1 + 0 \cdot (-1)) = -9 \equiv 8$. The errors $+1$ and
   $-1$ cancelled, $d$ sits exactly at $\lfloor q/2 \rfloor$, and the bit is 1.
3. **Encrypt 0 with the first row alone.** $u = (5, 3)$, $v = 3$.
4. **Decrypt it.** $d = 3 - (5 - 3) = 1$, one step from 0: the bit is 0, and the 1 is the
   first row's error showing through.

</div>

Decryption works as long as the summed errors stay closer to their target than to the other
one, that is, smaller than about $q/4$. Figure 4.2 shows the rule on the circle of numbers
modulo 17.

<figure class="mars-fig">
<svg viewBox="0 0 640 200" width="640" role="img" aria-label="The numbers 0 to 16 modulo 17 on a line. Values 5 to 12, near q/2, decrypt to 1 and are shaded; values 13 to 16 and 0 to 4, near 0 (wrapping around), decrypt to 0. The two worked examples are marked: d = 1 decrypts to 0, d = 8 decrypts to 1." fill="currentColor" font-size="14">
<rect x="204" y="70" width="256" height="40" fill="currentColor" fill-opacity=".15" stroke="currentColor"/>
<line x1="44" y1="110" x2="588" y2="110" stroke="currentColor"/>
<g text-anchor="middle" font-size="13">
<text x="60" y="130">0</text><text x="92" y="130">1</text><text x="124" y="130">2</text><text x="156" y="130">3</text><text x="188" y="130">4</text><text x="220" y="130">5</text><text x="252" y="130">6</text><text x="284" y="130">7</text><text x="316" y="130">8</text><text x="348" y="130">9</text><text x="380" y="130">10</text><text x="412" y="130">11</text><text x="444" y="130">12</text><text x="476" y="130">13</text><text x="508" y="130">14</text><text x="540" y="130">15</text><text x="572" y="130">16</text>
</g>
<path d="M60 105v10M92 105v10M124 105v10M156 105v10M188 105v10M220 105v10M252 105v10M284 105v10M316 105v10M348 105v10M380 105v10M412 105v10M444 105v10M476 105v10M508 105v10M540 105v10M572 105v10" stroke="currentColor"/>
<text x="332" y="94" text-anchor="middle">decrypts to 1 (near q/2)</text>
<text x="124" y="94" text-anchor="middle">decrypts to 0</text>
<text x="524" y="94" text-anchor="middle">decrypts to 0</text>
<text x="320" y="40" text-anchor="middle" font-size="13" fill-opacity=".7">16 wraps around to 0: the two "0" zones are one zone on the circle</text>
<line x1="92" y1="150" x2="92" y2="136" stroke="currentColor" stroke-width="2"/>
<text x="92" y="168" text-anchor="middle" font-size="13">d = 1: bit 0</text>
<line x1="316" y1="150" x2="316" y2="136" stroke="currentColor" stroke-width="2"/>
<text x="316" y="168" text-anchor="middle" font-size="13">d = 8: bit 1</text>
</svg>
<figcaption>Figure 4.2. Decrypting a toy LWE ciphertext with q = 17. The owner of the secret strips the key off and reads the bit from where d lands: near 0 (wrapping around from 16) means 0, near q/2 means 1. Noise moves d away from its target; more than about q/4 of noise sends it into the wrong zone.</figcaption>
</figure>

**Code it.** The same scheme with 8 secret coordinates and 16 or 64 public rows, encrypting
2,000 random bits each time. The error sum grows with the number of rows added, so for a
fixed $q$ more rows means more failures, and a smaller $q$ leaves less room.

```python
import random

def keygen(n, m, q, rnd):
    s = [rnd.choice((-1, 0, 1)) for _ in range(n)]
    A = [[rnd.randrange(q) for _ in range(n)] for _ in range(m)]
    b = [(sum(a * x for a, x in zip(row, s)) + rnd.choice((-1, 0, 1))) % q for row in A]
    return (A, b), s

def encrypt(pk, bit, q, rnd):
    A, b = pk
    rows = [i for i in range(len(A)) if rnd.randrange(2)]      # a random subset of rows
    u = [sum(A[i][j] for i in rows) % q for j in range(len(A[0]))]
    v = (sum(b[i] for i in rows) + bit * (q // 2)) % q
    return u, v

def decrypt(s, ct, q):
    u, v = ct
    d = (v - sum(a * x for a, x in zip(u, s))) % q            # = noise + bit * q//2
    return 1 if abs(d - q // 2) < min(d, q - d) else 0      # nearer q/2 than 0?

rnd = random.Random(2026)
for n, m, q in [(8, 16, 97), (8, 64, 97), (8, 64, 41), (8, 64, 23), (8, 64, 11)]:
    pk, s = keygen(n, m, q, rnd)
    bits = [rnd.randrange(2) for _ in range(2000)]
    wrong = sum(decrypt(s, encrypt(pk, x, q, rnd), q) != x for x in bits)
    print("n=%d m=%2d q=%2d: %4d of 2000 bits decrypt wrongly" % (n, m, q, wrong))
```

It prints:

```text
n=8 m=16 q=97:    0 of 2000 bits decrypt wrongly
n=8 m=64 q=97:    0 of 2000 bits decrypt wrongly
n=8 m=64 q=41:   12 of 2000 bits decrypt wrongly
n=8 m=64 q=23:  158 of 2000 bits decrypt wrongly
n=8 m=64 q=11: 1121 of 2000 bits decrypt wrongly
```

With $q = 97$ there is room for the noise; at $q = 41$ a few bits in a thousand flip; at
$q = 11$ decryption is a coin toss. Every lattice scheme lives inside this trade-off: a larger
$q$ relative to the noise makes decryption reliable but the LWE instance easier, a smaller one
is safer but fails more often. ML-KEM's failure rate is about $2^{-139}$ per ciphertext at
ML-KEM-512, and the Fujisaki-Okamoto transform of [Chapter 3](03-KEMs-and-Signatures.md)
turns a rare failure into a harmless rejection. ML-KEM encrypts 256 bits at once and uses
polynomial rings to shrink the key (Chapters [7](07-Rings-Modules-and-the-NTT.md) and
[8](08-ML-KEM.md)), but it decrypts by the same rule: round $d$ to the nearer of 0 and $q/2$.

## 4.3 Codes: decoding a random code

*Level: beginner.*

**The problem.** A **linear code** is a set of binary words (codewords) closed under
XOR, described by a **parity-check matrix** $H$: a word $x$ is a codeword exactly when
$Hx = 0$. Error-correcting codes are used everywhere, in phone networks, hard disks and
deep-space links, to fix bits flipped by noise. Decoding is easy for codes built with a
special structure. For a *random* code it is hard: given $H$ and a **syndrome** $s = He$,
find an error vector $e$ with only $t$ ones. This **syndrome decoding** problem was proved
NP-complete by Berlekamp, McEliece and van Tilborg in 1978, and its best attacks have
improved only slowly since 1962.

**The trapdoor.** Robert McEliece's 1978 idea was to take a code with a fast decoder, a
binary Goppa code, and disguise it so that it looks random. The public key is the
disguised matrix; the private key is the structure that allows decoding. To encrypt, add
$t$ random errors to a codeword; only the owner of the structure can remove them.

**Code it.** The program builds a random parity-check matrix with 12 rows and 24 columns,
hides three errors, and finds every weight-3 error with the right syndrome by trying all
$\binom{24}{3} = 2{,}024$ positions.

```python
import itertools, random

def random_code(n, k, seed):
    """A random binary parity-check matrix H with n - k rows and n columns."""
    rnd = random.Random(seed)
    return [[rnd.randrange(2) for _ in range(n)] for _ in range(n - k)]

def syndrome(H, e):
    return tuple(sum(h * x for h, x in zip(row, e)) % 2 for row in H)

n, k, t = 24, 12, 3
H = random_code(n, k, seed=11)
rnd = random.Random(4)
e = [0] * n
for i in rnd.sample(range(n), t):
    e[i] = 1
s = syndrome(H, e)
print("syndrome:", "".join(map(str, s)))
solutions = []
tried = 0
for positions in itertools.combinations(range(n), t):
    tried += 1
    guess = [1 if i in positions else 0 for i in range(n)]
    if syndrome(H, guess) == s:
        solutions.append(positions)
print("weight-%d vectors tried: %d; solutions: %s; true error at %s"
      % (t, tried, solutions, tuple(i for i in range(n) if e[i])))
```

Running it prints:

```text
syndrome: 111111111010
weight-3 vectors tried: 2024; solutions: [(3, 7, 9), (14, 18, 21)]; true error at (3, 7, 9)
```

Two solutions appear because this toy code is too small: 2,024 possible errors are squeezed
into $2^{12} = 4{,}096$ syndromes, and some collide. Real parameters make the solution
unique and the search vast: Classic McEliece's smallest set has $n = 3{,}488$ and $t = 64$,
so there are about $2^{456}$ candidate error patterns, and the cleverest algorithms
(information set decoding, Chapter 13) need about $2^{143}$ operations.

**History and record.** McEliece's scheme has not been broken in practice in nearly fifty years
with its original Goppa codes, although many attempts to shrink its keys with more structured
codes have been. In 2026 a run of new structural attacks on binary Goppa codes appeared; none
has recovered a full-size key, but they led Germany's BSI to advise against Classic McEliece
for new systems (Chapter 13, §13.10). Its weakness is size: a public key is a large matrix. Classic McEliece's
keys range from about 261 kilobytes to over a megabyte. Newer schemes, BIKE and HQC, use
**quasi-cyclic** codes, whose matrices are made of rotated copies of a few rows, and get keys
of a few kilobytes at the price of more structure (Chapter 14). NIST selected HQC as a second
KEM standard in March 2025.

**Sizes.** Classic McEliece: public keys of 261 kB to 1.3 MB, ciphertexts of 96 to 208
bytes. HQC: public keys of about 2 to 7 kB, ciphertexts of about 4 to 14 kB.

!!! note "Life story: the McEliece cryptosystem"
    **Born:** 1978, Robert McEliece at the Jet Propulsion Laboratory, "A Public-Key
    Cryptosystem Based on Algebraic Coding Theory" (JPL Deep Space Network Progress Report)
    · **Purpose:** public-key encryption from the hardness of decoding a random-looking
    linear code · **Helped:** the oldest unbroken public-key scheme besides RSA and
    Diffie-Hellman; its descendant Classic McEliece was recommended by Germany's BSI for
    high-assurance uses from 2020 · **Status:** no practical break with Goppa codes;
    Classic McEliece reached NIST's fourth round and was not selected; ISO standardized it
    in 2026; after the 2026 structural attacks BSI advised against it for new systems
    (October 2026)

### A structured code decodes itself

Why is decoding easy for the owner and hard for everyone else? The smallest example is the
**Hamming code** of 1950, which corrects one error in seven bits. Its parity-check matrix has
as its columns the numbers 1 to 7 written in binary:

$$H = \begin{pmatrix} 0&0&0&1&1&1&1 \\ 0&1&1&0&0&1&1 \\ 1&0&1&0&1&0&1 \end{pmatrix}.$$

**By hand.** The codeword $x = 1110000$ (positions 1 to 7, left to right) has syndrome
$Hx = $ column 1 + column 2 + column 3 $= 001 + 010 + 011 = 000$, so it is a codeword. Flip
position 5 in transit to get $y = 1110100$. The receiver computes
$Hy = Hx + He = 000 + \text{column } 5 = 101$, which is 5 in binary: the syndrome *names*
the wrong position. One XOR later the word is repaired. No search at all, because the columns
were arranged so that the syndrome of a single error is its own address.

Now shuffle the columns of $H$ with a secret permutation and mix its rows with a secret
invertible matrix. The syndrome of a single error becomes an arbitrary-looking pattern, and
finding its column is a lookup only the owner can do quickly. At this size anyone can try all
seven columns. A Goppa code of length 3,488 with 64 errors plays the same game where trying is
hopeless: the owner decodes in polynomial time with Patterson's algorithm and the code's
hidden description, and everyone else faces the $2^{143}$ above. McEliece's public key is the
disguised matrix; [Chapter 13](13-Code-Based-Encryption-McEliece.md) builds the scheme by
hand on a tiny code.

## 4.4 Hash functions: signatures from nothing else

*Level: intermediate.*

**The problem.** There is no special hard problem here at all, which is the point. A
hash-based signature is secure if the hash function it uses, SHA-256 or SHAKE256, resists
finding preimages and second preimages. Every other public-key scheme needs that much too,
because every signature hashes its message. Hash-based signatures need nothing more.

**The idea.** Leslie Lamport's **one-time signature** of 1979: for each bit of the
message digest, pick two random secrets, one for "0" and one for "1", and publish their
hashes. To sign, reveal the secret for each actual bit. A verifier hashes each revealed
secret and compares it with the published hash. Forging needs a preimage of a published
hash, which the hash function forbids. The catch is in the name: each key can sign only
once, because every signature gives away half the secrets.

**Code it.** A Lamport key over a 16-bit toy digest signs two commands for an airlock.
The attacker then has both secrets for every position where the two digests differ, and
can sign any message whose digest agrees with one of them in each position.

```python
import hashlib, secrets

BITS = 16                      # a toy digest length; real Lamport uses 256

def H(x):
    return hashlib.sha256(x).digest()

def digest_bits(msg):
    d = int.from_bytes(H(msg), "big") >> (256 - BITS)
    return [(d >> (BITS - 1 - i)) & 1 for i in range(BITS)]

def keygen():
    sk = [[secrets.token_bytes(32) for _ in range(2)] for _ in range(BITS)]
    pk = [[H(x) for x in pair] for pair in sk]
    return pk, sk

def sign(sk, msg):
    return [sk[i][b] for i, b in enumerate(digest_bits(msg))]

def verify(pk, msg, sig):
    return all(H(s) == pk[i][b] for i, (s, b) in enumerate(zip(sig, digest_bits(msg))))

pk, sk = keygen()
m1, m2 = b"open the north airlock", b"close the north airlock"
s1, s2 = sign(sk, m1), sign(sk, m2)
print("both signatures verify:", verify(pk, m1, s1) and verify(pk, m2, s2))

# The attacker now knows a preimage for every (position, bit) used by either signature.
known = {}
for msg, sig in ((m1, s1), (m2, s2)):
    for i, (s, b) in enumerate(zip(sig, digest_bits(msg))):
        known[(i, b)] = s
free = sum(1 for i in range(BITS) if (i, 0) in known and (i, 1) in known)
print("positions where both bits are known:", free, "-> forgeable digests:", 2 ** free)
for n in range(100000):
    m3 = b"vent cabin %d" % n
    bits = digest_bits(m3)
    if all((i, b) in known for i, b in enumerate(bits)):
        forged = [known[(i, b)] for i, b in enumerate(bits)]
        print("forged a signature on", m3.decode(), "->", verify(pk, m3, forged))
        break
```

Running it prints:

```text
both signatures verify: True
positions where both bits are known: 6 -> forgeable digests: 64
forged a signature on vent cabin 1310 -> True
```

Two signatures from one key, and a third command, never authorized, verifies. With a
256-bit digest the attacker would need more signatures to find a forgeable message by
chance, but the principle is the same and so is the rule: never reuse a one-time key.

**From one to many.** Ralph Merkle's tree (1979) puts many one-time public keys at the
leaves of a binary hash tree and publishes only the root. A signature includes the one-time
signature and the path of sibling hashes up to the root. Winternitz's chains (described by
Merkle in 1989) shrink the one-time signatures by signing several bits at a time with hash
chains. The result is a scheme with a 32-byte public key that can sign, say, a million
messages, as long as the signer never uses a leaf twice. That **state**, the count of used
leaves, is the price; LMS and XMSS (Chapter 11) pay it. SPHINCS (2015), whose descendant is
SLH-DSA (Chapter 12), removes the state by using a huge tree and picking leaves at random,
with few-time signatures at the bottom to tolerate the occasional repeat.

**Record and sizes.** No hash-based scheme has been broken through its structure when used
correctly; the risks are state misuse and implementation faults. Public keys are tiny (32
to 64 bytes); signatures are large, about 2 to 50 kilobytes, and signing is slow for the
stateless kind. Hash-based signatures are the conservative choice: if they fall, so does
everything else.

### Winternitz: fewer secrets, longer chains

Lamport's signature on a 256-bit digest reveals 256 secrets of 32 bytes: 8 kilobytes. The
Winternitz idea, which Merkle credited to Robert Winternitz, trades size for hashing. Cut the
digest into digits in base $w$, say $w = 16$ (four bits each). For each digit keep one secret
$x$ and publish the end of a hash chain, $H^{15}(x)$, fifteen hashes along. To sign a digit
$d$, reveal $H^{d}(x)$; the verifier hashes $15 - d$ more times and must land on the
published end. One chain now signs four bits instead of one.

There is a catch, and it is the reason every real scheme carries a **checksum**. Anyone who
sees $H^{d}(x)$ can hash it forward and get $H^{d+1}(x)$, a valid signature on the digit
$d + 1$. So the signer also signs the sum $\sum (15 - d_i)$ with extra chains. Raising any
message digit lowers that sum, and lowering a checksum digit would mean walking a chain
backward, which is finding a preimage.

**By hand.** A toy digest of two digits, $(5, 12)$, in base 16. The checksum is
$(15 - 5) + (15 - 12) = 13$; it can be at most 30, so it takes two base-16 digits, $(0, 13)$.
The signature is four chain values: $H^{5}(x_1)$, $H^{12}(x_2)$, $H^{0}(x_3) = x_3$ and
$H^{13}(x_4)$. The verifier hashes them $10$, $3$, $15$ and $2$ more times and compares each
with the public chain ends. A forger who wants the digest $(6, 12)$ can hash the first value
once, but the checksum of $(6, 12)$ is 12, digits $(0, 12)$, and he holds only $H^{13}(x_4)$,
one step *past* the $H^{12}(x_4)$ he needs. Figure 4.3 draws the two chains that matter.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="Two Winternitz hash chains of 16 links each. In the message chain the signer reveals the value at step 5 and the verifier hashes forward 10 steps to the public end at step 15; a forger can also hash forward to step 6. In the checksum chain the signer reveals step 13; the forger would need step 12, one step backward, which needs a preimage." fill="currentColor" font-size="13">
<defs><marker id="ar4w" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z"/></marker></defs>
<text x="20" y="30" font-size="14">message digit 5</text>
<g fill="none" stroke="currentColor">
<circle cx="40" cy="60" r="9"/><circle cx="74" cy="60" r="9"/><circle cx="108" cy="60" r="9"/><circle cx="142" cy="60" r="9"/><circle cx="176" cy="60" r="9"/><circle cx="244" cy="60" r="9"/><circle cx="278" cy="60" r="9"/><circle cx="312" cy="60" r="9"/><circle cx="346" cy="60" r="9"/><circle cx="380" cy="60" r="9"/><circle cx="414" cy="60" r="9"/><circle cx="448" cy="60" r="9"/><circle cx="482" cy="60" r="9"/><circle cx="516" cy="60" r="9"/><circle cx="550" cy="60" r="9"/>
</g>
<circle cx="210" cy="60" r="9" fill="currentColor" fill-opacity=".6" stroke="currentColor"/>
<circle cx="550" cy="60" r="9" fill="currentColor" fill-opacity=".25" stroke="currentColor"/>
<line x1="49" y1="60" x2="530" y2="60" stroke="currentColor" stroke-opacity=".35"/>
<text x="40" y="88" text-anchor="middle">x</text>
<text x="210" y="88" text-anchor="middle">H⁵(x)</text>
<text x="244" y="88" text-anchor="middle" fill-opacity=".7">H⁶</text>
<text x="550" y="88" text-anchor="middle">H¹⁵(x)</text>
<text x="210" y="106" text-anchor="middle" font-size="12">revealed</text>
<text x="550" y="106" text-anchor="middle" font-size="12">public key</text>
<path d="M216 45 Q380 15 545 45" fill="none" stroke="currentColor" marker-end="url(#ar4w)"/>
<text x="380" y="22" text-anchor="middle" font-size="12">verifier: 10 more hashes</text>
<text x="300" y="118" text-anchor="middle" font-size="12" fill-opacity=".7">forger can step forward to H⁶: digit 6</text>
<text x="20" y="150" font-size="14">checksum digit 13</text>
<g fill="none" stroke="currentColor">
<circle cx="40" cy="180" r="9"/><circle cx="74" cy="180" r="9"/><circle cx="108" cy="180" r="9"/><circle cx="142" cy="180" r="9"/><circle cx="176" cy="180" r="9"/><circle cx="210" cy="180" r="9"/><circle cx="244" cy="180" r="9"/><circle cx="278" cy="180" r="9"/><circle cx="312" cy="180" r="9"/><circle cx="346" cy="180" r="9"/><circle cx="380" cy="180" r="9"/><circle cx="414" cy="180" r="9"/><circle cx="448" cy="180" r="9" stroke-dasharray="3 3"/><circle cx="516" cy="180" r="9"/>
</g>
<circle cx="482" cy="180" r="9" fill="currentColor" fill-opacity=".6" stroke="currentColor"/>
<circle cx="550" cy="180" r="9" fill="currentColor" fill-opacity=".25" stroke="currentColor"/>
<line x1="49" y1="180" x2="541" y2="180" stroke="currentColor" stroke-opacity=".35"/>
<text x="482" y="208" text-anchor="middle">H¹³</text>
<text x="448" y="208" text-anchor="middle" fill-opacity=".7">H¹²?</text>
<path d="M476 166 Q465 150 454 166" fill="none" stroke="currentColor" stroke-dasharray="4 3" marker-end="url(#ar4w)"/>
<text x="400" y="236" text-anchor="middle" font-size="12">forger needs H¹² for checksum 12: one step back = a preimage</text>
</svg>
<figcaption>Figure 4.3. A Winternitz signature reveals one point on each chain. Hashing forward is free, so a forger can raise a message digit; the checksum chain then has to move backward, which the hash function forbids.</figcaption>
</figure>

**Code it.** A complete Winternitz one-time signature over SHA-256, with checksum, signs an
airlock command; then the same code reports, for several bases $w$, how many chains a
signature needs, its size, and how many hashes a verifier does on average.

```python
import hashlib, math, secrets

def H(x):
    return hashlib.sha256(x).digest()

def chain(x, steps):
    for _ in range(steps):
        x = H(x)
    return x

def digits(msg, w):
    """Base-w digits of SHA-256(msg), then the checksum's digits."""
    bits = int(math.log2(w))
    d = int.from_bytes(H(msg), "big")
    l1 = 256 // bits
    ds = [(d >> (bits * (l1 - 1 - i))) & (w - 1) for i in range(l1)]
    csum = sum(w - 1 - x for x in ds)
    l2 = math.floor(math.log(l1 * (w - 1), w)) + 1
    return ds + [(csum // w ** (l2 - 1 - i)) % w for i in range(l2)]

def keygen(w):
    sk = [secrets.token_bytes(32) for _ in digits(b"", w)]
    return [chain(x, w - 1) for x in sk], sk

def sign(sk, msg, w):
    return [chain(x, d) for x, d in zip(sk, digits(msg, w))]

def verify(pk, msg, sig, w):
    return all(chain(s, w - 1 - d) == p for s, d, p in zip(sig, digits(msg, w), pk))

pk, sk = keygen(16)
sig = sign(sk, b"open the north airlock", 16)
print("w=16 signature verifies:", verify(pk, b"open the north airlock", sig, 16))
print("same signature on another message:", verify(pk, b"vent the cabin", sig, 16))
for w in (2, 4, 16, 256):
    n = len(digits(b"", w))
    print("w=%3d: %3d chains, signature %5d bytes, about %5d hashes to verify"
          % (w, n, 32 * n, n * (w - 1) // 2))
```

It prints:

```text
w=16 signature verifies: True
same signature on another message: False
w=  2: 265 chains, signature  8480 bytes, about   132 hashes to verify
w=  4: 133 chains, signature  4256 bytes, about   199 hashes to verify
w= 16:  67 chains, signature  2144 bytes, about   502 hashes to verify
w=256:  34 chains, signature  1088 bytes, about  4335 hashes to verify
```

Each step up in $w$ roughly halves the signature and multiplies the hashing. XMSS and
SLH-DSA use $w = 16$ (with 32-byte hashes, the 67 chains above; SLH-DSA's 128-bit sets use
16-byte hashes and 35 chains), and LMS offers 1, 2, 4 or 8 bits per digit. Real schemes also
mix a chain address and a public seed into every hash (Hülsing's W-OTS+, 2013), so that one
attack cannot target all chains of all keys at once
([Chapter 11](11-Stateful-Hash-Based-Signatures.md)).

## 4.5 Multivariate equations

*Level: intermediate.*

**The problem.** Given $m$ quadratic polynomials $p_1, \dots, p_m$ in $n$ variables over a
small finite field, and target values $y_1, \dots, y_m$, find $x$ with $p_i(x) = y_i$ for all
$i$. This **MQ problem** is NP-complete over any finite field, and for random systems with
$m \approx n$ the best algorithms (Gröbner bases, and exhaustive search with clever
evaluation) take time exponential in $n$.

**Code it.** Random systems of $n$ quadratic equations in $n$ unknowns over GF(2), the field
with two elements, solved by trying every input. Each polynomial is stored as bit masks so
that an evaluation is a few AND operations and bit counts; the last two lines extrapolate.

```python
import random

def random_system(n, rnd):
    """n random quadratic equations in n unknowns over GF(2), stored as bit masks:
    entry i of a polynomial's rows lists the j >= i that have an x_i*x_j term."""
    return [([rnd.getrandbits(n) >> i << i for i in range(n)], rnd.getrandbits(n), rnd.randrange(2))
            for _ in range(n)]

def value(poly, x):
    rows, lin, const = poly
    v = const ^ bin(lin & x).count("1")
    for i in range(len(rows)):
        if x >> i & 1:
            v ^= bin(rows[i] & x).count("1")
    return v & 1

rnd = random.Random(5)
for n in (8, 10, 12, 14, 16):
    P = random_system(n, rnd)
    secret = rnd.getrandbits(n)
    target = [value(p, secret) for p in P]
    sols = [x for x in range(2 ** n) if all(value(p, x) == t for p, t in zip(P, target))]
    print("n = %2d: %d of %5d inputs solve it, first after %5d tries; secret among them: %s"
          % (n, len(sols), 2 ** n, sols[0] + 1, secret in sols))
for n in (64, 128):
    print("n = %d: 2^%d inputs, %.2g years at 10^12 inputs per second"
          % (n, n, 2 ** n / 1e12 / 3.156e7))
```

Running it prints:

```text
n =  8: 1 of   256 inputs solve it, first after    93 tries; secret among them: True
n = 10: 5 of  1024 inputs solve it, first after    98 tries; secret among them: True
n = 12: 2 of  4096 inputs solve it, first after  2062 tries; secret among them: True
n = 14: 1 of 16384 inputs solve it, first after 14069 tries; secret among them: True
n = 16: 1 of 65536 inputs solve it, first after 20714 tries; secret among them: True
n = 64: 2^64 inputs, 0.58 years at 10^12 inputs per second
n = 128: 2^128 inputs, 1.1e+19 years at 10^12 inputs per second
```

Where the first solution falls is luck, and it need not even be the secret (any solution
works for a forger), but the space doubles with each unknown. Better algorithms exist:
Bouillaguet and others enumerated all $2^n$ inputs with only a few bit operations each
(2010), algorithms since 2017 provably beat $2^n$ by a constant factor in the exponent, and
over larger fields Gröbner-basis methods combined with guessing some variables win. None
changes the shape: the exponent stays linear in $n$. That is why the attacks that kill
multivariate schemes are never generic; they find the hidden structure and remove the
disguise.

**The trapdoor, and the danger.** A signature scheme needs a *structured* system that the
signer can invert easily and that looks random to everyone else. The public key is the
disguised system $P = T \circ F \circ S$, where $F$ is an easily inverted "central map" and
$S$, $T$ are secret linear changes of variables. To sign, the signer hashes the message to
$y$ and inverts $T$, $F$ and $S$ in turn. The danger is that the structure of $F$ survives
the disguise and can be found. That is how most multivariate schemes have died: Matsumoto
and Imai's C* of 1988 fell to Jacques Patarin in 1995; Patarin's own HFE has been attacked
repeatedly; Rainbow, a NIST finalist, fell to Ward Beullens in 2022 (Chapter 15).

**What survives.** Patarin's **Oil and Vinegar** (1997), repaired as **Unbalanced Oil and
Vinegar** by Kipnis, Patarin and Goubin in 1999, has resisted attack for over 25 years with
suitable parameters. Its central map is simple: variables are split into "vinegar" and
"oil", and no equation multiplies two oil variables together, so once the vinegar
variables are fixed at random the equations become linear in the oil variables. UOV and
its descendant MAYO are in NIST's third round of additional signatures (May 2026).

**Sizes.** The attraction is tiny signatures, often around 100 to 200 bytes for UOV, and
fast verification. The cost is large public keys, tens to hundreds of kilobytes for UOV;
MAYO shrinks them to about a kilobyte or two with a clever "whipping" construction.

### Oil and Vinegar by hand

The signer's trick fits on one line. Work modulo 7 with two vinegar variables $v_1, v_2$ and
one oil variable $o$, and one central equation in which oil is never multiplied by oil:

$$F(v_1, v_2, o) = 3 v_1 o + v_2 o + v_1^2 + 2 v_1 v_2 + 5 o + 1.$$

To sign a message that hashes to $y = 5$, the signer picks the vinegar at random, say
$v_1 = 2$, $v_2 = 1$. The terms with $o$ become $6o + o + 5o = 12o \equiv 5o$, and the rest is
$4 + 4 + 1 = 9 \equiv 2$. So $F = 5o + 2$, a *linear* equation: $5o = 3$, and since
$5 \cdot 3 = 15 \equiv 1$, the inverse of 5 is 3 and $o = 9 \equiv 2$. Check:
$F(2, 1, 2) = 12 + 2 + 4 + 4 + 10 + 1 = 33 \equiv 5$. Had the coefficient of $o$ come out 0,
the signer would simply pick new vinegar. A real UOV key has $m$ oil variables and $m$
equations, so signing solves an $m \times m$ linear system, about 45 by 45 over the field
with 256 elements for the smallest set, and the public key hides $F$ behind a secret change
of variables. [Chapter 15](15-Multivariate-Signatures-and-the-On-Ramp.md) does it with
twelve variables and then breaks the balanced version.

## 4.6 Isogenies

*Level: intermediate.*

**The problem.** An **isogeny** is a map from one elliptic curve to another that respects
their group structure. For a fixed prime $p$, the supersingular elliptic curves over
$\mathbb{F}_{p^2}$ and the isogenies of a small degree between them form a graph, with
curves as vertices and isogenies as edges, in which every vertex has the same small number
of neighbors. Walking a few hundred random steps through this graph is easy. Given only the
start and end curves, finding the path is believed hard, for classical and quantum
computers alike. That **isogeny path problem** is the family's foundation.

**History.** Jean-Marc Couveignes described an isogeny-based key exchange in 1997 (published
in 2006), and Alexander Rostovtsev and Anton Stolbunov independently in 2006, using
"ordinary" curves and a commutative group action. David Jao and Luca De Feo's **SIDH**
(2011) used supersingular curves and became the basis of **SIKE**, a NIST candidate prized
for having the smallest keys and ciphertexts of any KEM, about 330 to 560 bytes. Wouter
Castryck, Tanja Lange, Chloe Martindale, Lorenz Panny and Joost Renes proposed **CSIDH** in
2018, reviving the commutative group action and with it a Diffie-Hellman-like
non-interactive key exchange.

**Record.** In July 2022 Castryck and Thomas Decru broke SIDH and SIKE completely, recovering
keys for the smallest parameters in about an hour on one core (about ten minutes in the
revised version), using a theorem of Ernst
Kani from 1997 about products of curves. The attack exploited extra information SIDH had to
publish (images of torsion points), not the underlying path problem. CSIDH does not publish
that information and is unaffected, but because its group action is commutative it falls
within reach of Kuperberg's subexponential quantum algorithm (Chapter 1, §1.11), and its
parameters for real quantum security are debated and large. **SQIsign** (2020), a signature
built from the hardest form of the path problem (the endomorphism ring problem), survived
and is in NIST's third round with signatures of about 150 bytes in round 2 and 200 bytes in
the round 3 version of September 2026. [Chapter 16](16-Isogenies.md) tells the story
in full.

**Sizes.** The smallest of any family: tens to hundreds of bytes. The cost is computation:
SQIsign's signing takes milliseconds to tens of milliseconds, much slower than lattice
schemes, though newer versions have improved it many times over: the round 3 version of
September 2026 signs in about 94 million cycles (about 28 milliseconds) and verifies in about
12 million on a desktop processor.

### A walk on a toy graph

The graph can be built with nothing more than finite-field arithmetic. A supersingular curve
is named by its **$j$-invariant**, an element of $\mathbb{F}_{p^2}$, and two curves are joined
by an isogeny of degree 2 exactly when their $j$-invariants are roots of the **modular
polynomial** $\Phi_2(X, Y)$, which has fixed integer coefficients. So the neighbors of $j$ are
the roots of the cubic $\Phi_2(j, Y)$. For $p \equiv 3 \pmod 4$ the curve with $j = 1728$ is
supersingular, which gives a place to start.

**Code it.** With $p = 83$ the program finds every root by trying all $83^2 = 6{,}889$
elements of $\mathbb{F}_{p^2}$, builds the whole graph outward from $j = 1728 \equiv 68$,
takes a secret random walk of six steps, and then plays the attacker, who knows only the two
ends and searches the graph breadth first.

```python
import random
from collections import deque

p = 83                                   # p = 3 mod 4, so GF(p^2) = GF(p)[i] with i^2 = -1

def mul(a, b):
    return ((a[0] * b[0] - a[1] * b[1]) % p, (a[0] * b[1] + a[1] * b[0]) % p)

def add(*xs):
    return (sum(x[0] for x in xs) % p, sum(x[1] for x in xs) % p)

def c(k):
    return (k % p, 0)

def neighbors(j):
    """Roots Y of the modular polynomial Phi_2(j, Y): the curves 2-isogenous to j."""
    j2 = mul(j, j)
    # Phi_2(X,Y) = X^3 + Y^3 - X^2 Y^2 + 1488(X^2 Y + X Y^2) - 162000(X^2 + Y^2)
    #              + 40773375 X Y + 8748000000(X + Y) - 157464000000000, as a cubic in Y
    a2 = add((-j2[0], -j2[1]), mul(c(1488), j), c(-162000))
    a1 = add(mul(c(1488), j2), mul(c(40773375), j), c(8748000000))
    a0 = add(mul(j2, j), mul(c(-162000), j2), mul(c(8748000000), j), c(-157464000000000))
    roots = []
    for y0 in range(p):
        for y1 in range(p):
            y = (y0, y1)
            if add(mul(add(mul(add(y, a2), y), a1), y), a0) == (0, 0):
                roots.append(y)
    return roots

graph, todo = {}, deque([c(1728)])       # j = 1728 is supersingular because p = 3 mod 4
while todo:
    j = todo.popleft()
    if j not in graph:
        graph[j] = neighbors(j)
        todo.extend(graph[j])
name = lambda j: "%d" % j[0] if j[1] == 0 else "%d+%di" % j
print("supersingular j-invariants for p = %d: %d" % (p, len(graph)))
for j in sorted(graph):
    print("  %-6s -> %s" % (name(j), ", ".join(name(k) for k in graph[j])))

rnd = random.Random(7)
path = [c(1728)]
for step in range(6):                    # the secret: a random walk, never stepping straight back
    options = [k for k in graph[path[-1]] if len(path) < 2 or k != path[-2]] or graph[path[-1]]
    path.append(rnd.choice(options))
print("secret walk:", " -> ".join(name(j) for j in path))
prev, todo = {path[0]: None}, deque([path[0]])
while todo:                              # the attacker: breadth-first search from start to end
    j = todo.popleft()
    for k in graph[j]:
        if k not in prev:
            prev[k] = j
            todo.append(k)
found, j = [], path[-1]
while j is not None:
    found.append(j)
    j = prev[j]
print("attacker's path:", " -> ".join(name(j) for j in reversed(found)))
```

It prints:

```text
supersingular j-invariants for p = 83: 8
  0      -> 50
  17     -> 38+17i, 38+66i, 50
  28     -> 28, 50
  38+17i -> 17, 38+66i, 67
  38+66i -> 17, 38+17i, 67
  50     -> 0, 17, 28
  67     -> 38+17i, 38+66i, 68
  68     -> 67, 68
secret walk: 68 -> 68 -> 67 -> 38+66i -> 17 -> 38+17i -> 38+66i
attacker's path: 68 -> 67 -> 38+66i
```

Every vertex has three edges counted with multiplicity (the program lists each neighbor once,
so a double root or a loop shows up as one entry; $j = 0$ reaches 50 by three different
isogenies). Figure 4.4 draws the graph. The attacker found a path at once, and a shorter one
than the secret walk; in a graph of eight vertices nothing is hidden.

<figure class="mars-fig">
<svg viewBox="0 0 640 270" width="640" role="img" aria-label="The supersingular 2-isogeny graph for p = 83, with eight vertices: 0, 50, 28, 17, 38+17i, 38+66i, 67 and 68. Edges: 0 to 50, 50 to 28, 50 to 17, 17 to 38+17i, 17 to 38+66i, 38+17i to 38+66i, 38+17i to 67, 38+66i to 67, 67 to 68, and loops at 28 and 68. The secret walk from 68 is drawn thick; the attacker's two-step path 68, 67, 38+66i is dashed." fill="currentColor" font-size="13">
<g stroke="currentColor" fill="none">
<line x1="88" y1="135" x2="162" y2="135"/>
<line x1="180" y1="153" x2="180" y2="197"/>
<line x1="198" y1="135" x2="282" y2="135"/>
<line x1="315" y1="125" x2="391" y2="77" stroke-width="3.5"/>
<line x1="315" y1="145" x2="391" y2="193" stroke-width="3.5"/>
<line x1="410" y1="87" x2="410" y2="183" stroke-width="3.5"/>
<line x1="429" y1="77" x2="505" y2="125"/>
<line x1="429" y1="193" x2="505" y2="145" stroke-width="3.5"/>
<line x1="538" y1="135" x2="582" y2="135" stroke-width="3.5"/>
<path d="M168 231 C150 268 210 268 192 231"/>
<path d="M590 120 C575 80 625 80 610 120" stroke-width="3.5"/>
<line x1="600" y1="160" x2="520" y2="160" stroke-dasharray="5 4"/>
<line x1="520" y1="160" x2="430" y2="218" stroke-dasharray="5 4"/>
</g>
<g fill="currentColor" fill-opacity=".12" stroke="currentColor">
<circle cx="70" cy="135" r="18"/><circle cx="180" cy="135" r="18"/><circle cx="180" cy="215" r="18"/><circle cx="300" cy="135" r="18"/><circle cx="410" cy="65" r="22"/><circle cx="410" cy="205" r="22"/><circle cx="520" cy="135" r="18"/><circle cx="600" cy="135" r="18"/>
</g>
<g text-anchor="middle">
<text x="70" y="140">0</text><text x="180" y="140">50</text><text x="180" y="220">28</text><text x="300" y="140">17</text><text x="410" y="69" font-size="11">38+17i</text><text x="410" y="209" font-size="11">38+66i</text><text x="520" y="140">67</text><text x="600" y="140">68</text>
</g>
<text x="70" y="105" text-anchor="middle" font-size="12" fill-opacity=".7">×3</text>
<text x="600" y="190" text-anchor="middle" font-size="12">start</text>
<text x="20" y="28" font-size="12">thick: the secret walk 68 → 68 → 67 → 38+66i → 17 → 38+17i → 38+66i</text>
<text x="20" y="46" font-size="12">dashed: the attacker's path 68 → 67 → 38+66i</text>
</svg>
<figcaption>Figure 4.4. The supersingular 2-isogeny graph for p = 83: eight curves, three isogenies of degree 2 out of each (counted with multiplicity; j = 0 has three to j = 50). At real sizes the graph has about p/12 vertices, some 2^247 for SQIsign's round 2 prime, and still only three edges at each.</figcaption>
</figure>

The real graph is the same object with $p$ of 250 to 330 bits: about $p/12$ vertices (here
$\lfloor 83/12 \rfloor + 2 = 8$), each still with three neighbors. It is an excellent
**expander**, so a walk of a few hundred steps lands almost anywhere (Charles, Goren and Lauter
built a hash function on that property in 2009), and breadth-first search would have to visit
a good fraction of $2^{247}$ vertices. The best classical methods cost about $p^{1/2}$, or
$p^{1/3}$ with as much memory since 2026 (§4.9). [Chapter 16](16-Isogenies.md) builds a graph
of 37 curves for $p = 431$ and computes isogenies with Vélu's formulas.

## 4.7 MPC-in-the-head and symmetric-key signatures

*Level: intermediate.*

**The idea.** In 2007 Yuval Ishai, Eyal Kushilevitz, Rafail Ostrovsky and Amit Sahai
showed how to build a zero-knowledge proof from a **multi-party computation**. Suppose
the prover knows a secret $x$ with $f(x) = y$ for a public function $f$, such as AES with
key $x$ applied to a fixed block. The prover splits $x$ into random shares, one for each of
$N$ imaginary parties, and *simulates in its head* a protocol in which the parties jointly
compute $f$ on their shares and get $y$. It commits to every party's view of the protocol.
The verifier picks all but one party at random and asks to see their views; if the views are
consistent with each other and with the commitments, the verifier is convinced. Revealing
$N - 1$ views reveals nothing about $x$, because the last share is missing. Cheating
requires faking at least one view, which is caught unless the faked party is the one left
closed: probability $1/N$ per round.

**Code it.** The program plays a cheating prover against the opening rule and confirms that
its chance of escaping is $(1/N)^r$ for $N$ parties and $r$ rounds.

```python
import random

def round_cheat(rnd, parties):
    """A cheating prover must fake one party's view; it is caught if that party is opened."""
    faked = rnd.randrange(parties)
    opened = set(rnd.sample(range(parties), parties - 1))   # verifier opens all but one
    return faked not in opened

def soundness(parties, rounds, trials=100000, seed=1):
    rnd = random.Random(seed)
    wins = sum(all(round_cheat(rnd, parties) for _ in range(rounds)) for _ in range(trials))
    return wins / trials

for parties, rounds in [(3, 1), (3, 5), (16, 1), (16, 4), (256, 2)]:
    print("%3d parties, %d rounds: cheater wins %.5f (theory %.5f)"
          % (parties, rounds, soundness(parties, rounds), (1 / parties) ** rounds))
```

Running it prints:

```text
  3 parties, 1 rounds: cheater wins 0.33190 (theory 0.33333)
  3 parties, 5 rounds: cheater wins 0.00398 (theory 0.00412)
 16 parties, 1 rounds: cheater wins 0.06214 (theory 0.06250)
 16 parties, 4 rounds: cheater wins 0.00001 (theory 0.00002)
256 parties, 2 rounds: cheater wins 0.00002 (theory 0.00002)
```

For 128-bit security with 256 parties, sixteen rounds suffice, since $256^{16} = 2^{128}$.
Made non-interactive with Fiat-Shamir, the proof becomes a signature: the public key is $y$,
the private key is $x$, and to sign a message the prover derives the verifier's choices from
a hash of the commitments and the message.

**The appeal.** The security rests on the one-wayness of $f$. If $f$ is AES, the signature
is as safe as AES is hard to invert, a problem studied since 1998. **Picnic** (2017), built
on the LowMC cipher, was the first such scheme in the NIST process; it was not selected,
partly because LowMC was young. **FAEST** (2023) is built on AES itself and is in the third
round of additional signatures. **SDitH** applies the same technique to syndrome decoding,
and **MQOM** to the MQ problem, so MPC-in-the-head also gives new routes to code-based and
multivariate signatures without trapdoors to hide.

**Sizes.** Public keys tiny, a few dozen bytes; signatures of about 4 to 10 kilobytes;
signing and verifying in milliseconds.

### A Picnic-style signature in outline

The pieces fit together like this, shown with three parties and a one-byte secret so the
numbers can be followed by hand. The secret is $x = 90$, the public value is $y = f(x)$ for a
one-way function $f$, and arithmetic on shares is modulo 256.

<div class="mars-steps" markdown>

1. **Share.** Split $x$ into three random-looking shares that add up to it:
   $17 + 200 + 129 = 346 \equiv 90 \pmod{256}$. In practice each share comes from a short
   random seed, so a share can later be revealed by revealing its seed.
2. **Compute in the head.** Simulate a protocol in which the parties turn their shares into
   shares of $f(x)$. Additions are local; every multiplication (every AND gate of a cipher)
   needs messages between parties, which go into their **views**. Hence Picnic's choice of
   LowMC, a cipher with few AND gates.
3. **Commit.** Hash each party's seed and view: $c_i = H(\text{seed}_i \,\|\, \text{view}_i)$.
4. **Challenge.** Hash the message with all commitments and output shares; the hash picks
   which parties to open, say 1 and 2, after the signer is bound to every view.
5. **Open.** Reveal the seeds of parties 1 and 2 (shares 17 and 200) and the messages party 3
   sent them. Every $x$ is consistent with two shares, so nothing about $x$ leaks.
6. **Verify.** Recompute the opened views, check their commitments, and check that the output
   shares add up to $y$, for every round.

</div>

A cheater who does not know $x$ must make at least one view inconsistent, and survives only
if the challenge misses it. In Picnic's first version (ZKB++, 2017), with three parties and
two opened, a cheater escapes a round with probability $2/3$, so it needed 219 rounds,
since $(2/3)^{219} \approx 2^{-128}$, and signatures of about 33 kilobytes at level 1. Later
versions with 16 parties and a preprocessing phase (Katz, Kolesnikov and Wang, 2018) brought
that to about 12 to 14 kilobytes. FAEST replaces the parties by a newer commitment technique,
VOLE-in-the-head (2023), and proves knowledge of an AES key with signatures of 4,506 bytes in
its smallest round 2 set. The shape of the argument, commit to everything, let a hash choose
what to open, has not changed since 2007.

## 4.8 The size chart

*Level: intermediate.*

Table 4.1 collects the sizes: every final standard, three KEMs in the wings (HQC, chosen by
NIST; FrodoKEM and Classic McEliece, standardized by ISO), and the eight signature candidates
left in NIST's third round after HAWK's withdrawal in July 2026. These numbers decide most
deployments, because handshakes, certificates, firmware headers and smart cards all have
budgets in bytes.

| Family | Scheme (category) | Public key | Ciphertext or signature | Status, November 2026 |
| --- | --- | --- | --- | --- |
| Elliptic curve (for scale) | X25519; Ed25519 | 32 | 32; 64 | broken by Shor |
| Lattice | ML-KEM-512 / 768 / 1024 (1, 3, 5) | 800 / 1,184 / 1,568 | 768 / 1,088 / 1,568 | FIPS 203 |
| Lattice, unstructured | FrodoKEM-976 (3) | 15,632 | 15,744 | ISO standard (2026); BSI recommends |
| Code | HQC-1 / 3 / 5 (1, 3, 5) | 2,241 / 4,514 / 7,237 | 4,433 / 8,978 / 14,421 | selected by NIST (2025); FIPS 207 not yet drafted |
| Code | Classic McEliece 348864 (1) | 261,120 | 96 | ISO standard (2026); BSI advises against for new systems (Oct 2026) |
| Lattice | ML-DSA-44 / 65 / 87 (2, 3, 5) | 1,312 / 1,952 / 2,592 | 2,420 / 3,309 / 4,627 | FIPS 204 |
| Lattice | FN-DSA-512 / 1024 (1, 5) | 897 / 1,793 | at most 666 / 1,280 | FIPS 206, no public draft yet |
| Hash | SLH-DSA-128s / 128f (1) | 32 | 7,856 / 17,088 | FIPS 205 |
| Hash | SLH-DSA-256s (5) | 64 | 29,792 | FIPS 205 |
| Hash | LMS, one tree of $2^{20}$ leaves | 56 | 1,772 to 2,828 | SP 800-208, RFC 8554 |
| Multivariate | UOV-Ip (1) | 321,300 (46,591 compressed) | 135 | NIST round 3 |
| Multivariate | MAYO_1 (1) | 1,456 | 464 | NIST round 3 |
| Multivariate | QR-UOV (1) | about 12,000 to 14,000 | a few hundred | NIST round 3 |
| Multivariate | SNOVA, smallest round 2 set (1) | 1,016 | 248 | NIST round 3; parameters revised after attacks |
| Isogeny | SQIsign, round 3 (1) | 83 | 200 | NIST round 3 |
| MPC-in-the-head | MQOM (1) | about 60 | about 2,500 to 3,300 | NIST round 3 |
| MPC-in-the-head | SDitH (1) | key and signature together about 3,700 | | NIST round 3 |
| Symmetric (AES) | FAEST-128s / 128f (1) | 32 | 4,506 / 5,924 | NIST round 3 |

*Table 4.1. Sizes in bytes. Standards from FIPS 203, 204 and 205 and SP 800-208; HQC from its
specification of 22 August 2025; FN-DSA from the Falcon specification, since FIPS 206 has not
appeared; candidates from their teams' round 2 or round 3 documents (SQIsign's round 3
specification of September 2026), rounded where marked "about", and subject to change before
NIST decides. LMS depends on the Winternitz parameter (8 or 4 bits per digit).*

Figure 4.5 draws the main rows on a logarithmic scale, which is the only way to fit them on
one page.

<figure class="mars-fig">
<svg viewBox="0 0 640 506" width="640" role="img" aria-label="Logarithmic bar chart of public key and ciphertext or signature sizes. KEMs: X25519, ML-KEM-768, HQC-1, FrodoKEM-976, Classic McEliece 348864. Signatures: Ed25519, ML-DSA-65, FN-DSA-512, SLH-DSA-128s, UOV-Ip with compressed key, MAYO_1, SNOVA, SQIsign round 3, FAEST-128s." fill="currentColor" font-size="13">
<text x="232" y="20" font-size="12">bytes, log scale (each grid line is 10 times the last)</text>
<text x="296" y="38" text-anchor="middle" font-size="12">10</text>
<line x1="296" y1="44" x2="296" y2="466" stroke="currentColor" stroke-opacity=".25"/>
<text x="360" y="38" text-anchor="middle" font-size="12">100</text>
<line x1="360" y1="44" x2="360" y2="466" stroke="currentColor" stroke-opacity=".25"/>
<text x="424" y="38" text-anchor="middle" font-size="12">1 k</text>
<line x1="424" y1="44" x2="424" y2="466" stroke="currentColor" stroke-opacity=".25"/>
<text x="488" y="38" text-anchor="middle" font-size="12">10 k</text>
<line x1="488" y1="44" x2="488" y2="466" stroke="currentColor" stroke-opacity=".25"/>
<text x="552" y="38" text-anchor="middle" font-size="12">100 k</text>
<line x1="552" y1="44" x2="552" y2="466" stroke="currentColor" stroke-opacity=".25"/>
<text x="616" y="38" text-anchor="middle" font-size="12">1 M</text>
<line x1="616" y1="44" x2="616" y2="466" stroke="currentColor" stroke-opacity=".25"/>
<text x="10" y="64" font-weight="bold">KEMs</text>
<text x="226" y="89" text-anchor="end">X25519 (for scale)</text>
<rect x="232" y="76" width="96" height="9" fill="none" stroke="currentColor"/>
<rect x="232" y="86" width="96" height="9" fill="currentColor" fill-opacity=".55"/>
<text x="226" y="115" text-anchor="end">ML-KEM-768</text>
<rect x="232" y="102" width="197" height="9" fill="none" stroke="currentColor"/>
<rect x="232" y="112" width="194" height="9" fill="currentColor" fill-opacity=".55"/>
<text x="226" y="141" text-anchor="end">HQC-1</text>
<rect x="232" y="128" width="214" height="9" fill="none" stroke="currentColor"/>
<rect x="232" y="138" width="233" height="9" fill="currentColor" fill-opacity=".55"/>
<text x="226" y="167" text-anchor="end">FrodoKEM-976</text>
<rect x="232" y="154" width="268" height="9" fill="none" stroke="currentColor"/>
<rect x="232" y="164" width="269" height="9" fill="currentColor" fill-opacity=".55"/>
<text x="226" y="193" text-anchor="end">Classic McEliece 348864</text>
<rect x="232" y="180" width="347" height="9" fill="none" stroke="currentColor"/>
<rect x="232" y="190" width="127" height="9" fill="currentColor" fill-opacity=".55"/>
<text x="10" y="218" font-weight="bold">Signatures</text>
<text x="226" y="243" text-anchor="end">Ed25519 (for scale)</text>
<rect x="232" y="230" width="96" height="9" fill="none" stroke="currentColor"/>
<rect x="232" y="240" width="116" height="9" fill="currentColor" fill-opacity=".55"/>
<text x="226" y="269" text-anchor="end">ML-DSA-65</text>
<rect x="232" y="256" width="211" height="9" fill="none" stroke="currentColor"/>
<rect x="232" y="266" width="225" height="9" fill="currentColor" fill-opacity=".55"/>
<text x="226" y="295" text-anchor="end">FN-DSA-512</text>
<rect x="232" y="282" width="189" height="9" fill="none" stroke="currentColor"/>
<rect x="232" y="292" width="181" height="9" fill="currentColor" fill-opacity=".55"/>
<text x="226" y="321" text-anchor="end">SLH-DSA-128s</text>
<rect x="232" y="308" width="96" height="9" fill="none" stroke="currentColor"/>
<rect x="232" y="318" width="249" height="9" fill="currentColor" fill-opacity=".55"/>
<text x="226" y="347" text-anchor="end">UOV-Ip (compressed key)</text>
<rect x="232" y="334" width="299" height="9" fill="none" stroke="currentColor"/>
<rect x="232" y="344" width="136" height="9" fill="currentColor" fill-opacity=".55"/>
<text x="226" y="373" text-anchor="end">MAYO_1</text>
<rect x="232" y="360" width="202" height="9" fill="none" stroke="currentColor"/>
<rect x="232" y="370" width="171" height="9" fill="currentColor" fill-opacity=".55"/>
<text x="226" y="399" text-anchor="end">SNOVA (round 2)</text>
<rect x="232" y="386" width="192" height="9" fill="none" stroke="currentColor"/>
<rect x="232" y="396" width="153" height="9" fill="currentColor" fill-opacity=".55"/>
<text x="226" y="425" text-anchor="end">SQIsign (round 3)</text>
<rect x="232" y="412" width="123" height="9" fill="none" stroke="currentColor"/>
<rect x="232" y="422" width="147" height="9" fill="currentColor" fill-opacity=".55"/>
<text x="226" y="451" text-anchor="end">FAEST-128s</text>
<rect x="232" y="438" width="96" height="9" fill="none" stroke="currentColor"/>
<rect x="232" y="448" width="234" height="9" fill="currentColor" fill-opacity=".55"/>
<rect x="232" y="478" width="14" height="9" fill="none" stroke="currentColor"/><text x="252" y="487" font-size="12">public key</text>
<rect x="352" y="478" width="14" height="9" fill="currentColor" fill-opacity=".55"/><text x="372" y="487" font-size="12">ciphertext or signature</text>
</svg>
<figcaption>Figure 4.5. Sizes on a logarithmic scale; each grid line is ten times the last. Every post-quantum scheme is larger than elliptic curves in some dimension, and the families trade one size against the other: McEliece and UOV have huge keys and tiny ciphertexts or signatures, SLH-DSA and FAEST tiny keys and large signatures, SQIsign small everything but slow signing.</figcaption>
</figure>

**Reading the chart.** Add the two bars: a fresh exchange usually sends both, so ML-KEM-768
costs 2,272 bytes per handshake and Classic McEliece 261,216, or 96 if its key was delivered
in advance. Then ask which bar is sent often. A root key is stored once in every client while
its signatures travel with every certificate, which is UOV's niche; a firmware key signs
rarely, so SLH-DSA's 32-byte key matters more than its 8-kilobyte signature.

**Speed.** On a modern laptop core, ML-KEM key generation, encapsulation and decapsulation
each take on the order of ten to fifty microseconds, comparable to or faster than X25519.
ML-DSA signs in roughly a hundred microseconds to a millisecond (the rejection loop makes it
variable) and verifies faster. Falcon verifies very fast and signs in under a millisecond
with floating point. SLH-DSA's "s" sets sign in hundreds of milliseconds and its "f" sets in
tens; verification is a few milliseconds. Classic McEliece's key generation takes tens of
milliseconds to seconds, but encapsulation and decapsulation are fast; HQC is slower than
ML-KEM by roughly an order of magnitude but still well under a millisecond in optimized code.
UOV and MAYO sign and verify in about a tenth of a millisecond or less, being mostly linear
algebra over a small field; FAEST's team reports about 1.7 million cycles to sign or verify
with 128f and 12.8 million with 128s; SQIsign's round 3 version signs in about 94 million
cycles and verifies in about 12 million. These are orders of magnitude from published
benchmarks; exact numbers depend on the processor and the library.
library.

## 4.9 How the best attacks scale

*Level: intermediate.*

Every toy in this chapter fell in a fraction of a second, and every real instance is out of
reach. What separates them is how the cost of the best attack grows with the parameters.

- **Lattices.** BKZ reduction with sieving costs about $2^{0.292\beta}$ classically and
  $2^{0.265\beta}$ with Grover-style search, linear in the block size $\beta$, which grows
  roughly with the dimension. ML-KEM-512 needs $\beta \approx 406$, ML-KEM-1024 about 874
  ([Chapter 2](02-Security-Levels.md)).
- **Codes.** Information set decoding costs $2^{c n}$ for a constant fixed by the rate and
  error density: for Prange's algorithm on Classic McEliece's smallest set, $2^{143}$ at
  $n = 3{,}488$, about $2^{0.041n}$. Linear in $n$, but slowly, hence the large keys.
- **Hashes.** $2^{n}$ for a preimage of an $n$-bit output, $2^{n/2}$ with Grover; SLH-DSA uses
  16, 24 and 32-byte hashes for categories 1, 3 and 5.
- **Multivariate.** Generic solving is exponential in the number of unknowns (§4.5); the
  attacks that matter are structural, and each scheme is priced against the best one known.
- **Isogenies.** About $p^{1/2}$ classically and $p^{1/4}$ quantumly, a fraction of
  $\log_2 p$. The commutative case is the exception: Kuperberg's algorithm is subexponential,
  so CSIDH needs primes of thousands of bits in most analyses.
- **MPC-in-the-head and FAEST.** Exactly the one-wayness of the function inside: AES-128's key
  search, or the syndrome decoding and MQ instances of SDitH and MQOM.

**Code it.** One formula per family, evaluated at a category 1 parameter set.

```python
from math import comb, log2

prange = log2(comb(3488, 64) / comb(768, 64))   # guesses until all 64 errors miss the guessed set
p2, p3 = log2(5 * 2 ** 248 - 1), log2(3 * 2 ** 324 - 1)
rows = [  # family, parameter set, log2 of the classical and quantum cost of the best known attack
    ("lattice", "ML-KEM-512, BKZ-406", 0.292 * 406, 0.265 * 406),
    ("code", "mceliece348864", prange, prange / 2),
    ("hash", "SLH-DSA-128s", 128, 128 / 2),
    ("MQ over GF(2)", "128 unknowns", 128, 128 / 2),
    ("isogeny", "SQIsign round 2", p2 / 2, p2 / 4),
    ("isogeny", "SQIsign round 3", p3 / 3, p3 / 4),
    ("symmetric", "FAEST-128 (AES-128)", 128, 128 / 2),
]
for fam, name, cl, qu in rows:
    print("%-13s %-20s classical 2^%3.0f   quantum 2^%3.0f" % (fam, name, cl, qu))
```

It prints:

```text
lattice       ML-KEM-512, BKZ-406  classical 2^119   quantum 2^108
code          mceliece348864       classical 2^143   quantum 2^ 71
hash          SLH-DSA-128s         classical 2^128   quantum 2^ 64
MQ over GF(2) 128 unknowns         classical 2^128   quantum 2^ 64
isogeny       SQIsign round 2      classical 2^125   quantum 2^ 63
isogeny       SQIsign round 3      classical 2^109   quantum 2^ 81
symmetric     FAEST-128 (AES-128)  classical 2^128   quantum 2^ 64
```

The numbers need reading with care ([Chapter 2](02-Security-Levels.md) explains the
yardsticks). The lattice line is core-SVP, deliberately conservative; the code line counts
Prange's guesses, each a large matrix reduction. The quantum column is Grover's square root
wherever a search can be sped up, ignoring the depth limit of §2.4, which is why NIST compares
every category with the cost of attacking AES rather than with a bare exponent. The SQIsign
lines show a prime that grew because an attack improved: Wesolowski's July 2026 algorithm
works in time and memory about $p^{1/3}$ rather than $p^{1/2}$, and the round 3
specification moved from a 251-bit to a 326-bit prime, pricing in the memory the attack needs
([Chapter 16](16-Isogenies.md)).

**What would change the picture.** Exponential attacks can be outrun: when lattice estimates
dropped by a few bits as sieving improved, the parameter sets had the margin. An attack that
is *subexponential* or *quasipolynomial* in the size cannot be outrun cheaply, because
doubling the parameters no longer doubles the exponent. Kuperberg's algorithm does this to
CSIDH, and the 2026 "hold-out" distinguisher for Goppa codes runs in time $n^{O(\log n)}$ in
Classic McEliece's regime. It has not recovered a full-size key, and its estimated costs at
real sizes, from about $2^{90}$ to above the targets, rest on heuristics still disputed as of
November 2026, but it is why BSI changed its advice in October 2026
([Chapter 13](13-Code-Based-Encryption-McEliece.md), §13.10).

## 4.10 Why diversity matters

*Level: intermediate.*

In 2022 two schemes, one multivariate and one isogeny, fell within five months of each
other, both to new mathematics run on ordinary computers. Neither was a lattice scheme, and
neither had been standardized. But they were finalists or near-finalists, designed by
experts, studied for years. The lesson is that a family can look healthy until the day it
does not.

Table 4.2 summarizes the record.

| Family | Notable breaks | Core problem attacked? |
| --- | --- | --- |
| Lattices | GGH (1999), early NTRU signatures (2006), some ring variants with weak parameters; HAWK withdrawn (2026) after a new reduction attack | no significant break of LWE, module-LWE or NTRU at standard parameters |
| Codes | many structured variants (Reed-Solomon, some quasi-cyclic and quasi-dyadic); 2026 structural attacks on Goppa codes | no practical break of McEliece with binary Goppa codes; the 2026 distinguisher's real cost is disputed |
| Hashes | none structural; misuse of state | no |
| Multivariate | C* (1995), HFE variants, Rainbow (2022), GeMSS weakened (2021-22) | UOV's core unbroken since 1999 with suitable parameters |
| Isogenies | SIDH and SIKE (2022) | SIDH's torsion-point variant only; the general path problem stands, though a 2026 algorithm lowered its cost to about $p^{1/3}$ |
| MPC-in-the-head | parameter adjustments | rests on AES, syndrome decoding or MQ |

*Table 4.2. What has fallen in each family.*

This is why the standards spread their bets. NIST standardized one lattice KEM (ML-KEM) and
chose a code-based KEM (HQC) as a backup with different mathematics. It standardized two
lattice signatures (ML-DSA, and FN-DSA to come) and a hash-based one (SLH-DSA) whose security
depends on nothing new. And in 2022 it opened a new call for signatures *not* based on
structured lattices, now in its third round with schemes from four other families. A
system that can switch from one family to another without redesign, a property called
**crypto-agility** (Chapter 18), can survive a break that a single-algorithm system cannot.

!!! note "Life story: learning with errors"
    **Born:** 2005, Oded Regev, "On lattices, learning with errors, random linear codes, and
    cryptography" (STOC 2005; *Journal of the ACM* 2009) · **Purpose:** an average-case
    problem with a proof that solving it would solve worst-case lattice problems, at least
    for a quantum computer · **Helped:** the foundation of ML-KEM, ML-DSA, FrodoKEM, fully
    homomorphic encryption and much of modern theoretical cryptography; Regev received the
    2018 Gödel Prize for it · **Status:** current; no significant classical or quantum attack
    at standard parameters

### Two cases: Rainbow and SIKE

Both falls are told in full later, Rainbow in [Chapter 15](15-Multivariate-Signatures-and-the-On-Ramp.md)
and SIKE in [Chapter 16](16-Isogenies.md). Side by side they teach one lesson.

**Rainbow**, a layered Oil and Vinegar scheme by Jintai Ding and Dieter Schmidt (2005), was
one of three signature finalists in 2020. In February 2022 Ward Beullens posted "Breaking
Rainbow Takes a Weekend on a Laptop": key recovery for the category 1 parameters in about 53
hours on an ordinary laptop. The attack used the layers, the structure that made Rainbow
smaller than plain UOV; UOV itself was unaffected.

**SIKE**, the isogeny KEM with the smallest ciphertexts of any candidate, had a decade of
study behind it. On 30 July 2022, weeks after NIST sent it to the fourth round, Wouter
Castryck and Thomas Decru posted a key recovery for SIKEp434 that ran in about an hour on one
core of a 2013 processor. It used the torsion-point images SIDH had to publish; the path
problem under SQIsign was untouched.

Both times, structure added to a sound problem to make a scheme smaller fell to new
mathematics on ordinary computers, with no quantum computer involved, and neither break
touched any other family. A system built to switch algorithms would have shrugged off both.

## 4.11 The tournament that chose

*Level: intermediate.*

How did the field get from six families to a handful of standards? Through a public process
that NIST ran like its earlier competitions for AES (1997 to 2001) and SHA-3 (2007 to
2015), though NIST was careful to call it a "process" rather than a competition, because it
meant to choose several winners and to keep the right to change them.

<div class="mars-steps" markdown>

1. **The call (December 2016).** NIST asked for public-key encryption, key-establishment and
   signature schemes, with security categories (Chapter 2), reference code and analysis.
   Submissions closed on 30 November 2017.
2. **Round 1 (December 2017).** Of 82 submissions, 69 were accepted as complete. Within weeks
   several were broken outright by other participants, some on the public mailing list within
   days.
3. **Round 2 (January 2019).** Twenty-six candidates: 17 encryption or KEM schemes and 9
   signatures. Teams with similar designs were encouraged to merge, and several did.
4. **Round 3 (July 2020).** Seven finalists (the KEMs Classic McEliece, Kyber, NTRU and Saber;
   the signatures Dilithium, Falcon and Rainbow) and eight alternates (the KEMs BIKE,
   FrodoKEM, HQC, NTRU Prime and SIKE; the signatures GeMSS, Picnic and SPHINCS+).
5. **Selections (July 2022).** Kyber for key establishment; Dilithium, Falcon and SPHINCS+ for
   signatures. BIKE, Classic McEliece, HQC and SIKE went to a fourth round. Rainbow had been
   broken in February; SIKE was broken weeks after the announcement.
6. **Standards (August 2024).** Draft standards appeared in August 2023 and, after public
   comment, FIPS 203 (ML-KEM), FIPS 204 (ML-DSA) and FIPS 205 (SLH-DSA) were published on 13
   August 2024. Falcon's standard, FN-DSA, was left for later because of its floating-point
   complexity.
7. **Round 4 ends (March 2025).** HQC was selected as a second KEM, for diversity; BIKE was
   not; Classic McEliece was left pending the ISO process (NIST IR 8545).
8. **A second call, for signatures (2022 to now).** To get signatures not based on structured
   lattices, NIST opened a new call in September 2022. It accepted 40 of 50 submissions in
   July 2023, advanced 14 in October 2024 and nine in May 2026: FAEST, HAWK, MAYO, MQOM,
   QR-UOV, SDitH, SNOVA, SQIsign and UOV (NIST IR 8610). HAWK, the one lattice scheme among
   them, was withdrawn by its own team at the end of July 2026 after a new lattice-reduction
   attack, leaving eight. The third round is expected to last about two years.

</div>

The process worked as intended in the way that matters most: the breaks happened in public,
before standardization, to schemes that were then dropped. Its critics, notably Daniel
Bernstein, argued that NIST's reasoning was sometimes opaque (Chapter 2, §2.11) and that a
patent dispute over lattice KEMs (settled by NIST licensing two patent families in 2022) had
weighed on the choice. Those debates were themselves public, which is more than could be said
of how earlier generations of standards were chosen.

!!! note "Life story: the NIST post-quantum process"
    **Born:** December 2016, NIST's call for proposals; 82 submissions by November 2017 ·
    **Purpose:** to choose quantum-resistant public-key standards in the open, with the
    world's cryptographers as attackers · **Helped:** FIPS 203, 204 and 205 (2024), HQC's
    selection (2025), and a second, ongoing call for signatures; two prominent candidates,
    Rainbow and SIKE, were broken in public before they could be standardized · **Status:**
    ongoing; FN-DSA (FIPS 206) and HQC (FIPS 207) standards and the third round of additional
    signatures, with eight candidates, are under way as of November 2026

## 4.12 Around the world

*Level: intermediate.*

NIST's process was international in its participants, and many governments follow its
choices, but not all choose the same set.

- **Germany's BSI** recommends ML-KEM alongside the more conservative FrodoKEM (an
  unstructured LWE scheme with no ring or module structure) and, until October 2026, Classic McEliece (now advised against for new systems after
  that year's structural attacks), and recommends hybrid key exchange during the transition.
- **France's ANSSI** and several other European agencies require or recommend hybrids with
  classical algorithms for now, and accept ML-KEM, ML-DSA and SLH-DSA in them.
- **ISO/IEC** has been standardizing FrodoKEM, Classic McEliece and ML-KEM as additions to
  its encryption standard ISO/IEC 18033-2; NIST said in March 2025 that it would wait for the
  ISO process before deciding on Classic McEliece.
- **South Korea** ran its own competition, KpqC, which in early 2025 selected the KEMs
  SMAUG-T and NTRU+ and the signatures HAETAE and AIMer.
- **China** has its own national standards body for commercial cryptography, which in
  February 2025 opened a call for next-generation algorithms including post-quantum ones;
  its outcome was not public as of November 2026.
- **The IETF** standardizes how the algorithms are used in protocols (TLS, SSH, IKEv2,
  certificates, HPKE, OpenPGP, COSE and JOSE), mostly with the NIST algorithms and their
  hybrids.

The overlap is large, ML-KEM and ML-DSA almost everywhere, but the differences matter for
software that must sell in several markets, which is one more reason for agility.

## 4.13 In the real world: choosing a family

*Level: intermediate.*

For most engineers, choosing comes down to a short decision tree:

<div class="mars-steps" markdown>

1. **Key exchange or encryption:** ML-KEM-768, usually in a hybrid with X25519 during the
   transition. HQC, once FIPS 207 appears, is the standard backup on different mathematics.
   Classic McEliece suits uses where public keys can be distributed once and ciphertexts must
   be tiny (for example, a static server key in a constrained protocol), but after the 2026
   structural attacks BSI advises against it for new systems; FrodoKEM suits policies that
   want no structured lattices.
2. **General signatures:** ML-DSA-65 (or ML-DSA-44). Plan to evaluate FN-DSA when its
   standard appears, for its smaller signatures.
3. **Long-lived roots of trust and firmware:** SLH-DSA, or LMS or XMSS if the signer can
   manage state reliably (Chapter 11).
4. **Very small signatures needed:** watch UOV, MAYO, QR-UOV, SNOVA and SQIsign in NIST's
   third round, and FAEST, MQOM and SDitH for signatures that rest on AES or on unstructured
   problems; do not deploy them for high-value uses until they are standardized.
5. **Always:** design the system so the algorithm can be changed.

</div>

A Mars settlement makes the trade-offs vivid. Its root key, burned into every habitat
controller and rover, should be hash-based: tiny to store, conservative, and checked rarely.
Its links to Earth carry many messages over expensive bandwidth, so they use ML-KEM, whose
kilobyte-sized messages are a small overhead on large transfers, in a session that lasts for
days rather than a handshake per message. A sensor network on the surface, with radios that
send a few hundred bytes at a time, might prefer pre-shared symmetric keys distributed by the
settlement's own authority, avoiding public-key cryptography on the smallest devices
altogether.

### On a slow link

Arcadia City's link to Earth is the extreme case of a constrained network. Light takes 3 to
22 minutes each way, so a round trip costs 6 to 44 minutes before a single bit of bandwidth
is counted, and a habitat's backup radio may manage only a kilobit per second.

**By hand.** Add the two bars of Figure 4.5 and divide by the data rate. At 1 kbit/s an
ML-KEM-768 exchange, $1{,}184 + 1{,}088 = 2{,}272$ bytes or 18,176 bits, takes about 18
seconds; HQC-1's 6,674 bytes take 53 seconds; an ML-DSA-65 signature with its public key,
5,261 bytes, 42 seconds; a Classic McEliece key and ciphertext, 261,216 bytes, about 35
minutes. At 64 kbit/s all of them but McEliece take under a second.

Three lessons follow. First, the lattice and code-based KEMs cost seconds, small beside a
round trip of six minutes or more. Second, a Classic McEliece key sent over the backup radio
takes as long as a light-time round trip, but delivered once by ship or at a good pass and
stored, it leaves only 96 bytes per exchange, the cheapest of all. Third, **round trips cost
more than bytes**. A TLS 1.3 client that guesses the wrong key-exchange group gets a
HelloRetryRequest and pays a whole extra round trip, up to 44 minutes. The settlement's links
in [Chapter 18](18-Hybrids-and-the-Migration.md) therefore fix their algorithms in advance,
carry every key share in the first message, and keep long sessions with symmetric rekeying.

## 4.14 Going deeper

*Level: expert.*

**Reductions and what they mean.** NP-hardness of syndrome decoding or MQ is a statement
about the worst case; cryptography needs hardness on average for instances generated in a
particular way, and NP-hardness says nothing about that. Lattices are special because
Ajtai's and Regev's reductions do connect the average case used in cryptography to worst-case
problems, though for approximation factors polynomial in the dimension, where the worst-case
problems are not believed NP-hard. A reduction of this kind rules out a whole class of
attacks: any attack on random LWE would be an attack on every lattice.

**Quantum attacks per family.** For lattices, the best quantum speed-ups known are
Grover-type speed-ups inside sieving, worth a few percent of the exponent. For codes, Grover
can be applied inside information set decoding, roughly halving the exponent of the
Prange-style part; Classic McEliece's quantum security is computed with this in mind. For
hashes, Grover halves preimage exponents, which SLH-DSA's parameters account for. For
isogenies, Kuperberg's algorithm threatens commutative group actions (CSIDH) and not the
non-commutative path problems behind SQIsign. For MQ, Grover-accelerated exhaustive search
helps modestly. No family has a Shor-like exponential quantum break.

**What "structure" costs.** Every family has an unstructured version that is trusted more
and a structured version that is smaller: LWE versus module-LWE, random codes versus
quasi-cyclic codes, generic MQ versus UOV's oil-and-vinegar map. Structure is where attacks
hide. The standards made specific bets: module structure for ML-KEM and ML-DSA, NTRU
structure for Falcon, quasi-cyclic structure for HQC, no structure beyond the hash for
SLH-DSA. Germany's preference for FrodoKEM and Classic McEliece was a bet on less structure
at the cost of size; the 2026 attacks on Goppa codes, which exploit the algebraic structure
that makes the McEliece trapdoor work, are a reminder that "unstructured" is relative, and BSI
withdrew that half of the bet for new systems in October 2026.

**Why Shor's method does not reach them.** Shor's algorithm solves the hidden subgroup
problem in abelian groups, which covers factoring and discrete logarithms. The natural ways to
cast the new problems as hidden subgroup problems lead to *non-abelian* groups, where quantum
Fourier sampling is much weaker. Regev showed in 2002 that the dihedral hidden subgroup
problem, with a particular error tolerance, would solve unique-SVP; Kuperberg's
subexponential dihedral algorithm lacks that tolerance, so it leaves lattices alone but
reaches CSIDH's commutative action. For McEliece the group is the symmetric group, and Dinh,
Moore and Russell proved in 2011 that quantum Fourier sampling reveals essentially nothing
about the hidden permutation of a Goppa-code key. These arguments cover one kind of quantum
attack, not all, but they explain why thirty years of quantum algorithms have given these
problems square-root speed-ups and nothing more.

## Check yourself

??? question "1. In the toy LWE encryption with q = 17, the owner computes d = v - u·s and gets 7. Which bit was sent?"

    The bit 1. The value 7 is 1 away from $\lfloor q/2 \rfloor = 8$ and 7 away from 0, so it
    lies in the "near $q/2$" zone (5 to 12) of Figure 4.2; the noise was $-1$.

??? question "2. Why does Gaussian elimination, which solves A s = b instantly, fail for LWE?"

    Elimination adds and scales rows. Each operation adds the rows' errors together and
    multiplies them, so after a few steps the accumulated error is as large as the modulus and
    the result says nothing about $s$.

??? question "3. A word received with the Hamming code of §4.3 has syndrome 011. Where is the error, and why is the disguised code harder?"

    At position 3, because 011 is 3 in binary and column 3 of $H$ is 011. After a secret
    permutation of columns and mixing of rows, the syndrome no longer spells the position;
    finding it means matching it against columns, trivial for 7 columns but for a Goppa code
    with 64 errors among 3,488 positions it is the generic decoding problem.

??? question "4. Why does a Winternitz signature need a checksum, and why does the checksum stop forgeries?"

    Anyone can hash a revealed chain value forward, which turns a signature on digit $d$ into
    one on $d + 1$. The checksum $\sum (w - 1 - d_i)$ falls whenever a message digit rises, so
    a forger would have to move some checksum chain backward, which means finding a hash
    preimage.

??? question "5. In UOV, why must no equation contain a product of two oil variables?"

    So that fixing the vinegar variables at random leaves equations that are linear in the oil
    variables, which the signer can solve by linear algebra. A product of two oil variables
    would leave a quadratic system as hard as the original.

??? question "6. What extra information did SIDH publish that the 2022 attack exploited, and why does CSIDH not suffer from it?"

    SIDH published the images of certain torsion points under the secret isogeny, needed for
    the two parties to complete their computations. Castryck and Decru used them, with Kani's
    theorem, to recover the isogeny. CSIDH works with a commutative group action and publishes
    no such points.

??? question "7. An MPC-in-the-head proof uses 32 parties. How many rounds give a cheating chance below 2^-128? And why did Picnic's three-party version need 219?"

    Each round lets a cheater escape with probability $1/32 = 2^{-5}$, so 26 rounds give
    $2^{-130}$; 25 give only $2^{-125}$. With three parties of which two are opened, a cheater
    escapes a round with probability $2/3$, and $\log_2(3/2) \approx 0.585$, so it takes
    $128 / 0.585 \approx 219$ rounds.

??? question "8. Arcadia City's backup radio runs at 1 kbit/s and Earth is 22 light-minutes away. Which costs more time: sending an ML-KEM-768 key and ciphertext, or a TLS HelloRetryRequest?"

    The retry, by far. The ML-KEM-768 exchange is 2,272 bytes, about 18 seconds at 1 kbit/s;
    the extra round trip of a HelloRetryRequest costs 44 minutes of light time. On such links
    the design goal is fewer round trips first and fewer bytes second.

??? question "9. Why did NIST choose a code-based KEM as its second KEM rather than a second lattice KEM?"

    For diversity: if a breakthrough against structured lattices broke ML-KEM, a second lattice
    KEM might fall with it. HQC rests on decoding quasi-cyclic codes, a different problem with a
    different history of attack.

??? question "10. Why does a quasipolynomial attack, like the 2026 distinguisher for Goppa codes, worry designers more than a better exponential attack would, even before it breaks a real key?"

    An exponential attack costing $2^{cn}$ can be outrun by increasing $n$ a little, which costs
    a proportional increase in key size. Against a cost of $n^{O(\log n)}$, the exponent grows
    only like $(\log n)^2$, so a much larger code buys little extra security and the key sizes
    needed to keep up would be impractical. For Classic McEliece, whose keys are already the
    largest of any standard, there is no room to grow.

## What you learned

- Six families of problems underlie post-quantum cryptography: lattices (LWE and NTRU),
  codes (syndrome decoding), hashes, multivariate equations (MQ), isogenies, and
  MPC-in-the-head proofs over AES or other one-way functions.
- Each has a small instance you can solve by brute force and a real instance far out of
  reach. Lattices dominate the standards because they are small, fast and well studied, with
  worst-case reductions behind them.
- Codes (McEliece, 1978) and hashes (Lamport and Merkle, 1979) are the oldest and most
  conservative; their costs are large keys and large signatures respectively.
- Multivariate and isogeny schemes give the smallest signatures and keys and have the most
  dramatic record of breaks, including Rainbow and SIKE in 2022, both through structure added
  to a sound problem, both on ordinary computers.
- Each trapdoor is a small trick you can do by hand: LWE decryption rounds $v - u \cdot s$ to
  0 or $q/2$; a structured code's syndrome names the error; Winternitz chains sign several bits
  per secret with a checksum against forward hashing; Oil and Vinegar becomes linear once the
  vinegar is fixed; MPC-in-the-head commits to every view and lets a hash pick which to open.
- Every family trades one size against another; Table 4.1 and Figure 4.5 are the chart to
  remember. On a slow link such as Mars to Earth, round trips cost far more than the extra
  bytes, except for keys as large as Classic McEliece's, which should travel once.
- The best attack on each family grows exponentially with the instance size, with exponents
  of about $0.29\beta$ for lattices, $0.04n$ for Classic McEliece's codes, and $\tfrac12$ to
  $\tfrac13 \log_2 p$ for isogenies; subexponential or quasipolynomial attacks, as for CSIDH
  and the 2026 Goppa-code distinguisher, are the ones that cannot be outrun by growing the
  parameters.
- The standards deliberately spread their bets across families, and systems should be built
  to switch algorithms.

**Next:** Part II begins with [Chapter 5](05-Lattices-and-Their-Hard-Problems.md), the
lattice problems in detail.

## Further reading

- Miklós Ajtai, "Generating hard instances of lattice problems" (STOC 1996).
- Jeffrey Hoffstein, Jill Pipher and Joseph H. Silverman, "NTRU: A ring-based public key
  cryptosystem" (ANTS 1998; presented at CRYPTO 1996 rump session).
- Oded Regev, "On lattices, learning with errors, random linear codes, and cryptography",
  *Journal of the ACM* 56 (2009; STOC 2005).
- Robert J. McEliece, "A Public-Key Cryptosystem Based on Algebraic Coding Theory", JPL DSN
  Progress Report 42-44 (1978).
- Elwyn Berlekamp, Robert McEliece and Henk van Tilborg, "On the inherent intractability of
  certain coding problems", *IEEE Transactions on Information Theory* 24 (1978).
- Leslie Lamport, "Constructing digital signatures from a one-way function", SRI technical
  report CSL-98 (1979).
- Ralph Merkle, "A Certified Digital Signature" (CRYPTO 1989; written 1979).
- Aviad Kipnis, Jacques Patarin and Louis Goubin, "Unbalanced Oil and Vinegar Signature
  Schemes" (EUROCRYPT 1999).
- David Jao and Luca De Feo, "Towards quantum-resistant cryptosystems from supersingular
  elliptic curve isogenies" (PQCrypto 2011).
- Wouter Castryck, Tanja Lange, Chloe Martindale, Lorenz Panny and Joost Renes, "CSIDH: An
  Efficient Post-Quantum Commutative Group Action" (ASIACRYPT 2018).
- Wouter Castryck and Thomas Decru, "An efficient key recovery attack on SIDH" (EUROCRYPT
  2023; IACR ePrint 2022/975).
- Yuval Ishai, Eyal Kushilevitz, Rafail Ostrovsky and Amit Sahai, "Zero-knowledge from secure
  multiparty computation" (STOC 2007).
- Daniel J. Bernstein, Johannes Buchmann and Erik Dahmen, editors, *Post-Quantum
  Cryptography* (Springer, 2009): a chapter on each family.
- NIST IR 8545, *Status Report on the Fourth Round of the NIST Post-Quantum Cryptography
  Standardization Process* (March 2025).
- NIST IR 8610, *Status Report on the Second Round of the Additional Digital Signature
  Schemes* (May 2026).
- BSI TR-02102-1, *Cryptographic Mechanisms: Recommendations and Key Lengths* (yearly).
- NIST FIPS 203, *Module-Lattice-Based Key-Encapsulation Mechanism Standard*; FIPS 204,
  *Module-Lattice-Based Digital Signature Standard*; FIPS 205, *Stateless Hash-Based Digital
  Signature Standard* (all August 2024).
- Richard W. Hamming, "Error detecting and error correcting codes", *Bell System Technical
  Journal* 29 (1950).
- Andreas Hülsing, "W-OTS+: Shorter Signatures for Hash-Based Signature Schemes"
  (AFRICACRYPT 2013).
- Charles Bouillaguet and others, "Fast Exhaustive Search for Polynomial Systems in F2" (CHES
  2010).
- Denis X. Charles, Eyal Z. Goren and Kristin E. Lauter, "Cryptographic Hash Functions from
  Expander Graphs", *Journal of Cryptology* 22 (2009).
- Benjamin Wesolowski, "The supersingular isogeny problem in time and memory $p^{1/3+o(1)}$",
  IACR ePrint 2026/1486 (July 2026).
- The SQIsign team, *SQIsign: Algorithm specifications and supporting documentation*, version
  3.0 (September 2026).
- Melissa Chase and others, "Post-Quantum Zero-Knowledge and Signatures from Symmetric-Key
  Primitives" (ACM CCS 2017): Picnic.
- Jonathan Katz, Vladimir Kolesnikov and Xiao Wang, "Improved Non-Interactive Zero Knowledge
  with Applications to Post-Quantum Signatures" (ACM CCS 2018).
- Carsten Baum and others, *FAEST: Algorithm Specifications*, version 2.0 (2025), and
  faest.info for benchmarks.
- Carlos Aguilar Melchor and others, *Hamming Quasi-Cyclic (HQC)*, specification of 22 August
  2025.
- Ward Beullens, "Breaking Rainbow Takes a Weekend on a Laptop" (CRYPTO 2022; IACR ePrint
  2022/214).
- Anja Becker, Léo Ducas, Nicolas Gama and Thijs Laarhoven, "New directions in nearest
  neighbor searching with applications to lattice sieving" (SODA 2016).
- Ashrujit Ghoshal, Yuval Ishai, Aayush Jain and Nuozhou Sun, "Quasipolynomial Cryptanalysis
  of the McEliece Cryptosystem (or: PIR Meets McEliece)", IACR ePrint 2026/1630 (August 2026).
- Oded Regev, "Quantum Computation and Lattice Problems" (FOCS 2002; *SIAM Journal on
  Computing* 33, 2004).
- Hang Dinh, Cristopher Moore and Alexander Russell, "McEliece and Niederreiter Cryptosystems
  That Resist Quantum Fourier Sampling Attacks" (CRYPTO 2011).
