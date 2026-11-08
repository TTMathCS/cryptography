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
    - the typical sizes and speeds of each family, side by side;
    - why NIST and others deliberately standardized more than one family;
    - which families each country's standards and competitions have chosen.

    **You need:** [Chapters 1 to 3](01-The-Quantum-Threat-Measured.md); matrices and vectors
    modulo a number; the idea of a hash function. Every family returns in its own chapters
    later; this one gives the map.

    **Levels:** §4.1 to §4.3 are for beginners, §4.4 to §4.12 are intermediate, §4.13 is
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

```
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

```
syndrome: 111111111010
weight-3 vectors tried: 2024; solutions: [(3, 7, 9), (14, 18, 21)]; true error at (3, 7, 9)
```

Two solutions appear because this toy code is too small: 2,024 possible errors are squeezed
into $2^{12} = 4{,}096$ syndromes, and some collide. Real parameters make the solution
unique and the search vast: Classic McEliece's smallest set has $n = 3{,}488$ and $t = 64$,
so there are about $2^{456}$ candidate error patterns, and the cleverest algorithms
(information set decoding, Chapter 13) need about $2^{143}$ operations.

**History and record.** McEliece's scheme has never been broken in nearly fifty years with
its original Goppa codes, although many attempts to shrink its keys with more structured
codes have been. Its weakness is size: a public key is a large matrix. Classic McEliece's
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
    Diffie-Hellman; its descendant Classic McEliece is recommended by Germany's BSI for
    high-assurance uses · **Status:** unbroken with Goppa codes;
    Classic McEliece reached NIST's fourth round, where NIST deferred a decision while ISO
    standardizes it

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

```
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

## 4.5 Multivariate equations

*Level: intermediate.*

**The problem.** Given $m$ quadratic polynomials $p_1, \dots, p_m$ in $n$ variables over a
small finite field, and target values $y_1, \dots, y_m$, find $x$ with $p_i(x) = y_i$ for all
$i$. This **MQ problem** is NP-complete over any finite field, and for random systems with
$m \approx n$ the best algorithms (Gröbner bases, and exhaustive search with clever
evaluation) take time exponential in $n$.

**Code it.** Twelve random quadratic equations in twelve unknowns over GF(2), the field
with two elements, solved by trying all 4,096 inputs.

```python
import itertools, random

def random_mq(n, m, seed):
    """m random quadratic polynomials in n variables over GF(2)."""
    rnd = random.Random(seed)
    polys = []
    for _ in range(m):
        quad = {(i, j): rnd.randrange(2) for i in range(n) for j in range(i, n)}
        lin = [rnd.randrange(2) for _ in range(n)]
        polys.append((quad, lin, rnd.randrange(2)))
    return polys

def evaluate(polys, x):
    out = []
    for quad, lin, const in polys:
        v = const
        for (i, j), c in quad.items():
            v ^= c & x[i] & x[j]
        for i, c in enumerate(lin):
            v ^= c & x[i]
        out.append(v)
    return tuple(out)

n = m = 12
P = random_mq(n, m, seed=8)
secret = tuple(random.Random(9).randrange(2) for _ in range(n))
target = evaluate(P, secret)
sols = [x for x in itertools.product((0, 1), repeat=n) if evaluate(P, x) == target]
print("%d equations, %d unknowns: %d of %d inputs solve it; secret among them: %s"
      % (m, n, len(sols), 2 ** n, secret in sols))
```

Running it prints:

```
12 equations, 12 unknowns: 3 of 4096 inputs solve it; secret among them: True
```

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

## 4.6 Isogenies

*Level: intermediate.*

**The problem.** An **isogeny** is a map from one elliptic curve to another that respects
their group structure. For a fixed prime $p$, the supersingular elliptic curves over
$\mathbb{F}_{p^2}$ and the isogenies of a small degree between them form a graph, with
curves as vertices and isogenies as edges, in which every vertex has the same small number
of neighbours. Walking a few hundred random steps through this graph is easy. Given only the
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
keys for the smallest parameters in about an hour on one core, using a theorem of Ernst
Kani from 1997 about products of curves. The attack exploited extra information SIDH had to
publish (images of torsion points), not the underlying path problem. CSIDH does not publish
that information and is unaffected, but because its group action is commutative it falls
within reach of Kuperberg's subexponential quantum algorithm (Chapter 1, §1.11), and its
parameters for real quantum security are debated and large. **SQIsign** (2020), a signature
built from the hardest form of the path problem (the endomorphism ring problem), survived
and is in NIST's third round with signatures of about 150 bytes. Chapter 16 tells the story
in full.

**Sizes.** The smallest of any family: tens to hundreds of bytes. The cost is computation:
SQIsign's signing takes milliseconds to tens of milliseconds, much slower than lattice
schemes, though newer versions have improved it many times over.

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

```
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

## 4.8 The size chart

*Level: intermediate.*

Table 4.1 collects typical sizes for each family at roughly category 1 or 3. They are the
numbers that decide most deployments, because a TLS handshake, a certificate, a firmware
image header and a smart card all have budgets measured in bytes.

| Family | Scheme (level) | Public key | Ciphertext or signature | Status, November 2026 |
| --- | --- | --- | --- | --- |
| Elliptic curve (for scale) | X25519, Ed25519 | 32 | 32, 64 | broken by Shor |
| Lattice | ML-KEM-768 (3) | 1,184 | 1,088 | FIPS 203 |
| Lattice | ML-DSA-65 (3) | 1,952 | 3,309 | FIPS 204 |
| Lattice | Falcon-512 (1) | 897 | about 666 | FN-DSA in preparation |
| Lattice, unstructured | FrodoKEM-976 (3) | 15,632 | 15,744 | ISO process; BSI recommends |
| Code | Classic McEliece 348864 (1) | 261,120 | 96 | ISO process; BSI recommends |
| Code | HQC-128 (1) | about 2,250 | about 4,400 | selected by NIST, draft to come |
| Hash | SLH-DSA-128s (1) | 32 | 7,856 | FIPS 205 |
| Hash | LMS, one level, $2^{20}$ signatures (1 to 5) | 56 | about 2,500 | SP 800-208, RFC 8554 |
| Multivariate | UOV, smallest set (1) | tens to hundreds of kB | about 100 to 200 | NIST round 3 |
| Multivariate | MAYO-1 (1) | about 1,400 | about 450 | NIST round 3 |
| Isogeny | SQIsign (1) | about 65 | about 150 | NIST round 3 |
| MPC-in-the-head | FAEST-128s (1) | 32 | about 5,000 | NIST round 3 |

*Table 4.1. Sizes in bytes. Standardized schemes from their standards; candidates from their
round-2 specifications, rounded, and subject to change in round 3.*

Figure 4.2 draws the same table on a logarithmic scale, which is the only way to fit it on
one page.

<figure class="mars-fig">
<svg viewBox="0 0 640 380" width="640" role="img" aria-label="Logarithmic bar chart of public key and signature or ciphertext sizes for X25519, ML-KEM-768, ML-DSA-65, Falcon-512, Classic McEliece, HQC-128, SLH-DSA-128s, MAYO-1 and SQIsign" fill="currentColor" font-size="13">
<text x="170" y="20" font-size="12">bytes (log scale):</text>
<text x="200" y="40" text-anchor="middle" font-size="12">10</text>
<text x="270" y="40" text-anchor="middle" font-size="12">100</text>
<text x="340" y="40" text-anchor="middle" font-size="12">1 k</text>
<text x="410" y="40" text-anchor="middle" font-size="12">10 k</text>
<text x="480" y="40" text-anchor="middle" font-size="12">100 k</text>
<text x="550" y="40" text-anchor="middle" font-size="12">1 M</text>
<line x1="200" y1="46" x2="200" y2="350" stroke="currentColor" stroke-opacity=".25"/>
<line x1="270" y1="46" x2="270" y2="350" stroke="currentColor" stroke-opacity=".25"/>
<line x1="340" y1="46" x2="340" y2="350" stroke="currentColor" stroke-opacity=".25"/>
<line x1="410" y1="46" x2="410" y2="350" stroke="currentColor" stroke-opacity=".25"/>
<line x1="480" y1="46" x2="480" y2="350" stroke="currentColor" stroke-opacity=".25"/>
<line x1="550" y1="46" x2="550" y2="350" stroke="currentColor" stroke-opacity=".25"/>
<text x="160" y="64" text-anchor="end">X25519 / Ed25519</text>
<rect x="160" y="54" width="75" height="9" class="soft" stroke="currentColor"/>
<rect x="160" y="64" width="96" height="9" class="soft-acc"/>
<text x="160" y="96" text-anchor="end">ML-KEM-768</text>
<rect x="160" y="86" width="185" height="9" class="soft" stroke="currentColor"/>
<rect x="160" y="96" width="183" height="9" class="soft-acc"/>
<text x="160" y="128" text-anchor="end">ML-DSA-65</text>
<rect x="160" y="118" width="200" height="9" class="soft" stroke="currentColor"/>
<rect x="160" y="128" width="216" height="9" class="soft-acc"/>
<text x="160" y="160" text-anchor="end">Falcon-512</text>
<rect x="160" y="150" width="177" height="9" class="soft" stroke="currentColor"/>
<rect x="160" y="160" width="168" height="9" class="soft-acc"/>
<text x="160" y="192" text-anchor="end">Classic McEliece</text>
<rect x="160" y="182" width="349" height="9" class="soft" stroke="currentColor"/>
<rect x="160" y="192" width="109" height="9" class="soft-acc"/>
<text x="160" y="224" text-anchor="end">HQC-128</text>
<rect x="160" y="214" width="205" height="9" class="soft" stroke="currentColor"/>
<rect x="160" y="224" width="225" height="9" class="soft-acc"/>
<text x="160" y="256" text-anchor="end">SLH-DSA-128s</text>
<rect x="160" y="246" width="75" height="9" class="soft" stroke="currentColor"/>
<rect x="160" y="256" width="243" height="9" class="soft-acc"/>
<text x="160" y="288" text-anchor="end">MAYO-1</text>
<rect x="160" y="278" width="190" height="9" class="soft" stroke="currentColor"/>
<rect x="160" y="288" width="156" height="9" class="soft-acc"/>
<text x="160" y="320" text-anchor="end">SQIsign</text>
<rect x="160" y="310" width="97" height="9" class="soft" stroke="currentColor"/>
<rect x="160" y="320" width="122" height="9" class="soft-acc"/>
<rect x="200" y="358" width="14" height="9" class="soft" stroke="currentColor"/>
<text x="220" y="367" font-size="12">public key</text>
<rect x="320" y="358" width="14" height="9" class="soft-acc"/>
<text x="340" y="367" font-size="12">ciphertext or signature</text>
</svg>
<figcaption>Figure 4.2. Sizes on a logarithmic scale; each grid line is ten times the last. Every post-quantum scheme is larger than elliptic curves in some dimension, and the families trade one size against the other: McEliece has huge keys and tiny ciphertexts, SLH-DSA tiny keys and large signatures, SQIsign small everything but slow signing.</figcaption>
</figure>

**Speed.** On a modern laptop core, ML-KEM key generation, encapsulation and decapsulation
each take on the order of ten to fifty microseconds, comparable to or faster than X25519.
ML-DSA signs in roughly a hundred microseconds to a millisecond (the rejection loop makes it
variable) and verifies faster. Falcon verifies very fast and signs in under a millisecond
with floating point. SLH-DSA's "s" sets sign in hundreds of milliseconds and its "f" sets in
tens; verification is a few milliseconds. Classic McEliece's key generation takes tens of
milliseconds to seconds, but encapsulation and decapsulation are fast. These are orders of
magnitude, from published benchmarks; exact numbers depend on the processor and the
library.

## 4.9 Why diversity matters

*Level: intermediate.*

In 2022 two schemes, one multivariate and one isogeny, fell within five months of each
other, both to new mathematics run on ordinary computers. Neither was a lattice scheme, and
neither had been standardized. But they were finalists or near-finalists, designed by
experts, studied for years. The lesson is that a family can look healthy until the day it
does not.

Table 4.2 summarizes the record.

| Family | Notable breaks | Core problem attacked? |
| --- | --- | --- |
| Lattices | GGH (1999), early NTRU signatures (2006), some ring variants with weak parameters | no significant break of LWE, module-LWE or NTRU at standard parameters |
| Codes | many structured variants (Reed-Solomon, some quasi-cyclic and quasi-dyadic) | no break of McEliece with binary Goppa codes since 1978 |
| Hashes | none structural; misuse of state | no |
| Multivariate | C* (1995), HFE variants, Rainbow (2022), GeMSS weakened (2021-22) | UOV's core unbroken since 1999 with suitable parameters |
| Isogenies | SIDH and SIKE (2022) | SIDH's torsion-point variant only; the general path problem stands |
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

## 4.10 The tournament that chose

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
   QR-UOV, SDitH, SNOVA, SQIsign and UOV (NIST IR 8610). The third round is expected to last
   about two years.

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
    ongoing; FN-DSA and HQC standards and the third round of additional signatures are under
    way as of November 2026

## 4.11 Around the world

*Level: intermediate.*

NIST's process was international in its participants, and many governments follow its
choices, but not all choose the same set.

- **Germany's BSI** recommends ML-KEM alongside the more conservative FrodoKEM (an
  unstructured LWE scheme with no ring or module structure) and Classic McEliece, and
  recommends hybrid key exchange during the transition.
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

## 4.12 In the real world: choosing a family

*Level: intermediate.*

For most engineers, choosing comes down to a short decision tree:

<div class="mars-steps" markdown>

1. **Key exchange or encryption:** ML-KEM-768, usually in a hybrid with X25519 during the
   transition. Consider Classic McEliece where public keys can be distributed once and
   ciphertexts must be tiny (for example, a static server key in a constrained protocol), or
   FrodoKEM where policy wants no structured lattices.
2. **General signatures:** ML-DSA-65 (or ML-DSA-44). Plan to evaluate FN-DSA when its
   standard appears, for its smaller signatures.
3. **Long-lived roots of trust and firmware:** SLH-DSA, or LMS or XMSS if the signer can
   manage state reliably (Chapter 11).
4. **Very small signatures needed:** watch UOV, MAYO and SQIsign in NIST's third round; do not
   deploy them for high-value uses until they are standardized.
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

## 4.13 Going deeper

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
SLH-DSA. Germany's preference for FrodoKEM and Classic McEliece is a bet on less structure
at the cost of size.

## Check yourself

??? question "1. In the by-hand LWE example of §4.2, check that s = (0, -1) does not fit."

    $b - As$: first row $3 - (5 \cdot 0 + 3 \cdot (-1)) = 6$, which is not in $\{-1, 0, 1\}$,
    so the guess fails at once.

??? question "2. Why does Gaussian elimination, which solves A s = b instantly, fail for LWE?"

    Elimination adds and scales rows. Each operation adds the rows' errors together and
    multiplies them, so after a few steps the accumulated error is as large as the modulus and
    the result says nothing about $s$.

??? question "3. In the syndrome decoding toy, why did two weight-3 errors share one syndrome, and why does that not happen with real parameters?"

    There were 2,024 weight-3 vectors but only 4,096 syndromes, and random syndromes collide
    often at that ratio. Real parameters are chosen so that the number of weight-$t$ errors is
    far smaller than the number of syndromes in the relevant sense, making decoding unique.

??? question "4. A Lamport key signed two messages whose 16-bit digests differ in 6 positions. How many digests can the attacker now sign, and what fraction of all digests is that?"

    $2^6 = 64$ digests, out of $2^{16} = 65{,}536$: about one in a thousand. An attacker who
    can try many messages will soon find one whose digest is among them.

??? question "5. In UOV, why must no equation contain a product of two oil variables?"

    So that fixing the vinegar variables at random leaves equations that are linear in the oil
    variables, which the signer can solve by linear algebra. A product of two oil variables
    would leave a quadratic system as hard as the original.

??? question "6. What extra information did SIDH publish that the 2022 attack exploited, and why does CSIDH not suffer from it?"

    SIDH published the images of certain torsion points under the secret isogeny, needed for
    the two parties to complete their computations. Castryck and Decru used them, with Kani's
    theorem, to recover the isogeny. CSIDH works with a commutative group action and publishes
    no such points.

??? question "7. An MPC-in-the-head proof uses 32 parties. How many rounds give a cheating chance below 2^-128?"

    Each round lets a cheater escape with probability $1/32 = 2^{-5}$, so 26 rounds give
    $2^{-130}$; 25 rounds give only $2^{-125}$.

??? question "8. Which family would you choose for a root key that must stay trusted for 40 years, and why?"

    Hash-based (SLH-DSA, or LMS/XMSS if the state can be managed). Its security depends only on
    the hash function, the most conservative assumption available, and its large signatures do
    not matter for a key that signs rarely.

??? question "9. Why did NIST choose a code-based KEM as its second KEM rather than a second lattice KEM?"

    For diversity: if a breakthrough against structured lattices broke ML-KEM, a second lattice
    KEM might fall with it. HQC rests on decoding quasi-cyclic codes, a different problem with a
    different history of attack.

??? question "10. Give one reason Classic McEliece is attractive despite its huge public keys."

    Its security rests on a problem attacked since 1978 without a significant break, and its
    ciphertexts are tiny (96 to 208 bytes), which suits uses where the public key is
    distributed once and many short encapsulations follow.

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
  dramatic record of breaks, including Rainbow and SIKE in 2022.
- Every family trades one size against another; Table 4.1 and Figure 4.2 are the chart to
  remember.
- The standards deliberately spread their bets across families, and systems should be built
  to switch algorithms.

**Next:** Part II begins with Chapter 5, the lattice problems in detail (coming in the
next part of this book).

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
