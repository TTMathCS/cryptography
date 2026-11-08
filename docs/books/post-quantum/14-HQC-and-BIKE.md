# 14. HQC and BIKE

*Classic McEliece's megabyte keys come from using codes with no exploitable structure. Can
codes have small keys and still be safe? The two code-based KEMs that reached NIST's fourth
round say yes, with a twist: they use structured (quasi-cyclic) codes, and they decode
probabilistically, so decryption occasionally fails. That small chance of failure turns out to
be the heart of their security analysis. On 11 March 2025 NIST selected HQC as its second KEM
standard, a backup to ML-KEM built on a different problem; it will be FIPS 207. This chapter
builds toy versions of both HQC and BIKE, watches BIKE's decoder go from never failing to always
failing as errors are added, and explains why decoding failures became the deciding issue.*

!!! abstract "In this chapter"
    **You will learn:**

    - quasi-cyclic codes, and how they shrink public keys to a few kilobytes;
    - HQC's design: a noisy Diffie-Hellman-like exchange decoded by a public code;
    - BIKE's design: QC-MDPC codes and the bit-flipping decoder;
    - why decryption failures matter, and the reaction attacks that exploit them;
    - why NIST chose HQC, and the status of FIPS 207.

    **You need:** [Chapter 13](13-Code-Based-Encryption-McEliece.md) (syndrome decoding and
    McEliece) and [Chapter 7](07-Rings-Modules-and-the-NTT.md) (polynomial rings).

    **Levels:** §14.1 and §14.2 are for beginners, §14.3 to §14.6 are intermediate, §14.7
    and §14.8 are expert.

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
only has to handle the noise, which is heavy: products of sparse polynomials have weight around
$2w^2$, a sizeable fraction of all bits. Real HQC uses a strong concatenated code (a
Reed-Solomon outer code with a duplicated Reed-Muller inner code) to correct that much noise.

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

```
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
| public key | 2,249 B | 4,522 B | 7,245 B |
| ciphertext | 4,433 B | 8,978 B | 14,421 B |

*Table 14.1. HQC parameter sets from the round 4 specification (2023 and later updates). FIPS
207 may change details; as of 8 November 2026 no public draft exists to check against.*

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

```
errors 18 -> decoding failures: 0 of 200
errors 24 -> decoding failures: 15 of 200
errors 30 -> decoding failures: 186 of 200
errors 36 -> decoding failures: 200 of 200
```

The failure rate rises steeply with the number of errors: none at 18, a few percent at 24,
nearly all at 30. Real BIKE-L1 uses $r = 12{,}323$, $w = 142$ and $t = 134$, and an improved
decoder (Black-Gray-Flip, Drucker, Gueron and Kostic, 2020), placing it far down that curve. Its
public key is 1,541 bytes and its ciphertext 1,573: the smallest of the code-based KEMs, close
to ML-KEM-512.

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

## 14.5 NIST's choice

*Level: intermediate.*

NIST IR 8545 (March 2025) explained the decision. Both BIKE and HQC were considered secure, and
BIKE has smaller keys, ciphertexts and faster decapsulation. HQC was chosen because its
decryption failure analysis was better understood and more mature, which gives more confidence
in its IND-CCA2 security as a long-term standard. The choice gives the portfolio a KEM based
on codes rather than lattices, so that a break of ML-KEM would not leave nothing behind.

NIST said in its announcement that it expected to publish a draft standard for HQC in about a
year and a final standard in 2027. As of 8 November 2026, the draft FIPS 207 had not appeared
on NIST's site; until it does, the exact details (encodings, hash functions, the final
parameter set names) are not known, and the code and tables here follow the round 4
specification.

| | ML-KEM-768 | HQC-3 | BIKE-L3 | mceliece460896 |
|---|---|---|---|---|
| problem | Module-LWE | QC syndrome decoding | QC-MDPC decoding | Goppa syndrome decoding |
| public key | 1,184 B | 4,522 B | 3,083 B | 524,160 B |
| ciphertext | 1,088 B | 8,978 B | 3,115 B | 156 B |
| decoder fails? | about $2^{-164}$ | below $2^{-192}$ (bounded) | below $2^{-192}$ (extrapolated) | never |
| status (Nov 2026) | FIPS 203 | selected; FIPS 207 not yet drafted | not selected | not selected; ISO |

*Table 14.2. Category 3 KEMs compared. Failure-rate targets are from each scheme's
specification.*

## 14.6 Break it, fix it: timing

*Level: intermediate.*

HQC's own weak spots during the competition were in implementation. Its decoder and its
sampling of sparse vectors were not constant-time in early versions, and several papers recovered
keys from timing: for example, a variable number of iterations in the sampler, or a Reed-Solomon
decoder whose running time depended on the number of errors (Paiva and Terada, 2019; Wafo-Tapa
and others, 2019). **Fix it**: the round 4 versions use constant-time
sampling and a decoder that always does the same work. Chapter 17 collects these lessons; the
point here is that a scheme's security on paper and its security in code are different
questions, and the second one was asked very seriously for every finalist.

## 14.7 In the real world

*Level: expert.*

As of November 2026, HQC is used mainly in experiments and in libraries that track NIST's
selections (for example liboqs, the Open Quantum Safe project's library), waiting for FIPS 207.
Its role is insurance: protocols and products that can switch KEMs will be able to move to HQC
if ML-KEM is ever weakened, and some high-assurance designs may combine ML-KEM and HQC, as
hybrids combine ML-KEM and X25519 today (Chapter 18).

**Mars.** Arcadia City's backup links, the ones meant to work even if the main cryptography
fails, use HQC-5 alongside ML-KEM-1024. The extra 22 kilobytes per handshake are nothing on a
link that carries gigabytes a day, and a break in lattice cryptography would not open the
backup channel too.

## 14.8 Going deeper

*Level: expert.*

- **HQC.** Aguilar Melchor, Aragon, Bettaieb, Bidoux, Blazy, Deneuville, Gaborit, Persichetti and
  Zémor, "Efficient Encryption From Random Quasi-Cyclic Codes", *IEEE Transactions on
  Information Theory* 64 (2018), and the round 4 specification.
- **QC-MDPC McEliece.** Misoczki, Tillich, Sendrier and Barreto, "MDPC-McEliece: New McEliece
  Variants from Moderate Density Parity-Check Codes" (ISIT 2013).
- **Reaction attacks.** Guo, Johansson and Stankovski, "A Key Recovery Attack on MDPC with CCA
  Security Using Decoding Errors" (ASIACRYPT 2016).
- **Decoders and failure rates.** Drucker, Gueron and Kostic, "QC-MDPC Decoders with Several
  Shades of Gray" (PQCrypto 2020); Sendrier and Vasseur, "On the Decoding Failure Rate of QC-MDPC
  Bit-Flipping Decoders" (PQCrypto 2019); Vasseur's thesis (2021).
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
    which is fairly sparse noise that the public code $C$ can correct.

??? question "3. Why does the HQC decoder not need any secret?"

    The code $C$ is public with no hidden structure; the secret $y$ is used only to strip
    $u\,y$ from $v$. Security comes from the quasi-cyclic syndrome decoding problem, not from
    hiding the code.

??? question "4. What does bit flipping count, for each bit?"

    The number of unsatisfied parity checks that involve the bit. Bits with the most are
    flipped, and the syndrome is updated.

??? question "5. In the toy BIKE, what happened to the failure rate as errors went from 18 to 30?"

    It rose from 0 of 200 to 186 of 200: failures depend steeply on how close the error weight
    is to the decoder's limit.

??? question "6. How did Guo, Johansson and Stankovski recover QC-MDPC keys?"

    By sending many chosen error patterns to a static key and recording which caused decoding
    failures; failure statistics revealed the distances between the ones of the secret
    polynomial, and from those the key.

??? question "7. Why did NIST prefer HQC to BIKE?"

    HQC's decryption-failure rate can be analyzed more completely and with more confidence,
    which the IND-CCA2 proof needs; BIKE's relies on extrapolated decoder behavior, even though
    BIKE is smaller and faster.

??? question "8. Give the public key and ciphertext sizes of HQC-1 and compare with ML-KEM-512."

    HQC-1: 2,249 and 4,433 bytes. ML-KEM-512: 800 and 768 bytes.

??? question "9. What was the status of FIPS 207 on 8 November 2026?"

    HQC had been selected (March 2025) and NIST had said a draft would come in about a year,
    but no public draft of FIPS 207 had been released.

??? question "10. Why does NIST want a second, code-based KEM at all?"

    Diversity: if Module-LWE were weakened, ML-KEM would fall, and a KEM based on a different
    problem would still stand.

## What you learned

- Quasi-cyclic codes shrink code-based public keys to a few kilobytes, at the cost of a
  structured assumption.
- HQC decodes noisy codewords with a public code; BIKE hides a QC-MDPC code and decodes by
  bit flipping.
- Both decoders fail with small probability, and failures can leak keys (reaction attacks).
- Proving the failure rate negligible is what the FO transform needs; HQC's analysis was
  stronger, and NIST selected HQC on 11 March 2025.
- HQC's keys and ciphertexts are several times ML-KEM's; FIPS 207 had no public draft as of
  8 November 2026.

**Next:** [Chapter 15](15-Multivariate-Signatures-and-the-On-Ramp.md), multivariate signatures and the "on-ramp" of new signature candidates.

## Further reading

- NIST IR 8545, *Status Report on the Fourth Round of the NIST Post-Quantum Cryptography
  Standardization Process* (March 2025).
- Carlos Aguilar Melchor and others, *HQC: Hamming Quasi-Cyclic*, round 4 specification.
- Nicolas Aragon and others, *BIKE: Bit Flipping Key Encapsulation*, round 4 specification.
- Rafael Misoczki, Jean-Pierre Tillich, Nicolas Sendrier and Paulo Barreto, "MDPC-McEliece"
  (ISIT 2013).
- Qian Guo, Thomas Johansson and Paul Stankovski, "A Key Recovery Attack on MDPC with CCA
  Security Using Decoding Errors" (ASIACRYPT 2016).
- Nir Drucker, Shay Gueron and Dusan Kostic, "QC-MDPC Decoders with Several Shades of Gray"
  (PQCrypto 2020).
- Robert G. Gallager, "Low-Density Parity-Check Codes", *IRE Transactions on Information
  Theory* 8 (1962).
