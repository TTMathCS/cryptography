# Quantum and post-quantum

*From 1981 to October 2026: the algorithms that would let a quantum
computer break today's public-key cryptography, the race to build such a
machine, the open competition that chose its replacements, and the
largest change of algorithms the internet has ever made, while the old
ones still work.*

Every earlier page ends with a cipher broken. This one is different. The
algorithms that protect almost every connection today,
[RSA](../02-signatures/RSA.md), [Diffie–Hellman](../01-key-exchange/Diffie-Hellman.md)
and [elliptic curves](../10-math-foundations/Elliptic-Curves.md), have not
been broken, and as of October 2026 no computer can break them. But in
1994 a mathematician showed that a large enough quantum computer would,
and since a message recorded today can be decrypted whenever that machine
arrives, the world has started replacing them in advance. This page tells
how that came about, where it stands, and what is still unsettled.

| When | What |
|---|---|
| 1980–1985 | Benioff, Manin, Feynman and Deutsch: the idea of a quantum computer |
| 1994 | Peter Shor's algorithm for factoring and discrete logarithms |
| 1996 | Lov Grover's search algorithm |
| 1996–2005 | Ajtai, NTRU and Regev's learning with errors: the lattice foundations |
| 2001 | a 7-qubit device "factors" 15 |
| 2015–2016 | NSA announces a move to quantum-resistant algorithms; NIST calls for them |
| 2016 | Google tests a post-quantum key exchange in Chrome |
| 2019 | Google's 53-qubit Sycamore; RSA-2048 estimated at 20 million qubits |
| 2022 | NIST picks Kyber, Dilithium, Falcon, SPHINCS+; Rainbow and SIKE broken; OpenSSH goes post-quantum by default |
| 2023 | Signal's PQXDH |
| 2024 | FIPS 203, 204 and 205; hybrid ML-KEM on by default in Chrome and Firefox; Google's Willow chip |
| 2025 | HQC chosen as a backup KEM; RSA-2048 re-estimated at under a million qubits; Signal's SPQR |
| 2026 | 256-bit elliptic curves estimated at under half a million qubits; nine signatures in NIST's third round (eight after HAWK's withdrawal); a US executive order on federal deadlines; NIST IR 8547 final |

## A computer built from physics

### Feynman's question

Paul Benioff and Yuri Manin had sketched quantum models of computation in
1980. In 1981 the physicist Richard Feynman pointed out that ordinary computers
are hopelessly slow at simulating quantum physics, because the amount of
information needed to describe a quantum system doubles with every
particle added. Why not, he asked, build a computer out of quantum parts
and let nature do the work? In 1985 David Deutsch at Oxford described a
*universal quantum computer* in precise terms.

A quantum computer's basic unit is the *qubit*. A classical bit is 0 or 1.
A qubit can be in a *superposition* of both, described by two numbers
called amplitudes. Measuring it gives 0 or 1 at random, with
probabilities set by the amplitudes. With *n* qubits there are 2^*n*
amplitudes at once, and a quantum algorithm works by arranging for the
amplitudes of wrong answers to cancel out and those of right answers to
add up, like waves. The hard part, for both theory and engineering, is
that the cancelling has to be exact, and real qubits are fragile.

### Shor's algorithm, 1994

For years it was unclear whether quantum computers would be good for
much beyond physics. Deutsch and Richard Jozsa (1992) and Daniel Simon
(1994) found problems on which they were provably faster, but the
problems were artificial. Then in 1994 Peter Shor, at AT&T Bell Labs,
showed how one could factor large numbers and compute discrete logarithms
in polynomial time, that is, efficiently, where the best classical methods
take time that grows almost exponentially.

The trick is that factoring reduces to finding a *period*. Pick a number
*a* and look at *a*, *a*², *a*³, … mod *N*: the sequence eventually repeats,
with some period *r*. For an RSA modulus, knowing *r* reveals a factor at
least half the time; if it doesn't, pick another *a* and try again.
Classically, finding *r* is as hard as factoring. A quantum computer can
put all the exponents into superposition at once and use a *quantum
Fourier transform*, which makes the amplitudes interfere so that
measurements land on values related to the period. The same method finds
discrete logarithms, in ordinary numbers or on elliptic curves, so it
breaks Diffie–Hellman, DSA, ECDSA and EdDSA as well as RSA. Making the
keys bigger doesn't help; it only makes the quantum computer a little
bigger.

This program does the classical half of Shor's algorithm. It finds the
period the slow way, by trying every exponent, which is the step a quantum
computer would do quickly, then turns the period into factors. The last
line factors the toy RSA modulus from the
[public-key page](07-Public-Key.md#rsa).

```python
from math import gcd

def period(a, N):
    # The step a quantum computer does fast: the smallest r with a^r = 1 mod N.
    # Done here the slow way, by trying r = 1, 2, 3, ...
    r, x = 1, a % N
    while x != 1:
        x = x * a % N
        r += 1
    return r

for N, a in ((15, 7), (21, 2), (3233, 3)):
    r = period(a, N)
    half = pow(a, r // 2, N)                 # works when r is even and half != N - 1
    print(f"N={N} a={a}: period {r}, factors {gcd(half - 1, N)} x {gcd(half + 1, N)}")
```

Output:

```
N=15 a=7: period 4, factors 3 x 5
N=21 a=2: period 6, factors 7 x 3
N=3233 a=3: period 260, factors 61 x 53
```

For a 2048-bit RSA modulus the period has hundreds of digits and the slow
loop would never finish. That loop is the only part a quantum computer
replaces, and it is enough.

### Grover's algorithm, 1996

In 1996 Lov Grover, also at Bell Labs, found a quantum algorithm for
unstructured search: finding the one input out of *N* that passes some
test, such as the key that decrypts a message. A classical search needs
about *N*/2 tries on average; Grover's needs about √*N* steps.

This program simulates Grover's algorithm on a classical computer for 64
"boxes". Each step flips the sign of the right answer's amplitude, then
reflects every amplitude about the average, which slowly pumps
probability into the right answer.

```python
from math import pi, sqrt

N, target = 64, 42                        # 64 boxes; the key is in box 42
amp = [1 / sqrt(N)] * N                   # start in an even superposition

for step in range(1, 9):
    amp[target] = -amp[target]            # the oracle flips the sign of the answer
    mean = sum(amp) / N
    amp = [2 * mean - a for a in amp]     # "inversion about the mean"
    print(step, f"{amp[target] ** 2:.3f}")

print("best after about", round(pi / 4 * sqrt(N)), "steps; a classical search needs", N // 2, "on average")
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
best after about 6 steps; a classical search needs 32 on average
```

After six steps the right box comes up 99.7% of the time; keep going and
the probability falls again, which is why the number of steps has to be
right. Against a 128-bit key Grover's algorithm needs about 2⁶⁴ steps
instead of 2¹²⁸, but those steps must run one after another on a single
fault-tolerant machine, and splitting the work across *k* machines only
gains √*k*. So symmetric cryptography survives with, at most, longer
keys: AES-256 is comfortably safe, and NIST still counts AES-128 as
acceptable. The [Hard problems](../10-math-foundations/Hard-Problems.md#shor-and-grover)
page has the numbers.

## The machines

### Toy factorizations

The first quantum computations ran on molecules in nuclear magnetic
resonance machines in the late 1990s. In 2001 a team from IBM's Almaden
lab and Stanford, led by Isaac Chuang with Lieven Vandersypen as first
author, used seven nuclear spins in a specially made
molecule to "factor" 15 with Shor's algorithm, and in 2012 a photonic
experiment did 21. These were real experiments but not real factorizations:
to fit on the hardware, the circuits were simplified using knowledge of
the answer. In 2013 John Smolin, Graeme Smith and Alexander Vargo showed
that with such shortcuts one could "factor" enormous numbers with almost
no quantum hardware at all. As of October 2026 no quantum computer has run Shor's
algorithm, without shortcuts, on a number bigger than a classroom example.

### Bigger chips

Progress since has been steady and well publicized:

- **2019:** Google's 53-qubit Sycamore chip performed a random sampling
  task in about 200 seconds that Google estimated would take a
  supercomputer 10,000 years, and called it "quantum supremacy". IBM
  argued a classical computer could do it in days, and later classical
  simulations closed much of the gap.
- **2020–2023:** Chinese teams built photonic and superconducting
  machines (Jiuzhang, Zuchongzhi); IBM's Condor chip passed 1,000 qubits
  in 2023.
- **December 2024:** Google's 105-qubit Willow chip showed that its error
  rate *fell* as more qubits were used for error correction, crossing the
  "threshold" that makes large, reliable machines possible in principle.
- **2025–2026:** Microsoft announced a chip based on a new kind of
  topological qubit, a claim many physicists questioned. Several companies
  reported dozens of *logical qubits*, error-corrected qubits built from
  many physical ones, using different hardware and different definitions,
  so the numbers are hard to compare.

### How big must it be?

Raw qubit counts mislead, because qubits make errors. A useful machine
must combine many noisy physical qubits into each reliable logical one.
Estimates of what it would take to break real keys have fallen sharply:

| Year | Target | Estimate |
|---|---|---|
| 2019 | RSA-2048 | about 20 million noisy qubits, 8 hours (Gidney and Ekerå) |
| 2025 | RSA-2048 | under a million noisy qubits, under a week (Gidney) |
| 2026 | 256-bit elliptic curve (secp256k1) | about 1,200–1,450 logical qubits; under half a million physical qubits, minutes (Babbush and others, Google) |
| 2026 | 256-bit elliptic curve (P-256) | about 10,000–26,000 neutral-atom qubits, days (Cain and others, Caltech; a preprint) |

Each estimate assumes error rates of about one in a thousand per
operation and a full fault-tolerant design; the largest machines today
have about a hundred to a few thousand physical qubits. The gap is still
large, but it shrinks from both sides: hardware improves, and algorithms
need less of it. The newest estimates lean on newer error-correcting
codes and hardware that can move qubits around, and are not yet
validated: a February 2026 preprint from Iceberg Quantum claimed RSA-2048
might take under 100,000 physical qubits, and the Caltech preprint above
goes lower still. Google's team did not publish its elliptic-curve
circuits at all, to avoid handing out a blueprint; it backed its numbers
with a zero-knowledge proof covering the main subroutine, so outsiders
can check the claim without being able to rebuild the attack.

Nobody can say when, or whether, a *cryptographically relevant quantum
computer* will exist. The Global Risk Institute's yearly survey of
researchers finds a wide spread of opinion; its latest edition, published
in March 2026, puts the experts' combined estimate of the chance of one
within fifteen years at better than even. Google said in March 2026
that it aimed to finish its own post-quantum migration by 2029.

### Harvest now, decrypt later

The reason to act before the machine exists is simple. An adversary can
record encrypted traffic today and keep it. If a quantum computer arrives
in fifteen years, everything recorded with a classical key exchange can
be decrypted then. Data that must stay secret for longer than the time
left is already at risk.

Michele Mosca put it as an inequality: if *x* is how long your data must
stay secret, *y* how long it takes you to migrate, and *z* how long until a
quantum computer exists, you have a problem whenever *x* + *y* > *z*. For key
exchange the answer was clear: switch as soon as possible. For signatures
it is less urgent, since a forged signature only matters once the machine
exists, but long-lived devices and root keys have to be planned years
ahead.

## Algorithms a quantum computer can't break

### Older than they look

Every candidate for *post-quantum* cryptography rests on a problem for
which no efficient quantum algorithm is known. Several families go back
decades:

- **Error-correcting codes.** Robert McEliece's 1978 system hides a message
  as a code word with deliberate errors that only the key holder can
  remove. Its public keys are huge, which is why it waited forty years.
  See [code-based KEMs](../01-key-exchange/Code-Based-KEMs.md).
- **Hash functions.** Lamport and Merkle's 1979 signatures need nothing but
  a secure hash; see [stateful hash signatures](../02-signatures/Stateful-Hash-Signatures.md)
  and [SLH-DSA](../02-signatures/SLH-DSA.md).
- **Lattices.** A lattice is a regular grid of points in many dimensions,
  and finding the shortest vector in a high-dimensional one is hard. In
  1996 Miklós Ajtai showed that some random lattice problems are as hard as
  the worst cases, a rare guarantee. The same year Jeffrey Hoffstein, Jill
  Pipher and Joseph Silverman proposed the fast NTRU cryptosystem, and in
  2005 Oded Regev introduced *learning with errors* (LWE), which became
  the basis of most modern lattice schemes.
- **Multivariate equations** (from the late 1980s) and **isogenies** of
  elliptic curves (from the 2000s), both with smaller keys and both, as the
  competition showed, riskier.

### Learning with errors

LWE is simple to state. Given many equations of the form *a* · *s* = *b* mod
*q*, where *s* is secret, anyone can find *s* by ordinary linear algebra. Add
a small random error to each *b*, and the problem becomes, as far as anyone
knows, hard even for a quantum computer. The error is the whole point:
it hides *s*, but it is small enough that the key holder can round it away.

This toy encrypts single bits with Regev's scheme, using ML-KEM's modulus
3329 but a tiny dimension of 16 (ML-KEM works with 256 coefficients per
block, structured so the arithmetic is fast). A ciphertext decrypts to a
number near 0 for a 0 bit, or near *q*/2 for a 1 bit.

```python
import random

rng = random.Random(2024)           # fixed seed so the run repeats; real use needs secrets
q, n, m = 3329, 16, 32              # q is ML-KEM's modulus; real n is 256 per block, here 16

# Private key: a random vector s. Public key: m random rows a with
# b = a.s + e, where e is a small error. Without e this is just linear algebra.
s = [rng.randrange(q) for _ in range(n)]
rows = []
for _ in range(m):
    a = [rng.randrange(q) for _ in range(n)]
    e = rng.randint(-2, 2)
    rows.append((a, (sum(x * y for x, y in zip(a, s)) + e) % q))

def encrypt(bit):
    pick = [r for r in rows if rng.random() < 0.5]       # add up a random subset of rows
    u = [sum(a[i] for a, b in pick) % q for i in range(n)]
    v = (sum(b for a, b in pick) + bit * (q // 2)) % q   # hide the bit at 0 or q/2
    return u, v

def decrypt(u, v):
    d = (v - sum(x * y for x, y in zip(u, s))) % q       # = small noise, or q/2 + small noise
    return d, int(q // 4 < d < 3 * q // 4)

message = [0, 1, 1, 0, 1, 0, 0, 1]
results = [decrypt(*encrypt(bit)) for bit in message]
print([d for d, bit in results])
print([bit for d, bit in results] == message)
```

Output:

```
[2, 1663, 1662, 3321, 1665, 3322, 3327, 1666]
True
```

The values near 3329 are small negative noise (3321 is −8). A toy this
size is easy to break; the security comes from large dimensions and
carefully chosen noise. The [ML-KEM page](../01-key-exchange/ML-KEM.md)
describes the real scheme.

## The NIST competition, 2016–2024

### The call

In August 2015 NSA announced that it planned to move to quantum-resistant
algorithms, which surprised many observers, since in 2005 it had made
elliptic curves the centre of its Suite B. In 2016 NIST published a report
on the threat (NIST IR 8105) and, in December, a formal call for
proposals. NIST avoided calling it a competition, since it could pick
several winners, but it ran like the
[AES](08-Internet-Era.md#aes-a-cipher-chosen-in-public) and SHA-3
competitions: open submissions, public analysis, several rounds. It
asked for two kinds of algorithm: *key-encapsulation mechanisms* (KEMs) to
agree on keys, and digital signatures.

By the November 2017 deadline NIST had 82 submissions; 69 were complete
enough to enter the first round. Twenty-six went through to a second round
in January 2019, and in July 2020 NIST named seven finalists and eight
alternates.

### Two breaks

Two of the candidates fell in 2022, in ways that shaped the outcome.

- **Rainbow**, a multivariate signature scheme and a finalist, was broken
  by Ward Beullens of IBM Research in February 2022. His paper's title said
  it all: "Breaking Rainbow Takes a Weekend on a Laptop".
- **SIKE**, an isogeny-based KEM with very small keys, had reached the
  fourth round. In July 2022 Wouter Castryck and Thomas Decru of KU Leuven
  recovered a SIKEp434 key in about an hour on a single computer core
  (refined versions of the attack take minutes), using a
  piece of 1997 mathematics about curves of genus two that nobody had
  thought to apply.

Neither break affected lattices or hashes, but both were a reminder of
the lesson of [DES](06-Shannon-to-DES.md#des) and
[RSA-129](07-Public-Key.md#squeamish-ossifrage): newer assumptions need
more time under attack. NIST deliberately kept algorithms from different
families.

### The winners

On 5 July 2022 NIST announced its choices: **CRYSTALS-Kyber** for key
encapsulation, and **CRYSTALS-Dilithium**, **Falcon** and **SPHINCS+** for
signatures, with three code-based KEMs (BIKE, Classic McEliece, HQC) and
SIKE kept for a fourth round. Draft standards came out in August 2023, and
on 13 August 2024 NIST published the first three as final standards, with
new names:

| Standard | Name | Based on | What it does | Page |
|---|---|---|---|---|
| FIPS 203 | ML-KEM | Kyber (module lattices) | key encapsulation | [ML-KEM](../01-key-exchange/ML-KEM.md) |
| FIPS 204 | ML-DSA | Dilithium (module lattices) | signatures | [ML-DSA](../02-signatures/ML-DSA.md) |
| FIPS 205 | SLH-DSA | SPHINCS+ (hashes) | signatures, conservative and large | [SLH-DSA](../02-signatures/SLH-DSA.md) |
| FIPS 206 (pending) | FN-DSA | Falcon (NTRU lattices) | compact signatures | [FN-DSA](../02-signatures/FN-DSA.md) |

On 11 March 2025 NIST chose **HQC**, a code-based KEM, as a backup to
ML-KEM in case a breakthrough against lattices ever comes, over the
similar BIKE; it put Classic McEliece on hold until ISO finished its
version. Stateful hash-based signatures, LMS and XMSS, had
already been standardized in 2018–2020 for uses such as firmware signing.

### More signatures

Most of the new signatures are lattice-based, and they are large: an
ML-DSA-44 signature is 2,420 bytes, against 64 for Ed25519. In 2022 NIST
opened a separate call for additional signature schemes, ideally with
short signatures and not based on lattices. Forty entered the first round
in 2023 and fourteen the second in October 2024. On 14 May 2026 NIST
advanced nine to a third round expected to last about two years: FAEST,
HAWK, MAYO, MQOM, QR-UOV, SDitH, SNOVA, SQIsign and UOV. HAWK, the only
lattice scheme, was withdrawn in July 2026 after a key-recovery attack,
leaving eight: multivariate schemes, an isogeny scheme (SQIsign), a
code-based one (SDitH) and FAEST, built on AES and the "VOLE-in-the-head"
technique.

### Beyond NIST

Other countries ran their own processes. Germany's BSI and France's ANSSI
recommend using post-quantum algorithms only in *hybrid* combination with
classical ones for now (hash-based signatures excepted), and have backed
some extra algorithms such as FrodoKEM and Classic McEliece. ISO published
Classic McEliece in June 2026, and in October 2026 Germany's BSI advised
against it for new systems, because new cryptanalysis put the cost of
recovering its keys below the claimed security levels, though no
practical attack exists. South Korea
ran its own competition and chose four algorithms in 2025, and China
announced its own call in 2025.

## The move: hybrids

### Two locks instead of one

Switching the world's key exchange to a new, young algorithm is risky:
ML-KEM could turn out to have a flaw, as Rainbow and SIKE did. So the
first deployments were *hybrid*: run X25519 and ML-KEM side by side and
combine both shared secrets, so an attacker must break both. A flaw in
ML-KEM leaves you with today's security; a quantum computer leaves you
with ML-KEM's.

### Experiments

Google ran the first public test in 2016, adding the lattice scheme
NewHope next to X25519 in a test version of Chrome for a few months
(CECPQ1). In 2019 Google and Cloudflare tested two more hybrids: CECPQ2,
with the lattice scheme NTRU-HRSS, and CECPQ2b, with the isogeny scheme
SIKE. These experiments showed that the larger messages, up to a
kilobyte or more instead of 32 bytes, mostly worked, but also that some old network
equipment broke on unusually large handshakes.

### SSH first

The first widely used protocol to turn on post-quantum key exchange by
default was SSH. OpenSSH 9.0, in April 2022, made the hybrid
`sntrup761x25519-sha512` (Streamlined NTRU Prime with X25519) its default.
OpenSSH 9.9 (2024) added `mlkem768x25519-sha256`, 10.0 (April 2025) made it
the default, and 10.1 began warning users when a connection doesn't use a
post-quantum key exchange. The NTRU Prime hybrid was published as RFC 9941
in 2026, and the ML-KEM one as RFC 10042 in August 2026. See the [SSH page](../protocols/SSH.md).

### TLS and the web

Chrome turned on a hybrid of X25519 and a draft of Kyber for desktop users
in April 2024 and switched to the standardized **X25519MLKEM768** with
Chrome 131 in November 2024; Firefox enabled it in late 2024, and Apple's
iOS 26 and macOS 26 offered it by default from September 2025. OpenSSL 3.5
(April 2025) included ML-KEM, ML-DSA and SLH-DSA and put the hybrid first.
Cloudflare reported that about half of the human web traffic it handled
used post-quantum key exchange by late 2025, and about two-thirds by
spring 2026. The IETF published the TLS hybrids as RFC 10024 in August
2026. The [TLS 1.3 page](../protocols/TLS-1.3.md) shows a connection
using it.

### Messaging

Signal added **PQXDH** in September 2023, putting Kyber-1024 alongside
X25519 in the first key agreement of each conversation. Apple's iMessage
followed with **PQ3** in iOS 17.4 in March 2024. In October 2025 Signal
added **SPQR**, the Sparse Post-Quantum Ratchet, which mixes fresh ML-KEM
secrets into the ongoing ratchet so that a conversation recovers its
post-quantum security even after a compromise. See the
[Signal page](../protocols/Signal.md).

### Everything else

By 2026 post-quantum options had reached most of the protocols on this
site: [OpenPGP](../protocols/OpenPGP.md) and [S/MIME](../protocols/S-MIME.md)
gained ML-KEM and ML-DSA standards, [age](../protocols/age.md) a hybrid
recipient type, [JOSE](../protocols/JWT.md) ML-DSA, and
[IPsec](../protocols/IPsec.md) a way to add ML-KEM to its key exchange.
Certificates are the hard part. A TLS handshake carries several
signatures and public keys, and swapping each 64-byte signature for a
2,420-byte one adds many kilobytes, so public web certificates were still
RSA and ECDSA in October 2026. Chrome accepts ML-DSA only in private PKIs
so far and plans to bring post-quantum certificates to the public web
through *Merkle Tree Certificates*, an IETF draft that needs far fewer
signatures per handshake. See [PKI](../protocols/PKI.md).

## Deadlines

Governments have set dates, which differ in detail but agree in shape:
start now, finish around 2035.

- **United States, national security systems.** NSA's CNSA 2.0 suite
  (September 2022) requires ML-KEM-1024, ML-DSA-87, LMS or XMSS for
  firmware, AES-256 and SHA-384 or SHA-512, with most kinds of equipment
  expected to use them exclusively by 2030–2033 and the whole transition
  complete by 2035. A 2022 presidential memorandum (NSM-10) set the same
  2035 goal for the federal government, and an executive order in June
  2026 (EO 14412) set firmer dates for high-value federal systems:
  post-quantum key establishment by the end of 2030 and post-quantum
  signatures by the end of 2031.
- **NIST IR 8547.** NIST's transition plan, published as a draft in
  November 2024 and in final form in October 2026, deprecates every
  quantum-vulnerable public-key algorithm in its standards (RSA,
  finite-field and elliptic-curve Diffie–Hellman, ECDSA and EdDSA) after
  2030, at every key size, and disallows them after 2035. The draft had
  deprecated only the 112-bit sizes in 2030; the final version brings the
  stronger sizes forward too. Hybrids that include an approved
  post-quantum algorithm remain allowed.
- **Britain.** The National Cyber Security Centre's 2025 guidance asks
  organizations to plan by 2028, move their most important systems by
  2031 and finish by 2035.
- **European Union.** A coordinated roadmap from June 2025 asks member
  states to start by the end of 2026, protect high-risk systems by 2030,
  and finish as far as possible by 2035.

## Can these be broken today?

This page is the one where "today" and "tomorrow" differ. As of November
2026, no quantum computer can break anything in use; the question is what
a large one would do.

| Algorithm | Broken today? | With a large quantum computer |
|---|---|---|
| RSA, Diffie–Hellman, elliptic curves | no | Yes. Shor's algorithm finds the factors or the discrete logarithm directly. Estimates have fallen to under a million noisy qubits for RSA-2048 and under half a million for 256-bit curves, far beyond any machine built so far. Recorded traffic can be broken later, which is why the move is happening now. |
| AES-128, AES-256 | no | Grover's search halves the key's strength in bits, but its steps can't be spread over many machines the way classical ones can. AES-256 keeps a wide margin; NIST still counts AES-128 as safe. |
| SHA-256, SHA-3 | no | Grover helps only a little against preimages, and collisions barely at all. |
| Rainbow | yes, on a laptop | Beullens's 2022 attack recovers a key in about a weekend. |
| SIKE | yes, in minutes | Castryck and Decru's 2022 attack uses old mathematics on genus-two curves; no quantum computer needed. |
| ML-KEM, ML-DSA, FN-DSA | no | No known quantum or classical attack beyond the parameters' design margin. Lattice problems are younger than factoring, so the community keeps checking (see Chen's withdrawn 2024 claim). |
| SLH-DSA, LMS, XMSS | no | They rest only on hash functions, the most conservative choice. LMS and XMSS fail if a one-time key is ever used twice. |
| HQC, Classic McEliece | no | Code-based; McEliece's 1978 design has survived nearly fifty years. |
| Any of them in careless code | sometimes | Timing leaks like KyberSlash (2023–2024) recover keys from the code, not the mathematics. |

The Grover program above shows the square-root speedup on 64 boxes. Run
against a real key, it would need a fault-tolerant quantum computer, and
none exists yet.

## What is still open

As of October 2026:

- **When.** No one knows when a cryptographically relevant quantum computer
  will exist, and estimates of the resources it needs keep falling.
- **Standards still to come.** FIPS 206 (FN-DSA) has not been published,
  not even as a public draft; NIST previewed it in 2025 and announced a
  revised plan in September 2026. The HQC standard, expected as FIPS 207,
  is also still to come, with a final version planned for 2027. The
  additional-signature round will run until about 2028.
- **Confidence in lattices.** Lattice problems have been studied seriously
  for about thirty years, far less than factoring. In April 2024 Yilei
  Chen posted a paper claiming a quantum algorithm for LWE (for some
  parameter choices, not ML-KEM's); within about ten days other
  researchers found a bug that sank it. The episode showed
  both the worry and how fast the community checks.
- **Implementations.** As with every earlier algorithm, the code is weaker
  than the mathematics. In 2023–2024 the *KyberSlash* timing leaks, caused
  by a division whose duration depended on secret data, turned up in many
  Kyber libraries. Side-channel protection for ML-KEM and ML-DSA in small
  devices is still an active field.
- **Certificates and signatures** for the public web, and long-lived
  systems such as cars, satellites, smart cards and industrial controllers
  that must be designed today for the 2040s.
- **Disagreement over details**, such as whether to use hybrids forever or
  only for a while, and which backups (HQC, Classic McEliece, FrodoKEM) to
  support.
- **Everything outside the big protocols**: the inventory of systems,
  files and devices that still use RSA or elliptic curves somewhere, which
  is where most of the remaining work lies.

## The long view

Read the whole history and a pattern stands out. Caesar's shift, the
nomenclators, the "indecipherable" keyword cipher, Enigma, DES, MD5: each
was trusted until the day it was broken, and the people relying on it
usually found out last. The post-quantum migration is the first time the
world has set out to replace its main public-key algorithms *before* they
were broken, because the threat could be foreseen with mathematics. It is
also the largest test yet of the lessons on earlier pages: choose
algorithms in public, keep more than one family in reserve, assume the
enemy knows the system, and expect the implementation, not the
mathematics, to be where things go wrong.

## See also

- [ML-KEM](../01-key-exchange/ML-KEM.md), [ML-DSA](../02-signatures/ML-DSA.md),
  [SLH-DSA](../02-signatures/SLH-DSA.md), [FN-DSA](../02-signatures/FN-DSA.md),
  [code-based KEMs](../01-key-exchange/Code-Based-KEMs.md),
  [NTRU Prime](../01-key-exchange/NTRU-Prime.md): the new algorithms
- [Hard problems](../10-math-foundations/Hard-Problems.md): what each one
  rests on, and what Shor and Grover do to them
- [Main table](../index.md): every algorithm's status, including the NIST
  IR 8547 dates
- [History overview](index.md): the whole timeline

## References

- Richard P. Feynman, "Simulating Physics with Computers", *International Journal of Theoretical Physics* 21 (1982) / David Deutsch, "Quantum Theory, the Church–Turing Principle and the Universal Quantum Computer", *Proceedings of the Royal Society A* 400 (1985)
- Peter W. Shor, "Algorithms for Quantum Computation: Discrete Logarithms and Factoring" (FOCS 1994) and "Polynomial-Time Algorithms for Prime Factorization and Discrete Logarithms on a Quantum Computer", *SIAM Journal on Computing* 26, no. 5 (1997) / Lov K. Grover, "A Fast Quantum Mechanical Algorithm for Database Search" (STOC 1996)
- Lieven M. K. Vandersypen et al., "Experimental Realization of Shor's Quantum Factoring Algorithm Using Nuclear Magnetic Resonance", *Nature* 414 (2001) / John A. Smolin, Graeme Smith and Alexander Vargo, "Oversimplifying Quantum Factoring", *Nature* 499 (2013)
- Frank Arute et al., "Quantum Supremacy Using a Programmable Superconducting Processor", *Nature* 574 (2019) / Google Quantum AI, "Quantum Error Correction below the Surface Code Threshold", *Nature* 638 (2025)
- Craig Gidney and Martin Ekerå, "How to Factor 2048 Bit RSA Integers in 8 Hours Using 20 Million Noisy Qubits", *Quantum* 5 (2021; preprint 2019) / [Craig Gidney, "How to Factor 2048 Bit RSA Integers with Less than a Million Noisy Qubits" (2025)](https://arxiv.org/abs/2505.15917) / [Babbush et al., "Securing Elliptic Curve Cryptocurrencies against Quantum Vulnerabilities: Resource Estimates and Mitigations" (2026)](https://arxiv.org/abs/2603.28846) / Cain et al. (arXiv 2603.28627, 2026) / Iceberg Quantum (arXiv 2602.11457, 2026)
- Michele Mosca, "Cybersecurity in an Era with Quantum Computers: Will We Be Ready?", *IEEE Security & Privacy* 16, no. 5 (2018)
- Miklós Ajtai, "Generating Hard Instances of Lattice Problems" (STOC 1996) / Jeffrey Hoffstein, Jill Pipher and Joseph H. Silverman, "NTRU: A Ring-Based Public Key Cryptosystem" (ANTS 1998) / Oded Regev, "On Lattices, Learning with Errors, Random Linear Codes, and Cryptography" (STOC 2005; *Journal of the ACM* 56, 2009)
- NIST IR 8105, *Report on Post-Quantum Cryptography* (2016) / NIST IR 8413, *Status Report on the Third Round* (2022) / NIST IR 8545, *Status Report on the Fourth Round* (2025) / NIST IR 8610, *Status Report on the Second Round of the Additional Digital Signature Schemes* (2026)
- [FIPS 203](https://csrc.nist.gov/pubs/fips/203/final), [FIPS 204](https://csrc.nist.gov/pubs/fips/204/final), [FIPS 205](https://csrc.nist.gov/pubs/fips/205/final) (August 2024) / [NIST IR 8547](https://csrc.nist.gov/pubs/ir/8547/final), *Transition to Post-Quantum Cryptography Standards* (draft November 2024; final October 2026)
- Ward Beullens, "Breaking Rainbow Takes a Weekend on a Laptop" (CRYPTO 2022) / Wouter Castryck and Thomas Decru, "An Efficient Key Recovery Attack on SIDH" (EUROCRYPT 2023)
- Joppe Bos et al., "CRYSTALS-Kyber: A CCA-Secure Module-Lattice-Based KEM" (EuroS&P 2018) / Daniel J. Bernstein et al., "KyberSlash: Exploiting Secret-Dependent Division Timings in Kyber Implementations" (2024) / Yilei Chen, "Quantum Algorithms for Lattice Problems" (IACR ePrint 2024/555, withdrawn claim)
- [OpenSSH release notes](https://www.openssh.com/releasenotes.html) (9.0, 9.9, 10.0, 10.1) and [OpenSSH post-quantum page](https://www.openssh.com/pq.html) / Signal, *The PQXDH Key Agreement Protocol* (2023) and "Signal Protocol and Post-Quantum Ratchets" (October 2025) / Apple Security Research, "iMessage with PQ3" (February 2024) / Apple, "Prepare your network for quantum-secure encryption in TLS" (2025)
- NSA, *Announcing the Commercial National Security Algorithm Suite 2.0* (September 2022) / White House, National Security Memorandum 10 (May 2022) / NCSC, *Timelines for Migration to Post-Quantum Cryptography* (March 2025) / *A Coordinated Implementation Roadmap for the Transition to Post-Quantum Cryptography* (EU NIS Cooperation Group, June 2025)

*Weaker sources:* the October 2026 final version of NIST IR 8547 (NIST's news release of 27 October 2026) and its change from the draft, known from secondary reports and this site's main table because nist.gov was unreachable from here; Executive Order 14412 and its 2030 and 2031 dates, from search summaries of the White House and Federal Register texts; the status of FIPS 206 and FIPS 207, from this site's FN-DSA and code-based KEM pages and from news reports; the May 2026 third-round list and HAWK's July 2026 withdrawal, from news summaries of NIST IR 8610 and the pqc-forum; the details of Babbush et al., Cain et al. and Iceberg Quantum's 2026 preprints, from news coverage and search summaries; the Global Risk Institute's March 2026 survey figure; Google's 2029 migration target (Google blog, March 2026); Cloudflare's adoption figures, from its blog as summarized in the press; the 2025–2026 logical-qubit counts, which come from company announcements; the Korean and Chinese processes; the browser and Apple release dates for hybrid ML-KEM, from vendor documentation summarized by search.
