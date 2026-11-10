# 2. Security Levels and How They Are Measured

*"128-bit security" was once a simple promise: the best attack costs about as much as
trying $2^{128}$ keys. Post-quantum cryptography broke that simplicity. The new schemes
are attacked by lattice reduction, information set decoding and algebra, none of which
is a key search, and the attacker may own a quantum computer. This chapter explains how
cryptographers compare such different attacks: bit security, NIST's five categories,
the depth limit called MAXDEPTH, and the "core-SVP" yardstick for lattices. You will
estimate the strength of RSA from the number field sieve, compute the block size of a
lattice attack on ML-KEM and see it land on the published numbers, rebuild NIST's
$2^{143}$ from the gates of one AES circuit, price a sieve's memory three ways, and learn
which level to choose and why, down to an archive that must stay secret for fifty years.*

!!! abstract "In this chapter"
    **You will learn:**

    - what "$k$ bits of security" means, and how it is computed for RSA, elliptic curves
      and symmetric ciphers;
    - NIST's five security categories and the attacks they are pegged to;
    - why the categories limit the depth of a quantum circuit, and what MAXDEPTH does to
      Grover's algorithm;
    - how lattice schemes are measured with BKZ block size and core-SVP, with a working
      estimate for ML-KEM;
    - why memory, multiple targets and tightness change the numbers;
    - which parameter set of each standard sits in which category, and how to choose;
    - where NIST's $2^{143}$ comes from, gate by gate, and why Grover's algorithm spread
      over many machines gains only the square root of their number;
    - how the argument over ML-KEM-512's category ran from 2020 to 2023, in numbers;
    - how margins have shrunk in the past, from DES to SIKE, and how to pick a level for
      an archive that must stay secret for fifty years.

    **You need:** [Chapter 1](01-The-Quantum-Threat-Measured.md); logarithms base 2; the
    idea of a lattice from book 1's [Chapter 21](../../book/21-Lattice-Cryptography.md)
    (this chapter uses only the picture, Chapter 6 does the details).

    **Levels:** §2.1 to §2.3 are for beginners, §2.4 to §2.13 are intermediate, §2.14 is
    expert.

## 2.1 The problem

*Level: beginner.*

In December 2016 NIST asked the world for new public-key algorithms. Within a year it
had 82 submissions, of which 69 met the requirements and entered the first round. They
were a zoo. Some were built on lattices, some on error-correcting codes, some on systems
of polynomial equations, some on hash functions, one on elliptic-curve isogenies. Their
keys ranged from a few hundred bytes to more than a megabyte. Each came with a claim of
strength, computed by its authors in their own way.

To choose among them NIST needed a common scale. It could not ask for "128 bits of
security" in the old sense, because for most of the candidates nobody could say exactly
how many operations the best attack takes. Lattice attacks, for instance, involve
algorithms whose running time is known only up to factors that change with every new
paper. And the attacker of the future might run some steps on a quantum computer, where
the cost of an operation is different again.

NIST's answer, written into the 2016 call, was clever in its modesty. Instead of
defining security in bits, it defined five **categories** by comparison with problems
everybody understands: a key search on AES and a collision search on SHA-2. A scheme is
in category 1 if breaking it is at least as hard as finding an AES-128 key, by any
method, classical or quantum. Whatever new attack appears, the question becomes "is it
cheaper than attacking AES-128?", and that question can be argued about in a common
language.

This chapter teaches that language. It is needed for the rest of the book, because
every parameter set of every scheme is described by its category, and every attack
paper says which category it threatens.

## 2.2 Bit security, the classical way

*Level: beginner.*

**The definition.** A scheme has **$k$ bits of security** if the best known attack needs
about $2^k$ basic operations to succeed. For a block cipher with a $k$-bit key and no
weakness, the best attack is trying keys, and the cost is $2^k$ cipher evaluations (on
average $2^{k-1}$, but the factor of two is ignored). That is the anchor: everything else
is described as "as hard as a $k$-bit key search".

**Why bits.** Each added bit doubles the work. Forty bits was a weekend for one
computer in the 1990s. Fifty-six bits fell to a \$250,000 machine in 1998 (book 1,
[Chapter 6](../../book/06-Block-Ciphers.md)). Eighty bits, about $10^{24}$ operations,
is beyond any single organization today but within sight of a planet's worth of
hardware working for years. One hundred and twenty-eight bits is about $3.4 \times
10^{38}$ operations; if every one of ten billion computers tried a billion keys per
second, the search would take about a trillion years. Above 128 bits, the numbers stop
meaning anything physical.

**Hashes.** For an $n$-bit hash, finding a preimage costs about $2^n$ evaluations, and
finding a collision about $2^{n/2}$ by the birthday bound. So SHA-256 offers 256-bit
preimage resistance and 128-bit collision resistance, and SHA-384 192-bit collision
resistance.

**RSA.** The best classical attack on RSA is the general number field sieve (NFS),
which factors an integer $N$ in heuristic time

$$L_N\left[\tfrac13, \sqrt[3]{64/9}\right] = \exp\left((1.923 + o(1))\,(\ln N)^{1/3}(\ln\ln N)^{2/3}\right).$$

The $o(1)$ is a term that shrinks as $N$ grows but is not known exactly, so the formula
gives the shape of the cost, not its value. Practitioners take $o(1) = 0$ and calibrate
against a real record. The largest RSA challenge numbers factored are RSA-768 in 2009,
which took about 2,000 years of a single 2.2 GHz processor core, about $2^{67}$
operations, and RSA-250 (829 bits) in 2020.

**Code it.** The program computes the raw NFS cost for common RSA sizes, then shifts all
of them by the same amount so that RSA-768 costs $2^{67}$, and prints NIST's own
equivalences from SP 800-57 beside them.

```python
from math import log, exp

def nfs_bits(modulus_bits):
    """log2 of the number field sieve's heuristic cost L[1/3, 1.923], o(1) taken as 0."""
    ln_n = modulus_bits * log(2)
    return 1.923 * ln_n ** (1 / 3) * log(ln_n) ** (2 / 3) / log(2)

offset = nfs_bits(768) - 67      # calibrate: RSA-768 took about 2^67 operations
for bits, table in [(768, None), (1024, 80), (2048, 112), (3072, 128), (7680, 192), (15360, 256)]:
    raw = nfs_bits(bits)
    print("RSA-%-5d raw 2^%.0f  calibrated 2^%.0f  SP 800-57 says %s"
          % (bits, raw, raw - offset, table if table else "-"))
```

Running it prints:

```
RSA-768   raw 2^77  calibrated 2^67  SP 800-57 says -
RSA-1024  raw 2^87  calibrated 2^77  SP 800-57 says 80
RSA-2048  raw 2^117  calibrated 2^107  SP 800-57 says 112
RSA-3072  raw 2^139  calibrated 2^129  SP 800-57 says 128
RSA-7680  raw 2^203  calibrated 2^194  SP 800-57 says 192
RSA-15360 raw 2^269  calibrated 2^260  SP 800-57 says 256
```

The two columns agree within a few bits. That is as good as bit security ever gets for
a scheme whose best attack is not a plain search: an estimate with error bars of a few
bits, refined by experiments on smaller sizes. Keep that in mind when a lattice scheme
is said to have "143 bits": the number is a model, and the model has error bars too.

**Elliptic curves.** The best attack on a well-chosen elliptic curve is Pollard's rho,
which takes about $\sqrt{\pi n / 4}$ group operations for a group of order $n$. A 256-bit
curve therefore offers about 128 bits of security, which is why P-256 and Curve25519 are
the 128-bit choices and P-384 the 192-bit one.

**Code it: Pollard's rho.** The square root in the elliptic-curve figure comes from a
random walk. Rho walks through group elements of the form $g^a h^b$, each step
determined by the current element, until the walk meets itself; a meeting
$g^{a_1}h^{b_1} = g^{a_2}h^{b_2}$ gives $\log_g h = (a_2 - a_1)/(b_1 - b_2) \bmod n$. By the
birthday bound the meeting comes after about $\sqrt{\pi n/4}$ steps. The program runs rho
in prime-order subgroups of $\mathbb{Z}_p^*$ of growing size and counts the steps; the same
walk on an elliptic curve group is the best known classical attack on P-256.

```python
import random
from math import sqrt

def rho_log(g, h, p, n, seed=1):
    """Pollard's rho for log_g(h) in the subgroup of order n (prime) mod p; counts steps."""
    rnd = random.Random(seed)
    def step(x, a, b):
        s = x % 3
        if s == 0:
            return x * x % p, 2 * a % n, 2 * b % n
        if s == 1:
            return x * g % p, (a + 1) % n, b
        return x * h % p, a, (b + 1) % n
    while True:
        a0, b0 = rnd.randrange(n), rnd.randrange(n)
        x = pow(g, a0, p) * pow(h, b0, p) % p
        tort, hare = (x, a0, b0), step(x, a0, b0)
        steps = 1
        while tort[0] != hare[0]:
            tort = step(*tort)
            hare = step(*step(*hare))
            steps += 1
        (_, a1, b1), (_, a2, b2) = tort, hare
        if (b1 - b2) % n:
            return (a2 - a1) * pow(b1 - b2, -1, n) % n, steps

def subgroup(bits, seed):
    """A prime p = 2n + 1 with n prime; 4 generates the subgroup of order n."""
    rnd = random.Random(seed)
    def prime(m):
        return m > 1 and all(m % d for d in range(2, int(sqrt(m)) + 1))
    while True:
        n = rnd.randrange(2 ** (bits - 1), 2 ** bits) | 1
        if prime(n) and prime(2 * n + 1):
            return 2 * n + 1, n, 4

for bits in (16, 20, 24, 28):
    p, n, g = subgroup(bits, seed=bits)
    secret = 12345 % n
    k, steps = rho_log(g, pow(g, secret, p), p, n)
    print("order ~2^%d: found %s in %6d steps; sqrt(pi*n/4) = %6.0f"
          % (bits, k == secret, steps, sqrt(3.14159 * n / 4)))
```

Running it prints:

```
order ~2^16: found True in    156 steps; sqrt(pi*n/4) =    182
order ~2^20: found True in    588 steps; sqrt(pi*n/4) =    788
order ~2^24: found True in   2215 steps; sqrt(pi*n/4) =   3012
order ~2^28: found True in  10845 steps; sqrt(pi*n/4) =  12957
```

Each four extra bits of group order multiply the work by about four, the square root of
sixteen. For a 256-bit group the walk takes about $2^{128}$ steps, and that is the whole
argument behind "a 256-bit curve gives 128-bit security". It is also why Shor's algorithm
is such a shock: it replaces this exponential walk by a polynomial computation.

**Bits are not all the same.** "Operations" hide differences. An AES evaluation is a few
hundred bit operations; a step of the NFS linear algebra moves data across a cluster; a
step of a lattice sieve touches a huge table in memory. Two attacks with the same
exponent may differ in real cost by factors of a thousand. For most purposes this does
not matter, because a factor of a thousand is ten bits and security margins are larger.
For post-quantum schemes, where some attacks need astronomical memory, it can matter a
great deal (§2.7).

**Where key-size advice comes from.** Tables like SP 800-57's have a history. In 1996
seven cryptographers, among them Matt Blaze, Whitfield Diffie, Ronald Rivest and Bruce
Schneier, wrote a short report for a group of US businesses arguing that 56-bit keys were
already too short and that 75 bits was the minimum, 90 bits for twenty years of
protection. In 2001 Arjen Lenstra and Eric Verheul published "Selecting Cryptographic Key
Sizes", which modeled the growth of computing power and of factoring algorithms and
turned them into tables for every year up to 2050; it remains the model for much later
advice. Europe's ECRYPT networks published yearly key-size reports from 2004, Germany's
BSI and France's ANSSI publish their own, and the website keylength.com, kept by Damien
Giry, puts them side by side. They disagree by a few bits at each level and agree on the
shape: about 3,072-bit RSA or a 256-bit curve for 128-bit security, AES-128 or more,
hashes of 256 bits or more.

Post-quantum tables inherit that method. They start from the best known attacks, model
their costs, add a margin, and are revised when attacks improve. What is new is that the
attacks themselves are less settled, so the margin has to be larger, and that two kinds of
computer must be priced at once.

## 2.3 NIST's five categories

*Level: beginner.*

NIST's 2016 call defined five security categories, each by a reference attack on a
symmetric primitive. A scheme belongs to a category if every attack on it, classical or
quantum, needs at least as many resources as the reference attack.

| Category | At least as hard as | Classical gates | Quantum gates |
| --- | --- | --- | --- |
| 1 | key search on AES-128 | $2^{143}$ | $2^{170}/\text{MAXDEPTH}$, revised to $2^{157}/\text{MAXDEPTH}$ |
| 2 | collision search on SHA-256 | $2^{146}$ | no quantum advantage counted |
| 3 | key search on AES-192 | $2^{207}$ | $2^{233}/\text{MAXDEPTH}$, revised to $2^{221}/\text{MAXDEPTH}$ |
| 4 | collision search on SHA-384 | $2^{210}$ | no quantum advantage counted |
| 5 | key search on AES-256 | $2^{272}$ | $2^{298}/\text{MAXDEPTH}$, revised to $2^{285}/\text{MAXDEPTH}$ |

*Table 2.1. NIST's security categories. The gate counts are NIST's estimates of the cost
of the reference attack; the revised quantum figures follow Jaques, Naehrig, Roetteler
and Virdia (2020).*

Four features of the table deserve a comment.

**Gates, not operations.** NIST counts **gates**: elementary logic operations in a
circuit. One AES-128 evaluation is about $2^{15}$ to $2^{16}$ gates, so $2^{128}$ keys
times $2^{15}$ gates gives the $2^{143}$ of the first row. Counting gates lets a lattice
attack, a decoding attack and a key search be compared in one unit.

**The odd categories are key searches, the even ones collisions.** Categories 2 and 4
were added because hash-based and some other schemes are naturally limited by collision
resistance. In the classical column they sit just above 1 and 3. Against quantum
attackers NIST judged that no collision algorithm beats the classical one once memory is
paid for (Chapter 1, §1.4), so categories 2 and 4 count only classical gates.

**The quantum column divides by MAXDEPTH.** That is the subject of the next section, and
the reason the quantum figures are written as fractions.

**The categories are floors, not targets.** A scheme in category 3 may well be much
stronger than AES-192. The category says only that, as far as anyone can tell, it is not
weaker. Parameter sets were chosen with margins because estimates move, usually
downward.

Most of the new standards aim at categories 1, 3 and 5, giving a small, a medium and a
large parameter set. ML-DSA's smallest set is category 2, because its natural sizes fell
there. Figure 2.1 shows the ladder.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="NIST's five security categories as a ladder, from AES-128 key search at the bottom to AES-256 key search at the top, with the standard parameter sets placed on each rung" fill="currentColor" font-size="14">
<rect x="20" y="236" width="180" height="40" rx="6" class="soft" stroke="currentColor"/>
<text x="110" y="261" text-anchor="middle" font-weight="bold">1 · AES-128 key</text>
<rect x="20" y="186" width="180" height="40" rx="6" class="soft" stroke="currentColor"/>
<text x="110" y="211" text-anchor="middle" font-weight="bold">2 · SHA-256 collision</text>
<rect x="20" y="136" width="180" height="40" rx="6" class="soft-acc" stroke="currentColor"/>
<text x="110" y="161" text-anchor="middle" font-weight="bold">3 · AES-192 key</text>
<rect x="20" y="86" width="180" height="40" rx="6" class="soft" stroke="currentColor"/>
<text x="110" y="111" text-anchor="middle" font-weight="bold">4 · SHA-384 collision</text>
<rect x="20" y="36" width="180" height="40" rx="6" class="soft" stroke="currentColor"/>
<text x="110" y="61" text-anchor="middle" font-weight="bold">5 · AES-256 key</text>
<text x="220" y="261">ML-KEM-512, SLH-DSA-128s/f, FN-DSA-512, HQC-128</text>
<text x="220" y="211">ML-DSA-44</text>
<text x="220" y="161">ML-KEM-768, ML-DSA-65, SLH-DSA-192s/f, HQC-192</text>
<text x="220" y="111">(few schemes aim here)</text>
<text x="220" y="61">ML-KEM-1024, ML-DSA-87, SLH-DSA-256s/f, FN-DSA-1024</text>
<text x="20" y="22" font-size="12">stronger ↑</text>
</svg>
<figcaption>Figure 2.1. The five categories and where the standard parameter sets sit. Category 3, in accent, is NIST's recommended default for ML-KEM; most deployments use ML-KEM-768.</figcaption>
</figure>

### Where $2^{143}$ comes from, by hand

The classical column is the gate count of a real circuit, worth rebuilding once. An AES-128 encryption has ten rounds. In each, the 16 bytes of the state pass through the
S-box, and the key schedule sends 4 more bytes through it, so one encryption makes
$10 \times 16 + 10 \times 4 = 200$ S-box evaluations. The S-box is an inversion in
$\mathrm{GF}(2^8)$ followed by an affine map, and the small circuits for it found by Joan
Boyar and René Peralta in 2010 use about 115 two-input gates; later circuits shave off a
few. MixColumns multiplies each four-byte column by a fixed matrix; the best published
circuits use 92 to 97 XOR gates per column, four columns, in nine of the ten rounds.
AddRoundKey is 128 XORs, done eleven times, and the key schedule adds about 128 XORs per
round. Adding up:

$$200 \times 115 + 36 \times 97 + 11 \times 128 + 10 \times 128 = 23{,}000 + 3{,}492 + 1{,}408 + 1{,}280 = 29{,}180 \approx 2^{14.8}.$$

Trying all $2^{128}$ keys therefore costs $2^{128} \times 2^{14.8} = 2^{142.8}$ gates, which
NIST rounds to $2^{143}$. Checking the rare false match on a second plaintext block costs
nothing that shows in the exponent.

**Code it.** The same tally as a program, so the parts can be changed.

```python
from math import log2

SBOX = 115            # gates in one AES S-box circuit (Boyar and Peralta, 2010)
MIXCOL = 97           # XOR gates in one MixColumns column (Kranz and others, 2017)
parts = [("S-boxes in the rounds, 10 x 16", 10 * 16 * SBOX),
         ("S-boxes in the key schedule, 10 x 4", 10 * 4 * SBOX),
         ("MixColumns, 9 rounds x 4 columns", 9 * 4 * MIXCOL),
         ("AddRoundKey, 11 x 128 XORs", 11 * 128),
         ("key schedule XORs, 10 x 128", 10 * 128)]
total = sum(g for _, g in parts)
for name, g in parts:
    print("%-36s %6d" % (name, g))
print("%-36s %6d gates = 2^%.1f" % ("one AES-128 encryption", total, log2(total)))
print("all 2^128 keys: 2^%.1f gates" % (128 + log2(total)))
```

It prints:

```text
S-boxes in the rounds, 10 x 16        18400
S-boxes in the key schedule, 10 x 4    4600
MixColumns, 9 rounds x 4 columns       3492
AddRoundKey, 11 x 128 XORs             1408
key schedule XORs, 10 x 128            1280
one AES-128 encryption                29180 gates = 2^14.8
all 2^128 keys: 2^142.8 gates
```

The S-boxes are four fifths of the circuit, yet doubling the S-box to 230 gates only lifts
the total to about $2^{143.7}$; halving it gives about $2^{142.1}$.

### What $2^{143}$ gates means

The largest sustained computation on Earth is the Bitcoin network, which first passed
$10^{21}$ hashes per second, one zettahash, in 2025. That is about $2^{70}$ hashes a
second and $2^{95}$ a year. If every hash were instead an AES-128 trial (generous, since a
double SHA-256 costs several times more gates), then $2^{128}$ keys take $2^{128}/10^{21} \approx 3.4 \times
10^{17}$ seconds, about ten billion years, most of the age of the universe. The same
machinery would search DES's $2^{56}$ keys in under a tenth of a millisecond.

So category 1 is not a weak level. Interest in the higher categories is about margin: what
happens if an estimate turns out wrong (§2.12), and what data that must stay secret for a
lifetime needs (§2.13).

### Lattices against the classical column

Grover's algorithm gives a full square-root speed-up against AES, while the known quantum speed-ups for lattice sieving are far
smaller and need quantum memory that may never exist (§2.14). So for a lattice scheme the
quantum column of category 1, $2^{157}/\text{MAXDEPTH}$, is the easy bar to clear; the hard
one is the classical $2^{143}$. NIST said so explicitly in its December 2023 note on
Kyber-512, which is why §2.5 and §2.7 are about classical gates and classical memory.

## 2.4 MAXDEPTH: why Grover is weaker than it looks

*Level: intermediate.*

Chapter 1 showed that Grover's iterations run one after another. NIST turned that
observation into a rule. The attacker is assumed to be limited to quantum circuits of
depth at most **MAXDEPTH**, the number of gates that can be done in a row, and the 2016
call gave three plausible values:

- $2^{40}$ logical gates, roughly what the quantum architectures foreseen then were
  expected to do in a row in a year;
- $2^{64}$, roughly what classical computer chips can do in a row in a decade;
- $2^{96}$, roughly what atomic-scale qubits, with signals crossing them at the speed of
  light, could do in a thousand years.

**Why depth turns into total cost.** Suppose a Grover search over $N = 2^{128}$ keys
needs about $2^{64}$ iterations and each iteration is an AES circuit of depth $D$ and
width $W$ gates. If $2^{64} \cdot D$ exceeds MAXDEPTH, the attacker must split the key
space into $S$ pieces and search each on a separate machine. Each piece has $N/S$ keys and
needs $\sqrt{N/S}$ iterations, so the depth condition is

$$\sqrt{N/S}\cdot D \le \text{MAXDEPTH}, \qquad\text{so}\qquad S \ge \frac{N D^2}{\text{MAXDEPTH}^2}.$$

The total number of gates over all machines is

$$S \cdot \sqrt{N/S} \cdot D W = \sqrt{S N}\, D W \ge \frac{N D^2 W}{\text{MAXDEPTH}}.$$

The total cost is inversely proportional to MAXDEPTH, which is why NIST writes the
quantum column as "something over MAXDEPTH". With a short depth limit the quantum
attacker must buy enormous parallelism, and the square-root speed-up mostly vanishes.

**By hand.** Take the revised category 1 figure, $2^{157}/\text{MAXDEPTH}$. With
$\text{MAXDEPTH} = 2^{40}$ the quantum search costs $2^{117}$ gates; with $2^{64}$ it costs
$2^{93}$. Compare the classical $2^{143}$. Counted in gates, the quantum search is the
cheaper one whenever MAXDEPTH is above $2^{157-143} = 2^{14}$, which any useful machine
is. What keeps AES-128 standing is what a gate count leaves out: each quantum gate is an
error-corrected logical operation that costs thousands of physical operations and takes
microseconds where a classical gate takes picoseconds, and a short depth limit forces the
attacker to build an absurd number of machines.

The formula also has a floor. It holds only while the search must be split, that is
while MAXDEPTH is less than the depth of one whole Grover search, about $2^{64}$
iterations times the depth of an AES circuit. A deeper allowance than that buys nothing:
the cost stays at one unsplit search, $2^{64}$ iterations of at least $2^{15}$ gates each,
about $2^{79}$ gates. So at $\text{MAXDEPTH} = 2^{96}$ the figure is about $2^{79}$, not the
$2^{61}$ the bare formula would give.

**Code it.** The program below shows the trade-off for a toy key search, splitting the
work as the formula says and comparing total cost with a classical search.

```python
from math import log2, sqrt

def quantum_search_cost(key_bits, depth_per_iter, width, maxdepth):
    """Total gates for a depth-limited Grover search, split over S machines."""
    n = 2.0 ** key_bits
    iters_single = sqrt(n)
    if iters_single * depth_per_iter <= maxdepth:
        s = 1.0
    else:
        s = n * depth_per_iter ** 2 / maxdepth ** 2
    iters = sqrt(n / s)
    return s, s * iters * depth_per_iter * width

D, W = 2 ** 12, 2 ** 10            # an AES-like circuit: depth 4096, width 1024
classical = 2 ** 128 * D * W / 2 ** 5    # classical AES is far shallower per gate
print("classical search: 2^%.0f gates" % log2(classical))
for md in (40, 64, 96):
    s, total = quantum_search_cost(128, D, W, 2.0 ** md)
    print("MAXDEPTH 2^%d: machines 2^%.0f, total 2^%.0f gates"
          % (md, log2(s), log2(total)))
```

Running it prints:

```
classical search: 2^145 gates
MAXDEPTH 2^40: machines 2^72, total 2^122 gates
MAXDEPTH 2^64: machines 2^24, total 2^98 gates
MAXDEPTH 2^96: machines 2^0, total 2^86 gates
```

With a one-year depth limit, the quantum attacker needs $2^{72}$ quantum computers
working in parallel to search a 128-bit key. Nobody will ever build $2^{72}$ of
anything. The figures are toys, but the shape is NIST's.

### Why Grover parallelizes badly, by hand

Take $N = 2^{128}$ keys and $P = 2^{20}$ machines, about a million. Classically, each
machine takes $2^{108}$ keys and the job finishes $2^{20}$ times sooner, with the same total
work. With Grover, each machine needs $\sqrt{2^{108}} = 2^{54}$ iterations, so the job
finishes only $2^{64}/2^{54} = 2^{10}$ times sooner, and the total work grows from $2^{64}$
to $2^{20} \cdot 2^{54} = 2^{74}$. A million machines bought a thousandfold speed-up and
a thousandfold increase in work. In general, $P$ machines give
a speed-up of only $\sqrt P$, and the total work is $P\sqrt{N/P} = \sqrt{NP}$.

An attacker with a deadline sees it from the other side. Suppose no machine may run more
than $T$ steps in a row. Classically that takes $N/T$ machines. With Grover, each machine
can cover $T^2$ keys in its $T$ iterations, so it takes $N/T^2$ machines and $N/T$
iterations in all. With $T = 2^{40}$: classically $2^{88}$ machines; with Grover $2^{48}$
machines, about 280 trillion quantum computers, running $2^{88}$ iterations between them.
The quantum attacker still does $2^{40}$ times less work, but each unit of it is a
reversible AES circuit on an error-corrected machine.

**Code it.** The program works in base-2 logarithms throughout, first for a fixed number of
machines, then for a fixed deadline. It ignores the depth $D$ of one iteration, which only
shifts every line by the same amount.

```python
# Everything in log2: a search over N = 2^128 keys split across P = 2^p machines.
print("machines  classical each/total  Grover each/total")
for p in (0, 20, 40, 64, 88, 128):
    c_each, c_total = 128 - p, 128            # N/P steps each, N in all
    g_each = (128 - p) / 2                    # sqrt(N/P) iterations each
    g_total = g_each + p                      # P * sqrt(N/P) = sqrt(N*P)
    print("2^%-3d       2^%-3d / 2^%d          2^%-3.0f / 2^%.0f" % (p, c_each, c_total, g_each, g_total))

print()
for depth in (40, 64, 96):                    # the deadline, in sequential steps
    p_c = 128 - depth                         # classical: N/T machines
    p_g = max(0, 128 - 2 * depth)             # Grover: N/T^2 machines
    print("deadline 2^%d steps: classical 2^%d machines, Grover 2^%d machines, 2^%d iterations in all"
          % (depth, p_c, p_g, p_g + min(depth, 64)))
```

It prints:

```text
machines  classical each/total  Grover each/total
2^0         2^128 / 2^128          2^64  / 2^64
2^20        2^108 / 2^128          2^54  / 2^74
2^40        2^88  / 2^128          2^44  / 2^84
2^64        2^64  / 2^128          2^32  / 2^96
2^88        2^40  / 2^128          2^20  / 2^108
2^128       2^0   / 2^128          2^0   / 2^128

deadline 2^40 steps: classical 2^88 machines, Grover 2^48 machines, 2^88 iterations in all
deadline 2^64 steps: classical 2^64 machines, Grover 2^0 machines, 2^64 iterations in all
deadline 2^96 steps: classical 2^32 machines, Grover 2^0 machines, 2^64 iterations in all
```

With one machine per key the quantum search is no better than the classical one; between
the ends, each doubling of the machines buys only $\sqrt 2$ in time. The last two deadline
rows show the floor: once one machine may run all $2^{64}$ iterations, a longer deadline
saves nothing. Figure 2.3 draws the same trade-off with NIST's numbers.

<figure class="mars-fig">
<svg viewBox="0 0 640 310" width="640" role="img" aria-label="Total gates of a Grover search for an AES-128 key against MAXDEPTH, falling one bit per bit of depth to a floor near 2 to the 79" fill="currentColor" font-size="13">
<line x1="80" y1="260" x2="600" y2="260" stroke="currentColor"/>
<line x1="80" y1="30" x2="80" y2="260" stroke="currentColor"/>
<text x="80" y="280" text-anchor="middle">0</text>
<text x="184" y="280" text-anchor="middle">20</text>
<text x="288" y="280" text-anchor="middle">40</text>
<text x="392" y="280" text-anchor="middle">60</text>
<text x="496" y="280" text-anchor="middle">80</text>
<text x="600" y="280" text-anchor="middle">100</text>
<text x="70" y="264" text-anchor="end">60</text>
<text x="70" y="220" text-anchor="end">80</text>
<text x="70" y="176" text-anchor="end">100</text>
<text x="70" y="132" text-anchor="end">120</text>
<text x="70" y="88" text-anchor="end">140</text>
<text x="70" y="44" text-anchor="end">160</text>
<text x="340" y="302" text-anchor="middle">log2 of MAXDEPTH (gates in a row)</text>
<text x="22" y="145" text-anchor="middle" transform="rotate(-90 22 145)">log2 of total gates</text>
<line x1="80" y1="77.4" x2="600" y2="77.4" stroke="currentColor" stroke-dasharray="6 4"/>
<text x="596" y="69.4" text-anchor="end">classical search, 2^143</text>
<polyline points="80.0,46.6 485.6,218.2 600.0,218.2" fill="none" stroke="currentColor" stroke-width="2.4"/>
<text x="244.0" y="106.6">Grover, 2^157 / MAXDEPTH</text>
<text x="600.0" y="236.2" text-anchor="end" fill-opacity=".7">floor: no split needed</text>
<circle cx="288.0" cy="134.6" r="5"/>
<text x="296.0" y="126.6" font-weight="bold">2^117</text>
<circle cx="412.8" cy="187.4" r="5"/>
<text x="420.8" y="179.4" font-weight="bold">2^93</text>
<circle cx="579.2" cy="218.2" r="5"/>
<text x="587.2" y="208.2" font-weight="bold">2^79</text>
<circle cx="152.8" cy="77.4" r="4" fill="none" stroke="currentColor" stroke-width="2"/>
<text x="146" y="97" text-anchor="end" font-weight="bold">2^14</text>
</svg>
<figcaption>Figure 2.3. Grover on AES-128 under a depth limit, with NIST's revised figure $2^{157}/\text{MAXDEPTH}$. Each extra bit of allowed depth saves a bit of total gates until the search no longer needs splitting; the dots mark NIST's three depths. Counted in gates, the quantum search is cheaper than the classical one at any depth above $2^{14}$; what it costs in machines and in error correction is not on this chart.</figcaption>
</figure>

### The three depths in time

Each of NIST's three depths implies a speed for one logical gate. Dividing a year, a
decade and a millennium by them, then applying the cost formula with its floor, gives:

```python
YEAR = 365.25 * 24 * 3600
for md, years, who in [(40, 1, "quantum designs of 2016"),
                       (64, 10, "classical chips"),
                       (96, 1000, "atomic-scale qubits")]:
    print("MAXDEPTH 2^%d in %4d years: %.1e s per gate (%s)"
          % (md, years, years * YEAR / 2 ** md, who))
print()
for cat, key, classical, q in [(1, 128, 143, 157), (3, 192, 207, 221), (5, 256, 272, 285)]:
    floor = key // 2 + 15          # unsplit Grover: 2^(k/2) iterations, at least 2^15 gates each
    costs = ["2^%d" % max(q - md, floor) for md in (40, 64, 96)]
    print("category %d: classical 2^%d | quantum at 2^40, 2^64, 2^96: %s"
          % (cat, classical, ", ".join(costs)))
```

It prints:

```text
MAXDEPTH 2^40 in    1 years: 2.9e-05 s per gate (quantum designs of 2016)
MAXDEPTH 2^64 in   10 years: 1.7e-11 s per gate (classical chips)
MAXDEPTH 2^96 in 1000 years: 4.0e-19 s per gate (atomic-scale qubits)

category 1: classical 2^143 | quantum at 2^40, 2^64, 2^96: 2^117, 2^93, 2^79
category 3: classical 2^207 | quantum at 2^40, 2^64, 2^96: 2^181, 2^157, 2^125
category 5: classical 2^272 | quantum at 2^40, 2^64, 2^96: 2^245, 2^221, 2^189
```

Seventeen picoseconds per gate is far faster than any chip's clock (a 5 GHz processor ticks
every 200 picoseconds); it is about the delay of one fast logic gate, which is how NIST's
call pictures serial classical work, and no quantum design comes near it; the third figure is a physical limit, not a plan. Today's surface-code
estimates (Chapter 1, §1.5) put a logical gate at around a microsecond, so even the
smallest depth, $2^{40}$ gates in a row, keeps one machine busy for about two weeks, and
$2^{64}$ would take about 600,000 years.

At categories 3 and 5 no depth brings a quantum key search within reach: the cheapest
entry is $2^{125}$ gates. At category 1 the gate counts do fall
far below the classical $2^{143}$, and that is the honest reason long-lived data is
encrypted with AES-256 (§2.13): not because Grover breaks AES-128 today, but because
$2^{93}$ logical gates is not a number anyone wants to bet fifty years against.


**What MAXDEPTH does not cover.** It limits only the depth of quantum circuits. A
classical attack, which parallelizes perfectly, is not limited at all, and an attack that
mixes classical and quantum steps is judged by its total cost. For lattice schemes the
quantum speed-ups known are small (a few percent of the exponent, §2.5), and the
classical attack is usually the one that sets the category.

!!! note "Life story: NIST's security categories"
    **Born:** December 2016, in NIST's *Submission Requirements and Evaluation Criteria
    for the Post-Quantum Cryptography Standardization Process* · **Purpose:** to let
    schemes with completely different attacks be compared by one yardstick, the cost of
    attacking AES or SHA-2 · **Helped:** every parameter set in FIPS 203, 204 and 205, and
    in the later calls, is labeled by its category; the MAXDEPTH idea shaped how quantum
    attacks are costed · **Status:** current; the quantum gate figures were revised
    downward after Jaques and others costed AES circuits in detail (2020)

## 2.5 Measuring a lattice scheme: block size and core-SVP

*Level: intermediate.*

For a lattice scheme such as ML-KEM, the best known attacks are not searches. They are
**lattice reduction**: an algorithm called BKZ (Chapter 6) takes a description of a
lattice and improves it, block by block, until a very short vector appears, and that
short vector is the secret key or reveals it. BKZ has one main knob, the **block size**
$\beta$. A larger block finds shorter vectors and costs more. Breaking a scheme means
finding a short enough vector, which needs a large enough $\beta$.

So the strength of a lattice scheme is measured in two steps:

1. **How large must $\beta$ be?** This depends on the scheme's dimension, modulus and the
   size of its secret and errors, through a geometric condition explained below.
2. **What does one call to the inner routine with block size $\beta$ cost?** The inner
   routine solves the shortest vector problem (SVP) in dimension $\beta$, and the fastest
   known way is **sieving**, which takes about $2^{0.292\beta}$ operations classically
   (Becker, Ducas, Gama and Laarhoven, 2016) and $2^{0.265\beta}$ with Grover-style
   speed-ups on a quantum computer (Laarhoven, 2015).

The **core-SVP** estimate takes only the cost of a single SVP call in dimension $\beta$,
$0.292\beta$ bits classically, ignoring the many calls BKZ actually makes and every
lower-order term. It deliberately underestimates the attack, which is the safe
direction. It became the common yardstick because it is easy to compute and easy to
compare across schemes.

**The condition for success.** In the "primal" attack, the LWE secret is embedded in a
lattice of dimension $d$ as an unusually short vector of length about $\sigma\sqrt{d}$,
where $\sigma$ is the standard deviation of the secret and error coefficients. BKZ with
block size $\beta$ produces a basis whose shape follows a geometric series governed by
the **root Hermite factor**

$$\delta_\beta \approx \left(\frac{\beta}{2\pi e}(\pi\beta)^{1/\beta}\right)^{1/(2(\beta-1))}.$$

Alkim, Ducas, Pöppelmann and Schwabe (2016) gave the condition under which BKZ will
find the secret: the projected length of the short vector, about $\sigma\sqrt\beta$,
must be smaller than the length of the $(d-\beta)$-th Gram-Schmidt vector of the reduced
basis,

$$\sigma\sqrt{\beta} \le \delta_\beta^{\,2\beta - d - 1}\cdot q^{m/d},$$

where $m$ is the number of LWE samples used and $d = n + m + 1$. The attacker picks the
$m$ that minimizes the $\beta$ needed.

**Code it.** The program below applies that condition to the three ML-KEM parameter
sets. ML-KEM works over $q = 3329$ with dimension $n = 256k$ for $k = 2, 3, 4$ and secret
and error coefficients from a centered binomial distribution with parameter $\eta$
(variance $\eta/2$).

```python
from math import pi, e, sqrt, log

def delta(beta):
    """Root Hermite factor reached by BKZ with block size beta (Chen-Nguyen fit)."""
    return ((pi * beta) ** (1 / beta) * beta / (2 * pi * e)) ** (1 / (2 * (beta - 1)))

def primal_beta(n, q, sigma, max_m=None):
    """Smallest block size for which the 2016 primal-attack condition holds."""
    best = None
    for m in range(n // 2, (max_m or n) + 1, 8):
        d = n + m + 1
        for beta in range(50, d):
            lhs = sigma * sqrt(beta)
            rhs = delta(beta) ** (2 * beta - d - 1) * q ** (m / d)
            if lhs <= rhs:
                if best is None or beta < best[0]:
                    best = (beta, m)
                break
    return best

for name, n, eta in [("ML-KEM-512", 512, 3), ("ML-KEM-768", 768, 2), ("ML-KEM-1024", 1024, 2)]:
    sigma = sqrt(eta / 2)
    beta, m = primal_beta(n, 3329, sigma)
    print("%-12s beta %d  m %d  classical 2^%.0f  quantum 2^%.0f" % (name, beta, m, 0.292 * beta, 0.265 * beta))
```

Running it prints:

```
ML-KEM-512   beta 406  m 488  classical 2^119  quantum 2^108
ML-KEM-768   beta 624  m 664  classical 2^182  quantum 2^165
ML-KEM-1024  beta 874  m 848  classical 2^255  quantum 2^232
```

These twenty lines reproduce, within a bit, the core-SVP figures the Kyber team
published for the third round of the NIST process: about 118, 182 and 256 bits
classically. The numbers are below 143, 207 and 272, the gate counts of categories 1, 3
and 5. That is expected and not a weakness. Core-SVP counts one sieve call in "operations"
of unspecified size; the real attack makes many calls, each operation is many gates, and
a sieve in dimension 400 needs memory for about $2^{0.2075\beta} \approx 2^{84}$ vectors.
When the Kyber team counted gates and the many calls more carefully, ML-KEM-512 came out
near category 1's line, and ML-KEM-768 and ML-KEM-1024 well above 3 and 5. Figure 2.2
draws the condition for ML-KEM-512.

<figure class="mars-fig">
<svg viewBox="0 0 640 280" width="640" role="img" aria-label="Plot of the two sides of the primal attack condition against block size: the short vector's projected length grows slowly, the reduced basis's tail grows with block size, and they cross near beta 406 for ML-KEM-512" fill="currentColor" font-size="13">
<line x1="60" y1="240" x2="620" y2="240" stroke="currentColor"/>
<line x1="60" y1="20" x2="60" y2="240" stroke="currentColor"/>
<text x="340" y="272" text-anchor="middle">block size β (200 to 600)</text>
<text x="20" y="130" text-anchor="middle" transform="rotate(-90 20 130)">length (log scale)</text>
<path d="M60 170 C 200 160, 400 150, 620 142" fill="none" stroke="currentColor" stroke-width="2"/>
<text x="560" y="134" text-anchor="end">σ√β, the secret</text>
<path d="M60 236 C 200 215, 330 170, 395 155 S 540 70, 620 30" fill="none" class="acc" stroke-width="2.4"/>
<text x="470" y="72" class="acc-fill">tail of the BKZ-β basis</text>
<line x1="383" y1="152" x2="383" y2="240" stroke="currentColor" stroke-dasharray="4 4"/>
<text x="383" y="256" text-anchor="middle" font-weight="bold">≈ 406</text>
<text x="200" y="200">fails: secret hidden</text>
<text x="420" y="225">succeeds: secret found</text>
</svg>
<figcaption>Figure 2.2. The primal attack on ML-KEM-512, drawn schematically. Below the crossing, BKZ's reduced basis is too "steep" to expose the secret; above it, the secret appears as the shortest vector. The crossing sets the block size and so the cost.</figcaption>
</figure>

**Other attacks.** The primal attack is one of several. The **dual attack** looks for a
short vector in a related lattice and uses it to distinguish LWE samples from random;
**hybrid attacks** guess some secret coefficients and reduce the rest. For ML-KEM the
primal attack is usually within a few bits of the best. The public tool everyone uses
is the **lattice estimator** of Albrecht, Player and Scott (2015), maintained since by a
community of contributors, which runs all known attacks under several cost models and
reports the cheapest. Chapter 6 opens it up.

### From β to bits, by hand

The step from block size to bits is one multiplication, and doing it by hand shows how
sensitive the answer is. For ML-KEM-512, $\beta = 406$:

- classical core-SVP: $0.292 \times 406 = 118.6$ bits;
- quantum core-SVP: $0.265 \times 406 = 107.6$ bits;
- sieve memory: $0.2075 \times 406 = 84.2$, so about $2^{84}$ stored vectors.

For ML-KEM-768 and ML-KEM-1024 the products are 182.2 and 255.2. Each unit of $\beta$ is
worth 0.292 bits, so taking 25 bits off ML-KEM-512 would mean lowering the block size an
attack needs by about 86, a fifth of the whole. No published improvement has come near
that; the refinements of recent years (§2.7) were worth a few bits each, and some were
later disputed. That is what lattice designers mean by estimates that are stable but not
exact.

## 2.6 Yardsticks for the other families

*Level: intermediate.*

Each family of hard problems has its own best attack and its own way of costing it.

- **Hash-based signatures** (Chapters 11 and 12) are the easiest: their security reduces
  to properties of the hash function, such as second-preimage resistance of SHA-256 or
  SHAKE256, so the yardstick is a generic hash attack. SLH-DSA's 128-bit parameter sets
  use 128-bit hash outputs internally, and their security is close to a 128-bit
  preimage search, with Grover's square root offset by the depth limit just as for AES.
- **Code-based schemes** (Chapters 13 and 14) are attacked by **information set
  decoding** (ISD), a family of algorithms going back to Eugene Prange in 1962. The cost
  of the best ISD variant is computed from the code's length, dimension and number of
  errors; for Classic McEliece the estimates have been remarkably stable for decades,
  falling only by small amounts as ISD improved.
- **Multivariate schemes** (Chapter 15) are attacked by Gröbner-basis algorithms and
  by structural attacks specific to each design. The cost of a Gröbner basis
  computation is estimated from the "degree of regularity" of the system, a quantity
  that is easy to compute for random systems and hard to predict for structured ones.
  The structural attacks are where schemes have died.
- **Isogeny schemes** (Chapter 16) were costed by the best path-finding algorithms in
  isogeny graphs, until the 2022 attack found a completely different route.

**Code it: Prange's decoder.** The oldest yardstick on the list fits in a few lines.
A code-based ciphertext is a codeword plus an error vector with exactly $t$ ones among $n$
positions. Prange's idea (1962) is to guess $k$ positions that contain no error (an
**information set**), solve the linear equations on those positions alone, and check
whether the rest of the word then differs from a codeword in exactly $t$ places. A random
guess avoids all $t$ errors with probability $\binom{n-k}{t}/\binom{n}{t}$, so the expected
number of guesses is the inverse, and each guess costs a Gaussian elimination of roughly
$n^3$ bit operations.

```python
from math import lgamma, log

def log2_binom(n, k):
    return (lgamma(n + 1) - lgamma(k + 1) - lgamma(n - k + 1)) / log(2)

def prange_bits(n, k, t):
    """log2 of Prange's expected iterations: pick n-k positions that hold all t errors."""
    return log2_binom(n, t) - log2_binom(n - k, t)

for name, n, k, t in [("toy", 64, 32, 4),
                      ("mceliece348864", 3488, 2720, 64),
                      ("mceliece460896", 4608, 3360, 96),
                      ("mceliece6688128", 6688, 5024, 128)]:
    it = prange_bits(n, k, t)
    work = it + log(n ** 3, 2)          # each iteration: Gaussian elimination, about n^3
    print("%-16s iterations 2^%5.1f  with elimination 2^%5.1f" % (name, it, work))
```

Running it prints:

```
toy              iterations 2^  4.1  with elimination 2^ 22.1
mceliece348864   iterations 2^142.8  with elimination 2^178.1
mceliece460896   iterations 2^184.9  with elimination 2^221.4
mceliece6688128  iterations 2^262.4  with elimination 2^300.5
```

The three real rows are the Classic McEliece parameter sets for categories 1, 3 and 5.
Sixty years of improvement since Prange, by Lee and Brickell, Stern, and in the 2010s
May, Meurer and Thomae and then Becker, Joux, May and Meurer, have taken tens of bits off
these figures, and the Classic McEliece team's own estimates with the modern algorithms
still place each set at or above its category. Compare that slow, steady decline with the
sudden falls of §2.11, and the difference in confidence between families becomes concrete.

The lesson of the list is uneven confidence. Hash functions and generic decoding are
problems with long, quiet histories of attack; lattices have a history almost as long
and a large, active community; structured multivariate and isogeny problems have shorter
histories and a record of sudden falls. Categories make the numbers comparable. They do
not make the confidence behind the numbers equal.

## 2.7 Memory, the hidden cost

*Level: intermediate.*

NIST's categories count gates. Many attacks also need **memory**, and memory is not
free. The classical sieves that set the cost of lattice attacks store about
$2^{0.2075\beta}$ vectors: for $\beta = 406$, about $2^{84}$ vectors of hundreds of
dimensions each, far more storage than exists on Earth. A real attacker would have to
build that memory and move data in and out of it at enormous rates.

How much should memory cost? There are three common models.

1. **The RAM model** charges one operation for any memory access, however large the
   memory. It is the model of most algorithm textbooks and the most generous to the
   attacker.
2. **Area-time models** charge for the physical size of the circuit times the time it
   runs, so a computation that needs a huge memory pays for that memory throughout. In
   them, a sieve's memory makes it much more expensive.
3. **Communication-cost models** charge for moving data across a chip or a cluster,
   roughly proportional to the distance, so random access to a memory of size $M$ costs
   something like $\sqrt M$ or $\sqrt[3] M$ per access.

### Area-time cost, by hand

Michael Wiener made the argument precise in 2004 under the name **full cost**: an attack
costs the hardware it needs times the time that hardware is tied up. A key search is the
friendly case. Its state is a few hundred bits, so $P$ search units for $2^{128}/P$ steps
cost $2^{128}$ whatever $P$ is, and the RAM and area-time models agree.

A sieve is the unfriendly case. With $\beta = 406$ it holds about $2^{84}$ vectors of a few
hundred bytes each, more than $2^{92}$ bytes. All the digital storage in the world is a few
tens of zettabytes at most, under $2^{75}$ bytes. Even with one processor per stored vector,
the run lasts $2^{119-84} = 2^{35}$ steps and the bill, memory times time, is $2^{119}$:
the RAM figure, but only if every processor reaches any vector in one step. In a machine
that size it cannot. A random access into $M$ items laid out on a plane travels about
$\sqrt M$; packed in three dimensions, about $\sqrt[3]{M}$. Those are the third model's
charges.

**Code it.** The program below takes the sieve's time, $2^{0.292\beta}$, and its memory,
$2^{0.2075\beta}$ vectors, for the three ML-KEM block sizes of §2.5, and prints the cost
under the RAM model and under two communication-cost models in which each memory access
costs $M^{1/3}$ or $M^{1/2}$.

```python
for name, beta in [("ML-KEM-512", 406), ("ML-KEM-768", 624), ("ML-KEM-1024", 874)]:
    t = 0.292 * beta              # log2 of sieve operations
    m = 0.2075 * beta             # log2 of vectors stored
    print("%-12s time 2^%.0f  memory 2^%.0f vectors | RAM 2^%.0f  cube-root 2^%.0f  square-root 2^%.0f"
          % (name, t, m, t, t + m / 3, t + m / 2))
```

Running it prints:

```
ML-KEM-512   time 2^119  memory 2^84 vectors | RAM 2^119  cube-root 2^147  square-root 2^161
ML-KEM-768   time 2^182  memory 2^129 vectors | RAM 2^182  cube-root 2^225  square-root 2^247
ML-KEM-1024  time 2^255  memory 2^181 vectors | RAM 2^255  cube-root 2^316  square-root 2^346
```

The two communication models overstate the cost, because a well-designed sieve keeps most
of its accesses local, but they show the size of the gap. The truth lies somewhere between
the RAM column and the others, and that range, tens of bits wide, is where arguments about
ML-KEM-512 take place.

### Memory-aware sieving, NIST's way

Real sieves can trade memory traffic for arithmetic. The RAM-model sieve of Becker,
Ducas, Gama and Laarhoven (2016), the source of the 0.292, makes random accesses across
the whole table. Sieves with larger buckets, tuned for GPUs by Léo Ducas, Marc Stevens and
Wessel van Woerden (2021), do more arithmetic but keep most of it inside a bucket. With
parameter $k = 1$ the bucket is the square root of the memory and the exponent rises to
$0.349$; with $k = 2$, the cube root and $0.3294$; with $k = 3$, the fourth root and
$0.3198$. An attacker who pays $\sqrt M$ per access picks $k = 1$, one who pays
$\sqrt[3]{M}$ picks $k = 2$.

NIST's December 2023 note on Kyber-512 did exactly this calculation. The program repeats
it, applied to the sieving dimension left after dimensions for free (§2.14) rather than to
$\beta$ itself.

```python
from math import log, pi, e

def d4f(beta):
    """Dimensions for free (Ducas 2018): how many fewer dimensions the sieve needs."""
    return beta * log(4 / 3) / log(beta / (2 * pi * e))

MODELS = [("RAM (BDGL)", 0.292), ("k=3, fourth root", 0.3198),
          ("k=2, cube root", 0.3294), ("k=1, square root", 0.349)]
for name, beta in [("ML-KEM-512", 406), ("ML-KEM-768", 624), ("ML-KEM-1024", 874)]:
    dim = beta - d4f(beta)
    print("%s: beta %d, sieving dimension about %.0f" % (name, beta, dim))
    for label, c in MODELS:
        print("    %-17s 2^%.0f  (+%2.0f bits)" % (label, c * dim, (c - 0.292) * dim))
```

It prints:

```text
ML-KEM-512: beta 406, sieving dimension about 369
    RAM (BDGL)        2^108  (+ 0 bits)
    k=3, fourth root  2^118  (+10 bits)
    k=2, cube root    2^122  (+14 bits)
    k=1, square root  2^129  (+21 bits)
ML-KEM-768: beta 624, sieving dimension about 574
    RAM (BDGL)        2^168  (+ 0 bits)
    k=3, fourth root  2^184  (+16 bits)
    k=2, cube root    2^189  (+21 bits)
    k=1, square root  2^200  (+33 bits)
ML-KEM-1024: beta 874, sieving dimension about 810
    RAM (BDGL)        2^237  (+ 0 bits)
    k=3, fourth root  2^259  (+23 bits)
    k=2, cube root    2^267  (+30 bits)
    k=1, square root  2^283  (+46 bits)
```

For ML-KEM-512 the sieve runs in dimension about 369 (the Kyber documentation used 375),
and the memory models add 10, 14 and 21 bits, the figures NIST's note gives. These are
exponents of abstract operations: the RAM line, $2^{108}$, sits about 27 bits below the
$2^{137}$ gates the Kyber documentation counted for one sieve in dimension 375, because each
operation hides an inner product and polynomial factors. The memory bonus is the part that
carries over to a gate count. The larger sets gain more, because their tables are larger.

### ML-KEM-512 on trial, 2020 to 2023

The memory question decided whether ML-KEM-512, then Kyber-512, belonged in category 1.
The third-round Kyber specification (2020, revised 2021) gave a core-SVP figure of 118
bits, so the team went "beyond core-SVP": they counted the gates of the best sieve,
included the many calls BKZ makes and the dimensions for free, and arrived at about
$2^{151}$ gates in the RAM model. Eight sources of uncertainty, labeled Q1 to Q8, widened
that to a range of $2^{135}$ to $2^{165}$, part of it below the line. The team's case, and
NIST's, was that the RAM model gives memory away free. In August 2020 Ray Perlner of NIST
had posted to the public pqc-forum an analysis of how much memory a category 1 attacker
could plausibly build; NIST later quoted it as about $2^{96.5}$ bits.

In April 2022 MATZOV, the cryptography center of the Israel Defense Forces, reported an
improved dual attack claiming about $2^{137}$ gates, 14 bits lower. Léo Ducas and Ludo
Pulles then questioned the heuristic behind such dual-sieve attacks (CRYPTO 2023), leaving
the main claim unproven; about 6 of its 14 bits came from sieving refinements that did not
depend on it. Meanwhile NIST selected Kyber in July 2022 (NIST IR 8413) and wrote on its
forum that, barring major improvements in cryptanalysis, it seemed unlikely that memory
access would ever become cheap enough to push Kyber-512 below category 1.

In October 2023 Daniel Bernstein published "The inability to count correctly", arguing
that NIST had charged a per-access memory cost to the total number of bit operations in
the attack, when only the memory accesses, a smaller number NIST had not stated, should be
charged that way. If so, the memory bonus was much smaller than NIST had said. The forum
exchange was long and sharp; others, among them John Mattsson of Ericsson, argued that
Kyber-512 was still likely as hard to break as AES-128 once memory was costed properly.

In December 2023 NIST answered with a short FAQ on Kyber-512. It started from the lattice
estimator with MATZOV's sieving refinements, $2^{142.2}$, and added the "hidden overheads"
Ducas had measured in practical sieves in 2022, about a factor of $2^5$: a best RAM-model
estimate of about $2^{147}$ gates, uncertainty window $2^{135}$ to $2^{158}$. Pricing
memory at the cube root of its size, which NIST's extrapolation suggested was close to
real, added about 14 bits. Its best guess for the realistic cost was about $2^{160}$ gates,
plausible range $2^{140}$ to $2^{180}$, and it called it "highly unlikely" that the known
uncertainties made Kyber-512 significantly less secure than AES-128. FIPS 203 (August 2024)
kept ML-KEM-512 as the category 1 set and recommended ML-KEM-768 as the default. Figure
2.4 puts the numbers side by side.

<figure class="mars-fig">
<svg viewBox="0 0 640 280" width="640" role="img" aria-label="Estimates of the cost of attacking ML-KEM-512, from core-SVP to NIST's memory-aware figure, against the AES-128 line at 143 bits" fill="currentColor" font-size="13">
<text x="10" y="44">core-SVP, quantum (0.265 β)</text>
<circle cx="278.8" cy="40" r="6"/><text x="278.8" y="30" font-weight="bold" text-anchor="middle">107</text>
<text x="10" y="78">core-SVP, classical (0.292 β)</text>
<circle cx="324.0" cy="74" r="6"/><text x="324.0" y="64" font-weight="bold" text-anchor="middle">118</text>
<text x="10" y="112">one sieve, dimension 375, gates</text>
<circle cx="402.1" cy="108" r="6"/><text x="402.1" y="98" font-weight="bold" text-anchor="middle">137</text>
<text x="10" y="146">Kyber team 2021, gates</text>
<rect x="393.9" y="136" width="123.3" height="12" rx="3" fill-opacity=".18" stroke="currentColor" stroke-opacity=".5"/>
<circle cx="459.7" cy="142" r="6"/><text x="459.7" y="132" font-weight="bold" text-anchor="middle">151</text>
<text x="10" y="180">NIST 2023, gates (RAM)</text>
<rect x="393.9" y="170" width="94.6" height="12" rx="3" fill-opacity=".18" stroke="currentColor" stroke-opacity=".5"/>
<circle cx="443.2" cy="176" r="6"/><text x="443.2" y="166" font-weight="bold" text-anchor="middle">147</text>
<text x="10" y="214">NIST 2023, with memory</text>
<rect x="414.4" y="204" width="164.4" height="12" rx="3" fill-opacity=".18" stroke="currentColor" stroke-opacity=".5"/>
<circle cx="496.7" cy="210" r="6"/><text x="496.7" y="200" font-weight="bold" text-anchor="middle">160</text>
<line x1="426.8" y1="18" x2="426.8" y2="234" stroke="currentColor" stroke-width="2" stroke-dasharray="6 4"/>
<line x1="250" y1="234" x2="620" y2="234" stroke="currentColor"/>
<line x1="250.0" y1="234" x2="250.0" y2="239" stroke="currentColor"/><text x="250.0" y="254" text-anchor="middle">100</text>
<line x1="332.2" y1="234" x2="332.2" y2="239" stroke="currentColor"/><text x="332.2" y="254" text-anchor="middle">120</text>
<line x1="414.4" y1="234" x2="414.4" y2="239" stroke="currentColor"/><text x="414.4" y="254" text-anchor="middle">140</text>
<line x1="496.7" y1="234" x2="496.7" y2="239" stroke="currentColor"/><text x="496.7" y="254" text-anchor="middle">160</text>
<line x1="578.9" y1="234" x2="578.9" y2="239" stroke="currentColor"/><text x="578.9" y="254" text-anchor="middle">180</text>
<text x="426.8" y="14" text-anchor="middle" font-weight="bold">AES-128: 143</text>
<text x="435" y="274" text-anchor="middle">log2 of the cost</text>
</svg>
<figcaption>Figure 2.4. ML-KEM-512 on one scale. The two core-SVP figures count abstract sieve operations; the four below them count gates, first for one sieve and then for the whole attack, and the bars are the uncertainty ranges their authors gave. The dashed line is category 1. Every gate-count estimate lands within about twenty bits of it, which is why the argument could not be settled by arithmetic alone.</figcaption>
</figure>

Two lessons stand. The argument was never about whether ML-KEM-512 is weak in practice:
every estimate in Figure 2.4 is beyond any computation anyone can run. It was about which
side of a line a scheme sits on when the honest uncertainty is wider than the distance to
the line. And the way to make such an argument irrelevant is a margin larger than the
uncertainty. Nobody on either side argued that ML-KEM-768 falls short of category 3; even
its pessimistic core-SVP figure, 182 bits, lies above the whole range in dispute.

## 2.8 Multiple targets and tight proofs

*Level: intermediate.*

**Many users, one attacker.** A key search for one AES key costs $2^{128}$. A search for
*any one* of $2^{30}$ keys used by different people costs only about $2^{98}$, because each
guess is checked against all of them. This **multi-target** effect applies to many
schemes, and post-quantum designs defend against it. ML-KEM, for instance, mixes a hash
of the public key into the derived shared secret, so that an attack on one key reveals
nothing about another, and SLH-DSA mixes a public seed unique to each key into every hash
so that hash attacks cannot be shared across keys.

**Tightness.** Security proofs say "if you can break the scheme with advantage
$\varepsilon$ in time $t$, you can solve the hard problem with advantage $\varepsilon'$ in
time $t'$". A proof is **tight** when $\varepsilon' \approx \varepsilon$ and $t' \approx
t$. Many post-quantum proofs, especially those in the quantum random oracle model
(Chapter 3), lose factors, such as the square of the number of hash queries. A proof with
a loss of $2^{64}$ technically guarantees only 64 bits less than the hard problem offers.
In practice parameters are chosen from the best known attacks, not from the proof, and
the proof is read as evidence that the design has no structural flaw. That is a
judgment, and it is one of the places where honest experts disagree.

**Decryption failures.** Lattice and code-based KEMs fail to decrypt correctly with a tiny
probability: $2^{-139}$ for ML-KEM-512, $2^{-164}$ for ML-KEM-768 and $2^{-174}$ for
ML-KEM-1024. An attacker who could trigger and detect failures on purpose learns about
the secret key. The failure rate is therefore part of the security level, and is set
well below $2^{-128}$ (Chapter 3, §3.6).

## 2.9 Choosing a level

*Level: intermediate.*

Table 2.2 lists the standard parameter sets with their categories and sizes. All sizes
are in bytes. For comparison, X25519 uses 32-byte keys and messages, and an Ed25519
signature is 64 bytes.

| Scheme | Category | Public key | Private key | Ciphertext or signature |
| --- | --- | --- | --- | --- |
| ML-KEM-512 | 1 | 800 | 1,632 | 768 |
| ML-KEM-768 | 3 | 1,184 | 2,400 | 1,088 |
| ML-KEM-1024 | 5 | 1,568 | 3,168 | 1,568 |
| ML-DSA-44 | 2 | 1,312 | 2,560 | 2,420 |
| ML-DSA-65 | 3 | 1,952 | 4,032 | 3,309 |
| ML-DSA-87 | 5 | 2,592 | 4,896 | 4,627 |
| SLH-DSA-SHA2-128s | 1 | 32 | 64 | 7,856 |
| SLH-DSA-SHA2-128f | 1 | 32 | 64 | 17,088 |
| SLH-DSA-SHA2-192s | 3 | 48 | 96 | 16,224 |
| SLH-DSA-SHA2-256s | 5 | 64 | 128 | 29,792 |
| Falcon-512 (FN-DSA, draft to come) | 1 | 897 | 1,281 | about 666 |
| Falcon-1024 | 5 | 1,793 | 2,305 | about 1,280 |

*Table 2.2. Sizes of the standard and near-standard parameter sets, from FIPS 203,
FIPS 204, FIPS 205 and the Falcon specification. Falcon signatures vary in length; the
figures are the specification's maximums for the padded format.*

**A Mars example.** Sizes matter most where bandwidth is scarce. A settlement's main link
to Earth through a relay orbiter may run at megabits per second, but a rover, a habitat
sensor or an emergency beacon may have only a few kilobits per second, and every
handshake competes with science data. The program below counts the bytes in one
handshake, a key exchange plus a signature and a two-certificate chain, for four
choices, and the time they take on a weak and a good link.

```python
SIZES = {   # bytes on the wire for one handshake: key share or ciphertext, plus signatures
    "X25519 + Ed25519":        (32 + 32, 64 + 32),
    "ML-KEM-768 + ML-DSA-65":  (1184 + 1088, 3309 + 1952),
    "ML-KEM-1024 + ML-DSA-87": (1568 + 1568, 4627 + 2592),
    "ML-KEM-768 + SLH-DSA-128s": (1184 + 1088, 7856 + 32),
}
CHAIN = 2   # signatures in a certificate chain besides the handshake signature

def handshake_bytes(kem, sig):
    return kem + sig * (1 + CHAIN)

for rate in (2000, 2000000):            # bits per second: a weak and a good link
    print("link at %d bit/s" % rate)
    for name, (kem, sig) in SIZES.items():
        b = handshake_bytes(kem, sig)
        print("  %-26s %6d bytes  %7.2f s on the wire" % (name, b, b * 8 / rate))
```

Running it prints:

```
link at 2000 bit/s
  X25519 + Ed25519              352 bytes     1.41 s on the wire
  ML-KEM-768 + ML-DSA-65      18055 bytes    72.22 s on the wire
  ML-KEM-1024 + ML-DSA-87     24793 bytes    99.17 s on the wire
  ML-KEM-768 + SLH-DSA-128s   25936 bytes   103.74 s on the wire
link at 2000000 bit/s
  X25519 + Ed25519              352 bytes     0.00 s on the wire
  ML-KEM-768 + ML-DSA-65      18055 bytes     0.07 s on the wire
  ML-KEM-1024 + ML-DSA-87     24793 bytes     0.10 s on the wire
  ML-KEM-768 + SLH-DSA-128s   25936 bytes     0.10 s on the wire
```

On the good link the difference is invisible. On the weak one, a post-quantum handshake
with certificates takes over a minute of airtime where the elliptic-curve one took a
second and a half. The lesson for a settlement is not to weaken the level but to shape
the protocol: few handshakes, long-lived sessions, pre-installed keys instead of
certificate chains on small devices, and signatures checked once at a gateway. Chapter 18
returns to it. The same arithmetic, with smaller numbers, drives the design of
post-quantum TLS on Earth, where every extra kilobyte in a handshake costs measurable
time on mobile networks.

Five guidelines cover most decisions:

1. **For key exchange, use ML-KEM-768** unless something forces otherwise. It is NIST's
   recommended default and the one used in TLS, SSH and most libraries. Its margin over
   category 3 absorbs most future improvements in attacks.
2. **Use the category 5 sets where policy requires it**, as CNSA 2.0 does for national
   security systems (ML-KEM-1024, ML-DSA-87), or for data that must last for many decades.
3. **For signatures, ML-DSA-65 is the general default**; ML-DSA-44 is used where size
   matters and category 2 is acceptable, which it is for most commercial uses.
4. **Use SLH-DSA where you want the most conservative assumption**, such as root keys,
   firmware and long-term archives, and can afford large signatures and slow signing.
5. **Do not mix levels carelessly.** A protocol is as strong as its weakest part: an
   ML-KEM-1024 key exchange authenticated with a 2,048-bit RSA signature is no stronger
   than RSA-2048 against an active quantum attacker.

## 2.10 Break it: five ways to misread a security level

*Level: intermediate.*

Security levels are easy to quote and easy to misuse. Each of the following mistakes
appears regularly in product documentation, procurement rules and news stories.

**"Quantum computers halve every key length."** This is true only of Grover's search, and
only on paper. It is false for public-key schemes, where Shor's algorithm does far more
than halve (it breaks them), and false for the post-quantum schemes, where the known
quantum speed-ups are a few bits in the exponent of a lattice sieve. A product sheet that
says "ML-KEM-768 offers 96 bits of quantum security because quantum halves 192" has
applied the wrong rule twice: category 3 is defined to include quantum attacks already.

**"Category 5 is always the safe choice."** It is the strongest against the known
mathematical attacks, and it costs more: bigger keys, bigger messages, more computation,
more energy on small devices. Those costs have security consequences of their own.
Larger messages fragment and get dropped by middleboxes, pushing people to turn the
feature off; slower operations invite shortcuts. A category 3 scheme that is actually
deployed protects more than a category 5 scheme that is not.

**"A hybrid adds the bits of its parts."** A hybrid of X25519 and ML-KEM-768 is not "128 +
192 = 320 bits". With a sound combiner, it is as strong as the stronger part against any
attacker who cannot break both: against a classical attacker, at least X25519's 128 bits
and in fact ML-KEM's level too; against a quantum attacker, ML-KEM-768's category 3,
because X25519 contributes nothing. The point of a hybrid is insurance against one part
failing, not addition.

**"The proof says 128 bits."** Security proofs give bounds with losses (§2.8). Parameter
sets are chosen from attacks, and the proof is evidence of soundness. A claim that a scheme
"is proven to have 128-bit security" is almost always a misreading; what is proven is a
relation to a hard problem, and the hardness of the problem is estimated.

**"Bit security measures the product."** The level measures the mathematical scheme. The
security of a product also depends on its implementation (Chapter 17), on its random
numbers, on how keys are stored and on the protocol around it. KyberSlash, a 2023-24
timing leak in several ML-KEM implementations, let an attacker recover keys from code
whose mathematics was category 3 or 5; the leak, not the lattice, set the real level.

**Fix it.** When writing or reviewing a specification, state three things: the NIST
category of each primitive, the weakest link of the whole protocol against both a
classical and a quantum attacker, and which attacks the stated level does not cover
(side channels, misuse, key management). A short worked example:

<div class="mars-steps" markdown>

1. A satellite ground station uses ML-KEM-1024 for key exchange, ML-DSA-65 for its
   handshake signature, and a certificate chain signed with ECDSA P-384.
2. Against a passive quantum attacker recording traffic: ML-KEM-1024, category 5. Good.
3. Against an active quantum attacker: the chain is ECDSA, which Shor breaks, so the
   attacker can forge a certificate and impersonate the station. Effective level: broken.
4. Fix: re-issue the chain with ML-DSA-65 or ML-DSA-87. Now the weakest link is ML-DSA-65,
   category 3, which is acceptable for most uses; the stated level of the protocol is
   category 3.
5. Not covered: the implementations' timing behavior, key storage in the station's
   hardware security module, and the random number generator. List them as separate
   requirements.

</div>

## 2.11 In the real world

*Level: intermediate.*

**The levels people chose.** Chrome, Firefox and Cloudflare deploy X25519 with ML-KEM-768.
OpenSSH 10.0 (April 2025) uses ML-KEM-768 with X25519 by default. Signal's PQXDH (2023)
chose Kyber-1024 for its first handshake, preferring a wide margin for messages that may
be kept for years. Apple's PQ3 for iMessage (2024) uses Kyber-1024 for the initial key
establishment and Kyber-768 for its periodic rekeying, trading a little margin for smaller
messages on a frequent operation. NSA's CNSA 2.0 requires the category 5 sets.

**Two falls in one year.** Security levels are only as good as the best attack anyone
has found, and in 2022 two schemes showed how quickly that can change. Rainbow, a
multivariate signature in NIST's final round, claimed category 1 for its smallest set;
in February 2022 Ward Beullens recovered a key in about 53 hours on a laptop (Chapter 15).
SIKE, an isogeny KEM in the fourth round, claimed category 1 for SIKEp434; in July 2022
Wouter Castryck and Thomas Decru broke it in about an hour on one processor core
(Chapter 16). No refinement of bit-counting would have caught either: the attacks were
new mathematics. The response of the standards was diversity: a lattice KEM backed by a
code-based one (HQC), lattice signatures backed by hash-based ones (SLH-DSA), and a new
call for signatures based on yet other problems. §2.12 sets the two falls in a longer
history.

**The Kyber-512 debate.** The argument over whether ML-KEM-512 meets category 1, told
in §2.7, ran from 2020 to the end of 2023 and was never settled to everyone's
satisfaction. Its effect in practice was small, because almost nobody deploys ML-KEM-512:
the recommended default, ML-KEM-768, has a margin that no participant in the debate
questioned.

!!! note "Life story: core-SVP"
    **Born:** 2016, Erdem Alkim, Léo Ducas, Thomas Pöppelmann and Peter Schwabe, in the
    NewHope key exchange paper (USENIX Security 2016) · **Purpose:** a simple, deliberately
    pessimistic way to cost lattice attacks: the time of one SVP call in the BKZ block
    size · **Helped:** became the common currency of lattice parameter selection in the
    NIST process; Kyber, Dilithium, Saber, NTRU and others reported it · **Status:**
    still quoted; refined in practice by the lattice estimator's fuller cost models

## 2.12 The cost of being wrong

*Level: intermediate.*

Every security level is a forecast that the best attack known today, plus the hardware
of the coming decades, will not reach the line. Forecasts have failed in four ways, each
calling for a different defense. Figure 2.5 puts the best-known cases on one line.

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="Timeline of designs from publication to practical break, from DES to SIKE, with AES-128 still standing" fill="currentColor" font-size="13">
<text x="10" y="45" font-weight="bold">DES</text>
<rect x="148.5" y="35" width="193.8" height="12" rx="3" fill-opacity=".2" stroke="currentColor"/>
<line x1="342.3" y1="31" x2="342.3" y2="51" stroke="currentColor" stroke-width="3"/>
<text x="148.5" y="28" font-size="12">1998: a 56-bit key found in 56 hours</text>
<text x="10" y="83" font-weight="bold">RSA-129</text>
<rect x="148.5" y="73" width="156.9" height="12" rx="3" fill-opacity=".2" stroke="currentColor"/>
<line x1="305.4" y1="69" x2="305.4" y2="89" stroke="currentColor" stroke-width="3"/>
<text x="148.5" y="66" font-size="12">1994: "40 quadrillion years" took 8 months</text>
<text x="10" y="121" font-weight="bold">MD5</text>
<rect x="286.9" y="111" width="110.8" height="12" rx="3" fill-opacity=".2" stroke="currentColor"/>
<line x1="397.7" y1="107" x2="397.7" y2="127" stroke="currentColor" stroke-width="3"/>
<text x="286.9" y="104" font-size="12">2004: collisions</text>
<text x="10" y="159" font-weight="bold">SHA-1</text>
<rect x="314.6" y="149" width="203.1" height="12" rx="3" fill-opacity=".2" stroke="currentColor"/>
<line x1="517.7" y1="145" x2="517.7" y2="165" stroke="currentColor" stroke-width="3"/>
<text x="314.6" y="142" font-size="12">2017: a collision, 2^63 work</text>
<text x="10" y="197" font-weight="bold">Rainbow</text>
<rect x="406.9" y="187" width="156.9" height="12" rx="3" fill-opacity=".2" stroke="currentColor"/>
<line x1="563.8" y1="183" x2="563.8" y2="203" stroke="currentColor" stroke-width="3"/>
<text x="406.9" y="180" font-size="12">2022: a key in a weekend</text>
<text x="10" y="235" font-weight="bold">SIDH, SIKE</text>
<rect x="462.3" y="225" width="101.5" height="12" rx="3" fill-opacity=".2" stroke="currentColor"/>
<line x1="563.8" y1="221" x2="563.8" y2="241" stroke="currentColor" stroke-width="3"/>
<text x="462.3" y="218" font-size="12">2022: a key in an hour</text>
<text x="10" y="273" font-weight="bold">AES-128</text>
<rect x="342.3" y="263" width="267.7" height="12" rx="3" fill-opacity=".45" stroke="currentColor"/>
<text x="342.3" y="256" font-size="12">still standing; best attack 2^126 (2011)</text>
<line x1="130.0" y1="298" x2="610.0" y2="298" stroke="currentColor"/>
<text x="130.0" y="318" text-anchor="middle">1975</text>
<text x="176.2" y="318" text-anchor="middle">1980</text>
<text x="222.3" y="318" text-anchor="middle">1985</text>
<text x="268.5" y="318" text-anchor="middle">1990</text>
<text x="314.6" y="318" text-anchor="middle">1995</text>
<text x="360.8" y="318" text-anchor="middle">2000</text>
<text x="406.9" y="318" text-anchor="middle">2005</text>
<text x="453.1" y="318" text-anchor="middle">2010</text>
<text x="499.2" y="318" text-anchor="middle">2015</text>
<text x="545.4" y="318" text-anchor="middle">2020</text>
<text x="591.5" y="318" text-anchor="middle">2025</text>
</svg>
<figcaption>Figure 2.5. Fifty years of shrinking margins. Each bar runs from the year a design was published (for RSA-129, the year the challenge was set) to its practical break. Hardware ended DES, better algorithms ended RSA-129, cryptanalysis of structure ended MD5 and SHA-1, and new mathematics ended Rainbow and SIKE. The darker bar is the counterexample: a quarter century of attack has taken under two bits from AES-128.</figcaption>
</figure>

**Hardware: DES.** The Data Encryption Standard (FIPS 46, 1977) had a 56-bit key. That
year Whitfield Diffie and Martin Hellman estimated that a \$20 million machine could search
it in about a day. The best attack never improved much on brute force; the price of
hardware fell. In July 1998 the Electronic Frontier Foundation's \$250,000 Deep Crack found
a key in 56 hours, and in January 1999, with the distributed.net volunteers, in 22 hours
and 15 minutes. A level with no margin above today's hardware falls to hardware alone
within a working lifetime.

**Algorithms: RSA.** In August 1977 Martin Gardner's *Scientific American* column set a
129-digit (426-bit) RSA challenge and quoted Ron Rivest's estimate that factoring it would
take 40 quadrillion years. In April 1994 Derek Atkins, Michael Graff, Arjen Lenstra and
Paul Leyland factored it in eight months with about 600 volunteers and the quadratic sieve.
Hardware had improved by thousands; the algorithms had improved by far more. RSA-155, 512
bits, fell in August 1999, yet 512-bit "export-grade" keys stayed in use, and in 2015 Luke
Valenta and colleagues factored them in about four hours for about \$75 of cloud time. The
public record is RSA-250, 829 bits, factored in February 2020 by Fabrice Boudot and five
colleagues with about 2,700 core-years of computation.

**Code it: how fast do factoring records move?** The program fits a straight line, by
least squares, to the year and size of the main RSA challenge records, over the first
two decades, the last one, and the whole span, and asks when the line reaches 1,024 bits.

```python
records = [(1991, 330), (1992, 364), (1993, 397), (1994, 426), (1999, 463), (1999, 512),
           (2003, 576), (2005, 663), (2009, 768), (2019, 795), (2020, 829)]

def fit(points):
    """Least-squares line through (year, bits); returns slope and intercept."""
    n = len(points)
    mx = sum(x for x, _ in points) / n
    my = sum(y for _, y in points) / n
    slope = sum((x - mx) * (y - my) for x, y in points) / sum((x - mx) ** 2 for x, _ in points)
    return slope, my - slope * mx

for label, pts in [("1991-2009", records[:9]), ("2009-2020", records[8:]), ("all", records)]:
    a, b = fit(pts)
    print("%-10s %4.1f bits a year; 1024 bits reached about %d" % (label, a, (1024 - b) / a))
```

It prints:

```text
1991-2009  22.6 bits a year; 1024 bits reached about 2021
2009-2020   4.4 bits a year; 1024 bits reached about 2067
all        17.1 bits a year; 1024 bits reached about 2029
```

The three lines disagree by forty years: the rate depends on which decade you measure,
which is why key-size tables carry margins. In bits of security, by the calibration of
§2.2, the 330-bit record of 1991 cost about $2^{43}$ operations, RSA-768 in 2009 about
$2^{67}$, RSA-250 about $2^{70}$: some thirteen bits a decade while the number field sieve
matured, under three since. As of November 2026 no 1,024-bit RSA challenge number (about
$2^{77}$ by the same calibration) has been publicly factored.

**Structure: MD5 and SHA-1.** Hash functions lose margin to cryptanalysis of their
structure. MD5 (1992, 64-bit collision security) gave its first collisions in 2004 to
Xiaoyun Wang and colleagues; in 2008 MD5 collisions forged a certificate authority
certificate, and in 2012 the Flame malware forged a Microsoft code-signing certificate.
SHA-1 (1995) promised 80-bit collision security. In 2005 Wang, Yiqun Lisa Yin and Hongbo
Yu found a $2^{69}$ attack; in 2017 the SHAttered team from CWI Amsterdam and Google
published a collision costing about $2^{63.1}$ SHA-1 computations; in 2020 Gaëtan Leurent
and Thomas Peyrin made a chosen-prefix collision, the kind that forges certificates, for a
few tens of thousands of dollars of rented GPUs. Seventeen bits in twenty-two years, about
eight a decade. NIST has announced that SHA-1 is to be phased out entirely by the end of
2030.

**New mathematics: Rainbow and SIKE.** Rainbow (Jintai Ding and Dieter Schmidt, 2005)
survived seventeen years and three NIST rounds before Ward Beullens's weekend on a laptop
(§2.11). SIDH (David Jao and Luca De Feo, 2011) became SIKE and reached the fourth round
before Castryck and Decru broke it in polynomial time, every parameter set alike. No
margin would have helped.

**The counterexample: AES.** The best key-recovery attack on full AES-128, the biclique
attack of Andrey Bogdanov, Dmitry Khovratovich and Christian Rechberger (2011), costs about
$2^{126.1}$: under two bits in a quarter century of intense cryptanalysis.

Four lessons follow.

1. **Against hardware**, plan for growth of a million or more over a few decades.
2. **Against better algorithms on well-studied problems**, expect a few bits a decade,
   more in a problem's early years; twenty or thirty bits of margin absorb a lifetime.
3. **Against new mathematics**, no margin helps. Diversity does: standards on more than one
   family, and hybrids that survive the failure of one part.
4. **Retirement takes longer than breaking.** SHA-1 had twelve years' warning before its
   first collision and is still being retired; 512-bit RSA was in use sixteen years after
   it was factored.

## 2.13 Picking a level for a fifty-year archive

*Level: intermediate.*

Chapter 1 met the Mars settlement whose charter keeps medical and personal records sent
to Earth private for fifty years (§1.8). Mosca's inequality said to start migrating now.
At which level?

**Which parts must last fifty years.** A KEM sets up each session key, a symmetric
cipher encrypts the records, hashes and key derivation bind the pieces, and signatures
prove origin. The first three protect confidentiality, and must hold for fifty years from
the moment the data crosses the link, because an eavesdropper keeps a recording.
Re-encrypting the archive later protects the settlement's disks, not the recorded copy.

Signatures need to hold only until they are checked or renewed: an archive can be
re-signed or re-time-stamped under a newer algorithm before the old one weakens, as
RFC 4998 (Evidence Record Syntax) describes for long-term archives.

**Why the link makes harvesting easy.** Even a narrow beam from a large antenna on Mars
is wider than the Earth when it arrives, so any large dish on the facing side can record
it, passively and undetectably. The light delay that shapes the settlement's handshakes
plays no part here.

**A model with numbers.** The program sets a deliberately generous attacker against six
choices. Its budget starts from the Bitcoin network of §2.3, about $2^{95}$ hashes a year at
roughly $2^{17}$ gates per double SHA-256 (a rough count), doubles every two years until
2076, and runs for ten years. Cryptanalysis advances "calm", 1.5 bits a decade (AES's
record), or "steady", 8 bits a decade (SHA-1's). For ML-KEM-768 and ML-KEM-1024 the model
adds to core-SVP the 29-bit gap NIST found for ML-KEM-512 between core-SVP (118) and its RAM
gate estimate (147), an assumption and probably an understatement.

```python
YEARS = 50
# log2 of the attacker's budget in gates: 2^95 Bitcoin-scale hashes a year at about
# 2^17 gates each, doubling every two years until 2076, then run for ten years.
BUDGET = 95 + 17 + YEARS / 2 + 3.3
PACE = {"calm": 1.5, "steady": 8.0}   # bits lost per decade: AES's record, SHA-1's record

SCHEMES = [("AES-128, classical", 143),         # log2 of the best attack today, in gates
           ("AES-128, Grover at MAXDEPTH 2^64", 93),
           ("AES-256, Grover at MAXDEPTH 2^64", 221),
           ("ML-KEM-512 (NIST 2023 estimate)", 147),
           ("ML-KEM-768 (core-SVP + 29)", 182 + 29),
           ("ML-KEM-1024 (core-SVP + 29)", 255 + 29)]

print("attacker's budget in %d: 2^%.0f gates" % (2026 + YEARS, BUDGET))
for name, bits in SCHEMES:
    left = ["%s %+4.0f" % (k, bits - r * YEARS / 10 - BUDGET) for k, r in PACE.items()]
    print("%-34s 2^%d   margin: %s" % (name, bits, "   ".join(left)))
```

It prints:

```text
attacker's budget in 2076: 2^140 gates
AES-128, classical                 2^143   margin: calm   -5   steady  -37
AES-128, Grover at MAXDEPTH 2^64   2^93   margin: calm  -55   steady  -87
AES-256, Grover at MAXDEPTH 2^64   2^221   margin: calm  +73   steady  +41
ML-KEM-512 (NIST 2023 estimate)    2^147   margin: calm   -1   steady  -33
ML-KEM-768 (core-SVP + 29)         2^211   margin: calm  +63   steady  +31
ML-KEM-1024 (core-SVP + 29)        2^284   margin: calm +136   steady +104
```

The negative margins are not predictions: the budget assumes fifty years of uninterrupted
doubling aimed at one archive, and the quantum row prices logical gates like classical
ones. Read the table as a ranking under stress. Category 1 has no margin left; category 3
keeps thirty bits even in the steady case; category 5 keeps a hundred. The Grover row is
why CNSA 2.0 and most long-term guidance require AES-256 for the bulk cipher.

**The decision, step by step.**

<div class="mars-steps" markdown>

1. Bulk encryption: AES-256 in an authenticated mode, a fresh key per archive volume.
2. Key establishment: ML-KEM-1024 in a hybrid with X25519 (Chapter 18). Over ML-KEM-768
   it adds 384 bytes of public key and 480 of ciphertext, under a kilobyte per session on
   a transfer of gigabytes.
3. Against new mathematics (§2.12): for the most sensitive volumes, wrap the session key
   again with a KEM from another family: HQC, selected by NIST in 2025, once its standard
   is published, or Classic McEliece, not a NIST standard as of November 2026, whose
   public key of about a megabyte is a one-time cost if placed at the receiver in advance.
4. Hashes and key derivation: SHA-384, SHA-512, SHA3 or SHAKE256, collision resistance at
   category 4 or above.
5. Signatures on the archive's manifests: ML-DSA-87, an SLH-DSA root key, and a renewal
   schedule written into the archive's procedures from the start.
6. Not covered by the level: random number generators, key storage and side channels
   (Chapter 17). List them as separate requirements.

</div>

The whole plan costs a few kilobytes per transfer over "category 3 everywhere". For data
that must outlive the people who encrypted it, buy the margin: it is the only part of the
forecast you control.

## 2.14 Going deeper

*Level: expert.*

**Beyond core-SVP.** A full BKZ run with block size $\beta$ makes on the order of $d$ SVP
calls per tour and several tours; progressive BKZ and the "dimensions for free" technique
of Ducas (2018) cut the effective sieving dimension by roughly $\beta \ln(4/3) /
\ln(\beta/2\pi e)$, about 20 to 30 dimensions at cryptographic sizes. The Kyber and
Dilithium teams' round-3 documentation combined these with gate counts for the sieve's
inner loop to produce estimates in gates, with ranges that reflect uncertainty about
memory costs. The lattice estimator implements several such cost models side by side.

**Quantum sieving.** The quantum exponent $0.265$ assumes Grover-style search inside the
sieve with **quantum random access memory**, QRAM, a device that can read a superposition
of addresses. Whether large QRAM can ever be built cheaply is doubtful, and without it the
quantum advantage in sieving shrinks to a few bits. Analyses by Albrecht, Gheorghiu,
Postlethwaite and Schanck (2020) found the quantum speed-up for sieving at cryptographic
dimensions small once realistic costs are included.

**Concrete versus asymptotic.** The exponent $0.292$ is asymptotic: real sieves in
dimension 100 to 180, the largest run, show a cost that fits $2^{0.292\beta + c}$ with
a constant $c$ that is still being refined. The record lattice computations (the Darmstadt
SVP challenge in dimension around 180 by 2021, with G6K on GPUs) are the experiments that
calibrate these models, in the same way RSA-768 calibrates the NFS.

**Categories for multi-target and hybrid attacks.** The categories are defined for one
target. NIST's later calls ask submitters to discuss multi-target attacks explicitly, and
for hybrid key exchange (Chapter 18) the combined scheme's level is the stronger of the
two parts only when the combiner is sound. Writing down exactly what "category 3 hybrid"
means is a small open area of its own.

## Check yourself

??? question "1. A hash function has a 192-bit output. What are its preimage and collision security, classically?"

    About $2^{192}$ for preimages and $2^{96}$ for collisions, by the birthday bound.

??? question "2. Why does NIST define categories by AES and SHA-2 rather than by bits?"

    Because the attacks on the new schemes are very different from key searches and their
    exact costs are uncertain. Comparing with a well-understood reference attack, in gates,
    lets any new attack, classical or quantum, be judged by one question: is it cheaper than
    attacking AES-128 (or SHA-256, AES-192 and so on)?

??? question "3. With MAXDEPTH = 2^64, what does NIST's revised category 1 quantum figure give, and how does it compare with the classical figure?"

    $2^{157}/2^{64} = 2^{93}$ quantum gates, against $2^{143}$ classical gates. The quantum
    figure is smaller, but each quantum gate is an error-corrected logical operation costing
    thousands of physical operations, and the attack needs a huge number of machines in
    parallel.

??? question "4. A Grover search over 2^128 keys is split evenly across 2^30 quantum computers. How many iterations does each run, how much sooner does the job finish than on one machine, and what is the total work?"

    Each machine searches $2^{98}$ keys in $\sqrt{2^{98}} = 2^{49}$ iterations. One machine
    alone would need $2^{64}$, so the job finishes $2^{15}$ times sooner, the square root of
    $2^{30}$. The total work is $2^{30} \cdot 2^{49} = 2^{79}$ iterations, $2^{15}$ times more
    than a single machine would do. A classical search split the same way would finish
    $2^{30}$ times sooner with no extra work.

??? question "5. A BKZ block size of 500 is needed to break a lattice scheme. What is its classical core-SVP estimate, and roughly how many vectors would the sieve store?"

    $0.292 \times 500 = 146$ bits. The sieve stores about $2^{0.2075 \times 500} \approx
    2^{104}$ vectors.

??? question "6. NIST's December 2023 note priced memory access at the cube root of the memory size, which raises the sieve's exponent from 0.292 to 0.3294 per dimension. For a sieving dimension of 375, how many bits does that add, and what overall estimate did NIST reach for ML-KEM-512?"

    $(0.3294 - 0.292) \times 375 \approx 14$ bits. Added to NIST's best RAM-model gate count of
    about $2^{147}$, it gives NIST's best guess of about $2^{160}$ gates, with a plausible range of
    $2^{140}$ to $2^{180}$, against $2^{143}$ for category 1.

??? question "7. Why does ML-KEM hash the public key into the shared secret?"

    To defeat multi-target attacks: the derived key depends on which public key was used, so
    work done against one user's key cannot be reused against another's, and the security of
    each key does not fall as the number of users grows.

??? question "8. A protocol uses ML-KEM-1024 for key exchange and ECDSA P-256 for authentication. What is its security against an active quantum attacker, and against a passive one who records traffic?"

    Against an active attacker with a CRQC: broken, because the attacker can forge ECDSA and
    impersonate a party. Against a passive recorder: category 5, because the recorded key
    exchange is protected by ML-KEM-1024 and forging signatures later does not help.

??? question "9. A settlement's archive must stay secret for fifty years. Why can its signatures be renewed later while its key exchange and cipher cannot, and what does that imply for the levels chosen?"

    An eavesdropper records the ciphertext as it crosses the link, and that copy can be
    attacked for decades; re-encrypting the stored archive later does not touch it. So the
    KEM, the cipher and the hashes must carry a fifty-year margin from the day of sending:
    ML-KEM-1024 (in a hybrid), AES-256, SHA-384 or stronger. Signatures need to hold only
    until they are checked or renewed: the archive can be re-signed or re-time-stamped under
    newer algorithms before the old ones weaken, as RFC 4998 evidence records do.

??? question "10. Explain in two sentences why core-SVP figures for ML-KEM are below the category gate counts and yet the parameter sets meet their categories."

    Core-SVP counts only one SVP call in dimension $\beta$, in abstract operations, ignoring
    the many calls BKZ makes, the gates per operation, and the memory a sieve needs. Counting
    those raises the cost by tens of bits, enough to meet or exceed the categories' gate
    counts.

## What you learned

- Bit security is the exponent of the best attack's cost. For schemes whose best attack
  is not a search, the exponent is an estimate with error bars of a few bits, calibrated
  by experiments.
- NIST's five categories compare every scheme with key search on AES-128, AES-192 and
  AES-256 and collision search on SHA-256 and SHA-384, counted in gates.
- One AES-128 encryption is about $2^{14.8}$ gates, so a key search is $2^{143}$: about ten
  billion years for the whole Bitcoin network of 2025, had it searched keys instead.
- Quantum attacks are costed under a depth limit, MAXDEPTH. A depth-limited Grover search
  costs $N D^2 W / \text{MAXDEPTH}$ gates and needs vast parallelism: $P$ machines give a
  speed-up of only $\sqrt P$, for total work $\sqrt{NP}$.
- Lattice schemes are measured by the BKZ block size $\beta$ needed to find the secret, and
  core-SVP gives $0.292\beta$ bits classically. Twenty lines of Python reproduce ML-KEM's
  published figures.
- Memory, multiple targets, proof tightness and decryption failures all move the numbers.
  For ML-KEM-512, NIST's 2023 estimates were about $2^{147}$ gates in the RAM model and
  about $2^{160}$ with memory costed, against $2^{143}$ for category 1; the dispute was over
  a line inside the error bars.
- Margins have been lost to hardware (DES), algorithms (RSA), structural cryptanalysis
  (MD5, SHA-1) and new mathematics (Rainbow, SIKE). Margins answer the first three;
  only diversity and hybrids answer the fourth.
- Data that must stay secret for decades needs category 5 key exchange and AES-256,
  chosen on the day it is sent; signatures can be renewed.
- ML-KEM-768 and ML-DSA-65 are the general defaults; category 5 sets are for policy or very
  long-lived data; SLH-DSA is the conservative choice for signatures.
- Security levels are only as good as the attacks known; Rainbow and SIKE fell to new ideas,
  which is why the standards rely on more than one family.

**Next:** [Chapter 3](03-KEMs-and-Signatures.md), what the new schemes actually provide:
key-encapsulation mechanisms, signatures, and the security definitions behind them.

## Further reading

- NIST, *Submission Requirements and Evaluation Criteria for the Post-Quantum
  Cryptography Standardization Process* (December 2016), §4.A on security categories.
- NIST SP 800-57 Part 1 Rev. 5, *Recommendation for Key Management* (2020), for the
  classical strength tables.
- Christof Zalka, "Grover's quantum searching algorithm is optimal", *Physical Review A*
  60 (1999).
- Erdem Alkim, Léo Ducas, Thomas Pöppelmann and Peter Schwabe, "Post-quantum key exchange,
  a new hope" (USENIX Security 2016).
- Anja Becker, Léo Ducas, Nicolas Gama and Thijs Laarhoven, "New directions in nearest
  neighbor searching with applications to lattice sieving" (SODA 2016).
- Thijs Laarhoven, *Search problems in cryptography* (PhD thesis, Eindhoven, 2015).
- Martin Albrecht, Rachel Player and Sam Scott, "On the concrete hardness of Learning with
  Errors", *Journal of Mathematical Cryptology* 9 (2015), and the lattice estimator.
- Léo Ducas, "Shortest Vector from Lattice Sieving: a Few Dimensions for Free" (EUROCRYPT
  2018).
- Martin Albrecht, Vlad Gheorghiu, Eamonn Postlethwaite and John Schanck, "Estimating
  quantum speedups for lattice sieves" (ASIACRYPT 2020).
- Samuel Jaques, Michael Naehrig, Martin Roetteler and Fernando Virdia, "Implementing
  Grover oracles for quantum key search on AES and LowMC" (EUROCRYPT 2020).
- Roberto Avanzi and others, *CRYSTALS-Kyber Algorithm Specifications and Supporting
  Documentation*, version 3.02 (2021), §5 on security estimates.
- FIPS 203, *Module-Lattice-Based Key-Encapsulation Mechanism Standard* (August 2024),
  for the parameter sets, sizes and failure rates.
- NIST IR 8413, *Status Report on the Third Round of the NIST Post-Quantum Cryptography
  Standardization Process* (2022).
- Daniel J. Bernstein, "The inability to count correctly: Debunking NIST's calculation of
  the Kyber-512 security level" (blog, October 2023), and the replies on NIST's pqc-forum.
- NIST, *FAQ on Kyber512* (December 2023); Ray Perlner, "Update on category 1 security",
  NIST pqc-forum (August 2020).
- MATZOV, *Report on the Security of LWE: Improved Dual Lattice Attack* (2022); Léo Ducas
  and Ludo Pulles, "Does the dual-sieve attack on learning with errors even work?" (CRYPTO
  2023); Léo Ducas, "Estimating the hidden overheads in the BDGL lattice sieving
  algorithm" (PQCrypto 2022).
- Léo Ducas, Marc Stevens and Wessel van Woerden, "Advanced lattice sieving on GPUs, with
  tensor cores" (EUROCRYPT 2021).
- Michael Wiener, "The full cost of cryptanalytic attacks", *Journal of Cryptology* (2004).
- Joan Boyar and René Peralta, "A new combinational logic minimization technique with
  applications to cryptology" (SEA 2010).
- Arjen Lenstra and Eric Verheul, "Selecting cryptographic key sizes", *Journal of
  Cryptology* (2001).
- Whitfield Diffie and Martin Hellman, "Exhaustive cryptanalysis of the NBS Data
  Encryption Standard", *Computer* (1977); Electronic Frontier Foundation, *Cracking DES*
  (1998).
- Fabrice Boudot and others, "Comparing the difficulty of factorization and discrete
  logarithm: a 240-digit experiment" (CRYPTO 2020); Luke Valenta and others, "Factoring as
  a service" (Financial Cryptography 2016).
- Marc Stevens and others, "The first collision for full SHA-1" (CRYPTO 2017); Gaëtan
  Leurent and Thomas Peyrin, "SHA-1 is a shambles" (USENIX Security 2020).
- Andrey Bogdanov, Dmitry Khovratovich and Christian Rechberger, "Biclique cryptanalysis of
  the full AES" (ASIACRYPT 2011).
- RFC 4998, *Evidence Record Syntax (ERS)* (2007).
