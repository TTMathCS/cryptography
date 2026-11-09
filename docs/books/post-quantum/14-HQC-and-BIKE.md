# 14. HQC and BIKE

*Classic McEliece's megabyte keys come from using codes with no exploitable structure. Can
codes have small keys and still be safe? The two code-based KEMs that reached NIST's fourth
round say yes, with a twist: they use structured (quasi-cyclic) codes, and they decode
probabilistically, so decryption occasionally fails. That small chance of failure turns out to
be the heart of their security analysis. On 11 March 2025 NIST selected HQC as its second KEM
standard, a backup to ML-KEM built on a different problem; it will be FIPS 207. This chapter
builds toy versions of both HQC and BIKE, then builds HQC's real error-correcting code (a
Reed-Solomon code wrapped around a repeated Reed-Muller code) and runs it at HQC-1's real size,
derives HQC's parameters from its security and failure targets, follows the 2025 repair of
HQC's chosen-ciphertext transform, and watches BIKE's Black-Gray-Flip decoder go from failing
most of the time to almost never as its code grows, which is exactly the measurement BIKE's
failure-rate argument had to extrapolate from.*

!!! abstract "In this chapter"
    **You will learn:**

    - quasi-cyclic codes, and how they shrink public keys to a few kilobytes;
    - HQC's design: a noisy Diffie-Hellman-like exchange decoded by a public code;
    - how HQC's concatenated Reed-Muller and Reed-Solomon code corrects a third of all bits;
    - how HQC's sizes, weights and failure rates follow from its security targets;
    - how HQC-PKE becomes HQC-KEM, and the salt problem fixed in August 2025;
    - BIKE's design: QC-MDPC codes, bit flipping and the Black-Gray-Flip decoder;
    - why decryption failures matter, and why BIKE's failure rate was hard to pin down;
    - why NIST chose HQC, the implementation bugs found along the way, and the status of FIPS 207.

    **You need:** [Chapter 13](13-Code-Based-Encryption-McEliece.md) (syndrome decoding and
    McEliece), [Chapter 7](07-Rings-Modules-and-the-NTT.md) (polynomial rings) and
    [Chapter 3](03-KEMs-and-Signatures.md) (the Fujisaki-Okamoto transform). The theory of
    codes, including Reed-Solomon decoding, is in the Mathematics book's
    [Chapter 18](../mathematics/18-Error-Correcting-Codes.md).

    **Levels:** §14.1 and §14.2 are for beginners; §14.3 to §14.5, §14.7, §14.9 and §14.10
    are intermediate; §14.6, §14.8, §14.11 and §14.12 are expert.

## 14.1 The problem

*Level: beginner.*

NIST wanted a second KEM that does not depend on lattices, so that a breakthrough against
Module-LWE would not leave the world with nothing. Classic McEliece is the obvious candidate
but its public key is hundreds of kilobytes. The two other code-based finalists, BIKE and HQC,
take the path that ML-KEM took with lattices: replace a big random matrix with a structured
one described by a single vector.

A **quasi-cyclic** code's parity-check matrix is made of circulant blocks, each one a vector
and its cyclic shifts. Just as in Chapter 7, a circulant block is multiplication by a
polynomial, here in $\mathbb{F}_2[x]/(x^r - 1)$, so one block of $r$ bits replaces $r^2$. Public
keys shrink from hundreds of kilobytes to a few kilobytes. The underlying problem becomes
**quasi-cyclic syndrome decoding**: given a few polynomials, find sparse ones that explain
them. Like Ring-LWE, it is a structured version of a problem with a long history, and no
attack has used the structure to do better than generic decoding by more than small factors
(a square-root-of-$r$ gain from the shifts, which the parameters include).

The other change is the decoder. Classic McEliece's Goppa decoder corrects every pattern of
$t$ errors. HQC and BIKE use decoders that succeed only with high probability. The parameters
push the failure rate below $2^{-128}$, but proving that is hard, and the difference between
"very rare" and "rare enough to be safe" decided the competition.

### Circulants by hand

Take $r = 5$ and the polynomial $a = 1 + x^2$, the bit vector $10100$. Its **circulant** matrix
has $a$ as its first row and each later row shifted one place to the right, with the bit that
falls off the end coming back at the start:

$$
A = \begin{pmatrix}
1&0&1&0&0\\ 0&1&0&1&0\\ 0&0&1&0&1\\ 1&0&0&1&0\\ 0&1&0&0&1
\end{pmatrix}.
$$

Multiply the row vector $b = 11010$ (the polynomial $1 + x + x^3$) by $A$. Over
$\mathbb{F}_2$ that means adding, bit by bit, the rows of $A$ where $b$ has a one: rows 0, 1
and 3.

$$
10100 \oplus 01010 \oplus 10010 = 01100 .
$$

Now multiply the polynomials instead:
$(1 + x^2)(1 + x + x^3) = 1 + x + x^3 + x^2 + x^3 + x^5 = 1 + x + x^2 + x^5$, because the two
$x^3$ terms cancel. Modulo $x^5 - 1$ the term $x^5$ becomes $1$, which cancels the constant,
leaving $x + x^2$: the vector $01100$ again. The matrix product and the polynomial product are
the same computation, so a key that is "a circulant matrix" can be stored, sent and multiplied
as one polynomial of $r$ bits. For BIKE-L1's $r = 12{,}323$ that is 1.5 kilobytes instead of
19 megabytes per block.

Division works too, when it exists. BIKE's public key is $h = h_1 h_0^{-1}$, so it needs the
inverse of a sparse polynomial. In the same ring, $h_0 = 1 + x + x^2$ has the inverse
$x + x^2 + x^4$: their product is
$x + x^2 + x^4 + x^2 + x^3 + x^5 + x^3 + x^4 + x^6 = x + x^5 + x^6$, and with $x^5 = 1$ and
$x^6 = x$ that is $x + 1 + x = 1$. A polynomial with an even number of ones is never
invertible here, since it vanishes at $x = 1$ and so shares the factor $x + 1$ with $x^r - 1$.
That is why BIKE's secret blocks have an odd weight (71 ones for BIKE-L1).

<figure class="mars-fig">
<svg viewBox="0 0 640 270" width="640" role="img" aria-label="A five by five circulant matrix whose rows are shifts of 10100, next to a parity-check matrix made of two large circulant blocks drawn as wrapped diagonals" fill="currentColor" font-size="14">
  <text x="105" y="22" text-anchor="middle" font-weight="bold">circulant of a = 1 + x²</text>
  <g stroke="currentColor" stroke-width="1">
    <rect x="30" y="35" width="30" height="30" fill-opacity=".55"/><rect x="60" y="35" width="30" height="30" fill="none"/><rect x="90" y="35" width="30" height="30" fill-opacity=".55"/><rect x="120" y="35" width="30" height="30" fill="none"/><rect x="150" y="35" width="30" height="30" fill="none"/>
    <rect x="30" y="65" width="30" height="30" fill="none"/><rect x="60" y="65" width="30" height="30" fill-opacity=".55"/><rect x="90" y="65" width="30" height="30" fill="none"/><rect x="120" y="65" width="30" height="30" fill-opacity=".55"/><rect x="150" y="65" width="30" height="30" fill="none"/>
    <rect x="30" y="95" width="30" height="30" fill="none"/><rect x="60" y="95" width="30" height="30" fill="none"/><rect x="90" y="95" width="30" height="30" fill-opacity=".55"/><rect x="120" y="95" width="30" height="30" fill="none"/><rect x="150" y="95" width="30" height="30" fill-opacity=".55"/>
    <rect x="30" y="125" width="30" height="30" fill-opacity=".55"/><rect x="60" y="125" width="30" height="30" fill="none"/><rect x="90" y="125" width="30" height="30" fill="none"/><rect x="120" y="125" width="30" height="30" fill-opacity=".55"/><rect x="150" y="125" width="30" height="30" fill="none"/>
    <rect x="30" y="155" width="30" height="30" fill="none"/><rect x="60" y="155" width="30" height="30" fill-opacity=".55"/><rect x="90" y="155" width="30" height="30" fill="none"/><rect x="120" y="155" width="30" height="30" fill="none"/><rect x="150" y="155" width="30" height="30" fill-opacity=".55"/>
  </g>
  <text x="190" y="55">row 0 = a</text>
  <text x="190" y="85">shift 1</text>
  <text x="190" y="115">shift 2</text>
  <text x="190" y="145">shift 3</text>
  <text x="190" y="175">shift 4</text>
  <text x="105" y="210" text-anchor="middle">25 bits of matrix,</text>
  <text x="105" y="228" text-anchor="middle">5 bits of key</text>
  <text x="445" y="22" text-anchor="middle" font-weight="bold">BIKE parity check H = [ H₀ | H₁ ]</text>
  <rect x="300" y="35" width="140" height="140" fill-opacity=".06" stroke="currentColor"/>
  <rect x="450" y="35" width="140" height="140" fill-opacity=".06" stroke="currentColor"/>
  <g stroke="currentColor" stroke-width="2">
    <line x1="300" y1="35" x2="440" y2="175"/><line x1="350" y1="35" x2="440" y2="125"/><line x1="300" y1="125" x2="350" y2="175"/><line x1="395" y1="35" x2="440" y2="80"/><line x1="300" y1="80" x2="395" y2="175"/>
    <line x1="470" y1="35" x2="590" y2="155"/><line x1="450" y1="155" x2="470" y2="175"/><line x1="530" y1="35" x2="590" y2="95"/><line x1="450" y1="95" x2="530" y2="175"/><line x1="565" y1="35" x2="590" y2="60"/><line x1="450" y1="60" x2="565" y2="175"/>
  </g>
  <text x="370" y="195" text-anchor="middle">h₀: r bits, d ones</text>
  <text x="520" y="195" text-anchor="middle">h₁: r bits, d ones</text>
  <text x="445" y="228" text-anchor="middle">each block is one sparse polynomial;</text>
  <text x="445" y="246" text-anchor="middle">BIKE-L1: r = 12,323, d = 71</text>
</svg>
<figcaption>Figure 14.1. Quasi-cyclic structure. A circulant block is fixed by its first row, so it is stored and multiplied as one polynomial in F₂[x]/(xʳ − 1). BIKE's secret parity-check matrix is two sparse circulant blocks; HQC's public key is two dense polynomials h and s.</figcaption>
</figure>

### Why the ring size is a prime

Both schemes choose $r$ (BIKE) or $n$ (HQC) to be a prime for which 2 is a primitive root, that
is, the powers of 2 run through every nonzero residue before returning to 1. For such a prime,
$x^r - 1$ factors over $\mathbb{F}_2$ as $(x - 1)$ times one irreducible polynomial of degree
$r - 1$, and nothing else. A ring with many small factors would let an attacker map the problem
into smaller rings, solve it there and lift the answer back, the code-based cousin of the
subfield attacks that worry lattice designers. With one big factor there is nowhere smaller to
go. All of BIKE's $r$ (12,323, 24,659 and 40,973) and HQC's $n$ (17,669, 35,851 and 57,637)
have this property; §14.6 shows how HQC picks its $n$ as the first such prime above the length
of its code.

## 14.2 HQC: noisy codewords

*Level: beginner.*

HQC (Hamming Quasi-Cyclic; Aguilar Melchor, Aragon, Bettaieb, Bidoux, Blazy, Deneuville,
Gaborit, Persichetti, Zémor and others) has the same shape as K-PKE in ML-KEM (Chapter 8), with
sparse binary polynomials instead of small integer ones:

- **Key generation.** A random public polynomial $h$; secret sparse $x$ and $y$. Publish $s = x +
  h\,y$.
- **Encryption** of a message $m$: encode it with a public error-correcting code $C$ to a
  codeword $mG$. Pick sparse $r_1, r_2, e$. Send $u = r_1 + h\,r_2$ and $v = mG + s\,r_2 + e$.
- **Decryption.** Compute $v - u\,y = mG + x\,r_2 - r_1\,y + e$. The extra terms are products of
  sparse polynomials, so they are fairly sparse: a noisy codeword. Decode it with $C$'s
  decoder.

The secret key never touches the decoder: $C$ is public and has no hidden structure. Security
rests on $s$, $u$ and $v$ looking random, which is quasi-cyclic syndrome decoding. The decoder
only has to handle the noise, which is heavy: the two products $x\,r_2$ and $r_1\,y$ together
have up to $2\,w\,w_r$ terms (about 9,900 for HQC-1, where the secrets have weight $w = 66$ and
the encryption noise $w_r = 75$), and after cancellations about a third of all bits end up
flipped (§14.6 computes the exact figure). Real HQC uses a strong concatenated code (a
Reed-Solomon outer code with a duplicated Reed-Muller inner code) to correct that much noise;
§14.5 builds it.

**Code it.** A toy HQC with $n = 2{,}003$ and a 125-fold repetition code for a 16-bit message.

```python
# A toy HQC: the structure of NIST's HQC with a simple repetition code in place of its
# concatenated Reed-Muller and Reed-Solomon codes. Polynomials over GF(2) mod x^n - 1 are
# Python integers (bit i = coefficient of x^i).
import random
random.seed(2025)
N, K, W, WR = 2003, 16, 15, 15           # ring size (prime), message bits, secret and noise weights
REP = N // K                             # each message bit repeated 125 times
MASK = (1 << N) - 1

def rot(a, i):                           # a * x^i mod x^n - 1
    return ((a << i) | (a >> (N - i))) & MASK
def mul(a, sparse):                      # a * b, with b given by its list of 1-positions
    out = 0
    for i in sparse:
        out ^= rot(a, i)
    return out
def sparse(w):                           # w random positions
    return random.sample(range(N), w)
def poly(positions):
    return sum(1 << i for i in positions)

def keygen():
    h = random.getrandbits(N)            # public random polynomial
    x, y = sparse(W), sparse(W)          # secret sparse polynomials
    s = poly(x) ^ mul(h, y)              # s = x + h*y: a "quasi-cyclic syndrome decoding" instance
    return (h, s), y

def encode(m):                           # repetition code: bit j fills positions j*REP ... (j+1)*REP-1
    return sum(((1 << REP) - 1) << (j * REP) for j in range(K) if m >> j & 1)
def decode(v):                           # majority vote in each block
    return sum(1 << j for j in range(K) if bin(v >> (j * REP) & ((1 << REP) - 1)).count("1") > REP // 2)

def encrypt(pk, m):
    h, s = pk
    r1, r2, e = sparse(WR), sparse(WR), sparse(WR)
    u = poly(r1) ^ mul(h, r2)
    v = encode(m) ^ mul(s, r2) ^ poly(e)
    return u, v

def decrypt(y, c):
    u, v = c
    noisy = v ^ mul(u, y)                # = mG + x*r2 + r1*y + e   (signs vanish in GF(2))
    return decode(noisy), noisy

pk, sk = keygen()
m = 0b1011001110001111
c = encrypt(pk, m)
got, noisy = decrypt(sk, c)
noise = noisy ^ encode(m)
print("decrypted correctly:", got == m)
print("noise weight:", bin(noise).count("1"), "of", N, "bits; worst block:",
      max(bin(noise >> (j * REP) & ((1 << REP) - 1)).count("1") for j in range(K)), "of", REP)
```

It prints:

```text
decrypted correctly: True
noise weight: 379 of 2003 bits; worst block: 30 of 125
```

The noise covers almost a fifth of the bits, and the worst block of 125 has about a quarter
flipped: majority voting still wins. A repetition code wastes most of its bits, which is why
real HQC uses the concatenated code, and why its ciphertexts are larger than its public keys.

| | HQC-1 | HQC-3 | HQC-5 |
|---|---|---|---|
| NIST category | 1 | 3 | 5 |
| $n$ | 17,669 | 35,851 | 57,637 |
| public key | 2,241 B | 4,514 B | 7,237 B |
| ciphertext | 4,433 B | 8,978 B | 14,421 B |
| shared secret | 32 B | 32 B | 32 B |

*Table 14.1. HQC parameter sets from the specification of 22 August 2025 (the round 4 version
that NIST benchmarked had, for HQC-1, a 2,249-byte public key and a 4,497-byte ciphertext).
FIPS 207 may change details; as of November 2026 no public draft exists to check against.*

Next to ML-KEM-768 (1,184-byte key, 1,088-byte ciphertext), HQC-3 sends about six times as
many bytes in a handshake and is several times slower, but it rests on a different problem.

## 14.3 BIKE: QC-MDPC codes

*Level: intermediate.*

BIKE (Bit Flipping Key Encapsulation; Aragon, Barreto, Bettaieb, Bidoux, Blazy, Deneuville,
Gaborit, Ghosh, Gueron, Güneysu, Aguilar Melchor, Misoczki, Persichetti, Sendrier, Tillich,
Vasseur and Zémor) goes back to McEliece's own design: a secret code with an efficient decoder,
disguised. The secret code is a **QC-MDPC** code (quasi-cyclic, moderate-density parity check;
Misoczki, Tillich, Sendrier and Barreto, 2013). Its parity-check matrix is two circulant blocks
$h_0, h_1$, each a sparse polynomial with about $\sqrt{r}$ ones out of $r$. Such a code is
decoded by **bit flipping**, the method Robert Gallager invented for low-density codes in 1962.

- **Key generation.** Secret sparse $h_0, h_1$. Public $h = h_1 h_0^{-1}$ in $\mathbb{F}_2[x]/(x^r
  - 1)$. Multiplying the parity checks by $h_0^{-1}$ hides their sparsity: $h$ looks random.
- **Encapsulation.** Pick a random error $(e_0, e_1)$ of total weight $t$ and send the syndrome
  $c = e_0 + e_1 h$. The key is a hash of the error.
- **Decapsulation.** Multiply by $h_0$: $c\,h_0 = e_0 h_0 + e_1 h_1$, the syndrome under the
  sparse secret code. Decode by bit flipping.

**Bit flipping.** Each error bit touches about $w/2$ parity checks. Count, for every bit, how
many of its checks are unsatisfied by the current syndrome. Bits with many unsatisfied checks
are probably errors: flip them, update the syndrome, repeat. With sparse checks and few errors,
the counts separate errors from non-errors cleanly. With too many errors, they blur, and the
decoder can stall or go wrong.

**Code it.** A toy BIKE with $r = 587$ and 15 ones per block, decoding 200 encapsulations at
each of four error weights.

```python
# A toy BIKE: a QC-MDPC code with a bit-flipping decoder (no Fujisaki-Okamoto layer).
import random
random.seed(2017)
R, W = 587, 30                          # block size (prime), private weight (15 per block)
MASK = (1 << R) - 1
def rot(a, i):  return ((a << i) | (a >> (R - i))) & MASK
def mul(a, positions):
    out = 0
    for i in positions:
        out ^= rot(a, i)
    return out
def poly(positions):  return sum(1 << i for i in positions)

def pmod_inv(a):
    """Inverse of a in GF(2)[x]/(x^R - 1), by the extended Euclidean algorithm on bit polynomials."""
    def deg(p): return p.bit_length() - 1
    r0, r1, s0, s1 = (1 << R) | 1, a, 0, 1             # x^R - 1 = x^R + 1 over GF(2)
    while r1:
        q = 0
        while r0 and deg(r0) >= deg(r1):
            shift = deg(r0) - deg(r1)
            q ^= 1 << shift
            r0 ^= r1 << shift
        r0, r1 = r1, r0
        prod = 0                                       # s0 - q*s1
        for i in range(q.bit_length()):
            if q >> i & 1:
                prod ^= s1 << i
        s0, s1 = s1, s0 ^ prod
    if r0 != 1:
        return None
    out = 0                                            # reduce s0 mod x^R - 1
    while s0:
        out ^= s0 & MASK
        s0 >>= R
    return out

def keygen():
    while True:
        h0, h1 = random.sample(range(R), W // 2), random.sample(range(R), W // 2)
        inv = pmod_inv(poly(h0))
        if inv is not None:
            return mul(inv, h1), (h0, h1)              # public h = h1 / h0

def encaps(h):                                     # uses the global error count T
    e = random.sample(range(2 * R), T)
    e0, e1 = poly([i for i in e if i < R]), poly([i - R for i in e if i >= R])
    return (e0, e1), e0 ^ mul(h, [i for i in range(R) if e1 >> i & 1])

def bitflip(sk, c, rounds=10):
    h0, h1 = sk
    s = mul(c, h0)                                     # syndrome s = e0*h0 + e1*h1
    e0 = e1 = 0
    for _ in range(rounds):
        if s == 0:
            return e0, e1
        # count, for each error position, how many unsatisfied checks it touches
        upc0 = [sum(s >> ((j + i) % R) & 1 for i in h0) for j in range(R)]
        upc1 = [sum(s >> ((j + i) % R) & 1 for i in h1) for j in range(R)]
        th = max(max(upc0), max(upc1)) - 1             # flip the most suspicious bits
        for j in range(R):
            if upc0[j] >= th:
                e0 ^= 1 << j; s ^= rot(poly(h0), j)
            if upc1[j] >= th:
                e1 ^= 1 << j; s ^= rot(poly(h1), j)
    return None

h, sk = keygen()
for T in (18, 24, 30, 36):                             # more errors: closer to the decoder's limit
    fails = 0
    for trial in range(200):
        e, c = encaps(h)
        if bitflip(sk, c) != e:
            fails += 1
    print("errors", T, "-> decoding failures:", fails, "of 200")
```

It prints:

```text
errors 18 -> decoding failures: 0 of 200
errors 24 -> decoding failures: 15 of 200
errors 30 -> decoding failures: 186 of 200
errors 36 -> decoding failures: 200 of 200
```

The failure rate rises steeply with the number of errors: none at 18, a few percent at 24,
nearly all at 30. Real BIKE-L1 uses $r = 12{,}323$, $w = 142$ and $t = 134$, and an improved
decoder (Black-Gray-Flip, Drucker, Gueron and Kostic, 2020), placing it far down that curve. Its
public key is 1,541 bytes and its ciphertext 1,573: the smallest of the code-based KEMs, close
to ML-KEM-512. The decoder above finds its threshold by scanning for the largest count, which
is simple but takes a data-dependent number of rounds; §14.8 replaces it with the fixed-schedule
decoder of BIKE's round 4 specification.

!!! note "Life story: BIKE"
    **Born:** 2017, as a NIST submission merging several QC-MDPC proposals, on top of
    Misoczki, Tillich, Sendrier and Barreto's MDPC-McEliece (2013) · **Purpose:** the smallest
    code-based KEM, decoded by bit flipping · **Helped:** a decade of decoder research
    (Black-Gray-Flip, failure-rate models, weak-key and error-floor studies) · **Status:** an
    alternate in round 3 (2020), in round 4 (2022), not selected in March 2025 (NIST IR 8545);
    research on its failure rate continues.

## 14.4 Why failures matter

*Level: intermediate.*

A KEM that fails once in a million decapsulations sounds harmless: the handshake fails and is
retried. The danger is what a failure reveals. In BIKE, whether the bit-flipping decoder fails
depends on how the error pattern interacts with the secret $h_0, h_1$. Guo, Johansson and
Stankovski showed (ASIACRYPT 2016) that an attacker who sends many chosen error patterns to a
server holding a fixed QC-MDPC key, and observes which ones cause failures, can recover the
distances between the ones of $h_0$ and from them the whole key. Their attack needed a failure
rate around $2^{-20}$ or more and was a real threat to early QC-MDPC proposals with static keys.

Two defenses exist, and NIST's process tested both:

- **Use ephemeral keys only**, so no key lives long enough to be probed. BIKE's early versions
  did this.
- **Make failures negligible** ($2^{-128}$ for category 1) and add the Fujisaki-Okamoto
  transform of Chapter 3, which stops the attacker from choosing error patterns. Then the key
  can be static. But the FO security proof needs the failure rate to be *proven* negligible,
  not just measured.

That last word is the problem. Nobody can simulate $2^{128}$ decodings. BIKE's designers measured
failure rates at smaller sizes and extrapolated, with careful models of the decoder (Sendrier
and Vasseur, 2019, and later work). The extrapolation is plausible, but it rests on assumptions
about the decoder's behavior far beyond what can be observed, and on the absence of "weak keys"
whose failure rate is much higher (several classes were found and excluded). HQC's decoder is a
standard algebraic one applied to noise whose distribution can be computed, so its failure rate
can be bounded analytically.

### How small is small enough

The bound that comes out of the FO proofs ([Chapter 3, §3.5](03-KEMs-and-Signatures.md#35-the-fujisaki-okamoto-transform)
and [§3.6](03-KEMs-and-Signatures.md#36-decryption-failures-as-a-security-property)) charges the
attacker's advantage roughly $q \cdot \delta$, where $q$ is the number of decapsulation and hash
queries and $\delta$ the failure rate. Put in real numbers. A server that answers $2^{30}$
decapsulations a year (34 a second, around the clock) for 30 years sees about $2^{35}$
ciphertexts. With $\delta = 2^{-20}$, the rate of the early QC-MDPC parameters, it would see
about $2^{15}$, some 33,000, failures: plenty for a reaction attack. With $\delta = 2^{-64}$ it
would most likely see none, yet the proof still could not exclude an attacker who spends
$2^{64}$ hash computations searching offline for ciphertexts with unusually heavy noise (the
"failure boosting" of Chapter 3). The proof only gives the full category 1 guarantee when
$\delta$ is near $2^{-128}$, because the attacker's offline work counts against it too. That is
why the targets are $2^{-128}$, $2^{-192}$ and $2^{-256}$ for categories 1, 3 and 5, matching the
security levels, rather than "rare enough that nobody will notice".

The bound must also hold for every key the scheme can generate. An average over random keys
says nothing about a rare key that fails a million times more often, and a static-key attacker
gets to pick the server with that key. HQC can bound its decoder's failure probability for every key because its decoder
never sees the key. BIKE's decoder runs on the secret code itself, so its failure rate is a
property of each key, and the argument has to cover the worst keys as well as the typical one.

**Mars.** The settlement's relay to Earth is a case where static keys are hard to avoid. Every
fresh key exchange with Earth costs a round trip of 6 to 44 minutes, so a ground station that
wants to send a command at once encapsulates to the relay's long-lived public key and sends the
ciphertext with the command, without waiting for a handshake (the one-pass use of a KEM in
[Chapter 3, §3.10](03-KEMs-and-Signatures.md#310-building-with-kems-one-pass-encryption-and-authenticated-key-exchange)).
That key then decapsulates every ciphertext anyone sends it for months, which is exactly the
situation of a reaction attack. Only a KEM with a proven negligible failure rate and the full FO
transform is acceptable there.

## 14.5 The concatenated code: Reed-Muller inside, Reed-Solomon outside

*Level: intermediate.*

HQC's decoder faces a binary channel that flips about one bit in three. That is far worse than
any channel engineers usually design for, and the toy's repetition code shows the brute-force
answer: repeat each bit until the majority is safe. Shannon's theorem gives the other extreme.
A binary channel with flip probability $p$ has capacity $1 - H(p)$, where
$H(p) = -p\log_2 p - (1-p)\log_2(1-p)$; for $p = 0.338$ that is
$1 - 0.923 = 0.077$, so in principle 128 message bits could ride on about 1,700 channel bits.
HQC-1 uses 17,664, about ten times the Shannon limit. The gap is the price of three demands that
capacity-approaching codes do not meet: decoding must take the same time for every input, its
failure probability must be computable down to $2^{-128}$, and it must be fast in software.
HQC's answer, chosen in 2020 in place of the BCH and repetition codes of its first versions,
is the oldest trick of deep-space engineering: **concatenation**, an inner code that turns a
very noisy bit channel into a mildly noisy byte channel, and an outer code that cleans up the
bytes. David Forney described concatenated codes in 1966; Voyager sent its pictures from
Uranus and Neptune with a Reed-Solomon outer code around a convolutional inner code.

### The inner code: Reed-Muller RM(1,7)

The first-order Reed-Muller code RM(1, $m$) (David Muller and Irving Reed, both 1954) encodes
$m + 1$ bits as the truth table of an affine function on $m$ bits. For a message
$(a_0, \ldots, a_{m-1}, a_m)$, codeword bit number $j$, for $j = 0, \ldots, 2^m - 1$ with binary
digits $j_0, \ldots, j_{m-1}$, is

$$
c_j = a_m \oplus a_0 j_0 \oplus a_1 j_1 \oplus \cdots \oplus a_{m-1} j_{m-1} .
$$

Any two different affine functions agree on exactly half the inputs or on none (when they are
complements), so the code has length $2^m$, $m + 1$ message bits and minimum distance
$2^{m-1}$. HQC uses $m = 7$: one byte becomes 128 bits, and any two codewords differ in at least
64 places. Then it **duplicates** the 128 bits, 3 times for HQC-1 and 5 times for HQC-3 and
HQC-5, so each byte becomes 384 or 640 bits with minimum distance 192 or 320.

A decoder that only corrects up to half the minimum distance would handle 95 errors in 384
bits. At HQC-1's bit error rate the expected number is 130, so HQC needs **maximum likelihood**
decoding: find the codeword closest to the received word, among all 256. The fast Hadamard
transform does that in one sweep. Map each received bit to $+1$ (for 0) or $-1$ (for 1), adding
the copies first, and compute

$$
F(u) = \sum_{j} f(j)\,(-1)^{u \cdot j}
$$

for every $u$ in $\{0, \ldots, 2^m - 1\}$. $F(u)$ is the number of agreements minus the number of
disagreements with the codeword for $a = u$, $a_m = 0$; its negative is the score of the
complement, $a_m = 1$. The largest $|F(u)|$ wins, and its sign gives the last bit. The transform
takes $m$ rounds of $2^{m-1}$ butterflies, an addition and a subtraction each: 448 butterflies
for RM(1,7), the same work for every input, which is what a constant-time implementation needs.
In 1971 Mariner 9, the first spacecraft to orbit Mars, sent its pictures home in the Reed-Muller
code RM(1,5) (32 bits for each 6-bit pixel), decoded on Earth by a hardware Hadamard transform
nicknamed the Green machine.

### By hand: decoding RM(1,3)

Take RM(1,3), 8-bit codewords. The message $a = (1, 0, 1)$, $a_3 = 0$ gives
$c_j = j_0 \oplus j_2$, so for $j = 0, \ldots, 7$ the codeword is $0\,1\,0\,1\,1\,0\,1\,0$.
The channel flips bit 6, and $0\,1\,0\,1\,1\,0\,0\,0$ arrives. As signs,
$f = (+1, -1, +1, -1, -1, +1, +1, +1)$.

The fast transform combines pairs at distance 1, then 2, then 4, replacing $(x, y)$ by
$(x + y, x - y)$:

| stage | values |
|---|---|
| start | $+1, -1, +1, -1, -1, +1, +1, +1$ |
| pairs at distance 1 | $0, 2, 0, 2, 0, -2, 2, 0$ |
| pairs at distance 2 | $0, 4, 0, 0, 2, -2, -2, -2$ |
| pairs at distance 4 | $2, 2, -2, -2, -2, 6, 2, 2$ |

The largest magnitude is $F(5) = +6$. Five is $101$ in binary, read from the low bit:
$a_0 = 1$, $a_1 = 0$, $a_2 = 1$, and the sign is positive, so $a_3 = 0$. The message is
recovered. The 6 says the received word agrees with the winning codeword in 7 places and
disagrees in 1; every other codeword scores $\pm 2$, at distance 3 or 5. With a duplicated code
the copies are added before the transform, so a bit that is wrong in one copy and right in two
counts against the truth only once.

### The outer code: Reed-Solomon over GF(2⁸)

The 16 message bytes of HQC-1 (24 for HQC-3, 32 for HQC-5) are first encoded with a
**shortened Reed-Solomon code** over $\mathbb{F}_{256}$, built with the field polynomial
$x^8 + x^4 + x^3 + x^2 + 1$. Reed-Solomon codes (Irving Reed and Gustave Solomon, 1960) are
evaluation codes: $k$ symbols define a polynomial of degree below $k$, and its values at $n_1$
points form the codeword, so any two codewords differ in at least $n_1 - k + 1$ symbols. HQC-1's
code is $[46, 16, 31]$: 46 bytes, 16 of message, minimum distance 31, so it corrects any
$\delta = 15$ wrong bytes. HQC-3 uses $[56, 24, 33]$ ($\delta = 16$) and HQC-5 $[90, 32, 59]$
($\delta = 29$). In practice the encoder is systematic: it appends $2\delta$ check bytes
computed by dividing by the generator polynomial $g(x) = \prod_{j=1}^{2\delta}(x - \alpha^j)$,
where $\alpha$ is a generator of the multiplicative group, the element $x$ of the field.

Decoding errors at unknown positions is the subject of the Mathematics book's
[§18.6](../mathematics/18-Error-Correcting-Codes.md#186-reed-solomon-codes-decoding-errors);
the code below uses the textbook steps: compute the $2\delta$ syndromes $S_j = c(\alpha^j)$,
find the error locator polynomial with the Berlekamp-Massey algorithm, find its roots by trying
every position (the Chien search), and compute each error value with Forney's formula.

Concatenation ties the two together. Each Reed-Solomon byte becomes one Reed-Muller block, so a
Reed-Muller decoding failure, however many bits were involved, costs the outer code exactly one
symbol. The inner decoder makes a mistake perhaps once in a couple of thousand blocks; the outer
code needs 16 of 46 such mistakes in the same ciphertext before it gives up.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="HQC-1's concatenated code: 16 bytes become 46 Reed-Solomon bytes, each byte becomes 384 Reed-Muller bits, 17,664 bits in all; decoding runs the Hadamard decoder on each block and then the Reed-Solomon decoder" fill="currentColor" font-size="13">
  <text x="10" y="18" font-weight="bold">encode</text>
  <rect x="10" y="28" width="135" height="80" rx="6" fill-opacity=".08" stroke="currentColor"/>
  <text x="77" y="55" text-anchor="middle" font-weight="bold">message</text>
  <text x="77" y="75" text-anchor="middle">16 bytes</text>
  <text x="77" y="93" text-anchor="middle">(128 bits)</text>
  <rect x="170" y="28" width="135" height="80" rx="6" fill-opacity=".08" stroke="currentColor"/>
  <text x="237" y="55" text-anchor="middle" font-weight="bold">Reed-Solomon</text>
  <text x="237" y="75" text-anchor="middle">[46, 16] over GF(2⁸)</text>
  <text x="237" y="93" text-anchor="middle">46 bytes</text>
  <rect x="330" y="28" width="135" height="80" rx="6" fill-opacity=".08" stroke="currentColor"/>
  <text x="397" y="55" text-anchor="middle" font-weight="bold">Reed-Muller</text>
  <text x="397" y="75" text-anchor="middle">each byte: RM(1,7),</text>
  <text x="397" y="93" text-anchor="middle">128 bits × 3 = 384</text>
  <rect x="490" y="28" width="140" height="80" rx="6" fill-opacity=".2" stroke="currentColor"/>
  <text x="560" y="55" text-anchor="middle" font-weight="bold">codeword</text>
  <text x="560" y="75" text-anchor="middle">46 × 384 =</text>
  <text x="560" y="93" text-anchor="middle">17,664 bits</text>
  <g stroke="currentColor" stroke-width="1.6">
    <line x1="145" y1="68" x2="165" y2="68"/><line x1="305" y1="68" x2="325" y2="68"/><line x1="465" y1="68" x2="485" y2="68"/>
    <line x1="560" y1="108" x2="560" y2="150"/>
  </g>
  <polygon points="165,63 170,68 165,73"/><polygon points="325,63 330,68 325,73"/><polygon points="485,63 490,68 485,73"/><polygon points="555,150 560,156 565,150"/>
  <text x="572" y="136" font-size="12">about 1 bit in 3 flipped</text>
  <text x="10" y="148" font-weight="bold">decode</text>
  <rect x="490" y="158" width="140" height="90" rx="6" fill-opacity=".2" stroke="currentColor"/>
  <text x="560" y="185" text-anchor="middle" font-weight="bold">noisy word</text>
  <text x="560" y="205" text-anchor="middle">about 6,000 of</text>
  <text x="560" y="223" text-anchor="middle">17,664 bits wrong</text>
  <rect x="330" y="158" width="135" height="90" rx="6" fill-opacity=".08" stroke="currentColor"/>
  <text x="397" y="185" text-anchor="middle" font-weight="bold">per 384-bit block</text>
  <text x="397" y="205" text-anchor="middle">add copies, Hadamard</text>
  <text x="397" y="223" text-anchor="middle">transform, take peak</text>
  <text x="397" y="241" text-anchor="middle" fill-opacity=".7">a byte rarely wrong</text>
  <rect x="170" y="158" width="135" height="90" rx="6" fill-opacity=".08" stroke="currentColor"/>
  <text x="237" y="185" text-anchor="middle" font-weight="bold">Reed-Solomon</text>
  <text x="237" y="205" text-anchor="middle">syndromes, locator,</text>
  <text x="237" y="223" text-anchor="middle">fixes up to 15 of</text>
  <text x="237" y="241" text-anchor="middle">46 bytes</text>
  <rect x="10" y="158" width="135" height="90" rx="6" fill-opacity=".08" stroke="currentColor"/>
  <text x="77" y="195" text-anchor="middle" font-weight="bold">message</text>
  <text x="77" y="215" text-anchor="middle">16 bytes</text>
  <g stroke="currentColor" stroke-width="1.6">
    <line x1="490" y1="203" x2="470" y2="203"/><line x1="330" y1="203" x2="310" y2="203"/><line x1="170" y1="203" x2="150" y2="203"/>
  </g>
  <polygon points="470,198 465,203 470,208"/><polygon points="310,198 305,203 310,208"/><polygon points="150,198 145,203 150,208"/>
  <text x="320" y="285" text-anchor="middle">HQC-3 and HQC-5: 5 copies (640 bits per byte), RS [56, 24] and [90, 32]</text>
</svg>
<figcaption>Figure 14.2. HQC-1's public code. The inner Reed-Muller decoder turns a channel that flips a third of all bits into one that gets a byte wrong about once in two thousand blocks; the outer Reed-Solomon code removes those rare wrong bytes.</figcaption>
</figure>

**Code it.** HQC-1's code in full: the field, the Reed-Solomon encoder and decoder, the
duplicated Reed-Muller encoder and Hadamard decoder. It is faithful to HQC-1's sizes and
algorithms, though not byte-for-byte to the specification's bit ordering, so it does not
reproduce HQC's test vectors. The test flips each of the 17,664 bits independently with a
chosen probability and decodes.

```python
# HQC-1's public code: Reed-Solomon [46, 16] over GF(2^8) outside, Reed-Muller RM(1,7)
# repeated 3 times inside. 16 message bytes -> 46 RS bytes -> 46 x 384 = 17,664 bits.
import random
N1, K, DELTA, REP = 46, 16, 15, 3        # RS length, message bytes, RS corrects DELTA, RM copies

EXP, LOG = [0] * 510, [0] * 256          # GF(2^8) mod x^8 + x^4 + x^3 + x^2 + 1, generator 2
v = 1
for i in range(255):
    EXP[i] = EXP[i + 255] = v
    LOG[v] = i
    v = (v << 1) ^ (0x11D if v & 0x80 else 0)
def gmul(a, b):
    return EXP[LOG[a] + LOG[b]] if a and b else 0
def ginv(a):
    return EXP[255 - LOG[a]]
def peval(p, x):                         # p[i] is the coefficient of x^i
    y = 0
    for c in reversed(p):
        y = gmul(y, x) ^ c
    return y

G = [1]                                  # generator polynomial: roots alpha^1 ... alpha^(2*DELTA)
for j in range(1, 2 * DELTA + 1):
    G = [(G[i - 1] if i else 0) ^ (gmul(G[i], EXP[j]) if i < len(G) else 0) for i in range(len(G) + 1)]

def rs_encode(msg):                      # systematic: 30 parity bytes, then the 16 message bytes
    c = [0] * (2 * DELTA) + list(msg)
    for i in range(N1 - 1, 2 * DELTA - 1, -1):   # long division by G
        q = c[i]
        for j in range(len(G)):
            c[i - 2 * DELTA + j] ^= gmul(q, G[j])
    return c[:2 * DELTA] + list(msg)

def rs_decode(c):                        # syndromes, Berlekamp-Massey, Chien search, Forney
    c = list(c)
    S = [peval(c, EXP[j]) for j in range(1, 2 * DELTA + 1)]
    L, B, ell, m, b = [1], [1], 0, 1, 1
    for n in range(2 * DELTA):
        d = S[n]
        for i in range(1, min(ell, len(L) - 1) + 1):
            d ^= gmul(L[i], S[n - i])
        if d == 0:
            m += 1
            continue
        T, coef = L, gmul(d, ginv(b))
        Bs = [0] * m + [gmul(coef, x) for x in B]
        L = [(L[i] if i < len(L) else 0) ^ (Bs[i] if i < len(Bs) else 0) for i in range(max(len(L), len(Bs)))]
        if 2 * ell <= n:
            ell, B, b, m = n + 1 - ell, T, d, 1
        else:
            m += 1
    pos = [i for i in range(N1) if peval(L, EXP[255 - i]) == 0]
    if len(pos) != ell:
        return None                      # more than DELTA errors: give up
    Om = [0] * (2 * DELTA)               # error evaluator S(x) L(x) mod x^(2 DELTA)
    for i, li in enumerate(L):
        for j in range(2 * DELTA - i):
            Om[i + j] ^= gmul(li, S[j])
    dL = [L[i] if i % 2 else 0 for i in range(1, len(L))]
    for i in pos:
        xi = EXP[255 - i]
        c[i] ^= gmul(peval(Om, xi), ginv(peval(dL, xi)))
    return c[2 * DELTA:]

def rm_encode(byte):                     # bit j of the 128-bit word: m7 + <m0..m6, j>
    word = [((byte >> 7) ^ bin(byte & 0x7F & j).count("1")) & 1 for j in range(128)]
    return word * REP

def rm_decode(bits):                     # sum the copies, then a fast Hadamard transform
    F = [REP - 2 * sum(bits[k * 128 + j] for k in range(REP)) for j in range(128)]
    h = 1
    while h < 128:
        for i in range(0, 128, 2 * h):
            for j in range(i, i + h):
                F[j], F[j + h] = F[j] + F[j + h], F[j] - F[j + h]
        h *= 2
    u = max(range(128), key=lambda k: abs(F[k]))
    return u | (128 if F[u] < 0 else 0)

def encode(msg):
    return [bit for byte in rs_encode(msg) for bit in rm_encode(byte)]
def decode(bits):
    inner = [rm_decode(bits[i * 128 * REP:(i + 1) * 128 * REP]) for i in range(N1)]
    return rs_decode(inner), inner

random.seed(207)
msg = list(b"Arcadia to Earth")
cw = encode(msg)
for p in (0.30, 0.36, 0.40, 0.42, 0.45):
    noisy = [b ^ (random.random() < p) for b in cw]
    out, inner = decode(noisy)
    bad = sum(x != y for x, y in zip(inner, rs_encode(msg)))
    print(f"bit error rate {p:.2f}: {sum(x != y for x, y in zip(noisy, cw)):4} of 17664 bits flipped,"
          f" {bad:2} of 46 bytes wrong after RM ->", "message recovered" if out == msg else "FAILURE")
```

It prints:

```text
bit error rate 0.30: 5344 of 17664 bits flipped,  0 of 46 bytes wrong after RM -> message recovered
bit error rate 0.36: 6436 of 17664 bits flipped,  1 of 46 bytes wrong after RM -> message recovered
bit error rate 0.40: 7074 of 17664 bits flipped,  8 of 46 bytes wrong after RM -> message recovered
bit error rate 0.42: 7416 of 17664 bits flipped, 22 of 46 bytes wrong after RM -> FAILURE
bit error rate 0.45: 7983 of 17664 bits flipped, 36 of 46 bytes wrong after RM -> FAILURE
```

The code shrugs off 6,436 wrong bits, more than a third, leaving one wrong byte for the outer
code. And the failure is a cliff: at 40% the Reed-Muller decoder gets 8 bytes wrong and
Reed-Solomon copes; at 42% it gets 22 wrong, past the 15 it can fix, and the message is lost. HQC-1 runs at
a bit error rate of about 0.338, safely on the good side, and the next section computes how
safely. (Tested separately, the Reed-Solomon decoder fixes every pattern of up to 15 wrong
bytes and none of 16 or more.)

## 14.6 Deriving HQC's parameters

*Level: expert.*

An HQC parameter set is seven numbers: the ring size $n$, the secret weight $w$, the encryption
weights $w_r$ (for $r_1$, $r_2$) and $w_e$ (for $e$), and the code: the Reed-Solomon length $n_1$,
its correction capacity $\delta$, and the Reed-Muller length $n_2$. Three pressures fix them.
Security wants the weights large. Correctness wants the noise, and so the weights, small enough
that decoding fails less than once in $2^{\lambda}$ tries. Size wants $n$ as small as the code
allows. This section follows each in turn with HQC-1's numbers.

### Security sets the weights

Recovering the secret key from $(h, s = x + h\,y)$ is a syndrome decoding problem: the matrix
$(I \mid h)$ has $n$ rows and $2n$ columns (a code of rate $1/2$), and the unknown error
$(x, y)$ has weight $2w$. Recovering a message from a ciphertext is another one: $u = r_1 + h\,r_2$
and $v - mG = s\,r_2 + e$ together form a syndrome of $(r_1, e, r_2)$ under a $2n \times 3n$
matrix (rate $1/3$), with weight $2w_r + w_e$.

For errors as sparse as these, every known information-set decoding algorithm, from Prange's to
the most refined (Chapter 13 and the Mathematics book's
[§18.9](../mathematics/18-Error-Correcting-Codes.md#189-syndrome-decoding-and-information-set-decoding)),
costs about $2^{c\,t}$ for weight $t$, with $c = \log_2 \frac{1}{1 - R}$ for a code of rate $R$
(Rodolfo Canto Torres and Nicolas Sendrier proved this for sublinear weights in 2016). The
improvements that matter so much for Classic McEliece's dense errors shrink to lower-order terms
here. That gives a rule of thumb that reproduces HQC's weights:

| | $\lambda$ | key: $2w \cdot \log_2 2$ | ciphertext: $(2w_r + w_e) \log_2 1.5$ |
|---|---|---|---|
| HQC-1 | 128 | $2 \times 66 = 132$ | $225 \times 0.585 = 131.6$ |
| HQC-3 | 192 | $2 \times 100 = 200$ | $342 \times 0.585 = 200.1$ |
| HQC-5 | 256 | $2 \times 131 = 262$ | $447 \times 0.585 = 261.5$ |

*Table 14.2. HQC's weights against the sublinear-weight rule of thumb. Both columns land a few
bits above the target, leaving room for the polynomial factors the rule ignores and for the
quasi-cyclic structure.*

The few spare bits matter. The quasi-cyclic structure gives the attacker $n$ shifted copies of
the same problem, and Nicolas Sendrier's "decoding one out of many" (2011) turns $N$ targets into
a speed-up of about $\sqrt{N}$, here $\sqrt{17{,}669} \approx 2^{7}$. The specification's full
estimates count that gain and, against it, the linear algebra inside each attempt, which costs
far more than one operation.

### Size sets n

The code's length is $n_1 n_2$ bits: $46 \times 384 = 17{,}664$ for HQC-1. The ring needs
$n \geq n_1 n_2$, prime, with 2 a primitive root (§14.1). The first such prime above 17,664 is
17,669; above $56 \times 640 = 35{,}840$ it is 35,851; above $90 \times 640 = 57{,}600$ it is
57,637 (57,601 is prime, but 2 is not a primitive root of it). The 5, 11 and 37 leftover bits
of $v$ carry no message and are simply cut off before sending, which the specification calls
truncation.

The sizes follow by hand. The public key is a 32-byte seed from which $h$ is regenerated, plus
$s$, which is $\lceil 17{,}669/8 \rceil = 2{,}209$ bytes: 2,241 bytes. The ciphertext is $u$
(2,209 bytes), the truncated $v$ ($17{,}664/8 = 2{,}208$ bytes) and a 16-byte salt (§14.7):
4,433 bytes. The same arithmetic gives Table 14.1's other columns.

### Noise sets the failure rate

Decryption sees $e' = x\,r_2 + r_1\,y + e$ added to the codeword (in characteristic 2 the minus
sign of §14.2 is a plus). One coordinate of $x\,r_2$ is the sum of the $w \cdot w_r$ products
$x_i r_{2,j}$ with $i + j$ equal to that coordinate, and each of those is 1 with probability
about $1/n$. Treating the coordinates as independent, a sum of $N$ independent bits that are each
1 with probability $q$ is 1 with probability $\tfrac{1}{2}\bigl(1 - (1 - 2q)^{N}\bigr)$, so one
coordinate of $x\,r_2$ is 1 with probability

$$
p_1 = \tfrac{1}{2}\left(1 - \left(1 - \tfrac{2}{n}\right)^{w\,w_r}\right),
$$

the same for $r_1\,y$, and $p_e = w_e / n$ for $e$. Combining the three with the same rule,

$$
p = \tfrac{1}{2}\left(1 - \left(1 - \tfrac{2}{n}\right)^{2\,w\,w_r} \left(1 - \tfrac{2 w_e}{n}\right)\right).
$$

**By hand, for HQC-1.** $w\,w_r = 66 \times 75 = 4{,}950$. Then
$(1 - 2/17{,}669)^{4{,}950} \approx e^{-0.5603} = 0.571$, its square is $0.326$, and
$1 - 2 \times 75/17{,}669 = 0.9915$. So $p = \tfrac{1}{2}(1 - 0.326 \times 0.9915) = 0.338$:
a third of the bits, as promised.

From $p$ the failure rate is two binomial tails. A duplicated Reed-Muller block decodes wrongly
only if the noise is at least as close to some other codeword as to the true one. For each of the
254 codewords at distance $64 \times 3 = 192$ that means at least 96 of the 192 bits where they
differ are flipped, and for the complement at distance 384, at least 192 of 384. Adding these
255 probabilities bounds the chance $p_{\text{RM}}$ that a block decodes wrongly. Reed-Solomon
then fails only if more than $\delta = 15$ of the 46 blocks do:

$$
\text{DFR} \le \Pr\bigl[\mathrm{Bin}(46,\, p_{\text{RM}}) \ge 16\bigr]
\approx \binom{46}{16}\, p_{\text{RM}}^{16} .
$$

**Code it.** First, measurement. The program runs HQC-1's encryption layer at full size
($n = 17{,}669$, $w = 66$, $w_r = w_e = 75$) with the code from §14.5, decrypts 300 messages, and
counts how often the Reed-Muller decoder gets a byte wrong.

```python
# Uses rs_encode(), encode() and decode() from the listing above.
# HQC-1's PKE layer with its real sizes: n = 17,669, w = 66, w_r = w_e = 75.
import random
N, W, WR = 17669, 66, 75
MASK = (1 << N) - 1
def mul(a, positions):                   # a * (sum of x^i), mod x^N - 1
    out = 0
    for i in positions:
        out ^= ((a << i) | (a >> (N - i))) & MASK
    return out
def sparse(w):
    return random.sample(range(N), w)
def to_int(positions):
    return sum(1 << i for i in positions)
def bits_to_int(bits):
    return int("".join(map(str, reversed(bits))), 2)

def keygen():
    h = random.getrandbits(N)
    x, y = sparse(W), sparse(W)
    return (h, to_int(x) ^ mul(h, y)), y          # public (h, s = x + h*y), secret y

def encrypt(pk, msg):
    h, s = pk
    r1, r2, e = sparse(WR), sparse(WR), sparse(WR)
    u = to_int(r1) ^ mul(h, r2)
    v = (bits_to_int(encode(msg)) ^ mul(s, r2) ^ to_int(e)) & ((1 << 46 * 384) - 1)
    return u, v                                   # v is truncated to n1*n2 = 17,664 bits

def decrypt(y, c):
    u, v = c
    noisy = v ^ (mul(u, y) & ((1 << 46 * 384) - 1))
    return noisy, decode([noisy >> i & 1 for i in range(46 * 384)])

random.seed(2025)
pk, sk = keygen()
runs, flipped, wrong_bytes, worst, ok = 300, 0, 0, 0, 0
for _ in range(runs):
    msg = [random.randrange(256) for _ in range(16)]
    noisy, (out, inner) = decrypt(sk, encrypt(pk, msg))
    flipped += bin(noisy ^ bits_to_int(encode(msg))).count("1")
    bad = sum(a != b for a, b in zip(inner, rs_encode(msg)))
    wrong_bytes, worst, ok = wrong_bytes + bad, max(worst, bad), ok + (out == msg)
print(f"decryptions correct: {ok} of {runs}; measured bit error rate {flipped / runs / 17664:.3f}")
print("Reed-Muller bytes wrong:", wrong_bytes, "of", runs * 46, "; worst ciphertext:", worst, "(RS fixes 15)")
```

It prints:

```text
decryptions correct: 300 of 300; measured bit error rate 0.340
Reed-Muller bytes wrong: 5 of 13800 ; worst ciphertext: 1 (RS fixes 15)
```

The measured bit error rate, 0.340, is close to the 0.338 of the formula. The Reed-Muller
decoder got 5 bytes wrong in 13,800, about one in 2,800 or $2^{-11.4}$, and no ciphertext had
more than one wrong byte, against the 16 that would make Reed-Solomon fail. Measurement can go
no further: a failure of the whole decryption is far too rare to see. The model takes over.

**Code it.** The failure-rate model for all three parameter sets, using the formulas above.

```python
# How HQC's parameters meet their failure targets: a simplified version of the analysis
# in the HQC specification (independent bit errors, a union bound for Reed-Muller).
from math import comb, log2

def bit_error_rate(n, w, wr, we):
    q = (1 - 2 / n) ** (w * wr)          # bias of one coordinate of x*r2 (and of r1*y)
    return (1 - q * q * (1 - 2 * we / n)) / 2    # the XOR of x*r2, r1*y and e

def tail(n, p, k):                       # P(Binomial(n, p) >= k)
    return sum(comb(n, i) * p**i * (1 - p)**(n - i) for i in range(k, n + 1))

def rm_fail(p, rep):                     # union bound over the 255 nonzero codewords of RM(1,7)
    return 254 * tail(64 * rep, p, 32 * rep) + tail(128 * rep, p, 64 * rep)

def dfr(n, n1, delta, rep, w, wr):
    p = bit_error_rate(n, w, wr, wr)
    prm = rm_fail(p, rep)
    return p, prm, tail(n1, prm, delta + 1)   # RS fails when more than delta bytes are wrong

#         name     n      n1 delta rep  w   wr   target
SETS = [("HQC-1", 17669, 46, 15, 3,  66,  75, 128),
        ("HQC-3", 35851, 56, 16, 5, 100, 114, 192),
        ("HQC-5", 57637, 90, 29, 5, 131, 149, 256)]
for name, n, n1, delta, rep, w, wr, target in SETS:
    p, prm, f = dfr(n, n1, delta, rep, w, wr)
    print(f"{name}: bit error rate {p:.3f}, RM byte error <= 2^{log2(prm):.1f},"
          f" failure <= 2^{log2(f):.0f} (target 2^-{target})")
print("HQC-1 with other noise weights:")
for wr in range(55, 100, 5):
    p, prm, f = dfr(17669, 46, 15, 3, 66, wr)
    print(f"  w_r = {wr}: bit error rate {p:.3f}, failure <= 2^{log2(f):.0f}")
```

It prints:

```text
HQC-1: bit error rate 0.338, RM byte error <= 2^-10.4, failure <= 2^-127 (target 2^-128)
HQC-3: bit error rate 0.361, RM byte error <= 2^-14.0, failure <= 2^-191 (target 2^-192)
HQC-5: bit error rate 0.372, RM byte error <= 2^-11.0, failure <= 2^-251 (target 2^-256)
HQC-1 with other noise weights:
  w_r = 55: bit error rate 0.282, failure <= 2^-356
  w_r = 60: bit error rate 0.297, failure <= 2^-283
  w_r = 65: bit error rate 0.312, failure <= 2^-222
  w_r = 70: bit error rate 0.326, failure <= 2^-171
  w_r = 75: bit error rate 0.338, failure <= 2^-127
  w_r = 80: bit error rate 0.350, failure <= 2^-90
  w_r = 85: bit error rate 0.361, failure <= 2^-59
  w_r = 90: bit error rate 0.371, failure <= 2^-33
  w_r = 95: bit error rate 0.380, failure <= 2^-14
```

This crude bound lands within a factor of 2 to 32 of each target. The gap is the union bound,
which counts some failures twice and counts ties as losses: for HQC-1 it gives $2^{-10.4}$ per
Reed-Muller block where the measurement above, and a longer run of 200,000 blocks at the same
bit error rate (90 wrong, $2^{-11.1}$), say the truth is nearer $2^{-11}$. Raising each block's
failure probability to the sixteenth power multiplies that small looseness into a few bits. The
specification uses a sharper calculation of the Reed-Muller decoder's behavior, checked against
simulations at higher noise, and states failure rates below $2^{-128}$, $2^{-192}$ and
$2^{-256}$. The independence assumption is also only an approximation, since neighboring
coordinates of $x\,r_2$ share terms. Alessandro Annechini, Alessandro Barenghi and Gerardo Pelosi
(ISIT 2026) derived a model without it and found the usual approximation conservative: HQC's
true failure rates are lower than the estimates.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Chart of HQC-1's failure bound against the noise weight w_r: from 2 to the minus 356 at weight 55 up to 2 to the minus 14 at weight 95, crossing the 2 to the minus 128 target at weight 75" fill="currentColor" font-size="13">
  <line x1="60" y1="30" x2="60" y2="250" stroke="currentColor"/>
  <line x1="60" y1="250" x2="620" y2="250" stroke="currentColor"/>
  <g text-anchor="end">
    <text x="54" y="34">2⁰</text><text x="54" y="95">2⁻¹⁰⁰</text><text x="54" y="156">2⁻²⁰⁰</text><text x="54" y="217">2⁻³⁰⁰</text>
  </g>
  <g stroke="currentColor" stroke-opacity=".25">
    <line x1="60" y1="91" x2="620" y2="91"/><line x1="60" y1="152" x2="620" y2="152"/><line x1="60" y1="213" x2="620" y2="213"/>
  </g>
  <line x1="60" y1="108" x2="620" y2="108" stroke="currentColor" stroke-width="1.5" stroke-dasharray="6 4"/>
  <text x="615" y="124" text-anchor="end">target 2⁻¹²⁸ (category 1)</text>
  <polyline fill="none" stroke="currentColor" stroke-width="2" points="80,247.6 145,202.9 210,165.6 275,134.5 340,107.6 405,85 470,66 535,50.2 600,38.6"/>
  <g>
    <circle cx="80" cy="247.6" r="3.5"/><circle cx="145" cy="202.9" r="3.5"/><circle cx="210" cy="165.6" r="3.5"/><circle cx="275" cy="134.5" r="3.5"/><circle cx="405" cy="85" r="3.5"/><circle cx="470" cy="66" r="3.5"/><circle cx="535" cy="50.2" r="3.5"/><circle cx="600" cy="38.6" r="3.5"/>
    <circle cx="340" cy="107.6" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="340" cy="107.6" r="3.5"/>
  </g>
  <text x="352" y="100">HQC-1: w_r = 75</text>
  <g text-anchor="middle">
    <text x="80" y="268">55</text><text x="145" y="268">60</text><text x="210" y="268">65</text><text x="275" y="268">70</text><text x="340" y="268">75</text><text x="405" y="268">80</text><text x="470" y="268">85</text><text x="535" y="268">90</text><text x="600" y="268">95</text>
  </g>
  <text x="340" y="292" text-anchor="middle">noise weight w_r = w_e (n = 17,669, w = 66, same code)</text>
</svg>
<figcaption>Figure 14.3. HQC-1's decryption failure bound from the program above, as the encryption noise weight changes. Every five extra ones in r₁, r₂ and e cost about 40 bits of failure rate near the target, so the weights are tuned to within a few units of where security and correctness meet.</figcaption>
</figure>

Figure 14.3 shows how little room there is. Security pushes $w_r$ up (the ciphertext's rule of
thumb needs $2w_r + w_e \ge 219$ for 128 bits, so $w_r = w_e = 73$ at the very least); correctness
pushes it down (the bound crosses $2^{-128}$ near 75). HQC-1 sits in the narrow gap. If more
security were wanted at the same $n$, the code would have to be stronger, and the only way to
make it stronger without making $n$ larger is to make the message shorter. So the parameter
search runs the other way in practice: pick the Reed-Solomon code and the duplication factor,
compute $n$, set the weights from security, and check the failure rate; if it is too high, add
Reed-Muller copies or Reed-Solomon check bytes, which makes $n$ and the ciphertext larger, and
try again. HQC-3 and HQC-5 needed five copies of the Reed-Muller block, not three, for exactly
this reason.

## 14.7 From HQC-PKE to HQC-KEM

*Level: intermediate.*

Everything so far is HQC-PKE, a public-key encryption scheme secure against passive attackers
(IND-CPA). A server that decrypts whatever it is sent needs more, and HQC, like ML-KEM, gets it
from the Fujisaki-Okamoto transform with implicit rejection
([Chapter 3, §3.5](03-KEMs-and-Signatures.md#35-the-fujisaki-okamoto-transform)): encryption
randomness is derived from the message by a hash, so the receiver can decrypt, re-encrypt, and
check that it gets the same ciphertext; if it does not, it returns a pseudorandom key derived
from a secret instead of an error.

HQC adds a **salt**: 16 random bytes chosen by the encapsulator and sent in the clear with the
ciphertext. The salt makes every encapsulation's randomness depend on a fresh value the
attacker does not control in advance, so work spent precomputing bad ciphertexts against one
target does not carry over to others, a protection against attackers who face many keys or many
ciphertexts at once.

### The salt that was not bound

A salt is only safe if the rest of the transform depends on it. In April 2025, a month after
HQC's selection, Markku-Juhani Saarinen pointed out on NIST's pqc-forum that in the then-current
specification the salt was appended to the ciphertext without being bound into the derivation
the way the FO proof needs: the decapsulation check did not tie the salt to the key, so two
ciphertexts that differed only in their salt could be played against each other in
decapsulation queries. An IND-CCA2 attacker who receives the challenge ciphertext may ask for the
decapsulation of any *other* ciphertext, and a ciphertext that differs only in the salt is
another ciphertext. This was a failure of the security definition, not a practical key
recovery, but the definition is what the proof promised.

The HQC team's specification of 22 August 2025 repaired it by switching to the variant of the FO
transform that FIPS 203 uses for ML-KEM and by hashing the public key and the salt into
everything derived from the message:

- **Encapsulation.** Pick a 16-byte message $m$ (24 or 32 bytes for HQC-3 and HQC-5) and a
  16-byte salt. Compute $(K, \theta) = G(H(\mathit{ek}) \parallel m \parallel \text{salt})$,
  encrypt $m$ with HQC-PKE using randomness $\theta$, and send $(u, v, \text{salt})$. The shared
  secret is $K$, 32 bytes.
- **Decapsulation.** Decrypt to get $m'$; recompute
  $(K', \theta') = G(H(\mathit{ek}) \parallel m' \parallel \text{salt})$; re-encrypt $m'$ with
  $\theta'$. If the result, with the received salt, equals the received ciphertext, return $K'$;
  otherwise return $\bar K = J(H(\mathit{ek}) \parallel \sigma \parallel c)$, where $\sigma$ is a
  secret random string kept in the decapsulation key.

Change the salt now and $\theta'$ changes, so the re-encryption no longer matches and the answer
is the rejection key, which depends on the whole ciphertext. Saarinen reviewed the new version
and agreed it implements implicit-rejection FO in the same way as Kyber. The hash functions are
SHA3-256 for $H$ and $J$, SHA3-512 for $G$, and SHAKE256 to expand seeds into the vectors.

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="HQC-KEM encapsulation on the left and decapsulation on the right, with the re-encryption check and the rejection key" fill="currentColor" font-size="13">
  <text x="160" y="18" text-anchor="middle" font-weight="bold">Encapsulate (anyone, with ek)</text>
  <text x="480" y="18" text-anchor="middle" font-weight="bold">Decapsulate (holder of dk)</text>
  <rect x="20" y="30" width="280" height="52" rx="6" fill-opacity=".08" stroke="currentColor"/>
  <text x="160" y="52" text-anchor="middle">pick m (16 bytes) and salt (16 bytes)</text>
  <text x="160" y="70" text-anchor="middle" fill-opacity=".7">fresh randomness</text>
  <rect x="20" y="100" width="280" height="52" rx="6" fill-opacity=".08" stroke="currentColor"/>
  <text x="160" y="122" text-anchor="middle">(K, θ) = G(H(ek) ‖ m ‖ salt)</text>
  <text x="160" y="140" text-anchor="middle" fill-opacity=".7">G = SHA3-512</text>
  <rect x="20" y="170" width="280" height="52" rx="6" fill-opacity=".08" stroke="currentColor"/>
  <text x="160" y="192" text-anchor="middle">(u, v) = PKE.Encrypt(ek, m; θ)</text>
  <text x="160" y="210" text-anchor="middle" fill-opacity=".7">r₁, r₂, e sampled from θ</text>
  <rect x="20" y="240" width="280" height="52" rx="6" fill-opacity=".2" stroke="currentColor"/>
  <text x="160" y="262" text-anchor="middle">send c = (u, v, salt); keep K</text>
  <text x="160" y="280" text-anchor="middle" fill-opacity=".7">4,433 bytes for HQC-1</text>
  <rect x="340" y="30" width="280" height="52" rx="6" fill-opacity=".08" stroke="currentColor"/>
  <text x="480" y="52" text-anchor="middle">m′ = PKE.Decrypt(y, u, v)</text>
  <text x="480" y="70" text-anchor="middle" fill-opacity=".7">y regenerated from a seed</text>
  <rect x="340" y="100" width="280" height="52" rx="6" fill-opacity=".08" stroke="currentColor"/>
  <text x="480" y="122" text-anchor="middle">(K′, θ′) = G(H(ek) ‖ m′ ‖ salt)</text>
  <text x="480" y="140" text-anchor="middle" fill-opacity=".7">the salt is bound here</text>
  <rect x="340" y="170" width="280" height="52" rx="6" fill-opacity=".08" stroke="currentColor"/>
  <text x="480" y="192" text-anchor="middle">c′ = (PKE.Encrypt(ek, m′; θ′), salt)</text>
  <text x="480" y="210" text-anchor="middle" fill-opacity=".7">re-encrypt</text>
  <rect x="340" y="240" width="280" height="52" rx="6" fill-opacity=".2" stroke="currentColor"/>
  <text x="480" y="262" text-anchor="middle">c′ = c ? K′ : J(H(ek) ‖ σ ‖ c)</text>
  <text x="480" y="280" text-anchor="middle" fill-opacity=".7">implicit rejection</text>
  <g stroke="currentColor" stroke-width="1.6">
    <line x1="160" y1="82" x2="160" y2="96"/><line x1="160" y1="152" x2="160" y2="166"/><line x1="160" y1="222" x2="160" y2="236"/>
    <line x1="480" y1="82" x2="480" y2="96"/><line x1="480" y1="152" x2="480" y2="166"/><line x1="480" y1="222" x2="480" y2="236"/>
    <polyline fill="none" points="300,266 320,266 320,56 336,56"/>
  </g>
  <polygon points="155,96 160,100 165,96"/><polygon points="155,166 160,170 165,166"/><polygon points="155,236 160,240 165,236"/>
  <polygon points="475,96 480,100 485,96"/><polygon points="475,166 480,170 485,166"/><polygon points="475,236 480,240 485,236"/>
  <polygon points="336,51 340,56 336,61"/>
  <text x="320" y="318" text-anchor="middle">Changing any byte of c, salt included, changes the check and yields the rejection key.</text>
</svg>
<figcaption>Figure 14.4. HQC-KEM as specified on 22 August 2025. The salt enters the derivation of K and θ, so decapsulation's re-encryption check covers it; a failed check returns a pseudorandom key computed from the secret σ and the whole ciphertext.</figcaption>
</figure>

### Keys as seeds

The same revision made the keys seed-based, as in FIPS 203. The public key is a 32-byte seed
that expands to $h$, plus $s$. The decapsulation key holds the public key, a 32-byte seed that
regenerates $y$ at every decapsulation, the rejection secret $\sigma$, and the seed the whole
key pair came from, so that a key received from someone else can be checked. The secret $x$ is
not stored at all: decryption never needs it. That gives HQC-1's 2,321-byte decapsulation key,
though the 32-byte seed alone would be enough.

### What FIPS 207 may change

At NIST's Sixth PQC Standardization Conference (24 to 26 September 2025), Angela Robinson of
NIST presented the plans for FIPS 207, HQC-KEM. The standard will be written in the style of
FIPS 203: self-contained algorithms in plain pseudocode, with inputs and outputs as byte arrays.
The changes to the round 4 design under consideration were the salted FO transform with
$\mathit{ek}$ and the salt in the derivation of $K$ and $\theta$ (the repair above), dropping
$x$ from the decryption key and adding the key-generation seed, an updated sampler for
fixed-weight vectors, SHA3-512 in place of SHAKE256 for one seed expansion in key generation,
a 32-byte shared secret instead of 40 bytes, and hashing all of the public key. NIST also asked
for comments on two open questions. One was a proposed one-byte **confirmation code**: Lewis
Glabush, Felix Günther, Kathrin Hövelmanns and Douglas Stebila (CRYPTO 2025) showed how to make
an implementation that skips the re-encryption check fail ordinary known-answer tests, so that a
dangerous shortcut is caught in testing rather than in the field. The other was the key format:
seed only, or a choice of seed or expanded key.

As of November 2026, NIST has not published a draft of FIPS 207. Its March 2025 announcement
expected a draft in about a year and a final standard in 2027. Until the draft appears, the
details above are the specification's and NIST's stated intentions, not the standard.

## 14.8 BIKE's decoder and its failure rate

*Level: expert.*

BIKE's problem is the mirror image of HQC's. Its code is excellent, a QC-MDPC code decoded by
bit flipping corrects $t = 134$ errors among 24,646 positions for BIKE-L1 almost always, but its
decoder is iterative and its behavior is statistical, so "almost always" is hard to turn into a
number with 128 bits of confidence.

### Black-Gray-Flip

The toy decoder in §14.3 finds the largest count of unsatisfied checks and flips everything near
it, for as many rounds as it takes. That is a poor fit for cryptography for two reasons: the
number of rounds depends on the error, which leaks through timing, and scanning for a maximum
adds work. BIKE fixes the number of iterations and computes the flipping threshold from the
syndrome weight alone, with an affine rule fitted for each parameter set. For BIKE-L1 it is

$$
T = \max\bigl(\lfloor 0.0069722\,|s| + 13.530 \rfloor,\ 36\bigr),
$$

where $|s|$ is the weight of the current syndrome. A heavy syndrome means many errors remain,
and the threshold stays high so that only bits that are very likely wrong get flipped; as the
syndrome empties, the threshold falls towards about half of a column's 71 checks.

Nir Drucker, Shay Gueron and Dusan Kostic's **Black-Gray-Flip** decoder (BGF, 2020) adds one
idea to the first iteration. Bits whose count reaches the threshold are flipped and remembered as
**black**; bits that fall just short, within $\tau = 3$ of it, are remembered as **gray**. After
the flip, the decoder recomputes the counts, gives every black bit a second look and flips it
back if its count is now high (it was probably a mistake), then does the same for the gray bits
and flips those that now look wrong. Both second looks use the fixed threshold
$\lfloor (d + 1)/2 \rfloor + 1 = 37$ for BIKE-L1's $d = 71$. Four ordinary iterations follow. BIKE
specifies five iterations in all, and an implementation runs all five every time, with the same
memory accesses, even when the syndrome is already zero. Drucker, Gueron and Kostic's
measurements showed that this schedule reaches failure rates that earlier decoders needed many
more iterations to reach, which is what made a constant-time BIKE affordable.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="The Black-Gray-Flip decoder: in iteration one, flip bits at or above the threshold and mark them black, mark near misses gray, then recheck black and gray bits; iterations two to five flip bits at or above the threshold" fill="currentColor" font-size="13">
  <text x="10" y="18" font-weight="bold">iteration 1</text>
  <rect x="10" y="28" width="190" height="96" rx="6" fill-opacity=".08" stroke="currentColor"/>
  <text x="105" y="50" text-anchor="middle">count unsatisfied checks</text>
  <text x="105" y="70" text-anchor="middle">count ≥ T: flip, mark black</text>
  <text x="105" y="90" text-anchor="middle">T − τ ≤ count &lt; T:</text>
  <text x="105" y="108" text-anchor="middle">mark gray (no flip)</text>
  <rect x="225" y="28" width="190" height="96" rx="6" fill-opacity=".08" stroke="currentColor"/>
  <text x="320" y="55" text-anchor="middle">recount; each black bit</text>
  <text x="320" y="75" text-anchor="middle">with count ≥ (d+1)/2 + 1:</text>
  <text x="320" y="95" text-anchor="middle">flip it back</text>
  <rect x="440" y="28" width="190" height="96" rx="6" fill-opacity=".08" stroke="currentColor"/>
  <text x="535" y="55" text-anchor="middle">recount; each gray bit</text>
  <text x="535" y="75" text-anchor="middle">with count ≥ (d+1)/2 + 1:</text>
  <text x="535" y="95" text-anchor="middle">flip it</text>
  <g stroke="currentColor" stroke-width="1.6">
    <line x1="200" y1="76" x2="220" y2="76"/><line x1="415" y1="76" x2="435" y2="76"/>
    <polyline fill="none" points="535,124 535,150 320,150 320,160"/>
  </g>
  <polygon points="220,71 225,76 220,81"/><polygon points="435,71 440,76 435,81"/><polygon points="315,160 320,165 325,160"/>
  <text x="10" y="158" font-weight="bold">iterations 2 to 5</text>
  <rect x="160" y="165" width="320" height="50" rx="6" fill-opacity=".08" stroke="currentColor"/>
  <text x="320" y="186" text-anchor="middle">count; flip every bit with count ≥ T</text>
  <text x="320" y="204" text-anchor="middle" fill-opacity=".7">T recomputed from the syndrome weight each time</text>
  <text x="320" y="238" text-anchor="middle">BIKE-L1: T = max(⌊0.0069722·|s| + 13.530⌋, 36), τ = 3, d = 71; always all five iterations</text>
</svg>
<figcaption>Figure 14.5. The Black-Gray-Flip decoder. The black and gray lists give the first, most error-prone iteration a chance to undo its mistakes and to catch near misses, so a short, fixed schedule suffices.</figcaption>
</figure>

### Measuring a waterfall

BIKE's parameters were chosen from measurements like the one below. With the column weight and
the number of errors fixed, the failure rate falls as the block size $r$ grows, because the same
errors are spread over a larger, sparser code. Plot $\log_2$ of the failure rate against $r$
and the curve, called a waterfall, bends downward. The designers measured where failures were
still frequent enough to count and extrapolated to $2^{-128}$.

**Code it.** BGF on toy QC-MDPC codes with 15 ones per block and 24 errors, at six block sizes,
followed by the straight-line extrapolation. The threshold line $\max(\lfloor 0.02\,|s| + 7
\rfloor, 9)$ was chosen by trial for this toy, in the same affine form as BIKE's.

```python
# Black-Gray-Flip on toy QC-MDPC codes (15 ones per block, 24 errors), and the failure
# rate as the block size r grows: the measurement behind BIKE's extrapolation.
import random
from math import log2
D, T_ERR = 15, 24

def syndrome(sk, r, errors):             # errors: positions 0 .. 2r-1 (block 0, then block 1)
    s = [0] * r
    for p in errors:
        for i in sk[p // r]:
            s[(i + p) % r] ^= 1
    return s

def counts(s, sk):                       # unsatisfied parity checks of every position
    return [sum(t) for blk in sk for t in zip(*[s[i:] + s[:i] for i in blk])]

def flip(s, e, sk, p):
    r = len(s)
    e[p] ^= 1
    for i in sk[p // r]:
        s[(i + p) % r] ^= 1

def threshold(s):                        # affine in the syndrome weight, as in BIKE
    return max(int(0.02 * sum(s) + 7), (D + 1) // 2 + 1)

def bgf(sk, s, iterations=5, tau=3):
    s, e = s[:], [0] * (2 * len(s))
    for it in range(iterations):
        th, upc = threshold(s), counts(s, sk)
        black = [p for p in range(len(e)) if upc[p] >= th]
        gray = [p for p in range(len(e)) if th - tau <= upc[p] < th]
        for p in black:
            flip(s, e, sk, p)
        if it == 0:                      # re-examine the black, then the gray positions
            for marked in (black, gray):
                upc = counts(s, sk)
                for p in marked:
                    if upc[p] >= (D + 1) // 2 + 1:
                        flip(s, e, sk, p)
    return e if not any(s) else None

random.seed(12323)
points = []
for r in (523, 557, 587, 619, 653, 701):
    sk = (random.sample(range(r), D), random.sample(range(r), D))
    fails = 0
    for _ in range(1000):
        errors = random.sample(range(2 * r), T_ERR)
        fails += bgf(sk, syndrome(sk, r, errors)) != [int(p in errors) for p in range(2 * r)]
    print(f"r = {r}: {fails:3} failures in 1000", f"(2^{log2(fails / 1000):.1f})" if fails else "")
    if fails >= 5:
        points.append((r, log2(fails / 1000)))
mr = sum(r for r, y in points) / len(points)       # least-squares line through log2(rate)
my = sum(y for r, y in points) / len(points)
slope = sum((r - mr) * (y - my) for r, y in points) / sum((r - mr) ** 2 for r, y in points)
print(f"slope {slope:.4f} bits per unit of r; the line reaches 2^-128 at r = {mr + (-128 - my) / slope:.0f}")
```

It prints:

```text
r = 523: 666 failures in 1000 (2^-0.6)
r = 557: 310 failures in 1000 (2^-1.7)
r = 587: 112 failures in 1000 (2^-3.2)
r = 619:  25 failures in 1000 (2^-5.3)
r = 653:  11 failures in 1000 (2^-6.5)
r = 701:   1 failures in 1000 (2^-10.0)
slope -0.0480 bits per unit of r; the line reaches 2^-128 at r = 3184
```

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Measured toy failure rates fall from 2 to the minus 0.6 at r 523 to 2 to the minus 10 at r 701; a straight line through them reaches 2 to the minus 128 near r 3184; a dotted illustrative curve flattens into an error floor" fill="currentColor" font-size="13">
  <line x1="80" y1="30" x2="80" y2="250" stroke="currentColor"/>
  <line x1="80" y1="250" x2="620" y2="250" stroke="currentColor"/>
  <g text-anchor="end">
    <text x="74" y="34">2⁰</text><text x="74" y="84">2⁻³²</text><text x="74" y="135">2⁻⁶⁴</text><text x="74" y="185">2⁻⁹⁶</text><text x="74" y="235">2⁻¹²⁸</text>
  </g>
  <g stroke="currentColor" stroke-opacity=".25">
    <line x1="80" y1="80.3" x2="620" y2="80.3"/><line x1="80" y1="130.6" x2="620" y2="130.6"/><line x1="80" y1="180.9" x2="620" y2="180.9"/><line x1="80" y1="231.1" x2="620" y2="231.1"/>
  </g>
  <line x1="80" y1="28.8" x2="600" y2="239.9" stroke="currentColor" stroke-width="1.5" stroke-dasharray="7 4"/>
  <path d="M 120 48 C 200 95, 260 112, 330 118 S 520 121, 610 121" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="2 4"/>
  <g>
    <circle cx="84.3" cy="30.9" r="3.5"/><circle cx="90.6" cy="32.7" r="3.5"/><circle cx="96.2" cy="35" r="3.5"/><circle cx="102.1" cy="38.4" r="3.5"/><circle cx="108.4" cy="40.2" r="3.5"/><circle cx="117.3" cy="45.7" r="3.5"/>
  </g>
  <text x="130" y="40">measured (toy, 1000 decodings each)</text>
  <circle cx="578.4" cy="231.1" r="5" fill="none" stroke="currentColor" stroke-width="2"/>
  <text x="570" y="222" text-anchor="end">straight line: r ≈ 3,184</text>
  <text x="400" y="110" text-anchor="middle" fill-opacity=".7">if an error floor appears (illustration only)</text>
  <g text-anchor="middle">
    <text x="80" y="268">500</text><text x="172.9" y="268">1,000</text><text x="265.7" y="268">1,500</text><text x="358.6" y="268">2,000</text><text x="451.4" y="268">2,500</text><text x="544.3" y="268">3,000</text>
  </g>
  <text x="350" y="292" text-anchor="middle">block size r (toy: 15 ones per block, 24 errors)</text>
</svg>
<figcaption>Figure 14.6. Extrapolating a failure rate. The measured points cover the first ten bits of a 128-bit drop; everything to the right is a model. A straight line is conservative if the true curve keeps bending down, and wrong if it flattens into an error floor.</figcaption>
</figure>

The measurements span ten bits of failure rate; the target is 128 bits down. Even they are
noisy: one failure at $r = 701$ is a count, not a rate, so the program fits its line only to
points with at least five failures. And the line is a modeling choice. If the curve keeps bending downward, as the toy's points do between 523 and 653, a
straight line from the last measured points overestimates the failure rate further out, and the
real $r$ needed is smaller than 3,184: the extrapolation is conservative. If something new
appears at very low rates, the line is optimistic, and nothing in the measured range would show
it.

### The failure-rate story

BIKE's case rested on making those two "ifs" precise.

- **Models of the decoder.** Nicolas Sendrier and Valentin Vasseur (PQCrypto 2019) modeled a
  bit-flipping decoder as a Markov chain on the number of remaining errors and the syndrome
  weight. The model reproduces measured failure rates where they can be measured and predicts
  the concave waterfall, which justified extrapolating BIKE's parameters with straight lines.
- **Weak keys.** Some secret keys make the decoder fail far more often, for example keys whose
  ones cluster in a pattern. Classes of such keys were found from 2019 on (Drucker, Gueron and
  Kostic; Sendrier and Vasseur, 2020). Sendrier and Vasseur argued that, with the proper
  chosen-ciphertext transform, the known weak keys are too rare to change the IND-CCA claim;
  later work found further constructions (Wang, Wang and Wang, 2023).
- **Error floors.** Codes decoded iteratively can have an error floor: a level below which the
  failure rate stops falling quickly, because the decoder gets stuck near **near-codewords**,
  low-weight error patterns that satisfy almost all checks. Vasseur's 2021 thesis and a summary
  he wrote that year ("QC-MDPC codes DFR and the IND-CCA security of BIKE") found nothing that
  contradicted BIKE's claims. In 2024 and 2025 researchers at NIST and their coauthors studied
  the floor directly. A graph-theoretic study (IACR ePrint 2024/1736) found that at the toy
  size $r = 587$, the size of this chapter's toys, most failures came from absorbing sets,
  mostly near-codewords. Sarah Arpin, Jun Bo Lau, Antoine Mesnard, Ray Perlner, Angela
  Robinson, Jean-Pierre Tillich and Vasseur (ePrint 2025/153) extended the Markov model with
  near-codeword information and predicted, for a simpler step-by-step decoder, a failure rate
  below $2^{-128}$ at $r = 13{,}477$, about 9% larger than BIKE-L1's 12,323. Mesnard, Tillich and Vasseur (PQCrypto 2026) showed that the
  cases where the usual syndrome-weight model is wrong are too rare to matter for BIKE.
- **Closed forms.** Annechini, Barenghi and Pelosi derived closed-form failure rates for
  decoders with a small fixed number of iterations, which could cover BIKE if its decoder were
  replaced by a two-iteration one.

The October 2024 revision of BIKE's specification (version 5.2) reportedly moved to a decoder
called BIKE-Flip, close to BGF but more resilient when weak keys occur. NIST's summary at the
September 2025 conference put the contrast plainly: BIKE was designed for IND-CPA security and
later modified to target IND-CCA2, there was no closed-form failure analysis for more than two
rounds of decoding, and the 2025 analyses gave more confidence but needed more time for vetting.
HQC's decoder has a well-defined minimum distance and a closed-form failure analysis supported by
experiments. That difference, more than any number in a table, is why HQC was chosen.

## 14.9 NIST's choice

*Level: intermediate.*

NIST IR 8545 (March 2025) explained the decision. Both BIKE and HQC were considered secure, and
BIKE has smaller keys, ciphertexts and faster decapsulation. HQC was chosen because its
decryption failure analysis was better understood and more mature, which gives more confidence
in its IND-CCA2 security as a long-term standard. The choice gives the portfolio a KEM based
on codes rather than lattices, so that a break of ML-KEM would not leave nothing behind.

Performance did not decide it either way, because the two schemes win on different resources.
The figures below are the ones NIST showed in September 2025, taken from each submission's
specification (BIKE with AVX-512, HQC with AVX2, in thousands of cycles on the submitters' own
machines, for category 1 and the round 4 versions):

| | public key | ciphertext | key generation | encapsulation | decapsulation |
|---|---|---|---|---|---|
| BIKE-L1 | 1,540 B | 1,572 B | 589 | 97 | 1,135 |
| HQC-1 (round 4) | 2,249 B | 4,497 B | 87 | 204 | 362 |

*Table 14.3. BIKE and HQC at category 1, as compared by NIST (Robinson, 2025). Sizes are as NIST
listed them for the versions measured; the current HQC-1 sizes are in Table 14.1.*

HQC sends about twice as many bytes; BIKE encapsulates faster, but needs about seven times as
many cycles to generate keys and three times as many to decapsulate, because bit flipping on a code of 24,646 positions is
expensive and its key generation includes a polynomial inversion. NIST's round 4 report found
that when network conditions are good, HQC gives faster handshakes, and when they are bad,
BIKE's smaller messages win.

Until the draft FIPS 207 appears (none had as of November 2026), the tables here follow the
HQC specification of August 2025.

| | ML-KEM-768 | HQC-3 | BIKE-L3 | mceliece460896 |
|---|---|---|---|---|
| problem | Module-LWE | QC syndrome decoding | QC-MDPC decoding | Goppa syndrome decoding |
| public key | 1,184 B | 4,514 B | 3,083 B | 524,160 B |
| ciphertext | 1,088 B | 8,978 B | 3,115 B | 156 B |
| decoder fails? | about $2^{-164}$ | below $2^{-192}$ (bounded) | below $2^{-192}$ (extrapolated) | never |
| status (Nov 2026) | FIPS 203 | selected; FIPS 207 not yet drafted | not selected | not selected; ISO |

*Table 14.4. Category 3 KEMs compared. Failure-rate targets are from each scheme's
specification.*

!!! note "Life story: HQC"
    **Born:** 2016, Carlos Aguilar Melchor, Nicolas Aragon, Slim Bettaieb, Loïc Bidoux, Olivier
    Blazy, Jean-Christophe Deneuville, Philippe Gaborit, Edoardo Persichetti and Gilles Zémor,
    "Efficient Encryption From Random Quasi-Cyclic Codes" (published in *IEEE Transactions on
    Information Theory*, 2018); a NIST submission in 2017 · **Purpose:** a code-based KEM whose
    decoder is public, so that its failure rate can be computed · **Helped:** NIST's
    code-based backup to ML-KEM, selected 11 March 2025 (NIST IR 8545) · **Status:**
    specification revised 22 August 2025; FIPS 207 in preparation, no public draft as of
    November 2026.

## 14.10 Break it, fix it: timing and implementation bugs

*Level: intermediate.*

HQC's weak spots during the competition were in implementation. The Cryptanalysis book's
[§16.9](../cryptanalysis/16-Breaking-Post-Quantum-Candidates.md#169-implementations-side-channels-and-faults-on-ml-kem)
tells these attacks from the attacker's side, and [Chapter 17](17-Implementing-Post-Quantum-Safely.md)
collects the lessons; here is HQC's own sequence.

- **2019: a decoder that took longer when there was more to fix.** HQC's first versions used a
  BCH code with a repetition code inside, and the reference BCH decoder's running time depended
  on the number of errors it corrected. Guillaume Wafo-Tapa, Slim Bettaieb, Loïc Bidoux,
  Philippe Gaborit and Etienne Marcatel showed a chosen-ciphertext timing attack that recovered
  HQC-128's secret key in under a minute on a desktop from 5,441 decoding requests, with a
  success rate of about 93%, and gave a constant-time BCH decoder. Thales Paiva and Routo Terada
  (SAC 2019) independently attacked the CCA-secure version through the same decoder, with
  about 400 million timing measurements.
- **2020: power.** Thomas Schamberger, Julian Renner, Georg Sigl and Antonia Wachter-Zeh
  (CARDIS 2020) recovered keys of the CCA-secure HQC from power traces of the decoder.
- **2022: rejection sampling.** Qian Guo, Clemens Hlauschek, Thomas Johansson, Norman Lahr,
  Alexander Nilsson and Robin Leander Schröder ("Don't Reject This", TCHES 2022) found that the
  number of rejected samples when drawing the fixed-weight vectors depended on a value derived
  from the secret, measurable remotely, and broke both HQC and BIKE implementations with it. The
  fix is a sampler whose work does not depend on the values drawn.
- **2022: the Hadamard transform.** Guillaume Goy, Antoine Loiseau and Philippe Gaborit attacked
  the Reed-Muller decoding step with chosen ciphertexts and electromagnetic measurements, needing
  fewer than 20,000 traces from a microcontroller with a static key, and proposed masking. A
  cache-timing attack on HQC followed in TCHES in 2023, and a single-trace soft-analytical attack
  on its shared key in 2024.
- **December 2024: implicit rejection that was not.** Célian Glénaz and Dahmun Goudarzi of
  Quarkslab found that in the HQC reference implementation, and in PQClean and liboqs which copied
  it, decapsulation read part of the secret key at the wrong offset after a field ($\sigma$) had
  been added, so the rejection secret was never used: a malformed ciphertext got a key derived
  from its decryption instead of the pseudorandom rejection key (CVE-2024-54137, fixed in
  liboqs 0.12.0 and in the reference code of February 2025). No attack using it was shown, but it
  silently removed the protection of §14.7.
- **July 2025: the compiler's branches.** Zhenzhi Lai and Zhiyuan Zhang reported that Clang 17
  to 20, at any optimization level above -O0, turned parts of the HQC reference code into
  secret-dependent branches, and a proof-of-concept local attack recovered the whole secret key
  (CVE-2025-52473, fixed in liboqs 0.14.0). The source was constant-time; the binary was not,
  the same lesson as the "clangover" issue in ML-KEM ([Chapter 17](17-Implementing-Post-Quantum-Safely.md#174-clangover-when-the-compiler-adds-a-branch)).

**Fix it.** Each fix is the same idea applied to a new place: every step that touches secret data
does the same work, in the same order, with the same memory accesses, for every input, and that
is checked on the compiled binary, not only in the source. Decoders run their full schedule;
samplers draw a fixed amount of randomness; the Hadamard transform and the Reed-Solomon decoder
handle every block the same way; comparisons in decapsulation are constant-time and the
rejection key is always computed. Masking protects devices that an attacker can hold. And the
confirmation-code idea of §14.7 is a way to make one class of mistake, skipping the
re-encryption check, impossible to ship unnoticed.

!!! note "Life story: the BCH timing attack on HQC"
    **Born:** 2019, Wafo-Tapa, Bettaieb, Bidoux, Gaborit and Marcatel (IACR ePrint 2019/909,
    journal version 2022), and independently Paiva and Terada (SAC 2019) · **Purpose:** recover
    HQC's secret key from how long its BCH decoder took · **Helped:** constant-time decoding as a
    requirement for every code-based candidate · **Retired:** with the BCH-based HQC, which was
    replaced in 2020 by the Reed-Muller and Reed-Solomon version that NIST selected.

## 14.11 In the real world

*Level: expert.*

As of November 2026, HQC is used mainly in experiments and in libraries that track NIST's
selections (for example liboqs, the Open Quantum Safe project's library, which follows the
August 2025 specification), waiting for FIPS 207. An individual Internet-Draft proposes HQC for
HPKE (draft-reddy-hpke-hqc). Its role is insurance: protocols and products that can switch KEMs
will be able to move to HQC if ML-KEM is ever weakened, and some high-assurance designs may
combine ML-KEM and HQC, as hybrids combine ML-KEM and X25519 today (Chapter 18).

Insurance has a measurable cost: an HQC-3 handshake moves 13.5 kilobytes against ML-KEM-768's
2.3, several packets instead of one, which is why HQC is planned as a backup, not a default.

**Mars.** Arcadia City's backup links, the ones meant to work even if the main cryptography
fails, use HQC-5 alongside ML-KEM-1024. The extra 22 kilobytes per handshake are nothing on a
link that carries gigabytes a day, and a break in lattice cryptography would not open the
backup channel too. The size does matter in one place: a lost packet on the Earth link can cost
a round trip of 6 to 44 minutes before it is resent, so the settlement's links carry key
exchanges over the delay-tolerant bundle layer, which stores data and resends it hop by hop,
rather than as bare end-to-end packets. And because the relays decapsulate with static keys for months at a time
(§14.4), the settlement runs only implementations that passed known-answer tests including
malformed ciphertexts, the test that would have caught CVE-2024-54137.

## 14.12 Going deeper

*Level: expert.*

- **HQC.** Aguilar Melchor, Aragon, Bettaieb, Bidoux, Blazy, Deneuville, Gaborit, Persichetti and
  Zémor, "Efficient Encryption From Random Quasi-Cyclic Codes", *IEEE Transactions on
  Information Theory* 64 (2018), and the specification of 22 August 2025, which gives the
  failure-rate analysis in full.
- **Reed-Muller and Reed-Solomon decoding.** The Mathematics book's
  [Chapter 18](../mathematics/18-Error-Correcting-Codes.md) for the theory; MacWilliams and
  Sloane's *The Theory of Error-Correcting Codes* (1977) for Reed-Muller codes and their
  Hadamard decoding.
- **Sparse-error ISD.** Canto Torres and Sendrier (PQCrypto 2016) on why all ISD variants cost
  about the same for sublinear weights; Sendrier's "Decoding One Out of Many" (PQCrypto 2011)
  for the quasi-cyclic gain.
- **Decoders and failure rates.** Vasseur's thesis (2021) is the most complete account of
  QC-MDPC decoding and its failure rate; the papers by Sendrier and Vasseur and by Arpin and
  others in Further reading carry it to 2025.
- **Rank-metric codes.** ROLLO and RQC, rank-metric relatives of BIKE and HQC, were dropped
  after algebraic attacks on rank decoding (Bardet and others, 2020): a reminder that "codes"
  is a family with very different members.

## Check yourself

??? question "1. How does a quasi-cyclic structure shrink a public key?"

    Each circulant block is determined by one row of $r$ bits, its other rows being cyclic
    shifts, so a block costs $r$ bits instead of $r^2$; the whole public key is one or two
    polynomials.

??? question "2. In HQC, what is v − u·y, and why can it be decoded?"

    $mG + x\,r_2 - r_1\,y + e$: the codeword plus a sum of products of sparse polynomials,
    which is noise flipping about a third of the bits, still within what the public
    concatenated code $C$ corrects.

??? question "3. Why does the HQC decoder not need any secret, and why does that help its failure analysis?"

    The code $C$ is public with no hidden structure; the secret $y$ is used only to strip
    $u\,y$ from $v$. Because the decoder never sees the key, its failure probability depends
    only on the noise distribution, which can be computed and bounded for every key.

??? question "4. A duplicated RM(1,7) block in HQC-1 has 384 bits and minimum distance 192. How many errors does it surely correct, and why does HQC rely on more?"

    Up to 95, half the distance. HQC-1's noise flips about 130 of 384 bits on average, so HQC
    uses maximum-likelihood decoding with the Hadamard transform, which corrects the great
    majority of such patterns and errs on a block only about once in two thousand to three
    thousand.

??? question "5. Derive HQC-1's public key and ciphertext sizes."

    Public key: a 32-byte seed for $h$ plus $s$, $\lceil 17{,}669/8 \rceil = 2{,}209$ bytes:
    2,241 bytes. Ciphertext: $u$ (2,209 bytes), $v$ truncated to $46 \times 384 = 17{,}664$
    bits (2,208 bytes) and a 16-byte salt: 4,433 bytes. (ML-KEM-512: 800 and 768 bytes.)

??? question "6. Why is HQC-1's secret weight 66 and its noise weight 75?"

    For sparse errors, decoding attacks cost about $2^{t \log_2(1/(1-R))}$. The key is a
    weight-$2w$ error in a rate-1/2 code: $2 \times 66 = 132$ bits. The ciphertext is a
    weight-$(2w_r + w_e)$ error in a rate-1/3 code: $225 \times 0.585 \approx 132$ bits. Both
    clear 128 with a few bits to spare, and $w_r = 75$ is close to the largest value for which
    the failure rate stays near $2^{-128}$.

??? question "7. How did Guo, Johansson and Stankovski recover QC-MDPC keys?"

    By sending many chosen error patterns to a static key and recording which caused decoding
    failures; failure statistics revealed the distances between the ones of the secret
    polynomial, and from those the key.

??? question "8. What are the black and gray lists in Black-Gray-Flip, and why does BIKE run a fixed number of iterations?"

    In the first iteration, bits at or above the threshold are flipped and listed as black;
    bits within τ of it are listed as gray. The decoder then rechecks both lists and flips those
    that now look wrong. Five iterations, always run in full, keep the running time independent
    of the error, and the failure-rate claim is made for exactly that schedule.

??? question "9. What was wrong with HQC's salt in early 2025, and how was it fixed?"

    The salt was sent with the ciphertext but not bound into the FO derivation, so ciphertexts
    differing only in the salt could be played against each other in decapsulation queries,
    breaking the IND-CCA2 definition. The August 2025 specification derives
    $(K, \theta) = G(H(\mathit{ek}) \parallel m \parallel \text{salt})$, so re-encryption covers
    the salt and any change yields the rejection key.

??? question "10. Why did NIST prefer HQC to BIKE, and what was the status of FIPS 207 in November 2026?"

    HQC's decryption-failure rate can be bounded analytically, with a decoder of known minimum
    distance, while BIKE's relies on models and extrapolation of an iterative decoder, even though
    BIKE is smaller. NIST selected HQC on 11 March 2025 and expected a draft in about a year, but
    as of November 2026 no public draft of FIPS 207 had been released.

## What you learned

- Quasi-cyclic codes shrink code-based public keys to a few kilobytes, at the cost of a
  structured assumption; a circulant block is one polynomial in $\mathbb{F}_2[x]/(x^r - 1)$.
- HQC decodes noisy codewords with a public concatenated code: a Reed-Solomon code over
  $\mathbb{F}_{256}$ around a duplicated Reed-Muller code decoded by the Hadamard transform,
  correcting a channel that flips a third of all bits.
- HQC's weights come from the sparse-error cost of decoding attacks, its $n$ from the code's
  length, and its failure rate from two binomial tails; the margins are a few bits.
- HQC-KEM is HQC-PKE with a salted FO transform; the salt was bound properly only in the
  August 2025 specification, which also moved to seeds and a 32-byte shared secret.
- BIKE hides a QC-MDPC code and decodes by bit flipping; Black-Gray-Flip gives a short fixed
  schedule, but its failure rate must be extrapolated from measurements, and weak keys and error
  floors made that extrapolation hard to trust.
- Failures can leak keys, so the FO proofs need failure rates near $2^{-128}$; HQC's analysis was
  stronger, and NIST selected HQC on 11 March 2025.
- HQC's implementations leaked through timing, power, sampling, a missing rejection and the
  compiler; FIPS 207 had no public draft as of November 2026.

**Next:** [Chapter 15](15-Multivariate-Signatures-and-the-On-Ramp.md), multivariate signatures and the "on-ramp" of new signature candidates.

## Further reading

- NIST IR 8545, *Status Report on the Fourth Round of the NIST Post-Quantum Cryptography
  Standardization Process* (March 2025).
- Angela Robinson, "FIPS 207: HQC-KEM", presentation at the Sixth PQC Standardization
  Conference, NIST (September 2025).
- Carlos Aguilar Melchor and others, *Hamming Quasi-Cyclic (HQC)*, specification of 22 August
  2025 (and the round 4 specification of 2023).
- Nicolas Aragon and others, *BIKE: Bit Flipping Key Encapsulation*, round 4 specification
  (version 5.0, 2022, and later updates).
- Rafael Misoczki, Jean-Pierre Tillich, Nicolas Sendrier and Paulo Barreto, "MDPC-McEliece"
  (ISIT 2013).
- Qian Guo, Thomas Johansson and Paul Stankovski, "A Key Recovery Attack on MDPC with CCA
  Security Using Decoding Errors" (ASIACRYPT 2016).
- Nir Drucker, Shay Gueron and Dusan Kostic, "QC-MDPC Decoders with Several Shades of Gray"
  (PQCrypto 2020).
- Nicolas Sendrier and Valentin Vasseur, "On the Decoding Failure Rate of QC-MDPC Bit-Flipping
  Decoders" (PQCrypto 2019) and "On the Existence of Weak Keys for QC-MDPC Decoding" (IACR ePrint
  2020/1232).
- Valentin Vasseur, "QC-MDPC codes DFR and the IND-CCA security of BIKE" (IACR ePrint 2021/1458).
- Sarah Arpin, Jun Bo Lau, Antoine Mesnard, Ray Perlner, Angela Robinson, Jean-Pierre Tillich and
  Valentin Vasseur, "Error floor prediction with Markov models for QC-MDPC codes" (IACR ePrint
  2025/153).
- Antoine Mesnard, Jean-Pierre Tillich and Valentin Vasseur, IACR ePrint 2025/2218 (PQCrypto
  2026), on the syndrome weight distribution of QC-MDPC codes.
- Alessandro Annechini, Alessandro Barenghi and Gerardo Pelosi, "On the Decoding Failure Rate of
  HQC" (ISIT 2026; IACR ePrint 2026/795).
- Nicolas Sendrier, "Decoding One Out of Many" (PQCrypto 2011).
- Rodolfo Canto Torres and Nicolas Sendrier, "Analysis of Information Set Decoding for a
  Sub-linear Error Weight" (PQCrypto 2016).
- Lewis Glabush, Felix Günther, Kathrin Hövelmanns and Douglas Stebila, "Verifiable
  Decapsulation: Recognizing Faulty Implementations of Post-Quantum KEMs" (CRYPTO 2025; IACR
  ePrint 2025/450).
- Guillaume Wafo-Tapa, Slim Bettaieb, Loïc Bidoux, Philippe Gaborit and Etienne Marcatel, "A
  Practicable Timing Attack Against HQC and its Countermeasure" (IACR ePrint 2019/909; *Advances
  in Mathematics of Communications*, 2022).
- Thales Bandiera Paiva and Routo Terada, "A Timing Attack on the HQC Encryption Scheme" (SAC 2019).
- Thomas Schamberger, Julian Renner, Georg Sigl and Antonia Wachter-Zeh, "A Power Side-Channel
  Attack on the CCA2-Secure HQC KEM" (CARDIS 2020).
- Qian Guo, Clemens Hlauschek, Thomas Johansson, Norman Lahr, Alexander Nilsson and Robin Leander
  Schröder, "Don't Reject This: Key-Recovery Timing Attacks Due to Rejection-Sampling in HQC and
  BIKE" (TCHES 2022).
- Guillaume Goy, Antoine Loiseau and Philippe Gaborit, "A New Key Recovery Side-Channel Attack on
  HQC with Chosen Ciphertext" (2022).
- Open Quantum Safe advisories for CVE-2024-54137 (2024) and CVE-2025-52473 (2025).
- David E. Muller, "Application of Boolean Algebra to Switching Circuit Design and to Error
  Detection" (1954); Irving S. Reed, "A Class of Multiple-Error-Correcting Codes and the
  Decoding Scheme" (1954).
- Irving S. Reed and Gustave Solomon, "Polynomial Codes over Certain Finite Fields" (1960).
- G. David Forney Jr., *Concatenated Codes* (MIT Press, 1966).
- Robert G. Gallager, "Low-Density Parity-Check Codes", *IRE Transactions on Information
  Theory* 8 (1962).
